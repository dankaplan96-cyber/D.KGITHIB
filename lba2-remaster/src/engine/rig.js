// Procedural character models + pose-blending animator.
//
// Bodies are sculpted from lathe and tapered shapes (no boxes) with
// caricature proportions: big egg-shaped heads, large eyes, slim tapered
// limbs, mitten hands, rounded boots and a flared tunic. LBA2 drove
// hierarchical bodies with keyframed animations; here each animation is a
// function of time producing target joint angles that the joints ease
// toward, so states blend into each other.
import * as THREE from 'three';
import { damp, angleDiff, clamp } from './math.js';
import { textures } from './textures.js';

// ------------------------------------------------------------------ blob shadow
// LBA2 draws a shaded quad under every actor (AfficheShadow / DrawShadow).
let blobGeo = null, blobMat = null;
const STRIKE = new Set(['slash1', 'slash2', 'slash3', 'heavy', 'throwQuick', 'dodge']);
// both hands on a handle that moves with them: the joints follow the pose closely (the handle follows the hands)
const PUMP = new Set(['pump', 'pumpGrip']);
// The pump stroke (Bram's pump, src/game/townlife.js): the handle's angle over the stroke (0 level, < 0 lifted,
// > 0 pushed down) and the pose at three of its angles (shoulders, elbows, lean). Lift 0.22 s, push 0.3 s, back 0.23 s.
export const PUMP_POSE = {
  lift: 0.22, push: 0.3, back: 0.23, out: -0.45,
  up: { th: -0.45, arm: -1.1, el: -1.1, torso: 0.06 },
  level: { th: 0, arm: -0.5, el: -1.05, torso: 0.14 },
  down: { th: 0.28, arm: -0.6, el: -0.7, torso: 0.36 },
};
export const PUMP_STROKE = PUMP_POSE.lift + PUMP_POSE.push + PUMP_POSE.back;
const smooth = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
export function pumpAngle(t) {
  const Q = PUMP_POSE, up = Q.up.th, dn = Q.down.th;
  if (t < Q.lift) return up * smooth(t / Q.lift);
  if (t < Q.lift + Q.push) return up + (dn - up) * smooth((t - Q.lift) / Q.push);
  return dn * (1 - smooth((t - Q.lift - Q.push) / Q.back));
}
const CRAFT = new Set(['tinker', 'kneelWork', 'kneelLook', 'kneelShow', 'reach', 'tapTurn', 'touchWater', 'setDown', 'potting', 'wipe', 'reachHigh']);
const GESTURE_LEN = { nod: 0.8, shrug: 0.9, sigh: 1.1, start: 0.6 };
const FAST = new Set(['action', 'throw', 'throwQuick', 'punch', 'punch2', 'kick', 'slash1', 'slash2', 'slash3', 'heavy', 'dodge', 'pulse', 'charge', 'heavyCharge']);
export function createBlobShadow(radius) {
  blobGeo ??= new THREE.CircleGeometry(1, 20);
  blobMat ??= new THREE.MeshBasicMaterial({ map: textures().blob, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: true });
  const m = new THREE.Mesh(blobGeo, blobMat);
  m.scale.setScalar(radius);
  m.renderOrder = 1;
  m.userData.r = radius;
  return m;
}
const _n = new THREE.Vector3(), _z = new THREE.Vector3(0, 0, 1);
export function placeBlobShadow(m, physics, x, y, z) {
  const t = physics.terrain;
  const g = physics.groundAt(x, z, y + 0.1);
  const e = 0.5;
  _n.set(t.heightAt(x - e, z) - t.heightAt(x + e, z), 2 * e, t.heightAt(x, z - e) - t.heightAt(x, z + e)).normalize();
  if (g > t.heightAt(x, z) + 0.05) _n.set(0, 1, 0); // standing on a brick: flat
  m.quaternion.setFromUnitVectors(_z, _n);
  m.position.set(x, g + 0.05, z);
  // shrinks and fades with height so a jump's landing spot stays readable
  const k = Math.max(0.35, 1 - (y - g) * 0.15);
  m.scale.setScalar(m.userData.r * k);
}

// ------------------------------------------------------------------ materials & shapes
const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0, ...opts }));
  return matCache.get(key);
}

const geoCache = new Map();
const cached = (key, make) => { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); };
// profile: [[radius, y], ...] bottom to top
const lathe = (key, profile, segs = 12) => cached(key, () => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segs));
const taper = (r0, r1, h, segs = 8) => cached(`t${r0}${r1}${h}${segs}`, () => { const g = new THREE.CylinderGeometry(r1, r0, h, segs); g.translate(0, -h / 2, 0); return g; });
const ball = (r, w = 10, h = 8) => cached(`b${r}${w}${h}`, () => new THREE.SphereGeometry(r, w, h));

function part(geo, material, parent, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.castShadow = false; // characters use LBA-style blob shadows
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function joint(parent, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/**
 * opts: skin, tunic, pants, hair, boots, eyes, scale, ponytail, bun, ears (rabbibunny),
 * trunk (grobo), esmer, beard, robe, apron, hat, staff, belt, collar, sleeves
 */
export function createHumanoid(opts = {}) {
  const o = { skin: '#f0c49b', tunic: '#2d6fdc', pants: '#efe6cf', hair: '#3b2414', boots: '#5a3b22', belt: '#6b4423', eyes: '#2a2018', scale: 1, ...opts };
  const root = new THREE.Group();
  const body = joint(root, 0, 0, 0);
  const hips = joint(body, 0, 0.95, 0);
  const skinMat = mat(o.skin, { roughness: 0.7 });
  const tunicMat = mat(o.tunic);
  const pantsMat = mat(o.pants);
  const hairMat = mat(o.hair, { roughness: 0.9 });
  const bootMat = mat(o.boots, { roughness: 0.7 });

  // ---- torso: lathe tunic with a flared hem
  const torso = joint(hips, 0, 0.05, 0);
  const hem = o.robe ? [[0.46, -0.98], [0.4, -0.6], [0.3, -0.25]] : [[0.31, -0.28], [0.29, -0.16]];
  const bodyShape = o.trunk
    ? [[0.36, -0.3], [0.42, -0.05], [0.44, 0.2], [0.38, 0.45], [0.24, 0.6], [0.12, 0.66]]
    : [...hem, [0.235, 0.05], [0.27, 0.28], [0.27, 0.42], [0.2, 0.56], [0.1, 0.63], [0.07, 0.66]];
  part(lathe(`torso${o.robe ? 'r' : ''}${o.trunk ? 'g' : ''}`, bodyShape, 14), tunicMat, torso, 0, 0, 0, 1, 1, 0.82);
  part(lathe('belt', [[0.245, 0.0], [0.25, 0.04], [0.25, 0.1], [0.245, 0.13]], 14), mat(o.belt), torso, 0, -0.02, 0, o.trunk ? 1.7 : 1, 1, o.trunk ? 1.4 : 0.84);
  part(ball(0.045, 6, 4), mat('#d8b04a', { metalness: 0.5, roughness: 0.4 }), torso, 0, 0.04, o.trunk ? 0.34 : 0.21, 1.3, 1, 0.6);
  if (o.collar) part(lathe('collar', [[0.16, 0.0], [0.2, 0.04], [0.15, 0.08]], 12), mat(o.collar), torso, 0, 0.56, 0, 1, 1, 0.85);
  if (o.apron) part(lathe('apron', [[0.27, -0.25], [0.25, 0.2], [0.0, 0.21]], 8), mat(o.apron), torso, 0, 0, 0.03, 1, 1, 0.82);

  // ---- head: egg shape, big eyes, rounded nose
  const neck = joint(torso, 0, 0.64, 0);
  part(taper(0.07, 0.065, 0.12, 8), skinMat, neck, 0, 0.12, 0);
  const head = joint(neck, 0, 0.3, 0);
  const headProfile = o.trunk
    ? [[0, -0.22], [0.16, -0.19], [0.26, -0.04], [0.27, 0.12], [0.2, 0.25], [0, 0.3]]
    : [[0, -0.24], [0.11, -0.21], [0.2, -0.08], [0.225, 0.08], [0.2, 0.22], [0.12, 0.3], [0, 0.32]];
  part(lathe(o.trunk ? 'headG' : 'head', headProfile, 14), skinMat, head, 0, 0, 0, 1, 1, 1.05);
  const eyeWhite = mat('#ffffff', { roughness: 0.3 });
  const pupil = mat(o.eyes, { roughness: 0.2 });
  const eyes = [];
  for (const sx of [-1, 1]) {
    const e = joint(head, sx * 0.085, 0.06, o.trunk ? 0.22 : 0.19);
    part(ball(0.06, 10, 8), eyeWhite, e, 0, 0, 0, 1, 1.25, 0.6);
    part(ball(0.032, 8, 6), pupil, e, sx * -0.005, -0.005, 0.03);
    eyes.push(e);
  }
  // brows
  for (const sx of [-1, 1]) {
    const b = part(cached('brow', () => new THREE.CapsuleGeometry(0.014, 0.07, 2, 4)), hairMat, head, sx * 0.09, 0.15, o.trunk ? 0.24 : 0.2);
    b.rotation.z = Math.PI / 2 + sx * 0.15;
  }
  if (!o.trunk && !o.ears) part(ball(0.055, 8, 6), skinMat, head, 0, -0.03, 0.225, 0.9, 0.8, 1.4); // nose
  part(cached('mouth', () => new THREE.CapsuleGeometry(0.012, 0.06, 2, 4)), mat('#5a2a20'), head, 0, -0.12, o.trunk ? 0.24 : 0.2).rotation.z = Math.PI / 2;
  if (!o.ears && !o.trunk) for (const sx of [-1, 1]) part(ball(0.045, 6, 5), skinMat, head, sx * 0.215, 0.0, -0.01, 0.5, 1, 0.8);

  // hair: cap + fringe; Quetches all wear a ponytail
  let tail = null;
  if (!o.hat && !o.trunk && !o.ears && !o.esmer) {
    const cap = part(cached('hcap', () => new THREE.SphereGeometry(0.235, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.52)), hairMat, head, 0, 0.06, -0.025, 1, 1.05, 1.08);
    cap.rotation.x = -0.32;
    for (let i = -2; i <= 2; i++) {
      const f = part(cached('fringe', () => new THREE.ConeGeometry(0.05, 0.12, 5)), hairMat, head, i * 0.055, 0.22, 0.17);
      f.rotation.set(2.7, 0, i * 0.2);
    }
  }
  if (o.ponytail !== false && !o.trunk && !o.ears && !o.esmer) {
    const tie = joint(head, 0, 0.1, -0.22);
    part(cached('tie', () => new THREE.TorusGeometry(0.045, 0.018, 6, 10)), mat(o.tie || '#c8452f'), tie, 0, 0, 0);
    tail = joint(tie, 0, 0, -0.02);
    let seg = tail;
    tail.segs = [];
    for (let i = 0; i < 5; i++) {
      const s = joint(seg, 0, i === 0 ? 0 : -0.1, 0);
      part(ball(0.06 - i * 0.008, 8, 6), hairMat, s, 0, -0.05, 0, 1, 1.4, 1);
      tail.segs.push(s);
      seg = s;
    }
  }
  if (o.bun) part(ball(0.1, 8, 6), hairMat, head, 0, 0.22, -0.16);
  if (o.ears) {
    // Rabbibunny: round muzzle, buck teeth, long ears
    const furMat = mat(o.ears, { roughness: 0.95 });
    part(ball(0.11, 8, 6), furMat, head, 0, -0.07, 0.15, 1.2, 0.9, 1);
    part(ball(0.035, 6, 4), mat('#ff8fb0'), head, 0, -0.02, 0.255);
    part(cached('teeth', () => new THREE.BoxGeometry(0.06, 0.05, 0.02)), mat('#ffffff'), head, 0, -0.14, 0.235);
    for (const sx of [-1, 1]) {
      const e = joint(head, sx * 0.09, 0.25, -0.02);
      e.rotation.z = -sx * 0.12;
      part(lathe('ear', [[0, 0], [0.06, 0.06], [0.07, 0.25], [0.045, 0.42], [0, 0.47]], 8), furMat, e, 0, 0, 0, 1, 1, 0.45);
      part(lathe('earin', [[0, 0.04], [0.035, 0.1], [0.04, 0.25], [0, 0.4]], 6), mat('#ffb6c8'), e, 0, 0, 0.02, 1, 1, 0.3);
    }
  }
  if (o.trunk) {
    // Grobo: trunk and big flapping ears
    let seg = joint(head, 0, -0.02, 0.24);
    for (let i = 0; i < 5; i++) {
      part(taper(0.08 - i * 0.011, 0.07 - i * 0.011, 0.14, 8), skinMat, seg, 0, 0, 0);
      seg.rotation.x = i === 0 ? 0.55 : 0.22;
      seg = joint(seg, 0, -0.13, 0);
    }
    for (const sx of [-1, 1]) {
      const e = part(ball(0.22, 10, 8), skinMat, head, sx * 0.28, 0.04, -0.02, 0.22, 1.05, 0.95);
      e.rotation.y = sx * 0.3;
    }
  }
  if (o.esmer) {
    // Xil the Esmer: our own design — tall domed skull with a ridge and gill fins
    part(lathe('dome', [[0.2, 0.12], [0.22, 0.22], [0.17, 0.36], [0, 0.42]], 12), skinMat, head, 0, 0.02, -0.02);
    part(cached('ridge', () => new THREE.BoxGeometry(0.03, 0.18, 0.3)), mat(o.ridge || '#4a8a70'), head, 0, 0.35, -0.04);
    for (const sx of [-1, 1]) { const f = part(cached('fin', () => new THREE.ConeGeometry(0.06, 0.2, 4)), mat(o.ridge || '#4a8a70'), head, sx * 0.22, -0.02, -0.03); f.rotation.z = sx * 1.9; }
  }
  if (o.hat) {
    part(cached('brim', () => new THREE.CylinderGeometry(0.4, 0.42, 0.04, 16)), mat(o.hat), head, 0, 0.2, 0);
    part(lathe('crown', [[0.21, 0], [0.2, 0.16], [0.15, 0.22], [0, 0.23]], 12), mat(o.hat), head, 0, 0.21, 0);
  }
  if (o.beard) {
    const b = part(lathe('beard', [[0, -0.32], [0.08, -0.22], [0.16, -0.05], [0.18, 0.03]], 10), mat(o.beard), head, 0, -0.1, 0.07, 1, 1, 0.75);
    b.rotation.x = 0.1;
  }

  // ---- arms: tapered upper/forearm, mitten hands
  const sleeve = o.sleeves ? mat(o.sleeves) : tunicMat;
  const shoulderX = o.trunk ? 0.42 : 0.3;
  const mkArm = (sx) => {
    const sh = joint(torso, sx * shoulderX, 0.5, 0);
    part(ball(0.085, 8, 6), sleeve, sh, 0, 0, 0);
    part(taper(0.08, 0.062, 0.32, 8), sleeve, sh, 0, 0, 0);
    const el = joint(sh, 0, -0.32, 0);
    part(taper(0.058, 0.048, 0.28, 8), skinMat, el, 0, 0, 0);
    const hand = joint(el, 0, -0.3, 0.01);
    part(ball(0.068, 8, 6), skinMat, hand, 0, -0.02, 0, 0.9, 1.2, 0.7);
    part(ball(0.03, 6, 4), skinMat, hand, sx * -0.05, 0.01, 0.03);
    return { sh, el, hand };
  };
  const armL = mkArm(1), armR = mkArm(-1);
  if (o.staff) {
    part(taper(0.035, 0.03, 2.0, 6), mat('#7a5230'), armL.hand, 0, 1.5, 0.02);
    const orb = part(ball(0.11, 12, 10), new THREE.MeshStandardMaterial({ color: '#bff', emissive: '#4cf', emissiveIntensity: 1.2 }), armL.hand, 0, 1.6, 0.02);
    orb.castShadow = false;
  }

  // ---- legs: tapered with rounded boots
  const mkLeg = (sx) => {
    const hip = joint(hips, sx * 0.12, 0, 0);
    part(taper(0.1, 0.075, 0.44, 8), pantsMat, hip, 0, 0, 0);
    const knee = joint(hip, 0, -0.44, 0);
    part(taper(0.072, 0.06, 0.4, 8), pantsMat, knee, 0, 0, 0);
    const foot = joint(knee, 0, -0.4, 0);
    part(ball(0.085, 10, 6), bootMat, foot, 0, -0.03, 0.07, 1, 0.75, 1.75);
    part(taper(0.075, 0.08, 0.14, 8), bootMat, foot, 0, 0.1, 0);
    return { hip, knee, foot };
  };
  const legL = mkLeg(1), legR = mkLeg(-1);
  if (o.robe) { legL.hip.visible = legR.hip.visible = false; }

  root.scale.setScalar(o.scale);
  return new Rig(root, { body, hips, torso, neck, head, tail, armL, armR, legL, legR, eyes });
}

// ------------------------------------------------------------------ animator
export class Rig {
  constructor(root, j) {
    this.root = root;
    this.j = j;
    this.phase = 0;
    this.t = Math.random() * 10;
    this.actionT = 0;
    this.anim = 'idle';
    this.flash = 0;
    this._mats = null;
    this.lookAt = null;       // world position to look toward
    this.lean = 0;            // forward lean from acceleration
    this.roll = 0;            // sideways lean from turning
    this.blinkT = 2 + Math.random() * 3;
    this.fidgetT = 4 + Math.random() * 6;
    this.fidget = 0;
    this.gesture = 0;
    this.landT = 0;
    this.hipsRest = j.hips.position.y;
    this.armSpread = j.skirt ? 0.03 : 0.1;
    this.skirtLag = 0;
    this.over = null;         // upper-body layer (overlay)
    this.moveRel = 0;         // direction of travel relative to facing, while aiming
  }

  play(anim) {
    if (this.anim !== anim) {
      // leaving a quick action (a strike, a throw, a hop) or stopping from a walk/run: the body settles back
      // over a moment instead of snapping into the new pose in a frame
      const prev = this.anim;
      if (FAST.has(prev) && !FAST.has(anim)) this.blendT = 0.3;
      else if ((prev === 'walk' || prev === 'run' || prev === 'sneak') && (anim === 'idle' || anim === 'talk' || anim === 'listen')) this.blendT = 0.22;
      this.anim = anim;
      this.actionT = 0;
      if (anim === 'talk') { let gsel; do gsel = Math.floor(Math.random() * 5); while (gsel === this.gesture); this.gesture = gsel; }
    }
  }

  doGesture(kind) { this.gestureKind = kind; this.gestureT = GESTURE_LEN[kind] || 0.8; }

  // Upper-body layer: a throw or an aimed charge over whatever the legs are doing (walking, strafing, idle).
  // The combat controller feeds its clock every frame while the move runs (t: the same clock that releases the
  // ball); when it stops feeding, the layer runs on by itself through the follow-through and fades out, so the
  // recovery blends into the walk or the idle instead of cutting. A planted (standing) throw plays the full-body
  // animation of the same name and the layer only keeps the clock.
  overlay(kind, t) {
    if (this.over?.kind !== kind) this.over = { kind, t, w: kind === 'throw' ? 1 : 0, fed: true };
    this.over.t = t; this.over.fed = true;
  }
  _upper(kind, t) {
    const U = { armL: 0, elL: 0, armR: 0, elR: 0, torsoX: 0, torsoY: 0, headX: 0, headY: 0 };
    if (kind === 'throw') {
      // the quick throw's arms, chest and head (the same poses as the planted throwQuick below)
      if (t < 0.16) {
        const e = t / 0.16;
        Object.assign(U, { armR: -2.8 * e, elR: -1.6 * e, armL: -0.9 * e, elL: -0.3 * e, torsoY: 0.75 * e, torsoX: -0.1 * e, headY: -0.55 * e });
      } else if (t < 0.26) Object.assign(U, { armR: -1.0, elR: -0.1, armL: 0.35, elL: -0.6, torsoY: -0.35, torsoX: 0.95, headX: -0.75, headY: 0.25 });
      else {
        const k = Math.min(1, (t - 0.26) / 0.35);
        Object.assign(U, { armR: -0.75 + k * 0.6, elR: -0.35, armL: 0.2, elL: -0.45, torsoY: -0.3 * (1 - k), torsoX: 0.85 * (1 - k) + 0.05, headX: -0.65 * (1 - k) });
      }
    } else if (kind === 'charge') {
      const e = Math.min(1, t / 0.25), w = Math.sin(this.t * 30) * 0.02;
      Object.assign(U, { armR: -3.0 * e + w, elR: -1.7 * e, armL: -1.2 * e, elL: -0.15, torsoY: 0.8 * e, torsoX: -0.12 * e, headY: -0.7 * e });
    }
    return U;
  }

  // Everyday actions. Each returns the body values and fills the joint targets T; timing comes from actionT
  // (time since the action started), so an action played again starts from its beginning.
  _craft(a, T) {
    const t = this.actionT, p = { hipsY: 0.95, torsoX: 0, torsoY: 0, torsoZ: 0, headX: 0, headY: 0, headZ: 0, armOut: 0 };
    const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
    const b = Math.sin(this.t * 2.99) * 0.006; // the idle breath keeps working underneath
    if (a === 'tinker') {
      // standing at a table, working on something small with the right hand while the left steadies it
      const w = Math.sin(this.t * 6.5), w2 = Math.sin(this.t * 3.1 + 1);
      p.hipsY = 0.94 + b; p.torsoX = 0.28 + w2 * 0.015; p.headX = 0.3;
      T.armL = -0.62; T.elL = -1.25; T.armR = -0.7 + w * 0.06; T.elR = -1.15 + w * 0.12;
      T.legL = 0.02; T.legR = -0.04; T.kneeL = 0.06; T.kneeR = 0.04;
    } else if (a === 'kneelWork' || a === 'kneelLook' || a === 'kneelShow') {
      // a child kneeling on the floor over a project
      p.hipsY = 0.52 + b; T.legL = -1.35; T.legR = -1.2; T.kneeL = 2.3; T.kneeR = 2.1; T.footL = 0.4; T.footR = 0.4;
      if (a === 'kneelWork') {
        const w = Math.sin(this.t * 5.5);
        p.torsoX = 0.42; p.headX = 0.22; T.armL = -0.75; T.elL = -1.1; T.armR = -0.85 + w * 0.08; T.elR = -0.95 + w * 0.15;
      } else if (a === 'kneelLook') {
        const k = ease(t / 0.4);
        p.torsoX = 0.42 - 0.3 * k; p.headX = 0.22 - 0.3 * k; T.armL = -0.75 + 0.2 * k; T.elL = -1.1; T.armR = -0.85 + 0.25 * k; T.elR = -1.0;
      } else {
        const k = ease(t / 0.45);
        p.torsoX = 0.15; p.headX = -0.1 * k; T.armL = -0.6; T.elL = -1.2; T.armR = -0.85 - 1.0 * k; T.elR = -0.9 + 0.4 * k;
      }
    } else if (a === 'reach' || a === 'tapTurn') {
      // reach out to a tap or a handle at chest height; tapTurn twists it (forearm rolls back and forth)
      const k = ease(t / 0.35);
      p.hipsY = 0.95 + b; p.torsoX = 0.1 * k; p.headX = 0.12 * k;
      T.armR = -1.35 * k; T.elR = -0.55 * k; T.armL = 0.04; T.elL = -0.25;
      T.legL = -0.12 * k; T.legR = 0.08 * k; T.kneeL = 0.08; T.kneeR = 0.05;
      if (a === 'tapTurn') { const w = Math.sin(t * 9); T.elR += w * 0.12; p.torsoY = -0.06 * k + w * 0.02; }
    } else if (a === 'touchWater') {
      // fingers held under the spout, looking at the water
      const k = ease(t / 0.5);
      p.hipsY = 0.94 + b; p.torsoX = 0.22 * k; p.headX = 0.32 * k; p.torsoY = -0.05;
      T.armR = -1.1 * k; T.elR = -0.85 * k; T.armL = -0.25 * k; T.elL = -0.9 * k;
      T.legL = -0.1; T.legR = 0.06; T.kneeL = 0.08; T.kneeR = 0.06;
    } else if (a === 'setDown') {
      // bend a little and put something down on a table with the right hand, then straighten
      const k = t < 0.45 ? ease(t / 0.45) : 1 - ease((t - 0.7) / 0.45);
      p.hipsY = 0.94 - 0.03 * k; p.torsoX = 0.38 * k; p.headX = 0.25 * k;
      T.armR = -0.95 * k; T.elR = -0.55 * k; T.armL = -0.1 * k; T.elL = -0.4;
      T.kneeL = 0.12 * k; T.kneeR = 0.12 * k; T.legL = -0.08 * k; T.legR = -0.08 * k;
    } else if (a === 'potting') {
      // both hands in a seed tray at counter height, pressing soil around the seedlings
      const w = Math.sin(this.t * 4.2);
      p.hipsY = 0.94 + b; p.torsoX = 0.3; p.headX = 0.3 + Math.sin(this.t * 0.7) * 0.04;
      T.armL = -0.95 - w * 0.06; T.armR = -0.95 + w * 0.06; T.elL = -0.85 + w * 0.12; T.elR = -0.85 - w * 0.12;
      T.legL = 0.02; T.legR = -0.03; T.kneeL = 0.08; T.kneeR = 0.08;
    } else if (a === 'wipe') {
      // drying the hands on an apron
      const w = Math.sin(this.t * 10);
      p.hipsY = 0.95 + b; p.torsoX = 0.08; p.headX = 0.16;
      T.armL = -0.42 + w * 0.05; T.armR = -0.42 - w * 0.05; T.elL = -1.25 - w * 0.1; T.elR = -1.25 + w * 0.1;
    } else if (a === 'reachHigh') {
      // reaching up to a hook (a coat stand, a shelf), then bringing the thing down
      const k = t < 0.5 ? ease(t / 0.5) : 1 - ease((t - 0.75) / 0.5);
      p.hipsY = 0.95 + 0.02 * k; p.headX = -0.25 * k; p.torsoX = -0.05 * k;
      T.armR = -2.45 * k; T.elR = -0.35 * k; T.armL = -0.3 * k; T.elL = -0.8 * k;
    }
    return p;
  }

  hitFlash() { this.flash = 1; }
  land(strength = 1) { this.landT = 0.22 * strength; }

  _collectMats() {
    this._mats = [];
    this.root.traverse((m) => {
      if (m.isMesh && m.material && !this._mats.includes(m.material)) {
        m.material = m.material.clone();
        this._mats.push(m.material);
      }
    });
    this._baseEmissive = this._mats.map((m) => m.emissive.clone());
    this._baseIntensity = this._mats.map((m) => m.emissiveIntensity);
  }

  // speed is the real ground speed in m/s so the feet don't slide
  update(dt, speed = 0) {
    if (!(dt > 0)) return; // a negative step would make every damped joint diverge
    const j = this.j;
    this.t += dt;
    this.actionT += dt;
    const a = this.anim;
    const T = {};
    let armOut = 0, hipsY = 0.95, bodyRotX = 0, torsoX = 0, torsoY = 0, torsoZ = 0, headX = 0, headY = 0, headZ = 0;

    const walkLike = a === 'walk' || a === 'run' || a === 'sneak';
    if (walkLike) {
      // one full cycle = two steps; stride grows with speed
      // amplitude grows a little with speed; one cycle = two steps whose length matches
      // the swing of the planted leg (2·L·sin amp), so a planted foot doesn't slide
      const amp = a === 'run' ? 0.62 + Math.min(speed, 8) * 0.03 : a === 'sneak' ? 0.42 : 0.42 + Math.min(speed, 4) * 0.035;
      const legL = this.hipsRest * this.root.scale.y * 0.95;
      const stride = 4 * legL * Math.sin(amp) * (a === 'run' ? 1.55 : 1); // runs have a flight phase (LBA2: 1.9 H per cycle)
      // the sneak lingers on each contact (careful placing), the others are even
      const dph = (speed * dt / stride) * Math.PI * 2;
      this.phase += a === 'sneak' ? dph * (0.55 + 0.9 * Math.abs(Math.sin(this.phase))) : dph;
      const s = Math.sin(this.phase), c = Math.cos(this.phase);
      T.legL = s * amp; T.legR = -s * amp;
      T.kneeL = Math.max(0, -c) * amp * 1.6 + 0.08;
      T.kneeR = Math.max(0, c) * amp * 1.6 + 0.08;
      T.footL = -T.legL * 0.4 - T.kneeL * 0.3; T.footR = -T.legR * 0.4 - T.kneeR * 0.3;
      T.armL = -s * amp * 0.85; T.armR = s * amp * 0.85;
      T.elL = -0.25 - (a === 'run' ? 1.0 : 0.15) - Math.max(0, s) * 0.2; T.elR = -0.25 - (a === 'run' ? 1.0 : 0.15) - Math.max(0, -s) * 0.2;
      if (a === 'run') {
        // in a long robe the heel can't kick up high behind (it would poke through the cloth)
        if (this.j.skirt) {
          T.kneeL = Math.min(T.kneeL, 0.7); T.kneeR = Math.min(T.kneeR, 0.7);
          T.legL = Math.min(T.legL, 0.42); T.legR = Math.min(T.legR, 0.42);
          T.footL = -T.legL * 0.4 - T.kneeL * 0.3; T.footR = -T.legR * 0.4 - T.kneeR * 0.3;
        }
        // running arms pump close to the body: the swing sits behind the hip (forward arm stops at the
        // chest, it never reaches out) and the elbow folds more on the forward swing
        T.armL = 0.22 - s * amp * 0.7; T.armR = 0.22 + s * amp * 0.7;
        T.elL = -1.25 - Math.max(0, s) * 0.45; T.elR = -1.25 - Math.max(0, -s) * 0.45;
      }
      hipsY = 0.95 - 0.03 + Math.abs(c) * (a === 'run' ? 0.07 : 0.035);
      torsoY = s * (a === 'run' ? 0.12 : 0.07);
      headY = -torsoY * 0.8;
      torsoX = a === 'run' ? 0.12 + Math.min(speed, 8) * 0.018 : 0.03 + speed * 0.01;
      if (a === 'walk') {
        // LBA2's walk, from its key poses (measured on the original: contact, mid-stance, push-off, passing;
        // 0.78 body heights per cycle). The leg reaches far forward and little back, the passing knee folds,
        // the arms swing opposite and the torso counter-twists while the head keeps looking ahead.
        const H = this.hipsRest * this.root.scale.y / 0.46; // (LBA2: pelvis at 46% of the height)
        this.phase += (speed * dt / (0.78 * H)) * Math.PI * 2 - dph;
        const p = ((this.phase / (Math.PI * 2)) % 1 + 1) % 1, q = (p + 0.5) % 1;
        const W = WALK_KEYS;
        T.legL = key(W.thigh, p); T.kneeL = key(W.knee, p); T.footL = key(W.foot, p);
        T.legR = key(W.thigh, q); T.kneeR = key(W.knee, q); T.footR = key(W.foot, q);
        T.armL = key(W.arm, p); T.elL = key(W.elbow, p); T.armR = key(W.arm, q); T.elR = key(W.elbow, q);
        hipsY = 0.95 + key(W.bob, p * 2 % 1);
        torsoY = key(W.twist, p); headY = -torsoY;
        torsoX = 0.02 + key(W.lean, p * 2 % 1);
      } else if (a === 'run' && (!this.j.skirt || this.legCloth)) {
        // LBA2's athletic run, from its six key poses (1.94 body heights per cycle): the body leans well into
        // it, the knee drives high in front, the heel kicks up behind on the pass, the arms pump bent
        const H = this.hipsRest * this.root.scale.y / 0.46;
        this.phase += (speed * dt / (1.94 * H)) * Math.PI * 2 - dph;
        const p = ((this.phase / (Math.PI * 2)) % 1 + 1) % 1, q = (p + 0.5) % 1;
        const R = RUN_KEYS;
        T.legL = key(R.thigh, p); T.kneeL = key(R.knee, p); T.footL = key(R.foot, p);
        T.legR = key(R.thigh, q); T.kneeR = key(R.knee, q); T.footR = key(R.foot, q);
        T.armL = key(R.arm, p); T.elL = key(R.elbow, p); T.armR = key(R.arm, q); T.elR = key(R.elbow, q);
        hipsY = 0.95 + key(R.bob, p * 2 % 1);
        torsoY = key(R.twist, p); headY = -torsoY * 0.8;
        torsoX = R.lean * Math.min(1, speed / 4); headX = -torsoX * 0.55; // (the head stays up, looking ahead)
        if (this.robeLegs) {
          // one robe over both legs stretches flat past ~65° between them: a slightly shorter stride, a lower heel
          T.legL *= 0.75; T.legR *= 0.75; T.kneeL = Math.min(T.kneeL, 1.2); T.kneeR = Math.min(T.kneeR, 1.2);
        }
      }
      // aiming while moving: the body faces the aim and the legs step the way it travels (sideways: the swing
      // turns out to the side; backwards: the cycle runs in reverse), so the feet don't skate
      if (this.moveRel) {
        const fx = Math.cos(this.moveRel), sx = Math.sin(this.moveRel);
        for (const sd of ['L', 'R']) { const l = T['leg' + sd]; T['leg' + sd] = l * fx; T['side' + sd] = -l * sx * 0.75; T['foot' + sd] *= Math.abs(fx); }
        torsoX *= Math.max(0, fx);
      }
      if (a === 'sneak') {
        hipsY = 0.74; torsoX = 0.45; headX = -0.38;
        T.armL = 0.6 + s * 0.15; T.armR = 0.6 - s * 0.15; T.elL = -1.3; T.elR = -1.3;
        T.kneeL += 0.65; T.kneeR += 0.65; T.legL -= 0.35; T.legR -= 0.35;
      }
    } else if (a === 'idle' || a === 'talk' || a === 'listen') {
      // LBA2's idle (measured): a slow rock forward and back on the ankles, 2.4 s, the pelvis tipping with it
      // and the arms trailing a little behind the body's swing
      const b = Math.sin(this.t * (Math.PI * 2 / 2.4));
      hipsY = 0.95 + b * 0.006;
      torsoX = -0.02 + b * 0.03;
      bodyRotX = b * 0.025;
      // slow weight shift from one leg to the other (every ~7 s)
      const ws = Math.sin(this.t * 0.9) * Math.max(0, Math.sin(this.t * 0.31)) ;
      torsoZ = ws * 0.03; this.hipShift = ws;
      T.armL = 0.06 + b * 0.06; T.armR = 0.06 + b * 0.05;
      T.elL = -0.18; T.elR = -0.18;
      T.legL = 0.02; T.legR = -0.02; T.kneeL = 0.03; T.kneeR = 0.03;
      // idle fidgets: look around, weight shift, scratch head
      if (a === 'idle' && !this.noFidget) { // (a story scene directs every movement itself)
        this.fidgetT -= dt;
        if (this.fidgetT <= 0) { this.fidget = 1 + Math.floor(Math.random() * 5); this.fidgetT = 5 + Math.random() * 7; this.fidgetStart = this.t; }
        const ft = this.t - (this.fidgetStart ?? -99);
        if (this.fidget && ft < 2.2) {
          const k = Math.sin((ft / 2.2) * Math.PI);
          if (this.fidget === 1) headY = Math.sin(ft * 2.5) * 0.6 * k;
          if (this.fidget === 2) { torsoZ = 0.06 * k; T.legL = 0.12 * k; T.kneeL = 0.2 * k; }
          if (this.fidget === 3) { T.armR = -2.4 * k; T.elR = -1.9 * k; headZ = 0.15 * k; }
          if (this.fidget === 4) { T.armL = T.armR = -2.7 * k; T.elL = T.elR = -0.7 * k; torsoX = -0.1 * k; headX = -0.18 * k; hipsY = 0.95 + 0.01 * k; } // a stretch
          if (this.fidget === 5) { headX = -0.42 * k; headY = Math.sin(ft * 1.4) * 0.25 * k; torsoX = -0.04 * k; } // a glance at the sky
        } else this.fidget = 0;
      }
      if (a === 'talk') {
        // a few different gestures while speaking
        const g = this.gesture, w = Math.sin(this.t * 5);
        headX = Math.sin(this.t * 7) * 0.05;
        if (g === 0) { T.armR = -0.6 + w * 0.25; T.elR = -1.0; }
        if (g === 1) { T.armL = -0.5 + w * 0.2; T.armR = -0.5 - w * 0.2; T.elL = -1.1; T.elR = -1.1; }
        if (g === 2) { T.armR = -0.3; T.elR = -1.6 + w * 0.3; torsoZ = 0.04; }
        if (g === 3) { T.armL = -0.9 + w * 0.15; T.elL = -0.4; T.armR = 0.1; headZ = 0.08; torsoY = 0.12; } // presenting an idea
        if (g === 4) { T.armL = -0.35; T.armR = -0.35; T.elL = -1.7; T.elR = -1.7; torsoX = 0.06; headX = 0.08 + w * 0.04; } // hands together, earnest
      }
      if (a === 'listen') { headX = 0.06; headZ = Math.sin(this.t * 0.8) * 0.05; }
    } else if (a === 'hide') {
      hipsY = 0.5; torsoX = 0.7; headX = -0.4;
      T.legL = -1.4; T.legR = -1.4; T.kneeL = 2.2; T.kneeR = 2.2;
      T.armL = -0.5; T.armR = -0.5; T.elL = -1.6; T.elR = -1.6;
    } else if (a === 'sit') {
      hipsY = 0.48; torsoX = 0.05;
      T.legL = -1.5; T.legR = -1.5; T.kneeL = 1.5; T.kneeR = 1.5;
      T.armL = -0.3; T.armR = -0.3; T.elL = -0.8; T.elR = -0.8;
      headX = 0.25 + Math.sin(this.t * 1.2) * 0.04; // dozing
    } else if (a === 'jump' || a === 'fall') {
      const up = a === 'jump';
      T.legL = up ? -0.9 : -0.4; T.legR = up ? 0.35 : 0.1; T.kneeL = up ? 1.4 : 0.6; T.kneeR = up ? 0.6 : 0.4;
      T.armL = up ? -2.3 : -1.2; T.armR = up ? -2.1 : -1.4; T.elL = -0.3; T.elR = -0.3;
      torsoX = up ? 0.15 : 0;
      if (this.j.skirt) {
        // robed: knees tucked together (split legs would flare the robe into a bell),
        // arms out to the sides for balance rather than both straight up
        T.legL = up ? -0.55 : -0.3; T.legR = up ? -0.4 : -0.2; T.kneeL = up ? 1.0 : 0.5; T.kneeR = up ? 0.85 : 0.45;
        T.armL = up ? -1.3 : -0.9; T.armR = up ? -1.1 : -1.0; T.elL = -0.5; T.elR = -0.5; armOut = 0.7;
      }
    } else if (a === 'punch' || a === 'punch2') {
      // a jab: the fist draws back a little (startup), snaps out straight with the shoulder turned into it
      // (active), then comes back to a guard (recovery); timing from the move, as the sword's
      const r = a === 'punch', A = this.atk || { s: 0.07, a: 0.08, r: 0.17 }, t = this.actionT;
      const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
      const out = t < A.s ? -0.25 * ease(t / A.s) : t < A.s + A.a ? -0.25 + 1.25 * ease((t - A.s) / (A.a * 0.6)) : 1 - 0.65 * ease((t - A.s - A.a) / Math.max(0.05, A.r));
      const sh = -0.35 - 1.2 * Math.max(0, out) + 0.3 * Math.min(0, out), el = -1.7 + 1.6 * Math.max(0, out);
      torsoY = (r ? -0.5 : 0.5) * Math.max(0, out); torsoX = 0.08 + 0.06 * Math.max(0, out);
      if (r) { T.armR = sh; T.elR = el; T.armL = -0.55; T.elL = -1.75; } else { T.armL = sh; T.elL = el; T.armR = -0.55; T.elR = -1.75; }
      T.legL = -0.35; T.legR = 0.35; T.kneeL = 0.35; T.kneeR = 0.25;
      hipsY = 0.9 - 0.03 * Math.max(0, out);
    } else if (a === 'kick') {
      const k = Math.min(1, this.actionT / 0.12);
      T.legR = -1.6 * k; T.kneeR = 0.15; T.legL = 0.2; T.kneeL = 0.35;
      T.armL = -0.8; T.armR = 0.6; T.elL = -1.2; T.elR = -1.0;
      torsoX = -0.3 * k;
      // in a long robe: a low front kick (the cloth can't follow a high one; the leg would tear through it)
      if (this.j.skirt) { T.legR = -0.85 * k; T.kneeR = 0.35 * (1 - k) + 0.05; T.kneeL = 0.45; torsoX = -0.4 * k; hipsY = 0.92; }
    } else if (a === 'slash1' || a === 'slash2' || a === 'slash3' || a === 'heavy') {
      // sword strikes: anticipation (wind back), contact (fast sweep), follow-through, settle. Timing comes
      // from the move (atk.s / atk.a / atk.r) so the blade crosses the target exactly in the active frames.
      const A = this.atk || { s: 0.12, a: 0.1, r: 0.25 }, t = this.actionT;
      const ph = t < A.s ? 0 : t < A.s + A.a ? 1 : 2;
      const k = ph === 0 ? t / A.s : ph === 1 ? (t - A.s) / A.a : Math.min(1, (t - A.s - A.a) / Math.max(0.05, A.r));
      const e = k * k * (3 - 2 * k);
      if (a === 'slash1' || a === 'slash2') {
        // horizontal sweeps: the chest carries the arm across; the hips and the back foot drive it
        const sg = a === 'slash1' ? 1 : -1;
        const tY = ph === 0 ? sg * 0.95 * e : ph === 1 ? sg * (0.95 - 2.0 * e) : sg * (-1.05 + 0.85 * e);
        torsoY = tY; headY = -tY * 0.45;
        const rec = ph === 2 ? e : 0;
        T.armR = ph === 0 ? -1.0 - 0.3 * e : -1.35 + 0.8 * rec; T.elR = ph === 0 ? -0.9 * e : -0.15 - 0.35 * rec;
        T.armL = -0.4; T.elL = -0.9; armOut = 0.25 * (1 - rec);
        T.legL = -0.45 + 0.2 * rec; T.legR = 0.35 - 0.15 * rec; T.kneeL = 0.4 - 0.15 * rec; T.kneeR = 0.2; hipsY = 0.88 + 0.04 * rec;
        torsoX = 0.12 + (ph === 1 ? 0.1 : 0) - 0.06 * rec;
      } else {
        // overhead (slash3) / heavy: blade high behind the head, then down through the target
        const big = a === 'heavy' ? 1.15 : 1;
        if (ph === 0) { T.armR = -2.9 * e * big; T.elR = -0.6 * e; torsoX = -0.18 * e; torsoY = 0.25 * e; hipsY = 0.93; }
        else if (ph === 1) { T.armR = -2.9 * big + 2.1 * e; T.elR = -0.6 + 0.5 * e; torsoX = -0.18 + 0.6 * e; torsoY = 0.25 - 0.3 * e; hipsY = 0.93 - 0.1 * e; }
        else { T.armR = -0.8 + 0.4 * e; T.elR = -0.15 - 0.3 * e; torsoX = 0.42 - 0.32 * e; torsoY = -0.05; hipsY = 0.83 + 0.1 * e; }
        const rec = ph === 2 ? e : 0;
        T.armL = ph === 0 ? -2.3 * e : -0.6 + 0.3 * rec; T.elL = -0.6;
        T.legL = -0.6 + 0.3 * rec; T.legR = 0.4 - 0.2 * rec; T.kneeL = 0.6 - 0.35 * rec; T.kneeR = 0.25 - 0.1 * rec;
      }
    } else if (a === 'heavyCharge') {
      // holding a heavy strike: blade raised, weight back, a slight tremble when ready
      const w = Math.sin(this.t * 40) * 0.03;
      T.armR = -2.95 + w; T.elR = -0.7; T.armL = -2.2; T.elL = -0.6; torsoX = -0.2; torsoY = 0.3;
      T.legL = -0.55; T.legR = 0.45; T.kneeL = 0.65; T.kneeR = 0.35; hipsY = 0.86;
    } else if (a === 'dodge') {
      // a quick low hop the asked way: the body leans into it, knees tuck, arms balance
      const A = this.atk || {}, rel = A.rel || 0, k = Math.min(1, this.actionT / 0.36);
      const hop = Math.sin(k * Math.PI);
      const side = Math.sin(rel), fwd = Math.cos(rel);
      torsoZ = -side * 0.45 * hop; torsoX = fwd * 0.35 * hop; headZ = side * 0.2 * hop;
      hipsY = 0.95 - 0.22 * hop;
      T.legL = -0.5 * hop - fwd * 0.3 * hop; T.legR = -0.3 * hop + fwd * 0.2 * hop; T.kneeL = 1.0 * hop; T.kneeR = 0.8 * hop;
      T.armL = -0.7 * hop; T.armR = -0.5 * hop; T.elL = -0.6; T.elR = -0.6; armOut = 0.6 * hop;
    } else if (a === 'throwQuick') {
      // the quick throw, posed after LBA2's (measured): coil (torso turned away, the throwing arm cocked high
      // behind, the front knee lifting) → at 0.16 s the release, lunging forward and down → the follow-through
      // low over the front leg, settling back up
      const t = this.actionT;
      if (t < 0.16) {
        const e = t / 0.16;
        T.armR = -2.8 * e; T.elR = -1.6 * e; T.armL = -0.9 * e; T.elL = -0.3 * e;
        torsoY = 0.75 * e; torsoX = -0.1 * e; headY = -0.55 * e;
        T.legL = -0.75 * e; T.kneeL = 0.9 * e; T.legR = 0.1; T.kneeR = 0.2; hipsY = 0.95 - 0.02 * e;
      } else if (t < 0.26) {
        T.armR = -1.0; T.elR = -0.1; T.armL = 0.35; T.elL = -0.6;
        torsoY = -0.35; torsoX = 0.95; headX = -0.75; headY = 0.25; // (the original bows deep into the release)
        T.legL = -0.85; T.kneeL = 0.55; T.legR = 0.35; T.kneeR = 0.3; T.footL = 0.35; hipsY = 0.86;
      } else {
        const k = Math.min(1, (t - 0.26) / 0.35);
        T.armR = -0.75 + k * 0.6; T.elR = -0.35; T.armL = 0.2; T.elL = -0.45;
        torsoY = -0.3 * (1 - k); torsoX = 0.85 * (1 - k) + 0.05; headX = -0.65 * (1 - k);
        T.legL = -0.7 * (1 - k) - 0.05; T.kneeL = 0.6 * (1 - k) + 0.05; T.legR = 0.3 * (1 - k); T.kneeR = 0.3 * (1 - k) + 0.05; hipsY = 0.87 + 0.08 * k;
      }
    } else if (a === 'charge') {
      // holding the ball to aim: LBA2's coiled pose before the release, held — the torso turned away, the arm
      // cocked high behind the head, the front knee up a little, the eyes on the target
      const e = Math.min(1, this.actionT / 0.25), w = Math.sin(this.t * 30) * 0.02;
      T.armR = -3.0 * e + w; T.elR = -1.7 * e; T.armL = -1.2 * e; T.elL = -0.15;
      torsoY = 0.8 * e; torsoX = -0.12 * e; headY = -0.7 * e;
      T.legL = -0.45 * e; T.kneeL = 0.55 * e; T.legR = 0.2; T.kneeR = 0.25; hipsY = 0.92;
    } else if (a === 'pulse') {
      // Baldino's pulse tool: both hands forward, a recoil
      const k = Math.min(1, this.actionT / 0.08), back = Math.max(0, 1 - (this.actionT - 0.08) / 0.24);
      T.armR = -1.45 * k; T.armL = -1.4 * k; T.elR = -0.2; T.elL = -0.2; torsoX = 0.1 - 0.25 * back * k; hipsY = 0.9;
      T.legL = -0.4; T.legR = 0.35; T.kneeL = 0.3; T.kneeR = 0.2;
    } else if (a === 'throw') {
      // LBA2's throw (1.22 s there, 1.0 s here): a slow windup with the ball held high behind the head →
      // the whip and release at the half → follow-through and settle
      const t = this.actionT;
      if (t < 0.5) {
        const k = Math.min(1, t / 0.4), e = k * k * (3 - 2 * k);
        T.armR = -3.0 * e; T.elR = -1.7 * e; T.armL = -0.9 * e; T.elL = -0.5;
        torsoY = 0.55 * e; torsoX = -0.12 * e; headY = -0.3 * e;
        T.legL = -0.15; T.legR = 0.2; T.kneeL = 0.15 + 0.1 * e; T.kneeR = 0.25; hipsY = 0.95 - 0.03 * e;
      } else if (t < 0.68) {
        T.armR = -1.25; T.elR = -0.05; T.armL = 0.45; T.elL = -0.7;
        torsoY = -0.5; torsoX = 0.22; headY = 0.25;
        T.legL = -0.5; T.legR = 0.4; T.kneeL = 0.35; T.kneeR = 0.15; hipsY = 0.9;
      } else {
        T.armR = -0.55; T.elR = -0.25; T.armL = 0.2; T.elL = -0.4;
        torsoY = -0.2; torsoX = 0.1;
        T.legL = -0.25; T.legR = 0.2; T.kneeL = 0.2; T.kneeR = 0.1; hipsY = 0.93;
      }
    } else if (a === 'jumpPrep') {
      // anticipation: sink into the knees, arms swing back
      hipsY = 0.78; torsoX = 0.3; T.legL = -0.6; T.legR = -0.6; T.kneeL = 1.1; T.kneeR = 1.1; T.footL = -0.5; T.footR = -0.5;
      T.armL = 0.6; T.armR = 0.6; T.elL = -0.3; T.elR = -0.3;
    } else if (a === 'fall') {
      // coming down: arms up and out for balance, legs reaching for the ground
      const w = Math.sin(this.t * 11) * 0.15;
      T.armL = -1.9 + w; T.armR = -1.7 - w; T.elL = -0.4; T.elR = -0.4;
      armOut = 0.5;
      T.legL = -0.35; T.legR = 0.15; T.kneeL = 0.45; T.kneeR = 0.3; torsoX = -0.05;
    } else if (a === 'pickup') {
      // bend the knees and reach down, then straighten up holding it
      const t = this.actionT, k = t < 0.35 ? t / 0.35 : t < 0.55 ? 1 : Math.max(0, 1 - (t - 0.55) / 0.35);
      hipsY = 0.95 - 0.36 * k; torsoX = 0.75 * k; headX = 0.2 * k;
      T.legL = -1.0 * k; T.legR = -0.6 * k; T.kneeL = 1.7 * k; T.kneeR = 1.2 * k; T.footL = -0.6 * k; T.footR = -0.5 * k;
      T.armR = -1.1 * k; T.elR = -0.2; T.armL = -0.4 * k; T.elL = -0.6;
    } else if (a === 'pump' || a === 'pumpGrip') {
      // both hands together on a pump handle's grip ('pumpGrip': taking hold of it, level): one stroke, the handle
      // lifted, pushed down past level, let back up. The pose is keyed by the handle's angle (fitted so his hands'
      // middle stays on the grip's circle: captures/townlife/ty3fix/fit-pump.mjs); the handle follows his hands.
      const Q = PUMP_POSE, th = a === 'pumpGrip' ? 0 : pumpAngle(this.actionT);
      const K = th < 0 ? Q.up : Q.down, w = th / K.th, L0 = Q.level, mix = (p) => L0[p] + (K[p] - L0[p]) * w;
      T.armL = T.armR = mix('arm'); T.elL = T.elR = mix('el');
      armOut = Q.out;
      torsoX = mix('torso'); hipsY = 0.93 - 0.05 * Math.max(0, th / Q.down.th);
      T.legL = -0.35; T.legR = 0.3; T.kneeL = 0.3 + Math.max(0, th) * 0.7; T.kneeR = 0.2 + Math.max(0, th) * 0.5;
    } else if (a === 'use') {
      // both hands on a wheel/lever, cranking
      const w = Math.sin(this.actionT * 7);
      T.armL = -1.35 + w * 0.25; T.armR = -1.35 - w * 0.25; T.elL = -0.9 + w * 0.2; T.elR = -0.9 - w * 0.2;
      torsoX = 0.18 + Math.abs(w) * 0.06; torsoY = w * 0.12; hipsY = 0.9;
      T.legL = -0.35; T.legR = 0.3; T.kneeL = 0.35; T.kneeR = 0.2;
    } else if (a === 'door') {
      // a step forward and a firm push with the right hand
      const k = Math.min(1, this.actionT / 0.25);
      T.armR = -1.45 * k; T.elR = -0.35 + k * 0.3; T.armL = 0.2; T.elL = -0.3;
      torsoX = 0.2 * k; torsoY = -0.15 * k;
      T.legL = -0.45 * k; T.legR = 0.3 * k; T.kneeL = 0.25; T.kneeR = 0.15; hipsY = 0.92;
    } else if (a === 'knockdown') {
      // thrown on the back: tip over the heels, arms flung, land and bounce
      const k = Math.min(1, this.actionT / 0.32);
      bodyRotX = -1.45 * k * k; hipsY = 0.95 - 0.7 * k;
      T.armL = -2.4 * k; T.armR = -2.2 * k; T.elL = -0.3; T.elR = -0.3;
      T.legL = -0.6 * k; T.legR = -0.3 * k; T.kneeL = 0.6; T.kneeR = 0.4; headX = 0.4 * k;
    } else if (a === 'getup') {
      // roll up from the ground: sit, knee, stand
      const k = Math.min(1, this.actionT / 0.8);
      const up = k * k * (3 - 2 * k);
      bodyRotX = -1.45 * (1 - up); hipsY = 0.25 + 0.7 * up;
      T.legL = -1.4 * (1 - up); T.legR = -0.5 * (1 - up); T.kneeL = 2.0 * (1 - up); T.kneeR = 1.1 * (1 - up);
      T.armL = -0.6 * (1 - up); T.armR = 0.5 * (1 - up); torsoX = 0.6 * Math.sin(up * Math.PI);
    } else if (a === 'turnL' || a === 'turnR') {
      // turning on the spot: a small step with the inside foot
      const sgn = a === 'turnL' ? 1 : -1, w = Math.sin(this.actionT * 14);
      T.legL = Math.max(0, w) * -0.35; T.legR = Math.max(0, -w) * -0.35;
      T.kneeL = Math.max(0, w) * 0.6; T.kneeR = Math.max(0, -w) * 0.6;
      torsoY = sgn * 0.15; headY = sgn * 0.3; T.armL = 0.05; T.armR = 0.05; T.elL = -0.2; T.elR = -0.2;
    } else if (a === 'hurt') {
      // recoil away from where the hit came from (hitDir: 0 = front, ±π/2 = sides, π = back)
      const hd = this.hitDir || 0, fx = Math.cos(hd), sx2 = Math.sin(hd);
      torsoX = -0.7 * fx; torsoZ = 0.55 * sx2; headX = 0.45 * fx; headZ = 0.35 * sx2;
      T.armL = 0.9 * fx - 0.6; T.armR = 0.9 * fx - 0.6; T.elL = -1.0; T.elR = -1.0; hipsY = 0.86; armOut = 0.5;
      T.legL = -0.25 * fx; T.legR = 0.2 * fx; T.kneeL = 0.25; T.kneeR = 0.25;
    } else if (a === 'dead') {
      bodyRotX = -Math.PI / 2; hipsY = 0.3;
      T.armL = -2.8; T.armR = -2.6;
    } else if (a === 'cheer') {
      const b = Math.abs(Math.sin(this.t * 6));
      hipsY = 0.95 + b * 0.15;
      T.armL = -2.9; T.armR = -2.9; T.elL = -0.2; T.elR = -0.2;
    } else if (a === 'action') {
      // LBA2's action (anim 17, Normal mode): a crouch, a little hop with the arms up, a landing with the arms
      // out and a squat, 0.58 s (keys from the original, see ACTION_KEYS)
      const t = this.actionT, K = ACTION_KEYS, at = (v) => keyLin(K.t, v, t);
      hipsY = at(K.hipsY); torsoX = at(K.torso); headX = at(K.head); armOut = at(K.armOut);
      T.armL = at(K.armL); T.armR = at(K.armR); T.elL = at(K.elL); T.elR = at(K.elR);
      T.legL = at(K.legL); T.legR = at(K.legR); T.kneeL = at(K.kneeL); T.kneeR = at(K.kneeR); T.footL = at(K.footL); T.footR = at(K.footR);
      if (this.robeLegs) { T.kneeL = Math.min(T.kneeL, 1.6); T.kneeR = Math.min(T.kneeR, 1.6); }
    } else if (a === 'search') {
      // rummaging in a cupboard or a chest
      const w = Math.sin(this.t * 9);
      torsoX = 0.35; T.armL = -1.2 + w * 0.2; T.armR = -1.2 - w * 0.2; T.elL = -0.6; T.elR = -0.6; headX = 0.2;
    } else if (CRAFT.has(a)) {
      // small everyday actions (the opening scene and later story scenes), see _craft below
      const p = this._craft(a, T);
      hipsY = p.hipsY; torsoX = p.torsoX; torsoY = p.torsoY; torsoZ = p.torsoZ;
      headX = p.headX; headY = p.headY; headZ = p.headZ; armOut = p.armOut;
    }
    // additive gestures on top of any pose: a nod, a shrug, a breath out (story scenes)
    if (this.gestureT > 0) {
      const g = this.gestureKind, d = GESTURE_LEN[g] || 0.8, k = 1 - this.gestureT / d, s = Math.sin(k * Math.PI);
      this.gestureT -= dt;
      if (g === 'nod') headX += Math.sin(k * Math.PI * 2) * 0.16 * s + 0.05 * s;
      if (g === 'shrug') { armOut += 0.25 * s; T.elL = (T.elL ?? 0) - 0.5 * s; T.elR = (T.elR ?? 0) - 0.5 * s; headZ += 0.1 * s; hipsY += 0.012 * s; }
      if (g === 'sigh') { torsoX += 0.1 * s; headX += 0.12 * s; hipsY -= 0.012 * s; }
      if (g === 'start') { torsoX -= 0.08 * s; headX -= 0.1 * s; } // a small surprised straightening
    }

    // landing squash
    if (this.landT > 0) {
      this.landT -= dt;
      const k = Math.max(0, this.landT / 0.22);
      hipsY -= 0.16 * k; T.kneeL = (T.kneeL || 0) + 0.7 * k; T.kneeR = (T.kneeR || 0) + 0.7 * k; T.legL = (T.legL || 0) - 0.35 * k; T.legR = (T.legR || 0) - 0.35 * k; torsoX += 0.2 * k;
    }
    // the upper-body layer (see overlay)
    const O = this.over;
    if (O) {
      if (!O.fed) O.t += dt;
      const full = (O.kind === 'throw' && a === 'throwQuick') || (O.kind === 'charge' && a === 'charge');
      let w;
      if (O.kind === 'throw') { const k = clamp((O.t - 0.3) / 0.32, 0, 1); w = 1 - k * k * (3 - 2 * k); if (O.t > 0.62) this.over = null; }
      else { O.w = damp(O.w, O.fed ? 1 : 0, 14, dt); w = O.w; if (!O.fed && w < 0.02) this.over = null; }
      O.fed = false;
      if (!full && w > 0) {
        const U = this._upper(O.kind, O.t), mix = (v, u) => (v ?? 0) + (u - (v ?? 0)) * w;
        const bow = walkLike ? 0.45 : 1; // (no deep bow while the legs keep walking)
        T.armL = mix(T.armL, U.armL); T.elL = mix(T.elL, U.elL); T.armR = mix(T.armR, U.armR); T.elR = mix(T.elR, U.elR);
        torsoX = mix(torsoX, U.torsoX * bow); torsoY = mix(torsoY, U.torsoY); headX = mix(headX, U.headX * bow); headY = mix(headY, U.headY);
      }
    }
    // momentum leans
    torsoX += this.lean;
    torsoZ += this.roll;
    // turning: the head leads, the chest follows, the pelvis comes last
    if (this.turn) { headY += this.turn * 0.35; torsoY += this.turn * 0.12; }

    // head looks toward a point of interest (in body space)
    if (this.lookAt && a !== 'dead') {
      const p = this.root.position, ry = this.root.rotation.y;
      const want = Math.atan2(this.lookAt.x - p.x, this.lookAt.z - p.z);
      const rel = clamp(angleDiff(ry, want), -1.1, 1.1);
      headY += rel * 0.75;
      torsoY += rel * 0.25;
      const dy = this.lookAt.y - (p.y + 1.6 * this.root.scale.y);
      const dh = Math.hypot(this.lookAt.x - p.x, this.lookAt.z - p.z) || 1;
      headX += clamp(-Math.atan2(dy, dh), -0.5, 0.4);
    }

    // strikes track their poses tightly (lag ≈ 18 ms) so the blade crosses the target in the active frames
    this.blendT = Math.max(0, (this.blendT || 0) - dt);
    const R = STRIKE.has(a) ? 55 : FAST.has(a) ? 30 : PUMP.has(a) ? 26 : this.blendT > 0 ? 8 : 16;
    const set = (obj, v, axis = 'x', r = R) => { obj.rotation[axis] = damp(obj.rotation[axis], v ?? 0, r, dt); };
    set(j.legL.hip, T.legL); set(j.legR.hip, T.legR);
    set(j.legL.knee, T.kneeL); set(j.legR.knee, T.kneeR);
    set(j.legL.foot, T.footL); set(j.legR.foot, T.footR);
    set(j.legL.hip, T.sideL, 'z'); set(j.legR.hip, T.sideR, 'z');
    set(j.armL.sh, T.armL); set(j.armR.sh, T.armR);
    set(j.armL.el, T.elL); set(j.armR.el, T.elR);
    j.hips.position.y = damp(j.hips.position.y, this.hipsRest + (hipsY - 0.95) * (this.hipsRest / 0.95), R, dt);
    set(j.torso, torsoX); set(j.torso, torsoY, 'y'); set(j.torso, torsoZ, 'z', 8);
    set(j.head, headX, 'x', 10); set(j.head, headY, 'y', 8); set(j.head, headZ, 'z', 8);
    set(j.body, bodyRotX, 'x', 8);
    this._armOut = damp(this._armOut || 0, armOut, PUMP.has(a) ? 26 : 8, dt);
    j.armL.sh.rotation.z = this.armSpread + this._armOut; j.armR.sh.rotation.z = -this.armSpread - this._armOut;
    // pelvis counter-rotates against the shoulders while walking
    if (walkLike) j.hips.rotation.y = damp(j.hips.rotation.y, -torsoY * 0.8, R, dt); else j.hips.rotation.y = damp(j.hips.rotation.y, 0, 8, dt);
    // idle weight shift tilts the pelvis toward the standing leg
    j.hips.rotation.z = damp(j.hips.rotation.z, (a === 'idle' || a === 'talk' || a === 'listen') ? -(this.hipShift || 0) * 0.05 : 0, 4, dt);

    // tunic panels follow the legs with a little drag (cloth follow-through)
    if (j.skirt) {
      const lL = j.legL.hip.rotation.x, lR = j.legR.hip.rotation.x;
      this.skirtLag = damp(this.skirtLag, Math.min(speed, 7) * 0.035 + this.lean * 0.6, 4, dt);
      const sp2 = 10;
      set(j.skirt.F, Math.min(lL, lR, 0) * 1.0 + this.skirtLag * 0.25, 'x', sp2);
      // the back panel also makes room for a heel folded up behind (runs, jumps)
      const kL = j.legL.knee.rotation.x, kR = j.legR.knee.rotation.x;
      set(j.skirt.B, Math.max(lL + Math.max(0, kL) * 0.6, lR + Math.max(0, kR) * 0.6, 0) * 1.0 + this.skirtLag, 'x', sp2);
      set(j.skirt.L, lL * 0.55 + this.skirtLag * 0.5, 'x', sp2);
      set(j.skirt.R, lR * 0.55 + this.skirtLag * 0.5, 'x', sp2);
      set(j.skirt.L, -this.roll * 0.5 + 0.02, 'z', 6);
      set(j.skirt.R, -this.roll * 0.5 - 0.02, 'z', 6);
    }

    // blinking
    this.blinkT -= dt;
    const blink = this.blinkT < 0.12;
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 4;
    for (const e of j.eyes) e.scale.y = blink ? 0.12 : 1;

    // ponytail follows motion with lag
    if (j.tail) {
      // (+x lifts a backward-pointing tail) at rest its weight lets it hang a touch; moving, the air streams
      // it back a little and every footfall bounces it — never so much that it stands up like a spike
      const v = Math.min(speed, 7);
      const sway = -0.04 + v * 0.022 + Math.sin(this.phase * 2) * v * 0.012 - (this.lean || 0) * 0.2;
      j.tail.segs.forEach((s, i) => {
        s.rotation.x = damp(s.rotation.x, sway * (i + 1) * 0.28 + Math.sin(this.t * 2 + i) * 0.02, 9 - i, dt);
        s.rotation.z = damp(s.rotation.z, -this.roll * (i + 1) * 0.6, 8, dt);
      });
    }

    if (this.flash > 0) {
      if (!this._mats) this._collectMats();
      this.flash = Math.max(0, this.flash - dt * 4);
      this._mats.forEach((m, i) => {
        m.emissive.copy(this._baseEmissive[i]).lerp(_white, this.flash);
        m.emissiveIntensity = Math.max(this._baseIntensity[i], this.flash * 1.2);
      });
    }
  }
}
const _white = new THREE.Color(1, 1, 1);
// Key poses of the walk, four per cycle (phase 0: this leg's heel strike in front; 0.25: mid-stance;
// 0.5: push-off behind; 0.75: passing), in radians, measured on LBA2's walk (both legs averaged).
// Arms are keyed on their own side's leg (forward while that leg is behind); bob and lean repeat every step.
const D = Math.PI / 180;
// LBA2's action hop (ANIM.HQR 17, the hero's generic anim 11 in every behaviour): key times 0/160/320/440/520 ms,
// over at 580 ms. Body height +369/-134/-148 units of 1238 (hipsY: 0.484 H per unit); angles in radians.
const ACTION_KEYS = {
  t: [0, 0.16, 0.32, 0.44, 0.52, 0.58],
  hipsY: [0.95, 0.73, 1.57, 0.95, 0.7, 0.95],
  torso: [0, 0.61, 0.23, -0.1, 0.77, 0], head: [0, 0.6, 0.3, 0, -0.28, 0],
  armL: [0, 0, -1.62, 0, -0.23, 0], armR: [-0.05, -0.23, -1.64, 0, -0.23, 0], armOut: [0, 0.68, 0.42, 1.5, 0, 0],
  elL: [-0.1, -0.1, -0.1, -0.6, 0, -0.1], elR: [-0.1, -0.1, -0.1, -0.8, 0, -0.1],
  legL: [0, -1.33, -0.77, -0.89, -1.1, 0], legR: [0, -0.86, -1.33, 0, -0.72, 0],
  kneeL: [0, 1.59, 1.19, 1.27, 1.47, 0], kneeR: [0, 1.19, 2.46, 0, 1.41, 0],
  footL: [0, -0.42, 0.38, 0, -0.38, 0], footR: [0, -0.54, 0, 0, -0.63, 0],
};
// linear between keys (as LBA2 interpolates), held at the ends
function keyLin(ts, vs, t) {
  if (t <= ts[0]) return vs[0];
  for (let i = 1; i < ts.length; i++) if (t < ts[i]) return vs[i - 1] + (vs[i] - vs[i - 1]) * (t - ts[i - 1]) / (ts[i] - ts[i - 1]);
  return vs[vs.length - 1];
}
const WALK_KEYS = {
  thigh: [-46 * D, -8 * D, 25 * D, -20 * D],
  knee: [18 * D, 10 * D, 7 * D, 52 * D],
  foot: [12 * D, 8 * D, -8 * D, -7 * D],
  arm: [10 * D, 0, -25 * D, 0],
  elbow: [-0.12, -0.15, -22 * D - 0.12, -0.15],
  twist: [-14 * D, 0, 14 * D, 0],
  bob: [-0.02, 0.027],          // contact low, passing high (× pelvis height / 0.95)
  lean: [0.1, 0.0],             // the torso dips forward a little at each contact
};
// The athletic run, six keys per cycle starting at this leg's knee drive (thighs absolute: LBA2 tilts the pelvis
// 11-36° forward and the legs with it); arms relative to the torso; the lean is the pelvis plus the torso.
const RUN_KEYS = {
  thigh: [-62 * D, -33 * D, 23 * D, 33 * D, -12 * D, -58 * D],
  knee: [8 * D, 2 * D, 4 * D, 47 * D, 102 * D, 90 * D],
  foot: [40 * D, -13 * D, 1 * D, -4 * D, 40 * D, 35 * D],
  arm: [69 * D, 20 * D, -32 * D, -54 * D, -20 * D, 27 * D],
  elbow: [-110 * D, -34 * D, -28 * D, -68 * D, -122 * D, -91 * D],
  twist: [17 * D, 0, 0, -20 * D, -8 * D, 0],
  bob: [0.03, -0.035, 0.0],     // up off the push, down on landing (× pelvis height / 0.95; LBA2 drops further, its feet sink)
  lean: 0.4,                    // ≈ 23° into the run
};
// periodic Catmull-Rom through evenly spaced keys (smooth, passes through every measured pose)
function key(k, t) {
  const n = k.length, x = t * n, i = Math.floor(x) % n, u = x - Math.floor(x);
  const p0 = k[(i + n - 1) % n], p1 = k[i], p2 = k[(i + 1) % n], p3 = k[(i + 2) % n];
  return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
}
