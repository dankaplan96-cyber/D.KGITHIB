# PATHS-140 (P140, the user, 26.11, on P136's own after picture: "עדיין לא שלם!!!", "still not complete!!!")

Branch `ccr-c1c2c4b9-dep6ed` + this worktree's commits. Evidence: **automated runtime only (SwiftShader, headless
Chromium)**. Nobody played it; nothing was checked on a real GPU.

Status: in progress (rule written; world fixes next).

## The user's spot (`captures/paths-140/user-report.jpg`)
- Bottom half of the crop: P136's `top-ne` after picture, Citadel north-east of the square's ring (camera over (−40, −12)).
  - **The ragged corner** at (−32, −16.5): the north street (`world.js` GRID_STREETS, z −15.8) and the block's east
    street (x −32.5) both end at the same point. Each end was cut flush on the other's centre line, so the corner's outer
    1.5 × 1.5 m quadrant was never paved; the per-vertex cut drew it as a notched diagonal. The same at (−52, −15.8).
  - **The open dirt lot** east of the east street's kerb (x −31…−24, z −19…−2): `townSoil`'s noise (bare soil with lawn
    blobs, within 36 m of the square) beyond the kerb's 2 m earth band.
- Top half: P136's `top-sign` after picture, bottom right: **the kerbed bare rectangle** south of the cross street,
  between the street down the fields' path (x −45.6) and the link to the footbridge (x −32.5), z 32.8…40: WA-12's wild
  soil (`wildGround`, from 40 m off the square) inside the town grid.

## The rule
(to be completed)
