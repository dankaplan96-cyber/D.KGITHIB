// TOWN-LIFE-2: gulls on Citadel — a few on the harbour's posts, crates, lamps and roofs and one or two on the ground, a
// pair by Pippa's stall eyeing the fruit. They sit, turn, peck; when Twinsen comes close (closer still when he walks, further
// when he runs) or someone runs at them, they take off with the ones beside them, wheel over the place a while and come
// down again on a perch away from him. Now and then one flies round on its own.
//
// Built in three.js from simple shapes (nothing from the original games): a white body with a grey back and a black-tipped
// tail, a yellow beak; wings that fold along the back and spread to fly. Cost: a flock is two instanced draws (bodies,
// wings), no shadow; it is simulated only while Twinsen is outdoors near it, and its matrices are written only when a gull
// moves. Nothing is saved.
//   new Gulls({ parent, physics, name, perches: [{ x, z, y?, dy?, ground? }], n, seed })
//   gulls.update(dt, ctx)   ctx: { hero {x, z, speed}, near [{x, z}] (others who scare them), audio (a cry: (x, z) => {}) }
import * as THREE from 'three';
import { LbaMaterial } from './characters.js';
import { rng } from '../engine/math.js';

const MATL = new LbaMaterial();
const ACTIVE_R = 50;           // metres beyond the flock's perches: simulated within, still beyond (a gull is a few pixels there)
const SCARE_WALK = 3.4, SCARE_RUN = 6.0, SCARE_OTHER = 1.3;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _p = new THREE.Vector3(), _s = new THREE.Vector3(1.25, 1.25, 1.25);   // (drawn a quarter larger than modelled: ~0.55 m, beak to tail)
const _w = new THREE.Matrix4(), _t = new THREE.Matrix4();

// ------------------------------------------------------------------ the shapes (one body, one wing; vertex colours)
// (part / merge / M4 are shared with the town's other small instanced props: townbusy.js)
export const M4 = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
export { MATL };
export function part(geo, hex, m) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (m) g.applyMatrix4(m);
  const n = g.attributes.position.count, c = new Float32Array(n * 3), col = new THREE.Color(hex);
  for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
export function merge(parts) {
  let n = 0; for (const p of parts) n += p.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let o = 0;
  for (const p of parts) { pos.set(p.attributes.position.array, o); nor.set(p.attributes.normal.array, o); col.set(p.attributes.color.array, o); o += p.attributes.position.count * 3; p.dispose(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeBoundingSphere();
  return g;
}
let GEO = null;
function geos() {
  if (GEO) return GEO;
  const WHITE = '#f2f2ec', GREY = '#a9b0ba', DARK = '#2e3036', BEAK = '#f0b428', LEG = '#e09a4a', EYE = '#1a1a1a';
  // (the feet's point at y 0, facing +z; about 0.45 m from beak to tail)
  const body = merge([
    part(new THREE.SphereGeometry(0.1, 10, 7), WHITE, M4(0, 0.19, 0, 0, 0, 0, 1, 0.85, 1.9)),
    part(new THREE.SphereGeometry(0.095, 8, 6), GREY, M4(0, 0.215, -0.04, 0, 0, 0, 0.98, 0.55, 1.55)),   // the grey back
    part(new THREE.ConeGeometry(0.06, 0.16, 6), DARK, M4(0, 0.205, -0.25, -Math.PI / 2 - 0.12)),          // the tail, black-tipped
    part(new THREE.SphereGeometry(0.064, 8, 6), WHITE, M4(0, 0.29, 0.16)),                                 // the head
    part(new THREE.ConeGeometry(0.02, 0.085, 5), BEAK, M4(0, 0.28, 0.255, Math.PI / 2)),                  // the beak
    part(new THREE.SphereGeometry(0.012, 5, 4), EYE, M4(0.045, 0.305, 0.195)),
    part(new THREE.SphereGeometry(0.012, 5, 4), EYE, M4(-0.045, 0.305, 0.195)),
    part(new THREE.CylinderGeometry(0.009, 0.009, 0.11, 4), LEG, M4(0.035, 0.055, 0.01)),
    part(new THREE.CylinderGeometry(0.009, 0.009, 0.11, 4), LEG, M4(-0.035, 0.055, 0.01)),
  ]);
  // the right wing, from the shoulder (0, 0, 0) out along +x: a grey arm and a black tip swept back a little
  const wing = merge([
    part(new THREE.BoxGeometry(0.27, 0.014, 0.15), GREY, M4(0.135, 0, 0)),
    part(new THREE.BoxGeometry(0.17, 0.011, 0.11), DARK, M4(0.34, 0, -0.025, 0, 0.22, 0)),
  ]);
  GEO = { body, wing };
  return GEO;
}

// ------------------------------------------------------------------ a flock
export class Gulls {
  constructor({ parent, physics, name = 'gulls', perches, n = 4, seed = 7 }) {
    const G = geos();
    this.rnd = rng(seed);
    this.perches = perches.map((p) => ({ ...p, y: (p.y ?? physics.groundAt(p.x, p.z, 50)) + (p.dy || 0), taken: null }));
    let cx = 0, cz = 0, cy = 0; for (const p of this.perches) { cx += p.x; cz += p.z; cy += p.y; }
    const k = this.perches.length; this.c = { x: cx / k, z: cz / k, y: cy / k };
    let r = 0; for (const p of this.perches) r = Math.max(r, Math.hypot(p.x - this.c.x, p.z - this.c.z));
    this.R = r;
    this.n = Math.min(n, k);
    this.body = new THREE.InstancedMesh(G.body, MATL, this.n);
    this.wing = new THREE.InstancedMesh(G.wing, MATL, this.n * 2);
    for (const m of [this.body, this.wing]) {
      m.name = name; m.castShadow = false; m.receiveShadow = false;
      // (a fixed sphere round where they can be, perched or wheeling: three's own view test, never recomputed)
      m.boundingSphere = new THREE.Sphere(new THREE.Vector3(this.c.x, this.c.y + 4, this.c.z), r + 14);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      parent.add(m);
    }
    this.birds = [];
    const order = this.perches.map((p, i) => i).sort(() => this.rnd() - 0.5);
    for (let i = 0; i < this.n; i++) {
      const p = this.perches[order[i]];
      const b = { st: 'sit', p, x: p.x, y: p.y, z: p.z, h: this.rnd() * 6.28, pitch: 0, flap: 0, spread: 0, t: 0, idle: 2 + this.rnd() * 6, peck: 0, fly: null };
      p.taken = b; this.birds.push(b);
    }
    this.dirty = true; this.soloT = 20 + this.rnd() * 30; this.cryT = 0;
    this.write();
  }
  get flying() { return this.birds.filter((b) => b.st !== 'sit').length; }
  // ---------------------------------------------------------------- the frame
  update(dt, ctx) {
    const h = ctx.hero, dc = Math.hypot(h.x - this.c.x, h.z - this.c.z);
    if (!ctx.outdoors || dc > ACTIVE_R + this.R) {
      // out of reach: anyone in the air is back on a perch at once (nobody sees it), and nothing else runs
      if (this.birds.some((b) => b.st !== 'sit')) { for (const b of this.birds) if (b.st !== 'sit') this.perch(b, this.freePerch(b, h)); this.write(); }
      return;
    }
    this.cryT -= dt;
    const scare = h.speed > 3.2 ? SCARE_RUN : SCARE_WALK;
    let startled = null;
    for (const b of this.birds) {
      if (b.st !== 'sit') continue;
      if (Math.hypot(h.x - b.x, h.z - b.z) < scare + (b.p.ground ? 0 : -0.8) && Math.abs(h.y - b.y) < 4) { startled = b; break; }
      for (const o of ctx.near || []) if (o.run && Math.hypot(o.x - b.x, o.z - b.z) < SCARE_OTHER && b.p.ground) { startled = b; break; }
      if (startled) break;
    }
    if (startled) {
      // the startled one and those close by go, one after another
      for (const b of this.birds) if (b.st === 'sit' && Math.hypot(b.x - startled.x, b.z - startled.z) < 4.5) this.takeOff(b, h, b === startled ? 0 : 0.1 + this.rnd() * 0.5);
      if (this.cryT <= 0) { ctx.cry?.(startled.x, startled.z, 3); this.cryT = 2.5; }
    }
    // now and then one goes round on its own
    if ((this.soloT -= dt) <= 0) {
      this.soloT = 25 + this.rnd() * 35;
      const sitters = this.birds.filter((b) => b.st === 'sit');
      if (sitters.length) { const b = sitters[Math.floor(this.rnd() * sitters.length)]; this.takeOff(b, h, 0); if (this.cryT <= 0 && dc < 30) { ctx.cry?.(b.x, b.z, 1); this.cryT = 4; } }
    }
    for (const b of this.birds) this.step(b, dt, h);
    if (this.dirty) this.write();
  }
  takeOff(b, h, delay) {
    if (b.p) b.p.taken = null;
    const away = Math.atan2(b.x - h.x, b.z - h.z);
    b.st = 'wait'; b.t = delay; b.p = null;
    const R = Math.max(5, this.R * 0.7 + 3 + this.rnd() * 4), H = this.c.y + 4.5 + this.rnd() * 3.5;
    // (a wheel round the place's middle, either way; it starts from where the bird is, off away from Twinsen first)
    b.fly = { R, H, dir: this.rnd() < 0.5 ? 1 : -1, w: (4.2 + this.rnd()) / R, ang: 0, up: 0, away, x0: b.x, y0: b.y, z0: b.z, dur: 7 + this.rnd() * 7 };
    this.dirty = true;
  }
  // a free perch away from Twinsen (the nearest to the bird of those over 6 m from him; else any free one)
  freePerch(b, h) {
    let best = null, bd = 1e9;
    for (const p of this.perches) {
      if (p.taken) continue;
      const far = Math.hypot(p.x - h.x, p.z - h.z) > 6.5, d = Math.hypot(p.x - b.x, p.z - b.z) + (far ? 0 : 1000) + this.rnd() * 3;
      if (d < bd) { bd = d; best = p; }
    }
    return best || this.perches.find((p) => !p.taken) || this.perches[0];
  }
  perch(b, p) {
    b.st = 'sit'; b.p = p; p.taken = b; b.x = p.x; b.y = p.y; b.z = p.z; b.pitch = 0; b.flap = 0; b.spread = 0; b.fly = null; b.idle = 2 + this.rnd() * 5;
    b.landed = (b.landed || 0) + 1;
    this.dirty = true;
  }
  step(b, dt, h) {
    switch (b.st) {
      case 'sit': {
        // a turn, a look round, a peck at the ground
        b.idle -= dt;
        if (b.peck > 0) { b.peck -= dt; b.pitch = b.peck > 0 ? Math.sin((1 - b.peck / 0.35) * Math.PI) * 0.7 : 0; this.dirty = true; }
        if (b.idle <= 0) {
          b.idle = 1.5 + this.rnd() * 4;
          if (b.p.ground && this.rnd() < 0.6) b.peck = 0.35;
          else { b.h += (this.rnd() - 0.5) * 1.6; this.dirty = true; }
        }
        return;
      }
      case 'wait': b.t -= dt; if (b.t <= 0) { b.st = 'up'; b.t = 0; } return;
      case 'up': case 'fly': {
        const F = b.fly; b.t += dt; this.dirty = true;
        // up and out: the first second climbs away from Twinsen, then it joins the wheel
        if (b.st === 'up') {
          const k = Math.min(1, b.t / 1.1), e = k * (2 - k);
          b.x = F.x0 + Math.sin(F.away) * 2.2 * e; b.z = F.z0 + Math.cos(F.away) * 2.2 * e; b.y = F.y0 + (F.H - F.y0) * 0.45 * e;
          b.h = F.away; b.pitch = -0.35; b.spread = 1; b.flap = Math.sin(b.t * 44) * 0.9;
          if (k >= 1) { b.st = 'fly'; b.t = 0; F.ang = Math.atan2(b.x - this.c.x, b.z - this.c.z); F.r0 = Math.hypot(b.x - this.c.x, b.z - this.c.z); F.ys = b.y; }
          return;
        }
        F.ang += F.w * F.dir * dt;
        const kr = Math.min(1, b.t / 2.5), r = F.r0 + (F.R - F.r0) * kr, y = F.ys + (F.H - F.ys) * kr;
        const nx = this.c.x + Math.sin(F.ang) * r, nz = this.c.z + Math.cos(F.ang) * r;
        b.h = Math.atan2(nx - b.x, nz - b.z); b.x = nx; b.z = nz; b.y = y + Math.sin(b.t * 0.9) * 0.3;
        b.pitch = 0; b.spread = 1;
        // flaps a while, glides a while (the wings held a little up)
        const ph = b.t % 2.6; b.flap = ph < 1.0 ? Math.sin(b.t * 30) * 0.7 : 0.18;
        if (b.t > F.dur) { const p = this.freePerch(b, h); p.taken = b; b.p = p; b.st = 'down'; b.t = 0; F.x1 = b.x; F.y1 = b.y; F.z1 = b.z; F.h1 = b.h; }
        return;
      }
      case 'down': {
        // a glide down to the perch (wings out, a last flurry over it)
        const F = b.fly, p = b.p; b.t += dt; this.dirty = true;
        const k = Math.min(1, b.t / 2.4), e = k * k * (3 - 2 * k);
        b.x = F.x1 + (p.x - F.x1) * e; b.z = F.z1 + (p.z - F.z1) * e;
        b.y = F.y1 + (p.y - F.y1) * (k * (2 - k)) + Math.sin(k * Math.PI) * 0.6;
        if (k < 0.97) b.h = Math.atan2(p.x - F.x1, p.z - F.z1);
        b.pitch = k > 0.8 ? -0.5 * (k - 0.8) / 0.2 : 0.1; b.spread = 1;
        b.flap = k > 0.78 ? Math.sin(b.t * 40) * 0.8 : 0.2;
        if (k >= 1) this.perch(b, p);
        return;
      }
    }
  }
  write() {
    this.dirty = false;
    for (let i = 0; i < this.birds.length; i++) {
      const b = this.birds[i];
      _e.set(b.pitch, b.h, 0); _q.setFromEuler(_e); _p.set(b.x, b.y, b.z);
      _m.compose(_p, _q, _s);
      this.body.setMatrixAt(i, _m);
      // the wings: folded along the back (sitting) or spread (flying); the right one out along +x, the left turned over
      const fold = (1 - b.spread) * (Math.PI / 2 - 0.12), lift = b.spread ? b.flap : 0.08;
      for (const side of [1, -1]) {
        _t.makeTranslation(0.07 * side, 0.235, 0.03);
        _w.makeRotationY(side * fold); _t.multiply(_w);
        _w.makeRotationZ(side > 0 ? lift : Math.PI - lift); _t.multiply(_w);
        this.wing.setMatrixAt(i * 2 + (side > 0 ? 0 : 1), _w.multiplyMatrices(_m, _t));
      }
    }
    this.body.instanceMatrix.needsUpdate = true; this.wing.instanceMatrix.needsUpdate = true;
  }
}
