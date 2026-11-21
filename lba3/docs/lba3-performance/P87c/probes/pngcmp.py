# P87c: compare the slate / sand canvases written by run_ow.mjs (OUT=dir) for two runs, pixel by pixel.
#   python3 pngcmp.py DIR_A DIR_B
import sys, os
from PIL import Image, ImageChops
a, b = sys.argv[1], sys.argv[2]
for n in sorted(os.listdir(a)):
    if not n.endswith('.png'): continue
    A = Image.open(os.path.join(a, n)).convert('RGBA'); B = Image.open(os.path.join(b, n)).convert('RGBA')
    box = ImageChops.difference(A, B).getbbox() if A.size == B.size else 'size'
    print(f"{n:16} {A.size[0]}x{A.size[1]}  {'pixel-identical' if box is None else 'DIFFERENT ' + str(box)}")
