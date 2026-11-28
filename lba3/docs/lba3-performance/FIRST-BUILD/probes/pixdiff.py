# FIRST-BUILD: pixels that differ between two PNGs of the same size (any channel), the largest difference, and a
# difference mask (red where they differ) when a third path is given.   python3 pixdiff.py a.png b.png [mask.png]
import sys
from PIL import Image, ImageChops
a = Image.open(sys.argv[1]).convert('RGB'); b = Image.open(sys.argv[2]).convert('RGB')
if a.size != b.size: print('sizes differ', a.size, b.size); sys.exit(1)
d = ImageChops.difference(a, b)
px = d.load(); w, h = d.size; n = 0; mx = 0
mask = Image.new('RGB', d.size) if len(sys.argv) > 3 else None
for y in range(h):
    for x in range(w):
        p = px[x, y]; m = max(p)
        if m:
            n += 1; mx = max(mx, m)
            if mask: mask.putpixel((x, y), (255, 0, 0))
print(f'{n} of {w * h} pixels differ ({100 * n / (w * h):.3f} %), largest difference {mx}')
# EXCLUDE='x0,y0,x1,y1;…' (env): also the count outside those boxes (the animated people, which differ between two runs
# of the same build: their animation follows the clock)
import os
if os.environ.get('EXCLUDE'):
    boxes = [tuple(int(v) for v in b.split(',')) for b in os.environ['EXCLUDE'].split(';')]
    out = sum(1 for y in range(h) for x in range(w) if max(px[x, y]) and not any(b[0] <= x <= b[2] and b[1] <= y <= b[3] for b in boxes))
    print(f'outside the excluded boxes {boxes}: {out} pixels differ')
if mask: mask.save(sys.argv[3])
