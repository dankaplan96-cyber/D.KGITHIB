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
// CAM-2 (the user: "the camera doesn't work very well — it moves a lot"; measured by tests/camsteady.mjs): the look-ahead
// moves only once he keeps to a way (a shuffle, a step back or a turn on the spot used to swing it 3 m round and the view
// with it); the height has a dead band; the rise over scenery holds its highest need for 2 s, comes down at 22°/s and
// stops at 48° — needing more, the view turns round to a heading that sees him lower instead of looking straight down
// (80° beside a house); a new scene starts from such a heading; a shake is a smooth tremor; the free orbit no longer
// turns by itself under camera-relative controls, nor pumps in and out past posts and corners.
//
// The camera's own spot (BUG-WALL): whatever placed it — the follow, a 1997 cut, a cutscene's shot, the free orbit —
// it never stands in or against anything solid outdoors (_clearance). Before, only the ground straight under it
// counted, so at a cliff's brink it stood inside the rock face beside it, and a collider (the Whispering Cliffs'
// stepping stones rising through it after the target, a tank, a pillar) was never tested at all.
//
// "free" is a modern third-person orbit with obstacle avoidance.
import * as THREE from 'three';
import { clamp, lerp, smoothstep, damp, dampAngle, angleDiff, noise2 } from './math.js';
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
// CAM-2: the look-ahead turns with the ground he covers (LEAD_DIST m for most of a turn), not with time, and only once
// he has kept to a way (within RUN_TOL of it) for COMMIT m: turning on the spot, a shuffle, a step back or a short
// correction leave it where it is (it used to swing the whole 3.3 m round, and the view with it, on every one); a
// walking turn swings it round over a few steps. The height keeps a dead band of DEAD_Y m (a kerb, a bump in the
// lane, a step don't bob the view; a stair or a slope still carries it)
const DEAD_R = 1.4, DEAD_F = 1.0, FOLLOW_W = 5, HEIGHT_W = 3.2, LEAD_DIST = 2.2, COMMIT = 1.0, RUN_TOL = 0.6, RUN_TURN = 2.5, DEAD_Y = 0.35;
const BOX = { x0: -0.62, x1: 0.6, y0: -0.66, y1: 0.55 };
const SWING_V = (60 * Math.PI) / 180, SWING_A = (90 * Math.PI) / 180;   // the view's swing: top speed, ease (rad/s, rad/s²)
// VP-10: the rise over scenery: top pitch, pitch speed and ease (rad, rad/s, rad/s²), how long the way stays clear
// before the view comes back down (s)
// CAM-2: it comes down only to the highest pitch needed over the last RISE_HOLD s, and only when that is RISE_BAND under
// where it stands (a house's roof line grazing the view no longer rocks it up and down); up it goes RISE_PAD over the
// need, so the next step behind the same roof doesn't start it again; down more gently than up (RISE_V_DOWN)
const MAX_PITCH = 1.4, RISE_V = (50 * Math.PI) / 180, RISE_V_DOWN = (22 * Math.PI) / 180, RISE_A = 1.5, RISE_HOLD = 2.0, RISE_PAD = 0.03, RISE_BAND = 0.07;
// CAM-2: a steep view (BUILD109_REVIEW §6: "the steep overhead camera makes Twinsen hard to read"). Right beside a house
// with the view on its far side, LBA2's rise needs up to 80° — looking straight down on him, and back down again a few
// steps on. The rise stops at STEEP; if more is needed for STEEP_T s, the view turns round instead, by the least
// (15° at a time, up to SIDE_MAX either way) that sees him over everything at STEEP_OK or less, eased like any swing,
// and not again for STEEP_COOL s. Only when no heading does, it rises on as LBA2's (the silhouette shows him till then).
// A new scene (a door, a load) starts from such a heading at once, behind the fade. Enter's own swing behind him is
// kept for USER_HOLD s: the view rises there as LBA2's and is not turned away.
const STEEP = (48 * Math.PI) / 180, STEEP_OK = (40 * Math.PI) / 180, STEEP_T = 0.5, STEEP_COOL = 4, SIDE_MAX = 7, USER_HOLD = 6;
// CAM-2, the free orbit: it turns round behind him by itself only with the tank controls (with camera-relative controls a
// turn of the view turns his way too, and the two chased each other), only while he walks a steady way (STEADY s) and
// is turned AUTO_MIN..AUTO_MAX from it, eased (≤ AUTO_V, AUTO_A), never while the player turns it (AUTO_IDLE s after);
// scenery between it and him draws it in quickly but eased (≤ OCC_IN_V m/s, never a jump), and it lets out only after
// the way has been clear for OCC_HOLD s (≤ OCC_OUT_V m/s): no pumping in and out along a wall
const AUTO_V = (24 * Math.PI) / 180, AUTO_A = (45 * Math.PI) / 180, AUTO_MIN = (25 * Math.PI) / 180, AUTO_OFF = (4 * Math.PI) / 180, AUTO_MAX = (115 * Math.PI) / 180, AUTO_IDLE = 2, STEADY = 0.6;
const OCC_IN_V = 8, OCC_OUT_V = 2.5, OCC_HOLD = 0.7, OCC_A = 30, OCC_A_OUT = 5, OCC_DELAY = 0.2, TALL_FREE = 1.0;
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
// The remaster follow eases the comfortable margins in (rates LIFT_UP_W / LIFT_DOWN_W 1/s, at most LIFT_V m/s and
// LIFT_A m/s², looking LIFT_AHEAD s down its own way) over a floor of HARD × them (the terrain within HARD_R only):
// the least it may ever come to a surface, held at once.
const CLEAR_R = 1.6, CLEAR_IN = 0.45, CLEAR_TOP = 0.5, LIFT_MAX = 4, HARD = 0.25, HARD_R = 0.8, LIFT_UP_W = 8, LIFT_DOWN_W = 2.5, LIFT_V = 5, LIFT_A = 7, LIFT_AHEAD = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25];
const RING = [0.4, 0.8, 1.2, 1.6].flatMap((r) => Array.from({ length: 12 }, (_, i) => [r, Math.sin((i * Math.PI) / 6) * r, Math.cos((i * Math.PI) / 6) * r]));
const CORNERS = [[-CLEAR_R, -CLEAR_R], [CLEAR_R, -CLEAR_R], [-CLEAR_R, CLEAR_R], [CLEAR_R, CLEAR_R]];
const clearW = (s) => (s <= CLEAR_IN ? 1 : s >= CLEAR_R ? 0 : smoothstep(CLEAR_R, CLEAR_IN, s));
const hardW = (s) => (s <= 0.2 ? 1 : s >= HARD_R ? 0 : smoothstep(HARD_R, 0.2, s));   // (the least margins: only what is close)
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
    this.relative = false; // () → true when the controls are camera-relative (Modern): the free orbit never turns by itself (main.js)
    this.base = new THREE.Vector3();   // (CAM-2: where the camera stands before a shake's tremor; tests/lib/camrec.js)
    // CAM-2: what moved the view this frame (tests/camsteady.mjs reads it; a few numbers, always kept)
    this.why = { mode: '', follow: 0, box: 0, swing: 0, swingBy: '', rise: 0, lift: 0, keep: 0, dist: 0, auto: 0, user: 0, occ: 0, ground: 0, snap: false };
    this.lba = { init: false, focus: new THREE.Vector3(), goal: new THREE.Vector3(), yaw: 0, goalYaw: 0, goalPitch: 0, behind: false, view: 0, clear: true };
  }

  setMode(m) { this.mode = m === 'free' ? 'free' : 'lba'; this.lba.init = false; if (this.fr) this.fr.init = false; }
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
  // (`limit`: past it the answer is only "too steep" — CAM-2's heading search stops there)
  _scenePitch(hero, F, yaw, p0, dist, lookY, limit = Infinity) {
    const occ = this.occ?.();
    if (!occ) return [p0, true];
    let p = occ.search(hero, yaw, p0, dist, { maxPitch: MAX_PITCH });
    for (let i = 0; i < 25; i++) {
      if (p > limit) return [p, false];
      const cp = Math.cos(p);
      _b.set(F.x + Math.sin(yaw) * cp * dist, lookY + Math.sin(p) * dist, F.z + Math.cos(yaw) * cp * dist);
      if (!occ.blocked(_b, _a.set(hero.x, hero.y + EYE, hero.z))) return [p, true];
      if (p >= MAX_PITCH) return [p, false];
      p = Math.min(MAX_PITCH, p + 0.035);
    }
    return [p, false];
  }

  // CAM-2 (STEEP): the least turn of the view from yaw0, 15° at a time up to maxK steps either way (first toward
  // `prefer`), from which Twinsen is seen over the scenery at STEEP_OK or less and no wall or cliff hides him → [yaw,
  // pitch], or null
  _sideYaw(hero, F, yaw0, v, dist, maxK, prefer) {
    const s1 = angleDiff(yaw0, prefer) < 0 ? -1 : 1;
    _c.set(hero.x, hero.y, hero.z);
    for (let k = 1; k <= maxK; k++) for (const sg of [s1, -s1]) {
      const y2 = yaw0 + sg * k * (Math.PI / 12), [p, clear] = this._scenePitch(hero, F, y2, v.pitch, dist, F.y + 1, STEEP_OK);
      if (!clear || p > STEEP_OK) continue;
      if (this.occluded(_c, Math.cos(p), Math.sin(p), y2, dist, true) < dist - 0.5) continue;
      return [y2, p];
    }
    return null;
  }

  // CAM-2, the free orbit: how far out along its line (from t, heading yaw) the camera may stand and keep TALL_FREE m
  // from any collider too tall to rise over (the keep-out would otherwise pull it in with a jump at CLEAR_IN)
  _tallFree(t, cp, sp, yaw, maxD) {
    const P = this.physics, occ = this.occ?.();
    if (!P) return maxD;
    for (let d = maxD; d > 2; d -= 0.25) {
      const x = t.x + Math.sin(yaw) * cp * d, z = t.z + Math.cos(yaw) * cp * d, y = t.y + 1.4 + sp * d;
      let ok = true;
      _seen.clear();
      for (const [dx, dz] of CORNERS) { for (const c of P.near(x + dx, z + dz)) {
        if (_seen.has(c)) continue;
        _seen.add(c);
        if (!c.enabled || (c.camSkip && occ) || c.bottom > y + 1 || c.top + CLEAR_TOP - y <= LIFT_MAX) continue;
        if (outside(c, x, z) < TALL_FREE) { ok = false; break; }
      } if (!ok) break; }
      if (ok) return d;
    }
    return 2;
  }

  update(dt, focus, heroAngle, moving, input) {
    const cam = this.cam;
    if (this._focus && focus.distanceToSquared(this._focus) > 16) this.snap();
    (this._focus ??= new THREE.Vector3()).copy(focus);
    // (CAM-2: a drag of the mouse or a finger with no free orbit to turn is let go, not kept for later: it used to pile
    // up through the LBA view, a room or a cutscene and swing the free orbit round all at once when it came back)
    if (input && !(this.mode === 'free' && !this.iso && !this.override && !this.cine)) input.camera(dt);
    if (this.cine) return; // a cinematic places the camera itself (src/engine/cinematic.js)
    const snap = this._snap;
    this._snap = false;
    { const W = this.why; W.follow = W.box = W.swing = W.rise = W.lift = W.keep = W.dist = W.auto = W.user = W.occ = W.ground = 0; W.swingBy = ''; W.snap = !!snap; W.mode = this.override ? 'override' : this.iso ? 'iso' : this.mode === 'lba' ? (this.cut ? 'cuts' : 'lba') : 'free'; }
    if (this.override) {
      if (snap) { cam.position.copy(this.override.pos); this.look.copy(this.override.look); }
      cam.position.lerp(this.override.pos, 1 - Math.exp(-dt * 2));
      this.look.lerp(this.override.look, 1 - Math.exp(-dt * 3));
      if (!this.iso) this._keepOut(cam.position, this.look);   // (BUG-WALL: a scripted shot, and the way to it, outdoors)
      cam.lookAt(this.look);
      this.lba.init = false;
      this.base.copy(cam.position);
      return;
    }
    if (this.iso) this._iso(dt, focus);
    else if (this.mode === 'lba') this._lba(dt, focus, heroAngle);
    else this._free(dt, focus, heroAngle, moving, input, snap);
    this.base.copy(cam.position);
    if (this.shakeT > 0) {
      // (CAM-2: a smooth tremor, the same at any frame rate — it was a new random jump every frame)
      this.shakeT = Math.max(0, this.shakeT - dt);
      this.shakeClock = (this.shakeClock || 0) + dt;
      const s = this.shakeT * 0.3, c = this.shakeClock * 11;
      const ox = noise2(c, 3.1) * s, oy = noise2(c, 17.7) * s;
      cam.position.x += Math.cos(this.yaw) * ox; cam.position.z -= Math.sin(this.yaw) * ox; cam.position.y += oy;
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
      L.run = { dir: heroAngle, dist: COMMIT };
      L.f = { x: hero.x + L.lead.x, z: hero.z + L.lead.z, y: groundY(), vx: 0, vz: 0, vy: 0 };
      L.gy = L.f.y;
      L.last = { x: hero.x, z: hero.z }; L.vel = { x: 0, z: 0 }; L.lift = 0; L.vlift = 0; L.pv = null; L.fresh = true; L.pull = 0; L.yawV = 0;
      L.init = true; L.behind = false; this.hiddenT = 0; L.steepT = 0; L.steepCool = 0; L.userHold = 0; L.swingBy = '';
      // (a new scene starts already risen over the scenery, as LBA2's CameraCenter does: no rise seen through a fade;
      // CAM-2: and from a heading that needs no steep view — out of a door he faces away from the house, so behind him
      // is over its roof)
      let [p] = this._scenePitch(hero, L.f, L.yaw, v.pitch, v.dist, L.f.y + 1);
      if (p > STEEP_OK) { const b = this._sideYaw(hero, L.f, L.yaw, v, v.dist, 12, heroAngle + Math.PI); if (b) { L.goalYaw = L.yaw = b[0]; p = b[1]; } }
      this.pitch = L.risePitch = p; L.riseV = 0; L.clearT = 0; L.riseHist = []; L.clock = 0; this.dist = v.dist;
    }
    // the way he really moves (resolved ground velocity, lightly smoothed)
    {
      const k = 1 - Math.exp(-10 * dt);
      L.vel.x += ((hero.x - L.last.x) / dt - L.vel.x) * k; L.vel.z += ((hero.z - L.last.z) / dt - L.vel.z) * k;
      L.last.x = hero.x; L.last.z = hero.z;
    }
    if (L.behind) {
      // Enter / R3 / hidden: round behind him, aim point straight ahead of his facing (LBA2's CameraCenter(1))
      L.goalYaw = heroAngle + Math.PI; L.behind = false; L.pull = 1.2; L.swingBy = 'behind'; L.userHold = USER_HOLD;
      L.lead.x = Math.sin(heroAngle) * AHEAD; L.lead.z = Math.cos(heroAngle) * AHEAD;
      L.run = { dir: heroAngle, dist: COMMIT };
    }
    const sp = Math.hypot(L.vel.x, L.vel.z);
    if (sp > 0.6) {
      // the way he keeps to (CAM-2: COMMIT, RUN_TOL): a new one starts from nothing; a curve carries it round
      // (a way that bends no faster than RUN_TURN — a walking or running curve — is the same way: it carries the run
      // round with it; a sudden new direction, or a new start that isn't within RUN_TOL of the last way, starts afresh)
      const way = Math.atan2(L.vel.x, L.vel.z), R = L.run;
      const smooth = R.prev != null && Math.abs(angleDiff(R.prev, way)) <= RUN_TURN * dt + 0.01;
      if (smooth || (R.prev == null && Math.abs(angleDiff(R.dir, way)) < RUN_TOL)) { R.dist += sp * dt; R.dir = way; } else { R.dir = way; R.dist = 0; }
      R.prev = way;
      if (R.dist >= COMMIT) {
        // DISTANCE_VISEE ahead along his way (in full from a brisk walk up), swinging round with the ground he covers
        const a = Math.min(1, sp / 1.8) * AHEAD * aheadK(this.pitch, v.pitch), k = 1 - Math.exp(-(sp * dt) / LEAD_DIST);
        L.lead.x += (Math.sin(R.dir) * a - L.lead.x) * k; L.lead.z += (Math.cos(R.dir) * a - L.lead.z) * k;
      }
    } else L.run.prev = null;
    L.pull = Math.max(0, L.pull - dt);
    L.userHold = Math.max(0, L.userHold - dt); L.steepCool = Math.max(0, L.steepCool - dt);
    // a swing (Enter: round behind him; hidden: just far enough round to see him): eased in and out, at most 60°/s
    {
      const d = angleDiff(L.yaw, L.goalYaw), want = clamp(d * 2.2, -SWING_V, SWING_V), a = SWING_A * dt;
      L.yawV = (L.yawV || 0) + clamp(want - (L.yawV || 0), -a, a);
      if (Math.abs(d) < 1e-3 && Math.abs(L.yawV) < 1e-3) { L.yaw = L.goalYaw; L.yawV = 0; } else L.yaw += L.yawV * dt;
    }
    this.yaw = L.yaw;
    const F = L.f, rx = Math.cos(L.yaw), rz = -Math.sin(L.yaw), fx = -Math.sin(L.yaw), fz = -Math.cos(L.yaw);
    const W = this.why, f0x = F.x, f0y = F.y, f0z = F.z, p0 = this.pitch, l0 = L.lift, d0 = this.dist;
    W.swing = angleDiff(this._yaw0 ?? L.yaw, L.yaw); this._yaw0 = L.yaw; W.swingBy = L.swingBy || '';
    // the dead zone, in the view's own axes (across the screen / into it)
    const ex = hero.x + L.lead.x - F.x, ez = hero.z + L.lead.z - F.z;
    const er = ex * rx + ez * rz, ef = ex * fx + ez * fz, dr = L.pull > 0 ? 0 : DEAD_R, df = L.pull > 0 ? 0 : DEAD_F;
    const cr = er - clamp(er, -dr, dr), cf = ef - clamp(ef, -df, df);
    spring(F, 'x', F.x + rx * cr + fx * cf, FOLLOW_W, dt);
    spring(F, 'z', F.z + rz * cr + fz * cf, FOLLOW_W, dt);
    { const g = groundY(); L.gy = clamp(L.gy, g - DEAD_Y, g + DEAD_Y); }   // (the height's dead band, DEAD_Y)
    spring(F, 'y', L.gy, HEIGHT_W, dt);
    this.dist = damp(this.dist, v.dist, 4, dt);
    W.follow = Math.hypot(F.x - f0x, F.y - f0y, F.z - f0z); W.dist = this.dist - d0;
    // VP-10: risen over the scenery between the view and him (LBA2's SearchCameraPos, here every frame): up as soon as
    // it is needed, down only after the way has stayed clear for RISE_HOLD; the pitch moves eased, never jerks
    {
      const [want, clear] = this._scenePitch(hero, F, L.yaw, v.pitch, this.dist, F.y + 1);
      L.clear = clear;
      // (the highest need over the last RISE_HOLD s)
      const H = L.riseHist; L.clock += dt; H.push(L.clock, want);
      while (H.length > 2 && H[0] < L.clock - RISE_HOLD) H.splice(0, 2);
      let need = v.pitch; for (let i = 1; i < H.length; i += 2) need = Math.max(need, H[i]);
      // CAM-2: steeper than STEEP for a moment: round to a heading that sees him lower (see STEEP)
      const swinging = Math.abs(angleDiff(L.yaw, L.goalYaw)) > 0.02;
      L.steepT = want > STEEP && !swinging ? L.steepT + dt : 0;
      if (L.steepT > STEEP_T && !L.steepCool && !L.userHold) {
        L.steepT = 0; L.steepCool = STEEP_COOL;
        const b = this._sideYaw(hero, F, L.yaw, v, this.dist, SIDE_MAX, Math.atan2(-L.vel.x, -L.vel.z));
        if (b) { L.goalYaw = b[0]; L.swingBy = 'steep'; H.length = 0; L.noSide = false; } else L.noSide = true;
      }
      if (want <= STEEP_OK) L.noSide = false;   // (the need has gone: the cap is back)
      let goal = need > v.pitch + 1e-3 ? Math.min(MAX_PITCH, need + RISE_PAD) : v.pitch;
      if (!L.noSide && !L.userHold) goal = Math.min(goal, STEEP);
      if (need > L.risePitch - 1e-4 || goal < L.risePitch - RISE_BAND || (goal === v.pitch && goal < L.risePitch)) L.risePitch = goal;
      const d = L.risePitch - this.pitch, wantV = clamp(d * 2.2, -RISE_V_DOWN, RISE_V), a = RISE_A * dt;
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
    // clear of the ground and of everything solid round the camera (BUG-WALL: _clearance). The comfortable margins are
    // eased in with a bounded speed and acceleration (quick up, gentle down: the need's kinks over ridges, rock rims and
    // roofs would otherwise jolt the view); the least margins (HARD) hold at once, every frame: never inside anything
    // (and looking down the camera's own way, LIFT_AHEAD s on: a swing round into a roof starts rising before it)
    let need = this._clearance(x, y, z);
    if (L.pv) {
      const vx = (x - L.pv.x) / dt, vy = (y - L.pv.y) / dt, vz = (z - L.pv.z) / dt;
      if (Math.hypot(vx, vz) > 0.5 && Math.hypot(vx, vz) < 60) for (const T of LIFT_AHEAD) { const n = this._clearance(x + vx * T, y + vy * T, z + vz * T); if (n > 0) need = Math.max(need, n + vy * T); }
    }
    (L.pv ??= {}).x = x; L.pv.y = y; L.pv.z = z;
    {
      // (the speed it may have at this distance from the target and still stop on it within LIFT_A: no overshoot)
      this._ease(L, need, dt);
      if (L.fresh) { L.lift = need; L.vlift = 0; L.fresh = false; }   // (a new shot starts clear, as it starts risen)
    }
    W.rise = this.pitch - p0; W.lift = L.lift - l0;
    let hard = 0;
    const pose = () => { cam.position.set(x, y, z); this.look.set(F.x, F.y + 1, F.z); hard = this._keepOut(cam.position, this.look, L.lift, 1.5 * HARD, HARD); cam.lookAt(this.look); cam.updateMatrixWorld(); };
    pose();
    const fb = [F.x, F.z];
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
    W.box = Math.hypot(F.x - fb[0], F.z - fb[1]);
    // (CAM-2: what the least margins lifted it by at once becomes the eased lift's own, so it comes down from there
    // gently — it used to drop back the whole way in one frame as soon as the floor let go)
    if (hard > L.lift) { L.lift = hard; L.vlift = Math.max(0, L.vlift); }
    // (what _keepOut added beyond the eased lift: a hard floor or a pull-in out of a tall wall; its change this frame)
    { const ko = [cam.position.x - x, cam.position.y - y - L.lift, cam.position.z - z], k0 = L.ko || ko; W.keep = Math.hypot(ko[0] - k0[0], ko[1] - k0[1], ko[2] - k0[2]); L.ko = ko; }
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
        // (CAM-2: first among the headings that need no steep view over the scenery, so the two rules don't trade swings)
        search: for (const lowOnly of [true, false]) for (let k = 1; k <= 6; k++) for (const sg of [1, -1]) {
          const y2 = L.goalYaw + sg * k * (Math.PI / 12);
          if (this.occluded(_v, cp, sn, y2, dHero, true) < dHero - 0.5) continue;
          if (lowOnly && this._scenePitch(hero, F, y2, v.pitch, this.dist, F.y + 1)[0] > STEEP) continue;
          L.goalYaw = y2; L.swingBy = 'hidden'; L.steepCool = Math.max(L.steepCool, STEEP_COOL); break search;
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
  // (k scales every margin: 1 the view's comfortable distance, HARD the least it may ever come to a surface)
  _clearance(x, y, z, tall = null, base = 1.5, k = 1) {
    const T = this.terrain, P = this.physics, occ = this.occ?.(), top = CLEAR_TOP * k, W = k < 1 ? hardW : clearW;
    let need = Math.max(T.heightAt(x, z) + base, base) - y;   // (the ground straight under it, as before)
    for (const [r, dx, dz] of RING) { if (k < 1 && r > HARD_R) break; const n = T.heightAt(x + dx, z + dz) + lerp(base, 0.3 * k, r / CLEAR_R) - y; if (n > need) need = n; }
    if (P) {
      _seen.clear();
      for (const [dx, dz] of CORNERS) for (const c of P.near(x + dx, z + dz)) {
        if (_seen.has(c)) continue;
        _seen.add(c);
        // (camSkip: a house or a dome, whose scenery volume below stands for its taller box; bottom: overhead)
        if (!c.enabled || (c.camSkip && occ) || c.bottom > y + 1) continue;
        const up = c.top + top - y;
        if (up <= 0) continue;
        const s = outside(c, x, z);
        if (s >= CLEAR_R) continue;
        if (up > LIFT_MAX) { if (s < CLEAR_IN) tall?.push(c); continue; }
        need = Math.max(need, up * W(s));
      }
    }
    if (occ) {
      _seen.clear();
      for (const [dx, dz] of CORNERS) for (const v of occ.near(x + dx, z + dz)) {
        if (_seen.has(v)) continue;
        _seen.add(v);
        if (v.y0 > y + 1 || v.top + top <= y) continue;
        let t = occ.topAt(v, x, z), n = t > -Infinity ? t + top - y : 0;
        for (const [r, dx2, dz2] of RING) { if (k < 1 && r > HARD_R) break; t = occ.topAt(v, x + dx2, z + dz2); if (t > -Infinity) n = Math.max(n, (t + top - y) * W(r)); }
        need = Math.max(need, n);
      }
    }
    return Math.max(0, need);
  }

  // BUG-WALL: the camera at p (looking at `look`) moved clear of solids: drawn in toward the look-at point out of a
  // wall too tall to rise over, then risen by what is needed there (at least `lift`, the follow's eased let-down);
  // `base`: the height kept over the ground straight under it; `k`: the margins' scale (see _clearance)
  _keepOut(p, look, lift = 0, base = 1.5, k = 1) {
    if (!this.terrain) return 0;
    const tall = [];
    this._clearance(p.x, p.y, p.z, tall, base, k);
    if (tall.length) {
      _c.subVectors(look, p);
      const L = _c.length();
      _c.divideScalar(L || 1);
      for (let d = 0.1; d < L - 2; d += 0.1) {
        const x = p.x + _c.x * d, z = p.z + _c.z * d;
        if (tall.every((c) => outside(c, x, z) >= CLEAR_IN)) { p.addScaledVector(_c, d); break; }
      }
    }
    const need = this._clearance(p.x, p.y, p.z, null, base, k);
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
    const cam = this.cam, P = this.physics;
    dt = Math.max(dt, 1e-4);
    const d = input ? input.camera(dt) : { dx: 0, dy: 0 };
    const W = this.why, o0 = this.occDist, A = (this.fr ??= { init: false });
    W.user = Math.abs(d.dx) + Math.abs(d.dy);
    this.yaw -= d.dx;
    this.pitch = clamp(this.pitch + d.dy, 0.08, 1.2);
    if (d.dx !== 0 || d.dy !== 0) this.idleT = 0; else this.idleT += dt;
    // the ground under him: a jump doesn't bob the orbit (falling further than a jump, it follows him down)
    const gy = Math.max(P ? P.groundAt(focus.x, focus.z, focus.y + 0.3) : focus.y, focus.y - 2.5);
    if (snap || !A.init) {
      Object.assign(A, { init: true, last: { x: focus.x, z: focus.z }, vx: 0, vz: 0, head: heroAngle, steadyT: 0, on: false, yawV: 0, lift: 0, vlift: 0, clearT: 0, occV: 0, pv: null });
      this.target.set(focus.x, gy, focus.z); this.dist = 9.5; cam.fov = 55; this.occDist = 99;
      // (CAM-2: a new scene starts behind him, not at the room's 45°; out of a door that is over the house, and the
      // orbit starts drawn in in front of it, letting out as he walks away — no turn round)
      if (snap) this.yaw = heroAngle + Math.PI;
    }
    // the way he really goes (resolved ground velocity, lightly smoothed) and how long he has kept to it
    {
      const k = 1 - Math.exp(-10 * dt);
      A.vx += ((focus.x - A.last.x) / dt - A.vx) * k; A.vz += ((focus.z - A.last.z) / dt - A.vz) * k;
      A.last.x = focus.x; A.last.z = focus.z;
    }
    const sp = Math.hypot(A.vx, A.vz), way = Math.atan2(A.vx, A.vz);
    if (sp > 0.8) { A.steadyT = Math.abs(angleDiff(A.head, way)) < 0.25 ? A.steadyT + dt : 0; A.head = dampAngle(A.head, way, 3, dt); } else A.steadyT = 0;
    // round behind him by itself (tank controls only): see AUTO_*; started, it eases on until it is nearly behind him
    {
      const gap = angleDiff(this.yaw, A.head + Math.PI), ok = !(typeof this.relative === 'function' ? this.relative() : this.relative) && moving && sp > 0.8 && this.idleT > AUTO_IDLE && A.steadyT > STEADY && Math.abs(gap) < AUTO_MAX;
      if (!ok || Math.abs(gap) < AUTO_OFF) A.on = false; else if (Math.abs(gap) > AUTO_MIN) A.on = true;
      const want = A.on ? clamp(gap * 1.2, -AUTO_V, AUTO_V) : 0, a = (A.on || moving ? AUTO_A : 3 * AUTO_A) * dt;   // (he stops: so does it, quickly)
      A.yawV += clamp(want - A.yawV, -a, a);
      if (this.idleT === 0) A.yawV = 0;   // (the player's hand on the camera wins at once)
      this.yaw += A.yawV * dt; W.auto = A.yawV * dt;
    }
    this.dist = damp(this.dist, 9.5, 3, dt);
    cam.fov = damp(cam.fov, 55, 3, dt);
    cam.updateProjectionMatrix();
    this.target.x += (focus.x - this.target.x) * (1 - Math.exp(-dt * 10));
    this.target.z += (focus.z - this.target.z) * (1 - Math.exp(-dt * 10));
    this.target.y += (gy - this.target.y) * (1 - Math.exp(-dt * 4));
    const t = this.target;
    const cp = Math.cos(this.pitch), sp2 = Math.sin(this.pitch);
    // scenery or a wall between it and him draws it in: quickly but eased, and out again only once the way has stayed
    // clear (thin things — a tree, a post, a rail — he shows between: the camera only keeps its own spot out of them)
    // (CAM-2: a passing post or corner — in the way under OCC_DELAY s — moves nothing, the silhouette shows him; a wall
    // too tall to rise over beside the camera's way draws it in ahead of time, eased, instead of the keep-out's jump)
    {
      const want = Math.min(this.dist, this.occluded(t, cp, sp2, this.yaw, this.dist, true, true), this._tallFree(t, cp, sp2, this.yaw, this.dist));
      if (this.occDist > this.dist + 0.5 || snap) { this.occDist = want; A.occV = 0; A.clearT = 0; A.blockT = 0; }
      else {
        if (want < this.occDist - 0.05) { A.clearT = 0; A.blockT = (A.blockT || 0) + dt; } else { A.blockT = 0; A.clearT += dt; }
        const goal = A.blockT > OCC_DELAY || (A.clearT > OCC_HOLD && want > this.occDist) ? want : null;
        // (toward the goal no faster than it can stop on it; with none — in the delay or the hold — it only slows)
        const e = goal == null ? 0 : goal - this.occDist, vw = goal == null ? 0 : Math.sign(e) * Math.min(e < 0 ? OCC_IN_V : OCC_OUT_V, Math.sqrt(1.6 * (e < 0 ? OCC_A : OCC_A_OUT) * Math.abs(e)));
        const acc = (vw > 0 && A.occV >= 0 ? OCC_A_OUT : OCC_A) * dt;   // (letting out: gently)
        A.occV += clamp(vw - A.occV, -acc, acc);
        const n = this.occDist + A.occV * dt;
        if (goal != null && ((A.occV < 0 && n < goal) || (A.occV > 0 && n > goal))) { this.occDist = goal; A.occV = 0; } else this.occDist = Math.min(this.dist, Math.max(1.5, n));
      }
    }
    const dist = Math.min(this.dist, this.occDist);
    W.occ = Math.min(99, this.occDist) - Math.min(99, o0);
    const x = t.x + Math.sin(this.yaw) * cp * dist;
    const z = t.z + Math.cos(this.yaw) * cp * dist;
    const y = t.y + 1.4 + sp2 * dist;
    // the terrain between it and him (the line to his head kept 0.8 m over it) and its own clearance (BUG-WALL), eased
    // in the remaster follow's way: up quickly, down gently, at bounded speed; the least margins hold at once
    let need = this._clearance(x, y, z, null, 0.8);
    for (let k = 0.3; k <= 1.0001; k += 0.35) {
      const px = t.x + (x - t.x) * k, pz = t.z + (z - t.z) * k;
      const n = (this.terrain.heightAt(px, pz) + 0.8 - (t.y + 1.4 + (y - t.y - 1.4) * k)) / k;
      if (n > need) need = n;
    }
    need = Math.max(need, 0.8 - y);
    // (CAM-2: looking down its own way as the remaster follow does — drawn in toward a roof, it starts rising before it,
    // instead of the hard floor lifting it a metre in one frame)
    if (A.pv && !snap) {
      const vx = (x - A.pv.x) / dt, vy = (y - A.pv.y) / dt, vz = (z - A.pv.z) / dt;
      if (Math.hypot(vx, vz) > 0.5 && Math.hypot(vx, vz) < 60) for (const T of LIFT_AHEAD) { const n = this._clearance(x + vx * T, y + vy * T, z + vz * T, null, 0.8); if (n > 0) need = Math.max(need, n + vy * T); }
    }
    A.pv = { x, y, z };
    const l0 = A.lift;
    this._ease(A, need, dt);
    if (snap) { A.lift = need; A.vlift = 0; }
    W.ground = A.lift - l0;
    cam.position.set(x, y, z);
    this.look.set(t.x, t.y + 1.3, t.z);
    const hard = this._keepOut(cam.position, this.look, A.lift, 0.4, HARD);   // (BUG-WALL: the least margins, at once)
    if (hard > A.lift) { A.lift = hard; A.vlift = Math.max(0, A.vlift); }   // (CAM-2: and let down eased, as in _lba)
    { const ko = [cam.position.x - x, cam.position.y - y - A.lift, cam.position.z - z], k0 = this._ko || ko; W.keep = Math.hypot(ko[0] - k0[0], ko[1] - k0[1], ko[2] - k0[2]); this._ko = ko; }
    cam.lookAt(this.look);
  }

  // the clearance lift eased toward `need` (st.lift, st.vlift): quick up, gentle down, at most LIFT_V m/s and LIFT_A m/s²,
  // and never faster than it can stop on the need (no overshoot)
  _ease(st, need, dt) {
    const e = need - st.lift, want = Math.sign(e) * Math.min(LIFT_V, Math.sqrt(1.6 * LIFT_A * Math.abs(e)), Math.abs(e) * (e > 0 ? LIFT_UP_W : LIFT_DOWN_W)), a = LIFT_A * dt;
    st.vlift += clamp(want - st.vlift, -a, a);
    st.lift = Math.max(0, st.lift + st.vlift * dt);
  }
}
