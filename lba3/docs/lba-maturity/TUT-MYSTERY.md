# TUT-MYSTERY (REVIEW-TASKS-19-11 task 4, P76): the opening tutorial as part of the water mystery

With PUZZLES-BRIEF item 1 (the tap and the barrels) and P81-BRIEF scene 4 (Zoé's report from next door), as the
coordinator folded them in on 20.11. Base `ccr-c1c2c4b9-dep6ed` (92911d5c, v103). **Status: Automated runtime only**
(headless Chromium on SwiftShader, driven by the keys through tests/lib/player.js). Nobody has played it.

## Baseline (before, measured on 92911d5c)

- The yard was a gate: five steps (Zoé, inventory, garden tap, barrels, pipe); crossing 15 m from the door with a step
  open, Zoé's line in the dialogue box and a **forced walk back** of 3.2 m (a cutscene; OPENING-TUT-2.md measured six
  calls in 26 s for a player heading to the well).
- The garden tap: dry, knocking, "it runs under the lane, toward the square" — nothing in the world changed.
- The barrels: "Arthur bet Tim you can still hit those barrels" — a target for its own sake.
- The inventory step: the map's star sat on Zoé while the action was a key (probe: `stars: [Zoé]`, step `inv`).
- The pipe: a jump for its own sake; walked round, the step stayed open and held the yard.
- Captures (gameplay camera): scratchpad only (`base-03-tap-used.jpg`: the barrel visible at the house's corner from the
  tap, the marker over the pair).

## What changed (code)

| # | Where | Before | Now |
|---|---|---|---|
| 1 | the yard's edge (`story/openingsteps.js`) | call in the box + walk-back cutscene, every crossing | `leave()`: the yard lets go (`pr_yardOk`), Zoé calls **once** over her head — pinned to the screen's edge as "Zoé: …" when she is out of view — with the main route's need: no kettle → "Take the kettle, Mira won't open the well on our word! And be back for dinner!"; else "Show Mira those crystals. And be back for dinner!". No cutscene, no dialogue box, nothing granted |
| 2 | the garden tap (`story/hometap.js` h_yard) | dry, knocking | dry; the knock **answers from behind the near barrel**: the barrel rocks on its foot (the world's own animation, visible under his line), Zoé turns to look at it; his line says so (`prh_yard_b`). After the joint is found, the old line |
| 3 | the barrels (`hometap.js`, `prologue.js revealJoint`, `town.js`) | a hit, "(Still got it.)" | the near barrel (now its own group, `W.homeBarrel`) **shuffles a metre aside** on its rim (its collider with it), showing the supply joint he mended yesterday on the wall's foot: bright brass, a crust of pale crystals, the ground dark and wet round the barrel's foot (a little shows before), a drop falling. His lines: "My joint from yesterday. It held. But it's weeping warm water, and it's furred like their kettle." · "Warm water, coming up the line from the square. Whatever this is starts at the well." · Zoé (if by), last: "So your fix worked. It's the water, then." — the film's "I fixed that yesterday." / "It worked yesterday." paid off. (Zoé last: he turns to whoever speaks and the follow camera with him, so his two lines are read with the joint in view) |
| 4 | a wrong try at the barrels | — (the giver's rummage only) | by hand (E, "Look"): the barrel rocks and settles, "Full of rainwater. It won't shift by hand. A good knock with the ball might move it."; a kick or punch at it moves it too (rewarded, not refused) |
| 5 | out of order | (counted) | still counted: the barrels first reveal the joint at once and the step is never asked again |
| 6 | the pipe | jump (or three tries) to finish the yard | the jump still finishes it ("Not bad for an old hero. And be back for dinner."); walked round, the yard ends as he leaves with the one call; `pr_pipe` is not set for a walk |
| 7 | panel / marker / star | inventory step: star on Zoé; door step: star on Zoé | the same thing in all three: no star on the inventory's or the door's step; the barrels' marker and star on the near barrel |
| 8 | P81 scene 4 (`text/well.js`) | "Same next door. Their tap ran warm, then stopped." | "…Their tap ran warm, knocked three times, and stopped." (the kitchen's three knocks, heard next door: a concrete observation) |
| 9 | P81: no second send to the well | `t2_zoe_done` "…Now, the well.", `t2_zoe_close` "…Go on, the well." | "Not bad for an old hero. And be back for dinner." / "Close enough. And be back for dinner." (he has decided; the objective shows it). A lost player asking Zoé again gets the short lines that were there (`pr_zoe_kettle_wait`, `pr_zoe_go`) |

Kept: the film (`op_*`, untouched, so its timed subtitles and pauses are as they were), Zoé's call as he steps out, the
step order and every flag and string ID (old `t2_back_*` lines stay defined, unused), the house, Arthur, the kitchen tap,
the where-lines and reminders (TUTOR-TARGETS), the tips-off behaviour, the far-past-the-edge rule (a save or a teleport
lets the yard go silently).

Text: English and Hebrew (`text/thread.js`, `text/opening.js`, `text/well.js`, their `he/` files, `he-text.js`
regenerated); `voicemeta.js` entries for the new spoken lines (`prh_yard_b`, `prh_barrel_try`, `prh_joint_1`,
`prh_joint_zoe`, `prh_joint_2`) and for `pr_zoe_kettle` (concerned). Zoé's yard words are bubbles (not voiced, their
time from their length, as before). `node tests/dialogue-check.mjs`: PASS. No new shipped file.

### State (saved flags; nothing new in the save's shape)

```
pr_tut2 ─ zoe(pr_kettle) ─ inv(tut 'inventory') ─ tap(pr_yard) ─ barrels(pr_barrel) ─ pipe(pr_pipe 1|2)
   │   the current step = the first not done (anything early counts)
   ├─ all done ──────────────► pr_yardOk  (Zoé: "...be back for dinner")
   └─ walks past 15 m first ─► pr_yardOk  (Zoé's one call: the kettle, or "show Mira"; nothing granted)
pr_barrel in chapter 1 (pr_v2) → the near barrel stands aside on load; otherwise in its place
```

## Routes verified (tests/tutor-targets.mjs, one focused run)

`GAME_URL=http://localhost:8774/ node tests/tutor-targets.mjs` (the worktree served by `python3 -m http.server 8774`,
Chromium headless on SwiftShader, 1280×720, one browser; other workers on the machine): **26/26 PASS, no page or
console error, no missing file**; about 15 minutes. On the commit that adds this document (code as of 6f4ac3c0; the test's capture moment changed after). Every action is by the
harness's keys (arrows, W/E, I, F, F2, Space); story flags are only read, except R3.4's save written as the old build's.

| Route | Checks | What was seen |
|---|---|---|
| R1 a beginner following each cue | R1.1–R1.17 | the cupboard and the door marked (no star for either); Zoé: marker + star + "Talk to Zoé"; her report "Their tap ran warm, knocked three times, and stopped"; the inventory step with **no marker and no star**; it opens on the crystals; the tap: panel, marker and star on the standpipe; the where line at 15 s, Zoé's reminder at 35 s; the tap tried → his line "…knocks back behind the barrels…", the near barrel rocks (0.078 rad peak), Zoé turned to it; the barrels step: goal, marker and star on the near barrel; the edge arrow "Barrels" when off screen (still in the yard, 11 m); tips Off keeps goal and marker; a shove by hand → "A good knock with the ball might move it", nothing moves for good; the ball → barrel 1.0 m aside, collider with it, the four lines; the pipe: marker and star on it; the running jump → `pr_pipe` 1, "Not bad for an old hero. And be back for dinner."; on to the well 79.6 m from the door, **0 cutscenes**; Hebrew present |
| R2 a returning player | R2.1–R2.5 | the barrels first: the joint and its lines, the step goes on at Zoé (nothing redone later); straight for the well: 78.9 m, **0 cutscenes, 0 dialogue boxes from Zoé**, one call `t2_call_kettle` seen pinned as "Zoé: Twinsen! Take the kettle, Mira won't open the well on our word! And be back for dinner!"; no kettle, no item granted; objective "Check the well", star on the well; the well inspected, Mira refuses, the star on Zoé, the kettle, the key |
| R3 a reload halfway | R3.1–R3.4 | saved after the tap, Continue: the barrels step, marker and star on the near barrel, the barrel in place; knocked, saved, Continue: the barrel aside (collider too), the pipe step; the pipe walked round (his way went by the lane's knock, read): the yard let go with `t2_call_go`, no cutscene, `pr_pipe` not set; a save as the build before wrote it (mid-yard, barrels hit): the pipe step, the barrel aside, the jump finishes the yard |

Captures (the follow camera; looked at): `captures/tutor-targets/01-yard-tap.jpg`, `02-tap-knock-barrel-rocks.jpg`,
`03-barrels-step.jpg`, `04-joint-shown.jpg` (the barrel aside, the brass joint small at the house's corner),
`05-pipe-step.jpg`, `06-straight-to-well.jpg`. A close still of the joint (staged camera) was looked at during the work:
brass coupling, pale crystals, the wet ground, the pipe along the wall's foot.

Earlier runs of the same test during the work: a check reading the dialogue box mid-typing (fixed in the test), the
server stopped by its own time limit mid-run, and the walk round meeting the lane's remark (the test now reads it, as a
player would). Not run (by the user's rule, for the one full test at the end): `opening-tutorial.mjs`, `prologue.mjs`,
`chapter1.mjs`, the playthrough segment 01, `save-migration.mjs`, `campaign-thread.mjs`.

## Files

`src/game/story/openingsteps.js`, `src/game/story/hometap.js`, `src/game/story/prologue.js`, `src/game/town.js` (the near
barrel kept out of the merge: one group, same look and random draws), `src/game/text/{thread,opening,well}.js`,
`src/game/text/he/{thread,opening,well}.js`, `src/game/he-text.js` (generated), `src/game/text/voicemeta.js`,
`tests/tutor-targets.mjs` (rewritten: the three routes), `tests/opening-tutorial.mjs` (its call-back checks A9/A12/B1/C3
follow the new contract; not run: the full suites at the end).

## Remaining / risks

- **Not played by a person**; how the knock, the rock and the joint read at a glance, and whether Zoé's pinned call
  reads as a call, are unjudged. The joint is small at the follow camera's distance (a brass coupling, crystals, the
  wet ground); the tree west of the throwing spot hides part of the house's corner in some camera angles.
- **The pipe as "the quick route"**: over the pipe is the straight line north from the yard's east side, but the lane
  and the field are open on both sides; from the map's coordinates (not timed) the walk round its south end costs about half a metre. It reads as
  the direct way, not a real shortcut; making it one would need the yard's geometry changed (not done).
- `town.js` (shared world builder) changed by four lines for the movable barrel: partner/coordinator review.
- `tests/opening-tutorial.mjs` (25 min) was edited, not run; `tests/lib/player.js` `P.openingYard()` is unchanged and
  still does the steps in order (the tap's line now names the barrels; the harness reads it).
- The barrel goes back to its place after chapter 1 (a load in a later chapter); in one continuous session from
  chapter 1 into 2 it stays aside until the next load.
- Mira's refusal and the walk back to Zoé for the kettle are back on the skip route by design (the call says so first).
