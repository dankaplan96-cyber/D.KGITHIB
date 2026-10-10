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
import { buildSculpted, sculptRigid } from '../engine/sculpt.js';
import { Rig } from '../engine/rig.js';

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// ------------------------------------------------------------------ cast
export const LOOKS = {
  twinsen: {
    race: 'quetch', outfit: 'bell', hem: 0.4, hemW: 0.9, neckR: 0.042, tunic: '#7fb2ec', tunicTrim: '#5f92d0', pants: '#e8dcc0', shoes: '#7a4a24',
    hair: '#5a3418', skin: '#f2c49a', hairStyle: 'twinsen', nose: 'ball', eyes: '#2a4a8a', mouth: 'open', medallion: true, headS: 0.92, neck: 0.16,
  },
  zoe: {
    race: 'quetch', outfit: 'dress', hem: 0.1, slim: true, tunic: '#d84a3a', tunicTrim: '#a8302a', belt: '#f4d27a', pants: '#d84a3a', shoes: '#6a2a20',
    hair: '#7a3416', skin: '#f0c49b', hairStyle: 'bun', nose: 'button', eyes: '#3a6a3a', lashes: true, headS: 0.9, neck: 0.13, height: 0.95,
  },
  arthur: {
    race: 'quetch', kid: true, outfit: 'bell', hem: 0.36, tunic: '#7fb2ec', tunicTrim: '#5f92d0', pants: '#e8dcc0', shoes: '#7a4a24',
    hair: '#6a3a1a', skin: '#f2c49a', hairStyle: 'twinsen', nose: 'ball', eyes: '#2a4a8a', mouth: 'open', height: 0.62, neck: 0.1,
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
  xil: {
    race: 'esmer', outfit: 'robe', hem: 0.08, slim: true, skin: '#86c8a8', ridge: '#3e7a62', tunic: '#5a3a8a', tunicTrim: '#c8a0ff', belt: '#c8a0ff', pants: '#3a2a5a', shoes: '#2a2040',
    eyes: '#e8c040', height: 1.1,
  },
};

// ------------------------------------------------------------------ body design
function design(L) {
  const kid = !!L.kid;
  const slim = L.slim ? 0.86 : 1;
  const grobo = L.race === 'grobo', bunny = L.race === 'bunny', esmer = L.race === 'esmer', quetch = L.race === 'quetch';
  const legLen = kid ? 0.74 : grobo ? 0.8 : esmer ? 1.08 : 1;
  const torsoLen = kid ? 0.82 : grobo ? 1.05 : 1;
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
  const shX = (grobo ? 0.33 : 0.2) * slim * (kid ? 0.95 : 1), shY = ty + 0.47 * torsoLen;
  const armLen = (esmer ? 1.15 : kid ? 0.78 : 1);
  const legX = (grobo ? 0.15 : 0.1) * slim;
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    const sh = bone('sh' + s, [sx * shX, shY, 0], 'torso');
    const el = bone('el' + s, add(sh, [sx * 0.05, -0.29 * armLen, 0.0]), 'sh' + s);
    bone('hand' + s, add(el, [sx * 0.02, -0.27 * armLen, 0.03]), 'el' + s, { tip: add(el, [sx * 0.025, -0.4 * armLen, 0.04]) });
    const hp = bone('hip' + s, [sx * legX, hipsY - 0.03, 0], 'hips');
    const kn = bone('knee' + s, add(hp, [0, -0.43 * legLen, 0.01]), 'hip' + s);
    bone('foot' + s, [sx * legX, 0.1, 0], 'knee' + s, { tip: [sx * legX, 0.03, 0.15] });
  }
  const hemY = Math.max(0.06, L.hem ?? 0.5);
  const hemR = (L.hemW ?? 1) * (L.outfit === 'bell' ? 0.43 : L.outfit === 'dress' ? 0.34 : L.outfit === 'robe' ? 0.32 : 0.27) * wide * (kid ? 0.92 : 1) + belly * 0.4;
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
    e(add(Hc, [0, 0.03 * hs, -0.015]), [0.118 * hs, 0.165 * hs, 0.13 * hs], 'head', 'skin', 'head');
    e(add(Hc, [0, -0.065 * hs, 0.02 * hs]), [0.098 * hs, 0.1 * hs, 0.1 * hs], 'head', 'skin', 'head');
    e(add(Hc, [0, -0.135 * hs, 0.045 * hs]), [0.048 * hs, 0.04 * hs, 0.048 * hs], 'head', 'skin', 'head');
    for (const sx of [1, -1]) e(add(Hc, [sx * 0.06 * hs, -0.04 * hs, 0.065 * hs]), [0.04 * hs, 0.035 * hs, 0.04 * hs], 'head', 'cheek', 'head');
    for (const sx of [1, -1]) e(add(Hc, [sx * 0.118 * hs, -0.005, -0.005]), [0.016, 0.038, 0.028], 'head', 'skin', 'head');
    const nz = 0.12 * hs;
    if (L.nose === 'ball') e(add(Hc, [0, -0.025 * hs, nz + 0.03]), [0.044 * hs, 0.04 * hs, 0.044 * hs], 'head', 'nose', 'head');
    else if (L.nose === 'long') { cone(add(Hc, [0, 0.03, nz - 0.02]), add(Hc, [0, -0.055 * hs, nz + 0.075]), 0.022, 0.03, 'head', 'nose', 'head'); }
    else e(add(Hc, [0, -0.025 * hs, nz + 0.012]), [0.026 * hs, 0.024 * hs, 0.028 * hs], 'head', 'nose', 'head');
    Object.assign(face, { eyeX: 0.05 * hs, eyeY: 0.045 * hs, eyeZ: 0.098 * hs, eyeR: 0.034 * hs, mouthY: -0.095 * hs, mouthZ: 0.112 * hs });
  }
  for (const sx of [1, -1]) P.push({ type: 'ell', c: add(Hc, [sx * face.eyeX, face.eyeY, face.eyeZ + 0.006]), r: [face.eyeR * 1.05, face.eyeR * 1.1, face.eyeR * 0.8], sub: true, k: 0.012 });

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
      e(add(Hc, [0, 0.045 * hs, -0.02]), [0.125 * hs, 0.17 * hs, 0.138 * hs], 'head', 'hair', 'hair', {
        clip: hairline(0.11 * hs, -0.1 * hs),
        wobble: (x, y, z) => Math.sin(Math.atan2(x - Hc[0], z - Hc[2]) * 16 + y * 20) * 0.003,
      });
      // a small swept fringe
      e(add(Hc, [0.025 * hs, 0.125 * hs, 0.07 * hs]), [0.075 * hs, 0.035 * hs, 0.06 * hs], 'head', 'hair', 'hair');
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
    if (L.hairStyle === 'twinsen') {
      // high, hooked ponytail swept back from the crown
      // (it leaves the back of the crown almost level, so from the front it reads as a tuft, not a bun)
      const p0 = add(Hc, [0, 0.115 * hs, -0.11 * hs]);
      chain([p0, add(p0, [0, 0.03 * hs, -0.085 * hs]), add(p0, [0, 0.015 * hs, -0.175 * hs]), add(p0, [0, -0.045 * hs, -0.235 * hs]), add(p0, [0, -0.13 * hs, -0.25 * hs]), add(p0, [0, -0.21 * hs, -0.225 * hs])],
        [0.044 * hs, 0.054 * hs, 0.052 * hs, 0.044 * hs, 0.032 * hs, 0.015 * hs]);
      e(add(p0, [0, 0.005, -0.012]), [0.054 * hs, 0.026 * hs, 0.05 * hs], 'tail0', 'tie', 'tie');
    } else if (L.hairStyle === 'tail') {
      const p0 = add(Hc, [0, 0.04 * hs, -0.13 * hs]);
      chain([p0, add(p0, [0, -0.08, -0.04]), add(p0, [0, -0.17, -0.05]), add(p0, [0, -0.25, -0.04])], [0.045, 0.042, 0.032, 0.014]);
      e(p0, [0.048, 0.022, 0.044], 'tail0', 'tie', 'tie');
    } else if (L.hairStyle === 'bun') {
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
  if (L.outfit === 'bell') {
    // Twinsen's wide tunic: narrow neckline, rounded sloping shoulders, bell to mid-calf, thick hem
    const top = neckP[1] - 0.025;
    ccone(top, hemY, 0.065, hemR, 'skirt', 'tunic', 'tunic', { sz: 0.8, wobble: folds(ty + 0.2, 0.008) });
    for (const sx of [1, -1]) e([sx * 0.11 * wide, shY - 0.02, 0], [0.13 * wide, 0.085, 0.105], 'torso', 'tunic', 'tunic');
    e([0, ty + 0.25, 0.0], [0.2 * wide, 0.26, 0.15], 'torso', 'tunic', 'tunic');
    torus([0, hemY + 0.008, 0], hemR - 0.006, 0.009, 'skirt', 'tunicTrim', 'tunic', { sz: 0.8 });
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
    if (L.outfit === 'bell') {
      // wide kimono sleeve flaring to the wrist
      cone(add(sh, [-sx * 0.02, -0.02, 0]), el, 0.07 * thick, 0.085 * thick, 'sh' + s, 'tunic', g);
      const end = lerp3(el, hd, 0.72);
      cone(el, end, 0.082 * thick, 0.118 * thick, 'el' + s, 'tunic', g, { sz: 0.85 });
      torus(end, 0.106 * thick, 0.013, 'el' + s, 'tunicTrim', 'cuff' + s, { sz: 0.85 });
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

  // ================================================================= LEGS (shoes are rigid parts)
  for (const s of ['L', 'R']) {
    const hp = B['hip' + s].pos, kn = B['knee' + s].pos, ft = B['foot' + s].pos;
    const g = 'leg' + s;
    G[g] = 0.03;
    const thick = (grobo ? 1.5 : 1) * slim * (kid ? 0.92 : 1) * (L.outfit === 'bell' ? 0.85 : 1);
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
  };
  const paint = (p, m, col) => {
    if (m === 'fur' && L.furDark && p.y > Hc[1] + 0.1 * hs) col.lerp(new THREE.Color(L.furDark), Math.min(1, (p.y - Hc[1] - 0.1) * 4));
    if (m === 'tunic' && L.outfit === 'bell') col.multiplyScalar(0.94 + 0.06 * Math.sin(p.y * 260)); // knit rows
  };
  const top = B.head.tip[1] + (bunny ? 0.5 : 0.2);
  const halfW = L.outfit === 'bell' ? 0.6 : grobo ? 0.72 : 0.55;
  return {
    prims: P, groups: G, joinK: 0.012, bones: B, chains, colors, paint,
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
  const k = (kid ? 0.85 : 1.1) * (grobo ? 1.3 : 1);
  const m = L.race === 'bunny' ? 'fur' : 'skin';
  const P = [];
  const add2 = (o) => P.push({ bone: 'h', mat: m, group: 'h', ...o });
  add2({ type: 'cone', a: [0, 0.035 * k, 0], b: [0, -0.02 * k, 0.004], r1: 0.022 * k, r2: 0.025 * k });
  add2({ type: 'ell', c: [0, -0.055 * k, 0.008 * k], r: [0.022 * k, 0.048 * k, 0.04 * k] });
  for (let i = 0; i < 4; i++) {
    const z = (-0.022 + i * 0.0145) * k;
    const len = (0.07 - Math.abs(i - 1.4) * 0.008) * k;
    add2({ type: 'cone', a: [0, -0.09 * k, z], b: [-sx * 0.012 * k, -0.09 * k - len, z + 0.006], r1: 0.0105 * k, r2: 0.009 * k });
  }
  add2({ type: 'cone', a: [-sx * 0.01 * k, -0.035 * k, 0.03 * k], b: [-sx * 0.03 * k, -0.075 * k, 0.055 * k], r1: 0.013 * k, r2: 0.011 * k });
  return {
    key: `hand-${L.race}-${kid}-${sx}-${L.skin || L.fur}`, prims: P, groups: { h: 0.012 }, colors: { skin: L.skin || '#f0c49b', fur: L.fur || '#fff' },
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
  } else {
    s({ type: 'ell', c: [0, -0.05, 0.045 * k], r: [0.07 * k, 0.055, 0.125 * k] });
    s({ type: 'ell', c: [0, -0.042, 0.13 * k], r: [0.074 * k, 0.06, 0.075 * k] });
    s({ type: 'ell', c: [0, -0.05, -0.035], r: [0.058 * k, 0.05, 0.06] });
    P.push({ type: 'cone', a: [0, 0.06, 0], b: [0, -0.02, 0.01], r1: 0.042 * k, r2: 0.05 * k, bone: 'f', mat: 'sock', group: 'f' });
  }
  return {
    key: `shoe-${L.race}-${kid}-${L.shoes}`, prims: P, groups: { f: 0.03, n: 0 }, colors: { shoe: L.shoes || '#6b4423', sock: L.pants || '#e8dcc0', nail: '#f4f0e0' },
    paint: (p, m, col) => { if (m === 'shoe' && p.y < -0.085) col.multiplyScalar(0.55); },
    bounds: { min: [-0.12, -0.11, -0.12], max: [0.12, 0.08, 0.26] }, cell: 0.0055,
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
    const w = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), matWhite);
    w.scale.set(1, 1.12, 0.78);
    g.add(w);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(r * 0.5, 12, 8), new THREE.MeshStandardMaterial({ color: L.eyes || '#3a2a1a', roughness: 0.25 }));
    iris.position.set(-sx * r * 0.12, -r * 0.02, r * 0.58);
    iris.scale.set(1, 1.1, 0.45);
    g.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(r * 0.27, 10, 6), matPupil);
    pupil.position.set(-sx * r * 0.12, -r * 0.02, r * 0.7);
    pupil.scale.set(1, 1.1, 0.4);
    g.add(pupil);
    const hi = new THREE.Mesh(new THREE.SphereGeometry(r * 0.1, 6, 4), matHi);
    hi.position.set(-sx * r * 0.12 + r * 0.16, r * 0.2, r * 0.74);
    g.add(hi);
    // thin upper lid rim gives the eye a shape without making it sleepy
    const lid = new THREE.Mesh(new THREE.SphereGeometry(r * 1.08, 16, 6, 0, Math.PI * 2, 0, Math.PI * 0.26), new THREE.MeshStandardMaterial({ color: L.skin || L.fur || '#f0c49b', roughness: 0.7 }));
    lid.scale.set(1.02, 1.14, 0.84);
    lid.rotation.x = 0.4;
    g.add(lid);
    if (L.lashes) {
      const l = new THREE.Mesh(new THREE.TorusGeometry(r * 1.02, r * 0.1, 4, 12, Math.PI), matPupil);
      l.position.z = r * 0.2; l.rotation.x = -0.4; l.scale.set(1, 1.1, 1);
      g.add(l);
    }
    head.add(g);
    eyes.push(g);
    const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.009 * def.hs, 0.045 * def.hs, 2, 6), new THREE.MeshStandardMaterial({ color: L.hair || L.furDark || '#3a2a1a', roughness: 0.9 }));
    brow.rotation.z = Math.PI / 2 - sx * 0.2;
    brow.position.set(sx * F.eyeX * 1.05, Hc[1] - hp[1] + F.eyeY + F.eyeR * 1.55, Hc[2] - hp[2] + F.eyeZ + 0.004);
    head.add(brow);
  }
  // mouth: Twinsen's little open "o", a gentle smile for others
  const my = Hc[1] - hp[1] + F.mouthY, mz = Hc[2] - hp[2] + F.mouthZ;
  if (L.mouth === 'open') {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.022 * def.hs, 12, 8), matMouth);
    m.scale.set(1, 0.6, 0.35);
    m.position.set(0, my, mz);
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
  return eyes;
}

function addMedallion(def, bones) {
  const torso = bones.torso, tp = def.bones.torso.pos;
  const gold = new THREE.MeshStandardMaterial({ color: '#e0b030', metalness: 0.65, roughness: 0.35 });
  const g = new THREE.Group();
  g.position.set(0, 0.34, 0.172);
  g.rotation.x = -0.12;
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 24), gold);
  disc.rotation.x = Math.PI / 2;
  g.add(disc);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.043, 0.0045, 6, 24), gold);
  rim.position.z = 0.006;
  g.add(rim);
  const sym = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 6, 16, Math.PI * 1.5), gold);
  sym.position.z = 0.007;
  g.add(sym);
  torso.add(g);
  // red cord: tube around the neck down to the medal, in torso space
  const ny = def.bones.neck.pos[1] - tp[1];
  const pts = [[0.012, 0.37, 0.168], [0.04, ny - 0.07, 0.11], [0.05, ny - 0.03, 0.02], [0.03, ny - 0.02, -0.045], [0, ny - 0.02, -0.055],
    [-0.03, ny - 0.02, -0.045], [-0.05, ny - 0.03, 0.02], [-0.04, ny - 0.07, 0.11], [-0.012, 0.37, 0.168]].map((p) => new THREE.Vector3(...p));
  const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.006, 6), new THREE.MeshStandardMaterial({ color: '#c0302a', roughness: 0.6 }));
  torso.add(cord);
}

// ------------------------------------------------------------------ public API
const defs = {};
export function createCharacter(lookName, overrides = {}) {
  const L = { ...(LOOKS[lookName] || LOOKS.twinsen), ...overrides };
  const key = lookName + JSON.stringify(overrides);
  const def = defs[key] ??= { ...design(L), key };
  const { mesh, bones } = buildSculpted(def);
  const root = new THREE.Group();
  root.add(mesh);
  const eyes = addFace(def, bones, L);
  if (L.medallion) addMedallion(def, bones);
  for (const [s, sx] of [['L', 1], ['R', -1]]) {
    rigid(handDef(L, sx), bones['hand' + s]);
    rigid(shoeDef(L), bones['foot' + s]);
  }
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
  rig.bell = L.outfit === 'bell';
  root.scale.setScalar(L.height ? (L.kid ? L.height / 0.78 : L.height) : 1);
  return rig;
}
