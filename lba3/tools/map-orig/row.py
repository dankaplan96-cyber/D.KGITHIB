#!/usr/bin/env python3
# A row of labelled pictures (each scaled to W px wide): python3 row.py <out.jpg> <title> <W> <img:label> ...
import sys
from PIL import Image, ImageDraw, ImageFont
out, title, Wc = sys.argv[1], sys.argv[2], int(sys.argv[3])
items = [a.rsplit(':', 1) for a in sys.argv[4:]]
ims = []
for path, lab in items:
    a = Image.open(path).convert('RGB'); ims.append((a.resize((Wc, round(a.height * Wc / a.width)), Image.LANCZOS), lab))
h = max(a.height for a, _ in ims); top = 58
im = Image.new('RGB', (len(ims) * (Wc + 8) - 8, h + top), (20, 20, 24))
d = ImageDraw.Draw(im)
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 17)
fs = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
cols = [(255, 220, 120), (140, 220, 255), (150, 255, 160), (255, 170, 200)]
for i, (a, lab) in enumerate(ims):
    im.paste(a, (i * (Wc + 8), top)); d.text((i * (Wc + 8) + 8, 7), lab, fill=cols[i % 4], font=f)
d.text((8, 34), title, fill=(220, 220, 220), font=fs)
im.save(out, quality=85)
print(out, im.size)
