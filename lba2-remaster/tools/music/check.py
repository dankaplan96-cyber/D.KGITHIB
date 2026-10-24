"""Technical QA of the rendered soundtrack (no listening involved — numbers only).

    tools/music/.venv/bin/python tools/music/check.py [track ...] [--plots DIR]

For every track in assets/music/manifest.json it decodes the runtime MP3 (as a browser would) and reports:
  * integrated loudness (EBU R128 / BS.1770, LUFS) of the loop body (or whole cue) and short-term range
  * true peak (4x oversampled, dBTP) of the decoded MP3
  * decoder offset vs the FLAC master, and the loop seam: the error between "jump from loopEnd to loopStart"
    and the true continuation ('seam mp3', dB re. signal RMS), next to the MP3's own coding error vs the
    master at the same spot ('codec') — a seam error at or below the codec error means the seam adds nothing —
    plus a click detector (largest sample step at the seam / 99.5th percentile of steps around it; < 1 = no click)
  * spectral balance (share of energy per band) — small speakers need mid-range, not just bass
With --plots it writes a spectrogram + short-term loudness PNG per track (for a visual sanity check).
"""
import json
import os
import subprocess
import sys

import numpy as np
import pyloudnorm
import soundfile as sf
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
MUSIC = os.path.join(ROOT, 'assets', 'music')
MASTERS = os.path.join(ROOT, 'art', 'music', 'masters')
SR = 48000
BANDS = [(20, 80, 'sub'), (80, 250, 'low'), (250, 2000, 'mid'), (2000, 6000, 'presence'), (6000, 20000, 'air')]


def decode(path):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def offset(dec, ref, around, span=SR):
    """Lag (samples) of dec relative to ref, from cross-correlation of a window."""
    a = ref[around:around + span, 0]
    b = dec[around - 4000:around + span + 4000, 0]
    c = signal.correlate(b, a, mode='valid')
    return int(np.argmax(c)) - 4000


def seam_report(x, ls, le, w=2400):
    """Compare the looped stream x[..le] + x[ls..] with the natural continuation x[..ls] + x[ls..]."""
    looped = np.concatenate([x[le - w:le], x[ls:ls + w]])
    natural = x[ls - w:ls + w]
    err = looped - natural
    rms = np.sqrt(np.mean(natural ** 2)) + 1e-12
    err_db = 20 * np.log10(np.sqrt(np.mean(err ** 2)) / rms + 1e-12)
    d = np.abs(np.diff(looped, axis=0)).max(axis=1)
    step_at = d[w - 3:w + 3].max()
    step_typ = np.percentile(d, 99.5) + 1e-12
    return err_db, step_at / step_typ


def bands(x):
    f, p = signal.welch(x.mean(axis=1), SR, nperseg=8192)
    tot = p[(f >= 20)].sum()
    return {name: p[(f >= lo) & (f < hi)].sum() / tot for lo, hi, name in BANDS}


def short_term(x, meter_len=3.0, hop=1.0):
    m = pyloudnorm.Meter(SR, block_size=meter_len)
    out = []
    n = int(meter_len * SR)
    for s in range(0, x.shape[0] - n, int(hop * SR)):
        seg = x[s:s + n]
        v = m.integrated_loudness(seg) if np.abs(seg).max() > 1e-5 else -70
        out.append(max(-70, v))
    return np.array(out)


def plot(name, x, info, st, out_dir):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(2, 1, figsize=(14, 7), sharex=True, gridspec_kw={'height_ratios': [3, 1]})
    f, t, S = signal.spectrogram(x.mean(axis=1), SR, nperseg=4096, noverlap=2048)
    keep = f < 8000
    ax[0].pcolormesh(t, f[keep], 10 * np.log10(S[keep] + 1e-12), shading='auto', vmin=-120, vmax=-40, cmap='magma')
    ax[0].set_yscale('symlog', linthresh=200)
    ax[0].set_ylabel('Hz')
    ax[0].set_title(f"{name}: {info.get('title', '')}")
    ax[1].plot(np.arange(len(st)) + 1.5, st)
    ax[1].set_ylim(-45, -8)
    ax[1].set_ylabel('LUFS-S')
    for a in ax:
        if info.get('loop'):
            a.axvline(info['loopStart'], color='c', lw=1)
            a.axvline(info['loopEnd'], color='c', lw=1)
    ax[1].set_xlabel('s')
    fig.tight_layout()
    fig.savefig(os.path.join(out_dir, f'{name}.png'), dpi=70)
    plt.close(fig)


def main(argv):
    plots = None
    if '--plots' in argv:
        plots = argv[argv.index('--plots') + 1]
        os.makedirs(plots, exist_ok=True)
        argv = [a for a in argv if a not in ('--plots', plots)]
    man = json.load(open(os.path.join(MUSIC, 'manifest.json')))
    names = argv or list(man['tracks'])
    meter = pyloudnorm.Meter(SR)
    rows = []
    for name in names:
        info = man['tracks'][name]
        dec = decode(os.path.join(MUSIC, info['file']))
        ref, _ = sf.read(os.path.join(MASTERS, name + '.flac'), dtype='float64', always_2d=True)
        if info['loop']:
            ls, le = info['loopStartSample'], info['loopEndSample']
            off = offset(dec, ref, ls)
            body = dec[off + ls:off + le]
            lufs = meter.integrated_loudness(body)
            err_db, click = seam_report(dec, ls + off, le + off)
            m_err, m_click = seam_report(ref, ls, le)
            # reference: how far the MP3 is from the master at the same spot (perceptual-codec noise)
            seg_r = ref[ls - 2400:ls + 2400]
            e = dec[off + ls - 2400:off + ls + 2400] - seg_r
            codec = 20 * np.log10(np.sqrt(np.mean(e ** 2)) / (np.sqrt(np.mean(seg_r ** 2)) + 1e-12) + 1e-12)
        else:
            off = offset(dec, ref, SR * 5)
            lufs = meter.integrated_loudness(dec)
            err_db = click = m_err = m_click = codec = None
        up = signal.resample_poly(dec, 4, 1, axis=0)
        tp = 20 * np.log10(np.abs(up).max() + 1e-12)
        st = short_term(dec)
        live = st[st > -60]
        lra = np.percentile(live, 95) - np.percentile(live, 10) if len(live) else 0
        b = bands(dec)
        rows.append((name, info, lufs, tp, off, err_db, click, m_err, m_click, lra, b, codec))
        if plots:
            plot(name, dec, info, st, plots)
    print(f"{'track':18s} {'dur':>6s} {'loop':>6s} {'LUFS':>6s} {'dBTP':>6s} {'LRA':>5s} {'off':>5s} "
          f"{'seam mp3':>9s} {'codec':>6s} {'click':>6s} {'seam flac':>9s}  bands sub/low/mid/pres/air %")
    for (name, info, lufs, tp, off, err_db, click, m_err, m_click, lra, b, codec) in rows:
        loop = f"{info['loopLength']:.1f}" if info['loop'] else '-'
        s1 = f'{err_db:9.1f}' if err_db is not None else f"{'-':>9s}"
        s2 = f'{click:6.2f}' if click is not None else f"{'-':>6s}"
        s3 = f'{m_err:9.1f}' if m_err is not None else f"{'-':>9s}"
        s4 = f'{codec:6.1f}' if codec is not None else f"{'-':>6s}"
        bb = '/'.join(f'{100 * b[k]:.0f}' for _, _, k in BANDS)
        print(f"{name:18s} {info['duration']:6.1f} {loop:>6s} {lufs:6.1f} {tp:6.1f} {lra:5.1f} {off:5d} {s1} {s4} {s2} {s3}  {bb}")


if __name__ == '__main__':
    main(sys.argv[1:])
