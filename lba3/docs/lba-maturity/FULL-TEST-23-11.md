# FULL-TEST (23.11.2026): the one full test at the end of the night, on v147

The user's rule: minimal tests while working, one full test at the end. This is it, on the build as published (v147).
Same model and categories as `FULL-TEST.md` (20.11) and `FULL-TEST-22-11.md` (22.11, a partial run on v128).

- Build under test: `ccr-c1c2c4b9-dep6ed` at `64c5a6cf` (v147 as published, the build stamp at HEAD), on the worker
  branch `worktree-agent-a93e7294203e8143b`. Fixes made here: `b62399d7` (the game, two regressions) and the test
  updates in §1 (one commit after it). Not pushed.
- Runtime: **Automated runtime only (SwiftShader)**: headless Chromium (Playwright, `--use-angle=swiftshader`), 4 cores,
  one suite at a time from this run, the game served by `python3 -m http.server 8263` from `lba3/`; `BOOT_TIMEOUT=900000`,
  `TMPDIR=/dev/shm`. 00:27–05:38 UTC the machine was quiet (load 0.5–2.5, no other browser seen); from ~12:15 another
  session's `opening.mjs` browser ran alongside (load 8–9). No GTX 1050, UHD 620 or Vega 8 numbers: nothing here is a
  frame-rate claim for a real machine.
- Runner: `tests/out/ft4/runner.mjs` (not committed: `tests/out/` is ignored; it restarts the server if it is down and
  re-runs a suite that saw `ERR_CONNECTION_REFUSED` — that never happened). Each suite's log is in `tests/out/ft4/logs/`,
  one line per suite in `tests/out/ft4/results.tsv`. Old builds for the A/Bs: `git archive` copies in `/dev/shm/ft4b/`
  (tmpfs; v128-era `pre100` = `af6baba8~1`, v141 `02d06bd0`, v142 `072403bc`, v146 `8b62b4c9`, v147 `64c5a6cf`),
  served on 8264–8267, the HEAD test scripts run against them.

## Summary

| | Count |
|---|---|
| Suites and sections run (the chain's segments counted one by one) | 113: 80 suite runs (camsteady and face-3 twice), campaign-hands, save-migration, campaign-thread's 16 sections, the chain's 15 segments; plus the A/Bs and re-runs of §2 |
| PASS first time | 108 (fps30-feel, measures only, counted here) |
| (a) known, KNOWN-FAILING's numbers | 0 (none of KNOWN-FAILING's rows recurred: controls 92/92, camsteady 110/110 both orders, jumpreach 4/4, prologue 29/29) |
| (b) the test asserted behaviour a task changed on purpose → test updated, re-run | 2: campaign-thread C8 and O4 (PUZZLES phase 2, 21.11) |
| (c) real regressions → fixed in the game (`b62399d7`), re-run | 2: worldfit's z-fighting (FLAT-TOWN, v142); camclear's camera at the water main (C66, v147) |
| (d) flake / variance, re-run | 1: campaign-hands (Irsa's right hand 2.5 cm, then 0.4 cm on the re-run: 8/8). The camsteady single checks seen while re-running the fix are the default order's spread on v147 itself (§2.3) |
| **open** | 1: worldfit, the shop's door sill under the ground (FLAT-TOWN, v142): any fix is a visible world change, for the user |

## 1. Suite table

Categories for a FAIL: **(a)** known, listed in KNOWN-FAILING.md with the same numbers; **(b)** the test asserted old
behaviour a recent task changed on purpose, and the test was updated; **(c)** a real regression, fixed in the game and the
suite re-run; **(d)** a test fault, flake or load effect not in (a), re-run alone; **open**: not resolved here.

| Suite | Verdict | Checks | Time | Failures, category |
|---|---|---|---|---|
| dialogue-check | **PASS** | Hebrew 5587/5587 keys (5582 in text/*.js; 227 warnings, as before) | <1 min | — |
| autoquality (Node) | **PASS** | 90/90 | <1 min | — |
| opening-tutorial | **PASS** | 43/43 | 15 min | — |
| tutor-targets | **PASS** | 26/26 | 8 min | — |
| prologue | **PASS** | 29/29 | 2 min | — (the mites crash of 22.11 did not recur: FIX-PASS 3's spots hold) |
| chapter1 | **PASS** | 33/33 | 2 min | — (FIX-PASS 2's orchard spots hold) |
| chapter2 | **PASS** | 21/21 | 3 min | — |
| chapter3 | **PASS** | 48/48 | 3 min | — |
| chapter4 | **PASS** | 59/59 | 14 min | — |
| chapter5 | **PASS** | 23/23 | 1 min | — |
| chapter7 | **PASS** | 20/20 | 1 min | — |
| chapter8 | **PASS** | 22/22 | 1 min | — (Ambo, NAMES-1) |
| chapter9 | **PASS** | 24/24 | 2 min | — |
| chapter10 | **PASS** | 30/30 | 2 min | — |
| middle-variety | **PASS** | 19/19 | 4 min | — |
| mills | **PASS** | 19/19 | 5 min | — (the stones 27° apart) |
| vesk | **PASS** | 12/12 | 8 min | — |
| exp-ballastra | **PASS** | 33/33 | 6 min | — (Ferro's coins: FIX-PASS 3 holds; 22.11's (d) did not recur) |
| exp-balances | **PASS** | 37/37 | 7 min | — |
| exp-throttle | **PASS** | 28/28 | 6 min | — |
| epilogue-home | **PASS** | 12/12 | 1 min | — |
| dialogue-scenes | **PASS** | 10/10 | 1 min | — |
| desert-life | **PASS** | 30/30 | 7 min | — |
| faces | **PASS** | 7/7 | 2 min | — |
| fps30 | **PASS** | 60/60 | 2 min | — |
| boot-fail | **PASS** | 5/5 | 1 min | — |
| cave-stair | **PASS** | 21/21 | 3 min | — |
| p81-revisits | **PASS** | 7/7 | 3 min | — |
| story-fix | **PASS** | 15/15 | 1 min | — |
| menus | **PASS** | 40/40 | 2 min | — |
| hebrew | **PASS** | 24/24 | 4 min | — |
| controls | **PASS** | 92/92 | 3 min | — (CAM-LURCH holds; KNOWN-FAILING's three "no lurch" rows stay fixed) |
| timing | **PASS** | 39/39 | 1 min | — |
| anim-combat | **PASS** | 35/35 | 1 min | — |
| jumpreach | **PASS** | 4/4 | 1 min | — (the old mill's stair-stones 27°: FIX-PASS 2 holds) |
| arrival-steps | **PASS** | 12/12 | 3 min | — (every slice ≤ 40 ms on the quiet machine; PERF-ARRIVAL's 70.9 ms of 22.11 did not recur: FIX-PASS 3's steps) |
| char-form | **PASS** | 7/7, 13 pictures | 2 min | — (pictures in `tests/out/ft4/char-form/`, see §4) |
| world-consistency | **PASS** | 37/37 | 2 min | — |
| combat | **PASS** | 78/78 | 1 min | — |
| camfollow | **PASS** | 31/31 | 2 min | — (Far for a new player, the test as P100 left it) |
| camclear | FAIL → **PASS** | 15/15 + 31/32 visual → 32/32 | 13 min | **(c)** "cliffs: placements, no surface within 0.15 m of the camera": at (−62, −18) facing east the Follow camera stood 0.118 m from the water main. Fixed `b62399d7`, §2.2 |
| camsteady (default order) | **PASS** | 110/110 | 10 min | — (KNOWN-FAILING's pier row did not occur in this run; see §2.3 for the order's run-to-run spread) |
| camsteady (`MODES=follow,lba,free`) | **PASS** | 110/110 | 9 min | — |
| face-2 | **PASS** | 9/9 | 2 min | — |
| face-2-tour | **PASS** | 5/5 | 3 min | — |
| face-3 (two runs) | **PASS**, **PASS** | 6/6, 6/6 | 1 + 1 min | — (22.11's intermittent "sign" check passed both times: CAM-FIXTOP's waist line, CAM-SIGNPOST) |
| ui-p92 | **PASS** | 29/29 | 4 min | — |
| autoquality-game | **PASS** | 29/29 (sections 1–8) | 19 min | — (sections 7–8 ran this time: FIX-PASS 3's `open` follows `BOOT_TIMEOUT`) |
| keepalive | **PASS** | 6/6 | 3 min | — |
| slidetraps | **PASS** | 5/5 | 1 min | — |
| overlap-sweep | **PASS** | 1 + 5/5 visual | 6 min | — |
| citadel-structures | **PASS** | 7/7 | 1 min | — |
| spaceport-2 | **PASS** | 21/21 | 7 min | — |
| zport-2 | **PASS** | 19/19 | 9 min | — |
| ballastra-harbor | **PASS** | 19/19 | 1 min | — |
| ballastra-arches | **PASS** | 20/20 | 1 min | — |
| ballastra-gardens | **PASS** | 22/22 | 1 min | — |
| occluders | **PASS** | 1 + 34/34 visual | 7 min | — |
| depot | **PASS** | 29/29 | 3 min | — |
| puzzles | **PASS** | 24/24 | 6 min | — |
| p79-faces | **PASS** | 3/3 | 2 min | — |
| fps30-feel (`RUNS=1 RATES=30@60,30@59.9,60`) | measures only | — | 1 min | Drawn intervals all on the grid (33.33 / 33.39 / 16.67 ms; p50 = p95 = p99 = max; none ≥ 45 ms). Camera jumps: 0 position, 0 yaw, 0 tilt in every test and path (22.11: T3 mouse+keys at 30 had 4 position and 2 tilt jumps, T3 pad 1 tilt) |
| walkers | **PASS** | 37/37 | 1 min | — (FIX-WORLD's facing) |
| interior-life | **PASS** | 144/144 | 3 min | — |
| travel | **PASS** | 27/27 | 18 min | — (the Zeelich ferry by U-1's rule, chapters 2, 9, 10) |
| weather | **PASS** | 23/23 | 4 min | — (Zeelich's rose fog) |
| worldfit | FAIL → FAIL (1 visual), **open** | 1 + 6/8 visual → 7/8 | 3 min | **(c)** (3) z-fighting, 10 judged clusters at the promenade's south-west corner (FLAT-TOWN, v142): fixed `b62399d7`, §2.1. **open** (1) "door sill under the ground": the shop (Pippa's, `house shop`) by 0.24 m (FLAT-TOWN, v142), §2.4 |
| camcover | **PASS** | 12/12 | 1 min | — |
| shop-ui | **PASS** | 6/6 | 1 min | — |
| shops | **PASS** | 31/31 | 4 min | — |
| arsenal | **PASS** | 34/34 | 5 min | — (save format 6) |
| island-people | **PASS** | 65/65 | 4 min | — |
| prom-edge | **PASS** | 19/19 | 6 min | — |
| place-scan `ONLY=citadel` | **PASS** | 3/3 (1,150 pieces, 33 findings, all on the LEFT list) | 1 min | — |
| spaceport-3 | **PASS** | 15/15 | 3 min | — |
| twinsen-zoe-look (default look) | **PASS** | 3/3 | 1 min | — |
| twinsen-back-look (default look) | **PASS** | 3/3 | 2 min | — |
| anim-polish | **PASS** | 55/55 | 2 min | — |
| desert-bar | **PASS** | 18/18 | 4 min | — |
| campaign-hands | FAIL → **PASS** on the re-run (8/8; Irsa R 0.4, L 0.9 cm) | 7/8 | 28 + 33 min | **(d)** "chapter 10's friends at their handles … within 2 cm": Irsa's right hand 2.5 cm (left 0.1). Every other hand ≤ 0.9 cm; every hand action within 2 cm |
| save-migration | **PASS** | 49/49 | 31 min | — (old saves load; save format 6) |
| campaign-thread A | **PASS** | 13/13 | 7 min | — |
| campaign-thread B | **PASS** | 11/11 | 8 min | — |
| campaign-thread C (runs H, J, L, N too) | FAIL → re-run twice: C1–C22 **PASS** both times (C8 included), each cut by the 3600 s limit before C23–C24 at load 13–20 (other sessions' browsers); C23–C24 passed in the first run and the edit does not touch them | 27/28 | 26 + 60 + 60 min | **(b)** C8 "a save from before, chapter 6 at the landing … it goes on: the tree over the gorge" `["pass",1,true,true,6,false]`: the bot threw at the tree only. PUZZLES phase 2 (21.11, `a865e6df`): the ball rocks the tree back on its old prop, the prop is the second target (camclear and puzzles were updated then; C8 was not, and campaign-thread had not run since 20.11). C8 now throws at the tree, then the prop |
| campaign-thread D | **PASS** | 9/9 | 6 min | — |
| campaign-thread E | **PASS** | 7/7 | 5 min | — |
| campaign-thread F | **PASS** | 12/12 | 8 min | — |
| campaign-thread G | **PASS** | 5/5 | 5 min | — |
| campaign-thread H | **PASS** | 5/5 | 3 min | — |
| campaign-thread I | **PASS** | 14/14 | 11 min | — |
| campaign-thread J | **PASS** | 3/3 | 7 min | — |
| campaign-thread K | **PASS** | 11/11 | 29 min | — |
| campaign-thread L | **PASS** | 3/3 | 5 min | — |
| campaign-thread M | **PASS** | 9/9 | 16 min | — |
| campaign-thread N | **PASS** | 4/4 | 5 min | — |
| campaign-thread O | FAIL (O4, O5, then a crash in O6) → **PASS** (8/8) | 3 of 8 before the crash | 8 min | **(b)** O4 "valve C … valve A; cooled; at the shutter …" `[null,null,false,11]`: nothing cooled. PUZZLES phase 2 item 1 (21.11, `15c72e14`): the drain (B) is found open and both feeds starve the drive; shut, the loop closes (puzzles c15 and playthrough 14 do this). O5 and O6's crash follow from O4. O4 now shuts the drain after A |
| campaign-thread P | **PASS** | 4/4 | 6 min | — |

## 2. The real regressions, and the open item

### 2.1 worldfit (3): z-fighting at the promenade's south-west corner (FLAT-TOWN, v142) — fixed
- Found: 10 judged clusters (0.18–2.72 m²) at (−76.0, 2.1–6.1, 18.7–19.8), every one `flat-town:stone`/`flat-town:rubble`
  against itself, by the house "baggage": the tops of the copings at 6.08, the rubble's west faces at x −76.05 and the
  south faces at z 19.76.
- A/B (HEAD's worldfit against old builds): v141 **PASS** (24 small Citadel z-fights listed, none judged); v142 FAIL (the
  same 10 clusters and the shop's sill); v146 FAIL (the same). Introduced by FLAT-TOWN (`a4e8354c`/`5ad58823`).
- Cause: `PROM_WALLS`' `south` wall ran from the sea wall's foot row (x0 = PROM.xo − 0.05), the same x0 and z1 as the sea
  wall: the two boxes overlapped in the corner, faces and copings in one plane.
- Fix (`b62399d7`, `citadel-layout.js` PROM_WALLS, `island.js` buildFlatTown): the south wall starts at the sea wall's
  back (PROM.x0 + 0.08), its coping at the sea coping's edge (`joinW`). Nothing drawn moved but the hidden overlap: the
  union of the colliders and `flatClear` are the same (the sea wall's box covers the corner); `world.js` reads only the
  south wall's z1. After: worldfit's (3) PASS, Citadel's listed z-fights back to v141's 25 (all < 0.15 m², not judged).
- Re-run after it: worldfit (the sill only, §2.4), prom-edge 19/19, slidetraps 5/5, overlap-sweep 1 + 5/5, place-scan
  `ONLY=citadel` 3/3.

### 2.2 camclear: the Follow camera at the water main (C66, v147) — fixed
- Found: of 508 placements on the plateau, one, Twinsen at (−62, −18) facing east: the Follow camera (Far, the default)
  at (−71.43, 8.85, −18.0), 0.118 m from the main's tube. In the picture (`tests/out/ft4/pics/v147-cliff-spot.png`) the
  meter cabinet's lid and the pipe fill the lower third of the view.
- A/B, camclear `PART=b` (HEAD's test): pre-P100 (`af6baba8~1`) PASS, v141 PASS, v142 PASS, v146 PASS, v147 FAIL.
  Introduced by C66 (`03713aa6`): the cabinet moved 0.8 m east (PIPE_METER x −71.2), so the main's last run, from the
  profile's end (−72.4, −18.6) to the cabinet, became a slant that passes 0.42 m from that camera spot's line (0.12 m
  from the tube's surface); before, to x −72.0, 0.80 m. That run was never one of the camera's own volumes
  (`pipeVolumes` covered the drawn profile only).
- Fix (`b62399d7`, `island.js` buildPipeline): the slant as the camera's own volume (`pipeVolumes`, as the rest of the
  tube; BUG-WALL's way). After: camera at (−70.42, 8.62, −18.0), the cabinet out of the view
  (`pics/fixed-cliff-spot.png`); camclear **15/15 + 32/32**, twice.
- Tried first and dropped: the slant **and** the riser down into the cabinet as volumes. camclear passed, but camsteady's
  default order failed "follow (medium) · street, Modern controls … 4.12 m on a frame where it was kept out of a wall"
  (an "oversee" keep entry at (−66, −11.5): Modern controls follow the camera, so the route's path changed). With the
  slant alone that check passed in all four runs.
- Re-run after the final fix: camsteady default order ×3 (111/112 — 1 = follow (medium) street "still behind him once he
  has stood", after a 13.5 s stand; 110/111 — 1 = follow · harbour pier heading reversals 12.2/min > 8.7, KNOWN-FAILING's
  row; 111/111), `MODES=follow,lba,free` 110/110, camfollow 31/31, controls 92/92, occluders 1 + 34/34, camcover 12/12.
  §2.3 for why the two single checks are the order's spread and not this fix.

### 2.3 camsteady's default order: run-to-run spread (no change)
The same build gives different single failures from run to run (Modern controls follow the camera; the bot's route
changes with it):

| Build | Run | Result |
|---|---|---|
| v147 (unchanged) | this pass's first | 110/110 |
| v147 (unchanged) | A/B a | 110/110 |
| v147 (unchanged) | A/B b | 110/112: follow (medium) · street and square "still behind him once he has stood" (6.96° > 3, 1.04 m > 1); follow · street, Modern "turns only as he turns" (100.9 > 99.2/min) |
| v147 + `b62399d7` | three runs | 111/112 (the medium street's "still behind", as v147's b), 110/111 (the pier, KNOWN-FAILING), 111/111 |

So "still behind him once he has stood" and the Modern street's reversals fail on v147 itself: (d), the order's spread,
as KNOWN-FAILING already says for the pier. `MODES=follow,lba,free` passed in both runs here.

### 2.4 worldfit (1): the shop's door sill under the ground (FLAT-TOWN, v142) — **open, for the user**
- Found: `house shop` (Pippa's shop, x −30, z 0.5, its door facing west onto the square): the ground 0.45–0.95 m before
  its door is 0.17–0.24 m over the floor (2.43); 1.5 m out it is the square's platform, 2.72. v141: the street flat at
  2.20, the floor at 2.33 (sill 0.13 over it). v142 (FLAT-TOWN) raised the square inside its old kerb ring to +0.42 with
  two 0.21 m steps round it, and those steps now begin at the shop's doorstep; the house rose only 0.10 m
  (its floor follows the ground at the door). Probe: `tests/out/ft4/probe-shop.mjs`.
- What a player sees (`pics/fixed-shop-door-front.png` vs `pics/v141-shop-door-front.png`): the plinth's pale band is
  gone under the paving and the door's foot sits in it; the plaza's ring edge runs past a metre from the wall.
- Not fixed: every fix is a visible world change (the shop raised ~0.25 m onto the platform's level, a landing cut
  into the steps before its door, or the plaza's ring kept off its front), which the user approves. The door works
  (shops 31/31, citadel-structures 7/7).

## 3. The campaign chain (tests/playthrough 01 → 14)
A new game (`?nocine`, `ASSIST=1`), each segment ending in the game's Save & quit, the next from the title's Continue
(`LOAD`/`KEEP`, `tests/lib/seg.mjs`). 01–12b chained; 13 from `base-13` (its origin rewritten to port 8263); 14 from
13's save. On the fixed build (`b62399d7`).

| Seg | Chapter | Result | Time | Game Overs | ISO assists |
|---|---|---|---|---|---|
| 01 | 1 The Well (surface, the yard) | **PASS** | 5 min | 0 | 0 |
| 02 | 1 (the cave) | **PASS** | 3 min | 0 | 0 |
| 03 | 2 The Joint Project (the ferry) | **PASS** | 3 min | 0 | 0 |
| 04 | 2 (the valves, the depot) | **PASS** | 8 min | 0 | 0 |
| 05 | 2 (pump room, Zoé, Vesk, the ship) | **PASS** | 5 min | 0 | 0 |
| 06 | 3 Zeelich | **PASS** | 8 min | 0 | 1 (the depot fight, below 3 HP, as in every chain since the audit) |
| 07 | 4 The Dig | **PASS** | 5 min | 0 | 0 |
| 08 | 5 Steam and Sand | **PASS** | 4 min | 0 | 0 |
| 09 | 6 The Pass (the tree, then its prop) | **PASS** | 5 min | 0 | 0 |
| 10 | 7 The Observatory | **PASS** | 4 min | 0 | 0 |
| 11 | 8 Evacuation | **PASS** | 7 min | 0 | 0 |
| 12 | 9 The Council | **PASS** | 7 min | 0 | 0 |
| 12b | 10 Borrowed Time | **PASS** | 5 min | 0 | 0 |
| (11 Ballastra, 12 House of Balances, 13 Cradles) | no segments: exp-ballastra 33/33, exp-balances 37/37, exp-throttle 28/28 above | | | | |
| 13 | 11 Baldino's Network (from `base-13`) | **PASS** | 8 min | 0 | 0 |
| 14 | 12 The Shell → 13 The Core → epilogue (from 13's save) | **PASS**: the drain shut, the galleries, Sendell, the core, Vesk's choice, "The End", Keep Exploring | 5 min | 0 | 0 |

**15/15 segments PASS first time**, by input, 15 Save & quits and 14 Continues (13 started from its fixture), 0 Game
Overs, 1 ISO assist (segment 06's depot fight), no page error (the text-overflow census runs only with SHOTS: not run). Logs `tests/out/ft4/logs/pt-*.txt`,
saves and traces `tests/out/ft4/chain/`. 12:07–13:30 UTC, with another session's browser on the machine (load 8–9).

## 4. Pictures looked at (Automated runtime only)
- char-form (`tests/out/ft4/char-form/`): Twinsen and Zoé read as one body at play distance. Two framing notes on the
  test, not the models: `04-play-run-athletic` shows him standing beside Zoé at the talk prompt, not running; `06-close-
  twinsen-34` is a high, far view, not a close-up (the Far default, P100, applies to the test's shots too).
- The camclear spot and the shop door, before/after: §2.2, §2.4 (`tests/out/ft4/pics/`).

## 5. Not run, and what remains unverified
- The diagnostics outside the brief: `hidden-tris` (~45 min), `smooth-routes`, `p79-perf`; older single-topic suites
  outside FULL-TEST-22-11's table and the brief's list (chapter6, townlife, door-sweep, solidnpc and the like).
- 22.11's face-3 A/B ×4: not needed, face-3 passed both runs on v147.
- The chain's text-overflow census (it runs only with SHOTS).
- The machine was restarted at ~16:01 (between the last re-runs): the tmpfs A/B builds in `/dev/shm/ft4b/` are gone; the
  logs in `tests/out/ft4/` are kept.
- Any frame time on a real GPU (SwiftShader only). The look of the C66 cabinet and FLAT-TOWN's corner from the user's
  own camera was not judged beyond the pictures named here.

## 6. Later commits on the branch (not tested here)
`ccr-c1c2c4b9-dep6ed` moved on after v147 while this ran (to `c5b9e730`). This test stays on the frozen v147 (+ the two
fixes). The later commits that touch code or assets these suites cover, and which suites to repeat on them:

| Commit(s) | What changed | Suites it touches |
|---|---|---|
| `7c7422cc` (v148, the user's picks) | Twinsen's hair: the spline lock with its tie by default (`characters.js` LOOK; `?look=old` the balls) | char-form, twinsen-zoe-look, twinsen-back-look, faces, p79-faces, face-2, face-2-tour, face-3, anim-polish (all pictures of him) |
| `7c7422cc` | Citadel's walls: the fort's stone (`c`) by default (`island.js` WALL_LOOK; `?wall=old` the rubble) | worldfit (its z-fighting judges how the two surfaces look), overlap-sweep, occluders, place-scan's views, camclear's pictures. `island.js` also carries this test's fix: different hunks, it should merge without a conflict; worldfit should be run on the merge |
| `ef641cc7`, `b977c44a`, `f39a18a9`, `9c1639ae` (JOINTS-BLENDER 8, 31 poly models) | Arthur's knee and hem, Baldino's knees, the cast's sleeve dome 5 cm lower, the Sphero's elbow | campaign-hands (hands at handles: Arthur, Ilka, Dallan, Mira… measured on the drawn surface), char-form, anim-polish, face-2-tour, solidnpc, npc-feet |
| `642ec4d7` (LBA3-RUN wave 1, story) | `network.js`: the station lit and running, Baldino's needle line (c10_bal_needle, EN+HE); text for the B-8 scene and Sendell's journal line (answer, ballastra, ch10; he-text) | dialogue-check, hebrew, campaign-thread M/N/O (the network, the journal's counts), playthrough 13–14, exp-ballastra, exp-balances (its test changed in the same commit), world-consistency |
| `c5b9e730` (P110) | The shop panel keeps one size (`hud.js`, `css/style.css`; shop-ui gains a check) | shop-ui, shops, arsenal, ui-p92 |

## 7. src files changed (for publishing)
- `lba3/src/game/citadel-layout.js` (PROM_WALLS: the south wall from the sea wall's back, `joinW`)
- `lba3/src/game/island.js` (buildFlatTown: the coping's west edge for `joinW`; buildPipeline: the slant to the meter as
  the camera's own volume)
- Tests (not shipped): `lba3/tests/campaign-thread.mjs` (C8, O4).
