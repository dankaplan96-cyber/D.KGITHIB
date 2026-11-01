// LBA-CITADEL-8 (night mode: "work to the plan"): the baggage claim, after LBA2's scene 5. In LBA2 its door is where
// our 'bug' house stands in Bug Street (WORLD-80 step 2 placed it for that door); the house had no inside.
// Our own geometry, from a study of the original's layout (numbers and descriptions only; nothing copied):
//   - a long building of about 16 × 44 of the original's cells (≈ 7.8 × 21 m) of pale grey stone blocks on two levels
//   - as the game's camera sees it, from the back: the claim hall, 1.5 m up, with the luggage belt along the back wall,
//     red benches beside it, cardboard boxes and dark teal crates in the corner, a small window; a wall with two stone
//     arches; the office (a table with papers, a red stool, crates); the upper level's edge with a teal balustrade and
//     white globe lamps; a stair down at the left to the lower front hall: barrels, a small railed platform, black
//     arrows on the floor pointing the way, the door at the front of the left wall
// Twelve years on (ours): the belt carries parcels for and from Zeelich now (teal cargo crates with brass bands among
// the cases); a notice board for unclaimed parcels by the stair.
//
// CONTRACT
//   BAGGAGE_AT                 where the room stands (regions.js)
//   buildBaggageRoom(scene, physics) → { baggage }   (regions.js group 'baggage')
//   baggageDoors(W) / baggageExit(to, W)   the 'bug' house's door leads in; 'baggage-out' leads back out before it
//   R.npcSpots.clerk            at the office table (the story layer may put the clerk there)
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { MAT, M, TEX, rbox, plane, cyl, sphere, lathe, railing, noticeBoard } from './props.js';

export const BAGGAGE_AT = { x: 8200, z: 0 };

const RED = () => MAT.paint('#b0302c', 0.45), TEAL = () => MAT.paint('#2f6f74', 0.5), METAL = () => MAT.paint('#cfcdd6', 0.35), DARK = () => MAT.paint('#7c7a86', 0.4);

function bench(k) {   // a red padded bench on chrome legs
  k.add(rbox(1.6, 0.16, 0.5, 0.08), RED(), 0, 0.45, 0);
  k.add(rbox(1.6, 0.4, 0.14, 0.07), RED(), 0, 0.72, -0.2);
  for (const sx of [-0.65, 0.65]) k.add(cyl(0.03, 0.03, 0.4, 6), MAT.steel(), sx, 0.2, 0);
  return { hw: 0.8, hd: 0.28, top: 0.9 };
}
function crate(k, s = 0.7, zeelich = false) {
  k.add(rbox(s, s, s, 0.02), MAT.paint(zeelich ? '#2f8a9a' : '#2c4a4c', 0.7), 0, s / 2, 0);
  for (const y of [0.14, s - 0.14]) k.add(rbox(s + 0.02, 0.05, s + 0.02, 0.01), zeelich ? MAT.brass() : MAT.paint('#1e3436', 0.7), 0, y, 0);
  return { hw: s / 2, hd: s / 2, top: s };
}
function drum(k) {
  k.add(lathe([[0.001, 0], [0.3, 0], [0.33, 0.1], [0.34, 0.45], [0.33, 0.8], [0.3, 0.9], [0.001, 0.9]], 14), MAT.paint('#8a8892', 0.35), 0, 0, 0);
  k.add(cyl(0.26, 0.26, 0.03, 14), MAT.paint('#8a3a2a', 0.6), 0, 0.91, 0);
  return { r: 0.34, top: 0.92 };
}
// the luggage belt: a long table of rollers on two drums, cases riding on it
function belt(k, w) {
  for (const sx of [-1, 1]) k.add(cyl(0.22, 0.22, 0.7, 14), DARK(), sx * (w / 2 - 0.3), 0.35, 0);
  k.add(rbox(w, 0.1, 1.0, 0.03), METAL(), 0, 0.75, 0);
  for (let i = 0; i < Math.floor(w / 0.22); i++) k.add(cyl(0.035, 0.035, 0.95, 8), MAT.steel(), -w / 2 + 0.15 + i * 0.22, 0.82, 0, 0, { rx: Math.PI / 2 });
  return { hw: w / 2, hd: 0.5, top: 0.85 };
}
// a short post with a white globe
function postLamp(k) {
  k.add(cyl(0.035, 0.045, 0.9, 8), TEAL(), 0, 0.45, 0);
  k.add(sphere(0.16, 14, 10), MAT.glow('#fff8ee', '#ffe8c0', 1.2), 0, 1.0, 0);
}

export function buildBaggageRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'baggage', BAGGAGE_AT.x, BAGGAGE_AT.z);
  const R = B.room, k = B.k;
  const W = 7.8, D = 21, H = 5.0;
  R.view = 18; R.follow = 0.35; R.music = 'home';
  // (the tavern's pale grey blocks: Citadel's stone inside)
  const stone = M('tv_stone', () => { const t = TEX.stone('grey'), m = new THREE.MeshStandardMaterial({ map: t, color: '#e6e4ea', roughness: 0.9, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.32 }); m.userData.tile = 2; return m; });
  const rough = MAT.rubble('grey'), cap = MAT.stone('grey', 1.4), floor = MAT.tiles('#a7a5a0', '#9a9893', '#3c3c40', false, 6);
  const LX = -W / 2, BZ = -D / 2, UY = 1.5, UZ1 = 1.0, DOORZ = 8.6;
  B.shell({ floor, slab: rough, body: stone, low: stone, rail: MAT.iron(), cap, H, t: 0.55, dado: 1.0, rimH: 0.45, rimMat: rough, W, D,
    left: [{ at: DOORZ, w: 1.4, h: 2.5, y0: 0, kind: 'door' }, { kind: 'window', at: -8.4, w: 0.8, h: 0.9, y0: UY + 1.1 }] });
  R.exits.push({ x: B.cx + LX + 0.45, z: B.cz + DOORZ, r: 0.8, to: 'baggage-out' });
  R.spawn = { x: B.cx + LX + 1.4, z: B.cz + DOORZ, a: Math.PI / 2 };

  // --- the upper level: the claim hall and the office, 1.5 m up over the back of the building
  k.add(rbox(W, UY, UZ1 - BZ, 0.02), stone, 0, UY / 2, (BZ + UZ1) / 2);
  k.add(rbox(W + 0.04, 0.12, UZ1 - BZ + 0.04, 0.02), cap, 0, UY - 0.06, (BZ + UZ1) / 2);
  k.add(plane(W - 0.1, UZ1 - BZ - 0.1), floor, 0, UY + 0.004, (BZ + UZ1) / 2, 0, { rx: -Math.PI / 2 });
  B.col(0, (BZ + UZ1) / 2, W / 2, (UZ1 - BZ) / 2, UY);
  // the stair down at the left, from the upper level's edge to the front hall
  const SX0 = LX + 0.15, SX1 = LX + 1.55, N = 5, run = 0.52, rise = UY / N;
  for (let i = 0; i < N; i++) {
    const top = rise * (N - i), z = UZ1 + (i + 0.5) * run;
    k.add(rbox(SX1 - SX0, top, run + 0.02, 0.015), stone, (SX0 + SX1) / 2, top / 2, z);
    k.add(rbox(SX1 - SX0 + 0.04, 0.05, run + 0.04, 0.01), cap, (SX0 + SX1) / 2, top - 0.025, z);
    B.col((SX0 + SX1) / 2, z, (SX1 - SX0) / 2, run / 2 + 0.08, top, { stair: true });   // (+0.08: the steps overlap under groundAt's 5 cm shrink)
  }
  // the balustrade along the upper level's edge (open over the stair), the stair's own rail, globe lamps at the ends
  k.at(0, UY, 0, 0, () => railing(k, [[SX1 + 0.05, UZ1 - 0.06], [W / 2 - 0.1, UZ1 - 0.06]], { h: 0.95, mat: TEAL(), step: 0.42 }));
  B.col((SX1 + W / 2) / 2, UZ1 - 0.06, (W / 2 - SX1) / 2, 0.06, UY + 1.0, { seeThrough: true, noStand: true });
  railing(k, [[SX1 + 0.05, UZ1], [SX1 + 0.05, UZ1 + N * run]], { h: 0.95 + UY / 2, mat: TEAL(), step: 0.45 });
  B.col(SX1 + 0.05, UZ1 + N * run / 2, 0.06, N * run / 2, UY + 1.0, { seeThrough: true, noStand: true });
  for (const x of [SX1 + 0.05, W / 2 - 0.15]) k.at(x, UY, UZ1 - 0.06, 0, () => postLamp(k));
  // the wall with two arches between the office and the claim hall
  const AZ = -4.5, AT = 0.5, archs = [{ x: -1.5, w: 1.2 }, { x: 2.0, w: 1.2 }], AH = 2.3, WH = H - UY;
  let x0 = LX;
  for (const a of archs.concat([{ x: W / 2 + 0.6, w: 1.2 }])) {
    const x1 = a.x - a.w / 2; if (x1 - x0 > 0.05) { k.add(rbox(x1 - x0, WH, AT, 0.02), stone, (x0 + x1) / 2, UY + WH / 2, AZ); B.col((x0 + x1) / 2, AZ, (x1 - x0) / 2, AT / 2, H); }
    if (a.x < W / 2) {
      k.add(rbox(a.w, WH - AH, AT, 0.02), stone, a.x, UY + AH + (WH - AH) / 2, AZ);
      k.add(new THREE.TorusGeometry(a.w / 2, 0.09, 6, 14, Math.PI), cap, a.x, UY + AH - a.w / 2 + 0.05, AZ + AT / 2 + 0.02);
    }
    x0 = a.x + a.w / 2;
  }
  // --- the claim hall: the belt along the back wall with cases and Zeelich parcels on it, red benches, boxes and crates
  k.at(1.4, UY, BZ + 0.8, 0, () => { belt(k, 4.0); const cases = [[-1.4, '#7a4a2a'], [-0.6, '#2f8a9a'], [0.3, '#a8302a'], [1.1, '#2f8a9a']]; cases.forEach(([x, c]) => k.add(rbox(0.5, 0.3, 0.38, 0.04), MAT.paint(c, 0.55), x, 1.0, 0)); });
  B.col(1.4, BZ + 0.8, 2.0, 0.5, UY + 0.9, { noStand: true });
  B.put(-2.4, BZ + 0.55, 0, (kk) => bench(kk), { y: UY });
  B.put(3.3, -6.6, -Math.PI / 2, (kk) => bench(kk), { y: UY });
  B.put(LX + 0.55, -6.2, 0, (kk) => { kk.add(rbox(0.6, 0.5, 0.5, 0.02), MAT.paint('#b88a5a', 0.8), 0, 0.25, 0); kk.add(rbox(0.55, 0.45, 0.45, 0.02), MAT.paint('#c89a6a', 0.8), 0.02, 0.73, 0); kk.add(rbox(0.5, 0.4, 0.4, 0.02), MAT.paint('#b88a5a', 0.8), -0.03, 1.15, 0); return { hw: 0.3, hd: 0.25, top: 1.35 }; }, { y: UY });
  B.put(LX + 1.35, -6.4, 0.1, (kk) => crate(kk, 0.7, true), { y: UY });
  // --- the office: the table with papers and a red stool, crates by the right wall
  B.put(0.4, -1.6, 0.05, (kk) => { kk.add(rbox(1.3, 0.05, 0.8, 0.01), METAL(), 0, 0.76, 0); for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) kk.add(cyl(0.025, 0.025, 0.74, 6), DARK(), sx * 0.58, 0.37, sz * 0.34); for (let i = 0; i < 3; i++) kk.add(rbox(0.24, 0.01, 0.32, 0.003), MAT.paint(['#f2ead6', '#e8d8a8', '#f2ead6'][i], 0.7), -0.3 + i * 0.05, 0.79 + i * 0.01, 0.05); return { hw: 0.65, hd: 0.4, top: 0.8 }; }, { y: UY });
  B.put(0.5, -0.8, 0, (kk) => { kk.add(lathe([[0.001, 0], [0.19, 0], [0.2, 0.04], [0.17, 0.09], [0.001, 0.1]], 14), RED(), 0, 0.55, 0); kk.add(cyl(0.035, 0.035, 0.55, 8), MAT.steel(), 0, 0.275, 0); return { r: 0.22, top: 0.65 }; }, { y: UY });
  for (const [x, z] of [[3.2, -3.4], [3.2, -2.5]]) B.put(x, z, 0, (kk) => crate(kk, 0.7), { y: UY });
  R.npcSpots = { clerk: { x: B.cx + 0.4, z: B.cz - 2.5, a: 0 } };
  // --- the front hall: barrels, a small railed platform with a lamp, the black arrows on the floor, the notice board
  for (const [x, z] of [[-2.7, 5.4], [-2.0, 5.9]]) B.put(x, z, 0, (kk) => drum(kk));
  k.add(rbox(2.6, 0.9, 2.6, 0.02), stone, 2.5, 0.45, 4.2); k.add(rbox(2.64, 0.08, 2.64, 0.02), cap, 2.5, 0.88, 4.2);
  B.col(2.5, 4.2, 1.3, 1.3, 0.9);
  k.at(0, 0.9, 0, 0, () => railing(k, [[1.25, 5.45], [1.25, 2.95], [3.75, 2.95]], { h: 0.9, mat: TEAL(), step: 0.45 }));
  k.at(3.5, 0.9, 5.2, 0, () => postLamp(k));
  B.put(2.2, 4.3, 0, (kk) => crate(kk, 0.7), { y: 0.9 });
  const arrow = (x, z, a) => { const s = new THREE.Shape(); s.moveTo(-0.15, -0.35); s.lineTo(0.15, -0.35); s.lineTo(0.15, 0.05); s.lineTo(0.32, 0.05); s.lineTo(0, 0.4); s.lineTo(-0.32, 0.05); s.lineTo(-0.15, 0.05); s.closePath(); k.add(new THREE.ShapeGeometry(s), MAT.paint('#26262c', 0.6), x, 0.012, z, a, { rx: -Math.PI / 2 }); };
  arrow(-1.4, 8.2, Math.PI / 2); arrow(-0.6, 6.4, Math.PI); arrow(-2.4, 4.6, Math.PI);
  k.at(SX1 + 0.12, 1.35, 3.0, -Math.PI / 2, () => noticeBoard(k, 0.7, 0.5, 19));
  // wall lamps on the long wall
  for (const z of [-8.0, -2.0, 5.0]) { k.add(sphere(0.15, 12, 8), MAT.glow('#fff4e0', '#ffd890', 1.0), LX + 0.12, z > 1 ? 2.4 : UY + 2.2, z); }
  B.light('#ffe8c8', 5, 11, 0.5, UY + 3.0, -7.0); B.light('#ffe8c8', 4.5, 10, 0.5, UY + 3.0, -1.5); B.light('#ffe8c8', 5, 11, 0.0, 3.6, 6.0);
  return { baggage: B.finish() };
}

// the 'bug' house's door leads in; coming out, Twinsen stands 1.2 m before it, facing away
export function baggageDoors(W) {
  const h = W?.houses?.find((x) => x.id === 'bug');
  return h?.door ? [{ house: 'bug', x: h.door.x, z: h.door.z, r: 0.9, room: 'baggage' }] : [];
}
export function baggageExit(to, W) {
  if (to !== 'baggage-out') return null;
  const h = W?.houses?.find((x) => x.id === 'bug'); if (!h?.door) return null;
  return { x: h.door.x + Math.sin(h.ry) * 1.2, z: h.door.z + Math.cos(h.ry) * 1.2, a: h.ry };
}
