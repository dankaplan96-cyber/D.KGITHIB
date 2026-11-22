# FPS30 — a smooth, responsive 30 FPS mode (P70, REPAIR-PASS-18-11 phase 5)

The user's brief: `FPS30-BRIEF.md` (18.11). The user, 19.11, playing v100 in Chrome: **"The game does not lock to 30 fps
when I choose it."** That came first. Branch: the FPS30 worker's worktree branch (commits listed in its report).

Every measurement here was made in this cloud: **Automated runtime only (SwiftShader)** — headless Chromium, no GPU, no
battery, no real display. These runs check the scheduler's logic, the simulation's timing and the settings. They cannot
show how smooth the game is on the GTX 1050 laptop, and no GTX 1050 number is claimed here. The hardware test is below
(§6), and the desktop has order 55 (FPS30-HW) in `tools/testlab/CLOUD_ORDERS.md`.

## 1. Why the 30 limit did not hold (what was found)

The 30 limit (P66, FRAME-2) added each requestAnimationFrame callback's interval to an accumulator and drew a frame once
the sum came within **1.5 ms** of 33.3 ms. Measured on a synthetic 60 Hz display (`tests/fps30.mjs` A, the same harness
before and after):

| Case (30 limit) | Before: drawn-frame intervals | After |
|---|---|---|
| exact 60 Hz timestamps | all 33.33 ms | all 33.33 ms |
| 60 Hz, timestamps ±1.8 ms off the refresh | p50 33.3 · p95 **50.0** · p99 51.0 · min **15.7** ms; **38 of 177** intervals over 40 ms and **35** under 25 ms | p50 33.3 · p95 36.0 · p99 36.2 · min 30.5 · max 36.4 ms; none over 40 or under 25 |
| one frame a refresh late (16.0 / 16.7 / 17.3 ms) | 49.3 → **16.7** → 33.3 …; 50.0 → **16.7**; 50.6 → **16.7** (a catch-up frame) | 49.3 → 33.3 …; 50.0 → 33.3; 50.6 → 33.3 |
| a 400 ms stall | 33.3 after it | 33.3 after it; the simulation gets 4 steps, 0.27 s dropped (as before) |
| 120 Hz (±0.6 ms) | 30: p50 33.3 (32.3–34.4); 60: p50 16.6 | the same |
| 144 Hz | 30 fps: 34.7 ms, every fifth 27.8 | the same (144 / 30 = 4.8 refreshes: it cannot be even) |
| 75 Hz | 30 fps: 26.7 / 40 alternating | the same (2.5 refreshes) |
| moved from a 60 Hz to a 120 Hz screen | 33.3 throughout | 33.3 throughout |

So: a frame timestamp more than 1.5 ms early made a drawn frame wait a whole extra refresh (50 ms), and the accumulator
then drew the next one a single refresh later (16.7 ms) to keep the average — 21 % of the frames at ±1.8 ms of timestamp
jitter. The average stayed 30, which is why an fps counter could read 30 while the motion visibly did not lock. A frame
that missed its refresh (an overrun) was followed by the same 16.7 ms catch-up frame. **Whether the user's Chrome hands
over timestamps that jitter that much is not known from here**: this headless browser's timestamps sit within 0.1 ms
(p95) of the refresh. The Frame Rates benchmark (§6) prints exactly that number for the user's machine ("frame callbacks:
distance from a whole number of refreshes"), and the 30 runs' first drawn intervals, so the next report shows whether
this was the cause or something else is (the order also asks for chrome://gpu, Chrome's Energy Saver, the display's
rate). Also checked and not the cause: the setting is read from the saved settings at start (applySettings's first run)
and on each click; Auto quality never touches it; the benchmark used to run with the limit off on purpose (its report
said "off while measuring") — a 60 fps benchmark result under "30" was expected, not a failure.

## 2. What changed (files)

- `src/main.js` `loop` — **the limit's scheduler**: frames are due on a fixed grid of target times one limit apart
  (`_due`); a refresh is drawn when it is the refresh nearest to its target (at most half a refresh early). On a 60 Hz
  display that is every other refresh whatever the timestamp jitter; where the refresh is not a multiple of the limit
  (144, 75 Hz) the grid keeps the average exact. A frame drawn late by most of a refresh or more (an overrun, a stall,
  the return from the background) starts a new grid from itself: the next frame is a whole limit later, never a catch-up.
  No setInterval, no second loop: requestAnimationFrame stays the only clock; a limit at or above the measured refresh
  still does nothing (rAF sets the pace). The background's 8 fps and the hidden tab's no-catch-up are unchanged.
  `benchCapMs`: the limit the Frame Rates benchmark applies (other benchmark runs keep it off).
- `src/main.js` `advance` — a frame up to 3 % over 1/30 s is **one** simulation step (`STEP_TOL`): at 30 the jittering
  frame time used to flip between one step of 33.2 ms and two of 16.8.
- `src/engine/input.js` — a **pad button** pressed and released between two drawn frames now counts once (`poll()`, run
  on the refreshes the limit skips, latches buttons that went down); a **touch button** tapped between frames too
  (`touchDown`, `touchTaps`). Keys and mouse clicks already did (taps, leftTap, rightTap).
- `src/engine/physics.js` `fall` — the vertical integration as a 60 fps step makes it, at any step size
  (y += (vy − g·(dt + 1/60)/2)·dt): identical to before at 60 fps; a jump at 30 rose **5 cm lower** (apex 1.082 vs 1.136
  m, air 0.667 vs 0.700 s) and at 144 **3 cm higher** (1.168) — now 1.134 / 1.136 / 1.136 m and 0.700 / 0.700 / 0.701 s.
  Ledges built for the 60 fps jump are reachable at 30 again.
- Settings → Display → **Frame Rate: 30 / 60 / Unlimited** (index.html; `src/game/text/common.js`, `i18n.js`; Hebrew in
  `text/he/common.js`, `text/he/i18n.js`, bundled). Saved values unchanged: '30', '60', 'auto' (= Unlimited: the old
  "As the screen" / "Off"); anything unknown reads as Unlimited. The 30 hint says what it is: less work for the computer,
  the same game speed, less fluid motion than 60.
- Auto quality (`src/engine/autoquality.js`, `autoapply.js`) — works to the chosen budget (33.3 ms at 30, 16.7 otherwise;
  already so) and now: a **step up is judged against 60's budget** even at 30, so the time the limit saves stays headroom
  and battery instead of buying a heavier profile; pressure and steps down still use 33.3 (steady 33 ms frames are on
  budget, never a failure). Its cache is **keyed by the 30 limit** (`|30fps`; the keys at 60 / Unlimited are as before, so
  existing caches stay); changing the limit re-keys it and evaluates again (`onBudget`); a profile change still waits for a
  commit point. Auto never changes the frame rate.
- `src/engine/bench.js` — **Pause → Benchmark: Frame Rates** (`runPacing`; English + Hebrew button): street, interior,
  combat, arrival at Unlimited / 60 / 30, back to back on each route, the quality in force held (Auto's governor paused,
  automatic resolution off), 1.5 s warm-up + 10 s measured each (~2.5 min). Per run: fps, drawn-interval p50/p95/p99/max,
  on pace (±12 % of the limit or the refresh), frames ≥ 1.5× the pace (50/66.7 ms at 30), long→short catch-ups, > 50 ms
  (behind black apart), GPU ms a frame and per second, CPU work a frame and per second; a per-limit summary; the frame
  callbacks' timestamp jitter and missed callbacks; the 30 runs' first 40 intervals. `pacingStats` exported.
- `src/engine/perf.js` — the F9 overlay's pacing line: limit · refresh · on pace % of the last 120 frames · ≥ 1.5× count.
- `tests/fps30.mjs` (new suite, 39 checks), `tests/README.md`, `tools/testlab/CLOUD_ORDERS.md` (order 55).
- No new shipped file (`node tools/game-files.mjs`: 508).

## 3. What was checked and left as it was (with the evidence)

- **Camera**: every damping in camera.js is time-based (exp(−k·dt), `damp`, the critically damped spring); the keys' and
  a pad stick's turn is per second (CAM-2): 1 s of Z turns 2.100 rad at 30, 60, 144 and an uneven 30 (2.098); a stick at
  0.6 turns −1.620 at all (fps30 D). The mouse turns by its movement, not per frame. Camera and hero are updated in the
  same step and drawn from the same state (there is no interpolated display state), so they cannot drift apart; no
  interpolation was added (it would add up to a frame of latency at 30 for no measured gain here). The camera runs after
  the hero in `updatePlay`, input is read at the start of each step (`frame` → `input.update`).
- **Animation**: driven by dt (Rig.update; the coordinator's faces keep their dt); nearby characters are animated every
  drawn frame at 30 (only the far, out-of-view eco rate exists, unchanged).
- **Gameplay speed** (fps30 D, the real `advance` path): walking 1 s 1.591 m at 60 / 1.594 at 30 / 1.584 at 144 / 1.586
  uneven 30; running 3.829 / 3.829 / 3.814 / 3.817; a running jump 2.75 / 2.78 / 2.75 / 2.68 m; a sword swing 0.450 /
  0.467 / 0.437 / 0.466 s (± one frame); the magic ball leaves the hand at 0.183 / 0.200 s (the next 30 fps frame) and
  first lands 7.99 / 7.98 m away (uneven 30: 7.95). timing.mjs (29/29: 10–144 fps) and anim-combat.mjs (35/35: release
  and contact at 30/60/120) pass.
- **Catch-up**: at most 4 steps of 1/30 s after a stall (MAX_SUB, unchanged), the rest dropped and counted (`lost`).
- **Aiming**: the aim preview (the dots and landing ring, actors.js) follows the arc in fixed 10 ms steps, independent of the frame rate;
  targeting assistance untouched.

## 4. Measurements under matching conditions (Automated runtime only, SwiftShader)

The synthetic-display table in §1 is the before/after for the scheduler. With this browser's own frame clock and the
draw stubbed (fps30 F; draws on SwiftShader take longer than 33 ms, so a real draw cannot show a 30 limit here):
Unlimited 60 fps (p50 16.7), 60: 60.0 fps (p50 16.7, p95 17.7), 30: 30.0 fps (p50 33.3, p95 33.9, p99 35.5, no
interval ≥ 50 ms). The old scheduler on the same clock: 30.0 fps, p50 33.3, p95 35.4 — this browser's timestamps do not
jitter, so the old defect does not show on it. The Frame Rates benchmark's own lines on the same stub (street, 3 s):
Unlimited 48 fps (the shared machine's own stalls), CPU work 173 ms per second; 30: 30 fps, on pace 100 %, CPU work 90 ms
per second — the game's simulation work per second halves at 30 (the draw was stubbed, so no GPU number).

## 5. Limitations (what remains)

- **Not measured on the user's hardware.** Whether 30 is now even on the GTX 1050 laptop, and how much GPU time and power
  it saves, needs §6. If the report shows timestamps that do not jitter and 30 still uneven, the cause is elsewhere (the
  browser's compositor, Energy Saver, a variable-refresh display) and the report's numbers will say which.
- 144 Hz and 75 Hz displays cannot show an even 30 (34.7 ms with every fifth 27.8; 26.7 / 40): the average is exact.
- At 30 a press waits up to one extra refresh (16.7 ms) for its frame compared with 60: inherent; no smoothing added.
- The magic ball's first touch at 144 fps lands 0.25 m shorter than at 60 (7.74 vs 7.99 m; release 9 ms earlier): a
  144-only difference in the release pose, not touched here (30 matches 60).
- Remaining stalls a limit cannot fix are the arrival's batch builds behind the black (the user's benchmark: 116–264 ms
  black frames) — the runtime performance worker's item; not changed here.
- jumpreach.mjs "Zeelich's old mill" fails identically with and without the physics change (same heights, 12.56 m, the
  hop onto the gallery): not caused by FPS30; for the coordinator (world/CAVE work since its last pass?). controls.mjs's
  three camera "no lurch" checks fail as in KNOWN-FAILING.md (same numbers).
- No motion blur, no interpolation, no frame generation (the brief's options; not needed by any measurement here).

## 6. Recommendation and the user's test procedure

**Recommendation (to be confirmed by the user's own run):** plugged in, **Unlimited** (the user's battery benchmark held
60 at Medium on every route, so plugged in has at least that). On battery, **60** if the Frame Rates benchmark shows it on
pace there; **30** where 60 is not held, or to run cooler and longer — the GPU and CPU "ms per second" columns of the
report show how much each limit saves on that machine. This is a recommendation from the design, not a measurement.

The procedure (the artifact in Chrome, ~5 minutes):
1. Start or continue a game. Pause → **Benchmark: Frame Rates**. Wait ~2.5 minutes (it runs four routes at Unlimited, 60
   and 30 and puts the game back). Copy the report and paste it. Do it once plugged in and once on battery.
2. Then Settings → Display → Frame Rate **30**, press F9, and play a minute: the house, the square running while turning
   the camera, a fight with ball throws, a door in and out. Tell what the overlay's line says ("on pace … %") and whether
   it looks even.

Resume point: the user's / the desktop's Frame Rates reports → if 30 is on pace there, P70 is done for pacing; then the
recommended setting is written from their numbers (GPU/CPU ms per second at each limit, on battery and plugged in).

---

# FPS30-SMOOTH — the second brief (19–20.11; FPS30-SMOOTH-BRIEF.md)

Every number below: **Automated runtime only (SwiftShader)**, headless Chromium in the cloud, the game's own loop and
simulation; no GPU, no display, no GTX 1050 number. The user asked (20.11) to keep tests to a minimum: one run of
`tests/fps30.mjs` confirms this round; the full regression set comes at the end with everything else.

## §2 delivery (from FPS30, unchanged)
The grid scheduler (§1–2 above): even 33.3 ms on a 60 Hz rAF clock with ±1.8 ms jitter, no catch-up frame after a missed
refresh, no burst after a stall or the background. Not repeated here.

## §6 animation events crossed between updates: exactly once
How they fire: by state and flags, not by "this frame's time equals X" — the sword's swing sound once per move
(`m.swung`), its hits along the arc swept since the last step (`prevArc`), the ball's release on the frame its pose lets go
(`reseat`), its catch once (`toHand`), a jump's sound at the take-off, its landing at the frame he touches down. One was
rate-dependent: **footsteps** were counted by distance and the distance past the stride was dropped at each step (more
ground per step the longer the frame). Now the remainder carries over (a stall still sounds one step, not a burst:
`actors.js`). `tests/fps30.mjs` G counts the events in the same moves at 60 / 30 / 144 / an uneven 30 / the 30 limit:
footsteps (10 s walking, 10 s running), three jumps and landings, a three-press sword combo on an arena enemy (swings and
hits), three ball throws (throws, releases, catches) — the same counts at every rate (60: 17 + 11 steps, 3 / 3 jumps and
landings, 3 swings 3 hits, 3 throws 3 releases 6 catch sounds).

## §5 the camera at 30, and §4 the step: one 33 ms step or two of 16.7 (decided by measurement)
`tests/camsteady.mjs` (its 10 routes walked by input, every camera update recorded) on the Follow camera (the default) at
60, at 30 with one 33 ms step (what FPS30 shipped) and at 30 drawn over 60 Hz steps (new rate `30s` in `tests/lib/camrec.js`:
the step between two drawn frames is simulated and not recorded). Per minute of play, reversals of the view's heading
(revYaw), tilt (revPitch) and height (revY, ≥ 5 cm), and tilt/height reversals within 0.5 s of the last (jitter: a bob or
shudder):

| route (Follow) | 60 | 30, one 33 ms step | 30, two 16.7 ms steps |
|---|---|---|---|
| street, Modern controls (running and turning, diagonals) | revY 12.9 · jitterY 4 · revPitch 7.8 | revY **16.5** · jitterY **7** · revPitch 9.6 | revY 7.7 · jitterY 3 · revPitch 6.0 |
| same, Medium distance | revY 9.5 · jitterY 3 · revPitch 6.0 | revY **19.7** · jitterY **12** · revPitch **11.1** | revY 9.4 · jitterY 4 · revPitch 6.0 |
| harbour pier | revYaw 12.1 · revY 8.6 | 11.9 · 5.9 | 11.7 · 8.4 |
| along house walls (camera collision, corners) | revY 9.9 · jitterY 4 | 10.3 · 4 | 9.8 · 3 |
| through a door in and out | revY 15.4 | 14.6 | 16.3 |
| standing, turning on the spot (orbiting a still character) | revYaw 11.4 | 11.7 | 10.4 |
| combat (four mites) | revYaw 16.7 | 17.3 | 15.2 |
| near the cliffs, street and square | as at 60 | as at 60 | as at 60 |

What it was: where the camera's arm meets a wall or an eave (the trace's `occ` and `keep` rules), one 33 ms step swings
it twice as far into the obstacle before the rule answers, so the correction comes in larger, alternating pieces (traced:
7.74 → 7.50 → 7.87 → 7.55 m in four frames on the street). The camera's damping itself is time-based everywhere (no
per-frame factor found); the difference is the collision rules' sampling rate. **Decision: under the 30 limit the game
simulates in 60 Hz steps, two per drawn frame** (`main.js advance`: the step between two drawn frames is an inner one —
no detail levels, lamps or shadow culling — and draws nothing). The camera then measures as at 60 (the table's last
column). Cost (step probe, the street, render stubbed; this machine's CPU, not the laptop's): the simulation per drawn
frame **1.4–1.7 ms with one step, 2.4–3.3 ms with two** — the simulation's CPU per second is then 60's, while the render
submission and the GPU still do half of 60's work. Gameplay is identical either way (fps30 D: the jump, walk, run, sword,
ball and camera turn at the 30 limit match 60). The 30 limit's frame-time tolerance became 10 % of a step (`STEP_TOL`: a
jittered 30 fps frame is always two steps). Without the limit (Unlimited / 60 on a slow machine) a long frame is still
split into steps of at most 1/30 s, as before.

## §7 stalls apart from arrivals
Arrivals, batch builds and the shader warm-up are PERF-ARRIVAL's (not touched). The others, from the evidence there is:
door transitions — the user's GTX 1050 battery benchmark's transition route (a house door in and out every 2 s): 0 frames
over 33 ms, p99 16.9 ms; combat — one 67 ms frame in 6 s with 7 ms of the game's work before it (a GC or the browser, the
benchmark's hitch list); saving — the pause screen's save thumbnail is already a bounded, off-thread job (main.js: a
createImageBitmap and a worker, given up above THUMB_MS); inventory — opens a DOM panel and the item stage. No new
cheap, bounded fix was evident in the code and the user asked not to run more measuring suites now; the Frame Rates
benchmark's hitch list (every frame over 33 ms with what ran in it) is where a stall in these shows on the user's machine.

## §8 motion smoothing (the optional blur): built, measured on paper, left OFF
A camera-turn blur inside the existing output pass (no new pass, no new target, `renderer.js`): the previous drawn frame's
view rotation and lens reproject each pixel's ray (the motion of the far scenery, which judders when the camera turns at
30), five taps along it (tent weights 0.3 / 0.2 / 0.15), a shutter of 0.35 of the frame's motion, at most 1.2 % of the
picture's width; faded out in up to three screen ellipses (Twinsen, the tutorial's marker), none while the aim's dots show,
none below 1.5 px of blur (the camera barely moved: no taps run) or over a 0.35 rad turn (a cut). The UI is DOM and never
blurred. Cost when on and turning: 4 extra filtered reads a pixel in a pass that already reads every pixel — about 8 M
reads at 1920×1080 (the GTX 1050), 10 M at the UHD 620's 2560×1012 (DPR 2); when off or still, a uniform branch (nothing).
**It stays off and has no setting yet**: it was not verified in pictures (the cloud's camera probe did not drive a turn in
the recorded frames), its GPU time is unmeasured on real hardware, and the brief puts it last. Turning it on is
`game.renderer.motion.want = true` (for a test); a Settings switch (English + Hebrew) is the next step only after captures
and a GPU timing on the user's machines.

## Final summary (the brief's acceptance)
- Even ~33.3 ms on a stable 60 Hz display: yes on the synthetic display and on this browser's own clock (rendered-frame
  intervals from rAF timestamps, not display presentation). **Unverified on the GTX 1050** — the user's Frame Rates
  benchmark (pause → Benchmark: Frame Rates) gives the answer, plugged in and on battery.
- No recurring missed deadlines in representative play: unmeasured on hardware (same benchmark; its "≥1.5× pace" column).
- Short inputs: keys, mouse clicks, pad buttons and touch taps between drawn frames each count once (fps30 C).
- Gameplay speed: unchanged (fps30 D, timing.mjs).
- Camera: at the 30 limit it now behaves as at 60 (60 Hz steps; the table above).
- Animation events: exactly once at every rate (fps30 G).
- Visual quality: unchanged (no resolution or scenery cut; the blur is off).
- 60 / Unlimited: unchanged (one step of up to 1/30 s per frame as before; the 60 Hz steps apply under the 30 limit only).
- Remaining bottlenecks: the arrival's batch builds behind the black (PERF-ARRIVAL), the street's CPU work on the UHD 620
  (p95 22 ms at 60: at 30 it has room), the GTX 1050's on-hardware pacing — all need the user's reports.

Tests this round (lean, as the user asked): `tests/fps30.mjs` whole, 49 of 54 — the 5 failures were part G's walking in
the whole run (an earlier part's pad had switched the key scheme; G now sets Modern keys itself), then `ONLY=DG` 32/32.
`tests/camsteady.mjs` (Follow and LBA at 60/30; Follow at 30s) for the table above: its known failures as in
KNOWN-FAILING.md. The full regression set is for the end of the pass.

## 7. P88 (21.11): the grid drifted on a 59.9 Hz screen

The user's Frame Rates report (21.11 09:42, Chrome on the **Intel UHD 620**, on battery, measured refresh **59.9 Hz**,
median 16.70 ms) shows 30 on pace 100 % and the first 40 drawn intervals at 33.3 ± 0.5 ms, yet the user sees 30 "still
jumping, not even". Cause: the 30 grid stepped by exactly 33.33 ms while two refreshes of that screen are 33.40 ms; the
target drifted 0.07 ms a frame and every few seconds a frame came **one refresh early (16.7 ms)** — at 59.94 Hz a 50 ms
one too. The synthetic tests only drove exact 60 Hz. The report's 40 intervals and 10 s runs were too short to show it.

Fix (`src/main.js` loop): where the limit is within 8 % of a whole number n ≥ 2 of refreshes (30 on 59.9/60/120 Hz, 60 on
120 Hz) frames are counted in refreshes: drawn on the first callback at least n − ½ refreshes after the last drawn one,
by the rAF timestamps. No drift at any refresh; a late frame restarts the count (no catch-up). 75 / 144 Hz keep the grid.

`tests/fps30.mjs` A1b (new): 30 on 59.9 and 59.94 Hz for 12 s — old scheduler FAIL (a 16.69 ms interval at each),
new PASS (every interval 33.39 / 33.37 ms). All of A–G PASS on the new code (A5 failed once in the first of four runs of
part A, then passed three times with identical numbers). Automated runtime only (synthetic display).

Not explained by this, still open: at 30 the report's GPU time per frame on the street and arrival routes is 17–18.5 ms
(p50) — more than one refresh — so the compositor may show some frames a refresh late even with even rAF. That needs the
presented frames on the user's machine (order 60.0 FPS30-PRESENT). Note the report ran on the Intel UHD 620, not the GTX.

## 8. P94 (21.11): the 30 limit in active play — running, turning the view, aiming the ball

The owner's brief (status.md P94): at Frame Rate 30, running, turning the camera and aiming the magic ball should feel
steady and responsive with the image sharp; active play in already-loaded areas (region changes and startup out of scope).
Base `6ee0b0b5` (origin/ccr-c1c2c4b9-dep6ed with P93's ball-release fix merged). **Every number in this section is
"Automated runtime only"**: headless Chromium, SwiftShader (a CPU rasteriser), the draw stubbed (each drawn frame is
sampled, not rasterised), on a machine shared with other workers' browsers (load 9–14 on 4 cores). No number here is a
result for a real screen or GPU; the laptop's run is order 62 (§8.7).

### 8.1 Read in code before any change
- **The limiter** (`main.js loop`): one rAF loop; at 30 on a 59.9/60/120 Hz screen frames are counted in refreshes (P88
  `_drawT`: drawn on the first callback ≥ n − ½ refreshes after the last drawn one); a late frame restarts the count, no
  catch-up; a skipped refresh only runs `input.poll()`. **Order 60.0's question** (on battery, ≥ 50 ms pictures from rAF
  callbacks arriving a refresh late): a refresh gets a picture only if its callback runs. When the callback of the refresh
  a frame is due on never comes, the next one is a refresh later and that frame is 50 ms whatever the rule; accepting an
  early draw after a late one would only shorten the *next* frame to 16.7 ms (50 + 17 instead of 50 + 33): it cannot
  remove the 50 ms hold and adds an uneven frame. On this browser's own rAF (`cpu` passes, before, 18 passes): all 47
  drawn intervals ≥ 45 ms contain a missing callback (a callback gap > 25 ms); 22 of them are the plain case (a frame drawn,
  the skipped refresh's callback, then no callback on the refresh it was due). **Not changed**: without a second timer the
  limiter has no lever on a callback that does not come.
- **Input between drawn frames** (`input.js`): keys, clicks, pad buttons (latched by `poll()` on the skipped refresh) and
  touch taps are kept for the next step; mouse motion accumulates; both 60 Hz steps of a drawn frame read input; the stick
  is read live each step. No stale input found (§8.3-2).
- **Steps** (`advance`): at 30 two 60 Hz steps a drawn frame, the camera last in each, the render after the second;
  Twinsen's drawn transform is his simulated one (no interpolation state that could drift).
- **The Follow camera** (`camera.js _chase`): springs and damping per time; the keep-out rules place it outright (SMOOTH-1
  §3.4). **The aim** (`actors.js MagicBall.preview`, `aimPoint`, `combat.js stepThrow`): the dots on the arc's 10 ms
  samples by index (SMOOTH-1 §3.6); the cursor's ground point found in 0.25 m steps down its ray and kept at the last step
  above the ground; while the ball is held in Modern he faces the aim.

### 8.2 Method
`tests/fps30-feel.mjs` (new), one scene: Citadel's harbour quay, fixture `new-11-town`, 1366×768, Follow, Medium, world
resolution 100 %, Edges Smooth; the same inputs at the same game time at every rate (`tests/lib/smoothrec.js`).
- **T1** the view turned at a constant rate past the quay's rail and bollard posts, the lamp posts and the shop windows.
  The Follow camera takes no camera input (it stands at his back), so the view turns as he turns on the spot: Classic Right
  held 3 s (keys), the pad's stick at a constant 0.8 (pad).
- **T2** run along the quay's edge beside the posts 2 s, stop 0.7 s, back 2 s, camera untouched: keys Classic (Up, —,
  Down), pad Modern (stick forward, —, back: he turns and runs toward the camera, which holds).
- **T3** the ball at the harbour bell (2.6 m up on its post, 9.7 m away): mouse path Modern — ball key held, strafe left
  1.2 s, right 1.2 s, still 0.4 s, let go, the cursor kept on the bell as a player would (moved once a drawn frame to where
  the bell was drawn); pad path Classic — the ball button held, the aim turned across the bell and back with the stick.
- Rates: synthetic display 30@60, 30@59.9 and 60 (exact timestamps), and `cpu` (Frame Rate 30 on this browser's own rAF,
  the draw stubbed); 3 runs each (the synthetic runs repeat to the frame). Recorded: every rAF callback's timestamp and every
  drawn frame's (p50/p95/p99/max, count ≥ 45 ms); **presentation timing: none** (headless has no display and no
  presentation feedback). Per drawn frame: the camera's position and heading step and its single-frame jumps (a step > 1.5×
  both neighbours' and > 3 cm / 0.005 rad over their mean — fixed before the first run); Twinsen's on-screen step against
  the nearest post and its change frame to frame; the aim ring's and the middle dot's steps; the ball's gap from the hand on
  the first frame it is drawn flying. **Input probes** (synthetic only): an input put in on a refresh the limit skips (as a
  real event arrives between frames), counted in drawn frames to its first visible response; then the cursor held still 1 s.

### 8.3 Found (before = 6ee0b0b5)
1. **Delivery on the synthetic display is exact** (every drawn interval 33.33 / 33.39 ms, none ≥ 45 ms), and Twinsen and
   the camera move evenly in T1 and T2: no camera jump; the frame-to-frame change of the posts' and his on-screen steps is
   ~4× the 60 Hz value (T1 10.7 vs 2.6 px p95, T2 1.7 vs 0.4) — (33.3/16.7)², the same motion sampled half as often, not a
   defect. Keys and pad identical in T1.
2. **Input: no extra frame anywhere.** Ball pressed → in his hand on the next drawn frame; aim moved (cursor or stick) → the
   next drawn frame; let go → the ball leaves the hand 3 drawn frames later at 30 (6 at 60), which is the deliberate whip
   (`releaseAfterCharge` 0.08 s: 5 steps after the step that sees the key come up). The dots after the press: 7 drawn
   frames, the deliberate `chargeAfter` 0.2 s. Same before and after.
3. **The reticle drifted with the mouse still (Modern, Follow, mouse).** Holding the ball he faces the cursor's point; the
   Follow camera turns with his facing; so the cursor's point moves on and he follows it. With the cursor 60 px off and
   untouched, **he and the view spun at 3.85–4.0 rad/s and the middle aim dot slid 4.3–8.3 m/s**, at 60 and at 30 alike.
   The largest aim fault found; not tied to the frame rate.
4. **The cursor's aimed point hopped** 0.15–0.2 m whenever the count of 0.25 m ray steps changed (the ring 0.05–0.09 m and
   the middle dot up to 0.47 m in one frame while strafing), and **the dots hopped between arc samples** (SMOOTH-1 §3.6;
   0.23–0.29 m steps while the arc ended on a lamp post).
5. **The camera's arm comes in by 0.25 m steps** where something crosses its line (T3 mouse: `occ`, `want` 8.75 → 8.5 →
   8.25 → 8.0 m): camera steps of 0.24–0.36 m in one drawn frame at 30; the same motion spread over 2–3 frames at 60 (4
   position jumps by the criterion at 30, 0 at 60). The same in play time at both rates. **Not changed**: the arm's search
   granularity is camera design with its own tests' budgets (camfollow/camsteady/camclear).
6. **No keep-out "tilt" release, lock-swing step or over-head step** occurred in T1–T3, nor in SMOOTH-1's combat route
   re-run on this base at 30@60, 30@59.9 and 60 (no keep rule fired; the only single-frame steps were tilts of
   0.011–0.018 rad while the arm came in). The Mill Lane over-head step is in Zeelich, outside this scene: not re-measured,
   not changed.
7. **At 30 the ball is first seen 0.35 m from the hand** when the 60 Hz release step falls on the inner step (pad path):
   that frame shows it one 60 Hz step into a flight identical to 60's (P93's release). Mouse path 0.08 m (the hand's own
   offset). Not changed (P93's throw origin, and consistent with the 60 Hz flight).
8. **Twinsen pops ~20–24 px on the screen** when he steps on or off a 0.25 m kerb in T3 (a step-up in one simulation step;
   the camera's pivot is eased). Before and after, every rate; not a frame-pacing matter.

### 8.4 Changed
- `src/game/actors.js` **MagicBall.preview**: SMOOTH-1's patch (`docs/lba3-performance/SMOOTH-1/aim-preview.diff`) applied
  on top of P93: the dots at even shares of the flight on the exact arc, the touch-down between the last two samples.
- `src/game/actors.js` **MagicBall.aimPoint**: the cursor ray's ground point interpolated between its 0.25 m samples (the
  throw goes where the cursor points instead of up to 0.2 m short of it).
- `src/engine/camera.js` **_chase** (+ `CameraRig.aimHold`, set in `src/main.js` beside `lockOn`): while the ball is held
  and aimed with the mouse cursor (not yet thrown, no lock-on) the Follow camera keeps its heading, as it already does for
  camera-relative controls pushed back; thrown, it comes round behind him as after any turn. Classic, the pad, a lock-on and
  every other moment: unchanged.
- `tests/fps30.mjs`: the arena's enemies taken out at the start. During A–C (~40 s of play) they killed him, so in the full
  run B1 met the game-over screen and D measured a dead hero (walk 0, no jump, no throw): the order dependence of "D fails
  only in the full run". D's reset also clears `dead`. `tests/fps30-feel.mjs` (new); `tests/README.md`.
- Not changed: the limiter, input, the steps, interpolation (none needed), quality, resolution, the camera's damping.

### 8.5 Before / after (Automated runtime only; 3 runs each, ranges where runs differ)

| test, path, rate | what was measured | before | after |
|---|---|---|---|
| T1 keys / pad, 30@60 · 30@59.9 | drawn intervals p50 = p95 = p99 = max (ms); ≥ 45 ms | 33.33 · 33.39; 0 | same |
| T1 keys, 30@60 | camera jumps pos/heading/tilt; heading step p50/max (rad) | 0/0/0; 0.098/0.123 | same |
| T1 keys, cpu (headless rAF) | callback gaps ≥ 45 ms / drawn ≥ 45 ms, 3 runs pooled | 15 / 14 of 364 | 23 / 25 of 344 (machine load) |
| T2 keys, 30@60 | his step against the post, change p95/max px (60: 0.4/3.6) | 1.7/5.2 | same |
| T2 pad, 30@60 | same (60: 0.3/3.0) | 1.4/6.1 | same |
| T3 mouse, 30@60 · 30@59.9 · 60 | aim ring: step max (m); single-frame jumps | 0.049–0.088 · 0.049 · 0.051; 1 | 0.017 · 0.017 · 0.009; 0 |
| T3 mouse, 30@60 | middle dot steps > 0.1 m in one frame (of ~94) | 13 | 7 |
| T3 mouse, 30@60 | camera jumps pos/heading/tilt (§8.3-5) | 4/0/2 | 4/0/2 |
| T3 mouse / pad, 30@60 | first flying frame: ball's gap from the hand (m) (60: 0.08) | 0.08 / 0.35 | 0.08 / 0.35 |
| probe mouse, 30@60 · 30@59.9 · 60 | cursor held still 1 s: his turn (rad/s); middle dot (m/s) | 4.0 · 3.95 · 3.85; 8.3 · 5.1 · 4.3 | 0 · 0 · 0; 0.48 · 0.43 · 0.32 |
| probe mouse, 30@59.9 | middle dot's move per drawn frame after the cursor moved (m) | 0.23, 0.21, 0.16, 0.14, 0.15 … | 1.37, 0.001, 0, 0, 0 |
| probe keys / pad, 30 (60) | drawn frames: press → ball in hand; aim → response; let go → ball leaves | 1; 1; 3 (1; 1; 6) | same |

The ">0.1 m" dot count was chosen after looking at the series (descriptive, not a target). The 7 left are events, not
sampling: the arc's end switching between a lamp post and the ground (2), the charge becoming full (the arc flattens),
stepping on/off the kerb (2), 2 unattributed. The `cpu` rows follow this machine's load (other workers' browsers), not the
build; the synthetic rows are the comparison.

### 8.6 Tests run (this machine; after = this branch)
One browser at a time; after = `b2b590ec` (the T3 mouse pass and its probe re-run on the merge with P95, `846cfb30`:
the same numbers).
- `tests/fps30-feel.mjs`: before and after, all of T1–T3 × keys/mouse and pad × 30@60, 30@59.9, 60, cpu × 3 runs, and
  the probes: table above. Measures only; verdict PASS (no page error) on both.
- `tests/fps30.mjs` whole: 55/56 — the one failure A5 (120 Hz: one 24.8 ms interval at the start of the 30 run, the
  intermittent of §7); `ONLY=A` re-run 10/10. B1 and every D check pass in the full run (before the test fix the full run
  failed B1 and 7 D checks: the dead hero).
- `tests/combat.mjs` 76/78: the two known (dodge at 30/60; "the follow-through blends into the walk", maxJump 0.314),
  KNOWN-FAILING.md.
- `tests/camfollow.mjs` 30/31: the known "full turn on the spot by the wall" (unseen 1 frame, 2.83°), KNOWN-FAILING.md.
- `tests/camclear.mjs` 12/14 + 1 visual: the Hamalayi dead tree and the ch8 hatch wheel not fired, the ch10 north mill
  off screen — identical on the base `6ee0b0b5` (run there: the same three). Not in KNOWN-FAILING.md: for the coordinator.
- `tests/camsteady.mjs` 105/110 (the known five of KNOWN-FAILING.md); the base in the same session 105/111 (the same
  plus a jitter check that varies run to run).
- `tests/chapter3.mjs` (the bank shots: the three pylons by a real throw from their plates, at 60) 48/48.
- `tests/smooth-routes.mjs` combat, synthetic 30@60 / 30@59.9 / 60, base only (diagnosis, §8.3-6).
Not run: the full regression set; anim-combat, timing, depot (P93's), autoquality (P95's).

**What a person should notice** (expected from the measurements, not yet felt on hardware): in Modern with the Follow
camera and the mouse, holding the ball no longer makes the view swing round on its own. The ring stays under the
cursor and the arc's dots glide while he strafes instead of ticking. Running and turning at 30 are unchanged. They were
already even on the synthetic display. Remaining unevenness at a stable 30 would come from presentation, a missed rAF
callback, or the camera arm's 0.25 m steps (§8.3-5).

**Open / risks**: (a) the view-hold is a behaviour change for Modern + Follow + mouse while the ball is out; with the
cursor near the screen's edge he now turns to it and the view stays, so a target behind him needs the ball released or
the view turned first. This is how a cursor aim works in the Free camera, but a person should try it. (b) The camera
arm's 0.25 m steps (§8.3-5) are still there. (c) At 30, when the release falls on the inner step, the ball is first drawn
0.35 m from the hand (§8.3-7). (d) camclear's three failures predate this change and are not filed. (e) P95 (Auto under
the 30 limit) does not interact: these changes add one ground query per aimed frame and run nothing per refresh. The
tests run with Auto off.

### 8.7 The local run (order 62 FPS30-FEEL)
Before = `6ee0b0b5`, after = this branch once merged. Headed Chrome (or the Electron build) on the laptop, nothing else
heavy running, the window in front; Windows `cmd` (PowerShell: `$env:NAME='value'`):
```
set PLAYWRIGHT=C:\…\lba3\tools\testlab\node_modules\playwright\index.mjs
set GAME_URL=http://localhost:8123/
set HEADED=1& set CHANNEL=chrome& set RUNS=3
set RATES=real,30@60,30@59.9& set OUT=out\fps30-feel-after-battery& set LABEL=after on battery
node tests\fps30-feel.mjs > %OUT%.txt
```
`real` = the real loop and the real draw at Frame Rate 30 (the numbers to read: drawn intervals and rAF callbacks, p50 /
p95 / p99 / max / ≥ 45 ms, per test and path); the synthetic rates check the logic on that machine. The same with
`GAME_URL` on the before build's server, then plugged in. Presented frames (the compositor's), which the script cannot
see: a Chrome trace (`chrome://tracing`, categories `benchmark,cc,gpu,viz`) of one T2 and one T3 run, its "Frame" /
presentation events' intervals; or the Frame Rates benchmark's line. At 60: `set RATES=real60& set TESTS=T3`, and
`node tests\chapter3.mjs` for the bank shot (its pylons, chapter 3's core). Then by hand, mouse and pad: Modern + Follow, hold the
ball, cursor beside him: the view should stay put and the ring stay under the cursor (before: it spun round).

#### Real hardware
Not measured yet (order 62). Nothing in §8.1–8.6 is a hardware result.

## 9. GPU-TIMER-KA (22.11): the GPU timer under P96's keep-alive mark, and Auto

**What the desktop measured (P96-HW, branch `smooth-hw`, GTX 1050, plugged in, 57 Hz clock state, Frame Rate 30,
Medium):** the game's GPU timer read p50 16.2–19.6 ms a frame with v122 (the keep-alive mark) against 5.8–8.7 ms with
v121; nvidia-smi's average utilisation did not rise (7 % against 12 %). With the desktop's own diagnosis (an opaque 1 px
change on every rAF callback, drawn ones included) it read 7.5–8.7 ms. At 60 nothing changed (no refresh is skipped, so
there is no mark).

**Read in code (no defect found in the bracketing):**
- `renderer.render()` calls `timer.begin()` just before `composer.render()` and `timer.end()` in its `finally`, in the
  same JavaScript task; the passes only `mark()` inside it. `_keepAlive` runs only on callbacks the limit skips, which
  draw nothing and never touch the timer. So the query cannot be left open across a skipped refresh, and it does not
  include the idle time to the next present on the JavaScript side.
- Auto reads every other measured frame in play (`autoapply.timer()`, stride 2) and P95's PRESENT rule (`classify()`)
  calls a window `late` when the GPU p90 passes 0.85 of a refresh (14.9 ms at 57 Hz) while every interval is on time.

**Mechanism (most likely, not proven):** on Windows, Chrome's WebGL runs on ANGLE/D3D11, where a TIME_ELAPSED query is a
pair of GPU timestamps on the device queue the whole GPU process shares (the compositor included). The reading is the
GPU time between the frame's first and last command, including whatever else the GPU process runs or waits for in
between. With the mark, the compositor produces and presents a frame on every refresh instead of every other one, and
some of that work, or a wait on a present, falls inside the game's query. The diagnosis's reading (an opaque change on
every callback: 7.5–8.7 ms) shows that presenting on every refresh is not enough on its own. Two candidates remain: the
alternation (DOM damage only on skipped refreshes, canvas damage only on drawn ones), or the translucent pixel over the
canvas (which may change how Chrome composites or promotes the canvas). Per-pass medians on the desktop can tell where
the extra time sits. Either way, the reading is not the frame's own work, so it cannot by itself say that a frame is
shown late.

**The risk, reproduced (Automated runtime only):** `tests/autoquality.mjs`'s synthetic GTX 1050 at 30 with +11 ms on
every reading taken after a mark (P96-HW's difference) walks High → Medium → Medium-lean → Low under the P95 code.

**Change:**
- `src/main.js` `_keepAlive` only: `localStorage.lba3_keepalive` is read once: `'0'` gives no mark; `'opaque'` gives an
  opaque near-black pixel (rgb 0/2); anything else is the default mark, unchanged. Each mark increments
  `perf.gpuTimer.kaMarks`.
- `src/engine/perf.js` `GpuTimer`: a measured frame is tagged `ka` when a mark came after the previous render.
  `onFrame(ms, ka)` passes the tag on. `stats()` adds `afterMark` (the share of tagged frames), `p50AfterMark` and
  `p50NoMark`. The F9 overlay gets a GPU line (p50/p95, each pass's p50, the share after a mark).
- `src/engine/autoquality.js` (GPU-TIMER-KA, the header comment beside P95): a window that is on time, `late` by the GPU
  reading alone (CPU p90 within the line), with ≥ half of its GPU samples tagged, is `suspect`. In the evaluation it is
  still pressure, but a step down taken for it is the only one of its kind until P95's revisit judges it. The step is
  kept if the GPU reading fell by ≥ half of what the profiles' cost model predicts (KA_SCALE 0.5), or if the share that
  fell, scaled back by the model, was itself over the line. Otherwise the step comes back and no further GPU step is
  taken that session. In hold, a suspect window is not a sustained problem. The title calibration sets tagged readings
  aside (the GPU name's guess stands; the CPU side may still lower it) and skips its no-timer rule. Nothing else
  changes: CPU-late windows, windows with missed intervals, and untagged readings (no limit, or `lba3_keepalive = '0'`)
  are judged as before. The P95 decision table in `tests/autoquality.mjs` (20 rows, untagged) is identical before and
  after.
- `src/engine/autoapply.js`: passes the tag on. Its report prints the tagged share and the suspect state of the last
  window, and "set aside" for the calibration.

**Tests (Automated runtime only; SwiftShader, synthetic machines and a synthetic 60 Hz display, no GPU number):**
- `tests/autoquality.mjs` 73/73 PASS (seed 11 and seeds 3, 5, 23, 41 for the new checks). New checks: classify (tagged
  18 ms at 30 in a 57 Hz clock is suspect; untagged stays P95's late GPU; CPU-late is never suspect); evaluate (one
  suspect step, then it waits); judgeStep (18 → 17.6 ms brings High back); hold (tagged: held; untagged: one step as
  before); calibration (set aside). The GPU-TIMER-KA table at 30:
  - GTX 1050-like, +11 ms: plugged in Low → High (one step down at 4 s, back at 73 s); on battery Low → Medium (the
    same, back).
  - fast GPU, +11 ms: Medium → High (back).
  - UHD 620-like (light CPU), readings tagged but not inflated (+0): still steps down to Low, with frames shown late
    3–6 %, as before.
  - **Limitation:** a UHD 620 whose reading is also inflated by the mark (+11 ms on top of a real 15–19 ms) is a close
    call. By seed, it reaches Medium-lean/Low, or comes back to Medium with ~16 % of frames shown late. It is printed,
    not checked: nobody has measured whether the UHD's reading grows with the mark (order 65, step 4).
- `tests/keepalive.mjs` (new) 6/6 PASS: GpuTimer's tag (stand-in WebGL context); at 30 on a synthetic 60 Hz display the
  default mark exists and changes, with 115–118 marks over 120 skipped refreshes counted on the timer. `'0'` gives no
  mark and `'opaque'` gives rgb(0/2). SwiftShader here offers the timer query, but no result came back under the
  synthetic display (7 pending), so a real reading with the tag is not exercised in the browser.
- `tests/fps30.mjs` ONLY=AB 13/13 PASS. `tests/autoquality-game.mjs` 28/29: the one FAIL is unrelated and was already
  there. The Settings hint check expects "55–60 fps", but `set_h_q_auto` (`src/game/text/common.js`) says "to hold {f} fps";
  this change touches no text.

**Not known / needs the desktop (order 65 GPU-TIMER-KA):** whether the extra time sits in one pass; whether `'opaque'`
alone gives a normal reading (if so, the default can become opaque, and the timer and Auto no longer need the guard);
what Auto settles at in the street at 30 with the mark on and off; whether the UHD 620's reading grows with the mark.
A suspect step down that comes back is still one visible change at a scene change during a first evaluation at 30.

#### Real hardware
Not measured yet (order 65).
