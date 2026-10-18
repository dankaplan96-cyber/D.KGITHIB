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
- Our Twinsen measures 2.11 m (mesh bounds, hair included): the same scale. Our walk is 2.4 m/s and the athletic
  run 5.4 m/s (actors.js), against the original's 1.93 and 4.75: **ours crosses everything 20 % (walk) / 12 % (run)
  faster**, so every place feels smaller than the same distance in LBA2.

## Ranked gaps (before this pass)

| # | Region | Gap | Measure | Status |
|---|---|---|---|---|
| 1 | Desert Island | Our island was an invented round blob: wrong outline, too small, no inlets, lagoon, round hill or south-east arm; boxy rounded-rectangle mesas up to 20 m where the original tops out at 11.4 m | land IoU 0.52 in the frame now used (0.60 at the best of every 90° turn and shift); area 24,399 m² vs 34,394 (71 %); 187 × 176 m vs 217 × 264 m | **Fixed** (this pass) |
| 2 | The Hamalayi | A square box: the wall of peaks a 200 m square, the terraces cut along straight lines (z = 31, z = −26, x = 0, x = 46), a ruler-straight gorge | 93 % of all cliff edge axis-aligned (a natural outline ≈ 11 %; the original Citadel 47 %, the original Desert 28 %) | **Fixed** (organic edges; levels kept) |
| 3 | Walking speed | Every crossing 20 % shorter in time than LBA2's | 1.93 vs 2.4 m/s | Follow-up (CTRL-1 owns actors.js) |
| 4 | Citadel terraces | Our four steps are uniform 2.9 m; the original's shelves stand 3.8 / 7.3 / 11.1 / 13.6 m above the town (ours 2.8 / 5.8 / 8.7 / 11.6): the plateau 2 m low, the second step 1.5 m low | plateau-top (> 12.5 m) IoU 0.21; height error on common land 1.45 m (mean) | Follow-up plan below (world.js + island.js) |
| 5 | Citadel harbour | A rectangular basin cut from x −400 into the quay (world.js `BAY`), a square quay, the square fort pad and depot yard | 1,147 m² of land the original doesn't have (mostly the quay and the coast's 1–2 m fringe) | Follow-up plan below |
| 6 | Zeelich terminal island | Ours (no original counterpart): 124 × 79 m, 5,353 m² | — | Leave (story place) |

The Zeelich islands made from the original's grids are faithful (table below); Citadel's coast and buildings are
already the original's (IoU 0.92, most houses within 1 m).

## Citadel Island

The original map sits at (−76, +16) in our frame (world.js `LAYOUT`).

| | Original (CITADEL.ILE, 4 × 4 sections) | Ours |
|---|---|---|
| Land (h > 0) | 16,662 m²; x −180…16, z −93…125 | 17,504 m² in the same frame (17,527 in all); x −180…17, z −94…125 |
| Coast | — | IoU **0.918** (no better shift exists); original-only 305 m² (the sand bay joining the south-west islet: ours sinks below the sea there, (−83…−68, 86…103)); ours-only 1,147 m² (the harbour quay x −120…−107, z 34…54, and a 1–2 m fringe) |
| Terrace shelves above the town (median of each traced band) | 3.76 / 7.31 / 11.08 / 13.58 m | 2.84 / 5.77 / 8.69 / 11.59 m |
| Terrace masks (IoU at the original's thresholds, ours scaled to its top) | — | 0.88 / 0.86 / 0.74 / **0.21** (the plateau top: 3,423 m² above 12.5 m in the original, 1,283 in ours) |
| Cliff share (slope > 1.1) | 19.7 % | 17.2 % |
| Axis-aligned cliff edge | 47 % (the original's own quays and cut terraces) | 19 % |
| Houses (original large objects → ours) | Twinsen's (−50.4, 80.1), the neighbour (−33.4, 75.3), the south house (−48.2, 24.1), the water office (−68.3, 11.3), the stone house (−31.3, −24.8), baggage claim (−84.2, 25.6) and its wing (−101.2, 25.8), the museum (−71.0, 41.0) | the same at 0.2–1.5 m; Bug Street house 5.2 m off the original's pair (−61.4, −14.0)/(−62.3, −7.9); the shop (−30, 0.5) is ours; the original's harbour building (−115.6, 54.7, 10 × 7 m) has no counterpart (our quay is there); the lighthouse, Bersimon's tent and the dome on the dome islet are built by island.js / wizards.js, not in the house list |
| Doors | S0 Twinsen (−45.6, 79.9), S21 Bersimon (−101.2, −67.4), S2 the plateau (−80.7, −73.0), S26 the dome islet, S3, S7, S8, S9, S14, S15, S17, S22, S5, S37 in the town | ours: house (−46.1, 77.2), wtent (−96.3, −71), asylum (−9.5, −65, ours); the rest are town.js house doors at the original's places |

Paths: the original has no path layer in its height grid; its routes are the walkable slopes and stair objects. Ours
(world.js `PATHS`) follow the same corridors: the walking distances below match within 3 % except the climb to the
plateau, which our ramp makes 19 m shorter.

Walking (8-neighbour shortest path on the height grid, slopes ≤ 1.1, our solid tops blocking; the original at
1.93 m/s, ours at 2.4 m/s):

| From → to | Original m / s | Ours m / s |
|---|---|---|
| square → Twinsen's door | 84 / 44 | 84 / 35 |
| square → harbour (pier's west end) | 92 / 48 | 92 / 38 |
| square → lighthouse | 143 / 74 | 150 / 62 |
| square → Bersimon's tent | 110 / 57 | 91 / 38 |
| square → baggage claim | 62 / 32 | 62 / 26 |
| Twinsen's door → lighthouse | 69 / 36 | 75 / 31 |
| Twinsen's door → harbour | 85 / 44 | 85 / 35 |
| harbour → lighthouse | 127 / 66 | 127 / 53 |
| square → the plateau door (S2) | not on the slope graph: the original climbs by stair objects | 84 / 35 |

## Desert Island

| | Original (DESERT.ILE, 4 × 5 sections) | Ours before | Ours now |
|---|---|---|---|
| Land | 34,394 m², 217 × 264 m | 24,399 m², 187 × 176 m, a round blob (radius ≈ 90 m) | 33,146 m², 263 × 214 m (the original's long axis runs east–west in our frame) |
| Outline | inlets from the north, a lagoon, a round hill ringed by water, a south-east arm and islet, a south-west plateau | — | the original's, turned 275° and shifted (−4, −40) (`DESERT_FIT`): IoU **0.927** in that frame (before: 0.519; original-only 1,905 m² where our places pushed the coast out or the beach runs under the waterline, ours-only 641 m²) |
| Heights | shelves 0.5 / 1.5 / 3 / 4.5 / 5.5 / 7 m, top 11.4 m | plain 5 m, invented mesas to 20 m | plain 5 m (our places), the original's high ground rising from 8 m beyond our places (its height above 4 m × 1.25), its low ground rolling ± 1 m; two mesas kept (the camp's, the School of Magic's), rounded |
| Cliff share | 12.4 % | 7.3 % | 10.9 % |
| Axis-aligned cliff edge | 28 % | 36 % | 33 % |
| Walking reach (95th percentile from the middle) | 146 m | 108 m | 135 m |
| Soft-lock cells (can drop in, can't walk out) | — | 8 m² | 0 (a flood fill lifts every pit into a ramp, as on Citadel) |

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
  300 m / 280 segments (was 250 / 250) to hold the whole island; mesas rounded (superellipse 2.6, two wobbles) and
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
grew from 251² to 281² points (+16,000 triangles where the whole island is in view); the scatter on the new land
joins the existing instanced/batched meshes (no new draw calls). Region build time, this container under load
(other agents running): Desert 857 ms before, 1,411 ms after (the coast grid, the flood fill); the Hamalayi
unchanged within noise.

## Follow-up plans (files other tasks own now)

**Citadel terraces to the original's shelves** (citadel-layout.js, world.js and one line of island.js; after VP-10
merges — island.js line 54 `POI_PLATEAU = { h: 16.8 }` places chapter 1's cliff valve on the stack's top, so the
plateau cannot rise without it):
1. `citadel-layout.js`: add `export const SHELVES = [3.76, 7.31, 11.08, 13.58]` (heights above the town).
2. `world.js terraces()`: add `(SHELVES[k-1] - (SHELVES[k-2] ?? 0))` per level instead of `LEVEL_STEP`; `level(k)`
   → `LEVEL0 + (k ? SHELVES[k-1] : 0)`; the plateau rises from 13.9 to 15.9 m.
3. world.js `POI.plateau.h` 16.8 → 18.8 and island.js `POI_PLATEAU.h` 16.8 → 18.8 together (the Whispering Cliffs
   must stay 2.9 m above the plateau or the stepping stones are bypassed; the valve sits on the top);
   `PIT_FILLS[0].h` 13.9 → `level(4)`. The stepping stones (world.js) are spaced from `POI.plateau.h` and the
   ground: one more stone (n = ceil(rise / 1.05)); check by tests/chapter1.mjs and prologue.mjs.
4. Path ramps: the square → plateau ramp (`PATHS[0]`) climbs 2 m more over the same 55 m: grade 0.26 → 0.30; keep
   `RAMP` 0.26 and lengthen the path by one switchback west of (−37, −20), or accept 0.30.
5. Re-run fixTraps' count (world.trapFixes), chapter1/prologue/opening/townlife, the depot and fort tests.

**Citadel harbour** (world.js `BAY`, island.js harbour): replace the basin's `boxDist(x, z, -400, …)` with a
rounded basin (an ellipse 14 × 9 m at (−121, 44)) so the cut no longer runs straight to the map's edge; round the
quay's outer corners (2 m radius). The original has a pier here, not a basin: keep ours, soften its shape.

**Walking speed** (actors.js, CTRL-1): normal 2.4 → 2.0 m/s (LBA2 1.93), athletic 5.4 → 4.8 (4.75); the bench walk
and `transWalk` 2.2 → 2.0. This alone gives every island the original's size in time.

**Holomap** (hud.js, MAP-1): the region map samples the ground over `REGION_SIZE.desert` = 250 m round the region's
centre, which now crops the island (land x −127…136, z −139…75 local). Set `REGION_SIZE.desert = 290` and
`REGION_SHIFT.desert = [4, -32]` (the land's middle).

## Evidence (session scratchpad, not committed)

`/tmp/claude-0/-home-user-geriatrics-course/a5ce8310-2ebe-5d1c-8bbd-0df4d308f0fe/scratchpad/worldshape/`:
`orig-citadel.png`, `orig-desert.png` (the original's height maps with objects and doors), `ours-*-before.png`,
`ours-*-d6.png` (ours, same scale, places marked), `citadel-mask-before.png` and `desert-mask-fit-final.png` (white
both, red original only, cyan ours only), `res-before.json`, `res-final.json`, `res-isles-before.json`,
`boxy.json`, `dwalk.json`; scripts `orig.py`, `dump.mjs`, `dump2.mjs`, `analyze.py`, `isles.py`, `dfit.py`,
`boxy.py`, `traps.py`, `dwalk.py`.
