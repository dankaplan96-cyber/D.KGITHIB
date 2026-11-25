"""P127: the before/after sheet of the crew's look, and the notebook-narration sheet (English, Hebrew).
   python3 tools/p127-sheet.py <shots dir> <out dir>   (shots from tools/p127-shots.mjs, tags before / after)"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
W, H, PAD, HEAD = 800, 450, 10, 30
try:
    FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 17)
except OSError:
    FONT = ImageFont.load_default()


def sheet(rows, cols, title, out):
    img = Image.new('RGB', (PAD + len(cols) * (W + PAD), HEAD + PAD + len(rows) * (H + HEAD + PAD)), (24, 24, 24))
    d = ImageDraw.Draw(img)
    d.text((PAD, 6), title, fill=(255, 255, 255), font=FONT)
    for r, (row, label) in enumerate(rows):
        y = HEAD + PAD + r * (H + HEAD + PAD)
        for c, (col, clabel) in enumerate(cols):
            x = PAD + c * (W + PAD)
            f = os.path.join(SRC, f'{col}-{row}.jpg')
            d.text((x, y + 5), f'{clabel}: {label}', fill=(255, 224, 112), font=FONT)
            if os.path.exists(f):
                img.paste(Image.open(f).convert('RGB').resize((W, H), Image.LANCZOS), (x, y + HEAD))
    img.save(out, quality=88)
    print('wrote', out)


cols = [('before', 'before (teal crew tunic)'), ('after', 'after (P127: overalls, hi-vis vest)')]
sheet([('op18', 'opening, harbour, old 18 s'), ('op26', 'opening, harbour, old 26 s')], cols,
      'P127 the Joint Project crew in the opening (notebook cut; SwiftShader, automated)', os.path.join(OUT, 'crew-opening-before-after.jpg'))
sheet([('pier', 'chapter 1, the pier worker (play camera)'), ('dig', "chapter 4, the dig's crew (play camera)")], cols,
      'P127 the Joint Project crew in play (SwiftShader, automated)', os.path.join(OUT, 'crew-play-before-after.jpg'))
sheet([('nb-en', 'notebook, Arthur reads (English)'), ('nb-he', 'notebook, Arthur reads (Hebrew)')], [('after', 'P127')],
      "P127 Arthur's narration over the notebook (SwiftShader, automated)", os.path.join(OUT, 'notebook-arthur-en-he.jpg'))
