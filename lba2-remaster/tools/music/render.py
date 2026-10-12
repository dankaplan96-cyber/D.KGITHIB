"""Score -> MIDI (archived) + sample-accurate libfluidsynth stems (synth.py) -> room/EQ/loudness/limiter -> FLAC + MP3 + manifest.

    tools/music/.venv/bin/python tools/music/build.py            # every track
    tools/music/.venv/bin/python tools/music/build.py well home  # some tracks

Loops: a loop piece is rendered as [intro][body][the first few bars of the body again]. Both loop points
sit `head` bars inside the body (loopStart = body_start + seam, loopEnd = body_end + seam), where the two
passes are sample-identical: same notes, same controller state, and every processing stage after the synth
(convolution reverb, EQ, limiter) is time-invariant with a memory shorter than the seam offset. So the
reverb tail of the end of the body is already "folded" into the audio after loopStart, and a jump from
loopEnd to loopStart is inaudible. The file continues ~1 s past loopEnd so MP3 frame padding never touches
the seam, and an encoder/decoder delay shifts both points together (the seam stays clean either way).
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile

import numpy as np
import pyloudnorm

import synth
import soundfile as sf
from scipy import ndimage, signal

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))  # lba2-remaster/
MIDI_DIR = os.path.join(ROOT, 'art', 'music', 'midi')
MASTER_DIR = os.path.join(ROOT, 'art', 'music', 'masters')
OUT_DIR = os.path.join(ROOT, 'assets', 'music')
SF2_CANDIDATES = [
    os.environ.get('MUSIC_SF2', ''),
    os.path.join(HERE, 'soundfonts', 'MuseScore_General.sf2'),
    '/usr/share/sounds/sf2/FluidR3_GM.sf2',
]
MP3_BITRATE = os.environ.get('MUSIC_MP3_BITRATE', '112k')


def soundfont():
    for p in SF2_CANDIDATES:
        if p and os.path.exists(p):
            return p
    raise SystemExit('no soundfont found: run tools/music/fetch_soundfont.sh')


# ------------------------------------------------------------------ synthetic rooms (LTI, deterministic)
def make_ir(rt60=2.2, predelay=0.018, bright=0.5, er_gain=0.6, seed=7, length=None):
    """Stereo impulse response: early reflections + a decorrelated noise tail decaying faster in the highs."""
    rng = np.random.default_rng(seed)
    n = int(SR * (length or min(rt60 * 1.15, 5.0)))
    t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    bands = [(None, 400, rt60 * 1.15), (400, 2500, rt60), (2500, None, rt60 * (0.35 + 0.4 * bright))]
    for ch in range(2):
        tail = np.zeros(n)
        for lo, hi, rt in bands:
            x = rng.standard_normal(n)
            if lo and hi:
                sos = signal.butter(2, [lo, hi], 'bandpass', fs=SR, output='sos')
            elif lo:
                sos = signal.butter(2, lo, 'highpass', fs=SR, output='sos')
            else:
                sos = signal.butter(2, hi, 'lowpass', fs=SR, output='sos')
            x = signal.sosfilt(sos, x)
            tail += x * 10 ** (-3 * t / rt)
        onset = np.clip((t - predelay - 0.012) / 0.03, 0, 1)
        tail *= onset
        # early reflections: a handful of discrete taps
        for k in range(9):
            d = predelay + 0.006 + rng.uniform(0, 0.07)
            i = int(d * SR)
            if i < n:
                ir[i, ch] += er_gain * rng.choice([-1, 1]) * (0.75 ** k) * rng.uniform(0.5, 1.0) * 0.25
        ir[:, ch] += tail / np.sqrt(np.sum(tail ** 2) + 1e-12)
    ir /= np.sqrt(np.sum(ir ** 2) / 2)
    return ir


def convolve(x, ir):
    out = np.zeros((x.shape[0] + ir.shape[0] - 1, 2))
    # each output channel = own-side + a little cross-feed for width
    for c in range(2):
        out[:, c] = signal.oaconvolve(x[:, c], ir[:, c]) * 0.8 + signal.oaconvolve(x[:, 1 - c], ir[:, c]) * 0.35
    return out[: x.shape[0]]


def eq(x, cfg):
    sos = [signal.butter(2, cfg.get('hpf', 32), 'highpass', fs=SR, output='sos')]
    y = x.copy()
    for s in sos:
        y = signal.sosfilt(s, y, axis=0)
    for f, gain_db, q in cfg.get('peaks', [(260, -1.2, 0.9), (3000, 1.0, 0.8)]):
        y = signal.lfilter(*peaking(f, gain_db, q), y, axis=0)
    if cfg.get('lpf'):
        y = signal.sosfilt(signal.butter(2, cfg['lpf'], 'lowpass', fs=SR, output='sos'), y, axis=0)
    return y


def peaking(f0, gain_db, q):
    A = 10 ** (gain_db / 40)
    w = 2 * np.pi * f0 / SR
    al = np.sin(w) / (2 * q)
    b = np.array([1 + al * A, -2 * np.cos(w), 1 - al * A])
    a = np.array([1 + al / A, -2 * np.cos(w), 1 - al / A])
    return b / a[0], a / a[0]


def true_peak(x):
    up = signal.resample_poly(x, 4, 1, axis=0)
    return 20 * np.log10(np.max(np.abs(up)) + 1e-12)


def limiter(x, ceiling_db=-1.5, look=0.004, release=0.08):
    """Offline look-ahead peak limiter (symmetric gain smoothing, finite memory)."""
    ceil = 10 ** (ceiling_db / 20)
    up = np.abs(signal.resample_poly(x, 4, 1, axis=0)).max(axis=1)
    pk = up.reshape(-1, 4).max(axis=1) if up.shape[0] % 4 == 0 else np.pad(up, (0, 4 - up.shape[0] % 4)).reshape(-1, 4).max(axis=1)
    pk = pk[: x.shape[0]]
    g = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    if g.min() >= 1.0:
        return x, 0.0
    w = int(release * SR) | 1
    g = ndimage.minimum_filter1d(g, size=w, mode='nearest')
    k = int(look * SR) * 2 + 1
    g = ndimage.uniform_filter1d(g, size=min(k * 6, w), mode='nearest')
    return x * g[:, None], 20 * np.log10(g.min())


# ------------------------------------------------------------------ rendering
def check_tempo(song):
    if not song.loop:
        return
    B0, B1 = song.body_start, song.body_end
    for b, us in song.tempo_map:
        if B0 - 1e-9 <= b <= B1 + 1e-9 and (song.sample(B1) - song.sample(B0)) % 64:
            raise ValueError(f'{song.name}: the loop body must last a whole number of 64-sample blocks')
    us_in_body = [us for b, us in song.tempo_map if b <= B0 + 1e-9][-1:] + [us for b, us in song.tempo_map if B0 < b < B1]
    if len(set(us_in_body)) != 1:
        raise ValueError(f'{song.name}: keep one tempo inside the loop body')
    if any(abs(b - B0) > 1e-9 and B0 < b < B1 for b, _ in song.tempo_map):
        raise ValueError(f'{song.name}: tempo change inside loop body')


def build(song, sf2=None, keep_stems=False, variants=None):
    """Render one song. `variants` = {suffix: set_of_stems_to_drop} for alternate mixes (e.g. stealth)."""
    sf2 = sf2 or soundfont()
    check_tempo(song)
    os.makedirs(MIDI_DIR, exist_ok=True)
    os.makedirs(MASTER_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    mix = {'room': {'rt60': 2.2, 'predelay': 0.02, 'bright': 0.5}, 'wet': {'front': 0.22, 'mid': 0.3, 'back': 0.42},
           'gain': {}, 'eq': {}, 'lufs': -17.0, 'ceiling': -1.5}
    for k, v in song.mix.items():
        if isinstance(v, dict) and k in mix and isinstance(mix[k], dict):
            mix[k] = {**mix[k], **v}
        else:
            mix[k] = v
    full_mid = os.path.join(MIDI_DIR, f'{song.name}.mid')
    song.write_midi(full_mid)
    stems = sorted({p.stem for p in song.parts})
    tmp = tempfile.mkdtemp(prefix=f'music-{song.name}-')
    rendered = {}
    try:
        for st in stems:
            parts = [p for p in song.parts if p.stem == st]
            rendered[st] = synth.render(song, parts, sf2, SR)
            if keep_stems:
                sf.write(os.path.join(tmp, f'{st}.wav'), rendered[st].astype(np.float32), SR)
    finally:
        if not keep_stems:
            shutil.rmtree(tmp, ignore_errors=True)
    n = max(x.shape[0] for x in rendered.values())
    ir = make_ir(**mix['room'])
    stem_mix = {}
    for st, x in rendered.items():
        x = np.pad(x, ((0, n - x.shape[0]), (0, 0)))
        g = mix['gain'].get(st, 1.0)
        wet = mix['wet'].get(st, 0.3)
        stem_mix[st] = (x + convolve(x, ir) * wet) * g
    results = []
    for suffix, drop in [('', set())] + list((variants or {}).items()):
        y = sum(v for k, v in stem_mix.items() if k not in drop)
        results.append(_finish(song, y, mix, suffix))
    return results


def _finish(song, y, mix, suffix):
    name = song.name + suffix
    y = eq(y, mix['eq'])
    if song.loop:
        ls_b, le_b = song.loop_points_beats()
        ls, le = round(song.sample(ls_b, SR)), round(song.sample(le_b, SR))
        body0 = round(song.sample(song.body_start, SR))
        cut = le + SR  # 1 s of continuation past the seam
        region = y[body0:le]
    else:
        ls = le = None
        end = round(song.seconds(song.total_beats) * SR)
        # keep the ring-out until it falls below -70 dBFS (relative to peak)
        env = np.abs(y).max(axis=1)
        thr = env.max() * 10 ** (-70 / 20)
        idx = np.nonzero(env > thr)[0]
        cut = min(y.shape[0], max(end, (idx[-1] if len(idx) else end) + int(0.3 * SR)))
        region = y[:cut]
    meter = pyloudnorm.Meter(SR)
    lufs0 = meter.integrated_loudness(region)
    target = mix.get('variant_lufs', {}).get(suffix, mix['lufs'])
    y = y * 10 ** ((target - lufs0) / 20)
    y, gr = limiter(y, mix['ceiling'])
    y = y[:cut]
    if not song.loop:
        f = int(0.25 * SR)
        y[-f:] *= np.linspace(1, 0, f)[:, None] ** 2
    region = y[round(song.seconds(song.body_start) * SR):le] if song.loop else y
    lufs = meter.integrated_loudness(region)
    tp = true_peak(y)
    flac = os.path.join(MASTER_DIR, f'{name}.flac')
    # 16-bit FLAC master with TPDF dither (24-bit would double the repository size; the full-resolution
    # signal is reproducible from the scores at any time)
    rng = np.random.default_rng(1)
    lsb = 1 / 32768
    y16 = np.clip(y + (rng.random(y.shape) - rng.random(y.shape)) * lsb, -1, 1 - lsb)
    sf.write(flac, y16, SR, subtype='PCM_16')
    mp3 = os.path.join(OUT_DIR, f'{name}.mp3')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', flac, '-c:a', 'libmp3lame', '-b:a', MP3_BITRATE,
                    '-ar', str(SR), '-ac', '2', '-id3v2_version', '0', '-write_xing', '1', mp3], check=True)
    seam = None
    if song.loop:
        w = SR // 2
        seam = float(np.max(np.abs(y[ls - w:ls + w] - y[le - w:le + w])))
    info = {
        'file': f'{name}.mp3', 'title': song.title + ({'_stealth': ' (stealth mix)'}.get(suffix, '')), 'role': song.role,
        'loop': song.loop, 'samples': int(y.shape[0]), 'sampleRate': SR, 'duration': round(y.shape[0] / SR, 3),
        'lufs': round(lufs, 2), 'truePeak': round(tp, 2), 'limiterGR': round(gr, 2),
        'bytes': os.path.getsize(mp3),
    }
    if getattr(song, 'group', None):
        info['group'] = song.group  # stems of one performance: the player switches between them in sync
    if song.loop:
        info.update({'loopStart': round(ls / SR, 6), 'loopEnd': round(le / SR, 6), 'loopStartSample': ls,
                     'loopEndSample': le, 'loopLength': round((le - ls) / SR, 3), 'seamMaxDiff': seam})
    return name, info


def update_manifest(entries):
    path = os.path.join(OUT_DIR, 'manifest.json')
    man = {'version': 1, 'sampleRate': SR, 'tracks': {}}
    if os.path.exists(path):
        man = json.load(open(path))
    for name, info in entries:
        man['tracks'][name] = info
    man['tracks'] = dict(sorted(man['tracks'].items()))
    with open(path, 'w') as f:
        json.dump(man, f, indent=1)
        f.write('\n')
    return man
