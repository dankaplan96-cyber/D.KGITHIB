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

Served from a snapshot of this branch (port 8988), SwiftShader, one browser at a time, on a shared machine. The camera fix for Twinsen's roof and the ferry stop's return to the quay came after the first full run: camcitadel,
occluders and travel were run again after them; the rest ran before (the occluder only moves the camera; the stop is a
menu point).

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
| save-migration | PASS (47 min on this machine) |

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
  carry more grass than LBA2's. (P42, below: the ring round the square's block done.)
- Twinsen's walls stay our pale rubble; LBA2's are darker. (P42, below: wrong way round from the play camera; LBA2's
  are paler, and ours are lighter now.)

## P42 leftovers (22.11)

The user chose to finish the three items left above. **Automated runtime only**: pictures by script (`tools/map-orig`,
the same cameras both sides), looked at; suites headless. LBA2's side stays in `/dev/shm/p42/` (not committed).

**1. The north cross streets: done** (`world.js` GRID_STREETS; ground texture only, no height, collider or route).
- LBA2 rings the square's block with 3 m streets. Ours now: along the square's north rim at z −15.8 (x −52 to −32.5,
  tangent to its kerb ring, across the climb's paving); the block's west side at x −52 (LBA2's line) down to the west
  street's foot; its east side at x −32.5 (LBA2's line) down to Pippa's street by her shop's north wall.
- Trees, rocks, grass and tulip beds come off the new paving after the scatter (no random draw moves).
- Left out: LBA2's second cross street 3.5 m further north, along the terraces' foot. Our ground rises and falls
  3.1–4.6 m along its line (the first shelf's slope); tried, it read as a paved hillside.

**2. The harbour's width: not done, it needs the user's decision.** Nothing in the harbour changed (OVERLAP-3's
bollards and HARBOUR-BRINK's ground and wall tops are untouched).
- Measured straight down, the same camera (`captures/p42/harbour_top_now.jpg`; LBA2's beside it in `/dev/shm/p42/`):
  LBA2's L *is* our quay. Its arm (z 36–43) is our quay's north half; its leg (x −121 to −115, to z 50) our quay's west
  strip; its notch (open water x −115 to −93, south of z 43) covers our quay's south half and our notch. Our stone L
  hangs off the quay's west face, to x −127.
- So LBA2's proportion means: the stone L goes; the quay's west 3.2 m carry on south as the leg; the quay south of
  z 44.6 opens into the notch; the ferry berths along the leg (7 m east of now); the lift, the barge and Doran's boat
  lie in the notch beside the leg (chapter 1's arrival, the opening and the prologue follow the pier's frame).
- That takes the ground from under **Doran's shed and the harbour master's shed**, the quay's barrels, net heap, a
  lamp, a tulip bed, a bitt and about ten placed spots (townbusy, containers, citydress, the handcart, a bollard run).
  LBA2 has open water there, so where the two sheds go is the user's call.
- Shifting the whole quay 7 m east instead (nothing relocated) would narrow the notch from 15.7 m to 8.7 m (LBA2's is
  22 m): one disproportion for another. Not done.

**3. The houses' walls lighter: done** (colour only).
- `textures.js` `rubbleHouse`, the houses' own rubble: pale whitish-grey stones packed close in darker joints, as LBA2's
  house rubble from the play camera. On Twinsen's, the neighbour's, wing2 and Doran's shed (`town.js`, `island.js`);
  the embankments, quay and pier walls keep `rubble`. Twinsen's and the neighbour's fronts face east, away from
  Citadel's sun: a warmer tint.
- Mean colour of Twinsen's front from the play camera: (30, 32, 36) → **(71, 72, 76)**; LBA2's (96, 88, 77), lit
  there. Even a white wall reaches only ~90 in our shade, so the rest is lighting, not colour. wing2's sunlit south face
  (78, 71, 63) → (105, 98, 90).
- Cost: one 256² texture; no new mesh.

**Tests** (port 8844, SwiftShader, one browser at a time): slidetraps PASS, citadel-structures PASS, world-consistency
PASS, chapter1 PASS (33/33). chapter2 not run (the harbour and the ferry did not move).

**Pictures** (ours before | after, `captures/p42/`): `streets_north.jpg`, `streets_north_w.jpg`, `streets_west.jpg`,
`streets_top.jpg`; `walls_twinsen.jpg`, `walls_neighbour.jpg`, `walls_wing2.jpg`; the harbour now: `harbour_top_now.jpg`.
LBA2 | ours before | after: `/dev/shm/p42/f_streets.jpg`, `f_walls.jpg`, `north_LBA2_before_after.jpg`,
`harbour_pair_LBA2_ours.jpg`.

## FLAT-TOWN (22.11): level paved areas at LBA2's heights, built walls at the sea edge

The user, with a play-camera picture of the square by the statue: "Everything on the floor is crooked ... where hills
are needed, have them; where not, then not"; of the promenade by the water office: "In the original game it was
really built like a wall"; then: "Don't make Citadel one single flat plane! Check what was in LBA2!" **Automated
runtime only (SwiftShader).** Build `872a85f0` + this change.

**Reference.** LBA2's island height grid, `tools/worldscore/ref/citadel.json` (1.71 m cells, our frame = its frame +
(−76, +16); numbers only). LBA2's levels, m over its streets: streets and most plots 0; the square a raised plaza,
+0.21/+0.42 in two steps all round, +0.63 at the middle; the south block's lawns +0.21..+0.63; the harbour platform
+0.83; the west shore's promenade +3.76, ending at a rail over the harbour (z 18.7); the terraces' foot ramps (up to
the stepping stones' shelf at x −58..−66, z −22..−18; up to the fort at x −46..−38) from the street's level; every
shore a straight drop of ~6 m. Ours had the town on the terrain's rolling grid (±0.3 m, a 0.7 m "rise" west of the
statue that LBA2 has not), the promenade a ridge (1.2–3.8 m) on the old cliff.

| area | LBA2 (m over its streets) | ours before | ours after |
|---|---|---|---|
| square, middle (well) | +0.63 | −0.10 | +0.42 |
| square, platform | +0.42 | −0.10..0.01 | +0.42 (two 0.21 steps round it) |
| streets round the square | 0 | −0.10..+0.65 | 0 |
| north street, west end (the old rise) | 0 | +0.65..+1.02 | 0 |
| Bug Street pair, before the doors | 0 | +0.26 | 0 |
| west street, cross street, east plots | 0 | −0.38..+0.13 | 0 |
| south block lawn | +0.21..+0.63 | −0.09..+0.14 | 0 (FLAT-TOWN-2: +0.21 kerb, +0.63 bed) |
| harbour yard | +0.83 | −0.02 | 0 (FLAT-TOWN-2: left, see there) |
| promenade (sea wall) | +3.76 | +1.19..+3.81 | +3.76 |
| knoll by the water office | +3.76 | +3.77 | +3.77 |

**What changed** (`src/game/flattown.js` the shapes; `world.js` the ground; `island.js` the masonry):
- `flatTown`: in the town (x −74.5..−20, z −24..66) and the harbour wing, no bump under 1.1 m, the shelves' faces and
  the sea cliff (over 2.8 m) kept; on the paving the street's level even where a shelf's foot ran in. One street level,
  TOWN_FLAT 2.3 (TOWN_Y). The house floors follow (their level is the ground before the door).
- `plaza`: the square inside its old kerb ring at +0.42, two stone steps (rings, 0.5 m treads) round it in place of the
  kerb ring (`town.js`). The ground under the steps is the incline through their edges (walked, no colliders).
- `promenade`: one level strip at PROM_H (6.06) from the north end (z −29.4) to the knoll's rail (z 18.8), x −75.07 to
  −72.29, faces on the terrain grid's lines: the sea wall (straight down to −3.4, rows out from it under the water's
  floor so the trap filler builds no bank before it), a wall at its south end over the harbour's ground, an inland wall
  behind the water office (z −2.6..16.4). Quay rubble under a pale coping 2 cm over the walk; each top a walkable
  collider (HARBOUR-BRINK's way). The lanterns and rails (PROPS) stand on it level, the knoll's rail (z 18.7) now too.
- `promStair`: the way up from the harbour street (PATHS[5]'s line), where a twisted ramp ran up the shelf's face: a
  straight flight of 20 steps (0.19 m) from x −65.8 to the strip, each step a collider; its foot paved (GRID_STREETS);
  props keep off it (`containers.js` flatKeep). LBA2's flight there runs north–south into the notch; ours east–west.
- The stepping stones' path (PATHS[4]) now runs level from Bug Street to the shelf's foot and ramps up from there
  (LBA2's ramp, the same place); the first stone's base is unchanged (4.9047 m both).
- Kept random streams: the scatter decides on the ground as it stood (`FLAT_OFF`, and `FLAT_THEN`, the grid built
  from it, trap filler and all); trees, bushes, grass, flowers, tulip beds identical to before (compared by position);
  rocks of the old ridge under the walls and flight dropped whole. Old saves: the save holds x/z only and the loader
  grounds him (`exitRoom`); checked on five spots where the ground moved (all standing, no life lost).
- Cost: three meshes (rubble, coping, steps), 23 colliders; the grid build +~25 ms (the old grid for the scatter).

**Left:** the south block's raised lawns and the harbour platform's +0.83 (above); the east shore is a short natural
drop (2.3 → −2.6 m in ~2 m), not a built wall; the inland wall's rubble is dark in its shade. (FLAT-TOWN-2, below: all
done but the harbour platform.)

**Tests** (port 8167, SwiftShader, one browser at a time; on the final build): slidetraps PASS (Citadel 49 spots, 0 bad), citadel-structures PASS, world-consistency PASS, chapter1 PASS (33), walkers PASS, overlap-sweep (default) PASS (its first two runs found the flight's first tread and the plaza's outer step flush with the ground: the ground under them now 3–4 cm lower, the flight's foot on a grid column). **Pictures** (before | after, play camera unless
named top): `captures/flat-town/`.

## FLAT-TOWN-2 (22.11): the lawns, the east shore, the inland wall's tone; the harbour left

FLAT-TOWN's leftovers (the user, 22.11: "yes"; the standing rule: not one flat plane, LBA2's own levels, steps, ramps
and walls). **Automated runtime only (SwiftShader).** Build `eb385287` + this change. Reference as FLAT-TOWN's
(`tools/worldscore/ref/citadel.json`, its streets at 42 cm; our frame = its frame + (−76, +16)).

| area | LBA2 (m over its streets) | ours before | ours after |
|---|---|---|---|
| south block, the ring (west and north) | +0.21 (one cell, 1.7 m) | 0 | +0.21 (a kerb, one grid cell, its top +0.23) |
| south block, the beds | +0.63 (a few spots +0.83) | 0 | +0.63 (one bed, the lawn; its walls' tops +0.65) |
| south block, the strips before it (north: benches, lamps; west) | 0 | 0 | 0 |
| south block, east and south edges | the ring +0.21 (LBA2's block is 2.8 m wider) | 0 | the bed's wall straight from the street |
| east shore | the street's level to one straight edge, then water | 0, a drop to −4.9 in ~2 m round three coves | (v143: a straight wall, face x −22.09; **reverted**, below: the natural drop as before) |
| harbour platform | +0.83 (the quay and the pier too) | 0 (the quay −0.50, the pier −0.55) | unchanged (below) |

**What changed** (`citadel-layout.js` LAWN, EAST_WALL; `world.js` lawns, eastShore; `island.js` buildFlatTown):
- **The lawns.** The block between the west street, the fields' path and the two cross streets, on the terrain's grid
  as the promenade's walls are (each level change on one cell, the bank inside the masonry, each top a walkable
  collider): on the west and north a kerb (LBA2's ring) and above it the bed's retaining wall; on the east and south
  the bed's wall from the street (the block is 2.8 m narrower than LBA2's: two tiers there would leave no lawn). The
  street-level strips before the north and west kerbs keep the benches, the bin and the lamps (LBA2's strip). Two steps
  cut into the north wall's middle from the kerb (three even risers of 0.21 with the kerb) lead onto the bed by the
  benches, Maro and Tilde's meeting place and the hopscotch. Rubble under the promenade's coping, the flight's stone
  for the steps; merged with the promenade's masonry (no new material). Re-seated on the new ground: the two trees, the
  hopscotch, the residents' stops (physics), the tulip beds (the first row 0.25 m north, clear of the south wall; the
  second, LBA2's x −49..−47.3, would be in our east wall: on the bed between the two trees) and the planter (0.7 m
  west, onto the bed). Scattered bushes in the masonry or on the tulip beds' places, and grass in the masonry, are
  left out after the scatter.
- **The east shore (reverted 22.11, below).** A wall from the terraces' foot (z −25.8) to the town ground's south end (z 74.5): the town's level
  to grid column x −23.07 (three coves filled, up to 3.7 m), its face 0.05 m past column x −22.14, the four columns out
  under the water's floor (a ledge 1.6 m high stood 1 m out at z 25–30 with no way up), rubble down to −3.4 under
  the coping. The spaceport's footbridge rests on it (no coping under its planks). The old drop's cliff rocks on the
  ground behind the face, in the coves and up to 3.6 m out before it are dropped whole (LBA2's wall goes straight
  into the water).
- **The inland wall's tone.** The walls that face east, away from the sun (the inland wall behind the water office, the
  east shore's) and the lawns' share one rubble material lifted by its own texture as light (an emissive map; colour
  only): in shade they read as the sunlit sea wall does. The sea and south walls keep the harbour's rubble.
- **Random streams.** The scatter decides on the ground as it stood (FLAT_OFF covers the new ground); trees, rocks and
  the tulip beds' plants compared by position before and after: only the filtered ones and the moved beds differ (one
  hand-placed tree on the east shore's edge, x −24, within 1 m of the wall's back, is left out by FLAT-TOWN's own filter).
- **Old saves.** The save holds x/z; the loader grounds him. Checked 15 spots on changed ground (bed, kerb, walls,
  steps, strips, the filled coves, under the footbridge, the old shore's edge and the ledge now in the water): all
  standing on standable ground, no life lost. A spot now in the water before the east wall loads 0.4 m behind the wall
  (`world.js flatSpot`, `main.js applySave`).
- **Cost.** One material more in the town's masonry (the shaded rubble: +1 draw call where it is in view); 9
  colliders for the lawns' masonry and steps, 2 for the east wall.

**Left: the harbour platform at +0.83.** Not raised. LBA2's harbour is one level: the platform, the quay and the pier
at +0.83. Ours is two built levels below the street's: the yard at 0, the quay and the L pier at −0.50/−0.55, with the
ferry's berth, the barge, the cargo lift, the moorings and the boats' decks fitted to the pier's deck (island.js
HARBOUR0.deck, QH), the sheds on the quay, and the platform's sea walls, rails and posts at HARBOUR_PLAT.h. Raising
the yard alone leaves a 1.33 m step to the quay that LBA2 does not have; raising all of it moves the pier's deck
against the ferry, the boats and chapter 1's arrival on it. Not clean in this pass: a separate task that moves the
whole harbour by one offset (pier, quay, berth, boats, sheds, walls, the arrival's marks) and adds LBA2's step at its
east side, x −75.

- **Residents.** The two steps are a stair for the residents' planner (walknav.js lowBrick): Maro and Tilde go up to
  their meeting place and Dot to the hopscotch by them (the first walkers run found no route onto the bed).

**Tests** (port 8274, SwiftShader, one browser at a time; slidetraps and overlap-sweep on the final build, walkers
before the flower-bed filter, the other three before that and the steps' stair flag, neither of which they touch): slidetraps PASS (Citadel 49 spots, 0
bad), citadel-structures PASS, world-consistency PASS (37), chapter1 PASS (33), walkers PASS (37; its first run failed
the four route checks above), overlap-sweep (default) PASS (its first run found a scattered tulip bed 1–4 cm into the
north kerb: the lawns' masonry now leaves such a bed out whole). The town's containers are where they were.

**Pictures** (before | after, set cameras; Automated runtime only): `captures/flat-town/lawns-obl.jpg`,
`lawns-top.jpg`, `lawns-low.jpg` (the north steps from the street), `east-obl.jpg`, `east-top.jpg`, `east-sea.jpg`,
`inland-wall.jpg`; `harbour-unchanged.jpg` (the harbour left as it was).

### East shore wall reverted (the user, 22.11)

The user kept FLAT-TOWN's and FLAT-TOWN-2's other changes (the raised square, the level streets, the sea wall, the
20-step flight, the south lawns, the north cross streets, the pale walls) and asked for one back: **the east shore
goes back to its natural drop round its three coves, with its cliff rocks.** **Automated runtime only (SwiftShader).**
- Undone (from `0c03f622`): `citadel-layout.js` EAST_WALL and its part of `flatClear`; `world.js` eastShore (the
  filled coves, the sunk ledge before the face) and the east shore's `dropRocks` (the cliff rocks are back);
  `island.js` the wall's rubble, coping and its 2 colliders; `world.js flatSpot`. The footbridge to the spaceport
  rests on the natural shore and its stilts again (`spaceport.js` was never changed: its deck height comes from the
  shore under its west end, 2.33 as before). The scatter's leftovers by the shore come back with `flatClear` (filtered
  after the scatter: no random draw moved).
- Kept: the lawns, kerbs, steps and their stair flag; the tulip-bed filter; the lifted rubble on the inland wall and
  the lawns' walls; the scatter deciding on the old ground.
- Checked against the build before FLAT-TOWN-2 (`0c03f622^`), box x −32..−15, z −27..76: terrain heights (0.5 m
  grid) identical (max diff 0.000), colliders identical (38), vertex counts of every mesh and instance counts
  identical (cliff rocks, the town's batches, shadows). v143 differs there by up to 6.0 m (the probe sees the wall).
- Old saves: a v143 spot on the wall's top, a filled cove or the sunk ledge (`V143_EAST`) that is now off the town's
  level loads on the nearest standable town ground to its west (`world.js shoreSpot`, `main.js applySave`; a spot on
  the footbridge stays). 13 v143 spots loaded and played 3 s: all standing on standable ground at 2.28–2.33, not in
  the water, no hp lost, no jump.
- Tests (ports 8391/8392, SwiftShader, one browser at a time, on the final build): slidetraps PASS (Citadel 49 spots,
  0 bad), citadel-structures PASS (7), world-consistency PASS (37), walkers PASS (37), spaceport-2 PASS (21; the
  footbridge), overlap-sweep (default) PASS.
- Picture (v143 | reverted, the `east-obl.jpg` camera): `captures/flat-town/east-reverted.jpg`.

## Rerun

```
python3 -I tools/map-orig/gen.py tools/worldscore/ref/citadel.json spots.json /dev/shm/cit2/x citadel
SUNNY=1 node tools/map-orig/remake.mjs lba2 49 /dev/shm/cit2/x-remake.json /dev/shm/cit2/ref
LBA3=<snapshot> GAME_URL=http://localhost:8988/ node tools/map-orig/ours.mjs /dev/shm/cit2/x-ours.json <outdir>
```
The spot lists, the sea's tuning scripts (`seatune.mjs`, `deserttune.mjs`), the film and arrival frame scripts
(`openframes.mjs`, `arrival.mjs`) and the sheet script are in `/dev/shm/cit2/` (not committed).

**The user, 22.11: "we don't move the harbour."** The harbour platform stays at its own levels; not to be proposed again.

## WALL-LOOK (22.11): three candidate faces for the town's built walls, switchable; the default unchanged

The user, 22.11, a play-camera picture of the new 20-step stair with the inland wall behind it (near-black, noisy
pebbles): "The wall's texture isn't good, it needs replacing." By P107 (visible world changes are shown first) no new
default: `?wall=a|b|c` switches a candidate on; without it the walls are as before. **Automated runtime only
(SwiftShader).** Build `407c2ec7` + this change.

**The candidates** (`src/engine/textures.js` wallTexture; `src/game/island.js` WALL_LOOK, wallMat, wallBox):
- **a, pale dressed blocks in courses** (LBA2's light cut-stone terrace walls): a generated 256 px tile at 1.7 m, five
  courses (~34 cm), blocks 46–85 cm with broken joints, thin warm-grey joints (never dark), each block lighter at its
  top arris; tint `#eee6d8`.
- **b, the houses' pale rubble, larger, in mortar**: a generated 256 px tile at 1.7 m, ~70 stones about twice the
  houses' (`rubbleHouse`) size, a pale lime mortar between them; tint `#eee6d8`.
- **c, the fort's stone**: the fort's own `fortStone` at its scale (3.2 m) and tint (`#e6eaf2`); no texture of its own.

**What takes it:** every wall made with the sea wall's rubble material: the promenade's sea, south and inland walls
(the inland one behind the stair), the south lawns' kerbs and bed walls, the east shore's wall while it stands
(EAST-REVERT removes it; nothing of it was touched here), the harbour's L pier and platform walls (the same material
object as the sea wall's: HARBOUR-BRINK's `wallRun`), and the quay's embankment (its own tint, the same texture: the
harbour's merge folds it with the pier's walls into one draw per cell; a candidate on the pier alone split them, a draw
more). Nothing moves: shapes, colliders, copings, steps and the harbour's levels are as they were. The walls facing
east keep FLAT-TOWN-2's emissive lift, smaller on the pale faces (a/b `#4a453e`, c `#6c7078`, the rubble's `#8c8884`).
The candidates in courses get their UVs projected per face (`boxUV`: along the face, up the height; ExtrudeGeometry's
side faces ran the texture's rows up the wall, which the rubble's round stones never showed); the rubble keeps its UVs.

**Cost** (one browser, 1280×720, Follow at Far, quality high, a new game per look, one frame counted after the view
settled; `renderBufferDirect` counted by pass, main + shadow):

| view | current | a | b | c |
|---|---|---|---|---|
| the stair (the user's view) | 147 + 21 | 147 + 21 | 147 + 21 | 147 + 21 |
| the lawns (north-west) | 182 + 35 | 182 + 35 | 182 + 35 | 182 + 35 |
| the L pier | 95 + 31 | 95 + 31 | 95 + 31 | 95 + 31 |
| the harbour by the customs | 111 + 30 | 109 + 30 | 111 + 30 | 111 + 30 |
| the square | 156 + 49 | 156 + 49 | 156 + 49 | 156 + 49 |

Triangles the same (the harbour with a: 68 fewer, its batches cut differently; a pixel diff against the current shows
only the walls and the idle animations). Textures: a and b one 256 px canvas more (one layer more in the world's
texture array, made only with the flag), c none. Each candidate is made where the rubble's materials were made, one
per tint as theirs: the draw batches keep pieces in their materials' creation order (drawbatch.js `ord`), and the
first try (one material for the quay and the pier) left the walls a run of their own, a draw more at the stair and the
pier. CPU frame time (60 frames after 20, the whole frame: update and submission; SwiftShader on a shared machine with
two other test browsers running, so the tails are the machine's, not the walls'): p50 6–14 ms in every look and view.
No GPU figure (software rendering).

**Pictures** (current | a | b | c, the play camera at Far): `captures/wall-texture/stair.jpg` (the user's view, from
the street below the stair), `stair-wall-detail.jpg` (the same, the wall at full size), `bluehouse.jpg` (the inland
wall from the blue-roofed house), `promsouth.jpg` (the promenade's south end over the harbour's ground; the sea face
itself is seen only from the water), `lawns-nw.jpg` and `lawns-s.jpg` (the south lawns' kerbs, steps and walls),
`pier.jpg` (the L pier's and the quay's walls).

**Recommendation: a.** It reads as a built, coursed retaining wall at the play camera (LBA2's terrace walls), the
coping stays the lightest band over it, nothing goes near black in shade, and its pattern is large and low-contrast
enough not to swim at distance. b is calm but at Far becomes an even grey mottle; c is the fort's blue-grey, darker in
shade (the pier's north face nearly navy), and ties the town's walls to Funfrock's fort.

**Tests** (port 8452, SwiftShader, one browser at a time): a boot with each flag and with none (the captures: no page
or console error, no missing file); overlap-sweep (default) PASS (citadel a 0, b 0, c 0, d 0, e 0 open; the default
look is the build's: its materials, geometry and UVs are made as before).
