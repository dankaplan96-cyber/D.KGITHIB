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

// ------------------------------------------------------------------ cast
export const LOOKS = {
  twinsen: {
    // LBA2's in-game Twinsen, measured on the original model (docs/character-review.md §11–12): cape-like robe
    // with flat shoulders and broad sleeves, thin orange belt, a nearly straight robe to the ankles, small
    // orange shoes, ball hands; a narrow egg head at the original's size on a long thin neck, small pale eyes,
    // no hair on the skull: a dark crown knot and a tuft arching back (LBA2 draws them as three flat unlit spheres; ours is one constant-shade mass, VP-1b); a pale gold medallion. Colours from its palette.
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
    // hair 106). Twelve years on: no change of look (STORY_BIBLE names none). The sculpt below is the fallback.
    race: 'quetch', outfit: 'gown', hem: 0.06, tunic: '#b32b27', tunicTrim: '#8b1712', belt: '#b32b27', pants: '#b32b27', shoes: '#3f7b47',
    hair: '#e3af53', skin: '#d9a679', hairStyle: 'bun', nose: 'button', eyes: '#2f474b', lashes: true, headS: 1.15, neck: 0.07, height: 1.0,
    armSpread: 0.3, armLen: 1.1,
  },
  arthur: {
    // a curious kid: knee tunic in his father's blue with an orange belt, scuffed knees, a spiky tuft
    race: 'quetch', kid: true, outfit: 'tunic', hem: 0.36, tunic: '#5a9ad8', tunicTrim: '#2f6aa8', belt: '#f07a28', pants: '#e8dcc0', shoes: '#d9653a',
    hair: '#6a3a1a', skin: '#f2c49a', hairStyle: 'tuft', nose: 'ball', noseS: 0.9, eyes: '#2a4a8a', mouth: 'open', height: 0.62, neck: 0.1,
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
  guard: {
    // project security: broad Grobo in a teal-and-brass uniform, rounded helmet with a visor
    race: 'grobo', outfit: 'tunic', hem: 0.58, skin: '#9aa8b8', tunic: '#245a6a', tunicTrim: '#c8a050', belt: '#2a2a2a', buckle: '#d8b04a', pants: '#203a48', shoes: '#2a2a2a',
    eyes: '#2a2a2a', helmet: '#2f7a84', buttons: true, height: 1.05,
  },
  baldino: {
    // the old inventor (an ally since LBA1): short and round-shouldered, a bald dome with white tufts over
    // the ears, a big white moustache, round brass goggles pushed up, a leather apron over a green work smock
    race: 'quetch', outfit: 'tunic', hem: 0.5, belly: 0.09, stoop: 0.09, tunic: '#4f7a3a', tunicTrim: '#33522a', belt: '#5a3a1a', buckle: '#d8b04a',
    pants: '#5a4a3a', shoes: '#4a2e1a', apron: '#8a5a32', skin: '#f0c098', hairStyle: 'bald', hair: '#f4f4f0', moustache: true, goggles: true,
    nose: 'ball', noseS: 1.25, eyes: '#4a6a8a', eyeScale: 0.9, mouth: 'smile', brow: 1.6, headS: 1.08, neck: 0.06, height: 0.9,
  },
  nara: {
    // Esmer stall-keeper on the Zeelich street: tall and slim, a coral robe with a gold trim
    race: 'esmer', outfit: 'robe', hem: 0.08, slim: true, skin: '#f2a582', ridge: '#4a8a72', tunic: '#e0704a', tunicTrim: '#f2c45a', belt: '#f2c45a', pants: '#7a3a2a', shoes: '#3a2a20',
    eyes: '#e8a040', height: 1.06,
  },
  oku: {
    // an old Esmer who remembers the Zeelich of before: stooped, a deep-teal robe, a white sash
    race: 'esmer', outfit: 'robe', hem: 0.06, stoop: 0.14, belly: 0.05, skin: '#e0957a', ridge: '#3a6a5a', tunic: '#2a6a72', tunicTrim: '#e8e0d0', belt: '#e8e0d0', pants: '#1a3a40', shoes: '#2a2020',
    eyes: '#d8c060', hat: '#e8d8b0', height: 0.94,
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
  zbee2: {
    // a Mosquibee matron: a red abdomen, plain, a little gold crown
    race: 'bee', outfit: 'tunic', tunic: '#c83a2a', tunicTrim: '#c83a2a', stripes: false, skin: '#3a5a7a', eyes: '#c83030', wing: '#e08a6a', crown: '#f2c45a', belly: 0.06, height: 1.0,
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
  zmole2: {
    // a smaller mole in a white smock with a red apron (the original's homemaker)
    race: 'mole', outfit: 'robe', tunic: '#ecebe6', apron: '#c85a3a', skin: '#e8e2da', lip: '#f0c060', eyes: '#2a6a4a', height: 0.74,
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
  archivist: {
    // the project's archivist: a wary Quetch in a long grey-teal coat with brass buttons
    race: 'quetch', outfit: 'tunic', hem: 0.28, slim: true, tunic: '#4a6a6a', tunicTrim: '#c8a050', belt: '#2a2a2a', buckle: '#c8a050', pants: '#2a3a3a', shoes: '#2a2026',
    hair: '#6a5a4a', skin: '#e0b090', hairStyle: 'tuft', nose: 'long', eyes: '#3a2a1a', glasses: true, collar: true, buttons: true, height: 0.98, neck: 0.08,
  },
  // ---- Citadel's hill farms (chapter 8)
  farmerA: {
    race: 'quetch', outfit: 'tunic', hem: 0.6, belly: 0.08, tunic: '#6a8a3a', tunicTrim: '#3a5a1a', belt: '#5a3a1a', pants: '#8a6a4a', shoes: '#3a2a1a',
    hair: '#8a5a2a', skin: '#e0a878', hairStyle: 'tuft', nose: 'ball', eyes: '#3a2a1a', hat: '#e8d090', height: 0.97, neck: 0.08,
  },
  farmerB: {
    race: 'bunny', outfit: 'tunic', hem: 0.5, fur: '#e8d0b8', furDark: '#b89878', tunic: '#d8a03a', tunicTrim: '#8a5a1a', belt: '#5a3a1a', pants: '#5a6a3a', shoes: '#e8d0b8',
    eyes: '#3a2a1a', apron: '#f4ecd8', height: 0.88,
  },
  farmerC: {
    race: 'grobo', outfit: 'tunic', hem: 0.62, belly: 0.12, skin: '#98a6b4', tunic: '#a84a3a', tunicTrim: '#e8c060', belt: '#3a2a1a', pants: '#4a4a5a', shoes: '#3a2a1a',
    eyes: '#2a2a2a', hat: '#6a5a3a', height: 1.04,
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
  lharWoman: {
    race: 'quetch', outfit: 'dress', hem: 0.12, slim: true, tunic: '#2f6a5a', tunicTrim: '#f2d8a0', belt: '#d8302a', pants: '#2f6a5a', shoes: '#3a2a1a',
    hair: '#1a1210', skin: '#e0b090', hairStyle: 'longtail', nose: 'button', eyes: '#2a1a10', lashes: true, height: 0.9, neck: 0.08,
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
  desertTrader: {
    race: 'grobo', outfit: 'tunic', hem: 0.6, belly: 0.12, skin: '#9aa898', tunic: '#2f7a9a', tunicTrim: '#e8c060', belt: '#5a3a1a', pants: '#3a4a5a', shoes: '#3a2a1a',
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
};

LOOKS.twinsenSculpt = { ...LOOKS.twinsen, poly: null };

// ------------------------------------------------------------------ body design
function design(L) {
  const kid = !!L.kid;
  const slim = L.slim ? 0.86 : 1;
  const grobo = L.race === 'grobo', bunny = L.race === 'bunny', esmer = L.race === 'esmer', quetch = L.race === 'quetch';
  // (LBA1's Spheros, bodies 68–70: short legs, the shoulders at the tips of a star-shaped body, 0.67 of Twinsen's height)
  const sphero = L.race === 'sphero';
  // (LBA1's FunFrock troopers, bodies 18–20: a fat greatcoat to the ankles, the shoulders high, long arms)
  const fclone = L.race === 'fclone';
  const legLen = fclone ? 0.5 : sphero ? 0.62 : kid ? 0.74 : grobo ? 0.8 : esmer ? 1.08 : 1;
  const torsoLen = fclone ? 1.95 : kid ? 0.82 : grobo ? 1.05 : 1;
  const hs = (L.headS || 1) * (kid ? 1.3 : 1) * (grobo ? 1.1 : 1);
  const wide = (grobo ? 1.5 : 1) * slim * (kid ? 0.92 : 1);
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
  const shX = (fclone ? 0.49 : sphero ? 0.676 : grobo ? 0.33 : 0.2) * slim * (kid ? 0.95 : 1) * (L.shoulders || 1), shY = ty + 0.47 * torsoLen;
  const armLen = (esmer ? 1.15 : kid ? 0.78 : 1) * (L.armLen || 1);
  const legX = (fclone ? 0.16 : sphero ? 0.29 : grobo ? 0.15 : 0.1) * slim;
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    const sh = bone('sh' + s, [sx * shX, shY, 0], 'torso');
    const el = bone('el' + s, add(sh, [sx * 0.05, -0.29 * armLen, 0.0]), 'sh' + s);
    bone('hand' + s, add(el, [sx * 0.02, -0.27 * armLen, 0.03]), 'el' + s, { tip: add(el, [sx * 0.025, -0.4 * armLen, 0.04]) });
    const hp = bone('hip' + s, [sx * legX, hipsY - 0.03, 0], 'hips');
    const kn = bone('knee' + s, add(hp, [0, -0.43 * legLen, 0.01]), 'hip' + s);
    bone('foot' + s, [sx * legX, 0.1, 0], 'knee' + s, { tip: [sx * legX, 0.03, 0.15] });
  }
  const hemY = Math.max(0.06, L.hem ?? 0.5);
  const hemR = (L.hemW ?? 1) * (L.outfit === 'robe2' || L.outfit === 'tw' || L.outfit === 'lba' ? 0.36 : L.outfit === 'bell' ? 0.43 : L.outfit === 'dress' ? 0.34 : L.outfit === 'robe' ? 0.32 : 0.27) * wide * (kid ? 0.92 : 1) + belly * 0.4;
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
    const thick = (grobo ? 1.35 : 1) * slim * (kid ? 0.95 : 1);
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
    const thick = (grobo ? 1.5 : 1) * slim * (kid ? 0.92 : 1) * (L.outfit === 'bell' ? 1.12 : 1);
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
    cell: kid ? 0.012 : 0.014,
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
  const key = lookName + JSON.stringify(overrides);
  const def = defs[key] ??= splitArms({ ...design(L), key });
  const polyName = 'poly' in L ? L.poly : lookName; // (every look has a Blender model unless poly: null)
  const poly = polyName && POLY[polyName];
  if (poly) return polyCharacter({ ...L, poly: polyName }, def, poly);
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
  };
  const rig = new Rig(root, j);
  rig.mesh = mesh;
  rig.height = def.bones.head.tip[1];
  if (L.armSpread != null) rig.armSpread = L.armSpread;
  // the robe below the belt (Twinsen) or the outfit's legs (Zoé) are carried by the legs: strides need no limit
  if (L.outfit === 'lba' || L.outfit === 'gown') rig.legCloth = true;
  if (L.outfit === 'lba' || L.race === 'esmer' || L.longCoat) rig.robeLegs = true; // (one robe, or an Esmer's capsule, over both legs: a shorter stride)
  rig.bell = L.outfit === 'bell';
  root.scale.setScalar(L.height ? (L.kid ? L.height / 0.78 : L.height) : 1);
  return rig;
}

// ------------------------------------------------------------------ polygon models (made in Blender)
// A look with `poly: name` uses assets/poly/<name>.json (tools/blender/*.py): unindexed triangles with
// normals, vertex colours and skin weights by bone name, rigged to the same skeleton as the sculpted body
// so every animation drives it; eyes are separate small meshes on the head (they blink).
const POLY = {};
const polyGeo = {};
function polyColors(list) {
  const out = new Float32Array(list.length), c = new THREE.Color(), seen = new Map();
  for (let i = 0; i < list.length; i += 3) {
    const k = (list[i] << 16) | (list[i + 1] << 8) | list[i + 2];
    if (!seen.has(k)) { c.setRGB(list[i] / 255, list[i + 1] / 255, list[i + 2] / 255, THREE.SRGBColorSpace); seen.set(k, [c.r, c.g, c.b]); }
    out.set(seen.get(k), i);
  }
  return out;
}
function polyGeometry(def, P) {
  const names = Object.keys(def.bones);
  const map = P.bones.map((b) => names.indexOf(b));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P.pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(P.nrm, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(polyColors(P.col), 3));
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
          'vec3 outgoingLight = lbaRamp(diffuseColor.rgb, inverseTransformDirection(normal, viewMatrix)) + totalEmissiveRadiance;');
    };
    this.customProgramCacheKey = () => 'lba-ramp';
  }
}
const polyEyeMat = new LbaMaterial();
function polyCharacter(L, def, P) {
  const { mesh, bones } = assemble(def, polyGeo[L.poly] ??= polyGeometry(def, P));
  mesh.material = new LbaMaterial({ side: THREE.DoubleSide }); // (the cape and robe are open shells)
  const root = new THREE.Group();
  root.add(mesh);
  const hp = def.bones.head.pos;
  const eyes = P.eyes.map((e) => {
    const g = new THREE.Group();
    g.position.set(e.pivot[0] - hp[0], e.pivot[1] - hp[1], e.pivot[2] - hp[2]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(e.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(polyColors(e.col), 3));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, polyEyeMat));
    bones[e.bone].add(g);
    return g;
  });
  return finishRig(L, def, root, mesh, bones, eyes);
}
// The player's character stays readable behind trees, walls and hills: where something hides the body, a faint
// flat silhouette shows through. The body writes 1 into the stencil where it is visible; the silhouette is drawn
// only where the depth test fails (something is in front) and the stencil is not 1, so the body never ghosts
// through itself. (Needs the stencil buffer on the composer's target, see renderer.js.)
// everything that belongs to the hero's body (and what he holds) marks itself in the stencil where it is seen
export function writeBodyStencil(obj) {
  obj.traverse((o) => {
    if (!o.isMesh || o.material === silMat) return;
    for (const m of [o.material].flat()) { m.stencilWrite = true; m.stencilRef = 1; m.stencilFunc = THREE.AlwaysStencilFunc; m.stencilZPass = THREE.ReplaceStencilOp; }
  });
}
let silMat = null;
export function addSilhouette(rig, color = '#3a6ab0') {
  const mesh = rig?.mesh;
  if (!mesh?.isSkinnedMesh || rig.silhouette) return;
  // the eyes share one material with every character: the hero's get their own copy before it writes the stencil
  for (const e of rig.j?.eyes || []) e.traverse((o) => { if (o.isMesh) o.material = o.material.clone(); });
  writeBodyStencil(rig.root);
  silMat ??= new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.38, depthWrite: false, depthFunc: THREE.GreaterDepth, fog: false,
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
export async function preloadCharacters() {
  let names = ['twinsen'];
  try { const r = await fetch('assets/poly/index.json'); if (r.ok) names = await r.json(); } catch { /* twinsen only */ }
  await Promise.all(names.map(async (n) => {
    try { const r = await fetch(`assets/poly/${n}.json`); if (r.ok) POLY[n] = await r.json(); } catch { /* falls back to the sculpt */ }
  }));
}
