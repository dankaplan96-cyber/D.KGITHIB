# NOBPY: a pure-Python stand-in for the few parts of Blender's `mathutils` the character scripts use (Vector maths), so
# tools/blender/*.py can write the game's JSON on a machine without Blender or the `bpy` wheel:
#   PYTHONPATH=tools/blender/nobpy python tools/blender/ballastra_poly.py art/characters/skeletons.json assets/poly
# Blender's mathutils works in single precision; this one rounds every result to float32 the same way, so a rebuild
# matches a Blender build to the JSON's rounding (checked on worker.json: see ballastra_poly.py's header).
import math
import struct

_f = struct.Struct('f')


def _r(x):
    return _f.unpack(_f.pack(x))[0]


class Vector:
    __slots__ = ('_v',)

    def __init__(self, seq=(0.0, 0.0, 0.0)):
        self._v = [_r(float(c)) for c in seq]

    def __iter__(self):
        return iter(self._v)

    def __len__(self):
        return len(self._v)

    def __getitem__(self, i):
        return self._v[i]

    def _set(i):
        def f(s, val):
            s._v[i] = _r(float(val))
        return f

    # (P123: settable as Blender's, so twinsen_poly.py's `d.x *= sx` runs here; single precision as everything else)
    x = property(lambda s: s._v[0], _set(0))
    y = property(lambda s: s._v[1], _set(1))
    z = property(lambda s: s._v[2], _set(2))
    del _set

    def __add__(self, o):
        return Vector(a + b for a, b in zip(self._v, o))

    __radd__ = __add__

    def __sub__(self, o):
        return Vector(a - b for a, b in zip(self._v, o))

    def __rsub__(self, o):
        return Vector(b - a for a, b in zip(self._v, o))

    def __mul__(self, k):
        return Vector(a * k for a in self._v)

    __rmul__ = __mul__

    def __truediv__(self, k):
        return Vector(a / k for a in self._v)

    def __neg__(self):
        return Vector(-a for a in self._v)

    def dot(self, o):
        return _r(sum(a * b for a, b in zip(self._v, o)))

    def cross(self, o):
        a, b = self._v, list(o)
        return Vector((a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]))

    @property
    def length(self):
        return _r(math.sqrt(sum(a * a for a in self._v)))

    def lerp(self, o, t):   # (Blender's Vector.lerp: self + (o - self)·t; HANDS-2: cast_poly.py's sleeves use it)
        return Vector(a + (b - a) * t for a, b in zip(self._v, o))

    @property
    def length_squared(self):
        return _r(sum(a * a for a in self._v))

    def normalize(self):   # (in place, as Blender's)
        self._v = list(self.normalized()._v)

    def normalized(self):
        n = math.sqrt(sum(a * a for a in self._v))
        return Vector(a / n for a in self._v) if n > 0 else Vector(self._v)

    def __repr__(self):
        return 'Vector(%r)' % (tuple(self._v),)


class Matrix:
    """(imported by lbapoly.py, not used by the cast scripts' JSON path.) P123: a small 4x4 for twinsen_poly.py's arm
    spread (Translation, Rotation about Z, @, +, * by a number, inverted, a 3-vector as a point). Single precision per
    element as Vector; the inverse is Gauss-Jordan, not Blender's, so a nobpy Twinsen can differ in the last digit."""

    def __init__(self, rows=None):
        rows = rows if rows is not None else [[1.0 if i == j else 0.0 for j in range(4)] for i in range(4)]
        self._m = [[_r(float(c)) for c in r] for r in rows]

    @staticmethod
    def Identity(n=4):
        return Matrix([[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)])

    @staticmethod
    def Translation(v):
        m = Matrix.Identity(4)
        for i in range(3):
            m._m[i][3] = _r(v[i])
        return m

    @staticmethod
    def Rotation(a, n, axis):
        c, s = math.cos(a), math.sin(a)
        if axis != 'Z':
            raise NotImplementedError(axis)
        return Matrix([[c, -s, 0, 0], [s, c, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]])

    def __matmul__(self, o):
        if isinstance(o, Matrix):
            return Matrix([[sum(self._m[i][k] * o._m[k][j] for k in range(4)) for j in range(4)] for i in range(4)])
        v = list(o)
        if len(v) == 3:
            h = v + [1.0]
            out = [sum(self._m[i][k] * h[k] for k in range(4)) for i in range(4)]
            w = out[3] if out[3] != 0 else 1.0
            return Vector((out[0] / w, out[1] / w, out[2] / w)) if abs(w - 1.0) > 1e-12 else Vector(out[:3])
        return Vector([sum(self._m[i][k] * v[k] for k in range(4)) for i in range(4)])

    def __add__(self, o):
        return Matrix([[a + b for a, b in zip(r, q)] for r, q in zip(self._m, o._m)])

    def __mul__(self, k):
        return Matrix([[a * k for a in r] for r in self._m])

    __rmul__ = __mul__

    def inverted(self):
        n = 4
        a = [list(r) + [1.0 if i == j else 0.0 for j in range(n)] for i, r in enumerate(self._m)]
        for c in range(n):
            piv = max(range(c, n), key=lambda r: abs(a[r][c]))
            if abs(a[piv][c]) < 1e-20:
                raise ValueError('matrix does not have an inverse')
            a[c], a[piv] = a[piv], a[c]
            pv = a[c][c]
            a[c] = [x / pv for x in a[c]]
            for r in range(n):
                if r != c and a[r][c] != 0.0:
                    f = a[r][c]
                    a[r] = [x - f * y for x, y in zip(a[r], a[c])]
        return Matrix([r[n:] for r in a])


class BVHTree:
    """P123: the part of mathutils.bvhtree twinsen_poly.py uses (FromPolygons, ray_cast) to lay the medallion's cord on
    the tunic, by brute force (a few thousand triangles, a few hundred rays). Polygons are fanned into triangles, as
    Blender's tree does; the nearest hit within `distance` and the hit triangle's normal are returned. Not bit-equal to
    Blender's single-precision tree: a nobpy rebuild of Twinsen can differ from a Blender one in the cord's last digits."""

    def __init__(self, tris):
        self._t = tris

    @classmethod
    def FromPolygons(cls, verts, polys, all_triangles=False, epsilon=0.0):
        vs = [tuple(v) for v in verts]
        tris = []
        for pi, f in enumerate(polys):
            for k in range(1, len(f) - 1):
                tris.append((vs[f[0]], vs[f[k]], vs[f[k + 1]], pi))
        return cls(tris)

    def ray_cast(self, origin, direction, distance=1.0e30):
        o = tuple(origin)
        d = Vector(direction).normalized()
        best = None
        for a, b, c, pi in self._t:
            e1 = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
            e2 = (c[0] - a[0], c[1] - a[1], c[2] - a[2])
            p = (d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0])
            det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2]
            if abs(det) < 1e-14:
                continue
            inv = 1.0 / det
            s = (o[0] - a[0], o[1] - a[1], o[2] - a[2])
            u = (s[0] * p[0] + s[1] * p[1] + s[2] * p[2]) * inv
            if u < 0.0 or u > 1.0:
                continue
            q = (s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0])
            v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) * inv
            if v < 0.0 or u + v > 1.0:
                continue
            t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv
            if t < 0.0 or t > distance:
                continue
            if best is None or t < best[0]:
                n = Vector(e1).cross(Vector(e2)).normalized()
                best = (t, n, pi)
        if best is None:
            return None, None, None, None
        t, n, pi = best
        return Vector(o) + d * t, n, pi, t


import sys as _sys
import types as _types
_bvh = _types.ModuleType('mathutils.bvhtree')
_bvh.BVHTree = BVHTree
_sys.modules['mathutils.bvhtree'] = _bvh
