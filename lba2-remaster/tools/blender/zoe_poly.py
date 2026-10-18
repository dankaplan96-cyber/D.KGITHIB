# Zoé as a low-poly model after LBA2's in-game Zoé (Blender, headless; `pip install bpy`):
#   python tools/blender/zoe_poly.py art/characters/skeletons.json assets/poly [art/characters/zoe/zoe_poly.blend]
# (the skeleton file holds every character, as tools/dump-skeletons.mjs writes it; the output may be a folder or a
# .json file; the .blend is written only when named.)
#
# SRC-1 (docs/lba3-team/SOURCE_INVENTORY.md, docs/character-review.md §15). Identified in the user's own LBA2 files:
# BODY.HQR body 26 (File3D 15, generic body 0; body 27 is the same File3D's generic body 18), the object that speaks
# with LM_MESSAGE_ZOE and the engine's Zoé talk colour (COUL_ZOE 4) in scene 0, Twinsen's house. Every number below
# is a measurement of that body in fractions of its height H (1238 units to the top of the skull), taken with
# tools/lba-source/measure.py and contours.py; no original geometry, palette or animation is in this file or its output.
# Our own mesh on the game's own Zoé skeleton (unchanged), so every rig.js animation drives it.
#
# What it rebuilds that the earlier cast_poly.py build_zoe did not:
#   - her own head (the earlier one was Twinsen's head sections narrowed): a narrow face carried forward, a pointed
#     nose, wide red lips turned up at the corners, small dark slanted eyes under brown lids, blue earrings
#   - the outfit's colour layout: a shallow V in front (to 0.726 H), straps on the outer shoulders, an open back with a
#     red strap up the spine that forks to the shoulders (a halter), the necklace
#   - the original's colours: the palette ramps' mid shades the game shows (skin ramp 2, red ramp 4, shoes ramp 8)
#     and golden hair (palette 106) drawn flat like LBA2's sphere discs, not pale cream balls with highlights
#   - pointed hands (the forearm narrowing to a tip, as the original's), not balls
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402
from lbapoly import Builder, lerp, loft, ring, smooth, sphere, tube  # noqa: E402

args = [a for a in sys.argv[1:] if not a.endswith('.py')]
SKEL, OUT = args[0], args[1]
BLEND = args[2] if len(args) > 2 else None
if os.path.isdir(OUT) or not OUT.endswith('.json'):
    OUT = os.path.join(OUT, 'zoe.json')
ALL = json.load(open(SKEL))
S = ALL.get('zoe', ALL)
B = S['bones']
ZH = 1.95   # metres per H on the game's Zoé skeleton (hips 0.95, shoulders 1.47, neck 1.56, head 1.63)

# ---- colours: the original's palette ramp shades as the game's LbaMaterial shows them (vertex colour = the mid-lit
# shade, as for Twinsen: ramp shade ~9); hair: palette 106 drawn flat (see HAIR_UP)
COL = {
    'skin': '#d9a679',      # byte 32, ramp 2 (Twinsen's skin byte; his #e2bc90): a little warmer, so the pale end of our
                            # ramp stays warm skin in close-ups instead of chalk (the original's ramp: #9b6f57 → #fffbcf)
    'red': '#b32b27',       # byte 64, ramp 4 (dithered Gouraud): outfit and lips
    'shoe': '#3f7b47',      # byte 128, ramp 8
    'brown': '#8f634b',     # byte 30, ramp 1 shade 14: the eyelids and the shade under the nose
    'eye': '#2f474b',       # byte 181, solid
    'blue': '#1b4b67',      # byte 197: the necklace and earrings (lines in the original)
    'hair': '#cc8f00',      # renders #e3af6b with HAIR_UP (palette 106 #e3af53)
}
# A constant shade for the hair: with every normal straight up LbaMaterial gives t = n·L = 0.8 from any side
# (out = 1.025·base + 0.15 in linear light), the way LBA2 draws its spheres as flat unlit discs.
HAIR_UP = (0.0, 1.0, 0.0)

# ---- the body (groups 2 and 3: hips and torso), horizontal sections (y, half-width, front, back) in H, arms excluded.
# Waist 0.644, bust 0.692, shoulders ±0.107 at 0.716–0.740; the A-line flare to ±0.134 at 0.428 (its full front softened
# from 0.143 to 0.12–0.13 as before: at the original value it reads as a belly in our lighting).
ZOE_BODY = [
    (0.404, 0.132, 0.118, -0.107), (0.428, 0.134, 0.122, -0.107), (0.452, 0.127, 0.127, -0.107), (0.476, 0.119, 0.131, -0.107),
    (0.500, 0.111, 0.118, -0.107), (0.524, 0.103, 0.115, -0.103), (0.548, 0.095, 0.11, -0.096), (0.572, 0.087, 0.104, -0.090),
    (0.596, 0.078, 0.096, -0.087), (0.620, 0.072, 0.086, -0.086), (0.644, 0.074, 0.070, -0.086), (0.668, 0.089, 0.073, -0.088),
    (0.692, 0.103, 0.078, -0.089), (0.716, 0.107, 0.069, -0.091), (0.740, 0.107, 0.050, -0.090), (0.764, 0.103, 0.030, -0.088),
    (0.788, 0.094, 0.012, -0.081), (0.806, 0.078, 0.0, -0.068), (0.818, 0.05, -0.008, -0.058), (0.826, 0.026, -0.012, -0.05),
]
# each trouser leg: (y, centre x, radius across, front, back) — wide at the hip, ±0.054 at the knee, ±0.038 at the ankle
ZOE_LEG = [(0.44, 0.06, 0.066, 0.11, -0.1), (0.404, 0.066, 0.066, 0.112, -0.1), (0.308, 0.065, 0.059, 0.095, -0.09), (0.212, 0.064, 0.052, 0.078, -0.077),
           (0.116, 0.065, 0.045, 0.05, -0.065), (0.05, 0.065, 0.039, 0.044, -0.056)]
# the shoes: long and pointed, z −0.054 … +0.107, ±0.038 wide; sections (z, half-width, height)
ZOE_SHOE = [(-0.054, 0.03, 0.05), (-0.02, 0.036, 0.06), (0.03, 0.036, 0.05), (0.07, 0.026, 0.032), (0.107, 0.006, 0.01)]

# ---- the outfit's colour layout (landmarks of the red/skin boundary, H). Front: the V's point at (0, 0.726), its
# sides to (±0.053, 0.753), then up the straps' inner edge to the shoulder top (±0.086, 0.812); the strap covers the
# outer shoulder. Back: the spine strap is a narrow wedge from the dress (±0.043 at 0.618) to a point at (0, 0.726),
# where it forks into a band to each shoulder (lower edge (0, 0.726)–(±0.053, 0.779)–(±0.086, 0.812), upper edge
# (0, 0.779)–(±0.086, 0.812)); skin between it and the dress line (0.618) on either side, and above the band.
ZC = -0.012   # the body's mid-depth, where the front's layout gives way to the back's


def outfit_field(p):
    """> 0 skin, < 0 red; p in H."""
    x, y, z = p
    ax = abs(x)
    yv = 0.726 + 0.027 * ax / 0.053 if ax <= 0.053 else 0.753 + 0.059 * (ax - 0.053) / 0.033
    front = min(y - yv, 0.086 - ax)
    neck = min(y - (0.779 + 0.033 * ax / 0.086), 0.086 - ax)
    lower = 0.726 + ax if ax <= 0.053 else 0.779 + 0.033 * (ax - 0.053) / 0.033
    spine = 0.043 * (0.726 - y) / 0.108
    window = min(lower - y, ax - spine, y - (0.618 - 0.12 * max(0.0, ax - 0.043)))
    back = max(neck, window)
    strap = min(ax - 0.068, 0.112 - ax, y - 0.785)   # (the strap carried on over the shoulder's top to the back band)
    back = min(back, -strap)
    return front if z > ZC else back   # (the side seam: the strap ends there on the shoulder, the back band takes over)


# ---- her head (group 12), half-contours from the front centre round her left (+x) to the back centre, (x, z) in H
ZOE_HEAD = [
    (0.862, [(0.0, 0.0488), (0.0108, 0.04), (0.0183, 0.0322), (0.0245, 0.024), (0.0233, 0.0139), (0.0214, 0.005), (0.0192, -0.0053), (0.012, -0.03), (0.0, -0.045)]),
    (0.872, [(0.0, 0.0553), (0.0174, 0.0396), (0.0315, 0.029), (0.0355, 0.0123), (0.0324, -0.0025), (0.0298, -0.0148), (0.0268, -0.0293), (0.0174, -0.0445), (0.0, -0.0602)]),
    (0.882, [(0.0, 0.0582), (0.0204, 0.0431), (0.0359, 0.0299), (0.0439, 0.0122), (0.0416, -0.006), (0.0384, -0.0219), (0.0347, -0.0407), (0.0211, -0.057), (0.0, -0.0702)]),
    (0.892, [(0.0, 0.0628), (0.0227, 0.0462), (0.0381, 0.0294), (0.0474, 0.0109), (0.0512, -0.0087), (0.0473, -0.0283), (0.0428, -0.0515), (0.0235, -0.0656), (0.0, -0.0802)]),
    (0.902, [(0.0, 0.0676), (0.0221, 0.0427), (0.0392, 0.0286), (0.0479, 0.0092), (0.0528, -0.0106), (0.0488, -0.0308), (0.0439, -0.0545), (0.0257, -0.0728), (0.0, -0.0888)]),
    (0.912, [(0.0, 0.0626), (0.0232, 0.0387), (0.0405, 0.0232), (0.0505, 0.0035), (0.0523, -0.0174), (0.049, -0.0376), (0.0415, -0.0589), (0.025, -0.0777), (0.0, -0.0973)]),
    (0.922, [(0.0, 0.0576), (0.026, 0.0386), (0.0426, 0.0185), (0.0505, -0.0032), (0.0517, -0.0241), (0.0491, -0.0444), (0.0391, -0.0633), (0.0236, -0.081), (0.0, -0.1058)]),
    (0.932, [(0.0, 0.0522), (0.0299, 0.0451), (0.0434, 0.0163), (0.0497, -0.0065), (0.0508, -0.0271), (0.0499, -0.0478), (0.0385, -0.0656), (0.0232, -0.0831), (0.0, -0.1063)]),
    (0.942, [(0.0, 0.0443), (0.0265, 0.0342), (0.044, 0.0144), (0.0488, -0.0094), (0.05, -0.0296), (0.0509, -0.0507), (0.0379, -0.0676), (0.0218, -0.0824), (0.0, -0.1036)]),
    (0.952, [(0.0, 0.0365), (0.0244, 0.0267), (0.0453, 0.0131), (0.048, -0.0123), (0.0491, -0.0322), (0.049, -0.0525), (0.0349, -0.0671), (0.0201, -0.0807), (0.0, -0.1009)]),
    (0.962, [(0.0, 0.0287), (0.0225, 0.0196), (0.0445, 0.0098), (0.0457, -0.0158), (0.0455, -0.0348), (0.0453, -0.0535), (0.0318, -0.0666), (0.0185, -0.0793), (0.0, -0.0982)]),
    (0.972, [(0.0, 0.0208), (0.0204, 0.0119), (0.0328, -0.0046), (0.0421, -0.0199), (0.0419, -0.0373), (0.0413, -0.0545), (0.0288, -0.0661), (0.0169, -0.0782), (0.0, -0.0955)]),
    (0.982, [(0.0, 0.0024), (0.0131, -0.0135), (0.0214, -0.0238), (0.0285, -0.0334), (0.0373, -0.0452), (0.0332, -0.0589), (0.0236, -0.0687), (0.0139, -0.0786), (0.0, -0.0928)]),
    (0.990, [(0.0, -0.032), (0.0084, -0.037), (0.0136, -0.042), (0.0182, -0.0465), (0.0225, -0.052), (0.02, -0.058), (0.0143, -0.0635), (0.0083, -0.069), (0.0, -0.076)]),
]
CHIN, CROWN = (0.0, 0.852, 0.022), (0.0, 0.995, -0.054)
# (ours, not measured: the 0.862 ring's back half (the cut there misses the back of the jaw) and the 0.990 ring, which
# rounds the crown between the last measured cut and the top)
# the face (H; x ≥ 0 side, mirrored): lips (red) a wide crescent, corners up; under the nose tip (0, 0.898) the
# original has a brown shade to the cheeks (not built, see below); eyes small dark slants under brown lids
LIPS_TOP = [(-0.037, 0.888), (-0.018, 0.879), (0.0, 0.876), (0.018, 0.879), (0.037, 0.888)]
LIPS_LOW = [(-0.037, 0.888), (-0.02, 0.869), (0.0, 0.860), (0.02, 0.869), (0.037, 0.888)]
UNDERNOSE = [[(-0.037, 0.888), (0.0, 0.888), (0.0, 0.898)], [(0.0, 0.898), (0.0, 0.888), (0.037, 0.888)]]
LID = [(0.014, 0.929), (0.022, 0.935), (0.044, 0.940), (0.043, 0.935)]   # (the original's lid runs from the bridge up and out at a steep slant; ours stops at the eye and is flatter: in our light the pair read as a frown)
EYE = [(0.015, 0.926), (0.026, 0.935), (0.042, 0.934), (0.031, 0.923)]
EARRING = [(0.054, 0.909, -0.036), (0.054, 0.882, -0.026), (0.054, 0.882, -0.048)]
NECKLACE = [(0.021, 0.834, -0.054), (0.048, 0.807, -0.001), (0.032, 0.780, 0.027), (0.0, 0.758, 0.037)]
# the bun: three spheres (centre y, z, r) on the three bun groups, drawn flat; built as one mass like Twinsen's (VP-1b)
ZOE_BUN = ((1.001, -0.135, 0.052), (0.974, -0.188, 0.037), (0.937, -0.204, 0.026))
BUN_FILL = 0.7
BUN_M = 12

bp = lambda n: tuple(B[n]['p'])
m = lambda p: tuple(c * ZH for c in p)
bpy.ops.wm.read_factory_settings(use_empty=True)
b = Builder('zoe', B)


# ------------------------------------------------------------------ the dress and bare skin: one loft, split by colour
def w_body(p):
    x, y, z = p
    hips = 1 - smooth(0.5 * ZH, 0.58 * ZH, y)
    arm = smooth(0.08 * ZH, 0.11 * ZH, abs(x)) * smooth(0.72 * ZH, 0.78 * ZH, y)
    neck = smooth(0.80 * ZH, 0.83 * ZH, y)
    s_ = 'L' if x > 0 else 'R'
    w = {'hips': hips * (1 - arm), 'torso': (1 - hips) * (1 - arm) * (1 - neck), 'neck': neck * (1 - arm)}
    if arm > 0:
        w['sh' + s_] = arm
    return {k: v for k, v in w.items() if v > 0}


def sec(y):
    for a, c in zip(ZOE_BODY, ZOE_BODY[1:]):
        if a[0] <= y <= c[0]:
            t = (y - a[0]) / (c[0] - a[0])
            return tuple(a[k] + (c[k] - a[k]) * t for k in range(1, 4))
    return ZOE_BODY[-1][1:]


def split_loft(rings, field, pa, pb):
    """Loft the rings; each quad is cut along field = 0 (linear on its edges): the > 0 side goes to pa, the rest to pb.
    Corners are shared within each part (welded by position), so the shading stays smooth across the quads."""
    n = len(rings[0])
    idx = {id(pa): {}, id(pb): {}}

    def vid(part, v):
        k = tuple(round(c, 6) for c in v)
        d = idx[id(part)]
        if k not in d:
            d[k] = len(part.v)
            part.v.append(k)
        return d[k]
    for j in range(len(rings) - 1):
        for i in range(n):
            q = [rings[j][i], rings[j][(i + 1) % n], rings[j + 1][(i + 1) % n], rings[j + 1][i]]
            f = [field(tuple(c / ZH for c in v)) for v in q]
            for part, sgn in ((pa, 1), (pb, -1)):
                poly = []
                for k in range(4):
                    v0, v1, f0, f1 = q[k], q[(k + 1) % 4], sgn * f[k], sgn * f[(k + 1) % 4]
                    if f0 >= 0:
                        poly.append(v0)
                    if (f0 >= 0) != (f1 >= 0):
                        a_, c_ = (v0, v1) if (v0 < v1) else (v1, v0)          # (the same point from either quad)
                        fa, fc = (f0, f1) if (v0 < v1) else (f1, f0)
                        t = fa / (fa - fc)
                        poly.append(tuple(x + (y - x) * t for x, y in zip(a_, c_)))
                if len(poly) >= 3:
                    ids = [vid(part, v) for v in poly]
                    ids = [x for k, x in enumerate(ids) if x not in ids[:k]]
                    if len(ids) >= 3:
                        part.f.append(ids)


ys = [0.404 + 0.014 * k for k in range(int((0.818 - 0.404) / 0.014) + 1)] + [0.818, 0.826]
ys = sorted(set(round(y, 4) for y in ys))
NB = 32
body_rings = [ring(y * ZH, sec(y)[0] * ZH, sec(y)[1] * ZH, sec(y)[2] * ZH, NB, 0.72) for y in ys]
skin = b.P('skin', COL['skin'], w_body, 50)
dress = b.P('dress', COL['red'], w_body, 50)
split_loft(body_rings, outfit_field, skin, dress)

# ------------------------------------------------------------------ the trouser legs and the long pointed shoes
for s_, sx in (('L', 1), ('R', -1)):
    hp, kn = bp('hip' + s_), bp('knee' + s_)

    def w_leg(p, s_=s_, kn=kn):
        y = p[1]
        top = smooth(0.47 * ZH, 0.4 * ZH, y)
        knee = smooth(kn[1] + 0.06, kn[1] - 0.06, y)
        return {k: v for k, v in (('hips', 1 - top), ('hip' + s_, top * (1 - knee)), ('knee' + s_, top * knee)) if v > 0}
    leg = b.P('leg' + s_, COL['red'], w_leg, 50)
    loft(leg, [ring(y * ZH, r * ZH, zf * ZH, zb * ZH, 12, 0.8, cx=sx * max(hp[0], cx * ZH * 0.8)) for y, cx, r, zf, zb in reversed(ZOE_LEG)], cap_bottom=True)
    sh = b.P('shoe' + s_, COL['shoe'], 'foot' + s_, 40)
    x0 = sx * max(hp[0], 0.065 * ZH * 0.8)
    rr = [[(x0 + hw * ZH * math.cos(2 * math.pi * k / 8), 0.004 + h * ZH * 0.5 * (1 + math.sin(2 * math.pi * k / 8)), z * ZH) for k in range(8)] for z, hw, h in ZOE_SHOE]
    vv = [p for r in rr for p in r]
    ff = [[j * 8 + i, j * 8 + (i + 1) % 8, (j + 1) * 8 + (i + 1) % 8, (j + 1) * 8 + i] for j in range(len(rr) - 1) for i in range(8)]
    vv.append(tuple(sum(p[k] for p in rr[0]) / 8 for k in range(3)))
    ff += [[(i + 1) % 8, i, len(vv) - 1] for i in range(8)]
    vv.append(tuple(sum(p[k] for p in rr[-1]) / 8 for k in range(3)))
    ff += [[len(vv) - 1, (len(rr) - 1) * 8 + i, (len(rr) - 1) * 8 + (i + 1) % 8] for i in range(8)]
    sh.add(vv, ff)

# ------------------------------------------------------------------ bare thin arms, the forearm narrowing to a pointed hand
for s_, sx in (('L', 1), ('R', -1)):
    shp, el, hd = bp('sh' + s_), bp('el' + s_), bp('hand' + s_)
    up = b.P('upper' + s_, COL['skin'], lambda p, s_=s_, e=el[1]: {'sh' + s_: 1 - smooth(e + 0.05, e - 0.03, p[1]), 'el' + s_: smooth(e + 0.05, e - 0.03, p[1])}, 50)
    tube(up, (shp[0] - sx * 0.022, shp[1] + 0.03, shp[2] - 0.02), el, 0.031, 0.026, 8)
    tube(b.P('fore' + s_, COL['skin'], 'el' + s_, 50), el, hd, 0.026, 0.02, 8)
    d = (Vector(hd) - Vector(el)).normalized()
    # the hand: the original's forearm narrows to a long point (≈0.14 m past the wrist); ours is a short flattened
    # mitten with a round end (a point read as a spike in close-ups)
    hand = b.P('hand' + s_, COL['skin'], 'hand' + s_, 60)
    mid = tuple(Vector(hd) + d * 0.045)
    tube(hand, tuple(Vector(hd) - d * 0.012), mid, 0.023, 0.021, 8, cap=False, squash=0.6)
    sphere(hand, mid, 0.021, 8, 5, (1.0, 1.0, 1.0))
    c0, side = Vector(mid), d.cross(Vector((0, 0, 1))).normalized()
    flat = side.cross(d).normalized()
    # (the round end drawn out along the hand x1.4 and flattened across the palm x0.6, like the mitten)
    hand.v[-34:] = [tuple(c0 + d * (Vector(p) - c0).dot(d) * 1.4 + side * (Vector(p) - c0).dot(side) + flat * (Vector(p) - c0).dot(flat) * 0.6)
                    for p in hand.v[-34:]]

# ------------------------------------------------------------------ neck and head
neckY, headY = bp('neck')[1], bp('head')[1]
tube(b.P('neck', COL['skin'], lambda p: {'neck': 1 - smooth(headY - 0.02, headY + 0.04, p[1]), 'head': smooth(headY - 0.02, headY + 0.04, p[1])}, 60),
     (0, neckY - 0.05, -0.03), (0, 0.875 * ZH, -0.03), 0.042, 0.038, 10)
HK = 13   # points per half-contour after resampling


def resample(half, k):
    seg = [math.dist(half[i], half[i + 1]) for i in range(len(half) - 1)]
    tot, out = sum(seg), []
    for j in range(k):
        dd, i = tot * j / (k - 1), 0
        while i < len(seg) - 1 and dd > seg[i]:
            dd -= seg[i]
            i += 1
        t = min(1, dd / seg[i]) if seg[i] else 0
        out.append((half[i][0] + (half[i + 1][0] - half[i][0]) * t, half[i][1] + (half[i + 1][1] - half[i][1]) * t))
    return out


head_rings = []
for y, half in ZOE_HEAD:
    h = resample(half, HK)
    head_rings.append([m((x, y, z)) for x, z in h] + [m((-x, y, z)) for x, z in reversed(h[1:-1])])
hpart = b.P('head', COL['skin'], 'head', 70)
loft(hpart, head_rings)
n_, o_ = len(head_rings[0]), len(hpart.v)
hpart.add([m(CHIN), m(CROWN)], [])
hpart.f += [[(i + 1) % n_, i, o_] for i in range(n_)] + [[(len(head_rings) - 1) * n_ + i, (len(head_rings) - 1) * n_ + (i + 1) % n_, o_ + 1] for i in range(n_)]
# the face features lie on the head's surface: ray-cast from the front onto it
htree = BVHTree.FromPolygons([Vector(v) for v in hpart.v], hpart.f)


def on_face(x, y, lift=0.0025):
    hit = htree.ray_cast(Vector((x * ZH, y * ZH, 1.0)), Vector((0, 0, -1)))
    z = hit[0].z if hit[0] is not None else 0.05 * ZH
    return (x * ZH, y * ZH, z + lift)


def ccw(pts):
    """the polygon wound counter-clockwise seen from the front (+z), so its normal faces out"""
    a = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
    return list(pts) if a > 0 else list(reversed(pts))


def face_poly(part, pts, lift=0.0025, n=4):
    """A flat polygon (a triangle or a convex quad, x/y in H) laid on the face: an n x n grid, every point ray-cast
    onto the head, so it follows the curve of the face instead of cutting into it."""
    pts = ccw(pts)
    if len(pts) == 3:
        pts = pts + [pts[2]]
    grid = []
    for j in range(n + 1):
        v = j / n
        row = []
        for i in range(n + 1):
            u = i / n
            a = [pts[0][k] + (pts[1][k] - pts[0][k]) * u for k in range(2)]
            c = [pts[3][k] + (pts[2][k] - pts[3][k]) * u for k in range(2)]
            row.append(on_face(a[0] + (c[0] - a[0]) * v, a[1] + (c[1] - a[1]) * v, lift))
        grid.append(row)
    o = len(part.v)
    part.v += [p for r in grid for p in r]
    for j in range(n):
        for i in range(n):
            a, c = o + j * (n + 1) + i, o + (j + 1) * (n + 1) + i
            part.f.append([a, a + 1, c + 1, c] if len({grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]}) == 4
                          else [a, a + 1, c + 1])   # (a triangle's last row: its far edge is one point)


feat = lambda name, col: b.P(name, col, 'head', 20)
lips = feat('lips', COL['red'])
lips.normal = (0.0, 0.15, 1.0)  # (one even shade, n·L ≈ 0.6 = the colour itself: the lower lip faces down, where our ramp runs near-black)
for k in range(len(LIPS_TOP) - 1):   # (a crescent: quads between its upper and lower edge)
    q = [LIPS_TOP[k], LIPS_TOP[k + 1], LIPS_LOW[k + 1], LIPS_LOW[k]]
    face_poly(lips, [p for i, p in enumerate(q) if p not in q[:i]], 0.003)
# (UNDERNOSE is not built: the original darkens the nose's underside with a brown polygon because its flat palette
# shading would not; our ramp already shades it, and the extra brown read as a moustache)
for sxx in (1, -1):
    face_poly(feat('lid', COL['brown']), [(sxx * x, y) for x, y in LID], 0.004, 3)
    e = ccw([(sxx * x, y) for x, y in EYE])
    c = (sum(x for x, _ in e) / 4, sum(y for _, y in e) / 4)
    b.eye(on_face(*c, 0.005), [([on_face(x, y, 0.005) for x, y in e], COL['eye'])])
    # earrings: a small blue triangle frame hanging from the ear (lines in the original)
    ear = [m((sxx * x, y, z)) for x, y, z in EARRING]
    ep = b.P('earring', COL['blue'], 'head', 20)
    for k in range(3):
        tube(ep, ear[k], ear[(k + 1) % 3], 0.0035, 0.0035, 4)

# ------------------------------------------------------------------ the necklace: laid on the skin round the neck
btree = BVHTree.FromPolygons([Vector(v) for v in skin.v + dress.v], skin.f + [[i + len(skin.v) for i in f] for f in dress.f])
pts = NECKLACE + [(-x, y, z) for x, y, z in reversed(NECKLACE[:-1])]
lay = []
for x, y, z in pts:
    o = Vector((0, y * ZH, -0.03))
    d = (Vector(m((x, y, z))) - o)
    d.y = 0
    hit = btree.ray_cast(o + d.normalized() * 0.3, -d.normalized())
    p = hit[0] + d.normalized() * 0.006 if hit[0] is not None else Vector(m((x, y, z)))
    lay.append(tuple(p))
nk = b.P('necklace', COL['blue'], lambda p: {'torso': 1 - smooth(0.80 * ZH, 0.84 * ZH, p[1]), 'neck': smooth(0.80 * ZH, 0.84 * ZH, p[1])}, 30)
for k in range(len(lay) - 1):
    tube(nk, lay[k], lay[k + 1], 0.0045, 0.0045, 5)


# ------------------------------------------------------------------ the bun: one golden mass through the three spheres
def bun_sweep():
    C = [(y, z) for y, z, _ in ZOE_BUN]
    R = [r for _, _, r in ZOE_BUN]
    sub = lambda a, c: (a[0] - c[0], a[1] - c[1])
    add = lambda a, c, k=1.0: (a[0] + c[0] * k, a[1] + c[1] * k)
    unit = lambda a: (a[0] / math.hypot(*a), a[1] / math.hypot(*a))
    d0 = unit(sub(C[1], C[0]))
    st = []
    for k in range(1, 5):
        ph = math.pi / 2 * k / 4
        st.append((add(C[0], d0, -R[0] * math.cos(ph)), d0, R[0] * math.sin(ph), -math.cos(ph)))
    P = [add(C[0], sub(C[0], C[1]))] + C + [add(C[2], sub(C[2], C[1]))]

    def cr(i, t):
        p0, p1, p2, p3 = P[i], P[i + 1], P[i + 2], P[i + 3]
        f = lambda a, c, d, e: 0.5 * ((2 * c) + (-a + d) * t + (2 * a - 5 * c + 4 * d - e) * t * t + (-a + 3 * c - 3 * d + e) * t ** 3)
        return (f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]))
    mid = [(C[0], R[0], 0.0)]
    for sg in range(2):
        for k in range(1, 6):
            t = k / 5
            c = cr(sg, t)
            union = max(math.sqrt(max(0.0, r * r - math.dist(c, ci) ** 2)) for ci, r in zip(C, R))
            hull = R[sg] + (R[sg + 1] - R[sg]) * t
            mid.append((c, max(union, union + (hull - union) * BUN_FILL), sg + t))
    tg = [d0] + [unit(sub(mid[min(j + 1, len(mid) - 1)][0], mid[j - 1][0])) for j in range(1, len(mid))]
    for _ in range(3):
        tg = [tg[0]] + [unit(add(add(tg[j - 1], tg[j], 2.0), tg[min(j + 1, len(tg) - 1)])) for j in range(1, len(tg))]
    st += [(c, d, r, u) for (c, r, u), d in zip(mid[1:], tg[1:])]
    c, d = C[2], tg[-1]
    for k in range(1, 4):
        ph = math.pi / 2 * k / 4
        st.append((add(c, d, R[2] * math.sin(ph)), d, R[2] * math.cos(ph), 2 + 0.6 * math.sin(ph)))
    return st, add(C[0], d0, -R[0]), add(c, d, R[2])


BUN_U = {}


def w_bun(p):
    u = BUN_U[tuple(round(c, 6) for c in p)]
    a, c_, d = smooth(-0.6, 0.2, u), smooth(0.8, 1.4, u), smooth(1.4, 2.0, u)
    return {k: v for k, v in (('head', 1 - a), ('tail0', a - c_), ('tail1', c_ - d), ('tail2', d)) if v > 1e-4}


bun = b.P('bun', COL['hair'], w_bun, 80)
bun.normal = HAIR_UP
stations, front, tipp = bun_sweep()
hv, hf, us = [], [], []
for (cy, cz), (ty, tz), r, u in stations:
    ny, nz = -tz, ty
    for i in range(BUN_M):
        a = 2 * math.pi * i / BUN_M
        hv.append(m((r * math.sin(a), cy + ny * r * math.cos(a), cz + nz * r * math.cos(a))))
        us.append(u)
nr = len(stations)
for j in range(nr - 1):
    for i in range(BUN_M):
        a, c_ = j * BUN_M + i, j * BUN_M + (i + 1) % BUN_M
        hf.append([a, c_, c_ + BUN_M, a + BUN_M])
hv.append(m((0.0, front[0], front[1])))
us.append(stations[0][3] - 0.0001)
hv.append(m((0.0, tipp[0], tipp[1])))
us.append(2.6)
f0, f1 = len(hv) - 2, len(hv) - 1
hf += [[f0, (i + 1) % BUN_M, i] for i in range(BUN_M)]
o = (nr - 1) * BUN_M
hf += [[f1, o + i, o + (i + 1) % BUN_M] for i in range(BUN_M)]
bun.add(hv, hf)
for p, u in zip(bun.v, us):
    BUN_U[tuple(round(c, 6) for c in p)] = u

os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
tris = b.export(OUT)
# The face's lower half (the snout, the chin) faces down, where our ramp runs toward black (the original's skin ramp
# stops at a mid brown, palette 32): its normals are bent a little up and forward so the face keeps a mid shade.
J = json.load(open(OUT))
skin_rgb = [int(COL['skin'][i:i + 2], 16) for i in (1, 3, 5)]
bend = Vector((0.0, 0.5, 0.85)).normalized()
for v in range(len(J['pos']) // 3):
    x, y, z = J['pos'][3 * v:3 * v + 3]
    if J['col'][3 * v:3 * v + 3] == skin_rgb and y > 0.845 * ZH and z > -0.02 * ZH:
        n = Vector(J['nrm'][3 * v:3 * v + 3])
        k = 0.45 * smooth(0.0, 0.03 * ZH, z + 0.02 * ZH)
        J['nrm'][3 * v:3 * v + 3] = [round(c, 4) for c in (n + bend * k).normalized()]
json.dump(J, open(OUT, 'w'), separators=(',', ':'))
print('zoe tris', tris, '->', OUT)
if BLEND:
    os.makedirs(os.path.dirname(os.path.abspath(BLEND)), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND))
    print('blend', BLEND)
