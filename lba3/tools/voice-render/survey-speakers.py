# AUDIO-FIX: a survey of the LibriTTS-R model's speakers, for choosing a voice (piper-banks.py's CAST): each speaker
# says one fixed made-up phrase; measured: median f0 (Hz), its spread (f0sd, semitones: how expressive), the spectrum's
# centroid (Hz), the share of 4-8 kHz (hi, dB: breath and brightness), and 24 log-spaced band levels (timbre: two
# speakers' distance is the RMS of their band difference, dB). Resumable; numbers only, not a listening test.
#   python3 tools/voice-render/survey-speakers.py <out.json> [sid,sid,...]      (no list: all 904, ~30 min)
# Needs piper-tts and the model as piper-banks.py (PIPER_SITE, PIPER_MODEL).
import sys, json, os, glob
for p in filter(None, os.environ.get('PIPER_SITE', '').split(os.pathsep)): sys.path.insert(0, p)
for p in glob.glob('/dev/shm/pv/lib/python3*/site-packages') + ['/dev/shm/pvx']:
    if os.path.isdir(p) and p not in sys.path: sys.path.append(p)
import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig
M = os.environ.get('PIPER_MODEL', '/dev/shm/pvm/en_US-libritts_r-medium.onnx')
v = PiperVoice.load(M)
SR = 22050
TEXT = 'Malo venira soli, tamen davo neli? Sora mintel vasa.'
out = {}
path = sys.argv[1]
if os.path.exists(path): out = json.load(open(path))
sids = [int(x) for x in sys.argv[2].split(',')] if len(sys.argv) > 2 else range(904)
edges = np.geomspace(100, 8000, 25)
def feats(x):
    fr = 1024; hop = 256
    w = np.hanning(fr)
    n = (len(x) - fr) // hop
    F = np.abs(np.fft.rfft(np.stack([x[i*hop:i*hop+fr] * w for i in range(n)]), axis=1)) ** 2
    e = F.sum(1); keep = e > e.max() * 0.01
    S = F[keep].mean(0)
    f = np.fft.rfftfreq(fr, 1 / SR)
    bands = np.array([S[(f >= a) & (f < b)].sum() for a, b in zip(edges[:-1], edges[1:])])
    lb = 10 * np.log10(bands + 1e-12); lb -= lb.max()
    cen = float((S * f).sum() / S.sum())
    # breathiness: energy 4-8 kHz relative to 100-4k during voiced frames
    hi = S[(f > 4000) & (f < 8000)].sum() / S[(f > 100) & (f < 4000)].sum()
    # f0 (autocorrelation, voiced frames)
    f0s = []
    for i in range(0, len(x) - 1024, 512):
        seg = x[i:i+1024]
        if np.sqrt((seg ** 2).mean()) < 0.02: continue
        c = np.correlate(seg, seg, 'full')[1023:]
        lo, hi2 = int(SR / 500), int(SR / 60)
        k = lo + int(np.argmax(c[lo:hi2]))
        if c[k] > 0.4 * c[0]: f0s.append(SR / k)
    f0 = float(np.median(f0s)) if f0s else 0
    sd = float(np.std(12 * np.log2(np.array(f0s) / f0))) if f0s else 0
    return dict(f0=round(f0, 1), f0sd=round(sd, 2), cen=round(cen), hi=round(float(10 * np.log10(hi + 1e-12)), 1), bands=[round(float(b), 1) for b in lb])
for sid in sids:
    if str(sid) in out: continue
    pcm = np.concatenate([c.audio_float_array for c in v.synthesize(TEXT, SynthesisConfig(speaker_id=sid, length_scale=1.0, noise_scale=0.667, noise_w_scale=0.8))])
    pcm = pcm / (np.abs(pcm).max() + 1e-9) * 0.5
    out[str(sid)] = feats(pcm.astype(np.float64))
    if sid % 50 == 0:
        json.dump(out, open(path, 'w')); print(sid, out[str(sid)]['f0'], flush=True)
json.dump(out, open(path, 'w'))
print('done', len(out))
