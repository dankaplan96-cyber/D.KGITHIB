# PERF-CPU: how many pixels differ between two screenshots, and by how much (max channel difference); optionally writes
# an image of where they differ.   python3 -I diff.py a.png b.png [where.png]
import sys
from PIL import Image, ImageChops

a = Image.open(sys.argv[1]).convert('RGB')
b = Image.open(sys.argv[2]).convert('RGB')
d = ImageChops.difference(a, b)
px = d.load()
w, h = d.size
n = big = 0
mx = 0
for y in range(h):
    for x in range(w):
        r, g, bb = px[x, y]
        m = max(r, g, bb)
        if m:
            n += 1
            mx = max(mx, m)
            if m > 8:
                big += 1
print(f'{n} of {w * h} pixels differ ({100 * n / (w * h):.3f} %), {big} by more than 8 levels, max {mx}')
if len(sys.argv) > 3:
    d.point(lambda v: 255 if v else 0).save(sys.argv[3])
