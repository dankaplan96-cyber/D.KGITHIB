# Twinsen as a low-poly model (Blender, run headless):
#   python -c "import bpy" must work (pip install bpy), then
#   python tools/blender/twinsen_poly.py art/characters/skeletons.json assets/poly [art/characters/twinsen/twinsen_poly.blend]
#   (the skeleton file may hold every character or Twinsen alone; the output may be a .json file or a folder;
#   the .blend is written only when named, and it is Twinsen's own file, not the cast's cast_poly.blend)
#   Without Blender: PYTHONPATH=tools/blender/nobpy python3 tools/blender/twinsen_poly.py art/characters/skeletons.json OUT.json
#   (P123: matches the shipped v156 model to the JSON's last digit, except the medallion's cord, which is laid by ray casts:
#   up to 1.2 mm off; docs/lba-maturity/P123.md)
#
# Built from the measurements of LBA2's in-game model (docs/character-review.md §11): every ring below is a
# horizontal section of the original (height, half-width, front and back extent, fractions of the height H).
# Skinned like LBA2 skins its models: each part follows one bone, with blends only where cloth spans two
# (each half of the robe follows its leg as in the original, the hair's tuft swings; the cape's sides follow the arms as
# in the original: they are his sleeves. HERO-ARMS: below the armpit the sleeves are cut from the tunic's front and back,
# which stay on the body, so a raised arm lifts a sleeve and not the whole tunic, I-22).
# The skeleton is the game's own (exported from createCharacter), so every existing animation drives it.
# TWINSEN-FIGURE (opt-in, TW_FIGURE=1; rejected by the user 15.11: "our old Twinsen is better"; the default build is the shipped model): the user's figurine replaces the cape,
# the hair, the belt, the shoes and parts of the face: see FIGURE below and docs/lba-maturity/TWINSEN-FIGURE.md.
import json, math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import bmesh
from mathutils import Matrix, Vector
from lbapoly import mouth_lens, strip_mesh, strip_tris

SKEL, OUT = sys.argv[-2], sys.argv[-1]
BLEND = None
if sys.argv[-1].endswith('.blend'):
    SKEL, OUT, BLEND = sys.argv[-3], sys.argv[-2], sys.argv[-1]
if os.path.isdir(OUT):   # (README form: <skeletons.json> assets/poly → assets/poly/twinsen.json)
    OUT = os.path.join(OUT, 'twinsen.json')
skel = json.load(open(SKEL))
skel = skel.get('twinsen', skel)   # (all the game's skeletons, as tools/dump-skeletons.mjs writes them, or Twinsen's alone)
B = skel['bones']
SPREAD = 0.2  # the arm angle the geometry below is drawn at (the game spreads them by the look's armSpread)
S = 2.1  # the game's height for H (top of the hair)

COL = {
    'tunic': '#2a86ad', 'belt': '#e2805c', 'shoe': '#e98c6c', 'skin': '#e2bc90', 'hair': '#553916', 'hairTuft': '#6a4722',
    'white': '#f2f2f6', 'iris': '#7fb8e0', 'pupil': '#1c3a5a', 'lid': '#5a3a28', 'medal': '#d8bc68', 'medalFace': '#f2e2a0',
    'cord': '#e8b04c', 'band': '#d8a83a', 'lidSkin': '#c29068', 'brow': '#4a3014', 'sole': '#9a4a32', 'inner': '#123f58', 'tie': '#3a2414', 'mouth': '#5c2622',
}
# TWINSEN-FIGURE (the user 15.11, a picture of a Twinsen figurine: "Better than what there is now? Can we try to get closer
# to this?"; and earlier that day, from the play camera behind him, on LBA2's three balls of hair: "the bulge is weird").
# The figure, described in numbers (it is the user's photo and is not in the repo): a tall topknot rising from the crown
# through an orange-brown ring, its tail curving up and back to a point that hangs behind (≈ 0.55 of the head's height
# above the crown); a strip of short hair down the back of the skull, the rest of the scalp bare; an elongated egg head
# with big round eyes, a long round nose and small ears; a wide blue tunic with a high round collar and broad bell
# sleeves to the wrists, the hands out of them (not a cape over the arms); a large round gold medallion on a brown cord;
# a brown sash; a long flared robe to the ankles that parts as he strides; dark brown rounded shoes. TW_FIGURE=0 builds
# the model before it (TWINSEN-ORIG, with its own flags) byte for byte.
FIGURE = os.environ.get('TW_FIGURE', '0') == '1'   # (the user, 15.11: "our old Twinsen is better": off by default)
if FIGURE:
    COL.update({
        'tunic': '#2f86c2', 'inner': '#173f63', 'belt': '#7c4a2a', 'shoe': '#4b3224', 'sole': '#2a1b13',
        'hair': '#4a2f17', 'hairTuft': '#634224', 'ring': '#b05622',
        'iris': '#3a86d2', 'pupil': '#10202e', 'white': '#f4f4f6',
        'medal': '#c99a34', 'medalFace': '#e6c35a', 'medalLine': '#a87a26', 'cord': '#6a4022', 'brow': '#5a3a1e',
    })
HEAD_K = 1.0                      # the head at the original's measured size (≈0.156 H wide; it was drawn ×1.24 before)
CHIN = (0.0, 0.80, 0.09)          # …scaled about the chin, so the neck joint stays where it was


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ------------------------------------------------------------------ geometry helpers (game axes: +y up, +z front)
TILT, TILT_PIVOT = math.radians(10), (0.824, 0.03)   # the original carries its head raised a little
LIFT = 0.0     # (the original's head sits low on a short neck, its chin just over the collar)


def tilt(p):
    y, z = p[1] - TILT_PIVOT[0], p[2] - TILT_PIVOT[1]
    c, s = math.cos(-TILT), math.sin(-TILT)
    return (p[0], TILT_PIVOT[0] + y * c - z * s + LIFT, TILT_PIVOT[1] + y * s + z * c)


class Part:
    def __init__(self, name, mat, weights, angle=40, rigid=None, tilted=False, big=False, normal=None, color=None, reweight=None, game=False):
        self.name, self.mat, self.weights, self.angle, self.rigid, self.tilted, self.big = name, mat, weights, angle, rigid, tilted, big
        self.normal, self.color = normal, color   # (one normal for every corner; a colour name per vertex)
        # HERO-LOOK (I-22): `reweight` gives a part new weights, taken where the game shows its vertices at rest (the arms at
        # the look's armSpread, GAME_SPREAD), so the idle shape is kept exactly; `game`: the part is drawn in that pose
        self.reweight, self.game = reweight, game
        self.cls = None   # (HERO-ARMS: per vertex 'sleeve' / 'body' / 'shared', set by cut_sleeves)
        self.vside = {}   # (TWINSEN-FIGURE: a robe slit's vertex → the side (+1 L, -1 R) whose leg alone carries it)
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


ring_fn = ring   # (TWINSEN-FIGURE: the name `ring` is reused for a loop variable below)


def oring(y, hw, zf, zb, n, p=0.9):
    # like ring(), but round its own centre (zf + zb) / 2: ring() puts the sides at z = 0, which for a section lying
    # wholly in front of the body's axis (the neck, the collar) folds the back point forward of the sides (a crease
    # down the nape, a notched collar edge)
    zc = (zf + zb) / 2
    pts = []
    for k in range(n):
        t = 2 * math.pi * k / n
        s, c = math.sin(t), math.cos(t)
        pts.append((hw * math.copysign(abs(s) ** p, s), y, zc + (zf - zc) * math.copysign(abs(c) ** p, c)))
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
    # LBA2's weights (the original's cape sides follow the arms): the shape below is drawn with them at SPREAD
    x, y, z = p
    arm = smooth(0.095, 0.165, abs(x)) * (1 - smooth(0.70, 0.745, y))
    if FORM:   # (CHAR-FORM: the same weights over a wider band round the arm, so a swing curves the cloth, no hard fold)
        arm = smooth(0.082, 0.178, abs(x)) * (1 - smooth(0.695, 0.75, y))
    el = arm * (1 - smooth(0.49, 0.6, y))
    s = side(x)
    return {'torso': 1 - arm, 'sh' + s: arm - el, 'el' + s: el}


# HERO-LOOK (I-22, the user 31.10: "when Twinsen raises his arms the tunic becomes a sleeved shirt"). With LBA2's weights
# the cape's whole side, from the shoulder to the hem, rode the upper arm and the forearm: an arm raised overhead pulled
# the side up with it into a long sleeve and left the body a narrow column. Now the cape is the tunic's body and stays on
# the torso; only the cloth right over the arm follows it a little (CAPE_ARM of the way, the outer side below the
# shoulder), so a swing still moves the side, and a raised arm comes out of the cape in a sleeve of its own (`sleeve*`
# below, hidden inside the cape at rest). The weights are taken where the game shows the cape at rest (its arms at
# GAME_SPREAD), so the idle silhouette is the one it had.
#
# HERO-ARMS (the user 01.11, on 0.46.0: "the hands and the tunic don't look good at all, like hands that aren't connected
# to the tunic"; with the arms raised the cape sat as a poncho over the shoulders and thin sleeves stuck out from under
# it, while in 0.45 the arm was one blue sleeve from the shoulder to the fist, part of the tunic). Back to LBA2's
# weights: the cape's side IS the sleeve (it rides the upper arm and the forearm, the hand comes out of its end), so in
# every pose the sleeve runs straight out of the shoulder and the hand stays in it. Only what I-22 was about is fixed:
# below the armpit the sleeve is cut from the tunic's front and back (`SLEEVE_COLS`: the cape's faces over the arm,
# 30-150 degrees round each side, keep LBA2's arm weights; the faces in front of and behind them fade to the torso from
# the armpit down, `body_f`), so a raised arm no longer drags the front and back of the tunic up into a sheet from the
# waist to the hand. At rest both halves of every cut vertex sit where the game shows LBA2's cape (its arms at
# GAME_SPREAD), so the idle silhouette is 0.45's. A tunic body under the cape (`tunicBody`) fills the cut when a sleeve
# swings or rises. TW_CAPE_046=1 builds 0.46.0's HERO-LOOK cape (on the torso, 15 % over the arm, sleeves of its own).
CAPE_046 = bool(os.environ.get('TW_CAPE_046'))
# WA-16 (the user 01.11, on 0.48: "it's a shirt, not a tunic; look how LBA2 did it and copy it"; measured on the laptop:
# LBA2's body 1 has the cape's outer part on the upper arm and the rest on the torso, no sleeve, one closed shell that
# stretches into a wing from the belt to the hand when the arm rises). The default is that cape again (0.45's: LBA2's
# weights, no cut, no tunic body, no sleeve walls); TW_CAPE_CUT=1 builds HERO-ARMS' cut sleeves (0.47-0.48).
CAPE_CUT = bool(os.environ.get('TW_CAPE_CUT')) and not CAPE_046
CAPE_ARM = 0.15
SEAM_F, SEAM_B = 2, 10   # (the cut's columns of the 24 round the cape: 30 and 150 degrees, the side between is the sleeve)
SLEEVE_COLS = set(range(SEAM_F, SEAM_B)) | set(range(24 - SEAM_B, 24 - SEAM_F))
CUT_RINGS = 3        # (the cut runs up through the hem, 0.54 and 0.62 rings and closes at the 0.70 ring, the armpit)
SLEEVE_PROUD = float(os.environ.get("TW_PROUD", "0.007"))   # (H: about 1.5 cm)


def sleeve_k(y):
    # below the armpit the sleeve's own cloth rides the arm all the way (LBA2's weights fade to the torso inward from
    # 0.165 H out, which left the sleeve's front and back edges behind the arm)
    return 1 - smooth(0.60, 0.70, y)


def w_cape_game(p):   # (0.46.0's, TW_CAPE_046)
    x, y, z = p
    arm = CAPE_ARM * smooth(0.135, 0.215, abs(x)) * (1 - smooth(0.6, 0.7, y))
    el = arm * (1 - smooth(0.49, 0.6, y))
    s = side(x)
    return {'torso': 1 - arm, 'sh' + s: arm - el, 'el' + s: el}


def body_f(y):
    # how much of LBA2's arm weight the tunic's front and back keep beside the cut: all of it at the armpit, none at
    # the waist (the 0.62 ring keeps about two thirds: the armhole's cloth stretches a little, as a real one does)
    return smooth(0.50, 0.70, y)


def cut_sleeves(part, n, rings):
    """Cut the part's loft (n points round; its `rings` lowest rings) between the sleeve columns and the body columns:
    each vertex on the cut gets a copy for the sleeve's faces. Sets part.cls: 'sleeve' / 'body' / 'shared' per vertex."""
    cls = ['shared' if i // n >= rings else 'body' for i in range(len(part.v))]
    used = {}
    for f in part.f:
        for i in f:
            used.setdefault(i, set()).add(f[0] % n in SLEEVE_COLS)
    for i, u in used.items():
        if cls[i] == 'body' and u == {True}:
            cls[i] = 'sleeve'
    copies = {}
    for f in part.f:
        if f[0] % n not in SLEEVE_COLS:
            continue
        for k, i in enumerate(f):
            if cls[i] == 'body':
                if i not in copies:
                    copies[i] = len(part.v)
                    part.v.append(part.v[i])
                    cls.append('sleeve')
                f[k] = copies[i]
    part.cls, part.copies = cls, copies
    # the sleeve stands a little proud of the tunic's front and back (SLEEVE_PROUD out from the body's axis, none at the
    # armpit), so at rest a fine shadowed edge runs down the cut from the armpit to the cuff: the arm reads as a sleeve
    for i, c in enumerate(cls):
        if c == 'sleeve':
            x, y, z = part.v[i]
            r = math.hypot(x, z - 0.025)
            k = SLEEVE_PROUD * sleeve_k(y) / r
            part.v[i] = (x + x * k, y, z + (z - 0.025) * k)
    return len(copies)


cape = Part('cape', 'tunic', w_cape, angle=55, reweight=w_cape_game if CAPE_046 else None)
hem = lambda t: 0.448 - 0.04 * abs(math.sin(t)) ** 1.6   # the hem rises over the belt in front and behind
N = 24
# CHAR-FORM (REPAIR-PASS-18-11 phase 3; the user 18.11, from play: "characters still look like connected tubes instead of
# designed bodies"). Form, not a new design: the same cape, robe, colours, face and hair, built as cloth over a body.
#   cape   the shoulders read: the cloth runs nearly level from the collar to a rounded shoulder point (±0.177 H at 0.70,
#          was a straight cone through ±0.163) and then hangs; four more rings through the shoulder and the elbow's
#          blend, so a swung or bent arm curves the cape's side instead of folding it into a flat sheet (the run)
#   robe   a pelvis: the robe swells over the hips and the seat just under the belt and then falls in its A-line; eleven
#          rings instead of five, so a stride bends each half round the hip and the knee instead of shearing one band
#   shins  a knee, a calf behind and a slim ankle into the slipper (they show when the robe parts), not a straight tube
# The front centre line of the cape (where the medallion and the cord are laid) is the old one. TW_FORM=0 builds the
# shipped TWINSEN-ORIG byte for byte; every older flag (TW_FIGURE, TW_CAPE_*, TW_LOOK_*, TW_LEGS_OLD, TW_CUFF_OLD,
# TW_BALL_HAND) builds its own model without CHAR-FORM.
FORM = os.environ.get('TW_FORM', '1') != '0' and not FIGURE and not any(os.environ.get(k) for k in (
    'TW_CAPE_046', 'TW_CAPE_CUT', 'TW_LOOK_38', 'TW_LOOK_OLD', 'TW_LEGS_OLD', 'TW_CUFF_OLD', 'TW_BALL_HAND'))
# TUNIC-SLEEVE (P123, the user 24.11, on a photo of v155/v156: "it looks like a sleeve inside the tunic; it shouldn't be
# like that"). The tunic's side is his sleeve (LBA2's weights: it rides the forearm), but under its edge a second, narrower
# cone (`cuff*`, with CUFF-HEM's rolled rim) stuck out 4 cm and flared past it, lit lighter than the tunic: a sleeve
# inside the sleeve. Now there is one garment: the cuff and its rolled hem are gone, and the tunic's own edge comes down
# over each arm by the cuff's length (SLEEVE_DROP; the front, the back and the belt line untouched), so its side ends
# where the cuff ended and the hand comes straight out of it, as much of the hand showing as before. Its dark inner lip
# (the cloth's thickness, the tunic's hem all round) follows the edge; a dark lid just inside the sleeve, round the
# wrist, closes the view up the sleeve (it was the cuff's). TW_SLEEVE_HEM=1 adds a rolled hem of the tunic's blue round
# the sleeve's edge (the option); TW_SLEEVE_OLD=1 builds the sleeve inside the sleeve (v156).
TUNIC_SLEEVE = FORM and not os.environ.get('TW_SLEEVE_OLD')
SLEEVE_HEM = TUNIC_SLEEVE and os.environ.get('TW_SLEEVE_HEM', '0') == '1'
SLEEVE_DROP = float(os.environ.get('TW_SLEEVE_DROP', '0.020'))   # (H: the side's edge 0.408 → 0.388, the old cuff's lowest point; 4.2 cm in the game)
# NECK-TW: the cape's top. It was flat (0.765 → 0.772 H while narrowing from ±0.052 to ±0.03) and, being ring()s,
# notched at the back, so the neck stuck out of it like a cut pipe. Now the shoulders slope up into a soft rolled
# collar round the neck, as the original's cape rises onto its neck (measured: ±0.138 at 0.744, ±0.107 at 0.768,
# ±0.067 at 0.792, ±0.035 at 0.804 round a ±0.027 neck), the roll standing a little off it with a dark inside.
CAPE_TOP = [
    oring(0.754, 0.094, 0.093, -0.012, N, 0.85),
    oring(0.765, 0.064, 0.091, 0.002, N, 0.95),
    oring(0.7735, 0.0475, 0.094, 0.006, N, 1.0),   # the roll's outer face, standing out a little
    oring(0.7805, 0.042, 0.0915, 0.0105, N, 1.0),  # its rounded top
    oring(0.7785, 0.0365, 0.0875, 0.0145, N, 1.0),  # its inner edge (the dark inside goes down from here)
]
# the cloth has thickness: an inner lip turns up under the cape's edge (darker, in its own shadow)
lip = Part('capeLip', 'inner', w_cape, angle=70, reweight=w_cape_game if CAPE_046 else None)


def cape_folds(pts, amp):
    # (CHAR-FORM: soft folds hanging from the shoulders, deeper toward the hem: a ridge and a hollow in each quarter,
    # mirrored left and right, none on the front and back centre lines (the medallion, the cord) or over the arms)
    out = []
    for k, (x, y, z) in enumerate(pts):
        t = 2 * math.pi * k / len(pts)
        f = 1 + amp * math.sin(2 * t) ** 2 * math.cos(6 * t)
        out.append((x * f, y, z * f))
    return out


CAPE_FOLD = lambda y: 0.03 * smooth(0.64, 0.45, y) if FORM else 0.0
# (TUNIC-SLEEVE: the edge over each arm, the 75-105 degree columns round each side, lowered by SLEEVE_DROP, easing back
# to the old hem by 45 degrees; the front and back of the tunic keep their hem)
sleeve_g = lambda t: smooth(0.72, 0.96, abs(math.sin(t))) if TUNIC_SLEEVE else 0.0
hem_s = lambda t: hem(t) - SLEEVE_DROP * sleeve_g(t)
loft(lip, [cape_folds(r_, CAPE_FOLD(0.43)) for r_ in (ring(lambda t: hem_s(t) + 0.03, 0.19, 0.112, -0.064, N, 0.62), ring(hem_s, 0.209, 0.126, -0.075, N, 0.62))])
if CAPE_CUT:
    cut_sleeves(lip, N, 2)
PARTS.append(lip)
CAPE_BODY = [
    ring(hem, 0.212, 0.128, -0.077, N, 0.62),
    ring(0.54, 0.214, 0.132, -0.077, N, 0.62),
    ring(0.62, 0.197, 0.138, -0.066, N, 0.66),
    ring(0.70, 0.163, 0.118, -0.046, N, 0.72),
    ring(0.74, 0.122, 0.096, -0.028, N, 0.8),
]
if FORM:   # (CHAR-FORM: y, half-width, front, back, roundness; the front and back as the old cone's at each height)
    CAPE_BODY = [cape_folds(ring(hem_s, 0.212, 0.128, -0.077, N, 0.62), CAPE_FOLD(0.43))] + [cape_folds(ring(y_, hw_, zf_, zb_, N, p_), CAPE_FOLD(y_)) for y_, hw_, zf_, zb_, p_ in (
        (0.495, 0.2135, 0.130, -0.077, 0.62),
        (0.54, 0.214, 0.132, -0.077, 0.62),
        (0.58, 0.2095, 0.135, -0.0715, 0.64),
        (0.62, 0.2035, 0.138, -0.066, 0.66),
        (0.66, 0.1955, 0.128, -0.056, 0.68),
        (0.70, 0.1815, 0.118, -0.046, 0.70),   # the shoulder point
        (0.722, 0.1625, 0.107, -0.0375, 0.74),  # rounding over the top of the shoulder
        (0.74, 0.134, 0.096, -0.028, 0.8),     # the shoulder's top, nearly level into the collar
    )]
loft(cape, CAPE_BODY + CAPE_TOP)
if SLEEVE_HEM:
    # (TUNIC-SLEEVE, the option: a rolled hem of the tunic's own blue along the sleeve's edge, the 45-135 degree columns
    # round each side, 1 cm thick, fading to nothing where the edge meets the tunic's front and back hem; on the cape's
    # weights there, so it moves with the edge)
    HR = 0.0048
    edge = CAPE_BODY[0]
    for ks in (range(3, 10), range(15, 22)):
        pts = []
        for k in ks:
            a, b = Vector(edge[k % N]), Vector(edge[(k + 1) % N])
            pts.append(a)
            if k != ks[-1]:
                pts.append(a.lerp(b, 0.5))
        rings_ = []
        for i, p in enumerate(pts):
            u = i / (len(pts) - 1)
            r = HR * min(1.0, math.sin(math.pi * u) * 2.2)
            out_ = Vector((p.x, 0.0, p.z - 0.025)).normalized()
            tg = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
            c = p + out_ * (r * 0.35) + Vector((0, 1, 0)) * (r * 0.55)
            v1 = tg.cross(Vector((0, 1, 0))).normalized()
            v2 = tg.cross(v1).normalized()
            rings_.append(ell_ring(tuple(c), v1, v2, max(r, 1e-4), max(r, 1e-4), 6))
        shem = Part('sleeveHem' + side(edge[ks[0]][0]), 'tunic', w_cape, angle=80)
        loft_along(shem, rings_, cap0=False, cap1=False)
        PARTS.append(shem)
if CAPE_CUT:
    cut_sleeves(cape, N, CUT_RINGS)
PARTS.append(cape)
if CAPE_CUT:
    # HERO-ARMS: the tunic's body under the cape, from the belt's top to the armpits, on the torso: hidden at rest, it
    # is what shows through the cut when a sleeve swings or rises (instead of the cape's inside)
    tbody = Part('tunicBody', 'tunic', lambda p: {'torso': 1.0}, angle=60)
    loft(tbody, [
        ring(0.47, 0.098, 0.116, -0.066, 16, 0.75),
        ring(0.56, 0.122, 0.121, -0.062, 16, 0.75),
        ring(0.64, 0.126, 0.118, -0.052, 16, 0.75),
        ring(0.72, 0.104, 0.094, -0.030, 16, 0.8),
    ])
    PARTS.append(tbody)
# the neckline's inside: from the collar's inner edge down into the cape, dark (the opening seen from above)
neckIn = Part('neckIn', 'inner', lambda p: {'torso': 1.0}, angle=70)
loft(neckIn, [oring(0.7785, 0.0365, 0.0875, 0.0145, N, 1.0), oring(0.762, 0.034, 0.085, 0.016, N, 1.0)])
PARTS.append(neckIn)

belt = Part('belt', 'belt', lambda p: {'torso': 1.0}, angle=50)
loft(belt, [ring(0.405, 0.104, 0.121, -0.071, N, 0.75), ring(0.47, 0.1, 0.119, -0.069, N, 0.75)])  # (inside the cape)
PARTS.append(belt)


def w_robe(p):
    # as in LBA2's model: below the belt each half of the robe is carried by its leg (the thigh down to the
    # knee, the shin below), so a stride opens the robe like the original's; the halves blend at the seam
    x, y, z = p
    k = smooth(0.43, 0.31, y)
    knee = 1 - smooth(0.17, 0.27, y)
    l = smooth(-0.04, 0.04, x)
    w = {'hips': 1 - k}
    for s, ws in (('L', l), ('R', 1 - l)):
        if ws > 0:
            if (1 - knee) > 0:
                w['hip' + s] = k * ws * (1 - knee)
            if knee > 0:
                w['knee' + s] = k * ws * knee
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


ROBE = [
    folds(ring(0.04, 0.158, 0.133, -0.13, N, 0.7), 0.035),
    folds(ring(0.12, 0.161, 0.139, -0.12, N, 0.7), 0.028),
    folds(ring(0.24, 0.15, 0.14, -0.106, N, 0.7), 0.018),
    folds(ring(0.35, 0.124, 0.136, -0.088, N, 0.72), 0.008),
    ring(0.415, 0.104, 0.125, -0.076, N, 0.75),
]
if FORM:   # (CHAR-FORM: y, half-width, front, back, roundness, fold depth; the hem ring is the old one, for the lip)
    ROBE = [folds(ring(y_, hw_, zf_, zb_, N, p_), f_) if f_ else ring(y_, hw_, zf_, zb_, N, p_) for y_, hw_, zf_, zb_, p_, f_ in (
        (0.04, 0.158, 0.133, -0.13, 0.7, 0.035),
        (0.08, 0.1605, 0.136, -0.125, 0.7, 0.031),
        (0.12, 0.161, 0.139, -0.12, 0.7, 0.028),
        (0.165, 0.158, 0.140, -0.115, 0.7, 0.024),
        (0.21, 0.153, 0.140, -0.110, 0.7, 0.020),
        (0.25, 0.147, 0.140, -0.105, 0.7, 0.017),
        (0.29, 0.141, 0.139, -0.100, 0.71, 0.013),
        (0.33, 0.135, 0.138, -0.095, 0.72, 0.009),   # over the hips and the seat
        (0.36, 0.129, 0.135, -0.091, 0.72, 0.006),
        (0.39, 0.118, 0.130, -0.083, 0.74, 0.0),
        (0.415, 0.104, 0.125, -0.076, 0.75, 0.0),     # into the belt
    )]
if FORM:
    # (the cloth falls in between the legs a little from the thigh down, in front and behind, so two legs read under it)
    def leg_valley(r_):
        out = []
        for x, y, z in r_:
            d = (0.012 if z > 0 else 0.007) * smooth(0.33, 0.17, y) * math.exp(-(x / 0.035) ** 2)
            out.append((x, y, z - d if z > 0 else z + d))
        return out
    ROBE = [leg_valley(r_) for r_ in ROBE]
loft(robe, ROBE)
PARTS.append(robe)
rlip = Part('robeLip', 'inner', w_robe, angle=70)
RLIP = [folds(ring(0.07, 0.146, 0.12, -0.118, N, 0.7), 0.035), folds(ring(0.04, 0.156, 0.131, -0.128, N, 0.7), 0.035)]
loft(rlip, [leg_valley(r_) for r_ in RLIP] if FORM else RLIP)
PARTS.append(rlip)
# the belt's knot at the front left, two ends hanging
knot = Part('knot', 'belt', lambda p: {'torso': 1.0}, angle=50)
sphere(knot, (0.045, 0.438, 0.128), 0.016, 8, 6)
tube(knot, (0.04, 0.43, 0.126), (0.03, 0.37, 0.14), 0.008, 0.007, 6, squash=0.5)
tube(knot, (0.052, 0.43, 0.126), (0.068, 0.375, 0.136), 0.008, 0.007, 6, squash=0.5)
PARTS.append(knot)

def fist(part, sx):
    """HERO-LOOK (hands in close-up, WORKLIST #8): a loose fist in the ball's place and size. FACES-HANDS' ball with a stick
    thumb and three knuckle lobes read as a mitten in the dialogue close-ups. Now the hand is built as a hand: the back
    of the hand, a rounded block from the wrist (inside the cuff) to the knuckles, flatter across than deep; the four
    fingers, each its own short bent tube from its knuckle round the bottom of the fist into the palm, side by side so a
    groove shows between each; and the thumb on the front, short and thick, laid across the index finger with its tip
    toward the palm. The palm faces his thigh at rest as before, the whole fist fills the ball's space (7 cm down from
    the wrist, 6 cm front to back), so the gameplay silhouette and whatever he holds stay where they were. Same bone,
    fewer triangles (220, was 246)."""
    w0 = Vector((sx * 0.19, 0.411, 0.02))
    d = Vector((sx * 0.08, -1.0, 0.0)).normalized()          # (down the hand, as the cuff hangs)
    pv = Vector((-sx, 0.0, 0.0)); pv = (pv - d * pv.dot(d)).normalized()   # (toward the palm: his thigh at rest)
    wv = Vector((0.0, 0.0, 1.0))                              # (the thumb's side: forward)
    NB = 10
    # the back of the hand: (distance down the hand, half-width front-back, half-thickness across, offset toward the back)
    BACK = [(0.000, 0.020, 0.0165, 0.000), (0.020, 0.0285, 0.0185, -0.002), (0.040, 0.0305, 0.0175, -0.004), (0.050, 0.029, 0.0125, -0.005)]
    rings = []
    for dist, hw, ht, off in BACK:
        c = w0 + d * dist + pv * off
        ring = []
        for i in range(NB):
            t = 2 * math.pi * i / NB
            cw, sn = math.cos(t), math.sin(t)
            ring.append(tuple(c + wv * (math.copysign(abs(cw) ** 0.6, cw) * hw) + pv * (math.copysign(abs(sn) ** 0.75, sn) * ht)))
        rings.append(ring)
    loft(part, rings, cap_bottom=False, cap_top=False)
    o = len(part.v) - len(rings) * NB
    cb = w0 + d * 0.053 + pv * -0.005
    part.add([tuple(cb)], [])
    ci = len(part.v) - 1
    last = o + (len(rings) - 1) * NB
    part.f += [[last + i, last + (i + 1) % NB, ci] for i in range(NB)]

    def bent(pts, radii, n=6, cap=True):
        rs = []
        for k, (cn, r) in enumerate(zip(pts, radii)):
            ax = (pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]).normalized()
            u = ax.cross(wv if abs(ax.dot(wv)) < 0.9 else pv).normalized()
            v = ax.cross(u).normalized()
            rs.append(ell_ring(tuple(cn), u, v, r, r, n))
        loft_along(part, rs, cap0=False, cap1=cap)
    # the fingers: index (front) to little finger (back), each from its knuckle on the back of the hand, round the bottom
    # of the fist, the tip tucked toward the palm; the little finger a touch shorter and higher
    for i, (z, r, lift) in enumerate(((0.0215, 0.0083, 0.0), (0.0068, 0.0086, 0.0), (-0.0078, 0.0082, 0.001), (-0.0215, 0.0072, 0.004))):
        k0 = w0 + d * (0.043 - lift) + pv * -0.011 + wv * z
        k1 = w0 + d * (0.062 - lift) + pv * -0.002 + wv * (z * 0.97)
        k2 = w0 + d * (0.056 - lift) + pv * 0.014 + wv * (z * 0.93)
        bent([k0, k1, k2], [r, r * 0.98, r * 0.86])
    # the thumb: out of the palm's front edge below the wrist, down and in across the index finger, the tip toward the palm
    t0 = w0 + d * 0.016 + wv * 0.022 + pv * 0.004
    t1 = t0 + (d * 0.75 + wv * 0.32 + pv * 0.45).normalized() * 0.021
    t2 = t1 + (d * 0.58 + wv * -0.08 + pv * 0.80).normalized() * 0.015
    bent([t0, t1, t2], [0.0108, 0.0098, 0.0080], 6)


# CUFF-HEM (LBA3 Blender pass, 7.11.2026): the cuff's sections along its own axis (the old cone's: from (±0.19, 0.455,
# 0.012) H, r 0.03, to (±0.192, 0.392, 0.014), r 0.043), (y, radius) in H. TW_CUFF_OLD=1 builds the bare cone and lid.
TW_CUFF_OLD = bool(os.environ.get('TW_CUFF_OLD'))
CUFF_WALL = [(0.455, 0.030), (0.398, 0.0418)]                                    # the cuff's side, as before
CUFF_HEM = [(0.398, 0.0418), (0.3925, 0.0446), (0.3879, 0.0420), (0.3888, 0.0372)]   # rolled out, under and back in
CUFF_IN = [(0.3888, 0.0372), (0.4005, 0.0352)]                                   # the inside, up to the dark lid


def cuff_ring(sx, y, r, n=12):
    a, b = Vector((sx * 0.19, 0.455, 0.012)), Vector((sx * 0.192, 0.392, 0.014))
    d = (b - a).normalized()
    u = d.cross(Vector((0, 0, 1))).normalized()
    w = d.cross(u).normalized()
    c = a + (b - a) * ((a.y - y) / (a.y - b.y))
    return [tuple(c + u * (math.cos(2 * math.pi * i / n) * r) + w * (math.sin(2 * math.pi * i / n) * r)) for i in range(n)]


SLEEVE_W = {}   # (HERO-LOOK: the sleeves' weights by vertex)
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
    if not os.environ.get('TW_LEGS_OLD'):
        # (CONNECT-1 for the hero, the user 11.11: "every limb should be connected": under the robe there were no legs, so a
        # stride or a run showed the slipper on its own inside the open robe. A bare shin from above the knee down into the
        # slipper, on the knee's bone, hidden by the robe when he stands)
        shin = Part('shin' + s, 'skin', lambda p, s=s: {'knee' + s: 1.0}, angle=60 if not FORM else 75)
        if FORM:
            # CHAR-FORM: the lower leg in sections (y, half-width, front, back from the bone's line; H): the knee's cap in
            # front, the calf behind, a slim ankle over the slipper, the foot of it inside the slipper
            SHIN = [(0.27, 0.0265, 0.025, -0.026), (0.245, 0.0265, 0.030, -0.025), (0.215, 0.025, 0.026, -0.028),
                    (0.18, 0.0245, 0.022, -0.033), (0.145, 0.022, 0.020, -0.031), (0.105, 0.019, 0.018, -0.024),
                    (0.07, 0.0165, 0.0175, -0.0185), (0.045, 0.018, 0.021, -0.020), (0.03, 0.019, 0.022, -0.019)]
            loft_along(shin, [[(cx + hw_ * math.sin(2 * math.pi * i / 12), y_,
                                0.002 + (zf_ if math.cos(2 * math.pi * i / 12) >= 0 else -zb_) * math.cos(2 * math.pi * i / 12))
                               for i in range(12)] for y_, hw_, zf_, zb_ in reversed(SHIN)])   # (bottom up: faces outward)
        else:
            tube(shin, (cx, 0.27, 0.0), (cx, 0.03, 0.004), 0.024, 0.019, 10, cap0=True)
        PARTS.append(shin)
    hb = (lambda b: (lambda p: {b: 1.0}))('hand' + s)
    # the sleeve's cuff: a flared opening under the cape's side, dark inside, the wrist coming out of it
    cuff = Part('cuff' + s, 'tunic', lambda p, s=s: {'el' + s: 1.0}, angle=50)
    if TW_CUFF_OLD:
        tube(cuff, (sx * 0.19, 0.455, 0.012), (sx * 0.192, 0.392, 0.014), 0.03, 0.043, 12, cap1=False)
    else:
        loft_along(cuff, [cuff_ring(sx, y, r) for y, r in CUFF_WALL], cap0=False, cap1=False)
    if not TUNIC_SLEEVE:   # (TUNIC-SLEEVE: no cuff and no rolled cuff hem: the tunic's side is the sleeve to its end)
        PARTS.append(cuff)
    if not TW_CUFF_OLD and not TUNIC_SLEEVE:
        # CUFF-HEM: the cuff ended in the cone's bare edge (no thickness: a knife edge from every side, a flat dark lid just
        # inside it). Now the cloth turns under in a rolled hem: out a little, round under and back in by the cloth's
        # thickness (1.5 cm), so the cuff ends in a lit, rounded edge over a dark opening. Softly shaded on its own (a fine
        # seam where it meets the cuff's side reads as the hem's stitch line); on the forearm's bone, as the cuff.
        chem = Part('cuffHem' + s, 'tunic', lambda p, s=s: {'el' + s: 1.0}, angle=80)
        loft_along(chem, [cuff_ring(sx, y, r) for y, r in CUFF_HEM], cap0=False, cap1=False)
        PARTS.append(chem)
    # HERO-LOOK (I-22): the sleeve, a wide tube from the shoulder joint to the cuff along the arm as the game shows it at
    # rest (GAME_SPREAD), inside the cape there (clear of its walls by 2–6 cm), on the upper arm and the forearm. Raised,
    # the arm comes out of the cape in it, the cape staying on the body. 8 sides, open at both ends (in the body / the cuff).
    SLEEVE = [   # centre (x out, y, z), radius, u (0 the shoulder, 1 the elbow, 2 the cuff)
        ((0.084, 0.703, 0.0), 0.030, 0.0),
        ((0.124, 0.632, 0.002), 0.041, 0.5),
        ((0.159, 0.558, 0.005), 0.040, 1.0),
        ((0.188, 0.508, 0.009), 0.035, 1.5),
        ((0.213, 0.468, 0.012), 0.029, 2.0),
    ]
    slv = Part('sleeve' + s, 'tunic', lambda p: SLEEVE_W[tuple(round(c, 6) for c in p)], angle=70, game=True)
    rings = []
    for k, (c, r, u) in enumerate(SLEEVE):
        a = Vector(SLEEVE[max(0, k - 1)][0]); b = Vector(SLEEVE[min(len(SLEEVE) - 1, k + 1)][0])
        d = (b - a); d.x *= sx; d.normalize()
        ax1 = Vector((0, 0, 1)).cross(d).normalized()   # (across the arm in the body's plane)
        ax2 = Vector((0, 0, 1))
        ring = ell_ring((sx * c[0], c[1], c[2]), ax1, ax2, r, r * 1.05, 8)
        w = {'sh' + s: 1.0} if u <= 0.5 else {'sh' + s: 1.5 - u, 'el' + s: u - 0.5} if u < 1.5 else {'el' + s: 1.0}
        for q in ring:
            SLEEVE_W[tuple(round(cc, 6) for cc in q)] = w
        rings.append(ring)
    loft_along(slv, rings, cap0=False, cap1=False)
    if CAPE_046:   # (HERO-ARMS: the cape's side is the sleeve again; this one was inside it)
        PARTS.append(slv)
    elif CAPE_CUT:
        # HERO-ARMS: the sleeve's underside, closing the cape's side into a wide sleeve below the armpit: a wall from the
        # cut's front edge to its back edge on each ring, bowed in a little; hidden inside the cape at rest, it makes
        # a raised or swung sleeve a tube instead of an open shell. Weighted as the sleeve's edges (cut_sleeves).
        k0, k1 = (SEAM_F, SEAM_B) if sx > 0 else (24 - SEAM_B, 24 - SEAM_F)
        wall = Part('sleeveIn' + s, 'tunic', w_cape, angle=70)
        WM = 3
        for j in range(CUT_RINGS + 1):
            a, b = (Vector(cape.v[cape.copies.get(j * N + k, j * N + k)]) for k in (k0, k1))
            row = []
            for m in range(WM + 1):
                u = m / WM
                q = a.lerp(b, u)
                q.x -= sx * 0.008 * math.sin(math.pi * u)
                row.append(tuple(q))
            wall.add(row, [])
        wall.f = [[j * (WM + 1) + m, j * (WM + 1) + m + 1, (j + 1) * (WM + 1) + m + 1, (j + 1) * (WM + 1) + m] for j in range(CUT_RINGS) for m in range(WM)]
        wall.cls = ['sleeve' if j < CUT_RINGS else 'shared' for j in range(CUT_RINGS + 1) for _ in range(WM + 1)]
        PARTS.append(wall)
    cin = Part('cuffIn' + s, 'inner', lambda p, s=s: {'el' + s: 1.0}, angle=70)
    if TUNIC_SLEEVE:
        # (TUNIC-SLEEVE: the sleeve's dark inside round the wrist, a flat oval lid 1.6 cm up inside the tunic's side, the
        # wrist running through it: narrower across than the cuff's lid, so it stays inside the side's cloth)
        cin.add([(sx * 0.19, 0.404, 0.016)] + ell_ring((sx * 0.19, 0.404, 0.016), (1, 0, 0), (0, 0, 1), 0.0175, 0.034, 12),
                [[0, 1 + i, 1 + (i + 1) % 12] for i in range(12)])
    elif TW_CUFF_OLD:
        cin.add(ell_ring((sx * 0.192, 0.394, 0.014), (1, 0, 0), (0, 0, 1), 0.04, 0.04, 12), [list(range(12))])
    else:   # (CUFF-HEM: the cloth's inside, dark, from the hem's inner edge up into the sleeve, closed there; the wrist runs
        #      through that lid as it ran through the old one)
        loft_along(cin, [cuff_ring(sx, y, r) for y, r in CUFF_IN], cap0=False, cap1=True)
    PARTS.append(cin)
    # the hand: LBA2's ball (the original's: r 0.036 H, centred 0.376 H, just under the cuff)
    hand = Part('hand' + s, 'skin', hb, angle=60 if os.environ.get('TW_BALL_HAND') else 82)
    if os.environ.get('TW_BALL_HAND'):   # (the ball with FACES-HANDS' thumb and knuckle lobes, for comparison)
        sphere(hand, (sx * 0.19, 0.378, 0.02), 0.036, 10, 7)
        hc = (sx * 0.19, 0.378, 0.02)
        tube(hand, (hc[0] - sx * 0.013, hc[1] + 0.012, hc[2] + 0.022), (hc[0] - sx * 0.021, hc[1] + 0.001, hc[2] + 0.050), 0.0098, 0.0068, 6)
        for dz_, dy_, rr_ in ((-0.020, -0.017, 0.0118), (-0.002, -0.021, 0.0128), (0.017, -0.019, 0.0108)):
            sphere(hand, (hc[0] - sx * 0.026, hc[1] + dy_, hc[2] + dz_), rr_, 6, 4)
    else:
        fist(hand, sx)
    PARTS.append(hand)

# NECK-TW: LBA2's long thin neck (±0.027 H), but a neck and not a pipe: round sections (the old ring()s creased the
# nape and read as a square stick), a little wider at the base where it leaves the collar, slimmest just above it, and
# a nape that widens and leans back into the skull (from behind the head no longer sits on the neck like a ball on a
# stick, and no background shows between them). The base is closed inside the cape and the top runs inside the head.
# The head's turn spreads over the neck's length (0.785 → 0.855 H, was 0.79 → 0.83), so a look aside twists it
# instead of shearing it at the jaw.
NECK = [   # y, half-width, front z, back z (fractions of H)
    (0.735, 0.044, 0.086, 0.004),
    (0.762, 0.036, 0.083, 0.013),
    (0.786, 0.0315, 0.081, 0.019),
    (0.812, 0.031, 0.081, 0.019),
    (0.832, 0.036, 0.079, 0.010),
    (0.850, 0.046, 0.072, 0.002),
    (0.868, 0.052, 0.062, -0.010),
]
neck = Part('neck', 'skin', lambda p: {'neck': 1 - smooth(0.785, 0.855, p[1]), 'head': smooth(0.785, 0.855, p[1])}, angle=70)
loft(neck, [oring(y, hw, zf, zb, 16, 0.9) for y, hw, zf, zb in NECK], cap_bottom=True)
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


head = Part('head', 'skin', lambda p: {'head': 1.0}, angle=(110 if not os.environ.get('TW_LOOK_OLD') else 85), big=True)  # (smooth shading across the cheek corners; the silhouette keeps its LBA2 wedge)
# smoother than the original: 11 points per half section, and a blended section between each measured pair
# TWINSEN-LOOK-38 (after ZOE-LOOK-38, the user's chosen direction for the cast: "a softer, more expressive animated look";
# TW_LOOK_OLD=1 builds the head and eyes as before): each half section's corners cut twice (Chaikin, the ends kept on the
# centre line), 15 points a half (28 round the head, was 20) and two blended sections between each measured pair: the
# LBA2 wedge keeps its proportions but loses its facets
TW_LOOK = not os.environ.get('TW_LOOK_OLD')
# TWINSEN-ORIG (the user 12.11, after TWINSEN-LOOK-38 and many tries; the user's pick, marked on the sheet: "this was the
# best, but without the band"): the head smoothed as TWINSEN-LOOK-38 did (Chaikin, 15 points a half) on LBA2's measured
# sections, not stretched and not narrowed; above the brow one smooth arc to a round apex (no bump, no flat lid); the hair
# LBA2's own three balls, flat shaded; no band. TW_LOOK_38=1 builds the look TWINSEN-LOOK-38 shipped
LOOK_38 = bool(os.environ.get('TW_LOOK_38'))
ORIG = TW_LOOK and not LOOK_38

def chaikin(half, it=2):
    for _ in range(it):
        out = [half[0]]
        for (xa, za), (xb, zb) in zip(half, half[1:]):
            out += [(0.75 * xa + 0.25 * xb, 0.75 * za + 0.25 * zb), (0.25 * xa + 0.75 * xb, 0.25 * za + 0.75 * zb)]
        out.append(half[-1])
        half = out
    return half


K = 14 if TW_LOOK else 11
FINE = []
# (TWINSEN-LOOK-38, second pass, after the user's two figurine pictures (12.11): the head toward an egg: corners cut three
# times; the crown 25 % taller above the brow line (tw_y), and the jaw drawn in toward the chin (tw_kx: 0.88 of the width at
# the chin, the full width from the cheekbones up), so the face narrows to a rounded chin instead of the LBA2 wedge's flat
# underside)
def tw_y(y):
    return y if (not LOOK_38 or y <= 0.9) else 0.9 + (y - 0.9) * 1.25


def tw_kx(y):
    return 0.88 + 0.12 * smooth(0.822, 0.88, y) if LOOK_38 else 1.0


# (the skull's arc: above SK_Y0 the 0.908 section scaled about its middle along a quarter ellipse to the apex at SK_C + SK_A)
SK_Y0, SK_C, SK_A = 0.908, 0.89, 0.082
# (TWINSEN-FIGURE: the figure's head is a longer egg: the skull's arc above the brow taller, FIG_SKA of H instead of 0.082;
# the face below the brow, the width and the jaw unchanged)
FIG_SKA = float(os.environ.get('TW_FIG_SKA', '0.092'))
_SK_STEPS = (0.922, 0.935, 0.946, 0.955, 0.962, 0.967)
if FIGURE:
    _SK_STEPS = tuple(SK_Y0 + (y_ - SK_Y0) * (SK_C + FIG_SKA - SK_Y0) / (SK_C + SK_A - SK_Y0) for y_ in _SK_STEPS)
    SK_A = FIG_SKA
if ORIG:
    _h0 = dict(HEAD)[SK_Y0]
    _zc0 = (max(z for _, z in _h0) + min(z for _, z in _h0)) / 2
    _k0 = math.sqrt(1 - ((SK_Y0 - SK_C) / SK_A) ** 2)
    _ks = lambda y_: math.sqrt(max(0.0, 1 - ((y_ - SK_C) / SK_A) ** 2)) / _k0
    HEAD_SRC = [r_ for r_ in HEAD if r_[0] <= SK_Y0] + [(y_, [(x * _ks(y_), _zc0 + (z - _zc0) * _ks(y_)) for x, z in _h0]) for y_ in _SK_STEPS]
else:
    HEAD_SRC = HEAD


HEADS = [(tw_y(y), [(x * tw_kx(y), z) for x, z in chaikin(h, 3)]) for y, h in HEAD_SRC] if TW_LOOK else HEAD
for (y0, h0), (y1, h1) in zip(HEADS, HEADS[1:]):
    a, b = resample(h0, 25), resample(h1, 25)
    FINE.append((y0, h0))
    for t in (0.5,):
        FINE.append((y0 + (y1 - y0) * t, [(pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t) for pa, pb in zip(a, b)]))
FINE.append(HEADS[-1])
CROWN_TOP = (0, tw_y(0.956), 0.035)
if ORIG:   # (the arc closes on its apex)
    CROWN_TOP = (0, SK_C + SK_A, _zc0)
elif TW_LOOK:
    # (TWINSEN-LOOK-38: the crown domed instead of a flat lid: four more rings above the top section, drawn in toward its
    # middle on a quarter circle, 2.2 % H higher at the top, so the egg closes round under the knot)
    yt, ht = FINE[-1]
    zc_ = sum(z for _, z in ht) / len(ht)
    for t in (0.35, 0.6, 0.8, 0.93):
        k = math.sqrt(max(0.0, 1 - t * t))
        FINE.append((yt + 0.022 * t, [(x * k, zc_ + (z - zc_) * k) for x, z in ht]))
    CROWN_TOP = (0, yt + 0.0225, zc_)
rings = [head_ring(y, hh) for y, hh in FINE]
loft(head, rings)
# chin and crown: close the ends on a point
n = len(rings[0])
o = len(head.v)
head.add([(0, 0.799, 0.095)], [])
head.f += [[(i + 1) % n, i, o] for i in range(n)]
top0 = (len(rings) - 1) * n
head.add([CROWN_TOP], [])
head.f += [[top0 + i, top0 + (i + 1) % n, o + 1] for i in range(n)]
PARTS.append(head)


def head_front(x, y):
    # z of the face surface at (x, y), for placing the eyes on it
    for (y0, h0), (y1, h1) in zip(HEADS, HEADS[1:]):
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


# ---- the hair: as LBA2 draws it (VP-1b)
# The original (BODY.HQR body 1) has no hair polygons. Its hair is three spheres, which the game draws as flat discs in
# one dark brown, unlit (palette ramp 1, shades 1–3). Measured in the frame of the head sections above (rest pose,
# fractions of H; the skull's top is at 0.955, the back of the skull at z −0.011 (0.94) and −0.026 (0.90)):
#   crown   centre y 0.951, z −0.052, r 0.049, on the head bone: it sits on the back of the skull's top and rises 0.045
#           above the crown, so from the front it is a dark dome over the crown and from behind the top of the strip
#   tuft 1  centre y 0.925, z −0.103, r 0.0355, on the first tail bone (which turns about the crown ball's centre)
#   tuft 2  centre y 0.890, z −0.118, r 0.0247, on the second
# In the game they read as dark hair on the crown, a strip down the back of the head (to 0.865 H) and a tuft that rises
# from the crown and arches back and down; the forehead, temples, the sides and the nape stay skin.
# Built as one smooth mass: rings swept from the front of the crown ball through the three centres to a round tip,
# each as wide as the balls are there (the shallow waists between them mostly filled), so it reads as one tuft of hair
# rather than a cluster of balls. It is one connected surface whose weights pass from the head to tail0..2 along it,
# so the follow-through in rig.js bends it and never opens a gap. Flat colour like the original's discs: every normal
# points down, so LbaMaterial's ramp gives one constant dark shade from any side (the original's colours on screen:
# palette 17 #2b1b07 on the crown, 18–19 #331f0b–#3b270f on the tuft).
HAIR = ((0.951, -0.052, 0.0494), (0.925, -0.103, 0.0355), (0.890, -0.118, 0.0247))   # centre y, z, radius (H)
# TWINSEN-LOOK-38 (the user 12.11, a fan's figurine as the direction the game's community wants: a topknot): the same
# three masses moved up into a knot standing on the top of the crown, tied at its root with a band, its tip arching up and
# back (TW_LOOK_OLD: LBA2's tuft down the back of the head). The weights and the tail bones' follow-through are as before.
if not os.environ.get('TW_LOOK_OLD'):
    # (third pass, the user 12.11 on the second: "the band must sit tight on the scalp", and the game's cover art as the
    # direction: the knot's root half sunk in the crown, so the band sits on the skin; the tail rises and falls back in a
    # long arc, thicker, its tip low behind the head)
    _ct = CROWN_TOP
    HAIR = ((_ct[1] - 0.006, _ct[2] - 0.030, 0.0330), (_ct[1] + 0.062, _ct[2] - 0.060, 0.0350), (_ct[1] + 0.070, _ct[2] - 0.150, 0.0260))
    if not LOOK_38:
        # (TWINSEN-ORIG: LBA2's own three balls at their measured places and sizes)
        HAIR = ((0.951, -0.052, 0.0494), (0.925, -0.103, 0.0355), (0.890, -0.118, 0.0247))
HAIR_FILL = 0.7          # how much of the waist between two balls is filled (0: the balls' union, 1: their hull)
HAIR_M = 12              # points per ring
HAIR_DOWN = (0.0, -1.0, 0.0)


def hair_sweep():
    # stations (centre (y, z), tangent (y, z), radius, u) from the front pole of the crown ball to the tip;
    # u is 0 at the crown ball's centre, 1 at tuft 1, 2 at tuft 2
    C = [(y, z) for y, z, _ in HAIR]
    R = [r for _, _, r in HAIR]
    sub = lambda a, b: (a[0] - b[0], a[1] - b[1])
    add = lambda a, b, k=1.0: (a[0] + b[0] * k, a[1] + b[1] * k)
    unit = lambda a: (a[0] / math.hypot(*a), a[1] / math.hypot(*a))
    d0 = unit(sub(C[1], C[0]))
    st = []
    # the front of the crown ball: a hemisphere about the sweep's first direction
    for k in range(1, 5):
        ph = math.pi / 2 * k / 4
        st.append((add(C[0], d0, -R[0] * math.cos(ph)), d0, R[0] * math.sin(ph), -math.cos(ph)))
    # through the centres: a Catmull-Rom curve, the radius the balls' own section there, waists filled
    P = [add(C[0], sub(C[0], C[1]))] + C + [add(C[2], sub(C[2], C[1]))]
    def cr(i, t):
        p0, p1, p2, p3 = P[i], P[i + 1], P[i + 2], P[i + 3]
        f = lambda a, b, c, d: 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t ** 3)
        g = lambda a, b, c, d: 0.5 * ((-a + c) + 2 * (2 * a - 5 * b + 4 * c - d) * t + 3 * (-a + 3 * b - 3 * c + d) * t * t)
        return (f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])), unit((g(p0[0], p1[0], p2[0], p3[0]), g(p0[1], p1[1], p2[1], p3[1])))
    mid = [(C[0], R[0], 0.0)]
    for seg in range(2):
        for k in range(1, 6):
            t = k / 5
            c = cr(seg, t)[0]
            union = max(math.sqrt(max(0.0, r * r - math.dist(c, ci) ** 2)) for ci, r in zip(C, R))
            hull = R[seg] + (R[seg + 1] - R[seg]) * t
            mid.append((c, max(union, union + (hull - union) * HAIR_FILL), seg + t))
    # the rings across the sweep turn gradually (the curve bends sharply at tuft 1, tighter than the tuft is thick:
    # rings square to it there would cross on the inside of the bend)
    tg = [d0] + [unit(sub(mid[min(j + 1, len(mid) - 1)][0], mid[j - 1][0])) for j in range(1, len(mid))]
    for _ in range(3):
        tg = [tg[0]] + [unit(add(add(tg[j - 1], tg[j], 2.0), tg[min(j + 1, len(tg) - 1)])) for j in range(1, len(tg))]
    st += [(c, d, r, u) for (c, r, u), d in zip(mid[1:], tg[1:])]
    # the round tip: a hemisphere on tuft 2
    c, d = C[2], tg[-1]
    for k in range(1, 4):
        ph = math.pi / 2 * k / 4
        st.append((add(c, d, R[2] * math.sin(ph)), d, R[2] * math.cos(ph), 2 + 0.6 * math.sin(ph)))
    return st, add(C[0], d0, -R[0]), add(c, d, R[2])


def w_hair(u):
    # the head carries the crown ball; the tuft passes to tail0, tail1, tail2 toward the tip
    a, b, c = smooth(0.2, 0.8, u), smooth(0.8, 1.4, u), smooth(1.4, 2.0, u)
    return {k: v for k, v in (('head', 1 - a), ('tail0', a - b), ('tail1', b - c), ('tail2', c)) if v > 1e-4}


HAIR_U = {}
hair = Part('hair', 'hair', lambda p: w_hair(HAIR_U[tuple(round(c, 6) for c in p)]), big=True,
            normal=HAIR_DOWN, color=lambda p: 'hair' if HAIR_U[tuple(round(c, 6) for c in p)] < 0.55 else 'hairTuft')
stations, front, tip = hair_sweep()
if TW_LOOK and LOOK_38:
    # (TWINSEN-LOOK-38, fifth pass, the user 12.11: "the band is in the middle of the hair, it must be at the hair's
    # base": the band at the skin, and the hair below it drawn in to 85 % of the band's own section, so no hair shows
    # between the band and the scalp; the knot starts at the band)
    BAND_ST = min((st_ for st_ in stations if st_[3] >= -0.3), key=lambda st_: abs(st_[0][0] - (CROWN_TOP[1] - 0.002)))
    stations = [(c_, d_, min(r_, BAND_ST[2] * 0.85) if u_ < BAND_ST[3] else r_, u_) for c_, d_, r_, u_ in stations]
if ORIG:   # (each ball whole: the crown ball on the head, the tuft's two on the tail bones)
    for (y_, z_, r_), u_ in zip(HAIR, (0.0, 1.0, 2.0)):
        st0 = len(hair.v)
        sphere(hair, (0.0, y_, z_), r_, 14, 9)
        for p in hair.v[st0:]:
            HAIR_U[tuple(round(c, 6) for c in p)] = u_
else:
    hv, hf, us = [], [], []
    for (cy, cz), (ty, tz), r, u in stations:
        # ring in the plane across the sweep: x across, n = the sweep's normal in the mid-plane
        ny, nz = -tz, ty
        for i in range(HAIR_M):
            a = 2 * math.pi * i / HAIR_M
            hv.append((r * math.sin(a), cy + ny * r * math.cos(a), cz + nz * r * math.cos(a)))
            us.append(u)
    n_r = len(stations)
    for j in range(n_r - 1):
        for i in range(HAIR_M):
            a, b = j * HAIR_M + i, j * HAIR_M + (i + 1) % HAIR_M
            hf.append([a, b, b + HAIR_M, a + HAIR_M])
    hv.append((0.0, front[0], front[1])); us.append(stations[0][3] - 0.0001)
    hv.append((0.0, tip[0], tip[1])); us.append(2.6)
    f0, f1 = len(hv) - 2, len(hv) - 1
    hf += [[f0, (i + 1) % HAIR_M, i] for i in range(HAIR_M)]
    o = (n_r - 1) * HAIR_M
    hf += [[f1, o + i, o + (i + 1) % HAIR_M] for i in range(HAIR_M)]
    start = len(hair.v)
    hair.add(hv, hf)
    for p, u in zip(hair.v[start:], us):
        HAIR_U[tuple(round(c, 6) for c in p)] = u
PARTS.append(hair)
if TW_LOOK and LOOK_38:
    # (TWINSEN-LOOK-38: the knot's band, a short thick ring round the hair where the knot leaves the crown, weighted as the
    # hair is there, so the follow-through carries it; TWINSEN-ORIG has none, as LBA2)
    # (the band where the knot leaves the scalp: the station nearest a point 9 mm above the crown's skin)
    bc = BAND_ST   # (fourth pass: at the skin itself, half sunk)
    ub = bc[3]
    (cy, cz), (ty, tz), r, _u = bc
    band = Part('hairBand', 'band', lambda p, ub=ub: w_hair(ub), angle=60)   # (gold, as on the game's cover: the medallion cord's colour)
    tube(band, (0.0, cy - ty * 0.018, cz - tz * 0.018), (0.0, cy + ty * 0.008, cz + tz * 0.008), r * 1.10, r * 1.06, 14, cap0=True)   # (reaching down into the scalp at the back)
    PARTS.append(band)


# ------------------------------------------------------------------ TWINSEN-FIGURE: the body, sleeves and hair of the figure
# (built after the parts above, which it replaces by name; the face's eyes, nose, mouth and the medallion follow below with
# FIGURE's own numbers). All the new parts are drawn where the game shows them at rest (the arms at GAME_SPREAD) and stored
# un-spread by their own weights, as the HERO-LOOK sleeves were (Part.game).
FIG_CAP = os.environ.get('TW_FIG_CAP', '1') != '0'   # (the strip of short hair down the back of the skull)
FIG_SLIT = os.environ.get('TW_FIG_SLIT', '1') != '0'  # (the robe split at the front and back from the hem to the shin)
if FIGURE:
    DROP = {'capeLip', 'cape', 'neckIn', 'belt', 'robe', 'robeLip', 'knot', 'hair', 'shoeL', 'shoeR', 'soleL', 'soleR',
            'cuffL', 'cuffR', 'cuffHemL', 'cuffHemR', 'cuffInL', 'cuffInR'}
    PARTS[:] = [p_ for p_ in PARTS if p_.name not in DROP]

    def w_tunic(p):
        # the tunic's body on the torso; round each armhole the cloth follows the upper arm a little (a third at most,
        # from the armpit up), so a swung or raised arm draws the shoulder with it instead of leaving the sleeve's root bare
        x, y, z = p
        a = 0.34 * smooth(0.070, 0.112, abs(x)) * smooth(0.60, 0.68, y) * (1 - smooth(0.745, 0.765, y))
        return {'torso': 1 - a, 'sh' + side(x): a} if a > 1e-4 else {'torso': 1.0}

    # the tunic: a wide blouse from the hem (just over the sash) to the shoulders, which slope into a high round collar;
    # (y, half-width, front, back, roundness) — the collar's rings are oring()s round the neck's own centre
    TUNIC = [
        (0.452, 0.131, 0.137, -0.101, 0.64),
        (0.500, 0.122, 0.130, -0.095, 0.66),
        (0.560, 0.112, 0.126, -0.089, 0.68),
        (0.620, 0.113, 0.128, -0.083, 0.68),
        (0.668, 0.113, 0.123, -0.073, 0.70),
        (0.704, 0.108, 0.113, -0.059, 0.74),
        (0.734, 0.097, 0.101, -0.038, 0.80),
    ]
    COLLAR = [
        oring(0.752, 0.072, 0.095, -0.014, N, 0.86),
        oring(0.763, 0.052, 0.093, 0.003, N, 0.95),
        oring(0.778, 0.0470, 0.0935, 0.0060, N, 1.0),   # the collar's outer face, standing
        oring(0.7925, 0.0450, 0.0920, 0.0085, N, 1.0),
        oring(0.7975, 0.0412, 0.0890, 0.0118, N, 1.0),  # its rolled top
        oring(0.7935, 0.0372, 0.0858, 0.0148, N, 1.0),  # its inner edge
    ]
    tunic = Part('tunic', 'tunic', w_tunic, angle=58, game=True)
    loft(tunic, [ring_fn(y, hw, zf, zb, N, pw) for y, hw, zf, zb, pw in TUNIC] + COLLAR)
    PARTS.append(tunic)
    tlip = Part('tunicLip', 'inner', w_tunic, angle=70, game=True)   # (the hem's thickness: the cloth turned up inside)
    loft(tlip, [ring_fn(0.478, 0.118, 0.124, -0.090, N, 0.66), ring_fn(0.452, 0.129, 0.135, -0.099, N, 0.64)])
    PARTS.append(tlip)
    cin_ = Part('collarIn', 'inner', lambda p: {'torso': 1.0}, angle=70)   # (the collar's dark inside, down into the body)
    loft(cin_, [oring(0.7935, 0.0372, 0.0858, 0.0148, N, 1.0), oring(0.770, 0.0345, 0.0840, 0.0165, N, 1.0)])
    PARTS.append(cin_)

    # the sash: a broad brown band at the waist, just under the tunic's hem, a little proud of the robe
    sash = Part('sash', 'belt', lambda p: {'torso': 1.0}, angle=60)
    loft(sash, [ring_fn(0.414, 0.1125, 0.1295, -0.0855, N, 0.72), ring_fn(0.436, 0.1170, 0.1335, -0.0895, N, 0.72),
                ring_fn(0.462, 0.1150, 0.1315, -0.0875, N, 0.72)])
    PARTS.append(sash)

    # the robe: long and flared to the ankles, its two halves on the legs as before (w_robe); split at the front and the
    # back from the hem to the shin (FIG_SLIT), so a stride parts it over the leading leg instead of stretching a sheet
    ROBE = [
        (0.042, 0.181, 0.150, -0.150, 0.035),
        (0.125, 0.168, 0.148, -0.137, 0.028),
        (0.240, 0.148, 0.145, -0.118, 0.016),
        (0.340, 0.127, 0.138, -0.099, 0.007),
        (0.432, 0.110, 0.127, -0.083, 0.0),
    ]
    SLIT_RINGS = 2   # (the hem's and the shin's rings are split; the knee's ring and above are whole)

    def slit(part, n, rings):
        # the columns at the front (0) and back (n/2) centre, in the lowest `rings` rings: the right half's faces get
        # copies of those vertices, and each side's copy is carried by its own leg alone (Part.vside)
        copies = {}
        for f in part.f:
            col = f[0] % n
            if not (n // 2 <= col < n):
                continue
            for k, i in enumerate(f):
                if i < rings * n and i % n in (0, n // 2):
                    if i not in copies:
                        copies[i] = len(part.v)
                        part.v.append(part.v[i])
                    f[k] = copies[i]
        for i, c in copies.items():
            part.vside[i], part.vside[c] = 1, -1

    robe2 = Part('robe', 'tunic', w_robe, angle=55)
    loft(robe2, [folds(ring_fn(y, hw, zf, zb, N, 0.7), fa) if fa else ring_fn(y, hw, zf, zb, N, 0.75) for y, hw, zf, zb, fa in ROBE])
    if FIG_SLIT:
        slit(robe2, N, SLIT_RINGS)
    PARTS.append(robe2)
    rlip2 = Part('robeLip', 'inner', w_robe, angle=70)
    loft(rlip2, [folds(ring_fn(0.074, 0.170, 0.137, -0.140, N, 0.7), 0.033), folds(ring_fn(0.042, 0.179, 0.148, -0.148, N, 0.7), 0.035)])
    if FIG_SLIT:
        slit(rlip2, N, 2)
    PARTS.append(rlip2)

    # the bell sleeves: from the shoulder (its root inside the tunic) along the arm as the game holds it at rest, widening
    # from the elbow to a broad open bell at the wrist; the hand comes out of it. Rings: centre (x out, y, z), radius, u
    # (0 the shoulder, 1 the elbow, 2 the bell's mouth: the weights pass from the upper arm to the forearm over the elbow)
    BELL = [
        ((0.072, 0.712, 0.000), 0.029, 0.00),
        ((0.098, 0.676, 0.002), 0.041, 0.25),
        ((0.126, 0.626, 0.004), 0.046, 0.60),
        ((0.157, 0.562, 0.006), 0.048, 1.00),
        ((0.181, 0.510, 0.009), 0.055, 1.40),
        ((0.199, 0.468, 0.012), 0.065, 1.75),
        ((0.207, 0.447, 0.013), 0.072, 2.00),
    ]
    BELL_M = 14

    def bell_w(u, s):
        return {'sh' + s: 1.0} if u <= 0.55 else {'sh' + s: (1.45 - u) / 0.9, 'el' + s: (u - 0.55) / 0.9} if u < 1.45 else {'el' + s: 1.0}

    for sx in (1, -1):
        s = side(sx)
        BW = {}
        key = lambda p: tuple(round(c, 6) for c in p)
        cs = [Vector((sx * c[0], c[1], c[2])) for c, _, _ in BELL]

        def frame(k):
            a, b = cs[max(0, k - 1)], cs[min(len(cs) - 1, k + 1)]
            d = (b - a).normalized()
            return d, Vector((0, 0, 1)).cross(d).normalized(), Vector((0, 0, 1))

        def bring(c, d, ax1, ax2, r, n=BELL_M):
            return ell_ring(tuple(c), ax1, ax2, r, r, n)

        slv = Part('sleeve' + s, 'tunic', lambda p, BW=BW: BW[tuple(round(c, 6) for c in p)], angle=62, game=True)
        rings_ = []
        for k, (c, r, u) in enumerate(BELL):
            d, a1, a2 = frame(k)
            rg = bring(cs[k], d, a1, a2, r)
            for q in rg:
                BW[key(q)] = bell_w(u, s)
            rings_.append(rg)
        loft_along(slv, rings_, cap0=False, cap1=False)
        PARTS.append(slv)
        # the bell's mouth: the cloth rolled under (out a little, round and back in by its thickness), then the dark
        # inside up into the sleeve, closed there (the wrist runs through that lid)
        d, a1, a2 = frame(len(BELL) - 1)
        c0, r0 = cs[-1], BELL[-1][1]
        hemr = Part('bellHem' + s, 'tunic', lambda p, BW=BW: BW[tuple(round(c, 6) for c in p)], angle=80, game=True)
        hr = [bring(c0 + d * t, d, a1, a2, r0 * k) for t, k in ((0.0, 1.0), (0.0045, 1.045), (0.0075, 1.02), (0.0060, 0.955))]
        for rg in hr:
            for q in rg:
                BW[key(q)] = {'el' + s: 1.0}
        loft_along(hemr, hr, cap0=False, cap1=False)
        PARTS.append(hemr)
        bin_ = Part('bellIn' + s, 'inner', lambda p, s=s: {'el' + s: 1.0}, angle=70, game=True)
        loft_along(bin_, [bring(c0 + d * 0.006, d, a1, a2, r0 * 0.955), bring(c0 - d * 0.016, d, a1, a2, r0 * 0.86),
                          bring(c0 - d * 0.040, d, a1, a2, r0 * 0.62)], cap0=False, cap1=True)
        PARTS.append(bin_)
        # the wrist, from inside the sleeve to the hand (the forearm's bone; the hand's own turn starts at the fist)
        wr = Part('wrist' + s, 'skin', lambda p, s=s: {'el' + s: 1.0}, angle=70, game=True)
        tube(wr, tuple(c0 - d * 0.045), (sx * 0.2165, 0.425, 0.0145), 0.0175, 0.0165, 10, cap0=True, cap1=False)
        PARTS.append(wr)

        # the shoes: dark brown and rounded, a low closed shoe with a thick sole and a round toe (no lifted point)
        fb = (lambda b: (lambda p: {b: 1.0}))('foot' + s)
        cx = sx * 0.0775
        secs = [(-0.052, 0.024, 0.031, 0.0), (-0.025, 0.029, 0.037, 0.0), (0.020, 0.030, 0.036, 0.0), (0.060, 0.028, 0.030, 0.0),
                (0.088, 0.023, 0.023, 0.001), (0.104, 0.013, 0.015, 0.003)]
        shoe = Part('shoe' + s, 'shoe', fb, angle=60)
        loft_along(shoe, [[(cx + hw * math.copysign(abs(math.cos(2 * math.pi * i / 12)) ** 0.8, math.cos(2 * math.pi * i / 12)),
                            0.006 + yo + (h * (0.5 + 0.5 * math.sin(2 * math.pi * i / 12))), z) for i in range(12)] for z, hw, h, yo in secs])
        PARTS.append(shoe)
        sole = Part('sole' + s, 'sole', fb, angle=30)
        box_wedge(sole, cx - 0.029, cx + 0.029, -0.055, 0.100, 0.0, 0.0075, 0.0075)
        PARTS.append(sole)

    # ---- the hair: the figure's topknot. Gathered through a ring on the crown, it rises as one broad lock, swells, and
    # its top turns back and falls to a point behind the head; shallow grooves and two browns run along it (strands), and
    # it is lit like the head (LBA2's three unlit balls read as a dark lump from the play camera behind him: P35).
    # Stations along its middle line (y, z, radius, u): u 0 on the head, 1 tail0, 2 tail2 (the follow-through bends it)
    KNOT = [
        (0.9705, 0.0405, 0.0190, 0.00),   # the root, sunk in the crown under the ring
        (0.9860, 0.0390, 0.0228, 0.00),   # in the ring
        (1.0000, 0.0370, 0.0315, 0.15),   # out of it, already wider than the ring: a lock, not a pipe
        (1.0180, 0.0330, 0.0390, 0.35),
        (1.0380, 0.0260, 0.0430, 0.55),   # the fullest
        (1.0570, 0.0150, 0.0430, 0.75),
        (1.0720, -0.0010, 0.0390, 0.95),  # the top, turning back
        (1.0800, -0.0220, 0.0320, 1.15),
        (1.0790, -0.0440, 0.0250, 1.35),
        (1.0700, -0.0620, 0.0190, 1.55),  # falling behind
        (1.0550, -0.0760, 0.0130, 1.75),
        (1.0360, -0.0840, 0.0078, 1.90),
    ]
    KNOT_TIP = (1.0160, -0.0870)
    # (drawn first as tall as the play scale allows, then brought down about its root to the figure's proportion: the knot
    # about 0.6 of the head's height above the crown (it was 0.71: 2.34 m to its top, now 2.30 m), a little slimmer)
    KNOT_KS, KNOT_KR = float(os.environ.get('TW_KNOT_KS', '0.84')), float(os.environ.get('TW_KNOT_KR', '0.96'))
    _y0, _z0 = KNOT[0][0], KNOT[0][1]
    KNOT = [(_y0 + (y - _y0) * KNOT_KS, _z0 + (z - _z0) * KNOT_KS, r * KNOT_KR, u) for y, z, r, u in KNOT]
    KNOT_TIP = (_y0 + (KNOT_TIP[0] - _y0) * KNOT_KS, _z0 + (KNOT_TIP[1] - _z0) * KNOT_KS)
    KNOT_M = 16
    HAIR_COL = {}
    hairp = Part('hair', 'hair', lambda p: w_hair(HAIR_U[tuple(round(c, 6) for c in p)]), angle=75,
                 color=lambda p: HAIR_COL[tuple(round(c, 6) for c in p)])
    P2 = [(y, z) for y, z, _, _ in KNOT] + [KNOT_TIP]
    tg = []
    for j in range(len(KNOT)):
        a, b = P2[max(0, j - 1)], P2[j + 1]
        L_ = math.hypot(b[0] - a[0], b[1] - a[1])
        tg.append(((b[0] - a[0]) / L_, (b[1] - a[1]) / L_))
    for _ in range(2):   # (the rings turn gradually round the bend at the top, so they never cross on its inside)
        tg = [tg[0]] + [(lambda v: (v[0] / math.hypot(*v), v[1] / math.hypot(*v)))((tg[j - 1][0] + 2 * tg[j][0] + tg[min(j + 1, len(tg) - 1)][0],
                                                                                   tg[j - 1][1] + 2 * tg[j][1] + tg[min(j + 1, len(tg) - 1)][1])) for j in range(1, len(tg))]
    hv, hf, hu, hc = [], [], [], []
    for j, ((cy, cz, r, u), (ty, tz)) in enumerate(zip(KNOT, tg)):
        ny, nz = -tz, ty   # (the ring's in-plane direction toward the knot's front/top side)
        for i in range(KNOT_M):
            a = 2 * math.pi * i / KNOT_M
            g = 1.0 + 0.07 * math.cos(8 * a) * smooth(0.0, 0.3, u)   # (eight shallow grooves, from the ring up)
            rr = r * g
            hv.append((rr * math.sin(a), cy + ny * rr * math.cos(a), cz + nz * rr * math.cos(a)))
            hu.append(u)
            hc.append('hairTuft' if (i % 2 == 0 and u > 0.05) else 'hair')
    nr = len(KNOT)
    for j in range(nr - 1):
        for i in range(KNOT_M):
            a, b = j * KNOT_M + i, j * KNOT_M + (i + 1) % KNOT_M
            hf.append([a, b, b + KNOT_M, a + KNOT_M])
    hv.append((0.0, KNOT[0][0] - 0.004, KNOT[0][1])); hu.append(0.0); hc.append('hair')
    hv.append((0.0, KNOT_TIP[0], KNOT_TIP[1])); hu.append(2.0); hc.append('hair')
    f0, f1 = len(hv) - 2, len(hv) - 1
    hf += [[f0, (i + 1) % KNOT_M, i] for i in range(KNOT_M)]
    o = (nr - 1) * KNOT_M
    hf += [[f1, o + i, o + (i + 1) % KNOT_M] for i in range(KNOT_M)]
    st0 = len(hairp.v)
    hairp.add(hv, hf)
    for p, u, c in zip(hairp.v[st0:], hu, hc):
        HAIR_U[tuple(round(cc, 6) for cc in p)] = u
        HAIR_COL[tuple(round(cc, 6) for cc in p)] = c

    # the ring that gathers it on the crown: an orange-brown band with rounded edges round the knot's root, square to it
    (ry, rz, _r, _u), (rty, rtz) = KNOT[1], tg[1]
    RING = [(0.0222, -0.0072), (0.0262, -0.0092), (0.0296, -0.0062), (0.0306, 0.0000), (0.0296, 0.0062), (0.0262, 0.0092), (0.0222, 0.0072)]
    RING_M = 16
    rv, rf = [], []
    for rr, h in RING:
        for i in range(RING_M):
            a = 2 * math.pi * i / RING_M
            rv.append((rr * math.sin(a), ry + rty * h + (-rtz) * rr * math.cos(a), rz + rtz * h + rty * rr * math.cos(a)))
    for j in range(len(RING) - 1):
        for i in range(RING_M):
            a, b = j * RING_M + i, j * RING_M + (i + 1) % RING_M
            rf.append([a, b, b + RING_M, a + RING_M])
    ringp = Part('hairRing', 'ring', lambda p: {'head': 1.0}, angle=70)
    ringp.add(rv, rf)
    PARTS.append(ringp)
    PARTS.append(hairp)

    # short hair down the back of the skull (the figure: a dark strip from the ring to the nape behind the ears, the
    # forehead, temples and the sides bare): the head's own sections, from the back centre round each side to a hairline
    # that comes forward toward the ring, 3.5 mm off the skin
    def head_half(y):
        for (y0, h0), (y1, h1) in zip(FINE, FINE[1:]):
            if y0 <= y <= y1:
                t = (y - y0) / (y1 - y0) if y1 > y0 else 0
                a, b = resample(h0, 25), resample(h1, 25)
                return [(pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t) for pa, pb in zip(a, b)]
        return resample(FINE[-1][1], 25)

    def along(half, s):
        seg = [math.dist(half[i], half[i + 1]) for i in range(len(half) - 1)]
        d, i = sum(seg) * s, 0
        while i < len(seg) - 1 and d > seg[i]:
            d -= seg[i]
            i += 1
        t = min(1.0, d / seg[i]) if seg[i] else 0
        return (half[i][0] + (half[i + 1][0] - half[i][0]) * t, half[i][1] + (half[i + 1][1] - half[i][1]) * t)

    if FIG_CAP:
        cap = Part('hairCap', 'hair', lambda p: {'head': 1.0}, angle=80, big=True)
        CAP = [(0.846, 0.80), (0.866, 0.76), (0.888, 0.72), (0.910, 0.68), (0.930, 0.63), (0.948, 0.58), (0.962, 0.52), (0.972, 0.46)]
        CM = 6
        crs = []
        for y, se in CAP:
            half = head_half(y)
            zc = (max(z for _, z in half) + min(z for _, z in half)) / 2
            pts = []
            for sgn in (1, -1):
                ks = range(CM + 1) if sgn > 0 else range(CM - 1, -1, -1)
                for k in ks:
                    x, z = along(half, se + (1 - se) * k / CM)
                    pts.append((sgn * x, z))
            # (the back centre is shared: the left side runs hairline → back, the right back → hairline)
            row = []
            for x, z in pts:
                l = math.hypot(x, z - zc) or 1.0
                row.append((x + x / l * 0.0035, y, z + (z - zc) / l * 0.0035))
            crs.append(row)
        nc = len(crs[0])
        cv = [p for r in crs for p in r]
        cf = [[j * nc + i + 1, j * nc + i, (j + 1) * nc + i, (j + 1) * nc + i + 1] for j in range(len(crs) - 1) for i in range(nc - 1)]
        cap.add(cv, cf)
        PARTS.append(cap)

    # small ears, low on the sides of the head behind the cheeks (the figure's: a rounded shell, a third of the eye's
    # height above and below the nose's root), each a flattened ball half sunk in the head
    ears = Part('ears', 'skin', lambda p: {'head': 1.0}, angle=80, big=True)
    for sx in (1, -1):
        e0 = len(ears.v)
        sphere(ears, (0.0, 0.0, 0.0), 1.0, 8, 5)
        for i in range(e0, len(ears.v)):
            x, y, z = ears.v[i]
            # (local: x out from the head, y up, z front-back), then tilted back 12 degrees and placed
            lx, ly, lz = x * 0.0068, y * 0.0165, z * 0.0105
            c_, s_ = math.cos(math.radians(12)), math.sin(math.radians(12))
            ly, lz = ly * c_ - lz * s_, ly * s_ + lz * c_
            ears.v[i] = (sx * (0.0705 + lx), 0.873 + ly, 0.030 + lz)
    PARTS.append(ears)

    cape = tunic   # (the medallion and its cord are laid on the tunic and its collar below)


# HERO-LOOK (I-23, the user 31.10: "the medallion is just a plain disc, not on a necklace as in the original"). LBA2's
# Twinsen (BODY.HQR body 1) does wear it on a necklace: besides its polygons the body has 15 line primitives, which the
# earlier measurements (polygons only) had missed. Measured there (units of 1238, converted to this frame's H by
# 1238/1296; numbers only):
#   the medallion  an octagon of 8 triangles on a group of its own (it hangs from the cord's group), 0.082 H wide and
#                  0.072 H tall, centred 0.632 H, its lower edge leaning out from the chest (z 0.122 at the top,
#                  0.138 at the bottom); its outline is drawn in gold lines (palette 107), the face a paler shade
#   the cord       gold lines (palette 107): from behind the neck at the collar (±0.026, 0.771 H, its back segment
#                  in the skin's colour, hidden) forward round the neck (±0.046, 0.744, 0.076), in over the chest
#                  (±0.031, 0.693, 0.107) to a point on the medallion's top (0, 0.668, 0.122): a V on the chest
# Ours follows those points on our own cape and neck (laid on their surfaces by ray casts, 3.5 mm proud): a flat gold
# cord all the way round the neck, on the neck bone above the collar (so a nod or a look aside carries it) and on the
# chest below, through a small gold bead on the medallion's top. The medallion is the measured octagon: a gold rim and
# a paler raised face, tilted with the chest. 40 + 24 + 80 triangles (the 16-sided disc was 80), one material as before.
from mathutils.bvhtree import BVHTree

CORD_W = 0.0034    # half-width of the cord (H): ~1.4 cm in the game, a pixel or two at the play camera like LBA2's line
CORD_LIFT = 0.0035
MED_C, MED_HW, MED_HH = (0.0, 0.632), 0.041, 0.036
MED_N = 8
if FIGURE:   # (the figure's: a large round gold medallion on a brown cord, its face ringed by an engraved line)
    CORD_W, MED_C, MED_HW, MED_HH, MED_N = 0.0040, (0.0, 0.628), 0.046, 0.046, 16


def bvh_of(*parts):
    vs, fs = [], []
    for pt in parts:
        o = len(vs)
        vs += [Vector(p) for p in pt.v]
        fs += [[i + o for i in f] for f in pt.f]
    return BVHTree.FromPolygons(vs, fs)


CHEST = bvh_of(cape)
NECKS = bvh_of(cape, neck)


def on_surface(tree, p, toward, lift):
    # cast from outside toward `toward` (a point inside) through p; the first surface met, `lift` off it, and its normal
    p, c = Vector(p), Vector(toward)
    d = (c - p).normalized()
    hit, n, _, _ = tree.ray_cast(p - d * 0.4, d, 1.0)
    if hit is None:
        return p, -d
    n = n.normalized()
    if n.dot(d) > 0:
        n = -n
    return hit + n * lift, n


# the medallion: on the chest, square to it
mc3, mn = on_surface(CHEST, (MED_C[0], MED_C[1], 0.2), (MED_C[0], MED_C[1], 0.0), 0.0)
mu = Vector((1, 0, 0)); mu = (mu - mn * mu.dot(mn)).normalized()
mv = mn.cross(mu).normalized()
if mv.y < 0:
    mv = -mv
oct8 = lambda k, d: [tuple(mc3 + mn * d + mu * (math.sin(2 * math.pi * i / MED_N) * MED_HW * k) + mv * (math.cos(2 * math.pi * i / MED_N) * MED_HH * k)) for i in range(MED_N)]
med = Part('medal', 'medal', lambda p: {'torso': 1.0}, angle=40 if not FIGURE else 50)
M_ = MED_N
v = oct8(1.0, 0.001) + oct8(1.0, 0.0075) + oct8(0.74 if not FIGURE else 0.80, 0.0085)
f = [[i, (i + 1) % M_, M_ + (i + 1) % M_, M_ + i] for i in range(M_)] + [[M_ + i, M_ + (i + 1) % M_, 2 * M_ + (i + 1) % M_, 2 * M_ + i] for i in range(M_)]
med.add(v, f)
# the bead on its top the cord runs through: a short gold tube across the chest
top = mc3 + mn * 0.006 + mv * (MED_HH + 0.004)
tube(med, tuple(top - mu * 0.0075), tuple(top + mu * 0.0075), 0.0052, 0.0052, 6, cap0=True, cap1=True)
PARTS.append(med)
medf = Part('medalFace', 'medalFace', lambda p: {'torso': 1.0}, angle=40)
if not FIGURE:
    medf.add(oct8(0.74, 0.0085) + [tuple(mc3 + mn * 0.0105)], [[i, (i + 1) % 8, 8] for i in range(8)])
else:
    # (a slightly domed face inside the rim, and on it an engraved ring (a darker line) round a raised boss)
    medf.add(oct8(0.80, 0.0085) + oct8(0.56, 0.0098) + [tuple(mc3 + mn * 0.0112)], [[i, (i + 1) % M_, M_ + (i + 1) % M_, M_ + i] for i in range(M_)])
    medf.f += [[M_ + i, M_ + (i + 1) % M_, 2 * M_] for i in range(M_)]
    mline = Part('medalLine', 'medalLine', lambda p: {'torso': 1.0}, angle=180)
    mline.add(oct8(0.62, 0.0101) + oct8(0.68, 0.0099), [[i, (i + 1) % M_, M_ + (i + 1) % M_, M_ + i] for i in range(M_)])
    PARTS.append(mline)
PARTS.append(medf)

# the cord: one path from the bead up the right of the chest, round the back of the neck and down the left to the bead
CORD_LEG = [(0.0035, 0.0), (0.016, 0.009), (0.031, 0.024), (0.040, 0.050), (0.046, 0.076), (0.043, 0.098)]  # (x, y above the bead)
CORD_NECK_Y = 0.784
if FIGURE:   # (round the foot of the standing collar, then in a V down the chest to the bead)
    CORD_LEG = [(0.0035, 0.0), (0.016, 0.010), (0.030, 0.026), (0.040, 0.050), (0.047, 0.072), (0.050, 0.086)]
    CORD_NECK_Y = 0.770
leg_pts = [(x, top.y + dy) for x, dy in CORD_LEG]
loop = [(0.040 * math.sin(math.radians(a)), 0.05 + 0.04 * math.cos(math.radians(a))) for a in (70, 95, 120, 150, 180)]   # (x, z) round the neck
half = [(x, y, None) for x, y in leg_pts] + [(x, CORD_NECK_Y, z) for x, z in loop]
right = [(-x, y, z) for x, y, z in half]          # bead → neck back, right side
left = [(x, y, z) for x, y, z in half]            # bead → neck back, left side
path = right + list(reversed(left[:-1]))          # bead (right) → back of the neck → bead (left)


def cr_sub(pts, k=2):
    # Catmull-Rom: k points per segment
    out = []
    P = [pts[0]] + pts + [pts[-1]]
    for i in range(len(pts) - 1):
        p0, p1, p2, p3 = (Vector(q) for q in P[i:i + 4])
        for j in range(k):
            t = j / k
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(Vector(pts[-1]))
    return out


placed = []
for x, y, z in path:
    if z is None:   # on the chest: cast toward the body's axis from in front
        q, n = on_surface(NECKS, (x, y, 0.2), (x * 0.3, y, 0.0), CORD_LIFT)
    else:           # round the neck: cast in toward the neck's axis
        q, n = on_surface(NECKS, (x, y, z), (0.0, y, 0.05), CORD_LIFT)
    placed.append((tuple(q), tuple(n)))
pts = cr_sub([q for q, _ in placed], 2)
nrm = cr_sub([n for _, n in placed], 2)
# re-seat the smoothed points on the surface along their own normals (the curve may cut a corner of the collar)
seated = []
for q, n in zip(pts, nrm):
    n = n.normalized()
    hit, hn, _, _ = NECKS.ray_cast(q + n * 0.05, -n, 0.2)
    seated.append((hit + hn.normalized() * (CORD_LIFT if hn.dot(n) > 0 else -CORD_LIFT), n) if hit is not None else (q, n))
CORD_W_OF = {}
cord = Part('cord', 'cord', lambda p: CORD_W_OF[tuple(round(c, 6) for c in p)], angle=180)
cv, cf = [], []
for i, (q, n) in enumerate(seated):
    t = (seated[min(i + 1, len(seated) - 1)][0] - seated[max(i - 1, 0)][0]).normalized()
    side_ = t.cross(n).normalized() * CORD_W
    cv += [tuple(q - side_), tuple(q + side_)]
for i in range(len(seated) - 1):
    a, b, c, d = 2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2
    fn = (Vector(cv[b]) - Vector(cv[a])).cross(Vector(cv[c]) - Vector(cv[a]))
    cf.append([a, b, c, d] if fn.dot(seated[i][1]) > 0 else [d, c, b, a])
for p in cv:
    w = smooth(0.756, 0.778, p[1])   # (above the collar on the neck bone, as the neck there; on the chest the torso)
    CORD_W_OF[tuple(round(c, 6) for c in p)] = {k: v for k, v in (('neck', w), ('torso', 1 - w)) if v > 1e-4}
cord.add(cv, cf)
PARTS.append(cord)

# the mouth (FACE-MOUTH, then FACES-HANDS): he had none. A short, calm, slightly upturned line on the lower face. It is
# its own small mesh on the head bone (lbapoly.mouth_lens), drawn at its OPEN size, a pinched lens; the game scales it
# down in y to the thin closed line at rest (rest 0.22, HERO-LOOK: a 5 mm line in a darker red-brown, was 0.28: in the
# close-ups the fuller red lens read as lipstick) and up while he
# speaks, in time with the voice's syllables (rig.js, voice.js). 16 triangles, one draw call.
MOUTH_Y, MOUTH_HW, MOUTH_HH, MOUTH_LIFT, MOUTH_REST = 0.842, 0.0215, 0.0110, 0.0075, 0.22
if FIGURE:   # (the figure's wide friendly mouth: wider, its corners turned up a little more; a touch lower under the longer nose)
    MOUTH_Y, MOUTH_HW, MOUTH_LIFT = 0.8395, 0.0262, 0.0090
MOUTHS = [mouth_lens(0.0, MOUTH_Y, MOUTH_HW, MOUTH_HH, MOUTH_LIFT, head_front, 9, 0.004)]   # (pivot, polygon, tilt)

# eyes (separate, so they can blink): a flat diamond on the face, the iris a smaller one on top of it
EYES = []
EYE_Y, EYE_LID = 0.896, 0.0036   # (HERO-LOOK: the eyes' height; how far above the eye's middle line the upper lid's edge comes)
for sx in (1, -1):
    cx, cy = sx * (0.037 if not FIGURE else 0.0385), EYE_Y
    cz = head_front(cx, cy) + 0.003
    def on_face(dx, dy, lift=0.0):
        p = (cx + dx, cy + dy, head_front(cx + dx, cy + dy) + 0.003 + lift)
        return scale_about(tilt(p) if False else p, CHIN, HEAD_K)
    # almond: wider than tall, the outer corner a touch higher
    # (TWINSEN-LOOK-38: the eye 16 % wider and 30 % taller, rounder, on 16 points; the iris and pupil larger; a catch-light)
    # (fifth pass, the user 12.11: "the eyes are far too big and there are strange spots in them": back near the old size,
    # a touch rounder; the white lifted 0.8 mm off the face, so the curved face no longer shows through its flat edges)
    EW, EH = (0.0170, 0.0100) if TW_LOOK else (0.016, 0.0085)
    if FIGURE:   # (the figure's eyes are round, not almonds: as wide as before, taller; a bigger, brighter iris)
        EW, EH = 0.0172, 0.0138
    NW = 12 if TW_LOOK else 10
    WL = 0.0008 if TW_LOOK else 0.0
    white = [on_face(EW * math.cos(t), EH * math.sin(t), WL) for t in [2 * math.pi * k / NW for k in range(NW)]]
    ic = (sx * -0.002, 0.0)
    IR, PR = (0.0071, 0.0032) if TW_LOOK else (0.0068, 0.003)
    if FIGURE:
        IR, PR = 0.0082, 0.0037
    iris = [on_face(ic[0] + IR * math.cos(t), ic[1] + IR * math.sin(t), 0.0012 + WL) for t in [2 * math.pi * k / (14 if TW_LOOK else 10) for k in range(14 if TW_LOOK else 10)]]
    pupil = [on_face(ic[0] + PR * math.cos(t), ic[1] + PR * math.sin(t), 0.0022 + WL) for t in [2 * math.pi * k / (10 if TW_LOOK else 8) for k in range(10 if TW_LOOK else 8)]]
    piv = scale_about((cx, cy, cz), CHIN, HEAD_K)
    # HERO-LOOK (faces in close-up, WORKLIST #8): an upper lid. Without one the iris sat in a full ring of white, a stare
    # that read as startled (uncanny) in the dialogue close-ups. The lid (the skin a shade darker) comes down over the top
    # of the white and the top of the iris, a dark lash line along its edge that thickens to a small flick at the outer
    # corner: a calm, friendly look. In the eye group, so the blink closes it with the eye. 2 × 24 triangles.
    LID = 7
    us = [i / (LID - 1) * 2 - 1 for i in range(LID)]
    outer = lambda u: max(0.0, u * sx)
    LIDY = 0.0042 if TW_LOOK else EYE_LID   # (TWINSEN-LOOK-38: a heavy upper lid over the top of the round eye, as the cover's)
    if FIGURE:   # (the figure's lids sit high on its big eyes: just over the iris's top)
        LIDY = 0.0094
    edge = [(u * EW * 1.05, LIDY * (1 - u * u) ** 0.7 + 0.0007 * outer(u)) for u in us]
    top = [(u * EW * 1.1, EH * 1.07 * math.sqrt(max(0.0, 1 - u * u)) + 0.0006) for u in us]
    lid = [on_face(dx, dy, 0.0026) for dx, dy in edge] + [on_face(dx, dy, 0.0026) for dx, dy in reversed(top)]
    lash_lo = [(dx, dy - 0.0004) for dx, dy in edge]
    lash_hi = [(dx + 0.0016 * outer(u) * sx, dy + 0.0010 + 0.0010 * outer(u)) for (dx, dy), u in zip(edge, us)]
    lash = [on_face(dx, dy, 0.003) for dx, dy in lash_lo] + [on_face(dx, dy, 0.003) for dx, dy in reversed(lash_hi)]
    EYES.append({'pivot': piv, 'tris': [(white, 'white'), (iris, 'iris'), (pupil, 'pupil')] + [(lid, 'lidSkin'), (lash, 'lid')]})

# HERO-LOOK: brows. He had none (LBA2's in-game model has none at its 30 px head height); in the close-ups a face with no
# brows reads blank and childlike, and he is a grown man now. Short, a little arched, thicker at the inner end, in his
# hair's dark brown, laid on the brow over each eye (head bone). 2 × 8 triangles.
brow = Part('brow', 'brow', lambda p: {'head': 1.0}, angle=180, big=True)
for sx in (1, -1):
    st = []
    for i in range(5):
        u = i / 4
        x = sx * (0.0205 + 0.034 * u)
        yc = EYE_Y + (0.0182 if TW_LOOK else 0.0172) + (0.0036 if FIGURE else 0.0) + 0.0042 * math.sin(math.pi * min(1.0, u * 1.15)) - 0.0012 * u   # (TWINSEN-LOOK-38: above the taller eye)
        h = 0.0031 * (1 - u) + 0.0013 * u
        st.append((x, yc, h))
    lo = [(x, y - h, head_front(x, y - h) + 0.0024) for x, y, h in st]
    hi = [(x, y + h, head_front(x, y + h) + 0.0024) for x, y, h in st]
    o = len(brow.v)
    brow.add(lo + hi, [])
    brow.f += [[o + i, o + i + 1, o + 5 + i + 1, o + 5 + i] for i in range(4)]
PARTS.append(brow)

# HERO-LOOK: a small nose. The face came to a point only through the head's sections (LBA2's short snout), so from the
# front the middle of the face was one empty plane between the eyes and the mouth. A small rounded nose on the snout,
# 8 mm proud at the tip, its bridge fading into the face below the eyes: the face gets a centre, and the profile keeps
# LBA2's line. 10 triangles, head bone.
nose = Part('nose', 'skin', lambda p: {'head': 1.0}, angle=80, big=True)
hf = lambda x, y, d: (x, y, head_front(x, y) + d)
NOSE = [hf(0, 0.8785, -0.0012),                                   # 0 the bridge, in the face
        hf(0.0058, 0.8715, -0.0004), hf(-0.0058, 0.8715, -0.0004),   # 1, 2 its sides
        hf(0.0098, 0.8608, 0.0008), hf(-0.0098, 0.8608, 0.0008),   # 3, 4 the wings
        hf(0, 0.8555, 0.0022),                                    # 5 under the tip
        hf(0, 0.8648, 0.0082),                                    # 6 the tip
        hf(0.0047, 0.8628, 0.0062), hf(-0.0047, 0.8628, 0.0062)]   # 7, 8 the tip's sides
if FIGURE:
    # (TWINSEN-FIGURE: the figure's long round nose: a soft bridge from between the eyes out and down to a round tip,
    # 5 cm proud of the face at the play scale (the old small nose was 1.6 cm), pointing a little down)
    ftip = (0.0, 0.8575, head_front(0.0, 0.8575) + 0.0150)
    sphere(nose, ftip, 0.0105, 12, 8, 0.95)
    tube(nose, (0.0, 0.8820, head_front(0.0, 0.8820) - 0.0030), (0.0, 0.8615, head_front(0.0, 0.8615) + 0.0105), 0.0068, 0.0090, 12, cap0=False, cap1=False, squash=0.80)
elif TW_LOOK:
    # (TWINSEN-LOOK-38: a small rounded nose, as Zoé's: a ball squashed front to back on the snout, its back half sunk in the
    # face, and a short soft bridge into the brow; the tip 7 mm proud, a little lower and rounder than the pyramid's point)
    tip = (0.0, 0.8625, head_front(0.0, 0.8625) + 0.0012)
    sphere(nose, tip, 0.0078, 10, 7, 0.9)
    tube(nose, (0.0, 0.8755, head_front(0.0, 0.8755) - 0.0025), (0.0, 0.8645, head_front(0.0, 0.8645) + 0.0005), 0.0058, 0.0074, 10, cap0=False, cap1=False, squash=0.62)
else:
    nose.add(NOSE, [[0, 1, 7], [0, 7, 6], [0, 6, 8], [0, 8, 2], [1, 3, 7], [2, 8, 4], [7, 3, 5], [7, 5, 6], [6, 5, 8], [8, 5, 4]])
PARTS.append(nose)


# ------------------------------------------------------------------ arms: model in the display pose, store the rest pose
def rot_z(a, pivot):
    T = Matrix.Translation(Vector(pivot))
    return T @ Matrix.Rotation(a, 4, 'Z') @ T.inverted()


def arm_mats(spread):
    M = {}
    for s, sg in (('L', 1), ('R', -1)):
        piv = [c / S for c in B['sh' + s]['p']]
        m = rot_z(sg * spread, piv)
        for b in ('sh' + s, 'el' + s, 'hand' + s):
            M[b] = m
    return M


GAME_SPREAD = 0.3   # (the look's armSpread, characters.js LOOKS.twinsen: where the game holds the arms at rest)
ARM_M, ARM_G = arm_mats(SPREAD), arm_mats(GAME_SPREAD)


def blend_m(Ms, w):
    M = Matrix(((0, 0, 0, 0),) * 4)
    for b, wt in w.items():
        M = M + (Ms.get(b, Matrix.Identity(4)) * wt)
    return M


def to_rest(p, w, Ms=ARM_M):
    # the game spreads the arms by SPREAD at the shoulder: un-spread the vertex by its own blend of bones
    return tuple(blend_m(Ms, w).inverted() @ Vector(p))


def to_game(p, w):
    # where the game shows a vertex drawn at SPREAD with weights w, at rest (its arms at GAME_SPREAD)
    return tuple(blend_m(ARM_G, w) @ blend_m(ARM_M, w).inverted() @ Vector(p))


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


PART_TRIS = {}
for part in PARTS:
    W = [part.weights((part.vside[i] * 0.06, p[1], p[2]) if i in part.vside else p) for i, p in enumerate(part.v)]
    if part.cls is not None:   # (HERO-ARMS: LBA2's weights; beside the cut the body's copies fade to the torso)
        shown = [to_game(p, w) for p, w in zip(part.v, W)]
        for i, (q, c) in enumerate(zip(shown, part.cls)):
            if c == 'body':
                f = body_f(q[1])
                W[i] = {b: (1 - (1 - wt) * f if b == 'torso' else wt * f) for b, wt in W[i].items()}
            elif c == 'sleeve':
                a = 1 - W[i]['torso']
                a2 = a + (1 - a) * sleeve_k(q[1])
                el = a2 * (1 - smooth(0.49, 0.6, q[1]))
                s = side(q[0])
                W[i] = {'torso': 1 - a2, 'sh' + s: a2 - el, 'el' + s: el}
        rest = [to_rest(p, w, ARM_G) for p, w in zip(shown, W)]
    elif part.reweight:   # (HERO-LOOK: new weights where the game shows it at rest; the same rest shape on screen)
        shown = [to_game(p, w) for p, w in zip(part.v, W)]
        W = [part.reweight(p) for p in shown]
        rest = [to_rest(p, w, ARM_G) for p, w in zip(shown, W)]
    elif part.game:
        rest = [to_rest(p, w, ARM_G) for p, w in zip(part.v, W)]
    else:
        rest = [to_rest(p, w) for p, w in zip(part.v, W)]
    tris = []
    for f in part.f:
        for k in range(1, len(f) - 1):
            tris.append((f[0], f[k], f[k + 1]))
    # Blender object (rest pose, vertex groups, armature modifier)
    me = bpy.data.meshes.new(part.name)
    me.from_pydata([gb(p) for p in rest], [], part.f)
    me.materials.append(mats[part.mat])
    if part.normal is not None:   # (the hair's flat shade: the exported normals, kept in the source file too)
        me.normals_split_custom_set_from_vertices([tuple(gb(part.normal) / S)] * len(rest))
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
    cn = corner_normals(rest, tris, part.angle) if part.normal is None else [[part.normal] * 3 for _ in tris]
    rgb = hexrgb(COL[part.mat])
    for t, ns in zip(tris, cn):
        for i, n in zip(t, ns):
            out['pos'] += [round(c * S, 5) for c in rest[i]]
            out['nrm'] += [round(c, 4) for c in n]
            out['col'] += hexrgb(COL[part.color(part.v[i])]) if part.color else rgb
            ws = sorted(((b, wt) for b, wt in W[i].items() if wt > 1e-4), key=lambda q: -q[1])[:4]
            tot = sum(wt for _, wt in ws)
            ws += [(None, 0)] * (4 - len(ws))
            out['si'] += [bix(b) if b else 0 for b, _ in ws]
            out['sw'] += [round(wt / tot, 4) for _, wt in ws]
    out['tris'] += len(tris)
    PART_TRIS[part.name] = PART_TRIS.get(part.name, 0) + len(tris)

for e in EYES:
    piv = e['pivot']
    ed = {'bone': 'head', 'pivot': [round(c * S, 5) for c in piv], 'pos': [], 'col': []}
    for quad, mat in e['tris']:
        nq = len(quad)
        if mat in ('lid', 'lidSkin'):   # a strip: the lower edge forward, the upper edge back
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

out['mouths'] = []
for piv, poly, mtilt in MOUTHS:
    ps = tuple(c * S for c in piv)
    poly = [tuple(c * S for c in p) for p in poly]
    out['mouths'].append(strip_mesh(ps, [(poly, COL['mouth'])], 'head', MOUTH_REST, -0.35 * MOUTH_HH * S, mtilt))
    out['tris'] += len(strip_tris(len(poly)))
    me = bpy.data.meshes.new('mouth')
    me.from_pydata([gb(tuple(c / S for c in p)) for p in poly], [], [list(range(len(poly)))])
    me.materials.append(mats['mouth'])
    ob = bpy.data.objects.new('mouth', me)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = arm_obj
    ob.parent_type = 'BONE'
    ob.parent_bone = 'head'
    ob.matrix_world = Matrix.Identity(4)

from handpass import apply as hands2   # (HANDS-2: the fist rebuilt as an open, relaxed hand; HANDS2_OLD=1 keeps the fist)
hands2(out, 'twinsen')
json.dump(out, open(OUT, 'w'), separators=(',', ':'))
print('parts', PART_TRIS)
print('tris', out['tris'], 'verts', len(out['pos']) // 3, 'bones', out['bones'])
if BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    print('saved', BLEND)
