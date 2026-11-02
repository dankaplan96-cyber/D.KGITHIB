// SPACEPORT-1 part 2 (the cloud's order, the user 2.11: "the spaceport is empty, you can't go in anywhere"): Zeelich
// Spaceport's terminal. Outside, a small domed Esmer pavilion on the port's deck beside the footbridge (travel.js ZPORT:
// the deck had no building at all); inside, one Esmer hall after LBA2's two at Otringal's astroport, about 80 % alike:
// the departure hall (scene 78) on the left, the arrival hall (scene 82) on the right. Our own geometry, from a study of
// the originals' layout (numbers and descriptions only; nothing copied). As the game's camera sees it:
//   - the long back wall with LBA2's band of glass blocks under the cornice between rounded pilasters; the short left
//     wall with the door from the deck at the front and the gate to the pad at the back between two security pillars
//   - departures (left): the ticket counter on a platform two steps up at the back, two hanging signs over it, the
//     departures board on the left wall, two rows of orange seats facing it, fountain plants
//   - arrivals (right): a deck 0.8 m up at the back, its front of glass blocks under a railing, a stair down at each
//     end; behind it four round lifts to the town (ribbed glass shafts, lit rims); the arrivals board on the back wall;
//     round windows in the wall, a red bench
// Twelve years on (ours): the boards list Twinsun (Citadel) by spaceship, the shuttles to Zeelich's islands outside.
//
// CONTRACT (world coordinates unless said)
//   ZTERMINAL_AT                         where the room stands (regions.js)
//   buildZTerminalRoom(scene, physics) → { zterminal }   (regions.js group 'zterminal')
//   buildZTerminalOutside(group, physics, Y)   the pavilion on the deck: called by travel.js with Zeelich's group (its
//                                       local frame: ZPORT's) and the deck's height
//   zterminalDoors() / zterminalExit(to)   the pavilion's door leads in (region 'zeelich'); 'zterminal-out' back out
//                                       before it; 'zterminal-gate' out to the pad's landing spot
//   ZTERMINAL (filled when the room is built): door, gate, counter {x,z,r}, board {x,z,r}, seats [{x,z,a}] (8),
//     npcSpots {clerk, guard, porter}, arrivals {x,z,a} (where he steps in from the pad), notice {setVisible(b)}
//   ZTERMINAL_PLAN                       the layout in the room's frame (the builder's own numbers): roomlife.js places
//                                        the hall's people from it (BIGGER-1's way)
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { MAT, M, TEX, rbox, plane, cyl, sphere, lathe, torus, canvasTex, counter } from './props.js';
import { Batch, tm } from './kit.js';
import { Place, esmerBuilding, cm } from './props-esmer.js';
import { domeTex } from './zeelich.js';
import { ZEELICH } from './zeelich.js';

export const ZTERMINAL_AT = { x: 8800, z: 0 };
export const ZTERMINAL = {};
export const ZTERMINAL_PLAN = (() => {
  const W = 18, D = 12, H = 5.4, LX = -W / 2, BZ = -D / 2, DOORZ = 3.6, GATEZ = -4.2, BRDZ = -0.5;
  const PX0 = LX + 3.2, PX1 = -0.6, PZ1 = BZ + 3.2, PH = 0.36, CX = (PX0 + PX1) / 2, CZ = PZ1 - 0.6;   // (departures: the platform, its counter)
  const AX0 = 1.2, AX1 = W / 2 - 0.3, AZ1 = BZ + 3.6, AH = 0.8;                                      // (arrivals: the deck)
  const ROWS = [-5.6, -3.6], ROWZ = 0.7, ROWN = 4;
  return { W, D, H, LX, BZ, DOORZ, GATEZ, BRDZ, PX0, PX1, PZ1, PH, CX, CZ, AX0, AX1, AZ1, AH, ROWS, ROWZ, ROWN,
    counterW: 3.8, printer: { x: CX - 0.8, z: CZ }, notice: { x: LX + 0.04, z: BRDZ + 2.1 },
    seats: ROWS.flatMap((x) => Array.from({ length: ROWN }, (_, i) => ({ x: x - 0.02, z: ROWZ - 0.6 * (ROWN - 1) / 2 + i * 0.6, a: -Math.PI / 2 }))),
    plants: [[-4.6, -1.0], [-4.6, 2.6], [-1.6, 3.4], [W / 2 - 0.6, AZ1 + 5.0], [3.6, 2.4]],
    stair: { run: 0.4, n: 4, w: 1.2, xs: [AX0 + 0.6, AX1 - 0.6] },   // (a stair down from each end of the deck, toward +z)
    lifts: Array.from({ length: 4 }, (_, i) => ({ x: AX0 + 1.2 + i * ((AX1 - AX0 - 2.4) / 3), z: BZ + 1.1 })),
    bench: { x: AX0 + 0.3, z: D / 2 - 1.2, ry: Math.PI },
    arrivalsBoard: { x: (AX0 + AX1) / 2, z: BZ + 0.06 },
    clerk: { x: CX, z: CZ - 0.75, a: 0 }, guard: { x: LX + 1.5, z: GATEZ + 1.7, a: Math.PI / 2 }, porter: { x: AX0 + 1.4, z: AZ1 + 1.2, a: Math.PI },
    arrivals: { x: LX + 1.6, z: GATEZ, a: Math.PI / 2 },
  };
})();

// the pavilion on the deck (Zeelich's local frame, travel.js ZPORT: the deck x −14…6, z 33…51, the bridge at x −4)
const PAV = { x: 2.7, z: 36.3, w: 4.6, d: 4.2, h: 5.2, wallH: 3.4, ry: -Math.PI / 2, doorX: 0.8 };
const DOOR = { x: PAV.x - PAV.d / 2, z: PAV.z + PAV.doorX };   // (its front faces −x, toward the bridge's end)
const LANDING = { x: -4, z: 44 - 7.2, a: Math.PI };            // travel.js: the pad's landing spot

const ORANGE = () => MAT.paint('#d8682a', 0.45), TURQ = () => MAT.paint('#2f8a9a', 0.45);
const signTex = (text, sub, bg = '#2a1e34', ink = '#f0c040') => canvasTex(512, 160, (x, W, H) => {
  x.fillStyle = bg; x.fillRect(0, 0, W, H); x.strokeStyle = ink; x.lineWidth = 10; x.strokeRect(5, 5, W - 10, H - 10);
  x.fillStyle = ink; x.font = 'bold 60px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, sub ? 60 : H / 2);
  if (sub) { x.fillStyle = '#bfe9ff'; x.font = 'bold 32px sans-serif'; x.fillText(sub, W / 2, 120); }
});
const boardTex = (title, rows) => canvasTex(1024, 512, (x, W, H) => {
  x.fillStyle = '#2a1e34'; x.fillRect(0, 0, W, H); x.strokeStyle = '#f0c040'; x.lineWidth = 10; x.strokeRect(8, 8, W - 16, H - 16);
  x.fillStyle = '#f0c040'; x.font = 'bold 54px sans-serif'; x.textAlign = 'center'; x.fillText(title, W / 2, 82);
  x.fillStyle = 'rgba(240,192,64,0.5)'; x.fillRect(40, 108, W - 80, 4);
  x.font = 'bold 44px monospace'; x.textAlign = 'left';
  rows.forEach(([a, b], i) => { x.fillStyle = '#bfe9ff'; x.fillText(a, 60, 200 + i * 86); x.fillStyle = '#ffd860'; x.fillText(b, 790, 200 + i * 86); });
});
const blocksTex = () => canvasTex(256, 128, (x, W, H) => {
  x.fillStyle = '#e8eef2'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 4; j++) {
    const g = x.createLinearGradient(i * 32, j * 32, i * 32 + 32, j * 32 + 32); g.addColorStop(0, '#bfe0ee'); g.addColorStop(1, '#6fa8c4');
    x.fillStyle = g; x.fillRect(i * 32 + 3, j * 32 + 3, 26, 26);
  }
});

function seatRow(k, n) {
  const st = MAT.steel(), w = 0.6 * n;
  k.add(rbox(w, 0.06, 0.1, 0.02), st, 0, 0.36, -0.05);
  for (const sx of [-1, 1]) { k.add(rbox(0.06, 0.36, 0.06, 0.01), st, sx * (w / 2 - 0.2), 0.18, -0.05); k.add(rbox(0.06, 0.04, 0.5, 0.01), st, sx * (w / 2 - 0.2), 0.02, -0.05); }
  for (let i = 0; i < n; i++) { const x = -w / 2 + 0.3 + i * 0.6; k.add(rbox(0.5, 0.06, 0.46, 0.04), ORANGE(), x, 0.43, 0.02); k.add(rbox(0.5, 0.5, 0.06, 0.04), ORANGE(), x, 0.7, -0.22, 0, { rx: -0.12 }); }
  return { hw: w / 2, hd: 0.3, top: 0.9 };
}
function gatePillar(k) {
  k.add(rbox(0.42, 2.2, 0.42, 0.06), MAT.paint('#d8ccd8', 0.6), 0, 1.1, 0);
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) k.add(sphere(0.05, 8, 6), MAT.glow('#ff5a3a', '#ff2a10', 1.2), s * 0.22, 1.5 - i * 0.3, 0);
  k.add(lathe([[0.001, 0], [0.22, 0], [0.16, 0.12], [0.03, 0.42], [0.001, 0.45]], 10), ORANGE(), 0, 2.2, 0);
  return { hw: 0.22, hd: 0.22, top: 2.6 };
}
function fountainPlant(k) {
  k.add(rbox(0.7, 0.45, 0.7, 0.06), TURQ(), 0, 0.225, 0);
  const m = MAT.paint('#6fb8c8', 0.35);
  for (let i = 0; i < 7; i++) {
    const a = i * 0.9, r = 0.18 + (i % 3) * 0.06;
    k.add(cyl(0.02, 0.03, 1.1, 5), m, Math.sin(a) * r * 0.5, 0.95, Math.cos(a) * r * 0.5, 0, { rz: Math.sin(a) * 0.5, rx: Math.cos(a) * 0.5 });
    k.add(sphere(0.07, 6, 5), MAT.glow('#9fe0ff', '#5fc0e8', 0.6), Math.sin(a) * (r + 0.3), 1.45 - (i % 2) * 0.15, Math.cos(a) * (r + 0.3));
  }
  return { hw: 0.36, hd: 0.36, top: 1.0 };
}

export function buildZTerminalRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'zterminal', ZTERMINAL_AT.x, ZTERMINAL_AT.z);
  const R = B.room, k = B.k;
  const P = ZTERMINAL_PLAN, { W, D, H, LX, BZ, DOORZ, GATEZ, BRDZ, PX0, PX1, PZ1, PH, CX, CZ, AX0, AX1, AZ1, AH } = P;
  R.view = 12.5; R.follow = 0.6; R.music = 'home';
  // (Otringal's pale lilac plaster, lit a little from within; turquoise trim; a pale grey grille floor with lit studs)
  const wallM = M('zt_wall', () => { const t = TEX.plaster('#efe2ee'), m = new THREE.MeshStandardMaterial({ map: t, color: '#f4eaf2', roughness: 0.9, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.22 }); m.userData.tile = 2; return m; });
  const cap = MAT.paint('#d8ccd8', 0.55), floor = MAT.tiles('#c8c4cc', '#b4b0ba', '#3a5a6a', false, 5);
  B.shell({ floor, slab: MAT.rubble('grey'), body: wallM, low: MAT.paint('#bfb2c4', 0.6), rail: TURQ(), cap, H, t: 0.5, dado: 1.0, rimH: 0.45, rimMat: cap, W, D,
    left: [{ at: DOORZ, w: 1.6, h: 2.5, y0: 0, kind: 'door', frame: TURQ() }, { at: GATEZ, w: 1.6, h: 2.5, y0: 0, kind: 'door', frame: TURQ() }] });
  const blocks = MAT.map(blocksTex(), 0.4, { emissive: '#ffffff', emissiveMap: blocksTex(), emissiveIntensity: 0.55 });
  k.add(plane(W - 1.0, 1.0), blocks, 0, H - 1.0, BZ + 0.03);
  for (let x = LX + 0.5; x <= W / 2 - 0.4; x += 3.4) { k.add(rbox(0.36, H - 0.3, 0.2, 0.15), cap, x, (H - 0.3) / 2, BZ + 0.1); k.add(sphere(0.13, 10, 8), ORANGE(), x, H - 0.1, BZ + 0.1); }
  R.exits.push({ x: B.cx + LX + 0.45, z: B.cz + DOORZ, r: 0.8, to: 'zterminal-out' });
  R.exits.push({ x: B.cx + LX + 0.45, z: B.cz + GATEZ, r: 0.8, to: 'zterminal-gate' });
  R.spawn = { x: B.cx + LX + 1.4, z: B.cz + DOORZ, a: Math.PI / 2 };
  R.entries = { gate: { x: B.cx + P.arrivals.x, z: B.cz + P.arrivals.z, a: P.arrivals.a } };
  for (const dz of [-1.15, 1.15]) B.put(LX + 0.6, GATEZ + dz, 0, (kk) => gatePillar(kk));
  k.add(plane(1.3, 0.4), MAT.map(signTex('PAD · TWINSUN'), 0.6), LX + 0.03, 2.8, GATEZ, Math.PI / 2);

  // --- departures (left): the ticket counter on its platform at the back, the board on the left wall, the seats
  k.add(rbox(PX1 - PX0, PH, PZ1 - BZ - 0.3, 0.03), cap, (PX0 + PX1) / 2, PH / 2, (BZ + 0.3 + PZ1) / 2);
  B.col((PX0 + PX1) / 2, (BZ + 0.3 + PZ1) / 2, (PX1 - PX0) / 2 + 0.06, (PZ1 - BZ - 0.3) / 2 + 0.06, PH);
  k.add(rbox(PX1 - PX0, PH / 2, 0.5, 0.02), cap, (PX0 + PX1) / 2, PH / 4, PZ1 + 0.25);
  B.col((PX0 + PX1) / 2, PZ1 + 0.25, (PX1 - PX0) / 2 + 0.06, 0.31, PH / 2);
  k.at(CX, PH, CZ, 0, () => counter(k, { w: P.counterW, d: 0.62, h: 1.08, pal: 'pale', top: MAT.steel() }));
  B.col(CX, CZ, 1.9, 0.33, PH + 1.1, { noStand: true });
  k.add(rbox(3.84, 0.12, 0.08, 0.02), TURQ(), CX, PH + 0.6, CZ + 0.33);
  k.add(rbox(0.36, 0.22, 0.3, 0.04), MAT.paint('#3a3a40', 0.4), P.printer.x, PH + 1.19, P.printer.z);
  k.add(plane(0.2, 0.12), MAT.glow('#9fe0ff', '#5fc0e8', 0.8), P.printer.x, PH + 1.25, P.printer.z + 0.155);
  for (const dx of [-1.1, 1.1]) {
    for (const s of [-0.5, 0.5]) k.add(cyl(0.012, 0.012, 1.2, 4), MAT.steel(), CX + dx + s, H - 0.6, CZ + 0.1);
    k.add(plane(1.4, 0.44), MAT.map(signTex('DEPARTURES', dx < 0 ? 'TICKETS' : 'TWINSUN'), 0.6, { side: THREE.DoubleSide }), CX + dx, H - 1.4, CZ + 0.1);
  }
  k.add(rbox(0.14, 1.7, 3.0, 0.03), MAT.paint('#2a2e36', 0.4), LX + 0.08, 2.35, BRDZ);
  k.add(plane(2.8, 1.5), MAT.map(boardTex('DEPARTURES', [['TWINSUN: CITADEL', 'PAD 1'], ['BY SPACESHIP', ''], ['ISLANDS: SHUTTLE', 'OUTSIDE']]), 0.7, { emissive: '#ffffff', emissiveMap: boardTex('DEPARTURES', [['TWINSUN: CITADEL', 'PAD 1'], ['BY SPACESHIP', ''], ['ISLANDS: SHUTTLE', 'OUTSIDE']]), emissiveIntensity: 0.35 }), LX + 0.16, 2.35, BRDZ, Math.PI / 2);
  const notice = k.mesh(plane(0.62, 0.78), MAT.paper('#f2ead6', '#7a3a8a', 'star'), P.notice.x, 1.75, P.notice.z, Math.PI / 2);
  const seats = [];
  for (const x of P.ROWS) {
    B.put(x, P.ROWZ, -Math.PI / 2, (kk) => seatRow(kk, P.ROWN));
    for (let i = 0; i < P.ROWN; i++) seats.push({ x: B.cx + x - 0.3, z: B.cz + P.ROWZ - 0.6 * (P.ROWN - 1) / 2 + i * 0.6, a: -Math.PI / 2 });
  }
  for (const [x, z] of P.plants.slice(0, 3)) B.put(x, z, 0, (kk) => fountainPlant(kk));

  // --- arrivals (right): the deck 0.8 m up at the back, glass-block front under a railing, a stair down at each end
  k.add(rbox(AX1 - AX0, AH, AZ1 - BZ - 0.3, 0.03), cap, (AX0 + AX1) / 2, AH / 2, (BZ + 0.3 + AZ1) / 2);
  k.add(plane(AX1 - AX0 - 2.4, AH - 0.12), blocks, (AX0 + AX1) / 2, AH / 2, AZ1 + 0.005);
  B.col((AX0 + AX1) / 2, (BZ + 0.3 + AZ1) / 2, (AX1 - AX0) / 2 + 0.06, (AZ1 - BZ - 0.3) / 2 + 0.06, AH);
  const run = P.stair.run, N = P.stair.n, rise = AH / N;
  for (const x of P.stair.xs) for (let i = 0; i < N; i++) {
    const top = rise * (N - i), z = AZ1 + (i + 0.5) * run;
    k.add(rbox(1.2, top, run + 0.02, 0.015), cap, x, top / 2, z);
    B.col(x, z, 0.6, run / 2 + 0.12, top, { stair: true });   // (+0.12: the steps overlap each other and the deck: no seam to drop through)
  }
  k.at(0, AH, 0, 0, () => { for (let x = AX0 + 1.3; x <= AX1 - 1.3; x += 0.9) { k.add(cyl(0.035, 0.035, 0.95, 6), MAT.steel(), x, 0.475, AZ1 - 0.06); k.add(sphere(0.06, 8, 6), TURQ(), x, 0.98, AZ1 - 0.06); } });
  k.add(cyl(0.03, 0.03, AX1 - AX0 - 2.4, 6), MAT.steel(), (AX0 + AX1) / 2, AH + 0.9, AZ1 - 0.06, 0, { rz: Math.PI / 2 });
  B.col((AX0 + AX1) / 2, AZ1 - 0.06, (AX1 - AX0) / 2 - 1.2, 0.06, AH + 1.0, { seeThrough: true, noStand: true });
  // the four lifts to the town along the back wall: ribbed glass shafts, lit rims, a dark car door in each
  for (const { x, z } of P.lifts) {
    for (let r = 0; r < 9; r++) k.add(torus(0.62, 0.035, 5, 20), MAT.paint('#9fb4c4', 0.4), x, AH + 0.25 + r * 0.42, z, 0, { rx: Math.PI / 2 });
    k.add(torus(0.62, 0.06, 6, 22), MAT.glow('#9fe0ff', '#5fc0e8', 0.9), x, AH + 4.0, z, 0, { rx: Math.PI / 2 });
    k.add(cyl(0.58, 0.58, 0.1, 20), MAT.paint('#e8e2ea', 0.5), x, AH + 0.05, z);
    k.add(plane(0.7, 1.9), MAT.flat('#1a1a22', 0.8), x, AH + 1.0, z - 0.3);
    B.ccol(x, z, 0.65, AH + 4.2, { noStand: true });
  }
  k.add(plane(2.6, 1.3), MAT.map(boardTex('ARRIVALS', [['TWINSUN: CITADEL', 'LANDED'], ['- - - - - -', '']]), 0.7, { emissive: '#ffffff', emissiveMap: boardTex('ARRIVALS', [['TWINSUN: CITADEL', 'LANDED'], ['- - - - - -', '']]), emissiveIntensity: 0.35 }), (AX0 + AX1) / 2, H - 2.1, BZ + 0.06);
  // round windows in the right half of the back wall's band are the lifts' glass; a red bench and a plant by the stair
  B.put(P.bench.x, P.bench.z, P.bench.ry, (kk) => { kk.add(rbox(1.6, 0.42, 0.55, 0.12), MAT.paint('#c8452f', 0.5), 0, 0.21, 0); kk.add(rbox(1.6, 0.5, 0.14, 0.08), MAT.paint('#c8452f', 0.5), 0, 0.6, -0.22); return { hw: 0.8, hd: 0.28, top: 0.85 }; });
  for (const [x, z] of P.plants.slice(3)) B.put(x, z, 0, (kk) => fountainPlant(kk));   // (the first clear of the far stair's foot)

  B.light('#fff0e8', 6, 16, -4.5, 4.4, 0.5); B.light('#fff0e8', 5.5, 16, 4.5, 4.6, 0.5); B.light('#bfe6ff', 3, 12, 4.5, 3.5, BZ + 1.2); B.light('#ffd8a0', 2.5, 8, CX, 3.0, CZ + 1);

  Object.assign(ZTERMINAL, {
    door: { x: B.cx + LX + 0.45, z: B.cz + DOORZ },
    gate: { x: B.cx + LX + 0.45, z: B.cz + GATEZ },
    counter: { x: B.cx + CX, z: B.cz + CZ + 0.85, r: 1.0 },
    board: { x: B.cx + LX + 1.6, z: B.cz + BRDZ, r: 1.2 },
    seats,
    npcSpots: Object.fromEntries(['clerk', 'guard', 'porter'].map((k) => [k, { x: B.cx + P[k].x, z: B.cz + P[k].z, a: P[k].a }])),
    arrivals: { ...R.entries.gate },
    notice: { setVisible(b) { notice.visible = !!b; }, get visible() { return notice.visible; } },
  });
  R.npcSpots = ZTERMINAL.npcSpots;
  return { zterminal: B.finish() };
}

// the pavilion on the port's deck: an Esmer house with a turquoise dome, its door toward the bridge's end
export function buildZTerminalOutside(group, physics, Y) {
  const B = new Batch(group);
  const wall = tm('plasterWall', { color: '#f4eaf2', rough: 0.95 }), dome = cm(domeTex('#7a3a8a', '#e0c0f0'), { rough: 0.4 });
  const P = new Place(B, PAV.x, Y, PAV.z, PAV.ry);
  esmerBuilding(P, { w: PAV.w, d: PAV.d, h: PAV.h, wallH: PAV.wallH, wall, domeM: dome, trim: '#7a3a8a', accent: '#f0c040', seed: 77, role: 'store', doorX: PAV.doorX, bury: 0.1 });
  B.build();
  const o = group.position;
  physics.add({ type: 'box', x: o.x + PAV.x, z: o.z + PAV.z, hw: PAV.d / 2 - 0.05, hd: PAV.w / 2 - 0.05, top: Y + PAV.h, noStand: true });
}
// the pavilion's door leads in (Zeelich's region); out again 1.2 m before it; through the gate onto the pad's walkway
export function zterminalDoors() {
  return [{ house: 'zport', x: ZEELICH.x + DOOR.x - 0.35, z: ZEELICH.z + DOOR.z, r: 0.9, room: 'zterminal', region: 'zeelich' }];
}
export function zterminalExit(to) {
  if (to === 'zterminal-out') return { room: 'zeelich', x: ZEELICH.x + DOOR.x - 1.2, z: ZEELICH.z + DOOR.z, a: -Math.PI / 2 };
  if (to === 'zterminal-gate') return { room: 'zeelich', x: ZEELICH.x + LANDING.x, z: ZEELICH.z + LANDING.z, a: LANDING.a };
  return null;
}
