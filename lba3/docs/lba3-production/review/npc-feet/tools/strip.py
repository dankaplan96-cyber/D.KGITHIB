# ANIM-POLISH-3 strips: before (the unplanted walk) over after (planted), the same scripted input, from cap.mjs.
# usage: python3 strip.py <out.jpg> <dir> <seq> <t0> <t1> <every> <title>
import json, sys
from PIL import Image, ImageDraw
out, d, seq, t0, t1, every, title = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5]), int(sys.argv[6]), sys.argv[7]
TW, TH, COLS = 150, 170 + 26, int(sys.argv[8]) if len(sys.argv) > 8 else 10

def rows(mode):
    S = json.load(open(f'{d}/{seq}-{mode}.json'))['samples']
    idx = {id(s): i for i, s in enumerate(S)}
    shots = [s for s in S if 'shot' in s and t0 <= s['t'] <= t1][::every][:COLS * 2]
    res = []
    for s in shots:
        im0 = Image.open(f'{d}/{seq}-{mode}-{s["shot"]:03d}.png').convert('RGB').resize((TW, TH - 26))
        im = Image.new('RGB', (TW, TH), (20, 20, 24)); im.paste(im0, (0, 26))
        dr = ImageDraw.Draw(im)
        pl = s.get('plant')
        lab = ('L ' + pl[0] + '  R ' + pl[1]) if pl else 'unplanted'
        dr.text((3, 1), f'{s["t"]:.2f}s {s["anim"]}', fill=(255, 255, 255))
        dr.text((3, 13), lab, fill=(255, 220, 120))
        # the foot lowest to the ground: how far it moved over the last 0.05 s (3 frames), on the ground or not
        i = idx[id(s)]; p = S[max(0, i - 3)]
        k = 'L' if s['L'][1] < s['R'][1] else 'R'
        mv = 100 * ((s[k][0] - p[k][0]) ** 2 + (s[k][2] - p[k][2]) ** 2) ** 0.5
        col = (140, 230, 140) if mv < 0.6 else (255, 150, 120)
        dr.text((3, TH - 13), f'low foot {k} {mv:.1f} cm, {100 * s[k][1]:.1f} up', fill=col)
        res.append(im)
    return res

A, B = rows('off'), rows('on')
n = max(len(A), len(B)); chunks = (n + COLS - 1) // COLS
LW, TOP = 60, 22
img = Image.new('RGB', (LW + COLS * TW, TOP + chunks * 2 * TH), (30, 30, 34))
dr = ImageDraw.Draw(img)
dr.text((6, 5), title, fill=(255, 255, 255))
for c in range(chunks):
    for si, (lab, ts) in enumerate([('before', A), ('after', B)]):
        y = TOP + (c * 2 + si) * TH
        dr.text((4, y + TH // 2), lab, fill=(255, 255, 255))
        for i, t in enumerate(ts[c * COLS:(c + 1) * COLS]): img.paste(t, (LW + i * TW, y))
img.save(out, quality=72)
print(out, img.size)
