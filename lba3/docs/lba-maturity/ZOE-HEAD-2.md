# ZOE-HEAD-2 · P126 · Zoé's head as a tall egg · cloud, 24.11.2026

**The user (24.11, P126):** "Zoé's head is too round — not like the original, and not like Twinsen's head." With it an LBA2
render of Twinsen and Zoé (original art: looked at only, not in the repository, not traced). In it her head is a tall,
narrow egg: the cranium rises and narrows up into the hair tie (the ponytail springs from the top of a long head), the
face is long with a long, slightly pointed chin, and the head is clearly taller than wide, front and side; Twinsen's
head in the same picture is a similar tall egg rising to his top-knot.

Starting revision: `4ce6176c` (branch `ccr-c1c2c4b9-dep6ed`). All results: **Automated runtime only** (SwiftShader,
headless Chromium; no person played, no real GPU). The look is for the user to judge (P107): **the default is not
changed** (`twinsen`).

## What was built (`src/game/characters.js`: `ZH_EGG`, `ZH_CHIN`, `ZOE_HEADS`, `zhEggR`, `zhChin`, `zoeHeadShape`, `zoeLockOnCrown`, `zoeBare`)
Three new values of the existing switch `?zoehead=` (the same text in the setting `zoeHead`, no menu entry), built in
the same runtime pass as P120's heads (the loaded `assets/poly/zoe.json`, `lookModel → zoeHair → zoeBare`):

| `?zoehead=` | what |
|---|---|
| `twinsen` (default, unchanged) | P120's: Twinsen's cranium scaled to her head |
| **`tall`** | the cranium a tall egg (long axis tipped 8° back from upright, 15 cm up from its centre, the top half narrowing toward the top), the tie and lock set on its top; the face unchanged |
| **`tall-long`** | `tall` + a longer face: the chin drawn 2 cm down, 1.2 cm forward and in to a soft point |
| **`egg`** | taller still (17 cm up, the crown narrowing more into the tie, tipped 6°) + the longer chin |

1. **The cranium target** (`zhEggR`): an egg round a centre placed by her eye pivot — semi-axes up / down its long axis,
   across, and front / back (a little more behind than in front, so the forehead meets the kept brows and the back of the
   head stays as deep as today's), its cross-section narrowing toward the top by `1 − taper·(s/up)²`. Her skull points
   move toward it along the line from its centre with P120's own weight band (0 below a line above the brows in front, above
   the earrings at the sides, down to the nape behind; 1 a few cm above), and P120's soft join round the neck. So the
   eyes, lashes, brows, nose, lips, mouth, cheeks, ears/earrings, neck and body are not touched, and the new skull runs
   into the kept skin with no step.
2. **The tie on top** (`zoeLockOnCrown`, new `tie` direction): the lock (variant a, the gold the user picked) is carried
   whole from the old scalp under the tie to the new scalp point nearest a direction 4° behind the egg's top; its root is
   turned to the centre as before. `hairBand` then finds the tie on the new skin as before (no gap, not floating, not
   sunk: inspected in every view), and the seat shade follows. The ponytail now springs from the top of the head, as in
   the reference.
3. **The chin** (`zhChin`, tall-long and egg): only skin below her lower lip (which ends 9.6 cm under the eyes) and in
   front of the neck moves, more the lower and the further forward; the lips (their own red triangles), the mouth mesh
   (its pivot on the head bone) and the jaw's underside by the neck stay. Those chin points **keep the face's own normals**
   (a first try that re-smoothed them turned the longer chin into a dark goatee under the ramp light; kept normals light
   it like today's chin).
4. Existing options **byte-identical**: a hash of every vertex attribute of her built model (lookdev), old code against
   new: default `e6fbf92b`, `round` `15670830`, `current` `aa8dccc1` (1,847,448 bytes each) — the same before and after.
   Twinsen `eb6a9cb1` (1,076,832 bytes) before and after (his hash differs from P120's `be7decb8` because of his later
   model changes, not this work).

## Measured (her built head, bind pose; from her eye pivot; skin on the head bone)
| | top above the eyes | chin below the eyes | top-to-chin | half width (widest, eye level) | half width 8 cm above the eyes | back behind the eyes | height / width |
|---|---|---|---|---|---|---|---|
| twinsen (default) | 11.0 cm | 12.3 cm | 23.3 cm | 10.2 cm | 7.8 cm | 21.6 cm | 1.14 |
| tall | 15.3 cm | 12.3 cm | 27.6 cm | 10.0 cm | 8.4 cm | 21.1 cm | 1.38 |
| tall-long | 15.3 cm | 15.6 cm | 30.9 cm | 10.0 cm | 8.4 cm | 21.1 cm | 1.54 |
| egg | 17.0 cm | 15.6 cm | 32.6 cm | 10.0 cm | 8.4 cm | 21.0 cm | 1.62 |

The head is taller than wide and taller than deep in every new variant (depth 24.5 cm against 27.6–32.6 cm of height).
Its width at the eyes is the kept face's (not narrowed: that would move the eyes and cheeks); it reads narrower because it
is so much taller and the crown narrows into the tie. The upper back is up to 2.3 cm less deep than today's (at 4 cm
above the eyes: 18.6 / 18.2 cm behind the eyes against 20.9 cm).

**Counts:** 10,338 triangles in her lookdev rig for every head (unchanged: vertices moved, none added), one material
(LbaMaterial, vertex colours), no textures. No skeleton, bone, bind transform, socket or weight changed.

## Evidence (`captures/zoe-head-2/`, deviceScaleFactor 1, the camera and light of `captures/p120/p120-zoehead-heads.jpg`)
- `heads.jpg` — rows twinsen (default) / tall / tall-long / egg; columns front, ¾, side, back, talking (lookdev, outdoor
  light).
- `game-side-by-side.jpg` — the same four in the game: the Far follow camera with her standing (3× crop), her back at
  the Far camera (3×), the talk (her line), her in the house (the test's copy of her model in the room's light), the
  opening film in the kitchen.
- Singles: `ld-a-<head>-{head-front,head-34,head-side,head-back,talk,turn,walk-back}.jpg`, `game-<head>-{far-standing,
  far-herback,talk-1,talk-2,house,film-1,film-2}.jpg` for head = twinsen, tall, tall-long, egg; `meta-lookdev.json`.
- Inspected (automated renders): the tie sits on the skin at the top in every view and pose; the new skull meets the
  kept forehead and temples with no step; the chin of tall-long/egg is lit like the rest of the face (no dark patch), the
  lips and mouth unchanged; at the Far camera her head reads as a taller egg with the lock rising from its top.

## Game-wide sweep
Made once to the loaded `assets/poly/zoe.json`, so every Zoé built from it gets the chosen head: the yard and home NPC,
the opening film's actor, the chapters' Zoé, the hero's Zoé body (`swapBody`), the statue. No other model uses her head.
Not changed: her sculpted fallback (`LOOKS.zoe`, only if the polygon model fails to load), the Blender build
(`zoe_poly.py`), Twinsen, every other character.

## Tests (one run each; Automated runtime only; `SERVE=1`, no server process)
| suite | result |
|---|---|
| `tests/zoe-hair-look.mjs PHASE=lookdev HAIRS=a HEADS=twinsen,tall,tall-long,egg` | PASS 4/4; the swinging lock's least distance to her head, neck and back through idle, talk, walk, run and a head turned both ways and tipped back: 6.3 / 10.7 / 10.7 / 12.7 cm (≥ 3 cm) |
| `tests/zoe-hair-look.mjs PHASE=game ZD=twinsen`, `tall`, `tall-long`, `egg` | PASS 3/3 each (19+ bones, eyes, mouth, 3 brow morphs; the bake 66 hits, 1 miss, none of hers; the talk opens) |
| `tests/zoe-hair-look.mjs PHASE=hash` | Twinsen `eb6a9cb1`, the same with the old code |
| `tests/char-form.mjs` (default head) | PASS 7/7 |
(`tests/zoe-hair-look.mjs` gained `ZD=` for the game phase and `SERVE=1`; `tests/char-form.mjs` gained `SERVE=1`.)

## Remaining limitations
- A runtime reshape of the loaded model, not re-exported from Blender (as P120).
- The mesh is the model's own (28 points round each head ring, few rings): the taller dome stretches the same triangles,
  so at the talk camera a few facets show on the crown and temple; at the Far camera they do not read. A smoother crown
  needs more rings in the Blender build.
- The clearance check counts body points below 1.95 m; the taller heads lift part of the crown above that, so the
  check covers a little less of the skull top (the lock sits on top and is carried with it, so it cannot swing into it).
- Only the skull and the chin changed: the eyes are the model's (not enlarged toward the reference's big round eyes),
  per the brief to keep her face features.

## Animator handoff
None needed: no skeleton, bone name, bind transform, socket or weight changed; the reshaped skin and the chin stay on the
head bone (rigid with it); the lock's weights are as before (head → tail0 → tail1 → tail2), its control points only
translated to the new top. The mouth mesh's pivot is unchanged (the chin moves below it).

## Decisions for the user
1. **Her head:** `twinsen` (today's default), `tall`, `tall-long` or `egg`. Recommendation: **`tall-long`** — closest
   to the reference's tall head with the ponytail springing from its top and the long, pointed chin, while the crown
   stays rounded (`egg`'s narrower crown reads more pointed/onion-like at the talk camera).
