# LBA3-RUN · lba3-controls: input, movement, aim, the interact key (23.11.2026)

Agent: lba3-controls (wave 3, paired with lba3-sound: it owns audio, this agent input and animation code). Base revision
`eb5928b0` (branch `ccr-c1c2c4b9-dep6ed`, the wave 2 checkpoint); work on `worktree-agent-af10e2a89d970f718`, commits
`0581b380`, `96084e92`, `67e4911f`, `6cf8e2be` (and this document's). **Automated runtime only**: headless Chromium on
SwiftShader, a shared machine, nobody played. Words used precisely: **automated** = a suite or a probe drove the game;
**inspected** = read in code, an earlier report or a picture; **untested** = neither. No real controller, display or GPU
was used; no hardware number is claimed. The user's rule of 23.11 applied: one covering suite per change, run once.

Built on, not redone: FPS30.md (P94's aim fixes, STREET-CPU's preStep, PACE-ALL), the suites fps30, fps30-feel, timing,
controls, combat, anim-combat, camfollow, and rig.js ARM-CLEAR (kept, untouched).

## 1. P115 · who takes the interact key (the desktop's real-keys play of the opening) — fixed game-wide

**The reports** (WORLD_ART_REQUESTS.md 66.5, pictures `captures/play-66/1…4`): (1) by the garden tap Zoé took the key
("W Talk") while the tips panel said "W Try the tap"; (2) at Zoé's back the panel said "W Talk", no prompt, the key did
nothing; (3) by the well Mira took the key from most sides before the well's Inspect/Kick; (4) Gilbert took it at the
well's way down; (5) Xil answered only squarely in front of the barge; (6) the kick's keys came only after Gilbert's line.

**Measured before** (automated, `tests/interact-pick.mjs`, the ranking without the new rule kept as `C.base`):
- the tap's step, round the tap (0.9–1.3 m, facing it or 34° off): Zoé took the key at 3 of 48 spots;
- Zoé's step, round her (0.7–1.8 m): the tap took it at 3 of 36 spots;
- the lid to open, round the well (1.6–2.2 m, facing it or 40° off): Mira or Gilbert took it at 4 of 64 spots — the
  desktop's walk came from Mira's side, where she stands between the street and the well;
- the panel's key line showed within 3.5 m of the step's marker, whatever the prompt offered: "W Try the tap" 2.2 m
  from the tap with "W Talk" (Zoé) on screen (the reach of the tap is 1.5 m).

**The cause.** `findInteractable` ranked by distance with a facing penalty and gave people 0.35 m of head start; it knew
nothing of the objective. The tips panel (`tutorial.js stepKeys`) decided its key line by distance to the step's marker,
not by what the prompt offered, so the two could name different actions for the same key.

**The fix** (`src/main.js`, `src/game/tutorial.js`, `src/game/story/prologue.js`):
- `findInteractable` keeps every candidate in reach with the point it was measured at (the last `dist()` before its
  `consider()`, which is how all 257 call sites in the story files measure their things). `goalPick`: a candidate within
  1.0 m of one of the objective's stars (`story.markers()`, every chapter's own; a person within 0.4 m: the star on them),
  in reach and roughly faced (within ~75° of his facing, or under 0.8 m from him) takes the key before a person or
  another thing. He can still choose the other: turned squarely to it (aim > 0.9) with the goal's thing well to his
  side (≥ 60°), the other answers. A thing with no measured point (the lift's "Let go", a hatch under his feet) always
  keeps the key. The stars are read once a frame and only when two candidates compete (no cost otherwise).
- The panel's key line (the opening's steps: Search the cupboard, Talk, Try the tap; and the kick lesson's "W Kick the
  lid") shows only while the game's prompt is up for that same thing (`game.promptFor`). So the panel and the prompt
  never name different actions; where the key would do nothing, the panel shows the goal and the marker, no key.
- (4) Back up out of the well's cave before its crystals, the map had no star at all; the well's star is there again
  (the way down), so the well's prompt keeps the key from Gilbert.
- (6) Gilbert's "Give it a good kick" brings the keys with it (a toast, "Aggressive (F3), then W by the lid", while he
  says it; tips on), not ~10 s later after the talk.
- (5) **Not a game fault** (automated): from four spots on the pier's approach beside the crane's crates (2.5–3.9 m from
  Xil), turned to him with Up held, the prompt "W Talk" comes within 0–0.8 s of walking; nothing blocks the way
  (sight lines at 0.3–1.8 m height clear). The desktop's route planner stuck there; its notes said "not a fault" too.
  No change made. A "talk over a low obstacle" rule was tried and removed (no case needed it).

**After** (automated, interact-pick A1–B5, D1): 0 of 48, 0 of 36, 0 of 64 spots go to the other one; the panel's key
line agrees with the prompt at every sampled spot (yard: 84 spots; well: Aggressive, 5 m and 2 m); the kick's keys are
on screen during Gilbert's line; the well's star and prompt after the cave; Hebrew: prompt and panel name the same
action (`לפתוח את הברז`).

**The sweep (game-wide)**: the rule reads every chapter's own stars, so it applies everywhere; the suite's part E loads
13 campaign fixtures (chapters 1–15 bases), takes each objective star in the area and puts Twinsen on a ring round it
(1.0/1.6/2.2 m, 16 directions, facing it): 10 stars, 208 spots where the star's thing is in reach and faced — the goal's
thing answered at all 208 before and after (none of those fixture states has a person beside its goal; the contested
cases are the opening's, above). Uncertainty: the fixtures sit at chapter starts; mid-chapter states with a person by the
objective's thing were not sampled outside chapter 1.

Pictures (automated, EN; one HE): `captures/controls/p115-1-tap-step-after.jpg` (prompt "W Try Tap", panel "W Try the
tap"), `p115-3-well-after.jpg` (Aggressive by the well: "W Kick" and "W Kick the lid"), `p115-5-xil.jpg`,
`p115-he-tap-step.jpg`. Before: the desktop's own `captures/play-66/1-tap-zoe-takes-the-key.jpg`,
`2-behind-zoe-panel-says-talk.jpg`, `3-well-mira-takes-the-key.jpg`, `4-ladder-gilbert-takes-the-key.jpg`.

## 2. ACT-RESUME · the keys locked for 0.45 s after a talk opened by his hand — fixed game-wide

**Symptom** (automated, a probe then interact-pick A9): his hand on the garden tap opens a line; after the line, the
prompt "W Try Tap" is on screen but W does nothing, and Up does not move him, for 0.45 s; the hand's gesture plays its
end again. Measured: a W press 1, 3, 6, 10, 15 and 20 frames after the talk closed was ignored, at 30 frames it acted.

**Cause.** `handTo` (33 call sites), a kick, a pick-up: the action's callback runs at the hand's contact and opens the
talk; the rest of the clip (`actT`) is frozen through the dialogue and runs after it, and `actT > 0` blocks the
interact key, the action key, movement and the behaviours (actors.js). The talk overrides his pose (talk/listen), so the
rest of the gesture was never meant to be seen after it.

**Fix** (`main.js setState` → `endAct`): when play comes back (from a talk, a found box, a film, a menu), an action whose
moment has passed (its callback ran) and that has no follow-up ends. An action still before its moment, or with a
follow-up (a knockdown's get-up), goes on as before. Sweep: one place, every action of the hero (88 `act`/`actAt`
call sites with a callback, 33 `handTo`, in 42 files). **After**: no action time left after the line, he walks on the
first held step, the key acts on the next frame (A9).

## 3. Aim between near and far targets — fixed (AIM-KEEP, AIM-AHEAD)

**Symptoms** (automated, a probe in the developer arena; then combat.mjs §25):
- a mite 3 m off at 12° and a crawler 8 m straight ahead: the marker changed hands 0.5° off the far one; with a stick's
  1° of noise held there it flipped **32 times in 60 frames**, and the throw went to whichever the release frame held;
- a switch-like target 3 m dead ahead and a mite 7 m off at 20°: the ball went to the mite (enemies in the cone always
  came first), curving away from what he aimed at.

**Fix** (`src/game/combat.js`): the marked one keeps the marker until another scores better by 0.12 (3 × rad + distance
share: ~2.3° of aim) — in `pick` (every assisted aim: ball, melee turn, tools, lock) and for switches/targets; the
marker, the preview and the launch still use the same `throwTarget`. A switch or target at least ~10° more squarely
aimed at than the cone's enemy takes the ball; an enemy within ~10° of the target's line still comes first (LBA2's
rule kept). **After**: one hand-over in a −20…+20° sweep, 0 flips in 60 frames of noise, the throw at the marked one;
the target ahead before the mite at 20°, the mite at 6° first (combat.mjs: all 80 functional checks PASS, §25's two
new ones among them: the ball switch, lock-on, the sentry, the fence rule and the sword's checks unchanged).

## 4. The checklist, item by item (Follow camera)

| item | how | result |
|---|---|---|
| run through a doorway | automated probe, Athletic, Up held into the house and out, Frame Rate 60 and 30 (60 Hz steps, two per drawn frame at 30, inputs between frames) | the held key carries through the fade: running 5 m/s on the first frames inside (2.98 m in 0.6 s at both rates); out again the same until he meets the yard's fence (1.13 m). No input loss |
| jump beside a bin (the yard's barrels, a giver) | same probe | the jump, not a search: apex 1.136 / 1.134 m, 0.70 s in the air at 60 / 30; Space in Normal there searches it (the hop), as designed |
| change stance near an interactable (the tap) | same probe | F1–F4 tapped between frames: the stance changes on the next drawn frame at both rates, he does not move, the prompt stays; the interact key uses the tap in all four stances (a separate probe; the first route showed two "failures" that were §2's 0.45 s lock) |
| aim and throw at near and far targets | probe + combat §25 | §3 (fixed) |
| switch to the sword, hits, misses, recovery | combat.mjs (sword: active frames, one hit per swing, combo buffer, mashing, walls, sheathed through a talk), anim-combat.mjs (release and contact at 30/60/120, planted feet, interruptions) | see §5 |
| keyboard/mouse and the supported pad | inspected: one input path (`input.js`), pad A = action and talk (`padTalk`), the d-pad picks stances and never steers (`padDirs`), taps and pad buttons latched for a skipped refresh (FPS30); controls.mjs (earlier runs) covers the prompt's key per device and pad A in Athletic. Mouse aim: P94 (fps30-feel) | not re-run here; no real pad |
| camera obstructions | inspected: camfollow/camclear/camsteady own it (CAMERA-NIGHT); P94 §8.3-5 (the arm's 0.25 m steps at 30) stays a known item | not re-run |
| both frame caps | the probes above at 60 and 30; anim-combat at 30/60/120 | no difference beyond sampling |

## 5. Suites run (once each, this branch; automated)

- `tests/interact-pick.mjs` (new), run four times while it was being written, each for a reason in the test itself:
  run 1 (with the sweep) 15/16 — B3's far spot assumed no prompt, but Mira stands in reach 5 m north of the well (the
  game was right; the check now judges the kick only); part E (the sweep, 13 fixtures) PASS. Run 2 (SWEEP=0) 15/15.
  Run 3 added A9 (§2): A9 PASS, but its last key press left a walk to the tap running into part B (B1/B3/B4 failed on
  the test's own leftover); run 4, the walk let finish: **16/16 PASS**, no errors.
- `tests/combat.mjs` (with §25 new): 80 functional PASS, 0 errors; its verdict line says FAIL for 3 resources: this
  worktree's web server stopped at its 2-hour limit near the run's end (connection refused on three music files), not
  the build. Not re-run (the functional result is not in doubt).
- `tests/anim-combat.mjs` (covers §2's action endings and the checklist's release frames): **35/35 PASS**, no errors.
  Measured: the ball leaves the hand at clock 0.1667 at 30, 60 and 120 (0.08 m from the hand), controls back at
  0.40 / 0.383 / 0.375 s; slash1's hit lands in its active frames at all three (0.167 / 0.15 / 0.15 s), the planted feet
  glide 0.1–0.3 cm; a talk, a pause, a hit, a death, a swap, a scene change and every button at once leave no stuck pose.
  Note: this suite's "30 fps" steps the simulation at 1/30 s; the game at the 30 limit steps it at 1/60 twice a drawn
  frame (FPS30-SMOOTH §4), so the real 30 limit times these like 60. The hand's forward reach at the release differs
  with the 1/30 step (0.69 m at 30, 0.55 at 60, 0.44 at 120): sampling of the same clip, test-mode only.
- Probes (scratch, not committed): the doorway run, the jump by the barrels, the stance keys by the tap, the interact key
  after a talk, the Xil approach, the aim near/far — numbers in §1–§4.

## 6. Affected chapters

- §1's rule: every chapter (it reads each chapter's stars); the contested cases measured are chapter 1's opening (the
  yard, the well). The panel's key lines: the opening's steps and the kick lesson (chapter 1). The well's star after the
  cave: chapter 1.
- §2: every chapter (every action the hero plays by hand that opens a talk, a found box or a film).
- §3: every fight with the ball, and the melee turn, tools and lock (the hysteresis); ball switches near enemies.

## 7. Remaining uncertainty and hand-offs

- Nobody played; no real pad, mouse feel or display. The user's own play of the opening is the real check of §1.
- The sweep's fixtures are chapter starts: a person standing by an objective's thing mid-chapter elsewhere was not
  sampled (the rule covers it; no measurement).
- Hebrew wording (for lba3-dialogue, not changed here): the tap's goal says `לנסות את הברז` ("try") and its key line and
  prompt say `לפתוח את הברז` ("open"); English says "Try" in both.
- P94's open items stay: the Follow camera's arm steps 0.25 m at a time when something crosses its line (camera design),
  the ball first seen 0.35 m from the hand on the pad path at 30.
- No before/after video clips: headless runs give pictures, listed in §1.

## 8. Decisions for the user

None needed: the four changes are fixes of measured faults with the old behaviour kept where it was intended (LBA2's
enemies-first ball aim, a person faced squarely still answers, knockdown get-ups). Visible changes: none to the world or
characters; on screen, the panel's key line now appears only with the matching prompt, and a toast with the kick's keys
appears during Gilbert's line.
