# OPENING-TUT (P22): the opening at home as a playable tutorial

The user's brief of 14.11.2026: rework the opening at Twinsen's home into a playable tutorial woven into the story;
remove Arthur's cup objective. Built on `ccr-c1c2c4b9-dep6ed`. **Status: Automated runtime only.** Every result below
comes from headless Chromium on SwiftShader, driven by input (held and tapped keys, a faked standard gamepad). Nobody
has played it. A person's understanding of the tips, the feel of the jump and the time a new player takes cannot be
judged here; frame rates are not claimed.

## 1. What the player now does (the opening, as played)

1. **The film** (unchanged, 88 s, hold E to skip): the harbour and the project's lift, home, the tap stops and runs warm,
   "I'll check the well", Zoé: "I'll ask next door. Take your magic ball." She leaves by the front door.
2. **Control in the house at once.** Twinsen stands in the open middle of the room. One tip: Move, in the keys in use
   (Classic: `↑ Walk · ← → Turn`; Modern: the four keys; a pad: Left stick). A step and a half of walking completes it.
3. **The kitchen pipe knocks by itself** (three knocks, the brass riser shaking, a puff of dust, every 5.5 s) until he
   tries the tap. That is what draws him to the sink: no marker. "Try": his hand under the spout, not a drop, the pipe
   knocks; Arthur, at his boat: "It's knocked like that since breakfast. Like someone wants to come in."
4. **Arthur at his boat** is the first person in reach. "Talk" shows only in reach and facing him. "The mast holds! Tim
   says a boat needs water. I say first it needs a sail." The dialogue box shows its own key in its corner: `E Show all`
   while a line types (the press shows the whole line), then `E Next`, until the player has moved three lines on.
5. **The cupboard** (the objective: Check the well · Take the magic ball from the cupboard). The ball and the holomap,
   the found-object box, his line, the toast with their keys. Then one tip: `Open Inventory`. The inventory's own footer
   says how to select and close. The door waits for the ball only (the film's "Take your magic ball"), nothing else.
   After the ball Arthur says (once): "You're taking the ball? Tim says you can't do the trick shots any more. I said
   you can."
6. **Out of the door**: walls and roof cut away inside, the house whole outside, by the existing room change. Zoé is a
   few steps off by the garden fence, back from next door: their kettle furred with warm crystals ("Show Mira these.
   Then the well."). With the Free or LBA camera a camera tip shows at the door (Free: the right stick or Z / C or a
   right-drag; LBA: recentre). With Follow (the keyboard's default) the camera turns by itself and no tip is shown.
7. **The garden standpipe** knocks once as he passes; its "Try" puts his hand on its handle: dry, knocking, "It runs
   under the lane, toward the square." Further up, the pipe at the pump room's door knocks as he passes it.
8. **The project's copper heat pipe** runs up the lane, 0.6 m high: too high to step over, low enough to jump. Near it:
   `F2 Switch to Athletic: run and jump`, then the action button's new use: `Space Jump`. Walking round its end is as
   good. A missed jump only stops him at the pipe; nothing to redo, no harm.
9. **The two barrels** against the house's north wall: once a throw from where he stands would reach them,
   `Face the barrels. Alt Throw the magic ball` (Modern with the mouse: Point at the barrels; a pad: Aim with the left
   stick, Y). A hit: the ball's flash and sparks, a hollow knock, dust, and his word the first time ("(Still got it.)",
   or "Somebody tell Tim" after Arthur's line). The ball comes back by itself, about two seconds a throw. Then,
   optional: `Hold Alt to see where it lands` (the game's own arc dots and landing ring). Out of magic (a throw costs
   one, as in LBA2): "Out of magic: the ball still flies, but no longer bounces. Flasks refill it."
10. **On to the well**, with every lesson done or not. In town, contextual tips only where chapter 1 needs them: at
    the kids, after they brush him off, `F4 Switch to Discreet: sneak up quietly`, then `F1 Back to Normal`; at the
    rusted lid, `F3 Switch to Aggressive`, then `W Kick the lid`; in the cave, when the first mite comes for him,
    `Shift Dodge`. Bram on the lane: "Dry as the well. Everything is, this morning."

Reading time for an experienced player: the house and the yard take as long as walking through them; no tip asks to be
dismissed, and anything done before its tip appears completes it.

## 2. What is taught where (coverage of every current player action)

Bindings: Classic (the keyboard default) / Modern / pad. Review: **Pause → Controls** lists every key (and is where
they are rebound); Settings → Controls → Show control tips turns the tips off or on.

| Action | First useful | Prompt shown (tips on) | Proves understanding | Review later |
|---|---|---|---|---|
| Move / turn (`↑←↓→`; Modern WASD; left stick) | the house, at control | `↑ Walk · ← → Turn` (Modern: the four keys; pad: Left stick; touch: drag the stick) | 1.5 m walked by his own input | Pause → Controls |
| Talk (`W`/`E`; Modern `E`; pad A) | Arthur at his boat | the game's own prompt `W Talk`, only in reach and facing | the first conversation | Controls |
| Use / try / search (same key) | the kitchen tap, the cupboard | the game's prompt (`Try`, `Search`) | the first object used | Controls |
| Dialogue: show all / next (`W`/`E`, Space, Enter, click; pad A) | Arthur | in the box: `E Show all` while typing, `E Next` after | three lines moved on by hand | Controls |
| Skip the film (hold `E`) | the film | the film's own `Hold to skip` (unchanged) | the skip | — |
| Inventory and journal (`Shift`/`I`; Modern `I`/`J`; pad View) | after the ball | `Shift Open Inventory`; inside, the footer: select / close | opened | Controls |
| Magic ball: throw (`Alt`/`F`; Modern `F`; pad Y) | the yard's barrels | `Face the barrels. Alt Throw the magic ball` | a hit on the barrels | the found toast; the inventory's ball text; Controls |
| Magic ball: hold to aim / charge | after the first hit | `Hold Alt to see where it lands` | the hold (charging) | Controls |
| Magic ball: recall (the key again) / return | every throw | none (it comes back by itself) | — | the inventory's ball text |
| Holomap (`H`/`M`; Modern `M`; pad LT) | the way to the well | the cupboard's toast names it | opened | Controls |
| Behaviour: Athletic (`F2`/`2`; pad D-pad →; touch ⟳) | the project's pipe on the lane | `F2 Switch to Athletic: run and jump` | switched | Controls; Ctrl menu |
| Athletic: run (its walk is a run) | the lane | in the tip above | — | Controls |
| Athletic: jump (Space; pad A) | the project's pipe | `Space Jump` | a jump | Controls; the bay rocks' toast |
| Behaviour: Discreet (`F4`/`4`; pad D-pad ←) | Tim and Lulu, after they brush him off | `F4 Switch to Discreet: sneak up quietly` | switched | Controls; Arthur's hint |
| Discreet: hide (hold Space) | — (no chapter 1 use) | none | — | Controls |
| Behaviour: Normal (`F1`/`1`; pad D-pad ↑) | after overhearing the kids | `F1 Back to Normal` | switched back | Controls |
| Behaviour: Aggressive (`F3`/`3`; pad D-pad ↓) | the rusted lid | `F3 Switch to Aggressive: kick and punch`, then `W Kick the lid` | the lid kicked open | Controls; the lid's nudge |
| Behaviour menu (hold Ctrl; Tab cycles) | any time | none (the keys above suffice) | — | Controls |
| Camera, Free: turn (Z / C, right-drag; pad right stick) | the front door (Free camera only) | `Z C Turn the camera` / `Right stick Turn the camera` | turned | Controls; Settings → Camera |
| Camera, LBA: recentre (Enter; pad R3) | the front door (LBA camera only) | `Enter Camera behind Twinsen` | recentred | Controls |
| Camera, Follow (keyboard default) | — | none: it turns with him | — | Settings → Camera |
| Camera distance (`Q`) | — | none | — | Controls |
| Attack with what is in hand (`K`, left click; pad X) | the well's mites (the ball is in hand) | none in the house; the ball tip covers it | — | Controls |
| Dodge (Shift; pad B) | the cave, the first mite that comes for him | `Shift Dodge` | a dodge | Controls |
| Focus / lock-on (`L`, right click; pad RB), switch target (`T`, wheel) | later fights | none (the game's existing hints) | — | Controls; Settings → Lock mode |
| Weapon swap (`R`; pad LB), weapon selector (`X`; pad RT) | chapter 6's sword, chapter 10's pulse tool, the gadgets | the existing toasts at each acquisition (`c6_toast_sword`, `c10_toast_pulse`, `e2_toast_*`) | — | Controls |
| Gadgets used from the inventory (E on the item) | the arsenal and kit chapters | the inventory's `E: use` line, the acquisition toasts | — | the inventory |
| Hop-pack | its chapter | the existing toast `a_toast_jethow` | — | the inventory |
| Pause (`Esc`/`P`; pad Menu) | any time | none | — | — |
| Healing / magic restoration | when low | out of magic: the short tip above; flasks and hearts from containers and enemies (LBA2's way) | magic back | — |
| Vehicles, ferries, shuttles | their chapters | their own dialogue and menus (unchanged) | — | — |

Not taught at home on purpose (the brief: "do not overload the house"): lock-on, weapons, gadgets, the hop-pack,
travel. They are taught where they unlock, by what was already there.

## 3. The lessons' state machine (`src/game/tutorial.js`)

Each lesson is **locked → eligible → shown → done | gone**.

- **eligible** when its `when()` holds: the chapter is The Well, and the place fits (`house`, `yard` = within 22 m of
  the front door, `town`, `cave`), plus the lesson's own condition (has the ball, near the pipe, the barrels reachable
  by a throw from here — a line of sight on both sides of the ball's path, tested four times a second in the yard only —
  the kids brushed him off, the lid found stuck, a mite chasing within 7 m).
- **shown** after 0.6 s of eligibility, if it is the first eligible lesson in the fixed order and tips are on. Only one
  is ever up. It stays at least 1.2 s through a flicker. A dialogue, a menu or the found-object box hides it (CSS).
- **done** only by the action: walked 1.5 m, switched behaviour, jumped (the jump's own gravity on, off the ground),
  opened the inventory, hit the barrels, held the ball key (charging), turned the camera (Free) or recentred it (LBA),
  dodged, kicked the lid open, talked, used, moved dialogue lines on, MP rose again. Done before the tip would have
  shown counts; done with tips off counts.
- **gone**: an optional tip shown for its time in all (Move 40 s, Inventory 20, Camera 15, Athletic 25, Jump 25,
  Ball 40, Arc 15, Out of magic 8, Discreet 40, Normal 10, Dodge 10) is let go and not shown again. The lid's tip has no
  limit: it stays while the lid is stuck and he stands by it. A shown tip that stops applying (he walks off, goes
  indoors) hides and comes back later, until done or gone.
- **Saved** with the game (`tut: { v: 1, done, gone }` in the save, beside the flags, never among them). A death, a
  reload or a Continue keep it. A save from before this build has no `tut`: every lesson counts as done (a player under
  way gets no tips). A new game starts afresh.
- **Tips off** (Settings → Controls → Show control tips → Off): no panel and no dialogue key hint; lessons are still
  recognised; the existing story nudges (the lid after 30 s, the bell after 35 s) and the acquisition toasts stay,
  since they are part of the quests' fairness. No quest step waits on a lesson.
- **Cost**: a handful of comparisons a frame in play; the barrels' two line tests four times a second in the yard; no
  world scans, no input held or swallowed (the tutorial reads the input set, never clears it).

## 4. What was removed with the cup

- The cup, its iron trivet and the stove's overflow pipe (2 visible draw calls in the kitchen, and a hidden drop mesh);
  `h_cup` and its prompt `p_cup` ("Move"); the hand-carry code; the cup's "offered again" fix of P20.
- The door's wait for the tap and the cup (`canExit`), the lines that refused it (`prh_leave`, `prh_leave_cup`).
- The home objective "The tap's stopped again" with "Try the kitchen tap" and "Move Arthur's cup…": the objective is the
  chapter's own again, "Check the well" with "Take the magic ball from the cupboard".
- Zoé held at the sink and moved next door when unseen (`pr_zoeOut`): she is in the yard from the start.
- Lines: `prh_obj prh_sub_tap prh_sub_cup prh_zoe_1 prh_zoe_2 prh_zoe_3 prh_ar_1 prh_ar_2 prh_cup_1 prh_cup_2 prh_tap_3
  prh_leave prh_leave_cup`. New: `prh_ar_knock prh_ar_knock2 prh_ar_trick prh_yard_2 prh_lane0`, `pr_barrel_hit(_ar)`,
  the `tut_*` tips, `tips_*` / `set_h_tips_*`.
- Kept: the kitchen tap by hand (optional now), the yard and lane pipes, the cave's pool and growth, every flag name
  (`pr_v2 pr_tap pr_yard pr_lane pr_pool pr_growth`; `pr_cup` and `pr_zoeOut` are no longer read and do no harm).
- Saves: one from the cup's days in the house (tap tried, cup not moved) and one with the cup moved both load and play
  on (`tests/opening-tutorial.mjs` C1, C2; `tests/campaign-thread.mjs` C1).

Draw calls added to the house or yard: **0** (the barrels and the copper pipe already stood there; the tip is HTML).
Removed: 2 (by construction: the cup and the overflow/trivet were one merged draw each).

## 5. Scene adjustments

- `story/prologue.js`: Zoé's chapter-1 place is the yard (`ZOE_YARD`, facing the door); the door waits for the ball
  only; the barrels are a ball target (`ballHit`, `ballTargets`: the normal aim assist, only with a clear line, as every
  target); the neighbours' door is an ordinary locked door again (Zoé no longer stands at it).
- `story/hometap.js`: the cup's parts and hooks gone; the kitchen pipe knocks until the tap is tried; Arthur's lines;
  the garden standpipe's hand action (`h_yard`: the set-down clip, his hand at the handle's top from the path's side).
- `src/main.js` (small hooks, owned elsewhere: listed for the coordinator): the tutorial's construction and update (first
  in `updatePlay`), the dialogue's advance and key hint, `tryInteract`'s report, the save's `tut`, `applySave`,
  `startNew`, the `tips` setting (default on) and its Settings hint. `index.html`: the Settings row. No other engine file.
- `tests/lib/player.js`: `P.homeTap` does nothing now (the door waits for nothing but the ball).

## 6. Checks performed (Automated runtime only)

Snapshot of the worktree served from `/dev/shm/t920` (python http.server), Chromium headless on SwiftShader, 1280×720
or 960×540, one suite at a time (another worker's suites ran on the same machine: load average 8–10).

`tests/opening-tutorial.mjs` (new, by input; 40 checks, PASS) covers the brief's point 13:

| Brief's case | Where | Result |
|---|---|---|
| A new player following every hint (keyboard, Classic) | A1–A20 | PASS |
| An experienced player acting before hints appear | B3 (Athletic and a jump before the pipe: no tip) | PASS |
| Tips disabled from the beginning | B0–B1 (no tip, no key hint; ball, door, kettle all happen); B2 (on again: only what was not done) | PASS |
| Leaving optional practice unfinished | B9 (the arc never held; on to the well: no yard tip in town) | PASS |
| Keyboard, controller, remapped controls | A (Classic keys), B4 (ball rebound to G on the Controls screen: the tip says G), B5–B7 (a faked standard gamepad: Right stick, left stick, Y; Y throws) | PASS (the pad is faked through `navigator.getGamepads`: no real controller was used) |
| Switching devices during a lesson | B5 (pad mid-tip), B8 (back to the keyboard: no pad label left) | PASS |
| Saving and loading half way | A7 (save in the house after the ball, reload, Continue: lessons kept) | PASS |
| Missing a jump or a throw repeatedly | A13 (into the pipe: stopped, no harm), A17 (three misses, each back in the hand in 2.3 s), A20 (at 0 magic a throw still hits and returns) | PASS |
| Skipping dialogue | A3 (a press while a line types shows it all, the box says so); the film's hold-to-skip is `tests/opening.mjs` | PASS |
| Entering and exiting the house during an active lesson | A16 (the ball tip hides inside, comes back outside, not dropped) | PASS |
| Reaching the water investigation without optional lessons | B9 (the well inspected) | PASS |
| Contextual tips in town | B10 (the kids, by input: Discreet, then Normal); B11 (the lid's tips, **reproduced with flags set**) | PASS |
| Old saves (the cup's flags) | C1 (tap tried, cup not moved, no `tut`), C2 (cup moved, `pr_zoeOut`) | PASS |

Other suites on this build:

| Suite | Result |
|---|---|
| `opening.mjs` (the film played, skipped three ways, paused, Continue, a second new game, the first objective) | PASS (41) |
| `prologue.mjs` | PASS |
| `playthrough/01-prologue-surface` → `02-prologue-cave` (the bot, by input, from a new game into the cave) | PASS, PASS |
| `chapter1.mjs` | PASS |
| `campaign-hands.mjs` | the kitchen tap 5.0 cm, the garden standpipe 1.6 cm in the run, then its handle made a little larger and higher: 0.3 cm (re-measured alone, same method). The suite's one other FAIL is chapter 10's friends (Irsa's right hand 2.5 cm from her handle), outside this work |
| `campaign-thread.mjs` C (saves from before) | C1–C20 PASS (C1: chapter 1 from before, in the well); stopped by the 40-minute limit in C21+ (chapters 10–12), unrelated |
| `campaign-thread.mjs` A (chapter 2's home and pump room) | PASS (13) |
| `no-air.mjs` STATES=0 (chapter 1's people) | PASS |
| `save-migration.mjs`, `resume.mjs`, `containers.mjs`, `interior-life.mjs`, `world-consistency.mjs`, `voices.mjs` | PASS |
| `uipass.mjs` | PASS (before and after the tips row moved) |
| `menus.mjs` | FAIL on the first run (the Game page had six rows, and the suite's list of settings lacked `tips`): the row moved to the Controls page and the list updated; then PASS (a run between timed out on a 30 s click under load 13) |
| `controls.mjs` | 3 FAIL: camera smoothness margins (`accP95` 12.5–14.3 against 12, `accMax` 25.1 against 25) in the square and at Hamalayi's wall. The camera and those places are untouched by this work; not reproduced on the base build (not run there) |

Draw calls: none added (section 4). Text: every new line scanned for night, evening, tonight, sunset, dawn, dusk: none.


## 7. Limits and blockers

- **Not playtested by a person.** Comprehension, pace (the 8–12 minutes target) and the jump's feel are unmeasured.
- **The optional trick shot (a wall rebound) is not built.** The ball does rebound off walls (with magic), but the yard
  has no target whose only way in is a rebound and that the aim assist would not take straight; making one well needs
  geometry and tuning beyond this pass. The arc preview is the optional second step instead.
- **Touch**: the tips have touch wording (the stick, the ⟳ button) but no touch device was tested.
- **The camera tip** only exists for the Free and LBA cameras; Follow (the keyboard default) has no camera control.
- **The film** is unchanged (88 s, skippable): control comes after it. Shortening it was out of this pass's files.
- **Classic's real keys** (`W` to talk, `Alt` to throw, `Shift` for the inventory, `F1`–`F4`) are what the tips show by
  default, as LBA2's keyboard has them; a player who expects WASD switches Settings → Controls → Modern.

## 8. The epilogue (wave 8, kept as patches in `tools/testlab/wip-2026-11-13/wave8/`, not applied)

Wave 8 puts "Arthur's cup under the kitchen tap, just in case". With the cup gone from chapter 1 that payoff refers to
nothing the player saw, and the patches use parts that no longer exist (`home.parts.house.cup`, `sinkAt`, `setCup`,
`cupAt`, `pr_cup`). What the epilogue must change, for the coordinator:

- Drop the cup and its placement; keep the tap turned by hand running cold (`parts.house.tap`, `spout`, `K.stream`).
- A payoff for what the player did see: Arthur's boat. The opening sets it up twice ("Tim says a boat needs water. I
  say first it needs a sail."); in the epilogue the boat could float in the full sink, or Arthur could put it there
  "just in case" instead of the cup. Or simply Zoé fills the kettle. Any of these must touch real objects (NO-AIR).
- `pr_cup` must not be read; a save with it plays on.
