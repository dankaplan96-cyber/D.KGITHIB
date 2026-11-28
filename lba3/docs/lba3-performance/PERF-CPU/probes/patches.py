# PERF-CPU: how many differing pixels (over 8 levels) lie inside a differing 3x3 block — a surface that changed (a
# coincident face drawn in another order) — rather than on a one-pixel line (an edge rasterized a hair differently).
#   python3 -I patches.py a.png b.png
import sys
from PIL import Image, ImageChops, ImageFilter
a = Image.open(sys.argv[1]).convert('RGB'); b = Image.open(sys.argv[2]).convert('RGB')
d = ImageChops.difference(a, b).convert('L').point(lambda v: 255 if v > 8 else 0)
core = d.filter(ImageFilter.MinFilter(3))
n = sum(1 for v in d.getdata() if v); c = sum(1 for v in core.getdata() if v)
print(f'{n} pixels differ by more than 8 levels; {c} of them inside a 3x3 block of differing pixels (a changed surface), bbox {core.getbbox()}')
