# LBA3-RUN wave 4 — progression (start to credits, save recovery)

Agent lba3-progression, 24.11.2026 (night). Candidate: `ccr-c1c2c4b9-dep6ed` at **e50ea6e6** (every wave so far + the Second
Shift parts 1 and 2). Results on the worktree branch with this agent's fixes on top (revisions below).
**All results: Automated runtime only** — headless Chromium on SwiftShader, the game's own deterministic stepping
(`game.testFreeze`, `game.step`), the input bot of `tests/lib/player.js` (keys held and tapped). Nobody played it with
hands; no GPU numbers. Words used: **automated** (a run by input), **STAGED** (a fixture save edited before it was loaded),
**inspected** (source read, not run), **untested**.

Isolation: every run in a fresh browser profile (Playwright context) on this agent's own server (port 8317), saves only
in that profile (`tests/lib/seg.mjs` LOAD/KEEP files in the agent's scratchpad); no user save, no shared storage touched.
The opening film is skipped with `?nocine` as the chain always has (the film is lba3-opening's suite); `ASSIST=1` as in
FULL-TEST-23-11 (an ISO assist is logged and counted; none happened, below).

## 1. Blockers found and fixed (game-wide)

| # | Severity | Where | What a player meets (by automated evidence) | Cause | Fix (commit) |
|---|---|---|---|---|---|
| 1 | **Critical — progression blocker, every chapter with a ball puzzle** | engine (`src/engine/rig.js` ARM-CLEAR, since P111 `2f6d0402`, 23.11) | A minute into chapter 1 (first NaN at game time 77.97 s, running south at Citadel (−46.2, 38.2), Athletic) Twinsen's right shoulder bone became NaN and stayed NaN for the session: his arm/hand gone from the skin, and every ball thrown from that hand flew as NaN and struck nothing. Chapter 1's harbour bell could not be rung (playthrough 01 stopped there, 5 throws, `pr_bell` false) | `acSolve`'s gradient: `acDepth` is −Infinity when no arm point lies in the body's rows (a 0.06 rad probe turn lifts the last one out); gradient −∞ → direction ∞/∞ = NaN → the shoulder's eased spread NaN, sticky through the damping | `8b7a623f` ARM-NAN: depth clamped at −1 (clear by a metre = clear; same answers otherwise), a non-finite answer dropped, a non-finite spread never written into the joint. In the one solver every rig with ARM-CLEAR uses (Twinsen, the cast, enemies: all bodies) |
| 2 | **High — progression blocker, chapter 4** | `src/main.js` INTERACT-PICK goalPick (P115, wave 3) | In the research post's office the desk never offered Search: from the desk's own standing place (0.28 m from it) the room's Look answered every time; the notebook could not be taken (playthrough 07 stopped at the desk) | goalPick takes a candidate measured within 1 m of an objective star for "the goal's thing". The desk's star is on the desk's middle; the room's dressing Look (ihomes.js) is measured exactly there, the desk's Search at the place before it, 1.25 m off — the Look was taken for the goal and won | `7eceb0e5` GOAL-DRESS: the places' own dressing looks (`ihlook`, `ihfar`, `zhlook`, `hl_look`, `lhome`, `wlook`), signs, departure boards and pets are never the goal's thing (they keep the plain ranking, i.e. as before P115) |
| 3 | **High — soft-lock on reload (chapter 7 by plain UI; five more chapters on a closed tab)** | `src/game/story/*` chapter ends | Chapter 7: at the end, Esc during Hesk's glider film → Save & quit → Continue: back in chapter 7 with its end done — Hesk says nothing, no prompt, no trigger, no way on (inspected; the game never saves half a film, so the last save is the one the end wrote before the film, with `c7_done` set) | Each chapter's end saves its flag before its film or loading card; the next chapter saves only once begun. In between, a load stood in the old chapter with the end's trigger gone: chapter 7 (`c7_done`: `leave()` returns), dig (`c4_done`), pass (`c6_done`), network (`c10_done`), the core (`c3_done`), the council without its thread (`c9_vote`) | `c4980ab2` END-RESUME: `ChapterBase.endSaved()/resumeEnd()`; the Story looks once, at the first frame of play after a load, and plays the way on (chapter 7 replays its glider film). save-migration's new section checks five of them STAGED (§4) |

The sweep for #3 (every `nextChapter` call in `src/game/story/`): **fixed** chapter 7, dig, pass, network, core, council
(non-thread); **already resumed, left**: chapter 1 (Doran's board prompt replays the crossing), chapter 2 (the console
→ `crossHome`, WC-4), steam and the evacuation (their boarding prompts stay offered after `c5_done`/`c8_done`), throttle,
Ballastra, the House of Balances, the Cradles (their own `update` resumes on the done flag), chapter 9's thread
(KellThread resumes on `cn_lane`/`cn_brum`), prologue (no save between). The sweep for #1: `acDepth` has one caller
(`acSolve`); the guards sit where the answer enters every rig. The sweep for #2: every Look/sign/board/pet kind in
`src/` (grep of `label: 'p_look'` kinds); story looks that ARE objectives (the harbour bell, the shutter, the bay rocks…)
are not in the set.

Test-only changes (b): playthrough 07 searches the desk from its standing place, as the prompt measures it (walked to
the desk's middle the bot came round its side); playthrough 10's shutter step aims at the landing as a player watching
the light (its blind left/down/right sweep, written by SHIFT-PART2 and never run, ran the light past the landing's 3 m);
playthrough 13's valves step knows the expanded campaign's extra B-8 step (Oren's trim, Tessa's box fitted, its band set
— written for the base game). New: playthrough 06 plays Kell's lunch by input; 15-free-play; save-migration END-RESUME.

## 2. The continuous run, new game → chapter 11 (automated, by input; expanded campaign)

`tests/lib/seg.mjs` per segment, each from the last one's own Save & quit (KEEP) → title → Continue (LOAD); a fresh
profile per segment, the save files `scratchpad/lba3-progression/chain/exp-<seg>.json` (save identifiers below).
Revisions: 01–06 on `e433f42e` (ARM-NAN, END-RESUME), 07–12b on `7eceb0e5`/`15a849dc` (+ GOAL-DRESS); a segment that
stopped on a fault was re-run from the previous segment's kept save after the fix (01 once, 07 twice, 10 once).

| Seg | Chapter (entry → exit, flags judged) | Result | Deaths / Retry | ISO assists | Kept save (chapterKey at exit) |
|---|---|---|---|---|---|
| 01 | prologue surface: tap, ball, yard errand, the well, Gilbert & Mira, the lid (kick), Xil, the harbour bell (ball) → Doran's stamp, Tim, the bay rocks → down the well | **PASS** after ARM-NAN (first try FAIL: the bell, see §1 #1) | 0 | 0 | exp-01 (well) |
| 02 | prologue cave → chapter 1 | PASS | 0 | 0 | exp-02 (project) |
| 03–05 | ch 1 The Joint Project: ferry, valves, depot, pump room, Zoé, Vesk, the ship | PASS ×3 | 0 | 0 | exp-03…05 (zeelich) |
| 06 | ch 3 Zeelich: Mill Lane repair (Brel, Kell, hook, bell, feed, ride, cart, cistern), **Kell's lunch played (THE SECOND SHIFT, new step)**, Irsa's bench, Baldino, the depot fight, locker, Oku, the old mill, three mills (ball), the key, Zoé's dials, shield, Vesk → `dig` | PASS | 0 | 0 (the depot fight won by input, 3 HP left) | exp-06 (dig) |
| 07 | ch 4 The Dig: pump, Tarra, Hesk's rope, the yacht, Ilka, **the notebook in the post office**, the bore test, the temple, the carving → `steam` | **PASS** after GOAL-DRESS (two FAILs at the desk, §1 #2) | 0 | 0 | exp-07 (steam) |
| 08 | ch 5 Steam and Sand → glider → `pass` | PASS | 0 | 0 | exp-08 |
| 09 | ch 6 The Pass → monastery → `observatory` | PASS | 0 | 0 | exp-09 |
| 10 | ch 7: **the wrong roof** (Sefa's shutter: taken by input, aimed until Tashi answered; Sefa in), the keeper, mirrors, telescope, vent → `evacuation` | **PASS** after the test's aim (first: FAIL, the test's blind sweep) | 0 | 0 | exp-10 |
| 11 | ch 8 Evacuation → ship → `council` | PASS | 0 | 0 | exp-11 |
| 12 | ch 9 The Council: hearing, Kell's lift, the archive, the vote, the bench isolator, Mill Lane's clip, **Brum's lesson (shown the handle by input), his trip** → `throttle` | PASS (`cn_brum` true) | 0 | 0 | exp-12 (throttle) |
| 12b | ch 10 Borrowed Time → Oren's lever → `ballastra` | PASS | 0 | 0 | exp-12b (ballastra) |

Kell's lunch in the continuous run (06): Brel's call 7 s after coming by the lift, the handle taken, Up held 180 frames
(6 s) until the cloth was 4 mm from the nail, level the first time (0 misses), Kell back with his bread; asked again
he gives his after-lunch word, the handle is not offered again, Kashes/clovers/items unchanged (`11|2|` before and
after: **no reward, none duplicated**). Chapters 3 → 9 then played with the lunch done, and Brum's lesson followed.

## 3. To the credits, both campaigns (automated from a fixture; STAGED for the expanded one)

There are no chain segments for the expanded chapters 11 Ballastra, 12 House of Balances, 13 The Cradles (their own
suites: exp-ballastra, exp-balances — the coordinator runs exp-balances this wave; second-shift J for the chair). So
the credits were reached twice from `tests/fixtures/campaign/base-13` (a format-5 save made by play at the network's
start, origin rewritten to this port):

| Run | Save | 13 network | 14 shell → core → epilogue | 15 free play (new) |
|---|---|---|---|---|
| **Base campaign** (old save: migrates to `exp_base`) | base13-as-is | PASS | PASS — "The End", Keep Exploring; 1 ISO assist (one pylon in the core fight, the bot's known weakness: FULL-TEST note) | PASS: Continue lands in free play (`home`, `ep_free`), 20 s without the ending again, the ship to Zeelich by input, Mill Lane: Kell at his lever (no Brum: a base game never had the lesson), no toast, objective unchanged |
| **Expanded campaign** STAGED (base-13 written as a format-6 expanded save with chapters 10–13 done, the lunch and Brum's lesson: scratchpad `stage.mjs`) | base13-exp-staged | PASS (after the step learned the B-8 valve station: Oren's trim, Tessa's box fitted, band set to the middle) | PASS — the core with `cn_brum` (the radio payoff's path), Vesk's choice "Pull him clear", the branch, the lock, two knocks, "The End", Keep Exploring; 1 ISO assist (one pylon) | PASS: Brum at the handle (0.00 m), Kell 3.65 m off by the cart (the oven cold in this save: `zl_crate` unset), **not also at the handle**; no toast, objective unchanged |

The Core's radio lines themselves (Kell starts, Brum "Cloth to the nail. I know.", the wheel's caption, Irsa) are not
recorded by the chain's harness: the run passed through that act with `cn_brum` set; the lines' order is second-shift
F2/F3's check (run on the part-2 branch, not on this candidate).

## 4. Save recovery

- **save-migration** (one run, `ade4803f`'s code minus its last test-logic fix): the 49 existing checks **49/49 PASS**
  (v1 upgrade + backup, a missing room, a corrupt save set aside, format 4→5→6, the expanded/base split, the finished
  save's postgame and "start at chapter 10" slot, no reward paid twice, an unknown chapter key, SHAFT-CITADEL, the
  CAMPAIGN-5/6/8/9 fixtures: **old format-5/6 saves load**). The new END-RESUME section (5 STAGED saves) logged the
  intended behaviour for all five — dig→`steam`, pass→`observatory`, chapter 7→`evacuation` (through the glider
  film), network→`shell`, core→`home`; each saved in the new chapter, no page error — but its 5 checks FAILed on the
  test's own reference (it read the chapter *after* the first second, when the resume had already run). Fixed in
  `ade4803f` (the reference is the save's own chapter); **not re-run** (31 min; FEWER TESTS) — the logged values meet
  the corrected condition.
- **In the continuous run**: 15 Save & quits and 15 Continues (01→12b and 13→15 twice) each landed where the segment
  left off, the next segment's first step judging chapter/room/flags; free play reloads into free play (15).
- **Reload at a puzzle midpoint, after an item pickup, around the evacuation, before the finale** (agent brief):
  covered by the existing suites, **not re-run here** (FEWER TESTS): campaign-thread (leaving mid-task, wrong setting
  and correction, save after a partial repair, a fall, four older saves), second-shift A–J (Second Shift mid-points:
  barrow aboard, handle in hand, Brum's trip, the shutter, the chair), save-migration's base-11/-relay/-town (the
  evacuation), base-15 (the core fight). On this candidate: the chain's own segment boundaries only.
- **Death / Retry**: 0 deaths in all 19 segment runs (the bot's fights: depot, post guards, core); Retry not exercised
  here (deaths.mjs is the suite; not run).

## 5. The Second Shift scenes on the critical path

| Scene | In the chain | Blocks progress? | Save/reload at its mid-point |
|---|---|---|---|
| ch 3 Kell's lunch (lift handle) | **played by input** (06, new step); optional | no | second-shift A3/C2 (part-1 branch run); not on this candidate |
| ch 7 the wrong roof (shutter) | **played by input** (10) | it is required for games that have not met Sefa (SHIFT-PART2 decision 6); answered after aiming, no soft-lock | second-shift I2 (part-2 branch); END-RESUME covers chapter 7's end |
| ch 9 Brum comes downstairs | **played by input** (12): lesson, handle shown, Brum's trip → ch 10 | no | second-shift E (part-1 branch) |
| ch 13 a chair by the cradle → Tessa | **not in the chain** (no segments for chapters 11–13) | — | second-shift J (STAGED, part-2 branch); exp-balances (the coordinator, this wave) |
| the Core payoff | 14 with `cn_brum` (expanded STAGED): passed through, lines not recorded | no | second-shift F (part-1 branch) |
| free play (Kell's bread) | **15 (new)**: Brum at the handle, Kell not at it; oven cold so Kell by the cart (bakehouse branch untested here) | no | 15 reloads into free play; second-shift H (STAGED, bakehouse) |

## 6. Coverage gaps and remaining uncertainty

- **Expanded chapters 11–13 not played continuously** (no chain segments; the expanded campaign's credits reached from a
  STAGED save). An agent could write segments for Ballastra, the House of Balances and the Cradles (new harness work:
  not done, per the brief).
- The opening film skipped (`?nocine`); ISO assists: 2 (one core pylon in each of the two 14 runs), none elsewhere.
- Not run on this candidate: second-shift.mjs, campaign-thread, deaths, exp-ballastra; the coordinator's concurrent runs
  (world-consistency, exp-balances, chapter7, cast-rounds, playthrough/10) were not repeated except 10 as a chain link.
  **Expect the coordinator's own playthrough/10 and chapter7/combat-style ball steps on e50ea6e6 to be hit by ARM-NAN**
  (any ball throw after the first NaN misses) and 10's old shutter sweep to fail; both are fixed here.
- ARM-NAN: the NaN was met at one spot of one route; it depends on the pose and the frame step, so a player on a real
  GPU at 60 fps may meet it elsewhere or later. The fix removes the cause in the solver; a person's play has not seen it.
- GOAL-DRESS: interact-pick result below (§7). Any other objective whose star stands > 1 m from its own prompt's
  measured point with a *story* thing measured at the star would still lose the key (none found; the fixture-star sweep
  is interact-pick E).
- END-RESUME is for a save made in the gap; chapter 7's resume replays the glider film without Hesk's line (said
  before the save). Steam's and the evacuation's ends replay their boarding (prompt) — unchanged.
- Hardware, sound, gamepad/touch, Hebrew on screen: untested here.

## 7. The suites run (each once) and their results

| Suite | Revision | Result |
|---|---|---|
| playthrough 01→12b continuous (13 segments, re-runs of a stopped segment after its fix: 01, 07 ×2, 10) | e433f42e → 15a849dc | 13/13 PASS at the end; 3 game faults found (§1), 3 test gaps |
| playthrough 13→14→15, base campaign (base-13) | 7eceb0e5 | 3/3 PASS |
| playthrough 13→14→15, expanded campaign STAGED (13 re-run after the B-8 step) | b8a81f74 (test) | 3/3 PASS |
| save-migration | ade4803f minus its test fix | 49/49 existing PASS; END-RESUME 5 cases' values as intended, checks FAILed on the test's reference (fixed, not re-run) |
| interact-pick (P115's suite, for GOAL-DRESS; its E sweep of every fixture's stars) | b8a81f74 | **17/17 PASS**, no errors (SHOTS=0, no pictures) |

Logs and saves (not committed): `/tmp/claude-0/-home-user-D-KGITHIB/ee8386c5-a577-5abe-b3f0-c10324e7c3bd/scratchpad/lba3-progression/`
(`logs/exp-*.txt|trace`, `logs/base-*`, `logs/xs-*`, `logs/save-migration.txt`, `logs/interact-pick.txt`, `logs/probe-*`;
kept saves `chain/exp-<seg>.json`, `chain/base13-*.json`; the probes that found ARM-NAN: `probe-nan.mjs`, `probe-throw.mjs`).

## 8. Files changed

- `src/engine/rig.js` (ARM-NAN), `src/main.js` (GOAL-DRESS), `src/game/story/{base,index,dig,pass,observatory,network,council,chapter3}.js`
  (END-RESUME). No new src file; no player line added or changed (no Hebrew needed); no visible world/character change
  (ARM-NAN keeps every pose a finite answer gave before).
- Tests: `tests/playthrough/{06-zeelich,07-dig,10-observatory,13-network}.mjs`, new `tests/playthrough/15-free-play.mjs`,
  `tests/save-migration.mjs` (END-RESUME section).

## Decisions for the user

None required. One note for a later pick: ending the expanded campaign's credits run continuously would need chain
segments for chapters 11–13 (Ballastra, the House of Balances, the Cradles) — a test-writing task, not a game change.
