# AUTO-QUALITY (I-13, with I-11 and I-12): Quality Auto, a calibration and a runtime governor

The user (28.10): "the game must detect the computer's capabilities automatically and run the quality and the optimal
settings accordingly, without manual changes. 55–60 fps is the requirement."

**Status: implemented and checked with automated tests on SwiftShader, which is a software renderer. It has not been
accepted on the target hardware.** No frame rate, GPU time or pacing figure in this document was measured on the
user's Vega 8. Every decision threshold is a starting value derived from the user's own Vega 8 reports (build 241,
build 244 plugged and on battery). The next benchmark on the laptop is the acceptance run (§8).

Code: `src/engine/autoquality.js` holds the knobs, ladders, cost model, governor, calibration and labels. It has no
DOM or three.js and is tested in Node. `src/engine/autoapply.js` connects it to the game: renderer, shadow map, light
pool, vegetation, shadow culling, cache, title calibration and power. Changes to existing files are in
`src/engine/renderer.js` (`knobs`), `environment.js` (`setShadowMap`), `perf.js` (the GPU timer's `stride` and
`onFrame`), `bench.js` (the report and `runAuto`), `drawbatch.js` and `shadowcull.js` (build counters), `src/main.js`
(settings, migration, the Settings screen, commit points, hitch attribution, settle frames), `index.html` (the Auto
chip and the pause-menu entry), the text tables, and `desktop/` (processor information).

## 1. What the player sees

- **Settings → Display → Graphics: Auto / Low / Medium / High.** Auto is the default.
- The line under the row reports what Auto is running now, with the nearest preset and every difference from it.
  Examples: `Auto (High): set from this computer, adjusted in play to hold 55–60 fps.`,
  `Auto (High, no bloom, resolution 90 %)` and `Auto (Medium, soft shadows, shadow map 2048)`. Labels are honest:
  a state that is lower than High is never called High, and the resolution is named whenever it is below 100 %. On
  battery, the existing battery note is added.
- Low, Medium and High chosen by hand are the presets exactly as before. `renderer.knobs` stays `null`, so the
  code path is unchanged. The test compares every render setting and the draw calls of a street frame.
- Auto makes no toasts or pop-ups. The AUTO-FIT "try a lower preset" suggestion is off under Auto and unchanged for a
  preset chosen by hand.
- Pause menu: **Benchmark: Auto as played** (§7).

## 2. Migration of stored settings (settings `qv` 2)

| stored settings | after the update |
|---|---|
| none (a new player) | Auto |
| a preset the game picked from the GPU's name (`qv` 1, no `qPicked`, equal to `gpuQuality(gpu)`) | Auto |
| the automatic pick from before 0.30 (equal to `oldGpuQuality(gpu)`) | Auto |
| a preset picked in Settings (`qPicked`, recorded since 0.30) | that preset, `qualityChosenByHand: true` |
| a preset that matches neither automatic pick (chosen before `qPicked` existed) | that preset, chosen by hand |
| `qv` 2 | as stored |

New fields: `qualityAuto` and `qualityChosenByHand`. `quality` continues to hold the preset, or under Auto the nearest
tier, so every existing reader keeps working. If anything sets `quality` directly while Auto is on, that counts as a
choice by hand from then on. This covers the benchmark's fixed runs, the tests and the probes. The benchmark puts Auto
back when it finishes.

**The user picked High by hand, so their High stays after this update.** To get Auto they select it once. The
coordinator may prefer a one-time switch; that decision is left to them.

## 3. Knobs and ladders (least visible first)

All knobs are rendering-side. None of them touches the player's face or hands detail, the animation rate, the
simulation step or physics.

| knob | values (best → cheapest) | where it acts | takes effect |
|---|---|---|---|
| scale | 1 · 0.9 · 0.8 · 0.7 of High's pixel ratio | the scene pass's viewport (the existing automatic resolution, which allocates nothing) | at once |
| bloom | on · off | `UnrealBloomPass.enabled` | at once (programs made at startup) |
| filter | PCF soft · PCF | `shadowMap.type` | at the next commit point |
| map | 4096 · 2048 · 1024 | the sun's map: 4096 and 2048 over High's ±48 m box, 1024 over Medium's ±36 m; 2048 and below go into the static shadow cache | at once (one cache rebuild) |
| lamps | 8 · 4 · 2 | the light pool's size | at the next commit point |
| msaa | 4× · 2× · off with FXAA | the composer targets' samples | at once (one target reallocation) |
| shadows | on · off | `shadowMap.enabled` | at the next commit point |
| veg | High · Medium · Low grass and tree distances | `world.setDetail` (kit.js `LOD_PRESETS`) | at once |
| casters | High · Medium · Low small-shadow distance and distance detail | `shadowCull.quality` (`SMALL_FAR`, `MIN_PX`) | at once |

The **commit points** are a scene change (inside its black frame and shader hold, `warmScene`), an open
pause, inventory or map, a plug or unplug, and the start of play. The game already compiles shader programs at these
moments. A commit knob never freezes play. Auto also keeps High's 32 m shadow cells at every tier, so a governor step
never rebuilds the shadow batches (PERF-HIGH `cellFor`).

**GPU ladder**, used when the GPU's own time is the long side:
scale 0.9 → no bloom → PCF filter* → map 2048 → 4 lamps* → MSAA 2× → map 1024 *(≈ Medium at 90 %)* → scale 0.8 →
FXAA → 2 lamps* → scale 0.7 → no shadows* *(≈ Low at 70 %)*

**CPU ladder**, used when the game's main-thread work is the long side:
no bloom → map 2048 → Medium's small casters → Medium's grass *(≈ Medium)* → Low's small casters → Low's grass →
no shadows* *(≈ Low)*

\* commit knob. When a step down lands on a commit knob, the same move also takes the next live step, so the frame
rate gains immediately.

The knobs at a given position are High's, with every step above both positions applied. A knob shared by the two
ladders takes the lower value.

**Cost model** (each step's share of that side's time). It comes from the user's Vega 8 High-street breakdown, build
244 plugged in: GPU 12.69 ms and game CPU 15.4 ms as is.

| change | GPU | CPU | source |
|---|---:|---:|---|
| no bloom | ×0.735 | ×0.89 | measured (9.33 GPU, 13.7 CPU) |
| map 2048 | ×0.97 | ×0.95 | GPU measured (12.31); CPU estimated (the breakdown showed no CPU change) |
| MSAA 2× | ×0.936 | ×0.99 | GPU measured (11.88) |
| no shadows | ×0.85 | ×0.84 | CPU measured (12.9); GPU measured ×0.755 at 4096, ×0.85 assumed for the cached 1024 map |
| resolution s | (0.62+0.38s²) relative | — | fit to as-is and ×0.6 (9.57) |
| PCF filter, 4 and 2 lamps, map 1024, FXAA, small casters, Low's grass | 0.95–0.99 | 0.96–1 | estimated |

The governor uses the model only to predict whether a step **up** still fits, and the calibration uses it to pick a
start. Steps down are driven by measured pressure only.

## 4. The governor (thresholds)

Inputs for every displayed frame in play: the frame interval, the game's own CPU work for that frame (simulation plus
render submission, without background slices), and the GPU's own time from the existing timer query on every other
frame, where the browser offers it.

These frames are **not counted**: menus, cinematics and cutscenes, scene changes plus 1.5 s after them, shader holds,
the loading screen, a hidden or background window, the benchmark's fixed runs, the tests' fixed stepping, and 1.5 s
after the governor's own step. A frame over 100 ms is left out of the percentiles. A frame over 250 ms restarts the
window and adds 1.5 s of quiet. **No stall or transition ever moves a knob.**

Each 1.5 s window is classified as follows. B is the frame budget: 16.7 ms, or 33.3 ms under a 30 fps limit.

- **ok**: at least 55 fps (27.5 under a 30 fps limit), with fewer than 6 % of intervals over 1.2 B.
- **paced** (display or OS): slower, but the CPU p90 and the GPU p90 are both at or below 0.75 B, about 12.5 ms.
  Without a timer query: the CPU is light, under 8 % of intervals are missed, and p90 is at or below 1.17 B.
  **Never a reason to degrade.** This covers the laptop's ~56.5 Hz plateau, where "nothing drawn" also measures
  17.7 ms. That plateau is already "ok" (56.5 fps). A slower plateau with light work stays "paced".
- **gpu** or **cpu**: slower, and that side's p90 is the longer one. Without a timer query: CPU if its p90 is over
  0.75 B, otherwise GPU.

Rules:

- **Down:** the same pressure in 2 windows in a row (3 s of counted play) and at least 3 s since the last change.
  One step on that side's ladder. If that ladder is at its floor, the other ladder takes the step.
- **Up:** room on that side in 6 windows in a row (9 s), with no pressure. Room means CPU p90 ≤ 0.63 B (10.5 ms) or
  GPU p90 ≤ 0.6 B (10 ms); without a timer query, ≥ 58.5 fps with fewer than 2 % missed. The step also needs ≥ 6 s
  since the last change, ≥ 20 s since the last step down, and the model's prediction for both sides after the step
  at or below 0.72 B. The side further down its ladder goes first.
- **Backoff:** a step up that has to be taken back within 20 s blocks that level for 60 s, then 2, 4, 8 and 16
  minutes.
- At most one step per 3 s. Steps that change nothing now are skipped. On battery, the profile already sets MSAA off,
  the 5-read filter and 2 lamps. With Resolution: Full, the resolution is not used.
- A state held for 60 s of play is stored for this machine as `settled` and used at the next start.

## 5. Calibration and cache

The cache key is the GPU string, the power source (mains or battery), the screen (`width × height @ devicePixelRatio`),
and, in the desktop app, the processor's name. It is stored in `localStorage['lba3_autoq_v1']`. A new GPU, power
source, screen or processor gives a new key, which triggers a new calibration.

- **Known key:** the stored position, either `calib` or `settled`. Nothing is measured.
- **Unknown key:**
  1. Start from the GPU name's guess (`gpuQuality`), so the loading screen compiles programs for something plausible.
     If the other power source is known, start from its state, one tier lower on battery or one tier higher
     plugged in.
  2. On the title screen, after 0.6 s, measure 1.5 s of the title's frames: GPU p90 (timer query), CPU-work p90 and
     frame p50. This adds no wait: the title is already showing.
  3. `estimate()` predicts both sides at every position from the measurement and the model. The title's view is
     lighter than play, so the margins are ×1.15 for GPU and ×1.3 for CPU. It picks the best position whose GPU
     and CPU both fit 0.7 B.
  4. The result is cached as `calib` and takes effect when play starts. New Game, Continue and Load hold the first
     frames for any new programs, as a preset change does.
  5. If the player starts before the measurement ends, the governor continues from the guess in play.
- **Plug or unplug:** the new source's cached state, or one tier lower (battery) or higher (mains) when nothing is
  cached. This is applied together with the existing battery-profile switch and its warm-up.
- **Automated tests on a software renderer:** Auto is High and the governor is off, as the tests always ran. `?autoq`
  turns the governor on.

## 6. I-11 (cold first-visit stalls) and I-12 (cheap CPU wins)

**Found:** Citadel's draw and shadow batches are already built under the loading screen at startup (`prepare()`). A
region's batches, geometry and textures are built in the scene change's black frame (`warmScene`). In play, the batches
of the area on show are rebuilt only after a preset change that changes the shadow cell size (High ↔ Medium/Low), which
happens inside that change's shader hold. Under Auto this no longer happens (fixed 32 m cells). The user's 2750 ms
frame on Low street came 2.8 s into the window. That was right after the benchmark had built five areas under its
loading screen and switched presets. The 26-line summary cannot attribute it. A major garbage collection after a
heap of more than 500 MB is as plausible as a build.

**Changed:**

1. **Hitch attribution.** Every frame over 33 ms in the benchmark now names what ran in the frame before it: draw or
   shadow batches built (ms), the shadow cache rebuilt, shader programs compiled, geometry or textures uploaded, an
   Auto step, a GC (the heap shrank more than 8 MB), or else that frame's own CPU work. Example:
   `2750@2.8s [frame before: work 2731 ms, draw batches built 2650 ms]`, or `[... GC −310 MB]`. The next report
   therefore identifies the cause instead of guessing it.
2. **Settle frames after a hold.** After a scene change's shader hold, the first frame was already kept black. The
   GPU backlog of that frame (shadow cache build, uploads, first draws) then landed on the next frame, the first one
   in view. The arrival route shows 150–200 ms frames, half of them not behind black. Now the screen stays black for
   up to 3 more frames while the last interval was over 50 ms. That is at most about 0.2 s of extra black, only on
   heavy arrivals, and the time is counted as a black frame in the report.
3. **Auto keeps High's 32 m shadow cells.** No governor step rebuilds batches.

**Not changed (I-12), with the reason and the next step.** A larger CPU win needs an owner other than me.

- **Cargo lift, 51 meshes** (`src/game/island.js`, not mine). The whole group is `userData.keep`, so no batch takes it.
  Its static frame (column, base, bolts, rings: about 12 draws) and the turret's rigid parts (about 8, which move
  together) could be merged per material in their parent's space. This needs the builder to put the moving parts
  (cable, hook, crate, lantern, ripple rings) under `keep` on their own instead of the whole group. It is a small
  change in island.js for its owner. An engine-side "rigid sub-batch" in drawbatch.js is possible, but it conflicts
  with solo shadow casters: a batched piece's layer 0 is off, and that hides it from the shadow pass too.
- **Grass and flower tiles with 1–7 instances** (`world.js` / `kit.js`, not mine). Merge each small tile into a
  neighbour of the same geometry when the scatter builds them. That changes no pixel.
- **Face parts:** at High, merging them changes the mouth animation's draw path (CAST-POLISH). Not done.
- **The CPU ladder** is the cheap CPU win that is in my scope. Its first step (no bloom) measured −1.7 ms of game CPU
  on the user's High street. High street's 15.4 ms becomes about 13.7 with a small visual cost, before any other
  step.

## 7. The benchmark

- **Every report** now shows the quality setting (Auto with its running state, or the preset chosen by hand), the
  ladders' positions, the start source and cache entry, the title calibration's numbers, the last window, and Auto's
  decisions in this session (time, step, reason, state after). In the desktop app it also shows the processor and
  memory. The fixed runs set presets by hand and give Auto back at the end.
- **Benchmark: Auto as played** (pause menu, or `game.bench.runAuto({ routes, measure, fromTop })`). It runs every
  route once in a row, 1.5 s warm and 20 s measured, with Auto on and the governor running. Nothing is reset between
  routes. For each route it reports fps; frame p50, p95, p99 and max; frames over 33, 50 and 100 ms, and how many were
  behind black; GPU p50 and p95; CPU-work p50 and p95; the state at the start and end; the share of frames at each
  state; pacing; and every hitch with what ran in it. It ends with every decision of the run and its reason.
  `fromTop: true` starts from High to show the descent.

## 8. What the next Vega 8 benchmark should show

Run **Benchmark: Auto as played** plugged in, then on battery. Then run the full Benchmark once for the fixed-preset
comparison. In the Auto run, look for:

1. **Start:** with no cache yet, the title calibration's GPU and CPU numbers and the start it chose. Expected: between
   Medium and High plugged in, lower on battery. Compare the title's numbers with the street's to tune the margins
   (×1.15 GPU, ×1.3 CPU).
2. **Plugged:** street, interior, combat and hamalayi at ≥ 55 fps.
   - The High street, at the edge with game CPU about 15.4 ms, should take **no bloom** from the CPU ladder if it
     misses.
   - The High arrival (CPU-bound: 16.5 ms, 379 calls) should step down the CPU ladder and stop. The arrival route
     changes area every 3 s, so most of its windows are not counted. The governor acts on the time between arrivals
     only.
3. **The plateau:** in the stretches where the display paces at ~56.5 Hz (the full benchmark's "nothing drawn"
   column), the decisions list should show **no step down**.
4. **Battery:** a start one tier lower if nothing is cached, then GPU and CPU ladder steps toward ≥ 55. The battery
   profile's knobs are not stepped.
5. **Stability:** no up and down pairs within a minute in the decisions list. At most one change per 3 s. Steps up
   only after about 20 s at ≥ 55 with room.
6. **Hitches:** every frame over 33 ms with its reason. The Low street's 2.75 s stall, if it recurs, is either a
   batch build or a GC, and the report will say which. The arrival's in-view 150–200 ms frames should move behind
   black (settle frames).

## 9. Visible trade-offs (Auto only; the presets chosen by hand are unchanged)

- Below High, Auto's states are the listed knob values. Each one is named in the Settings label.
- At its Medium mark, Auto draws at 90 % resolution: the GPU ladder's first step. Its Low mark is 70 % rather than
  Low's 85 %.
- A live step shows once, at most every 3 s. Examples: grass beyond 46 m thinning, bloom going off, the shadow map's
  texels getting coarser. Steps up take at least 20 s.
- The shadow filter, the lamp count and shadows on or off change only at a scene change, a pause or a power change.
- At 2048 and 1024 the static shadow cache is used, as in Medium.
- Arrivals can stay black for up to 3 extra frames (I-11, all qualities).

## 10. Tests (SwiftShader in this container; the logic only, not frame rates)

- `node tests/autoquality.mjs` checks the governor on synthetic traces. Each simulated machine has its own "truth"
  costs, deliberately different from the governor's model. **PASS 30/30.** It covers:
  - ladder and label checks;
  - room to spare: no step in 3 min;
  - display plateaus at 17.7 and 19.2 ms with light work: no step down, with or without a timer query;
  - GPU-bound: GPU ladder only, resolution first, ≥ 3 s apart, ends ≥ 55 fps and stable for 2 min;
  - CPU-bound: CPU ladder, bloom first, resolution untouched;
  - stalls of 550 and 160 ms plus heavy scene changes: no step;
  - a 1.2 s burst: no step;
  - heavy area then light: back to High, steps up ≥ 6 s apart and ≥ 20 s after the last step down;
  - a marginal GPU over 15 min: ≤ 4 changes and none in the last 5 min;
  - a step up that always fails: ≤ 6 tries in 20 min (backoff);
  - commit queuing and commit;
  - battery no-op steps;
  - a 30 fps limit;
  - no timer query;
  - calibration estimates.
- `tests/autoquality-game.mjs` checks the same in the game. **PASS 22/22.** It covers:
  - a new player gets Auto;
  - six migration cases;
  - the Settings chips and line;
  - Medium by hand is unchanged;
  - Auto at its top is High exactly: every render setting and the street frame's draw calls;
  - Auto at its Medium marks renders as Medium;
  - steps reach the renderer;
  - pause and scene-change commits;
  - plug and unplug;
  - battery no-ops;
  - title calibration, start and cache;
  - both benchmark modes.
  A SwiftShader sample of the Auto report is written to `tests/out/autoquality-bench-auto.txt`.
- `tests/menus.mjs`: PASS.
- `tests/perfbudget.mjs ROUTES=street`:
  - High: 233 calls (p95 257, shadow 56), 891k triangles, no new programs. PASS. PERF-HIGH's candidate was 228
    (p95 254, shadow 56), 889k.
  - Medium: 200 calls (p95 224, shadow 36), 446k. PASS. The base commit b1b0dff measured in the same session gave
    196 (p95 228, shadow 36), 455k: the same preset, within the route's run-to-run spread.
- `tests/drawcalls.mjs`: PASS.

## 11. Open issues (ranked)

1. **Hardware acceptance is pending.** Thresholds, cost factors and calibration margins are starting values. No GPU
   time or frame pacing was measured here.
2. The calibration's title-to-play margins are guesses until one laptop run compares the title with the street.
3. Distant resident update rate is not a knob. walkers.js is not mine. Residents already step at 1/3 rate between
   60 and 110 m. A `scale` hook on `FULL_R` and `REDUCED_R` would add a CPU step for the owner.
4. I-12 merges (cargo lift, small grass tiles): §6, owners of island.js and world.js/kit.js.
5. A commit knob waits for a scene change or menu. In a very long stretch of play without one, the governor works
   with the live knobs only.
6. The GPU timer query now runs in play on every other frame under Auto. If a driver showed a cost, `stride` can be
   raised. The full benchmark's "GPU timer off" line measures it.
7. The user's own High chosen by hand is kept (§2).
