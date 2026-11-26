"""FEET-66: one sheet of tests/feet-shots.mjs's pictures (captures/feet-66/raw: before-<id>.png, after-<id>.png and the
   two .json files with the numbers), the play camera (Far). Each spot: its name and numbers, before | after, and under
   them a 3x crop round his feet (the feet's screen point from the .json).
   python3 tools/feet66-sheet.py   → captures/feet-66/sheet.png (1294 px wide)
   Automated runtime only (SwiftShader, headless Chromium)."""
import json
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'captures', 'feet-66', 'raw')
OUT = os.path.join(ROOT, 'captures', 'feet-66', 'sheet.png')
W, H, PAD, HEAD, LINE = 632, 356, 10, 22, 18
CW, CH = 211, 119   # the crop (x3 to W x H)
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
    BIG = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
except OSError:
    FONT = BIG = ImageFont.load_default()
before = {s['id']: s for s in json.load(open(os.path.join(SRC, 'before.json')))}
after = {s['id']: s for s in json.load(open(os.path.join(SRC, 'after.json')))}
ids = [s for s in after if s in before and os.path.exists(os.path.join(SRC, f'before-{s}.png'))]


def num(s):
    t = s.get('top')
    if t is None:
        return 'nothing drawn within 0.7 m over his feet'
    return f'drawn top {abs(t) * 100:.1f} cm {"over" if t >= 0 else "under"} his feet'


ROW = HEAD + LINE * 2 + H + PAD + H + PAD
img = Image.new('RGB', (PAD * 3 + W * 2, 50 + len(ids) * ROW), (24, 24, 24))
d = ImageDraw.Draw(img)
d.text((PAD, 6), 'FEET-66: his feet against the drawn surface he stands on. Before | after, the play camera (Far), a 3x crop', fill=(255, 255, 255), font=BIG)
d.text((PAD, 28), 'Automated runtime only (SwiftShader, headless Chromium). Walked onto each spot by input; numbers from the drawn geometry.', fill=(200, 200, 200), font=FONT)
y = 50
for sid in ids:
    b, a = before[sid], after[sid]
    d.text((PAD, y + 3), f'{sid}: {a["what"]}', fill=(255, 224, 112), font=BIG)
    d.text((PAD, y + HEAD), f'before: feet {b["at"][1]} m, {num(b)}', fill=(230, 160, 160), font=FONT)
    d.text((PAD * 2 + W, y + HEAD), f'after: feet {a["at"][1]} m, {num(a)}', fill=(160, 230, 160), font=FONT)
    yy = y + HEAD + LINE * 2
    for k, (tag, s) in enumerate((('before', b), ('after', a))):
        im = Image.open(os.path.join(SRC, f'{tag}-{sid}.png')).convert('RGB')
        x = PAD + k * (W + PAD)
        img.paste(im.resize((W, H), Image.LANCZOS), (x, yy))
        fx, fy = s['feetPx']
        cx = max(0, min(im.width - CW, fx - CW // 2)); cy = max(0, min(im.height - CH, fy - CH * 2 // 3))
        img.paste(im.crop((cx, cy, cx + CW, cy + CH)).resize((W, H), Image.LANCZOS), (x, yy + H + PAD))
    y += ROW
img.save(OUT, optimize=True)
print('wrote', OUT, len(ids), 'spots', img.size)
