// KEYS-CLOVER (docs/lba-maturity/KEYS-CLOVER.md; the user's answers of 25.11): the four rooms behind LBA's small-key
// doors, and the pieces outside them (the keys' spots, the boxes, the bar gate, the fountain's high jet). Ours: our own
// geometry from the game's props; LBA1/LBA2 give only the idea (a small key opens the one door of its area; a clover
// box raises the clover cap). story/keysclover.js plays them.
//
// Rooms (each its own lazy regions.js group, far from everything at KR_AT; the room camera as every interior: the far
// walls -x and -z drawn tall, the near rims low):
//   kc_tunnel  FunFrock's old passage (Citadel, chapter 1 on): a vaulted stone run under the fort, from the north face's
//              barred mouth (the left wall) to the ladder up to the yard's trapdoor (the back wall, east end); the side
//              niche with clover box B1, the barred SHELTER door, the watch's table.
//   kc_pump    Otringal's fountain pump house (chapter 4 on): pipes, the HIGH JET wheel, BASIN and SPOUT, clover box B2
//              on the shelf.
//   kc_goats   Pim's grandmother's old house in Lhar, the goats' now (chapter 6 on): the stall below, a stair to the
//              loft; Grandma's trunk, the loft window, clover box B3.
//   kc_mill    Baldino's old mill room under Zeelich's north mill (chapter 14, Baldino's Network, on): his first
//              workbench, a photo, the cracked first millstone, his biscuit tin.
//
// CONTRACT (world coordinates)
//   KR_AT { roomId: {x, z} }; buildKcTunnel / buildKcPump / buildKcGoats / buildKcMill (scene, physics) → { [id]: R }
//   KR[id] (filled when built): { looks [{x, z, y?, r, key}], box {x, z, y}, setBox(open), ... per room:
//     kc_tunnel: bolt {x, z} (the ladder's foot), fromYard {x, z, a}, setBolt(open) (the hatch's light; the ladder's exit)
//     kc_pump:   valve {x, z}, setJet(on) (the wheel's turn)
//     kc_mill:   tin {x, z}, setTin(open)
//   clover box prop: cloverBox(k) (a small LBA-style casket, its lid apart: boxLid) → its footprint
import * as THREE from 'three';
import { RoomBuilder, glowSprite } from './interiors.js';
import { esmerRoom } from './zhomes.js';
import { MAT, M, rbox, plane, cyl, sphere, canvasTex, table, chair, crate, barrel, chest, gauge, valveWheel, workbench, toolBoard, wallShelf, frame, jar, papers } from './props.js';
import { sackPile, basket } from './roomdress.js';

export const KR_AT = { kc_tunnel: { x: 12400, z: 0 }, kc_pump: { x: 12500, z: 0 }, kc_goats: { x: 12600, z: 0 }, kc_mill: { x: 12700, z: 0 } };
export const KR_ROOMS = Object.keys(KR_AT);
export const KR = {};

// ---------------------------------------------------------------- shared pieces
const stencil = (lines, { bg = null, ink = '#e8dcc0', size = 56, w = 512, h = 192 } = {}) => canvasTex(w, h, (x, W, H) => {
  if (bg) { x.fillStyle = bg; x.fillRect(0, 0, W, H); } else x.clearRect(0, 0, W, H);
  x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `bold ${size}px monospace`;
  lines.forEach((l, i) => x.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.2));
});
const decal = (tex) => { const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }); m.userData.noShadow = true; return m; };
// a clover leaf drawn flat (four hearts), for the box's lid
const cloverTex = () => M('kc_clovertex', () => canvasTex(128, 128, (x, W) => {
  x.clearRect(0, 0, W, W); x.translate(W / 2, W / 2);
  for (let i = 0; i < 4; i++) { x.save(); x.rotate(Math.PI / 4 + i * Math.PI / 2); x.fillStyle = '#5fe36a'; x.strokeStyle = '#14501d'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(-34, -14, -50, -42, -34, -58); x.bezierCurveTo(-22, -70, -6, -66, 0, -54); x.bezierCurveTo(6, -66, 22, -70, 34, -58); x.bezierCurveTo(50, -42, 34, -14, 0, 0); x.fill(); x.stroke(); x.restore(); }
}));
// the clover box: a small casket in dark wood with brass corners, a clover on its lid; the lid a pivot (open: -1.9)
export function cloverBox(k) {
  const w = 0.5, d = 0.34, h = 0.26;
  k.add(rbox(w, h, d, 0.02), MAT.wood('dark'), 0, h / 2, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(rbox(0.06, h + 0.01, 0.06, 0.01), MAT.brass(), sx * (w / 2 - 0.02), h / 2, sz * (d / 2 - 0.02));
  k.add(rbox(0.06, 0.08, 0.02, 0.005), MAT.brass(), 0, h - 0.05, d / 2 + 0.005);
  // inside: a green velvet bed (seen when the lid is up)
  k.add(rbox(w - 0.06, 0.02, d - 0.06, 0.005), MAT.cloth('#2f7a3a'), 0, h - 0.035, 0);
  return { hw: w / 2, hd: d / 2, top: h + 0.06 };
}
// the lid as its own group (it opens), hinged at the box's back edge
function boxLid(group, x, y, z, ry) {
  const base = new THREE.Group(); base.position.set(x, y, z); base.rotation.y = ry; group.add(base);
  const hinge = new THREE.Group(); hinge.position.set(0, 0.26, -0.17); base.add(hinge);
  const lm = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.36), MAT.wood('dark')); lm.position.set(0, 0.03, 0.17); lm.castShadow = true; hinge.add(lm);
  const cm = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.24), decal(cloverTex())); cm.rotation.x = -Math.PI / 2; cm.position.set(0, 0.062, 0.17); hinge.add(cm);
  // a leaf inside, seen when it is open, gone once taken
  const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), decal(cloverTex())); leaf.rotation.x = -Math.PI / 2; leaf.position.set(0, 0.245, 0); base.add(leaf);
  leaf.visible = false;
  return { setOpen(open) { hinge.rotation.x = open ? -1.9 : 0; leaf.visible = false; } };
}
// a clover box placed in a room (or outdoors on a group): its body in the kit, its lid a group; returns its API
export function placeBox(B, x, z, ry, y = 0) {
  B.put(x, z, ry, (kk) => { const fp = cloverBox(kk); return { hw: fp.hw, hd: fp.hd, top: fp.top }; }, { y });
  const L = boxLid(B.group, x, y, z, ry);
  return L;
}
// a hanging lantern on a wall bracket (room-local; y its bracket's height), with its glow
function wallLantern(B, x, y, z, ry, color = '#ffc878') {
  const k = B.k;
  k.at(x, y, z, ry, () => {
    k.add(rbox(0.06, 0.06, 0.34, 0.01), MAT.iron(), 0, 0, 0.17);
    k.add(cyl(0.012, 0.012, 0.18, 4), MAT.iron(), 0, -0.09, 0.32);
    k.add(cyl(0.09, 0.11, 0.06, 8), MAT.iron(), 0, -0.2, 0.32);
    k.add(cyl(0.08, 0.08, 0.2, 8), MAT.glow('#ffe6b0', '#ffb050', 1.6), 0, -0.33, 0.32);
    k.add(cyl(0.11, 0.09, 0.05, 8), MAT.iron(), 0, -0.45, 0.32);
  });
  const s = Math.sin(ry), c = Math.cos(ry);
  const gx = x + s * 0.32, gz = z + c * 0.32;
  const h = glowSprite(color, 1.0, 0.5); h.position.set(gx, y - 0.33, gz); B.group.add(h);
  return B.light(color, 2.6, 8, gx, y - 0.2, gz);
}

// ================================================================ kc_tunnel · FunFrock's old passage
export function buildKcTunnel(scene, physics) {
  const at = KR_AT.kc_tunnel, B = new RoomBuilder(scene, physics, 'kc_tunnel', at.x, at.z);
  const R = B.room, k = B.k;
  const W = 15, D = 3.6, H = 3.2;
  R.view = 11; R.follow = 0.85; R.music = 'cave'; R.surface = 'stone';
  R.indoor = { sunDir: [0.42, 0.78, 0.46], sun: 0.6, hemi: 0.85 };
  const stone = MAT.stone('grey', 2), dark = MAT.flat('#0c0d10', 0.95), iron = MAT.iron();
  const SH = 1.5, LAD = 5.6, NICHE = -3.4, TABLE = -0.6;   // (local x along the run: the SHELTER door, the ladder, the niche, the table)
  B.shell({ W, D, H, t: 0.45, floor: MAT.stone('sand', 1.4), slab: MAT.rubble('grey'), rimMat: stone,
    body: stone, low: null, dado: 0.9, rail: MAT.stone('grey', 1), cap: MAT.stone('sand', 1), beam: null,
    left: [{ at: 0, w: 1.3, h: 2.25, y0: 0, kind: 'door', frame: MAT.stone('sand', 1), view: MAT.flat('#cfd8e0', 0.9, { emissive: '#8a9aa8', emissiveIntensity: 0.6 }) }],
    back: [{ at: SH, w: 1.2, h: 2.15, y0: 0, kind: 'door', frame: iron, view: dark }] });
  // ribs of the vault on the back wall: dressed arches every 3 m (the cut-away shows their springing)
  for (let x = -6; x <= 6; x += 3) if (Math.abs(x - SH) > 1 && Math.abs(x - NICHE) > 1 && Math.abs(x - LAD) > 1) {
    k.add(rbox(0.36, H, 0.16, 0.03), MAT.stone('sand', 1), x, H / 2, -D / 2 + 0.08);
    k.add(rbox(0.16, H, 0.36, 0.03), MAT.stone('sand', 1), -W / 2 + 0.08, H / 2, x * 0.2);
  }
  R.exits.push({ ...B.world(-W / 2 + 0.35, 0), r: 0.7, to: 'kc-fort-n' });
  R.spawn = { ...B.world(-W / 2 + 1.5, 0), a: Math.PI / 2 };
  // the barred SHELTER door in the back wall
  for (let i = -2; i <= 2; i++) k.add(cyl(0.025, 0.025, 2.15, 5), iron, SH + i * 0.22, 1.08, -D / 2 + 0.07);
  for (const y of [0.5, 1.6]) k.add(rbox(1.1, 0.05, 0.04, 0.01), iron, SH, y, -D / 2 + 0.08);
  k.add(plane(1.0, 0.36), decal(stencil(['SHELTER'], { bg: '#e8c84a', ink: '#1a1410', size: 92, h: 160 })), SH, 2.42, -D / 2 + 0.03);
  B.col(SH, -D / 2 + 0.1, 0.6, 0.12, 2.2, { noStand: true });
  // the side niche: an arched recess, a stone step, the clover box on it
  k.add(plane(1.1, 1.5), dark, NICHE, 0.95, -D / 2 + 0.012);   // (FLICKER-142: 1.2 cm off the wall, not 5 mm)
  k.add(rbox(1.4, 0.18, 0.2, 0.03), MAT.stone('sand', 1), NICHE, 1.78, -D / 2 + 0.1);
  for (const s of [-1, 1]) k.add(rbox(0.16, 1.7, 0.2, 0.03), MAT.stone('sand', 1), NICHE + s * 0.63, 0.85, -D / 2 + 0.1);
  B.put(NICHE, -D / 2 + 0.42, 0, () => { k.add(rbox(1.0, 0.24, 0.5, 0.03), MAT.stone('sand', 1), 0, 0.12, 0); return { hw: 0.5, hd: 0.25, top: 0.24 }; });
  const BOX = { x: NICHE, z: -D / 2 + 0.4, y: 0.24 };
  const lidB = boxLid(B.group, BOX.x, BOX.y, BOX.z, 0);
  B.put(BOX.x, BOX.z, 0, (kk) => cloverBox(kk), { y: BOX.y, noCol: true });
  // the watch's table: a plank table, a stool, a lantern on it, the roster pinned to the wall over it
  B.put(TABLE, -D / 2 + 0.5, 0, (kk) => table(kk, { w: 1.1, d: 0.6, pal: 'dark' }));
  B.put(TABLE + 0.2, -D / 2 + 1.15, 0.3, (kk) => { kk.add(cyl(0.18, 0.2, 0.05, 10), MAT.wood('dark'), 0, 0.45, 0); for (let i = 0; i < 3; i++) kk.add(cyl(0.025, 0.03, 0.45, 5), MAT.wood('dark'), Math.sin(i * 2.1) * 0.12, 0.22, Math.cos(i * 2.1) * 0.12); return { r: 0.2, top: 0.48 }; });
  k.add(plane(0.5, 0.66), MAT.map(canvasTex(128, 168, (x, w, h) => { x.fillStyle = '#efe4c8'; x.fillRect(0, 0, w, h); x.fillStyle = '#3a2a1a'; x.font = 'bold 13px monospace'; x.fillText('WATCH ROSTER', 12, 20); for (let i = 0; i < 8; i++) { x.fillRect(12, 34 + i * 12, 70 + (i * 37) % 30, 2); x.fillRect(12, 38 + i * 12, 60, 1); } x.font = 'bold 15px sans-serif'; x.fillStyle = '#8a2a1a'; x.fillText('TEA TIN', 30, 150); }), 0.9), TABLE, 1.5, -D / 2 + 0.02);
  papers(k, TABLE - 0.2, 0.78, -D / 2 + 0.45, 3, 11, 'form');
  // the ladder up the shaft to the yard's trapdoor (east end of the back wall), the hatch's light once the bolt is drawn
  for (const s of [-1, 1]) k.add(rbox(0.07, H + 0.6, 0.07, 0.01), MAT.wood('dark'), LAD + s * 0.24, (H + 0.6) / 2, -D / 2 + 0.2);
  for (let y = 0.3; y < H + 0.4; y += 0.32) k.add(cyl(0.022, 0.022, 0.5, 6), MAT.wood('honey'), LAD, y, -D / 2 + 0.2, 0, { rz: Math.PI / 2 });
  k.add(plane(1.0, 0.8), dark, LAD, H - 0.2, -D / 2 + 0.01);
  const shaftLight = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), MAT.glow('#f4f0e4', '#e8e0c8', 1.2)); shaftLight.position.set(LAD, H - 0.15, -D / 2 + 0.02); B.group.add(shaftLight);
  const boltM = new THREE.Group(); boltM.position.set(LAD - 1.1, 1.4, -D / 2 + 0.12); B.group.add(boltM);
  { const bm = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.06), iron); bm.castShadow = true; boltM.add(bm); const kn = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), MAT.brass()); kn.position.set(0.21, 0, 0.04); boltM.add(kn); }
  k.add(rbox(0.12, 0.14, 0.06, 0.01), iron, LAD - 0.84, 1.4, -D / 2 + 0.1);
  // (the bolt's rod up the wall to the hatch: drawn here, 1.2 m from the ladder, so he is not standing in the ladder's way up when it opens)
  k.add(cyl(0.02, 0.02, H - 1.3, 5), iron, LAD - 1.3, 1.4 + (H - 1.3) / 2, -D / 2 + 0.1);
  k.add(rbox(1.1, 0.04, 0.04, 0.01), iron, LAD - 0.75, H - 0.05, -D / 2 + 0.1);
  // rubble and an old barrel at the east end; a fallen grille at the west
  B.put(W / 2 - 0.7, -D / 2 + 0.6, 0.3, (kk) => barrel(kk, { r: 0.28, h: 0.78, pal: 'dark' }));
  B.put(W / 2 - 1.5, D / 2 - 0.55, 0.1, (kk) => crate(kk, 0.55, { pal: 'dark' }));
  // lights: three wall lanterns along the back wall
  for (const x of [-5.4, -1.8, 3.2]) wallLantern(B, x, 2.3, -D / 2 + 0.02, 0);
  wallLantern(B, LAD - 1.0, 2.6, -D / 2 + 0.02, 0, '#ffd8a0');
  B.finish();
  const exitYard = { ...B.world(LAD, -D / 2 + 0.55), r: 0.5, to: 'kc-fort-yard' };
  KR.kc_tunnel = {
    looks: [
      { ...B.world(SH, -D / 2 + 0.9), r: 1.3, key: 'shelter' },
      { ...B.world(TABLE, -D / 2 + 1.1), r: 1.2, key: 'roster' },
    ],
    box: { ...B.world(BOX.x, BOX.z + 0.55), y: 0 },
    bolt: B.world(LAD - 1.2, -D / 2 + 0.75),
    fromYard: { ...B.world(LAD, -D / 2 + 1.7), a: 0 },
    setBox(open) { lidB.setOpen(open); },
    setBolt(open) {
      shaftLight.visible = !!open; boltM.position.x = LAD - (open ? 1.3 : 1.1);
      const i = R.exits.indexOf(exitYard);
      if (open && i < 0) R.exits.push(exitYard); else if (!open && i >= 0) R.exits.splice(i, 1);
    },
  };
  KR.kc_tunnel.setBolt(false);
  return { kc_tunnel: R };
}

// ================================================================ kc_pump · Otringal's fountain pump house
export function buildKcPump(scene, physics) {
  const o = esmerRoom('kc_pump', { W: 3.4, D: 3.8, H: 3.0, doorZ: 0.8, at: KR_AT.kc_pump, reg: KR, band: false, wall: '#e6dad0', light: '#e8f4ff' }, scene, physics);
  const { B, R, k, BZ, W, D, H } = o;
  R.view = 8.5;
  const cu = MAT.copper(), br = MAT.brass();
  // three pipes up the back wall into the floor: the main to the HIGH JET wheel, BASIN and SPOUT beside it
  const P = [-0.9, 0.0, 0.85];
  for (const x of P) { k.add(cyl(0.07, 0.07, H, 10), cu, x, H / 2, BZ + 0.2); for (const y of [0.4, 1.6, 2.6]) k.add(cyl(0.1, 0.1, 0.06, 10), br, x, y, BZ + 0.2); }
  k.add(cyl(0.06, 0.06, 2.0, 10), cu, -0.05, 2.2, BZ + 0.2, 0, { rz: Math.PI / 2 });
  // the big wheel (it turns) on the main, its plate; the two small wheels
  const wheel = new THREE.Group(); wheel.position.set(B.cx * 0 + P[0], 1.25, BZ + 0.36); B.group.add(wheel);
  { const kw = { add: (geo, mat, x = 0, y = 0, z = 0, ry = 0, oo = {}) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(oo.rx || 0, ry, oo.rz || 0); m.castShadow = true; wheel.add(m); return kw; } }; valveWheel(kw, { r: 0.3, color: '#b8302a' }); }
  B.col(P[0], BZ + 0.3, 0.35, 0.18, 1.6, { noStand: true });
  k.add(plane(0.5, 0.2), decal(stencil(['HIGH JET'], { bg: '#d8b45a', ink: '#2a1a0a', size: 80, h: 160 })), P[0], 1.75, BZ + 0.29);
  for (const [x, c, word] of [[P[1], '#2a6ab8', 'BASIN'], [P[2], '#2a6ab8', 'SPOUT']]) {
    k.at(x, 1.1, BZ + 0.3, 0, () => valveWheel(k, { r: 0.13, color: c }));
    k.add(plane(0.34, 0.12), decal(stencil([word], { bg: '#e8dcc0', ink: '#1a2a4a', size: 70, h: 140 })), x, 1.38, BZ + 0.29);
  }
  k.at(P[1] + 0.42, 1.8, BZ + 0.06, 0, () => gauge(k, { r: 0.12, zone: '#2a8ab8', v: 0.55, stem: false }));
  // the shelf over the right of the back wall with the clover box; a bucket and a mop (the dripping)
  k.at(1.05, 1.35, BZ + 0.15, 0, () => wallShelf(k, { w: 0.9, d: 0.3, pal: 'dark' }));
  const BOX = { x: 1.05, z: BZ + 0.18, y: 1.39 };
  const lidB = boxLid(B.group, BOX.x, BOX.y, BOX.z, 0);
  k.at(BOX.x, BOX.y, BOX.z, 0, () => cloverBox(k));
  B.put(W / 2 - 0.45, D / 2 - 0.5, 0, (kk) => { kk.add(cyl(0.16, 0.13, 0.3, 12, true), MAT.paint('#6a8aa0', 0.6), 0, 0.15, 0); kk.add(cyl(0.12, 0.12, 0.01, 12), MAT.flat('#8ac8e0', 0.2), 0, 0.26, 0); kk.add(cyl(0.015, 0.015, 1.3, 5), MAT.wood('honey'), 0.18, 0.62, -0.05, 0, { rz: 0.25 }); return { r: 0.2, top: 0.3 }; });
  // a puddle under the pipes
  { const pm = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), MAT.flat('#9ac8d8', 0.1, { metalness: 0.2 })); pm.rotation.x = -Math.PI / 2; pm.position.set(-0.2, 0.012, BZ + 0.8); pm.scale.set(1.3, 0.8, 1); B.group.add(pm); }
  B.finish();
  Object.assign(KR.kc_pump, {
    looks: [{ x: o.X(P[1] + 0.4), z: o.Z(BZ + 0.8), r: 0.9, key: 'small' }],
    box: { x: o.X(BOX.x), z: o.Z(BZ + 0.75), y: 0 },
    valve: { x: o.X(P[0]), z: o.Z(BZ + 0.8) },
    setBox(open) { lidB.setOpen(open); },
    setJet(on) { wheel.rotation.z = on ? 2.4 : 0; },
  });
  return { kc_pump: R };
}

// ================================================================ kc_goats · Grandma's old house in Lhar
export function buildKcGoats(scene, physics) {
  const at = KR_AT.kc_goats, B = new RoomBuilder(scene, physics, 'kc_goats', at.x, at.z);
  const R = B.room, k = B.k;
  const W = 5.0, D = 4.4, H = 4.6, LOFT = 2.2, DOORZ = 1.3;
  R.view = 10.5; R.follow = 0.6; R.music = 'hamalayi_in'; R.surface = 'wood';
  R.indoor = { sunDir: [0.42, 0.78, 0.46], sun: 0.7, hemi: 0.95 };
  const wall = MAT.plaster('#d2c4ae'), wood = MAT.wood('dark'), planks = MAT.planks('dark');
  B.shell({ W, D, H, t: 0.45, floor: MAT.planks('honey'), slab: MAT.rubble('grey'), rimMat: MAT.stone('grey', 1),
    body: wall, low: MAT.wood('dark'), dado: 0.9, rail: wood, cap: MAT.stone('grey', 1), beam: wood,
    posts: wood, postsAt: (L) => [0.3, L - 0.3],
    left: [{ at: DOORZ, w: 1.1, h: 2.1, y0: 0, kind: 'door', frame: wood }],
    back: [{ at: -0.35, w: 0.7, h: 0.8, y0: LOFT + 0.55, kind: 'window', frame: wood, view: { tile: 'village' } }] });
  R.exits.push({ ...B.world(-W / 2 + 0.4, DOORZ), r: 0.7, to: 'kc_goats-out' });
  R.spawn = { ...B.world(-W / 2 + 1.4, DOORZ), a: Math.PI / 2 };
  // the stall below: straw, the manger along the back wall under the loft, a milking stool, a bucket, a bell on a hook
  const straw = MAT.flat('#d8b860', 0.95);
  for (const [x, z, s] of [[-1.2, -0.6, 1.4], [0.6, 0.6, 1.0], [-0.4, 1.4, 0.8], [1.6, -0.2, 0.7]]) { const m = new THREE.Mesh(new THREE.CircleGeometry(s * 0.5, 9), straw); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.015, z); m.scale.set(1.2, 0.8, 1); m.receiveShadow = true; B.group.add(m); }
  B.put(-1.3, -D / 2 + 0.4, 0, () => { k.add(rbox(1.9, 0.5, 0.55, 0.03), planks, 0, 0.45, 0); k.add(rbox(1.7, 0.14, 0.4, 0.02), straw, 0, 0.66, 0); for (const s of [-1, 1]) k.add(rbox(0.08, 0.7, 0.08, 0.01), wood, s * 0.9, 0.35, 0.2); return { hw: 0.95, hd: 0.28, top: 0.75 }; });
  B.put(0.4, 0.5, 0.4, (kk) => { kk.add(cyl(0.16, 0.16, 0.04, 8), MAT.wood('honey'), 0, 0.32, 0); for (let i = 0; i < 3; i++) kk.add(cyl(0.02, 0.025, 0.32, 5), MAT.wood('honey'), Math.sin(i * 2.1) * 0.1, 0.16, Math.cos(i * 2.1) * 0.1); return { r: 0.16, top: 0.34 }; });
  B.put(0.85, 0.8, 0, (kk) => { kk.add(cyl(0.15, 0.12, 0.3, 12, true), MAT.wood('honey'), 0, 0.15, 0); kk.add(cyl(0.012, 0.012, 0.3, 5), MAT.iron(), 0, 0.33, 0, 0, { rz: Math.PI / 2 }); return { r: 0.16, top: 0.3 }; });
  k.add(cyl(0.012, 0.012, 0.18, 5), MAT.iron(), -W / 2 + 0.06, 1.75, -0.4);
  k.add(cyl(0.07, 0.1, 0.13, 8), MAT.brass(), -W / 2 + 0.1, 1.6, -0.4);
  // the stair up along the back wall's east half (eight steps, climbing west), the loft over the west half
  // (treads 1.1 m deep: he is 0.9 m across, and the rail along their open side keeps him off them from the room; the
  //  treads are stair bricks — the height under his feet decides — laid a little over each other: no seam to drop him)
  const N = 8, rise = LOFT / N, run = 0.27, SX0 = 2.12, SD = 1.1, SZ = -D / 2 + SD / 2;
  for (let i = 0; i < N; i++) {
    const x = SX0 - i * run, top = (i + 1) * rise;
    k.add(rbox(run + 0.02, 0.06, SD - 0.02, 0.01), MAT.planks('honey'), x, top - 0.03, SZ);
    k.add(rbox(run, top - 0.06, SD - 0.08, 0.01), planks, x, (top - 0.06) / 2, SZ);
    B.col(x, SZ, run / 2 + 0.09, SD / 2, top, { stair: true });   // (+0.09: over each other and the loft's edge under groundAt's 5 cm shrink)
  }
  const LX1 = SX0 - (N - 1) * run - run / 2;   // (the loft's east edge: the top step's west edge)
  // the rail along the treads' open side, from the third tread up to the loft (the first two are stepped onto from the room)
  { const x0 = LX1, x1 = SX0 - 1.5 * run, zr = SZ + SD / 2 + 0.03, len = x1 - x0, slope = Math.atan2(rise, run);
    for (let x = x0 + 0.05; x <= x1 + 0.01; x += (x1 - x0) / 3) { const ty = (SX0 - x) / run * rise + rise; k.add(rbox(0.05, 0.9, 0.05, 0.01), wood, x, ty + 0.45, zr); }
    k.add(rbox(Math.hypot(len, len / run * rise) + 0.1, 0.06, 0.07, 0.02), wood, (x0 + x1) / 2, ((SX0 - x0) / run * rise + (SX0 - x1) / run * rise) / 2 + rise + 0.9, zr, 0, { rz: -slope });
    B.col((x0 + x1) / 2, zr, len / 2, 0.04, LOFT + 1.0, { noStand: true, seeThrough: true }); }
  const LD = 2.0, LW = LX1 + W / 2;           // (the loft: from the west wall to LX1, the back wall 2.0 m out)
  k.add(rbox(LW, 0.14, LD, 0.02), MAT.planks('honey'), -W / 2 + LW / 2, LOFT - 0.07, -D / 2 + LD / 2);
  for (const x of [-W / 2 + 0.6, LX1 - 0.15]) k.add(rbox(0.16, LOFT, 0.16, 0.02), wood, x, LOFT / 2, -D / 2 + LD - 0.1);
  k.add(rbox(LW, 0.2, 0.16, 0.02), wood, -W / 2 + LW / 2, LOFT - 0.22, -D / 2 + LD - 0.1);
  B.col(-W / 2 + LW / 2, -D / 2 + LD / 2, LW / 2, LD / 2, LOFT, { bottom: LOFT - 0.2 });
  for (const x of [-W / 2 + 0.6, LX1 - 0.15]) B.col(x, -D / 2 + LD - 0.1, 0.1, 0.1, LOFT - 0.2, { noStand: true });
  // the loft's rail along its open front (to the stair's top), its colliders
  for (let x = -W / 2 + 0.3; x < LX1 - 0.1; x += 0.45) k.add(rbox(0.05, 0.8, 0.05, 0.01), wood, x, LOFT + 0.4, -D / 2 + LD - 0.05);
  k.add(rbox(LW - 0.3, 0.07, 0.08, 0.02), wood, -W / 2 + (LW - 0.3) / 2, LOFT + 0.82, -D / 2 + LD - 0.05);
  B.col(-W / 2 + (LW - 0.3) / 2, -D / 2 + LD - 0.05, (LW - 0.3) / 2, 0.06, LOFT + 1.0, { bottom: LOFT, noStand: true, seeThrough: true });
  // up on the loft: hay, Grandma's trunk, a chair by the window, the clover box on a crate
  B.put(-W / 2 + 0.55, -D / 2 + 0.45, 0, (kk) => { kk.add(rbox(0.9, 0.6, 0.7, 0.1), straw, 0, 0.3, 0); kk.add(rbox(0.7, 0.4, 0.5, 0.1), straw, 0.1, 0.7, 0.05); return { hw: 0.45, hd: 0.35, top: 0.9 }; }, { y: LOFT });
  B.put(-0.95, -D / 2 + 0.3, 0, (kk) => chest(kk, { w: 0.8, d: 0.46, h: 0.44, pal: 'red' }), { y: LOFT });
  B.put(-1.45, -D / 2 + 1.6, 2.9, (kk) => chair(kk, { pal: 'dark', cushion: '#a83a5a' }), { y: LOFT });
  B.put(-W / 2 + 0.4, -D / 2 + 1.55, 0, (kk) => crate(kk, 0.5, { pal: 'honey' }), { y: LOFT });
  const BOX = { x: -W / 2 + 0.4, z: -D / 2 + 1.55, y: LOFT + 0.5 };   // (the loft's middle stays clear from the stair's top: he walks in past the rail)
  const lidB = boxLid(B.group, BOX.x, BOX.y, BOX.z, Math.PI / 2);
  k.at(BOX.x, BOX.y, BOX.z, Math.PI / 2, () => cloverBox(k));
  // lights: a lamp under the loft over the stall, one up in the loft
  wallLantern(B, 1.2, 2.0, -D / 2 + 1.0, 0);
  B.light('#ffe2b0', 2.6, 7, -1.2, LOFT + 1.6, -D / 2 + 1.0);
  B.finish();
  const ly = LOFT;
  KR.kc_goats = {
    looks: [
      { ...B.world(-1.3, -D / 2 + 1.0), y: 0, r: 1.2, key: 'stall' },
      { ...B.world(-0.95, -D / 2 + 0.95), y: ly, r: 0.9, key: 'trunk' },
      { ...B.world(-0.35, -D / 2 + 0.75), y: ly, r: 0.75, key: 'window' },
    ],
    box: { ...B.world(BOX.x + 0.55, BOX.z + 0.05), y: ly },
    // the stair: where he stands before it, its first tread, and the way up (west, along the back wall)
    stair: { foot: B.world(SX0, SZ + 1.0), onto: B.world(SX0, SZ), top: B.world(LX1 - 0.4, SZ), a: -Math.PI / 2 },   // (the first tread is stepped onto from the room, beside the east wall)
    setBox(open) { lidB.setOpen(open); },
  };
  return { kc_goats: R };
}

// ================================================================ kc_mill · Baldino's old mill room (Zeelich)
export function buildKcMill(scene, physics) {
  const o = esmerRoom('kc_mill', { W: 4.6, D: 4.4, H: 3.4, doorZ: 1.2, at: KR_AT.kc_mill, reg: KR, band: false, wall: '#ddd6cc', dado: '#8a6a4a', floor: ['#c8bca8', '#b0a48e', '#6a5a4a'], light: '#ffe8c8', frame: '#8a6a4a', capCol: '#d8d0c4' }, scene, physics);
  const { B, R, k, BZ, W, D, H } = o;
  R.view = 9.5;
  // Baldino's first workbench along the back wall, the tool board over it
  B.put(-0.2, BZ + 0.45, 0, (kk) => workbench(kk, { w: 2.2, d: 0.7, h: 0.88 }));
  k.at(-0.2, 1.3, BZ + 0.03, 0, () => toolBoard(k, 1.8, 0.8));
  // on the bench: the self-buttering toaster (a box with slots and a little arm), the bicycle fan, the biscuit tin
  k.add(rbox(0.32, 0.22, 0.2, 0.03), MAT.paint('#c8c0b0', 0.4), -0.9, 1.0, BZ + 0.45);
  for (const s of [-1, 1]) k.add(rbox(0.2, 0.02, 0.03, 0.005), MAT.flat('#1a1a1a'), -0.9, 1.115, BZ + 0.45 + s * 0.05);
  k.add(cyl(0.012, 0.012, 0.28, 5), MAT.brass(), -0.72, 1.18, BZ + 0.45, 0, { rz: 0.9 });
  k.add(rbox(0.08, 0.02, 0.05, 0.005), MAT.flat('#f0e0a0'), -0.62, 1.27, BZ + 0.45);
  k.at(0.2, 0.88, BZ + 0.42, 0.3, () => {
    k.add(new THREE.TorusGeometry(0.22, 0.02, 6, 20), MAT.flat('#2a2a2a'), 0, 0.3, 0);
    for (let i = 0; i < 4; i++) k.add(rbox(0.04, 0.2, 0.01, 0.004), MAT.paint('#3a8ab8', 0.5), Math.sin(i * 1.57) * 0.1, 0.3 + Math.cos(i * 1.57) * 0.1, 0.02, 0, { rz: i * 1.57 });
    k.add(cyl(0.015, 0.015, 0.3, 5), MAT.iron(), 0, 0.15, 0);
  });
  const lidT = new THREE.Group(); lidT.position.set(0.75, 0.88, BZ + 0.45); B.group.add(lidT);
  k.add(cyl(0.14, 0.14, 0.12, 14), MAT.paint('#b83a3a', 0.4), 0.75, 0.94, BZ + 0.45);
  { const lm = new THREE.Mesh(cyl(0.145, 0.145, 0.03, 14), MAT.paint('#e0b040', 0.4)); lm.position.set(0, 0.135, 0); lm.castShadow = true; lidT.add(lm); }
  // the photo on the left wall, the cracked first millstone against the right, flour sacks, a broom
  k.at(-W / 2 + 0.04, 1.6, -0.6, Math.PI / 2, () => frame(k, 0.5, 0.38, canvasTex(128, 96, (x, w, h) => { x.fillStyle = '#d8ccb0'; x.fillRect(0, 0, w, h); x.fillStyle = '#7a6a54'; x.fillRect(10, 10, w - 20, h - 20); x.fillStyle = '#efe6d4'; x.beginPath(); x.arc(46, 46, 12, 0, 7); x.arc(82, 42, 12, 0, 7); x.fill(); x.fillRect(36, 58, 22, 28); x.fillRect(72, 54, 22, 32); })));
  B.put(W / 2 - 0.5, BZ + 1.3, -0.3, () => { k.add(cyl(0.7, 0.7, 0.24, 20), MAT.stone('sand', 1), 0, 0.7, 0, 0, { rx: Math.PI / 2 - 0.25 }); k.add(rbox(0.05, 1.3, 0.26, 0.01), MAT.flat('#5a5048'), 0.08, 0.7, 0, 0, { rz: 0.3 }); return { hw: 0.72, hd: 0.3, top: 1.4 }; });
  B.put(W / 2 - 0.55, D / 2 - 0.6, 0.4, (kk) => sackPile(kk, { seed: 4 }));
  { const f = new THREE.Mesh(new THREE.CircleGeometry(0.7, 14), MAT.flat('#f2eee6', 0.95)); f.rotation.x = -Math.PI / 2; f.position.set(0.9, 0.012, 0.5); f.scale.set(1.3, 0.7, 1); B.group.add(f); }
  B.finish();
  Object.assign(KR.kc_mill, {
    looks: [
      { x: o.X(-0.7), z: o.Z(BZ + 1.1), r: 0.9, key: 'bench' },
      { x: o.X(-W / 2 + 0.8), z: o.Z(-0.6), r: 1.0, key: 'photo' },
      { x: o.X(W / 2 - 1.1), z: o.Z(BZ + 1.6), r: 1.0, key: 'stone' },
    ],
    tin: { x: o.X(0.75), z: o.Z(BZ + 1.1) },
    setTin(open) { lidT.position.y = 0.88 + (open ? 0.02 : 0); lidT.rotation.z = open ? 1.2 : 0; lidT.position.x = 0.75 + (open ? 0.18 : 0); },
  });
  return { kc_mill: R };
}

// ================================================================ outside: pieces the story puts in the world
// a small brass key, round-bowed (the HUD's), lying or hanging; its glint a sprite. Returns a group (y up).
export function smallKey(glint = true) {
  const g = new THREE.Group(), m = MAT.flat('#d8a840', 0.35, { metalness: 0.75 });
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.016, 6, 14), m); g.add(bow);
  const sh = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.022, 0.016), m); sh.position.x = 0.1; g.add(sh);
  for (const [x, h] of [[0.13, 0.04], [0.15, 0.03]]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.016, h, 0.016), m); t.position.set(x, -h / 2, 0); g.add(t); }
  for (const c of g.children) c.castShadow = true;
  if (glint) { const s = glowSprite('#fff2c0', 0.5, 0.7); g.add(s); g.userData.glint = s; }
  return g;
}
// the old powder chest in the fort's yard (Citadel): POWDER stencilled on its lid
export function powderChest(k) {
  const fp = chest(k, { w: 1.0, d: 0.58, h: 0.5, pal: 'dark', band: MAT.iron() });
  k.add(plane(0.6, 0.18), decal(stencil(['POWDER'], { ink: '#d8cfb8', size: 90, h: 160 })), 0, 0.3, 0.3);
  return fp;
}
// the passage's bar gate (Citadel's north face), hinged on its west jamb: its leaf a group that swings open
export function barGate(parent, x, y, z, ry) {
  const base = new THREE.Group(); base.position.set(x, y, z); base.rotation.y = ry; parent.add(base);
  const hinge = new THREE.Group(); hinge.position.set(-0.6, 0, 0.2); base.add(hinge);
  const iron = new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.45, metalness: 0.6 });
  for (let i = -2; i <= 2; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.35, 5), iron); b.position.set(0.6 + i * 0.26, 1.175, 0); b.castShadow = true; hinge.add(b); }
  for (const hy of [0.6, 1.6]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.05), iron); b.position.set(0.6, hy, 0); b.castShadow = true; hinge.add(b); }
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.08), MAT.brass()); lock.position.set(1.15, 1.1, 0.05); hinge.add(lock);
  return { setOpen(open) { hinge.rotation.y = open ? 1.75 : 0; lock.visible = !open; } };
}
// the fountain's high jet (Otringal): a white column out of the finial and the spray falling from its top (animated)
export function highJet(parent, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const mat = new THREE.MeshStandardMaterial({ color: '#f2feff', transparent: true, opacity: 0.7, emissive: '#a8e4f4', emissiveIntensity: 0.45, depthWrite: false, side: THREE.DoubleSide });
  mat.userData.noShadow = true;
  // (the column out of the finial, 2.4 m; its crown; a thin veil falling from the crown back over the top bowl)
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 2.4, 12, 1, true), mat); col.position.y = 1.2; g.add(col);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), mat); top.position.y = 2.4; top.scale.set(1, 0.5, 1); g.add(top);
  const veil = new THREE.MeshStandardMaterial({ color: '#eafaff', transparent: true, opacity: 0.14, roughness: 0.2, depthWrite: false, side: THREE.DoubleSide });
  veil.userData.noShadow = true;
  const fall = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.62, 2.8, 20, 1, true), veil); fall.position.y = 0.9; g.add(fall);
  g.visible = false;
  let t = 0;
  return {
    group: g,
    set(on) { g.visible = !!on; },
    update(dt) { if (!g.visible) return; t += dt; col.scale.x = col.scale.z = 1 + Math.sin(t * 13) * 0.08; top.scale.y = 0.5 + Math.sin(t * 9) * 0.08; fall.rotation.y += dt * 0.6; },
  };
}
