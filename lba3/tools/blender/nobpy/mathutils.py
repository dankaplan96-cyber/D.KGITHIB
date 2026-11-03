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

    x = property(lambda s: s._v[0])
    y = property(lambda s: s._v[1])
    z = property(lambda s: s._v[2])

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

    def normalized(self):
        n = math.sqrt(sum(a * a for a in self._v))
        return Vector(a / n for a in self._v) if n > 0 else Vector(self._v)

    def __repr__(self):
        return 'Vector(%r)' % (tuple(self._v),)


class Matrix:   # (imported by lbapoly.py, not used by the cast scripts' JSON path)
    pass
