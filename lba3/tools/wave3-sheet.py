"""WAVE 3: one sheet of the before/after pictures (tools/wave3-shots.mjs, captures/wave3/<before|after>-<view>.png).
   python3 tools/wave3-sheet.py [captures/wave3]   → captures/wave3/wave3-sheet.jpg
   Each row: the place before the wave and after it (an after-only state gets its own row, beside an empty cell).
   Automated runtime only (SwiftShader, headless Chromium)."""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'captures', 'wave3')
W, H, PAD, HEAD = 640, 360, 10, 28
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
except OSError:
    FONT = ImageFont.load_default()

ROWS = [
    ('h6-westpost', "H-6 Zeelich's west end: the dark post (Mr Pelleck's) and its new capped riser"),
    ('h6-westpost-lit', 'H-6 the same, the cap opened: the post lit'),
    ('h6-store', "H-6 the depot yard: the store's door gets a motor shutter (PROJECT STORES)"),
    ('h6-store-open', 'H-6 the shutter up after the pulse tool: the store inside (painted, look-in)'),
    ('h7-ledges', "H-7 Lhar's north cliff by the icefall: six goats' ledges"),
    ('h7-rope', "H-7 the same once Pim has told the way: the rope, tied"),
    ('h8-yard', "H-8 Otringal, the barges' yard: a davit, a mooring rock with an Esmer arch, a davit across"),
    ('h8-quay', 'H-8 Otringal, the west quay: the same, to the dock worker\'s house'),
    ('h8-honey', "H-8 Mosquibee's plank bridge: a davit at each end, an arch on its middle plank"),
    ('h8-gorge', "H-8 the Hamalayi gorge by the tree bridge: a rock stack, an ice arch with two rings, a chest"),
]
img = Image.new('RGB', (PAD + 2 * (W + PAD), HEAD + PAD + len(ROWS) * (H + HEAD + PAD)), (24, 24, 24))
d = ImageDraw.Draw(img)
d.text((PAD, 6), 'WAVE 3 (H-6, H-7, H-8): before / after, the play camera (Follow, Far). Automated runtime only (SwiftShader)', fill=(255, 255, 255), font=FONT)
for r, (row, label) in enumerate(ROWS):
    y = HEAD + PAD + r * (H + HEAD + PAD)
    d.text((PAD, y + 5), label, fill=(255, 224, 112), font=FONT)
    for c, tag in enumerate(['before', 'after']):
        x = PAD + c * (W + PAD)
        f = os.path.join(SRC, f'{tag}-{row}.png')
        if os.path.exists(f):
            img.paste(Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS), (x, y + HEAD))
        else:
            d.text((x + 20, y + HEAD + 20), f'({tag}: none, the state exists only after the wave)', fill=(160, 160, 160), font=FONT)
out = os.path.join(SRC, 'wave3-sheet.jpg')
img.save(out, quality=86)
print('wrote', out)
