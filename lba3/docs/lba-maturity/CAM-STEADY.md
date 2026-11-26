# CAM-STEADY: why the play camera reverses, and what was done (camsteady's long-standing failures)

Found by the coordinator 16.11: `tests/camsteady.mjs` failed the same checks on the published v92 and on the tip (not a
regression). Base: `ccr-c1c2c4b9-dep6ed` (67797481). Owner: the camera (`src/engine/camera.js`, `tests/lib/camrec.js`).
Status of everything below: **Automated runtime only** — SwiftShader in headless Chromium on a shared, loaded
machine, routes walked by the input bot (`tests/lib/player.js`), Classic controls unless named. No GPU, no frame-rate
claim, no human playtest. Smoothness is judged from per-frame camera traces (where the camera stands and looks, every
frame), never from the still pictures.

Unchanged on purpose: the default framing (arm, height and tilt of Near / Medium / Far, the FOV), the camera modes and
their defaults, the LBA view and the free orbit (not touched), controls and aim mapping, saves.

## How it was measured
- `tests/camsteady.mjs` (all three cameras, ten routes, Follow at Far plus the two street routes at Medium).
- To find causes, a scratch copy of the test recorded every frame (the shipped recorder keeps every second one) with
  the Follow rig's own state: the arm and the arm it wants, the lift, how far over his head (`overK`), the swing and its
  goal, the door rule. Every reversal of the camera's height (≥ 5 cm), tilt and heading (≥ 0.5°) was listed with
  what moved the camera that frame.
- **The routes are not repeatable run to run.** The same build gave different results: the harbour pier passed in one
  baseline run and failed in the next (11.4 vs 15.9 reversals a minute), the Medium street's height jitter read 9, 6
  and 2 on three runs of one build, and in some runs the bot stood stuck against a passer-by for 10 s on the street.
  Under Modern controls the bot steers by the view, so any camera change changes the route itself. A single run is a
  sample; the numbers below are from several.

## Causes found (with the trace evidence) and what was changed

1. **The arm's in-cut went in, stopped, went in (height bob, Modern street and town routes).** The arm length the
   Follow camera wants along a house reads differently frame to frame (5.6, 10.0, 7.5, 6.9 m within 0.2 s). The in-cut
   eases in at up to 25 m/s and stops in one frame whenever the wanted arm is momentarily longer; with the ground's lift
   rising at the same time the camera's height went up, down, up within 0.1-0.3 s. At Far, an arm drawn in also lowers
   the camera (0.2 m per metre), which Medium's tilt nearly cancels — the reason Far bobbed more.
   **Fix:** the arm comes in toward the least arm wanted over the last 0.25 s (`CH_IN_KEEP`): one smooth move in. The
   let-out is unchanged (it already waits 0.6 s), so nothing stays in longer than before by more than that 0.25 s; a
   reading already gone takes it no shorter than MIN-VIEW (3.2 m) — by the fort's south-west tower a one-frame 2 m
   reading otherwise drew it in to 2.1 m.

2. **Over-his-head, in and out (height bob near house walls, Medium street, door route).**
   - The "risen longer arm" (KEYWALK's 6.5 m over a wall) and the low arm took turns when the low arm read 4.4 / 4.5 m
     around the 4.5 m bar: up over his head and back down within 0.6 s. **Fix:** held on the risen arm, the low one
     takes over only 1 m past the bar (`CH_HIGH_HYST`).
   - Leaving over-his-head, the arm under it was the short one it had held beneath (3.2 m), so the camera first came in
     and down and then let out and up. **Fix:** leaving, the arm starts from the length shown. From a longer low arm
     into the risen arm (and back), tilt and arm move together instead of tilt first (it rose a metre and dropped back
     within 0.3 s).
   - Tried and withdrawn: a slower way out of over-his-head (0.5 s) and no let-out of the arm under it meanwhile. They
     cut the height jitter on the door routes further, but `tests/camcitadel.mjs` (the user's keyboard walks on Medium)
     showed the arm under 5 m for 3.1-4.4 s on six walks and at 2.1 m by the south-west tower: the slower exit let the
     arm's own in-cut run on under a steep tilt. The "zoom onto his back" is the user's own complaint, so it lost.
   - Turning on the spot by a house, the least tilt over his head that sees him changed with the heading for a frame or
     two (0.88 / 1.0 rad), bobbing the camera by inches. **Fix:** while turning, a lower tilt waits 0.5 s and a higher
     one 0.15 s unless he is out of sight from where the camera stands (`CH_OVER_Q_HOLD`, `CH_OVER_Q_UP`).

3. **Out of Twinsen's door (the view 46° for 3.3 s, then a 60° swing while he stood).** Out of the house he faces away
   from it, so behind him is over its roof: the door rule (CAM-DOORS) holds the camera at his back on the risen arm,
   6.5 m at ~50-57°, and the view's tilt cap (46°) held it at 46°. After 1.2 s standing the door rule let go because
   the camera was "over his head", and the clear-view search swung it 60° round him while he stood still (turned 45°,
   moved 5.3 m after he had stood a second).
   **Fix:** the door rule lets go while he stands only when the view is pressed against what is behind him (over his
   head at MIN-VIEW's 3.2 m or on the steeper over-his-head arms — the spaceport hull case it was written for, and a
   test's placement against the fort's south-west tower), not on the risen arm over a house's roof (6.5 m, ≤ 1.12 rad);
   and held at his back just out of a door the view looks down no steeper than 43.5° (`CH_EL_MAX_DOOR`; his chest is
   still kept CH_EL_KEEP_DOOR inside the frame's foot, which wins where it needs more). The door's quick trail-out
   waits 0.25 s and does not run while he turns on the spot (it went out and straight back in).

4. **Swings out and straight back (heading reversals over his own: door route, pier, Modern street).** CAM-CLEAR-2's
   clear-view swing, when taken while he walked, was let back at once whatever the chase was doing, and went out while
   the chase still turned the other way (≤ 0.5 rad/s counted as settled): walking round the corner by Twinsen's house
   the view swung 50° one way while the chase turned him the other, and back 1 s later.
   **Fixes:** a walk's swing comes back while the chase turns the same way, once the chase has stood still 0.3 s, or
   after 1 s at most (`CH_BACK_WAIT`); it goes out against the chase's turn only once that is under 0.2 rad/s
   (`CH_WALK_OUT_V`); walking on ahead, away from what blocks his back, it does not look round when his back is clear at
   the whole arm 0.5 s or 1 s further along his walk (`_walkClears`, `CH_WALK_SEE`); a new swing the same way and less
   than 15° short of the one under way keeps it (`CH_SW_PART`, it turned the view back 8° for nothing); stepping back
   toward the view, MIN-VIEW's quick look round waits as long as any other (0.5 s); walking into a turn whose heading
   still gives 4.5 m of arm that sees him, no immediate look round (Modern's 45° stick steps).

5. **The LBA view through a door (tilt and height 9.6 reversals a minute): a measurement artefact.** The recorder
   joined the frames of all scenes into one series, so going from Citadel's view into the room's fixed iso view (40 m
   higher, 1 km east) and back out counted as two reversals each of tilt and height. The LBA view itself reversed once
   on the whole route. **Fix (test):** `tests/lib/camrec.js` counts reversals and jitter within each scene (the series
   is split where a door, a load or a state change already cut it; the first second after a cut was already left out).
   The LBA view's code is unchanged. This also lowers the Follow door routes' counts a little (the cut is no longer a
   reversal); the hero's own reversals are counted the same way, so the "turns only as he turns" comparison is fair.
   *Partner/coordinator review requested for this test change.*

## Numbers, before → after (camsteady, Follow at Far unless named)
Before: the base build (`lba3/captures/cam-steady/camsteady-before.log`, per-route stats `routes-before.json`). After:
the final build, the full test in the regression chain (`camsteady-after.log`). Earlier full runs of intermediate
builds are in the notes below the table. Budget in brackets.

| Check | before | after |
|---|---|---|
| LBA · door in and out: tilt / height reversals a minute (≤ 8) | 9.6 / 9.6 FAIL | 3.1 / 3.1 PASS (measure fix only; LBA code untouched) |
| Follow · street and square: jitter tilt, height (≤ 3) | 0, 2 PASS (the coordinator's run: FAIL) | 0, 2 PASS |
| Follow Medium · street and square: jitter (≤ 3) | 1, 9 FAIL | 0, 1 PASS |
| Follow · along house walls: jitter (≤ 3) | 0, 2 PASS (the coordinator's run: 8, FAIL) | 0, 3 PASS |
| Follow · door in and out: heading reversals vs his own (≤ his + 1 a minute) | 15.4 vs 9.2 FAIL | 6.2 vs 6.2 PASS |
| Follow · door in and out: jitter (≤ 3) | 0, 4 FAIL | 0, 2 PASS |
| Follow · out of the house door: first view out, time steeper than 45° (≤ 1.5 s) | 46.0°, 3.27 s FAIL | 45.1°, 1.32 s PASS |
| Follow · out of the house door: still once he has stood a second (≤ 3°, ≤ 1 m) | 45.25°, 5.29 m FAIL | 0°, 0.01 m PASS |
| Follow · out of the house door: jitter (≤ 3) | 1, 3 PASS | 1, 3 PASS |
| Follow · harbour pier: heading reversals vs his own | 11.4 vs 11.4 PASS (next run, same build: 15.9 vs 8.8 FAIL) | 12.1 vs 8.6 FAIL |
| Follow · street, Modern: heading reversals vs his own | 109.7 vs 106.2 FAIL | 105.1 vs 103.4 FAIL |
| Follow · street, Modern: jitter (≤ 3) | 0, 7 FAIL | 0, 3 PASS |
| Follow Medium · street, Modern: heading reversals vs his own | 102.5 vs 100.8 FAIL | 105.0 vs 103.3 FAIL |
| Follow Medium · street, Modern: jitter (≤ 3) | 0, 6 FAIL | 0, 3 PASS |
| Free · street, Modern: max acceleration (≤ 1600 m/s²) | 1749.1 FAIL | 1753.5 FAIL (free orbit not touched) |

Failed checks: 11 before (this machine; the coordinator saw 12, with the wall route and the Medium street's idle
check among them) → 4 after: the free orbit's pre-existing jolt and three Follow heading checks that miss by 1-2
reversals. Summed over the eleven Follow routes: height jitter 36 → 19, heading reversals beyond his own 8.1 → 6.0.

Notes on the spread: four full runs of intermediate builds of this work gave 4-6 failed checks; one of them failed the
wall route (jitter 6) and one the far street (jitter 4-5) that passed in the final run, and the Medium Modern
heading check passed in one (84.7 vs 88.2). Treat any one route's pass or fail as a sample.

## What is left, and why
- **Pier and Modern street, heading reversals 1-2 over his own** (budget: his own + 1 a minute; a 34 s route allows
  about half a reversal more). Pier: he turns round at the pier's end, takes a step back and stands a moment before
  walking back: the clear-view search, which by design looks round when his back stays blocked while he stands, swings
  50° and the swing comes back as he walks on — one swing out and back is two reversals. Modern: the bot changes its
  45° key steps several times a second (his own heading reverses 100 times a minute); the 1-2 extra are small swings
  released while he walks straight. Removing those swings outright would undo CAM-CLEAR-2 / CAM-WALKSWING behaviour
  (looking round a blocked back), which is a design decision for the coordinator, not a smoothing fix.
- **Out of the house door, height jitter: passes at the budget's edge (3 of 3 in the final run, 4 in some
  intermediate runs).** At the end of that route he turns on the spot with his back to the house: the arm is cut in,
  the "never inside anything" step lifts it over his head on the 6.5 m risen arm, and as the turn goes on only
  MIN-VIEW's 3.2 m stays clear — up 1.3 m and down again within 0.25 s. These are the safety steps (the camera never
  stands in the house); smoothing them would let the camera stand in the roof for a few frames.
- **Free orbit, Modern street: one frame at ~1750 m/s²** (1749.1 before, 1753.5 after; the free orbit's code is
  untouched — its target height follows a sudden change of the ground under him, 0.5 m in one frame). Not in the
  coordinator's list, not the user's camera; left.
- Run-to-run variation (above) means any single run can show one of these routes flip either way.

## Pictures and traces (for the eye; not judged automatically)
`lba3/captures/cam-steady/`: `before-door-strip.jpg` / `after-door-strip.jpg` (out of Twinsen's door: the first frame
out, 0.7 s, 1.5 s, then walking off). Before: the view sits at 46° over the roof, and by the fourth frame it has swung
60° round and looks at the house from its side, him small at the right. After: 43.5° behind his back for the three
standing frames (identical framing, nothing moves), then 9.5 m behind him at 30° as he walks off, the corner of the
house he left at the right edge of the frame. `before-street-strip.jpg` / `after-street-strip.jpg`: four moments of the
west street, the same full-arm framing (10.75 m, 28.5°) before and after — the default framing is unchanged. (Seen in
both, not part of this task: at the street route's start pose a green bush mound fills the lower middle of the frame.)
Made by `tests/camsteady-strip.mjs` (Far, Classic). Per-route stats before: `routes-before.json`; after: the MEASURE lines of `camsteady-after.log`.

## Commands
- Snapshot served from `/dev/shm/t991` (`python3 -m http.server 8991`), `GAME_URL=http://localhost:8991/
  BOOT_TIMEOUT=900000 TMPDIR=/dev/shm node tests/camsteady.mjs` (add `RECORD=<dir> TAG=<name>` for the JSON).
- `SHOTS=<dir> TAG=before|after DIST=far node tests/camsteady-strip.mjs`.

## Regression runs (final build 9b751699, Automated runtime only)
(The commit after it changes only comments in camera.js and adds this report and the pictures.) One browser at a time on the shared machine; each test once (a timeout would have been retried once: none was needed).
"base" = the same test on the base build's camera, run here only where the final build failed.

| Test | final build | base |
|---|---|---|
| camsteady | 107 passed, 4 failed (above) | 11 failed |
| camcitadel (Follow, Medium, keyboard walks, 61 checks) | PASS 61/61 (an intermediate build failed 6: see cause 2) | PASS 61/61 |
| camfollow | PASS 31/31 (an intermediate build failed 1: the walk-away let-out 2.91 m/s > 2.6) | — |
| camera-doors | PASS 4/4 | — |
| camclear | PASS 14/14 | — |
| camisles | PASS 15/15 | — |
| camcover | 11 passed, 1 failed (2 of 16 seeded tree spots) | 1 failed (1 of 16) |
| occluders | PASS (1 functional, 34 visual) | — |
| door-sweep | PASS 5/5 | — |
| controls | FAIL 3 of 92: "camera … smooth — no lurch" (acceleration p95 12.5, 14.3, 12.8 > 12) | known failing (KNOWN-FAILING.md: the same three, p95 12.5-14.3): the LBA view's, whose code is untouched here |
| menus | PASS 39/39 | — |
| chapter1 | PASS 32/32 | — |
| opening-tutorial | PASS 40/40 | — |
| spaceport-2 | PASS 21/21 | — |

camcover, the one difference: at the seeded spots the test places him beside a round tree's crown (a placement, as a
door or a load does) and leaves him standing 1.5 s; the check is that the camera never reads him as seen while the
drawn crown hides him. The base fails it at one spot ((-40.1, 2.3, 71.1)); the final build at that one and at
(-158.4, 9.8, -24.5). There the camera's sight test reads the line as clear because the drawn crown reaches 0.3 m past
the crown's sight cylinder (a model mismatch, the same as at the base's spot); the base swung away from that view at
1.2 s (the door rule let go over his head), the final build keeps the view at his back on the risen arm after a
placement, as it now does out of a door (cause 3). Fixing the sight test's crown size is outside this task (it is
world/art data); flagged for the coordinator.

## Risks and review
- Partner / coordinator review requested: the test change in `tests/lib/camrec.js` (reversals within a scene); the
  door rule's new hold on the risen arm (camcover's extra spot; any door whose outside view over the roof is poor would
  now be held while he stands, until he walks 3 m — the walk itself lets it go as before).
- The Follow camera's rules interact; each change was checked on camsteady, camcitadel and camfollow, but other
  places (Zeelich, the isles' docks, the Hamalayi) were covered only by camisles, camera-doors, camcover and the story
  suites listed above.
- No frame-rate claim; no human play; smoothness judged from per-frame traces, not from the pictures.

## Checkpoint
Commits on the worktree branch: 59f715ff (first pass), 9b751699 (camcitadel-safe version), and the commit carrying
this report. Next action if picked up: the two heading checks (pier, Modern) need a design decision — whether the
clear-view swing may be taken at all once he starts walking away — not more smoothing; the camcover spot needs the
round crowns' sight radius matched to the drawn crown.
