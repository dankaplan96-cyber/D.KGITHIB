# NOBPY: a stand-in for Blender's `bpy` (see mathutils.py here). The character scripts use bpy only to mirror what they
# export into a .blend for editing (an armature, a mesh per part, vertex groups, materials); the game's JSON is computed
# by lbapoly.py itself. Every bpy call here is accepted and does nothing, so no .blend is written.
class _Any:
    def __init__(self, *a, **k):
        pass

    def __getattr__(self, name):
        return _Any()

    def __setattr__(self, name, value):
        pass

    def __call__(self, *a, **k):
        return _Any()

    def __getitem__(self, k):
        return _Any()

    def __iter__(self):
        return iter(())


data = _Any()
context = _Any()
ops = _Any()
types = _Any()
app = _Any()
