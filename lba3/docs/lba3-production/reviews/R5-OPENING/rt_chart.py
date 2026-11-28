#!/usr/bin/env python3
"""Chart of a real-time run (realtime.mjs log): the subtitle's computed opacity per drawn frame, the lines' scheduled
times and the babble's syllables, over a stretch of scene time.
   python3 rt_chart.py <log.json> <out.jpg> [t0 t1]"""
import json, sys
from PIL import Image, ImageDraw
L = json.load(open(sys.argv[1]))
out = sys.argv[2]
t0, t1 = (float(sys.argv[3]), float(sys.argv[4])) if len(sys.argv) > 4 else (44.0, 62.6)
F, Y, D = L['frames'], L['syl'], L['def']
W, H = 1400, 300
X = lambda t: int(40 + (t - t0) / (t1 - t0) * (W - 60))
im = Image.new('RGB', (W, H), (250, 250, 248)); d = ImageDraw.Draw(im)
dts = sorted(f['dt'] for f in F[1:] if f['state'] == 'cinematic')
d.text((40, 6), f'Real-time run (wall clock, ~{1 / dts[len(dts) // 2]:.1f} fps): subtitle opacity as drawn (CSS), the scheduled lines, the babble syllables; scene time {t0:g}-{t1:g} s', fill=(0, 0, 0))
for s in D:
    if s['t'] + s['d'] < t0 or s['t'] > t1: continue
    d.rectangle((X(s['t']), 40, X(s['t'] + s['d']), 60), fill=(200, 215, 240)); d.text((X(s['t']) + 3, 44), s['text'][:30], fill=(0, 0, 0))
prev = None
for f in F:
    if not (t0 <= f['t'] <= t1): continue
    p = (X(f['t']), 200 - int(f['sub'] * 110))
    if prev: d.line((prev, p), fill=(200, 60, 40), width=2)
    d.ellipse((p[0] - 2, p[1] - 2, p[0] + 2, p[1] + 2), fill=(200, 60, 40)); prev = p
for y in Y:
    if t0 <= y['t'] <= t1: d.line((X(y['t']), 220, X(y['t']), 245), fill=(30, 120, 60), width=2)
for t in range(int(t0), int(t1) + 1):
    d.line((X(t), 250, X(t), 256), fill=(0, 0, 0)); d.text((X(t) - 6, 260), str(t), fill=(0, 0, 0))
d.text((40, 70), "red: #cine-sub's computed opacity on each drawn frame (0 bottom, 1 top); green: a syllable scheduled; blue: each line's scheduled time", fill=(80, 80, 80))
im.save(out, quality=90)
print(out)
