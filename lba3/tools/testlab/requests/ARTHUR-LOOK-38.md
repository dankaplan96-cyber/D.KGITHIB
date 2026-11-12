# ARTHUR-LOOK-38 · Arthur brought up to his parents' finish: head, hair, nose, tunic, shoulders · the desktop, 12.11.2026

The user, 12.11, looking at Twinsen beside Zoé and Arthur: **"Arthur is really not at the level of Twinsen and Zoé"**, then
**"yes, the body too"**, then on a candidate **"the shoulders are strange"** (fixed: see below). The user saw each pass (chapter 1). Twinsen
and Zoé have scripts of their own; Arthur is built by `cast_poly.py`'s general Quetch path (the only `teen`). Applies on the
branch as it is (`1f7aa404`) and after CAST-VARIANTS-2 (checked with `git apply --check`, alone and on a scratch index).

## Files
- `ARTHUR-LOOK-38.diff`: `tools/blender/cast_poly.py` only. Every hunk is inside `build()` and keyed on `teen`.
- `ARTHUR-LOOK-38/arthur.json`: replaces `assets/poly/arthur.json`. The skeleton, the LOOKS entry and the palette are unchanged.
- Picture `docs/future/characters/arthur/look-38/arthur-look-38-before-top-after-middle-family-bottom.jpg` (chapter 1).

## What changed (`ARTHUR_LOOK_OLD=1` rebuilds the shipped arthur.json **identically**, checked; no other look is touched)
- **Head:** each section's outline rounded (Chaikin) on 13 points a side (was 11), and the rows between sections on a
  Catmull-Rom curve (was a straight midpoint). The crown is domed under the hair.
- **Nose:** he had none (`nose` was skipped for `teen`). Now he has his father's new nose a size smaller: a round tip and a soft bridge.
- **Hair:** shaded smooth (crease angle 180, was 70), on 15 points (was 13) and with a row between each section, so from behind it is
  round, not a hexagon. It is fuller (1.7 cm off the skull, was 1.2) and its crown is rounded over. The three flat locks on top
  stood up as boards and are gone. The crown tuft is now a round lock that rises and arches back, a small echo of his father's knot.
- **Tunic:** 16 sides (was 12). The shoulders slope (two rings between the chest and the neck). A **V opening** at the neck: the skin
  laid on the chest in six rows on the tunic's surface (one flat triangle cut into the curved chest), edged in the trim.
  Soft folds in the skirt. A square brass buckle (`#c8a050`) on the belt.
- **Shoulders:** the sleeve's flat top stood above the tunic as a square pad. Now the sleeve starts inside a round shoulder
  ball of its own width, the ball's top just over the tunic's shoulder line.
- **Neck, arms, legs:** the neck is 18 % thicker (it read as a stalk), the limbs 7 % fuller, all on 10 sides (was 8).
  The trousers have a turned-up cuff over the shoe.

## Numbers
4050 triangles (was 2836, **+42.8 %**): over the +25 % the cast's variants keep. He is a lead now: about his father (3920),
well under his mother (7190). 3 meshes, no draw call added. floating.py: OK. Roles keep their hexes (tunic, trim, belt, pants,
shoes, hair, skin); the buckle and the V's skin are new parts in fixed or skin colours.

## Tests (SwiftShader, the desktop, with TWINSEN-LOOK-38 and CAST-VARIANTS-1/2 in the worktree)
solidnpc 54/54, chapter1 23/23, cast-rounds 209/209, story-journeys 30/30, prologue 26/26 PASS.

Evidence labels: **Automated runtime only**. Nobody played it. No Vega 8 frame time.

## Not verified
- Arthur kneeling at his boat (`kneelWork`) and in the kitchen beat with the new shoulders and V. Pictures are lookdev
  turnarounds in the rest pose.
