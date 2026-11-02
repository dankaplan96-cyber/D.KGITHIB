// LBA-CITADEL-4 (the user 1.11: "fixes and additions from the first and second games, and logical additions for twelve
// years later"; night mode: "work to the plan"): Citadel's pharmacy, after LBA2's scene 22. In LBA2 its door is where
// our 'bug2' house stands in Bug Street (town.js: "Bug Street's south house, the original's scene 22"); the house had
// no inside.
// Our own geometry, from a study of the original's layout (numbers and descriptions only; nothing copied):
//   - a hall of about 15 × 14 of the original's cells (≈ 7.2 × 6.6 m, ≈ 3.6 m high), pale grey stone blocks, a floor of
//     grey tiles with black ones scattered in it
//   - as the game's camera sees it: both walls lined with shelves of teal apothecary jars with pale lids, a black
//     library ladder between them on each wall; a great potted plant against the back wall
//   - a long oval counter of pale metal in the middle: the till, a green flask and glasses, a tree of blue baubles at
//     its left end and one of red at its right
//   - white globe lamps on posts at the left front and the right, two red chairs at the front, a second plant, two
//     teal jars standing on the floor
// Twelve years on (ours): one shelf holds Zeelich remedies now, the Mosquibees' amber honey jars; a notice board for
// the prescriptions hangs by the door.
//
// CONTRACT
//   PHARMACY_AT                where the room stands (regions.js)
//   buildPharmacyRoom(scene, physics) → { pharmacy }   (regions.js group 'pharmacy')
//   pharmacyDoors(W) / pharmacyExit(to, W)   the 'bug2' house's door leads in; 'pharmacy-out' leads back out before it
//   R.npcSpots.pharmacist       behind the counter (the story layer may put the pharmacist there)
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { MAT, M, TEX, rbox, plane, cyl, sphere, lathe, jar, chair, noticeBoard, pottedPlant } from './props.js';

export const PHARMACY_AT = { x: 6900, z: 0 };

const METAL = () => MAT.paint('#cfcdd6', 0.35), DARK = () => MAT.paint('#7c7a86', 0.4), IRON = () => MAT.paint('#2c2c32', 0.5);

// a shelf unit against a wall (local +z away from the wall): three boards of jars on two side posts
function shelves(k, w, jars) {
  for (const sx of [-1, 1]) k.add(rbox(0.06, 2.3, 0.3, 0.01), DARK(), sx * (w / 2 - 0.03), 1.15, 0);
  [0.9, 1.45, 2.0].forEach((y, row) => {
    k.add(rbox(w, 0.04, 0.32, 0.01), METAL(), 0, y, 0);
    const n = Math.floor((w - 0.2) / 0.3);
    for (let i = 0; i < n; i++) { const [kind, c, s] = jars(row, i); jar(k, -w / 2 + 0.2 + i * ((w - 0.4) / Math.max(1, n - 1)), y + 0.02, 0.02, kind, c, s); }
  });
  return { hw: w / 2, hd: 0.17, top: 2.3 };
}
const apothecary = (row, i) => ['jar', ['#2f8a8a', '#3f9a9a', '#2a7a80'][(row + i) % 3], 1.25 + ((i * 7) % 3) * 0.1];
// a black library ladder leaning on the wall (local +z away from the wall)
function ladder(k) {
  for (const sx of [-0.22, 0.22]) k.add(rbox(0.05, 2.5, 0.05, 0.01), IRON(), sx, 1.2, 0.18, 0, { rx: -0.12 });
  for (let i = 0; i < 7; i++) k.add(rbox(0.44, 0.03, 0.04, 0.01), IRON(), 0, 0.3 + i * 0.32, 0.31 - i * 0.04 * 0.95);
  return { hw: 0.25, hd: 0.2, top: 2.4 };
}
// a short post with a white globe; a tree of baubles; the till
function postLamp(k) {
  k.add(cyl(0.12, 0.16, 0.08, 12), DARK(), 0, 0.04, 0);
  k.add(cyl(0.035, 0.045, 1.6, 8), IRON(), 0, 0.84, 0);
  k.add(sphere(0.17, 14, 10), MAT.glow('#fff8ee', '#ffe8c0', 1.2), 0, 1.76, 0);
  return { r: 0.18, top: 1.9 };
}
function baubleTree(k, color) {
  const m = MAT.flat(color, 0.2, { metalness: 0.3 });
  k.add(cyl(0.03, 0.05, 0.12, 8), DARK(), 0, 0.06, 0);
  for (let r = 0; r < 5; r++) { const n = 7 - r, rad = 0.18 - r * 0.035, y = 0.14 + r * 0.09; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r; k.add(sphere(0.045, 8, 6), m, Math.sin(a) * rad, y, Math.cos(a) * rad); } }
  k.add(sphere(0.05, 8, 6), m, 0, 0.6, 0);
}
function till(k) {
  const t = MAT.paint('#2f8a8a', 0.4);
  k.add(rbox(0.42, 0.22, 0.32, 0.03), t, 0, 0.11, 0);
  k.add(rbox(0.38, 0.06, 0.2, 0.02), t, 0, 0.26, -0.04, 0, { rx: -0.5 });
  k.add(rbox(0.2, 0.1, 0.02, 0.01), MAT.glow('#d8f0e8', '#80c0b0', 0.6), 0, 0.36, -0.14);
}

export function buildPharmacyRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'pharmacy', PHARMACY_AT.x, PHARMACY_AT.z);
  const R = B.room, k = B.k;
  // (the user 2.11, "make them bigger": the floor 1.5 times the first cut, the camera following Twinsen; the
  //  shelves, counter and jars keep their size, a few more shelves fill the longer walls)
  const F = 1.5, W = 7.2 * F, D = 6.6 * F, H = 4.0;
  R.view = 10.5; R.follow = 0.55; R.music = 'home';
  // (the same pale grey blocks as the tavern, the shop and the ticket office)
  const stone = M('tv_stone', () => { const t = TEX.stone('grey'), m = new THREE.MeshStandardMaterial({ map: t, color: '#e6e4ea', roughness: 0.9, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.32 }); m.userData.tile = 2; return m; });
  const rough = MAT.rubble('grey'), cap = MAT.stone('grey', 1.4);
  const LX = -W / 2, BZ = -D / 2, DOORZ = 2.1 * F;
  B.shell({ floor: MAT.tiles('#b8b6b0', '#aeaca6', '#4a4a50', false, 6), slab: rough, body: stone, low: stone, rail: MAT.iron(), cap, H, t: 0.5, dado: 1.0, rimH: 0.45, rimMat: rough, W, D,
    left: [{ at: DOORZ, w: 1.3, h: 2.4, y0: 0, kind: 'door' }] });
  R.exits.push({ x: B.cx + LX + 0.45, z: B.cz + DOORZ, r: 0.75, to: 'pharmacy-out' });
  R.spawn = { x: B.cx + LX + 1.4, z: B.cz + DOORZ, a: Math.PI / 2 };
  // the floor's scattered black tiles (the original's)
  const blk = MAT.paint('#26262c', 0.6);
  for (const [x, z] of [[-1.8, -1.2], [0.6, -2.2], [2.4, 0.6], [-0.4, 1.6], [1.6, 2.4], [-2.6, -0.2], [2.8, -1.8], [0.2, 0.0], [-3.2, 2.6], [3.4, -2.9], [-1.2, -2.8]]) k.add(plane(0.42, 0.42), blk, x * F, 0.012, z * F, 0, { rx: -Math.PI / 2 });

  // --- the shelves of apothecary jars, a ladder on each wall, the plant against the back wall
  const honey = (row, i) => (row === 1 ? ['jar', ['#e8a030', '#d88a20'][i % 2], 1.15] : apothecary(row, i));   // (twelve years on: the Mosquibees' honey)
  for (const z of [-3.9, -2.1, 0.3]) B.put(LX + 0.2, z, Math.PI / 2, (kk) => shelves(kk, 1.7, apothecary));
  B.put(LX + 0.22, -1.0, Math.PI / 2, (kk) => ladder(kk));
  for (const x of [-4.2, -2.4]) B.put(x, BZ + 0.2, 0, (kk) => shelves(kk, 1.7, apothecary));
  B.put(1.2, BZ + 0.2, 0, (kk) => shelves(kk, 1.7, honey));
  B.put(2.6, BZ + 0.22, 0, (kk) => ladder(kk));
  B.put(3.6, BZ + 0.2, 0, (kk) => shelves(kk, 1.7, honey));
  k.at(-0.65, 0, BZ + 0.55, 0, () => pottedPlant(k, { kind: 'leafy', s: 1.5, potColor: '#5e5c66' }));
  for (let i = 0; i < 5; i++) k.add(sphere(0.06, 8, 6), MAT.flat('#c8302a', 0.4), -0.65 + Math.sin(i * 1.9) * 0.3, 1.05 + (i % 2) * 0.12, BZ + 0.55 + Math.cos(i * 1.9) * 0.25);
  B.ccol(-0.65, BZ + 0.55, 0.45, 1.2);

  // --- the oval counter in the middle: the till, a green flask and glasses, a bauble tree at each end
  const CX = 0.15 * F, CZ = 0.1 * F, CW = 3.8;
  k.add(rbox(CW, 0.95, 0.75, 0.36), METAL(), CX, 0.475, CZ);
  k.add(rbox(CW + 0.06, 0.05, 0.81, 0.38), DARK(), CX, 0.97, CZ);
  B.col(CX, CZ, CW / 2, 0.4, 1.0, { noStand: true });
  k.at(CX + 0.3, 0.995, CZ, 0, () => till(k));
  jar(k, CX - 0.6, 0.995, CZ + 0.05, 'bottle', '#3f9a5a', 1.2);
  for (const dx of [-0.95, -0.3]) jar(k, CX + dx, 0.995, CZ - 0.1, 'bottle', '#d8e8ec', 0.7);
  k.at(CX - CW / 2 + 0.3, 0.995, CZ, 0, () => baubleTree(k, '#2f6aa8'));
  k.at(CX + CW / 2 - 0.3, 0.995, CZ, 0, () => baubleTree(k, '#c83a3a'));
  R.npcSpots = { pharmacist: { x: B.cx + CX, z: B.cz + CZ - 0.85, a: 0 } };

  // --- the lamps, the front: red chairs, a second plant, two teal jars on the floor; the notice board by the door
  for (const [x, z] of [[LX + 0.5, 1.2 * F], [W / 2 - 0.5, -0.6 * F]]) B.put(x, z, 0, (kk) => postLamp(kk));
  for (const x of [-1.9 * F, -1.1 * F]) B.put(x, D / 2 - 0.45, Math.PI, (kk) => chair(kk, { pal: 'pale', cushion: '#b0302c' }));
  k.at(0.6 * F, 0, D / 2 - 0.55, 0, () => pottedPlant(k, { kind: 'leafy', s: 1.2, potColor: '#5e5c66' }));
  B.ccol(0.6 * F, D / 2 - 0.55, 0.35, 1.0);
  for (const [x, z] of [[2.5, 2.6], [3.0, 2.2]]) B.put(x * F, z * F, 0, (kk) => { jar(kk, 0, 0, 0, 'urn', '#3f9aa8', 1.9); return { r: 0.28, top: 0.8 }; });
  k.at(LX + 0.03, 1.5, DOORZ - 1.15, Math.PI / 2, () => noticeBoard(k, 0.6, 0.5, 17));

  B.light('#f0f4ff', 5, 13, -0.6 * F, 3.4, 0.4 * F); B.light('#f0f4ff', 4, 11, 2.2 * F, 3.4, -1.4 * F);
  return { pharmacy: B.finish() };
}

// the 'bug2' house's door leads in; coming out, Twinsen stands 1.2 m before it, facing away
export function pharmacyDoors(W) {
  const h = W?.houses?.find((x) => x.id === 'bug2');
  return h?.door ? [{ house: 'bug2', x: h.door.x, z: h.door.z, r: 0.9, room: 'pharmacy' }] : [];
}
export function pharmacyExit(to, W) {
  if (to !== 'pharmacy-out') return null;
  const h = W?.houses?.find((x) => x.id === 'bug2'); if (!h?.door) return null;
  return { x: h.door.x + Math.sin(h.ry) * 1.2, z: h.door.z + Math.cos(h.ry) * 1.2, a: h.ry };
}
