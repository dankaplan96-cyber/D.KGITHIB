# CITADEL-ORIG-2: the user's four "yes" answers after MAP-ORIG (16.11)

The user saw MAP-ORIG's LBA2-against-ours pairs (`MAP-ORIG.md`) and answered "excellent" to its four questions: the
sea, Twinsen's roof, the street grid past the square, the harbour. A fifth, small check: the Zeelich terminal's second
door.

**Labels.** Everything here is **Automated runtime only**: pictures taken by scripts and looked at, suites run headless.
Nobody played. No fps claim. The LBA2 side is lba2remake's rendering of the original data (`MAP-ORIG.md`, Method); its
pictures stay in `/dev/shm/cit2/` and are not committed.

**Method.** The same cameras on both sides (`tools/map-orig/gen.py`, `remake.mjs`, `ours.mjs`); ours before from a
snapshot of the base commit, after from this branch, both served from `/dev/shm`. Draw calls are renderer info for one
frame, all passes, the same camera.

## 1. The sea: LBA2's bright turquoise on every Twinsun island

- **Citadel** (`src/engine/environment.js`). Two changes, both needed:
  - the shader: on a clear day the painted sea texture now gives only its light and shade (its luminance) to the
    palette's colour. The blue texture times a blue palette had squared the blue into royal blue. The storm keeps the
    old product, so storms look as before.
  - the palette and the reflection: clear deep `#1a76b0` → `#00aee4`, shallow `#3fc8c6` → `#28cce0`, the sky's
    reflection `#bfe0ff` → turquoise `#a8e2f2` and at most 30 % instead of 60 % (a storm 60 % as before).
- **Desert Island** (`src/game/desert.js`, its own sea plane): a paler tint lit, and the same texture glowing turquoise
  (its own map as the emissive map: no new texture, no new draw).
- **The window views** (`src/game/windowviews.js`): the painted sea through the house windows in the same turquoise.
- Not changed: the Hamalayi has no sea; Zeelich's are cloud seas; the holomap's paper map keeps its drawn blues.

Mean sea colour seen from above (pixels with blue over red by 60+), the same camera:

| View | LBA2 | Ours before | Ours after |
|---|---|---|---|
| Citadel straight down (235 m frame) | (72, 167, 207) | (58, 100, 176) | **(90, 167, 206)** |
| Citadel oblique from the south-east | (73, 167, 207) | (68, 108, 178) | **(94, 168, 205)** |
| The harbour straight down | (72, 167, 208) | (58, 101, 174) | **(90, 166, 203)** |
| Desert Island straight down | — | (59, 108, 151) | **(95, 169, 204)** |

- Green and blue now match LBA2's within 1–4. Red stays about 18 higher: the frame's chroma grade (WA-13, 0.72, after
  tone mapping) lifts red to about 28 % of the luminance, so a red under ~88 at this brightness is out of reach without
  exempting the sea from the grade. Not done: it would be a second pass or a mask.
- The texture's crests and blotches still show (standard deviation 8–12 per channel, LBA2's 8–11): not a flat colour.
- Cost: one uniform more in the sea's shader (`uShade`, `uRefl`); no new texture, mesh, pass or draw.

## 2. Twinsen's house: LBA2's low plank hip

- `src/game/town.js` HOUSES `twinsen`: `roof: 'planks', hip: { pitch: 0.5, coping: '#6b4a2e' }` in place of the thatch
  gable. Ridge 3.36 + 0.5 × 3.7 = **5.2 m** (LBA2's 5.2 m; ours was 6.2 m), along the long front, as LBA2's.
- Kept: the door, the windows, the chimney (on the hip's slope), the rubble walls, the yard and its fence, the collider
  (walls), the roof's camera occluder (the hip's slab, stopping halfway down the end slopes: camcitadel), the interior (unchanged). Twinsen's bench, laundry and pots
  stand where they did.
- The opening film's frames that show the house (77 s, 80 s: Zoé leaving, the title over the house) were taken before
  and after: the roof reads as LBA2's.

## 3. The street grid past the square

`src/game/world.js` GRID_STREETS, TOWN_BLOCKS; `src/game/town.js` latticeFence.

- **The east street** (LBA2's runs at x −31 where Pippa's shop and Fosse's office stand): 3 m paved, straight, from the
  square's paved ring (z 3.6) down to the cross street (z 31.3), at x −35, 3.5 m west of LBA2's: in front of the two
  buildings' west-facing doors. No building moved.
- **Earth round the middle block's lawn**: LBA2's 2 m band of brown earth inside the streets (the west street, the new
  east street, the square's street, the cross street), as the south block already had.
- **LBA2's lawn strip with its lattice fence** south of the south cross street (z 54.6–60.4): the strip's earth band and
  a 10.8 m lattice fence along its north edge (dark posts every ~2.2 m, rails, a diagonal lattice; merged: one draw per
  material; a thin collider). LBA2 has its fenced lawns there; the other lawns have none, so ours stay open.
- **Nothing on the paving or the fence**: trees, bushes (1.2 m), grass and flowers (0.5 m), tulip beds (0.8 m: the
  coordinator's rule) and, new, rocks (their size) are taken off the paving after the scatter, so no random draw moves.
  The same for the fence (1.4 m trees, 0.35 m grass, 0.6 m tulips).
- Not done (left): the north cross streets round the square's block. The square is round in ours, with the climb to the
  fort and the plateau path through that block; a straight street there would cut the climb's paving.

## 4. The harbour: LBA2's straight-walled paved platform and the L pier

LBA2's harbour (lba2remake, straight down and oblique): a paved platform in front of the long hall, straight quay walls
about 2 m over the water with white stone posts and teal rails, an L-shaped stone pier (west, then south), the ferry at
the L's leg; the water inside the L is a straight-sided notch. Ours had the same buildings on a paved yard, a rounded
cove with rock shores where LBA2's notch is, our rectangular quay where LBA2's L is, and a 16.5 m wooden pier further
west.

**What changed.**
- **The wooden pier is LBA2's L-shaped stone pier** (`src/game/island.js` PIER_L, buildHarbour). Its arm leaves the
  quay's west face where the wooden pier did (7.1 m to the elbow), its leg turns south (9.4 m, to the quay's south line).
  Battered rubble walls as the quay's, paved, the outer faces railed with the quay's white posts and teal rails; the
  inner faces (the barge's and the boat's water) are open, as LBA2's.
- **Everything that stood out on the pier turns with it**, a quarter turn about the elbow (`pierW`, `pierOff`,
  `pierAng`): the cargo lift and its barge, the pier's end, the moorings and ladder, Doran's fishing boat (now between
  the leg and the quay, bow north, moored to the leg) and **the ferry's berth**: along the leg's west face, heading north,
  her gangway onto the leg. The wooden pier's random draws are still drawn, so the quay's jitter is unchanged.
- **The platform**: the yard's south face and the trading house's ground (its west and south faces) are straight
  rubble walls (`HARBOUR_PLAT`); the rounded cove is LBA2's straight-sided notch inside the L; the quay's south and east
  faces have walls too. Platform paved to its faces (the yard to z 44, the trading house's ground). The trading house's
  faces are railed; the yard's south face keeps LBA2's own posts and rails already standing there (`citadel-layout.js`
  PROPS); the quay's faces have none (its barrels and sheds stand to the edge).
- The quay and everything on it, the harbour wing, the hall, Nell's, Doran's sheds, the bell, the customs booth, the
  market of two worlds are where they were.

**Every use of the berth and the pier, updated.**
- `story/chapter1.js`: the cast on the pier (Vesk, the worker, the guard) by `pierOff`/`pierAng`; the arrival: the
  ferry's way in (its Bézier is in the leg's frame, so she now comes in from the south-south-west, round the south-west
  islet, heading north), the shots (sea, side, reveal: offsets turned), Vesk's walk (down the gangway, up the leg, round
  the elbow, along the arm to his mark by the quay).
- `story/prologue.js`: Xil, the project's crates at the pier's end.
- `story/opening.js`: the aerial move's end, the lift's two shots, the worker's and the resident's spots and walks.
- `travel.js`: the ferry's stop stays on the quay by its FERRY board, at the arm's root (on the leg the pier's people stood
  in its prompt).
- Not changed (on the quay, still right): Doran's spot and his fishing, the bell, the guard by the arm's root, Vesk's mark
  (on the arm's root), the gulls' perches, the evacuation's queue, the market, the townbusy points.
- **The ferry's way in never crosses land**: sampled at 101 points × 8 hull points, the highest ground under her hull
  is −6 m (the sea floor).
- **Old saves** (`main.js` migrateSave, idempotent, no format step): Citadel outdoors on the old pier beyond the new
  arm (x −137.5 to −127.2, z 40.8–45.2: open water now) → the elbow. Everything else that was walkable still is.

## 5. Zeelich Spaceport: the terminal's second door

`src/game/zterminal.js`. The hall's left wall has the door from the deck at the front and the gate to the pad at the
back; on the deck the pavilion's door faces west, so the hall's left wall is its west face and its back is north. Out
through the gate he stood at the pad's landing spot **facing north, toward the bridge and the town, his back to the
pad** (a ship's arrival faces that way, and the gate reused it). Now he steps out by the west face's north end, 1.3 m
from the landing spot and north of where the door lets him out, **facing the pad and its ship**. `tests/spaceport.mjs`'s
"within 1.5 m of the landing spot" still holds.

## Draw calls (one frame, all passes, the same camera; ours before → after)

| View | Before | After | Triangles before → after |
|---|---|---|---|
| Citadel straight down | 886 | 910 | 2.129 M → 2.160 M |
| Citadel oblique | 867 | 891 | 2.126 M → 2.158 M |
| harbour straight down | 375 | 383 | 1.302 M → 1.322 M |
| harbour oblique (south-west) | 636 | 657 | 1.925 M → 1.953 M |
| harbour oblique (south-east) | 300 | 313 | 0.960 M → 0.973 M |
| harbour from the west | 566 | 598 | 1.699 M → 1.756 M |
| the platform | 316 | 326 | |
| the pier from the platform | 274 | 288 | |
| town straight down | 592 | 608 | |
| town oblique | 619 | 640 | |
| the east street (play camera) | 430 | 441 | 1.172 M → 1.233 M |
| the south cross street (play camera) | 284 | 293 | |
| the lawn strip and its fence | 352 | 378 | |
| the south block | 455 | 473 | |
| the middle block | 442 | 459 | |
| Twinsen's house (play camera) | 360 | 377 | 0.900 M → 0.934 M |
| Twinsen's house from above | 468 | 483 | |
| the quay (play camera) | 211 | 219 | |
| Desert Island straight down / oblique | 970 / 913 | 970 / 913 | the same |
| the opening, 15 s (the lift) / 25 s / 77 s (the house) | 122 / 139 / 688 | 143 / 128 / 707 | |

- **More draws: +1 % to +7 %** in the Citadel views (+8 to +32), a few thousand to 60 k more triangles. Measured, not
  removed; each is a new material run in a 64 m merge cell, counted in each shadow pass too:
  - the stone pier's and the platform's walls, coping, posts and rails (rubble, stone, the posts' instanced draws: the
    arm's and the platform's share one, the leg's one; the wooden pier's two instanced draws are gone);
  - Twinsen's hip roof (plank and dark-wood board materials in its cell, where the thatch was one);
  - the lattice fence (two materials).
- The sea adds none (its uniforms only), and Desert's sea none (its own map as the emissive map).
- Not done: folding the new wall and post materials into the quay's own merge colours (`mergeStatic` recolor) more
  tightly; a candidate if the budget needs it. No fps claim either way.

## Tests (Automated runtime only)

Served from a snapshot of this branch (port 8988), SwiftShader, one browser at a time, on a shared machine. The final run
is on the final code except where said.

| Suite | Result |
|---|---|
| chapter1 | PASS 32/32 ("the ferry docks: Vesk arrives and is on the pier"); the arrival also captured frame by frame (`arrival_*.jpg`): the ferry along the leg, Vesk down the gangway, up the leg, round the elbow to his mark |
| chapter2 | PASS 21/21 |
| opening | first FAIL: the resident walked into the leg's new rail by the gangway (the film walks him to 0.3 m from the pier's edge there). The leg's west face is open from the elbow past the gangway now; **PASS** |
| opening-tutorial | PASS |
| townlife | PASS |
| walkers | PASS |
| door-sweep | first FAIL (the lighthouse door in chapter 10; a game over on Zeelich's street): the harbour's straight cuts ran on south and sank the lighthouse's headland. Bounded (`HARBOUR_PLAT.zFar`); **PASS** |
| place-scan | first FAIL on one known item that moved: the crane's cargo on the pier, its LEFT entry (`tests/place-scan.mjs`) now at the leg; **PASS** (no new piece out of place: the walls, posts, fence, roof) |
| world-consistency | PASS |
| spaceport-2 | PASS |
| spaceport | PASS (Zeelich's gate: out within 1.5 m of the landing spot) |
| travel | first: the Citadel ferry's stop, moved onto the leg, stood among the pier's people (their talk prompt took E). Back on the quay by its board; the 8 Twinsun legs and the ferry rides **PASS**. One FAIL left, **also on the base commit** (run there): chapter 2 → 3, "no sky-ferry at Zeelich's dock" (Zeelich's sky-ferry shows) — known, not this task's |
| last-ferry | PASS |
| one-more-place | PASS |
| twelve-years-late | PASS (its album's harbour spot) |
| camcitadel | first FAIL: behind Twinsen's house the camera drew in (under 5 m for 4.3 s, 3 s allowed): the hip roof's camera slab ran full length at the crown's height over the hips' low ends. It now stops halfway down the end slopes (`architecture.js` hip `occEnds`, Twinsen's only); **PASS**. A version that also boxed the hips' lower half failed "the house alley" (70° off his back) and was dropped |
| occluders | PASS (the houses' roofs, Twinsen's hip) |
| solidnpc | FAIL on the **known baseline** only: the planter box at the spaceport bridge's foot has no collider |
| save-migration | see below |

## Pictures

All may be shown to the user (Citadel, chapters 1–2; the Zeelich spaceport is where chapter 2 starts).

Ours before | after, committed, `captures/citadel-orig-2/`:
- the sea: `s_obl.jpg`, `s_top.jpg`, `desert_sea.jpg`;
- the harbour: `h_top.jpg`, `h_obl.jpg`, `h_obl2.jpg`, `h_west.jpg`, `h_plat.jpg`, `h_pier.jpg`;
- the chapter-1 arrival: `arrival_6.jpg`, `arrival_11.jpg`, `arrival_15.jpg`;
- the streets: `t_top.jpg`, `t_obl.jpg`, `p_east.jpg`, `p_south.jpg`, `f_block.jpg`, `f_strip.jpg`, `f_mid.jpg`;
- Twinsen's house: `p_house.jpg`, `p_house_hi.jpg`, `house_r.jpg`;
- the opening film: `opening_9.jpg`, `opening_12_5.jpg`, `opening_15.jpg`, `opening_25.jpg`, `opening_77.jpg`, `opening_80.jpg`;
- Zeelich's gate: `zeelich_gate.jpg`.

LBA2 | ours before | ours after, the same views: `/dev/shm/cit2/sheets/` (not committed).

## Left (toward the provisional 85)

- The sea's red stays ~18 over LBA2's (the frame's chroma grade).
- The harbour: our quay still stands where LBA2's L is (LBA2's arm and leg are our quay's footprint), so our L hangs
  off its west face: the harbour reaches 7 m further west than LBA2's, where it reached 16.5 m. LBA2's platform-centre
  planter with its tree and its paving over our hall's yard pattern are not built.
- The streets: the north cross streets round the square's block (the climb's paving is in the way); our blocks still
  carry more grass than LBA2's.
- Twinsen's walls stay our pale rubble; LBA2's are darker.

## Rerun

```
python3 -I tools/map-orig/gen.py tools/worldscore/ref/citadel.json spots.json /dev/shm/cit2/x citadel
SUNNY=1 node tools/map-orig/remake.mjs lba2 49 /dev/shm/cit2/x-remake.json /dev/shm/cit2/ref
LBA3=<snapshot> GAME_URL=http://localhost:8988/ node tools/map-orig/ours.mjs /dev/shm/cit2/x-ours.json <outdir>
```
The spot lists, the sea's tuning scripts (`seatune.mjs`, `deserttune.mjs`), the film and arrival frame scripts
(`openframes.mjs`, `arrival.mjs`) and the sheet script are in `/dev/shm/cit2/` (not committed).
