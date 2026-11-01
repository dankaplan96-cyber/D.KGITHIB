// TOWN-LIFE-3: two small household things in Citadel, built from simple shapes (nothing from the original games):
//   - washing on the lines: one in the neighbours' yard across the lane from Twinsen's door, one behind the pink house east
//     of the lane; shirts, a sheet and towels moving in the breeze. Inside the yards, off every path and doorway.
//   - the lane's cat: asleep on the bench by Twinsen's front door, or in the neighbours' yard. Walk up to it and it lifts its
//     head; come closer (or run) and it gets up, stretches, and trots off to another of its places — over the low fence if
//     that is the way — sits, washes, and lies down again. A small "mrrp" as it goes.
// Nothing is saved: after a load the cat is back asleep on the bench. In every chapter (in the evacuation too: the washing
// left on the line, the cat staying put).
// Cost: a line is two draws (posts and rope merged, the washing one instanced draw), the cat four (body, head, tail, legs
// instanced); moved only while Twinsen is outdoors within 35 m (the washing) or 30 m (the cat).
import * as THREE from 'three';
import { LbaMaterial } from './characters.js';
import { dampAngle, clamp } from '../engine/math.js';
import { part, merge, M4, MATL } from './gulls.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const CLOTH_MAT = new LbaMaterial({ side: THREE.DoubleSide });

// the washing lines: two posts and the rope between them (a and b, world), the things on it (along the rope from a, width,
// drop, colour)
export const LINES = [
  { name: 'washingNbr', a: { x: -37.6, z: 73.6 }, b: { x: -37.6, z: 77.0 }, items: [[0.35, 0.5, 0.6, '#f4f0e6'], [0.95, 0.42, 0.5, '#5a8ac8'], [1.62, 0.85, 0.95, '#f6f6f2'], [2.4, 0.4, 0.5, '#e07a5a'], [2.95, 0.36, 0.42, '#8ac08a']] },
  { name: 'washingPink', a: { x: -30.2, z: 20.5 }, b: { x: -26.8, z: 20.5 }, items: [[0.4, 0.45, 0.55, '#e8d070'], [1.05, 0.7, 0.85, '#f0ece2'], [1.8, 0.42, 0.52, '#c86a8a'], [2.45, 0.38, 0.46, '#6aa0c0'], [3.0, 0.34, 0.4, '#f4f0e6']] },
];
const LINE_H = 2.05, LINE_R = 35;

// the cat's places: on the bench by Twinsen's front door (its seat), in the neighbours' yard (two)
export const CAT_SPOTS = [{ x: -46.3, z: 82.05, seat: true, a: 0 }, { x: -39.3, z: 76.6, a: -2.2 }, { x: -40.0, z: 72.1, a: 0.6 }];
const CAT_R = 30, WAKE_WALK = 2.8, WAKE_RUN = 5.0, K = 1.3;   // (K: drawn this much larger than modelled)

function clothGeo() {
  // a unit cloth hanging from its top edge (x across, down -y), a little bellied; scaled per piece
  const g = new THREE.PlaneGeometry(1, 1, 3, 3); g.translate(0, -0.5, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin((x + 0.5) * Math.PI) * 0.06 * (-y)); }
  g.computeVertexNormals();
  return part(g, '#ffffff');
}

export class TownBits {
  constructor(game, busy, parent) {
    this.game = game; this.busy = busy;
    const P = game.physics;
    this.lines = [];
    this.log = [];
    const cg = clothGeo();
    for (const L of LINES) {
      const ya = P.groundAt(L.a.x, L.a.z, P.terrain.heightAt(L.a.x, L.a.z) + 0.5), yb = P.groundAt(L.b.x, L.b.z, P.terrain.heightAt(L.b.x, L.b.z) + 0.5);
      const dx = L.b.x - L.a.x, dz = L.b.z - L.a.z, len = Math.hypot(dx, dz), ry = Math.atan2(dx, dz);
      const top = (ya + yb) / 2 + LINE_H;
      const posts = merge([
        part(new THREE.CylinderGeometry(0.045, 0.055, LINE_H + 0.1, 6), '#7a5a3a', M4(L.a.x, ya + (LINE_H + 0.1) / 2, L.a.z)),
        part(new THREE.CylinderGeometry(0.045, 0.055, LINE_H + 0.1, 6), '#7a5a3a', M4(L.b.x, yb + (LINE_H + 0.1) / 2, L.b.z)),
        part(new THREE.CylinderGeometry(0.008, 0.008, len, 4), '#e8e2d0', M4((L.a.x + L.b.x) / 2, top - 0.03, (L.a.z + L.b.z) / 2, Math.PI / 2, ry, 0)),
      ]);
      const pm = new THREE.Mesh(posts, MATL); pm.name = L.name + 'Posts'; pm.castShadow = true; pm.matrixAutoUpdate = false; parent.add(pm);
      for (const q of [L.a, L.b]) P.add({ type: 'cyl', x: q.x, z: q.z, r: 0.08, top: top + 0.05, seeThrough: true, noStand: true });
      const im = new THREE.InstancedMesh(cg, CLOTH_MAT, L.items.length); im.name = L.name; im.castShadow = true;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const c = new THREE.Color();
      L.items.forEach((it, i) => im.setColorAt(i, c.set(it[3])));
      im.boundingSphere = new THREE.Sphere(new THREE.Vector3((L.a.x + L.b.x) / 2, top - 0.5, (L.a.z + L.b.z) / 2), len / 2 + 1);
      parent.add(im);
      const ln = { L, im, top, ry, ux: dx / len, uz: dz / len, ph: L.items.map((_, i) => i * 1.7 + L.name.length) };
      this.lines.push(ln);
      this.wave(ln, 0);
    }
    this.cat = new Cat(game, parent, this);
  }
  note(s) { this.log.push(`${this.game.time.toFixed(1)} ${s}`); if (this.log.length > 30) this.log.shift(); }
  update(dt, live, state) {
    const g = this.game, h = g.hero, t = g.time;
    if (live && g.state === 'play') for (const ln of this.lines) {
      const d = Math.hypot(h.pos.x - (ln.L.a.x + ln.L.b.x) / 2, h.pos.z - (ln.L.a.z + ln.L.b.z) / 2);
      if (d < LINE_R) this.wave(ln, t);
    }
    this.cat.update(dt, live);
  }
  // each piece swings about the rope in the breeze (a slow gust over all, each on its own beat), and twists a little
  wave(ln, t) {
    const gust = 0.5 + 0.5 * Math.sin(t * 0.37) * Math.sin(t * 0.23 + 1);
    ln.L.items.forEach(([s, w, d], i) => {
      const x = ln.L.a.x + ln.ux * s, z = ln.L.a.z + ln.uz * s;
      const sw = 0.1 + 0.22 * gust + Math.sin(t * 1.9 + ln.ph[i]) * (0.06 + 0.1 * gust);
      _e.set(sw, ln.ry + Math.PI / 2 + Math.sin(t * 1.3 + ln.ph[i] * 2) * 0.08 * gust, 0);
      _q.setFromEuler(_e); _p.set(x, ln.top - 0.02, z); _s.set(w, d, 1);
      ln.im.setMatrixAt(i, _m.compose(_p, _q, _s));
    });
    ln.im.instanceMatrix.needsUpdate = true;
    ln.t = t;
  }
}

// ------------------------------------------------------------------ the cat
function catGeos() {
  const FUR = '#d8883a', DARK = '#a8602a', CREAM = '#f2dcb4', PINK = '#e8a0a0', EYE = '#2a3a1a';
  const body = merge([
    part(new THREE.SphereGeometry(0.11, 10, 8), FUR, M4(0, 0, 0, 0, 0, 0, 0.85, 0.8, 1.75)),
    part(new THREE.SphereGeometry(0.09, 8, 6), CREAM, M4(0, -0.03, 0.04, 0, 0, 0, 0.75, 0.6, 1.4)),
    part(new THREE.BoxGeometry(0.15, 0.012, 0.028), DARK, M4(0, 0.066, -0.06)),
    part(new THREE.BoxGeometry(0.15, 0.012, 0.028), DARK, M4(0, 0.068, 0.05)),
  ]);
  const head = merge([
    part(new THREE.SphereGeometry(0.075, 10, 8), FUR, M4(0, 0, 0, 0, 0, 0, 1.05, 0.92, 0.95)),
    part(new THREE.SphereGeometry(0.04, 8, 6), CREAM, M4(0, -0.025, 0.055, 0, 0, 0, 1.1, 0.75, 0.8)),
    part(new THREE.ConeGeometry(0.03, 0.06, 4), FUR, M4(0.045, 0.07, -0.005, 0, Math.PI / 4, -0.25)),
    part(new THREE.ConeGeometry(0.03, 0.06, 4), FUR, M4(-0.045, 0.07, -0.005, 0, Math.PI / 4, 0.25)),
    part(new THREE.ConeGeometry(0.016, 0.03, 4), PINK, M4(0.045, 0.066, 0.004, 0, Math.PI / 4, -0.25)),
    part(new THREE.ConeGeometry(0.016, 0.03, 4), PINK, M4(-0.045, 0.066, 0.004, 0, Math.PI / 4, 0.25)),
    part(new THREE.SphereGeometry(0.013, 6, 4), EYE, M4(0.03, 0.012, 0.062)),
    part(new THREE.SphereGeometry(0.013, 6, 4), EYE, M4(-0.03, 0.012, 0.062)),
    part(new THREE.SphereGeometry(0.009, 5, 4), PINK, M4(0, -0.008, 0.083)),
  ]);
  const tail = merge([part(new THREE.CylinderGeometry(0.018, 0.024, 0.26, 6), FUR, M4(0, 0.13, 0)), part(new THREE.SphereGeometry(0.02, 6, 4), DARK, M4(0, 0.26, 0))]);
  const leg = merge([part(new THREE.CylinderGeometry(0.02, 0.018, 0.13, 6), FUR, M4(0, -0.065, 0)), part(new THREE.SphereGeometry(0.022, 6, 4), CREAM, M4(0, -0.13, 0.008, 0, 0, 0, 1, 0.6, 1.3))]);
  for (const g of [body, head, tail, leg]) g.scale(K, K, K);
  return { body, head, tail, leg };
}
class Cat {
  constructor(game, parent, bits) {
    this.game = game; this.bits = bits;
    const G = catGeos();
    const grp = (this.group = new THREE.Group()); grp.name = 'cat'; parent.add(grp);
    this.body = new THREE.Mesh(G.body, MATL); this.head = new THREE.Mesh(G.head, MATL); this.tail = new THREE.Mesh(G.tail, MATL);
    this.legs = new THREE.InstancedMesh(G.leg, MATL, 4); this.legs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (const m of [this.body, this.head, this.tail, this.legs]) { m.castShadow = true; grp.add(m); }
    const P = game.physics;
    // (each place's height: on the bench, its seat's top; on the ground, the ground)
    // (the bench's seat: walkers.js BENCH_RED, 0.485 m over the ground at its feet)
    this.spots = CAT_SPOTS.map((s) => ({ ...s, y: s.seat ? P.terrain.heightAt(s.x, s.z) + 0.49 : P.groundAt(s.x, s.z, P.terrain.heightAt(s.x, s.z) + 0.3) }));
    // (one fixed sphere round all its places for the view test: the legs' instances move)
    let cx = 0, cz = 0; for (const q of this.spots) { cx += q.x; cz += q.z; } cx /= this.spots.length; cz /= this.spots.length;
    let r = 0; for (const q of this.spots) r = Math.max(r, Math.hypot(q.x - cx, q.z - cz));
    this.legs.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, this.spots[0].y, cz), r + 1.5);
    this.reset();
    this.count = { woke: 0, moved: 0, mrrp: 0 };
  }
  reset() {
    const s = this.spots[0];
    this.spot = 0; this.pos = { x: s.x, y: s.y, z: s.z }; this.a = s.a; this.st = 'sleep'; this.t = 0; this.idle = 30 + Math.random() * 30;
    this.pose = { lie: 1, head: 0, stretch: 0, step: 0, hop: 0, wash: 0 };
    this.draw(0);
  }
  get asleep() { return this.st === 'sleep'; }
  update(dt, live) {
    const g = this.game, h = g.hero, d = Math.hypot(h.pos.x - this.pos.x, h.pos.z - this.pos.z);
    if (!live || d > CAT_R) return;
    if (g.state !== 'play') { this.draw(0); return; }
    this.t += dt;
    const near = d < (h.speed > 3.2 ? WAKE_RUN : WAKE_WALK) && Math.abs(h.pos.y - this.pos.y) < 2.5, P = this.pose;
    switch (this.st) {
      case 'sleep':
        P.lie = 1; P.head = Math.max(0, P.head - dt * 2);
        if (near) { this.st = 'wake'; this.t = 0; this.count.woke++; this.bits.note('cat woke'); }
        else if ((this.idle -= dt) <= 0) { this.st = 'situp'; this.t = 0; }
        break;
      case 'wake':   // the head up, a look at him
        P.head = Math.min(1, P.head + dt * 3);
        this.turnTo(Math.atan2(h.pos.x - this.pos.x, h.pos.z - this.pos.z), dt, 1.5);
        if (this.t > 0.7) { if (near) this.leave(h); else if (this.t > 3) { this.st = 'sleep'; this.idle = 40 + Math.random() * 40; } }
        break;
      case 'stretch':   // up, a long stretch, off
        P.lie = Math.max(0, P.lie - dt * 3); P.stretch = Math.sin(clamp(this.t / 0.9, 0, 1) * Math.PI);
        if (this.t > 0.9) { this.st = 'go'; this.t = 0; this.mrrp(); }
        break;
      case 'go': {
        const T = this.route, k = clamp(this.t / T.dur, 0, 1);
        this.pos.x = T.x0 + (T.x1 - T.x0) * k; this.pos.z = T.z0 + (T.z1 - T.z0) * k;
        const gy = this.game.physics.groundAt(this.pos.x, this.pos.z, Math.max(T.y0, T.y1) + 0.3);
        const yl = T.y0 + (T.y1 - T.y0) * k;
        // (a hop off the bench, onto the yard, over the fence: an arc where the way is higher than the ground)
        P.hop = T.hops.reduce((m, q) => Math.max(m, Math.abs(k - q) < 0.08 ? Math.cos(((k - q) / 0.08) * Math.PI / 2) * 0.75 : 0), 0);
        this.pos.y = Math.max(gy, T.seat0 && k < 0.12 ? yl : gy) + P.hop;
        this.a = T.a; P.step += dt * 9; P.lie = 0; P.stretch = 0;
        if (k >= 1) { this.pos.y = T.y1; this.st = 'sit'; this.t = 0; this.spot = T.to; this.count.moved++; this.bits.note('cat at ' + T.to); }
        break;
      }
      case 'situp':   // now and then on its own: sits up, washes, lies down again
      case 'sit':
        P.lie = Math.max(0, P.lie - dt * 2); P.head = 1; P.wash = this.t > 1 && this.t < 3.5 ? 1 : 0;
        if (near && this.t > 1.5) { this.leave(h); break; }
        if (this.t > 5) { this.st = 'down'; this.t = 0; }
        break;
      case 'down':
        P.lie = Math.min(1, P.lie + dt * 1.5); P.head = Math.max(0, P.head - dt * 1.2); P.wash = 0;
        this.turnTo(this.spots[this.spot].a, dt, 2);
        if (this.t > 1.2) { this.st = 'sleep'; this.idle = 40 + Math.random() * 40; }
        break;
    }
    this.draw(dt);
  }
  turnTo(a, dt, k) { this.a = dampAngle(this.a, a, k, dt); }
  // off to the place furthest from him
  leave(h) {
    let best = -1, bd = -1;
    this.spots.forEach((s, i) => { if (i === this.spot) return; const d = Math.hypot(s.x - h.pos.x, s.z - h.pos.z); if (d > bd) { bd = d; best = i; } });
    const s0 = { x: this.pos.x, z: this.pos.z, y: this.pos.y }, s1 = this.spots[best], L = Math.hypot(s1.x - s0.x, s1.z - s0.z);
    // (where the way crosses something solid — the fence — it hops)
    const P = this.game.physics, hops = [];
    for (let k = 0.1; k < 0.95; k += 0.05) { const x = s0.x + (s1.x - s0.x) * k, z = s0.z + (s1.z - s0.z) * k; if (P.blockedAt(x, z, P.terrain.heightAt(x, z), 0.05) && !hops.some((q) => Math.abs(q - k) < 0.15)) hops.push(k); }
    this.route = { x0: s0.x, z0: s0.z, y0: s0.y, x1: s1.x, z1: s1.z, y1: s1.y, a: Math.atan2(s1.x - s0.x, s1.z - s0.z), dur: L / 1.7, to: best, hops, seat0: this.spots[this.spot].seat };
    if (this.spots[this.spot].seat) hops.push(0.04);
    this.st = 'stretch'; this.t = 0;
  }
  mrrp() {
    const A = this.game.audio; if (!A?.ctx || A.ctx.state !== 'running' || !A.sfxBus) return;
    const h = this.game.hero.pos, d = Math.hypot(h.x - this.pos.x, h.z - this.pos.z), v = d >= 14 ? 0 : (1 - d / 14) ** 2 * 0.05;
    if (v < 0.002) return;
    this.count.mrrp++;
    const ctx = A.ctx, at = ctx.currentTime, o = ctx.createOscillator(), gn = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(420, at); o.frequency.linearRampToValueAtTime(620, at + 0.12); o.frequency.exponentialRampToValueAtTime(380, at + 0.32);
    f.type = 'lowpass'; f.frequency.value = 1400;
    gn.gain.setValueAtTime(0.0001, at); gn.gain.exponentialRampToValueAtTime(v, at + 0.04); gn.gain.exponentialRampToValueAtTime(0.0001, at + 0.34);
    o.connect(f).connect(gn).connect(A.sfxBus); o.start(at); o.stop(at + 0.36);
  }
  // the pose: lying curled (low, legs tucked, tail round), sitting (front up), walking (legs in step), stretching (front down)
  draw() {
    const P = this.pose, x = this.pos.x, y = this.pos.y, z = this.pos.z, a = this.a, t = this.game.time;
    const c = Math.cos(a), s = Math.sin(a);
    const W = (lx, ly, lz) => _p.set(x + K * (lx * c + lz * s), y + K * ly, z + K * (-lx * s + lz * c));
    const sit = this.st === 'sit' || this.st === 'situp' || this.st === 'wake' ? 1 - P.lie : 0;
    const bodyY = 0.17 - 0.1 * P.lie - 0.05 * P.stretch, pitch = -0.45 * sit + 0.25 * P.stretch;
    const breathe = P.lie > 0.5 ? Math.sin(t * 1.8) * 0.006 : 0;
    _e.set(pitch, a, 0); _q.setFromEuler(_e);
    this.body.position.copy(W(0, bodyY + 0.045 * sit + breathe, -0.02 * sit)); this.body.quaternion.copy(_q);
    // the head: tucked down on its paws asleep, up looking about awake, bobbing to wash
    const hy = bodyY + 0.07 + 0.02 * P.head + 0.12 * sit - 0.06 * P.lie * (1 - P.head), hz = 0.2 - 0.05 * sit - 0.03 * P.lie;
    _e.set(0.3 * P.lie * (1 - P.head) + (P.wash ? 0.35 + Math.sin(t * 9) * 0.15 : 0) - 0.1 * P.stretch, a + (P.head ? Math.sin(t * 0.7) * 0.25 * (1 - P.wash) : 0.5 * P.lie), 0); _q.setFromEuler(_e);
    this.head.position.copy(W(0, hy, hz)); this.head.quaternion.copy(_q);
    // the tail: wrapped round asleep, up and swaying walking, curled round its feet sitting
    const tw = Math.sin(t * 2.2) * 0.25;
    if (P.lie > 0.5) _e.set(Math.PI / 2 - 0.05, a + 0.28, 0);   // (laid along its flank, toward its nose)
    else if (this.st === 'go') _e.set(0.5 + tw * 0.3, a + Math.PI + tw, 0);
    else _e.set(1.35, a + Math.PI + 0.9 + tw * 0.3, 0);
    _q.setFromEuler(_e); this.tail.position.copy(W(P.lie > 0.5 ? 0.09 : 0, bodyY - 0.01, -0.17 + 0.03 * sit)); this.tail.quaternion.copy(_q);
    // the legs: front pair, back pair (tucked under lying; in step walking)
    const step = this.st === 'go' ? P.step : 0;
    [[0.05, 0.1, 0], [-0.05, 0.1, Math.PI], [0.05, -0.12, Math.PI], [-0.05, -0.12, 0]].forEach(([lx, lz, ph], i) => {
      const swing = this.st === 'go' ? Math.sin(step + ph) * 0.5 : 0, front = lz > 0;
      const tuck = P.lie, ly = bodyY - 0.02 + (front ? 0.035 * sit : -0.06 * sit), sc = 1 - 0.75 * tuck;
      _e.set(swing + (front ? -0.25 * P.stretch : 0) + (front ? 0 : -1.1 * sit) - 1.3 * tuck, a, 0); _q.setFromEuler(_e);
      _s.set(1, sc, 1);
      this.legs.setMatrixAt(i, _m.compose(W(lx, ly, lz + (front ? 0.02 * sit : 0)).clone(), _q, _s));
    });
    this.legs.instanceMatrix.needsUpdate = true;
  }
}
