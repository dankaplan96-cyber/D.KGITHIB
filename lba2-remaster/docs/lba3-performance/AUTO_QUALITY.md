# AUTO-QUALITY (I-13, with I-11 and I-12): Quality Auto — five profiles, settle then hold

The user (28.10): "the game must detect the computer's capabilities automatically and run the quality and the optimal
settings accordingly, without manual changes. 55–60 fps is the requirement." And (29.10): "if the game runs well on
battery there's no reason it won't on mains"; "there are too many settings"; "Auto should settle on the best settings
after thinking a little, and then NOT change every few seconds — it jumps".

**Status: implemented and checked with automated tests on SwiftShader, which is a software renderer. It has not been
accepted on the target hardware.** No frame rate, GPU time or pacing figure in this document was measured on the
user's Vega 8. Every decision threshold is a starting value derived from the user's own Vega 8 reports (builds 241,
244, 251 and 255, plugged in and on battery). The next benchmark on the laptop is the acceptance run (§8).

**PERF-CPU (29.10) replaced the build-251 governor.** Build 251 moved one knob at a time on two ladders (GPU, CPU),
stepped every few seconds and stepped back up between areas; on battery it raised shadows on a light window and the
next area (the arrival) paid for it. Now Auto chooses one of **five complete, named profiles**, evaluates the first
minute or so of play, then **holds** the profile; every change is applied only at a scene change or in a menu. §3–§5
describe the new design; §6–§7 are unchanged from build 251 unless marked.

Code: `src/engine/autoquality.js` holds the profiles, the cost model, the governor, the calibration and the labels. It
has no DOM or three.js and is tested in Node. `src/engine/autoapply.js` connects it to the game: renderer, shadow map,
light pool, vegetation, shadow culling, the people's animation rate and far detail (`drawcull.js` FarCull), title
calibration, cache and power. Other changes: `src/engine/renderer.js` (`knobs`), `environment.js` (`setShadowMap`),
`perf.js` (the GPU timer's `stride` and `onFrame`), `bench.js` (the report and `runAuto`), `src/main.js` (settings,
migration, the Settings line, commit points, hitch attribution, settle frames), the text tables, and `desktop/`.

## 1. What the player sees

- **Settings → Display → Graphics: Auto / Low / Medium / High.** Auto is the default.
- The line under the row names the profile Auto runs: `Auto (Medium-lite): chosen for this computer and power source
  in the first minute or so of play to hold 55–60 fps, then kept.` While it is still evaluating: `Auto (Medium,
  settling): …`. On battery, the existing battery note is added.
- Low, Medium and High chosen by hand are the presets exactly as before (`renderer.knobs` stays `null`).
- Auto makes no toasts or pop-ups. A change of profile is never applied in the middle of play: it waits for the next
  scene change (behind its black) or a menu (pause, inventory, map).
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

## 3. The five profiles (PERF-CPU)

A profile is a complete set of knobs. High, Medium and Low are the presets exactly; Medium-lite and Low-lite are the two
steps the user's battery runs asked for: below Medium with shadows kept, and below Low for a processor at battery clocks.

| profile | resolution | edges | bloom | shadows | lamps | grass / small casters | people out of view | people in view beyond 25 m | far small parts |
|---|---:|---|---|---|---:|---|---|---|---|
| High | 100 % | MSAA 4× | on | PCF soft, 4096 | 8 | High's | ¼ rate | full rate | under 0.75 px beyond 30 m |
| Medium | 100 % | MSAA 2× | off | PCF, 1024 (cached) | 4 | Medium's | ¼ rate | full rate | under 0.75 px beyond 30 m |
| Medium-lite | 90 % | FXAA | off | PCF, 1024 (cached) | 2 | Low's | ¼ rate | **half rate** | under 0.75 px beyond 30 m |
| Low | 85 % | FXAA | off | none | 2 | Low's | ¼ rate | full rate | under 0.75 px beyond 30 m |
| Low-lite | 75 % | FXAA | off | none | 2 | Low's | ¼ rate | **half rate** | **under 2.5 px beyond 12 m** |

- "People out of view ¼ rate" is the same in every profile and every preset (PERF-CPU §3: nobody sees it): a person
  outside the view is posed every 4th frame (every 8th beyond the fog) with the time of the frames between. Never the
  hero, an enemy, anyone in dialogue or a story scene.
- "Half rate in view beyond 25 m" (Medium-lite, Low-lite): such a person's limbs are posed every other frame; the body
  still moves every frame. Within 25 m of the camera everyone is posed every frame.
- "Far small parts" (Low-lite): a person's eyes, buttons and other parts under 0.2 m are left out of a frame while
  under 2.5 px on screen beyond 12 m (else 0.75 px beyond 30 m).
- On battery the battery profile still applies on top (no MSAA, the 5-read shadow filter, 2 lamps, lamps without the
  specular term).
- The cost model (each profile's share of High's GPU and CPU time; from the user's build-244 breakdown, the old ladders'
  measured steps multiplied out): Medium 0.56 / 0.80, Medium-lite 0.46 / 0.72, Low 0.36 / 0.62, Low-lite 0.31 / 0.54.
  It picks the start (calibration) and judges whether a step up would fit; steps down are measured pressure only.

## 4. The governor: evaluate, then hold

Inputs for every displayed frame in play: the frame interval, the game's own CPU work for that frame (simulation plus
render submission, without background slices), the GPU's own time (timer query, every other frame, where the browser
offers it) and the scene (the room or region on show).

Frames that are **not counted**: menus, cinematics and cutscenes, scene changes plus 1.5 s after them, shader holds,
the loading screen, a hidden or background window, the benchmark's fixed runs, the tests' fixed stepping. A frame over
100 ms is left out of the percentiles and counted as a missed refresh; one over 250 ms restarts the window and adds
1.5 s of quiet. **No stall or transition ever moves the profile.**

Each 1.5 s window of counted play is classified (B is the frame budget: 16.7 ms, or 33.3 ms under a 30 fps limit):

- **ok**: at least 55 fps (27.5 under a 30 fps limit), with fewer than 6 % of intervals over 1.2 B.
- **paced** (display or OS): slower, but the CPU p90 and the GPU p90 are both at or below 0.75 B. Without a timer
  query: the CPU is light, under 8 % missed, p90 ≤ 1.17 B. **Never a reason to change.**
- **gpu** / **cpu**: slower, and that side's p90 is the longer one (no timer query: CPU if its p90 > 0.75 B).

**Evaluate** (the first minute or so of play; again after a power change without a settled profile):

- Pressure in 3 windows in a row, or in 4 of the last 6: **one profile down**, queued.
- Room for the profile above in every window so far (≥ 30 s of play over two scenes, every window ok or paced, the
  model's prediction for the profile above ≤ 0.72 B on both sides in each window): **one profile up**, queued — at
  most once per evaluation (never in a try one up from the cache, below).
- After ≥ 60 s of counted play across ≥ 2 scenes (or 120 s in one): if ≤ 10 % of the windows were under pressure
  and ≤ 5 % of the intervals missed the refresh, the profile is **settled**: held, and cached for this machine and
  power source. Otherwise one profile down and the evaluation goes on. At Low-lite it settles in any case.
- A queued step takes effect at the next commit point; the windows in between are not counted, and the evaluation
  restarts its count for the new profile (the scenes already seen still count).

**Hold** (the rest of the session):

- No change, except:
  - **a power-source change**: that source's settled profile (held), or one profile lower on battery / higher on
    mains, evaluated;
  - **a sustained real problem**: over the last 30 s of counted play ≥ 80 % of the windows under pressure and
    > 10 % of the intervals missed, with the pressure seen in two scenes (or 60 s of it in one scene): one profile
    down, queued; then at least 60 s before another.
- **Never up during a session.** A held session that had room for the profile above in ≥ 90 % of ≥ 3 min of windows
  marks its cache entry (`margin`). The next start then tries one profile higher, evaluated: if that cannot hold, it
  goes back to the settled profile (held), and the try is not repeated for the next 3 starts.

**Commit points** (where a queued profile takes effect and the game makes its programs): a scene change (inside its black
and shader hold, `warmScene`), an open pause / inventory / map, a power change, the start of play. Auto keeps High's
32 m shadow cells in every profile, so no profile change rebuilds the shadow batches.

## 5. Calibration and cache

The cache key is the GPU string, the power source, the screen and, in the desktop app, the processor's name. It is
stored in `localStorage['lba3_autoq_v2']` (the build-251 `v1` entries described ladder positions and are not read).
Each entry: `{ p: the profile, src: 'settled' | 'calib', margin, noTry, at }`.

- **Settled entry**: the next start goes straight to that profile and holds it (no evaluation, no jumps), or tries one
  higher when `margin` is set (above).
- **Calibration entry, or nothing cached**: the GPU name's guess (one profile lower on battery; if the other power source
  is settled, its profile one lower / higher), the title screen's 1.5 s measured (`estimate()`: the best profile whose
  predicted GPU and CPU both fit 0.7 B, with margins ×1.15 GPU and ×1.3 CPU for the title's lighter view), and the
  evaluation in play decides. If play starts before the title was measured (the user's build-255 run), the evaluation
  starts from the guess.
- **Automated tests on a software renderer:** Auto is High and the governor is off, as the tests always ran. `?autoq`
  turns it on there too.

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
- `tests/autofit.mjs`, `audit.mjs`, `timing.mjs`, `crosssystem.mjs`: PASS.
  - `timing.mjs` first failed because the renderer's size key named Auto differently from High. The key now uses the
    renderer's base quality, which is 'high' under Auto, so Auto at High and High chosen by hand share it.
- `tests/dynres.mjs`: PASS. It now sets its preset by hand, because it tests the automatic resolution of a preset
  chosen by hand; under Auto the governor sets the factor.

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
