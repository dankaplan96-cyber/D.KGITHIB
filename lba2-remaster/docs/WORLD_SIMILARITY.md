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
python3 -m http.server 8179 &                      # the game, served
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
| **Desert Island** | **39.6** | 90.0 | 0.0 | 15.9 | 38.9 | IoU 0.900; land 29,237 / 26,833 m²; lift +2.2 m, MAE 2.29 m on a 1.90 m spread; 315 objects / 119 |
| The Hamalayi (against LBA1) | 27.4 (partial) | 37.3 | 12.7 | — | — | walkable 31,825 m² ours vs 11,860 in LBA1's eight scenes; 90 % of it within 25.5 m of the lowest level vs 6.4 m |
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

## Desert Island: 39.6

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
  story change (about 12,000–16,000 m² of ground, 90 % within 6–8 m). **Ask the user** whether the Hamalayi should
  follow LBA1's ledges or stay ours by design; until then, no fix proposed.
- **Zeelich (the terminal island)**: not comparable. No original island has its layout. It is our story hub (the
  spaceport deck, the Esmer street, the mills, the depot, the drill platform) built from LBA2's Esmer pieces, and its
  ground is physics bricks over the cloud sea.

## Order of work

1. ~~Citadel batch (dome, figure and islet ground; Bug Street's pair; the plateau's and the stone house's doors):
   77.5 → ≈ 85.~~ Done (step 2): 77.5 → 84.9.
2. Desert batch A (ground and beach): 39.6 → ≈ 59.
3. Desert batch B (Kesh's neighbours and figures, the north-east compound): → ≈ 81.
4. The scorer's two steps for Zeelich's islands and the Lift Dock, then a look by eye. The Hamalayi waits for the
   user's answer.

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
- **Hamalayi:** stays our own, larger region by design, but with a few places clearly recognisable from LBA1's Hamalayi ledges. Its 80% target does not apply. Instead, pick 3–4 LBA1 spots by their numbers (tools/worldscore/ref/hamalayi-lba1.json) and rebuild them in our style inside our layout.
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
