// Enemies. Every attack is telegraphed (a visible wind-up the player can read
// and react to), every hit gets a reaction (flash, knockback, stagger).
//  - Crystal mite: wanders, rears up and glows, then lunges and bites.
//  - Warden drone (the Joint Project's security): patrols a loop, sees in a
//    cone (Discreet mode and hiding make Twinsen hard to spot), alerts,
//    charges its prongs and fires a slow zap; staggers when hit.
import * as THREE from 'three';
import { Actor } from './actors.js';
import { GuardDog } from './guarddog.js';
import { Guard } from './guards.js';
import { sculptRigid } from '../engine/sculpt.js';
import { angleDiff, dampAngle, clamp } from '../engine/math.js';

const vmat = (rough = 0.6, metal = 0) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: metal });

// ------------------------------------------------------------------ crystal mite
function miteBodyGeo() {
  return sculptRigid({
    key: 'mite-body', groups: { b: 0.05, c: 0.0 }, joinK: 0.02,
    colors: { shell: '#3a4a5c', belly: '#6a7a88', crystal: '#8ff0ff' },
    prims: [
      { type: 'ell', c: [0, 0.42, -0.22], r: [0.3, 0.22, 0.34], mat: 'shell', group: 'b', bone: 'x', wobble: (x, y, z) => Math.sin(z * 40) * 0.006 },
      { type: 'ell', c: [0, 0.4, 0.12], r: [0.22, 0.17, 0.18], mat: 'shell', group: 'b', bone: 'x' },
      { type: 'ell', c: [0, 0.38, 0.32], r: [0.15, 0.12, 0.13], mat: 'shell', group: 'b', bone: 'x' },
      { type: 'ell', c: [0, 0.3, -0.15], r: [0.24, 0.1, 0.3], mat: 'belly', group: 'b', bone: 'x' },
      { type: 'cone', a: [0.06, 0.34, 0.4], b: [0.12, 0.3, 0.55], r1: 0.035, r2: 0.01, mat: 'belly', group: 'b', bone: 'x' },
      { type: 'cone', a: [-0.06, 0.34, 0.4], b: [-0.12, 0.3, 0.55], r1: 0.035, r2: 0.01, mat: 'belly', group: 'b', bone: 'x' },
    ],
    paint: (p, m, col) => { if (m === 'shell') col.offsetHSL(0, 0, Math.max(0, p.y - 0.45) * 0.6); },
    bounds: { min: [-0.4, 0.1, -0.65], max: [0.4, 0.7, 0.62] }, cell: 0.02,
  });
}
function miteCrystalGeo() {
  // a cluster of crystal spikes growing out of the back
  const prims = [];
  const spikes = [[0, 0.62, -0.25, 0.28, 0.07], [0.12, 0.58, -0.1, 0.2, 0.05], [-0.13, 0.58, -0.32, 0.22, 0.055], [0.08, 0.57, -0.42, 0.16, 0.045], [-0.08, 0.55, 0.05, 0.14, 0.04]];
  for (const [x, y, z, h, r] of spikes) prims.push({ type: 'cone', a: [x, y - 0.12, z], b: [x * 1.6, y + h, z * 1.1], r1: r, r2: 0.004, mat: 'c', group: 'c', bone: 'x' });
  return sculptRigid({ key: 'mite-crystals', prims, groups: { c: 0.0 }, joinK: 0.0, colors: { c: '#bff8ff' }, bounds: { min: [-0.3, 0.38, -0.6], max: [0.3, 1.0, 0.3] }, cell: 0.015 });
}
function miteLegGeo() {
  return sculptRigid({
    key: 'mite-leg', groups: { l: 0.02 }, joinK: 0.0, colors: { l: '#2c3846' },
    prims: [
      { type: 'cone', a: [0, 0, 0], b: [0.22, 0.12, 0], r1: 0.035, r2: 0.028, mat: 'l', group: 'l', bone: 'x' },
      { type: 'cone', a: [0.22, 0.12, 0], b: [0.36, -0.28, 0], r1: 0.028, r2: 0.01, mat: 'l', group: 'l', bone: 'x' },
    ],
    bounds: { min: [-0.06, -0.33, -0.06], max: [0.42, 0.18, 0.06] }, cell: 0.012,
  });
}

function createMiteRig() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const shellMat = vmat(0.45, 0.1);
  const crystal = new THREE.MeshStandardMaterial({ color: '#bff8ff', emissive: '#30c8f0', emissiveIntensity: 1.1, roughness: 0.15, metalness: 0.1 });
  const b = new THREE.Mesh(miteBodyGeo(), shellMat); b.castShadow = true; body.add(b);
  const c = new THREE.Mesh(miteCrystalGeo(), crystal); c.castShadow = true; body.add(c);
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#ffb05a', emissive: '#ff7a1a', emissiveIntensity: 2 });
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), eyeMat); e.position.set(sx * 0.07, 0.44, 0.43); body.add(e); }
  const legs = [];
  const legGeo = miteLegGeo();
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? 1 : -1;
    const g = new THREE.Group();
    g.position.set(side * 0.16, 0.38, 0.18 - (i % 3) * 0.2);
    g.rotation.y = side > 0 ? -(i % 3 - 1) * 0.35 : Math.PI + (i % 3 - 1) * 0.35;
    const l = new THREE.Mesh(legGeo, shellMat); l.castShadow = true; g.add(l);
    body.add(g); legs.push(g);
  }
  const rig = {
    root, anim: 'idle', t: 0, flash: 0, rear: 0, actionT: 0,
    play(a) { if (a !== this.anim) { this.anim = a; this.actionT = 0; } }, hitFlash() { this.flash = 1; },
    update(dt, speed = 0) {
      this.t += dt * (2 + speed * 4);
      this.actionT += dt;
      legs.forEach((g, i) => { g.rotation.z = Math.sin(this.t * 3 + i * 1.7) * 0.35 * Math.min(1, speed + 0.1); });
      // rearing = the bite wind-up: front lifts, crystals flare
      const want = this.anim === 'windup' ? 1 : this.anim === 'lunge' ? 0.4 : 0;
      this.rear += (want - this.rear) * (1 - Math.exp(-dt * 12));
      body.rotation.x = -this.rear * 0.55;
      body.position.y = Math.abs(Math.sin(this.t * 3)) * 0.03 + this.rear * 0.12;
      if (this.anim === 'dead') body.rotation.z = Math.min(Math.PI, body.rotation.z + dt * 8);
      this.flash = Math.max(0, this.flash - dt * 4);
      crystal.emissiveIntensity = 1.1 + this.rear * 2.5 + this.flash * 3 + (this.anim === 'windup' ? Math.sin(this.actionT * 40) * 0.8 : 0);
      shellMat.emissive.setRGB(this.flash, this.flash, this.flash);
    },
  };
  rig.j = {};
  return rig;
}

// A cautious close-range attacker: it circles at a safe distance until the director lets it attack, rears
// up (the tell), lunges, then sits low for a moment (the opening). Any hit staggers it (it's small).
export class Mite extends Actor {
  constructor(game, def) {
    super(game, createMiteRig(), def.x, def.z, 0.4);
    this.def = def;
    this.id = def.id;
    this.group = def.group || 'well';
    this.hp = this.maxHp = def.hp || 2;
    this.state = 'idle';
    this.home = { x: def.x, z: def.z };
    this.wanderT = Math.random() * 3; this.deadT = 0; this.hurtT = 0; this.stateT = 0; this.coolT = 0;
    this.angle = Math.random() * 6;
    this.circle = Math.random() < 0.5 ? 1 : -1;
    this.present = true;
    this.material = 'crystal'; this.aimY = 0.4; this.markY = 0.9; this.hitH = 1.0; this.recentHitT = 0;
  }
  get alive() { return this.state !== 'dead'; }
  setPresent(on) { this.present = on; this.rig.root.visible = on && (this.alive || this.deadT < 1.2); this.shadow.visible = on && this.alive; }
  alert() { if (this.alive && this.state === 'idle') this.state = 'chase'; }
  melee(D) { this.damage(D.dmg, this.game.hero.pos); return 'hit'; }
  ballHit(ball, p) { this.damage(ball.damage, p); return 'hit'; }
  damage(n, from) {
    if (!this.alive) return;
    const g = this.game;
    this.hp -= n; this.rig.hitFlash(); this.hurtT = 0.35; this.recentHitT = 2.5;
    g.particles.burst(this.pos.x, this.pos.y + 0.5, this.pos.z, '#9ff4ff', 10, 4);
    if (from) { const a = Math.atan2(this.pos.x - from.x, this.pos.z - from.z); this.kb.set(Math.sin(a) * 8, Math.cos(a) * 8); }
    // a hit interrupts the bite (small: always staggers)
    if (this.state === 'windup' || this.state === 'lunge') g.combatDir?.done(this);
    this.state = 'chase'; this.coolT = 0.7;
    if (this.hp <= 0) { this.state = 'dead'; g.combatDir?.done(this); g.audio.play('break'); g.particles.burst(this.pos.x, this.pos.y + 0.4, this.pos.z, '#bff8ff', 30, 5); g.onEnemyKilled(this); }
  }
  update(dt) {
    if (!this.present) return;
    const g = this.game, hero = g.hero, D = g.combatDir?.diff || { windup: 1, cool: 1 };
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.coolT = Math.max(0, this.coolT - dt);
    this.recentHitT = Math.max(0, this.recentHitT - dt);
    if (!this.alive) {
      this.deadT += dt; this.rig.play('dead'); this.rig.update(dt, 0);
      if (this.deadT > 1.2) this.rig.root.visible = false;
      this.sync(); return;
    }
    const d = this.distTo(hero);
    let sp = 0, side = 0;
    this.stateT += dt;
    if (this.state === 'idle') {
      this.wanderT -= dt;
      if (this.wanderT < 0) { this.wanderT = 1.5 + Math.random() * 2; this.angle = Math.atan2(this.home.x - this.pos.x + (Math.random() - 0.5) * 4, this.home.z - this.pos.z + (Math.random() - 0.5) * 4); }
      sp = this.wanderT > 1 ? 1.2 : 0;
      if (d < 6 && !hero.dead && hero.visibility() > 0.2) { this.state = 'chase'; g.audio.play('alert'); }
      this.rig.play('idle');
    } else if (this.state === 'chase') {
      this.angle = dampAngle(this.angle, this.angleTo(hero), 8, dt);
      this.rig.play('walk');
      // close in to striking distance; without permission to attack, circle at a wary distance
      const may = d < 2.0 && this.coolT <= 0 && this.hurtT <= 0 && !hero.dead && (g.combatDir?.canAttack(this) ?? true);
      if (may) { this.state = 'windup'; this.stateT = 0; g.audio.play('zap'); }
      else if (d > 2.6) sp = 2.5;
      else { side = this.circle * 1.4; sp = d < 2.0 ? -0.8 : 0; if (Math.random() < dt * 0.4) this.circle *= -1; }
      // too far from home, or he got away: go back
      if (d > 14 || Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z) > 20) { this.state = 'idle'; g.combatDir?.done(this); }
    } else if (this.state === 'windup') {
      // rear up: the cue to dodge or strike first
      this.angle = dampAngle(this.angle, this.angleTo(hero), 5, dt);
      this.rig.play('windup');
      if (this.stateT > 0.5 * D.windup) { this.state = 'lunge'; this.stateT = 0; }
    } else if (this.state === 'lunge') {
      sp = 6;
      this.rig.play('lunge');
      if (d < 1.0 && !this.bit) { this.bit = true; hero.damage(1, this.pos); }
      if (this.stateT > 0.18) { this.state = 'recover'; this.stateT = 0; this.bit = false; g.combatDir?.done(this); }
    } else if (this.state === 'recover') {
      // the opening: low and slow for a moment
      this.rig.play('idle');
      if (this.stateT > 0.6) { this.state = 'chase'; this.coolT = 1.0 * D.cool; }
    }
    if ((sp || side) && this.hurtT <= 0) {
      const P = g.physics, fx = Math.sin(this.angle), fz = Math.cos(this.angle);
      P.move(this, (fx * sp + fz * side) * dt, (fz * sp - fx * side) * dt);
    }
    this.applyKnockback(dt);
    g.physics.fall(this, dt);
    this.rig.update(dt, Math.abs(sp) + Math.abs(side) * 0.6);
    this.sync();
  }
}

// ------------------------------------------------------------------ Warden drone
function droneGeos() {
  const body = sculptRigid({
    key: 'drone-body', groups: { h: 0.04, t: 0.01 }, joinK: 0.015,
    colors: { brass: '#c8a050', teal: '#2f8a8a', dark: '#2a3036', glass: '#1a2a30' },
    prims: [
      { type: 'ell', c: [0, 0, 0], r: [0.42, 0.34, 0.44], mat: 'brass', group: 'h', bone: 'x' },
      { type: 'torus', c: [0, -0.04, 0], R: 0.42, r: 0.06, mat: 'teal', group: 't', bone: 'x' },
      { type: 'ell', c: [0, 0.3, -0.05], r: [0.16, 0.08, 0.16], mat: 'teal', group: 'h', bone: 'x' },
      { type: 'cone', a: [0, 0.34, -0.05], b: [0, 0.62, -0.08], r1: 0.02, r2: 0.012, mat: 'dark', group: 't', bone: 'x' },
      { type: 'ell', c: [0, 0.62, -0.08], r: [0.035, 0.035, 0.035], mat: 'teal', group: 't', bone: 'x' },
      // eye socket carved into the front
      { type: 'ell', c: [0, 0.04, 0.42], r: [0.15, 0.15, 0.1], sub: true, k: 0.03 },
      { type: 'ell', c: [0, -0.3, 0], r: [0.24, 0.12, 0.24], mat: 'dark', group: 'h', bone: 'x' },
      // side fins
      ...[-1, 1].map((sx) => ({ type: 'box', c: [sx * 0.46, 0.02, -0.12], h: [0.03, 0.12, 0.2], round: 0.025, mat: 'teal', group: 't', bone: 'x' })),
    ],
    paint: (p, m, col) => {
      if (m === 'brass') { const n = Math.sin(p.x * 30) * Math.sin(p.z * 30) * 0.03; col.offsetHSL(0, 0, n + (p.y > 0.15 ? 0.06 : -0.04)); }
      // rivet ring
      if (m === 'brass' && Math.abs(p.y - 0.12) < 0.02 && Math.sin(Math.atan2(p.x, p.z) * 18) > 0.7) col.multiplyScalar(0.6);
    },
    bounds: { min: [-0.56, -0.46, -0.52], max: [0.56, 0.7, 0.52] }, cell: 0.02,
  });
  const arm = sculptRigid({
    key: 'drone-arm', groups: { a: 0.02 }, joinK: 0.0, colors: { a: '#3a4048', tip: '#c8a050' },
    prims: [
      { type: 'cone', a: [0, 0, 0], b: [0, -0.18, 0.12], r1: 0.035, r2: 0.03, mat: 'a', group: 'a', bone: 'x' },
      { type: 'cone', a: [0, -0.18, 0.12], b: [0.04, -0.24, 0.3], r1: 0.025, r2: 0.012, mat: 'tip', group: 'a', bone: 'x' },
      { type: 'cone', a: [0, -0.18, 0.12], b: [-0.04, -0.24, 0.3], r1: 0.025, r2: 0.012, mat: 'tip', group: 'a', bone: 'x' },
    ],
    bounds: { min: [-0.1, -0.3, -0.06], max: [0.1, 0.05, 0.34] }, cell: 0.012,
  });
  return { body, arm };
}

function createDroneRig() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const G = droneGeos();
  const m = vmat(0.38, 0.45);
  const hull = new THREE.Mesh(G.body, m); hull.castShadow = true; body.add(hull);
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#9ff4ff', emissive: '#30d0ff', emissiveIntensity: 2.5, roughness: 0.1 });
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), eyeMat);
  eye.position.set(0, 0.04, 0.36); body.add(eye);
  const arms = [-1, 1].map((sx) => { const a = new THREE.Mesh(G.arm, m); a.position.set(sx * 0.26, -0.2, 0.18); a.castShadow = true; body.add(a); return a; });
  // rotor ring of blades under the hull
  const rotor = new THREE.Group(); rotor.position.y = -0.38; body.add(rotor);
  const bladeGeo = new THREE.BoxGeometry(0.34, 0.012, 0.06);
  const bladeMat = new THREE.MeshStandardMaterial({ color: '#4a5058', roughness: 0.4, metalness: 0.6 });
  for (let i = 0; i < 4; i++) { const bl = new THREE.Mesh(bladeGeo, bladeMat); bl.rotation.y = (i / 4) * Math.PI; rotor.add(bl); }
  // crackle between the prongs during the wind-up
  const spark = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: '#d8f8ff', transparent: true, opacity: 0 }));
  spark.position.set(0, -0.42, 0.44); body.add(spark);
  const rig = {
    root, anim: 'idle', t: 0, flash: 0, actionT: 0, mood: 'calm',
    play(a) { if (a !== this.anim) { this.anim = a; this.actionT = 0; } }, hitFlash() { this.flash = 1; },
    update(dt) {
      this.t += dt; this.actionT += dt;
      rotor.rotation.y += dt * 30;
      body.position.y = Math.sin(this.t * 2.2) * 0.06;
      const charging = this.anim === 'windup';
      arms.forEach((a, i) => { a.rotation.x = charging ? -0.9 : this.anim === 'fire' ? -1.2 : Math.sin(this.t * 1.5 + i) * 0.1; });
      spark.material.opacity = charging ? 0.5 + Math.sin(this.actionT * 50) * 0.4 : 0;
      spark.scale.setScalar(charging ? 0.6 + this.actionT * 1.2 : 1);
      if (this.anim === 'dead') { body.rotation.z = Math.min(1.8, body.rotation.z + dt * 3); }
      else body.rotation.z = Math.sin(this.t * 1.3) * 0.05 + (this.anim === 'hurt' ? Math.sin(this.actionT * 30) * 0.3 : 0);
      this.flash = Math.max(0, this.flash - dt * 4);
      const c = this.mood === 'alert' ? [1.0, 0.25, 0.15] : this.mood === 'search' ? [1.0, 0.75, 0.2] : [0.25, 0.85, 1.0];
      eyeMat.color.setRGB(...c); eyeMat.emissive.setRGB(c[0] * 0.8, c[1] * 0.8, c[2] * 0.8);
      eyeMat.emissiveIntensity = 2.2 + (charging ? 2 + Math.sin(this.actionT * 30) : 0) + this.flash * 3;
      m.emissive.setRGB(this.flash * 0.8, this.flash * 0.8, this.flash * 0.8);
    },
  };
  rig.j = {};
  return rig;
}

export class Drone extends Actor {
  constructor(game, def) {
    super(game, createDroneRig(), def.x, def.z, 0.5);
    this.def = def;
    this.id = def.id;
    this.group = def.group || 'depot';
    this.hp = this.maxHp = def.hp || 3;
    this.state = 'patrol';
    this.patrol = def.patrol || [[def.x, def.z]];
    this.wp = def.wp || 0;
    this.home = { x: def.x, z: def.z };
    this.stateT = 0; this.hurtT = 0; this.deadT = 0; this.coolT = 0; this.lostT = 0;
    this.hover = 1.3;
    this.present = true;
    this.shadow.scale.multiplyScalar(0.8);
    this.material = 'machine'; this.recentHitT = 0; this.staggers = []; this.steadyT = 0; this.stunT = 0;
    // the firing tell: a thin line toward Twinsen that brightens through the wind-up
    this.aimLine = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 4, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5), new THREE.MeshBasicMaterial({ color: '#ff5a3a', transparent: true, opacity: 0, depthWrite: false }));
    this.aimLine.visible = false; game.scene.add(this.aimLine);
  }
  get aimY() { return this.hover; }
  get markY() { return this.hover + 0.7; }
  melee(D) { this.damage(D.dmg, this.game.hero.pos, D.poise); return 'hit'; }
  ballHit(ball, p) { this.damage(ball.damage, p, ball.charged ? 3 : 1); return 'hit'; }
  // Baldino's pulse: the rotor stutters, it sags and can't fire for a while
  pulse(C) { if (!this.alive) return; this.state = 'stunned'; this.stateT = 0; this.stunT = C.stun; this.rig.hitFlash(); this.game.combatDir?.done(this); this.aimLine.visible = false; this.game.particles.burst(this.pos.x, this.pos.y + this.hover, this.pos.z, '#9fe8ff', 14, 3); }
  get alive() { return this.state !== 'dead'; }
  setPresent(on) { this.present = on; this.rig.root.visible = on && this.alive; this.shadow.visible = on && this.alive; }
  alert(pos) { if (this.alive && (this.state === 'patrol' || this.state === 'search')) { this.state = 'alerted'; this.stateT = 0; this.last = pos ? { x: pos.x, z: pos.z } : null; } }
  damage(n, from, poise = 1) {
    if (!this.alive) return;
    const g = this.game;
    this.hp -= n; this.rig.hitFlash(); this.recentHitT = 2.5;
    g.particles.burst(this.pos.x, this.pos.y + this.hover, this.pos.z, '#ffd27a', 10, 4);
    if (from) { const a = Math.atan2(this.pos.x - from.x, this.pos.z - from.z); this.kb.set(Math.sin(a) * 7, Math.cos(a) * 7); }
    // stagger cancels a charging shot, but not endlessly: after two staggers in 2 s it steadies for a moment
    const now = g.time; this.staggers = this.staggers.filter((t) => now - t < 2);
    if (this.state === 'stunned') { /* already down */ }
    else if (this.steadyT > 0 && poise < 3) { /* shrugs it off: flashes, keeps its action */ }
    else {
      this.hurtT = 0.45; this.rig.play('hurt'); this.staggers.push(now);
      if (this.staggers.length >= 2) this.steadyT = 1.6;
      if (this.state === 'windup') g.combatDir?.done(this);
      if (this.state !== 'chase') { this.state = 'chase'; this.rig.mood = 'alert'; }
      this.coolT = Math.max(this.coolT, 0.8);
      this.aimLine.visible = false;
    }
    if (this.hp <= 0) {
      g.combatDir?.done(this); this.aimLine.visible = false;
      this.state = 'dead'; this.deadT = 0;
      g.audio.play('break'); g.camRig.shake(0.2);
      g.particles.burst(this.pos.x, this.pos.y + this.hover, this.pos.z, '#ff9a3a', 30, 6);
      g.onEnemyKilled(this);
    }
  }
  // can it see Twinsen? cone + range + line of sight, scaled by his visibility
  sees(hero) {
    const d = this.distTo(hero);
    const vis = hero.visibility();
    if (hero.dead || vis <= 0.15 && d > 1.5) return false;
    const range = 9 * vis;
    if (d > range) return false;
    if (d > 1.8 && Math.abs(angleDiff(this.angle, this.angleTo(hero))) > 0.75) return false;
    const P = this.game.physics;
    return P.lineOfSight(this.pos.x, this.pos.y + this.hover, this.pos.z, hero.pos.x, hero.pos.y + 1.2, hero.pos.z);
  }
  update(dt) {
    if (!this.present) return;
    const g = this.game, hero = g.hero, P = g.physics, DF = g.combatDir?.diff || { windup: 1, cool: 1 };
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.coolT = Math.max(0, this.coolT - dt);
    this.recentHitT = Math.max(0, this.recentHitT - dt);
    this.steadyT = Math.max(0, this.steadyT - dt);
    this.stateT += dt;
    if (this.state !== 'windup' || !this.alive) this.aimLine.visible = false;
    if (this.state === 'stunned' && this.alive) {
      // sagging, sparking, harmless
      this.sagged = true; this.hover = Math.max(0.7, this.hover - dt * 2.5);
      this.rig.play('hurt'); this.rig.mood = 'search';
      if (Math.random() < dt * 8) g.particles.burst(this.pos.x, this.pos.y + this.hover + 0.3, this.pos.z, '#bff4ff', 2, 2);
      if (this.stateT > this.stunT) { this.state = 'chase'; this.stateT = 0; this.coolT = 0.6; }
      this.applyKnockback(dt); this.rig.update(dt); this.syncHover(); return;
    }
    // back up to its working height after a stun (whatever height the story gave it)
    if (this.alive && !(this instanceof Guardian)) { if (!this.sagged) this.baseHover = this.hover; else { this.hover = Math.min(this.baseHover, this.hover + dt * 1.5); if (this.hover >= this.baseHover) this.sagged = false; } }
    if (!this.alive) {
      // drops out of the air, smokes, then the wreck disappears
      this.deadT += dt;
      this.hover = Math.max(0.15, this.hover - dt * 3);
      this.rig.play('dead'); this.rig.update(dt);
      if (this.deadT < 1.5 && Math.random() < dt * 8) g.particles.burst(this.pos.x, this.pos.y + this.hover + 0.3, this.pos.z, '#5a5a5a', 2, 1);
      if (this.deadT > 3) { this.rig.root.visible = false; this.shadow.visible = false; }
      this.syncHover(); return;
    }
    const sees = this.sees(hero);
    const d = this.distTo(hero);
    let sp = 0, face = null;
    if (this.state === 'patrol') {
      this.rig.mood = 'calm';
      const [tx, tz] = this.patrol[this.wp];
      const dd = Math.hypot(tx - this.pos.x, tz - this.pos.z);
      if (dd < 0.6) { this.wp = (this.wp + 1) % this.patrol.length; this.stateT = 0; }
      face = Math.atan2(tx - this.pos.x, tz - this.pos.z);
      sp = this.stateT < 0.8 ? 0 : 1.6; // pause and look at each waypoint
      if (sees) { this.state = 'alerted'; this.stateT = 0; }
    } else if (this.state === 'alerted') {
      // "!" — a beat to react before it starts hunting
      this.rig.mood = 'alert';
      face = this.angleTo(hero);
      if (this.stateT < dt * 1.5) { g.audio.play('alert'); g.hud.float('!', { x: this.pos.x, y: this.pos.y + this.hover + 0.9, z: this.pos.z }, '#ff5a3a'); g.alertGroup(this.group, hero.pos, 0.6); }
      if (this.stateT > 0.6) { this.state = 'chase'; this.stateT = 0; }
    } else if (this.state === 'chase') {
      this.rig.mood = 'alert';
      face = this.angleTo(hero);
      if (sees) { this.lostT = 0; this.last = { x: hero.pos.x, z: hero.pos.z }; } else this.lostT += dt;
      // keep a firing distance of 4–6 m
      sp = d > 6 ? 2.2 : d < 3.5 ? -1.4 : 0;
      if (sees && d < 8 && this.coolT <= 0 && this.hurtT <= 0 && (g.combatDir?.canAttack(this) ?? true)) { this.state = 'windup'; this.stateT = 0; g.audio.play('zap'); }
      if (this.lostT > 3) { this.state = 'search'; this.stateT = 0; g.combatDir?.done(this); }
      if (Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z) > 24) { this.state = 'search'; this.stateT = 0; }
    } else if (this.state === 'windup') {
      // 0.7 s charge: prongs crackle, eye pulses — the cue to dodge or hide
      face = this.angleTo(hero);
      this.rig.play('windup');
      const tell = 0.75 * DF.windup;
      // the aim line: where the shot will go, brightening until it fires
      const L = this.aimLine, from = new THREE.Vector3(this.pos.x, this.pos.y + this.hover - 0.4, this.pos.z), to = new THREE.Vector3(hero.pos.x, hero.pos.y + 0.9, hero.pos.z);
      L.visible = true; L.position.copy(from); L.lookAt(to); L.scale.set(1, 1, from.distanceTo(to)); L.material.opacity = 0.15 + 0.6 * Math.min(1, this.stateT / tell);
      // no clear shot: give up the attack rather than fire into a wall
      if (!this.sees(hero)) { this.state = 'chase'; this.stateT = 0; g.combatDir?.done(this); }
      else if (this.hurtT > 0) { this.state = 'chase'; this.stateT = 0; }
      else if (this.stateT > tell) {
        const from = new THREE.Vector3(this.pos.x + Math.sin(this.angle) * 0.5, this.pos.y + this.hover - 0.4, this.pos.z + Math.cos(this.angle) * 0.5);
        const to = new THREE.Vector3(hero.pos.x, hero.pos.y + 0.9, hero.pos.z);
        g.bolts.fire(from, to.sub(from).normalize(), 9, 1);
        g.audio.play('zap');
        this.state = 'chase'; this.stateT = 0; this.coolT = 1.6 * DF.cool;
        this.rig.play('fire');
        g.combatDir?.done(this);
      }
    } else if (this.state === 'search') {
      this.rig.mood = 'search';
      const tgt = this.last || this.home;
      const dd = Math.hypot(tgt.x - this.pos.x, tgt.z - this.pos.z);
      face = dd > 0.8 ? Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z) : this.angle + dt * 1.5;
      sp = dd > 0.8 ? 1.8 : 0;
      if (sees) { this.state = 'alerted'; this.stateT = 0; }
      else if (this.stateT > 5) { this.state = 'patrol'; this.stateT = 0; this.last = null; }
    }
    if (face != null) this.angle = dampAngle(this.angle, face, this.state === 'windup' ? 6 : 4, dt);
    if (this.hurtT <= 0 && sp) P.move(this, Math.sin(this.angle) * sp * dt, Math.cos(this.angle) * sp * dt);
    else if (this.hurtT > 0) this.rig.play('hurt');
    else if (this.state !== 'windup' && this.rig.anim !== 'fire') this.rig.play('idle');
    if (this.rig.anim === 'fire' && this.rig.actionT > 0.3) this.rig.play('idle');
    this.applyKnockback(dt);
    this.rig.update(dt);
    this.syncHover();
  }
  syncHover() {
    const g = this.game;
    const gy = g.physics.groundAt(this.pos.x, this.pos.z);
    this.pos.y = gy;
    this.rig.root.position.set(this.pos.x, gy + this.hover, this.pos.z);
    this.rig.root.rotation.y = this.angle;
    this.shadow.visible = this.rig.root.visible;
    this.shadow.position.set(this.pos.x, gy + 0.03, this.pos.z);
  }
}

// ------------------------------------------------------------------ the bore's guardian (chapter 3 boss)
// A big maintenance drone that defends the conversion pylons. The ball can't break it: a hit stuns it
// for a few seconds (the window to line up a bank shot on a pylon). Its attack is readable: it stops,
// glows and hums for over a second, then fires a fan of three bolts — step sideways or duck behind a
// pylon. Each converted pylon makes it a little quicker; when the third is converted it loses power.
export class Guardian extends Drone {
  constructor(game, def) {
    super(game, def);
    this.rig.root.scale.setScalar(2.1);
    this.shadow.scale.multiplyScalar(2.2);
    this.hover = 2.6; this.hitR = 1.4; this.hitH = 4.2;
    this.arena = def.arena || null;
    this.level = 0; this.stunT = 0;
    this.hp = this.maxHp = 1e9;
    this.group = def.group || 'core';
    this.state = 'chase';
  }
  setLevel(n) { this.level = n; }
  damage(n, from) {
    if (!this.alive) return;
    const g = this.game;
    this.rig.hitFlash();
    g.audio.play('hit');
    g.particles.burst(this.pos.x, this.pos.y + this.hover, this.pos.z, '#9fe8ff', 22, 4);
    this.state = 'stunned'; this.stateT = 0; this.stunT = 2.6;
    if (from) { const a = Math.atan2(this.pos.x - from.x, this.pos.z - from.z); this.kb.set(Math.sin(a) * 5, Math.cos(a) * 5); }
  }
  powerDown() {
    if (!this.alive) return;
    const g = this.game;
    this.state = 'dead'; this.deadT = 0;
    g.audio.play('break'); g.camRig.shake(0.35);
    g.particles.burst(this.pos.x, this.pos.y + this.hover, this.pos.z, '#9fe8ff', 40, 6);
  }
  // keep circling the hero at a firing distance, inside the arena
  update(dt) {
    if (!this.present) return;
    if (!this.alive) { super.update(dt); return; }
    const g = this.game, hero = g.hero, P = g.physics;
    this.stateT += dt;
    let face = this.angleTo(hero), sp = 0;
    const d = this.distTo(hero);
    if (this.state === 'stunned') {
      // sags, sparks, can't attack
      this.hover = Math.max(1.4, this.hover - dt * 2.5);
      this.rig.play('hurt');
      if (Math.random() < dt * 10) g.particles.burst(this.pos.x, this.pos.y + this.hover + 0.6, this.pos.z, '#bff4ff', 2, 2);
      face = null;
      if (this.stateT > this.stunT) { this.state = 'chase'; this.stateT = 0; this.coolT = 0.8; }
    } else {
      this.hover = Math.min(2.6, this.hover + dt * 1.5);
      this.rig.mood = 'alert';
      if (this.state === 'chase') {
        sp = d > 7 ? 2.3 : d < 4.5 ? -1.6 : 0;
        // strafe a little so it doesn't sit in one place
        const side = Math.sin(this.stateT * 0.9) * 1.2;
        P.move(this, Math.cos(this.angle) * side * dt, -Math.sin(this.angle) * side * dt);
        this.coolT = Math.max(0, this.coolT - dt);
        if (this.coolT <= 0 && d < 12 && !hero.dead) { this.state = 'windup'; this.stateT = 0; g.audio.play('alert'); }
        this.rig.play('idle');
      } else if (this.state === 'windup') {
        // the tell: stops, glows, hums
        this.rig.play('windup');
        const tell = 1.35 - this.level * 0.15;
        if (Math.random() < dt * 14) g.particles.burst(this.pos.x + Math.sin(this.angle) * 1.1, this.pos.y + this.hover - 0.6, this.pos.z + Math.cos(this.angle) * 1.1, '#ffb070', 1, 1);
        if (this.stateT > tell) {
          const from = new THREE.Vector3(this.pos.x + Math.sin(this.angle) * 1.1, this.pos.y + this.hover - 0.8, this.pos.z + Math.cos(this.angle) * 1.1);
          const to = new THREE.Vector3(hero.pos.x, hero.pos.y + 0.9, hero.pos.z);
          const dir = to.sub(from).normalize();
          for (const off of [-0.32, 0, 0.32]) g.bolts.fire(from.clone(), dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), off), 8.5, 1);
          g.audio.play('zap');
          this.rig.play('fire');
          this.state = 'chase'; this.stateT = 0; this.coolT = 2.8 - this.level * 0.5;
        }
      }
    }
    if (face != null) this.angle = dampAngle(this.angle, face, 3, dt);
    if (sp) P.move(this, Math.sin(this.angle) * sp * dt, Math.cos(this.angle) * sp * dt);
    if (this.arena) {
      const A = this.arena;
      this.pos.x = Math.min(A.x1 - 1, Math.max(A.x0 + 1, this.pos.x));
      this.pos.z = Math.min(A.z1 - 1, Math.max(A.z0 + 1, this.pos.z));
    }
    this.applyKnockback(dt);
    this.rig.update(dt);
    this.syncHover();
  }
}

// ------------------------------------------------------------------ the sentry automaton (protected)
// A squat brass automaton of the Joint Project with a round shield. From the front its shield turns the
// ball and the sword away (a clang, sparks, Twinsen is pushed back). Its attack is a shield bash: it pulls
// the shield back and its eye flares (the tell), lunges, then stands open for a second (the opening). A
// heavy sword strike, a charged ball or the pulse tool breaks its guard; so does a hit from behind.
function createSentryRig() {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const brass = new THREE.MeshStandardMaterial({ color: '#c8a050', metalness: 0.55, roughness: 0.38 });
  const teal = new THREE.MeshStandardMaterial({ color: '#2f7a84', metalness: 0.3, roughness: 0.5 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2a3036', metalness: 0.4, roughness: 0.55 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#9ff4ff', emissive: '#30d0ff', emissiveIntensity: 2.2 });
  const add = (parent, geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  const lathe = (pts, n = 18) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
  // barrel torso, a domed head with one eye, a skirt of plates
  add(body, lathe([[0.001, 0.55], [0.38, 0.6], [0.46, 0.85], [0.44, 1.2], [0.34, 1.38], [0.001, 1.42]]), brass, 0, 0, 0);
  add(body, new THREE.TorusGeometry(0.45, 0.04, 6, 24).rotateX(Math.PI / 2), teal, 0, 0.9, 0);
  const head = new THREE.Group(); head.position.y = 1.42; body.add(head);
  add(head, new THREE.SphereGeometry(0.24, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), teal, 0, 0, 0);
  add(head, new THREE.CylinderGeometry(0.25, 0.25, 0.08, 18), dark, 0, 0.02, 0);
  const eye = add(head, new THREE.SphereGeometry(0.07, 10, 8), eyeMat, 0, 0.1, 0.2);
  // legs: two short pistons with round feet
  const legs = [-1, 1].map((sx) => { const g = new THREE.Group(); g.position.set(sx * 0.2, 0.6, 0); body.add(g); add(g, new THREE.CylinderGeometry(0.08, 0.1, 0.5, 8), dark, 0, -0.27, 0); add(g, new THREE.SphereGeometry(0.13, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), brass, 0, -0.55, 0.04); return g; });
  // the shield arm (left) and the club arm (right)
  const shieldArm = new THREE.Group(); shieldArm.position.set(0.5, 1.15, 0.05); body.add(shieldArm);
  add(shieldArm, new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8), dark, 0, -0.18, 0);
  const shield = new THREE.Group(); shield.position.set(-0.05, -0.32, 0.42); shieldArm.add(shield);
  add(shield, new THREE.CylinderGeometry(0.52, 0.52, 0.06, 28).rotateX(Math.PI / 2), brass, 0, 0, 0);
  add(shield, new THREE.TorusGeometry(0.52, 0.035, 6, 28), teal, 0, 0, 0.03);
  add(shield, new THREE.SphereGeometry(0.1, 10, 8), teal, 0, 0, 0.05);
  const clubArm = new THREE.Group(); clubArm.position.set(-0.5, 1.15, 0); body.add(clubArm);
  add(clubArm, new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8), dark, 0, -0.2, 0);
  add(clubArm, new THREE.CylinderGeometry(0.07, 0.05, 0.6, 8), teal, 0, -0.45, 0.22).rotation.x = 1.3;
  const rig = {
    root, anim: 'idle', t: 0, flash: 0, actionT: 0, guard: 1,
    play(a) { if (a !== this.anim) { this.anim = a; this.actionT = 0; } }, hitFlash() { this.flash = 1; },
    update(dt, speed = 0) {
      this.t += dt; this.actionT += dt;
      const a = this.anim, w = Math.sin(this.t * 9) * Math.min(1, speed);
      legs[0].rotation.x = w * 0.5; legs[1].rotation.x = -w * 0.5;
      body.position.y = Math.abs(w) * 0.04 + (a === 'stagger' ? -0.1 : 0);
      // shield: up in front (guard), pulled back (wind-up), swung (bash), dropped (open/stagger/stunned)
      const sh = a === 'windup' ? -0.9 : a === 'bash' ? 0.5 : a === 'open' || a === 'stagger' || a === 'stunned' ? 0.9 : 0;
      shieldArm.rotation.y += ((a === 'bash' ? -0.5 : 0) - shieldArm.rotation.y) * Math.min(1, dt * 14);
      shieldArm.rotation.x += (sh * 0.7 - shieldArm.rotation.x) * Math.min(1, dt * 12);
      shield.position.x += ((a === 'open' || a === 'stagger' || a === 'stunned' ? 0.25 : -0.05) - shield.position.x) * Math.min(1, dt * 10);
      clubArm.rotation.x += ((a === 'windup' ? -1.6 : a === 'bash' ? -0.4 : 0) - clubArm.rotation.x) * Math.min(1, dt * 12);
      body.rotation.z = a === 'stagger' || a === 'stunned' ? Math.sin(this.actionT * 18) * 0.08 : 0;
      if (a === 'dead') { body.rotation.x = Math.min(1.5, body.rotation.x + dt * 3); body.position.y = -0.2; }
      this.flash = Math.max(0, this.flash - dt * 4);
      eyeMat.color.set(a === 'windup' || a === 'bash' ? '#ff5a3a' : a === 'stunned' ? '#7a8a90' : '#9ff4ff');
      eyeMat.emissive.copy(eyeMat.color).multiplyScalar(0.8);
      eyeMat.emissiveIntensity = (a === 'windup' ? 3 + Math.sin(this.actionT * 30) : a === 'stunned' ? 0.2 : 2) + this.flash * 2;
      brass.emissive.setRGB(this.flash * 0.6, this.flash * 0.6, this.flash * 0.6);
    },
  };
  void eye; rig.j = {};
  return rig;
}

export class Sentry extends Actor {
  constructor(game, def) {
    super(game, createSentryRig(), def.x, def.z, 0.6);
    this.def = def; this.id = def.id; this.group = def.group || 'sentry';
    this.hp = this.maxHp = def.hp || 6;
    this.state = 'idle'; this.stateT = 0; this.coolT = 0; this.deadT = 0; this.hurtT = 0;
    this.home = { x: def.x, z: def.z };
    this.angle = def.angle ?? 0;
    this.present = true;
    this.material = 'armor'; this.aimY = 1.0; this.markY = 1.75; this.hitR = 0.85; this.hitH = 1.9; this.recentHitT = 0;
  }
  get alive() { return this.state !== 'dead'; }
  setPresent(on) { this.present = on; this.rig.root.visible = on && (this.alive || this.deadT < 2); this.shadow.visible = on && this.alive; }
  alert() { if (this.alive && this.state === 'idle') { this.state = 'chase'; this.stateT = 0; } }
  guarding() { return this.state === 'idle' || this.state === 'chase' || this.state === 'windup'; }
  // is the hit coming at the shield? (a cone in front)
  facesShield(from) { return this.guarding() && Math.abs(angleDiff(this.angle, Math.atan2(from.x - this.pos.x, from.z - this.pos.z))) < 1.15; }
  melee(D, h) {
    if (this.facesShield(h.pos)) {
      if (D.guardBreak) { this.breakGuard(); this.damage(Math.ceil(D.dmg / 2), h.pos); return 'hit'; }
      this.blocked(h.pos); return 'blocked';
    }
    this.damage(D.dmg, h.pos); return 'hit';
  }
  ballHit(ball, p) {
    if (this.facesShield(this.game.hero.pos)) {
      if (ball.charged) { this.breakGuard(); this.damage(1, p); return 'hit'; }
      this.blocked(p); return 'blocked';
    }
    this.damage(ball.damage, p); return 'hit';
  }
  pulse(C) { if (!this.alive) return; this.state = 'stunned'; this.stateT = 0; this.stunT = C.shieldDown; this.rig.hitFlash(); this.game.combatDir?.done(this); }
  blocked(from) {
    this.rig.hitFlash(); this.recentHitT = 2;
    if (this.state === 'idle') { this.state = 'chase'; this.stateT = 0; }
    void from;
  }
  breakGuard() { const g = this.game; this.state = 'stagger'; this.stateT = 0; g.combatDir?.done(this); g.audio.play('clang'); g.camRig.shake(0.15); }
  damage(n, from) {
    if (!this.alive) return;
    const g = this.game;
    this.hp -= n; this.rig.hitFlash(); this.recentHitT = 2.5; this.hurtT = 0.2;
    if (from) { const a = Math.atan2(this.pos.x - from.x, this.pos.z - from.z); this.kb.set(Math.sin(a) * 3, Math.cos(a) * 3); } // heavy: barely moves
    if (this.state === 'idle') { this.state = 'chase'; this.stateT = 0; }
    if (this.hp <= 0) { this.state = 'dead'; this.deadT = 0; g.combatDir?.done(this); g.audio.play('break'); g.camRig.shake(0.25); g.particles.burst(this.pos.x, this.pos.y + 1, this.pos.z, '#ffd27a', 30, 5); g.onEnemyKilled(this); }
  }
  update(dt) {
    if (!this.present) return;
    const g = this.game, hero = g.hero, P = g.physics, DF = g.combatDir?.diff || { windup: 1, cool: 1 };
    this.stateT += dt; this.coolT = Math.max(0, this.coolT - dt); this.recentHitT = Math.max(0, this.recentHitT - dt); this.hurtT = Math.max(0, this.hurtT - dt);
    if (!this.alive) { this.deadT += dt; this.rig.play('dead'); this.rig.update(dt, 0); if (this.deadT > 2) this.rig.root.visible = false; this.sync(); return; }
    const d = this.distTo(hero);
    let sp = 0, face = null;
    const sees = !hero.dead && d < 9 && hero.visibility() > 0.2 && P.lineOfSight(this.pos.x, this.pos.y + 1.4, this.pos.z, hero.pos.x, hero.pos.y + 1.1, hero.pos.z);
    switch (this.state) {
      case 'idle':
        this.rig.play('idle');
        if (sees && (d < 6 || Math.abs(angleDiff(this.angle, this.angleTo(hero))) < 1)) { this.state = 'chase'; this.stateT = 0; g.audio.play('alert'); }
        break;
      case 'chase':
        face = this.angleTo(hero); this.rig.play('walk');
        sp = d > 1.9 ? 1.7 : 0;
        if (d < 2.4 && this.coolT <= 0 && this.stateT > 0.4 && (g.combatDir?.canAttack(this) ?? true)) { this.state = 'windup'; this.stateT = 0; g.audio.play('alert'); }
        // it won't follow far from its post
        if (Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z) > 14 || d > 16) { this.state = 'home'; this.stateT = 0; g.combatDir?.done(this); }
        break;
      case 'windup':
        face = this.angleTo(hero); this.rig.play('windup');
        if (this.stateT > 0.7 * DF.windup) { this.state = 'bash'; this.stateT = 0; this.hitDone = false; }
        break;
      case 'bash':
        this.rig.play('bash'); sp = 4.2;
        if (!this.hitDone && d < 1.5 && Math.abs(angleDiff(this.angle, this.angleTo(hero))) < 0.9) { this.hitDone = true; hero.damage(2, this.pos, true); g.audio.play('clang'); }
        if (this.stateT > 0.28) { this.state = 'open'; this.stateT = 0; g.combatDir?.done(this); }
        break;
      case 'open':
        // the opening: shield down, panting steam
        this.rig.play('open');
        if (Math.random() < dt * 6) g.particles.burst(this.pos.x, this.pos.y + 1.5, this.pos.z, '#e8e8e8', 1, 1);
        if (this.stateT > 1.1) { this.state = 'chase'; this.stateT = 0; this.coolT = 1.4 * DF.cool; }
        break;
      case 'stagger':
        this.rig.play('stagger');
        if (this.stateT > 1.3) { this.state = 'chase'; this.stateT = 0; this.coolT = 0.8; }
        break;
      case 'stunned':
        this.rig.play('stunned');
        if (Math.random() < dt * 8) g.particles.burst(this.pos.x, this.pos.y + 1.5, this.pos.z, '#bff4ff', 2, 2);
        if (this.stateT > this.stunT) { this.state = 'chase'; this.stateT = 0; this.coolT = 0.6; }
        break;
      case 'home': {
        const dx = this.home.x - this.pos.x, dz = this.home.z - this.pos.z;
        this.rig.play('walk');
        if (Math.hypot(dx, dz) < 0.5) { this.state = 'idle'; this.stateT = 0; this.hp = Math.min(this.maxHp, this.hp + 2); }
        else { face = Math.atan2(dx, dz); sp = 1.5; }
        if (sees && d < 5) { this.state = 'chase'; this.stateT = 0; }
        break;
      }
    }
    if (face != null) this.angle = dampAngle(this.angle, face, this.state === 'bash' ? 1 : 3.5, dt);
    if (sp) P.move(this, Math.sin(this.angle) * sp * dt, Math.cos(this.angle) * sp * dt);
    this.applyKnockback(dt);
    P.fall(this, dt);
    this.rig.update(dt, sp);
    this.sync();
  }
}

// ------------------------------------------------------------------ the crystal crawler (heavy)
// A mite grown huge. Slow; it controls space with a ground slam: it rears up and a ring spreads on the
// ground around it (the tell, a full second), then crashes down — anyone inside the ring and on the ground
// is knocked over. After a slam it sits stunned for a moment, crystals dim (the opening). Light hits only
// flash it; heavy strikes and charged throws stagger it briefly.
export class Crawler extends Mite {
  constructor(game, def) {
    super(game, def);
    this.radius = 0.9;
    this.rig.root.scale.setScalar(2.1);
    this.shadow.scale.multiplyScalar(2.2);
    this.hp = this.maxHp = def.hp || 12;
    this.material = 'stone'; this.aimY = 0.9; this.markY = 2.0; this.hitR = 1.2; this.hitH = 2.0;
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff8a5a', transparent: true, opacity: 0, depthWrite: false }));
    ring.visible = false; game.scene.add(ring); this.ring = ring;
    this.slamR = 3.0;
  }
  melee(D) { this.damage(D.dmg, this.game.hero.pos, D.poise); return 'hit'; }
  ballHit(ball, p) { this.damage(ball.damage, p, ball.charged ? 4 : 1); return 'hit'; }
  damage(n, from, poise = 1) {
    if (!this.alive) return;
    const g = this.game;
    this.hp -= n; this.rig.hitFlash(); this.recentHitT = 2.5;
    g.particles.burst(this.pos.x, this.pos.y + 1, this.pos.z, '#bff8ff', 8, 4);
    // heavy: only big hits stagger it, and never during a slam already falling
    if (poise >= 3 && this.state !== 'slam') { this.hurtT = 0.5; if (this.state === 'windup') { this.state = 'chase'; this.ring.visible = false; g.combatDir?.done(this); } this.coolT = Math.max(this.coolT, 0.8); }
    if (this.hp <= 0) { this.state = 'dead'; this.ring.visible = false; g.combatDir?.done(this); g.audio.play('break'); g.camRig.shake(0.35); g.particles.burst(this.pos.x, this.pos.y + 0.8, this.pos.z, '#bff8ff', 50, 6); g.onEnemyKilled(this); }
  }
  update(dt) {
    if (!this.present) return;
    const g = this.game, hero = g.hero, DF = g.combatDir?.diff || { windup: 1, cool: 1 };
    this.hurtT = Math.max(0, this.hurtT - dt); this.coolT = Math.max(0, this.coolT - dt); this.recentHitT = Math.max(0, this.recentHitT - dt);
    if (!this.alive) { this.ring.visible = false; super.update(dt); return; }
    const d = this.distTo(hero);
    this.stateT += dt;
    let sp = 0;
    if (this.state === 'idle') {
      this.rig.play('idle');
      if (d < 9 && !hero.dead && hero.visibility() > 0.2) { this.state = 'chase'; this.stateT = 0; g.audio.play('alert'); }
    } else if (this.state === 'chase') {
      this.angle = dampAngle(this.angle, this.angleTo(hero), 3, dt);
      this.rig.play('walk');
      sp = d > 2.2 ? 1.6 : 0;
      if (d < this.slamR + 0.3 && this.coolT <= 0 && this.hurtT <= 0 && (g.combatDir?.canAttack(this) ?? true)) { this.state = 'windup'; this.stateT = 0; g.audio.play('zap'); }
      if (Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z) > 16 || d > 18) { this.state = 'idle'; g.combatDir?.done(this); }
    } else if (this.state === 'windup') {
      this.rig.play('windup');
      const tell = 1.0 * DF.windup, k = Math.min(1, this.stateT / tell);
      this.ring.visible = true; this.ring.position.set(this.pos.x, this.pos.y + 0.06, this.pos.z);
      this.ring.scale.setScalar(this.slamR * (0.3 + 0.7 * k)); this.ring.material.opacity = 0.25 + 0.5 * k;
      if (this.stateT > tell) { this.state = 'slam'; this.stateT = 0; }
    } else if (this.state === 'slam') {
      this.rig.play('lunge');
      if (!this.slammed) {
        this.slammed = true; g.audio.play('slam'); g.camRig.shake(0.4);
        g.particles.burst(this.pos.x, this.pos.y + 0.2, this.pos.z, '#d8ccb0', 30, 5);
        if (d < this.slamR + hero.radius && hero.onGround) hero.damage(2, this.pos, true);
      }
      this.ring.material.opacity *= 0.8;
      if (this.stateT > 0.25) { this.state = 'recover'; this.stateT = 0; this.slammed = false; this.ring.visible = false; g.combatDir?.done(this); }
    } else if (this.state === 'recover') {
      this.rig.play('idle');
      if (this.stateT > 1.3) { this.state = 'chase'; this.stateT = 0; this.coolT = 1.2 * DF.cool; }
    } else this.state = 'chase';
    if (sp && this.hurtT <= 0) g.physics.move(this, Math.sin(this.angle) * sp * dt, Math.cos(this.angle) * sp * dt);
    this.applyKnockback(dt);
    g.physics.fall(this, dt);
    this.rig.update(dt, sp * 0.5);
    this.sync();
  }
}

export function createEnemy(game, def) {
  if (def.kind === 'guard' || def.kind === 'guardG' || def.kind === 'fclone') return new Guard(game, def);
  if (def.kind === 'gdog') return new GuardDog(game, def);
  if (def.kind === 'guardian') return new Guardian(game, def);
  if (def.kind === 'sentry') return new Sentry(game, def);
  if (def.kind === 'crawler') return new Crawler(game, def);
  if (def.kind === 'drone') return new Drone(game, def);
  return new Mite(game, def);
}

// ------------------------------------------------------------------ watcher (stealth)
// A patrolling person who can't hurt anyone but raises the alarm when they
// see the player: used for Zoe's infiltration of the project office.
// Shows a vision cone on the floor so the player can read it.
export class Watcher {
  constructor(game, npc, patrol, opts = {}) {
    this.game = game;
    this.npc = npc;
    this.patrol = patrol;
    this.wp = 0;
    this.waitT = 1;
    this.range = opts.range ?? 6.5;
    this.fov = opts.fov ?? 0.75;
    this.onSpot = opts.onSpot;
    this.suspicion = 0;
    this.active = false;
    const geo = new THREE.CircleGeometry(this.range, 24, -this.fov, this.fov * 2);
    geo.rotateX(-Math.PI / 2); geo.rotateY(Math.PI / 2);
    this.cone = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: '#ffe080', transparent: true, opacity: 0.16, depthWrite: false }));
    this.cone.visible = false;
    game.scene.add(this.cone);
  }
  start() { this.active = true; this.wp = 0; this.waitT = 1; this.suspicion = 0; const [x, z] = this.patrol[0]; this.npc.placeAt({ x, z, a: 0, track: null }); this.cone.visible = true; }
  stop() { this.active = false; this.cone.visible = false; }
  update(dt) {
    if (!this.active) return;
    const g = this.game, n = this.npc, hero = g.hero, P = g.physics;
    const [tx, tz] = this.patrol[this.wp];
    const d = Math.hypot(tx - n.pos.x, tz - n.pos.z);
    let moving = false;
    if (this.suspicion > 0.35) {
      // something caught their eye: stop and stare toward it
      n.angle = dampAngle(n.angle, n.angleTo(hero), 4, dt);
    } else if (d < 0.4) {
      this.waitT -= dt;
      n.angle = dampAngle(n.angle, n.angle + 1.2 * Math.sin(g.time * 0.8), 2, dt); // look around
      if (this.waitT <= 0) { this.wp = (this.wp + 1) % this.patrol.length; this.waitT = 1.5 + Math.random(); }
    } else {
      n.angle = dampAngle(n.angle, Math.atan2(tx - n.pos.x, tz - n.pos.z), 5, dt);
      P.move(n, Math.sin(n.angle) * 1.2 * dt, Math.cos(n.angle) * 1.2 * dt);
      moving = true;
    }
    // vision: cone + line of sight, slower to notice a sneaking or hidden player
    const hd = n.distTo(hero);
    const inCone = hd < this.range && Math.abs(angleDiff(n.angle, n.angleTo(hero))) < this.fov
      && P.lineOfSight(n.pos.x, n.pos.y + 1.6, n.pos.z, hero.pos.x, hero.pos.y + (hero.hiding ? 0.6 : 1.2), hero.pos.z);
    const vis = hero.visibility();
    const rate = inCone ? (hd < 2 ? 3 : 1.3) * Math.max(0.15, vis) * (1.2 - hd / this.range) : -0.6;
    this.suspicion = clamp(this.suspicion + rate * dt, 0, 1);
    if (this.suspicion >= 1) { this.suspicion = 0; this.onSpot?.(); }
    n.rig.play(moving ? 'walk' : 'idle');
    n.rig.update(dt, moving ? 1.2 : 0);
    n.sync();
    this.cone.position.set(n.pos.x, n.pos.y + 0.04, n.pos.z);
    this.cone.rotation.y = n.angle;
    this.cone.material.color.setRGB(1, 1 - this.suspicion * 0.7, 0.5 - this.suspicion * 0.4);
    this.cone.material.opacity = 0.14 + this.suspicion * 0.2;
  }
}
