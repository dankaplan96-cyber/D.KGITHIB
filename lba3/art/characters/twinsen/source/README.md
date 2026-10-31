Twinsen's in-game model is the low-poly mesh built by tools/blender/twinsen_poly.py (Blender as a Python module,
`pip install bpy`), exported to assets/poly/twinsen.json; the editable Blender file (armature, vertex groups) is
../twinsen_poly.blend. Rebuild both:

    python tools/blender/twinsen_poly.py art/characters/skeletons.json assets/poly art/characters/twinsen/twinsen_poly.blend

The skeleton is the game's own (art/characters/skeletons.json, dumped by tools/dump-skeletons.mjs), so every
animation in src/engine/rig.js drives the mesh unchanged.

The older sculpted version (`LOOKS.twinsenSculpt` in src/game/characters.js, the `bell` primitive in
src/engine/sculpt.js) remains as a fallback and for comparisons.

The hair (VP-1b) follows the original: no hair on the skull's polygons. It is one dark mass over the original's
three hair balls (crown on `head`, the tuft on `tail0..2`), flat-shaded through down-facing normals so the game's
ramp material gives the original's single unlit shade. Measurements and evidence: docs/character-review.md §14.
