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
