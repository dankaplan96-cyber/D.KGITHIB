# ASSET MANIFEST

No original LBA1/LBA2 game assets (models, textures, sprites, audio, text) are included or loaded.
The LBA2 engine source (GPL-2.0, github.com/2point21/lba2-classic) was **read** for behaviour and
numeric values (camera angles/distances, behaviours, ball rules); no source code was copied.
The original game's data files (art, models, animations, audio) are not open source and are not used.

| Asset | Source | Licence | Status |
|---|---|---|---|
| three.js r180 (vendor/three) | three.js project | MIT | final |
| Rubik font (Google Fonts, loaded at runtime) | Google Fonts | OFL | final |
| Character meshes (Twinsen, Zoe, Arthur, townsfolk…) | Generated in code: SDF sculpting (src/engine/sculpt.js, src/game/characters.js) | project code | final designs, re-designed after LBA2 references; meshes rebuilt each load |
| Character animation | Procedural pose animation (src/engine/rig.js) | project code | in progress |
| Buildings, props, street furniture | Generated in code (src/game/architecture.js, town.js) | project code | final for town; outer island in progress |
| Trees, bushes, rocks, grass, flowers | Generated in code (src/game/vegetation.js) | project code | final |
| Textures (grass, soil, paving, plaster, stone, brick, roof tiles, wood, sea, clouds) | Painted on canvas in code (src/engine/textures.js) | project code | final |
| Music and sound effects | Generated with WebAudio at runtime (src/engine/audio.js) | project code | music being extended |
| Story, dialogue (HE/EN) | Written for this project (src/game/i18n.js) | project | in progress |

Reference images supplied by the user (LBA2 screenshots/renders) are used only as visual reference and
are not shipped, except docs/docs-reference-compare.png which shows one beside an in-game frame for review.
