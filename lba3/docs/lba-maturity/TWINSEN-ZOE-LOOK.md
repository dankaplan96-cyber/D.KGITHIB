# TWINSEN-ZOE-LOOK · Twinsen and Zoé against the original, and Twinsen from behind · cloud, 22.11.2026

**Research and one optional candidate step, for the user to judge.** Evidence: **Automated runtime only** (headless
Chromium on SwiftShader at the game's High preset: 4096 shadow map, MSAA 4, pixel ratio 1; no GPU, no frame times).
The comparisons below are the worker's, not the user's. **The default is the current look**; nothing changes without a
switch.

## The requests
1. The user (22.11, with LBA2's box art): "I want Twinsen and Zoé to look more like the original, but the previous time
   this was done the characters were ruined. Zoé is fairly close to what I want; Twinsen too, but they are still not
   polished enough. Research their look and propose. Keep the current one and we'll compare." Then: "because the
   attempts made so far were awful": small steps, each its own switch, each judged against the current look.
2. The focus, later the same day: "The problem is mostly when we look at Twinsen from behind in the follow camera. The
   look right now is good. The hair is a bit too pixelated, but I'm not sure…" Leave the overall look, Zoé and the
   approved head (P16: LBA2's head, three flat-shaded hair balls, no band) as they are.

History respected: P16 (12.11, "the head version now is excellent, leave it like this"), P35 / TWINSEN-FIGURE (15.11,
the full rebuild rejected: "our old Twinsen is better"), CHAR-FORM (18.11) and JOINTS-BLENDER (20.11) for the body.

## Sources, and what each is
- **The box art** (the user's picture of LBA2's cover): a **promotional render**, not the game's model. Not committed.
- **LBA2's in-game models** rendered by lba2remake.net from the original data (scene 49, Citadel; scene 0, Twinsen's
  house), through the render hook of `tools/map-orig/remake.mjs`. At the game's start Twinsen wears his **pyjamas**,
  so the body there is not the tunic; the head and the hair are the same. The lighting is lba2remake's own. Pictures
  only in the worker's scratch space, never committed.
- **Ours:** `assets/poly/twinsen.json` (tools/blender/twinsen_poly.py, TWINSEN-ORIG + CHAR-FORM + JOINTS-BLENDER),
  `assets/poly/zoe.json` (tools/blender/zoe_poly.py), `src/game/characters.js` (LbaMaterial, polyCharacter), and the
  measurements already in docs/character-review.md §11–§15.

## Differences, ranked (ours against the original)

### Twinsen
| # | Part | Box art (promo render) | LBA2 in game | Ours | Verdict |
|---|---|---|---|---|---|
| 1 | Hair | a long glossy dark-brown ponytail sweeping up and back from a gold band on the crown | three flat unlit discs (crown, two down the back) | LBA2's three balls, flat-shaded, no band (approved 12.11) | **open question** for the user (below); not changed |
| 2 | Hair from behind at play distance | — | discs of three tones, mid skin round them | one near-black shape inside a thin very pale ring of skull | **the user's focus**: see "From behind" |
| 3 | Eyes | big round white eyes, dark-blue iris, heavy skin lids, no dark brows | small, pale, no brows | almond, pale-blue iris, a lid, dark brows (FACE-1 drives the brows) | not changed: 12.11 "far too big"; the brows carry the expressions |
| 4 | Medallion | round gold disc with a raised "S" on a copper cord | an octagon in gold lines on a gold cord | LBA2's octagon, pale gold, on a gold cord | already the in-game original; the box art's round "S" is a possible later step (question below) |
| 5 | Nose, mouth | a big round ball nose; an open dark mouth | a short snout, no mouth | a small ball nose; a thin dark-red line (reads a little like lipstick in close-ups) | not changed (the approved face) |
| 6 | Head shape | a long egg, ears | LBA2's head, no ears | LBA2's head, no ears (approved) | right |
| 7 | Tunic | pale sky blue, broad rounded shoulders | the palette's teal blue, cape over a robe | LBA2's teal blue (#2a86ad), CHAR-FORM's shoulder line | right for the game; the box art's paler blue is a promo render's |
| 8 | Proportions, belt, shoes | — | cape over robe, thin orange belt with a knot, salmon slippers | the same | right |

### Zoé
Close to both references, as the user says: the tall blonde ponytail in a green band, blue eyes with lashes, red lips,
gold earrings, the red top with a V neck (LBA2 in game: a red top over red trousers, green shoes: ours). Small
differences only: the box art's necklace is a short plain green choker at the foot of the neck (ours a longer loop with
a small dark pendant); its earring a small gold drop (ours a hoop). **Not changed** (the focus says leave her).

### How they read from the play camera (Follow, Far, 10.75 m)
Twinsen is about 60 × 130 px at 1280 × 720 and his head about 25 px, the hair 12–15 px; Zoé is about 35 × 105 px.
At that size the silhouette (cape over robe, the bun, the orange belt) carries him; the face does not read, the
medallion is a gold dot. The talk camera (FACE-2) brings the speaker's head to 130 px.

## From behind (the focus)

Pictures: `captures/twinsen-zoe-look/sheets/back-*.png` (below). The Follow camera as shipped (Far) and at Medium, in
his house, in the yard and in a street (Pico's), standing, and six frames 0.1 s apart walking away.

What is there, measured:
- **The hair balls are not coarse.** Each is a 14 × 9-segment sphere. At Far the crown ball's radius is about 7.5 px,
  and a 14-gon differs from its circle by 0.025 r ≈ 0.2 px: more segments would change nothing visible.
- **No texture and no shimmer from the material.** The model has vertex colours only; every hair normal points down,
  so LbaMaterial gives each ball one flat shade from every side (by design, LBA2's discs).
- **No blocky self-shadow on the hair.** The same frame with the sun's shadow map on and off (a diagnostic): the
  pixels that change are along outlines only, none inside the hair or on the back of the head.
- **Close up the hair is clean**: three flat discs with smooth edges (a camera 1.3 m behind his head).
- **What does read badly**: at play distance the back of his head is a near-black flat shape (rendered about
  (42, 34, 17)) inside a **thin, very pale ring of skull** (about (217, 199, 179)). LBA's light is fixed in the world
  and comes mostly from above, so the top of the skull, which the Follow camera looks down on, sits near the ramp's
  pale end whatever way he faces (house, yard and street alike). That 1–3 px ring is the
  highest-contrast edge on him: it stair-steps, and its width flickers from frame to frame as his head bobs in the
  walk (`back-motion-*.png`). In lba2remake's render of the original the skull round the discs is mid skin and the
  discs are three distinguishable browns (44–59 in red), so there it reads as a bun, not a hole.
- **Render scale.** The game's auto resolution may draw at down to 0.6 of the window (`minScale` 0.6 here). Upscaled,
  this ring and the dark shape are the first edges that turn into visible pixels. P30 (15.11, "the characters' pixels
  are very pixelated", the artifact in Chrome) is the same family and sits with the renderer, not the model.

Tried and dropped (not in the candidate):
- *Turning the skull's normals away from the light* round the hair: the light is fixed in the world, so a turn in the
  model darkens the skull for one heading and lightens it for another; no steady gain in the pictures.
- *A shadow-map offset for his own body*: nothing to fix (above).
- *More segments on the balls*: sub-pixel (above).

### The back of the tunic, the shoulders, the neck
From behind the cape reads as one smooth bell with a level shoulder line (CHAR-FORM); the neck is a short pale column
with the gold cord round it; the third hair ball hangs onto the nape. Nothing reads wrong standing. Two small things
seen, not changed: a few single dark pixels at the cape's hem and outline (7 in a 140 × 220 px crop at Medium, most
on the outline against the background; the mesh has no cracks: every edge inside the cape and robe is shared by two
triangles, the 502 open edges are the hems, collar, cuffs and cord); and in a long stride the trailing half of the
robe lifts and shows a short dark slit behind the knee (the robe halves on the legs, as CHAR-FORM documented; motion, not shape).

## The candidate (`?look=v2`): one step

| Step | What it changes | Why | Recommendation |
|---|---|---|---|
| `hairtone` | Twinsen's three hair balls in three flat tones: the crown `#553916` → `#7a5226`, the middle ball `#6a4722` → `#8a5e2e`, the tip `#6a4722` → `#986a36`. Rendered from behind (lookdev): (41, 23, 0) / (52, 30, 0) → (61, 36, 1) / (70, 42, 1) / (77, 48, 2) | the hair reads as a brown bun of three balls instead of one near-black keyhole; its edge on the skull and on the cape has less contrast to stair-step; LBA2's own order (darkest at the crown) | **weak yes, the user's call.** It is a colour step, the smallest change that touches what looks wrong; it does not cure pixels that come from the render scale. About a third lighter than lba2remake's render of LBA2's discs. If the user prefers the hair as it is, nothing else in v2 depends on it |

Shapes, triangles, weights, normals, eyes, mouth, brows and every other colour: **unchanged**. The head and hair shapes
are exactly the approved ones.

### Switching
- In the game's address: `?look=v2` (the first candidate: `hairtone`), `?look=hairtone,haircap` (a list of steps; the
  hair-edge options below are named one by one), `?look=v2,-hairtone` (all but some). `lookdev.html` takes the same parameter.
- Where no address can be given (the artifact): the settings' hidden key `charLook` (`localStorage
  sunshard_settings_v1`, e.g. `"charLook":"v2"`), read once at start. No menu entry was added (the coordinator added
  one for TWINSEN-FIGURE in 764e844e; the same pattern would work: a Display row writing `charLook`).
- Saves are untouched (nothing is stored in a save); old saves load as before.

## Numbers
| | Current | v2 (`hairtone`) |
|---|---|---|
| Triangles (Twinsen model) | 5,044 | 5,044 |
| Meshes / draw calls | body + eyes + mouth | the same |
| Materials / textures | 1 LbaMaterial / 0 | the same (no new shader program) |
| Vertex colours | 12 | 13 (three hair tones where there were two) |
| Bones / weights | 19 / unchanged | unchanged |
| Files | — | no new file under `src/` or `assets/`; the step's data is 3 colours in `src/game/characters.js` |
| Load | — | one pass over Twinsen's 15,132 vertices at start, only with the switch on |

## Evidence (`captures/twinsen-zoe-look/`)
- `current/`: the baseline, the current look, kept for later comparisons: lookdev (the game's own character page and
  material, outdoor light, frozen idle) front, ¾, side and back of each, and their heads from the same four sides;
  in the game the play camera (Follow, Far) standing by Zoé and walking, and the talk with Zoé under the talk camera
  (her line, his answer). `tests/twinsen-zoe-look.mjs` takes them; `LOOK=v2` takes the same for the candidate.
- `sheets/back-still.png`: from behind, current | v2, in the house, the yard and a street, at Far and Medium (the
  game's own pixels, ×3 nearest-neighbour).
- `sheets/back-motion-house-far.png`, `-yard-far.png`, `-street-far.png`, `-street-medium.png`: six walk frames
  0.1 s apart, current over v2.
- `sheets/turn.jpg` (lookdev front, ¾, side, back of both), `sheets/heads-twinsen.jpg` (his head from the four sides:
  the face is identical), `sheets/game-play-far.png` (the play camera, standing and walking),
  `sheets/game-talk.jpg` (the talk camera): current | v2.
- Seen in passing, not this task's: in the yard the talk camera frames Twinsen's line behind the LIGHTHOUSE signpost
  (his figure shows only as the see-through silhouette; `game-talk.jpg`, both looks), a camera matter. From behind in
  a walk the robe's seat shows a dark fold that moves with the stride (CHAR-FORM's hip shaping under the fixed light).
- `tests/twinsen-back-look.mjs` takes the back views (`LOOK=`, `OUT=`, `DIAG=1` adds the shadow-off diagnostic);
  `tools/look-sheet.py` builds the sheets.
- Sheets with the original (lba2remake) and the box art as a third column were made in the worker's scratch space
  only: no LBA1/LBA2 picture is in the repository.

## Open questions for the user
1. **The hair from behind**: take `hairtone` (a lighter, three-tone brown bun), or keep the near-black balls?
2. **Is "pixelated" the whole picture getting coarse** (then it is the render scale in the artifact, P30's family,
   for the renderer: e.g. holding the hero's resolution higher), **or only the hair's edge** (then `hairtone`)?
   A screenshot from the user's own screen, from behind, would settle it.
3. **The box art's ponytail** (long, glossy, from a gold band on the crown) against the approved LBA2 three balls: the
   user chose the three balls on 12.11 and rejected a topknot with a band on 15.11. Is there any wish to revisit it?
   Not proposed here.
4. Later, only if wanted, single steps toward the box art, each behind its own switch: the round medallion with an "S"
   (the in-game original is an octagon), a less red mouth line, Zoé's necklace as a short choker.

## Tests (SwiftShader, one at a time; Automated runtime only)
| Suite | Look | Result |
|---|---|---|
| `tests/twinsen-zoe-look.mjs` (new; the baseline pictures) | current | PASS 3/3 |
| `tests/twinsen-zoe-look.mjs` (a boot with `?look=v2`, the same pictures) | v2 | PASS 3/3 |
| `tests/twinsen-back-look.mjs` (new; the back views) | current, v2 | PASS 3/3, PASS 3/3 |
| `tests/char-form.mjs` | current (default) | PASS 7/7 |
| `tests/faces.mjs` | current (default) | PASS 7/7 |
| `tests/anim-polish.mjs` | current (default) | PASS 55/55 |

## For the animator
No contract change: no bone, weight, bind pose, socket, clip or face control changed. The hair's follow-through
(tail0–tail2) moves the same geometry in its new colours.

## The hair from behind, second pass (HAIR-EDGE, P106, 22.11)

**The user's answers.** "Pixelated" means the hair, not the whole picture ("the problem is the hair"). Later that
day: "Maybe not 3 balls. Try to turn the 3 balls more into hair." Evidence: **Automated runtime only** (SwiftShader,
the game's High preset with Quality Auto's knobs, 1280 × 720, pixel ratio 1); the comparisons are the worker's.
**The default is unchanged**: every option is a switch (`?look=…` or `charLook`, as above).

### Options (each its own switch; combine with commas)
| Switch | What it changes | Triangles (Twinsen) |
|---|---|---|
| `hairtone` | (first pass) the three balls in three browns | 5,044 (same) |
| `haircap` | the scalp right round the hair (all within 2 cm, fading out by 6.5 cm; behind the crown only) painted in the hair's own flat shade (vertex colour + normal turned down, as the balls'): a soft painted hairline on the skull | 5,044 (same) |
| `hairline` | the scalp round the hair (fading out by 11 cm, forward to the top of the crown) shaded toward a darker skin, like the hair's shadow | 5,044 (same) |
| `hairtone,haircap`, `hairtone,hairline` | the combinations tested | 5,044 |
| `hairform` | the three balls replaced by **one lock** in their place: rooted on the crown as the crown ball's dome (unchanged from the front), it sweeps back and down through the balls' centres along their hull (no waists), tapers to a short point with a slight outward flick; 6 broad strands along it (a 6 % ridge in the outline, lighter crests and darker grooves) that twist a little toward the tip; brown from the root to the tip (hairtone's browns) with a soft painted sheen up and back; flat shaded as the balls (normals down: the same from every heading under the fixed light); with `haircap`'s painted hairline. Weights pass head → tail0 → tail1 → tail2 along it (the model's own `w_hair`), so the follow-through sways it | 5,092 (the lock 720 where the balls were 672) |

All are built at load from `assets/poly/twinsen.json` in `src/game/characters.js` (`LOOK_STEPS`, `LOOK_MODEL`,
`hairLock`, `paintScalp`): no new file under `src/` or `assets/`, one material, no texture, no new shader program. The
face (eyes, brows, nose, mouth, forehead) is untouched: in the lookdev front view every changed pixel is in the hair
dome above the brow (`hair-heads.jpg`; measured: rows 131–211 of the 720, the face starts below 250).

### What the pictures show
- **The hair itself.** At Far (head ≈ 25 px) and Medium the balls read as a near-black keyhole; `hairtone` makes it a
  brown bun. **A new finding**: where the crown ball meets the first tuft ball there is a crease, and along it a dotted
  arc of light pixels that moves from frame to frame (`hair-zoom-medium.png`, every look built on the balls). With
  the sun's shadow switched off (a diagnostic) it is all but gone (`hair-zoom-shadowdiag.png`): the hero's own shadow
  map aliasing in the crease. `hairform` has no crease, and none of those dots.
- **The pale ring** (the bald skull round the hair, lit from above) and its outline on the background stay in every
  option: it is LBA2's design (bald, three discs), and its outer edge is the strongest edge on his head at every
  setting. At 0.6–0.7 without MSAA that outline stair-steps whatever the hair does (`hair-scales-*.png`): that part is
  the render scale (the renderer's, P30's family), not the model.
- **`haircap` alone** paints the near-black onto the skull: the dark shape gets a little larger, no softer; with
  `hairtone` it gives a visible soft hairline at the sides at Medium, little at Far. **`hairline`**: a slightly darker
  top of the skull round the hair; at Far hard to tell from `hairtone` alone.
- **`hairform`** from behind reads as one brown lock with strands, not a keyhole; the strands stay steady in the walk
  strips at 1.0; at 0.6–0.7 without MSAA its grooves turn into a few darker pixel lines (no worse than the balls'
  edges). The lock is narrower than the balls toward the nape, so a little more pale skull shows low on the sides.
  From the side and ¾ (`hair-heads.jpg`, `hair-turn.jpg`, `hair-talk.jpg`) its outline is one swept lock with a
  flicked tip where the balls were a cluster: the size and place are the balls', the shape is new. Front: the same dome.
- **Edge contrast, measured** (`tools/hair-sheet.py edge`: the mean of the strongest 3 % of neighbour-pixel steps round
  the head; 6 places/distances × 8 render settings, 7 frames each): against the current look `hairtone` 0.92–0.95,
  `haircap` 0.99, `hairtone,haircap` 0.93–0.94, `hairtone,hairline` 0.92–0.93, `hairform` 0.92–0.94. A small drop,
  much the same for every brown option; the outline of the skull dominates the number.

### Recommendation
**No option is clearly better from every angle, so none is recommended as a default.** The one to look at first is
**`hairform`**: from behind, where the user sees him, it is the only option that changes what reads as "pixelated"
(the keyhole and the crease's sparkle are gone; it reads as hair). But from the side and ¾ it is a new silhouette (one
swept lock instead of three balls), which is where earlier attempts failed (the 15.11 "bulge", the 12.11 "pipe"); only
the user can judge that. If it fails there, **`hairtone`** remains the small safe step; `haircap` and `hairline` add
too little at play distance to be worth a switch of their own. What none of them can fix: the skull's pale outline
stair-stepping at a lowered resolution without MSAA (render scale), and the crease's shadow sparkle for the ball looks
(the hero's shadow map; for the renderer if the balls stay: e.g. no self-shadow on the hair, or a larger normal bias
for the hero).

### Evidence (`captures/twinsen-zoe-look/sheets/`)
- `hair-still-far.png`, `hair-still-medium.png`: standing, from behind, the house, the yard and a street; render scale
  1.0 with MSAA, 0.7 with MSAA, 0.7 without; current | hairtone | haircap | hairtone,haircap | hairtone,hairline |
  hairform; each the game's own pixels and ×3. (The standing frames are not always the same pose: his idle head turn
  differs between boots; the walk strips are the steadier comparison.)
- `hair-walk-house-far.png`, `-yard-far.png`, `-street-far.png`, `-street-medium.png`: six walk frames 0.1 s apart, ×3,
  each look at 1.0 MSAA and 0.7 without.
- `hair-scales-yard-far.png`, `hair-scales-street-medium.png`: all eight settings (1.0 / 0.8 / 0.7 / 0.6, MSAA on and
  off) for every look.
- `hair-zoom-medium.png` (×8: the crease), `hair-zoom-shadowdiag.png` (the current look with the sun's shadow on and off).
- `hair-heads.jpg` (front, ¾, side, back of the head, lookdev), `hair-turn.jpg` (the whole figure, four sides),
  `hair-talk.jpg` (the talk camera: her line, his answer): current | hairtone,haircap | hairtone,hairline | hairform.
- Taken by `tests/twinsen-back-look.mjs` (new: `STILLS=`/`WALKS=` render settings `scale:msaa|off`, held for each
  picture; `ONLY=` places; `NOSIL=1`; the street spot is now one where nothing hides his head along the walk) and
  `tests/twinsen-zoe-look.mjs`; sheets by `tools/hair-sheet.py` and `tools/hair-sheet-front.py`.
- Seen in passing: the old street spot (beside Ume) put a tree crown between the camera and his head (the silhouette
  drew him: the first pass's street pictures); in the talk the camera still frames his answer behind the LIGHTHOUSE
  signpost (all looks).

### Tests (SwiftShader, one browser at a time; Automated runtime only)
| Suite | Look | Result |
|---|---|---|
| `tests/twinsen-back-look.mjs` (back views; 8 render settings for the still, 4 for the walk) | current, hairtone, haircap, hairtone+haircap, hairtone+hairline, hairform | PASS 3/3 each |
| `tests/twinsen-back-look.mjs` (diagnostics: `DIAG=1`, `NOSIL=1`) | current | PASS 3/3, PASS 3/3 |
| `tests/twinsen-back-look.mjs` (as shipped: no switch, defaults) | current | PASS 3/3 |
| `tests/twinsen-zoe-look.mjs` (lookdev four sides and heads, play camera, talk camera) | current, hairtone+haircap, hairtone+hairline, hairform | PASS 3/3 each (the models keep 19 bones, eyes, mouth, 3 brow morphs) |
| `tests/char-form.mjs` | current (default) | PASS 7/7 |
| `tests/faces.mjs` | current (default) | PASS 7/7 |
| `tests/anim-polish.mjs` | current (default) | PASS 55/55 |
| a node check of every step on `twinsen.json` (scratch) | all | no NaN; every vertex's weights sum to 1; triangles as in the table above |

### For the animator
No contract change for the default look and for `hairtone`, `haircap`, `hairline` (colours and normals only). With
`hairform` the bones, bind pose, sockets and clips are the same; the hair's triangles are new and carry head / tail0 /
tail1 / tail2 weights along the lock, so the existing follow-through bends one continuous lock (no gaps possible
between balls). Nothing for the animator to change; if `hairform` is taken, the tail bones' swing may want a second look
on the longer single shape.

## The hair from splines, and the hair tie (HAIR-SPLINE / HAIR-BAND, P106, 22.11)

**The user, after the hair sheets:** "Make the hair with splines." Then: "And the hair tie is missing at the edge of the
scalp, where it joins the hair" (with LBA2's box art: a gold ring round the root of the ponytail; a promotional render,
not the game's model). Evidence: **Automated runtime only** (SwiftShader, as above); the comparisons are the worker's.
**The default is unchanged**: new switches only.

### What was built (`src/game/characters.js`: `hsSpine`, `splineLock`, `hsLevel`, `hairBand`, `swapHair`)
| Switch | What it is | Triangles (Twinsen model) |
|---|---|---|
| `hairspline` | the balls replaced by a lock swept along a `THREE.CatmullRomCurve3` spine: from a root under the scalp in front of the crown ball, up and back through the three balls' centres (so the place, the size and the dome seen from the front are hairform's, i.e. the crown ball's) to a soft point with a slight outward flick. The section (32 points round, 24 rings) is swept along it, its width on a spline profile (0.6 of the crown ball's radius at the root, the full radius at its centre, then tapering to the tip), round at the root and flattening to 0.62 toward the tip, with five soft strand ridges that twist a little toward the tip (crests lighter, grooves darker). Smooth normals, **levelled for LBA's ramp**: the ramp mixes white into any surface facing its fixed light past 0.6, which turned a smooth-shaded brown top grey, so the hair keeps its sideways shading and drops most of its upward part (it shades between 0.27× its colour, the old flat shade, and its colour). Browns from the root to the tip, a soft painted sheen band up and back. The cap's painted hairline round it (the scalp's normals there levelled the same way). With the band | 6,148 (the balls' 672 out; lock 1,536 + band 240 in) |
| `hairsmooth` | the same lock without the strand ridges (one smooth lock); with the band | 6,148 |
| `hairband` | the hair tie: a slim brass cuff (20 × 6 segments, 24 mm along the hair, 15 mm thick) swept round the line where the lock comes out of the scalp, found on the model itself (each line along the lock's surface tested against the skull's triangles), set so its lower edge presses 3–7 mm into the scalp all round (measured on all 20 sections: no gap, nothing floating) and its inner side into the hair. Head bone only, so it does not sway. On with `hairspline` and `hairsmooth`; `hairspline,-hairband` takes it off. It does nothing for the balls or `hairform` (their root sits on the skull, so there is no line all round where hair leaves scalp) | +240 |

Skinning: the lock's vertices carry head → tail0 → tail1 → tail2 by their place along the spine (hairform's `w_hair`
mapping), normalised to sum 1 (hairform's now too, through the shared `swapHair`). Node check on `twinsen.json`
(scratch): no NaN or negative weight, every vertex's weights sum to 1 (within the model's own 1e-4), indices in range,
unit normals; no ring of the sweep folds over (each section is set square to the tangent averaged along the curve:
square to the curve itself they crossed on the inside of the bend over the crown, a notch in the first pictures). Bones
19, bind pose, sockets, eyes, mouth and the 3 brow morphs unchanged; 1 material, no texture, no new shader program; no
new file under `src/` or `assets/`.

### What the pictures show (`captures/twinsen-zoe-look/sheets/hairspline-*`; one column or row each: current, hairtone, hairform, hairspline, hairspline,-hairband, hairsmooth)
- **Heads** (`hairspline-heads.jpg`): from the front the same dome as hairform (smoothly shaded instead of one flat
  brown). From the side and ¾ one clean swept lock with a soft flicked point: a smooth outline with no facets, beads
  or waist. It reads as a ponytail rather than a pipe because it tapers and flattens, and the tie marks where it is
  gathered. From behind a tapering teardrop with strands. The band shows from the side and ¾.
- **Play camera from behind** (`hairspline-still-far.png`, `-still-medium.png`, `hairspline-walk-*.png`; 1.0 with MSAA
  and 0.7 without): a lighter brown lock with visible light and dark strands, where the balls were a near-black
  keyhole and hairform a darker, flatter lock. Edge contrast round the head (`tools/hair-sheet.py edge` as before; 6
  places × 2 settings, 7 frames each) against the current look: hairform 0.89–1.05, **hairspline 0.71–0.83**,
  hairsmooth 0.72–0.82, the softest of all the options so far. The pale skull ring round the hair stays (LBA2's bald
  head), and at 0.7 without MSAA its outline still stair-steps (the render scale). The strands stay steady through the
  walk strips.
- **The band from behind**: hidden. The Follow camera looks down at his back, and the lock's dome sits between it and
  the line where the hair leaves the scalp, so at Far and Medium from behind `hairspline` and `hairspline,-hairband`
  look the same. To show from behind it would need a wider root or a thicker collar. A wider root does not stay
  under the scalp at the sides (tried, dropped), and a thicker band would read as a pipe collar.
- **Talk camera** (`hairspline-talk.jpg`): her line shows his lock and the gold tie in profile. His answer is still
  framed behind the LIGHTHOUSE signpost (all looks; a camera matter).
- **Turn** (`hairspline-turn.jpg`): the whole figure from the front, ¾, side and back. The lock's shading follows the
  fixed light as the body's does (before, it was one flat shade).
- **Motion** (lookdev walk and run frames, scratch): the lock bends as one piece on the tail bones, the tie stays on
  the scalp, and nothing crumples.

### Honest comparison with `hairform`
It is better from behind (lighter, with strands that read as hair, lower edge contrast, steady in motion), from the
side and ¾ (a smooth swept outline with a soft point instead of a faceted one, and the tie), and close up (smooth
curves). From the front it has the same outline, smoothly shaded where hairform is one flat brown. Where it is not
better: its shading now depends on which way he faces the fixed light (as the rest of him does), so the same lock looks
a little darker or lighter from one heading to the next; the tie cannot be seen from behind; at 0.7 without MSAA its
strands break into a few pixel streaks (no worse than hairform's grooves); and it uses about twice the triangles of
hairform's lock (1,536 + 240 against 720). Whether the side silhouette is the ponytail the user wants (and not the
15.11 "bulge" or the 12.11 "pipe") is the user's call. `hairsmooth` is the plainer variant: almost as soft from behind,
but behind and close up it reads more as one smooth shape than as hair.

Seen in passing: a few single dark or pale pixels near his head in some walk frames of every look (the current one
included). Not traced, not changed.

### Tests (SwiftShader, one browser at a time; Automated runtime only)
| Suite | Look | Result |
|---|---|---|
| `tests/twinsen-zoe-look.mjs` | hairspline, hairspline,-hairband, hairsmooth, hairtone | PASS 3/3 each (19 bones, eyes, mouth, 3 brow morphs) |
| `tests/twinsen-back-look.mjs` (STILLS 1:msaa, 0.7:msaa, 0.7:off; WALKS 1:msaa, 0.7:off) | hairspline, hairspline,-hairband, hairsmooth | PASS 3/3 each |
| `tests/char-form.mjs` | current (default) | PASS 7/7 |
| `tests/faces.mjs` | current (default) | PASS 7/7 |
| `tests/anim-polish.mjs` | current (default) | PASS 55/55 |
| node check of the steps on `twinsen.json` (scratch) | hairspline, hairsmooth, hairform, hairtone, with and without hairband | no NaN; weights sum to 1; the band 3–7 mm into the scalp on every section |

The current, hairtone and hairform back-view columns are the second pass's pictures (the code for those looks is the
same).

### For the animator
No contract change: the bones, bind pose, sockets, clips and face controls are the same. With `hairspline` or
`hairsmooth` the lock carries head / tail0 / tail1 / tail2 weights along its spine, as hairform's did, and the tie is
on the head bone. If one of them is taken, the tail bones' swing may want a look on the longer, smoother lock (no
change asked).
