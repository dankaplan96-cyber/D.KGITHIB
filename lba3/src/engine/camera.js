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
// CAM-CLEAR-2 (AUDIT-CH12): before the arm comes in, the view swings round him (up to 70°, 90° with a shorter arm) or
// rises over a low wall or dips under an arch to a clear view, the cheapest first (see CH_SW_*); a door starts it there;
// the ground's lift stops at CH_RIM_EL (no 24 m rise over a cliff's rim); in a dialogue it frames him and whoever talks
// with him (a two-shot, eased in and out: _talkShot).
// CAM-KEYWALK (the user on Follow, Medium, walking Citadel with the keyboard: "the camera zooms in on Twinsen", "the camera
// lost balance and is not behind Twinsen"; tests/camcitadel.mjs): walking a steady way the view keeps to his back while
// that still gives CH_WALK_KEEP m of arm that sees him, and a swing taken comes back as he walks; with his back blocked
// at the base tilt the arm is first risen over what stands behind him at a longer length (CH_HIGH_*) before MIN-VIEW's
// over his head, and over his head it goes higher at longer arms (CH_OVER_HI) before the shorter one; the look-ahead
// draws the arm in no shorter than MIN-VIEW (a turn on the spot by the hostel's portico came in to 0.9-1.5 m). Under an
// arch (the station gate's passage, 2.2 m high) the view dips before he runs in (CH_PREDIP), a dip keeps the whole arm's
// low tilt at any length and lets out under the arch with the least margin: it stayed 1.0 m at his back there.
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
// long at its pitch (Settings → Camera distance; the user: "too close and too low" → Medium, a step out and up, then Far fits best: the default), with a CH_FOV° lens; it looks CH_AHEAD m ahead of him, CH_LOOK m up (eased at CH_LOOK_W 1/s). The heading
// follows his facing (a steering correction within CH_DEAD_YAW moves nothing until his facing has held CH_STEADY s)
// through a spring (CH_W 1/s: within 15° of a 90° turn in 0.25 s, settled in ~0.45 s) that never turns faster than
// CH_VMAX (4°/frame at 60 fps, 8° at 30). The pivot's height keeps a dead band of CH_DEAD m, then its own spring (CH_HW).
// Camera-relative controls: a push more than CH_BACK off the view's forward holds the heading; it is let go when the
// stick goes another way and he faces less than CH_HOLD_OUT from the view's own way, or once the stick has been let go
// CH_HOLD_IDLE s (CAM-STAIRS).
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
// ISO-CLOSE: the most a room's fixed view shows (its height in metres) at each Camera distance; a room built wider (the
// asylum and the Bu halls at 24) is shown at this and the view follows him more (the user, 3.11: "Twinsen is tiny
// against the map, zoom in"). A room marked `wide` (a fight that needs the whole arena) keeps its own.
const ISO_MAX = { near: 11, medium: 12.5, far: 14 };
const CH_PIVOT = 1.4, CH_AHEAD = 1.2, CH_LOOK = 0.8, CH_FOV = 50, CH_W = 11, CH_VMAX = (240 * Math.PI) / 180, CH_DEAD_YAW = (3 * Math.PI) / 180, CH_STEADY = 0.3;
const CH_DEAD = 0.25, CH_HW = 4, CH_BACK = (110 * Math.PI) / 180, CH_HOLD_OUT = (95 * Math.PI) / 180;
const CH_EL_MAX = (46 * Math.PI) / 180, CH_EL_KEEP = (4 * Math.PI) / 180, CH_EL_W = 6, CH_GAP = 0.4, CH_NEAR = 0.15, CH_INSIDE = 0.05, CH_RIM = 0.5, CH_FLICK = 0.3, CH_CONFIRM = 0.06, CH_TIER_PREF = 1.5, CH_PIPE = 0.35, CH_MIN = 1.6, CH_CLOSE = 0.7, CH_OVER_ARM = 2.4, CH_OVER_P = [0.8, 0.9, 1.0, 1.15, 1.3, 1.45], CH_OVER_RATE = 4, CH_OVER_T = 0.3, CH_LIFT_AHEAD = 0.5, CH_LEAD = [0.2, 0.45], CH_LAG = 4, CH_IN_V = 25, CH_IN_A = 200, CH_HOLD = 0.6, CH_OUT_V = 2.5, CH_OUT_A = 5, CH_UP = 0.3, CH_SHORT = 2.5, CH_UP2 = 0.1, CH_PITCH_SHORT = 0.82, CH_LIFT_HOLD = 0.5, CH_LOOK_W = 8;
// A lock-on: behind his shoulder (CH_SHOULDER rad round from the line target → him), looking at a point CH_LOCK_K of the
// way to the target (at most CH_LOCK_MAX m), the arm longer by CH_LOCK_ARM of the distance (at most CH_LOCK_ARM_MAX m).
// MIN-VIEW (the user, 4.11, on Medium: "the camera so close that Twinsen's back fills the screen against a house
// window"): the arm keeps at least CH_MIN_VIEW m from his pivot. With his back to a wall it rises over his head at
// that length (CH_OVER_ARMS, the longer first) rather than coming in to his shoulder; something left between it and him
// there is seen through by the silhouette pass. A spot in something solid is first left by tilting up (CH_RISE_Q),
// at its length; drawn in shorter than CH_MIN_VIEW only where nothing else stands clear (under a low roof).
// (CAM-WALKSWING: the tilt up as far as the steepest over his head, CH_OVER_P's last: short of it, on the old mill's
// stair-stones, nothing was clear and the arm was cut in along its line to 1.1 m)
const CH_MIN_VIEW = 3.2, CH_OVER_ARMS = [3.2, 2.4], CH_RISE_Q = 1.45;
// CAM-KEYWALK: the risen longer arm before MIN-VIEW's over his head (armFor's `high`), and over his head higher still where
// that is not clear (something taller than it right behind him)
const CH_HIGH_ARMS = [6.5, 5.5, 4.6, 3.9], CH_HIGH_P = [0.62, 0.75, 0.88, 1.0, 1.12], CH_OVER_HI = [4.4, 5.6], CH_OVER_HI_P = [1.2, 1.32, 1.45, 1.52];
const CH_HIGH_ROOF_Q = 0.88;
const CH_OVER_SEE = [0.1, 0.2, 0.35, 0.5, 0.75, 1];   // (CAM-OVERSIGHT: the steps along the way over his head, see _chase)
// CAM-KEYWALK: the pad off a tall box's sides near its top (m: pad, the band under the top, how tall over the ground)
const CH_CAP_PAD = 0.5, CH_CAP_BAND = 1.8, CH_CAP_TALL = 3.5, CH_CAP_UP = 0.45;
const CH_OVER_SET = [[CH_OVER_ARMS[0], CH_OVER_P], ...CH_OVER_HI.map((a) => [a, CH_OVER_HI_P]), ...CH_OVER_ARMS.slice(1).map((a) => [a, CH_OVER_P])];
// (the lead's look-ahead turn at most CH_LEAD_YAW rad: a quick turn's spring speed times CH_LEAD s read headings well past
// where the view ever goes; its pivot risen with the ground ahead, at most CH_LEAD_RISE m a metre: CAM-STAIRS)
const CH_LEAD_YAW = 0.42, CH_LEAD_RISE = 1.0;
// NEAR-CUT (with MIN-VIEW): following him, nothing within CH_NEAR_CUT m of the lens is drawn — the edge of an eave, a
// branch or a post the camera stands just behind is cut away instead of filling the frame — while he stands at least
// CH_NEAR_KEEP m beyond the cut (it shrinks back to the camera's own near plane as the arm comes in). Every other view
// (rooms, scripted shots, cinematics, the story's reveal beats) keeps the camera's own near plane.
const CH_NEAR_CUT = 1.0, CH_NEAR_KEEP = 2.0;
const CH_SHOULDER = 0.22, CH_LOCK_K = 0.45, CH_LOCK_MAX = 4, CH_LOCK_ARM = 0.3, CH_LOCK_ARM_MAX = 3;
// CAM-CLEAR-2 (AUDIT-CH12 #1, #2, #12-#15: at Far the Follow camera collapsed to a few metres in the fort yard, at the
// station gate and the beam pad, out of the house door and in the lane by the Bug house; rose ~24 m at the foot of the
// Whispering Cliffs; stood behind the depot's pipe). Before the arm is drawn in, the view looks round him for a clear
// one: its heading swung off his back (CH_SW_STEP at a time, up to CH_SW_MAX either way), its tilt risen over a low
// wall or a fence (CH_RISE, never past CH_RISE_TOP; only over what stands less than CH_LOW_WALL over his feet, never
// over a house's roof) or dipped under a low arch (a gate's passage: the negative ones, never under CH_DIP_MIN); at the
// full arm, then at CH_FRAC of it (the shorter ones may swing to CH_SW_FAR: along a passage he stands across). It takes
// the cheapest that stands CH_GAP clear of everything and sees him over the ground by CH_SIGHT_G with no face rising
// within CH_SIGHT_R beside the line (a cliff's rocks stand out of the slope it is cut from). The cost: CH_K_SW per
// radian of swing, CH_K_RISE per radian of rise or dip, CH_K_ARM per part of the arm given up (any swing to CH_SW_MAX
// costs less than a quarter of the arm), CH_K_PIPE when a pipe crosses the line to his feet, CH_K_CLUT for each of the
// lines CH_CLUT beside and over him that is cut (a roof filling half the frame next to him).
// It searches once he has stood with his back blocked CH_SW_DELAY s (walking past a tree's trunk or a house's corner,
// or up to a door, the arm comes in as before: a swing out and back as he passed turned the view against his own
// turns), every CH_SEARCH_T
// s, CH_SEARCH_N candidates a frame at most (a search may take a few frames); while he turns on the spot a merely
// cluttered view waits for the turn to end. A choice is kept unless another is CH_K_KEEP cheaper; back to his back once
// that has stayed clear CH_SW_HOLD s, and then not swung out again for CH_SW_COOL s unless his back is blocked outright
// and the arm would come in past CH_COOL_ARM of it (a swing out, back and out again turned the view three ways). The swing is eased (CH_SW_V, CH_SW_A) and the view's whole turn stays within
// CH_VMAX; a new shot not at a door starts from it at once and holds it CH_FRESH_HOLD s. CAM-DOORS (the user on Follow:
// "the camera doesn't always lock when I go from room to room"): a scene change — a door, an exit, a load — starts
// right behind his back and keeps there, no swing round him, until he has been CH_DOOR_T s in the new scene and is
// CH_DOOR_R m from where he came in (out of a house the camera stood 60-80° off his back, the house behind him, and
// held there 1.5 s while he walked away); the arm comes in as it must meanwhile, over his shoulder at the doorstep. Drawn in close behind a post (a gantry's leg in the fort yard)
// with the arm it wants clear beyond it, it used to stay there: the swing side-steps the post (CH_SIDE), held while the
// arm lets out past it to CH_SIDE_OUT m (at most CH_SIDE_HOLD s).
// The ground's lift stands the camera no steeper than CH_RIM_EL over his pivot: over a cliff's rim the arm comes in
// instead (the search swings it along the foot first). Only when nothing round him is clear does the arm come in to
// its least and look down over his shoulder (CH_OVER_*, as before).
const CH_SW_STEP = (10 * Math.PI) / 180, CH_SW_MAX = (70 * Math.PI) / 180, CH_SW_FAR = (90 * Math.PI) / 180, CH_RISE = [0, 0.12, 0.24, 0.36, -0.25, -0.45], CH_RISE_TOP = 0.86, CH_DIP_MIN = 0.06, CH_FRAC = [1, 0.8, 0.6, 0.42], CH_SIGHT_G = 0.45, CH_SIGHT_R = 0.7, CH_LOW_WALL = 2.4;
const CH_K_SW = 1 / CH_SW_MAX, CH_K_RISE = 0.5 / 0.36, CH_K_ARM = 4.4, CH_K_PIPE = 0.6, CH_K_KEEP = 0.2, CH_K_CLUT = 0.15, CH_SEARCH_T = 0.15, CH_SEARCH_N = 24, CH_SW_HOLD = 1.2, CH_SW_DELAY = 0.4, CH_SW_COOL = 3, CH_COOL_ARM = 0.5;
const CH_HOLD_IDLE = 1.0, CH_SW_SETTLE = 0.3;
// CAM-RECOVER: the quicker let-out to the whole arm (see the arm's let-out in _chase)
const CH_QUICK_GAP = 1.5, CH_QUICK_NEAR = 1.5, CH_QUICK_HOLD = 0.25, CH_QUICK_V = 7, CH_QUICK_A = 10, CH_QUICK_PUMP = 3;
// CAM-WALKSWING: the search while he walks (see _chaseClear)
const CH_WALK_CUT = 0.6, CH_WALK_T = 0.5, CH_WALK_T0 = 0.2, CH_TURN_SRCH = 0.15, CH_TURN_V = 0.6, CH_DOOR_STAY = 1.2, CH_SW_MIN = 0.8;
// CAM-KEYWALK: walking, his back kept while it gives this much arm (m) that sees him, for this long (s) before a swing is let go
const CH_WALK_KEEP = 4.5, CH_WALK_KEEP_T = 0.15, CH_WALK_HOLD = 3.5, CH_WALK_GRACE = 0.4, CH_WALK_SW = (45 * Math.PI) / 180;   // (and the most a swing may take meanwhile)
const CH_SIDE = [0.17, 0.35, 0.52], CH_STUCK_T = 0.3, CH_SIDE_HOLD = 4, CH_SIDE_OUT = 5, CH_FRESH_HOLD = 1.5, CH_SW_STILL = 0.3, CH_DOOR_T = 1.0, CH_DOOR_R = 3, CH_DOOR_OUT_V = 7, CH_DOOR_OUT_A = 18, CH_DOOR_OUT_T = 3;
const CH_CLUT = [[1.1, 1.0], [-1.1, 1.0], [2.6, 0.7], [-2.6, 0.7], [0, 2.4]];
// G1-CAM: after the arm is cut in out of something (the camera dropped under an eave with it) the view's tilt eases for
// CH_KEEP_EASE s instead of flattening in the frame, its look-at point drawn no nearer than CH_KEEP_K of the way
const CH_KEEP_EASE = 0.3, CH_KEEP_K = 0.4;
const CH_SW_V = (70 * Math.PI) / 180, CH_SW_A = (160 * Math.PI) / 180, CH_RISE_V = 0.35, CH_RIM_EL = 0.96, CH_DIP_V = 1.0, CH_DIP_A = 5, CH_PREDIP = -0.25;
// the candidates, cheapest first: [swing, rise, cost]; at the full arm and 0.8 of it every swing to CH_SW_MAX; shorter, a
// coarser set to CH_SW_FAR (every other swing, a rise and the dips)
const CH_CANDS = (() => {
  const all = [], K = Math.round(CH_SW_FAR / CH_SW_STEP), K0 = Math.round(CH_SW_MAX / CH_SW_STEP);
  for (let k = -K; k <= K; k++) for (const r of CH_RISE) all.push([k * CH_SW_STEP, r, Math.abs(k) * CH_SW_STEP * CH_K_SW + Math.abs(r) * CH_K_RISE + (k < 0 ? 1e-4 : 0), Math.abs(k)]);
  all.sort((a, b) => a[2] - b[2]);
  return [all.filter((c) => c[3] <= K0 && c[1] > -0.3), all.filter((c) => c[3] % 2 === 0 && (c[1] === 0 || c[1] === 0.24 || c[1] < 0))];
})();
// CAM-CLEAR-2, a dialogue under Follow (AUDIT-CH12 #13): Twinsen and whoever talks with him framed together, the camera
// beside his shoulder CH_TALK_ANG off the line between them (the side nearer the view first), CH_TALK_P up, far enough
// back that everyone stands inside CH_TALK_FIT of the frame, nobody in front of him (CH_TALK_SEP apart across it); into it and back out to the chase eased (CH_TALK_W, CH_TALK_IN s)
const CH_TALK_ANG = [0.75, 1.0, 0.55, 1.25, 0.35, 1.5], CH_TALK_P = 0.32, CH_TALK_FIT = 0.72, CH_TALK_W = 2.6, CH_TALK_IN = 1.1, CH_TALK_SEP = 0.22;
// G1-CAM: where none of those is clear, the search all round them: the arm's lengths (of the first one's), its tilts, and
// what a flaw costs (someone in front of him; a face behind a post, a rail or an arch's leg; a face hidden; the view
// crossing the line between him and them, which swaps who stands left and right)
const CH_TALK_K = [1, 1.3, 0.8, 1.65], CH_TALK_PS = [CH_TALK_P, 0.5], CH_TALK_K_SEP = 3, CH_TALK_K_PART = 4, CH_TALK_K_HID = 8, CH_TALK_K_LINE = 1.5, CH_TALK_CUT = (60 * Math.PI) / 180;
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
// ROCK FACES (the LBA view only): where the terrain beside the camera climbs more than CLIFF_CAP above it (Hamalayi's mountain
// wall: 3-20 m per metre, 30-70 m high), the view is not risen over — the eased lift (LIFT_V) cannot climb it, and the least
// margins popped it up the face 1.4 m a frame — but drawn in on its arm to CLIFF_A m (the first of the swing k) and then
// tipped up to CLIFF_P over the look-at point (the rest, overlapping: LBA2's forced camera looking down on him), by the least that
// stands it CLIFF_R m off the face. The swing's amount k (0..1) is eased (CLIFF_K_V /s, CLIFF_K_A /s²) toward the most it will need over the lift's
// own look-ahead, so it starts before the wall and slows into it as it slows out of it. The look-at point's own lead stops
// short of a face (CLIFF_R_F off it) too: it would stand in the rock the view is lifted from.
const CLIFF_CAP = 3, CLIFF_R = 2.2, CLIFF_R_F = 1.2, CLIFF_P = 1.5, CLIFF_A = 5.5, CLIFF_STEP = 0.1, CLIFF_K_V = 0.4, CLIFF_K_A = 0.3;
const FACE_DIRS = Array.from({ length: 12 }, (_, i) => [Math.sin((i * Math.PI) / 6), Math.cos((i * Math.PI) / 6)]);
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
const _seen = new Set(), _cells = [], NO_SKIP = new Set(), NONE_V = [];
// G1-CAM (cost): the scenery volumes by camera.js's own grid of VG m cells (numeric keys; occlude.js's near() builds a
// string key at every call, ~70 ns, and the Follow camera's sight lines read it at hundreds of samples a frame). Volumes
// are added once and never move, so the grid is built again only when the list grows. Any volume whose footprint holds
// a point is filed under that point's cell here as in occlude.js's grid: a test that needs the point inside the footprint
// reads the same answer from either.
const VG = 4, _vgrids = new WeakMap(), vkey = (i, j) => (i * 73856093) ^ (j * 19349663);
function vgrid(occ) {
  let G = _vgrids.get(occ);
  if (!G || G.n !== occ.list.length) {
    G = { n: occ.list.length, map: new Map() };
    for (const v of occ.list) {
      const R = v.kind === 'rev' ? v.R : Math.hypot(v.hw, v.hd);
      for (let i = Math.floor((v.x - R) / VG); i <= Math.floor((v.x + R) / VG); i++) for (let j = Math.floor((v.z - R) / VG); j <= Math.floor((v.z + R) / VG); j++) {
        const k = vkey(i, j);
        let a = G.map.get(k);
        if (!a) G.map.set(k, (a = []));
        if (!a.includes(v)) a.push(v);
      }
    }
    _vgrids.set(occ, G);
  }
  return G.map;
}
const vnear = (occ, x, z) => vgrid(occ).get(vkey(Math.floor(x / VG), Math.floor(z / VG))) || NONE_V;
// (how far (x, z) lies from the segment a → b, across the ground)
function segDist(x, z, ax, az, bx, bz) {
  const ux = bx - ax, uz = bz - az, L2 = ux * ux + uz * uz, t = L2 > 0 ? clamp(((x - ax) * ux + (z - az) * uz) / L2, 0, 1) : 0;
  return Math.hypot(x - ax - ux * t, z - az - uz * t);
}
const _segCols = [], _segVols = [], _segSeen = new Set();
const _pass = [[0, false], [0, true]], SOLID_PASS = (gap) => { _pass[0][0] = gap; _pass[1][0] = gap + CH_PIPE; return _pass; };
const RIM5 = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]], GAP4 = [[-1, -1], [1, -1], [-1, 1], [1, 1]], GAP11 = [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0], [0.7, 0, 0.7], [0.7, 0, -0.7], [-0.7, 0, 0.7], [-0.7, 0, -0.7]];

const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _cd = new THREE.Vector3(), _e = new THREE.Vector3(), _t = new THREE.Vector3();
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
    this.talk = null;      // () → the positions of those talking with him in a dialogue, or null: Follow frames them together (main.js)
    this.base = new THREE.Vector3();   // (CAM-2: where the camera stands before a shake's tremor; tests/lib/camrec.js)
    // CAM-2: what moved the view this frame (tests/camsteady.mjs reads it; a few numbers, always kept)
    this.why = { mode: '', follow: 0, box: 0, swing: 0, swingBy: '', rise: 0, lift: 0, keep: 0, dist: 0, auto: 0, user: 0, occ: 0, ground: 0, snap: false };
    this.lba = { init: false, focus: new THREE.Vector3(), goal: new THREE.Vector3(), yaw: 0, goalYaw: 0, goalPitch: 0, behind: false, view: 0, clear: true };
  }

  // CAM-FOLLOW: the Follow camera's distance and height (Settings → Camera distance: near, medium, far)
  setFollowDistance(d) { this.chDist = CH_DIST[d] ?? CH_DIST.medium; this.isoMax = ISO_MAX[d] ?? ISO_MAX.far; }
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
      const L = P.near(x, z);
      for (let ci = 0; ci < L.length; ci++) {
        const c = L[ci];
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
    this._fid = (this._fid || 0) + 1; this._busy = true;   // (G1-CAM: a frame's own answers, see _sees)
    try { this._update(dt, focus, heroAngle, moving, input, cam); } finally { this._busy = false; }
    this._lens(focus);
  }
  // NEAR-CUT: the near plane for this frame's view (see CH_NEAR_CUT)
  _lens(focus) {
    const cam = this.cam;
    this.near0 ??= cam.near;
    let n = this.near0;
    if (!this.cine && !this.override && !this.iso && this.mode === 'follow' && focus) {
      const d = Math.hypot(cam.position.x - focus.x, cam.position.y - (focus.y + 1.0), cam.position.z - focus.z);
      n = Math.max(this.near0, Math.min(CH_NEAR_CUT, d - CH_NEAR_KEEP));
    }
    if (Math.abs(cam.near - n) > 1e-4) { cam.near = n; cam.updateProjectionMatrix(); }
  }

  _update(dt, focus, heroAngle, moving, input, cam) {
    if (this._focus && focus.distanceToSquared(this._focus) > 16) this.snap();
    (this._focus ??= new THREE.Vector3()).copy(focus);
    // (CAM-2: a drag of the mouse or a finger with no free orbit to turn is let go, not kept for later: it used to pile
    // up through the LBA view, a room or a cutscene and swing the free orbit round all at once when it came back)
    if (input && !(this.mode === 'free' && !this.iso && !this.override && !this.cine)) input.camera(dt);
    if (this.cine) return; // a cinematic places the camera itself (src/engine/cinematic.js)
    const snap = this._snap;
    this._snap = false;
    { const W = this.why; W.follow = W.box = W.swing = W.rise = W.lift = W.keep = W.dist = W.auto = W.user = W.occ = W.ground = W.off = W.chase = W.talk = W.kb = 0; W.swingBy = ''; W.snap = !!snap; W.mode = this.override ? 'override' : this.iso ? 'iso' : this.mode === 'lba' ? (this.cut ? 'cuts' : 'lba') : this.mode; }
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
      L.last = { x: hero.x, z: hero.z }; L.vel = { x: 0, z: 0 }; L.lift = 0; L.vlift = 0; L.pv = null; L.fresh = true; L.pull = 0; L.yawV = 0; L.cp = { lift: 0, vlift: 0 };
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
    // (ROCK FACES: the aim point's lead stops short of a face, CLIFF_R_F m off it)
    let lk = 1;
    if (this.terrain && this._faceDist(hero.x + L.lead.x, hero.y + 1.5, hero.z + L.lead.z, CLIFF_R_F) < CLIFF_R_F) {
      let lo = 0, hi = 1;
      for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (this._faceDist(hero.x + L.lead.x * m, hero.y + 1.5, hero.z + L.lead.z * m, CLIFF_R_F) < CLIFF_R_F) hi = m; else lo = m; }
      lk = lo;
    }
    // (and swung up over him, the screen shows less ground: the lead and the dead zone shrink with the swing)
    const sw = 1 - L.cp.lift;
    lk *= 1 - 0.75 * L.cp.lift;
    const ex = hero.x + L.lead.x * lk - F.x, ez = hero.z + L.lead.z * lk - F.z;
    const er = ex * rx + ez * rz, ef = ex * fx + ez * fz, dr = L.pull > 0 ? 0 : DEAD_R * sw, df = L.pull > 0 ? 0 : DEAD_F * sw;
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
    // (ROCK FACES: how far the view is swung up over the look-at point, k; the look-ahead follows the look-at point down its own way)
    {
      const K = L.cp, vf = L.fpv ? [(F.x - L.fpv.x) / dt, (F.y - L.fpv.y) / dt, (F.z - L.fpv.z) / dt] : [0, 0, 0], ks = [this._cliffK(F.x, F.y, F.z, L.yaw, this.pitch, this.dist)];
      if (Math.hypot(vf[0], vf[2]) > 0.5 && Math.hypot(vf[0], vf[2]) < 60) for (const T of LIFT_AHEAD) ks.push(this._cliffK(F.x + vf[0] * T, F.y + vf[1] * T, F.z + vf[2] * T, L.yaw, this.pitch, this.dist));
      this._ease(K, Math.max(...ks), dt, CLIFF_K_V, CLIFF_K_A);
      K.lift = Math.min(1, K.lift);
      if (L.fresh) { K.lift = ks[0]; K.vlift = 0; }
      (L.fpv ??= {}).x = F.x; L.fpv.y = F.y; L.fpv.z = F.z;
    }
    const place = () => this._armAt(F.x, F.y, F.z, L.yaw, this.pitch, this.dist, L.cp.lift, _a).toArray();
    let [x, y, z] = place();
    // clear of the ground and of everything solid round the camera (BUG-WALL: _clearance). The comfortable margins are
    // eased in with a bounded speed and acceleration (quick up, gentle down: the need's kinks over ridges, rock rims and
    // roofs would otherwise jolt the view); the least margins (HARD) hold at once, every frame: never inside anything
    // (and looking down the camera's own way, LIFT_AHEAD s on: a swing round into a roof starts rising before it)
    let need = this._clearance(x, y, z, null, 1.5, 1, true);
    if (L.pv) {
      const vx = (x - L.pv.x) / dt, vy = (y - L.pv.y) / dt, vz = (z - L.pv.z) / dt;
      if (Math.hypot(vx, vz) > 0.5 && Math.hypot(vx, vz) < 60) for (const T of LIFT_AHEAD) { const n = this._clearance(x + vx * T, y + vy * T, z + vz * T, null, 1.5, 1, true); if (n > 0) need = Math.max(need, n + vy * T); }
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
      // (CAM-KEYWALK: within CH_CAP_BAND under the top of a tall box — a pier, a portico, a tower's block, more than
      // CH_CAP_TALL over the ground — it keeps CH_CAP_PAD off its sides: the cornice and the coping drawn there stand
      // out of the collider, and the camera stood in the hostel portico's cornice, 0.3 m outside its piers' boxes)
      const gl = Math.max(gap, CH_CAP_PAD);
      for (let gi = 0; gi < 4; gi++) {
        const L = P.near(p.x + GAP4[gi][0] * gl, p.z + GAP4[gi][1] * gl);
        for (let ci = 0; ci < L.length; ci++) {
          const c = L[ci];
          if (_seen.has(c)) continue;
          _seen.add(c);
          if (!c.enabled || (c.camSkip && occ) || p.y <= c.bottom - gap) continue;
          if (p.y < c.top + gap && P._inside(c, p.x, p.z, gap)) return true;
          // (and CH_CAP_UP over it: the portico's pediment roof stands 0.2 m over its piers' boxes)
          if (gap < CH_CAP_PAD && c.type !== 'cyl' && p.y < c.top + CH_CAP_UP && c.top - p.y < CH_CAP_BAND && T && c.top - T.heightAt(c.x, c.z) > CH_CAP_TALL && P._inside(c, p.x, p.z, CH_CAP_PAD)) return true;
        }
      }
    }
    // (the volumes; the pipeline's tube too, with CH_PIPE more for its stays and saddles — the sight line passes through
    // that one, the camera never stands in it)
    // (G1-CAM, cost: the volumes that could hold any of those points gathered once — from the cells of the square round
    // them —, each point's own test as before)
    if (occ) {
      const g2 = gap + CH_PIPE, vs = _segVols;
      vs.length = 0; _segSeen.clear();
      for (let gi = 0; gi < 4; gi++) {
        const L = vnear(occ, p.x + GAP4[gi][0] * g2, p.z + GAP4[gi][1] * g2);
        for (let vi = 0; vi < L.length; vi++) {
          const v = L[vi];
          if (_segSeen.has(v)) continue;
          _segSeen.add(v);
          if (v.y0 <= p.y + g2 && v.top >= p.y - g2) vs.push(v);
        }
      }
      if (vs.length) {
        const SP = SOLID_PASS(gap);
        for (let pi = 0; pi < SP.length; pi++) {
          const g = SP[pi][0], pipe = SP[pi][1];
          for (let ki = 0; ki < GAP11.length; ki++) {
            const K = GAP11[ki], x = p.x + K[0] * g, y = p.y + K[1] * g, z = p.z + K[2] * g;
            for (let vi = 0; vi < vs.length; vi++) { const v = vs[vi]; if ((!pipe || v.camOnly) && y >= v.y0 && y <= v.top && y <= occ.topAt(v, x, z)) return true; }
          }
        }
      }
    }
    return false;
  }

  // CAM-FOLLOW: is p over a house's roof — over a scenery volume's footprint by more than CH_RIM all round (grazing an
  // eave's rim by inches, the way a camera running along a house does, is not over it)? In a tight spot the camera
  // stays down by him rather than up over the roof
  _overRoof(p) {
    const occ = this.occ?.();
    if (occ) { const L = occ.near(p.x, p.z); for (let vi = 0; vi < L.length; vi++) {
      const v = L[vi];
      if (v.camOnly) continue;
      let over = true;
      for (let ri = 0; ri < RIM5.length; ri++) { const t = occ.topAt(v, p.x + RIM5[ri][0] * CH_RIM, p.z + RIM5[ri][1] * CH_RIM); if (!(t > -Infinity && p.y > t)) { over = false; break; } }
      if (over) return true;
    } }
    return false;
  }

  // CAM-FOLLOW: does a camera at p see his head or his chest? (nothing on the line: the terrain, a wall, a cliff, a
  // big rock, a scenery volume — not a post, a rail or a tree's crown, which he shows between)
  // (CAM-CLEAR-2, `strict`: a dialogue's two-shot — his head and his chest both, and the posts and the see-through
  // things count too: a face half behind the beam pad's arch is not framed)
  _sees(p, hero, strict = false) {
    // (G1-CAM, cost: the same spot asked about the same target again within a frame — the clear view's own test, the
    // arm's two tiers, the lead — reads the answer it already has: nothing it looks at moves within a frame. About half
    // the questions in a walk through the town are repeats.)
    // (STABILIZATION: the answers kept as numbers in one array, 8 a question — not a new array each: ~48 a frame)
    const M = (this._seesM ??= { fid: -1, n: 0, a: new Float64Array(48 * 8) }), A = M.a, st = strict ? 1 : 0;
    if (this._busy) {
      if (M.fid !== this._fid) { M.fid = this._fid; M.n = 0; }
      for (let i = 0, j = 0; i < M.n; i++, j += 8) if (A[j] === p.x && A[j + 1] === p.y && A[j + 2] === p.z && A[j + 3] === hero.x && A[j + 4] === hero.y && A[j + 5] === hero.z && A[j + 6] === st) return A[j + 7] === 1;
    }
    const r = strict ? this._line(p, hero.x, hero.y + 1.5, hero.z, true) && this._line(p, hero.x, hero.y + 1.0, hero.z, true)
      : this._line(p, hero.x, hero.y + 1.5, hero.z) || this._line(p, hero.x, hero.y + 1.0, hero.z);
    if (this._busy && M.n < 48) { const j = M.n++ * 8; A[j] = p.x; A[j + 1] = p.y; A[j + 2] = p.z; A[j + 3] = hero.x; A[j + 4] = hero.y; A[j + 5] = hero.z; A[j + 6] = st; A[j + 7] = r ? 1 : 0; }
    return r;
  }

  // G1-CAM (cost): the colliders and the scenery volumes that could hold one of the samples i0 ≤ i < i1 of the line
  // from p (p + d·i/n, as the callers place them) — those filed in the samples' own grid cells, near enough the line
  // across, and up and down — into _segCols / _segVols. Gathered once a line instead of looked up at every 0.25 m
  // sample; each caller's own test on each sample is unchanged, so its answer is too.
  _segCands(p, dx, dy, dz, n, i0, i1, P, occ) {
    _segCols.length = 0; _segVols.length = 0;
    if (i1 <= i0) return;
    const ka = i0 / n, kb = (i1 - 1) / n, ya = p.y + dy * ka, yb = p.y + dy * kb, ylo = Math.min(ya, yb), yhi = Math.max(ya, yb);
    const ax = p.x + dx * ka, az = p.z + dz * ka, bx = p.x + dx * kb, bz = p.z + dz * kb;
    _segSeen.clear();
    let pi = NaN, pj = NaN, vi = NaN, vj = NaN;
    for (let i = i0; i < i1; i++) {
      const k = i / n, x = p.x + dx * k, z = p.z + dz * k;
      if (P) {
        const ci = Math.floor(x / P.cell), cj = Math.floor(z / P.cell);
        if (ci !== pi || cj !== pj) {
          pi = ci; pj = cj;
          const L = P.near(x, z);
          for (let li = 0; li < L.length; li++) {
            const c = L[li];
            if (_segSeen.has(c)) continue;
            _segSeen.add(c);
            if (c.top > ylo && c.bottom < yhi && segDist(c.x, c.z, ax, az, bx, bz) <= (c.type === 'cyl' ? c.r : Math.hypot(c.hw, c.hd)) + 1e-6) _segCols.push(c);
          }
        }
      }
      if (occ) {
        const ci = Math.floor(x / VG), cj = Math.floor(z / VG);
        if (ci !== vi || cj !== vj) {
          vi = ci; vj = cj;
          const L = vnear(occ, x, z);
          for (let li = 0; li < L.length; li++) {
            const v = L[li];
            if (_segSeen.has(v)) continue;
            _segSeen.add(v);
            if (v.top >= ylo && v.y0 <= yhi && segDist(v.x, v.z, ax, az, bx, bz) <= (v.kind === 'rev' ? v.R : Math.hypot(v.hw, v.hd)) + 1e-6) _segVols.push(v);
          }
        }
      }
    }
  }

  // (is the line from p to (tx, ty, tz) clear? the end left out: what is right there)
  _line(p, tx, ty, tz, strict = false, ground = true) {
    const P = this.physics, occ = this.occ?.(), T = ground ? this.terrain : null;
    const dx = tx - p.x, dy = ty - p.y, dz = tz - p.z, n = Math.ceil(Math.hypot(dx, dy, dz) / 0.25);
    this._segCands(p, dx, dy, dz, n, 1, n - 1, P, occ);
    const cols = _segCols, vols = _segVols;
    for (let i = 1; i < n - 1; i++) {
      const k = i / n, x = p.x + dx * k, y = p.y + dy * k, z = p.z + dz * k;
      if (T && T.heightAt(x, z) > y + 0.05) return false;
      for (let ci = 0; ci < cols.length; ci++) {
        const c = cols[ci];
        if (!c.enabled || c.fades || (c.camSkip && occ) || y >= c.top || y <= c.bottom) continue;
        if (strict ? c.type === 'cyl' && c.r < 0.15 : c.seeThrough || (c.type === 'cyl' && c.r < 1.5)) continue;
        if (P._inside(c, x, z, 0)) return false;
      }
      // (occlude.js hit(), every volume: none skipped, the camera's own ones — camOnly — left out; G1-CAM: but they count
      // for a dialogue's two-shot, `strict`: a face is not framed through the pipeline or the beam pad's arch)
      for (let vi = 0; vi < vols.length; vi++) { const v = vols[vi]; if ((strict || !v.camOnly) && y >= v.y0 && y <= v.top && y <= occ.topAt(v, x, z)) return false; }
    }
    return true;
  }

  // CAM-CLEAR-2: how many of the lines from p to the space round him are cut (CH_CLUT: beside him either side as the
  // camera sees him, near and further out, and over his head): a roof or a wall filling half the frame next to him
  _clutter(p, hero) {
    const dx = hero.x - p.x, dz = hero.z - p.z, L = Math.hypot(dx, dz) || 1, rx = -dz / L, rz = dx / L;
    let n = 0;
    for (let i = 0; i < CH_CLUT.length; i++) { const s = CH_CLUT[i][0], up = CH_CLUT[i][1]; if (!this._line(p, hero.x + rx * s, hero.y + up, hero.z + rz * s, false, false)) n++; }   // (the ground beside him on a slope is no clutter)
    return n;
  }

  // CAM-FOLLOW: how far a camera at (x, y, z) must rise to keep over the terrain round it (1.3 m straight under it,
  // 0.8 m at CLEAR_R: a cliff's face and the rocks set in its rim) and to keep the line to his pivot T 0.8 m over the ground
  // between; `hard`: only the least it may ever come to the ground (0.45 m under it, 0.35 m at HARD_R), held at once
  _groundNeed(x, y, z, T, hard = false) {
    const H = this.terrain;
    if (!H) return 0;
    let need = H.heightAt(x, z) + (hard ? 0.45 : 1.3) - y;
    for (let i = 0; i < RING.length; i++) { const E = RING[i], r = E[0]; if (hard && r > HARD_R) break; const n = H.heightAt(x + E[1], z + E[2]) + (hard ? lerp(0.45, 0.35, r / HARD_R) : lerp(1.3, 0.8, r / CLEAR_R)) - y; if (n > need) need = n; }
    if (hard) return Math.max(0, need);
    for (let k = 0.3; k <= 1.0001; k += 0.35) {
      const n = (H.heightAt(T.x + (x - T.x) * k, T.z + (z - T.z) * k) + 0.8 - (T.y + CH_PIVOT + (y - T.y - CH_PIVOT) * k)) / k;
      if (n > need) need = n;
    }
    return Math.max(0, need);
  }

  // CAM-CLEAR-2: the most the ground's lift may raise a camera at p over his pivot T and stand it no steeper than
  // CH_RIM_EL (over a cliff's rim the arm comes in instead of rising 20 m)
  _rimCap(p, T) { return Math.max(0, Math.hypot(p.x - T.x, p.z - T.z) * Math.tan(CH_RIM_EL) - (p.y - T.y - CH_PIVOT)); }

  // CAM-CLEAR-2: the ground's lift for a camera at p: the comfortable one capped at the rim (_rimCap), never under the
  // least (`tight`: only the least)
  _chaseLift(p, T, tight) {
    if (tight) return this._groundNeed(p.x, p.y, p.z, T, true);
    const soft = this._groundNeed(p.x, p.y, p.z, T), cap = this._rimCap(p, T);
    return soft <= cap ? soft : Math.max(cap, this._groundNeed(p.x, p.y, p.z, T, true));   // (the soft need is never under the least)
  }

  // CAM-CLEAR-2: is the line from p to his feet or his middle through a pipe's tube (a camOnly volume: the camera's
  // sight passes through those, but a thick pipe across the bottom of the frame hides him from the waist down)?
  _pipeCut(p, hero) {
    const occ = this.occ?.();
    if (!occ) return false;
    for (let hi = 0; hi < 2; hi++) {
      const hy = hi === 0 ? 0.3 : 1.0;
      const dx = hero.x - p.x, dy = hero.y + hy - p.y, dz = hero.z - p.z, n = Math.ceil(Math.hypot(dx, dy, dz) / 0.25);
      this._segCands(p, dx, dy, dz, n, 1, n - 2, null, occ);   // (G1-CAM, cost: see _segCands)
      for (let i = 1; i < n - 2; i++) {
        const k = i / n, x = p.x + dx * k, y = p.y + dy * k, z = p.z + dz * k;
        for (let vi = 0; vi < _segVols.length; vi++) { const v = _segVols[vi]; if (v.camOnly && y >= v.y0 && y <= occ.topAt(v, x, z)) return true; }
      }
    }
    return false;
  }

  // CAM-CLEAR-2: a camera on heading yw, arm a, tilt q from his pivot T, lifted over the ground as the arm would be:
  // -1 in or against something or not seeing him; else what its view costs beyond the swing, the rise and the arm (a
  // pipe across the line to his feet, _pipeCut; the space round him cut, _clutter)
  _chaseOK(T, yw, a, q, heroV, rise = 0) {
    const h = Math.cos(q) * a, p = _e.set(T.x + Math.sin(yw) * h, T.y + CH_PIVOT + Math.sin(q) * a, T.z + Math.cos(yw) * h);
    p.y += this._chaseLift(p, T, false);
    if (this._solidAt(p, CH_GAP) || !this._sees(p, heroV) || !this._overGround(p, heroV)) return -1;
    // (CAM-WALKSWING: and the arm reaches it — the walls' cut along it, as the arm's own (armFor) — or it is no view
    // the arm can take: by a house's corner on Kesh's south lane the whole arm behind him stood clear and saw him, so
    // nothing looked round, while the arm could not get out past the corner and stayed at MIN-VIEW)
    if (this.occluded(T, Math.cos(q), Math.sin(q), yw, a, true, true) < a - 0.01) return -1;
    if (rise > 0 && this._overTall(p, heroV)) return -1;   // (a rise looks over a low wall or a fence, not over a house)
    return (this._pipeCut(p, heroV) ? CH_K_PIPE : 0) + this._clutter(p, heroV) * CH_K_CLUT;
  }

  // CAM-CLEAR-2: does the line from p to his head pass over anything standing more than CH_LOW_WALL over his feet (a
  // house, a wall taller than a fence)?
  _overTall(p, hero) {
    const P = this.physics, occ = this.occ?.(), lim = hero.y + CH_LOW_WALL;
    const dx = hero.x - p.x, dz = hero.z - p.z, n = Math.ceil(Math.hypot(dx, dz) / 0.5);
    for (let i = 1; i < n; i++) {
      const k = i / n, x = p.x + dx * k, z = p.z + dz * k;
      if (P) { const L = P.near(x, z); for (let ci = 0; ci < L.length; ci++) { const c = L[ci]; if (c.enabled && !c.fades && !c.seeThrough && !(c.type === 'cyl' && c.r < 0.6) && c.top > lim && P._inside(c, x, z, 0)) return true; } }
      if (occ) { const L = occ.near(x, z); for (let vi = 0; vi < L.length; vi++) { const v = L[vi]; if (!v.camOnly && occ.topAt(v, x, z) > lim) return true; } }
    }
    return false;
  }

  // CAM-CLEAR-2: does the line from p to his chest keep CH_SIGHT_G over the terrain between (a cliff's rocks stand out
  // of the slope it is cut from; the line grazing the rim showed the rock and not him)?
  _overGround(p, hero) {
    const H = this.terrain;
    if (!H) return true;
    const dx = hero.x - p.x, dy = hero.y + 1.0 - p.y, dz = hero.z - p.z, n = Math.max(2, Math.ceil(Math.hypot(dx, dz) / 0.5));
    for (let i = 1; i < n; i++) {
      const k = i / n; if (k < 0.12 || k > 0.88) continue;
      const x = p.x + dx * k, z = p.z + dz * k, y = p.y + dy * k - CH_SIGHT_G;
      if (H.heightAt(x, z) > y) return false;
      // (and no face within CH_SIGHT_R beside it: a steep face's rocks stand out of it sideways by that much)
      for (let ri = 1; ri < RIM5.length; ri++) { const ox = RIM5[ri][0], oz = RIM5[ri][1]; if ((ox || oz) && H.heightAt(x + ox * CH_SIGHT_R, z + oz * CH_SIGHT_R) > y + CH_SIGHT_G) return false; }
    }
    return true;
  }

  // CAM-CLEAR-2: the cheapest clear view round him (see CH_SW_*), searched a few candidates a frame (at most n; the
  // search S carries on next frame where it stopped) → true when done, S.best: { sw, rise, cost } or null (nothing clear
  // even at the shortest of CH_FRAC: the arm's own search below takes over at his back)
  _chaseSearch(S, T, yaw0, full, pq, heroV, n = Infinity) {
    for (; S.fi < CH_FRAC.length; S.fi++, S.ci = 0) {
      const f = CH_FRAC[S.fi], a = full * f, armCost = CH_K_ARM * (1 - f), set = CH_CANDS[f >= 0.8 ? 0 : 1], p0 = pq(a, 0);
      if (S.best && armCost >= S.best.cost) break;
      for (; S.ci < set.length; S.ci++) {
        const [sw, rise, c0] = set[S.ci], cost = c0 + armCost;
        if (Math.abs(sw) > (S.maxSw ?? Infinity)) continue;   // (CAM-KEYWALK: walking with his back kept, a small swing only)
        if (S.best && cost >= S.best.cost) break;
        const q = pq(a, rise);
        if (Math.abs(q - p0) < Math.abs(rise) * 0.5) continue;   // (past the top or the bottom: no real rise or dip)
        if (n-- <= 0) return false;
        const ok = this._chaseOK(T, yaw0 + sw, a, q, heroV, rise);
        if (ok < 0) continue;
        const c = cost + ok;
        if (!S.best || c < S.best.cost) S.best = { sw, rise, cost: c, f };
      }
    }
    return true;
  }

  // CAM-CLEAR-2: the cost of keeping the view it has (its swing and rise at the arm fractions), or Infinity
  _chaseKeep(T, yaw0, sw, rise, full, pq, heroV) {
    for (const f of CH_FRAC) {
      const ok = this._chaseOK(T, yaw0 + sw, full * f, pq(full * f, rise), heroV, rise);
      if (ok >= 0) return Math.abs(sw) * CH_K_SW + Math.abs(rise) * CH_K_RISE + CH_K_ARM * (1 - f) + ok;
    }
    return Infinity;
  }

  // CAM-CLEAR-2: the swing and the rise this frame (C.sw, C.rise toward their goals; see CH_SW_*). dyc: how far the
  // chase's own heading turned this frame (the whole view's turn stays within vmax)
  _chaseClear(dt, C, T, yaw0, full, pq, heroV, fresh, lock, dyc, vmax, backArm = null) {
    if (fresh || C.sw == null) Object.assign(C, { sw: 0, swV: 0, rise: 0, riseV: 0, swGoal: 0, riseGoal: 0, swCost: 0, searchT: 0, baseT: 0, srch: null, sideT: 0, coolT: 0 });
    if (lock || C.door) { C.swGoal = 0; C.riseGoal = 0; C.baseT = 0; C.sideT = 0; C.srch = null; }   // (CAM-DOORS: at his back after a scene change)
    else if (!fresh && (C.freshT = Math.max(0, (C.freshT || 0) - dt)) > 0) { /* (a new shot holds its view CH_FRESH_HOLD s: no move just after the cut) */ }
    else if (C.sideT > 0 && (C.arm ?? 0) < Math.min(C.wantOut ?? 0, CH_SIDE_OUT) - 0.1) C.sideT -= dt;   // (a side-step past a post, held: below)
    else {
      C.sideT = 0;
      // (at his back at the full arm, clear: back there, once it has stayed so CH_SW_HOLD s)
      C.searchT -= dt; C.coolT = Math.max(0, (C.coolT || 0) - dt);
      // (at his back the space round him may be cut on one side — a house he walks past —: that is no reason to swing)
      const b0 = this._chaseOK(T, yaw0, full, pq(full, 0), heroV), base = b0 >= 0 && b0 <= 2 * CH_K_CLUT + 1e-6;
      // (while he walks, his back blocked — a house's corner he walks past, a door he walks up to — the arm comes in as
      // before: a swing out and back as he passes turned the view against his own turns; it looks round once he stands)
      const walking = C.pT && Math.hypot(T.x - C.pT.x, T.z - C.pT.z) / dt > 0.6;
      C.baseT = base ? C.baseT + dt : 0; C.blockT = base || walking ? 0 : (C.blockT || 0) + dt;
      // CAM-WALKSWING (the School's channel on Desert Island: turned toward the camp and walking up out of it past the
      // school's wall, the arm stood at 0.8-3.2 m for 2-6 s, his back filling the screen): walking too, once his back has
      // stayed blocked outright with the arm drawn in under CH_WALK_CUT of it for CH_WALK_T s — no corner he walks past,
      // a stretch — it looks round him; drawn in to MIN-VIEW's least (over his head), after CH_WALK_T0 s
      const deep = b0 < 0 && (C.want ?? full) < CH_WALK_CUT * full;
      C.deepT = deep ? (C.deepT || 0) + dt : 0;
      // (and turning toward a heading whose back is blocked outright — away from Tarra's door, toward the next stair-stone
      // round the old mill — it looks round that heading at once, before the turn draws the arm in: _chase waits for it)
      // (neither while he is still turning: round a heading that moves on each search it chose one way and then the
      // other — away from Tarra's door the view swung 40° out, back and 30° out the other way within the turn)
      const deepGo = Math.abs(C.vyaw) < CH_TURN_V && ((deep && C.deepT >= ((C.want ?? full) <= CH_MIN_VIEW + 0.3 ? CH_WALK_T0 : CH_WALK_T)) || (b0 < 0 && Math.abs(angleDiff(C.yaw, yaw0)) > CH_TURN_SRCH));
      // CAM-KEYWALK (the user on Follow, Medium: "the camera lost balance and is not behind Twinsen"): walking a steady way
      // with his back blocked at the whole arm, the view keeps to his back while that still gives CH_WALK_KEEP m or more of
      // arm that sees him (risen over the wall behind him included, armFor's `high`): no swing round him, and a swing
      // taken comes back as he walks. Walking south from the hostel's door along the terrace under the fort's wall the
      // view stood 80° off his back to the end; by the station yard's wall and the Bug-street house 40-70° for 1-3 s
      const kr = !base && !fresh && !lock && !C.door && walking && backArm && Math.abs(C.vyaw) < CH_TURN_V ? backArm(yaw0) : null;
      // (kept, it holds down to CH_WALK_HOLD m and CH_WALK_GRACE s past a dip: walking on past the hostel's portico the
      // risen arm read 6.5, 3.9, 4.6 m on successive looks, and each dip under the bar started a swing of 40°)
      const keep0 = !!kr && kr[1] && kr[0] >= (C.kbT > 0 || C.kbG > 0 ? CH_WALK_HOLD : CH_WALK_KEEP);
      C.kbG = keep0 ? CH_WALK_GRACE : Math.max(0, (C.kbG || 0) - dt);
      const backKeep = keep0 || (!!kr && C.kbG > 0 && C.kbT > 0);
      this.why.kb = kr ? kr[0] * (kr[1] ? 1 : -1) : 0;   // (tests/lib/camwalk.js traces it)
      C.kbT = backKeep ? (C.kbT || 0) + dt : 0;
      if (base) C.srch = null;
      // (CAM-STAIRS: a swung view drawn in past CH_COOL_ARM of the arm while his back stands clear at the full arm goes
      // back at once: by the fort's south-west tower a swing chosen while he stood under the slope was kept 1.2 s more as
      // he walked on up the passage, and its heading ran the arm into the tower — in to 3.2 m, over his head and out)
      const pinned = (C.swGoal || C.riseGoal) && (C.want ?? full) < CH_COOL_ARM * full;
      if (base && (fresh || C.baseT >= CH_SW_HOLD || (C.swGoal === 0 && C.riseGoal === 0) || pinned)) {
        if (C.swGoal || C.riseGoal) C.coolT = CH_SW_COOL;   // (let go: not swung out again at once)
        C.swGoal = 0; C.riseGoal = 0; C.swCost = 0;
      } else if (backKeep && C.kbT >= CH_WALK_KEEP_T && Math.abs(C.swGoal) > CH_WALK_SW) {
        // (back as he walks, eased: _chaseClear's swing below lets a walk's swing back while he walks)
        C.coolT = CH_SW_COOL; C.swGoal = 0; C.riseGoal = 0; C.swCost = 0; C.walkSw = true;
      }
      // (only once his back has stayed blocked CH_SW_DELAY s: a tree's trunk the view swings past is no reason; turning on
      // the spot, a view merely cluttered waits for the turn to end: a swing then would fight the turn; just let go
      // (CH_SW_COOL s), only a view at his back that is blocked outright and would draw the arm in past CH_COOL_ARM of it)
      // (CAM-WALKSWING: a blocked one too waits while the view turns faster than 2 × CH_TURN_V: it looks round the heading
      // the turn goes to, which moves on with each search)
      else if (!base && (fresh || C.srch || (C.searchT <= 0 && (C.blockT >= CH_SW_DELAY || deepGo) && (!(C.coolT > 0) || (b0 < 0 && (C.want ?? full) < CH_COOL_ARM * full))))
        && (fresh || (b0 < 0 && Math.abs(C.vyaw) < 2 * CH_TURN_V) || Math.abs(C.vyaw) < 0.5)
        // (CAM-WALKSWING: a swing just chosen is kept CH_SW_MIN s before another search may change it: on the old mill's
        // stair-stones, his pivot still rising after a landing, a search every CH_SEARCH_T s chose 20°, 40°, 60° and then
        // −50° within a second)
        && (fresh || C.srch || !(C.swGoal || C.riseGoal) || !((C.clk ?? 0) - (C.swAt ?? -1e9) < CH_SW_MIN))) {
        // (a few candidates a frame — CH_SEARCH_N —, all at once for a new shot behind the fade; only those cheaper by
        // CH_K_KEEP than keeping the view it has)
        if (fresh || !C.srch) {
          const keep = C.swGoal === 0 && C.riseGoal === 0 ? (b0 >= 0 ? b0 : Infinity) : fresh ? Infinity : this._chaseKeep(T, yaw0, C.swGoal, C.riseGoal, full, pq, heroV);
          C.srch = { fi: 0, ci: 0, maxSw: backKeep ? CH_WALK_SW : Infinity, best: keep < Infinity ? { keep: true, cost: keep - CH_K_KEEP, k0: keep } : null };
        }
        if (this._chaseSearch(C.srch, T, yaw0, full, pq, heroV, fresh ? Infinity : CH_SEARCH_N)) {
          const b = C.srch.best;
          C.srch = null;
          // (kept at the full arm, it looks again less often)
          C.searchT = b?.keep && b.k0 - Math.abs(C.swGoal) * CH_K_SW - Math.abs(C.riseGoal) * CH_K_RISE < 0.5 ? CH_SEARCH_T * 4 : CH_SEARCH_T;
          if (b && !b.keep) { C.swGoal = b.sw; C.riseGoal = b.rise; C.swCost = b.cost; C.walkSw = walking || deep; C.swAt = C.clk ?? 0; }
          else if (b) C.swCost = b.k0;
          else { C.swGoal = 0; C.riseGoal = 0; C.swCost = Infinity; }   // (nothing clear round him: at his back, the arm comes in)
        }
      }
    }
    if (fresh) { C.sw = C.swGoal; C.rise = C.riseGoal; C.swV = C.riseV = 0; C.turnDir = 0; C.freshT = C.sw || C.rise ? CH_FRESH_HOLD : 0; return; }
    // the swing: eased toward its goal, and the view's whole turn this frame within vmax
    // (a swing let back toward his back — less of it — goes only while he walks, and only the way the view last turned:
    // it rides on his own turns, never turning the view back against the way it went — a view swung out, back and out
    // again turned three ways where he turned one; standing, it waits)
    {
      const e = C.swGoal - C.sw, back = Math.abs(C.swGoal) < Math.abs(C.sw) && Math.sign(e) === -Math.sign(C.sw);
      const moving = C.pT && Math.hypot(T.x - C.pT.x, T.z - C.pT.z) / dt > 0.6;
      // (a swing out against the way the chase is turning waits until the view has stood still CH_SW_STILL s: it would
      // fight the turn and turn the view back and forth)
      C.stillT = Math.abs(dyc) < 0.1 * dt ? (C.stillT || 0) + dt : 0;
      // (a view drawn in where it stands — stuck behind a post, a side-step under way — is never held: it moves to the clear one)
      // (CAM-STAIRS: nor one drawn in at its own heading past CH_COOL_ARM of the arm; and standing, once the view has stood
      // still CH_SW_SETTLE s, a swing let back goes back to his back: it waited for him to walk on, and on the asylum's
      // forecourt, turned and standing, the view stayed 10-20° off his back — up to CH_SW_FAR — for as long as he stood)
      const cut = (C.sideT || 0) > 0 || (C.arm ?? 0) < Math.min(C.wantOut ?? 0, CH_SIDE_OUT) - 0.5 || (C.want ?? full) < CH_COOL_ARM * full;
      const settle = !moving && C.stillT >= CH_SW_SETTLE && Math.abs(C.vyaw) < 0.2;
      // (CAM-WALKSWING: a swing taken while he walked, or with the arm deep in, comes back while he walks, eased: it was
      // no turn of his; and it goes out once the chase has all but settled — waiting for it to stand quite still held the
      // view at the school's wall 0.6 s more)
      if (C.swGoal === 0 && Math.abs(C.sw) < 0.01) C.walkSw = false;
      const hold = back ? !cut && !settle && !C.walkSw && (!moving || (C.turnDir && Math.sign(e) !== C.turnDir))
        : Math.abs(e) > 1e-4 && Math.sign(C.swV) !== Math.sign(e) && C.turnDir && Math.sign(e) !== C.turnDir && C.stillT < CH_SW_STILL && !(C.walkSw && Math.abs(C.vyaw) < 0.5);
      const want = hold ? 0 : Math.sign(e) * Math.min(CH_SW_V, Math.sqrt(1.6 * CH_SW_A * Math.abs(e))), a = CH_SW_A * dt;
      C.swV += clamp(want - C.swV, -a, a);
      if (hold && Math.sign(C.swV) === Math.sign(e)) C.swV = 0;
      let st = C.swV * dt;
      if ((e > 0 && st > e) || (e < 0 && st < e)) { st = e; C.swV = 0; }
      const lim = vmax * dt, st0 = st;
      st = clamp(st, -lim - dyc, lim - dyc);
      if (st !== st0) C.swV = st / dt;   // (held back by the chase's own turn: its speed is what it really moved)
      if (Math.abs(e) < 1e-4 && !hold) { st = e; C.swV = 0; }
      C.sw += st;
      // (the way the view last turned, its chase and its swing together)
      if (Math.abs(dyc + st) > 0.002) C.turnDir = Math.sign(dyc + st);
    }
    // the rise: eased toward its goal
    {
      // (CAM-KEYWALK: into a dip — under an arch he runs into — quicker, CH_DIP_V and CH_DIP_A: at the rise's pace the arm had
      // come in to 1 m at his back in the station gate's passage before the view had dipped under its arch)
      const dip = C.riseGoal < 0 && C.rise > C.riseGoal, e = C.riseGoal - C.rise, want = Math.sign(e) * Math.min(dip ? CH_DIP_V : CH_RISE_V, Math.sqrt((dip ? CH_DIP_A : 2) * Math.abs(e))), a = (dip ? CH_DIP_A : 1.5) * dt;
      C.riseV += clamp(want - C.riseV, -a, a);
      const st = C.riseV * dt;
      if ((e > 0 && st >= e) || (e < 0 && st <= e) || Math.abs(e) < 1e-4) { C.rise = C.riseGoal; C.riseV = 0; } else C.rise += st;
    }
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
      Object.assign(C, { init: true, yaw: facing(), vyaw: 0, goal: facing(), h: gy, vh: 0, band: gy, hold: false, arm: null, armV: 0, clearT: 0, lift: 0, vlift: 0, pv: null, fPrev: null, steadyT: 0, lowT: 0, stuckT: 0, pT: null });
      cam.fov = CH_FOV;
      // CAM-DOORS: a scene change (snap) starts at his back and keeps there while he stays by the door (CH_DOOR_*)
      C.door = snap ? { x: hero.x, z: hero.z, t: 0 } : null; C.doorOutT = snap ? CH_DOOR_OUT_T : 0;
    } else {
      C.doorOutT = Math.max(0, (C.doorOutT || 0) - dt);
      // (CAM-WALKSWING: or, standing there, held over his head at MIN-VIEW's least CH_DOOR_STAY s: off the ship at the
      // spaceport, its hull at his back, the view stayed pressed against it for as long as he stood)
      if (C.door && (C.door.t += dt) > CH_DOOR_T && (Math.hypot(hero.x - C.door.x, hero.z - C.door.z) > CH_DOOR_R || (C.door.t > CH_DOOR_STAY && ((C.want ?? Infinity) <= CH_MIN_VIEW + 0.05 || C.overK >= 1)))) C.door = null;
    }
    // the heading: his facing (a small steering correction inside CH_DEAD_YAW moves nothing) through the spring;
    // camera-relative controls pushed back (toward the camera) hold it
    {
      const y0 = C.yaw;
      C.vmaxNow = CH_VMAX;
      if (!lock) {
        const rel = typeof this.relative === 'function' ? this.relative() : this.relative, mv = rel && input?.move ? input.move() : null;
        const push = mv && Math.hypot(mv.x, mv.y) > 0.3, back = push && Math.abs(Math.atan2(mv.x, mv.y)) > CH_BACK;
        // (CAM-STAIRS: and let go once the stick has been let go CH_HOLD_IDLE s — he stands, there is no push left to keep
        // steady —: pushed back to turn round on the asylum's forecourt, the view stayed on his face as long as he stood)
        C.idleT = push ? 0 : (C.idleT || 0) + dt;
        if (back) C.hold = true;
        else if (C.hold && (!rel || (push && Math.abs(angleDiff(C.yaw, heroAngle + Math.PI)) < CH_HOLD_OUT) || C.idleT > CH_HOLD_IDLE)) C.hold = false;
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
        const vmax = (C.vmaxNow = CH_VMAX * clamp(1 - ((C.arm ?? 0) - (C.want ?? 0)) / CH_LAG, 0.2, 1));
        spring(C, 'y', C.yaw + angleDiff(C.yaw, C.goal), CH_W, dt);
        C.vyaw = clamp(C.vy, -vmax, vmax);
        C.yaw += clamp(C.y - C.yaw, -vmax * dt, vmax * dt);
      }
      C.dyc = angleDiff(y0, C.yaw); W.swingBy = C.hold ? 'hold' : lock ? 'lock' : 'chase';
    }
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
    // (CAM-FAR: the tilt drawn in adds to the base pitch only up to CH_PITCH_SHORT in all — a higher base (Far) tilts up
    // less, so the view looks no steeper at a wall or a door than Medium's does: out of the house door, steeper than 45°
    // for 1.8 s at Far's 0.5 + 0.4 against 0.15 s at Medium's 0.42 + 0.4)
    const upK = Math.min(1, (CH_PITCH_SHORT - CH_PITCH) / (CH_UP + CH_UP2));
    const pitchAt = (arm) => CH_PITCH + upK * (CH_UP * clamp((CH_ARM - arm) / (CH_ARM - CH_SHORT), 0, 1) + CH_UP2 * clamp((CH_SHORT - arm) / (CH_SHORT - CH_MIN), 0, 1));
    // (CAM-CLEAR-2: and risen over a low wall or a fence by C.rise, never past CH_RISE_TOP)
    // (CAM-KEYWALK: a dip keeps the whole arm's low tilt at any length — drawn in under an arch, the tilt up of a short arm
    // took the camera into the arch it dips under: in the station gate's passage it stayed 1.0 m behind him, 2 m up, and could
    // not let out along that steeper line)
    const pq = (a, r = C.rise ?? 0) => { const p = pitchAt(a); return r < 0 ? Math.max(CH_DIP_MIN, CH_PITCH + r) : p + Math.max(0, Math.min(r, CH_RISE_TOP - p)); };
    const at = (out, yw, a, O = T, q = pq(a)) => { const h = Math.cos(q) * a; return out.set(O.x + Math.sin(yw) * h, O.y + CH_PIVOT + Math.sin(q) * a, O.z + Math.cos(yw) * h); };
    // the longest arm along heading yw whose camera — over the ground as it will be — keeps CH_GAP from everything
    // solid and sees him; none keeps clear: a tight spot, the least margins (CH_NEAR, the ground's least); none there
    // either (his back to a wall): over his head, looking down (CH_OVER_*); nor that: the longest that keeps clear, or
    // the walls' cut (the silhouette shows him) → [arm, sees, tier: 0 comfortable, 1 tight, 2 over his head]
    // (`high`: the risen longer arm too, CH_HIGH_*: only for the heading it stands at, not the look-ahead's)
    const armFor = (yw, T, high = false) => {
      const p = pq(a0), cut = Math.min(full, this.occluded(T, Math.cos(p), Math.sin(p), yw, full + 0.6, true, true));
      _v.set(T.x, hero.y + T.y - C.h, T.z);
      // (each tier's longest arm that sees him, else its longest clear one; the comfortable tier wins unless the tight
      // one's arm is CH_TIER_PREF longer: running along a house's eaves, 5 m out and 0.2 m from them beats 1.6 m
      // under them — and the arm then shortens by inches as he goes, not by 5 m at once)
      // (each tier searched from `hi` down to `lo`)
      const tiers = (hi, lo) => {
        const best = [];
        for (const tight of [false, true]) {
          let free = null, seen = null;
          for (let a = hi; ; a = Math.max(lo, a - 0.25)) {
            at(_b, yw, a, T); _b.y += this._chaseLift(_b, T, tight);
            if (!this._solidAt(_b, tight ? CH_NEAR : CH_GAP) && !(tight && this._overRoof(_b))) { free ??= a; if (this._sees(_b, _v)) { seen = a; break; } }
            if (a <= lo) break;
          }
          best.push(seen != null ? [seen, true, tight ? 1 : 0] : free != null ? [free, false, tight ? 1 : 0] : null);
        }
        const [b0, b1] = best;
        if (b0 && (!b1 || (b0[1] >= b1[1] && b0[0] >= b1[0] - CH_TIER_PREF))) return b0;
        return b1 || null;
      };
      // MIN-VIEW: an arm of CH_MIN_VIEW or more that sees him; else over his head at CH_MIN_VIEW (then CH_OVER_ARMS'
      // shorter one), the least tilt up from CH_OVER_P[0] that stands clear and sees him; else the arm of CH_MIN_VIEW
      // or more that stands clear (the silhouette shows him); only then shorter (under a low roof)
      const far = cut >= CH_MIN_VIEW ? tiers(cut, CH_MIN_VIEW) : null;
      // (CAM-KEYWALK: a short one — under CH_WALK_KEEP — is taken only when the risen longer arm below has nothing a metre
      // longer: by the station yard's wall the two took turns frame by frame, the view pumping 3.2 → 6.4 → 3.2 m)
      if (far?.[1] && (!high || far[0] >= CH_WALK_KEEP)) return far;
      // CAM-KEYWALK: before over his head at MIN-VIEW, a longer arm risen over what stands behind him (a terrace's wall,
      // the hostel's portico): the longest of CH_HIGH_ARMS (within the arm) at the least of CH_HIGH_P that stands clear
      // and sees him. The terrace before the hostel is 7 m deep under the fort's wall: walking south from the door the arm
      // stood over his head at 3.2 m (or swung 80° round along the wall) the whole way to its edge
      if (high) for (const ha of CH_HIGH_ARMS) {
        if (ha > full - 0.5 || ha <= CH_MIN_VIEW) continue;
        for (const q of CH_HIGH_P) {
          if (q < pq(ha) + 0.1) continue;
          if (far?.[1] && ha < far[0] + 1) break;
          at(_b, yw, ha, T, q); _b.y += this._groundNeed(_b.x, _b.y, _b.z, T, true);
          // (over a roof only steep, from CH_HIGH_ROOF_Q: over the station yard's gatehouse, looking down into the yard)
          if (!this._solidAt(_b, CH_GAP) && (q >= CH_HIGH_ROOF_Q || !this._overRoof(_b)) && this._sees(_b, _v) && this._overGround(_b, _v)) return [ha, true, 2, q, ha];
        }
      }
      if (far?.[1]) return far;
      // (CAM-KEYWALK: over his head in CH_OVER_SET's order: MIN-VIEW's 3.2 m, then higher at longer arms and the steepest
      // tilts — his back right against something taller than the camera over his head, the hostel's portico at 5.9 m —,
      // and only then MIN-VIEW's shorter arm: turning at the terrace's west corner by the portico the view came down to
      // 2.4 m over his head, at its foot to 1.3-1.5 m in the doorway's reveal behind him)
      let clearQ = null;
      for (const [oa, qs] of CH_OVER_SET) for (const q of qs) { at(_b, yw, oa, T, q); _b.y += this._groundNeed(_b.x, _b.y, _b.z, T, true); if (!this._solidAt(_b, CH_NEAR) && !this._overRoof(_b)) { clearQ ??= [q, oa]; if (this._sees(_b, _v)) return [oa, true, 2, q, oa]; } }
      if (far) return far;
      if (clearQ) return [clearQ[1], false, 2, clearQ[0], clearQ[1]];   // (none sees him: the least tilt that stands clear; the silhouette)
      const near = tiers(Math.min(cut, CH_MIN_VIEW - 0.25), CH_MIN);
      return near || [cut, false, 1];
    };
    // CAM-CLEAR-2: a clear view round him before the arm comes in (the swing C.sw off his back, the rise C.rise; CH_SW_*)
    {
      const y1 = C.yaw + (C.sw ?? 0);
      // (CAM-WALKSWING: looked for round the heading the chase is turning to — its goal — not where it is on the way: the
      // School's channel, turning toward the camp, the view turned its back into the school's wall and came in to 1 m)
      this._chaseClear(dt, C, T, C.hold || lock ? C.yaw : C.yaw + angleDiff(C.yaw, C.goal), full, pq, _t.set(hero.x, hero.y, hero.z), fresh, lock, C.dyc ?? 0, C.vmaxNow ?? CH_VMAX, (yw) => armFor(yw, T, true));
      W.swing = angleDiff(y1 - (C.dyc ?? 0), C.yaw + C.sw); W.off = C.sw; W.chase = C.dyc ?? 0;   // (the swing off his back, and the chase's own turn this frame: tests/lib/camrec.js traces)
    }
    // CAM-CLEAR-2: stuck close behind a post (the way out through it blocked, the arm it wants clear beyond it): the
    // swing side-steps it, by the least of CH_SIDE that clears the way out, held until the arm is out past it
    if (!fresh && !lock && !C.door && C.stuckT > CH_STUCK_T && C.arm < CH_SHORT + 1.5) {
      C.stuckT = 0;
      side: for (const d of CH_SIDE) for (const sg of [1, -1]) {
        const sw = C.sw + sg * d, yw = C.yaw + sw;
        if (Math.abs(sw) > CH_SW_FAR) continue;
        for (let a = C.arm + 0.1; a <= Math.min(C.wantOut, C.arm + 3); a += 0.2) { at(_b, yw, a); _b.y += this._chaseLift(_b, T, C.tight); if (this._solidAt(_b, C.tight ? CH_NEAR : CH_GAP)) continue side; }
        C.swGoal = sw; C.sideT = CH_SIDE_HOLD; break;
      }
    }
    const yaw = (this.yaw = C.yaw + C.sw), sy = Math.sin(yaw), cy = Math.cos(yaw);
    {
      // (also where it will be CH_LEAD s on, turning and walking: a swing toward a wall, a walk past a corner start
      // drawing it in before the wall is between them)
      let [want, seen, tier, overQ, overArm] = armFor(yaw, T, true); const over = tier === 2;
      // (CAM-KEYWALK: what the look-ahead reads draws the arm in no shorter than MIN-VIEW's: turning on the spot by the
      // hostel's portico, a heading the turn was still on its way to read 1.6 m, and the arm came in to it at his shoulder
      // where the heading it stood at had 3.2 m over his head — 0.9-1.4 m, "zoomed in on Twinsen". The heading reached,
      // its own answer (over his head) takes over; nothing ever stands in anything meanwhile, below)
      // (over his head — risen, CH_HIGH_*, or MIN-VIEW's — the look-ahead's low-tilt answers do not apply: they held the
      // arm short under the risen view, and when that view let go the arm stood at 3.2 m and crept out from there)
      const own = want, ahead = (r) => (over ? own : Math.max(r[0], Math.min(own, CH_MIN_VIEW)));
      // (CAM-KEYWALK: over his head the arm lets out no faster than CH_OUT_V, as the arm itself: the risen arm's lengths
      // differ by metres — 3.2 to 6.5 —, and the eased change took them at 18 m/s; in, as before; and into it from the arm it had, not from the longer arm at once)
      if (over) { C.overQ = fresh || !(C.overK > 0) ? overQ : damp(C.overQ, overQ, 6, dt); const oa0 = C.overArm ?? overArm, oa1 = fresh ? overArm : !(C.overK > 0) ? Math.min(overArm, C.arm ?? overArm) : damp(oa0, overArm, 6, dt); C.overArm = fresh || !(C.overK > 0) ? oa1 : Math.min(oa1, oa0 + CH_OUT_V * dt); }
      if (!fresh && C.pT) {
        const vx = (T.x - C.pT.x) / dt, vz = (T.z - C.pT.z) / dt, walk = Math.hypot(vx, vz) > 0.5 && Math.hypot(vx, vz) < 20;
        // (CAM-WALKSWING: turning on the spot while the clear view round the heading it turns to is still being looked
        // for — a few frames —, where the turn will take it does not draw the arm in yet: the swing found turns it
        // elsewhere. Where it stands still does: nothing ever stands in a wall meanwhile)
        const looking = !!C.srch && !walk, turn = Math.abs(C.vyaw) > 0.3 && !looking;
        // (CAM-STAIRS: his pivot there risen with the ground he walks up to — a flight of steps, a slope —, at most
        // CH_LEAD_RISE of the way along: kept at the height he has now, a walk up the asylum's flight read the line to
        // his chest 0.45 s on as through the steps ahead and drew the arm in over his head, 8.3 → 2.6 m, for the whole flight)
        if (turn || walk) for (const t of CH_LEAD) {
          const lx = T.x + (walk ? vx * t : 0), lz = T.z + (walk ? vz * t : 0), run = Math.hypot(lx - T.x, lz - T.z);
          const ly = walk && P ? T.y + clamp(P.groundAt(lx, lz, hero.y + run * CH_LEAD_RISE) - gy, 0, run * CH_LEAD_RISE) : T.y;
          const ly2 = yaw + clamp(C.vyaw * t, -CH_LEAD_YAW, CH_LEAD_YAW), r = armFor(ly2, _c.set(lx, ly, lz));
          // CAM-KEYWALK (the user, 7.11: running into the station gate's passage "the camera still zooms in super close"):
          // where he is about to be the arm is cut short — an arch ahead, 2.2 m over the paving — but the view dipped
          // under it keeps MIN-VIEW and a metre more there: dip now (CH_PREDIP), before he is under it, instead of drawing
          // the arm in to his back and dipping once he stands in the passage (1.0 m for 0.7-1 s)
          if (walk && !lock && !C.door && r[0] < CH_MIN_VIEW && (C.riseGoal ?? 0) > CH_PREDIP) {
            const r0 = C.rise; C.rise = CH_PREDIP; const rd = armFor(ly2, _c); C.rise = r0;
            if (rd[1] && rd[2] === 0 && rd[0] >= CH_MIN_VIEW + 1) { C.riseGoal = CH_PREDIP; C.swAt = C.clk ?? 0; C.baseT = 0; continue; }
          }
          want = Math.min(want, ahead(r));
        }
        // (and at the heading its spring is on its way to: a turn toward a house starts drawing it in at the turn's start)
        const g = C.hold ? yaw : C.goal + C.swGoal, gd = angleDiff(yaw, g);
        if (Math.abs(gd) > 0.05 && !looking) { want = Math.min(want, ahead(armFor(g, T))); if (Math.abs(gd) > 0.6) want = Math.min(want, ahead(armFor(yaw + gd / 2, T))); }
      }
      (C.pT ??= new THREE.Vector3()).copy(T);
      // (a cut in of more than CH_FLICK m must hold CH_CONFIRM s: walking along a house's eaves the sight line grazes
      // their rim and the search drops to the shortest arm for a frame, then back — that pumped the view in and out; a
      // real wall stays, and the camera never stands in anything meanwhile, below)
      if (!fresh && C.arm != null && want < C.arm - CH_FLICK) { C.lowT = (C.lowT || 0) + dt; if (C.lowT < CH_CONFIRM) want = C.arm - CH_FLICK; } else C.lowT = 0;
      // (letting out, only as far as the way out is clear: never out through a tree's trunk to the clear spot beyond)
      // (CAM-CLEAR-2: held there — close behind a post with the arm it wants clear beyond it — it is stuck: C.stuckT)
      const w0 = want;
      // (CAM-WALKSWING: over his head, along the tilt it stands at there — along the arm's own low tilt the way out ran
      // into the old mill it was looking down past, and the arm stayed at 1.1 m for as long as it stood over him)
      if (!fresh && C.arm != null && want > C.arm) for (let a = C.arm + 0.1; a < want + 0.1; a += 0.1) {
        at(_b, yaw, Math.min(a, want), T, over ? overQ : pq(Math.min(a, want))); _b.y += this._chaseLift(_b, T, tier > 0);
        // (CAM-KEYWALK: under a dip the way out keeps the least margin: out of the station gate's passage under its arch,
        // 2.2 m high, the comfortable 0.4 m stopped the arm at 1.9 m though the yard behind him stood clear)
        if (this._solidAt(_b, tier > 0 || (C.rise ?? 0) < 0 ? CH_NEAR : CH_GAP)) { want = Math.max(C.arm, a - 0.1); break; }
      }
      C.stuckT = !fresh && C.arm != null && w0 - want > 1.5 && want - C.arm < 0.3 ? (C.stuckT || 0) + dt : 0; C.wantOut = w0;
      // CAM-RECOVER (the user on Follow, Medium, reads a slow return as "stuck close behind him"): after an in-cut the
      // arm held CH_HOLD s and crept out at CH_OUT_V — 3-5 s back from 3.2 m though the way behind him had cleared. When
      // it wants (nearly: within CH_QUICK_NEAR) its whole arm — that spot clear and seeing him, and the way out to it
      // clear: the scan above left `want` there — and is more than CH_QUICK_GAP short of it, it goes out after
      // CH_QUICK_HOLD s at up to CH_QUICK_V, eased by CH_QUICK_A — unless it was cut in twice within CH_QUICK_PUMP s (a
      // row of posts, a colonnade: the slow let-out keeps it from pumping in and out there). Short of that (a wall still
      // limits it, he walks away from it) the let-out is CH_OUT_V as before.
      C.clk = (C.clk || 0) + dt;
      C.quick = !fresh && !lock && C.arm != null && w0 >= full - CH_QUICK_NEAR && want >= w0 - 0.05 && (C.quick || full - C.arm > CH_QUICK_GAP) && !(C.clk - (C.cut0 ?? -1e9) < CH_QUICK_PUMP);
      // (over his head: in and out of it eased, CH_OVER_RATE)
      // (in only once over his head has been wanted CH_OVER_T s, or at once when he is out of sight from where it stands: a
      // step past a corner of the eaves doesn't bob it up and down)
      C.overT = over ? (C.overT || 0) + dt : 0;
      const goOver = over && (C.overT >= CH_OVER_T || C.overK > 0 || !this._sees(cam.position, hero));
      C.overK = fresh ? (over ? 1 : 0) : clamp((C.overK || 0) + (goOver ? 1 : -1) * CH_OVER_RATE * dt, 0, 1);
      if (fresh || C.arm == null) { C.arm = want; C.armV = 0; }
      else if (want < C.arm - 0.005) {
        // in: quickly (≤ CH_IN_V), eased in and out (CH_IN_A: it can always stop on the arm it wants, never past it)
        C.clearT = 0; C.quick = false;
        // (CAM-RECOVER: when the last two cuts in of more than a metre began)
        if (!C.cutting && C.arm - want > 1) { C.cutting = true; C.cut0 = C.cut1; C.cut1 = C.clk; }
        const vw = -Math.min(CH_IN_V, Math.sqrt(2 * CH_IN_A * (C.arm - want)));
        C.armV += clamp(vw - C.armV, -CH_IN_A * dt, CH_IN_A * dt);
        C.arm = Math.max(want, C.arm + Math.min(0, C.armV) * dt);
        if (C.arm === want) C.armV = 0;
      } else if (want > C.arm + 0.05 && (C.clearT += dt) > (C.doorOutT > 0 ? 0 : C.quick ? CH_QUICK_HOLD : CH_HOLD)) {
        // out: only once the way has stayed clear CH_HOLD s, slowly and eased (no pumping in and out past a corner)
        // (CAM-DOORS: just out of a door, drawn in over his shoulder at the doorstep, it trails out after him as fast as
        // the way behind him clears: CH_DOOR_OUT_*; it held 0.6 s and then crept out at 2.5 m/s, his back filling the view)
        // (CAM-RECOVER: far shorter than the whole arm it wants, clear all the way out to it: quicker, CH_QUICK_*)
        const oV = C.doorOutT > 0 ? CH_DOOR_OUT_V : C.quick ? CH_QUICK_V : CH_OUT_V, oA = C.doorOutT > 0 ? CH_DOOR_OUT_A : C.quick ? CH_QUICK_A : CH_OUT_A;
        const e = want - C.arm, vw = Math.min(oV, Math.sqrt(1.6 * oA * e));
        C.armV += clamp(vw - C.armV, -oA * dt, oA * dt);
        C.arm = Math.min(want, C.arm + Math.max(0, C.armV) * dt);
        C.cutting = false;
        if (C.arm >= want - 0.05) C.quick = false;
      } else { C.armV = C.armV > 0 ? Math.max(0, C.armV - CH_OUT_A * dt) : Math.min(0, C.armV + CH_IN_A * dt); if (want <= C.arm + 0.05) C.clearT = 0; }
      W.occ = C.arm - a0; C.want = want; C.tight = tier > 0;
      C.overSee = over && seen ? [overQ, overArm] : null;   // (CAM-OVERSIGHT: the over-his-head view that sees him, below)
    }
    // (over his head: the tilt first, then the arm — out of it the arm first: the way between never crosses the eaves)
    const so = smoothstep(0, 0.6, C.overK), sa = smoothstep(0.4, 1, C.overK), arm = (this.dist = lerp(C.arm, C.overArm ?? CH_OVER_ARM, sa));
    const pitch = (this.pitch = lerp(pq(C.arm), C.overQ ?? CH_OVER_P[0], so));
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
    // (CAM-CLEAR-2: the comfortable lift no steeper than CH_RIM_EL over him, _chaseLift)
    let need = this._chaseLift(_e.set(x, y, z), T, C.tight);
    if (C.pv && !fresh) {
      const vx = (x - C.pv.x) / dt, vy = (y - C.pv.y) / dt, vz = (z - C.pv.z) / dt;
      if (Math.hypot(vx, vz) > 0.5 && Math.hypot(vx, vz) < 60) for (const t of LIFT_AHEAD) { if (t > CH_LIFT_AHEAD) break; const n = this._chaseLift(_e.set(x + vx * t, y + vy * t, z + vz * t), T, C.tight); if (n > 0) need = Math.max(need, n + vy * t); }
    }
    C.pv = { x, y, z };
    const l0 = C.lift;
    // (CAM-FAR: a lift over the ground it swings across is let down only after the need has stayed lower CH_LIFT_HOLD s —
    // the long arm cut in at a wall, lifted over rising ground, lowered and let out again came to reversals of the height
    // within half a second; held, the height only rises in that while)
    C.lowN = !fresh && need < C.lift - 0.02 ? (C.lowN || 0) + dt : 0;
    this._ease(C, C.lowN > 0 && C.lowN < CH_LIFT_HOLD ? Math.max(need, C.lift) : need, dt);
    if (fresh) { C.lift = need; C.vlift = 0; }
    { const hard = this._groundNeed(x, y, z, T, true); if (hard > C.lift) { C.lift = hard; C.vlift = Math.max(0, C.vlift); } }   // (the least, at once)
    W.ground = C.lift - l0;
    cam.position.set(x, y + C.lift, z);
    // never in anything: in, along the line to him, as far as it takes (a tree's trunk the view swung into, a corner the
    // arm was still on its way in to)
    // (closer than CH_MIN, to CH_CLOSE: pressed into a corner it stands over his shoulder rather than lifted over the eaves;
    // only within CH_INSIDE of a surface — the arm search keeps CH_NEAR, so grazing an eave's rim by an inch as he walks
    // along a house doesn't cut it in by metres)
    // (G1-CAM: on the way over his head too — so > 0 —, in along its own tilt; it used to be lifted out over what it was
    // in instead: walking into the station's gate passage, onto the gatehouse roof, 4.7 m up in a frame and 5.7 m back
    // down two frames later)
    // MIN-VIEW: in something, it first tilts up at its own length (never shorter than CH_MIN_VIEW) to a clear spot
    if (this._solidAt(cam.position, CH_INSIDE)) {
      const a = Math.max(so === 0 ? C.arm : arm, CH_MIN_VIEW), q0 = so === 0 ? pq(C.arm) : pitch;
      for (let q = q0 + 0.05; q <= CH_RISE_Q + 1e-6; q += 0.05) {
        at(_b, yaw, a, T, q); _b.y += this._groundNeed(_b.x, _b.y, _b.z, T, true);
        if (this._solidAt(_b, CH_INSIDE) || this._overRoof(_b)) continue;
        cam.position.copy(_b); this.dist = a; this.pitch = q; W.keep = 1;
        break;
      }
      // (CAM-KEYWALK: nor there — something taller than it right behind him, the hostel's portico —: higher over his
      // head at CH_OVER_HI's longer arms before it is drawn in: turning on the spot at the portico's foot the arm was cut
      // in to 1.5 m, into the doorway's reveal behind him)
      if (!W.keep) hi: for (const oa of CH_OVER_HI) {
        if (oa <= a) continue;
        for (const q of CH_OVER_HI_P) {
          if (q < q0) continue;
          at(_b, yaw, oa, T, q); _b.y += this._groundNeed(_b.x, _b.y, _b.z, T, true);
          if (this._solidAt(_b, CH_INSIDE) || this._overRoof(_b)) continue;
          cam.position.copy(_b); this.dist = oa; this.pitch = q; W.keep = 1;
          // (and the arm takes it as its own, over his head: let go, it eases down from there — it used to drop in a
          // frame to the 2 m the arm held underneath, by the fort's south-west tower)
          C.arm = oa; C.armV = 0; C.overArm = oa; C.overQ = q; C.overK = 1;
          break hi;
        }
      }
    }
    if (!W.keep && this._solidAt(cam.position, CH_INSIDE)) {
      // (G1-CAM: at the lift it has where that stands clear — it used to drop to the ground's least as well, up to 0.8 m
      // in the frame the arm came in by, which turned the tilt back against the arm's own: a jolt and a jitter on the
      // Modern street route; under eaves that spot is not clear and it drops as before)
      for (let a = (so === 0 ? C.arm : arm) - 0.1; a >= CH_CLOSE - 1e-6; a -= 0.1) {
        if (so === 0) at(_b, yaw, a); else at(_b, yaw, a, T, pitch);
        const n = this._groundNeed(_b.x, _b.y, _b.z, T, true), y0 = _b.y;
        let l = Math.max(n, C.lift);
        for (_b.y = y0 + l; l > n && this._solidAt(_b, CH_INSIDE); _b.y = y0 + l) l = Math.max(n, l - 0.1);
        if (this._solidAt(_b, CH_INSIDE)) continue;
        cam.position.copy(_b); this.dist = a; W.keep = 1;
        if (so === 0) { C.arm = a; C.armV = 0; this.pitch = pq(a); if (l === n) { C.lift = n; C.vlift = 0; } }
        break;
      }
      // (G1-CAM: nothing clear along its tilt — under the gate arch's springing, 2.2 m up, walking out of the fort yard —:
      // the least lower tilt that is, behind him under the arch, before the last resort below, which lifted it out over
      // the arch onto the gatehouse roof, 5 m up in a frame)
      if (!W.keep) {
        const q0 = so === 0 ? pq(C.arm) : pitch;
        dip: for (let q = q0 - 0.1; q >= CH_DIP_MIN - 1e-6; q -= 0.1) for (let a = Math.min(C.arm, CH_SHORT); a >= CH_CLOSE - 1e-6; a -= 0.1) {
          at(_b, yaw, a, T, q); _b.y += this._groundNeed(_b.x, _b.y, _b.z, T, true);
          if (this._solidAt(_b, CH_INSIDE)) continue;
          cam.position.copy(_b); this.dist = a; this.pitch = q; W.keep = 1;
          if (so === 0) { C.arm = a; C.armV = 0; }
          break dip;
        }
      }
    }
    // (nowhere clear at all — pressed into a corner under a roof: BUG-WALL's least margins, as the other views)
    if (this._solidAt(cam.position, 0)) this._keepOut(cam.position, this.look, 0, 0.4, HARD);
    // CAM-OVERSIGHT (camfollow, his back to a Bug-street house, 0.9 m out from its wall under 0.4 m of eave): on its way
    // over his head the tilt and the arm ease separately, and the spots between the view it had and the one it goes to
    // were never asked whether they see him: backing up to the wall and turning there, it stood on the roof's slope
    // looking down through the eave at him for 20-30 frames, though the view it was going to saw him. Seeing him no
    // more on that way, it takes the least further step along it that does (CH_OVER_SEE of the rest), clear of everything
    if (C.overSee && !lock && !this._sees(cam.position, hero)) {
      const a1 = this.dist, q1 = this.pitch, [q2, a2] = C.overSee;
      for (const f of CH_OVER_SEE) {
        const a = lerp(a1, a2, f), q = lerp(q1, q2, f);
        at(_b, yaw, a, T, q); _b.y += this._groundNeed(_b.x, _b.y, _b.z, T, true);
        if (this._solidAt(_b, CH_INSIDE) || !this._sees(_b, hero)) continue;
        cam.position.copy(_b); this.dist = a; this.pitch = q; W.keep = 1;
        C.overK = 1; C.overArm = a; C.overQ = q; C.overT = Math.max(C.overT || 0, CH_OVER_T);
        break;
      }
    }
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
      // (G1-CAM: and for CH_KEEP_EASE s after the arm was cut in out of something — the camera dropped under an eave
      // with it — the tilt eases that way too, nearer along the same way, instead of flattening in the frame and steepening
      // again as the arm comes on in: a nod, and the jitter on the Modern street route)
      C.keepT = W.keep ? CH_KEEP_EASE : Math.max(0, (C.keepT || 0) - dt);
      if (dv > 0 && dh > 1e-3 && (el > C.el || (C.keepT > 0 && el < C.el - 1e-4))) { const k = Math.max(CH_KEEP_K, dv / Math.tan(C.el) / dh); this.look.x = c.x + (this.look.x - c.x) * k; this.look.z = c.z + (this.look.z - c.z) * k; }   // (further, or nearer, along the same way)
    } else C.el = null;
    // CAM-CLEAR-2: a dialogue: him and whoever talks with him framed together, eased in and back out to the chase
    this._talkShot(dt, hero, fresh);
    cam.lookAt(this.look);
    this.target.copy(hero);
  }

  // CAM-CLEAR-2: a camera at p looking at L: are all of pts inside CH_TALK_FIT of the frame (and in front of it)?
  _fits(p, L, pts, sep = null) {
    const fx = L.x - p.x, fy = L.y - p.y, fz = L.z - p.z, fl = Math.hypot(fx, fy, fz) || 1;
    const f = [fx / fl, fy / fl, fz / fl], rl = Math.hypot(f[2], f[0]) || 1, r = [-f[2] / rl, 0, f[0] / rl];
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    const tv = Math.tan(((this.cam.fov || CH_FOV) * Math.PI) / 360), th = tv * (this.cam.aspect || 1.78);
    for (const q of pts) {
      const vx = q[0] - p.x, vy = q[1] - p.y, vz = q[2] - p.z, z = vx * f[0] + vy * f[1] + vz * f[2];
      if (z < 1) return false;
      if (Math.abs((vx * r[0] + vz * r[2]) / (z * th)) > CH_TALK_FIT || Math.abs((vx * u[0] + vy * u[1] + vz * u[2]) / (z * tv)) > CH_TALK_FIT) return false;
    }
    // (and nobody standing in front of another: each partner's chest CH_TALK_SEP of the frame's width from his, across)
    if (sep) {
      const xs = sep.map((q) => { const vx = q.x - p.x, vz = q.z - p.z, z = vx * f[0] + (q.y + 1.2 - p.y) * f[1] + vz * f[2]; return (vx * r[0] + vz * r[2]) / (Math.max(z, 0.1) * th); });
      for (let i = 1; i < xs.length; i++) if (Math.abs(xs[i] - xs[0]) < CH_TALK_SEP) return false;
    }
    return true;
  }

  // CAM-CLEAR-2: the two-shot of a dialogue: him and those in `who`, from beside his shoulder (CH_TALK_ANG off the line
  // between them, the side nearer the camera first), CH_TALK_P up, as close as frames everyone, clear of everything
  // and seeing every face → { pos, look } or null
  _talkPose(hero, who) {
    const cx = who.reduce((s, p) => s + p.x, 0) / who.length, cz = who.reduce((s, p) => s + p.z, 0) / who.length;
    let dx = cx - hero.x, dz = cz - hero.z, L = Math.hypot(dx, dz);
    if (L < 0.3) { dx = -Math.sin(this.yaw); dz = -Math.cos(this.yaw); L = 1; }
    const back = Math.atan2(-dx, -dz), all = [hero, ...who];
    const look = new THREE.Vector3((hero.x + cx) / 2, all.reduce((s, p) => s + p.y, 0) / all.length + 1.15, (hero.z + cz) / 2);
    const pts = all.flatMap((p) => [[p.x, p.y + 0.2, p.z], [p.x, p.y + 1.8, p.z]]);
    const spread = Math.max(...all.map((p) => Math.hypot(p.x - look.x, p.z - look.z)));
    const cam = this.cam.position, s1 = angleDiff(back, Math.atan2(cam.x - hero.x, cam.z - hero.z)) < 0 ? -1 : 1;
    const piv = _t.set(hero.x, hero.y, hero.z), d0 = clamp(2.2 + spread * 2.2, 4, 9);
    // (from his shoulder's side of the pair: the camera hangs off the look-at point, swung toward him)
    const place = (yw, D, q) => {
      const h = Math.cos(q) * D, p = _e.set(look.x + Math.sin(yw) * h, look.y + Math.sin(q) * D, look.z + Math.cos(yw) * h);
      p.y += this._chaseLift(p, _c.set(piv.x, piv.y, piv.z), false);
      return p;
    };
    for (const k of [1, 1.3, 1.65, 0.8]) for (const ang of CH_TALK_ANG) for (const sg of [s1, -s1]) {
      const p = place(back + sg * ang, d0 * k, CH_TALK_P);
      if (!this._fits(p, look, pts, all) || this._solidAt(p, CH_GAP)) continue;
      if (all.every((q) => this._sees(p, q, true))) return { pos: p.clone(), look };
    }
    // G1-CAM (AUDIT-CH12 #13: Vesk at the beam pad): none clear there — three of them round the arch, Twinsen standing in
    // its ring — it looks all round them (every 15°, the arm's lengths, also from higher up: CH_TALK_PS), the nearest to the
    // view it has and to his shoulder first; failing a clear one, the one with the fewest faces behind something and
    // nobody in front of him. (It used to fall back to the first view merely clear of walls — a post, a rail or the
    // arch's leg not counted — and framed his face through the arch's side; when even that failed it kept the shot of
    // the first speaker alone, with Vesk standing in front of him.)
    // (the side of the line between him and them the view stands on now: crossing it turns who stands left and right)
    const camYaw = Math.atan2(cam.x - look.x, cam.z - look.z), side = (x, z) => Math.sign(dx * (z - hero.z) - dz * (x - hero.x)), s0 = side(cam.x, cam.z);
    let best = null, bc = Infinity;
    for (const k of CH_TALK_K) for (const q of CH_TALK_PS) for (let i = 0; i < 24; i++) {
      const yw = back + (i * Math.PI) / 12;
      const c1 = Math.abs(Math.abs(angleDiff(back, yw)) - CH_TALK_ANG[0]) * 0.5 + Math.abs(angleDiff(camYaw, yw)) * 0.35 + Math.abs(Math.log(k)) * 0.6 + (q - CH_TALK_P) * 1.5;
      if (c1 >= bc) continue;
      const p = place(yw, d0 * k, q), c0 = c1 + (s0 && side(p.x, p.z) === -s0 ? CH_TALK_K_LINE : 0);
      if (c0 >= bc) continue;
      if (!this._fits(p, look, pts) || this._solidAt(p, CH_GAP)) continue;
      let c = c0 + (this._fits(p, look, pts, all) ? 0 : CH_TALK_K_SEP);
      for (const o of all) { if (c >= bc) break; if (!this._sees(p, o, true)) c += this._sees(p, o) ? CH_TALK_K_PART : CH_TALK_K_HID; }
      if (c < bc) { bc = c; best = p.clone(); }
    }
    return best ? { pos: best, look } : null;
  }

  // CAM-CLEAR-2: into the dialogue's two-shot (this.talk) and back out to the chase, eased (CH_TALK_IN s, the shot's own
  // moves at CH_TALK_W); a new scene drops it
  _talkShot(dt, hero, fresh) {
    const cam = this.cam, S = (this.tk ??= { k: 0, n: 0, shot: null, pos: new THREE.Vector3(), look: new THREE.Vector3(), init: false });
    const who = this.talk?.() || null;
    if (fresh) { S.k = 0; S.init = false; S.shot = null; S.n = 0; }
    if (who && who.length) {
      // (worked out when the dialogue starts and whenever someone joins it)
      // (G1-CAM: a new shot more than CH_TALK_CUT round from the one it has is cut to, as a film cuts to the wider shot when
      // someone joins in: gliding half round the group took a second at speed, and its way can pass a mast or a roof)
      if (!S.shot || who.length !== S.n) {
        S.n = who.length;
        const ns = this._talkPose(hero, who);
        if (ns && S.shot && S.init && Math.abs(angleDiff(Math.atan2(S.pos.x - S.look.x, S.pos.z - S.look.z), Math.atan2(ns.pos.x - ns.look.x, ns.pos.z - ns.look.z))) > CH_TALK_CUT) S.init = false;
        S.shot = ns || S.shot; S.miss = !S.shot;
      }
    } else { S.n = 0; if (S.k <= 0) S.shot = null; }
    const on = !!(who && who.length && S.shot);
    S.k = clamp(S.k + (on ? dt : -dt) / CH_TALK_IN, 0, 1);
    if (S.k <= 0 || !S.shot) { S.init = false; return; }
    if (!S.init) { S.pos.copy(S.shot.pos); S.look.copy(S.shot.look); S.init = true; }
    else if (on) {
      // (G1-CAM: round the look-at point, not straight across it: a new shot on the far side of them glides round the
      // group at the distances between, never through their heads or the arch they stand round)
      const w = 1 - Math.exp(-CH_TALK_W * dt), ox = S.pos.x - S.look.x, oz = S.pos.z - S.look.z, oy = S.pos.y - S.look.y;
      const nx = S.shot.pos.x - S.shot.look.x, nz = S.shot.pos.z - S.shot.look.z, ny = S.shot.pos.y - S.shot.look.y;
      const a0 = Math.atan2(ox, oz), a = a0 + angleDiff(a0, Math.atan2(nx, nz)) * w, r = lerp(Math.hypot(ox, oz), Math.hypot(nx, nz), w);
      S.look.lerp(S.shot.look, w);
      S.pos.set(S.look.x + Math.sin(a) * r, S.look.y + lerp(oy, ny, w), S.look.z + Math.cos(a) * r);
    }
    const e = smoothstep(0, 1, S.k);
    cam.position.lerp(S.pos, e);
    this.look.lerp(S.look, e);
    // (on the way between the two, or round to a new shot, never in anything)
    if (this._solidAt(cam.position, 0)) this._keepOut(cam.position, this.look, 0, 0.4, HARD);
    this.why.talk = e;
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
  _clearance(x, y, z, tall = null, base = 1.5, k = 1, rock = false) {
    const T = this.terrain, P = this.physics, occ = this.occ?.(), top = CLEAR_TOP * k, W = k < 1 ? hardW : clearW;
    let need = Math.max(T.heightAt(x, z) + base, base) - y;   // (the ground straight under it, as before)
    // (`rock`, the LBA view's comfortable lift: a face beside it is for the swing up over him, see CLIFF_CAP; the lift asks no
    // more than CLIFF_CAP over what the ground under it asks)
    const lim = rock ? need + CLIFF_CAP : Infinity;
    // (PERF-CPU: indexed loops, no destructuring iterators: this runs for ~a dozen camera candidates a frame and was the
    //  largest single source of garbage in a frame, ~175 KB)
    for (let i = 0; i < RING.length; i++) { const e = RING[i], r = e[0]; if (k < 1 && r > HARD_R) break; const n = Math.min(lim, T.heightAt(x + e[1], z + e[2]) + lerp(base, 0.3 * k, r / CLEAR_R) - y); if (n > need) need = n; }
    if (P) {
      _seen.clear();
      for (let q = 0; q < 4; q++) { const L = P.near(x + CORNERS[q][0], z + CORNERS[q][1]); for (let ci = 0; ci < L.length; ci++) { const c = L[ci];
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
      } }
    }
    if (occ) {
      _seen.clear();
      for (let q = 0; q < 4; q++) { const L = occ.near(x + CORNERS[q][0], z + CORNERS[q][1]); for (let vi = 0; vi < L.length; vi++) { const v = L[vi];
        if (_seen.has(v)) continue;
        _seen.add(v);
        if (v.y0 > y + 1 || v.top + top <= y) continue;
        let t = occ.topAt(v, x, z), n = t > -Infinity ? t + top - y : 0;
        for (let i = 0; i < RING.length; i++) { const e = RING[i], r = e[0]; if (k < 1 && r > HARD_R) break; t = occ.topAt(v, x + e[1], z + e[2]); if (t > -Infinity) n = Math.max(n, (t + top - y) * W(r)); }
        need = Math.max(need, n);
      } }
    }
    return Math.max(0, need);
  }

  // ROCK FACES: how far (m) from (x, y, z) the terrain first climbs more than CLIFF_CAP above y, at most `reach` (a continuous
  // measure: the crossing is placed between samples by the height, so it moves smoothly as the camera does)
  _faceDist(x, y, z, reach) {
    const T = this.terrain, lvl = y + CLIFF_CAP;
    let best = reach;
    if (T.heightAt(x, z) > lvl) return 0;
    for (const [sx, sz] of FACE_DIRS) {
      let h0 = T.heightAt(x, z);
      for (let r = 0.5; r < best + 0.5; r += 0.5) {
        const h1 = T.heightAt(x + sx * r, z + sz * r);
        if (h1 > lvl) { best = Math.min(best, r - 0.5 + 0.5 * (lvl - h0) / (h1 - h0)); break; }
        h0 = h1;
      }
    }
    return best;
  }

  // ROCK FACES: the camera hung off the look-at point (the focus F, looking at F.y + 1) at heading yaw, with the arm swung up
  // by k: pitch → max(pitch, CLIFF_P), length → min(dist, CLIFF_A)
  _armAt(fx, fy, fz, yaw, pitch, dist, k, out) {
    const p = lerp(pitch, Math.max(pitch, CLIFF_P), smoothstep(0.3, 1, k)), d = lerp(dist, Math.min(dist, CLIFF_A), smoothstep(0, 0.7, k)), c = Math.cos(p) * d;
    return out.set(fx + Math.sin(yaw) * c, fy + 1 + Math.sin(p) * d, fz + Math.cos(yaw) * c);
  }

  // ROCK FACES: the least swing k (0..1) that stands the view CLIFF_R m clear of a face (0 where nothing is near it)
  _cliffK(fx, fy, fz, yaw, pitch, dist) {
    if (!this.terrain) return 0;
    const bad = (k) => { const c = this._armAt(fx, fy, fz, yaw, pitch, dist, k, _cd); return this._faceDist(c.x, c.y, c.z, CLIFF_R) < CLIFF_R; };
    if (!bad(0)) return 0;
    let lo = 0, k = CLIFF_STEP;
    for (; k < 1 && bad(k); k += CLIFF_STEP) lo = k;
    if (k >= 1 && bad(1)) return 1;
    let hi = Math.min(k, 1);
    for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (bad(m)) lo = m; else hi = m; }   // (to the thousandth: the view slides along the face, no steps)
    return hi;
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
    const dist = 90, view = R.wide ? R.view : Math.min(R.view, this.isoMax ?? ISO_MAX.far), closer = view < R.view;   // (ISO-CLOSE)
    cam.fov = (2 * Math.atan((view / 2) / dist) * 180) / Math.PI;
    cam.updateProjectionMatrix();
    const goal = R.center.clone().lerp(hero, closer ? Math.max(R.follow ?? 0.3, 0.85) : R.follow ?? 0.3);
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
      const half = view / 2, maxR = half * (cam.aspect || 1.78) * 0.42, maxF = (half * 0.36) / Math.sin(pitch);
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
  _ease(st, need, dt, vMax = LIFT_V, aMax = LIFT_A) {
    const e = need - st.lift, want = Math.sign(e) * Math.min(vMax, Math.sqrt(1.6 * aMax * Math.abs(e)), Math.abs(e) * (e > 0 ? LIFT_UP_W : LIFT_DOWN_W)), a = aMax * dt;
    st.vlift += clamp(want - st.vlift, -a, a);
    st.lift = Math.max(0, st.lift + st.vlift * dt);
  }
}
