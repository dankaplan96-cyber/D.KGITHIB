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
- 3 / 4 turn in place (880 ms), 8 / 9 walk backwards (≈0.8 H/s), 12 crouched sneak (pelvis 45°, knees up to
  158°), 23 overhead two-arm swing (900 ms), 21 looking around (1.2 s), 26 forward jump (4 keys, 720 ms).
- Fast loops (candidates for the athletic run, to confirm with FILE3D.HQR): 67 (10 keys, cycle 0.84 s, 2.4 H/s,
  strong forward lean, arms pumping) and 1826/1827 (0.42 s, 2.31 H/s).

## Used in the game
- `src/engine/rig.js` WALK_KEYS: the walk above (Catmull-Rom through the key poses, stride 0.78 H per cycle).
- `tools/blender/twinsen_poly.py`: the robe below the belt follows the legs; hands r ≈ 0.032 H at ±0.19;
  a lower, larger head (HEAD_K 1.24, no neck lift); the look's armSpread 0.3.
- `tools/blender/cast_poly.py` outfit `gown` + `bun` with three balls: Zoé as above.
