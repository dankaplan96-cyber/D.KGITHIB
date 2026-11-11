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
//                corners and halfway, railings where the ground falls away; beside the second flight the terrace is filled
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
export const CLIMB_RAMP = [[-42, -4], [-37, -20], [-34, -36]];   // (world.js PATHS[0] as far as the fork)
const CLIMB_HW = 1.55;                                           // the paved ramp's half width
export const CLIMB_WALL = { s0: 0.8, s1: 10.0, o0: 1.62, o1: 2.1 };   // along CLIMB_RAMP's second leg: from, to; inner, outer face
export const CLIMB_TERRACE = [[-28.6, -50.4, -22.8, -43.2], [-31.9, -50.4, -28.6, -47.7]];   // paved boxes [x0, z0, x1, z1]
const FOOT = [-33.3, -36.4, 2.0];                                // the paved apron between the ramp and the flight's foot

const seg = (P, x, z) => { let d = 1e9; for (let i = 0; i < P.length - 1; i++) { const [ax, az] = P[i], [bx, bz] = P[i + 1], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz))); d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return d; };
const boxD = (x, z, x0, z0, x1, z1) => { const dx = Math.max(x0 - x, x - x1), dz = Math.max(z0 - z, z - z1); return dx > 0 && dz > 0 ? Math.hypot(dx, dz) : Math.max(dx, dz); };
// a straight run: its axis from a to b, local (s along, o to the right) ↔ world
const axis = ([ax, az], [bx, bz]) => {
  const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
  return { L, ux, uz, a: Math.atan2(ux, uz), at: (s, o = 0) => [ax + ux * s - uz * o, az + uz * s + ux * o], local: (x, z) => [(x - ax) * ux + (z - az) * uz, -(x - ax) * uz + (z - az) * ux] };
};
const FL = axis(ASYLUM_STEPS.a, ASYLUM_STEPS.b), RW = axis(CLIMB_RAMP[1], CLIMB_RAMP[2]);
// (the user, 5.11, a photo: "there is still a hole here": the ramp was paved on its old ground, which falls away toward
//  the retaining wall's foot, so the cobbles dipped into a trough between the walk and the wall.) The ground across the
//  ramp beside the wall is filled up to the ramp's own height on its axis (never dug), easing out at the wall's ends and
//  past the west kerb, under the wall and a cell past it; beyond, the yard's drop is as it was. world.js islandHeight0 asks this.
export function climbRampFill(x, z, h, H) {
  if (x < -44 || x > -28 || z < -40 || z > -14) return h;
  const [rs, ro] = RW.local(x, z), S0 = CLIMB_WALL.s0 - 1.0, S1 = CLIMB_WALL.s1 + 1.0, E = 2.0;
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
// signed distance to the paved way (negative on it): the ramp, the apron at the flight's foot, the terrace (world.js)
export function climbPaveDist(x, z) {
  if (x < -48 || x > -20 || z < -52 || z > 6) return 99;
  let d = seg(CLIMB_RAMP, x, z) - CLIMB_HW;
  d = Math.min(d, Math.hypot(x - FOOT[0], z - FOOT[1]) - FOOT[2]);
  for (const [x0, z0, x1, z1] of CLIMB_TERRACE) d = Math.min(d, boxD(x, z, x0, z0, x1, z1));
  return d;
}
// inside the masonry (the flight with its cheeks and posts, the ramp's wall, the terrace's railing), grown by pad
export function climbMasonry(x, z, pad = 0) {
  if (x < -40 || x > -20 || z < -52 || z > -16) return false;
  const S = ASYLUM_STEPS, [s, o] = FL.local(x, z), [t, l] = FL2.local(x, z), half = S.w / 2 + S.cheek + 0.1;
  if (s > -0.5 - pad && s < S1 + S.w + S.cheek + 0.3 + pad && Math.abs(o) < half + pad) return true;   // (the first flight, the landing)
  if (t > -0.3 - pad && t < T2_TOP + 0.3 + pad && Math.abs(l) < half + pad) return true;              // (the second flight)
  if (s > S_CORNER - 0.2 - pad && o > 1.2 - pad && l > 1.2 - pad && x < -27.4 + pad && z < -42.8 + pad) return true;   // (the gully south of the second flight, filled)
  if (t > T2_0 - 0.3 - pad && t < T2_TOP + 0.3 + pad && l < -1.2 + pad && l > -4.6 - pad) return true;              // (and north of it)
  const [rs, ro] = RW.local(x, z);
  if (rs > CLIMB_WALL.s0 - 0.4 - pad && rs < CLIMB_WALL.s1 + 0.4 + pad && ro > CLIMB_WALL.o0 - pad && ro < CLIMB_WALL.o1 + 0.1 + pad) return true;
  return seg(TERRACE_RAIL, x, z) < 0.35 + pad;
}
// the scatter keeps out of the masonry and off the paved terrace (world.js)
export function climbClear(x, z, pad = 0) {
  if (climbMasonry(x, z, pad)) return true;
  for (const [x0, z0, x1, z1] of CLIMB_TERRACE) if (boxD(x, z, x0, z0, x1, z1) < pad) return true;
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

// a square stone post with a heavy cap (LBA2's b29, smaller: 0.5 m shaft, 0.64 m cap), standing on y, h tall
function climbPost(k, M, physics, x, z, y, h = 1.15, a = 0) {
  k.add(rbox(0.52, h - 0.24, 0.52, 0.03), M.wall, x, y + (h - 0.24) / 2, z, a);   // (ZFIGHT: 0.52, 1 cm proud of the cheek's 0.5 m coping that runs into it: at 0.5 their sides were one plane)
  k.add(rbox(0.64, 0.2, 0.64, 0.04), M.cap, x, y + h - 0.14, z, a);
  k.add(rbox(0.42, 0.08, 0.42, 0.03), M.cap, x, y + h - 0.0, z, a);
  physics.add({ type: 'box', x, z, hw: 0.32, hd: 0.32, rot: a, top: y + h, noStand: true, seeThrough: true, camSkip: true });   // (the camera passes a post, as a branch: engine/camera.js NEAR-CUT hides it)
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
    const fall = (t) => yc(t) - 0.5 - T(...A.at(t, sd * (hw + cw + 0.5))) > 1.2, mid = (ta + tb) / 2;
    let r0 = null, prev = null;
    const runs = [];
    for (let t = ta + 0.5; t <= tb - 0.5 + 1e-6; t += 0.3) {
      const f = fall(t) && Math.abs(t - mid) > 0.4;
      if (f) { if (r0 == null) r0 = t; prev = t; } else if (r0 != null) { runs.push([r0, prev]); r0 = null; }
    }
    if (r0 != null) runs.push([r0, prev]);
    for (const [a, b] of runs) if (b - a > 0.9) { const [ax, az] = A.at(a, o), [bx, bz] = A.at(b, o); climbRail(k, M, ax, az, bx, bz, yc(a) + 0.14 / Math.cos(p), yc(b) + 0.14 / Math.cos(p), 0.5); }
  };
  const post = (A, t, sd, base, h = 1.2) => { const [px, pz] = A.at(t, sd * (hw + cw / 2)); climbPost(k, M, physics, px, pz, base, h, A.a); };
  // the first flight: the west cheek to the landing, the east one to the terrace's corner
  cheek(F, 0, sL, -1, yc1);
  cheek(F, 0, Math.min(S_CORNER, sL), 1, yc1);
  post(F, -0.15, -1, Math.min(T(...F.at(-0.15, -hw - cw / 2)), y0)); post(F, -0.15, 1, Math.min(T(...F.at(-0.15, hw + cw / 2)), y0));
  post(F, sL / 2, -1, yc1(sL / 2) - 0.5, 1.05);
  if (sL / 2 < S_CORNER - 1.2) post(F, sL / 2, 1, yc1(sL / 2) - 0.5, 1.05);
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
    post(F, sN + cw / 2, -1, Hm, Math.max(top, topN) - Hm + 0.45);
    post(F, sL, -1, Hm, top - Hm + 0.45);   // (where the cheek's slope meets the landing's level wall)
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
  { const [px, pz] = F.at(S_K, OE); climbPost(k, M, physics, px, pz, yt, 1.42, F.a); }   // (the turn's post)
  fill([[F, S_CORNER, S_K - 0.15], [G, T_K + 0.15, T2_TOP]], 1, ([x, z]) => [x, Math.min(z, railZ(x))]);
  // north: along the second flight, from the landing's corner to the top
  wall(G, T2_0 - 0.17, T2_TOP, -OE);   // (from the landing's north-east corner, where the landing's own north wall ends)
  fill([[G, T2_0, T2_TOP]], -1, null);
}

// the ramp's retaining wall over the stone house's yard: on the ramp's second leg, east side, a dressed wall whose top is a
// parapet with a coping 0.45 m over the paving, down below the ground of the yard's bank; capped posts at its ends and
// every ~3 m, a railing between them
function climbRampWall(k, M, physics, T) {
  const R = RW, C = CLIMB_WALL, th = C.o1 - C.o0, om = (C.o0 + C.o1) / 2;
  const hp = (s) => T(...R.at(s, 0));
  const N = Math.ceil((C.s1 - C.s0) / 3.1), step = (C.s1 - C.s0) / N;
  for (let i = 0; i < N; i++) {
    const sa = C.s0 + i * step, sb = sa + step, ya = hp(sa) + 0.45, yb = hp(sb) + 0.45, p = Math.atan2(yb - ya, step), Ls = step / Math.cos(p);
    let D = 0;
    for (let s = sa; s <= sb + 1e-6; s += 0.25) D = Math.max(D, ya + (yb - ya) * (s - sa) / step - Math.min(T(...R.at(s, C.o0)), T(...R.at(s, C.o1 + 0.2))));
    D += 0.6;
    const [mx, mz] = R.at((sa + sb) / 2, om), ym = (ya + yb) / 2;
    k.add(rbox(th, D * Math.cos(p), Ls + 0.04, 0.03), M.wall, mx, ym - D / 2, mz, R.a, { rx: -p });
    k.add(rbox(th + 0.1, 0.14, Ls + 0.04, 0.03), M.cap, mx, ym + 0.07 / Math.cos(p), mz, R.a, { rx: -p });
    // (CLIMB-2: a base course along the wall's foot on the paving side, 8 cm proud: the ground's grid is 0.9 m, so the
    //  last few centimetres of paving at the wall's face can't follow the incline exactly; the course is the edge there)
    { const [cx, cz] = R.at((sa + sb) / 2, C.o0 - 0.13), yb = (hp(sa) + hp(sb)) / 2; k.add(rbox(0.28, 0.5, Ls + 0.04, 0.03), M.wall, cx, yb + 0.08 - 0.25 / Math.cos(p), cz, R.a, { rx: -p }); }
    const [ax, az] = R.at(sa + 0.3, om), [bx, bz] = R.at(sb - 0.3, om);
    climbRail(k, M, ax, az, bx, bz, ya + 0.14 + (yb - ya) * 0.3 / step, yb + 0.14 - (yb - ya) * 0.3 / step, 0.5);
    for (let j = 0; j < 3; j++) { const a = sa + (j / 3) * step, b = sa + ((j + 1) / 3) * step, [px, pz] = R.at((a + b) / 2, om), hm = Math.max(hp(a), hp(b)); climbRailCol(physics, px, pz, th / 2 + 0.05, step / 6 + 0.05, R.a, hm + 0.59, hm + 1.1); }   // (in thirds: the camera passes close over them)
  }
  for (let i = 0; i <= N; i++) { const s = C.s0 + i * step, [px, pz] = R.at(s, om); climbPost(k, M, physics, px, pz, hp(s), 1.25, R.a); }
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
  for (let i = 0; i < CLIMB_RAMP.length - 1; i++) {
    const R = axis(CLIMB_RAMP[i], CLIMB_RAMP[i + 1]);
    for (let s = 0.3; s < R.L; s += 0.55) for (const sd of [-1, 1]) {
      const [x, z] = R.at(s, sd * (CLIMB_HW + 0.08));
      if (Math.hypot(x - V[0], z - V[1]) < 10.2) continue;
      if (streetDist(x, z) < 0.2) continue;
      if (i === 1 && sd > 0 && s > CLIMB_WALL.s0 - 0.5 && s < CLIMB_WALL.s1 + 0.5) continue;
      if (i === 1 && sd < 0 && s > R.L - 3.2) continue;
      if (i === 1 && s > R.L - 1.6) continue;
      if (climbMasonry(x, z, 0.15)) continue;   // (none under the stair's foot)
      let y = -Infinity; for (const [da, dc] of [[0, 0], [0.28, 0.1], [0.28, -0.1], [-0.28, 0.1], [-0.28, -0.1]]) y = Math.max(y, T(x + R.ux * da - R.uz * dc, z + R.uz * da + R.ux * dc));   // (on the highest ground under it: its top never sinks to the ground's)
      pos.push([x, y, z, R.a]);
    }
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
      stone: 'grey', lamp: '#ffd9a8', lampI: 15, view: 24, topCol: '#ffe8c4', sideCol: '#e4e8f0',   // (WORLD-ART-7: warm cream floors, cooler walls; ASYLUM-2: a home now, warm lamps)
      gridZones: true, overhead: true, footing: { depth: 9, below: 1 },   // (order 8: the store's edge, its walls carried down into the dark)
      clear: [[44, 30, 63, 62, 17]],   // (order 8: the cell block's ceiling beams (cells 17–18), their pillars cut away on the camera's side: slabs hanging over the cells and the corridor)
      lids: [{ box: ASYLUM_CELLS[0], cut: 6, name: 'cellA', sight: true }, { box: ASYLUM_CELLS[1], cut: 6, name: 'cellB', sight: true }, { box: VESK_ROOM, cut: 7, name: 'vesk', sight: true }],
      // (ASYLUM-2: the first cell's door opened like Twinsen's, at corridor level, a step inside it; Vesk's office, a
      //  room LBA1 kept behind a moving door, its door broken through the corridor wall at cells 41–42 of z 30)
      carve: [[56, 4, 50, 57, 6, 50], [56, 5, 45, 57, 6, 45], [41, 5, 30, 42, 9, 30]],
    });
    R.grade = 0.45; R.gradeTint = [1.03, 1.0, 0.95];   // (WA-13b: LBA1's grey stone, chroma 4-6; ASYLUM-2: lived in, the Esmer colours a little up, warm)
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
