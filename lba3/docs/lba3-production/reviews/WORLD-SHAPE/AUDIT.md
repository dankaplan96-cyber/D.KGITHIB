# WORLD-SHAPE audit: our regions against the original islands

The user: "The map still doesn't look like the original game (LBA2) in structure and size." Earlier: not too boxy,
like LBA2's world, everything connected.

Measured from the user's own LBA2 files (CITADEL.ILE, DESERT.ILE, the Zeelich .ILE files, SCENE.HQR) and, for the
Hamalayi, LBA1 (LBA_GRI.HQR, SCENE.HQR), against our regions dumped from the running game (`terrain.heightAt` on a
1 m grid, `physics.groundAt` for the solid tops, the houses, doors and story spots). Only numbers are kept here; the
overlay images are in the session scratchpad (`worldshape/`, listed at the end) and are not committed.

## Scale

- Unit: 1 LBA2 unit = 2.07 / 1238 m = 1.672 mm (Twinsen's 1238-unit model height = 2.07 m). A section (32768
  units) = 54.8 m; a height-grid cell (512 units) = 0.856 m.
- Checks at that scale: the original's street lamp is 4.25 m tall, a bench 2.61 m long, the bollard rail 0.90 m
  high, the picket fence 1.58 m, a house door zone 1.7 m wide, Twinsen's house 8.9 × 3.7 m + 4.7 × 3.7 m; its walk
  (0.93 H/s) is 1.93 m/s, a brisk human walk. All plausible, so the scale holds.
- Our Twinsen measures 2.11 m (mesh bounds, hair included): the same scale. Our walk was 2.4 m/s and the athletic
  run 5.4 m/s against the original's 1.93 and 4.75 (every crossing 20 % / 12 % quicker, every place feeling
  smaller); CTRL-1 (0.31.0) set them to 2.0 and 4.96 m/s, so the same distance now takes the original's time.

## Ranked gaps (before this pass)

| # | Region | Gap | Measure | Status |
|---|---|---|---|---|
| 1 | Desert Island | Our island was an invented round blob: wrong outline, too small, no inlets, lagoon, round hill or south-east arm; boxy rounded-rectangle mesas up to 20 m where the original tops out at 11.4 m | land IoU 0.52 in the frame now used (0.60 at the best of every 90° turn and shift); area 24,399 m² vs 34,394 (71 %); 187 × 176 m vs 217 × 264 m | **Fixed** (this pass) |
| 2 | The Hamalayi | A square box: the wall of peaks a 200 m square, the terraces cut along straight lines (z = 31, z = −26, x = 0, x = 46), a ruler-straight gorge | 93 % of all cliff edge axis-aligned (a natural outline ≈ 11 %; the original Citadel 47 %, the original Desert 28 %) | **Fixed** (organic edges; levels kept) |
| 3 | Walking speed | Every crossing 20 % shorter in time than LBA2's | 1.93 vs 2.4 m/s | **Fixed** by CTRL-1 (2.0 m/s) |
| 4 | Citadel terraces | Our four steps are uniform 2.9 m; the original's shelves stand 3.8 / 7.3 / 11.1 / 13.6 m above the town (ours 2.8 / 5.8 / 8.7 / 11.6): the plateau 2 m low, the second step 1.5 m low | plateau-top (> 12.5 m) IoU 0.21; height error on common land 1.45 m (mean) | **Fixed** (CITADEL-TERRACES, below): the shelves at 3.76 / 7.31 / 11.08 / 13.58 m, a ramp up to the first stone; the two tests that failed in block 3 pass |
| 5 | Citadel harbour | A rectangular basin cut from x −400 into the quay (world.js `BAY`), a square quay, the square fort pad and depot yard | 1,147 m² of land the original doesn't have (mostly the quay and the coast's 1–2 m fringe) | סגור (HARBOUR-CUT): basin an ellipse 14 × 9 m semi-axes at (−121, 44), quay corners rounded 2 m (below) |
| 6 | Zeelich terminal island | Ours (no original counterpart): 124 × 79 m, 5,353 m² | — | Leave (story place) |

The Zeelich islands made from the original's grids are faithful (table below); Citadel's coast and buildings are
already the original's (IoU 0.92, most houses within 1 m).

## Citadel Island

The original map sits at (−76, +16) in our frame (world.js `LAYOUT`).

| | Original (CITADEL.ILE, 4 × 4 sections) | Ours (before → now where it changed) |
|---|---|---|
| Land (h > 0) | 16,662 m²; x −180…16, z −93…125 | 17,504 m² in the same frame (17,527 in all); x −180…17, z −94…125 |
| Coast | — | IoU **0.918** (no better shift exists); original-only 305 m² (the sand bay joining the south-west islet: ours sinks below the sea there, (−83…−68, 86…103)); ours-only 1,147 m² (the harbour quay x −120…−107, z 34…54, and a 1–2 m fringe) |
| Terrace shelves above the town (median of each traced band) | 3.76 / 7.31 / 11.08 / 13.58 m | 2.84 / 6.06 / 10.89 / 11.59 m by the same band medians (the 6.06 and 10.89 carry the west islet's raised top and the ramps) → **3.71 / 7.68 / 10.89 / 13.57 m** with CITADEL-TERRACES (the shelves themselves 3.76 / 7.31 / 11.08 / 13.58; the third band's median is the west islet, kept at its 13.2 m top) |
| Terrace masks (IoU at the original's thresholds, ours scaled to its top) | — | 0.88 / 0.86 / 0.74 / **0.21** (the plateau top: 3,423 m² above 12.5 m in the original, 1,283 in ours; with the plan 0.88 / 0.87 / 0.82 / 0.71) |
| Cliff share (slope > 1.1) | 19.7 % | 17.2 % (plan: 18.9 %) |
| Height error on common land (mean, above each town) | — | 1.45 m (plan: 1.11 m) |
| Axis-aligned cliff edge | 47 % (the original's own quays and cut terraces) | 19 % |
| Houses (original large objects → ours) | Twinsen's (−50.4, 80.1), the neighbour (−33.4, 75.3), the south house (−48.2, 24.1), the water office (−68.3, 11.3), the stone house (−31.3, −24.8), baggage claim (−84.2, 25.6) and its wing (−101.2, 25.8), the museum (−71.0, 41.0) | the same at 0.2–1.5 m; Bug Street house 5.2 m off the original's pair (−61.4, −14.0)/(−62.3, −7.9); the shop (−30, 0.5) is ours; the original's harbour building (−115.6, 54.7, 10 × 7 m) has no counterpart (our quay is there); the lighthouse, Bersimon's tent and the dome on the dome islet are built by island.js / wizards.js, not in the house list |
| Doors | S0 Twinsen (−45.6, 79.9), S21 Bersimon (−101.2, −67.4), S2 the plateau (−80.7, −73.0), S26 the dome islet, S3, S7, S8, S9, S14, S15, S17, S22, S5, S37 in the town | ours: house (−46.1, 77.2), wtent (−96.3, −71), asylum (−9.5, −65, ours); the rest are town.js house doors at the original's places |

Paths: the original has no path layer in its height grid; its routes are the walkable slopes and stair objects. Ours
(world.js `PATHS`) follow the same corridors: the walking distances below match within 3 % except the climb to the
plateau, which our ramp makes 19 m shorter.

Walking (8-neighbour shortest path on the height grid, slopes ≤ 1.1, our solid tops blocking; the original at
1.93 m/s; ours at 2.4 m/s before CTRL-1 and 2.0 m/s now):

| From → to | Original m / s | Ours before m / s | Ours now m / s |
|---|---|---|---|
| square → Twinsen's door | 84 / 44 | 84 / 35 | 84 / 42 |
| square → harbour (pier's west end) | 92 / 48 | 92 / 38 | 92 / 46 |
| square → lighthouse | 143 / 74 | 150 / 62 | 150 / 75 |
| square → Bersimon's tent | 110 / 57 | 91 / 38 | 91 / 46 |
| square → baggage claim | 62 / 32 | 62 / 26 | 62 / 31 |
| Twinsen's door → lighthouse | 69 / 36 | 75 / 31 | 75 / 37 |
| Twinsen's door → harbour | 85 / 44 | 85 / 35 | 85 / 43 |
| harbour → lighthouse | 127 / 66 | 127 / 53 | 127 / 64 |
| square → the plateau door (S2) | not on the slope graph: the original climbs by stair objects | 84 / 35 | 84 / 42 |

## Desert Island

| | Original (DESERT.ILE, 4 × 5 sections) | Ours before | Ours now |
|---|---|---|---|
| Land | 34,394 m², 217 × 264 m | 24,399 m², 187 × 176 m, a round blob (radius ≈ 90 m) | 33,057 m², 263 × 214 m (the original's long axis runs east–west in our frame) |
| Outline | inlets from the north, a lagoon, a round hill ringed by water, a south-east arm and islet, a south-west plateau | — | the original's, turned 275° and shifted (−4, −40) (`DESERT_FIT`): IoU **0.927** in that frame (before: 0.519; original-only 1,953 m² where our places pushed the coast out or the beach runs under the waterline, ours-only 600 m²) |
| Heights | shelves 0.5 / 1.5 / 3 / 4.5 / 5.5 / 7 m, top 11.4 m | plain 5 m, invented mesas to 20 m | plain 5 m (our places), the original's high ground rising from 8 m beyond our places (its height above 4 m × 1.25), its low ground rolling ± 1 m; two mesas kept (the camp's, the School of Magic's), rounded |
| Cliff share | 12.4 % | 7.3 % | 11.6 % |
| Axis-aligned cliff edge | 28 % | 36 % | 33 % |
| Walking reach (95th percentile from the middle) | 146 m | 108 m | 135 m |
| Soft-lock cells (can drop in, can't walk out; slope 1.1 on the terrain grid) | — | 8 m² | 2 single 1 m points at the waterline (a flood fill lifts every pit into a ramp, as on Citadel: 865 points lifted) |

Where the original's places fall in our frame: its village door cluster (scenes 35, 36, 38, 39) lands at
(−64…−43, −21…−4), 10–20 m from our Kesh (−50, 2); its door 40 at (−39, −38) by our glider field; its northern
settlement (doors 24, 29) at (46…53, −119) and doors 10/127 at (50, −83/−67) are empty high ground in ours; door 113
(−115, −99) is the north-west plateau; 183 is on the islet. Our places, tracks and story spots did not move:
walking pier → village 39 m, pier → dig 162 m, village → camp 65 m, village → post gate 82 m, village → School 43 m,
the same before and after.

## The Hamalayi

LBA2 has no Hamalayi island (its .ILE files are Citadel, Desert, the Emerald Moon and Zeelich's). The Hamalayi
Mountains are LBA1's: island 5, exterior scenes 9, 62, 63, 65, 69, 71, 72 and 82, each a 64 × 64-cell grid
(55 m square), of which 105–3,078 m² is ground (≈ 12,200 m² in all); the scenes chain as narrow ledges and
platforms; heights in 0.43 m layers with shelves at 0.9–1.7, 3.5–5.2, 6.9–7.8 and 10.4 m.

| | LBA1 Hamalayi | Ours before | Ours now |
|---|---|---|---|
| Extent | 8 scenes ≈ 55 m each, chained | one 230 m patch, a 200 m square of peaks | the same patch, a rounded ring of peaks with bays and spurs |
| Walkable ground | ≈ 12,200 m² | 41,800 m² | 39,300 m² |
| Levels | 0.9–10.4 m within a scene | 3 / 12 / 16 / 22 / 30 m | unchanged (the lift, the ledge, the ridge and the descent depend on them) |
| Axis-aligned cliff edge | — | 93 % | 38 % |
| Terrace edges | — | straight lines z = 31, z = −26, x = 0, x = 46; a straight gorge | wandering (± 1.3–3.5 m), held straight only at the lift (x 24 ± 6) and the tree bridge (x −6 ± 6), and along the ledge's wall; the gorge bends ± 3 m away from the bridge |

Our Hamalayi is 3× the LBA1 ground and its levels three times as tall; its story (the lift two levels up, the ridge
to the observatory) needs that height. Not changed beyond the outlines.

## Zeelich's islands (from the original grids)

| Island | Original land m² | Ours m² | IoU | Height error (mean) |
|---|---|---|---|---|
| Otringal | 14,079 | 15,055 | 0.935 | 0.40 m |
| Knartas | 4,981 | 5,390 | 0.923 | 0.19 m |
| Mosquibee | 5,328 | 5,755 | 0.924 | 0.56 m |
| Celebration | 1,778 | 1,930 | 0.921 | 0.31 m |
| Under Celebration | 7,411 | 7,749 | 0.954 | 0.34 m |
| CX islet | 1,291 | 1,399 | 0.921 | 0.33 m |
| The Platform | 5,939 | 6,629 | 0.890 | 0.35 m |
| The Lift Dock | 252 (ground 0.1 m) | 0 (its decks are the ground, by design) | — | — |

The 6–12 % extra is the shore ring the half-resolution grid adds. No change needed.

## Changed in this pass

- `src/game/desert.js`: the coast and the high ground from the original (`desert-layout.js`, `DESERT_FIT`); a
  coast distance field (2 m grid) replaces the radius test everywhere (ground, rocks, shrubs, cacti); a long low
  beach (1 in 2.2) that steepens only by our places and where the ground behind is high (sea cliffs); the patch
  300 m / 300 segments (was 250 / 250; the points stay on whole metres, so the dig's walls and ADV-1's discs sample exactly as before — with 280 segments tests/chapter4.mjs's disc throws hit the cold discs) to hold the whole island; mesas rounded (superellipse 2.6, two wobbles) and
  the two that stood in the original's sea retired; the ground grid flood-filled for soft-locks.
- `src/game/desert-layout.js` (new, generated): the original DESERT ground as numbers (every 2nd height, 0.05 m
  steps, base64; 28 KB). `tools/lba2-islands.py --desert` writes it from the user's files.
- `src/game/hamalayi.js`: the outer wall a rounded ring with bays; the terrace edges and the gorge wander; held
  still at the lift, the bridge and the ledge; the corners no taller than before.

## Budget (renderer.info, Medium, 1366 × 768, SwiftShader in this container: counts, not a GPU benchmark)

Same spots and camera before (a9c1ec8, served from a copy) and after (this branch with 2d767be merged):

| Spot | Draw calls before → after | Triangles before → after |
|---|---|---|
| Citadel street (−42, 2) | 874 → 874 | 1,324,150 → 1,325,722 |
| Citadel harbour | 467 → 467 | 680,992 → 682,564 |
| Citadel plateau | 383 → 383 | 806,098 → 807,670 |
| Desert pier road | 388 → 382 | 281,827 → 285,135 |
| Desert, Kesh | 339 → 328 | 198,823 → 179,999 |
| Desert, Ilka's camp | 138 → 125 | 202,399 → 114,935 |
| Desert, the dig | 103 → 102 | 159,965 → 167,429 |
| Hamalayi landing | 207 → 202 | 602,233 → 605,713 |
| Hamalayi, Lhar | 220 → 216 | 414,711 → 411,985 |
| Hamalayi, monastery gate | 187 → 182 | 436,587 → 428,299 |

(The Citadel's +1,572 triangles come with the merged 2d767be; this pass does not touch Citadel.) The Desert's terrain grid
grew from 251² to 301² points (+28,000 triangles where the whole island is in view; measured above with the earlier 281²); the scatter on the new land
joins the existing instanced/batched meshes (no new draw calls). Region build time, this container under load
(other agents running): Desert 857 ms before, 540–1,411 ms after across runs (the coast grid, the flood fill; noisy); the Hamalayi
unchanged within noise.

## Citadel terraces: done (CITADEL-TERRACES)

Block 3 built the plan and reverted it (travel chapter 10's walk to Hesk and occluders (b) failed in two runs). Built
again from the same numbers, both pass (the two failures did not come back: travel's walk to Hesk at (−58, −60) arrives in
30 s of game time before and after; occluders (b) 36 of 36), and four other things the new heights broke were fixed:

- `citadel-layout.js` `SHELVES = [3.76, 7.31, 11.08, 13.58]`, `TOWN_Y = 2.3`, `CLIFFS_TOP` (18.78 = TOWN_Y + top shelf + 2.9);
  `world.js` `level(k)` and `terraces()` take the steps from them (3.76, 3.55, 3.77, 2.50 m, not four of 2.9),
  `POI.plateau.h` and island.js `POI_PLATEAU.h` are `CLIFFS_TOP`, `PIT_FILLS[0].h = level(4)`.
- The west islet's top stays at 13.2 m (`ISLET_TOP`; it was `LEVEL0 + 3 × 2.9 + 2.2`): left to follow level 3 it would have
  stood 2.4 m too high.
- The west street (PATHS[4]) goes on 3.4 m to the first stone's foot, and the ramps now come from PATHS, not
  PATHS_SCATTER (only the scatter keeps the old line): the first shelf is 3.76 m up and the street's end had been 2.1 m
  under it, the first stone out of a jump's reach (tests/jumpreach.mjs, the Whispering Cliffs: 0 of 14).
- The stepping stones: 14 now (the climb is 12.6 m, was 12.0), the sideways wobble counted from the top stone so the last
  two stones (and their rim nudges) stand as with 13 (with the old count the last hop was 3.4 m, a gap of 1.2 m, and
  failed). Stone tops 5.9 (1 m over the ramp's foot) … 18.9 m, 0.97–1.0 m a step.
- tests/stability.mjs D13: `leverGround < 15` → `< yard + 0.5` (the fort's yard floor is now 15.9 m).

Measured (tools/worldscore.mjs, game 0.33.0): Citadel 84.5 → 85.1 (height 76.6 → 80.0, objects 61.1 → 60.9 from the
scatter re-rolling on the new ground, coast and landmarks as before; MAE after the lift 1.06 → 0.91 m). Ground
above 12.5 m, lift taken out: 3,881 → 4,395 m² against the original's 3,688, IoU 0.72 → 0.77.

## Still open

**Citadel terraces — done (CITADEL-TERRACES)**: above.

**Citadel harbour — done (HARBOUR-CUT)**: world.js `BAY` is now an ellipse (semi-axes 14 × 9 m, centre (−121, 44), the quay
face 1 m east of it) that only digs (`min(h, −3.2)`: the old straight cut also lifted the sea floor to 3.2 m all the
way to the map's edge, a pale bar in the water); the quay's outline is a rounded box (`QUAY_R` = 2 m, island.js) that
world.js's ground, paving and drop use and island.js's wall (a quarter-ring section), coping, rail and colliders
follow. The pier, ferry, boats and cargo lift did not move. Plan as written:

**Citadel harbour** (world.js `BAY`, island.js harbour): replace the basin's `boxDist(x, z, -400, …)` with a
rounded basin (an ellipse 14 × 9 m at (−121, 44)) so the cut no longer runs straight to the map's edge; round the
quay's outer corners (2 m radius). The original has a pier here, not a basin: keep ours, soften its shape. Small
(the coast IoU is 0.92 with it).

**The Hamalayi's size**: 39,300 m² of walkable ground and 27 m of climb against LBA1's ≈ 12,200 m² of ledges in
eight 55 m scenes. Its chapters need the lift and the ridge; shrinking it is a story change, not a shape fix.

**Holomap**: MAP-1's map (src/game/mapdraw.js) frames each region by its terrain patch, so it shows Desert Island's
new outline (300 m patch) and the raised terraces by itself (tests/holomap.mjs below).

## Tests (sequential, SwiftShader, this container under load from other agents)

- r2 (Desert and Hamalayi changes, before 0.31.0): desert-life, chapters 1–10, wizards, travel, transitions, townlife,
  zislands, spaceport, opening, shipfiles: all passed.
- r3/r4 (with the Citadel terrace plan, on 0.31.0): prologue, chapters 1–10, wizards, arsenal, holomap, drawcalls,
  opening, desert-life, spaceport, zislands, shipfiles passed; stability passed once its D13 was made relative and
  the Desert pier's beach kept gentle; travel (chapter 10) and occluders (b) failed both runs → plan reverted;
  townlife's pump (REV-TY-3 N3), perfbudget's shader compiles and transitions' real-time fade failed in r3 (not
  terrain; townlife passed in r5 on a1ff730 with FIX-PUMP-N).
- r5–r7 (terraces reverted, merged a1ff730): stability, travel, occluders, townlife, desert-life passed; chapter4
  failed with the 280-segment Desert grid (ADV-1's disc throws; the same test passes on a1ff730 itself) and passed
  with 300 segments (r6); r7 on the final code: stability, chapter5, desert-life, travel all passed.

- CITADEL-TERRACES (on game 0.33.0, SwiftShader): travel, occluders, stability, worldfit, jumpreach, house, chapter1,
  chapter8, camclear, perfbudget and the playthrough segments 01–04 chained (KEEP/LOAD; the stones step 14 of 14): all VERDICT PASS.

## Evidence (session scratchpad, not committed)

`/tmp/claude-0/-home-user-geriatrics-course/a5ce8310-2ebe-5d1c-8bbd-0df4d308f0fe/scratchpad/worldshape/`:
`orig-citadel.png`, `orig-desert.png` (the original's height maps with objects and doors), `ours-*-before.png`,
`ours-*-d6.png` (ours, same scale, places marked), `citadel-mask-before.png` and `desert-mask-fit-final.png` (white
both, red original only, cyan ours only), `res-before.json`, `res-final.json`, `res-isles-before.json`,
`boxy.json`, `dwalk.json`; scripts `orig.py`, `dump.mjs`, `dump2.mjs`, `analyze.py`, `isles.py`, `dfit.py`,
`boxy.py`, `traps.py`, `dwalk.py`.
