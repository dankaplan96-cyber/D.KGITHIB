// ZEELICH-1 item 2 (the cloud's order): the Temple of the Dark Monk on Celebration, after LBA2's scene 93, about 80 %
// alike. Our own geometry, from a study of the original's layout (numbers and descriptions only; nothing copied).
// Its way in: our Celebration's summit is the paved plaza round the great figure (zislands.js); the temple lies under
// it, and its portal stands on the plaza's north edge facing the figure: two dark pillars and a lintel with horned heads
// over a stair going down into the mountain. As the game's camera sees the hall:
//   - dark granite walls, a dark floor with rosettes; columns of carved stone with four dark globes in gold clasps
//   - two horned heads with glowing red eyes and mouths on the left wall, pools of lava set in the floor by the walls
//   - in the middle the altar of lava with two white orbs, between the Dark Monk's statue and the insect figure's
//   - on the back wall the prophecy murals (four framed panels with turquoise medallions) above a stepped bench, the
//     reader's lectern before them
//   - in the left wall at the back the sealed door up a short stair (open twelve years on, its four fragments' sockets
//     empty); the stair from the portal comes down in the left wall at the front
// Twelve years on (ours): the sealed door stands open and dark; the lava has dimmed to a glow.
//
// CONTRACT (world coordinates)
//   CELTEMPLE_AT                           where the hall stands (regions.js)
//   buildCelTempleRoom(scene, physics) → { celtemple }
//   buildCelPortal(group, physics)         the portal on Celebration's plaza (zislands.js calls it for 'celebration')
//   celTempleDoors() / celTempleExit(to)   the portal leads down in (region isle_celebration); 'celtemple-out'
//   TEMPLE (filled when the hall is built):
//     murals [{x, z, a, look: {x, y, z}}] (4 reading spots, each with the panel's centre to look at)
//     lectern {x, z, r}        sealDoor { x, z, open, setOpen(b, instant) }
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { MAT, M, TEX, rbox, plane, cyl, sphere, lathe, canvasTex } from './props.js';

export const CELTEMPLE_AT = { x: 9600, z: 0 };
export const TEMPLE = {};

// the portal on the plaza (Celebration's local frame: its origin at the island group's place; the figure at (2.2, 0.6))
const PORTAL = { x: 2.2, z: -9.2 };
const CEL = { x: 2890, z: 1800 };   // (the island's place: regions.js; read from its group when it is built)

const GRANITE = () => M('ct_granite', () => { const t = TEX.stone('slate'), m = new THREE.MeshStandardMaterial({ map: t, color: '#7a8086', roughness: 0.85, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.1 }); m.userData.tile = 2; return m; });
const LAVA = () => MAT.glow('#e8401a', '#c82808', 1.3);
const muralTex = (i) => canvasTex(256, 320, (x, W, H) => {
  x.fillStyle = '#d8d2c4'; x.fillRect(0, 0, W, H); x.strokeStyle = '#3a3a40'; x.lineWidth = 16; x.strokeRect(8, 8, W - 16, H - 16);
  x.fillStyle = '#4a4a50'; for (let r = 0; r < 9; r++) for (let c = 0; c < 6; c++) if ((r * 7 + c * 3 + i) % 5) x.fillRect(36 + c * 31, 36 + r * 16, 22, 6);
  const g = x.createRadialGradient(W / 2, 250, 4, W / 2, 250, 34); g.addColorStop(0, '#bff4f0'); g.addColorStop(1, '#2a9a9a');
  x.fillStyle = g; x.beginPath(); x.arc(W / 2, 250, 32, 0, 7); x.fill(); x.strokeStyle = '#1a3a3a'; x.lineWidth = 4; x.stroke();
});
// a column of carved stone with four dark globes in gold clasps round its middle
function globeColumn(k, h = 3.6) {
  k.add(rbox(0.8, 0.5, 0.8, 0.06), GRANITE(), 0, 0.25, 0);
  k.add(lathe([[0.001, 0], [0.3, 0], [0.26, 0.2], [0.24, h - 0.9], [0.32, h - 0.75], [0.001, h - 0.75]], 12), MAT.paint('#8a6a5a', 0.6), 0, 0.5, 0);
  k.add(rbox(0.8, 0.3, 0.8, 0.06), GRANITE(), 0, h - 0.1, 0);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; k.add(sphere(0.2, 12, 8), MAT.paint('#2a3a40', 0.3), Math.sin(a) * 0.3, h * 0.62, Math.cos(a) * 0.3); k.add(rbox(0.08, 0.22, 0.08, 0.02), MAT.brass(), Math.sin(a) * 0.36, h * 0.5, Math.cos(a) * 0.36); }
  return { hw: 0.4, hd: 0.4, top: h + 0.05 };
}
// a horned head on the wall, its eyes and mouth glowing (faces +z)
function hornedHead(k) {
  const m = MAT.paint('#3a4448', 0.5);
  k.add(sphere(0.42, 12, 10), m, 0, 0, 0.1, 0, { sx: 1, sy: 0.85, sz: 0.8 });
  k.add(rbox(0.5, 0.2, 0.3, 0.08), m, 0, -0.28, 0.32);
  for (const sx of [-1, 1]) { k.add(cyl(0.02, 0.08, 0.6, 6), MAT.paint('#c8a050', 0.4), sx * 0.45, 0.3, 0.05, 0, { rz: -sx * 0.9 }); k.add(sphere(0.06, 8, 6), LAVA(), sx * 0.15, 0.08, 0.42); }
  k.add(rbox(0.3, 0.08, 0.04, 0.02), LAVA(), 0, -0.24, 0.48);
}
function statue(k, kind) {
  const m = MAT.paint('#4a5a5e', 0.45);
  k.add(rbox(0.9, 0.5, 0.9, 0.04), GRANITE(), 0, 0.25, 0);
  if (kind === 'monk') { k.add(lathe([[0.001, 0], [0.42, 0], [0.34, 1.0], [0.24, 1.6], [0.001, 1.7]], 12), m, 0, 0.5, 0); k.add(sphere(0.24, 10, 8), m, 0, 2.3, 0.05, 0, { sz: 1.2 }); k.add(sphere(0.26, 10, 8), m, 0, 2.38, -0.02, 0, { sy: 1.1 }); }
  else { k.add(cyl(0.12, 0.16, 1.5, 8), m, 0, 1.25, 0); k.add(sphere(0.2, 10, 8), m, 0, 2.15, 0.05, 0, { sx: 0.8, sz: 1.3 }); for (const sx of [-1, 1]) { k.add(cyl(0.015, 0.02, 0.5, 4), m, sx * 0.1, 2.5, 0, 0, { rz: -sx * 0.4 }); k.add(cyl(0.04, 0.04, 0.9, 6), m, sx * 0.22, 1.5, 0.1, 0, { rz: sx * 0.4 }); } }
  return { hw: 0.45, hd: 0.45, top: 2.6 };
}

export function buildCelTempleRoom(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'celtemple', CELTEMPLE_AT.x, CELTEMPLE_AT.z);
  const R = B.room, k = B.k;
  const W = 18, D = 15, H = 6.0;
  R.view = 12.5; R.follow = 0.6; R.music = 'facility';
  const g = GRANITE(), floor = MAT.tiles('#3e4044', '#34363a', '#22242a', false, 3);
  const LX = -W / 2, BZ = -D / 2, DOORZ = 4.4, SEALZ = -4.6;
  B.shell({ floor, slab: MAT.rubble('slate'), body: g, low: g, rail: MAT.paint('#2a2c30', 0.5), cap: g, H, t: 0.6, dado: 1.2, rimH: 0.55, rimMat: g, W, D,
    left: [{ at: DOORZ, w: 1.6, h: 2.6, y0: 0, kind: 'door', frame: g }] });
  R.exits.push({ x: B.cx + LX + 0.45, z: B.cz + DOORZ, r: 0.8, to: 'celtemple-out' });
  R.spawn = { x: B.cx + LX + 1.5, z: B.cz + DOORZ, a: Math.PI / 2 };
  // the floor's rosettes
  for (const [x, z] of [[-3.0, 0.5], [3.0, 0.5], [0, -2.6], [0, 3.6], [-6.0, 2.6], [6.0, 2.6]]) k.add(new THREE.CircleGeometry(1.4, 24).rotateX(-Math.PI / 2), MAT.paint('#2a2c32', 0.6), x, 0.012, z);

  // --- the stepped bench along the back wall, the prophecy murals above it, the lectern before them
  k.add(rbox(W - 3.0, 0.45, 1.2, 0.04), g, 1.0, 0.225, BZ + 0.6); k.add(rbox(W - 3.4, 0.45, 0.6, 0.04), g, 1.0, 0.675, BZ + 0.3);
  B.col(1.0, BZ + 0.6, (W - 3.0) / 2, 0.66, 0.45);
  const murals = [];
  for (let i = 0; i < 4; i++) {
    const x = -3.6 + i * 3.4;
    k.add(rbox(1.6, 2.0, 0.12, 0.03), MAT.paint('#2a2c30', 0.5), x, 2.9, BZ + 0.08);
    k.add(plane(1.36, 1.76), MAT.map(muralTex(i), 0.7), x, 2.9, BZ + 0.15);
    murals.push({ x: B.cx + x, z: B.cz + BZ + 2.0, a: Math.PI, look: { x: B.cx + x, y: 2.9, z: B.cz + BZ + 0.15 } });
  }
  const LECX = 1.5, LECZ = BZ + 2.6;
  B.put(LECX, LECZ, Math.PI, (kk) => { kk.add(cyl(0.08, 0.12, 1.0, 8), MAT.paint('#2a2c30', 0.5), 0, 0.5, 0); kk.add(rbox(0.6, 0.05, 0.45, 0.02), MAT.wood('dark'), 0, 1.05, 0, 0, { rx: -0.35 }); kk.add(rbox(0.5, 0.02, 0.36, 0.01), MAT.paper('#f2ead6', '#3a2a1a', 'leaf'), 0, 1.09, 0.02, 0, { rx: -0.35 }); return { r: 0.3, top: 1.15 }; });

  // --- the columns round the hall, the horned heads on the left wall, the lava pools by the walls
  for (const [x, z] of [[LX + 0.9, -1.6], [LX + 0.9, 2.0], [-5.6, BZ + 1.6], [-1.9, BZ + 1.6], [4.9, BZ + 1.6], [W / 2 - 0.9, BZ + 1.6], [-4.2, 3.6], [4.2, 3.6], [W / 2 - 0.9, 1.6]]) B.put(x, z, 0, (kk) => globeColumn(kk, 3.6));
  for (const z of [-2.8, 0.2]) k.at(LX + 0.35, 2.7, z, Math.PI / 2, () => hornedHead(k));
  for (const [x, z, w, d] of [[LX + 1.6, -2.8, 1.2, 0.9], [W / 2 - 1.8, -1.0, 0.9, 1.2], [-4.6, 5.6, 1.2, 0.8]]) {
    k.add(rbox(w + 0.3, 0.12, d + 0.3, 0.04), g, x, 0.06, z); k.add(plane(w, d), LAVA(), x, 0.13, z, 0, { rx: -Math.PI / 2 });
    B.col(x, z, (w + 0.3) / 2, (d + 0.3) / 2, 0.9, { seeThrough: true, noStand: true });
  }

  // --- the altar of lava in the middle with two white orbs, the two statues flanking it
  k.add(cyl(1.0, 1.15, 0.5, 20), g, 0, 0.25, 0.4); k.add(cyl(0.75, 0.75, 0.04, 20), LAVA(), 0, 0.52, 0.4);
  for (const sx of [-1, 1]) k.add(sphere(0.16, 12, 8), MAT.glow('#ffffff', '#e8f0ff', 0.9), sx * 0.55, 0.7, 0.4);
  B.ccol(0, 0.4, 1.1, 0.9, { noStand: true });
  B.put(-2.2, 0.0, 0.3, (kk) => statue(kk, 'monk')); B.put(2.2, 0.0, -0.3, (kk) => statue(kk, 'insect'));

  // --- the sealed door in the left wall at the back, up a short stair: open now, dark beyond; four empty sockets
  const SDX = LX + 0.3;
  for (let i = 0; i < 3; i++) { const top = 0.2 * (i + 1), x = LX + 1.6 - (i + 0.5) * 0.42; k.add(rbox(0.44, top, 2.0, 0.02), g, x, top / 2, SEALZ); B.col(x, SEALZ, 0.22 + 0.12, 1.0, top, { stair: true }); }
  k.add(rbox(0.12, 3.0, 2.0, 0.03), MAT.flat('#0a0b0e', 0.95), SDX - 0.18, 0.6 + 1.5, SEALZ);
  for (const s of [-1, 1]) k.add(rbox(0.4, 3.4, 0.4, 0.04), g, SDX + 0.05, 0.6 + 1.7, SEALZ + s * 1.2);
  k.add(rbox(0.4, 0.4, 2.8, 0.04), g, SDX + 0.05, 0.6 + 3.4, SEALZ);
  for (let i = 0; i < 4; i++) k.add(cyl(0.12, 0.12, 0.05, 12), MAT.paint('#1a1c20', 0.5), SDX + 0.27, 0.6 + 3.4, SEALZ - 0.9 + i * 0.6, 0, { rz: Math.PI / 2 });
  const leaf = k.mesh(new THREE.BoxGeometry(0.16, 3.0, 2.0), g, SDX + 0.02, 0.6 + 1.5, SEALZ);   // (the door's stone leaf: it rises into the lintel as it opens)
  const sealCol = B.col(SDX + 0.3, SEALZ, 0.2, 1.0, 3.6, { noStand: true });
  const seal = { x: B.cx + SDX + 0.6, z: B.cz + SEALZ, open: true, t: 1,
    setOpen(b, instant) { this.open = !!b; if (instant) this.t = this.open ? 1 : 0; sealCol.enabled = !this.open; } };
  R.updaters.push((dt) => { seal.t += ((seal.open ? 1 : 0) - seal.t) * Math.min(1, dt * 2); leaf.position.y = 0.6 + 1.5 + seal.t * 3.1; leaf.visible = seal.t < 0.98; });
  seal.setOpen(true, true);

  B.light('#ff8a5a', 3.5, 12, 0, 1.6, 0.4); B.light('#ff6a3a', 2.5, 9, LX + 1.6, 1.2, -2.8); B.light('#d8e4ff', 4, 16, 0, 5.0, -2.0); B.light('#ffb080', 2, 8, W / 2 - 1.8, 1.2, -1.0);

  Object.assign(TEMPLE, { murals, lectern: { x: B.cx + LECX, z: B.cz + LECZ + 0.7, r: 1.0 }, sealDoor: seal });
  R.templeMurals = murals;
  return { celtemple: B.finish() };
}

// the portal on Celebration's plaza: two dark pillars, a lintel with two horned heads, a dark stair going down
export function buildCelPortal(group, physics) {
  const o = group.position, g = GRANITE(), k = new THREE.Group(); group.add(k);
  const H = (x, z) => physics.groundAt(o.x + x, o.z + z, 99);
  const y = H(PORTAL.x, PORTAL.z + 0.6), x = PORTAL.x, z = PORTAL.z;
  const box = (w, h, d, m, px, py, pz) => { const mm = new THREE.Mesh(rbox(w, h, d, 0.05), m); mm.position.set(px, py, pz); mm.castShadow = mm.receiveShadow = true; k.add(mm); return mm; };
  box(4.0, 0.6, 2.6, g, x, y - 0.25, z);                                   // the plinth
  box(2.4, 0.05, 1.8, MAT.flat('#0a0b0e', 0.95), x, y + 0.06, z - 0.2);     // the dark stairwell's mouth
  for (const s of [-1, 1]) { box(0.6, 3.4, 0.6, g, x + s * 1.5, y + 1.7, z + 0.6); physics.add({ type: 'box', x: o.x + x + s * 1.5, z: o.z + z + 0.6, hw: 0.32, hd: 0.32, top: y + 3.4, noStand: true }); }
  box(3.8, 0.6, 0.8, g, x, y + 3.7, z + 0.6);
  for (const s of [-1, 1]) { const hh = new THREE.Group(); hh.position.set(x + s * 1.0, y + 3.7, z + 1.05); k.add(hh); const kit = { add: (geo, m, px, py, pz, ry = 0, oo = {}) => { const mm = new THREE.Mesh(geo, m); mm.position.set(px, py, pz); mm.rotation.set(oo.rx || 0, ry, oo.rz || 0); mm.scale.set(oo.sx ?? 1, oo.sy ?? 1, oo.sz ?? 1); hh.add(mm); } }; hornedHead(kit); hh.scale.setScalar(0.7); }
  physics.add({ type: 'box', x: o.x + x, z: o.z + z - 0.4, hw: 1.2, hd: 0.9, top: y + 1.0, noStand: true, seeThrough: true });   // (the stairwell: walk into the door, not down the hole)
  return { door: { x: o.x + x, z: o.z + z + 1.2 } };
}
export function celTempleDoors() {
  return [{ house: 'celtemple', x: CEL.x + PORTAL.x, z: CEL.z + PORTAL.z + 1.25, r: 0.9, room: 'celtemple', region: 'isle_celebration' }];
}
export function celTempleExit(to) {
  if (to !== 'celtemple-out') return null;
  return { room: 'isle_celebration', x: CEL.x + PORTAL.x, z: CEL.z + PORTAL.z + 2.4, a: 0 };
}
