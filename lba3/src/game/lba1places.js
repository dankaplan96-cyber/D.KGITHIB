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
import { Kit } from './props.js';
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
//   the flight   from the fork straight on up both ledges to the terrace (ASYLUM_STEPS; it replaces WORLD-AUDIT's narrow
//                1 m stair up the upper ledge): 27 dressed steps, 2.6 m wide, between two cheek walls with a coping, a
//                capped post at each corner and halfway, a railing on a side where the ground falls away; a short landing
//                at the top, level with the terrace
//   the terrace  before the fort's south wall (CLIMB_TERRACE), paved from the flight's top to the wall's foot, where
//                ASYLUM-2's front door stands; a railing on a stone plinth with capped posts along its edge over the cliff
// Walkable by input: each riser ~0.24 m, never over 0.26 (physics STEP_UP 0.55), each tread 0.385 m,
// above the slope it covers (raised where the ground stands higher, never lower than the one before); each step's
// collider runs on under the steps above it, so the seam between two treads never reads as the ground below them. Walls,
// cheeks and railings stop a walk or a fall off the edge and let the camera look over them (see-through). Nothing a story
// uses moves: the stump's clover (island.js STUMP), the stone house's upper door, the water main's legs keep their room.
// The scatter keeps out of the masonry and off the paved terrace, and the cliff rocks under the flight are left out whole
// (world.js, climbClear).
export const ASYLUM_STEPS = { a: [-33.0, -37.2], b: [-31.5, -47.5], w: 2.6, n: 27, cheek: 0.4, land: 1.5 };
export const CLIMB_RAMP = [[-42, -4], [-37, -20], [-34, -36]];   // (world.js PATHS[0] as far as the fork)
const CLIMB_HW = 1.55;                                           // the paved ramp's half width
export const CLIMB_WALL = { s0: 0.8, s1: 10.0, o0: 1.62, o1: 2.1 };   // along CLIMB_RAMP's second leg: from, to; inner, outer face
export const CLIMB_TERRACE = [[-28.6, -50.4, -22.8, -43.2], [-31.9, -50.4, -28.6, -47.7]];   // paved boxes [x0, z0, x1, z1]
const TERRACE_RAIL = [[-28.4, -46.6], [-28.4, -42.95], [-23.3, -42.6]];
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
  const S = ASYLUM_STEPS, [s, o] = FL.local(x, z), half = S.w / 2 + S.cheek + 0.1;
  if (s > -0.5 - pad && s < FL.L + S.land + 0.1 + pad && Math.abs(o) < half + pad) return true;
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

// a square stone post with a heavy cap (LBA2's b29, smaller: 0.5 m shaft, 0.64 m cap), standing on y, h tall
function climbPost(k, M, physics, x, z, y, h = 1.15, a = 0) {
  k.add(rbox(0.5, h - 0.24, 0.5, 0.03), M.wall, x, y + (h - 0.24) / 2, z, a);
  k.add(rbox(0.64, 0.2, 0.64, 0.04), M.cap, x, y + h - 0.14, z, a);
  k.add(rbox(0.42, 0.08, 0.42, 0.03), M.cap, x, y + h - 0.0, z, a);
  physics.add({ type: 'box', x, z, hw: 0.32, hd: 0.32, rot: a, top: y + h, noStand: true, seeThrough: true });
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

// the flight: treads, cheek walls with a coping, posts, railings, the landing at the top
function climbFlight(k, M, physics, T) {
  const S = ASYLUM_STEPS, F = FL, W = S.w, cw = S.cheek, n = S.n;
  // (y1: the terrace's flat a little way in, past its rim: the top step and the landing stand level with it, so the
  //  landing runs out over the rim and he walks off it onto the flat, not up the rim's steep lip)
  const y0 = T(...F.at(-0.3)), y1 = Math.max(T(...F.at(F.L + 1.9)), T(...F.at(F.L + 1.9, -0.5)), T(...F.at(F.L + 1.9, 1))) + 0.03;
  const rise = (y1 - y0) / n, run = F.L / n, end = F.L + S.land;
  const under = (s0, s1, o0, o1, f) => { let v = f === Math.max ? -Infinity : Infinity; for (let u = 0; u <= 1; u += 0.25) for (let w = 0; w <= 1; w += 0.25) v = f(v, T(...F.at(s0 + u * (s1 - s0), o0 + w * (o1 - o0)))); return v; };
  // each tread on the line, or over the slope where it stands higher; then no riser over RMAX (an earlier tread is
  // raised instead: his body reaches two treads ahead, so two risers together stay under the step he can take)
  const RMAX = 0.26, tops = [];
  for (let i = 0; i < n; i++) tops.push(Math.max(y0 + (i + 1) * rise, under(i * run, (i + 1) * run, -W / 2, W / 2, Math.max) + 0.03));
  for (let i = n - 2; i >= 0; i--) tops[i] = Math.max(tops[i], tops[i + 1] - RMAX);
  for (let i = 1; i < n; i++) tops[i] = Math.max(tops[i], tops[i - 1]);
  tops.push(tops[n - 1]);   // (the landing)
  // (the landing: its west edge kept 0.1 m clear of the water main's leg beside it, o0..o1 across)
  const LO = [-1.05, W / 2];
  for (let i = 0; i <= n; i++) {   // (i = n: the landing)
    const s0 = i * run, s1 = i < n ? s0 + run : end, top = tops[i], [o0, o1] = i < n ? [-W / 2, W / 2] : LO;
    const bottom = Math.min(under(s0, s1, o0 - cw, o1 + cw, Math.min), y0) - 0.4;
    const [cx, cz] = F.at((s0 + s1) / 2, (o0 + o1) / 2);
    k.add(rbox(o1 - o0, top - bottom, s1 - s0 + 0.02, 0.025), M.tread, cx, (top + bottom) / 2, cz, F.a);
    // (each tread's collider runs on under the treads above it and 0.2 m into the landing; the landing's its own)
    const se = i < n ? F.L + 0.2 : end, [qx, qz] = F.at((s0 + se) / 2, (o0 + o1) / 2);
    physics.add({ type: 'box', x: qx, z: qz, hw: (o1 - o0) / 2, hd: (se - s0) / 2, rot: F.a, top });
  }
  // the cheeks: a dressed wall each side, its coping a straight line 0.5 m over the treads' nosings, from the foot to
  // the top step (the landing stays open, the way on to the terrace); down to below the ground all along
  const yc = (s) => tops[0] + 0.5 + (s - run / 2) * (tops[n - 1] - tops[0]) / (F.L - run);
  const p = Math.atan((tops[n - 1] - tops[0]) / (F.L - run)), Ls = F.L / Math.cos(p);
  // railings on both cheeks where the ground beside either falls away more than 1.2 m (the lower half, over the shelf)
  const fall = (s) => [-1, 1].some((sd) => yc(s) - 0.5 - T(...F.at(s, sd * (W / 2 + cw + 0.5))) > 1.2);
  const runs = [];
  let r0 = null, prev = null;
  for (let s = 0.6; s <= F.L - 0.9 + 1e-6; s += 0.3) {
    const f = fall(s) && Math.abs(s - F.L / 2) > 0.4;   // (not through the halfway posts)
    if (f) { if (r0 == null) r0 = s; prev = s; } else if (r0 != null) { runs.push([r0, prev]); r0 = null; }
  }
  if (r0 != null) runs.push([r0, prev]);
  for (const sd of [-1, 1]) {
    const o = sd * (W / 2 + cw / 2);
    let D = 0;
    for (let s = 0; s <= F.L; s += 0.25) D = Math.max(D, yc(s) - Math.min(T(...F.at(s, o - cw / 2)), T(...F.at(s, o + cw / 2))));
    D += 0.5;
    const [mx, mz] = F.at(F.L / 2, o), ym = yc(F.L / 2);
    k.add(rbox(cw, D * Math.cos(p), Ls, 0.03), M.wall, mx, ym - D / 2, mz, F.a, { rx: -p });
    k.add(rbox(cw + 0.1, 0.14, Ls + 0.06, 0.03), M.cap, mx, ym + 0.07 / Math.cos(p), mz, F.a, { rx: -p });
    // collision: in six pieces, each as high as its upper end's coping
    for (let j = 0; j < 6; j++) {
      const sa = (j / 6) * F.L, sb = ((j + 1) / 6) * F.L, [px, pz] = F.at((sa + sb) / 2, o);
      physics.add({ type: 'box', x: px, z: pz, hw: cw / 2 + 0.05, hd: (sb - sa) / 2 + 0.05, rot: F.a, top: yc(sb) + 0.15, noStand: true, seeThrough: true });
    }
    for (const [sa, sb] of runs) if (sb - sa > 0.9) { const [ax, az] = F.at(sa, o), [bx, bz] = F.at(sb, o); climbRail(k, M, ax, az, bx, bz, yc(sa) + 0.14 / Math.cos(p), yc(sb) + 0.14 / Math.cos(p), 0.5); }
    // the posts: at the foot, halfway, at the top step
    for (const [s, base] of [[-0.15, y0], [F.L / 2, yc(F.L / 2) - 0.5], [F.L - 0.15, tops[n - 1]]]) {
      const [px, pz] = F.at(s, o), gy = s < 0 ? Math.min(T(px, pz), y0) : base;
      climbPost(k, M, physics, px, pz, gy, s < 0 ? 1.2 : yc(s) - base + 0.55, F.a);
    }
  }
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
    const [ax, az] = R.at(sa + 0.3, om), [bx, bz] = R.at(sb - 0.3, om);
    climbRail(k, M, ax, az, bx, bz, ya + 0.14 + (yb - ya) * 0.3 / step, yb + 0.14 - (yb - ya) * 0.3 / step, 0.5);
    physics.add({ type: 'box', x: mx, z: mz, hw: th / 2 + 0.05, hd: step / 2 + 0.05, rot: R.a, top: Math.max(ya, yb) + 0.65, noStand: true, seeThrough: true });
  }
  for (let i = 0; i <= N; i++) { const s = C.s0 + i * step, [px, pz] = R.at(s, om); climbPost(k, M, physics, px, pz, hp(s), 1.25, R.a); }
}

// the terrace's railing over the cliff: a low dressed plinth, the iron railing on it, capped posts at its corners
function climbTerraceRail(k, M, physics, T) {
  const P = TERRACE_RAIL;
  for (let i = 0; i < P.length - 1; i++) {
    const [x0, z0] = P[i], [x1, z1] = P[i + 1], L = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0);
    let hi = -Infinity, lo = Infinity;
    for (let t = 0; t <= 1; t += 0.1) { const h = T(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t); hi = Math.max(hi, h); lo = Math.min(lo, h); }
    const top = hi + 0.22, bot = lo - 0.5;
    k.add(rbox(0.34, top - bot, L, 0.03), M.wall, (x0 + x1) / 2, (top + bot) / 2, (z0 + z1) / 2, a);
    k.add(rbox(0.42, 0.1, L + 0.06, 0.03), M.cap, (x0 + x1) / 2, top + 0.05, (z0 + z1) / 2, a);
    climbRail(k, M, x0 + (x1 - x0) * 0.3 / L, z0 + (z1 - z0) * 0.3 / L, x1 - (x1 - x0) * 0.3 / L, z1 - (z1 - z0) * 0.3 / L, top + 0.1, top + 0.1, 0.6);
    physics.add({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: 0.22, hd: L / 2, rot: a, top: top + 0.75, noStand: true, seeThrough: true });
  }
  for (const [x, z] of P) climbPost(k, M, physics, x, z, T(x, z), 1.2);
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
      pos.push([x, T(x, z), z, R.a]);
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
  const M = { tread: MAT.stone('sand', 1), wall: MAT.stone('grey', 2), cap: MAT.plaster('#e2dccf'), iron: MAT.paint('#2a9a8a', 0.4) };
  climbFlight(k, M, physics, T);
  climbRampWall(k, M, physics, T);
  climbTerraceRail(k, M, physics, T);
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
      gridZones: true, overhead: true,
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
