# Performance stabilization milestone (from 30.10.2026)

Feature and content work is paused: Twinsen's house layout, the folder rename lba2-remaster → lba3 and new art.
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
(to be filled per pair: confirmed costs, fixes with before/after, remaining scenes, visual trade-offs, next step)
