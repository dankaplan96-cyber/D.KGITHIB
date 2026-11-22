# Known failing checks (F-13, A-13)

(21.11, TEST-DEBT: `slidetraps` and `camclear` rows added; what it fixed is under "Fixed by TEST-DEBT".)

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
| `camsteady` | **105/110** (v96 audit; AUDIT-FIX before and after its camera change: 105/110, the same five) | (1) LBA view near the cliffs (the bay to the lighthouse): height reversals 10.6–10.8/min > 8. (2) Free orbit, street, Modern: one jolt of 1,749 m/s² > 1,600. (3) Follow, harbour pier: heading reversals 12.1/min > his own 8.6/min. (4) Follow, street, Modern: heading reversals 103.4/min > his 101.7/min. (5) Follow Medium, street, Modern: height jitter 6–10 > 3 within 0.5 s | (2)–(4) are CAM-STEADY's own "left" list. (1) and (5) passed in CAM-STEADY's final run; CITADEL-ORIG-2 (the bay's ground, the L pier) merged after it: a regression on the cliffs route is not excluded (A-8, not separated). (5) varies run to run (6 to 10 in three runs) | camera (world-polish) |
| `camfollow` | **30/31** (AUDIT-FIX, on its base and after its camera change: the same check, the same numbers) | "Follow, a full turn on the spot by the wall: never inside anything, he is always seen": unseen 1 frame (camera (−66.0, 6.9, 8.8), him (−65.4, 2.4, 11.0)), max 2.83° a frame | Not isolated; not caused by AUDIT-FIX (fails the same on `20b5da55`). Not in the v96 audit's run (camfollow was not rerun there) | camera (world-polish) |
| `controls` | **89/92** | "camera f60 / at the wall f60 / at the wall f30: smooth — no lurch": acceleration p95 12.5 / 14.3 / 12.8 > 12 | The Follow arm's re-centring; unchanged since v75 (F-5). Whether the 12 m/s² budget or the camera changes is the coordinator's decision, still open | camera (world-polish) |
| `worldfit` | **1 visual** (AUDIT-FIX after: openings 5; z-fighting 0, was 38 on v96; floating 0, was 1) | (2) openings: the neighbours' door over a window (−31.1, 3.76, 75.3); Zeelich house 3's window into its corner (2387.8, 8.01, −13.1); Zeelich house 1, house 4 and Baldino's workshop: the door's surround overlaps the wall lantern by 5 cm | The first two are v75's. The lanterns: TECH-ART-1 widened the Zeelich doors' surround (a reveal and a keystone); there is no room between the surround and the window for the lantern's 26 cm (moved 6 cm, it overlapped the window by 4 cm instead: reverted) | world-polish (the lanterns: world-art, a narrower lantern or one on the door's other side) |
| `weather` | **22/23** | "Zeelich keeps its pink-violet in every state and light": at light phase 0.79 (clear) the fog's blue falls under its green (r 0.82, g 0.64, b 0.60) | The evening phase's warm fog tint overrides Zeelich's own; pre-existing (F-12) | world-art (weather) |
| `prologue` | **FAIL, then crashed** (2 of 2 on v96) | "the well's mites beaten with the ball" [4, 4, null]: all four beaten, but he is out of the well (room null); the next check crashes on `G.room.nodes` | A test fault: the check places him round each mite (ISO), and the placements put him out of the well. The chain's segment 02 fights the same mites by input and stays in the well. A new form of the listed intermittent one (12.11, `5d7d1c13`) | the test's author (prologue) |
| `interior-life` | **143/144** | zterminal, chapter 9: Velo at his till "faces 1.48 rad (stop 0)" read 0.8 s into his dwell | Most likely the test's timing: the 11.11 list found the same kind of reading (Ama) was the test looking before STOP-TURN's 1.2 s turn ends; not confirmed for Velo | interior-life |
| `travel` | **26/27** (SPACEPORT-2 and CITADEL-ORIG-2 runs; the same on their base commits) | chapter 2 → 3: "no sky-ferry at Zeelich's dock" | Most likely a stale check (Source): chapter2.js hides the dock's ferry as he lands (PLANET-1: no ferry crosses to Twinsun), but U-1 The Last Ferry's `story/ferry.js` (169) shows Captain Ossel's sky-ferry, laid up, by its own rule; the check (`p2b.ferry === false`) predates U-1. Whether a laid-up ferry at the dock in chapter 3 is wanted is U-1's to say; not rerun by AUDIT-FIX | the test's author (travel), with U-1's owner to confirm |
| ~~`slidetraps`~~ **fixed 22.11 (v126)** | 5/5 now | the harbour strip (−91.67, 44.22) | OVERLAP-3 moved the south bollard runs to the brink (z 43.0); HARBOUR-BRINK levelled the ground under the paving in `world.js` (no grid point inside a built wall face lowered, the bank sunk to meet the sea 0.1 m past it) and gave the five platform wall runs a walkable top in `island.js`; the scan spot is sea now. Automated runtime only | — |
| `camclear` | **1 visual FAIL** (TEST-DEBT, 21.11: the full run before its test fix 30 PASS, 2 functional + 1 visual FAIL; after it `ONLY=ch6` and `ONLY=ch8` PASS, `ONLY=ch10` the same visual FAIL; the full suite not rerun) | [>ch2] "ch10 the network: the north mill braked — Twinsen on screen and seen afterwards": after Oku's line the Follow camera at (2395.8, 8.6, −14.2) still faces Oku; Twinsen at (2393.2, 6.0, −18.4) is out of frame (screen position 88, 61) | A camera release after a talk in Follow (not the test's: the event fires by input, nothing else is set up). `src/engine/camera.js` was another worker's tonight: not touched | camera (P94 / world-polish) |

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

## Intermittent, passed on v96

`saveslots` (the slot picture's timeout: 25/25 as committed), `overlaps` (Lhar's roof spots: pass), `sewers` (three
well-house lift checks: 32/32), `sewers-ways` (two out-of-door spots: 34/34).

## Not rerun since v96

`gap-scan` (never run in full: it builds every region a few groups to a page and walks each held slot by input; owner:
the coordinator, on a quiet machine, `BATCH=8`), `door-sweep`, `room-cutaway`, `npc-feet`, `walkers`, `wizards`, `shops`,
`chapter2`–`chapter10` (but `chapter1` and `chapter4`: AUDIT-FIX). Their last known state is RELEASE-AUDIT-v75's.

## tests/jumpreach.mjs — "Zeelich's old mill" (found 19.11)
Up the mill's 7 stair-stones to the gallery by jumps: the bot is stuck at 12.56 m on the hop onto the gallery (heights
7.09 … 11.47, 12.56, 12.56, then falls back). **Fails identically on v99 (ba62aa2c)** and on today's build with the old
or new physics.js (FPS30): not caused by v100/v101's work. Open: the gallery's lip vs the last stone (a world fix).
