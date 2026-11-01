// TOWN-LIFE-3: the harbour's two regulars at something while nobody needs them (the rule TOWN-LIFE-2 keeps for Odile's
// counter and walkers.js for Pippa's stall: only their pose, the way they face and what they hold; only at their own place;
// they are the story's again, turned back, as soon as Twinsen comes within a few metres or anyone speaks to them).
//   - Doran fishes off the quay by his shed, over the rail: the rod out over the water, the float bobbing; now and then a
//     bite, the strike, and a fish swung up into his bucket (or nothing, and a shrug); then a new cast. His rod leans on the
//     shed wall while he is busy with Twinsen, and is out again after. Not while he naps (the prologue, before the bell).
//   - Xil, waiting on the pier, keeps his ledger: writing, and now and then a look out over the water and a sigh.
// Off in the evacuation (chapter 8: the town is packing). Nothing is saved; after a load the bucket starts empty.
// Cost: one rod, one line, one float, one fish, the bucket (its fish one instanced draw), a ledger and a pencil: the rod's
// frame is worked out only while Doran fishes within 45 m of Twinsen.
import * as THREE from 'three';
import { dampAngle, clamp } from '../engine/math.js';
import { part, merge, M4, MATL } from './gulls.js';

const BUSY_R = 5.0, ACTIVE_R = 45;
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _q = new THREE.Quaternion(), _up = new THREE.Vector3(0, 1, 0), _m = new THREE.Matrix4();

const fishGeo = () => merge([
  part(new THREE.SphereGeometry(0.06, 8, 6), '#9ab4c8', M4(0, 0, 0, 0, 0, 0, 0.55, 0.8, 1.9)),
  part(new THREE.ConeGeometry(0.05, 0.08, 4), '#7890a4', M4(0, 0, -0.13, -Math.PI / 2, 0, 0, 1, 1, 0.4)),
  part(new THREE.SphereGeometry(0.012, 5, 4), '#1a1a1a', M4(0.028, 0.012, 0.07)),
]);

export class HarbourLife {
  constructor(game, busy, parent) {
    this.game = game; this.busy = busy;
    const W = game.world, P = game.physics, ps = W.pierStart;
    this.log = []; this.count = { catches: 0, misses: 0, casts: 0, ledger: 0 };
    this.doran = null; this.xil = null;
    if (!ps) return;
    // Doran's place (prologue.js, chapter1.js: by his shed at the pier's foot) and where he fishes from it: west, over the rail
    const S = (this.spot = { x: ps.x, z: ps.z + 2.2, a: Math.PI, fish: -Math.PI / 2 });
    const y0 = P.groundAt(S.x, S.z, 3);
    this.y0 = y0;
    const g = (this.group = new THREE.Group()); g.name = 'harbourlife'; parent.add(g);
    // the rod (built along +y from its butt), the line, the float, the fish on the line
    this.rod = new THREE.Mesh(merge([
      part(new THREE.CylinderGeometry(0.012, 0.03, 3.2, 6), '#6a4a2a', M4(0, 1.6, 0)),
      part(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), '#2a2a2a', M4(0, 0.35, 0)),
      part(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 8), '#b8b8b0', M4(0.04, 0.55, 0, 0, 0, Math.PI / 2)),
    ]), MATL);
    this.rod.name = 'doranRod'; this.rod.castShadow = true;
    g.add(this.rod);
    // (the line: a thread from the float up to the rod's tip, a unit-long thin cylinder stretched each frame; the town's
    //  own material, so no new shader program the first time he casts)
    this.line = new THREE.Mesh(part(new THREE.CylinderGeometry(0.006, 0.006, 1, 4).translate(0, 0.5, 0), '#e4e4dc'), MATL); this.line.name = 'doranLine';
    g.add(this.line);
    this.float = new THREE.Mesh(merge([part(new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#d83a2a'), part(new THREE.SphereGeometry(0.05, 8, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#f0f0e8')]), MATL);
    this.float.name = 'doranFloat'; g.add(this.float);
    this.fish = new THREE.Mesh(fishGeo(), MATL); this.fish.name = 'doranFish'; this.fish.visible = false; g.add(this.fish);
    // the bucket by the shed's corner, west of him (a low solid: you cannot walk through it); its catch one instanced draw
    const B = (this.bucket = { x: S.x - 1.05, z: S.z + 0.62, n: 0 });
    const by = P.groundAt(B.x, B.z, y0 + 1);
    const pail = new THREE.Mesh(merge([
      part(new THREE.CylinderGeometry(0.17, 0.13, 0.28, 10, 1, true), '#7a8a96', M4(0, 0.14, 0)),
      part(new THREE.CylinderGeometry(0.165, 0.125, 0.27, 10, 1, true).scale(-1, 1, 1), '#5a6a76', M4(0, 0.145, 0)),   // (its inside)
      part(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 10), '#5a6a76', M4(0, 0.01, 0)),
      part(new THREE.CylinderGeometry(0.15, 0.15, 0.01, 10), '#3a5a7a', M4(0, 0.2, 0)),   // (water in it)
      part(new THREE.TorusGeometry(0.17, 0.008, 4, 12, Math.PI), '#4a4a4a', M4(0, 0.28, 0, 0, 0, 0)),
    ]), MATL);
    pail.position.set(B.x, by, B.z); pail.name = 'doranBucket'; pail.castShadow = true;
    g.add(pail);
    this.inBucket = new THREE.InstancedMesh(fishGeo(), MATL, 3); this.inBucket.name = 'bucketFish';
    for (let i = 0; i < 3; i++) this.inBucket.setMatrixAt(i, M4(B.x + [-0.05, 0.06, 0][i], by + 0.24 + i * 0.012, B.z + [0.03, -0.02, 0.07][i], -1.2 + i * 0.3, i * 2.1, 0.3));
    this.inBucket.count = 0; g.add(this.inBucket);
    P.add({ type: 'cyl', x: B.x, z: B.z, r: 0.2, top: by + 0.3, seeThrough: true, block: true });
    // where the rod leans while he is busy: against the shed's south wall, east of the bucket
    this.rest = { x: S.x - 0.3, z: S.z + 0.75, y: P.groundAt(S.x - 0.3, S.z + 0.75, y0 + 1) };
    this.f = { st: 'rest', t: 0, wait: 6, bob: 0, cast: 0, n: 0 };
    this.rodRest();
    // Xil's ledger and pencil (in his hands while he writes)
    this.ledger = new THREE.Mesh(merge([
      part(new THREE.BoxGeometry(0.19, 0.022, 0.25), '#5a2a3a', M4(-0.1, 0, 0, 0, 0, 0.12)),
      part(new THREE.BoxGeometry(0.19, 0.022, 0.25), '#5a2a3a', M4(0.1, 0, 0, 0, 0, -0.12)),
      part(new THREE.BoxGeometry(0.18, 0.012, 0.23), '#f2ead6', M4(-0.095, 0.016, 0, 0, 0, 0.12)),
      part(new THREE.BoxGeometry(0.18, 0.012, 0.23), '#f2ead6', M4(0.095, 0.016, 0, 0, 0, -0.12)),
    ]), MATL);
    this.ledger.name = 'xilLedger'; this.ledger.visible = false;
    this.pencil = new THREE.Mesh(part(new THREE.CylinderGeometry(0.008, 0.008, 0.15, 5), '#e8c040'), MATL); this.pencil.name = 'xilPencil'; this.pencil.visible = false;
    this.x = { on: false, look: 0, next: 8, anchor: null };
  }
  note(s) { this.log.push(`${this.game.time.toFixed(1)} ${s}`); if (this.log.length > 30) this.log.shift(); }
  npc(id) { return this.game.npcs.find((n) => n.def.id === id); }

  update(dt, live, state) {
    if (!this.spot) return;
    const g = this.game, h = g.hero;
    this.doran ||= this.npc('doran'); this.xil ||= this.npc('xil');
    this.fishing(dt, live, state, h);
    this.writing(dt, live, state, h);
  }

  // ---------------------------------------------------------------- Doran's rod
  canFish(n, live, state, h) {
    const S = this.spot;
    if (!n || !live || state === 'evac' || !n.present || n.talking || n.listenTo || n.controlled) return false;
    if (n.forceAnim) return false;   // (napping in the prologue, or a scene's pose)
    if (Math.hypot(n.pos.x - S.x, n.pos.z - S.z) > 0.6) return false;
    const dh = Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z);
    return dh > BUSY_R && dh < ACTIVE_R;
  }
  fishing(dt, live, state, h) {
    const n = this.doran, F = this.f, S = this.spot, g = this.game;
    const on = this.canFish(n, live, state, h);
    if (!on) {
      if (F.st !== 'rest') {
        // (busy with Twinsen, or out of reach: the line in, any fish in the bucket, the rod against the wall)
        if (F.st === 'reel' && F.catch) this.toBucket();
        F.st = 'rest'; this.rodRest(); this.note('rod rested');
      }
      // (the bucket emptied — taken in — while nobody sees it)
      if (this.bucket.n >= 3 && g.walkers?.unseen(this.bucket.x, this.bucket.z, this.y0)) { this.bucket.n = 0; this.inBucket.count = 0; }
      return;
    }
    if (F.st === 'rest') { F.st = 'cast'; F.t = 0; this.count.casts++; this.note('cast'); }
    const play = g.state === 'play';
    if (play) F.t += dt;
    n.angle = dampAngle(n.angle, S.fish, 4, dt);
    // the pose: both hands on the rod at the waist; the strike lifts it
    let pitch = 0.42, lift = 0;
    switch (F.st) {
      case 'cast': { const k = clamp(F.t / 1.1, 0, 1); pitch = k < 0.45 ? 0.42 + 0.75 * Math.sin((k / 0.45) * Math.PI / 2) : 1.17 - 0.75 * ((k - 0.45) / 0.55); if (k >= 1) { F.st = 'wait'; F.t = 0; F.wait = 12 + Math.random() * 18; } break; }
      case 'wait': if (F.t > F.wait) { F.st = 'nibble'; F.t = 0; } break;
      case 'nibble': if (F.t > 1.9) { F.st = 'strike'; F.t = 0; F.catch = Math.random() < 0.7; } break;
      case 'strike': { const k = clamp(F.t / 0.3, 0, 1); pitch = 0.42 + 0.6 * k; lift = k; if (k >= 1) { F.st = 'reel'; F.t = 0; } break; }
      case 'reel': pitch = 1.02; lift = 1; if (F.t > 2.2) { this.landed(); } break;
      case 'land': pitch = 0.9 - 0.3 * clamp(F.t / 1.2, 0, 1); lift = 1 - clamp(F.t / 1.2, 0, 1); if (F.t > 1.6) { F.st = 'cast'; F.t = 0; this.count.casts++; } break;
    }
    const j = n.rig.j;
    if (j?.armR) {
      j.armR.sh.rotation.x = -0.75 - 0.5 * lift; j.armR.el.rotation.x = -0.75 + 0.2 * lift;
      j.armL.sh.rotation.x = -0.95 - 0.45 * lift; j.armL.el.rotation.x = -0.5;
      j.armR.sh.rotation.z -= 0.1; j.armL.sh.rotation.z += 0.18;
    }
    // the rod from his right hand, out over the rail
    n.rig.root.updateMatrixWorld(true);
    const hand = j?.armR?.hand ? j.armR.hand.getWorldPosition(_a) : _a.set(n.pos.x, n.pos.y + 1.0, n.pos.z);
    const fx = Math.sin(n.angle), fz = Math.cos(n.angle), sway = Math.sin(g.time * 0.9) * 0.02;
    _b.set(fx * Math.cos(pitch), Math.sin(pitch + sway), fz * Math.cos(pitch)).normalize();
    const butt = hand.clone().addScaledVector(_b, -0.42);
    this.place(this.rod, butt, _b);
    const tip = butt.clone().addScaledVector(_b, 3.2);
    // the float on the water below the tip (the swell under it; dipping at a bite); the fish on the line as it comes up
    const wy = 0.04 + Math.sin(g.time * 1.3 + 1) * 0.05;
    let fx2 = tip.x - fx * 0.15, fz2 = tip.z - fz * 0.15, fy = wy;
    if (F.st === 'nibble') fy -= 0.06 * Math.abs(Math.sin(F.t * 13));
    if (F.st === 'cast') { const k = clamp(F.t / 1.1, 0, 1); fy = k < 0.6 ? tip.y - 0.4 : wy + (tip.y - 0.4 - wy) * (1 - (k - 0.6) / 0.4) ** 0.5 * (1 - (k - 0.6) / 0.4); }
    let end = { x: fx2, y: fy, z: fz2 };
    this.fish.visible = false;
    if (F.st === 'strike' || F.st === 'reel') {
      const k = F.st === 'strike' ? 0 : clamp(F.t / 1.6, 0, 1);
      end = { x: fx2, y: wy + (tip.y - 0.7 - wy) * k, z: fz2 };
      if (F.catch && F.st === 'reel') { this.fish.visible = true; this.fish.position.set(end.x, end.y - 0.12, end.z); this.fish.rotation.set(Math.PI / 2, 0, Math.sin(g.time * 18) * 0.6); }
    }
    this.float.visible = F.st !== 'land';
    this.float.position.set(end.x, end.y, end.z);
    _a.set(end.x, end.y + 0.04, end.z); _b.copy(tip).sub(_a); const len = _b.length();
    this.place(this.line, _a, _b.normalize()); this.line.scale.set(1, len, 1);
    this.line.visible = F.st !== 'land';
  }
  landed() {
    const F = this.f, n = this.doran;
    if (F.catch) { this.toBucket(); this.count.catches++; n?.rig.doGesture('nod'); this.bark(this.count.catches % 3 === 1 ? 'rf_catch_0' : this.count.catches % 3 === 2 ? 'rf_catch_1' : 'rf_catch_2'); this.note('a catch'); }
    else { this.count.misses++; n?.rig.doGesture('shrug'); this.bark('rf_miss'); this.note('nothing'); }
    F.st = 'land'; F.t = 0; F.catch = false; this.fish.visible = false;
  }
  toBucket() { const B = this.bucket; B.n = Math.min(3, B.n + 1); this.inBucket.count = B.n; this.f.catch = false; }
  bark(key) {
    const B = this.busy, n = this.doran, h = this.game.hero;
    if (!B || !n || (B.bub && B.bub.prio >= 1) || Math.hypot(h.pos.x - n.pos.x, h.pos.z - n.pos.z) > 14) return;
    B.say(n, key, 2.4, 1);
  }
  rodRest() {
    const R = this.rest;
    _b.set(0.06, 1, 0.1).normalize();
    this.place(this.rod, _a.set(R.x, R.y, R.z), _b);
    this.line.visible = false; this.float.visible = false; this.fish.visible = false;
  }
  place(m, at, dir) { m.position.copy(at); _q.setFromUnitVectors(_up, dir); m.quaternion.copy(_q); }

  // ---------------------------------------------------------------- Xil's ledger
  writing(dt, live, state, h) {
    const n = this.xil, X = this.x;
    if (!n) return;
    const mine = X.on && (n.forceAnim === 'tinker' || n.forceAnim === null);
    let ok = live && state !== 'evac' && n.present && !n.talking && !n.listenTo && !n.controlled && Math.abs(n.pos.x) < 300 && (!n.forceAnim || mine);
    const dh = Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z);
    ok = ok && dh > BUSY_R && dh < ACTIVE_R;
    if (ok && X.anchor && Math.hypot(n.pos.x - X.anchor.x, n.pos.z - X.anchor.z) > 0.6) ok = false;   // (moved by the story)
    if (!ok) {
      if (X.on) {
        X.on = false; if (n.forceAnim === 'tinker') n.forceAnim = null; if (n.rig.lookAt === X.lookP) n.rig.lookAt = null;
        this.ledger.visible = this.pencil.visible = false; this.note('ledger away');
      }
      X.anchor = null;
      return;
    }
    if (!X.on) {
      X.on = true; X.anchor = { x: n.pos.x, z: n.pos.z }; X.look = 0; X.next = 6 + Math.random() * 6; this.count.ledger++;
      const j = n.rig.j;
      if (this.ledger.parent !== this.group) this.group.add(this.ledger);
      if (j?.armR?.hand && this.pencil.parent !== j.armR.hand) { j.armR.hand.add(this.pencil); this.pencil.position.set(0, -0.08, 0.05); this.pencil.rotation.set(0.9, 0, 0); }
      this.note('ledger out');
    }
    this.ledger.visible = this.pencil.visible = true;
    if (this.game.state === 'play') { if (X.look > 0) X.look -= dt; else X.next -= dt; }
    if (X.look <= 0 && X.next <= 0) {
      // a look out over the water (west, where the ships come in from the spaceport's side), and a sigh
      X.look = 2.8; X.next = 9 + Math.random() * 7;
      X.lookP = { x: n.pos.x - 30, y: n.pos.y + 6, z: n.pos.z + 4 };
      n.rig.doGesture('sigh');
    }
    if (X.look > 0) { n.forceAnim = null; n.rig.lookAt = X.lookP; }
    else { n.forceAnim = 'tinker'; if (n.rig.lookAt === X.lookP) n.rig.lookAt = null; }
    // the ledger open between his hands, tipped up toward him (placed from where his hands are: any body's arms)
    const j = n.rig.j;
    if (j?.armL?.hand && j.armR?.hand) {
      n.rig.root.updateMatrixWorld(true);
      j.armL.hand.getWorldPosition(_a); j.armR.hand.getWorldPosition(_b);
      const fx = Math.sin(n.angle), fz = Math.cos(n.angle);
      this.ledger.position.set((_a.x + _b.x) / 2 + fx * 0.04, Math.max(_a.y, _b.y) + 0.03, (_a.z + _b.z) / 2 + fz * 0.04);
      this.ledger.rotation.set(X.look > 0 ? 0.2 : -0.55, n.angle, 0, 'YXZ');
    }
  }
}
