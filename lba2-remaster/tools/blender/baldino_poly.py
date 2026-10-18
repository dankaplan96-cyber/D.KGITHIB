# Baldino as a low-poly model after LBA2's in-game Baldino (Blender, headless; `pip install bpy`):
#   python tools/blender/baldino_poly.py art/characters/skeletons.json assets/poly [art/characters/baldino/baldino_poly.blend]
# (the skeleton file holds every character, as tools/dump-skeletons.mjs writes it; the output may be a folder or a
# .json file; the .blend is written only when named.)
#
# SRC-2 (docs/lba3-team/SOURCE_INVENTORY.md, docs/character-review.md §16). Identified in the user's own LBA2 files:
# BODY.HQR body 139 (File3D 93, generic body 0), the only body of File3D 93, placed in scenes 38 (Desert Island),
# 48 (Citadel) and 138 (Celebration) with talk colour 13 — the colour of the radio voice that says "Baldino here!" in
# scene 1 — and in scene 138 asking Twinsen for gazogem "to repair our vessel" (Zoé, elsewhere: "get Baldino on
# Otringal… we need his ship"). Every number below is a measurement of that body in fractions of H = 1238 units (the
# cast's common unit: Twinsen's skull top), taken with tools/lba-source/measure.py and contours.py; no original
# geometry, palette or animation is in this file or its output. He stands 0.888 H (1,099 units) tall.
#
# Our own mesh on the game's own Baldino skeleton (characters.js LOOKS.baldino: the original's joints, plus an ear
# bone each side and three trunk bones), so every rig.js animation drives it and rig.js swings his ears and trunk.
# What it rebuilds that the earlier model (cast_poly.py build, a Quetch old man) did not: the race. A Grobo: a big
# grey-violet head low on the shoulders, a trunk curling out and down to the belt, great flat ears, goggles worn over
# the eyes with blue lenses and a strap across the brow, a white stand-up collar behind the head, a pear-shaped olive
# smock with a low square neckline over a grey chest, brown trousers on short square legs set wide apart, thin arms
# (green sleeves, grey forearms) with small round grey hands, a little tail.
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402
from lbapoly import Builder, loft, ring, smooth, sphere, tube  # noqa: E402

args = [a for a in sys.argv[1:] if not a.endswith('.py')]
SKEL, OUT = args[0], args[1]
BLEND = args[2] if len(args) > 2 else None
if os.path.isdir(OUT) or not OUT.endswith('.json'):
    OUT = os.path.join(OUT, 'baldino.json')
ALL = json.load(open(SKEL))
S = ALL.get('baldino', ALL)
B = S['bones']
BH = 2.006   # metres per H: the cast's scale (Twinsen's 1,238 units to the skull = 2.006 m), so he is 1.78 m tall

# ---- colours: the original's palette ramps at the shade our LbaMaterial shows as the lit colour (≈ shade 9-10, as
# for Twinsen and Zoé); the collar is a solid (unshaded) polygon in the original: drawn flat here (normals up)
COL = {
    'skin': '#7f7787',     # byte 208, ramp 13 (dithered Gouraud): head, trunk, ears, chest, forearms, hands
    'green': '#67734b',    # byte 112, ramp 7: the smock and the sleeves
    'brown': '#6b472b',    # byte 16, ramp 1: trousers and legs
    'collar': '#9d9d9a',   # byte 60, ramp 3 shade 12 (#bbbbb7, solid): renders #bbbbb7 with UP normals
    'frame': '#1b7b83',    # byte 160, ramp 10: the goggles' strap
    'lens': '#236787',     # byte 192, ramp 12 (transparent in the original, over the grey): the lenses, opaque here
    'mouth': '#2f7f6d',    # byte 144, ramp 9: the mouth under the trunk
    'eye': '#abffff',      # byte 175 (spheres): small bright cyan eyes, seen through the lenses
}
UP = (0.0, 1.0, 0.0)   # (one constant shade from every side, as the original's solid polygon: t = n·L = 0.8)

# ---- the body (groups 2 and 3: trousers' seat and smock), horizontal sections (y, half-width, front, back) in H, arms
# and head excluded (contours.py --groups 2,3,4, y 0.23-0.53, and the group extents). The trousers' top is the smock's
# hem (one surface, the colour changes at the belt line y 0.269); the smock is a pear: widest at the hem (±0.247),
# narrowing to ±0.12 under the head.
BODY = [
    (0.200, 0.215, 0.215, -0.170), (0.215, 0.250, 0.253, -0.204), (0.235, 0.249, 0.258, -0.212), (0.255, 0.245, 0.265, -0.224),
    (0.280, 0.242, 0.266, -0.226), (0.305, 0.233, 0.259, -0.216), (0.330, 0.223, 0.253, -0.205), (0.355, 0.215, 0.246, -0.194),
    (0.380, 0.205, 0.240, -0.183), (0.405, 0.195, 0.233, -0.173), (0.430, 0.185, 0.226, -0.162), (0.455, 0.172, 0.210, -0.151),
    (0.480, 0.157, 0.193, -0.133), (0.505, 0.138, 0.176, -0.114), (0.530, 0.118, 0.158, -0.095), (0.548, 0.090, 0.120, -0.075),
]
CROTCH = (0.0, 0.165, 0.0)
BELT = 0.269     # trousers below, smock above
# the neckline: a wide, low square opening in front showing the grey chest — its lower edge level at y 0.431 from
# x −0.107 to +0.107, the sides opening out to ±0.134 at the shoulders' front (y 0.538)
NECK_Y, NECK_X0, NECK_X1, NECK_TOP = 0.431, 0.107, 0.134, 0.538


def body_field(p):
    """> 0 trousers (brown), < 0 elsewhere; second field: > 0 grey chest"""
    return BELT - p[1]


def chest_field(p):
    x, y, z = p
    if z < 0.02:
        return -1.0
    hx = NECK_X0 + (NECK_X1 - NECK_X0) * max(0.0, (y - NECK_Y) / (NECK_TOP - NECK_Y))
    return min(y - NECK_Y, hx - abs(x))


# the legs: short square stumps (groups 5-8), from the seat to the ground, centred at x ±0.162; ±0.054 square from
# the knee (y 0.107) down; wider where they leave the seat
LEG_X = 0.162
LEG = [(0.215, 0.085, 0.09, -0.085), (0.16, 0.068, 0.07, -0.068), (0.107, 0.054, 0.054, -0.054), (0.0, 0.054, 0.054, -0.054)]
TAIL = ((0.0, 0.221, -0.215), (0.0, 0.188, -0.285))   # a line in the original

# ---- the head (group 4): rings (y, half-width, front, back) in H from the jowls (0.538, ±0.188 at the corners) to the
# crown (0, 0.861, −0.016); the face is flat and upright (the goggles' plane z 0.199, the eyes set back at 0.15), the
# back of the head at −0.15
HEAD = [
    (0.540, 0.184, 0.170, -0.045), (0.565, 0.178, 0.214, -0.080), (0.592, 0.170, 0.222, -0.108), (0.646, 0.164, 0.228, -0.138),
    (0.700, 0.162, 0.212, -0.150), (0.740, 0.161, 0.204, -0.146), (0.780, 0.158, 0.198, -0.136), (0.800, 0.148, 0.165, -0.124),
    (0.815, 0.134, 0.100, -0.108), (0.838, 0.080, 0.050, -0.066), (0.853, 0.040, 0.020, -0.036),
]
CROWN = (0.0, 0.861, -0.012)
# the trunk (groups 14-16): its centre line (y, z) and radius, from the face down and out in a curl to the belt line
# (the tip at y 0.27, z 0.43-0.48 in the original's rest pose; ours stops a little nearer, z 0.42 — see §16)
TRUNK = [(0.705, 0.17, 0.085), (0.680, 0.27, 0.075), (0.640, 0.345, 0.066), (0.585, 0.405, 0.059), (0.520, 0.440, 0.055),
         (0.450, 0.452, 0.051), (0.380, 0.447, 0.047), (0.320, 0.430, 0.042), (0.275, 0.410, 0.037)]
MOUTH = [(-0.081, 0.592), (0.081, 0.592), (0.0, 0.558)]     # byte 144: a small triangle under the trunk
# the ears (groups 17-20): flat, facing forward in the rest pose, a kite from the root edge (x 0.175, y 0.645-0.807,
# z 0.053) to a top tip (0.242, 0.888) and a long lower tip (0.296, 0.538); in his clips they rest turned 15-46° back
EAR = [(0.175, 0.807), (0.242, 0.888), (0.268, 0.80), (0.296, 0.538), (0.173, 0.645)]
EAR_Z, EAR_BACK, EAR_T = 0.053, math.radians(32), 0.011
# the goggles: two hexagonal lenses (x 0.086-0.162, y 0.700-0.780) on the face's plane z 0.199, a strap (byte 160)
# across the brow over their tops (y 0.780-0.796) to the head's sides (±0.162, 0.78, 0.171); the eyes behind them at
# (±0.118, 0.732)
LENS = [(0.086, 0.758), (0.107, 0.780), (0.134, 0.780), (0.162, 0.753), (0.134, 0.700), (0.107, 0.700)]
LENS_Z = 0.199
EYE_C, EYE_R = (0.121, 0.738), 0.0095
# the collar (byte 60, solid): white, standing up round the back of the head from the shoulders, a chevron seen from
# behind: its top edge rises from the cheeks (±0.156, 0.641) to the back of the head (0, 0.753), its lower edge from
# the shoulders (±0.134, 0.538) to (0, 0.673); open in front (from the jowls' corners, ±0.188, 0.538)
COLLAR_SIDE, COLLAR_BACK = 0.646, 0.753
# the arms (groups 9-12): green sleeves from the shoulder (±0.162, 0.484) to the elbow (±0.269, 0.322), radius 0.067 →
# 0.054; grey forearms narrowing to the wrist (±0.296, 0.161); a round grey hand there (a sphere, r 0.027)
SLEEVE_R, FORE_R, HAND_R = (0.067, 0.054), (0.046, 0.018), 0.03

bp = lambda n: tuple(B[n]['p'])
m = lambda p: tuple(c * BH for c in p)
bpy.ops.wm.read_factory_settings(use_empty=True)
b = Builder('baldino', B)


def lerp_rows(rows, y):
    for a, c in zip(rows, rows[1:]):
        if a[0] <= y <= c[0]:
            t = (y - a[0]) / (c[0] - a[0])
            return tuple(a[k] + (c[k] - a[k]) * t for k in range(1, len(a)))
    return rows[0][1:] if y < rows[0][0] else rows[-1][1:]


def split_loft(rings, fields, parts):
    """Loft the rings; each quad is cut by the fields in turn (> 0 side to that field's part), what is left goes to the
    last part. Corners are welded within each part, so the shading stays smooth across the quads (as zoe_poly.py)."""
    n = len(rings[0])
    idx = {id(p): {} for p in parts}

    def vid(part, v):
        k = tuple(round(c, 6) for c in v)
        d = idx[id(part)]
        if k not in d:
            d[k] = len(part.v)
            part.v.append(k)
        return d[k]

    def clip(poly, f, sgn):
        out = []
        for k in range(len(poly)):
            v0, v1 = poly[k], poly[(k + 1) % len(poly)]
            f0, f1 = sgn * f(tuple(c / BH for c in v0)), sgn * f(tuple(c / BH for c in v1))
            if f0 >= 0:
                out.append(v0)
            if (f0 >= 0) != (f1 >= 0):
                a_, c_ = (v0, v1) if v0 < v1 else (v1, v0)
                fa, fc = (f0, f1) if v0 < v1 else (f1, f0)
                t = fa / (fa - fc)
                out.append(tuple(x + (y - x) * t for x, y in zip(a_, c_)))
        return out

    def emit(part, poly):
        if len(poly) >= 3:
            ids = [vid(part, v) for v in poly]
            ids = [x for k, x in enumerate(ids) if x not in ids[:k]]
            if len(ids) >= 3:
                part.f.append(ids)
    for j in range(len(rings) - 1):
        for i in range(n):
            rest = [rings[j][i], rings[j][(i + 1) % n], rings[j + 1][(i + 1) % n], rings[j + 1][i]]
            for f, part in zip(fields, parts):
                emit(part, clip(rest, f, 1))
                rest = clip(rest, f, -1)
            emit(parts[-1], rest)


# ------------------------------------------------------------------ the body: trousers' seat, smock and chest, one loft
hipsY, torsoY, neckY = bp('hips')[1], bp('torso')[1], bp('neck')[1]


def w_body(p):
    y = p[1]
    t = smooth(hipsY + 0.02, torsoY + 0.12, y)
    n = smooth(neckY - 0.06, neckY + 0.04, y)
    return {k: v for k, v in (('hips', 1 - t), ('torso', t * (1 - n)), ('neck', t * n)) if v > 1e-4}


ys = sorted(set([round(r[0], 4) for r in BODY] + [round(0.215 + 0.012 * k, 4) for k in range(28) if 0.215 + 0.012 * k < 0.548]))
NB = 36
body_rings = [ring(y * BH, *(v * BH for v in lerp_rows(BODY, y)), NB, 0.72) for y in ys]
pants = b.P('trousers', COL['brown'], w_body, 50)
chest = b.P('chest', COL['skin'], w_body, 50)
smock = b.P('smock', COL['green'], w_body, 50)
split_loft(body_rings, [body_field, chest_field], [pants, chest, smock])
# the seat's underside: from the lowest ring to the crotch
o = len(pants.v)
r0 = body_rings[0]
pants.add(r0 + [m(CROTCH)], [[(i + 1) % NB, i, NB] for i in range(NB)])
# the smock's top, closed under the head
r1 = body_rings[-1]
smock.add(r1 + [m((0.0, BODY[-1][0] + 0.01, 0.01))], [[i, (i + 1) % NB, NB] for i in range(NB)])
tube(b.P('tail', COL['skin'], 'hips', 40), m(TAIL[0]), m(TAIL[1]), 0.012 * BH, 0.006 * BH, 6)

# ------------------------------------------------------------------ the legs: short square stumps, wide apart
for s_, sx in (('L', 1), ('R', -1)):
    kn = bp('knee' + s_)

    def w_leg(p, s_=s_, kn=kn):
        y = p[1]
        top = smooth(0.205 * BH, 0.17 * BH, y)
        knee = smooth(kn[1] + 0.05, kn[1] - 0.05, y)
        foot = smooth(0.05, 0.0, y) * 0.5
        w = {'hips': 1 - top, 'hip' + s_: top * (1 - knee), 'knee' + s_: top * knee * (1 - foot), 'foot' + s_: top * knee * foot}
        return {k: v for k, v in w.items() if v > 1e-4}
    leg = b.P('leg' + s_, COL['brown'], w_leg, 40)
    loft(leg, [ring(y * BH, hw * BH, zf * BH, zb * BH, 12, 0.35, cx=sx * LEG_X * BH) for y, hw, zf, zb in reversed(LEG)], cap_bottom=True)

# ------------------------------------------------------------------ the arms: green sleeve, grey forearm, a round hand
for s_, sx in (('L', 1), ('R', -1)):
    shp, el, hd = Vector(bp('sh' + s_)), Vector(bp('el' + s_)), Vector(bp('hand' + s_))
    e = el.y
    up = b.P('sleeve' + s_, COL['green'], lambda p, s_=s_, e=e: {'sh' + s_: 1 - smooth(e + 0.06, e - 0.02, p[1]), 'el' + s_: smooth(e + 0.06, e - 0.02, p[1])}, 50)
    top = shp + Vector((-sx * 0.04, 0.03, -0.02))
    tube(up, tuple(top), tuple(el), SLEEVE_R[0] * BH, SLEEVE_R[1] * BH, 9)
    sphere(up, tuple(top), SLEEVE_R[0] * BH * 0.98, 9, 5)
    d = (hd - el).normalized()
    tube(b.P('fore' + s_, COL['skin'], 'el' + s_, 50), tuple(el - d * 0.03), tuple(hd), FORE_R[0] * BH, FORE_R[1] * BH, 8)
    sphere(b.P('hand' + s_, COL['skin'], 'hand' + s_, 60), tuple(hd + d * 0.035), HAND_R * BH, 10, 7)

# ------------------------------------------------------------------ the head
head = b.P('head', COL['skin'], 'head', 55)
HN = 28
head_rings = [ring(y * BH, hw * BH, zf * BH, zb * BH, HN, 0.7) for y, hw, zf, zb in HEAD]
loft(head, head_rings)
o = len(head.v)
head.add([m((0.0, HEAD[0][0] - 0.004, 0.06)), m(CROWN)], [])
L_ = len(head_rings) - 1
head.f += [[(i + 1) % HN, i, o] for i in range(HN)] + [[L_ * HN + i, L_ * HN + (i + 1) % HN, o + 1] for i in range(HN)]
htree = BVHTree.FromPolygons([Vector(v) for v in head.v], head.f)


def on_face(x, y, lift=0.003):
    hit = htree.ray_cast(Vector((x * BH, y * BH, 1.5)), Vector((0, 0, -1)))
    z = hit[0].z if hit[0] is not None else 0.15 * BH
    return (x * BH, y * BH, z + lift)


# the trunk: a tube along its centre line, tapering; weighted head → trunk0 → trunk1 → trunk2 down its length
TB = [bp('trunk0'), bp('trunk1'), bp('trunk2')]


def w_trunk(p):
    y = p[1]
    a = smooth(TB[0][1] + 0.08, TB[0][1] - 0.12, y)          # (the root stays with the face)
    c = smooth(TB[1][1] + 0.12, TB[1][1] - 0.06, y)
    d = smooth(TB[2][1] + 0.10, TB[2][1] - 0.06, y)
    return {k: v for k, v in (('head', 1 - a), ('trunk0', a * (1 - c)), ('trunk1', c * (1 - d)), ('trunk2', d)) if v > 1e-4}


trunk = b.P('trunk', COL['skin'], w_trunk, 60)
TN = 10
tr = []
for k, (y, z, r) in enumerate(TRUNK):
    a = TRUNK[max(0, k - 1)]
    c = TRUNK[min(len(TRUNK) - 1, k + 1)]
    ty, tz = c[0] - a[0], c[1] - a[1]
    ln = math.hypot(ty, tz)
    ny, nz = -tz / ln, ty / ln            # (the normal in the y-z plane)
    tr.append([m((r * math.sin(2 * math.pi * i / TN), y + ny * r * math.cos(2 * math.pi * i / TN), z + nz * r * math.cos(2 * math.pi * i / TN))) for i in range(TN)])
loft(trunk, tr, cap_top=True)
# the mouth: a small teal triangle laid on the face under the trunk's root
mo = b.P('mouth', COL['mouth'], 'head', 20)
mv = [on_face(x, y, 0.004) for x, y in MOUTH]
front_facing = (Vector(mv[1]) - Vector(mv[0])).cross(Vector(mv[2]) - Vector(mv[0])).z > 0
mo.add(mv, [[0, 1, 2] if front_facing else [0, 2, 1]])

# the ears: flat kites with a little thickness, turned back on their root edge
for s_, sx in (('L', 1), ('R', -1)):
    root = Vector((sx * EAR[0][0], 0, EAR_Z))
    ca, sa = math.cos(EAR_BACK), math.sin(EAR_BACK)

    def rot(x, y, z):
        dx, dz = x - root.x, z - root.z
        # (turn the ear's outer edge back about the vertical through its root: Ry(+θ) on the left, mirrored)
        return (root.x + dx * ca + sx * dz * sa, y, root.z - sx * dx * sa + dz * ca)
    ear = b.P('ear' + s_, COL['skin'], lambda p, s_=s_, sx=sx: {'head': 1 - smooth(0.0, 0.03 * BH, sx * p[0] - EAR[0][0] * BH), 'ear' + s_: smooth(0.0, 0.03 * BH, sx * p[0] - EAR[0][0] * BH)}, 35)
    front = [m(rot(sx * x, y, EAR_Z + EAR_T / 2)) for x, y in EAR]
    back = [m(rot(sx * x, y, EAR_Z - EAR_T / 2)) for x, y in EAR]
    n = len(EAR)
    vv = front + back
    ff = [list(range(n)) if sx > 0 else list(reversed(range(n))), [n + i for i in (reversed(range(n)) if sx > 0 else range(n))]]
    ff += [[i, (i + 1) % n, n + (i + 1) % n, n + i] if sx < 0 else [(i + 1) % n, i, n + i, n + (i + 1) % n] for i in range(n)]
    ear.add(vv, ff)

# the goggles: a hexagonal lens on each eye standing a little proud of the face (the original's are transparent:
# opaque here, a dark sea-blue), the eye a small bright dot just in front of the glass (it blinks)
for s_, sx in (('L', 1), ('R', -1)):
    hexa = [(sx * x, y) for x, y in LENS]
    lz = max(max(on_face(x, y, 0.0)[2] for x, y in hexa) / BH + 0.006, LENS_Z)
    lens = b.P('lens' + s_, COL['lens'], 'head', 30)
    K = len(hexa)
    vv = [m((x, y, lz)) for x, y in hexa] + [on_face(x, y, -0.004) for x, y in hexa]
    ff = [list(range(K)), ]
    ff += [[k, K + k, K + (k + 1) % K, (k + 1) % K] for k in range(K)]
    # (wound to face out: the front cap counter-clockwise seen from the front)
    if (Vector(vv[1]) - Vector(vv[0])).cross(Vector(vv[2]) - Vector(vv[0])).z < 0:
        ff = [list(reversed(f)) for f in ff]
    lens.add(vv, ff)
    ex, ey = sx * EYE_C[0], EYE_C[1]
    b.eye(m((ex, ey, lz + 0.003)), [([m((ex + EYE_R * math.cos(2 * math.pi * k / 8), ey + EYE_R * math.sin(2 * math.pi * k / 8), lz + 0.003)) for k in range(8)], COL['eye'])])
# the strap: a band laid on the brow from one side of the head to the other, between the lenses' tops
st = b.P('strap', COL['frame'], 'head', 40)
xs = [-0.164 + 0.328 * k / 16 for k in range(17)]
y0, y1 = 0.776, 0.794
vv = []
for x in xs:
    if abs(x) > 0.155:      # (round the side of the head: back to z 0.15)
        p0, p1 = m((x, y0, 0.16)), m((x, y1, 0.15))
        vv += [p0, p1]
    else:
        vv += [on_face(x, y0, 0.005), on_face(x, y1, 0.005)]
st.add(vv, [[2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1] for i in range(len(xs) - 1)])

# ------------------------------------------------------------------ the collar: standing up round the back of the head
headY = bp('head')[1]


def w_collar(p):
    t = smooth(0.56 * BH, 0.70 * BH, p[1])
    return {k: v for k, v in (('torso', 1 - t), ('head', t)) if v > 1e-4}


col = b.P('collar', COL['collar'], w_collar, 60)
col.normal = UP
CK = 14
cv = []
for k in range(CK + 1):
    a = math.pi * 0.42 + (math.pi * 1.16) * k / CK          # from the left front round the back to the right front
    s, c = math.sin(a), math.cos(a)
    ytop = COLLAR_BACK - (COLLAR_BACK - COLLAR_SIDE) * abs(s)   # (a chevron at the back: straight edges to the peak)
    ybot = 0.673 - (0.673 - 0.540) * abs(s)                     # (its lower edge too: grey neck below it)
    rx, rz = 0.19, 0.178
    cz = 0.0
    cv += [m((s * rx, ybot, cz + c * rz)), m((s * (rx - 0.012), ytop, cz + c * (rz - 0.005)))]
col.add(cv, [[2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1] for i in range(CK)])

os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
tris = b.export(OUT)
# The trunk's underside, the jowls and the lower face face down, where our ramp runs toward black (the original's grey
# ramp stops at a dark mauve, shade 4 #3f3743): their normals are bent a little up and forward, as Zoé's lower face.
J = json.load(open(OUT))
skin_rgb = [int(COL['skin'][i:i + 2], 16) for i in (1, 3, 5)]
bend = Vector((0.0, 0.6, 0.8)).normalized()
for v in range(len(J['pos']) // 3):
    x, y, z = J['pos'][3 * v:3 * v + 3]
    if J['col'][3 * v:3 * v + 3] == skin_rgb and y > 0.5 * BH and z > 0.0:
        n = Vector(J['nrm'][3 * v:3 * v + 3])
        if n.y < 0.2:
            J['nrm'][3 * v:3 * v + 3] = [round(c, 4) for c in (n + bend * 0.35 * smooth(0.2, -0.6, n.y)).normalized()]
json.dump(J, open(OUT, 'w'), separators=(',', ':'))
print('baldino tris', tris, '->', OUT)
if BLEND:
    os.makedirs(os.path.dirname(os.path.abspath(BLEND)), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND))
    print('blend', BLEND)
