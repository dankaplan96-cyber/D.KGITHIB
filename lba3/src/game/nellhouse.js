// LBA-CITADEL-6 (the user 1.11: "fixes and additions from the first and second games, and logical additions for twelve
// years later"; night mode: "work to the plan"): Paul's house, after LBA2's scene 7, where our 'wing2'
// house stands by the harbour with NELL'S REPAIRS on it. Twelve years on it is Nell's home and workshop: her stall on
// the path outside is the counter (townlife.js), the engines she can't fix there come in here.
// Our own geometry, from a study of the original's layout (numbers and descriptions only; nothing copied):
//   - a room of about 15 × 17 of the original's cells (≈ 7.2 × 8.2 m, ≈ 3.0 m high) in the style of Twinsen's house:
//     teal patterned paper over a wooden dado, a terracotta tiled floor, thick walls capped with dark wood
//   - as the game's camera sees it: on the left wall the bed at the front, a wall lamp, a sideboard with a bowl under a
//     big painting, a window with cream curtains at the back; on the back wall a floor lamp, a teal armchair, a long
//     sideboard with a model sailboat between two candles, a wall lamp; a table with a bowl of flowers and two chairs
//     in the middle
// Twelve years on (ours): Nell's workbench at the front with an Esmer engine open on it, her tools, a crate of spare
// parts; the room's own furniture kept round it.
//
// CONTRACT
//   NELLHOUSE_AT               where the room stands (regions.js)
//   buildNellHouseRoom(scene, physics) → { nellhouse }   (regions.js group 'nellhouse')
//   nellhouseDoors(W) / nellhouseExit(to, W)   the 'wing2' house's door leads in; 'nellhouse-out' leads back out before it
//   R.npcSpots.nell             at her workbench (the story layer may put Nell there)
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { MAT, TEX, rbox, plane, cyl, sphere, lathe, table, chair, armchair, bed, counter, floorLamp, frame, jar, candle } from './props.js';

export const NELLHOUSE_AT = { x: 7800, z: 0 };

// a model sailboat on a stand: a dark hull, a mast, two pale sails
function sailboat(k) {
  k.add(rbox(0.5, 0.1, 0.12, 0.04), MAT.wood('dark'), 0, 0.12, 0);
  k.add(rbox(0.08, 0.06, 0.04, 0.01), MAT.wood('honey'), 0, 0.04, 0);
  k.add(cyl(0.008, 0.01, 0.5, 6), MAT.wood('dark'), 0, 0.42, 0);
  const sail = (w, h, x) => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(w, 0); s.lineTo(0, h); s.closePath(); k.add(new THREE.ShapeGeometry(s), MAT.paint('#f2ead6', 0.8), x, 0.2, 0, 0, {}); };
  sail(0.18, 0.4, 0.01); sail(-0.14, 0.3, -0.01);
}
// a wall lamp: a brass bracket and a warm shade
function wallLamp(k) {
  k.add(cyl(0.02, 0.02, 0.18, 6), MAT.brass(), 0, 0, 0.09, 0, { rx: Math.PI / 2 });
  k.add(lathe([[0.001, 0], [0.09, 0], [0.12, 0.16], [0.001, 0.16]], 12), MAT.glow('#ffe0a8', '#ffb050', 0.9), 0, -0.02, 0.2);
}
// Nell's workbench: a heavy bench, an Esmer engine open on it (a brass drum, a flywheel, pipes), tools
function workbench(k) {
  k.add(rbox(1.8, 0.08, 0.75, 0.02), MAT.wood('dark'), 0, 0.86, 0);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.add(rbox(0.08, 0.84, 0.08, 0.01), MAT.wood('dark'), sx * 0.82, 0.42, sz * 0.3);
  k.add(rbox(1.6, 0.04, 0.6, 0.01), MAT.wood('honey'), 0, 0.25, 0);
  k.add(cyl(0.16, 0.16, 0.42, 14), MAT.brass(), -0.25, 1.06, 0, 0, { rz: Math.PI / 2 });
  k.add(cyl(0.2, 0.2, 0.05, 18), MAT.iron(), 0.06, 1.06, 0, 0, { rz: Math.PI / 2 });
  k.add(cyl(0.035, 0.035, 0.5, 8), MAT.copper(), -0.2, 1.28, 0.1, 0, { rz: Math.PI / 2 });
  for (let i = 0; i < 3; i++) k.add(rbox(0.22, 0.02, 0.04, 0.005), MAT.steel(), 0.5 + i * 0.06, 0.91, -0.15 + i * 0.12, i * 0.5);
  k.add(cyl(0.06, 0.06, 0.04, 10), MAT.paint('#2f8a9a', 0.5), 0.6, 0.92, 0.2);
  return { hw: 0.9, hd: 0.38, top: 1.3 };
}

export function buildNellHouseRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'nellhouse', NELLHOUSE_AT.x, NELLHOUSE_AT.z);
  const R = B.room, k = B.k;
  // (the user 2.11, "make them bigger": the floor 1.5 times the first cut, the camera following Twinsen as in his own
  //  house; the furniture keeps its size)
  const F = 1.5, W = 7.2 * F, D = 8.2 * F, H = 3.4;
  R.view = 10.8; R.follow = 0.7; R.music = 'home';
  const LX = -W / 2, BZ = -D / 2, DOORZ = 3.3 * F;
  // (Twinsen's house's own materials: the teal paper, the terracotta tiles, the dark wood)
  B.shell({ W, D, H, t: 0.4,
    floor: MAT.tiles('#ac866a', '#9a6e52', '#5e4232', false, 4), slab: MAT.rubble('grey'), rimMat: MAT.stone('sand', 1.4),
    body: MAT.paper('#4f6b6b', '#9cc4bc', 'diamond'), low: MAT.wainscot('honey'), dado: 1.05, rail: MAT.wood('dark'), cap: MAT.wood('dark'), beam: MAT.wood('dark'),
    posts: MAT.wood('dark'), postsAt: (L) => [0.48, L - 0.48, L / 2],
    left: [{ at: DOORZ, w: 1.2, h: 2.3, y0: 0, kind: 'door' }, { kind: 'window', at: -2.9 * F, w: 1.0, h: 1.15, y0: 1.05, curtain: '#e8dcc0' }] });
  R.exits.push({ x: B.cx + LX + 0.45, z: B.cz + DOORZ, r: 0.75, to: 'nellhouse-out' });
  R.spawn = { x: B.cx + LX + 1.4, z: B.cz + DOORZ, a: Math.PI / 2 };

  // --- the left wall: the bed at the front, a wall lamp, the sideboard with a bowl under the big painting
  B.put(LX + 1.15, 1.2 * F, Math.PI / 2, (kk) => bed(kk, { w: 1.4, l: 2.0, pal: 'honey', quilt: ['#2f6f78', '#e8dcc0', '#2f6f78', '#e8dcc0', '#3f8a8a'] }));
  k.at(LX + 0.02, 1.95, -0.1 * F, Math.PI / 2, () => wallLamp(k));
  k.at(LX + 0.35, 0, -1.4 * F, Math.PI / 2, () => counter(k, { w: 1.4, d: 0.48, h: 0.85, pal: 'dark' }));
  B.col(LX + 0.35, -1.4 * F, 0.26, 0.7, 0.9, { noStand: true });
  jar(k, LX + 0.35, 0.86, -1.4 * F, 'vase', '#3f8a9a', 0.9);
  k.at(LX + 0.03, 1.95, -1.4 * F, Math.PI / 2, () => frame(k, 1.2, 0.8, TEX.paper('#4a7aa8', '#e8dcc0', 'leaf'), { mat: MAT.brass() }));
  // --- the back wall: the floor lamp, the armchair, the sideboard with the sailboat and two candles, a wall lamp
  B.put(-1.9 * F, BZ + 0.35, 0, (kk) => floorLamp(kk, { shade: '#e8c88a' }));
  B.put(-0.9 * F, BZ + 0.75, 0, (kk) => armchair(kk, { fabric: '#2f6f78', pal: 'honey' }));
  const SBX = 1.9 * F;
  k.at(SBX, 0, BZ + 0.32, 0, () => counter(k, { w: 1.9, d: 0.5, h: 0.85, pal: 'dark' }));
  B.col(SBX, BZ + 0.32, 0.95, 0.27, 0.9, { noStand: true });
  k.at(SBX, 0.86, BZ + 0.32, 0, () => sailboat(k));
  candle(k, SBX - 0.7, 0.86, BZ + 0.3); candle(k, SBX + 0.7, 0.86, BZ + 0.3);
  k.at(3.2 * F, 1.95, BZ + 0.02, 0, () => wallLamp(k));
  // --- the middle: the table with a bowl of flowers and two chairs
  const TX = 0.6 * F, TZ = 0.4 * F;
  B.put(TX, TZ, 0.15, (kk) => table(kk, { w: 1.2, d: 0.85, pal: 'honey' }));
  jar(k, TX, 0.78, TZ, 'urn', '#3f8a9a', 0.7);
  for (let i = 0; i < 6; i++) k.add(sphere(0.045, 8, 6), MAT.flat(['#e8b830', '#e85a3a'][i % 2], 0.5), TX + Math.sin(i) * 0.1, 1.06 + (i % 3) * 0.03, TZ + Math.cos(i) * 0.1);
  B.put(TX - 0.7, TZ + 0.1, Math.PI / 2, (kk) => chair(kk, { pal: 'honey', cushion: '#2f6f78' }));
  B.put(TX + 0.6, TZ - 0.6, -0.6, (kk) => chair(kk, { pal: 'honey', cushion: '#2f6f78' }));
  // --- twelve years on: Nell's workbench at the front with the Esmer engine she is mending, a crate of spare parts
  B.put(2.3 * F, 2.9 * F, 0, (kk) => workbench(kk));
  B.put(3.2 * F, 1.7 * F, 0.2, (kk) => { kk.add(rbox(0.7, 0.45, 0.5, 0.03), MAT.wood('honey'), 0, 0.225, 0); for (let i = 0; i < 4; i++) kk.add(cyl(0.06, 0.06, 0.1, 10), [MAT.brass(), MAT.copper(), MAT.iron(), MAT.brass()][i], -0.2 + i * 0.13, 0.5, 0.05); return { hw: 0.35, hd: 0.25, top: 0.55 }; });
  R.npcSpots = { nell: { x: B.cx + 2.3 * F, z: B.cz + 2.9 * F - 0.85, a: Math.PI } };

  B.light('#ffe2b8', 4.5, 13, -0.5 * F, 2.8, 0.0); B.light('#ffe8c8', 3, 9, 2.3 * F, 2.6, 2.6 * F); B.light('#ffd8a0', 1.8, 5, LX + 0.4, 1.9, -0.1 * F);
  return { nellhouse: B.finish() };
}

// the 'wing2' house's door leads in; coming out, Twinsen stands 1.2 m before it, facing away
export function nellhouseDoors(W) {
  const h = W?.houses?.find((x) => x.id === 'wing2');
  return h?.door ? [{ house: 'wing2', x: h.door.x, z: h.door.z, r: 0.9, room: 'nellhouse' }] : [];
}
export function nellhouseExit(to, W) {
  if (to !== 'nellhouse-out') return null;
  const h = W?.houses?.find((x) => x.id === 'wing2'); if (!h?.door) return null;
  return { x: h.door.x + Math.sin(h.ry) * 1.2, z: h.door.z + Math.cos(h.ry) * 1.2, a: h.ry };
}
