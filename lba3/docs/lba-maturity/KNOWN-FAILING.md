# Known failing checks (F-13, A-13)

(21.11, TEST-DEBT: `slidetraps` and `camclear` rows added; what it fixed is under "Fixed by TEST-DEBT".)
(22.11, CAM-HANDBACK / CAM-EASE, the camera pass: `camfollow` and `camclear` rows fixed and moved to "Fixed by the camera pass"; `camsteady` and `controls` rows annotated.)

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
| `camsteady` | **105/110** (v96 audit; AUDIT-FIX before and after its camera change: 105/110, the same five) | (1) LBA view near the cliffs (the bay to the lighthouse): height reversals 10.6–10.8/min > 8. (2) Free orbit, street, Modern: one jolt of 1,749 m/s² > 1,600. (3) Follow, harbour pier: heading reversals 12.1/min > his own 8.6/min. (4) Follow, street, Modern: heading reversals 103.4/min > his 101.7/min. (5) Follow Medium, street, Modern: height jitter 6–10 > 3 within 0.5 s | (2)–(4) are CAM-STEADY's own "left" list. (1) and (5) passed in CAM-STEADY's final run; CITADEL-ORIG-2 (the bay's ground, the L pier) merged after it: a regression on the cliffs route is not excluded (A-8, not separated). (5) varies run to run (6 to 10 in three runs). Camera pass, 22.11, two full runs on its branch: 104/110 ((1)–(5), plus Follow Far, street, Modern: height jitter 5 > 3) and 106/111 ((1)–(4), plus Follow Medium, street, Modern: "still behind him once he has stood" moved 1.46 m > 1; (5) passed). Both street routes run alone (`MODES=follow ONLY=Modern DIST=far` / `medium`) give identical numbers on the camera before the pass (`47e89797`) and after (105.1 vs 103.4/min, jitter 3, max step 0.55–0.66 m): the street Modern checks follow the order the routes run in, not the camera change | camera (world-polish) |
| `combat` (follow-through) | **76/78** with the dodge row (SMOOTH-1, 21.11: the same on its base and after) | "the follow-through blends into the walk (no arm snap)": maxJump 0.314, layered | Pre-existing (fails identically on the base of SMOOTH-1); not isolated | animation (combat) |
| `controls` | **89/92** | "camera f60 / at the wall f60 / at the wall f30: smooth — no lurch": acceleration p95 12.5 / 14.3 / 12.8 > 12 | The Follow arm's re-centring; unchanged since v75 (F-5). Whether the 12 m/s² budget or the camera changes is the coordinator's decision, still open. Camera pass, 22.11: the same three, the same numbers | camera (world-polish) |
| `worldfit` | **1 visual** (AUDIT-FIX after: openings 5; z-fighting 0, was 38 on v96; floating 0, was 1) | (2) openings: the neighbours' door over a window (−31.1, 3.76, 75.3); Zeelich house 3's window into its corner (2387.8, 8.01, −13.1); Zeelich house 1, house 4 and Baldino's workshop: the door's surround overlaps the wall lantern by 5 cm | The first two are v75's. The lanterns: TECH-ART-1 widened the Zeelich doors' surround (a reveal and a keystone); there is no room between the surround and the window for the lantern's 26 cm (moved 6 cm, it overlapped the window by 4 cm instead: reverted) | world-polish (the lanterns: world-art, a narrower lantern or one on the door's other side) |
| `weather` | **22/23** | "Zeelich keeps its pink-violet in every state and light": at light phase 0.79 (clear) the fog's blue falls under its green (r 0.82, g 0.64, b 0.60) | The evening phase's warm fog tint overrides Zeelich's own; pre-existing (F-12) | world-art (weather) |
| `combat` | **77/78**, intermittent | "dodge distance consistent at 30 and 60 fps": d30 0, d60 1.56 | The 30 fps dodge is the first of the two in the check and sometimes does not start at all (he does not move); a dodge that sometimes does nothing at 30 fps deserves a look before it is filed as noise. Cause not isolated | animation-combat |
| `prologue` | **FAIL, then crashed** (2 of 2 on v96) | "the well's mites beaten with the ball" [4, 4, null]: all four beaten, but he is out of the well (room null); the next check crashes on `G.room.nodes` | A test fault: the check places him round each mite (ISO), and the placements put him out of the well. The chain's segment 02 fights the same mites by input and stays in the well. A new form of the listed intermittent one (12.11, `5d7d1c13`) | the test's author (prologue) |
| `interior-life` | **143/144** | zterminal, chapter 9: Velo at his till "faces 1.48 rad (stop 0)" read 0.8 s into his dwell | Most likely the test's timing: the 11.11 list found the same kind of reading (Ama) was the test looking before STOP-TURN's 1.2 s turn ends; not confirmed for Velo | interior-life |
| `travel` | **26/27** (SPACEPORT-2 and CITADEL-ORIG-2 runs; the same on their base commits) | chapter 2 → 3: "no sky-ferry at Zeelich's dock" | Most likely a stale check (Source): chapter2.js hides the dock's ferry as he lands (PLANET-1: no ferry crosses to Twinsun), but U-1 The Last Ferry's `story/ferry.js` (169) shows Captain Ossel's sky-ferry, laid up, by its own rule; the check (`p2b.ferry === false`) predates U-1. Whether a laid-up ferry at the dock in chapter 3 is wanted is U-1's to say; not rerun by AUDIT-FIX | the test's author (travel), with U-1's owner to confirm |
| `slidetraps` | **4/5** (TEST-DEBT, 21.11, on `f78e5cc6` + the stone house fix; the same spot on the base) | "citadel: 44 slide spots against colliders": one, (−91.67, 44.22), slides into the water's edge at the harbour and is put back on the last safe spot (no life lost) | The quay's south bollard runs (`citadel-layout.js` `bollards`, (−92.8, 42.6) …) stand about 1 m back from the drop: outside them a strip of quay 0.3–0.5 m wide, reachable past the pier railing's north post (a 0.25 m gap, not walked by input). Stepped off it he slides to the water floor and along it; SLIDE-RESCUE's footing (a 0.45 m level ring) fits neither the strip nor the quay behind the rail (the hop is blocked by the rail), so step 3 puts him back. Not fixed: moving the runs to the edge or closing the strip is a layout decision (an invisible collider over drawn quay was rejected) | world-polish |

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
