# ANIM-POLISH: frame strips from cap.mjs crops, before over after.
# usage: python3 strip.py <out.jpg> <seq> <every> <max> <dir1> <label1> [<dir2> <label2>] [--t0 s] [--t1 s] [--title text]
# Each tile: time, animation, the strike's clock / landing / plant state. Frames wrap COLS to a row; with two captures each
# row of the first is followed by the same frames of the second (same input, same step).
import json, sys
from PIL import Image, ImageDraw
a = sys.argv[1:]
opt = {}
for k in ('--t0', '--t1', '--title', '--cols', '--tw'):
    if k in a: i = a.index(k); opt[k] = a[i + 1]; del a[i:i + 2]
out, seq, every, mx = a[0], a[1], int(a[2]), int(a[3])
sets = [(a[i], a[i + 1]) for i in range(4, len(a) - 1, 2)]
t0, t1 = float(opt.get('--t0', 0)), float(opt.get('--t1', 99))
COLS = int(opt.get('--cols', 10))
TW = int(opt.get('--tw', 144)); TH = int(TW * 1.125) + 24 if TW == 144 else int(TW * 320 / 600) + 24

def tiles(dd):
    S = json.load(open(f'{dd}/{seq}.json'))['samples']
    shots = [s for s in S if 'shot' in s and t0 <= s['t'] <= t1][::every][:mx]
    res = []
    for s in shots:
        im0 = Image.open(f'{dd}/{seq}-{s["shot"]:03d}.png').convert('RGB').resize((TW, TH - 24))
        im = Image.new('RGB', (TW, TH), (20, 20, 24)); im.paste(im0, (0, 24))
        dr = ImageDraw.Draw(im)
        ev = ''
        if s.get('move'): ev = f'{s["move"]["key"]} {s["move"]["t"]:.2f}' + (' HIT' if s['move'].get('landed') else '')
        elif s.get('landT'): ev = f'land {s["landS"]}'
        elif not s.get('onGround', True): ev = 'air'
        elif s.get('plant'): ev = 'feet ' + ' '.join(p[0] for p in s['plant'][:2])
        dr.rectangle([0, 0, TW, 24], fill=(20, 20, 24))
        dr.text((3, 1), f'{s["t"]:.2f}s {s["anim"]}', fill=(255, 255, 255))
        dr.text((3, 12), ev, fill=(255, 220, 120))
        res.append(im)
    return res
T = [(lab, tiles(d)) for d, lab in sets]
n = max(len(t) for _, t in T)
chunks = (n + COLS - 1) // COLS
LW, TOP = 56, 22 if '--title' in opt else 0
img = Image.new('RGB', (LW + COLS * TW, TOP + chunks * len(T) * TH), (30, 30, 34))
dr = ImageDraw.Draw(img)
if TOP: dr.text((6, 5), opt['--title'], fill=(255, 255, 255))
for c in range(chunks):
    for si, (lab, ts) in enumerate(T):
        y = TOP + (c * len(T) + si) * TH
        dr.text((4, y + TH // 2), lab, fill=(255, 255, 255))
        for i, t in enumerate(ts[c * COLS:(c + 1) * COLS]): img.paste(t, (LW + i * TW, y))
img.save(out, quality=70)
print(out, img.size)
