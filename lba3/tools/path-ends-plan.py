# P135 PATH-ENDS: a plan picture of each terrain's paving from tests/path-ends.mjs (plan-<area>.json):
# python3 tools/path-ends-plan.py <dir> [scale px/m]  ->  <dir>/plan-<area>.png
# paving grey, its middle lines dark, each strip end a dot (dead red, accepted amber, reached green), each gap a red
# line across it, a 10 m grid labelled
import base64, json, sys, glob, os
from PIL import Image, ImageDraw
D = sys.argv[1]
SC = float(sys.argv[2]) if len(sys.argv) > 2 else 4.0
for f in sorted(glob.glob(os.path.join(D, 'plan-*.json'))):
    P = json.load(open(f))
    W, H, res, X0, Z0 = P['W'], P['H'], P['res'], P['X0'], P['Z0']
    m = base64.b64decode(P['mask'])
    k = SC * res
    im = Image.new('RGB', (int(W * k) + 1, int(H * k) + 1), (236, 228, 208))
    px = im.load()
    for y in range(H):
        for x in range(W):
            v = m[y * W + x]
            if not v: continue
            c = (150, 150, 155) if v == 1 else (60, 60, 70)
            for yy in range(int(y * k), int((y + 1) * k)):
                for xx in range(int(x * k), int((x + 1) * k)):
                    px[xx, yy] = c
    d = ImageDraw.Draw(im)
    gx0 = int(X0 // 10) * 10
    for gx in range(gx0, int(X0 + W * res) + 10, 10):
        u = (gx - X0) / res * k
        d.line([(u, 0), (u, im.height)], fill=(200, 190, 170)); d.text((u + 2, 2), str(gx), fill=(90, 80, 60))
    gz0 = int(Z0 // 10) * 10
    for gz in range(gz0, int(Z0 + H * res) + 10, 10):
        v = (gz - Z0) / res * k
        d.line([(0, v), (im.width, v)], fill=(200, 190, 170)); d.text((2, v + 2), str(gz), fill=(90, 80, 60))
    for e in P['ends']:
        u, v = (e['x'] - X0) / res * k, (e['z'] - Z0) / res * k
        c = (220, 40, 30) if e['dead'] and not e['known'] else (230, 160, 20) if e['dead'] else (40, 160, 60)
        d.ellipse([u - 6, v - 6, u + 6, v + 6], outline=c, width=3)
        if e.get('gap'): d.line([(u, v), ((e['gap'][0] - X0) / res * k, (e['gap'][1] - Z0) / res * k)], fill=c, width=3)
        if e['dead']: d.text((u + 8, v - 6), f"{e['x']:.0f},{e['z']:.0f}", fill=c)
    im.save(f[:-5] + '.png')
    print('plan', f[:-5] + '.png', im.size)
