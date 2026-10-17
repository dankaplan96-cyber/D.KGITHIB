# The Dino-Fly as a low-poly model (Blender, run headless):
#   python -c "import bpy" must work (pip install bpy), then
#   python tools/blender/dinofly_poly.py assets/poly/dinofly.json [art/characters/dinofly/dinofly_poly.blend]
#
# After LBA2's Dino-Fly (the original's body 167; 166 and 168 are the same creature with Twinsen in the saddle),
# rebuilt from its measured sections only (docs/character-review.md, "The Dino-Fly"): nothing of the original's
# mesh, palette or files is used or copied, only the numbers below (in the original's units, Twinsen = 1238;
# converted with U = 2.1 m / 1238, the scale of the cast and of dogs.js).
#
# The creature: a bipedal flying dinosaur, teal-green, the underside of the neck, belly and tail tan; a long tail
# drawn out to a point; a long neck rising from a deep chest; a long horse-like head carried nose-down, with two
# small spikes for ears and big yellow eyes on the upper sides; a brown bridle and a brown saddle with a raised
# pommel and cantle; two thin legs under the hips with long splayed feet; wings from the shoulders, a teal
# leading edge (shoulder, elbow, wrist, tip) and a tan membrane with a scalloped trailing edge.
#
# Its own skeleton (named after what the original's groups move): body (hips), neck0..2, head, tail0..2,
# thigh/shin/foot L/R, wing0..2 L/R. The bind pose is the original's rest pose (standing, wings spread flat);
# src/game/dinofly.js poses it (the nap, the gaze, the wing stretch). Skinned as LBA2 skins its models: each
# piece follows one bone, blended only across a joint (neck, tail, the membrane between the wing bones).
#
# Output: the cast's poly JSON (unindexed triangles, normals, sRGB vertex colours, 4 weights per vertex by bone
# name, separate eye meshes) plus `skel` (bone name, parent, rest position) since this is not the game skeleton.
import json, math, os, sys

import bpy
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lbapoly import corner_normals, gb, hexrgb  # noqa: E402

OUT = sys.argv[-1]
BLEND = None
if OUT.endswith('.blend'):
    OUT, BLEND = sys.argv[-2], sys.argv[-1]
if os.path.isdir(OUT):
    OUT = os.path.join(OUT, 'dinofly.json')

U = 2.1 / 1238          # original units → metres (Twinsen's 1238 units = 2.1 m, as dogs.js)
COL = {
    'teal': '#2f8a75',   # the hide (the original's teal-green ramp at a lit face)
    'tan': '#bd914b',    # membranes, the underside of neck, belly and tail
    'brown': '#6a4529',  # saddle and bridle
    'eye': '#f2b850', 'pupil': '#2a1a0c',
    'muzzle': '#86ab9c', # twelve years on: a greyed muzzle (our touch)
    'claw': '#1f5e50',
}

# ------------------------------------------------------------------ skeleton (rest = the original's rest pose)
BONES = {
    'root': (None, (0, 0, 0)),
    'body': ('root', (0, 900, -350)),
    'tail0': ('body', (0, 950, -800)), 'tail1': ('tail0', (0, 880, -1180)), 'tail2': ('tail1', (0, 800, -1600)),
    'neck0': ('body', (0, 1100, 420)), 'neck1': ('neck0', (0, 1350, 600)), 'neck2': ('neck1', (0, 1560, 860)),
    'head': ('neck2', (0, 1680, 1080)),
}
for s, sx in (('L', 1), ('R', -1)):
    BONES['thigh' + s] = ('body', (sx * 380, 700, -400))
    BONES['shin' + s] = ('thigh' + s, (sx * 300, 380, -620))
    BONES['foot' + s] = ('shin' + s, (sx * 220, 100, -400))
    BONES['wing0' + s] = ('body', (sx * 360, 1100, 0))
    BONES['wing1' + s] = ('wing0' + s, (sx * 800, 1100, 300))
    BONES['wing2' + s] = ('wing1' + s, (sx * 1400, 1100, 200))


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def chain(x, joints, blend):
    """weights along one coordinate: joints = [(x0, bone owning x < x0 side...)] given as a list of
    (position, bone) sorted by position; the segment beyond each joint (in the list's direction) belongs to
    that joint's bone, blended over ±blend around the joint"""
    w = {joints[0][1]: 1.0}
    for (p, b) in joints[1:]:
        t = smooth(p - blend, p + blend, x) if joints[-1][0] > joints[0][0] else smooth(p + blend, p - blend, x)
        if t <= 0:
            break
        w = {k: v * (1 - t) for k, v in w.items()}
        w[b] = w.get(b, 0) + t
    return {k: v for k, v in w.items() if v > 1e-4}


class Part:
    def __init__(self, name, color, angle=50):
        self.name, self.color, self.angle = name, color, angle
        self.v, self.w, self.f = [], [], []

    def add(self, verts, weights, faces):
        o = len(self.v)
        self.v += [tuple(p) for p in verts]
        self.w += list(weights)
        self.f += [[i + o for i in f] for f in faces]


PARTS = []


def part(name, color, angle=50):
    p = Part(name, color, angle)
    PARTS.append(p)
    return p


# ------------------------------------------------------------------ the lofts (body + tail, neck, head)
def ring_pt(t, hw, up, down, wide, p=0.8):
    """a section in its own plane: angle t from the top (0) round the creature's left (+x) to the bottom (pi)"""
    s, c = math.sin(t), math.cos(t)
    x = hw * math.copysign(abs(s) ** p, s)
    v = wide + ((up - wide) if c >= 0 else (down + wide)) * math.copysign(abs(c) ** p, c)
    return x, v


def loft(stations, n, color_of, weights_of, name, cap_front=True, cap_back=True, p=0.8, dome=0.0, angle=50):
    """stations: dicts {c: (y, z) centre, th: angle of the spine above horizontal (rad, + = rising toward +z),
    hw, up, down, wide}; rings perpendicular to the spine. color_of(i_station, t_mid) → colour key for each face;
    weights_of(i_station) → bone weights for that ring."""
    verts, W, rings = [], [], []
    for i, st in enumerate(stations):
        y0, z0 = st['c']
        th = st['th']
        ny, nz = math.cos(th), -math.sin(th)        # the section's 'up' (perpendicular to the spine)
        r = []
        for k in range(n):
            t = 2 * math.pi * k / n
            x, v = ring_pt(t, st['hw'], st['up'], st['down'], st['wide'], p)
            r.append(len(verts))
            verts.append((x, y0 + v * ny, z0 + v * nz))
            W.append(weights_of(i))
        rings.append(r)
    faces = {}
    for i in range(len(rings) - 1):
        for k in range(n):
            a, b = rings[i][k], rings[i][(k + 1) % n]
            c, d = rings[i + 1][(k + 1) % n], rings[i + 1][k]
            # (seen from outside: the ring runs from the top over the left side, i.e. clockwise seen from the front)
            faces.setdefault(color_of(i, 2 * math.pi * (k + 0.5) / n), []).append([a, d, c, b])
    for end, ok in ((0, cap_back), (len(rings) - 1, cap_front)):
        if not ok:
            continue
        r = rings[end]
        cen = [sum(verts[j][q] for j in r) / n for q in range(3)]
        if end and dome:   # (CH-DF-FIX) the front cap pushed forward along the spine: a rounded end, not a flat disc
            th = stations[end]['th']
            cen[1] += math.sin(th) * dome
            cen[2] += math.cos(th) * dome
        verts.append(tuple(cen))
        W.append(weights_of(end))
        ci = len(verts) - 1
        for k in range(n):
            a, b = r[k], r[(k + 1) % n]
            f = [a, b, ci] if end == 0 else [b, a, ci]
            faces.setdefault(color_of(end, 2 * math.pi * (k + 0.5) / n), []).append(f)
    for col, fl in faces.items():
        part(name + '_' + col, col, angle).add(verts, W, fl)
    return verts


def belly(t, lo=2.2, hi=4.08):
    return lo < t < hi


def S(z, ybot, ytop, hw, ywide, th=0.0):
    yc = (ybot + ytop) / 2
    return {'c': (yc, z), 'th': th, 'hw': hw, 'up': ytop - yc, 'down': yc - ybot, 'wide': ywide - yc}


# body and tail: vertical sections along z, measured (z, underside, top, half-width, height of the widest point);
# the back under the saddle is taken at 1370 (the original's 1400 there is the saddle's seat)
TRUNK = [
    S(-2080, 779, 785, 3, 782), S(-1950, 764, 812, 20, 788), S(-1700, 734, 875, 60, 800),
    S(-1450, 713, 957, 100, 850), S(-1200, 700, 1055, 140, 930), S(-950, 661, 1186, 179, 990),
    S(-750, 618, 1289, 257, 930), S(-600, 570, 1335, 360, 820), S(-450, 536, 1362, 397, 800),
    S(-250, 520, 1370, 419, 840), S(-50, 504, 1372, 403, 780), S(150, 550, 1385, 350, 790),
    S(300, 615, 1405, 290, 880), S(400, 720, 1420, 215, 1000),
]
TAIL_J = [(-350, 'body'), (-800, 'tail0'), (-1180, 'tail1'), (-1600, 'tail2')]


def trunk_w(i):
    z = TRUNK[i]['c'][1]
    if z >= -350:
        return chain(z, [(-350, 'body'), (360, 'neck0')], 60)
    return chain(z, TAIL_J, 110)


loft(TRUNK, 12, lambda i, t: 'tan' if belly(t) and TRUNK[i]['c'][1] < 380 else 'teal', trunk_w, 'trunk')

# the neck: rising from the chest, steep at the base and flattening toward the head (sections perpendicular to it)
NECK = [  # (z, centre y, spine angle°, half depth, half-width)
    (300, 1060, 48, 330, 262), (390, 1118, 52, 250, 196),   # (CH-DF-FIX: was one section (330, 1080, 50, 300, 230))
    (460, 1170, 55, 190, 150), (560, 1300, 52, 150, 118), (660, 1415, 44, 128, 108),
    (770, 1500, 35, 114, 100), (880, 1572, 30, 108, 93), (990, 1630, 26, 108, 87), (1090, 1676, 20, 112, 88),
]
NECK_ST = [{'c': (y, z), 'th': math.radians(a), 'hw': hw, 'up': d, 'down': d, 'wide': 0} for z, y, a, d, hw in NECK]
NECK_J = [(330, 'body'), (420, 'neck0'), (640, 'neck1'), (900, 'neck2'), (1090, 'head')]


def neck_w(i):
    return chain(NECK[i][0], NECK_J, 70)


# (CH-DF-FIX: the root flared wider and lower into the chest, a section between it and the neck proper, and normals
# smoothed up to 75°: no facet crease at the neck root)
loft(NECK_ST, 10, lambda i, t: 'tan' if belly(t, 2.3, 3.98) and i < len(NECK) - 1 else 'teal', neck_w, 'neck', angle=75)

# the head: a long horse-like wedge carried nose-down (its axis 38° below horizontal), sections along the axis
HA = (1640, 1100)                       # (y, z) of the axis start, behind the eyes
HD = math.radians(38)
HDIR = (-math.sin(HD), math.cos(HD))    # (dy, dz) along the axis
HEAD = [  # (s along the axis, up, down, half-width): the brow over the eyes, a slight dip, a blunt square muzzle
    (-60, 62, 62, 62), (0, 128, 116, 108), (130, 156, 148, 142), (260, 170, 150, 170), (400, 146, 140, 178),
    (560, 140, 120, 162), (700, 124, 92, 132), (765, 106, 76, 114), (800, 82, 58, 90), (824, 50, 36, 58),
]   # (CH-DF-FIX: the muzzle closes over three sections and a domed tip instead of a flat cap at 812)


def head_c(s):
    return (HA[0] + HDIR[0] * s, HA[1] + HDIR[1] * s)


HEAD_ST = [{'c': head_c(s), 'th': -HD, 'hw': hw, 'up': up, 'down': dn, 'wide': (up - dn) / 2 * 0.2} for s, up, dn, hw in HEAD]


def head_col(i, t):
    s = (HEAD[i][0] + HEAD[min(i + 1, len(HEAD) - 1)][0]) / 2
    if s > 730:
        return 'muzzle'
    return 'teal'


HP = 0.62   # the head's sections are boxier than the body's: flat cheeks, a flat brow, a square muzzle
head_verts = loft(HEAD_ST, 12, head_col, lambda i: {'head': 1.0}, 'head', p=HP, dome=22, angle=62)


def head_surface(s, t, out=0.0):
    """a point on the head's surface (axis position s, angle t from the top round the left side), pushed `out`
    along the section's outward direction; returns (point, outward normal) in units"""
    # interpolate the section at s
    for i in range(len(HEAD) - 1):
        if HEAD[i][0] <= s <= HEAD[i + 1][0]:
            f = (s - HEAD[i][0]) / (HEAD[i + 1][0] - HEAD[i][0])
            break
    else:
        i, f = len(HEAD) - 2, 1.0
    a, b = HEAD_ST[i], HEAD_ST[i + 1]
    L = lambda k: a[k] + (b[k] - a[k]) * f
    x, v = ring_pt(t, L('hw'), L('up'), L('down'), L('wide'), HP)
    x2, v2 = ring_pt(t + 0.01, L('hw'), L('up'), L('down'), L('wide'), HP)
    ny, nz = math.cos(-HD), -math.sin(-HD)
    yc, zc = head_c(s)
    # outward normal in the section plane: perpendicular to the ring's tangent
    tx, tv = x2 - x, v2 - v
    nx, nv = -tv, tx
    ln = math.hypot(nx, nv) or 1
    nx, nv = nx / ln, nv / ln
    p = (x + nx * out, yc + (v + nv * out) * ny, zc + (v + nv * out) * nz)
    nrm = (nx, nv * ny, nv * nz)
    return p, nrm


# ------------------------------------------------------------------ bridle (brown straps lying on the head)
def strap(name, path, width, out=7):
    """a ribbon over the head's surface through (s, t) points"""
    pr = part(name, 'brown', 70)
    vv, ff = [], []
    pts = [head_surface(s, t, out) for s, t in path]
    for j, (p, n) in enumerate(pts):
        q = pts[min(j + 1, len(pts) - 1)][0]
        o = pts[max(j - 1, 0)][0]
        d = Vector(q) - Vector(o)
        side = d.cross(Vector(n)).normalized() * width
        vv += [tuple(Vector(p) - side), tuple(Vector(p) + side)]
    for j in range(len(pts) - 1):
        ff.append([2 * j, 2 * j + 1, 2 * j + 3, 2 * j + 2])
    pr.add(vv, [{'head': 1.0}] * len(vv), ff)


NB = 640   # the noseband
strap('noseband', [(NB, 2 * math.pi * k / 16) for k in range(17)], 26)
strap('headpiece', [(85, -1.7 + 3.4 * k / 10) for k in range(11)], 22)
for sx in (1, -1):
    strap('cheek' + ('L' if sx > 0 else 'R'), [(85 + (NB - 85) * k / 6, sx * (1.7 + 0.15 * k / 6)) for k in range(7)], 20)

# ears: two small spikes on top of the skull, up and back (the original's tips at ±140, 1840, 1200)
for sx in (1, -1):
    base, n = head_surface(70, sx * 0.62, -10)
    tip = (base[0] + sx * 45, base[1] + 150, base[2] - 70)
    pr = part('ear', 'teal', 30)
    d = Vector(tip) - Vector(base)
    u = d.cross(Vector((0, 0, 1))).normalized() * 34
    w = d.cross(u).normalized() * 30
    B0 = Vector(base)
    vv = [tuple(B0 + u), tuple(B0 + w), tuple(B0 - u), tuple(B0 - w), tip]
    pr.add(vv, [{'head': 1.0}] * 5, [[0, 1, 4], [1, 2, 4], [2, 3, 4], [3, 0, 4]])

# ------------------------------------------------------------------ eyes (separate meshes on the head: lids)
EYES = []
for sx in (1, -1):
    s0, t0 = 255, sx * 0.98        # on the upper side, a third of the way down the head (the original's 1600–1720 high)
    c, n = head_surface(s0, t0, 6)
    # the eye's own frame: u along the head toward the nose, w out of the surface, v = w × u (the lid direction)
    a, _ = head_surface(s0 + 40, t0, 6)
    U_ = (Vector(a) - Vector(c)).normalized()
    W_ = Vector(n).normalized()
    V_ = W_.cross(U_).normalized()
    if V_.y < 0:
        V_ = -V_
    U_ = V_.cross(W_).normalized()
    # an almond 150 long and 82 tall (the original's eye spans about 160 × 120 on the slant), a pupil forward
    alm = [(-88, 0), (-55, 42), (5, 52), (68, 28), (90, -2), (52, -34), (-5, -44), (-58, -28)]
    pup = [(20, -4), (36, 22), (52, -2), (36, -28)]
    to_loc = lambda q, lift: (q[0], q[1], lift)
    EYES.append({'bone': 'head', 'pivot': c, 'basis': (U_, V_, W_),
                 'polys': [([to_loc(q, 0) for q in alm], 'eye'), ([to_loc(q, 4) for q in pup], 'pupil')]})

# ------------------------------------------------------------------ saddle (brown, on the back)
def body_sec(z):
    for i in range(len(TRUNK) - 1):
        za, zb = TRUNK[i]['c'][1], TRUNK[i + 1]['c'][1]
        if za <= z <= zb:
            f = (z - za) / (zb - za)
            a, b = TRUNK[i], TRUNK[i + 1]
            return {k: a[k] + (b[k] - a[k]) * f for k in ('hw', 'up', 'down', 'wide')}, a['c'][0] + (b['c'][0] - a['c'][0]) * f
    raise ValueError(z)


sad = part('saddle', 'brown', 40)
SZ = [(-300, 95), (-250, 55), (-200, 14), (60, 14), (150, 40), (200, 100)]   # (z, rise of the middle: cantle, seat, pommel)
TS = [-1.25 + 2.5 * k / 8 for k in range(9)]
vv, ww, ff = [], [], []
for z, rise in SZ:
    sec, yc = body_sec(z)
    for t in TS:
        x, v = ring_pt(t, sec['hw'] + 14, sec['up'] + 14, sec['down'], sec['wide'])
        lift = rise * max(0.0, math.cos(t * 1.4)) if abs(t) < 1.1 else 0
        vv.append((x, yc + v + lift, z))
        ww.append({'body': 1.0})
m = len(TS)
for j in range(len(SZ) - 1):
    for k in range(m - 1):
        a, b = j * m + k, j * m + k + 1
        ff.append([a, b, b + m, a + m])
sad.add(vv, ww, ff)

# ------------------------------------------------------------------ legs: drumstick thigh, thin shin, long splayed foot
for s, sx in (('L', 1), ('R', -1)):
    def tube(pr, a, b, ra, rb, bone, n=6, bone_b=None):
        A, Bv = Vector(a), Vector(b)
        d = (Bv - A).normalized()
        up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
        u = d.cross(up).normalized()
        w = d.cross(u).normalized()
        vv, ww = [], []
        for cc, r, bn in ((A, ra, bone), (Bv, rb, bone_b or bone)):
            for k in range(n):
                t = 2 * math.pi * k / n
                vv.append(tuple(cc + u * (math.cos(t) * r) + w * (math.sin(t) * r)))
                ww.append({bn: 1.0})
        ff = [[k, (k + 1) % n, n + (k + 1) % n, n + k] for k in range(n)]
        if (Vector(vv[1]) - A).cross(Vector(vv[0]) - A).dot(d) > 0:
            ff = [list(reversed(f)) for f in ff]
        # (CH-DF-FIX) the ends domed out along the tube (half a radius), not flat discs: no cylinder-end feet
        vv.append(tuple(A - d * (ra * 0.55)))
        ww.append({bone: 1.0})
        vv.append(tuple(Bv + d * (rb * 0.55)))
        ww.append({bone_b or bone: 1.0})
        ff += [[(k + 1) % n, k, 2 * n] for k in range(n)]
        ff += [[n + k, n + (k + 1) % n, 2 * n + 1] for k in range(n)]
        if (Vector(vv[1]) - A).cross(Vector(vv[0]) - A).dot(d) > 0:
            ff[-2 * n:] = [list(reversed(f)) for f in ff[-2 * n:]]
        pr.add(vv, ww, ff)

    lg = part('leg' + s, 'teal', 78)
    # the thigh: a tapered drumstick out of the flank (the original's leg leaves the belly at 600–700 high)
    tube(lg, (sx * 300, 780, -400), (sx * 320, 560, -500), 150, 118, 'thigh' + s, n=8)
    tube(lg, (sx * 320, 560, -500), (sx * 300, 380, -620), 118, 58, 'thigh' + s, n=8)
    tube(lg, (sx * 300, 380, -620), (sx * 225, 95, -410), 55, 42, 'shin' + s)
    # the foot: a flat plate from the heel spur back to three toes in front (the original's 80…400 wide, z −580…−80)
    ft = part('foot' + s, 'teal', 35)
    X = lambda x: sx * x
    vv = [(X(225), 100, -410), (X(190), 0, -560), (X(300), 0, -540),                # ankle, heel spur
          (X(150), 0, -330), (X(330), 0, -330), (X(240), 70, -330),                  # instep (inner, outer, top)
          (X(95), 0, -150), (X(240), 0, -85), (X(395), 0, -150)]                     # three toe tips
    ft.add(vv, [{'foot' + s: 1.0}] * len(vv),
           [[0, 2, 1], [0, 1, 3], [0, 4, 2], [0, 3, 5], [0, 5, 4],
            [3, 6, 5], [5, 6, 7], [5, 7, 8], [5, 8, 4]])

# ------------------------------------------------------------------ wings: teal leading edge, tan membrane
for s, sx in (('L', 1), ('R', -1)):
    j0, j1, j2 = 'wing0' + s, 'wing1' + s, 'wing2' + s
    X = lambda x: sx * x
    Y = 1100
    # leading edge (shoulder, elbow peak, dip, wrist peak, tip) and trailing edge (root … scallops … tip), measured
    LE = [(380, 130), (860, 270), (1100, 140), (1340, 185), (1680, -470)]
    TE = [(380, -380), (700, -430), (940, -495), (1260, -410), (1500, -545)]
    LW = [{'body': 1.0}, {j0: 0.5, j1: 0.5}, {j1: 1.0}, {j1: 0.5, j2: 0.5}, {j2: 1.0}]
    TW = [{'body': 1.0}, {j0: 1.0}, {j1: 1.0}, {j1: 1.0}, {j2: 1.0}]
    mem = part('membrane' + s, 'tan', 25)
    # (CH-DF-FIX) the membrane in two bands with a fold line between them, so it can pleat when the wing folds:
    # the front band (leading edge to the fold line at 45% of the chord) follows the wing bones; the back band
    # (fold line to the trailing edge) follows three membrane bones mem0..2, hinged on the fold line, which
    # src/game/dinofly.js turns in the doze so the membrane bunches along the flank. In the rest pose and the
    # stretch the hinges are straight and the membrane is one flat sheet as before.
    m0, m1, m2 = 'mem0' + s, 'mem1' + s, 'mem2' + s
    MAPW = {j0: m0, j1: m1, j2: m2, 'body': 'body'}
    def mixw(a, b, f):
        out = {}
        for k_, v_ in a.items():
            out[k_] = out.get(k_, 0) + v_ * (1 - f)
        for k_, v_ in b.items():
            out[k_] = out.get(k_, 0) + v_ * f
        return out
    FOLD = 0.45
    MID = [(lx + (tx - lx) * FOLD, lz + (tz - lz) * FOLD) for (lx, lz), (tx, tz) in zip(LE, TE)]
    MW = [mixw(LW[k], TW[k], 0.5) for k in range(5)]
    tw = lambda w: {MAPW[k_]: v_ for k_, v_ in w.items()}
    # the hinges (pivot on the fold line, the fold line's direction), printed for dinofly.js's pose tables
    piv = {m0: MID[1], m1: ((MID[2][0] + MID[3][0]) / 2, (MID[2][1] + MID[3][1]) / 2), m2: MID[4]}
    par = {m0: j0, m1: j1, m2: j2}
    for mb, (px, pz) in piv.items():
        BONES[mb] = (par[mb], (X(px), Y, pz))
    if sx > 0:
        for mb, (ia, ib) in ((m0, (0, 1)), (m1, (2, 3)), (m2, (3, 4))):
            print('hinge', mb, 'axis', (MID[ib][0] - MID[ia][0], 0, MID[ib][1] - MID[ia][1]))
    vv = [(X(x), Y, z) for x, z in LE] + [(X(x), Y - 2, z) for x, z in MID]
    ww = list(LW) + MW
    # the scallops: between each pair of trailing-edge points the edge sags forward in an arc (two points at a
    # third and two thirds, pulled toward the leading edge), so the scalloped edge reads in the fold
    te_ix = []
    for k in range(5):
        te_ix.append([])
        if k:
            (xa, za), (xb, zb) = TE[k - 1], TE[k]
            for f in (1 / 3, 2 / 3):
                sag = 70 * math.sin(math.pi * f) / math.sin(math.pi / 3)
                te_ix[k].append(len(vv))
                vv.append((X(xa + (xb - xa) * f), Y - 4, za + (zb - za) * f + sag))
                ww.append(tw(mixw(TW[k - 1], TW[k], f)))
        te_ix[k].append(len(vv))
        vv.append((X(TE[k][0]), Y - 4, TE[k][1]))
        ww.append(tw(TW[k]))
    ff = []
    for k in range(4):
        for q in ([k, k + 1, 5 + k + 1, 5 + k], [5 + k, 5 + k + 1] + list(reversed(te_ix[k + 1])) + [te_ix[k][-1]]):
            ff.append(q if sx > 0 else list(reversed(q)))
    mem.add(vv, ww, ff)
    # the leading edge: a teal bone, thick at the shoulder, in three segments (each follows its bone)
    edge = part('edge' + s, 'teal', 50)
    pts = [(X(330), Y, 110), (X(860), Y, 270), (X(1340), Y, 185), (X(1700), Y - 10, -500)]
    rad = [62, 44, 32, 8]   # (CH-DF-FIX: a little thicker, so the folded arm reads as a ridge along the flank)
    bones = [j0, j1, j2]
    for k in range(3):
        a, b = Vector(pts[k]), Vector(pts[k + 1])
        d = (b - a).normalized()
        u = Vector((0, 1, 0))
        w = d.cross(u).normalized()
        vv, ww = [], []
        for cc, r, bn in ((a, rad[k], bones[k] if k else 'body'), (b, rad[k + 1], bones[k])):
            for i in range(5):
                t = 2 * math.pi * i / 5
                vv.append(tuple(cc + u * (math.cos(t) * r * 0.8) + w * (math.sin(t) * r)))
                ww.append({bn: 1.0} if bn != 'body' else {'body': 0.3, j0: 0.7})
        ff = [[i, (i + 1) % 5, 5 + (i + 1) % 5, 5 + i] for i in range(5)]
        if sx < 0:
            ff = [list(reversed(f)) for f in ff]
        edge.add(vv, ww, ff)
    # a claw at the wrist peak, pointing forward (the original's small teal points on the leading edge)
    cl = part('claw' + s, 'claw', 30)
    vv = [(X(1320), Y + 20, 175), (X(1360), Y - 20, 175), (X(1340), Y, 280)]
    cl.add(vv, [{j1: 0.5, j2: 0.5}] * 3, [[0, 1, 2]])

# ------------------------------------------------------------------ export
M = lambda p: (p[0] * U, p[1] * U, p[2] * U)
out = {'bones': [], 'pos': [], 'nrm': [], 'col': [], 'si': [], 'sw': [], 'eyes': [], 'tris': 0,
       'skel': [{'name': n, 'parent': par, 'p': [round(c * U, 5) for c in p]} for n, (par, p) in BONES.items()],
       'units': 'metres; +y up, +z the creature\'s front, +x its left; bind pose = the original\'s rest pose'}
ix = {}


def bix(nm):
    if nm not in ix:
        ix[nm] = len(out['bones'])
        out['bones'].append(nm)
    return ix[nm]


arm_data = bpy.data.armatures.new('DinoFlyRig')
arm = bpy.data.objects.new('DinoFlyRig', arm_data)
bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode='EDIT')
kids = {}
for n, (par, p) in BONES.items():
    if par:
        kids.setdefault(par, []).append(n)
for n, (par, p) in BONES.items():
    eb = arm_data.edit_bones.new(n)
    eb.head = gb(M(p))
    k = [c for c in kids.get(n, []) if not c.startswith('mem')]
    tail = gb(M(BONES[k[0]][1])) if k else gb(M(p)) + Vector((0, -0.15, 0))
    if (tail - eb.head).length < 1e-3:
        tail = eb.head + Vector((0, 0, 0.1))
    eb.tail = tail
for n, (par, p) in BONES.items():
    if par:
        arm_data.edit_bones[n].parent = arm_data.edit_bones[par]
bpy.ops.object.mode_set(mode='OBJECT')

mats = {}
for k, h in COL.items():
    m = bpy.data.materials.new('dinofly_' + k)
    m.diffuse_color = tuple(c / 255 for c in hexrgb(h)) + (1,)
    mats[k] = m

for pr in PARTS:
    if not pr.f:
        continue
    used = sorted({i for f in pr.f for i in f})
    remap = {o: n for n, o in enumerate(used)}
    V = [M(pr.v[i]) for i in used]
    Wt = [pr.w[i] for i in used]
    F = [[remap[i] for i in f] for f in pr.f]
    tris = [(f[0], f[k], f[k + 1]) for f in F for k in range(1, len(f) - 1)]
    me = bpy.data.meshes.new('dinofly_' + pr.name)
    me.from_pydata([gb(p) for p in V], [], F)
    me.materials.append(mats[pr.color])
    ob = bpy.data.objects.new('dinofly_' + pr.name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = arm
    ob.modifiers.new('Armature', 'ARMATURE').object = arm
    groups = {}
    for vi, w in enumerate(Wt):
        for b, x in w.items():
            if b not in groups:
                groups[b] = ob.vertex_groups.new(name=b)
            groups[b].add([vi], x, 'REPLACE')
    cn = corner_normals(V, tris, pr.angle)
    rgb = hexrgb(COL[pr.color])
    for t, ns in zip(tris, cn):
        for i, nn in zip(t, ns):
            out['pos'] += [round(c, 5) for c in V[i]]
            out['nrm'] += [round(c, 4) for c in nn]
            out['col'] += rgb
            ws = sorted(Wt[i].items(), key=lambda q: -q[1])[:4]
            tot = sum(x for _, x in ws)
            ws += [(None, 0)] * (4 - len(ws))
            out['si'] += [bix(b) if b else 0 for b, _ in ws]
            out['sw'] += [round(x / tot, 4) for _, x in ws]
    out['tris'] += len(tris)

for e in EYES:
    U_, V_, W_ = e['basis']
    ed = {'bone': e['bone'], 'pivot': [round(c, 5) for c in M(e['pivot'])],
          'basis': [[round(c, 4) for c in v] for v in (U_, V_, W_)], 'pos': [], 'col': []}
    for poly, col in e['polys']:
        n = len(poly)
        for k in range(1, n - 1):
            for i in (0, k, k + 1):
                ed['pos'] += [round(c * U, 5) for c in poly[i]]     # in the eye's frame (u, v, w)
                ed['col'] += hexrgb(COL[col])
        out['tris'] += n - 2
        wp = [Vector(e['pivot']) + U_ * q[0] + V_ * q[1] + W_ * q[2] for q in poly]
        me = bpy.data.meshes.new('dinofly_eye_' + col)
        me.from_pydata([gb(M(p)) for p in wp], [], [list(range(n))])
        me.materials.append(mats[col])
        ob = bpy.data.objects.new('dinofly_eye_' + col, me)
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = arm
    out['eyes'].append(ed)

os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
json.dump(out, open(OUT, 'w'), separators=(',', ':'))
print('tris', out['tris'], 'verts', len(out['pos']) // 3, 'bones', len(out['bones']), 'materials 1 (vertex colours)', 'colours', len(COL))
if BLEND:
    os.makedirs(os.path.dirname(os.path.abspath(BLEND)), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(BLEND))
    print('saved', BLEND)
