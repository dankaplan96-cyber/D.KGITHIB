# U-3 "Off the Wall" — as built

The user's own side quest (brief: `DEPTH-PLAN.md`, "The user's five side quests", U-3). Built 15.11.2026 on
`ccr-c1c2c4b9-dep6ed`. **Automated runtime only** (headless Chromium, SwiftShader): nobody has played it, nothing was
listened to, no frame rate is claimed.

## Where

Desert Island, from chapter 4 (`dig`) on: the sandy terrace behind the School of Magic (`desertold.js`). The island's
ground there is flat at 1.3 m from the School's rock wall west to the slope; its south side is the two white blocks the
original has on the mask's terrace (bodies 46): a whitewashed wall 2.85 m high. That is the pupils' yard and Tali's wall.
Nothing of the School was moved; its door, the plaza, the bridge and the hall are untouched. The way there: from the
plaza over the bridge onto the forecourt, round the north end of the School's rock wall (about 12 game seconds from the
plaza for the bot; 73 s from where chapter 4 starts).

What the court adds (no-clutter rule: three objects, all with a job; nothing removed, the terrace was empty):
- **the bell**: a school hand-bell hanging from the arm of a wooden post on a flat stone foot. It is the ball's mark;
- **Tali's board**: an old classroom blackboard on two trestle legs, her score chalked on it (TALI 31, JOSS 2, and later
  TWINSEN n). It lies in the sand until the third game; standing, it is a wall for the ball (wood: the ball's knock is
  `bounceWood`, ACTION-SOUND-2, via the collider's `mat`) and for a walker;
- her red chalk X on the east block's face (her aim from her ring), and lines scratched in the sand: her ring, later the
  court's spots (one flat sheet, one draw);
- Tali herself (a School pupil; the `lulu` look, her own dress by DRESS-1) by the boulder at the School's back, and her
  red ball, seen only while she throws.

## The rule, and how a hit is judged

"Never hit the bell straight. Off the wall first, then the bell." The magic ball now records what it struck on each
throw (`actors.js` MagicBall: `contacts`, `{kind: 'wall' | 'ground', c: the wall's collider}`, three lines; nothing else
in the ball changed). The bell is a ball target in the desert's `ballTargets`: a tall cylinder round the bell (0.5 m,
0.1–1.9 m over the sand: the bell, its post and the air under it, so a ball skipping along the sand rings it too). It is
never aimed at (`node.lit`: `Game.ballAimTargets` leaves it out), so the throw is the player's own: the aim assist does not
bend a throw onto the bell. A ring with no wall contact is straight (refused, kindly: three lines in turn; a ring after
only sand skips gets "Bouncing off the sand isn't a wall"). With at least one wall contact it is a rebound. The bell's
clang is the hit's own (the 'armor' material); the bounces' knocks are the ball's own by surface.

## The three games and their solutions

Measured with `offwall.js flight()`, which follows the magic ball's own flight (LBA2's arc per behaviour, walls reflect
each axis on its own, every ground bounce restarts the arc, four bounces) on the island's real colliders; the windows
below are the angle ranges of the keyboard (Classic) throw, Normal behaviour.

1. **Off the wall** (teach, safe). The bell in the open 2 m before the east block. Tali first shows it: she walks to her
   ring and throws her ball off her X into the bell. Solution: from her ring, face the X and throw (a 6.5° window; a
   straight hit from the ring is a 10° window beside it, refused). Any rebound from anywhere counts.
2. **Clean**. She carries the bell 3.6 m out: off the wall and onto the bell without touching the sand. The ball comes
   down about 7 m out (Normal), so from her ring every rebound lands first ("Clean, I said"). Solution: stand closer to
   the wall than the bell (anywhere south of about z −79.5 on the court; windows around 8°); Aggressive or Athletic reach
   a little further. Her hints after the third and sixth try: "Stand closer to the wall", then "Closer than the bell is…
   or throw harder".
3. **The board**. She carries the bell west and stands her board up beside it, a divider from the wall. "From my ring
   there's only one way. It took me a week." Her way: from her ring, off the white wall just past the board's end (a thin
   4–4.5° window). The way she never thought of: **off the board** (it stops a ball, so it is a wall): from the west side
   by the slope, banking off the board's face into the bell (windows 4–9.5°; from her ring the board way does not exist,
   so "only one way from my ring" is true).
   - **Board first** (the player finds it alone): "Off my board! … Nobody said the board was a wall. Nobody said it
     wasn't. … Then it moves." She carries the board into the middle of the court.
   - **Her way first**: "That's my way! A week it took me, and you just did it." Twinsen: "Could it come off your board?"
     Tali: "It's a board. It's there to be in the way. …Go on, then. Show me." The game stays open for a ring off the
     board (her way again gets "That's my way again. The board, you said!"); the first ring off the board brings the same
     surprise and the same move. So the unexpected moment always comes from Twinsen's idea; the quest ends there in both
     cases. A save between the two keeps it (`dx_ow_c3: 'hers'`, the journal: "Show Tali the ball can come off her
     board").

DES-2's "a miss is free; the comment grows more useful after three misses" is kept: a miss, a straight hit or a sandy
ring is counted; her hint comes with her word after the third and the sixth (per game). Nothing is ever lost.

## The reward

- **The court.** From then on the board and the bell each move between three spots scratched in the sand: E at either
  (Move), his hand on it (the 'tinker' clip at the frame or the post, `reach.js`), and he carries it to its next spot.
  Every pairing of spots leaves a metre clear. Rings off the wall on the court count under his name on her board
  (a toast, "Off the wall! (n)"); straight ones do not ("Straight doesn't count"). She praises 5, 15 and 30.
- **Rector Hougo's singing crystal** (DES-2's slot `sc-trial`, now built: `crystals.js`): his prize for her game, "he said
  nobody would win it". Given with `depth.js giveCrystal` (an owed reward until picked up); a save from between the
  surprise and the toss is caught up on load (`offwall.js applyFlags`). Obtainable crystals: 9 of 12.
- **Magic**: talking to her with under 3 magic tops it up ("It's the first thing they teach us"); a dud throw on the
  court (no magic: the ball drops at its first contact and cannot rebound) makes her say so.
- The real reward is the skill: the ball's rebounds work everywhere; the court is only where it is practised. A player
  who rings her bell off the wall before she has told him the rule ("How do you know my game?") skips game 1.

## How it changes with the story (the "come back in three chapters" test)

After the quest: the board stands in the court where he left it, his name and score on it; the bell where he left it;
Tali practises there, her own throws planned on the real colliders (off the board when the layout allows it: before,
she only ever used the white wall). Her first word on each part of the story:

| Story | Her line |
|---|---|
| chapter 4 `dig` | "Move the board, move the bell. I'll keep score." |
| chapter 5 `steam` | the ground rumbles when the steam goes; "the ball doesn't care, I care a bit" |
| chapters 6–7 | Joss plays now, white wall only, house rules |
| chapters 8–12 | Rector Hougo had a go: straight at the bell, every time; "he says that's a new rule" |
| epilogue `home` | the ground's gone quiet; you can hear the bell from the School now |

Before the quest she is at her bell from chapter 4 in every chapter, practising off her X: the quest cannot be missed by
timing. Nothing on the main path depends on it.

## Flags (all `dx_ow_`, default absent)

`dx_ow_met`, `dx_ow_alone`, `dx_ow_c1`, `dx_ow_c2`, `dx_ow_c3` ('hers' | 'board'), `dx_ow_moved` (done),
`dx_ow_miss`, `dx_ow_hint`, `dx_ow_direct`, `dx_ow_bspot`, `dx_ow_lspot` (0..2), `dx_ow_rings`, `dx_ow_heard`. Each
later step implies the earlier ones on a load (`applyFlags`). A carry or a throw in progress is not saved: the pieces
are where the flags put them (the flags change when a move starts).

## Files

- `src/game/offwall.js` (new): the court's pieces and `flight()` (the ball's flight, step for step).
- `src/game/story/offwall.js` (new): the quest (cast, place, talks, the bell's hit, the games, carries, Tali's throws,
  journal).
- `src/game/text/offwall.js` (new): English text.
- `src/game/story/index.js`: registered beside the ferry and One More Place.
- `src/game/actors.js`: the ball's per-throw `contacts` (three lines).
- `src/game/crystals.js`: `sc-trial` built, owned by U-3. `src/game/story/depth.js`: its header comment.
- `tests/off-the-wall.mjs` (new); `tests/depth-1.mjs` (the registry check: 3 built, DES-2 no longer unbuilt).
- Captures: `captures/off-the-wall/`.

## DES-2's fate

DES-2 (Rector Hougo's three rebound trials) was never built: only its crystal slot existed. It is folded into U-3: one
rebound school, Tali's. Its parts that survive: three games of growing difficulty, a marked place to throw from (her
ring, her X), a free miss and hints after the third and sixth, Hougo's crystal as the prize. Its swinging third bell is
not built (no timing); its honour roll became her board. `DEPTH-PLAN.md` records it.

## Playtime (estimate, not a measurement of a person)

Bot route: chapter 4's start to the plaza 73 s, the plaza to the court 12 s. The talks are about 30 short lines (about
330 words). With the plan's formula (1.8 × the walk, about 60 s a deduction — the rule, "stand closer", the board — and
200 words a minute), plus throws: about **8–15 min** for a first play that finds it, skill varying most (narrow windows
of 4–9°). Not calibrated against anyone.

## Tests

(filled in with the run's results)

## Left for a human to judge

- Whether the court is found: the terrace behind the School has no sign; Tali's ball and the bell's clang are the
  clues (no map marker).
- The aim: windows of 4–9° with the keyboard's turning (90°/s) and the throw's preview dots (they show the path to the
  first contact: the wall). With the mouse (Modern) the throw lands at the cursor, which makes banking easier.
- Whether "off the board" is a satisfying surprise, and whether Twinsen voicing it after her way spoils it.
- The board's chalk text size, the bell's size from the play camera, the sand lines' strength.
- Tali's throw looks like a child's throw of the magic ball's arc (her red ball flies the same physics); whether a kid's
  rubber ball should fly differently.
