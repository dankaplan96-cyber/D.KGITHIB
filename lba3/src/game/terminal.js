// SPACEPORT-1 (the cloud's order, the user 2.11: "the spaceport is empty, no people, you can't go in anywhere"; "in
// chapter 1 there are buildings you can't get into, no proper ticket window, nothing"): the inside of Citadel
// Spaceport's terminal (spaceport.js: the stone block with the Esmer dome on the deck's north side; its blue door).
// LBA2 had no port on Citadel: the model is LBA2's departure hall at Otringal (scene 78), about 80 % alike, in Twinsun
// stone with Esmer touches. Our own geometry, from a study of the original's layout (numbers and descriptions only;
// nothing copied). As the game's camera sees it:
//   - the long back wall with a band of glass blocks under the cornice, the short left wall with the door from the
//     deck at the front and the gate to the pad at the back between two security pillars with green screens
//   - the ticket counter on a raised platform in the back right, two steps up, the clerk behind it, the port's name
//     on two hanging signs above it, a luggage scale at its foot
//   - the departures board on the left wall between the two doors, a lamp over it; the GROUNDED notice beside it
//   - rows of orange waiting seats facing the board, planters with Esmer fountain plants, a luggage trolley
//   - a small café corner at the back left: a counter with a coffee machine, stools, a round table
// Twelve years on (ours): the port itself is new on Citadel; the Joint Project's notice grounds passenger flights in
// chapters 1-3 (the story shows or hides it).
//
// CONTRACT (world coordinates unless said)
//   TERMINAL_AT                         where the room stands (regions.js)
//   buildTerminalRoom(scene, physics) → { terminal }   (regions.js group 'terminal')
//   terminalDoors() / terminalExit(to)  the terminal's blue door on the deck leads in; 'terminal-out' back out before
//                                       it; 'terminal-gate' out to the pad (beside the shuttle's walkway)
//   TERMINAL (filled when the room is built):
//     door {x,z}        the way in and out (the exit to the deck)
//     gate {x,z}        the gate to the pad (the exit 'terminal-gate')
//     counter {x,z,r}   where Twinsen stands to buy: the travel menu's interactable
//     board {x,z,r}     the departures board's read spot
//     seats [{x,z,a}]   10 sitting spots (a: facing)
//     npcSpots {clerk, guard, cafe} {x,z,a}
//     notice {setVisible(b)}   the GROUNDED notice on the left wall; WC-4: setKind('grounded' | 'list' | null) — in the
//                       evacuation it reads the project's boarding by its list, and the list itself hangs on the gate's
//                       pillar; `visible` stays SPACEPORT-1's meaning (the GROUNDED notice is up), `kind` says which
//   TERMINAL_PLAN                       the layout in the room's frame (the builder's own numbers): roomlife.js places the
//                                       terminal's people from it (BIGGER-1's way), so a change of the layout carries them
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { MAT, M, TEX, rbox, plane, cyl, sphere, lathe, canvasTex, table, chair, counter, pottedPlant, jar, luggageTrolley } from './props.js';

export const TERMINAL_AT = { x: 8600, z: 0 };
export const TERMINAL = {};
// (SPACEPORT-1 wiring: the café corner stood across the gate's way in — its stools and round table 0.4 m from the gate's
//  pillar, the hero stuck there walking to the gate: it moves along the back wall between the second and third
//  pilasters, its table before it; the gate's side of the hall is open floor)
export const TERMINAL_PLAN = (() => {
  const W = 16, D = 12, H = 5.0, LX = -W / 2, BZ = -D / 2, DOORZ = 3.6, GATEZ = -4.2, BRDZ = -0.5;
  const PX0 = 1.2, PX1 = W / 2 - 0.3, PZ1 = BZ + 3.4, PH = 0.36, CX = (PX0 + PX1) / 2, CZ = PZ1 - 0.6;   // (the ticket platform, its counter)
  // (the café's counter; F-13 follow-up: 1.4 m off the back wall, not 1.2 — the aisle behind it was 0.88 m, narrower than
  //  Tavi (0.45 m each side): the walkers' planner found no way along it and sent him out round the hall from one end of
  //  the counter to the other, where he stuck on the café's chairs. Now 1.08 m. The round table and its chairs stay put)
  const KX = -1.9, KZ = BZ + 1.4;
  const ROWS = [-3.4, -1.2], ROWZ = -0.3, ROWN = 5, TX = KX - 2.0, TZ = BZ + 3.1;
  return { W, D, H, LX, BZ, DOORZ, GATEZ, BRDZ, PX0, PX1, PZ1, PH, CX, CZ, KX, KZ, ROWS, ROWZ, ROWN,
    counterW: 4.2, counterD: 0.62, cafeW: 2.4,
    printer: { x: CX - 0.8, z: CZ }, cabinet: { x: CX + 1.2, z: BZ + 0.55, w: 1.6, d: 0.45 },
    scale: { x: PX1 - 0.6, z: PZ1 + 0.95 }, notice: { x: LX + 0.04, z: BRDZ + 2.1 },
    // the waiting seats' middles (two rows of five facing the board: the rows' seats run along z), the way they face
    seats: ROWS.flatMap((x) => Array.from({ length: ROWN }, (_, i) => ({ x: x - 0.02, z: ROWZ - 0.6 * (ROWN - 1) / 2 + i * 0.6, a: -Math.PI / 2 }))),
    seatDepth: 0.3,   // (a row's half depth across its seats)
    plants: [[-2.3, -2.25], [-2.3, 1.65], [3.2, 1.6]], trolley: { x: 0.9, z: 3.4, ry: 0.3 },
    machine: { x: KX - 0.7, z: KZ }, shelf: { x: KX, z: BZ + 0.15, w: 1.8 },
    stools: [-0.8, 0, 0.8].map((dx) => ({ x: KX + dx, z: KZ + 0.75 })),
    table: { x: TX, z: TZ }, chairs: [-1.2, 1.9].map((a) => ({ x: TX + Math.sin(a) * 0.75, z: TZ + Math.cos(a) * 0.75, a: a + Math.PI })),
    clerk: { x: CX, z: CZ - 0.75, a: 0 }, guard: { x: LX + 1.5, z: GATEZ + 1.7, a: Math.PI / 2 }, cafe: { x: KX, z: KZ - 0.55, a: 0 },
  };
})();

// the terminal's blue door on the deck (spaceport.js: tcx + 3 on the block's south face, z = 31.6)
const DOOR_OUT = { x: -2.5, z: 31.6 };

const ORANGE = () => MAT.paint('#d8682a', 0.45), BLUE = () => MAT.paint('#2f6a9a', 0.5);

const signTex = (text, sub) => canvasTex(512, 160, (x, W, H) => {
  x.fillStyle = '#f4efe2'; x.fillRect(0, 0, W, H); x.strokeStyle = '#2f6a9a'; x.lineWidth = 10; x.strokeRect(5, 5, W - 10, H - 10);
  x.fillStyle = '#2f6a9a'; x.font = 'bold 64px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, sub ? 62 : H / 2);
  if (sub) { x.fillStyle = '#c8452f'; x.font = 'bold 34px sans-serif'; x.fillText(sub, W / 2, 122); }
});
const boardTex = () => canvasTex(1024, 512, (x, W, H) => {
  x.fillStyle = '#18202c'; x.fillRect(0, 0, W, H); x.strokeStyle = '#e8c040'; x.lineWidth = 10; x.strokeRect(8, 8, W - 16, H - 16);
  x.fillStyle = '#e8c040'; x.font = 'bold 54px sans-serif'; x.textAlign = 'center'; x.fillText('DEPARTURES', W / 2, 82);
  x.fillStyle = 'rgba(232,192,64,0.5)'; x.fillRect(40, 108, W - 80, 4);
  x.font = 'bold 46px monospace'; x.textAlign = 'left';
  [['ZEELICH SPACEPORT', 'PAD 1'], ['- - - - - - - -', ''], ['- - - - - - - -', '']].forEach(([a, b], i) => { x.fillStyle = '#9fe0ff'; x.fillText(a, 60, 200 + i * 90); x.fillStyle = '#ffd860'; x.fillText(b, 800, 200 + i * 90); });
});
const noticeTex = () => canvasTex(256, 320, (x, W, H) => {
  x.fillStyle = '#f2ead6'; x.fillRect(0, 0, W, H); x.strokeStyle = '#c8452f'; x.lineWidth = 14; x.strokeRect(7, 7, W - 14, H - 14);
  x.fillStyle = '#c8452f'; x.font = 'bold 44px sans-serif'; x.textAlign = 'center'; x.fillText('GROUNDED', W / 2, 78);
  x.fillStyle = '#3a3a40'; x.font = '22px sans-serif';
  ['Passenger flights', 'suspended by the', 'Joint Project.', '', 'Project ships only.'].forEach((s, i) => x.fillText(s, W / 2, 140 + i * 32));
});
// WC-4, the evacuation: the project's notice (boarding by its list) and the list itself, a sheet of names on the gate
const listNoticeTex = () => canvasTex(256, 320, (x, W) => {
  x.fillStyle = '#f2ead6'; x.fillRect(0, 0, W, 320); x.strokeStyle = '#2f6a9a'; x.lineWidth = 14; x.strokeRect(7, 7, W - 14, 306);
  x.fillStyle = '#2f6a9a'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.fillText('PROJECT', W / 2, 62); x.fillText('SHIPS', W / 2, 100);
  x.fillStyle = '#3a3a40'; x.font = '22px sans-serif';
  ['Boarding by the', "project's list only.", '', 'Names are read', 'at the gate.'].forEach((t, i) => x.fillText(t, W / 2, 150 + i * 30));
});
const listSheetTex = () => canvasTex(128, 192, (x, W, H) => {
  x.fillStyle = '#fbf8ee'; x.fillRect(0, 0, W, H); x.fillStyle = '#2f6a9a'; x.fillRect(0, 0, W, 22);
  x.fillStyle = '#ffffff'; x.font = 'bold 15px sans-serif'; x.textAlign = 'center'; x.fillText('THE LIST', W / 2, 16);
  for (let i = 0; i < 14; i++) {
    const y = 34 + i * 11; x.fillStyle = '#5a5a66'; x.fillRect(12, y, 52 + ((i * 37) % 40), 3);
    x.fillStyle = i % 4 === 2 ? '#c8452f' : '#3f9a5a'; x.fillRect(104, y - 2, 8, 6);   // (ticks: on; a red mark: not yet)
  }
});
// LBA2's glass-block band: pale blue blocks in a white grid
const blocksTex = () => canvasTex(256, 128, (x, W, H) => {
  x.fillStyle = '#e8eef2'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) {
    const g = x.createLinearGradient(i * 32, j * 32, i * 32 + 32, j * 32 + 32); g.addColorStop(0, '#bfe0ee'); g.addColorStop(1, '#6fa8c4');
    x.fillStyle = g; x.fillRect(i * 32 + 3, j * 32 + 3, 26, 26);
  }
});

// a row of moulded orange seats on a steel beam (LBA2's), seats along +x, facing +z
function seatRow(k, n) {
  const st = MAT.steel(), w = 0.6 * n;
  k.add(rbox(w, 0.06, 0.1, 0.02), st, 0, 0.36, -0.05);
  for (const sx of [-1, 1]) { k.add(rbox(0.06, 0.36, 0.06, 0.01), st, sx * (w / 2 - 0.2), 0.18, -0.05); k.add(rbox(0.06, 0.04, 0.5, 0.01), st, sx * (w / 2 - 0.2), 0.02, -0.05); }
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.3 + i * 0.6;
    k.add(rbox(0.5, 0.06, 0.46, 0.04), ORANGE(), x, 0.43, 0.02);
    k.add(rbox(0.5, 0.5, 0.06, 0.04), ORANGE(), x, 0.7, -0.22, 0, { rx: -0.12 });
  }
  return { hw: w / 2, hd: 0.3, top: 0.9 };
}
// a security pillar of the gate (LBA2's: a slim column with a green screen and a pointed cap)
function gatePillar(k) {
  k.add(rbox(0.42, 2.2, 0.42, 0.06), MAT.stone('sand', 1), 0, 1.1, 0);
  k.add(plane(0.26, 1.4), MAT.glow('#3fae6a', '#2a8a4a', 0.9), 0.215, 1.15, 0, Math.PI / 2);
  k.add(plane(0.26, 1.4), MAT.glow('#3fae6a', '#2a8a4a', 0.9), -0.215, 1.15, 0, -Math.PI / 2);
  k.add(lathe([[0.001, 0], [0.22, 0], [0.16, 0.12], [0.03, 0.42], [0.001, 0.45]], 10), ORANGE(), 0, 2.2, 0);
  return { hw: 0.22, hd: 0.22, top: 2.6 };
}
// a planter with an Esmer fountain plant: arching blue-green fronds
function fountainPlant(k) {
  k.add(rbox(0.7, 0.45, 0.7, 0.06), MAT.stone('sand', 1), 0, 0.225, 0);
  const m = MAT.paint('#3f9a8a', 0.4);
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9, r = 0.18 + (i % 3) * 0.06;
    k.add(cyl(0.02, 0.03, 1.1, 5), m, Math.sin(a) * r * 0.5, 0.95, Math.cos(a) * r * 0.5, 0, { rz: Math.sin(a) * 0.5, rx: Math.cos(a) * 0.5 });
    k.add(sphere(0.07, 6, 5), MAT.glow('#9fe0ff', '#5fc0e8', 0.6), Math.sin(a) * (r + 0.3), 1.45 - (i % 2) * 0.15, Math.cos(a) * (r + 0.3));
  }
  return { hw: 0.36, hd: 0.36, top: 1.0 };
}
// the luggage scale: a low steel plate and a dial on a post
function luggageScale(k) {
  k.add(rbox(0.8, 0.12, 0.6, 0.03), MAT.steel(), 0, 0.06, 0);
  k.add(cyl(0.04, 0.04, 1.0, 8), MAT.steel(), 0.32, 0.6, -0.22);
  k.add(cyl(0.16, 0.16, 0.05, 16), MAT.paint('#f4efe2', 0.4), 0.32, 1.15, -0.22, 0, { rx: Math.PI / 2 });
  k.add(rbox(0.02, 0.12, 0.01, 0.003), MAT.paint('#c8452f', 0.5), 0.32, 1.17, -0.19);
  return { hw: 0.4, hd: 0.3, top: 0.14 };
}

export function buildTerminalRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'terminal', TERMINAL_AT.x, TERMINAL_AT.z);
  const R = B.room, k = B.k;
  const P = TERMINAL_PLAN, { W, D, H, LX, BZ, DOORZ, GATEZ, BRDZ, PX0, PX1, PZ1, PH, CX, CZ, KX, KZ } = P;
  R.view = 12; R.follow = 0.6; R.music = 'island';   // (ORDER 19: a departure hall: the island's travel pieces go on inside)
  // (Twinsun's pale sandstone below a white plaster band, as the terminal outside; lit a little from within)
  const stone = M('tm_stone', () => { const t = TEX.stone('sand'), m = new THREE.MeshStandardMaterial({ map: t, color: '#f2e8d8', roughness: 0.9, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.25 }); m.userData.tile = 2; return m; });
  const cap = MAT.stone('sand', 1.2), floor = MAT.tiles('#d8d2c4', '#c8c0b0', '#5a7a9a', false, 5);
  B.shell({ floor, slab: MAT.rubble('grey'), body: stone, low: MAT.plaster('#f4efe2'), rail: BLUE(), cap, H, t: 0.5, dado: 1.1, rimH: 0.45, rimMat: cap, W, D,
    left: [{ at: DOORZ, w: 1.5, h: 2.4, y0: 0, kind: 'door', frame: BLUE() }, { at: GATEZ, w: 1.6, h: 2.5, y0: 0, kind: 'door', frame: BLUE() }] });
  // the band of glass blocks under the back wall's cornice, lit from outside
  const blocks = MAT.map(blocksTex(), 0.4, { emissive: '#ffffff', emissiveMap: blocksTex(), emissiveIntensity: 0.55 });
  k.add(plane(W - 1.0, 1.0), blocks, 0, H - 1.0, BZ + 0.03);
  for (let x = LX + 0.5; x <= W / 2 - 0.4; x += 3.75) k.add(rbox(0.3, H - 0.4, 0.14, 0.05), cap, x, (H - 0.4) / 2, BZ + 0.07);
  // the door from the deck and the gate to the pad
  R.exits.push({ x: B.cx + LX + 0.45, z: B.cz + DOORZ, r: 0.8, to: 'terminal-out' });
  R.exits.push({ x: B.cx + LX + 0.45, z: B.cz + GATEZ, r: 0.8, to: 'terminal-gate' });
  R.spawn = { x: B.cx + LX + 1.4, z: B.cz + DOORZ, a: Math.PI / 2 };
  R.entries = { gate: { x: B.cx + LX + 1.6, z: B.cz + GATEZ, a: Math.PI / 2 } };
  for (const dz of [-1.15, 1.15]) B.put(LX + 0.6, GATEZ + dz, 0, (kk) => gatePillar(kk));
  k.add(plane(1.2, 0.35), MAT.map(signTex('GATE · PAD 1'), 0.6), LX + 0.03, 2.75, GATEZ, Math.PI / 2);

  // --- the ticket counter on its platform in the back right: two steps up, the counter across its front
  k.add(rbox(PX1 - PX0, PH, PZ1 - BZ - 0.3, 0.03), cap, (PX0 + PX1) / 2, PH / 2, (BZ + 0.3 + PZ1) / 2);
  k.add(rbox(PX1 - PX0 - 0.1, 0.02, PZ1 - BZ - 0.4, 0.01), MAT.tiles('#c8c0b0', '#b8b0a0', '#5a7a9a', true, 4), (PX0 + PX1) / 2, PH + 0.005, (BZ + 0.3 + PZ1) / 2);
  B.col((PX0 + PX1) / 2, (BZ + 0.3 + PZ1) / 2, (PX1 - PX0) / 2 + 0.06, (PZ1 - BZ - 0.3) / 2 + 0.06, PH);
  k.add(rbox(PX1 - PX0, PH / 2, 0.5, 0.02), cap, (PX0 + PX1) / 2, PH / 4, PZ1 + 0.25);
  B.col((PX0 + PX1) / 2, PZ1 + 0.25, (PX1 - PX0) / 2 + 0.06, 0.25 + 0.06, PH / 2);
  k.at(CX, PH, CZ, 0, () => counter(k, { w: P.counterW, d: P.counterD, h: 1.08, pal: 'pale', top: MAT.steel() }));
  B.col(CX, CZ, 2.1, 0.33, PH + 1.1, { noStand: true });
  k.add(rbox(4.24, 0.12, 0.08, 0.02), ORANGE(), CX, PH + 0.6, CZ + 0.33);
  // on it: the ticket printer, a stack of tickets, a little Esmer dome lamp
  k.add(rbox(0.36, 0.22, 0.3, 0.04), MAT.paint('#3a3a40', 0.4), P.printer.x, PH + 1.19, P.printer.z);
  k.add(plane(0.2, 0.12), MAT.glow('#9fe0ff', '#5fc0e8', 0.8), P.printer.x, PH + 1.25, P.printer.z + 0.155);
  for (let i = 0; i < 4; i++) k.add(rbox(0.16, 0.01, 0.08, 0.003), MAT.paint(['#f2ead6', '#e8d8a8'][i % 2], 0.7), CX + 0.4 + (i % 2) * 0.02, PH + 1.09 + i * 0.01, CZ + 0.05);
  k.add(cyl(0.07, 0.09, 0.1, 10), MAT.brass(), CX + 1.4, PH + 1.13, CZ);
  k.add(new THREE.SphereGeometry(0.1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.glow('#ffe8c8', '#e8a060', 0.8), CX + 1.4, PH + 1.18, CZ);
  // behind it: the clerk's stool, a cabinet of forms, the port's name on two hanging signs (LBA2 hangs two over its desk)
  k.add(rbox(P.cabinet.w, 1.3, P.cabinet.d, 0.04), MAT.wood('pale'), P.cabinet.x, PH + 0.65, P.cabinet.z);
  for (const dx of [-1.2, 1.2]) {
    for (const s of [-0.5, 0.5]) k.add(cyl(0.012, 0.012, 1.1, 4), MAT.steel(), CX + dx + s, H - 0.55, CZ + 0.1);
    k.add(plane(1.4, 0.44), MAT.map(signTex('TICKETS', dx < 0 ? 'CITADEL SPACEPORT' : 'TO ZEELICH'), 0.6, { side: THREE.DoubleSide }), CX + dx, H - 1.3, CZ + 0.1);
  }
  B.put(P.scale.x, P.scale.z, 0, (kk) => luggageScale(kk));
  for (const x of [PX0 + 0.15, PX1 - 0.15]) { k.add(cyl(0.05, 0.06, 1.0, 8), BLUE(), x, PH + 0.5, PZ1 - 0.15); k.add(sphere(0.16, 12, 8), MAT.glow('#fff4d8', '#ffd890', 1.0), x, PH + 1.12, PZ1 - 0.15); }

  // --- the departures board on the left wall between the doors, a lamp over it; the GROUNDED notice beside it
  k.add(rbox(0.14, 1.7, 3.0, 0.03), MAT.paint('#2a2e36', 0.4), LX + 0.08, 2.35, BRDZ);
  k.add(plane(2.8, 1.5), MAT.map(boardTex(), 0.7, { emissive: '#ffffff', emissiveMap: boardTex(), emissiveIntensity: 0.35 }), LX + 0.16, 2.35, BRDZ, Math.PI / 2);
  k.add(cyl(0.18, 0.28, 0.24, 12, true), MAT.steel(), LX + 0.5, 3.55, BRDZ, 0, { rz: -0.9 });
  const notice = k.mesh(plane(0.62, 0.78), MAT.map(noticeTex(), 0.8), P.notice.x, 1.75, P.notice.z, Math.PI / 2);
  // (WC-4: the project's list on the hall's face of the gate's inner pillar, shown in the evacuation)
  const sheet = k.mesh(plane(0.3, 0.45), MAT.map(listSheetTex(), 0.8), LX + 0.6, 1.4, GATEZ + 1.15 + 0.222, 0);
  sheet.visible = false;
  const noticeMat = { grounded: notice.material, list: null };

  // --- the waiting seats: two rows of five facing the board, planters at their ends, a luggage trolley
  const seats = [];
  for (const x of P.ROWS) {
    B.put(x, P.ROWZ, -Math.PI / 2, (kk) => seatRow(kk, P.ROWN));
    for (let i = 0; i < P.ROWN; i++) seats.push({ x: B.cx + x - 0.3, z: B.cz + P.ROWZ - 0.6 * (P.ROWN - 1) / 2 + i * 0.6, a: -Math.PI / 2 });
  }
  for (const [x, z] of P.plants) B.put(x, z, 0, (kk) => fountainPlant(kk));
  B.put(P.trolley.x, P.trolley.z, P.trolley.ry, (kk) => luggageTrolley(kk, { seed: 4, load: 3 }));
  k.at(W / 2 - 0.6, 0, D / 2 - 0.6, 0, () => pottedPlant(k, { kind: 'spiky', s: 1.3, potColor: '#2f6a9a' }));
  B.ccol(W / 2 - 0.6, D / 2 - 0.6, 0.35, 1.0);

  // --- the café corner on the back wall: a counter with the coffee machine, stools, a round table before it
  k.at(KX, 0, KZ, 0, () => counter(k, { w: P.cafeW, d: 0.6, h: 1.02, pal: 'pale', top: MAT.paint('#d8682a', 0.4) }));
  B.col(KX, KZ, P.cafeW / 2, 0.32, 1.05, { noStand: true });
  k.add(rbox(0.4, 0.5, 0.36, 0.05), MAT.steel(), P.machine.x, 1.27, P.machine.z - 0.05);
  k.add(cyl(0.03, 0.03, 0.12, 6), MAT.brass(), P.machine.x, 1.08, P.machine.z + 0.16, 0, { rx: Math.PI / 2 });
  [-0.2, 0.15, 0.5].forEach((dx, i) => jar(k, KX + dx, 1.03, KZ, 'jar', ['#f2ead6', '#2f8a9a', '#c84a7a'][i], 0.7));
  k.add(rbox(P.shelf.w, 0.04, 0.26, 0.01), MAT.wood('pale'), P.shelf.x, 1.7, P.shelf.z); for (let i = 0; i < 5; i++) jar(k, P.shelf.x - 0.7 + i * 0.35, 1.72, P.shelf.z, 'bottle', ['#2f8a9a', '#c8a050', '#7a3a2a'][i % 3], 0.8);
  k.add(plane(1.2, 0.35), MAT.map(signTex('CAFÉ'), 0.6), KX, 2.4, BZ + 0.04);
  for (const s of P.stools) B.put(s.x, s.z, 0, (kk) => { kk.add(cyl(0.18, 0.18, 0.06, 12), ORANGE(), 0, 0.72, 0); kk.add(cyl(0.035, 0.035, 0.7, 6), MAT.steel(), 0, 0.35, 0); kk.add(cyl(0.18, 0.2, 0.03, 12), MAT.steel(), 0, 0.015, 0); return { r: 0.2, top: 0.78 }; });
  B.put(P.table.x, P.table.z, 0, (kk) => table(kk, { w: 0.8, h: 0.76, round: true, pal: 'pale' }));
  for (const c of P.chairs) B.put(c.x, c.z, c.a, (kk) => chair(kk, { pal: 'pale', cushion: '#d8682a' }));

  B.light('#fff0d8', 6, 16, -2.0, 4.2, 0.5); B.light('#fff0d8', 5, 13, CX, 4.0, BZ + 2.5); B.light('#bfe6ff', 3, 12, 0, H - 1, BZ + 1); B.light('#ffd8a0', 2.5, 7, KX, 2.4, KZ + 1);

  Object.assign(TERMINAL, {
    door: { x: B.cx + LX + 0.45, z: B.cz + DOORZ },
    gate: { x: B.cx + LX + 0.45, z: B.cz + GATEZ },
    counter: { x: B.cx + CX, z: B.cz + CZ + 0.85, r: 1.0 },
    board: { x: B.cx + LX + 1.6, z: B.cz + BRDZ, r: 1.2 },
    seats,
    npcSpots: Object.fromEntries(['clerk', 'guard', 'cafe'].map((k) => [k, { x: B.cx + P[k].x, z: B.cz + P[k].z, a: P[k].a }])),
    notice: {
      setKind(kind) {
        if (kind === 'list') notice.material = (noticeMat.list ||= MAT.map(listNoticeTex(), 0.8));
        else if (kind) notice.material = noticeMat.grounded;
        notice.visible = !!kind; sheet.visible = kind === 'list'; this._kind = kind || null;
      },
      setVisible(b) { this.setKind(b ? 'grounded' : null); },
      get visible() { return notice.visible && this._kind === 'grounded'; },
      get kind() { return notice.visible ? this._kind : null; },
      _kind: 'grounded',
    },
  });
  R.npcSpots = TERMINAL.npcSpots;
  return { terminal: B.finish() };
}

// the terminal's blue door on the deck leads in; coming out, Twinsen stands 1.2 m before it facing the deck; through the
// gate he comes out on the pad's walkway beside the shuttle (spaceport.js PAD / landing)
export function terminalDoors() {
  return [{ house: 'spaceport', x: DOOR_OUT.x, z: DOOR_OUT.z + 0.35, r: 0.9, room: 'terminal' }];
}
export function terminalExit(to) {
  if (to === 'terminal-out') return { x: DOOR_OUT.x, z: DOOR_OUT.z + 1.2, a: 0 };
  if (to === 'terminal-gate') return { x: -1.7, z: 39.5, a: Math.PI / 2 };
  return null;
}
