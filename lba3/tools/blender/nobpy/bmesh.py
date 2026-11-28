# NOBPY (P123): twinsen_poly.py imports Blender's bmesh but the game's JSON path never calls it; this empty stand-in lets
#   PYTHONPATH=tools/blender/nobpy python3 tools/blender/twinsen_poly.py art/characters/skeletons.json assets/poly
# run without Blender (see bpy.py and mathutils.py here).
