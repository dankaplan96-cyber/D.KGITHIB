#!/usr/bin/env python3
# sheet.py <before_dir> <after_dir> <out.jpg> <spot,spot,...>  — rows: spot before | after, labelled
import sys
from PIL import Image, ImageDraw, ImageFont
bd, ad, out, spots = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4].split(',')
W, H = 560, 315
font = ImageFont.load_default()
rows = []
for s in spots:
    row = Image.new('RGB', (W * 2 + 6, H + 22), '#20182a')
    d = ImageDraw.Draw(row)
    for i, (dirn, tag) in enumerate(((bd, 'before'), (ad, 'after'))):
        try:
            im = Image.open(f'{dirn}/{s}-{tag}.jpg').convert('RGB').resize((W, H), Image.LANCZOS)
            row.paste(im, (i * (W + 6), 22))
        except FileNotFoundError:
            pass
        d.text((i * (W + 6) + 6, 4), f'{s}  {tag.upper()}', fill='#f4e6c8', font=font)
    rows.append(row)
sheet = Image.new('RGB', (W * 2 + 6, len(rows) * (H + 26)), '#20182a')
for i, r in enumerate(rows):
    sheet.paste(r, (0, i * (H + 26)))
sheet.save(out, quality=84)
print(out, sheet.size)
