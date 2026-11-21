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

---

## 8. Real hardware — FPS30-FEEL (order 62), "before" · the desktop, 21.11 evening

**Where:** the GTX 1050 Acer (the Intel UHD 630 drives the panel; Windows reports it at 60 Hz, and rAF ran at 16.7 ms
throughout, on battery too). **The desktop app's Electron 43.7.9 (Chrome 150)**, the packaged build (`desktop/`,
`copy-game.mjs`) of **`a333b00d`** = `ccr-c1c2c4b9-dep6ed` before P94, version 0.49.0, a fresh profile. The game's
canvas on the **NVIDIA GTX 1050 (D3D11)**, GPU timer yes. Citadel street (fixture `new-11-town`), loaded and played
past its first seconds. Follow, Medium (no Auto), world resolution 100 %, devicePixelRatio 1.25, window 1368×770 (the
nearest the app's window gives to 1366×768 at 1.25). Same save and settings for every run. **On battery first**
(97 → 83 %), then **plugged in** (83 → 85 %). OS power and GPU settings untouched.

**Method** (`fps30-feel/fps30feel.mjs`, Playwright `_electron`; inputs on game time through `tests/lib/smoothrec.js` as
SMOOTH-1 does; one warm-up pass, then 3 recorded runs):
- **T1 pan:** standing still, Classic Right held 5 s, so the Follow camera sweeps round at a constant speed past the
  street's house fronts. (The Follow camera takes no turn keys of its own: `camera.js` consumes them outside the free
  orbit, so the sweep comes from his turn on the spot.)
- **T2 run–stop–reverse:** Modern controls, Up 2.5 s along the street, 1 s still, Down 2.5 s back, 1 s still; camera untouched.
- **T3 aim:** Modern controls, a mite placed on the street 7 m ahead as the small target (no bell in view there): lock
  on, strafe right round it 1.4 s, lock off, turn (Left, then Up), lock again, charge the ball 1 s (F held), release,
  1.6 s of the throw.
- **What each number measured:**
  - **rAF:** every requestAnimationFrame callback's timestamp (the browser's frame clock);
  - **drawn:** the game's drawn frames (smoothrec's record of each `renderer.render`: its rAF time);
  - **images shown:** for each drawn frame, the first frame Chrome reports as presented (CDP trace, `PipelineReporter`
    PRESENTED_ALL/PARTIAL) whose begin time is at or after that drawn frame's — the interval between new game images
    reaching the screen. A dropped frame shows in the next presented one;
  - **GPU:** the game's timer query, every frame;
  - **CPU work:** the game's simulation + render submission per drawn frame;
  - **motion spikes:** smoothrec's measure — the speed of the camera position and of the view direction, against
    their two neighbours' mean, more than 1.5× either way while moving.
- No `PresentationFeedback` or swap timestamps: the trace's presented frames are the platform's timing used here.

| Test · power · limit | rAF p50 / p95 / max (ms) | drawn p50 / p95 / p99 / max | **images shown** p50 / p95 / p99 / max | shown ≥ 45 ms (3 runs) | shown < 25 ms | GPU p50 / p95 | CPU work p50 / p95 | motion spikes cam · view (per run) |
|---|---|---|---|---|---|---|---|---|
| T1 pan · battery · 30 | 16.7 / 16.8–16.9 / 33.3–33.4 | 33.3 / 33.5 / 33.5–33.6 / 33.5–33.7 | 33.3 / 33.4 / 33.5 / 33.5–33.7 | 0 | 2 | 13.7–14.2 / 18.6–19.9 | 14.9–15.1 / 20–20.4 | 0·0, 0·0, 0·0 of ~163·162 |
| T2 run–stop–reverse · battery · 30 | 16.7 / 16.8 / 33.4 | 33.3 / 33.5 / 33.5 / 33.6–33.7 | 33.3 / 33.4 / 33.4–33.5 / 33.5–33.7 | 0 | 2 | 14.5–15.1 / 17.7–18.3 | 14.9–15.6 / 17.6–18.3 | 0·0, 0·0, 0·0 of ~153·0 |
| T3 aim · battery · 30 | 16.7 / 16.8 / 17–50 | 33.3 / 33.5 / 33.5–33.6 / 33.5–50 | 33.3 / 33.4 / 33.5 / 33.5–50 | 1 | 3 | 13.2–14.9 / 17.6–19.2 | 15.8–16.8 / 21.1–21.8 | 7·4, 12·7, 4·6 of ~191·185 |
| T1 pan · plugged in · 30 | 16.7 / 16.8–16.9 / 16.9–17 | 33.3 / 33.5 / 33.5 / 33.5–33.6 | 33.3 / 33.5 / 33.5 / 33.5–33.6 | 0 | 0 | 11.3–11.6 / 14.4–15.5 | 7.1–7.2 / 9.1–9.4 | 0·0, 0·0, 0·0 of ~163·162 |
| T2 run–stop–reverse · plugged in · 30 | 16.7 / 16.9 / 16.9–17 | 33.3 / 33.5 / 33.5–33.6 / 33.5–33.6 | 33.3 / 33.5 / 33.5 / 33.5–33.6 | 0 | 0 | 12.3–12.5 / 13.7–13.9 | 7.2–7.4 / 8.3–8.8 | 0·0, 0·0, 0·0 of ~153·0 |
| T3 aim · plugged in · 30 | 16.7 / 16.8–16.9 / 16.9–17 | 33.3 / 33.5 / 33.5–33.6 / 33.5–33.6 | 33.3 / 33.5 / 33.5 / 33.5 | 0 | 2 | 10.9–12.3 / 13.6–15 | 7.5–7.6 / 10–11.6 | 14·11, 8·7, 13·7 of ~177·141 |
| T3 aim · battery · 60 | 16.7 / 16.8 / 33.3–33.4 | 16.7 / 16.8 / 16.9–17 / 33.3–33.4 | 16.7 / 16.8 / 16.9 / 33.3–33.4 | 0 | – (every interval is one refresh at 60) | 14.6–15 / 18–18.4 | 12.9–13.8 / 17.3–18.4 | 5·6, 6·2, 7·2 of ~391·325 |
| T3 aim · plugged in · 60 | 16.7 / 16.8 / 16.9 | 16.7 / 16.8 / 16.9 / 16.9 | 16.7 / 16.8 / 16.8 / 16.8–16.9 | 0 | – | 13.1–13.8 / 15.8–16.1 | 6.3–7.1 / 8.5–9 | 12·11, 8·7, 6·8 of ~383·331 |

(ranges over the 3 runs; at 30, `shown < 25 ms` is at most one per run, at the recording's first frame, where the trace window starts —
an edge of the measurement, not a frame shown early: the drawn intervals there are even.)

**The answer, before P94:**
- **At 30 the delivery holds on this machine, battery and plugged in:** one new image every 2 refreshes (33.3 ms p50,
  p99 33.5), the drawn frames at 33.3 ms, each shown in its own frame. In 18 runs (T1–T3, both power states) one
  interval of 50 ms: T3, battery, run 1, a drawn frame late by one refresh during the strafe. No interval ≥ 45 ms
  plugged in.
- **T1 and T2 move evenly:** 0 camera and 0 view spikes. T2's 0 of 153 for Twinsen and the camera.
- **T3 is where it is not even, at a stable frame time:** 4–14 camera-position and 4–11 view-direction spikes in
  ~190 / ~150 moving frames at 30, and 5–12 · 2–11 at 60. Same at 60, same plugged in, so it is the lock-on
  camera's motion, not pacing. This is what the user feels while aiming — P94's ground.
- **On battery the frame is still within budget, but nearer:**
  - CPU work doubles (15–17 ms p50 against 7–7.6 ms plugged in; the CPU slowed on battery, as in FPS30-PRESENT);
  - the GPU rises 11–12.5 → 13–15 ms p50.
  - At 30 both stay under 33 ms; at 60 on battery CPU p95 reaches 17–18 ms, and T3 at 60 showed images at 16.7 (p99 16.9) with one 33.3 ms interval (a missed refresh) per battery run, none plugged in.
- The panel did not drop below 60 Hz during these runs (the 40–48 Hz seen in GTX1050-BATTERY did not recur).

**Not done (this round):**
- the 60 FPS capture of T2 and T3 (a phone filming the screen): the desktop agent cannot film; the user can, or it
  waits for "after";
- the mouse and a controller for T3: the runs are scripted on the keyboard;
- the bank-shot puzzle at 60 (Off the Wall): to run with the "after", when P94's release change is in;
- Chrome: the packaged build built, so Electron was used as the order asks.

**Caution for anyone measuring the desktop app by script:** an Electron window that is not focused puts the game in
its background mode (BG_FPS 8: `main.js` setBackground) and the first trial here read 24 ms rAF and 480 ms gaps. The
runner keeps the window always on top and focused; a run whose game went to the background would be marked.

**After:** when the coordinator writes "P94 merged" in WORLD_ART_REQUESTS.md, the same runner on the merge, both
power states, plus the bank shot at 60; the result goes into this section next to these rows.
