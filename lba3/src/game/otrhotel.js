// ZEELICH-1 item 3 (the cloud's order; OP-7 reads the register here): the Imperial Hotel's lobby at Otringal, after
// LBA2's scene 81, about 80 % alike. Our own geometry, from a study of the original's layout (numbers and descriptions
// only; nothing copied). Its door: the pink-domed house on the plaza's north-west side (zislands.js: the house at local
// (−15.4, −10.2), its door facing the plaza). As the game's camera sees it:
//   - dark teal walls with gilded scrolls under a patterned frieze, a warm terracotta floor
//   - a raised floor 0.9 m up along the back and the left: the members' desk (two curved counters with stools and a
//     bowl, the register on it), round tables with stools, shelves of tall vases on the back wall, tiered globe lamps
//     on pedestals, bushy plants in brass urns; a row of brass posts with a rope along its edge
//   - the sunken lounge in the middle: four cream armchairs between globe lamps on stone blocks, a stair down at each end
//   - the pool at the front right behind a low kerb, two striped deck chairs beside it
//   - two tall doorways between twisted columns in the back wall (to the hotel), the two coin machines (life, magic)
//     between them; the door from the plaza in the left wall
// Twelve years on (ours): the coin machines are new; the rest the Sups kept as it was.
//
// CONTRACT (world coordinates)
//   OTRHOTEL_AT                          where the room stands (regions.js)
//   buildOtrHotelRoom(scene, physics) → { otrhotel }
//   otrHotelDoors() / otrHotelExit(to)   the plaza house's door leads in (region isle_otringal); 'otrhotel-out'
//   HOTEL (filled when the lobby is built): desk {x,z,r}, register {x,z,r} (a read spot on the desk),
//     machines [{x,z,a,kind}] (life, magic), npcSpots {clerk, explorer, manicurist} {x,z,a}
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { MAT, M, TEX, rbox, plane, cyl, sphere, lathe, canvasTex, jar, railing } from './props.js';
import { FIT } from './worldfit.js';

export const OTRHOTEL_AT = { x: 9400, z: 0 };
export const HOTEL = {};

const TEAL = () => MAT.flat('#1f4a52', 0.6, { emissive: '#08161a' }), GOLD = () => MAT.brass(), CREAM = () => MAT.cloth('#ecd6b8', '#d4bc9c');
const wallTex = () => canvasTex(512, 256, (x, W, H) => {
  x.fillStyle = '#2a5a62'; x.fillRect(0, 0, W, H);
  let s = 5; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '160,220,220'},${r() * 0.08})`; x.fillRect(r() * W, r() * H, 6, 6); }
  x.strokeStyle = '#c89a4a'; x.lineWidth = 6;
  for (let i = 0; i < 4; i++) { const cx = 64 + i * 128; x.beginPath(); x.arc(cx, 60, 22, Math.PI * 0.2, Math.PI * 1.6); x.stroke(); x.beginPath(); x.arc(cx + 28, 60, 14, Math.PI * 1.2, Math.PI * 2.6); x.stroke(); }
  x.fillStyle = '#16323a'; x.fillRect(0, 0, W, 20); x.fillStyle = '#c89a4a'; for (let i = 0; i < 32; i++) x.fillRect(i * 16 + 4, 6, 8, 8);
});
// a tiered globe lamp (LBA2's): three white bowls on a stem
function tierLamp(k, h = 1.3) {
  k.add(cyl(0.05, 0.07, h, 8), GOLD(), 0, h / 2, 0);
  for (let i = 0; i < 3; i++) k.add(lathe([[0.001, 0], [0.32 - i * 0.07, 0.04], [0.3 - i * 0.07, 0.16], [0.001, 0.18]], 14), MAT.glow('#fbf6ee', '#ffe8c0', 0.8), 0, h + i * 0.16, 0);
  return { r: 0.3, top: h + 0.5 };
}
function bushUrn(k) {
  k.add(lathe([[0.001, 0], [0.18, 0], [0.26, 0.2], [0.2, 0.42], [0.24, 0.5], [0.001, 0.5]], 12), GOLD(), 0, 0, 0);
  for (let i = 0; i < 7; i++) k.add(sphere(0.32, 8, 6), MAT.paint('#d8d4b8', 0.8), Math.sin(i * 2.3) * 0.2, 0.8 + (i % 3) * 0.3, Math.cos(i * 2.3) * 0.2);
  return { r: 0.3, top: 1.8 };
}
function armchair(k) {
  k.add(rbox(0.8, 0.42, 0.78, 0.18), CREAM(), 0, 0.25, 0);
  k.add(rbox(0.8, 0.66, 0.22, 0.14), CREAM(), 0, 0.65, -0.28);
  for (const sx of [-1, 1]) k.add(rbox(0.18, 0.58, 0.78, 0.09), CREAM(), sx * 0.36, 0.4, 0);
  return { hw: 0.42, hd: 0.42, top: 0.95 };
}
function roundTable(k) {
  k.add(cyl(0.7, 0.7, 0.06, 20), MAT.paint('#3a4044', 0.4), 0, 0.74, 0);
  k.add(cyl(0.08, 0.1, 0.72, 8), GOLD(), 0, 0.36, 0);
  k.add(sphere(0.14, 12, 8), MAT.glow('#fbf6ee', '#ffe8c0', 0.8), 0, 0.88, 0);
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; k.add(cyl(0.16, 0.16, 0.05, 10), MAT.paint('#8ab8b8', 0.4), Math.sin(a) * 0.95, 0.48, Math.cos(a) * 0.95); k.add(cyl(0.03, 0.03, 0.46, 6), GOLD(), Math.sin(a) * 0.95, 0.23, Math.cos(a) * 0.95); }
  return { r: 1.1, top: 0.8 };
}
function deckChair(k) {
  const st = MAT.paint('#2a2a30', 0.5), cloth = MAT.cloth('#a8302a', '#f2ead6');
  k.add(rbox(0.6, 0.05, 1.3, 0.02), cloth, 0, 0.36, 0.1, 0, { rx: 0.08 });
  k.add(rbox(0.6, 0.05, 0.7, 0.02), cloth, 0, 0.65, -0.62, 0, { rx: -0.9 });
  for (const sx of [-1, 1]) k.add(rbox(0.04, 0.36, 1.5, 0.01), st, sx * 0.3, 0.18, 0);
  return { hw: 0.32, hd: 0.78, top: 0.7 };
}
function coinMachine(k, kind) {
  k.add(rbox(0.8, 1.7, 0.55, 0.1), MAT.paint(kind === 'life' ? '#a8302a' : '#2a5ab0', 0.4), 0, 0.85, 0);
  k.add(plane(0.5, 0.5), MAT.glow(kind === 'life' ? '#ffb0a0' : '#a0c8ff', kind === 'life' ? '#ff5a3a' : '#4a8aff', 0.9), 0, 1.2, 0.28);
  k.add(rbox(0.12, 0.2, 0.04, 0.02), GOLD(), 0.2, 0.7, 0.29);
  return { hw: 0.42, hd: 0.3, top: 1.7 };
}

export function buildOtrHotelRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'otrhotel', OTRHOTEL_AT.x, OTRHOTEL_AT.z);
  const R = B.room, k = B.k;
  const W = 22, D = 16, H = 5.6;
  R.view = 13; R.follow = 0.6; R.music = 'zeelich_in';   // (ORDER 19/23f: Zeelich's playlist through the walls, not Citadel's Home)
  const wall = M('oh_wall', () => { const t = wallTex(), m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.18 }); return m; });
  const dark = MAT.rubble('slate'), floor = MAT.tiles('#b8704a', '#a8643f', '#6a3a2a', false, 4), cap = MAT.paint('#16323a', 0.5);
  const LX = -W / 2, BZ = -D / 2, DOORZ = 5.2, UH = 0.9;
  B.shell({ floor, slab: dark, body: wall, low: dark, rail: GOLD(), cap, H, t: 0.5, dado: 1.2, rimH: 0.5, rimMat: cap, W, D,
    left: [{ at: DOORZ, w: 1.8, h: 2.8, y0: 0, kind: 'door', frame: GOLD() }, ...[-5.6, -3.4, -1.2].map((at) => ({ kind: 'window', at, w: 1.1, h: 1.5, y0: UH + 0.9 }))] });
  R.exits.push({ x: B.cx + LX + 0.45, z: B.cz + DOORZ, r: 0.8, to: 'otrhotel-out' });
  R.spawn = { x: B.cx + LX + 1.4, z: B.cz + DOORZ, a: Math.PI / 2 };

  // --- the raised floor along the back and the left: an L, 0.9 m up, its edge posts and rope
  const UZ1 = BZ + 5.2, UX1 = LX + 6.0;   // (the back strip to z UZ1, the left strip to x UX1, as far as z = 2.6)
  const slab = (x0, z0, x1, z1) => { k.add(rbox(x1 - x0, UH, z1 - z0, 0.03), dark, (x0 + x1) / 2, UH / 2, (z0 + z1) / 2); k.add(rbox(x1 - x0 - 0.04, 0.02, z1 - z0 - 0.04, 0.01), floor, (x0 + x1) / 2, UH + 0.005, (z0 + z1) / 2); B.col((x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2 + 0.06, (z1 - z0) / 2 + 0.06, UH); };
  slab(LX, BZ, W / 2, UZ1); slab(LX, UZ1, UX1, 2.6);
  // two stairs down: from the back strip's front (right of the lounge) and from the left strip's front
  const stair = (x, z0, dir, axis) => { for (let i = 0; i < 3; i++) { const tp = UH * (3 - i) / 4; if (axis === 'z') { const z = z0 + dir * (i + 0.5) * 0.45; k.add(rbox(1.6, tp, 0.47, 0.015), dark, x, tp / 2, z); B.col(x, z, 0.8, 0.225 + 0.12, tp, { stair: true }); } else { const xx = x + dir * (i + 0.5) * 0.45; k.add(rbox(0.47, tp, 1.6, 0.015), dark, xx, tp / 2, z0); B.col(xx, z0, 0.225 + 0.12, 0.8, tp, { stair: true }); } } };
  stair(6.4, UZ1, 1, 'z'); stair(UX1, 1.4, 1, 'x');
  const postsZ = (x0, x1, z) => { for (let x = x0; x <= x1; x += 0.9) { k.add(cyl(0.05, 0.06, 0.9, 8), GOLD(), x, UH + 0.45, z); k.add(sphere(0.07, 8, 6), GOLD(), x, UH + 0.94, z); } k.add(cyl(0.02, 0.02, x1 - x0, 6), MAT.paint('#2f8a9a', 0.4), (x0 + x1) / 2, UH + 0.8, z, 0, { rz: Math.PI / 2 }); B.col((x0 + x1) / 2, z, (x1 - x0) / 2, 0.06, UH + 1.0, { seeThrough: true, noStand: true }); };
  const postsX = (z0, z1, x) => { for (let z = z0; z <= z1; z += 0.9) { k.add(cyl(0.05, 0.06, 0.9, 8), GOLD(), x, UH + 0.45, z); k.add(sphere(0.07, 8, 6), GOLD(), x, UH + 0.94, z); } k.add(cyl(0.02, 0.02, z1 - z0, 6), MAT.paint('#2f8a9a', 0.4), x, UH + 0.8, (z0 + z1) / 2, 0, { rx: Math.PI / 2 }); B.col(x, (z0 + z1) / 2, 0.06, (z1 - z0) / 2, UH + 1.0, { seeThrough: true, noStand: true }); };
  postsZ(UX1 + 0.1, 5.4, UZ1 + 0.05); postsZ(7.4, W / 2 - 0.3, UZ1 + 0.05); postsX(UZ1 + 0.1, 0.4, UX1 + 0.05);
  // the members' desk: two curved counters on the back strip, stools, a bowl, the register
  const desk = (x, z) => { k.add(rbox(2.4, 1.0, 0.7, 0.3), TEAL(), x, UH + 0.5, z); k.add(rbox(2.5, 0.06, 0.8, 0.3), MAT.paint('#16201e', 0.3), x, UH + 1.03, z); B.col(x, z, 1.2, 0.36, UH + 1.06, { noStand: true }); for (const dx of [-0.8, 0, 0.8]) B.put(x + dx, z + 0.75, 0, (kk) => { kk.add(cyl(0.17, 0.17, 0.05, 10), MAT.paint('#8ab8b8', 0.4), 0, 0.66, 0); kk.add(cyl(0.03, 0.03, 0.64, 6), GOLD(), 0, 0.32, 0); return { r: 0.18, top: 0.7 }; }, { y: UH }); };
  const DX1 = -2.6, DX2 = 1.2, DZ = BZ + 2.2;
  desk(DX1, DZ); desk(DX2, DZ);
  k.add(sphere(0.14, 10, 8), MAT.paint('#c83a3a', 0.4), DX1 - 0.6, UH + 1.12, DZ, 0, { sy: 0.6 });
  k.add(rbox(0.5, 0.06, 0.36, 0.02), MAT.paper('#f2ead6', '#3a2a1a', 'leaf'), DX2 + 0.5, UH + 1.09, DZ);   // the register
  for (let i = 0; i < 3; i++) { k.add(rbox(1.8, 0.05, 0.3, 0.01), GOLD(), -6.0 + i * 2.4, UH + 1.6, BZ + 0.18); for (let j = 0; j < 3; j++) jar(k, -6.6 + i * 2.4 + j * 0.55, UH + 1.63, BZ + 0.18, 'vase', ['#b8bcc4', '#c83a3a', '#b8bcc4'][j], 1.6); }
  for (const [x, z] of [[LX + 1.6, BZ + 6.6], [LX + 3.9, BZ + 8.2], [LX + 1.6, BZ + 9.8]]) B.put(x, z, 0, (kk) => roundTable(kk), { y: UH });
  for (const [x, z, y] of [[LX + 0.6, BZ + 0.6, UH], [5.2, BZ + 0.7, UH], [UX1 - 0.4, 2.2, UH], [W / 2 - 0.6, BZ + 0.6, UH]]) B.put(x, z, 0, (kk) => bushUrn(kk), { y });
  for (const [x, z] of [[-4.6, BZ + 1.0], [3.6, BZ + 1.0], [8.6, BZ + 1.0]]) B.put(x, z, 0, (kk) => tierLamp(kk, 1.3), { y: UH });
  // two tall doorways between twisted columns in the back wall, the coin machines between them
  for (const x of [-7.4, 6.4]) {
    k.add(rbox(1.8, 3.4, 0.1, 0.02), MAT.flat('#0e1416', 0.9), x, UH + 1.7, BZ + 0.06);
    for (const sx of [-1, 1]) for (let i = 0; i < 10; i++) k.add(cyl(0.16, 0.16, 0.36, 8), MAT.paint(i % 2 ? '#c8864a' : '#e8a86a', 0.4), x + sx * 1.1, UH + 0.18 + i * 0.36, BZ + 0.2, i * 0.35);
  }
  const machines = [];
  for (const [x, kind] of [[-0.2, 'life'], [-1.2, 'magic']]) { B.put(x + 4.4, BZ + 0.45, 0, (kk) => coinMachine(kk, kind), { y: UH }); machines.push({ x: B.cx + x + 4.4, z: B.cz + BZ + 1.2, a: Math.PI, kind }); }

  // --- the sunken lounge: four armchairs between globe lamps on blocks
  for (const [x, z, a] of [[-2.6, 0.2, 0.3], [-0.8, -0.4, -0.2], [1.2, -0.2, 0.2], [2.8, 0.4, -0.3]]) B.put(x, z, a, (kk) => armchair(kk));
  for (const [x, z] of [[-4.0, 0.4], [4.3, 0.4], [-4.0, -1.4]]) { k.add(rbox(0.8, 0.8, 0.8, 0.04), dark, x, 0.4, z); B.col(x, z, 0.4, 0.4, 0.8, { noStand: true }); k.at(x, 0.8, z, 0, () => tierLamp(k, 0.5)); }

  // --- the pool at the front right behind a low kerb, deck chairs beside it
  const PX0 = 0.4, PX1 = W / 2 - 0.4, PZ0 = 2.8, PZ1 = D / 2 - 0.4;
  for (const [x0, z0, x1, z1] of [[PX0, PZ0, PX1, PZ0 + 0.3], [PX0, PZ0, PX0 + 0.3, PZ1]]) k.add(rbox(x1 - x0, 0.4, z1 - z0, 0.03), cap, (x0 + x1) / 2, 0.2, (z0 + z1) / 2);
  k.add(plane(PX1 - PX0 - 0.3, PZ1 - PZ0 - 0.3), MAT.glass('#4a9ab8', 0.85), (PX0 + PX1) / 2 + 0.15, 0.05, (PZ0 + PZ1) / 2 + 0.15, 0, { rx: -Math.PI / 2 });
  k.add(plane(PX1 - PX0 - 0.3, PZ1 - PZ0 - 0.3), MAT.tiles('#5aa8c4', '#4a98b4', '#2a5a6a', false, 6), (PX0 + PX1) / 2 + 0.15, 0.02, (PZ0 + PZ1) / 2 + 0.15, 0, { rx: -Math.PI / 2 });
  B.col((PX0 + PX1) / 2, (PZ0 + PZ1) / 2, (PX1 - PX0) / 2, (PZ1 - PZ0) / 2, 1.0, { seeThrough: true, noStand: true });
  for (const [x, z] of [[-1.2, 4.4], [-1.2, 6.2]]) B.put(x, z, Math.PI / 2, (kk) => deckChair(kk));
  for (const [x, z] of [[-3.0, 7.2], [W / 2 - 0.6, PZ0 - 0.6]]) B.put(x, z, 0, (kk) => bushUrn(kk));

  B.light('#fff0d8', 6, 18, -3.0, 4.6, -3.0); B.light('#fff0d8', 5, 16, 4.0, 4.6, 0.0); B.light('#bfe6ff', 2.5, 10, 5.4, 1.4, 5.4); B.light('#ffe0b0', 3, 10, -6.5, 3.4, 1.0);

  Object.assign(HOTEL, {
    desk: { x: B.cx + (DX1 + DX2) / 2, z: B.cz + DZ + 1.0, r: 1.4 },
    register: { x: B.cx + DX2 + 0.5, z: B.cz + DZ + 0.8, r: 0.9 },
    machines,
    npcSpots: {
      clerk: { x: B.cx + DX2, z: B.cz + DZ - 0.75, a: 0 },
      explorer: { x: B.cx - 0.8, z: B.cz - 0.4, a: -0.2 },                // in an armchair in the lounge
      manicurist: { x: B.cx + LX + 3.9, z: B.cz + BZ + 7.0, a: Math.PI },   // by a round table on the left strip
    },
  });
  R.npcSpots = HOTEL.npcSpots;
  return { otrhotel: B.finish() };
}

// the plaza house's door (Otringal's island: the building list in worldfit.js; the measured place before it is built)
const HOUSE = 'house (-15.4, -10.2)';
function plazaDoor() {
  const b = FIT.find((f) => f.region === 'isle_otringal' && f.name === HOUSE) || { x: 1884.6, z: 1789.8, ry: 0, d: 5.7 };
  const c = Math.cos(b.ry), s = Math.sin(b.ry), lz = b.d / 2;
  return { x: b.x + s * lz, z: b.z + c * lz, ry: b.ry };
}
export function otrHotelDoors() {
  const d = plazaDoor();
  return [{ house: 'otrhotel', x: d.x + Math.sin(d.ry) * 0.35, z: d.z + Math.cos(d.ry) * 0.35, r: 0.9, room: 'otrhotel', region: 'isle_otringal' }];
}
export function otrHotelExit(to) {
  if (to !== 'otrhotel-out') return null;
  const d = plazaDoor();
  return { room: 'isle_otringal', x: d.x + Math.sin(d.ry) * 1.2, z: d.z + Math.cos(d.ry) * 1.2, a: d.ry };
}
