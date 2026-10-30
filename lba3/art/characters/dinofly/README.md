The Dino-Fly's in-game model is the low-poly mesh built by tools/blender/dinofly_poly.py (Blender as a Python module,
`pip install bpy`), exported to assets/poly/dinofly.json; the editable Blender file (armature, vertex groups, one
object per part) is dinofly_poly.blend here. Rebuild both:

    python tools/blender/dinofly_poly.py assets/poly/dinofly.json art/characters/dinofly/dinofly_poly.blend

It is our own model, built from measured numbers of LBA2's Dino-Fly (proportions, sections, colour layout; see
docs/character-review.md, "The Dino-Fly"). No original mesh, palette, texture or file is in this folder or the repository.

Skeleton (its own, not the cast's): root → body (hips) → tail0..2, neck0..2 → head (two eye meshes on it),
thigh/shin/foot L/R, wing0/1/2 L/R (shoulder, elbow, wrist), and mem0/1/2 L/R (CH-DF-FIX): one per wing bone, its
child, hinged on the membrane's fold line at 45% of the chord; they carry the back half of the membrane (fold line
to the scalloped trailing edge) so the folded wing can pleat. In the bind pose and the stretch they are straight
(the membrane one flat sheet, as before). The bind pose is the original's rest layout (standing, wings spread
flat); src/game/dinofly.js poses the bones (nap, gaze, wing stretch, eyelids) with XZY Euler angles.

CH-DF-FIX mesh changes: the leg tubes' ends domed (no flat cylinder ends), the muzzle closed over three sections and
a domed tip (no flat cap), a section added at the neck root and its normals smoothed to 75° (no facet crease), the
trailing edge scalloped (two sagging points between each pair of edge points), the leading-edge bones a little
thicker. 1,164 → 1,240 triangles; bind pose and proportions unchanged.
