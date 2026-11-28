"""H-15 (the Francos' dig): one sheet of tests/francos.mjs's pictures (SHOTS=captures/francos).
   python3 tools/francos-sheet.py [captures/francos]   → captures/francos/sheet.png
   Each row: before / after (the same frame with the quest's pieces hidden), or one picture of a moment.
   Automated runtime only (SwiftShader, headless Chromium)."""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'captures', 'francos')
W, H, PAD, HEAD = 640, 360, 10, 28
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
except OSError:
    FONT = ImageFont.load_default()

ROWS = [
    ('francos-01-dig', 'pair', "Knartas, the slope below the gold dome: the diggers' holes, Mott, Gubb at the wall, Pella, Tuffo"),
    ('francos-02-found-box', 'one', 'Dug where the needle spun: the found box, the Great Waker (a tin alarm clock)'),
    ('francos-03-found', 'pair', 'The tin box in its hole, the four diggers gathered round it'),
    ('francos-04-ring', 'one', 'Wound, it rings: the four jump and cheer'),
    ('francos-05-shrine', 'pair', 'After: the shrine where it slept (the clock on top); Gubb on the Founder\'s Seat'),
    ('francos-06-gubb-seat', 'one', 'After: Gubb sits on the Founder\'s Seat; the shrine in the gully'),
]
img = Image.new('RGB', (PAD + 2 * (W + PAD), HEAD + PAD + len(ROWS) * (H + HEAD + PAD)), (24, 24, 24))
d = ImageDraw.Draw(img)
d.text((PAD, 6), "H-15 The Francos' dig: before / after, the play camera (Follow, Far). Automated runtime only (SwiftShader)", fill=(255, 255, 255), font=FONT)
for r, (row, kind, label) in enumerate(ROWS):
    y = HEAD + PAD + r * (H + HEAD + PAD)
    d.text((PAD, y + 5), label, fill=(255, 224, 112), font=FONT)
    files = [f'{row}-before.png', f'{row}-after.png'] if kind == 'pair' else [f'{row}.png']
    for c, name in enumerate(files):
        f = os.path.join(SRC, name)
        if os.path.exists(f):
            img.paste(Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS), (PAD + c * (W + PAD), y + HEAD))
            if kind == 'pair':
                d.text((PAD + c * (W + PAD) + 8, y + HEAD + 6), 'before' if c == 0 else 'after', fill=(255, 255, 255), font=FONT)
img.save(os.path.join(SRC, 'sheet.png'))
print('wrote', os.path.join(SRC, 'sheet.png'))
