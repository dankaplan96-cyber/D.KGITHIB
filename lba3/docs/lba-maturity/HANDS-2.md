# HANDS-2 — hands built as hands, the whole cast (the user's pick 24.11, P119 follow-up)

The user, after the default opening (the notebook cut): Twinsen's hands on the notebook "look like big blocky paws"
(the camera is 0.62 m over the pages, between his arms). The pick: **more detailed hands, game-wide**, and **hide the
lamp in his close-up**.

Base: `origin/ccr-c1c2c4b9-dep6ed` at 6d282969. **Automated runtime only** (SwiftShader, headless Chromium). Nobody has
looked at the result on a GPU or at normal speed.

## 1. What the hands were (inspected)

The game's people are the Blender poly models (`assets/poly/<name>.json`, written by `tools/blender/*_poly.py`); the
sculpted hands in `src/game/characters.js` (`handDef`, bake keys `hand-<race>-…`) are only the fallback for a model that
fails to load, never seen in play. So the hands that show are the models' own:

| Who | Old hand (one hand) | Read up close as |
|---|---|---|
| Twinsen | HERO-LOOK's loose fist, 220 tris, 15.7 cm long, 11 cm across | a fist of four lumps seen from the back: the "paws" |
| Zoé | ZOE-OPEN's mitten (four fingers as one curl, three drawn lines), 226 tris | a mitten |
| Quetch cast, canal folk, Zeelich elves, Vesk's left | LBA2's ball (r 5 cm) + a stick thumb + three knuckle lobes, a wrist tube; 252–284 tris | a ball |
| Grobos, Baldino | the same, bigger (r 7.5 cm), 260–340 tris | a ball |
| Rabbibunnies | the same in fur, 248 tris | a ball |
| Spheros | LBA1's big ball (r 9.7 cm), 308 tris | a ball |
| Esmers | HANDS-36's three long sticks and a thumb on a flat ball, 192 tris | sticks |

The bare forearms (Arthur's rolled sleeves, the Esmers, Zoé, Baldino, the elves) ended in a cut 6–7 cm across, hidden
under the ball; with a hand of hand size it showed as a step.

## 2. What was built

**`tools/blender/handpass.py` (new)** — one hand builder for every model and a pass that puts it on the exported model:

- **The hand** (`cartoon_hand`): a palm and the back of the hand as one rounded block (rounded sections, domed over
  the knuckles), **separate fingers** with a gap between each (each from inside the palm, two joints curling a little
  toward the palm, a round tip, the little finger set higher), **a thumb of its own** off the palm's front edge near the
  wrist at about 50° from the hand's axis, its tip turned in toward the palm, and **a wrist slimmer than the palm**
  running up into the sleeve. Flat colour as the rest of the cast; the knuckles' edge and the fingers' roots a shade
  darker so the gaps read under flat light. The palm faces the thigh at rest as before.
- **Each species its own hand** (sizes and places from the old hands, so the silhouette and every grip stay put):
  Quetch / human (and the canal folk, the Zeelich elves, Vesk's left hand) four fingers; **Grobo** a broad hand, three
  stout fingers, a stout thumb; **Rabbibunny** a round furry hand, three short fingers, a short thumb; **Sphero** LBA1's
  big round hand kept its size (19 cm), now three stubby fingers and a thumb; **Esmer** a narrow hand with three long
  fingers. Twinsen's is the Quetch hand at 13 cm (was 15.7) and a third narrower than his fist; Zoé's is slimmer
  (0.84 across) at her mitten's length. Twinsen and Zoé, who are seen close in the opening, have 8-sided fingers; the
  cast 6.
- **Bare forearms taper into the wrist**: the last 3.5 cm of a bare forearm in the hand's colour are narrowed to the
  wrist's size and brought onto the hand's axis (a clamp, never pushed out; the normals there made again), so the arm
  narrows into the hand instead of ending in a cut. Sleeves are not touched.
- **The pass**: the triangles on the hand bone alone are the old hand (ball, thumb, lobes, CONNECT-1 wrist; Twinsen's
  fist; Zoé's mitten and lines) — removed; the new hand is added on the same bone (weights 1.0 to `handL`/`handR`).
  Idempotent (a second run writes the same bytes: checked on all 79 models). Not touched: the Mosquibees, the moles, the
  tri-heads, the FunFrock clones (their own claw/robot hands), Vesk's brass gauntlet, the dinofly.
- **In the pipeline**: `lbapoly.Builder.export` (cast_poly.py, zoe_poly.py, baldino_poly.py, ballastra_poly.py) and
  `twinsen_poly.py` run the pass on what they write, so a rebuild keeps the new hands; `HANDS2_OLD=1` keeps the old
  ones. Checked: `cast_poly.py` rebuilt through the no-Blender stand-ins (nobpy) gives the same models as the pass on
  the shipped ones (the only differences are the four pre-existing head details in doran, yorna, pim and farmerC_b,
  which differ between the shipped models and any nobpy rebuild before this change too, and the sign of a zero).
  To apply to models in place: `PYTHONPATH=tools/blender/nobpy python3 tools/blender/handpass.py assets/poly [names]`.
- `tools/blender/nobpy/mathutils.py`: `lerp`, `normalize`, `length_squared` (cast_poly.py's sleeves need them; without
  them the cast could not be rebuilt without Blender at all).

**The skeleton, bones, sockets and weights elsewhere are unchanged.** `PALM` (handik.js, the palm's middle in the hand
bone's space) is unchanged: the new palm is round it, so every grip (handik.solveHand, workhands.js, the opening's
holds, the torch, the ball) still puts the same point on its target.

**The lamp** (`src/game/interiors.js`, `src/game/story/opening.js`): the reading lamp under repair is its own group now
(it was folded into the room's merged batches, so nothing could hide it); the notebook cut hides it and its screw for
Twinsen's close-up only (13.4–16.2 on the notebook clock, the whole 2.8 s shot) and shows them again for the next shot;
`finish()` shows them too, so a skip inside the shot leaves the lamp on the table. The classic cut never hides it.

## 3. Cost (Automated runtime only)

| | Before | After |
|---|---|---|
| Hand triangles, one hand: Twinsen / Zoé | 220 / 226 | 408 / 408 |
| … Quetch (sleeved / Arthur) | 284 / 252 | 328 |
| … Grobo / Rabbibunny / Esmer / Sphero | 340 / 248 / 192 / 308 | 280 / 280 / 280 / 280 |
| All 79 models: triangles (hand triangles) | 252 170 (38 436) | 257 498 (43 764), +2.1 % |
| **Busy Citadel view** (bench route `street`, Medium, Far camera, 1366×768): draw calls | 215 | **215** |
| … triangles drawn (main + shadow passes) | 1 015 685 | 1 018 773 (+0.3 %) |
| … of which skinned (18 people) | 64 948 | 66 556 (+2.5 %) |
| Materials / textures | — | no new material, program or texture (vertex colours) |
| The house (the lamp as its own group) | — | +1 to +3 draws in that room only (brass, shade, bulb out of the room's batches) |
| Bake (`assets/bake.bin`) | 66 hits, 1 miss (a cushion, `cush0.42…`, before and after) | the same: no sculpt changed, the hands are not sculpted |

The bake was not regenerated: no sculpted design changed (the hands that show are the poly models'), so nothing
re-sculpts at load because of this (the one miss is an old cushion, the same before and after).

## 4. Tests (once each, automated)

| Suite | Result |
|---|---|
| `node tests/opening.mjs` (the notebook cut, the default) | **48/48 PASS**: the page's corner under his right hand at both turns (21 frames, ≤ 1.05 cm), Zoé's tap (62 frames) and stream, the worker's lever (≤ 1.05 cm) and crate (≤ 0.67 cm, never through it), the screwdriver in the lamp's screw (≤ 0.76 cm) and his other hand on the shade (≤ 1.15 cm), Arthur's hull (≤ 0.48 cm) and deck (≤ 0.52 cm), the mast seated 0.7 mm, Zoé's palms on the pots, every skip point, continue, second new game |
| `node tests/arm-clear.mjs` | **PASS**: no hand or forearm inside its own body by more than 3 cm, every look × every pose (the new hand vertices measured); worst 2.5 cm (guard / kneelWork) |
| `node tests/anim-combat.mjs` (the ball's release from the hand, the throws) | **35/35 PASS** |

The grip checks measure fixed points of the hand bone (the wrist, `PALM`, a fingertip point), not the mesh; the mesh
was checked against `PALM` separately: the new hand's middle is 1.5–4 cm from it (Twinsen 4.1 → 3.5 cm, Arthur 3.6 →
2.8, the worker 3.9 → 2.6, Doran 3.0 → 1.9, Baldino 3.1 → 1.5), as close or closer than the old hand's, except the
Sphero's (5.9 → 7.1 cm: its hand is the old ball's size but longer). In the notebook's pictures the fingers rest on
the book's board and come to the page's corner at the turn.

## 5. Pictures (lba3/captures/hands-2/; rendered headless, looked at, not played)

- `notebook-before-after.jpg` — the notebook cut at the frames of `p119/notebook-v149-vs-fixed.jpg` (−8.00 … 7.25 old
  clock), before above, after below: the hands on the book, the page turn, his close-up without the lamp.
- `notebook-hands-close.jpg` — two of those frames at full size, before | after.
- `hands-closeup.jpg` — Twinsen, Zoé, a Grobo (Doran) and a Rabbibunny (Mira): a close look at the right hand from the
  front and outside, from below, from the front, and the whole figure; before / after (character review page
  `lookdev.html`, outdoor light).
- `hands-closeup-more.jpg` — the same for an Esmer (Nara), a Sphero, Arthur and Baldino.
- `citadel-far-before.jpg`, `citadel-far-after.jpg` — the busy Citadel view at the Far camera.

## Decisions for the user

1. **The new hands** (game-wide, a visible change): (a) keep; (b) back to the balls and Twinsen's fist (`HANDS2_OLD=1`
   and a rebuild, or this branch's commit reverted). *Recommendation: (a).*
2. **Their size against the old balls**: at play distance (Far camera) a hand now reads a little smaller than the
   ball did (it is narrower; its length is the same). (a) As built; (b) all a size up (one number per species in
   `handpass.py`). *Recommendation: (a), look at it in play first.*
3. **The Sphero's hands**: LBA1's are plain big balls; now big hands with three fingers. (a) Keep; (b) balls back for the
   Spheros only. *Recommendation: (a).*
4. **The lamp**: hidden for the close-up as asked (the user's pick). Nothing more to decide unless the cheat shows.

## Remaining limitations

- The hands have one pose (relaxed, a little curled): no finger bones. A grip closes the arm on the thing, not the
  fingers round it; a held object now meets loose fingers instead of a ball. Closing the fingers for grips would need a
  second hand shape (a morph target on the hand, or finger bones): a contract change for the animator and rig.js, not
  done here.
- Not seen on a GPU; the 6-sided cast fingers may read faceted at the closest dialogue shots.
- The sculpted fallback (`handDef`, used only when a model fails to load) is still the old shape.
- If another worker rebuilds a model with a script that does not end in `Builder.export` / the twinsen hook (none
  today), run `handpass.py` on it.

## Animator / coordinator handoff

- No skeleton, bone name, bind pose or socket changed. `PALM` (handik.js) unchanged and still inside the new palm.
- A hand-pose control (open / fist) would be the next step if the user wants hands that close on what they hold: a
  morph target on the hand's vertices (the pass can write the closed shape as a second set) or three finger bones.
  Proposal only; not started.
- P120 (Zoé's hair): if `zoe.json` is rebuilt, `zoe_poly.py` goes through `Builder.export`, which applies the hands; a
  runtime change in `characters.js` does not touch the hands.
