// Cameras.
//
// "lba" reproduces LBA2's exterior camera (see PERSO.CPP / INTEXT.CPP in the
// GPL source): the view stays still while Twinsen walks around in it. When he
// gets close to the edge of the screen (Xp<80 || Xp>539 || Yp<80 || Yp>429 on
// a 640x480 screen) the camera re-centres on a point DISTANCE_VISEE ahead of
// him, keeping its angle. Enter re-centres *behind* him. Two views exist:
// AlphaCam 300 or 530 (of 4096) at distance 10500 or 17000, focal 600.
// The remaster glides between shots instead of cutting (the 1997 look cuts).
// Scenery in the way (VP-10, src/engine/occlude.js): as in LBA2, each new shot runs SearchCameraPos — the camera
// keeps its heading and distance and rises over whatever stands between it and Twinsen (nothing fades); the shot
// keeps that pitch until the next re-centre, which starts again from the view's own. One addition to the 1997 rule:
// if scenery hides him for a moment mid-shot, the shot re-centres (LBA2 waits for him to reach the screen edge).
//
// "free" is a modern third-person orbit with obstacle avoidance.
import * as THREE from 'three';
import { clamp, damp, dampAngle } from './math.js';
import { EYE } from './occlude.js';

const UNIT = 1 / 750; // LBA2 world units per metre (hero ≈ 1400 units tall)
const A = (a) => (a / 4096) * Math.PI * 2;
const LBA_VIEWS = [
  { pitch: A(300), dist: 11800 * UNIT }, // a little further than PERSO.CPP so Twinsen fills ~16% of the height, as in the 640×480 game
  { pitch: A(530), dist: 17000 * UNIT },
];
const LBA_FOV = (2 * Math.atan(240 / 600) * 180) / Math.PI; // 43.6°
const AHEAD = 2500 * UNIT; // DISTANCE_VISEE

const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
const MAX_PITCH = 1.4; // (80°: looking almost straight down over a tall wall right behind him)

export class CameraRig {
  constructor(camera, terrain, physics) {
    this.cam = camera;
    this.terrain = terrain;
    this.physics = physics;
    this.occDist = 99;
    this.mode = 'lba';
    this.view = 0;
    this.cut = false;
    this.yaw = Math.PI * 0.85;
    this.pitch = 0.42;
    this.dist = 10;
    this.target = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.shakeT = 0;
    this.idleT = 0;
    this.hiddenT = 0;
    this.override = null; // {pos, look} for cutscenes
    this.occ = null;      // () → the scenery volumes in force (Citadel outdoors), or null (main.js)
    this.lba = { init: false, focus: new THREE.Vector3(), goal: new THREE.Vector3(), yaw: 0, goalYaw: 0, goalPitch: 0, behind: false, view: 0, clear: true };
  }

  setMode(m) { this.mode = m === 'free' ? 'free' : 'lba'; this.lba.init = false; }
  // Interiors: fixed isometric view rotated 45°, like LBA2's indoor scenes.
  setIso(room) { this.iso = room; this.lba.init = false; if (room) { this.isoFocus = null; this.isoY = null; } }
  toggleView() { this.view = 1 - this.view; }
  recenter() { this.lba.behind = true; }
  shake(s = 0.35) { this.shakeT = Math.max(this.shakeT, s * (this.shakeScale ?? 1)); }

  occluded(t, cp, sp, yaw, maxD, withOcc = true) {
    if (!this.physics) return maxD;
    const P = this.physics;
    for (let d = 1.2; d <= maxD; d += 0.5) {
      const x = t.x + Math.sin(yaw) * cp * d;
      const z = t.z + Math.cos(yaw) * cp * d;
      const y = t.y + 1.4 + sp * d;
      for (const c of P.near(x, z)) {
        if (!c.enabled || c.fades || c.camSkip || c.top < y || c.bottom > y) continue; // (camSkip: its shape is in the scenery volumes)
        if (c.type === 'cyl') {
          if (Math.hypot(x - c.x, z - c.z) < (c.camR ?? c.r) + 0.3) return Math.max(2, d - 0.6);
        } else if (P._inside(c, x, z, 0.3)) return Math.max(2, d - 0.6);
      }
      if (withOcc && this.occ?.()?.hit(x, y, z) > -Infinity) return Math.max(2, d - 0.6);
    }
    return maxD;
  }

  // what hides Twinsen from the camera now: 'scenery' (a registered volume or the terrain: a new LBA2 shot rises
  // over it), 'collider' (a tree, the lighthouse…: swing round behind him, as before), or null. Hidden = both his
  // middle and his head are cut off.
  hiddenBy(hero) {
    const occ = this.occ?.(), cam = this.cam.position;
    if (occ) {
      occ.setUnder(hero);
      let n = 0;
      for (const hy of [EYE, 1.45]) if (occ.blocked(cam, _a.set(hero.x, hero.y + hy, hero.z))) n++;
      if (n === 2) return 'scenery';
    }
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    _v.set(hero.x, hero.y, hero.z);
    const toCam = Math.atan2(cam.x - hero.x, cam.z - hero.z);
    const dHero = Math.hypot(cam.x - hero.x, cam.z - hero.z) / Math.max(cp, 0.1);
    return this.occluded(_v, cp, sp, toCam, dHero, false) < dHero - 0.5 ? 'collider' : null;
  }

  update(dt, focus, heroAngle, moving, input) {
    const cam = this.cam;
    if (this.cine) return; // a cinematic places the camera itself (src/engine/cinematic.js)
    if (this.override) {
      cam.position.lerp(this.override.pos, 1 - Math.exp(-dt * 2));
      this.look.lerp(this.override.look, 1 - Math.exp(-dt * 3));
      cam.lookAt(this.look);
      this.lba.init = false;
      return;
    }
    if (this.iso) this._iso(dt, focus);
    else if (this.mode === 'lba') this._lba(dt, focus, heroAngle);
    else this._free(dt, focus, heroAngle, moving, input);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const s = this.shakeT * 0.6;
      cam.position.x += (Math.random() - 0.5) * s;
      cam.position.y += (Math.random() - 0.5) * s;
      cam.lookAt(this.look);
    }
  }

  _lba(dt, hero, heroAngle) {
    const cam = this.cam, L = this.lba;
    const v = LBA_VIEWS[this.view];
    cam.fov = LBA_FOV;
    cam.updateProjectionMatrix();
    // a new shot (LBA2's CameraCenter): behind him (Enter, a scene start) or keeping the heading (he nears the edge
    // of the screen), from the view's own pitch, then SearchCameraPos lifts it over the scenery in the way
    const shoot = (behind) => {
      if (behind) L.goalYaw = heroAngle + Math.PI;
      L.view = this.view;
      const occ = this.occ?.();
      let p = occ ? occ.search(hero, L.goalYaw, v.pitch, v.dist, { maxPitch: MAX_PITCH }) : v.pitch;
      // our camera hangs off the look-at point, not off Twinsen as LBA2's forced camera does: check the sight line
      // of the shot as it will be built and tip it further while it is still cut (rarely more than a few degrees)
      L.clear = true;
      for (let i = 0; ; i++) {
        this._aim(L.goal, hero, heroAngle, L.goalYaw, p, v.pitch);
        if (!occ || i > 24) break;
        this._camAt(_b, L.goal, L.goalYaw, p, v.dist);
        if (!occ.blocked(_b, _a.set(hero.x, hero.y + EYE, hero.z))) break;
        if (p >= MAX_PITCH) { L.clear = false; break; }
        p = Math.min(MAX_PITCH, p + 0.035);
      }
      L.goalPitch = p;
      this.hiddenT = 0;
    };

    if (!L.init || L.behind) {
      shoot(true);
      if (!L.init) { L.yaw = L.goalYaw; L.focus.copy(L.goal); this.pitch = L.goalPitch; this.dist = v.dist; }
      L.init = true;
      L.behind = false;
    } else {
      // is Twinsen leaving the frame? (or the view changed)
      _v.set(hero.x, hero.y + 0.9, hero.z).project(cam);
      if (_v.x < -0.75 || _v.x > 0.68 || _v.y > 0.66 || _v.y < -0.79 || _v.z > 1 || L.view !== this.view) shoot(false);
      else {
        // hidden for a moment mid-shot: a new shot over the scenery in the way; behind a tree, the lighthouse and
        // other solid props (not in the scenery volumes), or when no pitch clears the view, swing round behind him
        const why = this.hiddenBy(hero);
        if (why) this.hiddenT += dt; else this.hiddenT = 0;
        if (this.hiddenT > 0.35) { if (why === 'scenery' && L.clear) shoot(false); else { this.hiddenT = 0; L.behind = true; } }
      }
    }
    // the goal height follows the hero continuously so jumps stay in frame
    L.goal.y = damp(L.goal.y, hero.y, 3, dt);
    if (this.cut) { L.focus.copy(L.goal); L.yaw = L.goalYaw; this.pitch = L.goalPitch; this.dist = v.dist; }
    else {
      L.focus.lerp(L.goal, 1 - Math.exp(-dt * 4.5));
      L.yaw = dampAngle(L.yaw, L.goalYaw, 4.5, dt);
      this.pitch = damp(this.pitch, L.goalPitch, 4, dt);
      this.dist = damp(this.dist, v.dist, 4, dt);
    }
    this.yaw = L.yaw;
    this._camAt(cam.position, L.focus, L.yaw, this.pitch, this.dist);
    this.look.set(L.focus.x, L.focus.y + 1, L.focus.z);
    cam.lookAt(this.look);
    this.target.copy(hero);
  }

  // the look-at point of a shot: DISTANCE_VISEE ahead of him at the view's pitch; as LBA2's forced camera tips up
  // it moves along the view and shrinks with the sine of the pitch, to nothing looking straight down
  _aim(out, hero, heroAngle, yaw, p, p0) {
    if (p <= p0 + 1e-4) return out.set(hero.x + Math.sin(heroAngle) * AHEAD, hero.y, hero.z + Math.cos(heroAngle) * AHEAD);
    const k = clamp(1 - (Math.sin(p) - Math.sin(p0)) / (1 - Math.sin(p0)), 0, 1);
    return out.set(hero.x - Math.sin(yaw) * AHEAD * k, hero.y, hero.z - Math.cos(yaw) * AHEAD * k);
  }

  _camAt(out, f, yaw, pitch, dist) {
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const x = f.x + Math.sin(yaw) * cp * dist, z = f.z + Math.cos(yaw) * cp * dist;
    const y = Math.max(f.y + 1 + sp * dist, this.terrain.heightAt(x, z) + 1.5, 1.5);
    return out.set(x, y, z);
  }

  _iso(dt, hero) {
    const cam = this.cam, R = this.iso;
    const dist = 90;
    cam.fov = (2 * Math.atan((R.view / 2) / dist) * 180) / Math.PI;
    cam.updateProjectionMatrix();
    const goal = R.center.clone().lerp(hero, R.follow ?? 0.3);
    // the view rises and falls with the floor under the hero (rooms on several levels: a gallery, a stair), not
    // with his jumps
    const gy = this.physics ? this.physics.groundAt(hero.x, hero.z, hero.y + 0.3) : R.center.y;
    this.isoY = this.isoY == null || !this.isoFocus || this.cut ? gy : damp(this.isoY, gy, 2.5, dt);
    goal.y = 0.8 + (this.isoY - R.center.y);
    this.yaw = Math.PI / 4;
    const pitch = 0.58;
    // in a big room (LBA1's halls, the asylum) the partial follow would leave the hero at the edge of the frame:
    // keep him inside the middle of the picture (±42% of the half-width, ±36% of the half-height)
    {
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      const dx = hero.x - goal.x, dz = hero.z - goal.z, dr = dx * rx + dz * rz, df = dx * fx + dz * fz;
      const half = R.view / 2, maxR = half * (cam.aspect || 1.78) * 0.42, maxF = (half * 0.36) / Math.sin(pitch);
      const er = dr - clamp(dr, -maxR, maxR), ef = df - clamp(df, -maxF, maxF);
      goal.x += er * rx + ef * fx; goal.z += er * rz + ef * fz;
    }
    if (!this.isoFocus || this.cut) this.isoFocus = goal.clone();
    else this.isoFocus.lerp(goal, 1 - Math.exp(-dt * 3));
    const f = this.isoFocus;
    cam.position.set(f.x + Math.sin(this.yaw) * Math.cos(pitch) * dist, f.y + Math.sin(pitch) * dist, f.z + Math.cos(this.yaw) * Math.cos(pitch) * dist);
    this.look.copy(f);
    cam.lookAt(f);
    this.target.copy(hero);
  }

  _free(dt, focus, heroAngle, moving, input) {
    const cam = this.cam;
    const d = input ? input.camera() : { dx: 0, dy: 0 };
    this.yaw -= d.dx;
    this.pitch = clamp(this.pitch + d.dy, 0.08, 1.2);
    if (d.dx !== 0 || d.dy !== 0) this.idleT = 0; else this.idleT += dt;
    if (moving && this.idleT > 1.5) this.yaw = dampAngle(this.yaw, heroAngle + Math.PI, 0.7, dt);
    this.dist = damp(this.dist, 9.5, 3, dt);
    cam.fov = damp(cam.fov, 55, 3, dt);
    cam.updateProjectionMatrix();
    this.target.lerp(focus, 1 - Math.exp(-dt * 10));
    const t = this.target;
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const want = this.occluded(t, cp, sp, this.yaw, this.dist);
    this.occDist = want < this.occDist ? want : damp(this.occDist, want, 2, dt);
    const dist = Math.min(this.dist, this.occDist);
    const x = t.x + Math.sin(this.yaw) * cp * dist;
    const z = t.z + Math.cos(this.yaw) * cp * dist;
    let y = t.y + 1.4 + sp * dist;
    for (let k = 0.3; k <= 1.0001; k += 0.35) {
      const px = t.x + (x - t.x) * k, pz = t.z + (z - t.z) * k;
      const gh = this.terrain.heightAt(px, pz) + 0.8;
      const ly = t.y + 1.4 + (y - t.y - 1.4) * k;
      if (gh > ly) y += (gh - ly) / k;
    }
    cam.position.set(x, Math.max(y, 0.8), z);
    this.look.set(t.x, t.y + 1.3, t.z);
    cam.lookAt(this.look);
  }
}
