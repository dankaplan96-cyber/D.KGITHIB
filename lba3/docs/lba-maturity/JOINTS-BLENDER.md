# JOINTS-BLENDER (CLOUD_ORDERS 57, the user 20.11) — in progress, the desktop

## Twinsen
- **Traced:** `assets/poly/twinsen.json` (generator `tools/blender/twinsen_poly.py`, default flags; no fallback to the
  sculpt). Blender 5.3 on the desktop rebuilds it byte for byte (round trip checked, 82 s).
- **Diagnosis** (`captures/joints-blender/twinsen-poses-before.jpg`: poses set on the rig by hand, front/side/back; and
  the throw from the play camera and a close 3/4 view): the arm is inside the cape's side, which is his sleeve (WA-16,
  the user 01.11: LBA2's one closed shell that stretches into a wing when the arm rises). Raised or bent forward, that
  side lifts as a flat wing; the elbow is hidden in it; the robe crumples when crouching.
- **The user's decision (20.11):** keep LBA2's wing sleeve; fix the motion, and the elbow/shoulder only where it breaks;
  the real joint work goes to the characters whose arms and legs show (Zoé, Arthur, the Grobos).
- **The throw (rig.js `THROW`):** the wind-up loads the back leg (its knee bends to 0.18, the pelvis sets back to −0.07);
  a new key at 0.135 s between the loaded pose and the release lets the chest, the pelvis and the free arm lead while
  the throwing arm and its cocked elbow lag — the whip comes from the body into the hand. The release (0.16 s) and every
  later key unchanged, so the ball still leaves the hand on the same frame. Before/after (top/bottom; 0.10 load, 0.135
  lead, 0.16 release, 0.25 follow-through, 0.42 settle): `captures/joints-blender/twinsen-throw-before-after.jpg`.

## Next
Zoé (her arms and legs show: trousers, knees, sleeves), Arthur, a Grobo: shoulder, elbow, knee in Blender; then the
sword swing, the landing, walk-to-stop and pickup for the same joints.

## The user's answer (20.11): where the tubes are
Asked where they see the tubes most: **the arms (shoulder/elbow) and the connection points** (a ball at the shoulder, a
hand on the sleeve's end), **on everyone**: Twinsen, Zoé and Arthur, the Grobos and Rabbibunnies.

## The cast's arms, one shell (`tools/blender/cast_poly.py`, every model it builds: 70 of them)
- **Cause:** each arm was separate pieces: a shoulder ball, the upper sleeve (a tube on a blend), the forearm (a rigid
  tube on the elbow's bone starting at the joint), a cuff, a wrist and the ball hand. A bent elbow showed two tubes
  meeting at a corner; the shoulder ball read as a joint stuck on.
- **Now (`arm_sleeve`):** one sleeve from the shoulder to the wrist along the bones: a dome up into the body at the
  shoulder (no ball), the upper arm tapering to a slimmer elbow, three rings through the elbow with the weight passing
  from the upper arm's bone to the forearm's (u 0.8 → 1.2), the forearm swelling and widening to the cuff; 10 sides,
  rings framed by parallel transport (no twist round the bend). Rolled sleeves (Arthur, the workers): the shell to just
  past the elbow under the roll; the bare forearm shaped (a swell below the elbow, narrowing to a flatter wrist).
  `JOINTS_OLD=1` builds the two tubes as before (checked: byte-identical to the shipped models).
- **Numbers:** 70 models rebuilt (29 unchanged: no sleeves), triangles 201,375 → 206,875 (+2.7 %), none over +12 %;
  no new material, bone or mesh. In the game every one of the 189 NPCs loads its model (no fallback to the sculpt).
- **Pictures:** `arthur-shoulder-elbow-before-after.jpg` (left before, right after: the raised arm runs out of the
  shoulder without the ball's step), `grobo-brix-before-after.jpg`.
- `cast_poly.py` also takes its arguments after `--` now, so it runs inside Blender
  (`blender -b --python tools/blender/cast_poly.py -- art/characters/skeletons.json <out> [names]`).

## Zoé, Twinsen's wrist, Baldino (JOINTS-BLENDER 3)
- **Zoé's arms** are already one shell from the armhole to the wrist (CHAR-FORM's 17 sections, the elbow's weight spread
  over 0.42–0.6); in the poses (elbow, overhead, reach; front/side/back) the shoulder, elbow and armhole trim hold. The
  hand is its own piece on the hand's bone, but **the game never turns the hand's bone** (rig.js sets no `hand.rotation`;
  the bone follows the forearm), so the hand cannot part from the wrist in motion; nothing changed there.
- **Zoé's hip** (the sit, rig.js `slump`: the thighs to −1.4; the 1757 jump to −1.33): the trouser leg passed from the
  hips' bone to the thigh's 7 cm under the hip joint (FORM_HIP 0.48–0.395 H; the joint at 0.472 H), so in a sit the top of
  the leg lagged and the thigh bent a second time under the joint, a notch at the front of the hip under the top's hem.
  Now centred on the joint (0.505–0.44 H), and the top's hem lies on the thighs more in front (0.88) than behind (0.6;
  it was 0.65 all round). `captures/joints-blender/zoe-sit-before-after.jpg` (left before; top side, bottom front).
  Triangles 8,346 → 8,346; bones, eyes and mouths unchanged. `JOINTS_OLD=1` rebuilds the shipped model byte for byte.
- **Twinsen's cuff–wrist–fist:** the cuff, its hem and inside are on the forearm's bone, the fist on the hand's, which
  moves with the forearm (above): the join can't open in motion, and at rest the fist comes out of the flared cuff as in
  LBA2. Left as it is, with the wing sleeve (the user's decision).
- **Baldino** (`baldino_poly.py`, his own generator; the cast's change didn't reach him): the green sleeve was a tube with
  a ball on its top and the grey forearm a second tube from 3 cm inside it. Now as the cast's: one sleeve from a dome
  inside the shoulder through a rounded elbow (the weight passing over the bend), ending just past the elbow, and the
  forearm shaped from under it (a swell below the elbow, narrowing to LBA2's thin wrist). Triangles 6,173 → 6,277;
  bones, eyes, mouths and the trunk unchanged. `captures/joints-blender/baldino-arm-before-after.jpg` (elbow bent, then
  at rest; before, after). `JOINTS_OLD=1`: byte for byte as before.
- `zoe_poly.py` and `baldino_poly.py` take their arguments after `--` too (they failed inside Blender before).

## The cast's legs, one shell; the caps' weights (JOINTS-BLENDER 4)
- **Legs** (`cast_poly.py leg_shell`): a leg whose thigh and shin both show (a gown's leg panels; trousers under a hem
  above the knee) was the thigh's tube on a blend and the shin's rigid tube on the knee's bone, meeting at the joint
  (a seam ring at rest, a corner when bent). Now one shell from inside the hem through a slimmer, rounded knee (the
  weight passing from the hip's bone to the knee's over u 0.85–1.15) to a calf swell and the ankle inside the shoe; a
  shin alone under a long coat stays as it was. Arthur keeps his knee ball inside it (his kneel at the boat is 2.3 rad).
  23 models changed, the cast's triangles 212,027 → 215,787 (+1.8 %, none over +6.8 %).
  `captures/joints-blender/arthur-knee-before-after.jpg` (crouch, then sit; before, after).
- **A fix to JOINTS-BLENDER 2 and 3:** a shell's end cap has a middle point that no ring holds, and it took the first
  bone's weight; at the elbow's end of a rolled sleeve (Arthur, the workers) and of Baldino's sleeve, and at the ankle's
  end of the new legs, that point stayed behind when the joint bent — a spike (seen at the ankles in the first build of
  the legs). The caps' middle points now take the nearest ring's weight (`_cap_weights`).
- In the game: 189 of 189 NPCs load their model (skinned, no fallback to the sculpt); the two 404s in the console are
  there without these changes too. `JOINTS_OLD=1` still rebuilds the models as before JOINTS-BLENDER (checked: Arthur,
  Baldino byte for byte).

## The motions and the planted feet (JOINTS-BLENDER 5, rig.js)
Measured on the hero at 60 Hz on flat ground (Citadel's wooden quay by Gate 1, x 0, z 30), each sole's ankle against
the ground every frame (rest 0.100 m over it): how deep it goes and how far it slides while it stands
(`docs/lba3-performance/HARDWARE/2026-11-20-joints-motion/`: `motions.mjs`, `slides-before/after.json`).
| Motion | Before | After |
|---|---|---|
| sword combo (slash 1-2-3) | no sink, slide ≤ 0.6 cm | the same (not changed) |
| walk, stop, pickup | no sink, ≤ 0.7 cm | the same (not changed) |
| standing jump (Athletic) | no sink, 0 cm | the same |
| **Normal mode's hop** (Space, LBA2's anim 17) | **soles 6.2 cm into the ground, 17 frames; slid 31 cm** | 1.2 cm, 2 frames; ≤ 4.6 cm |
| **the run** (Athletic, 4.96 m/s) | **the standing foot slid forward at 0.72 m/s** (5-17 cm a contact) | 0.27 m/s (≤ 10.7 cm, in the run-up's acceleration) |
| landing a running jump | 2.4 cm sink, 17 cm slide | 1.4 cm, ≤ 10.7 cm |
- **The hop:** it was not in the planted actions (PLANT): its crouch and squat are LBA2's keys and pushed the feet through
  the ground with the plant let go. In PLANT now, as the jump's crouch: the feet stand where they are, the knees bend to
  reach them, and the pose's hop lifts them off and puts them down as before. The keys and the timing are unchanged.
- **The run:** a robe's run (Twinsen, `robeLegs`) swings the thighs × 0.75 so the robe isn't stretched flat, but its cycle
  stayed LBA2's 1.94 body heights, longer than the shorter stride: the foot under him moved back slower than he moved
  forward. The cycle is now 0.82 × that (`ROBE_RUN_CYC`, the best of 0.75–0.9 measured): 22 % more steps a second at
  the same speed. Speed, collision and the jump are unchanged; footsteps follow the cycle (more a second).
- **The sword, walk-to-stop and the pickup** already held their feet (ANIM-POLISH-2/3); with the new arms and legs the
  joints hold in them (`captures/joints-blender/`). Not changed.
- `tests/anim-polish.mjs` on this branch (turns, walking, stops, landings at 30/60/120 fps, melee timing, the sneak,
  stairs): **55 passed, 0 failed** (`animpolish-after.log`). Seen once and not from these changes (the walk's code is
  untouched): a walk's first three frames slid one foot 3.9 cm, by which foot the walk started on.
- `captures/joints-blender/hop-and-run-landing-before-after.jpg` (top before, bottom after: the hop's crouch, squat and
  stand; a running jump's landing).

## Zoé's reach toward the tap; Arthur's turn; a Grobo's trunk (JOINTS-BLENDER 6)
- **Zoé's reach** (rig.js `reach` / `tapTurn`, the opening's tap): every joint moved on one curve over 0.35 s, so the
  arm swung up straight from the shoulder like a lever. Now the gaze leads (0.2 s), the chest leans after it, the shoulder
  lifts the arm with the elbow folded in, and the forearm opens toward the tap last (from 0.13 s); the free hand eases
  back a little. The reaching hand's end pose is unchanged, reached 0.03 s later, so it meets the tap where it did.
  `captures/joints-blender/zoe-reach-before-after.jpg` (top before, bottom after; 0.04 / 0.10 / 0.16 / 0.22 / 0.30 /
  0.45 s, a side 3/4 view).
- **Arthur's quick turn toward a parent and a Grobo's trunk:** read in rig.js, not changed: a character turning where it
  stands already leads with the head, the chest following and the pelvis last (ANIM-POLISH-3, from its own turn rate),
  and Arthur's stride comes from his own skeleton's legs (the walk's stride is the leg's length × the swing). The Grobos'
  trunk (TRUNK-1) swings as one curve, each segment after the one above, ±22–27° at the tip, and is held from swinging
  back into the belly. Not filmed in motion here.

## Next
The battery half of the measurements (the user unplugs).

## Zoé's shoulder (JOINTS-BLENDER 7; the user, 21.11, playing: "Zoé's shoulder is strange")
- **Seen:** in play, close in a conversation, her shoulder read as a pad or a cuff set on the arm. In Blender (Workbench,
  the parts' colours, `captures/joints-blender/zoe-shoulder-before-after.jpg`): the armhole's green band (ZOE-LOOK-38)
  was a ring round the top of the arm, outside the dress, over the arm's top section, which stood out past the shoulder's
  line; raised (forward or out to the side), the arm's top was a flat disc beside the neck.
- **Fixed in `zoe_poly.py`:** the arm's top is a hemisphere over the joint, the upper arm's own 4.7 cm round, so the
  shoulder keeps its round shape at any angle; at rest it rounds off under the strap's edge. The band round the arm is
  gone: the dress's own green edge along the strap is the armhole's trim. Triangles 8,346 → 8,410; bones, eyes and
  mouths unchanged. `ZOE_SHOULDER_OLD=1` rebuilds the previous model byte for byte.
- Rows of the picture: before / after at rest, before / after with the arm raised forward (front 3/4, close, side).

## The cast after Twinsen and Zoé, in motion (JOINTS-BLENDER 8, CLOUD_ORDERS 66.1, 22.11)
Each one is made with the game's own `createCharacter` and stood on Citadel's open quay (x 0, z 30), its rig driven
through a walk (1.3 m/s), a run (3.8 m/s), the idle shrug, talk and (Arthur) the kneel at his boat; pictures from the
play camera's distance (8 m, 4.6 m up) and at dialogue distance (2.1 m, front 3/4 and side). The script:
`docs/lba3-performance/HARDWARE/2026-11-20-joints-motion/castmotion.mjs`. Before and after are the same frames.

### Arthur (`cast_poly.py`, ARTHUR-LOOK)
- **Seen:** the shoulder (the sleeve from a round shoulder) and the elbow (the rolled sleeve over the shaped forearm)
  hold in every motion. Two faults at the legs: **a ball at the knee** — his knee ball (ARTHUR-12, for the kneel) is
  r2 × 1.1 inside a one-shell leg whose knee is r2 × 1.08, so a bump stood out at the front of every bent knee, walking
  and running; and **the thigh through the tunic** — the skirt's front follows the forward leg on a spring and only by
  its share over each thigh, so in the run and in the kneel the top of the thigh came through the cloth just above the
  hem as a pale patch.
- **Fixed:** the knee ball is r2 × 1.0, just inside the shell (unseen in motion, still filling the knee in the kneel);
  toward the hem half of his tunic rides the thigh on its side (`coatLegs` 0.5, as the guards' coats, CHAR-OPEN; 0.35
  still showed the patch in the kneel). A speck of the thigh's top is still visible in the kneel from the side.
- Triangles 4,274 → 4,274; bones, eyes, mouths and materials unchanged. `JOINTS8_OLD=1` rebuilds the shipped model
  byte for byte (checked).
- `captures/joints-blender/arthur-motion-before-after.jpg` (pairs, before left: walk ×2, run ×2, the shrug, talk, the
  run and the kneel from the side), `arthur-play-before-after.jpg` (the play camera: walk, run, shrug, talk).
