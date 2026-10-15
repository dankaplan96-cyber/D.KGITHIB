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
const DOZE = {   // lying on the belly, the tail and the neck curled round to his left, the head low, wings folded up
  body: [3, 0, 4],
  tail0: [-14, -16, 0], tail1: [-4, -24, 0], tail2: [2, -30, 0],
  neck0: [24, 22, 0], neck1: [22, 22, 0], neck2: [8, 22, 0], head: [-40, 10, 8],
  thighL: [40, 0, 8], shinL: [-92, 0, 0], footL: [52, 0, -6],
  // the wings folded as the original's idle folds them (shoulder up 67°, forearm back down, the tip in)
  wing0L: [31, 0, 67], wing1L: [0, 0, -148], wing2L: [0, 0, -50],
};
const ALERT = { // the neck raised, the head held level (the gaze adds its turn on top)
  neck0: [8, 0, 0], neck1: [6, 0, 0], neck2: [-6, 0, 0], head: [-12, 0, 0],
};
const OPEN = { wing0L: [-6, 0, 104], wing1L: [0, 0, -34], wing2L: [0, 0, -8] };   // the stretch, wings up and open
const DROP = 0.86;   // the body lowered to lie on its belly (metres)
export const DINOFLY_POSES = { DOZE, ALERT, OPEN };   // (docs/lba3-visual/evidence/CH-DF/dinofly-lookdev.html tries variants)

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

// set every bone from the poses: doze, blended toward alert by `alert`, wings toward open by `open`, plus the gaze
function pose(M, alert, open, yaw, pitch, br) {
  const B = M.bones;
  for (const b of Object.values(B)) if (b.name !== 'root') b.rotation.set(0, 0, 0);
  const set = (name, a, mirror) => {
    const b = B[name]; if (!b) return;
    b.rotation.set(a[0] * D, (mirror ? -a[1] : a[1]) * D, (mirror ? -a[2] : a[2]) * D);
  };
  const mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  for (const [n, a] of Object.entries(DOZE)) {
    let v = a;
    if (ALERT[n]) v = mix(a, ALERT[n], alert);
    if (OPEN[n]) v = mix(a, OPEN[n], open);
    set(n, v, false);
    if (n.endsWith('L')) set(n.slice(0, -1) + 'R', v, true);
  }
  // the gaze: the turn shared along the neck, the head takes the most; the pitch at the head
  const share = { neck0: 0.2, neck1: 0.25, neck2: 0.25, head: 0.3 };
  for (const [n, k] of Object.entries(share)) B[n].rotation.y += yaw * k;
  B.head.rotation.x += pitch;
  B.neck2.rotation.x += pitch * 0.4;
  // lying on the belly; the breath lifts the back a little
  B.body.position.copy(B.body.userData.rest);
  B.body.position.y -= DROP - br * 0.012;
  B.body.scale.set(1 + br * 0.012, 1 + br * 0.018, 1);
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
    if (S.stretchT > 0) { S.stretchT -= dt; const k = 1 - S.stretchT / 2.6; open = Math.sin(Math.min(1, k) * Math.PI); }
    // the doze's curl to the left (along the neck) unwinds as he looks up; the gaze turn comes on top
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
