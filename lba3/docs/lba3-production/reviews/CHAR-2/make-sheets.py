#!/usr/bin/env python3
# CHAR-2 (CHAR-OPEN's, plus crop): small before/after jpgs from the screenshots of lookdev-shot.mjs, opening-shots.mjs and ko-shots.mjs
# (our renders only).
#   python3 make-sheets.py pair <before.png> <after.png> <out.jpg> [width] [label-before] [label-after] [side]
#   python3 make-sheets.py grid <out.jpg> <cell px> <cols> <label:path> [<label:path> ...]
#   python3 make-sheets.py rows <out.jpg> <width> <label:before> <label:after> [<label:before> <label:after> ...]
#   python3 make-sheets.py crop <in.png> <out.png> <x0> <y0> <x1> <y1>
# pair: before above after (or side by side with "side"), scaled to the width; grid: square cells, labelled;
# rows: whole frames, each row a before/after pair side by side.
import sys

from PIL import Image, ImageDraw


def label(im, text):
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 8 + 6 * len(text), 15], fill=(255, 255, 255))
    d.text((4, 2), text, fill=(10, 20, 40))
    return im


def fit(im, w):
    return im.resize((w, round(im.height * w / im.width)), Image.LANCZOS) if im.width != w else im


cmd = sys.argv[1]
if cmd == 'pair':
    a, b, out = sys.argv[2:5]
    w = int(sys.argv[5]) if len(sys.argv) > 5 else 900
    la = sys.argv[6] if len(sys.argv) > 6 else 'BEFORE'
    lb = sys.argv[7] if len(sys.argv) > 7 else 'AFTER (CHAR-OPEN)'
    side = len(sys.argv) > 8 and sys.argv[8] == 'side'
    A, B = Image.open(a).convert('RGB'), Image.open(b).convert('RGB')
    if side:
        A, B = fit(A, w // 2 - 3), fit(B, w // 2 - 3)
        im = Image.new('RGB', (A.width + B.width + 6, max(A.height, B.height)), (30, 30, 30))
        im.paste(label(A, la), (0, 0)); im.paste(label(B, lb), (A.width + 6, 0))
    else:
        A, B = fit(A, w), fit(B, w)
        im = Image.new('RGB', (w, A.height + B.height + 6), (30, 30, 30))
        im.paste(label(A, la), (0, 0)); im.paste(label(B, lb), (0, A.height + 6))
    im.save(out, quality=82)
    print(out, im.size)
elif cmd == 'grid':
    out, cell, cols = sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
    items = [x.rsplit(':', 1) for x in sys.argv[5:]]
    rows = (len(items) + cols - 1) // cols
    im = Image.new('RGB', (cols * cell + (cols - 1) * 4, rows * cell + (rows - 1) * 4), (30, 30, 30))
    for i, (lab, p) in enumerate(items):
        c = Image.open(p).convert('RGB')
        s = min(c.width, c.height)
        c = c.crop(((c.width - s) // 2, (c.height - s) // 2, (c.width - s) // 2 + s, (c.height - s) // 2 + s)).resize((cell, cell), Image.LANCZOS)
        im.paste(label(c, lab), ((i % cols) * (cell + 4), (i // cols) * (cell + 4)))
    im.save(out, quality=82)
    print(out, im.size)
elif cmd == 'rows':
    out, w = sys.argv[2], int(sys.argv[3])
    items = [x.rsplit(':', 1) for x in sys.argv[4:]]
    cw = w // 2 - 3
    cells = [label(fit(Image.open(p).convert('RGB'), cw), lab) for lab, p in items]
    ch = max(c.height for c in cells)
    rows = (len(cells) + 1) // 2
    im = Image.new('RGB', (w, rows * ch + (rows - 1) * 6), (30, 30, 30))
    for i, c in enumerate(cells):
        im.paste(c, ((i % 2) * (cw + 6), (i // 2) * (ch + 6)))
    im.save(out, quality=82)
    print(out, im.size)
elif cmd == 'crop':
    a, out = sys.argv[2:4]
    x0, y0, x1, y1 = (int(v) for v in sys.argv[4:8])
    Image.open(a).convert('RGB').crop((x0, y0, x1, y1)).save(out)
    print(out)
