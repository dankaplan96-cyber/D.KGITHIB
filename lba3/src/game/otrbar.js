// ZEELICH-1 item 1 (the cloud's order; OP-7 "The Lift Below" is set here): the harbour bar at Otringal, after LBA2's
// scene 136, about 80 % alike. Our own geometry, from a study of the originals'
// layout (numbers and descriptions only; nothing copied). Its door: the domed house by the harbour pier on Otringal's
// lower west terrace (zislands.js: the house at local (−42.2, −0.4), its door facing the island's middle).
// As the game's camera sees it:
//   - sky-blue walls with a band of white clouds over a dark stone dado, a floor of grey octagons with teal insets
//   - the stage at the back right, 0.9 m up, two orange curtains in its frame, footlights along its edge; high on the
//     frame the curtain's winch (stuck: OP-7's ball target)
//   - green leather booths with their tables on a raised floor at the back left behind turned balusters, a stair down,
//     two slot machines against the left wall; more booths in the middle
//   - the L-shaped bar at the front left (a green top, bottles and urns, stools), the aquarium with its sullen creature
//     in the middle right, tall leaf plants, globe sconces, two framed pictures
//   - the door from the harbour in the left wall; a back door (staff only) beside the stage
// (Its boss's office, after scene 137, was cut by DECLUTTER, 3.11.2026: an empty second room. The door stays, staff only.)
//
// CONTRACT (world coordinates)
//   OTRBAR_AT                            where the room stands (regions.js)
//   buildOtrBarRoom(scene, physics) → { otrbar }
//   otrBarDoors() / otrBarExit(to)       the harbour house's door leads in (region isle_otringal; found in the island's
//                                        building list, so there is no door until the island is built); 'otrbar-out'
//   BAR (filled when the bar is built):
//     npcSpots {boss, performer, bouncer1, bouncer2, regular1, regular2, regular3} {x,z,a}
//     stage {x,z}  (its middle, on the boards: the performer's place)      office {x,z} (the office door's spot)
//     counter {x,z,r}  (a search spot behind the bar)                       winch {x,y,z,r}  (a ball target, high)
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { MAT, M, TEX, rbox, plane, cyl, sphere, lathe, canvasTex, table, counter, jar, pottedPlant, railing } from './props.js';
import { FIT } from './worldfit.js';

export const OTRBAR_AT = { x: 9000, z: 0 };
export const BAR = {};

const GREEN = () => MAT.flat('#1f6a52', 0.45, { emissive: '#06140f' }), WOOD = () => MAT.paint('#8a4a2a', 0.5);
// the walls above the dado: sky blue with a band of white clouds along their foot
const skyTex = () => canvasTex(512, 256, (x, W, H) => {
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a7ab8'); g.addColorStop(1, '#5ab0e0'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  let s = 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.08})`; x.fillRect(r() * W, r() * H * 0.6, 3, 3); }
  x.fillStyle = '#f4f8fc';
  for (let i = 0; i < 16; i++) { const cx = i * 36 + r() * 10, cy = H - 30 - r() * 30; for (let j = 0; j < 4; j++) { x.beginPath(); x.arc(cx + j * 12, cy + (j % 2) * 8, 16 + r() * 10, 0, 7); x.fill(); } }
  x.fillRect(0, H - 24, W, 24);
});
const sign = () => canvasTex(512, 160, (x, W, H) => {
  x.clearRect(0, 0, W, H); x.fillStyle = '#f0b830'; x.font = 'italic bold 92px serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Kingo', W / 2, 70);
  x.font = 'bold 34px sans-serif'; x.fillText('HARBOUR BAR', W / 2, 135);
});

// a booth: a green leather bench with a high back, facing +z
function booth(k, w = 1.6) {
  k.add(rbox(w, 0.42, 0.6, 0.1), GREEN(), 0, 0.21, 0);
  k.add(rbox(w, 0.9, 0.24, 0.12), GREEN(), 0, 0.82, -0.3);
  for (const sx of [-1, 1]) k.add(rbox(0.12, 0.7, 0.6, 0.05), GREEN(), sx * (w / 2 - 0.06), 0.35, 0);
  return { hw: w / 2, hd: 0.42, top: 1.27 };
}
// a square green-topped table on a dark pedestal
function barTable(k) {
  k.add(rbox(0.9, 0.05, 0.9, 0.02), GREEN(), 0, 0.76, 0);
  k.add(cyl(0.06, 0.08, 0.74, 8), MAT.paint('#2a2a30', 0.5), 0, 0.37, 0);
  k.add(cyl(0.3, 0.32, 0.03, 12), MAT.paint('#2a2a30', 0.5), 0, 0.015, 0);
  jar(k, 0.15, 0.78, -0.1, 'bottle', '#c84a7a', 0.6);
  return { hw: 0.45, hd: 0.45, top: 0.8 };
}
// a slot machine: a rounded dark cabinet, a lit window, red buttons
function slotMachine(k) {
  k.add(rbox(0.7, 1.5, 0.5, 0.12), MAT.paint('#2a3a44', 0.4), 0, 0.75, 0);
  k.add(plane(0.46, 0.4), MAT.glow('#9fe0ff', '#4fa8d8', 0.9), 0, 1.15, 0.255);
  for (let i = 0; i < 3; i++) k.add(sphere(0.045, 8, 6), MAT.glow('#ff5a3a', '#ff2a10', 1.2), -0.15 + i * 0.15, 0.78, 0.26);
  return { hw: 0.36, hd: 0.26, top: 1.5 };
}
// a tall leaf plant in a dark pot (LBA2's)
function leafPlant(k) {
  k.add(lathe([[0.001, 0], [0.24, 0], [0.3, 0.32], [0.27, 0.38], [0.001, 0.38]], 12), MAT.paint('#2a2a30', 0.5), 0, 0, 0);
  for (let i = 0; i < 3; i++) k.add(sphere(0.5, 8, 6), MAT.paint('#2f7a4a', 0.6), (i - 1) * 0.08, 0.95 + i * 0.12, 0, i * 1.1, { sx: 0.26, sy: 1.4, sz: 0.1 });
  return { r: 0.3, top: 1.7 };
}
// the aquarium: a dark-red base, a glass tank with greenish water, a sullen creature in it
function aquarium(k) {
  k.add(rbox(2.0, 0.5, 1.3, 0.12), MAT.paint('#6a1a14', 0.45), 0, 0.25, 0);
  k.add(rbox(1.9, 0.9, 1.2, 0.06), MAT.glass('#5ab89a', 0.35), 0, 0.95, 0);
  for (const sz of [-1, 1]) k.add(rbox(1.96, 0.06, 0.08, 0.02), MAT.paint('#6a1a14', 0.45), 0, 1.42, sz * 0.6);   // (an open rim, not a lid)
  for (const sx of [-1, 1]) k.add(rbox(0.08, 0.06, 1.26, 0.02), MAT.paint('#6a1a14', 0.45), sx * 0.96, 1.42, 0);
  const cr = MAT.paint('#4a5a3a', 0.6);
  k.add(sphere(0.3, 10, 8), cr, -0.1, 0.85, 0, 0, { sx: 1.4, sy: 0.8, sz: 1 });
  k.add(sphere(0.16, 8, 6), cr, 0.35, 1.0, 0.05);
  for (const sx of [-1, 1]) k.add(sphere(0.04, 6, 4), MAT.glow('#e8e070', '#c8b040', 0.8), 0.45, 1.06, sx * 0.08);
  return { hw: 1.0, hd: 0.65, top: 1.45 };
}

export function buildOtrBarRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'otrbar', OTRBAR_AT.x, OTRBAR_AT.z);
  const R = B.room, k = B.k;
  const W = 20, D = 14, H = 5.6;
  R.view = 12.5; R.follow = 0.6; R.music = 'home';
  const sky = M('ob_sky', () => { const t = skyTex(), m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.3 }); return m; });
  const darkStone = MAT.rubble('slate'), cap = MAT.paint('#3a3e44', 0.5);
  const floor = MAT.tiles('#c4c6c8', '#3a8a9a', '#5a5e64', true, 6);
  const LX = -W / 2, BZ = -D / 2, DOORZ = 1.8, UH = 0.6;
  B.shell({ floor, slab: darkStone, body: sky, low: darkStone, rail: WOOD(), cap, H, t: 0.5, dado: 1.6, rimH: 0.5, rimMat: cap, W, D,
    left: [{ at: DOORZ, w: 1.6, h: 2.6, y0: 0, kind: 'door', frame: WOOD() }, { kind: 'window', at: -4.6, w: 1.4, h: 1.2, y0: UH + 1.4 }] });
  R.exits.push({ x: B.cx + LX + 0.45, z: B.cz + DOORZ, r: 0.8, to: 'otrbar-out' });
  R.spawn = { x: B.cx + LX + 1.4, z: B.cz + DOORZ, a: Math.PI / 2 };
  // the bar's name in gold letters high on the back wall
  k.add(plane(2.6, 0.82), MAT.map(sign(), 0.5, { transparent: true, emissive: '#f0b830', emissiveIntensity: 0.4 }), -2.0, H - 1.0, BZ + 0.03);

  // --- the raised floor at the back left with its booths, behind turned balusters; a stair down at its front
  const UX1 = -1.4, UZ1 = BZ + 4.0;
  k.add(rbox(UX1 - LX, UH, UZ1 - BZ, 0.03), darkStone, (LX + UX1) / 2, UH / 2, (BZ + UZ1) / 2);
  k.add(rbox(UX1 - LX - 0.06, 0.02, UZ1 - BZ - 0.06, 0.01), floor, (LX + UX1) / 2, UH + 0.005, (BZ + UZ1) / 2);
  B.col((LX + UX1) / 2, (BZ + UZ1) / 2, (UX1 - LX) / 2 + 0.06, (UZ1 - BZ) / 2 + 0.06, UH);
  for (const x of [-8.0, -5.4]) { B.put(x, BZ + 0.6, 0, (kk) => booth(kk, 1.8), { y: UH }); B.put(x, BZ + 1.75, 0, (kk) => barTable(kk), { y: UH }); }
  B.put(-2.8, BZ + 0.6, 0, (kk) => booth(kk, 1.8), { y: UH }); B.put(-2.8, BZ + 1.75, 0, (kk) => barTable(kk), { y: UH });
  const SX0 = -6.6, SX1 = -4.8, N = 3, run = 0.42;   // (the stair down at the raised floor's front)
  for (let i = 0; i < N; i++) {
    const tp = UH * (N - i) / (N + 1), z = UZ1 + (i + 0.5) * run;
    k.add(rbox(SX1 - SX0, tp, run + 0.02, 0.015), darkStone, (SX0 + SX1) / 2, tp / 2, z);
    B.col((SX0 + SX1) / 2, z, (SX1 - SX0) / 2, run / 2 + 0.12, tp, { stair: true });   // (+0.12: no seam to drop through)
  }
  const bal = (pts) => k.at(0, UH, 0, 0, () => railing(k, pts, { h: 0.9, mat: WOOD(), step: 0.22 }));
  bal([[LX + 0.2, UZ1 + 0.05], [SX0 - 0.05, UZ1 + 0.05]]); bal([[SX1 + 0.05, UZ1 + 0.05], [UX1 + 0.05, UZ1 + 0.05], [UX1 + 0.05, BZ + 0.3]]);
  B.col((LX + SX0) / 2, UZ1 + 0.05, (SX0 - LX) / 2, 0.06, UH + 1.0, { seeThrough: true, noStand: true });
  B.col((SX1 + UX1) / 2, UZ1 + 0.05, (UX1 - SX1) / 2, 0.06, UH + 1.0, { seeThrough: true, noStand: true });
  B.col(UX1 + 0.05, (BZ + UZ1) / 2, 0.06, (UZ1 - BZ) / 2, UH + 1.0, { seeThrough: true, noStand: true });
  for (const z of [UZ1 - 1.0]) B.put(LX + 0.45, z, Math.PI / 2, (kk) => slotMachine(kk), { y: UH });
  B.put(LX + 0.45, UZ1 + 1.4, Math.PI / 2, (kk) => slotMachine(kk));

  // --- the stage at the back right: boards 0.9 m up, two orange curtains in its frame, footlights, the winch
  const GX0 = 2.6, GX1 = W / 2 - 0.4, GZ1 = BZ + 4.2, GH = 0.9;
  k.add(rbox(GX1 - GX0, GH, GZ1 - BZ - 0.3, 0.03), MAT.wood('dark'), (GX0 + GX1) / 2, GH / 2, (BZ + 0.3 + GZ1) / 2);
  k.add(rbox(GX1 - GX0, 0.02, GZ1 - BZ - 0.32, 0.01), MAT.planks('honey'), (GX0 + GX1) / 2, GH + 0.005, (BZ + 0.3 + GZ1) / 2);
  B.col((GX0 + GX1) / 2, (BZ + 0.3 + GZ1) / 2, (GX1 - GX0) / 2 + 0.06, (GZ1 - BZ - 0.3) / 2 + 0.06, GH);
  for (let i = 0; i < 3; i++) { const z = GZ1 + (i + 0.5) * 0.4, tp = GH * (3 - i) / 3; k.add(rbox(1.8, tp, 0.42, 0.015), MAT.wood('dark'), GX0 + 1.2, tp / 2, z); B.col(GX0 + 1.2, z, 0.9, 0.2 + 0.12, tp, { stair: true }); }
  const curtain = MAT.flat('#e0703a', 0.7, { emissive: '#3a1408' });
  for (const sx of [-1, 1]) {
    const cx = (GX0 + GX1) / 2 + sx * 2.1;
    for (let i = 0; i < 6; i++) k.add(cyl(0.09, 0.09, 3.3, 8), curtain, cx + (i - 2.5) * 0.17, GH + 1.65, BZ + 1.6 + Math.sin(i) * 0.05);
  }
  const FH = GH + 3.6;
  for (const x of [GX0 + 0.2, GX1 - 0.2]) { k.add(rbox(0.22, FH, 0.22, 0.03), MAT.paint('#2a2a30', 0.5), x, FH / 2, BZ + 1.6); B.col(x, BZ + 1.6, 0.11, 0.11, FH, { noStand: true }); }
  k.add(rbox(GX1 - GX0, 0.26, 0.24, 0.03), MAT.paint('#2a2a30', 0.5), (GX0 + GX1) / 2, FH - 0.1, BZ + 1.6);
  // the curtain's winch: a drum with a crank on the frame's right post, high up (the ball must free it)
  const WX = GX1 - 0.55, WY = FH - 0.5, WZ = BZ + 1.75;
  k.add(cyl(0.16, 0.16, 0.36, 12), MAT.iron(), WX, WY, WZ, 0, { rz: Math.PI / 2 });
  k.add(rbox(0.04, 0.3, 0.04, 0.01), MAT.brass(), WX + 0.22, WY - 0.1, WZ + 0.1);
  for (let i = 0; i < 4; i++) { const x = GX0 + 0.8 + i * ((GX1 - GX0 - 1.6) / 3); k.add(cyl(0.1, 0.13, 0.12, 10), MAT.iron(), x, GH + 0.06, GZ1 - 0.15); k.add(sphere(0.08, 8, 6), MAT.glow('#fff4d8', '#ffd890', 1.2), x, GH + 0.14, GZ1 - 0.12); }
  // the back door between the raised floor and the stage (staff only: DECLUTTER cut the empty office behind it, 3.11.2026)
  const OX = 1.0;
  k.add(rbox(1.3, 2.4, 0.12, 0.02), MAT.flat('#14141a', 0.9), OX, 1.2, BZ + 0.08);
  for (const sx of [-1, 1]) k.add(rbox(0.14, 2.5, 0.16, 0.02), WOOD(), OX + sx * 0.72, 1.25, BZ + 0.1);
  k.add(rbox(1.6, 0.16, 0.16, 0.02), WOOD(), OX, 2.52, BZ + 0.1);

  // --- the middle: booths in a row, the aquarium, plants
  for (const x of [-3.2, 0.2]) { B.put(x, 0.4, 0, (kk) => booth(kk, 1.8)); B.put(x, 1.55, 0, (kk) => barTable(kk)); }
  B.put(4.6, 1.6, 0, (kk) => aquarium(kk));
  for (const [x, z] of [[LX + 0.6, D / 2 - 0.6], [-1.6, UZ1 + 0.6], [W / 2 - 0.6, D / 2 - 0.6], [W / 2 - 0.6, GZ1 + 1.6]]) B.put(x, z, 0, (kk) => leafPlant(kk));

  // --- the L-shaped bar at the front left: the green top, bottles and urns, stools along it
  const BX0 = -7.4, BX1 = -2.8, BZB = 4.6;   // (the long arm along x, the short one down toward the front)
  k.at((BX0 + BX1) / 2, 0, BZB, 0, () => counter(k, { w: BX1 - BX0, d: 0.7, h: 1.05, pal: 'dark', top: GREEN() }));
  B.col((BX0 + BX1) / 2, BZB, (BX1 - BX0) / 2, 0.36, 1.08, { noStand: true });
  k.at(BX1 - 0.35, 0, BZB + 1.05, Math.PI / 2, () => counter(k, { w: 1.4, d: 0.7, h: 1.05, pal: 'dark', top: GREEN() }));
  B.col(BX1 - 0.35, BZB + 1.05, 0.36, 0.7, 1.08, { noStand: true });
  [[-6.8, 'urn', '#f2ead6'], [-6.4, 'urn', '#f2ead6'], [-5.2, 'bottle', '#3a7a8a'], [-4.2, 'urn', '#f2ead6'], [-3.6, 'bottle', '#c84a7a']].forEach(([x, kind, c]) => jar(k, x, 1.06, BZB, kind, c, 1.1));
  for (let i = 0; i < 5; i++) B.put(BX0 + 0.6 + i * 0.9, BZB + 0.8, 0, (kk) => { kk.add(cyl(0.18, 0.18, 0.06, 12), GREEN(), 0, 0.66, 0); kk.add(cyl(0.035, 0.035, 0.64, 6), MAT.steel(), 0, 0.32, 0); return { r: 0.2, top: 0.72 }; });
  for (const y of [1.7, 2.2]) k.add(rbox(4.0, 0.05, 0.28, 0.01), WOOD(), (BX0 + BX1) / 2, y, BZB - 1.6);
  k.add(rbox(4.2, 2.6, 0.18, 0.04), cap, (BX0 + BX1) / 2, 1.3, BZB - 1.75);
  B.col((BX0 + BX1) / 2, BZB - 1.75, 2.1, 0.09, 2.6, { noStand: true });
  for (let i = 0; i < 8; i++) jar(k, BX0 + 0.3 + i * 0.5, 1.73, BZB - 1.6, i % 3 ? 'bottle' : 'urn', ['#3a7a8a', '#c84a7a', '#e8b84a', '#2f8a7a'][i % 4], 0.9);

  // --- the walls: globe sconces, two framed pictures
  for (const z of [-5.0, -1.0, 3.4]) { k.add(sphere(0.16, 12, 8), MAT.glow('#fff4e0', '#ffd890', 1.0), LX + 0.15, 2.6, z); }
  for (const x of [-7.0, 6.6]) k.add(sphere(0.16, 12, 8), MAT.glow('#fff4e0', '#ffd890', 1.0), x, 2.6, BZ + 0.15);
  k.add(rbox(0.06, 1.1, 0.8, 0.02), MAT.brass(), LX + 0.04, 2.5, -2.6); k.add(plane(0.66, 0.96), MAT.paper('#d8e4f0', '#2a3a5a', 'star'), LX + 0.08, 2.5, -2.6, Math.PI / 2);

  B.light('#fff0d8', 6, 16, -4.0, 4.4, 0.0); B.light('#ffe0c0', 5, 14, 5.6, 4.0, -3.0); B.light('#ffd8a0', 3, 9, -5.0, 2.8, 4.0); B.light('#bfe6ff', 2, 6, 4.6, 1.6, 1.6);

  Object.assign(BAR, {
    stage: { x: B.cx + (GX0 + GX1) / 2, z: B.cz + BZ + 2.6 },
    office: { x: B.cx + OX, z: B.cz + BZ + 0.45 },
    counter: { x: B.cx + (BX0 + BX1) / 2, z: B.cz + BZB - 0.9, r: 1.0 },
    winch: { x: B.cx + WX, y: WY, z: B.cz + WZ, r: 0.35 },
    npcSpots: {
      boss: { x: B.cx - 2.8, z: B.cz + BZ + 0.75, a: 0 },                      // in the raised floor's corner booth
      performer: { x: B.cx + (GX0 + GX1) / 2, z: B.cz + BZ + 2.6, a: 0 },
      bouncer1: { x: B.cx + OX - 1.1, z: B.cz + BZ + 1.0, a: 0.4 },              // either side of the office door
      bouncer2: { x: B.cx + OX + 1.1, z: B.cz + BZ + 1.0, a: -0.4 },
      regular1: { x: B.cx + BX0 + 1.5, z: B.cz + BZB + 0.85, a: Math.PI },       // on the bar's stools
      regular2: { x: B.cx + BX0 + 3.3, z: B.cz + BZB + 0.85, a: Math.PI },
      regular3: { x: B.cx + 0.2, z: B.cz + 0.5, a: 0 },                         // in the middle booth
    },
  });
  R.npcSpots = BAR.npcSpots;
  R.ballTargets = R.ballTargets || [];
  return { otrbar: B.finish() };
}

// the harbour house's door (Otringal's island, built from the original's layout: the building list in worldfit.js)
const HOUSE = 'house (-42.2, -0.4)';
function harbourDoor() {
  // (the island built: its own record; not yet (a save made in the bar): the record as measured, 3.11.2026)
  const b = FIT.find((f) => f.region === 'isle_otringal' && f.name === HOUSE) || { x: 1857.8, z: 1799.6, ry: 0, d: 9.4 };
  const c = Math.cos(b.ry), s = Math.sin(b.ry), lz = b.d / 2;   // (its front: +z of its own frame; Place.pt)
  return { x: b.x + s * lz, z: b.z + c * lz, ry: b.ry };
}
export function otrBarDoors() {
  const d = harbourDoor();
  return d ? [{ house: 'otrbar', x: d.x + Math.sin(d.ry) * 0.35, z: d.z + Math.cos(d.ry) * 0.35, r: 0.9, room: 'otrbar', region: 'isle_otringal' }] : [];
}
export function otrBarExit(to) {
  if (to !== 'otrbar-out') return null;
  const d = harbourDoor(); if (!d) return null;
  return { room: 'isle_otringal', x: d.x + Math.sin(d.ry) * 1.2, z: d.z + Math.cos(d.ry) * 1.2, a: d.ry };
}
