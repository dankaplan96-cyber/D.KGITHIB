#!/usr/bin/env python3
# Side-by-side sheet: left the original (lba2remake), right ours, each 800 px wide, labelled.
# usage: python3 pair.py <left.jpg> <right.jpg> <out.jpg> <title> [left label] [right label]
import sys
from PIL import Image, ImageDraw, ImageFont
L, R, out, title = sys.argv[1:5]
ll = sys.argv[5] if len(sys.argv) > 5 else 'LBA2 (lba2remake)'
rl = sys.argv[6] if len(sys.argv) > 6 else 'LBA3 (ours)'
Wc = 800
a, b = Image.open(L).convert('RGB'), Image.open(R).convert('RGB')
a = a.resize((Wc, round(a.height * Wc / a.width)), Image.LANCZOS)
b = b.resize((Wc, round(b.height * Wc / b.width)), Image.LANCZOS)
h = max(a.height, b.height)
top = 58
im = Image.new('RGB', (2 * Wc + 8, h + top), (20, 20, 24))
im.paste(a, (0, top)); im.paste(b, (Wc + 8, top))
d = ImageDraw.Draw(im)
f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
fs = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
d.text((8, 7), ll, fill=(255, 220, 120), font=f)
d.text((Wc + 16, 7), rl, fill=(140, 220, 255), font=f)
tw = d.textlength(title, font=fs)
d.text((8, 34), title, fill=(220, 220, 220), font=fs)
im.save(out, quality=86)
print(out, im.size)
