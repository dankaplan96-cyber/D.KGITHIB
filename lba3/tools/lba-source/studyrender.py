#!/usr/bin/env python3
# Study renders: an original body (optionally posed by one of its clips) next to one of our models, drawn by the
# same small software rasteriser with the same cameras, scale (fractions of the height H) and light.
#
#   python3 -I tools/lba-source/studyrender.py --out <png> [--views front,34,side,back,top,game] [--size 320]
#       [--lba2 <folder> --body N [--clip K --t MS] [--H 1238]]      the original (LBA2 BODY.HQR / ANIM.HQR, palette
#                                                                    SCREEN.HQR entry 5)
#       [--lba1 <folder> --body1 N [--H 1240]]                      an LBA1 body (palette RESS.HQR entry 0)
#       [--poly assets/poly/zoe.json --polyH 1.95]                  ours, in its bind pose
#       [--grid] [--zoom 4 --cy 0.9]   (a close-up: scale and the height the view is centred on)
#
# Both are shaded the way the game shades ours (LbaMaterial: one fixed light, intensity clamp(N·L, 0.1, 1) along a
# ramp dark → the colour → pale); the original's polygons take their colour from its palette ramp, its spheres are
# drawn as flat discs like LBA2 does. Output images of an original are study material: write them outside the
# repository (the scratch space), never commit them.
import argparse
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lbadata as L  # noqa: E402

LIGHT = np.array([-0.45, 1.0, 0.6])
LIGHT /= np.linalg.norm(LIGHT)
VIEWS = {'front': (0.0, 0.0), '34': (0.62, 0.0), 'side': (math.pi / 2, 0.0), 'back': (math.pi, 0.0),
         'top': (0.0, -1.45), 'game': (0.62, -0.45)}


def s2l(c):
    c = np.asarray(list(c) if isinstance(c, (bytes, bytearray)) else c, float) / 255
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def l2s(c):
    c = np.clip(c, 0, 1)
    return np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055) * 255


def ramp(base_lin, n):
    t = np.clip(n @ LIGHT, 0.1, 1.0)[..., None]
    lo, hi = base_lin * 0.12, base_lin * 1.5 * 0.7 + 0.3
    return np.where(t < 0.6, lo + (base_lin - lo) * (t / 0.6), base_lin + (hi - base_lin) * ((t - 0.6) / 0.4))


def original(a):
    """(triangles [n,3,3], vertex normals [n,3,3], base colours linear [n,3], discs [(centre, r, colour)], lines)."""
    if a.lba1:
        R = L.hqr(os.path.join(a.lba1, 'RESS.HQR'))
        pal = R[0]
        B = L.body1(L.hqr(os.path.join(a.lba1, 'BODY.HQR'))[a.body1])
        W = [list(p) for p in B['pts']]
        polys = [(idx, c & 0xFF) for idx, c, _ in B['polys']]
        sph = [(W[p], r, c & 0xFF) for p, r, c in B['spheres']]
        lines = [(W[p1], W[p2], c & 0xFF) for p1, p2, c in B['lines']]
    else:
        pal = L.hqr(os.path.join(a.lba2, 'SCREEN.HQR'))[5]
        B = L.body2(L.hqr(os.path.join(a.lba2, 'BODY.HQR'))[a.body])
        frame = None
        if a.clip is not None:
            an = L.anim2(L.hqr(os.path.join(a.lba2, 'ANIM.HQR'))[a.clip])
            frame = L.frame_at(an, a.t)
        W, _ = L.pose2(B, frame)
        polys = [(idx, c & 0xFF) for idx, c, _ in B['polys']]
        sph = [(W[p], r, c & 0xFF) for _, c, p, r in B['spheres']]
        lines = [(W[p1], W[p2], c & 0xFF) for _, c, p1, p2 in B['lines']]
    P = np.array(W, float) / a.H
    tris, cols = [], []
    for idx, c in polys:
        for k in range(1, len(idx) - 1):
            tris.append([idx[0], idx[k], idx[k + 1]])
            cols.append(c)
    T = P[np.array(tris)]
    # smooth vertex normals (the original's polygons are mostly Gouraud): average the faces round each point
    fn = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0])
    fn /= np.linalg.norm(fn, axis=1, keepdims=True) + 1e-12
    acc = np.zeros_like(P)
    for j in range(3):
        np.add.at(acc, np.array(tris)[:, j], fn)
    vn = acc / (np.linalg.norm(acc, axis=1, keepdims=True) + 1e-12)
    N = vn[np.array(tris)]
    # a polygon's colour: the palette entry its colour byte names, raised to the middle of its 16-shade ramp
    base = np.array([s2l(pal[min(255, (c & 0xF0) + max(c & 15, 7)) * 3:min(255, (c & 0xF0) + max(c & 15, 7)) * 3 + 3]) for c in cols])
    discs = [(np.array(p) / a.H, r / a.H, s2l(pal[c * 3:c * 3 + 3])) for p, r, c in sph]
    ln = [(np.array(p) / a.H, np.array(q) / a.H, s2l(pal[c * 3:c * 3 + 3])) for p, q, c in lines]
    return T, N, base, discs, ln


def ours(path, H):
    import json
    J = json.load(open(path))
    P = np.array(J['pos'], float).reshape(-1, 3, 3)
    H = H or P[..., 1].max()   # (0: to the top of the model)
    P = P / H
    N = np.array(J['nrm'], float).reshape(-1, 3, 3)
    C = s2l(np.array(J['col'], float).reshape(-1, 3, 3)[:, 0])
    # the eyes (flat on the head): pivot + local
    eT, eC = [], []
    for e in J.get('eyes', []):
        q = np.array(e['pos'], float).reshape(-1, 3, 3) + np.array(e['pivot'])
        eT.append(q / H)
        eC.append(s2l(np.array(e['col'], float).reshape(-1, 3, 3)[:, 0]))
    if eT:
        q = np.concatenate(eT)
        n = np.cross(q[:, 1] - q[:, 0], q[:, 2] - q[:, 0])
        n /= np.linalg.norm(n, axis=1, keepdims=True) + 1e-12
        P = np.concatenate([P, q + n[:, None, :] * 0.0005])
        N = np.concatenate([N, np.repeat(n[:, None, :], 3, 1)])
        C = np.concatenate([C, np.concatenate(eC)])
    return P, N, C, [], []


def rot(yaw, pitch):
    cy, sy, cp, sp = math.cos(yaw), math.sin(yaw), math.cos(pitch), math.sin(pitch)
    Ry = np.array([[cy, 0, -sy], [0, 1, 0], [sy, 0, cy]])
    Rx = np.array([[1, 0, 0], [0, cp, sp], [0, -sp, cp]])
    return Rx @ Ry


def draw(model, yaw, pitch, S, grid, zoom=1.0, cy=0.5):
    T, N, base, discs, lines = model
    R = rot(yaw, pitch)
    k = S * 0.86 * zoom   # px per H; the view is centred on cy (in H)
    img = np.zeros((S, S, 3)) + np.array([0.16, 0.17, 0.2])
    zb = np.full((S, S), -1e9)
    V = T @ R.T
    sx = S / 2 + V[..., 0] * k
    sy = S / 2 - (V[..., 1] - cy * math.cos(pitch)) * k
    z = V[..., 2]
    col = ramp(base[:, None, :], N)          # per vertex (lighting fixed to the model, like the game)
    for i in range(len(T)):
        x0, x1 = int(max(0, math.floor(sx[i].min()))), int(min(S - 1, math.ceil(sx[i].max())))
        y0, y1 = int(max(0, math.floor(sy[i].min()))), int(min(S - 1, math.ceil(sy[i].max())))
        if x1 < x0 or y1 < y0:
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, bx, cx_), (ay, by, cy_) = sx[i], sy[i]
        d = (by - cy_) * (ax - cx_) + (cx_ - bx) * (ay - cy_)
        if abs(d) < 1e-9:
            continue
        w0 = ((by - cy_) * (xs - cx_) + (cx_ - bx) * (ys - cy_)) / d
        w1 = ((cy_ - ay) * (xs - cx_) + (ax - cx_) * (ys - cy_)) / d
        w2 = 1 - w0 - w1
        m = (w0 >= -1e-6) & (w1 >= -1e-6) & (w2 >= -1e-6)
        if not m.any():
            continue
        zz = w0 * z[i, 0] + w1 * z[i, 1] + w2 * z[i, 2]
        sub = zb[y0:y1 + 1, x0:x1 + 1]
        m &= zz > sub
        if not m.any():
            continue
        sub[m] = zz[m]
        c = w0[..., None] * col[i, 0] + w1[..., None] * col[i, 1] + w2[..., None] * col[i, 2]
        img[y0:y1 + 1, x0:x1 + 1][m] = c[m]
    for p, r, c in discs:   # flat unlit discs (LBA2 spheres)
        v = R @ p
        px, py, rr = S / 2 + v[0] * k, S / 2 - (v[1] - cy * math.cos(pitch)) * k, r * k
        xs, ys = np.meshgrid(np.arange(S) + 0.5, np.arange(S) + 0.5)
        m = ((xs - px) ** 2 + (ys - py) ** 2 <= rr * rr) & (v[2] + r > zb)
        zb[m] = v[2] + r
        img[m] = c
    out = Image.fromarray(l2s(img).astype(np.uint8))
    dr = ImageDraw.Draw(out)
    for p, q, c in lines:
        a_, b_ = R @ p, R @ q
        dr.line([(S / 2 + a_[0] * k, S / 2 - (a_[1] - cy * math.cos(pitch)) * k), (S / 2 + b_[0] * k, S / 2 - (b_[1] - cy * math.cos(pitch)) * k)],
                fill=tuple(int(x) for x in l2s(c)), width=1)
    if grid and pitch == 0:
        for f in range(0, 11):
            y = S / 2 - (f / 10 - cy) * k
            dr.line([(0, y), (6 if f % 5 else 14, y)], fill=(200, 200, 90))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--views', default='front,34,side,back')
    ap.add_argument('--size', type=int, default=320)
    ap.add_argument('--lba2')
    ap.add_argument('--lba1')
    ap.add_argument('--body', type=int)
    ap.add_argument('--body1', type=int)
    ap.add_argument('--clip', type=int)
    ap.add_argument('--t', type=float, default=0)
    ap.add_argument('--H', type=float)
    ap.add_argument('--poly', action='append', default=[])
    ap.add_argument('--polyH', type=float, action='append', default=[])
    ap.add_argument('--grid', action='store_true')
    ap.add_argument('--zoom', type=float, default=1.0)
    ap.add_argument('--cy', type=float, default=0.5)
    a = ap.parse_args()
    rows = []
    if a.body is not None or a.body1 is not None:
        a.H = a.H or (1240 if a.lba1 else 1238)
        rows.append(original(a))
    for i, p in enumerate(a.poly):
        rows.append(ours(p, a.polyH[i] if i < len(a.polyH) else 0))
    views = [VIEWS[v] for v in a.views.split(',')]
    S = a.size
    sheet = Image.new('RGB', (S * len(views), S * len(rows)))
    for r, m in enumerate(rows):
        for c, (yaw, pitch) in enumerate(views):
            sheet.paste(draw(m, yaw, pitch, S, a.grid, a.zoom, a.cy), (c * S, r * S))
    sheet.save(a.out)
    print('wrote', a.out)


if __name__ == '__main__':
    main()
