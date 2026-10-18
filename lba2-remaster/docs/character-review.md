# Character review — Twinsen first (per docs/LBA3_CHARACTER_ART_GUIDE.md)

Tools: no Blender in this environment (no `blender` binary, no `bpy`). Characters are modelled as signed-distance
sculptures in code (src/engine/sculpt.js → surface nets → skinned mesh) from design parameters in
src/game/characters.js; animation is procedural (src/engine/rig.js) with a state machine in src/game/actors.js.
The "source file" of a character is its `LOOKS` entry + `design()`; the "export" is the generated mesh (built at load).

Review scene: `lookdev.html` — floor grid, height ruler, door 2.15 m, step 0.25 m, chair; front/side/back/¾
(`views=0,1.57,3.14,0.62`) and the real game camera (`cam=game`); clip + freeze (`anim=`, `t=`);
materials colour / grey / black silhouette (`mat=`); light presets (`light=neutral|outdoor|indoor`).

## 1. Reference board (LBA2 screenshots, user's PDF, magicball.net gallery)

Crops of #47 the_harbor (¾ front), #38 citadel_island_2 (¾ side), #23 otringal_city (back), #13, #01, enlarged
2–5× with nearest-neighbour from small 640×480 sources (no AI upscaling). The images are not redistributed in
the repo (original copyrighted screenshots); board kept in the session scratchpad as `ref/TW_REFBOARD.png`.
Animation timing could not be studied from video: video sites are not reachable from this environment
(network policy) — timing is therefore a design decision, marked as such below.

## 2. Measurements (H = 1, from oblique screenshots → ranges, i.e. design decisions)

| Feature | #47 ¾ front | #38 ¾ side | #23 back | Chosen |
|---|---|---|---|---|
| Head height (crown–chin) | 0.19–0.21 | 0.19 | 0.18–0.2 | 0.19 (egg skull ×1.13) |
| Head width | 0.15 | — | 0.15 | 0.14 |
| Neck visible | 0.05–0.07 | 0.07 | 0.05 | 0.058 (long, thin) |
| Shoulder width (sleeves out) | 0.32–0.4 | — | 0.38 | 0.36 |
| Belt height from floor | 0.44–0.47 | 0.45 | 0.46 | 0.46 |
| Hands (sleeve end) from floor | 0.36–0.4 | 0.37 | 0.38 | 0.38 |
| Robe hem from floor | 0.03–0.05 | 0.04 | 0.03 | 0.04 |
| Shoe length | 0.12 | 0.13 | — | 0.12, pointed |

Colour blocks: robe mid blue (lower half darker), orange belt with a knot, orange slippers, skin, dark-brown hair
cap and topknot, big gold medallion on a gold chain.

## 3. Diagnosis of the previous Twinsen (before this pass)

Captures: `captures/characters/twinsen-before-knee-tunic.png` (front/side/back), in-game frames in
`docs/docs-walk-throw.png`.

1. **Silhouette / costume wrong** — a knee-length smock with fitted sleeves and trousers showing. LBA2's Twinsen is
   a long robe to the ankles with very wide, cape-like sleeves and an orange belt at mid-height; without that he
   doesn't read as Twinsen at game distance.
2. **Head reads generic** — round head, full hair helmet with a fringe, big cartoon eyes. LBA2: egg-shaped head,
   high bare forehead, small eyes, big ball nose, hair only as a cap at the back with a high topknot, long thin neck.
3. **Colour blocks / materials** — light sky-blue everywhere, brown shoes, red cord; LBA2 reads through mid blue
   robe + orange belt + orange slippers + big gold medallion. A belt band also bled into the robe colour (pink edge).

## 4. Changes made (model)

- New outfit `robe2` (characters.js): yoke + chest, straight robe to 0.04 H with a slight flare and a few large
  folds, darker lower half, darker hem band; orange belt as its own hard-edged band with a knot; funnel sleeves
  (narrow at the shoulder, widest at the cuff) ending at 0.38 H with trim; slippers with a pointed toe.
- Head: egg skull (`skull:'egg'`), eyes at 66 % size and set deeper, stronger nose with a bridge, chin, hair cap
  clipped to the back of the head, compact topknot on a 4-bone chain (follow-through in rig.js), longer neck.
- Medallion: bigger disc on a gold chain.
- Pipeline: `hard` materials in sculpt.js stop colour blending at belt/trim edges.
- Arthur got his own kid design (knee tunic, belt like his father, tuft), not a scaled Twinsen.
- New chapter-1 cast: Vesk, worker, guard (`captures/characters/cast-ch1.png`).
- Arms are a second skinned surface on the same skeleton (`splitArms` in characters.js). Found in the close-up
  recording: with the arms down the wide sleeve touched the robe, the two were fused into one surface, and on the
  back-swing the robe tore open into stretched strips. Sculpted apart, the sleeve slides over the robe instead.

## 5. Changes made (animation — rig.js / actors.js)

Design decisions (no video reference available): stride length = 4·L·sin(amp) so a planted foot does not
slide; run lean grows with speed; sneak lingers on each contact; turn: head leads, chest follows, pelvis last;
idle: breathing + slow weight shift; jump: 0.09 s crouch → take-off → rise/fall poses → landing squash
(hard landing > 13 m/s → knockdown + get-up); throw: wind-up 0.18 s with the ball in the hand (ball attached
to the hand bone), release event at 0.18 s (ball leaves from the hand position), follow-through and recovery;
hit: directional recoil from the hit side, short lock; heavy hit: knockdown → get-up; clover revive:
knockdown → get-up with sparkle; talk: 5 gestures without repeating, listeners turn to the speaker;
pick-up (crouch and reach), use (two-handed crank), door (push).

Fixes from reviewing the recordings (session 3): run arms pump close to the body (swing biased behind the hip,
elbow folds more on the forward swing — before, the forward arm reached out at shoulder height); in a long robe
the run's heel fold is capped and the back robe panel follows the folded heel, so the foot no longer pokes
through the back of the robe.

## 6. Criteria (§12) — status with evidence

| Criterion | Status | Evidence |
|---|---|---|
| Recognisable at game distance by silhouette and colour blocks | not yet verified | pending game-camera capture |
| Proportions checked against documented reference | pass | table §2, `twinsen-after-4views.png` |
| Head with designed profile and hairline | pass | side view in `twinsen-after-4views.png` |
| Shoulders, pelvis, joints connected | pass (static) / not yet verified in motion | |
| Robe has shape and hem; no penetration when walking/throwing | not yet verified | pending close-up video |
| Shoes and hands designed | pass (slippers); hands simplified | |
| Walk/run synced with movement | not yet verified | pending video |
| No pops to rest/T-pose between clips | not yet verified | pending video |
| Ball leaves the hand at the right moment | pass | `docs/docs-walk-throw.png` (ball in hand during wind-up) |
| Works outdoors / indoors / normal screen size | not yet verified | |
| Export loads without missing parts | pass | game loads, no errors (err.mjs) |
| Several characters together, performance noted | partial | 6 characters built in 15.5 s in SwiftShader (software GL); real-GPU frame rate not measured |

## 7. Pass 3 — the user's verdict: "the character doesn't look like him at all"

The user played the build, saw Twinsen in the house and rejected the look, attaching the classic Twinsen
render as the reference (not redistributed here). Next to it, the LBA2-screenshot version read as an old
monk: dark mid-blue floor-length robe, small sunken eyes under thick brows that looked like glasses, an
almost bald egg head with a small topknot, a flat mouth, a stoop.

Changes, measured against the reference:

| Feature | Before (pass 2) | Reference | Now |
|---|---|---|---|
| Tunic colour | mid blue `#4f93d2`, darker lower half | pale sky blue | `#93c6ee` |
| Length | ankle (0.04 H) | mid-shin, shoes show | hem 0.15 H |
| Sleeves | funnel, 0.14 at the cuff | huge balloons | ×1.3 (`sleeveW`) |
| Belt | orange band with knot | none | none (`noBelt`) |
| Head size | headS 1.0 | big, cartoon | 1.38 |
| Eyes | 66 %, upper lid, thick flat brows | big round, white, blue iris, no brows | 142 %, no lid, no brows |
| Mouth | straight line | open smile | open grin with lip |
| Hair | back cap + small topknot, high bare egg skull | brown, big ponytail rising from the crown and curling back | round skull, hairline 0.26, thick 4-bone ponytail rising then hooking back |
| Medallion | gold chain | gold on a red cord | red cord, R 0.058 |
| Shoes | orange pointed slippers | big round brown shoes | round brown |
| Posture | stoop 0.03, long neck | upright, short neck | no stoop, neck 0.06 |

Captures: `captures/characters/twinsen-v3-classic-4views.png` (front, ¾, side, back),
`captures/characters/twinsen-v3-ingame-house.png` (the game camera in the house, where the user saw him).
At game distance the ponytail first swept back almost horizontally and read like a pointed hat from the
high camera; it now rises before it hooks back.

Status: **awaiting the user's judgement** — the earlier "pass" marks in §6 were for the LBA2-screenshot
version and are superseded by this redesign.

User follow-up: "the ponytail stands too upright and doesn't look natural". Two causes: the modelled shape rose
too steeply, and the rig's follow-through bent every segment upward (even at rest, and up to ~2 rad of total bend
at a run). Now the tail lifts a little from the back of the crown, arcs back and its tip hangs down; at rest its
weight lets it droop a touch, moving it streams back slightly and bounces with each step
(`captures/characters/twinsen-v3-ponytail.png`: review views + game camera in the house).

### Motion check of the redesign (close-up recording, 720×405, 30 fps, headless software GL)

| Criterion (§12) | Status | Evidence |
|---|---|---|
| Walk/run synced with movement, no sliding visible | pass (by eye, frame sheets) | recording frames 30–180 |
| Robe: no penetration when walking/running | pass | arms are a separate surface; heel fold capped in a robe |
| Jump: robe stays a robe | pass after fix | knees tucked together, arms out (was: legs split, robe flared into a bell) |
| Kick: leg doesn't tear through the robe | pass after fix | low front kick for robed characters, front panel follows |
| Hit: readable recoil, heavy hit knocks down | pass after fix | stronger recoil 0.4 s; knockdown → get-up |
| Ball leaves the hand at the right moment | pass | held in the hand during the wind-up, released at the whip |
| No pops between clips | not yet verified frame by frame at full rate | |
| Recognisable at game distance | awaiting the user's judgement | `twinsen-v3-ingame-house.png` |

## 8. Fidelity pass (v4) — faithful to LBA2's Twinsen, not a redesign

Brief from the user: the result wasn't close enough to the original. Detail (face, hair, clothes, medallion,
proportions) comes from the classic Twinsen render the user sent; silhouette, colours, scale and readability come
from the LBA2 in-game model (screenshot crops #47 ¾ front, #38 ¾ side, #23 back, see §1). Where they disagree the
in-game model sets the shape and the render sets the details. The only video available was the recording of the
*current* version, so it was used for diagnosis only; no original gameplay footage is reachable from this
environment, so no animation timing was copied from the original (marked as design decisions in §5).

Comparison boards use the same cameras, light and distances before and after (`scratchpad/board.mjs`,
`gamecam.mjs`): `captures/characters/twinsen-v4-model-views.png` (front / ¾ / side / back, silhouette, head
front/¾/side), `twinsen-v4-before-after.png` (colour, silhouette and the real game camera in the house and the
town at play size), `twinsen-v4-motion-poses.png` (walk, run, jump, throw). The boards with the reference images
next to the model are kept outside the repository (the references are copyrighted) and were sent to the user.

### Diagnosis of v3 (before), concrete

1. Sleeves were closed balloons ending at the elbow, on ball shoulders — the reference sleeves are bells hanging
   from a sloped shoulder, widening to an open hem at hip level; together with the chest they make the upper
   body a trapezoid ("cape" read in #47/#23).
2. No waist: the body was a straight tube. Reference: a clear waist (render), a thin orange belt (game).
3. Tunic too pale (`#93c6ee`); the game's is a medium blue, darker on the skirt.
4. Head too round and wide, jaw not tapering, eyes far apart, a big ball nose on a bridge, a wide grin.
5. Neck hidden under the collar; the references show a narrow, visible neck.
6. Hair: a brown cap over the whole skull; the game shows dark hair only on the crown and as a strip down
   the back of the head, with the tuft rising from the back of the crown.
7. Shoes: shapeless lumps hidden under the hem.

### What was rebuilt

- Sculpt primitive `bell` (src/engine/sculpt.js): the shell of a tapered capsule cut flat across its axis — an
  open sleeve with a thin cloth wall. The arms surface is sculpted at 0.7× the body cell so the wall holds.
- Outfit `tw` (characters.js): sloped yoke instead of ball shoulders, a softer narrower chest, waist 0.122,
  thin orange belt, skirt flaring from the waist to hem 0.135 with soft folds and a thin hem; sleeves
  shoulder r 0.085 → elbow 0.155 → bell hem 0.205, ending just above the hand.
- Head: egg skull 1.03 tall, width ×1.08, jaw 0.88, chin 0.9, cheeks halved; eyes ×1.5, oval ×1.18, set into the
  head; ball nose without the bridge; small open mouth; warm skin `#efab70`; neck 0.095 long, r 0.033.
- Hair `#3a2414`: crown cap (hairline 0.25 front / 0.1 back) plus a central strip down the back (#23); the
  ponytail rises from the back of the crown and arches back (#38; the render's is the same gesture, longer).
- Medallion placed by marching the body's distance field to the cloth surface (no floating, no sinking); the
  strap follows the surface; strap colour red-brown `#8e3a24`.
- Shoes: rounded with a clear toe box and heel, ×1.12, brown `#94502a`, peeking under the hem. Hands ×1.2.

### Checks, each separately (v4)

| Check | Result | Notes |
|---|---|---|
| Head and face shape | closer | oval narrowing to the chin; big white oval eyes, small round nose, open mouth |
| Neck height | matches | visible and narrow (game: long; render: shorter — between the two) |
| Sleeve volume | matches the game read | bells from the shoulder to hip level; render's sleeves are even fuller |
| Shoulder : waist ratio | matches | trapezoid upper body, clear waist under it |
| Tunic length | matches | to the ankle, shoes peek (game); render's is shorter (mid-calf) |
| Hair shape | matches | crown + back strip + rising tuft; not a ball, cylinder or hat |
| Shoe size | close | rounded with a toe; game shows orange slippers, render brown — brown chosen per the brief |
| Medallion position | matches | upper chest, on the cloth, red-brown strap |
| Colour blocks | matches the game | medium blue, darker skirt, orange belt, brown shoes, dark hair, warm skin |

### Differences that remain (honest list)

- The sleeves are rigid bells that follow the arm; they don't hang with gravity when the arm is raised (the
  original's are rigid polygons too, but its sleeve hem is more horizontal than ours at rest).
- Eyes: we follow the render (big). The in-game model has small eyes; at play size ours read bigger.
- The skirt flares a little more (A-line) than the in-game one, which is closer to a straight column.
- The ponytail length is a reconstruction between the game's compact tuft and the render's longer one;
  no reference shows it from straight behind in detail.
- Hands: palm, fingers and thumb are modelled; the game's are simple balls at this distance.
- Animation timing could not be studied from original footage (not reachable); motion is designed, not copied.

### Source and export

- Source: the `twinsen` entry in `LOOKS` and the `tw` outfit/sleeve/head code in `src/game/characters.js`,
  the `bell` primitive in `src/engine/sculpt.js`.
- Export: `art/characters/twinsen/export/twinsen.obj` (rest pose, vertex colours, 78k vertices, 19 parts) via
  `node tools/export-character.mjs twinsen`; the game loads the same geometry from `assets/bake.bin`.

## 9. Pass 5 — the classic render is the target

User: "closer, but still far from the character I want", attaching the classic render again. So the render now
sets the shape too, not only the details. Measured on it (H = figure height): the sleeves are huge rounded
**puffs** — narrow at the shoulder, widest around the elbow, closing at the wrist where the hand comes out — and
with the upper tunic they form one soft mass about 0.5 H wide from the collar to the hips; below it a wide, nearly
straight skirt to ~0.13 H; big round brown shoes; head ≈ 0.22 H on a long thin neck; a large medallion (≈ 0.1 H)
on a red cord; pale sky blue; no visible belt or waist.

Changes: `sleeve: 'puff'` (two round cones shoulder→elbow→wrist with a small cuff; the arm mesh is weighted to
the arm bones only, so raising an arm doesn't stretch the cloth near the neck); the upper tunic is one dome
from the collar to the hips, full in front so the front reads as one mass rather than two lobes; a wide skirt;
`shoeBall` shoes ×1.45; hands ×1.45; head ×1.3; pale blue `#94c8ef`; medallion R 0.1 on a red cord; nose
reduced; dark open mouth. Captures: `captures/characters/twinsen-v5-model-views.png`,
`twinsen-v5-head-and-game.png`. Prologue and chapter-1 playthrough tests pass.

Still different from the render: the sleeves are rigid with the arm (no cloth drape when raised); the render's
sleeve has fine vertical pleats we don't model; its hair cap covers the whole top with an orange hairline that we
haven't reproduced; the skirt here is slightly A-shaped where the render's is straighter; the pose in the render
(waving) is a gesture, not the rest pose.

## 10. Pass 6 — the face, after the classic render

User: "everything, mostly the face". Measured on the render at the same scale as ours: the head is almost as wide
as tall (≈ 0.85 vs our 0.66) and widest at the eyes, narrowing to a short round chin; the two eyes are big white
ovals that almost touch, irises glancing up; the hair covers the top and back of the head down to just above the
eyes; a small round nose right below the eyes; a WIDE open mouth (about the width of both eyes) — flat on top,
round below, dark inside, with a lower lip; a long thin neck between head and tunic.

Changes: skull width ×1.32 (hair cap widened with it), jaw 1.1, cheeks reduced; eyes ×1.78, oval, touching, no
eye sockets, irises up/out; new `nose: 'round'` (a simple ball, ×0.8); new `mouth: 'wide'` (half-dome, dark,
with a lower lip); hairline 0.13 in front and −0.13 behind (covers the back); neck 0.15 and the tunic's dome
lowered so the neck shows; skin `#f6b260`.
Captures: `captures/characters/twinsen-v6-model-views.png`, `twinsen-v6-face.png`, `twinsen-v6-ingame-house.png`.
Prologue and chapter-1 playthrough tests pass.

Still different: the render's orange-ish hairline band isn't reproduced; at the game camera the face is ~20 px
tall, so the eyes and mouth read as dots and a dark spot — the face matters most in close-ups and dialogue.


## 11. Pass 7 — the original model, rebuilt as polygons in Blender

The user chose the original in-game model as the target and asked for a polygon modeller. Twinsen is now a
low-poly mesh (1,175 triangles; the original has 1,228) built in Blender from the original's measured
sections: `tools/blender/twinsen_poly.py` (source), `art/characters/twinsen/twinsen_poly.blend` (armature,
vertex groups), exported to `assets/poly/twinsen.json` and loaded by `preloadCharacters()`.

How it is built, all in fractions of the height H (the measured values from the original model):
- **Cape:** a single shell from the collar (±0.12 H at 0.74 H) out to ±0.214 H. Its hem sits at 0.41 H at
  the sleeves and rises to 0.45 H over the belt.
- **Belt:** a band at 0.41–0.47 H, just inside the cape.
- **Robe:** almost straight, about ±0.16 H wide and ±0.13 H deep.
- **Head:** a faceted block. It is widest at the eyes, carries a small wedge nose and diamond eyes, and is
  tilted back by 10° like the original's rest pose.
- **Hair, hands, shoes, medallion:** three hair balls (a cap plus a two-ball bun), ball hands at ±0.178 H,
  wedge shoes, and an octagonal medallion on a cord.

How it is skinned (the same way LBA2 skins its models):
- The cape's sides follow the arms, so the cape opens and stretches in the throw and jump, as in the original's clips.
- The robe follows the four skirt bones by direction.
- The bun rides the hair bones.
- The eyes are separate meshes so they can blink.

It uses the game's own skeleton, so all animations drive it unchanged. The sculpted version remains as a
fallback and as `twinsenSculpt` for comparisons.

Captures: `captures/characters/twinsen-poly-views.png`, `twinsen-poly-ingame-house.png`, `twinsen-poly-ingame-plaza.png`.
The prologue, chapter-1 and chapter-2 playthroughs pass.

**Follow-up (the user: "it still doesn't look good"):**
- **Shading:** the material now shades like LBA2 (`LbaMaterial` in `characters.js`). Each colour runs on a
  ramp, from near-black through the colour itself to a pale tint of the same hue. The shade is picked by
  clamp(N·L, 0.1, 1) from one fixed light, instead of the scene's physically based lighting. This gives the
  original's bright, high-contrast blue in place of a flat grey-blue.
- **Head:** rebuilt from the original's head sections. The lower face juts furthest forward (a short snout
  at 0.82–0.89 H, z 0.15 H), the forehead slopes back above the eyes, and each section is a wedge pointing
  forward. There is no separate nose.
- **Shoes:** salmon, like the original.

Captures: `twinsen-poly-views.png` and `twinsen-poly-motion.png`.

Remaining differences:
- **Style mix:** the other characters still use standard lighting.
- **Medallion emblem:** the "S" on the medallion is not modelled.
- **Robe deformation:** the original's robe halves follow the thighs, so they scissor. Ours swings on four
  skirt bones.
- **Face:** small differences in the facets.


## 12. Pass 8 — closer to the original, and one design language for the cast

The user: the characters still don't look like the original, even with the original game at hand, and the rest
of the cast should share their design language. `bpy` (Blender as a Python module, `pip install bpy`) now runs
here, so the Blender scripts were changed and every model rebuilt from them.

Compared on the same renderer at the same scale with the original models (study only, not in the repository):
- **Twinsen:** the head was drawn 1.24× the original's; it is now at the measured size. There is no hair on
  the skull: the original shows only the bun, three balls at the measured places. The mitten hands are now the
  original's balls (r 0.036 H). The eyes are smaller and pale, with no lid line, and the medallion is pale gold
  with no cord.
- **Zoé:** rebuilt from the original's horizontal sections (`build_zoe`):
  - Narrow shoulders and a slim waist over wide hips.
  - A red outfit with a deep V neckline and bare shoulders. The V is a skin panel ray-cast onto the dress, so
    its edges are straight; the straps are at the sides.
  - Trousers tapering to long pointed green shoes, and thin bare arms with small hands.
  - A narrow head (0.69× Twinsen's width) with red lips, and the three-ball bun.
  - Her full front is softened from 0.143 to 0.12 H. At the original value it reads as a belly in our lighting.
- **Everyone else (the cast's language):**
  - Ball hands, and shoulders flush with the sleeve (no puffed caps).
  - Small plain eyes (white, iris, pupil; no lid line).
  - No gold band at the hem; a buckle only where a look asks for one.
  - Buns without a cap of hair.
  - **Grobos:** after the original. One great round body from the knees to the shoulders, coat above and
    trousers below. A wide head sunk into it with no neck, a long trunk hanging in front of the belly, and great
    flat ears. Short shins and round feet.
  - **Rabbibunnies:** a small head drawn out into a snout, with long ears in a V.
  - **Esmers:** they keep their shape, in the same language.

Not done, and why:
- **Flat shading.** The original's polygons are Gouraud (LBA2_MEASUREMENTS.md, Shading); the faceted look came
  from a flat study render.
- **The skeletons are unchanged**, so every animation drives the new models as before. A Grobo's legs are
  therefore not as short as the original's: its body hangs over the thighs instead.

Captures:
- `captures/characters/cast-pass8-before-after.png`: Twinsen, Zoé, Arthur, the archivist, Doran and Mira, four
  views each, 0.12.0 against now.
- `captures/characters/cast-pass8-walk.png`: mid-stride.
- `captures/characters/cast-pass8-ingame-square.png`: the town square at the game camera.

### Pass 8b — Zeelich's peoples

The user asked where the Zeelich characters were: the bees, the capsule-like aliens and the moles, all of
them in the original files. Measured on the original models (docs/LBA2_MEASUREMENTS.md, "Zeelich's peoples")
and built in `cast_poly.py`:
- **Esmers (`build_esmer`):** a capsule for body and head, with the face high on it, trim bands and trousers
  below, thin arms with cone hands, thin legs and long boots. The skin changed from green to the original's salmon.
- **Mosquibees (`build_bee`):** a banded upright abdomen, a head forward with great eyes, a long proboscis,
  curled antennae, two wings, thin legs and forelegs.
- **Moles (`build_mole`):** after the user's screenshot of a mole home, bodies 323/327: a robed pear of a body,
  the long pale snout as the head, a yellow lip, pale arms hanging out and big pale feet. A first try used body
  136, a small big-eared creature, which was not Zeelich's moles.
- **Triangle-headed townsfolk (`build_tri`):** bodies 84/430. A thin suit or shirtsleeves, a big inverted-triangle
  head with pointed ears and a flat top, and thin arms with pointed hands.
The legs start at the hip joint, inside the body, so a stride never shows a gap. The Esmers take the robe's
shorter stride. Captures: `captures/characters/zeelich-folk.png` (four views, and walking),
`captures/characters/zeelich-street.png` (the street in chapter 9).

## 13. The Dino-Fly (CH-DF) — after LBA2's original

The user: "the Dino-Fly doesn't look at all like the original from the second game". Ours was an invented green
lizard (signed-distance spheres and cones, a yellow beak and belly, leaf-green wings). Found in the user's own game
files (BODY.HQR, ANIM.HQR, read in the session's scratch space; nothing of them is in the repository): **body 167**
(166 and 168 are the same creature with Twinsen in the saddle, in his blue tunic and in white), 323 polygons in
30 groups; its clips are ANIM.HQR 829–848 (829 the idle, 831/836 lying down, 840–847 flight).

What the original looks like (numbers in its units, Twinsen = 1238; ×1.70 mm for our metres):
- **A bipedal flying dinosaur**, not a lizard: it stands on two thin hind legs, with no forelegs. It is 3,820 long
  (tail tip −2,080 to muzzle +1,740), 1,840 tall to its ear tips and spans 3,360 across the wings: in Twinsen
  heights 3.1 H long, 1.5 H tall, 2.7 H wide.
- **Body:** a deep chest, widest (±419) under the saddle. The back is at 1,370–1,400 and the belly at 504–555 above
  the ground. The tail is a long wedge drawn out to a point, level at 780 high. Its underside is the belly's colour.
- **Neck:** long and thin (half-width 116 → 85). It rises steeply from the chest (about 55°) and flattens toward the
  head (about 25°). It meets the head at about 1,680 high.
- **Head:** horse-like, about 800 long, carried 38° nose-down. It is widest (±200) at the cheeks. On the upper
  sides are big almond eyes in bright yellow (about 160 × 120). Two small spikes for ears rise to 1,840. The muzzle
  is blunt, with no beak and no teeth. A brown bridle: headpiece, cheek straps and noseband, and two reins (lines)
  running back to the saddle.
- **Legs:** the hip is at ±380, 700 high. The hock bends backward (±300, 380 high) and the ankle is at 100 high.
  A long, splayed foot (80…400 wide, −580…−80 long) ends in three toes.
- **Wings:** from the shoulders (±360, 1,100 high), lying flat in the rest pose. The leading edge peaks at the
  elbow (±860, +270) and the wrist (±1,340, +185). The tip at ±1,680 is swept back to −470. The trailing edge is
  scalloped (−380…−545). Teal bones, a tan membrane.
- **Saddle:** brown, from −300 to +200 along the back. The seat is at 1,400, the pommel at 1,480, the cantle at 1,475.
- **Colours (three ramps and one accent):** teal-green hide (lit about `#378773`). Tan membranes and underside of
  the neck, belly and tail (about `#b38b47`–`#cb9b4b`). Brown saddle and bridle (about `#634327`). Yellow eyes
  (`#f7bb57`). Polygons Gouraud-shaded.
- **Poses:**
  - Idle (829): the wings fold up over the back like two tan tents. The shoulder is raised 67°, the forearm turns
    back down (−148°) and the tip folds in (−50°).
  - Lying (831/836): the body is lowered 520 onto the belly, the legs fold under, and the neck curls round to its left.

What ours matches (`tools/blender/dinofly_poly.py` → `assets/poly/dinofly.json`, `art/characters/dinofly/`):
- **Proportions:** every station of the body, neck, head, legs, wings and saddle above is rebuilt from the measured
  sections, at the cast's scale (U = 2.1 m / 1,238). In the rest pose it is 6.54 m long, 3.09 m tall and 5.78 m
  across: 1.01 / 0.99 / 1.01 of the original (6.48 / 3.12 / 5.70 m).
- **Look:** the same colour layout in the LBA ramp material (`LbaMaterial`, like the cast and the dogs), the bridle
  as straps on the head, and the saddle with a pommel and cantle.
- **Skeleton:** its own small skeleton after the original's groups (body, three tail bones, three neck bones, head,
  thigh/shin/foot, three bones per wing). Weights are rigid per piece and blended across the neck, tail and
  membrane joints.
- **The nap (`src/game/dinofly.js`):** the lying pose of 831 (body lowered 0.86 m, legs folded, neck and tail curled
  round to his left). The wings fold as in the idle (the measured angles).
- **Behaviour kept, on bones:**
  - Breathing.
  - The gaze: within 9 m he lifts his neck, the curl unwinds, the head turns and pitches to Twinsen and the eyes open.
  - The wing stretch: the wings open upward, same timing as before.
  - The talk lines, the nuzzle, the voice, its spot (−50.5, 68.5) and its colliders, resized to the new body.
- **Twelve years on (small touches):** a greyed muzzle and heavy eyelids while he dozes. No rider and no reins.
- **Turned to the play camera:** he lies 1.3 rad turned from the spot's heading, so the play camera (looking west
  over the garden) sees his flank, the curled neck and the tented wings instead of a head-on lump.

Counts:
- **Triangles:** the Dino-Fly went from 45,940 to 1,164.
- **Meshes:** from 4 to 3 (one skinned mesh and two eye meshes), with one material and 7 vertex colours.
- **At the garden** (5 m from him, `game.perf`, 30 frames, SwiftShader): 674 → 670 draw calls and 1.15 M → 1.06 M
  triangles per frame.

Differences that remain:
- **Smoothness:** the surfaces are smoother and rounder than the original's 323 facets.
- **Head:** a little boxier.
- **Pupils:** the eyes have a small dark pupil (the original's are plain yellow) so the gaze reads.
- **Reins:** not modelled.
- **Membrane:** one sheet between rigid bone segments, so the folded wing creases rather than bunching.
- **Motion:** the poses are authored numbers (the fold angles and the lying drop are the measured ones); no
  original animation curves are used.

Evidence:
- `docs/lba3-visual/evidence/CH-DF/dinofly-before-after-views.jpg`: front, ¾, side, top and the game camera for
  dozing, looking, stretching, the bind pose and grey.
- `dinofly-before-after-ingame.jpg`: the garden from the normal play camera, far, near, stretch and talk.
- Both are made by `dinofly-lookdev.html`, `lookdev-shot.mjs` and `ingame-shots.mjs` in that folder. No image of
  the original is in the repository.

## 14. Twinsen's hair as in LBA2 (VP-1b)

The user's decision: the hair "like the original game". After VP-1 Twinsen read as a bald egg head with a ball-cluster
topknot (REV-V-1).

Measured on the original (BODY.HQR body 1; study files outside the repository):
- **No hair polygons.** Every polygon of the head is skin. The hair is three spheres, which LBA2 draws as flat,
  unlit discs in one dark brown (palette 17 `#2b1b07` on the crown, 18–19 `#331f0b`–`#3b270f` on the tuft).
- **Where they are.** In the frame of our head sections (fractions of H, the top of the skull at 0.955):
  - The crown ball: centre y 0.951, z −0.052, r 0.049, on the head. It sits on the back of the skull's top and
    rises 0.045 above the crown.
  - The tuft: r 0.036 at (0.925, −0.103) on the first tail group, which turns about the crown ball's centre;
    then r 0.025 at (0.890, −0.118) on the second.
- **How it reads in play (#47, #38, #23).**
  - From the front: a dark dome over the crown.
  - From behind: a strip down the middle of the back of the head to 0.865 H, with skin at the sides and below.
  - From the side: a tuft that rises from the crown and arches back and down.
  - The forehead, the temples and the nape are skin.

What was wrong:
- The bun's numbers were in units of 1238 (the skull's top) but were placed on a head measured in units of 1296
  (the crown ball's top). The balls stood 0.044 H (9 cm) too high, so they read as a topknot on top of the head.
- They were also shaded like balls, with pale highlights.
- VP-1 lowered them by 0.011 H and added a cap of hair on the back of the skull, which the original doesn't have.

What changed (`tools/blender/twinsen_poly.py` → `assets/poly/twinsen.json`, `art/characters/twinsen/twinsen_poly.blend`):
- **One hair mass replaces the cap and the three balls.** Rings run from the front of the crown ball through the
  three measured centres to a round tip. Each ring is as wide as the balls are there, and 70 % of each waist between
  balls is filled. It stays within 0.006 H of the balls' union, so it reads as one tuft and not as a cluster.
- **Skinning.** The crown is on `head`. Along the tuft the weights pass to `tail0`, `tail1`, `tail2`. It is one
  connected surface, so the follow-through in rig.js bends it and cannot open a gap.
- **Flat colour, like the discs.** Every hair normal points down, so `LbaMaterial` gives one constant shade from
  every side. Two colours (`#553916` crown, `#6a4722` tuft) render as `#291700`–`#341e00` in play, against the
  original's `#2b1b07`–`#331f0b`.
- **The skull is skin again where the original shows skin.**
- **Unchanged:** the skeleton, the bone order, the bind positions, and every non-hair triangle (1,920 of them,
  compared one by one and in the same order). The eyes are unchanged too.

Counts:
- **Triangles:** 2,534 → 2,372. The hair went from 570 to 408.
- **Materials and colours:** one material. The vertex colours went from 9 to 10.

Evidence: `docs/lba3-visual/evidence/VP-1b/`, made by `hair-lookdev.html`, `lookdev-shot.mjs` and
`ingame-shots.mjs` in that folder.
- `vp1b-views-before-after.jpg`: front, ¾, side, back, top and the game camera, in idle, listen, walk, run and turn.
- `vp1b-sway-before-after.jpg`: the follow-through's extremes, and twice them.
- `vp1b-body-before-after.jpg`: the whole figure.
- `vp1b-ingame-heads.jpg` and `vp1b-ingame-frames.jpg`: the normal play camera. These show the house dialogue with
  Arthur, walking toward the camera in the house and outdoors, idle, running, and walking away.

Remaining:
- In a non-LBA material (lookdev `mat=grey`) the hair renders black, because of its down-facing normals.
- At the rig's extreme sway the tuft stretches as well as swinging: tail0..2 pivot 0.06–0.09 H above it.
- Zoé's bun (`cast_poly.py`, ZOE_BUN) uses one unit for her head and her balls, so it does not have this mix-up.
  Its shading (pale highlights) is unchanged.
- The `LOOKS.twinsen` comment in `characters.js` still says "no hair on the skull but a bun of three balls".

## 15. Zoé from LBA2's own model (SRC-1)

The user: the opening shows an "old" Zoé. The opening builds her with `createCharacter('zoe')`, our poly model from
`cast_poly.py build_zoe`. Next to the original, that model read as an old woman for three reasons:
- **Hair:** a pale cream bun (`#ecd79a`) with pale highlights read as white hair.
- **Face:** her head was Twinsen's head sections narrowed. It was featureless: tiny lips, small white-and-green eyes,
  no nose of her own. In the kitchen light it showed a chalky face.
- **Outfit:** a deep heart-shaped neckline, front and back, which LBA2's Zoé does not have.

The full inventory and the identification are in docs/lba3-team/SOURCE_INVENTORY.md. In short: BODY.HQR body 26 is
the object in scene 0 (Twinsen's house) whose script talks through `LM_MESSAGE_ZOE` in the engine's Zoé colour
(`COUL_ZOE` 4). That object speaks the game's first line.

### Measured on body 26

All values are fractions of H = 1238 units, the top of the skull. She is as tall as Twinsen (1239). Tool:
`tools/lba-source/measure.py` / `contours.py`.

- **Structure:** 23 groups, 177 points, 279 polygons (145 Gouraud, 128 dithered Gouraud, 4 flat, 2 solid), 3 spheres
  and 12 lines. No textures. The body's collision box is ±0.134 × 0.996 × ±0.134.
- **Head** (0.850–0.995, ±0.053):
  - It is carried forward. The nose tip is at (0, 0.898, +0.069) and the back of the head at −0.108.
  - The lips are a red crescent, corners up at (±0.037, 0.888), centre down to 0.860.
  - The eyes are small dark slants (byte 181) at ±0.016–0.037, 0.925–0.936, under brown lids (byte 30).
  - Brown also shades the nose's underside.
  - The earrings are blue line triangles at ±0.053, 0.882–0.909.
- **Neck:** ±0.021 at 0.807–0.85, with a blue line necklace to (0, 0.758, +0.037).
- **Outfit** (red, byte 64 dithered), front:
  - A shallow V: the point at (0, 0.726), its sides out to (±0.053, 0.753).
  - Straps up their inner edge to the shoulder top at (±0.086, 0.812). The strap covers the outer shoulder.
- **Outfit, back** (open, a halter):
  - A strap rises up the spine from ±0.043 at 0.618 to a point at 0.726.
  - There it forks into a band to each shoulder: lower edge (0, 0.726)–(±0.053, 0.779), upper edge (0, 0.779)–(±0.086, 0.812).
  - Skin shows either side of the spine strap, between the band and the dress line at 0.618.
- **Body:**
  - Shoulders ±0.107 at 0.716–0.740.
  - Bust ±0.103 at 0.692, front +0.078.
  - Waist ±0.072 at 0.620.
  - An A-line flare to ±0.134 at 0.428. Its front reaches +0.144 at 0.555; ours keeps the earlier softening, 0.110–0.131.
  - Red trousers with legs at ±0.065 (radius 0.066 → 0.039), the knee at 0.216.
  - Pointed green shoes (byte 128), z −0.054 … +0.107.
- **Arms:** bare (skin byte 32, the same as Twinsen's). The shoulder joint is at (±0.107, 0.779), the elbow at
  (±0.134, 0.602), the wrist at (±0.161, 0.484). The forearm narrows to a **pointed hand**, its tip at ±0.187,
  0.403–0.431. There is no ball.
- **Hair:** three spheres, which LBA2 draws as flat unlit discs, in **golden palette 106 `#e3af53`**. They are
  r 0.052 / 0.037 / 0.026 at (1.001, −0.135), (0.974, −0.188), (0.937, −0.204), each on its own bun group.

### What changed

The new script is `tools/blender/zoe_poly.py`, which writes `assets/poly/zoe.json` and
`art/characters/zoe/zoe_poly.blend`. The body is built on the same Zoé skeleton, unchanged, so every rig.js clip
drives it.

- **Her own head:** a loft of 14 measured half-contours (0.862–0.990), with the chin and crown capped.
  - Lips, lids and eyes are laid onto the face. The lids are flatter than the original's steep slant and stop at the eye
    instead of running to the bridge: in our light the slanted pair read as a frown (artistic change). Each is a small grid ray-cast onto the head, so it follows the curve
    and does not cut into it.
  - The lips have one even normal so the lower lip does not go near-black.
  - The face's lower half has its normals bent up a little, because our ramp runs to 12 % where the original's skin
    ramp stops at a mid brown.
  - Earrings are thin triangle frames.
- **Outfit:** one loft of the body's sections (32 × 31 rings). Each quad is cut along a skin/red boundary built from
  the landmarks above (`outfit_field`), giving a shallow V in front, straps carried over the shoulders' tops, and the open
  back with the spine strap and the forked band.
- **Necklace:** a thin tube laid on the skin.
- **Arms:** bare and thin, ending in a short flattened mitten with a round end, where the original's forearm narrows to a
  long point (about 0.14 m past the wrist). In the opening's close-ups a point read as a spike (artistic change).
- **Hair:** one golden mass through the three measured spheres, built like Twinsen's VP-1b tuft and skinned head →
  tail0..2. Its normals point straight up, so LbaMaterial gives one constant shade from every side, as the original's
  discs: `#e3af6b` on screen against the original's `#e3af53`.
- **Colours:** the original's ramps at shade ≈ 9, as for Twinsen: red `#b32b27`, shoes `#3f7b47`, lids `#8f634b`,
  eyes `#2f474b`, jewellery `#1b4b67`. The LOOKS entry's colours were updated to match, for the sculpt fallback.
- **Skin (an artistic change):** `#d9a679`, a little warmer than Twinsen's `#e2bc90`, although both originals use skin
  byte 32. In the opening's kitchen close-up our ramp's pale end turned her face and shoulders to chalk. That was one of
  the "old" cues.
- **Counts:** 2,908 → 4,436 triangles (4,432 skinned and 4 in the two eye meshes), and 5 → 6 vertex colours, still in one material.
- **Unchanged:**
  - the skeleton, the bone order and the look's proportions;
  - the trousers, the shoes' shape and the A-line sections (the measured values the earlier build used).
- **Not built:** the original's brown polygon under the nose. Our ramp already shades the nose's underside, and the
  extra brown read as a moustache.
- **Twelve years on:** no change. STORY_BIBLE names none for her look, so this is a faithful import with no costume or
  age adaptation.

Rollback: `git checkout c0264c8 -- lba2-remaster/assets/poly/zoe.json`. Alternatively,
`python tools/blender/cast_poly.py art/characters/skeletons.json assets/poly zoe` runs the earlier `build_zoe`. A
whole-cast `cast_poly.py` run now skips Zoé unless she is named, so it cannot overwrite this model.

### For the animator: her own clips (ANIM.HQR, File3D 15)

No clip is imported. rig.js drives her with the shared procedural set, as before. The notes below are for retargeting.
Angles are in degrees (alpha + = back, as in LBA2_MEASUREMENTS.md).

- **Walk (208).** Four keys of 300 ms make a **1.2 s cycle**. The root steps 189/133/189/133 units, so **0.52 H per
  cycle, 0.43 H/s**: a stroll at less than half Twinsen's 0.97 H/s.
  - Thighs swing ±21° (Twinsen −46/+25). The knee bends to 51° on the swing.
  - The pelvis sways through the torso: torso twist ±19°, with the head turned against it ±13–20°.
  - The head stays pitched down 14° throughout.
  - Her arms barely swing (−8/+14°), and the right forearm is held bent −23°.
  - Bob: +6/−20 units.
  - Retarget: give her walk its own keys (smaller stride, more twist), or at least scale WALK_KEYS' thigh amplitude
    to ~0.5 and raise twist. Playable Zoé moves at the hero's speed, so either the stride grows (foot sliding) or her
    walk speed should be lower. That decision belongs to the locomotion specialist.
- **Idle (207).** Six keys of 600 ms (3 s; loop from key 2).
  - The **left hand rests on her hip**: upper arm −20 / −37 / +4, forearm −54 with roll −27.
  - The right arm is bent loosely.
  - The legs are turned out ±20° (beta).
  - The torso and head nod (−3.5° and 13°) once per loop.
  - Ours idles with both arms down.
- **Talk.** There is no generic talk anim. Her scripted gestures are:
  - 211: talking with an arm raised and opened, 1.6 s;
  - 216: an arm out to the side, the head shaking, 4.2 s;
  - 214: pointing, held;
  - 210: walks in, then stands with both hands on her hips and shakes her head (1.6 s loop);
  - 218: both hands on hips, swaying, 7.2 s;
  - 219: arms up, 3 s;
  - 215: bent over, working with both hands, 4.7 s;
  - 209: hit, 0.5 s; 212/213: fall and land.
  - 217 is the walk with the left arm held, for the body that carries something (27).
- **Skeleton against the original:**
  - Our hips are at ±0.051 H (original ±0.081).
  - Our knee is at 0.251 (0.216).
  - Our shoulder is at 0.754 (0.779), our elbow at 0.590 (0.602).
  - Our hand bone is at 0.438, where the original's wrist is at 0.484, so our arm is ~0.03 H longer to the wrist.
  - Our head pivot is at 0.836 (0.823).
  - The bun bones tail0..2 sit 0.04–0.07 H above and behind the original's bun groups. The follow-through therefore
    swings the bun from a higher pivot.
  - None of this needs a rig.js change for the model to work. Her own clips would need these offsets.
- **Collision:** her NPC collider is the shared 0.45 m. The original's body box is ±0.134 H, about ±0.26 m.

### Evidence (docs/lba3-visual/evidence/SRC-1/)

The sheets show only our renders. The study images with the original beside ours are in the scratch space
(`$S/src1/cmp/`) and are not committed.

- `zoe-body-before-after.jpg`: front, ¾, side, back and the game camera, for the bind pose, idle, walk, run and talk.
- `zoe-head-before-after.jpg`: the head and face in idle and talk.
- `zoe-grey-before-after.jpg`: the shape only.
- `zoe-ingame-opening-{46,52,63,71}s.jpg`: the opening at four of her lines, the same frames before and after.
- `zoe-ingame-crops-before-after.jpg`: playable Zoé from the play camera (the body swap her playable parts use),
  walking in the house, then outdoors idle, walking, running and walking away.
- `zoe-ingame-play-walk.jpg`: the full play frame.
- Made by `char-lookdev.html`, `lookdev-shot.mjs`, `ingame-shots.mjs` and `make-sheets.py` in that folder.
