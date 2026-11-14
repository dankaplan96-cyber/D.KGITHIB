# ANIM-COMBAT: frame strips from cap.mjs crops.
# usage: python3 strip.py <dir> <seq> <out.jpg> [every=1] [max=16] [<dir2> label1 label2]
# Frames wrap 8 to a row. With a second capture dir each row of "before" frames is followed by the same frames
# "after" (same steps of the same input sequence).
import json, sys
from PIL import Image, ImageDraw
d, seq, out = sys.argv[1], sys.argv[2], sys.argv[3]
every = int(sys.argv[4]) if len(sys.argv) > 4 else 1
mx = int(sys.argv[5]) if len(sys.argv) > 5 else 16
d2 = sys.argv[6] if len(sys.argv) > 6 else None
labels = sys.argv[7:9] if len(sys.argv) > 8 else ['before', 'after']
TW, TH, COLS = 165, 188, 8

def tiles(dd):
    S = json.load(open(f'{dd}/{seq}.json'))['samples']
    shots = [s for s in S if 'shot' in s][::every][:mx]
    out = []
    for s in shots:
        im = Image.open(f'{dd}/{seq}-{s["shot"]:03d}.png').convert('RGB').resize((TW, TH))
        dr = ImageDraw.Draw(im)
        ev = ''
        if s.get('thr'): ev = ('REL ' if s['thr']['released'] else '') + f'clock {s["thr"]["at"]:.2f}'
        if s.get('move'): ev = f'{s["move"]["key"]} {s["move"]["t"]:.2f}' + (' HIT' if s['move']['hits'] else '')
        dr.rectangle([0, 0, TW, 24], fill=(20, 20, 24))
        dr.text((3, 1), f'{s["t"]:.3f}s {s["anim"]}', fill=(255, 255, 255))
        dr.text((3, 12), ev + (f' ball:{s["ball"]["state"]}' if s['ball']['state'] not in ('idle',) else ''), fill=(255, 220, 120))
        out.append(im)
    return out
sets = [tiles(d)] + ([tiles(d2)] if d2 else [])
n = max(len(t) for t in sets)
chunks = (n + COLS - 1) // COLS
LW = 52 if d2 else 0
img = Image.new('RGB', (LW + COLS * TW, chunks * len(sets) * TH), (30, 30, 34))
dr = ImageDraw.Draw(img)
for c in range(chunks):
    for si, ts in enumerate(sets):
        y = (c * len(sets) + si) * TH
        if d2: dr.text((4, y + TH // 2), labels[si], fill=(255, 255, 255))
        for i, t in enumerate(ts[c * COLS:(c + 1) * COLS]): img.paste(t, (LW + i * TW, y))
img.save(out, quality=62)
print(out, img.size)
