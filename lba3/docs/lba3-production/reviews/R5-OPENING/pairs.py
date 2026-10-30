#!/usr/bin/env python3
"""Before/after sheet: one row per moment, before left, after right, labelled.
   python3 pairs.py <out.jpg> <width per image> <before.jpg> <after.jpg> <label> [<before> <after> <label> ...]
   (an empty before path '-' leaves that half blank: a moment that has no counterpart)"""
import sys
from PIL import Image, ImageDraw
out, w = sys.argv[1], int(sys.argv[2])
rows = [sys.argv[i:i + 3] for i in range(3, len(sys.argv), 3)]
h = w * 9 // 16
W = Image.new('RGB', (w * 2 + 6, (h + 4) * len(rows)), (16, 16, 16))
for r, (b, a, lab) in enumerate(rows):
    for c, (f, tag) in enumerate(((b, 'before'), (a, 'after'))):
        if f == '-': continue
        im = Image.open(f).convert('RGB').resize((w, h))
        d = ImageDraw.Draw(im)
        d.rectangle((0, 0, 8 + 7 * (len(tag) + len(lab) + 3), 15), fill=(0, 0, 0))
        d.text((4, 2), f'{tag} | {lab}', fill=(255, 230, 120))
        W.paste(im, (c * (w + 6), r * (h + 4)))
W.save(out, quality=86)
print(out, len(rows), 'rows')
