// Baldino's hop-pack (EQ-1): a short-hop jetpack, this sequel's own invention (LBA2 had a jetpack of its own; nothing
// here is taken from it). Twinsen gets it from Baldino in chapter 10 (src/game/story/arsenal.js), after every chapter
// whose puzzles a higher jump could skip. It is a gadget worn on his back (game.hero.arms.jetpack / jetpackOn, saved
// with the hero); the inventory puts it on and takes it off. Gadgets (gadgets.js) owns this module: it updates and
// resets it with the other gadgets; Hero.update (actors.js) calls step() before its own move and fall.
//
// How it works (the rules the world is audited against: STORY_BIBLE.md "Baldino's hop-pack", tests/jetpack.mjs):
//  - Athletic only: jump, keep holding the action key (Space / pad A / the touch ⬤): once the jump stops rising
//    fast the pack lights. A fresh press in the air lights it too. Letting go cuts it.
//  - One storey: it lifts him at most JET.cap above the ground he took off from, and never more than JET.cap above
//    the ground under him (so it can't ride up a slope or a stack of ledges in one flight).
//  - It pushes against the ground: with no ground within JET.grip under the feet (a cliff edge, a gap, a drop) the
//    thrust fades out over JET.fade and he falls as from any jump. So it never carries him over a drop he couldn't
//    climb back from (any spot it can hold him over is at most ~0.6 m below the take-off level), never off an
//    island (the sea and the cloud sea are not ground: nobody moves over them) and never across a chasm.
//  - Near the ground, holding it brakes a fall (the cushion): a soft landing from a drop he walked off.
//  - Fuel: JET.fuel seconds of thrust; it refills by itself on firm ground (JET.recharge from empty) — no item to
//    buy, nothing to grind.
//  - Open sky only: not in interiors or underground (rooms that aren't `outdoor`), never as Zoé or in the borrowed
//    coat, and it won't light under anything solid overhead (a ceiling check on every lit frame; he can't rise into
//    an overhang, an arch or a bridge from below).
//  - Its feet must clear a fence: while the pack has him airborne, a thin unstandable thing (railings, fences,
//    palisades) blocks him unless his feet are above its top (the ordinary step-up allowance doesn't apply).
//  - Doors and exits don't trigger while he is in the air after lighting it (he lands first).
//  - Interruptions: dialogue, menus, cut-scenes, a transition, a hit, death or a scene change put it out at once;
//    after any of them it needs a fresh press. Saves are never made in the air (main.js snapshot), and a save that
//    puts him somewhere invalid is moved to safe ground on load (afterLoad).
import * as THREE from 'three';
import { writeBodyStencil } from './characters.js';
import { Kit } from './props.js';
import { GRAVITY, STEP_UP, WATER_FLOOR } from '../engine/physics.js';

export const JET = {
  cap: 2.4,          // m: the highest lift above the take-off ground (and above the ground under him); a jump: ~1.2
  grip: 3.1,         // m: the pack needs ground this close under the feet...
  fade: 1.0,         // ...and loses it over the next metre
  spread: 0.9,       // m: the jet pushes on the highest ground within this radius of his feet
  fuel: 2.2,         // s of thrust from full
  recharge: 1.4,     // s from empty to full, on firm ground
  delay: 0.3,        // s on firm ground before it refills
  climb: 3.0,        // m/s: the fastest rise
  sink: 1.6,         // m/s: the fastest controlled sink (the cushion, or above the ceiling)
  respond: 6,        // 1/s: how quickly it reaches the wanted vertical speed
  airSpeed: 3.0,     // m/s: horizontal speed while it fires (a run is 5.4: it hovers, it doesn't race)
  steer: 4.0,        // 1/s: gentle steering while it fires
  engageVy: 2.6,     // m/s: a held jump hands over to the pack once rising slower than this
  head: 1.75,        // m: his head, for the ceiling check
  fenceClear: 0.15,  // m: his feet must be this far above a fence's top to pass over it (so fences of ~2.4 m and more,
                     //    built against a jump, hold against the pack too)
};

// ---------------------------------------------------------------- the model (built here; Baldino's style)
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o });
export function jetpackModel() {
  const g = new THREE.Group(), k = new Kit(g);
  const brass = M('#e0b25a', { metalness: 0.7, roughness: 0.32 }), copper = M('#c8743a', { metalness: 0.6, roughness: 0.35 });
  const lilac = M('#9a7ab8', { roughness: 0.6 }), leather = M('#5a3a24', { roughness: 0.85 }), iron = M('#3a3632', { metalness: 0.4, roughness: 0.5 });
  const red = M('#e8403a', { roughness: 0.5 });
  for (const m of [iron, leather, red]) m.userData.noShadow = true;   // (thin parts: no shadow passes for them)
  // the body (merged per material: one draw each): a fat copper tank between two brass cylinders, a lilac Esmer-enamel
  // cap (Baldino's workshop colours), iron bands, the nozzles
  k.add(new THREE.CapsuleGeometry(0.1, 0.16, 4, 12), copper, 0, 0, 0, 0, { sz: 0.8 });
  for (const s of [-1, 1]) {
    k.add(new THREE.CylinderGeometry(0.055, 0.06, 0.3, 10), brass, s * 0.12, -0.02, 0.01);
    k.add(new THREE.TorusGeometry(0.058, 0.01, 4, 12), iron, s * 0.12, 0.06, 0.01, 0, { rx: Math.PI / 2 });
    k.add(new THREE.CylinderGeometry(0.04, 0.03, 0.07, 10, 1, true), iron, s * 0.12, -0.18, 0.01);
  }
  k.add(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), lilac, 0, 0.17, 0, 0, { sy: 0.55, sz: 0.8 });
  // his signature: a bent little antenna with a red bobble (like the one on his workshop's roof)
  k.at(0.07, 0.2, -0.02, 0, () => {
    k.add(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 4), iron, 0.027, 0.075, 0, 0, { rz: -0.35 });
    k.add(new THREE.SphereGeometry(0.018, 6, 4), red, 0.056, 0.155, 0);
  });
  // straps over the shoulders (they meet the tunic's yoke at the front)
  for (const s of [-1, 1]) k.add(new THREE.TorusGeometry(0.13, 0.016, 4, 10, Math.PI * 0.9), leather, s * 0.11, 0.1, 0.16, Math.PI / 2, { rz: Math.PI / 2 + s * 0.05 });
  k.flush();
  for (const o of g.children) o.castShadow = !o.material.userData.noShadow;
  // the gauge on top: a glass bead that shows the charge (lit blue full, amber low, red empty)
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshStandardMaterial({ color: '#cfefff', emissive: '#4ab8ff', emissiveIntensity: 1.6, roughness: 0.2 }));
  lamp.position.set(0, 0.235, 0.02); g.add(lamp);
  // the vanes: one brass blade across each nozzle, folded flat up its side when stowed, swung out when ready
  const nozzles = [], vanes = [];
  const vaneGeo = new THREE.BoxGeometry(0.12, 0.006, 0.05).translate(0.05, 0, 0);
  for (const s of [-1, 1]) {
    const n = new THREE.Group(); n.position.set(s * 0.12, -0.18, 0.01); g.add(n);
    const p = new THREE.Group(); p.position.set(s * 0.04, 0.02, 0); n.add(p);
    const v = new THREE.Mesh(vaneGeo, brass); v.scale.x = s; p.add(v);
    vanes.push({ p, s }); p.rotation.z = s * 1.35;   // (folded: stowed)
    nozzles.push(n);
  }
  // the flames: two additive cones (one shared material, faded out off play), hidden while it doesn't fire
  const flameMat = new THREE.MeshBasicMaterial({ color: '#ffd38a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const flameGeo = new THREE.ConeGeometry(0.035, 0.32, 8, 1, true).rotateX(Math.PI).translate(0, -0.16, 0);   // (the tip points down)
  const flames = nozzles.map((n) => { const f = new THREE.Mesh(flameGeo, flameMat); f.position.y = -0.03; f.renderOrder = 6; f.castShadow = false; f.visible = false; n.add(f); return f; });
  writeBodyStencil(g);
  g.userData = { lamp, flames, flameMat, vanes, nozzles };
  return g;
}

export class Jetpack {
  constructor(game) {
    this.game = game;
    this.fuel = 1;           // 0..1
    this.firing = false;     // lit this frame
    this.thrust = 0;         // 0..1 how hard it pushes (the ground grip)
    this.air = false;        // airborne after lighting it (until he stands on firm ground again)
    this.launchY = null;     // the ground he last stood on firmly
    this.firmT = 0;          // time on firm ground (the refill waits a moment)
    this.needPress = false;  // after an interruption the key must be let go and pressed again
    this.prevT = -1; this.stepT = -1;
    this.denyT = -9; this.why = null; this.whyT = 0;
    this.puffT = 0; this.soundT = 0;
    this.model = null;
    this.stats = { flights: 0, fired: 0, cushions: 0, bonks: 0, fences: 0, denied: {}, lowFuel: 0 };
  }
  get h() { return this.game.hero; }
  owned(h = this.h) { return !!h.arms?.jetpack; }
  worn(h = this.h) { return this.owned(h) && !!h.arms.jetpackOn && h.body !== 'zoe' && h.body !== 'worker'; }
  // why it can't fire here and now (null: it can) — the open sky, his body, the story's control
  blocked(h = this.h) {
    const g = this.game;
    if (!this.worn(h)) return 'off';
    if (g.room && !g.room.outdoor) return 'roof';
    if (h.noBehaviours) return 'story';
    return null;
  }
  // the inventory: put it on, take it off
  toggleWorn() {
    const g = this.game, a = this.h.arms;
    if (!a?.jetpack) return false;
    a.jetpackOn = !a.jetpackOn;
    if (!a.jetpackOn) this.cut();
    g.audio.play(a.jetpackOn ? 'tick' : 'put');
    g.hud.toast(a.jetpackOn ? 'a_toast_jeton' : 'a_toast_jetoff', { k: g.input?.label?.('action') || 'Space' });
    return true;
  }

  // ---------------------------------------------------------------- the flight (Hero.update, before move and fall)
  // wx, wz: the horizontal velocity his controls ask for. Adjusts hero.vy and hero.vel; physics.fall then integrates.
  step(h, dt, input, wx, wz) {
    const g = this.game, P = g.physics;
    // an interruption (dialogue, a menu, a cut-scene, a fade): the pack went out, and wants a fresh press
    if (this.prevT >= 0 && g.time - this.prevT > 0.12) { this.needPress = true; this.cut(); }
    this.prevT = g.time; this.stepT = g.time;
    const held = input.down('action'), pressed = input.pressed('action');
    if (!held || pressed) this.needPress = false;   // (let go, or pressed again: re-armed)
    if (h.onGround && !h.sliding) {
      // firm ground: the take-off level, and the refill
      if (this.air && this.stats) this.landed(h);
      this.launchY = h.pos.y; this.firmT += dt; this.air = false;
      if (this.firmT > JET.delay && this.fuel < 1) this.fuel = Math.min(1, this.fuel + dt / JET.recharge);
      this.firing = false; this.thrust = 0;
      return;
    }
    this.firmT = 0;
    if (this.launchY == null) this.launchY = h.pos.y;
    if (h.onGround) { this.firing = false; this.thrust = 0; return; }   // (sliding down a slope: no take-off from there)
    let want = h.behaviour === 'athletic' && held && !this.needPress && this.worn(h) && h.hurtT <= 0.15 && h.actT <= 0 && !h.dead;
    if (want && !this.firing && !(h.vy < JET.engageVy || pressed)) want = false;   // (the jump's own push first)
    if (want) { const why = this.blocked(h); if (why) { this.deny(why); want = false; } }
    if (want && this.fuel <= 0) { this.deny('empty'); want = false; }
    if (!want) { if (this.firing) this.cut(); return; }
    // the ground under him (its jet spreads a little: the highest ground within JET.spread): the pack pushes against it
    const p = h.pos, gb = this.groundNear(p.x, p.z, p.y), hag = p.y - gb;
    const k = Math.max(0, Math.min(1, 1 - (hag - JET.grip) / JET.fade));
    if (k <= 0) { this.deny('ground'); if (this.firing) this.cut(); return; }
    const ceil = Math.min(this.launchY + JET.cap, gb + JET.cap);
    let target = Math.max(-JET.sink, Math.min(JET.climb, (ceil - p.y) * 2.4));
    // nothing solid overhead (an arch, an overhang, a bridge): no rising into it
    const over = this.headroom(h);
    if (over < 0.2 && target > 0) {
      target = 0;
      if (h.vy > 0.3) { h.vy = 0; this.stats.bonks++; g.audio.play('clunk'); }
      if (over < 0.05) { this.deny('roof'); this.cut(); return; }
    }
    if (!this.firing) this.ignite(h);
    const r = 1 - Math.exp(-JET.respond * k * dt);
    h.vy += (target - h.vy) * r + GRAVITY * dt * k;   // (fall() takes the gravity off again: lit, the jump's own is off)
    if (h.vy < -4 && hag < 2.2) this.cushioning = true;
    // gentle steering at a walking pace; a running jump's momentum fades into it
    const ws = Math.hypot(wx, wz), sc = ws > JET.airSpeed ? JET.airSpeed / ws : 1;
    const s = 1 - Math.exp(-JET.steer * dt);
    h.vel.x += (wx * sc - h.vel.x) * s; h.vel.y += (wz * sc - h.vel.y) * s;
    const v = Math.hypot(h.vel.x, h.vel.y);
    if (v > JET.airSpeed) h.vel.multiplyScalar(Math.max(JET.airSpeed / v, Math.exp(-2.5 * dt)));
    this.fuel = Math.max(0, this.fuel - (dt / JET.fuel) * k);
    if (this.fuel <= 0) { this.stats.lowFuel++; this.sound('sputter'); }
    h.jumpBuf = 0;
    this.firing = true; this.thrust = k; this.air = true;
  }
  ignite(h) {
    this.stats.fired++;
    if (!this.air) this.stats.flights++;
    this.sound('ignite');
    const g = this.game;
    g.particles.burst(h.pos.x, h.pos.y + 0.1, h.pos.z, '#d8ccb0', 6, 1.6);
  }
  cut() { if (this.firing) this.sound('off'); this.firing = false; this.thrust = 0; }
  landed(h) {
    if (this.cushioning) { this.stats.cushions++; this.cushioning = false; }
    this.game.particles.burst(h.pos.x, h.pos.y + 0.05, h.pos.z, '#cbb994', 5, 1.5);
  }
  deny(why) {
    const g = this.game;
    this.why = why; this.whyT = g.time;
    this.stats.denied[why] = (this.stats.denied[why] || 0) + 1;
    if (g.time - this.denyT < 1.5) return;
    this.denyT = g.time;
    if (why === 'empty') { this.sound('sputter'); return; }
    if (why === 'ground') { this.sound('sputter'); return; }
    if (why === 'roof') { g.audio.play('notReady'); g.hud.toast('a_toast_jetroof'); }
  }
  // the highest ground the jet pushes against: under him and round him within JET.spread (the sea is no ground)
  groundNear(x, z, y) {
    const P = this.game.physics;
    let best = -Infinity;
    for (let i = -1; i < 8; i++) {
      const a = i * Math.PI / 4, px = i < 0 ? x : x + Math.sin(a) * JET.spread, pz = i < 0 ? z : z + Math.cos(a) * JET.spread;
      const gi = P.groundInfo(px, pz, y);
      if (!gi.brick && gi.h < WATER_FLOOR) continue;
      if (gi.h > best) best = gi.h;
    }
    return best === -Infinity ? P.groundAt(x, z, y) : best;
  }
  // metres between the top of his head and the lowest solid thing over it (Infinity: open sky)
  headroom(h) {
    const P = this.game.physics, p = h.pos;
    let best = Infinity;
    for (const c of P.near(p.x, p.z)) {
      if (!c.enabled || !(c.bottom > p.y + 0.3)) continue;
      if (!P._inside(c, p.x, p.z, h.radius * 0.8)) continue;
      best = Math.min(best, c.bottom - (p.y + JET.head));
    }
    return best;
  }
  // after physics.move: a thin unstandable thing (a fence, a railing) stops him unless his feet clear its top
  // (the ordinary step-up allowance would let him pass through its top half-metre)
  clearance(h) {
    if (!this.air || h.onGround) return;
    const P = this.game.physics, p = h.pos;
    for (const c of P.near(p.x, p.z)) {
      if (!c.enabled || !c.noStand || c.stair) continue;
      if (!(c.top > p.y - JET.fenceClear && c.top <= p.y + STEP_UP && c.bottom < p.y + 1.7)) continue;
      if (!P._inside(c, p.x, p.z, h.radius)) continue;
      p.x = h.prevPos.x; p.z = h.prevPos.z;
      h.vel.multiplyScalar(0.2);
      this.stats.fences++;
      return;
    }
  }

  // ---------------------------------------------------------------- every play frame (gadgets.update)
  update(dt) {
    const g = this.game, h = this.h;
    if (h.dead && (this.firing || this.air)) { this.cut(); this.air = false; }
    // no doors or exits while he is in the air on it: he lands first
    if (this.air && !h.onGround) g.doorCool = Math.max(g.doorCool || 0, 0.1);
    this.updateModel(dt);
    if (this.firing) {
      this.puffT -= dt; this.soundT -= dt;
      const n = this.model?.userData.nozzles;
      if (this.puffT <= 0 && n) {
        this.puffT = 0.06;
        const v = new THREE.Vector3();
        n[Math.random() < 0.5 ? 0 : 1].getWorldPosition(v);
        g.particles.burst(v.x, v.y - 0.12, v.z, this.fuel < 0.25 ? '#ffb070' : '#fff0d0', 1, 0.6);
        const gb = g.physics.groundAt(h.pos.x, h.pos.z, h.pos.y);
        if (h.pos.y - gb < 1.3) g.particles.burst(h.pos.x, gb + 0.05, h.pos.z, '#cbb994', 1, 1.8);
      }
      if (this.soundT <= 0) { this.soundT = 0.08; this.sound('roar'); }
    }
    g.hud.jet?.(this.hudState());
  }
  // what the HUD shows: the charge, firing or not, and why it's out
  hudState() {
    const g = this.game, h = this.h;
    const recent = g.time - this.whyT < 1.6 ? this.why : null;
    return {
      show: this.worn(h) && h.behaviour === 'athletic' && (this.firing || this.fuel < 0.999 || !!recent),
      fuel: this.fuel, firing: this.firing, low: this.fuel < 0.25, why: recent, pos: h.pos,
    };
  }
  updateModel(dt) {
    const g = this.game, h = this.h, torso = h.rig.j?.torso;
    const on = this.worn(h);
    if (!torso) return;
    if (on && !this.model) { this.model = jetpackModel(); }
    const m = this.model;
    if (!m) return;
    if (m.parent !== torso) { torso.add(m); m.position.set(0, 0.33, -0.27); m.rotation.set(0.12, 0, 0); }
    m.visible = on;
    if (!on) return;
    const U = m.userData;
    // the vanes open in Athletic (ready), fold flat when stowed
    const ready = h.behaviour === 'athletic' ? 1 : 0;
    this.open = (this.open ?? ready) + (ready - (this.open ?? ready)) * (1 - Math.exp(-8 * dt));
    for (const v of U.vanes) v.p.rotation.z = v.s * (1.35 - this.open * 1.1);
    for (const n of U.nozzles) n.rotation.x = -0.15 * this.open;
    const fl = this.firing ? this.thrust * (0.8 + Math.random() * 0.3) : 0;
    for (const f of U.flames) { f.visible = fl > 0.01; f.scale.set(1, Math.max(0.01, fl * (this.fuel < 0.2 ? 0.6 : 1)), 1); }
    this._flameK = fl;
    if (!U.flameMat._guard) {
      // never a flame frozen in the air: off play (dialogue, menus, a fade) or with no flight step this frame
      U.flameMat._guard = true;
      for (const f of U.flames) f.onBeforeRender = () => { const live = g.state === 'play' && !g.trans && g.time - this.stepT < 0.08; U.flameMat.opacity = live ? 0.85 * Math.min(1, this._flameK * 1.4) : 0; };
    }
    const lc = this.fuel < 0.02 ? '#ff3a2a' : this.fuel < 0.25 ? '#ffa030' : '#4ab8ff';
    U.lamp.material.emissive.set(lc);
    U.lamp.material.emissiveIntensity = this.firing ? 2.4 : 1.4;
  }
  // a scene change, a load, Zoé's turn: out, on the ground, full again on the next firm step
  reset() {
    this.cut(); this.air = false; this.needPress = true; this.launchY = null; this.firmT = 0; this.cushioning = false;
    this.game.hud.jet?.({ show: false });
  }
  // a loaded save: never in the air, never in the sea or inside something (older saves, an edited save)
  afterLoad() {
    const g = this.game, h = this.h, P = g.physics, p = h.pos;
    this.reset(); this.fuel = 1;
    const gi = P.groundInfo(p.x, p.z, p.y + 0.6);
    // (inside something: his centre well inside a solid brick taller than a step, not a stair)
    const inside = P.near(p.x, p.z).some((c) => c.enabled && !c.stair && !c.seeThrough && c.top > gi.h + STEP_UP && c.bottom < gi.h + 1.6 && P._inside(c, p.x, p.z, -0.1));
    const bad = !Number.isFinite(p.x + p.y + p.z) || (gi.h < WATER_FLOOR && !gi.brick) || inside;
    if (bad) {
      const s = g.room?.spawn || g.lastSafe;
      if (s) { p.set(s.x, P.groundAt(s.x, s.z), s.z); g.lastSafe = { x: s.x, z: s.z }; }
      this.stats.rescued = (this.stats.rescued || 0) + 1;
    } else p.y = gi.h;
    h.vy = 0; h.onGround = true; h.vel?.set(0, 0);
    return bad;
  }

  sound(kind) {
    const au = this.game.audio;
    if (!au?.ctx || au.ctx.state !== 'running') return;
    // short, separate bursts only: nothing keeps sounding when the frames stop (a pause, a dialogue, a fade)
    if (kind === 'roar') au._burst({ dur: 0.1, vol: 0.035 * (0.6 + this.thrust * 0.4), f: 700, f1: 520, type: 'bandpass', q: 0.9 });
    if (kind === 'ignite') { au._burst({ dur: 0.12, vol: 0.07, f: 1600, f1: 500, type: 'bandpass', q: 1.2 }); au._tone({ type: 'triangle', f0: 180, f1: 320, dur: 0.12, vol: 0.04 }); }
    if (kind === 'off') au._tone({ type: 'sine', f0: 300, f1: 160, dur: 0.1, vol: 0.03 });
    if (kind === 'sputter') for (let i = 0; i < 3; i++) au._burst({ dur: 0.03, vol: 0.04, f: 900, f1: 600, type: 'bandpass', q: 2, at: i * 0.07 });
  }
}
