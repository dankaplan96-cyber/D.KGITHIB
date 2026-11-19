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

RESULTS_TABLE

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

STREET_SECTION

## 6. What the user's hardware must confirm

1. Pause → **Benchmark** (Auto as played) on the GTX 1050 on battery (and on the UHD 620 if Chrome uses it): the report's
   line "scene changes' preparation behind the black" now lists each step kind's count / longest / total; the expectation
   from here is every kind's longest near one or two refreshes, the arrival's frames over 33 ms behind the black fewer and
   shorter, and the black lasting a few frames longer (the same work over more frames).
2. Pause → **Benchmark: Frame Rates** on battery (60 and 30).
3. Order 56 (`tools/testlab/CLOUD_ORDERS.md`): the same on the desktop, plus a fixed High run on battery (goal 2).

## 7. Remaining limits

LIMITS
