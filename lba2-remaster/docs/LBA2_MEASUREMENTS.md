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
| hair | three balls behind the crown (r 0.05 / 0.037 / 0.026) | the same three balls, blonde, higher |
| clothes | cape to 0.41 H, ±0.21 wide; the robe below the belt is carried by the legs (thigh panel to the knee, shin panel to the hem ±0.17) | red, fitted, deep V neckline, bare arms; the outfit's legs are separate to the green shoes |

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
- `tools/blender/twinsen_poly.py`: the robe below the belt follows the legs; hands r ≈ 0.032 H at ±0.19;
  a lower, larger head (HEAD_K 1.24, no neck lift); the look's armSpread 0.3.
- `tools/blender/cast_poly.py` outfit `gown` + `bun` with three balls: Zoé as above.
- `src/engine/rig.js` RUN_KEYS: the athletic run (Twinsen's robe opens 75 % as far: one robe over both legs
  stretches flat past ~65°; Zoé's separate legs take the full stride). throwQuick / charge: posed after the
  throw's coil and release (our timing stays quick: a tap releases at 0.16 s; holding keeps the coiled pose).
- `src/engine/rig.js` ACTION_KEYS: the hop. `src/main.js` giverHop / whichBonus / giveBonus and
  `src/game/actors.js` Pickups (the arc, the timeout, the blink); givers sit by furniture in the interiors
  (RoomBuilder.giver) and at a few barrels and the stump outdoors. No kashes lie around outdoors any more.
