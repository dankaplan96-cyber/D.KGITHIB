// The Dino-Fly: Twinsen's old friend from LBA2, twelve years on. Too old now to carry the family over the sea (the
// ferry does that), he naps in the garden by the house: he breathes, turns his head to Twinsen when he comes
// close, and now and then stretches his wings. Twinsen can talk to him.
// The model is LBA2's Dino-Fly rebuilt as polygons (tools/blender/dinofly_poly.py → assets/poly/dinofly.json, after
// the original's measured proportions: docs/character-review.md, "The Dino-Fly"), skinned to its own small
// skeleton; this file poses it: lying down for the nap (legs folded, tail curled, wings folded on the flanks),
// the neck and head lift and turn toward Twinsen, the wings open in a stretch, the eyelids droop while he dozes.
import * as THREE from 'three';
import { LbaMaterial } from './characters.js';
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

// the model loads once, when this module is first imported (long before the island is built)
let DATA = null;
const LOAD = fetch(new URL('../../assets/poly/dinofly.json', import.meta.url))
  .then((r) => (r.ok ? r.json() : null)).then((j) => (DATA = j)).catch(() => null);

const D = Math.PI / 180;
// poses: degrees per bone [x, y, z] (Euler order XZY, the original's rotation order). +x tips a forward-pointing
// bone down (and swings a downward-pointing one back); +y turns a forward-pointing bone toward the creature's
// left; +z raises a left wing. Right-side bones mirror (y and z negated).
const DOZE = {   // lying on the belly, the tail and the neck curled round to his left, the head low, wings folded
  body: [3, 0, 4],
  tail0: [-14, -16, 0], tail1: [-4, -24, 0], tail2: [2, -30, 0],
  neck0: [24, 22, 0], neck1: [22, 22, 0], neck2: [8, 22, 0], head: [-40, 10, 8],
  thighL: [40, 0, 8], shinL: [-92, 0, 0], footL: [52, 0, -6],
  // the wings folded as a resting flier folds them, laid along the flank: the upper arm back along the top of the
  // flank, the forearm forward over it (the wrist by the shoulder), the hand back again toward the tail; the
  // membrane hangs in overlapping pleats below the bones with the scalloped edge low on the flank. (Solved from
  // target directions in the body's frame: the three bones lie as one ridge just under the back line; the
  // membrane hangs 37° out from the flank; its fold lines turn 80°/65°/45° so the back half of each
  // panel tucks in under the front half, the scalloped edge against the lower flank, clear of the ground.)
  wing0L: [-163.7, -67.4, 52], wing1L: [177.7, -179.5, -13.3], wing2L: [177.6, 108.2, 2.9],
  mem0L: [79.9, 6.3, 7.5], mem1L: [-64.4, 7.3, -11.6], mem2L: [29.8, -9.7, -35.4],
};
// the neck raised in an S (the gaze adds its turn on top): the base steep, the middle upright with a slight lean to
// his left, the top arched forward and back to his right, the head bowed a little like a horse looking down at
// someone close, so from the play camera (above and behind Twinsen, whom he looks at) the neck reads upright and
// curved beside the head and the head shows its length, instead of both foreshortening into a tube
const ALERT = {
  neck0: [-30, 0, 0], neck1: [-15, 8, 0], neck2: [26, -10, 0], head: [5, 0, 0],
};
// the stretch: a real spread, the arm raised about 40° and swept a little forward, the forearm and hand out
// straight with the tip swept back (the rest layout), the chest lifted
const OPEN = {
  body: [-3, 0, 4], wing0L: [5.7, 29, 39.2], wing1L: [2.7, -33.2, -15.5], wing2L: [5.8, 3.3, -21.3],
  mem0L: [0, 0, 0], mem1L: [0, 0, 0], mem2L: [0, 0, 0],   // the membrane's fold lines straight: one taut sheet
};
// the gaze's turn shared along the neck: mostly high in the neck and at the head, so the column stays side-on to
// Twinsen and its curve reads; the shares add up to 0.7 (with side eyes he looks at him in three-quarter, one eye
// on him), and the head tilts (tilt × the turn) toward him
const GAZE = { neck0: 0.1, neck1: 0.1, neck2: 0.2, head: 0.3, tilt: 0.3 };
const DROP = 0.86;   // the body lowered to lie on its belly (metres)
export const DINOFLY_POSES = { DOZE, ALERT, OPEN, GAZE };   // (docs/lba3-visual/evidence/CH-DF-FIX/dinofly-lookdev.html tries variants)

const _c = new THREE.Color();
function colors(list) {
  const out = new Float32Array(list.length);
  for (let i = 0; i < list.length; i += 3) { _c.setRGB(list[i] / 255, list[i + 1] / 255, list[i + 2] / 255, THREE.SRGBColorSpace); out[i] = _c.r; out[i + 1] = _c.g; out[i + 2] = _c.b; }
  return out;
}

// the skinned mesh, its bones by name and the two eyes (lids scale along the eye's own vertical)
function buildModel(P) {
  const bones = {}, list = [];
  for (const b of P.skel) {
    const bone = new THREE.Bone(); bone.name = b.name;
    const par = b.parent ? P.skel.find((q) => q.name === b.parent).p : [0, 0, 0];
    bone.position.set(b.p[0] - par[0], b.p[1] - par[1], b.p[2] - par[2]);
    bone.rotation.order = 'XZY';
    bone.userData.rest = bone.position.clone();
    bones[b.name] = bone; list.push(bone);
    if (b.parent) bones[b.parent].add(bone);
  }
  const map = P.bones.map((n) => list.findIndex((b) => b.name === n));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P.pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(P.nrm, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors(P.col), 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(P.si.map((i) => Math.max(0, map[i])), 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(P.sw, 4));
  geo.computeBoundingSphere();
  const mat = new LbaMaterial({ side: THREE.DoubleSide });   // (the wing membranes are single sheets)
  const mesh = new THREE.SkinnedMesh(geo, mat);
  mesh.name = 'dinofly-mesh';
  mesh.frustumCulled = false; mesh.castShadow = true;
  mesh.add(bones.root);
  mesh.bind(new THREE.Skeleton(list));
  const hp = P.skel.find((q) => q.name === 'head').p;
  const eyes = P.eyes.map((e) => {
    const g = new THREE.Group();
    g.position.set(e.pivot[0] - hp[0], e.pivot[1] - hp[1], e.pivot[2] - hp[2]);
    const [u, v, w] = e.basis.map((a) => new THREE.Vector3(...a));
    g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(u, v, w));
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.Float32BufferAttribute(e.pos, 3));
    eg.setAttribute('color', new THREE.BufferAttribute(colors(e.col), 3));
    eg.computeVertexNormals();
    g.add(new THREE.Mesh(eg, mat));
    bones[e.bone].add(g);
    return g;
  });
  return { mesh, bones, eyes };
}

const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qg = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'XZY');
const _ax = new THREE.Vector3(1, 0, 0), _ay = new THREE.Vector3(0, 1, 0), _az = new THREE.Vector3(0, 0, 1);
function quat(q, a, mirror) { return q.setFromEuler(_e.set(a[0] * D, (mirror ? -a[1] : a[1]) * D, (mirror ? -a[2] : a[2]) * D, 'XZY')); }

// set every bone from the poses: doze, blended toward alert by `alert` and toward open by `open` (one number, or
// per wing bone { wing0, wing1, wing2, body } so the shoulder leads and the hand follows), plus the gaze. The
// blends are quaternion slerps: the folded wing turns through large angles on three axes, which an Euler mix
// would swing through the body.
function pose(M, alert, open, yaw, pitch, br) {
  const B = M.bones;
  const ok = (n) => (typeof open === 'number' ? open : (open[n.replace(/[LR]$/, '')] ?? open.body ?? 0));
  const names = new Set([...Object.keys(DOZE), ...Object.keys(ALERT), ...Object.keys(OPEN)]);
  for (const b of Object.values(B)) if (b.name !== 'root') b.quaternion.identity();
  for (const n of names) {
    for (const mirror of n.endsWith('L') ? [false, true] : [false]) {
      const b = B[mirror ? n.slice(0, -1) + 'R' : n]; if (!b) continue;
      quat(_qa, DOZE[n] || [0, 0, 0], mirror);
      if (ALERT[n] && alert > 0) _qa.slerp(quat(_qb, ALERT[n], mirror), alert);
      const k = OPEN[n] ? ok(n) : 0;
      if (k > 0) _qa.slerp(quat(_qb, OPEN[n], mirror), k);
      b.quaternion.copy(_qa);
    }
  }
  // the gaze: the turn shared along the neck (GAZE), the pitch at the head and the top of the neck
  for (const [n, k] of Object.entries(GAZE)) if (B[n]) B[n].quaternion.multiply(_qg.setFromAxisAngle(_ay, yaw * k));
  // his eyes are on the sides of the head: he regards Twinsen with one eye, the head tilted toward him
  B.head.quaternion.multiply(_qg.setFromAxisAngle(_az, -yaw * GAZE.tilt));
  B.head.quaternion.premultiply(_qg.setFromAxisAngle(_ax, pitch));
  B.neck2.quaternion.premultiply(_qg.setFromAxisAngle(_ax, pitch * 0.4));
  // lying on the belly; the breath lifts the back a little
  B.body.position.copy(B.body.userData.rest);
  B.body.position.y -= DROP - br * 0.012;
  B.body.scale.set(1 + br * 0.012, 1 + br * 0.018, 1);
}

// the stretch over its 2.6 s (k 0…1): the shoulder leads, the forearm and the hand follow a beat later; up in the
// first 38%, held open (the hand trembling a little at full reach), folded in the last 38%; all closed at k = 1
const STAGGER = { body: 0, wing0: 0, wing1: 0.05, wing2: 0.1 };
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function stretchCurve(k) {
  const out = {};
  for (const [n, d] of Object.entries(STAGGER)) {
    const u = clamp((k - d) / (1 - 0.1), 0, 1);
    out[n] = ss(0, 0.38, u) * (1 - ss(0.62, 1, u));
  }
  out.mem0 = out.wing0; out.mem1 = out.wing1; out.mem2 = out.wing2;   // (the membrane unfolds with its bone)
  out.wing2 = Math.max(0, out.wing2 - 0.04 * (1 + Math.sin(k * 60)) * out.wing0 * (out.wing0 > 0.97 ? 1 : 0));
  return out;
}

// he lies turned this much from the spot's heading, so the play camera (looking west over the garden) sees his
// left flank, the curled neck and the folded wings instead of a head-on lump
const TURN = -1.3;

export function buildDinoFly(scene, W, x, z, ry0, opts = {}) {
  const y = W.H(x, z), ry = ry0 + (opts.turn ?? TURN);
  const root = new THREE.Group(); root.name = 'dinofly'; root.position.set(x, y - 0.03, z); root.rotation.y = ry; scene.add(root);
  let M = null;
  const attach = (P) => {
    if (!P || M) return;
    M = buildModel(P);
    root.add(M.mesh);
    root.userData.model = M;
    if (!opts.rest) pose(M, 0, 0, 0, 0, 0);
  };
  if (DATA) attach(DATA);
  else root.userData.ready = LOAD.then(attach);
  // the body lying (its centre a little behind the hips' pivot) and the tail curled round to its left
  const at = (lx, lz) => ({ x: x + Math.cos(ry) * lx + Math.sin(ry) * lz, z: z - Math.sin(ry) * lx + Math.cos(ry) * lz });
  const bc = at(0, -0.3), tc = at(0.75, -2.5);
  W.physics.add({ type: 'box', x: bc.x, z: bc.z, hw: 0.9, hd: 1.25, rot: ry, top: y + 1.3, noStand: true });
  W.physics.add({ type: 'cyl', x: tc.x, z: tc.z, r: 0.5, top: y + 0.6, noStand: true });

  // state: breathing, looking at Twinsen when he's near, a wing stretch now and then, a nuzzle when talked to
  const S = { t: 0, stretchT: 0, nextStretch: 9, nuzzleT: 0, yaw: 0, pitch: 0, alert: 0, lid: 0.3, blinkT: 3, talks: 0 };
  root.userData.state = S;
  W.updaters.push((dt, tt, hero) => {
    S.t += dt;
    if (!M || opts.rest) return;
    const br = Math.sin(S.t * 1.6);
    // look at Twinsen within 9 m (the neck lifts, the head turns, the eyes open), else doze, head low
    const h = hero || W._hero;
    let wantYaw = Math.sin(S.t * 0.13) * 0.15, wantPitch = Math.sin(S.t * 0.5) * 0.03, wantAlert = 0;
    if (h) {
      const wx = M.bones.neck1.getWorldPosition(_v);
      const d = Math.hypot(h.pos.x - wx.x, h.pos.z - wx.z);
      if (d < 9) {
        wantAlert = 1;
        wantYaw = clamp(angleDiff(ry, Math.atan2(h.pos.x - wx.x, h.pos.z - wx.z)), -1.4, 1.4);
        wantPitch = clamp(-Math.atan2(h.pos.y + 1.3 - (wx.y + 0.6), d) * 0.6, -0.35, 0.35);
      }
    }
    if (S.nuzzleT > 0) { S.nuzzleT -= dt; wantPitch = 0.3 + Math.sin(S.nuzzleT * 9) * 0.12; }
    S.alert = damp(S.alert, wantAlert, 2, dt);
    S.yaw = damp(S.yaw, wantYaw, 3, dt); S.pitch = damp(S.pitch, wantPitch, 3, dt);
    // a slow wing stretch: up and open, a beat, folded again
    S.nextStretch -= dt;
    if (S.nextStretch <= 0 && S.stretchT <= 0) { S.stretchT = 2.6; S.nextStretch = 14 + Math.random() * 10; }
    let open = 0;
    if (S.stretchT > 0) { S.stretchT -= dt; open = stretchCurve(1 - S.stretchT / 2.6); }
    // the doze's curl to the left (along the neck) unwinds as he looks up; the gaze turn comes on top
    // (evidence scripts may hold a state: root.userData.hold = { alert, open }; the game never sets it)
    const H = root.userData.hold;
    if (H) { if (H.alert != null) { S.alert = H.alert; if (!H.alert) { S.yaw = 0; S.pitch = 0; } } if (H.open != null) open = H.open; }
    pose(M, S.alert, open, S.yaw, S.pitch, br);
    // eyelids: heavy while dozing, open when he looks at Twinsen, a blink now and then; shut for the nuzzle
    S.blinkT -= dt; if (S.blinkT < -0.14) S.blinkT = 2.5 + Math.random() * 3;
    let lid = 0.22 + 0.78 * S.alert;
    if (S.blinkT < 0 && S.alert > 0.5) lid = 0.1;
    if (S.nuzzleT > 0) lid = 0.08;
    S.lid = damp(S.lid, lid, 14, dt);
    for (const e of M.eyes) e.scale.y = S.lid;
  });
  W.pets = W.pets || [];
  W.pets.push({
    id: 'dinofly', x, z, r: 3.6,
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
