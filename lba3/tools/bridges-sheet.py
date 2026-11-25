"""BRIDGES: one sheet of the pictures of tests/bridges-walk.mjs (SHOTS=captures/bridges): Twinsen stopped mid-span on
   each plank bridge, the play camera (Follow), and any other picture in the folder, two to a row, named.
   python3 tools/bridges-sheet.py [captures/bridges]   → captures/bridges/sheet.png
   Automated runtime only (SwiftShader, headless Chromium)."""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'captures', 'bridges')
W, H, PAD, HEAD = 640, 360, 10, 26
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
except OSError:
    FONT = ImageFont.load_default()
files = sorted(f for f in os.listdir(SRC) if f.endswith('.png') and f != 'sheet.png')
rows = (len(files) + 1) // 2
img = Image.new('RGB', (PAD + 2 * (W + PAD), HEAD + PAD + rows * (H + HEAD + PAD)), (24, 24, 24))
d = ImageDraw.Draw(img)
d.text((PAD, 5), 'BRIDGES: Twinsen on each plank bridge, the play camera. Automated runtime only (SwiftShader)', fill=(255, 255, 255), font=FONT)
for i, f in enumerate(files):
    x, y = PAD + (i % 2) * (W + PAD), HEAD + PAD + (i // 2) * (H + HEAD + PAD)
    d.text((x, y + 4), f[:-4], fill=(255, 224, 112), font=FONT)
    img.paste(Image.open(os.path.join(SRC, f)).convert('RGB').resize((W, H), Image.LANCZOS), (x, y + HEAD))
img.save(os.path.join(SRC, 'sheet.png'), optimize=True)
print('wrote', os.path.join(SRC, 'sheet.png'), len(files), 'pictures')
