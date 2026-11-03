// LBA-CITADEL-1 (the laptop's proposal, the user 1.11: "fixes and additions from the first and second games, and
// logical additions for twelve years later"; "the stairs and the upper floor where they were too: things change in
// twelve years, but it should look about 80 % alike"): Chez Luc, Citadel's tavern, after LBA2's scene 3. In LBA2 its
// door is on the square's south side, where our 'south' house (the one with the pink awning) stands; the house had no
// inside. Our own geometry, from a study of the original's layout (numbers and descriptions only; nothing copied):
//   - a hall of about 21 × 32 of the original's cells (≈ 10 × 15 m, ≈ 5.8 m high) of pale grey stone blocks, a floor
//     of grey square tiles with a dark border
//   - as the game's camera sees it: the long wall on the left with three small high windows; the gallery (≈ 2.4 m up)
//     along the short back wall, under two windows with red blinds, round tables with red stools on it; a straight
//     stair against the gallery's face climbing toward the left wall, teal iron railings, white globe lamps on the
//     newels; an arched door in the gallery's face down to the cellar (the original's scene 4: tavcellar.js)
//   - the jukebox at the stair's foot, a red sofa against the stair's side, the bar at the front left by the door (a
//     pale counter along the wall turning into the room, a tap barrel and bottles on it, red stools), square tables with
//     red chairs in the front, teal potted plants, a picture high on the long wall
// Twelve years on (ours): the harbour's people drink here now. A ferry timetable board by the stair's foot, glazed
// Esmer jars on the shelf behind the bar, one of the project's heat radiators under the long wall's windows. The
// jukebox stays.
//
// CONTRACT
//   TAVERN_AT                  where the room stands (regions.js)
//   buildTavernRoom(scene, physics) → { tavern }   (regions.js group 'tavern')
//   tavernDoors(W) / tavernExit(to, W)   the 'south' house's door leads in; 'tavern-out' leads back out before it
//   R.npcSpots.luc              behind the bar (the story layer may put Luc there)
//   TAVERN_PLAN                 the layout in the room's frame (the builder's own numbers): roomlife.js places the
//                               room's people from it, so a change of the layout carries them along
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { MAT, M, TEX, rbox, plane, cyl, sphere, lathe, table, chair, jar, plate, counter, noticeBoard, pottedPlant, railing, barrel, hangingLamp, crate } from './props.js';
import { hanging, sackPile } from './roomdress.js';

export const TAVERN_AT = { x: 6600, z: 0 };
// (the user 2.11, "make them bigger, it's really small": the floor 1.5 times the first cut; the furniture its own size)
// (ROOMS-FULL, the user 3.11, "the rooms feel empty … maybe shrink a little and add detail": 1.25 times; the places
//  first set on the 1.5 floor — the tables, the gallery's tables, the lamps — drawn in with it by S)
export const TAVERN_PLAN = (() => {
  const F = 1.25, S = F / 1.5, W = 10 * F, D = 15 * F, LX = -W / 2, BZ = -D / 2, GZ1 = BZ + 4.5 * F, SZ1 = GZ1 + 1.6, SX0 = 1.6 * F;
  const BARX = LX + 1.6, BZ0 = 0.6 * F, BZ1 = 4.6 * F;
  return { F, S, W, D, LX, BZ, DOORZ: 6.1 * F, GZ1, SZ1, SX0, BARX, BZ0, BZ1,
    tap: { x: BARX, z: BZ0 + 0.8 },                                                              // (the tap barrel on the bar)
    stools: Array.from({ length: Math.floor((BZ1 - BZ0 - 0.5) / 0.8) + 1 }, (_, i) => ({ x: BARX + 0.8, z: BZ0 + 0.5 + i * 0.8 })),   // (the red stools along the bar)
    lone: { x: BARX + 1.6, z: BZ0 - 0.9 },                                                       // (the lone stool by the bar's turn)
    luc: { x: LX + 0.85, z: 2.7 * F, a: Math.PI / 2 },                                           // (Luc's spot behind the bar)
    shelfZ: [BZ0 + 0.3, BZ1 - 0.3],                                                              // (the bottle shelf behind him)
    juke: { x: SX0 + 1.4, z: SZ1 + 0.8 }, sofa: { x: -0.9 * F, z: SZ1 + 0.42, w: 2.2 },
    tables: [[1.35, 5.1], [4.95, 8.1], [5.1, 2.4], [1.5, 9.3]].map(([x, z]) => [x * S, z * S]),                                 // (the square tables in front)
    chairs: [[0, -0.75, 0], [0, 0.75, Math.PI], [-0.85, 0, Math.PI / 2], [0.85, 0, -Math.PI / 2]] };   // (round each: dx, dz, the way its sitter faces)
})();

const RED = () => MAT.paint('#b0302c', 0.45), TEAL = () => MAT.paint('#2f6f74', 0.5);

// a bar stool: a red cushion on a chrome post and a foot ring
function stool(k, h = 0.72) {
  k.add(lathe([[0.001, 0], [0.19, 0], [0.2, 0.04], [0.17, 0.09], [0.001, 0.1]], 14), RED(), 0, h, 0);
  k.add(cyl(0.035, 0.035, h, 8), MAT.steel(), 0, h / 2, 0);
  k.add(cyl(0.2, 0.22, 0.04, 14), MAT.steel(), 0, 0.02, 0);
  k.add(new THREE.TorusGeometry(0.16, 0.012, 5, 16).rotateX(Math.PI / 2), MAT.steel(), 0, 0.3, 0);
  return { r: 0.22, top: h + 0.1 };
}
// the jukebox: a rounded red cabinet with a teal arch, a glowing window and a grille
function jukebox(k) {
  k.add(rbox(0.9, 1.25, 0.55, 0.12), RED(), 0, 0.62, 0);
  k.add(lathe([[0.001, 0], [0.45, 0], [0.45, 0.06], [0.3, 0.32], [0.001, 0.42]], 16), TEAL(), 0, 1.24, 0);
  k.add(plane(0.62, 0.42), MAT.glow('#ffe8a0', '#ffb040', 1.1), 0, 0.98, 0.281);
  k.add(plane(0.62, 0.3), MAT.paint('#3a3a40', 0.4), 0, 0.42, 0.281);
  for (let i = 0; i < 5; i++) k.add(rbox(0.58, 0.02, 0.02, 0.005), MAT.steel(), 0, 0.3 + i * 0.06, 0.29);
  return { hw: 0.46, hd: 0.3, top: 1.6 };
}
// the red sofa: a long padded seat with a rolled back
function sofa(k, w = 2.0) {
  k.add(rbox(w, 0.34, 0.7, 0.08), RED(), 0, 0.3, 0);
  k.add(rbox(w, 0.55, 0.2, 0.09), RED(), 0, 0.7, -0.27);
  for (const s of [-1, 1]) k.add(rbox(0.16, 0.5, 0.7, 0.07), RED(), s * (w / 2 - 0.08), 0.42, 0);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.add(cyl(0.03, 0.03, 0.14, 6), MAT.steel(), sx * (w / 2 - 0.1), 0.07, sz * 0.28);
  return { hw: w / 2, hd: 0.36, top: 0.95 };
}

export function buildTavernRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'tavern', TAVERN_AT.x, TAVERN_AT.z);
  const R = B.room, k = B.k;
  // (the user 2.11, "make them bigger, it's really small": the floor 1.5 times the first cut, the hall and gallery a
  //  quarter higher, the camera closer and following Twinsen as in his own house; the furniture keeps its size)
  const P = TAVERN_PLAN, { F, S, W, D } = P, H = 6.2;
  R.view = 11.5; R.follow = 0.65; R.music = 'home';
  // (the original's walls are pale grey blocks with a cool cast: the grey stone texture lightened toward them, lit a
  //  little from within as the sewers' masonry is, so a face turned from every lamp still reads as stone)
  const stone = M('tv_stone', () => { const t = TEX.stone('grey'), m = new THREE.MeshStandardMaterial({ map: t, color: '#e6e4ea', roughness: 0.9, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.32 }); m.userData.tile = 2; return m; });
  const rough = MAT.rubble('grey'), cap = MAT.stone('grey', 1.4);
  const floor = MAT.tiles('#a7a5a0', '#9a9893', '#3c3c40', false, 6);
  const { LX, BZ, DOORZ } = P;
  B.shell({ floor, slab: rough, body: stone, low: stone, rail: MAT.iron(), cap, H, t: 0.6, dado: 1.0, rimH: 0.5, rimMat: rough, W, D,
    back: [{ kind: 'window', at: 0.6 * F, w: 1.1, h: 1.4, y0: 4.3, curtain: '#b0302c' }, { kind: 'window', at: 3.0 * F, w: 1.1, h: 1.4, y0: 4.3, curtain: '#b0302c' }],
    left: [{ at: DOORZ, w: 1.8, h: 2.6, y0: 0, kind: 'door' },
      { kind: 'window', at: -1.0 * F, w: 0.9, h: 1.1, y0: 4.1 }, { kind: 'window', at: 1.6 * F, w: 0.9, h: 1.1, y0: 4.1 }, { kind: 'window', at: 4.2 * F, w: 0.9, h: 1.1, y0: 4.1 }] });
  R.exits.push({ x: B.cx + LX + 0.5, z: B.cz + DOORZ, r: 0.85, to: 'tavern-out' });
  R.spawn = { x: B.cx + LX + 1.6, z: B.cz + DOORZ, a: Math.PI / 2 };

  // --- the gallery along the back wall: a stone deck 3 m up on a solid face, an arched door in its face
  const GX0 = LX + 0.3, GX1 = W / 2 - 0.3, GZ0 = BZ + 0.3, GZ1 = P.GZ1, GH = 3.0;
  k.add(rbox(GX1 - GX0, GH, GZ1 - GZ0, 0.03), stone, (GX0 + GX1) / 2, GH / 2, (GZ0 + GZ1) / 2);
  k.add(rbox(GX1 - GX0 + 0.1, 0.14, GZ1 - GZ0 + 0.1, 0.03), cap, (GX0 + GX1) / 2, GH - 0.07, (GZ0 + GZ1) / 2);
  k.add(rbox(GX1 - GX0 - 0.2, 0.02, GZ1 - GZ0 - 0.2, 0.01), floor, (GX0 + GX1) / 2, GH + 0.005, (GZ0 + GZ1) / 2);
  B.col((GX0 + GX1) / 2, (GZ0 + GZ1) / 2, (GX1 - GX0) / 2, (GZ1 - GZ0) / 2, GH);
  // the arched door under the gallery (the original's way down to the cellar, scene 4)
  const AX = 3.6 * F;
  k.add(rbox(1.2, 1.7, 0.08, 0.02), MAT.wood('dark'), AX, 0.85, GZ1 + 0.04);
  k.add(cyl(0.6, 0.6, 0.08, 16), MAT.wood('dark'), AX, 1.7, GZ1 + 0.04, 0, { rx: Math.PI / 2 });
  k.add(rbox(1.5, 0.16, 0.14, 0.02), cap, AX, 2.38, GZ1 + 0.07);
  for (const sx of [-1, 1]) k.add(rbox(0.16, 2.3, 0.14, 0.02), cap, AX + sx * 0.68, 1.15, GZ1 + 0.07);
  k.add(cyl(0.04, 0.04, 0.03, 8), MAT.iron(), AX + 0.35, 1.0, GZ1 + 0.1, 0, { rx: Math.PI / 2 });
  // (LBA-CITADEL-7: the arched door opens on the cellar's stair, as the original's does: tavcellar.js)
  R.exits.push({ x: B.cx + AX, z: B.cz + GZ1 + 0.45, r: 0.6, room: 'tavcellar' });
  R.entries = { tavcellar: { x: B.cx + AX, z: B.cz + GZ1 + 1.3, a: 0 } };
  // --- the stair against the gallery's face, climbing toward the left wall, and its landing at the top
  const SZ0 = GZ1, SZ1 = P.SZ1, N = 10, run = 0.55, rise = GH / N, SX0 = P.SX0;   // (its foot at x = SX0)
  for (let i = 0; i < N; i++) {
    const top = rise * (i + 1), x = SX0 - (i + 0.5) * run;
    k.add(rbox(run + 0.02, top, SZ1 - SZ0, 0.015), stone, x, top / 2, (SZ0 + SZ1) / 2);   // (pale stone, as the original's)
    k.add(rbox(run + 0.04, 0.06, SZ1 - SZ0 + 0.04, 0.01), cap, x, top - 0.03, (SZ0 + SZ1) / 2);
    B.col(x, (SZ0 + SZ1) / 2, run / 2 + 0.12, (SZ1 - SZ0) / 2, top, { stair: true });   // (+0.12: the steps overlap each other and the landing under groundAt's 5 cm shrink; +0.04 left a 2 cm seam between steps, +0.08 one at the top step against the landing: both dropped Twinsen under the stair)
  }
  const LX1 = SX0 - N * run;   // (the landing: from the stair's top to the left wall, level with the gallery)
  k.add(rbox(LX1 - GX0, GH, SZ1 - SZ0, 0.02), stone, (GX0 + LX1) / 2, GH / 2, (SZ0 + SZ1) / 2);
  k.add(rbox(LX1 - GX0 + 0.06, 0.14, SZ1 - SZ0 + 0.06, 0.02), cap, (GX0 + LX1) / 2, GH - 0.07, (SZ0 + SZ1) / 2);
  B.col((GX0 + LX1) / 2, (SZ0 + SZ1) / 2, (LX1 - GX0) / 2, (SZ1 - SZ0) / 2, GH);
  // teal iron railings: the stair's open side and the landing's, the gallery's edge over the stair and on to the right
  railing(k, [[SX0, SZ1], [GX0, SZ1]], { h: 0.95, mat: TEAL(), step: 0.5 });
  k.at(0, GH, 0, 0, () => railing(k, [[LX1 + 0.1, SZ0 - 0.05], [GX1, SZ0 - 0.05]], { h: 0.95, mat: TEAL(), step: 0.45 }));
  B.col((SX0 + GX0) / 2, SZ1, (SX0 - GX0) / 2, 0.06, GH + 1.0, { seeThrough: true, noStand: true });
  B.col((LX1 + GX1) / 2, SZ0 - 0.05, (GX1 - LX1) / 2, 0.06, GH + 1.0, { seeThrough: true, noStand: true });
  // white globe lamps on the newels (the original's: the stair's foot, its top, the gallery's far end)
  for (const [x, y, z] of [[SX0, 0, SZ1], [GX0 + 0.1, GH, SZ1], [GX1 - 0.05, GH, SZ0 - 0.05]]) {
    k.add(cyl(0.05, 0.06, 1.1, 8), TEAL(), x, y + 0.55, z);
    k.add(sphere(0.17, 14, 10), MAT.glow('#fff8ee', '#ffe8c0', 1.2), x, y + 1.22, z);
  }
  // up there: round tables with red stools, a plant in each corner
  for (const [x, z] of [[-4.2, 3.2], [-0.9, 2.4], [2.85, 4.35], [5.55, 1.95]].map(([x, z]) => [x * S, BZ + z * S])) {
    B.put(x, z, 0, (kk) => table(kk, { w: 0.8, h: 0.95, round: true, pal: 'pale' }), { y: GH });
    for (let s = 0; s < 3; s++) { const a = s * 2.1 + 0.4; B.put(x + Math.sin(a) * 0.65, z + Math.cos(a) * 0.65, 0, (kk) => stool(kk, 0.62), { y: GH }); }
  }
  for (const x of [GX0 + 0.4, GX1 - 0.4]) k.at(x, GH, GZ0 + 0.3, 0, () => pottedPlant(k, { kind: 'spiky', s: 1.1, potColor: '#3a3a40' }));

  // --- the bar at the front left by the door: a counter along the left wall turning into the room at its back end,
  // the tap barrel and bottles on it, red stools along it, the bottle shelf on the wall behind
  const { BARX, BZ0, BZ1 } = P;
  k.at(BARX, 0, (BZ0 + BZ1) / 2, Math.PI / 2, () => counter(k, { w: BZ1 - BZ0, d: 0.7, h: 1.08, pal: 'grey', top: MAT.steel() }));
  B.col(BARX, (BZ0 + BZ1) / 2, 0.36, (BZ1 - BZ0) / 2, 1.1, { noStand: true });
  k.at(BARX + 0.65, 0, BZ0 - 0.1, 0, () => counter(k, { w: 1.6, d: 0.7, h: 1.08, pal: 'grey', top: MAT.steel() }));
  B.col(BARX + 0.65, BZ0 - 0.1, 0.8, 0.36, 1.1, { noStand: true });
  k.at(P.tap.x, 1.08, P.tap.z, 0, () => { barrel(k, { r: 0.26, h: 0.62, pal: 'dark' }); k.add(cyl(0.02, 0.02, 0.2, 6), MAT.brass(), 0.27, 0.35, 0, 0, { rz: Math.PI / 2 }); });
  for (const [z, c, kind] of [[1.15, '#2f8a7a', 'bottle'], [1.5, '#7a3a2a', 'bottle'], [2.0, '#2f6f74', 'bottle'], [2.5, '#c8a050', 'jar'], [3.4, '#2f8a7a', 'bottle'], [4.1, '#7a3a2a', 'bottle']]) jar(k, BARX - 0.05, 1.1, BZ0 + z, kind, c, 1.1);   // (from the bar's back end, past the tap)
  for (const s of P.stools) B.put(s.x, s.z, 0, (kk) => stool(kk));
  B.put(P.lone.x, P.lone.z, 0, (kk) => stool(kk));
  // the shelf behind the bar: bottles and, twelve years on, glazed Esmer jars from the harbour; the bar's name board
  for (const y of [1.6, 2.15]) k.add(rbox(0.3, 0.05, P.shelfZ[1] - P.shelfZ[0], 0.01), MAT.wood('dark'), LX + 0.32, y, (P.shelfZ[0] + P.shelfZ[1]) / 2);
  const shL = P.shelfZ[1] - P.shelfZ[0];
  for (let i = 0; i < 10; i++) jar(k, LX + 0.32, 1.63, P.shelfZ[0] + 0.15 + i * ((shL - 0.3) / 9), i % 3 === 1 ? 'urn' : 'bottle', ['#2f8a9a', '#c84a7a', '#e8b84a', '#3a72c4', '#2f8a7a', '#7a3a2a', '#8a5ac0'][i % 7], i % 3 === 1 ? 0.8 : 1.0);
  for (let i = 0; i < 9; i++) jar(k, LX + 0.32, 2.18, P.shelfZ[0] + 0.25 + i * ((shL - 0.5) / 8), 'bottle', ['#2f6f74', '#c8a050', '#7a3a2a'][i % 3], 0.95);
  k.add(plane(1.6, 0.5), MAT.paper('#f2e6c8', '#b0302c', 'leaf'), LX + 0.03, 2.75, (BZ0 + BZ1) / 2, Math.PI / 2);
  R.npcSpots = { luc: { x: B.cx + P.luc.x, z: B.cz + P.luc.z, a: P.luc.a } };

  // --- the floor: the jukebox at the stair's foot, the red sofa against the stair's side, square tables in front
  // (the jukebox stands beside the stair's foot, off the way up: the stair is climbed from its foot end only)
  B.put(P.juke.x, P.juke.z, 0, (kk) => jukebox(kk));
  const juke = B.light('#ffb060', 1.6, 3, P.juke.x, 1.0, P.juke.z + 0.6);
  R.updaters.push((dt, t) => { if (juke) juke.intensity = 1.4 + Math.sin(t * 6) * 0.25; });
  B.put(P.sofa.x, P.sofa.z, 0, (kk) => sofa(kk, P.sofa.w));
  for (const [x, z] of P.tables) {
    B.put(x, z, 0, (kk) => table(kk, { w: 1.2, d: 0.9, h: 0.8, pal: 'pale' }));
    for (const [dx, dz, a] of P.chairs) B.put(x + dx, z + dz, a, (kk) => chair(kk, { pal: 'pale', cushion: '#b0302c' }));
  }
  for (const [x, z] of [[LX + 0.5, D / 2 - 0.5], [W / 2 - 0.5, SZ1 + 0.6], [W / 2 - 0.6, D / 2 - 0.6]]) k.at(x, 0, z, 0, () => pottedPlant(k, { kind: 'spiky', s: 1.2, potColor: '#3a3a40' }));
  // a picture high on the long wall (the original has one there)
  k.add(plane(0.9, 1.2), MAT.paper('#e8d6a8', '#2f6f74', 'star'), LX + 0.03, 4.2, -3.2 * F, Math.PI / 2);
  // twelve years on: the ferry's timetable on the gallery's face by the stair's foot, a project heat radiator under
  // the long wall's windows
  k.at(2.3 * F, 1.5, SZ0 + 0.02, 0, () => noticeBoard(k, 0.8, 0.55, 7));
  k.add(rbox(0.14, 0.6, 1.6, 0.03), MAT.copper(), LX + 0.12, 0.45, -1.0 * F);
  for (let i = 0; i < 8; i++) k.add(rbox(0.16, 0.55, 0.05, 0.01), MAT.copper(), LX + 0.13, 0.45, -1.0 * F - 0.7 + i * 0.2);

  // --- ROOMS-FULL: lamps over the tables, cups and plates on them, barrels and a crate of the harbour's bottles by the
  // right wall, sacks by the cellar's arched door, a striped cloth over the radiator (props: no new lights)
  P.tables.forEach(([x, z], i) => {
    k.at(x, 0, z, 0, () => hangingLamp(k, 1.95, H, { shade: '#b0302c' }));
    plate(k, x - 0.25, 0.8, z + 0.15, 0, '#f2ead6', 0.11, false);
    for (const [dx, dz] of [[0.2, -0.15], [-0.05, 0.2 * (i % 2 ? 1 : -1)]]) k.add(cyl(0.045, 0.04, 0.11, 10), MAT.paint('#e8e4d8', 0.6), x + dx, 0.855, z + dz);
  });
  for (const z of [4.4, 5.1]) B.put(W / 2 - 0.55, z, 0, (kk) => barrel(kk, { r: 0.3, h: 0.75, pal: 'dark' }));
  B.put(W / 2 - 0.6, 3.6, 0.2, (kk) => { const f = crate(kk, 0.6, { pal: 'honey' }); for (let i = 0; i < 4; i++) jar(kk, -0.15 + (i % 2) * 0.3, 0.6, -0.12 + Math.floor(i / 2) * 0.24, 'bottle', ['#2f8a7a', '#7a3a2a'][i % 2], 0.9); return f; });
  B.put(AX + 1.25, GZ1 + 0.55, 0.4, (kk) => sackPile(kk, { seed: 4 }));
  k.at(LX + 0.04, 2.0, -1.0 * F, Math.PI / 2, () => hanging(k, { w: 1.4, h: 1.0 }));

  B.light('#ffe2b8', 7, 18, -2.25 * S, 5.4, 5.25 * S); B.light('#ffe2b8', 6.5, 18, 3.75 * S, 5.5, -3.0 * S); B.light('#fff0d8', 3.5, 10, 2.25 * S, GH + 2.3, BZ + 3.0 * S); B.light('#ffd8a0', 3, 7, BARX + 0.4, 2.6, 3.9 * S);
  return { tavern: B.finish() };
}

// the 'south' house's door leads in; coming out, Twinsen stands 1.2 m before it, facing away
export function tavernDoors(W) {
  const h = W?.houses?.find((x) => x.id === 'south');
  return h?.door ? [{ house: 'south', x: h.door.x, z: h.door.z, r: 0.9, room: 'tavern' }] : [];
}
export function tavernExit(to, W) {
  if (to !== 'tavern-out') return null;
  const h = W?.houses?.find((x) => x.id === 'south'); if (!h?.door) return null;
  return { x: h.door.x + Math.sin(h.ry) * 1.2, z: h.door.z + Math.cos(h.ry) * 1.2, a: h.ry };
}
