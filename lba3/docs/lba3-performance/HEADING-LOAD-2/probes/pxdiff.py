# HEADING-LOAD-2: differing pixels between two probe images (any channel), and a diff image (differing pixels in red
# over a dimmed copy of the first) when they differ.
#   python3 -I pxdiff.py A.png B.png [diff.png|-] [A2.png]
# A2: a second run of A's build: the pixels where A and B differ but A and A2 agree (A's own run-to-run noise left out)
import sys
import numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.int16)
b = np.asarray(Image.open(sys.argv[2]).convert('RGB')).astype(np.int16)
if a.shape != b.shape:
    print(f'size differs {a.shape} {b.shape}'); sys.exit(1)
d = np.abs(a - b).max(axis=2)
n, n2 = int((d > 0).sum()), int((d > 2).sum())
ys, xs = np.nonzero(d)
box = f' box x {xs.min()}-{xs.max()} y {ys.min()}-{ys.max()}' if n else ''
print(f'{n} px differ ({n2} by more than 2 levels, max {int(d.max())}){box}')
if len(sys.argv) > 4:
    c = np.asarray(Image.open(sys.argv[4]).convert('RGB')).astype(np.int16)
    stable = np.abs(a - c).max(axis=2) == 0
    print(f'   of them where two runs of A agree: {int(((d > 0) & stable).sum())} (A vs A2: {int((~stable).sum())} px differ)')
if n and len(sys.argv) > 3 and sys.argv[3] != '-':
    o = (a * 0.4).astype(np.uint8); o[d > 0] = [255, 0, 0]
    Image.fromarray(o).save(sys.argv[3])
