# CPU-RELIEF (P137b): the before/after sheet of what CPU-eco changes on screen — captures/cpu-relief/anim.json and
# frames-*.png (made by docs/lba3-performance/CPU-RELIEF/probes/animsheet.mjs) into captures/cpu-relief/sheet.png
# (at most 1300 px wide): a walking person 16-23 m off, 10 consecutive frames (1/60 s each) at Medium-lean (posed every
# frame) and at CPU-eco (posed every other frame there), and the swing of the left hip per frame for both.
#   python3 tools/cpu-relief-sheet.py
import json, os
from PIL import Image, ImageDraw, ImageFont

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'captures', 'cpu-relief')
A = json.load(open(os.path.join(D, 'anim.json')))
V = [('lean', 'Medium-lean (before): posed every frame'), ('loweco', 'CPU-eco (after): posed every other frame at 15-25 m')]
font = small = None
for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf']:
    if os.path.exists(f): font = ImageFont.truetype(f, 16); small = ImageFont.truetype(f, 12); break
if font is None: font = small = ImageFont.load_default()
n = max(len(A['variants'][k]) for k, _ in V)
C, pad, head = 118, 8, 22
W = pad + n * (C + 4) + pad
chartH = 220
H = 48 + len(V) * (head + C + 18 + pad) + chartH + 40
sheet = Image.new('RGB', (W, H), (24, 24, 28)); d = ImageDraw.Draw(sheet)
p = A['person']
d.text((pad, 4), f"CPU-eco (P137b): the one visible change. A walking resident ({p['who']}), ~{p['d']} m from the camera, Citadel street, follow camera.", fill=(235, 235, 235), font=small)
d.text((pad, 20), 'Ten consecutive frames, 1/60 s apart, each crop scaled to the same size. Automated runtime only: SwiftShader, 1280x720, game clock stepped by hand.', fill=(235, 235, 235), font=small)
y = 48
for k, label in V:
    rows = A['variants'][k]
    d.text((pad, y), label, fill=(255, 210, 80), font=font); y += head
    for i, r in enumerate(rows):
        im = Image.open(r['file'] if os.path.isabs(r['file']) else os.path.join(D, os.path.basename(r['file']))).convert('RGB').resize((C, C), Image.LANCZOS)
        x = pad + i * (C + 4); sheet.paste(im, (x, y))
        d.text((x + 2, y + C + 2), f"{i}: hip {r['hip']:+.3f}" + (f" n={r['lodN']}" if r['lodN'] > 1 else ''), fill=(200, 200, 200), font=small)
    y += C + 18 + pad
# the hip's swing per frame, both variants
x0, x1, y0, y1 = pad + 40, W - pad - 10, y + 24, y + chartH - 10
d.text((pad, y), 'Left hip swing (rad) per frame: before changes every frame; after holds every other frame and catches up (the same walk, half the poses).', fill=(235, 235, 235), font=small)
vals = [r['hip'] for k, _ in V for r in A['variants'][k]]
lo, hi = min(vals), max(vals)
if hi - lo < 1e-6: hi = lo + 1
d.rectangle((x0, y0, x1, y1), outline=(90, 90, 90))
cols = {'lean': (120, 190, 255), 'loweco': (255, 150, 90)}
for k, label in V:
    rows = A['variants'][k]
    pts = [(x0 + (x1 - x0) * i / max(1, n - 1), y1 - (y1 - y0) * (r['hip'] - lo) / (hi - lo)) for i, r in enumerate(rows)]
    for a, b in zip(pts, pts[1:]): d.line((a, (b[0], a[1]), b), fill=cols[k], width=2)   # (a step: the pose held until the next)
    for q in pts: d.ellipse((q[0] - 3, q[1] - 3, q[0] + 3, q[1] + 3), fill=cols[k])
    d.text((x1 - 330, y0 + 4 + 16 * (k == 'loweco')), label.split(':')[0], fill=cols[k], font=small)
d.text((pad, y1 + 6), f'{lo:+.2f}', fill=(170, 170, 170), font=small); d.text((pad, y0), f'{hi:+.2f}', fill=(170, 170, 170), font=small)
sheet.save(os.path.join(D, 'sheet.png'))
print('wrote', os.path.join(D, 'sheet.png'), sheet.size)
