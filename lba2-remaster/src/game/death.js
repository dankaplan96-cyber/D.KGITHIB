// Enemy knock-outs (ANIM-DEATH): one clock and one set of rules for every enemy's fall, so a beaten enemy
// reads the same way everywhere: hit reaction → fall with weight → impact and a small bounce → a short rest →
// LBA's blink and a puff of stars → gone, its bonus already out on the ground.
//
// Timing source: each kind's table below (seconds of game time from the killing blow; 30 and 60 fps play the same
// clock). The humanoid fall's keys live with the other poses in src/engine/rig.js (KO_HUMAN), its length after
// LBA2's own knock-down (Twinsen's "beaten", ANIM.HQR: ~1.1 s from the hit to the body flat on the ground, root
// pushed back ~0.3 H in the first half; ours is shorter, 0.62 s, so play is not held up).
//
// Rules that hold for every kind:
//  - the enemy leaves the target lists on the frame of the blow (alive is false), only its body stays a while;
//  - the body never goes into the ground: every frame its lowest sampled points (vertices of its own meshes) are
//    measured against the ground under each one and the body is lifted out; once down it rests on its lowest
//    point (no floating); on a slope or stairs it lies along the ground under it;
//  - killed in the air, it falls with gravity and the fall plays out where it lands;
//  - the blow's push is a short stagger that goes through collision (no sliding corpse, no going into a wall); a
//    humanoid falls away from the hit, onto its front if the blow came from behind, and slumps where it stands if
//    there is no room to lie down (a wall or a drop behind it);
//  - the bonus (LBA's GiveExtraBonus) flies out of the body when it hits the ground and lands on the ground;
//  - nothing waits for it: the player is never locked; leaving the place, a dialogue or a story change of cast
//    let it finish on its own clock; a reload restores it as gone.
import * as THREE from 'three';
import { clamp, angleDiff } from '../engine/math.js';
import { placeBlobShadow, KO_HUMAN } from '../engine/rig.js';

const G = 26;   // the physics' gravity (m/s²)
// per kind: when the body is down (impact; for the airborne kinds the first touch decides), when it lies still,
// when the blink starts and when it is gone; the stagger's speed (m/s) and how quickly it dies away; a hop (m/s up)
export const KO = {
  human: { impact: KO_HUMAN.impact, settle: KO_HUMAN.settle, blink: 1.55, gone: 2.15, slide: 1.7, slideK: 7 },
  dog: { impact: 0.46, settle: 0.8, blink: 1.45, gone: 2.05, slide: 2.2, slideK: 6 },
  mite: { roll: 0.42, settle: 0.75, blink: 1.15, gone: 1.65, slide: 1.6, slideK: 6, hop: 2.8 },
  crawler: { roll: 0.6, settle: 1.1, blink: 1.6, gone: 2.2, slide: 0.7, slideK: 6, hop: 1.6 },
  drone: { settle: 0.45, blink: 1.9, gone: 2.5, slide: 1.4, slideK: 3, bounce: 0.3 },
  guardian: { settle: 0.6, blink: 3.0, gone: 3.6, slide: 0.5, slideK: 3, bounce: 0.25 },
  sentry: { impact: 0.78, settle: 1.15, blink: 1.75, gone: 2.35, slide: 0.8, slideK: 7 },
};

const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _qy = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _n = new THREE.Vector3();

// a few dozen points of the body's own surface (the extremes of each mesh and an even spread), read every frame
// in world space to keep the body out of the ground and on it
function collectSamples(root, n = 140) {
  root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry?.attributes?.position) return;
    for (let p = o; p && p !== root; p = p.parent) if (!p.visible || p.userData.noContact) return;   // (hidden; a prop it lets go of)
    const m = o.material;
    if (m && (Array.isArray(m) ? m[0] : m).transparent) return;   // (glows, sparks, lines)
    meshes.push(o);
  });
  const total = meshes.reduce((s, m) => s + m.geometry.attributes.position.count, 0) || 1;
  const out = [];
  for (const m of meshes) {
    const P = m.geometry.attributes.position, cnt = P.count, ids = new Set();
    // the extremes along each axis (a sole, a fingertip, the top of a crest), and an even spread
    for (let a = 0; a < 3; a++) {
      let lo = 1e9, hi = -1e9, il = -1, ih = -1;
      for (let i = 0; i < cnt; i++) { const v = P.getComponent(i, a); if (v < lo) { lo = v; il = i; } if (v > hi) { hi = v; ih = i; } }
      ids.add(il); ids.add(ih);
    }
    const k = Math.max(4, Math.round(n * cnt / total)), step = Math.max(1, Math.floor(cnt / k));
    for (let i = 0; i < cnt; i += step) ids.add(i);
    for (const i of ids) if (i >= 0) out.push({ m, i });
  }
  return out;
}
function sampleWorld(s, v) {
  if (s.m.isSkinnedMesh) s.m.getVertexPosition(s.i, v); else v.fromBufferAttribute(s.m.geometry.attributes.position, s.i);
  return v.applyMatrix4(s.m.matrixWorld);
}

export class KnockOut {
  // e: the enemy (an Actor); kind: a KO key; from: where the blow came from (a position) or null
  constructor(e, kind, from = null) {
    const g = e.game, P = g.physics;
    this.e = e; this.kind = kind; this.T = KO[kind]; this.t = 0; this.pt = 0;
    this.g = g; this.done = false; this.bonusOut = false; this.blinkOn = true; this.touched = false; this.impactT = null;
    e.kb?.set(0, 0);
    // away from the blow (no source: backwards)
    let ax = from ? e.pos.x - from.x : -Math.sin(e.angle), az = from ? e.pos.z - from.z : -Math.cos(e.angle);
    const al = Math.hypot(ax, az) || 1; ax /= al; az /= al;
    this.away = Math.atan2(ax, az);
    this.vx = ax * this.T.slide; this.vz = az * this.T.slide;
    // the attacker's side, seen from the enemy (+1: to its left)
    this.side = Math.sign(angleDiff(e.angle, this.away + Math.PI)) || 1;
    const root = e.rig.root;
    this.base = P.groundAt(e.pos.x, e.pos.z, e.pos.y + 0.3);
    this.h = (kind === 'drone' || kind === 'guardian') ? e.hover : Math.max(0, root.position.y - this.base);
    this.vy = (kind === 'drone' || kind === 'guardian') ? 0 : (e.onGround === false ? Math.min(0, e.vy || 0) : 0);
    if (this.T.hop) { this.vy = this.T.hop; }
    this.yaw = e.angle; this.yaw0 = e.angle;
    // (the body as it was, to put it back if a developer tool or a test brings the enemy back: koActive)
    this.rest = [];
    root.traverse((o) => this.rest.push([o, o.parent, o.position.clone(), o.quaternion.clone(), o.scale.clone(), o.visible, o.rotation.order]));
    root.rotation.order = 'YXZ';
    // what it holds goes flying as it falls (a guard's rifle), and lands on the ground beside it
    this.drops = []; this.held = e.rifle ? [e.rifle] : [];
    for (const o of this.held) o.userData.noContact = true;
    this.samples = collectSamples(root);
    // how far the resting body's lowest point sits from the ground before the blow (soles, a hover): the standing
    // pose keeps its own contact; the allowance is taken up as the body goes down
    this.clear0 = Math.min(0, this.measure().min);
    if (kind === 'human') this.planFall(from);
    if (kind === 'drone' || kind === 'guardian') { this.w = new THREE.Vector3(1.2 * this.side, 0, 2.4 * this.side); this.rot = new THREE.Euler(0, 0, 0); }
    e.ko = this;
  }

  // the humanoid's fall: onto the back away from the blow (onto the front when hit from behind), turned a little to
  // fall straight away from it; the other way if there is no room; slump where it stands if neither has room
  planFall(from) {
    const e = this.e, P = this.g.physics, rig = e.rig;
    const L = (rig.height || 1.8) * (rig.root.scale.y || 1) * 0.95;
    const toward = from ? Math.atan2(from.x - e.pos.x, from.z - e.pos.z) : e.angle;
    const rel = angleDiff(e.angle, toward);
    let dir = Math.abs(rel) < 1.95 ? 1 : -1;   // 1: falls on the back (the blow in front), -1: on the front
    const turn = clamp(dir > 0 ? rel : angleDiff(e.angle, toward + Math.PI), -0.6, 0.6);
    const room = (yaw, d) => {
      // the body lies along -facing (on the back) or +facing (on the front), L long
      const fx = Math.sin(yaw) * -d, fz = Math.cos(yaw) * -d, y = this.base + 0.35;
      for (const k of [0.45, 0.8, 1.05]) {
        const x = e.pos.x + fx * L * k, z = e.pos.z + fz * L * k, gy = P.groundAt(x, z, this.base + 0.6);
        if (gy < this.base - 0.75 || gy > this.base + 0.6 || P.blockedAt(x, z, this.base, 0.15)) return false;
      }
      return P.lineOfSight(e.pos.x, y, e.pos.z, e.pos.x + fx * L * 1.05, y, e.pos.z + fz * L * 1.05);
    };
    let yaw = e.angle + turn, mode = 'fall';
    if (!room(yaw, dir)) {
      if (room(e.angle, dir)) yaw = e.angle;
      else if (room(e.angle, -dir)) { yaw = e.angle; dir = -dir; }
      else mode = 'slump';
    }
    this.fall = { dir, mode, L };
    this.fallYaw = yaw;
    rig.ko = { t: 0, dir, mode, side: this.side, round: !!e.grobo };
    rig.play('ko');
  }

  // lowest point of the body above the ground under it (negative: in the ground), and the body's centre
  measure() {
    const P = this.g.physics, root = this.e.rig.root;
    root.updateMatrixWorld(true);
    let min = Infinity, cx = 0, cy = 0, cz = 0;
    for (const s of this.samples) {
      sampleWorld(s, _v);
      const d = _v.y - P.groundAt(_v.x, _v.z, _v.y + 0.6);
      if (d < min) min = d;
      cx += _v.x; cy += _v.y; cz += _v.z;
    }
    const n = this.samples.length || 1;
    return { min: Number.isFinite(min) ? min : 0, cx: cx / n, cy: cy / n, cz: cz / n };
  }

  // how far down the body is (0 standing, 1 lying): the ground tilt and the contact allowance follow it
  down() {
    const T = this.T, t = this.pt;
    if (this.kind === 'human') return this.fall.mode === 'slump' ? clamp((t - 0.2) / 0.5, 0, 1) : clamp((t - KO_HUMAN.recoil) / (T.impact - KO_HUMAN.recoil), 0, 1) ** 2;
    if (this.kind === 'dog' || this.kind === 'sentry') return clamp((t - 0.1) / (T.impact - 0.1), 0, 1) ** 2;
    if (this.kind === 'mite' || this.kind === 'crawler') return clamp(t / T.roll, 0, 1);
    return this.impactT != null ? clamp((this.t - this.impactT) / 0.3, 0, 1) : 0;
  }

  update(dt) {
    if (this.done || !(dt > 0)) return;
    const e = this.e, g = this.g, P = g.physics, T = this.T, root = e.rig.root, kind = this.kind;
    this.t += dt; e.deadT = this.t;
    // the pose clock waits while a humanoid or a dog is still in the air (killed mid-jump, off a ledge)
    const holdAt = kind === 'human' ? KO_HUMAN.recoil + 0.08 : kind === 'dog' || kind === 'sentry' ? 0.16 : Infinity;
    if (!(this.air && this.pt >= holdAt)) this.pt += dt;
    // the stagger: the blow's push, through collision, over before the body is down
    const sliding = kind === 'drone' || kind === 'guardian' ? this.impactT == null : this.pt < (T.impact ?? T.roll ?? 0.4) || this.air;
    if (sliding && (Math.abs(this.vx) + Math.abs(this.vz)) > 0.01) {
      // (never up onto a step or a kerb: a body is pushed back, it does not climb; off an edge it drops)
      const k = Math.exp(-T.slideK * dt), og = e.onGround, nx = e.pos.x + this.vx * dt, nz = e.pos.z + this.vz * dt;
      if (P.groundAt(nx, nz, this.base + 0.3) > this.base + 0.12) { this.vx = 0; this.vz = 0; }
      else { e.onGround = true; P.move(e, this.vx * dt, this.vz * dt); e.onGround = og; }
      this.vx *= k; this.vz *= k;
    } else { this.vx = 0; this.vz = 0; }
    // the ground under the feet: walking off an edge drops the body with gravity
    const base = P.groundAt(e.pos.x, e.pos.z, this.base + this.h + 0.3);
    this.h += this.base - base; this.base = base; e.pos.y = base;
    this.vy -= G * dt; this.h += this.vy * dt;
    if (this.h < -3) { this.h = -3; this.vy = 0; }
    // turn toward the planned fall line
    this.yaw += clamp(angleDiff(this.yaw, this.fallYaw ?? this.yaw), -4 * dt, 4 * dt);
    e.angle = this.yaw;
    // the pose (each rig's own 'ko' code reads this)
    this.pose(dt);
    if (this.held.length && this.pt >= 0.1) { for (const o of this.held) this.letGo(o); this.held = []; }
    this.updateDrops(dt);
    // place, lean onto the ground's slope as the body goes down, then keep it on the ground
    const w = this.down();
    let hx, hz;
    if (kind === 'human' && this.fall.mode === 'fall') {
      // along the body: the chord from the ground under the feet to the ground under the head (so both rest on it,
      // across a dip or over a step); across it: the slope under the hips
      const dx = -Math.sin(this.yaw) * this.fall.dir, dz = -Math.cos(this.yaw) * this.fall.dir, L = this.fall.L, y0 = base + 0.6;
      const along = clamp((P.groundAt(e.pos.x + dx * L, e.pos.z + dz * L, y0) - base) / L, -0.6, 0.6);
      const mx = e.pos.x + dx * L * 0.5, mz = e.pos.z + dz * L * 0.5, c = 0.3;
      const across = clamp((P.groundAt(mx + dz * c, mz - dx * c, y0) - P.groundAt(mx - dz * c, mz + dx * c, y0)) / (2 * c), -0.6, 0.6);
      hx = along * dx + across * dz; hz = along * dz - across * dx;
    } else {
      // under the body's middle (last frame's), over its size
      const r = kind === 'human' ? 0.4 : 0.45 * (root.scale.x || 1), cx = this.cx ?? e.pos.x, cz = this.cz ?? e.pos.z, y0 = base + 0.6;
      hx = clamp((P.groundAt(cx + r, cz, y0) - P.groundAt(cx - r, cz, y0)) / (2 * r), -0.6, 0.6);
      hz = clamp((P.groundAt(cx, cz + r, y0) - P.groundAt(cx, cz - r, y0)) / (2 * r), -0.6, 0.6);
    }
    // (eased: the ground's lean under a body crossing a step or a kerb changes at once; the body follows it smoothly)
    _n.set(-hx * w, 1, -hz * w).normalize();
    this.nrm ??= new THREE.Vector3(0, 1, 0);
    this.nrm.lerp(_n, 1 - Math.exp(-10 * dt)).normalize(); _n.copy(this.nrm);
    _q.setFromUnitVectors(_up, _n); _qy.setFromAxisAngle(_up, this.yaw);
    root.quaternion.copy(_q).multiply(_qy);
    root.position.set(e.pos.x, base + this.h, e.pos.z);
    // (the standing pose's own dip into the ground — uneven ground, a step it straddled — is let go of evenly over
    // the fall, not all at the end; once down the body rests 1.5 cm proud of its sampled points, the unsampled ones
    // between them never dig in)
    const M = this.measure(), allow = this.clear0 * (1 - clamp(this.pt / (T.impact ?? T.roll ?? 0.45), 0, 1)) + 0.015 * w;
    this.cx = M.cx; this.cz = M.cz;
    const pen = M.min - allow;
    this.air = pen > 0.04 && !this.touched || this.vy > 0;
    if (pen < 0) {
      this.h -= pen; root.position.y -= pen;
      if (this.vy < 0) {
        const hard = this.vy;
        this.vy = T.bounce && hard < -2.5 && !this.bounced ? -hard * T.bounce : 0;
        if (this.vy > 0) this.bounced = true;
        if (!this.touched && (kind === 'drone' || kind === 'guardian' || kind === 'mite' || kind === 'crawler') && hard < -1.5) this.land(hard, M);
        this.touched = true;
      }
    }
    // the timed impact of the falls that are posed (the body meets the ground on its keys)
    if (this.impactT == null && T.impact != null && this.pt >= T.impact) this.land(-4, M);
    if (this.impactT == null && this.touched && this.pt > (T.roll ?? 0) && (kind === 'mite' || kind === 'crawler')) this.land(-2, M);
    // the blob shadow under the body, not the feet
    if (e.shadow) { placeBlobShadow(e.shadow, P, M.cx, base, M.cz); e.shadow.visible = root.visible || this.blinkOn; }
    // the classic LBA end: a blink, faster and faster, then a puff of stars and nothing
    if (this.t >= T.blink) {
      const left = T.gone - this.t, per = 0.06 + 0.1 * clamp(left / (T.gone - T.blink), 0, 1);
      this.blinkT = (this.blinkT ?? 0) + dt;
      if (this.blinkT >= per) { this.blinkT = 0; this.blinkOn = !this.blinkOn; }
      root.visible = this.blinkOn;
      if (e.shadow) e.shadow.visible = this.blinkOn;
      for (const d of this.drops) d.o.visible = this.blinkOn;
    }
    if (this.t >= T.gone) this.finish(M);
  }

  // the body hits the ground: a thud, dust, and the bonus comes out of it
  land(v, M) {
    const e = this.e, g = this.g, kind = this.kind;
    this.impactT = this.t;
    const s = kind === 'guardian' || kind === 'crawler' ? 1.8 : kind === 'mite' ? 0.6 : 1;
    g.audio.play(kind === 'drone' || kind === 'guardian' || kind === 'sentry' ? 'clunk' : kind === 'mite' || kind === 'crawler' ? 'land' : 'thump');
    g.particles.burst(M.cx, this.base + 0.1, M.cz, '#cbb994', Math.round(10 * s), 1.6 * s);
    if (kind === 'guardian' || kind === 'sentry' || kind === 'crawler') g.camRig?.shake?.(0.12 * s);
    if (!this.bonusOut && !this.noBonus) { this.bonusOut = true; const p = g.enemyBonus?.(e, M.cx, Math.max(M.cy, this.base + 0.4) + 0.25, M.cz); if (p) p.koDrop = true; }
    void v;
  }

  // gone: out of the scene (nothing of it is left to draw or to update)
  finish(M) {
    const e = this.e, g = this.g;
    if (!this.bonusOut && !this.noBonus) { this.bonusOut = true; g.enemyBonus?.(e, M.cx, Math.max(M.cy, this.base + 0.4) + 0.25, M.cz); }
    g.particles.burst(M.cx, Math.max(M.cy, this.base + 0.3), M.cz, '#fff6c8', 14, 2.2);
    this.done = true;
    for (const d of this.drops) d.o.parent?.remove(d.o);
    koGone(e);
  }

  // a held prop leaves the hand (keeping where it is in the world), tumbles out to the side of the fall, lands flat
  letGo(o) {
    this.g.scene.attach(o);
    const a = this.away + 0.9 * this.side;
    this.drops.push({ o, vx: Math.sin(a) * 1.6, vy: 2.4, vz: Math.cos(a) * 1.6, sx: 7 * this.side, sz: 4, landed: false, rest: new THREE.Quaternion().setFromAxisAngle(_up, a + 0.6) });
  }
  updateDrops(dt) {
    const P = this.g.physics;
    for (const d of this.drops) {
      const o = d.o, p = o.position;
      if (!d.landed) {
        d.vy -= G * dt;
        if (P.solidAt(p.x + d.vx * dt, p.z + d.vz * dt, p.y, 0.06)) { d.vx = 0; d.vz = 0; }
        p.x += d.vx * dt; p.y += d.vy * dt; p.z += d.vz * dt;
        o.rotateX(d.sx * dt); o.rotateZ(d.sz * dt);
        const gy = P.groundAt(p.x, p.z, p.y + 0.5) + 0.1;
        if (p.y <= gy && d.vy < 0) { p.y = gy; d.landed = true; this.g.audio.play('clunk'); }
      } else {
        // it settles flat (its length along the ground) in a moment
        o.quaternion.slerp(d.rest, 1 - Math.exp(-16 * dt));
        p.y = P.groundAt(p.x, p.z, p.y + 0.5) + 0.1;
      }
    }
  }

  // per kind: drive the rig's 'ko' pose and call its update
  pose(dt) {
    const e = this.e, rig = e.rig, kind = this.kind, t = this.pt;
    if (kind === 'human') { rig.ko.t = t; rig.ko.air = !!this.air; rig.play('ko'); rig.update(dt, 0); return; }
    if (kind === 'drone' || kind === 'guardian') {
      // tumbling down with the rotor dying; on the ground it rocks to a stop
      const k = this.impactT == null ? 1 : Math.exp(-(this.t - this.impactT) * 9);
      if (this.impactT != null && !this.damped) { this.damped = true; this.w.multiplyScalar(0.35); }
      this.rot.x += this.w.x * dt * k; this.rot.z += this.w.z * dt * k;
      this.rot.z = clamp(this.rot.z, -1.9, 1.9); this.rot.x = clamp(this.rot.x, -0.9, 0.9);
      rig.ko = { t: this.t, rx: this.rot.x, rz: this.rot.z, rotor: Math.max(0, 1 - this.t / 0.9), dim: clamp(this.t / 1.2, 0, 1) };
      rig.play('dead'); rig.update(dt); return;
    }
    // (fdir: +1 when the blow pushes it forward, over its front; -1 over its back)
    rig.ko = { t, side: this.side, fdir: Math.cos(angleDiff(this.e.angle, this.away)) >= 0 ? 1 : -1, T: this.T, impactT: this.impactT, air: !!this.air };
    rig.play('dead'); rig.update(dt, 0);
  }
}

// Is the enemy in a knock-out? An enemy only dies once in the game; the developer arena and the tests bring one
// back by giving it a living state again: then its body, shadow and tells are put back as they were before the blow.
export function koActive(e) {
  const k = e.ko;
  if (!k) return false;
  if (e.state === 'dead') return true;
  const s = e.game.scene;
  for (const d of k.drops || []) d.o.parent?.remove(d.o);
  for (const [o, parent, p, q, sc, vis, order] of k.rest || []) {
    if (parent && o.parent !== parent) parent.add(o);
    o.position.copy(p); o.quaternion.copy(q); o.scale.copy(sc); o.visible = vis; o.rotation.order = order; o.rotation.setFromQuaternion(q, order);
    if (o.userData.noContact) delete o.userData.noContact;
  }
  for (const o of [e.rig.root, e.shadow, e.aimLine, e.ring]) if (o && !o.parent) s.add(o);
  if (e.aimLine) e.aimLine.visible = false;
  if (e.ring) e.ring.visible = false;
  if (e.shadow) e.shadow.visible = true;
  if (e.rifle?.userData.glow) e.rifle.userData.glow.emissiveIntensity = 1.6;
  e.rig.ko = null; e.rig.play?.('idle');
  e.ko = null; e.gone = false; e.deadT = 0;
  return false;
}

// removed for good (also a saved kill on load): out of the scene with its shadow and its tells
export function koGone(e) {
  const s = e.game.scene;
  e.state = 'dead'; e.gone = true; e.deadT = Math.max(e.deadT || 0, 99);
  for (const o of [e.rig?.root, e.shadow, e.aimLine, e.ring, e.icon, ...(e.ko?.drops || []).map((d) => d.o)]) if (o) { o.visible = false; o.parent?.remove(o); }
  if (e.ko) e.ko.done = true;
  void s;
}
