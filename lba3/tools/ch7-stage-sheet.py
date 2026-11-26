"""#18 / #28: one sheet of the pictures tools/ch7-stage-shots.mjs writes: chapter 7's vent seal as it is (the discs) beside
   the new stage (?ch7stage=new, "the mountain's pulse").   python3 tools/ch7-stage-sheet.py [captures/ch7-stage]
   → <dir>/sheet.png. Chapter 7 only. Automated runtime only (SwiftShader, headless Chromium), the play camera."""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'captures', 'ch7-stage')
W, H, PAD, HEAD = 640, 360, 10, 26
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 15)
    BIG = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 17)
except OSError:
    FONT = BIG = ImageFont.load_default()

CELLS = [
    [('old-1-discs', 'NOW (default): five discs, three steaming, two iced over (chapter 4\'s discs again)'),
     ('new-1-ring', '?ch7stage=new, same spot: the seal in a turning ring, an arrow, five grooves')],
    [('new-2b-kick-near', 'new: a kick of the mountain - the live groove\'s stones jump, snow flies'),
     ('new-3-open', 'new: arrow turned to the live groove, the next kick opens the vent')],
]
img = Image.new('RGB', (PAD + 2 * (W + PAD), HEAD + PAD + len(CELLS) * (H + HEAD + PAD)), (24, 24, 24))
d = ImageDraw.Draw(img)
d.text((PAD, 5), "Chapter 7, the vent seal: today's discs and ?ch7stage=new  (automated runtime only, SwiftShader; play camera)", font=BIG, fill=(235, 235, 235))
y = HEAD + PAD
for row in CELLS:
    for c, (name, label) in enumerate(row):
        x = PAD + c * (W + PAD)
        d.text((x, y + 4), label, font=FONT, fill=(220, 220, 200))
        p = os.path.join(SRC, name + '.png')
        if os.path.exists(p):
            img.paste(Image.open(p).convert('RGB').resize((W, H), Image.LANCZOS), (x, y + HEAD))
        else:
            d.text((x + 20, y + HEAD + 20), 'missing: ' + name, font=FONT, fill=(255, 120, 120))
    y += H + HEAD + PAD
img.save(os.path.join(SRC, 'sheet.png'))
print('wrote', os.path.join(SRC, 'sheet.png'))
