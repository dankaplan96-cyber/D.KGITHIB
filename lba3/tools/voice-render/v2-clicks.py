#!/usr/bin/env python3
# VOICE-2: the click measure of every Expressive clip as the game decodes it (48 kHz), on the clip alone and through
# the voice bus (piper-banks.py game_bus), the worst first. The suites fail a line at 7 (tests/lib/voicelab.js: a
# sample's second difference against the second difference around it, +-5 ms).
#   python3 tools/voice-render/v2-clicks.py [bank ...]
import json, os, subprocess, sys, importlib.util
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('pb', os.path.join(HERE, 'piper-banks.py')); PB = importlib.util.module_from_spec(spec); spec.loader.exec_module(PB)
D = os.path.join(HERE, '..', '..', 'assets', 'voice2')
man = json.load(open(os.path.join(D, 'manifest.json')))
def crest(y):
    d2 = np.zeros(len(y)); d2[2:] = y[2:] - 2 * y[1:-1] + y[:-2]
    half = 240; cum = np.concatenate([[0], np.cumsum(d2 * d2)])
    i = np.arange(len(y)); lo = np.maximum(0, i - half); hi = np.minimum(len(y), i + half + 1)
    a = np.abs(d2); loc = np.sqrt(np.maximum(1e-12, (cum[hi] - cum[lo] - a * a) / (hi - lo - 1)))
    r = np.where(a >= 0.004, a / loc, 0)
    k = int(np.argmax(r)); return float(r[k]), k / 48000
rows = []
for bid, b in man['banks'].items():
    if len(sys.argv) > 1 and bid not in sys.argv[1:]: continue
    x = np.frombuffer(subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', os.path.join(D, b['file']), '-f', 'f32le', '-ac', '1', '-ar', '48000', '-'], capture_output=True, check=True).stdout, np.float32)
    for cid, c in b['clips'].items():
        seg = x[int(c['o'] * 48000):int((c['o'] + c['d']) * 48000)].astype(np.float64)
        y = PB.game_bus(seg * (b.get('gain', 1)))
        cr, at = crest(y)
        rows.append((cr, bid, cid, round(at, 3)))
rows.sort(reverse=True)
print('clips', len(rows), 'over 7:', sum(r[0] >= 7 for r in rows), 'over 6.5:', sum(r[0] >= 6.5 for r in rows))
for r in rows[:25]: print(f'{r[0]:5.2f} {r[1]:12s} {r[2]:12s} at {r[3]} s')
json.dump([r[1:3] for r in rows if r[0] >= 6.5], open('/dev/shm/v2-clicky.json', 'w'))
