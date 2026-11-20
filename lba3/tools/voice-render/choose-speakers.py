#!/usr/bin/env python3
# VOICE-2: which LibriTTS-R speakers the Expressive banks use (tools/voice-render/piper-expressive.py), chosen by
# measurement, not by ear (nobody here can listen): from the survey of all 904 speakers (survey-speakers.py: median
# pitch, its spread, the spectrum's bands), each candidate in a role's pitch window says three made-up phrases and is
# measured with praat:
#   - the pitch (median, spread in semitones over a statement and a question: how much the melody moves),
#   - the formant dispersion (the mean spacing of F1-F4, about c / 2L for a vocal tract of length L: about 1000 Hz for
#     a man's, 1150-1200 for a woman's; the build of the voice, independent of its pitch),
#   - the harmonics-to-noise ratio (a clean voice against a rough or breathy one).
# A role takes the candidate nearest its pitch (so the PSOLA move stays small), of the right build, the most expressive,
# clean, and far enough in timbre from the voices already chosen. Writes tools/voice-render/expressive-speakers.json.
#   python3 tools/voice-render/choose-speakers.py /dev/shm/pg/survey.json
import json, os, sys
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
for p in filter(None, os.environ.get('PIPER_SITE', '/dev/shm/pvx').split(os.pathsep)):
    if p not in sys.path: sys.path.insert(0, p)
import parselmouth
from parselmouth.praat import call
from piper import PiperVoice
from piper.config import SynthesisConfig
M = os.environ.get('PIPER_MODEL', '/dev/shm/pvm/en_US-libritts_r-medium.onnx')
V = PiperVoice.load(M)
SR = 22050
SURVEY = json.load(open(sys.argv[1]))
PHR = ['[[ mˈɑːlɔ vˈɛni tˌiːsɑ, dɛlˈɑː nˈiːmɔ. ]]', '[[ sˈɑːvi lɛkˈɑːtɛ mˈiːlɑ? ]]', '[[ kˌɑːɾɔ nˈiːvɛ sˈɑːlɔ dɛmˈiː. ]]']
CACHE = {}
def measure(sid):
    if sid in CACHE: return CACHE[sid]
    f0s, sds, disp, hnr = [], [], [], []
    for t in PHR:
        x = np.concatenate([c.audio_float_array for c in V.synthesize(t, SynthesisConfig(speaker_id=sid, length_scale=1.0, noise_scale=0.667, noise_w_scale=0.8))]).astype(np.float64)
        s = parselmouth.Sound(x, SR)
        p = s.to_pitch(pitch_floor=60, pitch_ceiling=500).selected_array['frequency']; v = p[p > 0]
        if len(v) < 10: continue
        f0s.append(np.median(v)); sds.append(np.std(12 * np.log2(v / np.median(v))))
        fm = s.to_formant_burg(max_number_of_formants=5, maximum_formant=5500)
        F = []
        for tt in np.arange(0.05, s.duration - 0.05, 0.01):
            fs = [call(fm, 'Get value at time', k, tt, 'Hertz', 'Linear') for k in (1, 2, 3, 4)]
            if all(np.isfinite(fs)): F.append(fs)
        if F: F = np.array(F); disp.append(float(np.median((F[:, 3] - F[:, 0]) / 3)))
        h = call(s.to_harmonicity_cc(), 'Get mean', 0, 0); hnr.append(h)
    r = dict(f0=float(np.median(f0s)) if f0s else 0, sd=float(np.mean(sds)) if sds else 0, disp=float(np.median(disp)) if disp else 0, hnr=float(np.mean(hnr)) if hnr else 0)
    CACHE[sid] = r
    return r

def bands(sid): return np.array(SURVEY[str(sid)]['bands'])
def tdist(a, b): return float(np.sqrt(np.mean((bands(a) - bands(b)) ** 2)))

# role: (pitch window around the target, build ('m' a man's tract, 'f' a woman's, 'k' the shortest), keep: a Classic
# speaker kept when it fits, how expressive (weight), how clean (weight))
ROLES = {
    'hero': dict(f0=140, win=(134, 152), build='m', keep=None, expr=1.0),
    'zoe': dict(f0=218, win=(200, 236), build='f', keep=161, expr=1.0),
    'arthur': dict(f0=262, win=(240, 285), build='k', keep=693, expr=0.8),
    'baldino': dict(f0=142, win=(130, 155), build='m', keep=441, expr=1.0),
    'vesk': dict(f0=112, win=(102, 124), build='m', keep=None, expr=0.4),
    'gilbert': dict(f0=112, win=(100, 126), build='m', keep=None, expr=0.6),
    'doran': dict(f0=108, win=(98, 120), build='m', keep=413, expr=0.5),
}
FAMS = {
    'quetch-m': ((125, 140), 'm'), 'quetch-f': ((205, 225), 'f'), 'quetch-kid': ((255, 280), 'k'), 'grobo-m': ((108, 122), 'm'),
    'grobo-f': ((175, 195), 'f'), 'grobo-kid': ((245, 270), 'k'), 'bunny-m': ((135, 150), 'm'), 'bunny-f': ((220, 240), 'f'),
    'esmer-m': ((140, 155), 'm'), 'esmer-f': ((215, 235), 'f'),
}
USED = {372, 595}   # (Sendell and Mira keep their Classic speakers: their pitch already fits)
def build_ok(m, b):
    if b == 'm': return 0 < m['disp'] <= 1110 and m['f0'] < 156
    if b == 'f': return m['disp'] >= 1150 and m['f0'] >= 172
    return m['disp'] >= 1140 and m['f0'] >= 238
def pick(win, b, target, expr, avoid, n=1, spread=False):
    lo, hi = win
    cands = [int(s) for s, d in SURVEY.items() if lo * 0.93 <= d['f0'] <= hi * 1.07 and int(s) not in USED]
    rows = []
    for s in cands:
        m = measure(s)
        if not (lo <= m['f0'] <= hi) or not build_ok(m, b): continue
        far = min([tdist(s, a) for a in avoid] or [9])
        sc = -abs(12 * np.log2(m['f0'] / target)) * 0.8 + expr * m['sd'] * 0.8 + min(m['hnr'], 14) * 0.08 + min(far, 6) * 0.25
        rows.append((sc, s, m, far))
    rows.sort(reverse=True)
    out = []
    for sc, s, m, far in rows:
        if any(tdist(s, o) < 3.0 for o in out): continue
        if spread and out and any(abs(12 * np.log2(m['f0'] / measure(o)['f0'])) < 0.6 for o in out): continue
        out.append(s)
        if len(out) == n: break
    return out, rows[:6]

import sys as _s
if _s.argv[2:]:
    for s in map(int, _s.argv[2].split(",")): print(s, {k: round(v,2) for k,v in measure(s).items()}, [round(tdist(s,o),1) for o in (161,441,156,353,413)])
    raise SystemExit
res = dict(cast={}, families={}, measured={})
chosen = list(USED)
for role, R in ROLES.items():
    if R['keep'] is not None:
        m = measure(R['keep'])
        if R['win'][0] * 0.95 <= m['f0'] <= R['win'][1] * 1.05:
            res['cast'][role] = R['keep']; chosen.append(R['keep']); USED.add(R['keep'])
            res['measured'][role] = dict(sid=R['keep'], kept=True, **{k: round(v, 2) for k, v in m.items()})
            print(role, 'kept', R['keep'], m, flush=True); continue
    got, top = pick(R['win'], R['build'], R['f0'], R['expr'], chosen)
    if not got: print(role, 'NO CANDIDATE'); continue
    s = got[0]; res['cast'][role] = s; chosen.append(s); USED.add(s)
    res['measured'][role] = dict(sid=s, **{k: round(v, 2) for k, v in measure(s).items()}, top=[(round(a, 2), b) for a, b, _, _ in top])
    print(role, s, measure(s), [(round(a, 2), b) for a, b, _, _ in top], flush=True)
for fam, (win, b) in FAMS.items():
    got, top = pick(win, b, (win[0] + win[1]) / 2, 0.8, chosen, n=3, spread=True)
    res['families'][fam] = got; chosen += got; USED.update(got)
    res['measured'][fam] = [dict(sid=s, **{k: round(v, 2) for k, v in measure(s).items()}) for s in got]
    print(fam, got, [measure(s) for s in got], flush=True)
json.dump(res, open(os.path.join(HERE, 'expressive-speakers.json'), 'w'), indent=1)
print('written')
