// LBA-CITADEL-5 (the user 1.11: "fixes and additions from the first and second games, and logical additions for twelve
// years later"; night mode: "work to the plan"): the neighbours' house, after LBA2's scene 9. Its door is our 'nbr'
// house's, next to Twinsen's; the house had no inside. Zoé calls there in the prologue (their kettle, their taps:
// prologue.js, text/well.js), so the door leads in only once the prologue is done.
// Our own geometry, from a study of the original's layout (numbers and descriptions only; nothing copied):
//   - a room of about 15 × 17 of the original's cells (≈ 7.2 × 8.2 m, ≈ 3.0 m high) in the style of Twinsen's own
//     house: teal patterned paper above a wooden dado, a terracotta tiled floor, thick walls capped with dark wood
//   - as the game's camera sees it: on the left wall a window with cream curtains, a bookcase of old volumes over a
//     sideboard, a lamp in the corner; on the back wall the double bed under a portrait, a wall lamp, a writing desk
//     with its lamp and chair, a framed picture and a basket of rolled papers
//   - a square table with a candle and two chairs in the middle, a teal armchair on each side
// Twelve years on (ours): a kitchen corner with a stove and the kettle Zoé asks about, a basin with its tap (the island's
// water trouble of chapter 1), one of the project's heat radiators.
//
// CONTRACT
//   NBRHOUSE_AT                where the room stands (regions.js)
//   buildNbrHouseRoom(scene, physics) → { nbrhouse }   (regions.js group 'nbrhouse')
//   nbrhouseDoors(W, flags) / nbrhouseExit(to, W)   the 'nbr' house's door leads in (once flags.prologueDone);
//                              'nbrhouse-out' leads back out before it
//   R.npcSpots.neighbour        by the stove (the story layer may put the neighbours there)
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { MAT, TEX, rbox, plane, cyl, sphere, table, chair, armchair, bed, bookcase, counter, desk, deskLamp, floorLamp, stove, kettle, rug, candle, frame, jar } from './props.js';

export const NBRHOUSE_AT = { x: 7600, z: 0 };

export function buildNbrHouseRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'nbrhouse', NBRHOUSE_AT.x, NBRHOUSE_AT.z);
  const R = B.room, k = B.k;
  // (the user 2.11, "make them bigger": the floor 1.5 times the first cut, the camera following Twinsen as in his own
  //  house; the furniture keeps its size)
  const F = 1.5, W = 7.2 * F, D = 8.2 * F, H = 3.4;
  R.view = 10.8; R.follow = 0.7; R.music = 'home';
  const LX = -W / 2, BZ = -D / 2, DOORZ = 3.0 * F;
  // (Twinsen's house's own materials: the teal paper, the terracotta tiles, the dark wood)
  B.shell({ W, D, H, t: 0.4,
    floor: MAT.tiles('#ac866a', '#9a6e52', '#5e4232', false, 4), slab: MAT.rubble('grey'), rimMat: MAT.stone('sand', 1.4),
    body: MAT.paper('#4f6b6b', '#9cc4bc', 'diamond'), low: MAT.wainscot('honey'), dado: 1.05, rail: MAT.wood('dark'), cap: MAT.wood('dark'), beam: MAT.wood('dark'),
    posts: MAT.wood('dark'), postsAt: (L) => [0.48, L - 0.48, L / 2],
    left: [{ at: DOORZ, w: 1.2, h: 2.3, y0: 0, kind: 'door' }, { kind: 'window', at: 0.3 * F, w: 1.0, h: 1.15, y0: 1.05, curtain: '#e8dcc0' }, { kind: 'window', at: -3.2 * F, w: 1.0, h: 1.15, y0: 1.05, curtain: '#e8dcc0' }] });
  R.exits.push({ x: B.cx + LX + 0.45, z: B.cz + DOORZ, r: 0.75, to: 'nbrhouse-out' });
  R.spawn = { x: B.cx + LX + 1.4, z: B.cz + DOORZ, a: Math.PI / 2 };

  // --- the left wall: the bookcase over a sideboard, the lamp in the corner
  k.at(LX + 0.35, 0, -2.5 * F, Math.PI / 2, () => counter(k, { w: 1.5, d: 0.5, h: 0.85, pal: 'dark' }));
  B.col(LX + 0.35, -2.5 * F, 0.27, 0.75, 0.9, { noStand: true });
  k.at(LX + 0.22, 0.85, -2.5 * F, Math.PI / 2, () => bookcase(k, { w: 1.3, h: 1.0, d: 0.28, pal: 'dark', seed: 9, shelves: 2 }));
  B.put(LX + 0.4, BZ + 0.5, 0, (kk) => floorLamp(kk, { shade: '#e8c88a' }));
  // --- the back wall: the bed under the portrait, the wall lamp, the desk with its lamp and chair, a picture, papers
  B.put(-0.7 * F, BZ + 1.15, 0, (kk) => bed(kk, { w: 1.5, l: 2.1, pal: 'honey', quilt: ['#2f6f78', '#e8dcc0', '#2f6f78', '#e8dcc0', '#3f8a8a'] }));
  k.at(-0.7 * F, 2.0, BZ + 0.05, 0, () => frame(k, 0.7, 0.85, TEX.paper('#d8c8a0', '#6a5a4a', 'leaf'), { mat: MAT.brass() }));
  k.add(sphere(0.12, 12, 8), MAT.glow('#fff0d0', '#ffc070', 1.0), 0.9 * F, 2.3, BZ + 0.15);
  k.add(cyl(0.03, 0.03, 0.2, 6), MAT.brass(), 0.9 * F, 2.3, BZ + 0.08, 0, { rx: Math.PI / 2 });
  B.put(2.4 * F, BZ + 0.5, 0, (kk) => desk(kk, { w: 1.4, d: 0.7, pal: 'honey' }));
  k.at(2.4 * F - 0.4, 0.78, BZ + 0.4, 0, () => deskLamp(k, { shade: '#3f8a8a' }));
  B.put(2.4 * F, BZ + 1.25, Math.PI, (kk) => chair(kk, { pal: 'honey', cushion: '#2f6f78' }));
  k.at(3.15 * F, 1.9, BZ + 0.05, 0, () => frame(k, 0.5, 0.5, TEX.paper('#3f6a9a', '#e8dcc0', 'star'), { mat: MAT.brass() }));
  B.put(3.2 * F, BZ + 1.5, 0, (kk) => { kk.add(cyl(0.2, 0.17, 0.4, 12, true), MAT.wood('honey'), 0, 0.2, 0); for (let i = 0; i < 5; i++) kk.add(cyl(0.035, 0.035, 0.7, 8), MAT.paper('#efe2c0', '#6a4a2a', 'leaf'), Math.sin(i * 1.3) * 0.08, 0.5, Math.cos(i * 1.3) * 0.08, 0, { rz: (i - 2) * 0.08 }); return { r: 0.22, top: 0.85 }; });
  // --- the middle: the table with its candle and two chairs on a rug, an armchair each side
  const TX = 0.1 * F, TZ = 1.3 * F;
  k.at(TX, 0.01, TZ, 0, () => rug(k, 2.4, 1.8, ['#2f6f78', '#e8dcc0', '#c8a050', '#1f4a50', '#f2ead6'], 4));
  B.put(TX, TZ, 0, (kk) => table(kk, { w: 1.1, d: 0.9, pal: 'honey' }));
  candle(k, TX, 0.78, TZ);
  B.put(TX - 0.7, TZ, Math.PI / 2, (kk) => chair(kk, { pal: 'honey', cushion: '#2f6f78' }));
  B.put(TX + 0.7, TZ, -Math.PI / 2, (kk) => chair(kk, { pal: 'honey', cushion: '#2f6f78' }));
  B.put(-2.5 * F, 1.0 * F, Math.PI / 2, (kk) => armchair(kk, { fabric: '#2f6f78', pal: 'honey' }));
  B.put(2.6 * F, 0.2 * F, -Math.PI / 2, (kk) => armchair(kk, { fabric: '#2f6f78', pal: 'honey' }));
  // --- twelve years on: the kitchen corner — the stove with the kettle, the basin and its tap, a heat radiator
  B.put(W / 2 - 0.5, 3.1 * F, -Math.PI / 2, (kk) => { const r = stove(kk); return r || { hw: 0.45, hd: 0.35, top: 0.9 }; });
  kettle(k, W / 2 - 0.5, 0.92, 3.1 * F);
  B.put(W / 2 - 0.45, 3.1 * F - 1.2, -Math.PI / 2, (kk) => {
    kk.add(rbox(0.9, 0.85, 0.55, 0.02), MAT.wood('honey'), 0, 0.425, 0);
    kk.add(rbox(0.7, 0.08, 0.4, 0.04), MAT.paint('#e8e8e4', 0.3), 0, 0.88, 0.02);
    kk.add(cyl(0.02, 0.02, 0.32, 8), MAT.copper(), 0, 1.06, -0.2); kk.add(cyl(0.015, 0.015, 0.16, 8), MAT.copper(), 0, 1.2, -0.13, 0, { rx: Math.PI / 2 });
    return { hw: 0.45, hd: 0.28, top: 0.92 };
  });
  for (let i = 0; i < 3; i++) jar(k, W / 2 - 0.35, 0.92, 3.1 * F - 1.55 + i * 0.12, 'crock', ['#c8a050', '#3f8a8a', '#c8452f'][i], 0.8);
  k.add(rbox(1.4, 0.55, 0.12, 0.03), MAT.copper(), 1.0, 0.42, BZ + 0.1);
  for (let i = 0; i < 6; i++) k.add(rbox(0.05, 0.5, 0.14, 0.01), MAT.copper(), 0.45 + i * 0.22, 0.42, BZ + 0.11);
  R.npcSpots = { neighbour: { x: B.cx + W / 2 - 1.4, z: B.cz + 3.1 * F, a: Math.PI / 2 } };

  B.light('#ffe2b8', 4.5, 13, -0.5 * F, 2.8, 0.5 * F); B.light('#ffd8a0', 2.5, 6, TX, 1.4, TZ); B.light('#ffe8c8', 3, 9, 2.6 * F, 2.6, 2.5 * F);
  return { nbrhouse: B.finish() };
}

// the 'nbr' house's door leads in once the prologue is done (until then Zoé stands at it: prologue.js); coming out,
// Twinsen stands 1.2 m before it, facing away
export function nbrhouseDoors(W, flags) {
  if (!flags?.prologueDone) return [];
  const h = W?.houses?.find((x) => x.id === 'nbr');
  return h?.door ? [{ house: 'nbr', x: h.door.x, z: h.door.z, r: 0.9, room: 'nbrhouse' }] : [];
}
export function nbrhouseExit(to, W) {
  if (to !== 'nbrhouse-out') return null;
  const h = W?.houses?.find((x) => x.id === 'nbr'); if (!h?.door) return null;
  return { x: h.door.x + Math.sin(h.ry) * 1.2, z: h.door.z + Math.cos(h.ry) * 1.2, a: h.ry };
}
