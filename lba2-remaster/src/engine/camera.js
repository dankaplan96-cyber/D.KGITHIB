// Cameras.
//
// "lba" follows LBA2's exterior camera (the 2021 GPL source: PERSO.CPP's main loop, INTEXT.CPP CameraCenter): a fixed
// view angle that never turns with Twinsen; when he gets near the edge of the screen (Xp<80 || Xp>539 || Yp<80 ||
// Yp>429 on 640×480) it re-centres on a point DISTANCE_VISEE (2500 units, ~2 body heights) ahead of him, keeping its
// angle; Enter re-centres *behind* him. Two views: AlphaCam 300 or 530 (of 4096) at 10500 or 17000, focal 600.
//  - 1997 look (`cut`): exactly that, hard cuts (_lbaCuts).
//  - remaster (CTRL-1): the same rules made continuous (_lba). The angle still never follows his turns (no swing, no
//    snap: turning on the spot moves nothing); the aim point is DISTANCE_VISEE ahead along the way he really moves,
//    turning with him gently and held when he stops (so the view stays still, as LBA2's does, while he stands or
//    shuffles); a dead zone round it keeps small moves from moving the view; a critically damped spring follows (no
//    lurch, no overshoot, the same at 30 and 60 fps); the height follows the ground under him through its own spring
//    (stairs and slopes glide, jumps don't bob the view); and he can never leave LBA2's frame box. Enter (or R3)
//    swings it behind him; hidden behind a wall, a cliff or the lighthouse for a moment, it swings round.
// Scenery in the way (VP-10, src/engine/occlude.js): nothing fades, as in LBA2. The houses, the fortress, the project
// buildings, the spaceport terminal and Nell's lean-to give the camera their shapes, and LBA2's SearchCameraPos
// (3DEXT/MAPTOOLS.CPP) lifts the view's pitch over whatever of them stands between it and Twinsen, keeping its
// heading and distance: in the 1997 look on each cut, as LBA2 does; in the remaster continuously, eased (≤ 50°/s,
// ≤ 1.5 rad/s²) and let down only once the way has been clear for a second, while the look-ahead shrinks as the view
// steepens (LBA2's forced camera). Until the view has risen, the silhouette shows him (characters.js).
//
// The camera's own spot (BUG-WALL): whatever placed it — the follow, a 1997 cut, a cutscene's shot, the free orbit —
// it never stands in or against anything solid outdoors (_clearance). Before, only the ground straight under it
// counted, so at a cliff's brink it stood inside the rock face beside it, and a collider (the Whispering Cliffs'
// stepping stones rising through it after the target, a tank, a pillar) was never tested at all.
//
// "free" is a modern third-person orbit with obstacle avoidance.
import * as THREE from 'three';
import { clamp, lerp, smoothstep, damp, dampAngle, angleDiff } from './math.js';
import { EYE } from './occlude.js';

const UNIT = 1 / 750; // LBA2 world units per metre (hero ≈ 1400 units tall)
const A = (a) => (a / 4096) * Math.PI * 2;
const LBA_VIEWS = [
  { pitch: A(300), dist: 11800 * UNIT }, // a little further than PERSO.CPP so Twinsen fills ~16% of the height, as in the 640×480 game
  { pitch: A(530), dist: 17000 * UNIT },
];
const LBA_FOV = (2 * Math.atan(240 / 600) * 180) / Math.PI; // 43.6°
const AHEAD = 2500 * UNIT; // DISTANCE_VISEE
// the remaster's follow (_lba): dead zone half-sizes across / along the view (m), spring rates (1/s), the frame box
// Twinsen never leaves (NDC, inside LBA2's 80..539 × 80..429 of 640×480 = x −0.75..0.68, y −0.79..0.66)
const DEAD_R = 1.4, DEAD_F = 1.0, FOLLOW_W = 5, HEIGHT_W = 3.2, LEAD_RATE = 2;
const BOX = { x0: -0.62, x1: 0.6, y0: -0.66, y1: 0.55 };
const SWING_V = (60 * Math.PI) / 180, SWING_A = (90 * Math.PI) / 180;   // the view's swing: top speed, ease (rad/s, rad/s²)
// VP-10: the rise over scenery: top pitch, pitch speed and ease (rad, rad/s, rad/s²), how long the way stays clear
// before the view comes back down (s)
const MAX_PITCH = 1.4, RISE_V = (50 * Math.PI) / 180, RISE_A = 1.5, RISE_HOLD = 1.0;
// critically damped spring, exact for a target held over the step (so it reads the same at any frame rate)
function spring(o, k, target, w, dt) {
  const e = o[k] - target, t1 = o['v' + k] + w * e, ex = Math.exp(-w * dt);
  o[k] = target + (e + t1 * dt) * ex;
  o['v' + k] = (o['v' + k] - w * t1 * dt) * ex;
}

// BUG-WALL: everything solid within CLEAR_R round the camera counts: the terrain (a ring of samples, each needing
// less height the further out it is: 1.5 m straight under it as before, 0.3 m at CLEAR_R), the colliders and VP-10's
// scenery volumes (each needing its top + CLEAR_TOP, weighted from in full within CLEAR_IN down to nothing at CLEAR_R,
// so walking the view up to something lifts it smoothly instead of popping). A collider more than LIFT_MAX above the
// camera (the lighthouse, a fortress wall) is not risen over: the camera is drawn in along its line to the look-at
// point until it stands CLEAR_IN clear of it, as the free camera does.
const CLEAR_R = 1.6, CLEAR_IN = 0.45, CLEAR_TOP = 0.5, LIFT_MAX = 4;
const RING = [0.4, 0.8, 1.2, 1.6].flatMap((r) => Array.from({ length: 12 }, (_, i) => [r, Math.sin((i * Math.PI) / 6) * r, Math.cos((i * Math.PI) / 6) * r]));
const CORNERS = [[-CLEAR_R, -CLEAR_R], [CLEAR_R, -CLEAR_R], [-CLEAR_R, CLEAR_R], [CLEAR_R, CLEAR_R]];
const clearW = (s) => (s <= CLEAR_IN ? 1 : s >= CLEAR_R ? 0 : smoothstep(CLEAR_R, CLEAR_IN, s));
// how far (x, z) lies outside a collider's footprint (0 inside)
function outside(c, x, z) {
  const dx = x - c.x, dz = z - c.z;
  if (c.type === 'cyl') return Math.max(0, Math.hypot(dx, dz) - c.r);
  const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
  return Math.hypot(Math.max(0, Math.abs(lx) - c.hw), Math.max(0, Math.abs(lz) - c.hd));
}
const _seen = new Set(), _cells = [];

const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
// LBA2's forced camera: the look-ahead shrinks with the sine of the pitch above the view's own, to nothing at 90°
const aheadK = (p, p0) => (p <= p0 + 1e-4 ? 1 : clamp(1 - (Math.sin(p) - Math.sin(p0)) / (1 - Math.sin(p0)), 0, 1));

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
  setIso(room) { this.iso = room; this.snap(); }
  // a scene change (a door, an exit, travel, a load, a respawn): the next frame starts the new shot outright, behind
  // the fade, in every mode — never a glide from where the camera was (BUG-WALL, the user on 0.31.0: "when I leave
  // the house, the camera runs across the water": the rooms stand 1 km east of Citadel, out over the sea, and a
  // smoothed camera — the free orbit's target, a scripted shot's lerp — set off from there). update() also snaps by
  // itself when its focus jumps more than 4 m between two frames (a teleport no caller announced).
  snap() { this.lba.init = false; this.isoFocus = null; this.isoY = null; this._snap = true; }
  toggleView() { this.view = 1 - this.view; }
  recenter() { this.lba.behind = true; }
  shake(s = 0.35) { this.shakeT = Math.max(this.shakeT, s * (this.shakeScale ?? 1)); }

  // how far along the view from Twinsen before something solid is in the way (`sight`: only what really hides him —
  // walls, cliffs, big rocks; not trees, posts or rails, which he shows between; the free camera still keeps out of them).
  // Colliders marked camSkip give the camera their shape as scenery volumes instead (VP-10); `withOcc` tests those too
  // (the free camera keeps out of them; the LBA view rises over them instead, see _scenePitch)
  occluded(t, cp, sp, yaw, maxD, sight = false, withOcc = false) {
    if (!this.physics) return maxD;
    const P = this.physics;
    for (let d = 1.2; d <= maxD; d += 0.5) {
      const x = t.x + Math.sin(yaw) * cp * d;
      const z = t.z + Math.cos(yaw) * cp * d;
      const y = t.y + 1.4 + sp * d;
      for (const c of P.near(x, z)) {
        if (!c.enabled || c.fades || c.camSkip || c.top < y || c.bottom > y) continue; // (fades: Zeelich's faded houses)
        if (sight && (c.seeThrough || (c.type === 'cyl' && c.r < 1.5))) continue; // (a tree's crown, a post, a rail)
        if (c.type === 'cyl') {
          if (Math.hypot(x - c.x, z - c.z) < (c.camR ?? c.r) + 0.3) return Math.max(2, d - 0.6);
        } else if (P._inside(c, x, z, 0.3)) return Math.max(2, d - 0.6);
      }
      if (withOcc && this.occ?.()?.hit(x, y, z) > -Infinity) return Math.max(2, d - 0.6);
    }
    return maxD;
  }

  // VP-10: the pitch at which a camera `dist` from look-at point F (heading yaw) sees Twinsen's middle over the scenery:
  // LBA2's SearchCameraPos from him, then checked on the view as built (our camera hangs off the look-at point, LBA2's
  // forced one off Twinsen) and tipped further while the line is still cut. → [pitch, clear]
  _scenePitch(hero, F, yaw, p0, dist, lookY) {
    const occ = this.occ?.();
    if (!occ) return [p0, true];
    let p = occ.search(hero, yaw, p0, dist, { maxPitch: MAX_PITCH });
    for (let i = 0; i < 25; i++) {
      const cp = Math.cos(p);
      _b.set(F.x + Math.sin(yaw) * cp * dist, lookY + Math.sin(p) * dist, F.z + Math.cos(yaw) * cp * dist);
      if (!occ.blocked(_b, _a.set(hero.x, hero.y + EYE, hero.z))) return [p, true];
      if (p >= MAX_PITCH) return [p, false];
      p = Math.min(MAX_PITCH, p + 0.035);
    }
    return [p, false];
  }

  update(dt, focus, heroAngle, moving, input) {
    const cam = this.cam;
    if (this._focus && focus.distanceToSquared(this._focus) > 16) this.snap();
    (this._focus ??= new THREE.Vector3()).copy(focus);
    if (this.cine) return; // a cinematic places the camera itself (src/engine/cinematic.js)
    const snap = this._snap;
    this._snap = false;
    if (this.override) {
      if (snap) { cam.position.copy(this.override.pos); this.look.copy(this.override.look); }
      cam.position.lerp(this.override.pos, 1 - Math.exp(-dt * 2));
      this.look.lerp(this.override.look, 1 - Math.exp(-dt * 3));
      if (!this.iso) this._keepOut(cam.position, this.look);   // (BUG-WALL: a scripted shot, and the way to it, outdoors)
      cam.lookAt(this.look);
      this.lba.init = false;
      return;
    }
    if (this.iso) this._iso(dt, focus);
    else if (this.mode === 'lba') this._lba(dt, focus, heroAngle);
    else this._free(dt, focus, heroAngle, moving, input, snap);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const s = this.shakeT * 0.6;
      cam.position.x += (Math.random() - 0.5) * s;
      cam.position.y += (Math.random() - 0.5) * s;
      cam.lookAt(this.look);
    }
  }

  _lba(dt, hero, heroAngle) {
    if (this.cut) { this._lbaCuts(dt, hero, heroAngle); return; }
    const cam = this.cam, L = this.lba, v = LBA_VIEWS[this.view], P = this.physics;
    cam.fov = LBA_FOV;
    cam.updateProjectionMatrix();
    dt = Math.max(dt, 1e-4);
    // the ground under him (a jump doesn't lift the view); falling further than a jump, it follows him down
    const groundY = () => Math.max(P ? P.groundAt(hero.x, hero.z, hero.y + 0.3) : hero.y, hero.y - 2.5);
    // first frame, a new scene, or a jump of more than 4 m (a teleport): start behind him, looking ahead
    if (!L.init || !L.f || Math.hypot(hero.x - L.last.x, hero.z - L.last.z) > 4) {
      L.goalYaw = L.yaw = heroAngle + Math.PI;
      L.lead = { x: Math.sin(heroAngle) * AHEAD, z: Math.cos(heroAngle) * AHEAD };
      L.f = { x: hero.x + L.lead.x, z: hero.z + L.lead.z, y: groundY(), vx: 0, vz: 0, vy: 0 };
      L.last = { x: hero.x, z: hero.z }; L.vel = { x: 0, z: 0 }; L.lift = 0; L.pull = 0; L.yawV = 0;
      L.init = true; L.behind = false; this.hiddenT = 0;
      // (a new scene starts already risen over the scenery, as LBA2's CameraCenter does: no rise seen through a fade)
      const [p] = this._scenePitch(hero, L.f, L.yaw, v.pitch, v.dist, L.f.y + 1);
      this.pitch = L.risePitch = p; L.riseV = 0; L.clearT = 0; this.dist = v.dist;
    }
    // the way he really moves (resolved ground velocity, lightly smoothed)
    {
      const k = 1 - Math.exp(-10 * dt);
      L.vel.x += ((hero.x - L.last.x) / dt - L.vel.x) * k; L.vel.z += ((hero.z - L.last.z) / dt - L.vel.z) * k;
      L.last.x = hero.x; L.last.z = hero.z;
    }
    if (L.behind) {
      // Enter / R3 / hidden: round behind him, aim point straight ahead of his facing (LBA2's CameraCenter(1))
      L.goalYaw = heroAngle + Math.PI; L.behind = false; L.pull = 1.2;
      L.lead.x = Math.sin(heroAngle) * AHEAD; L.lead.z = Math.cos(heroAngle) * AHEAD;
    }
    const sp = Math.hypot(L.vel.x, L.vel.z);
    if (sp > 0.6) {
      // DISTANCE_VISEE ahead along his way (in full from a brisk walk up), swinging round gently when he turns
      const a = Math.min(1, sp / 1.8) * AHEAD * aheadK(this.pitch, v.pitch), k = 1 - Math.exp(-LEAD_RATE * dt);
      L.lead.x += ((L.vel.x / sp) * a - L.lead.x) * k; L.lead.z += ((L.vel.z / sp) * a - L.lead.z) * k;
    }
    L.pull = Math.max(0, L.pull - dt);
    // a swing (Enter: round behind him; hidden: just far enough round to see him): eased in and out, at most 60°/s
    {
      const d = angleDiff(L.yaw, L.goalYaw), want = clamp(d * 2.2, -SWING_V, SWING_V), a = SWING_A * dt;
      L.yawV = (L.yawV || 0) + clamp(want - (L.yawV || 0), -a, a);
      if (Math.abs(d) < 1e-3 && Math.abs(L.yawV) < 1e-3) { L.yaw = L.goalYaw; L.yawV = 0; } else L.yaw += L.yawV * dt;
    }
    this.yaw = L.yaw;
    const F = L.f, rx = Math.cos(L.yaw), rz = -Math.sin(L.yaw), fx = -Math.sin(L.yaw), fz = -Math.cos(L.yaw);
    // the dead zone, in the view's own axes (across the screen / into it)
    const ex = hero.x + L.lead.x - F.x, ez = hero.z + L.lead.z - F.z;
    const er = ex * rx + ez * rz, ef = ex * fx + ez * fz, dr = L.pull > 0 ? 0 : DEAD_R, df = L.pull > 0 ? 0 : DEAD_F;
    const cr = er - clamp(er, -dr, dr), cf = ef - clamp(ef, -df, df);
    spring(F, 'x', F.x + rx * cr + fx * cf, FOLLOW_W, dt);
    spring(F, 'z', F.z + rz * cr + fz * cf, FOLLOW_W, dt);
    spring(F, 'y', groundY(), HEIGHT_W, dt);
    this.dist = damp(this.dist, v.dist, 4, dt);
    // VP-10: risen over the scenery between the view and him (LBA2's SearchCameraPos, here every frame): up as soon as
    // it is needed, down only after the way has stayed clear for RISE_HOLD; the pitch moves eased, never jerks
    {
      const [want, clear] = this._scenePitch(hero, F, L.yaw, v.pitch, this.dist, F.y + 1);
      L.clear = clear;
      if (want >= L.risePitch - 1e-3) { L.risePitch = want; L.clearT = 0; }
      else if ((L.clearT += dt) > RISE_HOLD) L.risePitch = want;
      const d = L.risePitch - this.pitch, wantV = clamp(d * 2.2, -RISE_V, RISE_V), a = RISE_A * dt;
      L.riseV += clamp(wantV - L.riseV, -a, a);
      if (Math.abs(d) < 1e-3 && Math.abs(L.riseV) < 1e-3) { this.pitch = L.risePitch; L.riseV = 0; } else this.pitch += L.riseV * dt;
    }
    const cp = Math.cos(this.pitch), sn = Math.sin(this.pitch);
    const place = () => {
      const x = F.x + Math.sin(L.yaw) * cp * this.dist, z = F.z + Math.cos(L.yaw) * cp * this.dist;
      const y = F.y + 1 + sn * this.dist;
      return [x, y, z];
    };
    let [x, y, z] = place();
    // clear of the ground and of everything solid round the camera (BUG-WALL: _clearance; risen at once, let down
    // gently: no bob over bumps)
    const need = this._clearance(x, y, z);
    L.lift = need > L.lift ? L.lift + (need - L.lift) * (1 - Math.exp(-12 * dt)) : damp(L.lift, need, 2, dt);
    const pose = () => { cam.position.set(x, y, z); this.look.set(F.x, F.y + 1, F.z); this._keepOut(cam.position, this.look, L.lift); cam.lookAt(this.look); cam.updateMatrixWorld(); };
    pose();
    // never out of LBA2's frame box: if he is (a sprint, a fall, a fast lift), the view slides just enough
    for (let i = 0; i < 3; i++) {
      _v.set(hero.x, hero.y + 0.9, hero.z).project(cam);
      const ox = _v.x < BOX.x0 ? _v.x / BOX.x0 : _v.x > BOX.x1 ? _v.x / BOX.x1 : 1;
      const oy = _v.y < BOX.y0 ? _v.y / BOX.y0 : _v.y > BOX.y1 ? _v.y / BOX.y1 : 1;
      const o = Math.max(ox, oy);
      if (!(o > 1.0001) || _v.z > 1) break;
      const q = Math.min(1, 1 - 1 / o + 0.02);
      F.x += (hero.x - F.x) * q; F.z += (hero.z - F.z) * q;
      [x, y, z] = place(); pose();
    }
    this.target.copy(hero);
    // hidden behind something solid for a moment (not the scenery volumes: the view rises over those): round behind him
    {
      const toCam = Math.atan2(cam.position.x - hero.x, cam.position.z - hero.z);
      const dHero = Math.hypot(cam.position.x - hero.x, cam.position.z - hero.z) / Math.max(cp, 0.1);
      _v.set(hero.x, hero.y, hero.z);
      L.hideCool = Math.max(0, (L.hideCool || 0) - dt);
      if (this.occluded(_v, cp, sn, toCam, dHero, true) < dHero - 0.5) this.hiddenT += dt; else this.hiddenT = 0;
      // hidden for most of a second (and not again for 4 s: passing a tree trunk or two doesn't swing the view about):
      // the smallest turn of the view, 15° at a time up to 90° either way, that shows him again (none: it stays)
      if (this.hiddenT > 0.8 && !L.hideCool) {
        this.hiddenT = 0; L.hideCool = 4;
        search: for (let k = 1; k <= 6; k++) for (const sg of [1, -1]) {
          const y2 = L.goalYaw + sg * k * (Math.PI / 12);
          if (this.occluded(_v, cp, sn, y2, dHero, true) >= dHero - 0.5) { L.goalYaw = y2; break search; }
        }
      }
    }
  }

  // LBA2's own exterior camera, as in 1997: a still view, a cut when he leaves the frame box (the 1997 look). Each new
  // shot runs SearchCameraPos (VP-10): over the scenery in the way, keeping its heading and distance.
  _lbaCuts(dt, hero, heroAngle) {
    const cam = this.cam, L = this.lba;
    L.f = null;   // (the remaster's follow starts afresh when the look changes back)
    const v = LBA_VIEWS[this.view];
    cam.fov = LBA_FOV;
    cam.updateProjectionMatrix();
    const shoot = (behind) => {
      if (behind) L.goalYaw = heroAngle + Math.PI;
      L.view = this.view;
      // the look-at point, DISTANCE_VISEE ahead (along the view once the camera is forced up, shrinking with its pitch)
      const aim = (p) => (p <= v.pitch + 1e-4 ? L.goal.set(hero.x + Math.sin(heroAngle) * AHEAD, hero.y, hero.z + Math.cos(heroAngle) * AHEAD)
        : L.goal.set(hero.x - Math.sin(L.goalYaw) * AHEAD * aheadK(p, v.pitch), hero.y, hero.z - Math.cos(L.goalYaw) * AHEAD * aheadK(p, v.pitch)));
      const occ = this.occ?.();
      let p = occ ? occ.search(hero, L.goalYaw, v.pitch, v.dist, { maxPitch: MAX_PITCH }) : v.pitch;
      L.clear = true;
      for (let i = 0; ; i++) {
        aim(p);
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
        // hidden for a moment: a new shot over the scenery in the way; behind a wall, a cliff or the lighthouse (not
        // scenery volumes), or when no pitch clears the view, round behind him
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
    this._keepOut(cam.position, this.look);   // (BUG-WALL: a still shot a stone rises into rises with it)
    cam.lookAt(this.look);
    this.target.copy(hero);
  }

  // BUG-WALL: how far a camera at (x, y, z) must rise (m, ≥ 0) to stand clear of the terrain, the colliders and the
  // scenery volumes round it (see CLEAR_R); colliders too tall to rise over that it stands in or against go to `tall`
  _clearance(x, y, z, tall = null, base = 1.5) {
    const T = this.terrain, P = this.physics, occ = this.occ?.();
    let need = Math.max(T.heightAt(x, z) + base, base) - y;   // (the ground straight under it, as before)
    for (const [r, dx, dz] of RING) { const n = T.heightAt(x + dx, z + dz) + lerp(base, 0.3, r / CLEAR_R) - y; if (n > need) need = n; }
    if (P) {
      _seen.clear();
      for (const [dx, dz] of CORNERS) for (const c of P.near(x + dx, z + dz)) {
        if (_seen.has(c)) continue;
        _seen.add(c);
        // (camSkip: a house or a dome, whose scenery volume below stands for its taller box; bottom: overhead)
        if (!c.enabled || (c.camSkip && occ) || c.bottom > y + 1) continue;
        const up = c.top + CLEAR_TOP - y;
        if (up <= 0) continue;
        const s = outside(c, x, z);
        if (s >= CLEAR_R) continue;
        if (up > LIFT_MAX) { if (s < CLEAR_IN) tall?.push(c); continue; }
        need = Math.max(need, up * clearW(s));
      }
    }
    if (occ) {
      _seen.clear();
      for (const [dx, dz] of CORNERS) for (const v of occ.near(x + dx, z + dz)) {
        if (_seen.has(v)) continue;
        _seen.add(v);
        if (v.y0 > y + 1 || v.top + CLEAR_TOP <= y) continue;
        let t = occ.topAt(v, x, z), n = t > -Infinity ? t + CLEAR_TOP - y : 0;
        for (const [r, dx2, dz2] of RING) { t = occ.topAt(v, x + dx2, z + dz2); if (t > -Infinity) n = Math.max(n, (t + CLEAR_TOP - y) * clearW(r)); }
        need = Math.max(need, n);
      }
    }
    return Math.max(0, need);
  }

  // BUG-WALL: the camera at p (looking at `look`) moved clear of solids: drawn in toward the look-at point out of a
  // wall too tall to rise over, then risen by what is needed there (at least `lift`, the follow's eased let-down);
  // `base`: the height kept over the ground straight under it
  _keepOut(p, look, lift = 0, base = 1.5) {
    if (!this.terrain) return 0;
    const tall = [];
    this._clearance(p.x, p.y, p.z, tall, base);
    if (tall.length) {
      _c.subVectors(look, p);
      const L = _c.length();
      _c.divideScalar(L || 1);
      for (let d = 0.1; d < L - 2; d += 0.1) {
        const x = p.x + _c.x * d, z = p.z + _c.z * d;
        if (tall.every((c) => outside(c, x, z) >= CLEAR_IN)) { p.addScaledVector(_c, d); break; }
      }
    }
    const need = this._clearance(p.x, p.y, p.z, null, base);
    p.y += Math.max(lift, need);
    return need;
  }

  // what hides Twinsen from the camera now: 'scenery' (a registered volume or the terrain: a new shot rises over it),
  // 'collider' (a wall, a cliff, the lighthouse: round behind him), or null. Hidden = his middle and head both cut off.
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
    return this.occluded(_v, cp, sp, toCam, dHero) < dHero - 0.5 ? 'collider' : null;
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

  _free(dt, focus, heroAngle, moving, input, snap = false) {
    const cam = this.cam;
    const d = input ? input.camera() : { dx: 0, dy: 0 };
    this.yaw -= d.dx;
    this.pitch = clamp(this.pitch + d.dy, 0.08, 1.2);
    if (d.dx !== 0 || d.dy !== 0) this.idleT = 0; else this.idleT += dt;
    if (moving && this.idleT > 1.5) this.yaw = dampAngle(this.yaw, heroAngle + Math.PI, 0.7, dt);
    this.dist = damp(this.dist, 9.5, 3, dt);
    cam.fov = damp(cam.fov, 55, 3, dt);
    cam.updateProjectionMatrix();
    if (snap) { this.target.copy(focus); this.dist = 9.5; cam.fov = 55; cam.updateProjectionMatrix(); this.occDist = 99; }
    this.target.lerp(focus, 1 - Math.exp(-dt * 10));
    const t = this.target;
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const want = this.occluded(t, cp, sp, this.yaw, this.dist, false, true);
    this.occDist = want < this.occDist || snap ? want : damp(this.occDist, want, 2, dt);
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
    this._keepOut(cam.position, this.look, 0, 0.8);   // (BUG-WALL; the free orbit keeps its own 0.8 m over the ground)
    cam.lookAt(this.look);
  }
}
