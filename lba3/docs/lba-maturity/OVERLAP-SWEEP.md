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
