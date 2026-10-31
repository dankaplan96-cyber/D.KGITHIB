# REV-TY-1 — independent review of 0.24.0 (eee77ea), "Twelve years on, first set"

Reviewer: the lba3-reviewer agent. No game source changed. Evidence in this folder (logs, review runner `rev.mjs`,
isolated test saves `save-*.json`, cited screenshots in `shots/` converted to JPEG; the rest of the screenshots were
dropped to keep the repository small).

Verdict: side-story logic and saves accepted for the tested scope; visuals/readability not accepted yet (D1, D2).

| Criterion | Result | Evidence |
|---|---|---|
| Each addition has a use and a visible consequence | FAIL (house part) | pump and shipment change visibly; the house corners are looks only; board/meter textures never change (D4); Arthur's bench hidden (D2); shop hides its own cue (D1) |
| Both side stories complete by normal input in valid alternative orders | PASS | rev-ch2.log from a real save; townlife test |
| Save / close / Continue keeps their state | PASS (D5) | rev-hot.log, rev-ch2.log |
| Lines change across story events | PASS | rev-pro, rev-ch2, rev-house-heat (real save), seg05-plan-house (input), rev-evac-fixed (ISO) |
| No access problems around new props | PASS | rev-access-held6.log |
| No collision problems around new props | FAIL (Low) | D3 |
| No regression of main progression (tested scope) | PASS | segments 01–05 by input; house, prologue, transitions, resume tests |
| English only, short, natural | PASS | 96 strings, longest 132 chars |
| No invented canon; FunFrock dead; no Earth night | PASS | — |

Defects
- D1 (Medium): Nell's shop's back wall/roof hides Nell, the bench and the coupler's glow from the normal camera; the
  glow is the puzzle's cue. The shop and its barrel sit across an existing dirt path (the garden beds too).
  shots/pro-shop-prologue.jpg, ch2-coupler-glowing.jpg, cast-npc-nell.jpg, ch2-engine-runs.jpg, ch2-boatbox.jpg
- D2 (Low-Medium): Arthur's workbench and paddle boat are hidden behind the family-room wardrobe from the house camera
  (an "Inspect" prompt with Twinsen x-rayed). shots/crop-house-bench.jpg
- D3 (Low): the lane's 14 m copper pipe, the pump sign post and the customs barrier post have no colliders; the
  trough is standable. shots/crop-pipe-clip.jpg
- D4 (Low): Zoé's board always shows 8 green pins, even in the prologue; board and meter never change visually.
- D5 (Low): Nell's fee (and Bram's clover) are lost if saved before pickup (flag saved with the spawn). rev-loss.log
- D6 (Low): the boat box gives the pliers in the prologue (side story not open yet; journal line done; Arthur's
  admission skipped). QA.md's "no side story yet" row is inaccurate. rev-pro.log
- D7 (Low, motion): working the pump, his hands are ~0.5 m from the handle; he stands in the tulip bed which clips
  the plinth; the sign is edge-on to the camera. shots/crop-pump-runs.jpg
- D8 (Low, narrative): the coupler's ownership is unclear (Xil never appears; the empty crate is "cleared";
  "Xil left a finder's fee" unexplained). STORY_BIBLE.md says "Approved in that pass" while TWELVE_YEARS.md says
  "proposed developments".
- Test weakness: in tests/townlife.mjs the clover assertion (`- clov0 >= 0`) is always true.

Risks: Arthur's pliers exchange runs before his main-story talk while the pliers are sought (one extra press, code
reading); the hot-coupler drop always damages and says "put back on the bench" even 40 m away; Zoé's board links to
the plan reveal only in an optional look. Not covered: GPU frame rate, gamepad/touch/audio (BLOCKED), chapters 4–12.
