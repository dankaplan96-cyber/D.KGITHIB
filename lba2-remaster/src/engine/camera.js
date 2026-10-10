// Cameras.
//
// "lba" reproduces LBA2's exterior camera (see PERSO.CPP / INTEXT.CPP in the
// GPL source): the view stays still while Twinsen walks around in it. When he
// gets close to the edge of the screen (Xp<80 || Xp>539 || Yp<80 || Yp>429 on
// a 640x480 screen) the camera re-centres on a point DISTANCE_VISEE ahead of
// him, keeping its angle. Enter re-centres *behind* him. Two views exist:
// AlphaCam 300 or 530 (of 4096) at distance 10500 or 17000, focal 600.
// The remaster glides between shots instead of cutting (the 1997 look cuts).
//
// "free" is a modern third-person orbit with obstacle avoidance.
import * as THREE from 'three';
import { clamp, damp, dampAngle } from './math.js';

const UNIT = 1 / 750; // LBA2 world units per metre (hero ≈ 1400 units tall)
const A = (a) => (a / 4096) * Math.PI * 2;
const LBA_VIEWS = [
  { pitch: A(300), dist: 11800 * UNIT }, // a little further than PERSO.CPP so Twinsen fills ~16% of the height, as in the 640×480 game
  { pitch: A(530), dist: 17000 * UNIT },
];
const LBA_FOV = (2 * Math.atan(240 / 600) * 180) / Math.PI; // 43.6°
const AHEAD = 2500 * UNIT; // DISTANCE_VISEE

const _v = new THREE.Vector3();

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
    this.lba = { init: false, focus: new THREE.Vector3(), goal: new THREE.Vector3(), yaw: 0, goalYaw: 0, behind: false };
  }

  setMode(m) { this.mode = m === 'free' ? 'free' : 'lba'; this.lba.init = false; }
  // Interiors: fixed isometric view rotated 45°, like LBA2's indoor scenes.
  setIso(room) { this.iso = room; this.lba.init = false; if (room) this.isoFocus = null; }
  toggleView() { this.view = 1 - this.view; }
  recenter() { this.lba.behind = true; }
  shake(s = 0.35) { this.shakeT = Math.max(this.shakeT, s); }

  occluded(t, cp, sp, yaw, maxD) {
    if (!this.physics) return maxD;
    const P = this.physics;
    for (let d = 1.2; d <= maxD; d += 0.5) {
      const x = t.x + Math.sin(yaw) * cp * d;
      const z = t.z + Math.cos(yaw) * cp * d;
      const y = t.y + 1.4 + sp * d;
      for (const c of P.near(x, z)) {
        if (!c.enabled || c.top < y || c.bottom > y) continue;
        if (c.type === 'cyl') {
          if (Math.hypot(x - c.x, z - c.z) < (c.camR ?? c.r) + 0.3) return Math.max(2, d - 0.6);
        } else if (P._inside(c, x, z, 0.3)) return Math.max(2, d - 0.6);
      }
    }
    return maxD;
  }

  update(dt, focus, heroAngle, moving, input) {
    const cam = this.cam;
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
    const ahead = (out) => out.set(hero.x + Math.sin(heroAngle) * AHEAD, hero.y, hero.z + Math.cos(heroAngle) * AHEAD);

    if (!L.init || L.behind) {
      L.goalYaw = heroAngle + Math.PI;
      ahead(L.goal);
      if (!L.init) { L.yaw = L.goalYaw; L.focus.copy(L.goal); }
      L.init = true;
      L.behind = false;
    } else {
      // is Twinsen leaving the frame?
      _v.set(hero.x, hero.y + 0.9, hero.z).project(cam);
      if (_v.x < -0.75 || _v.x > 0.68 || _v.y > 0.66 || _v.y < -0.79 || _v.z > 1) ahead(L.goal);
      // hidden behind a house/wall for a moment: swing round behind him
      const cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
      _v.set(hero.x, hero.y, hero.z);
      const toCam = Math.atan2(cam.position.x - hero.x, cam.position.z - hero.z);
      const dHero = Math.hypot(cam.position.x - hero.x, cam.position.z - hero.z) / Math.max(cp, 0.1);
      if (this.occluded(_v, cp, sp, toCam, dHero) < dHero - 0.5) this.hiddenT += dt; else this.hiddenT = 0;
      if (this.hiddenT > 0.35) { this.hiddenT = 0; L.behind = true; }
    }
    // the goal height follows the hero continuously so jumps stay in frame
    L.goal.y = damp(L.goal.y, hero.y, 3, dt);
    if (this.cut) { L.focus.copy(L.goal); L.yaw = L.goalYaw; }
    else {
      L.focus.lerp(L.goal, 1 - Math.exp(-dt * 4.5));
      L.yaw = dampAngle(L.yaw, L.goalYaw, 4.5, dt);
    }
    this.pitch = damp(this.pitch, v.pitch, 4, dt);
    this.dist = damp(this.dist, v.dist, 4, dt);
    this.yaw = L.yaw;
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const f = L.focus;
    let x = f.x + Math.sin(L.yaw) * cp * this.dist;
    let z = f.z + Math.cos(L.yaw) * cp * this.dist;
    let y = f.y + 1 + sp * this.dist;
    y = Math.max(y, this.terrain.heightAt(x, z) + 1.5, 1.5);
    cam.position.set(x, y, z);
    this.look.set(f.x, f.y + 1, f.z);
    cam.lookAt(this.look);
    this.target.copy(hero);
  }

  _iso(dt, hero) {
    const cam = this.cam, R = this.iso;
    const dist = 90;
    cam.fov = (2 * Math.atan((R.view / 2) / dist) * 180) / Math.PI;
    cam.updateProjectionMatrix();
    const goal = R.center.clone().lerp(hero, R.follow ?? 0.3);
    goal.y = 0.8;
    if (!this.isoFocus || this.cut) this.isoFocus = goal.clone();
    else this.isoFocus.lerp(goal, 1 - Math.exp(-dt * 3));
    this.yaw = Math.PI / 4;
    const pitch = 0.58;
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
