# PACE-SIM: compare vigshot.mjs captures, before (A) and after (B): share of pixels differing by more than 8 levels,
# the largest difference, and the red edge sampled at the left edge, 120 px in, and the centre.
#   python3 -I vigdiff.py /dev/shm/vs-base /dev/shm/vs-cand
import sys
from PIL import Image, ImageChops
A, B = sys.argv[1], sys.argv[2]
for ms in [0, 100, 200, 350, 500]:
    a = Image.open(f'{A}-{ms}.png').convert('RGB'); b = Image.open(f'{B}-{ms}.png').convert('RGB')
    h = ImageChops.difference(a, b).convert('L').histogram(); n = sum(h)
    over8 = sum(h[9:]) / n * 100; mx = max(i for i, v in enumerate(h) if v); mean = sum(i * v for i, v in enumerate(h)) / n
    y = a.size[1] // 2
    print(f'{ms:3d} ms: differ >8 levels {over8:.1f} % · max {mx} · mean {mean:.2f} · edge {a.getpixel((5, y))} → {b.getpixel((5, y))} · 120 px in {a.getpixel((120, y))} → {b.getpixel((120, y))} · centre {a.getpixel((a.size[0] // 2, y))} → {b.getpixel((b.size[0] // 2, y))}')
