"""WAVE 5: one sheet of the pictures tests/wave5.mjs writes (SHOTS=captures/wave5): before/after pairs side by side,
   after-only states on their own row.   python3 tools/wave5-sheet.py [captures/wave5]   → <dir>/sheet.png
   Automated runtime only (SwiftShader, headless Chromium)."""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'captures', 'wave5')
W, H, PAD, HEAD = 640, 360, 10, 28
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
except OSError:
    FONT = ImageFont.load_default()

ROWS = [
    ('wave5-01-stake', 'H-14 one of Ilka\'s three survey stakes (by the oasis), before / after'),
    ('wave5-02-stake-flag-lifts', 'H-14 a stake\'s little flag lifted in the warm air (the watch\'s answer)'),
    ('wave5-03-holomap-hums', 'H-14 Ilka\'s map on the holomap: the planet inset rings where a crystal still hums'),
    ('wave5-04-tin-desert', 'H-12 Baldino\'s tin on its rock stack by the School of Magic (Desert Island), before / after'),
    ('wave5-05-tin-citadel', 'H-12 the Citadel stack, under the Whispering Cliffs, before / after'),
    ('wave5-06-tin-hamalayi', 'H-12 the Hamalayi stack, under Lhar\'s frozen falls, before / after'),
    ('wave5-07-nell-list', 'H-12 Nell\'s chalk list at her bench\'s end (Citadel lane), before / after'),
    ('wave5-08-cistern', 'H-13 the monastery yard: the cistern head, its basin on the arm, the bucket, before / after'),
    ('wave5-09-cistern-open', 'H-13 the basin full: the door up, the seed store and the tea urn'),
    ('wave5-10-seam', 'H-13 Under Celebration: the old frame of loose stones beside the old adit, before / after'),
    ('wave5-11-seam-lit', 'H-13 the same with the lantern lit: the glint in the crack'),
]
have = [(r, l) for r, l in ROWS if any(os.path.exists(os.path.join(SRC, f'{r}{s}.png')) for s in ('', '-before', '-after'))]
img = Image.new('RGB', (PAD + 2 * (W + PAD), HEAD + PAD + len(have) * (H + HEAD + PAD)), (24, 24, 24))
d = ImageDraw.Draw(img)
d.text((PAD, 6), 'WAVE 5 (H-12, H-13, H-14): the play camera (Follow, Far), 960x540. Automated runtime only (SwiftShader)', fill=(255, 255, 255), font=FONT)
for i, (row, label) in enumerate(have):
    y = HEAD + PAD + i * (H + HEAD + PAD)
    d.text((PAD, y + 5), label, fill=(255, 224, 112), font=FONT)
    cells = [f'{row}-before.png', f'{row}-after.png'] if os.path.exists(os.path.join(SRC, f'{row}-after.png')) else [f'{row}.png']
    for c, name in enumerate(cells):
        f = os.path.join(SRC, name)
        if os.path.exists(f):
            img.paste(Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS), (PAD + c * (W + PAD), y + HEAD))
            d.text((PAD + c * (W + PAD) + 6, y + HEAD + 4), 'before' if 'before' in name else 'after' if 'after' in name else '', fill=(255, 255, 255), font=FONT)
out = os.path.join(SRC, 'sheet.png')
img.save(out)
print('wrote', out, len(have), 'rows')
