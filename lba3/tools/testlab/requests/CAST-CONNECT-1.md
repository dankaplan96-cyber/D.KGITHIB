# CAST-CONNECT-1 · every limb joined to the body; the Grobos' brows, ears and Yorna's hat (the named cast, batch 2) · the desktop, 11.11.2026

The user, 11.11, while this batch was being built: **"the ears are in the air"**, then **"every limb should be
connected"**. A new check (`art/blender/characters/jobs/floating.py`) found loose parts in **51 of the 61** cast models;
after this batch **3** are left, all under 1.3 cm and explained below.

Apply **after CAST-POLISH-NAMED** (`git apply --cached --check` clean on origin `1d0bd24e` with NAMED applied first).

## Files
- `CAST-CONNECT-1.diff`: `tools/blender/cast_poly.py` only.
- `CAST-CONNECT-1/*.json`: 52 models for `assets/poly/` (each replaces the shipped one; for baldino, hesk, yorna and councilC
  this replaces NAMED's file too). No new look: no skeleton, index or `characters.js` change.
- Pictures: `docs/future/characters/connect-1/connect-1-before-left-after-right.jpg` (Gilbert, Doran, Pippa, Mira: chapter 1,
  may go to the user); `ch3plus-yorna-flaps-brows-before-after.jpg` (not for the user).
- The check and its reports: `art/blender/characters/jobs/floating.py`, `art/blender/characters/connect1/reports/floating-{before,after}.txt`.

## The check (floating.py)
Each connected piece of a model's body mesh (rest pose, vertices merged at 0.1 mm) is measured against the others
(least vertex-to-triangle distance both ways, or one inside the other by ray parity). Pieces that touch are joined, but
only through their bones' family (the same bone, or an ancestor within three steps, by `skeletons.json`): an ear must hold
on to the head, not to a shoulder it happens to graze in the rest pose. Every group not joined to the body's is reported
with its gap. Eyes and mouths are separate meshes and are not measured. Usage:
`SKEL=art/characters/skeletons.json python art/blender/characters/jobs/floating.py assets/poly/*.json` (numpy).

## What was loose, and the fix (every fix behind an env flag that builds the old part; with all flags the 61 models
rebuild equal to the current files, but for 1e-4 rounding and fclone's 40 bone indices, which differ the same before)
| What | Who | Gap | Fix | Flag |
|---|---|---|---|---|
| **Shoes apart from the legs**: the shin stopped 2-3 cm above the foot bone, over a shoe 6-9 cm tall | every Quetch, Rabbibunny, Grobo-free `build()` look; the moles, bees, tri-heads, Joe, Ker'aooc, the Spheros | 2-4 cm | the shin runs down into the shoe (to 4-6 cm off the ground) | `CONNECT_OLD` |
| **No legs under a dress or long coat**: no shin when the hem was below `foot + 8 cm` | Kira's and Mrs Pell's model, Tarra, Sela, the elder, the magus (9 looks) | 10-22 cm (the shoes alone under the hem) | a shin under any hem higher than the shoe | `CONNECT_OLD` |
| **Hands under the cuff**: the ball hand hung below the sleeve's end with the coat showing between | every `build()` look without rolled sleeves | 1-1.6 cm | a wrist from inside the sleeve to the ball's middle, on the hand bone | `CONNECT_OLD` |
| **Grobo ears**: the flap's inner edge stopped off the head (ground visible between, from above, behind and the Follow camera) | the 11 cast Grobos | 2-5.5 cm | the flap's centre 1.95 R → 1.72 R, 10 % wider, so its root sinks into the head and the outer edge stays within 5 % | `GEAR_OLD` |
| **Grobo brows**: flat strips 6 mm off the face | the 11 cast Grobos | 0.9 cm | BROW-RIDGE: a rounded ridge on the face (7 stations, half-round, tapering ends) | `GBROW_OLD` |
| **Yorna's hat flaps**: two tubes standing out from under the roll, "small brown horns" (NAMED's note) | yorna | — | HAT-FLAPS: tied up, a thick rounded tab of fur lying up each side of the crown | `HATFLAP_OLD` |
| Rabbibunny ears began 1 cm above the skull | the 9 bunny looks | 1.1 cm | the ear's root sunk 2 cm into the head; the visible ear unchanged | `CONNECT_OLD` |
| The bees' forelegs began 3 cm out from the thorax | zbee1, zbee2 | 3.2 cm | they start inside the thorax | `CONNECT_OLD` |
| The bees' antennae roots | zbee1, zbee2 | 1.1-1.5 cm | a root segment from inside the head | `CONNECT_OLD` |
| Joe's and Ker'aooc's sleeves beside the tunic's shoulder | joe, keraooc | 1.7 cm | a round shoulder in the sleeve's colour | `CONNECT_OLD` |
| The Spheros' legs began 3 cm under the star | sphero1, sphero2 | 3.3 cm | the thigh starts inside the body | `CONNECT_OLD` |
| Patch pockets 1 cm off the coat; the moles' apron pocket; the tri-heads' buttons; the clone's chest straps; Vesk's emblem and claws | 9 looks | 0.6-1.8 cm | laid on the cloth / sunk in | `CONNECT_OLD` |

**Left (3 models, under 1.3 cm):** Arthur's hair at the back of the head (0.6 cm); Vesk's brow strips (0.6 cm, his own builder);
zbee2's lashes, which sit on its eyes (the eyes are not measured: a false report).

## Numbers
- 39 models gain triangles, all within the +25 % rule: +1.2 % (the bees) to +11.5 % (Joe, Ker'aooc), Yorna +10.9 % (her
  flaps and brows on top of NAMED's coat), the Grobos +5.8-6.2 %, the Quetch +1.7-2.5 %, the bunnies +3.6-4.1 %. The other
  13 changed models move geometry only. Each model is still 3 meshes and the same materials (no draw call added, no new
  colour: polycheck's `new_colours` is empty for all; eyes, mouths, bones, 4 weights summing to 1, feet as before).
- `polycheck.py` reports for the 11 Grobos: `art/blender/characters/connect1/reports/` (the floating reports beside them).

## Checks
- Blender 5.3.0 through the bridge, `cast_poly.py` with no names (the whole cast, 27 s).
- floating.py: 51 of 61 models with a loose part before, 3 after (the three above).
- Looked at: before|after close-ups (Gilbert's hand, Doran's ears from above and behind, Pippa's ears, Mira's feet), the bees,
  the Spheros, Joe; 13 poses × 2 views for Gilbert, Kira's model and Doran with the new files (walk, run, jump, pickup, doze,
  heavy, hurt, throw): the shins stay in the shoes, the wrists in the sleeves, the ears on the head.

## Tests (SwiftShader, the 61 rebuilt models in `assets/poly`, the code in place, the desktop)
solidnpc 54/54, chapter1 23/23, cast-rounds 209/209, story-journeys 30/30 PASS.

Evidence labels: **Automated runtime only**. Nobody played it. No Vega 8 frame time (no draw call added; triangles above).

## Not verified
- The people in their own places in play (pictures are of lookdev and the hero's spot).
- The seated poses of every look (only Gilbert, Kira's model and Doran were posed).
- Twinsen, Zoé and Baldino have their own scripts and are not in this batch (Twinsen's feet sit under his robe; his turn
  comes after the queue, by the user's order).
