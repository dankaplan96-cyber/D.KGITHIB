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

## OVERLAP-3 — Ballastra's 128 coplanar pairs, Corla's kiosk, P58's leftovers (night 21–22.11)

Status: **Automated runtime only** (SwiftShader, headless, a machine shared with two other workers, load 6–11). Base
`ccr-c1c2c4b9-dep6ed` a095a3f6, origin merged at 47e89797. Ballastra is past chapter 2 [>ch2]. Nobody has played these spots.

### Ballastra [>ch2]: worldfit's coplanar pairs ≥ 0.15 m², before → after

`AREAS=ballastra,bl_arches,bl_gardens node tests/worldfit.mjs` (the overlap sweep's WORLDFIT=1 child, these areas only):

| area | before | after | all sizes (visible clusters), before → after |
|---|---|---|---|
| ballastra | 49 | **0** | 135 → 45 |
| bl_arches | 51 | **0** | 181 → 100 |
| bl_gardens | 28 | **0** | 128 → 141 (a row of new 0.04 m² clusters at the aqueduct's coping, removed in the final build: below) |
| every cluster's m² | 263 | 11.6 | |

Every pair was fixed at its source; none went to `KNOWN`. No draw call, mesh, material or file added (the copings are
the same boxes raised a few millimetres; the panels the same outlines cut differently).

| Where | Cause | Change |
|---|---|---|
| all three areas: every quay, path, plaza, terrace and rig platform (`mass`), the parapets | a mass's cap overhangs it by 7–8 cm, so two masses side by side had their caps' tops in one plane along the joint (stone on stone, other UVs: a flickering seam), and so had two parapet runs at a corner | `look.js capLift()`: each cap is raised 5 mm over every cap it already overlaps at its height (0 / 5 / 10 mm; the pave stands 25 mm over the top; colliders unchanged). The Speaking Steps' platform is seeded so the quay's cap clears it |
| bl_arches: the west and north dykes | the two masses overlapped 4 × 2 m: every face twice (the pave 13.9 m², the wet course 6.2 m²) | the west dyke starts at the north dyke's face (its collider unchanged) |
| bl_arches, bl_gardens: parapet corners | the front runs ran into the side runs: one block drawn twice | the runs stop at the side runs (arches `par`; gardens `parapet` by the east terrace) |
| the shed and the customs hut (harbour); the row's houses (arches) | a door through the tiled dado or the stained storey: `panelGeo` cuts it as a hole on the edge, leaving the edge's face across the doorway and the boards' door sill in the plane of the dado's top | `build.js cutPanel()`: an opening through an edge is a notch (or a gap, bottom to top) in the outline; used by `building()` and `tallHouse()` |
| the lift's caisson (harbour) | the walls' tops in the rims' plane, the end walls' faces over the side walls' ends, the rims laid over each other at the corners | walls 2 cm under the rims, end walls between the side walls, rims 2 cm in and side by side |
| the district's houses on the skyline (harbour, 22 pairs, far scenery) | walls' and corner posts' tops in the floor beam's top's plane, seen under the open gables | walls and posts stop 3 cm inside the beam |
| the old pump's A-frame on the pier (arches) | two crossing legs with the same faces | the second leg 4 cm thinner |
| the pier's pilasters (arches) | their tops in the cornice's top's plane | 2 cm lower |
| tide marks on the basin walls (arches, gardens) | the salt line's back in the stain's back's plane | the salt line 1 cm thinner at the back |
| Dunn's door (arches) | the round head's disc in the leaf's planes | the disc 1 cm thinner |
| the aqueduct (gardens) | the glazed copings' outer faces in the arches' side planes | 2 cm proud; the inner face stays where the full channel's water meets it |
| the bank's retaining walls under the leat (gardens) | their backs in the bank's back plane | 2 cm in |

Pictures (play camera, then a near look from the camera's side; before | after; `captures/overlap-3/`):
`a1-dykes-*` (the doubled pave: two flag patterns interleaved before, one after), `h1-caisson-*`, `h2-quaycaps-*`,
`h3-shed-door-*`, `a2-row-door-*`, `a3-terrace-caps-*`, `g1-plaza-caps-*`, `g2-rig-caps-*`. A coplanar fix is flicker,
not shape: apart from the dykes the stills look alike.

### Corla's kiosk (Citadel, chapters 1–2): FACE-2.md, FACE-3's open item

`talkAhead` on an NPC def (main.js `findInteractable`, one isolated line in the people loop, not the frame loop): Talk
only from at least that far ahead of the way the NPC is placed facing. Corla: 0.7 m (story/stands.js), the hatch side.
From the back corner and the side walls: no prompt.

### P58 leftovers: Twinsen hidden at the station

The desktop's walk (`docs/lba3-performance/HARDWARE/2026-11-21-p58-hw/p58walk.mjs`) run headless here
(`p58walk-headless.mjs`, results `p58-*-sw-{before,after}.json`). The headless before-run reproduces the desktop's
after-run exactly (Fixed: 2087 hidden frames, 39 runs, 59.2 s; Follow: 698, 19, 14.2 s): the walk is deterministic.

- Longest left, Fixed (LBA2): 8.2 s, 5 m south of the beam pad (design 54.95, 47.35), behind the arch's south side and
  horn. The arch's volumes were camOnly (G1-CAM): the search and the hidden test passed through them, no new shot rose
  over it. Fix (`island.js`): the two sides with their horns (6 m) are scenery volumes like the huts; the shoulders and
  the top over the ring's opening stay camOnly. Picture: `captures/overlap-3/p58-arch-fixed-view-before.jpg`.
- In the gate passage (under the gatehouse) he is hidden by design (no camera height shows him there); the walk's
  first "wide" target lies in the passage and it stands there until its timeout. Counted apart below.

| walk | hidden frames | runs ≥ 0.4 s outside the gate passage: n, s, longest | in the passage |
|---|---|---|---|
| Fixed, before | 2087 | 35, 53.8 s, 8.2 s | 4, 5.4 s |
| Fixed, after | 2169 | 27, **31.2 s, 3.8 s** | 6, 28.8 s (other shots: the walk's timeouts in the passage) |
| Follow, before | 698 | 11, 6.5 s, 1.3 s | 8, 7.7 s |
| Follow, after | 681 | 11, 6.5 s, 1.3 s | 8, 7.7 s |

Left (open): the nook by the barrels west of the main's drop (design 38.4–38.9, 40.7–41.2): a leg of the pipe bridge's
trestle covers the chest and head rays from the north-east Fixed view (he is drawn by the silhouette pass; up to 3.8 s,
the walk stuck at a ring corner the barrels make unreachable). A volume for the trestle would tip the shot to the
top-down limit over a see-through A-frame: not done. The SE corner by the tower (Follow, 1.3 s): the camera over the
tower's eave at the pitch limit (camera.js's; not changed).

### The harbour strip (slidetraps; world polish)

`citadel-layout.js`: the platform's two south bollard runs stand at the quay's brink (z 43.0, where the ground's level
top ends; `captures/overlap-3/c1-quay-rails-*`): no quay outside the rail, and the gap to the sea wall's north post is
0.45 m (he is 0.9 m wide). slidetraps still places him on its scan spot (−91.67, 44.22) south of that, on the terrain's
bank under the sea wall's paving (the terrain grid slopes from z 43.25; the drawn paving is level to 44.0): unreachable
now, and still its one failing spot. Levelling the terrain under the paving to the wall's face (world.js, the harbour's
sea cut) is the root fix; not done here.

**HARBOUR-BRINK (done after OVERLAP-3; Automated runtime only).** Cause: the harbour's straight sea cuts were soft
(`smoothstep(-0.3, 0.6)` on the distance to the face), so the terrain grid's last row inside a face was lowered (the
yard's south face: 0.44 m, the paving's ground sloping from z 42.9, steep from 43.86) and the bank ran on past the face
above the sea (to z 44.3): a slide there was stopped dead by the sea. Every unrailed brink (the yard's south face west of
the rails, the quay's south and east faces) let him walk onto that bank, slide to the water and be hopped back. Fix:
`world.js` — beside the faces that are built, no grid point inside a face is lowered and the first point out is sunk just
so far that the bank from the last point in meets the sea 0.1 m past the face (−0.45 to −10.7 m by face; the scatter
sees the old ground, `BRINK_OFF`, so no random draw moves); `island.js` — each platform wall run gets the walkable top
the quay's west face has (its top, 1 m in, 0.1 m out past the face, at the coping's height; colliders only, no mesh), and
the lying quay barrel lies at the quay's level. Walked (probe): on every unrailed face he now stops standing on the wall
top 0.15 m past the face, no slide (before: a slide down to the water, then the hop back). `captures/harbour-brink/`:
the bank that showed in front of the yard's south wall under its coping is gone. The south bollard runs keep z 43.0,
their rails now on level ground (2.30, was 2.27); the island's colliders otherwise unchanged (the 5 walkable tops added).
Tests (Automated runtime only): slidetraps PASS (Citadel 43 spots, 0 bad; the scan spot is sea now), citadel-structures,
spaceport-2, world-consistency, overlap-sweep (default), chapter1: PASS.

### Tests (Automated runtime only; this branch with origin merged)

| Suite | Verdict |
|---|---|
| overlap-sweep (rays, the default) | PASS, 0 open; known a 2 / b 13 / c 128 / d 294 / e 23 (as P65-2) |
| overlap-sweep PLACE=1 WORLDFIT=1 | **PASS, 0 open** (P65-2: 128 open, all Ballastra's); known a 96 / b 15 / c 218 / d 294 / e 23 |
| worldfit, Ballastra's three areas | pairs ≥ 0.15 m²: 128 → 0 |
| face-3 (scenes) | PASS (Corla from the hatch 132 px, 36°) |
| face-2-tour | PASS (3 talks; Corla: no prompt from her back corner) |
| citadel-structures, spaceport-2 | PASS (Corla talked to from the path, chapters 1, 4, 5, 8) |
| ballastra-harbor, exp-ballastra | PASS (the harbour's cost 85 main draw calls at the pad) |
| ballastra-arches, ballastra-gardens | FAIL on one check each, the same on the base: the area's room list now has EXP-3's `bl_cradles` / `bl_house`, the tests expect the older lists. Every walk, state and cost check passes (gardens: 30–126 draw calls a view) |
| occluders | PASS |
| slidetraps | FAIL, 1 spot (the harbour's, above) |
| the P58 walk, Fixed and Follow | table above |
