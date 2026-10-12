# Twinsen as a low-poly model (Blender, run headless):
#   python -c "import bpy" must work (pip install bpy), then
#   python tools/blender/twinsen_poly.py <skeleton.json> <out.json> [out.blend]
#
# Built from the measurements of LBA2's in-game model (docs/character-review.md §11): every ring below is a
# horizontal section of the original (height, half-width, front and back extent, fractions of the height H).
# Skinned like LBA2 skins its models: each part follows one bone, with blends only where cloth spans two
# (the cape's sides follow the arms, the robe follows the four skirt bones by direction, the bun swings).
# The skeleton is the game's own (exported from createCharacter), so every existing animation drives it.
import json, math, sys

import bpy
import bmesh
from mathutils import Matrix, Vector

SKEL, OUT = sys.argv[-2], sys.argv[-1]
BLEND = None
if sys.argv[-1].endswith('.blend'):
    SKEL, OUT, BLEND = sys.argv[-3], sys.argv[-2], sys.argv[-1]
skel = json.load(open(SKEL))
B = skel['bones']
SPREAD = skel['armSpread']
S = 2.1  # the game's height for H (top of the hair)

COL = {
    'tunic': '#2a86ad', 'belt': '#e2805c', 'shoe': '#e98c6c', 'skin': '#e2bc90', 'hair': '#634327',
    'white': '#ecebf2', 'iris': '#2f78b0', 'pupil': '#141820', 'lid': '#5a3a28', 'medal': '#c89e53', 'medalFace': '#e2bc6e',
    'cord': '#c8502a', 'sole': '#9a4a32', 'inner': '#123f58', 'tie': '#3a2414',
}
HEAD_K = 1.12                     # the head, larger than the original's measured sections (references: ≈0.19 H)
CHIN = (0.0, 0.80, 0.09)          # …scaled about the chin, so the neck joint stays where it was


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ------------------------------------------------------------------ geometry helpers (game axes: +y up, +z front)
TILT, TILT_PIVOT = math.radians(10), (0.824, 0.03)   # the original carries its head raised a little
LIFT = 0.018   # …on a long neck: the chin clears the collar


def tilt(p):
    y, z = p[1] - TILT_PIVOT[0], p[2] - TILT_PIVOT[1]
    c, s = math.cos(-TILT), math.sin(-TILT)
    return (p[0], TILT_PIVOT[0] + y * c - z * s + LIFT, TILT_PIVOT[1] + y * s + z * c)


class Part:
    def __init__(self, name, mat, weights, angle=40, rigid=None, tilted=False, big=False):
        self.name, self.mat, self.weights, self.angle, self.rigid, self.tilted, self.big = name, mat, weights, angle, rigid, tilted, big
        self.v, self.f = [], []

    def add(self, verts, faces):
        o = len(self.v)
        pts = [tilt(p) if self.tilted else tuple(p) for p in verts]
        if self.big:
            pts = [scale_about(p, CHIN, HEAD_K) for p in pts]
        self.v += pts
        self.f += [[i + o for i in f] for f in faces]


PARTS = []


def ring(y, hw, zf, zb, n, p=0.75, x0=0.0):
    # a rounded-box section: x = hw·sin^p, z = front/back extent · cos^p; y may be a function of the angle
    pts = []
    for k in range(n):
        t = 2 * math.pi * k / n
        s, c = math.sin(t), math.cos(t)
        sx = math.copysign(abs(s) ** p, s)
        cz = math.copysign(abs(c) ** p, c)
        yy = y(t) if callable(y) else y
        pts.append((x0 + hw * sx, yy, zf * cz if cz >= 0 else -zb * cz))
    return pts


def loft(part, rings, cap_bottom=False, cap_top=False):
    n = len(rings[0])
    verts = [p for r in rings for p in r]
    faces = []
    for j in range(len(rings) - 1):
        for i in range(n):
            a, b = j * n + i, j * n + (i + 1) % n
            faces.append([a, b, b + n, a + n])
    if cap_bottom:
        cy = sum(p[1] for p in rings[0]) / n
        cz = sum(p[2] for p in rings[0]) / n
        verts.append((0, cy, cz))
        c = len(verts) - 1
        faces += [[(i + 1) % n, i, c] for i in range(n)]
    if cap_top:
        r = rings[-1]
        cy = sum(p[1] for p in r) / n + 0.004
        cz = sum(p[2] for p in r) / n
        verts.append((0, cy, cz))
        c = len(verts) - 1
        o = (len(rings) - 1) * n
        faces += [[o + i, o + (i + 1) % n, c] for i in range(n)]
    part.add(verts, faces)


def sphere(part, c, r, nu=10, nv=7, sy=1.0):
    verts, faces = [], []
    verts.append((c[0], c[1] - r * sy, c[2]))
    for j in range(1, nv):
        ph = math.pi * j / nv
        for i in range(nu):
            t = 2 * math.pi * i / nu
            verts.append((c[0] + r * math.sin(ph) * math.sin(t), c[1] - r * sy * math.cos(ph), c[2] + r * math.sin(ph) * math.cos(t)))
    verts.append((c[0], c[1] + r * sy, c[2]))
    top = len(verts) - 1
    for i in range(nu):
        faces.append([0, 1 + (i + 1) % nu, 1 + i])
    for j in range(nv - 2):
        for i in range(nu):
            a, b = 1 + j * nu + i, 1 + j * nu + (i + 1) % nu
            faces.append([a, b, b + nu, a + nu])
    o = 1 + (nv - 2) * nu
    for i in range(nu):
        faces.append([o + i, o + (i + 1) % nu, top])
    part.add(verts, faces)


def box_wedge(part, x0, x1, z0, z1, yb, yt, yfront):
    # a shoe: box whose top slopes down to the toe
    v = [(x0, 0, z0), (x1, 0, z0), (x1, 0, z1), (x0, 0, z1),
         (x0, yt, z0), (x1, yt, z0), (x1, yfront, z1), (x0, yfront, z1)]
    v = [(a, b + yb, c) for a, b, c in v]
    f = [[0, 1, 2, 3], [7, 6, 5, 4], [4, 5, 1, 0], [5, 6, 2, 1], [6, 7, 3, 2], [7, 4, 0, 3]]
    part.add(v, f)


def scale_about(p, c, k):
    return tuple(c[i] + (p[i] - c[i]) * k for i in range(3))


def tube(part, a, b, r1, r2, n=10, cap0=False, cap1=True, squash=1.0):
    # a tapered tube from a to b (round, or squashed across), closed at the ends asked for
    a, b = Vector(a), Vector(b)
    d = (b - a).normalized()
    u = d.cross(Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))).normalized()
    w = d.cross(u).normalized()
    verts, faces = [], []
    for c, r in ((a, r1), (b, r2)):
        for i in range(n):
            t = 2 * math.pi * i / n
            q = c + u * (math.cos(t) * r) + w * (math.sin(t) * r * squash)
            verts.append(tuple(q))
    for i in range(n):
        faces.append([i, (i + 1) % n, n + (i + 1) % n, n + i])
    if cap0:
        verts.append(tuple(a)); faces += [[(i + 1) % n, i, 2 * n] for i in range(n)]
    if cap1:
        verts.append(tuple(b)); ci = len(verts) - 1; faces += [[n + i, n + (i + 1) % n, ci] for i in range(n)]
    part.add(verts, faces)


def loft_along(part, rings, cap0=True, cap1=True):
    # rings: lists of points (equal counts); quads between them, fans at the ends
    n = len(rings[0])
    verts = [p for r in rings for p in r]
    faces = []
    for j in range(len(rings) - 1):
        for i in range(n):
            a, b = j * n + i, j * n + (i + 1) % n
            faces.append([a, b, b + n, a + n])
    if cap0:
        c = tuple(sum(p[k] for p in rings[0]) / n for k in range(3)); verts.append(c); ci = len(verts) - 1
        faces += [[(i + 1) % n, i, ci] for i in range(n)]
    if cap1:
        c = tuple(sum(p[k] for p in rings[-1]) / n for k in range(3)); verts.append(c); ci = len(verts) - 1
        o = (len(rings) - 1) * n
        faces += [[o + i, o + (i + 1) % n, ci] for i in range(n)]
    part.add(verts, faces)


def ell_ring(c, ax1, ax2, r1, r2, n=10):
    # an elliptical ring around centre c spanned by unit axes ax1, ax2
    c, ax1, ax2 = Vector(c), Vector(ax1), Vector(ax2)
    return [tuple(c + ax1 * (math.cos(2 * math.pi * i / n) * r1) + ax2 * (math.sin(2 * math.pi * i / n) * r2)) for i in range(n)]


# ------------------------------------------------------------------ the model (fractions of H)
def side(x):
    return 'L' if x > 0 else 'R'


def w_cape(p):
    x, y, z = p
    arm = smooth(0.095, 0.165, abs(x)) * (1 - smooth(0.70, 0.745, y))
    el = arm * (1 - smooth(0.49, 0.6, y))
    s = side(x)
    return {'torso': 1 - arm, 'sh' + s: arm - el, 'el' + s: el}


cape = Part('cape', 'tunic', w_cape, angle=55)
hem = lambda t: 0.448 - 0.04 * abs(math.sin(t)) ** 1.6   # the hem rises over the belt in front and behind
N = 24
# the cloth has thickness: an inner lip turns up under the cape's edge (darker, in its own shadow)
lip = Part('capeLip', 'inner', w_cape, angle=70)
loft(lip, [ring(lambda t: hem(t) + 0.03, 0.19, 0.112, -0.064, N, 0.62), ring(hem, 0.209, 0.126, -0.075, N, 0.62)])
PARTS.append(lip)
loft(cape, [
    ring(hem, 0.212, 0.128, -0.077, N, 0.62),
    ring(0.54, 0.214, 0.132, -0.077, N, 0.62),
    ring(0.62, 0.197, 0.138, -0.066, N, 0.66),
    ring(0.70, 0.163, 0.118, -0.046, N, 0.72),
    ring(0.74, 0.122, 0.096, -0.028, N, 0.8),
    ring(0.765, 0.052, 0.082, 0.012, N, 0.9),
    ring(0.772, 0.03, 0.074, 0.026, N, 1.0),
])
PARTS.append(cape)

belt = Part('belt', 'belt', lambda p: {'torso': 1.0}, angle=50)
loft(belt, [ring(0.405, 0.104, 0.121, -0.071, N, 0.75), ring(0.47, 0.1, 0.119, -0.069, N, 0.75)])  # (inside the cape)
PARTS.append(belt)


def w_robe(p):
    x, y, z = p
    k = smooth(0.43, 0.2, y)
    a = math.atan2(x, z - 0.01)
    c, s = math.cos(a), math.sin(a)
    w = {'hips': 1 - k}
    for b, v in (('skirtF', max(0, c) ** 2), ('skirtB', max(0, -c) ** 2), ('skirtL', max(0, s) ** 2), ('skirtR', max(0, -s) ** 2)):
        if v > 0:
            w[b] = k * v
    return w


robe = Part('robe', 'tunic', w_robe, angle=55)


def folds(pts, amp):
    # soft folds: push the section in and out around its circumference (deeper toward the hem)
    out = []
    for k, (x, y, z) in enumerate(pts):
        t = 2 * math.pi * k / len(pts)
        f = 1 + amp * math.sin(6 * t + 0.4)
        out.append((x * f, y, z * f))
    return out


loft(robe, [
    folds(ring(0.04, 0.158, 0.133, -0.13, N, 0.7), 0.035),
    folds(ring(0.12, 0.161, 0.139, -0.12, N, 0.7), 0.028),
    folds(ring(0.24, 0.164, 0.144, -0.108, N, 0.7), 0.018),
    folds(ring(0.35, 0.152, 0.143, -0.092, N, 0.72), 0.008),
    ring(0.415, 0.104, 0.125, -0.076, N, 0.75),
])
PARTS.append(robe)
rlip = Part('robeLip', 'inner', w_robe, angle=70)
loft(rlip, [folds(ring(0.07, 0.146, 0.12, -0.118, N, 0.7), 0.035), folds(ring(0.04, 0.156, 0.131, -0.128, N, 0.7), 0.035)])
PARTS.append(rlip)
# the belt's knot at the front left, two ends hanging
knot = Part('knot', 'belt', lambda p: {'torso': 1.0}, angle=50)
sphere(knot, (0.045, 0.438, 0.128), 0.016, 8, 6)
tube(knot, (0.04, 0.43, 0.126), (0.03, 0.37, 0.14), 0.008, 0.007, 6, squash=0.5)
tube(knot, (0.052, 0.43, 0.126), (0.068, 0.375, 0.136), 0.008, 0.007, 6, squash=0.5)
PARTS.append(knot)

for sx in (1, -1):
    s = side(sx)
    fb = (lambda b: (lambda p: {b: 1.0}))('foot' + s)
    # slipper: sections from the heel to a slightly pointed, lifted toe, on a darker sole
    cx = sx * 0.0775
    secs = [(-0.05, 0.022, 0.03, 0.0), (-0.02, 0.026, 0.036, 0.0), (0.03, 0.027, 0.032, 0.0), (0.07, 0.022, 0.022, 0.002), (0.095, 0.012, 0.012, 0.008)]
    shoe = Part('shoe' + s, 'shoe', fb, angle=45)
    loft_along(shoe, [[(cx + hw * math.cos(2 * math.pi * i / 10), 0.004 + yo + (h * (0.5 + 0.5 * math.sin(2 * math.pi * i / 10))), z) for i in range(10)] for z, hw, h, yo in secs])
    PARTS.append(shoe)
    sole = Part('sole' + s, 'sole', fb, angle=30)
    box_wedge(sole, cx - 0.026, cx + 0.026, -0.052, 0.088, 0.0, 0.006, 0.006)
    PARTS.append(sole)
    hb = (lambda b: (lambda p: {b: 1.0}))('hand' + s)
    # the sleeve's cuff: a flared opening under the cape's side, dark inside, the wrist coming out of it
    cuff = Part('cuff' + s, 'tunic', lambda p, s=s: {'el' + s: 1.0}, angle=50)
    tube(cuff, (sx * 0.182, 0.455, 0.012), (sx * 0.179, 0.392, 0.014), 0.03, 0.043, 12, cap1=False)
    PARTS.append(cuff)
    cin = Part('cuffIn' + s, 'inner', lambda p, s=s: {'el' + s: 1.0}, angle=70)
    cin.add(ell_ring((sx * 0.179, 0.394, 0.014), (1, 0, 0), (0, 0, 1), 0.04, 0.04, 12), [list(range(12))])
    PARTS.append(cin)
    # the hand: a mitten (palm and closed fingers) with a thumb, palm turned to the body
    hand = Part('hand' + s, 'skin', hb, angle=60)
    hx, hz = sx * 0.178, 0.014
    loft_along(hand, [ell_ring((hx, y, hz + dz), (1, 0, 0), (0, 0, 1), rx, rz, 10) for y, rx, rz, dz in
                      [(0.40, 0.014, 0.018, 0.0), (0.383, 0.017, 0.026, 0.002), (0.362, 0.016, 0.028, 0.004), (0.343, 0.013, 0.024, 0.006), (0.333, 0.008, 0.015, 0.007)]])
    tube(hand, (hx - sx * 0.004, 0.385, hz + 0.02), (hx - sx * 0.012, 0.36, hz + 0.036), 0.0075, 0.006, 7)
    PARTS.append(hand)

neck = Part('neck', 'skin', lambda p: {'neck': 1 - smooth(0.79, 0.83, p[1]), 'head': smooth(0.79, 0.83, p[1])}, angle=60)
loft(neck, [ring(0.735, 0.031, 0.08, 0.02, 12, 0.9), ring(0.785, 0.027, 0.078, 0.022, 12, 0.9), ring(0.83, 0.028, 0.082, 0.02, 12, 0.9)])
PARTS.append(neck)

# the head: horizontal sections of the original (half outlines from the front centre round the side to the back
# centre, as displayed — the head already carries its slight upward tilt). The lower face juts furthest forward
# (a short snout at 0.82–0.89 H), the forehead slopes back above the eyes, the section is a wedge pointing forward.
HEAD = [
    (0.822, [(0, 0.143), (0.045, 0.105), (0.055, 0.075), (0.028, 0.045), (0, 0.025)]),
    (0.847, [(0, 0.153), (0.03, 0.134), (0.056, 0.115), (0.077, 0.069), (0.051, 0.02), (0, 0.0)]),
    (0.870, [(0, 0.15), (0.034, 0.13), (0.058, 0.115), (0.076, 0.07), (0.068, 0.02), (0.033, -0.008), (0, -0.016)]),
    (0.890, [(0, 0.141), (0.036, 0.126), (0.058, 0.113), (0.076, 0.07), (0.072, 0.025), (0.035, -0.012), (0, -0.026)]),
    (0.908, [(0, 0.119), (0.035, 0.114), (0.059, 0.1), (0.073, 0.076), (0.071, 0.024), (0.035, -0.014), (0, -0.024)]),
    (0.935, [(0, 0.109), (0.029, 0.105), (0.045, 0.097), (0.06, 0.06), (0.061, 0.02), (0.03, -0.005), (0, -0.011)]),
    (0.950, [(0, 0.08), (0.04, 0.072), (0.054, 0.05), (0.05, 0.02), (0.02, 0.0), (0, -0.005)]),
]
K = 7  # points per half outline after resampling


def resample(half, k):
    seg = [math.dist(half[i], half[i + 1]) for i in range(len(half) - 1)]
    tot = sum(seg)
    out = []
    for j in range(k):
        d, i = tot * j / (k - 1), 0
        while i < len(seg) - 1 and d > seg[i]:
            d -= seg[i]
            i += 1
        t = min(1, d / seg[i]) if seg[i] else 0
        out.append((half[i][0] + (half[i + 1][0] - half[i][0]) * t, half[i][1] + (half[i + 1][1] - half[i][1]) * t))
    return out


def head_ring(y, half):
    h = resample(half, K)
    # around: front centre → left side (+x) → back centre → right side (−x), counter-clockwise seen from above
    pts = [(x, y, z) for x, z in h] + [(-x, y, z) for x, z in reversed(h[1:-1])]
    return pts


head = Part('head', 'skin', lambda p: {'head': 1.0}, angle=85, big=True)  # (smooth shading across the cheek corners; the silhouette keeps its LBA2 wedge)
# smoother than the original: 11 points per half section, and a blended section between each measured pair
K = 11
FINE = []
for (y0, h0), (y1, h1) in zip(HEAD, HEAD[1:]):
    a, b = resample(h0, 25), resample(h1, 25)
    FINE.append((y0, h0))
    FINE.append(((y0 + y1) / 2, [((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2) for pa, pb in zip(a, b)]))
FINE.append(HEAD[-1])
rings = [head_ring(y, hh) for y, hh in FINE]
loft(head, rings)
# chin and crown: close the ends on a point
n = len(rings[0])
o = len(head.v)
head.add([(0, 0.799, 0.095)], [])
head.f += [[(i + 1) % n, i, o] for i in range(n)]
top0 = (len(rings) - 1) * n
head.add([(0, 0.956, 0.035)], [])
head.f += [[top0 + i, top0 + (i + 1) % n, o + 1] for i in range(n)]
PARTS.append(head)


def head_front(x, y):
    # z of the face surface at (x, y), for placing the eyes on it
    for (y0, h0), (y1, h1) in zip(HEAD, HEAD[1:]):
        if y0 <= y <= y1:
            t = (y - y0) / (y1 - y0)
            def fz(h):
                pts = resample(h, 25)
                for (xa, za), (xb, zb) in zip(pts, pts[1:]):
                    if xa <= abs(x) <= xb:
                        u = (abs(x) - xa) / (xb - xa) if xb > xa else 0
                        return za + (zb - za) * u
                return pts[0][1]
            return fz(h0) + (fz(h1) - fz(h0)) * t
    return 0.1


hair = Part('hair', 'hair', lambda p: {'head': 1.0}, angle=70, big=True)


def back_arc(y, half, zcut, m, grow):
    # the part of a head section behind z = zcut (left side → back → right side), pushed out by `grow`
    full = [(x, z) for x, z in resample(half, 25)]
    pts = [(x, z) for x, z in full if z <= zcut]
    arc = [(px, pz) for px, pz in reversed(pts)] + [(-px, pz) for px, pz in pts[1:]]
    # resample the arc to m points
    seg = [math.dist(arc[i], arc[i + 1]) for i in range(len(arc) - 1)]
    tot = sum(seg) or 1
    outp = []
    for j in range(m):
        d, i = tot * j / (m - 1), 0
        while i < len(seg) - 1 and d > seg[i]:
            d -= seg[i]; i += 1
        t = min(1, d / seg[i]) if seg[i] else 0
        x = arc[i][0] + (arc[i + 1][0] - arc[i][0]) * t; z = arc[i][1] + (arc[i + 1][1] - arc[i][1]) * t
        cz = 0.06
        r = math.hypot(x, z - cz) or 1
        outp.append((x + x / r * grow, y, z + (z - cz) / r * grow))
    return outp


# the hairline climbs from behind the ears to the crown; the cap is a shell 6 mm off the skull
cap_rows = [(y, back_arc(y, hh, zc, 13, 0.006)) for (y, hh), zc in zip(HEAD[2:], [0.0, 0.03, 0.05, 0.07, 0.08])]
M = 13
hv, hf = [], []
for j, (y, row) in enumerate(cap_rows):
    hv += row
for j in range(len(cap_rows) - 1):
    for i in range(M - 1):
        a, b = j * M + i, j * M + i + 1
        hf.append([a + M, b + M, b, a])
hv.append((0.0, 0.962, 0.03)); top = len(hv) - 1
o = (len(cap_rows) - 1) * M
hf += [[o + i + 1, o + i, top] for i in range(M - 1)]
hair.add(hv, hf)
PARTS.append(hair)
# the topknot: a bun with a dark tie, then the short tail of the knot
bun1 = Part('bun1', 'hair', lambda p: {'tail0': 1.0}, angle=60, big=True)
sphere(bun1, (0.0, 0.93, -0.098), 0.034, 10, 7, sy=0.85)
PARTS.append(bun1)
tie = Part('tie', 'tie', lambda p: {'tail0': 1.0}, angle=60, big=True)
tube(tie, (0.0, 0.94, -0.066), (0.0, 0.937, -0.075), 0.02, 0.021, 10, cap0=False, cap1=False)
PARTS.append(tie)
bun2 = Part('bun2', 'hair', lambda p: {'tail1': 1.0}, angle=60, big=True)
tube(bun2, (0.0, 0.905, -0.118), (0.0, 0.872, -0.124), 0.022, 0.01, 9, cap0=True)
PARTS.append(bun2)

# medallion: an octagonal gold plate on the chest, a lighter face, the cord running up to the collar
med = Part('medal', 'medal', lambda p: {'torso': 1.0}, angle=40)
mc, mr, mz = (0.0, 0.625), 0.045, 0.141
NM = 16
circ = lambda r: [(mc[0] - r * math.sin(2 * math.pi * k / NM), mc[1] + r * math.cos(2 * math.pi * k / NM)) for k in range(NM)]
rim, inn = circ(mr), circ(mr * 0.78)
v = [(x, y, mz - 0.006) for x, y in rim] + [(x, y, mz + 0.005) for x, y in rim] + [(x, y, mz + 0.006) for x, y in inn]
f = [[i, (i + 1) % NM, NM + (i + 1) % NM, NM + i] for i in range(NM)] + [[NM + i, NM + (i + 1) % NM, 2 * NM + (i + 1) % NM, 2 * NM + i] for i in range(NM)]
med.add(v, f)
PARTS.append(med)
medf = Part('medalFace', 'medalFace', lambda p: {'torso': 1.0}, angle=40)
fc = circ(mr * 0.78)
medf.add([(x, y, mz + 0.0045) for x, y in fc] + [(mc[0], mc[1], mz + 0.009)], [[i, (i + 1) % NM, NM] for i in range(NM)][::1])
PARTS.append(medf)
cord = Part('cord', 'cord', lambda p: {'torso': 1.0}, angle=180)
for sx in (1, -1):
    pts = [(sx * 0.032, 0.768, 0.072), (sx * 0.024, 0.72, 0.112), (sx * 0.012, 0.675, 0.136), (sx * 0.004, 0.664, 0.142)]
    w = 0.0036
    vv = []
    for x, y, z in pts:
        vv += [(x - w, y, z + 0.002), (x + w, y, z + 0.002)]
    ff = [[2 * i + 1, 2 * i, 2 * i + 2, 2 * i + 3] for i in range(len(pts) - 1)]
    cord.add(vv, ff)
PARTS.append(cord)

# eyes (separate, so they can blink): a flat diamond on the face, the iris a smaller one on top of it
EYES = []
for sx in (1, -1):
    cx, cy = sx * 0.037, 0.896
    cz = head_front(cx, cy) + 0.003
    def on_face(dx, dy, lift=0.0):
        p = (cx + dx, cy + dy, head_front(cx + dx, cy + dy) + 0.003 + lift)
        return scale_about(tilt(p) if False else p, CHIN, HEAD_K)
    # almond: wider than tall, the outer corner a touch higher
    white = [on_face(0.023 * math.cos(t) , 0.012 * math.sin(t) + sx * 0.002 * math.cos(t)) for t in [2 * math.pi * k / 10 for k in range(10)]]
    ic = (sx * 0.003, 0.0)
    iris = [on_face(ic[0] + 0.0095 * math.cos(t), ic[1] + 0.0095 * math.sin(t), 0.0012) for t in [2 * math.pi * k / 10 for k in range(10)]]
    pupil = [on_face(ic[0] + 0.0045 * math.cos(t), ic[1] + 0.0045 * math.sin(t), 0.0022) for t in [2 * math.pi * k / 8 for k in range(8)]]
    lid = [on_face(-0.025, 0.002, 0.0026), on_face(-0.012, 0.0135, 0.0026), on_face(0.0, 0.0155, 0.0026), on_face(0.013, 0.0145, 0.0026), on_face(0.026, 0.006, 0.0026),
           on_face(0.024, 0.0095, 0.0026), on_face(0.013, 0.0185, 0.0026), on_face(0.0, 0.0195, 0.0026), on_face(-0.012, 0.0175, 0.0026), on_face(-0.024, 0.0055, 0.0026)]
    piv = scale_about((cx, cy, cz), CHIN, HEAD_K)
    EYES.append({'pivot': piv, 'tris': [(white, 'white'), (iris, 'iris'), (pupil, 'pupil'), (lid, 'lid')]})


# ------------------------------------------------------------------ arms: model in the display pose, store the rest pose
def rot_z(a, pivot):
    T = Matrix.Translation(Vector(pivot))
    return T @ Matrix.Rotation(a, 4, 'Z') @ T.inverted()


ARM_M = {}
for s, sg in (('L', 1), ('R', -1)):
    piv = [c / S for c in B['sh' + s]['p']]
    m = rot_z(sg * SPREAD, piv)
    for b in ('sh' + s, 'el' + s, 'hand' + s):
        ARM_M[b] = m


def to_rest(p, w):
    # the game spreads the arms by SPREAD at the shoulder: un-spread the vertex by its own blend of bones
    M = Matrix(((0, 0, 0, 0),) * 4)
    for b, wt in w.items():
        M = M + (ARM_M.get(b, Matrix.Identity(4)) * wt)
    return tuple(M.inverted() @ Vector(p))


# ------------------------------------------------------------------ build Blender objects (source file) + export
def hexrgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def gb(p):   # game → Blender axes (z up, model facing -y), scaled to game units
    return Vector((p[0] * S, -p[2] * S, p[1] * S))


bpy.ops.wm.read_factory_settings(use_empty=True)
arm_data = bpy.data.armatures.new('TwinsenRig')
arm_obj = bpy.data.objects.new('TwinsenRig', arm_data)
bpy.context.scene.collection.objects.link(arm_obj)
bpy.context.view_layer.objects.active = arm_obj
bpy.ops.object.mode_set(mode='EDIT')
kids = {}
for nm, b in B.items():
    if b['parent']:
        kids.setdefault(b['parent'], []).append(nm)
for nm, b in B.items():
    eb = arm_data.edit_bones.new(nm)
    hp = Vector((b['p'][0], -b['p'][2], b['p'][1]))
    tail = None
    for k in kids.get(nm, []):
        if not k.startswith('skirt'):
            tail = Vector((B[k]['p'][0], -B[k]['p'][2], B[k]['p'][1]))
            break
    if tail is None or (tail - hp).length < 1e-3:
        tail = hp + Vector((0, 0, 0.08))
    eb.head, eb.tail = hp, tail
for nm, b in B.items():
    if b['parent']:
        arm_data.edit_bones[nm].parent = arm_data.edit_bones[b['parent']]
bpy.ops.object.mode_set(mode='OBJECT')

mats = {}
for k, h in COL.items():
    m = bpy.data.materials.new(k)
    r, g, b_ = [c / 255 for c in hexrgb(h)]
    m.diffuse_color = (r, g, b_, 1)
    mats[k] = m

out = {'bones': [], 'pos': [], 'nrm': [], 'col': [], 'si': [], 'sw': [], 'eyes': [], 'tris': 0}
bone_ix = {}


def bix(nm):
    if nm not in bone_ix:
        bone_ix[nm] = len(out['bones'])
        out['bones'].append(nm)
    return bone_ix[nm]


def corner_normals(verts, tris, angle):
    # smooth across edges flatter than `angle`, hard (faceted) beyond — like LBA2's gouraud polys with creases
    fn = []
    for t in tris:
        a, b, c = (Vector(verts[i]) for i in t)
        n = (b - a).cross(c - a)
        fn.append(n.normalized() if n.length > 1e-12 else Vector((0, 1, 0)))
    around = {}
    for fi, t in enumerate(tris):
        for i in t:
            around.setdefault(i, []).append(fi)
    cos_lim = math.cos(math.radians(angle))
    res = []
    for fi, t in enumerate(tris):
        cn = []
        for i in t:
            acc = Vector((0, 0, 0))
            for g in around[i]:
                if fn[g].dot(fn[fi]) >= cos_lim:
                    acc += fn[g]
            cn.append(acc.normalized() if acc.length > 1e-9 else fn[fi])
        res.append(cn)
    return res


for part in PARTS:
    W = [part.weights(p) for p in part.v]
    rest = [to_rest(p, w) for p, w in zip(part.v, W)]
    tris = []
    for f in part.f:
        for k in range(1, len(f) - 1):
            tris.append((f[0], f[k], f[k + 1]))
    # Blender object (rest pose, vertex groups, armature modifier)
    me = bpy.data.meshes.new(part.name)
    me.from_pydata([gb(p) for p in rest], [], part.f)
    me.materials.append(mats[part.mat])
    ob = bpy.data.objects.new(part.name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = arm_obj
    mod = ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm_obj
    groups = {}
    for vi, w in enumerate(W):
        for b, wt in w.items():
            if wt <= 1e-4:
                continue
            if b not in groups:
                groups[b] = ob.vertex_groups.new(name=b)
            groups[b].add([vi], wt, 'REPLACE')
    # export (game axes, game units, unindexed triangles)
    cn = corner_normals(rest, tris, part.angle)
    rgb = hexrgb(COL[part.mat])
    for t, ns in zip(tris, cn):
        for i, n in zip(t, ns):
            out['pos'] += [round(c * S, 5) for c in rest[i]]
            out['nrm'] += [round(c, 4) for c in n]
            out['col'] += rgb
            ws = sorted(((b, wt) for b, wt in W[i].items() if wt > 1e-4), key=lambda q: -q[1])[:4]
            tot = sum(wt for _, wt in ws)
            ws += [(None, 0)] * (4 - len(ws))
            out['si'] += [bix(b) if b else 0 for b, _ in ws]
            out['sw'] += [round(wt / tot, 4) for _, wt in ws]
    out['tris'] += len(tris)

for e in EYES:
    piv = e['pivot']
    ed = {'bone': 'head', 'pivot': [round(c * S, 5) for c in piv], 'pos': [], 'col': []}
    for quad, mat in e['tris']:
        nq = len(quad)
        if mat == 'lid':   # a strip: the lower edge forward, the upper edge back
            h = nq // 2
            tl = []
            for i in range(h - 1):
                a, b, c, d = i, i + 1, nq - 2 - i, nq - 1 - i
                tl += [(a, b, c), (a, c, d)]
        else:
            tl = [(0, k, k + 1) for k in range(1, nq - 1)]
        for t in tl:
            for i in t:
                ed['pos'] += [round((quad[i][k] - piv[k]) * S, 5) for k in range(3)]
                ed['col'] += hexrgb(COL[mat])
        out['tris'] += len(tl)
        me = bpy.data.meshes.new('eye_' + mat)
        me.from_pydata([gb(p) for p in quad], [], [list(range(nq))])
        me.materials.append(mats[mat])
        ob = bpy.data.objects.new('eye_' + mat, me)
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = arm_obj
        ob.parent_type = 'BONE'
        ob.parent_bone = 'head'
        ob.matrix_world = Matrix.Identity(4)
    out['eyes'].append(ed)

json.dump(out, open(OUT, 'w'), separators=(',', ':'))
print('tris', out['tris'], 'verts', len(out['pos']) // 3, 'bones', out['bones'])
if BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    print('saved', BLEND)
