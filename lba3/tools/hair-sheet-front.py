"""HAIR-EDGE (P106): the front, ¾, side and back of Twinsen's head, the lookdev turn and the talk camera, one row a look,
from the folders tests/twinsen-zoe-look.mjs writes (LOOK=… OUT=…; docs/lba-maturity/TWINSEN-ZOE-LOOK.md).

  python3 tools/hair-sheet-front.py <out dir> <look dir>…
writes <out dir>/hair-heads.jpg, hair-turn.jpg, hair-talk.jpg
"""
import json
import os
import sys
from PIL import Image, ImageDraw

out, looks = sys.argv[1], sys.argv[2:]


def label(d):
    return os.path.basename(os.path.normpath(d)).replace('+', ',')


def sheet(name, cols, get, cw, ch):
    S = Image.new('RGB', (len(cols) * (cw + 6) + 6, len(looks) * (ch + 22) + 22), (34, 36, 40))
    dr = ImageDraw.Draw(S)
    for j, c in enumerate(cols):
        dr.text((6 + j * (cw + 6) + 4, 4), c, fill=(235, 235, 235))
    for i, d in enumerate(looks):
        y = 22 + i * (ch + 22)
        dr.text((10, y + 2), label(d), fill=(200, 210, 120))
        for j, c in enumerate(cols):
            im = get(d, c)
            if im:
                S.paste(im.resize((cw, ch)), (6 + j * (cw + 6), y + 18))
    S.save(os.path.join(out, name), quality=88)
    print(name, S.size)


def head(d, c):
    p = os.path.join(d, f'ld-twinsen-head-{c}.jpg')
    if not os.path.exists(p):
        return None
    im = Image.open(p).convert('RGB')
    w, h = im.size
    return im.crop((w // 2 - 230, h // 2 - 250, w // 2 + 230, h // 2 + 210))


def turn(d, c):
    p = os.path.join(d, 'ld-twinsen-turn.jpg')
    if not os.path.exists(p):
        return None
    im = Image.open(p).convert('RGB')
    w, h = im.size
    return im.crop((w // 2 - 520, 40, w // 2 + 520, h - 40))


def talk(d, c):
    c = c.split(' ')[0]
    p = os.path.join(d, f'game-{c}.jpg')
    if not os.path.exists(p):
        return None
    m = json.load(open(os.path.join(d, 'meta.json'))).get(f'game-{c}', {}).get('hero')
    im = Image.open(p).convert('RGB')
    if not m:
        return im
    x0, y0, x1, y1 = m
    cx, s = (x0 + x1) / 2, max(x1 - x0, (y1 - y0) * 0.75)
    return im.crop((round(cx - s * 0.6), max(0, round(y0 - s * 0.1)), round(cx + s * 0.6), max(0, round(y0 - s * 0.1)) + round(s * 1.0)))


sheet('hair-heads.jpg', ['front', '34', 'side', 'back'], head, 230, 230)
sheet('hair-turn.jpg', ['front, 3/4, side, back (lookdev)'], turn, 1040, 560)
sheet('hair-talk.jpg', ['talk-1 (Zoe speaks)', 'talk-2 (he answers)'], talk, 360, 300)
