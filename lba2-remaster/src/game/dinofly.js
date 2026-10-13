// The Dino-Fly: Twinsen's old friend from LBA2, twelve years on. Too old now to carry the family over the sea (the
// ferry does that), he naps in the garden by the house: he breathes, turns his head to Twinsen when he comes
// close, and now and then stretches his wings. Twinsen can talk to him.
// Sculpted like the trees (SDF → mesh, baked): the body lying down, a head and two wings on pivots.
import * as THREE from 'three';
import { sculptRigid } from '../engine/sculpt.js';
import { softMat } from './props.js';
import { damp, angleDiff, clamp } from '../engine/math.js';
import { t } from './i18n.js';
import { STR } from './i18n.js';

Object.assign(STR.en, {
  n_dinofly: 'Dino-Fly',
  df_hi: 'Hey, old friend. Napping in the sun again?',
  df_rumble: '(A deep, happy rumble. He nudges Twinsen\'s hand with his snout.)',
  df_rest: 'I know. The sea is too wide for your wings now. Rest. The ferry can carry us.',
  df_again: ['(The Dino-Fly opens one eye, rumbles, and goes back to sleep.)', '(He sniffs Twinsen\'s pockets for treats.)', '(He stretches one wing over Twinsen like an umbrella.)'],
});

const COLORS = { g: '#3f8a3a', d: '#2c6a30', y: '#e8d070', b: '#d8b450', w: '#f6f2e6', k: '#161616', m: '#7fbf6a', r: '#2f5f2a' };

function bodyGeo() {
  return sculptRigid({
    key: 'dinofly-body',
    prims: [
      { type: 'ell', c: [0, 0.55, 0], r: [0.72, 0.52, 1.1], mat: 'g', group: 'b' },
      { type: 'cone', a: [0, 0.75, 0.75], b: [0, 1.25, 1.5], r1: 0.36, r2: 0.24, mat: 'g', group: 'b' },
      { type: 'cone', a: [0, 0.5, -0.8], b: [0.25, 0.32, -2.1], r1: 0.4, r2: 0.13, mat: 'g', group: 'b' },
      { type: 'cone', a: [0.25, 0.32, -2.1], b: [0.65, 0.2, -2.8], r1: 0.13, r2: 0.05, mat: 'g', group: 'b' },
      // legs folded under (front) and the haunches (back)
      ...[-1, 1].flatMap((s) => [
        { type: 'ell', c: [s * 0.55, 0.22, 0.8], r: [0.2, 0.17, 0.36], mat: 'g', group: 'b' },
        { type: 'ell', c: [s * 0.52, 0.08, 1.1], r: [0.16, 0.08, 0.18], mat: 'y', group: 'b' },
        { type: 'ell', c: [s * 0.62, 0.32, -0.45], r: [0.28, 0.3, 0.48], mat: 'g', group: 'b' },
        { type: 'ell', c: [s * 0.66, 0.08, -0.05], r: [0.17, 0.08, 0.22], mat: 'y', group: 'b' },
      ]),
      // a ridge of blunt spines along the back and the tail
      ...[0.5, 0.15, -0.2, -0.55, -0.95, -1.35].map((z, i) => ({ type: 'cone', a: [0, 0.98 - Math.max(0, -z - 0.4) * 0.25, z], b: [0, 1.18 - Math.max(0, -z - 0.4) * 0.3, z - 0.12], r1: 0.09 - i * 0.008, r2: 0.025, mat: 'd', group: 's' })),
    ],
    groups: { b: 0.14, s: 0.04 }, joinK: 0.05, colors: COLORS,
    // the belly and the underside of the neck are yellow, the back a darker green
    paint: (p, m, c) => {
      if (m === 'g') {
        const under = p.y < 0.42 - Math.max(0, p.z - 0.6) * -0.5 && Math.abs(p.x) < 0.6 && p.z > -1.2;
        if (under) c.set(COLORS.y);
        else c.offsetHSL(0, 0, (p.y - 0.6) * 0.06 + Math.sin(p.x * 9 + p.z * 7) * 0.012);
      }
    },
    bounds: { min: [-1.0, -0.05, -3.0], max: [1.0, 1.55, 1.9] }, cell: 0.045,
  });
}

function headGeo() {
  return sculptRigid({
    key: 'dinofly-head',
    prims: [
      { type: 'ell', c: [0, 0.12, 0.1], r: [0.28, 0.25, 0.34], mat: 'g', group: 'h' },
      { type: 'cone', a: [0, 0.08, 0.3], b: [0, 0.0, 0.72], r1: 0.21, r2: 0.12, mat: 'b', group: 'h' },
      ...[-1, 1].flatMap((s) => [
        { type: 'cone', a: [s * 0.12, 0.3, -0.02], b: [s * 0.2, 0.58, -0.28], r1: 0.06, r2: 0.02, mat: 'd', group: 'c' },
        { type: 'ell', c: [s * 0.19, 0.2, 0.3], r: [0.085, 0.09, 0.08], mat: 'w', group: 'e' },
        { type: 'ell', c: [s * 0.23, 0.21, 0.35], r: [0.04, 0.05, 0.035], mat: 'k', group: 'e' },
        { type: 'ell', c: [s * 0.07, 0.07, 0.7], r: [0.02, 0.015, 0.02], mat: 'k', group: 'e' },
      ]),
    ],
    groups: { h: 0.08, c: 0.03, e: 0 }, joinK: 0.03, colors: COLORS,
    bounds: { min: [-0.4, -0.2, -0.4], max: [0.4, 0.7, 0.85] }, cell: 0.022,
  });
}

// one wing (+x side), from the shoulder at the origin: an arm bone along the leading edge and a membrane
function wingGeo() {
  return sculptRigid({
    key: 'dinofly-wing',
    prims: [
      { type: 'cone', a: [0, 0, 0], b: [0.75, 0.1, -0.1], r1: 0.09, r2: 0.06, mat: 'g', group: 'a' },
      { type: 'cone', a: [0.75, 0.1, -0.1], b: [1.6, 0.05, -0.55], r1: 0.06, r2: 0.03, mat: 'g', group: 'a' },
      { type: 'ell', c: [0.85, 0.03, -0.5], r: [0.85, 0.05, 0.5], mat: 'm', group: 'm' },
      ...[0.5, 1.0, 1.4].map((x) => ({ type: 'cone', a: [x * 0.9, 0.06, -0.08 - x * 0.25], b: [x * 0.75, 0.02, -0.85], r1: 0.03, r2: 0.015, mat: 'r', group: 'm' })),
    ],
    groups: { a: 0.04, m: 0.03 }, joinK: 0.02, colors: COLORS,
    paint: (p, m, c) => { if (m === 'm') c.offsetHSL(0, 0, -p.z * 0.05); },
    bounds: { min: [-0.15, -0.12, -1.15], max: [1.75, 0.2, 0.15] }, cell: 0.03,
  });
}

export function buildDinoFly(scene, W, x, z, ry) {
  const y = W.H(x, z);
  const root = new THREE.Group(); root.name = 'dinofly'; root.position.set(x, y - 0.03, z); root.rotation.y = ry; scene.add(root);
  const add = (geo, parent, px = 0, py = 0, pz = 0) => { const m = new THREE.Mesh(geo, softMat); m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
  const body = add(bodyGeo(), root);
  const neck = new THREE.Group(); neck.position.set(0, 1.28, 1.52); root.add(neck);
  const head = add(headGeo(), neck);
  const wings = [-1, 1].map((s) => {
    const p = new THREE.Group(); p.position.set(s * 0.5, 0.95, 0.35); p.scale.x = s; root.add(p);
    add(wingGeo(), p);
    return p;
  });
  W.physics.add({ type: 'box', x, z, hw: 0.85, hd: 1.4, rot: ry, top: y + 1.2, noStand: true });
  W.physics.add({ type: 'cyl', x: x + Math.sin(ry) * -2.0, z: z + Math.cos(ry) * -2.0, r: 0.45, top: y + 0.6, noStand: true });

  // state: breathing, looking at Twinsen when he's near, a wing stretch now and then, a nuzzle when talked to
  const S = { t: 0, stretchT: 0, nextStretch: 9, nuzzleT: 0, yaw: 0, pitch: 0, talks: 0 };
  W.updaters.push((dt, tt, hero) => {
    S.t += dt;
    const br = Math.sin(S.t * 1.6);
    body.scale.set(1 + br * 0.012, 1 + br * 0.018, 1);
    // look at Twinsen within 9 m (the head turns, the neck follows a little), else doze, head low
    const h = hero || W._hero;
    let wantYaw = Math.sin(S.t * 0.13) * 0.25, wantPitch = 0.35 + Math.sin(S.t * 0.5) * 0.04;
    if (h) {
      const wx = neck.getWorldPosition(_v);
      const d = Math.hypot(h.pos.x - wx.x, h.pos.z - wx.z);
      if (d < 9) { wantYaw = clamp(angleDiff(ry, Math.atan2(h.pos.x - wx.x, h.pos.z - wx.z)), -1.0, 1.0); wantPitch = clamp(-Math.atan2(h.pos.y + 1.3 - wx.y, d) * 0.6, -0.3, 0.3); }
    }
    if (S.nuzzleT > 0) { S.nuzzleT -= dt; wantPitch = 0.25 + Math.sin(S.nuzzleT * 9) * 0.12; }
    S.yaw = damp(S.yaw, wantYaw, 3, dt); S.pitch = damp(S.pitch, wantPitch, 3, dt);
    neck.rotation.set(S.pitch + br * 0.02, S.yaw, 0);
    // a slow wing stretch: up and open, a beat, folded again
    S.nextStretch -= dt;
    if (S.nextStretch <= 0 && S.stretchT <= 0) { S.stretchT = 2.6; S.nextStretch = 14 + Math.random() * 10; }
    let open = 0;
    if (S.stretchT > 0) { S.stretchT -= dt; const k = 1 - S.stretchT / 2.6; open = Math.sin(Math.min(1, k) * Math.PI); }
    for (const w of wings) {
      w.rotation.z = -0.35 + open * 0.95;     // folded down along the flank → raised
      w.rotation.y = -0.55 + open * 0.45;      // swept back → spread
    }
  });
  W.pets = W.pets || [];
  W.pets.push({
    id: 'dinofly', x, z, r: 3.4,
    talk(g) {
      S.nuzzleT = 1.2;
      const lines = S.talks++ === 0 ? [['hero', 'df_hi'], ['dinofly', 'df_rumble'], ['hero', 'df_rest']] : [['dinofly', 'df_again']];
      if (lines[0][1] === 'df_again') { const all = t('df_again'); g.say('n_dinofly', [all[Math.floor(Math.random() * all.length)]]); return; }
      g.story.cur.chain(lines);
    },
  });
  return root;
}
const _v = new THREE.Vector3();
