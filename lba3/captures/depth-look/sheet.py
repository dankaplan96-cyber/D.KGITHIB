"""DEPTH-LOOK contact sheets. usage: python3 -I sheet.py ROOT OUTDIR
ROOT holds base/ and c-<cand>/ capture folders; writes sheet.png (High 1366), sheet-medium.png, close-ups, and jpgs."""
import sys, os
from PIL import Image, ImageDraw, ImageFont
ROOT, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
PLACES = ['fortwall', 'square', 'harbour', 'house', 'zeelich', 'desert', 'lhar', 'island']
COLS = [('today', 'base'), ('a relief', 'c-relief'), ('b light', 'c-light'), ('c contact', 'c-contact'), ('d rim', 'c-rim'), ('e paint', 'c-paint'), ('f wallnormals=all', 'c-wnall'), ('preset a-e', 'c-preset')]
COLS_M = [('today', 'base'), ('a relief', 'c-relief'), ('preset a-e', 'c-preset')]
try:
    F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 18)
except Exception:
    F = ImageFont.load_default()
def grid(rows, cols, get, tw, th, path, title):
    pad, lab, head = 4, 110, 34
    W = lab + len(cols) * (tw + pad); H = head + 28 + len(rows) * (th + pad)
    S = Image.new('RGB', (W, H), (24, 24, 28)); d = ImageDraw.Draw(S)
    d.text((8, 6), title, fill=(240, 240, 240), font=F)
    for j, (cl, _) in enumerate(cols): d.text((lab + j * (tw + pad) + 6, head + 4), cl, fill=(255, 220, 120), font=F)
    for i, r in enumerate(rows):
        y = head + 28 + i * (th + pad)
        d.text((6, y + th // 2 - 10), r, fill=(240, 240, 240), font=F)
        for j, (_, folder) in enumerate(cols):
            p = get(r, folder)
            if p and os.path.exists(p):
                im = Image.open(p).convert('RGB').resize((tw, th), Image.LANCZOS); S.paste(im, (lab + j * (tw + pad), y))
            else:
                d.text((lab + j * (tw + pad) + 10, y + 10), 'missing', fill=(200, 80, 80), font=F)
    (S.save(path, quality=88) if path.endswith('.jpg') else S.save(path, optimize=True)); print('wrote', path, S.size)
for q, cols in (('high', COLS), ('medium', COLS_M)):
    grid(PLACES, cols, lambda r, f: os.path.join(ROOT, f, f'{r}-{q}-1366x768.png'), 340, 191,
         os.path.join(OUT, 'sheet.png' if q == 'high' else 'sheet-medium.png'),
         f'DEPTH-LOOK: the play camera (Follow, Far), {q.capitalize()} preset, 1366x768. Automated runtime only (SwiftShader). Columns: ?depth= switch (f: ?wallnormals=all)')
grid(PLACES, [('today (Near camera)', 'base-near'), ('preset (Near camera)', 'c-preset')], lambda r, f: os.path.join(ROOT, f, f'{r}-near-high-1366x768.png'), 683, 384,
     os.path.join(OUT, 'closeups.jpg'), 'DEPTH-LOOK: close-up per region (Follow, Near), High, today vs ?depth=preset. Automated runtime only (SwiftShader)')

# the user's spot as the user looks (portrait, 412x892 CSS at 2.625 = 1081x2341), today | preset
a = os.path.join(ROOT, 'portrait', 'fortwall-high-412x892.png'); b = os.path.join(ROOT, 'portrait-preset', 'fortwall-high-412x892.png')
if os.path.exists(a) and os.path.exists(b):
    A = Image.open(a).convert('RGB'); B = Image.open(b).convert('RGB'); w, h = A.size
    S = Image.new('RGB', (w * 2 + 8, h + 40), (24, 24, 28)); S.paste(A, (0, 40)); S.paste(B, (w + 8, 40)); d = ImageDraw.Draw(S)
    d.text((10, 8), 'today (High, portrait)', fill=(255, 220, 120), font=F); d.text((w + 18, 8), '?depth=preset', fill=(255, 220, 120), font=F)
    S.resize((S.width // 2, S.height // 2), Image.LANCZOS).save(os.path.join(OUT, 'fortwall-portrait-today-preset.jpg'), quality=88); print('portrait done')

# the user's spot first: the fort wall in shade, cropped from the play camera (High 1366), every column
tiles = []
for cl, f in COLS:
    p = os.path.join(ROOT, f, 'fortwall-high-1366x768.png')
    if os.path.exists(p): tiles.append((cl, Image.open(p).convert('RGB').crop((250, 140, 960, 480)).resize((568, 272), Image.LANCZOS)))
if tiles:
    cols = 4; rows = (len(tiles) + cols - 1) // cols
    S = Image.new('RGB', (cols * 572, 40 + rows * 304), (24, 24, 28)); d = ImageDraw.Draw(S)
    d.text((8, 8), "The user's spot: the fort wall by the flight, in shade (play camera, High, 1366x768, cropped). Automated runtime only", fill=(240, 240, 240), font=F)
    for i, (cl, im) in enumerate(tiles):
        x, y = (i % cols) * 572, 40 + (i // cols) * 304
        S.paste(im, (x, y + 28)); d.text((x + 6, y + 4), cl, fill=(255, 220, 120), font=F)
    S.save(os.path.join(OUT, 'fortwall-candidates.jpg'), quality=90); print('fortwall strip done')
