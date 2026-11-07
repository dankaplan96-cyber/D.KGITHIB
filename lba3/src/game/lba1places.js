// LBA1's places, rebuilt from their layouts (src/game/lba1room.js, assets/lba1/*.json, numbers only):
//   asylum   FunFrock's asylum on Citadel (LBA1 room 0, where LBA1 began). ASYLUM-2 (the cloud's answer, 3.11.2026):
//            twelve years on it is, officially, the Joint Project's hostel for its Esmer workers from Zeelich, and behind
//            it Vesk's hidden storehouse (src/game/asylumhostel.js: the dressing, the offices, the handles). Its two
//            doors are LBA1's two exits: the front door on the upper level (a brick portico against the old fort's
//            south wall, at the top of the stair onto the fort's terrace) and the low stair-well as the side door (the
//            squat block-house round the corner outside the fort's east wall), both ways, every chapter.
//            The old register lies in the office (a search), a giver behind the desk.
//            ASYLUM-1: after FunFrock fell it was bricked up by order of the Council; the Joint Project's digging under
//            the fort broke back into it. The bricking at the stair-well lies broken (its rubble by the block-house
//            door, the Council's plaque beside it), the dig's breach gapes in the west wall with the project's cable
//            out of it. Twinsen's own cell (where LBA1 starts him) has his scratch marks, a warm pipe through it, and a
//            find (flag as_cell). The rooms are cut open over him as in LBA1 (lba1room.js, lids).
//   bumaze   the Temple of Bù's spiked maze (LBA1 room 57), down a stair from our Temple of Bù (chapter 4); at its
//            far end the chest and the way back up (DECLUTTER, 3.11.2026: the dark halls, LBA1 room 40, that came
//            after it are merged into it: one optional room, one chest)
// Doors and exits are open in every chapter (src/game/story/index.js via lba1Doors / lba1Exit).
import * as THREE from 'three';
import { buildLba1Room, hasLba1Room } from './lba1room.js';
import { Kit, M as cachedMat } from './props.js';
import { streetDist } from './town.js';
import { mat as rigMat } from '../engine/rig.js';
export { hasLba1Room };
import { MAT, rbox, plane, cyl, canvasTex } from './props.js';
import { tube } from './kit.js';
import { buildAsylumFront, dressAsylum, ASYLUM_FRONT } from './asylumhostel.js';
export { ASYLUM_FRONT };

export const LBA1_AT = { asylum: { x: 7000, z: 0 }, bumaze: { x: 7200, z: 0 } };
export const ASYLUM_DOOR = { x: -11.2, z: -65, a: Math.PI / 2 };   // the side door (outside the fort's east wall, facing east)

// ASYLUM-1's decals (drawn: no words but the project's sign): Twinsen's tally marks, scratched in groups of five
// (twelve years ago, in LBA1); the dark mouth of the dig's breach, ragged brick round it
const marksTex = () => canvasTex(256, 128, (x, W, H) => {
  x.clearRect(0, 0, W, H); x.lineCap = 'round';
  let rnd = 7; const r = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  for (let g = 0; g < 9; g++) {
    const gx = 14 + (g % 5) * 46, gy = 14 + Math.floor(g / 5) * 58, n = g === 8 ? 3 : 5;
    for (let i = 0; i < Math.min(4, n); i++) {
      const px = gx + i * 8 + r() * 2;
      x.strokeStyle = 'rgba(240,232,214,0.95)'; x.lineWidth = 4.6; x.beginPath(); x.moveTo(px, gy + r() * 3); x.lineTo(px + r() * 3 - 1, gy + 40 + r() * 4); x.stroke();
      x.strokeStyle = 'rgba(24,20,18,0.7)'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(px + 1.5, gy + 2); x.lineTo(px + 2, gy + 40); x.stroke();
    }
    if (n === 5) { x.strokeStyle = 'rgba(240,232,214,0.95)'; x.lineWidth = 4.6; x.beginPath(); x.moveTo(gx - 4, gy + 34); x.lineTo(gx + 32, gy + 8); x.stroke(); }
  }
});
const breachTex = () => canvasTex(256, 256, (x, W, H) => {
  x.clearRect(0, 0, W, H);
  let rnd = 11; const r = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  const pts = []; for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2, k = 0.72 + r() * 0.28; pts.push([W / 2 + Math.cos(a) * W * 0.42 * k, H * 0.56 + Math.sin(a) * H * 0.42 * k * (Math.sin(a) > 0 ? 0.7 : 1)]); }
  const path = (s) => { x.beginPath(); pts.forEach(([px, py], i) => { const qx = W / 2 + (px - W / 2) * s, qy = H * 0.56 + (py - H * 0.56) * s; if (i) x.lineTo(qx, qy); else x.moveTo(qx, qy); }); x.closePath(); };
  path(1.12); x.fillStyle = 'rgba(96,84,74,0.9)'; x.fill();          // (the broken brick round the hole)
  path(1.0); const g = x.createRadialGradient(W / 2, H * 0.6, 8, W / 2, H * 0.56, W * 0.42); g.addColorStop(0, '#050404'); g.addColorStop(1, '#1c1714'); x.fillStyle = g; x.fill();
  x.strokeStyle = 'rgba(40,34,30,0.9)'; x.lineWidth = 2; for (let i = 0; i < 9; i++) { const [px, py] = pts[Math.floor(r() * pts.length)]; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (px - W / 2) * 0.25, py + (py - H / 2) * 0.25); x.stroke(); }
});
const signTex = (lines) => canvasTex(512, 160, (x, W, H) => {
  x.fillStyle = '#d8d4c8'; x.fillRect(0, 0, W, H); x.strokeStyle = '#3a3a40'; x.lineWidth = 8; x.strokeRect(4, 4, W - 8, H - 8);
  x.fillStyle = '#2a2a30'; x.textAlign = 'center'; x.font = 'bold 40px serif'; x.fillText(lines[0], W / 2, 62);
  x.font = '26px serif'; x.fillText(lines[1], W / 2, 112);
});

// the block-house over the asylum's stair (the side door, ASYLUM-2), on Citadel (world coordinates)
function asylumDoor(scene, physics) {
  const { x, z } = ASYLUM_DOOR, gy = physics.groundAt(x + 1.5, z);
  const g = new THREE.Group(); g.position.set(x, gy, z); scene.add(g);
  const stone = MAT.stone('grey', 2), iron = MAT.iron();
  const add = (geo, m, px, py, pz, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  add(rbox(3.0, 2.8, 3.6, 0.08), stone, -0.3, 1.4, 0);
  add(rbox(3.3, 0.25, 3.9, 0.05), MAT.rubble('grey'), -0.3, 2.9, 0);
  add(rbox(0.12, 2.0, 1.3, 0.02), iron, 1.25, 1.0, 0);
  for (const s of [-1, 1]) add(rbox(0.16, 2.2, 0.16, 0.02), MAT.paint('#5a2a2a', 0.5), 1.27, 1.1, s * 0.72);
  // FunFrock's old emblem over the door, painted out
  add(new THREE.CircleGeometry(0.32, 16), MAT.flat('#7a3a3a', 0.8), 1.33, 2.35, 0, Math.PI / 2);
  add(plane(1.5, 0.47), MAT.map(signTex(['Joint Project', 'Service stair · staff only']), 0.8, { side: THREE.DoubleSide }), 1.6, 1.5, 1.35, Math.PI / 2);
  add(cyl(0.05, 0.06, 1.2, 6), MAT.wood('dark'), 1.6, 0.6, 1.35);
  physics.add({ type: 'box', x: x - 0.3, z, hw: 1.5, hd: 1.8, rot: 0, top: gy + 3.0 });
  // ASYLUM-1: the bricks that walled the door up, knocked out and heaped either side of it (the project broke in)
  const brick = MAT.stone('grey', 1), mortar = MAT.rubble('grey');
  let rnd = 5; const r = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  for (const [bx, bz, n] of [[1.75, -1.0, 9], [1.85, 1.0, 6]]) {
    add(rbox(0.5, 0.22, 0.55, 0.04), mortar, bx, 0.1, bz, 0.3);
    for (let i = 0; i < n; i++) add(rbox(0.26, 0.11, 0.13, 0.015), brick, bx + (r() - 0.5) * 0.7, 0.07 + (i % 3) * 0.1, bz + (r() - 0.5) * 0.6, r() * 3);
  }
  return { x: x + 1.65, z };
}

// CLIMB-1 (the user's playtest, 4.11: "in LBA2 the way up was paved and orderly, ours is dirt again"): the way from the
// town up to the old fort's terrace, where the asylum's door stands, made one paved, orderly way as LBA2's Citadel climbs
// its terraces north of the square: a long straight way between dressed stone retaining walls, square stone posts with
// heavy caps on the edges (the original's b29) and iron rails where the ground falls away. Ours, twelve years on and on
// our own ground (world.js: the terrain is unchanged):
//   the ramp     world.js PATHS[0] from the square to the fork below the fort (CLIMB_RAMP), on its ground as it was:
//                paved now with the town's cobbles (world.js islandSplat, climbPaveDist), granite kerbs as the town's
//                streets have, and where it climbs past the stone house's yard (a 3–4 m drop on its east side) a dressed
//                stone retaining wall with a coping, capped posts and a railing (CLIMB_WALL)
//   the stair    from the ramp's end due north up the first ledge to a landing on the low shelf, then turned 90° due east,
//                square to the hostel's portico, up between two walls onto the terrace's forecourt (ASYLUM_STEPS; it
//                replaces WORLD-AUDIT's narrow 1 m stair; CLIMB-2: the turn, the user's "it leads into a wall", and
//                CLOUD_ORDERS 16): 23 + 6 dressed steps, 2.6 m wide, between cheek walls with a coping, capped posts at the
//                corners (CLIMB-15: not halfway), railings where the ground falls away; beside the second flight the terrace is filled
//                out to it behind dressed walls with railings
//   the terrace  before the fort's south wall (CLIMB_TERRACE), paved from the flight's top to the wall's foot, where
//                ASYLUM-2's front door stands; a railing on a stone plinth with capped posts along its edge over the cliff
// Walkable by input: each riser ~0.24 m, never over 0.26 (physics STEP_UP 0.55), each tread 0.385 m,
// above the slope it covers (raised where the ground stands higher, never lower than the one before); each step's
// collider runs on under the steps above it, so the seam between two treads never reads as the ground below them. Walls,
// cheeks and railings stop a walk or a fall off the edge and let the camera look over them (see-through). Nothing a story
// uses moves: the stump's clover (island.js STUMP), the stone house's upper door, the water main's legs keep their room.
// The scatter keeps out of the masonry and off the paved terrace, and the cliff rocks under the flight are left out whole
// (world.js, climbClear).
export const ASYLUM_STEPS = { a: [-32.6, -35.0], b: [-32.6, -45.0], w: 2.6, n1: 23, n2: 6, run: 0.385, cheek: 0.4 };
// CLOUD_ORDERS 17 (the user's photo at the climb's foot: "can't it be straightened? it doesn't look good"): the ramp's
// second leg ran ~10.6° off the flight into a round apron, the shelf's wall slanting in at the left. Its last stretch
// now runs on the flight's own axis: the second leg (on its old line, PATHS[0]'s, which the ground's ramp and the
// scatter keep) comes up past the stone house to a landing at the yard's edge (CLIMB_JOG), square to the flight; from
// its east half the ramp runs due north, x −32.6, 8 m straight into the first step between the shelf's wall on its west
// and a parapet over the yard on its east, all one line with the flight's cheeks and posts, ending in a square landing
// the flight's width with its cheeks (CLIMB_FOOT), level, open west onto the shelf and the way to the plateau, east to
// the stump's bank. (Why a landing and not one bend: the stone house's back corner stands 0.8 m east of the axis 3 m
// south of the yard's edge, so a single leg from the old line onto the axis would put its wall on the house's eaves.)
export const CLIMB_RAMP = [[-42, -4], [-37, -20], [-35.3125, -29.0]];   // (world.js PATHS[0]'s line, the second leg ending in the landing)
const CLIMB_HW = 1.55;                                           // the paved ramp's half width
export const CLIMB_WALL = { s0: 0.8, s1: 7.83, o0: 1.62, o1: 2.1 };   // along the second leg (LEG2): from, to; inner, outer face
// the straight on the flight's axis (FL), its landings and walls, world boxes [x0, z0, x1, z1] (z0 the north edge)
const AX = ASYLUM_STEPS.a[0];
// (the walls' faces over the yard and under the shelf stand on the terrain's grid lines, 0.929 m: x −34.214, −30.5 and
//  z −27.643, so the paving keeps its level right to their faces and the ground falls away only behind them)
export const CLIMB_JOG = [-36.85, -29.6, AX + 1.62, -27.64];       // the landing at the yard's edge (paved)
export const CLIMB_STRAIGHT = [AX - 1.62, -35.3, AX + 1.62, -27.64]; // the straight, paved; under the first steps
export const CLIMB_FOOT = [AX - 1.7, -35.3, AX + 1.7, -32.6];      // the square landing at the flight's foot, level
export const CLIMB_FOOT_Y = 9.45;                                    // its level: the shelf's fill 16 cm over it, the stump's bank about level
// (world.js climbGround: the ground in the three boxes level across, rising with z from the second leg's height at
//  the landing's south edge to CLIMB_FOOT_Y at the foot landing's south edge)
export const CLIMB_TERRACE = [[-28.6, -50.4, -22.8, -43.2], [-31.9, -50.4, -28.6, -47.7]];   // paved boxes [x0, z0, x1, z1]
// CLIMB-15 (the user: "it isn't like the structure in LBA2"): LBA2's ramp north of the square climbs along the dressed
// face of the terrace above it, the terrace standing level behind its own retaining wall, a capped post on its corner.
// Ours: where the second shelf (world.js level(2), 9.61 m) stands over the ramp, its edge is a retaining wall, its
// coping level, `top`; behind it the shelf filled level with its top (a stone fill, as the terrace's by the stair, never
// coplanar with the ground). CLOUD_ORDERS 17: the wall runs along the straight's west side, from the landing at the
// yard's edge (CLIMB_JOG) to the foot landing (zn), and turns west along the landing's north edge and on along the
// shelf's face (the return, its face at z, xw its west end); the fill behind both and on north beside the foot landing
// to the flight's west cheek (no notch at the cheek's foot), out to where the shelf's own ground rises within 15 cm of
// the top (no further west than xw)
export const CLIMB_SHELF = { top: 9.61, th: 0.48, z: CLIMB_JOG[1], xw: -42.08, xs: AX - 1.62, zn: CLIMB_FOOT[3] };

const seg = (P, x, z) => { let d = 1e9; for (let i = 0; i < P.length - 1; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return d; };
const boxD = (x, z, x0, z0, x1, z1) => { const dx = Math.max(x0 - x, x - x1), dz = Math.max(z0 - z, z - z1); return dx > 0 && dz > 0 ? Math.hypot(dx, dz) : Math.max(dx, dz); };
const inBox = (x, z, [x0, z0, x1, z1], pad = 0) => x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad;
// a straight run: its axis from a to b, local (s along, o to the right) ↔ world
const axis = ([ax, az], [bx, bz]) => {
  const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
  return { L, ux, uz, a: Math.atan2(ux, uz), at: (s, o = 0) => [ax + ux * s - uz * o, az + uz * s + ux * o], local: (x, z) => [(x - ax) * ux + (z - az) * uz, -(x - ax) * uz + (z - az) * ux] };
};
// (RW: the second leg's line as it always stood, PATHS[0]'s: its parapet and the ground's fill beside it keep that frame)
const FL = axis(ASYLUM_STEPS.a, ASYLUM_STEPS.b), RW = axis([-37, -20], [-34, -36]);
// the walls of the straight and its landings (world boxes [x0, z0, x1, z1]): the parapet along the landing's south
// edge over the yard (from the second leg's parapet's end post to the corner), the parapet along the straight's east
// side as far as the yard's edge (`CLIMB_E_END`; past it the stump's bank comes down to the kerb, so its roots keep their
// ground), the shelf's wall and its return
const PAR_TH = CLIMB_WALL.o1 - CLIMB_WALL.o0, S1_POST = RW.at(CLIMB_WALL.s1, (CLIMB_WALL.o0 + CLIMB_WALL.o1) / 2);
const CLIMB_E_END = -29.9;
const W_SOUTH = [S1_POST[0], CLIMB_JOG[3], CLIMB_JOG[2] + PAR_TH, CLIMB_JOG[3] + PAR_TH];
const W_EAST = [CLIMB_JOG[2], CLIMB_E_END, CLIMB_JOG[2] + PAR_TH, CLIMB_JOG[3] + PAR_TH];
const W_RET = [CLIMB_SHELF.xw, CLIMB_SHELF.z - CLIMB_SHELF.th, CLIMB_SHELF.xs, CLIMB_SHELF.z];
const W_WEST = [CLIMB_SHELF.xs - CLIMB_SHELF.th, CLIMB_SHELF.zn, CLIMB_SHELF.xs, CLIMB_SHELF.z - CLIMB_SHELF.th];
// the corner where the second leg's west edge meets the return's face (its post)
const LEG_CORNER = (() => { const s = (CLIMB_SHELF.z - RW.at(0, -CLIMB_WALL.o0)[1]) / RW.uz; return RW.at(s, -CLIMB_WALL.o0); })();
// (the user, 5.11, a photo: "there is still a hole here": the ramp was paved on its old ground, which falls away toward
//  the retaining wall's foot, so the cobbles dipped into a trough between the walk and the wall.) The ground across the
//  ramp beside the wall is filled up to the ramp's own height on its axis (never dug), easing out at the wall's ends and
//  past the west kerb, under the wall and a cell past it; beyond, the yard's drop is as it was. world.js islandHeight0 asks this.
export function climbRampFill(x, z, h, H) {
  if (x < -44 || x > -28 || z < -40 || z > -14) return h;
  const [rs, ro] = RW.local(x, z), S0 = -0.2, S1 = 11.0, E = 2.0;   // (CLOUD_ORDERS 17: as it stood, the wall then ran to 10.0: the scatter sees this ground, so no random draw moves)
  if (rs < S0 - E || rs > S1 + E || ro < -CLIMB_HW - 1.2 || ro > CLIMB_WALL.o1 + 0.65) return h;   // (under the wall and one ground cell, 0.93 m, past it: the terrain's triangles fold at the last filled vertex)
  const [ax, az] = RW.at(rs, 0), hc = H(ax, az);
  if (hc <= h) return h;
  const ss = (a, b, v) => { const k = Math.max(0, Math.min(1, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
  const w = ss(S0 - E, S0, rs) * (1 - ss(S1, S1 + E, rs)) * (ro < -CLIMB_HW ? 1 - ss(-CLIMB_HW, -CLIMB_HW - 1.2, ro) : 1);
  return h + (hc - h) * w;
}
// CLIMB-2: the stair's upper half on its east side is cut into the terrace: a dressed wall from the terrace's south edge
// (TERRACE_Z, where it meets the stair: CORNER) to the top step, the terrace filled out to it over the old gully (the
// user's photo: a dark wedge and a raw rock face between the stair's cheek and the terrace's plinth). OE: the wall's
// line (its middle), across the stair's axis
const OE = ASYLUM_STEPS.w / 2 + 0.17, TERRACE_Z = -42.97;
const S_CORNER = (TERRACE_Z - ASYLUM_STEPS.a[1] - FL.ux * OE) / FL.uz, CORNER = FL.at(S_CORNER, OE);
// CLIMB-2 (the user: "make a turn toward the door's forecourt; now it leads into a wall"; CLOUD_ORDERS 16: square to the
// portico, no trench, room for the camera at the top): the stair runs square to the terrace and the hostel's portico. The
// first flight (FL) runs due north from the ramp's end to a landing on the low shelf (S1: its last step's end; the
// landing a square beyond it, the step before it its south part); the second (FL2) leaves the landing's east edge
// turned 90°, due east, and rises between two walls cut into the terrace onto the forecourt, 5 m before the fort's
// wall. T2_0: where its first step starts (the landing's east edge); T2_TOP: its top. K: where the terrace's wall along
// the first flight turns to run along the second
const S1 = ASYLUM_STEPS.n1 * ASYLUM_STEPS.run, HW = ASYLUM_STEPS.w / 2;
const LC = FL.at(S1 + HW, 0), D2 = [-FL.uz, FL.ux];
const FL2 = axis(LC, [LC[0] + D2[0], LC[1] + D2[1]]);
const T2_0 = HW, T2_TOP = T2_0 + ASYLUM_STEPS.n2 * ASYLUM_STEPS.run;
const T_K = OE, S_K = S1 + HW - OE;
const TERRACE_RAIL = [CORNER, [-28.3, -42.9], [-23.3, -42.6]];
const CLIMB_PAVED = [CLIMB_JOG, CLIMB_STRAIGHT, CLIMB_FOOT];
// signed distance to the paved way (negative on it): the ramp, the landing at the yard's edge, the straight and the
// square landing at the flight's foot, the terrace (world.js)
export function climbPaveDist(x, z) {
  if (x < -48 || x > -20 || z < -52 || z > 6) return 99;
  let d = seg(CLIMB_RAMP, x, z) - CLIMB_HW;
  for (const [x0, z0, x1, z1] of CLIMB_PAVED) d = Math.min(d, boxD(x, z, x0, z0, x1, z1));
  for (const [x0, z0, x1, z1] of CLIMB_TERRACE) d = Math.min(d, boxD(x, z, x0, z0, x1, z1));
  return d;
}
// the shelf's fill (CLOUD_ORDERS 17): rows across it, [z, east edge, west edge], from the return's back north past the
// foot landing to where the ground beside the flight's cheek stands within 15 cm of the top; each row from its east
// edge (the wall's back, then the foot landing's and the cheek's line) west to where the shelf's ground rises within
// 15 cm of the top (less 0.1, never coplanar with it), no further than the return's west end. On the terrain's own
// heights: world.js asks it once the terrain is built (so the rocks and the scatter keep out of it), the climb builds it
let SHELF_ROWS = null;
export function climbShelfRows(T) {
  if (SHELF_ROWS) return SHELF_ROWS;
  const C = CLIMB_SHELF, lim = C.top - 0.15, rows = [];
  let thin = 0;
  for (let z = C.z - C.th + 0.05; z > -38; z -= 0.25) {
    const xe = z > C.zn ? C.xs - C.th + 0.05 : AX - 1.7;
    let x = xe - 0.3;
    while (x > C.xw + 0.05 && T(x, z) < lim) x -= 0.05;
    const xw = Math.min(xe - 0.3, x + 0.1);
    if (z < C.zn && T(xe - 0.05, z) >= lim) { if (++thin >= 2) break; continue; }
    rows.push([z, xe, xw]);
  }
  return (SHELF_ROWS = rows);
}
function inShelf(x, z, pad = 0) {
  if (inBox(x, z, W_RET, pad) || inBox(x, z, W_WEST, pad)) return true;
  if (z > CLIMB_SHELF.z - CLIMB_SHELF.th + pad || x > AX - 1.7 + pad || x < CLIMB_SHELF.xw - pad) return false;
  if (!SHELF_ROWS) return z > -38 - pad;
  for (const [rz, xe, xw] of SHELF_ROWS) if (Math.abs(rz - z) < 0.13 + pad && x > xw - pad && x < xe + pad) return true;
  return false;
}
// inside the masonry (the flight with its cheeks and posts, the ramp's walls, the shelf's wall and fill, the terrace's
// railing), grown by pad
export function climbMasonry(x, z, pad = 0) {
  if (x < -44.5 || x > -20 || z < -52 || z > -16) return false;
  if (inShelf(x, z, pad)) return true;
  if (inBox(x, z, W_SOUTH, pad + 0.4) || inBox(x, z, W_EAST, pad + 0.4)) return true;   // (the parapets with their posts)
  const S = ASYLUM_STEPS, [s, o] = FL.local(x, z), [t, l] = FL2.local(x, z), half = S.w / 2 + S.cheek + 0.1;
  if (s > -0.5 - pad && s < S1 + S.w + S.cheek + 0.3 + pad && Math.abs(o) < half + pad) return true;   // (the first flight, the landing)
  if (t > -0.3 - pad && t < T2_TOP + 0.3 + pad && Math.abs(l) < half + pad) return true;              // (the second flight)
  if (t > T2_TOP - pad && t < T2_TOP + 1.6 + pad && l < TOP_L[0] + pad && l > -3.0 - pad) return true;   // (its threshold, CLOUD_ORDERS 21)
  if (s > S_CORNER - 0.2 - pad && o > 1.2 - pad && l > 1.2 - pad && x < -27.4 + pad && z < -42.8 + pad) return true;   // (the gully south of the second flight, filled)
  if (t > T2_0 - 0.3 - pad && t < T2_TOP + 0.3 + pad && l < -1.2 + pad && l > -4.6 - pad) return true;              // (and north of it)
  const [rs, ro] = RW.local(x, z);
  if (rs > CLIMB_WALL.s0 - 0.4 - pad && rs < CLIMB_WALL.s1 + 0.4 + pad && ro > CLIMB_WALL.o0 - pad && ro < CLIMB_WALL.o1 + 0.1 + pad) return true;
  return seg(TERRACE_RAIL, x, z) < 0.35 + pad;
}
// (CLOUD_ORDERS 17: the ground CLIMB-15's shelf wall and fill kept clear along the second leg, as it stood, so nothing
//  the scatter left out there since comes back: no tree or rock face appears where the player has seen none)
const OLD_SHELF_F0 = RW.at(8.6, -1.62);
const wasShelf = (x, z, pad) => {
  const [rs, ro] = RW.local(x, z);
  if (rs > 8.1 - pad && rs < 15.9 + pad && ro < -1.62 + pad && ro > -5.7 - pad) return true;
  return x > OLD_SHELF_F0[0] - 5.58 - pad && x < OLD_SHELF_F0[0] + pad && z < OLD_SHELF_F0[1] + pad && z > OLD_SHELF_F0[1] - 4.08 - pad;
};
// the scatter keeps out of the masonry and off the paved terrace, the straight and its landings (world.js)
export function climbClear(x, z, pad = 0) {
  if (climbMasonry(x, z, pad) || wasShelf(x, z, pad)) return true;
  for (const [x0, z0, x1, z1] of CLIMB_TERRACE) if (boxD(x, z, x0, z0, x1, z1) < pad) return true;
  for (const [x0, z0, x1, z1] of CLIMB_PAVED) if (boxD(x, z, x0, z0, x1, z1) < pad) return true;
  return false;
}
// the cliff's rock faces left out whole where they meet the masonry or the new paving (world.js dropRocks)
export function climbDropRock(x, z) {
  if (climbMasonry(x, z, 0.05) || wasShelf(x, z, 0.05)) return true;
  for (const [x0, z0, x1, z1] of CLIMB_PAVED) if (boxD(x, z, x0, z0, x1, z1) < 0.05) return true;
  return false;
}

// CLIMB-2: the steps' stone (the user: the sandstone's courses read as fine stripes on the step fronts): a dressed
// sandstone slab texture with joints across the stair only (no courses: a tread is one slab deep), 2.6 m to a tile,
// each step's joints shifted its own way; the riser the same stone a shade darker
const stepTex = (dark) => {
  const t = canvasTex(512, 64, (x, W, H) => {
    let r = dark ? 31 : 17; const rnd = () => ((r = (r * 16807) % 2147483647) / 2147483647);
    const base = dark ? [176, 156, 120] : [206, 188, 152];
    x.fillStyle = `rgb(${base})`; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { const kk = 0.9 + rnd() * 0.2, rr = 1 + rnd() * 3; x.fillStyle = `rgba(${base.map((c) => Math.round(c * kk)).join(',')},0.55)`; x.fillRect(rnd() * W, rnd() * H, rr * 2, rr); }
    let px = 0;
    while (px < W) {
      const w = 120 + rnd() * 90, kb = 0.94 + rnd() * 0.1;
      x.fillStyle = `rgba(${base.map((c) => Math.round(c * kb)).join(',')},0.35)`; x.fillRect(px + 2, 0, w - 4, H);
      x.fillStyle = 'rgba(70,58,42,0.55)'; x.fillRect(px, 0, 3, H);
      px += w;
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};
const stepMat = (dark) => cachedMat('climbStep' + dark, () => { const m = new THREE.MeshStandardMaterial({ map: stepTex(dark), roughness: 0.88 }); m.userData.tile = 2.6; return m; });

// a square stone post with a heavy pale cap, as LBA2's b29 that marks the corners of its terraces (CLIMB-15: in its
// proportions now, a little smaller: a 0.72 m shaft, a 0.92 m cap slab and a 0.6 m block on it, ~1.45 m tall; only
// at the climb's corners and ends, as the original has them, not every few metres), standing on y, h tall
const POST_W = 0.72, POST_HALF = POST_W / 2;
function climbPost(k, M, physics, x, z, y, h = 1.45, a = 0) {
  k.add(rbox(POST_W, h - 0.32, POST_W, 0.03), M.wall, x, y + (h - 0.32) / 2, z, a);
  k.add(rbox(POST_W + 0.08, 0.07, POST_W + 0.08, 0.02), M.cap, x, y + h - 0.325, z, a);   // (a thin band under the cap; each piece's top inside the next: no shared faces)
  k.add(rbox(0.92, 0.18, 0.92, 0.04), M.cap, x, y + h - 0.21, z, a);
  k.add(rbox(0.6, 0.12, 0.6, 0.04), M.cap, x, y + h - 0.07, z, a);
  physics.add({ type: 'box', x, z, hw: 0.46, hd: 0.46, rot: a, top: y + h, noStand: true, seeThrough: true, camSkip: true });   // (the camera passes a post, as a branch: engine/camera.js NEAR-CUT hides it)
}
// a wall's collision with a railing on it: the stone to `stone` (solid to the camera too), the railing over it to
// `rail` (it stops him; the camera looks and passes over it: camSkip)
function climbRailCol(physics, x, z, hw, hd, rot, stone, rail) {
  physics.add({ type: 'box', x, z, hw, hd, rot, top: stone, noStand: true, seeThrough: true });
  physics.add({ type: 'box', x, z, hw, hd, rot, top: rail, noStand: true, seeThrough: true, camSkip: true });
}
// a railing along a straight run: balusters every ~0.3 m from y0(s) up to the top rail at y1(s) (iron, the town's teal)
function climbRail(k, M, x0, z0, x1, z1, y0a, y0b, h = 0.62) {
  const L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0), p = Math.atan2(y0b - y0a, L), n = Math.max(2, Math.round(L / 0.3));
  const cy = (y0a + y0b) / 2 + h;
  k.add(rbox(0.07, 0.07, Math.hypot(L, y0b - y0a) + 0.02, 0.02), M.iron, (x0 + x1) / 2, cy, (z0 + z1) / 2, a, { rx: -p });
  k.add(rbox(0.045, 0.045, Math.hypot(L, y0b - y0a), 0.01), M.iron, (x0 + x1) / 2, (y0a + y0b) / 2 + 0.12, (z0 + z1) / 2, a, { rx: -p });
  for (let i = 1; i < n; i++) {
    const t = i / n, y = y0a + (y0b - y0a) * t;
    k.add(rbox(0.035, h, 0.035, 0), M.iron, x0 + (x1 - x0) * t, y + h / 2, z0 + (z1 - z0) * t, a);
  }
}

// the stair: the first flight north to the landing, the second turned toward the front door, their cheek walls with a
// coping, posts and railings, and on the east the terrace filled out to the stair (CLIMB-2). Returns the terrace's level
// at the top
function climbFlight(k, M, physics, T) {
  const S = ASYLUM_STEPS, F = FL, G = FL2, W = S.w, hw = HW, cw = S.cheek, n1 = S.n1, n2 = S.n2, N = n1 + n2, run = S.run;
  const sL = (n1 - 1) * run, sN = S1 + W;   // (the landing: from the first flight's last step to its north edge)
  const y0 = T(...F.at(-0.3)), y1 = Math.max(T(...G.at(T2_TOP + 0.8)), T(...G.at(T2_TOP + 0.8, -0.8)), T(...G.at(T2_TOP + 0.8, 0.8))) + 0.03;
  const rise = (y1 - y0) / N;
  const under = (A, s0, s1, o0, o1, f) => { let v = f === Math.max ? -Infinity : Infinity; for (let u = 0; u <= 1; u += 0.25) for (let w = 0; w <= 1; w += 0.25) v = f(v, T(...A.at(s0 + u * (s1 - s0), o0 + w * (o1 - o0)))); return v; };
  // every step on the line, or over the slope where it stands higher (the landing 6 cm over the shelf); then no riser
  // over RMAX (an earlier step is raised instead: his body reaches two steps ahead, two risers stay under STEP_UP)
  const RMAX = 0.26, tops = [];
  for (let i = 0; i < N; i++) {
    const nominal = y0 + (i + 1) * rise;
    if (i < n1 - 1) tops.push(Math.max(nominal, under(F, i * run, (i + 1) * run, -hw, hw, Math.max) + 0.03));
    else if (i === n1 - 1) tops.push(Math.max(nominal, under(F, sL, sN, -hw, hw, Math.max) + 0.06));
    else { const j = i - n1; tops.push(Math.max(nominal, under(G, T2_0 + j * run, T2_0 + (j + 1) * run, -hw, hw, Math.max) + 0.03)); }
  }
  for (let i = N - 2; i >= 0; i--) tops[i] = Math.max(tops[i], tops[i + 1] - RMAX);
  for (let i = 1; i < N; i++) tops[i] = Math.max(tops[i], tops[i - 1]);
  const Hm = tops[n1 - 1], yt = tops[N - 1];
  // a step: a slab with a 3 cm nosing on a riser block, from t0 to t1 along frame A (the landing: one slab, no nosing);
  // its collider runs on to ce (under the steps above it), so no seam between two steps reads as the ground below
  const step = (A, t0, t1, top, ce, nose = 0.015) => {
    const bottom = Math.min(under(A, t0, t1, -hw - cw, hw + cw, Math.min), y0) - 0.4;
    const [cx, cz] = A.at((t0 + t1) / 2), [nx, nz] = A.at((t0 + t1) / 2 - nose);
    k.add(rbox(W, top - 0.06 - bottom, t1 - t0 + 0.02, 0.02), M.riser, cx, (top - 0.06 + bottom) / 2, cz, A.a, { jit: true });
    k.add(rbox(W - 0.01, 0.07, t1 - t0 + 2 * nose + 0.02, 0.02), M.tread, nx, top - 0.035, nz, A.a, { jit: true });
    const [qx, qz] = A.at((t0 + ce) / 2);
    physics.add({ type: 'box', x: qx, z: qz, hw, hd: (ce - t0) / 2, rot: A.a, top });
  };
  for (let i = 0; i < n1 - 1; i++) step(F, i * run, (i + 1) * run, tops[i], sL + 0.2);
  step(F, sL, sN, Hm, sN, 0);
  for (let j = 0; j < n2; j++) step(G, T2_0 + j * run, T2_0 + (j + 1) * run, tops[n1 + j], T2_TOP);
  // the cheeks: a dressed wall each side of a flight, its coping a straight line 0.5 m over the nosings, down to below
  // the ground; railings where the ground beside falls away more than 1.2 m; capped posts at the ends and halfway
  const line = (a, b) => { const sl = (b[1] - a[1]) / (b[0] - a[0]); return (t) => a[1] + (t - a[0]) * sl; };
  const yc1 = line([run / 2, tops[0] + 0.5], [sL - run / 2, tops[n1 - 2] + 0.5]);
  const cheek = (A, ta, tb, sd, yc, rails = true) => {
    const o = sd * (hw + cw / 2), p = Math.atan((yc(tb) - yc(ta)) / (tb - ta)), Ls = (tb - ta) / Math.cos(p);
    let D = 0;
    for (let t = ta; t <= tb + 1e-6; t += 0.25) D = Math.max(D, yc(t) - Math.min(T(...A.at(t, o - cw / 2)), T(...A.at(t, o + cw / 2))));
    D += 0.5;
    const [mx, mz] = A.at((ta + tb) / 2, o), ym = yc((ta + tb) / 2);
    k.add(rbox(cw, D * Math.cos(p), Ls, 0.03), M.wall, mx, ym - D / 2, mz, A.a, { rx: -p });
    k.add(rbox(cw + 0.1, 0.14, Ls, 0.03), M.cap, mx, ym + 0.07 / Math.cos(p), mz, A.a, { rx: -p });
    const np = Math.max(1, Math.round((tb - ta) / 0.6));   // (short, so a piece stands no more than ~0.4 m over its cheek: the camera passes close over them)
    for (let j = 0; j < np; j++) {
      const a = ta + (j / np) * (tb - ta), b = ta + ((j + 1) / np) * (tb - ta), [px, pz] = A.at((a + b) / 2, o);
      physics.add({ type: 'box', x: px, z: pz, hw: cw / 2 + 0.05, hd: (b - a) / 2 + 0.05, rot: A.a, top: yc(b) + 0.15, noStand: true, seeThrough: true });
    }
    if (!rails) return;
    const fall = (t) => yc(t) - 0.5 - T(...A.at(t, sd * (hw + cw + 0.5))) > 1.2;
    let r0 = null, prev = null;
    const runs = [];
    for (let t = ta + 0.5; t <= tb - 0.5 + 1e-6; t += 0.3) {
      const f = fall(t);   // (CLIMB-15: no post halfway now, the railing runs through)
      if (f) { if (r0 == null) r0 = t; prev = t; } else if (r0 != null) { runs.push([r0, prev]); r0 = null; }
    }
    if (r0 != null) runs.push([r0, prev]);
    for (const [a, b] of runs) if (b - a > 0.9) { const [ax, az] = A.at(a, o), [bx, bz] = A.at(b, o); climbRail(k, M, ax, az, bx, bz, yc(a) + 0.14 / Math.cos(p), yc(b) + 0.14 / Math.cos(p), 0.5); }
  };
  // (CLIMB-15: a post's inner face in line with the cheek's, so the larger posts take nothing off the stair's width)
  const post = (A, t, sd, base, h = 1.45) => { const [px, pz] = A.at(t, sd * (hw + POST_HALF)); climbPost(k, M, physics, px, pz, base, h, A.a); };
  // the first flight: the west cheek to the landing, the east one to the terrace's corner
  cheek(F, 0, sL, -1, yc1);
  cheek(F, 0, Math.min(S_CORNER, sL), 1, yc1);
  post(F, -0.15, -1, Math.min(T(...F.at(-0.15, -hw - cw / 2)), y0)); post(F, -0.15, 1, Math.min(T(...F.at(-0.15, hw + cw / 2)), y0));
  // (CLIMB-15: no posts halfway up the flight: LBA2 sets its posts at the corners only)
  // the landing's west and north walls (a parapet 0.5 m over it, or 10 cm over the bank behind where that stands higher)
  {
    const o = -(hw + cw / 2);
    let g = -Infinity, gl = Infinity; for (let s = sL; s <= sN + cw; s += 0.25) for (const q of [o - cw, o, o + cw]) { const h = T(...F.at(s, q)); g = Math.max(g, h); gl = Math.min(gl, h); }
    const top = Math.max(Hm + 0.5, g + 0.1), [mx, mz] = F.at((sL + sN + cw) / 2, o), bot = Math.min(gl, Hm) - 0.6;
    k.add(rbox(cw, top - bot, sN + cw - sL, 0.03), M.wall, mx, (top + bot) / 2, mz, F.a);
    k.add(rbox(cw + 0.1, 0.14, sN + cw - sL + 0.06, 0.03), M.cap, mx, top + 0.07, mz, F.a);
    physics.add({ type: 'box', x: mx, z: mz, hw: cw / 2 + 0.05, hd: (sN + cw - sL) / 2, rot: F.a, top: top + 0.15, noStand: true, seeThrough: true });
    // north: from the north-west corner to the second flight's north-west cheek
    const oe = HW, sn = sN + cw / 2;   // (to the landing's north-east corner: the second flight's north wall goes on from there)
    let gn = -Infinity, gnl = Infinity; for (let q = -hw - cw; q <= oe; q += 0.25) for (const s of [sN, sN + cw, sN + cw + 0.3]) { const h = T(...F.at(s, q)); gn = Math.max(gn, h); gnl = Math.min(gnl, h); }
    const topN = Math.max(Hm + 0.5, gn + 0.1), [nx, nz] = F.at(sn, (-hw - cw + oe) / 2), botN = Math.min(Hm, gnl) - 0.6;
    k.add(rbox(oe + hw + cw, topN - botN, cw, 0.03), M.wall, nx, (topN + botN) / 2, nz, F.a);
    k.add(rbox(oe + hw + cw + 0.06, 0.14, cw + 0.1, 0.03), M.cap, nx, topN + 0.07, nz, F.a);
    physics.add({ type: 'box', x: nx, z: nz, hw: (oe + hw + cw) / 2, hd: cw / 2 + 0.05, rot: F.a, top: topN + 0.15, noStand: true, seeThrough: true });
    post(F, sN + POST_HALF, -1, Hm, Math.max(top, topN) - Hm + 0.6);
    post(F, sL, -1, Hm, top - Hm + 0.6);   // (where the cheek's slope meets the landing's level wall)
  }
  // the second flight: cut into the terrace, its walls and the fill on both sides (below)
  climbTerraceFill(k, M, physics, T, yt);
  return yt;
}

// CLIMB-2: the terrace filled out to the second flight on both its sides, over the old gully (CLOUD_ORDERS 16 (b): no
// trench): on the south a wall from the terrace's corner along the first flight's east side to K, then along the second
// flight's south side to its top; on the north a wall along its north side. Each a plinth 0.22 m over the terrace, its
// coping and the railing on it, down to below the steps; behind it the fill, level with the terrace, out to where the
// terrace's own ground rises within 15 cm of it (never the ground and the fill drawn as one surface), the south one no
// further than the terrace's railing (TERRACE_RAIL, its plinth stands on the fill's edge). Walkable; the walls and their
// railings keep him on the stair or on the terrace. The second flight's top is left open onto the forecourt (no post).
function climbTerraceFill(k, M, physics, T, yt) {
  const F = FL, G = FL2, top = yt + 0.22;
  const wall = (A, ta, tb, o) => {
    let lo = Infinity;
    for (let t = ta; t <= tb + 1e-6; t += 0.25) lo = Math.min(lo, T(...A.at(t, o - 0.17)), T(...A.at(t, o + 0.17)));
    const bot = lo - 0.6, [wx, wz] = A.at((ta + tb) / 2, o), L = tb - ta;
    k.add(rbox(0.34, top - bot, L, 0.03), M.wall, wx, (top + bot) / 2, wz, A.a);
    k.add(rbox(0.42, 0.1, L + 0.06, 0.03), M.cap, wx, top + 0.05, wz, A.a);
    if (L > 1.0) { const [ax, az] = A.at(ta + 0.35, o), [bx, bz] = A.at(tb - 0.35, o); climbRail(k, M, ax, az, bx, bz, top + 0.1, top + 0.1, 0.6); }
    climbRailCol(physics, wx, wz, 0.22, L / 2, A.a, top, top + 0.75);
  };
  const r1 = TERRACE_RAIL[1], railZ = (x) => CORNER[1] + (r1[1] - CORNER[1]) * (x - CORNER[0]) / (r1[0] - CORNER[0]);
  // the fill behind a run of walls (parts: [frame, from, to]) on side sd (+1: to the frame's right)
  const fill = (parts, sd, clip) => {
    const out = (A, t) => { let o = OE + 0.3; while (o < OE + 3.8 && T(...A.at(t, sd * o)) < yt - 0.15) o += 0.05; let p = A.at(t, sd * Math.max(OE + 0.3, o - 0.1)); return clip ? clip(p) : p; };   // (its edge 15 cm and more over the ground, never coplanar with it)
    const inner = [], outer = [], frames = [];
    for (const [A, ta, tb] of parts) for (let t = ta; t < tb + 1e-6; t += 0.25) { inner.push(A.at(Math.min(t, tb), sd * (OE + 0.15))); outer.push(out(A, Math.min(t, tb))); frames.push(A); }
    if (clip) { inner[0] = clip(inner[0]); }
    const pts = [...inner, ...[...outer].reverse()];
    let fb = Infinity;
    for (const [x, z] of pts) fb = Math.min(fb, T(x, z));
    fb -= 0.4;
    const geo = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z))), { depth: yt - fb, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2); geo.translate(0, fb, 0);
    k.add(geo, M.wall, 0, 0, 0);
    // collision: the fill's top, in boxes between the inner and the outer line
    for (let i = 0; i + 2 < inner.length; i += 2) {
      const A = frames[i], q = [inner[i], inner[i + 2], outer[i + 2], outer[i]], cx = q.reduce((a, p) => a + p[0], 0) / 4, cz = q.reduce((a, p) => a + p[1], 0) / 4;
      const wid = Math.min(Math.abs(A.local(...outer[i])[1] - A.local(...inner[i])[1]), Math.abs(A.local(...outer[i + 2])[1] - A.local(...inner[i + 2])[1]));
      if (wid < 0.15) continue;
      const len = Math.hypot(inner[i + 2][0] - inner[i][0], inner[i + 2][1] - inner[i][1]);
      physics.add({ type: 'box', x: cx, z: cz, hw: wid / 2, hd: len / 2 + 0.02, rot: A.a, top: yt });
    }
  };
  // south: the terrace's corner to K along the first flight, K to the top along the second
  wall(F, S_CORNER, S_K, OE);
  wall(G, T_K, T2_TOP, OE);
  { const [px, pz] = F.at(S_K, HW + POST_HALF); climbPost(k, M, physics, px, pz, yt, 1.5, F.a); }   // (the turn's post)
  fill([[F, S_CORNER, S_K - 0.15], [G, T_K + 0.15, T2_TOP]], 1, ([x, z]) => [x, Math.min(z, railZ(x))]);
  // north: along the second flight, from the landing's corner to the top
  wall(G, T2_0 - 0.17, T2_TOP, -OE);   // (from the landing's north-east corner, where the landing's own north wall ends)
  fill([[G, T2_0, T2_TOP]], -1, null);
  climbTopThreshold(k, M, physics, T, yt);
  // (REVIEW-CITADEL: north of the landing, between its north wall and the terrace, the gully's pocket stayed open, 1–2.5 m
  //  deep under the terrace's edge (x −33.9…−31.3, z −46.9…−47.7): walking west along the north fill or south off the
  //  terrace he dropped into it, slid, could not climb out and was taken back by the fall's respawn, a life lost. Closed
  //  at the height of the terrace's edge above it)
  { const sN = S1 + ASYLUM_STEPS.w, [cx, cz] = F.at(sN + 0.9, 0), yn = Math.min(yt, Math.max(T(...F.at(sN + 1.5, -1.0)), T(...F.at(sN + 1.5, 1.0))));
    physics.add({ type: 'box', x: cx, z: cz, hw: HW + 0.1, hd: 0.55, rot: F.a, top: yn }); }
}
// CLOUD_ORDERS 21 (the cloud's camera agent, 6.11: past the east flight's top step, x −28.99, the forecourt's ground lay
// 0.5–0.9 m lower and steep for ~1 m: Twinsen slid against the step and stuck, and actors.js respawnFromFall took him
// back and cost a life; the likeliest cause of the user's "the camera lost its balance" on the forecourt): the top step
// carried on level onto the forecourt as a stone threshold at the terrace's level, row by row across the flight, its
// walls and the dip beside them (TOP_ROWS: l across the flight, from the south rail's plinth north), each row from the
// top step east to where the forecourt's own ground stands within 4 cm of it (a thin edge, never coplanar with the ground);
// walkable, its collision overlapping the top step's and each other's (no seam to drop through)
const TOP_L = [2.0, -4.5], TOP_T = 2.2;
function climbTopThreshold(k, M, physics, T, yt) {
  const G = FL2, lim = yt - 0.04, rows = [];
  const reach = (l) => { let t = T2_TOP + 0.3; while (t < T2_TOP + TOP_T && T(...G.at(t, l)) < lim) t += 0.05; return t; };
  // from the flight's middle out to each side while the ground past the top is low (one high row allowed: a ridge)
  for (const dir of [1, -1]) {
    let thin = 0;
    for (let l = dir > 0 ? 0 : -0.25; dir > 0 ? l <= TOP_L[0] + 1e-6 : l >= TOP_L[1] - 1e-6; l += dir * 0.25) {
      const te = reach(l);
      if (te <= T2_TOP + 0.31 && Math.abs(l) > HW) { if (++thin >= 2) break; } else thin = 0;
      rows.push([l, te]);
    }
  }
  rows.sort((a, b) => a[0] - b[0]);
  const west = rows.map(([l]) => G.at(T2_TOP, l)), east = rows.map(([l, te]) => G.at(te, l)), poly = [...west, ...[...east].reverse()];
  let fb = Infinity; for (const [x, z] of poly) fb = Math.min(fb, T(x, z));
  for (const [l, te] of rows) for (let t = T2_TOP; t <= te; t += 0.25) fb = Math.min(fb, T(...G.at(t, l)));
  fb -= 0.4;
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z))), { depth: yt - fb, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2); geo.translate(0, fb, 0);
  k.add(geo, M.wall, 0, 0, 0);
  for (let i = 0; i + 1 < rows.length; i++) {
    const t0 = T2_TOP - 0.1, t1 = (rows[i][1] + rows[i + 1][1]) / 2, [cx, cz] = G.at((t0 + t1) / 2, (rows[i][0] + rows[i + 1][0]) / 2);
    physics.add({ type: 'box', x: cx, z: cz, hw: (t1 - t0) / 2, hd: (rows[i + 1][0] - rows[i][0]) / 2 + 0.08, rot: 0, top: yt });
  }
}

// the ramp's retaining walls over the stone house's yard: a dressed wall whose top is a parapet with a coping over the
// paving, down below the ground of the yard's bank. (CLIMB-15, as LBA2's climb, whose ramps have no railings and posts
// only at their corners: the parapet solid masonry, 0.8 m over the paving with its coping, a capped post at each end.)
// One run along frame A from s0 to s1, its middle at oc, th thick, its coping PARAPET over the paving's hp(s); the base
// course at its foot on the paving's side (side: −1, the paving at lower o)
const PARAPET = 0.66;
// (CLOUD_ORDERS 17: each run's body, coping and base course sheared to the incline, not tilted, so a run's ends stand
//  plumb: a tilted body 4–6 m deep over the yard pushed its foot a metre past the corner)
const sheared = (geo, t) => geo.clone().applyMatrix4(new THREE.Matrix4().makeShear(0, 0, 0, 0, 0, t));
function climbParapet(k, M, physics, T, A, s0, s1, oc, th, hp, side = -1) {
  const N = Math.max(1, Math.ceil((s1 - s0) / 3.1)), step = (s1 - s0) / N, oi = oc + side * th / 2, ob = oc - side * (th / 2 + 0.2);
  for (let i = 0; i < N; i++) {
    const sa = s0 + i * step, sb = sa + step, ya = hp(sa) + PARAPET, yb = hp(sb) + PARAPET, t = (yb - ya) / step;
    let D = 0;
    for (let s = sa; s <= sb + 1e-6; s += 0.25) D = Math.max(D, ya + (yb - ya) * (s - sa) / step - Math.min(T(...A.at(s, oi)), T(...A.at(s, ob))));
    D += 0.6;
    const [mx, mz] = A.at((sa + sb) / 2, oc), ym = (ya + yb) / 2;
    k.add(sheared(rbox(th, D, step + 0.04, 0.03), t), M.wall, mx, ym - D / 2, mz, A.a);
    k.add(sheared(rbox(th + 0.1, 0.14, step + 0.04, 0.03), t), M.cap, mx, ym + 0.07, mz, A.a);
    // (CLIMB-2: a base course along the wall's foot on the paving side, 8 cm proud: the ground's grid is 0.9 m, so the
    //  last few centimetres of paving at the wall's face can't follow the incline exactly; the course is the edge there)
    { const [cx, cz] = A.at((sa + sb) / 2, oi + side * 0.13), yb = (hp(sa) + hp(sb)) / 2; k.add(sheared(rbox(0.28, 0.5, step + 0.04, 0.03), (hp(sb) - hp(sa)) / step), M.wall, cx, yb + 0.08 - 0.25, cz, A.a); }
    for (let j = 0; j < 3; j++) { const a = sa + (j / 3) * step, b = sa + ((j + 1) / 3) * step, [px, pz] = A.at((a + b) / 2, oc), hm = Math.max(hp(a), hp(b)); climbRailCol(physics, px, pz, th / 2 + 0.05, step / 6 + 0.05, A.a, hm + PARAPET + 0.14, hm + 1.1); }   // (in thirds: the camera passes close over them; over the parapet to 1.1 m, as the railing stood)
  }
}
// the second leg's east wall (CLIMB_WALL, to the landing at the yard's edge), then (CLOUD_ORDERS 17) the landing's south
// edge over the yard and the straight's east side on the flight's axis, in line with the flight's east cheek and post,
// to 1.8 m short of the stump. Posts: the leg's foot, the leg's end where the landing's wall leaves it, the corner, the end
function climbRampWall(k, M, physics, T) {
  const R = RW, C = CLIMB_WALL, th = PAR_TH, om = (C.o0 + C.o1) / 2;
  climbParapet(k, M, physics, T, R, C.s0, C.s1, om, th, (s) => T(...R.at(s, 0)));
  for (const s of [C.s0, C.s1]) { const [px, pz] = R.at(s, om); climbPost(k, M, physics, px, pz, T(...R.at(s, 0)), 1.5, R.a); }
  // the landing's south edge, west to east (o: to the south; the paving at −o), level with the landing's paving
  const zS = (W_SOUTH[1] + W_SOUTH[3]) / 2, xE = (W_EAST[0] + W_EAST[2]) / 2, S = axis([S1_POST[0], zS], [xE, zS]);
  const yS = T((S1_POST[0] + xE) / 2, CLIMB_JOG[3] - 0.3);
  climbParapet(k, M, physics, T, S, 0, S.L, 0, th, () => yS);
  climbPost(k, M, physics, xE, zS, yS, 1.5, 0);
  // the straight's east side, south to north along the flight's frame (o: east; the paving at −o)
  const sa = FL.local(xE, zS)[0], sb = FL.local(xE, CLIMB_E_END)[0], hp = (s) => T(...FL.at(s, 0));
  climbParapet(k, M, physics, T, FL, sa, sb, xE - AX, th, hp);
  climbPost(k, M, physics, xE, CLIMB_E_END, hp(sb), 1.5, 0);
}

// CLIMB-15, CLOUD_ORDERS 17: the second shelf's retaining wall along the straight's west side and its return west along
// the landing's north edge and the shelf's face (CLIMB_SHELF): dressed stone, level, its coping 12 cm over the shelf's
// level; along the straight and the landing a base course at its foot as the parapets have; LBA2's capped posts on its
// corners and ends, standing in the coping; behind both the shelf filled level (climbShelfRows), on north beside the
// foot landing to the flight's cheek, out to where its own ground rises within 15 cm of the top. The coping and the fill
// are walkable; from the ramp the wall is a wall (to 1.5 m): the shelf is reached from the foot landing, a step of
// 16 cm up onto the fill, and on round the flight's west cheek to the way up to the plateau, as before.
function climbShelfWall(k, M, physics, T) {
  const C = CLIMB_SHELF, top = C.top, cop = top + 0.12, th = C.th;
  const body = (cx, cz, w, d, a, lo) => {   // a wall body from below the ground to its coping
    const bot = lo - 0.6;
    k.add(rbox(w, top + 0.02 - bot, d, 0.03), M.wall, cx, (top + 0.02 + bot) / 2, cz, a);
    k.add(rbox(w + 0.1, 0.1, d + 0.06, 0.03), M.cap, cx, cop - 0.05, cz, a);
    physics.add({ type: 'box', x: cx, z: cz, hw: w / 2 + 0.03, hd: d / 2 + 0.03, rot: a, top: cop });
  };
  const course = (x0, z0, x1, z1, hp) => {   // the base course along a run on the paving's side, in runs following the paving
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 1.2)), a = Math.atan2(x1 - x0, z1 - z0);
    for (let i = 0; i < n; i++) {
      const ta = i / n, tb = (i + 1) / n, pa = [x0 + (x1 - x0) * ta, z0 + (z1 - z0) * ta], pb = [x0 + (x1 - x0) * tb, z0 + (z1 - z0) * tb];
      const ha = hp(...pa), hb = hp(...pb), p = Math.atan2(hb - ha, L / n), Ls = L / n / Math.cos(p);
      k.add(rbox(0.28, 0.5, Ls + 0.04, 0.03), M.wall, (pa[0] + pb[0]) / 2, (ha + hb) / 2 + 0.08 - 0.25 / Math.cos(p), (pa[1] + pb[1]) / 2, a, { rx: -p });
    }
  };
  const lowIn = ([x0, z0, x1, z1]) => { let lo = Infinity; for (let x = x0; x <= x1 + 1e-6; x += 0.25) for (let z = z0; z <= z1 + 1e-6; z += 0.24) lo = Math.min(lo, T(x, z)); return lo; };
  // the return: due west along the landing's north edge and the shelf's face
  body((W_RET[0] + W_RET[2]) / 2, (W_RET[1] + W_RET[3]) / 2, th, W_RET[2] - W_RET[0], Math.PI / 2, lowIn(W_RET));
  // the wall along the straight's west side
  body((W_WEST[0] + W_WEST[2]) / 2, (W_WEST[1] + W_WEST[3]) / 2, th, W_WEST[3] - W_WEST[1], 0, lowIn(W_WEST));
  // the base courses: along the landing (level across: its paving a little in from the face) and up the straight
  course(LEG_CORNER[0] + 0.3, C.z + 0.13, C.xs, C.z + 0.13, (x, z) => T(x, z + 0.25));
  course(C.xs + 0.13, C.z, C.xs + 0.13, C.zn + 0.35, (x, z) => T(AX, z));
  // the posts, in the coping: the return's west end, the second leg's corner, the straight's corner (none at the wall's
  // north end: it is down to 30 cm over the paving there, and the flight's foot post stands 2 m on)
  const zr = (W_RET[1] + W_RET[3]) / 2, xw = (W_WEST[0] + W_WEST[2]) / 2;
  climbPost(k, M, physics, C.xw + POST_HALF - 0.06, zr, top, 1.15, 0);
  climbPost(k, M, physics, LEG_CORNER[0], zr, top, 1.15, 0);
  climbPost(k, M, physics, xw, zr, top, 1.15, 0);
  // the fill: one block over the rows (each row from its east edge west), its collision a box between each two rows,
  // out to the middle of its slanted west edge (within ~0.15 m of the stone's edge: no gap to sink into, no ledge)
  const R = climbShelfRows(T), inner = R.map(([z, xe]) => [xe, z]), outer = R.map(([z, , xw2]) => [xw2, z]);
  const poly = [...inner, ...[...outer].reverse()];
  let fb = Infinity; for (const [x, z] of poly) fb = Math.min(fb, T(x, z));
  fb -= 0.4;
  const geo = new THREE.ExtrudeGeometry(new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z))), { depth: top - fb, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2); geo.translate(0, fb, 0);
  k.add(geo, M.wall, 0, 0, 0);
  for (let i = 0; i + 1 < R.length; i++) {
    const xe = Math.min(R[i][1], R[i + 1][1]), xwm = (R[i][2] + R[i + 1][2]) / 2;
    if (xe - xwm < 0.15) continue;
    physics.add({ type: 'box', x: (xe + xwm) / 2, z: (R[i][0] + R[i + 1][0]) / 2, hw: (xe - xwm) / 2, hd: Math.abs(R[i + 1][0] - R[i][0]) / 2 + 0.08, rot: 0, top });   // (overlapping well past physics' 5 cm inset: no seam to drop through)
  }
}

// the terrace's railing over the cliff: a low dressed plinth, the iron railing on it, capped posts at its corners
function climbTerraceRail(k, M, physics, T, yt) {
  const P = TERRACE_RAIL;
  for (let i = 0; i < P.length - 1; i++) {
    const [x0, z0] = P[i], [x1, z1] = P[i + 1], L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0);
    let hi = -Infinity, lo = Infinity;
    for (let t = 0; t <= 1; t += 0.1) { const h = T(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t); hi = Math.max(hi, h); lo = Math.min(lo, h); }
    if (i === 0) hi = Math.max(hi, yt);   // (CLIMB-2: over the filled gully, level with the fill)
    const top = hi + 0.22, bot = lo - 0.5;
    k.add(rbox(0.34, top - bot, L, 0.03), M.wall, (x0 + x1) / 2, (top + bot) / 2, (z0 + z1) / 2, a);
    k.add(rbox(0.42, 0.1, L + 0.06, 0.03), M.cap, (x0 + x1) / 2, top + 0.05, (z0 + z1) / 2, a);
    climbRail(k, M, x0 + (x1 - x0) * 0.3 / L, z0 + (z1 - z0) * 0.3 / L, x1 - (x1 - x0) * 0.3 / L, z1 - (z1 - z0) * 0.3 / L, top + 0.1, top + 0.1, 0.6);
    climbRailCol(physics, (x0 + x1) / 2, (z0 + z1) / 2, 0.22, L / 2, a, top, top + 0.75);
  }
  P.forEach(([x, z], i) => climbPost(k, M, physics, x, z, i === 0 ? Math.max(T(x, z), yt) : T(x, z), 1.2));
}

// granite kerbs along both edges of the paved ramp, as the town's streets have (town.js curbs: the same stone and size),
// left out in the square's ring, on the streets, along the wall, and where the depot's path leaves at the fork
function climbKerbs(g, T) {
  const pos = [], V = CLIMB_RAMP[0];
  // (CLOUD_ORDERS 17: on the second leg, the west kerb runs on along the landing's west edge to the shelf's corner post;
  //  the east side is the parapet, and past it the landing)
  const sCorner = RW.local(...LEG_CORNER)[0];
  for (let i = 0; i < CLIMB_RAMP.length - 1; i++) {
    const R = axis(CLIMB_RAMP[i], CLIMB_RAMP[i + 1]), sEnd = i === 1 ? sCorner - 0.4 : R.L;
    for (let s = 0.3; s < sEnd; s += 0.55) for (const sd of [-1, 1]) {
      const [x, z] = R.at(s, sd * (CLIMB_HW + 0.08));
      if (Math.hypot(x - V[0], z - V[1]) < 10.2) continue;
      if (streetDist(x, z) < 0.2) continue;
      if (i === 1 && sd > 0 && s > CLIMB_WALL.s0 - 0.5) continue;
      if (climbMasonry(x, z, 0.15)) continue;   // (none under the stair's foot)
      let y = -Infinity; for (const [da, dc] of [[0, 0], [0.28, 0.1], [0.28, -0.1], [-0.28, 0.1], [-0.28, -0.1]]) y = Math.max(y, T(x + R.ux * da - R.uz * dc, z + R.uz * da + R.ux * dc));   // (on the highest ground under it: its top never sinks to the ground's)
      pos.push([x, y, z, R.a]);
    }
  }
  // (and along the straight's east edge, from the parapet's end post to the foot landing, where the stump's bank comes down)
  for (let z = CLIMB_E_END - 0.55; z > CLIMB_FOOT[3] + 0.2; z -= 0.55) {
    const x = CLIMB_STRAIGHT[2] + 0.1;
    let y = -Infinity; for (const [dz, dx] of [[0, 0], [0.28, 0.1], [0.28, -0.1], [-0.28, 0.1], [-0.28, -0.1]]) y = Math.max(y, T(x + dx, z + dz));
    pos.push([x, y, z, 0]);
  }
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.16, 0.56), rigMat('#b9b3a8', 0.9), pos.length);
  const o = new THREE.Object3D(), c = new THREE.Color();
  pos.forEach(([x, y, z, a], i) => {
    o.position.set(x, y + 0.02, z); o.rotation.set(0, a + Math.sin(i * 1.7) * 0.03, Math.sin(i * 2.3) * 0.02); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    im.setColorAt(i, c.setRGB(1, 1, 1).multiplyScalar(0.86 + ((i * 7919) % 13) / 13 * 0.18));
  });
  im.receiveShadow = true; im.castShadow = false; im.name = 'climb-kerbs';
  g.add(im);
}

function asylumSteps(scene, physics) {
  const T = (x, z) => physics.terrain.heightAt(x, z);
  const g = new THREE.Group(); g.name = 'asylum-climb'; scene.add(g);
  const k = new Kit(g);
  const M = { tread: stepMat(false), riser: stepMat(true), wall: MAT.stone('grey', 2), cap: MAT.plaster('#e2dccf'), iron: MAT.paint('#2a9a8a', 0.4) };
  const yt = climbFlight(k, M, physics, T);
  climbRampWall(k, M, physics, T);
  climbShelfWall(k, M, physics, T);
  climbTerraceRail(k, M, physics, T, yt);
  k.flush();
  climbKerbs(g, T);
  for (const m of g.children) {
    m.castShadow = m.isMesh && !m.isInstancedMesh && !m.material.vertexColors;   // (the masonry casts; the thin railings and the kerbs don't)
  }
}

let DOOR = null, FRONT = null;
export function buildLba1Places(scene, physics) {
  buildLba1Door(scene, physics);
  return { ...buildLba1Asylum(scene, physics), ...buildLba1Temple(scene, physics) };
}
// LAZY-REGIONS (src/game/regions.js): the asylum's two doors stand on Citadel (built with it); the asylum, and the
// temple's maze and halls together, are built the first time they are needed
export function buildLba1Door(scene, physics) { if (hasLba1Room('asylum') && !DOOR) { DOOR = asylumDoor(scene, physics); asylumSteps(scene, physics); FRONT = buildAsylumFront(scene, physics); } }
export function buildLba1Asylum(scene, physics) {
  const A = LBA1_AT, out = {};
  if (hasLba1Room('asylum')) {
    // (ASYLUM-1: the rooms cut open over the hero — the original's three grid zones, the two cells (the original's
    //  scenery zones round them, cut to a step above the corridor, the beams with it), and the ceilings left over by
    //  squares; the door of Twinsen's cell, which LBA1 kept as a moving actor, broken out of its wall: x 56–57 of
    //  the north wall z 50, down to a step at y 4 between the cell's floor (3) and the corridor's (5))
    const R = out.asylum = buildLba1Room(scene, physics, 'asylum', 'asylum', A.asylum.x, A.asylum.z, {
      stone: 'cell', lamp: '#ffd9a8', lampI: 15, view: 24, sideGain: 3.6, topCol: '#f2e0c6', sideCol: '#e4e8f0',   // (WORLD-ART-7: warm cream floors, cooler walls; ASYLUM-2: a home now, warm lamps; order 20: LBA1's teal-grey brick, lighter)
      gridZones: true, overhead: true, footing: { depth: 9, below: 1, rows: [[0, 0.85], [2.2, 0.32], [9, 0]] },   // (order 8: the store's edge, its walls carried down into the dark; ASYLUM-4: lit now, so faded sooner)
      fittings: true, capStone: true,   // (ASYLUM-4: LBA1's pipes, hanging lamps and round tables drawn as such, not as cells; posts capped in their stone)
      // (order 20, against LBA1's own bricks: its walls teal-grey brick with brick caps, lighter than its dark
      //  flagstones; its walks and stairs teal grates; its maroon posts open lattice girders; its lattice windows; its
      //  boiler a boiler, not a brick tower (BOILER: cells without a brick of their own, drawn by asylumNow))
      meetFloors: true, grate: true, grateGain: 1.35, capWalls: true, girders: true, lowLamps: true, pipeCol: '#a4c6c9', hidden: [BOILER, ...DRUMS.map(([x, z]) => [x, 5, z, x, 7, z])],
      grilles: [[13, 16, 5, 21, 6], [13, 16, 15, 21, 16]],
      clear: [[44, 30, 63, 62, 17]],   // (order 8: the cell block's ceiling beams (cells 17–18), their pillars cut away on the camera's side: slabs hanging over the cells and the corridor)
      lids: [{ box: ASYLUM_CELLS[0], cut: 6, name: 'cellA', sight: true }, { box: ASYLUM_CELLS[1], cut: 6, name: 'cellB', sight: true }, { box: VESK_ROOM, cut: 7, name: 'vesk', sight: true }],
      // (ASYLUM-2: the first cell's door opened like Twinsen's, at corridor level, a step inside it; Vesk's office, a
      //  room LBA1 kept behind a moving door, its door broken through the corridor wall at cells 41–42 of z 30)
      carve: [[56, 4, 50, 57, 6, 50], [56, 5, 45, 57, 6, 45], [41, 5, 30, 42, 9, 30]],
    });
    R.grade = 0.45; R.gradeTint = [1.03, 1.0, 0.95];   // (WA-13b: LBA1's grey stone, chroma 4-6; ASYLUM-2: lived in, the Esmer colours a little up, warm)
    // (ASYLUM-4, the user: "check how they did it in the first game": LBA1's bricks are drawn lit from above and the
    //  camera's side — top brightest, the faces turned to the camera mid-grey, never black. Our interiors' sun came
    //  from behind the room (−x, −z): every face the camera sees stood in its own shade, black with a few lit bricks,
    //  the posts black under pink tops. Now the room's sun comes over the camera's shoulder, a little from its left (as
    //  LBA1's bricks and our people's ramp light), and the walls' stone (sideGain) is as light as the floors; shadows
    //  fall away from the camera, behind the walls that cast them)
    // (order 20: LBA1's bricks are lit about as bright on the camera's left faces as on their tops, the right faces half
    //  that (measured on its pre-lit bricks: +z faces #716e6d, tops #6a6363, +x faces #424b4b); from 0.8 up the walls
    //  stood at half the floors. The sun lower over the camera's left shoulder)
    R.indoor = { sunDir: [0.34, 0.6, 0.72] };
    // the two exits, as LBA1's: the low stair-well (the side door: you come in at its top) and the main entrance on
    // the upper level (the front door: its doors stand in the tall portal between the two posts, you come in before them)
    const ex = R.cell(10.5, 1, 42.6), sp = R.cell(10.5, 5, 39.8);
    R.exits.push({ x: ex.x, z: ex.z, r: 1.0, to: 'asylum-out' });
    R.spawn = { x: sp.x, z: sp.z, a: Math.PI };
    const fx = R.cell(36.75, 14, 11.5), fs = R.cell(34.4, 14, 11.5);
    R.exits.push({ x: fx.x, z: fx.z, r: 1.0, to: 'asylum-front' });
    R.ways = { side: R.spawn, front: { x: fs.x, z: fs.z, a: -Math.PI / 2 } };
    // the office (the clone statues' room): the old register, and a giver behind the desk
    const reg = R.cell(46.5, 14, 23.5);
    R.searches.push({ id: 'asylum_register', x: reg.x, z: reg.z, r: 1.6 });
    const gv = R.cell(50.5, 14, 22.5);
    R.givers.push({ id: 'asylum_desk', x: gv.x, z: gv.z, y: gv.y, r: 1.2, top: 1, kinds: ['money', 'life', 'clover'], n: 3 });
    asylumNow(R, physics);
    dressAsylum(R, physics);
  }
  return out;
}

// ASYLUM-1: the asylum twelve years on (LBA1 cell coords through R.cell; the room's group is at its centre)
// the two cells (the original's scenery zones round them; the second is Twinsen's, where LBA1 starts him)
export const ASYLUM_CELLS = [[51.5, 3, 37.5, 58.5, 10, 44.5], [51.5, 3, 50.5, 58.5, 9, 57.5]];
// (ASYLUM-2) Vesk's office: LBA1's sealed room behind the corridor (its walls on the camera's side cut while he is in it)
export const VESK_ROOM = [36.5, 5, 19.5, 44.5, 16, 30.5];
// (order 20) the store's boiler: LBA1's cells x 9–11, z 51–53, y 1–10 (its body has no bricks of its own; LBA1 draws a
// dark green boiler on a dark round foot, copper bands, a domed top with a copper finial, a gauge on its front)
const BOILER = [9, 1, 51, 11, 10, 53];
// (order 20) LBA1's drums under the west stair (the larder now): one block of three cells a drum, pale enamel, a red cap
const DRUMS = [[1, 21], [1, 22], [1, 23], [1, 24], [1, 25], [2, 24], [3, 24], [3, 25], [3, 26], [4, 25], [4, 27]];
function asylumNow(R, physics) {
  const g = R.group, o = g.position;
  const at = (x, y, z) => { const w = R.cell(x, y, z); return [w.x - o.x, w.y, w.z - o.z]; };
  const add = (geo, m, p, ry = 0, shadow = true) => { const ob = new THREE.Mesh(geo, m); ob.position.set(p[0], p[1], p[2]); ob.rotation.y = ry; ob.castShadow = shadow; ob.receiveShadow = true; g.add(ob); return ob; };
  let rnd = 3; const r = () => ((rnd = (rnd * 16807) % 2147483647) / 2147483647);
  const brick = MAT.stone('grey', 1), mortar = MAT.rubble('grey'), rubber = MAT.flat('#1d1d21', 0.7), copper = MAT.copper();
  const heap = (cx, cz, y, w, d, n) => {   // a heap of broken bricks and mortar (cell coords)
    const c = at(cx, y, cz);
    add(rbox(w * 0.8, 0.3, d * 0.8, 0.08), mortar, [c[0], c[1] + 0.12, c[2]], r());
    for (let i = 0; i < n; i++) add(rbox(0.26, 0.11, 0.13, 0.015), brick, [c[0] + (r() - 0.5) * w, c[1] + 0.06 + r() * 0.3, c[2] + (r() - 0.5) * d], r() * 3);
  };
  // the way in: the bricking over the stair-well (the original's exit to the yard), broken through; its stubs either
  // side of the gap, its bricks scattered
  for (const [x0, x1, h] of [[8.9, 9.95, 0.62], [11.55, 12.6, 0.38]]) {
    const a = at(x0, 5, 41.85), b = at(x1, 5, 41.85);
    add(rbox(b[0] - a[0], h, 0.3, 0.03), brick, [(a[0] + b[0]) / 2, a[1] + h / 2, a[2]]);
    add(rbox(0.28, 0.12, 0.3, 0.02), brick, [(a[0] + b[0]) / 2 + (r() - 0.5) * 0.3, a[1] + h + 0.05, a[2]], 0.4);
  }
  heap(9.2, 40.9, 5, 1.0, 0.8, 7); heap(12.3, 40.7, 5, 0.8, 0.7, 5);
  // the dig's breach in the west wall (toward the fort), its rubble spilled in, and the project's cable out of it,
  // along the floor and down the stair-well to the surface; the project's sign beside it
  const hb = at(1.0, 6.8, 40.4);
  add(plane(2.3, 2.3), MAT.map(breachTex(), 0.95, { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), [hb[0] + 0.02, hb[1], hb[2]], Math.PI / 2, false);
  heap(1.7, 40.4, 5, 1.2, 2.0, 14);
  { const c = at(1.7, 5, 40.4); const col = physics.add({ type: 'box', x: c[0] + o.x, z: c[2] + o.z, hw: 0.45, hd: 0.8, rot: 0, top: c[1] + 0.35, seeThrough: true }); R.colliders.push(col); }
  const cable = [[1.15, 6.0, 40.9], [1.9, 5.15, 41.3], [4.5, 5.05, 41.75], [8.4, 5.05, 41.65], [9.7, 4.6, 42.5], [9.9, 2.5, 43.4]].map((p) => at(...p));
  add(tube(cable.map((p) => [p[0], p[1] + 0.04, p[2]]), 0.035, 6, 1), rubber, [0, 0, 0], 0, false);
  for (const t of [0.3, 0.55]) { const i = Math.floor(t * (cable.length - 1)), u = t * (cable.length - 1) - i, p = cable[i].map((v, k) => v + (cable[i + 1][k] - v) * u); add(rbox(0.12, 0.09, 0.09, 0.01), MAT.paint('#e8c030', 0.5), [p[0], p[1] + 0.05, p[2]], 0.2, false); }
  { const sp = at(2.6, 5, 38.9); add(cyl(0.035, 0.04, 1.3, 6), MAT.paint('#d8b030', 0.5), [sp[0], sp[1] + 0.65, sp[2]]);
    add(plane(0.9, 0.28), MAT.map(signTex(['JOINT PROJECT', 'Survey cut 3 · keep out']), 0.8, { side: THREE.DoubleSide }), [sp[0] + 0.03, sp[1] + 1.12, sp[2]], Math.PI / 2 + 0.5, false); }
  // Twinsen's cell: his marks on the west wall over the bed, and the warm pipe along the corridor and through the cell
  const mk = at(52.0, 5.6, 52.05);
  add(plane(1.5, 0.75), MAT.map(marksTex(), 0.9, { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), [mk[0] + 0.015, mk[1], mk[2]], Math.PI / 2, false);
  const pipe = (pts) => { const P = pts.map((p) => at(...p)); add(tube(P, 0.075, 8, 1), copper, [0, 0, 0], 0, false); return P; };
  pipe([[47.9, 5.35, 49.75], [52.0, 5.35, 49.75], [55.6, 5.35, 49.75], [55.9, 5.35, 50.2]]);
  const P2 = pipe([[55.9, 3.35, 50.8], [55.9, 3.35, 51.2], [57.0, 3.35, 51.2], [58.85, 3.35, 51.2], [58.95, 3.35, 50.9]]);
  const glow = MAT.glow('#ffb070', '#ff7a30', 0.9);
  const joints = [at(52.0, 5.35, 49.75), at(57.0, 3.35, 51.2)];
  const jg = new THREE.CylinderGeometry(0.1, 0.1, 0.07, 10).rotateZ(Math.PI / 2);   // (its own: cyl() is shared)
  for (const j of joints) add(jg, glow, j, 0, false);
  // (the warm air off the pipe in the cell: a faint shimmer of particles, no light)
  let acc = 0;
  R.updaters.push((dt, t, fx) => {
    if (!fx) return; acc += dt * 1.2;
    while (acc >= 1) { acc -= 1; const p = P2[1 + Math.floor(Math.random() * 2)]; fx.spawn({ x: p[0] + o.x + (Math.random() - 0.5) * 0.8, y: p[1] + 0.12, z: p[2] + o.z, vy: 0.25, vx: 0, color: '#ffe2c0', a: 0.12, s0: 0.25, s1: 0.8, life: 2.0, add: 0.6, cell: 0, fi: 0.3, fo: 0.6, drift: 0.1 }); }
  });
  // the look (once): his marks, the pipe, kashes behind a loose brick (prologue.js 'as_cell')
  const lk = R.cell(54.6, 3, 53.4);
  R.searches.push({ id: 'as_cell', x: lk.x, z: lk.z, r: 1.5, label: 'p_look' });
  R.asylumCell = { marks: R.cell(52.0, 5.6, 52.05), look: lk, door: R.cell(56.9, 4, 50.5), pipe: P2.map((p) => ({ x: p[0] + o.x, y: p[1], z: p[2] + o.z })) };
  R.wayIn = { breach: R.cell(1.0, 6.8, 40.4), stair: R.cell(10.5, 5, 41.85) };
  // the store's boiler (order 20), in the cells LBA1 gave it (their colliders kept): cold for twelve years, Vesk's
  // crates stacked round it
  {
    const b = at(10.5, 1, 52.5), body = MAT.paint('#2f5552', 0.55), dark = MAT.paint('#2a2326', 0.7), cu = MAT.copper();
    const k = new Kit(g);
    k.at(b[0], b[1], b[2], 0, () => {
      k.add(cyl(1.14, 1.2, 0.26, 24), dark, 0, 0.13, 0);
      k.add(cyl(0.97, 0.97, 3.0, 24), body, 0, 1.76, 0);
      for (const y of [0.34, 3.18]) k.add(cyl(1.01, 1.01, 0.12, 24), cu, 0, y, 0);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; k.add(rbox(0.035, 2.7, 0.03, 0.01), dark, Math.sin(a) * 0.975, 1.76, Math.cos(a) * 0.975, a); }
      const dome = new THREE.SphereGeometry(0.97, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 0.5, 1);
      k.add(dome, body, 0, 3.26, 0);
      k.add(cyl(0.1, 0.3, 0.5, 14), cu, 0, 3.92, 0);
      k.add(new THREE.SphereGeometry(0.11, 10, 6), cu, 0, 4.2, 0);
      // the gauge, on the front the camera sees (+z, a little to +x)
      k.at(0.34, 1.5, 0.93, 0.35, () => { k.add(cyl(0.24, 0.24, 0.1, 18).clone().rotateX(Math.PI / 2), cu, 0, 0, 0.02); k.add(cyl(0.19, 0.19, 0.02, 18).clone().rotateX(Math.PI / 2), MAT.flat('#ece6d6', 0.5), 0, 0, 0.075); k.add(rbox(0.02, 0.15, 0.01, 0.004), MAT.flat('#7a1a12', 0.5), 0.03, 0.03, 0.09, 0); });
    });
    // the larder's drums (order 20), each in its cells (their colliders kept): pale enamel, two dark hoops, a red cap
    const en = MAT.paint('#c4d6d4', 0.45), hoop = MAT.paint('#5d7473', 0.5), cap = MAT.paint('#b8322a', 0.5);
    DRUMS.forEach(([x, z], i) => {
      const d = at(x + 0.5, 5, z + 0.5), h = 1.26;
      k.at(d[0], d[1], d[2], i * 0.7, () => {
        k.add(cyl(0.33, 0.33, h, 16), en, 0, h / 2, 0);
        for (const y of [0.3, h - 0.3]) k.add(cyl(0.345, 0.345, 0.05, 16), hoop, 0, y, 0);
        k.add(cyl(0.07, 0.07, 0.05, 8), cap, 0.14, h + 0.02, 0.05);
      });
    });
    k.flush();
  }
}
export function buildLba1Temple(scene, physics) {
  const A = LBA1_AT, out = {};
  if (hasLba1Room('bumaze')) {
    const R = out.bumaze = buildLba1Room(scene, physics, 'bumaze', 'bumaze', A.bumaze.x, A.bumaze.z, { stone: 'slate', lamp: '#9fc8ff', lampI: 9, view: 16, noCut: true, tint: 1.6, topCol: '#f0d0a4' });   // (WORLD-ART-7: sandy worn floors against the slate walls)
    R.grade = 0.32;   // (WA-13b: LBA1's rooms are grey stone; measured on the laptop against LBA1: chroma 4-6)
    R.cave = true; R.music = 'cave';
    const back = R.cell(14, 1, 19.0), goal = R.cell(14, 1, 11);
    R.exits.push({ x: back.x, z: back.z, r: 0.9, room: 'butemple' });
    // the far end: the chest the dark halls had, and the way back up to the temple
    const give = R.cell(14, 1, 12.4);
    R.exits.push({ x: goal.x, z: goal.z, r: 0.8, room: 'butemple' });
    R.givers.push({ id: 'bu_halls', x: give.x, z: give.z, y: give.y, r: 1.2, top: 1, kinds: ['life', 'magic', 'clover'], n: 3 });
    R.goal = goal;
    R.entries = { butemple: R.spawn };
  }
  return out;
}

// the front door first (the main way in), then the side door; each lands at its own way in the room
export function lba1Doors() {
  const out = [];
  if (FRONT) out.push({ x: FRONT.door.x, z: FRONT.door.z, r: 0.9, room: 'asylum', spawn: (R) => R.ways?.front || R.spawn });
  if (DOOR) out.push({ x: DOOR.x, z: DOOR.z, r: 0.9, room: 'asylum', spawn: (R) => R.ways?.side || R.spawn });
  return out;
}
export function lba1Exit(to) {
  if (to === 'asylum-out' && DOOR) return { x: DOOR.x + 1.3, z: DOOR.z, a: Math.PI / 2 };
  if (to === 'asylum-front' && FRONT) return { ...FRONT.out };
  return null;
}

// the asylum's guards (ASYLUM-2, the cloud's answer): two of Vesk's guards on his store, not on the hostel, in chapters 1–2
// (after the prologue) on the laptop's posts (R.npcSpots guard1 at the store's stair head, guard2 deep in by the
// boiler); none from chapter 3 (the store cleared: story/hostel.js). LBA1's nurse posts, its trooper and dogs are gone.
export function lba1EnemyDefs(rooms) {
  const out = [], A = rooms.asylum, S = A?.npcSpots;
  const early = (f) => (f.chapterKey ? f.chapterKey === 'well' || f.chapterKey === 'project' : (f.chapter || 0) <= 1);
  const when = (f) => !!f.prologueDone && early(f);
  if (S?.guard1) out.push({ id: 'asy_g0', kind: 'guard', group: 'asylum', x: S.guard1.x, z: S.guard1.z, angle: S.guard1.a, patrol: [[S.guard1.x, S.guard1.z]], when });
  if (S?.guard2) out.push({ id: 'asy_g1', kind: 'guardG', group: 'asylum', x: S.guard2.x, z: S.guard2.z, angle: S.guard2.a, patrol: [[S.guard2.x, S.guard2.z]], when });
  return out;
}
