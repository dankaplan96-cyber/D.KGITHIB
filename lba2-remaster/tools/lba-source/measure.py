#!/usr/bin/env python3
# Measurements of one original LBA2 body (numbers only), for rebuilding it in our own pipeline.
#
#   python3 -I tools/lba-source/measure.py --lba2 <folder> --body N [--H 1238] [--sections 0.02] [--clips 207,208]
#
# Prints, in fractions of H (the height to the top of the skull) and in the model's axes (+y up, +z its front,
# +x its left):
#   groups    each group (bone): parent, pivot, extent of its points, its polygons' colours
#   colours   each colour byte used: kind (polygon type), count, palette RGB of the entry and of its ramp (0, 4, 8, 12)
#   spheres   centre, radius, colour;  lines: end points, colour
#   sections  every --sections step of height: half-width, front, back of the polygons cut there, per colour
#   clips     for each ANIM.HQR clip: keys, loop key, times (ms), root steps, the largest rotation per group (deg)
import argparse
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lbadata as L  # noqa: E402

ap = argparse.ArgumentParser()
ap.add_argument('--lba2', required=True)
ap.add_argument('--body', type=int, required=True)
ap.add_argument('--H', type=float, default=1238)
ap.add_argument('--sections', type=float, default=0.024)
ap.add_argument('--clips', default='')
ap.add_argument('--groups', default='', help='only these groups in the sections (comma list)')
a = ap.parse_args()
H = a.H
pal = L.hqr(os.path.join(a.lba2, 'SCREEN.HQR'))[5]
B = L.body2(L.hqr(os.path.join(a.lba2, 'BODY.HQR'))[a.body])
W, _ = L.pose2(B)
own = L.owners(B)
f = lambda v: '%6.3f' % (v / H)
rgb = lambda i: '#%02x%02x%02x' % tuple(pal[i * 3:i * 3 + 3])

print('body %d: %d groups, %d points, %d polygons, %d spheres, %d lines, %d textures; ZV %s' % (
    a.body, len(B['groups']), len(B['pts']), len(B['polys']), len(B['spheres']), len(B['lines']), B['textures'], B['zv']))
ys = [p[1] for p in W]
print('height %d..%d units (H = %g): %s' % (min(ys), max(ys), H, f(max(ys) - min(ys))))
print('\n# groups (pivot and extent in H; colours: byte x polygons whose first point is in the group)')
for gi, (og, op, n, nn) in enumerate(B['groups']):
    pts = [W[k] for k in range(len(W)) if own[k] == gi]
    piv = W[op] if gi else (0, 0, 0)
    cols = {}
    for idx, col, typ in B['polys']:
        if own[idx[0]] == gi:
            cols[col & 0xFF] = cols.get(col & 0xFF, 0) + 1
    ext = 'x %s..%s y %s..%s z %s..%s' % tuple(f(v) for k in range(3) for v in (min(p[k] for p in pts), max(p[k] for p in pts))) if pts else '-'
    print('g%2d parent %2d pivot (%s,%s,%s) pts %3d  %s  cols %s' % (gi, og, f(piv[0]), f(piv[1]), f(piv[2]), n, ext,
                                                                     sorted(cols.items(), key=lambda t: -t[1])))
print('\n# colours')
use = {}
for idx, col, typ in B['polys']:
    k = (col & 0xFF, L.POLY_KIND.get(typ & 0xFF, typ & 0xFF))
    use[k] = use.get(k, 0) + 1
for (c, kind), n in sorted(use.items()):
    r0 = c & 0xF0
    print('byte %3d (ramp %2d, shade %2d) %-14s x%3d  entry %s  ramp 0/4/8/12/15 %s' % (
        c, c >> 4, c & 15, kind, n, rgb(c), ' '.join(rgb(r0 + s) for s in (0, 4, 8, 12, 15))))
print('\n# spheres (centre, r in H; colour)')
for typ, col, p, r in B['spheres']:
    print('  (%s,%s,%s) r %s  byte %d %s group %d' % (f(W[p][0]), f(W[p][1]), f(W[p][2]), f(r), col & 0xFF, rgb(col & 0xFF), own[p]))
print('# lines')
for typ, col, p1, p2 in B['lines']:
    print('  (%s,%s,%s) -> (%s,%s,%s) byte %d %s groups %d/%d' % (*(f(v) for v in W[p1]), *(f(v) for v in W[p2]), col & 0xFF, rgb(col & 0xFF), own[p1], own[p2]))

only = {int(g) for g in a.groups.split(',') if g}
print('\n# horizontal sections (y: half-width |x| max, front z max, back z min; per colour byte: x range)')
polys = [([W[i] for i in idx], col & 0xFF) for idx, col, _ in B['polys'] if not only or own[idx[0]] in only]
y = 0.0
while y <= max(ys) / H + 1e-9:
    v = y * H
    cut = []
    for vs, col in polys:
        for i in range(len(vs)):
            p, q = vs[i], vs[(i + 1) % len(vs)]
            if (p[1] - v) * (q[1] - v) < 0:
                t = (v - p[1]) / (q[1] - p[1])
                cut.append(([p[k] + (q[k] - p[k]) * t for k in range(3)], col))
    if cut:
        bycol = {}
        for p, c in cut:
            bycol.setdefault(c, []).append(p[0])
        print('y %5.3f  hw %s  front %s  back %s   %s' % (y, f(max(abs(p[0]) for p, _ in cut)), f(max(p[2] for p, _ in cut)),
              f(min(p[2] for p, _ in cut)), ' '.join('%d:%s..%s' % (c, f(min(xs)), f(max(xs))) for c, xs in sorted(bycol.items()))))
    y += a.sections

if a.clips:
    A2 = L.hqr(os.path.join(a.lba2, 'ANIM.HQR'))
    for k in [int(x) for x in a.clips.split(',')]:
        an = L.anim2(A2[k])
        T, Lp = L.anim_length(an)
        print('\n# clip %d: %d keys x %d groups, loop from key %d, %d ms (loop %d ms)' % (k, an['nF'], an['nG'], an['loop'], T, Lp))
        print('  key times', [fr['t'] for fr in an['frames']], ' steps', [fr['step'] for fr in an['frames']])
        for g in range(an['nG']):
            vals = [fr['g'][g] for fr in an['frames']]
            if vals[0][0] == 1:
                print('  g%2d translate' % g, [v[1:] for v in vals])
                continue
            deg = lambda x: round(((x + 2048) % 4096 - 2048) * 360 / 4096, 1)
            rows = [(deg(v[1]), deg(v[2]), deg(v[3])) for v in vals]
            if any(abs(x) > 0.5 for r in rows for x in r):
                print('  g%2d (a,b,g deg)' % g, rows)
