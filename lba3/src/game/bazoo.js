// LBA-CITADEL-2 (after the tavern, the user 1.11: "excellent, go on"): Mr Bazoo's shop, after LBA2's scene 14. In
// LBA2 its door is where our 'museum' building stands (by the harbour path); the building had no inside.
// Our own geometry, from a study of the original's layout (numbers and descriptions only; nothing copied):
//   - a small hall of about 17 × 12 of the original's cells (≈ 8.4 × 6 m, ≈ 3.2 m high) of pale grey stone blocks, a
//     floor of grey square tiles with dark joints
//   - as the game's camera sees it: the long wall at the back, the short one on the left; in the middle a rounded
//     counter of pale metal with the till, a tree of red baubles at its left end and one of teal at its right
//   - display tables on two short grey legs along the walls: a terracotta rabbit and a teal figure on the left; a teal
//     vase, a red pot and a glass in the back corner; a bowl of red fruit, a tall yellow candle in a dish, a big green
//     glass bottle, a clay pot and a red box along the back; a teal bottle and a bowl by the door
//   - a great potted plant with red flowers by the back wall, two barrels and a crate of goods at the front
// Twelve years on (ours): Zeelich goods have a table of their own (glazed jars in the Esmers' colours, a little domed
// lamp), the prices are on a board by the door.
//
// CONTRACT
//   BAZOO_AT                   where the room stands (regions.js)
//   buildBazooRoom(scene, physics) → { bazoo }   (regions.js group 'bazoo')
//   bazooDoors(W) / bazooExit(to, W)   the 'museum' building's door leads in; 'bazoo-out' leads back out before it
//   R.npcSpots.bazoo            behind the counter (the story layer may put Mr Bazoo there)
//   BAZOO_PLAN                  the layout in the room's frame (the builder's own numbers): roomlife.js places the
//                               room's people from it, so a change of the layout carries them along
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { MAT, M, TEX, rbox, plane, cyl, sphere, lathe, jar, plate, noticeBoard, pottedPlant, barrel, wallShelf, hangingLamp, rug, ledger, deskBell, papers, wallClock, crate } from './props.js';
import { goodsShelf, shelfGoods, sackPile, sack, boxStack, basket, hanging } from './roomdress.js';

export const BAZOO_AT = { x: 6700, z: 0 };
// (the user 2.11, "make them bigger": the floor 1.5 times the first cut; the goods and the tables their own size.
//  ROOMS-FULL, the user 3.11, "the shop feels empty … maybe shrink a little and add detail": 1.25 times, and stocked)
export const BAZOO_PLAN = (() => {
  const F = 1.25, W = 8.4 * F, D = 6.0 * F, LX = -W / 2, BZ = -D / 2, CX = 0.2 * F, CZ = 0.5 * F, CW = 3.6, CD = 1.5;
  return { F, W, D, LX, BZ, DOORZ: 1.8 * F, CX, CZ, CW, CD,
    till: { x: CX, z: CZ - 0.25, a: 0 },          // (Mr Bazoo's spot inside the counter's U, at the till)
    front: CZ + CD / 2 - 0.25 + 0.27,             // (the counter's front face, toward the door's side of the room)
    // the display tables along the walls: [x, z, the way it is turned, its width]
    tables: { rabbit: [LX + 0.45, -0.6 * F, Math.PI / 2, 1.6], corner: [-2.6 * F, BZ + 0.45, 0, 1.5], fruit: [0.2 * F, BZ + 0.45, 0, 1.6],
      bottle: [2.6 * F, BZ + 0.45, 0, 1.6], bowl: [W / 2 - 0.5, 0.0, -Math.PI / 2, 1.4], zeelich: [W / 2 - 0.5, -2.0 * F, -Math.PI / 2, 1.2] } };
})();

const METAL = () => MAT.paint('#cfcdd6', 0.35), DARK = () => MAT.paint('#7c7a86', 0.4);   // (the original's pale metal)

// a display table: a pale slab with rounded ends on two short grey legs (the original's goods stand on these)
function displayTable(k, w = 1.6) {
  k.add(rbox(w, 0.08, 0.6, 0.04), METAL(), 0, 0.72, 0);
  for (const s of [-1, 1]) k.add(cyl(0.12, 0.14, 0.68, 12), DARK(), s * (w / 2 - 0.3), 0.34, 0);
  return { hw: w / 2, hd: 0.3, top: 0.76 };
}
// a tree of baubles: a cone of small glossy spheres on a stand
function baubleTree(k, color) {
  const m = MAT.flat(color, 0.2, { metalness: 0.3 });
  k.add(cyl(0.03, 0.05, 0.12, 8), DARK(), 0, 0.06, 0);
  for (let r = 0; r < 5; r++) {
    const n = 7 - r, rad = 0.18 - r * 0.035, y = 0.14 + r * 0.09;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r; k.add(sphere(0.045, 8, 6), m, Math.sin(a) * rad, y, Math.cos(a) * rad); }
  }
  k.add(sphere(0.05, 8, 6), m, 0, 0.6, 0);
}
// the till: a teal box with a slanted keyboard and a little drawer
function till(k) {
  const t = MAT.paint('#2f8a8a', 0.4);
  k.add(rbox(0.42, 0.22, 0.32, 0.03), t, 0, 0.11, 0);
  k.add(rbox(0.38, 0.06, 0.2, 0.02), t, 0, 0.26, -0.04, 0, { rx: -0.5 });
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) k.add(rbox(0.05, 0.02, 0.04, 0.005), MAT.paint('#e8e4d8', 0.5), -0.12 + j * 0.08, 0.3 + i * 0.012, -0.08 + i * 0.05, 0, { rx: -0.5 });
  k.add(rbox(0.2, 0.1, 0.02, 0.01), MAT.glow('#d8f0e8', '#80c0b0', 0.6), 0, 0.36, -0.14);
}
// a seated rabbit in terracotta, and a little teal figure (the original's two statuettes)
function rabbit(k) {
  const m = MAT.flat('#c8784a', 0.6);
  k.add(sphere(0.12, 12, 10), m, 0, 0.12, 0, 0, { sy: 1.1 });
  k.add(sphere(0.08, 12, 10), m, 0, 0.3, 0.03);
  for (const s of [-1, 1]) k.add(cyl(0.02, 0.025, 0.16, 8), m, s * 0.035, 0.44, 0.02, 0, { rz: s * 0.12 });
}
function figure(k) {
  const m = MAT.flat('#3f9a9a', 0.35, { metalness: 0.2 });
  k.add(sphere(0.11, 12, 10), m, 0, 0.12, 0, 0, { sy: 1.2 });
  k.add(sphere(0.08, 12, 10), m, 0, 0.3, 0);
  for (const s of [-1, 1]) k.add(sphere(0.05, 8, 6), m, s * 0.09, 0.34, 0, 0, { sx: 0.5 });
}

export function buildBazooRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'bazoo', BAZOO_AT.x, BAZOO_AT.z);
  const R = B.room, k = B.k;
  // (the user 2.11, "make them bigger": the floor 1.5 times the first cut, the camera following Twinsen; the goods and
  //  the tables keep their size)
  const P = BAZOO_PLAN, { F, W, D } = P, H = 3.8;
  R.view = 10; R.follow = 0.6; R.music = 'home';
  // (the same pale grey blocks as the tavern: Citadel's stone inside, lit a little from within)
  const stone = M('tv_stone', () => { const t = TEX.stone('grey'), m = new THREE.MeshStandardMaterial({ map: t, color: '#e6e4ea', roughness: 0.9, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.32 }); m.userData.tile = 2; return m; });
  const rough = MAT.rubble('grey'), cap = MAT.stone('grey', 1.4);
  const { LX, BZ, DOORZ } = P;
  B.shell({ floor: MAT.tiles('#a7a5a0', '#9a9893', '#3c3c40', false, 5), slab: rough, body: stone, low: stone, rail: MAT.iron(), cap, H, t: 0.5, dado: 1.0, rimH: 0.45, rimMat: rough, W, D,
    left: [{ at: DOORZ, w: 1.4, h: 2.4, y0: 0, kind: 'door' }] });
  R.exits.push({ x: B.cx + LX + 0.45, z: B.cz + DOORZ, r: 0.75, to: 'bazoo-out' });
  R.spawn = { x: B.cx + LX + 1.4, z: B.cz + DOORZ, a: Math.PI / 2 };

  // --- the counter in the middle: a rounded U of pale metal, the till on it, a bauble tree at each end
  const { CX, CZ, CW, CD } = P;
  k.add(rbox(CW, 0.95, 0.5, 0.2), METAL(), CX, 0.475, CZ + CD / 2 - 0.25);
  for (const s of [-1, 1]) k.add(rbox(0.5, 0.95, CD, 0.2), METAL(), CX + s * (CW / 2 - 0.25), 0.475, CZ);
  k.add(rbox(CW + 0.08, 0.05, 0.56, 0.02), DARK(), CX, 0.97, CZ + CD / 2 - 0.25);
  for (const s of [-1, 1]) k.add(rbox(0.56, 0.05, CD + 0.06, 0.02), DARK(), CX + s * (CW / 2 - 0.25), 0.97, CZ);
  B.col(CX, CZ + CD / 2 - 0.25, CW / 2, 0.27, 1.0, { noStand: true });
  for (const s of [-1, 1]) B.col(CX + s * (CW / 2 - 0.25), CZ, 0.27, CD / 2, 1.0, { noStand: true });
  k.at(CX, 0.995, CZ + CD / 2 - 0.25, 0, () => till(k));
  k.at(CX - CW / 2 + 0.25, 0.995, CZ - 0.2, 0, () => baubleTree(k, '#c83a3a'));
  k.at(CX + CW / 2 - 0.25, 0.995, CZ - 0.2, 0, () => baubleTree(k, '#2f8a9a'));
  R.npcSpots = { bazoo: { x: B.cx + P.till.x, z: B.cz + P.till.z, a: P.till.a } };

  // --- display tables along the walls, each with its goods
  const T = P.tables, tables = [
    // the left wall: the terracotta rabbit and the teal figure
    [...T.rabbit, (kk) => { kk.at(-0.4, 0.76, 0, 0, () => rabbit(kk)); kk.at(0.35, 0.76, 0, 0, () => figure(kk)); }],
    // the back corner: a teal vase, a red pot, a glass
    [...T.corner, (kk) => { jar(kk, -0.45, 0.76, 0, 'vase', '#3f9a9a', 1.3); jar(kk, 0.1, 0.76, 0, 'urn', '#b83a2a', 0.9); jar(kk, 0.5, 0.76, 0.05, 'bottle', '#d8e8ec', 0.8); }],
    // the back wall: red fruit in a bowl, a tall candle in its dish
    [...T.fruit, (kk) => { plate(kk, -0.35, 0.77, 0, 0, '#8a8a94', 0.18, false); for (let i = 0; i < 5; i++) kk.add(sphere(0.06, 8, 6), MAT.flat('#c8302a', 0.35), -0.35 + Math.sin(i * 1.3) * 0.09, 0.84, Math.cos(i * 1.3) * 0.08); plate(kk, 0.35, 0.77, 0, 0, '#3a3a40', 0.12, false); kk.add(cyl(0.05, 0.05, 0.36, 10), MAT.flat('#e8d870', 0.6), 0.35, 0.96, 0); kk.add(sphere(0.03, 6, 6), MAT.glow('#fff0b0', '#ffc040', 1.4), 0.35, 1.16, 0); }],
    // the back wall: the big green bottle, a clay pot, a red box
    [...T.bottle, (kk) => { jar(kk, -0.45, 0.76, 0, 'urn', '#3f8a6a', 1.5); jar(kk, 0.1, 0.76, 0, 'urn', '#a8683a', 0.95); kk.add(rbox(0.3, 0.16, 0.2, 0.02), MAT.paint('#a8302a', 0.5), 0.5, 0.84, 0); }],
    // by the door's side of the room: a teal bottle and a bowl
    [...T.bowl, (kk) => { jar(kk, -0.3, 0.76, 0, 'bottle', '#2f8a9a', 1.3); plate(kk, 0.3, 0.77, 0, 0, '#c8a070', 0.16, false); }],
    // twelve years on: Zeelich goods, glazed jars in the Esmers' colours and a little domed lamp
    [...T.zeelich, (kk) => { jar(kk, -0.35, 0.76, 0, 'jar', '#2f8a9a', 1.2); jar(kk, 0.0, 0.76, 0.05, 'jar', '#c84a7a', 1.1); kk.add(cyl(0.08, 0.1, 0.12, 10), MAT.brass(), 0.35, 0.82, 0); kk.add(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.glow('#ffe8c8', '#e8a060', 0.8), 0.35, 0.88, 0); }],
  ];
  for (const [x, z, ry, w, goods] of tables) { B.put(x, z, ry, (kk) => displayTable(kk, w)); k.at(x, 0, z, ry, () => goods(k)); }
  // the great plant by the back wall, between the tables
  const PX = -1.25 * F;
  k.at(PX, 0, BZ + 0.5, 0, () => pottedPlant(k, { kind: 'leafy', s: 1.5, potColor: '#5e5c66' }));
  for (let i = 0; i < 5; i++) k.add(sphere(0.06, 8, 6), MAT.flat('#c8302a', 0.4), PX + Math.sin(i * 1.9) * 0.3, 1.05 + (i % 2) * 0.12, BZ + 0.5 + Math.cos(i * 1.9) * 0.25);
  B.ccol(PX, BZ + 0.5, 0.45, 1.2);
  // the front: two barrels and a crate of goods
  for (const x of [0.4 * F, 2.4 * F]) B.put(x, 2.3 * F, 0, (kk) => barrel(kk, { r: 0.3, h: 0.7, pal: 'grey' }));
  B.put(1.4 * F, 2.4 * F, 0.1, (kk) => { kk.add(rbox(0.9, 0.42, 0.6, 0.03), MAT.wood('honey'), 0, 0.21, 0); for (const sx of [-0.2, 0.2]) kk.add(rbox(0.36, 0.06, 0.5, 0.01), MAT.paint('#2a6a8a', 0.6), sx, 0.45, 0); return { hw: 0.45, hd: 0.3, top: 0.48 }; });
  // the prices on a board by the door
  k.at(LX + 0.03, 1.5, DOORZ - 1.3, Math.PI / 2, () => noticeBoard(k, 0.7, 0.5, 11));

  // --- ROOMS-FULL: a shop that is stocked. Shelves of goods over the back tables and in two corners, sacks and
  // parcels waiting by the walls, his ledger and bell on the counter, lamps over it, a rug where customers stand,
  // a striped cloth on the wall (all props: no new lights; the walkways and the door stay clear)
  for (const t of [T.corner, T.fruit, T.bottle]) for (const y of [1.55, 2.15]) k.at(t[0], y, BZ + 0.16, 0, () => { wallShelf(k, { w: t[3] - 0.1, pal: 'dark' }); shelfGoods(k, t[3] - 0.3, 0.022, Math.round(t[0] * 7 + y * 3), 0); });
  B.put(LX + 0.2, -2.6, Math.PI / 2, (kk) => goodsShelf(kk, { w: 1.3, h: 2.0, pal: 'dark', seed: 3 }));
  B.put(W / 2 - 0.45, 1.5, 0.15, (kk) => { const f = crate(kk, 0.62, { pal: 'pale' }); kk.at(0, 0.62, 0, 0, () => basket(kk, { r: 0.2, fill: '#e8b84a' })); return f; });
  B.put(W / 2 - 0.65, D / 2 - 0.55, 0.3, (kk) => sackPile(kk, { seed: 2 }));
  B.put(W / 2 - 0.55, BZ + 0.38, 0, (kk) => sack(kk, { s: 1.0, c: '#c8b48a' }));
  B.put(-1.0, D / 2 - 0.45, 0.15, (kk) => boxStack(kk, { n: 3, seed: 4, w: 0.6 }));
  k.at(1.4 * F, 0.48, 2.4 * F, 0.1, () => basket(k, { r: 0.18, fill: '#e8a030' }));
  // the counter: his ledger open by the till, the bell, a few receipts, a basket of red fruit on its arm
  const FZ = CZ + CD / 2 - 0.25;
  ledger(k, CX + 0.85, 0.995, FZ, 0.1);
  deskBell(k, CX - 0.5, 0.995, FZ + 0.12);
  papers(k, CX + 1.35, 0.995, FZ - 0.02, 3, 5);
  k.at(CX - CW / 2 + 0.25, 0.995, CZ + 0.5, 0, () => basket(k, { r: 0.15, fill: '#c8302a' }));
  for (const dx of [-0.9, 0.9]) k.at(CX + dx, 0, CZ + 0.4, 0, () => hangingLamp(k, 2.7, H, { shade: '#2f6f74' }));
  // where customers stand before the counter: a rug; the striped cloth on the back wall over the plant, a clock
  k.at(CX - 1.15, 0.01, P.front + 0.95, 0, () => rug(k, 2.0, 1.1, ['#b0302c', '#e8dcc0', '#2f6f74', '#7a2a22', '#f2ead6'], 7));
  k.at(PX, 2.55, BZ + 0.02, 0, () => hanging(k, { w: 1.0, h: 1.1, bands: ['#2f6f74', '#e8dcc0', '#b0302c', '#e8dcc0', '#2f6f74'] }));
  k.at(LX + 0.04, 2.55, T.rabbit[1], Math.PI / 2, () => wallClock(k, 0.22));

  B.light('#ffe8c8', 5.5, 13, -1.0 * F, 3.6, 0.0); B.light('#ffe8c8', 5, 12, 2.6 * F, 3.6, -0.5 * F); B.light('#fff0d8', 3, 9, 3.4 * F, 2.8, 2.0 * F);
  return { bazoo: B.finish() };
}

// the 'museum' building's door leads in; coming out, Twinsen stands 1.2 m before it, facing away
export function bazooDoors(W) {
  const h = W?.houses?.find((x) => x.id === 'museum');
  return h?.door ? [{ house: 'museum', x: h.door.x, z: h.door.z, r: 0.9, room: 'bazoo' }] : [];
}
export function bazooExit(to, W) {
  if (to !== 'bazoo-out') return null;
  const h = W?.houses?.find((x) => x.id === 'museum'); if (!h?.door) return null;
  return { x: h.door.x + Math.sin(h.ry) * 1.2, z: h.door.z + Math.cos(h.ry) * 1.2, a: h.ry };
}
