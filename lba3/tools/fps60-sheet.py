# FPS60-AUTO (P137): the picture sheet of Auto's seven profiles — captures/fps60-auto/step-<n>-<id>.png (made by
# `SERVE=1 ONLY=S node tests/fps60-auto.mjs`) side by side, each with a 2x inset of the same spot (the middle of the
# view: Twinsen and the street behind him), into captures/fps60-auto/steps.png.
#   python3 tools/fps60-sheet.py
import json, os
from PIL import Image, ImageDraw, ImageFont

D = os.path.join(os.path.dirname(__file__), '..', 'captures', 'fps60-auto')
shots = json.load(open(os.path.join(D, 'steps.json')))
W, H = 640, 360          # each picture, scaled from the 960x540 capture
IW, IH = 300, 170        # the inset: a 150x85 crop of the capture at the view's middle, 2x
font = None
for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf']:
    if os.path.exists(f): font = ImageFont.truetype(f, 18); small = ImageFont.truetype(f, 14); break
if font is None: font = small = ImageFont.load_default()
cols, pad, head = 2, 12, 56
rows = (len(shots) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (W + pad) + pad, rows * (H + head + pad) + pad + 40), (24, 24, 28))
d = ImageDraw.Draw(sheet)
d.text((pad, 10), 'Auto quality steps (P137), best first. Same frame of the Citadel street, play camera. SwiftShader, dPR 1, 960x540 (the UHD 620 laptop draws each 1.25x sharper). Inset: middle of the view, 2x.', fill=(230, 230, 230), font=small)
for i, s in enumerate(shots):
    im = Image.open(s['file'] if os.path.isabs(s['file']) else os.path.join(D, os.path.basename(s['file']))).convert('RGB')
    cw, ch = im.size
    x0 = pad + (i % cols) * (W + pad); y0 = 40 + pad + (i // cols) * (H + head + pad)
    sheet.paste(im.resize((W, H), Image.LANCZOS), (x0, y0 + head))
    cx, cy = cw // 2, int(ch * 0.55)
    crop = im.crop((cx - IW // 4, cy - IH // 4, cx + IW // 4, cy + IH // 4)).resize((IW, IH), Image.NEAREST)
    sheet.paste(crop, (x0 + W - IW - 4, y0 + head + H - IH - 4))
    d.rectangle((x0 + W - IW - 5, y0 + head + H - IH - 5, x0 + W - 4, y0 + head + H - 4), outline=(255, 210, 80))
    d.text((x0, y0 + 4), f"{s['p'] + 1}. {s['label']}", fill=(255, 255, 255), font=font)
    d.text((x0, y0 + 28), f"pixel ratio {s['pr']} · shadows {'on' if s['shadows'] else 'off'} · MSAA {s['msaa']}x · {s['lamps']} lamps", fill=(190, 190, 190), font=small)
out = os.path.join(D, 'steps.png')
sheet.save(out, optimize=True)
print('wrote', out, sheet.size)
