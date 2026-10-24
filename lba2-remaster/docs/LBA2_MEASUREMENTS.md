# Measurements of LBA2's characters and animations

Taken from the user's own copy of LBA2 (GOG): BODY.HQR and ANIM.HQR, read with a study script in the session's
scratch space (the formats come from the GPL engine source, github.com/2point21/lba2-classic:
LIB386/H/AFF_OBJ.INC, ANIM/ANIM.ASM, SYSTEM/HQFILE.CPP, LZ.ASM). **No original data is in this repository**:
only the numbers below, used to shape our own models and animations.

## Formats (for the record)
- HQR: a table of u32 offsets (count = first offset / 4); each entry: u32 size, u32 packed size, u16 method
  (0 stored, 1/2 LZ with minimum match 2/3: flag byte LSB first, 1 = literal, 0 = u16 `offset = (w >> 4) + 1`,
  `length = (w & 15) + min`).
- Body: 0x60-byte header (bounding box, then count/offset pairs for groups, points, normals, polygons, lines,
  spheres, textures). Groups (bones): parent group, pivot point, point count, normal count; a group's points are
  local to its pivot, which is a point of an earlier group. Rotation per group: `R = X(alpha) · Z(gamma) ·
  Y(beta)` (three.js order 'XZY'), 4096 = 360°, +Y up, +Z forward (the face); +X is the character's left.
- Anim: u16 frames, u16 groups, u16 loop frame, u16; each frame: u16 time to reach it (ms), s16 step x/y/z (root
  motion), then per group u16 type (0 rotate, 1 translate) and s16 alpha/beta/gamma. Keyframes are interpolated
  linearly. The palette of the 3D models is SCREEN.HQR entry 5 (polygon colour = low byte, a 16-shade ramp).

## Proportions (fractions of the height H to the top of the skull, bun not included; both are 1238 units)
| | Twinsen (body 1) | Zoé (body 26) |
|---|---|---|
| pelvis | 0.46 | 0.51 |
| shoulders (height / half-width) | 0.73 / 0.11 | 0.78 / 0.11 |
| neck | 0.82 | 0.82 |
| head | 0.18 of H, half-width 0.08 | 0.15 of H, half-width 0.05 |
| hands | big balls r 0.036 at 0.38 H, ±0.19 out | at 0.41 H, ±0.19 out |
| hair | no hair polygons: three spheres drawn as flat unlit discs, dark brown (palette 17 / 18 / 19). In units of 1238: centres (y, z) (0.995, −0.054) r 0.052 on the head, (0.968, −0.107) r 0.037 and (0.931, −0.124) r 0.026 on the two tail groups; in the frame of our head sections (H = 1296 to the top of the crown ball) (0.951, −0.052) r 0.049, (0.925, −0.103) r 0.036, (0.890, −0.118) r 0.025. The crown ball sits on the back of the skull's top (skull top 0.955) and rises 0.045 above it | the same three balls, blonde, higher |
| clothes | cape to 0.41 H, ±0.21 wide; the robe below the belt is carried by the legs (thigh panel to the knee, shin panel to the hem ±0.17) | red, fitted, deep V neckline, bare arms; the outfit's legs are separate to the green shoes |

## Shading
The polygons of both models are almost all Gouraud (Twinsen: 253 of 281, Zoé: 145 Gouraud + 128 dithered
Gouraud), not flat: the faceted look of a flat-shaded study render is not the original's. Our ramp shading with
smooth normals is kept.

## Zoé's sections (body 26, arms left out; y / half-width / front / back, fractions of H)
0.404 / 0.132 / 0.118 / −0.107 (the hips, where the legs meet) · 0.452 / 0.127 / 0.127 / −0.107 · 0.500 / 0.111 /
0.135 / −0.107 · 0.548 / 0.095 / 0.143 / −0.096 (the full front) · 0.596 / 0.075 / 0.121 / −0.087 · 0.644 / 0.071 /
0.065 / −0.086 (the waist) · 0.692 / 0.103 / 0.078 / −0.089 (the bust) · 0.716–0.740 / 0.107 (the shoulders) ·
0.788 / 0.094 / 0.008 / −0.081 · neck 0.836, half-width 0.021. Each trouser leg: centre ±0.065, radius 0.066 at
0.40 H → 0.052 at the knee (0.21) → 0.039 at the ankle. Shoes from −0.054 to +0.107 long, ±0.038 wide. Head
0.849–0.994 H, half-width 0.053, front +0.064, back −0.106. Bun balls r 0.052 / 0.037 / 0.026 at (1.0, −0.135),
(0.973, −0.188), (0.936, −0.204).

## The other races (for the cast's design language)
- Quetch townsfolk (bodies 101, 229, 430): head half-width 0.074–0.08 H; square shoulders, no puffed sleeves;
  plain cloth in a few flat colours; hands are balls (r ≈ 0.026 H) or small cones; buns of balls.
- Grobo (body 99, H = 0.94 of Twinsen's): the feet stubs 0–0.11 H at ±0.17; the body from 0.17 H, ±0.275 at the
  pelvis and ±0.23 at the chest (depth −0.22 … +0.29), up to 0.74 H; the head 0.6–0.92 H, ±0.19, sunk into the
  body with no neck; the trunk hangs in front of the belly down to 0.29 H; the ears flat, ±0.18 … ±0.52 H out,
  0.66–1.0 H high; short arms from 0.43 H with the hands at 0.2 H, ±0.4 out.
- Rabbibunny (body 117, H = 1.23 of Twinsen's): slim (torso ±0.09 H), long thin legs; a small head (±0.075 H)
  drawn out into a snout 0.1 H in front; ears up to H, 0.18 H long, in a V.

## Zeelich's peoples (for the races of our Zeelich)
- Esmer (bodies 80, 186; H = 1.01–1.02 of Twinsen's): one capsule from 0.19 H to the top, ±0.1 H round (the
  head is its top; the face about 0.82 H); trousers on its lower part; arms from ±0.13 at 0.75 H sloping out to
  ±0.26–0.3, the hands cones at 0.3–0.4 H; thin legs from 0.25 H, long boots (−0.07 … +0.13 H).
- Mosquibee (bodies 192, 196; H = Twinsen's): the abdomen an upright oval 0.29–0.71 H, ±0.11; the head forward
  of it at 0.72–0.86 H (to +0.21), great eyes at ±0.01–0.09, 0.81–0.90 H; a proboscis to +0.57 H; antennae to the
  top; two wings behind (0.54–0.76 H, back to −0.61 H); thin legs from 0.26 H.
- Mole (bodies 194, 323, 336, 342, 386; 327 a smaller one in a smock and apron; H = 0.94 of Twinsen's, 327:
  0.68): a robed pear of a body from 0.24 H, ±0.19, ±0.16 deep, rounded to the top at 0.92 H, no neck; the head
  is a long pale snout from the robe's top forward to +0.5 H (0.81–1.0 H high); pale arms hanging out to
  ±0.31–0.37 H, the hands at 0.39 H; pale legs, big feet forward to +0.23 H.
- Triangle-headed townsfolk (bodies 84, 430, 47, 393; H = 1.13 of Twinsen's): thin, shoulders ±0.13 H, waist ±0.06;
  the head 0.70–1.0 H, an inverted triangle (a pointed chin, ±0.108 at the cheekbones with the ears' points, a
  flat top ±0.079), the face forward to +0.14 H; thin arms with pointed hands; thin legs.

## Dogs (src/game/dogs.js)
- Zeelich's dog (bodies 51–53, one shape in three coats: grey with a pale green collar; grey with a brown jaw and
  legs and a dark green collar; brown with a darker jaw and legs): 0.45 H tall, 0.6 H long, 0.42 H wide (H = 1238
  units). A blob from the rump (z −345) to the mouth (z +235), widest (±240 units) at the collar (z −20…60, up to
  560 units high); the upper lip overhangs to z +340 with five fangs, the lower jaw two; the eyes white balls of
  r ≈ 50 at (±228, 420, 180) with the pupil outside; front legs straight at z ≈ 0, back legs bent at z ≈ −235…−320;
  a stub tail at z −400.
- The poodle (body 371): 0.65 H to the top of the bow, 0.64 H long; cream puffs on the chest and the hips, cream
  pompoms on the four feet (r ≈ 38, front z 164, back z −80) and on the tail (y 571), a pink bow (y 760).
- (Bodies 407–410 are a six-legged ball-nosed creature in four coats, not used.)

## Wizards
- Bersimon (body 111): a Rabbibunny 1.24 of Twinsen's height; a teal robe to the knee with a tan belt, a grey beard
  from under the snout, a tall pointed teal hat between the ears.
- A School of Magic master (body 123): the same height; a long blue robe with white cuffs and hem, a white beard,
  a blue pointed hat.
- Body 188 (used for Ker'aooc, a guess): 0.92 of Twinsen's height, 0.67 wide; a star-pointed blue body, a brown face,
  a long pointed white beard, a tall straight blue hat with a white pompom, thin arms with ball hands, curled shoes
  with brass bells.

## Animations of the hero (24-group set; Twinsen's robe body uses the first 19 groups)
- 0 idle: 8 keys × 300 ms (2.4 s): the whole body rocks forward and back (root ±50 units, pelvis ±6°), the arms
  follow it a little.
- 1 walk: start key, then 4 keys × 200 ms (cycle 0.8 s, 960 units = 0.78 H per cycle, 0.97 H/s).
  Per leg (degrees, + = back): contact −46 thigh / 18 knee / +12 foot; mid-stance −8 / 10 / 8; push-off +25 / 7 /
  −8; passing −20 / 52 / −7. Arms swing opposite (+10 back, −25 forward with the elbow at −22). Torso
  counter-twist ±14°, the head turns back the other way (keeps looking ahead). Bob ≈ 2 % of H: low at
  contact, high when passing. Torso leans +6° at each contact.
- Which animation plays for which action comes from the hero's File3D tables (RESS.HQR entry 44, one per
  behaviour; records: F_ANIM u16 generic anim, u8 size, s16 ANIM.HQR index, u8 has-actions, actions):
  normal walk 1, athletic run 67, aggressive walk 83, discreet walk 94; throw (LANCE) 6 in every behaviour;
  jump 71; punches 87–89; dodges 52–55 (78/79 athletic, 100/101 discreet); idle 0 / 66 / 82 / 93.
  Walk footsteps: F_RIGHT_STEP on key 2, F_LEFT_STEP on key 4.
- 67 athletic run: 4 start keys, then 6 keys × 140 ms (cycle 0.84 s, 1.94 H per cycle, 2.3 H/s). The pelvis
  tilts 11–36° forward and the legs with it: absolute thigh (+ = back) −62, −33, +23, +33, −12, −58; knee 8, 2,
  4, 47, 102, 90; arms relative to the torso +69 … −54 with the elbow bent 34–122°; torso twist ±20°; the body
  drops 56 units on landing.
- 6 throw (LANCE): 11 keys, 1.22 s, the ball leaves on key 6 at 0.56 s (F_THROW_MAGIC). Coil: torso turned away up
  to 57°, the throwing arm cocked high behind, the front knee lifted (thigh −94°, knee 104°); release: a lunge,
  pelvis 38–44° forward, the head up; a long crouched follow-through.
- 12 crouched sneak (pelvis 45°, knees up to 158°), 21 looking around, 26 a forward jump (720 ms).

## Citadel Island's layout
- An island (.ILE) is 16×16 sections of 32768 units (≈ 54.8 m); Citadel uses 4×4 (≈ 219 m across). Each section:
  a 65×65 height grid; heights reach 11750 units (≈ 19.6 m). The town lies low (≈ 0.4 m), a staircase of shelves
  (≈ 4, 8, 12 m) rises to the northern plateau (≈ 14 m), with a southern hill, a south-west islet joined by a sand
  bay, a dome islet to the west (≈ 12 m) and a small islet to the north-east.
- `src/game/citadel-layout.js`: the coast (h > 0.05 m) and our four terraces (original h > 2.5 / 6 / 9.5 / 12.5 m)
  as polygons simplified at 1.5 m. The original's town square sits at our (−42, −4); 270 decor objects (trees,
  palms, tulip beds, lamps, lanterns, benches, fences, bollards) are listed by kind for the props pass.

## Givers and bonuses (zone giver, the action hop)
- In Normal mode the action key plays the generic anim 11 (ACTION) = ANIM.HQR 17 in all four behaviours: 5 keys
  of 160/160/120/80/60 ms (0.58 s). Body height: 0, −134, +369, 0, −148 units (a crouch, a hop of 0.30 H, a
  squat on landing). Crouch: thighs −76/−49°, knees 91/68°, torso +35°; in the air: arms −93° (up and forward),
  one knee tucked to 141°; touchdown: arms out sideways 83–92°; squat: torso +44°, knees 84/81°.
- A giver is a scene zone of type 4 (Info0: the bonus kinds as flags 16 money, 32 life, 64 magic, 128 key,
  256 clover; Info1: how many; Info2: taken). Hopping inside it gives one bonus, once. The original has 483:
  almost all indoors (Twinsen's house has 6), about 9 on Citadel's exterior. Most allow money + life + magic.
- Which bonus: of the allowed kinds, the one most needed (WhichBonus): money = what the chapter needs ÷ kashes
  held, life = max ÷ life (max when life ≤ 20 %), magic = (level × 20) ÷ points; if nothing is short, a random
  one. A money bonus of n is a single coin worth n.
- The bonus leaves the zone's top at 70° elevation toward Twinsen ±13°, speed 40 units/tick at weight 15
  (≈ 3.15 m/s up, 1.13 m/s out, gravity ≈ 7.8 m/s²), stops where it lands, cannot be taken in flight, and goes
  after 20 s, blinking (8 ticks on, 8 off) for the last 3 s. A destroyed object pops its bonus straight up.

## Used in the game
- `src/engine/rig.js` WALK_KEYS: the walk above (Catmull-Rom through the key poses, stride 0.78 H per cycle).
- `tools/blender/twinsen_poly.py`: the robe below the belt follows the legs; ball hands r 0.036 H at ±0.19,
  0.378 H; the head at the measured size (HEAD_K 1.0; it was 1.24 before pass 8), the hair (VP-1b) one dark,
  flat-shaded mass over the three balls at the measured places (H = 1296 frame), the crown on the head, the tuft on tail0..2; the look's armSpread 0.3.
- `tools/blender/cast_poly.py` `build_zoe`: Zoé from the sections above (her H = 1.95 m to fit the game
  skeleton; the full front softened to 0.12 H). The rest of the cast: Grobo bodies and heads, Rabbibunny snouts,
  ball hands and plain cloth after the races above. `build_esmer` / `build_bee` / `build_mole` / `build_tri`: Zeelich's peoples as
  measured above (skeletons unchanged: the capsule and bodies hang over the thighs; the Esmers walk with the
  shorter robe stride).
- `src/engine/rig.js` RUN_KEYS: the athletic run (Twinsen's robe opens 75 % as far: one robe over both legs
  stretches flat past ~65°; Zoé's separate legs take the full stride). throwQuick / charge: posed after the
  throw's coil and release (our timing stays quick: a tap releases at 0.16 s; holding keeps the coiled pose).
- `src/engine/rig.js` ACTION_KEYS: the hop. `src/main.js` giverHop / whichBonus / giveBonus and
  `src/game/actors.js` Pickups (the arc, the timeout, the blink); givers sit by furniture in the interiors
  (RoomBuilder.giver) and at a few barrels and the stump outdoors. No kashes lie around outdoors any more.
