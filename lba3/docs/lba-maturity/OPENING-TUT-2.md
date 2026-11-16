# OPENING-TUT-2 (P31): the first stage as a tutorial a new player actually goes through

The user, 15.11.2026: "I played from the start and there wasn't really a tutorial of the first stage; I just took the ball
and went outside." Built on `ccr-c1c2c4b9-dep6ed` (7b00e929), after P22 (OPENING-TUT.md). **Status: Automated runtime
only.** Every result below is headless Chromium on SwiftShader, driven by input (held and tapped keys, a faked standard
gamepad). Nobody has played it. How it reads to a person, and how long a new player takes, cannot be judged here.

## 1. What a player who ignores the tips missed (measured, before)

Probe: a new game, the film skipped by holding E (as the user could), the cupboard, out of the door, straight to the
well. By input (the harness's arrow keys and E), timed on the game clock. Build 7b00e929, tips on, Follow camera.

| t (s) | What happened | Tip on screen |
|---|---|---|
| 0.0 | control in the house | `↑ Walk · ← → Turn` (0.8 s: he walked, done) |
| 6.4 | the ball from the cupboard | — |
| 6.8 | | `Shift Open Inventory` (shown 20.8 s, never done) |
| 15.9 | out of the door, Zoé 4 m off | the inventory tip, still |
| 16–28 | up the lane past the barrels and the project's pipe | the inventory tip, still (it held the one slot) |
| 27.6 | | the inventory tip let go (its 20 s), nothing after |
| ~29 | the "town" (22 m from the door) | none: no yard lesson applies past it |
| 59.6 | at the well | — |

Learned: walk, use (the cupboard), the found box. **Missed**: talking to anyone (Zoé is only a prompt), the inventory
(let go), the garden tap, Athletic, the jump, the ball at the barrels, the arc; Zoé's kettle (the proof Mira wants, so
the well's first visit ends in a refusal and a walk back). The cause: every P22 lesson was optional and timed out, the
inventory tip (first in the order) took the only slot while he walked past the pipe and the barrels, and nothing in the
yard asked anything of him. One tip seen in the yard, for things he had already walked past.

## 2. What changed

The yard is now Zoé's short errand, one step at a time, each needing one basic skill; she calls him back if he heads
off before it is done (`src/game/story/openingsteps.js`).

| # | Where | Goal line (always shown) | Key under it (tips on, the keys in use) | What completes it | Feedback |
|---|---|---|---|---|---|
| 1 | house | Take your magic ball from the cupboard | `↑ Walk · ← → Turn` until he walks, then by the cupboard `W Search the cupboard` | the ball (the door still waits for it) | the found box (unchanged) |
| 2 | house | Go out to the yard | — | outdoors | — |
| 3 | yard | Talk to Zoé | `W Talk` | her kettle (`pr_kettle`) | her "Twinsen! Over here." as he steps out; the found box; a tick |
| 4 | yard | Look at the Kettle Crystals in your inventory | `Shift Open Inventory` | the inventory opened | "Have a good look at those."; a tick and a chime |
| 5 | yard | Try the garden tap | `W Try the tap` | the standpipe by hand (`pr_yard`) | "Is our tap knocking too? Try it."; his line; a tick |
| 6 | yard | Hit the barrels with the magic ball | `Face the barrels. Alt Throw the magic ball` | a hit (`pr_barrel`) | "Arthur told Tim you can still hit those barrels. Can you?"; the flash, the knock, "(Still got it.)"; a tick |
| 7 | yard | Jump over the project's pipe | `F2 Switch to Athletic: run and jump`, then `Space Jump · take a run at it` | a jump that takes off on one side and lands on the other, or three tries ("Close enough") (`pr_pipe`) | "And the project's pipe? You used to clear it at a run."; a tick; "Not bad for an old hero. Now, the well." |

- **Asked again**, Zoé names what she wants now (the same line as her word over her head). The inventory opens on the
  Kettle Crystals during their step.
- **One panel** (the P22 tip box, left of centre): the goal in bold, the key below, five dots for the yard's progress.
  Nothing to dismiss. A dialogue, a menu or the found box hides it.
- **The yard's edge**: 15 m from the front door (the lane's water gate is 16.7 m up the lane). Crossed while a yard step
  is open, Zoé calls him (her line in the dialogue box, voiced, naming what she wants: "Twinsen! Try our tap first. It's
  right here."; every second call for the same step a plainer "Where are you off to? I'm not finished with you.") and he
  turns and walks 3.2 m back in. No wall, no lock: a person with something to ask. Called again
  only if he goes on past where her last call left him (a blocked walk back never loops).
- **Anything done early counts** and is skipped (the current step is the first not done): an experienced player who
  throws at the barrels and jumps the pipe first is asked only for what is left.
- **Nothing can be failed or timed**: misses come back to the hand as before; three jumps at the pipe that don't clear it
  are "close enough".
- **The barrels' hit** (a fix found by the new tests): the target's radius was 0.95 m round the two barrels' middle, but
  their colliders reach 0.85 m and the ball is tested from where it stands before each 0.12 m sub-step; from some spots
  on the path (x −45.0, z 73.2) the ball met the near barrel's collider unregistered and bounced away. Optional in P22,
  this would have blocked the yard; the radius is 1.25 m now (`story/prologue.js` BARREL_R).
- **The house**: unchanged (the film, Arthur at his boat, the kitchen tap, the cellar and the bathroom); only the panel
  names the goal. The inventory tip no longer comes in the house: it is the yard's fourth step, for the item he has just
  been given.
- **The map**: while the yard runs, the minimap's and holomap's star is on the step (Zoé, the tap, the barrels, the pipe),
  not on the well; the pause menu's objective reads "Check the well ◆ <the step>". After the yard, the well's star and
  objective come back.
- **Show control tips: Off**: the goal lines, Zoé's words and her call stay; the keys and the dialogue's key hint go.
- **After the yard**: P22's remaining lessons run as before (the arc by the barrels, the camera for Free / LBA, out of
  magic, the kids' Discreet and Normal, the lid's Aggressive, the cave's dodge).
- Text: new strings in `src/game/text/opening.js` (`t2_*`, English, no key named in a spoken line, scanned for night,
  evening, tonight, sunset, dawn, dusk: none). No existing line changed; every ID kept.

### A consequence for chapter 1's order

In a new game Zoé's kettle now always comes first, so the first visit to Mira ends with the crystals and the key (the
order `tests/prologue.mjs` always played). Mira's refusal and the walk back to Zoé (`pr_miraNo`, `pr_tw_miraNo`,
`pr_zoe_kettle2b`) remain for saves from before; `tests/dialogue-scenes.mjs` still reaches them by flags.

### State (saved)

```
pr_tut2 (a new game, set as the film ends)          absent: every save from before → no steps, no call, P22 as it was
   │
   ├─ ball ─ out ─ zoe(pr_kettle) ─ inv(tut 'inventory') ─ tap(pr_yard) ─ barrels(pr_barrel) ─ pipe(pr_pipe 1|2)
   │          the current step = the first not done; the edge (15 m) calls him back while a yard step is open
   └─ pr_yardOk  (all five done; Zoé's last word; the well's objective and star; the edge open)
      also set if he is found far past the edge without walking across it (a save, a test's teleport): never pulled back
```

Tutorial state (`tut`) is unchanged in shape (`v: 1`); the steps read `inventory` from it.

## 3. Files

- `src/game/story/openingsteps.js` (new): the steps, Zoé's words over her head, her call and the walk back, the pipe's
  jump, the map's star, the objective's step.
- `src/game/story/prologue.js`: constructs it; `pr_tut2` at the film's end; its update, markers, objective, talk (Zoé
  asked again names the step), applyFlags.
- `src/game/tutorial.js`: the steps take the panel while they run (goal, key, dots, the tick).
- `src/game/text/opening.js`: the `t2_*` strings.
- `tests/opening-tutorial.mjs` (rewritten for the steps), `tests/lib/player.js` (`P.openingYard()`; `P.go` out of the
  yard does the errand first, as a player who follows the steps; `P.yardFirst = false` to test the edge itself),
  `tests/playthrough/01-prologue-surface.mjs` (the errand step; Mira gives the key at once).
- `captures/opening-tut-2/*.jpg`: each step (chapter 1 only).

## 4. Tests (Automated runtime only)

Snapshot of the worktree served from `/dev/shm/t990` (python http.server 8990), Chromium headless on SwiftShader,
1280×720 (the suites' own sizes), one suite at a time; another worker's suites ran on the same machine (load 9–13).

**After: the same skipping player as section 1** (film skipped, the cupboard, out, straight for the well, by the arrow
keys; `P.yardFirst = false`): out at 15.9 s, the panel "Talk to Zoé · W Talk"; Zoé's call at the yard's edge at 25.0 s
and he walks back in; six calls in 26 s of trying, never past 15 m; the well not reached. Only Zoé's errand opens it.

`tests/opening-tutorial.mjs` (rewritten; 45 checks, **PASS**, 25.8 min):

| Case | Checks | Result |
|---|---|---|
| A new player following the steps (keyboard, Classic): the goal and walk keys at control; the cupboard's key; Arthur's talk and the dialogue's key hint; the kitchen tap; the door waits for the ball | A1–A6 | PASS |
| Save half way (in the house with the ball), reload, Continue: the same step | A7 | PASS |
| Out of the door: Zoé in view calls, the panel and the map's star on her | A8 | PASS |
| **A player who tries to skip**: straight for the well → called back at 15.0 m, walked back to 11.9 m; again at the tap's step | A9, A12 | PASS |
| Every step by its real key: Talk (W/E), Inventory (Shift; it opens on the crystals), Try (W/E), the ball (Alt; two misses first, back in the hand in 2.5 s), Athletic (F2), the running jump (Space; a walk into the pipe first: stopped, no harm); a tick after each, Zoé's line before each | A10–A17 | PASS |
| The yard done: the well's objective and star; the optional arc tip; the way to the well open (no call), the well inspected | A17–A19 | PASS |
| Timing (the bot, game clock): control to the yard done, with Arthur, the kitchen tap and two skip attempts | A17 | 85.9 s |
| **Show control tips: Off**: the goal line at every step, no key in it, no dialogue key hint; the edge holds; every step by its key | B0, B1 | PASS |
| An experienced player out of order (the barrels and the pipe before Zoé): they count, only the rest is asked | B2 | PASS |
| Three standing jumps at the pipe: "Close enough", the yard done | B3 | PASS |
| A key rebound on the Controls screen (the ball to G): the step names G at once | B4 | PASS |
| A faked standard gamepad mid-step: the step in the pad's terms (left stick, Y; D-pad for Athletic); Y throws and hits; back to the keyboard: no pad label left | B5–B7 | PASS (no real controller) |
| The yard done by keys; on to the well: no step or yard tip in town; the kids' Discreet / Normal; the lid's Aggressive (reproduced with flags) | B8–B11 | PASS |
| Saves: the cup's days (no tut, no steps) and P22's build (tut v1, no `pr_tut2`): no step, no call, free to leave | C1, C2 | PASS |
| This build's save mid-yard: the steps resume at the tap; the edge holds | C3 | PASS |
| This build's save past the edge (in the square): let go, never pulled back | C4 | PASS |

Other suites on this build:

| Suite | Result |
|---|---|
| `opening.mjs` (the film played, skipped three ways, paused, Continue, a second new game, the first objective) | PASS (41 checks, 15.3 min) |
| `prologue.mjs` (chapter 1 by teleports: Zoé first, the well, the key, the lid, the rope, the cave, Sendell) | PASS (29; the known random "well's mites" check passed this run) |
| `chapter1.mjs` | PASS (32) |
| `playthrough/01-prologue-surface` (by input, through `tests/lib/seg.mjs`): the new step "the yard: Zoé's errand" did zoe, inv, barrels, pipe (the tap was done just before); Mira gives the key at once | PASS |
| `house.mjs` (the house, the cellar, the bathroom) | PASS (2) |
| `menus.mjs` | PASS (39) |
| `inventory-calm.mjs` | PASS (23) |
| `dialogue-check.mjs` (static: keys, names, night words, no key names in spoken lines) | PASS |
| `campaign-thread.mjs` part C (saves from before) | PASS (28 checks, 26.5 min, every part-C save from chapter 1 to the late chapters) |
| `save-migration.mjs` | RESULT_S |

Pictures: `captures/opening-tut-2/` (from the last run of `opening-tutorial.mjs`, chapter 1 only): 01 the house's goal,
02 by the cupboard, 03 Zoé calls in the yard, 04 called back at the edge, 05 the inventory's step, 06 the inventory on
the crystals, 07 the barrels' step, 08 the pipe's step (Athletic's key), 09 the jump's key, 10 the yard done (Zoé's last
word, the optional arc tip), 11 tips off (the goal line only), 12 a rebound key (G), 13 the pad's terms, 14 the well.

## 5. Limits, risks, review

- **Not played by a person.** Whether the steps read as natural and the calls as warm rather than nagging, and how long
  a new player takes, are unmeasured. The bot's 85.9 s (game clock) includes Arthur, the kitchen tap and two skip
  attempts; it is not a first-play estimate.
- **The edge is a 15 m circle round the front door.** Up the lane it falls just before the water gate. Behind the house
  (west) the straight walk back to the door meets the house: he stops where it blocks, and the next call needs him to go
  1 m further out (no string of calls). Checked by input up the lane only.
- **Saves from before this build that stand in the house or the yard** keep P22's optional tips (no steps, no call), by
  design: they are not pulled into the new opening.
- **New lines** (`t2_*` in `src/game/text/opening.js`) want the dialogue editor's eye; none has a `voicemeta.js` entry,
  so their delivery is read from punctuation (the calls end in "!").
- **Chapter 1's order**: Mira's refusal and the walk back to Zoé are now reached only from older saves (section 2).
- **Touch** has its wording (from P22) but no touch device was tested; the gamepad is faked through
  `navigator.getGamepads`.
- **Shared test harness**: `tests/lib/player.js` now does Zoé's errand whenever `P.go` leaves the yard in a game with
  the steps; suites that start a new game and walk on get it for free. A suite that teleports past the yard lets it go
  (the "never pulled back" rule): `prologue.mjs` does.
