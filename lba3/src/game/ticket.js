// LBA-CITADEL-3 (the user 1.11: "fixes and additions from the first and second games, and logical additions for twelve
// years later"; night mode: "work to the plan"): the harbour's ticket office, after LBA2's scene 8. In LBA2 its door is
// where our 'baggage' building stands at the harbour; the building had no inside.
// Our own geometry, from a study of the original's layout (numbers and descriptions only; nothing copied):
//   - a small square hall of about 13 × 13 of the original's cells (≈ 6.4 × 6.4 m, ≈ 3.6 m high), pale grey stone
//     blocks, a floor of black and white checkered tiles
//   - as the game's camera sees it: a long pale counter across the room at half its depth, a brown cabinet at its left
//     end against the wall, the till and a pile of tickets on it; behind it the staff's side: red stools and a chair, a
//     great potted plant on a low stand, a red bench with a stack of red luggage
//   - the public's side in front: red chairs along the left wall and the front, two white globe lamps on short posts
//   - the left wall: a poster of the Temple of Bù and a round wall clock above it, the arched door at its front end;
//     the back wall: two windows with red blinds and a poster of a ship between them
// Twelve years on (ours): the office sells the ferry to Desert Island now (ships to Zeelich leave from the spaceport only) (the ship on the poster is the ferry), a
// timetable board hangs by the door; the old Temple poster has faded but stayed.
//
// CONTRACT
//   TICKET_AT                  where the room stands (regions.js)
//   buildTicketRoom(scene, physics) → { ticket }   (regions.js group 'ticket')
//   ticketDoors(W) / ticketExit(to, W)   the 'baggage' building's door leads in; 'ticket-out' leads back out before it
//   R.npcSpots.clerk            behind the counter (the story layer may put the clerk there)
//   TICKET_PLAN                 the layout in the room's frame (the builder's own numbers): roomlife.js places the
//                               room's people from it, so a change of the layout carries them along
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { MAT, M, TEX, CANV, rbox, plane, cyl, sphere, lathe, canvasTex, chair, noticeBoard, pottedPlant, hangingLamp, rug, ledger, deskBell, papers, coatStand } from './props.js';
import { sack, boxStack, goodsShelf, hanging } from './roomdress.js';

export const TICKET_AT = { x: 6800, z: 0 };
// (the user 2.11, "make them bigger": the floor 1.5 times the first cut; the furniture its own size)
// (ROOMS-FULL, the user 3.11: 1.25 times, and furnished further)
export const TICKET_PLAN = (() => {
  const F = 1.25, W = 6.4 * F, D = 6.4 * F, LX = -W / 2, BZ = -D / 2, DOORZ = 1.9 * F, CZ = -0.4 * F;
  return { F, W, D, LX, BZ, DOORZ, CZ, CX0: LX + 0.9, CX1: W / 2 - 1.0 * F, CHD: 0.32,   // (the counter across the room, half its depth)
    till: { x: 0.6 * F, z: CZ }, tickets: { x: 1.6 * F, z: CZ },
    clerk: { x: 0.6 * F, z: CZ - 0.75, a: 0 },                       // (the clerk's spot: behind the counter at the till)
    stools: [-0.9 * F, 1.2 * F].map((x) => ({ x, z: CZ - 1.3 })),     // (the staff's side: a lane between them and the counter)
    wallChairs: [0.6 * F, 2.9 * F].map((z) => ({ x: LX + 0.45, z, a: Math.PI / 2 })),
    frontChairs: [0.4 * F, 1.2 * F, 2.0 * F].map((x) => ({ x, z: D / 2 - 0.45, a: Math.PI })),
    board: { x: LX + 0.03, z: DOORZ - 1.15 } };                       // (the ferry's timetable by the door)
})();

const RED = () => MAT.paint('#b0302c', 0.45), METAL = () => MAT.paint('#cfcdd6', 0.35), DARK = () => MAT.paint('#7c7a86', 0.4);

// the two posters (drawn: no words): the Temple of Bù's stepped silhouette on a faded ochre ground, and a ship
const templePoster = () => M('tk_temple', () => MAT.map(canvasTex(128, 176, (x, W, H) => {
  x.fillStyle = '#d8c8a0'; x.fillRect(0, 0, W, H); x.fillStyle = '#3a5a7a'; x.fillRect(8, 8, W - 16, H - 16);
  x.fillStyle = '#e8c870'; x.beginPath(); x.arc(W / 2, 54, 22, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#c8b890'; for (let i = 0; i < 4; i++) x.fillRect(24 + i * 10, 80 + i * 18, W - 48 - i * 20, 18);
  x.fillStyle = 'rgba(240,230,210,0.35)'; x.fillRect(0, 0, W, H);   // (faded)
}), 0.9));
const shipPoster = () => M('tk_ship', () => MAT.map(canvasTex(176, 128, (x, W, H) => {
  x.fillStyle = '#f0ead8'; x.fillRect(0, 0, W, H); x.fillStyle = '#4a9ac8'; x.fillRect(8, 8, W - 16, 70); x.fillStyle = '#2a6a9a'; x.fillRect(8, 66, W - 16, 22);
  x.fillStyle = '#f4f4f0'; x.beginPath(); x.moveTo(36, 64); x.lineTo(140, 64); x.lineTo(126, 82); x.lineTo(46, 82); x.closePath(); x.fill();
  x.fillStyle = '#c8302a'; x.fillRect(70, 44, 40, 20); x.fillStyle = '#3a3a40'; x.fillRect(82, 32, 10, 14);
  x.fillStyle = '#b0302c'; x.fillRect(8, 96, W - 16, 22);
}), 0.9));

// a short post with a white globe (the original's lamps)
function postLamp(k) {
  k.add(cyl(0.12, 0.16, 0.08, 12), DARK(), 0, 0.04, 0);
  k.add(cyl(0.035, 0.045, 1.5, 8), DARK(), 0, 0.79, 0);
  k.add(sphere(0.16, 14, 10), MAT.glow('#fff8ee', '#ffe8c0', 1.2), 0, 1.66, 0);
  return { r: 0.18, top: 1.8 };
}
// a red stool, a red bench with luggage on it, a plant stand, the till
function stool(k, h = 0.62) {
  k.add(lathe([[0.001, 0], [0.19, 0], [0.2, 0.04], [0.17, 0.09], [0.001, 0.1]], 14), RED(), 0, h, 0);
  k.add(cyl(0.035, 0.035, h, 8), MAT.steel(), 0, h / 2, 0);
  k.add(cyl(0.2, 0.22, 0.04, 14), MAT.steel(), 0, 0.02, 0);
  return { r: 0.22, top: h + 0.1 };
}
function luggageBench(k) {
  k.add(rbox(1.6, 0.42, 0.55, 0.12), RED(), 0, 0.3, 0);
  for (const sx of [-0.65, 0.65]) k.add(cyl(0.04, 0.04, 0.1, 6), MAT.steel(), sx, 0.05, 0);
  const cases = [[-0.45, 0.62, 0.0, 0.5, 0.3, 0.4], [0.05, 0.62, 0.02, 0.44, 0.34, 0.38], [0.5, 0.62, -0.02, 0.4, 0.28, 0.36], [-0.2, 0.92, 0.0, 0.42, 0.26, 0.34], [0.3, 0.9, 0.0, 0.36, 0.24, 0.3]];
  for (const [x, y, z, w, h, d] of cases) { k.add(rbox(w, h, d, 0.04), MAT.paint('#a8302a', 0.55), x, y, z); k.add(rbox(0.12, 0.03, 0.03, 0.01), MAT.brass(), x, y + h / 2 + 0.02, z); }
  return { hw: 0.8, hd: 0.3, top: 1.1 };
}
function till(k) {
  const t = MAT.paint('#2f8a8a', 0.4);
  k.add(rbox(0.42, 0.22, 0.32, 0.03), t, 0, 0.11, 0);
  k.add(rbox(0.38, 0.06, 0.2, 0.02), t, 0, 0.26, -0.04, 0, { rx: -0.5 });
  k.add(rbox(0.2, 0.1, 0.02, 0.01), MAT.glow('#d8f0e8', '#80c0b0', 0.6), 0, 0.36, -0.14);
}

export function buildTicketRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'ticket', TICKET_AT.x, TICKET_AT.z);
  const R = B.room, k = B.k;
  // (the user 2.11, "make them bigger": the floor 1.5 times the first cut, the camera following Twinsen; the
  //  furniture keeps its size)
  const P = TICKET_PLAN, { F, W, D } = P, H = 3.7;
  R.view = 9.5; R.follow = 0.55; R.music = 'office';   // (REVIEW-CITADEL: a town interior, the square heard through the walls; not Twinsen's home theme)
  // (the same pale grey blocks as the tavern and the shop: Citadel's stone inside, lit a little from within)
  const stone = M('tv_stone', () => { const t = TEX.stone('grey'), m = new THREE.MeshStandardMaterial({ map: t, color: '#e6e4ea', roughness: 0.9, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.32 }); m.userData.tile = 2; return m; });
  const rough = MAT.rubble('grey'), cap = MAT.stone('grey', 1.4);
  const { LX, BZ, DOORZ } = P;
  B.shell({ floor: MAT.tiles('#ecebe6', '#2c2c32', '#5a5a60', true, 8), slab: rough, body: stone, low: stone, rail: MAT.iron(), cap, H, t: 0.5, dado: 1.0, rimH: 0.45, rimMat: rough, W, D,
    back: [{ kind: 'window', at: -1.2 * F, w: 0.9, h: 1.0, y0: 1.6, curtain: '#b0302c' }, { kind: 'window', at: 2.0 * F, w: 0.9, h: 1.0, y0: 1.6, curtain: '#b0302c' }],
    left: [{ at: DOORZ, w: 1.3, h: 2.4, y0: 0, kind: 'door' }] });
  R.exits.push({ x: B.cx + LX + 0.45, z: B.cz + DOORZ, r: 0.75, to: 'ticket-out' });
  R.spawn = { x: B.cx + LX + 1.4, z: B.cz + DOORZ, a: Math.PI / 2 };

  // --- the counter across the room at half its depth, the cabinet at its left end, the till and the tickets on it
  const { CZ, CX0, CX1 } = P;
  k.add(rbox(CX1 - CX0, 1.0, 0.6, 0.12), METAL(), (CX0 + CX1) / 2, 0.5, CZ);
  k.add(rbox(CX1 - CX0 + 0.08, 0.05, 0.66, 0.02), DARK(), (CX0 + CX1) / 2, 1.02, CZ);
  B.col((CX0 + CX1) / 2, CZ, (CX1 - CX0) / 2, P.CHD, 1.05, { noStand: true });
  k.add(rbox(0.75, 1.15, 0.6, 0.04), MAT.wood('honey'), LX + 0.45, 0.575, CZ);
  for (const y of [0.35, 0.85]) k.add(rbox(0.6, 0.02, 0.02, 0.005), MAT.brass(), LX + 0.45, y, CZ + 0.31);
  B.col(LX + 0.45, CZ, 0.4, 0.32, 1.2, { noStand: true });
  k.at(P.till.x, 1.045, P.till.z, 0, () => till(k));
  for (let i = 0; i < 4; i++) k.add(rbox(0.22, 0.012, 0.14, 0.004), MAT.paint(['#f2ead6', '#e8d8a8', '#f2ead6', '#d8e8f0'][i], 0.7), P.tickets.x + (i % 2) * 0.03, 1.05 + i * 0.012, P.tickets.z + 0.05);
  R.npcSpots = { clerk: { x: B.cx + P.clerk.x, z: B.cz + P.clerk.z, a: P.clerk.a } };
  // --- the staff's side behind it: a chair, stools, the plant on its stand, the bench with the luggage
  B.put(LX + 1.3, BZ + 0.9, 0.6, (kk) => chair(kk, { pal: 'pale', cushion: '#b0302c' }));
  for (const s of P.stools) B.put(s.x, s.z, 0, (kk) => stool(kk));
  B.put(0.15 * F, BZ + 0.75, 0, (kk) => { kk.add(cyl(0.4, 0.45, 0.25, 16), DARK(), 0, 0.125, 0); return { r: 0.45, top: 0.25 }; });
  k.at(0.15 * F, 0.25, BZ + 0.75, 0, () => pottedPlant(k, { kind: 'spiky', s: 1.2, potColor: '#3a3a40' }));
  B.put(W / 2 - 1.1, BZ + 0.45, 0, (kk) => luggageBench(kk));
  // --- the public's side in front: red chairs along the left wall and the front, two globe lamps
  for (const c of [...P.wallChairs, ...P.frontChairs]) B.put(c.x, c.z, c.a, (kk) => chair(kk, { pal: 'pale', cushion: '#b0302c' }));
  for (const [x, z] of [[LX + 0.5, 1.15 * F], [-0.6 * F, D / 2 - 0.5]]) B.put(x, z, 0, (kk) => postLamp(kk));
  // --- the walls: the Temple poster and the clock on the left, the ship poster between the back windows
  k.add(plane(0.75, 1.0), templePoster(), LX + 0.03, 1.75, -1.6 * F, Math.PI / 2);
  k.add(cyl(0.24, 0.24, 0.05, 20), DARK(), LX + 0.05, 3.0, -0.4 * F, 0, { rz: Math.PI / 2 });
  k.add(new THREE.CircleGeometry(0.21, 20), MAT.map(CANV.clock(), 0.6), LX + 0.085, 3.0, -0.4 * F, Math.PI / 2);
  k.add(plane(1.0, 0.72), shipPoster(), 0.4 * F, 2.05, BZ + 0.03);
  // twelve years on: the ferry's timetable by the door
  k.at(P.board.x, 1.5, P.board.z, Math.PI / 2, () => noticeBoard(k, 0.6, 0.5, 13));

  // --- ROOMS-FULL: the counter's ledger, bell and forms, two lamps over it, a rug on the public side, the staff's
  // pigeonholes of parcels and a mail sack behind, a coat stand and a pile of luggage at the front (props only)
  const CXm = (CX0 + CX1) / 2;
  ledger(k, CXm - 1.4, 1.045, CZ + 0.02, -0.1);
  deskBell(k, P.till.x + 0.55, 1.045, CZ + 0.18);
  papers(k, CXm - 0.5, 1.045, CZ + 0.05, 3, 4);
  for (const dx of [-1.5, 1.3]) k.at(CXm + dx, 0, CZ, 0, () => hangingLamp(k, 2.6, H, { shade: '#b0302c' }));
  k.at(0.2, 0.01, 1.7, 0, () => rug(k, 2.6, 1.3, ['#b0302c', '#e8dcc0', '#2f6f74', '#7a2a22', '#f2ead6'], 3));
  B.put(-1.25, BZ + 0.22, 0, (kk) => goodsShelf(kk, { w: 1.2, h: 1.8, d: 0.34, rows: 3, pal: 'honey', seed: 12 }));
  B.put(-2.2, BZ + 0.35, 0.4, (kk) => sack(kk, { s: 0.95, c: '#8a7a5a', tie: '#b0302c' }));
  B.put(W / 2 - 0.35, 2.7, 0, (kk) => { coatStand(kk); return { r: 0.25, top: 1.8 }; });
  B.put(W / 2 - 0.5, D / 2 - 0.45, 0.2, (kk) => boxStack(kk, { n: 3, seed: 9, w: 0.55 }));
  k.at(-3.0, 2.3, BZ + 0.03, 0, () => hanging(k, { w: 0.8, h: 1.0, bands: ['#2f6f74', '#e8dcc0', '#b0302c', '#e8dcc0', '#2f6f74'] }));

  B.light('#ffe8c8', 5, 12, -0.5 * F, 3.4, 0.8 * F); B.light('#ffe8c8', 4, 10, 1.8 * F, 3.4, -1.6 * F);
  return { ticket: B.finish() };
}

// the 'baggage' building's door leads in; coming out, Twinsen stands 1.2 m before it, facing away
export function ticketDoors(W) {
  const h = W?.houses?.find((x) => x.id === 'baggage');
  return h?.door ? [{ house: 'baggage', x: h.door.x, z: h.door.z, r: 0.9, room: 'ticket' }] : [];
}
export function ticketExit(to, W) {
  if (to !== 'ticket-out') return null;
  const h = W?.houses?.find((x) => x.id === 'baggage'); if (!h?.door) return null;
  return { x: h.door.x + Math.sin(h.ry) * 1.2, z: h.door.z + Math.cos(h.ry) * 1.2, a: h.ry };
}
