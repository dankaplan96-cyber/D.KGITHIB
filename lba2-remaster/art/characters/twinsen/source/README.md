Twinsen's editable source is code: `LOOKS.twinsen` and `design()` in src/game/characters.js (body, robe,
head, hair, belt), `handDef`/`shoeDef` (hands, slippers), `addFace`/`addMedallion` (face parts, medallion).
Animation: src/engine/rig.js (poses per clip) + src/game/actors.js (Hero state machine).
There is no Blender in this environment; the mesh is generated at load (see export/README.md).
