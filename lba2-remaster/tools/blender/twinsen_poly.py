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
    'tunic': '#2a86ad', 'belt': '#e2805c', 'shoe': '#d8704e', 'skin': '#e2bc90', 'hair': '#634327',
    'white': '#dcd8ec', 'iris': '#2a6a9a', 'medal': '#c89e53', 'medalFace': '#ddb468', 'cord': '#f7bb57',
}


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
    def __init__(self, name, mat, weights, angle=40, rigid=None, tilted=False):
        self.name, self.mat, self.weights, self.angle, self.rigid, self.tilted = name, mat, weights, angle, rigid, tilted
        self.v, self.f = [], []

    def add(self, verts, faces):
        o = len(self.v)
        self.v += [tilt(p) if self.tilted else tuple(p) for p in verts]
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
N = 16
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
loft(robe, [
    ring(0.04, 0.156, 0.131, -0.129, N, 0.7),
    ring(0.12, 0.161, 0.139, -0.12, N, 0.7),
    ring(0.24, 0.164, 0.144, -0.108, N, 0.7),
    ring(0.35, 0.152, 0.143, -0.092, N, 0.72),
    ring(0.415, 0.104, 0.125, -0.076, N, 0.75),
])
PARTS.append(robe)

for sx in (1, -1):
    s = side(sx)
    shoe = Part('shoe' + s, 'shoe', (lambda b: (lambda p: {b: 1.0}))('foot' + s), angle=30)
    xs = sorted([sx * 0.052, sx * 0.103])
    box_wedge(shoe, xs[0], xs[1], -0.052, 0.103, 0.0, 0.036, 0.014)
    PARTS.append(shoe)
    hand = Part('hand' + s, 'skin', (lambda b: (lambda p: {b: 1.0}))('hand' + s), angle=180)
    sphere(hand, (sx * 0.178, 0.36, 0.012), 0.035, 10, 7)
    PARTS.append(hand)

neck = Part('neck', 'skin', lambda p: {'neck': 1 - smooth(0.79, 0.83, p[1]), 'head': smooth(0.79, 0.83, p[1])}, angle=60)
loft(neck, [ring(0.735, 0.027, 0.078, 0.022, 8, 1.0), ring(0.83, 0.027, 0.078, 0.022, 8, 1.0)])
PARTS.append(neck)

HEAD = [  # (y, half-width, front, back)
    (0.79, 0.03, 0.085, 0.035), (0.81, 0.055, 0.112, 0.0), (0.84, 0.07, 0.132, -0.018), (0.87, 0.077, 0.134, -0.026),
    (0.90, 0.077, 0.127, -0.026), (0.93, 0.068, 0.108, -0.022), (0.952, 0.046, 0.076, -0.012), (0.962, 0.016, 0.04, 0.0),
]
HP = 0.88
head = Part('head', 'skin', lambda p: {'head': 1.0}, angle=62, tilted=True)
loft(head, [ring(y, hw, zf, zb, 14, HP) for y, hw, zf, zb in HEAD], cap_bottom=True, cap_top=True)
PARTS.append(head)


def head_front(x, y):
    # z of the face surface at (x, y), for placing the eyes on it
    for (y0, w0, f0, _), (y1, w1, f1, _) in zip(HEAD, HEAD[1:]):
        if y0 <= y <= y1:
            t = (y - y0) / (y1 - y0)
            hw, zf = w0 + (w1 - w0) * t, f0 + (f1 - f0) * t
            s = min(1, abs(x) / hw) ** (1 / HP)
            c = math.sqrt(max(0, 1 - s * s))
            return zf * c ** HP
    return 0.1


nose = Part('nose', 'skin', lambda p: {'head': 1.0}, angle=20, tilted=True)
nose.add([(-0.014, 0.842, 0.128), (0.014, 0.842, 0.128), (0.0, 0.88, 0.128), (0.0, 0.85, 0.158)],
         [[0, 1, 3], [2, 0, 3], [1, 2, 3]])
PARTS.append(nose)

hair = Part('hair', 'hair', lambda p: {'head': 1.0}, angle=180, tilted=True)
sphere(hair, (0.0, 0.951, -0.045), 0.05, 10, 7)
PARTS.append(hair)
bun1 = Part('bun1', 'hair', lambda p: {'tail0': 1.0}, angle=180, tilted=True)
sphere(bun1, (0.0, 0.924, -0.104), 0.035, 9, 6)
PARTS.append(bun1)
bun2 = Part('bun2', 'hair', lambda p: {'tail1': 1.0}, angle=180, tilted=True)
sphere(bun2, (0.0, 0.887, -0.121), 0.025, 8, 5)
PARTS.append(bun2)

# medallion: an octagonal gold plate on the chest, a lighter face, the cord running up to the collar
med = Part('medal', 'medal', lambda p: {'torso': 1.0}, angle=30)
mc, mr, mz = (0.0, 0.625), 0.043, 0.141
oct_ = [(mc[0] - mr * math.sin(2 * math.pi * (k + 0.5) / 8), mc[1] + mr * math.cos(2 * math.pi * (k + 0.5) / 8)) for k in range(8)]
v = [(x, y, mz - 0.006) for x, y in oct_] + [(x, y, mz + 0.004) for x, y in oct_]
f = [[i, (i + 1) % 8, 8 + (i + 1) % 8, 8 + i] for i in range(8)]
med.add(v, f)
PARTS.append(med)
medf = Part('medalFace', 'medalFace', lambda p: {'torso': 1.0}, angle=30)
medf.add([(x, y, mz + 0.0045) for x, y in oct_], [list(range(8))])
PARTS.append(medf)
cord = Part('cord', 'cord', lambda p: {'torso': 1.0}, angle=180)
for sx in (1, -1):
    pts = [(sx * 0.032, 0.768, 0.072), (sx * 0.024, 0.72, 0.112), (sx * 0.012, 0.675, 0.136), (sx * 0.004, 0.664, 0.142)]
    w = 0.0028
    vv = []
    for x, y, z in pts:
        vv += [(x - w, y, z + 0.002), (x + w, y, z + 0.002)]
    ff = [[2 * i + 1, 2 * i, 2 * i + 2, 2 * i + 3] for i in range(len(pts) - 1)]
    cord.add(vv, ff)
PARTS.append(cord)

# eyes (separate, so they can blink): a flat diamond on the face, the iris a smaller one on top of it
EYES = []
for sx in (1, -1):
    cx, cy = sx * 0.035, 0.895
    cz = head_front(cx, cy) + 0.003
    def on_face(dx, dy, lift=0.0):
        return (cx + dx, cy + dy, head_front(cx + dx, cy + dy) + 0.003 + lift)
    white = [on_face(-0.023, 0), on_face(0, -0.013), on_face(0.023, 0), on_face(0, 0.013)]
    iris = [on_face(sx * 0.004 - 0.01, -0.001, 0.0015), on_face(sx * 0.004, -0.011, 0.0015), on_face(sx * 0.004 + 0.01, -0.001, 0.0015), on_face(sx * 0.004, 0.009, 0.0015)]
    EYES.append({'pivot': tilt((cx, cy, cz)), 'tris': [([tilt(q) for q in white], 'white'), ([tilt(q) for q in iris], 'iris')]})


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
        for t in ((0, 1, 2), (0, 2, 3)):
            for i in t:
                ed['pos'] += [round((quad[i][k] - piv[k]) * S, 5) for k in range(3)]
                ed['col'] += hexrgb(COL[mat])
        me = bpy.data.meshes.new('eye_' + mat)
        me.from_pydata([gb(p) for p in quad], [], [[0, 1, 2, 3]])
        me.materials.append(mats[mat])
        ob = bpy.data.objects.new('eye_' + mat, me)
        bpy.context.scene.collection.objects.link(ob)
        ob.parent = arm_obj
        ob.parent_type = 'BONE'
        ob.parent_bone = 'head'
        ob.matrix_world = Matrix.Identity(4)
    out['eyes'].append(ed)
    out['tris'] += 4

json.dump(out, open(OUT, 'w'), separators=(',', ':'))
print('tris', out['tris'], 'verts', len(out['pos']) // 3, 'bones', out['bones'])
if BLEND:
    bpy.ops.wm.save_as_mainfile(filepath=BLEND)
    print('saved', BLEND)
