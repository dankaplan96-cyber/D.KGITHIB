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
4. (PERF-CPU) The settle frames also hold while the last frame still rebuilt the static shadow cache, built batches,
   compiled a program or let pieces out of their shadow batches (at most 6 frames in all); dogs and builders' moving
   parts never go into static shadow batches. See PERF_CPU.md §5.

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

- **Every report** shows the quality setting (Auto with its profile, phase — evaluating or held — and what it runs, or
  the preset chosen by hand), the start source and cache entry, the title calibration's numbers, the last window, and
  Auto's decisions in this session (time, decision, reason, profile after; a queued one as "→ X at the next scene
  change or menu"). The fixed runs set presets by hand and give Auto back at the end.
- **Benchmark: Auto as played** (pause menu, or `game.bench.runAuto({ routes, measure, fromTop })`): every route once in
  a row, 1.5 s warm and 20 s measured, Auto on and the governor running, nothing reset between routes. Each route's
  scene change is a commit point, so the evaluation's decisions take effect between routes. Per route: fps; frame p50,
  p95, p99, max; frames over 33, 50, 100 ms (behind black); GPU and CPU-work p50 / p95; the profile at the start and
  end and the share of frames at each; pacing, **"callback late" p50 / p95** and **uploads per frame** (PERF-CPU); every
  hitch with what ran in it. `fromTop: true` starts from High, evaluated.

## 8. What the next Vega 8 benchmark should show (battery first)

Run **Benchmark: Auto as played** on battery, then plugged in, then the full Benchmark once on battery. Look for:

1. **Start:** without a cache, the guess (battery: one profile lower than the name's), the title's numbers if it was
   measured, then the evaluation: decisions only at the route changes (scene changes), each "evaluation: … pressure"
   or "room …", then **"settled"** within the first minute or two of play. With a cache (a second run): straight to the
   settled profile, **no decision at all** during the run (or one "settled" after a try one up).
2. **Battery:** a settled profile among Medium-lite, Low or Low-lite that holds ≥ 55 on street, combat and arrival.
3. **No jumps:** after "settled", at most one decision in the whole run, and only "held, but a sustained problem…";
   never an "up"; nothing applied except at a route change.
4. **The plateau:** where the display paces slower (the full benchmark's "nothing drawn" column), no decision.
5. **Hitches:** every frame over 33 ms with its reason (PERF_CPU.md §5 for what changed).

## 9. Visible trade-offs (Auto only; the presets chosen by hand are unchanged)

- Each profile is named in the Settings line; High, Medium and Low are the presets exactly.
- Medium-lite: Medium's shadows at 90 % resolution, FXAA instead of MSAA, 2 lamps, Low's grass and small casters, far
  people (beyond 25 m in view) posed every other frame.
- Low-lite: Low at 75 % resolution, far people posed every other frame, a person's small parts (eyes, buttons) left out
  under 2.5 px beyond 12 m.
- A change of profile shows only at a scene change (behind its black) or when a menu closes; never in play.
- In every profile and preset (PERF-CPU, not a knob): people outside the view are posed every 4th frame.

## 10. Tests (SwiftShader in this container; the logic only, not frame rates)

- `node tests/autoquality.mjs`: the governor on synthetic noisy traces (each simulated machine with its own "truth"
  costs, deliberately not the governor's model; scene changes every 25–45 s as commit points). **PASS 39/39.** It
  covers: the five profiles and their labels; room to spare (High, settled within 90 s, no step in 15 min); display
  plateaus at 17.7 and 19.2 ms with light work, with and without a timer query (no step in 15 min); GPU-bound, CPU-bound
  (a battery-clocked processor) and heavily CPU-bound machines: settle within 4 min at a profile holding ≥ 55 fps, **at
  most one change after settling in 15 noisy minutes, never up, every change applied at a scene change or menu**; a
  noisy machine near the edge with bursts and stalls (± 30 % timings): at most one change after settling, none in play;
  stalls of 550 and 160 ms and heavy transitions: no step; a 20 s heavier stretch after settling: no change, a
  sustained one across scene changes: exactly one step down, at the next scene change; started too low: one step up in
  the evaluation, then held; held with lots of room: never up, margin noted; a try one up from the cache that cannot
  hold: back down, held, marked; below Low-lite: settles there; a 30 fps limit; no timer query; one scene only (the
  evaluation still ends); calibration estimates.
- `tests/autoquality-game.mjs` checks it in the game: a new player gets Auto; migration; the Settings chips and line;
  Medium by hand unchanged; Auto's High, Medium and Low profiles render as the presets (High: the same draw calls);
  Low-lite's knobs; a decision queued in play changes nothing until the pause menu commits it; a queued step applied by
  the next scene change (the house door); plug / unplug without and with a settled battery profile; the title
  calibration; the evaluation settling and caching; the next start straight to the settled profile; the try one up;
  both benchmark modes. (See PERF_CPU.md §7 for the run's verdict.)

## 11. Open issues (ranked)

1. **Hardware acceptance is pending.** Thresholds, the profiles' cost factors and the calibration's margins are starting
   values. No GPU time or frame pacing was measured here.
2. A queued step waits for a scene change or a menu. A player who stays in one area for minutes with a sustained
   problem keeps it until then (by the user's rule: never a visible change mid-play).
3. The evaluation's verdict is taken at the clocks of its minute; a processor that slows later (heat) is the hold's
   "sustained problem" rule's job (one step down, at the next scene change).
4. The user's own High chosen by hand is kept (§2); Auto is one choice away.
