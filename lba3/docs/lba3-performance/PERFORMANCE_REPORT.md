# PERFORMANCE_REPORT — the arrival's preparation, Auto's first guess, the street's CPU (REPAIR-PASS-18-11 phase 5)

Worker: PERF-ARRIVAL (branch of this worktree; commits named "ARRIVAL-STEPS"). Inputs: the user's own benchmarks —
GTX 1050 laptop on battery, 18.11 (`HARDWARE/2026-11-18-gtx1050-battery/`: 60 fps in play on every route at Medium; the
stalls are the arrival's preparation behind the black screen: frames of 116, 264, 83, 83, 116, 116 ms, "shadow batches
built 116 ms", "draw batches built 157 ms", shader warm-up up to 110 ms a step, one 34 ms frame 5.6 s after the black) and
Intel UHD 620 plugged in, 19.11 (`HARDWARE/2026-11-19-intel-uhd620-mains/`: **shader warm-up step of 1 013 ms**, draw
batches 251 ms, geometry 121 ms, black frames 83–133 ms; the street 51 fps, CPU work p95 22.3 ms, GPU p95 18.1 ms).

**Every number measured here is "Automated runtime only (SwiftShader)"**: headless Chromium, ANGLE on SwiftShader (no GPU,
no `KHR_parallel_shader_compile`: every shader compiles synchronously on the CPU), 4-core shared container, window
1366×768, devicePixelRatio 1, Quality Medium fixed, Auto off. A CPU-side step (merging batches, walking the scene) costs
roughly 1.5–2× the GTX 1050 laptop's i5-8300H here (the user's draw batches 157 ms vs 77–336 ms here for the same areas);
anything the GPU does (uploads, the first frame's shadow cache, compiles) is CPU work in SwiftShader and is **not** a
GTX 1050 or UHD 620 figure. No GTX 1050 or UHD 620 number below was measured by me.

## 1. The bottlenecks found (arrival)

The arrival route (Zeelich → Desert Island → the Hamalayi → Citadel, every 3 s) re-enacted frame by frame with the game's
own transition (`ARRIVAL-STEPS/probes/q_arrival.js`, from ROTATE-STALL's probe: 1/30 s steps, every scene-change path as a
player gets it; each frame's preparation step and its longest unit). Baseline = this build with `game.stagedBatches = false`
(the preparation as it was: one step each), so both sides run the same code otherwise.

| Where the black frame went (baseline, ms here) | Zeelich | Desert | Hamalayi | Citadel return |
|---|---|---|---|---|
| shadow batches, built by the swap frame's own update (one frame) | 123 | 105 | 71 | — |
| draw batches (one step) | 336 | 77 | 155 | 31 (rejoin) |
| shader warm-up (one step; walks every object of the scene even when nothing is new) | 43 | 38 | 34 | 35 |
| first frame drawn, still black: pieces the hold had moved leave their batches, cells rebuilt in it | 157 (67 pieces) | 74 (46) | 34 | 37 (12) |

1. **Shadow batches** (shadowcull.js `Area`): one constructor — every caster assigned to 16 m cells, every cell merged —
   run by the frame's own `shadowCull.update` in the frame the scene swapped, before the preparation's own step.
2. **Draw batches** (drawbatch.js `Area`): scan, order (overlapRuns: every draw's box, large pieces cut per triangle),
   assign, the texture arrays made and uploaded, every cell merged — one step. One Zeelich cell alone took 77 ms.
3. **Shader warm-up** (`renderer.precompile` = three's `compileAsync`): one call walks every object of the scene (Citadel
   hidden included) and works out its program; any program it lacks is made in that call. On SwiftShader one new program
   is 15–45 ms; on the user's UHD 620 the step was 1 013 ms.
4. **The first frame drawn**: the preparation's frames move things (a mill's sails, boats) but nothing is drawn, so world
   matrices are stale; on the first render 46–67 pieces left their draw batches and their cells were rebuilt in that frame.
5. **Texture layers** (texarray.js `layerOf` → `getImageData`): SwiftShader's first canvas read-back of an area waits for
   the browser's raster of its painted canvases: 11–33 s in ONE read here (3.5 s even for a lone read). The game's own work
   is one small read per piece. This is a software-raster artifact; on hardware it is the GPU process finishing the area's
   canvases — **not measured**; the user's report line shows it (§5).

## 2. What was changed

- `src/engine/shadowcull.js`, `src/engine/drawbatch.js`: each area build is a generator (`Area.make`), run to the end at
  once as before (`new Area(...)`, `update`, `prepare`), or **staged**: `stage(root)` + `slice(root, ms)` run it until `ms`
  have passed; a slice ends after the unit that crosses it (`runFor`: a piece, a cell part of ~4 000 vertices, a large
  piece's attribute, a large piece's 8 192 triangles, one texture array). The same pieces, cells, vertices and indices
  (tests/arrival-steps.mjs A: Desert Island staged vs one step, identical). While staged, the frame's update leaves the
  area out (`ShadowCull.defer`: the scene change's hold, nothing drawn); a frame drawn first finishes it (no half state).
  `reset()` restores a pending one. Draw batches' return on a visit (`readmit`) and cell rebuilds likewise in steps.
- **Settle** (`DrawBatch.settleSlice`, `ShadowCull.settleSlice`): after the geometry steps, every batched piece's world
  matrix brought up to date (`updateWorldMatrix`, what the next frame's update does) and checked as `watch()` checks it;
  pieces the hold moved leave their batches there, cells rebuilt in steps, and the rebuilt shadow batches go up with the
  batch meshes (`uploadBatches`) — behind the black, not on the first frame drawn.
- `src/engine/texarray.js`: `flushArraysSteps` (the arrays an area grew, made and sent one a step; `flushArrays` = all).
- `src/engine/renderer.js` `precompileParts` / `whenReady`: the warm-up as runs of objects, each one call of three's
  `compile` with the scene's lights walked once and given in the same order (the same light state, fog, target: the same
  programs; the parts version walking the lights per call cost 3× here and was replaced). A run is ≤ 400 objects, but an
  object whose material three never compiled is a run of its own, and after a call that made a program the runs are one
  object until one makes none: **a step holds at most one new program**, wherever compiling is slow. The wait for the
  driver (`whenReady`) is three's `compileAsync` wait (polling `isReady`, parallel where the extension exists).
- `src/main.js` `prepSteps`: the steps above, each sliced to `PREP_SLICE_MS = 12` ms a black frame; texture layers at the
  same slice (30 before); the step log (`prepLog`, the benchmark's "scene changes' preparation" line) counts programs made
  and the slice's longest unit. `game.stagedBatches = false` gives the old one-step preparation (A/B switch).
- No new shipped file (`tools/game-files.mjs`: 508). No visual change (same batches; the warm-up makes the same programs).

## 3. Before / after (Automated runtime only, SwiftShader; Medium; cold = first visit in play, the areas pre-built as the benchmark does)

Probe `ARRIVAL-STEPS/probes/q_arrival.js` (summarised by `probes/summary.py`), each run Zeelich → Desert Island → the
Hamalayi → Citadel twice (cold, then repeat). Baseline `results/base2-medium.txt` (`game.stagedBatches = false`, same
build); candidate `results/cand5-medium.txt` (final code; `cand3`/`cand4` are earlier states, kept for the noise). "Longest
step" leaves out the texture-layers read-back stall (§1.5) and steps that compiled a program; "longest black frame"
leaves out that stall too. The first frame drawn is still black (the reveal waits for it: ROTATE-STALL).

| Visit | longest preparation step, base → cand | longest black frame | black frames > 50 ms | black frames (count, ms of work) | first frame drawn (black) |
|---|---|---|---|---|---|
| Zeelich, cold | draw batches **336** (shadow batches 123 in the swap frame) → geometry 56, draw batches 39, shadow batches 16 | 338 → 77 | 3 → 2 | 42, 859 → 72, 1 025 | 157 (67 pieces leave batches) → 77 (0) |
| Desert Island, cold | shadow batches 105 (swap frame), draw batches 77 → geometry 30, shadow 17, draw 13 | 108 → 50 | 4 → 0 | 32, 419 → 52, 473 | 74 (46 leave) → 50 (0) |
| the Hamalayi, cold | draw batches **155**, shadow 71 → draw batches 75 (one unit: overlapRuns' placing), geometry 26 | 157 → 76 | 2 → 1 | 32, 388 → 52, 651 | 34 → 42 |
| Citadel, return | geometry 48, warm-up 35, rejoin 31 → geometry 30, rejoin 21, warm-up 17 | 53 → 250 * | 1 → 2 * | 32, 242 → 32, 894 * | 37 → 250 * (12 leave in both) |
| Zeelich, repeat | warm-up 39 → warm-up 26 | 39 † → 32 | 1 † → 0 | 31 → 32 | 14 854 † → 13 |
| Desert / Hamalayi, repeat | ≤ 11 → ≤ 19 | 7 / 11 → 10 / 19 | 0 → 0 | 15–16 frames each | 7 / 11 → 10 / 15 |
| Citadel, repeat | rejoin 45 → rejoin 19 | 45 → 29 (cand4) | 0 → 0 | 15 → 19 | 11 → 27 |

\* Citadel's first drawn frame: 12 pieces of the station change look on that frame in every variant (their cells rebuilt
in it: "submit other" 96 ms baseline, 24 without the settle, 149–213 with it, single samples each) and SwiftShader's
shadow-cache draw; the separate A/B (`results/citadel-ab-*.txt`, without the canvas flush) was swamped by 13–54 s
software-raster stalls in that frame. Inconclusive here; the settle is kept for what it measurably removed on Zeelich and
Desert Island (67 and 46 pieces leaving their batches on the first frame → 0) and `game.settleOn = false` turns it off for
a hardware A/B. † a SwiftShader raster stall in the baseline's frame.

In words: every batch build now comes in slices of 12–20 ms with a few units of 25–75 ms left (a texture array's upload
30 ms, one large piece's place in overlapRuns 69 ms, a geometry upload part 30–56 ms on SwiftShader's GPU side); the
shader warm-up steps are 13–26 ms (they were one step of 34–43 ms with a new program, and a new program is now alone in
its call). The black lasts longer: ~20–30 more black frames on a cold arrival (the same work spread over more frames,
plus ~10 % overhead), a few more on a repeat. Repeat visits stay short (16–32 black frames).

The test (`tests/arrival-steps.mjs`: staged batches identical to one-step batches; cold Zeelich, Desert Island and the
tavern frame by frame: every batch / settle / rejoin / warm-up slice ≤ 40 ms, nothing built or leaving a batch in the
first 30 frames in view): **12/12 at 39127059** (`results/test-arrival-steps.txt`, longest slice 32 ms). At the final code:
Zeelich and Desert Island pass every check (`results/test-arrival-steps-final.txt`, longest 36 ms); the tavern's run there
timed out on the frame count while its area was still being built under the arrival card (a test defect: the build is a
task a paint, real time — fixed, the loop now waits for it); its own short re-run (`results/test-arrival-steps-tavern.txt`,
`AREAS=room`) came through but **failed the slice check: shadow batches 325 and 58 ms, draw batches 63 ms**, on a machine
then running ~2.5× slower than the first run (part A's same Desert Island slices: longest 19 → 48 ms). The 325 ms unit was
not isolated (the prepLog's `u` field names it; not re-run by the user's request for minimal tests): **open**.

## 4. Auto's first guess (goal 2) — no change, on the evidence

`autoapply.js`: a first start (nothing cached) guesses from the GPU's name (`perf.js gpuQuality`: a GTX 1050 → 'high')
and the power source: **plugged in High, on battery Medium** (AUTO-2), then the title's calibration (`Calibration`) may
move it with `estimate()` from the cost model, never below Medium. The user's 18.11 run was on battery → Medium "by a
guess". The cost model's factors come from the Vega 8 (Medium = 0.56 × High's GPU time). With the user's battery
measurement (Medium GPU p95 13.5–13.8 ms) that model puts High at ~24 ms — over 60's budget; the GTX 1050's own plugged-in
runs (10.11: High GPU p50 7.1 / p95 8.3 ms, Medium 8.6 / 16.6 on the street) suggest High ≈ Medium on that GPU, which
would put High on battery near 14 ms p95: under 16.7 but with ~2 ms of room, too close for a first guess with no
measurement. **High on battery has never been measured** on the GTX 1050. At a 30 limit the calibration already works to
33.3 ms (`budget = max(16.7, frameCapMs)`), so a title measured at Medium can start High there; FPS30 deliberately judges a
step *up* against 60's budget so the limit's saving stays battery. The hysteresis is untouched. What would justify a
change: order 56 step 4 (a fixed High run on battery); then a per-GPU cost factor for discrete NVIDIA parts.
And the 19.11 run shows Chrome on the **UHD 620**: there Medium is the right start and Auto stepped to Low on measured
CPU pressure — as designed.

## 5. The street's CPU (goal 3)

Not changed. The user's numbers: GTX 1050 battery CPU work p95 17.5 ms (submit main 4, other sim 2.4, people 1.6,
submit other 1.9); UHD 620 plugged in p95 22.3 ms (submit main 5.8, submit other 2.9, people 1.7, other sim 2.3). A CPU
profile of the street route here (`results/street-profile-medium.txt`, 240 frames, Medium) is 92 % `uniformMatrix4fv` —
SwiftShader executing the draws (skinned bodies' bone matrices) on the CPU, not the game's JavaScript — and the game's
own functions are each under 0.1 % (shadowcull update, the shown-world walk, the minimap's build); the heap grew by
~0 KB a frame between collections. Earlier work (PERF-CPU, CPU-WALK, PERF-SUBMIT) already took the per-frame walks,
allocations and caster lists; nothing cheap and clearly measurable was left that SwiftShader can show. "Submit main" is
three's own draw submission (≈ draw calls × per-call cost): what lowers it is fewer calls (Low's profile, which Auto
chose on the UHD 620 on measured CPU pressure) — a hardware measurement, not a guess from here.

## 6. What the user's hardware must confirm

1. Pause → **Benchmark** (Auto as played) on the GTX 1050 on battery (and on the UHD 620 if Chrome uses it): the report's
   line "scene changes' preparation behind the black" now lists each step kind's count / longest / total; the expectation
   from here is every kind's longest near one or two refreshes, the arrival's frames over 33 ms behind the black fewer and
   shorter, and the black lasting a few frames longer (the same work over more frames).
2. Pause → **Benchmark: Frame Rates** on battery (60 and 30).
3. Order 56 (`tools/testlab/CLOUD_ORDERS.md`): the same on the desktop, plus a fixed High run on battery (goal 2).

## 7. Remaining limits

- **No hardware number.** Whether the GTX 1050's arrival black frames now stay under ~50 ms, and the UHD 620's warm-up
  step under its 1 013 ms, needs §6. A program the driver compiles synchronously still costs its full time in one step
  (it is now alone in it); where `KHR_parallel_shader_compile` exists three only starts it and `whenReady` polls.
- Units left over the slice: a texture array's creation and upload (one per array, 20–31 ms here), one large piece's
  place in overlapRuns (up to 69 ms), a geometry upload part (uploadGeometry by quarters of the area's children: 30–56 ms
  here, 121 ms on the UHD 620 — the next candidate to cut finer, by object count, if the hardware line shows it).
- The texture layers' first canvas read-back (§1.5): one read, unsplittable; its hardware cost is unknown.
- Citadel's return: 12 station pieces change look on the first frame drawn (cells rebuilt in that still-black frame) in
  every variant; not addressed.
- The black screen lasts longer on a cold arrival (the same work over more frames); the probe counts 52–72 black frames
  where there were 32–42 (at 60 fps ~0.3–0.5 s more). Nothing was moved before the benchmark; no visual was dropped.
- The 34 ms frame 5.6 s after an arrival (18.11) was not reproduced here (SwiftShader's frames in view after an arrival
  are dominated by its own raster stalls); the report's hitch line on hardware will name its work.
- Auto's first guess unchanged (§4) until a High run on battery exists.
