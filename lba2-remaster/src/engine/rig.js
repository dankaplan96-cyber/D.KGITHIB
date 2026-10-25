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
// the actions in which the player's character keeps his feet planted (Rig._plant)
const PLANT = new Set(['idle', 'talk', 'listen', 'turnL', 'turnR', 'throwQuick', 'charge', 'punch', 'punch2', 'kick', 'slash1', 'slash2', 'slash3', 'heavy', 'heavyCharge', 'pulse', 'hurt', 'pickup', 'door', 'use', 'search']);
const newFoot = () => ({ on: false, w: 0, P: new THREE.Vector3(), from: new THREE.Vector3(), stepping: false, u: 0, dur: 0.1, lift: 0 });
const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
const _fp = new THREE.Vector3(), _v3 = new THREE.Vector3(), _m4 = new THREE.Matrix4();
// the legs' animated pose, kept apart from the bones for foot planting
function fkLegs(j) {
  const h = (b) => ({ rotation: { x: b.rotation.x, y: b.rotation.y, z: b.rotation.z } });
  return { L: { hip: h(j.legL.hip), knee: h(j.legL.knee), foot: h(j.legL.foot) }, R: { hip: h(j.legR.hip), knee: h(j.legR.knee), foot: h(j.legR.foot) } };
}
// every blob shadow made (PERF-2: engine/drawcull.js BlobBatch draws the shown ones in one instanced call)
export const BLOBS = [];
export function createBlobShadow(radius) {
  blobGeo ??= new THREE.CircleGeometry(1, 20);
  blobMat ??= new THREE.MeshBasicMaterial({ map: textures().blob, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: true });
  const m = new THREE.Mesh(blobGeo, blobMat);
  m.scale.setScalar(radius);
  m.renderOrder = 1;
  m.userData.r = radius;
  BLOBS.push(m);
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
    // (ANIM-COMBAT: an upper arm turns about its own length (tw*) before it is spread and raised, as LBA2 orders its
    // rotations (X·Z·Y); no pose turned the shoulders about y before, so every existing pose is unchanged)
    j.armL.sh.rotation.order = 'XZY'; j.armR.sh.rotation.order = 'XZY';
    this.guard = false;       // the player is engaged: the idle becomes his combat stance (GUARD[guardKind])
    this.guardKind = 'ball';
    this.combatLook = null;   // the player's locked target: the head and chest turn to it (when nothing else is looked at)
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
      // (a throw or a charge keeps the back foot where it stood: its keys are taken relative to the leg as it was)
      if ((anim === 'throwQuick' || anim === 'charge') && prev !== 'throwQuick' && prev !== 'charge') this._backOff = null;
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
    // (throw → charge → throw keep the layer at full weight: the wind-up, the held coil and the whip are one motion)
    if (this.over?.kind !== kind) this.over = { kind, t, w: kind === 'throw' || this.over ? 1 : 0, fed: true };
    this.over.t = t; this.over.fed = true;
  }
  // the throw's / the charge's arms, chest and head (the same keys as the planted throwQuick / charge below)
  _upper(kind, t) {
    const U = {};
    if (kind === 'throw') for (const k of THROW_UPPER) U[k] = keyH(THROW.t, THROW[k], t);
    else if (kind === 'charge') { for (const k of THROW_UPPER) U[k] = COIL[k]; this._chargeLife(U); }
    return U;
  }
  // a strike's pose on the move's own clock: the keys sit on phase units (0-1 startup, 1-2 active, 2-3 recovery), so
  // whatever the move's timing (combat.js MOVES s/a/r: jab, glove, sword...), the blade or the fist crosses the middle
  // of its arc in the middle of the active frames, where the hit is swept
  _strikePose(a) {
    // (the move's timing; on the frame the controller has already let go of the move, the last one it gave)
    const K = STRIKES[a], G = GUARD[K.guard], A = this.atk?.s ? (this._atkT = this.atk) : this._atkT || K.time, t = this.actionT;
    const u = !A ? 0 : t < A.s ? t / A.s : t < A.s + A.a ? 1 + (t - A.s) / A.a : 2 + Math.min(1, (t - A.s - A.a) / Math.max(0.05, A.r));
    const P = {};
    for (const k of POSE_CH) P[k] = K[k] ? keyH(K.u, K[k], u) : G[k] ?? 0;
    if (a === 'heavyCharge') { const w = this.chargeFull ? Math.sin(this.t * 40) * 0.03 : Math.sin(this.t * 2.6) * 0.02; P.armR += w; P.torsoX += w * 0.5; }
    return P;
  }
  // hit: the blow snaps the chest and head away from where it came from and the arms fly up (0.05 s), the body sags,
  // rebounds forward and comes back to his stance by 0.42 (Hero.hurtT is 0.4); his feet stumble back with the push
  // (foot planting). After LBA2's damage1 (0.5 s: thrown back with the arms up, then upright), shortened to our hurtT.
  _hurtPose() {
    const hd = this.hitDir || 0, fx = Math.cos(hd), sx = Math.sin(hd), t = this.actionT, G = GUARD[this.guardKind] || GUARD.ball;
    const e1 = keyH(HURT.t, HURT.snap, t), e2 = keyH(HURT.t, HURT.sag, t), back = HURT.back(t);
    const P = { ...G };
    P.torsoX = G.torsoX * back + fx * (-0.6 * e1 + 0.32 * e2); P.headX = fx * (-0.38 * e1 + 0.18 * e2);
    P.torsoZ = sx * (0.5 * e1 + 0.1 * e2); P.headZ = sx * 0.32 * e1; P.torsoY = G.torsoY * back + sx * 0.3 * e1; P.headY = G.headY * back - sx * 0.2 * e1;
    P.armR = G.armR * back - 0.75 * e1; P.armL = G.armL * back - 0.75 * e1; P.elR = G.elR * back - 0.45 * e1 - 0.9 * e2; P.elL = G.elL * back - 0.45 * e1 - 0.9 * e2;
    P.outR = 0.45 * e1; P.outL = 0.45 * e1; P.twR = G.twR * back; P.twL = G.twL * back;
    P.kneeL = G.kneeL + 0.12 * e1 + 0.1 * e2; P.kneeR = G.kneeR + 0.12 * e1 + 0.1 * e2;
    P.hipsY = G.hipsY - 0.03 * e1 - 0.02 * e2; P.hipsZ = -0.09 * fx * e1;
    return P;
  }
  // a held charge stays alive without fidgeting: a slow breath in the chest and the cocked arm, and once full a fine
  // tremble of the throwing arm (the ball glows and grows; see MagicBall.setCharge)
  _chargeLife(U) {
    const b = Math.sin(this.t * 2.6), full = this.chargeFull ? Math.sin(this.t * 31) * 0.025 : 0;
    U.torsoY += b * 0.03; U.torsoX += b * 0.015; U.armR += b * 0.03 + full; U.elR += full * 0.6; U.headY -= b * 0.025;
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

  // ---- foot planting (the player's character: footPlant; ANIM-COMBAT). Standing, striking, throwing, hurt: a foot on
  // the ground stays where it was put down while the body turns, lunges, steps forward with a strike's drive or is
  // pushed back. Where the animated pose wants it (fk) drifts more than 12 cm from where it stands, the foot takes a
  // short step there (lifted in an arc, 0.1-0.2 s, one foot at a time); where the pose lifts a foot (a throw's front
  // knee, a kick) it follows the pose and is put down where the pose lands it. The leg is bent to reach the planted
  // point (two bones: the knee from the distance, the hip's swing and spread from the direction; the sole kept flat).
  // Only on frames the hero marks (plantFrame: grounded play) and in the actions of PLANT; elsewhere it lets go over
  // 0.1 s. Walking, running, jumps and every story pose keep their own legs.
  _plant(dt, a) {
    const j = this.j, on = this.plantFrame && PLANT.has(a);
    this.plantFrame = false;
    const F = this._feet ??= { w: 0, L: newFoot(), R: newFoot() };
    F.w = on ? Math.min(1, F.w + dt / 0.06) : Math.max(0, F.w - dt / 0.1);
    if (F.w <= 0) { F.L.on = F.R.on = false; F.L.w = F.R.w = 0; F.L.stepping = F.R.stepping = false; return; }
    this.root.updateMatrixWorld(true);
    const sc = this.root.scale.y;
    this._ankle ??= this.hipsRest + j.legL.hip.position.y + j.legL.knee.position.y + j.legL.foot.position.y;
    const groundY = this.root.position.y + this._ankle * sc, settle = a === 'idle' || a === 'talk' || a === 'listen';
    for (const s of ['L', 'R']) {
      const leg = s === 'L' ? j.legL : j.legR, st = F[s], other = F[s === 'L' ? 'R' : 'L'];
      leg.foot.getWorldPosition(_fp);
      if (on) {
        const up = _fp.y - groundY;
        if (up > (st.on ? 0.05 : 0.02) * sc) { st.on = false; st.stepping = false; }   // the pose lifts it
        else if (!st.on) { st.on = true; st.w = 0; st.P.set(_fp.x, groundY, _fp.z); } // put down where the pose lands it
        else if (st.w < 1 && !st.stepping) st.P.set(_fp.x, groundY, _fp.z);            // (still settling as it lands)
        else if (st.stepping) {
          st.u = Math.min(1, st.u + dt / st.dur);
          const e = st.u * st.u * (3 - 2 * st.u);
          st.P.set(st.from.x + (_fp.x - st.from.x) * e, groundY + Math.sin(Math.PI * st.u) * st.lift, st.from.z + (_fp.z - st.from.z) * e);
          if (st.u >= 1) st.stepping = false;
        } else {
          const d = Math.hypot(_fp.x - st.P.x, _fp.z - st.P.z);
          // (a foot the leg can no longer reach — the body carried on past it — steps up too)
          const far = (st.reach || 0) > 1.01;   // (a straight back leg in a lunge is fine; past its length it drags)
          // (standing about, a foot left more than 5 cm off its stance for 0.4 s shuffles back into it)
          st.off = settle && d > 0.05 * sc ? (st.off || 0) + dt : 0;
          if (d > 1.2 * sc) st.P.set(_fp.x, groundY, _fp.z);                         // (placed somewhere else)
          else if ((d > 0.12 * sc || far || st.off > 0.4) && (!other.stepping || d > 0.3 * sc || st.reach > 1.04)) {
            st.stepping = true; st.u = 0; st.from.copy(st.P);
            st.dur = clamp(0.09 + d * 0.3, 0.1, 0.2); st.lift = Math.min(0.09, 0.03 + d * 0.15) * sc;
          } else st.P.y = groundY;
        }
      }
      st.w = st.on ? Math.min(1, st.w + dt / 0.05) : Math.max(0, st.w - dt / 0.08);
      const w = st.w * F.w;
      if (w <= 0) continue;
      // the planted point in the hip's frame → knee bend from its distance, hip spread (z) and swing (x) from its direction
      const hip = leg.hip, knee = leg.knee, foot = leg.foot, A = knee.position, B = foot.position;
      _m4.copy(hip.parent.matrixWorld).invert();
      _v3.copy(st.P).applyMatrix4(_m4).sub(hip.position);
      const c1 = A.y * B.y + A.z * B.z, c2 = A.z * B.y - A.y * B.z;
      const K = (_v3.lengthSq() - A.lengthSq() - B.lengthSq() - 2 * A.x * B.x) / 2;
      st.reach = _v3.length() / (A.length() + B.length());
      const phi = Math.atan2(c2, c1) + Math.acos(clamp(K / Math.hypot(c1, c2), -1, 0.9995));
      const cp = Math.cos(phi), sp = Math.sin(phi);
      const Lx = A.x + B.x, Ly = A.y + B.y * cp - B.z * sp, Lz = A.z + B.y * sp + B.z * cp;
      const R2 = Math.hypot(Lx, Ly), ph2 = Math.atan2(Ly, Lx), ac = Math.acos(clamp(_v3.x / R2, -1, 1));
      const fz = hip.rotation.z, s1 = ac - ph2, s2 = -ac - ph2;
      const side = Math.abs(wrap(s1 - fz)) < Math.abs(wrap(s2 - fz)) ? wrap(s1) : wrap(s2);
      const cs = Math.cos(side), ss = Math.sin(side), uy = Lx * ss + Ly * cs;
      const swing = wrap(Math.atan2(_v3.z, _v3.y) - Math.atan2(Lz, uy));
      const flat = -(j.body.rotation.x + swing + phi);
      hip.rotation.x += (swing - hip.rotation.x) * w; hip.rotation.z += (side - hip.rotation.z) * w;
      knee.rotation.x += (phi - knee.rotation.x) * w;
      foot.rotation.x += (flat - foot.rotation.x) * w;
    }
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
    // (ANIM-COMBAT: hipsZ carries the pelvis forward/back (× pelvis height / 0.95), hipsYaw turns it; T.outL / T.outR
    // spread one arm away from the body on top of armOut)
    let hipsZ = 0, hipsYaw = null;

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
        // (a look's own cycle length in metres where its original walk gives one: Baldino's short legs step
        // 800 units per 0.8 s cycle, 1.3 m — his pelvis is far below 46% of his height)
        this.phase += (speed * dt / (this.walkCycle ? this.walkCycle * this.root.scale.y : 0.78 * H)) * Math.PI * 2 - dph;
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
        for (const sd of ['L', 'R']) { const l = T['leg' + sd]; T['leg' + sd] = l * fx; T['side' + sd] = -l * sx; T['foot' + sd] *= Math.abs(fx); }
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
      const b = Math.sin(this.t * (Math.PI * 2 / (this.idlePeriod || 2.4)));   // (Baldino's idle, ANIM 715: 1.6 s)
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
      if (a === 'idle' && !this.noFidget && !this.guard) { // (a story scene directs every movement itself; none in a fight)
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
      if (a === 'talk' && this.talkStyle === 'baldino') {
        // Baldino's own talk (ANIM.HQR 718, keys every 0.4 s, a 3.2 s loop): fists on his hips for four keys while
        // the ears flap twice, a beat with the arms down, both arms flung wide, then both forward with a nod
        const K = BALDINO_TALK, u = this.actionT % K.t[K.t.length - 1], at = (v) => keyLin(K.t, v, u);
        T.armL = T.armR = at(K.arm); T.elL = T.elR = at(K.el); armOut = at(K.out);
        torsoX = at(K.torso); headX = at(K.head);
      } else if (a === 'talk') {
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
      // engaged (the player, Rig.guard): the idle eases into his combat stance for the weapon in hand and back out of
      // it a moment after the fight; the slow rock of the idle keeps going underneath
      this._guardW = damp(this._guardW || 0, a === 'idle' && this.guard ? 1 : 0, 5, dt);
      if (this._guardW > 0.002) {
        const G = GUARD[this.guardKind] || GUARD.ball, w = this._guardW, mix = (v, g) => (v ?? 0) + (g - (v ?? 0)) * w;
        for (const k of ['armR', 'elR', 'outR', 'twR', 'armL', 'elL', 'outL', 'twL', 'legL', 'kneeL', 'footL', 'legR', 'kneeR', 'footR']) T[k] = mix(T[k], G[k]);
        torsoX = mix(torsoX, G.torsoX + b * 0.025); torsoY = mix(torsoY, G.torsoY); headX = mix(headX, G.headX); headY = mix(headY, G.headY);
        hipsY = mix(hipsY, G.hipsY + b * 0.006);
      }
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
    } else if (a === 'jet') {
      // riding Baldino's hop-pack (src/game/jetpack.js): legs together and a little bent, toes down, hands on the
      // straps at the chest, a slight lean into the thrust; a small shiver from the jets
      const w = Math.sin(this.t * 31) * 0.015;
      T.legL = -0.28; T.legR = -0.12; T.kneeL = 0.5; T.kneeR = 0.35; T.footL = 0.45; T.footR = 0.4;
      T.armL = -0.55 + w; T.armR = -0.6 - w; T.elL = -1.75; T.elR = -1.7; armOut = 0.15;
      torsoX = 0.12; headX = -0.1; hipsY = 0.95 + w;
    } else if (this.footPlant && (STRIKES[a] || a === 'hurt')) {
      // the player's strikes and hit reaction (ANIM-COMBAT): keyed poses, see STRIKES / HURT below
      const P = a === 'hurt' ? this._hurtPose() : this._strikePose(a);
      for (const k of ['armR', 'elR', 'outR', 'twR', 'armL', 'elL', 'outL', 'twL', 'legL', 'kneeL', 'footL', 'legR', 'kneeR', 'footR']) T[k] = P[k];
      torsoX = P.torsoX; torsoY = P.torsoY; torsoZ = P.torsoZ || 0; headX = P.headX; headY = P.headY; headZ = P.headZ || 0;
      hipsY = P.hipsY; hipsZ = P.hipsZ; hipsYaw = torsoY * 0.25;
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
      // the planted ball throw: THROW's keys on the combat controller's clock (actionT), see THROW below
      // (from his combat stance the first 0.06 s ease out of it instead of dropping the guard's arms to the rest pose first)
      const t = this.actionT, gw = (this._guardW || 0) * (1 - smooth(t / 0.06)), G = GUARD[this.guardKind] || GUARD.ball;
      const at = (k) => keyH(THROW.t, THROW[k], t) + (gw > 0 && G[k] != null ? (G[k] - THROW[k][0]) * gw : 0);
      T.armR = at('armR'); T.elR = at('elR'); T.outR = at('outR'); T.armL = at('armL'); T.elL = at('elL'); T.outL = at('outL');
      torsoX = at('torsoX'); torsoY = at('torsoY'); headX = at('headX'); headY = at('headY');
      this._backOff ??= this._fk ? this._fk.R.hip.rotation.x - at('legR') : 0;
      T.legL = at('legL'); T.kneeL = at('kneeL'); T.footL = at('footL'); T.legR = at('legR') + this._backOff; T.kneeR = at('kneeR'); T.footR = at('footR');
      hipsY = at('hipsY'); hipsZ = at('hipsZ'); hipsYaw = torsoY * 0.3;  // (the pelvis turns a little with the chest)
    } else if (a === 'charge') {
      // holding the ball to aim: the throw's loaded pose, held (the arm cocked behind the head, the chest turned away,
      // the free arm on the target, the eyes on it), the weight back over a planted stance; the release whips from it
      const C = COIL, U = {}; for (const k of THROW_UPPER) U[k] = C[k]; this._chargeLife(U);
      T.armR = U.armR; T.elR = U.elR; T.outR = U.outR; T.armL = U.armL; T.elL = U.elL; T.outL = U.outL;
      torsoX = U.torsoX; torsoY = U.torsoY; headX = U.headX; headY = U.headY;
      this._backOff ??= this._fk ? this._fk.R.hip.rotation.x - C.legR : 0;
      T.legL = -0.32; T.kneeL = 0.35; T.footL = 0.05; T.legR = C.legR + this._backOff; T.kneeR = 0.08; hipsY = 0.92; hipsZ = C.hipsZ; hipsYaw = torsoY * 0.3;
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
    } else if (a === 'ko') {
      // an enemy knocked out (src/game/death.js drives the clock, ko.t, and picks the fall): the hit's recoil,
      // the fall with weight onto the back or the front (or a slump where there is no room), the impact's bounce,
      // then still. Keys: KO_HUMAN below; the side (ko.side) mirrors which arm ends overhead and where the head rolls.
      const K = this.ko || { t: this.actionT, dir: 1, mode: 'fall', side: 1 }, t = K.t;
      let set0 = K.mode === 'slump' ? KO_HUMAN.slump : K.dir > 0 ? KO_HUMAN.back : KO_HUMAN.front;
      if (K.round && K.mode !== 'slump') set0 = { ...set0, ...(K.dir > 0 ? KO_HUMAN.roundBack : KO_HUMAN.roundFront) };
      const m = K.side < 0, at = (v) => koKey(v, t), L = (k) => at(set0[m ? k.replace('L', '#').replace('R', 'L').replace('#', 'R') : k]);
      hipsY = at(set0.hipsY); torsoX = at(set0.torso); headX = at(set0.head);
      headY = at(set0.headY) * (m ? -1 : 1); headZ = at(set0.headZ) * (m ? -1 : 1);
      T.legL = L('legL'); T.legR = L('legR'); T.kneeL = L('kneeL'); T.kneeR = L('kneeR'); T.footL = L('footL'); T.footR = L('footR');
      T.armL = L('armL'); T.armR = L('armR'); T.elL = L('elL'); T.elR = L('elR');
      this._koOut = [L('outL'), L('outR')];
      bodyRotX = K.mode === 'slump' ? 0 : -K.dir * koFall(t) * (Math.PI / 2);
      if (this.robeLegs) { T.kneeL = Math.min(T.kneeL, 1.2); T.kneeR = Math.min(T.kneeR, 1.2); }
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
    const O = this.over, walkTwist = torsoY;
    if (O) {
      if (!O.fed) O.t += dt;
      const full = (O.kind === 'throw' && a === 'throwQuick') || (O.kind === 'charge' && a === 'charge');
      let w;
      if (O.kind === 'throw') { const k = clamp((O.t - 0.3) / 0.32, 0, 1); w = 1 - k * k * (3 - 2 * k); if (O.t > 0.62) this.over = null; }
      else { O.w = damp(O.w, O.fed ? 1 : 0, 14, dt); w = O.w; if (!O.fed && w < 0.02) this.over = null; }
      O.fed = false;
      if (!full && w > 0) {
        const U = this._upper(O.kind, O.t), mix = (v, u) => (v ?? 0) + (u - (v ?? 0)) * w;
        // on the move: a shallower bow and less of the chest's turn (the legs keep walking under it); the throwing arm
        // keeps its whole arc, so the ball still leaves high in front
        const bow = walkLike ? 0.6 : 1, twist = walkLike ? 0.8 : 1;
        // (walking, the pelvis isn't carried forward under the throw: the arm reaches that much further forward at the release)
        const reach = walkLike && O.kind === 'throw' ? 0.65 * keyH(THROW_REACH.t, THROW_REACH.v, O.t) : 0;
        T.armL = mix(T.armL, U.armL); T.elL = mix(T.elL, U.elL); T.armR = mix(T.armR, U.armR + reach); T.elR = mix(T.elR, U.elR);
        T.outL = mix(T.outL, U.outL); T.outR = mix(T.outR, U.outR);
        torsoX = mix(torsoX, U.torsoX * bow); torsoY = mix(torsoY, U.torsoY * twist); headX = mix(headX, U.headX * bow); headY = mix(headY, U.headY * twist);
      }
    }
    // (a throw over a walk turns the pelvis a little with the chest instead of against it)
    const layerTwist = torsoY - walkTwist;
    // momentum leans
    torsoX += this.lean;
    torsoZ += this.roll;
    // turning: the head leads, the chest follows, the pelvis comes last
    if (this.turn) { headY += this.turn * 0.35; torsoY += this.turn * 0.12; }

    // head looks toward a point of interest (in body space)
    const look = this.lookAt || this.combatLook;
    let lookTwist = 0;
    if (look && a !== 'dead' && a !== 'ko') {
      const p = this.root.position, ry = this.root.rotation.y;
      const want = Math.atan2(look.x - p.x, look.z - p.z);
      const rel = clamp(angleDiff(ry, want), -1.1, 1.1);
      headY += rel * 0.75;
      torsoY += rel * 0.25; if (!this.lookAt) lookTwist = rel * 0.25;
      const dy = look.y - (p.y + 1.6 * this.root.scale.y);
      const dh = Math.hypot(look.x - p.x, look.z - p.z) || 1;
      headX += clamp(-Math.atan2(dy, dh), -0.5, 0.4);
    }

    // strikes track their poses tightly (lag ≈ 18 ms) so the blade crosses the target in the active frames
    this.blendT = Math.max(0, (this.blendT || 0) - dt);
    const ko = a === 'ko';
    const R = ko ? 24 : STRIKE.has(a) ? 55 : FAST.has(a) ? 30 : PUMP.has(a) ? 26 : this.blendT > 0 ? 8 : 16;
    // (a throw or a charge on the upper-body layer: the arms and the chest follow its keys as closely as a planted throw,
    // so the hand is where the keys put it when the ball leaves; the legs keep the walk's own rate)
    const Ru = this.over ? Math.max(R, 55) : R;
    // (a knock-out follows its keys closely, but no joint ever turns faster than KO_HUMAN.maxRate: no pop from
    // whatever pose the blow interrupted)
    const lim = ko ? KO_HUMAN.maxRate * dt : Infinity;
    const set = (obj, v, axis = 'x', r = R) => { const o = obj.rotation[axis]; obj.rotation[axis] = o + clamp(damp(o, v ?? 0, ko ? Math.max(r, 24) : r, dt) - o, -lim, lim); };
    // (the player's character keeps the legs' animated pose apart from the bones: foot planting below bends the
    // bones from it each frame, and the animation keeps easing from its own pose, not from the planted one)
    const fk = this.footPlant ? (this._fk ??= fkLegs(j)) : null, LL = fk ? fk.L : j.legL, LR = fk ? fk.R : j.legR;
    set(LL.hip, T.legL); set(LR.hip, T.legR);
    set(LL.knee, T.kneeL); set(LR.knee, T.kneeR);
    set(LL.foot, T.footL); set(LR.foot, T.footR);
    set(LL.hip, T.sideL, 'z'); set(LR.hip, T.sideR, 'z');
    if (fk) for (const [s, B] of [[fk.L, j.legL], [fk.R, j.legR]]) for (const b of ['hip', 'knee', 'foot']) B[b].rotation.set(s[b].rotation.x, s[b].rotation.y, s[b].rotation.z);
    set(j.armL.sh, T.armL, 'x', Ru); set(j.armR.sh, T.armR, 'x', Ru);
    set(j.armL.el, T.elL, 'x', Ru); set(j.armR.el, T.elR, 'x', Ru);
    set(j.armR.sh, T.twR, 'y', Ru); set(j.armL.sh, -(T.twL ?? 0), 'y', Ru);
    j.hips.position.y = damp(j.hips.position.y, this.hipsRest + (hipsY - 0.95) * (this.hipsRest / 0.95), R, dt);
    this.hipsRestZ ??= j.hips.position.z;
    j.hips.position.z = damp(j.hips.position.z, this.hipsRestZ + hipsZ * (this.hipsRest / 0.95), R, dt);
    set(j.torso, torsoX, 'x', Ru); set(j.torso, torsoY, 'y', Ru); set(j.torso, torsoZ, 'z', 8);
    set(j.head, headX, 'x', 10); set(j.head, headY, 'y', 8); set(j.head, headZ, 'z', 8);
    set(j.body, bodyRotX, 'x', ko ? 40 : 8);
    this._armOut = damp(this._armOut || 0, armOut, PUMP.has(a) ? 26 : 8, dt);
    this._outL = damp(this._outL || 0, T.outL || 0, Ru, dt); this._outR = damp(this._outR || 0, T.outR || 0, Ru, dt);
    if (ko) { set(j.armL.sh, this.armSpread + this._koOut[0], 'z'); set(j.armR.sh, -this.armSpread - this._koOut[1], 'z'); this._armOut = j.armL.sh.rotation.z - this.armSpread; }
    else { j.armL.sh.rotation.z = this.armSpread + this._armOut + this._outL; j.armR.sh.rotation.z = -this.armSpread - this._armOut - this._outR; }
    // pelvis counter-rotates against the shoulders while walking (a throw's turn on top of the walk turns it with them)
    // (the chest turning to a locked target leaves the pelvis and the legs on the way he walks)
    if (walkLike) j.hips.rotation.y = damp(j.hips.rotation.y, -(torsoY - layerTwist - lookTwist) * 0.8 + layerTwist * 0.35, R, dt);
    else j.hips.rotation.y = damp(j.hips.rotation.y, hipsYaw ?? 0, hipsYaw != null ? R : 8, dt);
    // idle weight shift tilts the pelvis toward the standing leg
    j.hips.rotation.z = damp(j.hips.rotation.z, (a === 'idle' || a === 'talk' || a === 'listen') ? -(this.hipShift || 0) * 0.05 : 0, 4, dt);
    if (fk) this._plant(dt, a);

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
      // knocked out, lying: the coat's hem under the body is pressed against the legs instead of standing out
      // (a stiff bell of cloth under a lying guard would hold his legs up off the ground)
      if (ko && this.ko?.mode !== 'slump') {
        const f = koFall(this.ko.t), back = this.ko.dir > 0, under = back ? j.skirt.B : j.skirt.F;
        set(under, (back ? -0.45 : 0.45) * f, 'x', 14);
        // CHAR-OPEN: the sides and the panel on top lie down on the legs as well: the sides turned out (+0.2, the coat
        // stood open like a bell's mouth round the legs) and the top followed the forward leg and stood over them like a
        // tent; now the sides come in a little and the top takes the thighs' mean, pressed in by about the coat's flare
        set(j.skirt.L, -0.12 * f, 'z', 10); set(j.skirt.R, 0.12 * f, 'z', 10);
        const top = back ? j.skirt.F : j.skirt.B, legs = (j.legL.hip.rotation.x + j.legR.hip.rotation.x) / 2;
        set(top, (legs + (back ? 0.4 : -0.4)) * f, 'x', 14);
      }
    }

    // blinking
    this.blinkT -= dt;
    const blink = this.blinkT < 0.12;
    if (this.blinkT < 0) this.blinkT = 2 + Math.random() * 4;
    for (const e of j.eyes) e.scale.y = blink ? 0.12 : 1;

    // a Grobo's ears and trunk (Baldino; his clips 715/717/718 swing both): the ears turn on their roots — a slow
    // waft at rest (1.6 s), two flaps in each talk loop, a swing with every step — and the trunk sways from side to
    // side with the walk, lagging down its length
    if (j.ears) {
      let e;
      if (walkLike) e = Math.sin(this.phase * 2) * 0.22;
      else if (a === 'talk' && this.talkStyle === 'baldino') { const u = this.actionT % 3.2; e = u < 1.6 ? -0.45 * Math.abs(Math.sin(u * Math.PI / 0.4)) * (Math.floor(u / 0.4) % 2) : 0; }
      else e = -0.1 - 0.1 * Math.sin(this.t * (Math.PI * 2 / (this.idlePeriod || 2.4)));
      set(j.ears.L, e, 'y', 10); set(j.ears.R, -e, 'y', 10);
    }
    if (j.trunk) {
      const sw = walkLike ? Math.sin(this.phase) * 0.35 : Math.sin(this.t * 0.9) * 0.05;
      j.trunk.forEach((s, i) => {
        set(s, sw * (0.4 + 0.3 * i) - this.roll * 0.4, 'z', 9 - 2 * i);
        set(s, (walkLike ? -Math.min(speed, 4) * 0.03 : 0) - (this.lean || 0) * 0.3 * (i + 1), 'x', 8 - 2 * i);
      });
    }

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
// Baldino's talk (ANIM.HQR 718, File3D 93's PARLE), its eight keys of 0.4 s read on our joints (radians; arm < 0
// raises forward, out spreads both arms sideways, el < 0 bends): keys 0-3 fists on the hips (the upper arm back
// 29° and out 41°, the forearm folded 91°), key 4 down, key 5 both arms wide (out 69°, forward 53°), keys 6-7 forward
// (47°) with the head nodding 12° then -18°; the loop closes back to the hips
const BALDINO_TALK = {
  t: [0, 0.3, 1.6, 1.85, 2.0, 2.15, 2.45, 2.75, 3.05, 3.2],
  arm: [0.45, 0.5, 0.5, 0.05, -0.92, -0.92, -0.82, -0.82, 0.3, 0.45],
  el: [-1.55, -1.58, -1.58, -0.2, -0.15, -0.15, -0.35, -0.35, -1.2, -1.55],
  out: [0.55, 0.6, 0.6, 0.0, 0.9, 0.9, 0.2, 0.2, 0.45, 0.55],
  torso: [0.03, 0.05, 0.03, 0.0, -0.08, -0.06, 0.06, 0.08, 0.04, 0.03],
  head: [0, 0, 0, 0, -0.05, -0.05, 0.21, -0.25, 0, 0],
};
// An enemy knocked out (src/game/death.js): key times in seconds from the blow. 0 → 0.14 the hit's recoil (the
// chest thrown back, the arms flung, a stagger step), 0.14 → 0.62 the fall (the body pivots on its heels and
// accelerates like a falling pole: koFall), 0.62 the impact, a small bounce to 0.84, then still by 1.1. LBA2's own
// knock-down (Twinsen's "beaten", ANIM.HQR) takes ~1.1 s to the ground; this one is shorter so play is not held up.
// back: onto the back (the blow in front); front: onto the front (the blow from behind); slump: no room to lie
// down (a wall or a drop behind), the knees give and it sits down slumped. Arm keys for ko.side = +1 (right arm
// thrown overhead, head rolled right); side -1 swaps left and right. Lying, an arm's rotation brings the hand
// down onto the ground (back: overhead -3.25 / along the side +0.2; front: -3.02 / -0.12), never up in the air.
export const KO_HUMAN = {
  t: [0, 0.14, 0.3, 0.46, 0.62, 0.71, 0.84, 1.1],
  recoil: 0.14, impact: 0.62, settle: 1.1, maxRate: 13,
  back: {
    hipsY: [0.95, 0.91, 0.84, 0.82, 0.9, 0.88, 0.9, 0.9],
    legL: [0, 0.28, 0.05, -0.3, 0.05, 0.0, 0.15, 0.2], legR: [0, -0.1, -0.35, -0.5, -0.2, -0.2, -0.12, -0.08],
    kneeL: [0.05, 0.32, 0.7, 0.6, 0.3, 0.42, 0.25, 0.2], kneeR: [0.05, 0.15, 0.5, 0.55, 0.3, 0.35, 0.25, 0.2], // (KO-BACK: the right leg settles nearly straight, so the body lies on the floor, not on the heel)
    footL: [0, 0.1, 0.2, 0.3, 0.35, 0.3, 0.35, 0.35], footR: [0, 0.05, 0.15, 0.25, 0.3, 0.32, 0.3, 0.3],
    torso: [0, -0.32, 0.12, 0.32, 0.04, -0.06, 0.02, 0], head: [0, 0.28, 0.34, 0.4, -0.12, 0.1, 0.06, 0.08],
    headY: [0, 0, 0.05, 0.1, 0.15, 0.3, 0.45, 0.5], headZ: [0, 0, 0, 0, 0.05, 0.1, 0.14, 0.15],
    armL: [0, -0.6, -1.1, -1.2, -0.6, -0.05, 0.15, 0.2], armR: [0, -0.7, -1.3, -1.8, -2.6, -3.0, -3.2, -3.25],
    elL: [-0.1, -0.9, -0.7, -0.6, -0.45, -0.3, -0.25, -0.25], elR: [-0.1, -0.7, -0.6, -0.4, -0.3, -0.22, -0.2, -0.2],
    outL: [0.1, 0.45, 0.6, 0.7, 0.75, 0.68, 0.62, 0.6], outR: [0.1, 0.5, 0.7, 0.8, 0.55, 0.4, 0.32, 0.3],
  },
  front: {
    hipsY: [0.95, 0.91, 0.86, 0.84, 0.9, 0.89, 0.9, 0.9],
    legL: [0, -0.25, -0.15, 0.05, -0.05, -0.1, -0.12, -0.15], legR: [0, 0.15, 0.2, 0.18, 0.0, -0.02, -0.04, -0.05],
    kneeL: [0.05, 0.3, 0.4, 0.3, 0.2, 0.35, 0.3, 0.3], kneeR: [0.05, 0.2, 0.35, 0.3, 0.45, 0.6, 0.55, 0.5],
    footL: [0, 0.05, 0.1, 0.15, 0.2, 0.2, 0.2, 0.2], footR: [0, 0.05, 0.1, 0.15, 0.2, 0.2, 0.2, 0.2],
    torso: [0, -0.2, -0.15, -0.25, -0.1, 0.05, -0.05, -0.05], head: [0, -0.3, -0.25, -0.35, -0.3, -0.15, -0.25, -0.3],
    headY: [0, 0, 0, 0.2, 0.5, 0.7, 0.85, 0.9], headZ: [0, 0, 0, 0, 0, 0, 0, 0],
    armL: [0, -0.4, -0.9, -1.1, -0.5, -0.2, -0.12, -0.12], armR: [0, -0.5, -1.2, -1.7, -2.5, -2.85, -3.0, -3.02],
    elL: [-0.1, -0.7, -1.0, -1.1, -0.6, -0.4, -0.35, -0.35], elR: [-0.1, -0.6, -0.9, -1.0, -0.5, -0.3, -0.25, -0.25],
    outL: [0.1, 0.4, 0.6, 0.7, 0.8, 0.7, 0.65, 0.65], outR: [0.1, 0.4, 0.6, 0.7, 0.5, 0.4, 0.35, 0.35],
  },
  // a round body (a Grobo, a fat trooper): the shoulders lie high, so the arms drop out to the sides onto the ground
  // instead of overhead (overhead they would stick up in the air)
  roundBack: {
    armL: [0, -0.6, -1.1, -1.2, -0.6, 0.15, 0.4, 0.45], armR: [0, -0.7, -1.3, -1.6, -0.9, 0.2, 0.45, 0.5],
    outL: [0.1, 0.45, 0.6, 0.7, 0.85, 0.95, 1.0, 1.0], outR: [0.1, 0.5, 0.7, 0.8, 0.9, 1.0, 1.05, 1.05],
  },
  roundFront: {
    armL: [0, -0.4, -0.9, -1.1, -0.7, -0.45, -0.4, -0.4], armR: [0, -0.5, -1.2, -1.4, -0.8, -0.5, -0.45, -0.45],
    outL: [0.1, 0.4, 0.6, 0.7, 0.85, 0.95, 1.0, 1.0], outR: [0.1, 0.4, 0.6, 0.7, 0.85, 0.95, 1.0, 1.0],
  },
  slump: {
    hipsY: [0.95, 0.9, 0.62, 0.3, 0.17, 0.2, 0.18, 0.18],
    legL: [0, -0.2, -0.75, -1.25, -1.45, -1.4, -1.38, -1.38], legR: [0, -0.1, -0.6, -1.15, -1.35, -1.3, -1.28, -1.25],
    kneeL: [0.05, 0.4, 1.3, 1.5, 1.05, 1.0, 0.95, 0.95], kneeR: [0.05, 0.3, 1.1, 1.4, 0.8, 0.75, 0.7, 0.7],
    footL: [0, 0, 0, 0, 0, 0, 0, 0], footR: [0, 0, 0, 0, 0, 0, 0, 0],
    torso: [0, -0.3, 0.1, 0.3, 0.55, 0.7, 0.78, 0.8], head: [0, 0.2, 0.3, 0.3, 0.45, 0.55, 0.6, 0.6],
    headY: [0, 0, 0, 0.1, 0.2, 0.3, 0.35, 0.35], headZ: [0, 0, 0, 0, 0.05, 0.1, 0.12, 0.12],
    armL: [0, -0.5, -0.4, -0.3, -0.25, -0.2, -0.2, -0.2], armR: [0, -0.5, -0.4, -0.3, -0.25, -0.2, -0.2, -0.2],
    elL: [-0.1, -0.6, -0.5, -0.4, -0.3, -0.3, -0.3, -0.3], elR: [-0.1, -0.6, -0.5, -0.4, -0.3, -0.3, -0.3, -0.3],
    outL: [0.1, 0.4, 0.35, 0.3, 0.25, 0.25, 0.25, 0.25], outR: [0.1, 0.4, 0.35, 0.3, 0.25, 0.25, 0.25, 0.25],
  },
};
// the fall's progress (0 standing, 1 flat): a little give in the recoil, then a pole's fall (accelerating, θ ∝ u²)
// onto the ground at the impact, a small bounce, still
export function koFall(t) {
  const K = KO_HUMAN, r = K.recoil, i = K.impact;
  if (t < r) { const u = t / r; return 0.06 * u * u * (3 - 2 * u); }
  if (t < i) { const u = (t - r) / (i - r); return 0.06 + 0.94 * u * u; }
  if (t < i + 0.22) return 1 - 0.07 * Math.sin(Math.PI * (t - i) / 0.22);
  return 1;
}
// smooth through the knock-out's keys (Catmull-Rom on the key index, held at the ends)
function koKey(v, t) {
  const ts = KO_HUMAN.t, n = ts.length;
  if (t <= ts[0]) return v[0];
  if (t >= ts[n - 1]) return v[n - 1];
  let i = 0; while (t >= ts[i + 1]) i++;
  const u = (t - ts[i]) / (ts[i + 1] - ts[i]), p0 = v[Math.max(0, i - 1)], p1 = v[i], p2 = v[i + 1], p3 = v[Math.min(n - 1, i + 2)];
  return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
}
// smooth through unevenly timed keys (Catmull-Rom tangents, Hermite segments; flat at the first and last key): the
// pose flows through each key instead of stopping on it, and nothing jumps between keys
function keyH(ts, vs, t) {
  const n = ts.length;
  if (t <= ts[0]) return vs[0];
  if (t >= ts[n - 1]) return vs[n - 1];
  let i = 0; while (t >= ts[i + 1]) i++;
  const h = ts[i + 1] - ts[i], u = (t - ts[i]) / h, u2 = u * u, u3 = u2 * u;
  const m = (k) => (k <= 0 || k >= n - 1 ? 0 : (vs[k + 1] - vs[k - 1]) / (ts[k + 1] - ts[k - 1]) * h);
  return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * m(i) + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * m(i + 1);
}
// The ball throw (ANIM-COMBAT), on the combat controller's clock (COMBAT.throw: the ball leaves the hand at 0.16, the
// controls are free at 0.36, the follow-through ends at 0.62 on the upper-body layer). After LBA2's LANCE (anim 6,
// measured: the arm cocked high behind the head with the chest turned away and the front knee up, the whip over the
// top, the release with a lunge onto the front leg, a long bow over it), compressed to our quick timing:
//  0 → 0.08 the arm rises out to the side (never across the face) and cocks behind the head, the chest turns the
//  throwing shoulder back, the free arm points at the target, the front knee lifts; 0.08 → 0.115 loaded (this is
//  also the pose held while a press may still become a charge, COMBAT.throw.windHold 0.12); 0.115 → 0.16 the whip:
//  the chest unwinds, the elbow opens and the hand comes over the top to the release point, high in front of the
//  head, as the front foot comes down; 0.16 → 0.30 the arm follows through down across the body into the bow, the
//  pelvis carried forward over the front foot, the head kept up on the target; then back to rest.
// Right arm throws (armR < 0 raises it forward, out* spreads an arm away from the body, el < 0 bends); torsoY < 0
// turns the right shoulder back; the head counter-turns so the eyes stay on the target. hipsZ moves the pelvis forward
// (× pelvis height / 0.95, as hipsY). The legs are what the planted (standing) throw does; on the move only the upper
// body plays, over the walk. (The back leg's keys only say where its foot stands: under the pelvis as it shifts, so it
// stays put; foot planting bends its knee as the body drops. The feet start and end in the ball's stance, GUARD.ball.)
const THROW = {
  t: [0, 0.04, 0.08, 0.115, 0.16, 0.21, 0.30, 0.42, 0.62],
  armR: [0.06, -1.3, -2.75, -2.95, -2.1, -1.2, -0.6, -0.35, 0.06],
  elR: [-0.18, -1.0, -1.9, -2.05, -0.45, -0.2, -0.35, -0.35, -0.18],
  outR: [0, 0.6, 0.3, 0.25, 0.05, -0.25, -0.3, -0.12, 0],
  armL: [0.06, -0.6, -1.25, -1.35, 0.2, 0.4, 0.35, 0.2, 0.06],
  elL: [-0.18, -0.3, -0.35, -0.35, -1.1, -1.2, -1.0, -0.6, -0.18],
  outL: [0, 0.1, 0.15, 0.15, 0.25, 0.2, 0.1, 0.05, 0],
  torsoX: [0, -0.04, -0.1, -0.14, 0.2, 0.5, 0.72, 0.42, 0],
  torsoY: [0, -0.25, -0.55, -0.65, 0.2, 0.5, 0.45, 0.25, 0],
  headX: [0, 0.02, 0.05, 0.05, -0.1, -0.4, -0.6, -0.35, 0],
  headY: [0, 0.22, 0.5, 0.58, -0.15, -0.42, -0.38, -0.22, 0],
  legL: [-0.16, -0.25, -0.5, -0.6, -0.45, -0.65, -0.75, -0.5, -0.16],
  kneeL: [0.03, 0.35, 0.8, 0.95, 0.3, 0.65, 0.85, 0.5, 0.03],
  footL: [0, 0.15, 0.35, 0.35, 0.2, 0.2, 0.15, 0.1, 0],
  legR: [0.12, 0.12, 0.08, 0.07, 0.24, 0.31, 0.32, 0.24, 0.12],
  kneeR: [0.03, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.06, 0.03],
  footR: [0, 0, 0, 0, -0.1, -0.15, -0.15, -0.1, 0],
  hipsY: [0.95, 0.94, 0.93, 0.925, 0.92, 0.88, 0.86, 0.9, 0.95],
  hipsZ: [0, -0.01, -0.03, -0.04, 0.1, 0.16, 0.17, 0.1, 0],
};
const THROW_REACH = { t: [0.08, 0.13, 0.16, 0.24], v: [0, 0.8, 1, 0] };
const THROW_UPPER = ['armR', 'elR', 'outR', 'armL', 'elL', 'outL', 'torsoX', 'torsoY', 'headX', 'headY'];
// the throw's loaded pose (its 0.115 key): what a held charge keeps
const COIL = Object.fromEntries(Object.keys(THROW).filter((k) => k !== 't').map((k) => [k, THROW[k][3]]));
// The player's combat stance per weapon (ANIM-COMBAT; idle while engaged, Rig.guard, and where every strike starts and
// ends): the left foot a little forward, knees soft, the chest turned so the left shoulder leads, the eyes on the front.
// Fists: both fists up in front of the chest (LBA2's Aggressive idle, anim 82, a boxer's guard); sword: the blade held
// forward and up, the free hand out for balance; the ball: the throwing hand ready at the chest. tw* turns an upper arm
// about its length (the right arm's + and the left arm's + both fold the forearm across the body).
const POSE_CH = ['armR', 'elR', 'outR', 'twR', 'armL', 'elL', 'outL', 'twL', 'torsoX', 'torsoY', 'headX', 'headY', 'legL', 'kneeL', 'footL', 'legR', 'kneeR', 'footR', 'hipsY', 'hipsZ'];
const GUARD = {
  fists: { armR: -0.55, elR: -1.75, outR: -0.08, twR: 0.3, armL: -0.65, elL: -1.85, outL: -0.08, twL: 0.3, torsoX: 0.1, torsoY: -0.15, headX: 0.02, headY: 0.13, legL: -0.2, kneeL: 0.12, footL: 0, legR: 0.16, kneeR: 0.08, footR: 0, hipsY: 0.925, hipsZ: 0 },
  sword: { armR: -0.75, elR: -0.85, outR: 0, twR: 0.2, armL: -0.35, elL: -1.2, outL: 0.3, twL: 0, torsoX: 0.08, torsoY: -0.15, headX: 0, headY: 0.13, legL: -0.2, kneeL: 0.12, footL: 0, legR: 0.16, kneeR: 0.08, footR: 0, hipsY: 0.925, hipsZ: 0 },
  ball: { armR: -0.3, elR: -0.95, outR: 0, twR: 0.2, armL: -0.15, elL: -0.55, outL: 0.05, twL: 0, torsoX: 0.06, torsoY: -0.08, headX: 0, headY: 0.07, legL: -0.16, kneeL: 0.08, footL: 0, legR: 0.12, kneeR: 0.06, footR: 0, hipsY: 0.935, hipsZ: 0 },
};
GUARD.glove = GUARD.fists;
// The player's strikes, keyed on phase units u (0-1 startup, 1-2 active, 2-3 recovery: Rig._strikePose), from and back
// to the weapon's GUARD (a channel left out holds the guard's value). Every strike anticipates, then the chest, the
// shoulder and the elbow drive the hand or blade through the target at u 1.5 (the middle of the active frames, where
// combat.js sweeps the hit), follows through past it, and settles back. The back foot keeps its place while the strike's
// forward step carries the body (foot planting steps the front foot into the strike). Arm yaw: with the arm raised
// forward, out* swings it across (−) or out (+); the blade lies along the forearm. Times (time) only where no move
// gives them.
const STRIKES = {
  // sword 1: backhand, the blade from his left across to his right (MOVES.slash1 arc 1.25 → -1.15): it cocks over the
  // left shoulder with the chest turned left, then the chest unwinds and the elbow opens through the sweep
  slash1: { guard: 'sword', u: [0, 0.7, 1, 1.5, 2, 2.4, 3],
    armR: [-0.75, -1.45, -1.5, -1.5, -1.45, -1.25, -0.8], elR: [-0.85, -1.7, -1.55, -0.45, -0.15, -0.2, -0.8],
    outR: [0, -0.9, -0.85, -0.1, 0.6, 0.95, 0.1], twR: [0.2, 1.3, 1.3, 0.9, 0.5, 0.3, 0.2],
    armL: [-0.35, -0.5, -0.5, -0.45, -0.4, -0.4, -0.35], elL: [-1.2, -1.2, -1.2, -1.0, -0.9, -1.0, -1.2], outL: [0.3, 0.15, 0.2, 0.45, 0.6, 0.55, 0.3],
    torsoX: [0.08, 0.04, 0.05, 0.14, 0.12, 0.1, 0.08], torsoY: [-0.15, 0.65, 0.6, 0.05, -0.5, -0.75, -0.2], headY: [0.13, -0.5, -0.45, -0.04, 0.38, 0.55, 0.15],
    legL: [-0.2, -0.4, -0.42, -0.45, -0.45, -0.42, -0.3], kneeL: [0.12, 0.35, 0.3, 0.25, 0.28, 0.25, 0.15],
    legR: [0.16, 0.25, 0.28, 0.3, 0.32, 0.3, 0.22], hipsY: [0.925, 0.91, 0.9, 0.87, 0.87, 0.88, 0.91], hipsZ: [0, 0.04, 0.06, 0.12, 0.13, 0.11, 0.05] },
  // sword 2: forehand back the other way (arc -1.2 → 1.2): cocked out to the right behind the shoulder
  slash2: { guard: 'sword', u: [0, 0.7, 1, 1.5, 2, 2.4, 3],
    armR: [-0.8, -1.35, -1.4, -1.5, -1.45, -1.3, -0.8], elR: [-0.8, -1.4, -1.3, -0.35, -0.15, -0.3, -0.8],
    outR: [0.1, 0.95, 0.9, -0.05, -0.85, -1.0, 0], twR: [0.2, -0.9, -0.8, -0.2, 0.1, 0.3, 0.2],
    armL: [-0.4, -0.45, -0.45, -0.4, -0.45, -0.45, -0.35], elL: [-1.0, -1.1, -1.1, -1.1, -1.2, -1.2, -1.2], outL: [0.45, 0.55, 0.5, 0.3, 0.15, 0.15, 0.3],
    torsoX: [0.08, 0.06, 0.06, 0.14, 0.12, 0.1, 0.08], torsoY: [-0.2, -0.7, -0.65, 0, 0.55, 0.75, -0.1], headY: [0.15, 0.55, 0.5, 0, -0.42, -0.55, 0.1],
    legL: [-0.3, -0.42, -0.42, -0.45, -0.45, -0.42, -0.3], kneeL: [0.15, 0.3, 0.28, 0.25, 0.28, 0.25, 0.15],
    legR: [0.22, 0.28, 0.3, 0.32, 0.32, 0.3, 0.22], hipsY: [0.91, 0.9, 0.89, 0.87, 0.87, 0.88, 0.91], hipsZ: [0.05, 0.06, 0.07, 0.12, 0.13, 0.11, 0.05] },
  // sword 3: overhead (arc ±0.3): both hands take the blade up behind the head, the front foot steps in, the chest bows
  // the blade down through the target and holds the weight of the blow a moment before it rises back
  slash3: { guard: 'sword', u: [0, 0.75, 1, 1.5, 2, 2.35, 3],
    armR: [-0.8, -2.85, -3.0, -1.75, -0.95, -0.7, -0.75], elR: [-0.8, -1.5, -1.6, -0.35, -0.15, -0.25, -0.85],
    outR: [0, 0.1, 0.1, 0, -0.1, -0.1, 0], twR: [0.2, 0, 0, 0.1, 0.2, 0.2, 0.2],
    armL: [-0.4, -2.4, -2.5, -1.5, -0.9, -0.7, -0.35], elL: [-1.2, -1.4, -1.45, -0.5, -0.3, -0.5, -1.2], outL: [0.3, -0.3, -0.3, -0.25, -0.15, 0, 0.3], twL: [0, 0, 0, 0, 0, 0, 0],
    torsoX: [0.08, -0.2, -0.22, 0.35, 0.55, 0.5, 0.1], torsoY: [-0.1, -0.25, -0.25, -0.05, 0.05, 0.05, -0.15],
    headX: [0, 0.12, 0.14, -0.25, -0.4, -0.35, 0], headY: [0.1, 0.22, 0.22, 0.04, -0.04, -0.04, 0.13],
    legL: [-0.3, -0.45, -0.5, -0.55, -0.55, -0.52, -0.3], kneeL: [0.15, 0.55, 0.45, 0.4, 0.5, 0.5, 0.15],
    legR: [0.22, 0.12, 0.12, 0.3, 0.35, 0.35, 0.22], hipsY: [0.91, 0.94, 0.94, 0.86, 0.82, 0.83, 0.91], hipsZ: [0.05, -0.03, -0.03, 0.13, 0.17, 0.16, 0.05] },
  // the heavy blow, released from heavyCharge's raised blade: a last hitch back, then down with the whole body
  heavy: { guard: 'sword', u: [0, 1, 1.5, 2, 2.5, 3],
    armR: [-2.95, -3.1, -1.6, -0.7, -0.6, -0.75], elR: [-1.55, -1.6, -0.3, -0.1, -0.2, -0.85], outR: [0.1, 0.1, 0, -0.1, -0.1, 0], twR: [0, 0, 0.1, 0.2, 0.2, 0.2],
    armL: [-2.4, -2.5, -1.4, -0.75, -0.6, -0.35], elL: [-1.4, -1.45, -0.45, -0.3, -0.45, -1.2], outL: [-0.25, -0.3, -0.25, -0.1, 0, 0.3], twL: [0, 0, 0, 0, 0, 0],
    torsoX: [-0.2, -0.25, 0.45, 0.7, 0.62, 0.1], torsoY: [-0.25, -0.28, -0.05, 0.05, 0.05, -0.15],
    headX: [0.12, 0.15, -0.3, -0.5, -0.45, 0], headY: [0.22, 0.24, 0.04, -0.04, -0.04, 0.13],
    legL: [-0.35, -0.4, -0.55, -0.6, -0.58, -0.3], kneeL: [0.1, 0.15, 0.45, 0.6, 0.55, 0.15],
    legR: [0.25, 0.22, 0.32, 0.38, 0.36, 0.22], hipsY: [0.9, 0.91, 0.84, 0.8, 0.81, 0.91], hipsZ: [-0.06, -0.07, 0.12, 0.18, 0.17, 0.05] },
  // holding a heavy strike: the blade up behind the head in both hands, the weight back on a planted stance
  heavyCharge: { guard: 'sword', u: [0], armR: [-2.95], elR: [-1.55], outR: [0.1], twR: [0], armL: [-2.4], elL: [-1.4], outL: [-0.25], twL: [0],
    torsoX: [-0.2], torsoY: [-0.25], headX: [0.12], headY: [0.22], legL: [-0.35], kneeL: [0.1], legR: [0.25], hipsY: [0.9], hipsZ: [-0.06] },
  // fists 1: the right jab (the shoulder drives forward into it: the chest turns the right shoulder toward the target)
  punch: { guard: 'fists', u: [0, 0.8, 1, 1.35, 2, 3], time: { s: 0.07, a: 0.08, r: 0.17 },
    armR: [-0.55, -0.4, -0.45, -1.55, -1.5, -0.55], elR: [-1.75, -1.95, -1.9, -0.1, -0.15, -1.75], outR: [-0.08, -0.05, -0.05, -0.2, -0.2, -0.08], twR: [0.3, 0.4, 0.4, 0.1, 0.1, 0.3],
    armL: [-0.65, -0.7, -0.7, -0.7, -0.7, -0.65], elL: [-1.85, -1.9, -1.9, -1.95, -1.95, -1.85],
    torsoX: [0.1, 0.1, 0.1, 0.16, 0.15, 0.1], torsoY: [-0.15, -0.3, -0.3, 0.4, 0.35, -0.15], headY: [0.13, 0.25, 0.25, -0.33, -0.3, 0.13],
    legL: [-0.2, -0.35, -0.38, -0.4, -0.4, -0.25], kneeL: [0.12, 0.3, 0.25, 0.2, 0.2, 0.12], legR: [0.16, 0.2, 0.22, 0.28, 0.28, 0.2],
    hipsY: [0.925, 0.92, 0.915, 0.9, 0.9, 0.92], hipsZ: [0, 0.02, 0.03, 0.09, 0.09, 0.02] },
  // fists 2: the left (the leading) hand, the chest turning the other way
  punch2: { guard: 'fists', u: [0, 0.8, 1, 1.35, 2, 3], time: { s: 0.07, a: 0.08, r: 0.18 },
    armL: [-0.65, -0.5, -0.55, -1.55, -1.5, -0.65], elL: [-1.85, -1.95, -1.9, -0.1, -0.15, -1.85], outL: [-0.08, -0.05, -0.05, -0.2, -0.2, -0.08], twL: [0.3, 0.4, 0.4, 0.1, 0.1, 0.3],
    armR: [-0.55, -0.6, -0.6, -0.6, -0.6, -0.55], elR: [-1.75, -1.9, -1.9, -1.95, -1.95, -1.75],
    torsoX: [0.1, 0.1, 0.1, 0.16, 0.15, 0.1], torsoY: [-0.15, 0.05, 0.05, -0.55, -0.5, -0.15], headY: [0.13, -0.05, -0.05, 0.45, 0.42, 0.13],
    legL: [-0.25, -0.35, -0.38, -0.4, -0.4, -0.25], kneeL: [0.12, 0.3, 0.25, 0.2, 0.2, 0.12], legR: [0.2, 0.2, 0.22, 0.28, 0.28, 0.2],
    hipsY: [0.92, 0.92, 0.915, 0.9, 0.9, 0.92], hipsZ: [0.02, 0.02, 0.03, 0.09, 0.09, 0.02] },
  // fists 3: a front kick with the right leg: the knee comes up (chamber), the foot snaps out, the knee comes back and
  // the foot is put down; the body leans back over the standing leg and the arms balance. Kept low: the robe goes with
  // the leg (a higher kick would stretch it through).
  kick: { guard: 'fists', u: [0, 0.85, 1, 1.5, 2, 2.45, 3], time: { s: 0.13, a: 0.1, r: 0.3 },
    legR: [0.16, -0.7, -0.75, -1.1, -1.05, -0.55, 0.15], kneeR: [0.08, 1.15, 1.1, 0.12, 0.15, 0.85, 0.08], footR: [0, 0.35, 0.35, -0.15, -0.1, 0.3, 0],
    legL: [-0.2, -0.2, -0.2, -0.18, -0.18, -0.2, -0.2], kneeL: [0.12, 0.2, 0.2, 0.15, 0.15, 0.2, 0.12],
    torsoX: [0.1, -0.05, -0.1, -0.32, -0.3, -0.12, 0.1], torsoY: [-0.15, -0.1, -0.1, 0.1, 0.1, 0, -0.15],
    armR: [-0.55, -0.4, -0.35, 0.3, 0.25, -0.2, -0.55], elR: [-1.75, -1.7, -1.7, -1.2, -1.2, -1.5, -1.75],
    armL: [-0.65, -0.8, -0.85, -1.0, -0.95, -0.8, -0.65], elL: [-1.85, -1.6, -1.6, -1.2, -1.2, -1.5, -1.85], outL: [-0.08, 0.1, 0.15, 0.45, 0.4, 0.15, -0.08],
    headX: [0.02, 0.05, 0.08, 0.25, 0.25, 0.1, 0.02], headY: [0.13, 0.1, 0.1, -0.08, -0.08, 0, 0.13],
    hipsY: [0.925, 0.93, 0.93, 0.92, 0.92, 0.92, 0.925], hipsZ: [0, -0.02, -0.03, -0.04, -0.04, -0.02, 0] },
};
// the hit reaction's envelopes (seconds from the blow): the snap away from the blow, then the sag and rebound forward
const HURT = { t: [0, 0.05, 0.12, 0.22, 0.32, 0.42], snap: [0, 1, 0.8, 0.2, -0.05, 0], sag: [0, 0, 0.2, 0.6, 0.25, 0] };
HURT.back = (t) => 1 - 0.5 * keyH(HURT.t, HURT.snap, t);
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
