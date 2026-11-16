# U-5 "The Quiet Channel" — as built

The user's own side quest (brief: `DEPTH-PLAN.md`, "The user's five side quests", U-5). Built 16.11.2026 on
`ccr-c1c2c4b9-dep6ed` (worktree base `3a7544cb`). **Automated runtime only** (headless Chromium, SwiftShader): nobody has
played it, nothing was listened to, no frame rate is claimed.

> **Late game.** Everything here is chapter 11 and after the ending. The captures in `captures/quiet-channel/` and the
> story details below are for the team, **not for players or the user's public notes** (they show the last chapters).

## Where, and why there

The underground installation under Citadel's station (`underground.js`, chapters 11–12 and the epilogue). The pipe is
at the **bottom of the shaft** (`c3shaft`), the room every player walks through first in chapter 11 (the lift pad → the
tunnel to the deep installation): the crew's own landing, with their tea corner and the shift log ("All crews up …
Shaft closed. V."). It is a safe room (no drone, no mites), so the new mechanism is met with no danger and no timing
(the plan's rule: teach a mechanism safely). The next room's own knocking puzzle (the fitters' knocker under the shell,
`answer.js`) comes after it on the main way and is untouched.

The "control room" is the **station's control room** on Citadel (`interiors.js` buildControl, "Station control room"),
at the top of the same shaft: the riser runs up the lift's shaft to it. Its door is offered in chapter 11 only once the
channel is open (`quietchannel.js doors()`); in the epilogue it is open anyway (`townDoors`).

The brothers: **Tolli** is the existing shield-crew engineer of the epilogue (`deeplife.js`, his voice `dp_tolli`,
seed 1702): he now has a brother and a place in chapter 11 (by the horn, upstairs, once the channel is open). **Matto**
is new (minor, placed with purpose): he minds Pump Two on cooling line two, cut off when Vesk closed the shaft; heard
through the pipe in chapter 11 (a band-limited "radio" voice), in person after the ending. Voice `qc_matto` (quetch,
seed 1815, lower and slower than Tolli; `n_qc_piperadio` is the same voice through `ALIAS qc_pipe`).

**New (ours, not LBA1/LBA2):** Matto, Pump Two, cooling line two's riser, the brothers' knock, Tolli's brother. Nothing
in the main story changes; no line names anything ahead of the part it is said in.

## How it plays

1. **Noticed by ear and by sight** (no marker, no objective, no journal line until it is noticed): a riser pipe beside
   the walk from the lift knocks — heavy, light, light, then a rest of about three seconds (the campaign's "three and a
   rest": "We pinched that beat off the ground … Ours just have weight"). Each knock sounds from the riser (heavy
   `pipeKnock`, middle `clunk`, light `hitMachine`), the pipe shudders, its **gauge's needle kicks by the knock's weight**
   (light ≈ 0.33, middle ≈ 0.6, heavy ≈ 0.95 of the dial) and a **white lamp over the gauge flashes** with each of his
   knocks. So the rhythm reads with the sound off. **Listen** (E): "(That's not the ground. Someone is knocking on this
   pipe by hand: one heavy, two light, then a rest.)" and the valves' rule: "(Snap a valve shut and the water hammers the
   pipe. Big valve, big knock.)"
2. **Three valves** on the riser's header at hand height, big, middle, small; the prompt names the one in front of him
   ("Snap the big valve"). E: he steps to it and his hand turns the wheel (NO-AIR, `tinker`), the wheel snaps, the pipe
   knocks with that weight, and one of three amber lamps under the gauge lights. Three knocks make an answer; the rest
   after them sends it. Nothing is timed: he may take as long as he likes between knocks. Walking off (4.5 m) drops a
   half-made answer silently and the call starts again.
3. **First exchange** (copy his call): right → "Tol! At last! A week I've been knocking at a cold pipe." He takes
   Twinsen for his brother; their end-of-shift knock is announced *before* it is asked: "I knock it, you knock it back to
   me backwards." Wrong → "Tol? That's not our knock: one heavy, two light. Have you forgotten in a week?"; a second
   wrong → "The big one once, then the little one twice. Then you rest." (the valves named).
4. **Second exchange** (his call light, middle, heavy; the answer backwards: heavy, middle, light). Wrong → "Backwards,
   Tol. Last knock first."; again → "…Tol never needs telling twice. Who is this?". Right → "You're not Tol, are you?"
   Twinsen says who he is; Matto, Pump Two, the tunnel Vesk shut with the shaft, the dead phone, his brother Tolli up at
   the station; the riser cock beside Twinsen is tagged shut.
5. **The riser cock** (a red T on the pipe, Vesk's paper tag SHAFT CLOSED. V.; before step 4 it can only be looked at):
   "Open the riser", his hand on it (`reach`), the tag gone; "Hear that? It's breathing all the way up." The channel is
   open; Matto chats up the pipe now and then (a phrase every 9–14 s on the gauge).

### What stays (the "come back later" test)

| When | Where | What |
|---|---|---|
| chapter 11, the channel open | the station's control room | its door offered; the riser's brass speaking horn on the left wall, its lamp lit; **Tolli** by it (first word: "That's my brother!"; then a line by the story's stage) |
| before the cooling | the horn (Listen) | "Pump Two to the station. Line two is running hot as soup, and the bore has never been this loud." |
| after the cooling (`c3_cooled`) | the horn | "The line just went cool under my hand. Tol, I bet that was the knocker." Tolli: "knocking like a happy woodpecker" |
| the galleries' pillars woken (`c3_pillar0–2`) | the horn | "The rock out here hums now, like a wet finger round a glass." |
| chapter 12 | — | the player is in the core; nothing is offered (no message ahead of the story) |
| after the ending | the horn | both brothers at once: Matto "…This is Matto, downstairs." / Tolli "Stop knocking for fun and come and check the loop." / Matto "We're in the same room, Tol. I can just talk to you." |
| after the ending, after dinner | the deep installation | **Matto on shift beside Tolli** (by valve B; Tolli's round as before): talked to, both speak ("A door, a tunnel, and my brother at the end of it." / Tolli: "He knocked on the wall when he came in. Out of habit. The wall."); then a word of his own, alternating. Tolli's first word after the ending is about him. The riser is quiet. |

A player who never stops at the riser loses nothing: the main path, the objective, the chapter's doors and the epilogue
are as before (no Matto, the horn's lamp off, no channel door in chapter 11).

```
 his call 311 ──answer──▶ copy? ──no──▶ kind correction (step stays) ──▶ his call again
                              └─yes─▶ step 1: "Tol!" ── his call 123 ──▶ backwards? ──no──▶ "Backwards, Tol" …
                                                                             └─yes─▶ step 2: Matto named
 step 2 ──hand on the riser cock──▶ dx_qc_open ──▶ control room door (ch.11), horn by stage, epilogue: same room
```

## State (all `dx_qc_`, default absent: an old save loads with nothing made up)

`dx_qc_heard` (listened), `dx_qc_step` (0–2), `dx_qc_miss` (wrong answers at the current step), `dx_qc_wrong` (all),
`dx_qc_open` (the riser opened), `dx_qc_tol` (Tolli's first word upstairs), `dx_qc_msgs` ('hot,cool,stones,home': the
horn's messages heard), `dx_qc_home` (the brothers met after the ending), `dx_qc_tolHome`. `applyFlags` keeps them
consistent (open implies step 2 and heard; nothing past the riser without `open`; unknown stages dropped). An answer
half made, a knock in the air, a conversation under way are not saved: a load starts his call again at the step saved.
No item, no inventory slot, no reward beyond the channel (the user's rule 1: something new in the world).

## Files

- `src/game/quietchannel.js` (new): the riser, its header and valves, gauge, lamps, cock and tag (in `c3shaft`); the
  control room's horn and lamp; the people's spots.
- `src/game/story/quietchannel.js` (new): the quest (the call, the answers, the replies, the cock, the horn by stage,
  Tolli in chapter 11, Matto after the ending, journal, doors).
- `src/game/text/quietchannel.js` (new): English text (58 keys).
- `src/game/story/index.js` (shared, registration only, as U-1..U-4): cast, placement, decorate, journal, doors,
  interactables, interact, talk, update, applyFlags, regionBuilt.
- `src/engine/voice.js` (shared, additive): `qc_matto` (seed 1815) and `ALIAS qc_pipe → qc_matto`.
- `tests/quiet-channel.mjs` (new). Captures: `captures/quiet-channel/` (late game, team only).

No-clutter count: the shaft's landing +1 (the riser with its header, gauge and cock: one fixture), the control room +1
(the horn on the wall), the deep installation +1 person after the ending.

## Tests (Automated runtime only)

Snapshot of the worktree served from `/dev/shm/t989` (python http.server on 127.0.0.1:8989), headless Chromium on
SwiftShader, 960×540, one suite at a time on a shared machine (load 6–8).

RESULTS_TABLE

`tests/quiet-channel.mjs` covers, by input (arrow keys through the harness's walk, E, the pause menu): chapter 11 by
flags, down the collar; the riser before anything (no state, nothing in the journal); **his call read by sight** (the
needle sampled every 0.02 s: phrases `311`, rests ≈ 3.3 s, the lamp's flashes) and the sound requests; Listen; **a wrong
rhythm** (the small valve ×3: his hand on each wheel, the count lamps 1-2-3, the kind correction, the step kept); **the
right one** (big, small, small); his second call by sight (`123`); **Save & quit → Continue** mid-way (back at the riser,
the step kept, the second call on the gauge); the second answer wrong (as knocked) and right (backwards), Matto named;
the riser cock (`reach`, the tag gone); up the lift, the control room's door, Tolli by the horn; **the horn in three
story stages** (hot, cool, the pillars), each message only in its stage; **the epilogue** (the horn carries both voices;
Tolli not upstairs; down the collar after dinner: Matto and Tolli in the deep installation, both speaking); the text
scan; **old saves** `base-14` (chapter 11 at the bottom of the shaft: no state, the riser knocks `311` for a new player)
and `base-15` (chapter 12: nothing shown). The cooling and the pillars are set by flags (their play is `chapter3`'s).
Not run by input: Death → Retry (nothing in the shaft's landing can hurt him; a Retry reloads the autosave, whose
flags `applyFlags` settles); Modern controls; a listening test of the voices or knocks.

Captures (`captures/quiet-channel/`, 960×540 play camera unless noted, late game: **team only**): 01 the riser knocking
on the landing; 02 at the valves ("Snap the small valve"); 03 the riser open; 04 Tolli by the horn in the control room;
05 after the ending, Matto by valve B and Tolli on his round; 07/08 a staged close look (2× scale, cropped) at the gauge
in a heavy knock (the white lamp lit, the needle up) and at rest.

## Left for a human to judge

- Whether the riser is noticed by ear and by its lamp from the walk, without being told; the gauge is small in the
  room's camera (the white lamp is the stronger cue). If players walk past, a louder first knock as the lift lands
  (not added: no forced cue) is the next step.
- Whether "backwards" is understood from Matto's line; two kind corrections are the safety net.
- Matto's model (`worker_b`, a dress of its own, a cool tint) beside Tolli's: whether they read as brothers.
- The radio filter as "a voice through a pipe" (it is the game's radio band).
