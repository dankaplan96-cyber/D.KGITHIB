# TUTOR-TARGETS (P67 phase 2): the home tutorial's things made unmistakable

The user, 18.11.2026, from actual play: the home tutorial's references ("the tap", "the barrels") are unclear — the
player can't identify the object. (The first attempt, worker branch worktree-agent-a97564ea1b7a0bbe5, left no commits:
redone from scratch 18.11 in the coordinator's checkout.)

## What changed
For every step of the opening (story/openingsteps.js) that has a thing to find:

| Step | The thing marked | Goal line (English) |
|---|---|---|
| ball | the tall cupboard (wardrobe) in the kitchen (the cellar: its stairs up) | Take your magic ball from the cupboard |
| out | the house's front door | Go out to the yard |
| zoe | Zoé | Talk to Zoé |
| inv | — (a key, not a place) | Look at the Kettle Crystals in your inventory |
| tap | the brass standpipe with the bucket | Try the garden tap **by the front door** |
| barrels | the two barrels at the house's corner | Hit the **two** barrels **by the house** with the magic ball |
| pipe | the copper pipe, at the stretch level with him | Jump over the **copper** pipe **along the lane** |

- **Exact object**: a gold point-down marker bobs over the object itself, a pulsing ring at its foot. Drawn over
  everything (the barrels are behind the house's corner from the door). `OpeningSteps.target()` names it;
  `Tutorial.mark()` draws it.
- **Off the screen**: an arrow at the screen's edge pointing to it, with its name (Garden tap, Barrels…) —
  `Tutorial.arrow()`.
- **Escalating hint**: after 15 s on a step the panel adds where the thing is in words ("A brass tap on a stone foot,
  a bucket under it, a few steps from the door") and the marker grows; after 35 s (and every 35 s) Zoé says which one
  she means over her head ("The brass tap, right here by me. The one with the bucket.").
- **Tips Off**: the goal, the where line and the marker stay (only the keys go — the steps can't be done otherwise).
- **Save/load, remap**: nothing new is saved (the step comes from the story's flags; the hint's clock starts again);
  keys are the bindings in use, as before.
- Hebrew for every new line (src/game/text/he/opening.js → he-text.js).

Cost: one cone and one ring (built on first use), moved per frame while a step is open; one projection for the arrow.
Nothing runs once the yard is done.

## Files
`src/game/tutorial.js` (mark, markMesh, arrow, the hint clock, the where line), `src/game/story/openingsteps.js`
(target), `src/game/interiors.js` (R.cupboard: the wardrobe's own spot), `src/game/text/opening.js`,
`src/game/text/he/opening.js`, `src/game/he-text.js` (generated), `tests/tutor-targets.mjs`.

## Results (Automated runtime only)
See below; captures in `captures/tutor-targets/`.
