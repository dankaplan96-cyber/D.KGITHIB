The Dino-Fly's in-game model is the low-poly mesh built by tools/blender/dinofly_poly.py (Blender as a Python module,
`pip install bpy`), exported to assets/poly/dinofly.json; the editable Blender file (armature, vertex groups, one
object per part) is dinofly_poly.blend here. Rebuild both:

    python tools/blender/dinofly_poly.py assets/poly/dinofly.json art/characters/dinofly/dinofly_poly.blend

It is our own model, built from measured numbers of LBA2's Dino-Fly (proportions, sections, colour layout; see
docs/character-review.md, "The Dino-Fly"). No original mesh, palette, texture or file is in this folder or the repository.

Skeleton (its own, not the cast's): root → body (hips) → tail0..2, neck0..2 → head (two eye meshes on it),
thigh/shin/foot L/R, wing0/1/2 L/R (shoulder, elbow, wrist). The bind pose is the original's rest layout (standing,
wings spread flat); src/game/dinofly.js poses the bones (nap, gaze, wing stretch, eyelids) with XZY Euler angles.
