# TWINSEN-LOOK-38 · Twinsen toward the community's look: a topknot tied with a band at the scalp, a rounder head, a real nose · the desktop, 12.11.2026

CLOUD_ORDERS 40 item 4 (taken out of order: the user asked for it on 12.11). The user's direction, 12.11: two fan figurines of
Twinsen ("not sure I like the face, but this is the direction the game's community wants") and the official LBA2 Classic
cover. Then, on the candidates: **"look at the band, it must sit tight on the scalp"**, **"the band is in the middle of the
hair, it must be at the hair's base"**, **"the eyes are far too big and there are strange spots in them"**. The user saw
each pass (chapter 1). Applies on the branch as it is (`1f7aa404`) and after CAST-VARIANTS-2 and ARTHUR-LOOK-38
(checked with `git apply --check`, alone and on a scratch index in that order).

## Files
- `TWINSEN-LOOK-38.diff`: `tools/blender/twinsen_poly.py` only.
- `TWINSEN-LOOK-38/twinsen.json`: replaces `assets/poly/twinsen.json`. The skeleton and `characters.js` are unchanged.
- Picture `docs/future/characters/twinsen/look-38/twinsen-look-38-final-before-top-after-bottom.jpg` (chapter 1: the user saw it).

## What changed (all behind `TW_LOOK`; `TW_LOOK_OLD=1 TW_LEGS_OLD=1` rebuilds the shipped twinsen.json **identically**, checked)
- **Head:** each section's outline rounded (Chaikin) on 14 points a side (was 11). The upper head is 25 % taller and the jaw a
  little wider, so it reads as an egg. The crown is domed with four rings (it was a flat lid under the hair).
- **Hair:** LBA2's tuft down the back becomes a topknot. Its root is half sunk in the crown, and it rises and falls back in a long arc.
  A **gold band** (`band` `#d8a83a`, the medallion cord's gold, as on the cover) sits at the skin, half sunk at the back.
  The hair below the band is drawn in to 85 % of the band's section, so no hair shows between band and scalp. Weights and
  the tail bones' follow-through are as before.
- **Eyes:** back near the old size, a touch rounder (0.017 × 0.010 H, was 0.016 × 0.0085), on 12 points. The white is lifted
  0.8 mm off the face: the round eye's flat edges sank into the curved face (the "strange spots"). No catch-light. The brows sit 1 mm higher.
- **Nose:** a round tip, 7 mm proud, with a short soft bridge into the brow (it was a four-sided pyramid).
- **Shins** (unless `TW_LEGS_OLD`): one tube per shin from the knee into the shoe (60° crease angle).

## Numbers
3920 triangles (was 3274, **+19.7 %**); 3 meshes, no draw call added. floating.py: OK.

## Tests (SwiftShader, the desktop, with ARTHUR-LOOK-38 and CAST-VARIANTS-1/2 in the worktree)
solidnpc 54/54, chapter1 23/23, cast-rounds 209/209, story-journeys 30/30, prologue 26/26 PASS.

Evidence labels: **Automated runtime only**. Nobody played it. No Vega 8 frame time.

## Not verified
- Twinsen in the game's own scenes from the play camera (pictures are lookdev turnarounds).
- The band and knot through the full run cycle and the jump (follow-through weights are unchanged).
