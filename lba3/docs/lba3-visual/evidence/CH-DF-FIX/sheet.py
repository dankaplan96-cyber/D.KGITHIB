# CH-DF-FIX: before|after sheets from ingame-dirs.mjs frames (crops around the Dino-Fly, scaled to one size).
#   python3 sheet.py <before_dir> <after_dir> <out_dir>
# One sheet per state (doze, look, stretch): rows S, N, E, W; columns 5 m before, 5 m after, 12 m before, 12 m after.
# Plus a strip: the stretch (frames every 0.2 s), before above after.
import os
import sys

from PIL import Image, ImageDraw

B, A, OUT = sys.argv[1:4]
CROP = {5: (400, 200, 960, 536), 12: (430, 120, 810, 348), 'S12': (480, 290, 860, 518)}   # the creature in the frame
# (12 m south of him the hero stands on Twinsen's house roof, so the creature is nearer the frame's middle there)
CW, CH = 560, 336


def tile(path, dist, label, dn=''):
    im = Image.open(path).convert('RGB').crop(CROP.get(f'{dn}{dist}', CROP[dist])).resize((CW, CH), Image.LANCZOS)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 8 + 7 * len(label), 16), fill=(255, 255, 255))
    d.text((4, 2), label, fill=(0, 0, 0))
    return im


for state in ('doze', 'look', 'stretch'):
    sheet = Image.new('RGB', (4 * CW + 10, 4 * CH + 6), (40, 40, 40))
    for r, dn in enumerate('SNEW'):
        for c, (dist, pre, dr) in enumerate(((5, 'before', B), (5, 'after', A), (12, 'before', B), (12, 'after', A))):
            p = os.path.join(dr, f'{pre}-{dn}{dist}-{state}.png')
            if os.path.exists(p):
                sheet.paste(tile(p, dist, f'{state} {dn} {dist} m {pre}', dn), (c * CW + (c // 2) * 10, r * (CH + 2)))
    sheet.save(os.path.join(OUT, f'ingame-{state}-before-after.jpg'), quality=84)

for strip, n in (('stretch', 15),):
    w, h = 300, 180
    sheet = Image.new('RGB', (8 * w, 4 * h + 6), (40, 40, 40))
    for r, (pre, dr) in enumerate((('before', B), ('after', A))):
        for i in range(min(n, 16)):
            p = os.path.join(dr, f'{pre}-{strip}-{i:02d}.png')
            if not os.path.exists(p):
                continue
            box = (440, 190, 790, 400) if strip == 'stretch' else (480, 180, 830, 390)
            im = Image.open(p).convert('RGB').crop(box).resize((w, h), Image.LANCZOS)
            d = ImageDraw.Draw(im)
            d.text((4, 2), f'{pre} {strip} {i * 0.2:.1f}s', fill=(255, 255, 255))
            sheet.paste(im, ((i % 8) * w, (r * 2 + i // 8) * h + r * 6))
    sheet.save(os.path.join(OUT, f'ingame-{strip}-strip-before-after.jpg'), quality=84)
print('ok')

# lookdev (lookdev-set.mjs): python3 sheet.py <before> <after> <out> <lookdev_before> <lookdev_after>
if len(sys.argv) > 5:
    LB, LA = sys.argv[4:6]
    rows = []
    for name in ('views-doze', 'views-look', 'views-stretch', 'views-rest', 'views-grey-look', 'close-grey'):
        for pre, dr in (('before', LB), ('after', LA)):
            im = Image.open(os.path.join(dr, f'{pre}-{name}.png')).convert('RGB')
            im = im.resize((1600, int(im.height * 1600 / im.width)), Image.LANCZOS)
            ImageDraw.Draw(im).rectangle((0, im.height - 18, 240, im.height), fill=(255, 255, 255))
            ImageDraw.Draw(im).text((4, im.height - 15), f'{pre}: {name}', fill=(0, 0, 0))
            rows.append(im)
    sheet = Image.new('RGB', (1600, sum(r.height + 3 for r in rows)), (40, 40, 40))
    y = 0
    for r in rows:
        sheet.paste(r, (0, y))
        y += r.height + 3
    sheet.save(os.path.join(OUT, 'lookdev-before-after.jpg'), quality=84)
    ts = (0.1, 0.4, 0.7, 1, 1.4, 2, 3)
    w, h = 320, 240
    sheet = Image.new('RGB', (len(ts) * w, 2 * h + 4), (40, 40, 40))
    for r, (pre, dr) in enumerate((('before', LB), ('after', LA))):
        for i, t in enumerate(ts):
            im = Image.open(os.path.join(dr, f'{pre}-wake-{t}.png')).convert('RGB').crop((40, 0, 440, 300)).resize((w, h), Image.LANCZOS)
            ImageDraw.Draw(im).text((4, 18), f'{pre} wake {t} s', fill=(0, 0, 0))
            sheet.paste(im, (i * w, r * (h + 4)))
    sheet.save(os.path.join(OUT, 'lookdev-wake-strip-before-after.jpg'), quality=84)
    print('lookdev ok')
