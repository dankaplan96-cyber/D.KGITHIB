// Twinsen's other weapons, after LBA2's (numbers and descriptions from LBA2 where it has them; the models, the
// sounds and the code are ours): the blowgun and its Blowtron upgrade, the Esmer laser pistol, the Wannie glove and
// the lightning spell. The melee glove lives in combat.js (MOVES.glove1/2); this module fires the ranged ones, keeps
// their shots in the air, the lightning's arcs, the glove's bolt return, and the models in Twinsen's hands.
//
// What Twinsen owns is game.hero.arms (saved with the hero: freshArms() reads any save, old or new):
//   blowgun, blowtron, laser, glove, lightning, protect, conch, lantern (owned: true/false)
//   darts (blowgun ammo, max 30), charge (laser shots from crystal cells, max 20), penguins (max 5), lanternOn
// Where each comes from: src/game/story/arsenal.js. The gadgets (penguin, protection, conch, lantern): gadgets.js.
//
// Rules worth knowing when balancing:
//  - Blowgun: 1 damage a dart (LBA2: "fires darts fast and accurately"); a Quetch guard's armour (1) lets it through,
//    a Grobo's (2) doesn't. The Blowtron (chapter 6 on) fires twice as fast and hits for 2.
//  - Laser pistol (Zeelich, chapter 3 on): 2 damage, 3 to machines (drones, sentries' bodies, the guardian); a
//    crystal cell shot first, otherwise 2 magic a shot (LBA2's pistol needed a crystal to work).
//  - Lightning (Bersimon, with the School of Magic's pearl; chapter 4 on): 3 magic; 2 damage to the target, then it
//    jumps to up to two more enemies within 5.5 m for 1 each. It counts as a charged hit (it breaks a sentry's guard).
//  - Wannie glove: see MOVES.glove1/glove2 (2 damage, a long knock-back, the second punch breaks guards). A punch
//    sends an enemy's bolt back the way it came (LBA2: "throw back the fireballs").
import * as THREE from 'three';
import { writeBodyStencil } from './characters.js';
import { angleDiff } from '../engine/math.js';

export const ARMS = {
  blowgun: { dmg: 1, speed: 24, range: 17, cool: 0.55, lock: 0.24 },
  blowtron: { dmg: 2, speed: 30, range: 20, cool: 0.27, lock: 0.18 },
  laser: { dmg: 2, machine: 3, speed: 52, range: 26, cool: 0.5, lock: 0.26, mp: 2 },
  lightning: { mp: 3, dmg: 2, chainDmg: 1, chain: 2, chainR: 5.5, range: 11, cool: 1.0, lock: 0.34 },
  reflect: { dmg: 2, speed: 14 },
  max: { darts: 30, charge: 20, penguins: 5 },
};
export const RANGED = new Set(['blowgun', 'laser', 'lightning']);

const KEYS = ['blowgun', 'blowtron', 'laser', 'glove', 'lightning', 'protect', 'conch', 'lantern', 'lanternOn'];
// what a save holds (anything missing or odd becomes the empty default; counts are clamped)
export function freshArms(a = {}) {
  const o = {};
  for (const k of KEYS) o[k] = !!a?.[k];
  for (const k of ['darts', 'charge', 'penguins']) o[k] = Math.max(0, Math.min(ARMS.max[k], Math.floor(+a?.[k] || 0)));
  if (!o.lantern) o.lanternOn = false;
  if (!o.blowgun) o.blowtron = false;
  return o;
}

// ---------------------------------------------------------------- models (built here; nothing copied)
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...o });
function part(g, geo, mat, x = 0, y = 0, z = 0, rx = 0, rz = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m); return m; }
// in the hand: the hand bone's -y continues the forearm (as the sword in actors.js); a pointed weapon lies along it
function blowgunModel(tron) {
  const g = new THREE.Group();
  if (!tron) {
    // a cane tube with brass rings and a bone mouthpiece
    part(g, new THREE.CylinderGeometry(0.018, 0.022, 0.62, 8), M('#b88a4a', { roughness: 0.7 }), 0, -0.2, 0);
    for (const y of [0.05, -0.12, -0.34, -0.5]) part(g, new THREE.CylinderGeometry(0.026, 0.026, 0.025, 8), M('#e0b25a', { metalness: 0.7, roughness: 0.35 }), 0, y, 0);
    part(g, new THREE.CylinderGeometry(0.03, 0.018, 0.06, 8), M('#f2ead6'), 0, 0.12, 0);
  } else {
    // the Blowtron: Mosquibee work — a lacquered green barrel, a brass drum of darts, a wing-shaped guard
    part(g, new THREE.CylinderGeometry(0.026, 0.03, 0.66, 10), M('#2f8a5a', { roughness: 0.35, metalness: 0.2 }), 0, -0.2, 0);
    part(g, new THREE.CylinderGeometry(0.06, 0.06, 0.07, 12), M('#e0b25a', { metalness: 0.75, roughness: 0.3 }), 0.055, -0.02, 0, 0, Math.PI / 2);
    part(g, new THREE.SphereGeometry(0.05, 10, 6), M('#e0a83a', { roughness: 0.4 }), 0, 0.14, 0).scale.set(1, 0.6, 1);
    const wing = part(g, new THREE.BoxGeometry(0.16, 0.01, 0.07), M('#8ac8b0', { transparent: true, opacity: 0.8 }), -0.05, -0.08, 0, 0, 0.5);
    void wing;
    for (const y of [-0.3, -0.48]) part(g, new THREE.TorusGeometry(0.03, 0.007, 4, 12), M('#e0b25a', { metalness: 0.7 }), 0, y, 0, Math.PI / 2);
  }
  g.rotation.x = -0.2; g.position.y = -0.02;
  writeBodyStencil(g);
  return g;
}
function pistolModel() {
  // an Esmer pistol: a rounded gold body, a coral grip, a blue crystal at the muzzle
  const g = new THREE.Group();
  const gold = M('#e8b84a', { metalness: 0.7, roughness: 0.3 });
  part(g, new THREE.CapsuleGeometry(0.045, 0.2, 4, 10), gold, 0, -0.16, 0.0);
  part(g, new THREE.CylinderGeometry(0.03, 0.04, 0.12, 10), M('#e0704a', { roughness: 0.6 }), 0, -0.02, -0.06, 0.6);
  part(g, new THREE.TorusGeometry(0.05, 0.012, 6, 14), gold, 0, -0.12, 0, Math.PI / 2);
  part(g, new THREE.SphereGeometry(0.038, 10, 8), M('#8fe8ff', { emissive: '#2a9aff', emissiveIntensity: 1.6, roughness: 0.15 }), 0, -0.31, 0);
  g.rotation.x = -0.15;
  writeBodyStencil(g);
  return g;
}
function gloveModel() {
  // a Wannie's work glove: big, padded, red leather, a brass-studded cuff
  const g = new THREE.Group();
  const red = M('#b8402a', { roughness: 0.75 });
  part(g, new THREE.SphereGeometry(0.11, 12, 10), red, 0, -0.06, 0).scale.set(1, 1.05, 0.9);
  part(g, new THREE.SphereGeometry(0.05, 8, 6), red, 0.08, -0.02, 0.05).scale.set(0.8, 1.3, 0.8);
  part(g, new THREE.CylinderGeometry(0.1, 0.095, 0.09, 12), M('#6a3a22', { roughness: 0.8 }), 0, 0.07, 0);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; part(g, new THREE.SphereGeometry(0.014, 6, 4), M('#e0b25a', { metalness: 0.8, roughness: 0.3 }), Math.cos(a) * 0.1, 0.07, Math.sin(a) * 0.1); }
  writeBodyStencil(g);
  return g;
}

// ---------------------------------------------------------------- shots in the air
const dartGeo = (() => { let g; return () => g ??= (() => { const a = new THREE.CylinderGeometry(0.008, 0.008, 0.2, 5); a.rotateX(Math.PI / 2); return a; })(); })();
export class Shots {
  constructor(game) {
    this.game = game; this.list = []; this.stuck = [];
    this.dartMat = M('#d8c8a0', { roughness: 0.6 });
    this.tuftMat = M('#c83a2a', { roughness: 0.9 });
    this.laserGeo = new THREE.CapsuleGeometry(0.045, 0.7, 2, 6).rotateX(Math.PI / 2);
    this.laserMat = new THREE.MeshBasicMaterial({ color: '#bff4ff', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    this.tuftGeo = new THREE.ConeGeometry(0.025, 0.05, 6).rotateX(-Math.PI / 2);
  }
  mesh(kind) {
    if (kind === 'laser') { const m = new THREE.Mesh(this.laserGeo, this.laserMat); m.renderOrder = 5; return m; }
    const g = new THREE.Group();
    g.add(new THREE.Mesh(dartGeo(), this.dartMat));
    const tuft = new THREE.Mesh(this.tuftGeo, this.tuftMat); tuft.position.z = -0.1; g.add(tuft);
    return g;
  }
  fire(kind, from, dir, { dmg, speed, range, machine = dmg }) {
    const m = this.mesh(kind);
    m.position.copy(from);
    m.lookAt(from.clone().add(dir));
    this.game.scene.add(m);
    const s = { kind, m, v: dir.clone().multiplyScalar(speed), left: range, dmg, machine };
    this.list.push(s);
    return s;
  }
  clear() { for (const s of [...this.list, ...this.stuck]) this.game.scene.remove(s.m); this.list = []; this.stuck = []; }
  update(dt) {
    const g = this.game, P = g.physics;
    for (let i = this.stuck.length - 1; i >= 0; i--) { const s = this.stuck[i]; s.t -= dt; if (s.t <= 0) { g.scene.remove(s.m); this.stuck.splice(i, 1); } }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const s = this.list[i], p = s.m.position;
      const step = s.v.length() * dt, n = Math.max(1, Math.ceil(step / 0.18));
      let end = null;
      for (let k = 0; k < n && !end; k++) {
        p.addScaledVector(s.v, dt / n);
        s.left -= step / n;
        if (s.kind !== 'laser') s.v.y -= 2.5 * (dt / n);   // (a dart drops a little over its range)
        const e = this.hitEnemy(p);
        if (e) { this.strike(s, e, p); end = 'hit'; break; }
        if (s.kind === 'laser' && !g.room) for (const c of g.world.crates) if (c.alive && Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z) < 0.9) { g.breakCrate(c); end = 'hit'; break; }
        if (s.left <= 0) end = 'spent';
        else if (P.groundAt(p.x, p.z, p.y + 0.05) > p.y || P.blockedAt(p.x, p.z, p.y - 0.6, 0)) end = 'wall';
      }
      if (!end) continue;
      this.list.splice(i, 1);
      if (end === 'wall' && s.kind !== 'laser') {
        // a dart sticks where it struck for a moment
        g.particles.burst(p.x, p.y, p.z, '#d8c8a0', 3, 1.2); g.audio.play('tick');
        s.t = 2.5; this.stuck.push(s);
      } else {
        if (end === 'wall' && s.kind === 'laser') g.particles.burst(p.x, p.y, p.z, '#bff4ff', 8, 2.5);
        g.scene.remove(s.m);
      }
    }
  }
  hitEnemy(p) {
    for (const e of this.game.enemies) {
      if (!e.alive || !e.present) continue;
      if (Math.hypot(p.x - e.pos.x, p.z - e.pos.z) < (e.hitR || 0.75) && p.y > e.pos.y - 0.2 && p.y < e.pos.y + (e.hitH || 2)) return e;
    }
    return null;
  }
  strike(s, e, p) {
    const g = this.game, dmg = e.material === 'machine' ? s.machine : s.dmg;
    const res = hitEnemy(e, dmg, p, s.kind === 'lightning');
    g.impact(p.x, p.y, p.z, res === 'blocked' ? 'armor' : (e.material || 'flesh'), res, 0.6);
    if (res !== 'blocked') g.hitStop = Math.max(g.hitStop || 0, 0.03);
  }
}
// one hit through the enemy's own rules (armour, shields, reactions): the same entry the ball uses
export function hitEnemy(e, dmg, p, charged = false) {
  const fake = { damage: dmg, charged, hits: new Set(), arsenal: true };
  return e.ballHit ? e.ballHit(fake, p) : (e.damage(dmg, p), 'hit');
}

// ---------------------------------------------------------------- the weapons controller
export class Weapons {
  constructor(game) {
    this.game = game;
    this.shots = new Shots(game);
    this.models = {};
    this.arcs = [];
    this.arcGeo = new THREE.CylinderGeometry(1, 1, 1, 4, 1, true);
    this.arcMat = new THREE.MeshBasicMaterial({ color: '#dff6ff', transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.stats = { fired: 0, hits: 0 };
  }
  get h() { return this.game.hero; }
  get arms() { return this.h.arms || (this.h.arms = freshArms()); }
  // (not while the player is Zoé, or Twinsen in a borrowed technician's coat: chapter 9)
  owns(w) { const a = this.arms; if (this.h.body === 'zoe' || this.h.body === 'worker') return false; return w === 'blowgun' ? a.blowgun : w === 'laser' ? a.laser : w === 'glove' ? a.glove : w === 'lightning' ? a.lightning : false; }
  def(w) { return w === 'blowgun' ? (this.arms.blowtron ? ARMS.blowtron : ARMS.blowgun) : ARMS[w]; }
  // what a shot of `w` would cost right now, and whether it can be paid: null = fine, else a toast key
  short(w) {
    const a = this.arms, h = this.h;
    if (w === 'blowgun') return a.darts > 0 ? null : 'a_toast_nodarts';
    if (w === 'laser') return a.charge > 0 || h.mp >= ARMS.laser.mp ? null : 'a_toast_nocharge';
    if (w === 'lightning') return h.mp >= ARMS.lightning.mp ? null : 'a_toast_nomp';
    return null;
  }
  // from Twinsen's hands, along the aim; a target the aim means (lock or soft target) is aimed at directly
  origin(aim) { const h = this.h; return new THREE.Vector3(h.pos.x + aim.x * 0.55, h.pos.y + 1.25, h.pos.z + aim.z * 0.55); }
  dirTo(from, aim, range) {
    const g = this.game, T = g.targeting;
    const tg = T?.lock || (T && T.cone() > 0 ? T.pick(aim, range, Math.max(0.3, T.cone())) : null);
    if (tg && tg.pos) {
      const to = new THREE.Vector3(tg.pos.x, tg.pos.y + (tg.aimY ?? 0.6), tg.pos.z);   // (a drone's aimY is its hover)
      return { dir: to.sub(from).normalize(), tg };
    }
    return { dir: new THREE.Vector3(aim.x, 0, aim.z).normalize(), tg: null };
  }
  // fire `w` (the combat controller checks the cooldown); returns false when it couldn't
  fire(w, aim) {
    const g = this.game, h = this.h, a = this.arms, D = this.def(w);
    const no = this.short(w);
    if (no) { g.hud.toast(no); return false; }
    h.angle = Math.atan2(aim.x, aim.z);
    h.rig.play('pulse'); h.rig.actionT = 0;
    this.stats.fired++;
    if (w === 'lightning') return this.lightning(aim);
    const from = this.origin(aim), { dir } = this.dirTo(from, aim, D.range);
    if (w === 'blowgun') {
      a.darts--;
      this.shots.fire('dart', from, dir, D);
      this.sound('dart');
    } else if (w === 'laser') {
      if (a.charge > 0) a.charge--; else h.mp -= ARMS.laser.mp;
      this.shots.fire('laser', from, dir, D);
      this.sound('laser');
      g.particles.burst(from.x, from.y, from.z, '#bff4ff', 4, 1.5);
    }
    return true;
  }
  // the lightning spell: the target the aim means, then the nearest others within reach of each, one jump at a time
  lightning(aim) {
    const g = this.game, h = this.h, L = ARMS.lightning, T = g.targeting;
    const first = T?.lock && T.visible(T.lock, L.range) ? T.lock : T?.pick(aim, L.range, 0.6) || T?.nearest(Math.min(6, L.range));
    const hand = new THREE.Vector3(h.pos.x + Math.sin(h.angle) * 0.4, h.pos.y + 1.45, h.pos.z + Math.cos(h.angle) * 0.4);
    if (!first) {
      // nothing to strike: a crackle at the fingertips, no magic spent
      g.particles.burst(hand.x, hand.y, hand.z, '#dff6ff', 6, 1.6); g.audio.play('notReady');
      return false;
    }
    h.mp -= L.mp;
    this.sound('lightning');
    const hit = [first];
    let at = first;
    while (hit.length < 1 + L.chain) {
      let best = null, bd = L.chainR;
      for (const e of g.enemies) {
        if (!e.alive || !e.present || hit.includes(e)) continue;
        const d = Math.hypot(e.pos.x - at.pos.x, e.pos.z - at.pos.z);
        if (d < bd && g.physics.lineOfSight(at.pos.x, at.pos.y + 1, at.pos.z, e.pos.x, e.pos.y + 1, e.pos.z)) { bd = d; best = e; }
      }
      if (!best) break;
      hit.push(best); at = best;
    }
    let from = hand;
    hit.forEach((e, i) => {
      const to = new THREE.Vector3(e.pos.x, e.pos.y + (e.aimY ?? 0.8), e.pos.z);
      this.arc(from, to);
      const res = hitEnemy(e, i === 0 ? L.dmg : L.chainDmg, to, true);
      g.impact(to.x, to.y, to.z, res === 'blocked' ? 'armor' : 'magic', res, 0.8);
      from = to;
    });
    this.lastChain = hit.length;
    g.camRig.shake(0.15);
    g.hitStop = Math.max(g.hitStop || 0, 0.05);
    return true;
  }
  // a jagged line of thin glowing segments from a to b, gone in a quarter second
  arc(a, b) {
    const pts = [a.clone()], n = 6, d = a.distanceTo(b);
    for (let i = 1; i < n; i++) { const p = a.clone().lerp(b, i / n); p.x += (Math.random() - 0.5) * d * 0.12; p.y += (Math.random() - 0.5) * d * 0.12; p.z += (Math.random() - 0.5) * d * 0.12; pts.push(p); }
    pts.push(b.clone());
    const grp = new THREE.Group();
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1], len = p0.distanceTo(p1);
      const m = new THREE.Mesh(this.arcGeo, this.arcMat);
      m.position.copy(p0).lerp(p1, 0.5); m.scale.set(0.035, len, 0.035);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), p1.clone().sub(p0).normalize());
      grp.add(m);
    }
    this.game.scene.add(grp);
    this.arcs.push({ grp, t: 0.25 });
    this.game.particles.burst(b.x, b.y, b.z, '#dff6ff', 8, 2.5);
  }
  // a glove punch meets an enemy bolt in front of Twinsen: it goes back the way it came (and can hit its sender)
  deflect(reach = 2.2) {
    const g = this.game, h = this.h; let n = 0;
    for (const b of g.bolts?.list || []) {
      if (b.reflected) continue;
      const p = b.m.position, d = Math.hypot(p.x - h.pos.x, p.z - h.pos.z);
      if (d > reach || Math.abs(angleDiff(h.angle, Math.atan2(p.x - h.pos.x, p.z - h.pos.z))) > 1.1 || p.y < h.pos.y - 0.2 || p.y > h.pos.y + 2.4) continue;
      b.reflected = true;
      const sp = Math.max(ARMS.reflect.speed, b.v.length());
      b.v.set(Math.sin(h.angle), 0, Math.cos(h.angle)).multiplyScalar(sp);
      b.life = 2.2; b.dmg = 0;
      b.m.lookAt(p.clone().add(b.v));
      g.particles.burst(p.x, p.y, p.z, '#ffd27a', 8, 2.5); g.audio.play('clang');
      n++;
    }
    this.deflected = (this.deflected || 0) + n;
    return n;
  }
  // the reflected bolts: they never hurt Twinsen (their damage is 0) and strike the first enemy they meet
  updateReflected() {
    const g = this.game, list = g.bolts?.list; if (!list) return;
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i]; if (!b.reflected) continue;
      const e = this.shots.hitEnemy(b.m.position);
      if (!e) continue;
      const p = b.m.position, res = hitEnemy(e, ARMS.reflect.dmg, p, true);
      g.impact(p.x, p.y, p.z, res === 'blocked' ? 'armor' : (e.material || 'flesh'), res, 0.7);
      g.scene.remove(b.m); list.splice(i, 1);
      this.returned = (this.returned || 0) + 1;
    }
  }
  // the weapon in Twinsen's hand (none for the ball, the fists, the pulse tool, the spell)
  updateHeld() {
    const h = this.h, hand = h.rig.j?.armR?.hand, a = this.arms;
    if (!hand) return;
    const w = h.combat?.weapon, other = h.body === 'zoe' || h.body === 'worker';
    const want = other ? null : w === 'blowgun' ? (a.blowtron ? 'blowtron' : 'blowgun') : w === 'laser' ? 'laser' : w === 'glove' ? 'glove' : null;
    for (const [k, m] of Object.entries(this.models)) m.visible = k === want;
    if (want && !this.models[want]) {
      const m = want === 'laser' ? pistolModel() : want === 'glove' ? gloveModel() : blowgunModel(want === 'blowtron');
      this.models[want] = m;
    }
    const m = want && this.models[want];
    if (m && m.parent !== hand) hand.add(m);
  }
  update(dt) {
    this.shots.update(dt);
    this.updateReflected();
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const A = this.arcs[i]; A.t -= dt;
      A.grp.visible = A.t > 0 && Math.floor(A.t * 40) % 3 !== 0;   // (a flicker)
      if (A.t <= 0) { this.game.scene.remove(A.grp); this.arcs.splice(i, 1); }
    }
    this.updateHeld();
  }
  reset() { this.shots.clear(); for (const A of this.arcs) this.game.scene.remove(A.grp); this.arcs = []; }
  // our own synthesised sounds (the engine's tone and noise voices)
  sound(kind) {
    const au = this.game.audio;
    if (!au?.ctx || au.ctx.state !== 'running') return;
    if (kind === 'dart') { au._burst({ dur: 0.08, vol: 0.12, f: 2600, f1: 900, type: 'bandpass', q: 2 }); au._tone({ type: 'triangle', f0: 700, f1: 420, dur: 0.05, vol: 0.03 }); }
    if (kind === 'laser') { au._tone({ type: 'sawtooth', f0: 1900, f1: 520, dur: 0.16, vol: 0.05 }); au._tone({ type: 'sine', f0: 2600, f1: 1400, dur: 0.12, vol: 0.04 }); }
    if (kind === 'lightning') { au._burst({ dur: 0.35, vol: 0.28, f: 4200, f1: 600, type: 'bandpass', q: 0.8 }); au._tone({ type: 'square', f0: 140, f1: 60, dur: 0.3, vol: 0.06 }); }
  }
}
