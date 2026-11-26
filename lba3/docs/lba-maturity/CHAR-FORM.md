# CHAR-FORM · Twinsen and Zoé built as bodies in clothes, not connected tubes · cloud, 18.11.2026

**A candidate for the user to judge.** Evidence: **Automated runtime only** (headless Chromium on SwiftShader; no GPU,
no frame times). The visual comparison below is the worker's, not the user's.
REPAIR-PASS-18-11.md phase 3, status.md P67.

## The request
The user (18.11, from actual play): "Characters still look like connected tubes instead of designed bodies." The ask is
form, not polygon count: readable shoulders, elbows, pelvis and hips, knees, wrists and ankles, neck, and the tunic and
sleeves shaped as clothing over a body. Twinsen and Zoé only. Kept: the approved designs (colours, costume, face, hair,
proportions), the skeleton, bone names, clips, attachments, scale and height, and the `eyes` / `mouths` entries (the
facial-expression work builds on them). Not toward TWINSEN-FIGURE (rejected 15.11).

## What made them read as tubes (the shipped models, looked at in motion)
- **Zoé's trousers** were six rings a leg: the hip's bend and the knee's bend each happened inside one band, so a stride
  folded a straight tube at the knee, and the thigh's top swung out through the top's hem as a pale block.
- **Zoé's arms**: the elbow's bend over three rings (a crease on the inside), the sections centred on the bone, so the
  deltoid, biceps and forearm sat as one even tube.
- **Twinsen's cape** ran in a straight cone from the collar (no shoulder), and its arm weights changed over two columns,
  so a swung arm (the run) folded the cape's side into a flat sheet with hard facets.
- **Twinsen's robe** was five rings: a cylinder from the belt; a stride sheared one band at the knee.
- **His shins** (seen when the robe parts) were straight tubes.

## What changed, per body part
Built with the real Blender scripts (bpy 5.0.1 via `uv`, below). Fractions are of H (Twinsen 2.1 m, Zoé 1.95 m).

| Part | Before | After |
|---|---|---|
| Twinsen, shoulders (cape) | a cone: ±0.122 H at 0.74, ±0.163 at 0.70, ±0.197 at 0.62 | nearly level from the collar to a rounded shoulder point (±0.134 at 0.74, ±0.1625 at 0.722, ±0.1815 at 0.70), then the cloth hangs (±0.1955 at 0.66, ±0.2035 at 0.62); the front and back centre lines are the old ones, so the medallion and cord lie where they did |
| Twinsen, cape as cloth | smooth bell | soft folds hanging from the shoulders, deeper toward the hem (a ridge and a hollow in each quarter, mirrored, none on the centre lines or over the arms); the inner lip folded with it |
| Twinsen, elbows (cape over the arms) | arm weights over \|x\| 0.095–0.165 H, five rings | the same weights over \|x\| 0.082–0.178 H, the shoulder band 0.695–0.75 H; nine rings below the collar (four more through the shoulder and the elbow's blend): a swung or bent arm curves the cape's side |
| Twinsen, pelvis and hips (robe) | five rings, a cone from the belt | eleven rings: the robe swells over the hips and the seat under the belt (±0.135 at 0.33 H, was ±0.128) and falls in its A-line; same hem |
| Twinsen, knees | one band sheared at the knee | rings every 0.04 H through the knee's blend, and the cloth falls in a little between the legs from the thigh down (1.2 % H in front, 0.7 % behind): the leading knee and two legs read under the robe in a stride |
| Twinsen, ankles | straight 10-sided tube on the knee bone | a lower leg in nine sections: knee cap in front, calf behind, a slim ankle over the slipper, the foot of it inside the slipper (12 sides) |
| Twinsen, neck, wrists, hands, head, hair, face | — | **unchanged** (the neck was shaped by NECK-TW; the wrists are in the cuffs; the fists, held items, face and hair as approved) |
| Zoé, hips and pelvis | the trouser legs from 0.44 H, the top's hem on the hips only | the legs from 0.47 H inside the top, slimmer at their top; the top's hem (below 0.47 H) rides the thighs, two thirds at its edge, each side on its own leg and the middle on both: in a stride or when she sits or kneels it lies over the leading thigh as cloth does |
| Zoé, knees | 6 rings × 12 sides, the bend in one band (±0.06 m) | 15 rings × 16 sides; the bend spread over ±0.075 m and five rings; the cloth gathers a little at the knee (±0.0505 H, from ±0.052) with a fuller fall over the calf behind |
| Zoé, ankles | — | gathered at the ankle (±0.0385 H) and flaring a touch at the hem over the shoe |
| Zoé, shoulders, elbows, forearms | 11 sections × 14 sides, centred on the bone | 17 sections × 16 sides, the same widths at the shoulder, elbow and wrist, each section shifted to place the muscle: the deltoid cap out over the shoulder (4.5–5 mm), the biceps forward (4 mm), the elbow's point behind (3 mm), the forearm's swell high on its outer side (4.5 mm); five sections round the elbow; the armhole trim and the bangle follow the new sections |
| Zoé, wrists | — | as before (flat, wider front to back than across) |
| Zoé, neck, head, hair, face, hands | — | **unchanged** |
| Zoé, symmetry | the right trouser leg up to 6 mm off the left's mirror image (an old `max()` on a signed x) | both legs on their hip bones (±0.10 m) |

Colours, materials, textures: unchanged (one vertex-coloured LbaMaterial; no texture).

## Numbers
| | Twinsen before | Twinsen after | Zoé before | Zoé after |
|---|---|---|---|---|
| Triangles | 4336 | **5168 (+19.2 %)** | 7190 | **8346 (+16.1 %)** |
| Meshes / draw calls | body + eyes + mouth | the same | body + eyes + mouth | the same |
| Materials / textures | 1 / 0 | 1 / 0 | 1 / 0 | 1 / 0 |
| Bones / most weights a vertex | 19 / 4 | 19 / 4 | 19 / 2 | 19 / 3 (the hem: hips + both thighs) |
| Height | 2.101 m | 2.101 m | 2.094 m | 2.094 m |
| Half-width | 0.377 m (cuffs) | 0.389 m (shoulders) | 0.297 m | 0.301 m (forearm swell) |
| File | 1.03 MB | 1.24 MB | 1.74 MB | 2.04 MB |

Twinsen by part (after): cape 624 (was 432), robe 480 (192), shins 2 × 216 (2 × 40); everything else as before.
Zoé: the trouser legs 2 × 464 (2 × 132), the arms 2 × 528 (2 × 294), the armhole trims 2 × 96 (2 × 84); everything else as before.
In the game the hero's rig holds two skinned meshes of his model (8424 → 10088 triangles in the scene for him).
`node tools/game-files.mjs`: 508 files (unchanged; nothing added to the game).

## Skeleton, sockets and animation compatibility
- `art/characters/skeletons.json` untouched; the same 19 bone names in each model (the JSON's bone list is in a different
  order for Zoé, as the hem now uses the thigh bones; the loader maps by name, characters.js `polyCharacter`).
- `eyes` and `mouths` in both JSONs: **identical** to the shipped ones (checked by comparing the parsed entries); the head
  meshes, nose, brows, hair untouched. src/engine/rig.js and src/game/characters.js are not changed.
- Attachments: held items hang from the hand bones (unchanged bones, unchanged fists); the medallion and cord are laid on
  the cape's front centre line, which is the old one. In the game the ball is in his hand at the throw's wind-up
  (`play-throw-before-after.jpg`).
- Clips are procedural (rig.js); only skin weights changed (listed below for the animator).
- `art/blender/characters/jobs/floating.py`: Twinsen ok; Zoé: her two gold hoop earrings only, the same on the shipped
  model (they hang from the ear by design).

## Rebuilding (and the old models)
```
uv python install 3.11 && uv venv -p 3.11 <dir> && VIRTUAL_ENV=<dir> uv pip install bpy     # bpy 5.0.1, about 40 s
<dir>/bin/python tools/blender/twinsen_poly.py art/characters/skeletons.json assets/poly
<dir>/bin/python tools/blender/zoe_poly.py art/characters/skeletons.json assets/poly
```
- `TW_FORM=0` rebuilds the shipped TWINSEN-ORIG `twinsen.json` and `ZOE_FORM=0` the shipped ZOE-LOOK-38 `zoe.json`,
  **byte for byte** (checked with `cmp` after every change).
- Every older flag builds its own model without CHAR-FORM (TW_FIGURE, TW_CAPE_046, TW_CAPE_CUT, TW_LOOK_38, TW_LOOK_OLD,
  TW_LEGS_OLD, TW_CUFF_OLD, TW_BALL_HAND; ZOE_LOOK_OLD, ZOE_LBA2, ZOE_HEAD_LBA2, ZOE_NECKLACE_OLD).
- Deterministic: two builds of each identical to the committed JSON.

## Evidence (`captures/char-form/`, looked at by the worker)
In the game (`tests/char-form.mjs`, chapter 1's opening: the ball from the cupboard, out into the yard where Zoé waits,
by input; the same frames before and after: `game-before/`, `game-after/`, 13 pictures each):
- `play-walk-before-after.jpg`: the play camera behind him, walking (Normal): the broader shoulder line of the cape.
- `play-run-athletic-before-after.jpg`, `play-run-athletic-b-before-after.jpg`: Athletic, running from behind: the cape's
  side curves round the swung arm instead of a flat sheet; the robe bends round the hips and knees.
- `play-throw-before-after.jpg`: the throw's wind-up, the ball in his hand, the robe over hips and knees.
- `play-talk-before-after.jpg`: talking to Zoé.
- `close-34-before-after.jpg`, `close-back-before-after.jpg`, `close-twinsen-zoe-before-after.jpg`: a fixed camera
  beside them in the yard (the fence crosses the lower part of some).
Lookdev (lookdev.html, the game's own character page and materials, outdoor light, frozen frames; Zoé only stands in the
yard in-game, so her motion is shown here):
- `lookdev-turnaround-*`: front, ¾, side, back. `lookdev-gamecam-walk-*`: the LBA2 exterior camera (13 m, 38°).
- `lookdev-walk-*`, `lookdev-run-*`, `lookdev-run-b-*` (from behind), `lookdev-zoe-walk-close-*`, `lookdev-zoe-run-close-*`
  (her knees and the hem over the thigh), `lookdev-sit-*`, `lookdev-throw-*`, `lookdev-cheer-*` (arms up), `lookdev-turn-*`,
  `lookdev-talk-*` (her talk gesture differs between the two: the clip picks gestures at random, not a model change).
- `lookdev-after-kneel-pickup-jump-dodge.jpg`: after only.

What the worker sees: Zoé changed most: her knees bend round in walk, run, sit and kneel, and the top's hem lies over
the thigh instead of the trouser leg's top showing through it; the elbows bend without the inner crease. Twinsen: from
the play camera behind him, a shoulder line and cloth hanging from it; in the run the cape's side curves over the arm
and the robe shows the leading knee and two legs. At the LBA2 exterior camera distance the change is small (silhouette
only). No new clipping seen: hands clear of the body, the robe and trousers over the legs, the ball in the hand.

## Tests (SwiftShader, one at a time, Automated runtime only)
- `tests/char-form.mjs` (new, short: new game, the house step, the yard): PASS 7/7 with the new models and with the
  shipped ones (no page error, no missing file; the models load as polygon models with their bones, eyes and mouth).
- The longer suites (chapter1, opening, solidnpc, anim-combat, npc-feet, …) were **not** run (the user asked for minimal
  tests). Nothing they check reads the mesh shape except draw calls (unchanged) and the hero's statue (same model).

## Animator handoff (weights changed; no clip, bone or rest transform changed)
- Twinsen `w_cape`: arm share now `smooth(0.082, 0.178, |x|) · (1 − smooth(0.695, 0.75, y))` (H), elbow share as before
  (`· (1 − smooth(0.49, 0.6, y))`). Poses that raise the arm high (cheer, heavy charge) stretch the cape's side into a
  wing as before (LBA2's design, WA-16); the shoulder point now rises with the arm a little more.
- Twinsen `w_robe`: unchanged; only more rings.
- Zoé `w_body`: below 0.47 H the top shares weight with `hipL`/`hipR` (0.65 at the hem, 0 at 0.47 H; left/right by
  `smooth(-0.05, 0.05, x)` m). A pose that lifts a thigh lifts the hem over it.
- Zoé `w_leg`: hips → thigh over 0.48–0.395 H (was 0.47–0.40); thigh → shin over the knee ± 0.075 m (was ± 0.06).
- Zoé arms: shoulder → forearm over u 0.42–0.60 as before.
- For the facial work: nothing in the head changed; eye and mouth pivots, rest and tilt identical.

## Still open
- The user has not seen it. The Settings trial route (as TWINSEN-FIGURE had) was not added: no new shipped file allowed.
- Twinsen's neck, wrists and hands were left as approved; his raised-arm wing (cheer) is LBA2's cape design and unchanged.
- At the LBA2 exterior camera distance the gain is mostly Twinsen's shoulder line; most of the benefit shows at the
  chase camera and in close-ups.
- Other inhabitants: not in scope (cast_poly.py).
- Not measured on the GTX 1050: +832 / +1156 triangles for two characters, no draw call added.
