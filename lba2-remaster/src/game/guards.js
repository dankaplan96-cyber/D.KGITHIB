// Vesk's guards: the Joint Project's troopers in his uniform (looks 'vguard' and 'vguardG' in characters.js), the
// way LBA1 had FunFrock's Quetch and Grobo clones. Rules taken from LBA1's engine (2point21/lba1-classic,
// OBJECT.C HitObj, PERSO.C, EXTRA.C GiveExtraBonus):
//  - armour: a hit only hurts when its force is at least the guard's armour; a weaker hit is taken on the guard
//    ("encaisse": a brace, no damage). Quetch guards have armour 1, the Grobo guards 2 (a magic-level-1 ball
//    needs a charge, or a heavy strike).
//  - two hit reactions, picked at random each time (CHOC / CHOC2): a stagger back, or a half-turn.
//  - a beaten guard falls and drops one bonus of the kinds it carries (main.js onEnemyKilled → WhichBonus).
// Behaviour, every attack telegraphed like the other enemies:
//  patrol (a loop) → sees Twinsen (a cone, range, line of sight, his visibility) → barks and raises the stun
//  rifle: a violet aim line brightens (the tell) → fires a slow bolt → lowers the rifle (the opening); close in,
//  it swings its baton instead (arm raised high, then the strike). It gives up beyond its pursuit limit.
// Baldino's pulse jams the rifle (no shots for a while) but does not stun a person.
import * as THREE from 'three';
import { Actor } from './actors.js';
import { createCharacter } from './characters.js';
import { angleDiff, dampAngle } from '../engine/math.js';

function rifleProp() {
  const g = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: '#22262c', roughness: 0.5, metalness: 0.4 });
  const brass = new THREE.MeshStandardMaterial({ color: '#c8a050', roughness: 0.4, metalness: 0.5 });
  const glow = new THREE.MeshStandardMaterial({ color: '#e090ff', emissive: '#b040ff', emissiveIntensity: 1.6 });
  const add = (geo, m, x, y, z, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.x = rx; o.castShadow = true; g.add(o); return o; };
  add(new THREE.BoxGeometry(0.06, 0.08, 0.36), dark, 0, -0.05, 0.12);
  add(new THREE.CylinderGeometry(0.022, 0.026, 0.42, 8), brass, 0, -0.03, 0.46, Math.PI / 2);
  const tip = add(new THREE.SphereGeometry(0.035, 8, 6), glow, 0, -0.03, 0.68);
  g.userData.glow = glow; g.userData.tip = tip;
  return g;
}

export class Guard extends Actor {
  constructor(game, def) {
    // (kind 'fclone': one of LBA1's fat FunFrock troopers, bodies 18–20, reactivated by the project — the Grobo
    // guard's rules: armour 2, 5 HP)
    const fat = def.kind === 'fclone', grobo = def.kind === 'guardG' || fat;
    super(game, createCharacter(fat ? 'fclone' : grobo ? 'vguardG' : 'vguard'), def.x, def.z, grobo ? 0.7 : 0.45);
    this.def = def; this.id = def.id; this.group = def.group || 'guards';
    this.grobo = grobo;
    this.armour = def.armour ?? (grobo ? 2 : 1);
    this.hp = this.maxHp = def.hp || (grobo ? 5 : 3);
    this.patrol = def.patrol || [[def.x, def.z]];
    this.wp = def.wp || 0;
    this.home = { x: def.x, z: def.z };
    this.angle = def.angle ?? 0;
    this.state = 'patrol'; this.stateT = 0; this.coolT = 0; this.deadT = 0; this.hurtT = 0; this.jamT = 0; this.waitT = 0;
    this.present = true; this.material = 'flesh'; this.recentHitT = 0;
    this.hitR = grobo ? 0.8 : 0.5; this.hitH = grobo ? 2.2 : 1.9;
    this.rifle = rifleProp();
    const hand = this.rig.j?.armR?.hand;
    // (the hand bone's axis runs down the arm: the rifle lies along it, pointing down at rest and forward when aimed)
    if (hand) { this.rifle.scale.setScalar(1 / (this.rig.root.scale.x || 1)); this.rifle.rotation.x = Math.PI / 2; hand.add(this.rifle); }
    // the tell: a thin violet line toward Twinsen that brightens while the rifle comes up
    this.aimLine = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 4, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5),
      new THREE.MeshBasicMaterial({ color: '#d070ff', transparent: true, opacity: 0, depthWrite: false }));
    this.aimLine.visible = false; game.scene.add(this.aimLine);
    this.sync();
  }
  get alive() { return this.state !== 'dead'; }
  get aimY() { return this.grobo ? 1.3 : 1.15; }
  get markY() { return this.grobo ? 2.6 : 2.25; }
  setPresent(on) { this.present = on; this.rig.root.visible = on && (this.alive || this.deadT < 2.5); this.shadow.visible = on && this.alive; if (!on) this.aimLine.visible = false; }
  alert(pos) { if (this.alive && (this.state === 'patrol' || this.state === 'search')) { this.state = 'alerted'; this.stateT = 0; this.last = pos ? { x: pos.x, z: pos.z } : null; } }

  // ---- hits (LBA1's HitObj: armour, two reactions)
  melee(D, h) { return this.take(D.dmg + (D.heavy ? 1 : 0), h.pos); }
  ballHit(ball, p) { return this.take(ball.damage, p); }
  pulse(C) { if (!this.alive) return; this.jamT = C.stun || 2.6; this.rifle.userData.glow.emissiveIntensity = 0.1; if (this.state === 'aim') { this.state = 'chase'; this.stateT = 0; this.game.combatDir?.done(this); } }
  take(force, from) {
    if (!this.alive) return 'hit';
    const g = this.game;
    this.recentHitT = 2.5;
    if (this.state === 'patrol' || this.state === 'search') { this.state = 'chase'; this.stateT = 0; }
    if (force < this.armour) {   // taken on the armour: a brace, no damage
      this.rig.play('listen'); this.hurtT = 0.25; this.rig.hitFlash?.();
      g.audio.play('clang');
      return 'blocked';
    }
    this.damage(force, from);
    return 'hit';
  }
  damage(n, from) {
    if (!this.alive) return;
    const g = this.game;
    this.hp -= n; this.rig.hitFlash?.(); this.hurtT = 0.45;
    this.react = Math.random() < 0.5 ? 'hurt' : 'turn';   // CHOC or CHOC2
    if (this.state === 'aim') g.combatDir?.done(this);
    this.aimLine.visible = false;
    if (from) { const a = Math.atan2(this.pos.x - from.x, this.pos.z - from.z), k = this.grobo ? 2.5 : 5; this.kb.set(Math.sin(a) * k, Math.cos(a) * k); }
    g.particles.burst(this.pos.x, this.pos.y + 1.6, this.pos.z, '#fff2b0', 8, 3);   // the star of the hit
    if (this.hp <= 0) {
      this.state = 'dead'; this.deadT = 0; g.combatDir?.done(this);
      this.rig.play('knockdown'); g.audio.play('hit'); g.camRig.shake(0.15);
      g.onEnemyKilled(this);   // (LBA1's GiveExtraBonus: one bonus where it fell)
      return;
    }
    this.state = 'hurt'; this.stateT = 0; this.coolT = Math.max(this.coolT, 0.6);
  }
  // can it see Twinsen? a cone, a range scaled by his visibility, line of sight
  sees(hero) {
    const d = this.distTo(hero), vis = hero.visibility();
    if (hero.dead || (vis <= 0.15 && d > 1.5)) return false;
    if (d > 10 * vis) return false;
    if (d > 2 && Math.abs(angleDiff(this.angle, this.angleTo(hero))) > 0.85) return false;
    return this.game.physics.lineOfSight(this.pos.x, this.pos.y + 1.6, this.pos.z, hero.pos.x, hero.pos.y + 1.2, hero.pos.z);
  }

  update(dt) {
    if (!this.present) return;
    const g = this.game, hero = g.hero, P = g.physics, DF = g.combatDir?.diff || { windup: 1, cool: 1 };
    this.stateT += dt; this.coolT = Math.max(0, this.coolT - dt); this.hurtT = Math.max(0, this.hurtT - dt);
    this.recentHitT = Math.max(0, this.recentHitT - dt);
    if (this.jamT > 0) { this.jamT -= dt; if (this.jamT <= 0) this.rifle.userData.glow.emissiveIntensity = 1.6; }
    if (this.state !== 'aim') this.aimLine.visible = false;
    if (!this.alive) {
      this.deadT += dt; this.rig.play('knockdown'); this.rig.update(dt, 0);
      if (this.deadT > 2.5) this.rig.root.visible = false;   // (LBA1: the beaten trooper is gone)
      this.sync(); return;
    }
    const d = this.distTo(hero);
    const sees = this.sees(hero);
    let sp = 0, face = null, anim = 'idle';
    switch (this.state) {
      case 'patrol': {
        const [tx, tz] = this.patrol[this.wp % this.patrol.length];
        const dd = Math.hypot(tx - this.pos.x, tz - this.pos.z);
        if (this.waitT > 0) { this.waitT -= dt; anim = 'idle'; }
        else if (dd < 0.4 || this.patrol.length < 2) { this.wp = (this.wp + 1) % this.patrol.length; this.waitT = this.patrol.length < 2 ? 1e9 : 1.2; }
        else { face = Math.atan2(tx - this.pos.x, tz - this.pos.z); sp = 1.4; anim = 'walk'; }
        if (sees) { this.state = 'alerted'; this.stateT = 0; g.audio.play('alert'); g.hud?.float?.('!', { x: this.pos.x, y: this.pos.y + 2.4, z: this.pos.z }, '#e090ff'); }
        break;
      }
      case 'alerted':   // a beat to turn and bark
        face = this.angleTo(hero); anim = 'idle';
        if (this.stateT > 0.5) { this.state = 'chase'; this.stateT = 0; }
        break;
      case 'chase': {
        face = this.angleTo(hero); anim = 'walk';
        const close = d < 1.9;
        if (close && this.coolT <= 0 && (g.combatDir?.canAttack(this) ?? true)) { this.state = 'windup'; this.stateT = 0; break; }
        if (!close && d < 8 && sees && this.coolT <= 0 && this.jamT <= 0 && (g.combatDir?.canAttack(this) ?? true)) { this.state = 'aim'; this.stateT = 0; break; }
        sp = d > 4.5 ? 2.4 : d > 2.2 ? 1.6 : 0;
        if (!sees && this.stateT > 4) { this.state = 'search'; this.stateT = 0; this.last = { x: hero.pos.x, z: hero.pos.z }; }
        if (Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z) > 16 || d > 18) { this.state = 'home'; this.stateT = 0; g.combatDir?.done(this); }
        break;
      }
      case 'aim': {   // the rifle comes up; the violet line brightens; then the shot
        face = this.angleTo(hero); anim = 'reach';
        const tell = 0.8 * DF.windup;
        const from = new THREE.Vector3(this.pos.x + Math.sin(this.angle) * 0.6, this.pos.y + 1.35, this.pos.z + Math.cos(this.angle) * 0.6);
        const to = new THREE.Vector3(hero.pos.x, hero.pos.y + 0.9, hero.pos.z);
        const L = this.aimLine; L.visible = true; L.position.copy(from); L.lookAt(to); L.scale.set(1, 1, from.distanceTo(to)); L.material.opacity = 0.15 + 0.6 * Math.min(1, this.stateT / tell);
        this.rifle.userData.glow.emissiveIntensity = 1.6 + 2.5 * Math.min(1, this.stateT / tell);
        if (!this.sees(hero) || this.jamT > 0) { this.state = 'chase'; this.stateT = 0; g.combatDir?.done(this); break; }
        if (this.stateT > tell) {
          g.bolts.fire(from, to.sub(from).normalize(), 8, 1);
          g.audio.play('zap');
          this.rifle.userData.glow.emissiveIntensity = 1.6;
          this.state = 'recover'; this.stateT = 0; this.coolT = 1.8 * DF.cool; g.combatDir?.done(this);
        }
        break;
      }
      case 'recover':   // the opening: the rifle lowered, the guard steadies
        anim = 'idle';
        if (this.stateT > 0.9) { this.state = 'chase'; this.stateT = 0; }
        break;
      case 'windup':   // the baton goes up (the tell)
        face = this.angleTo(hero); anim = 'heavyCharge';
        if (this.stateT > 0.55 * DF.windup) { this.state = 'strike'; this.stateT = 0; this.hitDone = false; }
        break;
      case 'strike':
        anim = 'heavy'; sp = 2.2;
        if (!this.hitDone && this.stateT > 0.12 && d < 1.6 && Math.abs(angleDiff(this.angle, this.angleTo(hero))) < 0.9) { this.hitDone = true; hero.damage(this.grobo ? 2 : 1, this.pos, true); g.audio.play('punch'); }
        if (this.stateT > 0.35) { this.state = 'recover'; this.stateT = 0; this.coolT = 1.2 * DF.cool; g.combatDir?.done(this); }
        break;
      case 'hurt':
        anim = this.react === 'turn' ? 'turnL' : 'hurt';
        if (this.stateT > 0.5) { this.state = 'chase'; this.stateT = 0; }
        break;
      case 'search': {
        const tgt = this.last || this.home;
        const dd = Math.hypot(tgt.x - this.pos.x, tgt.z - this.pos.z);
        face = dd > 0.8 ? Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z) : this.angle + dt * 1.2;
        sp = dd > 0.8 ? 1.6 : 0; anim = sp ? 'walk' : 'search';
        if (sees) { this.state = 'chase'; this.stateT = 0; }
        else if (this.stateT > 5) { this.state = 'home'; this.stateT = 0; }
        break;
      }
      case 'home': {
        const dx = this.home.x - this.pos.x, dz = this.home.z - this.pos.z;
        if (Math.hypot(dx, dz) < 0.5) { this.state = 'patrol'; this.stateT = 0; this.hp = Math.min(this.maxHp, this.hp + 1); }
        else { face = Math.atan2(dx, dz); sp = 1.5; anim = 'walk'; }
        if (sees && d < 6) { this.state = 'chase'; this.stateT = 0; }
        break;
      }
    }
    if (this.hurtT > 0 && this.state !== 'hurt') sp = 0;
    if (face != null) this.angle = dampAngle(this.angle, face, this.state === 'strike' ? 1.5 : 4, dt);
    if (sp) P.move(this, Math.sin(this.angle) * sp * dt, Math.cos(this.angle) * sp * dt);
    this.applyKnockback(dt);
    P.fall?.(this, dt);
    this.rig.play(anim);
    this.rig.update(dt, sp);
    this.sync();
  }
}
