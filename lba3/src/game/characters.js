// Character designs, sculpted from signed-distance shapes (engine/sculpt.js).
//
// Reference: LBA2 character art supplied by the user (Twinsen in his wide
// bell-shaped blue tunic with Sendell's medallion; the LBA2 cast line-up;
// a Citadel Island street). From those we keep: small oval Quetch heads on
// long thin necks, big ball noses and big round eyes, a high hooked
// ponytail, broad kimono sleeves, round shoes, and strongly varied
// silhouettes between races. Bodies are one skinned surface; hands with
// separate fingers and shoes are finer rigid sculpts attached to bones.
import * as THREE from 'three';
import { buildSculpted, sculptRigid, makeSDF, assemble } from '../engine/sculpt.js';
import { Rig } from '../engine/rig.js';

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// TRUNK-1: a Grobo's trunk curve [(y, z, r)] in its skeleton's units (root in the muzzle, the three trunk bones' pivots,
// the tip's two points): the same numbers as tools/blender/cast_poly.py grobo_trunk(), which builds the mesh on it.
// Change both together and re-dump the skeleton (art/characters/skeletons.json) before rebuilding the models.
export function groboTrunk(headY, hipsY, shY, neckY, kneeY, belly, slim = 1) {
  const R = 0.3 * slim, cy = headY - 0.02, cz = 0.1, GAP = 0.085;
  const F = [[kneeY + 0.02, 0.2], [kneeY + 0.1, 0.34], [hipsY - 0.12, 0.44], [hipsY + 0.05, 0.48], [hipsY + 0.3, 0.45], [shY - 0.08, 0.38], [shY + 0.06, 0.29], [neckY + 0.04, 0.18]];
  const front = (y) => {
    if (y <= F[0][0]) return F[0][1] + belly;
    for (let i = 0; i + 1 < F.length; i++) if (y <= F[i + 1][0]) return F[i][1] + (F[i + 1][1] - F[i][1]) * (y - F[i][0]) / (F[i + 1][0] - F[i][0]) + belly;
    return F[F.length - 1][1] + belly;
  };
  const rad = [0.125, 0.112, 0.096, 0.083, 0.074, 0.064].map((r) => r * slim);
  const y1 = cy - 1.2 * R, yT = hipsY - 0.03, y2 = y1 + (yT - y1) * 0.55;
  const p0 = [cy - 0.25 * R, cz + 0.8 * R + belly * 0.4], p1 = [cy - 0.5 * R, cz + 1.32 * R + belly * 0.9];   // (a belly pushes the chest out under the chin: the trunk leaves the face over it)
  const p2 = [y1, Math.max(front(y1) + rad[2] + GAP, p1[1] + 0.05)];
  const p3 = [y2, Math.max(front(y2) + rad[3] + GAP, p2[1])];
  const p4 = [yT + 0.07, Math.max(front(yT + 0.07) + rad[4] + GAP, p3[1] - 0.02)];
  const p5 = [yT - 0.01, p4[1] + 0.05];
  return [p0, p1, p2, p3, p4, p5].map(([y, z], i) => [+y.toFixed(4), +z.toFixed(4), +rad[i].toFixed(4)]);
}

// ------------------------------------------------------------------ cast
export const LOOKS = {
  twinsen: {
    // LBA2's in-game Twinsen, measured on the original model (docs/character-review.md §11–12): cape-like robe
    // with flat shoulders and broad sleeves, thin orange belt, a nearly straight robe to the ankles, small
    // orange shoes, ball hands; a narrow egg head at the original's size on a long thin neck, small pale eyes,
    // no hair on the skull: a dark crown knot and a tuft arching back (LBA2 draws them as three flat unlit spheres; ours is one constant-shade mass, VP-1b);
    // the bare skull round the knot IS LBA2's look, also from behind (G1-ART's hair over the crown was reverted, the user 29.10:
    // "not like LBA2"); a pale gold medallion. Colours from its palette.
    poly: 'twinsen', // the low-poly model (tools/blender/twinsen_poly.py); the sculpt below is the fallback
    race: 'quetch', outfit: 'lba', hem: 0.1, hemW: 0.92, skirtDepth: 0.8, neckR: 0.05, shoulders: 0.95, armLen: 1.12, armSpread: 0.3, // (LBA2: the hands hang clear of the robe, ±0.18 H)
    tunic: '#2a86ad', tunicTrim: '#2a86ad', belt: '#d36b4b', pants: '#2a86ad', shoes: '#d36b4b', slippers: true, cord: '#f7bb57', handBall: 0.075,
    hair: '#634327', skin: '#e2bc90', hairStyle: 'bun', hairFront: 0.62, hairBack: 0.3, noEars: true, skull: 'egg', skullY: 0.96, skullW: 1.04, jaw: 0.9, chin: 0.9, cheeks: 0.3,
    eyeScale: 0.82, eyeOval: 0.5, eyeGap: 1.12, eyeUp: 0.03, eyes: '#1b4b67', eyeWhite: '#c8c0d4', noLid: true, noBrow: true, nose: 'ball', noseS: 0.72,
    mouth: 'line', medallion: true, medalR: 0.085, medalY: 0.24, medalSides: 8, headS: 1.4, neck: 0.17,
  },
  zoe: {
    // LBA2's Zoé (BODY.HQR body 26, identified and measured in the user's own files; SRC-1, tools/blender/zoe_poly.py,
    // docs/character-review.md §15): as tall as Twinsen, narrow shoulders and a slim waist over an A-line flare, a red
    // halter top with a shallow V in front and an open back (a strap up the spine forking to the shoulders), red
    // trousers, long pointed green shoes, bare arms ending in pointed hands; her own narrow head carried forward with
    // a pointed nose, wide red lips, small dark slanted eyes, blue earrings and necklace; golden hair in a bun of three
    // balls, drawn flat as LBA2 draws its spheres. Colours: the original's palette ramps (skin 32, red 64, shoes 128,
    // hair 106). Twelve years on: she is no longer expecting (LBA2's Zoé is pregnant; Arthur is their son): SRC-2 took the
    // belly out and gave her a natural waist (tools/blender/zoe_poly.py ZOE_BODY; the measured figure is ZOE_BODY_LBA2).
    // ZOE-OPEN (CHAR-2): her head from designed sections at the measured size (brow, cheekbones, a rounded chin, a nose
    // of its own), a smaller smiling mouth, white almond eyes with iris and pupil under lid lines and brows, teardrop
    // hoops for the triangle earrings, and curled mitten hands with a thumb (docs/character-review.md §18).
    // ZOE-LOOK-38 (the user, 9.11, a candidate): bigger lidded eyes with lashes, a smaller nose, fuller lips; her hair
    // swept up into a tall ponytail in a green band (on the skeleton's tail bones), its tip curled; green trims at the
    // top's neck and armholes, a black belt with a square silver buckle (belt: its baked hex), a green cord with a round
    // dark pendant, green bangles, gold hoops. The sculpt below is the fallback.
    race: 'quetch', outfit: 'gown', hem: 0.06, tunic: '#b32b27', tunicTrim: '#8b1712', belt: '#2a2426', pants: '#b32b27', shoes: '#3f7b47',
    hair: '#e3af53', skin: '#d9a679', hairStyle: 'bun', nose: 'button', eyes: '#2f474b', lashes: true, headS: 1.15, neck: 0.07, height: 1.0,
    // CHAR-OPEN (OPEN-3 #28): her arms hang at her sides (0.08 rad out from the skeleton's rest; 0.3 held the hands
    // 0.45 m out, the "rods standing off her sides"); the opening's pose layer was brought in by the same 0.22
    armSpread: 0.08, armLen: 1.1,
  },
  arthur: {
    // ARTHUR-12 (WORKLIST #30): Arthur is twelve (born at the end of LBA2). A preteen, not the small-child template:
    // about 0.83 of his father's height (to Zoé's eyes), long legs and arms, a head near an adult's size on a longer
    // body, a narrower egg-shaped face like his father's (the same head sections, tools/blender/cast_poly.py), lid
    // lines like his father's and thin brows. An older cut: a shorter tunic in his father's blue over long trousers,
    // sleeves rolled to the elbow (he works on his boats), a tool pouch on the orange belt, the forelock swept back
    // with a little tuft at the crown that answers his father's knot. Palette: tunic #2a66d9, trousers #f2ead6,
    // hair #6a3a1a.
    race: 'quetch', teen: true, outfit: 'tunic', hem: 0.46, tunic: '#2a66d9', tunicTrim: '#1d4c9e', belt: '#f07a28', pants: '#f2ead6', shoes: '#d9653a',
    hair: '#6a3a1a', skin: '#f2c49a', hairStyle: 'tuft', tuftSwept: true, hairCuts: [0.0, 0.035, 0.072, 0.092, 0.11], nose: 'ball', noseS: 0.85, eyes: '#2a4a8a', eyeScale: 1.06, lids: true, brows: true,
    skull: 'egg', skullY: 1.05, skullW: 0.93, headS: 0.92, neck: 0.1, handS: 0.9, rolled: true, pouch: '#8a5a2a', hemW: 0.84, legLen: 0.82, height: 1,
  },
  gilbert: {
    race: 'quetch', outfit: 'tunic', hem: 0.62, belly: 0.1, stoop: 0.1, tunic: '#b8483b', tunicTrim: '#7a2a20', belt: '#3a2a1a', pants: '#4a5a6a', shoes: '#3a2a1a',
    hair: '#cfcfcf', skin: '#e6b993', hairStyle: 'bald', nose: 'long', eyes: '#4a3a2a', moustache: true, headS: 1.0, neck: 0.08, height: 0.95,
  },
  tim: {
    race: 'quetch', kid: true, outfit: 'tunic', hem: 0.66, tunic: '#e0b03a', tunicTrim: '#a07a20', belt: '#5a3a20', pants: '#3a5a9a', shoes: '#5a3a20',
    hair: '#c06a2a', skin: '#f2c49a', hairStyle: 'tail', nose: 'button', eyes: '#3a2a1a', height: 0.64, neck: 0.08,
  },
  lulu: {
    race: 'quetch', kid: true, slim: true, outfit: 'dress', hem: 0.36, tunic: '#e05a9a', tunicTrim: '#a03a6a', belt: '#ffffff', pants: '#e05a9a', shoes: '#5a2a3a',
    hair: '#2a1a10', skin: '#e8b88a', hairStyle: 'pigtails', nose: 'button', eyes: '#2a1a10', lashes: true, height: 0.6, neck: 0.08,
  },
  mira: {
    race: 'bunny', outfit: 'tunic', hem: 0.45, slim: true, fur: '#f4ece0', furDark: '#d8c8b0', tunic: '#3b5bb8', tunicTrim: '#24397a', belt: '#24397a', pants: '#3b5bb8', shoes: '#f4ece0',
    eyes: '#3a2a1a', glasses: true, height: 0.92,
  },
  pippa: {
    race: 'bunny', outfit: 'tunic', hem: 0.5, belly: 0.11, fur: '#f8f0e4', furDark: '#e0c8a8', tunic: '#e58a3a', tunicTrim: '#a85a20', belt: '#6a3a1a', pants: '#6a4a8a', shoes: '#f8f0e4',
    eyes: '#5a3a1a', apron: '#ffffff', height: 0.86,
  },
  doran: {
    race: 'grobo', outfit: 'tunic', hem: 0.62, skin: '#8fa3be', tunic: '#2f6fb0', tunicTrim: '#1f4a7a', belt: '#4a3a2a', pants: '#3a4a6a', shoes: '#8fa3be',
    eyes: '#2a2a2a', hat: '#d8b94a', height: 1.05,
  },
  vesk: {
    // the villain (tools/blender/cast_poly.py build_vesk): the project's chief engineer, tall and stooped, in a
    // near-black greatcoat to the floor with a tall stiff collar behind his head, brass pauldrons, the project's
    // violet emblem on his chest; a narrow grey-violet egg of a head, a swept crest, a violet monocle, a brass gauntlet
    race: 'quetch', outfit: 'tunic', hem: 0.24, slim: true, stoop: 0.06, skull: 'egg', skullY: 1.22, crest: '#5a4a8a', skin: '#a99cc6',
    tunic: '#1f5a62', tunicTrim: '#2f7a84', belt: '#3a2a20', buckle: '#d8b04a', pants: '#2a2a34', shoes: '#2a2026', collar: true, buttons: true, brace: true, goggles: true,
    hairStyle: 'bald', hair: '#5a4a8a', nose: 'long', eyes: '#e0a020', eyeScale: 0.75, mouth: 'smile', brow: 1.1, headS: 0.95, neck: 0.12, height: 1.12, longCoat: true,
  },
  worker: {
    // project worker: stocky, teal overalls with a tool belt, yellow hard hat
    race: 'quetch', outfit: 'tunic', hem: 0.6, belly: 0.05, tunic: '#2f8a8a', tunicTrim: '#1f5a5a', belt: '#5a3a1a', pants: '#2f6a6a', shoes: '#3a2a1a',
    hair: '#3a2a1a', skin: '#e8b88a', hairStyle: 'bald', nose: 'ball', eyes: '#3a2a1a', mouth: 'smile', hardhat: '#e8c030', headS: 0.95, neck: 0.07, height: 0.97,
  },
  worker_b: {
    // CAST-POLISH-UNDERGROUND (order 24, worker's shape variant): the project's maintenance hand, a heavier man in the same
    // teal crew overalls, bare-headed with short dark hair, a moustache, brass goggles pushed up on his brow and the sleeves
    // rolled (cast_poly.py CAST worker_b). Taken by Tolli (dp_tolli, the deep installation), Surveyor Anko (dg_surv, the dig)
    // and Fennick (zr_fennick, Zeelich); the yard's worker, Teo (dg_porter), Kasp (dg_dig) and Brann keep worker (the hard hat)
    race: 'quetch', outfit: 'tunic', hem: 0.6, belly: 0.1, tunic: '#2f8a8a', tunicTrim: '#1f5a5a', belt: '#5a3a1a', pants: '#2f6a6a', shoes: '#3a2a1a',
    hair: '#3a2a1a', skin: '#e8b88a', hairStyle: 'cap', nose: 'ball', eyes: '#3a2a1a', mouth: 'smile', moustache: true, goggles: true, headS: 0.95, neck: 0.07, height: 0.97,
  },
  guard: {
    // project security: broad Grobo in a teal-and-brass uniform, rounded helmet with a visor
    race: 'grobo', outfit: 'tunic', hem: 0.58, skin: '#9aa8b8', tunic: '#245a6a', tunicTrim: '#c8a050', belt: '#2a2a2a', buckle: '#d8b04a', pants: '#203a48', shoes: '#2a2a2a',
    eyes: '#2a2a2a', helmet: '#2f7a84', buttons: true, height: 1.05,
  },
  baldino: {
    // LBA2's Baldino, an old Grobo inventor (BODY.HQR body 139, File3D 93; identified and measured in the user's own
    // files: SRC-2, tools/blender/baldino_poly.py, docs/character-review.md §16): short and broad, 1.78 m to the top of
    // a big grey-violet head carried low on the shoulders, a trunk that curls out and down to the belt, great flat
    // triangular ears that swing as he talks and walks, goggles with blue lenses worn over the eyes, a white stand-up
    // collar, a pear-shaped olive-green smock open at the chest, brown trousers on short square legs set wide apart,
    // thin arms (green sleeves, grey forearms) ending in round grey hands, a small tail. Colours: the original's ramps
    // (grey 13, green 7, brown 1, goggles 10/12). Twelve years on: no change of look (STORY_BIBLE names none). The
    // skeleton is his own (the original's joints: legs ±0.32 m, knee 0.22, shoulder 0.97, head pivot 1.40 m), with an
    // ear bone each side and three trunk bones that rig.js swings; the sculpt below is the fallback.
    race: 'grobo', outfit: 'tunic', hem: 0.56, skin: '#7f7787', tunic: '#67734b', tunicTrim: '#67734b', belt: '#6b472b', pants: '#6b472b', shoes: '#6b472b',
    eyes: '#abffff', goggles: true, collar: true, collarColor: '#bbbbb7', height: 1,
    legLen: 0.485, legX: 0.32, torsoLen: 0.98, shoulders: 0.985, shZ: 0.1, armLen: 1.115, armSpread: 0.3, neck: 0.345, stoop: 0.118, headS: 1.105,
    earBones: [0.357, 1.619, 0.106], trunkBones: [[0, 1.404, 0.646], [0, 0.973, 0.971], [0, 0.756, 0.971]],
    radius: 0.6, walkCycle: 1.3, idlePeriod: 1.6, talkStyle: 'baldino',   // (radius: his soft contact, the shared 0.45 m → 0.6 m)
  },
  nara: {
    // Esmer stall-keeper on the Zeelich street: tall and slim, a coral robe with a gold trim
    race: 'esmer', outfit: 'robe', hem: 0.08, slim: true, skin: '#f2a582', ridge: '#4a8a72', tunic: '#e0704a', tunicTrim: '#f2c45a', belt: '#f2c45a', pants: '#7a3a2a', shoes: '#3a2a20',
    eyes: '#e8a040', height: 1.06,
  },
  nara_c: {
    // CAST-VARIANTS-2 (nara's second shape variant: nara still dressed 9 people after nara_b): an Esmer woman at work on the
    // isles, broader, a wrapped headcloth and a belt over the short robe (cast_poly.py CAST nara_c). Taken by Knartas's
    // net-mender (kn_nets), the orchard's picker (or_pick1) and the sketcher (ow_sketch); Nara, Neska (sefa), Ulla, the
    // dancer, Lissa and Liwa keep nara
    race: 'esmer', outfit: 'robe', hem: 0.08, skin: '#f2a582', ridge: '#4a8a72', tunic: '#e0704a', tunicTrim: '#f2c45a', belt: '#f2c45a', pants: '#7a3a2a', shoes: '#3a2a20',
    eyes: '#e8a040', hat: '#f2c45a', height: 1.04,
  },
  nara_b: {
    // CAST-POLISH-UNDERGROUND (order 24, nara's shape variant: nara dresses more people than any other look): an Esmer woman
    // in a long dress flared to the boots with a belt at the waist, in place of the short robe over trousers (cast_poly.py
    // CAST nara_b; LBA2's Esmers share one body and differ by dress). Taken by Sala (dp_sala, the core), Wenna (zh_wenna),
    // Mila of Knartas (kn_mother; il_mila at home takes hers) and Sister Ione (il_ione); Nara, Neska (sefa) and the rest keep nara
    race: 'esmer', outfit: 'robe', hem: 0.06, slim: true, skin: '#eaa07e', ridge: '#4a7a8a', tunic: '#3a6a9a', tunicTrim: '#e8d8a8', belt: '#5a3a2a', buckle: '#e8c870', pants: '#2a3a5a', shoes: '#2a2420',
    eyes: '#d89a40', height: 1.04,
  },
  oku: {
    // an old Esmer who remembers the Zeelich of before: stooped, a deep-teal robe, a white sash
    race: 'esmer', outfit: 'robe', hem: 0.06, stoop: 0.14, belly: 0.05, skin: '#e0957a', ridge: '#3a6a5a', tunic: '#2a6a72', tunicTrim: '#e8e0d0', belt: '#e8e0d0', pants: '#1a3a40', shoes: '#2a2020',
    eyes: '#d8c060', hat: '#e8d8b0', height: 0.94,
  },
  oku_b: {
    // CAST-POLISH-ZEELICH-2 (order 24, oku's shape variant): a working Esmer, upright, in a long robe flared to the boots and
    // a wrapped headcloth (cast_poly.py CAST oku_b). Taken by Pask, Ennu and the hostel's fourth worker; Oku and Old Ossa keep oku
    race: 'esmer', outfit: 'robe', hem: 0.06, belly: 0.05, skin: '#e0957a', ridge: '#3a6a5a', tunic: '#2a6a72', tunicTrim: '#e8e0d0', belt: '#e8e0d0', pants: '#1a3a40', shoes: '#2a2020',
    eyes: '#d8c060', hat: '#e8d8b0', height: 0.97,
  },
  xil: {
    race: 'esmer', outfit: 'robe', hem: 0.08, slim: true, skin: '#f0b08a', ridge: '#3e7a62', tunic: '#5a3a8a', tunicTrim: '#c8a0ff', belt: '#c8a0ff', pants: '#3a2a5a', shoes: '#2a2040',
    eyes: '#e8c040', height: 1.1,
  },
  // ---- Zeelich's street life, after LBA2's races there (tools/blender/cast_poly.py build_bee / build_mole)
  zbee1: {
    // a Mosquibee porter: a gold abdomen with brown bands, green eyes
    race: 'bee', outfit: 'tunic', tunic: '#e0a83a', tunicTrim: '#5a3a1a', skin: '#5a4a4a', eyes: '#3a9a4a', wing: '#8ac8b0', height: 1.0,
  },
  zbee1_b: {
    // CAST-VARIANTS-2 (zbee1's shape variant): a heavier Mosquibee porter, a fuller abdomen, a satchel on a strap across it
    // (cast_poly.py build_bee `pouch`). Taken by the first tender (mb_tend1) and the second loader (ld_load2); the other
    // tender, the flier and Zuzz keep zbee1
    race: 'bee', outfit: 'tunic', tunic: '#e0a83a', tunicTrim: '#5a3a1a', skin: '#5a4a4a', eyes: '#3a9a4a', wing: '#8ac8b0', belly: 0.1, pouch: '#8a5a2a', height: 1.0,
  },
  zbee2: {
    // a Mosquibee matron: a red abdomen, plain, a little gold crown
    race: 'bee', outfit: 'tunic', tunic: '#c83a2a', tunicTrim: '#c83a2a', stripes: false, skin: '#3a5a7a', eyes: '#c83030', wing: '#e08a6a', crown: '#f2c45a', belly: 0.06, height: 1.0,
  },
  zbee2_b: {
    // CAST-VARIANTS-2 (zbee2's shape variant): a working Mosquibee in the matron's red, without her crown, slimmer, a satchel
    // on a strap (cast_poly.py build_bee `pouch`). Taken by the orchard's carter (or_carter) and the lantern-lighter
    // (ce_lanterns); Bzzra, Zett and Otringal's guest keep zbee2
    race: 'bee', outfit: 'tunic', tunic: '#c83a2a', tunicTrim: '#c83a2a', stripes: false, skin: '#3a5a7a', eyes: '#c83030', wing: '#e08a6a', pouch: '#7a4a2a', height: 1.0,
  },
  ztri1: {
    // a triangle-headed Zeelichian clerk: a green suit, a red tie, a flat blond top
    race: 'tri', outfit: 'tunic', slim: true, skin: '#c8906a', tunic: '#2f6a3a', pants: '#9a7a3a', shoes: '#4a8a5a', hair: '#e8d098', tie: '#c83a2a', eyes: '#3a2a1a', height: 1.1,
  },
  ztri2: {
    // a triangle-headed Zeelichian in shirtsleeves: a cream shirt, blue trousers, a dark flat top
    race: 'tri', outfit: 'tunic', slim: true, skin: '#b8805e', tunic: '#ece0b8', pants: '#2a7aa8', shoes: '#2a7aa8', hair: '#5a3a2a', eyes: '#3a2a1a', height: 1.08,
  },
  zmole1: {
    // one of Zeelich's moles: a dark grey-violet robe, the long pale snout, pale arms and big feet
    race: 'mole', outfit: 'robe', tunic: '#5a5068', skin: '#e8e0d8', lip: '#f0c060', eyes: '#2a1a1a', height: 0.95,
  },
  zmole1_b: {
    // CAST-POLISH-ISLES (order 24, zmole1's shape variant): a Wannie at work, the miners' and fitters' dress: a miner's cap
    // with a lamp and a peak, a leather apron with a bib over the robe (cast_poly.py CAST zmole1_b). Taken by Burr and Delve
    // (pf_miner1, pf_miner2) and Dunt (ug_fitter); Old Grumm, the foremen, the chaplain and the hostel's third worker keep zmole1
    race: 'mole', outfit: 'robe', tunic: '#5a5068', apron: '#7a5a3a', hat: '#d8a838', skin: '#e8e0d8', lip: '#f0c060', eyes: '#2a1a1a', height: 0.95,
  },
  zmole2: {
    // a smaller mole in a white smock with a red apron (the original's homemaker)
    race: 'mole', outfit: 'robe', tunic: '#ecebe6', apron: '#c85a3a', skin: '#e8e2da', lip: '#f0c060', eyes: '#2a6a4a', height: 0.74,
  },
  zmole2_b: {
    // CAST-VARIANTS-2 (zmole2's shape variant): a small Wannie at work: no apron (the belt and buckle show), a miner's cap
    // with its lamp (cast_poly.py CAST zmole2_b). Taken by the underground's carrier and gauge-reader (ug_carrier, ug_gauge);
    // the two villagers keep zmole2
    race: 'mole', outfit: 'robe', tunic: '#ecebe6', hat: '#d8a838', skin: '#e8e2da', lip: '#f0c060', eyes: '#2a6a4a', height: 0.74,
  },
  joe: {
    // Joe the Elf, Twinsen's old friend from LBA2 (tools/blender/cast_poly.py build_elf): a green pointed hat with a
    // yellow pompom, great pointed ears, a long nose, a white beard, a green tunic, pointed shoes
    race: 'elf', kid: true, outfit: 'tunic', tunic: '#3a8a3a', tunicTrim: '#2a5a2a', belt: '#5a3a1a', pants: '#2a6a6a', shoes: '#4a9a4a',
    skin: '#e8b890', hat: '#2f7a3a', pompom: '#f2d860', beard: '#f2f0ea', eyes: '#7a2a2a', height: 0.74,
  },
  // ---- Vesk's guards (enemies: src/game/guards.js), the project's uniform: near-black, brass, the violet emblem
  // ---- LBA1's FunFrock troopers, reactivated by Vesk's project (cast_poly.py build_fclone, after bodies 18–20)
  fclone: {
    race: 'fclone', tunic: '#576743', tunicTrim: '#4a5a3a', belt: '#872f1f', skin: '#f3af53', helmet: '#576743', pack: '#872f1f', roll: '#4f9bbf',
    shoes: '#872f1f', hands: '#e3a34f', armLen: 1.7, neck: 0.08,
  },
  // ---- LBA1's Spheros, back on Citadel (tools/blender/cast_poly.py build_sphero, after bodies 69 and 70)
  sphero1: {
    race: 'sphero', tunic: '#5b9f63', tunicTrim: '#4f8f57', skin: '#d3af87', hair: '#ef7b53', eyes: '#2787a7', brows: '#732717', shoes: '#1f4a27', armLen: 0.92,
  },
  sphero2: {
    race: 'sphero', tunic: '#ab7b37', tunicTrim: '#8a6a3a', skin: '#d3af87', hair: '#ef7b53', eyes: '#2787a7', brows: '#732717', shoes: '#4a3a1a', armLen: 0.92,
  },
  bersimon: {
    // Bersimon the Weather Wizard (LBA2 body 111): a tall Rabbibunny in a knee-length teal robe with a tan belt,
    // a grey beard, a tall pointed teal hat between the ears
    race: 'bunny', outfit: 'robe', hem: 0.3, fur: '#e2825c', furDark: '#b85a3a', tunic: '#2f939b', tunicTrim: '#1f6a72', belt: '#9b773f',
    pants: '#e2825c', shoes: '#0d5a66', eyes: '#2a1a10', beard: '#8a8a82', wizHat: '#2f939b', height: 1.24,
  },
  keraooc: {
    // Ker'aooc the healing wizard (after LBA2 body 188, tools/blender/cast_poly.py build_elf): a small brown-faced
    // gnome of a wizard in blue, star-pointed shoulders, a long pointed white beard, a tall straight blue hat with a
    // white pompom, curled shoes with brass bells
    race: 'elf', kid: true, outfit: 'tunic', tunic: '#236787', tunicTrim: '#1f5777', belt: '#634327', pants: '#1f5777', shoes: '#1f5777',
    skin: '#936b4f', noseC: '#7a5640', hat: '#236787', pompom: '#f0eef8', beard: '#ebdfd7', eyes: '#2a1a10', height: 0.92,
    noEars: true, beardLong: true, pads: true, bells: '#d8b048', hatStraight: true, stout: 1.45,
  },
  magus: {
    // a master of the School of Magic (LBA2 body 123): a Rabbibunny in a long blue robe, a white beard, a blue pointed hat
    race: 'bunny', outfit: 'robe', hem: 0.12, fur: '#b85a40', furDark: '#8a3a28', tunic: '#1f5777', tunicTrim: '#f2f2f2', belt: '#f2f2f2',
    pants: '#b85a40', shoes: '#6b472b', eyes: '#2a1a10', beard: '#f4f2ee', wizHat: '#1f5777', height: 1.24,
  },
  vguard: {
    // a Quetch guard: a round helmet with a violet visor, a knee-length uniform coat, a stun rifle (a prop)
    race: 'quetch', outfit: 'tunic', hem: 0.42, tunic: '#1a2a33', tunicTrim: '#1a2a33', belt: '#c8a050', buckle: '#e8c870', pants: '#16141a', shoes: '#16141a',
    skin: '#e0b48c', hairStyle: 'bald', helmetQ: '#2a3a44', visor: '#c070ff', emblem: '#e090ff', eyes: '#2a2a2a', height: 1.02,
    coatLegs: 0.5, hemW: 0.9, // (CHAR-OPEN: toward the hem half the coat's skirt rides the thighs (cast_poly.py w_skirt), a little less flare)
  },
  vguardG: {
    // a Grobo guard: the great body in the uniform, a helmet with a dark visor; armoured (light hits only shake it)
    race: 'grobo', outfit: 'tunic', hem: 0.6, skin: '#8a94a8', tunic: '#1a2a33', tunicTrim: '#1a2a33', belt: '#c8a050', pants: '#16141a', shoes: '#16141a',
    helmet: '#2a3a44', emblem: '#e090ff', eyes: '#2a2a2a', height: 1.04,
  },
  // ---- Zeelich's council (chapter 9)
  councilChair: {
    // Councillor Amaru, who chairs the council: a tall Esmer in a violet robe with a gold collar and a tall hat
    race: 'esmer', outfit: 'robe', hem: 0.05, slim: true, skin: '#f4a07e', ridge: '#4a7a6a', tunic: '#5a2a7a', tunicTrim: '#f2c45a', belt: '#f2c45a', pants: '#3a1a4a', shoes: '#2a1a2a',
    eyes: '#f0c040', hat: '#f2c45a', collar: true, collarColor: '#f2c45a', height: 1.12,
  },
  councilB: {
    // Councillor Sela: a brisk Quetch merchant-councillor in a rose dress with a gold sash
    race: 'quetch', outfit: 'dress', hem: 0.1, slim: true, tunic: '#c84a7a', tunicTrim: '#f2d070', belt: '#f2d070', pants: '#c84a7a', shoes: '#4a2a2a',
    hair: '#2a1a2a', skin: '#e8b890', hairStyle: 'bun', nose: 'button', eyes: '#3a2a1a', glasses: true, height: 0.92, neck: 0.08,
  },
  councilC: {
    // Councillor Brum: a heavy Grobo in a slate-blue robe, cautious, fond of the cold project heat
    race: 'grobo', outfit: 'robe', hem: 0.1, belly: 0.14, skin: '#98a0b8', tunic: '#3a4a7a', tunicTrim: '#e8e0d0', belt: '#e8e0d0', pants: '#2a2a4a', shoes: '#2a2a2a',
    eyes: '#2a2a2a', hat: '#5a2a7a', height: 1.04,
  },
  clerk: {
    // the council's clerk: a slim Esmer in a pale robe, ink-stained sleeves, spectacles
    race: 'esmer', outfit: 'robe', hem: 0.08, slim: true, stoop: 0.05, skin: '#eeab8c', ridge: '#4a7a7a', tunic: '#d8d0e8', tunicTrim: '#5a4a8a', belt: '#5a4a8a', pants: '#4a4a6a', shoes: '#2a2a3a',
    eyes: '#d8b040', glasses: true, height: 1.0,
  },
  clerk_b: {
    // CAST-VARIANTS-1 (clerk's shape variant): a broader Esmer in a wrapped headcloth and a belted robe, no spectacles
    // (cast_poly.py CAST clerk_b). Taken by Otringal's keeper (ot_keep), Aven (aven) and Dobb (ih_dobb); the council clerks,
    // Corla and Otringal's clerk keep clerk
    race: 'esmer', outfit: 'robe', hem: 0.08, stoop: 0.03, skin: '#eeab8c', ridge: '#4a7a7a', tunic: '#d8d0e8', tunicTrim: '#5a4a8a', belt: '#5a4a8a', pants: '#4a4a6a', shoes: '#2a2a3a',
    eyes: '#d8b040', hat: '#5a4a8a', height: 1.02,
  },
  archivist: {
    // the project's archivist: a wary Quetch in a long grey-teal coat with brass buttons
    race: 'quetch', outfit: 'tunic', hem: 0.28, slim: true, tunic: '#4a6a6a', tunicTrim: '#c8a050', belt: '#2a2a2a', buckle: '#c8a050', pants: '#2a3a3a', shoes: '#2a2026',
    hair: '#6a5a4a', skin: '#e0b090', hairStyle: 'tuft', nose: 'long', eyes: '#3a2a1a', glasses: true, collar: true, buttons: true, height: 0.98, neck: 0.08,
  },
  archivist_b: {
    // CAST-VARIANTS-3 (archivist's shape variant, order 28 queue 7's last): a field archivist for the desert: a wide straw sun
    // hat, no spectacles and no collar, the coat cut shorter, sleeves rolled, a leather satchel strap across the chest, a broader
    // build and a round nose (cast_poly.py CAST archivist_b). Taken by Bashir (Kesh) and the dig's site clerk (dg_clerk); the
    // archivist, Kip (the tavern) and Bern (the terminal) keep archivist
    race: 'quetch', outfit: 'tunic', hem: 0.4, tunic: '#4a6a6a', tunicTrim: '#c8a050', belt: '#2a2a2a', buckle: '#c8a050', pants: '#2a3a3a', shoes: '#2a2026',
    hair: '#6a5a4a', skin: '#e0b090', hairStyle: 'tuft', nose: 'ball', eyes: '#3a2a1a', hat: '#d8c490', height: 0.98, neck: 0.08,
  },
  // ---- Citadel's hill farms (chapter 8)
  farmerA: {
    race: 'quetch', outfit: 'tunic', hem: 0.6, belly: 0.08, tunic: '#6a8a3a', tunicTrim: '#3a5a1a', belt: '#5a3a1a', pants: '#8a6a4a', shoes: '#3a2a1a',
    hair: '#8a5a2a', skin: '#e0a878', hairStyle: 'tuft', nose: 'ball', eyes: '#3a2a1a', hat: '#e8d090', height: 0.97, neck: 0.08,
  },
  farmerA_b: {
    // CAST-VARIANTS-1 (order 28 queue 7, farmerA's shape variant): a heavier Quetch hand, bare-headed (the tuft shows), a
    // longer smock with the sleeves down, a swept moustache (cast_poly.py CAST farmerA_b). Taken by Rod (dg_rod, the dig),
    // Tam (lh_tam, the Hamalayi) and Wim (wim); Jorr, Garrick, Tibbo and the farm evacuees keep farmerA
    race: 'quetch', outfit: 'tunic', hem: 0.45, belly: 0.14, tunic: '#6a8a3a', tunicTrim: '#3a5a1a', belt: '#5a3a1a', pants: '#8a6a4a', shoes: '#3a2a1a',
    hair: '#8a5a2a', skin: '#e0a878', hairStyle: 'tuft', nose: 'ball', eyes: '#3a2a1a', moustache: true, height: 0.99, neck: 0.08,
  },
  farmerB_b: {
    // CAST-VARIANTS-1 (farmerB's shape variant): a Rabbibunny without the apron, patch pockets, both ears folded over (cast_poly.py
    // CAST farmerB_b). Taken by Maro (maro, the plaza) and the counter's waiting man (up_wait) and Tavi (the terminal's café; order 41.5);
    // Hedda, the dig's cook, Mira of the Hamalayi and the farm evacuees keep farmerB
    race: 'bunny', outfit: 'tunic', hem: 0.5, fur: '#e8d0b8', furDark: '#b89878', tunic: '#d8a03a', tunicTrim: '#8a5a1a', belt: '#5a3a1a', pants: '#5a6a3a', shoes: '#e8d0b8',
    eyes: '#3a2a1a', height: 0.9,
  },
  farmerB: {
    race: 'bunny', outfit: 'tunic', hem: 0.5, fur: '#e8d0b8', furDark: '#b89878', tunic: '#d8a03a', tunicTrim: '#8a5a1a', belt: '#5a3a1a', pants: '#5a6a3a', shoes: '#e8d0b8',
    eyes: '#3a2a1a', apron: '#f4ecd8', height: 0.88,
  },
  // (the user, 5.11: Tobb and Marda, both Grobos in red, "these two are too similar": Tobb's smock is a plum violet
  //  with ochre trim and green-grey trousers, a dark straw hat; Marda keeps Yorna's red robe)
  farmerC: {
    race: 'grobo', outfit: 'tunic', hem: 0.62, belly: 0.12, skin: '#98a6b4', tunic: '#5e4a8a', tunicTrim: '#d8a040', belt: '#3a2a1a', pants: '#4f5f4a', shoes: '#3a2a1a',
    eyes: '#2a2a2a', hat: '#6a5a3a', height: 1.04,
  },
  farmerC_b: {
    // CAST-POLISH-DESERT (order 24, farmerC's shape variant): a working Grobo, bare-headed (no hat: the ears and the crown
    // show), a lighter build (cast_poly.py CAST farmerC_b). Taken by Gorrum (dg_haul, the dig) and Bodo (lh_grum, the
    // Hamalayi) and, since CAST-POLISH-UNDERGROUND, Fosse (fosse, the sewer man: no sun hat down there); Grull (farmer3) and
    // Tobb keep farmerC
    race: 'grobo', outfit: 'tunic', hem: 0.62, belly: 0.05, skin: '#98a6b4', tunic: '#5e4a8a', tunicTrim: '#d8a040', belt: '#3a2a1a', pants: '#4f5f4a', shoes: '#3a2a1a',
    eyes: '#2a2a2a', height: 1.04,
  },
  // ---- the Hamalayi (chapters 6–7)
  yorna: {
    // Yorna: an old Grobo mountain guide; a thick felt coat in red and ochre, a fur hat
    race: 'grobo', outfit: 'robe', hem: 0.12, stoop: 0.1, belly: 0.08, skin: '#a8a0b0', tunic: '#a83a2a', tunicTrim: '#e8b84a', belt: '#5a3a1a', pants: '#5a3a2a', shoes: '#3a2a1a',
    eyes: '#2a2a2a', hat: '#8a6a4a', height: 1.0,
  },
  pim: {
    race: 'grobo', kid: true, outfit: 'tunic', hem: 0.6, skin: '#b0a8bc', tunic: '#2f7ad8', tunicTrim: '#e8c040', belt: '#5a3a1a', pants: '#8a3a2a', shoes: '#3a2a1a',
    eyes: '#2a2a2a', hat: '#d8302a', height: 0.62,
  },
  lharMan: {
    race: 'quetch', outfit: 'tunic', hem: 0.6, belly: 0.06, tunic: '#7a4a2a', tunicTrim: '#e8c060', belt: '#3a2a1a', pants: '#4a3a3a', shoes: '#2a1a10',
    hair: '#2a1a10', skin: '#d8a880', hairStyle: 'tuft', nose: 'long', eyes: '#2a1a10', moustache: true, height: 0.98, neck: 0.08,
  },
  lharMan_b: {
    // CAST-POLISH-HAMALAYI (order 24, lharMan's shape variant): a heavier Lhar man, bald, in a longer coat (cast_poly.py CAST
    // lharMan_b). Taken by Fitter Ludo (dg_mech), Ollo and Dov; Tashi (lhar1), Bero (lh_bero) and Luc keep lharMan
    race: 'quetch', outfit: 'tunic', hem: 0.45, belly: 0.14, tunic: '#7a4a2a', tunicTrim: '#e8c060', belt: '#3a2a1a', pants: '#4a3a3a', shoes: '#2a1a10',
    hair: '#2a1a10', skin: '#d8a880', hairStyle: 'bald', nose: 'long', eyes: '#2a1a10', moustache: true, height: 0.98, neck: 0.08,
  },
  lharWoman: {
    race: 'quetch', outfit: 'dress', hem: 0.12, slim: true, tunic: '#2f6a5a', tunicTrim: '#f2d8a0', belt: '#d8302a', pants: '#2f6a5a', shoes: '#3a2a1a',
    hair: '#1a1210', skin: '#e0b090', hairStyle: 'longtail', nose: 'button', eyes: '#2a1a10', lashes: true, height: 0.9, neck: 0.08,
  },
  kira: {
    // CAST-VARIANTS-2: Kira, Zeelich's plaza gardener, her own look (she shared lharWoman with Dawa, Sana and Oda): a wide straw
    // hat, sleeves rolled to the elbow, a gardener's apron and leather gloves, her dress in a warmer green (cast_poly.py CAST kira)
    race: 'quetch', outfit: 'dress', hem: 0.12, slim: true, tunic: '#3a7a4a', tunicTrim: '#f2d8a0', belt: '#8a5a2a', pants: '#3a7a4a', shoes: '#3a2a1a',
    hair: '#5a3a1a', skin: '#e0b090', hairStyle: 'longtail', nose: 'button', eyes: '#2a1a10', lashes: true, hat: '#e8d090', apron: '#d8c8a0', height: 0.9, neck: 0.08,
  },
  lharWoman_b: {
    // CAST-POLISH-HAMALAYI (order 24, lharWoman's shape variant): an older Lhar woman, the hair up in a bun, a fuller figure
    // (cast_poly.py CAST lharWoman_b). Taken by Mrs Pell (pell, pell_q) and Mrs Ardo (zc_petit); Dawa (lhar2), Sana (lh_sana),
    // Oda and Kira keep lharWoman
    race: 'quetch', outfit: 'dress', hem: 0.12, belly: 0.06, tunic: '#2f6a5a', tunicTrim: '#f2d8a0', belt: '#d8302a', pants: '#2f6a5a', shoes: '#3a2a1a',
    hair: '#1a1210', skin: '#e0b090', hairStyle: 'bun', nose: 'button', eyes: '#2a1a10', height: 0.9, neck: 0.08,
  },
  lharElder: {
    race: 'bunny', outfit: 'robe', hem: 0.1, stoop: 0.14, fur: '#f0ece8', furDark: '#c8c0b8', tunic: '#5a3a7a', tunicTrim: '#e8c060', belt: '#e8c060', pants: '#3a2a4a', shoes: '#f0ece8',
    eyes: '#2a2a3a', glasses: true, height: 0.82,
  },
  keeper: {
    // Sefa, keeper of the observatory: a tall Esmer in a star-blue robe
    race: 'esmer', outfit: 'robe', hem: 0.06, slim: true, skin: '#f2a888', ridge: '#3a6a8a', tunic: '#2a3a7a', tunicTrim: '#e8e0b0', belt: '#e8e0b0', pants: '#1a2a4a', shoes: '#2a2040',
    eyes: '#f0d060', height: 1.08,
  },
  keeper_b: {
    // CAST-POLISH-ZEELICH-2 (order 24, keeper's shape variant): Zeelich's council guard after LBA2's helmeted Esmer (body 80):
    // a heavier build, a helmet with a peak and a neck guard, a belt with a buckle (cast_poly.py CAST keeper_b). Taken by
    // zc_guard, up_guard, zt_guard and zt_guard2; Sefa (keeper), Ilo, Marl and Esren keep keeper
    race: 'esmer', outfit: 'robe', hem: 0.06, skin: '#f2a888', ridge: '#3a6a8a', tunic: '#2a3a7a', tunicTrim: '#e8e0b0', belt: '#6a4a2a', pants: '#1a2a4a', shoes: '#2a2040',
    helmet: '#4a6a5a', buckle: '#e8c870', eyes: '#f0d060', height: 1.08,
  },
  // ---- Desert Island (chapters 4–5)
  ilka: {
    // Professor Ilka: the Rabbibunny geologist who dug up the first crystals; dusty khaki field clothes, glasses
    race: 'bunny', outfit: 'tunic', hem: 0.5, slim: true, fur: '#efe4d4', furDark: '#c8b49a', tunic: '#c8a86a', tunicTrim: '#7a5a2a', belt: '#5a3a1a', buckle: '#d8b04a', pants: '#8a6a3a', shoes: '#5a3a1a',
    eyes: '#2a3a5a', glasses: true, collar: true, collarColor: '#e8dcc0', height: 0.9,
  },
  hesk: {
    // Hesk: Grobo caravan driver and sand-yacht pilot; orange driving coat, goggles up on his head
    race: 'grobo', outfit: 'tunic', hem: 0.6, belly: 0.08, skin: '#b0a08a', tunic: '#d0703a', tunicTrim: '#7a3a1a', belt: '#3a2a1a', buckle: '#c8a050', pants: '#5a4a3a', shoes: '#3a2a1a',
    eyes: '#2a2a2a', goggles: true, height: 1.06,
  },
  tarra: {
    // Mother Tarra: the village elder of Kesh; long plum robe, gold trim, white hair in a bun, a little stooped
    race: 'quetch', outfit: 'dress', hem: 0.1, stoop: 0.12, slim: true, tunic: '#7a3a5a', tunicTrim: '#e8c060', belt: '#e8c060', pants: '#7a3a5a', shoes: '#4a2a1a',
    hair: '#ece8e0', skin: '#d8a880', hairStyle: 'bun', nose: 'long', eyes: '#3a2a1a', height: 0.9, neck: 0.08,
  },
  dallan: {
    // Dallan: the project foreman (the guard from the Zeelich dock); teal uniform, brass buttons, a hard hat
    race: 'quetch', outfit: 'tunic', hem: 0.58, tunic: '#245a6a', tunicTrim: '#c8a050', belt: '#2a2a2a', buckle: '#d8b04a', pants: '#203a48', shoes: '#2a2a2a',
    hair: '#3a2a1a', skin: '#e0b088', hairStyle: 'tuft', nose: 'long', eyes: '#2a2a1a', moustache: true, buttons: true, hardhat: '#e8e8e0', height: 1.0, neck: 0.08,
  },
  desertkid: {
    race: 'quetch', kid: true, outfit: 'tunic', hem: 0.62, tunic: '#e8d8b0', tunicTrim: '#c86a3a', belt: '#c86a3a', pants: '#8a6a4a', shoes: '#6a4a2a',
    hair: '#2a1a10', skin: '#d8a070', hairStyle: 'tuft', nose: 'button', eyes: '#2a1a10', height: 0.62, neck: 0.08,
  },
  desertkid_b: {
    // CAST-POLISH-DESERT (order 24, desertkid's shape variant): a child in a wide straw sun hat, the hair in a short tail
    // (cast_poly.py CAST desertkid_b). Taken by Pico (Citadel's walker) and Rafi (sc_pupc, the School's plaza); Sani (dkid),
    // Oni, Oona (sc_in3) and Little Kel (lh_kid1) keep desertkid
    race: 'quetch', kid: true, outfit: 'tunic', hem: 0.62, tunic: '#e8d8b0', tunicTrim: '#c86a3a', belt: '#c86a3a', pants: '#8a6a4a', shoes: '#6a4a2a',
    hair: '#2a1a10', skin: '#d8a070', hairStyle: 'tail', nose: 'button', eyes: '#2a1a10', hat: '#d8b860', height: 0.62, neck: 0.08,
  },
  desertTrader: {
    // (GROBO-GREY, the user 11.11: "why are there green elephants, it makes no sense": the skin was a sage green-grey
    //  (#9aa898), and Brix's green tint on top made a green elephant in Citadel's village; a Grobo is grey, as in LBA2)
    race: 'grobo', outfit: 'tunic', hem: 0.6, belly: 0.12, skin: '#a6a2a8', tunic: '#2f7a9a', tunicTrim: '#e8c060', belt: '#5a3a1a', pants: '#3a4a5a', shoes: '#3a2a1a',
    eyes: '#2a2a2a', hat: '#e8d8b0', height: 1.02,
  },
  weaver: {
    race: 'bunny', outfit: 'tunic', hem: 0.48, belly: 0.06, fur: '#f2e2cc', furDark: '#d0b090', tunic: '#c84a6a', tunicTrim: '#f2d8a0', belt: '#7a2a3a', pants: '#5a3a5a', shoes: '#f2e2cc',
    eyes: '#4a2a1a', apron: '#e8d8b0', height: 0.86,
  },
  // ---- Citadel twelve years on (src/game/story/life.js)
  bram: {
    // Bram: an old Grobo who has kept the lane's hand pump going for fifty years; a moss-green cardigan, a flat cap
    race: 'grobo', outfit: 'tunic', hem: 0.6, stoop: 0.14, belly: 0.1, skin: '#a4a8b4', tunic: '#5a7a4a', tunicTrim: '#3a5a2a', belt: '#4a3a2a', pants: '#5a4a3a', shoes: '#3a2a1a',
    eyes: '#2a2a2a', hat: '#6a5a4a', buttons: true, height: 0.98,
  },
  odile: {
    // Officer Odile: the harbour's customs officer, a Rabbibunny in a navy uniform with brass buttons and a cap
    race: 'bunny', outfit: 'tunic', hem: 0.5, slim: true, fur: '#e8dcd0', furDark: '#b8a090', tunic: '#2a3a6a', tunicTrim: '#d8b04a', belt: '#1a2240', buckle: '#d8b04a', pants: '#2a3a6a', shoes: '#1a1a24',
    eyes: '#2a2a3a', buttons: true, collar: true, collarColor: '#e8e0d0', hat: '#2a3a6a', height: 0.9,
  },
  nell: {
    // Nell: the young Quetch who runs the harbour's repair shop; rust-orange work coat, a leather apron, goggles up
    race: 'quetch', outfit: 'tunic', hem: 0.58, slim: true, tunic: '#c8602a', tunicTrim: '#7a3a1a', belt: '#4a3a2a', buckle: '#b8b8c0', pants: '#3a4a5a', shoes: '#2a2a2a',
    hair: '#2a1a3a', skin: '#e8b890', hairStyle: 'tail', nose: 'button', eyes: '#3a2a1a', apron: '#8a5a3a', goggles: true, height: 0.92, neck: 0.08,
  },
  // ---- Ballastra (the expansion, W-1 Float Harbor; tools/blender/ballastra_poly.py, EXPANSION_ART_DECISIONS.md D4/D9)
  // The canal dwellers, Ballastra's own people (D4): shoulder-high to Twinsen (about 1.45 m), compact and broad, a big
  // round face (wide cheeks, a short broad nose, a soft jaw), fan ears that stand out from the head and waft (an ear bone
  // each side, the rig's Grobo ear swing), short sturdy legs set wide on broad feet. The skeleton is the shared one (same
  // names and hierarchy) with these proportions: short legs and torso, a short neck, broad shoulders, short arms.
  // Tessa (D9): a compact mechanic, a little narrower than the dockers, carried forward (stoop) as she works: a mustard
  // shirt with the sleeves rolled above the elbow, a short teal canvas apron with a wrench and a screwdriver in its
  // pocket, a hammer hung at her right hip, a rust headband over short dark hair, broad work boots.
  tessa: {
    race: 'canal', outfit: 'tunic', hem: 0.36, tunic: '#d4a03c', tunicTrim: '#a87a26', belt: '#4a3020', buckle: '#a8acb4', pants: '#6a4a34', shoes: '#5a3a24',
    skin: '#c8946a', hair: '#6a3020', eyes: '#2a3a2e', apron: '#2f5a6a', headband: '#b8402a',
    legLen: 0.6, torsoLen: 0.76, neck: 0.05, headS: 1.3, shoulders: 1.05, legX: 0.11, armLen: 0.88, armSpread: 0.14, stoop: 0.11,
    earBones: [0.152, 1.216, 0.079], height: 0.95, radius: 0.4,
  },
  // The dockers: ONE body (the same skeleton and base mesh, built by the same function) in three outfits, each with its own
  // face settings (brows, nose, mouth, ear set), skin tone and height. 1: a sea-green oilskin smock, a knit cap, tall
  // rubber boots. 2: a leather vest over a sleeveless undershirt, knee shorts, a straw cone hat, a rope coil on the
  // shoulder, bare broad feet. 3 (older: grey hair and sideburns, heavier brows): a leather tabard over a slate shirt,
  // work gloves, a headband, rolled trousers and sandals, a cargo hook at the belt.
  docker1: {
    race: 'canal', outfit: 'tunic', hem: 0.34, tunic: '#4f8a6a', tunicTrim: '#3a6a50', belt: '#3a2a20', pants: '#3a4a5a', shoes: '#2a3434',
    skin: '#b9875f', hair: '#2a1c14', eyes: '#2a2a22', cap: '#c8502a',
    legLen: 0.6, torsoLen: 0.78, neck: 0.05, headS: 1.35, shoulders: 1.15, legX: 0.12, armLen: 0.86, armSpread: 0.16,
    earBones: [0.158, 1.232, -0.02], height: 0.97, radius: 0.42,
  },
  docker2: {
    race: 'canal', outfit: 'tunic', hem: 0.5, tunic: '#e4d6b4', tunicTrim: '#8a5a3a', belt: '#5a3a1a', pants: '#3a6a8a', shoes: '#d1a27a',
    skin: '#d1a27a', hair: '#3a2416', eyes: '#2a2a1a', vest: '#8a5a3a', strawHat: '#d8c080', rope: '#c8b080',
    legLen: 0.6, torsoLen: 0.78, neck: 0.05, headS: 1.35, shoulders: 1.15, legX: 0.12, armLen: 0.86, armSpread: 0.16,
    earBones: [0.158, 1.232, -0.02], height: 0.93, radius: 0.42,
  },
  docker3: {
    race: 'canal', outfit: 'tunic', hem: 0.3, tunic: '#56687a', tunicTrim: '#3e4e5e', belt: '#3a2a1a', buckle: '#9a9aa0', pants: '#4a4038', shoes: '#6a4a2a',
    skin: '#a87a58', hair: '#c8c4b8', eyes: '#2a2018', tabard: '#7a4a2a', glove: '#5a4030', headband: '#e8e0c8',
    legLen: 0.6, torsoLen: 0.78, neck: 0.05, headS: 1.35, shoulders: 1.15, legX: 0.12, armLen: 0.86, armSpread: 0.16,
    earBones: [0.158, 1.232, -0.02], height: 1.0, radius: 0.42,
  },
};
// A Twinsun trader at the harbour (W-1): the Desert Island trader's existing body as it is (a visitor reads by its own
// silhouette, D4); the same look, so the same skeleton the model was built on
LOOKS.blTrader = { ...LOOKS.desertTrader, poly: 'desertTrader' };

LOOKS.twinsenSculpt = { ...LOOKS.twinsen, poly: null };

// ------------------------------------------------------------------ body design
function design(L) {
  const kid = !!L.kid;
  // a preteen (ARTHUR-12: Arthur at twelve): not the small-child template scaled up — longer legs and arms, a head
  // nearer an adult's size on a longer body, narrower shoulders and a slimmer build than an adult's; the skeleton is
  // the same (names, hierarchy), drawn at full scale (root scale = height, no kid divisor)
  const teen = !kid && !!L.teen;
  const slim = L.slim ? 0.86 : 1;
  const grobo = L.race === 'grobo', bunny = L.race === 'bunny', esmer = L.race === 'esmer', quetch = L.race === 'quetch';
  // (LBA1's Spheros, bodies 68–70: short legs, the shoulders at the tips of a star-shaped body, 0.67 of Twinsen's height)
  const sphero = L.race === 'sphero';
  // (LBA1's FunFrock troopers, bodies 18–20: a fat greatcoat to the ankles, the shoulders high, long arms)
  const fclone = L.race === 'fclone';
  const legLen = L.legLen ?? (fclone ? 0.5 : sphero ? 0.62 : kid ? 0.74 : teen ? 0.8 : grobo ? 0.8 : esmer ? 1.08 : 1);
  const torsoLen = L.torsoLen ?? (fclone ? 1.95 : kid ? 0.82 : teen ? 0.8 : grobo ? 1.05 : 1);
  const hs = (L.headS || 1) * (kid ? 1.3 : 1) * (grobo ? 1.1 : 1);
  const wide = (grobo ? 1.5 : 1) * slim * (kid ? 0.92 : teen ? 0.9 : 1);
  const belly = L.belly || 0;
  const neckLen = L.neck ?? 0.1;

  // ---- skeleton (rest pose: arms hanging slightly away from the body)
  const B = {};
  const bone = (name, pos, parent, extra = {}) => { B[name] = { pos, parent, ...extra }; return pos; };
  const hipsY = 0.95 * legLen;
  bone('body', [0, 0, 0], null, { tip: [0, 0.1, 0] });
  bone('hips', [0, hipsY, 0], 'body');
  const torso = bone('torso', [0, hipsY + 0.05, 0], 'hips');
  const ty = torso[1];
  const neckP = bone('neck', [0, ty + 0.56 * torsoLen, 0.0 + (L.stoop || 0) * 0.5], 'torso');
  const headP = bone('head', [0, neckP[1] + neckLen, neckP[2] + (L.stoop || 0) * 0.4], 'neck');
  const Hc = add(headP, [0, 0.13 * hs, 0]);
  B.head.tip = add(Hc, [0, 0.18 * hs, 0]);
  const shX = (fclone ? 0.49 : sphero ? 0.676 : grobo ? 0.33 : 0.2) * slim * (kid ? 0.95 : teen ? 0.88 : 1) * (L.shoulders || 1), shY = ty + 0.47 * torsoLen;
  const armLen = (esmer ? 1.15 : kid ? 0.78 : teen ? 0.9 : 1) * (L.armLen || 1);
  const legX = L.legX ?? (fclone ? 0.16 : sphero ? 0.29 : grobo ? 0.15 : teen ? 0.092 : 0.1) * slim;
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    const sh = bone('sh' + s, [sx * shX, shY, L.shZ || 0], 'torso');
    const el = bone('el' + s, add(sh, [sx * 0.05, -0.29 * armLen, 0.0]), 'sh' + s);
    bone('hand' + s, add(el, [sx * 0.02, -0.27 * armLen, 0.03]), 'el' + s, { tip: add(el, [sx * 0.025, -0.4 * armLen, 0.04]) });
    const hp = bone('hip' + s, [sx * legX, hipsY - 0.03, 0], 'hips');
    const kn = bone('knee' + s, add(hp, [0, -0.43 * legLen, 0.01]), 'hip' + s);
    bone('foot' + s, [sx * legX, 0.1, 0], 'knee' + s, { tip: [sx * legX, 0.03, 0.15] });
  }
  // a Grobo's own bones (Baldino, SRC-2): an ear each side on the head, and a trunk of three segments hanging from it
  if (L.earBones) for (const [s, sx] of [['L', 1], ['R', -1]]) bone('ear' + s, [sx * L.earBones[0], L.earBones[1], L.earBones[2]], 'head', { noSeg: true });
  if (L.trunkBones) L.trunkBones.forEach((p, i) => bone('trunk' + i, p, i ? 'trunk' + (i - 1) : 'head', { noSeg: true }));
  // TRUNK-1: every other Grobo's trunk gets the same three bones (it hung rigid from the head), on its own curve (groboTrunk)
  else if (grobo) groboTrunk(headP[1], hipsY, shY, neckP[1], B.kneeL.pos[1], belly, slim).slice(1, 4)
    .forEach(([y, z], i) => bone('trunk' + i, [0, y, z], i ? 'trunk' + (i - 1) : 'head', { noSeg: true }));
  const hemY = Math.max(0.06, L.hem ?? 0.5);
  const hemR = (L.hemW ?? 1) * (L.outfit === 'robe2' || L.outfit === 'tw' || L.outfit === 'lba' ? 0.36 : L.outfit === 'bell' ? 0.43 : L.outfit === 'dress' ? 0.34 : L.outfit === 'robe' ? 0.32 : 0.27) * wide * (kid || teen ? 0.92 : 1) + belly * 0.4;
  for (const [nm, dx, dz] of [['skirtF', 0, 1], ['skirtB', 0, -1], ['skirtL', 1, 0], ['skirtR', -1, 0]]) {
    bone(nm, [dx * 0.08, ty - 0.04, dz * 0.06], 'hips', { tip: [dx * hemR * 0.9, hemY, dz * hemR * 0.75], noSeg: true });
  }

  const P = [];
  const G = {};
  const e = (c, r, bone_, mat, group, extra = {}) => P.push({ type: 'ell', c, r, bone: bone_, mat, group, ...extra });
  const cone = (a, b, r1, r2, bone_, mat, group, extra = {}) => P.push({ type: 'cone', a, b, r1, r2, bone: bone_, mat, group, ...extra });
  const torus = (c, R, r, bone_, mat, group, extra = {}) => P.push({ type: 'torus', c, R, r, bone: bone_, mat, group, ...extra });
  const ccone = (top, bot, rt, rb, bone_, mat, group, extra = {}) => P.push({ type: 'ccone', c: [0, (top + bot) / 2, extra.cz || 0], h: (top - bot) / 2, rt, rb, bone: bone_, mat, group, round: 0.016, ...extra });

  // ================================================================= HEAD
  G.head = 0.045;
  const face = { eyeX: 0.05, eyeY: 0.045, eyeZ: 0.1, eyeR: 0.034, mouthY: -0.085, mouthZ: 0.11 };
  if (bunny) {
    e(add(Hc, [0, 0.02, -0.01]), [0.15 * hs, 0.16 * hs, 0.15 * hs], 'head', 'fur', 'head');
    e(add(Hc, [0, -0.07 * hs, 0.09 * hs]), [0.1 * hs, 0.075 * hs, 0.085 * hs], 'head', 'muzzle', 'head');
    for (const sx of [1, -1]) e(add(Hc, [sx * 0.045 * hs, -0.06 * hs, 0.15 * hs]), [0.048 * hs, 0.042 * hs, 0.038 * hs], 'head', 'muzzle', 'head');
    e(add(Hc, [0, -0.02 * hs, 0.19 * hs]), [0.03, 0.022, 0.02], 'head', 'nosePink', 'head');
    P.push({ type: 'box', c: add(Hc, [0, -0.12 * hs, 0.155 * hs]), h: [0.026, 0.03, 0.011], round: 0.008, bone: 'head', mat: 'teeth', group: 'teeth' });
    for (const sx of [1, -1]) {
      const a = add(Hc, [sx * 0.065, 0.13 * hs, -0.04]), b = add(Hc, [sx * 0.1, 0.42 * hs, -0.09]), c = add(Hc, [sx * 0.16, 0.58 * hs, -0.03]);
      cone(a, b, 0.048, 0.042, 'head', 'fur', 'ears', { sz: 0.42 });
      cone(b, c, 0.042, 0.02, 'head', 'fur', 'ears', { sz: 0.42 });
    }
    G.ears = 0.04; G.teeth = 0;
    Object.assign(face, { eyeX: 0.065, eyeY: 0.035, eyeZ: 0.115, eyeR: 0.032, mouthY: -0.1, mouthZ: 0.15 });
  } else if (grobo) {
    e(add(Hc, [0, 0.03, -0.02]), [0.19, 0.18, 0.18], 'head', 'skin', 'head');
    e(add(Hc, [0, -0.07, 0.08]), [0.14, 0.12, 0.13], 'head', 'skin', 'head');
    const t0 = add(Hc, [0, -0.03, 0.19]), t1 = add(Hc, [0, -0.17, 0.27]), t2 = add(Hc, [0, -0.33, 0.27]), t3 = add(Hc, [0, -0.45, 0.2]);
    cone(t0, t1, 0.072, 0.056, 'head', 'skin', 'head');
    cone(t1, t2, 0.056, 0.043, 'head', 'skin', 'head');
    cone(t2, t3, 0.043, 0.036, 'head', 'skin', 'head');
    for (const sx of [1, -1]) e(add(Hc, [sx * 0.24, 0.0, -0.05]), [0.045, 0.2, 0.18], 'head', 'skinDark', 'ears', { wobble: (x, y) => Math.sin(y * 40) * 0.004 });
    for (const sx of [1, -1]) cone(add(Hc, [sx * 0.06, -0.12, 0.15]), add(Hc, [sx * 0.1, -0.18, 0.24]), 0.02, 0.008, 'head', 'teeth', 'tusks');
    G.ears = 0.03; G.tusks = 0;
    Object.assign(face, { eyeX: 0.075, eyeY: 0.05, eyeZ: 0.15, eyeR: 0.024, mouthY: -0.16, mouthZ: 0.13 });
  } else if (esmer) {
    e(add(Hc, [0, 0.08, -0.03]), [0.14, 0.24, 0.16], 'head', 'skin', 'head');
    e(add(Hc, [0, -0.07, 0.05]), [0.11, 0.12, 0.12], 'head', 'skin', 'head');
    e(add(Hc, [0, -0.15, 0.09]), [0.05, 0.04, 0.05], 'head', 'skin', 'head');
    cone(add(Hc, [0, 0.29, -0.08]), add(Hc, [0, 0.0, -0.2]), 0.018, 0.012, 'head', 'ridge', 'ridge', { sz: 2 });
    for (const sx of [1, -1]) cone(add(Hc, [sx * 0.12, -0.04, -0.02]), add(Hc, [sx * 0.24, -0.1, -0.06]), 0.03, 0.006, 'head', 'ridge', 'ridge');
    G.ridge = 0.02;
    Object.assign(face, { eyeX: 0.055, eyeY: 0.0, eyeZ: 0.12, eyeR: 0.03, mouthY: -0.1, mouthZ: 0.15 });
  } else {
    // Quetch: tall oval skull, narrow jaw, small chin, big nose, small ears
    const egg = L.skull === 'egg' ? (L.skullY || 1.13) : 1; // a taller skull with a high forehead
    e(add(Hc, [0, 0.03 * hs + (egg - 1) * 0.1, -0.015]), [0.115 * hs * (L.skullW || 1), 0.165 * hs * egg, 0.128 * hs], 'head', 'skin', 'head');
    const jw = L.jaw || 1;
    e(add(Hc, [0, -0.065 * hs - (jw - 1) * 0.04, 0.02 * hs]), [0.098 * hs * jw, 0.1 * hs * jw, 0.1 * hs], 'head', 'skin', 'head');
    e(add(Hc, [0, -0.135 * hs, 0.045 * hs]), [0.048 * hs * (L.chin || 1), 0.04 * hs * (L.chin || 1), 0.048 * hs * (L.chin || 1)], 'head', 'skin', 'head');
    const ck = L.cheeks ?? 1;
    if (ck > 0) for (const sx of [1, -1]) e(add(Hc, [sx * 0.06 * hs, -0.04 * hs, 0.065 * hs]), [0.04 * hs * ck, 0.035 * hs * ck, 0.04 * hs * ck], 'head', 'cheek', 'head');
    if (!L.noEars) for (const sx of [1, -1]) e(add(Hc, [sx * 0.118 * hs, -0.005, -0.005]), [0.016, 0.038, 0.028], 'head', 'skin', 'head');
    const nz = 0.12 * hs;
    const ns = L.noseS || 1;
    if (L.nose === 'round') e(add(Hc, [0, -0.022 * hs, nz + 0.028 * ns]), [0.036 * hs * ns, 0.034 * hs * ns, 0.034 * hs * ns], 'head', 'nose', 'head');
    else if (L.nose === 'ball') { e(add(Hc, [0, -0.02 * hs, nz + 0.03 * ns]), [0.044 * hs * ns, 0.04 * hs * ns, 0.048 * hs * ns], 'head', 'nose', 'head'); if (L.noseBridge !== false) cone(add(Hc, [0, 0.03 * hs, nz - 0.01]), add(Hc, [0, -0.012 * hs, nz + 0.03 * ns]), 0.016 * hs, 0.03 * hs * ns, 'head', 'skin', 'head'); }
    else if (L.nose === 'long') { cone(add(Hc, [0, 0.03, nz - 0.02]), add(Hc, [0, -0.055 * hs, nz + 0.075]), 0.022, 0.03, 'head', 'nose', 'head'); }
    else e(add(Hc, [0, -0.025 * hs, nz + 0.012]), [0.026 * hs, 0.024 * hs, 0.028 * hs], 'head', 'nose', 'head');
    const es = L.eyeScale || 1;
    Object.assign(face, { eyeX: 0.048 * hs * (L.eyeGap || 1), eyeY: 0.045 * hs + (1 - es) * 0.02 + (L.eyeUp || 0) * hs, eyeZ: 0.102 * hs + (1 - es) * 0.012 - (L.eyeIn || 0) * hs, eyeR: 0.034 * hs * es, mouthY: -0.095 * hs + (L.mouthUp || 0) * hs, mouthZ: 0.112 * hs });
  }
  if (!L.noSocket) for (const sx of [1, -1]) P.push({ type: 'ell', c: add(Hc, [sx * face.eyeX, face.eyeY, face.eyeZ + 0.006]), r: [face.eyeR * 1.05, face.eyeR * 1.1, face.eyeR * 0.8], sub: true, k: 0.012 });

  // neck: long and thin for Quetches
  const neckR = L.neckR ?? (grobo ? 0.1 : bunny ? 0.05 : esmer ? 0.045 : 0.034 * (kid ? 1.1 : 1));
  cone(add(neckP, [0, -0.06, 0]), add(headP, [0, 0.05, 0.005]), neckR * 1.08, neckR, 'neck', bunny ? 'fur' : 'skin', 'head');

  // ================================================================= HAIR
  const hairBits = [];
  if (quetch) {
    G.hair = 0.03;
    const hairline = (front, back) => (x, y, z) => {
      const ly = y - Hc[1], lz = z - Hc[2];
      const k = (front - back) / 0.26;
      return (back + k * (lz + 0.13) - ly) * 0.8;
    };
    if (L.hairStyle === 'bald') {
      e(add(Hc, [0, 0.0, -0.02]), [0.124 * hs, 0.15 * hs, 0.136 * hs], 'head', 'hair', 'hair', {
        clip: (x, y, z) => Math.max(hairline(0.02, -0.12)(x, y, z), (y - Hc[1] - 0.08) * 0.8),
        wobble: (x, y, z) => Math.sin(Math.atan2(x - Hc[0], z - Hc[2]) * 18) * 0.003,
      });
    } else {
      e(add(Hc, [0, 0.045 * hs, -0.02]), [0.125 * hs * Math.max(1, (L.skullW || 1) * 0.93), 0.17 * hs, 0.138 * hs], 'head', 'hair', 'hair', {
        clip: (L.hairStyle === 'twinsen' || (L.hairStyle === 'bun' || L.hairStyle === 'longtail'))
          // (LBA2 #23, back view: besides the cap, the hair runs as a dark strip down the back of the head)
          ? (L.hairStrip ? ((x, y, z) => Math.min(hairline((L.hairFront ?? 0.2) * hs, (L.hairBack ?? -0.035) * hs)(x, y, z), Math.max(Math.abs(x - Hc[0]) - 0.055 * hs, z - (Hc[2] - 0.06 * hs), Hc[1] - 0.06 * hs - y) * 0.8))
            : hairline((L.hairFront ?? 0.2) * hs, (L.hairBack ?? -0.035) * hs))
          : hairline(0.11 * hs, -0.1 * hs),
        wobble: (x, y, z) => Math.sin(Math.atan2(x - Hc[0], z - Hc[2]) * 16 + y * 20) * 0.003,
      });
      // a small swept fringe (Twinsen combs his hair back)
      if (L.hairStyle !== 'twinsen' && L.hairStyle !== 'bun' && L.hairStyle !== 'longtail') e(add(Hc, [0.025 * hs, 0.125 * hs, 0.07 * hs]), [0.075 * hs, 0.035 * hs, 0.06 * hs], 'head', 'hair', 'hair');
    }
    const chain = (pts, radii, mat = 'hair') => {
      // a bone per segment so the hair swings
      pts.forEach((p, i) => { if (i < pts.length - 1) bone('tail' + i, p, i === 0 ? 'head' : 'tail' + (i - 1)); });
      B['tail' + (pts.length - 2)].tip = pts[pts.length - 1];
      for (let i = 0; i < pts.length - 1; i++) {
        cone(pts[i], pts[i + 1], radii[i], radii[i + 1], 'tail' + i, mat, 'tail', { wobble: (x, y, z) => Math.sin(Math.atan2(x - pts[i][0], y - pts[i][1]) * 9) * 0.003 });
        hairBits.push('tail' + i);
      }
      G.tail = 0.035;
    };
    if ((L.hairStyle === 'bun' || L.hairStyle === 'longtail')) {
      // LBA2 Twinsen: a little cap of hair on the back of the crown and a bun of three balls behind the head
      const HH = 2.1;
      const balls = [[0.044, 0.125, -0.07], [0.034, 0.09, -0.12], [0.025, 0.055, -0.148]].map(([r, y, z]) => [r * HH, y * HH, z * HH]);
      let parent = 'head';
      balls.forEach(([r, y, z], i) => {
        const c = add(Hc, [0, y, z]);
        bone('tail' + i, c, parent); parent = 'tail' + i; hairBits.push('tail' + i);
        e(c, [r, r, r], 'tail' + i, 'hair', 'tail');
      });
      B['tail' + (balls.length - 1)].tip = add(Hc, [0, balls[2][1] - 0.05, balls[2][2] - 0.02]);
      G.tail = 0.03;
    } else if (L.hairStyle === 'twinsen') {
      // high, hooked ponytail swept back from the crown
      // (it leaves the back of the crown almost level, so from the front it reads as a tuft, not a bun)
      const p0 = add(Hc, [0, (L.skull === 'egg' ? 0.14 : 0.115) * hs, (L.skull === 'egg' ? -0.12 : -0.11) * hs]);
      if (L.skull === 'egg' && L.tail !== 'classic') {
        // LBA2: a compact knot on top of the crown that curls back
        // tied at the back of the crown, sticking out backwards and hooking down
        chain([p0, add(p0, [0, 0.03 * hs, -0.07 * hs]), add(p0, [0, 0.025 * hs, -0.14 * hs]), add(p0, [0, -0.02 * hs, -0.18 * hs]), add(p0, [0, -0.075 * hs, -0.17 * hs])],
          [0.04 * hs, 0.046 * hs, 0.038 * hs, 0.027 * hs, 0.011 * hs]);
      } else {
        // classic Twinsen: a thick ponytail tied at the back of the crown; it lifts a little, arcs
        // backwards and its weight bends the end down (a hook, not an upright spike)
        // (LBA2 #38/#23: a compact tuft rising from the back of the crown and arching back; the render
        // shows the same gesture, longer — the length here is the in-game one, a reconstruction choice)
        const tl = L.tailLen || 1;
        chain([p0, add(p0, [0, 0.085 * hs * tl, -0.03 * hs]), add(p0, [0, 0.15 * hs * tl, -0.085 * hs]), add(p0, [0, 0.16 * hs * tl, -0.16 * hs * tl]), add(p0, [0, 0.11 * hs * tl, -0.215 * hs * tl])],
          [0.056 * hs, 0.06 * hs, 0.05 * hs, 0.036 * hs, 0.022 * hs]);
      }
    } else if (L.hairStyle === 'tail') {
      const p0 = add(Hc, [0, 0.04 * hs, -0.13 * hs]);
      chain([p0, add(p0, [0, -0.08, -0.04]), add(p0, [0, -0.17, -0.05]), add(p0, [0, -0.25, -0.04])], [0.045, 0.042, 0.032, 0.014]);
      e(p0, [0.048, 0.022, 0.044], 'tail0', 'tie', 'tie');
    } else if ((L.hairStyle === 'bun' || L.hairStyle === 'longtail')) {
      const p0 = add(Hc, [0, 0.09 * hs, -0.12 * hs]);
      e(add(p0, [0, 0.03, -0.03]), [0.075, 0.07, 0.07], 'head', 'hair', 'hair', { wobble: (x, y, z) => Math.sin(Math.atan2(x, y) * 12) * 0.004 });
      chain([add(p0, [0, -0.01, -0.06]), add(p0, [0, -0.12, -0.1]), add(p0, [0, -0.26, -0.09]), add(p0, [0, -0.38, -0.06])], [0.042, 0.04, 0.03, 0.012]);
      e(add(p0, [0, -0.0, -0.065]), [0.044, 0.02, 0.04], 'tail0', 'tie', 'tie');
    } else if (L.hairStyle === 'pigtails') {
      for (const sx of [1, -1]) {
        const a = add(Hc, [sx * 0.12 * hs, 0.05 * hs, -0.06]);
        e(a, [0.03, 0.03, 0.03], 'head', 'tie', 'tie');
        cone(add(a, [sx * 0.02, 0, 0]), add(a, [sx * 0.07, -0.16, -0.03]), 0.04, 0.018, 'head', 'hair', 'hair');
      }
    }
    G.tie = 0.01;
  }
  if (L.moustache) for (const sx of [1, -1]) cone(add(Hc, [sx * 0.005, -0.065 * hs, 0.135 * hs]), add(Hc, [sx * 0.065, -0.095 * hs, 0.1 * hs]), 0.019, 0.01, 'head', 'hair', 'beard');
  if (L.crest) {
    // a swept crest from the brow over the crown (Vesk)
    cone(add(Hc, [0, 0.12 * hs, 0.06 * hs]), add(Hc, [0, 0.2 * hs, -0.06 * hs]), 0.02, 0.03, 'head', 'crest', 'crest', { sz: 2.2 });
    cone(add(Hc, [0, 0.2 * hs, -0.06 * hs]), add(Hc, [0, 0.12 * hs, -0.2 * hs]), 0.03, 0.008, 'head', 'crest', 'crest', { sz: 2.2 });
    G.crest = 0.02;
  }
  if (L.hardhat) {
    e(add(Hc, [0, 0.13 * hs, -0.01]), [0.15 * hs, 0.12 * hs, 0.16 * hs], 'head', 'hardhat', 'hat', { cutBelow: Hc[1] + 0.09 * hs });
    e(add(Hc, [0, 0.09 * hs, 0.0]), [0.18 * hs, 0.014, 0.2 * hs], 'head', 'hardhat', 'hat');
    G.hat = 0.015;
  }
  if (L.helmet) {
    e(add(Hc, [0, 0.07, -0.02]), [0.21, 0.19, 0.2], 'head', 'helmet', 'hat', { cutBelow: Hc[1] + 0.02 });
    P.push({ type: 'box', c: add(Hc, [0, 0.06, 0.17]), h: [0.13, 0.03, 0.03], round: 0.02, bone: 'head', mat: 'visor', group: 'visor' });
    G.hat = 0.02; G.visor = 0;
  }
  if (L.hat) {
    e(add(Hc, [0, 0.17, -0.01]), [0.25, 0.022, 0.24], 'head', 'hat', 'hat');
    e(add(Hc, [0, 0.23, -0.01]), [0.15, 0.08, 0.15], 'head', 'hat', 'hat', { cutBelow: Hc[1] + 0.17 });
    G.hat = 0.02;
  }

  // ================================================================= GARMENT
  G.tunic = 0.07;
  const folds = (top, amp) => (x, y, z) => {
    if (y > top) return 0;
    const t = Math.min(1, (top - y) / Math.max(0.15, top - hemY));
    return Math.sin(Math.atan2(x, z) * 9 + t * 1.5) * amp * t;
  };
  if (L.outfit === 'lba') {
    // LBA2's in-game Twinsen (measured on the original model, fractions of the height H ≈ 2.1): a cape-like
    // upper robe from flat shoulders (±0.12 H at 0.74 H) whose sides are the sleeves (they hang from the
    // shoulders to 0.41 H, out to ±0.21 H); a thin orange belt at 0.41–0.48 H; a nearly straight robe from the
    // belt to the ankles (±0.16 H wide, ±0.13 H deep); the neck shows above the collar.
    const HH = 2.1, f = (v) => v * HH;
    e([0, f(0.725), f(0.012)], [f(0.118), f(0.03), f(0.07)], 'torso', 'tunic', 'tunic');
    // the yoke: shoulders rounding out from the collar (±0.12 H at 0.74 H, ±0.16 at 0.70, ±0.18 at 0.66 —
    // the measured outline) and meeting the sleeves' outer edge, so cape and sleeves read as one shape
    e([0, f(0.62), f(0.015)], [f(0.205), f(0.15), f(0.088)], 'torso', 'tunic', 'tunic');
    // (the robe under the cape and the belt ignore the shoulders when skinning: the arm hangs right beside
    // them, and a raised arm would drag the belt up into a diagonal streak)
    const still = ['torso', 'hips', 'neck'];
    ccone(f(0.735), f(0.47), f(0.112), f(0.1), 'torso', 'tunic', 'tunic', { sz: 0.66, cz: f(0.03), chain: still });
    ccone(f(0.47), hemY, f(0.112), hemR, 'skirt', 'tunic', 'tunic', { sz: L.skirtDepth || 0.8, cz: f(0.015), wobble: folds(f(0.44), 0.01) });
    ccone(hemY + 0.035, hemY, hemR * 0.995, hemR + 0.004, 'skirt', 'tunicTrim', 'hem', { sz: L.skirtDepth || 0.8, cz: f(0.015), round: 0.006 });
    G.hem = 0.006;
    P.push({ type: 'ccone', c: [0, f(0.445), f(0.03)], h: f(0.033), rt: f(0.108), rb: f(0.11), round: 0.008, sz: 0.74, bone: 'torso', mat: 'belt', group: 'belt', chain: still });
    G.belt = 0.004;
  } else if (L.outfit === 'tw') {
    // Twinsen (LBA2 in-game model + the classic render): ONE continuous tunic. A soft upper body whose
    // width mostly comes from the bell sleeves hanging over it (no ball shoulders: a sloped yoke runs from
    // the collar to the shoulder points), a clear waist with a thin orange belt, and a skirt that flares
    // from the waist to the ankle with a few big soft folds and a thin hem.
    const top = neckP[1] - 0.025;
    const waistY = ty - 0.06;
    const chestR = 0.15 * wide;
    if (L.sleeve === 'puff') {
      // the classic render: the upper tunic is ONE big soft mass from the collar to the hips that the puffed
      // sleeves sink into; the medallion lies on its top. Below it a wide, nearly straight skirt.
      const mb = ty - 0.12;
      // (full in front as well, so from the front it reads as one dome with the puffs at its sides — not as
      // two lobes either side of a narrow chest)
      e([0, ty + 0.2, 0.02], [0.29 * wide, 0.33, 0.215], 'torso', 'tunic', 'tunic', { wobble: (x, y, z) => Math.sin(Math.atan2(x, z) * 7 + y * 4) * 0.004 });
      e([0, top, 0.0], [0.056, 0.03, 0.054], 'torso', 'tunicTrim', 'tunic');
      ccone(mb + 0.08, hemY, 0.22 * wide, hemR, 'skirt', 'tunic', 'tunic', { sz: 0.8, wobble: folds(mb, 0.012) });
    } else {
    e([0, shY - 0.03, -0.005], [shX * 1.02, 0.065, 0.105], 'torso', 'tunic', 'tunic');
    e([0, ty + 0.27, 0.012], [chestR, 0.235, 0.135], 'torso', 'tunic', 'tunic');
    e([0, top, 0.0], [0.056, 0.03, 0.054], 'torso', 'tunicTrim', 'tunic');
    ccone(ty + 0.2, waistY, chestR * 0.96, 0.122 * wide, 'torso', 'tunic', 'tunic', { sz: 0.82 });
    ccone(waistY + 0.012, hemY, 0.126 * wide, hemR, 'skirt', 'tunic', 'tunic', { sz: 0.84, wobble: folds(waistY - 0.03, 0.013) });
    }
    ccone(hemY + 0.03, hemY, hemR * 0.995, hemR + 0.004, 'skirt', 'tunicTrim', 'hem', { sz: 0.84, round: 0.006 });
    G.hem = 0.008;
    if (!L.noBelt) { P.push({ type: 'ccone', c: [0, waistY, 0.0], h: 0.013, rt: 0.13 * wide, rb: 0.132 * wide, round: 0.006, sz: 0.83, bone: 'torso', mat: 'belt', group: 'belt' }); G.belt = 0.003; }
  } else if (L.outfit === 'robe2') {
    // LBA2 Twinsen: a long robe. Broad rounded shoulders under a wide yoke, the robe
    // falls straight to the ankles with a little flare and a few big folds; an orange
    // belt with a knot at the waist; a darker hem band; a round collar.
    const top = neckP[1] - 0.03;
    const waistY = ty - 0.06;
    const chestR = 0.19 * wide * (L.shoulders || 1);
    for (const sx of [1, -1]) e([sx * shX * 0.78, shY - 0.025, 0], [0.11 * wide, 0.085, 0.11], 'torso', 'tunic', 'tunic');
    e([0, ty + 0.28, 0.012], [chestR, 0.25, 0.15], 'torso', 'tunic', 'tunic');
    e([0, top - 0.01, 0.0], [0.07, 0.035, 0.065], 'torso', 'tunicTrim', 'tunic');
    ccone(ty + 0.24, waistY, chestR * 0.97, 0.168 * wide, 'torso', 'tunic', 'tunic', { sz: 0.78 });
    ccone(waistY + 0.02, hemY, 0.17 * wide, hemR, 'skirt', 'tunic', 'tunic', { sz: 0.8, wobble: folds(waistY - 0.05, 0.012) });
    ccone(hemY + 0.05, hemY, hemR * 0.99, hemR + 0.006, 'skirt', 'tunicTrim', 'hem', { sz: 0.8, round: 0.008 });
    G.hem = 0.006;
    // the belt is its own hard-edged band sitting on the robe (no colour bleeding)
    if (!L.noBelt) {
      P.push({ type: 'ccone', c: [0, waistY, 0], h: 0.028, rt: 0.205 * wide, rb: 0.208 * wide, round: 0.01, sz: 0.8, bone: 'torso', mat: 'belt', group: 'belt' });
      e([0.06, waistY - 0.005, 0.208 * wide * 0.8 + 0.01], [0.032, 0.026, 0.02], 'torso', 'belt', 'belt');
      cone([0.06, waistY - 0.015, 0.208 * wide * 0.8 + 0.014], [0.08, waistY - 0.13, 0.208 * wide * 0.8 + 0.03], 0.013, 0.009, 'skirt', 'belt', 'belt');
      G.belt = 0.004;
    }
  } else if (L.outfit === 'bell') {
    // Twinsen's tunic (after the LBA2 model): broad rounded shoulders and a
    // deep chest, a straight-cut smock that flares only a little and stops at
    // the knee so the trousers show, a darker hem band and a round collar
    const top = neckP[1] - 0.03;
    const chestR = 0.2 * wide * (L.shoulders || 1);
    for (const sx of [1, -1]) e([sx * shX * 0.78, shY - 0.03, 0], [0.12 * wide, 0.095, 0.115], 'torso', 'tunic', 'tunic');
    e([0, ty + 0.3, 0.012], [chestR, 0.24, 0.155], 'torso', 'tunic', 'tunic');
    e([0, top - 0.01, 0.0], [0.085, 0.04, 0.075], 'torso', 'tunicTrim', 'tunic');
    ccone(ty + 0.3, hemY, chestR * 0.99, hemR, 'skirt', 'tunic', 'tunic', { sz: 0.7, wobble: folds(ty + 0.05, 0.006) });
    ccone(hemY + 0.04, hemY, hemR * 0.985, hemR + 0.006, 'skirt', 'tunicTrim', 'hem', { sz: 0.7, round: 0.006 });
    G.hem = 0.006;
  } else {
    // fitted tunic / dress / robe with a belt
    const waistK = L.slim ? 0.84 : 1.05;
    e([0, ty + 0.32 * torsoLen, 0.0], [(L.slim ? 0.17 : 0.19) * wide, 0.18 * torsoLen, 0.13 * (grobo ? 1.3 : 1)], 'torso', 'tunic', 'tunic');
    e([0, ty + 0.1, belly * 0.5], [0.15 * wide * waistK + belly * 0.45, 0.17, 0.115 * (grobo ? 1.4 : 1) + belly], 'torso', 'tunic', 'tunic');
    for (const sx of [1, -1]) e([sx * shX * 0.85, shY - 0.03, 0], [0.075 * slim * (grobo ? 1.3 : 1), 0.055, 0.07], 'torso', 'tunic', 'tunic');
    e([0, neckP[1] - 0.06, 0], [0.08 * wide, 0.05, 0.07], 'torso', 'tunic', 'tunic');
    const rt = (0.15 * wide * waistK + belly * 0.4) * 1.05;
    ccone(ty + 0.06, hemY, rt, hemR, 'skirt', 'tunic', 'tunic', { sz: 0.78, cz: belly * 0.3, wobble: folds(ty, 0.01) });
    torus([0, hemY + 0.012, belly * 0.2], hemR - 0.004, 0.014, 'skirt', 'tunicTrim', 'tunic', { sz: 0.78 });
    const beltR = rt + 0.01;
    torus([0, ty + 0.04, belly * 0.35], beltR, 0.022, 'torso', 'belt', 'trim', { sz: 0.78 + belly });
    e([0, ty + 0.04, belly * 0.35 + beltR * (0.78 + belly) + 0.016], [0.034, 0.027, 0.012], 'torso', 'buckle', 'trim');
    G.trim = 0;
    if (L.collar) ccone(neckP[1] + 0.05, neckP[1] - 0.05, 0.072, 0.1, 'torso', 'tunicTrim', 'trim', { sz: 0.85, round: 0.01 });
    if (L.buttons) for (let i = 0; i < 4; i++) e([0, ty + 0.4 - i * 0.12, 0.165 + belly * 0.4 - Math.abs(i - 1.5) * 0.004], [0.016, 0.016, 0.01], 'torso', 'buckle', 'trim');
    if (L.apron) { P.push({ type: 'box', c: [0, ty - 0.04, 0.155 + belly * 1.05], h: [0.15, 0.25, 0.01], round: 0.008, bone: 'skirt', mat: 'apron', group: 'apron' }); G.apron = 0; }
  }
  if (L.medallion) {
    // Sendell's medallion on a red cord (the medal itself is a separate metal mesh)
    // (the cord is a tube mesh, see addMedallion: too thin for the body's voxel size)
  }

  // ================================================================= ARMS (sleeves; hands are rigid parts)
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    const sh = B['sh' + s].pos, el = B['el' + s].pos, hd = B['hand' + s].pos;
    const g = 'arm' + s;
    G[g] = 0.03;
    const thick = (grobo ? 1.35 : 1) * slim * (kid ? 0.95 : teen ? 0.88 : 1);
    if (L.outfit === 'lba') {
      // the cape's sides: a broad, flat sleeve hanging from the shoulder, its hem cut level at 0.41 H
      const HH = 2.1;
      // (a slanted wedge from the neck line out to the hem's outer corner, cut level at the hem: with the torso
      // it makes the original's trapezoid — a straight shoulder slope from ±0.12 H at 0.74 H to ±0.21 H at 0.41 H)
      cone([sx * 0.115 * HH, 0.6 * HH, 0.02 * HH], [sx * 0.135 * HH, 0.43 * HH, 0.025 * HH], 0.07 * HH, 0.075 * HH, 'sh' + s, 'tunic', g, { sz: 1.45, cutBelow: 0.41 * HH });
      cone(el, add(hd, [0, 0.01, 0]), 0.03, 0.026, 'el' + s, 'skin', g + 'f');
      G[g] = 0.03; G[g + 'f'] = 0.02;
    } else if (L.outfit === 'tw' && L.sleeve === 'puff') {
      // the classic render: a huge rounded puff hanging from the shoulder — narrow at the top, widest around
      // the elbow, closing again at the wrist where the hand comes out (no shoulder pads: the volume is cloth)
      const sw = L.sleeveW || 1;
      const wr = lerp3(el, hd, 0.86);
      // (starts close to the neck so its top flows into the dome of the upper tunic — no notch at the shoulder)
      cone(add(sh, [-sx * 0.09, 0.02, -0.02]), add(el, [0, 0, -0.03]), 0.1 * thick, 0.19 * thick * sw, 'sh' + s, 'tunic', g);
      cone(add(el, [0, 0, -0.03]), wr, 0.19 * thick * sw, 0.065 * thick, 'el' + s, 'tunic', g);
      torus(wr, 0.058 * thick, 0.012, 'el' + s, 'tunicTrim', 'cuff' + s);
      cone(el, add(hd, [0, 0.01, 0]), 0.036 * thick, 0.03 * thick, 'el' + s, 'skin', g + 'f');
      G[g] = 0.06; G[g + 'f'] = 0.02; G['cuff' + s] = 0.008;
    } else if (L.outfit === 'tw') {
      // a bell: narrow at the shoulder, opening wide below the elbow; the open end is cut flat with a thin
      // wall (sdBell) so it reads as cloth with a hole the hand comes out of, not a balloon
      const sw = L.sleeveW || 1;
      // (the sleeve already widens from the shoulder, so with the arms down the two sleeves and the chest
      // read as one cape-like trapezoid, as in LBA2 — not a narrow torso with flared cuffs)
      cone(add(sh, [-sx * 0.02, 0.0, 0]), el, 0.085 * thick, 0.155 * thick * sw, 'sh' + s, 'tunic', g);
      const end = lerp3(el, hd, L.sleeveEnd ?? 0.78);
      P.push({ type: 'bell', a: el, b: end, r1: 0.155 * thick * sw, r2: 0.205 * thick * sw, wall: 0.022, bone: 'el' + s, mat: 'tunic', group: g });
      cone(el, add(hd, [0, 0.01, 0]), 0.036 * thick, 0.03 * thick, 'el' + s, 'skin', g + 'f');
      G[g + 'f'] = 0.02;
    } else if (L.outfit === 'robe2') {
      // wide kimono sleeve: from the shoulder it opens into a bell that hangs past the elbow,
      // so with the arms down it reads like a short cape (LBA2 Twinsen)
      // a straight-sided funnel (no puff): narrow at the shoulder, widest at the cuff
      const sw = L.sleeveW || 1;
      cone(add(sh, [-sx * 0.015, -0.01, 0]), el, 0.07 * thick * Math.min(sw, 1.12), 0.095 * thick * sw, 'sh' + s, 'tunic', g);
      const end = lerp3(el, hd, 0.8);
      cone(el, end, 0.095 * thick * sw, 0.14 * thick * sw, 'el' + s, 'tunic', g, { sz: 0.75 });
      torus(end, 0.133 * thick * sw, 0.011, 'el' + s, 'tunicTrim', 'cuff' + s, { sz: 0.75 });
      cone(el, add(hd, [0, 0.01, 0]), 0.04 * thick, 0.033 * thick, 'el' + s, 'skin', g + 'f');
      G[g + 'f'] = 0.025;
      G['cuff' + s] = 0.01;
    } else if (L.outfit === 'bell') {
      // wide straight sleeve, slightly flared, ending above the wrist
      cone(add(sh, [-sx * 0.02, -0.02, 0]), el, 0.078 * thick, 0.074 * thick, 'sh' + s, 'tunic', g);
      const end = lerp3(el, hd, 0.7);
      cone(el, end, 0.074 * thick, 0.088 * thick, 'el' + s, 'tunic', g, { sz: 0.9 });
      torus(end, 0.08 * thick, 0.012, 'el' + s, 'tunicTrim', 'cuff' + s, { sz: 0.9 });
      cone(el, add(hd, [0, 0.01, 0]), 0.042 * thick, 0.034 * thick, 'el' + s, 'skin', g + 'f');
      G[g + 'f'] = 0.025;
      G['cuff' + s] = 0.01;
    } else {
      const sleeve = L.outfit === 'robe' || L.outfit === 'dress' ? 0.92 : 0.5;
      cone(add(sh, [0, -0.02, 0]), el, 0.06 * thick, 0.052 * thick, 'sh' + s, 'tunic', g);
      cone(el, lerp3(el, hd, sleeve), 0.054 * thick, 0.06 * thick, 'el' + s, 'tunic', g);
      torus(lerp3(el, hd, sleeve), 0.055 * thick, 0.013, 'el' + s, 'tunicTrim', 'cuff' + s);
      G['cuff' + s] = 0.006;
      cone(el, add(hd, [0, 0.01, 0]), 0.045 * thick, 0.034 * thick, 'el' + s, bunny ? 'fur' : 'skin', g + 'f');
      G[g + 'f'] = 0.025;
    }
  }

  if (L.brace) {
    // brass forearm brace with two rings
    const el = B.elR.pos, hd = B.handR.pos;
    cone(lerp3(el, hd, 0.15), lerp3(el, hd, 0.75), 0.06, 0.052, 'elR', 'brass', 'brace');
    for (const k of [0.2, 0.68]) torus(lerp3(el, hd, k), 0.06, 0.012, 'elR', 'brassDark', 'brace');
    G.brace = 0.005;
  }

  // ================================================================= LEGS (shoes are rigid parts)
  for (const s of ['L', 'R']) {
    const hp = B['hip' + s].pos, kn = B['knee' + s].pos, ft = B['foot' + s].pos;
    const g = 'leg' + s;
    G[g] = 0.03;
    const thick = (grobo ? 1.5 : 1) * slim * (kid ? 0.92 : teen ? 0.86 : 1) * (L.outfit === 'bell' ? 1.12 : 1);
    cone(hp, kn, 0.075 * thick, 0.058 * thick, 'hip' + s, 'pants', g);
    cone(kn, add(ft, [0, 0.0, 0]), 0.056 * thick, 0.046 * thick, 'knee' + s, 'pants', g);
  }

  // ---- skinning chains (candidate bones per owning primitive)
  const chains = {
    head: ['head', 'neck'], neck: ['neck', 'head', 'torso'], torso: ['torso', 'hips', 'neck', 'shL', 'shR'],
    skirt: ['torso', 'hips', 'skirtF', 'skirtB', 'skirtL', 'skirtR'],
  };
  for (const s of ['L', 'R']) {
    chains['sh' + s] = ['sh' + s, 'el' + s, 'torso'];
    chains['el' + s] = ['el' + s, 'sh' + s, 'hand' + s];
    chains['hip' + s] = ['hip' + s, 'knee' + s, 'hips'];
    chains['knee' + s] = ['knee' + s, 'hip' + s, 'foot' + s];
  }
  hairBits.forEach((b, i) => { chains[b] = [b, hairBits[i - 1] || 'head', hairBits[i + 1] || b]; });

  const sk = L.skin || '#f0c49b';
  const colors = {
    skin: sk, cheek: mixHex(sk, '#ff8a7a', 0.14), nose: mixHex(sk, '#ff9a8a', 0.12), hair: L.hair || '#3b2414', tie: L.tie || '#c8452f',
    tunic: L.tunic, tunicTrim: L.tunicTrim || L.tunic, belt: L.belt || '#6b4423', buckle: '#d8b04a', pants: L.pants, cord: '#c0302a',
    fur: L.fur, furDark: L.furDark, muzzle: L.fur ? mixHex(L.fur, '#ffffff', 0.4) : '#fff', nosePink: '#ff8fb0', teeth: '#fffdf0', skinDark: mixHex(sk, '#000000', 0.15),
    ridge: L.ridge || '#3e7a62', hat: L.hat || '#d8b94a', apron: L.apron || '#fff',
    crest: L.crest || '#5a4a8a', hardhat: L.hardhat || '#e8c030', helmet: L.helmet || '#2f7a84', visor: '#1a2830', brass: '#c89a48', brassDark: '#8a6428',
  };
  const waistY = ty - 0.06;
  const paint = (p, m, col) => {
    // LBA2 robe: the lower robe reads darker than the top
    if ((L.outfit === 'robe2' || L.outfit === 'tw' || L.outfit === 'lba') && m === 'tunic' && p.y < waistY) col.multiplyScalar(0.8 + 0.12 * Math.min(1, p.y / waistY));
    if (m === 'fur' && L.furDark && p.y > Hc[1] + 0.1 * hs) col.lerp(new THREE.Color(L.furDark), Math.min(1, (p.y - Hc[1] - 0.1) * 4));
  };
  const top = B.head.tip[1] + (bunny ? 0.5 : L.hairStyle === 'twinsen' ? 0.34 : 0.2);
  const halfW = L.outfit === 'bell' || L.outfit === 'robe2' || L.outfit === 'tw' || L.outfit === 'lba' ? 0.62 : grobo ? 0.72 : 0.55;
  return {
    prims: P, groups: G, joinK: 0.012, bones: B, chains, colors, paint, hard: ['belt', 'buckle', 'visor', 'brassDark', 'hardhat'],
    bounds: { min: [-halfW, 0.0, -0.55], max: [halfW, top, 0.5] },
    cell: kid || teen ? 0.012 : 0.014,
    face, Hc, hs, hipsY,
  };
}

function mixHex(a, b, t) { return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString(); }

// ------------------------------------------------------------------ rigid parts
// Hands: palm, four long fingers and a thumb (hand-bone space, fingers down)
function handDef(L, sx) {
  const kid = !!L.kid, grobo = L.race === 'grobo';
  const k = (kid ? 0.85 : 1.1) * (grobo ? 1.3 : 1) * (L.handS || 1);
  const m = L.race === 'bunny' ? 'fur' : 'skin';
  const P = [];
  const add2 = (o) => P.push({ bone: 'h', mat: m, group: 'h', ...o });
  if (L.handBall) {
    // LBA2: the hands are plain balls
    add2({ type: 'ell', c: [0, -0.045, 0.012], r: [L.handBall, L.handBall, L.handBall] });
    return { key: `handball-${L.handBall}-${L.skin}`, prims: P, groups: { h: 0.01 }, colors: { skin: L.skin || '#f0c49b', fur: L.fur || '#fff' },
      bounds: { min: [-0.1, -0.15, -0.09], max: [0.1, 0.06, 0.11] }, cell: 0.004 };
  }
  add2({ type: 'cone', a: [0, 0.035 * k, 0], b: [0, -0.02 * k, 0.004], r1: 0.022 * k, r2: 0.025 * k });
  add2({ type: 'ell', c: [0, -0.055 * k, 0.008 * k], r: [0.022 * k, 0.048 * k, 0.04 * k] });
  for (let i = 0; i < 4; i++) {
    const z = (-0.022 + i * 0.0145) * k;
    const len = (0.07 - Math.abs(i - 1.4) * 0.008) * k;
    add2({ type: 'cone', a: [0, -0.09 * k, z], b: [-sx * 0.012 * k, -0.09 * k - len, z + 0.006], r1: 0.0105 * k, r2: 0.009 * k });
  }
  add2({ type: 'cone', a: [-sx * 0.01 * k, -0.035 * k, 0.03 * k], b: [-sx * 0.03 * k, -0.075 * k, 0.055 * k], r1: 0.013 * k, r2: 0.011 * k });
  return {
    key: `hand-${L.race}-${kid}-${sx}-${L.skin || L.fur}-${L.handS || 1}`, prims: P, groups: { h: 0.012 }, colors: { skin: L.skin || '#f0c49b', fur: L.fur || '#fff' },
    bounds: { min: [-0.06 * k, -0.2 * k, -0.05 * k], max: [0.06 * k, 0.06 * k, 0.09 * k] }, cell: 0.0035,
  };
}
// Shoes: rounded clogs for Quetches, long feet for Rabbibunnies, round stumps for Grobos
function shoeDef(L) {
  const kid = !!L.kid, k = kid ? 0.85 : 1;
  const P = [];
  const s = (o) => P.push({ bone: 'f', mat: 'shoe', group: 'f', cutBelow: -0.099, ...o });
  if (L.race === 'bunny') {
    s({ type: 'ell', c: [0, -0.06, 0.08], r: [0.055, 0.04, 0.16] });
    s({ type: 'ell', c: [0, -0.04, -0.02], r: [0.05, 0.06, 0.06] });
  } else if (L.race === 'grobo') {
    s({ type: 'cone', a: [0, 0.06, 0], b: [0, -0.06, 0.01], r1: 0.085, r2: 0.1 });
    for (let i = -1; i <= 1; i++) P.push({ type: 'ell', c: [i * 0.045, -0.075, 0.095], r: [0.022, 0.02, 0.015], bone: 'f', mat: 'nail', group: 'n' });
  } else if (L.slippers) {
    // LBA2 Twinsen's slippers: low, long, the toe narrows to a slightly upturned point
    s({ type: 'ell', c: [0, -0.07, 0.05 * k], r: [0.062 * k, 0.034, 0.13 * k] });
    s({ type: 'cone', a: [0, -0.07, 0.12 * k], b: [0, -0.058, 0.215 * k], r1: 0.045 * k, r2: 0.012 * k });
    s({ type: 'ell', c: [0, -0.065, -0.035], r: [0.055 * k, 0.04, 0.06] });
    P.push({ type: 'cone', a: [0, 0.06, 0], b: [0, -0.04, 0.01], r1: 0.04 * k, r2: 0.046 * k, bone: 'f', mat: 'sock', group: 'f' });
  } else if (L.shoeBall) {
    // the classic render's shoes: big round domes, a little longer than wide, flat underneath
    const q = k * (L.shoeS || 1);
    s({ type: 'ell', c: [0, -0.04, 0.055 * q], r: [0.075 * q, 0.062 * q, 0.11 * q] });
    P.push({ type: 'cone', a: [0, 0.06, 0], b: [0, -0.02, 0.01], r1: 0.04 * k, r2: 0.048 * k, bone: 'f', mat: 'sock', group: 'f' });
  } else if (L.shoeToe) {
    // rounded shoe with a clear toe and direction: a full rounded toe box, a lower vamp, a heel
    const q = k * (L.shoeS || 1);
    s({ type: 'ell', c: [0, -0.055, 0.05 * q], r: [0.066 * q, 0.05, 0.13 * q] });
    s({ type: 'ell', c: [0, -0.05, 0.15 * q], r: [0.07 * q, 0.052, 0.07 * q] });
    s({ type: 'ell', c: [0, -0.055, -0.04 * q], r: [0.058 * q, 0.05, 0.058 * q] });
    P.push({ type: 'cone', a: [0, 0.06, 0], b: [0, -0.02, 0.01], r1: 0.04 * k, r2: 0.048 * k, bone: 'f', mat: 'sock', group: 'f' });
  } else {
    s({ type: 'ell', c: [0, -0.05, 0.045 * k], r: [0.07 * k, 0.055, 0.125 * k] });
    s({ type: 'ell', c: [0, -0.042, 0.13 * k], r: [0.074 * k, 0.06, 0.075 * k] });
    s({ type: 'ell', c: [0, -0.05, -0.035], r: [0.058 * k, 0.05, 0.06] });
    P.push({ type: 'cone', a: [0, 0.06, 0], b: [0, -0.02, 0.01], r1: 0.042 * k, r2: 0.05 * k, bone: 'f', mat: 'sock', group: 'f' });
  }
  return {
    key: `shoe-${L.race}-${kid}-${L.shoes}-${!!L.slippers}-${L.shoeToe ? 't' + (L.shoeS || 1) : ''}${L.shoeBall ? 'b' + (L.shoeS || 1) : ''}`, prims: P, groups: { f: 0.03, n: 0 }, colors: { shoe: L.shoes || '#6b4423', sock: L.pants || '#e8dcc0', nail: '#f4f0e0' },
    paint: (p, m, col) => { if (m === 'shoe' && p.y < -0.085) col.multiplyScalar(0.55); },
    bounds: { min: [-0.13, -0.11, -0.13], max: [0.13, 0.08, 0.3] }, cell: 0.0055,
  };
}
const rigidMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
function rigid(def, parent, pos = [0, 0, 0]) {
  const m = new THREE.Mesh(sculptRigid(def), rigidMat);
  m.position.set(...pos);
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// ------------------------------------------------------------------ eyes & mouth
const matWhite = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 });
const matPupil = new THREE.MeshStandardMaterial({ color: '#101014', roughness: 0.2 });
const matHi = new THREE.MeshBasicMaterial({ color: '#ffffff' });
const matMouth = new THREE.MeshStandardMaterial({ color: '#5a1a14', roughness: 0.6 });
function addFace(def, bones, L) {
  const F = def.face, head = bones.head, hp = def.bones.head.pos, Hc = def.Hc;
  const eyes = [];
  for (const sx of [1, -1]) {
    const g = new THREE.Group();
    g.position.set(sx * F.eyeX, Hc[1] - hp[1] + F.eyeY, Hc[2] - hp[2] + F.eyeZ);
    const r = F.eyeR;
    const w = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), L.eyeWhite ? new THREE.MeshStandardMaterial({ color: L.eyeWhite, roughness: 0.35 }) : matWhite);
    w.scale.set(1, 1.12 * (L.eyeOval || 1), 0.78);
    g.add(w);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(r * 0.5, 12, 8), new THREE.MeshStandardMaterial({ color: L.eyes || '#3a2a1a', roughness: 0.25 }));
    iris.position.set(-sx * r * 0.12 + sx * r * (L.lookOut || 0), -r * 0.02 + r * (L.lookUp || 0), r * 0.58);
    iris.scale.set(1, 1.1, 0.45);
    g.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(r * 0.27, 10, 6), matPupil);
    pupil.position.set(-sx * r * 0.12 + sx * r * (L.lookOut || 0), -r * 0.02 + r * (L.lookUp || 0), r * 0.7);
    pupil.scale.set(1, 1.1, 0.4);
    g.add(pupil);
    const hi = new THREE.Mesh(new THREE.SphereGeometry(r * 0.1, 6, 4), matHi);
    hi.position.set(-sx * r * 0.12 + r * 0.16, r * 0.2, r * 0.74);
    g.add(hi);
    // thin upper lid rim gives the eye a shape without making it sleepy
    const lid = new THREE.Mesh(new THREE.SphereGeometry(r * 1.08, 16, 6, 0, Math.PI * 2, 0, Math.PI * 0.26), new THREE.MeshStandardMaterial({ color: L.skin || L.fur || '#f0c49b', roughness: 0.7 }));
    lid.scale.set(1.02, 1.14, 0.84);
    lid.rotation.x = 0.4;
    if (!L.noLid) g.add(lid);
    if (L.lashes) {
      const l = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, r * 0.1, 4, 12, Math.PI), matPupil);
      l.position.z = r * 0.2; l.rotation.x = -0.4; l.scale.set(1, 1.1, 1);
      g.add(l);
    }
    head.add(g);
    eyes.push(g);
    if (L.noBrow) continue;
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.009 * def.hs * (L.brow || 1), 0.05 * def.hs, 2, 6), new THREE.MeshStandardMaterial({ color: L.hair || L.furDark || '#3a2a1a', roughness: 0.9 }));
    brow.rotation.z = Math.PI / 2 - sx * (L.browFlat ? -0.05 : L.brow ? 0.08 : 0.2);
    brow.position.set(sx * F.eyeX * 1.05, Hc[1] - hp[1] + F.eyeY + F.eyeR * 1.55, Hc[2] - hp[2] + F.eyeZ + 0.004);
    head.add(brow);
  }
  // mouth: Twinsen's little open "o", a gentle smile for others
  const my = Hc[1] - hp[1] + F.mouthY, mz = Hc[2] - hp[2] + F.mouthZ;
  if (L.mouth === 'open') {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.022 * def.hs * (L.mouthS || 1), 12, 8), L.mouthDark ? new THREE.MeshStandardMaterial({ color: L.mouthDark, roughness: 0.7 }) : matMouth);
    m.scale.set(1.25, L.mouthS ? 0.5 : 0.62, L.mouthS ? 0.18 : 0.35);
    m.position.set(0, my, mz);
    head.add(m);
  } else if (L.mouth === 'wide') {
    // the classic render: a wide open mouth — flat along the top, round underneath, dark inside — with a thin
    // lower lip; about as wide as the two eyes together
    const w = 0.05 * def.hs * (L.mouthW || 1);
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: L.mouthDark || '#2a0e08', roughness: 0.8, side: THREE.DoubleSide }));
    m.scale.set(w, w * (L.mouthH || 0.6), w * 0.32);
    m.position.set(0, my, mz - 0.004);
    head.add(m);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(1, 0.085, 6, 24, Math.PI), new THREE.MeshStandardMaterial({ color: L.lip || '#d07a48', roughness: 0.7 }));
    lip.rotation.z = Math.PI; lip.scale.set(w * 1.02, w * ((L.mouthH || 0.6) + 0.02), w * 0.5);
    lip.position.set(0, my, mz - 0.002);
    head.add(lip);
  } else if (L.mouth === 'grin') {
    // an open, friendly smile: a dark half-moon with the corners turned up
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.03 * def.hs, 16, 10, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), matMouth);
    m.scale.set(1.45, 0.95, 0.4);
    m.position.set(0, my + 0.012 * def.hs, mz + 0.002);
    head.add(m);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.034 * def.hs, 0.0045, 6, 16, Math.PI), new THREE.MeshStandardMaterial({ color: '#c8705a', roughness: 0.6 }));
    lip.rotation.set(0, 0, Math.PI); lip.scale.set(1.28, 0.85, 1);
    lip.position.set(0, my + 0.012 * def.hs, mz + 0.004);
    head.add(lip);
  } else if (L.mouth === 'line') {
    // a straight, slightly downturned mouth: calm and grown-up
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.0065, 0.042 * def.hs, 2, 6), matMouth);
    m.rotation.z = Math.PI / 2;
    m.position.set(0, my, mz + 0.004);
    head.add(m);
  } else if (L.race !== 'grobo') {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.024 * def.hs, 0.005, 6, 12, Math.PI * 0.8), matMouth);
    m.rotation.set(-0.3, 0, Math.PI * 1.1);
    m.position.set(0, my, mz);
    head.add(m);
  }
  if (L.glasses) {
    const gm = new THREE.MeshStandardMaterial({ color: '#2a2a2a', metalness: 0.5, roughness: 0.4 });
    for (const sx of [1, -1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(F.eyeR * 1.35, 0.005, 6, 16), gm);
      ring.position.set(sx * F.eyeX, Hc[1] - hp[1] + F.eyeY, Hc[2] - hp[2] + F.eyeZ + 0.03);
      head.add(ring);
    }
  }
  if (L.goggles) {
    // engineer's goggles pushed up on the forehead: brass rims, dark lenses, a strap
    const brass = new THREE.MeshStandardMaterial({ color: '#c89a48', metalness: 0.6, roughness: 0.35 });
    const lens = new THREE.MeshStandardMaterial({ color: '#203840', metalness: 0.3, roughness: 0.15 });
    const gy = Hc[1] - hp[1] + 0.13 * def.hs, gz = Hc[2] - hp[2] + 0.085 * def.hs;
    for (const sx of [1, -1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 8, 18), brass);
      ring.position.set(sx * 0.042, gy, gz); ring.rotation.x = -0.5; head.add(ring);
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.028, 16), lens);
      l.position.set(sx * 0.042, gy, gz + 0.004); l.rotation.x = -0.5; head.add(l);
    }
    const strap = new THREE.Mesh(new THREE.TorusGeometry(0.118 * def.hs, 0.008, 6, 28), new THREE.MeshStandardMaterial({ color: '#3a2a20', roughness: 0.8 }));
    strap.position.set(0, gy - 0.005, Hc[2] - hp[2] - 0.01); strap.rotation.x = Math.PI / 2 - 0.45; strap.scale.set(1, 1.12, 1); head.add(strap);
  }
  return eyes;
}

function addMedallion(def, bones, L = {}) {
  const torso = bones.torso, tp = def.bones.torso.pos;
  const gold = new THREE.MeshStandardMaterial({ color: '#e0b030', metalness: 0.65, roughness: 0.35 });
  const g = new THREE.Group();
  const my = L.medalY ?? (L.chain ? 0.3 : 0.35);
  // rest it on the chest: march the body's distance field from the front to the cloth surface
  const sdf = makeSDF(def.prims, def.groups, def.joinK);
  const surfZ = (y, x = 0) => { for (let z = 0.4; z > -0.1; z -= 0.004) if (sdf(x, tp[1] + y, z) < 0) return z; return 0.18; };
  const mz = surfZ(my) + 0.009;
  g.position.set(0, my, mz);
  g.rotation.x = -0.2;
  const R0 = L.medalR ?? (L.chain ? 0.06 : 0.045);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(R0, R0, 0.012, L.medalSides || 24), gold);
  disc.rotation.x = Math.PI / 2;
  g.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R0 - 0.002, 0.0055, 6, 24), gold);
  rim.position.z = 0.006;
  g.add(rim);
  const sym = new THREE.Mesh(new THREE.TorusGeometry(R0 * 0.45, 0.005, 6, 16, Math.PI * 1.5), gold);
  sym.position.z = 0.007;
  g.add(sym);
  torso.add(g);
  // red cord: tube around the neck down to the medal, in torso space
  const ny = def.bones.neck.pos[1] - tp[1];
  const yb = (L.medalY ?? (L.chain ? 0.3 : 0.35)) + (L.medalR ?? 0.045) * 0.7;
  // the strap runs over the cloth: each point is pushed out to the surface along its direction from the neck
  const zr = (y) => surfZ(y) + 0.006;
  const pts = [[0.012, yb, zr(yb)], [0.045, ny - 0.07, Math.max(0.13, zr(ny - 0.07))], [0.05, ny - 0.03, 0.02], [0.03, ny - 0.02, -0.045], [0, ny - 0.02, -0.055],
    [-0.03, ny - 0.02, -0.045], [-0.05, ny - 0.03, 0.02], [-0.045, ny - 0.07, Math.max(0.13, zr(ny - 0.07))], [-0.012, yb, zr(yb)]].map((p) => new THREE.Vector3(...p));
  const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, L.chain ? 0.005 : 0.006, 6), L.chain ? gold : new THREE.MeshStandardMaterial({ color: L.cord || '#c0302a', roughness: 0.6 }));
  torso.add(cord);
}

// ------------------------------------------------------------------ public API
// Split a body design into body + arms (sleeves, forearms, cuffs), sculpted separately.
const ARM = /^((arm|cuff)[LR]|brace)/;
function splitArms(def) {
  const B = def.bones;
  const ys = ['shL', 'shR', 'handL', 'handR'].map((b) => B[b].pos[1]);
  const arms = {
    ...def, key: def.key + '#arms',
    prims: def.prims.filter((p) => p.sub || ARM.test(p.group)),
    cell: def.prims.some((p) => p.type === 'bell') ? def.cell * 0.7 : def.cell,
    // a sleeve moves with its own arm only: blending its top with the torso stretches the cloth into streaks
    // when the arm is raised (the top of a big sleeve sits close to the neck)
    chains: { ...def.chains, shL: ['shL', 'elL'], shR: ['shR', 'elR'] },
    bounds: { min: [def.bounds.min[0], Math.max(0, Math.min(...ys) - 0.14), def.bounds.min[2]], max: [def.bounds.max[0], Math.max(...ys) + 0.16, def.bounds.max[2]] },
  };
  return { ...def, prims: def.prims.filter((p) => p.sub || !ARM.test(p.group)), arms };
}

const defs = {};
export function createCharacter(lookName, overrides = {}) {
  const L = { ...(LOOKS[lookName] || LOOKS.twinsen), ...overrides };
  const polyName = 'poly' in L ? L.poly : lookName; // (every look has a Blender model unless poly: null)
  const poly = polyName && POLY[polyName];
  // DRESS-1: a change of colours only gives a poly model the same body: the base look's skeleton, its own recoloured mesh
  const onlyColours = poly && Object.keys(overrides).every((k) => DRESS_ROLES.includes(k));
  const key = lookName + JSON.stringify(onlyColours ? {} : overrides);
  const def = defs[key] ??= splitArms({ ...design(onlyColours ? { ...(LOOKS[lookName] || LOOKS.twinsen) } : L), key });
  if (poly) return polyCharacter({ ...L, poly: polyName, recolor: onlyColours && Object.keys(overrides).length ? dressMap(LOOKS[lookName] || LOOKS.twinsen, overrides) : null }, def, poly);
  const { mesh, bones } = buildSculpted(def);
  const root = new THREE.Group();
  root.add(mesh);
  // the arms are a second skinned surface on the same skeleton: a sleeve that touches the robe at rest
  // would otherwise be fused into it and tear the robe open (stretched strips) when the arm swings
  const arms = new THREE.SkinnedMesh(buildSculpted(def.arms).mesh.geometry, mesh.material);
  arms.frustumCulled = false;
  mesh.add(arms);
  arms.bind(mesh.skeleton, mesh.bindMatrix);
  const eyes = addFace(def, bones, L);
  if (L.medallion) addMedallion(def, bones, L);
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    rigid(handDef(L, sx), bones['hand' + s]);
    rigid(shoeDef(L), bones['foot' + s]);
  }
  return finishRig(L, def, root, mesh, bones, eyes);
}

function finishRig(L, def, root, mesh, bones, eyes) {
  const tailSegs = Object.keys(bones).filter((k) => /^tail\d/.test(k)).sort().map((k) => bones[k]);
  const tail = tailSegs.length ? Object.assign(bones.tail0, { segs: tailSegs }) : null;
  const j = {
    body: bones.body, hips: bones.hips, torso: bones.torso, neck: bones.neck, head: bones.head, tail, eyes,
    armL: { sh: bones.shL, el: bones.elL, hand: bones.handL }, armR: { sh: bones.shR, el: bones.elR, hand: bones.handR },
    legL: { hip: bones.hipL, knee: bones.kneeL, foot: bones.footL }, legR: { hip: bones.hipR, knee: bones.kneeR, foot: bones.footR },
    skirt: { F: bones.skirtF, B: bones.skirtB, L: bones.skirtL, R: bones.skirtR },
    ears: bones.earL ? { L: bones.earL, R: bones.earR } : null,                                    // (a Grobo's: Baldino)
    trunk: bones.trunk0 ? Object.keys(bones).filter((k) => /^trunk\d/.test(k)).sort().map((k) => bones[k]) : null,
  };
  const rig = new Rig(root, j);
  rig.mesh = mesh;
  rig.height = def.bones.head.tip[1];
  if (L.armSpread != null) rig.armSpread = L.armSpread;
  if (L.outfit === 'lba') rig.capeArms = true;   // (JUMP-CAPE: the cape's sides are tied to the arms: rig.js keeps them in)
  // his own timing where the original's clips give it (Baldino, ANIM.HQR 715/717/718: SRC-2)
  if (L.walkCycle) rig.walkCycle = L.walkCycle;
  if (L.idlePeriod) rig.idlePeriod = L.idlePeriod;
  if (L.talkStyle) rig.talkStyle = L.talkStyle;
  // the robe below the belt (Twinsen) or the outfit's legs (Zoé) are carried by the legs: strides need no limit
  if (L.outfit === 'lba' || L.outfit === 'gown') rig.legCloth = true;
  if (L.outfit === 'lba' || L.race === 'esmer' || L.longCoat) rig.robeLegs = true; // (one robe, or an Esmer's capsule, over both legs: a shorter stride)
  rig.bell = L.outfit === 'bell';
  root.scale.setScalar(L.height ? (L.kid ? L.height / 0.78 : L.height) : 1);   // (a teen look is drawn at full scale: height 1)
  return rig;
}

// ------------------------------------------------------------------ polygon models (made in Blender)
// A look with `poly: name` uses assets/poly/<name>.json (tools/blender/*.py): unindexed triangles with
// normals, vertex colours and skin weights by bone name, rigged to the same skeleton as the sculpted body
// so every animation drives it; eyes are separate small meshes on the head (they blink).
const POLY = {};
const polyGeo = {};
function polyColors(list, rec = null) {
  const out = new Float32Array(list.length), c = new THREE.Color(), seen = new Map();
  for (let i = 0; i < list.length; i += 3) {
    const k = (list[i] << 16) | (list[i + 1] << 8) | list[i + 2];
    if (!seen.has(k)) {
      const [r, g, b] = rec ? dressColour(rec, [list[i], list[i + 1], list[i + 2]]) : [list[i], list[i + 1], list[i + 2]];
      c.setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace); seen.set(k, [c.r, c.g, c.b]);
    }
    out.set(seen.get(k), i);
  }
  return out;
}

// ------------------------------------------------------------------ DRESS-1: no two people the same
// (the user, 6.11: "there are duplicate characters in Citadel, and I suppose elsewhere too: make sure no character is
//  a copy of another"). 147 people share 51 models. The models' colours are baked per vertex from their look's colour
// roles (tools/blender/cast_poly.py), so a person who shares a model gets their own clothes and hair here: every vertex
// whose colour is a clothing role's (or a shade of it: the baked darker folds) is mapped to that role's new colour.
// Skin, fur, eyes and the rest keep theirs: the same kind of person in other clothes, never another person's look.
export const DRESS_ROLES = ['tunic', 'tunicTrim', 'pants', 'belt', 'apron', 'hat', 'collarColor', 'buckle', 'hair', 'beard', 'shoes', 'helmet', 'hardhat', 'tie', 'pouch', 'pack', 'cord', 'roll', 'wizHat', 'pompom', 'emblem', 'visor', 'helmetQ', 'crest'];
const hex3 = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function dressMap(base, over) {
  const keep = Object.entries(base).filter(([k, v]) => k !== 'eyes' && typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) && !DRESS_ROLES.includes(k))   /* (the eyes are their own meshes) */.map(([, v]) => hex3(v));
  const pairs = [];
  for (const k of DRESS_ROLES) {
    if (!over[k] || typeof base[k] !== 'string' || !/^#[0-9a-f]{6}$/i.test(base[k]) || over[k].toLowerCase() === base[k].toLowerCase()) continue;
    const from = hex3(base[k]);
    if (keep.some((q) => q[0] === from[0] && q[1] === from[1] && q[2] === from[2])) continue;   // (shoes the colour of the fur: the fur stays)
    pairs.push({ from, to: hex3(over[k]) });
  }
  return { pairs, keep, key: '~' + pairs.map((p) => p.to.join('.')).join('|') };
}
// how far a baked colour is from being `k` times a role's colour (a shade of it), and that k
function shadeOf(c, b) {
  const k = (c[0] + c[1] + c[2] + 1) / (b[0] + b[1] + b[2] + 1);
  const e = Math.hypot(c[0] - b[0] * k, c[1] - b[1] * k, c[2] - b[2] * k);
  return { k, e };
}
function dressColour(rec, c) {
  let best = null;
  for (const p of rec.pairs) {
    const s = shadeOf(c, p.from);
    if (s.k < 0.55 || s.k > 1.3 || s.e > 9) continue;
    if (!best || s.e + Math.abs(1 - s.k) * 4 < best.s.e + Math.abs(1 - best.s.k) * 4) best = { p, s };
  }
  if (!best) return c;
  // a kept colour (skin, fur, eyes) that matches as well or better wins: never recolour a face
  for (const q of rec.keep) { const s = shadeOf(c, q); if (s.k >= 0.55 && s.k <= 1.3 && s.e + Math.abs(1 - s.k) * 4 <= best.s.e + Math.abs(1 - best.s.k) * 4) return c; }
  return best.p.to.map((v) => Math.max(0, Math.min(255, Math.round(v * best.s.k))));
}
// the n-th other dress of a look (n ≥ 1): its clothing hues turned round the colour wheel by the golden angle and its
// shades stepped, grey cloth tinted; hair from natural colours. The same n gives the same dress on every load.
const TRIMS = ['tunicTrim', 'belt', 'buckle', 'collarColor', 'emblem', 'cord'];
const HAIRS = ['#2a1a12', '#5a3a1a', '#8a4a20', '#c89a50', '#9a9a98', '#e8e2d8', '#3a2a2a', '#6a4a2a'];
export function dressVariant(lookName, n) {
  const base = LOOKS[lookName];
  if (!base || !n) return {};
  const out = {}, c = new THREE.Color(), hsl = {};
  const turn = (n * 0.382) % 1, light = [1, 0.78, 1.18, 0.9, 1.08][n % 5];
  for (const k of DRESS_ROLES) {
    const v = base[k];
    if (typeof v !== 'string' || !/^#[0-9a-f]{6}$/i.test(v)) continue;
    if (k === 'hair' || k === 'beard') { out[k] = HAIRS[(HAIRS.indexOf(v) + 1 + n * 3) % HAIRS.length]; continue; }
    c.set(v).getHSL(hsl, THREE.SRGBColorSpace);
    // gold and cream trim (braid, a belt, a buckle) stays: turned round the wheel it came out as neon cyan and pink
    if (TRIMS.includes(k) && hsl.h > 0.07 && hsl.h < 0.19 && hsl.l > 0.45) { out[k] = v; continue; }
    const s = hsl.s < 0.12 ? (hsl.l > 0.85 || hsl.l < 0.1 ? hsl.s : 0.28) : Math.min(0.7, hsl.s * 0.9);   // (white and black stay; greys take a tint; no brighter than the cast's own cloth)
    c.setHSL((hsl.h + turn) % 1, s, Math.max(0.06, Math.min(0.88, hsl.l * light)), THREE.SRGBColorSpace);
    out[k] = '#' + c.getHexString();
  }
  return out;
}

function polyGeometry(def, P, rec = null) {
  const names = Object.keys(def.bones);
  const map = P.bones.map((b) => names.indexOf(b));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P.pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(P.nrm, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(polyColors(P.col, rec), 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(P.si.map((i) => Math.max(0, map[i])), 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(P.sw, 4));
  geo.computeBoundingSphere();
  return geo;
}
// LBA2's look: each colour is a ramp of shades (near-black → the colour → pale), picked by how much the surface
// faces one fixed light — intensity = clamp(N·L, 0.1, 1), as in the original's shading — instead of scene lighting.
// (a MeshStandardMaterial subclass so clones keep the shader and the hurt flash still works through emissive)
export const LBA_LIGHT = { value: new THREE.Vector3(-0.45, 1, 0.6).normalize() };
export const LBA_LEVEL = { value: 1 };
// GFX-LOOK: a person standing in the sun's shadow (a house's, a stall's) is darkened like the ground round them (×0.62)
// instead of staying fully lit by the fixed ramp light; it reads the sun's hardware-filtered shadow map (renderer.js
// getShadowHW), so it is off with `?oldshadow`
const LBA_SUN_SHADOW = typeof location === 'undefined' || !/[?&]oldshadow\b/.test(location.search);
export class LbaMaterial extends THREE.MeshStandardMaterial {
  constructor(params) {
    super({ vertexColors: true, roughness: 1, metalness: 0, ...params });
    this.onBeforeCompile = (sh) => {
      sh.uniforms.uLbaLight = LBA_LIGHT;
      sh.uniforms.uLbaLevel = LBA_LEVEL;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
uniform vec3 uLbaLight;
uniform float uLbaLevel;
vec3 lbaRamp(vec3 base, vec3 n) {
  float t = clamp(dot(n, uLbaLight), 0.1, 1.0);
  vec3 lo = base * 0.12;
  vec3 hi = mix(base * 1.5, vec3(1.0), 0.3); // (the top of a ramp stays the colour's hue: pale blue, not white)
  return (t < 0.6 ? mix(lo, base, t / 0.6) : mix(base, hi, (t - 0.6) / 0.4)) * uLbaLevel;
}`)
        .replace('vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;',
          (LBA_SUN_SHADOW ? `float lbaSun = 1.0;
#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0 && !defined( SHADOWMAP_TYPE_VSM )
lbaSun = getShadowHW( directionalShadowMap[ 0 ], directionalLightShadows[ 0 ].shadowMapSize, directionalLightShadows[ 0 ].shadowIntensity, directionalLightShadows[ 0 ].shadowBias, directionalLightShadows[ 0 ].shadowRadius, vDirectionalShadowCoord[ 0 ] );
#endif
vec3 outgoingLight = mix( 0.62, 1.0, lbaSun ) * lbaRamp(diffuseColor.rgb, inverseTransformDirection(normal, viewMatrix)) + totalEmissiveRadiance;` : 'vec3 outgoingLight = lbaRamp(diffuseColor.rgb, inverseTransformDirection(normal, viewMatrix)) + totalEmissiveRadiance;'));
    };
    this.customProgramCacheKey = () => (LBA_SUN_SHADOW ? 'lba-ramp-sun' : 'lba-ramp');
  }
}
const polyEyeMat = new LbaMaterial();
// FACE-1 (P67 phase 4, the user 18.11: "the characters lack even basic facial expressions"): the brows that are part of
// a model's body (Twinsen's and Zoé's: their own colour, on the head, just over the eyes) get three morph targets the rig
// mixes for an expression (rig.js setFace): raised (curious, pleased), drawn down and in (determined, annoyed), the inner
// ends up (concerned). Relative deltas on 48 vertices; every other vertex is zero. Sized by the brows' own span (Zoé's
// head is smaller than his). A model without such brows still gets the eyes' and the mouth's part of an expression.
const BROW_COLS = { twinsen: [0x4a3014, 0x5a3a1e], twinsen_fig: [0x5a3a1e], zoe: [0x5a3a22] };
// FACE-1b (the brief: "then extend the proven approach to recurring characters"): the other models' brows found by
// themselves. A model's brows are pieces of their own (cast_poly.py brow_strips: a strip over each eye), often in the
// hair's colour, so colour alone can't tell them from a fringe: the triangles round the brows are joined into pieces by
// shared corners, and the brows are a pair of small pieces (one each side, alike in size and colour) lying wholly in
// the band just over the eyes. Returns their vertex indices, or [] (that model keeps the eyes', the mouth's and the
// gaze's part of an expression).
function autoBrowIdx(P) {
  const E = P.eyes[0].pivot, ex = Math.abs(E[0]), pos = P.pos, col = P.col;
  const eys = P.eyes[0].pos.filter((_, i) => i % 3 === 1), eTop = Math.max(...eys);
  const inBand = (i) => { const dy = pos[i + 1] - E[1]; return dy >= Math.max(0.008, eTop * 0.5) && dy <= 0.095 && Math.abs(pos[i]) <= ex + 0.085 && pos[i + 2] >= E[2] - 0.075; };
  const near = (i) => { const dy = pos[i + 1] - E[1]; return dy > -0.02 && dy < 0.13 && Math.abs(pos[i]) < ex + 0.12 && pos[i + 2] > E[2] - 0.1; };
  const tris = [], parent = [], key = new Map();
  const find = (t) => { while (parent[t] !== t) t = parent[t] = parent[parent[t]]; return t; };
  for (let i = 0; i < pos.length; i += 9) if (near(i) || near(i + 3) || near(i + 6)) { parent.push(tris.length); tris.push(i); }
  tris.forEach((i, t) => {
    for (let q = 0; q < 9; q += 3) {
      const k = `${Math.round(pos[i + q] * 2000)},${Math.round(pos[i + q + 1] * 2000)},${Math.round(pos[i + q + 2] * 2000)},${col[i + q]},${col[i + q + 1]},${col[i + q + 2]}`;
      const o = key.get(k);
      if (o === undefined) key.set(k, t); else { const ra = find(t), rb = find(o); if (ra !== rb) parent[ra] = rb; }
    }
  });
  const comps = new Map();
  tris.forEach((i, t) => { const r = find(t); let c = comps.get(r); if (!c) comps.set(r, (c = { tris: [], ok: true, x: 0 })); c.tris.push(i); });
  const cand = [];
  for (const c of comps.values()) {
    if (c.tris.length < 2 || c.tris.length > 40) continue;
    let ok = true, sx = 0, n = 0;
    for (const i of c.tris) for (let q = 0; q < 9; q += 3) { if (!inBand(i + q)) ok = false; sx += pos[i + q]; n++; }
    if (!ok) continue;
    c.x = sx / n; c.col = (col[c.tris[0]] << 16) | (col[c.tris[0] + 1] << 8) | col[c.tris[0] + 2];
    if (Math.abs(c.x) < ex * 0.3) continue;   // (one side, not across the middle)
    cand.push(c);
  }
  for (const L of cand) for (const R of cand) {
    if (L.x >= 0 || R.x <= 0 || L.col !== R.col || L.tris.length !== R.tris.length || Math.abs(L.x + R.x) > ex * 0.25) continue;
    const idx = [];
    for (const i of [...L.tris, ...R.tris]) idx.push(i / 3, i / 3 + 1, i / 3 + 2);
    return { idx, col: L.col };
  }
  return null;
}
function addBrowMorphs(geo, P, name) {
  if (geo.morphAttributes.position || P.eyes?.length !== 2) return;
  const E = P.eyes[0].pivot, ex = Math.abs(E[0]), pos = P.pos, col = P.col;
  let cols = BROW_COLS[name], idx = [];
  if (cols) {
    for (let i = 0, v = 0; i < pos.length; i += 3, v++) {
      const c = (col[i] << 16) | (col[i + 1] << 8) | col[i + 2];
      if (!cols.includes(c)) continue;
      const dy = pos[i + 1] - E[1];
      if (dy < 0.01 || dy > 0.09 || Math.abs(pos[i]) > ex + 0.08 || pos[i + 2] < E[2] - 0.07) continue;
      idx.push(v);
    }
  } else {
    const A = autoBrowIdx(P);
    if (!A) return;
    idx = A.idx; cols = [A.col];
  }
  if (idx.length < 6) return;
  let lo = Infinity, hi = 0;
  for (const v of idx) { const a = Math.abs(pos[v * 3]); lo = Math.min(lo, a); hi = Math.max(hi, a); }
  const k = hi / 0.114, span = Math.max(1e-3, hi - lo), n = pos.length;
  // the skin under the brows: the front-most surface of the face's own triangles (the most common colour round the
  // brows) at a point (x, y); a moved brow keeps its height over it (moved down or in on a curved forehead it would
  // sink into the skin, moved up it would float)
  const cnt = new Map();
  for (let i = 0; i < pos.length; i += 3) {
    const dy = pos[i + 1] - E[1];
    if (dy < -0.02 || dy > 0.12 || Math.abs(pos[i]) > ex + 0.1 || pos[i + 2] < E[2] - 0.1) continue;
    const c = (col[i] << 16) | (col[i + 1] << 8) | col[i + 2];
    if (!cols.includes(c)) cnt.set(c, (cnt.get(c) || 0) + 1);
  }
  const skinC = [...cnt].sort((a, b) => b[1] - a[1])[0]?.[0], tri = [];
  for (let i = 0; i < pos.length; i += 9) {
    if (((col[i] << 16) | (col[i + 1] << 8) | col[i + 2]) !== skinC) continue;
    let ok = true;
    for (let q = 0; q < 9; q += 3) { const dy = pos[i + q + 1] - E[1]; if (dy < -0.03 || dy > 0.14 || Math.abs(pos[i + q]) > ex + 0.12) ok = false; }
    if (ok) tri.push(i);
  }
  const skinZ = (x, y) => {
    let best = -Infinity;
    for (const i of tri) {
      const ax = pos[i], ay = pos[i + 1], bx = pos[i + 3], by = pos[i + 4], cx = pos[i + 6], cy = pos[i + 7];
      const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(d) < 1e-12) continue;
      const w1 = ((by - cy) * (x - cx) + (cx - bx) * (y - cy)) / d, w2 = ((cy - ay) * (x - cx) + (ax - cx) * (y - cy)) / d, w3 = 1 - w1 - w2;
      if (w1 < -1e-4 || w2 < -1e-4 || w3 < -1e-4) continue;
      best = Math.max(best, w1 * pos[i + 2] + w2 * pos[i + 5] + w3 * pos[i + 8]);
    }
    return best;
  };
  const up = new Float32Array(n), cross = new Float32Array(n), sad = new Float32Array(n);
  const put = (A, i, dx, dy) => {
    const x = pos[i], y = pos[i + 1], z = pos[i + 2], s0 = skinZ(x, y), s1 = skinZ(x + dx, y + dy);
    A[i] = dx; A[i + 1] = dy; A[i + 2] = s0 > -Infinity && s1 > -Infinity ? s1 - s0 : 0;
  };
  for (const v of idx) {
    const x = pos[v * 3], u = (Math.abs(x) - lo) / span, side = Math.sign(x) || 1, i = v * 3;
    put(up, i, 0, 0.018 * k);
    put(cross, i, -side * 0.006 * (1 - u) * k, (-0.012 * (1 - u) + 0.003 * u) * k);
    put(sad, i, side * 0.002 * (1 - u) * k, (0.016 * (1 - u) - 0.004 * u) * k);
  }
  geo.morphAttributes.position = [up, cross, sad].map((a) => new THREE.Float32BufferAttribute(a, 3));
  geo.morphTargetsRelative = true;
  geo.userData.browMorphs = ['up', 'cross', 'sad'];
}
// FACE-1: the eye's iris and pupil (and a catch-light) for the gaze: the eye's colours that are bluer than red and not
// near white or the lid's skin; their vertices move a little across the white (rig.js). [] when nothing qualifies.
function irisOf(cols) {
  const out = [];
  for (let i = 0; i < cols.length; i += 3) {
    const r = cols[i], g = cols[i + 1], b = cols[i + 2];
    if (b > r + 8 && (r + g + b) / 3 < 200) out.push(i / 3);
  }
  return out;
}
function polyCharacter(L, def, P) {
  const gk = L.recolor ? L.poly + L.recolor.key : L.poly;
  const pg = (polyGeo[gk] ??= polyGeometry(def, P, L.recolor));
  addBrowMorphs(pg, P, L.poly);
  const { mesh, bones } = assemble(def, pg);
  mesh.material = new LbaMaterial({ side: THREE.DoubleSide }); // (the cape and robe are open shells)
  const root = new THREE.Group();
  root.add(mesh);
  const hp = def.bones.head.pos;
  // PERF-CALLS: both eyes in one mesh when they sit at the same height and depth on the same bone (every model but the
  // dinofly): the blink scales y about that height for both together, exactly as each one about its own centre; one
  // draw a person instead of two (the street at Medium: 16 people in view)
  const E2 = P.eyes;
  if (E2.length === 2 && E2[0].bone === E2[1].bone && E2[0].pivot[1] === E2[1].pivot[1] && E2[0].pivot[2] === E2[1].pivot[2]) {
    const cx = (E2[0].pivot[0] + E2[1].pivot[0]) / 2, pos = [], col = [];
    for (const e of E2) { const dx = e.pivot[0] - cx; for (let i = 0; i < e.pos.length; i += 3) pos.push(e.pos[i] + dx, e.pos[i + 1], e.pos[i + 2]); col.push(...e.col); }
    var irisIdx = irisOf(col), eyeW = Math.max(...E2[0].pos.filter((_, i) => i % 3 === 0)) - Math.min(...E2[0].pos.filter((_, i) => i % 3 === 0));
    const g = new THREE.Group();
    g.position.set(cx - hp[0], E2[0].pivot[1] - hp[1], E2[0].pivot[2] - hp[2]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(polyColors(col), 3));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, polyEyeMat));
    bones[E2[0].bone].add(g);
    if (irisIdx.length && irisIdx.length < pos.length / 3) g.userData.iris = { idx: irisIdx, base: Float32Array.from(pos), w: eyeW };
    var eyes = [g];
  } else var eyes = P.eyes.map((e) => {
    const g = new THREE.Group();
    g.position.set(e.pivot[0] - hp[0], e.pivot[1] - hp[1], e.pivot[2] - hp[2]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(e.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(polyColors(e.col), 3));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, polyEyeMat));
    bones[e.bone].add(g);
    const ii = irisOf(e.col), xs = e.pos.filter((_, i) => i % 3 === 0);
    if (ii.length && ii.length < e.pos.length / 3) g.userData.iris = { idx: ii, base: Float32Array.from(e.pos), w: Math.max(...xs) - Math.min(...xs) };
    return g;
  });
  const rig = finishRig(L, def, root, mesh, bones, eyes);
  // FACES-HANDS: the talking mouth, drawn open and scaled down to a thin closed line (rest); the rig opens it with the voice
  // (rig.speakMouth). One more small mesh on the head with the eyes' shared material: no new program.
  const m = P.mouths?.[0];
  if (m) {
    const g = new THREE.Group();
    const mb = def.bones[m.bone]?.pos || hp;   // (CAST-POLISH: the mouth's own bone: a Sphero's face is on its torso)
    g.position.set(m.pivot[0] - mb[0], m.pivot[1] - mb[1], m.pivot[2] - mb[2]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(m.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(polyColors(m.col), 3));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, polyEyeMat));
    g.scale.y = m.rest;
    const mx = m.pos.filter((_, i) => i % 3 === 0);
    g.userData = { rest: m.rest, drop: m.drop, tilt: m.tilt || 0, y0: g.position.y, base: Float32Array.from(m.pos), hw: (Math.max(...mx) - Math.min(...mx)) / 2 || 0.04 };   // (FACE-1: base, hw: the smile's bend)
    bones[m.bone].add(g);
    rig.mouth = g;
  }
  return rig;
}
// The player's character stays readable behind trees, walls and hills: where something hides the body, a faint
// flat silhouette shows through. The body writes 1 into the stencil where it is visible; the silhouette is drawn
// only where the depth test fails (something is in front) and the stencil is not 1, so the body never ghosts
// through itself. (Needs the stencil buffer on the composer's target, see renderer.js.) VP-10: a bright sky cyan at
// half strength (was a mid blue at 0.38, which all but vanished over the blue-slate roofs and dark stone): it now
// reads over blue and orange roofs, white plaster, grey stone and grass alike.
// everything that belongs to the hero's body (and what he holds) marks itself in the stencil where it is seen
// It must be drawn after the opaque scenery that can hide it, or it marks the stencil before a wall drawn later covers
// it, and no silhouette shows there: renderOrder 2 puts it after everything opaque (scenery 0, the terrain 1: renderer
// draws opaque things by renderOrder first). PERF-BATTERY made that order matter: merged draw batches are sorted by a
// cell's centre, often beyond him, and the terrain is drawn last (occluders.mjs: his head behind the stone house).
export function writeBodyStencil(obj) {
  obj.traverse((o) => {
    if (!o.isMesh || o.material === silMat) return;
    if (o.renderOrder < 2) o.renderOrder = 2;
    for (const m of [o.material].flat()) { m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.AlwaysStencilFunc; m.stencilZPass = THREE.ReplaceStencilOp; }
  });
}
let silMat = null;
export function addSilhouette(rig, color = '#40c8ff') {
  const mesh = rig?.mesh;
  if (!mesh?.isSkinnedMesh || rig.silhouette) return;
  // the eyes share one material with every character: the hero's get their own copy before it writes the stencil
  for (const e of [...(rig.j?.eyes || []), ...(rig.mouth ? [rig.mouth] : [])]) e.traverse((o) => { if (o.isMesh) o.material = o.material.clone(); });
  writeBodyStencil(rig.root);
  silMat ??= new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.5, depthWrite: false, depthFunc: THREE.GreaterDepth, fog: false,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc,
    stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp,
  });
  const sil = new THREE.SkinnedMesh(mesh.geometry, silMat);
  sil.frustumCulled = false; sil.castShadow = false; sil.receiveShadow = false;
  sil.renderOrder = 10;
  mesh.add(sil);
  sil.bind(mesh.skeleton, mesh.bindMatrix);
  rig.silhouette = sil;
}
// EXP-1: the people of a place a save may never reach (the expansion's Ballastra cast: tessa, docker1-3, ~0.9 MB each)
// are not in assets/poly/index.json, so startup never fetches them; a chapter that needs them asks first and waits
// (loadPolys) before its people are built. A model already here, or one that will not load, costs nothing more.
export const ONDEMAND_POLYS = ['tessa', 'docker1', 'docker2', 'docker3'];
export async function loadPolys(names = ONDEMAND_POLYS) {
  await Promise.all(names.filter((n) => !POLY[n]).map(async (n) => {
    try { const r = await fetch(`assets/poly/${n}.json`); if (r.ok) POLY[n] = await r.json(); } catch { /* falls back to the sculpt */ }
  }));
}
export async function preloadCharacters() {
  let names = ['twinsen'];
  try { const r = await fetch('assets/poly/index.json'); if (r.ok) names = await r.json(); } catch { /* twinsen only */ }
  await Promise.all(names.map(async (n) => {
    try { const r = await fetch(`assets/poly/${n}.json`); if (r.ok) POLY[n] = await r.json(); } catch { /* falls back to the sculpt */ }
  }));
  if (LOOK.size) for (const n of names) if (POLY[n]) POLY[n] = lookModel(n, POLY[n]);
}
// TWINSEN-ZOE-LOOK (the user, 22.11: Twinsen and Zoé "more like the original … keep the current one and we'll compare";
// then the focus: Twinsen from behind under the Follow camera, "the hair is a bit too pixelated, but I'm not sure"; then
// "the problem is the hair"; then "maybe not 3 balls: try to turn the 3 balls more into hair";
// docs/lba-maturity/TWINSEN-ZOE-LOOK.md). Options in small steps, each its own switch, for the user to take or leave
// one by one. The shipped look is the default: nothing changes without a switch. ?look=hairtone,haircap (a comma list)
// turns those on; ?look=v2 is the first candidate (hairtone); ?look=v2,-hairtone all of it but those. The same text in
// the settings' `charLook` (no menu entry; read once at start) does the same where a URL cannot be given. A step changes
// only the model it names, as loaded; the skeleton, the other weights, the eyes, the mouth and the brows are untouched.
//   hairtone  Twinsen's three hair balls in three flat tones, darkest at the crown and lighter toward the tip (LBA2's
//             order, palette 17 → 19), each lighter than now: from behind at play distance the hair reads as a brown bun
//             of three balls instead of one near-black keyhole, and its edge on the skull has less contrast to
//             stair-step. Still one flat shade a ball from every side (the normals still point down); the shapes as approved.
//   haircap   HAIR-EDGE (P106): the scalp right round the hair (all of it within 2 cm, fading out by 6.5 cm; behind the
//             crown only: the forehead and the face are not touched) painted in the hair's own flat shade: the hair meets
//             the skin in a soft painted hairline on the skull, not only in the balls' hard outline over the pale scalp,
//             the edge that stair-stepped and flickered. Vertex colours and normals only (the hair's flat shade is its
//             normal pointing down); no triangle added.
//   hairline  HAIR-EDGE: a softer step than the cap: the skin round the hair (fading out by 11 cm, as far forward as the
//             top of the crown) shaded toward a darker skin, like the hair's shadow on the scalp, so the edge goes mid skin
//             → hair instead of near-white → hair. Colours and normals only.
//   hairform  HAIR-EDGE (the user, 22.11: "maybe not 3 balls … turn the 3 balls more into hair"): the three balls made
//             one lock of hair in their place and outline: rooted on the crown, it sweeps back and down through the
//             balls' centres and tapers to a point (no waists, no beads), a few broad strands along it that twist a
//             little toward the tip, brown tones from the root to the tip with a soft painted sheen; still flat shaded
//             (normals down, so the same from every heading under the fixed light). Its weights pass from the head to
//             tail0–tail2 along it, as the balls' did, so the follow-through sways it. With the cap's painted hairline.
//             720 triangles where the balls had 672.
//   hairspline  HAIR-SPLINE (the user, 22.11: "make the hair with splines"): the lock built from splines: a smooth
//             Catmull-Rom spine rising from a root under the scalp in front of the crown ball, back and down through the
//             balls' centres to a soft point with a slight outward flick (the crown ball's dome from the front, as
//             before); a section swept along it whose width follows a spline profile (wider at the root, tapering to
//             the tip), round at the root and flattening toward the tip, with five soft strand ridges that twist a
//             little; smooth normals, levelled for LBA's ramp (no grey top); browns from the root to the tip with a
//             painted sheen; the cap's painted hairline round it; and the band (below). 1,536 triangles for the lock.
//   hairsmooth  the same lock without the strand ridges.
//   hairband  HAIR-BAND (the user, 22.11: "the hair tie is missing at the edge of the scalp, where it joins the hair"): a
//             slim brass cuff round the line where the lock comes out of the scalp, on the head bone. 240 triangles.
//             On with hairspline and hairsmooth (`hairspline,-hairband` takes it off); it needs a lock rooted under the
//             scalp, so it does nothing for the balls or hairform (whose root sits on the skull).
export const LOOK_STEPS = { hairspline: ['twinsen'], hairsmooth: ['twinsen'], hairform: ['twinsen'], hairband: ['twinsen'], hairtone: ['twinsen'], haircap: ['twinsen'], hairline: ['twinsen'] };
const LOOK_V2 = ['hairtone'];   // (?look=v2: the first candidate as proposed; the hair-edge options are named one by one)
export const LOOK = (() => {
  let s = '';
  try { s = (typeof location !== 'undefined' && new URLSearchParams(location.search).get('look')) || JSON.parse(localStorage.getItem('sunshard_settings_v1'))?.charLook || ''; } catch { /* no storage */ }
  // (the user, 23.11: the spline lock with its tie is Twinsen's hair; ?look=old (or the setting) shows the three balls)
  if (!String(s).trim()) s = 'hairspline';
  const on = new Set();
  for (const w of String(s).toLowerCase().split(',').map((x) => x.trim()).filter(Boolean)) {
    if (w === 'old') on.clear();
    else if (w === 'v2') LOOK_V2.forEach((k) => on.add(k));
    else if (w[0] === '-') on.delete(w.slice(1));
    else if (LOOK_STEPS[w]) { on.add(w); if (w === 'hairspline' || w === 'hairsmooth') on.add('hairband'); }   // (the band comes with the spline lock: -hairband after it takes it off)
  }
  return on;
})();
function lookModel(name, P) {
  const steps = Object.keys(LOOK_STEPS).filter((s) => LOOK.has(s) && LOOK_STEPS[s].includes(name));
  if (!steps.length) return P;
  const Q = { ...P, pos: P.pos.slice(), nrm: P.nrm.slice(), col: P.col.slice(), si: P.si.slice(), sw: P.sw.slice() };
  const ctx = { balls: hairBalls(P) };
  for (const s of steps) LOOK_MODEL[s](Q, ctx);
  if (ctx.cap || ctx.line) paintScalp(Q, ctx);
  return Q;
}
// the vertices of a colour [r, g, b] that a bone carries at least `min` of
function lookVerts(P, rgb, bone, min = 0.99) {
  const bi = P.bones.indexOf(bone), out = [];
  for (let v = 0, n = P.pos.length / 3; v < n; v++) {
    if (P.col[v * 3] !== rgb[0] || P.col[v * 3 + 1] !== rgb[1] || P.col[v * 3 + 2] !== rgb[2]) continue;
    let w = 0;
    for (let k = 0; k < 4; k++) if (P.si[v * 4 + k] === bi) w += P.sw[v * 4 + k];
    if (w >= min) out.push(v);
  }
  return out;
}
// (baked colour, the ball's bone, its least weight there, new colour): the crown ball on the head, the tuft's two on
// tail0 (0.74, with tail1) and tail2 (tools/blender/twinsen_poly.py w_hair; COL hair #553916, hairTuft #6a4722)
const HAIRTONE = [[[0x55, 0x39, 0x16], 'head', 0.99, [0x7a, 0x52, 0x26]], [[0x6a, 0x47, 0x22], 'tail0', 0.7, [0x8a, 0x5e, 0x2e]], [[0x6a, 0x47, 0x22], 'tail2', 0.99, [0x98, 0x6a, 0x36]]];
const SKIN_RGB = [0xe2, 0xbc, 0x90];
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mixc = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t));
// the three balls as built, from their own vertices: centre, radius, vertex list (crown, tuft 1, tuft 2)
function hairBalls(P) {
  return HAIRTONE.map(([c, b, m]) => {
    const vs = lookVerts(P, c, b, m), lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (const v of vs) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], P.pos[v * 3 + k]); hi[k] = Math.max(hi[k], P.pos[v * 3 + k]); }
    return { c: lo.map((l, k) => (l + hi[k]) / 2), r: (hi[1] - lo[1]) / 2, vs };
  });
}
// how far p lies outside the hair (the lock's stations once hairform has built it, else the balls); and the hair's own
// flat colour nearest p
const hairDist = (ctx, p) => {
  let d = 1e9, col = null;
  for (const s of ctx.sdf || ctx.balls) { const e = Math.hypot(p[0] - s.c[0], p[1] - s.c[1], p[2] - s.c[2]) - s.r; if (e < d) { d = e; col = s.col; } }
  return [d, col];
};
// a normal turned toward straight down by t (0 … 1) along the great circle (the hair's normal is down: its flat shade)
function towardDown(n, t) {
  const c = Math.max(-1, Math.min(1, -n[1])), th = Math.acos(c), s = Math.sin(th);
  if (s < 0.05) return t > 0.5 || c > 0 ? [0, -1, 0] : n;
  const a = Math.sin((1 - t) * th) / s, b = Math.sin(t * th) / s;
  const r = [n[0] * a, n[1] * a - b, n[2] * a], l = Math.hypot(...r);
  return r.map((x) => x / l);
}
// the scalp round the hair (skin on the head bone): haircap paints the hair's own shade on it near the hair, hairline a
// warm shadow further out; both only behind the crown (the front of the skull, the forehead and the face keep theirs)
function paintScalp(P, ctx) {
  const hb = P.bones.indexOf('head'), c0 = ctx.balls[0].c, hair = ctx.cap ? ctx.sdf || ctx.balls.map((b, i) => ({ ...b, col: P.col.slice(b.vs[0] * 3, b.vs[0] * 3 + 3) })) : null;
  for (let v = 0, n = P.pos.length / 3; v < n; v++) {
    if (P.col[v * 3] !== SKIN_RGB[0] || P.col[v * 3 + 1] !== SKIN_RGB[1] || P.col[v * 3 + 2] !== SKIN_RGB[2]) continue;
    let w = 0;
    for (let k = 0; k < 4; k++) if (P.si[v * 4 + k] === hb) w += P.sw[v * 4 + k];
    if (w < 0.99) continue;
    const p = [P.pos[v * 3], P.pos[v * 3 + 1], P.pos[v * 3 + 2]];
    const back = 1 - sstep(c0[2] + ctx.front[0], c0[2] + ctx.front[1], p[2]), backL = ctx.line ? 1 - sstep(c0[2] + ctx.line.front[0], c0[2] + ctx.line.front[1], p[2]) : 0;
    if (back <= 0 && backL <= 0) continue;
    const [d, hc] = hairDist(hair ? { sdf: hair } : ctx, p);
    const wc = ctx.cap ? (1 - sstep(ctx.cap[0], ctx.cap[1], d)) * back : 0;
    const wl = ctx.line ? (1 - sstep(0, ctx.line.w, d)) * backL : 0;
    if (wc <= 0 && wl <= 0) continue;
    let col = mixc(SKIN_RGB, ctx.line?.col || SKIN_RGB, wl * (ctx.line?.k || 0));
    if (wc > 0) col = mixc(col, hc, wc);
    const n0 = [P.nrm[v * 3], P.nrm[v * 3 + 1], P.nrm[v * 3 + 2]], nv = ctx.capLevel && new THREE.Vector3(...n0);
    const nrm = nv ? nv.clone().lerp(hsLevel(nv, nv), wc).normalize().toArray() : towardDown(n0, Math.max(wc, wl * (ctx.line?.tilt || 0)));
    P.col.splice(v * 3, 3, ...col);
    P.nrm.splice(v * 3, 3, ...nrm);
  }
}
// hairform's lock: stations along the balls' centre line (y, z; x 0), each a ring of HF_M points
const HF_M = 24, HF_RIDGES = 6, HF_TONE = [[-1, [0x6c, 0x46, 0x20]], [0.3, [0x7a, 0x52, 0x26]], [1, [0x8a, 0x5e, 0x2e]], [2.4, [0x9c, 0x6e, 0x3a]]];
const HF_SHEEN = [0xc4, 0x92, 0x58];
const hfTone = (u) => {
  for (let i = 1; i < HF_TONE.length; i++) if (u <= HF_TONE[i][0]) return mixc(HF_TONE[i - 1][1], HF_TONE[i][1], Math.max(0, (u - HF_TONE[i - 1][0]) / (HF_TONE[i][0] - HF_TONE[i - 1][0])));
  return HF_TONE[HF_TONE.length - 1][1];
};
// the balls' weights along the lock (tools/blender/twinsen_poly.py w_hair): u 0 the crown ball's centre, 1 tuft 1, 2 tuft 2
const hfWeights = (u) => { const a = sstep(0.2, 0.8, u), b = sstep(0.8, 1.4, u), c = sstep(1.4, 2.0, u); return [['head', 1 - a], ['tail0', a - b], ['tail1', b - c], ['tail2', c]].filter((e) => e[1] > 1e-4); };
function hairLock(ctx) {
  const C = ctx.balls.map((b) => [b.c[1], b.c[2]]), R = ctx.balls.map((b) => b.r);
  const unit = (a) => { const l = Math.hypot(a[0], a[1]); return [a[0] / l, a[1] / l]; };
  const d0 = unit([C[1][0] - C[0][0], C[1][1] - C[0][1]]);
  const st = [];   // [centre (y, z), tangent, radius, u]
  // the root: the front of the crown, as the crown ball's (a dome over the top of the skull, as seen from the front)
  for (let k = 1; k <= 4; k++) { const ph = (Math.PI / 2) * k / 4; st.push([[C[0][0] - d0[0] * R[0] * Math.cos(ph), C[0][1] - d0[1] * R[0] * Math.cos(ph)], d0, R[0] * Math.sin(ph), -Math.cos(ph)]); }
  // through the centres: a Catmull-Rom curve; the radius the hull of the balls there (no waists), tapering
  const Pp = [[2 * C[0][0] - C[1][0], 2 * C[0][1] - C[1][1]], ...C, [2 * C[2][0] - C[1][0], 2 * C[2][1] - C[1][1]]];
  const cr = (i, t) => [0, 1].map((k) => { const [a, b, c, d] = [Pp[i][k], Pp[i + 1][k], Pp[i + 2][k], Pp[i + 3][k]]; return 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t ** 3); });
  for (let seg = 0; seg < 2; seg++) for (let k = 1; k <= 4; k++) { const t = k / 4; st.push([cr(seg, t), null, R[seg] + (R[seg + 1] - R[seg]) * t, seg + t]); }
  // the tip: on along the end of the curve, curling a little under, to a point
  const e = unit([C[2][0] - C[1][0], C[2][1] - C[1][1]]);
  for (let k = 1; k <= 3; k++) { const s = k / 4, curl = -0.25 * s * s; const dir = unit([e[0] + curl * -e[1] * -1, e[1] + curl * e[0] * -1]); st.push([[C[2][0] + dir[0] * R[2] * 1.9 * s, C[2][1] + dir[1] * R[2] * 1.3 * s], null, R[2] * Math.pow(1 - s, 0.55), 2 + 0.6 * s]); }
  const tipC = (() => { const dir = unit([e[0] - 0.25 * e[1], e[1] + 0.25 * e[0]]); return [C[2][0] + dir[0] * R[2] * 1.3, C[2][1] + dir[1] * R[2] * 1.3]; })();
  // ring planes turned gradually (smoothed tangents, as hair_sweep: square to a sharp bend they would cross)
  let tg = st.map((s, j) => s[1] || unit([(st[j + 1] ? st[j + 1][0][0] : tipC[0]) - st[j - 1][0][0], (st[j + 1] ? st[j + 1][0][1] : tipC[1]) - st[j - 1][0][1]]));
  for (let i = 0; i < 3; i++) tg = tg.map((t, j) => (j < 4 ? t : unit([tg[j - 1][0] + 2 * t[0] + (tg[j + 1] || t)[0], tg[j - 1][1] + 2 * t[1] + (tg[j + 1] || t)[1]])));
  const verts = [], ring = [];   // verts: [pos, col, u]
  st.forEach(([c, , r, u], j) => {
    const [ty, tz] = tg[j], ny = -tz, nz = ty;
    const g = (0.06 + 0.04 * sstep(1.6, 2.6, u)) * sstep(-0.6, 0.4, u), twist = 0.45 * Math.max(0, u);
    const row = [];
    for (let i = 0; i < HF_M; i++) {
      const a = (2 * Math.PI * i) / HF_M, rid = Math.cos(HF_RIDGES * a + twist), rr = r * (1 + g * rid);
      const p = [rr * Math.sin(a), c[0] + ny * rr * 0.94 * Math.cos(a), c[1] + nz * rr * 0.94 * Math.cos(a)];
      // strands: crests lighter, grooves darker; a soft sheen where the lock faces up and back
      const o = [Math.sin(a), ny * Math.cos(a), nz * Math.cos(a)], sh = sstep(0.4, 0.95, o[1] * 0.8 - o[2] * 0.6);
      let col = hfTone(u).map((x) => x * (1 + 0.16 * rid * sstep(-0.6, 0.4, u)));
      col = mixc(col, HF_SHEEN, 0.26 * sh * (0.75 + 0.25 * rid));
      row.push(verts.push([p, col.map((x) => Math.max(0, Math.min(255, Math.round(x)))), u]) - 1);
    }
    ring.push(row);
  });
  const front = [[0, C[0][0] - d0[0] * R[0], C[0][1] - d0[1] * R[0]], hfTone(-1), -1];
  const tip = [[0, tipC[0], tipC[1]], hfTone(2.6), 2.6];
  const fi = verts.push(front) - 1, ti = verts.push(tip) - 1;
  const tris = [];
  for (let j = 0; j + 1 < ring.length; j++) for (let i = 0; i < HF_M; i++) { const a = ring[j][i], b = ring[j][(i + 1) % HF_M], c = ring[j + 1][(i + 1) % HF_M], d = ring[j + 1][i]; tris.push([a, b, c], [a, c, d]); }
  for (let i = 0; i < HF_M; i++) { tris.push([fi, ring[0][(i + 1) % HF_M], ring[0][i]]); const L = ring[ring.length - 1]; tris.push([ti, L[i], L[(i + 1) % HF_M]]); }
  ctx.sdf = st.map(([c, , r, u]) => ({ c: [0, c[0], c[1]], r, col: hfTone(u) }));
  return { verts, tris };
}
// HAIR-SPLINE (hairspline, hairsmooth, hairband): a lock swept along a spline in the balls' place. A 1-D spline through
// knots [x, v, slope?] (cubic Hermite with Catmull-Rom slopes; an end's slope 0 unless given): the lock's profile
function hsProfile(K, x) {
  if (x <= K[0][0]) return K[0][1];
  let i = 0;
  while (i < K.length - 2 && x > K[i + 1][0]) i++;
  const sl = (j) => K[j][2] ?? (j <= 0 || j >= K.length - 1 ? 0 : (K[j + 1][1] - K[j - 1][1]) / (K[j + 1][0] - K[j - 1][0]));
  const h = K[i + 1][0] - K[i][0], t = Math.min(1, (x - K[i][0]) / h), t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * K[i][1] + (t3 - 2 * t2 + t) * sl(i) * h + (-2 * t3 + 3 * t2) * K[i + 1][1] + (t3 - t2) * sl(i + 1) * h;
}
// the main lock: HS_M points round; HS_ROOT rings from its root (under the scalp, in front of the crown ball) to the crown
// ball's centre, HS_NB along the body after it. q along it: -1 the root … 0 the crown ball's centre … 1 the tip
const HS_M = 32, HS_ROOT = 5, HS_NB = 18, HS_RIDGES = 5, HS_FLAT = 0.35, HS_UP = 0.15;
const HS_ROOT_AT = [-0.055, 0.11], HS_ROOT_W = 0.6, HS_WIN = 90;   // the root: (y, z) from the crown ball's centre; its width × R0
const HS_TONE = [[-1, [0x6a, 0x44, 0x1e]], [0.3, [0x78, 0x50, 0x25]], [1.2, [0x88, 0x5c, 0x2d]], [2.7, [0x9c, 0x6e, 0x3a]]];
const HS_SHEEN = [0xc8, 0x96, 0x5a];
const hsTone = (u) => {
  for (let i = 1; i < HS_TONE.length; i++) if (u <= HS_TONE[i][0]) return mixc(HS_TONE[i - 1][1], HS_TONE[i][1], Math.max(0, (u - HS_TONE[i - 1][0]) / (HS_TONE[i][0] - HS_TONE[i - 1][0])));
  return HS_TONE[HS_TONE.length - 1][1];
};
// A lock's own parameters (P120: Twinsen's below; Zoé's, ZOE_HAIRS, from the same sweep): points(ctx) its spine's control
// points (the root under the scalp first, then q 0's point) and R0, its width's unit; u(S) the coordinate its weights and
// tones read at arc length s; width(S) its width profile (knots [q, × R0, slope?]); flat(q) its section's depth across
// (× the width); tone(u) and sheen its colours; m, root, nb, ridges, win, band: the section's points round, the rings
// before q 0 and after it, the strand ridges, the tangent's window (samples), the painted sheen band [q, spread, strength]
// Twinsen's (P106, the user's pick 23.11): the spine (x 0) from the root under the scalp, out and back through the three
// balls' centres to a soft point with a slight outward flick; u the balls' weight coordinate (hfWeights: 0 the crown
// ball's centre, 1 tuft 1, 2 tuft 2)
const HS_TWINSEN = {
  points(ctx) {
    const V = (y, z) => new THREE.Vector3(0, y, z);
    const C = ctx.balls.map((b) => V(b.c[1], b.c[2])), R = ctx.balls.map((b) => b.r);
    const e = C[2].clone().sub(C[1]).normalize(), eo = V(-e.z, e.y);   // (eo: square to e, up and back)
    const A = C[0].clone().add(V(...HS_ROOT_AT));
    const E1 = C[2].clone().addScaledVector(e, R[2] * 1.25);
    const T = E1.clone().addScaledVector(e.clone().multiplyScalar(0.75).addScaledVector(eo, 0.6).normalize(), R[2] * 0.95);   // the flick
    return { pts: [A, C[0], C[1], C[2], E1, T], R0: R[0] };
  },
  u: ({ sK: [, sB, sC, sD], R0 }) => (s) => (s < sB ? (s - sB) / R0 : s < sC ? (s - sB) / (sC - sB) : s < sD ? 1 + (s - sC) / (sD - sC) : 2 + (s - sD) / (sD - sC)),
  width: ({ sK: [, sB, sC, sD], sE }) => [[-1, HS_ROOT_W, 0.5], [0, 1, 0], [(sC - sB) / (sE - sB), 0.8], [(sD - sB) / (sE - sB), 0.56], [0.82, 0.32], [1, 0, -1.1]],
  flat: (q) => 0.95 - 0.33 * sstep(0, 0.7, q),
  tone: (u) => hsTone(u), sheen: HS_SHEEN, m: HS_M, root: HS_ROOT, nb: HS_NB, ridges: HS_RIDGES, win: HS_WIN, band: [0.3, 0.22, 0.24],
};
// the spine sampled densely by arc length (control point k at sample 100 k): point and tangent at s, the lock's u at s
function hsSpine(ctx, H) {
  const { pts: K, R0 } = H.points(ctx), V = (y, z) => new THREE.Vector3(0, y, z);
  const curve = new THREE.CatmullRomCurve3(K, false, 'centripetal');
  const NS = 100 * (K.length - 1), pts = [], L = [0];
  for (let i = 0; i <= NS; i++) { pts.push(curve.getPoint(i / NS)); if (i) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1])); }
  const sK = K.map((_, k) => L[100 * k]), sB = sK[1], sE = L[NS];
  const at = (s) => {
    let i = 0;
    while (i < NS - 1 && L[i + 1] < s) i++;
    const f = Math.min(1, Math.max(0, (s - L[i]) / (L[i + 1] - L[i] || 1)));
    // (the section's plane square to the tangent taken over ±win of the curve: square to the curve itself, the rings
    //  would cross on the inside of the bend over the crown, where it turns tighter than the lock is thick)
    const ia = Math.max(0, i - H.win), ib = Math.min(NS, i + 1 + H.win), tan = pts[ib].clone().sub(pts[ia]).normalize();
    return { p: pts[i].clone().lerp(pts[i + 1], f), t: tan, n: V(-tan.z, tan.y) };   // n: the section's up-and-back axis
  };
  const sOf = (q) => (q < 0 ? sB * (1 + q) : sB + q * (sE - sB));
  const S = { at, sOf, sK, sE, R0, A: K[0], T: K[K.length - 1] };
  S.u = H.u(S);
  return S;
}
// a normal levelled for LBA's ramp: it turns a dark colour grey where a surface faces the fixed light (mostly from above:
// N·L past 0.6 mixes in white), so the normal keeps its sideways part and loses most of its upward one (`up`); one
// turned up leans toward its own outward side o (or back). Lit from a side the hair is shaded round, from 0.27× its
// colour (the flat shade's, the darkest it gets) to its colour, never grey
function hsLevel(n, o, up = HS_UP) {
  n = n.clone().normalize();
  const h = Math.hypot(n.x, n.z);
  if (h < HS_FLAT) {
    const ol = Math.hypot(o.x, o.z), [ox, oz] = ol > 0.2 ? [o.x / ol, o.z / ol] : [0, -1];
    n.x += ox * (HS_FLAT - h) * 2; n.z += oz * (HS_FLAT - h) * 2;
  }
  if (n.y > 0) n.y *= up;
  return n.normalize();
}
// smooth normals of an indexed mesh (area-weighted), levelled; each triangle first wound to face outward (the material
// is double-sided: a triangle seen from its back would be shaded with its normal turned over)
function hsNormals(V, tris) {
  const N = V.map(() => new THREE.Vector3()), a = new THREE.Vector3(), b = new THREE.Vector3();
  for (const t of tris) {
    const [i, j, k] = t;
    a.subVectors(V[j].p, V[i].p); b.subVectors(V[k].p, V[i].p); a.cross(b);
    if (a.dot(V[i].out) + a.dot(V[j].out) + a.dot(V[k].out) < 0) { a.negate(); t[1] = k; t[2] = j; }
    N[i].add(a); N[j].add(a); N[k].add(a);
  }
  return N.map((n, i) => hsLevel(n, V[i].out));
}
// one swept tube: rings[] of points round a centre, closed by a point at each end given (null: left open, hidden)
function hsTube(V, tris, rings, poles) {
  const M = rings[0].length, base = V.length;
  rings.forEach((r) => V.push(...r));
  const id = (j, i) => base + j * M + (i % M);
  for (let j = 0; j + 1 < rings.length; j++) for (let i = 0; i < M; i++) tris.push([id(j, i), id(j + 1, i), id(j + 1, i + 1)], [id(j, i), id(j + 1, i + 1), id(j, i + 1)]);
  if (poles[0]) { const f = V.push(poles[0]) - 1; for (let i = 0; i < M; i++) tris.push([f, id(0, i + 1), id(0, i)]); }
  if (poles[1]) { const t = V.push(poles[1]) - 1, j = rings.length - 1; for (let i = 0; i < M; i++) tris.push([t, id(j, i), id(j, i + 1)]); }
}
function splineLock(ctx, strands, H = HS_TWINSEN) {
  const S = hsSpine(ctx, H), X = new THREE.Vector3(1, 0, 0), V = [], tris = [], M = H.m, [bq, bs, bk] = H.band;
  const W = H.width(S);   // the width (× R0)
  const width = (q) => S.R0 * hsProfile(W, q), flat = H.flat, G = strands ? 0.09 : 0;
  const ring = (q) => {
    const s = S.sOf(q), w = width(q), k = flat(q), { p: c, n } = S.at(s), u = S.u(s), row = [];
    const g = G * sstep(0.02, 0.3, q) * (1 + 0.4 * q) * (1 - 0.5 * sstep(0.8, 1, q)), tw = 0.9 * Math.max(0, q);
    const band = Math.exp(-(((q - bq) / bs) ** 2));
    for (let i = 0; i < M; i++) {
      const a = (2 * Math.PI * i) / M, rid = Math.cos(H.ridges * a + tw), rr = 1 + g * rid;
      const out = X.clone().multiplyScalar(Math.sin(a)).addScaledVector(n, Math.cos(a) * k);
      const p = c.clone().addScaledVector(X, w * rr * Math.sin(a)).addScaledVector(n, w * k * rr * Math.cos(a));
      // the strands: crests a little lighter, grooves darker; the painted sheen up and back, a band along the lock
      let col = H.tone(u).map((x) => x * (1 + (G ? 2.2 * g * rid : 0)));
      col = mixc(col, H.sheen, bk * sstep(0.3, 0.95, Math.cos(a)) * band * (0.75 + 0.25 * rid));
      row.push({ p, out, u, q, col: col.map((x) => Math.max(0, Math.min(255, Math.round(x)))) });
    }
    return row;
  };
  const rings = [];
  for (let j = 0; j < H.root; j++) rings.push(ring(-1 + j / H.root));
  for (let j = 0; j <= H.nb; j++) rings.push(ring(1 - (1 - j / (H.nb + 1)) ** 1.2));
  const t0 = S.at(0).t, t1 = S.at(S.sOf(1)).t, uE = S.u(S.sOf(1));
  hsTube(V, tris, rings, [{ p: S.A.clone().addScaledVector(t0, -0.01), out: t0.clone().negate(), u: -2, q: -1, col: H.tone(-2) }, { p: S.T.clone(), out: t1, u: uE, q: 1, col: H.tone(uE) }]);
  const cen = rings.map((r) => r.reduce((a, v) => a.add(v.p), new THREE.Vector3()).multiplyScalar(1 / M));
  ctx.sdf = rings.map((r, j) => ({ c: cen[j].toArray(), r: r[0].p.distanceTo(cen[j]), col: H.tone(r[0].u) }));
  ctx.lockRings = { rings: rings.map((r) => r.map((v) => v.p)), cen };
  const N = hsNormals(V, tris);
  return { verts: V.map((v, i) => [[v.p.x, v.p.y, v.p.z], v.col, v.u, [N[i].x, N[i].y, N[i].z]]), tris };
}
// HAIR-BAND (the user, 22.11: "the hair tie is missing at the edge of the scalp, where it joins the hair"; the box art's
// gold ring round the root): a slim brass cuff swept round the line where the lock comes out of the scalp, found on the
// model itself (the lock's surface against the skull's triangles), so it sits on the scalp and round the hair with no
// gap. On the head bone (it does not sway). HB_N round it × HB_S round its section.
const HB_N = 20, HB_S = 6, HB_RO = 0.0075, HB_RL = 0.012, HB_OFF = 0.0035, HB_LIFT = 0.0095;
const HB_COL = [0xb8, 0x8a, 0x34], HB_HI = [0xe8, 0xc4, 0x6c], HB_LO = [0x7a, 0x58, 0x1c];
// (a band's own: n × s segments, its section's half depth ro and half length rl, how far off the hair (off) and up from
//  the scalp (lift), its colours, the scalp's colour it sits on, and where the scalp is looked for: above minY, within reach)
const HB_TWINSEN = { n: HB_N, s: HB_S, ro: HB_RO, rl: HB_RL, off: HB_OFF, lift: HB_LIFT, col: HB_COL, hi: HB_HI, lo: HB_LO, scalp: SKIN_RGB, minY: 1.8, reach: 0.25 };
function hairBand(P, ctx, B = HB_TWINSEN) {
  const L = ctx.lockRings;
  if (!L) return;
  // the skull: the head's skin triangles near the crown (centroid, outward normal); a point's signed distance is taken
  // from the plane of the nearest
  const hb = P.bones.indexOf('head'), sk = [], v3 = (i) => new THREE.Vector3(P.pos[i * 3], P.pos[i * 3 + 1], P.pos[i * 3 + 2]);
  const skin = (v) => { if (P.col[v * 3] !== B.scalp[0] || P.col[v * 3 + 1] !== B.scalp[1] || P.col[v * 3 + 2] !== B.scalp[2]) return false; let w = 0; for (let k = 0; k < 4; k++) if (P.si[v * 4 + k] === hb) w += P.sw[v * 4 + k]; return w >= 0.99; };
  for (let t = 0, n = P.pos.length / 9; t < n; t++) {
    const i = t * 3;
    if (!skin(i) || !skin(i + 1) || !skin(i + 2)) continue;
    const a = v3(i), c = a.clone().add(v3(i + 1)).add(v3(i + 2)).multiplyScalar(1 / 3);
    if (c.y < B.minY || c.distanceTo(L.cen[0]) > B.reach) continue;
    const nf = v3(i + 1).sub(a).cross(v3(i + 2).sub(a)).normalize(), nv = new THREE.Vector3(P.nrm[i * 3], P.nrm[i * 3 + 1], P.nrm[i * 3 + 2]);
    sk.push([c, nf.dot(nv) < 0 ? nf.negate() : nf]);
  }
  const sdf = (p) => { let best = 1e9, d = 1; for (const [c, nf] of sk) { const e = p.distanceToSquared(c); if (e < best) { best = e; d = p.clone().sub(c).dot(nf); } } return d; };
  // where each line along the lock's surface comes out of the skull (every other one round it)
  const R = L.rings, M = R[0].length, E = [], O = [], T = [];
  for (let i = 0; i < M; i += 2) {
    if (sdf(R[0][i]) >= 0) return;   // (the lock's root is not under the scalp all round: no band)
    let j = 1;
    while (j < R.length && sdf(R[j][i]) < 0) j++;
    if (j >= R.length) return;
    const a = R[j - 1][i], b = R[j][i], da = sdf(a), db = sdf(b), f = da / (da - db);
    const e = a.clone().lerp(b, f), tl = b.clone().sub(a).normalize(), c = L.cen[j - 1].clone().lerp(L.cen[j], f);
    const o = e.clone().sub(c); o.addScaledVector(tl, -o.dot(tl)).normalize();
    E.push(e); O.push(o); T.push(tl);
  }
  for (let k = 0; k < 2; k++) { const e0 = E.map((p) => p.clone()); E.forEach((p, i) => p.copy(e0[i]).multiplyScalar(0.5).addScaledVector(e0[(i + 1) % E.length], 0.25).addScaledVector(e0[(i + E.length - 1) % E.length], 0.25)); }
  const cE = new THREE.CatmullRomCurve3(E, true), cO = new THREE.CatmullRomCurve3(E.map((p, i) => p.clone().add(O[i])), true), cT = new THREE.CatmullRomCurve3(E.map((p, i) => p.clone().add(T[i])), true);
  const grid = [];
  for (let k = 0; k < B.n; k++) {
    const e = cE.getPoint(k / B.n), tl = cT.getPoint(k / B.n).sub(e).normalize(), o = cO.getPoint(k / B.n).sub(e);
    o.addScaledVector(tl, -o.dot(tl)).normalize();
    const row = [];
    for (let m = 0; m < B.s; m++) {
      const b = (2 * Math.PI * m) / B.s, cb = Math.cos(b), sb = Math.sin(b);
      const p = e.clone().addScaledVector(o, B.off + B.ro * cb).addScaledVector(tl, B.lift + B.rl * sb);
      const n = hsLevel(o.clone().multiplyScalar(cb / B.ro).addScaledVector(tl, sb / B.rl), o, 0.5);
      // brass: lighter on its outer face, darker where it turns under toward the scalp
      const col = cb > 0 ? mixc(B.col, B.hi, 0.55 * cb * (0.6 + 0.4 * Math.max(0, sb))) : mixc(B.col, B.lo, -cb * 0.6);
      row.push([p, n, col]);
    }
    grid.push(row);
  }
  const put = ([p, n, col]) => { P.pos.push(p.x, p.y, p.z); P.nrm.push(n.x, n.y, n.z); P.col.push(...col); P.si.push(hb, 0, 0, 0); P.sw.push(1, 0, 0, 0); };
  for (let k = 0; k < B.n; k++) for (let m = 0; m < B.s; m++) {
    const a = grid[k][m], b = grid[(k + 1) % B.n][m], c = grid[(k + 1) % B.n][(m + 1) % B.s], d = grid[k][(m + 1) % B.s];
    const f = b[0].clone().sub(a[0]).cross(c[0].clone().sub(a[0]));   // (wound to face outward: the material is double-sided)
    (f.dot(a[1]) + f.dot(c[1]) >= 0 ? [a, b, c, a, c, d] : [a, c, b, a, d, c]).forEach(put);
  }
  ctx.bandTris = B.n * B.s * 2;
}
// the balls' vertices dropped and a lock's triangles added in their place (verts: [position, colour, u, normal?]; no
// normal: the flat shade's, down), with the balls' weights along it; the cap's painted hairline round it
function swapHair(P, ctx, { verts, tris }) {
  const drop = ctx.drop || new Set(ctx.balls.flatMap((b) => b.vs)), weights = ctx.weights || hfWeights;   // (P120: Zoé's lock names its own)
  const out = { pos: [], nrm: [], col: [], si: [], sw: [] };
  for (let v = 0, n = P.pos.length / 3; v < n; v++) {
    if (drop.has(v)) continue;
    out.pos.push(P.pos[v * 3], P.pos[v * 3 + 1], P.pos[v * 3 + 2]); out.nrm.push(P.nrm[v * 3], P.nrm[v * 3 + 1], P.nrm[v * 3 + 2]);
    out.col.push(P.col[v * 3], P.col[v * 3 + 1], P.col[v * 3 + 2]);
    for (let k = 0; k < 4; k++) { out.si.push(P.si[v * 4 + k]); out.sw.push(P.sw[v * 4 + k]); }
  }
  for (const t of tris) for (const i of t) {
    const [p, col, u, nr] = verts[i], w = weights(u), tot = w.reduce((a, e) => a + e[1], 0);
    out.pos.push(...p); out.nrm.push(...(nr || [0, -1, 0])); out.col.push(...col);
    for (let k = 0; k < 4; k++) { out.si.push(w[k] ? P.bones.indexOf(w[k][0]) : 0); out.sw.push(w[k] ? w[k][1] / tot : 0); }
  }
  Object.assign(P, out);
  ctx.cap = [0.02, 0.065]; ctx.front ??= [0.06, 0.12];
}
const LOOK_MODEL = {
  hairtone(P) { for (const [from, bone, min, to] of HAIRTONE) for (const v of lookVerts(P, from, bone, min)) P.col.splice(v * 3, 3, ...to); },
  haircap(P, ctx) { ctx.cap = [0.02, 0.065]; ctx.front = [0.06, 0.12]; },
  hairline(P, ctx) { ctx.line = { w: 0.11, col: [0xb0, 0x93, 0x70], k: 0.7, tilt: 0.3, front: [0.1, 0.17] }; ctx.front ??= [0.06, 0.12]; },
  hairform(P, ctx) { if (!ctx.sdf) swapHair(P, ctx, hairLock(ctx)); },
  // (the scalp painted round a spline lock gets the lock's levelled normals, not the flat shade's)
  hairspline(P, ctx) { if (!ctx.sdf) { swapHair(P, ctx, splineLock(ctx, true)); ctx.capLevel = true; } },
  hairsmooth(P, ctx) { if (!ctx.sdf) { swapHair(P, ctx, splineLock(ctx, false)); ctx.capLevel = true; } },
  hairband: hairBand,
};
