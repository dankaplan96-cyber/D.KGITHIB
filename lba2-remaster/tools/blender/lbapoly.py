# Shared helpers for the low-poly LBA-style characters (Blender, headless via `pip install bpy`).
# Geometry is written in game axes (+y up, +z = the character's front, +x = its left) and game units;
# every part carries a weight function (bone -> weight) evaluated per vertex. `export()` writes the
# game's JSON (unindexed triangles, normals smoothed below a crease angle, sRGB vertex colours, 4 bone
# weights per vertex) and adds the part to the open Blender file (armature + vertex groups) for editing.
import json
import math

import bpy
from mathutils import Matrix, Vector


def smooth(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


def hexrgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def lerp(a, b, t):
    return tuple(x + (y - x) * t for x, y in zip(a, b))


class Part:
    def __init__(self, name, color, weights, angle=45):
        self.name, self.color, self.weights, self.angle = name, color, weights, angle
        self.normal = None   # (optional: one normal for every corner, e.g. a flat-shaded hair mass)
        self.v, self.f = [], []

    def add(self, verts, faces):
        o = len(self.v)
        self.v += [tuple(p) for p in verts]
        self.f += [[i + o for i in f] for f in faces]
        return self


def ring(y, hw, zf, zb, n, p=0.75, cx=0.0, cz=0.0):
    """A rounded-box section at height y (or a function of the angle): x = hw·sin^p, z = zf·cos^p in front,
    zb (signed, usually negative) behind; centred on (cx, cz)."""
    pts = []
    for k in range(n):
        t = 2 * math.pi * k / n
        s, c = math.sin(t), math.cos(t)
        sx = math.copysign(abs(s) ** p, s)
        cc = math.copysign(abs(c) ** p, c)
        yy = y(t) if callable(y) else y
        pts.append((cx + hw * sx, yy, cz + (zf * cc if cc >= 0 else -zb * cc)))
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
        r = rings[0]
        verts.append(tuple(sum(p[k] for p in r) / n for k in range(3)))
        c = len(verts) - 1
        faces += [[(i + 1) % n, i, c] for i in range(n)]
    if cap_top:
        r = rings[-1]
        cen = tuple(sum(p[k] for p in r) / n for k in range(3))
        verts.append(cen)
        c = len(verts) - 1
        o = (len(rings) - 1) * n
        faces += [[o + i, o + (i + 1) % n, c] for i in range(n)]
    return part.add(verts, faces)


def tube(part, a, b, ra, rb, n=8, cap=True, squash=1.0):
    """A tapered tube from point a to point b (radii ra → rb); `squash` flattens it along z."""
    a, b = Vector(a), Vector(b)
    d = (b - a).normalized()
    up = Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))
    u = d.cross(up).normalized()
    w = d.cross(u).normalized()
    rings = []
    for c, r in ((a, ra), (b, rb)):
        rr = []
        for k in range(n):
            t = 2 * math.pi * k / n
            p = c + u * (math.cos(t) * r) + w * (math.sin(t) * r * squash)
            rr.append(tuple(p))
        rings.append(rr)
    # orient faces outward: the ring order must run counter-clockwise seen from b
    if (Vector(rings[0][1]) - a).cross(Vector(rings[0][0]) - a).dot(d) > 0:
        rings = [list(reversed(r)) for r in rings]
    return loft(part, rings, cap_bottom=cap, cap_top=cap)


def sphere(part, c, r, nu=10, nv=7, s=(1.0, 1.0, 1.0)):
    rx, ry, rz = r * s[0], r * s[1], r * s[2]
    verts = [(c[0], c[1] - ry, c[2])]
    for j in range(1, nv):
        ph = math.pi * j / nv
        for i in range(nu):
            t = 2 * math.pi * i / nu
            verts.append((c[0] + rx * math.sin(ph) * math.sin(t), c[1] - ry * math.cos(ph), c[2] + rz * math.sin(ph) * math.cos(t)))
    verts.append((c[0], c[1] + ry, c[2]))
    top = len(verts) - 1
    faces = [[0, 1 + (i + 1) % nu, 1 + i] for i in range(nu)]
    for j in range(nv - 2):
        for i in range(nu):
            a, b = 1 + j * nu + i, 1 + j * nu + (i + 1) % nu
            faces.append([a, b, b + nu, a + nu])
    o = 1 + (nv - 2) * nu
    faces += [[o + i, o + (i + 1) % nu, top] for i in range(nu)]
    return part.add(verts, faces)


def box(part, x0, x1, y0, y1, z0, z1, top_front=None):
    """An axis box; top_front lowers the top edge at the front (a wedge: shoes)."""
    yf = y1 if top_front is None else top_front
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1), (x0, y1, z0), (x1, y1, z0), (x1, yf, z1), (x0, yf, z1)]
    f = [[0, 1, 2, 3], [7, 6, 5, 4], [4, 5, 1, 0], [5, 6, 2, 1], [6, 7, 3, 2], [7, 4, 0, 3]]
    return part.add(v, f)


def disc(part, c, r, n, normal_axis='z', thick=0.0):
    """A flat polygon (optionally a thin prism) facing +axis."""
    pts = []
    for k in range(n):
        t = 2 * math.pi * (k + 0.5) / n
        a, b = r * math.cos(t), r * math.sin(t)
        if normal_axis == 'z':
            pts.append((c[0] + a, c[1] + b, c[2]))
        elif normal_axis == 'x':
            pts.append((c[0], c[1] + b, c[2] + a))
        else:
            pts.append((c[0] + a, c[1], c[2] + b))
    off = {'z': (0, 0, thick), 'x': (thick, 0, 0), 'y': (0, thick, 0)}[normal_axis]
    front = [tuple(p[i] + off[i] / 2 for i in range(3)) for p in pts]
    back = [tuple(p[i] - off[i] / 2 for i in range(3)) for p in pts]
    v = back + front
    f = [list(range(n, 2 * n))]
    if thick > 0:
        f.append(list(reversed(range(n))))
        f += [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
    return part.add(v, f)


def strip(part, pts, width, lift=(0, 0, 0.002)):
    """A thin ribbon along a polyline (cords, straps), facing +z."""
    vv = []
    for x, y, z in pts:
        vv += [(x - width, y + lift[1], z + lift[2]), (x + width, y + lift[1], z + lift[2])]
    ff = [[2 * i + 1, 2 * i, 2 * i + 2, 2 * i + 3] for i in range(len(pts) - 1)]
    return part.add(vv, ff)


# ------------------------------------------------------------------ export
def corner_normals(verts, tris, angle):
    fn = []
    for t in tris:
        a, b, c = (Vector(verts[i]) for i in t)
        n = (b - a).cross(c - a)
        fn.append(n.normalized() if n.length > 1e-12 else Vector((0, 1, 0)))
    around = {}
    for fi, t in enumerate(tris):
        for i in t:
            around.setdefault(i, []).append(fi)
    lim = math.cos(math.radians(angle))
    res = []
    for fi, t in enumerate(tris):
        cn = []
        for i in t:
            acc = Vector((0, 0, 0))
            for g in around[i]:
                if fn[g].dot(fn[fi]) >= lim:
                    acc += fn[g]
            cn.append(acc.normalized() if acc.length > 1e-9 else fn[fi])
        res.append(cn)
    return res


def gb(p):  # game → Blender axes (z up, facing −y)
    return Vector((p[0], -p[2], p[1]))


class Builder:
    def __init__(self, name, bones, collection=None, rest=None):
        self.name, self.B = name, bones
        self.rest = rest  # optional fn(p, weights) -> rest-pose point
        self.parts, self.eyes = [], []
        coll = collection or bpy.context.scene.collection
        self.coll = bpy.data.collections.new(name)
        coll.children.link(self.coll)
        self.arm = self._armature()
        self.mats = {}

    def P(self, pname, color, weights, angle=45):
        if isinstance(weights, str):
            b = weights
            weights = lambda p, b=b: {b: 1.0}
        part = Part(pname, color, weights, angle)
        self.parts.append(part)
        return part

    def eye(self, pivot, quads, bone='head'):
        self.eyes.append({'bone': bone, 'pivot': pivot, 'quads': quads})

    def _armature(self):
        B = self.B
        data = bpy.data.armatures.new(self.name + 'Rig')
        ob = bpy.data.objects.new(self.name + 'Rig', data)
        self.coll.objects.link(ob)
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.mode_set(mode='EDIT')
        kids = {}
        for nm, b in B.items():
            if b['parent']:
                kids.setdefault(b['parent'], []).append(nm)
        for nm, b in B.items():
            eb = data.edit_bones.new(nm)
            hp = gb(b['p'])
            tail = None
            for k in kids.get(nm, []):
                if not k.startswith('skirt'):
                    tail = gb(B[k]['p'])
                    break
            if tail is None or (tail - hp).length < 1e-3:
                tail = hp + Vector((0, 0, 0.08))
            eb.head, eb.tail = hp, tail
        for nm, b in B.items():
            if b['parent']:
                data.edit_bones[nm].parent = data.edit_bones[b['parent']]
        bpy.ops.object.mode_set(mode='OBJECT')
        return ob

    def _mat(self, color):
        if color not in self.mats:
            m = bpy.data.materials.new(self.name + color)
            r, g, b = [c / 255 for c in hexrgb(color)]
            m.diffuse_color = (r, g, b, 1)
            self.mats[color] = m
        return self.mats[color]

    def export(self, path):
        out = {'bones': [], 'pos': [], 'nrm': [], 'col': [], 'si': [], 'sw': [], 'eyes': [], 'tris': 0}
        ix = {}

        def bix(nm):
            if nm not in ix:
                ix[nm] = len(out['bones'])
                out['bones'].append(nm)
            return ix[nm]

        for part in self.parts:
            if not part.f:
                continue
            W = []
            for p in part.v:
                w = {b: x for b, x in part.weights(p).items() if x > 1e-4 and b in self.B}
                W.append(w or {'torso': 1.0})
            rest = [self.rest(p, w) if self.rest else p for p, w in zip(part.v, W)]
            tris = [(f[0], f[k], f[k + 1]) for f in part.f for k in range(1, len(f) - 1)]
            me = bpy.data.meshes.new(self.name + '_' + part.name)
            me.from_pydata([gb(p) for p in rest], [], part.f)
            me.materials.append(self._mat(part.color))
            ob = bpy.data.objects.new(self.name + '_' + part.name, me)
            self.coll.objects.link(ob)
            ob.parent = self.arm
            ob.modifiers.new('Armature', 'ARMATURE').object = self.arm
            groups = {}
            for vi, w in enumerate(W):
                for b, x in w.items():
                    if b not in groups:
                        groups[b] = ob.vertex_groups.new(name=b)
                    groups[b].add([vi], x, 'REPLACE')
            cn = [[Vector(part.normal).normalized()] * 3 for _ in tris] if part.normal else corner_normals(rest, tris, part.angle)
            rgb = hexrgb(part.color)
            for t, ns in zip(tris, cn):
                for i, n in zip(t, ns):
                    out['pos'] += [round(c, 5) for c in rest[i]]
                    out['nrm'] += [round(c, 4) for c in n]
                    out['col'] += rgb
                    ws = sorted(W[i].items(), key=lambda q: -q[1])[:4]
                    tot = sum(x for _, x in ws)
                    ws += [(None, 0)] * (4 - len(ws))
                    out['si'] += [bix(b) if b else 0 for b, _ in ws]
                    out['sw'] += [round(x / tot, 4) for _, x in ws]
            out['tris'] += len(tris)
        for e in self.eyes:
            piv = e['pivot']
            ed = {'bone': e['bone'], 'pivot': [round(c, 5) for c in piv], 'pos': [], 'col': []}
            ntri = 0
            for entry in e['quads']:
                quad, color = entry[0], entry[1]
                n = len(quad)
                if len(entry) > 2 and entry[2] == 'strip':   # an eyelid line: lower edge then the upper edge back
                    h = n // 2
                    tl = [t for i in range(h - 1) for t in ((i, i + 1, n - 2 - i), (i, n - 2 - i, n - 1 - i))]
                else:                                        # a convex polygon: a fan
                    tl = [(0, k, k + 1) for k in range(1, n - 1)]
                for t in tl:
                    for i in t:
                        ed['pos'] += [round(quad[i][k] - piv[k], 5) for k in range(3)]
                        ed['col'] += hexrgb(color)
                ntri += len(tl)
                me = bpy.data.meshes.new(self.name + '_eye')
                me.from_pydata([gb(p) for p in quad], [], [list(range(n))])
                me.materials.append(self._mat(color))
                ob = bpy.data.objects.new(self.name + '_eye', me)
                self.coll.objects.link(ob)
                ob.parent = self.arm
            out['eyes'].append(ed)
            out['tris'] += ntri
        json.dump(out, open(path, 'w'), separators=(',', ':'))
        return out['tris']
