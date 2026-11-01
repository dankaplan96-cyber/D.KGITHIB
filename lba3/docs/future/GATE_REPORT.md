# GATE-1: base game against the expansion brief's entry gate

Task GATE-1, run 2026-11-01 by the release-audit agent. It checks the six evidence items of
`docs/future/EXPANSION_BRIEF.md` section 2. The expansion's planet is Ballastra (called "Nera" in the brief; see
`docs/art-direction/EXPANSION_ART_DECISIONS.md` D6).

The user plays chapters 1 and 2 only. This report names later chapters by number and mechanism, never by plot.
B-1 names one chapter-10 place and the two people standing there; that is needed to fix it. `gate-logs/` holds raw
logs with chapter 3–12 text, so it is marked as spoilers. No screenshots of chapters 3 to 12 were taken into the
repository.

**Update, GATE-FIX (same day, later):** B-1 and T-1 are fixed on `18c7043`, and the whole chain was run again on it
without W-1, W-2 or ISO moves. Gate items 1, 2, 3, 4 and 6 now pass in the tested scope. Item 5 is still UNVERIFIED,
so the gate is still not passed. See "GATE-FIX re-run" below. The rest of this report is the first audit, on
`0f77b57`.

## Verdict

**GATE NOT PASSED. The expansion cannot start yet.**

The game can be played from New Game to the ending and into Keep Exploring. But one route-blocking defect was found
in chapter 10 (B-1 below). The full route got past it only with a debug move (ISO). Performance on the target laptop
and a visual review by a person are still not evidenced, because this container renders in software and the laptop's
Test Lab is disconnected.

| # | Gate item (brief section 2) | Verdict | Why |
|---|---|---|---|
| 1 | Normal new-game route: all chapters, the core, the ending, postgame | **FAIL** | All 14 segments were chained through real saves: chapters 1 to 12, the epilogue and Keep Exploring. Segment 13 (chapter 10) needed two ISO moves of Zoé and Arthur at the lighthouse (B-1). Two fights were finished by the harness's declared ISO fight assist (segments 06 and 13). These are bot-skill limits, already listed in QA.md as human-playtest items, not defects. |
| 2 | Reliable saves and reloads at chapter boundaries and mid-quest | **PASS** (tested scope) | 13 Save & quit → Continue hand-offs in the chain, each at a segment boundary: 0 failures, Continue resumed every time. The postgame save resumes in free roam. saveslots, save-migration, zoe-resume, resume and well-town all PASS. See the save table below. |
| 3 | No known progression blockers, crashes, lost mandatory items or broken mandatory interactions | **FAIL** | B-1 is a progression blocker in chapter 10. No crash or page error was seen in any run. No mandatory item was lost. |
| 4 | Movement, ball aiming, combat, cutscenes, transitions, supported inputs | **PASS** (automated scope) | controls, combat, anim-combat, transitions, opening, menus, stability and crosssystem all PASS, plus the movement and fights of the whole chain. Feel by hand, gamepad, touch and audio need a person: UNVERIFIED here. |
| 5 | Representative visual review and measured performance on the declared target | **UNVERIFIED** | The declared target is the user's AMD Vega 8 laptop at 1366×768, 60 Hz, 55–60 fps (RUN_STATE.md, ISSUES I-13). This container renders with SwiftShader, so no fps or GPU time is claimed. The Test Lab on the laptop is disconnected. perfbudget and drawcalls give counts only (below). No person has done a visual review of this build. |
| 6 | Recorded base commit/build, known-issues list, reproducible procedure | **PASS** | This file. |

## GATE-FIX re-run

Task GATE-FIX, 2026-11-01, 21:50–23:55 UTC. It fixed B-1 and T-1 and ran the chain again.

### Candidate

| Field | Value |
|---|---|
| Commit | `18c7043` on top of `4636bd1` (the branch head when this task started, LBA-CITADEL-1…6 included). `18c7043` holds both fixes; `eb92bbe` holds T-1 alone. The docs commit after it changes no game or test file. |
| Game version | 0.48.0, save format 5 (unchanged) |
| Source, server | `git archive 18c7043 lba3` in /dev/shm. The chain was served by `python3 -m http.server` on 8772 and the tests on 8773. Commands: `gate-logs/gatefix/tools/commands.sh`. |
| Browser, machine | Playwright 1.56.1, headless Chromium, SwiftShader (software). Same 4-core container as GATE-1, shared with other sessions (load average 10–15). Wall times are not performance data. |

### The fixes

**B-1, fixed (`src/game/story/network.js`).** The lamp room is a ring round the lens. From the stair top, the only way
to the dial bank is the west side, between the lens and the keeper's desk and microphone. That gap is one person
wide, and Zoé and Arthur stood in it.
- Their chapter-10 spots, and the relay's, now come from one table (`LIGHT_CAST`). They stand on the east side by the
  stair top, against the low rim: Arthur at 86° and 2.45 m from the lens, Zoé at 64° and 2.3 m, and the relay at
  108°, beside the stairs.
- Both face the transmitter's middle dial. Arthur sees the needle past the lens, and Zoé is beside him. The hero
  meets them as he comes up.
- The way round, the stair top and the way down stay free:
  - The occupancy map (`gatefix/probe-lamproom-map.txt`) has every dial within 0.1 m of a reachable cell, with the
    people standing as placed.
  - Their bodies are clear of every collider. The edge of the rope coil on the floor is about 7 cm inside Zoé's body
    circle, at her feet.
  - The narrowest gap left for the hero, between Zoé and the lens, is about 0.4 m wider than he is.
- The relay used to stand in the west gap, where a player walked through it. It now stands beside the stairs.
- No player text changed. Chapter 2's lamp room is not affected: Zoé is not there while the hero sets the dials.
- I looked at both moments by eye, from screenshots kept out of the repository: the arrival, and the hero at the
  dials with the two of them watching from the stair top.

**B-1's check (`tests/chapter10.mjs`).** From the stair top, the test now does the lamp room by input
(`tests/lib/player.js`: keys, the game's time step, A* over its collision, no teleport):
- the talk with Zoé;
- each of the three dials: walk there past the two of them and press E once, and the dial must turn;
- the code;
- the way back down the stairs after the cast is put back on its spots.

The old check "at the middle dial, facing Zoé, E is hers" (REV-TY-5 T1) now runs only when a dial is within her talk
reach. None is now, and the test records that.

The new test was also run on the game before the fix (`gatefix/t-chapter10-newcheck-on-old-spots-FAIL.log`). There
it fails as B-1 says: no dial is reached, and the prompt stays on Zoé.

**T-1, fixed (`tests/lib/player.js`).**
- `P.settle` now records who spoke each line.
- When a dialogue opens before `P.talk` presses E, and nobody heard in it is the person asked for, `P.talk` reads it
  to the end and talks to them again (at most twice, by input). An unnamed voice such as the radio counts as unknown,
  so that dialogue counts as before. The result lists what was skipped.
- In segment 01 it skipped the hero's 2-line crystal remark, and Mira then gave the key.
- In the rest of the chain it never triggered (the traces have no other "opened on the way").
- This also closes ISSUES I-18: prologue.mjs now beats the well's mites 4/4.

**Other chapters (the B-1 scan).** `gatefix/tools/scan-cast.mjs` loaded each kept save, 01 to 14, and entered every
interior. Saves 01–05 came from an earlier run on `eb92bbe`, where chapters 1–3 are the same code. In each scene it placed the cast and set the hero on a 0.15 m grid. At each point it listed every
interactive thing whose prompt is in reach, and it tested which points the hero can reach from the scene's spawn and
exits (outdoors: from the edge of a 10 m box round each story person), with and without the people.
- It covered 88 scenes with story people in them.
- **No thing was shut off by people (BLOCKED: 0).**
- Things with a person within 1 m of their use area, all still usable from most of it:
  - A trader beside her trading case (chapter 3 on): 245 → 200 cells. This is the I-19 case, already fixed.
  - A craftsman beside his workbench (chapter 3 on): 50 → 33 cells.
  - A resident at a pump in Citadel.
  - Zoé and Arthur by the conch at home.
  - Three people by the ferry (chapter 8).
  - A pilot by his glider (chapter 6).
  - Residents of the second region by the notes and hatches there.

  The names are in the scan files (`gatefix/scans/`, spoilers).
- No change was needed.
- Limits: the scan sees each chapter as it stands at a segment boundary, not every mid-chapter placement. Outdoors it
  sees only things within 5 m of a story person.
- The chain itself is the other half of the evidence: every mandatory interaction of chapters 1–12 was reached by
  input.

### Per-segment verdicts (`18c7043`, chained through real saves)

| Seg. | Result | ISO | Notes |
|---|---|---|---|
| 01 | PASS, unmodified (no W-1) | 0 | the crystal's remark was read, then Mira gave the key (T-1) |
| 02 – 05 | PASS | 0 | |
| 06 | PASS | the segment's own fight assist | depot fight, 4 enemies, as in GATE-1 |
| 07 – 10 | PASS | 0 | |
| 11 | **FAIL twice**, then PASS with `ASSIST=1` | 1 fight assist (5 enemies) | See below. |
| 12 | PASS | 0 | |
| 13 | **PASS, unmodified (no W-2, no ISO move)** | the segment's own fight assists (bore: 1 drone, then 2 guards) | "the dials": the code [2,0,1] set by input on the first passes, the relay lit, then out of the lamp room and on by glider |
| 14 | PASS | 0 | chapters 11, 12, the epilogue, Keep Exploring |
| postgame | PASS | — | Continue from the save after Keep Exploring: chapter `home`, "Explore Citadel Island", out of the house into Citadel (`gatefix/probe-postgame.log`) |

Segment 11, the two failed runs:
- The bot reached the chapter-8 fortress fight with 8 HP, against 9 in GATE-1. Its hit points differ from segment 04
  on; the GATE-1 report expected the 40 commits since `0f77b57` to change chapter 1–2 routes.
- It went down in that fight. A clover revived it, and a knock-back carried it through the control-room door, so the
  lever step stopped.
- The second run went the same way.
- It then passed with the harness's declared fight assist (`ASSIST=1`, logged as ISO). This is a bot-skill limit of
  the same kind as T-2, not a progression blocker.
- New compared with GATE-1: this fight now needs the assist for the bot.
- A human playtest of the chapter-8 fortress fight is wanted. A player knocked through a door in mid-fight is a feel
  issue to look at, not a blocker.

Every segment that ran to its end, the failed runs included, reported no page errors, no console errors and no
missing files. The saves were handed on 13 times by Save & quit → Continue (01→…→14); save 10 was continued 3 times
for segment 11. All of them resumed.

### Other tests on `18c7043` (port 8773, one at a time)

| Test | Result |
|---|---|
| chapter10 | PASS 25/25, including the three new input checks (B-1) |
| chapter1 | PASS 23/23 |
| prologue | PASS 26/26 (the well's mites 4/4: I-18) |
| controls | PASS 92/92 |
| transitions | PASS 6/6 |
| saveslots | PASS 25/25 |

No test reported page errors, console errors or missing files. Logs: `gate-logs/gatefix/t-*.log`. The other GATE-1
tests (combat, anim-combat, opening, menus, stability, crosssystem, save-migration, zoe-resume, resume, well-town,
perfbudget, drawcalls) were not rerun. Neither fix touches their code.

### Gate items after GATE-FIX

| # | Gate item | Verdict | Why |
|---|---|---|---|
| 1 | Normal new-game route | **PASS** (automated, with declared fight assists) | 01→14 and the postgame on one commit, unmodified segments, no W-1/W-2, no ISO move, no story flag set. Fight assists: 06 and 13 (their own, as before) and 11 (`ASSIST=1`, new). |
| 2 | Saves and reloads | **PASS** (tested scope) | 13 chain hand-offs plus 2 extra Continues of save 10; the postgame Continue; saveslots PASS 25/25. The other save tests passed on `0f77b57` and were not rerun. |
| 3 | No known progression blockers | **PASS** (known scope) | B-1 fixed and checked by input, both in chapter10 and in segment 13. The cast scan found no other blocker. No crash or page error. |
| 4 | Movement, ball, combat, cutscenes, transitions, inputs | **PASS** (automated scope) | controls and transitions rerun and PASS, plus the whole chain. Feel by hand, pad, touch and audio: UNVERIFIED, as before. |
| 5 | Visual review and measured performance on the declared target | **UNVERIFIED** | Unchanged: SwiftShader only, no fps or GPU-time claim. It needs the Vega 8 laptop (in-game benchmark or Test Lab) and one visual pass by the user. |
| 6 | Recorded build, known issues, procedure | **PASS** | This section and `gate-logs/gatefix/`. |

**Verdict after GATE-FIX: GATE NOT PASSED. Only item 5 is open.** It cannot be closed from this container.

Known issues changed by GATE-FIX:
- B-1: fixed.
- T-1 and I-18: fixed (test bot).
- STORY_BIBLE's chapter table: corrected. Chapters 9 and 10 are built, and the core has three pylons.
- New: the bot needs the fight assist for the chapter-8 fortress fight (segment 11). Its balance for a person is
  untested, like the depot and bore fights (T-2).

## Candidate

| Field | Value |
|---|---|
| Branch / commit | `ccr-adf00ea7-37ebl3` at `0f77b573b93864cd1f1e66f5dabdd1cceb368af8` (fetched 2026-11-01 16:15 UTC). Its message says "Verification running": the WA-12 fix was still being verified by another session when this audit froze it. |
| Game version | 0.48.0 (`src/main.js` VERSION, `desktop/package.json`); save format 5 |
| Source used | `git archive 0f77b573 lba3`, unpacked to a RAM disk, `node_modules` symlinked from the main checkout. No dirty diff. |
| Served by | `python3 -m http.server 8750 --bind 127.0.0.1 --directory <snapshot>/lba3` (browser build, not the packaged desktop app) |
| Browser | Playwright 1.56.1, headless Chromium (headless_shell 1194), WebGL through ANGLE/SwiftShader (software) |
| Machine | 4-core Intel Xeon 2.1 GHz container, Linux 6.18, Node 22.22.0, Python 3.13. The machine was shared with other sessions' test runs (load average 6–13), so wall times are long and are not performance data. |
| Packaged app | Not built or run here (NOT TESTED). |
| Drift during the audit | By the end (20:55 UTC) the branch had moved to `803a99d`, 40 commits later. Those commits add Citadel interiors (LBA-CITADEL-1…6), a walker round (WA-15b), and the expansion split docs (`EXPANSION_WORLD_SPEC.md`, `LOCAL_EXPANSION_PROMPT.md`; docs only). None of them touches `story/network.js`, `interiors.js`, `containers.js`, `tests/lib/player.js` or `tests/playthrough/`, so B-1 and T-1 are expected to be unchanged there. All the evidence here is for `0f77b57` only. `803a99d` is untested, and its Citadel changes touch chapter 1–2 routes, so segments 01–05 would need a rerun. |

## Gate item 1: the playthrough chain

The procedure is `tests/lib/seg.mjs` on `tests/playthrough/01…14`. Each segment continues from the previous
segment's save, made with Esc → Save & quit → Continue (`LOAD=`/`KEEP=`). Without `ASSIST=1` the harness plays by
input only: keys, the game's own time step, A* over the game's collision. The exception is that segments 06 and 13
call `P.assistFight` themselves when the bot is down to 2 HP; that is a declared ISO assist. No segment sets story
flags. Segment 14 can place the hero across the stepping stones only under `ASSIST`, so that was not used.

| Seg. | Chapter (number only) | Result | Deaths | ISO | Notes |
|---|---|---|---|---|---|
| 01 | 1 (town) | PASS, with harness workaround W-1 | 0 | 0 | The unmodified segment stops at "Mira: the key" (twice, deterministic): see T-1 |
| 02 | 1 (cave) | PASS | 0 | 0 | |
| 03 | 2 | PASS | 0 | 0 | |
| 04 | 2 | PASS | 0 | 0 | |
| 05 | 2 → 3 | PASS | 0 | 0 | |
| 06 | 3 → 4 | PASS | 0 | 1 fight assist | depot fight: bot at 2 HP, 3 enemies finished by assist (as in every earlier run, QA.md) |
| 07 | 4 | PASS | 0 | 0 | |
| 08 | 5 | PASS | 0 | 0 | |
| 09 | 6 | PASS | 0 | 0 | |
| 10 | 7 | PASS | 0 | 0 | |
| 11 | 8 | PASS | 0 | 0 | |
| 12 | 9 | PASS | 0 | 0 | |
| 13 | 10 → 11 | **FAIL as is**; PASS with workaround W-2 (2 ISO moves) | 0 | 2 ISO moves + 1 fight assist | B-1. The bore fight: bot at 1 HP, 2 enemies finished by assist |
| 14 | 11, 12, epilogue, Keep Exploring | PASS | 0 | 0 | The stepping stones and the coil were done by input this time |
| — | postgame | PASS | — | — | Continue from the save kept after Keep Exploring: chapter `home`, objective "Explore Citadel Island", out of the house, across town, a conversation (probe-postgame) |

Every segment that ran to the end reported no page errors, no console errors and no missing files.

Bot game time over the 14 segments is about 75 minutes, measured from the trace stamps. It is not a player
duration: the bot walks straight to every goal and skips optional content. The 12-chapter, 3–5 hour claim (brief
appendix) and the story bible's 10-hour target are **unvalidated**. No first-time player has timed a run.

Harness workarounds used to carry the chain on. None of them changes the game or `tests/`. They are kept under
`docs/future/gate-logs/tools/`:

- **W-1** (`seg01-gate.mjs`): if the first Mira talk ends without the key, finish the open line and talk to Mira
  again. Input only.
- **W-2** (`seg13-gate.mjs`): before the dials, and again before leaving, move Zoé and Arthur 3 m west (ISO). Then
  set the dials by input: walk to each dial's spot and press E until it shows its symbol.

## Gate item 2: saves

| Check | Evidence | Result |
|---|---|---|
| Save & quit → Continue at every segment boundary of the chain: 10 chapter boundaries (1→2, 2→3 … 10→11) and 3 mid-chapter states (chapter 1 in the cave; chapter 2 after the pipe map, after the valves). Continue resumed in the right chapter, room and objective each time. The chapter 9→10 save was resumed 4 times while B-1 was investigated. | chain logs (first line of each segment) | PASS (13 hand-offs) |
| Continue from the postgame save | probe-postgame | PASS |
| saveslots (six slots, Save Game / Load Game, Continue = newest, Delete, New Game keeps slots, full storage) | t-saveslots.log | PASS (25/25) |
| save-migration (v1 upgrade + backup, missing room, corrupt save set aside, format-4 → shell/core split) | t-save-migration.log | PASS (8/8; 1 console error provoked and declared by the test) |
| zoe-resume (chapter 2 office segment, D5) | t-zoe-resume.log | PASS (5/5) |
| resume (story scenes started on room entry, D16/D17) | t-resume.log | PASS (2/2) |
| well-town (chapter 1 town steps, Save → Continue at each new step, an old save) | t-well-town.log | PASS (32/32) |

Not covered: saving during every mid-quest state of chapters 3 to 12 (only the segment boundaries). The STATE.md
open item, "Zoé died after finding the plan; after Retry, Zoé gave a 2-line reply", was not reproduced in this run;
no death happened there. It stays open, unexplained.

## Gate item 3: blockers and failing checks

### Player-facing

**B-1: chapter 10, lighthouse top: the transmitter's dials cannot be reached (P1, progression blocker).**
- Reproduce: chapter 10, the lighthouse relay. Climb to the lamp room and talk to Zoé; she asks for the dials. Now
  walk to any of the three dials.
- Expected: the hero reaches the dial bank and turns the dials (E). The right code completes the relay (3/5).
- Actual: Zoé (1598.48, −0.55) and Arthur (1599.76, −0.30) stand between the room and the dial bank. Both are solid
  (body radius 0.45 m), with only about 0.4 m between their bodies; the hero is 0.8 m wide (radius 0.4). A dial
  answers only within 0.65 m of its spot (`network.js` interactables: `s.r + 0.2`), and the hero gets no nearer than
  1.4–1.8 m. The prompt stays on Zoé ("Talk").
  - Segment 13's own step got stuck at (1598.9, 0.2), three passes of replanning.
  - A people-aware plan to each dial's spot found no way. One attempt ended down the stairs.
  - An approach from 24 headings around each dial found no free spot within reach that is reachable.
  - When the two were moved away (ISO), all three dials were reached and turned by input, and the code solved the
    relay at once. So the dials, their code and the chain work.
  - After the relay the cast is put back on its spots, and that shuts the hero in the pocket in front of the cabinet.
    Only two of 16 headings are free there, both toward Arthur. The stairs (1601.41, −1.11) cannot be reached.
- Root cause (likely): the chapter's cast spots (`network.js` npcSpot `zoe` from `lighttop.npcSpots.zoe`, and
  `arthur` worked out from it) date from chapter 10's first version (c2d1fd6, 12.10). Story NPCs have been solid
  since SOLID-NPC (0.37.0, 29.10). The LOGIC test `tests/chapter10.mjs` uses the dials by teleport (`T.useOn`), so it
  cannot see the problem. Playthrough segment 13 had not been rerun since SOLID-NPC.
- Owner: the chapter-10 story file `src/game/story/network.js` (G5 pair). Fix direction: place Zoé and Arthur clear
  of the dial bank and of the path from the stairs, for example beside the cabinet, facing it. Then rerun segment 13
  unmodified. Option: add a people-aware reachability check for the dials to `tests/chapter10.mjs`.
- Evidence: `gate-logs/pt-13-run1-FAIL.log` (and its trace), `probe-dials*.log`, `probe-after-dials.log`,
  `pt-13-network.log` (the pass with W-2).

No other player-facing blocker was seen on the route.

### Test-side problems (not player-facing)

**T-1: segment 01 "Mira: the key" stops with "no key" (harness).**
- Cause: on the walk from Zoé's house to Mira, the route now passes over the life crystal at (−28, 40)
  (`containers.js` CRYSTALS). Picking it up opens a one-line remark ("It hums, like the crystals in the well...") as a
  dialog. `P.talk` takes any dialog that opens during its walk for the conversation, so it never reaches Mira.
- A player picks up the crystal, reads the line and walks on. Mira then gives the key (shown by W-1).
- Probably also the open ISSUES row I-18 ("bot segment 01 stuck before Xil"), seen from a different side.
- Owner: tests (`tests/lib/player.js` `P.talk`: finish an unrelated dialog and try again; or segment 01: pick up the
  crystal first).

**T-2: the bot's fights in segments 06 and 13** are finished by the declared assist below 3 HP. This is known (QA.md,
human-playtest items). Balance for a human player is untested.

### ISSUES.md rows that touch progression

All rows were read. None open is a known progression blocker today.
- **I-18** (pending): the bot's segment 01. See T-1. Test-side.
- **I-17** (pending): a point-blank magic ball flies over a mite or dog at the solid-enemy stop distance. This is
  combat feel and can cost a player HP, but there is always another throw angle.
- **STATE.md, open**: Zoé's death after finding the plan, then Retry. See gate item 2. Unexplained.

## Gate item 4: movement, ball, combat, cutscenes, transitions, inputs

| Test | What it covers | Result |
|---|---|---|
| controls | prompt names the bound key (E, rebound, pad A), pad talk/search in every behaviour, NPC walking | PASS (92/92) |
| combat | arena: input buffer/combo, active frames and single hits, walls, dodge i-frames, the ball at low frame rates (no tunnelling), recall … | PASS (76/76) |
| anim-combat | throw release/contact timing at 30/60/120 fps, planted feet, interruptions | PASS (35/35) |
| transitions | door walk-through, black hold while shaders compile | PASS (6/6) |
| opening | the opening cinematic plays and hands over; skip at three moments ends in the same state | PASS (27/27) |
| menus | menus, pause, settings, focus loss, dialogue input, inventory, holomap, rebinding | PASS (39/39) |
| stability | regression for the stabilisation defects (D1–D18) | PASS (16/16) |
| crosssystem | system-boundary cases (QA.md §Cross-system) | PASS (10/10) |
| chapter10 (LOGIC) | chapter 10 step by step, moving between steps by teleport | PASS (23/23). It passes **over** B-1, because it uses the dials by teleport: a LOGIC pass is not route evidence |
| playthrough 01–14 | movement, jumps (Athletic), Discreet, the ball on targets, fights, every story transition, spaceship, ferry, glider | PASS, with B-1 and the W-1/W-2 workarounds |

Every test above reported no page errors, no console errors and no missing files.

Verdict for item 4: **PASS in the tested scope (automated, software-rendered).** Not verifiable here: feel by hand on
keyboard, gamepad and touch (the tests use synthetic pad events); audio by ear; fullscreen (headless). The user has
played chapters 1–2 by hand on earlier builds, not on this one.

Not verifiable here: feel by hand on keyboard, gamepad and touch (the tests use synthetic pad events); audio by ear;
fullscreen (headless).

## Gate item 5: visual review and performance

Hardware performance on the user's laptop is **unverified here**. This container renders with SwiftShader, and the
laptop's Test Lab is disconnected. No fps or GPU timing in this report is a hardware figure. perfbudget's times are
CPU and software-renderer proxies. Its counts (draw calls, triangles, shader programs) are exact.

perfbudget runs the benchmark's routes at 1366×768 in software rendering. Its budgets were all met: PASS, 8/8.

| Route | Low calls (p95) / tris | Medium calls (p95) / tris | High calls (p95) / tris |
|---|---|---|---|
| street | 107 (114) / 366k | 135 (155) / 440k | 167 (173) / 802k |
| interior | 50 (53) / 214k | 53 (56) / 252k | 68 (71) / 417k |
| combat | 96 (98) / 127k | 152 (156) / 233k | 152 (156) / 233k |
| transition | 64 (68) / 324k | 87 (121) / 400k | 112 (116) / 576k |

| Budget or check | Result |
|---|---|
| street ≤ 260 / 300 / 450 calls (Low / Medium / High) | PASS |
| interiors ≤ 150 calls | PASS |
| shader compiles after loading, on any route at any preset | 0 (PASS) |
| per-frame geometry rebuilds | none (PASS) |

drawcalls: the Medium street frame has 202 calls (128 main, 75 shadow). The largest sources are the shadow batch
(54), actors (46) and the draw batch (22). PASS: a diagnostic, it judges only that the route drew.

The "submit ms" figures in the log are SwiftShader CPU proxies. They are not reported here as performance.

What would pass item 5: the in-game Benchmark or the Test Lab on the Vega 8 laptop, at the default Auto/Medium, on
street, interior, combat and transition. It should give fps and frame-time p50/p95/p99 against the 55–60 fps target.
Earlier laptop figures in ISSUES.md (I-9, I-25 to I-29: street on battery about 46 fps GPU-bound, opening 31 fps on
battery) are from older builds (0.43.3 to 0.45), not this candidate. Several fixes since then (CPU-WALK, SHADE-COST,
FIRST-BUILD) are "implemented, unverified on the laptop".

Visual review: no person has reviewed this build's look.
- The agent spot-checked two chapter-2 views of Citadel by Continue from the chain's saves: the square by the well,
  and the lane behind the houses. It also looked at the save screen. No missing textures, no stray geometry, readable
  characters, and the UI fit the screen.
- The agent watched no other views. This is not a visual sign-off. The art direction's own status (EXPANSION_ART_DECISIONS.md) says the base look is
"Implemented: no / Visually checked: no" for the expansion's direction. That concerns the expansion, not this gate.

## Known issues (base game, 0f77b57)

| ID | Kind | Issue | Status |
|---|---|---|---|
| B-1 | progression (P1) | Chapter 10 lighthouse: Zoé and Arthur block the dial bank (above) | NEW, open |
| T-1 | test | Segment 01's Mira talk interrupted by the life crystal's remark | NEW, open (test) |
| I-1, I-2 | art | Twinsen from behind, statue heads, Gilbert | pending (ISSUES.md) |
| I-4, I-5, I-6 | camera | Vesk two-shot arch; Modern-controls street jitter; the camera clears only when he stands still | pending |
| I-11, I-12 | performance | cold first-visit stall; High arrival CPU-bound | pending (laptop) |
| I-9, I-29 | performance | High preset at 60 plugged in; CPU walk | implemented, unverified on the laptop |
| I-10 | performance | ~56.5 fps display pacing | blocked (the user's display settings) |
| I-17 | combat feel | point-blank ball over low enemies | pending |
| I-18 | test | bot segment 01 / well mites | pending (see T-1) |
| I-20 | performance | Auto's title calibration never measures | logged, kept on purpose |
| I-22, I-23, I-24, I-28, I-30 | art/feel | tunic and arms, medallion, found-object ceremony, sword trail, residents' stops | review (awaiting the user) |
| I-25, I-26, I-27 | performance | first-frame stall, street GPU-bound on battery, opening 31 fps on battery | in progress / queued |
| STATE.md | save/retry | Zoé's death after the plan, then Retry → 2-line reply (not reproduced) | open |
| docs | documentation | STORY_BIBLE.md's chapter table still marks chapters 9 and 10 "to build" and describes five core pylons; the implemented game has both chapters and three pylons (STORY_MAP.md) | open |
| process | production | The paired-production plan (RUN_STATE.md, COVERAGE.csv) has groups G2–G7 (chapters 3–12, optional places) all "pending", and G1 Round 4 (a fresh player's run of chapters 1–2) not done | open |
| townlife | test | FIX-PUMP-N failed on the previous head; 0f77b57 is its fix, "verification running" (not run here) | open |

## Reproducible procedure

```bash
git fetch origin ccr-adf00ea7-37ebl3
mkdir -p /dev/shm/gate1 && git archive 0f77b573b93864cd1f1e66f5dabdd1cceb368af8 lba3 | tar -x -C /dev/shm/gate1
ln -s <main checkout>/lba3/node_modules /dev/shm/gate1/lba3/node_modules
python3 -m http.server 8750 --bind 127.0.0.1 --directory /dev/shm/gate1/lba3 &    # check the port is free first
export BOOT_TIMEOUT=900000 TMPDIR=/dev/shm GAME_URL=http://localhost:8750/
L=/dev/shm/gate1/lba3
# the chain (one at a time): segment N continues from N-1's kept save
KEEP=s01.json timeout 2400 node $L/tests/lib/seg.mjs $L/tests/playthrough/01-prologue-surface.mjs
LOAD=s01.json KEEP=s02.json timeout 2400 node $L/tests/lib/seg.mjs $L/tests/playthrough/02-prologue-cave.mjs
# ... 03 … 14 the same way. To get past T-1 and B-1, use docs/future/gate-logs/tools/seg01-gate.mjs and
# seg13-gate.mjs in place of 01 and 13 (W-1, W-2). Without them, 01 stops at "Mira: the key" and 13 at "the dials".
# the other gate tests, one at a time
for t in saveslots save-migration zoe-resume resume well-town controls combat anim-combat transitions opening menus \
         perfbudget drawcalls stability crosssystem chapter10; do timeout 2400 node $L/tests/$t.mjs; done
# probes (page scripts after a segment's steps): node gate-logs/tools/probe-seg.mjs <segment> "<stop label>" <probe.js>
```

`gate-logs/tools/chain.sh`, `test.sh`, `probe.sh` and `seg1.sh` are the wrappers used for this run. Their paths
point at `/dev/shm/gate1`.

Logs are in `docs/future/gate-logs/`: `pt-*.log` and `pt-*.trace` for the segments (including the failed runs),
`t-*.log` for the tests, `probe-*.log` for the probes, and `chain-status.txt` / `test-status.txt` for each run's exit
code and wall time.

## Shortest fix list to pass the gate

1. **Fix B-1** (`src/game/story/network.js`): move Zoé's and Arthur's chapter-10 lighthouse spots off the dial bank
   and off the stairs path. Rerun playthrough segment 13 **unmodified**; it must pass with no ISO move.
2. **Fix T-1** in the harness (`tests/lib/player.js` `P.talk`, or segment 01). Rerun 01 unmodified.
3. Rerun the whole chain 01→14 on the fixed commit, plus the gate tests above. Record it in QA.md.
4. Gate item 5, by the user or the Test Lab:
   - run the in-game benchmark / Test Lab on the Vega 8 laptop (street, interior, combat, transition at the default
     Auto/Medium) against the 55–60 fps target, with frame-time percentiles;
   - one short visual pass by the user over chapters 1–2 on that build.

   Without these, item 5 stays UNVERIFIED and the gate cannot be signed.
5. Optional, not gate-blocking: a human playtest of the two assisted fights; a fresh-player timing of chapters 1–2;
   correct STORY_BIBLE.md's chapter table.
