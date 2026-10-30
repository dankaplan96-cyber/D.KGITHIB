# RENDER-INV: pixel difference between two capture folders (look.mjs), per view: pixels that differ at all, by more
# than 8 levels in any channel, the largest difference, and a before · after · difference ×6 strip (JPEG).
#   python3 lookdiff.py BEFORE_DIR AFTER_DIR OUT_DIR
import sys, os
from PIL import Image, ImageChops
a_dir, b_dir, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
for f in sorted(os.listdir(a_dir)):
    if not f.endswith('.png') or not os.path.exists(os.path.join(b_dir, f)):
        continue
    A = Image.open(os.path.join(a_dir, f)).convert('RGB'); B = Image.open(os.path.join(b_dir, f)).convert('RGB')
    D = ImageChops.difference(A, B)
    px = D.getdata(); n = len(px)
    any_ = sum(1 for p in px if max(p) > 0); big = sum(1 for p in px if max(p) > 8); mx = max(max(p) for p in px)
    print(f'{f:28s} differing {100 * any_ / n:6.3f} %  > 8 levels {100 * big / n:6.3f} %  max {mx}')
    w, h = A.size
    strip = Image.new('RGB', (w * 3, h)); strip.paste(A, (0, 0)); strip.paste(B, (w, 0)); strip.paste(D.point(lambda v: min(255, v * 6)), (w * 2, 0))
    strip.resize((w * 3 // 2, h // 2)).save(os.path.join(out, f.replace('.png', '-cmp.jpg')), quality=85)
