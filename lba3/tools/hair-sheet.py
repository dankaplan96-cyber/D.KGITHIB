"""HAIR-EDGE (P106): sheets of Twinsen's hair from behind, the current look against the options, from the pictures
tests/twinsen-back-look.mjs takes (one folder a look, each with meta.json; docs/lba-maturity/TWINSEN-ZOE-LOOK.md).

  python3 tools/hair-sheet.py still <out.png> <scene,scene…> <cfg,cfg…> <look dir>…
      one block a scene (e.g. house-far), one row a render setting (1:msaa, 0.7:off …), one column a look: each cell
      the head at the game's own pixels (left) and the same ×3 nearest-neighbour (right)
  python3 tools/hair-sheet.py walk <out.png> <scene> <cfg,cfg…> <look dir>…
      the six walk frames 0.1 s apart (×3), one row a look and render setting
  python3 tools/hair-sheet.py zoom <out.png> <picture,picture…> - <look dir>…
      the named pictures (e.g. yard-medium-walk-2) cut close round the head, ×8: one row a picture, one column a look
  python3 tools/hair-sheet.py edge <scene,…> <cfg,…> <look dir>…
      prints a number a picture: the hair's edge contrast (see edge())
A cell is cut round his head as meta.json places it (the head bone's screen point), the same box for every look.
"""
import json
import os
import sys
from PIL import Image, ImageDraw


def cfg_name(name, cfg):
    sc, aa = cfg.split(':')
    return name if (float(sc) == 1 and aa == 'msaa') else f'{name}@{sc}{aa}'


def head_crop(d, name, size):
    meta = json.load(open(os.path.join(d, 'meta.json')))
    m = meta['shots'].get(name)
    p = os.path.join(d, name + '.png')
    if not m or not os.path.exists(p):
        return None
    im = Image.open(p).convert('RGB')
    hx, hy = m['head'][0] - m['clip']['x'], m['head'][1] - m['clip']['y']
    x0, y0 = round(hx - size / 2), round(hy - size * 0.42)
    return im.crop((x0, y0, x0 + size, y0 + size))


def label(d):
    return os.path.basename(os.path.normpath(d)).replace('+', ',')


def edge(im):
    # the mean of the strongest 3 % of the luminance steps between neighbouring pixels in the crop's middle (the hair,
    # its edge on the skull and the skull's on the background): lower is a softer, less stair-stepped edge
    w, h = im.size
    L = [[0.299 * r + 0.587 * g + 0.114 * b for (r, g, b) in [im.getpixel((x, y)) for x in range(w)]] for y in range(h)]
    steps = []
    for y in range(h // 6, h - h // 6):
        for x in range(w // 6, w - w // 6):
            steps.append(max(abs(L[y][x] - L[y][x + 1]), abs(L[y][x] - L[y + 1][x])))
    steps.sort(reverse=True)
    top = steps[:max(1, len(steps) * 3 // 100)]
    return sum(top) / len(top)


def size_for(scene):
    return 40 if scene.endswith('far') else 52


mode, args = sys.argv[1], sys.argv[2:]
if mode == 'edge':
    scenes, cfgs, looks = args[0].split(','), args[1].split(','), args[2:]
    for s in scenes:
        for c in cfgs:
            row = []
            for d in looks:
                vals = []
                for n in [f'{s}-still'] + [f'{s}-walk-{i}' for i in range(6)]:
                    im = head_crop(d, cfg_name(n, c), size_for(s))
                    if im:
                        vals.append(edge(im))
                row.append(f'{label(d)} {sum(vals) / len(vals):.1f}' if vals else f'{label(d)} -')
            print(s, c, ' | '.join(row))
    sys.exit(0)

if mode == 'zoom':
    out, names, looks = args[0], args[1].split(','), args[3:]
    cw, ch, Z = 44, 40, 8
    sheet = Image.new('RGB', (len(looks) * (cw * Z + 8) + 8, len(names) * (ch * Z + 24) + 24), (34, 36, 40))
    dr = ImageDraw.Draw(sheet)
    for j, d in enumerate(looks):
        dr.text((8 + j * (cw * Z + 8), 6), label(d), fill=(235, 235, 235))
    for i, n in enumerate(names):
        y = 24 + i * (ch * Z + 24)
        dr.text((8, y), n, fill=(200, 210, 120))
        for j, d in enumerate(looks):
            m = json.load(open(os.path.join(d, 'meta.json')))['shots'].get(n)
            p = os.path.join(d, n + '.png')
            if not m or not os.path.exists(p):
                continue
            hx, hy = m['head'][0] - m['clip']['x'], m['head'][1] - m['clip']['y']
            im = Image.open(p).convert('RGB').crop((hx - 22, hy - 26, hx + 22, hy + 14))
            sheet.paste(im.resize((cw * Z, ch * Z), Image.NEAREST), (8 + j * (cw * Z + 8), y + 14))
    sheet.save(out, optimize=True)
    print(out, sheet.size)
    sys.exit(0)

out, scenes, cfgs, looks = args[0], args[1].split(','), args[2].split(','), args[3:]
K = 3
cells = []   # rows of (title, [images])
if mode == 'still':
    for s in scenes:
        for c in cfgs:
            cells.append((f'{s}  scale {c.replace(":", "  ")}', [head_crop(d, cfg_name(f'{s}-still', c), size_for(s)) for d in looks], [label(d) for d in looks]))
else:
    s = scenes[0]
    for d in looks:
        for c in cfgs:
            cells.append((f'{label(d)}  {s}  scale {c.replace(":", "  ")}', [head_crop(d, cfg_name(f'{s}-walk-{i}', c), size_for(s)) for i in range(6)], [f'frame {i}' for i in range(6)]))
sz = max(im.width for _, r, _ in cells for im in r if im)
cw = sz + 4 + sz * K if mode == 'still' else sz * K
ncol = max(len(r) for _, r, _ in cells)
head = 16
sheet = Image.new('RGB', (ncol * (cw + 8) + 8, len(cells) * (sz * K + 2 * head + 8) + 8), (34, 36, 40))
dr = ImageDraw.Draw(sheet)
for i, (title, row, names) in enumerate(cells):
    y = 8 + i * (sz * K + 2 * head + 8)
    dr.text((8, y), title, fill=(200, 210, 120))
    for j, im in enumerate(row):
        x = 8 + j * (cw + 8)
        dr.text((x, y + head), names[j], fill=(235, 235, 235))
        if not im:
            continue
        if mode == 'still':
            sheet.paste(im, (x, y + 2 * head))
            sheet.paste(im.resize((sz * K, sz * K), Image.NEAREST), (x + sz + 4, y + 2 * head))
        else:
            sheet.paste(im.resize((sz * K, sz * K), Image.NEAREST), (x, y + 2 * head))
sheet.save(out, optimize=True)
print(out, sheet.size)
