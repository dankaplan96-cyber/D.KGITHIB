// LBA-CITADEL-9 (night mode: "work to the plan"): the cave behind the plateau's door, after LBA2's scene 2 (Tralu's
// cave). WORLD-80 built the door in the bank behind the depot and kept it shut (island.js OLD_DOORS.plateau); now it
// opens. Our own geometry, from a study of the original's layout (numbers and descriptions only; nothing copied):
//   - a cave of rough grey rock on two levels: a raised rock terrace at the back with a barred gate in the rock and
//     clusters of blue eggs; a stair down from it; a lower cave floor with clusters of pale spiked stalagmites; a
//     railed pool of pale cyan water; posts with cyan glass globes; an old stone guard house of squared blocks with
//     barred windows: barrels inside, a table with plates and a bottle, a bench, iron candle stands
// Twelve years on (ours): the eggs are empty shells, broken open long ago; the gate's bars are rusted; the guard house
// is a store again (a lantern, a coil of rope, a crate).
//
// CONTRACT
//   TRALUCAVE_AT                  where the room stands (regions.js)
//   buildTraluCaveRoom(scene, physics) → { tralucave }   (regions.js group 'tralucave')
//   traluCaveDoors() / traluCaveExit(to)   the plateau's door leads in ({ house: 'plateau' }: story/prologue.js no
//                                          longer offers it as shut); 'tralucave-out' leads back out before it
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { MAT, M, TEX, rbox, plane, cyl, sphere, lathe, railing, table, bench, barrel, plate, jar, candle } from './props.js';
import { OLD_DOORS } from './island.js';

export const TRALUCAVE_AT = { x: 8400, z: 0 };

const std = (map, color, rough, tile, glow = 0) => { const m = new THREE.MeshStandardMaterial({ map, color, roughness: rough, ...(glow ? { emissive: '#ffffff', emissiveMap: map, emissiveIntensity: glow } : {}) }); m.userData.tile = tile; return m; };
const rockM = () => M('tc_rock', () => std(TEX.rubble('grey'), '#a49e94', 0.95, 1.4, 0.34));
const floorM = () => M('tc_floor', () => std(TEX.rubble('grey'), '#b0aca4', 0.95, 2.6, 0.34));   // (rough rock underfoot)
const paveM = () => M('tc_pave', () => std(TEX.tiles('#6e6c66', '#64625c', '#33393a', false, 3, 'tc'), '#ffffff', 0.9, 2.2));   // (the worn paved patches)
const blockM = () => M('tc_block', () => std(TEX.stone('grey'), '#b8b4aa', 0.9, 2, 0.3));
const capM = () => M('tc_cap', () => std(TEX.stone('grey'), '#c8c2b6', 0.9, 1.2, 0.22));
const waterM = () => M('tc_water', () => { const m = new THREE.MeshStandardMaterial({ color: '#8ccfd8', emissive: '#4e9aa0', emissiveIntensity: 0.6, roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.88 }); m.userData.noShadow = true; return m; });
const boneM = () => M('tc_bone', () => new THREE.MeshStandardMaterial({ color: '#e6d4b8', roughness: 0.7, emissive: '#5a4c3c', emissiveIntensity: 0.6 })), tipM = () => MAT.paint('#5a3a2c', 0.6), rustM = () => MAT.paint('#6e4532', 0.85);
const globeM = () => MAT.glow('#d6f2ff', '#5ab0e0', 1.5), eggM = () => M('tc_egg', () => new THREE.MeshStandardMaterial({ color: '#5aa0c8', roughness: 0.3, emissive: '#1e4a66', emissiveIntensity: 0.6 }));

// a cluster of pale spiked stalagmites, dark at the tips
function spikes(k, n = 5, s = 1) {
  for (let i = 0; i < n; i++) {
    const a = i * 2.4, r = i ? 0.12 + (i % 3) * 0.08 : 0, h = (0.9 - (i % 3) * 0.2) * s;
    k.add(cyl(0.001, 0.11 * s, h, 7), boneM(), Math.sin(a) * r * s, h / 2, Math.cos(a) * r * s);
    k.add(cyl(0.001, 0.034 * s, h * 0.3, 6), tipM(), Math.sin(a) * r * s, h * 0.86, Math.cos(a) * r * s);
  }
  return { r: 0.32 * s, top: 0.9 * s };
}
// a clutch of blue eggs, broken open long ago: half shells and one whole
function eggs(k, n = 4) {
  for (let i = 0; i < n; i++) {
    const a = i * 2.1, r = i ? 0.24 : 0, x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (i % 2) k.add(sphere(0.17, 12, 8), eggM(), x, 0.15, z, a, { sy: 1.25 });
    else k.add(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), eggM(), x, 0.03, z, a, { rx: Math.PI, sy: 1.2 });
  }
  return { r: 0.4, top: 0.4 };
}
// a short stone post with a cyan glass globe
function globePost(k) {
  k.add(rbox(0.3, 1.0, 0.3, 0.04), blockM(), 0, 0.5, 0);
  k.add(rbox(0.36, 0.08, 0.36, 0.02), capM(), 0, 1.02, 0);
  k.add(sphere(0.17, 14, 10), globeM(), 0, 1.24, 0);
  return { hw: 0.17, hd: 0.17, top: 1.4 };
}
// a wrought-iron candle stand
function candleStand(k) {
  k.add(cyl(0.16, 0.2, 0.05, 10), MAT.iron(), 0, 0.025, 0);
  k.add(cyl(0.025, 0.025, 1.3, 6), MAT.iron(), 0, 0.67, 0);
  k.add(cyl(0.09, 0.05, 0.06, 10), MAT.iron(), 0, 1.33, 0);
  k.add(cyl(0.035, 0.035, 0.16, 8), MAT.paint('#f2ead6', 0.6), 0, 1.44, 0);
  candle(k, 0, 1.33, 0);
  return { r: 0.18, top: 1.5 };
}
// a boulder against a wall's foot
function boulder(k, s = 1) {
  k.add(sphere(0.5, 9, 7), rockM(), 0, 0.25 * s, 0, 0, { sx: 1.3 * s, sy: 0.75 * s, sz: s });
  return { r: 0.55 * s, top: 0.6 * s };
}

export function buildTraluCaveRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'tralucave', TRALUCAVE_AT.x, TRALUCAVE_AT.z);
  const R = B.room, k = B.k;
  // (the user 2.11, "make them bigger": the floor 1.5 times the first cut, the terrace a little higher, the camera
  //  close and following Twinsen; the props keep their size)
  const F = 1.5, W = 18 * F, D = 14 * F, H = 5.4;
  R.view = 12.5; R.follow = 0.65; R.music = 'home';
  const rock = rockM(), block = blockM(), cap = capM();
  const LX = -W / 2, BZ = -D / 2, DOORZ = 4.8 * F;
  B.shell({ floor: floorM(), slab: rock, body: rock, low: rock, rail: rustM(), cap: rock, H, t: 0.7, dado: 0.6, rimH: 0.6, rimMat: rock, W, D,
    left: [{ at: DOORZ, w: 1.6, h: 2.6, y0: 0, kind: 'door' }] });
  R.exits.push({ x: B.cx + LX + 0.45, z: B.cz + DOORZ, r: 0.8, to: 'tralucave-out' });
  R.spawn = { x: B.cx + LX + 1.4, z: B.cz + DOORZ, a: Math.PI / 2 };

  // the worn paved patches in the rock floor (the original's darker brick)
  for (const [x, z, w, d] of [[-3.0, 3.6, 4.2, 2.6], [1.0, 1.4, 3.0, 1.6], [-4.6, 5.8, 2.0, 1.2]]) k.add(plane(w * F, d * F), paveM(), x * F, 0.006, z * F, 0, { rx: -Math.PI / 2 });
  // --- the rock terrace at the back left, 1.6 m up, its face rough rock with boulders at its foot
  const TY = 1.8, TX1 = -1.0 * F, TZ1 = -1.6 * F;
  k.add(rbox(TX1 - LX, TY, TZ1 - BZ, 0.06), rock, (LX + TX1) / 2, TY / 2, (BZ + TZ1) / 2);
  k.add(plane(TX1 - LX - 0.1, TZ1 - BZ - 0.1), floorM(), (LX + TX1) / 2, TY + 0.004, (BZ + TZ1) / 2, 0, { rx: -Math.PI / 2 });
  k.add(plane(3.6 * F, 2.4 * F), paveM(), -5.0 * F, TY + 0.008, -3.4 * F, 0, { rx: -Math.PI / 2 });
  B.col((LX + TX1) / 2, (BZ + TZ1) / 2, (TX1 - LX) / 2, (TZ1 - BZ) / 2, TY);
  for (const [x, z, s] of [[-8.0, -1.3, 0.8], [-6.4, -1.25, 0.6], [-4.6, -1.3, 0.7]]) B.put(x * F, TZ1 + 0.3, x, (kk) => boulder(kk, s));
  // the stair down at its right end, from the terrace's edge toward the front
  const SX0 = TX1 - 1.45 * F, SX1 = TX1 - 0.05, N = 6, run = 0.6, rise = TY / N;
  for (let i = 0; i < N; i++) {
    const top = rise * (N - i), z = TZ1 + (i + 0.5) * run;
    k.add(rbox(SX1 - SX0, top - 0.02, run + 0.02, 0.02), block, (SX0 + SX1) / 2, (top - 0.02) / 2, z);   // (OVERLAP-1: 2 cm inside its tread, not level with the tread's top: the two flickered)
    k.add(rbox(SX1 - SX0 + 0.04, 0.05, run + 0.04, 0.01), cap, (SX0 + SX1) / 2, top - 0.025, z);
    B.col((SX0 + SX1) / 2, z, (SX1 - SX0) / 2, run / 2 + 0.12, top, { stair: true });   // (+0.12: the steps overlap each other and the floor at their top under groundAt's 5 cm shrink)
  }
  // rusted railings: along the terrace's edge (open over the stair), down its right side, and down the stair
  const rail = rustM();
  k.at(0, TY, 0, 0, () => railing(k, [[LX + 0.2, TZ1 - 0.06], [SX0 - 0.05, TZ1 - 0.06]], { h: 0.95, mat: rail, step: 0.42 }));
  B.col((LX + 0.2 + SX0) / 2, TZ1 - 0.06, (SX0 - LX - 0.2) / 2, 0.06, TY + 1.0, { seeThrough: true, noStand: true });
  k.at(0, TY, 0, 0, () => railing(k, [[TX1 - 0.06, BZ + 0.2], [TX1 - 0.06, TZ1]], { h: 0.95, mat: rail, step: 0.42 }));
  B.col(TX1 - 0.06, (BZ + 0.2 + TZ1) / 2, 0.06, (TZ1 - BZ - 0.2) / 2, TY + 1.0, { seeThrough: true, noStand: true });
  railing(k, [[SX0 - 0.05, TZ1], [SX0 - 0.05, TZ1 + N * run]], { h: 0.95 + TY / 2, mat: rail, step: 0.45 });
  B.col(SX0 - 0.05, TZ1 + N * run / 2, 0.06, N * run / 2, TY + 1.0, { seeThrough: true, noStand: true });
  // the barred gate in the back rock: a stone arch with rusted bars, shut
  const GX = -5.0 * F, gw = 1.8, gh = 2.7;
  k.add(rbox(gw + 0.9, gh + 0.5, 0.5, 0.05), block, GX, TY + (gh + 0.5) / 2, BZ + 0.2);
  k.add(rbox(gw, gh - gw / 2, 0.06, 0.01), MAT.flat('#141618', 0.9), GX, TY + (gh - gw / 2) / 2, BZ + 0.46);
  k.add(new THREE.CircleGeometry(gw / 2, 16, 0, Math.PI), MAT.flat('#141618', 0.9), GX, TY + gh - gw / 2, BZ + 0.46);
  k.add(new THREE.TorusGeometry(gw / 2 + 0.06, 0.1, 6, 16, Math.PI), cap, GX, TY + gh - gw / 2, BZ + 0.5);
  for (let i = 0; i < 7; i++) { const x = GX - gw / 2 + 0.15 + i * (gw - 0.3) / 6, h = gh - 0.15 - Math.max(0, Math.abs(x - GX) - 0.25) * 0.9; k.add(cyl(0.025, 0.025, h, 6), rail, x, TY + h / 2, BZ + 0.52); }
  for (const y of [0.5, 1.4]) k.add(rbox(gw - 0.1, 0.06, 0.04, 0.01), rail, GX, TY + y, BZ + 0.52);
  // on the terrace: the egg clutches (empty shells), spikes, a globe post at each end of the edge
  for (const [x, z, n] of [[-7.6, -6.2, 5], [-3.0, -6.0, 3], [-8.2, -3.4, 4], [-3.6, -4.4, 4]]) B.put(x * F, z * F, x, (kk) => eggs(kk, n), { y: TY });
  for (const [x, z, s] of [[-6.6, -5.2, 0.9], [-2.0, -4.2, 0.8], [-8.6, -5.6, 1.0]]) B.put(x * F, z * F, 0, (kk) => spikes(kk, 5, s), { y: TY });
  for (const x of [LX + 0.45, SX0 - 0.35]) B.put(x, TZ1 - 0.35, 0, (kk) => globePost(kk), { y: TY });

  // --- the old guard house at the back right: squared blocks, a doorway and barred windows in its front
  const HX0 = 0.2 * F, HZ1 = -0.8 * F, HH = 3.3;
  const wall = { h: HH, t: 0.4, body: block, cap, dado: 0 };
  B.partition(HX0, BZ, HX0, HZ1, wall);
  B.partition(HX0, HZ1, W / 2, HZ1, { ...wall, doors: [{ at: 1.9 * F, w: 1.4 }] });
  for (const x of [4.2 * F, 6.0 * F, 7.8 * F, 9.6 * F]) {   // (the barred windows, both faces)
    for (const s of [-1, 1]) {
      k.add(rbox(0.9, 1.0, 0.04, 0.01), MAT.flat('#141618', 0.9), x, 1.6, HZ1 + s * 0.21);
      for (let i = 0; i < 4; i++) k.add(cyl(0.022, 0.022, 1.0, 6), rail, x - 0.3 + i * 0.2, 1.6, HZ1 + s * 0.24);
    }
  }
  // its pillars of blocks at the corners
  for (const [x, z] of [[HX0, HZ1], [W / 2 - 0.3, HZ1]]) { k.add(rbox(0.6, HH + 0.4, 0.6, 0.04), block, x, (HH + 0.4) / 2, z); k.add(rbox(0.7, 0.12, 0.7, 0.03), cap, x, HH + 0.46, z); B.col(x, z, 0.3, 0.3, HH + 0.5); }
  // inside: barrels, the table with plates and a bottle, a bench, candle stands; a lantern, rope and a crate (ours)
  for (const [x, z] of [[1.0, -6.3], [1.6, -6.4], [1.25, -5.8], [8.3, -2.0]]) B.put(x * F, z * F, x, (kk) => barrel(kk, { pal: 'honey' }));
  B.put(5.4 * F, -4.8 * F, 0, (kk) => { const r = table(kk, { w: 1.7, d: 0.85, pal: 'honey' }); plate(kk, -0.4, 0.78, 0); plate(kk, 0.35, 0.78, 0.05); jar(kk, 0, 0.78, -0.1, 'bottle', '#2f8a9a', 1.0); return r; });
  B.put(5.4 * F, -4.8 * F + 0.9, 0, (kk) => bench(kk, { w: 1.5, pal: 'honey' }));
  for (const x of [3.6, 7.2]) B.put(x * F, -5.0 * F, 0, (kk) => candleStand(kk));
  B.put(8.2 * F, -6.2 * F, 0.3, (kk) => { kk.add(rbox(0.75, 0.6, 0.6, 0.02), MAT.paint('#7a5a36', 0.8), 0, 0.3, 0); kk.add(cyl(0.2, 0.2, 0.12, 14, true), MAT.paint('#b89a6a', 0.9), 0, 0.66, 0); kk.add(rbox(0.12, 0.2, 0.12, 0.02), MAT.glow('#ffe0a0', '#ffb040', 0.9), 0.2, 0.7, 0.15); return { hw: 0.38, hd: 0.3, top: 0.75 }; });
  // SEWERS-1 (C-2): an echo of LBA2's rescue: the old guitar case of the lighthouse keeper the monster once held here,
  // leaning on the back wall; and the crate under the lantern is someone's cache (story/sewers.js: a clover, once)
  k.at(10.2, 0, BZ + 0.32, 0, () => {
    const lm = MAT.paint('#4a2c1c', 0.7), br = MAT.brass();
    k.add(sphere(0.27, 12, 8), lm, 0, 0.32, 0, 0, { sx: 1, sy: 1.15, sz: 0.32, rx: -0.16 });
    k.add(sphere(0.2, 12, 8), lm, 0, 0.72, -0.06, 0, { sx: 1, sy: 1.1, sz: 0.36, rx: -0.16 });
    k.add(rbox(0.15, 0.48, 0.1, 0.03), lm, 0, 1.08, -0.12, 0, { rx: -0.16 });
    for (const y of [0.3, 0.7]) k.add(rbox(0.06, 0.04, 0.03, 0.01), br, 0.22, y, 0.08 - y * 0.16);
  });
  B.ccol(10.2, BZ + 0.32, 0.3, 1.3);
  R.cache = { case: { ...B.world(10.2, BZ + 1.15) }, crate: { ...B.world(8.2 * F, -6.2 * F + 0.95), at: B.world(8.2 * F, -6.2 * F) } };

  // --- the lower cave: the railed pool at the front right, globe posts at its corners, spike clusters, boulders
  const PX0 = 3.0 * F, PX1 = 7.4 * F, PZ0 = 2.0 * F, PZ1 = 5.4 * F, kerb = 0.3;
  for (const [x0, z0, x1, z1] of [[PX0, PZ0, PX1, PZ0 + 0.3], [PX0, PZ1 - 0.3, PX1, PZ1], [PX0, PZ0, PX0 + 0.3, PZ1], [PX1 - 0.3, PZ0, PX1, PZ1]]) k.add(rbox(x1 - x0, kerb, z1 - z0, 0.03), block, (x0 + x1) / 2, kerb / 2, (z0 + z1) / 2);
  k.add(plane(PX1 - PX0 - 0.6, PZ1 - PZ0 - 0.6), waterM(), (PX0 + PX1) / 2, kerb - 0.08, (PZ0 + PZ1) / 2, 0, { rx: -Math.PI / 2 });
  k.at(0, kerb, 0, 0, () => railing(k, [[PX0 + 0.15, PZ0 + 0.15], [PX1 - 0.15, PZ0 + 0.15], [PX1 - 0.15, PZ1 - 0.15], [PX0 + 0.15, PZ1 - 0.15], [PX0 + 0.15, PZ0 + 0.15]], { h: 0.9, mat: rail, step: 0.45 }));
  B.col((PX0 + PX1) / 2, (PZ0 + PZ1) / 2, (PX1 - PX0) / 2, (PZ1 - PZ0) / 2, kerb + 1.0, { seeThrough: true, noStand: true });
  for (const [x, z] of [[PX0 - 0.3, PZ0 - 0.3], [PX1 + 0.3, PZ0 - 0.3], [PX0 - 0.3, PZ1 + 0.3]]) B.put(x, z, 0, (kk) => globePost(kk));
  for (const [x, z, s] of [[-6.2, 2.6, 1], [-4.2, 6.2, 0.8], [1.2, 6.0, 0.9], [8.2, 1.0, 1.1], [-0.5, -6.4, 0.9], [8.3, 6.1, 0.8], [-8.0, 0.4, 0.9]]) B.put(x * F, z * F, 0, (kk) => spikes(kk, 6, s));
  for (const [x, z, s] of [[LX + 0.5, 1.2, 0.9], [LX + 0.5, 6.4, 0.7], [W / 2 - 0.4, 3.6, 0.8]]) B.put(x, z * F, x, (kk) => boulder(kk, s));
  // a clutch of shells down here too, by the pool
  B.put(2.2 * F, 4.4 * F, 1, (kk) => eggs(kk, 3));

  // light: cold from the globes, warm in the guard house
  B.light('#bfe6ff', 4.5, 15, 5.2 * F, 3.0, 3.6 * F); B.light('#bfe6ff', 4, 15, -5.0 * F, TY + 2.6, -4.0 * F); B.light('#bfe6ff', 3.5, 13, -4.0 * F, 3.0, 4.0 * F);
  B.light('#ffd8a0', 4, 12, 5.4 * F, 2.6, -4.0 * F);
  return { tralucave: B.finish() };
}

// the plateau's door leads in; coming out, Twinsen stands 1.2 m before it, facing away
const PD = OLD_DOORS.plateau;
export function traluCaveDoors() {
  return [{ house: 'plateau', x: PD.x + Math.sin(PD.ry) * 0.35, z: PD.z + Math.cos(PD.ry) * 0.35, r: 0.9, room: 'tralucave' }];
}
export function traluCaveExit(to) {
  if (to !== 'tralucave-out') return null;
  return { x: PD.x + Math.sin(PD.ry) * 1.6, z: PD.z + Math.cos(PD.ry) * 1.6, a: PD.ry };
}
