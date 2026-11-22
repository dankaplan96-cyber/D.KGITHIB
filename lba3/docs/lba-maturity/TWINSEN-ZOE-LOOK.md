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
- In the game's address: `?look=v2` (every step; today only `hairtone`), `?look=hairtone` (a list of steps),
  `?look=v2,-hairtone` (all but some). `lookdev.html` takes the same parameter.
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
