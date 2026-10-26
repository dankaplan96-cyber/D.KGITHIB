# World similarity: each island against the original (WORLD-80)

The user (WORKLIST #19, paraphrased from Hebrew): "The world still doesn't look like the original (LBA2/LBA1),
including the structure and the statues, with the twelve years' additions." Then: "Let's shorten the process. Say
everything is 80% similar rather than 100%, on the argument that twelve years passed and things changed."

This file measures how similar each island is now, as a score out of 100. It lists the differences that cost the
most and proposes fix batches that reach at least 80 per island: Citadel first, then Desert Island, then the rest.
Step 1 measured and planned only. Step 2 (the Citadel batch, below "Citadel Island: 77.5 → 84.9") built the west
islet's dome and figure, Bug Street's pair and the plateau's and the stone house's doors.

Measured on game 0.31.0, branch `ccr-adf00ea7-37ebl3` at 71da4f3, on 2026-10-26, in this container (SwiftShader,
headless; the measure reads the built world, so the renderer doesn't matter). Raw results:
`docs/lba3-production/reviews/WORLD-80/scores.json`.

## How to rerun

```
cd lba2-remaster
python3 -m http.server 8179 &                      # the game, served (the scorer opens it with ?allregions: every area built)
GAME_URL=http://localhost:8179/ TMPDIR=/dev/shm node tools/worldscore.mjs \
  --json docs/lba3-production/reviews/WORLD-80/scores.json --png docs/lba3-production/reviews/WORLD-80
```

One run starts the game headless, measures every island and prints the table and the ranked differences. Here it
takes about 3 minutes, 70 s of which is the game's boot. Options: `--only citadel,desert`, `--top 30`,
`--dump f.json` to keep the measured world, `--from f.json` to rescore it without the game. The original layouts are
committed as numbers (`tools/worldscore/ref/`, `assets/lba2/islands/`), so the user's game files are only needed to
regenerate them: `python3 -I tools/lba2-islands.py <LBA2 folder> --ref tools/worldscore/ref` and
`python3 -I tools/lba2-islands.py <LBA1 folder> --hamalayi tools/worldscore/ref/hamalayi-lba1.json`.

After a fix adds a landmark, point its `ours` entry in `tools/worldscore/landmarks.json` at the new object. The
simplest way is to register the building with `fitAdd` (worldfit.js), as the town's houses are, and use
`{ "fit": "<name>" }`.

## The score

Each island gets four parts, each scored 0–100. The island's score is their weighted sum.

| Part | Weight | What is compared |
|---|---|---|
| Coast | 30 | IoU of the land masks (ground above 0.05 m), on the original's own height-grid points (1.71 m apart) plus 27 m of sea round them. Our world is mapped into the original's frame by each builder's own transform: world.js `LAYOUT`, desert.js `DESERT_FIT` (a 275° turn), the islands' places. These are read from the running game, so a re-fit is scored as built. |
| Height | 20 | On land both have, the mean absolute difference after removing one uniform lift (the median difference, reported separately). It is a skill score against the original's own spread: 100 × (1 − MAE / mean \|h − mean h\|). 0 means no better than a flat plate at the right height. |
| Landmarks | 30 | Each named original landmark against our matching object (`tools/worldscore/landmarks.json`): 100 % within 5 m, falling to 0 at 30 m; a missing one scores 0. Weight 2 for an island's best-known places. Zeelich's islands: every original building of 10 m² or more, with overlapping records merged, matched automatically to our nearest building of a similar footprint. |
| Objects | 20 | Per 27.4 m cell, the count of buildings, tall things (lamps, posts, towers), fences (railings, bollard runs, low walls) and props, the original's against ours. A deficit costs in full (half: 50 %, a quarter: 0). A surplus up to twice the original's is free (lived in, twelve years on); four times scores 50 %, eight times 0. |

**Twelve years' additions are intentional and not penalised.** Inside their areas (`tools/worldscore/additions.json`)
the coast, height and objects parts leave both sides out, and nothing of theirs counts as a landmark. A landmark of
the original that an addition displaced is still scored. The additions excluded:

- Citadel: Citadel Spaceport (deck, footbridge, terminal, tower); the Joint Project's station in FunFrock's old
  fort; the project depot; the Citadel Asylum; the Whispering Cliffs rock stack; Pippa's shop; the well on the square
  (where the statue stood); the lane's old pump and the project's pipe; Zoé's garden; the harbour's customs booth and
  Nell's repair shop; the glider field on the plateau.
- Desert Island: the research post and test bore; the dig (Temple-Park); FunFrock's condenser hall; Ilka's camp;
  the oasis and the wind-pump; Kesh's cool room; the glider field.
- Zeelich's islands: each shuttle pad; the old Wannie mine on Under Celebration.

**What the measure can't see.**
- The objects part counts our registered buildings and physics colliders, so pieces without a collider are not
  counted: flowers, plants, and small things on the islands' steep slopes. For ours it is a lower bound.
- The original's places are named from numbers only: object sizes and door zones with the scene each leads to (S2,
  S51, …). Names such as "the plateau's door" are descriptions, not the original's names.
- The School of Magic's original site can't be identified from the numbers, so it is not a landmark here.
- Zeelich's islands are built on the original's own grid points, so their coast IoU is exactly 1.0 at this
  resolution. The earlier audit's 0.89–0.95 came from 1 m sampling and counted the half-cell shore ring.

## Scores now

| Island | Score | Coast | Height | Landmarks | Objects | Key measures |
|---|---|---|---|---|---|---|
| **Citadel Island** (step 1) | **77.5** | 90.9 | 75.2 | 75.7 | 62.3 | IoU 0.909; land 13,782 m² original / 14,582 ours; lift +1.1 m, MAE 1.13 m on a 4.55 m spread; 270 objects / 469 |
| **Citadel Island** (after step 2) | **84.9** | 90.9 | 76.6 | 98.9 | 63.4 | coast unchanged; lift +1.1 m, MAE 1.06 m; 270 objects / 473; every landmark but the plateau's door within 5 m |
| **Desert Island** (step 1) | **39.6** | 90.0 | 0.0 | 15.9 | 38.9 | IoU 0.900; land 29,237 / 26,833 m²; lift +2.2 m, MAE 2.29 m on a 1.90 m spread; 315 objects / 119 |
| **Desert Island** (after step 3) | **85.0** | 97.7 | 78.2 | 88.1 | 68.3 | IoU 0.977; land 29,237 / 29,847; lift 0.0 m, MAE 0.40 m; 315 objects / 231 |
| The Hamalayi (against LBA1) | 27.4 (partial) | 37.3 | 12.7 | — | — | walkable 31,825 m² ours vs 11,860 in LBA1's eight scenes; 90 % of it within 25.5 m of the lowest level vs 6.4 m. Not a target any more (the user's decision, 26.10): four LBA1 places added, below |
| Zeelich (the terminal island) | n/a | | | | | no original island has its layout (below) |
| Otringal | 92.6 | 100 | 97.7 | 100 | 65.3 | 555 objects / 422 counted |
| Knartas Island | 94.7 | 100 | 83.4 | 100 | 90.2 | |
| Mosquibee Island | 84.5 | 100 | 93.2 | 100 | 29.3 | its pole clusters (49 tall things in one cell) have no colliders |
| Celebration Island | 92.1 | 100 | 99.9 | 100 | 60.6 | |
| Under Celebration | 91.3 | 100 | 99.4 | 100 | 57.1 | |
| The CX Islet | 92.2 | 100 | 92.6 | 100 | 68.3 | |
| The Platform | 89.2 | 99.2 | 88.8 | 100 | 58.6 | |
| The Lift Dock | 37.7 (partial) | — | — | 50.0 | 19.4 | its decks are its ground; deck parts compared as buildings (unreliable) |

A partial island's missing parts are left out and the other parts re-weighted.

Points below are points of the island's score. "Ours at" gives our world coordinates (Desert Island: world =
local + 3400 in x).

## Citadel Island: 77.5 → 84.9

**Step 2 (the Citadel batch), per part, before → after** (same scorer, same references; game 0.31.0 after the
LAZY-REGIONS merge, 2026-10-26; `docs/lba3-production/reviews/WORLD-80/citadel/scores-{before,after}.json`,
`citadel-overlay-after.png`, screenshots `before/` and `after/`):

| Part | Weight | Before | After | What changed |
|---|---|---|---|---|
| Coast | 30 | 90.9 | 90.9 | nothing (the optional coast pull, #6, was not done) |
| Height | 20 | 75.2 | 76.6 | the west islet's top raised 2.2 m to the original's (world.js ISLET_LIFT), the dome's level floor on it |
| Landmarks | 30 | 75.7 | 98.9 | the dome (0 m), the figure (0.8 m), Bug Street's north house S5 (0.3 m) and south house S22 (10.3 → 0.3 m), the passage's two doors S51 (2.8 / 3.6 m), the stone house's upper door S17 (11.4 → 2.2 m); the plateau's door S2 is 10 m north of the original's (80 %): its original place is in the depot's yard, so the tunnel mouth stands in the plateau's north face below it |
| Objects | 20 | 62.3 | 63.4 | the new buildings and colliders in their cells |
| **Score** | | **77.5** | **84.9** | |

What was built (our kit and materials, from the original's numbers only; `src/game/island.js` "WORLD-80: the
original's old places", `src/game/town.js` HOUSES, `src/game/world.js`):

- **The west islet** (fixes 1, 2): a 19.1 m round building at (−159.7, −10.0) — stepped plinth, a drum of the town's
  stone with pilasters and round windows, a blue-tiled dome with stone ribs, a lantern and a finial (12.9 m); its door
  to the south (the original's zone) shut, with two steps. A 4.4 m robed stone figure with a staff on a square plinth
  at (−156.4, 4.0), facing the town. The islet's top at the original's 12.1 m (+2.2 m: a taller last rock face), the
  dome's floor level on it. Registered as `the west islet dome` (fitAdd, round) and `spots.isletFigure`.
- **Bug Street's pair** (fix 3): the one house that stood between the original's pair is now the north house (S5, at
  (−61.4, −14.3), 6.2 × 8.2 m, stone, blue roof) and a new south house `bug2` (S22, at (−62.3, −8.2), 4.9 × 6.6 m,
  plaster, red roof) beside it, both with their doors east to the street, on one floor. The west street to the
  stepping stones now goes round the north house (world.js PATHS[4]); the cliffs sign and the Bug Street barrel moved
  with it. tests/occluders.mjs (b) runs behind both; camsteady's two town routes follow the new line.
- **The doors** (fixes 4, 5, 8), all shut ("Locked." on use, `W.shutDoors`): the plateau's door S2 as a barrel-vaulted
  tunnel mouth in the north face at (−80.7, −82) with a landing; the passage's north door S51 the same, with bars, at
  (−25.9, −84.6); the passage's south door S51 as a flush cellar hatch in the fort's yard at (−27.8, −61.6) (3.6 m
  west of the original's, off the yard's deck-plate walk); the stone house's upper door S17 as a small stone porch
  `stoneup` on the terrace behind the house at (−25.5, −31.8), its door to the north.
- **Nothing else on the island moved.** The scatter of trees, bushes, grass, flowers, tulip beds, rocks and cliff
  blocks decides on the ground, paths and houses as they stood before step 2 (world.js `scatterGround`,
  `PATHS_SCATTER`, `SCATTER_HOUSES`) and what lands on the new path, in the new houses or on the islet's new rock
  face is taken out afterwards: the collider and tree lists of before and after differ only inside the six changed
  places (checked on the scorer's dumps).

Not done: fix 6 (the coast, +1.6) and fix 7 (the terraces): both touch the whole island's ground. Fix 9 (the
museum's annexes) and 10 (railings) are left for a later pass. The S2 door's 10 m is the plateau's own shape (its
original place is 9.4 m up a cliff that is our depot yard).

**Step 1's measurement (kept as recorded):**

What already matches: the coast (IoU 0.91), and twelve of the original's landmarks within 5 m. Those are Twinsen's
house, the neighbour's, the south house, the water office, the stone house, the baggage claim and its wing, the
museum, the harbour building (Doran's shed, 4.4 m), the lighthouse, Bersimon's tent and the east shore's door. The
statue is at 6.2 m: it moved north for the well (95 %).

Ranked differences:

| # | Difference | Fix | Gain | Size |
|---|---|---|---|---|
| 1 | Missing: the great dome on the west islet (S26). The original's is 19 × 19 m and 12.9 m tall, on the islet's top 12 m up, at our (−159.7, −10.0). We have the islet, no dome. | Build it in our style (a stone drum, a dome, the door S26 shut), and raise the islet's top 2.2 m to the original's 11.9 m. | +2.2 (+0.1–0.4 ground) | M |
| 2 | Missing: the 4.4 m figure or spire beside the dome, at (−155.6, 4.0). | Stand a figure there, with the dome. | +1.1 | S |
| 3 | Missing: Bug Street's second house (S5) at (−61.4, −14.0). Our one Bug Street house stands between the original's pair, 10.3 m from S22's (−62.3, −7.9). | Two houses at the original's places, 8.6 × 6.9 m and 6.9 × 5.2 m. tests/occluders.mjs (b) uses this house. | +1.1 +0.2 | M |
| 4 | Missing: the plateau's door (S2) at (−80.7, −73.1), 9.4 m up the cliff, in the depot's area. | A shut door in the cliff behind the depot. | +1.1 | S |
| 5 | Missing: the passage through the plateau (S51). Its south door is on top at (−24.5, −63.2), inside the fort; its north door is in the north face at (−25.9, −82.0). | The fort's cellar stair (south) and a barred tunnel mouth in the north face. | +1.2 | S |
| 6 | The coast stands about one grid step (1.7 m) further out almost all round: 1,070 m² is ours only (815 m² of it a ring on the original's shore, median 2.1 m high), and 273 m² is the original's only (the sand bay by the south-west islet). | Pull the shore in by ~1.7 m in world.js's coast distance, keeping the quay. IoU 0.910 → 0.962. | +1.6 | M |
| 7 | The terraces are too even: our shelves stand 2.8 / 5.8 / 8.7 / 11.6 m above the town against the original's 3.8 / 7.3 / 11.1 / 13.6 m (the plateau 2 m low). | The WORLD-SHAPE plan (AUDIT.md). Two input tests failed with it in block 3: travel ch. 10's walk to Hesk and occluders (b). The height part goes 75.2 → 80.2. | +1.0 | M–L |
| 8 | The stone house's upper door (S17): our nearest door is 11.4 m south of it, at (−25.1, −31.5), 6.2 m up. | A door on the stone house's north side, upper level. | +0.3 | S |
| 9 | The museum is one building; the original's is a group of four (bodies 59–63) at (−78.7, 40.7). | Its annexes beside it. | +0.4 | M |
| 10 | Railings and bollard runs: 3–5 per cell in the original, few counted in ours (several of our railings have their collider off). | Mostly measurement. Check the placed PROPS rails by eye before changing anything. | ≤ +0.8 | S |

Surplus, no fix proposed: 24 cells have more than twice the original's dressing, worth 5.7 points. The largest is
the harbour, with 39 props and 4 lamps where the original has 6 props. Thinning it would make the art worse, and
twelve years of trade explain it.

**Citadel batch (step 2), target ≈ 85:** fixes 1 + 2 (the west islet: the dome, the figure, the ground), 3 (Bug
Street's pair) and 4 + 5 + 8 (the plateau's doors and the stone house's upper door). Expected gain is +7.3 to
+7.6, giving about 85. Sizes: one M (the islet), one M (Bug Street, with the occluder test), three S. Optional
after: 6 (the coast, +1.6, M) and 7 (the terraces, +1.0, M–L, with the two tests).

## Desert Island: 39.4 → 85.0

**Step 3 (the Desert batches A and B, both in one step), per part, before → after** (same scorer and references; game
0.31.0 after the Citadel batch, 2026-10-26; the scorer now boots with `?allregions`, since LAZY-REGIONS it measured
an unbuilt desert as sea; `docs/lba3-production/reviews/WORLD-80/desert/scores-{before,after}.json`,
`desert-overlay-{before,after}.png`, screenshots `before/` and `after/`):

| Part | Weight | Before | After | What changed |
|---|---|---|---|---|
| Coast | 30 | 90.0 | 97.7 | the original's beaches stand above the sea (the ground only drops under the water where its shore ends: desert.js's shore cap applies at sea only); land 26,833 → 29,847 m² against 29,237; what is left is our places over the original's sea (the pier's foot, the camp's inlet) and the 1 m resampling of its 1.71 m grid |
| Height | 20 | 0.0 | 78.2 | the ground is the original's heightfield outside our places (desert.js heightFn: `origGround`), lift 2.2 → 0.0 m, MAE 2.29 → 0.40 m; the three invented mesas are gone; our places keep their level within their keeps (Kesh, the oasis, the pump, the pier road and the dig at the old 5 m; the camp 3.0, the glider field 1.8, the condenser hall 1.6 and the post's pad 1.6 at the original's ground there) and blend over 6 m; the tracks and the yacht's routes follow the original's terraces, smoothed over 6 m so a track climbs them as a slope |
| Landmarks | 30 | 15.9 | 88.1 | every missing building, figure and door built at the original's place (0–1.6 m): S40, S28, the compound's two houses, the great hall and the mask, body 49's house, S113, the islet's door, the two figures, the twin pillars, the gateway, the islet's figure; Kesh's houses registered (S35 4.2 m, S39 1.8 m, the west house 12.1 m, S38 21.8 m); still off: the village centre (15.1 m, 60 %) and S36 (its place is our oasis basin), the S10 house (the post's east cabin, 12.9 m) |
| Objects | 20 | 38.0 | 68.3 | 116 → 231 counted: the corral's 29 fence pieces on the original's lines, the compound's walls, the new houses, figures, pillars, palms, jars, crates, barrels, sacks and rocks in the cells the original fills |
| **Score** | | **39.4** | **85.0** | |

**What was built** (our kit and Kesh's adobe, from the original's numbers only: `src/game/desertold.js`, registered with
fitAdd / spots, the door of each shut, "Locked."):

- **The School of Magic** (the user's decision): the "high façade" (body 43) is the mask — a 6.7 × 3.3 m, 8.6 m tall
  grey stone face at (−69.1, −72.7) looking east, set in a rock wall (a cliff slab and boulders behind it), deep brows,
  glowing orange-red eyes, the School's door carved in its chin with a stone forecourt before it; the great hall (body
  48, 10.2 × 7.0 m, 6.7 m tall) at (−67.8, −61.7) stands in the sunken pool the original's numbers have there (its 0 m
  hollow, 2.3 m below the rim), on a stone plinth rising out of the water, crenellated, its Moorish arched doorway
  (blue tiled surround, orange edge) opening north onto the pool's rim walk; a water channel at the mask's foot with
  an arched stone bridge in front of the door, down two steps onto a paved plaza (0.3 m, the original's level) with a
  palm, low tiled walls, a wooden signpost and two horned pillars; the white blocks (bodies 46) and fallen cubes (45)
  on the mask's terrace, the horned pillar of body 32 to the north; a stair up to the rim walk, parapets along the
  pool. The School's door spot moved from the invented mesa at (−70, 41.5) to (−66.3, −72.7) (wizards.js WIZ.school,
  from desertold.js SCHOOL_SITE / SCHOOL_DOOR); the School's interior, Rector Hougo and Ker'aooc are unchanged
  (tests/wizards.mjs walks in and out). A new sand track leads there from the plaza: north past the oasis's rim,
  through the gap in S40's garden wall, over the land bridge and along the pool's east rim. (The School's face had
  not been built at all since LAZY-REGIONS: `buildSchoolFace` had lost its caller, so its door was unregistered;
  desert.js builds it with the island now.)
- **Around Kesh**: the big house S40 (6.1 × 7.6 m, two storeys, its door west with the original's 3 m stoop, body
  28), its garden wall on the original's panel line (31), the horned pillar (32), the palm (9/10), a hand cart
  (16/17); the tall building at S28 (2.5 × 7.2 m, 8.4 m) as a stone-and-adobe tower on the floor of its hollow under
  the ridge, its roof at the ridge's top, its door west; the house of body 49 (7.5 × 7.7 m) north of the pool; the two
  5.2 m hooded stone figures on the knoll and the promontory west of the village (bodies 0, 33).
- **North of the post**: the twin 5.2 m horned pillars (80, 81) with their low stone walls; the old corral: 29
  post-and-rail fence pieces at the original's places and turns (78), its gate open (84), three troughs (75, 77, 91),
  the water tank on posts (83), the lean-to (85–90), three palms.
- **The north-east**: the walled compound S24 — the main house (94, 6.7 × 7.4 m) and the second (95, 4.5 × 7.4 m)
  facing each other across a paved yard closed by the two walls (98, 99) with a well (100), the south door of S24
  shut, two pillars (32) and five palms.
- **The gateway** (64) over the track's last leg to the dig: two 7 m stone piers 4.5 m either side of the track's line
  (its centre 1.6 m from the original's, so the yacht and Twinsen pass between them), a 9 m carved lintel; the posts
  are taller than the original's 5.2 / 6.1 m so Hesk's yacht clears the beam at its stop under it.
- **The hut on the north-west plateau** (S113, 6.1 × 5.1 m) on the plateau's brink, on a plinth down the slope.
- **The islet**: its door (S183) in the cove's cliff, the 4.6 m figure (104) and the 4 m pillar (103) before it; the
  cove's floor held at 0.75 m (the original's is at the waterline) so they stand dry.
- Kesh's village did not move (12–17 m south of the original's): the original's north houses stand where our oasis
  and pump are, and its spots are pinned by the chapter 4 and desert-life tests; said so above.

Not built: S36 (its place is the oasis basin), S10 / S127 (inside the post; the east cabin is named for it, 68 %).
Not done: the village's move. The height part's remaining error is the village plateau's rim (3 m over ~800 m² west
and south-east of Kesh) — the price of keeping Kesh at 5 m.

**Step 1's measurement (kept as recorded):**

What matches: the coast (IoU 0.90, since WORLD-SHAPE). Kesh is near the original's village: one house within 5 m,
three more 12–17 m off, the village's centre 15 m off. Everything else of the original's is missing or reshaped.
Our places were placed first and the original's coast was fitted round them (WORLD-SHAPE). Coordinates below are
local (world − 3400 in x).

| # | Difference | Fix | Gain | Size |
|---|---|---|---|---|
| 1 | The ground is ours, not the original's. Our plain stands at 5 m with dunes, plus three invented mesas: the north one at (−6, −70) is 10 m too high over 1,158 m²; the School of Magic's at (−70, 52) is 4.6 m too high over 918 m²; the east one at (86, −26). The original's low ground rolls 0.3–3 m and its high ground reaches 11.4 m. MAE 2.29 m on a 1.90 m spread. | Ground = the original's (plus the lift) outside our places, our places flat within their keeps (desert.js `KEEP`), the invented mesas retired. What-if on the dump: height part 0 → 90.9. Retiring only the three mesas: −20.7 → 23.3 raw. Open question: the School's face needs a cliff (see #4). | +17 to +18 (mesas only: ≈ +4.7) | L |
| 2 | 2,706 m² of the original's beach lies under our sea, a 1–2 m red rim all round (the overlay). | Keep the shore's last metre above the waterline where the original has land (desert.js shore profile). IoU 0.90 → ≈ 0.99. | +2.5 | S–M |
| 3 | Missing round Kesh and west of it: the big house S40 (7.6 × 6.1 m, 5 m tall) at (−35.5, −38.9); the 8.4 m tall building at S28 at (4.0, 1.3); the village house S36 at (−45.4, −16.0); two 5.2 m standing figures or pillars at (−117.8, −31.9) and (−83.3, −31.9). Kesh's houses stand 12–17 m south of the original's houses. | Build them in Kesh's adobe style, twelve years on. Move Kesh's houses 8–12 m north onto the original's, or re-fit `DESERT_FIT` with the village on Kesh as one more constraint (check that our places stay inland). | +2.3 +2.3 +1.2 +2.4, Kesh +2.1, objects ≈ +2.4 | M–L |
| 4 | Missing in the north-west: a great hall (7.0 × 10.2 m, 6.7 m tall) and a high façade beside it (6.7 × 3.3 m, 8.6 m tall) at (−67.8, −61.7) / (−69.1, −72.7); the house of body 49 at (−47.8, −76.9); the house on the north-west plateau (S113) at (−115.3, −99.6). | Build them. The façade with a hall behind it may be the School of Magic's face: check it against the user's reference image. If it is, move the School there, which also retires its mesa. | +2.3 +1.2 +1.2 +1.2, objects ≈ +0.5 | M–L |
| 5 | Missing in the north-east: the walled compound (S24) with two houses (7.4 × 6.7 and 7.4 × 4.5 m) and walls at (40.2, −119.3) / (52.4, −118.2); the twin 5.2 m pillars at (55.7, −54.1); the original's fence runs (23 fence pieces in one cell at (50, −60)); the house at S10/S127 at (48, −42.8), inside our research post. | Build the compound and the pillars; lay the fence runs. Let the post's office take the S10 house's place and register it as that landmark (an addition may take an original place only when named explicitly). | +2.3 +1.2 +1.2 +1.2, objects ≈ +4.3 | L |
| 6 | The islet: its door (S183) and a 4.6 m figure at (117.8, −120.8), and its ground 3.6 m low. | A shut door, the figure, the islet's ground from the original's. | +1.2 +1.2 +0.9 | S–M |
| 7 | The gateway: two posts (5.2 and 6.1 m) under a 9 m beam at (43, 26), in the dig's area. | An arch at the dig's entrance (the dig is ours; the gateway stands where its approach is). | +1.2 | S |

**Desert batch A (step 3), target ≈ 59:** #1 (the ground) and #2 (the beach). Size L. Tests: chapter 4/5 (the
dig's discs, the post's stealth), desert-life, travel, containers, worldfit, the ADV-2 pump.

**Desert batch B (step 4), target ≥ 80:** #3 (around Kesh) and #5 (the north-east compound and fences). These add
about +22 for ≈ 81. Size L.

**Optional batch C:** #4, #6, #7 for about +10 more (≈ 90). The School of Magic's question (#4) goes to the user
first.

## The other islands

- **Zeelich's islands** are all at or above 84 now. Otringal 92.6, Knartas 94.7, Mosquibee 84.5, Celebration 92.1,
  Under Celebration 91.3, CX 92.2, the Platform 89.2. Their ground and buildings are the original's numbers, every
  original building within 1 m. What remains is the objects part, which here is a lower bound. Mosquibee's pole
  clusters (49 tall things in one cell) have no colliders, so they are not counted. **No world fix proposed.** Scorer
  step (S, a small code change): let zislands.js keep its list of drawn pieces for tools, as worldfit.js does, so
  that the objects part counts what is drawn.
- **The Lift Dock** (37.7, partial). Its decks are its ground, while the original stores them as objects. The
  measure compares deck parts as buildings, and our merged decks match them 10–18 m off or not at all. This is a
  limit of the measure, not a finding. Scorer step (S): compare the decks as ground. No world fix proposed until
  then; a look by eye is the better judge.
- **The Hamalayi** (27.4, partial). LBA2 has no Hamalayi. LBA1's is eight separate 55 m ledge scenes with no common
  map, so only the amount of walkable ground and its heights are compared. Ours has 2.7× the ground and four times
  the climb. That comes from the story's lift, ledge and ridge, not from a shape error. Reaching 80 would mean a
  story change (about 12,000–16,000 m² of ground, 90 % within 6–8 m). **Decided by the user (26.10.2026): it stays
  ours, larger by design, with a few LBA1 places in it** (the 80 target does not apply). Four are in
  (`src/game/props-lba1hamalayi.js`, placed in `hamalayi.js`; numbers read from the grids and actor lists of scenes
  65, 69 and 9, 0.867 m a cell and 0.434 m a layer, no brick or picture used):
  - **The gantry** (scene 65): a stone causeway 24 m long, 1 cell wide and 4.8 m up, ending in a T with a lantern block,
    and at its head an arcade of three piers (2.6 × 4.3 × 6.1 m) with two lintel spans (3.5 m wide, 5.2 m under).
    The only piece of that scene one cannot mistake. East foothills, arcade at (50, 62), causeway running east to
    x = 77. A stair of 12 steps up the arcade's west face, two steps down to the deck, a 0.66 m kerb (the original
    had none) and a deck 1.8 m wide (the original 0.87) so that it walks. A prayer-flag line from a mast on the
    platform to the lantern. You can walk under the arches and under the deck.
  - **The old gate** (scene 69, beside which a tripod gun's clone stood): two pillars 0.87 m square and 4.8 m tall,
    4.3 m apart, a lintel at 3.5–4.3 m and a block on its middle. Across the walk from the landing to the gorge at
    (−5.5, 58), the opening centred on it (the walk is 3.6 m wide, the opening 4.3).
  - **The rebels' camp** (scene 9, where LBA1's camouflaged Rabbibunny clones, bodies 66 and 67, and its camouflaged
    Sphero, 68, stand together): a platform 5 × 8 cells (4.3 × 6.9 m) raised one layer on ramped edges, the three
    blocks 1.3 m high of its middle as snow-white tents with camouflage patches, the low one beside them as a stack
    of sacks, and the three sentries' spots as crescents of snow blocks. West of the landing at (−47, 64). No people
    in it: our story has no rebels here.
  - **The waystone** (scenes 9 and 65, twice): a pad 4 × 3 cells with a stepped plinth round a stone 2.2 m taller, a lit
    niche in its face. On the monastery terrace's east snowfield at (62, −50).
  Nothing the story uses is moved: no spot, path, NPC, the lift, the ledge or the ridge is touched, each place stands
  on bare snow clear of them (the region's own check, `R.dress.log`, stays empty), pines and rocks keep out of
  them, and the random streams are unchanged. Cost: four merged meshes (stone, snow, lit glass, canvas), about
  14,000 triangles, +5 to +7 draw calls in the Hamalayi (the shadow pass included) and no new shader program. Not
  taken from LBA1 (no number in them that reads as a place we could use without breaking the chapters): its eight
  ledge scenes' own layout, the cliffs' switchbacks (our trail has them), the colonnade of scene 71.
- **Zeelich (the terminal island)**: not comparable. No original island has its layout. It is our story hub (the
  spaceport deck, the Esmer street, the mills, the depot, the drill platform) built from LBA2's Esmer pieces, and its
  ground is physics bricks over the cloud sea.

## Order of work

1. ~~Citadel batch (dome, figure and islet ground; Bug Street's pair; the plateau's and the stone house's doors):
   77.5 → ≈ 85.~~ Done (step 2): 77.5 → 84.9.
2. ~~Desert batch A (ground and beach): 39.6 → ≈ 59.~~ Done (step 3, with B).
3. ~~Desert batch B (Kesh's neighbours and figures, the north-east compound): → ≈ 81.~~ Done (step 3): 39.4 → 85.0, batch C's School, body 49, the islet and the gateway included.
4. The scorer's two steps for Zeelich's islands and the Lift Dock, then a look by eye. The Hamalayi is decided (the user, 26.10.2026): ours, with four LBA1 places
   added (the Hamalayi bullet above).

Rerun `tools/worldscore.mjs` after each batch and record the before and after here.

## Diagrams

`docs/lba3-production/reviews/WORLD-80/<island>-overlay.png`, drawn from the numbers. Each is in the original's
frame with north (−z) up; Desert Island's is the original's own turn, ours being turned 275° from it.

- **Left panel, outlines.** White: land in both, shaded by the original's height. Red: the original's land that is
  sea in ours. Cyan: our land where the original has sea. Hatched grey: twelve years' additions. Yellow rings: the
  original's landmarks, with a magenta dot and line to ours; a white ring is a missing one.
- **Right panel, height difference.** On land both have, after the lift: red where ours is higher, blue where ours
  is lower, full colour at 4 m.
- The bar at the bottom left is 50 m.

Files: citadel, desert, otringal, knartas, mosquibee, celebration, undergas, cxislet, platform, liftdock.


## The user's decisions (26.10.2026)
- **Hamalayi:** stays our own, larger region by design, but with a few places clearly recognisable from LBA1's Hamalayi ledges. Its 80% target does not apply. Instead, pick 3–4 LBA1 spots by their numbers (tools/worldscore/ref/hamalayi-lba1.json) and rebuild them in our style inside our layout. **Done:** the gantry (causeway and arcade), the old gate, the rebels' camp and the waystone (the Hamalayi bullet under "The other islands" above).
- **The School of Magic (the user, with a reference frame from a Let's Play, kept in the scratchpad only):** leaving the village, turn right and it is there.
  - **How it looks:** a squat stone block with a crenellated roof and a Moorish arched doorway (blue tiled surround, orange edge). It stands on a paved stone plaza with a palm, low tiled walls and a wooden signpost, by sand and cliffs.
  - **Two candidates in the numbers:**
    - the north-west hall and high front at (−67.8, −61.7) and (−69.1, −72.7), about 37 m west of the village, with no door zone;
    - the building with three doors into one scene (24) at (80–87, 47–52).
  - **Settled by a second reference (26.10):** the School's face is a giant stone mask set in a canyon wall.
    - Grey, with deep brows and glowing orange-red eyes, and a carved door in the chin.
    - Beside it stand a white block or tomb and horned stone pillars, with an arched stone bridge in front.
  - **This is candidate 1:** the "high façade" (6.7 × 3.3 m, 8.6 m tall) at (−69.1, −72.7) is the mask, and the great hall beside it (7.0 × 10.2 m, 6.7 m tall) at (−67.8, −61.7) is the arched stone block from the first reference.
  - **The Desert batch:**
    - moves our School of Magic there, built in our style: the mask face with its door, the hall, the pillars and the bridge;
    - retires the invented mesa at (−70, 52);
    - and keeps the story's School scenes working.
