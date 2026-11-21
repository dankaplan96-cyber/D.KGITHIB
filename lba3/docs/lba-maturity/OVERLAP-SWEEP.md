# OVERLAP-SWEEP — every area and room, by machine (the user, 17.11, P65)

"Again things overlapping — go over the whole game and check." The picture: Zeelich, Mill Lane Steps' ferry landing
(U-1, `skyferry.js`): the stage's planks ran on into the ground beside it.

Status: **Automated runtime only** (SwiftShader, headless, a booted game, every area built; nobody has played these
places for this job). Base `ccr-c1c2c4b9-dep6ed` (3428689c). Machine heavily loaded (load 20–29, 1–4 GB free): pages
crashed now and then; the sweep retries a batch, the picture tool relaunches.

## How it is measured — `tests/overlap-sweep.mjs` + `tests/lib/sweep.js` (rerunnable)

Every area and room (144: Citadel and its interiors and LBA1 places, Zeelich and its rooms, the nine isles and their
homes, Desert Island, the Hamalayi, the underground, Ballastra W-1…W-3 and their rooms) is built in five browser batches.
For each, every shown static mesh (instances one by one) becomes world triangles; characters, sprites, foliage cards,
draw-batch copies, blob shadows and see-through decals are left out, and so is anything that moves in 0.6 s of play
(people's props, dogs, birds, shuttles, sails). Each mesh is cut into its connected parts (one box, one plank, one rock).
A grid of vertical rays (0.25 m outdoors, 0.2 m indoors) meets them; a closed part is an interval on a ray.

| | what fails | measure |
|---|---|---|
| (a) through | an instanced piece (crates, barrels, kerbs, scatter) ≥ 20 % inside another object's part, ≥ 8 cm deep, ≥ 3 rays, the two of different looks | vertical overlap of the intervals; + place-scan `inside`/`wall` and worldfit's façade overlaps (PLACE=1, WORLDFIT=1) |
| (b) coplanar | two different-looking surfaces facing up within 1.5 mm on ≥ 4 rays (0.25 m²), ≥ 2 rays with nothing opaque over them; the terrain counts as a surface | + worldfit's coplanar triangle pairs ≥ 0.15 m² (walls too) |
| (c) sunk / floating | a cluster of touching parts (boxes within 1.5 cm) whose lowest surface is 3 cm … 1 m over whatever is under it outside the cluster on every ray; a small cluster (< 2.5 m) wholly ≥ 5 cm in the ground | + worldfit's buildings (gap under / ground over the plinth) + place-scan float/sunk |
| (d) into the ground | a part's flat top under the ground (≤ 25 cm) or flush with it (≤ 3 mm) on some rays where the ground is seen, above it on others, ≥ 0.12 m² | the ground: the terrain grid, or Zeelich's island slab |
| (e) on paving | (d) where the ground over a thin paving part is painted grass, dirt or sand; foliage (grass, flowers, tulips: Citadel's pool tiles too) standing on a part's flat top or on terrain painted cobbles; an outdoor see-through decal lying on a part | |

Known (left) findings are in the test's `KNOWN` list, each with its reason; anything else FAILS. Env: `OUT=dir` keeps
each area's raw result (`RESUME=1` skips those), `ONLY=a,b`, `SKIP_RAYS=1` judges a kept `OUT` again, `REPORT=file`.
Pictures: `SHOTS=dir` in the batch is heavy on a loaded machine; the pictures here were taken with the placement views
(`PLACE.stage` + `PLACE.close`, tests/lib/placecollect.js), one region per browser.

## Progress (kept for a context limit)

- Done: the sweep (tests), the user's spot fixed, a full baseline sweep, pictures of the Citadel and Zeelich findings.
- Running: the sweep on the base build and on this branch with the final rules (the chain in /dev/shm/t978-tools), then
  last-ferry, chapter1, chapter2, zeelich-life, door-sweep, camcitadel, world-consistency, overlaps, desert-life.
- Next: the counts before → after below; the open list's triage (Hamalayi's Lhar plinths, the isles, the desert).
- P65-2 (21.11): done, below.

## P65-2 — the open list triaged, counts before → after (21.11)

Status: **Automated runtime only** (SwiftShader, headless; nobody has played these spots for this job). Base
`ccr-c1c2c4b9-dep6ed` d6551c8d. The same 144 areas, the same rules. "Before" is the base build, "after" is this branch.
"Looked at" means a play-camera picture (Twinsen put beside the spot, the game camera settled) plus a nearer look from the
camera's side (captures/overlap-2/: `*-before-*` / `*-after-*` from the same spot and camera, `looked-at-*.jpg` the
triage sheets).

Open / known findings (a through, b coplanar, c sunk or floating, d into the ground, e paint or plants on paving):

| | a | b | c | d | e | open |
|---|---|---|---|---|---|---|
| the ray sweep (the test's default), before | 0 / 2 | 11 / 2 | 47 / 87 | 5 / 289 | 19 / 4 | **82** |
| the ray sweep, after | 0 / 2 | 0 / 13 | 0 / 128 | 0 / 294 | 0 / 23 | **0** (PASS) |
| + place-scan + worldfit (PLACE=1 WORLDFIT=1), before | 5 / 90 | 150 / 2 | 57 / 168 | 5 / 289 | 19 / 4 | **236** |
| + place-scan + worldfit, after | 0 / 96 | 128 / 15 | 0 / 218 | 0 / 294 | 0 / 23 | **128** |
| of these, the Hamalayi + Desert Island + the isles, before → after | 0 → 0 | 17 → 0 | 54 → 0 | 5 → 0 | 11 → 0 | **87 → 0** |

15 findings went away through the fixes; the rest are on `KNOWN` with their reasons. The 128 still open are worldfit's
coplanar triangle pairs in Ballastra (ballastra 49, bl_arches 51, bl_gardens 28, up to 14 m², mostly stone on stone of
one colour). They are not triaged here: they belong to the expansion's owner (EXP), behind its own release gate, and the
default ray sweep does not report them. place-scan: PASS before and after. worldfit's own verdict fails before and after
on the same five façade findings (Citadel's neighbour house, three Zeelich door lamps, a corner window). The overlap
sweep now lists them as KNOWN, looked at; worldfit's own list is unchanged.

The "Lhar plinths" from the previous run: no Lhar finding is open now. The houses' walls stop under the eaves band
(OVERLAP-1, `WALL_DROP`), and no plinth of Lhar's is flagged by the rays or by worldfit.

### Fixed (at the source; nothing added, no new draw calls)

| Where | Finding | Cause | Change |
|---|---|---|---|
| Hamalayi, the landing field: Hesk's glider | floating, 25 cm under the fuselage | `hamalayi.js`: the group set 0.2 m over the ground at its middle | set 0.06 m under it: the belly rests in the snow |
| Hamalayi, Lhar: the drying rack | floating, 8 cm under its downhill legs | `put()` takes the ground at the piece's middle; the rack stands on a slope | its base on the lowest ground under its four splayed feet |
| Hamalayi, the monastery yard's walls | 4 coplanar pairs (rubble on rubble, 0.27 m² each, worldfit) | `props-mountain.js` `dryWall`: a straight run's segments overlap 12 cm, their battered faces in one plane | every second segment 2 cm thicker (all of the game's dry walls; invisible otherwise) |
| Desert, Kesh: the hand cart | floating 83 cm and sunk 46 cm (one wheel each) | `desertold.js`: set across the dune's flank (its wheels 1.94 m apart in height) | moved 4.9 m to the corner of house S40 by its garden wall, where the ground under both wheels is level (1 cm); set on its wheels' ground, the wheels against the bed (10 cm behind it they held nothing up) |
| Desert, the research post's gate | 4 coplanar pairs (chain-link on chain-link, worldfit) | `desert.js`: the sliding leaves in the fence's own line, sharing the next panels' plane (0.56 m shut, the whole leaf open) | the leaves run 12 cm outside the line, past the posts |
| Desert, the gateway's two peach posts | coplanar (peach and grey, 0.91 m², worldfit) | `desertold.js`: each post's top in its cap's top face round the beam's foot | the post ends 5 cm inside its cap |
| Undergas: the table by the cliff path | a crate floating 65 cm; the slab with two potted plants 32 cm over its crate | `zislands.js` `seat0`: the base crate went down to our ground, the slab and plants (not seated shapes) kept the original's height; the crate beside it, over 0.8 m off, was left as it was | a slab or plant lying on a seated thing moves with it (the instanced plants use the seated height); a thing over 0.8 m (≤ 1.2 m) over everything under it is set down too |

Pictures: `ham-glider*`, `ham-dryingrack`, `ham-monwall-coping`, `des-oldpost` (the cart's old spot) and `des-cart-new*`
(the new one), `des-fence`, `des-stoneplaster`, `und-crates2/3`. The coplanar fixes (walls, gate, posts) do not show at
this size: they are flicker, not shape.

### Left, with the reason (each on `KNOWN` in tests/overlap-sweep.mjs)

- **Hamalayi**: the hall's gilt finial 5 cm over its ridge, 14 m up (not seen); a story barrel 3 cm over the slope; a
  riverbed stone set 7 cm in (by design); the waystone cairn's base faces (story/depth.js, its owner's; not seen).
- **Desert**: the pool mask, tower S28 and the school mask set into the rock or the pit, and the school hall rising out
  of the pool (worldfit's plinth model, looked at); Kesh house 4's back corner (17 cm, not seen); the post cabins on
  their pad (not a gap); two doorsteps with sand drifted over a corner; an old paving edge 8 cm under the cobbles; the
  post's desk equipment (its legs thinner than the rays).
- **Isles**: the cloud sea meeting the islands' foot far under their edges (behind two cloud layers); planters' plants
  and Otringal's gold plants and frond trees (stems thinner than the rays); two street lamps at the original's places on
  banks (Knartas 12 cm; Otringal 62 cm at a brink, its foot on the top on the uphill side, looked at); the original's
  jars seated on the lowest ground (3-11 cm); Old Watch's fallen blocks bedded in the turf and a fallen-dome block on the
  slope; the orchard's and Mosquibee's level flower beds on slopes; Otringal's retaining wall flush with its bank, a hall
  knob 18 m up, the beached barge; Platform's palisade boards, a cage lamp, the lift's lever post 42 cm into the rise, a
  bench end; an Undergas path slab's edge; the Celebration portal's threshold (2 cm).
- **Elsewhere** (open in the ray sweep): eight single grass cards at paving edges in the Citadel; the arena's wall ring;
  Ballastra's steps' landing, a far skyline district and a chimney cap; the pump room's plate, the workshop's drafting
  sheet, Zeelich's platform rail (all looked at, not seen).

### Tests (Automated runtime only)

On this branch, SwiftShader, the machine under load (load 6–13, another worker's suites running):

| Suite | Verdict |
|---|---|
| overlap-sweep (rays, the default) | PASS: 0 open (82 before) |
| overlap-sweep PLACE=1 WORLDFIT=1 | FAIL only on the 128 Ballastra worldfit pairs (EXP's); 0 open elsewhere |
| place-scan | PASS (before and after) |
| worldfit | FAIL, the same 5 façade findings before and after (not changed here) |
| hamalayi-life, desert-life, isles-bar, desert-bar, island-people, overlaps, work-step | PASS |
| slidetraps | FAIL: the Citadel's spots near (-32.7, -25.8). The base build d6551c8d fails identically (same spots, same counts), and nothing in the Citadel changed |
| world-consistency | FAIL: a static check of `story/balances.js:144` (a `startTransition` not on its allow-list). No story file changed here |
| save-migration | PASS (the rerun, 65 min under load; the first run hit my 40-min limit while still loading its first fixture) |

Performance: no draw call, mesh or material added. The cart, the gate and the posts keep their parts; dryWall's segments
are merged as before (more distinct geometries in the merge, not more draws); the seating changes move existing pieces.
Source-reasoned, not measured. Shipped files: 509 (tools/game-files.mjs), unchanged.
