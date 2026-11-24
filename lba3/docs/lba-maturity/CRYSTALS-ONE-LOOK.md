# CRYSTALS-ONE-LOOK — every crystal in the world drawn like the chapter 1 well cave's

The user (24.11): "make sure the crystals in the whole game look like the ones in the chapter 1 cave that we worked on".
Evidence label for everything here: **Automated runtime only (SwiftShader, headless Chromium)**; no person played it,
no GPU timing. Branch: the worktree branch named in the commit; base `39da582b` (P127 started).

## The reference (unchanged)

The well cave (WELL-POLISH): a faceted six-sided prism with a pointed cap (four shapes), flat-shaded; a translucent lit
shell (`MeshStandardMaterial`, opacity 0.72, no depth write) over an opaque unlit core (`MeshBasicMaterial`) at half the
radius and 0.84 of the height — the "inner glow". Cyan `#7fe0ff`/`#1096d0` (core `#7ff0ff`) and violet
`#c8a0ff`/`#6a2ad8` (core `#b78aff`); asleep `#6f8696`/`#0e3c52` (core `#2f7f98`). The cave's code was moved
unchanged to **`src/game/crystallook.js`** (`crystalGeo`, `crystalShell`, `crystalCore`, `growCrystal`,
`crystalCluster`); `interiors.js buildWell` imports it, so the cave draws the same (before/after pictures 01–03:
the same code; what differs between the two frames is timed — the glints, a prompt — not the crystals).

New in the module, for the other places:
- `CRYSTAL_TINTS` + `crystalMats(tint, {rockSet})` — the shared palette: ONE shell material per tint and ONE core
  material for every tint (the core's colour is in its vertices), made once and shared by every area. In a merged Kit
  a place's crystals cost (tints + 1) draws, the core adding one.
- `addCrystal(k, mats, x, y, z, ry, {rx, rz, sx, sy, sz}, v)` — a crystal with a Kit's full transform (the
  underground's clusters keep their exact transforms and random draws).
- `gemGeo(v, hs, rr)` / `crystalGem(shell, core, {v, hs, rr})` / `coreOfGem` — the prism centred where an octahedron
  "gem" stood (same place, same height), for single crystals and small batches.
- `linkedCore(shell)` + `asShell(mat)` — for a crystal the game animates (wakes, warms, pulses): the existing material
  becomes the well's glassy translucent shell, and its core reads the shell's colour and glow just before it is drawn
  (a material `onBeforeRender`, no updater, no per-frame work when not drawn). Every existing `setLit`/`wake`/pulse
  keeps working on `mesh.material` as before.
- `rockSet` is kept on every crystal that grows out of rock (the underground's shells AND their core), so
  rocksettle.js `rocksOutOfBuilt` treats them as before.

## Audit — every crystal drawn in the game

| # | File · function | What it was | Now |
|---|---|---|---|
| 1 | interiors.js · buildWell (`crystalCluster`, nodes, barrier, vein) | the reference | unchanged (code moved to crystallook.js) |
| 2 | story/opening.js · shot 10 "under the well" | the well cave's own crystals | unchanged (same room) |
| 3 | underground.js · `crystals()` — the caves under the island: the shaft's cracks, the installation's rock seams, the galleries' debris, stepping stones, giant forest and wall clusters, the round chamber's cracks, the deepest hall's centre | smooth 6-sided lathe prism, one opaque-ish material per colour (`#aef6ff` em 0.9, `#e0c0ff`, dull `#7a8aa8`) | the well's prism, shell + core, cyan / violet / asleep palette; same counts, positions, sizes, random draws; `rockSet` on shell and core |
| 4 | underground.js · `herCrystal` (two story moments in the caves under the island) | lathe prisms, violet | shell + core, violet |
| 5 | underground.js · the round chamber's old crystal lamps | lathe prisms, `#cfe8ff` em 1.4 | shell + core, **pale** tint (a lamp's colder, brighter white: kept, it is a lamp) |
| 6 | underground.js · the galleries' three pillars (body + heart) | lathe prisms + an octahedron heart, opaque | the well's prism shapes, **kept opaque** (REV-UNDER: a see-through pillar covered Twinsen's silhouette), the heart a faceted prism |
| 7 | desert.js · the dig's warm crust on three discs + the warm crack | octahedra, `#cfefff` | shell + core, cyan (the same batch, +1 draw for the core) |
| 8 | desertdress.js · `sampleTray` (Ilka's samples) | octahedra | shell + core, cyan |
| 9 | story/kit2b.js · Ilka's niche (the crust, the sleeping crystal) and the galleries' crystal wheel | octahedra | crust: cyan shell + core; sleeper: its own shell + a core that wakes with it; wheel: violet |
| 10 | story/depth.js · a sorting puzzle's stones (Zeelich) | blue octahedra (`#7ab8e8`), white crust bits | cyan shell + core; the crust bits the same prism, opaque white (they are the sort's clue) |
| 11 | story/prologue.js · the warm stones in the bay | pulsing octahedra | the prism, glassy shell + a core that pulses with it |
| 12 | story/hometap.js · the growth on the well's pillar, the scale on the coupling | octahedra | growth: shell + linked core; scale: the prism, opaque |
| 13 | obsroom.js · the crystal in the observatory shrine | octahedron | the prism, shell + a core that wakes with the beams |
| 14 | desertold.js · the pupils' study crystal | octahedron | shell + a core that wakes with the note |
| 15 | hamrooms.js · the blue stone on the monastery altar | octahedron | shell + linked core |
| 16 | hamalayi.js · the heat post's crystal | octahedron, brown/orange | the prism, **warm** tint (the Joint Project's heat crystals: the story's warm crystals) + a core that warms with it |
| 17 | town.js · Citadel's heat posts | octahedra, brown/orange | the prism, warm tint, shell + linked core |
| 18 | zeelife.js · Zeelich's lamp posts | octahedra (lit: orange glass; unlit: brown) | lit: warm shell + core; unlit: the prism, dull |
| 19 | asylumhostel.js · the open ZEELICH crate | 5-sided lathe crystals in the lamp material | shell + core, warm tint |
| 20 | bonuslook.js / actors.js · the singing crystal pickup (Citadel ×5, the mill) | three octahedron spikes, one bright opaque material | three of the well's prisms, cyan shell (emissive 1.0 instead of the cave's 0.4: a pickup must read from the far camera) + core |
| 21 | actors.js · the golden shard pickup | gold octahedron | the prism, **gold** tint kept (the story's golden light) + core |
| 22 | itemlook.js · item icons: the kettle crystals, the warm stone, the crystal cell | octahedra | the prism with a glassy shell and a core (the core shows at icon size as a lighter centre line) |
| — | actors.js · crystal mites; enemies.js · crystal mite / crawler | creatures' spikes | **left**: part of an enemy's body and its wind-up flare (combat readability); enemies are another worker's |
| — | underground.js · the machines' receivers (the caves under the island) | orange octahedra on machines | **left**: machine parts showing a state colour, not crystals growing |
| — | props.js · the planet model's cracked shell | icosphere | **left**: a model's glass shell, not a crystal |
| — | tools.js · the singing fork's bead | 17 mm octahedron | **left**: equipment (weapons/tools are another worker's) |
| — | story/finale-fx.js · shards | additive octahedra | **left**: a light effect |
| — | inventory.js · 2-D crystal icon / SVG | flat drawing | **left**: HUD/UI (another worker's area) |
| — | story/relays.js, depth.js "H-5 crusted pocket" | — | **not on this branch** (wave 2): when it lands it should use `crystalMats` + `addCrystal` |
| — | tralucave.js, celtemple.js, zeelich.js, hamalayi props, kit.js, regions.js, glowSprite | no crystal drawn (globes, gem-mine mouth without gems) | — |

## Draw calls (one frame, the same viewpoint, main pass + shadow pass)

Counted by `tests/lib/crystal-shots.mjs` (every `renderBufferDirect` of one frame after 1.5 s settled; "crystal" = the
draws whose material is one of crystallook.js's). A count, not a timing. Before = base `39da582b`, after = this branch.

| Place (shot) | before main / shadow | after main / shadow | after: crystal draws |
|---|---|---|---|
| **Crystal galleries, play camera (06)** | 91 / 37 | **94 / 37** | 20 |
| **Crystal galleries, giant crystals (07)** | 69 / 37 | **67 / 37** | 10 |
| **Desert Island dig, the crusted discs (13)** | 83 / 88 | **80 / 87** | 6 |
| Well cave, spawn (01) — unchanged code | 103 / 44 | 104 / 44 | 16 (the cave's own) |
| Well cave, the film's shot (03) | 41 / 43 | 41 / 43 | 5 |
| Bottom of the shaft (04) | 108 / 54 | 109 / 54 | 4 |
| The deep installation (05) | 99 / 59 | 99 / 59 | 0 (no crystal in view) |
| The round chamber (08) | 41 / 9 | 42 / 9 | 4 |
| An old crystal lamp, close (16) | 94 / 8 | 100 / 8 | 14 |
| The deepest hall (09) | 124 / 27 | 125 / 27 | 3 |
| Citadel, a singing crystal (10) | 78 / 37 | 80 / 38 | 4 |
| Citadel, the singing crystal close (11) | 202 / 33 | 206 / 34 | 8 |
| Citadel bay, the warm stones (12) | 53 / 21 | 56 / 22 | 6 |
| The observatory shrine (14) | 36 / 22 | 37 / 21 | 2 |
| The dig's warm crack, close (15) | 263 / 105 | 266 / 105 | 6 |

Why: a merged Kit's crystals cost one draw per tint plus ONE for the shared core (the core is vertex-coloured, so cyan,
violet and asleep cores are one material): +1 per Kit with crystals. Single crystals that move or wake on their own
(a pickup, the shrine's crystal, the study crystal, a held sorting stone) are two meshes now (shell + core): +1 each.
Two places that were separate meshes are merged now (Ilka's crust in the dig: 7 meshes → 2; the galleries' crystal
wheel: 6 → 2), which is why the galleries' giant view and the dig are lower than before. The well's +1 at its spawn
is not a crystal draw (its crystal draws are its own 16, the same code); not traced further. No new light, shader or
texture: the shell is the standard lit material, the core an unlit basic one (one more program at most).

## Pictures (before / after, the play camera unless marked fixed)

`captures/crystals-one-look/sheet-1.jpg` (01–09) and `sheet-2.jpg` (10–17), and one `NN-place.jpg` per place:
01 well spawn, 02 well clusters, 03 the opening film's under-the-well shot, 04 the shaft, 05 the deep installation (no
crystal in view: unchanged), 06 the crystal galleries, 07 the galleries' giant crystals, 08 the round chamber, 09 the
deepest hall, 10–11 a singing crystal on Citadel (play camera, close), 12 the bay's warm stones, 13 the dig's crusted
discs, 14 the observatory shrine, 15 the dig's warm crack, 16 an old crystal lamp, 17 the item icons. Taken by
`tests/lib/crystal-shots.mjs` (SERVE=1; before = this branch's base `39da582b`, after = this branch), 1280×720.

## Tests (once each)

All **Automated runtime only (SwiftShader)**, SERVE=1, one browser at a time, each suite once on this branch. Two
results in doubt were run once more on the base (`39da582b`) to tell old from new.

| Suite | Result on this branch | On the base | Reading |
|---|---|---|---|
| `opening.mjs` | **PASS 50/50**, no page error | — | the film (the cut it plays) to the house; the cave shot's frame itself is pictured from its camera pose (03), the well's code unchanged |
| `prologue.mjs` | **PASS 29/29** | — | covers prologue.js (the warm stones taken) and hometap.js (the growth leans with the pump) |
| `depth-1.mjs` | 21 passed, **8 failed** | **the same 8 failed** | pre-existing (the sorting puzzle's rest-sort step, then the crystal counts it feeds); not this change |
| `equip2b.mjs` | stops at its first check (Zeelich's canal: `reading 'sign'`) | documented the same in ACTION-SOUND-2.md | pre-existing; its dig and galleries steps are not reached, so Ilka's crust/sleeper/wheel are checked only by the captures (built, no page error) |
| `overlap-sweep.mjs` ONLY=well,c3shaft,c3deep,c3gallery,c3sendell,c3core,desert,obsv,hamalayi,ham_hall,asylum,zeelich,citadel | 6/7 visual: **1 new open (e)** "decal on a part" at Citadel −70.61, 98.74 | Citadel: (e) 0 open | the bay's warm stones: their shell is see-through now (no depth write) and the sweep took it for a decal. Fixed in the sweep (`tests/lib/sweep.js`: a crystal's see-through shell is skipped; its opaque core stays a part). Citadel re-run on this branch: **PASS**, the same counts as the base (a 0/2, c 0/19, d 0/217, e 0/9, g 0/1) |
| `tests/lib/crystal-shots.mjs` (captures) | 16 places + the icons drawn, no page error | the same | — |

No save change (format 6 untouched: only meshes and materials changed); old saves load as before (depth-1's old-save
check passes).

## Left / for the user

- **Visible world changes for the user's pick (P107)**: every row 3–22 of the audit changes how a crystal looks. The
  most visible: the caves under the island (the crystals turn from bright, nearly opaque prisms into the well's glassy
  shells with a glowing core: a little darker overall, as the well), the galleries' pillar hearts (a pale prism now),
  the singing crystals on Citadel and the mill (three prisms instead of three diamonds), the warm stones in the bay, the
  observatory shrine, the item icons, and the heat posts' caps on every Citadel street and Zeelich's lamp posts (small
  warm prisms). Nothing moved: sizes, positions, counts, colliders and the random draws are as they were.
- Kept tints (story): warm (the Joint Project's heat crystals: heat posts, Zeelich's lamp posts, the ZEELICH crate),
  gold (the golden shard), pale (the old crystal lamps). The pillars' bodies stay opaque (REV-UNDER, Twinsen's
  silhouette); a pickup's shell glows a little more than the cave's (readability from the far camera).
- Not changed (by reason, in the audit's "left" rows): enemy crystals (mites, crawler), machine receivers, the planet
  model's shell, the fork's bead, the finale's light shards, the 2-D inventory icon (HUD).
- Not pictured: the story-built crystals (Ilka's niche and the galleries' wheel, the sorting stones, the growth on the
  well's pillar, the two story moments' crystals, the study crystal, the altar stone, the ZEELICH crate) — built and
  run by the suites below (equip2b, depth-1, prologue), source-reviewed, not looked at in a picture.
- The well's "+1" draw at its spawn (not a crystal draw) is not traced.
- No GPU timing was measured (SwiftShader); the counts above are the evidence. Hardware: untested.

## סיכום בעברית

- המשתמש ביקש שכל הגבישים במשחק ייראו כמו הגבישים במערת הבאר של פרק 1. הגבישים של הבאר (מנסרה משושה עם קצה מחודד,
  מעטפת שקופה ומעליה ליבה זוהרת) הועברו לקובץ משותף אחד, `src/game/crystallook.js`, והמערה עצמה לא השתנתה.
- כל מקום אחר שמצייר גביש בעולם משתמש בו עכשיו: המערות שמתחת לאי, החפירה במדבר, האבנים החמות במפרץ, עמודי החום
  ברחובות, הגבישים המזמרים שאפשר לאסוף, האייקונים של החפצים ועוד מקומות (הרשימה המלאה בטבלה למעלה).
- הפלטה של הבאר (טורקיז, סגול, "רדום"); גוון משלו נשאר רק כשהסיפור צריך: חם (גבישי החום של הפרויקט), זהב (הרסיס
  הזהוב), לבן-קר (מנורות הגביש הישנות).
- שום דבר לא זז: גדלים, מקומות, כמויות והתנגשויות כמו קודם.
- קריאות ציור (ספירה, לא זמן): בגלריות 91→94, במבט על הגבישים הענקיים 69→67, בחפירה במדבר 83→80.
- תמונות לפני/אחרי: `captures/crystals-one-look/sheet-1.jpg`, `sheet-2.jpg`. זה שינוי חזותי שמחכה לבחירת המשתמש.
- כל הבדיקות: אוטומטיות בלבד (SwiftShader), אף אחד לא שיחק.
