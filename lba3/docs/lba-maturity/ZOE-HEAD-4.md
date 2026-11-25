# ZOE-HEAD-4 · P131 · Zoé's head as an almond, measured on LBA2's in-game Zoé · cloud, 25.11.2026

**The user (25.11, P131):** "Zoé's head is still very strange, I can't put my finger on it — maybe more like an almond",
then: "check LBA2's model of Zoé". Rejected before: tall, tall-long, egg (ZOE-HEAD-2) and Twinsen's head on her
(ZOE-HEAD-3). Today's default `?zoehead=twinsen` stays until the user picks (P107).

Starting revision: `fdf06670` (branch `ccr-c1c2c4b9-dep6ed`). All results: **Automated runtime only** (SwiftShader,
headless Chromium; no person played, no real GPU). **The default is not changed.**

## Sources, and what each is
- **LBA2's in-game Zoé** (the gameplay model): rendered by lba2remake.net from the original LBA2 data, fetched at run
  time (scene 0, Twinsen's house; her actor isolated, the camera overridden through a render hook as
  `tools/map-orig/remake.mjs` does). Her body mesh's vertices were read in the page (bone transforms of the idle frame
  applied) and measured; **only the numbers below are kept**. The pictures are in the worker's scratch space, never
  committed; nothing of LBA2 is in the repository.
- **The user's LBA2 picture** (`p126-zoe-ref.jpg`, scratch only): a **promotional render**, not the game's model. Looked
  at only; the measurements are the in-game model's.
- **Ours:** `assets/poly/zoe.json` as built by `src/game/characters.js` (lookdev, bind pose).

How measured: both models' head skin (LBA2: the head bone's polygons; ours: skin on the head bone, no lock, tie, lips,
earrings or eyes) drawn as silhouettes from the side and the front at 0.5 mm; LBA2 scaled by 1.278 so both stand as tall
to the top of the skull (1.92 m). Chin = the lowest point of the front third of the side silhouette; long axis = the main
axis of the side silhouette; "tilt" = how far that axis leans back from straight up.

## LBA2's head against ours (numbers only)

| | LBA2 in game (× 1.278) | today (`twinsen`) | `almond` | `almond-s` | `almond-chin` |
|---|---|---|---|---|---|
| standing height to the top of the skull | 1.920 m | 1.918 m | 1.919 m | 1.913 m | 1.920 m |
| head height, chin to crown | 27.7 cm | 25.5 cm | 25.8 cm | 25.3 cm | 26.8 cm |
| width (widest) | 20.6 cm | 20.4 cm | 20.5 cm | 20.5 cm | 20.5 cm |
| depth (nose tip to the back of the skull) | 34.5 cm | 24.9 cm | 31.6 cm | 28.0 cm | 31.6 cm |
| height / width | 1.35 | 1.25 | 1.26 | 1.23 | 1.31 |
| depth / height | 1.24 | 0.98 | 1.22 | 1.11 | 1.18 |
| depth / width | 1.68 | 1.22 | 1.54 | 1.37 | 1.54 |
| side silhouette: long / short axis | 1.39 | 1.11 | 1.39 | 1.24 | 1.43 |
| long axis leans back from straight up | 61° | 29° | 64° | 56° | 61° |
| the back of the skull behind the forehead at eye level | 31.2 cm | 22.5 cm | 29.0 cm | 25.5 cm | 29.0 cm |
| eyes' height on the head (chin 0, crown 1) | 0.57 | 0.57 | 0.57 | 0.59 | 0.59 |
| eye spacing (centres) | 10.3 cm | 10.4 cm | = | = | = |
| eye spacing / head width | 0.50 | 0.51 | 0.51 | 0.51 | 0.51 |
| eyes to chin | 15.7 cm | 13.7 cm | 13.7 cm | 13.7 cm | 15.7 cm |
| eyes to crown | 11.9 cm | 10.9 cm | 11.0 cm | 10.5 cm | 11.1 cm |
| mouth's height on the head (chin 0) | 0.18 | 0.24 | 0.24 | 0.25 | 0.27 |
| forehead: the front line from 0.12 to 0.32 of the head's height above the eyes, back from upright | 40° | 43° | 52° | 46° | 54° |
| width at the mouth / widest | 0.75 | 0.84 | 0.84 | 0.84 | 0.84 |
| width just above the chin (chin + 0.1 head height) / widest | 0.51 | 0.54 | 0.52 | 0.51 | 0.42 |
| width at the eyes / widest | 0.97 | 0.98 | 0.99 | 0.99 | 0.99 |
| width 0.3 head height above the eyes / widest | 0.76 | 0.76 | 0.73 | 0.79 | 0.71 |
| head height / standing height | 0.144 | 0.133 | 0.134 | 0.132 | 0.140 |
| neck width | 8.2 cm | 8.4 cm | = | = | = |
| head width / neck width | 2.5 | 2.4 | = | = | = |
| head width / shoulder width (arms in) | 0.35 | 0.39 | = | = | = |
| ponytail root, from the almond's centre, back from straight up | 66° | (the tie on the crown) | 64° | 64° | 64° |

What the numbers say: **from the front LBA2's head and hers are nearly the same** (as wide, the same width profile, the
eyes at the same height and spacing). **The difference is from the side:** LBA2's head is 39 % deeper than hers (1.24 × its height) — a long
almond lying back from the face, its long axis leaning 61° back from upright (hers 29°: a round ball), the back of the
skull 9 cm further behind the forehead, the skull's far end at the back-top where LBA2's ponytail springs. Smaller
differences: LBA2's chin is 2 cm lower under the eyes (a longer face), its mouth lower on the face, its forehead a flat
plane sloping back 40°. LBA2's head is also a little bigger against her height (0.144 against 0.133) and her shoulders
are broader (the head/shoulder ratio 0.35 against 0.39); the body was not changed.

Eyes in LBA2's game model: two flat dark triangles (6.3 × 2.2 cm scaled), no lids, no brows; the mouth a dark-red
triangle 14 cm wide; the ponytail three yellow balls. Ours keep her own eyes, lashes, lids, brows, lips and earrings, as
the brief says.

## What was built (`src/game/characters.js`: `ZH_EGG.almond`, three `ZOE_HEADS` entries, `zoeHeadShape`'s `mix`)
Three new values of the existing switch `?zoehead=` (the same text in the setting `zoeHead`, no menu entry), built in the
same runtime pass as ZOE-HEAD-2's heads (the loaded `assets/poly/zoe.json`, `lookModel → zoeHair → zoeBare`):

| `?zoehead=` | what |
|---|---|
| `twinsen` (default, unchanged) | P120's: Twinsen's cranium scaled to her head |
| **`almond`** | the cranium LBA2's almond (fitted, below); the tie and lock on its far end, at the back-top |
| **`almond-s`** | half of the way from today's head to `almond` (each reshaped point halfway between where the two put it) |
| **`almond-chin`** | `almond` + LBA2's longer face: the chin 2 cm lower under the eyes, to a soft point (ZOE-HEAD-2's chin) |

1. **The almond** (`ZH_EGG.almond`): ZOE-HEAD-2's egg form (`zhEggR`) fitted by least squares to LBA2's cranium (scaled,
   set at our eyes and forehead), sampled on 1,465 rays over exactly the part of the head the reshape moves; rms 4.7 mm.
   Its centre 0.7 cm above and 12.2 cm behind her eye pivot; the long axis 64° back from upright; 16.5 cm from the centre
   to the far end, 9.7 cm toward the face; 10.4 cm across; 8.9 cm above the axis, 15.2 cm below it; narrowing 11 %
   toward the far end. Only the numbers of the fit are in the code.
2. **What moves:** as ZOE-HEAD-2: her skull points move toward the almond along the line from its centre with P120's
   weight band (0 below a line above the brows in front, above the earrings at the sides, down to the nape behind), the
   soft join round the neck kept. So the eyes, lashes, lids, brows, nose, lips, the talking mouth, cheeks, earrings, neck
   and body are not touched; the new skull runs into the kept skin with no step.
3. **The tie and the lock** (P120 variant a, the gold the user picked): carried whole to the almond's far end (`tie: 0`,
   on its long axis: LBA2's ponytail root is 66° back, the axis 64°), its root aimed at the almond's centre;
   `hairBand` finds the tie on the new skin, the seat shade follows (as ZOE-HEAD-2).
4. **`almond-s`** (`mix: { of: today's head, a: 0.5 }`): each moved point is put halfway between where today's
   `twinsen` and where `almond` put it; the tie set as in `almond`.
5. **Not reached:** the lowest part of the back of the head (the nape, below the eyes) is skin shared with the neck
   (weighted to the neck bone), which the reshape does not move; so the back stops 2.2 cm short of LBA2's at eye level
   (29.0 against 31.2 cm) and LBA2's deeper nape is not followed. The forehead keeps her brow ridge (the band starts above
   the brows), so its lower part is fuller than LBA2's flat plane.
6. Existing options **byte-identical**: a hash of every vertex attribute of the built model (lookdev), HEAD's code
   against the new: Twinsen `eb6a9cb1`; Zoé default `e6fbf92b`, `round` `15670830`, `current` `aa8dccc1`, `tall-long`
   `d743c0b2`, `egg` `fd2e58b5`, `twin-head` `734356a2`, `?zoehair=old` `92e3168e`, `?zoehair=a-cap` `1d08e021`.

**Counts:** 10,338 triangles in her lookdev rig for every new head (unchanged: points moved, none added), one material
(LbaMaterial, vertex colours), no textures. No skeleton, bone name, bind transform, socket or weight changed.

## Evidence
- `captures/zoe-head-4/sheet.png` (committed; our renders only): rows today's head (`twinsen`), `almond`, `almond-s`,
  `almond-chin`; columns front, ¾, side, talking (lookdev, outdoor light, the camera of the earlier head sheets), Zoé in
  play at the Far follow camera (her enlarged 3.75×), and the talk (her line; the frame cropped round her).
- Scratch only, never committed (the coordinator shows it to the user): a comparison sheet with LBA2's in-game model
  from the same four sides and the user's LBA2 picture beside ours.
- Inspected (automated renders): from the side and ¾ the head now reads as a long almond lying back, the lock springing
  from its back-top end as in LBA2; from the front it is nearly today's head (as LBA2's front is); the tie sits on the
  skin at the far end in every view and pose; the new skull meets the kept forehead and temples with no step.

## Game-wide sweep
Made once to the loaded `assets/poly/zoe.json`, so every Zoé built from it gets the chosen head: the yard and home NPC,
the opening film's actor, the chapters' Zoé, the hero's Zoé body (`swapBody`), the statue. No other model uses her head.
Not changed: her sculpted fallback (`LOOKS.zoe`, only if the polygon model fails to load), the Blender build
(`zoe_poly.py`), Twinsen, every other character.

## Tests (one run each; Automated runtime only; `SERVE=1`, no server process)
| suite | result |
|---|---|
| `tests/zoe-hair-look.mjs PHASE=lookdev HAIRS=a HEADS=twinsen,almond,almond-s,almond-chin` | PASS 4/4; the swinging lock's least distance to her head, neck and back through idle, talk, walk, run and a head turned both ways and tipped back: 6.5 cm for each (≥ 3 cm) |
| `tests/zoe-hair-look.mjs PHASE=game ZD=<head>` (twinsen, almond, almond-s, almond-chin) | PASS 3/3 each (24 bones, eyes, mouth, 3 brow morphs; the bake 67 hits, 0 misses, none of hers; the talk opens). The first tries of `almond`, `almond-s` and `almond-chin` timed out at the game's first load (300 s, the shared machine at load ≈ 18; a separate boot of `?zoehead=almond` loaded in 110 s with no page error) and were run again once each: PASS |
| `tests/char-form.mjs` | not run: it builds the default head only, which is byte-identical (the hash below) |
| hash of every built model, HEAD's code against the new (scratch, lookdev) | Twinsen and every existing Zoé option byte-identical (above) |

## Remaining limitations
- A runtime reshape of the loaded model, not re-exported from Blender (as P120, ZOE-HEAD-2/3).
- The mesh is the model's own: the longer back stretches the same triangles, so at the talk camera a few soft facets show
  on the back of the skull; at the Far camera they do not read.
- The nape (neck-weighted skin) is not reshaped (above, 5); a full LBA2 nape would need the neck's skin reshaped too.
- LBA2's lower mouth, flat forehead, bigger head against the body and broader shoulders are not followed (the brief:
  keep her face features; the body is out of scope).
- The clearance check counts body points below 1.95 m; the far end of the almond stays under that.

## Animator handoff
None needed: no skeleton, bone name, bind transform, socket or weight changed; the reshaped skin stays on the head bone
(rigid with it); the lock's weights are as before (head → tail0 → tail1 → tail2), its control points only translated to
the new end. The eye and mouth pivots are unchanged (the face is not moved); the brow morphs are built as before.

## Decisions for the user
1. **Her head:** `twinsen` (today's default), `almond`, `almond-s` or `almond-chin`. Recommendation: **`almond`** — the
   shape measured on LBA2's in-game Zoé (the same front as today, the long head lying back from the side, the ponytail
   from its back-top end); `almond-s` if the full depth reads too long behind at the talk camera; `almond-chin` only if
   the face should be LBA2's length too (its chin is the one ZOE-HEAD-2's `tall-long` had).
