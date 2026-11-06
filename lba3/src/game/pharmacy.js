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
//   PHARMACY_PLAN               the layout in the room's frame (the builder's own numbers): roomlife.js places the
//                               room's people from it, so a change of the layout carries them along
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { MAT, M, TEX, rbox, plane, cyl, sphere, lathe, jar, chair, noticeBoard, pottedPlant, hangingLamp, rug, papers } from './props.js';
import { sackPile, basket, hanging } from './roomdress.js';

// (the user 2.11, "make them bigger": the floor 1.5 times the first cut; the shelves, counter and jars their own size,
//  a few more shelves on the longer walls)
// (ROOMS-FULL, the user 3.11, "the rooms feel empty … maybe shrink a little and add detail": 1.25 times, the shelves
//  re-spaced along the shorter walls — the third on the left wall narrower, clear of the door — and stocked further)
export const PHARMACY_PLAN = (() => {
  const F = 1.25, W = 7.2 * F, D = 6.6 * F, LX = -W / 2, BZ = -D / 2, CX = 0.15 * F, CZ = 0.1 * F;
  return { F, W, D, LX, BZ, DOORZ: 2.1 * F, CX, CZ, CW: 3.8,
    spot: { x: CX, z: CZ - 0.85, a: 0 },          // (the pharmacist's spot behind the oval counter)
    wallX: LX + 0.2, wallShelves: [-2.9, -1.15, 1.0], wallShelfW: [1.7, 1.7, 1.3], ladderZ: 0.05,   // (the left wall's shelves of jars: their middles' z)
    backZ: BZ + 0.2, backShelves: [-3.55, -1.8], honeyShelves: [1.15, 3.55], ladderX: 2.4,   // (the back wall's: their x)
    drawers: { x: W / 2 - 0.25, z: -2.3 } };      // (the herb drawers on the right wall)
})();

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

// a stone mortar with its pestle; brass scales with two pans; a bunch of dried herbs hung by its stems
function mortar(k, x, y, z) {
  k.add(lathe([[0.001, 0], [0.08, 0], [0.1, 0.03], [0.1, 0.09], [0.085, 0.1], [0.07, 0.04], [0.001, 0.04]], 12), MAT.paint('#b8b6c0', 0.6), x, y, z);
  k.add(cyl(0.015, 0.025, 0.18, 6), MAT.paint('#8a8892', 0.6), x + 0.03, y + 0.1, z, 0, { rz: 0.4 });
}
function scales(k, x, y, z) {
  k.add(cyl(0.06, 0.07, 0.02, 10), MAT.brass(), x, y + 0.01, z);
  k.add(cyl(0.01, 0.01, 0.3, 6), MAT.brass(), x, y + 0.16, z);
  k.add(rbox(0.36, 0.015, 0.015, 0.004), MAT.brass(), x, y + 0.3, z);
  for (const s of [-1, 1]) k.add(lathe([[0.001, 0], [0.07, 0.0], [0.08, 0.02], [0.001, 0.005]], 10), MAT.brass(), x + s * 0.17, y + 0.18, z);
}
function herbs(k, x, y, z) {
  k.add(cyl(0.005, 0.005, 0.12, 4), MAT.flat('#8a6a3a', 0.95), x, y, z);
  k.add(lathe([[0.001, 0], [0.05, -0.04], [0.07, -0.2], [0.001, -0.26]], 6), MAT.flat(['#5e7a3a', '#7a8a4a', '#8a6a4a'][Math.abs(Math.round(x * 3)) % 3], 0.95), x, y - 0.05, z);
}

export function buildPharmacyRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'pharmacy', PHARMACY_AT.x, PHARMACY_AT.z);
  const R = B.room, k = B.k;
  // (the user 2.11, "make them bigger": the floor 1.5 times the first cut, the camera following Twinsen; the
  //  shelves, counter and jars keep their size, a few more shelves fill the longer walls)
  const P = PHARMACY_PLAN, { F, W, D } = P, H = 3.7;
  R.view = 10; R.follow = 0.55; R.music = 'office';   // (ORDER 19: a town shop: the square heard through the walls, as the water office)
  // (the same pale grey blocks as the tavern, the shop and the ticket office)
  const stone = M('tv_stone', () => { const t = TEX.stone('grey'), m = new THREE.MeshStandardMaterial({ map: t, color: '#e6e4ea', roughness: 0.9, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.32 }); m.userData.tile = 2; return m; });
  const rough = MAT.rubble('grey'), cap = MAT.stone('grey', 1.4);
  const { LX, BZ, DOORZ } = P;
  B.shell({ floor: MAT.tiles('#b8b6b0', '#aeaca6', '#4a4a50', false, 6), slab: rough, body: stone, low: stone, rail: MAT.iron(), cap, H, t: 0.5, dado: 1.0, rimH: 0.45, rimMat: rough, W, D,
    left: [{ at: DOORZ, w: 1.3, h: 2.4, y0: 0, kind: 'door' }] });
  R.exits.push({ x: B.cx + LX + 0.45, z: B.cz + DOORZ, r: 0.75, to: 'pharmacy-out' });
  R.spawn = { x: B.cx + LX + 1.4, z: B.cz + DOORZ, a: Math.PI / 2 };
  // the floor's scattered black tiles (the original's)
  const blk = MAT.paint('#26262c', 0.6);
  for (const [x, z] of [[-1.8, -1.2], [0.6, -2.2], [2.4, 0.6], [-0.4, 1.6], [1.6, 2.4], [-2.6, -0.2], [2.8, -1.8], [0.2, 0.0], [-3.2, 2.6], [3.4, -2.9], [-1.2, -2.8]]) k.add(plane(0.42, 0.42), blk, x * F, 0.012, z * F, 0, { rx: -Math.PI / 2 });

  // --- the shelves of apothecary jars, a ladder on each wall, the plant against the back wall
  const honey = (row, i) => (row === 1 ? ['jar', ['#e8a030', '#d88a20'][i % 2], 1.15] : apothecary(row, i));   // (twelve years on: the Mosquibees' honey)
  P.wallShelves.forEach((z, i) => B.put(P.wallX, z, Math.PI / 2, (kk) => shelves(kk, P.wallShelfW[i], apothecary)));
  B.put(LX + 0.22, P.ladderZ, Math.PI / 2, (kk) => ladder(kk));
  for (const x of P.backShelves) B.put(x, P.backZ, 0, (kk) => shelves(kk, 1.7, apothecary));
  B.put(P.honeyShelves[0], P.backZ, 0, (kk) => shelves(kk, 1.7, honey));
  B.put(P.ladderX, BZ + 0.22, 0, (kk) => ladder(kk));
  B.put(P.honeyShelves[1], P.backZ, 0, (kk) => shelves(kk, 1.7, honey));
  k.at(-0.65, 0, BZ + 0.55, 0, () => pottedPlant(k, { kind: 'leafy', s: 1.5, potColor: '#5e5c66' }));
  for (let i = 0; i < 5; i++) k.add(sphere(0.06, 8, 6), MAT.flat('#c8302a', 0.4), -0.65 + Math.sin(i * 1.9) * 0.3, 1.05 + (i % 2) * 0.12, BZ + 0.55 + Math.cos(i * 1.9) * 0.25);
  B.ccol(-0.65, BZ + 0.55, 0.45, 1.2);

  // --- the oval counter in the middle: the till, a green flask and glasses, a bauble tree at each end
  const { CX, CZ, CW } = P;
  k.add(rbox(CW, 0.95, 0.75, 0.36), METAL(), CX, 0.475, CZ);
  k.add(rbox(CW + 0.06, 0.05, 0.81, 0.38), DARK(), CX, 0.97, CZ);
  B.col(CX, CZ, CW / 2, 0.4, 1.0, { noStand: true });
  k.at(CX + 0.3, 0.995, CZ, 0, () => till(k));
  jar(k, CX - 0.6, 0.995, CZ + 0.05, 'bottle', '#3f9a5a', 1.2);
  for (const dx of [-0.95, -0.3]) jar(k, CX + dx, 0.995, CZ - 0.1, 'bottle', '#d8e8ec', 0.7);
  k.at(CX - CW / 2 + 0.3, 0.995, CZ, 0, () => baubleTree(k, '#2f6aa8'));
  k.at(CX + CW / 2 - 0.3, 0.995, CZ, 0, () => baubleTree(k, '#c83a3a'));
  R.npcSpots = { pharmacist: { x: B.cx + P.spot.x, z: B.cz + P.spot.z, a: P.spot.a } };

  // --- the lamps, the front: red chairs, a second plant, two teal jars on the floor; the notice board by the door
  for (const [x, z] of [[W / 2 - 0.5, -0.6 * F]]) B.put(x, z, 0, (kk) => postLamp(kk));
  for (const x of [-1.9 * F, -1.1 * F]) B.put(x, D / 2 - 0.45, Math.PI, (kk) => chair(kk, { pal: 'pale', cushion: '#b0302c' }));
  k.at(0.6 * F, 0, D / 2 - 0.55, 0, () => pottedPlant(k, { kind: 'leafy', s: 1.2, potColor: '#5e5c66' }));
  B.ccol(0.6 * F, D / 2 - 0.55, 0.35, 1.0);
  for (const [x, z] of [[2.5, 2.6], [3.0, 2.2]]) B.put(x * F, z * F, 0, (kk) => { jar(kk, 0, 0, 0, 'urn', '#3f9aa8', 1.9); return { r: 0.28, top: 0.8 }; });
  k.at(LX + 0.03, 1.5, DOORZ + 1.05, Math.PI / 2, () => noticeBoard(k, 0.6, 0.5, 17));

  // --- ROOMS-FULL: the herb drawers on the right wall with a mortar and the scales on top, bunches of dried herbs
  // hung under the back shelves, the counter's mortar, papers and a basket of bandages, two lamps over it, a rug where
  // customers wait, sacks of dried leaves by the right wall, a striped cloth by the door (props only: no new lights)
  B.put(P.drawers.x, P.drawers.z, -Math.PI / 2, (kk) => {
    kk.add(rbox(1.4, 1.3, 0.45, 0.03), MAT.wood('dark'), 0, 0.65, 0);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) { kk.add(rbox(0.24, 0.24, 0.02, 0.01), MAT.wood('honey'), -0.56 + j * 0.28, 0.22 + i * 0.29, 0.23); kk.add(sphere(0.018, 6, 4), MAT.brass(), -0.56 + j * 0.28, 0.22 + i * 0.29, 0.25); }
    mortar(kk, -0.35, 1.3, 0.0); scales(kk, 0.3, 1.3, 0.0);
    return { hw: 0.7, hd: 0.23, top: 1.3 };
  });
  for (const x of [...P.backShelves, ...P.honeyShelves]) for (let i = 0; i < 3; i++) herbs(k, x - 0.5 + i * 0.5, 2.85, P.backZ + 0.1);
  mortar(k, CX - 1.2, 0.995, CZ + 0.1);
  papers(k, CX + 1.0, 0.995, CZ + 0.15, 2, 9);
  k.at(CX + 1.45, 0.995, CZ - 0.05, 0, () => basket(k, { r: 0.13, fill: '#f2ead6' }));
  for (const dx of [-1.0, 1.0]) k.at(CX + dx, 0, CZ, 0, () => hangingLamp(k, 2.6, H, { shade: '#2f6f74' }));
  k.at(CX - 0.3, 0.01, CZ + 1.55, 0, () => rug(k, 2.4, 1.1, ['#2f6f74', '#e8dcc0', '#b0302c', '#1f4a50', '#f2ead6'], 5));
  B.put(W / 2 - 0.6, 1.3, -0.4, (kk) => sackPile(kk, { seed: 6 }));
  k.at(LX + 0.04, 2.05, DOORZ + 1.05, Math.PI / 2, () => hanging(k, { w: 0.6, h: 0.5, bands: ['#2f6f74', '#e8dcc0', '#2f6f74'] }));

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
