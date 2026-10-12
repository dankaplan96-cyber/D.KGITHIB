// Actors: the hero, NPCs, Grey Sentinels (+ the Warden), the magic ball,
// projectiles, pickups and particles.
import * as THREE from 'three';
import { createHumanoid, createBlobShadow, placeBlobShadow } from '../engine/rig.js';
import { createCharacter } from './characters.js';
import { TrackRunner } from '../engine/scripts.js';
import { angleDiff, dampAngle, clamp } from '../engine/math.js';

export const BEHAVIOURS = ['normal', 'athletic', 'aggressive', 'discreet'];
// Twinsen: blue tunic, light trousers, brown ponytail
export const HERO_LOOK = 'twinsen';

export class Actor {
  constructor(game, rig, x, z, radius = 0.45) {
    this.game = game;
    this.rig = rig;
    this.pos = new THREE.Vector3(x, game.physics.groundAt(x, z), z);
    this.angle = 0;
    this.targetAngle = null;
    this.vy = 0;
    this.onGround = true;
    this.radius = radius;
    this.kb = new THREE.Vector2();
    game.scene.add(rig.root);
    this.shadow = createBlobShadow(radius * 1.9);
    game.scene.add(this.shadow);
  }
  distTo(o) { return Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z); }
  angleTo(o) { return Math.atan2(o.pos.x - this.pos.x, o.pos.z - this.pos.z); }
  sync() {
    this.rig.root.position.copy(this.pos);
    this.rig.root.rotation.y = this.angle;
    this.shadow.visible = this.rig.root.visible || this.isHero;
    placeBlobShadow(this.shadow, this.game.physics, this.rig.root.position.x, this.rig.root.position.y, this.rig.root.position.z);
  }
  applyKnockback(dt) {
    if (this.kb.lengthSq() > 0.001) {
      this.game.physics.move(this, this.kb.x * dt, this.kb.y * dt);
      this.kb.multiplyScalar(Math.exp(-dt * 8));
    }
  }
}

// ------------------------------------------------------------------ hero
export class Hero extends Actor {
  constructor(game, x, z) {
    super(game, createCharacter('twinsen'), x, z, 0.4);
    this.isHero = true;
    this.behaviour = 'normal';
    this.maxHp = 10; this.hp = 10;
    this.magicLevel = 1; this.mp = 8;
    this.clovers = 2; this.coins = 0;
    this.hasKey = false;
    this.hasBall = false; // still in the cupboard at home
    this.shards = [false, false, false];
    this.invuln = 0; this.attackT = 0; this.combo = 0; this.comboWindow = 0; this.hitDone = true;
    this.throwT = 0; this.hurtT = 0; this.hiding = false; this.dead = false;
    this.speed = 0; this.stepAcc = 0;
    this.vel = new THREE.Vector2();
    this.actT = 0;
    this.prevPos = this.pos.clone();
  }
  get mpMax() { return 6 + this.magicLevel * 2; }

  // Play as someone else for a while (Zoe's segments): swap the body, keep the controller.
  swapBody(look) {
    const g = this.game;
    this.bodies ??= { twinsen: this.rig };
    this.bodies[look] ??= createCharacter(look);
    if (this.rig === this.bodies[look]) return;
    g.scene.remove(this.rig.root);
    this.rig = this.bodies[look];
    g.scene.add(this.rig.root);
    this.body = look;
    this.sync();
  }

  visibility() {
    if (this.hiding) return 0.12;
    if (this.behaviour === 'discreet') return this.speed > 0.2 ? 0.4 : 0.25;
    if (this.behaviour === 'athletic' && this.speed > 4) return 1.25;
    return 1;
  }

  setBehaviour(b) {
    if (b === this.behaviour) return;
    this.behaviour = b;
    this.game.audio.play('mode');
    this.game.hud.behaviour(b);
  }

  update(dt, input) {
    const g = this.game;
    const P = g.physics;
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.comboWindow = Math.max(0, this.comboWindow - dt);
    this.mp = Math.min(this.mpMax, this.mp + dt * 0.35);
    this.coyote = this.onGround && !this.sliding ? 0.12 : Math.max(0, (this.coyote || 0) - dt);
    this.jumpBuf = Math.max(0, (this.jumpBuf || 0) - dt);

    if (this.dead) { this.rig.play('dead'); this.rig.update(dt, 0); P.fall(this, dt); this.sync(); return; }

    // behaviour switching (1-4, Tab, gamepad bumpers, LBA-style Ctrl + left/right)
    const wheel = input.down('wheel');
    if (!this.noBehaviours) {
      for (let i = 0; i < 4; i++) if (input.pressed('b' + (i + 1))) this.setBehaviour(BEHAVIOURS[i]);
      const idx = BEHAVIOURS.indexOf(this.behaviour);
      if (input.pressed('cycle') || input.pressed('next') || (wheel && input.pressed('right'))) this.setBehaviour(BEHAVIOURS[(idx + 1) % 4]);
      if (input.pressed('prev') || (wheel && input.pressed('left'))) this.setBehaviour(BEHAVIOURS[(idx + 3) % 4]);
      g.hud.wheel(wheel);
    }

    const mv = wheel ? { x: 0, y: 0 } : input.move();
    const beh = this.behaviour;
    // LBA2 (measured on the original anims): walk 0.93 H/s, athletic run 2.29 H/s → with H ≈ 2.1 m about 2 and
    // 4.8 m/s; a little faster here so the bigger islands stay pleasant to cross
    const maxSpeed = { normal: 2.4, athletic: 5.4, aggressive: 2.7, discreet: 1.4 }[beh] * (this.speedK || 1);
    this.hiding = beh === 'discreet' && input.down('action') && this.onGround && !wheel;
    let wx = 0, wz = 0, turning = 0;
    // one-shot actions (use, pick up, open door, knockdown/get-up) own the body
    if (this.actT > 0) {
      this.actT -= dt;
      if (this.actCb && this.actT <= this.actFireT) { const cb = this.actCb; this.actCb = null; cb(); }
      if (this.actT <= 0 && this.actNext) { const n = this.actNext; this.actNext = null; this.act(...n); }
    }
    const locked = this.attackT > 0 || this.hiding || this.hurtT > 0.15 || this.actT > 0 || (this.throwT > 0.45);

    if (!locked) {
      if (g.settings.controls === 'classic') {
        // LBA tank controls: left/right rotate, up/down walk
        this.angle -= mv.x * 1.9 * dt; // LBA2 turns in place at ~100°/s
        turning = -mv.x;
        const f = mv.y > 0 ? mv.y : mv.y * 0.55;
        wx = Math.sin(this.angle) * f * maxSpeed;
        wz = Math.cos(this.angle) * f * maxSpeed;
      } else {
        const m = Math.hypot(mv.x, mv.y);
        if (m > 0.08) {
          const yaw = g.camRig.yaw;
          const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
          const rx = Math.cos(yaw), rz = -Math.sin(yaw);
          const dx = rx * mv.x + fx * mv.y, dz = rz * mv.x + fz * mv.y;
          const target = Math.atan2(dx, dz);
          const diff = angleDiff(this.angle, target);
          // from a standstill a big turn is a turn-on-the-spot first, then the walk starts
          const still = Math.hypot(this.vel.x, this.vel.y) < 0.6;
          this.angle = dampAngle(this.angle, target, still ? 9 : 12, dt);
          turning = clamp(diff * 3, -1, 1);
          const sp = maxSpeed * Math.min(1, m) * (still && Math.abs(diff) > 1.2 ? 0.15 : Math.max(0.25, Math.cos(Math.min(Math.abs(diff), 1.5))));
          wx = Math.sin(this.angle) * sp;
          wz = Math.cos(this.angle) * sp;
        }
      }
    } else if (this.attackT > 0) {
      // small lunge while punching
      wx = Math.sin(this.angle) * 1.2; wz = Math.cos(this.angle) * 1.2;
    }
    // weight: accelerate and brake instead of snapping to speed (less grip in the air)
    const prevFwd = this.vel.x * Math.sin(this.angle) + this.vel.y * Math.cos(this.angle);
    const accel = !this.onGround ? 3 : (wx || wz) ? (beh === 'athletic' ? 9 : 12) : 14;
    const k = 1 - Math.exp(-accel * dt);
    this.vel.x += (wx - this.vel.x) * k; this.vel.y += (wz - this.vel.y) * k;
    const fwd = this.vel.x * Math.sin(this.angle) + this.vel.y * Math.cos(this.angle);
    this.rig.lean = clamp(((fwd - prevFwd) / Math.max(dt, 1e-3)) * 0.012, -0.18, 0.22);
    this.rig.roll = clamp(turning * Math.min(1, Math.hypot(this.vel.x, this.vel.y) / 4) * 0.12, -0.15, 0.15);
    this.rig.turn = turning;

    this.prevPos.copy(this.pos);
    P.move(this, this.vel.x * dt, this.vel.y * dt);
    this.applyKnockback(dt);
    const wasAir = !this.onGround;
    const landed = P.fall(this, dt);
    // too steep to stand on: slide down (and no jumping from here)
    const steep = this.onGround ? P.steepAt(this.pos.x, this.pos.z, this.pos.y) : null;
    this.sliding = !!steep;
    if (steep) {
      P.move(this, steep.dx * 5 * dt, steep.dz * 5 * dt);
      this.vel.set(steep.dx * 2.5, steep.dz * 2.5);
    }
    if (landed) {
      const v = -landed;
      if (v > 13) { this.damage(2, null); this.act('knockdown', 0.45, null, 0, ['getup', 0.8]); }
      else if (v > 6) { this.rig.land(Math.min(1.2, v / 10)); g.audio.play('land'); g.particles.burst(this.pos.x, this.pos.y + 0.1, this.pos.z, '#cbb994', 8, 2); }
      else if (wasAir) this.rig.land(0.4);
      if (this.jumpBuf > 0 && beh === 'athletic' && !this.sliding) this.jump();
    }
    if (this.pos.y < -3) this.respawnFromFall();
    this.speed = Math.hypot(this.pos.x - this.prevPos.x, this.pos.z - this.prevPos.z) / Math.max(dt, 1e-4);

    // footsteps
    if (this.onGround && this.speed > 0.5) {
      this.stepAcc += this.speed * dt;
      const stride = beh === 'athletic' ? 1.4 : 0.9;
      if (this.stepAcc > stride) { this.stepAcc = 0; if (beh !== 'discreet') g.audio.play('step-' + (g.surfaceAt?.(this.pos) || 'stone')); }
    }

    // behaviour action (Space / A)
    if (!wheel && input.pressed('action') && this.actT <= 0) {
      if (beh === 'athletic') {
        if ((this.onGround && !this.sliding) || this.coyote > 0) this.jump(); else this.jumpBuf = 0.15;
      } else if (beh === 'aggressive' && this.attackT <= 0) {
        this.combo = this.comboWindow > 0 ? (this.combo + 1) % 3 : 0;
        this.rig.play(['punch', 'punch2', 'kick'][this.combo]);
        this.rig.actionT = 0;
        this.attackT = this.combo === 2 ? 0.42 : 0.3;
        this.hitDone = false;
        g.audio.play('punch');
      } else if (beh === 'normal') {
        g.tryInteract();
      }
    }
    if (this.attackT > 0) {
      this.attackT -= dt;
      if (!this.hitDone && this.attackT < (this.combo === 2 ? 0.26 : 0.18)) {
        this.hitDone = true;
        g.meleeHit(this, this.combo === 2 ? 2 : 1, this.combo === 2 ? 1.9 : 1.6);
      }
      if (this.attackT <= 0) this.comboWindow = 0.45;
    }
    if (!wheel && input.pressed('interact') && this.actT <= 0) g.tryInteract();
    if (!wheel && (input.pressed('ball') || input.pressed('click'))) this.throwBall();
    // the ball leaves the hand at the end of the windup
    if (this.throwT > 0) {
      this.throwT -= dt;
      if (this.throwPending && this.throwT <= 0.5) { this.throwPending = false; g.ball.launch(this, this.throwBeh, this.throwLevel, this.throwStrong); g.audio.play('throw'); }
    }

    // animation state
    let anim = 'idle';
    if (this.actT > 0) anim = this.actAnim;
    else if (this.hurtT > 0) anim = 'hurt';
    else if (this.attackT > 0) anim = this.rig.anim;
    else if (this.throwT > 0) anim = 'throw';
    else if (!this.onGround || this.sliding) anim = this.vy > 0.5 ? 'jump' : 'fall';
    else if (this.hiding) anim = 'hide';
    else if (this.speed > 0.3) anim = beh === 'discreet' ? 'sneak' : this.speed > 3.6 ? 'run' : 'walk';
    else if (Math.abs(turning) > 0.5) anim = turning > 0 ? 'turnR' : 'turnL';
    this.rig.play(anim);
    this.rig.update(dt, this.speed);
    // blink while invulnerable
    this.rig.root.visible = this.invuln <= 0.5 || Math.floor(this.invuln * 20) % 2 === 0;
    this.sync();
  }

  // anticipation: a quick crouch, then the take-off (in the air already? jump now)
  jump() {
    this.prevRunSpeed = Math.hypot(this.vel.x, this.vel.y);
    this.coyote = 0; this.jumpBuf = 0;
    if (!this.onGround) { this.takeOff(); return; }
    this.act('jumpPrep', 0.09, () => this.takeOff(), 0.001);
  }
  takeOff() {
    this.vy = 9.6; this.onGround = false; this.actT = 0;
    this.vel.x = Math.sin(this.angle) * Math.max(Math.hypot(this.vel.x, this.vel.y), this.prevRunSpeed || 0);
    this.vel.y = Math.cos(this.angle) * Math.max(Math.hypot(this.vel.x, this.vel.y), this.prevRunSpeed || 0);
    this.game.audio.play('jump');
  }

  // play a one-shot body action that locks movement; cb fires when `at` seconds remain
  act(anim, dur, cb = null, at = 0, next = null) {
    this.actAnim = anim; this.actT = dur; this.actCb = cb; this.actFireT = at; this.actNext = next;
    this.rig.play(anim); this.rig.actionT = 0;
    this.vel.set(0, 0);
  }
  // turn toward a point, then act (valves, levers, doors, pick-ups)
  actAt(x, z, anim, dur, cb, at = 0) {
    this.angle = Math.atan2(x - this.pos.x, z - this.pos.z);
    this.act(anim, dur, cb, at);
  }

  respawnFromFall() {
    const p = this.game.lastSafe;
    this.pos.set(p.x, this.game.physics.groundAt(p.x, p.z), p.z);
    this.vy = 0; this.onGround = true; this.vel.set(0, 0);
    this.damage(1, null);
  }

  throwBall() {
    const g = this.game;
    if (!this.hasBall || g.ball.state !== 'idle' || this.throwT > 0 || this.hiding || this.actT > 0) return;
    let strong = true;
    if (this.mp >= 1) this.mp -= 1; else { strong = false; g.hud.toast('toast_nomp'); }
    this.throwT = 1.0; // LBA2's throw: 1.22 s, the ball leaves the hand halfway (0.62 s)
    this.throwPending = true; this.throwBeh = this.behaviour; this.throwLevel = strong ? this.magicLevel : 1; this.throwStrong = strong;
    this.rig.play('throw'); this.rig.actionT = 0;
    g.ball.holdIn(this);
  }

  damage(n, from, heavy = false) {
    if (this.invuln > 0 || this.dead) return;
    const g = this.game;
    this.hp -= n;
    this.invuln = 1.1;
    this.hurtT = 0.4;
    g.audio.play('hurt');
    g.hud.hurt();
    g.camRig.shake(0.3);
    if (from) {
      const a = Math.atan2(this.pos.x - from.x, this.pos.z - from.z);
      this.kb.set(Math.sin(a) * 7, Math.cos(a) * 7);
      this.rig.hitDir = angleDiff(this.angle, a + Math.PI); // 0 = hit from the front
      if (heavy && this.hp > 0) { this.angle = a + Math.PI; this.act('knockdown', 0.5, null, 0, ['getup', 0.8]); }
    }
    if (this.hp <= 0) {
      if (this.clovers > 0) {
        // LBA2: a clover leaf revives you on the spot with full life
        this.clovers--;
        this.hp = 0;
        this.invuln = 3;
        this.act('knockdown', 0.9, null, 0, ['getup', 0.9, () => {
          this.hp = this.maxHp; this.mp = this.mpMax;
          g.hud.toast('toast_clover');
          g.audio.play('heal');
          g.particles.burst(this.pos.x, this.pos.y + 1, this.pos.z, '#6fe36f', 30, 4);
        }, 0.6]);
      } else {
        this.hp = 0;
        this.dead = true;
        g.audio.play('die');
        this.deathT = 2.2;
        setTimeout(() => g.gameOver(), 2200);
      }
    }
  }
}

// ------------------------------------------------------------------ NPC
export class NPC extends Actor {
  constructor(game, def) {
    super(game, def.char ? createCharacter(def.char) : createHumanoid(def.look), def.x, def.z, 0.45);
    this.def = def;
    this.name = def.name;
    this.track = def.track ? new TrackRunner(def.track) : null;
    this.angle = def.angle ?? 0;
    this.talking = false;
    this.listenTo = null;
    this.forceAnim = def.anim || null;
    this.present = true;
  }
  setPresent(on) {
    this.present = on;
    this.rig.root.visible = on;
    if (this.shadow) this.shadow.visible = on;
    if (this.collider) this.collider.enabled = on;
  }
  // put the NPC somewhere (chapter placement): {x, z, a, anim, track}
  placeAt(p) {
    this.pos.set(p.x, this.game.physics.groundAt(p.x, p.z), p.z);
    if (p.a != null) this.angle = this.targetAngle = p.a;
    this.forceAnim = p.anim ?? null;
    if ('track' in p) this.track = p.track ? new TrackRunner(p.track) : null;
    this.sync();
  }
  update(dt) {
    if (!this.present || this.controlled) return;
    const hero = this.game.hero;
    const near = this.distTo(hero) < 3.2;
    let moving = false;
    if (this.listenTo && this.listenTo !== this) {
      this.angle = dampAngle(this.angle, this.angleTo(this.listenTo), 6, dt);
    } else if (this.talking || near) {
      this.angle = dampAngle(this.angle, this.angleTo(hero), 6, dt);
    } else if (this.track) {
      const s = this.track.step(this, dt);
      if (s.speed > 0) {
        this.angle = dampAngle(this.angle, Math.atan2(s.dx, s.dz), 6, dt);
        this.game.physics.move(this, s.dx * s.speed * 1.3 * dt, s.dz * s.speed * 1.3 * dt);
        moving = true;
      } else if (this.targetAngle != null) this.angle = dampAngle(this.angle, this.targetAngle, 4, dt);
    }
    this.game.physics.fall(this, dt);
    this.rig.play(this.talking ? 'talk' : moving ? 'walk' : this.listenTo ? 'listen' : this.forceAnim || 'idle');
    this.rig.update(dt, moving ? 1.3 : 0);
    this.sync();
  }
}

// ------------------------------------------------------------------ enemies
function labelTexture(ch, color) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.font = 'bold 54px system-ui, sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 8; x.strokeStyle = '#111';
  x.strokeText(ch, 32, 36);
  x.fillStyle = color; x.fillText(ch, 32, 36);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let TEX_Q, TEX_E;

export class Sentinel extends Actor {
  constructor(game, def) {
    const boss = !!def.boss;
    const rig = createHumanoid(boss
      ? { tunic: '#7a1f2a', pants: '#3b3f48', helmet: '#40444d', visor: '#ff3020', gun: true, pads: '#b8862b', boots: '#222', scale: 1.45, skin: '#9aa0a8' }
      : { tunic: '#6c737e', pants: '#4a505a', helmet: '#8b929c', visor: '#ff4a2a', gun: true, boots: '#2b2b2b', skin: '#9aa0a8' });
    super(game, rig, def.x, def.z, boss ? 0.75 : 0.45);
    this.id = def.id;
    this.boss = boss;
    this.group = def.group;
    this.maxHp = this.hp = boss ? 16 : 4;
    this.track = def.track ? new TrackRunner(def.track) : null;
    this.home = { x: def.x, z: def.z };
    this.angle = def.angle ?? 0;
    this.state = boss ? 'dormant' : 'patrol';
    this.suspicion = 0;
    this.shootT = 1.5;
    this.lostT = 0;
    this.lastSeen = new THREE.Vector3();
    this.deadT = 0;
    this.hurtT = 0;
    this.dashT = 0;
    this.speed = 0;
    TEX_Q ??= labelTexture('?', '#ffd23a');
    TEX_E ??= labelTexture('!', '#ff3a2a');
    this.icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX_Q, depthTest: false, transparent: true }));
    this.icon.scale.setScalar(0.8);
    this.icon.visible = false;
    this.icon.renderOrder = 10;
    game.scene.add(this.icon);
  }

  get alive() { return this.state !== 'dead'; }

  canSee() {
    const hero = this.game.hero;
    if (hero.dead) return false;
    const d = this.distTo(hero);
    const vis = hero.visibility();
    const range = (this.boss ? 30 : 15) * vis;
    if (d > range) return false;
    const fov = this.state === 'chase' ? 2.6 : 1.9;
    if (d > 2.0 && Math.abs(angleDiff(this.angle, this.angleTo(hero))) > fov / 2) return false;
    return this.game.physics.lineOfSight(this.pos.x, this.pos.y + 1.6, this.pos.z, hero.pos.x, hero.pos.y + 1.0, hero.pos.z);
  }

  alert(pos) {
    if (!this.alive || this.state === 'dormant') return;
    if (this.state !== 'chase') { this.game.audio.play('alert'); }
    this.state = 'chase';
    this.suspicion = 1;
    this.lostT = 0;
    if (pos) this.lastSeen.copy(pos);
  }

  damage(n, from) {
    if (!this.alive) return;
    const g = this.game;
    this.hp -= n;
    this.rig.hitFlash();
    this.hurtT = 0.25;
    g.audio.play('hit');
    g.particles.burst(this.pos.x, this.pos.y + 1.2, this.pos.z, '#ffd27a', 12, 4);
    if (from) {
      const a = Math.atan2(this.pos.x - from.x, this.pos.z - from.z);
      const k = this.boss ? 3 : 8;
      this.kb.set(Math.sin(a) * k, Math.cos(a) * k);
    }
    if (this.state === 'dormant') return;
    if (this.state !== 'chase') g.alertGroup(this.group, g.hero.pos);
    this.alert(g.hero.pos);
    if (this.boss) g.hud.boss(this.hp / this.maxHp);
    if (this.hp <= 0) this.die();
  }

  die() {
    const g = this.game;
    this.state = 'dead';
    this.icon.visible = false;
    g.audio.play('die');
    g.onEnemyKilled(this);
  }

  update(dt) {
    const g = this.game, hero = g.hero, P = g.physics;
    this.hurtT = Math.max(0, this.hurtT - dt);
    if (!this.alive) {
      this.deadT += dt;
      this.rig.play('dead');
      this.rig.update(dt, 0);
      if (this.deadT > 2.2) this.rig.root.position.y -= dt * 0.8;
      if (this.deadT > 4) this.rig.root.visible = false;
      else { this.rig.root.position.x = this.pos.x; this.rig.root.position.z = this.pos.z; if (this.deadT <= 2.2) this.rig.root.position.y = this.pos.y; }
      this.shadow.visible = this.deadT < 2.2;
      return;
    }
    if (this.state === 'dormant') {
      this.rig.play('idle'); this.rig.update(dt, 0);
      this.angle = dampAngle(this.angle, this.angleTo(hero), 2, dt);
      this.sync();
      return;
    }

    const sees = this.canSee();
    const d = this.distTo(hero);
    let mvx = 0, mvz = 0, sp = 0, anim = 'idle';

    if (this.state === 'patrol' || this.state === 'search') {
      if (sees) {
        const rate = (this.boss ? 3 : 1.4) * hero.visibility() * clamp(14 / Math.max(d, 1), 0.6, 4);
        this.suspicion += dt * rate;
        this.angle = dampAngle(this.angle, this.angleTo(hero), this.suspicion > 0.4 ? 4 : 1, dt);
        if (this.suspicion >= 1) { g.hud.toast('toast_alert'); g.alertGroup(this.group, hero.pos); this.alert(hero.pos); }
      } else {
        this.suspicion = Math.max(0, this.suspicion - dt * 0.25);
        // hearing: running nearby makes noise
        if (hero.speed > 4.5 && d < 7 && hero.onGround) this.suspicion += dt * 0.8;
      }
      if (this.state === 'patrol' && this.suspicion < 0.4 && this.track) {
        const s = this.track.step(this, dt);
        if (s.speed > 0) { mvx = s.dx; mvz = s.dz; sp = 1.7 * s.speed; }
        else if (this.targetAngle != null) this.angle = dampAngle(this.angle, this.targetAngle, 3, dt);
      } else if (this.state === 'search') {
        const dx = this.lastSeen.x - this.pos.x, dz = this.lastSeen.z - this.pos.z;
        const dl = Math.hypot(dx, dz);
        this.lostT += dt;
        if (dl > 1 && this.lostT < 6) { mvx = dx / dl; mvz = dz / dl; sp = 2.2; }
        else { this.angle += dt * 1.2; }
        if (this.lostT > 9) { this.state = 'patrol'; this.suspicion = 0.2; }
      }
    } else if (this.state === 'chase') {
      if (sees) { this.lastSeen.copy(hero.pos); this.lostT = 0; }
      else this.lostT += dt;
      if (this.lostT > (this.boss ? 99 : 5)) { this.state = 'search'; this.lostT = 0; }
      const ta = Math.atan2(this.lastSeen.x - this.pos.x, this.lastSeen.z - this.pos.z);
      this.angle = dampAngle(this.angle, ta, 7, dt);
      const ideal = this.boss ? 6 : 8;
      const dd = Math.hypot(this.lastSeen.x - this.pos.x, this.lastSeen.z - this.pos.z);
      if (!sees || dd > ideal + 2) { mvx = Math.sin(ta); mvz = Math.cos(ta); sp = this.boss ? 2.6 : 3.4; }
      else if (dd < ideal - 3) { mvx = -Math.sin(ta); mvz = -Math.cos(ta); sp = 1.8; }
      if (this.boss) this.bossLogic(dt, d, ta);
      this.shootT -= dt;
      if (sees && this.shootT <= 0 && this.hurtT <= 0) {
        this.shoot();
        const enraged = this.boss && this.hp < this.maxHp / 2;
        this.shootT = this.boss ? (enraged ? 0.9 : 1.4) : 1.5 + Math.random() * 0.6;
      }
      anim = this.shootT > (this.boss ? 0.7 : 1.2) ? 'shoot' : 'idle';
    }

    if (this.dashT > 0) { mvx = Math.sin(this.angle); mvz = Math.cos(this.angle); sp = 11; }
    if (sp > 0 && this.hurtT <= 0) {
      if (this.state !== 'chase') this.angle = dampAngle(this.angle, Math.atan2(mvx, mvz), 6, dt);
      P.move(this, mvx * sp * dt, mvz * sp * dt);
      if (this.boss) this.keepInArena();
      anim = sp > 3 ? 'run' : 'walk';
    }
    this.applyKnockback(dt);
    if (this.boss) this.keepInArena();
    P.fall(this, dt);
    if (this.hurtT > 0) anim = 'hurt';
    this.rig.play(anim);
    this.rig.update(dt, sp);
    this.sync();

    // ? / ! indicator
    const showQ = this.state !== 'chase' && this.suspicion > 0.12;
    this.icon.visible = showQ || (this.state === 'chase' && this.lostT < 1.5 && !this.boss);
    if (this.icon.visible) {
      this.icon.material.map = this.state === 'chase' ? TEX_E : TEX_Q;
      this.icon.material.opacity = this.state === 'chase' ? 1 : 0.4 + this.suspicion * 0.6;
      this.icon.position.set(this.pos.x, this.pos.y + 2.6 + Math.sin(performance.now() / 150) * 0.05, this.pos.z);
    }
  }

  bossLogic(dt, d, ta) {
    this.dashT = Math.max(0, this.dashT - dt);
    const enraged = this.hp < this.maxHp / 2;
    this.slamT = (this.slamT ?? 2) - dt;
    if (d < 2.4 && this.slamT <= 0) {
      this.slamT = 1.6;
      this.rig.play('kick'); this.rig.actionT = 0;
      this.game.camRig.shake(0.4);
      this.game.audio.play('rumble');
      this.game.particles.burst(this.pos.x, this.pos.y + 0.2, this.pos.z, '#bbb', 20, 5);
      this.game.hero.damage(2, this.pos);
    }
    if (enraged && this.dashT <= 0 && Math.random() < dt * 0.35 && d > 5) {
      this.dashT = 0.45;
      this.angle = ta;
    }
  }

  keepInArena() {
    const A = this.game.world.arena;
    this.pos.x = clamp(this.pos.x, A.x - A.half + 1, A.x + A.half - 1);
    this.pos.z = clamp(this.pos.z, A.z - A.half + 1, A.z + A.half - 1);
  }

  shoot() {
    const g = this.game;
    const m = this.rig.root.userData.muzzle;
    const from = new THREE.Vector3();
    m.getWorldPosition(from);
    const to = g.hero.pos.clone(); to.y += 1.0;
    const dir = to.sub(from).normalize();
    const spread = this.boss ? [-0.22, 0, 0.22] : [0];
    for (const s of spread) {
      const d2 = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), s);
      g.bolts.fire(from, d2, this.boss ? 15 : 13, this.boss ? 2 : 1);
    }
    g.audio.play('zap');
  }
}

// ------------------------------------------------------------------ magic ball
const BALL_THROW = {
  normal: { f: 11, up: 6, bounce: 0.7 },
  athletic: { f: 15, up: 9.5, bounce: 0.8 },
  aggressive: { f: 19, up: 2.5, bounce: 0.6 },
  discreet: { f: 7, up: 3, bounce: 0.5 },
};

export class MagicBall {
  constructor(game) {
    this.game = game;
    this.state = 'idle';
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.mat = new THREE.MeshStandardMaterial({ color: '#ffe68a', emissive: '#ffc400', emissiveIntensity: 3, roughness: 0.2 });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), this.mat);
    this.mesh.visible = false;
    game.scene.add(this.mesh);
    this.shadow = createBlobShadow(0.3);
    this.shadow.visible = false;
    game.scene.add(this.shadow);
    this.trail = [];
    const tg = new THREE.SphereGeometry(0.085, 8, 6);
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: '#ffd04a', transparent: true, opacity: 0.5 - i * 0.045, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.scale.setScalar(1 - i * 0.08);
      m.visible = false;
      game.scene.add(m);
      this.trail.push(m);
    }
    this.history = [];
  }

  // the ball sits in Twinsen's right hand during the wind-up
  holdIn(hero) {
    this.state = 'inhand';
    this.holder = hero;
    this.mesh.visible = true;
    this.mat.emissiveIntensity = 0.6;
    this.followHand();
  }
  followHand() {
    const hand = this.holder?.rig.j?.armR?.hand;
    if (hand) { hand.updateWorldMatrix(true, false); hand.getWorldPosition(this.mesh.position); this.mesh.position.y -= 0.08; }
    else this.mesh.position.set(this.holder.pos.x, this.holder.pos.y + 1.4, this.holder.pos.z);
  }

  launch(hero, beh, level, strong) {
    const t = BALL_THROW[beh];
    this.level = level;
    this.damage = level;
    this.bounces = strong ? 1 + level : 1;
    this.bounceK = t.bounce;
    // released from the hand, at the hand's position (the release event of the throw)
    if (this.state === 'inhand') { this.followHand(); this.pos.copy(this.mesh.position); this.pos.y = Math.max(this.pos.y, hero.pos.y + 1.2); }
    else this.pos.set(hero.pos.x + Math.sin(hero.angle) * 0.5, hero.pos.y + 1.6, hero.pos.z + Math.cos(hero.angle) * 0.5);
    this.vel.set(Math.sin(hero.angle) * t.f, t.up, Math.cos(hero.angle) * t.f);
    this.state = 'fly';
    this.life = 0;
    this.history = [];
    this.mesh.visible = true;
    this.mat.emissiveIntensity = strong ? 3 : 1;
  }

  update(dt) {
    this.shadow.visible = this.state !== 'idle' && this.state !== 'held' && this.state !== 'inhand';
    if (this.state === 'inhand') { this.followHand(); this.trail.forEach((m) => (m.visible = false)); return; }
    if (this.state === 'idle' || this.state === 'held') { this.trail.forEach((m) => (m.visible = false)); return; }
    const g = this.game, P = g.physics;
    this.life += dt;
    if (this.state === 'fly') {
      this.vel.y -= 22 * dt;
      this.assist(dt);
      // hits first, so targets mounted on posts register before the post deflects the ball
      if (g.ballHitTest(this.pos)) {
        g.particles.burst(this.pos.x, this.pos.y, this.pos.z, '#ffe27a', 16, 5);
        this.state = 'return';
        return;
      }
      const nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
      if (P.blockedAt(nx, nz, this.pos.y - 0.4, 0.15)) {
        this.vel.x *= -0.8; this.vel.z *= -0.8;
        this.bounce();
      } else { this.pos.x = nx; this.pos.z = nz; }
      this.pos.y += this.vel.y * dt;
      const gy = P.groundAt(this.pos.x, this.pos.z, this.pos.y) + 0.17;
      if (this.pos.y < gy) {
        this.pos.y = gy;
        this.vel.y = Math.max(4, Math.abs(this.vel.y) * this.bounceK);
        this.bounce();
      }
      if (gy < 0.2 && this.pos.y < 0.3) this.state = 'return'; // fell in the sea
      if (this.life > 2.6) this.state = 'return';
    } else if (this.state === 'return') {
      const hero = g.hero;
      const tx = hero.pos.x, ty = hero.pos.y + 1.4, tz = hero.pos.z;
      const d = new THREE.Vector3(tx - this.pos.x, ty - this.pos.y, tz - this.pos.z);
      const len = d.length();
      if (len < 0.7 || len > 40) { // (caught, or the hero changed rooms while it was out)
        this.state = 'idle';
        this.mesh.visible = false;
        g.audio.play('catch');
        return;
      }
      this.pos.addScaledVector(d.normalize(), Math.min(len, 24 * dt));
    }
    this.mesh.position.copy(this.pos);
    placeBlobShadow(this.shadow, P, this.pos.x, this.pos.y, this.pos.z);
    this.history.unshift(this.pos.clone());
    if (this.history.length > 20) this.history.pop();
    this.trail.forEach((m, i) => {
      const h = this.history[i * 2 + 1];
      m.visible = !!h && !g.renderer.retro;
      if (h) m.position.copy(h);
    });
  }

  // 2026 aim assist: during the first second the ball bends gently toward
  // an enemy or target that is roughly ahead (mites are small and low).
  assist(dt) {
    if (this.life > 1.1) return;
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp < 1) return;
    const hx = this.vel.x / sp, hz = this.vel.z / sp;
    let best = null, bd = 9;
    for (const t of this.game.ballAimTargets()) {
      const dx = t.x - this.pos.x, dz = t.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.3 || d > bd) continue;
      if ((dx * hx + dz * hz) / d < 0.82) continue; // within ~35°
      best = t; bd = d;
    }
    if (!best) return;
    const dx = best.x - this.pos.x, dz = best.z - this.pos.z, d = Math.hypot(dx, dz);
    const k = Math.min(1, dt * 5);
    const nx = hx + (dx / d - hx) * k, nz = hz + (dz / d - hz) * k, nl = Math.hypot(nx, nz);
    this.vel.x = (nx / nl) * sp; this.vel.z = (nz / nl) * sp;
    const tFly = d / sp;
    const wantVy = (best.y - this.pos.y) / Math.max(tFly, 0.12) + 11 * tFly;
    this.vel.y += (wantVy - this.vel.y) * Math.min(1, dt * 6);
  }

  bounce() {
    this.bounces--;
    this.game.audio.play('bounce');
    this.game.particles.burst(this.pos.x, this.pos.y, this.pos.z, '#ffe9a0', 5, 2);
    if (this.bounces < 0) this.state = 'return';
  }
}

// ------------------------------------------------------------------ enemy bolts
export class Bolts {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.geo = new THREE.SphereGeometry(0.16, 10, 8);
    this.mat = new THREE.MeshStandardMaterial({ color: '#ff8a7a', emissive: '#ff2a10', emissiveIntensity: 4 });
  }
  fire(from, dir, speed, dmg) {
    const m = new THREE.Mesh(this.geo, this.mat);
    m.position.copy(from);
    m.scale.set(1, 1, 2.2);
    m.lookAt(from.clone().add(dir));
    this.game.scene.add(m);
    this.list.push({ m, v: dir.clone().multiplyScalar(speed), life: 2.2, dmg });
  }
  clear() { for (const b of this.list) this.game.scene.remove(b.m); this.list = []; }
  update(dt) {
    const g = this.game, hero = g.hero, P = g.physics;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      b.m.position.addScaledVector(b.v, dt);
      b.life -= dt;
      const p = b.m.position;
      let dead = b.life <= 0;
      if (!dead && Math.hypot(p.x - hero.pos.x, p.z - hero.pos.z) < 0.55 && p.y > hero.pos.y && p.y < hero.pos.y + (hero.hiding ? 0.9 : 1.8)) {
        hero.damage(b.dmg, p);
        dead = true;
      }
      if (!dead && (g.terrain.heightAt(p.x, p.z) > p.y || P.blockedAt(p.x, p.z, p.y - 0.6, 0))) dead = true;
      if (dead) {
        g.particles.burst(p.x, p.y, p.z, '#ff6a4a', 8, 3);
        g.scene.remove(b.m);
        this.list.splice(i, 1);
      }
    }
  }
}

// ------------------------------------------------------------------ pickups
const PICK = {
  coin: () => {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color: '#ffd23a', emissive: '#c88a00', emissiveIntensity: 1.2, metalness: 0.8, roughness: 0.25 }));
    m.scale.set(1, 1.3, 0.45);
    return m;
  },
  heart: () => {
    const g = new THREE.Group();
    const mt = new THREE.MeshStandardMaterial({ color: '#ff4a5a', emissive: '#d0102a', emissiveIntensity: 1.2 });
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mt); a.position.set(-0.12, 0.08, 0); g.add(a);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), mt); b.position.set(0.12, 0.08, 0); g.add(b);
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.35, 10), mt); c.rotation.z = Math.PI; c.position.y = -0.12; g.add(c);
    return g;
  },
  flask: () => {
    const g = new THREE.Group();
    const mt = new THREE.MeshStandardMaterial({ color: '#5ab0ff', emissive: '#1a60ff', emissiveIntensity: 1.5, transparent: true, opacity: 0.9 });
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), mt); g.add(b);
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 8), mt); n.position.y = 0.25; g.add(n);
    return g;
  },
  clover: () => {
    const g = new THREE.Group();
    const mt = new THREE.MeshStandardMaterial({ color: '#5fe36a', emissive: '#18a030', emissiveIntensity: 1.2 });
    for (let i = 0; i < 3; i++) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mt);
      const a = (i / 3) * Math.PI * 2 + Math.PI / 2;
      l.position.set(Math.cos(a) * 0.14, Math.sin(a) * 0.14, 0); g.add(l);
    }
    return g;
  },
  // a singing crystal: three blue spikes from one root, like the well's crystals in miniature
  crystal: () => {
    const g = new THREE.Group();
    const mt = new THREE.MeshStandardMaterial({ color: '#9fe8ff', emissive: '#2a9aff', emissiveIntensity: 1.8, roughness: 0.15, flatShading: true });
    for (const [rx, rz, s] of [[0, 0, 1], [0.5, 0.2, 0.62], [-0.45, -0.3, 0.55]]) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), mt);
      m.scale.set(0.8 * s, 2.2 * s, 0.8 * s); m.rotation.set(rx, 0, rz); m.position.set(rz * -0.35, 0.2 * s, rx * 0.35); g.add(m);
    }
    return g;
  },
  shard: () => {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), new THREE.MeshStandardMaterial({ color: '#fff0a0', emissive: '#ffb000', emissiveIntensity: 3.5, metalness: 0.3, roughness: 0.1 }));
    m.scale.set(0.7, 1.4, 0.7); g.add(m);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.03, 6, 32), new THREE.MeshBasicMaterial({ color: '#ffe080', transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending }));
    ring.rotation.x = Math.PI / 2; g.add(ring);
    return g;
  },
};

export class Pickups {
  constructor(game) { this.game = game; this.list = []; }
  spawn(type, x, y, z, opts = {}) {
    const mesh = PICK[type]();
    mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    mesh.position.set(x, y, z);
    this.game.scene.add(mesh);
    const p = { type, mesh, pos: mesh.position, vel: new THREE.Vector3(), t: Math.random() * 6, delay: 0, ...opts };
    if (opts.pop) { p.vel.set((Math.random() - 0.5) * 4, 6 + Math.random() * 2, (Math.random() - 0.5) * 4); p.delay = 0.4; }
    p.baseY = y;
    this.list.push(p);
    return p;
  }
  clear() { for (const p of this.list) this.game.scene.remove(p.mesh); this.list = []; }
  update(dt) {
    const g = this.game, hero = g.hero;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      p.delay -= dt;
      if (p.vel.lengthSq() > 0.01) {
        p.vel.y -= 20 * dt;
        p.pos.addScaledVector(p.vel, dt);
        const gy = g.physics.groundAt(p.pos.x, p.pos.z, p.pos.y) + 0.45;
        if (p.pos.y < gy) { p.pos.y = gy; p.vel.y = Math.abs(p.vel.y) * 0.35; p.vel.x *= 0.6; p.vel.z *= 0.6; if (Math.abs(p.vel.y) < 1) p.vel.set(0, 0, 0); }
        p.baseY = p.pos.y;
      } else {
        p.pos.y = p.baseY + Math.sin(p.t * 2.5) * 0.12;
      }
      p.mesh.rotation.y += dt * (p.type === 'shard' || p.type === 'crystal' ? 1.2 : 2.5);
      if (p.delay > 0 || hero.dead) continue;
      const dx = hero.pos.x - p.pos.x, dz = hero.pos.z - p.pos.z;
      const d = Math.hypot(dx, dz);
      const dy = Math.abs(hero.pos.y + 0.8 - p.pos.y);
      if (p.type === 'coin' && d < 3.2 && dy < 2.5) { p.pos.x += (dx / d) * dt * 9; p.pos.z += (dz / d) * dt * 9; p.baseY += (hero.pos.y + 0.8 - p.baseY) * dt * 6; }
      const big = p.type === 'shard' || p.type === 'crystal';
      if (d < (big ? 1.4 : 1.0) && dy < (big ? 2.6 : 1.6)) {
        g.collect(p);
        g.scene.remove(p.mesh);
        this.list.splice(i, 1);
      }
    }
  }
}

// ------------------------------------------------------------------ particles
export class Particles {
  constructor(scene, n = 700) {
    this.n = n;
    this.pos = new Float32Array(n * 3).fill(-9999);
    this.col = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.i = 0;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.c = new THREE.Color();
  }
  burst(x, y, z, color, count = 10, speed = 3) {
    this.c.set(color);
    for (let k = 0; k < count; k++) {
      const i = this.i; this.i = (this.i + 1) % this.n;
      this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = speed * (0.4 + Math.random() * 0.6);
      const r = Math.sqrt(1 - u * u);
      this.vel[i * 3] = Math.cos(a) * r * s; this.vel[i * 3 + 1] = Math.abs(u) * s + 1; this.vel[i * 3 + 2] = Math.sin(a) * r * s;
      this.col[i * 3] = this.c.r; this.col[i * 3 + 1] = this.c.g; this.col[i * 3 + 2] = this.c.b;
      this.life[i] = 0.5 + Math.random() * 0.5;
    }
  }
  update(dt) {
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.pos[i * 3 + 1] = -9999; continue; }
      this.vel[i * 3 + 1] -= 9 * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const f = 1 - dt * 2;
      this.col[i * 3] *= f; this.col[i * 3 + 1] *= f; this.col[i * 3 + 2] *= f;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ crystal mites (the well)
// Small creatures grown from the new crystals: they skitter, lunge and bite.
function createMiteRig() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const shell = new THREE.MeshStandardMaterial({ color: '#7fe8ff', emissive: '#1aa0d0', emissiveIntensity: 1.2, roughness: 0.2 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2a3340', roughness: 0.6 });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), dark);
  core.position.y = 0.4; core.scale.set(1.2, 0.8, 1.4); body.add(core);
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), shell);
    c.position.set((i % 2 ? 1 : -1) * 0.12, 0.62, -0.15 + Math.floor(i / 2) * 0.2); c.scale.y = 2; c.rotation.z = (i % 2 ? -1 : 1) * 0.4;
    body.add(c);
  }
  const eye = new THREE.MeshStandardMaterial({ color: '#ff5a3a', emissive: '#ff3a1a', emissiveIntensity: 2 });
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), eye); e.position.set(sx * 0.1, 0.45, 0.42); body.add(e); }
  const legs = [];
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1;
    const g = new THREE.Group();
    g.position.set(side * 0.25, 0.4, -0.2 + (i % 3) * 0.2);
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.5, 4), dark);
    l.position.set(side * 0.2, -0.15, 0); l.rotation.z = side * 0.9;
    g.add(l); body.add(g); legs.push(g);
  }
  const rig = { root, anim: 'idle', t: 0, flash: 0, mats: [shell],
    play(a) { this.anim = a; }, hitFlash() { this.flash = 1; },
    update(dt, speed = 0) {
      this.t += dt * (2 + speed * 4);
      legs.forEach((g, i) => { g.rotation.x = Math.sin(this.t * 3 + i * 1.7) * 0.5 * Math.min(1, speed + 0.1); });
      body.position.y = Math.abs(Math.sin(this.t * 3)) * 0.04;
      if (this.anim === 'dead') { body.rotation.z = Math.min(Math.PI, body.rotation.z + dt * 8); }
      this.flash = Math.max(0, this.flash - dt * 4);
      shell.emissiveIntensity = 1.2 + this.flash * 3;
    } };
  rig.j = {};
  return rig;
}

export class Mite extends Actor {
  constructor(game, def) {
    super(game, createMiteRig(), def.x, def.z, 0.4);
    this.id = def.id;
    this.group = 'well';
    this.boss = false;
    this.hp = this.maxHp = 2;
    this.state = 'idle';
    this.home = { x: def.x, z: def.z };
    this.biteT = 0; this.wanderT = Math.random() * 3; this.deadT = 0; this.hurtT = 0;
    this.angle = Math.random() * 6;
  }
  get alive() { return this.state !== 'dead'; }
  alert() { if (this.alive) this.state = 'chase'; }
  damage(n, from) {
    if (!this.alive) return;
    const g = this.game;
    this.hp -= n; this.rig.hitFlash(); this.hurtT = 0.3;
    g.audio.play('hit');
    g.particles.burst(this.pos.x, this.pos.y + 0.5, this.pos.z, '#9ff4ff', 14, 4);
    if (from) { const a = Math.atan2(this.pos.x - from.x, this.pos.z - from.z); this.kb.set(Math.sin(a) * 9, Math.cos(a) * 9); }
    this.state = 'chase';
    if (this.hp <= 0) { this.state = 'dead'; g.audio.play('break'); g.particles.burst(this.pos.x, this.pos.y + 0.4, this.pos.z, '#bff8ff', 30, 5); g.onEnemyKilled(this); }
  }
  update(dt) {
    const g = this.game, hero = g.hero;
    this.hurtT = Math.max(0, this.hurtT - dt);
    if (!this.alive) {
      this.deadT += dt; this.rig.play('dead'); this.rig.update(dt, 0);
      if (this.deadT > 1.2) this.rig.root.visible = false;
      this.sync(); return;
    }
    const d = this.distTo(hero);
    let sp = 0, dir = this.angle;
    if (this.state === 'idle') {
      this.wanderT -= dt;
      if (this.wanderT < 0) { this.wanderT = 1.5 + Math.random() * 2; this.angle = Math.atan2(this.home.x - this.pos.x + (Math.random() - 0.5) * 4, this.home.z - this.pos.z + (Math.random() - 0.5) * 4); }
      sp = this.wanderT > 1 ? 1.2 : 0;
      if (d < 6 && !hero.dead) { this.state = 'chase'; g.audio.play('alert'); }
    } else if (this.state === 'chase') {
      dir = this.angleTo(hero);
      this.angle = dampAngle(this.angle, dir, 8, dt);
      sp = d > 1.0 ? 3.4 : 0;
      this.biteT -= dt;
      if (d < 1.1 && this.biteT <= 0 && this.hurtT <= 0) { this.biteT = 1.2; hero.damage(1, this.pos); }
      if (d > 14) this.state = 'idle';
    }
    if (sp > 0 && this.hurtT <= 0) g.physics.move(this, Math.sin(this.angle) * sp * dt, Math.cos(this.angle) * sp * dt);
    this.applyKnockback(dt);
    g.physics.fall(this, dt);
    this.rig.update(dt, sp);
    this.sync();
  }
}
