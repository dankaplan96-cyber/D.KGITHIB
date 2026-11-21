# SMOOTH-1 — movement, camera rotation and combat while Twinsen is controlled (status P89)

The user, 21.11: "make movement, camera rotation and combat feel smoother without sacrificing the art". Startup, loading
screens, preloading and region transitions are out of scope (travel feels fine). Branch: this worker's worktree branch,
base `d81b2ae0` (origin/ccr-c1c2c4b9-dep6ed).

**Every number in this document is "Automated runtime only (SwiftShader/synthetic display)"**: headless Chromium in the
cloud, a CPU rasteriser (SwiftShader), no GPU, no battery, no real display, on a machine shared with other workers' test
browsers (load average 9-14 on 4 cores during these runs). No number here is a result for the user's Intel UHD 620 or
GTX 1050; the historical benchmarks quoted in §1 are context, not results for this build. The real-hardware test is §7
(order 61 SMOOTH-HW in `tools/testlab/CLOUD_ORDERS.md`).

**Summary.** Twinsen's own movement, the street run and camera sweep, and the lift's cart are even at a stable frame time
on every tested rate; no interpolation or loop change is justified. Two defects that jerk at a stable frame time were found
and fixed with small changes: the mite's stop-go buzz at its circling distance (enemies.js, hysteresis) and the Follow
camera's over-his-head step being per frame (camera.js, per time). Reported, not changed: single-frame camera steps of the
keep-out and lock rules (the camera owner), and the aim preview's dots stepping between samples (ball code; patch kept).
Frame delivery and GPU time — the likely main cause on the user's UHD 620 — need the laptop (§7).

## 1. The question

Low FPS and motion that jerks at a stable FPS are different faults with different fixes. The user's last Frame Rates
report (21.11, UHD 620 on battery, 59.9 Hz) showed rAF even at 30 and the GPU at 17–18.5 ms a frame on the street at 30,
11.7 ms at 60; at 60 on the street 71 % of frames on pace and 133 frames ≥ 1.5× the refresh. That is a frame-delivery
(throughput) problem on that machine, which only that machine can measure. What the cloud can establish is whether
anything moves unevenly **when the frames themselves are perfectly even** — input sampling, the simulation's steps, the
Follow camera, animation, carriers (the lift and cart), the aim — because any such fault shows on every machine at every
frame rate, and no GPU fix would remove it.

## 2. Method

`tests/smooth-routes.mjs` (new) with `tests/lib/smoothrec.js` (new, test-only; loaded after the existing harness
`tests/lib/player.js`, booted the way `tests/lib/boot.mjs` boots, the error policy of boot.mjs where it can be imported).
Three routes in scenes that are already loaded, the Follow camera at its Medium distance (the fixtures' own), 1366×768,
Medium quality, world resolution fixed at 100 %, Edges: Smooth (MSAA as Medium sets it), the same fixture, settings and
inputs every time; enemies' and particles' random choices seeded per route, so a route is repeatable:

| route | save (fixture, origin rewritten to the server's) | what is driven |
|---|---|---|
| street | `new-11-town` (Citadel, athletic) | Classic tank keys: a run west along the street past the residents (Pippa, the Spheros), a tight 115° turn while running at the corner by Bug Street, on north, a stop, then 2 s turning on the spot (≈340°): the Follow camera sweeps round with him across the harbour |
| combat | same save, Modern keys for the strafe | one mite placed in the fields (−45, 39.5), Twinsen 6.5 m north of it: lock on (L), hold the ball (F) and strafe right 1.6 s, release; hold and strafe left 1.3 s, release; lock off, turn round (Down) and back (Up), lock on, throw |
| mill | `base-12` (Zeelich, Mill Lane) | the Cistern Rise's deck running up and down the shaft the whole time with the water cart on it (`moveDeck` low↔top, 4.6 s, as the story does it); Twinsen walks north beside it on the lane, weaves, stops, turns on the spot right, left, right: the camera turns across the lift |

Inputs are applied on every simulation step at the same game time (`Game.frame` is wrapped), so every frame rate gets
the same presses; Classic steering toward a waypoint uses the turn key while the heading is off by more than 0.12 rad.

Two kinds of pass (a third, `real`, is for the laptop — §7):

- **cpu**: the game's own loop on the browser's own requestAnimationFrame clock, the draw stubbed. On this machine a real
  SwiftShader draw at 1366×768 took **6.1 s a frame** (the street's warm-up pass: 107 frames in 656 s), so real-draw passes
  ×3 ×3 routes ×2 builds were not possible; with the draw stubbed the frame intervals, long tasks and the simulation's
  own CPU per frame (Game.advance minus the render) are measured on the real loop. Frame-interval stalls here include
  this shared machine's own (other browsers, SwiftShader's GPU process — see §3.4).
- **synth**: the synthetic display of `tests/fps30.mjs` (rAF replaced by a clock driven at exact timestamps): 60, 59.9 and
  120 Hz Unlimited, and the 30 limit on 60 and 59.9 Hz (the user's 59.9 Hz screen). The draw is stubbed and every drawn
  frame is sampled before it would be drawn. Nearly deterministic (checked:
  two separate runs of the mill route at 60 Hz on the base gave identical values to the last digit; the 30@60 pass once ran 5 frames longer, §5), so one pass per rate is the measurement.

Per drawn frame the recorder keeps: the rAF timestamp, Twinsen (simulation position at his chest and his rig's drawn
root), the camera's position and view direction, the camera rig's look point, the aim's landing ring and its middle dot,
the ball in flight, the mite, the lift's cart, the nearest residents, each one's position on the 1366×768 screen, the Follow
camera's own account of the frame (`camRig.why`: which rule moved it, its arm), and the frame's record from `Game.perf`
(interval, simulation steps, CPU work, draw calls, the jobs noted on a long frame).

**Evenness measures** (fixed before the first measurement; one refinement noted):
- *spike*: a frame whose speed (world m/s, or rad/s for the view direction) is off the mean of its two neighbours by more
  than 1.5× either way, while both neighbours move faster than a floor (0.3 m/s; 0.1 rad/s for the view). Refinement after
  the first dry run on the base build, before any fix: the first version required only the neighbours' mean above the floor,
  so every stop counted (a speed ramping 1.2 → 0.2 → 0 m/s); a start or a stop is not a spike.
- *oscillation*: three alternating speed changes in a row, each over 20 % of the speed.
- *on-screen jerk* (px): the change of an object's on-screen velocity between two frames times the frame time (= the
  second difference of its screen position at even frame times), only while it is on the screen. Twinsen's own is the
  camera/target agreement: the camera follows him, so a lag-then-catch-up shows there. Counted over 2 px.
- *view angular acceleration* (rad/s², p99 and max): how hard the view's turning starts or stops.

## 3. Findings (base build d81b2ae0; tables in §5)

**3.1 Twinsen's own motion is even at a stable frame time.** On every route and rate (60, 59.9, 120 Hz, the 30 limit on
60 and 59.9 Hz) his chest's speed shows 0–2 spikes in 85–1093 judged frames, the 2 at the 30 limit being the last frame of a
stop. His drawn rig root equals his simulation position on every frame (`rootVsSim` 0 m): there is no interpolated display
state that could lag, and none is needed — the loop simulates whole steps and draws the state it simulated (FPS30.md §3).
His on-screen jerk on the street is p95 0.1–0.4 px at 60/59.9/120 Hz; 1.5–1.6 px at the 30 limit (half the drawn frames:
inherent to 30, not a defect). Input is applied per simulation step at the same game time at every rate (the route driver
does exactly that); the 30 limit's two 60 Hz steps per drawn frame keep taps (FPS30 §2, `fps30.mjs` C — not repeated).
So **no fixed-step / interpolation rewrite is justified by these measurements**, and none was made.

**3.2 The street run, the corner and the camera sweep are even.** The Follow camera's position and view direction: 0–4
spikes in 227–1529 frames at all rates; the view's angular acceleration p99 9.7–9.9 rad/s² at every rate (the same turn,
the same spring: the camera's damping is time-based, FPS30.md §3). The look point: 1–3 spikes.

**3.3 Combat: an enemy's stop-go buzz at its circling distance (fixed, §4.1).** The mite closes in at 2.5 m/s while more
than 2.6 m from him and circles inside that, with one threshold and no hysteresis. While he strafed with the charged ball
at about that distance it flipped every 2–3 frames: +20 mm (a frame closing), −2 mm, −2 mm (circling) — a buzz at a
perfectly even frame time. Counted as frames where its speed jumps by 3× either way: 30 such frames at 59.9 Hz (the
user's screen rate), 53 at 120 Hz, at 2.4–2.6 m from him; at exactly 60 Hz the seeded run happened not to sit on the line
(7, all far away, when it turns). Its speed spikes: 45/515 judged frames at 59.9 Hz, 77/1023 at 120 Hz.

**3.4 Combat: the camera under a lock-on has one-frame steps (not changed: camera design, for the camera owner).** The
largest view angular accelerations in combat (129 rad/s² at 60 Hz, 293 at 120 Hz) are single frames: at 60 Hz the camera
dropped 0.39 m in one frame (y 7.591 → 7.199) the frame the "tilt" keep-out (`camera.js` _chase: "in something, it first
tilts up at its own length", `keepBy 'tilt'`) let it go; at 120 Hz the lock's swing changed from −0.033 to −0.007 rad in a
frame (view 4.2 → 1.7 rad/s). These are rules that place the camera outright, not eased, by design ("never in anything").
Easing their release is a camera-behaviour change (camfollow, camsteady and camclear budgets depend on it), so it is
reported, not changed here.

**3.5 Mill Lane: the camera's step over his head is per frame (fixed for rate, §4.2; its size at 60 Hz unchanged).** The
largest on-screen jerk anywhere (Twinsen 72 px, the cart 79 px, at 60 Hz) is the Follow camera's CAM-OVERSIGHT step (F-5):
turning on the spot by the lift's frame, his view hidden, the camera moves over his head by up to `CH_OVER_SEE_STEP` = 0.9 m
**a frame** for 3 frames (camera y 9.53 → 10.22 → 11.20 → 12.18 m; 4 frames carry `keepBy 'oversee'`). At 60 Hz that is a
54 m/s lurch, as designed in F-5 ("his outline shows for the two or three frames it takes"); it is visible at any frame
time. Being per frame, it ran at twice that speed at 120 Hz Unlimited and half at an uncapped 30: a frame-rate dependency.
The rate is fixed (§4.2); the size of the step at 60 Hz is the camera owner's decision (same note as 3.4).

**3.6 The aim preview's dots step between samples (not changed: the ball code; the patch is offered, §4.3).** While he
strafes charging the ball, the middle aim dot's speed spikes in 13–18 of ~90–375 judged frames at every rate; e.g. at 30@60
it runs 0.3–1.3 m/s and jumps to 7–13 m/s for single frames. Cause read in `actors.js` MagicBall.preview: the dots sit on
the arc's 10 ms samples (every other one), picked by index `round((i+1)/(n+1)·(m−1))`, and the count m changes as the
touch-down moves, so each dot hops to the next sample; the ring sits on the first sample below the ground (up to a 10 ms
sample of flight off). The landing ring itself showed 0 judged frames (it was rarely visible on this route's flat field).

**3.7 The lift and cart move evenly.** The cart's speed: 0 spikes in 194–789 frames at every rate (moveDeck's smoothstep
on game time). Its on-screen jerk is the camera's (3.5).

**3.8 Frame delivery on this machine (cpu passes).** The real loop with the draw stubbed held 58–60 fps on the street and
Mill Lane (p95 16.7–16.8 ms); the simulation's own CPU is p50 1.8–3.5 ms, p95 4.7–9.3 ms a frame. The > 50 ms intervals
(0–5 a run) and long tasks (up to 380 ms) are this shared machine's (other workers' browsers; a combat pass saw a 78 s gap —
the page starved, `lostS` shows the loop dropping it rather than catching up, as designed: at most 4 steps). The routes'
long frames carry no game job in their perf record (no shader compile, upload, batch build). None of this is a GPU result.

## 4. Fixes (smallest change for each evidenced defect)

**4.1 `src/game/enemies.js` Mite.update — hysteresis on closing in.** Closing in, a mite keeps on until 2.4 m before it
circles again (it still starts closing beyond 2.6 m). The circling band (2.0–2.6 m), its speeds, the wind-up and bite
distances (< 2.0 m), the lunge and all timing are unchanged. The crawlers inherit nothing from this branch (their own update).

**4.2 `src/engine/camera.js` _chase — CAM-OVERSIGHT's step per time, not per frame.** `CH_OVER_SEE_STEP` (0.9 m) is now per
1/60 s of play (`× min(2, dt·60)`): identical at 60 Hz and under the 30 limit (its 60 Hz steps), half a step a frame at 120 Hz,
at most two steps in one long frame. Nothing else in the camera changed.

**4.3 Not applied: the aim preview (ball code).** The coordinator asked to keep this change out of the ball code
(another worker, P93, may touch the throw). The patch that removes 3.6 — the touch-down found where the arc crosses the
ground between the last two 10 ms samples, and the dots placed at even shares of the flight on the exact arc the samples
trace (identical at each sample, continuous between) — is kept as `docs/lba3-performance/SMOOTH-1/aim-preview.diff` (applies from the repo root with `git apply`) for whoever owns `actors.js` MagicBall.preview; it is
described here and was not measured in the after run.

## 5. Before / after (3 runs each; synthetic display one pass per rate)

Builds: **before** = d81b2ae0 (served from a `git archive` of it); **after** = d81b2ae0 + §4.1 + §4.2 (no ball change).
Same script, fixtures, settings, seeds. cpu passes: 3 recorded after one warm-up; synthetic: one pass per rate (deterministic
for a given build: two base runs of the mill route at 60 Hz matched to the last digit; one 30@60 pass did not, see below). Columns: *spikes* = frames off their
neighbours' mean speed by > 1.5× / frames judged; *jerk* = on-screen second difference, px, p95 / max (frames over 2 px).
Jerk scales with the frame time squared at the same motion, so a 30 FPS row is not comparable to a 60 row by it.

**Reading the cpu rows**: their frame intervals are this shared machine's (load average 8–14 on 4 cores from other
workers' test browsers; one combat pass of each build starved for 78 s and 183 s). The after mill cpu passes ran under the
heaviest load of the session (CPU p95 19–31 ms, 10–16 long tasks) and were rerun (`after-rerun`): the simulation's own
CPU per frame is the same as before (p50 3.0–3.4 ms vs 3.0–3.5), the intervals still carry the load. None of these rows is
a frame-rate result for any real machine; they show that the routes run on the real loop and that the changes add no
simulation work.

**What changed, before → after (synthetic display):**
- combat, the mite (§4.1): speed spikes 45 → 8 at 59.9 Hz, 77 → 18 at 120 Hz (table); its stop-go frames (speed
  jumping 3× either way) 30 → 9 at 59.9 Hz, 53 → 10 at 120 Hz, 11 → 4 at 30@59.9, 7 → 10 and 6 → 7 at 60 and 30@60 (those two
  runs never sat on the line before either). The camera's view-direction spikes in combat fell too (60 Hz 8 → 2, 59.9 Hz
  5 → 3), and its peak angular acceleration at 60 Hz 129 → 115 rad/s², because the locked view follows a mite that no longer
  buzzes; the one-frame camera steps of §3.4 remain (115 rad/s²). **Against that**: at the 30 limit the combat
  view-direction spikes rose, 2 → 6 (30@60) and 3 → 7 (30@59.9) of ~240 judged, and camera-position spikes 8 → 11 and 9 → 11:
  the mite now takes another path round him, so the locked view's path differs too; not traced further in this pass (they
  are the same kind of single-frame lock/keep-out steps as §3.4, for the camera owner). The ball's own jerk maxima (300–580
  px) are its jumps from the hand at the release and back at the catch, in both builds (ball code, not changed).
- mill at 120 Hz (§4.2): Twinsen's largest on-screen jerk 68.2 → 34.3 px, the cart's 66.8 → 26.5 px, camera-position spikes
  14 → 10; the over-his-head step now takes 6 frames at 120 Hz instead of 4 (the same 54 m/s as at 60). At 60 / 59.9 Hz and
  at 30@59.9 the mill rows are identical before and after, as intended. (30@60: the before pass ran 5 frames longer — 224
  vs 219 drawn, every interval 33.3 ms — so that row is not like-for-like; its max jerk differs, its other values match.)
- street: identical before and after at every rate (nothing on it touches either change).

#### street: real loop on the browser's frame clock, draw stubbed (3 runs)

| build | run | frames | fps | p50 | p95 | p99 | max ms | >50 ms | long tasks (max ms) | CPU sim p50 / p95 ms | steps/frame |
|---|---|---|---|---|---|---|---|---|---|---|---|
| before | 1 | 789 | 59.5 | 16.7 | 16.7 | 16.8 | 49.9 | 0 | 2 (55) | 1.8 / 4.7 | 1 |
| before | 2 | 771 | 58.1 | 16.7 | 16.7 | 33.3 | 100.1 | 4 | 3 (109) | 1.9 / 5.8 | 1.01 |
| before | 3 | 771 | 58.2 | 16.7 | 16.8 | 16.8 | 150 | 4 | 3 (136) | 1.8 / 5.5 | 1.01 |
| after | 1 | 781 | 58.9 | 16.7 | 16.7 | 16.8 | 100 | 2 | 1 (92) | 2 / 5.2 | 1.01 |
| after | 2 | 740 | 55.1 | 16.7 | 16.8 | 66.6 | 316.6 | 8 | 3 (117) | 1.8 / 6 | 1.03 |
| after | 3 | 724 | 54.3 | 16.7 | 16.8 | 66.6 | 200 | 14 | 7 (145) | 1.8 / 6.4 | 1.03 |

#### street: synthetic display (even timestamps)

| build | rate | frames | steps | spikes: Twinsen | camera pos | view dir | look point |  | Twinsen on-screen jerk px p95 / max (>2) |  | view acc p99 / max rad/s² |
|---|---|---|---|---|---|---|---|---|---|
| before | 60 | 792 | 1 | 0/545 | 0/762 | 1/475 | 2/730 |  | 0.3 / 7.9 (13) |  | 9.9 / 11 |
| before | 59.9 | 791 | 1 | 0/544 | 0/762 | 1/464 | 1/729 |  | 0.4 / 5.7 (16) |  | 9.8 / 11 |
| before | 120 | 1588 | 1 | 0/1093 | 0/1529 | 0/945 | 1/1462 |  | 0.1 / 2.2 (1) |  | 9.9 / 11.1 |
| before | 30@60 | 396 | 2 | 0/269 | 2/378 | 1/227 | 3/362 |  | 1.6 / 18 (14) |  | 9.7 / 10.9 |
| before | 30@59.9 | 395 | 2 | 0/269 | 4/378 | 1/227 | 2/361 |  | 1.5 / 17.6 (15) |  | 9.9 / 10.9 |
| after | 60 | 792 | 1 | 0/545 | 0/762 | 1/475 | 2/730 |  | 0.3 / 7.9 (13) |  | 9.9 / 11 |
| after | 59.9 | 791 | 1 | 0/544 | 0/762 | 1/464 | 1/729 |  | 0.4 / 5.7 (16) |  | 9.8 / 11 |
| after | 120 | 1588 | 1 | 0/1093 | 0/1529 | 0/945 | 1/1462 |  | 0.1 / 2.2 (1) |  | 9.9 / 11.1 |
| after | 30@60 | 396 | 2 | 0/269 | 2/378 | 1/227 | 3/362 |  | 1.6 / 18 (14) |  | 9.7 / 10.9 |
| after | 30@59.9 | 395 | 2 | 0/269 | 4/378 | 1/227 | 2/361 |  | 1.5 / 17.6 (15) |  | 9.9 / 10.9 |

#### combat: real loop on the browser's frame clock, draw stubbed (3 runs)

| build | run | frames | fps | p50 | p95 | p99 | max ms | >50 ms | long tasks (max ms) | CPU sim p50 / p95 ms | steps/frame |
|---|---|---|---|---|---|---|---|---|---|---|---|
| before | 1 | 647 | 58.5 | 16.7 | 16.8 | 33.4 | 66.6 | 1 | 7 (380) | 1.8 / 4.7 | 1 |
| before | 2 | 632 | 7.1 | 16.7 | 16.8 | 33.4 | 78080.2 | 5 | 6 (180) | 2 / 4.7 | 1.02 |
| before | 3 | 645 | 58.5 | 16.7 | 16.8 | 33.3 | 100.1 | 3 | 5 (114) | 1.8 / 6.1 | 1.01 |
| after | 1 | 581 | 50.8 | 16.7 | 33.3 | 100 | 333.3 | 11 | 10 (198) | 2.1 / 9 | 1.06 |
| after | 2 | 534 | 1.7 | 16.7 | 33.4 | 233.3 | 182659.4 | 20 | 20 (390) | 2.3 / 12.2 | 1.09 |
| after | 3 | 623 | 38.6 | 16.7 | 16.8 | 50 | 5199.8 | 4 | 10 (605) | 2 / 5.2 | 1.02 |

#### combat: synthetic display (even timestamps)

| build | rate | frames | steps | spikes: Twinsen | camera pos | view dir | look point | mite | ring | dot | ball | Twinsen on-screen jerk px p95 / max (>2) | mite jerk | ring jerk | dot jerk | ball jerk | view acc p99 / max rad/s² |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| before | 60 | 651 | 1 | 0/293 | 10/568 | 8/453 | 8/566 | 10/588 | 0/0 | 15/183 | 5/106 | 0.9 / 12.4 (16) | 2.1 / 16.5 (34) | – | 1.5 / 13.4 (10) | 1.1 / 301.5 (13) | 90.7 / 129.1 |
| before | 59.9 | 651 | 1 | 0/292 | 5/607 | 5/462 | 4/603 | 45/515 | 0/0 | 16/183 | 5/46 | 0.9 / 9.7 (14) | 2.6 / 11.1 (55) | – | 3.3 / 6.3 (15) | 1.8 / 396.2 (15) | 63.8 / 146.5 |
| before | 120 | 1302 | 1 | 0/593 | 5/1227 | 3/980 | 4/1206 | 77/1023 | 0/0 | 13/375 | 3/98 | 0.2 / 5.5 (4) | 1.1 / 6 (38) | – | 0.8 / 11.3 (10) | 0.5 / 459.5 (8) | 40.1 / 293.2 |
| before | 30@60 | 334 | 2 | 2/147 | 8/299 | 2/219 | 7/309 | 7/300 | 0/0 | 18/88 | 5/43 | 3.2 / 16.5 (26) | 5 / 25.8 (50) | – | 6.2 / 9.2 (13) | 6 / 309.1 (36) | 46.1 / 90.7 |
| before | 30@59.9 | 325 | 2 | 0/142 | 9/305 | 3/221 | 7/302 | 12/284 | 0/0 | 12/89 | 4/31 | 2.6 / 15.9 (20) | 3.7 / 24.2 (41) | – | 3.1 / 8.7 (9) | 4.6 / 364.4 (25) | 47 / 79.1 |
| after | 60 | 668 | 1 | 0/300 | 7/610 | 2/476 | 3/633 | 6/558 | 0/0 | 20/178 | 5/94 | 0.7 / 9.7 (9) | 0.9 / 12.4 (14) | – | 2.6 / 15.6 (14) | 0.9 / 385.5 (11) | 45.2 / 114.6 |
| after | 59.9 | 651 | 1 | 0/293 | 6/601 | 3/453 | 5/610 | 8/582 | 0/0 | 15/183 | 4/86 | 0.7 / 10.9 (14) | 1.5 / 9.8 (24) | – | 0.9 / 11.3 (10) | 0.9 / 339.1 (9) | 65.9 / 115.1 |
| after | 120 | 1302 | 1 | 0/593 | 4/1228 | 3/981 | 4/1220 | 18/1034 | 0/0 | 12/375 | 3/98 | 0.2 / 5.4 (4) | 0.4 / 5.9 (10) | – | 0.1 / 5.7 (8) | 0.9 / 577.8 (10) | 37.8 / 293.1 |
| after | 30@60 | 334 | 2 | 0/146 | 11/306 | 6/237 | 6/303 | 10/272 | 0/0 | 14/88 | 5/19 | 4.2 / 18.7 (40) | 7.5 / 31.8 (61) | – | 3.7 / 4.4 (11) | 13.9 / 404 (34) | 55.1 / 87.9 |
| after | 30@59.9 | 325 | 2 | 0/142 | 11/303 | 7/247 | 5/303 | 6/266 | 0/0 | 19/90 | 3/22 | 2.8 / 15.6 (25) | 4.2 / 23.6 (40) | – | 3.8 / 5.2 (14) | 5.7 / 340.4 (28) | 47 / 75.4 |

#### mill: real loop on the browser's frame clock, draw stubbed (3 runs)

| build | run | frames | fps | p50 | p95 | p99 | max ms | >50 ms | long tasks (max ms) | CPU sim p50 / p95 ms | steps/frame |
|---|---|---|---|---|---|---|---|---|---|---|---|
| before | 1 | 443 | 60 | 16.7 | 16.7 | 16.8 | 16.8 | 0 | 0 (0) | 3 / 7.5 | 1 |
| before | 2 | 444 | 59.9 | 16.7 | 16.8 | 16.8 | 33.2 | 0 | 0 (0) | 3.5 / 9.3 | 1 |
| before | 3 | 443 | 60 | 16.7 | 16.7 | 16.8 | 16.8 | 0 | 0 (0) | 3.2 / 8.5 | 1 |
| after | 1 | 360 | 47.6 | 16.7 | 33.4 | 150.1 | 216.7 | 13 | 10 (229) | 2.5 / 19.4 | 1.09 |
| after | 2 | 337 | 40.8 | 16.7 | 66.7 | 216.6 | 549.9 | 19 | 13 (398) | 3.6 / 23.9 | 1.12 |
| after | 3 | 357 | 45.9 | 16.7 | 50 | 116.6 | 416.6 | 13 | 16 (402) | 2.9 / 30.6 | 1.1 |
| after-rerun | 1 | 409 | 55.1 | 16.7 | 16.8 | 66.7 | 116.6 | 6 | 6 (71) | 3.1 / 10 | 1.03 |
| after-rerun | 2 | 318 | 38.8 | 16.7 | 83.3 | 250 | 366.6 | 22 | 15 (338) | 3.4 / 35.7 | 1.17 |
| after-rerun | 3 | 364 | 45.8 | 16.7 | 33.4 | 133.4 | 483.3 | 12 | 12 (377) | 3 / 14.9 | 1.09 |

#### mill: synthetic display (even timestamps)

| build | rate | frames | steps | spikes: Twinsen | camera pos | view dir | look point | cart | Twinsen on-screen jerk px p95 / max (>2) | cart jerk | view acc p99 / max rad/s² |
|---|---|---|---|---|---|---|---|---|---|---|---|
| before | 60 | 447 | 1 | 0/178 | 9/419 | 2/337 | 21/440 | 0/403 | 6.9 / 72.1 (50) | 4.7 / 78.7 (47) | 50.5 / 93.4 |
| before | 59.9 | 438 | 1 | 0/174 | 11/414 | 2/330 | 22/433 | 0/393 | 7.2 / 71.8 (52) | 4.8 / 78.2 (42) | 51.6 / 94.5 |
| before | 120 | 876 | 1 | 0/351 | 14/828 | 1/665 | 23/870 | 0/789 | 1.5 / 68.2 (32) | 1 / 66.8 (13) | 50.3 / 304.5 |
| before | 30@60 | 224 | 2 | 0/88 | 11/211 | 5/163 | 22/213 | 0/199 | 21.2 / 122.2 (55) | 16.8 / 85 (68) | 32.8 / 61.8 |
| before | 30@59.9 | 219 | 2 | 0/85 | 9/206 | 4/163 | 26/215 | 0/194 | 24.9 / 156 (53) | 17 / 168.7 (73) | 42.9 / 61.6 |
| after | 60 | 447 | 1 | 0/178 | 9/419 | 2/337 | 21/440 | 0/403 | 6.9 / 72.1 (50) | 4.7 / 78.7 (47) | 50.5 / 93.4 |
| after | 59.9 | 438 | 1 | 0/174 | 11/414 | 2/330 | 22/433 | 0/393 | 7.2 / 72 (52) | 4.8 / 78.3 (42) | 51.6 / 94.5 |
| after | 120 | 885 | 1 | 0/355 | 10/837 | 1/670 | 19/877 | 0/803 | 1.4 / 34.3 (32) | 1.1 / 26.5 (13) | 49.8 / 273.6 |
| after | 30@60 | 219 | 2 | 0/85 | 13/204 | 5/161 | 21/210 | 0/195 | 23.5 / 164.6 (55) | 17.2 / 183.6 (67) | 36.1 / 39.7 |
| after | 30@59.9 | 219 | 2 | 0/85 | 9/206 | 4/163 | 26/215 | 0/194 | 24.9 / 156.4 (53) | 17 / 169 (73) | 42.9 / 61.6 |

**Regression (lean, one browser at a time):** `tests/combat.mjs` 76/78 on the after build and 76/78 on the base, the
same two failing with identical values on both: "dodge distance consistent at 30 and 60 fps" (d30 0, d60 1.56; in
KNOWN-FAILING.md) and "the follow-through blends into the walk (no arm snap)" (maxJump 0.314; **not** in KNOWN-FAILING.md —
it fails the same on d81b2ae0, so it predates SMOOTH-1; for the coordinator to file). Not run this pass: camfollow,
camsteady, camclear, anim-combat, fps30, timing (the camera change only acts in the over-his-head step at non-60 Hz steps;
the tests step at 1/60 except camsteady's `30`/`jank` rates, where the step is now per time).

## 6. Measured vs read in code

Measured (synthetic display, cpu passes): everything in §3.1–3.8 with numbers. Read in code only:
- The frame loop (`main.js` loop/advance): one requestAnimationFrame loop; real time capped at 4 steps of 1/30 s (the rest
  dropped and counted, `lost`); the 30 limit counted in refreshes on 59.9/60/120 Hz (P88) and on a grid elsewhere; at 30, two
  60 Hz steps a drawn frame; the background at 8 fps, a hidden tab not caught up. No change needed for these routes.
- Input (`input.js`): taps, clicks, pad buttons (latched by `poll()` on skipped refreshes) and touch taps survive between
  drawn frames; the camera keys and stick per second. Unchanged.
- Animation: Rig.update by dt; only far or out-of-view people are posed every 2nd–8th frame (drawcull.js FarCull) — none
  of the route's near residents were (their speed spikes 0).
- Graphics settings as a system (renderer.js): pixel ratio by preset (and by an integrated GPU on a dense screen), the
  automatic resolution moving the scene's share of the same target (no target rebuilt), MSAA/Edges rebuilding the two
  composer targets only when the sample count changes (`resize` key), the battery cuts. No per-frame target rebuild was
  found; no setting was changed here. Low ↔ High and save/relaunch of these settings were not re-tested in this pass.
- The aim preview (3.6): the cause is read in code; the dots' spikes are measured.
- Not measured at all here: real GPU time, the compositor's presentation of frames, input-to-photon latency, a real
  display's refresh, battery behaviour, fullscreen/resize, the opening's hand-off, interiors (none of the three routes is
  indoors). These belong to the laptop run (§7) or another pass.

## 7. The laptop (real hardware): the exact procedure (order 61 SMOOTH-HW)

Measure only; change no OS power or GPU setting. One browser at a time, nothing else heavy running; the window stays in
front (a covered or unfocused window drops the game to 8 fps: `G.background`, reported per run).

**Setup** (once):
1. `git fetch && git checkout <the branch with SMOOTH-1 merged>`; the "before" build is the commit before the merge:
   `git worktree add ../lba3-before <that commit>`.
2. Serve both: `cd lba3 && python -m http.server 8123 --bind 127.0.0.1` and `cd ../lba3-before/lba3 && python -m http.server 8124 --bind 127.0.0.1`.
3. Note which GPU Chrome uses: `chrome://gpu` → "GL_RENDERER" (the UHD 620 or the GTX 1050), and whether the laptop is on
   battery. The script prints the GPU the game sees, the power source (Windows' battery status), dPR, the render pixel
   ratio, MSAA and whether the GPU timer query exists, at the top of each table.
4. The script runs unchanged from the repo: tell it where Playwright is with `PLAYWRIGHT=<repo>\lba3\tools\testlab\node_modules\playwright\index.mjs`
   (on Windows a `file:///` URL also works). It falls back to its own error watch where `tests/lib/boot.mjs` cannot load.

**One run** = one save, both routes on it, one warm-up pass then 3 recorded passes per route (≈ 1 min per route at 60 fps),
then the synthetic-display passes (draw stubbed; seconds each):

```
set PLAYWRIGHT=C:\…\lba3\tools\testlab\node_modules\playwright\index.mjs
set GAME_URL=http://localhost:8123/
set HEADED=1& set CHANNEL=chrome& set RUNS=3& set MODE=real,synth
set QUALITY=medium& set FPS=60& set RES=100& set AA=msaa
set OUT=out\after-plugged-medium-60& set LABEL=after plugged-in Medium 60
node tests\smooth-routes.mjs > %OUT%.txt
```
(PowerShell: `$env:HEADED='1'` etc.) `GAME_URL=http://localhost:8124/` and `LABEL=before …` for the base build, with the same
tests folder (the new script runs against the old build: it only drives input and reads state).

**The matrix** (before and after each, 3 recorded passes per route):

| power | quality | Frame Rate | world resolution | edges |
|---|---|---|---|---|
| on battery | Medium | 60 (`FPS=60`) | 100 % | Smooth |
| on battery | Medium | 30 (`FPS=30`) | 100 % | Smooth |
| plugged in | Medium | 60 | 100 % | Smooth |
| plugged in | Medium | 30 | 100 % | Smooth |
| plugged in | High (`QUALITY=high`) | 60 | 100 % | Smooth |
| plugged in | High | 30 | 100 % | Smooth |

(`FPS=60` on a 59.9 Hz screen draws every refresh, as Unlimited does; the 30 limit counts refreshes — FPS30.md §7.)

**Only if the GPU is over budget on a route** (its "GPU p50/p95 ms" column above 16.7 at 60, or above 33.3 at 30, while CPU
is well under): the same route and settings at `RES=90` against `RES=100` (the scene drawn at 90 % through the automatic
resolution's own path, held; the output pass sharpens it as in play), then separately `AA=fxaa` (Edges: Fast) and `AA=off`
(Fast with the output pass's edge smoothing off) against `AA=msaa`. `ROUTES=street` (or `combat`, `mill`) runs one route.
Accept a trade only if the GPU time drops by a margin larger than the run-to-run spread of the 3 passes, and only after a
side-by-side look at the same shot in motion: Twinsen's and the residents' silhouettes, nearby detail, the readable signs
(Mill Lane's "IRSA'S PUMP WORKS", the street's shop boards) and the lighting must hold. A short screen clip per route (any
recorder that does not change power settings) answers "does the motion look even at a stable frame time".

**Read per route**: fps, frame p50/p95/p99/max, intervals > 50 ms, long tasks, CPU ms/frame (the game's simulation + render
submission on the main thread), GPU ms/frame (timer query; "n/a" if Chrome hides it), draw calls, and the motion columns
(spikes; Twinsen's on-screen jerk; the cart's or the aim ring's; the view's angular acceleration). Paste the tables into
§8 "Real hardware" below on a branch `smooth-hw`, with chrome://gpu's renderer line and the power source of each run.

## 8. Real hardware

### SMOOTH-HW (order 61) · the desktop (GTX 1050 Acer), 21.11 · **plugged-in half**; battery half not run yet

**Where:**
- The GTX 1050 Acer, **plugged in** (83 → 100 %). Chrome 158 (Playwright's `channel: chrome`, a fresh profile, headed).
- The game sees `NVIDIA GeForce GTX 1050 (0x00001C8D) Direct3D11` (ANGLE D3D11). The Intel UHD 630 drives the panel; Windows reports it at 60 Hz. GPU timer yes.
- 1366×768, render pixel ratio 1, MSAA 2× (Medium and High), world resolution 100 %, edges Smooth.
- **Before** = `05c32d81` (the commit before the merge), served on :8124. **After** = `18f607cf` (SMOOTH-1's merge), on :8123.
- Both builds driven by `tests/smooth-routes.mjs` from the after tree. A local copy adds `--use-angle=d3d11 --ignore-gpu-blocklist --window-size=1400,920` to the headed launch (`smooth-hw/smooth-routes-local.diff`; without them headed Chrome crashed on the first load) and reloads a load that hangs.
- Before and after interleaved per configuration (`smooth-hw/run-matrix.sh`); one warm-up and 3 recorded passes per route, then the synthetic passes.
- **Not done:** the battery half (Medium 60 / 30) and the screen clips (the agent cannot film). The order's "If the GPU is over budget" step was not needed: GPU p50 4–10 ms at 60, under 16.7.

**The frame clock was not 60 Hz for most of the evening.**
- From 19:19 to 20:11 and from 21:34 to 22:05, rAF ran at **17.4–17.8 ms (57 Hz)**: the game's `refreshMs()` read 17.4–17.8, and fps 56.5–57.1 "at 60".
- Between 21:17 and 21:33 it was a true 60: after Medium 60 gave 60.0 fps, p95 16.8; after High 30 gave 30.0 fps, p95 33.5, 0 intervals over 50 ms.
- The cause of the state was not found. OS settings were not touched.
- The tables below are the **21:34–22:05 set (`night`)**: both builds in the same 57 Hz state, interleaved, so before/after compare like with like. The 19:19 set (`plugged`) agrees with it; it is kept in `smooth-hw/` with one after High 30 Zeelich load lost to a hung load.

#### Plugged in · medium · Frame Rate 60 (3 recorded passes per route, ranges)

| route | build | fps | frame p50 / p95 / p99 / max ms | > 50 ms | long tasks | CPU p50 / p95 ms | GPU p50 / p95 ms | calls | spikes hero · camPos · camView · look (per pass) | hero jerk px p95 / max | view acc p99 / max rad/s² |
|---|---|---|---|---|---|---|---|---|---|---|---|
| street | before | 56.8–56.9 | 17.4 / 18.2–18.3 / 18.5–18.7 / 19.1–19.9 | 0, 0, 0 | 0, 0, 0 | 5.6 / 6.6–7 | 8.5–9.8 / 18.1–18.7 | 177–188 | 0/515 · 2/722 · 1/489 · 0/691; 0/515 · 1/722 · 1/443 · 1/692; 0/515 · 0/725 · 1/448 · 2/693 | 0.4–0.7 / 7.1–8 | 9.9–10 / 11.1–11.2 |
| street | after | 56.6–56.9 | 17.4–17.5 / 18.2–18.4 / 18.5–18.8 / 19.3–19.7 | 0, 0, 0 | 0, 0, 0 | 5.6–6.6 / 6.8–8.2 | 8.3–9.5 / 17.4–18.5 | 181–187 | 0/516 · 0/723 · 1/455 · 1/692; 0/516 · 2/723 · 1/441 · 2/692; 0/513 · 0/718 · 1/437 · 2/689 | 0.4–0.5 / 6.7–8.6 | 9.9 / 11.1 |
| combat | before | 56.9–57 | 17.4 / 18.2–18.3 / 18.5–18.7 / 19–20.2 | 0, 0, 0 | 0, 0, 0 | 5.9–6.7 / 6.7–7.9 | 7.7–8.4 / 9.1–10 | 198–266 | 0/281 · 8/582 · 3/485 · 4/593; 0/283 · 5/596 · 3/475 · 6/598; 0/283 · 9/597 · 4/466 · 2/587 | 0.5–0.6 / 7.8–8.9 | 40.3–44.7 / 98.4–101.7 |
| combat | after | 56.4–56.6 | 17.5–17.6 / 18.3–18.5 / 18.7–18.9 / 19.3–20.1 | 0, 0, 0 | 0, 0, 0 | 7.3–8 / 8.4–9.5 | 8.1–9.7 / 10–11.5 | 206–289 | 1/276 · 17/580 · 11/460 · 4/566; 0/277 · 7/587 · 4/489 · 3/592; 0/278 · 4/581 · 2/421 · 6/592 | 0.6–1.1 / 8.9–9.8 | 39.3–104.5 / 119.2–138.5 |
| mill | before | 56.8–57 | 17.4 / 18.2–18.3 / 18.4–18.5 / 18.6–19 | 0, 0, 0 | 0, 0, 0 | 5.3–5.7 / 6.5–6.8 | 6.2–13.6 / 7.6–16.2 | 88–91 | 0/166 · 12/396 · 4/316 · 20/414; 0/168 · 12/400 · 4/319 · 21/418; 0/166 · 12/414 · 2/322 · 20/410 | 7.1–7.5 / 73.1–78.4 | 43.6–45.9 / 124.4–144.7 |
| mill | after | 56.8–57 | 17.4–17.5 / 18.2–18.4 / 18.4–18.6 / 19.1–19.4 | 0, 0, 0 | 0, 0, 0 | 5.4–6.3 / 6.7–7.9 | 7.2–14.3 / 8.5–18.1 | 88–89 | 0/166 · 11/397 · 3/316 · 20/414; 0/167 · 11/399 · 3/315 · 22/417; 0/167 · 12/397 · 4/318 · 23/415 | 7.5–7.9 / 60.3–80.9 | 43.6–47.1 / 119.6–146.4 |

#### Plugged in · medium · Frame Rate 30 (3 recorded passes per route, ranges)

| route | build | fps | frame p50 / p95 / p99 / max ms | > 50 ms | long tasks | CPU p50 / p95 ms | GPU p50 / p95 ms | calls | spikes hero · camPos · camView · look (per pass) | hero jerk px p95 / max | view acc p99 / max rad/s² |
|---|---|---|---|---|---|---|---|---|---|---|---|
| street | before | 22.4–24.7 | 35.3–35.4 / 36.8–36.9 / 406.8–407.6 / 421–438.9 | 7, 11, 11 | 0, 0, 0 | 6.6–6.9 / 8.8–9 | 5.7–6.6 / 7–10.4 | 183–187 | 17/252 · 19/356 · 4/206 · 23/339; 21/246 · 32/346 · 12/203 · 32/326; 20/245 · 24/344 · 9/204 · 24/327 | 2.5–4.1 / 29.9–41 | 9.6–10 / 10.8–11.2 |
| street | after | 21.8–24.2 | 35.3–35.4 / 36.7–37.2 / 404.9–422.1 / 422.2–458.2 | 8, 12, 11 | 0, 0, 0 | 6.8–6.9 / 8.8–9 | 5.9–6.4 / 7.2–11 | 184–188 | 11/255 · 15/356 · 12/205 · 14/340; 18/246 · 31/344 · 18/196 · 28/329; 17/245 · 25/347 · 12/202 · 24/331 | 1.3–3.1 / 15.3–26.8 | 9.8–10.2 / 10.5–11.1 |
| combat | before | 25.4–26.3 | 35.2–35.3 / 36.6–36.8 / 390.8–405.9 / 424.5–442.2 | 4, 5, 4 | 0, 0, 0 | 7.1–8.2 / 8.9–9.9 | 6.4–6.8 / 7.6–9.7 | 194–280 | 3/141 · 22/304 · 15/245 · 8/294; 5/139 · 16/297 · 10/228 · 13/297; 6/138 · 22/294 · 16/213 · 11/286 | 2–4.6 / 6.5–67.7 | 31.8–44.3 / 69.7–86 |
| combat | after | 23.9–25.5 | 35.3–35.4 / 36.6–37.2 / 386.8–407.9 / 421.4–439.7 | 6, 5, 7 | 0, 0, 0 | 7.2–7.5 / 8.6–9.5 | 6–8.2 / 7.3–11.9 | 205–208 | 6/136 · 21/284 · 16/240 · 16/293; 6/135 · 17/283 · 10/225 · 11/282; 10/129 · 15/284 · 12/243 · 16/280 | 2.7–5.4 / 19.4–49.3 | 33.5–55.7 / 70.8–79.4 |
| mill | before | 22.5–27.1 | 35.2–35.4 / 36.5–37.1 / 37.2–419.9 / 424.6–438.5 | 6, 4, 2 | 0, 0, 0 | 7.9–8.4 / 12.6–13.3 | 4–4.8 / 5–7.3 | 88–90 | 6/80 · 22/188 · 17/153 · 30/196; 3/83 · 17/194 · 12/155 · 31/200; 3/83 · 9/204 · 12/160 · 23/211 | 22.8–40.6 / 120.7–274.7 | 36.8–49 / 62.5–88.3 |
| mill | after | 24.6–24.8 | 35.1–35.3 / 36.6–36.7 / 386.7–404.4 / 420.9–424.5 | 4, 4, 4 | 0, 0, 0 | 7.7–8.1 / 12.2–12.8 | 4–4.1 / 5–5.3 | 87–89 | 1/84 · 14/201 · 10/161 · 26/204; 6/81 · 15/195 · 8/156 · 31/204; 2/81 · 17/193 · 15/158 · 25/199 | 22.3–23.9 / 157.8–196 | 38–50.4 / 59.9–92.1 |

#### Plugged in · high · Frame Rate 60 (3 recorded passes per route, ranges)

| route | build | fps | frame p50 / p95 / p99 / max ms | > 50 ms | long tasks | CPU p50 / p95 ms | GPU p50 / p95 ms | calls | spikes hero · camPos · camView · look (per pass) | hero jerk px p95 / max | view acc p99 / max rad/s² |
|---|---|---|---|---|---|---|---|---|---|---|---|
| street | before | 56.8 | 17.4 / 18.3 / 18.7–18.9 / 19.6–20.5 | 0, 0, 0 | 0, 0, 0 | 6–6.1 / 7.2–7.4 | 8.3–8.5 / 17.9–18.2 | 226–232 | 0/515 · 2/722 · 1/442 · 4/692; 0/515 · 0/722 · 1/444 · 2/692; 0/514 · 1/723 · 1/435 · 2/692 | 0.4 / 6.6–7.9 | 9.8–10 / 11–11.2 |
| street | after | 56.9–57 | 17.4 / 18.2 / 18.5–18.6 / 19–19.9 | 0, 0, 0 | 0, 0, 0 | 6–6.1 / 7.2–7.8 | 8.3–8.6 / 17.9–18 | 226–232 | 0/517 · 1/726 · 0/450 · 1/693; 0/515 · 2/722 · 1/436 · 2/691; 0/515 · 1/725 · 1/451 · 2/692 | 0.4 / 5.8–7.2 | 9.9 / 11.1–11.2 |
| combat | before | 56.8 | 17.4 / 18.3 / 18.5–19 / 19.8–35.4 | 0, 0, 0 | 0, 0, 0 | 6.4–7.5 / 7.4–8.7 | 7.2–7.9 / 9.1–9.7 | 249–345 | 1/279 · 12/557 · 9/443 · 5/587; 0/281 · 6/574 · 3/435 · 7/579; 0/281 · 5/567 · 6/462 · 3/577 | 0.8–1 / 9.7–13.8 | 54.9–93.4 / 114.1–269.4 |
| combat | after | 56.9 | 17.4 / 18.2–18.3 / 18.7–18.8 / 19.1–21.1 | 0, 0, 0 | 0, 0, 0 | 6.5–7.3 / 8.2–8.9 | 7.2–7.9 / 9.1–9.6 | 250–348 | 2/280 · 13/584 · 9/396 · 6/600; 1/282 · 4/573 · 4/457 · 5/600; 0/280 · 7/578 · 7/467 · 4/581 | 0.8–0.9 / 8.8–10.1 | 40.7–87 / 119.1–142.2 |
| mill | before | 56.9–57 | 17.4 / 18.2 / 18.5–18.6 / 18.8–20.9 | 0, 0, 0 | 0, 0, 0 | 5.5–5.9 / 6.7–7.2 | 6.8–15.1 / 8.7–18.5 | 115 | 0/166 · 12/393 · 4/312 · 19/407; 0/168 · 12/397 · 3/315 · 20/415; 0/166 · 11/394 · 3/314 · 21/412 | 7.2–7.7 / 76.5–78.6 | 43.9–45.2 / 114–149.9 |
| mill | after | 56.8–56.9 | 17.4 / 18.3–18.4 / 18.4–18.8 / 19–20.1 | 0, 0, 0 | 0, 0, 0 | 5.7–5.8 / 7–7.2 | 6.7–9 / 8.5–18.2 | 115–116 | 0/166 · 11/391 · 5/315 · 20/407; 0/166 · 11/394 · 2/315 · 21/412; 0/166 · 12/398 · 4/317 · 22/416 | 7.3–7.8 / 65.5–84.5 | 42.8–45.3 / 129.3–147.5 |

#### Plugged in · high · Frame Rate 30 (3 recorded passes per route, ranges)

| route | build | fps | frame p50 / p95 / p99 / max ms | > 50 ms | long tasks | CPU p50 / p95 ms | GPU p50 / p95 ms | calls | spikes hero · camPos · camView · look (per pass) | hero jerk px p95 / max | view acc p99 / max rad/s² |
|---|---|---|---|---|---|---|---|---|---|---|---|
| street | before | 20.9–23 | 35.3 / 36.7–37 / 404.8–409.4 / 420.3–439.7 | 14, 11, 10 | 0, 0, 0 | 7.2–7.3 / 9.3–10.5 | 7–7.6 / 8.2–10.6 | 226–230 | 24/239 · 34/338 · 14/187 · 35/319; 16/252 · 30/347 · 11/205 · 23/331; 22/243 · 24/350 · 10/204 · 27/332 | 2.9–3.6 / 23.4–124.1 | 9.3–9.6 / 10–11.7 |
| street | after | 24.2–26.1 | 35.3–35.4 / 36.5–36.8 / 405–420.4 / 421.8–439.9 | 7, 8, 5 | 0, 0, 0 | 7.1–7.3 / 8.9–9.6 | 9.2–9.5 / 10.8–11.2 | 227–231 | 9/259 · 16/358 · 8/211 · 10/346; 12/256 · 18/360 · 5/221 · 21/341; 10/259 · 15/366 · 5/214 · 15/347 | 1.8–2.6 / 21.3–135.7 | 7.9–10 / 9.4–11.4 |
| combat | before | 23.2–25.3 | 35.3–35.5 / 36.5–37 / 403.7–406.1 / 421.9–455.3 | 8, 5, 6 | 0, 0, 0 | 8–8.2 / 9.4–11 | 6.9–10.6 / 8.1–12.3 | 255–283 | 7/135 · 27/283 · 21/201 · 19/269; 6/138 · 25/293 · 14/212 · 16/253; 4/130 · 18/266 · 8/209 · 13/251 | 3.7–5.2 / 14.3–104.7 | 31.6–43.6 / 85.7–112.4 |
| combat | after | 23.1–28 | 35.3–35.4 / 36.4–36.7 / 37.1–407.1 / 423.2–440.2 | 8, 7, 2 | 0, 0, 0 | 8.5–8.8 / 10–11.1 | 8.1–10.3 / 9.4–12.6 | 325–349 | 5/152 · 18/294 · 12/211 · 17/277; 6/136 · 17/300 · 17/215 · 17/294; 7/138 · 12/276 · 6/200 · 12/280 | 2.5–3.2 / 16.5–77.6 | 26.7–52.6 / 64.2–85.1 |
| mill | before | 22.6–24.7 | 35.2–35.4 / 36.5–36.9 / 404.4–408 / 421.1–440.2 | 4, 6, 4 | 0, 0, 0 | 8–8.6 / 13–13.9 | 6.5–6.8 / 7.6–7.8 | 115–117 | 3/83 · 19/197 · 8/155 · 25/204; 8/75 · 18/190 · 13/155 · 31/198; 7/78 · 16/197 · 9/159 · 30/206 | 26.2–29 / 121.9–372.6 | 40.3–48.6 / 59.8–96.6 |
| mill | after | 23.4–25.9 | 35.3 / 36.5–37 / 371.7–422 / 405–458.7 | 5, 3, 4 | 0, 0, 0 | 8.2–8.8 / 12.9–13.7 | 6.4–7.2 / 8.4–11.2 | 115–117 | 7/79 · 16/192 · 14/150 · 33/201; 4/80 · 16/200 · 9/157 · 27/208; 3/83 · 10/191 · 5/155 · 29/201 | 25.2–31.4 / 131.6–601.3 | 32.2–44.3 / 46.6–65.5 |

**Before vs after (SMOOTH-1's two fixes):**
- **At 60 the routes are equal within the pass spread on this machine.**
  - Street and Mill Lane: the same fps, frame p99, GPU and motion columns.
  - Combat after: CPU p50 +1 to +1.5 ms at Medium (7.3–8 against 5.9–6.7); at High equal. Camera spikes in the same range (4–17 against 5–12 per pass).
  - No interval over 50 ms in any 60 pass of either build.
- **At 30 the comparison is swamped** by the gaps below, the same in both builds (street "after" with somewhat fewer spikes at High: hero 9–12 against 16–24 per pass; not separable from the gaps).
- Nothing was traded: GPU well under budget, so the resolution and edge steps were not run.

**At 30 in the 57 Hz state, the browser stops calling the game for ~400 ms several times a pass** — both builds, Chrome and the desktop app's Electron alike:
- **The gaps:** 370–460 ms rAF gaps, 2–14 per 10–18 s pass, at both qualities, in all three routes.
  - The game's own work in the frame before is 4–9 ms.
  - Every rAF callback logged (`smooth-hw/diag/fps30feel.mjs`, `diag/chrome-30` and `diag/electron-30-night`): **the callbacks themselves stop**. The game is not skipping draws.
  - At 60 in the same state (a draw on every callback): none.
  - At 30 in the 60 Hz state (FPS30.md §8, the 62 runs at ~18:00; 21:21 here): none.
- **The 1 px test:** with a 1 px element changed on every callback, so every refresh has new damage (diagnosis only, `DAMAGE=1`, Electron, T2 at 30, 2 runs), **the gaps vanish**:
  - 0 intervals ≥ 45 ms, rAF max 19–20.5 ms;
  - Twinsen's and the camera's spikes 0/153, against 1–15 without it.
- **Also in this state:** about 1 in 8 drawn frames comes **one refresh early** (17.5 ms after the last, not 35), 23–26 per T2 pass. That is the 30 limit's refresh counting on a clock of 17.5 ± 1 ms; with the 1 px test it stays.
- **Reading (not verified beyond this machine):** in that state a refresh where the game draws nothing lets the browser stop its frames for a while. That is an uneven 30 of exactly the kind the user describes, and it is invisible at 60.
- **Proposed for the cloud (its call):**
  - (a) at the 30 limit, give every skipped refresh something to present (a 1 px change, or re-presenting the last frame) and measure it;
  - (b) the early frames: the count's tolerance when `refreshMs()` jitters;
  - (c) F9's line counting presented frames, so the user's overlay shows these gaps.

**Left:** the battery half (Medium 60 and 30, before and after), and the clips.

## 9. For P94 (30 FPS in active play): the order at 30, and the routes

Read in code (main.js loop/advance/frame, input.js), consistent with the synthetic 30@60 / 30@59.9 passes:
- Under the 30 limit a drawn frame is two 60 Hz simulation steps (`advance`: n = 2, `_inner` on the first). Each step runs
  `input.update()` first, then the state's update — in play: the hero (`h.update`), the NPCs, enemies, ball, weapons,
  targeting, story, and the camera last (`camRig.update`, after the hero, in the same step) — then the world, particles, HUD
  floats; LOD, the light pool, shadow culling and the map slice on the drawn step only; the render on the second step only.
  Camera and hero are always drawn from the same simulated instant; there is no interpolated display state that could drift
  from the simulation (`rootVsSim` 0 m on every pass).
- Input: a key pressed and released between two drawn frames stays in `Input.taps` until the next step's `update()`, so it
  is `pressed` on the first of the two steps and released on the second: no short tap is lost; a release between frames
  lands one step later, not a frame later. The refreshes the limit skips run `input.poll()` (pad buttons latched); mouse
  motion accumulates and the camera reads it in the step. A press waits up to one drawn frame (33 ms) plus the render to be
  seen — inherent to 30, not measured here (no display, no photon).
- The synthetic 30 passes: Twinsen 0 spikes on every route at 30@60 and 30@59.9, the cart 0, the street camera as at 60
  (view acceleration p99 9.7–9.9 rad/s² at every rate). Camera spikes at 30 are the lock-on and keep-out single-frame steps
  of §3.4/3.5, which at 30 last a whole 33 ms frame each. Otherwise the motion at 30 is as even as the frame times allow, so
  unevenness seen at a stable 30 on the laptop points at presentation (the compositor; GPU time near a refresh — FPS30.md
  §7's open item) or at those camera steps rather than at the simulation.
- The T1–T3 routes asked for P94 (camera turn past fence posts; run, stop, reverse along the fence; strafe, aim at a bell,
  throw, with input → first aim response → release frames) were **not added** in this pass: they need places found in the
  scene with the one browser allowed, and an input-to-response probe the recorder lacks. To add them: an entry in
  `defineRoutes()` (`window.ROUTES`) and its positions in `ROUTE_POS`, the objects to record in `R.objs` (name → world point);
  `FPS=30` sets the limit for real/cpu passes, `RATES=30@60,30@59.9` for synthetic ones. Every drawn frame's rAF timestamp
  and screen positions are already in `SM.F` (per pass in `OUT/*.json`), each frame's steps and CPU in `SM.P`. For the probe,
  note in the route's `each(dt, R)` the game time of the press, the first frame `G.ball.dots[0].visible`, and the ball's
  `state` leaving `inhand`.
