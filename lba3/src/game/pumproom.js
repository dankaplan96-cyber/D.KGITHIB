// CAMPAIGN-2 (the user's treatment of 11.11.2026, section 2 "Citadel — the wrong pipe"): the lane's pump room. Ours
// (the sequel's; LBA2 has no such room): a small stone pump house on the lane by Twinsen's home, where the project's
// copper pipe goes into the ground beside Bram's old hand pump (townlife.js), and the room under it.
//
// Above: a door, a sign (TOWN WATER · PUMP ROOM), the pipe's riser by the door (it knocks: story/hometap.js).
// Below: the fitters' workshop by the stairs (a bench with a vice, the tool board, a lamp, a stool, their lunch) under
// the town main's wall diagram (two pipes: the upper to the SQUARE, the lower to the HOUSES); three pipes come out of
// the back wall (the third is copper, new, not on the diagram: it shivers three beats and rests) and run behind a brick
// pier to the bypass: a cock on each old pipe, the booster pump the project set on the copper one (its maker's plate:
// IRSA'S PUMP WORKS · MILL LANE · ZEELICH · No. 14) and the pump's gauge with its paper strip.
//
// CONTRACT (story/pumpline.js)
//   PUMPROOM_AT, buildPumpRoom(scene, physics) → room 'pumproom' (regions.js)
//   R.pump {diagram, feel: {upper, lower, copper}, pier, alcoveX, cocks: {upper, lower} each {x, z, front, set(open)},
//           plate, gauge, strip (mesh), setState({bypass, wrong, strip}), shake(which, t), kick(), copper (the shaking run)}
//           points are world {x, z}; `front` is where he stands to put a hand on the thing
//   buildPumpKiosk(game) → W.pumpKiosk {x, z, door {x, z}, out {x, z, a}, pipe {x, y, z}, grp (the riser: it rattles)}
//   pumpDoors(W, flags) / pumpExit(to, W): the door leads down once the project's worker has unlocked it (chapter 2 with
//   the water back, and every later chapter); 'pump-out' leads back up before it
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import * as P from './props.js';
import { MAT, rbox, plane, cyl, torus, sphere, canvasTex } from './props.js';
import { mergeStatic } from '../engine/merge.js';

export const PUMPROOM_AT = { x: 9700, z: 600 };
const KIOSK = { x: -48.9, z: 65.6, w: 2.3, d: 2.1, h: 2.25 };   // on the grass west of the lane, its door toward the lane (east)

const signTex = (lines, { bg = '#e8dcc0', ink = '#2a1a10', w = 512, h = 128, size = 40 } = {}) => canvasTex(w, h, (x, W, H) => {
  x.fillStyle = bg; x.fillRect(0, 0, W, H); x.strokeStyle = ink; x.lineWidth = 5; x.strokeRect(4, 4, W - 8, H - 8);
  x.fillStyle = ink; x.textAlign = 'center'; x.font = `bold ${size}px sans-serif`;
  lines.forEach((l, i) => x.fillText(l, W / 2, H / 2 + size * 0.36 + (i - (lines.length - 1) / 2) * size * 1.1));
});
// the town main as the water office drew it: one pipe in, two out (no third)
const diagramTex = () => canvasTex(512, 320, (x, W, H) => {
  x.fillStyle = '#e4d8b8'; x.fillRect(0, 0, W, H); x.strokeStyle = '#3a2a1a'; x.lineWidth = 5; x.strokeRect(4, 4, W - 8, H - 8);
  x.fillStyle = '#2a1a10'; x.font = 'bold 30px serif'; x.textAlign = 'left'; x.fillText('TOWN MAIN · LANE JUNCTION', 26, 44);
  const line = (pts, col) => { x.strokeStyle = col; x.lineWidth = 14; x.lineJoin = 'round'; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); };
  line([[40, 190], [170, 190]], '#5a6068');
  line([[170, 190], [170, 110], [470, 110]], '#5a6068');
  line([[170, 190], [170, 250], [470, 250]], '#5a6068');
  x.fillStyle = '#8a2a1a'; for (const [a, b] of [[230, 110], [230, 250]]) { x.beginPath(); x.arc(a, b, 15, 0, 7); x.fill(); }
  x.fillStyle = '#2a1a10'; x.font = 'bold 26px sans-serif';
  x.fillText('FROM THE WELL', 30, 160); x.fillText('UPPER  →  SQUARE', 250, 90); x.fillText('LOWER  →  HOUSES', 250, 300);
});
const plateTex = () => signTex(["IRSA'S PUMP WORKS", 'MILL LANE · ZEELICH · No. 14'], { bg: '#c9a040', ink: '#2a1a08', w: 512, h: 160, size: 34 });
const stripTex = () => canvasTex(256, 64, (x, W, H) => {
  x.fillStyle = '#f2ecd8'; x.fillRect(0, 0, W, H); x.strokeStyle = '#8a2a1a'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 40);
  for (let i = 0; i < 4; i++) { const b = 8 + i * 62; for (let k = 0; k < 3; k++) { x.lineTo(b + k * 12, 40); x.lineTo(b + k * 12 + 4, 12); x.lineTo(b + k * 12 + 8, 40); } x.lineTo(b + 62, 40); }
  x.stroke();
});
const dialTex = () => canvasTex(128, 128, (x, W, H) => {
  x.fillStyle = '#f2ecdc'; x.beginPath(); x.arc(W / 2, H / 2, 60, 0, 7); x.fill(); x.strokeStyle = '#2a2a2a'; x.lineWidth = 3;
  for (let v = 0; v <= 6; v++) { const a = Math.PI * (1.15 + v * 0.117); x.beginPath(); x.moveTo(W / 2 + Math.cos(a) * 44, H / 2 + Math.sin(a) * 44); x.lineTo(W / 2 + Math.cos(a) * 56, H / 2 + Math.sin(a) * 56); x.stroke(); }
});

// ------------------------------------------------------------------ the pump house on the lane (Citadel)
export function buildPumpKiosk(game) {
  const W = game.world, PH = game.physics;
  if (W.pumpKiosk) return W.pumpKiosk;
  const { x, z, w, d, h } = KIOSK, gy = PH.groundAt(x, z);
  const grp = new THREE.Group(); grp.position.set(x, gy, z); W.root.add(grp);
  const add = (geo, m, px, py, pz, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; grp.add(o); return o; };
  const stone = MAT.stone('sand', 1.4), slate = MAT.stone('slate', 1.2), wood = MAT.wood('dark');
  add(rbox(w, h, d, 0.05), stone, 0, h / 2, 0);
  add(rbox(w + 0.5, 0.16, d + 0.5, 0.04), slate, 0, h + 0.08, 0);
  add(rbox(w + 0.14, 0.3, d + 0.14, 0.04), slate, 0, 0.15, 0);
  // the door in the east face, two stone steps, the sign over it
  add(rbox(0.08, 1.85, 1.0, 0.02), wood, w / 2 + 0.02, 0.95, 0);
  add(rbox(0.05, 0.08, 0.5, 0.01), MAT.iron(), w / 2 + 0.07, 1.0, 0.3);
  add(rbox(0.5, 0.14, 1.3, 0.03), slate, w / 2 + 0.3, 0.07, 0);
  add(plane(1.5, 0.36), MAT.map(signTex(['TOWN WATER · PUMP ROOM'], { size: 34, h: 120 })), w / 2 + 0.065, 2.0, 0, Math.PI / 2);
  mergeStatic(grp, { recolor: true, retex: true });
  PH.add({ type: 'box', x, z, hw: w / 2, hd: d / 2, rot: 0, top: gy + h + 0.16 });
  // the copper riser by the door: up out of the ground and into the wall (it rattles: kept apart, one draw)
  const px = x + w / 2 + 0.1, pz = z + d / 2 - 0.25;
  const riser = new THREE.Group(); riser.position.set(px, gy, pz); riser.userData.keep = true; W.root.add(riser);
  const cu = MAT.copper();
  const r1 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.25, 10), cu); r1.position.y = 0.625; riser.add(r1);
  const r2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.24, 10), cu); r2.position.set(-0.1, 1.25, 0); r2.rotation.z = Math.PI / 2; riser.add(r2);
  const r3 = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.02, 6, 12), MAT.brass()); r3.position.y = 0.5; r3.rotation.x = Math.PI / 2; riser.add(r3);
  mergeStatic(riser, { recolor: false });
  PH.add({ type: 'cyl', x: px, z: pz, r: 0.12, top: gy + 1.3, noStand: true, seeThrough: true });
  W.pumpKiosk = { x, z, y: gy, door: { x: x + w / 2 + 0.35, z }, out: { x: x + w / 2 + 1.5, z, a: Math.PI / 2 }, pipe: { x: px, y: gy, z: pz }, grp: riser, t: null };
  return W.pumpKiosk;
}

// the door: open from the moment the project's worker has unlocked it (chapter 2, the water back), and afterwards
const pumpOpen = (f) => { const k = f.chapterKey; return k ? k !== 'well' && (k !== 'project' || !!f.c1_water) : (f.chapter || 0) >= 2 || ((f.chapter || 0) === 1 && !!f.c1_water); };
export function pumpDoors(W, f) { const K = W?.pumpKiosk; return K && pumpOpen(f || {}) ? [{ x: K.door.x, z: K.door.z, r: 0.75, room: 'pumproom' }] : []; }
export function pumpExit(to, W) { const K = W?.pumpKiosk; return to === 'pump-out' && K ? { ...K.out } : null; }

// ------------------------------------------------------------------ the room under it
export function buildPumpRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'pumproom', PUMPROOM_AT.x, PUMPROOM_AT.z);
  const R = B.room, k = B.k;
  const W = 11, D = 8, H = 3.5, BZ = -D / 2, LX = -W / 2;
  R.view = 11.5; R.follow = 0.35; R.music = 'facility';
  B.shell({ floor: MAT.stone('slate', 2.4), slab: MAT.rubble('slate'), body: MAT.stone('sand', 1.7), low: MAT.stone('slate', 1.2), rail: MAT.wood('dark'), cap: MAT.stone('slate', 1.4), rimMat: MAT.rubble('slate'),
    W, D, H, t: 0.45, dado: 0.9, rimH: 0.5, left: [{ at: 2.3, w: 1.5, h: 2.5, y0: 0, kind: 'door' }] });
  R.exits.push({ x: B.cx + LX + 0.5, z: B.cz + 2.3, r: 0.75, to: 'pump-out' });
  R.spawn = { x: B.cx + LX + 1.8, z: B.cz + 2.3, a: Math.PI / 2 };
  const wpt = (x, z) => ({ x: B.cx + x, z: B.cz + z });
  const iron = MAT.iron(), brass = MAT.brass(), cu = MAT.copper(), old = MAT.paint('#56606a', 0.6), old2 = MAT.paint('#3f474f', 0.65);

  // ---- the fitters' workshop by the stairs: the bench under the tool board, a stool, their lunch, crates of fittings
  B.put(LX + 0.55, -0.9, Math.PI / 2, (kk) => P.workbench(kk, { w: 2.2 }));
  k.at(LX + 0.06, 1.55, -0.9, Math.PI / 2, () => P.toolBoard(k, 1.8, 0.75));
  P.oilCan(k, LX + 0.5, 0.9, -1.75, 0.6);
  k.add(rbox(0.26, 0.12, 0.18, 0.02), MAT.paint('#b8483b', 0.5), LX + 0.55, 0.96, -0.35, 0.3);            // a lunch tin
  k.add(cyl(0.04, 0.035, 0.09, 10), MAT.paint('#e8e0c8', 0.4), LX + 0.62, 0.945, -0.05);                   // and a mug
  k.at(LX + 1.5, 0, -0.6, 0.4, () => { k.add(cyl(0.2, 0.2, 0.05, 12), MAT.wood('honey'), 0, 0.5, 0); for (let i = 0; i < 3; i++) k.add(cyl(0.02, 0.025, 0.5, 6), MAT.wood('dark'), Math.cos(i * 2.1) * 0.14, 0.25, Math.sin(i * 2.1) * 0.14); });
  B.ccol(LX + 1.5, -0.6, 0.22, 0.52, { noStand: true });
  for (const [x, z, ry] of [[LX + 0.6, 0.95, 0.1], [LX + 0.65, -3.2, 0.3]]) B.put(x, z, ry, (kk) => P.cargoCrate(kk, { color: '#6a5a44', w: 0.7, h: 0.6, d: 0.7 }));
  B.put(LX + 1.5, -3.3, -0.2, (kk) => P.barrel(kk, { pal: 'dark' }));
  k.at(-3.0, 0, -0.6, 0, () => P.hangingLamp(k, 2.35, H, { shade: '#8a5a2a' }));
  for (let i = 0; i < 4; i++) k.add(cyl(0.07, 0.07, 2.6, 8), i % 2 ? MAT.copper() : MAT.iron(), -0.6 + (i % 2) * 0.16, 0.08 + Math.floor(i / 2) * 0.14, D / 2 - 0.45, 0, { rz: Math.PI / 2 });   // spare lengths by the front wall
  B.col(-0.5, D / 2 - 0.45, 1.4, 0.2, 0.32, { noStand: true });
  k.add(torus(0.3, 0.04, 6, 16), MAT.paint('#4a3a2a', 0.8), LX + 0.1, 1.5, 0.9, Math.PI / 2);                 // a coil of hose on the wall
  k.add(torus(0.24, 0.04, 6, 16), MAT.paint('#4a3a2a', 0.8), LX + 0.14, 1.5, 0.9, Math.PI / 2);
  k.add(cyl(0.14, 0.14, 0.02, 12), MAT.iron(), 1.2, 0.011, 1.0);                                                // the floor drain
  // the wall diagram over the pipes' way in
  k.add(rbox(2.16, 1.4, 0.05, 0.02), MAT.wood('dark'), -3.6, 2.05, BZ + 0.03);
  k.add(plane(2.0, 1.25), MAT.map(diagramTex()), -3.6, 2.05, BZ + 0.062);

  // ---- three pipes out of the back wall: each a riser, an elbow and a run east along the wall, behind the pier
  const PZ = BZ + 0.42, RUN1 = 5.25;
  const riser = (x, y, m, r) => { k.add(cyl(r, r, y, 10), m, x, y / 2, PZ); k.add(sphere(r * 1.25, 10, 8), m, x, y, PZ); k.add(torus(r * 1.3, 0.02, 6, 12), brass, x, 0.4, PZ, 0, { rx: Math.PI / 2 }); B.ccol(x, PZ, r + 0.04, y, { noStand: true }); };
  const UP = { x: -1.7, y: 2.35, r: 0.11 }, LO = { x: -0.5, y: 1.6, r: 0.11 }, CU = { x: 0.7, y: 0.8, r: 0.085 };
  riser(UP.x, UP.y, old, UP.r); riser(LO.x, LO.y, old2, LO.r);
  k.add(cyl(UP.r, UP.r, 4.0 - UP.x, 10), old, (4.0 + UP.x) / 2, UP.y, PZ, 0, { rz: Math.PI / 2 });
  // (the lower run and the copper one move: Zoé's knocks, the copper's shiver — each its own mesh)
  const mk = (geo, m, x, y, z, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.z = rz; o.castShadow = true; B.group.add(o); return o; };
  const lowerRun = mk(new THREE.CylinderGeometry(LO.r, LO.r, 5.0 - LO.x, 10), old2, (5.0 + LO.x) / 2, LO.y, PZ, Math.PI / 2);
  const copper = new THREE.Group(); copper.userData.keep = true; B.group.add(copper);
  const cm = (geo, x, y, z, rz = 0, rx = 0) => { const o = new THREE.Mesh(geo, cu); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); o.castShadow = true; copper.add(o); };
  cm(new THREE.CylinderGeometry(CU.r, CU.r, CU.y, 10), CU.x, CU.y / 2, PZ);
  cm(new THREE.SphereGeometry(CU.r * 1.25, 10, 8), CU.x, CU.y, PZ);
  cm(new THREE.CylinderGeometry(CU.r, CU.r, RUN1 - CU.x, 10), (RUN1 + CU.x) / 2, CU.y, PZ, Math.PI / 2);
  for (const x of [1.6, 2.6, 4.3]) cm(new THREE.TorusGeometry(CU.r * 1.35, 0.018, 6, 12), x, CU.y, PZ, 0, 0);
  copper.children.forEach((c) => { if (c.geometry.type === 'TorusGeometry') c.rotation.y = Math.PI / 2; });
  mergeStatic(copper, { recolor: false });
  B.col((RUN1 + CU.x) / 2, PZ, (RUN1 - CU.x) / 2, 0.14, CU.y + 0.1, { noStand: true });
  // the brick pier the runs pass behind (the bypass is out of sight from the stairs)
  const pier = { x0: 3.0, x1: 3.55, z1: BZ + 2.3 };
  k.add(rbox(pier.x1 - pier.x0, H - 0.05, pier.z1 - (BZ + 0.75), 0.04), MAT.stone('sand', 1.7), (pier.x0 + pier.x1) / 2, H / 2, (pier.z1 + BZ + 0.75) / 2);
  B.col((pier.x0 + pier.x1) / 2, (pier.z1 + BZ) / 2, (pier.x1 - pier.x0) / 2, (pier.z1 - BZ) / 2, H);

  // ---- the bypass in the alcove: each old pipe drops to a cock; the copper pipe is bolted onto the lower one's leg
  const cock = (x, yTop, m, r) => {
    k.add(cyl(r, r, yTop - 1.0, 10), m, x, (yTop + 1.0) / 2, PZ);
    k.add(sphere(r * 1.25, 10, 8), m, x, yTop, PZ);
    k.add(rbox(0.3, 0.3, 0.3, 0.04), brass, x, 1.15, PZ);
    k.add(cyl(r, r, 0.75, 10), m, x, 0.62, PZ);
    const piv = new THREE.Group(); piv.position.set(x, 1.15, PZ + 0.19); B.group.add(piv);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.05), MAT.paint('#b8302a', 0.4)); bar.position.x = 0.19; piv.add(bar);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 10), iron); hub.rotation.x = Math.PI / 2; piv.add(hub);
    B.ccol(x, PZ, 0.2, 1.4, { noStand: true });
    // (shut: the handle across the pipe; open: along it, pointing down)
    return { ...wpt(x, PZ), front: wpt(x, PZ + 0.95), open: false, set(b) { this.open = !!b; piv.rotation.z = b ? -Math.PI / 2 : 0; } };
  };
  const cocks = { upper: cock(4.0, UP.y, old, UP.r), lower: cock(5.0, LO.y, old2, LO.r) };
  // the copper pipe's own way: up from its run into the lower leg under the cock (a bolted tee), and on to the pump
  k.add(cyl(CU.r, CU.r, 0.5, 10), cu, 5.0, 0.6, PZ + 0.16, 0, { rx: 0.5 });
  k.add(rbox(0.26, 0.2, 0.26, 0.03), brass, 5.0, 0.72, PZ + 0.06);
  // the booster pump on its bed: a casing, a ribbed motor, a flywheel; the maker's plate on the casing's west end, its
  // gauge and paper strip on the east end
  const PX = 4.35, PZ2 = 0.75;
  k.add(rbox(1.9, 0.22, 0.9, 0.03), MAT.stone('slate', 1.2), PX, 0.11, PZ2);
  k.add(cyl(0.34, 0.34, 0.8, 16), MAT.paint('#2f6f74', 0.5), PX - 0.35, 0.58, PZ2, 0, { rz: Math.PI / 2 });
  k.add(cyl(0.26, 0.26, 0.7, 14), iron, PX + 0.45, 0.52, PZ2, 0, { rz: Math.PI / 2 });
  for (let i = 0; i < 5; i++) k.add(torus(0.27, 0.02, 5, 14), iron, PX + 0.2 + i * 0.12, 0.52, PZ2, Math.PI / 2);
  // (the copper pipe on from the tee: along the east wall and into the pump's casing)
  k.add(cyl(CU.r, CU.r, PZ2 - PZ + 0.1, 10), cu, W / 2 - 0.14, CU.y, (PZ2 + PZ) / 2, 0, { rx: Math.PI / 2 });
  k.add(cyl(CU.r, CU.r, 0.5, 10), cu, W / 2 - 0.36, CU.y - 0.11, PZ2, 0, { rz: Math.PI / 2 + 0.45 });
  B.col(W / 2 - 0.14, (PZ2 + PZ) / 2 - 0.3, 0.12, (PZ2 - PZ) / 2 - 0.4, CU.y + 0.1, { noStand: true });
  k.add(plane(0.5, 0.16), MAT.map(plateTex()), PX - 0.35, 0.6, PZ2 + 0.345);
  const fly = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 20), MAT.paint('#b8302a', 0.4)); fly.position.set(PX + 0.86, 0.52, PZ2); fly.rotation.y = Math.PI / 2; B.group.add(fly);
  for (let s = 0; s < 3; s++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.04, 0.04), iron); sp.rotation.z = (s * Math.PI) / 3; fly.add(sp); }
  B.col(PX, PZ2, 1.0, 0.48, 0.95, { noStand: true });
  // the gauge on a stem over the casing, the recorder's box beside it with the strip hanging out
  k.add(cyl(0.02, 0.02, 0.5, 6), brass, PX + 0.1, 1.15, PZ2);
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20), MAT.map(dialTex())); face.position.set(PX + 0.1, 1.45, PZ2 + 0.03); B.group.add(face);
  k.add(torus(0.17, 0.02, 6, 20), brass, PX + 0.1, 1.45, PZ2 + 0.03);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.15, 0.01), MAT.flat('#1a1a1a', 0.5)); needle.geometry.translate(0, 0.065, 0); needle.position.set(PX + 0.1, 1.45, PZ2 + 0.045); B.group.add(needle);
  k.add(rbox(0.22, 0.16, 0.14, 0.02), MAT.wood('dark'), PX + 0.42, 1.0, PZ2 + 0.1);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.42), MAT.map(stripTex())); strip.position.set(PX + 0.42, 0.78, PZ2 + 0.18); strip.rotation.x = -0.12; B.group.add(strip);
  B.light('#ffe8c0', 4.5, 11, -2.6, 2.9, -0.4);
  B.light('#ffd8a0', 3.2, 7, 4.4, 2.8, -1.6);

  let kickT = null; const shakes = { copper: 0, lower: 0, upper: 0 };
  R.pump = {
    diagram: { ...wpt(-3.6, BZ + 0.06), front: wpt(-3.6, BZ + 1.1) },
    feel: { upper: { ...wpt(UP.x, PZ), front: wpt(UP.x, PZ + 0.85) }, lower: { ...wpt(LO.x, PZ), front: wpt(LO.x, PZ + 0.85) }, copper: { ...wpt(CU.x, PZ), front: wpt(CU.x, PZ + 0.85) } },
    pier: wpt(2.6, BZ + 1.3), alcoveX: B.cx + 3.45, cocks,
    plate: { ...wpt(PX - 0.35, PZ2 + 0.35), front: wpt(PX - 0.35, PZ2 + 1.05) },
    gauge: { ...wpt(PX + 0.3, PZ2 + 0.2), front: wpt(PX + 0.3, PZ2 + 1.05), y: 1.45 },
    copperAt: (x) => ({ x: Math.max(B.cx + CU.x, Math.min(B.cx + RUN1, x)), y: CU.y, z: B.cz + PZ }),
    lowerAt: wpt(LO.x + 1.2, PZ), upperAt: wpt(UP.x + 2.5, PZ),
    setState({ bypass = false, wrong = false, strip = true } = {}) { cocks.lower.set(bypass); cocks.upper.set(wrong); R.pump.bypass = bypass; strip_(strip); },
    shake(which, t = 0.6) { shakes[which] = Math.max(shakes[which], t); },
    kick() { kickT = 0; },
    bypass: false, beat: 0,
  };
  const strip_ = (b) => { strip.visible = !!b; };
  // the copper pipe shivers three beats and rests while it takes the lane's water; shut off, only the gauge kicks
  R.updaters.push((dt) => {
    const G = globalThis.game; if (!G || G.room !== R) return;
    const U = R.pump, tt = G.time, ph = tt % 2.4, beat = ph < 0.75 ? Math.floor(ph / 0.25) : -1, on = beat >= 0 && ph % 0.25 < 0.12;
    if (beat !== U.beat) { U.beat = beat; if (beat >= 0) { if (!U.bypass) { shakes.copper = 0.16; G.audio.play('rattle', U.copperAt(G.hero.pos.x)); } else { kickT = 0; G.audio.play('tick', U.gauge); } } }
    const sc = shakes.copper; if (sc > 0) shakes.copper = Math.max(0, sc - dt);
    copper.position.y = sc > 0 ? Math.sin(tt * 90) * 0.012 : 0; copper.position.z = sc > 0 ? Math.cos(tt * 77) * 0.008 : 0;
    const sl = shakes.lower; if (sl > 0) shakes.lower = Math.max(0, sl - dt); lowerRun.position.y = LO.y + (sl > 0 ? Math.sin(tt * 80) * 0.01 : 0);
    if (kickT != null) { kickT += dt; needle.rotation.z = (U.bypass ? 0.9 : -0.9) * Math.exp(-kickT * 9) * Math.cos(kickT * 30) + (U.bypass ? 0.35 : -0.5); if (kickT > 0.5) kickT = null; }
    else needle.rotation.z = U.bypass ? 0.35 : -0.5 + (on ? -0.25 : 0);
    fly.rotation.x += dt * (U.bypass ? 0.4 : 5.5);
  });
  R.pump.setState({});
  return B.finish();
}
