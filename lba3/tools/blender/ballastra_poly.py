# Ballastra's people for the expansion (W-1 Float Harbor; EXPANSION_ART_DECISIONS.md D1, D4, D9), as low-poly LBA-style
# models in the cast's language (lbapoly.py: a few big shapes, smooth-shaded, ball hands, flat eyes and a talking mouth):
#   python tools/blender/ballastra_poly.py art/characters/skeletons.json assets/poly [names...]
# Without Blender (this laptop has none, nor the bpy wheel): the stand-ins in tools/blender/nobpy give the scripts what
# they use of bpy/mathutils, and lbapoly computes the JSON itself (no .blend is written):
#   PYTHONPATH=tools/blender/nobpy python tools/blender/ballastra_poly.py art/characters/skeletons.json assets/poly
# (checked: cast_poly.py through the stand-ins rebuilds worker.json and nell.json byte for byte, odile.json to the last
# rounding digit in 10 of 21204 values).
# Skeletons: each look's own, from src/game/characters.js (tools/dump-skeletons.mjs <name> merges one into the file), so
# every animation the game plays drives the model; the ear bones come from the look's earBones (the rig wafts them).
#
# The canal dwellers (D4): shoulder-high to Twinsen, compact and broad, a big round face (wide cheeks, a short broad
# nose, a soft jaw), fan ears standing out from the head, short sturdy legs set wide on broad feet. One body: tessa is
# her own cut of it (narrower, carried forward, a woman's figure); the dockers share one cut in three outfits.
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402,F401  (the stand-in without Blender)
from lbapoly import Builder, Face, box, hand_detail, lerp, loft, mouth_lens, refine, ring, smooth, sphere, tube  # noqa: E402

args = [a for a in sys.argv[1:] if not a.endswith('.py')]
SKEL, OUTDIR = args[0], args[1]
ONLY = args[2:]
ALL = json.load(open(SKEL))


def shade(hexc, k):
    """A colour darker (k < 1) or lighter (k > 1, toward white)."""
    c = [int(hexc.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)]
    c = [min(255, int(v * k)) if k <= 1 else int(v + (255 - v) * (k - 1)) for v in c]
    return '#%02x%02x%02x' % tuple(c)


def mix(a, b, t):
    ca = [int(a.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)]
    cb = [int(b.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)]
    return '#%02x%02x%02x' % tuple(int(x + (y - x) * t) for x, y in zip(ca, cb))


# Each person's own settings beyond the look's colours (characters.js): the face (brows: thickness, inner-end tilt, a
# little asymmetry; nose size and breadth; mouth width and corner lift; the ears' size and how far they sweep back;
# cheek and jaw fullness) and the build (body width, a woman's figure). The outfit is picked by name in build().
PEOPLE = {
    'tessa': dict(body=0.93, fem=True, browS=1.0, browTilt=0.15, browAsym=0.12, noseS=0.92, noseW=1.2, mouthW=0.92, mouthLift=1.25, mouthAsym=0.3,
                  earS=0.9, earBack=0.8, cheek=0.96, jaw=0.94, eyeS=1.04),
    'docker1': dict(body=1.0, browS=1.5, browTilt=-0.2, browAsym=-0.1, noseS=1.12, noseW=1.35, mouthW=1.05, mouthLift=0.7, mouthAsym=-0.2,
                    earS=1.0, earBack=0.72, cheek=1.05, jaw=1.04, eyeS=0.95),
    'docker2': dict(body=1.0, browS=1.1, browTilt=0.3, browAsym=0.15, noseS=1.0, noseW=1.2, mouthW=1.15, mouthLift=1.6, mouthAsym=0.25,
                    earS=1.08, earBack=0.62, cheek=1.1, jaw=1.0, eyeS=1.0),
    'docker3': dict(body=1.0, browS=1.9, browTilt=-0.05, browAsym=-0.15, noseS=1.2, noseW=1.3, mouthW=1.0, mouthLift=0.35, mouthAsym=0.2,
                    earS=1.04, earBack=0.86, cheek=0.98, jaw=1.0, eyeS=0.92, age=True),
}

# The head, horizontal sections round the head's centre Hc (head-space units at headS 1.35; scaled by K = headS / 1.35):
# (dy, half-width, front, back, roundness p). The widest at the cheeks and cheekbones (a round face, not an egg), a soft
# jaw, the brow and forehead sloping back to a low round crown, a full back of the head.
HEAD = [(-0.188, 0.050, 0.080, -0.020, 0.9), (-0.170, 0.098, 0.112, -0.062, 0.85), (-0.140, 0.134, 0.134, -0.102, 0.82),
        (-0.098, 0.158, 0.149, -0.132, 0.8), (-0.056, 0.168, 0.152, -0.150, 0.8), (-0.014, 0.167, 0.146, -0.160, 0.8),
        (0.032, 0.161, 0.137, -0.165, 0.82), (0.080, 0.149, 0.118, -0.158, 0.85), (0.124, 0.124, 0.091, -0.136, 0.88),
        (0.163, 0.083, 0.057, -0.096, 0.9), (0.188, 0.036, 0.022, -0.042, 0.95)]
HEAD_N = 20
HEAD_DROP = 0.025   # (the head's centre this far below the skeleton's (head + 0.13 headS): a compact people's short neck; the
#                    looks' earBones are placed for it)


def sec_at(secs, y):
    """The section (half-width, front, back, p) at height y, between the listed ones."""
    if y <= secs[0][0]:
        return secs[0][1:]
    for a, b in zip(secs, secs[1:]):
        if a[0] <= y <= b[0]:
            t = (y - a[0]) / ((b[0] - a[0]) or 1)
            return tuple(u + (v - u) * t for u, v in zip(a[1:], b[1:]))
    return secs[-1][1:]


def ring_front(hw, zf, p, x):
    """The z of a ring()'s front surface at x (the ring: x = hw sin^p, z = zf cos^p)."""
    s = min(0.985, (abs(x) / (hw or 1)) ** (1 / p))
    return zf * (1 - s * s) ** (p / 2)


def facing(part, verts, faces, ref=None, normal=None):
    """Faces wound so their normal points away from `ref` (a point) or along `normal`: the export shades by the winding."""
    o = len(part.v)
    part.v += [tuple(p) for p in verts]
    for f in faces:
        a, b, c = verts[f[0]], verts[f[1]], verts[f[2]]
        n = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
             (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])]
        if normal is not None:
            d = normal
        else:
            cen = [sum(verts[i][k] for i in f) / len(f) for k in range(3)]
            d = [cen[k] - ref[k] for k in range(3)]
        ff = list(f) if sum(n[k] * d[k] for k in range(3)) >= 0 else list(reversed(f))
        part.f.append(Face(i + o for i in ff))
    return part


def torus(part, c, R, r, u, v, n=14, m=6):
    """A ring of rope or cloth round c in the plane of u, v (unit vectors), R its radius, r the thickness."""
    w = (u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0])
    rings = []
    for i in range(n):
        a = 2 * math.pi * i / n
        d = [u[k] * math.cos(a) + v[k] * math.sin(a) for k in range(3)]
        rr = []
        for j in range(m):
            b_ = 2 * math.pi * j / m
            rr.append(tuple(c[k] + d[k] * (R + r * math.cos(b_)) + w[k] * r * math.sin(b_) for k in range(3)))
        rings.append(rr)
    verts = [p for rr in rings for p in rr]
    faces = [[i * m + j, i * m + (j + 1) % m, ((i + 1) % n) * m + (j + 1) % m, ((i + 1) % n) * m + j] for i in range(n) for j in range(m)]
    # wound outward from the tube's own centre line
    o = len(part.v)
    part.v += verts
    for i in range(n):
        a = 2 * math.pi * i / n
        cen = [c[k] + (u[k] * math.cos(a) + v[k] * math.sin(a)) * R for k in range(3)]
        for j in range(m):
            f = faces[i * m + j]
            A, B_, C = verts[f[0]], verts[f[1]], verts[f[2]]
            nn = [(B_[1] - A[1]) * (C[2] - A[2]) - (B_[2] - A[2]) * (C[1] - A[1]), (B_[2] - A[2]) * (C[0] - A[0]) - (B_[0] - A[0]) * (C[2] - A[2]),
                  (B_[0] - A[0]) * (C[1] - A[1]) - (B_[1] - A[1]) * (C[0] - A[0])]
            dd = [A[k] - cen[k] for k in range(3)]
            ff = f if sum(nn[k] * dd[k] for k in range(3)) >= 0 else f[::-1]
            fc = Face(x + o for x in ff)
            fc.angle = 80
            part.f.append(fc)
    return part


def build(name):
    S = ALL[name]
    L, B = S['look'], S['bones']
    bp = lambda n: tuple(B[n]['p'])
    pp = PEOPLE[name]
    outfit = {'tessa': 'mechanic', 'docker1': 'smock', 'docker2': 'vest', 'docker3': 'tabard'}[name]
    W = pp.get('body', 1.0)
    fem = pp.get('fem', False)
    hipsY, shY, neckY, headY = bp('hips')[1], bp('shL')[1], bp('neck')[1], bp('head')[1]
    shX, legX = bp('shL')[0], bp('hipL')[0]
    neckZ, headZ = bp('neck')[2], bp('head')[2]
    stoop = L.get('stoop', 0) or 0
    hs = L.get('headS') or 1.35
    K = hs / 1.35
    Hc = (0.0, headY + 0.13 * hs - HEAD_DROP * K, headZ)   # (HEAD_DROP: the head set down on a short neck)
    skin, hair = L['skin'], L.get('hair', '#2a1a10')
    shirt, trim = L.get('tunic', '#888888'), L.get('tunicTrim') or L.get('tunic', '#888888')
    pants, shoes = L.get('pants', '#555555'), L.get('shoes', '#3a2a1a')
    hemY = max(0.06, L.get('hem', 0.5))
    b = Builder(name, B)

    waistY = hipsY + 0.05
    chestY = shY - 0.12
    zc = lambda y: stoop * 0.5 * smooth(waistY, neckY, y)   # (the forward posture: the chest carried over the work)
    N = 14

    def w_torso(p):
        x, y, z = p
        arm = smooth(shX - 0.08, shX + 0.01, abs(x)) * smooth(chestY - 0.06, shY - 0.02, y)
        s = 'L' if x > 0 else 'R'
        return {'torso': 1 - arm * 0.6, 'sh' + s: arm * 0.6}

    def w_seat(p):
        # the trousers' seat: the pelvis, carried more and more by the thigh on its side toward the crotch
        x, y, z = p
        g = smooth(hipsY + 0.02, hipsY - 0.1, y) * smooth(0.02, 0.08, abs(x)) * 0.7
        return {'hips': 1 - g, ('hipL' if x > 0 else 'hipR'): g}

    def w_skirt(p, legs=0.3):
        # a skirt / apron / tabard below the waist: the four skirt bones by direction (the rig swings them with the legs),
        # a share toward the hem carried by the thigh on its side so it keeps round the legs whatever they do
        x, y, z = p
        k = smooth(waistY - 0.02, waistY - 0.25, y)
        a = math.atan2(x, z - 0.01)
        c, s = math.cos(a), math.sin(a)
        g = legs * smooth(waistY - 0.08, hemY + 0.04, y)
        w = {'hips': 1 - k}
        for bn, v in (('skirtF', max(0, c) ** 2), ('skirtB', max(0, -c) ** 2), ('skirtL', max(0, s) ** 2), ('skirtR', max(0, -s) ** 2)):
            if v > 0:
                w[bn] = k * v * (1 - g)
        if g > 0:
            l = smooth(-0.05, 0.05, x)
            for bn, v in (('hipL', l), ('hipR', 1 - l)):
                if v > 0:
                    w[bn] = w.get(bn, 0) + k * g * v
        return w

    def joint(a, b_, yj, wd=0.05):
        return lambda p: {a: 1 - smooth(yj + wd, yj - wd, p[1]), b_: smooth(yj + wd, yj - wd, p[1])}

    # ---------------------------------------------------------------- torso: a compact barrel, broad at the shoulders
    TS = [(waistY - 0.01, 0.172 * W * (0.92 if fem else 1), 0.128 * W, -0.118 * W, 0.75),
          (waistY + 0.1, 0.19 * W * (0.95 if fem else 1), 0.145 * W, -0.128 * W, 0.72),
          (chestY, 0.205 * W, (0.158 if fem else 0.152) * W, -0.132 * W, 0.7),
          (shY + 0.012, shX + 0.03 * W, 0.112 * W, -0.112 * W, 0.62),
          (neckY - 0.01, 0.092 * K, 0.078 * K, -0.072 * K, 0.9)]
    TS = refine(TS, (1, 2))

    def torso_rings(scale=1.0, add=0.0, upto=None):
        rr = []
        for i, (y, hw, zf, zb, p) in enumerate(TS):
            if upto is not None and y > upto:
                break
            cz = neckZ if i == len(TS) - 1 else zc(y)
            rr.append(ring(y, hw * scale + add, zf * scale + add, zb * scale - add, N, p, cz=cz))
        return rr

    def torso_z(y, x=0.0, add=0.0):
        hw, zf, zb, p = sec_at(TS, y)
        return ring_front(hw + add, zf + add, p, x) + zc(y)

    def torso_back_z(y, x=0.0):
        hw, zf, zb, p = sec_at(TS, y)
        return zc(y) - ring_front(hw, -zb, p, x)

    loft(b.P('torso', shirt, w_torso, 50), torso_rings(), cap_top=True)

    # ---------------------------------------------------------------- below the waist: the trousers' seat
    seatR = max(0.172 * W, legX + 0.082)
    seat = [ring(waistY - 0.005, TS[0][1] * 1.0, TS[0][2], TS[0][3], N, 0.75, cz=zc(waistY)),
            ring(hipsY - 0.03, seatR, 0.128 * W, -0.135 * W, N, 0.8),
            ring(hipsY - 0.1, seatR * 0.86, 0.11 * W, -0.112 * W, N, 0.85)]
    loft(b.P('seat', pants, w_seat, 50), seat, cap_bottom=True)

    def seat_z(y, x=0.0):
        rs = [(r[0][1], r[N // 4][0], r[0][2]) for r in seat]
        for (ya, hwa, zfa), (yb, hwb, zfb) in zip(rs, rs[1:]):
            if ya >= y >= yb:
                t = (ya - y) / ((ya - yb) or 1)
                return ring_front(hwa + (hwb - hwa) * t, zfa + (zfb - zfa) * t, 0.73, x)
        return rs[-1][2]

    # ---------------------------------------------------------------- legs and broad feet
    boots = {'smock': 0.2, 'mechanic': 0.07}.get(outfit, 0.0)
    for s, sx in (('L', 1), ('R', -1)):
        hp, kn, ft = bp('hip' + s), bp('knee' + s), bp('foot' + s)
        r1, r2, r3 = 0.088 * W, 0.072 * W, 0.06 * W
        shorts = outfit == 'vest'
        tube(b.P('thigh' + s, pants, joint('hip' + s, 'knee' + s, kn[1] + 0.02), 50), (hp[0], hp[1] - 0.0, hp[2]), (kn[0], kn[1] + (0.05 if shorts else 0.0), kn[2]), r1, r2 * 1.04, 10, cap=False)
        if shorts:   # (knee shorts: a turned-up cuff, the knee and shin bare)
            tube(b.P('shortsCuff' + s, shade(pants, 0.82), 'hip' + s, 40), (kn[0], kn[1] + 0.05, kn[2]), (kn[0], kn[1] + 0.09, kn[2]), r2 * 1.16, r2 * 1.14, 10)
        legc = skin if shorts else pants
        sphere(b.P('knee' + s, legc, 'knee' + s, 50), (kn[0], kn[1] + 0.005, kn[2]), r2 * 0.97, 8, 5, exact=True)   # (fills the bent knee)
        ank = (ft[0], ft[1] + 0.03, ft[2])
        rolled = outfit == 'tabard'
        if rolled:   # (trousers rolled to mid-shin: a fat cuff, the ankle bare)
            mid = lerp(kn, ank, 0.55)
            tube(b.P('shin' + s, pants, 'knee' + s, 50), kn, mid, r2 * 1.04, r3 * 1.08, 10, cap=False)
            tube(b.P('rollCuff' + s, shade(pants, 1.18), 'knee' + s, 40), lerp(kn, ank, 0.45), lerp(kn, ank, 0.62), r3 * 1.32, r3 * 1.28, 10)
            tube(b.P('ankle' + s, skin, 'knee' + s, 50), lerp(kn, ank, 0.55), ank, r3 * 0.92, r3 * 0.8, 10, cap=False)
        else:
            tube(b.P('shin' + s, legc, 'knee' + s, 50), kn, ank, r2 * (0.96 if shorts else 1.04), r3 * (0.85 if shorts else 1.0), 10, cap=False)
        if boots > 0.1:   # (tall rubber boots to below the knee, a rolled top)
            top = (kn[0], ft[1] + boots + 0.03, kn[2] + (ank[2] - kn[2]) * 0.3)
            tube(b.P('boot' + s, shoes, 'knee' + s, 45), top, (ft[0], ft[1] + 0.0, ft[2]), r3 * 1.42, r3 * 1.3, 10)   # (capped: kneeling shows the boot's top end-on)
            tube(b.P('bootTop' + s, shade(shoes, 1.25), 'knee' + s, 40), lerp(top, ank, -0.03), lerp(top, ank, 0.12), r3 * 1.55, r3 * 1.52, 10)
        elif boots > 0:   # (work boots to the ankle: a padded cuff)
            tube(b.P('boot' + s, shoes, 'foot' + s, 45), (ft[0], ft[1] + boots + 0.03, ft[2] - 0.01), (ft[0], ft[1] - 0.04, ft[2] - 0.005), r3 * 1.3, r3 * 1.32, 10)
            tube(b.P('bootTop' + s, shade(shoes, 1.35), 'foot' + s, 40), (ft[0], ft[1] + boots + 0.005, ft[2] - 0.01), (ft[0], ft[1] + boots + 0.04, ft[2] - 0.01), r3 * 1.42, r3 * 1.4, 10)
        # the broad foot: sections from the heel to a wide round toe, the top sloping down to it (D4: broad feet)
        bare = outfit in ('vest', 'tabard')
        fx, fl, fh = 0.074 * W, 0.17, 0.082
        fcol = skin if bare else shoes
        secs = [(-0.06, 0.78, 1.0), (-0.025, 0.95, 1.06), (fl * 0.42, 1.04, 0.82), (fl * 0.78, 1.0, 0.56), (fl, 0.62, 0.34)]
        rings_ = []
        M = 12
        for dz, wk, hk in secs:
            rings_.append([(ft[0] + sx * 0.012 * (dz > 0.05) + fx * wk * math.cos(2 * math.pi * k / M), 0.006 + fh * hk * 0.62 * (1 + math.sin(2 * math.pi * k / M)), ft[2] + dz) for k in range(M)])
        foot = b.P('foot' + s, fcol, 'foot' + s, 45)
        vv = [p for r in rings_ for p in r]
        ff = [[j * M + i, j * M + (i + 1) % M, (j + 1) * M + (i + 1) % M, (j + 1) * M + i] for j in range(len(rings_) - 1) for i in range(M)]
        c0 = tuple(sum(p[k] for p in rings_[0]) / M for k in range(3))
        c1 = tuple(sum(p[k] for p in rings_[-1]) / M for k in range(3))
        vv += [c0, c1]
        nl = len(rings_) - 1
        ff += [[(i + 1) % M, i, len(vv) - 2] for i in range(M)] + [[nl * M + i, nl * M + (i + 1) % M, len(vv) - 1] for i in range(M)]
        foot.add(vv, ff)
        if bare:   # three toe lobes across the wide front, a hair sunk into the foot
            for dxk in (-0.62, 0.0, 0.62):
                sphere(foot, (ft[0] + sx * 0.012 + dxk * fx * 0.82, 0.026, ft[2] + fl * 0.93 - abs(dxk) * 0.035), 0.026, 5, 3, (1.0, 0.85, 1.1), exact=True)
        sole_c = shade(shoes, 0.6) if not bare else ('#5a3a22' if outfit == 'tabard' else None)
        if sole_c:
            box(b.P('sole' + s, sole_c, 'foot' + s, 30), ft[0] + sx * 0.006 - fx * 0.92, ft[0] + sx * 0.006 + fx * 0.92, 0.0, 0.012, ft[2] - 0.055, ft[2] + fl * 0.9)
        if outfit == 'tabard':   # sandal straps across the instep and round the ankle
            sp = b.P('strap' + s, shoes, 'foot' + s, 40)
            tube(sp, (ft[0] - fx * 1.04, 0.035, ft[2] + 0.07), (ft[0] + fx * 1.04, 0.035, ft[2] + 0.07), 0.012, 0.012, 6, squash=0.5)
            tube(sp, (ft[0], 0.07, ft[2] - 0.03), (ft[0], 0.065, ft[2] + 0.035), fx * 0.62, fx * 0.66, 10, cap=False)

    # ---------------------------------------------------------------- the garment below the waist (each outfit's own)
    if outfit == 'smock':
        # the oilskin smock: from the waist out over the hips to mid-thigh, a little flare, a hem band, a kangaroo pocket
        hemR = seatR * 1.18
        rr = [ring(waistY - 0.012, TS[0][1] * 1.02, TS[0][2] * 1.02, TS[0][3] * 1.02, N, 0.75, cz=zc(waistY)),
              ring(hipsY - 0.04, seatR * 1.07, 0.15 * W, -0.165 * W, N, 0.72),
              ring(hemY, hemR, hemR * 0.82, -hemR * 0.86, N, 0.72)]
        loft(b.P('smockSkirt', shirt, lambda p: w_skirt(p, 0.35), 50), rr)
        ra, rb = rr[-1], rr[-2]
        t_ = 0.05 / (rb[0][1] - ra[0][1])
        top_ = [tuple(a[k] + (c[k] - a[k]) * t_ for k in range(3)) for a, c in zip(ra, rb)]
        loft(b.P('smockHem', trim, lambda p: w_skirt(p, 0.35), 50), [[(x * 1.025, y, z * 1.025) for x, y, z in ra], [(x * 1.025, y, z * 1.025) for x, y, z in top_]])
        pk = b.P('pocket', shade(shirt, 0.82), 'torso', 35)
        py0, py1 = waistY + 0.13, waistY - 0.02
        xs = [-0.11 * W, -0.04 * W, 0.04 * W, 0.11 * W]
        v = [(x, y, torso_z(y, x) + 0.012) for y in (py1, py0) for x in xs]
        facing(pk, v, [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6]], normal=(0, 0, 1))
    elif outfit == 'vest':
        pass   # (the undershirt is tucked into the shorts: the seat shows)
    elif outfit == 'mechanic':
        # Tessa's short apron: a canvas panel from the belt to mid-thigh laid on the seat and the thighs (the front skirt
        # bone swings it with the forward leg), a wide pocket with the wrench and the screwdriver standing out of it
        ap = b.P('apron', L['apron'], lambda p: w_skirt(p, 0.25), 35)
        rows = [waistY + 0.012, waistY - 0.06, hipsY - 0.06, (hipsY - 0.06 + hemY) / 2, hemY]
        halfw = [0.15 * W, 0.168 * W, 0.18 * W, 0.17 * W, 0.16 * W]

        def apz(y, x):
            if y >= waistY - 0.01:
                return torso_z(y, x) + 0.014
            z0 = seat_z(min(y, waistY - 0.006), x) + 0.014
            if y < hipsY - 0.1:   # (below the seat: hanging clear in front of the thighs, a little forward)
                z0 = seat_z(hipsY - 0.1, x) + 0.02 + (hipsY - 0.1 - y) * 0.14
            return z0
        cols = 7
        v = [((-hw_ + 2 * hw_ * c_ / (cols - 1)), y, apz(y, -hw_ + 2 * hw_ * c_ / (cols - 1))) for y, hw_ in zip(rows, halfw) for c_ in range(cols)]
        f = [[r * cols + c_, r * cols + c_ + 1, (r + 1) * cols + c_ + 1, (r + 1) * cols + c_] for r in range(len(rows) - 1) for c_ in range(cols - 1)]
        facing(ap, v, f, normal=(0, 0, 1))
        hemc = b.P('apronHem', shade(L['apron'], 0.75), lambda p: w_skirt(p, 0.25), 35)
        hv = [(x, y, apz(hemY, x) + 0.004) for y in (hemY + 0.028, hemY) for x in [-halfw[-1] + 2 * halfw[-1] * c_ / (cols - 1) for c_ in range(cols)]]
        facing(hemc, hv, [[c_, c_ + 1, cols + c_ + 1, cols + c_] for c_ in range(cols - 1)], normal=(0, 0, 1))
        py_t, py_b = hipsY - 0.035, hipsY - 0.15
        pk = b.P('apronPocket', shade(L['apron'], 0.86), lambda p: w_skirt(p, 0.25), 35)
        pxs = [-0.12 * W, -0.04 * W, 0.04 * W, 0.12 * W]
        pv = [(x, y, apz(y, x) + 0.008) for y in (py_b, py_t) for x in pxs]
        facing(pk, pv, [[0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6]], normal=(0, 0, 1))
        # the tools in the pocket: a steel wrench (handle and an open jaw) and a screwdriver with a red handle
        tw = b.P('wrench', '#9aa2aa', lambda p: w_skirt(p, 0.25), 30)
        wx = 0.07 * W
        wz = apz(py_t, wx) + 0.016
        tube(tw, (wx, py_t - 0.05, wz), (wx + 0.012, py_t + 0.075, wz + 0.006), 0.011, 0.011, 6, hard=True)
        jy = py_t + 0.09
        box(tw, wx - 0.016, wx + 0.04, jy - 0.012, jy + 0.012, wz - 0.008, wz + 0.016)
        box(tw, wx - 0.016, wx - 0.002, jy + 0.012, jy + 0.04, wz - 0.008, wz + 0.016)
        box(tw, wx + 0.026, wx + 0.04, jy + 0.012, jy + 0.04, wz - 0.008, wz + 0.016)
        sdx = -0.075 * W
        sdz = apz(py_t, sdx) + 0.016
        tube(b.P('driverGrip', '#c83a2a', lambda p: w_skirt(p, 0.25), 40), (sdx, py_t - 0.02, sdz), (sdx - 0.004, py_t + 0.05, sdz + 0.004), 0.014, 0.012, 7)
        tube(b.P('driverTip', '#b8bcc4', lambda p: w_skirt(p, 0.25), 30), (sdx - 0.004, py_t + 0.05, sdz + 0.004), (sdx - 0.006, py_t + 0.085, sdz + 0.005), 0.005, 0.004, 5, hard=True)
        # the hammer hung at her right hip from the belt (on the pelvis, outside the thigh's swing)
        hx = -(seatR + 0.035)
        hm = b.P('hammerGrip', '#8a5a30', 'hips', 40)
        tube(hm, (hx, waistY - 0.03, -0.02), (hx - 0.006, waistY - 0.2, -0.005), 0.012, 0.011, 7)
        hh = b.P('hammerHead', '#5a6068', 'hips', 30)
        box(hh, hx - 0.018, hx + 0.018, waistY - 0.035, waistY + 0.002, -0.075, 0.04)
        box(b.P('belt', L.get('belt', '#4a3020'), 'hips', 30), hx - 0.006, hx + 0.02, waistY - 0.03, waistY + 0.036, -0.03, -0.004)
    elif outfit == 'tabard':
        # the leather tabard: a front and a back panel from the shoulders to above the knee, narrower than the body,
        # held at the waist by the belt; below the belt they hang on the skirt bones
        tb = L['tabard']

        def panel(sign):
            part = b.P('tabard' + ('F' if sign > 0 else 'B'), tb, lambda p: w_skirt(p, 0.2) if p[1] < waistY - 0.02 else w_torso(p), 40)
            rows = [shY - 0.005, chestY, waistY + 0.05, waistY - 0.03, hipsY - 0.08, (hipsY - 0.08 + hemY) / 2, hemY]
            halfw = [0.1 * W, 0.135 * W, 0.142 * W, 0.15 * W, 0.16 * W, 0.165 * W, 0.168 * W]
            cols = 7

            def zz(y, x):
                if y >= waistY - 0.01:
                    return (torso_z(y, x) if sign > 0 else torso_back_z(y, x)) + sign * 0.013
                if sign > 0:
                    zs = seat_z(max(y, hipsY - 0.1), x)
                else:
                    zs = ring_front(seatR, 0.15 * W, 0.72, x)
                return sign * (abs(zs) + 0.018 + max(0.0, hipsY - 0.1 - y) * 0.1)
            v = [((-hw_ + 2 * hw_ * c_ / (cols - 1)), y, zz(y, -hw_ + 2 * hw_ * c_ / (cols - 1))) for y, hw_ in zip(rows, halfw) for c_ in range(cols)]
            f = [[r * cols + c_, r * cols + c_ + 1, (r + 1) * cols + c_ + 1, (r + 1) * cols + c_] for r in range(len(rows) - 1) for c_ in range(cols - 1)]
            facing(part, v, f, normal=(0, 0, sign))
            hemc = b.P('tabardHem', shade(tb, 0.72), lambda p: w_skirt(p, 0.2), 35)
            hv = [(x, y, zz(hemY, x) + sign * 0.004) for y in (hemY + 0.03, hemY) for x in [-halfw[-1] + 2 * halfw[-1] * c_ / (cols - 1) for c_ in range(cols)]]
            facing(hemc, hv, [[c_, c_ + 1, cols + c_ + 1, cols + c_] for c_ in range(cols - 1)], normal=(0, 0, sign))
        panel(1)
        panel(-1)
        for sxx in (1, -1):   # the shoulder straps joining the panels
            tube(b.P('tabardStrap', shade(tb, 0.85), 'torso', 35), (sxx * 0.085 * W, shY - 0.01, torso_z(shY - 0.01, 0.085) + 0.012), (sxx * 0.09 * W, shY + 0.02, zc(shY) - 0.11 * W), 0.02, 0.02, 6, squash=0.45)
        # a cargo hook hung at the left hip
        hx = seatR + 0.04
        hk = b.P('hook', '#8a8e96', 'hips', 30)
        tube(hk, (hx, waistY - 0.01, 0.0), (hx + 0.004, waistY - 0.16, 0.012), 0.008, 0.008, 6, hard=True)
        pts = [(hx + 0.004, waistY - 0.16, 0.012), (hx + 0.006, waistY - 0.2, 0.04), (hx + 0.006, waistY - 0.185, 0.072), (hx + 0.004, waistY - 0.155, 0.074)]
        for a_, c_ in zip(pts, pts[1:]):
            tube(hk, a_, c_, 0.008, 0.007, 6, hard=True)
        tube(b.P('hookGrip', '#6a4a2a', 'hips', 35), (hx, waistY + 0.01, -0.002), (hx, waistY - 0.03, 0.0), 0.014, 0.014, 7)

    # the belt (and its buckle) round the waist, over whatever is there
    belt_c = L.get('belt', '#4a3020')
    if outfit != 'smock':
        bw = 1.035 if outfit != 'tabard' else 1.11
        loft(b.P('belt', belt_c, 'hips', 50), [ring(waistY - 0.025, TS[0][1] * bw, TS[0][2] * bw, TS[0][3] * bw, N, 0.75, cz=zc(waistY)),
                                              ring(waistY + 0.03, TS[0][1] * bw, TS[0][2] * bw, TS[0][3] * bw, N, 0.75, cz=zc(waistY))])
        if L.get('buckle'):
            fz = TS[0][2] * bw + zc(waistY) + (0.02 if outfit == 'tabard' else 0.004)
            box(b.P('buckle', L['buckle'], 'hips', 20), -0.03, 0.03, waistY - 0.03, waistY + 0.035, fz - 0.008, fz + 0.012)

    # ---------------------------------------------------------------- over the torso: collars, vest, hood, rope
    if outfit == 'mechanic':
        # the shirt's neck band in its trim colour (flat collar points read as stains at play distance), three buttons
        loft(b.P('neckBand', trim, w_torso, 40), [ring(neckY - 0.05, 0.11 * K, 0.094 * K + 0.01, -0.086 * K, N, 0.8, cz=neckZ),
                                                ring(neckY - 0.008, 0.094 * K, 0.08 * K + 0.008, -0.075 * K, N, 0.9, cz=neckZ)])
        bt = b.P('buttons', '#e8dcc0', 'torso', 30)
        for k in range(3):
            y = neckY - 0.13 - k * 0.1
            fz = torso_z(y, 0) + 0.004
            box(bt, -0.011, 0.011, y - 0.011, y + 0.011, fz - 0.004, fz + 0.005)
    if outfit == 'vest':
        # the leather vest over the undershirt: the torso's sections a little larger, open down the front, armholes
        vs = L['vest']
        vr = [ring(y, hw * 1.05 + 0.006, zf * 1.05 + 0.006, zb * 1.05 - 0.006, N, p, cz=zc(y)) for y, hw, zf, zb, p in TS[:-1]]
        vr.append(ring(shY + 0.03, shX - 0.02, 0.09 * W, -0.1 * W, N, 0.7, cz=zc(shY)))
        vp = b.P('vest', vs, w_torso, 45)
        o = len(vp.v)
        vp.v += [p for r in vr for p in r]
        for j in range(len(vr) - 1):
            for i in range(N):
                a_, b_ = j * N + i, j * N + (i + 1) % N
                if i in (0, N - 1) and vr[j][i][2] > 0:   # (the open front: the two faces either side of the centre)
                    continue
                fc = Face(x + o for x in (a_, b_, b_ + N, a_ + N))
                vp.f.append(fc)
        # the rope coil slung from the left shoulder across to the right hip, the coil itself at the hip
        rp = L['rope']
        sp_ = [(0.12 * W, shY + 0.02, zc(shY) + 0.06), (0.03 * W, chestY + 0.02, torso_z(chestY + 0.02, 0.03, 0.01) + 0.02),
               (-0.09 * W, waistY + 0.08, torso_z(waistY + 0.08, -0.09, 0.01) + 0.018), (-0.17 * W, waistY - 0.02, torso_z(waistY, -0.17) - 0.01)]
        for a_, c_ in zip(sp_, sp_[1:]):
            tube(b.P('ropeStrap', rp, 'torso', 50), a_, c_, 0.02, 0.02, 6, cap=False)
        sp_b = [(0.12 * W, shY + 0.02, zc(shY) + 0.06), (0.05 * W, chestY + 0.03, zc(chestY) - 0.145 * W), (-0.08 * W, waistY + 0.06, zc(waistY) - 0.15 * W), (-0.17 * W, waistY - 0.02, -0.06)]
        for a_, c_ in zip(sp_b, sp_b[1:]):
            tube(b.P('ropeStrap', rp, 'torso', 50), a_, c_, 0.02, 0.02, 6, cap=False)
        cc = (-(seatR + 0.03), waistY - 0.07, 0.0)
        for k in range(2):
            torus(b.P('ropeCoil', shade(rp, 1.0 - 0.08 * k), 'hips', 80), (cc[0] - 0.014 * k, cc[1] + 0.008 * k, cc[2]), 0.09 - 0.008 * k, 0.02, (0, 1, 0), (0, 0, 1), 10, 4)
    if outfit == 'smock':
        # the hood lying folded on the back of the shoulders, the smock's drawstring neck
        hd = b.P('hood', shade(shirt, 0.9), 'torso', 50)
        sphere(hd, (0, shY + 0.005, zc(shY) - 0.11 * W), 0.12, 10, 6, (1.25, 0.55, 0.62), exact=True)
        loft(b.P('neckBand', trim, w_torso, 40), [ring(neckY - 0.05, 0.112 * K, 0.095 * K, -0.088 * K, N, 0.8, cz=neckZ),
                                                ring(neckY - 0.005, 0.095 * K, 0.081 * K, -0.076 * K, N, 0.9, cz=neckZ)])

    # ---------------------------------------------------------------- arms and hands
    for s, sx in (('L', 1), ('R', -1)):
        sh, el, hd = bp('sh' + s), bp('el' + s), bp('hand' + s)
        ra = 0.064 * W * (0.94 if fem else 1)
        sleeveless = outfit == 'vest'
        rolled = outfit == 'mechanic'
        sl = skin if sleeveless else shirt
        up = b.P('upper' + s, sl, lambda p, s=s, e=el[1]: {'sh' + s: 1 - smooth(e + 0.06, e - 0.04, p[1]), 'el' + s: smooth(e + 0.06, e - 0.04, p[1])}, 50)
        tube(up, (sh[0] - sx * 0.02, sh[1] + 0.025, sh[2]), el, ra * (0.98 if sleeveless else 1.08), ra * (0.86 if sleeveless else 1.02), 10, cap=False)
        sphere(b.P('elbow' + s, skin if (sleeveless or rolled) else sl, 'el' + s, 50), el, ra * (0.86 if sleeveless or rolled else 1.0), 8, 5, exact=True)
        wrist = lerp(el, hd, 0.84)
        glove = L.get('glove')
        if rolled:   # sleeves rolled above the elbow: a fat roll of cloth, the forearm bare
            tube(b.P('roll' + s, trim, lambda p, s=s, e=el[1]: {'sh' + s: 1 - smooth(e + 0.06, e - 0.04, p[1]), 'el' + s: smooth(e + 0.06, e - 0.04, p[1])}, 40),
                 lerp(sh, el, 0.6), lerp(sh, el, 0.86), ra * 1.24, ra * 1.18, 10)
            tube(b.P('fore' + s, skin, 'el' + s, 50), el, hd, ra * 0.86, ra * 0.66, 10, cap=False)
        elif sleeveless:
            tube(b.P('fore' + s, skin, 'el' + s, 50), el, hd, ra * 0.86, ra * 0.68, 10, cap=False)
        else:
            cuff = outfit == 'smock'
            tube(b.P('fore' + s, sl, 'el' + s, 50), el, wrist, ra * 1.02, ra * (1.16 if cuff else 0.95), 10, cap=False)
            tube(b.P('cuff' + s, trim, 'el' + s, 40), lerp(el, hd, 0.74), lerp(el, hd, 0.9), ra * (1.24 if cuff else 1.02), ra * (1.24 if cuff else 1.0), 10)
        if glove:
            tube(b.P('gloveCuff' + s, glove, 'el' + s, 40), lerp(el, hd, 0.82), lerp(el, hd, 1.0), ra * 1.1, ra * 1.0, 10)
        hr = 0.056 * W * (0.95 if fem else 1)
        ax = [hd[i] - wrist[i] for i in range(3)]
        al = math.sqrt(sum(c * c for c in ax)) or 1
        hc_ = tuple(hd[i] + ax[i] / al * hr * 0.55 for i in range(3))
        hp_ = b.P('hand' + s, glove or skin, 'hand' + s, 60)
        sphere(hp_, hc_, hr, 10, 7)
        hand_detail(hp_, hc_, hr, sx)
        sphere(b.P('shoulder' + s, sl, 'sh' + s, 50), (sh[0] - sx * 0.016, sh[1] + 0.004, sh[2]), ra * 1.04, 8, 5, (1.0, 0.85, 1.0), exact=True)
        if sleeveless:   # (the undershirt's strap over the shoulder)
            tube(b.P('shirtStrap', shirt, 'torso', 40), (sx * 0.1 * W, shY + 0.02, zc(shY) + 0.07 * W), (sx * 0.12 * W, shY + 0.03, zc(shY) - 0.075 * W), 0.03, 0.03, 6, squash=0.4)

    # ---------------------------------------------------------------- neck and head
    tube(b.P('neck', skin, lambda p: {'neck': 1 - smooth(headY - 0.03, headY + 0.03, p[1]), 'head': smooth(headY - 0.03, headY + 0.03, p[1])}, 60),
         (0, neckY - 0.04, neckZ), (0, headY + 0.06, headZ), 0.078 * K, 0.075 * K, 12)
    head_w = lambda p: {'head': 1.0}
    jaw, cheek = pp.get('jaw', 1.0), pp.get('cheek', 1.0)
    HS = []
    for dy, hw, zf, zb, p in HEAD:
        kw = jaw if dy < -0.12 else cheek if dy < -0.03 else 1.0
        HS.append((Hc[1] + dy * K, hw * K * kw, zf * K * (0.97 + 0.03 * kw), zb * K, p))
    HS = refine(HS, (0, 1, 2, 7, 8, 9))
    hp = b.P('head', skin, head_w, 80)
    loft(hp, [ring(y, hw, zf, zb, HEAD_N, p, cz=Hc[2]) for y, hw, zf, zb, p in HS], cap_bottom=True, cap_top=True)

    def front(x, y):
        hw, zf, zb, p = sec_at(HS, y)
        return Hc[2] + ring_front(hw, zf, p, x)

    def back_at(x, y):
        hw, zf, zb, p = sec_at(HS, y)
        return Hc[2] - ring_front(hw, -zb, p, x)

    # the face's features, a hair proud of its surface (flat, LBA-style: no eyeballs)
    eyS = pp.get('eyeS', 1.0)
    ey, ex = Hc[1] - 0.012 * K, 0.064 * K
    lidc = shade(skin, 0.38) if not L.get('hair') or hair in ('#c8c4b8',) else (hair if sum(int(hair[i:i + 2], 16) for i in (1, 3, 5)) < 300 else shade(skin, 0.38))
    for sxx in (1, -1):
        cx = sxx * ex
        on = lambda dx, dy, lift=0.0, cx=cx: (cx + dx, ey + dy, front(cx + dx, ey + dy) + 0.004 + lift)
        w, h = 0.031 * K * eyS, 0.021 * K * eyS
        ts = [2 * math.pi * k / 12 for k in range(12)]
        wq = [on(w * math.cos(t), h * math.sin(t) * (1.0 if math.sin(t) > 0 else 0.82) + sxx * h * 0.1 * math.cos(t)) for t in ts]
        ic, ir = -sxx * w * 0.1, h * 0.86
        iq = [on(ic + ir * 0.92 * math.cos(t), ir * math.sin(t), 0.0012) for t in ts]
        pq = [on(ic + ir * 0.42 * math.cos(t), ir * 0.46 * math.sin(t), 0.0022) for t in ts]
        gl = [on(ic - sxx * ir * 0.35 + ir * 0.16 * math.cos(t), ir * 0.4 + ir * 0.16 * math.sin(t), 0.003) for t in ts[::2]]
        lid = [on(-w * 1.1, h * 0.05, 0.0028), on(-w * 0.55, h * 0.98, 0.0028), on(0, h * 1.14, 0.0028), on(w * 0.55, h * 1.02, 0.0028), on(w * 1.12, h * 0.25, 0.0028),
               on(w * 1.05, h * 0.62, 0.0028), on(w * 0.55, h * 1.42, 0.0028), on(0, h * 1.52, 0.0028), on(-w * 0.55, h * 1.36, 0.0028), on(-w * 1.04, h * 0.42, 0.0028)]
        quads = [(wq, '#efe8da'), (iq, L.get('eyes', '#2a2a20')), (pq, '#121416'), (gl, '#f4f0e8'), (lid, lidc, 'strip')]
        b.eye(on(0, 0), quads)
    # brows: a ribbon over each eye, thickness, the inner end's tilt and a little asymmetry each person's own
    bs, bt, ba = pp.get('browS', 1.0), pp.get('browTilt', 0.0), pp.get('browAsym', 0.0)
    bcol = shade(hair, 1.0) if hair != '#c8c4b8' else '#d8d4cc'
    if sum(int(bcol[i:i + 2], 16) for i in (1, 3, 5)) > 450 and hair != '#c8c4b8':
        bcol = shade(skin, 0.45)
    bw_ = b.P('brows', bcol, head_w, 30)
    for sxx in (1, -1):
        w, h = 0.031 * K, 0.021 * K
        up_ = ba * h * sxx
        line = [(sxx * (ex - w * 1.0), ey + h * (2.25 + bt) + up_), (sxx * ex, ey + h * 2.6 + up_), (sxx * (ex + w * 1.1), ey + h * (2.05 - bt) + up_)]
        thick = [h * 0.42 * bs, h * 0.38 * bs, h * 0.24 * bs]
        vv = []
        for (x, y), t in zip(line, thick):
            vv += [(x, y - t, front(x, y - t) + 0.005), (x, y + t, front(x, y + t) + 0.005)]
        facing(bw_, vv, [[2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1] for i in range(len(line) - 1)], normal=(0, 0, 1))
    # the nose: short and broad, a soft bulb low between the cheeks
    ns, nw = pp.get('noseS', 1.0), pp.get('noseW', 1.25)
    ny = Hc[1] - 0.062 * K
    sphere(b.P('nose', mix(skin, '#c86a50', 0.18), head_w, 70), (0, ny, front(0, ny) - 0.004), 0.03 * K * ns, 8, 6, (nw, 0.82, 0.92))
    # (no cheek pads: sunk balls read as dark facets on the round face; the head's sections give the cheeks)
    # the talking mouth (the rig scales it open with the voice; it is not lip-sync)
    mw, ml, mas = pp.get('mouthW', 1.0), pp.get('mouthLift', 1.0), pp.get('mouthAsym', 0.0)
    mhh = 0.011 * K
    my_ = Hc[1] - 0.112 * K
    mp_, mlens, mt_ = mouth_lens(0.0, my_, 0.036 * K * mw, mhh, 0.0075 * ml * K, front, 9, 0.004)
    if mas:   # (one corner a touch higher: a lived-in face)
        mlens = [(x, y + mas * 0.004 * K * (x / (0.036 * K * mw)), z) for x, y, z in mlens]
    b.mouth(mp_, [(mlens, '#5e2622')], rest=0.3, drop=-0.4 * mhh, tilt=mt_)

    # the fan ears (D4): a half-round fan standing out from each side of the head on its ear bone, swept back, with ribs
    # radiating from the root and a scalloped rim; the inner face a warmer shade
    es, eb = pp.get('earS', 1.0), pp.get('earBack', 0.45)
    ein = mix(skin, '#e09a88', 0.4)
    for s, sx in (('L', 1), ('R', -1)):
        root = tuple(B['ear' + s]['p'])
        Rr, Ru = 0.13 * K * es, 0.104 * K * es
        o_ = (sx * math.cos(eb), 0.06, -math.sin(eb))   # (out and back from the head, a little up)
        u_ = (0.0, 1.0, 0.0)
        nrm = (o_[1] * u_[2] - o_[2] * u_[1], o_[2] * u_[0] - o_[0] * u_[2], o_[0] * u_[1] - o_[1] * u_[0])   # (the fan's face)
        nl = math.sqrt(sum(c * c for c in nrm))
        nrm = tuple(c / nl for c in nrm)
        if nrm[2] < 0:
            nrm = tuple(-c for c in nrm)   # (the front face looks forward)
        th = 0.011 * K
        M = 11
        rim = []
        for k in range(M):
            a = -math.pi / 2 + math.pi * k / (M - 1)
            sc = 1.0 + 0.07 * math.cos((k - (M - 1) / 2) * math.pi / 2.5) if 0 < k < M - 1 else 1.0   # (a lobe between ribs)
            rim.append(tuple(root[i] + o_[i] * Rr * math.cos(a) * sc + u_[i] * Ru * math.sin(a) * sc for i in range(3)))
        base = [tuple(root[i] + u_[i] * Ru * 0.55 * t for i in range(3)) for t in (-1.0, 0.0, 1.0)]
        ear = b.P('ear' + s, skin, 'ear' + s, 60)
        front_v = [tuple(p[i] + nrm[i] * th for i in range(3)) for p in rim + base]
        back_v = [tuple(p[i] - nrm[i] * th for i in range(3)) for p in rim + base]
        # triangles fanning from the root's middle (index M+1) to the rim, both faces, and the rim's edge
        fF = [[M + 1, k, k + 1] for k in range(M - 1)]
        facing(ear, back_v, fF, normal=tuple(-c for c in nrm))
        edge_v = front_v[:M] + back_v[:M]
        facing(ear, edge_v, [[k, k + 1, M + k + 1, M + k] for k in range(M - 1)], ref=root)
        inner = b.P('earIn' + s, ein, 'ear' + s, 60)
        facing(inner, front_v, fF, normal=nrm)
        # the ribs: three raised lines from the root out across the fan (they read as a fan, not a flap)
        rb = b.P('earRib' + s, shade(ein, 0.84), 'ear' + s, 50)
        for a in (-0.62, 0.0, 0.62):
            p0 = tuple(root[i] + o_[i] * Rr * 0.3 * math.cos(a) + u_[i] * Ru * 0.3 * math.sin(a) + nrm[i] * th * 0.9 for i in range(3))
            p1 = tuple(root[i] + o_[i] * Rr * 0.8 * math.cos(a) + u_[i] * Ru * 0.8 * math.sin(a) + nrm[i] * th * 0.9 for i in range(3))
            tube(rb, p0, p1, 0.009 * K, 0.006 * K, 5, squash=0.35, hard=True, cap=False)

    # ---------------------------------------------------------------- hair and headwear (each person's own silhouette)
    def hair_shell(part, line_front, line_side, line_back, lift=0.008, top=0.19, cols=17, rows=6):
        """A shell of hair on the skull above a hairline that runs from the forehead (line_front, dy) round the temples
        (line_side) to the nape (line_back); columns round the head from one temple across the back to the other."""
        vv = []
        for j in range(rows):
            for i in range(cols):
                a = -math.pi * 0.95 + (2 * math.pi * 0.95) * i / (cols - 1)   # (angle from the back, round through the front)
                a = math.pi + a                                                 # (0 = front)
                ca = math.cos(a)
                hl = (line_front if ca > 0 else line_back) * abs(ca) + line_side * (1 - abs(ca))
                y = Hc[1] + (hl + (top - hl) * (j / (rows - 1)) ** 0.9) * K
                hw, zf, zb, p = sec_at(HS, y)
                sa = math.sin(a)
                sxv = math.copysign(abs(sa) ** p, sa)
                cc = math.copysign(abs(ca) ** p, ca)
                x = hw * sxv
                z = Hc[2] + (zf * cc if cc >= 0 else -zb * cc)
                r = math.hypot(x, z - Hc[2]) or 1
                lift_y = lift * (j / (rows - 1))
                vv.append((x + x / r * lift, y + lift_y, z + (z - Hc[2]) / r * lift))
        ff = [[j * cols + i, j * cols + i + 1, (j + 1) * cols + i + 1, (j + 1) * cols + i] for j in range(rows - 1) for i in range(cols - 1)]
        vv.append((0, Hc[1] + top * K + lift * 1.6, Hc[2] - 0.01 * K))
        c = len(vv) - 1
        ff += [[(rows - 1) * cols + i, (rows - 1) * cols + i + 1, c] for i in range(cols - 1)]
        facing(part, vv, ff, ref=(0, Hc[1] - 0.05 * K, Hc[2]))

    def band(part, y0, y1, lift):
        rr = []
        for y in (y0, y1):
            hw, zf, zb, p = sec_at(HS, Hc[1] + y * K)
            rr.append(ring(Hc[1] + y * K, hw + lift, zf + lift, zb - lift, HEAD_N, p, cz=Hc[2]))
        loft(part, rr)

    if name == 'tessa':
        # short dark hair, a thick fringe pushed up under a rolled rust headband knotted at the back, two short tails
        hair_shell(b.P('hair', hair, head_w, 65), 0.105, 0.03, -0.085, lift=0.011)
        fr = b.P('fringe', shade(hair, 1.1), head_w, 50)
        yq = Hc[1] + 0.148 * K
        sphere(fr, (0.012 * K, yq, front(0.012 * K, yq) - 0.012 * K), 0.1 * K, 10, 6, (0.95, 0.4, 0.5), exact=True)   # (the hair pushed up out of the band, swept to her left)
        sphere(fr, (0.05 * K, yq + 0.012 * K, front(0.05 * K, yq) - 0.02 * K), 0.05 * K, 6, 4, (1.0, 0.55, 0.7), exact=True)
        hb = b.P('headband', L['headband'], head_w, 60)
        band(hb, 0.094, 0.128, 0.017 * K)
        band(b.P('headbandRoll', shade(L['headband'], 0.86), head_w, 60), 0.088, 0.096, 0.02 * K)
        kz = back_at(0, Hc[1] + 0.11 * K) - 0.018 * K
        kn_ = b.P('knot', shade(L['headband'], 0.92), head_w, 60)
        sphere(kn_, (0, Hc[1] + 0.112 * K, kz), 0.024 * K, 8, 6, (1.2, 0.9, 0.9))
        for sxx in (1, -1):
            tube(kn_, (sxx * 0.008, Hc[1] + 0.1 * K, kz - 0.005), (sxx * 0.04 * K, Hc[1] + 0.02 * K, kz - 0.03 * K), 0.016 * K, 0.006 * K, 6, squash=0.4)
    elif name == 'docker1':
        # a knit cap pulled down to the ears, a rolled brim and a nub on top; dark hair showing at the nape
        hair_shell(b.P('hair', hair, head_w, 60), 0.06, -0.01, -0.09, lift=0.007, top=0.1, rows=3)
        cap = b.P('cap', L['cap'], head_w, 88)   # (knit: smooth, no facets)
        hair_shell(cap, 0.085, 0.07, 0.02, lift=0.02 * K, top=0.2)
        band(b.P('capBrim', shade(L['cap'], 0.82), head_w, 70), 0.06, 0.105, 0.027 * K)
        sphere(b.P('capNub', shade(L['cap'], 0.9), head_w, 80), (0, Hc[1] + 0.215 * K, Hc[2] - 0.012 * K), 0.024 * K, 6, 4, (1, 0.7, 1), exact=True)
    elif name == 'docker2':
        # a wide straw cone hat (the sun on the platforms) on a crown band; short hair below it at the back
        hair_shell(b.P('hair', hair, head_w, 60), 0.09, 0.02, -0.08, lift=0.008)
        hat = b.P('strawHat', L['strawHat'], head_w, 40)
        yb_, Rb_, ya_ = Hc[1] + 0.145 * K, 0.33 * K, Hc[1] + 0.3 * K
        cz_ = Hc[2] - 0.012 * K
        M = 24
        rim = [(Rb_ * math.sin(2 * math.pi * k / M), yb_ - 0.012 * math.cos(4 * math.pi * k / M), cz_ + Rb_ * math.cos(2 * math.pi * k / M)) for k in range(M)]
        mid = [(Rb_ * 0.55 * math.sin(2 * math.pi * k / M), yb_ + (ya_ - yb_) * 0.5, cz_ + Rb_ * 0.55 * math.cos(2 * math.pi * k / M)) for k in range(M)]
        vv = rim + mid + [(0, ya_, cz_)]
        ff = [[k, (k + 1) % M, M + (k + 1) % M, M + k] for k in range(M)] + [[M + k, M + (k + 1) % M, 2 * M] for k in range(M)]
        facing(hat, vv, ff, ref=(0, yb_ - 0.2, cz_))
        under = b.P('strawUnder', shade(L['strawHat'], 0.72), head_w, 40)
        uv = [(x, y - 0.008, z) for x, y, z in rim] + [(x * 0.5, y - 0.03, z * 0.5 + cz_ * 0.5) for x, y, z in rim]
        facing(under, uv, [[k, (k + 1) % M, M + (k + 1) % M, M + k] for k in range(M)], normal=(0, -1, 0))
        band(b.P('hatBand', '#8a5a3a', head_w, 60), 0.11, 0.15, 0.012 * K)
    elif name == 'docker3':
        # an older docker: grey hair round the back and sides only (the crown bare), a cloth band round the forehead,
        # grey whisker tufts on the jaw
        hair_shell(b.P('hair', hair, head_w, 60), 0.052, -0.01, -0.09, lift=0.01, top=0.062, rows=3)   # (below the band: it never shows through it)
        hb = b.P('headband', L['headband'], head_w, 60)
        band(hb, 0.06, 0.1, 0.014 * K)
        wh = b.P('whiskers', hair, head_w, 50)
        for sxx in (1, -1):
            x0, y0 = sxx * 0.142 * K, Hc[1] - 0.092 * K
            sphere(wh, (x0, y0, Hc[2] + 0.035 * K), 0.07 * K, 8, 5, (0.36, 1.0, 0.95), exact=True)

    if os.environ.get('PARTS'):   # (PARTS=1: each part's triangles, the heaviest first)
        cnt = {}
        for pt in b.parts:
            k = pt.name.rstrip('LR') if pt.name[-1:] in 'LR' and pt.name[:-1] else pt.name
            cnt[k] = cnt.get(k, 0) + sum(len(f) - 2 for f in pt.f)
        print(name, sorted(cnt.items(), key=lambda q: -q[1]))
    os.makedirs(OUTDIR, exist_ok=True)
    tris = b.export(os.path.join(OUTDIR, name + '.json'))
    print(name, 'tris', tris, 'parts', len(b.parts))
    return name


names = [n for n in ALL if n in PEOPLE and (n in ONLY if ONLY else True)]
built = [build(n) for n in names]
idx = os.path.join(OUTDIR, 'index.json')
have = sorted(set(json.load(open(idx)) if os.path.exists(idx) else []) | set(built))
json.dump(have, open(idx, 'w'))
print('index', len(have))
