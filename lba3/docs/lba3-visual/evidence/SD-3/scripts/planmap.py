# python3 planmap.py dump.json out.png x0 x1 z0 z1 [scale]  -- region-local plan view: height shading, steep (red),
# colliders (blue solid / cyan noStand-or-seeThrough), contract spots (yellow), grid every 5 m with labels every 10.
import json, sys, math
from PIL import Image, ImageDraw
d = json.load(open(sys.argv[1]))
x0, x1, z0, z1 = map(float, sys.argv[3:7]); sc = float(sys.argv[7]) if len(sys.argv) > 7 else 8
W, Hh = int((x1 - x0) * sc), int((z1 - z0) * sc)
im = Image.new('RGB', (W, Hh), (0, 0, 0)); dr = ImageDraw.Draw(im)
H, S = d['H'], d['S']
def px(x, z): return ((x - x0) * sc, (z - z0) * sc)
for zi in range(len(H)):
    z = -110 + zi
    if z < z0 - 1 or z > z1 + 1: continue
    for xi in range(len(H[0])):
        x = -110 + xi
        if x < x0 - 1 or x > x1 + 1: continue
        h = H[zi][xi]; s = S[zi][xi]
        g = int(max(0, min(255, 40 + h * 6)))
        col = (g, g, g)
        if s > 1.1: col = (min(255, g + 90), g // 2, g // 2)
        elif s > 0.6: col = (min(255, g + 40), g, g // 2)
        a, b = px(x - 0.5, z - 0.5); c, e = px(x + 0.5, z + 0.5)
        dr.rectangle([a, b, c, e], fill=col)
for gx in range(int(x0 // 5 * 5), int(x1) + 1, 5):
    a, _ = px(gx, 0); dr.line([a, 0, a, Hh], fill=(70, 70, 110) if gx % 10 else (110, 110, 170))
    if gx % 10 == 0: dr.text((a + 2, 2), str(gx), fill=(255, 255, 160))
for gz in range(int(z0 // 5 * 5), int(z1) + 1, 5):
    _, b = px(0, gz); dr.line([0, b, W, b], fill=(70, 70, 110) if gz % 10 else (110, 110, 170))
    if gz % 10 == 0: dr.text((2, b + 2), str(gz), fill=(255, 255, 160))
for c in d['cols']:
    soft = c['noStand'] or c['seeThrough']
    colr = (0, 220, 255) if soft else (60, 120, 255)
    if not c['enabled']: colr = (120, 120, 120)
    if c['type'] == 'cyl':
        a, b = px(c['x'] - c['r'], c['z'] - c['r']); e, f = px(c['x'] + c['r'], c['z'] + c['r'])
        dr.ellipse([a, b, e, f], outline=colr, width=2)
    else:
        cs, sn = math.cos(c['rot']), math.sin(c['rot'])
        pts = []
        for lx, lz in [(-c['hw'], -c['hd']), (c['hw'], -c['hd']), (c['hw'], c['hd']), (-c['hw'], c['hd'])]:
            # physics: local lx = dx*cos - dz*sin ; lz = dx*sin + dz*cos  → world dx = lx*cos + lz*sin, dz = -lx*sin + lz*cos
            pts.append(px(c['x'] + lx * cs + lz * sn, c['z'] - lx * sn + lz * cs))
        dr.polygon(pts, outline=colr, width=2)
for k, v in d['spots'].items():
    if not v: continue
    a, b = px(v['x'], v['z'])
    if a < 0 or b < 0 or a > W or b > Hh: continue
    dr.ellipse([a - 4, b - 4, a + 4, b + 4], fill=(255, 220, 0)); dr.text((a + 5, b - 5), k, fill=(255, 240, 120))
extra = sys.argv[8] if len(sys.argv) > 8 else None
if extra:
    for it in json.load(open(extra)):
        if 'pts' in it:
            dr.line([px(*p) for p in it['pts']], fill=tuple(it.get('c', (0, 255, 0))), width=int(it.get('w', 2) * sc / 2) or 1)
        else:
            a, b = px(it['x'] - it['r'], it['z'] - it['r']); e, f = px(it['x'] + it['r'], it['z'] + it['r'])
            dr.ellipse([a, b, e, f], outline=tuple(it.get('c', (0, 255, 0))), width=2)
            if 'n' in it: dr.text((e, b), it['n'], fill=tuple(it.get('c', (0, 255, 0))))
im.save(sys.argv[2])
