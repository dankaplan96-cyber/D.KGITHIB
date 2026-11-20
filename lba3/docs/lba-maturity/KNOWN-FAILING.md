# Known failing checks (F-13, A-13)

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
| `combat` | **77/78**, intermittent | "dodge distance consistent at 30 and 60 fps": d30 0, d60 1.56 | The 30 fps dodge is the first of the two in the check and sometimes does not start at all (he does not move); a dodge that sometimes does nothing at 30 fps deserves a look before it is filed as noise. Cause not isolated | animation-combat |
| `prologue` | **FAIL, then crashed** (2 of 2 on v96) | "the well's mites beaten with the ball" [4, 4, null]: all four beaten, but he is out of the well (room null); the next check crashes on `G.room.nodes` | A test fault: the check places him round each mite (ISO), and the placements put him out of the well. The chain's segment 02 fights the same mites by input and stays in the well. A new form of the listed intermittent one (12.11, `5d7d1c13`) | the test's author (prologue) |
| `interior-life` | **143/144** | zterminal, chapter 9: Velo at his till "faces 1.48 rad (stop 0)" read 0.8 s into his dwell | Most likely the test's timing: the 11.11 list found the same kind of reading (Ama) was the test looking before STOP-TURN's 1.2 s turn ends; not confirmed for Velo | interior-life |
| `travel` | **26/27** (SPACEPORT-2 and CITADEL-ORIG-2 runs; the same on their base commits) | chapter 2 → 3: "no sky-ferry at Zeelich's dock" | Most likely a stale check (Source): chapter2.js hides the dock's ferry as he lands (PLANET-1: no ferry crosses to Twinsun), but U-1 The Last Ferry's `story/ferry.js` (169) shows Captain Ossel's sky-ferry, laid up, by its own rule; the check (`p2b.ferry === false`) predates U-1. Whether a laid-up ferry at the dock in chapter 3 is wanted is U-1's to say; not rerun by AUDIT-FIX | the test's author (travel), with U-1's owner to confirm |

## Fixed by AUDIT-FIX (17.11)

| Suite | v96 | After | What |
|---|---|---|---|
| `camcover` | 11/12 | **12/12** | The round and fruit crowns' sight shape is the leaf mass as drawn (A-6) |
| `worldfit` | 3 visual | 1 visual | z-fighting 38 → 0; Doran's shed no longer floats (A-7); the lone posts in the harbour water gone (A-11) |
| the playthrough chain 01–14 | 3 segments stopped on harness faults | see `AUDIT-FIX-v96.md` | A-3 |

## Intermittent, passed on v96

`saveslots` (the slot picture's timeout: 25/25 as committed), `overlaps` (Lhar's roof spots: pass), `sewers` (three
well-house lift checks: 32/32), `sewers-ways` (two out-of-door spots: 34/34).

## Not rerun since v96

`gap-scan` (never run in full: it builds every region a few groups to a page and walks each held slot by input; owner:
the coordinator, on a quiet machine, `BATCH=8`), `door-sweep`, `room-cutaway`, `npc-feet`, `walkers`, `wizards`, `shops`,
`chapter2`–`chapter10` (but `chapter1` and `chapter4`: AUDIT-FIX). Their last known state is RELEASE-AUDIT-v75's.
