// WORLD-LIFE (WORKLIST #37): residents who walk. A Resident is an NPC (the same models, talk prompt and voices) that is
// not placed by the story: it follows a daily round of stops (src/game/walkrounds.js), walking between them over the
// game's own walkable ground (src/game/walknav.js), and does what a person does at each: sits on a bench, stands at the
// well, browses the stall, tends a flower bed, carries a basket home, chats with a neighbour, goes in at its own door.
//
//   - Avoidance: a resident steps round the hero, round the story's people and round each other (the right-hand rule, so
//     two who meet head on pass), slows or waits when someone stands in the way, and never pushes anyone: actors have no
//     bodies in the physics, so "never pushing the hero" is that a resident keeps out of his way, not the reverse.
//   - Stuck: a resident that stops making progress plans again from where it stands; stuck again, it is put on its way
//     (or at its stop) where the camera cannot see it; in view it waits and tries again, and gives the stop up in the end.
//   - Talk: spoken to, a resident stops, turns and talks (its mouth moves with its voice, voice.js driveMouth), then
//     goes on. The story's own people (anyone a chapter places) are not Residents and stay exactly where they are put.
//   - Cost: only residents near the hero (or in view) are simulated every frame; the rest are stepped twice a second along
//     their route with no physics and no animation (a stand-in for "where they would be"), and a resident out of sight
//     is not drawn at all (the camera culls it, FarCull hides it far off).
// A resident's state is not saved: after a load every resident starts its round again at its first stop.
import * as THREE from 'three';
import { NPC, contactRadius } from './actors.js';
import { LOOKS } from './characters.js';
import { WalkNav } from './walknav.js';
import { mat } from '../engine/rig.js';
import { dampAngle, rng, clamp } from '../engine/math.js';

const DAY = 360;                       // seconds in a resident's "day": stops may keep to part of it (when: [from, to] of 0..1)
const FULL_R = 60, REDUCED_R = 110;    // metres: simulated every frame / a third of the frames; beyond (or out of view): abstract
const NEAR_R = 14;                     // metres: always simulated every frame, in view or not (it may be about to come round)
const hashId = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
const A = (x0, z0, x1, z1) => Math.atan2(x1 - x0, z1 - z0);

// ------------------------------------------------------------------ what a resident may carry
const CARRY = {
  basket: () => {
    const g = new THREE.Group();
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.115, 0.13, 10, 1, true), mat('#b88a4a', { side: THREE.DoubleSide }));
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.02, 10), mat('#8a6430'));
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.014, 5, 12, Math.PI), mat('#8a6430'));
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), mat('#d8c64a'));
    wick.position.y = -0.16; base.position.y = -0.22; arch.position.y = -0.1; fruit.position.set(0.02, -0.15, 0.01);
    g.add(wick, base, arch, fruit);
    return g;
  },
  crate: () => {
    const g = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.26, 0.3), mat('#a67a48'));
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.375, 0.05, 0.315), mat('#6a4a2a'));
    box.position.set(0, -0.2, 0.12); band.position.set(0, -0.2, 0.12);
    g.add(box, band);
    return g;
  },
  can: () => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.17, 10), mat('#5a8ab8', { metalness: 0.3 }));
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.024, 0.2, 6), mat('#5a8ab8', { metalness: 0.3 }));
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 5, 10, Math.PI), mat('#3a5a80'));
    body.position.y = -0.16; spout.position.set(0, -0.12, 0.17); spout.rotation.x = 1.0; arch.position.y = -0.08; arch.rotation.y = Math.PI / 2;
    g.add(body, spout, arch);
    return g;
  },
  sack: () => {
    const g = new THREE.Group();
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.17, 9, 7), mat('#c8b48a'));
    s.scale.set(1, 1.2, 0.9); s.position.set(0, -0.2, 0.05);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), mat('#a8946a')); knot.position.set(0, -0.02, 0.05);
    g.add(s, knot);
    return g;
  },
};

// ------------------------------------------------------------------ the manager (one per game)
export class Walkers {
  constructor(game) {
    this.game = game;
    this.res = [];
    this.nav = new WalkNav(game);
    this.nav.pathDist = game.world.pathDist;
    this.rounds = null;           // set by walkrounds.js
    this.pairs = new Map();
    this.stamp = -1; this.frozen = false; this.statics = [];
    this.frustum = new THREE.Frustum(); this._m = new THREE.Matrix4(); this._v = new THREE.Vector3();
    this.hero = { x: 0, z: 0, inside: false };
    this.dayT = 0;
    this.stats = { full: 0, reduced: 0, abstract: 0, ms: 0, frames: 0 };
    this.measure = false;         // (tests / the perf probe: time every resident's update)
    this.doors = (game.world.houses || []).filter((h) => h.door).map((h) => ({ x: h.door.x, z: h.door.z, r: 1.0 }));
    this.nav.keepOut = this.doors;
  }
  // the nearest doorway to a point (a house's own, and the story's: a resident does not stand in one)
  doorDist(x, z) {
    let d = 1e9;
    for (const o of this.doors) d = Math.min(d, Math.hypot(o.x - x, o.z - z) - o.r);
    return d;
  }
  add(r) { this.res.push(r); }
  // the doors a walker keeps out of (a doorway is for the one who goes through it)
  setKeepOut(list) { this.nav.keepOut = list; this.nav.cells.clear(); this.nav.cache.clear(); }
  // once a frame (the first resident to update asks)
  prep() {
    const g = this.game;
    if (this.stamp === g.time) return;
    this.stamp = g.time;
    this.dayT = ((g.time / DAY) % 1 + 1) % 1;
    const h = g.hero, R = g.room;
    this.hero.x = h.pos.x; this.hero.z = h.pos.z; this.hero.inside = !!R && !R.outdoor;
    this.frozen = g.state === 'cutscene' || g.state === 'cinematic' || g.state === 'cinematicEnd' || !!g.reveal?.on;
    // the camera's frustum (matrices as of the last drawn frame: a frame behind is fine for this)
    const cam = g.camera;
    cam.updateMatrixWorld();
    this._m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this._m);
    // the story's people near the hero: obstacles a resident walks round
    this.statics.length = 0;
    for (const n of g.npcs) {
      if (n.ambient || !n.present) continue;
      const dx = n.pos.x - h.pos.x, dz = n.pos.z - h.pos.z;
      if (dx * dx + dz * dz < 4900) this.statics.push(n);
    }
    // the story's people on Citadel (where they stand now): routes keep clear of them; the cast's make-up is part of a route's key
    if (g.time - (this._castT ?? -9) > 0.5) {   // (twice a second is plenty: they stand where they are put)
      this._castT = g.time;
      const soft = this.nav.soft; soft.length = 0; let sig = '';
      for (const n of g.npcs) if (!n.ambient && n.present && Math.abs(n.pos.x) < 300) { soft.push(n.pos); sig += Math.round(n.pos.x) + ',' + Math.round(n.pos.z) + ';'; }
      if (sig !== this.nav.sig) { this.nav.sig = sig; if (this.nav.cache.size > 300) this.nav.cache.clear(); }
    }
    this.nav.step(120);
  }
  inView(x, y, z, r = 1.6) { this._v.set(x, y + 0.9, z); return this.frustum.containsPoint(this._v) || this._sphere(r); }
  _sphere(r) { const s = _sph; s.center.copy(this._v); s.radius = r; return this.frustum.intersectsSphere(s); }
  tierOf(r) {
    if (this.force != null) return this.force;   // (tests: simulate every resident in full, wherever the hero is)
    const dx = r.pos.x - this.hero.x, dz = r.pos.z - this.hero.z, d = Math.hypot(dx, dz);
    if (this.hero.inside || d > REDUCED_R + 40) return 2;
    if (d < NEAR_R) return 0;
    if (!this.inView(r.pos.x, r.pos.y, r.pos.z)) return 2;
    return d < FULL_R ? 0 : d < REDUCED_R ? 1 : 2;
  }
  // can the camera not see this point (a place to put a stuck resident back on its way)?
  unseen(x, z, y) {
    const d = Math.hypot(x - this.hero.x, z - this.hero.z);
    if (this.hero.inside || d > 70) return true;
    return d > 6 && !this.inView(x, y, z, 2.2);
  }
  // the other bodies a walker keeps clear of: the hero and the story's people (statics), and the other residents
  others(self, out) {
    out.length = 0;
    const h = this.game.hero;
    out.push(h);
    for (const n of this.statics) out.push(n);
    for (const r of this.res) if (r !== self && r.present && !r.away && !r.inside) out.push(r);   // (one the story or a test took off the streets is not there)
    return out;
  }
  // a resident's pair mate meets it: both leave together
  pair(id) { let p = this.pairs.get(id); if (!p) this.pairs.set(id, (p = { ready: new Set(), until: 0, speaker: null, turnT: 0 })); return p; }
}
const _sph = new THREE.Sphere();

// ------------------------------------------------------------------ one resident
export class Resident extends NPC {
  constructor(game, def) {
    super(game, def);
    this.ambient = true;
    const W = (game.walkers ||= new Walkers(game));
    W.add(this);
    this.W = W;
    this.speed = def.speed || 1.1;
    const mesh = this.rig.mesh;
    if (def.tint && mesh?.material?.color) mesh.material.color.set(def.tint);
    if (def.scale) this.rig.root.scale.multiplyScalar(def.scale);
    this.bodyR = contactRadius(def.char, this.rig.root.scale.x);   // (its girth: the hero and the others keep out of it)
    this.rnd = rng(hashId(def.id));
    this.stops = [];
    this.ri = 0; this.st = 'dwell'; this.tmr = 0;
    this.path = null; this.wi = 0; this.job = null;
    this.carrying = null; this.carryMesh = null; this.walkFrom = { x: 0, z: 0 };
    this.vel = 0; this.gait = 0;
    this.engaged = false; this.hold = 0; this.yieldT = 0; this.yieldV = null;
    this.stuckT = 0; this.replans = 0; this.lastRescue = -99; this.rescues = 0;
    this.accA = 0; this.accB = 0; this.skipN = 0; this.tier = 2; this.noGate = 0;
    this.sit = null; this.inside = false; this.insideT = 0; this.away = null;
    this.log = [];               // the last few things it did (tests and debugging)
    if (def.round) this.setRound(def.round.map((s) => ({ ...s })), def.start || 0);
  }
  // the story gave the streets back: it starts its round again at the stop it was on
  reset() {
    this.engaged = false; this.inside = false; this.hold = 0; this.sit = null; this.path = null; this.job = null; this.insideT = 0;
    const s = this.stops[this.ri];
    this.slotAt(s); this.arrived(s, true);
    return { x: s.x, z: s.z, a: s.a ?? this.angle };
  }
  // the round is given once the world is ready (walkrounds.js); the resident starts part-way through its first stop
  setRound(stops, start = 0) {
    this.stops = stops;
    this.ri = start % stops.length;
    const s = this.stops[this.ri];
    for (let i = 0; i <= this.ri; i++) if (stops[i].carry !== undefined) this.carrySet(stops[i].carry);   // (what it holds at this point of its round)
    this.slotAt(s);
    this.tmr = s.dur ? s.dur[0] + (s.dur[1] - s.dur[0]) * this.rnd() * 0.8 : 4;
    this.st = 'dwell';
    this.arrived(s, true);
  }
  // its area was built (src/main.js addActors gave it its definition): it starts its round now
  placeAt(p) {
    if (this.def.round && !this.stops.length) { this.setRound(this.def.round.map((s) => ({ ...s })), this.def.start || 0); return; }
    super.placeAt(p);
  }
  note(s) { this.log.push(`${this.game.time.toFixed(1)} ${s}`); if (this.log.length > 24) this.log.shift(); }
  get stop() { return this.stops[this.ri]; }
  get here() { return this.pos; }

  // ---------------------------------------------------------------- stops
  // put it at a stop's slot (its standing place), facing as the stop says
  slotAt(s) {
    this.pos.set(s.x, this.game.physics.groundAt(s.x, s.z, this.groundHint(s.x, s.z)), s.z);
    this.angle = this.targetAngle = s.a ?? this.angle;
    this.vy = 0; this.onGround = true; this.sit = null;
    this.sync();
  }
  // the height to look for the ground from: the terrain's, or the level of a world whose ground is floor bricks (Zeelich)
  groundHint(x, z) { const L = this.W.nav.levelAt(x); return (L != null ? L : this.game.physics.terrain.heightAt(x, z)) + 0.3; }
  nextIndex(from) {
    const n = this.stops.length, day = this.W.dayT;
    for (let k = 1; k <= n; k++) {
      const i = (from + k) % n, s = this.stops[i];
      if (s.when && (day < s.when[0] || day > s.when[1])) continue;
      return i;
    }
    return (from + 1) % n;
  }
  // it has reached stop s (arrive at its slot): do what the stop says
  arrived(s, instant = false) {
    this.path = null; this.job = null; this.stuckT = 0; this.replans = 0; this.vel = 0;
    this.tmr = s.dur ? s.dur[0] + (s.dur[1] - s.dur[0]) * this.rnd() : 3;
    if (s.pair) { this.st = 'pairwait'; this.waitT = 0; this.W.pair(s.pair).ready.add(this.def.id); this.note('wait for ' + s.pair); return; }
    if (s.seat && this.canSit()) { this.sitDown(s, instant); return; }
    if (s.door) { this.st = 'knock'; this.tmr = instant ? 0.2 : 0.9; this.angle = this.targetAngle = s.a; return; }
    this.st = 'dwell';
    if (s.seat) this.targetAngle = s.seat.a;   // (one who cannot sit stands by the bench, looking where a sitter would)
    else if (s.a != null) this.targetAngle = s.a;
    this.note('at ' + (s.id || s.act));
  }
  leave() {
    const s = this.stop;
    // what it picks up here it carries on from here
    if (s.carry !== undefined) this.carrySet(s.carry);
    const i = this.nextIndex(this.ri), nxt = this.stops[i];
    this.ri = i;
    // (a leg from the stop's own slot is planned once for the whole session; from anywhere else it is planned afresh)
    const fromSlot = Math.hypot(s.x - this.pos.x, s.z - this.pos.z) < 1.0 && !s.slotless;
    this.planTo(nxt, fromSlot ? `${this.def.id}:${s.id}>${nxt.id}` : null);
  }
  planTo(s, key) {
    this.st = 'plan'; this.planT = 0;
    this.job = this.W.nav.request(this.pos, s, { key, prio: 1 });
    this.note('plan → ' + (s.id || s.act));
  }
  // ---------------------------------------------------------------- carrying
  carrySet(kind) {
    if (kind === this.carrying) return;
    if (this.carryMesh) { this.carryMesh.parent?.remove(this.carryMesh); this.carryMesh = null; }
    this.carrying = kind || null;
    if (!kind || !CARRY[kind]) return;
    const hand = this.rig.j?.armR?.hand;
    if (!hand) return;
    const m = CARRY[kind]();
    if (kind === 'sack') { m.position.set(0.0, 0.1, -0.02); }
    hand.add(m);
    this.carryMesh = m;
  }
  // ---------------------------------------------------------------- sitting
  // SOLID-NPC (the user, 29.10: a resident sat inside a bench, the body through the backrest, the legs through the seat).
  // The sitter is put on the bench's own seat: its bottom on the seat's top, its back in front of the backrest, its shins
  // in front of the seat's edge, facing away from the backrest. Where the bottom and the back of THIS body are in the sit
  // pose (a Grobo's hips are low and its belly wide, a Rabbibunny's legs long, a child small) is measured once per body
  // from the posed mesh (sitShape); the bench's shape is the seat's (walkrounds.js seatAt: BENCHES in town.js, island.js,
  // citydress.js, zeelich's). Its coat's back panel folds under it on the seat instead of hanging down through it.
  seatPose(s) {
    const seat = s.seat, sp = seat.spec || BENCH_RED, sh = this.sitShape(), sx = Math.sin(seat.a), sz = Math.cos(seat.a);
    // along the way it faces from the bench's middle: back clear of the backrest, shins clear of the seat's edge
    // (0.07 m clear of the backrest: hair hanging down the back swings with the head as it dozes and looks about)
    const zl = Math.max(sp.back + 0.07 - sh.back, sp.front + 0.015 - sh.shin);
    const y0 = this.game.physics.groundAt(s.x, s.z, this.groundHint(s.x, s.z));   // (the ground in front of the bench: the bench's own collider must not count)
    return { x: seat.x + sx * zl, z: seat.z + sz * zl, y0, y1: y0 + sp.seatY + 0.008 - sh.bottom };
  }
  // an Esmer's body is one robe from the shoulders to the ground (rig.robeLegs, no hips to bend): it cannot sit on a
  // bench without the robe going through the seat, so at a bench stop it stands by the bench instead
  canSit() { return LOOKS[this.def.char]?.race !== 'esmer'; }
  sitDown(s, instant) {
    this.st = 'sitin';
    const p = this.seatPose(s);
    this.sit = { from: { x: this.pos.x, z: this.pos.z }, to: { x: p.x, z: p.z }, t: 0, dur: instant ? 0.001 : 0.8, a: s.seat.a, ya: p.y0, yb: p.y1, y: p.y1, down: true };
    if (instant) this.angle = this.targetAngle = s.seat.a;
    this.note('sit');
  }
  standUp(s) {
    this.st = 'sitout';
    const y0 = this.game.physics.groundAt(s.x, s.z, this.groundHint(s.x, s.z));
    this.sit = { from: { x: this.pos.x, z: this.pos.z }, to: { x: s.x, z: s.z }, t: 0, dur: 0.8, a: s.a != null ? s.a : null, ya: this.pos.y, yb: y0, y: this.pos.y, down: false };
  }
  // the coat's back and side panels lie on the seat under it (the rig's sit pose leaves the back panel hanging straight
  // down from the waist, through the seat): after the rig's own pose, every frame it sits
  foldCoat() {
    const S = this.rig.j?.skirt;
    if (!S) return;
    S.B.rotation.x = -1.4; S.L.rotation.x = Math.min(S.L.rotation.x, -1.25); S.R.rotation.x = Math.min(S.R.rotation.x, -1.25);
  }
  // where this body's bottom, back and shins are in the sit pose, relative to its feet's point (metres, the way it faces
  // +z): measured once per body and size from the posed mesh, the rig put back as it was
  sitShape() {
    const key = this.def.char + '@' + this.rig.root.scale.x.toFixed(3);
    let sh = SIT_SHAPES.get(key);
    if (sh) return sh;
    const rig = this.rig, root = rig.root, j = rig.j, anim = rig.anim ?? 'idle';
    rig.play('sit'); for (let i = 0; i < 8; i++) rig.update(0.5, 0);
    this.foldCoat();
    root.updateMatrixWorld(true);
    const inv = _m4.copy(root.matrixWorld).invert(), sc = root.scale.x;
    const loc = (o) => o.getWorldPosition(_v1).applyMatrix4(inv).clone();
    const hip = loc(j.legL.hip), hip2 = loc(j.legR.hip), knee = loc(j.legL.knee);
    const legX = Math.max(Math.abs(hip.x), Math.abs(hip2.x));
    const pts = [];
    root.traverse((o) => {
      if (!o.isMesh || !o.visible || !o.geometry?.attributes?.position || o === this.carryMesh) return;
      let c = o; while (c && c !== root) { if (c === this.carryMesh) return; c = c.parent; }
      const pa = o.geometry.attributes.position, step = Math.max(1, Math.floor(pa.count / 2500));
      for (let i = 0; i < pa.count; i += step) { _v1.fromBufferAttribute(pa, i); if (o.isSkinnedMesh) o.applyBoneTransform(i, _v1); _v1.applyMatrix4(o.matrixWorld).applyMatrix4(inv); pts.push(_v1.x, _v1.y, _v1.z); }
    });
    // the bottom: the underside of the thighs (between the hips and the knees, over the legs)
    let bottom = 9;
    for (let i = 0; i < pts.length; i += 3) { const x = pts[i], y = pts[i + 1], z = pts[i + 2]; if (z > hip.z + 0.03 && z < knee.z - 0.1 && Math.abs(x) < legX + 0.12 && y > hip.y - 0.4) bottom = Math.min(bottom, y); }
    if (bottom > 8) bottom = hip.y - 0.1;
    // the back: the rearmost point from the seat up to the backrest's top (0.55 m over the seat)
    let back = 9, shin = 9, foot = 9;
    for (let i = 0; i < pts.length; i += 3) { const y = pts[i + 1], z = pts[i + 2]; if (y > bottom + 0.03 && y < bottom + 0.55 / sc) back = Math.min(back, z); if (y < bottom - 0.02 && z > hip.z) shin = Math.min(shin, z); foot = Math.min(foot, y); }
    if (back > 8) back = hip.z - 0.15;
    if (shin > 8) shin = knee.z - 0.08;
    sh = { bottom: bottom * sc, back: back * sc, shin: shin * sc, foot: foot * sc, knee: knee.z * sc };
    SIT_SHAPES.set(key, sh);
    rig.play(anim); for (let i = 0; i < 8; i++) rig.update(0.5, 0);
    return sh;
  }
  // ---------------------------------------------------------------- talking with the player (src/game/story/citizens.js)
  engage() { this.engaged = true; this.hold = 0; this.stuckT = 0; this.vel = 0; this.gait = 0; this.yieldT = 0; this.note('talk'); }
  release() { this.engaged = false; this.hold = 0.7; }
  // SOLID-NPC: the hero walks on into it (Hero.keepApart): it steps out of his way, to the side of his line it already
  // stands on and a little back, at a walk, through the physics (never into a wall or off its ground); seated, talking,
  // at its door or indoors it stays where it is
  giveWay(hx, hz, vx, vz) {
    if (this.engaged || this.sit || this.inside || this.away || this.st === 'knock' || this.st === 'seated') return;
    if (this.yieldT > 0.2) return;
    const dx = this.pos.x - hx, dz = this.pos.z - hz, d = Math.hypot(dx, dz) || 1, v = Math.hypot(vx, vz) || 1;
    const ux = vx / v, uz = vz / v, side = Math.sign(ux * dz - uz * dx) || (this.rnd() < 0.5 ? -1 : 1);
    let yx = -uz * side * 0.85 + (dx / d) * 0.35, yz = ux * side * 0.85 + (dz / d) * 0.35;
    const l = Math.hypot(yx, yz) || 1; yx /= l; yz /= l;
    this.yieldV = { x: yx, z: yz }; this.yieldT = 0.8;
    this.note('gives way');
  }
  yieldTick(dt) {
    this.yieldT -= dt;
    const P = this.game.physics, x0 = this.pos.x, z0 = this.pos.z, sp = Math.max(0.9, this.speed);
    this.moveClear(this.yieldV.x * sp * dt, this.yieldV.z * sp * dt, this.W.others(this, _others));
    P.fall(this, dt);
    this.angle = dampAngle(this.angle, Math.atan2(this.yieldV.x, this.yieldV.z), 6, dt);
    const v = dt > 0 ? Math.hypot(this.pos.x - x0, this.pos.z - z0) / dt : 0;
    this.gait += (v - this.gait) * Math.min(1, dt * 8);
    this.animate(this.gait > 0.12 ? 'walk' : 'idle', dt, this.gait > 0.12 ? this.gait : 0);
  }

  // ---------------------------------------------------------------- the frame
  update(dt) {
    const W = this.W;
    if (W.measure) { const t0 = performance.now(); this._update(dt); W.stats.ms += performance.now() - t0; return; }
    this._update(dt);
  }
  _update(dt) {
    const W = this.W;
    W.prep();
    if (this.away || W.frozen || !this.stops.length) return;   // (no round yet: its area is not built)
    if (this.engaged) { this.engagedTick(dt); return; }
    const tier = W.tierOf(this);
    if (tier !== this.tier) { if (this.tier === 2) this.wake(); this.tier = tier; }
    if (tier === 2) {
      this.accA += dt;
      if (this.accA < 0.5) return;
      const d = this.accA; this.accA = 0;
      W.stats.abstract++;
      this.abstractTick(d);
      return;
    }
    if (tier === 1) {
      this.accB += dt;
      if (++this.skipN % 3 !== 0) return;
      dt = this.accB; this.accB = 0;
      W.stats.reduced++;
    } else W.stats.full++;
    this.tick(dt, tier);
  }
  // leaving the abstract state: stand on the ground it is over
  wake() {
    if (this.sit) this.pos.y = this.st === 'sitout' ? this.sit.yb : this.sit.y;   // (seated: on the seat)
    else if (!this.inside) this.pos.y = this.game.physics.groundAt(this.pos.x, this.pos.z, this.groundHint(this.pos.x, this.pos.z));
    this.vy = 0; this.onGround = true;
    this.sync();
  }
  // being talked to: stop, turn to him, and the talk animation when it is the one speaking
  engagedTick(dt) {
    const h = this.game.hero;
    if (this.st !== 'sitin' && this.st !== 'seated') this.angle = dampAngle(this.angle, this.angleTo(h), 6, dt);
    const seated = this.st === 'seated' || this.st === 'sitin';
    this.rig.play(seated ? 'sit' : this.talking ? 'talk' : 'idle');
    this.rig.update(dt, 0);
    if (seated) this.foldCoat();
    this.placeCarry(seated);
    this.sync();
  }

  // ---------------------------------------------------------------- the simulation (tier 0 and 1)
  tick(dt, tier) {
    const g = this.game, P = g.physics, W = this.W, s = this.stop;
    if (this.yieldT > 0 && !this.sit) { this.yieldTick(dt); return; }
    if (this.hold > 0) { this.hold -= dt; this.animate('idle', dt, 0); return; }
    if (this.st !== 'walk') this.separate(dt);
    switch (this.st) {
      case 'dwell': return this.dwellTick(dt, s);
      case 'pairwait': return this.pairTick(dt, s);
      case 'chat': return this.chatTick(dt, s);
      case 'knock': return this.knockTick(dt, s);
      case 'inside': return this.insideTick(dt, s);
      case 'sitin': case 'sitout': return this.sitTick(dt, s);
      case 'seated': return this.seatedTick(dt, s);
      case 'plan': return this.planTick(dt, s);
      case 'walk': return this.walkTick(dt, tier);
      default: this.st = 'dwell';
    }
  }
  // the pose for a stop's act
  actAnim(s) {
    switch (s.act) {
      case 'tend': return 'kneelWork';
      case 'water': return 'potting';
      case 'draw': return 'reach';
      case 'browse': return 'tinker';
      case 'rest': return 'wipe';
      case 'put': return 'setDown';
      case 'knock': return 'tapTurn';
      case 'dip': return 'touchWater';
      default: return 'idle';
    }
  }
  animate(anim, dt, speed) {
    this.rig.play(anim);
    this.rig.update(dt, speed);
    if (anim === 'sit') this.foldCoat();
    this.placeCarry(anim === 'sit');
    this.sync();
  }
  // what it carries is set down on the seat beside it while it sits (held, it would hang through the bench), and taken up
  // again as it stands
  placeCarry(seated) {
    const m = this.carryMesh;
    if (!m) return;
    const root = this.rig.root, hand = this.rig.j?.armR?.hand;
    if (seated && m.parent !== root) {
      const sh = this.sitShape(), sc = root.scale.x, drop = CARRY_DROP[this.carrying] ?? 0.25;
      root.add(m); m.position.set(-Math.max(0.45, (this.bodyR || 0.45) + 0.1) / sc, sh.bottom / sc + drop, (sh.back + 0.22) / sc); m.rotation.set(0, 0, 0);
    } else if (!seated && hand && m.parent !== hand) {
      hand.add(m); m.position.set(0, this.carrying === 'sack' ? 0.1 : 0, this.carrying === 'sack' ? -0.02 : 0);
    }
  }
  dwellTick(dt, s) {
    const h = this.game.hero;
    // it turns to whoever comes close (as the story's own people do), else to what the stop looks at
    const dh = this.distTo(h);
    if (dh < 3.0 && !s.act?.match(/tend|water|draw/)) this.angle = dampAngle(this.angle, this.angleTo(h), 4, dt);
    else if (this.targetAngle != null) this.angle = dampAngle(this.angle, this.targetAngle, 4, dt);
    // in the way of a door or of someone the story put here: move on soon
    this.tmr -= dt;
    this.keepClear(dt, s);
    if (this.tmr <= 0) this.leave();
    this.animate(this.actAnim(s), dt, 0);
  }
  // a pair meets: each waits for the other, then they talk (the one who sees the other waiting starts it; the other joins)
  pairTick(dt, s) {
    const P = this.W.pair(s.pair), mate = this.W.res.find((r) => r.def.id === s.mate);
    this.waitT += dt;
    this.angle = dampAngle(this.angle, mate ? this.angleTo(mate) : this.targetAngle ?? this.angle, 5, dt);
    if (mate?.st === 'chat' && P.until > this.game.time) { this.st = 'chat'; this.chatInit(s); }
    else if (mate && mate.st === 'pairwait') {
      P.until = this.game.time + this.tmr; P.speaker = this.def.id; P.turnT = 1.5 + this.rnd() * 2;
      this.st = 'chat'; this.chatInit(s);
    } else if (this.waitT > 45) { P.ready.delete(this.def.id); this.note('mate never came'); this.leave(); return; }
    this.animate('idle', dt, 0);
  }
  chatInit(s) { this.W.pair(s.pair).ready.delete(this.def.id); this.chatT = 0; this.gestT = 1 + this.rnd() * 2; }
  chatTick(dt, s) {
    const g = this.game, P = this.W.pair(s.pair), mate = this.W.res.find((r) => r.def.id === s.mate);
    this.angle = dampAngle(this.angle, mate ? this.angleTo(mate) : this.angle, 5, dt);
    const mine = P.speaker === this.def.id;
    if (mine) {
      P.turnT -= dt;
      if (P.turnT <= 0) { P.speaker = s.mate; P.turnT = 2.2 + this.rnd() * 2.6; }
    }
    // the speaker talks (the talk pose gestures; the mouth opens and closes in words and breaths), the other listens and nods
    this.chatT += dt;
    if (mine) {
      const w = Math.sin(this.chatT * 13.1) * Math.sin(this.chatT * 7.3 + 1.2), breath = Math.sin(this.chatT * 2.3) > -0.35 ? 1 : 0.15;
      this.rig.speakMouth(clamp(0.3 + 0.6 * Math.abs(w), 0, 1) * breath, 0.3 * Math.sin(this.chatT * 5));
      this.animate('talk', dt, 0);
    } else {
      this.gestT -= dt;
      if (this.gestT <= 0) { this.rig.doGesture(this.rnd() < 0.7 ? 'nod' : 'shrug'); this.gestT = 2 + this.rnd() * 3; }
      this.animate('listen', dt, 0);
    }
    if (g.time >= P.until) { this.note('chat over'); this.leave(); }
  }
  knockTick(dt, s) {
    // at its own door: a hand to the latch, a step in, gone for a while
    this.tmr -= dt;
    if (this.tmr > 0.5 || s.act === 'noknock') this.animate('tapTurn', dt, 0);
    else {
      const k = 1 - this.tmr / 0.5, step = dt * 1.1;
      this.pos.x += Math.sin(this.angle) * step; this.pos.z += Math.cos(this.angle) * step;
      this.animate('walk', dt, 1.1);
    }
    if (this.tmr <= 0) this.goInside(s);
  }
  goInside(s) {
    this.inside = true; this.insideT = s.dur ? s.dur[0] + (s.dur[1] - s.dur[0]) * this.rnd() : 10; this.st = 'inside';
    this.setPresent(false);
    this.note('in');
  }
  insideTick(dt, s) {
    this.insideT -= dt;
    if (this.insideT > 0) return;
    // it comes out where it went in (the front of its door), a moment's pause, and on
    this.inside = false; this.setPresent(true);
    this.placeAtSlot(s);
    this.st = 'dwell'; this.tmr = 1.2; this.targetAngle = null;
    this.note('out');
  }
  placeAtSlot(s) {
    this.pos.set(s.x, this.game.physics.groundAt(s.x, s.z, this.groundHint(s.x, s.z)), s.z);
    this.angle = s.a + Math.PI; this.targetAngle = null; this.sync();
  }
  sitTick(dt, s) {
    const S = this.sit; S.t += dt;
    const k = clamp(S.t / S.dur, 0, 1), e = k * k * (3 - 2 * k);
    const st = this.st;
    if (S.a != null) this.angle = dampAngle(this.angle, S.a, 7, dt);
    // onto the seat (its height, SOLID-NPC: seatPose) as the sit pose comes in, off it as the stand comes
    const a = S.from, b = S.to;
    this.pos.x = a.x + (b.x - a.x) * e; this.pos.z = a.z + (b.z - a.z) * e;
    const ky = S.down ? clamp((k - 0.3) / 0.7, 0, 1) : clamp(k / 0.6, 0, 1), ey = ky * ky * (3 - 2 * ky);
    this.pos.y = S.ya + (S.yb - S.ya) * ey;
    if (st === 'sitin') this.animate(k > 0.35 ? 'sit' : 'idle', dt, 0);
    else this.animate(k < 0.55 ? 'sit' : 'idle', dt, 0);
    if (k >= 1) {
      if (st === 'sitin') { this.st = 'seated'; this.note('seated'); }
      else { this.sit = null; this.arrivedAfterStand(); }
    }
  }
  seatedTick(dt, s) {
    this.tmr -= dt;
    this.animate('sit', dt, 0);
    if (this.tmr <= 0) this.standUp(s);
  }
  arrivedAfterStand() {
    this.angle = this.targetAngle = this.angle;
    this.st = 'dwell'; this.tmr = 0;   // (straight on: the sitting was the stop)
    this.leave();
  }
  // a door or one of the story's people it is standing close to for too long
  keepClear(dt, s) {
    if (s.seat || s.door) return;
    const W = this.W; let near = W.doorDist(this.pos.x, this.pos.z) < 0.9;
    for (const n of W.statics) if (!near && Math.hypot(n.pos.x - this.pos.x, n.pos.z - this.pos.z) < 1.0) { near = true; break; }
    if (near) { this.clearT = (this.clearT || 0) + dt; if (this.clearT > 5) { this.clearT = 0; this.tmr = Math.min(this.tmr, 0); this.note('made room'); } } else this.clearT = 0;
  }

  // ---------------------------------------------------------------- planning and walking
  planTick(dt, s) {
    this.planT += dt;
    this.angle = dampAngle(this.angle, this.targetAngle ?? this.angle, 3, dt);
    this.animate('idle', dt, 0);
    const j = this.job;
    if (!j || !j.done) { if (this.planT > 40) { this.note('plan timed out'); this.arrivedElsewhere(); } return; }
    if (!j.ok || !j.pts || j.pts.length < 1) { this.noRoute(); return; }
    this.startWalk(j.pts);
  }
  noRoute() {
    this.noPath = (this.noPath || 0) + 1;
    this.note('no route to ' + (this.stop.id || '?'));
    if (this.noPath >= 2) { this.noPath = 0; this.arrivedElsewhere(); return; }
    this.planTo(this.stop, null);
  }
  // it cannot get to the stop: it stays where it is and has its stop's time here instead, then goes on with the round
  arrivedElsewhere() {
    const s = this.stop;
    this.st = 'dwell'; this.tmr = 2 + this.rnd() * 3; this.stops[this.ri] = { ...s, seat: null, door: null, pair: null, act: 'idle', _gave: true, slotless: true };
    this.path = null; this.job = null;
  }
  startWalk(pts) {
    this.path = pts; this.wi = 0; this.walkFrom = { x: this.pos.x, z: this.pos.z };
    // (the first point is the cell it started in: skip it when it is behind)
    if (pts.length > 1 && Math.hypot(pts[0].x - this.pos.x, pts[0].z - this.pos.z) < 0.9) this.wi = 1;
    this.st = 'walk'; this.stuckT = 0; this.noPath = 0; this.lastPos = { x: this.pos.x, z: this.pos.z, t: this.game.time }; this.waitT = 0;
  }
  // along the path to the stop's slot, round whoever is in the way
  walkTick(dt, tier) {
    const g = this.game, P = g.physics, W = this.W, s = this.stop, path = this.path;
    if (!path) { this.st = 'dwell'; return; }
    while (this.wi < path.length - 1 && Math.hypot(path[this.wi].x - this.pos.x, path[this.wi].z - this.pos.z) < 0.55) this.wi++;
    const last = this.wi >= path.length - 1;
    const bx = last ? s.x : path[this.wi].x, bz = last ? s.z : path[this.wi].z;
    const gx = bx - this.pos.x, gz = bz - this.pos.z, d = Math.hypot(gx, gz);
    if (last && d < 0.35) { this.arrived(s); return; }
    // it steers for a point a little way ahead on the route's own line (not for the corner itself): after a sidestep round
    // someone it comes back to the line the route was checked along, instead of cutting across whatever lies between
    const ax0 = this.wi > 0 ? path[this.wi - 1].x : this.walkFrom.x, az0 = this.wi > 0 ? path[this.wi - 1].z : this.walkFrom.z;
    const sdx = bx - ax0, sdz = bz - az0, sL = Math.hypot(sdx, sdz) || 1;
    const kk = clamp(((this.pos.x - ax0) * sdx + (this.pos.z - az0) * sdz) / (sL * sL), 0, 1);
    const look = Math.min(sL, kk * sL + 1.4) / sL;
    const tx = ax0 + sdx * look, tz = az0 + sdz * look;
    let dx = tx - this.pos.x, dz = tz - this.pos.z, dl = Math.hypot(dx, dz);
    if (dl < 0.05) { dx = gx; dz = gz; dl = Math.max(d, 1e-4); }
    const ux = dx / dl, uz = dz / dl;
    // ------------------------------------------------ avoidance: the right-hand rule (everyone sidesteps the same way, so
    // two who meet head on pass), room round everyone, slow or wait when someone stands in the way
    let ax = 0, az = 0, slow = 1, blocked = false;
    for (const b of W.others(this, _others)) {
      const rx = this.pos.x - b.pos.x, rz = this.pos.z - b.pos.z, dd = Math.hypot(rx, rz);
      const rr = (this.bodyR || 0.45) + (b.bodyR ?? b.radius ?? 0.45) + (b.isHero ? 0.75 : b.ambient ? 0.35 : 0.8), reachD = rr + 1.1;
      if (dd > reachD || dd < 1e-3) continue;
      const w = (reachD - dd) / reachD, ahead = (-rx * ux - rz * uz) / dd;   // > 0: in front of it
      if (ahead > 0.1) {
        ax += -uz * w * 1.7; az += ux * w * 1.7;
        const gap = dd - rr;
        // (the hero and the story's people it waits for; another resident standing about it just steps round, slowly)
        if (ahead > 0.55 && gap < 1.0) { slow = Math.min(slow, Math.max(b.ambient ? 0.45 : 0, clamp(gap / 1.0, 0.0, 1))); if (gap < 0.3 && !b.ambient) blocked = true; }
      }
      ax += (rx / dd) * w * 0.9; az += (rz / dd) * w * 0.9;
    }
    let vx = ux + ax, vz = uz + az;
    const vl = Math.hypot(vx, vz) || 1; vx /= vl; vz /= vl;
    // never into someone's reach: the hero's and the story's people (they stand where they are put), and never into another resident (SOLID-NPC); no component of the
    // move goes toward them inside 1.15 m, and inside 0.95 m it steps back
    for (const b of _others) {
      const rx = this.pos.x - b.pos.x, rz = this.pos.z - b.pos.z, dd = Math.hypot(rx, rz), hard = (this.bodyR || 0.45) + (b.bodyR ?? b.radius ?? 0.45) + (b.ambient ? 0.05 : 0.3);
      if (dd >= hard || dd < 1e-3) continue;
      const nx = rx / dd, nz = rz / dd, into = -(vx * nx + vz * nz);
      if (into > 0) { vx += nx * into; vz += nz * into; }
      if (dd < hard - 0.15) { vx += nx * 0.7; vz += nz * 0.7; }
    }
    let sp = this.speed * slow * (last ? clamp(d / 1.2, 0.35, 1) : 1);
    if (blocked) { this.waitT += dt; if (this.waitT > 3) sp = Math.max(sp, this.speed * 0.45); }   // (it eases round after a while)
    else this.waitT = Math.max(0, this.waitT - dt);
    this.vel += (sp - this.vel) * Math.min(1, dt * 4);
    // ------------------------------------------------ move by the game's own collision rules
    const x0 = this.pos.x, z0 = this.pos.z, want = Math.atan2(vx, vz);
    this.angle = dampAngle(this.angle, want, 7, dt);
    const dAng = Math.abs(Math.atan2(Math.sin(want - this.angle), Math.cos(want - this.angle)));
    const align = Math.max(0.15, Math.cos(Math.min(1.4, dAng)));
    const step = this.vel * dt * align;
    if (step > 1e-4) this.moveClear(Math.sin(this.angle) * step, Math.cos(this.angle) * step, _others);
    P.fall(this, dt);
    const v = dt > 0 ? Math.hypot(this.pos.x - x0, this.pos.z - z0) / dt : 0;
    this.gait += (v - this.gait) * Math.min(1, dt * 8);
    this.animate(this.gait > 0.12 ? 'walk' : 'idle', dt, this.gait > 0.12 ? this.gait : 0);
    if (this.W.measure) this.dbg = { slow: +slow.toFixed(2), blocked, sp: +sp.toFixed(2), v: +v.toFixed(2), d: +d.toFixed(2), wi: this.wi, n: path.length, stuck: +this.stuckT.toFixed(1), vel: +this.vel.toFixed(2) };   // (tests: what it was doing)
    // ------------------------------------------------ stuck: it wants to go and does not get anywhere
    if (sp > 0.3 * this.speed && v < 0.25 * sp && !blocked) this.stuckT += dt; else this.stuckT = Math.max(0, this.stuckT - dt * 0.5);
    if (this.stuckT > 1.4) this.unstick();
  }
  // SOLID-NPC: a step by the physics that never takes it into anyone's body (the hero's, the story's people's, another
  // resident's: the two girths, bodyR): the part of the step toward someone it touches is dropped (it slides round
  // them), and a step that still ends inside someone, closer than it was, is not taken
  moveClear(dx, dz, others) {
    const P = this.game.physics, x0 = this.pos.x, z0 = this.pos.z, me = this.bodyR || 0.45;
    for (const b of others) {
      const R = me + (b.isHero ? b.radius : (b.bodyR ?? b.radius ?? 0.45)), rx = x0 - b.pos.x, rz = z0 - b.pos.z, d = Math.hypot(rx, rz);
      if (d >= R + Math.hypot(dx, dz) + 0.02 || d < 1e-4) continue;
      const nx = rx / d, nz = rz / d, into = -(dx * nx + dz * nz);
      if (into > 0 && d < R + into + 0.02) { dx += nx * into; dz += nz * into; }
    }
    P.move(this, dx, dz);
    for (const b of others) {
      const R = me + (b.isHero ? b.radius : (b.bodyR ?? b.radius ?? 0.45));
      const d1 = Math.hypot(this.pos.x - b.pos.x, this.pos.z - b.pos.z), d0 = Math.hypot(x0 - b.pos.x, z0 - b.pos.z);
      if (d1 < R - 0.01 && d1 < d0 - 1e-4) { this.pos.x = x0; this.pos.z = z0; return; }
    }
  }
  // standing about (not seated, not walking: a stop, a chat, a wait), it steps out of another resident it overlaps, at a
  // shuffle (two whose stops lie close stand side by side, not inside each other); through the physics
  separate(dt) {
    if (this.sit || this.inside || this.engaged) return;
    const me = this.bodyR || 0.45;
    let px = 0, pz = 0;
    for (const r of this.W.res) {
      if (r === this || !r.present || r.inside || r.away) continue;
      const R = me + (r.bodyR || 0.45), rx = this.pos.x - r.pos.x, rz = this.pos.z - r.pos.z;
      if (Math.abs(rx) >= R || Math.abs(rz) >= R) continue;
      const d = Math.hypot(rx, rz);
      if (d >= R) continue;
      // (both step apart, half each; from one who is seated it steps the whole way)
      const k = r.sit ? 1 : 0.5;
      if (d < 1e-3) { const a = this.rnd() * 6.283; px += Math.sin(a) * R * k; pz += Math.cos(a) * R * k; } else { px += (rx / d) * (R - d) * k; pz += (rz / d) * (R - d) * k; }
    }
    const l = Math.hypot(px, pz);
    if (l < 1e-3) return;
    const m = Math.min(l, 0.8 * dt);
    this.game.physics.move(this, (px / l) * m, (pz / l) * m);
  }
  unstick() {
    const g = this.game, W = this.W;
    this.stuckT = 0;
    this.replans++;
    this.note(`stuck at ${this.pos.x.toFixed(1)},${this.pos.z.toFixed(1)} (replan ${this.replans})`);
    const s = this.stop;
    if (this.replans <= 2) {   // plan again from here
      this.planTo(s, null);
      return;
    }
    // out of sight: put it further along its way (or at the stop), no one sees it
    if (W.unseen(this.pos.x, this.pos.z, this.pos.y)) {
      const path = this.path;
      let q = null;
      if (path) for (let i = this.wi; i < path.length; i++) { if (Math.hypot(path[i].x - this.pos.x, path[i].z - this.pos.z) > 2.5) { q = path[i]; break; } }
      q ||= s;
      if (W.unseen(q.x, q.z, this.pos.y) || this.replans > 4) {
        this.pos.set(q.x, g.physics.groundAt(q.x, q.z, this.groundHint(q.x, q.z)), q.z);
        this.sync();
        this.rescues++; this.note(`put on its way at ${q.x.toFixed(1)},${q.z.toFixed(1)}`);
        this.replans = 0;
        this.planTo(s, null);
        return;
      }
    }
    // in view: wait a while and try again; in the end give the stop up
    if (this.replans > 7) { this.note('gave the stop up'); this.replans = 0; this.arrivedElsewhere(); return; }
    this.planTo(s, null);
  }

  // ---------------------------------------------------------------- the abstract state (out of view or far off)
  abstractTick(dt) {
    const s = this.stop;
    switch (this.st) {
      case 'plan': {
        const j = this.job;
        if (!j || !j.done) { this.planT += dt; if (this.planT > 40) this.arrivedElsewhere(); return; }
        if (!j.ok || !j.pts) { this.noRoute(); return; }
        this.startWalk(j.pts); return;
      }
      case 'walk': {
        let left = this.speed * dt, path = this.path;
        if (!path) { this.st = 'dwell'; return; }
        while (left > 0 && this.wi < path.length) {
          const wp = path[this.wi], dx = wp.x - this.pos.x, dz = wp.z - this.pos.z, d = Math.hypot(dx, dz);
          if (d <= left) { this.pos.x = wp.x; this.pos.z = wp.z; left -= d; this.wi++; }
          else { this.pos.x += dx / d * left; this.pos.z += dz / d * left; this.angle = Math.atan2(dx, dz); left = 0; }
        }
        if (this.wi >= path.length) {
          this.pos.x = s.x; this.pos.z = s.z;
          this.arrived(s, true);
          if (this.st === 'sitin') { this.pos.x = this.sit.to.x; this.pos.z = this.sit.to.z; this.pos.y = this.sit.y; this.st = 'seated'; }
          if (this.st === 'knock') this.goInside(s);
        }
        return;
      }
      case 'dwell': this.tmr -= dt; if (this.tmr <= 0) this.leave(); return;
      case 'seated': this.tmr -= dt; if (this.tmr <= 0) { this.sit = null; this.pos.x = s.x; this.pos.z = s.z; this.st = 'dwell'; this.tmr = 0; this.leave(); } return;
      case 'sitin': this.st = 'seated'; return;
      case 'sitout': this.sit = null; this.st = 'dwell'; this.tmr = 0; this.leave(); return;
      case 'knock': this.goInside(s); return;
      case 'inside': this.insideTick(dt, s); return;
      case 'pairwait': {
        const P = this.W.pair(s.pair), mate = this.W.res.find((r) => r.def.id === s.mate);
        this.waitT += dt;
        if (mate && (mate.st === 'pairwait' || mate.st === 'chat')) { if (mate.st === 'pairwait') { P.until = this.game.time + this.tmr; P.speaker = this.def.id; } this.st = 'chat'; this.chatInit(s); this.chatEnd = P.until; }
        else if (this.waitT > 45) { P.ready.delete(this.def.id); this.leave(); }
        return;
      }
      case 'chat': { const P = this.W.pair(s.pair); if (this.game.time >= P.until) this.leave(); return; }
      default: this.st = 'dwell';
    }
  }
}
const _others = [];
const CARRY_DROP = { basket: 0.235, crate: 0.335, can: 0.25, sack: 0.37 };   // (from the item's hand point down to its base)
const SIT_SHAPES = new Map(), _m4 = new THREE.Matrix4(), _v1 = new THREE.Vector3();
// the red slatted bench (town.js, island.js): the seat's top over its feet, the backrest's front face and the seat's
// front edge along the way the sitter faces (m, from the bench's middle); other benches give their own (seat.spec)
export const BENCH_RED = { seatY: 0.485, back: -0.25, front: 0.225 };
