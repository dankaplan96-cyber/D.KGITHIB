// Twinsen's gadgets, used from the inventory (LBA2: "select it in the inventory"): the Nitro-Meca-Penguin, the
// protection spell, Arthur's conch and the lantern. Numbers and descriptions after LBA2 where it has them; the
// models, sounds and code are ours. Where each comes from: src/game/story/arsenal.js.
//
//  - Meca-penguin (one use, 4 kashes; LBA2: "it'll explode a few seconds later", "in a level and unencumbered
//    area"): wound up and set down in front of Twinsen, it waddles forward for 7 s, turning at walls. Enemies within
//    11 m that can see it go for it instead of Twinsen (Gadgets.updateEnemies runs their update with the penguin
//    standing in for him). Their hits and bolts wreck it; at the end, or wrecked, it pops: 2 damage within 2.2 m.
//  - Protection spell (3 magic; LBA2's tunic "shielding spell"): 15 s of a pale shell; damage taken is halved.
//  - Conch (Arthur's): a deep call. Guard dogs within 14 m cower for 3 s; people within 16 m turn to look; on
//    Citadel the Dino-Fly (he can't fly any more) lifts his head and answers.
//  - Lantern: on or off. A warm light in Twinsen's left hand (one of the light pool's sources, so no shader
//    recompiles); it shows what the dark places hide (story/arsenal.js: the nooks).
import * as THREE from 'three';
import { writeBodyStencil } from './characters.js';
import { hitEnemy } from './weapons.js';

export const GADGET = {
  penguin: { life: 7, speed: 1.3, lureR: 11, hp: 2, popR: 2.2, popDmg: 2 },
  protect: { mp: 3, dur: 15, k: 0.5 },
  conch: { cool: 4, dogR: 14, dogStun: 3, folkR: 16, dinoR: 70 },
  lantern: { color: '#ffcf80', intensity: 3.2, distance: 8, decay: 1.4 },
};

const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, ...o });
function penguinModel() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const add = (geo, m, x, y, z, s = null) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (s) o.scale.set(...s); o.castShadow = true; body.add(o); return o; };
  const black = M('#22262e', { roughness: 0.4, metalness: 0.3 }), white = M('#f2f0e8', { roughness: 0.5 }), orange = M('#f0902a', { roughness: 0.5 }), brass = M('#e0b25a', { metalness: 0.75, roughness: 0.3 });
  add(new THREE.SphereGeometry(0.2, 14, 12), black, 0, 0.27, 0, [1, 1.3, 0.95]);
  add(new THREE.SphereGeometry(0.16, 12, 10), white, 0, 0.25, 0.07, [1, 1.3, 0.8]);
  add(new THREE.SphereGeometry(0.13, 12, 10), black, 0, 0.58, 0.01);
  add(new THREE.ConeGeometry(0.04, 0.12, 8).rotateX(Math.PI / 2), orange, 0, 0.57, 0.15);
  for (const s of [-1, 1]) {
    add(new THREE.SphereGeometry(0.03, 8, 6), white, s * 0.055, 0.63, 0.1);
    add(new THREE.SphereGeometry(0.015, 6, 4), black, s * 0.058, 0.635, 0.125);
    add(new THREE.BoxGeometry(0.03, 0.2, 0.08), black, s * 0.2, 0.3, 0, null).rotation.z = s * 0.35;
    add(new THREE.BoxGeometry(0.08, 0.025, 0.12), orange, s * 0.07, 0.015, 0.04);
  }
  // the wind-up key on its back (it turns while the penguin walks)
  const key = new THREE.Group(); key.position.set(0, 0.32, -0.21); body.add(key);
  const k1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6).rotateX(Math.PI / 2), brass); k1.position.z = -0.04; key.add(k1);
  const k2 = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12), brass); k2.position.z = -0.09; key.add(k2);
  g.userData.body = body; g.userData.key = key;
  return g;
}
function lanternModel() {
  const g = new THREE.Group();
  const brass = M('#e0b25a', { metalness: 0.7, roughness: 0.35 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 4, 10), brass); ring.position.y = 0.0; g.add(ring);
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.06, 8), brass); top.position.y = -0.07; g.add(top);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.13, 8), new THREE.MeshStandardMaterial({ color: '#fff2c8', emissive: '#ffb84a', emissiveIntensity: 0, roughness: 0.2 })); glass.position.y = -0.165; g.add(glass);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.03, 8), brass); base.position.y = -0.245; g.add(base);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 4), brass); bar.position.set(Math.cos(a) * 0.065, -0.165, Math.sin(a) * 0.065); g.add(bar); }
  g.userData.glass = glass;
  writeBodyStencil(g);
  return g;
}

export class Gadgets {
  constructor(game) {
    this.game = game;
    this.penguin = null;
    this.protectT = 0; this.conchCool = 0;
    this.looks = [];          // people turned toward the conch: [{npc, t}]
    this.dino = null;          // the Dino-Fly's lift when he answers
    this.stats = { lured: 0, pops: 0, conchDogs: 0, conchFolk: 0, dinoAnswered: 0, protectedHits: 0 };
    // the protection shell
    this.shell = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: '#a8e0ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.shell.visible = false; this.shell.renderOrder = 6; game.scene.add(this.shell);
    // the lantern's light: a source of the light pool (main.js puts it in), dark until lit
    this.light = new THREE.PointLight(GADGET.lantern.color, 0, GADGET.lantern.distance, GADGET.lantern.decay);
    this.light.name = 'lantern';
    game.scene.add(this.light);
  }
  get h() { return this.game.hero; }
  get arms() { return this.h.arms; }
  // the factor on damage Twinsen takes (Hero.damage)
  damageK() { if (this.protectT > 0) { this.stats.protectedHits++; return GADGET.protect.k; } return 1; }

  // ---- use (from the inventory). Returns true when it did something.
  use(id) {
    switch (id) {
      case 'penguin': return this.placePenguin();
      case 'protect': return this.castProtect();
      case 'conch': return this.blowConch();
      case 'lantern': return this.toggleLantern();
    }
    return false;
  }

  placePenguin() {
    const g = this.game, h = this.h, a = this.arms, G = GADGET.penguin, P = g.physics;
    if (!(a.penguins > 0)) { g.hud.toast('a_toast_nopenguin'); g.audio.play('deny'); return false; }
    if (this.penguin) { g.hud.toast('a_toast_onepenguin'); g.audio.play('deny'); return false; }
    // LBA2: "in a level and unencumbered area": the spot ahead must be flat ground, the way ahead open for a metre
    const fx = Math.sin(h.angle), fz = Math.cos(h.angle), x = h.pos.x + fx * 0.9, z = h.pos.z + fz * 0.9;
    const y = P.groundAt(x, z, h.pos.y + 0.6);
    const open = Math.abs(y - h.pos.y) < 0.35 && !P.blockedAt(x, z, y, 0.3) && !P.blockedAt(x + fx * 0.8, z + fz * 0.8, y, 0.3) && !P.steepAt(x, z, y);
    if (!open) { g.hud.toast('a_toast_penguinroom'); g.audio.play('deny'); return false; }
    a.penguins--;
    const m = penguinModel();
    m.position.set(x, y, z); m.rotation.y = h.angle;
    g.scene.add(m);
    const pg = { m, pos: m.position, angle: h.angle, t: G.life, hp: G.hp, radius: 0.35, onGround: true, vy: 0 };
    // what an enemy sees in its place while lured (the fields their update reads from game.hero)
    pg.proxy = {
      pos: pg.pos, radius: 0.35, dead: false, onGround: true, hiding: false, isLure: true, behaviour: 'normal', speed: G.speed,
      get angle() { return pg.angle; },
      visibility: () => 1.3,
      damage: (n) => this.hitPenguin(n),
      distTo(o) { return Math.hypot(o.pos.x - pg.pos.x, o.pos.z - pg.pos.z); },
      angleTo(o) { return Math.atan2(o.pos.x - pg.pos.x, o.pos.z - pg.pos.z); },
    };
    this.penguin = pg;
    this.sound('wind');
    h.act('use', 0.45);
    return true;
  }
  hitPenguin() {
    const pg = this.penguin; if (!pg) return;
    pg.hp--; this.game.particles.burst(pg.pos.x, pg.pos.y + 0.4, pg.pos.z, '#f2f0e8', 6, 2);
    this.game.audio.play('clunk');
    if (pg.hp <= 0) this.popPenguin();
  }
  popPenguin() {
    const g = this.game, pg = this.penguin, G = GADGET.penguin; if (!pg) return;
    this.penguin = null;
    g.scene.remove(pg.m);
    g.particles.burst(pg.pos.x, pg.pos.y + 0.4, pg.pos.z, '#ffd27a', 26, 5);
    g.particles.burst(pg.pos.x, pg.pos.y + 0.4, pg.pos.z, '#22262e', 10, 3);
    g.audio.play('break'); g.camRig.shake(0.2);
    this.stats.pops++;
    for (const e of g.enemies) {
      if (!e.alive || !e.present || Math.hypot(e.pos.x - pg.pos.x, e.pos.z - pg.pos.z) > G.popR + (e.radius || 0.5)) continue;
      const res = hitEnemy(e, G.popDmg, { x: pg.pos.x, y: pg.pos.y + 0.5, z: pg.pos.z }, true);
      g.impact(e.pos.x, e.pos.y + 0.8, e.pos.z, res === 'blocked' ? 'armor' : (e.material || 'flesh'), res, 0.8);
    }
  }
  // the penguin is the one an enemy goes for: it is near enough, and the enemy can see it
  lures(e) {
    const pg = this.penguin;
    if (!pg || !e.alive || !e.present) return false;
    const d = Math.hypot(e.pos.x - pg.pos.x, e.pos.z - pg.pos.z);
    if (d > GADGET.penguin.lureR) return false;
    return this.game.physics.lineOfSight(e.pos.x, e.pos.y + 1.0, e.pos.z, pg.pos.x, pg.pos.y + 0.5, pg.pos.z);
  }
  // main.js: every enemy's update, with the penguin standing in for Twinsen for those it lures
  updateEnemies(dt) {
    const g = this.game;
    for (const e of g.enemies) {
      if (this.penguin && this.lures(e)) {
        const h = g.hero; g.hero = this.penguin.proxy;
        if (!e._lured) { e._lured = true; this.stats.lured++; }
        try { e.update(dt); } finally { g.hero = h; }
      } else { e._lured = false; e.update(dt); }
    }
  }
  stepPenguin(dt) {
    const g = this.game, pg = this.penguin, G = GADGET.penguin, P = g.physics;
    if (!pg) return;
    pg.t -= dt;
    if (pg.t <= 0) { this.popPenguin(); return; }
    // waddle forward; at a wall or a drop, turn a quarter
    const fx = Math.sin(pg.angle), fz = Math.cos(pg.angle), s = G.speed * dt;
    const nx = pg.pos.x + fx * s, nz = pg.pos.z + fz * s, ny = P.groundAt(nx, nz, pg.pos.y + 0.5);
    if (Math.abs(ny - pg.pos.y) > 0.4 || P.blockedAt(nx + fx * 0.3, nz + fz * 0.3, pg.pos.y, 0.25)) pg.angle += Math.PI / 2;
    else { pg.pos.set(nx, ny, nz); }
    pg.m.rotation.y = pg.angle;
    const b = pg.m.userData.body; b.rotation.z = Math.sin(g.time * 11) * 0.16; b.position.y = Math.abs(Math.sin(g.time * 11)) * 0.03;
    pg.m.userData.key.rotation.z += dt * 9;
    // the enemies' bolts wreck it
    const list = g.bolts?.list || [];
    for (let i = list.length - 1; i >= 0; i--) {
      const bp = list[i].m.position;
      if (!list[i].reflected && Math.hypot(bp.x - pg.pos.x, bp.z - pg.pos.z) < 0.45 && bp.y > pg.pos.y - 0.1 && bp.y < pg.pos.y + 0.9) { g.scene.remove(list[i].m); list.splice(i, 1); this.hitPenguin(); if (!this.penguin) return; }
    }
  }

  castProtect() {
    const g = this.game, h = this.h, G = GADGET.protect;
    if (h.mp < G.mp) { g.hud.toast('a_toast_nomp'); g.audio.play('deny'); return false; }
    h.mp -= G.mp;
    this.protectT = G.dur;
    this.sound('protect');
    g.particles.burst(h.pos.x, h.pos.y + 1, h.pos.z, '#a8e0ff', 18, 3);
    g.hud.toast('a_toast_protect');
    return true;
  }

  blowConch() {
    const g = this.game, h = this.h, C = GADGET.conch;
    if (this.conchCool > 0) { g.audio.play('notReady'); return false; }
    this.conchCool = C.cool;
    this.sound('conch');
    h.act('use', 0.9);
    let dogs = 0, folk = 0;
    for (const e of g.enemies) {
      if (!e.alive || !e.present || e.def?.kind !== 'gdog' || !e.pulse) continue;
      if (Math.hypot(e.pos.x - h.pos.x, e.pos.z - h.pos.z) > C.dogR) continue;
      e.pulse({ stun: C.dogStun }); dogs++;
      g.hud.float('?', { x: e.pos.x, y: e.pos.y + 1.3, z: e.pos.z }, '#ffe35a');
    }
    for (const n of g.npcs) {
      if (!n.present || n.talking || Math.hypot(n.pos.x - h.pos.x, n.pos.z - h.pos.z) > C.folkR) continue;
      if (Math.abs(n.pos.y - h.pos.y) > 6) continue;
      if (!n.listenTo) { n.listenTo = h; this.looks.push({ npc: n, t: 2.6 }); }
      g.hud.float('!', { x: n.pos.x, y: n.pos.y + 2.3, z: n.pos.z }, '#ffffff');
      folk++;
    }
    // on Citadel the Dino-Fly hears it from his garden: the head comes up, a happy rumble
    let dino = false;
    if (!g.room) {
      const df = g.scene.getObjectByName('dinofly');
      if (df && Math.hypot(df.position.x - h.pos.x, df.position.z - h.pos.z) < C.dinoR) {
        this.dino = { o: df, y0: this.dino?.y0 ?? df.position.y, t: 0 };
        dino = true; this.stats.dinoAnswered++;
        setTimeout(() => { if (g.audio) g.audio.play('rumble'); }, 700);
        g.hud.float('♪', { x: df.position.x, y: df.position.y + 2.2, z: df.position.z }, '#7fef7a');
      }
    }
    this.stats.conchDogs += dogs; this.stats.conchFolk += folk;
    this.lastConch = { dogs, folk, dino };
    return true;
  }

  toggleLantern() {
    const a = this.arms; if (!a.lantern) return false;
    a.lanternOn = !a.lanternOn;
    this.game.audio.play(a.lanternOn ? 'tick' : 'put');
    this.game.hud.toast(a.lanternOn ? 'a_toast_lanternon' : 'a_toast_lanternoff');
    return true;
  }
  lanternLit() { return !!(this.arms?.lantern && this.arms.lanternOn) && this.h.body !== 'zoe' && this.h.body !== 'worker'; }

  updateLantern() {
    const h = this.h, on = this.lanternLit(), L = this.light;
    L.intensity = on ? GADGET.lantern.intensity * (0.94 + Math.sin(this.game.time * 13) * 0.03 + Math.sin(this.game.time * 5.3) * 0.03) : 0;
    L.position.set(h.pos.x + Math.sin(h.angle) * 0.35, h.pos.y + 1.35, h.pos.z + Math.cos(h.angle) * 0.35);
    const hand = h.rig.j?.armL?.hand;
    if (on && !this.lantern && hand) this.lantern = lanternModel();
    if (this.lantern) {
      if (hand && this.lantern.parent !== hand) hand.add(this.lantern);
      this.lantern.visible = on;
      this.lantern.userData.glass.material.emissiveIntensity = on ? 2.2 : 0;
    }
  }

  update(dt) {
    const g = this.game, h = this.h;
    this.conchCool = Math.max(0, this.conchCool - dt);
    this.stepPenguin(dt);
    // the shell: a slow pulse, fading over its last two seconds
    if (this.protectT > 0) {
      this.protectT = Math.max(0, this.protectT - dt);
      const k = Math.min(1, this.protectT / 2);
      this.shell.visible = true;
      this.shell.position.set(h.pos.x, h.pos.y + 0.95, h.pos.z);
      this.shell.scale.setScalar(1.05 + Math.sin(g.time * 4) * 0.03);
      this.shell.material.opacity = (0.14 + Math.sin(g.time * 6) * 0.04) * k;
    } else this.shell.visible = false;
    for (let i = this.looks.length - 1; i >= 0; i--) { const L = this.looks[i]; L.t -= dt; if (L.t <= 0) { if (L.npc.listenTo === h) L.npc.listenTo = null; this.looks.splice(i, 1); } }
    if (this.dino) {
      const D = this.dino; D.t += dt;
      const k = D.t < 1.6 ? Math.sin((D.t / 1.6) * Math.PI) : 0;
      D.o.position.y = D.y0 + k * 0.32;
      D.o.rotation.z = Math.sin(D.t * 9) * 0.03 * k;
      if (D.t >= 1.6) { D.o.position.y = D.y0; D.o.rotation.z = 0; this.dino = null; }
    }
    this.updateLantern();
  }
  // a scene change: the penguin stays behind (it is gone), the shell and the lantern go with him
  reset() {
    if (this.penguin) { this.game.scene.remove(this.penguin.m); this.penguin = null; }
    for (const L of this.looks) if (L.npc.listenTo === this.h) L.npc.listenTo = null;
    this.looks = [];
  }
  sound(kind) {
    const au = this.game.audio;
    if (!au?.ctx || au.ctx.state !== 'running') return;
    if (kind === 'wind') for (let i = 0; i < 6; i++) au._tone({ type: 'square', f0: 1500 + i * 60, dur: 0.025, vol: 0.02, at: i * 0.06 });
    if (kind === 'protect') { [392, 523, 659].forEach((f, i) => au._tone({ type: 'sine', f0: f, f1: f * 1.01, dur: 0.5, vol: 0.06, at: i * 0.08 })); }
    if (kind === 'conch') { au._tone({ type: 'sawtooth', f0: 98, f1: 104, dur: 1.6, vol: 0.09 }); au._tone({ type: 'triangle', f0: 196, f1: 206, dur: 1.5, vol: 0.06, at: 0.05 }); au._burst({ dur: 1.4, vol: 0.05, f: 500, f1: 380, type: 'bandpass', q: 3 }); }
  }
}
