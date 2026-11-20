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
