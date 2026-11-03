// LBA-CITADEL-7 (night mode: "work to the plan"): Chez Luc's cellar, after LBA2's scene 4, reached through the arched door
// under the tavern's gallery (tavern.js) as in the original.
// Our own geometry, from a study of the original's layout (numbers and descriptions only; nothing copied):
//   - a long cellar of about 31 × 18 of the original's cells (≈ 15 × 8.6 m), pale grey stone blocks
//   - as the game's camera sees it: a raised walkway (≈ 2 m) comes in from the doorway at the left wall's front, runs
//     back along the left wall and on along the back wall, with teal iron railings; a stair goes down along the back
//     wall to the store on the right, a stone platform ≈ 1 m up with a balustrade at its front; the corner between the
//     walkway and the store is a dark drop (the original's open void), railed off
//   - the store: dark teal crates and grey metal barrels with dull red lids, a shelf of teal bottles on the back wall,
//     a little tree of red baubles; round lamps set in niches along the back wall; stone pillars with white globes at
//     the store's front corners
// Twelve years on (ours): among the old barrels, Zeelich cargo crates with brass bands (the tavern's drink from the
// harbour); a copper heat pipe of the project's along the back wall.
//
// CONTRACT
//   TAVCELLAR_AT               where the room stands (regions.js)
//   buildTavCellarRoom(scene, physics) → { tavcellar }   (regions.js group 'tavcellar')
//   the way in and out: an exit { room: 'tavern' } at the doorway, R.entries.tavern; the tavern's arched door is an exit
//   { room: 'tavcellar' } (tavern.js), with its own R.entries.tavcellar
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { MAT, M, TEX, rbox, plane, cyl, sphere, lathe, jar, railing } from './props.js';

export const TAVCELLAR_AT = { x: 8000, z: 0 };

const TEAL = () => MAT.paint('#2f6f74', 0.5), DARK = () => MAT.paint('#7c7a86', 0.4);

// a crate of the original's kind: dark teal boards with slats; a Zeelich one with brass bands
function crate(k, s = 0.75, zeelich = false) {
  k.add(rbox(s, s, s, 0.02), MAT.paint(zeelich ? '#2f8a9a' : '#2c4a4c', 0.7), 0, s / 2, 0);
  for (const y of [0.15, s - 0.15]) k.add(rbox(s + 0.02, 0.06, s + 0.02, 0.01), zeelich ? MAT.brass() : MAT.paint('#1e3436', 0.7), 0, y, 0);
  return { hw: s / 2, hd: s / 2, top: s };
}
// a grey metal barrel with a dull red lid
function drum(k) {
  k.add(lathe([[0.001, 0], [0.3, 0], [0.33, 0.1], [0.34, 0.45], [0.33, 0.8], [0.3, 0.9], [0.001, 0.9]], 14), MAT.paint('#8a8892', 0.35), 0, 0, 0);
  k.add(cyl(0.26, 0.26, 0.03, 14), MAT.paint('#8a3a2a', 0.6), 0, 0.91, 0);
  for (const y of [0.25, 0.65]) k.add(new THREE.TorusGeometry(0.335, 0.015, 4, 18).rotateX(Math.PI / 2), MAT.paint('#5e5c66', 0.4), 0, y, 0);
  return { r: 0.34, top: 0.92 };
}

export function buildTavCellarRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'tavcellar', TAVCELLAR_AT.x, TAVCELLAR_AT.z);
  const R = B.room, k = B.k;
  // (the user 2.11, "make them bigger": the floor 1.5 times the first cut, a fifth higher, the camera closer and
  //  following Twinsen; the crates and drums keep their size)
  const F = 1.5, W = 15 * F, D = 8.6 * F, H = 5.4;
  R.view = 12; R.follow = 0.65; R.music = 'home';
  // (the tavern's pale grey blocks)
  const stone = M('tv_stone', () => { const t = TEX.stone('grey'), m = new THREE.MeshStandardMaterial({ map: t, color: '#e6e4ea', roughness: 0.9, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.32 }); m.userData.tile = 2; return m; });
  const rough = MAT.rubble('grey'), cap = MAT.stone('grey', 1.4);
  const LX = -W / 2, BZ = -D / 2, WH = 2.4, SH = 1.2, DOORZ = 3.4 * F;   // (the walkway's height, the store's)
  B.shell({ floor: MAT.stone('grey', 2), slab: rough, body: stone, low: stone, rail: MAT.iron(), cap, H, t: 0.55, dado: 1.0, rimH: 0.45, rimMat: rough, W, D,
    left: [{ at: DOORZ, w: 1.2, h: 2.2, y0: WH, kind: 'door' }] });
  R.exits.push({ x: B.cx + LX + 0.45, z: B.cz + DOORZ, r: 0.7, room: 'tavern', back: true });
  R.spawn = { x: B.cx + LX + 1.0, z: B.cz + DOORZ - 0.6, a: Math.PI };
  R.entries = { tavern: R.spawn };

  // --- the walkway: along the left wall and on along the back wall, 2 m up, on solid stone
  const AX1 = LX + 1.5 * F, AZ1 = BZ + 1.3 * F, SX0 = -1.0 * F;
  k.add(rbox(AX1 - LX, WH, D, 0.02), stone, (LX + AX1) / 2, WH / 2, 0);
  k.add(rbox(SX0 - AX1, WH, AZ1 - BZ, 0.02), stone, (AX1 + SX0) / 2, WH / 2, (BZ + AZ1) / 2);
  for (const [x0, x1, z0, z1] of [[LX, AX1, BZ, D / 2], [AX1, SX0, BZ, AZ1]]) {
    k.add(rbox(x1 - x0 + 0.04, 0.12, z1 - z0 + 0.04, 0.02), cap, (x0 + x1) / 2, WH - 0.06, (z0 + z1) / 2);
    B.col((x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2, WH);
  }
  // --- the stair down along the back wall to the store
  const N = 5, run = 0.75, rise = (WH - SH) / N;
  for (let i = 0; i < N - 1; i++) {
    const top = WH - rise * (i + 1), x = SX0 + (i + 0.5) * run;
    k.add(rbox(run + 0.02, top, AZ1 - BZ, 0.015), stone, x, top / 2, (BZ + AZ1) / 2);
    k.add(rbox(run + 0.04, 0.05, AZ1 - BZ + 0.04, 0.01), cap, x, top - 0.025, (BZ + AZ1) / 2);
    B.col(x, (BZ + AZ1) / 2, run / 2 + 0.12, (AZ1 - BZ) / 2, top, { stair: true });   // (+0.12: the steps overlap each other and the floor at their top under groundAt's 5 cm shrink, no seam to drop through)
  }
  const SX1 = SX0 + (N - 1) * run;   // (the stair's foot: the store's platform begins)
  // --- the store: a stone platform 1 m up from the stair's foot to the right wall, a balustrade along its front
  k.add(rbox(W / 2 - SX1, SH, D, 0.02), stone, (SX1 + W / 2) / 2, SH / 2, 0);
  k.add(rbox(W / 2 - SX1 + 0.04, 0.1, D + 0.04, 0.02), cap, (SX1 + W / 2) / 2, SH - 0.05, 0);
  k.add(plane(W / 2 - SX1 - 0.2, D - 0.2), MAT.stone('grey', 2), (SX1 + W / 2) / 2, SH + 0.005, 0, 0, { rx: -Math.PI / 2 });
  B.col((SX1 + W / 2) / 2, 0, (W / 2 - SX1) / 2, D / 2, SH);
  // --- the dark drop between the walkway and the store (the original's void), railed off on every side but one
  //     stretch of the walkway's railing, broken off long ago (SEWERS-1, S-2: as LBA2's, the hole drops into the old
  //     sewers' hall: story/sewers.js takes him there as he falls; Old Fenn in the tavern warns about it)
  k.add(plane(SX1 - AX1, D / 2 - AZ1), MAT.flat('#121216', 0.95), (AX1 + SX1) / 2, 0.01, (AZ1 + D / 2) / 2, 0, { rx: -Math.PI / 2 });
  const railM = TEAL(), GZ = 1.0, GW = 0.65;   // (the gap: 1.3 m of the walkway's railing, in the middle of its run)
  k.at(0, WH, 0, 0, () => railing(k, [[AX1 + 0.05, D / 2 - 0.1], [AX1 + 0.05, GZ + GW]], { h: 0.95, mat: railM, step: 0.45 }));
  k.at(0, WH, 0, 0, () => railing(k, [[AX1 + 0.05, GZ - GW], [AX1 + 0.05, AZ1 + 0.05], [SX0, AZ1 + 0.05]], { h: 0.95, mat: railM, step: 0.45 }));
  k.add(rbox(0.05, 0.05, 0.9, 0.01), railM, AX1 + 0.6, 0.03, GZ + 0.2, 0.5);   // (the broken rail, down on the cellar floor)
  R.drop = { x0: B.cx + AX1 + 0.1, x1: B.cx + SX1, z0: B.cz + AZ1 + 0.1, z1: B.cz + D / 2, y: WH, edge: { x: B.cx + AX1 - 0.45, z: B.cz + GZ } };
  railing(k, [[SX0, AZ1 + 0.05], [SX1, AZ1 + 0.05]], { h: 0.95 + (WH - SH), mat: railM, step: 0.45 });
  k.at(0, SH, 0, 0, () => railing(k, [[SX1 + 0.05, AZ1 + 0.05], [SX1 + 0.05, D / 2 - 0.12], [W / 2 - 0.4, D / 2 - 0.12]], { h: 0.95, mat: railM, step: 0.45 }));
  for (const [z0, z1] of [[GZ + GW, D / 2], [AZ1, GZ - GW]]) B.col(AX1 + 0.05, (z0 + z1) / 2, 0.06, (z1 - z0) / 2, WH + 1.0, { seeThrough: true, noStand: true });
  B.col((AX1 + SX1) / 2, AZ1 + 0.05, (SX1 - AX1) / 2, 0.06, WH + 1.0, { seeThrough: true, noStand: true });
  B.col(SX1 + 0.05, (AZ1 + D / 2) / 2, 0.06, (D / 2 - AZ1) / 2, SH + 1.0, { seeThrough: true, noStand: true });
  B.col((SX1 + W / 2) / 2, D / 2 - 0.12, (W / 2 - SX1) / 2, 0.06, SH + 1.0, { seeThrough: true, noStand: true });
  // --- the store on the right: crates and drums, the bottle shelf, the bauble tree
  const crates = [[4.0, -1.2, 0], [5.0, -1.4, 0.1], [4.5, 0.6, 0.05], [6.2, 0.3, 0], [3.8, 2.4, 0.2], [6.6, 2.6, 0]];
  crates.forEach(([x, z, ry], i) => B.put(x * F, z * F, ry, (kk) => crate(kk, 0.75, i === 1 || i === 4), { y: SH }));
  for (const [x, z] of [[3.5, -0.2], [5.6, -2.6], [6.6, -1.6], [5.4, 1.6], [7.0, 1.2], [5.1, 3.3]]) B.put(x * F, z * F, 0, (kk) => drum(kk), { y: SH });
  for (const y of [1.2, 1.7, 2.2]) k.add(rbox(1.1, 0.04, 0.28, 0.01), DARK(), 6.6 * F, SH + y, BZ + 0.16);
  [1.2, 1.7, 2.2].forEach((y, r) => { for (let i = 0; i < 3; i++) jar(k, 6.6 * F - 0.35 + i * 0.35, SH + y + 0.02, BZ + 0.16, 'bottle', ['#2f8a9a', '#2f7a74', '#3f9a9a'][(i + r) % 3], 1.1); });
  k.at(7.1 * F, SH, -0.4 * F, 0, () => { k.add(cyl(0.03, 0.05, 0.5, 8), DARK(), 0, 0.25, 0); const m = MAT.flat('#c83a3a', 0.2, { metalness: 0.3 }); for (let r = 0; r < 4; r++) for (let i = 0; i < 6 - r; i++) { const a = (i / (6 - r)) * Math.PI * 2; k.add(sphere(0.05, 8, 6), m, Math.sin(a) * (0.16 - r * 0.035), 0.55 + r * 0.1, Math.cos(a) * (0.16 - r * 0.035)); } });
  B.ccol(7.1 * F, -0.4 * F, 0.2, SH + 1.0);
  // round lamps in niches along the back wall, stone pillars with white globes at the store's front corners
  for (const x of [-4.0 * F, 0.5 * F, 4.5 * F]) { k.add(rbox(0.6, 0.7, 0.12, 0.05), cap, x, 4.0, BZ + 0.06); k.add(sphere(0.16, 12, 8), MAT.glow('#fff4e0', '#ffd890', 1.1), x, 4.0, BZ + 0.12); B.light('#ffe8c8', 2.8, 8, x, 3.8, BZ + 0.6); }
  for (const x of [SX1 + 0.05, W / 2 - 0.35]) { k.add(rbox(0.6, SH + 2.0, 0.6, 0.05), stone, x, (SH + 2.0) / 2, D / 2 - 0.3); k.add(sphere(0.26, 14, 10), MAT.glow('#fff8ee', '#ffe8c0', 1.0), x, SH + 2.25, D / 2 - 0.3); B.col(x, D / 2 - 0.3, 0.3, 0.3, SH + 2.3, { noStand: true }); }
  // twelve years on: the project's copper heat pipe along the back wall
  k.add(cyl(0.06, 0.06, W - 0.4, 10), MAT.copper(), 0, 4.9, BZ + 0.15, 0, { rz: Math.PI / 2 });
  for (const x of [-9, -3, 3, 9]) k.add(rbox(0.06, 0.2, 0.12, 0.01), MAT.iron(), x, 4.9, BZ + 0.1);

  B.light('#ffe2b8', 4.5, 15, 4.5 * F, 4.4, 0.5); B.light('#ffe2b8', 3.5, 12, -5.0 * F, 4.6, 0.5);
  return { tavcellar: B.finish() };
}
