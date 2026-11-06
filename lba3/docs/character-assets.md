# Character assets — origin and permissions

All character assets are created for this project in code. None were extracted from LBA1/LBA2 data files.
Twinsen, Zoe, Baldino and other LBA names/designs belong to their owners (Adeline / [2.21]); this is a
non-commercial fan project and the models are new reconstructions from viewing screenshots, not rips.

| Asset | Source | Permission | Status |
|---|---|---|---|
| Body meshes (all characters) | SDF sculpt from `LOOKS` + `design()` in src/game/characters.js, built at load by src/engine/sculpt.js | project code | Twinsen: final candidate; others in progress |
| Hands, shoes | `handDef` / `shoeDef` sculpts (characters.js) | project code | final candidate |
| Faces (eyes, lids, brows, mouth, glasses, goggles) | Three.js meshes built in `addFace` | project code | final candidate |
| Medallion + chain | `addMedallion` (characters.js) | project code | final |
| Skeleton + skin weights | `design()` bones + automatic weights (sculpt.js) | project code | final candidate |
| Animation clips | procedural poses + state machine (src/engine/rig.js, src/game/actors.js) | project code | in progress |
| Reference images | user-supplied LBA2 screenshots (PDF from magicball.net gallery) | reference only, not redistributed | — |
