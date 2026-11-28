# ZOE-HEAD-3 · P126 · Twinsen's head on Zoé · cloud, 24.11.2026

**The user (24.11, on ZOE-HEAD-2's tall / tall-long / egg):** "oh no, all terrible — **try to copy Twinsen's head**."
P120's `twinsen` (Twinsen's *cranium* scaled to her face) had read "too round, not like the original and not like
Twinsen's head". Looking at `captures/p120/p120-zoehead-heads.jpg`: his built head is a big smooth egg in which the face
*fills* the head — broad smooth cheeks, a rounded jaw, no narrow chin, the head big against the neck. Every head of hers so
far kept her own narrow face and jaw (20 cm across) on a thin neck (4.2 cm radius), so it read as a small bulb on a stalk.
In LBA2 (the user's references: a render of the two of them and the box art — promotional art, looked at only, kept in the
scratchpad, never committed) the two have the same kind of head.

Starting revision: `528a4dde` (branch `ccr-c1c2c4b9-dep6ed`). All results: **Automated runtime only** (SwiftShader,
headless Chromium; no person played, no real GPU). The look is for the user to judge (P107): **the default is not
changed** (`twinsen`).

## What was built (`src/game/characters.js`: `zoeTwinHead`, `ztPieces`, `ztRay`, `ztR`, `ZT_*`, three `ZOE_HEADS` entries)
Three new values of the existing switch `?zoehead=` (the same text in the setting `zoeHead`, no menu entry), built in the
same runtime pass as P120's and ZOE-HEAD-2's heads (`preloadCharacters → lookModel → zoeHair`; `lookModel` now also gets
Twinsen's model as loaded, `tw`):

| `?zoehead=` | his head | nose |
|---|---|---|
| **`twin-head`** | 100 % — as big as on him (31 cm across) | hers (small) |
| **`twin-head-s`** | 92 % | hers |
| **`twin-head-nose`** | 100 % | his (the ball nose) |

1. **His head, not a reshaped hers.** Her skull/face skin, her hair cap (bare skin since ZOE-HAIR-2) and, for
   `twin-head-nose`, her nose are taken out; Twinsen's head shell from `assets/poly/twinsen.json` (the head bone's skin
   piece: cranium, forehead, cheeks, jaw, chin; 3,276 vertices) is put in whole — and his two nose pieces for
   `twin-head-nose` — painted her skin `#d9a679`, rigid on her head bone (weight 1), his normals kept (a uniform scale and a
   move do not change them). So the volume *is* his: the same egg, the same broad cheeks and round jaw.
2. **Where it sits:** on her neck as his sits on his — g × his offsets from the foot of the neck (y) and from the neck's axis
   (z) (`ZT_NECK`, measured on both models). Her eyes now stand where his stand on him (1.853 m and 13.5 cm in front of the
   neck's axis; today 1.812 m / 12.6 cm), the head in front of the neck as his is, the chin as far below the eyes as his
   (20.4 cm × g).
3. **Her features on it.** A similarity F takes her eyes' mid-point to the new one, × f (f = 1.38 g: her eye spacing,
   eye-to-mouth and eye-to-chin are 0.65–0.73 of his, so at 1.38 her features stand where his stand and the face fills the
   head as his does). Then each point is set back onto the new surface as far out (× f) as it stood off her old one, along
   the same ray from a centre inside both heads (a ray cast against her old shell and his new one):
   - brows, lid lines, lips (and her nose for the two `her nose` heads) point by point, so they lie on his rounder face;
     the lips and the mouth a little smaller than × f (× 0.85 more, so her wide red mouth is not too wide on the broad
     face) and her nose × 0.8 more (it stays her small nose, not a long one);
   - the eyes whole (lids, lashes, iris; the pivot set on the face, the shape × f; both eyes keep one height and depth, so
     they stay one mesh with one blink and the gaze works as before);
   - the talking mouth: its pivot and each of its points set on the face the same way (its corners bend back with the
     broader face, no longer standing out past the lips' corners — an early try kept it flat and its corners showed as a red
     whisker), its drop × f × 0.85, so the talk opens it in proportion;
   - the earrings whole (her own size × 1.1): their top set on the head's side and the hoop turned to lie along it. With
     no ears to hang from, a hoop hanging straight down off the side of the bigger head stood a few centimetres off its
     jaw (an early try); turned to the surface they sit on the side of the head like the hoops on her old head.
4. **The neck:** her neck piece (her skin, neck + head weights) is drawn up from 10.5 cm above its foot to where his neck
   enters his head (× g: its top 1.706 → 1.756 m) and widened toward the top (radius 4.2 → 6.4 cm, × g for `-s`), its
   normals tipped to match. So the nape runs into the back of the big head with no step and no thin stalk; from the front
   the jaw covers its top.
5. **The lock and the tie (P120 a, the tie high, the user's picks):** carried whole to the new crown, 30° back from
   straight up from the new centre (about where it stands on her today), as far out of the scalp as it stood out of her bare scalp;
   its root aimed at the head's centre; the green tie found on the new skin by the same `hairBand`, the seat shade round it
   as before. The lock's size is unchanged.
6. **Existing options byte-identical**: a hash of every vertex attribute of the built model (lookdev), HEAD's code against
   the new: Twinsen `eb6a9cb1` (1,076,832 bytes); Zoé default `e6fbf92b`, `round` `15670830`, `current` `aa8dccc1`,
   `tall-long` `d743c0b2`, `?zoehair=a-cap` `1d08e021` (1,847,448 bytes each), `?zoehair=old` `92e3168e` (1,565,928) —
   all the same before and after. **Twinsen is not changed** (his model is only read).

## Measured (bind pose, lookdev; the head bone's skin only — no lock, tie, eyes or lips)
| | width | eyes (y, m) | chin below the eyes | skin top above the eyes |
|---|---|---|---|---|
| Twinsen | 31.1 cm | 1.882 | 20.4 cm | 16.0 cm |
| today (`twinsen`) | 20.4 cm | 1.812 | 14.6 cm | 9.7 cm |
| `twin-head` | 31.1 cm | 1.853 | 20.4 cm | 15.9 cm |
| `twin-head-s` | 28.6 cm | 1.825 | 18.8 cm | 14.7 cm |
| `twin-head-nose` | 31.1 cm | 1.853 | 20.4 cm | 15.9 cm |

Her eyes are × 1.38 of hers in `twin-head` / `-nose` (× 1.27 in `-s`); both eyes still one mesh (one draw, one blink), as
today.

**Counts** (her whole rig in lookdev): 10,338 triangles today → 10,446 (`twin-head`, `twin-head-s`: −984 of her shell and
cap, +1,092 of his shell) and 10,502 (`twin-head-nose`: her nose −84, his nose +140). One material (LbaMaterial, vertex
colours), no textures, as before. No skeleton, bone name, bind transform or socket changed; her body's weights unchanged;
the new shell and features are on the head bone with weight 1 (rigid, as her old head).

## Evidence (`captures/zoe-head-3/`, deviceScaleFactor 1, the camera and light of `captures/p120/p120-zoehead-heads.jpg`)
- `heads.jpg` — rows Twinsen (the target), today's default (`twinsen`), `twin-head`, `twin-head-s`, `twin-head-nose`;
  columns front, ¾, side, back, talking (lookdev, outdoor light). The lookdev camera follows each model's head bone at
  1.6 m; Twinsen's face stands further forward of his head bone than hers of hers, so his row reads a little larger (his
  tiles are cropped 120 px lower to show his chin; same scale).
- `game-side-by-side.jpg` — today and the three new heads in the game: the Far follow camera with her standing (3× crop),
  her back at the Far camera (3× crop), the talk (her line), her in the house (the test's copy of her model in the room's
  light), the opening film in the kitchen. Today's row is ZOE-HEAD-2's pictures of the default (`captures/zoe-head-2/
  game-twinsen-*`: the same code path, the model byte-identical, so not taken again).
- Singles: `ld-twinsen-head-{front,34,side,back}.jpg`, `ld-twinsen-talk.jpg`, `ld-a-<head>-{head-front,head-34,head-side,
  head-back,talk,turn,walk-back}.jpg` for head = twinsen, twin-head, twin-head-s, twin-head-nose; `game-<head>-{far-standing,
  far-herback,talk-1,talk-2,house,film-1,film-2}.jpg` for the three new heads; `meta-lookdev.json`.
- Inspected (automated renders): the head is his egg from every side — the broad cheeks and round jaw fill the lower half,
  the chin is his; her brows, lashes, lids, eyes, red lips and earrings lie on it with no gap or float (an early try had a
  floating hoop and a red whisker at the mouth's corners: both fixed, above); the tie sits on the skin at the crown in every
  view and pose, the lock rising from it as before; the neck runs into the nape with no step from the side and the back;
  the talk opens the mouth in proportion. In the game the head now reads as big as Twinsen's beside him (the talk, his
  answer), at the Far camera an egg with the lock on its top; in the house and the opening film her head is the big egg
  over her own body.

## Game-wide sweep
Made once to the loaded `assets/poly/zoe.json`, so every Zoé built from it gets the chosen head: the yard and home NPC,
the opening film's actor, the chapters' Zoé, the hero's Zoé body (`swapBody`), the bronze statue. No other model uses her
head; Twinsen's model is read, not changed. Not changed: her sculpted fallback (`LOOKS.zoe`, used only if the polygon
model fails to load), the Blender build (`zoe_poly.py`), every other character. `?zoehair=old` (v150's model) ignores
`?zoehead=` as before; with the new heads `-cap` (gold over the skull) does not apply (there is no cap on his head), `-bigtie`
does.

## Tests (one run each; Automated runtime only; `SERVE=1`, no server process)
| suite | result |
|---|---|
| `tests/zoe-hair-look.mjs PHASE=lookdev TWIN=1 HAIRS=a HEADS=twinsen,twin-head,twin-head-s,twin-head-nose` | PASS 4/4; the swinging lock's least distance to her head, neck and back through idle, talk, walk, run and a head turned both ways and tipped back: 6.3 (today) / 14.4 / 11.3 / 14.4 cm (≥ 3 cm) |
| `tests/zoe-hair-look.mjs PHASE=game ZD=twin-head`, `twin-head-s`, `twin-head-nose` | PASS 3/3 each (19+ bones, eyes, mouth, 3 brow morphs; the bake 67 hits, 0 misses, none of hers; the talk opens) |
| `tests/char-form.mjs` (default head) | PASS 7/7 |
| hash of every built model, HEAD's code against the new (scratch, lookdev) | Twinsen and every existing Zoé option byte-identical (above) |

## Remaining limitations
- A runtime transplant of the loaded models, not re-exported from Blender (as P120 and ZOE-HEAD-2).
- His shell is his own mesh (28 points round each ring), so at the talk camera the jaw and cheek show the same soft facets
  as his; at the Far camera they do not read.
- The head bone is unchanged (her rig's 1.63 m): the bigger head sits further above and in front of it, so a nod or a turn
  swings it a little more than his on his rig. Nothing clipped in the tested poses (the lock check; the walk and talk
  pictures), but the chin has not been checked against the chest in every clip of every chapter.
- The earrings lie flat on the side of the head (no ears); a hanging hoop would need an ear or a lobe to hang from.
- Her eyes are her own scaled × f (7.4 cm across against his 8 cm); not made rounder or bigger toward the references' big
  round eyes (the brief: keep her features). The lock is the user's variant a at its size; on the bigger head it reads a
  little smaller than in the box art (a larger lock would be a separate option).
- The lookdev camera of the agreed sheet frames each model's head bone, so Twinsen's row and hers are not framed on the same
  point (said on the sheet).

## Animator handoff
None needed: no skeleton, bone name, bind transform, socket or animation changed. The new head shell, eyes, mouth, brows,
lids, lips, nose and earrings are rigid on the head bone (weight 1), as her old head; the eye and mouth pivots moved (the
rig reads them from the model), the mouth's drop scaled with it (× f × 0.85). The brow morphs are built by
`addBrowMorphs` from the moved brows (still 3: up, cross, sad). The neck's weights are unchanged (its points moved). The
lock's weights are as before (head → tail0 → tail1 → tail2); the rig's follow-through sways it as before.

## Decisions for the user
1. **Her head:** `twinsen` (today's default), `twin-head`, `twin-head-s` or `twin-head-nose`. Recommendation: **`twin-head`** — it is his head as it is, so
   the two read as the same kind of person, as in the LBA2 references, with her own face on it; `twin-head-s` if the full
   size looks too heavy on her slimmer body at the Far camera; `twin-head-nose` only if her small nose reads too little
   (his ball nose makes her face read more like his).
2. If one of them: keep the earrings flat on the side of the head, or drop them for this head.
