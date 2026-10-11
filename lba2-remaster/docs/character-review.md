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

