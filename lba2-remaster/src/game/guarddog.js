// Guard dogs: LBA2's Zeelich guard dog (bodies 51–53: the great fanged mouth, src/game/dogs.js) working for Vesk's
// project beside his troopers. Every attack is telegraphed like the other enemies':
//  guard (at its post, or trotting its handler's loop) → sees or hears Twinsen (a wide cone, range scaled by his
//  visibility; close by it hears him even in Discreet mode only when he runs) → stops and barks (the jaw drops, the
//  rest of its group is alerted) → runs at him, faster than he walks → close in: crouches with the jaw wide open (the
//  tell, a growl) → springs forward and bites → stands panting a moment (the opening) → again.
//  A hit makes it yelp and skid back; three hits knock it out (it rolls over, drops one bonus, and is gone).
//  It gives up beyond its leash and trots back to its post. Baldino's pulse stuns it for a few seconds.
import * as THREE from 'three';
import { Actor } from './actors.js';
import { dogRig } from './dogs.js';
import { angleDiff, dampAngle } from '../engine/math.js';

export class GuardDog extends Actor {
  constructor(game, def) {
    super(game, dogRig(def.coat || 'grey'), def.x, def.z, 0.55);
    this.def = def; this.id = def.id; this.group = def.group || 'dogs';
    this.hp = this.maxHp = def.hp || 3;
    this.patrol = def.patrol || [[def.x, def.z]];
    this.wp = def.wp || 0;
    this.home = { x: def.x, z: def.z };
    this.leash = def.leash || 14;
    this.angle = def.angle ?? 0;
    this.state = 'guard'; this.stateT = 0; this.coolT = 0; this.deadT = 0; this.hurtT = 0; this.stunT = 0; this.waitT = 0;
    this.present = true; this.material = 'flesh'; this.recentHitT = 0;
    this.aimY = 0.55; this.markY = 1.3; this.hitR = 0.75; this.hitH = 1.0;
    this.shadow.scale.multiplyScalar(1.4);
    this.sync();
  }
  get alive() { return this.state !== 'dead'; }
  setPresent(on) { this.present = on; this.rig.root.visible = on && (this.alive || this.deadT < 2.5); this.shadow.visible = on && this.alive; }
  alert(pos) { if (this.alive && (this.state === 'guard' || this.state === 'home')) { this.state = 'warn'; this.stateT = 0; this.last = pos ? { x: pos.x, z: pos.z } : null; } }

  melee(D, h) { this.damage(D.dmg + (D.heavy ? 1 : 0), h.pos); return 'hit'; }
  ballHit(ball, p) { this.damage(ball.damage, p); return 'hit'; }
  pulse(C) { if (!this.alive) return; this.stunT = C.stun || 2.6; if (this.state === 'windup' || this.state === 'lunge') this.game.combatDir?.done(this); this.state = 'stunned'; this.stateT = 0; }
  damage(n, from) {
    if (!this.alive) return;
    const g = this.game;
    this.hp -= n; this.rig.hitFlash(); this.hurtT = 0.4; this.recentHitT = 2.5;
    if (this.state === 'windup' || this.state === 'lunge') g.combatDir?.done(this);
    if (from) { const a = Math.atan2(this.pos.x - from.x, this.pos.z - from.z); this.kb.set(Math.sin(a) * 6, Math.cos(a) * 6); }
    g.particles.burst(this.pos.x, this.pos.y + 0.8, this.pos.z, '#fff2b0', 8, 3);
    g.audio.play('yelp');
    if (this.hp <= 0) {
      this.state = 'dead'; this.deadT = 0; g.combatDir?.done(this);
      g.audio.play('hit'); g.camRig.shake(0.1);
      g.onEnemyKilled(this);
      return;
    }
    this.state = 'hurt'; this.stateT = 0; this.coolT = Math.max(this.coolT, 0.6);
  }
  // a wide cone and a good nose: it notices a running Twinsen close by even out of sight
  notices(hero) {
    const d = this.distTo(hero), vis = hero.visibility();
    if (hero.dead) return false;
    if (d < 3.2 && vis > 0.5) return true;
    if (vis <= 0.15 && d > 1.5) return false;
    if (d > 11 * vis) return false;
    if (d > 2 && Math.abs(angleDiff(this.angle, this.angleTo(hero))) > 1.4) return false;
    return this.game.physics.lineOfSight(this.pos.x, this.pos.y + 0.8, this.pos.z, hero.pos.x, hero.pos.y + 1.0, hero.pos.z);
  }
  bark() { this.rig.bark(); this.game.audio.play('bark'); }

  update(dt) {
    if (!this.present) return;
    const g = this.game, hero = g.hero, P = g.physics, DF = g.combatDir?.diff || { windup: 1, cool: 1 };
    this.stateT += dt; this.coolT = Math.max(0, this.coolT - dt); this.hurtT = Math.max(0, this.hurtT - dt);
    this.recentHitT = Math.max(0, this.recentHitT - dt);
    if (!this.alive) {
      this.deadT += dt; this.rig.play('dead'); this.rig.update(dt, 0);
      if (this.deadT > 2.5) this.rig.root.visible = false;
      this.sync(); return;
    }
    const d = this.distTo(hero), sees = this.notices(hero);
    let sp = 0, face = null, anim = 'idle';
    switch (this.state) {
      case 'guard': {
        const [tx, tz] = this.patrol[this.wp % this.patrol.length];
        const dd = Math.hypot(tx - this.pos.x, tz - this.pos.z);
        if (this.waitT > 0) { this.waitT -= dt; anim = 'sniff'; }
        else if (dd < 0.4 || this.patrol.length < 2) { this.wp = (this.wp + 1) % this.patrol.length; this.waitT = this.patrol.length < 2 ? 1e9 : 1.5; }
        else { face = Math.atan2(tx - this.pos.x, tz - this.pos.z); sp = 1.5; anim = 'walk'; }
        if (sees) { this.state = 'warn'; this.stateT = 0; g.hud?.float?.('!', { x: this.pos.x, y: this.pos.y + 1.5, z: this.pos.z }, '#ffb060'); }
        break;
      }
      case 'warn':   // stops, barks twice, calls the others
        face = this.angleTo(hero); anim = 'warn';
        if (this.stateT < dt * 1.5 || (this.stateT > 0.45 && this.stateT - dt <= 0.45)) { this.bark(); g.alertGroup?.(this.group, hero.pos, 1); }
        if (this.stateT > 0.8) { this.state = 'chase'; this.stateT = 0; }
        break;
      case 'chase': {
        face = this.angleTo(hero); anim = 'run';
        const close = d < 2.4;
        if (close && this.coolT <= 0 && (g.combatDir?.canAttack(this) ?? true)) { this.state = 'windup'; this.stateT = 0; g.audio.play('growl'); break; }
        sp = d > 3 ? 4.2 : close ? 0 : 2.0;
        if (close) anim = 'warn';
        if (Math.random() < dt * 0.4) this.bark();
        if (Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z) > this.leash || d > 18 || hero.dead) { this.state = 'home'; this.stateT = 0; g.combatDir?.done(this); }
        break;
      }
      case 'windup':   // the tell: crouched, jaw wide, a growl
        face = this.angleTo(hero); anim = 'windup';
        if (this.stateT > 0.5 * DF.windup) { this.state = 'lunge'; this.stateT = 0; this.hitDone = false; }
        break;
      case 'lunge':
        anim = 'lunge'; sp = 5.5;
        if (!this.hitDone && d < 1.4 && Math.abs(angleDiff(this.angle, this.angleTo(hero))) < 0.9) { this.hitDone = true; hero.damage(1, this.pos); g.audio.play('punch'); }
        if (this.stateT > 0.3) { this.state = 'recover'; this.stateT = 0; this.coolT = 1.4 * DF.cool; g.combatDir?.done(this); }
        break;
      case 'recover':   // the opening: standing, panting
        anim = 'idle';
        if (this.stateT > 0.9) { this.state = 'chase'; this.stateT = 0; }
        break;
      case 'hurt':
        anim = 'hurt';
        if (this.stateT > 0.45) { this.state = 'chase'; this.stateT = 0; }
        break;
      case 'stunned':
        anim = 'hurt';
        if (this.stateT > this.stunT) { this.state = 'chase'; this.stateT = 0; }
        break;
      case 'home': {
        const dx = this.home.x - this.pos.x, dz = this.home.z - this.pos.z;
        if (Math.hypot(dx, dz) < 0.5) { this.state = 'guard'; this.stateT = 0; this.hp = Math.min(this.maxHp, this.hp + 1); }
        else { face = Math.atan2(dx, dz); sp = 2.2; anim = 'walk'; }
        if (sees && d < 7 && this.stateT > 1.5) { this.state = 'warn'; this.stateT = 0; }
        break;
      }
    }
    if (this.hurtT > 0 && this.state !== 'hurt') sp = 0;
    if (face != null) this.angle = dampAngle(this.angle, face, this.state === 'lunge' ? 1.5 : 6, dt);
    if (sp) P.move(this, Math.sin(this.angle) * sp * dt, Math.cos(this.angle) * sp * dt);
    this.applyKnockback(dt);
    P.fall?.(this, dt);
    this.rig.play(anim);
    this.rig.update(dt, sp);
    this.sync();
  }
}
