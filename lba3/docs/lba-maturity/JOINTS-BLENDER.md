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

## Next
The knees and the legs' joints on the cast; then the sword swing, the landing, walk-to-stop and the pickup with the same
joints, planted feet; the full test at the end, and the frame time last (the user: measurements at the end).
