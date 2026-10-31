# Performance stabilization milestone (from 30.10.2026)

Feature and content work is paused: Twinsen's house layout, the folder rename lba2-remaster → lba3 (done 30.10) and new art.
Only performance stabilization runs now. The main session coordinates the work.

## Rules
- **One framework.** Use the existing instruments: `src/engine/bench.js` (routes, breakdown, Auto as played), `perf.js`
  (frame records, hitch attribution) and the probes under `docs/lba3-performance/*/probes/`. Extend them; never add a
  competing one.
- **At most two specialists at a time:** a CPU/runtime investigator and a GPU/rendering investigator. Ownership (below)
  keeps their files from overlapping. The main session integrates their work in sequence.
- **One bounded change at a time.** Compare it on the same route, state, camera and settings. Keep it only when the
  evidence supports it.
- **Rank** findings by measured ms and by implementation risk.
- **No** new engine, no WebGPU and no broad rewrite.
- **Honest reporting:**
  - Separate high utilization from missed frame deadlines.
  - A 60 fps average is not success: report p95/p99, the share of frames over the refresh, and stalls.
  - Transition stalls are reported even when they happen behind the black screen.
  - This container renders with SwiftShader. It gives exact counts (draws, programs, textures, geometries, allocations,
    listeners) and relative CPU ms only. It never gives GPU time or fps for the user's machine.
  - Acceptance on the target hardware (Vega 8 / Ryzen 5 3500U, the installed exe) stays **pending** until the local
    session has measured it there.

## Ownership
| Area | CPU/runtime investigator | GPU/rendering investigator |
|---|---|---|
| main loop, transitions, rAF/timers/listeners (src/main.js loop and transition code) | ✔ | |
| simulation: walkers.js, actors.js, enemies, physics.js, walknav.js, interaction lookup, camera clearance | ✔ | |
| drawcull.js (far cull, anim rates), perf.js, bench.js (routes, options, report) | ✔ | |
| renderer.js (passes, post, AA, shadow filter), shadowcache, shadowcull.js | | ✔ |
| drawbatch.js, texarray.js, vegetation, terrain shader, water, particles, environment/lighting | | ✔ |
| GPU-side benchmark variants | sends the lines to the CPU investigator, who owns bench.js | ✔ (in its own file, src/engine/benchgpu.js) |

Neither specialist edits the other's files. A change that needs both goes to the coordinator.

## Phase 0: reproduce on the current build (target machine, the local session)
Measure on the installed exe of the newest build, freshly started, on battery and then plugged in:
1. "Benchmark: Auto as played". This is the Follow-camera play path.
2. "Benchmark", the full run: fixed resolution per preset, the benchmark camera, and the breakdown.
3. As soon as the instrumentation from Phase 1 is in a build: the street and arrival routes with Follow and with the
   benchmark camera; cold entry, repeated visits and 3 minutes of sustained play; resource counts before and after 5
   region round trips.

Save each run as `docs/lba3-performance/results/laptop-<version>-<what>-<battery|plugged>.txt`. The runner is
`docs/lba3-performance/local/chrome-bench.mjs`. Use its Electron variant for the exe (Playwright `_electron.launch`
with the installed exe).

## Phase 1: instrumentation (CPU investigator: bench.js, perf.js)
- **Cameras:** `game.bench.run({ camera: 'follow' | 'orbit' })` for both cameras. Default orbit, as today.
- **Visit order:** `game.bench.visits({ routes, cycles })` measures cold entry, then repeated visits, then sustained play.
- **Resources:** a snapshot before and after N region round trips: geometries, textures and programs on the GPU,
  render targets, JS heap, listeners, timers and rAF callbacks, scene objects, updatables.
- **CPU per frame by section:** sim (people, physics, AI, interaction, camera) and submit (main pass, shadow pass, post).
- **GPU by group** (GPU investigator's list in benchgpu.js): no vegetation, no water, no particles, no characters, no
  terrain detail, shadow casters only, and so on. Each is one variant on the same frozen state.

## Decision (the user, 30.10)
- **Target hardware.** The Vega 8 laptop is the minimum spec.
- **Plugged in.** High holds a flat 60 on the street; done.
- **On battery.** Medium at 45–55 fps on the street and arrival is accepted. We stop chasing 60 there.
- **Still in scope:**
  - the stalls a player sees in view: the first-street ~2 s stall, the frame after the black, and the start-screen
    stutter (CPU investigator);
  - whatever the GPU investigator's current round finds (edge-smoothing cost, the Follow camera's far view).
  The milestone closes after those. Content work then resumes.
- **System requirements.**
  - Minimum: Vega 8 / Iris Xe class integrated GPU, 4-core CPU, 8 GB, 1366×768.
  - Recommended: GTX 1050 / RX 560 or newer, 6 cores, 16 GB, 1080p.
  - Only the minimum was measured; the recommended spec is an estimate.

## Results
### CPU/runtime investigator, round 2 (merged e06085f, 30.10)
All numbers are exact counts or relative SwiftShader times; none is a laptop measurement.
- **Start-screen stutter: cause found and fixed.**
  - Cause: Citadel's draw batches are built after the loading step that uploads geometry, so the live title uploaded
    the rest of the world as its camera circled.
  - Before: the first title frame uploaded 19 geometries plus the first shadow draws (13,087 ms here), then 28 more
    geometries and 9 textures arrived in title frames over 58 s.
  - Fix: a new loading step, `batchUpload`, does an upload pass over all of Citadel and every material texture. The
    title's first frame now runs under the loading screen. The live world behind the menu stays at full rate.
  - After: the first title frame is 250 ms here, and 2 geometries arrive in the next 58 s. The 9 small town and harbour
    textures still arrive in title frames; not chased.
  - Pending: title frame times and time-to-menu on the laptop (`electron-bench.mjs startup`, cold and warm).
- **The woman inside the bench: fixed.** An unseen person who sits down is now placed on the seat (solidnpc.mjs).
- **First-street ~2.2 s stall and the heavy frame after the black: not reproduced here.**
  - After the preset change nothing is left to upload, and in 8 s of the route nothing is uploaded in view.
  - On arrival every upload happens in black frames.
  - The hitch notes now say, for every frame over 100 ms, whether the main thread was busy (and which script) or the
    time went to the GPU process or driver. They also say how many new textures are render targets.
  - The next laptop full run decides between those causes.
- **The title is the heaviest view in the game** (Medium 281–398 calls / 1.1–1.7 M triangles; High 372–589 /
  1.7–2.0 M). If the laptop shows steady missed frames there rather than one-off spikes, that is GPU cost: the GPU
  investigator's area.
- **Also kept:**
  - Follow-camera clearance allocations: 103 → 33 KB per frame.
  - The interaction lookup skips people out of reach.
  - The start trace.
- **Logged:** I-20, Auto's title calibration never runs (kept on purpose under AUTO-2).

### GPU/rendering investigator, HEADING-LOAD (31.10): the Follow camera's heavy street headings
Exact counts and pixel A/Bs from SwiftShader (street route, Follow camera at Far, Auto at Medium, battery profile).
No laptop GPU time yet. Data and probes: `HEADING-LOAD/results/summary.json`, `HEADING-LOAD/probes/`.
- **What the heavy headings draw (225°, before).** 213 calls, 921k triangles in the main pass. Scenery 476k
  (draw batches 295k), trees 169k, grass 113k, terrain 78k, people 61k. Grass covered 0.6 % of the pixels with
  18 triangles per shown pixel. The tulip rows were island-wide instanced meshes: 56k triangles drawn at every heading,
  none of them in view at 135°.
- **Image-preserving changes (kept):**
  - The grass, flower and tulip pools hold only the 9 m squares in the camera's frustum, refilled at the render.
  - Static non-casting instanced decoration (the tulip rows) is culled the same way (`engine/viewinst.js`).
  - The quay's and the original props' repeated props are merged with their quarter instead of one instanced mesh per
    kind, so the draw and shadow batches cut them per cell.
  - The cargo lift's static group is no longer `keep`. The boat, the ferry and the lift's moving parts are folded by
    texture.
  - Meshes hidden by the culls are shown for every shader compile, so no program waits for a first frame.
- **Result, per heading (calls / triangles):** 225° 213/921k → 189/854k; 180° 192/810k → 166/675k;
  270° 162/865k → 156/815k; 135° 117/584k → 103/430k; 0° 136/601k → 132/464k. Over a full Follow-camera turn the mean
  is 590.6k → 482.8k triangles.
- **Pixel A/B.**
  - A 32-frame turn compares each game frame with the same frame unculled: 0 pixels differ.
  - Base vs final build, without people or particles: 1–58 pixels differ at the harbour headings.
  - At 45° and 135° only the statue and the flower dots differ, and they also differ between two runs of the base.
- **Trade-offs priced, not applied** (screenshots and diffs in `HEADING-LOAD/results/tradeoffs.txt`):
  - grass and flowers half as dense beyond 28 m (new switch): −16k triangles at 225°;
  - grass and flowers to 30 m: −31k;
  - trees detailed to 22 m: −11k.
  Each changes 0.1–0.2 % of the pixels. They need the user's approval and the laptop's GPU ms.
- **What remains at 225°.** Everything still drawn is in view: scenery 451k (the town and the quay 30–100 m away,
  merged into large pieces), trees 169k, grass 71k. The gap to the light headings is content in view, not hidden work.
  Closing it further means simpler distant geometry (far-prop and building LOD), which is a visible trade-off.
- **Laptop:**
  - `electron-bench.mjs full … battery follow`: the new GPU group lines.
  - `electron-bench.mjs sweep … battery follow`: per heading, this build vs 0.43.0.

### GPU/rendering investigator, HEADING-LOAD-2 (31.10): the other outdoor areas
HEADING-LOAD's method in Zeelich (the arrival area), Desert Island, the Hamalayi and the two heaviest Zeelich islands
(Otringal and Knartas, ranked by `q_rank.js`: mean 1222k and 471k triangles a frame; the Platform 347k, Mosquibee 237k,
the rest 24–139k). Exact counts and pixel A/Bs from SwiftShader: each area entered at its arrival point, Follow camera
at Far, Auto held at Medium, battery profile, 1366×768, Twinsen turned to 8 headings. No laptop GPU time.
Data and probes: `HEADING-LOAD-2/results/` (`per-heading-before-after.txt`, `tradeoffs.txt`), `HEADING-LOAD-2/probes/`.
- **What these areas drew that the view could not show (before).**
  - The Zeelich islands' sculpted trees, bushes, plants and rocks were island-wide InstancedMeshes (zislands.js), so
    three culls each only as a whole. Otringal drew 884k tree triangles at every heading, 55–300k of them in view;
    Knartas 264–270k for 26–196k.
  - Zeelich's puff trees, rocks, crates, grass and flowers: the same. 87–117k drawn, 11–117k in view.
  - The desert's and the Hamalayi's terrain is drawn in quarters (PERF-CALLS: few calls). The desert drew 124k
    triangles a frame on average for 43k in view; the Hamalayi 53k for 13k.
  - Already culled before this round: the desert's rocks and the Hamalayi's pines (kit.js LodBatch). Neither area
    has `keep` on static parts (the desert's palm crowns sway: rightly `keep`).
- **Image-preserving changes (kept):**
  - `kit.js cullInstances`: a region's static casting instances in one BatchedMesh per kind (LodBatch with no coarse
    version). three tests each instance against the frustum of each pass (the view's camera, the sun's). The shadow
    cache keeps them as static casters, as it does Citadel's trees. Used by the islands' trees, bushes, plants and
    rocks, Zeelich's puff trees, rocks and crate bodies and brass, and the desert's shrubs.
  - Zeelich's grass and flowers and the Hamalayi's backdrop peaks (no shadow) are culled per square by `viewinst.js`.
    The see-through crate emblems stay as they were (a refill would move them in the blended order).
  - `terrain.js squares`: a region's terrain tiles cut into 25-cell squares in one BatchedMesh. Each square is culled
    on its own; one multi-draw replaces 2–4 calls. Same vertices, triangles, material and renderOrder. Citadel keeps
    its 70-cell tiles.
  - `benchgpu.js`: a region's own vegetation is named by its builder (`userData.gpuGroup`), so it counts as trees or
    grass, not scenery. New variant: 'region instances not culled per instance (as before)'.
- **Result: mean main-pass triangles over the 8 headings (calls).**

  | Area | Triangles before → after | Calls before → after |
  |---|---|---|
  | Otringal | 1201.5k → 480.1k (−60 %) | 43.9 → 39.8 |
  | Knartas | 466.1k → 283.0k (−39 %) | 42.5 → 41.1 |
  | Desert | 213.6k → 142.6k (−33 %) | 34.6 → 31.6 |
  | Zeelich | 310.5k → 247.9k (−20 %) | 79.5 → 76.6 |
  | Hamalayi | 234.5k → 200.6k (−14 %) | 38.0 → 37.0 |

  Heaviest heading per area: Otringal 225° 47/1266k → 42/538k; Knartas 45° 46/547k → 42/469k; desert 0°
  61/319k → 55/261k; Zeelich 0° 141/409k → 136/409k (all in view) and 135° 53/259k → 49/169k; Hamalayi 45°
  50/339k → 49/320k. Per heading and group: `results/per-heading-before-after.txt`. The shadow pass did not change
  (1–14 calls, ≤ 8k triangles: the static casters are in the cache).
  The other islands take the same builder (4 headings, `results/rank-islands-before-after.txt`): the Platform
  347k → 219k, Mosquibee 236k → 189k, Celebration 106k → 69k, the rest −0 to −17 %.
- **Pixel A/B.**
  - Same frame, this build's batches against the InstancedMeshes rebuilt from them (`q_repr.js`): 0 px at every
    heading in Zeelich, Otringal, Knartas and the desert.
  - Same frame, the terrain's squares against its old tiles (`q_repr.js W_TERRAIN=1`): 0 px at every heading in the
    desert, the Hamalayi, Otringal and Knartas.
  - A 32-frame turn, each game frame against the same frame with the culls undone (`q_aturn.js`): 0 px in all five
    areas.
  - Base against this build, people and particles left out: the desert and the Hamalayi 0 px. Zeelich 0–250 px and
    Knartas 0–35 px: inside the base's own run-to-run noise (two base runs differ by 0–2122 and 0–44 px). Otringal
    0–27 px at one level (one pixel at 4). The base moves by 54–445 px there when its static shadow cache is redrawn;
    this build moves 0 px (`results/cache-timing-otringal.txt`). The residue is acne on shallow ground under the base's
    cache state (INFERRED from those runs).
- **Trade-offs priced, not applied** (`results/tradeoffs.txt`; screenshots in the session scratchpad, chapter 3–12
  areas, for the record only):
  - the islands' trees coarse beyond 34 m, as Citadel's: Otringal −59k triangles a frame on average (0 to −111k by
    heading), Knartas −19k. With the shadows as now, 0–6.7k px differ (≤ 0.64 %); with Citadel's coarse shadows too,
    7.7–22k px (0.7–2.1 %);
  - the Hamalayi's pines detailed to 22 m (an existing switch): −30k on average (0 to −56k), 0–18k px (≤ 1.7 %; the
    pines on the ridge against the sky).
- **Tests** (one at a time, this branch): drawcalls, perfbudget, display, chapter1, transitions, camfollow, worldfit,
  travel, zislands, desert-life, solidnpc, opening PASS. zeelich-life fails 2 checks (Pelleck's lines in chapters 4–9).
  The base fails the same 2 (`results/tests-summary.txt`), so they are not this round's.
- **Files.** kit.js, terrain.js, zislands.js, zeelich.js, desert.js, hamalayi.js and benchgpu.js. None of bench.js,
  perf.js, main.js, shadowcache.js or drawcull.js was edited.
- **What remains.** What these areas still draw is in view:
  - Zeelich's and the islands' towns (scenery 142–345k by heading, drawn in 48 m draw-batch cells);
  - the Hamalayi's pines (32–169k);
  - the desert's ground in view (11–120k).
  Going further means simpler distant buildings or terrain, which is a visible trade-off. The laptop reference
  (0.42.0, battery, Medium: arrival p50 GPU 16.5–17.4 ms; the Hamalayi 19.4 or 8.3 ms by view) predates this round.
- **Laptop:**
  - `electron-bench.mjs full … battery follow`: the arrival route and its GPU group lines.
  - the hamalayi route, against 0.43.2.

## Closing (the user, 31.10)
"Let's stop with the benchmarks and get back to the game itself, once the relevant agents finish."
- **Still finishing:** the two running agents, SHADE-COST (terrain and material shading on battery) and TITLE-LOAD (the title view, the loading screen freeze, arrival uploads after the black). They are merged after their tests.
- **Then the milestone closes.** The laptop's last full runs (0.43.3):
  - Plugged in: 60 everywhere at Medium; High 56–60, held by a ~56 Hz display pace, not by the game.
  - Battery Medium: street 55, everything else 58–60 as played.
- **One last benchmark** (the user, 31.10): once SHADE-COST and TITLE-LOAD are merged and built, the user runs one full benchmark on that build. After that, benchmarks only at later milestones. If the automatic laptop benchmark (`local/autobench.ps1`) is set up, its reports are read only to catch regressions.
- **Content resumes** in the order of `lba3-production/WORKLIST.he.md`:
  1. magic levels as in LBA2;
  2. visual shops, inventory and coins;
  3. faces, hands and the tunic (I-22);
  4. Citadel's looks.
### TITLE-LOAD (31.10): the title view's draws, the loading screen's long tasks, the frames after an arrival's black
Exact counts and pixel A/Bs, relative ms, all from SwiftShader in this container (no GPU ms, no fps for the laptop).
Title runs: the laptop's start (desktop app on battery, Auto's first start: Medium, 1366×768), 12 angles of the title's
circle. Data and probes: `TITLE-LOAD/results/`, `TITLE-LOAD/probes/` (`run.mjs` + `q_title.js`, `startup.mjs`,
`q_reveal2.js`, `titleruns.sh`, `runtests.sh`).
- **The title view (main pass calls / triangles; per angle in `results/title-per-angle.txt`).**
  - Mean over the circle 320.1 / 1182k → 271.9 / 1007k; the shadow pass 33 / 103k → 21 / 10k.
  - Heaviest angles: 336° 372 / 1363k → 292 / 1009k; 6° 372 / 1361k → 294 / 1047k; 36° 363 / 1335k → 303 / 1109k.
- **Image-preserving (kept):**
  - *Fog-depth cull* (`drawcull.js` FOGCULL). Outdoors the background is the fog's colour, and three's linear fog
    reaches it exactly at fog.far in view depth, so a draw wholly beyond it paints background pixels only. Left out
    of the main pass for a perspective camera: draw batches, terrain tiles, instanced tiles and big plain meshes (box
    test), the actors (FarCull), each instance of a BatchedMesh (its own culling given a far plane at fog.far). A
    caster leaves the main pass only, through its layers (bit 30, which the sun's shadow camera also sees). Off for a
    fog that is not the background's colour (interiors) and for no-fog materials. Same-frame A/B, 12 angles: 0 px.
    Mean −16 calls / −76k; at the heavy angles −45 to −48 calls, −179k to −256k. (Setting camera.far to the fog's
    end instead changed 600–2,900 px through depth precision: not used.)
  - *Bodies never placed.* On the title the hero and 8 enemies have not been posed by play yet: their rigs stand at
    the world's origin, on the sea in the middle of the view, behind the menu (Twinsen a 15 px speck between "Load
    Game" and "New Game"; four drones of 23k triangles each under him, casting into the shadow map). Left out of
    title frames (`FarCull.hideUnplaced`): −32 calls / −99k main, −12 / −93k shadow, at every angle. It removes that
    speck: 66–110 px per angle (same-frame A/B). A stray figure fixed, not a trade-off.
  - Checked, nothing to gain: the menu's buttons and the overlay gradient are see-through (0.6 black), so nothing
    behind them can be dropped; the grass/flower pools and the per-instance culls already test the title camera's
    frustum; nothing is drawn below the sea (the bodies above were on it).
  - Base build against this one: 0.01–0.36 % of pixels per angle (the speck, plus people and particles whose state
    differs between runs; a second base run to separate the two was not made).
- **Visible options for the title only, all OFF** (URL switches for A/B; screenshots this build | option in
  `results/shots/title-<option>-vs-after-t00000.jpg` and `-t073.3.jpg`; pixels in `results/title-options-pixels.txt`):

  | option | mean calls / triangles (12 angles) | pixels changed |
  |---|---|---|
  | as now | 271.9 / 1007k | – |
  | `?titlefar=150`: fog end 150 m on the title | 243.5 / 848k (angles 276°–66°: −40 to −67 calls, −160k to −376k) | 30–66 % (the island's far side fades) |
  | `?titlelod=40`: trees/grass detail measured 40 m further out | 259.6 / 990k | 0.01–1.1 % |
  | `?titler=95&titleh=36`: a closer, lower circle | 268.0 / 992k | 64–70 % (another framing; little saved) |

  Only the fog end saves much, and it is a clear look change. The rest of the title's load is in view: the town and
  the harbour 30–150 m away (draw batches ~480–600k), the trees, and 40 people 5–11 px tall (2–6k triangles each).
- **Scene changes: the frames after the black** (the coordinator's laptop evidence: Low arrival, +40 / +31 geometries
  in the first frames in view).
  - Cause (reproduced, `results/reveal2-low-base.txt`): a scene change whose shader warm-up has nothing left to compile.
    With KHR_parallel_shader_compile (the laptop) three's compileAsync resolves in the same task, so the hold was over
    before the next frame: no settle frame, no readiness check. The first frame in view drew the area's first update:
    Zeelich +48 geometries and 87 pieces leaving their draw batches; Citadel's first frame (its shadow cache) in view
    too. Emulated here: the warm-up resolved at once, frames stepped as 60 Hz frames.
  - Fix: the settle frames and their readiness check follow every swap, hold or not (no fixed delay); batch cells
    remade in a black frame are uploaded in it (`uploadBatches`). After: 0 frames in view made a geometry
    (`results/reveal2-low-after.txt`). Zeelich's pieces leave their batches in a black settle frame, the next frame
    is quiet, then the fade.
  - The swap's frame is split: the area's preparation runs a step per black frame (`prepSteps`, each timed in
    `game.prepLog`, reported by the benchmark's preparation line): shadow batches, the texture layers the draw
    batches read (≤ 30 ms slices), the draw batches, geometry in 4 parts, batch meshes, textures, shadow programs,
    the shader warm-up. Draw batching stays. Zeelich cold here: one black frame of 65.4 s (draw batches 65.1 s) →
    steps of 0–465 ms, except one texture-layer read of 65.8 s: SwiftShader rasterizes the area's painted canvases in
    the GPU process and the first read-back waits for all of it (a GPU-process cost here, INFERRED).
  - Zeelich, the desert and the Hamalayi are built in steps: their builders are generators, `regions.js` runs a step
    per task with a painted frame between and logs each step's ms (15, 7 and 7 steps). Code that needs the area
    meanwhile gets the rest at once. Not measured per step on the laptop yet.
- **Loading screen** (the start; `results/startup-*.txt`). The loading art is a compositor animation: it stops when
  the main thread or the GPU process is busy for long.
  - Before, the long tasks here: the first frame 26.0 s, the batches step 15.1 s, the texture step 11.8 s, Citadel's
    build steps 0.4–1.9 s; 45 painted frames from the first byte to the title.
  - Now: textures in 30 ms slices; Citadel's texture layers in slices (≤ 0.4 s each: one canvas read-back); shadow
    batches, draw batches (0.9 s) and the shadow programs (3 kinds a task) each their own task; the title's first
    draws in 4 parts before its first frame; the largest anisotropy asked before any shader is sent. 91 painted frames.
  - What remains long here is the GPU process. SwiftShader has no parallel compile, so the first call that waits for
    the GPU takes the whole compile: 11.0 s (geometry), 13.6 s (first draws, part 1), 8.5 s (one shadow-program
    chunk). On the laptop the 'programs' step waits for the parallel compile without blocking. Whether anything there
    still blocks for long is for its start trace.
  - Two runs each (the container's load changed between them: unchanged build steps went 8.9 → 15.1 s):
    time to the title 66.8 / 156.4 s → 77.4 / 121.3 s, so no claim either way (NOT VERIFIED); the longest task
    26.0 / 43.7 s → 13.6 / 19.3 s; painted frames on the loading screen 45 / 43 → 91 / 102; long tasks over 1 s
    5 / 7 → 10 / 13 (more, shorter tasks: the slices).
- **Tests** (here, this branch, one at a time): opening, display, menus, perfbudget (0 new programs on every route),
  drawcalls, transitions, timing, chapter1, travel, zislands, autoquality-game, camfollow: all PASS
  (`results/tests.txt`). The staged scene preparation runs only on the game's own loop: the tests' fixed stepping
  keeps the old one-frame path, so it is covered by `q_reveal2.js`, not by these suites.
  - Programs at the title: 83 both (31 standard, 14 depth, 14 basic, 12 shader, 5 merged, 7 other). Not cut: Auto's
    bloom/FXAA pass programs stay (Auto can switch them on in play); a per-variant audit of the rest was not made.
- **Not done:** Citadel's own build steps (world.js, 0.7–1.0 s each here) are not split (not this round's files).
- **Laptop (pending):**
  - `node electron-bench.mjs startup laptop-<version>-startup-battery.txt battery`, once with the bench profile deleted
    (cold shader cache) and once kept (warm): the loading steps, the slices, the long frames.
  - `node electron-bench.mjs full laptop-<version>-full-battery.txt battery follow`: the arrival route's frames after
    the black and the scene changes' preparation line.
