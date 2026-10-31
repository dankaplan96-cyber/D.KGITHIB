// Zeelich's upper district (chapter 9): three interior rooms reached by the cloud lift from the Esmer street,
// built with the interiors' RoomBuilder at x = 4800…4900.
//
//   upper    the antechamber of the council: a clerk's counter, benches, two inner doors (council, archive)
//   council  the council chamber: a dais with three seats, a crescent of benches, a window onto the clouds
//   archive  the Joint Project's archive: rows of shelves (cover), three plan cabinets, a locker with a
//            technician's coat; a clerk-guard walks a loop between the shelves
//
// CONTRACT for src/game/story/council.js (world x/z):
//   upper    R.counter {x,z}; exits 'up-down' (the lift, back to the street), 'up-council', 'up-archive'
//   council  R.dais {x,z}; R.npcSpots {chair, c2, c3, dallan, baldino}; exit 'council-out'
//   archive  R.cabinets [{i,x,z,label}]; R.locker {x,z}; R.patrol [[x,z]...]; exit 'archive-out'
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import * as P from './props.js';
import { MAT, rbox, plane, cyl, torus, canvasTex } from './props.js';

const esmer = () => ({
  floor: MAT.tiles('#e8dcc8', '#2f8a9a', '#a89880', false, 4), slab: MAT.stone('lav'), body: MAT.plaster('#f0e4f0'), low: MAT.tiles('#2f8a9a', '#e8b84a', '#5a4a5a', true, 6),
  rail: MAT.brass(), cap: MAT.stone('lav'), dado: 1.1, rimH: 0.5, t: 0.45,
});
const cloudView = () => MAT.map(canvasTex(512, 256, (x, W, H) => {
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f6c8e0'); g.addColorStop(0.6, '#fbe4ee'); g.addColorStop(1, '#f2d0e4'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(255,255,255,0.6)'; x.beginPath(); x.ellipse(Math.random() * W, H * 0.6 + Math.random() * H * 0.4, 40 + Math.random() * 60, 12 + Math.random() * 14, 0, 0, 7); x.fill(); }
}), 0.9, { emissive: '#ffffff', emissiveIntensity: 0.25 });
const label = (text) => MAT.map(canvasTex(128, 48, (x, W, H) => { x.fillStyle = '#e8dcc0'; x.fillRect(0, 0, W, H); x.fillStyle = '#2a2a2a'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.fillText(text, W / 2, H / 2 + 8); }));

function buildUpper(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'upper', 4800, 0);
  const R = B.room, k = B.k;
  const W = 14, D = 10, H = 5.0;
  R.view = 14.5; R.follow = 0.3; R.music = 'zeelich';
  B.shell({ ...esmer(), W, D, H, back: [{ at: -3.5, w: 1.8, h: 2.8, y0: 0, kind: 'door' }, { at: 3.5, w: 1.8, h: 2.8, y0: 0, kind: 'door' }], left: [{ at: 0, w: 1.8, h: 2.8, y0: 0, kind: 'door' }] });
  const BZ = -D / 2;
  R.exits.push({ x: B.cx - 3.5, z: B.cz + BZ + 0.5, r: 0.75, to: 'up-council' }, { x: B.cx + 3.5, z: B.cz + BZ + 0.5, r: 0.75, to: 'up-archive' }, { x: B.cx - W / 2 + 0.5, z: B.cz, r: 0.8, to: 'up-down' });
  R.spawn = { x: B.cx - W / 2 + 2, z: B.cz, a: Math.PI / 2 };
  k.add(plane(1.4, 0.5), label('COUNCIL'), -3.5, 3.2, BZ + 0.03);
  k.add(plane(1.4, 0.5), label('ARCHIVE'), 3.5, 3.2, BZ + 0.03);
  // the clerk's counter, a bell, ledgers; benches for the waiting; a noticeboard of forms
  B.put(1.0, 1.4, 0, (kk) => P.counter(kk, { w: 3.2 }));
  k.add(plane(2.4, 1.4), MAT.map(canvasTex(256, 150, (x, Wd, Hd) => { x.fillStyle = '#c8a878'; x.fillRect(0, 0, Wd, Hd); for (let i = 0; i < 14; i++) { x.fillStyle = ['#f4ecd8', '#e8d8f0', '#d8f0e8'][i % 3]; x.fillRect(10 + (i % 5) * 48, 10 + Math.floor(i / 5) * 46, 40, 40); x.fillStyle = '#5a5a5a'; for (let l = 0; l < 4; l++) x.fillRect(16 + (i % 5) * 48, 18 + Math.floor(i / 5) * 46 + l * 7, 26, 2); } })), -W / 2 + 0.03, 2.2, -2.5, Math.PI / 2);
  for (const z of [2.6, 3.8]) B.put(-3.5, z, 0, (kk) => P.bench(kk, { w: 2.2 }));
  B.put(5.5, 3.4, -Math.PI / 2, (kk) => P.pottedPlant(kk));
  R.counter = { x: B.cx + 1.0, z: B.cz + 2.4 };
  R.npcSpots = { clerk: { x: B.cx + 1.0, z: B.cz + 0.6, a: 0 } };
  B.light('#fff0e0', 6, 12, 0, 4, 0);
  return B.finish();
}

function buildCouncil(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'council', 4850, 0);
  const R = B.room, k = B.k;
  const W = 16, D = 14, H = 6.5;
  R.view = 17; R.follow = 0.25; R.music = 'zeelich';
  B.shell({ ...esmer(), W, D, H, left: [{ at: 4.5, w: 1.8, h: 2.8, y0: 0, kind: 'door' }], back: [{ at: 0, w: 7, h: 3.6, y0: 1.2, kind: 'window', glass: cloudView() }] });
  R.exits.push({ x: B.cx - W / 2 + 0.5, z: B.cz + 4.5, r: 0.8, to: 'council-out' });
  R.spawn = { x: B.cx - W / 2 + 2, z: B.cz + 4.5, a: Math.PI / 2 };
  // the dais: a raised stone platform with three high-backed seats
  const dz = -D / 2 + 2.2;
  k.add(rbox(9, 0.5, 3.2, 0.08), MAT.stone('lav'), 0, 0.25, dz);
  B.col(0, dz, 4.5, 1.6, 0.5);
  for (const x of [-2.6, 0, 2.6]) {
    k.add(rbox(1.2, 0.5, 1.0, 0.05), MAT.wood('dark'), x, 0.75, dz - 0.4);
    k.add(rbox(1.2, 2.2 + (x === 0 ? 0.6 : 0), 0.15, 0.05), MAT.wood('dark'), x, 1.6 + (x === 0 ? 0.3 : 0), dz - 0.95);
    k.add(rbox(1.0, 0.3, 0.1, 0.03), MAT.brass(), x, 2.7 + (x === 0 ? 0.6 : 0), dz - 0.88);
  }
  // rows of benches either side of a carpet that runs from the door to the petitioner's lectern
  for (const z of [1.0, 2.6, 4.2]) for (const x of [-4.2, 4.2]) B.put(x, z, 0, (kk) => P.bench(kk, { w: 3.2, pal: 'dark' }));
  k.at(0, 0, 1.4, 0, () => P.rug(k, 2.2, 8.4, ['#7a3a8a', '#e8c060', '#2f8a9a', '#f4e8d8', '#3a1a4a'], 3));
  k.add(rbox(0.7, 1.1, 0.5, 0.04), MAT.wood('dark'), 0, 0.55, dz + 3.0);
  k.add(rbox(0.8, 0.06, 0.6, 0.02), MAT.brass(), 0, 1.13, dz + 3.0, 0, { rx: 0.25 });
  B.col(0, dz + 3.0, 0.35, 0.25, 1.1);
  // banners
  for (const x of [-6.5, 6.5]) k.add(plane(1.2, 3.2), MAT.cloth('#7a3a8a', '#e8c060'), x, 3.4, -D / 2 + 0.05);
  // the seats' cushions and the dais's brass edge
  for (const x of [-2.6, 0, 2.6]) k.add(rbox(1.0, 0.12, 0.8, 0.05), MAT.cloth('#7a3a8a', '#5a2a6a'), x, 1.06, dz - 0.35);
  k.add(rbox(9.04, 0.07, 0.07, 0.02), MAT.brass(), 0, 0.5, dz + 1.6);
  // the Esmer emblem above the window: the planet in its shell, two suns
  const ey = 5.65, ez = -D / 2 + 0.06, br = MAT.brass();
  k.add(P.disc(0.62, 28), MAT.flat('#d8c8ec', 0.6), 0, ey, ez);
  k.add(torus(0.66, 0.06, 6, 32), br, 0, ey, ez + 0.03);
  k.add(torus(0.36, 0.035, 6, 24), br, 0, ey, ez + 0.03);
  k.add(P.disc(0.2, 18), MAT.flat('#2f8a9a', 0.5), 0, ey, ez + 0.02);
  for (const sx of [-1, 1]) { k.add(P.disc(0.16, 16), MAT.glow('#ffe8a0', '#e8b84a', 0.6), sx * 1.05, ey + 0.25, ez + 0.02); k.add(torus(0.17, 0.025, 5, 18), br, sx * 1.05, ey + 0.25, ez + 0.04); }
  // round Esmer columns along the side wall and flanking the window (brass rings, a lilac capital); none on
  // the near (+x) side, where they would stand between the camera and the hearing
  for (const [x, z] of [[-W / 2 + 0.75, -4.6], [-W / 2 + 0.75, -0.6], [-W / 2 + 0.75, 2.8], [-4.95, -D / 2 + 0.5], [4.95, -D / 2 + 0.5]]) {
    k.add(cyl(0.34, 0.4, 0.3, 20), MAT.stone('lav'), x, 0.15, z);
    k.add(cyl(0.28, 0.28, 4.9, 20), MAT.plaster('#efe0ee'), x, 2.75, z);
    for (const y of [0.42, 1.25, 4.6]) k.add(torus(0.29, 0.03, 5, 20), br, x, y, z, 0, { rx: Math.PI / 2 });
    k.add(cyl(0.48, 0.3, 0.45, 20), MAT.stone('lav'), x, 5.42, z);
    B.ccol(x, z, 0.36, 5.6);
  }
  // wall sconces between the columns, two lamps flanking the dais, plants under the banners
  for (const z of [-2.6, 1.1]) B.put(-W / 2 + 0.24, z, Math.PI / 2, (kk) => P.wallSconce(kk), { y: 2.6, noCol: true });
  for (const sx of [-1, 1]) {
    B.put(sx * 5.3, dz + 0.6, 0, (kk) => P.floorLamp(kk, { shade: '#e8c8f0' }));
    B.light('#ffd8a8', 4.5, 7, sx * 5.3, 1.6, dz + 0.9);
    B.put(sx * 6.5, -D / 2 + 0.6, 0, (kk) => P.pottedPlant(kk, { s: 1.5, potColor: '#2f8a9a' }));
  }
  // the clerk of the hearing's table by the door: ledger and papers
  B.put(-5.6, 6.0, 0, (kk) => P.desk(kk, { w: 1.6, leather: '#5a2a6a' }));
  P.ledger(k, -5.9, 0.79, 6.0, 0.2); P.papers(k, -5.2, 0.79, 6.05, 3, 4);
  // daylight from the cloud window: a soft shaft falling across the dais
  const shaft = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 5.4), new THREE.MeshBasicMaterial({
    map: canvasTex(16, 128, (x, Wd, Hd) => { const g = x.createLinearGradient(0, 0, 0, Hd); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, Wd, Hd); }),
    color: '#ffd8ec', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  shaft.position.set(B.cx, 2.5, B.cz - D / 2 + 2.2);
  shaft.rotation.x = -0.72;
  shaft.renderOrder = 2;
  B.group.add(shaft);
  B.light('#ffd4ec', 7, 11, 0, 3.6, -D / 2 + 1.4);
  R.dais = { x: B.cx, z: B.cz + dz + 3.8 };
  R.npcSpots = {
    chair: { x: B.cx, z: B.cz + dz - 0.2, a: 0 }, c2: { x: B.cx - 2.6, z: B.cz + dz - 0.2, a: 0 }, c3: { x: B.cx + 2.6, z: B.cz + dz - 0.2, a: 0 },
    dallan: { x: B.cx - 1.6, z: B.cz + dz + 4.6, a: Math.PI * 0.85 }, baldino: { x: B.cx + 1.8, z: B.cz + dz + 4.4, a: -Math.PI * 0.85 },
  };
  B.light('#fff0e4', 4.5, 16, 0, 5.5, 2.0);
  return B.finish();
}

function buildArchive(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'archive', 4900, 0);
  const R = B.room, k = B.k;
  const W = 16, D = 12, H = 5.0;
  R.view = 16.5; R.follow = 0.3; R.music = 'stealth';
  B.shell({ floor: MAT.plates('#5a6a6a', 1), slab: MAT.stone('slate'), body: MAT.plates('#3f8a86', 2), low: MAT.plates('#2a5a5a', 1), rail: MAT.brass(), cap: MAT.stone('slate'), W, D, H, t: 0.45, dado: 1.0, rimH: 0.5, left: [{ at: 4.0, w: 1.8, h: 2.8, y0: 0, kind: 'door' }] });
  R.exits.push({ x: B.cx - W / 2 + 0.5, z: B.cz + 4.0, r: 0.8, to: 'archive-out' });
  R.spawn = { x: B.cx - W / 2 + 2, z: B.cz + 4.0, a: Math.PI / 2 };
  // shelf rows (cover), each a long bookcase with ledgers
  for (const [x, z] of [[-3, -1.5], [1, -1.5], [-3, 2.0], [1, 2.0]]) { B.put(x, z + 0.42, 0, (kk) => P.bookcase(kk, { w: 2.8, seed: 3 + x })); B.put(x, z, Math.PI, (kk) => P.bookcase(kk, { w: 2.8, seed: 7 + z }), { noCol: true }); }
  // crates of files waiting to be shelved, and the archivist's desk (more cover in the front half)
  for (const [x, z, r] of [[-1.2, 4.6, 0.2], [3.8, 3.6, -0.3], [4.6, 3.9, 0.1]]) B.put(x, z, r, (kk) => P.cargoCrate(kk, { w: 1.0, h: 1.2, d: 1.0, color: '#5a6a62' }));
  B.put(5.4, 1.6, -Math.PI / 2, (kk) => P.desk(kk));
  // three plan cabinets on the back wall, labelled
  const cabinets = [];
  ['TUNNELS', 'BORE', 'FERRIES'].forEach((lab, i) => {
    const x = 3.4 + i * 1.5, z = -D / 2 + 0.6;
    B.put(x, z, 0, (kk) => P.filingCabinet(kk));
    k.add(plane(0.9, 0.34), label(lab), x, 1.55, z + 0.33);
    cabinets.push({ i, x: B.cx + x, z: B.cz + z + 0.9, label: lab });
  });
  R.cabinets = cabinets;
  // the technicians' locker by the door
  B.put(-W / 2 + 1.0, 1.6, Math.PI / 2, (kk) => P.locker(kk));
  R.locker = { x: B.cx - W / 2 + 1.8, z: B.cz + 1.6 };
  R.patrol = [[-5.5, -4], [5.5, -4], [5.5, 0.2], [-5.5, 0.2]].map(([x, z]) => [B.cx + x, B.cz + z]);
  R.npcSpots = {};
  B.light('#d8f4ff', 5, 12, -2, 4, 0); B.light('#d8f4ff', 5, 12, 4, 4, -2);
  return B.finish();
}

export function buildUpper3(scene, physics) {
  return { upper: buildUpper(scene, physics), council: buildCouncil(scene, physics), archive: buildArchive(scene, physics) };
}
void cyl; void THREE;
