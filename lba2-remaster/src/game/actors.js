// Actors: the hero, NPCs, Grey Sentinels (+ the Warden), the magic ball,
// projectiles, pickups and particles.
import * as THREE from 'three';
import { createHumanoid, createBlobShadow, placeBlobShadow } from '../engine/rig.js';
import { createCharacter, addSilhouette, writeBodyStencil, LOOKS } from './characters.js';
import { TrackRunner } from '../engine/scripts.js';
import { angleDiff, dampAngle, clamp } from '../engine/math.js';
import { HeroCombat } from './combat.js';
import { WATER_FLOOR } from '../engine/physics.js';

export const BEHAVIOURS = ['normal', 'athletic', 'aggressive', 'discreet'];
// The jump (CONTROL-FEEL, WORKLIST #31; the user: "the jump is too high"). LBA2's jump (ANIM.HQR 71, the hero's File3D
// jump in every behaviour; docs/LBA2_MEASUREMENTS.md "Jump and dodges") rises 714 of Twinsen's 1238 units (0.577 H) and
// carries him 1919 units (1.55 H) forward. Here the same height and length, H = 2.065 m: 1.19 m up, 3.2 m along (it was
// 1.77 m up, 3.6 m at a run). The time in the air stays 0.72 s (LBA2 crouches 0.52 s first and floats 1.0 s; ours keeps
// its quick 0.09 s crouch), so the jump has its own gravity (`g`) until he is back down at his take-off height; a fall
// further, the ball, enemies and pickups keep GRAVITY. A run's speed is trimmed to `speed` at the take-off and in the
// air. The landing looks and sounds as before (`feel`: the take-off speed its squash and dust were tuned on).
export const JUMP = (() => {
  const H = 2.065, apex = (714 / 1238) * H, len = (1919 / 1238) * H, air = 0.72;
  return { apex, len, air, vy: (4 * apex) / air, g: (8 * apex) / (air * air), speed: len / air, feel: 9.6 };
})();
// How each behaviour moves, from LBA2 itself (CTRL-1; docs/COMBAT.md "Movement and camera"). Speeds are the root motion
// of the original walk / back-step anims (ANIM.HQR 1/2, 67/68, 83/84, 94/95: distance per loop ÷ loop time, in body
// heights H = 1238 units, here 2.065 m): Normal 0.97 / 0.86 H/s, Athletic 2.40 / 1.14, Aggressive 1.22 / 0.79,
// Discreet 0.32 / 0.32. Turning while moving is 90°/s in every behaviour (OBJECT.CPP ManualRealAngle: 1024 of 4096 a
// second, no ramp); standing, the turn-on-the-spot anims (3/4, 69/70, 85/86, 96/97: root rotation ÷ time) turn
// Normal 100°/s, Athletic 169°/s, Aggressive 116°/s, Discreet 90°/s. LBA2 starts its walk after the anim's blend
// (0.14–0.4 s standing still) and stops dead; ours starts at once and ramps up in a beat (`up`, m/s²: Athletic builds
// up over ~0.45 s as the run's first keys do) and stops in < 0.2 s (`down`), with no turn-before-move delay.
export const GAITS = {
  normal: { fwd: 2.0, back: 1.78, turn: 100, up: 18, down: 30 },
  athletic: { fwd: 4.96, back: 2.36, turn: 169, up: 11, down: 30 },
  aggressive: { fwd: 2.52, back: 1.64, turn: 116, up: 22, down: 30 },
  discreet: { fwd: 0.67, back: 0.67, turn: 90, up: 8, down: 16 },
};
const WALK_TURN = Math.PI / 2;   // 90°/s while walking (and while aiming the ball with the arrows)
const DEG = Math.PI / 180;
// Twinsen: blue tunic, light trousers, brown ponytail
export const HERO_LOOK = 'twinsen';

// The sword Yorna gives Twinsen (chapter 6): a short, slightly curved blade with a brass guard. Built along
// the hand's -y (the continuation of the forearm), so arm swings read as blade swings.
function buildSword() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: '#d8e0e8', metalness: 0.8, roughness: 0.25 });
  const brass = new THREE.MeshStandardMaterial({ color: '#e0b25a', metalness: 0.7, roughness: 0.35 });
  const grip = new THREE.MeshStandardMaterial({ color: '#5a3a24', roughness: 0.8 });
  const add = (geo, m, y, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.y = y; o.rotation.z = rz; o.castShadow = true; g.add(o); return o; };
  add(new THREE.CylinderGeometry(0.022, 0.024, 0.16, 8), grip, 0.0);
  add(new THREE.SphereGeometry(0.032, 8, 6), brass, 0.09);
  add(new THREE.BoxGeometry(0.2, 0.03, 0.05), brass, -0.09);
  const blade = new THREE.Shape(); blade.moveTo(-0.022, 0); blade.lineTo(0.024, 0); blade.quadraticCurveTo(0.03, -0.4, 0.008, -0.72); blade.lineTo(-0.01, -0.66); blade.quadraticCurveTo(-0.02, -0.35, -0.022, 0);
  const bg = new THREE.ExtrudeGeometry(blade, { depth: 0.012, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 1 }); bg.translate(0, 0, -0.006);
  add(bg, steel, -0.1);
  g.rotation.x = -0.25; // a little forward of the forearm line
  g.position.y = -0.05;
  writeBodyStencil(g); // (the hero's silhouette doesn't show through his own sword)
  return g;
}

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
    addSilhouette(this.rig);
    this.rig.footPlant = true;   // (ANIM-COMBAT: his feet stay planted while he stands, strikes and throws: Rig._plant)
    this.isHero = true;
    this.behaviour = 'normal';
    this.maxHp = 10; this.hp = 10;
    this.magicLevel = 1; this.mp = 8;
    this.clovers = 2; this.coins = 0;
    this.hasKey = false;
    this.hasBall = false; // still in the cupboard at home
    this.shards = [false, false, false];
    this.invuln = 0; this.hurtT = 0; this.hiding = false; this.dead = false;
    // weapons: the ball (once found), the sword (chapter 6), Baldino's pulse tool (chapter 10), fists always
    this.hasSword = false; this.hasPulse = false; this.weapon = 'ball'; this.prevWeapon = 'fists';
    this.combat = new HeroCombat(this);
    this.speed = 0; this.stepAcc = 0;
    this.vel = new THREE.Vector2();
    this.fwdSpeed = 0;   // Classic: the speed along the facing (signed; the tank moves only along it)
    // What the body really did this frame, for the animator, the camera and the sounds (CTRL-1): resolved speed
    // (m/s, the ground actually covered: zero against a wall), its forward / sideways parts relative to the facing,
    // the turn rate (rad/s, + = left), grounded, `landed` (the impact speed on the frame he lands, else 0), whether he
    // steps backward, and `blocked` (asked to move, got less than a quarter of it).
    this.motion = { speed: 0, fwd: 0, side: 0, turnRate: 0, grounded: true, landed: 0, backward: false, blocked: false, wanted: 0 };
    this.actT = 0;
    this.prevPos = this.pos.clone();
  }
  get mpMax() { return 6 + this.magicLevel * 2; }

  // Play as someone else for a while (Zoe's segments): swap the body, keep the controller.
  swapBody(look) {
    const g = this.game;
    this.bodies ??= { twinsen: this.rig };
    if (!this.bodies[look]) { this.bodies[look] = createCharacter(look); addSilhouette(this.bodies[look]); this.bodies[look].footPlant = true; }
    if (this.rig === this.bodies[look]) return;
    g.scene.remove(this.rig.root);
    this.rig = this.bodies[look];
    g.scene.add(this.rig.root);
    this.body = look;
    this.sync();
  }

  visibility() {
    // a sandstorm (Desert Island) hides him too, and so does a borrowed technician's coat (chapter 9)
    const st = this.game.room?.storm?.level ?? 0, k = (1 - st * 0.6) * (this.disguised ? 0.45 : 1);
    if (this.hiding) return 0.12 * k;
    if (this.behaviour === 'discreet') return (this.speed > 0.2 ? 0.4 : 0.25) * k;
    if (this.behaviour === 'athletic' && this.speed > 4) return 1.25 * k;
    return k;
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
    this.mp = Math.min(this.mpMax, this.mp + dt * 0.35);
    this.coyote = this.onGround && !this.sliding ? 0.12 : Math.max(0, (this.coyote || 0) - dt);
    this.jumpBuf = Math.max(0, (this.jumpBuf || 0) - dt);

    if (this.dead) {
      this.rig.play('dead'); this.rig.update(dt, 0); P.fall(this, dt); this.sync();
      // the game-over screen after the fall (game time: a pause holds it)
      if (this.deathT > 0 && (this.deathT -= dt) <= 0) g.gameOver();
      return;
    }

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
    const gait = GAITS[beh] || GAITS.normal;
    const maxSpeed = gait.fwd * (this.speedK || 1);
    const angle0 = this.angle;
    let wanted = 0, classicGround = false;
    this.hiding = beh === 'discreet' && input.down('action') && this.onGround && !wheel;
    let wx = 0, wz = 0, turning = 0;
    // one-shot actions (use, pick up, open door, knockdown/get-up) own the body
    if (this.actT > 0) {
      this.actT -= dt;
      if (this.actCb && this.actT <= this.actFireT) { const cb = this.actCb; this.actCb = null; cb(); }
      if (this.actT <= 0 && this.actNext) { const n = this.actNext; this.actNext = null; this.act(...n); }
    }
    // combat: attacks, the dodge, the ball throw (camera-relative move direction for aiming and dodging)
    const mvDir = this.moveDir(mv, g);
    this.wantsMove = Math.hypot(mv.x, mv.y) > 0.3;
    // the pad has no separate interact button: A talks / opens whenever something is in reach, in every behaviour
    const jet = g.gadgets?.jet;   // Baldino's hop-pack (jetpack.js): in the air on it, A and E don't talk or use
    const padTalk = !wheel && input.padAction && input.pressed('action') && this.actT <= 0 && !this.combat.busy && !jet?.air && !!g.findInteractable();
    const cs = this.combat.update(dt, input, mvDir, {
      blocked: wheel || this.hiding || this.hurtT > 0.15 || this.actT > 0 || g.trans || !this.hasBall && this.noBehaviours,
      actionAttack: beh === 'aggressive' && !wheel && !padTalk && input.pressed('action'),
    });
    const locked = cs.lock || this.hiding || this.hurtT > 0.15 || this.actT > 0;
    const speedK = cs.speedK ?? 1;
    // a few steps the game asked for (walkTo): the player's own stick takes over at once; a hit cancels them
    if (this.steer && (Math.hypot(mv.x, mv.y) > 0.3 || this.hurtT > 0.15 || wheel)) this.steer = null;

    if (!locked && this.steer) {
      const s = this.steerStep(dt);
      wx = s.wx; wz = s.wz; turning = s.turning;
    } else if (!locked) {
      if (g.settings.controls === 'classic') {
        // LBA2's tank controls: left/right turn the body, up walks forward, down steps backward; no strafing. Holding
        // the ball to aim plants the feet: left/right turn the aim (90°/s, as LBA2 turns him while aiming), release
        // throws. The turn starts and stops on the frame of the key (a stick turns in proportion to its tilt); the
        // walk ramps up in a beat and stops short (GAITS). He moves only along his facing, so a turn never drifts.
        const ax = Math.abs(mv.x), ky = Math.abs(mv.y) > 0.3 ? Math.sign(mv.y) : 0;
        const kx = mv.analog ? Math.sign(mv.x) * clamp((ax - 0.2) / 0.6, 0, 1) : (ax > 0.3 ? Math.sign(mv.x) : 0);
        const planted = cs.anim === 'charge';
        const walking = ky !== 0 && !planted;
        this.angle -= kx * (walking || planted ? WALK_TURN : gait.turn * DEG) * dt;
        turning = -Math.sign(kx);
        const target = planted ? 0 : (ky > 0 ? gait.fwd : ky < 0 ? -gait.back : 0) * (this.speedK || 1) * speedK;
        if (this.vel.lengthSq() < 1e-6) this.fwdSpeed = 0;   // (stopped by the game: a scene change, a dialogue, a placement)
        const f0 = this.fwdSpeed;
        const acc = target !== 0 && Math.sign(target) === Math.sign(f0 || target) && Math.abs(target) >= Math.abs(f0) ? gait.up : gait.down;
        this.fwdSpeed = f0 + clamp(target - f0, -acc * dt, acc * dt);
        wx = Math.sin(this.angle) * this.fwdSpeed;
        wz = Math.cos(this.angle) * this.fwdSpeed;
        wanted = Math.abs(target);
        classicGround = this.onGround;
        this.backward = this.fwdSpeed < -0.05;
      } else {
        const m = Math.hypot(mv.x, mv.y);
        if (m > 0.08) {
          const yaw = this.inputYaw(mv, g);
          const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
          const rx = Math.cos(yaw), rz = -Math.sin(yaw);
          const dx = rx * mv.x + fx * mv.y, dz = rz * mv.x + fz * mv.y;
          // while aiming or charging the body keeps facing the aim; the feet still move where asked
          const target = cs.face ?? Math.atan2(dx, dz);
          const diff = angleDiff(this.angle, target);
          // from a standstill a big turn is a turn-on-the-spot first, then the walk starts
          const still = Math.hypot(this.vel.x, this.vel.y) < 0.6;
          this.angle = dampAngle(this.angle, target, still ? 9 : 12, dt);
          turning = clamp(diff * 3, -1, 1);
          if (cs.face != null) {
            // aiming: walk (slower) in the stick's direction without turning the body away
            const sp = maxSpeed * Math.min(1, m) * speedK, d = Math.hypot(dx, dz) || 1;
            wx = (dx / d) * sp; wz = (dz / d) * sp; wanted = sp;
          } else {
            const sp = maxSpeed * Math.min(1, m) * speedK * (still && Math.abs(diff) > 1.2 ? 0.15 : Math.max(0.25, Math.cos(Math.min(Math.abs(diff), 1.5))));
            wx = Math.sin(this.angle) * sp;
            wz = Math.cos(this.angle) * sp;
            wanted = sp;
          }
        } else if (cs.face != null) this.angle = dampAngle(this.angle, cs.face, 12, dt);
      }
    }
    if (cs.drive) { wx = cs.drive.x; wz = cs.drive.z; }
    // (in a jump's air the run is held to the jump's own speed: JUMP)
    if (this.gravity && !this.onGround) { const w = Math.hypot(wx, wz); if (w > JUMP.speed) { wx *= JUMP.speed / w; wz *= JUMP.speed / w; } }
    // weight: accelerate and brake instead of snapping to speed (less grip in the air)
    const prevFwd = this.vel.x * Math.sin(this.angle) + this.vel.y * Math.cos(this.angle);
    // (classic on the ground: the ramp is already in fwdSpeed — LBA2 starts and stops almost at once, its motion
    // comes from the animation, not a push; in the air, in a dodge or while an action holds him: as before)
    const classic = g.settings.controls === 'classic';
    if (classicGround && !cs.drive) this.vel.set(wx, wz);
    else {
      const accel = cs.drive ? 40 : !this.onGround ? 3 : classic ? 26 : (wx || wz) ? (beh === 'athletic' ? 9 : 12) : 14;
      const k = 1 - Math.exp(-accel * dt);
      this.vel.x += (wx - this.vel.x) * k; this.vel.y += (wz - this.vel.y) * k;
    }
    const fwd = this.vel.x * Math.sin(this.angle) + this.vel.y * Math.cos(this.angle);
    if (!classicGround || cs.drive) this.fwdSpeed = fwd;   // (Classic picks up from what the body is really doing)
    this.rig.lean = clamp(((fwd - prevFwd) / Math.max(dt, 1e-3)) * 0.012, -0.18, 0.22);
    this.rig.roll = clamp(turning * Math.min(1, Math.hypot(this.vel.x, this.vel.y) / 4) * 0.12, -0.15, 0.15);
    this.rig.turn = turning;

    jet?.step(this, dt, input, wx, wz);   // (the pack's thrust and steering, before the move and the fall)
    this.prevPos.copy(this.pos);
    P.move(this, this.vel.x * dt, this.vel.y * dt);
    jet?.clearance(this);
    this.applyKnockback(dt);
    this.keepApart(dt);
    const wasAir = !this.onGround;
    // the jump's own gravity ends once he is back down at his take-off height, or the hop-pack has him (JUMP)
    if (this.gravity && (this.onGround || this.vy < -JUMP.vy || jet?.firing)) this.gravity = null;
    const landed = P.fall(this, dt);
    // too steep to stand on: slide down (and no jumping from here)
    const steep = this.onGround ? P.steepAt(this.pos.x, this.pos.z, this.pos.y) : null;
    this.sliding = !!steep;
    if (steep) {
      P.move(this, steep.dx * 5 * dt, steep.dz * 5 * dt);
      this.vel.set(steep.dx * 2.5, steep.dz * 2.5);
      // slid down to the water's edge (or against a wall) and held there: too steep to climb, sea below, no
      // jumping while sliding — a trap. Not moving at all for a second while sliding counts as a fall.
      this.slideStuck = Math.hypot(this.pos.x - this.prevPos.x, this.pos.z - this.prevPos.z) < 1e-3 ? (this.slideStuck || 0) + dt : 0;
      if (this.slideStuck > 1) { this.slideStuck = 0; this.respawnFromFall(); }
    } else this.slideStuck = 0;
    if (landed) {
      // (a jump's landing looks and sounds as it did before the jump was lowered: `feel` is that jump's own speed)
      const v = -landed, vf = this.gravity ? v * (JUMP.feel / JUMP.vy) : v;
      this.gravity = null;
      if (v > 13) { this.damage(2, null); this.act('knockdown', 0.45, null, 0, ['getup', 0.8]); }
      else if (vf > 6) { this.rig.land(Math.min(1.2, vf / 10)); g.audio.play('land'); g.particles.burst(this.pos.x, this.pos.y + 0.1, this.pos.z, '#cbb994', 8, 2); }
      else if (wasAir) this.rig.land(0.4);
      if (this.jumpBuf > 0 && beh === 'athletic' && !this.sliding) this.jump();
    }
    if (this.pos.y < -3) this.respawnFromFall();
    this.speed = Math.hypot(this.pos.x - this.prevPos.x, this.pos.z - this.prevPos.z) / Math.max(dt, 1e-4);
    {
      // what really happened (resolved displacement, not the request): see `motion` in the constructor
      const M = this.motion, ddx = (this.pos.x - this.prevPos.x) / Math.max(dt, 1e-4), ddz = (this.pos.z - this.prevPos.z) / Math.max(dt, 1e-4);
      const sa = Math.sin(this.angle), ca = Math.cos(this.angle);
      M.speed = this.speed; M.fwd = ddx * sa + ddz * ca; M.side = ddx * ca - ddz * sa;
      M.turnRate = angleDiff(angle0, this.angle) / Math.max(dt, 1e-4);
      M.grounded = this.onGround; M.landed = landed ? -landed : 0; M.backward = M.fwd < -0.05;
      M.wanted = wanted; M.blocked = wanted > 0.3 && this.speed < wanted * 0.25;
    }

    // footsteps
    if (this.onGround && this.speed > 0.5) {
      this.stepAcc += this.speed * dt;
      const stride = beh === 'athletic' ? 1.4 : 0.9;
      if (this.stepAcc > stride) { this.stepAcc = 0; if (beh !== 'discreet') g.audio.play('step-' + (g.surfaceAt?.(this.pos) || 'stone')); }
    }

    // behaviour action (Space / A): jump (Athletic), talk (Normal); Aggressive attacks through the combat
    // controller above (the same moves as the attack button), Discreet hides (held)
    if (padTalk) g.tryInteract();
    else if (!wheel && input.pressed('action') && this.actT <= 0 && !this.combat.busy) {
      if (beh === 'athletic') {
        if ((this.onGround && !this.sliding) || this.coyote > 0) this.jump(); else this.jumpBuf = 0.15;
      } else if (beh === 'normal') {
        if (!g.tryInteract() && this.onGround) this.hop();
      }
    }
    // (the interact key also searches a container in any behaviour, as LBA2's action key does: OBJECT.CPP ActionNormal)
    if (!wheel && input.pressed('interact') && this.actT <= 0 && !this.combat.busy && !jet?.air && !g.tryInteract() && (beh === 'normal' || g.giverInReach()) && this.onGround) this.hop();

    if (this.hasSword || this.swordMesh) this.showSword(this.combat.weapon === 'sword');
    // animation state
    let anim = 'idle';
    // a throw or a charge on the move: the legs keep walking and the arms throw on the rig's upper-body layer;
    // standing, the planted full-body throw
    const moving = this.onGround && this.speed > 0.3;
    if (cs.upper) this.rig.overlay(cs.upper.kind, cs.upper.t);
    this.rig.moveRel = moving && (cs.face != null || (classic && this.backward)) ? angleDiff(this.angle, Math.atan2(this.vel.x, this.vel.y)) : 0;
    if (this.actT > 0) anim = this.actAnim;
    else if (this.hurtT > 0) anim = 'hurt';
    else if (cs.upper && moving) anim = this.speed > 3.6 ? 'run' : 'walk';
    else if (cs.anim) anim = cs.anim;
    else if (!this.onGround || this.sliding) anim = jet?.firing ? 'jet' : this.vy > 0.5 ? 'jump' : 'fall';
    else if (this.hiding) anim = 'hide';
    else if (this.speed > 0.3) anim = beh === 'discreet' ? 'sneak' : this.speed > 3.6 ? 'run' : 'walk';
    else if (Math.abs(turning) > 0.5) anim = turning > 0 ? 'turnR' : 'turnL';
    this.rig.play(anim);
    // (the rig plants his feet in world space: it needs this frame's place and facing, and to know he stands on firm ground)
    this.rig.root.position.copy(this.pos); this.rig.root.rotation.y = this.angle;
    this.rig.plantFrame = this.onGround && !this.sliding;
    // engaged in a fight (a locked target, a move, a held charge or heavy blow, a hit taken, and 2.5 s after): his idle
    // is his combat stance for the weapon in hand; with a lock his head and chest turn to the target
    const C = this.combat, lock = g.targeting?.lock;
    this.engagedT = lock || C.busy || C.holding || this.hurtT > 0 ? 2.5 : Math.max(0, (this.engagedT || 0) - dt);
    this.rig.guard = this.engagedT > 0 && this.body !== 'zoe' && this.body !== 'worker';
    this.rig.guardKind = C.weapon;
    if (lock?.alive && lock.pos) (this._lookV ??= new THREE.Vector3()).set(lock.pos.x, lock.pos.y + (lock.aimY ?? 0.9), lock.pos.z);
    this.rig.combatLook = lock?.alive && lock.pos ? this._lookV : null;
    this.rig.update(dt, this.speed);
    // blink while invulnerable
    this.rig.root.visible = this.invuln <= 0.5 || Math.floor(this.invuln * 20) % 2 === 0;
    this.sync();
  }

  // People are solid (VP-2): Twinsen no longer walks through the townsfolk. NPCs have no physics collider (they
  // are not bricks: the ball, the camera, sight lines and the NPCs' own paths ignore them as before); instead, each
  // frame of his own movement in play, the hero is kept out of the circle of every present NPC (his radius + theirs,
  // 0.85 m) — a soft contact, never a wall:
  //  - the push-out runs through physics.move, so it never puts him into a brick, the sea or up a cliff, and it is
  //    refused at a ledge (no drop of more than 0.6 m), and it is rate-limited (a spawn on top of someone eases out
  //    in a fraction of a second rather than jumping);
  //  - head on, he side-steps round the person instead of stopping dead (the way past is always open in the open);
  //  - where he can't get round (a doorway, a narrow path, a spot right where they stand: 0.8 s pressing on with
  //    less than 0.35 m gained) he squeezes past that person as before, until clear of them — an NPC can never
  //    trap him or block a door;
  //  - only his own movement in play: cut-scenes, dialogue placement, door walks and scripted NPCs (`controlled`:
  //    watchers, escorts) are untouched.
  keepApart(dt) {
    const g = this.game, P = g.physics, p = this.pos;
    if (!g.npcs || !this.onGround || this.sliding || dt <= 0) return;
    const pass = this.passing;
    if (pass && (!pass.present || Math.hypot(p.x - pass.pos.x, p.z - pass.pos.z) > this.radius + pass.radius + 0.1)) this.passing = null;
    const vx = this.vel.x, vz = this.vel.y, v = Math.hypot(vx, vz);
    let pressing = null;
    for (const n of g.npcs) {
      if (!n.present || n.controlled || n === this.passing || !n.rig.root.visible) continue;
      const R = this.radius + n.radius, dx = p.x - n.pos.x, dz = p.z - n.pos.z;
      if (Math.abs(dx) >= R || Math.abs(dz) >= R || Math.abs(n.pos.y - p.y) > 1.2) continue;
      const d = Math.hypot(dx, dz);
      if (d >= R) continue;
      // out along the line between the centres (straight back from his facing when exactly on top)
      const nx = d > 1e-3 ? dx / d : -Math.sin(this.angle), nz = d > 1e-3 ? dz / d : -Math.cos(this.angle);
      const push = Math.min(R - d, (v + 3) * dt);
      let sx = nx * push, sz = nz * push;
      const into = v > 0.3 ? -(vx * nx + vz * nz) / v : 0;   // 1 = walking straight at them
      if (into > 0) pressing = n;
      if (into > 0.94 && this.wantsMove) {
        // head on: step round them, on the side he is already leaning to (or the side that is free)
        let side = Math.sign(vx * nz - vz * nx);
        if (!side) side = P.blockedAt(n.pos.x + nz * R, n.pos.z - nx * R, p.y) ? -1 : 1;
        const k = v * 0.6 * dt;
        sx += nz * side * k; sz += -nx * side * k;
      }
      // never off a ledge
      if (P.groundAt(p.x + sx * 2, p.z + sz * 2, p.y + 0.6) < p.y - 0.6) continue;
      P.move(this, sx, sz);
    }
    // can't get round (a gap too narrow, or the place he wants is right where they stand): pressing on against the
    // same person for 0.8 s while getting less than 0.35 m anywhere, he squeezes past them
    if (pressing && this.wantsMove) {
      if (!this.pressT || this.pressNpc !== pressing) { this.pressT = 0; this.pressNpc = pressing; this.pressFrom = { x: p.x, z: p.z }; }
      this.pressT += dt;
      if (this.pressT >= 0.8) {
        if (Math.hypot(p.x - this.pressFrom.x, p.z - this.pressFrom.z) < 0.35) this.passing = pressing;
        this.pressT = 0;
      }
    } else this.pressT = 0;
  }

  // LBA2's action in Normal mode: a little hop on the spot (0.58 s). Next to a giver (a bin, a cupboard, a barrel)
  // it shakes a bonus out, once (Game.giverHop).
  hop() {
    this.act('action', 0.58);
    this.game.giverHop();
  }

  // stand still now (placed by the game: a scene change, a respawn, a test)
  resetMotion() { this.vel.set(0, 0); this.fwdSpeed = 0; this.kb.set(0, 0); }

  // anticipation: a quick crouch, then the take-off (in the air already? jump now)
  jump() {
    this.prevRunSpeed = Math.hypot(this.vel.x, this.vel.y);
    this.coyote = 0; this.jumpBuf = 0;
    if (!this.onGround) { this.takeOff(); return; }
    this.act('jumpPrep', 0.09, () => this.takeOff(), 0.001);
  }
  takeOff() {
    this.vy = JUMP.vy; this.gravity = JUMP.g; this.onGround = false; this.actT = 0;
    const s = Math.min(JUMP.speed, Math.max(Math.hypot(this.vel.x, this.vel.y), this.prevRunSpeed || 0));
    this.vel.x = Math.sin(this.angle) * s;
    this.vel.y = Math.cos(this.angle) * s;
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
  // A few steps the game asks for (up to a pump's handle, to his place at a bench): he walks there at walking pace
  // through the same physics as the player's own walk (so the feet keep pace and nothing is walked through),
  // along the given waypoints, then turns to face `a` and then() runs. Any stick input takes over at once (no
  // then()); if he can't get there (blocked for a moment, or too long) fail() runs instead.
  walkTo(pts, { a = null, speed = 1.9, then = null, fail = null } = {}) {
    this.steer = { pts: pts.map((p) => ({ x: p.x, z: p.z })), a, speed, then, fail, t: 0, stuck: 0 };
  }
  steerStep(dt) {
    const S = this.steer, out = { wx: 0, wz: 0, turning: 0 };
    S.t += dt;
    const end = () => { this.steer = null; };
    if (S.t > 3 + S.pts.length * 2) { end(); S.fail?.(); return out; }
    let p = S.pts[0], dx = p.x - this.pos.x, dz = p.z - this.pos.z, d = Math.hypot(dx, dz);
    while (S.pts.length > 1 && d < 0.2) { S.pts.shift(); p = S.pts[0]; dx = p.x - this.pos.x; dz = p.z - this.pos.z; d = Math.hypot(dx, dz); }
    const last = S.pts.length === 1;
    if (last && d < 0.04) {
      // there: settle on the spot (a few centimetres at most), stop, turn to face the work
      this.pos.x = p.x; this.pos.z = p.z; this.vel.set(0, 0);
      const diff = S.a == null ? 0 : angleDiff(this.angle, S.a);
      if (Math.abs(diff) < 0.04) { if (S.a != null) this.angle = S.a; end(); S.then?.(); return out; }
      this.angle += Math.sign(diff) * Math.min(Math.abs(diff), 6 * dt);   // (a turn on the spot at a steady pace)
      out.turning = clamp(diff * 3, -1, 1);
      return out;
    }
    const want = Math.atan2(dx, dz), diff = angleDiff(this.angle, want);
    this.angle = dampAngle(this.angle, want, 10, dt);
    out.turning = clamp(diff * 3, -1, 1);
    // a turn on the spot first if the way is behind him; slowing into the last spot
    const sp = Math.min(S.speed, last ? Math.max(0.4, d * 4) : S.speed) * (Math.abs(diff) > 1.2 ? 0.1 : Math.max(0.3, Math.cos(diff)));
    out.wx = (dx / d) * sp; out.wz = (dz / d) * sp;
    // blocked (pressing on and not getting anywhere) for a moment: give up
    S.stuck = this.speed < sp * 0.25 && Math.abs(diff) < 1.2 && S.t > 0.3 ? S.stuck + dt : 0;
    if (S.stuck > 0.6) { end(); S.fail?.(); }
    return out;
  }

  respawnFromFall() {
    const p = this.game.lastSafe;
    this.pos.set(p.x, this.game.physics.groundAt(p.x, p.z), p.z);
    this.vy = 0; this.onGround = true; this.resetMotion();
    this.damage(1, null);
  }

  // camera-relative world direction of the stick (classic controls: relative to the facing)
  moveDir(mv, g) {
    if (g.settings.controls === 'classic') { const a = this.angle; return { x: Math.sin(a) * mv.y - Math.cos(a) * mv.x, z: Math.cos(a) * mv.y + Math.sin(a) * mv.x }; }
    const yaw = this.inputYaw(mv, g), fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    return { x: rx * mv.x + fx * mv.y, z: rz * mv.x + fz * mv.y };
  }
  // the view's heading the camera-relative (Modern) stick is read against. Under the Follow camera (CAM-FOLLOW) the
  // view turns round behind him as he turns: a direction held keeps the heading it was pushed under, so the view's
  // swing never turns his way and chases itself (a held side arrow runs him straight on while the view comes round);
  // a new direction (let go, or more than 20° another way: Up after Up-Right) reads the view as it is now, so Up goes
  // where the view looks
  inputYaw(mv, g) {
    const yaw = g.camRig.yaw;
    if (g.camRig.mode !== 'follow' || Math.hypot(mv.x, mv.y) <= 0.08) { this.refYaw = null; return yaw; }
    const a = Math.atan2(mv.x, mv.y);
    if (this.refYaw == null || Math.abs(angleDiff(this.refStick, a)) > Math.PI / 9) { this.refYaw = yaw; this.refStick = a; }
    return this.refYaw;
  }
  // the sword in the hand (only while it is the equipped weapon)
  showSword(on) {
    const hand = this.rig.j?.armR?.hand;
    if (!hand) return;
    if (!this.swordMesh) this.swordMesh = buildSword();
    if (on && this.swordMesh.parent !== hand) hand.add(this.swordMesh);
    this.swordMesh.visible = !!on && this.body !== 'zoe' && this.body !== 'worker';
  }

  damage(n, from, heavy = false) {
    if (this.invuln > 0 || this.dead) return;
    const g = this.game;
    // the dodge's window: a clean miss, shown and heard
    if (this.combat.iframes()) { if (!this.dodgedT || g.time - this.dodgedT > 0.3) { this.dodgedT = g.time; g.audio.play('dodged'); g.particles.burst(this.pos.x, this.pos.y + 1, this.pos.z, '#bfe8ff', 6, 2); } return; }
    n *= g.combatDir?.diff.dmg ?? 1;
    n *= g.gadgets?.damageK() ?? 1;   // (the protection spell: gadgets.js)
    this.combat.reset();
    this.hp -= n;
    this.invuln = 1.1;
    this.hurtT = 0.4;
    if (this.rig.anim === 'hurt') this.rig.actionT = 0;   // (a second blow restarts the reaction)
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
      }
    }
  }
}

// ------------------------------------------------------------------ NPC
export class NPC extends Actor {
  constructor(game, def) {
    // (the shared 0.45 m, or a look's own: Baldino's broad Grobo body, 0.6: SRC-2)
    super(game, def.char ? createCharacter(def.char) : createHumanoid(def.look), def.x, def.z, (def.char && LOOKS[def.char]?.radius) || 0.45);
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
    const x0 = this.pos.x, z0 = this.pos.z;
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
    // the gait follows the ground actually covered (after collisions), smoothed; a blocked walker stands
    const v = dt > 0 ? Math.hypot(this.pos.x - x0, this.pos.z - z0) / dt : 0;
    this.gait = (this.gait ?? 0) + (v - (this.gait ?? 0)) * Math.min(1, dt * 10);
    if (moving && this.gait < 0.15) moving = false;
    this.rig.play(this.talking ? 'talk' : moving ? 'walk' : this.listenTo ? 'listen' : this.forceAnim || 'idle');
    this.rig.update(dt, moving ? this.gait : 0);
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
// The magic ball's throw per behaviour, as LBA2 throws it (CTRL-1). Each behaviour's File3D (RESS.HQR entry 44) gives
// the LANCE anim an F_THROW_MAGIC on its 6th key (FICHE.CPP GereAnimAction → ThrowMagicBall): launch angle alpha (of
// 4096), speed (units per 1/50 s tick) and weight; EXTRA.CPP InitFly / the EXTRA_FLY step fly it as
// y = Vy·t − weight·t²/16 with Vy = speed·sin α and speed·cos α along the facing. Released 1200 units up.
//   Normal 120 / 100 / 16 · Athletic 80 / 105 / 14 · Aggressive 40 / 110 / 12 · Discreet 572 / 100 / 35
// In metres (1238 units = Twinsen's 2.065 m): forward / up m/s, gravity m/s² — Normal 8.20 / 1.53 / 8.3, Athletic
// 8.69 / 1.07 / 7.3, Aggressive 9.16 / 0.56 / 6.3, Discreet 5.33 / 6.42 / 18.2. On flat ground the first contact
// comes after ~0.9 s at about 2.4 H (Discreet: a high lob), 3.6 H (Normal), 3.8 H (Athletic) and 4.0 H (Aggressive:
// flat and fast); every bounce then starts the same Vy again (low skips; Discreet's tall hops). No input changes it in
// LBA2: the behaviour is the distance. Classic keeps exactly that; Modern aims at a point (MagicBall.plan).
const LBA_BALL = { normal: [120, 100, 16], athletic: [80, 105, 14], aggressive: [40, 110, 12], discreet: [572, 100, 35] };
const LBA_UNIT = 2.065 / 1238;   // metres per LBA2 unit (Twinsen's height)
export const BALL_THROW = Object.fromEntries(Object.entries(LBA_BALL).map(([b, [al, v, w]]) => {
  const a = (al / 4096) * Math.PI * 2, s = v * 50 * LBA_UNIT;
  return [b, { vx: s * Math.cos(a), vy: s * Math.sin(a), g: (w / 8) * 2500 * LBA_UNIT }];
}));
const BALL_RANGE_K = 1.6;        // Modern: the farthest aim, × the behaviour's own flat-ground throw
const BALL_CHARGE_K = 1.3;       // a charged throw: 1.3× the speed (Classic: further; aimed: the same point, faster)
// A throw at a target (the soft aim-assist target, an enemy or a switch in the cone, or the lock) keeps the flight it has
// always had — the user's call: "the ball aimed itself at the enemies… keep it": pace per behaviour (m/s), gravity
// 22 m/s², bounces from at least 2.5 m/s. The behaviour arcs and the aimed distance only apply when there is no target.
const BALL_TARGET_PACE = { normal: 13, athletic: 15, aggressive: 19, discreet: 9 }, BALL_TARGET_G = 22;
// Flight rules (kept deliberately simple, so puzzles never depend on luck):
//  - states: idle (ready, in the pocket) → inhand (wind-up / charge) → fly → impact (a beat at the hit) →
//    return (homing back to the hand, passes through scenery, never damages) → idle.
//  - movement is substepped (≤ BALL_STEP per step), so it can't tunnel through thin walls or small targets.
//  - as in LBA2: a throw costs 1 magic point; with magic it bounces 4 times and returns on the 5th contact,
//    without magic it returns at its first contact. Each ground bounce restarts the arc with the behaviour's own
//    Vy (LBA2's skips); walls reflect it; water swallows it (it returns). It returns at about 10 m/s, speeding up
//    (+22 m/s²). Gravity is the behaviour's (BALL_THROW).
//  - damage: the magic level (+1 charged). Its colour shows the level: yellow, green, red, fire.
//  - it brings back a bonus it touches (coins, hearts, flasks, clovers, keys, crystals).
//  - each target is hit at most once per throw. A quick throw returns after its first hit; a charged throw
//    with bounces left ricochets on to the nearest other visible enemy within 8 m (ours, not the original's).
//  - limits: 4.2 s of flight (Discreet's four tall hops take ~3.8 s), then it returns; a return that takes over
//    2.5 s (or a scene change) puts it straight back in the hand. The ball can't be lost.
const BALL_STEP = 0.12, BALL_R = 0.14;
// the ball's colour by magic level (1 yellow, 2 green, 3 red, 4 the fire ball)
const BALL_LEVEL = [null, ['#ffe68a', '#ffc400'], ['#9dff8a', '#30d020'], ['#ff8a7a', '#ff2a10'], ['#ffc070', '#ff6a00']];

export class MagicBall {
  constructor(game) {
    this.game = game;
    this.state = 'idle';
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.mat = new THREE.MeshStandardMaterial({ color: '#ffe68a', emissive: '#ffc400', emissiveIntensity: 3, roughness: 0.2 });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), this.mat);
    writeBodyStencil(this.mesh);
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
    // the aiming preview while charging: a few faint dots along the first arc
    this.dots = [];
    const dg = new THREE.SphereGeometry(0.05, 6, 4), dm = new THREE.MeshBasicMaterial({ color: '#fff0b0', transparent: true, opacity: 0.55, depthWrite: false });
    for (let i = 0; i < 9; i++) { const d = new THREE.Mesh(dg, dm); d.visible = false; game.scene.add(d); this.dots.push(d); }
    // ... ending in a small ring where it will first touch down (the dots and the ring follow the same plan as the throw)
    this.landMark = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.24, 20), new THREE.MeshBasicMaterial({ color: '#fff0b0', transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
    this.landMark.rotation.x = -Math.PI / 2; this.landMark.visible = false; this.landMark.renderOrder = 5; game.scene.add(this.landMark);
    this.grav = BALL_THROW.normal.g;
    this.history = [];
    this.hits = new Set();
    this.charge = 0;
  }
  get ready() { return this.state === 'idle'; }

  // the ball sits in Twinsen's right hand during the wind-up
  holdIn(hero) {
    this.state = 'inhand';
    this.holder = hero;
    this.mesh.visible = true;
    this.charge = 0;
    this.mat.emissiveIntensity = 0.6;
    this.mesh.scale.setScalar(1);
    this.followHand();
  }
  cancelHold() { if (this.state === 'inhand') this.toHand(true); }
  setCharge(k) { this.charge = k; this.mat.emissiveIntensity = 0.6 + k * 3.2; this.mesh.scale.setScalar(1 + k * 0.35 + (k >= 1 ? Math.sin(this.game.time * 30) * 0.05 : 0)); }
  followHand() {
    const hand = this.holder?.rig.j?.armR?.hand;
    if (hand) { hand.updateWorldMatrix(true, false); hand.getWorldPosition(this.mesh.position); this.mesh.position.y -= 0.08; }
    else this.mesh.position.set(this.holder.pos.x, this.holder.pos.y + 1.4, this.holder.pos.z);
  }
  canRecall() { return this.state === 'fly' && this.life > 0.2; }
  recall() { if (this.state === 'fly' || this.state === 'impact') { this.state = 'return'; this.retT = 0; this.game.audio.play('recall'); } }
  // back in the pocket, now. `silent` only mutes the catch; what it carries is settled by `carry`:
  //  'credit' (a catch, a scene change): the bonus is Twinsen's, exactly once;
  //  'drop' (a load, a reset of the world): the bonus is let go where the ball is, nobody gets it.
  toHand(silent = false, carry = 'credit') {
    const c = this.carry; this.carry = null;
    if (c) {
      const P = this.game.pickups, i = P.list.indexOf(c);
      c.carried = false;
      // (a heart or flask he can no longer take — full by now — is set down at his feet instead: CONTAINERS)
      if (i >= 0 && carry === 'credit' && this.game.canTake(c)) { P.list.splice(i, 1); this.game.scene.remove(c.mesh); this.game.collect(c); }
      else if (i >= 0) { c.baseY = this.game.physics.groundAt(c.pos.x, c.pos.z, c.pos.y + 0.5) + 0.45; c.pos.y = c.baseY; }
    }
    this.state = 'idle'; this.mesh.visible = false; this.shadow.visible = false; this.mesh.scale.setScalar(1);
    this.trail.forEach((m) => (m.visible = false)); this.preview(null);
    if (!silent) this.game.audio.play('catch');
  }
  // a scene change credits a carried bonus; a load or a world reset lets it go ('drop')
  reset(carry = 'credit') { this.toHand(true, carry); }

  // The throw, decided once for the launch and for the preview: its velocity, gravity, and the lift every bounce
  // restarts with.
  //  - at a target (the lock, an enemy or a switch in the aim cone; the chevron shows it): an arc onto it, exactly as
  //    before CTRL-1 (BALL_TARGET_PACE): the automatic aim always wins over the aimed distance;
  //  - Modern, aimed with the cursor (or an analog stick's tilt): an arc that first lands on the aimed ground point,
  //    within the behaviour's range (0.8 m … BALL_RANGE_K × its own throw), at the behaviour's pace (its forward speed
  //    × √(distance ÷ its own distance): near is a slower, softer lob, far a faster, flatter throw);
  //  - otherwise (Classic; Modern on the keyboard with no cursor): LBA2's own throw for the behaviour, along the aim.
  plan(hero, beh, aim, target, charged, from = this.pos) {
    const st = BALL_THROW[beh] || BALL_THROW.normal, g = this.game;
    const out = { grav: st.g, lift: st.vy, vel: new THREE.Vector3(), point: null };
    // the behaviour's own throw on flat ground: where it first lands from LBA2's release height (1200 units up), and
    // from this hand's height (lower: the forward speed is scaled so the landing on the flat is still LBA2's)
    const land = (hh) => st.vx * (st.vy + Math.sqrt(st.vy * st.vy + 2 * st.g * hh)) / st.g;
    const d0 = land(1200 * LBA_UNIT), dHand = land(Math.max(0.2, from.y - hero.pos.y));
    let to = null;
    if (target) {
      const tp = target.pos || target, f = (BALL_TARGET_PACE[beh] || BALL_TARGET_PACE.normal) * (charged ? BALL_CHARGE_K : 1);
      const ty = target.pos ? tp.y + (target.hover ?? 0) + (target.aimY ?? 0.5) : tp.y;
      const dx = tp.x - from.x, dz = tp.z - from.z, d = Math.hypot(dx, dz) || 1, tt = Math.max(0.12, d / f);
      out.vel.set((dx / d) * f, (ty - from.y + 0.5 * BALL_TARGET_G * tt * tt) / tt, (dz / d) * f);
      out.grav = BALL_TARGET_G; out.lift = Math.max(2.5, out.vel.y);
      return out;
    } else if (aim && g.settings?.controls !== 'classic') {
      to = out.point = this.aimPoint(hero, aim, d0 * BALL_RANGE_K);
    }
    if (to) {
      const dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz) || 1e-3;
      const vx = st.vx * clamp(Math.sqrt(d / d0), 0.55, BALL_RANGE_K) * (charged ? BALL_CHARGE_K : 1);
      const tt = Math.max(0.12, d / vx);
      out.vel.set((dx / d) * vx, (to.y - from.y + 0.5 * st.g * tt * tt) / tt, (dz / d) * vx);
    } else {
      const k = charged ? BALL_CHARGE_K : 1, a = aim || { x: Math.sin(hero.angle), z: Math.cos(hero.angle) }, al = Math.hypot(a.x, a.z) || 1;
      const vx = st.vx * (d0 / dHand) * k;
      out.vel.set((a.x / al) * vx, st.vy * k, (a.z / al) * vx);
      out.lift = st.vy * k;
    }
    return out;
  }
  // Modern: the ground point a throw is aimed at, or null (then the behaviour's own throw). The cursor: where its ray
  // meets the ground (Game.mouseAim gives the ray's point at chest height; followed on down to the ground). An analog
  // stick: its tilt sets the distance (a light push near, full tilt the range). The point stays on the aim line.
  aimPoint(hero, aim, maxD) {
    const g = this.game, P = g.physics, h = hero.pos;
    let d = null;
    if (aim.src === 'mouse' && g.mouseAim) {
      const m = g.mouseAim();
      if (m) {
        const c = g.camera.position, py = h.y + 1.0;
        let dx = m.x - c.x, dy = py - c.y, dz = m.z - c.z;
        const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
        let px = m.x, pz = m.z;
        if (dy < -0.02) {
          // on down the ray to the ground (never far: the camera looks down on Twinsen)
          for (let s = 0.25, n = 0; n < 160; n++, s += 0.25) {
            const x = m.x + dx * s, y = py + dy * s, z = m.z + dz * s;
            if (y <= P.groundAt(x, z, y + 0.5)) break;
            px = x; pz = z;
          }
        }
        d = Math.hypot(px - h.x, pz - h.z);
      }
    } else if (aim.src === 'stick' && g.input && g.input.lastDevice !== 'kbd') {
      const mv = g.input.move(), m = Math.hypot(mv.x, mv.y);
      if (m > 0.25) d = 1.5 + (maxD - 1.5) * clamp((m - 0.25) / 0.7, 0, 1);
    }
    if (d == null) return null;
    d = clamp(d, 0.8, maxD);
    const al = Math.hypot(aim.x, aim.z) || 1, x = h.x + (aim.x / al) * d, z = h.z + (aim.z / al) * d;
    return { x, y: P.groundAt(x, z, h.y + 1.5) + 0.17, z };
  }

  launch(hero, beh, level, opts = {}) {
    const charged = !!opts.charged;
    this.level = level;
    this.charged = charged;
    this.damage = Math.max(1, level) + (charged ? 1 : 0);
    // LBA2: with magic (the point is spent here) 4 bounces, the 5th contact brings it back; without, the first
    this.magic = opts.magic ?? (hero.mp >= 1);
    if (opts.magic === undefined && this.magic) hero.mp -= 1;
    this.bounces = this.magic ? 4 : 0;
    this.carry = null;
    const col = BALL_LEVEL[Math.max(1, Math.min(4, level))];
    this.mat.color.set(col[0]); this.mat.emissive.set(col[1]);
    this.trail.forEach((m) => m.material.color.set(col[1]));
    this.fire = level >= 4;
    // released from the hand, at the hand's position (the release frame of the throw)
    // (the hand is the previous frame's pose here: the combat step runs before the rig is posed. update() re-seats the
    // throw on this frame's hand and re-plans it, so the release does not depend on the frame time: BALL-30FPS)
    this.reseat = null;
    if (this.state === 'inhand') { this.followHand(); this.pos.copy(this.mesh.position); this.pos.y = Math.max(this.pos.y, hero.pos.y + 1.2); this.reseat = { hero, beh, aim: opts.aim, target: opts.target, charged }; }
    else this.pos.set(hero.pos.x + Math.sin(hero.angle) * 0.5, hero.pos.y + 1.6, hero.pos.z + Math.cos(hero.angle) * 0.5);
    const aim = opts.aim || { x: Math.sin(hero.angle), z: Math.cos(hero.angle) };
    const pl = this.plan(hero, beh, aim, opts.target, charged);
    this.vel.copy(pl.vel);
    this.grav = pl.grav; this.lift = pl.lift;
    this.state = 'fly';
    this.life = 0; this.retT = 0;
    this.hits = new Set();
    this.history = [];
    this.mesh.visible = true;
    this.mesh.scale.setScalar(charged ? 1.3 : 1);
    this.mat.emissiveIntensity = charged ? 4 : 2.2;
    this.preview(null);
  }

  // while charging: dots along the first arc to where it will touch down, and a ring there (the same plan as the throw)
  preview(hero, aim, full) {
    if (!hero) { this.dots.forEach((d) => (d.visible = false)); this.landMark.visible = false; return; }
    const g = this.game, P = g.physics;
    const tgt = g.targeting?.throwTarget(aim);
    const p = this.mesh.position.clone();
    p.y = Math.max(p.y, hero.pos.y + 1.2);
    const pl = this.plan(hero, hero.behaviour, aim, tgt, !!full, p);
    // follow the arc in small steps to its first contact: the ground, a wall, or the target
    const v = pl.vel, G = pl.grav, pts = [], tp = tgt ? (tgt.pos || tgt) : null;
    let x = p.x, y = p.y, z = p.z, vy = v.y, land = null;
    for (let i = 0; i < 400 && !land; i++) {
      const h = 0.01;
      x += v.x * h; z += v.z * h; vy -= G * h; y += vy * h;
      if (i % 2 === 0) pts.push([x, y, z]);
      const gy = P.groundAt(x, z, y + 0.3) + 0.17;
      if (y <= gy) land = [x, gy, z];
      else if (P.solidAt(x, z, y, 0.1)) land = [x, y, z, 'wall'];
      else if (tp && Math.hypot(tp.x - x, tp.z - z) < 0.35) land = [x, y, z, 'target'];
    }
    const n = this.dots.length, m = pts.length;
    this.dots.forEach((d, i) => {
      const q = pts[Math.min(m - 1, Math.round(((i + 1) / (n + 1)) * (m - 1)))];
      d.visible = !!q; if (q) d.position.set(q[0], q[1], q[2]);
    });
    this.landMark.visible = !!land && !land[3];
    if (this.landMark.visible) this.landMark.position.set(land[0], land[1] - 0.15, land[2]);
  }

  update(dt) {
    const g = this.game, P = g.physics;
    this.shadow.visible = this.state === 'fly' || this.state === 'return' || this.state === 'impact';
    if (this.state === 'inhand') { this.followHand(); this.trail.forEach((m) => (m.visible = false)); return; }
    if (this.state === 'idle' || this.state === 'held') { this.trail.forEach((m) => (m.visible = false)); return; }
    if (this.reseat) {
      // the release frame: the ball leaves the hand as it is posed NOW (this frame's rig update has run) and has not
      // flown yet (it was released at the pose, not a frame earlier and then flown a whole frame on)
      const r = this.reseat; this.reseat = null;
      if (this.state === 'fly' && this.holder) {
        this.followHand(); this.pos.copy(this.mesh.position); this.pos.y = Math.max(this.pos.y, r.hero.pos.y + 1.2);
        const aim = r.aim || { x: Math.sin(r.hero.angle), z: Math.cos(r.hero.angle) };
        const pl = this.plan(r.hero, r.beh, aim, r.target, r.charged);
        this.vel.copy(pl.vel); this.grav = pl.grav; this.lift = pl.lift;
        dt = 0;
      }
    }
    this.life += dt;
    if (this.state === 'impact') {
      // a beat at the point of impact, then home
      this.impactT -= dt;
      if (this.impactT <= 0) { this.state = 'return'; this.retT = 0; }
    } else if (this.state === 'fly') {
      const sp = this.vel.length();
      const n = Math.max(1, Math.ceil((sp * dt) / BALL_STEP));
      const h = dt / n;
      for (let i = 0; i < n && this.state === 'fly'; i++) this.substep(h, i === 0 ? dt : 0);
      if (this.state === 'fly' && this.life > 4.2) { this.state = 'return'; this.retT = 0; }
      if (this.fire && Math.random() < dt * 30) g.particles.burst(this.pos.x, this.pos.y, this.pos.z, Math.random() < 0.5 ? '#ffb040' : '#ff5a10', 1, 0.6);
    } else if (this.state === 'return') {
      this.retT += dt;
      const hero = g.hero;
      const tx = hero.pos.x, ty = hero.pos.y + 1.4, tz = hero.pos.z;
      const d = new THREE.Vector3(tx - this.pos.x, ty - this.pos.y, tz - this.pos.z);
      const len = d.length();
      if (len < 0.7) { this.toHand(); return; }
      if (len > 60 || this.retT > 2.5) { this.toHand(); return; } // never lost
      // home at ~10 m/s like the original's, speeding up so a far miss doesn't keep Twinsen waiting
      this.pos.addScaledVector(d.normalize(), Math.min(len, (10 + this.retT * 22) * dt));
    }
    this.mesh.position.copy(this.pos);
    placeBlobShadow(this.shadow, P, this.pos.x, this.pos.y, this.pos.z);
    this.history.unshift(this.pos.clone());
    if (this.history.length > 20) this.history.pop();
    this.trail.forEach((m, i) => {
      const hh = this.history[i * 2 + 1];
      m.visible = !!hh && !g.renderer.retro;
      if (hh) m.position.copy(hh);
    });
  }

  substep(h, frameDt) {
    const g = this.game, P = g.physics;
    this.vel.y -= this.grav * h;
    if (frameDt) this.assist(frameDt);
    // targets first, so things mounted on posts register before the post deflects the ball
    const hit = g.ballHitTest(this.pos, this);
    if (hit) { this.onHit(hit); return; }
    // a bonus within reach rides back with it
    if (!this.carry) for (const p of g.pickups?.list || []) {
      if (p.fly || p.carried || p.type === 'shard' || p.delay > 0 || (p.where && p.where !== g.where()) || !g.canTake(p)) continue;
      if (Math.hypot(p.pos.x - this.pos.x, p.pos.y - this.pos.y, p.pos.z - this.pos.z) < 0.7) { p.carried = true; this.carry = p; g.audio.play('catch'); this.state = 'return'; this.retT = 0; return; }
    }
    const nx = this.pos.x + this.vel.x * h, nz = this.pos.z + this.vel.z * h;
    const y = this.pos.y;
    if (P.solidAt(nx, nz, y, BALL_R)) {
      // reflect off the face it struck: test each axis on its own
      const bx = P.solidAt(nx, this.pos.z, y, BALL_R), bz = P.solidAt(this.pos.x, nz, y, BALL_R);
      if (bx || !bz) this.vel.x *= -1;
      if (bz || !bx) this.vel.z *= -1;
      this.bounce('wall');
    } else { this.pos.x = nx; this.pos.z = nz; }
    this.pos.y += this.vel.y * h;
    const gi = P.groundInfo(this.pos.x, this.pos.z, this.pos.y + 0.3), gy = gi.h + 0.17;
    if (this.pos.y < gy) {
      // into the sea (open terrain at sea level; a room's floor at height 0 is a floor)
      if (gy < 0.2 && !gi.brick && !this.game.room) { this.state = 'return'; this.retT = 0; return; }
      this.pos.y = gy;
      this.vel.y = this.lift; // (the arc starts again from the behaviour's own Vy, as LBA2's BounceExtra does)
      this.bounce('ground');
    }
  }

  onHit(hit) {
    const g = this.game;
    if (hit.enemy) this.hits.add(hit.enemy);
    g.impact(this.pos.x, this.pos.y, this.pos.z, hit.material || 'magic', hit.result || 'hit', 0.6);
    // a charged throw with bounces left goes on to the next enemy
    if (this.charged && this.bounces > 0 && hit.enemy) {
      const next = this.nextTarget(hit.enemy);
      if (next) {
        this.bounces--;
        const sp = Math.max(12, Math.hypot(this.vel.x, this.vel.z));
        const ty = next.pos.y + (next.hover ?? 0) + (next.aimY ?? 0.5);
        const dx = next.pos.x - this.pos.x, dz = next.pos.z - this.pos.z, d = Math.hypot(dx, dz), tt = Math.max(0.1, d / sp);
        this.vel.set((dx / d) * sp, (ty - this.pos.y + 0.5 * this.grav * tt * tt) / tt, (dz / d) * sp);
        g.audio.play('bounce');
        return;
      }
    }
    this.state = 'impact'; this.impactT = 0.07;
  }
  nextTarget(from) {
    const g = this.game; let best = null, bd = 8;
    for (const e of g.enemies) {
      if (!e.alive || !e.present || this.hits.has(e) || e === from) continue;
      const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
      if (d < bd && g.physics.lineOfSight(this.pos.x, this.pos.y, this.pos.z, e.pos.x, e.pos.y + 0.6, e.pos.z)) { bd = d; best = e; }
    }
    return best;
  }

  // gentle mid-flight help during the first half second, toward a target roughly ahead and in sight
  assist(dt) {
    if (this.life > 0.5) return;
    const g = this.game;
    const cone = g.targeting?.cone?.() ?? 0.42;
    if (cone <= 0) return;
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp < 1) return;
    const hx = this.vel.x / sp, hz = this.vel.z / sp;
    const cosMax = Math.cos(cone * 0.7);
    let best = null, bd = 9;
    for (const t of g.ballAimTargets()) {
      if (t.enemy && this.hits.has(t.enemy)) continue;
      const dx = t.x - this.pos.x, dz = t.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.3 || d > bd) continue;
      if ((dx * hx + dz * hz) / d < cosMax) continue;
      if (!g.physics.clearTo(this.pos.x, this.pos.y, this.pos.z, t.x, t.y, t.z, 0.8)) continue;
      best = t; bd = d;
    }
    if (!best) return;
    const dx = best.x - this.pos.x, dz = best.z - this.pos.z, d = Math.hypot(dx, dz);
    const k = Math.min(1, dt * 4);
    const nx = hx + (dx / d - hx) * k, nz = hz + (dz / d - hz) * k, nl = Math.hypot(nx, nz);
    this.vel.x = (nx / nl) * sp; this.vel.z = (nz / nl) * sp;
    const tFly = d / sp;
    const wantVy = (best.y - this.pos.y) / Math.max(tFly, 0.12) + 0.5 * this.grav * tFly;
    this.vel.y += (wantVy - this.vel.y) * Math.min(1, dt * 5);
  }

  bounce(kind) {
    this.bounces--;
    const g = this.game;
    g.audio.play('bounce');
    g.particles.burst(this.pos.x, this.pos.y, this.pos.z, '#ffe9a0', 5, 2);
    if (this.bounces < 0) { this.state = 'return'; this.retT = 0; }
    void kind;
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

export const PICK_TYPES = new Set(Object.keys(PICK));

export class Pickups {
  constructor(game) { this.game = game; this.list = []; }
  spawn(type, x, y, z, opts = {}) {
    const mesh = PICK[type]();
    mesh.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    mesh.position.set(x, y, z);
    this.game.scene.add(mesh);
    const p = { type, mesh, pos: mesh.position, vel: new THREE.Vector3(), t: Math.random() * 6, delay: 0, life: Infinity, ...opts };
    if (opts.pop) { p.vel.set((Math.random() - 0.5) * 4, 6 + Math.random() * 2, (Math.random() - 0.5) * 4); p.delay = 0.4; }
    if (opts.fly) p.vel.set(opts.fly.vx, opts.fly.vy, opts.fly.vz);
    p.baseY = y;
    this.list.push(p);
    return p;
  }
  clear() { for (const p of this.list) this.game.scene.remove(p.mesh); this.list = []; }
  // a giver's (or a beaten enemy's) bonus: one arc (LBA2's gravity, 7.8 m/s²), it stops where it lands; not takeable
  // in flight. (A wall in the way stops its drift: it drops at the wall's foot instead of landing inside it.)
  flyStep(p, dt) {
    const g = this.game;
    p.vel.y -= 7.84 * dt;
    const inside = p.from && Math.hypot(p.pos.x - p.from.x, p.pos.z - p.from.z) < p.from.r + 0.2;   // (still over the container it came out of)
    if ((p.vel.x || p.vel.z) && !inside && g.physics.solidAt(p.pos.x + p.vel.x * dt, p.pos.z + p.vel.z * dt, p.pos.y, 0.12)) { p.vel.x = 0; p.vel.z = 0; }
    // (nor over the sea or a drop: a container's bonus must stay where he can walk to it — CONTAINERS)
    if ((p.vel.x || p.vel.z) && p.loot) {
      const nx = p.pos.x + p.vel.x * dt * 6, nz = p.pos.z + p.vel.z * dt * 6, gy = g.physics.groundAt(nx, nz, p.pos.y), here = g.physics.groundAt(p.pos.x, p.pos.z, p.pos.y);
      if (gy < WATER_FLOOR || gy < here - 0.8) { p.vel.x = 0; p.vel.z = 0; }
    }
    p.pos.addScaledVector(p.vel, dt);
    const gy = g.physics.groundAt(p.pos.x, p.pos.z, p.pos.y + 0.3) + 0.3;
    if (p.vel.y < 0 && p.pos.y <= gy) { p.pos.y = gy; p.vel.set(0, 0, 0); p.fly = null; }
    p.baseY = p.pos.y;
    p.mesh.rotation.y += dt * 2.5;
  }
  // flyDt: a beaten enemy's bonus still in the air keeps flying while the rest of the world waits (a dialogue)
  update(dt, flyDt = 0) {
    const g = this.game, hero = g.hero;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      // (another area's bonus — a room's, a region's — waits there, unseen: CONTAINERS)
      if (p.where && p.where !== g.where()) { p.mesh.visible = false; continue; }
      if (!dt && flyDt && p.fly && (p.koDrop || p.loot)) { this.flyStep(p, flyDt); continue; }
      p.t += dt;
      p.delay -= dt;
      // a bonus that nobody takes goes after 20 s, blinking for the last 3 (LBA2: 8 ticks on, 8 off)
      p.life -= dt;
      if (p.carried) { p.pos.copy(g.ball.pos); p.mesh.visible = true; p.mesh.rotation.y += dt * 6; continue; } // riding back on the ball
      if (p.life <= 0) { g.scene.remove(p.mesh); this.list.splice(i, 1); continue; }
      p.mesh.visible = p.life > 3 || Math.floor(p.life / 0.16) % 2 === 0;
      if (p.fly) { this.flyStep(p, dt); continue; }
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
        // a heart with his life full, a flask with his magic full: not taken; it hops aside once in a while (LBA2:
        // InitFly, the bonus sound) and stays where it lands
        if (!g.canTake(p)) {
          p.refuse = (p.refuse || 0) - dt;
          if (p.refuse <= 0) {
            p.refuse = 1.4;
            const a = Math.atan2(-dx, -dz) + (Math.random() - 0.5) * 0.8;
            const tx = p.pos.x + Math.sin(a) * 0.9, tz = p.pos.z + Math.cos(a) * 0.9, ty = g.physics.groundAt(tx, tz, p.pos.y);
            const ok = ty > WATER_FLOOR && Math.abs(ty - g.physics.groundAt(p.pos.x, p.pos.z, p.pos.y)) < 0.6 && !g.physics.solidAt(tx, tz, p.pos.y, 0.15);
            p.fly = true; p.vel.set(ok ? Math.sin(a) * 1.1 : 0, 2.6, ok ? Math.cos(a) * 1.1 : 0);
            g.audio.play('bonus');
          }
          continue;
        }
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
