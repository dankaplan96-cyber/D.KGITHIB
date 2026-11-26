# Known failing checks (F-13, A-13)

(21.11, TEST-DEBT: `slidetraps` and `camclear` rows added; what it fixed is under "Fixed by TEST-DEBT".)
(22.11, CAM-HANDBACK / CAM-EASE, the camera pass: `camfollow` and `camclear` rows fixed and moved to "Fixed by the camera pass"; `camsteady` and `controls` rows annotated.)
(22.11, FIX-PASS 2: `chapter1`'s orchard throw made stable (fixed spots; 3 of 3 runs 33/33); `jumpreach` fixed (the old mill's stair-stones 27° apart: 4/4); chapters 9 and 10 set the Zeelich dock's ferry by U-1's rule as chapter 2 does (`council.js`, `network.js`; travel 27/27); the Citadel station's lane sign under the main's bridge has a camera volume (Follow: 5 → 0 hidden spots of 25; the Fixed view's spots by the bridge's pipe and trestle left, below).)
(22.11, FIX-PASS: `worldfit`, `weather`, `prologue`, `interior-life`, `travel` fixed (rows struck through below). P58's barrel nook at the Citadel station: the barrels fill it (`island.js`; by input, the Fixed view's longest hidden run 3.77 → 0.87 s). P5/P10's reservoir branch: already seated by `b763ead1` (12.11), buried 1.6 m under the climb and its landing; checked again (the pipe's drawn segments: none over the landing, it leaves the ground west of it at x −42).)
(22.11, CAM-FIXTOP: the Fixed view's spots by the station's bridge mostly fixed (below); FACE-3's waist line for props (the intermittent `face-3` sign, 2/2 after).)
(22.11, FIX-PASS 3: the FULL-TEST-22-11 intermittents — `prologue` (the test: spots 1.5 m off the rope's foot, back down if shoved out), `exp-ballastra` (the game: a popped bonus no longer drifts over water or a drop; Ferro's kashes fell into the lift chamber 1 time in 8), `autoquality-game` section 7 (the harness: `open`'s navigation follows `BOOT_TIMEOUT`), `arrival-steps` (the long units it found cut into steps; still load-bound).)
(22.11, CAM-FIX, the camera fix pass: `camsteady` and `controls` fixed and moved to "Fixed by the camera fix pass"; P58's SE tower corner fixed.)
(22.11, camera night: CAM-SIGNPOST — the talk shot counts the merged signposts' boards (the yard's LIGHTHOUSE arrow; FACE-2.md) —; CAM-EASE-ROUND — the keep-rule entries, under "Keep-rule entries" below. Open, not the camera's: `camfollow`'s "Medium for a new player" check is stale since P100 (Far by default); `camsteady`'s default order fails follow · harbour pier's heading reversals (12/min > 8.6) on the build before the camera night too.)
(23.11, FULL-TEST-23-11 on v147, Automated runtime only (SwiftShader): none of the rows below recurred (controls 92/92, camsteady 110/110 in both orders, jumpreach 4/4, prologue 29/29, arrival-steps 12/12, face-3 6/6 twice, exp-ballastra 33/33, autoquality-game 29/29 with sections 7–8). Fixed (`b62399d7`): `worldfit`'s z-fighting at the promenade's south-west corner (FLAT-TOWN) and `camclear`'s camera at the water main's slant (C66), under "Fixed by FULL-TEST 23.11" below. Test updates (b): `campaign-thread` C8 and O4 follow PUZZLES phase 2. New open row: `worldfit`'s shop sill (FLAT-TOWN), below. `camsteady`'s default order: on v147 itself single checks vary run to run (FULL-TEST-23-11 §2.3).)

Updated 17.11.2026 by AUDIT-FIX (RELEASE-AUDIT-v96 A-13) from the audit's suite table (section 7, run on v96 =
`39d1a538`) and AUDIT-FIX's own reruns on its branch (base `20b5da55`, the coordinator's `ccr-c1c2c4b9-dep6ed` with
A-1, A-2, A-12 fixed). Automated runtime only: headless Chromium on SwiftShader, one suite at a time, a machine shared
with another worker's runs. The list of 11.11 (written on `worktree-agent-af2778661f537031f`) is replaced; what it fixed
stays fixed (purposes 23/23, townlife 64/64, longsession, jetpack, spaceport pass on v96).

Logs: the audit's `/dev/shm/t986-audit/suite/log-<suite>.txt`; AUDIT-FIX's `/dev/shm/t983-logs/<tag>-<suite>.txt`
(tmpfs: gone at the next restart; the numbers are copied here and in `AUDIT-FIX-v96.md`).

## Failing, with cause and owner

| Suite | Result | The failing checks | Cause | Owner |
|---|---|---|---|---|
| ~~`worldfit`~~ **fixed 22.11 (FIX-PASS)** | 8/8 visual now | the openings (5) | The game. The neighbours' window 0.65 m at −1.65 (its open shutter lay on the carved door's surround; `town.js`); Zeelich's windows keep clear of the corner piers (house 3's back window 8.5 cm into the chamfer's pier; `zeelich.js` addWin); the Zeelich door's stone lintel 0.1 m past each alfiz post, not 0.15 (it ran 5 cm into the lantern). Pictures looked at. Automated runtime only | — |
| ~~`weather`~~ **fixed 22.11 (FIX-PASS)** | 23/23 now | Zeelich's pink-violet at phase 0.79 | The game. Zeelich's golden-hour fog `#f6c8b4` (peach, blue under green) → `#f6c2c6` (a warm rose, red the same, blue over green): about r 0.82, g 0.62, b 0.66 (`weather.js` Z_LIGHT). Automated runtime only | — |
| ~~`prologue`~~ **fixed 22.11 (FIX-PASS)** | PASS now | the well's mites [4, 4, null] | The test, as listed: its spots round each mite could fall on the rope's foot (the well's exit, r 0.7) and take him up and out. Spots keep 0.6 m clear of the room's exits; a departure is recorded in the result. Automated runtime only | — |
| ~~`interior-life`~~ **fixed 22.11 (FIX-PASS)** | 144/144 now | Velo at his till (and, on the first rerun here, Tavi at the café shelf in the evacuation, 24 s facing away) | The game, mostly. (1) A hop under 1.5 m along the same work (Velo till ↔ printer, 0.8 m) turns back to the work at once, and the last step onto the slot is a sidestep facing it: side-on 1.4 s after each hop → one 0.25 s sample. (2) `arrivedElsewhere` (a stop given up) kept the last stop's heading: it faces the stop's way now (`walkers.js`). The test: a step up to the thing or back to the slot counts as walking for facing. Automated runtime only | — |
| ~~`travel`~~ **fixed 22.11 (FIX-PASS)** | 27/27 now | chapter 2 → 3: the sky-ferry at Zeelich's dock | The game. The check already wanted U-1's laid-up ferry (`p2b.ferry === true`); `chapter2.js` hid it on the arrival and in its applyFlags (a load showed it again: `ferry.js` runs last). Both now follow U-1's rule (`story.ferry.open`). Automated runtime only | — |
| `worldfit` | 7/8 visual | (1) "door sill under the ground": `house shop` (Pippa's) by 0.24 m at (−33.75, −1.5) | The game, FLAT-TOWN (v142; v141 passes): the square's platform at +0.42 and its two 0.21 m steps now begin at the shop's doorstep, the shop rose 0.10 m (floor 2.43, the ground 0.5–1 m out 2.55–2.67, the platform 2.72). Any fix is a visible world change (the shop onto the platform's level, a landing in the steps, or the ring kept off its front): for the user. Pictures `tests/out/ft4/pics/{v141,fixed}-shop-door-front.png` (not kept). Automated runtime only | the user / the next world task |
| `camsteady` (default order) | 110/110 – 110/112 run to run on v147 itself | follow (medium) · street and square "still behind him once he has stood" (6.96° > 3); follow · street, Modern "turns only as he turns" (100.9 > 99.2/min); follow · harbour pier heading reversals (12.2 > 8.7/min, the camera night's note at the top) | The order's spread: Modern controls follow the camera and the bot's route changes with it; v147 unchanged gave 110/110, 110/110 and 110/112 (FULL-TEST-23-11 §2.3). `MODES=follow,lba,free` passed every time | — |
| ~~`slidetraps`~~ **fixed 22.11 (v126)** | 5/5 now | the harbour strip (−91.67, 44.22) | OVERLAP-3 moved the south bollard runs to the brink (z 43.0); HARBOUR-BRINK levelled the ground under the paving in `world.js` (no grid point inside a built wall face lowered, the bank sunk to meet the sea 0.1 m past it) and gave the five platform wall runs a walkable top in `island.js`; the scan spot is sea now. Automated runtime only | — |

## Fixed by FULL-TEST 23.11 (`b62399d7`)

Automated runtime only (headless Chromium, SwiftShader, one suite at a time; base v147 `64c5a6cf`). A/B with HEAD's tests
against `git archive` copies of older builds (FULL-TEST-23-11 §2).

| Suite | Before | After | Cause, and the fix |
|---|---|---|---|
| `worldfit` | 6/8 visual: (3) z-fighting, 10 judged clusters (0.18–2.72 m²) at (−76, 19.7) | (3) PASS (Citadel's listed z-fights back to v141's 25, none judged); (1) the shop sill stays (above) | The game, FLAT-TOWN (v142; v141 passes): `PROM_WALLS`' south wall began at the sea wall's foot row, so the two boxes overlapped in the corner with their west and south faces and copings in one plane. The south wall starts at the sea wall's back and its coping at the sea coping's edge (`citadel-layout.js` `joinW`, `island.js` buildFlatTown); the colliders' union and `flatClear` unchanged |
| `camclear` | 15/15 + 31/32 visual: "cliffs: placements, no surface within 0.15 m of the camera" (−62, −18) facing east, 0.118 m from the main | **15/15 + 32/32** (twice) | The game, C66 (v147; v146 passes): the meter cabinet 0.8 m east made the main's last run a slant 0.4 m nearer the plateau's edge, and that run was never one of the camera's own volumes. The slant now is (`island.js` buildPipeline, `pipeVolumes`). The riser into the cabinet as a volume too was tried and dropped (camsteady's Modern street: a 4.12 m keep entry) |

## Fixed by the camera fix pass (22.11: CAM-LURCH, CAM-GRAZE, CAM-JOLT, CAM-FOLD, CAM-RIDE, CAM-BOB, CAM-TOP, CAM-EASE-IN)

Automated runtime only (headless Chromium, SwiftShader, one suite at a time on a shared, loaded machine; base `dc7e5b33`).
Only `src/engine/camera.js` changed; no test changed. All the causes were the game's. The final code's runs: camsteady (two
orders), controls 92/92, camfollow 31/31, camclear 47/47 (15 + 32), camcover 12/12, face-2 9/9, face-3 6/6, fps30 `ONLY=D` 23/23,
combat 78/78. Logs (tmpfs-like scratch, not kept): the session's `scratchpad/cf/C-*.txt`, `D-camsteady.txt`, `x3-camfollow.txt`.

| Suite | Before | After | Cause, and the fix |
|---|---|---|---|
| `controls` | 89/92 (camera f60 / wall f60 / wall f30: acceleration p95 12.5 / 14.3 / 12.8 > 12) | **92/92** (p95 10.8 / 9.9 / 9.9; max 15.4 / 12.9 / 12.8, was 25 / 25.1 / 23.5) | The LBA view (the route sets `camera = 'lba'`; not the Follow arm): its rise over scenery started and stopped at RISE_A = 1.5 rad/s² × the 15.7 m arm = 23.6 m/s² (open ground), and the rock-face swing at Hamalayi's wall moved the lens at up to 22 m/s². CAM-LURCH: the rise's ease bounded to 4 m/s² at the lens (and slowed to stop on its goal; its landing no longer jumps 1e-3 rad), the swing's speed and ease bounded by its path's bend and length to 4 m/s². His frame box, the terrain and wall checks unchanged |
| `camsteady` | 105/110 (the five) | **111/111** and **110/110** on the final code (two full runs: the default order, then `MODES=follow,lba,free`, another route order; 110 vs 111: the Medium street's "still once stood" check is asked only when he stood a second); an earlier full run, before the strict-line guard below, 110/110 | (1) LBA, near the cliffs, height 10.6/min: the line to him grazed the scenery three times for 0.1–0.8 s (1.6–2.5° more tilt), each a rise and a fall; CAM-GRAZE: a need counts once wanted 0.3 s, or at once when 0.12 rad over the view (hidden behind a house it still rises at once) → 6.1/min. (2) Free, Modern street, one 1,749 m/s² jolt: the least margins over an eave stood 0.5 m over the eased lift and were taken in one frame; CAM-JOLT: that rise at ≤ 300 m/s² while the spot under it is in nothing → max 543. (3) Follow, pier, heading 12.1 > 8.6/min: off the pier's end a swing chosen as he stepped off went past his back and came back; CAM-FOLD: a swing still going out is let go once his back, 0.5 s on along his walk, gives 4.5 m that sees him, the part between the chase and his back folded into the chase (the view does not move for it); none is taken while he is pushed on ahead and his back 1 m on gives that; CAM-RIDE: a walk's swing of ≤ 0.27 rad comes back on his next turn its way (≤ 4 s) → 8.6–8.8 = his. (4) Follow, Modern street, 103.4 > 101.7: two one-step swings (10°) came back 0.3 s after the chase stood; CAM-RIDE → 99.5–101.8 = his. (5) Medium Modern height jitter: bobs of a few cm (the pivot up a kerb as the lift let down); CAM-BOB: a 3.5 cm backlash on the Follow camera's height (never into anything, never losing him) → 0–1. The order-dependence of tonight's record: both orders pass; jitter on the walls, pier and door routes sits at the budget (3 ≤ 3) |
| P58 (OVERLAP-SWEEP, SE tower corner, Follow) | hidden up to 1.3 s | 0 runs ≥ 0.4 s at the corner (the walk's hidden frames 293 → 40; the rest at the huts, ≤ 0.7 s) | His back to the station's south-east tower 0.1 m outside its slate roof's rim: every over-head tilt up to CH_OVER_HI_P's last (1.52 rad) stood the camera 0.2–0.3 m behind him over the rim, which hid him. CAM-TOP: armFor's last view that may see him is straight over his head (1.565 rad at 3.2 / 4.4 / 5.6 m). Probe: `p58walk-headless.mjs` cut to the corner, 1/60 steps; the stuck harness turns him on the spot there |

Keep-rule entries (item 4, CAM-EASE-IN): the "high" and "oversee" rules' entry, when it steps more than 0.5 m a 1/60 s, now
goes over play time (≤ 60 m/s², at rest on the goal, ≤ 0.6 s), held only while each spot on the way is clear, off a roof
and sees him by the strict lines wherever the goal does. Measured on camsteady's routes only: along the house walls the
largest keep step 1.25 → 1.20 m, out of the house door 0.74 → 0.74, through the door 1.42 → 1.39 (not one of those two
rules); judged by the camera's own sight (before the strict lines) it reached 0.50 m but hid him for a frame at camfollow's
wall (2 checks failed): the guard keeps most entries outright, so the staged corners' 1–2.6 m entries mostly remain.
camfollow 31/31, camclear 47/47 after.

(22.11, camera night, CAM-EASE-ROUND, `camera.js` only.) Those entries again, with the strict lines kept: where the
straight way's next spot fails, the way round his pivot (heading, arm and tilt eased together) and the same tilt first;
and an entry over 1 m none of them eases is split over two frames at a spot 0.4–0.6 of the way that is clear, off a roof
and sees him wherever the goal does. Measured with a scratch probe (24 staged spots 0.75–0.9 m off tall boxes' corners
and faces on Citadel, back to the wall, stand / full turn / back / back up / turn, 1/60 s, by input): unsmoothed "high" or
"oversee" entries over 0.5 m, Medium 4 → 2 (over 1 m: 2 → 1; the 1.87 m one in two steps ≤ 0.94 m, a 0.9 m one eased),
Far 7 → 4 (over 1 m: 3 → 2; 2.08 m → two of ≤ 1.03 m); frames unseen by the strict lines unchanged (80 / 85, of which
newly unseen 10 / 11). **Left:** the 2.4–2.8 m entries at the face (−75.8, 25.4): the camera on its way stood where the
strict lines did not see him and the goal is the only pocket that does — of 27 spots tried along the three ways (0.1–0.9)
only the tilt-first way's 0.9 sees him, so any ease or split adds unseen frames; they stay a jump. camfollow 30/31 (the
one: its "Medium for a new player" settings check, stale since P100 made Far the default — not the camera), camsteady
110/110 (`MODES=follow,lba,free`) and 109/110 in the default order (follow · harbour pier heading reversals 12.2/min > 8.7;
the build before this change, same order: 108/111, the pier 12/min and two Modern-street checks; the pier alone passes on
both, 8.5 ≤ 8.5: order-dependent, not this change), controls 92/92. Automated runtime only (SwiftShader).

## Fixed by the camera pass (22.11: CAM-HANDBACK, CAM-OVERSIGHT, CAM-EASE)

Automated runtime only (headless Chromium, SwiftShader, one suite at a time on a shared machine; base `47e89797`, after
`43de5114`). Only `src/engine/camera.js` changed.

| Suite | Before | After | Cause, and the fix |
|---|---|---|---|
| `camclear` | 1 visual FAIL (ch10) | **47/47** (15 functional, 32 visual; full run) | The game. [>ch2] Oku speaks his one line from 8.4 m; the favoured shot (FACE-2) put the camera between them, a single on Oku with Twinsen behind the lens, and CAM-AFTERTALK held that shot up to 8 s after the talk. `_talkShot`: a shot held after a talk must frame him (`_framesHero`: waist and head inside 0.85 of the frame, in sight); else the two-shot of both (`_talkPose`), eased round the look point over 1.1 s from the shot it had (a cut where FACE-2 already cuts), else the hold is let go and the chase eases back. Twinsen back on screen 0.68 s after the talk ends (before: not once in the 6.5 s the test watches); the glide moves 0.01 m in its first frame and at most 0.17 m a frame (an unshaped glide tried first: 0.32 m in its first frame) |
| `camfollow` | 30/31 | **31/31** | The game. The full turn by the wall at (−68.7, 11): CAM-STEADY holds the lower over-head tilt for a moment, and CAM-OVERSIGHT's goal (`C.overSee`) took that held tilt, which did not see him over the eave; one frame he was unseen by the test and by the camera's own sight. `_chase`: the goal is the tilt `armFor` found seeing him, and a tilt up at the camera's own arm within the 0.9 m step that stands clear and sees him is taken before a part step along the way. The wall spot's turn: 1 unseen frame → 0, the largest step unchanged (0.75 m) |

CAM-EASE (SMOOTH-1 §3.4's single-frame steps; measures, no suite fails on them): the "tilt" keep-out is let go over play
time (back to the arm's spot at no more than its speed + 30 m/s², resting on it; staged wall spots: release step max
0.193 → 0.122 m) and the heading's cap is eased (30 rad/s²) under a lock-on and 1 s after it (combat route, synthetic
display: the largest one-frame fall of the view's turn speed 1.9 → 0.62 rad/s at 60, the lock's 4.1 → 1.6 at 30@60 gone).
Eased everywhere, it changed the street routes' paths under camera-relative controls (camsteady Far Modern jitter 3 → 5):
kept to the lock. The arm's 0.25 m in-cuts at 30 (FPS30 §8.3-5) are not changed: easing them alters 60 Hz too.
Open: the GTX 1050's 2.96 m T3 camera step at 30 (order 62 "after", a `real` pass with 4 drawn intervals ≥ 45 ms, max
440 ms, in the 57 Hz state) is most likely one long frame: `advance` caps a frame at 4/30 s of play, and T3's camera
moves up to 26 m/s in its ordinary frames (synthetic 30@60, same build: largest step 0.86 m in 33 ms), so 2.96 m is
~22 m/s over 133 ms. Not confirmed: that pass's per-frame record (OUT) was not kept; the 400 ms rAF gaps are P96's.

## Fixed by AUDIT-FIX (17.11)

| Suite | v96 | After | What |
|---|---|---|---|
| `camcover` | 11/12 | **12/12** | The round and fruit crowns' sight shape is the leaf mass as drawn (A-6) |
| `worldfit` | 3 visual | 1 visual | z-fighting 38 → 0; Doran's shed no longer floats (A-7); the lone posts in the harbour water gone (A-11) |
| the playthrough chain 01–14 | 3 segments stopped on harness faults | see `AUDIT-FIX-v96.md` | A-3 |

## Fixed by TEST-DEBT (21.11)

Automated runtime only (headless Chromium, SwiftShader, one suite at a time on a shared machine; base `a095a3f6` merged
with `ccr-c1c2c4b9-dep6ed` at `5a589a48`). Logs `/dev/shm/td-logs/` (tmpfs).

| Suite | Before | After | Which was wrong, and the fix |
|---|---|---|---|
| `well-town` | 27/32 | **32/32** | The test. The harness does Zoé's yard errand (the kettle) on the first walk out of the yard (OPENING-TUT-2, `P.yardFirst`), so Mira's refusal was never met; and her line reads "on a rumour" since DIALOGUE-2 (was "for a pipe fault"). The suite now leaves the yard with the errand open, as a player can (TUT-MYSTERY) |
| `slidetraps` | 4/5: three Citadel spots (two respawns with a life lost at (−32.7, −25.8), (−33.2, −26.0)) | 4/5: one spot (above) | The game. A scattered boulder stood half inside the stone house's west corner (−31.5, −25.0): the rock scatter checked only the new houses' walls. It closed the lane round the house and held a slide off the terrace bank in a pocket with no footing. Rocks now keep out of every house's footprint (`world.js`, as TREES-1 for trees and bushes; 9 rocks against house walls go). Pictures: `captures/test-debt/stone-house-corner-{before,after}.jpg`. The life lost was the test's own far "last safe spot" (in a hole at y −6) |
| `world-consistency` | the static journeys check FAIL (4 calls unclassified) | **37/37** | The test's allow-list: chapters 12–13 (EXP-3, `balances.js`) were never classified (12 → 13 the same island; 13 → 14 through the ship's film; the epilogue's Cradle Hall scene a cut and back), and a call in a top-level function (`sleepersScene`) was read as the class method above it (`sub`). The game was right |
| `playthrough/06-zeelich` from `base-05` | FAIL at Brel (markers 1, expected 0) | **PASS** to chapter 4 (0 deaths, 0 assists); from `new-05` PASS (1 ISO assist in the depot fight, as always) | The test. `base-05` is a save from before the Mill Lane thread on purpose (campaign-thread C4, depot.mjs use it so): the game lands it with the lift mended and the cistern full, by design (`zeelift.js`). Not regenerated. The segment now checks that state once and passes over the Mill Lane steps for such a save |
| `camclear` | 30 PASS, 2 functional + 1 visual FAIL | ch6, ch8 PASS (the ch10 visual stays, above) | The test. [>ch2] Two puzzles changed after it was written: the Hamalayi's dead tree now rocks on its prop and the prop is the ball's second target (PUZZLES phase 2); the bunker hatch wheel now rolls the door ajar (`c8_gap`) and Lulu opens it (MIDDLE-VARIETY). Its done-conditions follow them |
| `fps30` D (order-dependent) | — | — | Fixed by P94 before this pass (the arena's enemies removed at setup, D's reset clears `dead`); not touched |

## Fixed by ONE-SHOT-30 (21.11)

Automated runtime only (headless Chromium, SwiftShader, base `bf348951`). `combat` **78/78** (was 76/78).

| Check | Was | Cause | Fix |
|---|---|---|---|
| "dodge distance consistent at 30, 60 and 120 fps" | d30 0, d60 1.56 | **The test.** The dodge started at 30 fps and went its distance; the first press after `G.devArena()`'s scene change was read by CAM-DOORS (`Hero.inputYaw`'s `reanchor`) as a direction held through a door: the D-dodge went straight ahead, and the x-only measure read 0. The 30 fps run was simply the first. Measured through `game.advance` at 30 / 30-limit / uneven 30 / 60 / 120 with a held or a between-frames tap: the same 2.40 / 2.02 / 1.44 m aside / back / ahead, started on the press's own frame | `tests/combat.mjs` §14: a moment of play before the press; distance along the ground, the direction compared; 30, 60 and 120 (±5 %): 2.21 / 2.21 / 2.21 m |
| "the follow-through blends into the walk (no arm snap)" | maxJump 0.314 | **The test.** The window began 0.1 s after the button, at the throw's clock 0.18, just past the release (0.16): the arm's whip by its keys (0.46 rad a frame at the release). The controller's let-go and the layer's end moved the arm 0.055 and 0.007 rad. A sword strike walked off (W / D / S at 0.15–0.5 s): ≤ 0.12 rad a frame at the hand-over; fists ≤ 0.22 | §18 judged from the let-go through the layer's end: 0.054; the whip kept and held to anim-combat's 1.2 |
| (not a check) a strike's step at an uncapped 30 fps | jab 0.35 m vs 0.38 at 60 | **The game.** `HeroCombat.stepMove` took the step only on frames ending before startup + active end: a 33 ms frame dropped the last of it | The frame that startup + active begin in takes its even share of what is left: jab 0.37 / 0.38 / 0.38 m, slash1 0.53 / 0.54 / 0.54 at 30 / 60 / 120 (was 0.52 / 0.52 / 0.54) |

`anim-combat`'s "planted feet don't skate" counted a foot the planting was stepping when a 30 fps frame sampled it under the
height bar (3–17 cm from one landing, on the old and the new step alike): a foot stepping in this frame or the last is no
longer counted (0.1 / 0.1 / 0.3 cm after; the old step 0.1 / 0.2 / 0.2).

## Intermittent, seen in FULL-TEST-22-11 (v128, partial; Automated runtime only)

| Suite | Seen | Re-run | Notes |
|---|---|---|---|
| `face-3` | 5/6: "sign: no prop … over a head, chest or waist". On Zoé's 4th line the Bug St. board (1.17 m from the lens) is over Twinsen's waist | 6/6 alone. A/B: `63416c4a` (pre CAMERA-NIGHT) 2× PASS, `d6a9df6a` 1× FAIL, HEAD 1× FAIL + 1× PASS | The same shot every run. The waist ray clips the board's top edge by a few cm (a threshold effect). CAMERA-NIGHT is not excluded (FULL-TEST-22-11 §1.1). Owner: camera (FACE-3) **Fixed 22.11:** the shot search's foreground lines had none to the waist (head, chest, hips), so the board between them cost nothing; a waist line for props now (`camera.js` FV_WAIST): face-3 6/6 twice, no board hit on any line |
| ~~`autoquality-game`~~ **fixed 22.11 (FIX-PASS 3: the test harness)** | section 7's reopen: `page.goto` 180 s timeout, twice at load 10–12; sections 1–6 21/21 | sections 7–8 alone: 8/8 at load 12–14 | Load; `boot.mjs` `open`'s goto timeout was fixed at 180 s. It now follows `BOOT_TIMEOUT` (never under 180 s), as the boot's own wait does. Automated runtime only |
| ~~`exp-ballastra`~~ **fixed 22.11 (FIX-PASS 3: the game and the test)** | 32/33: "Ferro tosses his kashes", coins +5 (expected ≥ 10) | 33/33 | **The game.** A probe of 30 tosses (two coins each, from Ferro's stand, then a walk to each): 8 of 60 coins drifted off the lift's quay and lay 5 m down in the chamber's water (ground −3), out of reach; 7 of 30 tosses paid 5 or 0. A popped bonus now stops drifting over the sea or a drop, as a container's bonus already did (`actors.js` Pickups): 60 of 60 coins on the quay, all collected. The test walks to each kash it owes. An uncollected coin was never lost (`settleOwed` pays it on the next load). Automated runtime only |
| ~~`prologue`~~ **fixed 22.11 (FIX-PASS 3: the test)** | the listed mites crash again (above) | 29/29 (4 mites in 8 throws, no departure) | FULL-TEST ran the test from before FIX-PASS's 0.6 m rule (`1b81946d` is not in `257f6a1a`). Made robust anyway: the throw spots keep 1.5 m clear of the rope's foot (more than a mite's shove over a throw's 3 s wait), and if he is out of the well all the same he goes back down by the well's prompt and fights on (the departure stays in the result); the nodes step no longer reads a null room. Automated runtime only |
| `arrival-steps` **open, load-bound (FIX-PASS 3 split the long units it found)** | 11/12: B tavern, one draw-batch unit 70.9 ms (limit 40) at load 4.5 | 12/12 once at load 5.8–7.5; base (`9a4fb167`, run next to it): 11/12, the tavern's cell part 54.4 ms. At load 8–12: 9–11/12 in base and candidate alike, on whatever unit the descheduling lands in (cell, cell part, place, compile, even a 0.4 ms-unit slice of 103 ms) | Units timed by label and by what ran inside them. Three were the work itself, not load, and are now cut (`texarray.js`, `drawbatch.js`, `shadowcull.js`): the texture array's one upload (base 20–59 ms for a 256² array of 8–11 MB; now 2 MB a step, most steps < 1 ms, one mipmap pass at the end as before); one 18 848-vertex piece's positions in one unit (25 ms; now 4 096 vertices a step once the unit is long); a large shadow piece's triangles (38 ms; now 1 024 a step); and a large batch's bounding sphere is in steps too. The same batches (A), texels at mip levels 0/1/3/6 read back equal to one upload, spheres equal to three's on 200 random batches; the tavern's picture the same. Still open: under load 8+ the 40 ms check fails on any kind (ARRIVAL-2's reading); run it alone. Not seen on hardware. Automated runtime only | performance |

## Intermittent, passed on v96

~~`chapter1`~~ (**fixed 22.11, FIX-PASS 2: the test.** It threw from `Math.random` bearings 6 m round the orchard cage; a third of the bearings have the bars or the main in the lob's way. Probed, 4 throws a bearing: every throw from 1.15 … 2.1 rad (the cage's gate side, east) opened it, none from about a third of the rest. Five fixed spots on that side (1.27 … 1.87 rad): 3 of 3 runs 33/33), `saveslots` (the slot picture's timeout: 25/25 as committed), `overlaps` (Lhar's roof spots: pass), `sewers` (three
well-house lift checks: 32/32), `sewers-ways` (two out-of-door spots: 34/34).

## Not rerun since v96

`gap-scan` (never run in full: it builds every region a few groups to a page and walks each held slot by input; owner:
the coordinator, on a quiet machine, `BATCH=8`), `door-sweep`, `room-cutaway`, `npc-feet`, `walkers`, `wizards`, `shops`,
`chapter2`–`chapter10` (but `chapter1` and `chapter4`: AUDIT-FIX). Their last known state is RELEASE-AUDIT-v75's.

## ~~tests/jumpreach.mjs — "Zeelich's old mill" (found 19.11)~~ fixed 22.11 (FIX-PASS 2), 4/4
**The game.** Traced hop by hop (P.climbOldMill): the bot reached stone 6 and every hop to stone 7 fell back. A hop from the
middle of a stone with a short run-up crests 1.14 m up (the 30 fps apex) 0.95 m short of the next stone's middle, 0.04 m over
its top and before its edge; from 1.54 m it lands. Every stone was that marginal (each first try fell back); stone 6's
retries started at 1.66 m. The stones stand 27° apart round the tower, not 30° (1.54 m between the places to stand, not
1.71; `zeelich.js`); heights and the gallery unchanged, its gap and landing follow the stones. jumpreach 4/4 (one pass:
7.09 … 13.66, the gallery 14.75). Pictures before/after looked at. Automated runtime only. Not rerun: the playthrough's
06-zeelich and 13-network segments (they climb the mill by the same harness).

The row as it stood:
Up the mill's 7 stair-stones to the gallery by jumps: the bot is stuck at 12.56 m on the hop onto the gallery (heights
7.09 … 11.47, 12.56, 12.56, then falls back). **Fails identically on v99 (ba62aa2c)** and on today's build with the old
or new physics.js (FPS30): not caused by v100/v101's work. Open: the gallery's lip vs the last stone (a world fix).

## The Citadel station: Twinsen standing still under the main's bridge over the gate lane (FIX-PASS 2 and CAM-FIXTOP, 22.11)
Probe: by input to each of 25 spots round the bridge (design x 37.6–40.8, z 34.4–37.6), then still; the P58 walk's test
(rays from the camera to his chest and head against the drawn opaque meshes, both blocked = hidden). **Follow: 5 of 25
hidden → 0 of 25** (FIX-PASS 2: the project's sign under the bridge has a scenery volume, `island.js`).
**Fixed view (CAM-FIXTOP, `camera.js`; trestle marks, `island.js`): mostly fixed.** Cause: LBA2's rule sees him by one
line, to 0.65 m over his feet, over the scenery volumes; the bridge's pipe, its sign and the A-frame trestles hid his chest
and head with that line clear, and the steep turn (CAM-2) could turn the view onto such a heading. Now, at the rule's
pitch limit (it wants 48° or more) with him standing, when neither his head nor his chest is seen past the walls and the volumes (the
camera's own included) for 0.6 s and he is not under a roof, the view takes the least change that shows him: a heading up
to 60° round at no more than 48° (the tilt it has kept where it can), else over him on its heading (up to 80°), else
both; eased as the view's other swings and rises, held until he has walked 1.5 m and the rule's own view sees him. Walking,
the view stays LBA2's (turning for each short hidden stretch along the house walls rocked camsteady's tilt). The trestles are the camera's own volumes (camOnly: the rule
still passes through them, as OVERLAP-3 asked). Probe (`scratchpad/cf2/probe.mjs`), hidden at 3 s / 5 s of standing:
from the gate passage's mouth 5 / – → 1 / 2 of 25 (the 2 at 5 s straight under the bridge, x 39.2: under it, hidden by
design as in the passage); walking in from the east 13 / 5 → 3 / 2 of 25 (left: a late steep turn at (39.4, 34.4) onto a
heading the volumes see him from and the meshes don't, and at (41, 37.6) the view still turning at 5 s). Inside the
covered gate passage he stays hidden by design (the silhouette draws him). camfollow 31/31; camsteady: the final code's Fixed routes 30/30 (`MODES=lba`), the Follow and Free routes passed in the full run just before the last change (Fixed-only), the full run before that had Follow's Modern street jitter 4 > 3 once (the known order-dependent budget) Automated runtime only.

