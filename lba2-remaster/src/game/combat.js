// Combat: every tunable number in one place, the input buffer, targeting (soft target + lock-on), the
// attack director (how many enemies may attack at once, the grace period after a scene change), and the
// hero's combat controller (melee moves with startup / active / recovery, the dodge, the ball throw and
// its charge, the pulse tool, weapon swapping).
//
// Rules worth knowing when balancing:
//  - Melee damage lands only during a move's active frames, along the swept arc of the strike; a target
//    is hit at most once per move. The forward step stops short of the target and goes through physics.
//  - One buffered press, kept for COMBAT.buffer seconds. Presses during dialogue, pause or a transition are
//    dropped (the buffer is cleared whenever play resumes).
//  - The dodge cancels recovery, never startup or active frames. Its invulnerability covers the middle of
//    the hop only; a short cooldown keeps it from being the only answer.
//  - The ball: see MagicBall in actors.js for the flight rules (substepped collision, ricochets, return).
import * as THREE from 'three';
import { angleDiff, clamp } from '../engine/math.js';

export const COMBAT = {
  buffer: 0.22,              // s an attack/dodge press is remembered
  comboWindow: 0.38,         // s after a move's recovery in which the next press continues the combo
  turnRate: 16,              // rad/s the hero may turn toward the target during startup
  turnLimit: 1.9,            // rad: targets further round than this are ignored by the melee turn
  softRange: 9,              // m: soft target range (ball)
  meleeAssist: 3.2,          // m: melee turn-to-target range
  lockRange: 14, lockBreak: 17, lockLosGrace: 1.5,
  assistCone: { off: 0, low: 0.22, normal: 0.42, high: 0.7 },   // rad half-angle for soft targeting
  dodge: { dur: 0.36, dist: 3.1, iStart: 0.04, iEnd: 0.27, cooldown: 0.28, cancelFrom: 0.62 },
  // quickDur: the throw holds the controls only this long (the follow-through then blends out over walking or
  // idle on the rig's upper-body layer until ~0.62 s, without holding anything up)
  throw: { quickRelease: 0.16, quickDur: 0.36, windHold: 0.12, chargeAfter: 0.2, chargeFull: 0.75, moveK: 0.6, chargeMoveK: 0.42, // (charging: a slow aimed walk)
    releaseAfterCharge: 0.08 },
  hitStop: { light: 0.045, heavy: 0.085 },
  pulse: { range: 4.8, cone: 0.75, recharge: 5.0, stun: 2.6, shieldDown: 3.2 },
  tokens: { gentle: 1, normal: 2, hard: 3 },
  grace: 1.2,                // s after regaining control before any enemy may start an attack
  difficulty: {
    gentle: { dmg: 0.5, windup: 1.3, cool: 1.35 },
    normal: { dmg: 1, windup: 1, cool: 1 },
    hard: { dmg: 1.5, windup: 0.85, cool: 0.8 },
  },
};

// Melee moves. s/a/r = startup, active, recovery (s). arc = blade sweep from → to (rad, relative to the
// facing; + is to Twinsen's left). reach = from his centre. poise = stagger power. step = forward step (m).
export const MOVES = {
  jab: { anim: 'punch', s: 0.07, a: 0.08, r: 0.17, reach: 1.35, arc: [0.5, -0.5], dmg: 1, poise: 1, step: 0.3, sound: 'punch', mat: 'flesh' },
  jab2: { anim: 'punch2', s: 0.07, a: 0.08, r: 0.18, reach: 1.35, arc: [-0.5, 0.5], dmg: 1, poise: 1, step: 0.3, sound: 'punch', mat: 'flesh' },
  kick: { anim: 'kick', s: 0.13, a: 0.1, r: 0.3, reach: 1.7, arc: [0.35, -0.35], dmg: 2, poise: 2, step: 0.45, sound: 'punch', mat: 'flesh' },
  slash1: { anim: 'slash1', s: 0.11, a: 0.1, r: 0.22, reach: 2.05, arc: [1.25, -1.15], dmg: 2, poise: 1, step: 0.45, sound: 'swing' },
  slash2: { anim: 'slash2', s: 0.1, a: 0.1, r: 0.24, reach: 2.05, arc: [-1.2, 1.2], dmg: 2, poise: 1, step: 0.4, sound: 'swing' },
  slash3: { anim: 'slash3', s: 0.19, a: 0.09, r: 0.4, reach: 2.25, arc: [0.3, -0.3], dmg: 3, poise: 3, step: 0.6, sound: 'swingHeavy', heavy: true },
  heavy: { anim: 'heavy', s: 0.1, a: 0.1, r: 0.5, reach: 2.35, arc: [0.35, -0.35], dmg: 4, poise: 4, step: 0.7, sound: 'swingHeavy', heavy: true, guardBreak: true },
  // the Wannie glove (weapons.js): two slower, heavy punches; knock: how hard an enemy is thrown back (m/s);
  // deflect: an enemy bolt in front goes back the way it came; glove: it breaks weak boards (story/arsenal.js)
  glove1: { anim: 'punch', s: 0.13, a: 0.1, r: 0.28, reach: 1.6, arc: [0.5, -0.5], dmg: 2, poise: 3, step: 0.4, sound: 'punch', mat: 'flesh', knock: 11, deflect: true, glove: true },
  glove2: { anim: 'punch2', s: 0.16, a: 0.1, r: 0.42, reach: 1.7, arc: [-0.5, 0.5], dmg: 2, poise: 4, step: 0.5, sound: 'swingHeavy', mat: 'flesh', knock: 14, deflect: true, glove: true, heavy: true, guardBreak: true },
};
export const COMBOS = { fists: ['jab', 'jab2', 'kick'], sword: ['slash1', 'slash2', 'slash3'], glove: ['glove1', 'glove2'] };
export const HEAVY_HOLD = 0.72; // s from the press, holding attack with the sword through the first strike → a heavy strike on release

export const WEAPONS = ['ball', 'sword', 'pulse', 'fists', 'blowgun', 'laser', 'glove', 'lightning'];
export const WEAPON_INFO = {
  fists: { icon: '✊' }, ball: { icon: '✦' }, sword: { icon: '⚔' }, pulse: { icon: '⌁' },
  blowgun: { icon: '➶' }, laser: { icon: '✺' }, glove: { icon: '✋' }, lightning: { icon: '☇' },
};
const MELEE = new Set(['fists', 'sword', 'glove']);
const SHOOT = new Set(['blowgun', 'laser', 'lightning']);   // fired by weapons.js

// ------------------------------------------------------------------ input buffer
export class InputBuffer {
  constructor() { this.a = null; this.t = 0; }
  press(action, now) { this.a = action; this.t = now; }
  peek(action, now) { return this.a === action && now - this.t <= COMBAT.buffer; }
  take(action, now) { if (this.peek(action, now)) { this.a = null; return true; } return false; }
  clear() { this.a = null; }
}

// ------------------------------------------------------------------ the attack director
export class CombatDirector {
  constructor(game) { this.game = game; this.holders = new Set(); this.grace = 0; }
  get diff() { return COMBAT.difficulty[this.game.settings.difficulty] || COMBAT.difficulty.normal; }
  update(dt) {
    this.grace = Math.max(0, this.grace - dt);
    for (const e of this.holders) if (!e.alive || !e.present) this.holders.delete(e);
  }
  // may this enemy start an attack now?
  canAttack(e) {
    if (this.grace > 0 || e.def?.passive) return false;
    if (this.holders.has(e)) return true;
    const max = COMBAT.tokens[this.game.settings.difficulty] ?? 2;
    if (this.holders.size >= max) return false;
    this.holders.add(e); return true;
  }
  done(e) { this.holders.delete(e); }
  calm(t = COMBAT.grace) { this.grace = Math.max(this.grace, t); }
  reset() { this.holders.clear(); this.calm(); }
}

// ------------------------------------------------------------------ targeting
const markerTex = (() => {
  let tex = null;
  return () => {
    if (tex) return tex;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.strokeStyle = '#2a1a00'; x.lineWidth = 5;
    x.beginPath(); x.moveTo(14, 16); x.lineTo(50, 16); x.lineTo(32, 46); x.closePath(); x.stroke(); x.fill();
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
  };
})();

export class Targeting {
  constructor(game) {
    this.game = game;
    this.lock = null; this.soft = null; this.losT = 0;
    this.marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTex(), color: '#ffd23a', depthTest: false, transparent: true }));
    this.marker.scale.setScalar(0.42); this.marker.renderOrder = 20; this.marker.visible = false;
    // a slim health bar under the marker, only for the target in focus
    const bc = document.createElement('canvas'); bc.width = 128; bc.height = 16; this.barCtx = bc.getContext('2d');
    this.barTex = new THREE.CanvasTexture(bc); this.barTex.colorSpace = THREE.SRGBColorSpace;
    this.bar = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.barTex, depthTest: false, transparent: true }));
    this.bar.scale.set(0.9, 0.11, 1); this.bar.renderOrder = 20; this.bar.visible = false;
    game.scene.add(this.marker, this.bar);
    this.barFor = null; this.barHp = -1;
  }
  cone() { return COMBAT.assistCone[this.game.settings.aimAssist || 'normal'] ?? 0.42; }
  // enemies Twinsen could reasonably mean: alive, here, not behind a wall
  visible(e, range) {
    const h = this.game.hero;
    if (!e.alive || !e.present || e.def?.noTarget) return false;
    const d = h.distTo(e);
    if (d > range) return false;
    const ey = e.pos.y + (e.aimY ?? 0.6);
    return this.game.physics.lineOfSight(h.pos.x, h.pos.y + 1.2, h.pos.z, e.pos.x, ey, e.pos.z);
  }
  // best enemy along a direction: angle matters most, then distance
  pick(dir, range, cone) {
    const h = this.game.hero;
    let best = null, bs = 1e9;
    const da = Math.atan2(dir.x, dir.z);
    for (const e of this.game.enemies) {
      if (!this.visible(e, range)) continue;
      const a = Math.abs(angleDiff(da, h.angleTo(e)));
      const d = h.distTo(e);
      // close enemies get a slightly wider cone (they cover more of the view)
      const c = cone + Math.atan2(e.radius || 0.5, Math.max(d, 0.5)) * 0.8;
      if (a > c) continue;
      const s = a * 3 + d / range;
      if (s < bs) { bs = s; best = e; }
    }
    return best;
  }
  get current() { return this.lock || this.soft; }
  // what a throw along `aim` means: the lock, an enemy in the cone, or a switch / target in the cone
  // (Aim Assist Off: only a deliberate lock; nothing is picked for you)
  throwTarget(aim) {
    if (this.lock) return this.lock;
    const cone = this.cone();
    if (cone <= 0) return null;
    const e = this.pick(aim, COMBAT.softRange, cone);
    if (e) return e;
    const g = this.game, h = g.hero, P = g.physics, da = Math.atan2(aim.x, aim.z);
    let best = null, bs = 1e9;
    for (const t of g.ballAimTargets()) {
      if (t.enemy) continue;
      const d = Math.hypot(t.x - h.pos.x, t.z - h.pos.z);
      if (d > 14 || d < 0.8) continue;
      const a = Math.abs(angleDiff(da, Math.atan2(t.x - h.pos.x, t.z - h.pos.z)));
      if (a > Math.max(cone, 0.3)) continue;
      if (!P.clearTo(h.pos.x, h.pos.y + 1.4, h.pos.z, t.x, t.y, t.z, 0.8)) continue;
      const sc = a * 3 + d / 14;
      if (sc < bs) { bs = sc; best = t; }
    }
    return best;
  }
  toggleLock(dir) {
    if (this.lock) { this.release(); return; }
    this.lock = this.pick(dir, COMBAT.lockRange, 1.25) || this.nearest(COMBAT.lockRange);
    this.losT = 0;
    if (this.lock) this.game.audio.play('lockOn');
  }
  nearest(range) {
    const h = this.game.hero; let best = null, bd = range;
    for (const e of this.game.enemies) if (this.visible(e, range) && h.distTo(e) < bd) { bd = h.distTo(e); best = e; }
    return best;
  }
  // the next target to the left (-1) or right (+1) of the current one, as seen from Twinsen
  cycle(sign = 1) {
    const h = this.game.hero, cur = this.lock;
    if (!cur) return;
    const base = h.angleTo(cur);
    let best = null, bv = 1e9;
    for (const e of this.game.enemies) {
      if (e === cur || !this.visible(e, COMBAT.lockRange)) continue;
      let a = angleDiff(base, h.angleTo(e)) * -sign; // positive = in the asked direction
      if (a <= 0) a += Math.PI * 2;
      if (a < bv) { bv = a; best = e; }
    }
    if (best) { this.lock = best; this.losT = 0; this.game.audio.play('lockOn'); }
  }
  release() { this.lock = null; this.losT = 0; }
  update(dt, aimDir, showSoft) {
    const g = this.game, h = g.hero;
    const L = this.lock;
    if (L) {
      // let go at once of a target that is gone; give line of sight a moment
      if (!L.alive || !L.present || h.distTo(L) > COMBAT.lockBreak || h.dead) this.release();
      else if (!this.visible(L, COMBAT.lockBreak)) { this.losT += dt; if (this.losT > COMBAT.lockLosGrace) this.release(); }
      else this.losT = 0;
    }
    // the soft target is what an attack along the aim would mean right now: for the ball the very target the
    // throw will use (an enemy, a switch, the target), so the marker, the preview and the launch agree
    const ballOut = g.hero.combat?.weapon === 'ball';
    this.soft = this.lock || this.cone() <= 0 ? null : ballOut ? this.throwTarget(aimDir) : this.pick(aimDir, COMBAT.softRange, this.cone());
    const t = this.lock || (showSoft ? this.soft : null);
    this.marker.visible = !!t;
    this.bar.visible = false;
    if (t) {
      const P = t.pos || t; // (an enemy, or a switch / target point)
      const top = (t.pos ? P.y + (t.markY ?? 1.4) : P.y + 0.45) + Math.sin(g.time * 5) * 0.05;
      this.marker.position.set(P.x, top + 0.35, P.z);
      this.marker.material.color.set(this.lock ? '#ffd23a' : '#fff4c8');
      this.marker.material.opacity = this.lock ? 1 : 0.55;
      if (t.maxHp && t.maxHp < 1e6 && (this.lock || t.recentHitT > 0)) {
        this.bar.visible = true; this.bar.position.set(t.pos.x, top + 0.08, t.pos.z);
        if (this.barFor !== t || this.barHp !== t.hp) this.drawBar(t);
      }
    }
  }
  drawBar(t) {
    const x = this.barCtx, f = clamp(t.hp / t.maxHp, 0, 1);
    x.clearRect(0, 0, 128, 16);
    x.fillStyle = 'rgba(20,10,0,0.75)'; x.fillRect(0, 2, 128, 12);
    x.fillStyle = f > 0.5 ? '#ffd23a' : f > 0.25 ? '#ff9a3a' : '#ff4a3a'; x.fillRect(3, 5, 122 * f, 6);
    this.barTex.needsUpdate = true; this.barFor = t; this.barHp = t.hp;
  }
  hide() { this.marker.visible = false; this.bar.visible = false; }
}

// ------------------------------------------------------------------ the hero's combat controller
export class HeroCombat {
  constructor(hero) {
    this.hero = hero;
    this.game = hero.game;
    this.buf = new InputBuffer();
    this.move = null;         // the melee move in progress {def, t, hit:Set, phase}
    this.combo = 0; this.comboT = 0; this.comboOf = null;
    this.dodgeT = 0; this.dodgeCool = 0; this.dodgeDir = { x: 0, z: 1 };
    this.throwT = 0; this.throwing = null; // {charged, released, t}
    this.holdT = 0; this.holding = null;    // what the held attack button is preparing ('ball' | 'heavy')
    this.pulseCool = 0; this.pulseT = 0; this.shotCool = 0;
    this.now = 0;
  }
  get g() { return this.game; }
  get busy() { return !!this.move || this.dodgeT > 0 || !!this.throwing || this.pulseT > 0; }
  iframes() { const D = COMBAT.dodge; const t = D.dur - this.dodgeT; return this.dodgeT > 0 && t >= D.iStart && t <= D.iEnd; }
  // drop everything: dialogue, pause, scene change, load
  reset() {
    this.buf.clear(); this.move = null; this.dodgeT = 0; this.dodgeCool = 0; this.throwing = null; this.holding = null; this.holdT = 0; this.pulseT = 0; this.combo = 0; this.comboT = 0;
    const h = this.hero; if (h.rig.atk) h.rig.atk = null;
    if (this.g.ball?.state === 'inhand') this.g.ball.cancelHold?.();
  }

  // the equipped weapon (fists when nothing better is allowed)
  get weapon() { const h = this.hero, w = h.weapon; return this.has(w) ? w : (h.hasBall ? 'ball' : 'fists'); }
  has(w) { const h = this.hero; return w === 'fists' || (w === 'ball' && h.hasBall) || (w === 'sword' && h.hasSword) || (w === 'pulse' && h.hasPulse) || (SHOOT.has(w) || w === 'glove') && !!this.g.weapons?.owns(w); }
  owned() { return WEAPONS.filter((w) => this.has(w)); }
  equip(w, silent = false) {
    const h = this.hero;
    if (!this.has(w) || w === this.weapon) return;
    h.prevWeapon = this.weapon; h.weapon = w;
    this.combo = 0;
    if (!silent) { this.g.audio.play('equip'); this.g.hud.weapon?.(h); }
    h.showSword?.(w === 'sword');
  }
  swap() { const h = this.hero, p = h.prevWeapon; if (p && this.has(p) && p !== this.weapon) this.equip(p); else { const o = this.owned().find((w) => w !== this.weapon); if (o) this.equip(o); else this.g.audio.play('deny'); } }

  // where Twinsen means to attack: the lock, the mouse cursor, the stick, or straight ahead
  aimDir(mvDir) {
    const h = this.hero, T = this.g.targeting;
    if (T?.lock) { const a = h.angleTo(T.lock); return { x: Math.sin(a), z: Math.cos(a), src: 'lock' }; }
    // Classic (LBA2): Twinsen throws and strikes the way he faces; the arrows turn him (no mouse aim)
    if (this.g.settings?.controls === 'classic') return { x: Math.sin(h.angle), z: Math.cos(h.angle), src: 'facing' };
    const m = this.g.mouseAim?.();
    if (m) { const dx = m.x - h.pos.x, dz = m.z - h.pos.z, d = Math.hypot(dx, dz); if (d > 0.3) return { x: dx / d, z: dz / d, src: 'mouse' }; }
    // the cursor is still the aim device (on Twinsen himself, or the ray missed): keep the mouse aim it gave last,
    // never the walking direction (moving sideways must not redirect a throw)
    if (this.g.input?.mouseAiming?.() && this.lastAim?.src === 'mouse') return this.lastAim;
    if (mvDir && Math.hypot(mvDir.x, mvDir.z) > 0.2) { const d = Math.hypot(mvDir.x, mvDir.z); return { x: mvDir.x / d, z: mvDir.z / d, src: 'stick' }; }
    return { x: Math.sin(h.angle), z: Math.cos(h.angle), src: 'facing' };
  }

  // called by Hero.update. Returns how the body may move this frame.
  update(dt, input, mvDir, opts = {}) {
    const g = this.g, h = this.hero;
    this.now += dt;
    this.dodgeCool = Math.max(0, this.dodgeCool - dt);
    this.pulseCool = Math.max(0, this.pulseCool - dt);
    this.shotCool = Math.max(0, this.shotCool - dt);
    this.comboT = Math.max(0, this.comboT - dt);
    const out = { lock: false, speedK: 1, drive: null, anim: null };
    const blocked = opts.blocked; // acting, hurt, hiding, behaviour wheel: presses are dropped, not stored
    const aim = this.aimDir(mvDir);
    this.lastAim = aim;

    // presses go into the buffer
    if (!blocked) {
      if (input.pressed('attack') || opts.actionAttack) this.buf.press('attack', this.now);
      if (input.pressed('dodge')) this.buf.press('dodge', this.now);
    } else this.buf.clear();

    // the held attack button: charging the ball, or a heavy sword strike
    const attackDown = !blocked && (input.down('attack') || (opts.actionAttack && input.down('action')));
    const ballDown = !blocked && input.down('ball');
    this.attackDown = attackDown;

    // ---- dodge: from neutral, or cancelling recovery
    if (!blocked && this.buf.peek('dodge', this.now) && this.canDodge()) { this.buf.take('dodge', this.now); this.startDodge(mvDir, aim); }
    if (this.dodgeT > 0) {
      const D = COMBAT.dodge, t = D.dur - this.dodgeT;
      this.dodgeT -= dt;
      // fast out, ease in: most of the distance early
      const v = (D.dist / D.dur) * 2 * Math.max(0, 1 - t / D.dur); // integrates to D.dist
      out.lock = true; out.drive = { x: this.dodgeDir.x * v, z: this.dodgeDir.z * v };
      out.anim = 'dodge';
      if (this.dodgeT <= 0) { this.dodgeCool = D.cooldown; h.rig.atk = null; }
      return out;
    }

    // ---- melee move in progress
    if (this.move) { this.stepMove(dt, out); if (this.move) return out; }

    // ---- ball throw in progress (released or charging)
    if (this.throwing) {
      // only the button that started the throw decides tap or hold
      this.stepThrow(dt, out, this.throwing.button === 'ball' ? ballDown : attackDown, aim);
      return out;
    }
    if (this.pulseT > 0) { this.pulseT -= dt; out.speedK = 0.3; out.anim = 'pulse'; return out; }

    // ---- start something new
    if (blocked) { this.holding = null; this.holdT = 0; return out; }
    // the ball key: throw (tap) / charge (hold) whatever is equipped; while the ball is out: recall
    if (input.pressed('ball')) {
      if (!h.hasBall) { /* nothing */ }
      else if (g.ball.state === 'idle') this.startThrow(aim, 'ball');
      else if (g.ball.canRecall()) { g.ball.recall(); }
      else this.notReady();
    }
    if (this.throwing) return out;
    // the attack button with what is equipped
    const w = this.weapon;
    if (w === 'sword' && attackDown && this.holding === 'heavy') {
      this.holdT += dt; out.speedK = 0.35; out.anim = 'heavyCharge';
      if (this.holdT > HEAVY_HOLD && !this.heavyReady) { this.heavyReady = true; g.audio.play('chargeFull'); }
      return out;
    }
    if (this.holding === 'heavy' && !attackDown) {
      const ready = this.heavyReady; this.holding = null; this.heavyReady = false;
      if (ready) this.startMove('heavy', aim);
      return out;
    }
    if (this.buf.peek('attack', this.now)) {
      if (w === 'ball') {
        if (g.ball.state === 'idle') { this.buf.take('attack', this.now); this.startThrow(aim, 'attack'); }
        else if (input.pressed('attack')) { this.buf.take('attack', this.now); this.notReady(); }
      } else if (w === 'pulse') {
        this.buf.take('attack', this.now);
        if (this.pulseCool > 0) this.notReady(); else this.firePulse(aim);
      } else if (SHOOT.has(w)) {
        // the blowgun, the laser pistol, the lightning spell (weapons.js): a short planted shot
        this.buf.take('attack', this.now);
        if (this.shotCool > 0) { if (input.pressed('attack')) this.notReady(); }
        else if (g.weapons?.fire(w, aim)) { const D = g.weapons.def(w); this.shotCool = D.cool; this.pulseT = D.lock; }
        else this.notReady();
      } else {
        this.buf.take('attack', this.now);
        this.pressT = this.now;
        this.startMove(this.nextCombo(w), aim);
      }
    }
    return out;
  }

  canDodge() {
    if (this.dodgeCool > 0 || !this.hero.onGround) return false;
    const m = this.move;
    if (m) { const D = m.def, t = m.t; return t >= D.s + D.a + D.r * (1 - COMBAT.dodge.cancelFrom); }
    if (this.throwing) return this.throwing.released;
    return true;
  }
  startDodge(mvDir, aim) {
    const g = this.g, h = this.hero;
    let dx = mvDir?.x || 0, dz = mvDir?.z || 0;
    if (Math.hypot(dx, dz) < 0.2) { dx = -Math.sin(h.angle); dz = -Math.cos(h.angle); } // no direction: a backstep
    const d = Math.hypot(dx, dz); dx /= d; dz /= d;
    this.dodgeDir = { x: dx, z: dz };
    this.move = null; this.holding = null;
    if (this.throwing && !this.throwing.released) { g.ball.cancelHold?.(); }
    this.throwing = null;
    this.dodgeT = COMBAT.dodge.dur;
    // the body keeps facing its target (or where it faced); the hop goes the asked way
    const rel = angleDiff(h.angle, Math.atan2(dx, dz));
    h.rig.atk = { kind: 'dodge', rel };
    h.rig.play('dodge'); h.rig.actionT = 0;
    g.audio.play('whoosh');
    g.particles.burst(h.pos.x, h.pos.y + 0.1, h.pos.z, '#cbb994', 6, 1.5);
    void aim;
  }

  nextCombo(w) {
    const list = COMBOS[w] || COMBOS.fists;
    if (this.comboOf !== w || this.comboT <= 0) this.combo = 0; else this.combo = (this.combo + 1) % list.length;
    this.comboOf = w;
    return list[this.combo];
  }
  startMove(key, aim) {
    const g = this.g, h = this.hero, def = MOVES[key];
    if (!def) return;
    // the target this strike means: the lock, or whoever is close along the aim
    const T = g.targeting;
    let tgt = T?.lock && h.distTo(T.lock) < COMBAT.meleeAssist + 1 ? T.lock : T && T.cone() > 0 ? T.pick(aim, COMBAT.meleeAssist, 0.9) : null;
    const want = tgt ? h.angleTo(tgt) : Math.atan2(aim.x, aim.z);
    if (tgt && Math.abs(angleDiff(h.angle, want)) > COMBAT.turnLimit && aim.src !== 'lock' && aim.src !== 'mouse') tgt = null;
    this.move = { key, def, t: 0, hit: new Set(), want: tgt || aim.src !== 'facing' ? want : h.angle, tgt, stepLeft: def.step, prevArc: null };
    h.rig.atk = { kind: key, s: def.s, a: def.a, r: def.r };
    h.rig.play(def.anim); h.rig.actionT = 0;
    h.vel.set(0, 0);
  }
  stepMove(dt, out) {
    const g = this.g, h = this.hero, m = this.move, D = m.def;
    m.t += dt;
    out.lock = true; out.anim = D.anim;
    // controlled turn toward the intended target during startup (and a little into the swing)
    if (m.t < D.s + D.a * 0.5) {
      if (m.tgt?.alive) m.want = h.angleTo(m.tgt);
      const d = angleDiff(h.angle, m.want), mx = COMBAT.turnRate * dt;
      h.angle += clamp(d, -mx, mx);
    }
    // a short readable step, stopping short of the target
    if (m.stepLeft > 0 && m.t < D.s + D.a) {
      const near = m.tgt?.alive ? h.distTo(m.tgt) - (m.tgt.radius || 0.5) : 99;
      if (near > D.reach * 0.55) {
        const v = (D.step / (D.s + D.a)) * 1.0, s = Math.min(m.stepLeft, v * dt);
        m.stepLeft -= s;
        out.drive = { x: Math.sin(h.angle) * (s / dt), z: Math.cos(h.angle) * (s / dt) };
      } else m.stepLeft = 0;
    }
    // active frames: sweep the arc
    if (m.t >= D.s && m.t <= D.s + D.a + dt) {
      const k = clamp((m.t - D.s) / D.a, 0, 1);
      const arcNow = D.arc[0] + (D.arc[1] - D.arc[0]) * k;
      const from = m.prevArc ?? D.arc[0];
      this.sweep(m, Math.min(from, arcNow) - 0.12, Math.max(from, arcNow) + 0.12);
      m.prevArc = arcNow;
      if (!m.swung) { m.swung = true; g.audio.play(D.sound); }
    }
    // recovery: the next press continues the combo once recovery is half done
    const end = D.s + D.a + D.r;
    if (m.t >= D.s + D.a + D.r * 0.45 && this.buf.peek('attack', this.now) && MELEE.has(this.weapon) && !D.heavy) {
      const w = this.weapon;
      this.buf.take('attack', this.now);
      this.comboT = COMBAT.comboWindow;
      this.move = null;
      this.startMove(this.nextCombo(w), this.lastAim || { x: Math.sin(h.angle), z: Math.cos(h.angle), src: 'facing' });
      return;
    }
    // late recovery: walking away cancels the last of it
    if (m.t >= D.s + D.a + D.r * 0.75 && this.hero.wantsMove) { this.finishMove(); return; }
    if (m.t >= end) this.finishMove();
  }
  finishMove() {
    const D = this.move?.def;
    this.move = null; this.hero.rig.atk = null;
    this.comboT = D?.heavy ? 0 : COMBAT.comboWindow;
    if (D?.heavy) this.combo = 0;
    // the sword: keep holding through the first strike → wind up a heavy one (release to strike)
    if (D && !D.heavy && this.weapon === 'sword' && this.attackDown && this.combo === 0) {
      this.holding = 'heavy'; this.holdT = this.now - (this.pressT ?? this.now); this.heavyReady = false; this.comboT = 0;
    }
  }
  // hit everything inside the swept sector [a0, a1] (relative to the facing) within reach
  sweep(m, a0, a1) {
    const g = this.g, h = this.hero, D = m.def, P = g.physics;
    let any = false, heavyHit = false;
    for (const e of g.enemies) {
      if (!e.alive || !e.present || m.hit.has(e)) continue;
      const d = h.distTo(e);
      if (d > D.reach + (e.radius || 0.5)) continue;
      const ey = e.pos.y + (e.hover ?? 0);
      if (ey > h.pos.y + 2.4 || ey + (e.hitH ?? 1.2) < h.pos.y - 0.4) continue;
      const rel = angleDiff(h.angle, h.angleTo(e));   // + is left
      const pad = Math.atan2(e.radius || 0.5, Math.max(d, 0.3));
      if (rel < a0 - pad || rel > a1 + pad) continue;
      if (!P.lineOfSight(h.pos.x, h.pos.y + 1.1, h.pos.z, e.pos.x, ey + 0.5, e.pos.z)) continue;
      m.hit.add(e);
      const res = e.melee ? e.melee(D, h) : (e.damage(D.dmg, h.pos), 'hit');
      any = true; if (D.heavy) heavyHit = true;
      g.impact(e.pos.x, ey + 0.6, e.pos.z, res === 'blocked' ? 'armor' : (e.material || 'flesh'), res);
      // the glove throws them back (after their own reaction, which set a softer knock-back)
      if (D.knock && res !== 'blocked' && e.kb) { const ka = h.angleTo(e); e.kb.set(Math.sin(ka) * D.knock, Math.cos(ka) * D.knock); }
      if (res === 'blocked') { h.kb.set(-Math.sin(h.angle) * 4, -Math.cos(h.angle) * 4); this.move.t = Math.max(this.move.t, D.s + D.a); }
    }
    // crates, ropes, and anything else a chapter wants cut
    if (g.meleeWorld?.(h, D, a0, a1, m.hit)) any = true;
    // the glove's punch sends an enemy bolt in front of it back (once per move)
    if (D.deflect && !m.deflected && g.weapons?.deflect(D.reach + 0.8)) { m.deflected = true; any = true; }
    if (any) g.hitStop = Math.max(g.hitStop || 0, heavyHit ? COMBAT.hitStop.heavy : COMBAT.hitStop.light);
  }

  // ---- the ball
  startThrow(aim, button) {
    const g = this.g, h = this.hero;
    if (!h.hasBall || g.ball.state !== 'idle') return;
    // t: since the press; at: the throw animation's clock (it waits at the wind-up while the press may become a hold);
    // let: the starting button has been released (latched: pressing again does not turn it back into a hold)
    this.throwing = { t: 0, at: 0, let: false, released: false, button, aim };
    g.ball.holdIn(h);
    h.rig.atk = { kind: 'throw' };
    h.rig.play('throwQuick'); h.rig.actionT = 0;
  }
  // Tap: the quick throw, released at quickRelease on the animation's clock. Hold past chargeAfter: charge, and
  // release with a short whip when the button comes up. While it is still undecided (held, before chargeAfter)
  // the animation waits at the wind-up, so a hold never throws early.
  stepThrow(dt, out, held, aim) {
    const g = this.g, h = this.hero, T = this.throwing, C = COMBAT.throw;
    T.t += dt;
    if (!held) T.let = true;
    // face the aim (gently) while preparing
    const want = Math.atan2(aim.x, aim.z);
    if (!T.released) { const d = angleDiff(h.angle, want), mx = 14 * dt; h.angle += clamp(d, -mx, mx); }
    if (!T.released) {
      if (!T.let && T.t >= C.chargeAfter) {
        if (!T.charging) { T.charging = true; T.chargeT = 0; h.rig.play('charge'); h.rig.actionT = 0; g.audio.play('charge'); }
        T.chargeT += dt;
        if (T.chargeT >= C.chargeFull && !T.full) { T.full = true; g.audio.play('chargeFull'); g.particles.burst(h.pos.x, h.pos.y + 2.0, h.pos.z, '#ffe27a', 8, 1.5); }
        g.ball.setCharge?.(Math.min(1, T.chargeT / C.chargeFull));
        out.speedK = C.chargeMoveK; out.anim = 'charge'; out.upper = { kind: 'charge', t: T.chargeT }; out.face = want;
        g.ball.preview?.(h, aim, T.full);
        return;
      }
      if (T.charging && !T.whip) { T.whip = true; h.rig.play('throwQuick'); T.at = C.quickRelease - C.releaseAfterCharge; }
      else { T.at += dt; if (!T.let) T.at = Math.min(T.at, C.windHold); }
      h.rig.actionT = T.at;
      out.speedK = C.moveK; out.anim = 'throwQuick'; out.upper = { kind: 'throw', t: T.at }; out.face = want;
      if (T.at >= C.quickRelease) {
        T.released = true; T.relAt = T.t;
        const full = !!T.full && h.mp >= 1;
        if (T.full && !full) g.hud.toast('toast_nomp');
        g.ball.preview?.(null);
        g.ball.launch(h, h.behaviour, h.magicLevel, { charged: full, aim: this.lastAim || aim, target: g.targeting?.throwTarget(this.lastAim || aim) });
        g.audio.play(full ? 'throwHeavy' : 'throw');
      }
      return;
    }
    T.at += dt;
    h.rig.actionT = T.at;
    out.speedK = C.moveK; out.anim = 'throwQuick'; out.upper = { kind: 'throw', t: T.at };
    if (T.at >= C.quickDur) { this.throwing = null; h.rig.atk = null; }
  }
  notReady() { const g = this.g; g.audio.play('notReady'); g.hud.weaponFlash?.(); }

  // ---- Baldino's pulse tool
  firePulse(aim) {
    const g = this.g, h = this.hero, C = COMBAT.pulse;
    this.pulseCool = C.recharge; this.pulseT = 0.32;
    h.angle = Math.atan2(aim.x, aim.z);
    h.rig.play('pulse'); h.rig.actionT = 0;
    g.audio.play('pulse');
    const fx = Math.sin(h.angle), fz = Math.cos(h.angle);
    for (let i = 0; i < 18; i++) { const r = 0.6 + (i % 6) * 0.7, s = ((i % 3) - 1) * 0.35; g.particles.burst(h.pos.x + (fx + fz * s) * r, h.pos.y + 1.1, h.pos.z + (fz - fx * s) * r, '#9fe8ff', 1, 1); }
    let any = false;
    for (const e of g.enemies) {
      if (!e.alive || !e.present) continue;
      const d = h.distTo(e);
      if (d > C.range + (e.radius || 0.5)) continue;
      if (Math.abs(angleDiff(h.angle, h.angleTo(e))) > C.cone + 0.2) continue;
      if (!g.physics.lineOfSight(h.pos.x, h.pos.y + 1.1, h.pos.z, e.pos.x, e.pos.y + 0.8, e.pos.z)) continue;
      if (e.pulse) { e.pulse(C); any = true; } else g.impact(e.pos.x, e.pos.y + 0.6, e.pos.z, 'none', 'immune');
    }
    if (g.story.pulseHit?.({ x: h.pos.x, y: h.pos.y + 1.1, z: h.pos.z, fx, fz, range: C.range, cone: C.cone })) any = true;
    if (any) g.camRig.shake(0.12);
  }
}
