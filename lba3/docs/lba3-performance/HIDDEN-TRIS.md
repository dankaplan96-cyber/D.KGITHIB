# HIDDEN-TRIS (P85): triangles the GPU draws that a player can never see

The user, 20.11: "check whether there are hidden triangles in a small part of the game, to see whether it weighs on
the game." The area: Citadel from Twinsen's yard up the lane to the square with the well, and the house's interior for
comparison.

Labels: **MEASURED** (this probe produced it) · **SOURCE-CONFIRMED** (read in the code) · **INFERRED** (follows from
measurements, not measured directly) · **NOT VERIFIED** (needs real hardware). Every timing below is
**Automated runtime only (SwiftShader)**: a CPU rasteriser in headless Chromium, never the user's GPU.

## Answer in short

- **Share hidden (MEASURED).** On the walk, **60 %** of the triangles the main pass submits are never seen from any of
  the 72 viewpoints (range 53–70 % by view). In the house, **74 %**.
- **Most of that is the normal cost of drawing closed 3D objects (MEASURED + INFERRED):** their back faces (11 %), detail
  smaller than a pixel (18 %), parts outside the view or behind something (11 %). A static cut cannot remove these: they
  depend on where the camera is.
- **Never visible from anywhere: about 20 % outdoors, 20 % in the house (MEASURED).** Buried under the terrain (12 %),
  inside or under a solid (5 %), bottoms resting on the ground (3 %). Indoors the same 20 % is mostly furniture parts
  inside other furniture.
- **Cost on SwiftShader (MEASURED).** Cutting the never-visible-from-anywhere set: −7.5 % triangles and −8 % frame time
  outdoors, −22 % triangles and −31 % frame time in the house. Cutting every never-seen triangle (an oracle no real
  culling has): −33 % triangles and −24 % frame time outdoors. Draw calls: −0 % and −3.7 %.
- **Cost on a real GPU (INFERRED, NOT VERIFIED).** About 0.1–0.3 ms of vertex work on the Vega 8 laptop, plus at most
  ~0.7 ms of fragments (bush and grass bottoms shaded before the terrain covers them). That is ≲ 1 ms of a 17–19 ms
  Medium street frame. The GTX 1050 pays less; the Intel UHD 620/630 roughly double. On this game the GPU limits are
  MSAA, resolution, lamps and the material cost; on battery the CPU's draw submission. Triangle count is not one of
  them (PERFORMANCE_AUDIT §1b, SHADE-COST).
- **Verdict:** the hidden triangles **weigh a little, not much**. **No game change was made.** The one set that is
  certain to be invisible everywhere is too small (~1.5 % of a frame's triangles, below). The larger sets need
  per-camera culling or rewritten builders, for a gain under ~1 ms on real hardware. Recommendations: below.

## 1. Method (`tests/hidden-tris.mjs`, page side `tests/lib/hiddentris.js`)

Conditions: this branch at `43116766` + the probe; headless Chromium 141, SwiftShader (ANGLE), 1280×720,
devicePixelRatio 1, **Medium**, the Follow camera at Medium distance, Classic controls, chapter 1 (new game, prologue
marked done). The machine was shared with two long test runners (load up to ~5 on 4 cores): one browser at a time.
Runs: outdoors 72 views, ~45 min; house 20 views, ~7 min.

**Views.** 18 points of a walk from the yard door to the well (`P.go` from the door at (−46, 74) to the square at (−42,
−4): yard, west yard, garden, east yard, eight points up the lane, the south lane, three sides of the square). Twinsen
faces 4 headings (N, E, S, W) at each, and the camera settles behind him for 1 s. House: 5 points (the spawn and
±2.5 m around it); the room camera is fixed, so its 20 views are 5 distinct pictures.

**Passes, all at the same placements** (camera checked within 5 cm each time, MEASURED: 0 cm):

| Pass | What |
|---|---|
| A | the game as shipped (draw batches on): draws and triangles per pass, by hooking `renderBufferDirect` around one `Renderer.render` (after `shadowCull.update`, the step `Game.frame` does before its render). 18 views timed: 1 warm-up + 3 renders, each waited for with a 1-pixel read |
| B | draw batches off (`DrawBatch.reset`): the meshes the main pass submits in each view. The batches merge sources, so the attribution needs them off. A BatchedMesh (trees, bushes, rocks) is recorded per instance and sculpt drawn, from its indirect list. An InstancedMesh (grass and flower pools, refilled per view) is recorded per instance |
| ID | every triangle of those meshes, put in world space with its own 24-bit id (the "soup"). It is rendered from each view's own camera, drawing only the meshes that view submitted, at 2× the canvas with 4 half-pixel jitters (16 samples per screen pixel). Opaque first. See-through, alpha-tested and non-depth-writing materials come after and never occlude. Each triangle that covers a sample is "seen", front or back face |
| analysis | each never-seen triangle gets one cause, in this order: **buried** (3 corners > 3 cm under the terrain) · **under/inside a solid** (its centre inside a physics collider, 6 cm in) · **bottom on the ground** (faces down, < 30 cm over the ground) · **never front-facing** (single-sided and turned away in every view that had it in the frustum) · **outside every view** (its mesh was submitted but the triangle was never in a frustum) · **tiny** (< 1 px at its largest) · **occluded** (the rest: behind walls, cliffs, other props from every sample). Sources named from `tests/lib/placerec.js` (the builder and prop of each piece, each merged part by its box) |
| C | prototype: the never-seen triangles cut from the index buffers ("geo": only buried / solid / bottom; "all": every never-seen one). A triangle of a shared geometry is cut only if no judged object using it shows it. A BatchedMesh sculpt's triangles are made degenerate. Batches rebuilt; the same views measured |
| D | per view, batches off: the picture without and with the cut, pixels that differ |
| E | the originals back, batches rebuilt, the same views again (drift against A) |

Left out of the judgement: meshes that stand elsewhere in another view. These are the sea (it follows the camera), the
sky, and the characters (55k triangles a view outdoors, 14k in the house). They are drawn but never judged and never
occlude, which is conservative.

What it cannot see: viewpoints between the samples. A triangle "never seen" from 72 views may show from a 73rd; the
view-independent classes do not depend on that. Vertex animation (sway) moves no triangle far. Shadow-pass triangles
are counted, not judged. At Medium the static casters are cached, so their cost is paid at the cache's refresh.

## 2. Numbers (MEASURED; averages per view; Automated runtime only (SwiftShader))

### Outdoors: yard → lane → square, 72 views

| | draws main (shadow) | triangles main (shadow) | SwiftShader ms/render (18 timed views) |
|---|---|---|---|
| A as shipped | 139 (32) | 605k (110k) | 2 891 |
| B batches off | 208 (33) | 596k (108k) | — |
| E as shipped, at the end | 136 (32) | 607k (98k) | 3 015 (A→E per view: median +4.8 %, range −20…+50 %: the noise) |
| C cut "geo" | 136 (32) | 561k (−7.5 %) + 10k sculpt triangles degenerate | 2 783 (−7.7 % summed; median −9.7 %, per view −34…+22 %) |
| C cut "all" | 131 (32) (−3.7 %) | 408k (−33 %) | 2 280 (−24 %) |

Pixels changed by the cut (D): "geo" at most 0.16 % of a frame (average 0.02 %); "all" at most 0.34 % (average
0.07 %). They are slivers along fence rails and roof edges, thinner than the probe's samples.

**Where the judged triangles go** (525k a view; batches off; the sea and the characters excluded):

| Class | per view | share | GPU work it costs (INFERRED from the pipeline) |
|---|---|---|---|
| seen | 211k | 40 % | — |
| buried under the terrain | 63k | 11.9 % | vertices; and fragments where drawn before the terrain (the terrain is drawn last, renderOrder 1) |
| under/inside a solid | 27k | 5.2 % | vertices; fragments only if drawn before what hides them |
| bottom on the ground | 15k | 2.8 % | vertices (most face away: culled at setup) |
| never front-facing | 57k | 10.9 % | vertices + setup (back faces of closed objects; normal) |
| outside every view | 14k | 2.7 % | vertices (a big mesh partly in view) |
| tiny (< 1 px) | 96k | 18.3 % | vertices + setup, no pixels (too much detail at distance) |
| occluded | 43k | 8.1 % | vertices; fragments if drawn before the occluder |
| **never seen, total** | **314k** | **60 %** | |
| of which view-independent (buried + solid + bottom) | 104k | 19.9 % (13.5–26 % by view) | |

Draws: a whole object never seen: 11.8 of 167 a view (batches off, 7 %). With the shipped batches the "all" cut saves
5 of 136 calls, the "geo" cut none.

Fragments, upper bound: the screen area of the never-seen triangles that face the camera inside the frustum, per view.
Buried 105k px, inside solids 321k, occluded 414k, against 922k px on screen. This counts every one of them as shaded.
The depth test rejects many before shading (three draws opaque objects near to far), but the buried bush and grass
bottoms come before the terrain and are shaded.

Double-sided: 26k triangles a view use a double-sided material (5 %). 7.6k a view face away and are rasterised only
because of it. Their back face is actually seen for 23k of the 105k unique double-sided triangles. Too small to matter.

**Per point** (the 4 headings averaged; A = as shipped):

| point | draws main (shadow) | tris main (shadow) | judged | never seen | buried / solid / bottom | back / outside / tiny / occluded |
|---|---|---|---|---|---|---|
| yard-door | 147 (57) | 611k (213k) | 527k | 61 % | 67k / 29k / 14k | 58k / 11k / 97k / 46k |
| yard-west | 145 (30) | 652k (31k) | 533k | 63 % | 69k / 30k / 14k | 61k / 15k / 99k / 45k |
| garden | 120 (29) | 560k (68k) | 450k | 63 % | 60k / 26k / 12k | 50k / 11k / 81k / 42k |
| yard-east | 118 (38) | 527k (67k) | 459k | 59 % | 56k / 23k / 12k | 47k / 11k / 79k / 43k |
| lane-1 | 148 (35) | 643k (81k) | 573k | 59 % | 73k / 29k / 15k | 60k / 11k / 103k / 46k |
| lane-gate | 146 (26) | 670k (39k) | 583k | 58 % | 74k / 29k / 16k | 57k / 11k / 105k / 46k |
| lane-2 | 136 (40) | 664k (186k) | 593k | 58 % | 76k / 29k / 16k | 58k / 11k / 108k / 45k |
| lane-3 | 131 (28) | 659k (102k) | 599k | 58 % | 80k / 28k / 16k | 59k / 11k / 110k / 45k |
| lane-4 | 134 (29) | 638k (102k) | 580k | 60 % | 79k / 27k / 16k | 58k / 12k / 111k / 43k |
| lane-5 | 137 (29) | 607k (102k) | 559k | 59 % | 72k / 27k / 16k | 57k / 11k / 106k / 41k |
| lane-6 | 137 (32) | 589k (113k) | 550k | 59 % | 68k / 27k / 15k | 57k / 12k / 105k / 42k |
| lane-7 | 129 (30) | 569k (112k) | 520k | 59 % | 61k / 26k / 15k | 56k / 13k / 98k / 41k |
| lane-8 | 138 (30) | 599k (127k) | 511k | 59 % | 62k / 24k / 14k | 55k / 13k / 93k / 42k |
| south-lane | 142 (26) | 617k (135k) | 515k | 59 % | 54k / 26k / 15k | 58k / 15k / 95k / 43k |
| south-lane-2 | 145 (26) | 592k (135k) | 492k | 61 % | 48k / 26k / 15k | 59k / 19k / 90k / 41k |
| square-south | 152 (28) | 575k (129k) | 467k | 61 % | 43k / 26k / 15k | 59k / 19k / 85k / 40k |
| square-west | 147 (28) | 560k (114k) | 470k | 62 % | 44k / 30k / 14k | 60k / 25k / 83k / 39k |
| square-east | 149 (34) | 561k (131k) | 464k | 61 % | 40k / 27k / 14k | 60k / 20k / 82k / 40k |

(The shadow pass varies with the shadow cache's refresh, not with the view.)

### The house (20 views = 5 room-camera pictures)

| | draws main (shadow) | triangles main (shadow) | SwiftShader ms/render (5 timed) |
|---|---|---|---|
| as shipped (E) | 55 (1.6) | 226k (29k), **the same from every point: the house draws all of itself** | 1 121 |
| cut "geo" | 55 | 176k (−22 %) | 772 (−31 %) |
| cut "all" | 54 | 67k (−70 %) | 860 (noisy: the other runner) |

Judged 200k a view, never seen 148k (74 %): inside a solid 35.5k (17.7 %), bottoms 4k (2 %), buried 0, never
front-facing 51k (25 %), outside every view 39k (19.5 %, mostly the rooms the camera never looked into: the probe saw
only the spawn room's surroundings, so this class is overstated here), tiny 15k (7.7 %), occluded 3k. Pixels changed
by the cut: "geo" at most 0.03 %, "all" 0.35 %.

## 3. Top sources (MEASURED; triangles a view, never seen of submitted; the main cause)

Outdoors:

| source (builder) | never seen / submitted | main cause |
|---|---|---|
| grass and flower tufts (world.js `fillPools`, InstancedMesh pools) | 34.7k / 54.1k | tiny (blades at distance) and buried (each tuft stands 8 cm low) |
| terrain tiles (terrain.js `Terrain._build`, 65 m tiles) | 30.1k / 55.0k | occluded (behind houses and the rise), facing away, outside the view |
| city dressing (citydress.js `place`, Kit pieces) | 26.0k / 49.5k | tiny, facing away |
| containers and barrels (containers.js `buildCitadelContainers`) | 17.6k / 25.2k | tiny |
| bush and tree sculpts, detailed (kit.js LodBatch; sculpts of 6 136, 6 372, 5 776 triangles) | 40.5k / 54.4k | **buried** (each instance stands 8 cm low with the sculpt reaching 25 cm under its origin, and the ground slopes), tiny |
| island props (island.js `piecesOf`, `instances`) | 25.9k / 46.2k | tiny, facing away, bottoms |
| house shells (architecture.js `buildHouse`) | 12.6k / 21.5k | **inside a solid**: wall boxes' inner faces, floor slabs inside the house's collider |
| spaceport (spaceport.js) | 12.0k / 18.3k | inside a solid, tiny |
| cliff rocks (cliffs.js `buildCliffRocks`) | 8.7k / 10.1k | buried |
| the copper pipe (island.js `drawPipe`) | 7.7k / 8.2k | outside the view, buried (the pipe runs under the lane) |
| the statue (statue.js) | 1.2k / 4.2k | inside its plinth |

The house: the room shell (interiors.js `RoomBuilder.shell`, one piece for every room) 36.8k / 45.0k, mostly the rooms
outside the view. The bed 20.8k / 29.6k (of its unseen triangles, 12.8k unique ones lie inside its own collider: parts inside the
frame). Chairs 13.0k / 20.0k (facing away). The bookcase 11.6k / 11.9k (19.5k unique unseen triangles inside its
collider; INFERRED: books and boards inside the case's volume). Potted plants 10.2k / 13.6k.

Pictures (`captures/hidden-tris/`): `xray-*.png` show the view in grey and draw the never-visible-from-anywhere
triangles through everything: red buried, orange under/inside a solid, yellow bottoms. They come from an 8-view
classification, so they are an illustration. They show the bush and grass skirts under the ground, the house shells'
insides and the fence-rail bottoms. `view-*.jpg` are the game's own frames on the walk, `house-*.jpg` in the house.

## 4. Could a build-time cut take the buried part away? (MEASURED, `BURIED=1`, `results/hidden-tris-buried.json`)

The vegetation is the biggest buried source, and its geometry is shared by every instance on the island. So a triangle
can be dropped at build time only if it is under the terrain at **every** instance. Counted over all instances:
Citadel's 34 sculpts (two vegetation batches; 17 shapes, each detailed and coarse) lose 0–21 % each; most lose under 6 %, the largest
(a 6 136-triangle sculpt) 21 %. The grass and flower tufts lose 0–10 %. Weighted by what a view submits, that is about
**8k triangles a view (~1.5 %)**. Burial differs a lot between instances: slope, scale, and bushes on paving or terraces, where the terrain lies
lower than the ground under them. So most buried triangles can only be cut per instance, which shared geometry cannot
do. Not worth a change.

## 5. What it costs on real hardware (INFERRED, NOT VERIFIED)

- **Vertex and setup work.** The project's own estimate for box culling (PERF_BATTERY_2 §7) priced 160–194k off-screen
  triangles at 0.3–1.0 ms on the Vega 8, i.e. ~1.5–5 ms per million. On that rate: the "geo" set the prototype could
  cut (~50k a view) ≈ 0.1–0.25 ms; the never-seen set an oracle would cut (~200k) ≈ 0.3–1.0 ms. The GTX 1050 has more
  geometry throughput than the Vega 8, so it pays less. The Intel UHD 620/630 has less, so it pays more (roughly 2×).
- **Fragments.** The buried bottoms drawn before the terrain cover at most ~11 % of the screen (105k px). The laptop's
  "res ×0.6 = −3.9 ms" (build 271) puts the pixel-proportional work near ~6 ms a full frame. So the buried overdraw is
  ≤ ~0.7 ms, and less in fact (part is rejected early). The inside-solid and occluded triangles are mostly rejected by
  the depth test before shading, because three sorts opaque objects near to far.
- **Context.** Medium street GPU p50 on the laptop: 16.5–19 ms (SHADE-COST, build 271). On the UHD 630: street 11.3 ms,
  the house's interior 18.5 ms (HARDWARE/2026-11-12). There MSAA alone is ~10 ms on the street, lamps 1.4–5 ms, the
  terrain material 3.4 ms, and draw batches made no GPU difference. **The hidden triangles are ≲ 1 ms of the laptop's
  frame (≤ ~5 %, likely 1–3 %); a triangle cut is not the next lever.**
- **Why SwiftShader overstates it.** It rasterises on the CPU, so it pays per triangle and per vertex in software
  (606k → 408k triangles = −24 % of its frame time). A real GPU culls back faces and sub-pixel triangles in fixed
  hardware.

## 6. Recommendation

1. **No general fix now** (no game change in this pass). The certain set is ~1.5 % of a frame's triangles (§4). The big
   sets need per-camera culling (occlusion, finer pieces, LOD) for ≲ 1 ms on real hardware.
2. **If the interior's GPU time on the Intel UHD 630 (18.5 ms Medium) is ever addressed**, look at geometry there first,
   cheapest first:
   - (a) The house draws all of its 226k triangles from every spot: `RoomBuilder.shell` is one piece for all rooms. A
     shell per room would let three's frustum test drop the rooms out of view. Expect up to ~20 % of the house's
     triangles (the "outside every view" share; overstated here, see §2).
   - (b) Furniture built inside furniture: parts inside the bed's and the bookcase's own volumes. 17.7 % of
     the house's triangles never show; the prototype cut them with 0.03 % of pixels changed and −31 % frame time on
     SwiftShader. A per-prop review in props.js, only with a visual check.
   - Both need the laptop's GPU ms before and after (Pause → Benchmark → Copy, interior line); they are not verified.
3. **Outdoors**, the triangle budget is set by the vegetation detail distance and the grass. The laptop's build-271
   reading already names "Medium's vegetation distance" as the biggest GPU lever left, and Auto's Medium-eco takes
   Low's. That is a look decision, not a hidden-triangle fix. The detailed bush sculpts (~6k triangles for a 1.7 m bush,
   7.5 cm cells) are dense. A coarser detailed sculpt would cut more than any hidden-triangle trim, but needs a visual
   review.
4. **Double-sided materials:** 7.6k triangles a view rasterised only because of the double side. Not worth a change.

## 7. Side notes for other agents

- `Renderer.mid` runs `drawBatch.update(root)` only for an area `shadowCull.update` has seen, and `Game.frame` calls
  that only on a frame it draws. A test that steps frames without drawing and then calls `renderer.render()` directly
  sees stale batches. `draw batches off` (`enabled = false`) then leaves them drawn until the next drawn game frame.
  Play is not affected: every drawn frame runs `shadowCull.update` first. This probe calls the same step before its
  renders (`HT.draw`). SOURCE-CONFIRMED (main.js `mid`, `frame`).
- The sea mesh follows the camera (environment.js: `water.position` snapped to the camera every frame). Any probe that
  snapshots meshes across views must treat it as moving.

## 8. Reproduce

```bash
cd lba3 && python3 -m http.server 8123 &
node tests/hidden-tris.mjs                     # outdoors, 72 views, cuts geo + all (~45 min on SwiftShader)
ROOM=house node tests/hidden-tris.mjs          # the house (~7 min)
BURIED_ONLY=1 node tests/hidden-tris.mjs       # §4 only (~2 min)
NVIEWS=8 MODES=none XRAY_EVERY=2 node tests/hidden-tris.mjs   # the x-ray pictures
```

Results: `docs/lba3-performance/results/hidden-tris.json` (+ `.log`), `hidden-tris-house.json` (+ `.log`),
`hidden-tris-buried.json`. Pictures: `captures/hidden-tris/`.

## Real GPU (HIDDEN-TRIS-HW, the desktop, 20.11.2026)

**Machine:** the Acer laptop, NVIDIA GeForce GTX 1050 (WebGL through ANGLE D3D11, as the page reports it) with an Intel
UHD 630 beside it; Chrome 158 (Playwright's channel), window 1536×864 at devicePixelRatio 1.25 (the panel 1920×1080 at
125 %); on AC. Build: `ccr-c1c2c4b9-dep6ed` at `329c0689` served locally. Raw data:
`docs/lba3-performance/HARDWARE/2026-11-20-hidden-tris-hw/` (`htscan.mjs`, per run `hidden.json`, `cost.json`, `log.txt`).

**Method (the cloud's file was not merged yet, so an ID render):**
- Every drawn triangle of the static world gets its own colour: the meshes, the draw batches and the instanced props
  (instances apart). Left out: the characters' skinned meshes, which move, and three's BatchedMesh (2 meshes, 108 K
  triangles in all).
- The world is drawn from every walkable spot of the area on a 4 m grid, at 8 headings each, from two cameras: the
  game's follow camera, 8 m behind and 5 m above him, and a higher view. Each view is read back at 960×540. Opaque
  triangles are drawn first, writing depth; transparent ones after, against that depth.
- A triangle never seen from the front (nor, if double-sided, from the back) is hidden. A double-sided triangle whose
  back is never seen is counted apart. Only triangles inside the area, plus a 20 m margin, are counted: from there,
  the rest of the island is simply out of view, not hidden.
- **The cost:** the same 8 camera points per area, drawn by the game's own renderer with its GPU timer (EXT
  disjoint timer query). Each point gets 40 frames of warm-up, then 240 frames measured. The world is drawn as built
  (A) and with the hidden triangles left out of their geometry's index (B), in the order A/B/A/B/A/B, at Medium and at
  High. Per point, the median of the three rounds.
- The removal was for the measurement only. Nothing is changed in the game.

| Area | Walkable spots · views | Triangles in the area | Never seen | Double-sided whose back is never seen |
|---|---|---|---|---|
| Citadel: Twinsen's house, the yard, the lane, the square with the well | 274 · 4,384 | 663,438 | 418,850 (63 %) | 22,860 of 31,070 |
| Zeelich: its street from the arrival point (70 m square) | 64 · 1,024 | 155,634 | 73,685 (47 %) | 325 of 485 |

| Area · quality | As built: GPU p50 / p95 ms · triangles drawn a frame · calls | Hidden left out: GPU p50 / p95 ms · triangles · calls | Change in GPU time |
|---|---|---|---|
| Citadel · Medium (run 1) | 7.64 / 8.90 · 784 K · 230 | 7.73 / 8.86 · 684 K · 230 | +0.09 ms |
| Citadel · Medium (run 2) | 6.76 / 7.81 · 784 K · 230 | 6.86 / 7.52 · 684 K · 230 | +0.10 ms |
| Citadel · High (run 1) | 8.50 / 9.39 · 800 K · 252 | 8.29 / 8.93 · 699 K · 252 | −0.21 ms |
| Citadel · High (run 2) | 7.87 / 8.48 · 800 K · 252 | 7.71 / 8.28 · 699 K · 252 | −0.16 ms |
| Zeelich · Medium | 5.83 / 6.58 · 276 K · 467 | 5.84 / 6.40 · 226 K · 467 | +0.01 ms |
| Zeelich · High | 6.62 / 7.22 · 311 K · 551 | 6.47 / 7.21 · 256 K · 551 | −0.15 ms |

Frame time stayed at p50 17.5 / p95 18.3 ms in every run, A and B. That is Chrome's pace on this laptop that
session, about 57 Hz with the GPU half idle (GTX1050-AC in WORLD_ART_REQUESTS.md), not the game's work.

**Verdict: on this GTX 1050 the hidden triangles do not weigh on the game.**
- Leaving out 13 % of the triangles drawn a frame (16–18 % at Zeelich) moved the GPU time by −0.21 to +0.10 ms.
  That is less than the difference between two runs of the same build (about 0.8 ms at Citadel's Medium).
- The draw calls stay the same: the hidden triangles share their batches with seen ones.
- The GPU's time here is the pixels and the passes (shadow map, lights, MSAA), not the vertices. The benchmark's
  Medium breakdown says the same: the static scenery's whole GPU group is about 2 ms.
- **No fix is worth it, and none was made** (the user, 20.11: the game's quality and look must not change).

**What the hidden set is, for the record:**
- **Pieces never seen at all:** merged town dressing behind the street fronts, and pieces of the spaceport and of the
  harbour's containers that no walkable spot in this area looks at:
  - `citydress` merged meshes round (−57, 14) and (−67, 27): 26 K and 22 K triangles;
  - `townMerged` round (−39, 32): 18 K;
  - `spaceport` merged at (−11, 40): 21 K.
- **Parts of draw batches:** 30–50 % of the batches round the lane and the square (the backs of walls, roofs and props
  against each other, faces under the ground).
- **The props' instances:** `smallPool` 10.7 K of 14 K, double-sided.

**Not measured:**
- **The characters:** their models are drawn double-sided, 115 K of 120 K skinned triangles. Turning that off risks
  open sleeves and capes showing through, and since the whole hidden set costs nothing measurable here, it was left
  alone.
- **Far props at full detail** (the order's last kind): not examined apart.
- **The scan's own limits:**
  - A triangle smaller than about 2 px at 960×540 from every spot counts as unseen.
  - Foliage cut-outs count as solid occluders.
  So "never seen" is an upper bound. That doesn't change the verdict: even removing this whole upper bound gained
  nothing.
