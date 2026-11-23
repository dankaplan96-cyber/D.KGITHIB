"""TWINSEN-ZOE-LOOK: side-by-side sheets of the same pictures in two (or three) sets (docs/lba-maturity/TWINSEN-ZOE-LOOK.md).

  python3 tools/look-sheet.py <out.png> <scale> <set dir>... -- <picture name>...
      one row per picture name, one column per set (labelled by the set's folder name), each crop scaled by <scale>
      with nearest-neighbour (so the game's own pixels show); a picture missing in a set is left blank.
  python3 tools/look-sheet.py --strip <out.png> <scale> <set dir>... -- <prefix>
      the walk frames <prefix>-0 … -5 in a row per set (motion).
A reference picture (the original game, the box art) may be given as a set for a scratch sheet; such sheets must not be
committed (no LBA1/LBA2 pictures in the repository).
"""
import os
import sys
from PIL import Image, ImageDraw

args = sys.argv[1:]
strip = args[0] == '--strip'
if strip:
    args = args[1:]
out, scale = args[0], float(args[1])
k = args.index('--')
sets, names = args[2:k], args[k + 1:]


def load(d, n):
    for ext in ('.png', '.jpg'):
        p = os.path.join(d, n + ext)
        if os.path.exists(p):
            im = Image.open(p).convert('RGB')
            return im.resize((round(im.width * scale), round(im.height * scale)), Image.NEAREST)
    return None


if strip:
    rows = [[load(s, f'{names[0]}-walk-{i}') for i in range(6)] for s in sets]
    labels = [os.path.basename(os.path.normpath(s)) for s in sets]
else:
    rows = [[load(s, n) for s in sets] for n in names]
    labels = names
cw = max((im.width for r in rows for im in r if im), default=10)
ch = max((im.height for r in rows for im in r if im), default=10)
head = 22
ncol = max(len(r) for r in rows)
sheet = Image.new('RGB', (ncol * (cw + 6) + 6, len(rows) * (ch + head + 6) + head + 6), (34, 36, 40))
d = ImageDraw.Draw(sheet)
cols = [f'frame {i}' for i in range(6)] if strip else [os.path.basename(os.path.normpath(s)) for s in sets]
for j, c in enumerate(cols):
    d.text((6 + j * (cw + 6) + 4, 4), c, fill=(235, 235, 235))
for i, r in enumerate(rows):
    y = head + 6 + i * (ch + head + 6)
    d.text((10, y + 2), labels[i], fill=(200, 210, 120))
    for j, im in enumerate(r):
        if im:
            sheet.paste(im, (6 + j * (cw + 6) + (cw - im.width) // 2, y + head + (ch - im.height) // 2))
sheet.save(out, optimize=True)
print(out, sheet.size)
