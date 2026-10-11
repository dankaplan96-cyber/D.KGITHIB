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
  }

  play(anim) {
    if (this.anim !== anim) {
      this.anim = anim;
      this.actionT = 0;
      if (anim === 'talk') { let gsel; do gsel = Math.floor(Math.random() * 5); while (gsel === this.gesture); this.gesture = gsel; }
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

    const walkLike = a === 'walk' || a === 'run' || a === 'sneak';
    if (walkLike) {
      // one full cycle = two steps; stride grows with speed
      // amplitude grows a little with speed; one cycle = two steps whose length matches
      // the swing of the planted leg (2·L·sin amp), so a planted foot doesn't slide
      const amp = a === 'run' ? 0.62 + Math.min(speed, 8) * 0.03 : a === 'sneak' ? 0.42 : 0.42 + Math.min(speed, 4) * 0.035;
      const legL = this.hipsRest * this.root.scale.y * 0.95;
      const stride = 4 * legL * Math.sin(amp) * (a === 'run' ? 1.25 : 1); // runs have a flight phase
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
      hipsY = 0.95 - 0.03 + Math.abs(c) * (a === 'run' ? 0.07 : 0.035);
      torsoY = s * (a === 'run' ? 0.12 : 0.07);
      headY = -torsoY * 0.8;
      torsoX = a === 'run' ? 0.12 + Math.min(speed, 8) * 0.018 : 0.03 + speed * 0.01;
      if (a === 'sneak') {
        hipsY = 0.74; torsoX = 0.45; headX = -0.38;
        T.armL = 0.6 + s * 0.15; T.armR = 0.6 - s * 0.15; T.elL = -1.3; T.elR = -1.3;
        T.kneeL += 0.65; T.kneeR += 0.65; T.legL -= 0.35; T.legR -= 0.35;
      }
    } else if (a === 'idle' || a === 'talk' || a === 'listen') {
      const b = Math.sin(this.t * 1.7);
      hipsY = 0.95 + b * 0.006;
      torsoX = -0.02 + b * 0.012;
      // slow weight shift from one leg to the other (every ~7 s)
      const ws = Math.sin(this.t * 0.9) * Math.max(0, Math.sin(this.t * 0.31)) ;
      torsoZ = ws * 0.03; this.hipShift = ws;
      T.armL = 0.04 + b * 0.025; T.armR = 0.04 - b * 0.025;
      T.elL = -0.18; T.elR = -0.18;
      T.legL = 0.02; T.legR = -0.02; T.kneeL = 0.03; T.kneeR = 0.03;
      // idle fidgets: look around, weight shift, scratch head
      if (a === 'idle') {
        this.fidgetT -= dt;
        if (this.fidgetT <= 0) { this.fidget = 1 + Math.floor(Math.random() * 3); this.fidgetT = 5 + Math.random() * 7; this.fidgetStart = this.t; }
        const ft = this.t - (this.fidgetStart ?? -99);
        if (this.fidget && ft < 2.2) {
          const k = Math.sin((ft / 2.2) * Math.PI);
          if (this.fidget === 1) headY = Math.sin(ft * 2.5) * 0.6 * k;
          if (this.fidget === 2) { torsoZ = 0.06 * k; T.legL = 0.12 * k; T.kneeL = 0.2 * k; }
          if (this.fidget === 3) { T.armR = -2.4 * k; T.elR = -1.9 * k; headZ = 0.15 * k; }
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
    } else if (a === 'punch' || a === 'punch2') {
      const r = a === 'punch';
      const k = Math.min(1, this.actionT / 0.08);
      torsoY = (r ? -0.55 : 0.55) * k;
      T.armR = r ? -1.55 * k : 0.3; T.elR = r ? -0.1 : -1.8;
      T.armL = r ? 0.3 : -1.55 * k; T.elL = r ? -1.8 : -0.1;
      T.legL = -0.35; T.legR = 0.35; T.kneeL = 0.35; T.kneeR = 0.25;
      hipsY = 0.88;
    } else if (a === 'kick') {
      const k = Math.min(1, this.actionT / 0.12);
      T.legR = -1.6 * k; T.kneeR = 0.15; T.legL = 0.2; T.kneeL = 0.35;
      T.armL = -0.8; T.armR = 0.6; T.elL = -1.2; T.elR = -1.0;
      torsoX = -0.3 * k;
    } else if (a === 'throw') {
      // windup (arm cocked behind the head, body twisted back) → release (whip
      // forward, step into it) → recovery (follow-through, settle)
      const t = this.actionT;
      if (t < 0.18) {
        const k = Math.min(1, t / 0.1);
        T.armR = -3.0 * k; T.elR = -1.7 * k; T.armL = -0.9 * k; T.elL = -0.5;
        torsoY = 0.55 * k; torsoX = -0.12 * k; headY = -0.3 * k;
        T.legL = -0.15; T.legR = 0.2; T.kneeL = 0.15; T.kneeR = 0.25; hipsY = 0.93;
      } else if (t < 0.32) {
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
      torsoX = -0.5 * fx; torsoZ = 0.45 * sx2; headX = 0.35 * fx; headZ = 0.3 * sx2;
      T.armL = 0.8 * fx - 0.4; T.armR = 0.8 * fx - 0.4; T.elL = -0.9; T.elR = -0.9; hipsY = 0.9;
      T.legL = -0.25 * fx; T.legR = 0.2 * fx; T.kneeL = 0.25; T.kneeR = 0.25;
    } else if (a === 'dead') {
      bodyRotX = -Math.PI / 2; hipsY = 0.3;
      T.armL = -2.8; T.armR = -2.6;
    } else if (a === 'cheer') {
      const b = Math.abs(Math.sin(this.t * 6));
      hipsY = 0.95 + b * 0.15;
      T.armL = -2.9; T.armR = -2.9; T.elL = -0.2; T.elR = -0.2;
    } else if (a === 'search') {
      // rummaging in a cupboard or a chest
      const w = Math.sin(this.t * 9);
      torsoX = 0.35; T.armL = -1.2 + w * 0.2; T.armR = -1.2 - w * 0.2; T.elL = -0.6; T.elR = -0.6; headX = 0.2;
    }

    // landing squash
    if (this.landT > 0) {
      this.landT -= dt;
      const k = Math.max(0, this.landT / 0.22);
      hipsY -= 0.16 * k; T.kneeL = (T.kneeL || 0) + 0.7 * k; T.kneeR = (T.kneeR || 0) + 0.7 * k; T.legL = (T.legL || 0) - 0.35 * k; T.legR = (T.legR || 0) - 0.35 * k; torsoX += 0.2 * k;
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

    const R = a === 'throw' || a === 'punch' || a === 'punch2' || a === 'kick' ? 30 : 16;
    const set = (obj, v, axis = 'x', r = R) => { obj.rotation[axis] = damp(obj.rotation[axis], v ?? 0, r, dt); };
    set(j.legL.hip, T.legL); set(j.legR.hip, T.legR);
    set(j.legL.knee, T.kneeL); set(j.legR.knee, T.kneeR);
    set(j.legL.foot, T.footL); set(j.legR.foot, T.footR);
    set(j.armL.sh, T.armL); set(j.armR.sh, T.armR);
    set(j.armL.el, T.elL); set(j.armR.el, T.elR);
    j.hips.position.y = damp(j.hips.position.y, this.hipsRest + (hipsY - 0.95) * (this.hipsRest / 0.95), R, dt);
    set(j.torso, torsoX); set(j.torso, torsoY, 'y'); set(j.torso, torsoZ, 'z', 8);
    set(j.head, headX, 'x', 10); set(j.head, headY, 'y', 8); set(j.head, headZ, 'z', 8);
    set(j.body, bodyRotX, 'x', 8);
    this._armOut = damp(this._armOut || 0, armOut, 8, dt);
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
      set(j.skirt.F, Math.min(lL, lR, 0) * 0.85 + this.skirtLag * 0.25, 'x', sp2);
      set(j.skirt.B, Math.max(lL, lR, 0) * 0.85 + this.skirtLag, 'x', sp2);
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
      const sway = 0.15 + Math.min(speed, 7) * 0.08 + Math.sin(this.phase * 2) * Math.min(speed, 7) * 0.02;
      j.tail.segs.forEach((s, i) => {
        s.rotation.x = damp(s.rotation.x, sway * (i + 1) * 0.3 + Math.sin(this.t * 2 + i) * 0.03, 9 - i, dt);
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
