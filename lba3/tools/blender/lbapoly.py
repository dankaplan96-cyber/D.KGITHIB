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


# CAST-UNIFORM (WORKLIST #40): one finish standard for every character's round parts (docs/character-review.md,
# "The finish standard"). A ball (hand, knee, head, nose, bun...) or a tube (arm, leg, trunk, cuff...) gets at least
# the segments its size needs to keep a round outline up close, and is smooth-shaded whatever its part's crease
# angle (a ball has no edge to keep; a tube keeps its end caps crisp). Parts meant to be crisp (brass armour) pass
# hard=True and keep what they asked for. Tiny details (knuckles, glints, lashes) keep their counts.
SPHERE_MIN = ((0.2, 16, 10), (0.07, 12, 8), (0.035, 10, 7), (0.02, 8, 6), (0.012, 8, 5))   # (its largest radius at least → segments around, down)
TUBE_MIN = ((0.05, 10), (0.02, 8))                            # (its larger end's radius at least → sides)
DISC_MIN = ((0.15, 24), (0.08, 16))                           # (a flat round: hat brims)
TUBE_ANGLE = 75                                               # (a tube's sides: smooth; its caps keep the part's angle)
UNIFORM = True                                                # (False: these helpers as before #40, for comparisons)


def _min_segments(table, size, *asked):
    if UNIFORM:
        for lim, *seg in table:
            if size >= lim:
                return tuple(max(a, s) for a, s in zip(asked, seg))
    return asked


class Face(list):
    """A face's vertex indices, with its own smoothing angle (CAST-UNIFORM; None = its part's)."""
    angle = None


class Part:
    def __init__(self, name, color, weights, angle=45):
        self.name, self.color, self.weights, self.angle = name, color, weights, angle
        self.normal = None   # (optional: one normal for every corner, e.g. a flat-shaded hair mass)
        self.v, self.f = [], []

    def add(self, verts, faces, angle=None):
        o = len(self.v)
        self.v += [tuple(p) for p in verts]
        for f in faces:
            ff = Face(i + o for i in f)
            ff.angle = angle
            self.f.append(ff)
        return self

    def face_angles(self):
        """Each face's smoothing angle (faces put in .f by hand take the part's)."""
        return [a if a is not None else self.angle for a in (getattr(f, 'angle', None) for f in self.f)]


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


def refine(secs, where=None):
    """CAST-UNIFORM: a profile of sections (tuples of numbers: y, then the section's sizes) with a section added midway in
    each interval listed in `where` (all by default), on the Catmull-Rom curve through them: a body's outline that
    bends sharply between two sections (a Grobo's round bottom) gets a rounder silhouette, not a kink."""
    out, n = [], len(secs)
    for i in range(n - 1):
        out.append(secs[i])
        if where is None or i in where:
            a, b, c, d = secs[max(0, i - 1)], secs[i], secs[i + 1], secs[min(n - 1, i + 2)]
            out.append(tuple((-a[k] + 9 * b[k] + 9 * c[k] - d[k]) / 16 for k in range(len(b))))
    out.append(secs[-1])
    return out


def tube(part, a, b, ra, rb, n=8, cap=True, squash=1.0, hard=False):
    """A tapered tube from point a to point b (radii ra → rb); `squash` flattens it along z. CAST-UNIFORM: at least the
    sides TUBE_MIN asks for its size, the sides smooth-shaded (TUBE_ANGLE), unless hard."""
    if not hard:
        n, = _min_segments(TUBE_MIN, max(ra, rb), n)
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
    f0 = len(part.f)
    loft(part, rings, cap_bottom=cap, cap_top=cap)
    if not hard and UNIFORM:
        for k in range(f0, f0 + n):   # (the sides come first in loft's faces; the caps after them)
            part.f[k].angle = max(part.angle, TUBE_ANGLE)
    return part


def sphere(part, c, r, nu=10, nv=7, s=(1.0, 1.0, 1.0), hard=False, exact=False):
    """A ball (an ellipsoid with the scales s). CAST-UNIFORM: at least the segments SPHERE_MIN asks for its size, and
    smooth-shaded all over (a ball has no edge to keep), unless hard. `exact` keeps the segments asked (a ball mostly
    buried in another part: a shoulder in its sleeve, a knuckle in the hand), still smooth."""
    rx, ry, rz = r * s[0], r * s[1], r * s[2]
    if not hard and not exact:
        nu, nv = _min_segments(SPHERE_MIN, max(abs(rx), abs(ry), abs(rz)), nu, nv)
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
    return part.add(verts, faces, None if hard or not UNIFORM else 180)


def box(part, x0, x1, y0, y1, z0, z1, top_front=None):
    """An axis box; top_front lowers the top edge at the front (a wedge: shoes)."""
    yf = y1 if top_front is None else top_front
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1), (x0, y1, z0), (x1, y1, z0), (x1, yf, z1), (x0, yf, z1)]
    f = [[0, 1, 2, 3], [7, 6, 5, 4], [4, 5, 1, 0], [5, 6, 2, 1], [6, 7, 3, 2], [7, 4, 0, 3]]
    return part.add(v, f)


def disc(part, c, r, n, normal_axis='z', thick=0.0, hard=False):
    """A flat polygon (optionally a thin prism) facing +axis. CAST-UNIFORM: a big one (a hat's brim) gets the sides
    DISC_MIN asks for, so its outline stays round."""
    if not hard:
        n, = _min_segments(DISC_MIN, r, n)
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


def mouth_lens(cx, cy, hw, hh, lift, front, n=9, dz=0.004, a_up=1.0, a_lo=1.0):
    """FACES-HANDS: a talking mouth drawn at its fully OPEN size: a lens (the corners pinched to a point, the middle
    `hh` tall above and below the centre line, times a_up / a_lo for a jaw that drops more than the lip lifts, the
    corners `lift` higher than the middle) laid on the face surface. The game scales it down in y to a thin closed
    line at rest (`rest` in the JSON) and back up while the character speaks (rig.js), so the corner lift and the
    thickness shrink together with it. `front(x, y)` is the face's z at a point; the lens lies flat on the face at the
    centre line (dz proud of it) and the game tilts it back about x by `tilt` as it opens, so its lower edge follows the
    face receding toward the chin. Returns (pivot, polygon, tilt): a strip (lower edge left to right, then the upper
    edge back) of n stations about the pivot (cx, cy)."""
    lo, up = [], []
    for i in range(n):
        u = i / (n - 1) * 2 - 1
        x = cx + u * hw
        t = max(0.0, 1.0 - abs(u) ** 2.2) ** 0.62            # the pinched lens profile
        yc = cy + lift * u * u
        z = front(x, cy) + dz                                 # (flat: the game tilts it with the jaw, see tilt)
        lo.append((x, yc - hh * a_lo * t, z))
        up.append((x, yc + hh * a_up * t, z))
    pz = max(p[2] for p in lo)
    tilt = math.atan2(front(cx, cy + hh * a_up) - front(cx, cy - hh * a_lo), hh * (a_up + a_lo))   # (the face slope over the lens: how far back its lower edge goes)
    return (cx, cy, pz), lo + list(reversed(up)), tilt


def lip_band(lens, thick, lift=0.0004):
    """A band hanging from the lens's lower edge (a lower lip that drops with the open mouth), `thick` tall in the middle
    and pinched at the corners like the lens; a hair in front of it."""
    n = len(lens) // 2
    top = lens[:n]
    band = []
    for i, (x, y, z) in enumerate(top):
        u = i / (n - 1) * 2 - 1
        band.append((x, y - thick * max(0.0, 1.0 - abs(u) ** 2.2) ** 0.62, z + lift))
    return band + [(x, y, z + lift) for x, y, z in reversed(top)]


def hand_detail(part, hc, r, sx, bunny=False, grobo=False):
    """CAST-POLISH: a hand on the ball (as Twinsen's, twinsen_poly.py: the ball stays the gameplay silhouette): a thumb
    standing forward off the inner front, and the fingers as three knuckle lobes curled along the inner underside (the
    palm faces the thigh at rest). A paw (bunny) has two fat toe-lobes and a short thumb; a Grobo's hand a stout thumb."""
    k = r / 0.036
    if bunny:
        tube(part, (hc[0] - sx * 0.013 * k, hc[1] + 0.010 * k, hc[2] + 0.022 * k), (hc[0] - sx * 0.019 * k, hc[1] + 0.002 * k, hc[2] + 0.044 * k), 0.0100 * k, 0.0075 * k, 6)
        lobes = ((-0.014, -0.019, 0.0125), (0.010, -0.021, 0.0125))
    elif grobo:
        tube(part, (hc[0] - sx * 0.013 * k, hc[1] + 0.012 * k, hc[2] + 0.022 * k), (hc[0] - sx * 0.022 * k, hc[1] + 0.0 * k, hc[2] + 0.052 * k), 0.0125 * k, 0.0085 * k, 6)
        lobes = ((-0.020, -0.017, 0.0135), (-0.002, -0.022, 0.0145), (0.017, -0.019, 0.0125))
    else:
        tube(part, (hc[0] - sx * 0.013 * k, hc[1] + 0.012 * k, hc[2] + 0.022 * k), (hc[0] - sx * 0.021 * k, hc[1] + 0.001 * k, hc[2] + 0.050 * k), 0.0098 * k, 0.0068 * k, 6)
        lobes = ((-0.020, -0.017, 0.0118), (-0.002, -0.021, 0.0128), (0.017, -0.019, 0.0108))
    for dz_, dy_, rr_ in lobes:   # (CAST-UNIFORM: half sunk in the ball; smooth, with the segments asked)
        sphere(part, (hc[0] - sx * 0.026 * k, hc[1] + dy_ * k, hc[2] + dz_ * k), rr_ * k, 6, 4, exact=True)


# ------------------------------------------------------------------ export
def corner_normals(verts, tris, angle):
    """Each corner's normal: the faces round the vertex within the crease angle of this face, averaged. `angle` is one
    angle for all, or one per triangle (CAST-UNIFORM: two faces are smoothed together within the smaller of theirs)."""
    fn = []
    for t in tris:
        a, b, c = (Vector(verts[i]) for i in t)
        n = (b - a).cross(c - a)
        fn.append(n.normalized() if n.length > 1e-12 else Vector((0, 1, 0)))
    around = {}
    for fi, t in enumerate(tris):
        for i in t:
            around.setdefault(i, []).append(fi)
    lims = [math.cos(math.radians(a)) for a in angle] if isinstance(angle, (list, tuple)) else None
    lim = None if lims else math.cos(math.radians(angle))
    res = []
    for fi, t in enumerate(tris):
        cn = []
        for i in t:
            acc = Vector((0, 0, 0))
            for g in around[i]:
                if fn[g].dot(fn[fi]) >= (lim if lims is None else max(lims[fi], lims[g])):
                    acc += fn[g]
            cn.append(acc.normalized() if acc.length > 1e-9 else fn[fi])
        res.append(cn)
    return res


def strip_tris(n):
    """Triangles of a strip polygon: its lower edge left to right, then its upper edge back (stations 0..n/2-1)."""
    h = n // 2
    return [t for i in range(h - 1) for t in ((i, i + 1, n - 2 - i), (i, n - 2 - i, n - 1 - i))]


def strip_mesh(piv, polys, bone, rest, drop, tilt=0.0):
    """The JSON entry of a mouth: triangles relative to its pivot, on a bone (same layout as an eye's), with its
    closed scale in y (`rest`), how far it drops (game units) and how far it tilts back (radians) at full open. `polys` = [(strip polygon, colour)]."""
    ed = {'bone': bone, 'pivot': [round(c, 5) for c in piv], 'pos': [], 'col': [], 'rest': rest, 'drop': drop, 'tilt': round(tilt, 4)}
    for poly, color in polys:
        for t in strip_tris(len(poly)):
            for i in t:
                ed['pos'] += [round(poly[i][k] - piv[k], 5) for k in range(3)]
                ed['col'] += hexrgb(color)
    return ed


def gb(p):  # game → Blender axes (z up, facing −y)
    return Vector((p[0], -p[2], p[1]))


class Builder:
    def __init__(self, name, bones, collection=None, rest=None):
        self.name, self.B = name, bones
        self.rest = rest  # optional fn(p, weights) -> rest-pose point
        self.parts, self.eyes, self.mouths = [], [], []
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

    def mouth(self, pivot, polys, rest=0.3, drop=0.0, tilt=0.0, bone='head'):
        """The talking mouth (see mouth_lens): its own small mesh on the bone, scaled by the game. polys = [(polygon, colour)]."""
        self.mouths.append({'bone': bone, 'pivot': pivot, 'polys': polys, 'rest': rest, 'drop': drop, 'tilt': tilt})

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
            fa = part.face_angles()
            ang = [a for f, a in zip(part.f, fa) for k in range(1, len(f) - 1)] if any(a != part.angle for a in fa) else part.angle
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
            cn = [[Vector(part.normal).normalized()] * 3 for _ in tris] if part.normal else corner_normals(rest, tris, ang)
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
        if self.mouths:
            out['mouths'] = []
        for m in self.mouths:
            out['mouths'].append(strip_mesh(m['pivot'], m['polys'], m['bone'], m['rest'], m['drop'], m['tilt']))
            for poly, color in m['polys']:
                out['tris'] += len(strip_tris(len(poly)))
                me = bpy.data.meshes.new(self.name + '_mouth')
                me.from_pydata([gb(p) for p in poly], [], [list(range(len(poly)))])
                me.materials.append(self._mat(color))
                ob = bpy.data.objects.new(self.name + '_mouth', me)
                self.coll.objects.link(ob)
                ob.parent = self.arm
        json.dump(out, open(path, 'w'), separators=(',', ':'))
        return out['tris']
