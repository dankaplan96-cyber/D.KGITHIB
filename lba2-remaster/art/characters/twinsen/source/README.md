Twinsen's editable source is code: `LOOKS.twinsen` and `design()` in src/game/characters.js (outfit `tw`: body, tunic, bell sleeves,
head, hair, belt), the `bell` primitive in src/engine/sculpt.js, `handDef`/`shoeDef` (hands, rounded shoes), `addFace`/`addMedallion` (face parts, medallion).
Animation: src/engine/rig.js (poses per clip) + src/game/actors.js (Hero state machine).
There is no Blender in this environment; the mesh is generated at load (see export/README.md).
