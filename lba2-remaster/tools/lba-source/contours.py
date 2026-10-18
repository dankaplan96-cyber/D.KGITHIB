#!/usr/bin/env python3
# Horizontal section contours of an original LBA2 body, as numbers for our Blender scripts (the way TW_HEAD /
# ZOE_BODY in tools/blender were measured): at each height, the outline of the chosen groups' polygons as a
# half-contour from the front centre round the model's left side (+x) to the back centre, left and right averaged.
#
#   python3 -I tools/lba-source/contours.py --lba2 <folder> --body 26 --groups 12 --y 0.85:0.995:0.012 --k 9 [--H 1238]
#
# Output: one line per height, `(y, [(x, z), ...])` in fractions of H, ready to paste as a table. Only polygons whose
# points all belong to the groups are cut (so the arms' polygons leave the torso's outline alone).
import argparse
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lbadata as L  # noqa: E402


def section(segs, k, zc):
    """r(theta) along k rays from (0, zc), theta 0 = front (+z), pi = back, through +x; left and right averaged."""
    def hit(th, sx):
        dx, dz = sx * math.sin(th), math.cos(th)
        best = None
        for (ax, az), (bx, bz) in segs:
            ex, ez = bx - ax, bz - az
            den = dx * ez - dz * ex
            if abs(den) < 1e-12:
                continue
            t = ((ax) * ez - (az - zc) * ex) / den
            u = ((ax) * dz - (az - zc) * dx) / den
            if t > 0 and -1e-9 <= u <= 1 + 1e-9:
                best = t if best is None else max(best, t)
        return best
    out = []
    for i in range(k):
        th = math.pi * i / (k - 1)
        rs = [r for r in (hit(th, 1), hit(th, -1)) if r is not None]
        if not rs:
            continue
        r = sum(rs) / len(rs)
        out.append((round(r * math.sin(th), 4), round(zc + r * math.cos(th), 4)))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--lba2', required=True)
    ap.add_argument('--body', type=int, required=True)
    ap.add_argument('--groups', required=True)
    ap.add_argument('--y', required=True, help='from:to:step in H')
    ap.add_argument('--k', type=int, default=9)
    ap.add_argument('--H', type=float, default=1238)
    a = ap.parse_args()
    B = L.body2(L.hqr(os.path.join(a.lba2, 'BODY.HQR'))[a.body])
    W, _ = L.pose2(B)
    own = L.owners(B)
    gs = {int(g) for g in a.groups.split(',')}
    P = [[[c / a.H for c in W[i]] for i in idx] for idx, col, typ in B['polys'] if all(own[i] in gs for i in idx)]
    y0, y1, st = (float(v) for v in a.y.split(':'))
    y = y0
    while y <= y1 + 1e-9:
        segs = []
        for vs in P:
            cut = []
            for i in range(len(vs)):
                p, q = vs[i], vs[(i + 1) % len(vs)]
                if (p[1] - y) * (q[1] - y) < 0:
                    t = (y - p[1]) / (q[1] - p[1])
                    cut.append((p[0] + (q[0] - p[0]) * t, p[2] + (q[2] - p[2]) * t))
            if len(cut) == 2:
                segs.append(tuple(cut))
        if segs:
            zs = [c[1] for s in segs for c in s]
            zc = (max(zs) + min(zs)) / 2
            print('    (%.3f, %s),' % (y, section(segs, a.k, zc)))
        y += st


if __name__ == '__main__':
    main()
