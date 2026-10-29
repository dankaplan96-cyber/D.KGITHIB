# PERF-CPU: the region where two screenshots differ, side by side (off · on · where), for a person to look at.
#   python3 -I crop.py off.png on.png diff.png out.png
import sys
from PIL import Image

b = Image.open(sys.argv[1]).convert('RGB')
a = Image.open(sys.argv[2]).convert('RGB')
d = Image.open(sys.argv[3]).convert('L')
bb = d.getbbox()
print('differing box', bb)
if bb:
    x0, y0, x1, y1 = bb
    x0, y0, x1, y1 = max(0, x0 - 40), max(0, y0 - 40), min(a.width, x1 + 40), min(a.height, y1 + 40)
    w, h = x1 - x0, y1 - y0
    out = Image.new('RGB', (w * 3, h))
    out.paste(b.crop((x0, y0, x1, y1)), (0, 0))
    out.paste(a.crop((x0, y0, x1, y1)), (w, 0))
    out.paste(d.crop((x0, y0, x1, y1)).convert('RGB'), (2 * w, 0))
    out.save(sys.argv[4])
    print(out.size)
