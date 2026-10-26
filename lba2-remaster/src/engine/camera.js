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
// "follow" (CAM-FOLLOW, the user on build 169: "neither camera really follows behind Twinsen — let the new one stand at
// his back"): a chase camera (_chase). It stands behind his back at a fixed distance and height, a little above his
// head, looking down over him at the way ahead; its heading follows his facing through a critically damped spring
// (settles in ~0.4 s, never overshoots, ≤ CH_VMAX), standing or running, so a turn on the spot (tank controls) turns
// the view with him. Walking backwards keeps his facing, so the view stays; with camera-relative controls a push back
// (toward the camera) holds the view's heading while he runs at it, until the stick goes another way. Scenery between
// him and the camera, or just behind it, draws the camera in along the line to him (a spring arm: quickly in, slowly out
// once the way stays clear) and tilts it a little higher as it comes in; it never stands in or near anything solid, and
// under eaves it stays under them rather than rising over the roof. Its back to a wall, it looks down over his head.
// With a lock-on it stands behind his shoulder on the line from the target, framing both. Rooms keep the iso view.
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
// CAM-FOLLOW, the chase camera (_chase): the arm from his pivot (CH_PIVOT m over the ground under him) is CH_DIST's arm
// long at its pitch (Settings → Camera distance; the user: "too close and too low" → Medium, a step out and up, the default), with a CH_FOV° lens; it looks CH_AHEAD m ahead of him, CH_LOOK m up (eased at CH_LOOK_W 1/s). The heading
// follows his facing (a steering correction within CH_DEAD_YAW moves nothing until his facing has held CH_STEADY s)
// through a spring (CH_W 1/s: within 15° of a 90° turn in 0.25 s, settled in ~0.45 s) that never turns faster than
// CH_VMAX (4°/frame at 60 fps, 8° at 30). The pivot's height keeps a dead band of CH_DEAD m, then its own spring (CH_HW).
// Camera-relative controls: a push more than CH_BACK off the view's forward holds the heading; it is let go when the
// stick goes another way and he faces less than CH_HOLD_OUT from the view's own way.
// The spring arm: the longest (CH_MIN..CH_ARM, 0.25 m steps) whose camera, over the ground (_groundNeed), keeps CH_GAP m
// from everything solid and sees him — also CH_LEAD s on down a swing or his walk, and at the heading it is turning to;
// or the same with the least margins (CH_NEAR, the ground's least: a tight spot, under eaves) when that arm is more
// than CH_TIER_PREF m longer (along a house's eaves: 5 m out and 0.2 m from them, not 1.6 m under them); none (his back to a
// wall): over his shoulder, looking down (CH_OVER_ARM at the least of CH_OVER_P that does: ~45-60° beside a house, up
// to 83° only with his back against a wall under its eaves —, eased in and out at CH_OVER_RATE 1/s; none: the silhouette shows him for the step it takes). Drawn in at up to CH_IN_V m/s,
// eased by CH_IN_A m/s², out only after CH_HOLD s clear, at most CH_OUT_V m/s eased by CH_OUT_A, never through something
// to a clear spot beyond; drawn in, the view tilts up by CH_UP rad at CH_SHORT m (CH_UP2 more at CH_MIN m). While the arm
// is out further than it wants, the heading turns slower (to a fifth of CH_VMAX at CH_LAG m out). The pipeline's tube
// keeps CH_PIPE m more (its stays and saddles stand outside its volume).
const CH_DIST = { near: { arm: 7.0, pitch: 0.34 }, medium: { arm: 8.75, pitch: 0.42 }, far: { arm: 10.75, pitch: 0.5 } };
const CH_PIVOT = 1.4, CH_AHEAD = 1.2, CH_LOOK = 0.8, CH_FOV = 50, CH_W = 11, CH_VMAX = (240 * Math.PI) / 180, CH_DEAD_YAW = (3 * Math.PI) / 180, CH_STEADY = 0.3;
const CH_DEAD = 0.25, CH_HW = 4, CH_BACK = (110 * Math.PI) / 180, CH_HOLD_OUT = (95 * Math.PI) / 180;
const CH_EL_MAX = (46 * Math.PI) / 180, CH_EL_KEEP = (4 * Math.PI) / 180, CH_EL_W = 6, CH_GAP = 0.4, CH_NEAR = 0.15, CH_INSIDE = 0.05, CH_RIM = 0.5, CH_FLICK = 0.3, CH_CONFIRM = 0.06, CH_TIER_PREF = 1.5, CH_PIPE = 0.35, CH_MIN = 1.6, CH_CLOSE = 0.7, CH_OVER_ARM = 2.4, CH_OVER_P = [0.8, 0.9, 1.0, 1.15, 1.3, 1.45], CH_OVER_RATE = 4, CH_OVER_T = 0.3, CH_LIFT_AHEAD = 0.5, CH_LEAD = [0.2, 0.45], CH_LAG = 4, CH_IN_V = 25, CH_IN_A = 200, CH_HOLD = 0.6, CH_OUT_V = 2.5, CH_OUT_A = 5, CH_UP = 0.3, CH_SHORT = 2.5, CH_UP2 = 0.1, CH_LOOK_W = 8;
// A lock-on: behind his shoulder (CH_SHOULDER rad round from the line target → him), looking at a point CH_LOCK_K of the
// way to the target (at most CH_LOCK_MAX m), the arm longer by CH_LOCK_ARM of the distance (at most CH_LOCK_ARM_MAX m).
const CH_SHOULDER = 0.22, CH_LOCK_K = 0.45, CH_LOCK_MAX = 4, CH_LOCK_ARM = 0.3, CH_LOCK_ARM_MAX = 3;
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
const _seen = new Set(), _cells = [], NO_SKIP = new Set();
const RIM5 = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]], GAP4 = [[-1, -1], [1, -1], [-1, 1], [1, 1]], GAP11 = [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0], [0.7, 0, 0.7], [0.7, 0, -0.7], [-0.7, 0, 0.7], [-0.7, 0, -0.7]];

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
    this.lockOn = null;    // () → the locked target's position, or null: the Follow camera frames both (main.js)
    this.base = new THREE.Vector3();   // (CAM-2: where the camera stands before a shake's tremor; tests/lib/camrec.js)
    // CAM-2: what moved the view this frame (tests/camsteady.mjs reads it; a few numbers, always kept)
    this.why = { mode: '', follow: 0, box: 0, swing: 0, swingBy: '', rise: 0, lift: 0, keep: 0, dist: 0, auto: 0, user: 0, occ: 0, ground: 0, snap: false };
    this.lba = { init: false, focus: new THREE.Vector3(), goal: new THREE.Vector3(), yaw: 0, goalYaw: 0, goalPitch: 0, behind: false, view: 0, clear: true };
  }

  // CAM-FOLLOW: the Follow camera's distance and height (Settings → Camera distance: near, medium, far)
  setFollowDistance(d) { this.chDist = CH_DIST[d] ?? CH_DIST.medium; }
  setMode(m) { this.mode = m === 'free' || m === 'follow' ? m : 'lba'; this.lba.init = false; if (this.fr) this.fr.init = false; if (this.ch) this.ch.init = false; }
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
    { const W = this.why; W.follow = W.box = W.swing = W.rise = W.lift = W.keep = W.dist = W.auto = W.user = W.occ = W.ground = 0; W.swingBy = ''; W.snap = !!snap; W.mode = this.override ? 'override' : this.iso ? 'iso' : this.mode === 'lba' ? (this.cut ? 'cuts' : 'lba') : this.mode; }
    if (this.override) {
      if (snap) { cam.position.copy(this.override.pos); this.look.copy(this.override.look); }
      cam.position.lerp(this.override.pos, 1 - Math.exp(-dt * 2));
      this.look.lerp(this.override.look, 1 - Math.exp(-dt * 3));
      if (!this.iso) this._keepOut(cam.position, this.look);   // (BUG-WALL: a scripted shot, and the way to it, outdoors)
      cam.lookAt(this.look);
      this.lba.init = false;
      if (this.ch) this.ch.init = false;
      this.base.copy(cam.position);
      return;
    }
    if (this.iso) this._iso(dt, focus);
    else if (this.mode === 'lba') this._lba(dt, focus, heroAngle);
    else if (this.mode === 'follow') this._chase(dt, focus, heroAngle, input, snap);
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

  // CAM-FOLLOW: is p within `gap` of anything solid? (a collider — a house by its scenery volume —, a scenery volume,
  // closer than 0.3 m + gap over the terrain)
  _solidAt(p, gap = 0) {
    const P = this.physics, occ = this.occ?.(), T = this.terrain;
    if (T && T.heightAt(p.x, p.z) > p.y - 0.3 - gap) return true;
    if (P) {
      _seen.clear();
      for (const [dx, dz] of GAP4) for (const c of P.near(p.x + dx * gap, p.z + dz * gap)) {
        if (_seen.has(c)) continue;
        _seen.add(c);
        if (c.enabled && !(c.camSkip && occ) && p.y < c.top + gap && p.y > c.bottom - gap && P._inside(c, p.x, p.z, gap)) return true;
      }
    }
    // (the volumes; the pipeline's tube too, with CH_PIPE more for its stays and saddles — the sight line passes through
    // that one, the camera never stands in it)
    if (occ) for (const [g, pipe] of [[gap, false], [gap + CH_PIPE, true]]) for (const [dx, dy, dz] of GAP11) {
      const x = p.x + dx * g, y = p.y + dy * g, z = p.z + dz * g;
      for (const v of occ.near(x, z)) if ((!pipe || v.camOnly) && y >= v.y0 && y <= v.top && y <= occ.topAt(v, x, z)) return true;
    }
    return false;
  }

  // CAM-FOLLOW: is p over a house's roof — over a scenery volume's footprint by more than CH_RIM all round (grazing an
  // eave's rim by inches, the way a camera running along a house does, is not over it)? In a tight spot the camera
  // stays down by him rather than up over the roof
  _overRoof(p) {
    const occ = this.occ?.();
    if (occ) for (const v of occ.near(p.x, p.z)) {
      if (v.camOnly) continue;
      let over = true;
      for (const [dx, dz] of RIM5) { const t = occ.topAt(v, p.x + dx * CH_RIM, p.z + dz * CH_RIM); if (!(t > -Infinity && p.y > t)) { over = false; break; } }
      if (over) return true;
    }
    return false;
  }

  // CAM-FOLLOW: does a camera at p see his head or his chest? (nothing on the line: the terrain, a wall, a cliff, a
  // big rock, a scenery volume — not a post, a rail or a tree's crown, which he shows between)
  _sees(p, hero) {
    const P = this.physics, occ = this.occ?.(), T = this.terrain;
    const clear = (hy) => {
      const dx = hero.x - p.x, dy = hero.y + hy - p.y, dz = hero.z - p.z, n = Math.ceil(Math.hypot(dx, dy, dz) / 0.25);
      for (let i = 1; i < n - 1; i++) {
        const k = i / n, x = p.x + dx * k, y = p.y + dy * k, z = p.z + dz * k;
        if (T && T.heightAt(x, z) > y + 0.05) return false;
        if (P) for (const c of P.near(x, z)) {
          if (!c.enabled || c.seeThrough || c.fades || (c.camSkip && occ) || (c.type === 'cyl' && c.r < 1.5) || y >= c.top || y <= c.bottom) continue;
          if (P._inside(c, x, z, 0)) return false;
        }
        if (occ && occ.hit(x, y, z, NO_SKIP) > -Infinity) return false;
      }
      return true;
    };
    return clear(1.5) || clear(1.0);
  }

  // CAM-FOLLOW: how far a camera at (x, y, z) must rise to keep over the terrain round it (1.3 m straight under it,
  // 0.8 m at CLEAR_R: a cliff's face and the rocks set in its rim) and to keep the line to his pivot T 0.8 m over the ground
  // between; `hard`: only the least it may ever come to the ground (0.45 m under it, 0.35 m at HARD_R), held at once
  _groundNeed(x, y, z, T, hard = false) {
    const H = this.terrain;
    if (!H) return 0;
    let need = H.heightAt(x, z) + (hard ? 0.45 : 1.3) - y;
    for (const [r, dx, dz] of RING) { if (hard && r > HARD_R) break; const n = H.heightAt(x + dx, z + dz) + (hard ? lerp(0.45, 0.35, r / HARD_R) : lerp(1.3, 0.8, r / CLEAR_R)) - y; if (n > need) need = n; }
    if (hard) return Math.max(0, need);
    for (let k = 0.3; k <= 1.0001; k += 0.35) {
      const n = (H.heightAt(T.x + (x - T.x) * k, T.z + (z - T.z) * k) + 0.8 - (T.y + CH_PIVOT + (y - T.y - CH_PIVOT) * k)) / k;
      if (n > need) need = n;
    }
    return Math.max(0, need);
  }

  // CAM-FOLLOW: the chase camera behind his back (see the header and CH_*)
  _chase(dt, hero, heroAngle, input, snap) {
    const cam = this.cam, P = this.physics, W = this.why, C = (this.ch ??= { init: false });
    dt = Math.max(dt, 1e-4);
    // the ground under him (a jump doesn't lift the view; falling further than a jump, it follows him down)
    const gy = Math.max(P ? P.groundAt(hero.x, hero.z, hero.y + 0.3) : hero.y, hero.y - 2.5);
    const tp = this.lockOn?.(), lockD = tp ? Math.hypot(tp.x - hero.x, tp.z - hero.z) : 0, lock = tp && lockD > 0.5;
    // where the view wants to look from: behind his back, or behind his shoulder on the line from the target
    const facing = () => (lock ? Math.atan2(hero.x - tp.x, hero.z - tp.z) + CH_SHOULDER : heroAngle + Math.PI);
    const fresh = snap || !C.init;
    if (fresh) {
      Object.assign(C, { init: true, yaw: facing(), vyaw: 0, goal: facing(), h: gy, vh: 0, band: gy, hold: false, arm: null, armV: 0, clearT: 0, lift: 0, vlift: 0, pv: null });
      cam.fov = CH_FOV;
    }
    // the heading: his facing (a small steering correction inside CH_DEAD_YAW moves nothing) through the spring;
    // camera-relative controls pushed back (toward the camera) hold it
    {
      const y0 = C.yaw;
      if (!lock) {
        const rel = typeof this.relative === 'function' ? this.relative() : this.relative, mv = rel && input?.move ? input.move() : null;
        const push = mv && Math.hypot(mv.x, mv.y) > 0.3, back = push && Math.abs(Math.atan2(mv.x, mv.y)) > CH_BACK;
        if (back) C.hold = true;
        else if (C.hold && (!rel || (push && Math.abs(angleDiff(C.yaw, heroAngle + Math.PI)) < CH_HOLD_OUT))) C.hold = false;
      } else C.hold = false;
      // (his facing held steady for CH_STEADY s: right behind him)
      const f = facing(), e = angleDiff(C.goal, f);
      C.steadyT = C.fPrev != null && Math.abs(angleDiff(C.fPrev, f)) < 0.002 ? (C.steadyT || 0) + dt : 0; C.fPrev = f;
      if (lock || C.steadyT > CH_STEADY) C.goal = f; else if (Math.abs(e) > CH_DEAD_YAW) C.goal += e - Math.sign(e) * CH_DEAD_YAW;
      if (C.hold) { C.vyaw *= Math.exp(-CH_W * dt); C.yaw += C.vyaw * dt; C.goal = C.yaw; }
      else if (!fresh) {
        C.y = C.yaw; C.vy = C.vyaw;
        // (the arm still far out from where it must come in to: the view turns no faster than it can come in — never a
        // swing into the wall of a house it is passing)
        const vmax = CH_VMAX * clamp(1 - ((C.arm ?? 0) - (C.want ?? 0)) / CH_LAG, 0.2, 1);
        spring(C, 'y', C.yaw + angleDiff(C.yaw, C.goal), CH_W, dt);
        C.vyaw = clamp(C.vy, -vmax, vmax);
        C.yaw += clamp(C.y - C.yaw, -vmax * dt, vmax * dt);
      }
      W.swing = angleDiff(y0, C.yaw); W.swingBy = C.hold ? 'hold' : lock ? 'lock' : 'chase';
    }
    const yaw = (this.yaw = C.yaw), sy = Math.sin(yaw), cy = Math.cos(yaw);
    // the pivot's height: a dead band (a kerb, a step), then its spring (stairs and slopes glide)
    {
      const h0 = C.h;
      C.band = clamp(C.band, gy - CH_DEAD, gy + CH_DEAD);
      if (!fresh) spring(C, 'h', C.band, CH_HW, dt);
      W.follow = Math.abs(C.h - h0);
    }
    const T = (C.T ??= new THREE.Vector3()).set(hero.x, C.h, hero.z);
    // the spring arm: the line from his pivot out to the camera (and a little past it) cut by a wall, a cliff or the
    // scenery draws it in, quickly; out again slowly once the way has stayed clear. Drawn in, the view tilts up.
    const { arm: CH_ARM, pitch: CH_PITCH } = this.chDist ?? CH_DIST.medium;
    const full = CH_ARM + (lock ? Math.min(CH_LOCK_ARM_MAX, lockD * CH_LOCK_ARM) : 0), a0 = C.arm ?? full;
    // (the tilt as it comes in keeps the camera's height about level near the full arm: an arm drawn in a little by a
    // passing house neither bobs nor nods the view much)
    const pitchAt = (arm) => CH_PITCH + CH_UP * clamp((CH_ARM - arm) / (CH_ARM - CH_SHORT), 0, 1) + CH_UP2 * clamp((CH_SHORT - arm) / (CH_SHORT - CH_MIN), 0, 1);
    const at = (out, yw, a, O = T, q = pitchAt(a)) => { const h = Math.cos(q) * a; return out.set(O.x + Math.sin(yw) * h, O.y + CH_PIVOT + Math.sin(q) * a, O.z + Math.cos(yw) * h); };
    // the longest arm along heading yw whose camera — over the ground as it will be — keeps CH_GAP from everything
    // solid and sees him; none keeps clear: a tight spot, the least margins (CH_NEAR, the ground's least); none there
    // either (his back to a wall): over his head, looking down (CH_OVER_*); nor that: the longest that keeps clear, or
    // the walls' cut (the silhouette shows him) → [arm, sees, tier: 0 comfortable, 1 tight, 2 over his head]
    const armFor = (yw, T) => {
      const p = pitchAt(a0), cut = Math.min(full, this.occluded(T, Math.cos(p), Math.sin(p), yw, full + 0.6, true, true));
      _v.set(T.x, hero.y + T.y - C.h, T.z);
      // (each tier's longest arm that sees him, else its longest clear one; the comfortable tier wins unless the tight
      // one's arm is CH_TIER_PREF longer: running along a house's eaves, 5 m out and 0.2 m from them beats 1.6 m
      // under them — and the arm then shortens by inches as he goes, not by 5 m at once)
      const best = [];
      for (const tight of [false, true]) {
        let free = null, seen = null;
        for (let a = cut; ; a = Math.max(CH_MIN, a - 0.25)) {
          at(_b, yw, a, T); _b.y += this._groundNeed(_b.x, _b.y, _b.z, T, tight);
          if (!this._solidAt(_b, tight ? CH_NEAR : CH_GAP) && !(tight && this._overRoof(_b))) { free ??= a; if (this._sees(_b, _v)) { seen = a; break; } }
          if (a <= CH_MIN) break;
        }
        best.push(seen != null ? [seen, true, tight ? 1 : 0] : free != null ? [free, false, tight ? 1 : 0] : null);
      }
      const [b0, b1] = best;
      if (b0 && (!b1 || (b0[1] >= b1[1] && b0[0] >= b1[0] - CH_TIER_PREF))) return b0;
      if (b1) return b1;
      // (over his head: the least tilt up from CH_OVER_P[0] that stands clear and sees him)
      let clearQ = null;
      for (const q of CH_OVER_P) { at(_b, yw, CH_OVER_ARM, T, q); _b.y += this._groundNeed(_b.x, _b.y, _b.z, T, true); if (!this._solidAt(_b, CH_NEAR) && !this._overRoof(_b)) { clearQ ??= q; if (this._sees(_b, _v)) return [CH_MIN, true, 2, q]; } }
      if (clearQ != null) return [CH_MIN, false, 2, clearQ];   // (none sees him: the least tilt that stands clear; the silhouette)
      return [cut, false, 1];
    };
    {
      // (also where it will be CH_LEAD s on, turning and walking: a swing toward a wall, a walk past a corner start
      // drawing it in before the wall is between them)
      let [want, , tier, overQ] = armFor(yaw, T); const over = tier === 2;
      if (over) C.overQ = fresh || !(C.overK > 0) ? overQ : damp(C.overQ, overQ, 6, dt);
      if (!fresh && C.pT) {
        const vx = (T.x - C.pT.x) / dt, vz = (T.z - C.pT.z) / dt, turn = Math.abs(C.vyaw) > 0.3, walk = Math.hypot(vx, vz) > 0.5 && Math.hypot(vx, vz) < 20;
        if (turn || walk) for (const t of CH_LEAD) want = Math.min(want, armFor(yaw + C.vyaw * t, _c.set(T.x + (walk ? vx * t : 0), T.y, T.z + (walk ? vz * t : 0)))[0]);
        // (and at the heading its spring is on its way to: a turn toward a house starts drawing it in at the turn's start)
        const g = C.hold ? yaw : C.goal, gd = angleDiff(yaw, g);
        if (Math.abs(gd) > 0.05) { want = Math.min(want, armFor(g, T)[0]); if (Math.abs(gd) > 0.6) want = Math.min(want, armFor(yaw + gd / 2, T)[0]); }
      }
      (C.pT ??= new THREE.Vector3()).copy(T);
      // (a cut in of more than CH_FLICK m must hold CH_CONFIRM s: walking along a house's eaves the sight line grazes
      // their rim and the search drops to the shortest arm for a frame, then back — that pumped the view in and out; a
      // real wall stays, and the camera never stands in anything meanwhile, below)
      if (!fresh && C.arm != null && want < C.arm - CH_FLICK) { C.lowT = (C.lowT || 0) + dt; if (C.lowT < CH_CONFIRM) want = C.arm - CH_FLICK; } else C.lowT = 0;
      // (letting out, only as far as the way out is clear: never out through a tree's trunk to the clear spot beyond)
      if (!fresh && C.arm != null && want > C.arm) for (let a = C.arm + 0.1; a < want + 0.1; a += 0.1) {
        at(_b, yaw, Math.min(a, want)); _b.y += this._groundNeed(_b.x, _b.y, _b.z, T, tier > 0);
        if (this._solidAt(_b, tier > 0 ? CH_NEAR : CH_GAP)) { want = Math.max(C.arm, a - 0.1); break; }
      }
      // (over his head: in and out of it eased, CH_OVER_RATE)
      // (in only once over his head has been wanted CH_OVER_T s, or at once when he is out of sight from where it stands: a
      // step past a corner of the eaves doesn't bob it up and down)
      C.overT = over ? (C.overT || 0) + dt : 0;
      const goOver = over && (C.overT >= CH_OVER_T || C.overK > 0 || !this._sees(cam.position, hero));
      C.overK = fresh ? (over ? 1 : 0) : clamp((C.overK || 0) + (goOver ? 1 : -1) * CH_OVER_RATE * dt, 0, 1);
      if (fresh || C.arm == null) { C.arm = want; C.armV = 0; }
      else if (want < C.arm - 0.005) {
        // in: quickly (≤ CH_IN_V), eased in and out (CH_IN_A: it can always stop on the arm it wants, never past it)
        C.clearT = 0;
        const vw = -Math.min(CH_IN_V, Math.sqrt(2 * CH_IN_A * (C.arm - want)));
        C.armV += clamp(vw - C.armV, -CH_IN_A * dt, CH_IN_A * dt);
        C.arm = Math.max(want, C.arm + Math.min(0, C.armV) * dt);
        if (C.arm === want) C.armV = 0;
      } else if (want > C.arm + 0.05 && (C.clearT += dt) > CH_HOLD) {
        // out: only once the way has stayed clear CH_HOLD s, slowly and eased (no pumping in and out past a corner)
        const e = want - C.arm, vw = Math.min(CH_OUT_V, Math.sqrt(1.6 * CH_OUT_A * e));
        C.armV += clamp(vw - C.armV, -CH_OUT_A * dt, CH_OUT_A * dt);
        C.arm = Math.min(want, C.arm + Math.max(0, C.armV) * dt);
      } else { C.armV = C.armV > 0 ? Math.max(0, C.armV - CH_OUT_A * dt) : Math.min(0, C.armV + CH_IN_A * dt); if (want <= C.arm + 0.05) C.clearT = 0; }
      W.occ = C.arm - a0; C.want = want; C.tight = tier > 0;
    }
    // (over his head: the tilt first, then the arm — out of it the arm first: the way between never crosses the eaves)
    const so = smoothstep(0, 0.6, C.overK), sa = smoothstep(0.4, 1, C.overK), arm = (this.dist = lerp(C.arm, CH_OVER_ARM, sa));
    const pitch = (this.pitch = lerp(pitchAt(C.arm), C.overQ ?? CH_OVER_P[0], so));
    if (!fresh) cam.fov = damp(cam.fov, CH_FOV, 3, dt);
    cam.updateProjectionMatrix();
    const { x, y, z } = at(_a, yaw, arm, T, pitch);
    // where it looks (from his pivot, eased at CH_LOOK_W: a lock taken or let go, the arm cut in, never turn the view in
    // a frame): ahead of him along the view — less far and higher, at his chest, as the arm comes in (over his head:
    // at him) —, or part of the way to the target
    {
      const L = (C.lo ??= new THREE.Vector3());
      if (lock) { const k = Math.min(CH_LOCK_MAX, lockD * CH_LOCK_K) / lockD; _c.set((tp.x - T.x) * k, CH_LOOK + 0.3, (tp.z - T.z) * k); }
      else { const u = clamp((C.arm - CH_MIN) / (CH_ARM - CH_MIN), 0, 1) * (1 - so), k = lerp(0.5, CH_AHEAD, u) * (1 - so); _c.set(-sy * k, lerp(1.0, CH_LOOK, u), -cy * k); }
      if (fresh) L.copy(_c); else L.lerp(_c, 1 - Math.exp(-CH_LOOK_W * dt));
      this.look.copy(T).add(L);
    }
    // over the ground round it and between it and him, eased as the other views do (up quickly, down gently, looking
    // down its own way)
    // (in a tight spot only the ground's least: the comfortable lift would take it up into the eaves it is under; looking
    // ahead down its own way no further than CH_LIFT_AHEAD s: swinging round him, a straight line further out reads
    // ground it never reaches and bobs it up and down)
    let need = this._groundNeed(x, y, z, T, C.tight);
    if (C.pv && !fresh) {
      const vx = (x - C.pv.x) / dt, vy = (y - C.pv.y) / dt, vz = (z - C.pv.z) / dt;
      if (Math.hypot(vx, vz) > 0.5 && Math.hypot(vx, vz) < 60) for (const t of LIFT_AHEAD) { if (t > CH_LIFT_AHEAD) break; const n = this._groundNeed(x + vx * t, y + vy * t, z + vz * t, T, C.tight); if (n > 0) need = Math.max(need, n + vy * t); }
    }
    C.pv = { x, y, z };
    const l0 = C.lift;
    this._ease(C, need, dt);
    if (fresh) { C.lift = need; C.vlift = 0; }
    { const hard = this._groundNeed(x, y, z, T, true); if (hard > C.lift) { C.lift = hard; C.vlift = Math.max(0, C.vlift); } }   // (the least, at once)
    W.ground = C.lift - l0;
    cam.position.set(x, y + C.lift, z);
    // never in anything: in, along the line to him, as far as it takes (a tree's trunk the view swung into, a corner the
    // arm was still on its way in to)
    // (closer than CH_MIN, to CH_CLOSE: pressed into a corner it stands over his shoulder rather than lifted over the eaves;
    // only within CH_INSIDE of a surface — the arm search keeps CH_NEAR, so grazing an eave's rim by an inch as he walks
    // along a house doesn't cut it in by metres)
    if (so === 0 && this._solidAt(cam.position, CH_INSIDE)) {
      for (let a = C.arm - 0.1; a >= CH_CLOSE - 1e-6; a -= 0.1) {
        at(_b, yaw, a); const n = this._groundNeed(_b.x, _b.y, _b.z, T, true); _b.y += n;
        if (this._solidAt(_b, CH_INSIDE)) continue;
        cam.position.copy(_b); C.arm = this.dist = a; C.armV = 0; this.pitch = pitchAt(a); C.lift = n; C.vlift = 0; W.keep = 1;
        break;
      }
    }
    // (nowhere clear at all — pressed into a corner under a roof: BUG-WALL's least margins, as the other views)
    if (this._solidAt(cam.position, 0)) this._keepOut(cam.position, this.look, 0, 0.4, HARD);
    // (drawn in and lifted over a slope or a terrace beside him, it would look down steeply on him: it looks further
    // along its way instead, no steeper than CH_EL_MAX — or as little more as keeps his chest CH_EL_KEEP inside the
    // frame's lower edge)
    if (!lock) {
      const c = cam.position, dh = Math.hypot(this.look.x - c.x, this.look.z - c.z), dv = c.y - this.look.y;
      const hh = Math.hypot(hero.x - c.x, hero.z - c.z), heroEl = Math.atan2(c.y - (hero.y + 1.0), Math.max(hh, 0.05));
      const elMax = Math.max(CH_EL_MAX, heroEl - (cam.fov * Math.PI) / 360 + CH_EL_KEEP), el = Math.atan2(dv, dh);
      // (the cap itself eased: the camera passing close over him moves it, never the view in a frame)
      const want = Math.min(el, elMax);
      C.el = fresh || C.el == null ? want : damp(C.el, want, CH_EL_W, dt);
      if (dv > 0 && el > C.el && dh > 1e-3) { const k = dv / Math.tan(C.el) / dh; this.look.x = c.x + (this.look.x - c.x) * k; this.look.z = c.z + (this.look.z - c.z) * k; }   // (further along the same way)
    } else C.el = null;
    cam.lookAt(this.look);
    this.target.copy(hero);
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
