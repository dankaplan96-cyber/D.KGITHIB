#!/usr/bin/env python3
# HERO-ARMS review sheets (PIL).
#   grid  <out> <cols> <w> <h> <img>...                        contact sheet, file names as labels
#   side  <out> <w> <h> <label>=<img> [<label>=<img> ...]      labelled panels side by side (before / after)
#   crop  <out> <img> <x> <y> <w> <h> [<scale>]                a crop, scaled
import os
import sys

from PIL import Image, ImageDraw, ImageFont


def font(sz):
    for f in ('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'):
        if os.path.exists(f):
            return ImageFont.truetype(f, sz)
    return ImageFont.load_default()


def label(im, text, sz=20):
    d = ImageDraw.Draw(im)
    f = font(sz)
    x0, y0, x1, y1 = d.textbbox((0, 0), text, font=f)
    d.rectangle((0, 0, x1 - x0 + 16, y1 - y0 + 12), fill=(0, 0, 0))
    d.text((8 - x0, 6 - y0), text, fill=(255, 255, 255), font=f)


cmd, out = sys.argv[1], sys.argv[2]
a = sys.argv[3:]
if cmd == 'grid':
    cols, w, h = int(a[0]), int(a[1]), int(a[2])
    fs = a[3:]
    W = Image.new('RGB', (w * cols, h * ((len(fs) + cols - 1) // cols)), (40, 40, 40))
    for i, f in enumerate(fs):
        im = Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS)
        label(im, os.path.splitext(os.path.basename(f))[0], 14)
        W.paste(im, ((i % cols) * w, (i // cols) * h))
    W.save(out, quality=88)
elif cmd == 'side':
    w, h = int(a[0]), int(a[1])
    ps = [p.split('=', 1) for p in a[2:]]
    W = Image.new('RGB', (w * len(ps) + 6 * (len(ps) - 1), h), (24, 24, 24))
    for i, (lb, f) in enumerate(ps):
        im = Image.open(f).convert('RGB').resize((w, h), Image.LANCZOS)
        label(im, lb)
        W.paste(im, (i * (w + 6), 0))
    W.save(out, quality=90)
elif cmd == 'crop':
    im = Image.open(a[0]).convert('RGB')
    x, y, w, h = (int(v) for v in a[1:5])
    k = float(a[5]) if len(a) > 5 else 1.0
    im.crop((x, y, x + w, y + h)).resize((int(w * k), int(h * k)), Image.LANCZOS).save(out)
