"""WAVE 8: one sheet of the pictures tests/wave8.mjs writes (SHOTS=captures/wave8): before/after pairs side by side,
   after-only states on their own row.   python3 tools/wave8-sheet.py [captures/wave8]   → <dir>/sheet.png
   Nothing from chapters 15-16 is shown. Automated runtime only (SwiftShader, headless Chromium)."""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'captures', 'wave8')
W, H, PAD, HEAD = 640, 360, 10, 28
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
except OSError:
    FONT = ImageFont.load_default()

ROWS = [
    ('wave8-01-dog', 'H-19 Discreet (Zeelich, behind the houses by the dog yard): the dog asleep on the cellar hatch, before / after'),
    ('wave8-02-dog-awake', 'H-19 the dog woken by a walker: it sits up on the hatch ("!")'),
    ('wave8-03-ledge', 'H-19 Athletic (Desert Island, by the ruins): the flat rock, the gap, the ledge with the satchel and rag, before / after'),
    ('wave8-04-on-ledge', 'H-19 on the ledge after the two jumps'),
    ('wave8-05-arch', 'H-19 Aggressive (the Hamalayi, below Lhar\'s terrace): the bricked-up arch, before / after'),
    ('wave8-06-arch-open', 'H-19 the arch kicked in: the heap of bricks, the old steps'),
    ('wave8-07-grate-open', 'H-19 the grate on Lhar\'s terrace, unbolted (the shortcut\'s top)'),
    ('wave8-08-slate', 'H-19 Normal (Citadel): the slate by the Weather Wizard\'s tent, before / after'),
    ('wave8-09-board-news', 'H-20 the square\'s notice board: the latest news sheet (headlines for deeds done)'),
    ('wave8-10-stall', 'H-20 Otringal\'s unattended stall: the stack of news sheets on its counter, before / after'),
    ('wave8-11-journal-open-favours', 'H-20 the journal\'s "Open favours" (chapter 14: the stories started and not finished)'),
]
have = [(r, l) for r, l in ROWS if any(os.path.exists(os.path.join(SRC, f'{r}{s}.png')) for s in ('', '-before', '-after'))]
img = Image.new('RGB', (PAD + 2 * (W + PAD), HEAD + PAD + len(have) * (H + HEAD + PAD)), (24, 24, 24))
d = ImageDraw.Draw(img)
d.text((PAD, 6), 'WAVE 8 (H-19, H-20): the play camera, 960x540. Automated runtime only (SwiftShader)', fill=(255, 255, 255), font=FONT)
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
