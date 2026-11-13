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
//            R.keys {x,z, setTaken(b)}: the archivist's key ring on his desk (the BORE cabinet's key; CHAPTER-BALANCE)
//            CAMPAIGN-7: R.gallery {x,z,a,y} (the back gallery, where Mill Lane's service landing brings him; exit
//            'archive-gallery' at its door, up there only), R.drawer (the BORE cabinet's top drawer: a touch point,
//            setOpen(b))
//   upper    CAMPAIGN-7: R.order {x,z, show(b)}: Vesk's standing order beside the archive's door (the deliveries' plate under it)
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import * as P from './props.js';
import { MAT, rbox, plane, cyl, torus, canvasTex } from './props.js';
import { touch } from './story/reach.js';

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
  // CAMPAIGN-7 (wave 5): beside the archive's door, the deliveries' brass plate (always there) and Vesk's standing order
  // (pinned up in chapter 9 only: story/cnline.js shows it)
  k.add(plane(0.5, 0.2), MAT.map(canvasTex(256, 100, (x, Wd, Hd) => { x.fillStyle = '#b8903a'; x.fillRect(0, 0, Wd, Hd); x.strokeStyle = '#5a4010'; x.lineWidth = 5; x.strokeRect(4, 4, Wd - 8, Hd - 8); x.fillStyle = '#3a2808'; x.textAlign = 'center'; x.font = 'bold 19px sans-serif'; x.fillText('DELIVERIES:', Wd / 2, 32); x.font = 'bold 15px sans-serif'; x.fillText('MILL LANE SERVICE LANDING', Wd / 2, 58); x.font = 'bold 19px sans-serif'; x.fillText('RING FOR KELL', Wd / 2, 84); }), 0.45, { metalness: 0.4 }), 4.95, 1.25, BZ + 0.045);
  // (GPU-V85: the sheet half as large again, with a red border, and pinned higher: at its read spot his head covered the
  //  0.42 m sheet from the room's camera; now it shows over him)
  const order = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.83), MAT.map(canvasTex(168, 224, (x, Wd, Hd) => {
    x.fillStyle = '#f4efe0'; x.fillRect(0, 0, Wd, Hd); x.strokeStyle = '#b02a2a'; x.lineWidth = 8; x.strokeRect(4, 4, Wd - 8, Hd - 8); x.fillStyle = '#1e2a3a'; x.textAlign = 'center'; x.font = 'bold 15px sans-serif'; x.fillText('STANDING ORDER', Wd / 2, 26);
    x.font = '12px serif'; ['Twinsen of Citadel', 'is not to be admitted', "to the project's records.", '', 'A stop before the Mill Lane', "bypass cuts that quarter's", 'water.'].forEach((l, i) => x.fillText(l, Wd / 2, 56 + i * 17));
    x.font = 'italic bold 26px serif'; x.fillText('V.', Wd - 34, Hd - 24); x.fillStyle = '#b02a2a'; x.beginPath(); x.arc(Wd / 2, 8, 4, 0, 7); x.fill();
  }), 0.9));
  order.position.set(4.95, 2.02, BZ + 0.035); order.visible = false; B.group.add(order);
  R.order = { x: B.cx + 4.95, z: B.cz + BZ + 0.9, show(b) { order.visible = !!b; }, get shown() { return order.visible; } };
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
  // (WORLD-ART-7: a records room, not a machine room — honey boards, parchment plaster over dark panelling, sandstone;
  //  the plaster #e6d0a4, warmer than the request's #f0e4c8, which read pale grey under the room's cool lights)
  // (CAMPAIGN-7: the service door at the back gallery's level, GY, in the back wall: Mill Lane's service landing comes up to it)
  const GY = 2.4, GX0 = -W / 2, GX1 = -4.4, GZ0 = -D / 2, GZ1 = -D / 2 + 1.1, SDX = -5.6;
  B.shell({ floor: MAT.planks('honey'), slab: MAT.stone('sand'), body: MAT.plaster('#e6d0a4'), low: MAT.wainscot('dark'), rail: MAT.brass(), cap: MAT.stone('sand'), W, D, H, t: 0.45, dado: 1.0, rimH: 0.5, left: [{ at: 4.0, w: 1.8, h: 2.8, y0: 0, kind: 'door' }], back: [{ at: SDX, w: 1.0, h: 2.05, y0: GY, kind: 'door' }] });
  R.exits.push({ x: B.cx - W / 2 + 0.5, z: B.cz + 4.0, r: 0.8, to: 'archive-out' });
  R.spawn = { x: B.cx - W / 2 + 2, z: B.cz + 4.0, a: Math.PI / 2 };
  // CAMPAIGN-7 (wave 5): the back gallery. A walkway on a solid records stack along the back wall's west end (no way under
  // it), its service door to Mill Lane's landing, and a stair down the left wall to the floor. The archivist's round passes
  // in front of it; from up there his whole loop is in sight
  {
    const wood = MAT.wainscot('dark'), plank = MAT.planks('honey'), br = MAT.brass(), stone = MAT.stone('sand');
    const gw = GX1 - GX0, gd = GZ1 - GZ0, gcx = (GX0 + GX1) / 2, gcz = (GZ0 + GZ1) / 2;
    k.add(rbox(gw, GY - 0.1, gd, 0.02), wood, gcx, (GY - 0.1) / 2, gcz);
    k.add(rbox(gw + 0.06, 0.1, gd + 0.08, 0.02), plank, gcx, GY - 0.05, gcz + 0.02);
    for (let i = 0; i < 4; i++) k.add(rbox(gw - 0.2, 0.04, 0.03, 0.01), br, gcx, 0.45 + i * 0.5, GZ1 + 0.005);   // (the stack's shelf lips)
    B.col(gcx, gcz, gw / 2, gd / 2, GY);
    // the stair down the left wall: seven steps of 0.3 m from the gallery's west end toward the room's front
    const SX0 = GX0, SX1 = GX0 + 1.0, TR = 0.45;
    for (let i = 0; i < 7; i++) {
      const z0 = GZ1 + i * TR, top = GY - (i + 1) * 0.3;
      k.add(rbox(SX1 - SX0, top, TR, 0.01), stone, (SX0 + SX1) / 2, top / 2, z0 + TR / 2);
      k.add(rbox(SX1 - SX0 + 0.02, 0.04, TR + 0.02, 0.01), plank, (SX0 + SX1) / 2, top - 0.02, z0 + TR / 2);
      B.col((SX0 + SX1) / 2, (GZ1 - 0.15 + z0 + TR) / 2, (SX1 - SX0) / 2, (z0 + TR - GZ1 + 0.15) / 2, top, { stair: true });
    }
    // rails: along the gallery's front (open at the stair's head) and its east end, down the stair's open side
    const rail = (x0, z0, x1, z1, y0, y1) => {
      const l = Math.hypot(x1 - x0, z1 - z0, y1 - y0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, my = (y0 + y1) / 2;
      k.add(cyl(0.025, 0.025, l, 6), br, mx, my + 0.95, mz, 0, { rz: z0 === z1 ? Math.PI / 2 : 0, rx: x0 === x1 ? Math.atan2(z1 - z0, y1 - y0) : 0 });
      const n = Math.max(2, Math.round(l / 0.9));
      for (let i = 0; i <= n; i++) { const t = i / n; k.add(cyl(0.02, 0.02, 0.95, 6), br, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + 0.475, z0 + (z1 - z0) * t); }
    };
    rail(SX1, GZ1, GX1, GZ1, GY, GY); rail(GX1, GZ0, GX1, GZ1, GY, GY); rail(SX1, GZ1, SX1, GZ1 + 7 * TR, GY, 0.3);
    B.col((SX1 + GX1) / 2, GZ1 + 0.02, (GX1 - SX1) / 2, 0.05, GY + 1.0, { noStand: true, seeThrough: true, bottom: GY - 0.2 });
    B.col(GX1 + 0.02, gcz, 0.05, gd / 2, GY + 1.0, { noStand: true, seeThrough: true, bottom: GY - 0.2 });
    B.col(SX1 + 0.03, GZ1 + 3.5 * TR, 0.05, 3.5 * TR, GY + 1.0, { noStand: true, seeThrough: true, bottom: 0 });
    k.add(plane(0.7, 0.22), label('SERVICE'), SDX, GY + 2.25, GZ0 + 0.03);
  }
  R.gallery = { x: B.cx + SDX, z: B.cz + GZ0 + 0.8, a: -Math.PI / 2, y: GY };   // (where Mill Lane's service landing brings him: in front of the door, facing the stair)
  R.exits.push({ x: B.cx + SDX, z: B.cz + GZ0 + 0.05, r: 0.36, y: GY, to: 'archive-gallery' });
  // shelf rows (cover), each a long bookcase with ledgers
  for (const [x, z] of [[-3, -1.5], [1, -1.5], [-3, 2.0], [1, 2.0]]) { B.put(x, z + 0.42, 0, (kk) => P.bookcase(kk, { w: 2.8, seed: 3 + x })); B.put(x, z, Math.PI, (kk) => P.bookcase(kk, { w: 2.8, seed: 7 + z }), { noCol: true }); }
  // crates of files waiting to be shelved, and the archivist's desk (more cover in the front half)
  // (PLACE-1: the third crate beside the second, not 28 cm into it)
  for (const [x, z, r] of [[-1.2, 4.6, 0.2], [3.8, 3.6, -0.3], [5.0, 3.9, 0.1]]) B.put(x, z, r, (kk) => P.cargoCrate(kk, { w: 1.0, h: 1.2, d: 1.0, color: '#5a6a62' }));
  B.put(5.4, 1.6, -Math.PI / 2, (kk) => P.desk(kk));
  // the archivist's key ring on the desk's near end (CHAPTER-BALANCE: the BORE cabinet is locked; story/council.js)
  const ring = new THREE.Group(); ring.position.set(5.2, 0.8, 1.1); B.group.add(ring);
  { const m = MAT.brass(); const r0 = new THREE.Mesh(torus(0.07, 0.012, 6, 16), m); r0.rotation.x = Math.PI / 2; ring.add(r0);
    for (const [a, l] of [[0.4, 0.11], [1.3, 0.09], [2.4, 0.12]]) { const kk = new THREE.Mesh(rbox(0.018, 0.012, l, 0.004), m); kk.position.set(Math.sin(a) * (0.07 + l / 2), 0, Math.cos(a) * (0.07 + l / 2)); kk.rotation.y = a; ring.add(kk); } }
  R.keys = { x: B.cx + 5.2, z: B.cz + 1.1, taken: false, setTaken(b) { this.taken = !!b; ring.visible = !b; } };
  // three plan cabinets on the back wall, labelled
  const cabinets = [];
  ['TUNNELS', 'BORE', 'FERRIES'].forEach((lab, i) => {
    const x = 3.4 + i * 1.5, z = -D / 2 + 0.6;
    B.put(x, z, 0, (kk) => P.filingCabinet(kk));
    k.add(plane(0.9, 0.34), label(lab), x, 1.55, z + 0.33);
    cabinets.push({ i, x: B.cx + x, z: B.cz + z + 0.9, label: lab });
  });
  R.cabinets = cabinets;
  // CAMPAIGN-7: the BORE cabinet's top drawer, pulled out (hidden until he opens it): the log of test 14 on the plans, the
  // order clipped to it. The papers at 1.2 m, his hand's height working at a thing (story/reach.js tinker)
  {
    const x = 3.4 + 1.5, z = -D / 2 + 0.6, fz = z + 0.31, dw = MAT.paint('#6f7f6a', 0.6);
    const drawer = new THREE.Group(); drawer.position.set(x, 0, fz); drawer.visible = false; B.group.add(drawer);
    const dk = new P.Kit(drawer);
    dk.add(rbox(0.4, 0.22, 0.34, 0.006), dw, 0, 1.1, 0.17);
    dk.add(rbox(0.38, 0.012, 0.3, 0.003), MAT.flat('#f2ead6', 0.9), 0, 1.215, 0.16);
    dk.add(plane(0.2, 0.26), MAT.map(canvasTex(80, 104, (c, Wd, Hd) => { c.fillStyle = '#e8e4dc'; c.fillRect(0, 0, Wd, Hd); c.strokeStyle = '#2a2a2a'; c.lineWidth = 1.5; for (const [y0, kk] of [[34, 0], [74, 1]]) { c.beginPath(); for (let i = 0; i < Wd; i++) { const ph = (i % 40) / 40, kick = kk && ph > 0.55 && ph < 0.8 ? Math.sin(ph * 80) * 9 : 0; c.lineTo(i, y0 + kick + (kk ? 0 : Math.sin(i * 0.4) * 2)); } c.stroke(); } c.fillStyle = '#2a2a2a'; c.font = 'bold 9px sans-serif'; c.fillText('TEST 14', 4, 12); })), -0.06, 1.223, 0.15, 0, { rx: -Math.PI / 2 });
    dk.add(plane(0.12, 0.1), MAT.map(canvasTex(64, 54, (c, Wd, Hd) => { c.fillStyle = '#fbf6e4'; c.fillRect(0, 0, Wd, Hd); c.fillStyle = '#1e2a3a'; for (let i = 0; i < 5; i++) c.fillRect(5, 9 + i * 8, 40 + (i % 2) * 12, 2); c.font = 'italic bold 13px serif'; c.fillText('V.', 42, 52); })), 0.11, 1.226, 0.1, 0.2, { rx: -Math.PI / 2 });
    dk.flush();
    const t = { x: B.cx + x - 0.02, z: B.cz + fz + 0.2 };
    R.drawer = { ...touch(t.x, t.z, Math.PI, 'tinker'), open: false, setOpen(b) { this.open = !!b; drawer.visible = !!b; } };
  }
  // the technicians' locker by the door
  // (PLACE-1: its back against the wall, not 0.7 m out from it)
  B.put(-W / 2 + 0.3, 1.6, Math.PI / 2, (kk) => P.locker(kk));
  R.locker = { x: B.cx - W / 2 + 1.1, z: B.cz + 1.6 };
  R.patrol = [[-5.5, -4], [5.5, -4], [5.5, 0.2], [-5.5, 0.2]].map(([x, z]) => [B.cx + x, B.cz + z]);
  R.npcSpots = {};
  B.light('#d8f4ff', 5, 12, -2, 4, 0); B.light('#d8f4ff', 5, 12, 4, 4, -2);
  return B.finish();
}

export function buildUpper3(scene, physics) {
  return { upper: buildUpper(scene, physics), council: buildCouncil(scene, physics), archive: buildArchive(scene, physics) };
}
void cyl; void THREE;
