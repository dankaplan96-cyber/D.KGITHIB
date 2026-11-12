# TWINSEN-ORIG · Twinsen back to LBA2's own head and hair, keeping the new face · the desktop, 12.11.2026

**Replaces TWINSEN-LOOK-38's head and knot** (applied as `8d9730db`). The user, 12.11, on the shipped look: "the knot looks
like an undefined pipe; the old one was better but doesn't fit". Five more tries followed (a grooved knot, three balls, a
bun with locks, lower knots, a tall egg with a pointed lock); the user: "now Twinsen's head is distorted", "no, it looks
terrible", and then **"look at the original model from the second game"**. LBA2's body 1 was drawn beside ours with
`tools/lba-source/studyrender.py` (from the user's files, study only, nothing committed): a short broad egg, neither
stretched nor narrowed, and the hair as **three flat-shaded balls**: a big one on the back of the crown, two smaller going
back and down. Built that way, the user: **"the first one is normal"** (no band). Applies on the branch as it is
(`c47c5c83`; `git apply --check`).

## Files
- `TWINSEN-ORIG.diff`: `tools/blender/twinsen_poly.py` only.
- `TWINSEN-ORIG/twinsen.json`: replaces `assets/poly/twinsen.json`. The skeleton and `characters.js` are unchanged.
- Picture `docs/future/characters/twinsen/look-38/twinsen-orig-shipped-top-new-bottom.jpg` (chapter 1: the user saw it).

## The user's choice (12.11, after many tries)
After the three balls the user asked for a band, then for none; the head was rebuilt several times (back to LBA2's raw
sections, a ponytail, other heads). The user then marked the version to keep, **"the best, but without the band"**, and
on seeing it alone: **"the head version now is excellent, leave it like this"**.

## What changes against the shipped look
- **Head:** smoothed as TWINSEN-LOOK-38 did (Chaikin, 15 points a half) on LBA2's measured sections, **not stretched**
  (TWINSEN-LOOK-38 made the crown 25 % taller) and **not narrowed** (it drew the jaw in to 88 %). Above the brow (0.908 H)
  one smooth arc: the 0.908 section scaled about its middle along a quarter ellipse to a round apex at 0.972 H (the
  original's top sections narrow sharply and, smoothed and capped with a dome, made a bump over the brow and a flat lid).
  The eyes, nose, brows and shins of TWINSEN-LOOK-38 stay.
- **Hair:** LBA2's three balls at their measured places and sizes (centre y, z, radius in H: 0.951 / −0.052 / 0.0494,
  0.925 / −0.103 / 0.0355, 0.890 / −0.118 / 0.0247), each drawn whole (14 × 9), flat shaded as LBA2 draws its spheres;
  weights as before (the crown ball on the head, the tuft's two on `tail0`…`tail2`).
- **No band.**

## Builds (all checked identical with `polydiff`)
- default: TWINSEN-ORIG (the user's choice).
- `TW_LOOK_38=1`: the look as shipped (`assets/poly/twinsen.json` on `c47c5c83`).
- `TW_LOOK_OLD=1 TW_LEGS_OLD=1`: the model before TWINSEN-LOOK-38 (`8d9730db~1`).

## Numbers
4336 triangles (shipped 3920, **+10.6 %**); 3 meshes, no draw call added. floating.py: OK.
Pictures (chapter 1, the user saw them): `twinsen-orig-shipped-top-new-bottom.jpg` (lookdev) and `twinsen-orig-in-game.jpg`
(the game on the GTX 1050, chapter 1, the play camera).

## Tests (SwiftShader, the desktop)
solidnpc 54/54, chapter1 32/32, cast-rounds 209/209, story-journeys 30/30 PASS. prologue: 30/31, the well's mites (4 of 4
beaten, but the room read null at the end), a check KNOWN-FAILING.md lists as intermittent; run alternately against the
unchanged branch: the unchanged branch failed it once too (15 tries) and passed once, the new Twinsen passed it once (12
tries). Not caused by this change.

Evidence labels: **Automated runtime only**. Nobody played it. No UHD 630 frame time.
