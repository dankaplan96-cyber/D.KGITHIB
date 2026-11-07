// ZEELICH-DOORS (the user, 7.11.2026, chapter 3: "Zeelich is unfinished: missing doors, empty lifeless spaces"): the
// street's houses that said "Locked." over doors that led nowhere get their insides. Four compact Esmer rooms, each
// lived in by someone the street already talks about (src/game/story/zeelife.js gives them their people and lines):
//   zh_pelleck  Mr Pelleck's house (the house with the minaret, west end, north side; its dome under scaffold). He keeps
//               the depot's books: ledgers, a desk of forms (Form 7-B, twice), a polished heat radiator whose pipe ends
//               in the wall (CONNECTION NEXT QUARTER), crates of blue tiles for the dome; the bed in the corner.
//   zh_nara     Nara's flower house (north side, by the council house): benches of cloud flowers under a glazed frame,
//               a potting table, the order slate for Xil at Citadel's harbour. While the project grounds the shuttles
//               (chapter 3) the crates for Citadel are stacked to the beams, tagged HELD; from chapter 4 most have gone.
//               Lissa, Nara's niece, waters them.
//   zh_oku      Oku the miller's house (south-west, the dark heat post): no project heat at this end of the street, so
//               a charcoal stove; a hand quern and flour sacks, a sail being mended on a frame, a spare cog, the family
//               table and the bunks. Wenna, Oku's wife, mends the sail.
//   zh_bakery   Mother Snuff's bakehouse, inside the old watch house: the brick oven on the project's heat feed (cold,
//               or glowing once the flue draws: The Second Bake), bread racks (empty, then full), the kneading table,
//               the guards' old window as the hatch to the street, Tavo's baskets.
// Esmer interiors after LBA2's Zeelich houses: pale stucco over a blue dado, a band of glass blocks under the ceiling,
// rounded arches, glazed tile floors. Our own geometry (numbers and descriptions only; nothing copied).
//
// CONTRACT (world coordinates)
//   ZHOMES [id]; ZHOME_AT {id: {x, z}}; buildZHome(id)(scene, physics) → { [id]: R }  (regions.js: a group each)
//   ZH[id] (filled when built): npcSpots {…}, looks [{x, z, r, key}] (read spots: story/zeelife.js), and per room:
//     zh_nara.setHeld(b) (the HELD crates stacked or mostly gone), zh_bakery.setOven(hot) (the oven's glow, the loaves)
//   zhomeDoors(Z) / zhomeExit(to, Z): each house's door on the street leads in (region 'zeelich', from chapter 3 on:
//     story/zeelife.js decides when); '<id>-out' back out 1.2 m before the door, facing the street. PROMPT_DOORS open
//     by a prompt (r 0, prompt: true): the bakehouse's
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { MAT, M, TEX, rbox, plane, cyl, sphere, lathe, canvasTex, table, chair, bed, bookcase, desk, deskLamp, officeChair, ledger, papers,
  filingCabinet, kettle, pot, jar, crate, barrel, pottedPlant, rug, hangingLamp, wallShelf, frame, counter, chest, bookStack, plate } from './props.js';
import { sack, sackPile, basket, hanging, shelfGoods, goodsShelf, boxStack } from './roomdress.js';

export const ZHOMES = ['zh_pelleck', 'zh_nara', 'zh_oku', 'zh_bakery'];
export const ZHOME_AT = { zh_pelleck: { x: 9800, z: -600 }, zh_nara: { x: 9900, z: -600 }, zh_oku: { x: 10000, z: -600 }, zh_bakery: { x: 10100, z: -600 } };
// which street door leads where: a house of zeelich.js HOUSES (its index) or the watch house (zeelife.js)
const DOOR_OF = { zh_pelleck: { house: 0 }, zh_nara: { house: 2 }, zh_oku: { house: 3 }, zh_bakery: { watch: true } };
export const ZH = {};

// ---- the Esmer look
const blocksTex = () => canvasTex(512, 64, (x, W, H) => {
  x.fillStyle = '#2a5a70'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) {
    const g = x.createLinearGradient(0, j * 32, 0, j * 32 + 30); g.addColorStop(0, '#bfeaf2'); g.addColorStop(1, '#5fb0c8');
    x.fillStyle = g; x.fillRect(i * 32 + 2, j * 32 + 2, 28, 28);
    x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(i * 32 + 5, j * 32 + 5, 8, 3);
  }
});
const slateTex = (lines) => canvasTex(256, 160, (x, W, H) => {
  x.fillStyle = '#2a2e30'; x.fillRect(0, 0, W, H); x.strokeStyle = '#8a6a44'; x.lineWidth = 10; x.strokeRect(5, 5, W - 10, H - 10);
  x.fillStyle = '#ecece4'; x.font = 'bold 26px sans-serif'; x.textAlign = 'center';
  lines.forEach((l, i) => x.fillText(l, W / 2, 46 + i * 36));
});
const tagTex = (word, bg = '#e8d8a8', ink = '#9a2a20') => canvasTex(128, 48, (x, W, H) => {
  x.fillStyle = bg; x.fillRect(0, 0, W, H); x.fillStyle = ink; x.font = 'bold 26px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(word, W / 2, H / 2 + 1);
});
const glassBand = () => M('zh_blocks', () => { const t = blocksTex(); t.wrapS = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.35, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.45 }); });

// the shell every house shares: W × D × H, the door in the left wall at doorZ (from the street); the band of glass
// blocks under the ceiling on the two far walls, rounded pilasters, a lamp; returns the builder's frame numbers
// (ISLE-HOMES, ihomes.js: the same shell for the islands' and Kesh's houses: `at` its centre, `reg` its registry of
//  looks and spots, `band` false for no glass blocks, `music`, `body`/`floorMat` other materials, `frame` the door's colour)
export function esmerRoom(id, { W, D, H = 3.3, wall = '#eadcd2', dado = '#2f7a84', floor = ['#d8c8b4', '#c4ae96', '#3a6a7a'], doorZ = 1.4, windows = [], view = 10.0, light = '#ffe8cc', at: at0 = null, reg = ZH, band: withBand = true, music = 'zeelich_in', body = null, floorMat = null, frame: doorFrame = '#2f7a84', capCol = '#e4d6cc' }, scene, physics) {
  const at = at0 || ZHOME_AT[id], B = new RoomBuilder(scene, physics, id, at.x, at.z), R = B.room, k = B.k;
  R.view = view; R.follow = 0.7; R.music = music;
  const LX = -W / 2, BZ = -D / 2;
  const cap = MAT.paint(capCol, 0.6);
  B.shell({ W, D, H, t: 0.4, floor: floorMat || MAT.tiles(floor[0], floor[1], floor[2], false, 5), slab: MAT.rubble('grey'), rimMat: cap,
    body: body || MAT.plaster(wall), low: MAT.paint(dado, 0.55), dado: 0.95, rail: MAT.brass(), cap, beam: MAT.wood('dark'),
    posts: body || MAT.plaster(wall), postsAt: (L) => [0.3, L - 0.3],
    left: [{ at: doorZ, w: 1.25, h: 2.35, y0: 0, kind: 'door', frame: MAT.paint(doorFrame, 0.5) }, ...windows.map((z) => ({ kind: 'window', at: z, w: 0.9, h: 1.2, y0: 1.1, curtain: '#f2e2c8' }))] });
  R.exits.push({ x: B.cx + LX + 0.45, z: B.cz + doorZ, r: 0.75, to: id + '-out' });
  R.spawn = { x: B.cx + LX + 1.4, z: B.cz + doorZ, a: Math.PI / 2 };
  // the glass-block band under the ceiling, as on LBA2's Esmer walls (back and left)
  if (withBand) {
    const band = glassBand();
    k.add(plane(W - 0.6, 0.42), band, 0, H - 0.5, BZ + 0.02);
    k.add(plane(D - 0.6, 0.42), band, LX + 0.02, H - 0.5, 0, Math.PI / 2);
    // rounded pilasters in the far corner and along the back
    for (const x of [LX + 0.18, 0, W / 2 - 0.3]) k.add(cyl(0.16, 0.2, H - 0.2, 12), MAT.plaster(wall), x, (H - 0.2) / 2, BZ + 0.12);
  }
  B.light(light, 4.2, 12, 0, H - 0.6, 0.3);
  reg[id] = { looks: [], npcSpots: {} };
  return { B, R, k, LX, BZ, W, D, H, reg, X: (x) => B.cx + x, Z: (z) => B.cz + z };
}
const look = (o, x, z, key, r = 1.1) => o.reg[o.R.id].looks.push({ x: o.X(x), z: o.Z(z), r, key });

// ---------------------------------------------------------------- Mr Pelleck's house
function pelleck(scene, physics) {
  const o = esmerRoom('zh_pelleck', { W: 7.4, D: 6.4, doorZ: 1.6, windows: [-1.4], wall: '#e6dad0' }, scene, physics);
  const { B, k, LX, BZ, W, D, H } = o;
  // the back wall: ledgers floor to ceiling, the desk of forms, the filing cabinet
  k.at(-1.6, 0, BZ + 0.22, 0, () => bookcase(k, { w: 1.6, h: 2.3, d: 0.34, pal: 'dark', seed: 31, shelves: 5 }));
  B.col(-1.6, BZ + 0.22, 0.8, 0.18, 2.3, { noStand: true });
  B.put(0.7, BZ + 0.55, 0, (kk) => desk(kk, { w: 1.5, d: 0.72, pal: 'dark', leather: '#2f5a6a' }));
  k.at(0.3, 0.78, BZ + 0.45, 0, () => deskLamp(k, { shade: '#2f7a84' }));
  ledger(k, 0.95, 0.78, BZ + 0.5, 0.2, '#2a4a6a');
  papers(k, 1.25, 0.78, BZ + 0.6, 4, 7, 'form');
  B.put(0.7, BZ + 1.3, Math.PI, (kk) => officeChair(kk, { color: '#2f5a6a' }));
  B.put(2.0, BZ + 0.35, 0, (kk) => filingCabinet(kk, { w: 0.5, d: 0.6, h: 1.3, n: 4, color: '#6a8a8a' }));
  k.at(2.0, 1.32, BZ + 0.35, 0, () => papers(k, 0, 0, 0, 3, 3, 'form'));
  k.at(0.7, 1.75, BZ + 0.04, 0, () => frame(k, 0.6, 0.45, canvasTex(128, 96, (x, w, h) => { x.fillStyle = '#f2ead6'; x.fillRect(0, 0, w, h); x.fillStyle = '#2a3a5a'; x.font = 'bold 16px serif'; x.textAlign = 'center'; x.fillText('JOINT PROJECT', w / 2, 34); x.fillText('BOOKKEEPER', w / 2, 56); x.fillText('Z. PELLECK', w / 2, 80); }), { mat: MAT.brass() }));
  // the right: the heat radiator, fitted and polished, its pipe ending in the wall; the tag
  const RX = W / 2 - 0.25, RZ = -0.6;
  k.add(rbox(0.12, 0.6, 1.3, 0.03), MAT.copper(), RX, 0.45, RZ);
  for (let i = 0; i < 6; i++) k.add(rbox(0.14, 0.55, 0.05, 0.01), MAT.copper(), RX, 0.45, RZ - 0.55 + i * 0.22);
  k.add(cyl(0.035, 0.035, 0.5, 8), MAT.copper(), RX + 0.02, 0.1, RZ + 0.75, 0, { rx: Math.PI / 2 });
  k.add(plane(0.26, 0.1), MAT.map(tagTex('NEXT QTR'), 0.8, { side: THREE.DoubleSide }), RX - 0.08, 0.86, RZ + 0.2, -Math.PI / 2);
  B.col(RX, RZ, 0.1, 0.68, 0.8, { noStand: true });
  look(o, RX - 0.8, RZ, 'zh_pel_radiator');
  // an armchair with a blanket by it (no heat yet), a rug
  B.put(RX - 1.0, RZ + 1.5, -Math.PI / 2 - 0.3, (kk) => { const r = { hw: 0.42, hd: 0.42, top: 0.95 }; kk.add(rbox(0.8, 0.42, 0.8, 0.08), MAT.cloth('#5a3a6a', '#7a5a8a'), 0, 0.21, 0); kk.add(rbox(0.8, 0.6, 0.18, 0.06), MAT.cloth('#5a3a6a', '#7a5a8a'), 0, 0.7, -0.31); kk.add(rbox(0.7, 0.05, 0.6, 0.02), MAT.cloth('#c8a050', '#e8d8a0'), 0, 0.46, 0.04); return r; });
  k.at(0.2, 0, 0.4, 0, () => rug(k, 2.4, 1.7, ['#2f6f78', '#e8dcc0', '#7a3a6a', '#1f4a50', '#f2ead6'], 9));
  // the middle: the table with the tile samples, violet (none left) and blue (ordered)
  B.put(0.0, 0.6, 0, (kk) => table(kk, { w: 1.3, d: 0.85, pal: 'honey' }));
  for (let i = 0; i < 6; i++) k.add(rbox(0.24, 0.02, 0.24, 0.004), MAT.paint(i < 2 ? '#7a4aa8' : '#3a7ac8', 0.35), -0.4 + i * 0.16, 0.79, 0.55 + (i % 2) * 0.12);
  k.add(rbox(0.24, 0.02, 0.24, 0.004), MAT.paint('#7a4aa8', 0.35), 0.45, 0.79, 0.85, 0, { rz: 0.0 });
  look(o, 0.0, 1.5, 'zh_pel_tiles');
  look(o, 0.7, BZ + 1.6, 'zh_pel_forms');
  // crates of blue tiles for the dome by the door, the bed and chest in the near corner
  for (const [x, z, s] of [[LX + 0.6, 3.0 - 0.1, 0.7], [LX + 1.35, 3.0 - 0.1, 0.6], [LX + 0.62, 2.95 - 0.1, 0.55]]) B.put(x, z - 0.3, 0.1, (kk) => crate(kk, s, { pal: 'pale' }), { y: x === LX + 0.62 && s === 0.55 ? 0.7 : 0, noCol: s === 0.55 });
  k.add(plane(0.36, 0.14), MAT.map(tagTex('BLUE', '#d8e8f0', '#2a4a8a'), 0.8), LX + 0.6, 0.45, 2.6 + 0.06 - 0.1 + 0.35 - 0.3 + 0.01);
  B.put(W / 2 - 1.1, D / 2 - 1.25, Math.PI / 2, (kk) => bed(kk, { w: 1.2, l: 2.0, pal: 'dark', quilt: ['#3a7ac8', '#e8dcc0', '#7a4aa8', '#e8dcc0', '#3a7ac8'] }));
  B.put(W / 2 - 2.6, D / 2 - 0.5, 0, (kk) => chest(kk, { w: 0.8, d: 0.45, h: 0.45, pal: 'dark' }));
  k.at(0, 0, 0.6, 0, () => hangingLamp(k, 2.4, H, { shade: '#2f7a84' }));
  B.put(LX + 0.45, BZ + 0.45, 0, (kk) => pottedPlant(kk, { kind: 'spiky', s: 1.0, potColor: '#3a7a8a' }));
  B.light('#ffd8a0', 2.4, 6, 0.6, 1.4, BZ + 0.9);
  return { zh_pelleck: B.finish() };
}

// ---------------------------------------------------------------- Nara's flower house
function cloudFlower(k, s = 1, c = '#f4a0c8') {
  k.add(cyl(0.11 * s, 0.09 * s, 0.18 * s, 10), MAT.paint('#b8623a', 0.7), 0, 0.09 * s, 0);
  for (let i = 0; i < 3; i++) { const a = i * 2.1; k.add(cyl(0.008, 0.01, 0.34 * s, 4), MAT.flat('#4a8a4a', 0.8), Math.sin(a) * 0.04, 0.32 * s, Math.cos(a) * 0.04, 0, { rz: Math.sin(a) * 0.25 }); k.add(sphere(0.075 * s, 8, 6), MAT.flat(i ? c : '#fff0f8', 0.6), Math.sin(a) * 0.08 * s, 0.5 * s, Math.cos(a) * 0.08 * s); }
}
function nara(scene, physics) {
  const o = esmerRoom('zh_nara', { W: 7.2, D: 6.4, doorZ: 1.5, windows: [-1.5], wall: '#ece0e6', dado: '#3a8a7a', floor: ['#d4c8c0', '#c0b2a8', '#3a7a6a'], light: '#fff0e0' }, scene, physics);
  const { B, k, LX, BZ, W, D, H } = o;
  // the glazed frame along the back: three benches of cloud flowers under slanted glass
  for (let b = 0; b < 3; b++) {
    const x = -2.2 + b * 1.7;
    B.put(x, BZ + 0.45, 0, (kk) => {
      kk.add(rbox(1.5, 0.06, 0.7, 0.02), MAT.wood('pale'), 0, 0.72, 0);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) kk.add(rbox(0.06, 0.72, 0.06, 0.01), MAT.wood('pale'), sx * 0.68, 0.36, sz * 0.3);
      for (let i = 0; i < 8; i++) kk.at(-0.55 + (i % 4) * 0.37, 0.75, -0.15 + Math.floor(i / 4) * 0.3, i * 0.7, () => cloudFlower(kk, 0.9 + (i % 3) * 0.08, ['#f4a0c8', '#c8a0f4', '#a0d8f4'][(b + i) % 3]));
      return { hw: 0.75, hd: 0.36, top: 0.8 };
    });
  }
  k.add(rbox(5.4, 0.04, 1.0, 0.01), MAT.glass('#d8f4f8', 0.3), -0.5, 2.0, BZ + 0.6, 0, { rx: 0.35 });
  for (const x of [-3.2, -0.5, 2.2]) k.add(rbox(0.05, 1.3, 0.05, 0.01), MAT.brass(), x, 1.35, BZ + 1.05);
  // the potting table on the right: soil, empty pots, a watering can; the order slate over it
  B.put(W / 2 - 0.5, -0.2, -Math.PI / 2, (kk) => { kk.add(rbox(1.6, 0.06, 0.7, 0.02), MAT.wood('honey'), 0, 0.82, 0); kk.add(rbox(1.5, 0.78, 0.6, 0.02), MAT.wood('dark'), 0, 0.4, 0); kk.add(rbox(0.6, 0.08, 0.4, 0.04), MAT.rubble('grey'), -0.4, 0.88, 0); for (let i = 0; i < 4; i++) kk.add(cyl(0.09, 0.07, 0.14, 10), MAT.paint('#b8623a', 0.7), 0.25 + (i % 2) * 0.2, 0.92, -0.1 + Math.floor(i / 2) * 0.2); kk.add(cyl(0.11, 0.12, 0.22, 10), MAT.paint('#3a8a7a', 0.4), 0.65, 0.96, 0.15); kk.add(cyl(0.015, 0.015, 0.3, 5), MAT.paint('#3a8a7a', 0.4), 0.8, 1.02, 0.15, 0, { rz: -0.9 }); return { hw: 0.8, hd: 0.36, top: 0.9 }; });
  k.add(plane(0.9, 0.56), MAT.map(slateTex(['XIL - CITADEL', '40 POTS', 'EVERY SHUTTLE']), 0.8), W / 2 - 0.03, 1.7, -0.2, -Math.PI / 2);
  look(o, W / 2 - 1.4, -0.2, 'zh_nara_slate');
  // the crates for Citadel by the door: stacked to the beams while the shuttles are grounded (HELD), most gone after
  const held = new THREE.Group(); o.B.group.add(held);
  const few = new THREE.Group(); o.B.group.add(few);
  const crateM = MAT.wood('pale'), heldTag = MAT.map(tagTex('HELD'), 0.8), cols = [];
  const stack = (grp, list) => { for (const [x, z, y] of list) { const m = new THREE.Mesh(rbox(0.62, 0.5, 0.62, 0.02), crateM); m.position.set(x, y + 0.25, z); m.castShadow = m.receiveShadow = true; grp.add(m); const t = new THREE.Mesh(plane(0.3, 0.11), heldTag); t.position.set(x + 0.32, y + 0.3, z); t.rotation.y = Math.PI / 2; grp.add(t); } };
  const HX = 0.4, HZ = D / 2 - 0.7;
  const heldList = []; for (let i = 0; i < 4; i++) for (let j = 0; j < 4 - (i % 2); j++) heldList.push([HX + (i % 2) * 0.66, HZ - Math.floor(i / 2) * 0.66, j * 0.5]);
  for (let i = 0; i < 3; i++) heldList.push([HX + 1.32, HZ - i * 0.66 + 0.0, 0], [HX + 1.32, HZ - i * 0.66, 0.5]);
  stack(held, heldList);
  stack(few, [[HX, HZ, 0], [HX + 0.66, HZ, 0]]);
  few.traverse((m) => { if (m.isMesh && m.material === heldTag) m.visible = false; });
  cols.push(B.col(HX + 0.66, HZ - 0.33, 1.05, 0.7, 2.0, { noStand: true }));
  const fewCol = B.col(HX + 0.33, HZ, 0.66, 0.33, 0.5, { noStand: true });
  look(o, HX + 0.66, HZ - 1.4, 'zh_nara_crates');
  ZH.zh_nara.setHeld = (b) => { held.visible = !!b; few.visible = !b; for (const c of cols) c.enabled = !!b; fewCol.enabled = !b; };
  ZH.zh_nara.setHeld(true);
  // Nara's own corner, near right (the near left is the way in): a bed, a hanging and a shelf of seed jars on the left wall
  B.put(W / 2 - 0.65, D / 2 - 1.1, 0, (kk) => bed(kk, { w: 1.1, l: 1.9, pal: 'pale', quilt: ['#c8a0f4', '#f2ead6', '#f4a0c8', '#f2ead6', '#3a8a7a'] }));
  k.at(LX + 0.04, 1.6, -0.2, Math.PI / 2, () => hanging(k, { w: 1.0, h: 1.2, bands: ['#3a8a7a', '#f2ead6', '#f4a0c8', '#f2ead6', '#3a8a7a'] }));
  k.at(LX + 0.2, 1.45, -1.9, Math.PI / 2, () => { wallShelf(k, { w: 1.1, pal: 'pale' }); for (let i = 0; i < 6; i++) jar(k, -0.45 + i * 0.18, 0.03, 0, 'jar', ['#c8a050', '#3a8a7a', '#f4a0c8'][i % 3], 0.8); });
  k.at(-0.6, 0, 0.6, 0, () => hangingLamp(k, 2.5, H, { shade: '#3a8a7a' }));
  B.put(-0.6, 0.7, 0, (kk) => table(kk, { w: 1.0, d: 0.8, pal: 'pale', round: true }));
  for (let i = 0; i < 3; i++) k.at(-0.85 + i * 0.25, 0.78, 0.7, i, () => cloudFlower(k, 0.7, '#f4a0c8'));
  ZH.zh_nara.npcSpots.lissa = { x: o.X(-1.4), z: o.Z(BZ + 1.35), a: Math.PI };
  B.light('#fff4f0', 2.6, 7, -0.5, 2.2, BZ + 1.0);
  return { zh_nara: B.finish() };
}

// ---------------------------------------------------------------- Oku the miller's house
function oku(scene, physics) {
  const o = esmerRoom('zh_oku', { W: 7.6, D: 6.6, doorZ: 1.6, windows: [-1.6], wall: '#e8dccc', dado: '#7a5a3a', floor: ['#c8b49a', '#b49e84', '#5a4a3a'], light: '#ffe0b8' }, scene, physics);
  const { B, k, LX, BZ, W, D, H } = o;
  // the charcoal stove on the back wall (no project heat at this end of the street), its pipe, a scuttle
  const SX = 1.6;
  B.put(SX, BZ + 0.45, 0, (kk) => {
    kk.add(rbox(0.9, 0.8, 0.6, 0.05), MAT.iron(), 0, 0.4, 0);
    kk.add(rbox(0.4, 0.3, 0.02, 0.01), MAT.glow('#ffb060', '#ff6a10', 1.6), 0, 0.35, 0.31);
    kk.add(cyl(0.09, 0.09, H - 0.8, 10), MAT.iron(), 0.2, 0.8 + (H - 0.8) / 2, -0.1);
    return { hw: 0.45, hd: 0.3, top: 0.8 };
  });
  kettle(k, SX - 0.2, 0.8, BZ + 0.45);
  B.put(SX + 0.9, BZ + 0.45, 0, (kk) => { kk.add(cyl(0.22, 0.18, 0.4, 10, true), MAT.iron(), 0, 0.2, 0); for (let i = 0; i < 6; i++) kk.add(sphere(0.07, 6, 5), MAT.flat('#1a1a1c', 0.95), Math.sin(i) * 0.1, 0.38, Math.cos(i * 1.7) * 0.1); return { r: 0.22, top: 0.45 }; });
  B.light('#ffb060', 1.8, 4, SX, 0.6, BZ + 0.9);
  look(o, SX, BZ + 1.3, 'zh_oku_stove');
  // the hand quern and the flour, the sail on its mending frame, the spare cog
  B.put(-0.4, BZ + 0.7, 0, (kk) => { kk.add(cyl(0.38, 0.4, 0.22, 16), MAT.stone('sand'), 0, 0.5, 0); kk.add(cyl(0.36, 0.36, 0.14, 16), MAT.stone('sand'), 0, 0.68, 0); kk.add(cyl(0.025, 0.025, 0.3, 6), MAT.wood('dark'), 0.25, 0.85, 0); kk.add(rbox(0.9, 0.4, 0.9, 0.04), MAT.wood('dark'), 0, 0.2, 0); return { hw: 0.45, hd: 0.45, top: 0.8 }; });
  k.at(-1.5, 0, BZ + 0.55, 0.3, () => sackPile(k, { seed: 4 }));
  B.col(-1.5, BZ + 0.55, 0.5, 0.42, 0.62, { noStand: true });
  look(o, -0.4, BZ + 1.6, 'zh_oku_quern');
  // the sail: a big canvas wedge on a slanted frame by the right wall, a needle and thread on the bench by it
  const FX = W / 2 - 0.45;
  k.add(rbox(0.06, 2.4, 2.2, 0.01), MAT.wood('honey'), FX, 1.3, 0.0, 0, { rz: 0.12 });
  k.add(rbox(0.02, 2.1, 1.9, 0.005), MAT.cloth('#f2e6d0', '#c8a090'), FX - 0.06, 1.3, 0.0, 0, { rz: 0.12 });
  k.add(rbox(0.025, 0.5, 0.6, 0.005), MAT.cloth('#e88aa4', '#f2e6d0'), FX - 0.08, 0.9, 0.5, 0, { rz: 0.12 });
  B.col(FX, 0, 0.25, 1.15, 2.4, { noStand: true });
  ZH.zh_oku.npcSpots.wenna = { x: o.X(FX - 1.2), z: o.Z(0.2), a: Math.PI / 2 };
  B.put(FX - 0.95, -1.7, 0, (kk) => { kk.add(rbox(0.8, 0.42, 0.4, 0.03), MAT.wood('honey'), 0, 0.21, 0); for (let i = 0; i < 3; i++) kk.add(cyl(0.05, 0.05, 0.06, 8), MAT.flat(['#e88aa4', '#f2e6d0', '#5a3a2a'][i], 0.8), -0.25 + i * 0.2, 0.45, 0); return { hw: 0.4, hd: 0.2, top: 0.42 }; });
  look(o, FX - 1.3, -0.9, 'zh_oku_sail');
  k.at(0.2, 0.9, BZ + 0.04, 0, () => { const s = new THREE.Shape(); for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, rr = i % 2 ? 0.34 : 0.44; if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } s.closePath(); k.add(new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false }), MAT.wood('dark'), 0, 0.95, 0.02); });
  // the family table with bowls, three stools, the bunks in the near right corner, a mill print on the wall
  B.put(-0.9, 1.0, 0, (kk) => table(kk, { w: 1.4, d: 0.9, pal: 'dark' }));
  for (const [x, z] of [[-1.5, 1.0], [-0.3, 1.0], [-0.9, 1.75]]) B.put(x, z + (z === 1.0 ? 0.0 : 0), 0, (kk) => { kk.add(cyl(0.18, 0.2, 0.44, 10), MAT.wood('honey'), 0, 0.22, 0); return { r: 0.2, top: 0.45 }; });
  for (const s of [-1, 1]) plate(k, -0.9 + s * 0.35, 0.78, 1.0, 0, '#d8c8a0', 0.12, false);
  pot(k, -0.9, 0.78, 0.9, { r: 0.12, h: 0.14 });
  B.put(W / 2 - 0.6, D / 2 - 1.05, 0, (kk) => { const m = MAT.wood('dark'); for (const y of [0.35, 1.35]) { kk.add(rbox(0.95, 0.12, 2.0, 0.02), m, 0, y, 0); kk.add(rbox(0.85, 0.12, 1.9, 0.03), MAT.cloth('#a8582a', '#e8c088'), 0, y + 0.1, 0); } for (const sz of [-1, 1]) kk.add(rbox(0.08, 1.8, 0.08, 0.01), m, 0.45, 0.9, sz * 0.96); return { hw: 0.5, hd: 1.0, top: 1.8 }; });
  k.at(LX + 0.04, 1.7, -0.3, Math.PI / 2, () => frame(k, 0.8, 0.55, canvasTex(160, 110, (x, w, h) => { x.fillStyle = '#e8dcc0'; x.fillRect(0, 0, w, h); x.strokeStyle = '#5a3a2a'; x.lineWidth = 3; x.beginPath(); x.moveTo(80, 100); x.lineTo(70, 40); x.lineTo(90, 40); x.closePath(); x.stroke(); for (let i = 0; i < 8; i++) { const a = i * 0.785; x.beginPath(); x.moveTo(80, 38); x.lineTo(80 + Math.cos(a) * 32, 38 + Math.sin(a) * 32); x.stroke(); } }), { mat: MAT.wood('dark') }));
  k.at(-0.9, 0, 1.0, 0, () => hangingLamp(k, 2.3, H, { shade: '#a8582a' }));
  B.put(LX + 0.45, D / 2 - 0.45, 0, (kk) => barrel(kk, { r: 0.3, h: 0.8, pal: 'dark' }));
  return { zh_oku: B.finish() };
}

// ---------------------------------------------------------------- Mother Snuff's bakehouse (the old watch house)
function bakery(scene, physics) {
  const o = esmerRoom('zh_bakery', { W: 6.4, D: 6.0, H: 3.4, doorZ: 1.4, windows: [], wall: '#dcd0e0', dado: '#6a5a7a', floor: ['#c0b4b8', '#a89ca4', '#5a4a5a'], light: '#ffe4c0' }, scene, physics);
  const { B, k, LX, BZ, W, D, H } = o;
  // the brick oven on the back wall, the copper heat feed running into it, its mouth (dark, or glowing)
  const OX = 0.8;
  const brick = MAT.paint('#b86a4a', 0.85);
  B.put(OX, BZ + 0.85, 0, (kk) => {
    kk.add(rbox(2.0, 0.9, 1.5, 0.05), MAT.stone('sand'), 0, 0.45, 0);
    kk.add(lathe([[0.95, 0], [0.92, 0.35], [0.75, 0.75], [0.45, 1.0], [0.001, 1.08]], 16), brick, 0, 0.9, 0, 0, { sz: 0.75 });
    kk.add(cyl(0.18, 0.2, 1.2, 10), brick, 0.5, 2.3, -0.3);
    return { hw: 1.0, hd: 0.75, top: 1.9 };
  });
  k.add(cyl(0.06, 0.06, 2.4, 8), MAT.copper(), OX - 1.4, 1.2, BZ + 0.1);
  k.add(cyl(0.06, 0.06, 0.6, 8), MAT.copper(), OX - 1.1, 0.4, BZ + 0.1, 0, { rz: Math.PI / 2 });
  const coldM = MAT.flat('#1c1a1c', 0.95), hotM = MAT.glow('#ffc070', '#ff7a20', 2.2);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.34, 18, 0, Math.PI), coldM); mouth.position.set(OX, 0.92, BZ + 0.85 + 0.62); o.B.group.add(mouth);
  const ember = new THREE.PointLight('#ff8a30', 0, 4.5, 2); ember.position.set(OX, 1.0, BZ + 1.9); o.B.group.add(ember);
  look(o, OX, BZ + 2.2, 'zh_bak_oven');
  // the bread racks on the left wall: empty boards, or loaves
  const loaves = new THREE.Group(); o.B.group.add(loaves);
  for (const z of [-1.4, 0.0]) {
    k.at(LX + 0.3, 0, z - 0.5, Math.PI / 2, () => goodsShelf(k, { w: 1.2, h: 1.9, d: 0.4, rows: 4, pal: 'honey', goods: () => {} }));
    B.col(LX + 0.3, z - 0.5, 0.2, 0.6, 1.9, { noStand: true });
    for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(sphere(0.11, 8, 6), MAT.paint('#c8843a', 0.7)); m.scale.set(1.3, 0.7, 0.9); m.position.set(LX + 0.32, 0.2 + r * 0.41, z - 0.95 + i * 0.28); loaves.add(m); }
  }
  look(o, LX + 1.2, -1.0, 'zh_bak_racks');
  // the kneading table in the middle, flour on it; sacks; the hatch to the street on the near right with its counter
  B.put(-0.2, 0.9, 0, (kk) => { kk.add(rbox(1.8, 0.08, 0.9, 0.02), MAT.wood('pale'), 0, 0.84, 0); kk.add(rbox(1.7, 0.8, 0.8, 0.02), MAT.wood('honey'), 0, 0.4, 0); kk.add(rbox(0.6, 0.04, 0.4, 0.02), MAT.flat('#f4f0e8', 0.95), -0.3, 0.89, 0.05); kk.add(cyl(0.04, 0.04, 0.5, 8), MAT.wood('dark'), 0.4, 0.92, 0.1, 0, { rz: Math.PI / 2 }); return { hw: 0.9, hd: 0.45, top: 0.9 }; });
  k.at(W / 2 - 0.7, 0, BZ + 0.55, 0, () => sackPile(k, { seed: 7 }));
  B.col(W / 2 - 0.7, BZ + 0.55, 0.5, 0.42, 0.62, { noStand: true });
  B.put(W / 2 - 0.6, D / 2 - 1.2, -Math.PI / 2, (kk) => counter(kk, { w: 1.4, d: 0.6, h: 1.0, pal: 'honey' }));
  for (let i = 0; i < 3; i++) k.at(W / 2 - 1.2, 0, 0.4 + i * 0.5, 0, () => basket(k, { r: 0.22, fill: '#c8843a' }));
  k.at(0, 0, 0.9, 0, () => hangingLamp(k, 2.5, H, { shade: '#6a5a7a' }));
  k.at(-1.6, 1.9, BZ + 0.04, 0, () => frame(k, 0.5, 0.38, canvasTex(128, 96, (x, w, h) => { x.fillStyle = '#e8dcc8'; x.fillRect(0, 0, w, h); x.fillStyle = '#5a4a5a'; x.font = 'bold 14px serif'; x.textAlign = 'center'; x.fillText('WATCH HOUSE', w / 2, 40); x.fillText('ORDER OF THE', w / 2, 60); x.fillText('ISLAND GUARD', w / 2, 78); }), { mat: MAT.iron() }));
  ZH.zh_bakery.setOven = (hot) => { mouth.material = hot ? hotM : coldM; ember.intensity = hot ? 3.2 : 0; loaves.visible = !!hot; };
  ZH.zh_bakery.setOven(false);
  return { zh_bakery: B.finish() };
}

const BUILD = { zh_pelleck: pelleck, zh_nara: nara, zh_oku: oku, zh_bakery: bakery };
export const buildZHome = (id) => (scene, physics) => BUILD[id](scene, physics);

// ---- the street doors (Zeelich built: R.houseDoors from zeelich.js, the watch house's from zeelife.js)
function streetDoor(id, Z) {
  const d = DOOR_OF[id];
  if (d.watch) { const w = Z?.life?.watch?.door; return w ? { x: w.x, z: w.z, a: 0 } : null; }   // (the watch house faces the street, +z)
  const p = Z?.houseDoors?.[d.house], a = Z?.houseFacing?.[d.house];
  return p ? { x: p.x, z: p.z, a: a ?? 0 } : null;
}
// (the bakehouse's door opens by its prompt, not by walking into it: Mother Snuff stands at her counter 1.2 m from it,
//  and everyone who came to talk to her walked into her kitchen — tests/zeelich-life.mjs, 7.11. Its entry has r 0: the
//  map and the tests still find it; story/zeelife.js offers the prompt)
export const PROMPT_DOORS = new Set(['zh_bakery']);
export function zhomeDoors(Z) {
  const out = [];
  for (const id of ZHOMES) { const d = streetDoor(id, Z); if (d) out.push({ house: id, x: d.x, z: d.z, r: PROMPT_DOORS.has(id) ? 0 : 0.85, room: id, region: 'zeelich', ...(PROMPT_DOORS.has(id) ? { prompt: true } : {}) }); }
  return out;
}
export function zhomeExit(to, Z) {
  const id = ZHOMES.find((h) => to === h + '-out');
  if (!id) return null;
  const d = streetDoor(id, Z); if (!d) return null;
  return { room: 'zeelich', x: d.x + Math.sin(d.a) * 1.2, z: d.z + Math.cos(d.a) * 1.2, a: d.a };
}
