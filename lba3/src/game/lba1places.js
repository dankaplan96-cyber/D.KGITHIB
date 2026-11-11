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
//   bumaze   the Temple of Bù's spiked maze (LBA1 room 57), down a stair from our Temple of Bù (chapter 4)
//   buhalls  the temple's dark halls (LBA1 room 40), past the maze; crystal mites where LBA1 had its creatures,
//            and at the far end the way back up
// Doors and exits are open in every chapter (src/game/story/index.js via lba1Doors / lba1Exit).
import * as THREE from 'three';
import { buildLba1Room, hasLba1Room } from './lba1room.js';
export { hasLba1Room };
import { MAT, rbox, plane, cyl, canvasTex } from './props.js';
import { tube } from './kit.js';
import { buildAsylumFront, dressAsylum, ASYLUM_FRONT } from './asylumhostel.js';
export { ASYLUM_FRONT };

export const LBA1_AT = { asylum: { x: 7000, z: 0 }, bumaze: { x: 7200, z: 0 }, buhalls: { x: 7400, z: 0 } };
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

// WORLD-AUDIT: the way up to the block-house. The ground round the fort's south and east walls, where the door stands,
// is a terrace 1–2.5 m above the plateau, and every way onto it (the dirt path at the south-west tower, the ledge west
// of it) rises 2–2.6 m in about 1.5–2.5 m: too steep to walk and above a jump, so the asylum could not be reached at all
// (a flood fill of the walkable ground from the town and the depot never met the door's). A short flight of the
// block-house's stone steps from the plateau's flat up the ledge onto the terrace, east toward the fort. Each riser is
// within a walking step (physics STEP_UP 0.55), read from the terrain at both ends when it is built; each tread is deeper
// than his body (radius 0.4 m) and above the slope it covers; each step's collider runs on under the steps above it, so
// the seam between two treads never reads as the ground below them.
// (x0 → xt: the treads up the ledge, ~0.6 m each; xt → x1: the top step, out over the terrace's flat)
export const ASYLUM_STEPS = { x0: -32.0, xt: -29.0, x1: -27.6, z: -45.0, w: 1.0, n: 6 };
function asylumSteps(scene, physics) {
  const S = ASYLUM_STEPS, T = (x, z) => physics.terrain.heightAt(x, z);
  const y0 = T(S.x0 - 0.3, S.z), y1 = T(S.x1 + 0.2, S.z), rise = (y1 - y0) / S.n, run = (S.xt - S.x0) / (S.n - 1);
  const g = new THREE.Group(); g.name = 'asylum-steps'; scene.add(g);
  const stone = MAT.stone('grey', 2);
  let last = y0;
  for (let i = 0; i < S.n; i++) {
    const xs = S.x0 + i * run, xe = i < S.n - 1 ? xs + run : S.x1;
    let under = -Infinity;   // the slope's highest point under the tread
    for (let u = 0; u <= 1; u += 0.25) for (let v = -0.5; v <= 0.5; v += 0.25) under = Math.max(under, T(xs + u * (xe - xs), S.z + v * S.w));
    const top = Math.max(y0 + (i + 1) * rise, under + 0.03, last);
    last = top;
    const bottom = Math.min(T(xs, S.z), y0) - 0.4;
    const o = new THREE.Mesh(rbox(xe - xs + 0.02, top - bottom, S.w, 0.03), stone);
    o.position.set((xs + xe) / 2, (top + bottom) / 2, S.z); o.castShadow = o.receiveShadow = true; g.add(o);
    physics.add({ type: 'box', x: (xs + S.x1) / 2, z: S.z, hw: (S.x1 - xs) / 2, hd: S.w / 2, rot: 0, top });
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
    R.exits.push({ x: goal.x, z: goal.z, r: 0.8, room: 'buhalls' });
    R.goal = goal;
  }
  if (hasLba1Room('buhalls')) {
    const R = out.buhalls = buildLba1Room(scene, physics, 'buhalls', 'buhalls', A.buhalls.x, A.buhalls.z, { stone: 'slate', lamp: '#9fc8ff', lampI: 12, view: 24, tint: 1.6, topCol: '#f0d0a4' });   // (WORLD-ART-7: sandy worn floors against the slate walls)
    R.grade = 0.32;   // (WA-13b: LBA1's rooms are grey stone; measured on the laptop against LBA1: chroma 4-6)
    R.cave = true; R.music = 'cave';
    const st = R.cell(3, 17, 3.2), far = R.cell(61, 17, 1.4), give = R.cell(61, 17, 4);
    R.spawn = { x: st.x, z: st.z, a: 0 };
    R.entries = { bumaze: R.spawn };
    R.exits.push({ x: far.x, z: far.z, r: 1.0, room: 'butemple' });
    R.givers.push({ id: 'bu_halls', x: give.x, z: give.z, y: give.y, r: 1.2, top: 1, kinds: ['life', 'magic', 'clover'], n: 3 });
    R.mites = (R.spots || []).filter((s) => s.body === 59).slice(0, 6);
  }
  if (out.bumaze && out.buhalls) out.bumaze.entries = { butemple: out.bumaze.spawn };
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

// the asylum's guards, where LBA1's nurses (bodies 9, 11) and clone (13) stood; the halls' crystal mites
export function lba1EnemyDefs(rooms) {
  const out = [], A = rooms.asylum, H = rooms.buhalls;
  const after = (f) => !!f.prologueDone;
  if (A?.spots) {
    let n = 0;
    for (const s of A.spots) {
      if (s.body === 9 || s.body === 11) out.push({ id: 'asy_g' + n++, kind: n % 3 === 0 ? 'guardG' : 'guard', group: 'asylum', x: s.x, z: s.z, patrol: [[s.x, s.z], [s.x + 1.6, s.z]], when: after });
      else if (s.body === 13) out.push({ id: 'asy_fc', kind: 'fclone', group: 'asylum', x: s.x, z: s.z, patrol: [[s.x, s.z]], when: after });
    }
    const d1 = A.cell(30, 5, 30), d2 = A.cell(20, 5, 20);
    out.push({ id: 'asy_dog1', kind: 'gdog', coat: 'grey', group: 'asylum', x: d1.x, z: d1.z, patrol: [[d1.x, d1.z], [d1.x + 3, d1.z]], when: after });
    out.push({ id: 'asy_dog2', kind: 'gdog', coat: 'brown', group: 'asylum', x: d2.x, z: d2.z, patrol: [[d2.x, d2.z], [d2.x, d2.z + 3]], when: after });
  }
  if (H?.mites) H.mites.forEach((m, i) => out.push({ id: 'buh_mite' + i, kind: 'mite', group: 'buhalls', x: m.x, z: m.z }));
  return out;
}
