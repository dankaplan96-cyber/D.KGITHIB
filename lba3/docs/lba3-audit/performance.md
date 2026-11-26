# LBA3-RUN · lba3-performance: steady play on three 60 s routes (23–24.11.2026)

Agent: lba3-performance (wave 4, paired with lba3-progression). Base revision **`4cdf28e3`** (branch
`ccr-c1c2c4b9-dep6ed`, wave 3 done); work on this worktree's branch, commits listed in §7. The user's 22.11 rule (stop the
long measuring, fix) kept the measuring to the three routes the brief names, twice each, at two rates, on two builds.

**Every number here is Automated runtime only (SwiftShader)**: headless Chromium in the cloud, a CPU rasteriser, no
GPU, no battery, no real display, on a machine shared with another agent's test browser. Nothing here is a result for
the user's GTX 1050, UHD 620 laptop or work computer (UHD, 100 Hz), and nothing was inferred for them (or for a Vega 8,
which none of the user's machines has). Words used precisely: **automated** = a script drove the game; **inspected** =
read in code or an earlier report; **played** = a person at the keys (none here); **untested** = neither.

## 1. Build, machine, power, settings (as the runs recorded them)

| | |
|---|---|
| Builds | **baseline** `4cdf28e3` (served from a copy of its `src/` and `index.html`); **candidate** = this branch (`src/` changed only in `engine/rig.js` and `main.js`) |
| Machine | Intel Xeon @ 2.10 GHz, 4 vCPU, 15 GB, Linux 6.18; load average 6.5–9.7 during every run (the parallel agent's browser) |
| Browser / GPU | HeadlessChrome 153 (Playwright), WebGL2 on SwiftShader (Vulkan 1.3, Subzero) — no GPU timer worth reading |
| Power | none: the game reads no battery and treats it as "plugged in" |
| Display | headless: requestAnimationFrame at ~60 Hz, dPR 1, render pixel ratio 1 |
| Settings (effective, printed by the script) | 1366×768 · Follow camera, Classic keys (Modern for combat's strafe) · Quality **Medium**, Auto off · world resolution 100 % · Edges Smooth (MSAA 2×) · visual 2026 · shake on · Frame Rate **30** (locked) or **Unlimited** (`fps: 'auto'`, which targets the 60 Hz refresh here) |

**The draw is stubbed in the timed runs** (`MODE=cpu`, as SMOOTH-1 did): a real SwiftShader frame at 1366×768 takes
seconds, so a 60 s route with real draws is not possible here. The frame intervals are therefore the game's own loop on
the browser's frame clock with the simulation's full CPU work and no draw; the CPU column is the simulation (the render
submission is not in it). GPU time: not available here — it needs the user's machines (§6).

## 2. The routes (tests/smooth-routes.mjs, `SECS=60`)

Each route is SMOOTH-1's, repeated until ≥ 60 s of game time are recorded (whole laps, so 60–80 s), the same keys at the
same game times on both builds, seeded randomness:

| route | save | what is driven |
|---|---|---|
| **street** — Follow-camera street turns | `new-11-town` (Citadel, chapter 1) | the run west past the residents, the tight 115° turn by Bug Street, north, a stop, a 340° turn on the spot (the camera sweeps the harbour); then back along the same legs, the sweep the other way, round again |
| **combat** | same save, Modern keys | one mite in the fields: lock on, charge the ball while strafing right, release; left; lock off, turn round and back, lock, throw; lock off, again |
| **Zeelich** — exploration (Mill Lane) | `base-12` (Zeelich) | north up Mill Lane past the residents beside the Cistern Rise (its deck and cart running up and down the whole time: zlift.js), weaving, turns on the spot; back to the start and round again |

`PROF=1` times, per drawn frame, the code changed since the last measured build that runs every frame: every rig's
update and in it ARM-CLEAR (P111, rig.js), `findInteractable` and its P115 `goalPick` (main.js), the ball's `throwTarget`
(AIM-KEEP/AIM-AHEAD, combat.js); and every character's first ARM-CLEAR set-up that happens during the route.

## 3. What was measured

### 3.1 Frame intervals, hitches, CPU (two runs per build per rate; run 1 is the first minute after the load)

**Frame Rate 30 (locked)**

| route | Frame Rate | build | run | frames | s | fps | interval p50 / p95 / p99 / max ms | > 50 ms | sim p50 / p95 / mean ms | rigs ms/frame | ARM-CLEAR ms/frame | findInteractable ms/frame | ARM-CLEAR set-ups in play (max ms) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| street | 30 | baseline | 1 | 2415 | 80.5 | 30 | 33.3 / 33.4 / 33.4 / 33.5 | 0 | 2.3 / 4.9 / 2.65 | 1.747 | 0.396 | 0.161 | 3 (12.4) |
| street | 30 | baseline | 2 | 2415 | 80.5 | 30 | 33.3 / 33.4 / 33.4 / 33.5 | 0 | 2 / 3.4 / 2.19 | 1.135 | 0.257 | 0.129 | 0 |
| street | 30 | candidate | 1 | 2417 | 80.5 | 30 | 33.3 / 33.4 / 33.4 / 33.5 | 0 | 2.9 / 6.5 / 3.4 | 2.467 | 0.873 | 0.178 | 3 (2.8) |
| street | 30 | candidate | 2 | 2412 | 80.5 | 30 | 33.3 / 33.4 / 33.4 / 50 | 0 | 2.2 / 5.4 / 2.64 | 1.598 | 0.613 | 0.165 | 0 |
| combat | 30 | baseline | 1 | 2003 | 73.3 | 27.3 | 33.3 / 33.4 / 66.6 / 5366.4 | 23 | 2.1 / 6.8 / 3.1 | 1.411 | 0.371 | 0.197 | 0 |
| combat | 30 | baseline | 2 | 2012 | 92.4 | 21.8 | 33.3 / 33.4 / 50 / 24382.3 | 18 | 2.1 / 6.1 / 2.97 | 1.587 | 0.34 | 0.154 | 0 |
| combat | 30 | candidate | 1 | 1978 | 68.3 | 28.9 | 33.3 / 33.4 / 83.3 / 150.1 | 34 | 2.3 / 10.2 / 4.02 | 1.539 | 0.239 | 0.287 | 0 |
| combat | 30 | candidate | 2 | 1998 | 75.4 | 26.5 | 33.3 / 33.4 / 66.7 / 7283.1 | 31 | 2 / 7.5 / 3.33 | 1.091 | 0.113 | 0.178 | 0 |
| Zeelich (Mill Lane) | 30 | baseline | 1 | 2146 | 72.2 | 29.7 | 33.3 / 33.4 / 33.5 / 200 | 11 | 2.6 / 7.6 / 3.74 | 1.04 | 0.184 | 0.188 | 10 (24.1) |
| Zeelich (Mill Lane) | 30 | baseline | 2 | 2141 | 71.8 | 29.8 | 33.3 / 33.4 / 33.5 / 99.9 | 8 | 2.8 / 6.1 / 3.49 | 1.688 | 0.336 | 0.172 | 0 |
| Zeelich (Mill Lane) | 30 | candidate | 1 | 2159 | 72.3 | 29.8 | 33.3 / 33.4 / 33.5 / 100 | 8 | 2.9 / 8.3 / 3.89 | 1.2 | 0.399 | 0.198 | 10 (14.7) |
| Zeelich (Mill Lane) | 30 | candidate | 2 | 2169 | 72.3 | 30 | 33.3 / 33.4 / 33.4 / 100 | 2 | 2.7 / 6.4 / 3.22 | 1.368 | 0.278 | 0.168 | 0 |

**Frame Rate Unlimited (targets the 60 Hz refresh)**

| route | Frame Rate | build | run | frames | s | fps | interval p50 / p95 / p99 / max ms | > 50 ms | sim p50 / p95 / mean ms | rigs ms/frame | ARM-CLEAR ms/frame | findInteractable ms/frame | ARM-CLEAR set-ups in play (max ms) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| street | Unlimited | baseline | 1 | 4791 | 80.5 | 59.5 | 16.7 / 16.8 / 16.8 / 83.3 | 5 | 2.4 / 6.1 / 3.02 | 1.001 | 0.272 | 0.088 | 3 (34.4) |
| street | Unlimited | baseline | 2 | 4785 | 80.6 | 59.4 | 16.7 / 16.8 / 16.8 / 183.3 | 8 | 1.9 / 4.9 / 2.45 | 0.608 | 0.148 | 0.085 | 0 |
| street | Unlimited | candidate | 1 | 4752 | 80.5 | 59 | 16.7 / 16.8 / 16.8 / 150 | 12 | 2.5 / 7.5 / 3.47 | 1.129 | 0.323 | 0.095 | 3 (5.8) |
| street | Unlimited | candidate | 2 | 4741 | 80.6 | 58.8 | 16.7 / 16.8 / 16.8 / 116.7 | 15 | 2 / 5.5 / 2.55 | 0.57 | 0.08 | 0.082 | 0 |
| combat | Unlimited | baseline | 1 | 3923 | 69.4 | 56.5 | 16.7 / 16.8 / 49.9 / 1216.6 | 24 | 2.1 / 7.3 / 3.2 | 0.647 | 0.142 | 0.111 | 0 |
| combat | Unlimited | baseline | 2 | 4055 | 68.3 | 59.4 | 16.7 / 16.8 / 16.8 / 100.1 | 7 | 2.3 / 5.8 / 2.86 | 1.005 | 0.257 | 0.08 | 0 |
| combat | Unlimited | candidate | 1 | 4012 | 68.3 | 58.7 | 16.7 / 16.8 / 33.3 / 150 | 12 | 2.1 / 5.8 / 2.76 | 0.716 | 0.09 | 0.097 | 0 |
| combat | Unlimited | candidate | 2 | 4001 | 68.4 | 58.4 | 16.7 / 16.8 / 33.3 / 166.7 | 18 | 2.2 / 6.4 / 2.92 | 0.836 | 0.119 | 0.083 | 0 |
| Zeelich (Mill Lane) | Unlimited | baseline | 1 | 3518 | 60.1 | 58.5 | 16.7 / 16.8 / 33.3 / 116.6 | 14 | 3 / 9.5 / 4.3 | 0.607 | 0.1 | 0.12 | 10 (42.8) |
| Zeelich (Mill Lane) | Unlimited | baseline | 2 | 3674 | 61.5 | 59.7 | 16.7 / 16.8 / 16.8 / 66.7 | 2 | 3 / 7.7 / 3.72 | 0.77 | 0.132 | 0.098 | 0 |
| Zeelich (Mill Lane) | Unlimited | candidate | 1 | 4290 | 72.1 | 59.4 | 16.7 / 16.8 / 16.8 / 133.3 | 6 | 3 / 8.4 / 3.86 | 0.662 | 0.25 | 0.122 | 10 (3.3) |
| Zeelich (Mill Lane) | Unlimited | candidate | 2 | 3625 | 61.2 | 59.2 | 16.7 / 16.8 / 16.8 / 150 | 4 | 2.8 / 7.5 / 3.6 | 0.656 | 0.078 | 0.091 | 0 |

Reading: the frame pace is the same on both builds (p50 33.3 / 16.7 ms, p95 33.4 / 16.8 ms). The intervals over 50 ms
(0–34 a run) do not follow the build: they vary as much between two runs of one build, and the long frames are spread
over every function timed (a `findInteractable` of 256 ms once, a rig update of 99 ms, an unaccounted 135 ms) with
"work 2–7 ms" before most of them — this machine's other load stopping the whole thread, not the game. The combat route
had the most on both builds (18–34 a run at 30); their places in its 11.2 s lap scatter (no phase of the lap repeats),
about half come after < 10 ms of work, and the gaps of 1.2–24 s came after 2–3 ms of work (the browser not calling the
game at all). They are not evidence of a game hitch either way. The per-frame means (ms/frame columns; this headless
browser's clock has 0.1 ms steps) move by 2–3× between two runs of the same build for the same reason; only the probes
below, which repeat the same work and keep the least time, compare builds.

### 3.2 The suspects since the last measured build

| change | per-frame cost measured | verdict |
|---|---|---|
| **P111 ARM-CLEAR** (rig.js, every character's arms every 3rd frame) | baseline: ARM-CLEAR **0.10–0.27 ms/frame** at Unlimited, 0.18–0.40 at 30 (two simulation steps a frame) — a sixth to a quarter of all rig posing; **its set-up at a character's first pose: 4–54 ms in one frame**, 10 times in Zeelich's first minute (max 54.3, 42.8 and 24.1 ms in three runs), 3 times in Citadel's (max 34.4 and 12.4 ms) | **fixed** (§4): the set-up's work is done before the first pose; the per-frame look is cheaper |
| **P115 goalPick** in `findInteractable` (main.js, every frame) | `goalPick` 0.002–0.004 ms/frame (it runs only with two candidates in reach); `findInteractable` as a whole 0.08–0.2 ms/frame on both builds | no measurable cost; unchanged |
| **AIM-KEEP / AIM-AHEAD** (combat.js `throwTarget`) | 0.005–0.07 ms/frame over the combat route; inspected: the switch/target loop now also runs when an enemy is in the cone, while the ball is out and nothing is locked (the route locks most of the time, so that case is only partly covered) | no measurable cost; unchanged |
| **The Second Shift's lift** (zlift.js updater, story/zeelift.js shiftLook) | the Zeelich route ran the deck up and down throughout: simulation p50 2.8–3.1 ms on both builds; inspected: O(1) per frame | none; unchanged |
| **P112 lawn edges** (terrain.js per-pixel paving cut; 582 kerb stones) | inspected only (a GPU cost; SwiftShader cannot weigh it): the stones are in the kerb InstancedMesh that existed (no draw call added; LAWN-EDGES.md 433 → 424 calls at its spots), no shadow casting, ~7.6 k triangles; the shader adds one vec2 varying, one `fwidth` and a branch taken only near an edge | not measurable here; **the GPU check is in §6** |

## 4. The fix: ARM-COST (one bottleneck, two commits, the same arms)

**The cause.** ARM-CLEAR (P111, kept by the user) needs, per body, a profile of its surface round its middle. It was made
at the character's first pose, in that frame, by sampling every triangle of the body at 1.2 cm: 4–54 ms on this machine
(the probe: profile + arm points per look 123–170 ms for a region's 27–28 looks, of which the arm points only 10–18 ms).
Characters are first posed when they first come near or into the camera's range, so the cost fell into play, once per
look per session — in Zeelich's first minute ten times. And every 3rd frame each character's arm test computed an
`atan2` for every one of ~72 arm points a side, also those far outside the body.

**ARM-COST 1** (`7966f7b2`, rig.js `acDepth`): the test returns only the deepest point's depth; a point that could not be
deeper than the deepest so far even at its height's greatest radius over all bearings is passed before its `atan2` and
look-ups. The answer is the same to the last bit (it is a bound, not an approximation).
**ARM-COST 2** (rig.js `acProfiles` → a job that can stop and go on; `armClearWarm`; main.js `warmArms`): the profiles are
made before the characters' first poses — behind an arrival's black as a step of its own (`arm profiles`, 12 ms slices,
like the draw batches), and in play in each frame's spare time (`spareMs`, 0.5–2 ms, as the map is built) — for the
people and enemies of the scene on screen (indoors within the room's reach, outdoors within the far cull's), nearest
first. A character posed before its profile is ready finishes the job then (the old path). Nothing new is stored on the
rigs (a WeakSet), so the per-frame code keeps its shapes. Game-wide: every character with a skinned body (every look
built by characters.js) in every region, interiors included; the arrival step runs on every scene change that prepares an
area (warmScene), the trickle in every frame of play.

**Evidence (automated, SwiftShader):**
- Same result: a scratch check that loads both builds' ARM-CLEAR code into Node (three.js from vendor/) on 24 synthetic
  skinned bodies: profiles equal 48/48 (whole, and the job sliced as finely as it goes: one chunk a call), depths equal 9600/9600 (2131 inside, 7469 outside).
- The arm test on the characters the routes met, in their poses, 200× each, least of 5 (ms, baseline → candidate):
  forced to solve afresh — Citadel (27) **239.5 → 56.9** (Unlimited runs), **202.4 → 90.9** (30 runs), **102.8 → 54.3**
  (probe run); Zeelich (28) **131.2 → 72.2**, **146.2 → 45.0**; (20) **106.7 → 50.4**, 65.3 → 25.2; as the route's frames
  do it, the last answer kept — Citadel **145.4 → 128.9**, Zeelich **98.0 → 43.3**. Synthetic bodies in Node: 60.2 →
  37.0. In the routes' own per-frame columns the difference is inside this machine's noise (two runs of one build differ
  by 2–3×).
- Set-ups in play, first minute after the load: Zeelich **10 at up to 54.3 / 42.8 ms → 10 at up to 3.3 ms** (Unlimited),
  **10 at up to 24.1 → 10 at up to 14.7 ms** (30: a few profiles were not ready yet when their character was first posed);
  Citadel street **3 at up to 34.4 → 5.8 ms** (Unlimited), **12.4 → 2.8 ms** (30). What is left is each rig's own arm points (≤ 2–3 ms) and, right after
  a Continue (which goes straight into play), a look whose profile the frame trickle had not reached.
- The arrival step (`tests/arrival-steps.mjs`, now judging `arm profiles` too): Zeelich 11 slices, longest 13 ms; Desert
  Island 8, longest 16 ms; the tavern 2, longest 14 ms — all within the 40 ms limit, and the three arrivals came through
  with nothing built in view.
- Pictures in motion (§5): the same silhouettes, shadows and prompts in both builds (inspected).

## 5. Pictures in motion (silhouettes, shadows, clues)

Real SwiftShader draws (`SHOTS`, Medium, 1366×768, Follow) at 3, 8 and 13 s into the street route and at 3 and 8 s into
combat and Zeelich, both builds; three pairs kept in `captures/performance/` (`street-8s`, `combat-8s`, `mill-8s`,
`-baseline` / `-candidate`). **Inspected** (looked at, and compared pixel by pixel): Twinsen's and the residents'
silhouettes, their shadows and the trees', lamps' and houses', the lift and its rope, the interact prompt ("W Talk") and the
weapon panel are in every picture of both builds. The street pair differs in 265 of 1 049 088 pixels (a resident's step),
Zeelich's in 6 642–17 334 (the residents' and Twinsen's walk phase: their animation clocks start at random when the
characters are made, before the route's seed); the combat pictures are not a pair (the mite's and Twinsen's places
diverged between the two runs before the fixed steps). Nothing was lost, as expected: ARM-COST changes no pose (§4).

## 6. Local reproduction on the user's machines (not run here)

On each machine (the GTX 1050 desktop, the UHD 620 laptop on battery and plugged in, the work computer at 100 Hz), from a
checkout of this branch, Windows `cmd`; one browser at a time, the window in front; note the power state:

```
git fetch origin && git checkout <this branch>
git worktree add ..\lba3-base 4cdf28e3
cd lba3 && start python -m http.server 8123 --bind 127.0.0.1
cd ..\..\lba3-base\lba3 && start python -m http.server 8124 --bind 127.0.0.1
cd <this checkout>\lba3
set PLAYWRIGHT=<this checkout>\lba3\tools\testlab\node_modules\playwright\index.mjs
set HEADED=1& set CHANNEL=chrome& set MODE=real& set SECS=60& set RUNS=2& set PROF=1
set QUALITY=medium& set RES=100& set AA=msaa& set VIEW=1366x768
mkdir out
set FPS=30& set GAME_URL=http://localhost:8124/& set LABEL=base-30& set OUT=out\base-30& node tests\smooth-routes.mjs > out\base-30.txt
set FPS=30& set GAME_URL=http://localhost:8123/& set LABEL=cand-30& set OUT=out\cand-30& node tests\smooth-routes.mjs > out\cand-30.txt
set FPS=auto& set GAME_URL=http://localhost:8124/& set LABEL=base-unl& set OUT=out\base-unl& node tests\smooth-routes.mjs > out\base-unl.txt
set FPS=auto& set GAME_URL=http://localhost:8123/& set LABEL=cand-unl& set OUT=out\cand-unl& node tests\smooth-routes.mjs > out\cand-unl.txt
```
Each run prints, per route and pass: fps, frame interval p50/p95/p99/max, intervals > 50 ms, long tasks, CPU p50/p95
(simulation + render submission), **GPU p50/p95** (the game's timer query, where Chrome has it), draw calls, the PROF line
(rigs, ARM-CLEAR, findInteractable, throwTarget, set-ups in play) and the ARM-CLEAR probes; the header names the GPU,
dPR, MSAA, timer and Windows' power state. Real draws: about 10 minutes per file. For P112's GPU cost on the street
(the paving cut, the kerbs), compare `GPU p50/p95` of the street route against a build before P112
(`git worktree add ..\lba3-pre112 7af6f13f`, the parent of LAWN-EDGES b `c5799e6a`; serve it on 8125) the same way.
For pictures in motion add `set SHOTS=out\shots` (four real-draw pictures a route at 3/8/13/18 s).

## 7. Commits, files, tests

- `15181c40` smooth-routes: `SECS`, `PROF`, `SHOTS`, the Windows headed flags (`tests/smooth-routes.mjs`,
  `tests/lib/smoothrec.js` `{ again }`).
- `7966f7b2` ARM-COST 1 (rig.js `acDepth`, row maxima in `armClearInit`).
- `7db57b4f` ARM-COST 2 (rig.js profile job, `armClearWarm`; main.js `warmArms`, the arrival step, the frame trickle,
  `addActors`); `tests/arrival-steps.mjs` judges the `arm profiles` slices; tests/README.md; this document.
- Suites run (once each, the user's rule): `tests/arrival-steps.mjs` on the candidate — **10/12, VERDICT FAIL**: the two
  fails are KNOWN-FAILING's open load-bound row (machine load ~8 at the time): Zeelich's shadow batches, one large piece
  117 ms, and Desert Island's shader warm-up, one compile 68.8 ms — not the new step (its slices 13–16 ms, above). Not
  rerun (the user's rule; the row says to run it alone). The scratch identity check (§4; a Node script in this agent's scratchpad,
  not in the repo: it cuts ARM-CLEAR's functions out of both builds' rig.js and runs them on the same synthetic bodies). The routes themselves (measuring, no verdict). No other
  suite: ARM-CLEAR's poses are unchanged to the bit (§4), so `tests/arm-clear.mjs` was not rerun.

## 8. Decisions for the user

None needed: nothing visible changed (the arms are posed the same to the bit), no default or setting changed, saves
untouched. The one look question is the not-done option in §9 (thinning ARM-CLEAR off screen).

## 9. Affected chapters, uncertainty, next

- Affected: every chapter and region with people (ARM-CLEAR poses everyone); the arrival step on every area change. No
  visible change, no default changed, no save change (format 6 untouched).
- Uncertain: all timings are SwiftShader/CPU on a loaded shared machine; the user's machines may weigh the set-up and the
  look differently (a laptop CPU on battery more). The frame trickle after a Continue may not reach every look before its
  first pose. The ball's aim path without a lock was only partly driven.
- Not done, a candidate next step (measured, not changed): 45–64 % of ARM-CLEAR's per-frame time (baseline runs) goes to characters
  outside the view (`armClear:off` in the PROF lines), although the far cull already poses them only every 4th frame.
  Skipping ARM-CLEAR for them would change when an arm is cleared as a character walks into view (a few frames of easing
  at the screen edge), so it is a look question first.
- P112's GPU cost and every GPU number: untested here (§6).
