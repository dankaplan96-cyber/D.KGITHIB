// WA-14: Citadel's old sewers, after LBA2's scene 17 (the flooded hall) and scene 18 (its small treasure room).
// Our own geometry, from a study of the original's layout (numbers and descriptions only; nothing copied):
//   - a square hall flooded with pale cyan water; narrow stone walkways along the far walls, the north one raised,
//     with stairs between the levels; stepping slabs along the near (south) side; a long pier on the east side
//   - a raised island in the middle: a small square well-house (a barred door, an opening on top: the shaft up to
//     the street) and a railed, paved platform
//   - at the back (north-east) a colonnade before three barred arches: the middle one is the treasure room's gate
//   - iron railings with spear tops, short pillars with pale blue globe lamps, barrels, round blue rocks, dark spiked
//     iron rings along the water's edge, gargoyle heads on the corner pillars, small blue plaques
//   - dark and muted (the original measures stone #4f4e48, water #70b7c5, chroma ~7, L* ~40): the only colour is the
//     water and the lamps
// Twelve years on: the railings rust, three of the globe lamps are dead, and the project's new copper heat pipe comes
// down the well-house shaft with a blue valve box bolted straight onto the old gate winch. Its brace jams the winch,
// and the valve knocks every few seconds: the knocking people hear under the lane by the pump (story/sewers.js).
// The treasure room: a paved room with a dais and a star chest, two lamp pillars, a star plaque, a barrel, blue rocks
// and spiked rings, and Arthur's chalk on the wall (he found it first).
//
// CONTRACT
//   SEWER_AT {sewer, sewervault}  where the rooms stand (regions.js)
//   buildSewerHatch(scene, physics, world)  the grate in Bug Street (Citadel; built with it) → SEWER.hatch
//   buildSewerRooms(scene, physics) → { sewer, sewervault }   (regions.js group 'sewer')
//   SEWER.hatch {x, z, a, setOpen(b)}   SEWER.hall (the hall's room) {valve, gate, setValve(b, instant)}
//   SEWER.vault (the treasure room) {chest, setChest(b)}
//   sewerDoors() / sewerExit(to)   the grate (once lifted) leads down; 'sewer-out' leads back up beside it
import * as THREE from 'three';
import { RoomBuilder, blueRocks } from './interiors.js';
import { MAT, M, TEX, rbox, cyl, sphere, torus, lathe, plane, pipe, canvasTex, soft, softMat } from './props.js';
import * as P from './props.js';
import { textures } from '../engine/textures.js';

export const SEWER_AT = { sewer: { x: 5800, z: 0 }, sewervault: { x: 5880, z: 0 } };
// the grate: Bug Street, a few steps north of where the project's heat pipe dives under the lane (townlife.js PUMP)
export const HATCH = { x: -45.4, z: 56.6 };
export const SEWER = { hatch: null, hall: null, vault: null };

// ------------------------------------------------------------------ materials (dark, muted; colour only in the water and lamps)
const std = (map, color, rough, tile, extra = {}) => { const m = new THREE.MeshStandardMaterial({ map, color, roughness: rough, ...extra }); m.userData.tile = tile; return m; };
// (the masonry carries a little light of its own, as the original's pre-lit bricks do: its faces turned from every
//  lamp still read as stone, not as black)
const lit = (map, k) => ({ emissive: '#ffffff', emissiveMap: map, emissiveIntensity: k });
const stoneM = () => M('sw_stone', () => std(TEX.stone('grey'), '#9c968a', 0.95, 2.4, lit(TEX.stone('grey'), 0.38)));
const rubbleM = () => M('sw_rubble', () => std(TEX.rubble('grey'), '#a8a194', 0.95, 1.5, lit(TEX.rubble('grey'), 0.36)));
const capM = () => M('sw_cap', () => std(TEX.stone('grey'), '#b4ad9f', 0.9, 1.2, lit(TEX.stone('grey'), 0.22)));
const paveM = () => M('sw_pave', () => std(TEX.tiles('#7a776c', '#6e6b61', '#34322d', false, 2, 'sw'), '#ffffff', 0.9, 2.2));
const vaultFloorM = () => M('sw_vfloor', () => std(TEX.tiles('#76746c', '#6a6862', '#3a4a4c', false, 4, 'swv'), '#ffffff', 0.85, 2.0));
const ironM = () => MAT.iron();
const rustM = () => MAT.paint('#6e4532', 0.85);
const glowM = () => MAT.glow('#d6f2ff', '#5ab0e0', 1.5);
const deadM = () => MAT.flat('#4a5458', 0.35);
const waterM = () => M('sw_water', () => {
  // (the game's sea texture, tinted the original's pale cyan; its own copy so it can drift on its own)
  const t = textures().sea.clone(); t.needsUpdate = true; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const m = new THREE.MeshStandardMaterial({ map: t, color: '#eaeee4', emissive: '#649494', emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.05 });
  m.userData.noShadow = true;
  return m;
});
const plaqueTex = () => M('sw_plaqueT', () => canvasTex(256, 160, (x, W, H) => {
  x.fillStyle = '#1c3550'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#8fb8d8'; x.lineWidth = 7; x.strokeRect(8, 8, W - 16, H - 16);
  x.fillStyle = '#cfe4f4'; x.font = 'bold 30px serif'; x.textAlign = 'center'; x.fillText('CITADEL', W / 2, 52);
  x.font = '18px serif'; x.fillText('WATER WORKS', W / 2, 80);
  x.fillStyle = 'rgba(207,228,244,0.55)'; for (let i = 0; i < 3; i++) x.fillRect(46, 98 + i * 14, W - 92, 4);
}));
const plaqueM = () => M('sw_plaque', () => { const m = new THREE.MeshStandardMaterial({ map: plaqueTex(), roughness: 0.5, metalness: 0.3 }); return m; });
const starTex = () => M('sw_starT', () => canvasTex(256, 128, (x, W, H) => {
  x.fillStyle = '#182a40'; x.fillRect(0, 0, W, H);
  const star = (cx, cy, r) => { x.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.42 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); };
  x.fillStyle = '#e8c060'; for (const [cx, cy, r] of [[40, 40, 22], [110, 82, 26], [190, 44, 20], [222, 98, 16], [70, 100, 14]]) star(cx, cy, r);
}));
const chalkTex = () => M('sw_chalkT', () => canvasTex(256, 256, (x, W, H) => {
  x.clearRect(0, 0, W, H);
  x.strokeStyle = 'rgba(236,236,226,0.85)'; x.fillStyle = 'rgba(236,236,226,0.85)'; x.lineWidth = 5; x.lineCap = 'round';
  // a boat with a sail, waves, "A + L" and an arrow pointing at the chest
  x.beginPath(); x.moveTo(50, 150); x.lineTo(170, 150); x.lineTo(150, 180); x.lineTo(70, 180); x.closePath(); x.stroke();
  x.beginPath(); x.moveTo(110, 150); x.lineTo(110, 70); x.lineTo(160, 140); x.lineTo(110, 140); x.stroke();
  x.beginPath(); for (let i = 0; i < 4; i++) { x.moveTo(40 + i * 45, 205); x.quadraticCurveTo(62 + i * 45, 190, 85 + i * 45, 205); } x.stroke();
  x.font = 'bold 40px sans-serif'; x.fillText('A + L', 64, 50);
  x.beginPath(); x.moveTo(190, 120); x.lineTo(236, 170); x.moveTo(236, 170); x.lineTo(232, 146); x.moveTo(236, 170); x.lineTo(212, 168); x.stroke();
}));

// ------------------------------------------------------------------ small parts (Kit-merged)
// a gargoyle's head: a heavy brow, a snout with flared nostrils, two swept horns, pointed ears (sculpted, one mesh)
function gargoyleGeo() {
  return soft({
    key: 'sw_gargoyle',
    prims: [
      { type: 'ell', c: [0, 0.2, -0.02], r: [0.2, 0.19, 0.2], group: 'h', mat: 's' },
      { type: 'ell', c: [0, 0.14, 0.17], r: [0.13, 0.09, 0.14], group: 'h', mat: 's' },
      { type: 'ell', c: [0, 0.27, 0.12], r: [0.19, 0.06, 0.08], group: 'h', mat: 's' },
      { type: 'ell', c: [0, 0.07, 0.12], r: [0.12, 0.05, 0.1], group: 'j', mat: 'd' },
      { type: 'cone', a: [0.12, 0.32, -0.02], b: [0.26, 0.52, -0.16], r1: 0.055, r2: 0.012, group: 'hl', mat: 'd' },
      { type: 'cone', a: [-0.12, 0.32, -0.02], b: [-0.26, 0.52, -0.16], r1: 0.055, r2: 0.012, group: 'hr', mat: 'd' },
      { type: 'cone', a: [0.17, 0.22, -0.06], b: [0.3, 0.3, -0.1], r1: 0.05, r2: 0.01, group: 'el', mat: 's' },
      { type: 'cone', a: [-0.17, 0.22, -0.06], b: [-0.3, 0.3, -0.1], r1: 0.05, r2: 0.01, group: 'er', mat: 's' },
    ],
    groups: { h: 0.06, j: 0.02, hl: 0.02, hr: 0.02, el: 0.03, er: 0.03 }, colors: { s: '#6e6a62', d: '#48453f' },
    paint: (p, m, c) => { c.offsetHSL(0, 0, (p.y - 0.2) * 0.25 + Math.sin(p.x * 31 + p.z * 17) * 0.02); if (p.z > 0.2 && p.y < 0.17) c.multiplyScalar(0.7); },
    bounds: { min: [-0.4, -0.05, -0.3], max: [0.4, 0.6, 0.35] }, cell: 0.025,
  });
}
// the dark iron spiked ring that lines the water's edge
function spikedRing(k, x, y, z, a = 0) {
  const m = ironM();
  k.add(torus(0.11, 0.028, 4, 10), m, x, y + 0.03, z, a, { rx: Math.PI / 2 });
  for (let i = 0; i < 6; i++) { const b = a + (i / 6) * Math.PI * 2; k.add(cyl(0.004, 0.028, 0.12, 4), m, x + Math.cos(b) * 0.11, y + 0.1, z + Math.sin(b) * 0.11); }
}
// a short stone pillar with an iron collar and a glass globe in an iron cage; lit or dead
function globeLamp(k, x, y, z, lit) {
  k.add(rbox(0.34, 0.95, 0.34, 0.04), rubbleM(), x, y + 0.475, z);
  k.add(rbox(0.42, 0.1, 0.42, 0.03), capM(), x, y + 0.98, z);
  k.add(lathe([[0.001, 0], [0.13, 0], [0.13, 0.05], [0.07, 0.1], [0.06, 0.16], [0.001, 0.16]], 10), ironM(), x, y + 1.03, z);
  k.add(sphere(0.16, 14, 10), lit ? glowM() : deadM(), x, y + 1.33, z);
  for (const r of [0, Math.PI / 2]) k.add(torus(0.17, 0.012, 4, 16), ironM(), x, y + 1.33, z, r);
  k.add(lathe([[0.001, 0], [0.05, 0], [0.012, 0.09], [0.001, 0.12]], 8), ironM(), x, y + 1.49, z);
}
// an iron railing with spear-topped balusters along the polyline pts [[x, z], ...] at height y (rusty: a dull brown)
function railing(B, k, pts, y, { rusty = false, h = 0.95 } = {}) {
  const m = rusty ? rustM() : ironM();
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], L = Math.hypot(bx - ax, bz - az), ry = Math.atan2(bx - ax, bz - az);
    const ux = (bx - ax) / L, uz = (bz - az) / L;
    for (const yy of [0.12, h - 0.06]) k.add(cyl(0.017, 0.017, L, 5), m, (ax + bx) / 2, y + yy, (az + bz) / 2, ry, { rx: Math.PI / 2 });
    for (let s = 0.14; s < L - 0.05; s += 0.17) {
      const px = ax + ux * s, pz = az + uz * s;
      k.add(cyl(0.011, 0.011, h - 0.02, 4), m, px, y + (h - 0.02) / 2, pz);
      k.add(lathe([[0.001, 0], [0.022, 0.02], [0.001, 0.075]], 4), m, px, y + h - 0.02, pz);
    }
    B.col((ax + bx) / 2, (az + bz) / 2, Math.abs(ux) * L / 2 + 0.08, Math.abs(uz) * L / 2 + 0.08, y + 1.3, { seeThrough: true });
  }
  for (const [px, pz] of pts) { k.add(rbox(0.12, h + 0.08, 0.12, 0.02), m, px, y + (h + 0.08) / 2, pz); k.add(sphere(0.06, 8, 6), m, px, y + h + 0.12, pz); }
}

// ------------------------------------------------------------------ the hall (scene 17)
const WY = -0.55;              // the water's surface (the walkways stand 0.55 m above it)
const BASE = -1.6;             // how far the stone goes down under the water
const U = 1.65, ISL = 0.45, PLAT = 1.15;
const GATE = { x: 10.5, w: 1.6, h: 2.4 };

function buildHall(scene, physics) {
  const { x: CX, z: CZ } = SEWER_AT.sewer;
  const B = new RoomBuilder(scene, physics, 'sewer', CX, CZ);
  const R = B.room, k = B.k;
  const W = 28, D = 24, H = 5.2, T = 0.6, X0 = -W / 2, X1 = W / 2, Z0 = -D / 2, Z1 = D / 2;
  R.view = 17; R.follow = 0.62; R.cave = true; R.music = 'cave'; R.surface = 'stone';
  R.sounds = [{ kind: 'water', ...B.world(0, 2), r: 30, vol: 0.5 }];

  // ---- the water: one plane over the whole basin, drifting slowly
  const wm = waterM();
  { const g = new THREE.PlaneGeometry(W, D); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, wm); m.position.set(0, WY, 0); m.receiveShadow = true; B.group.add(m); }
  wm.map.repeat.set(W / 6, D / 6);
  R.updaters.push((dt, t) => { wm.map.offset.set(t * 0.012, t * 0.007); });

  // ---- stone masses: a block from under the water up to `top`, paved on top with a coping lip round it
  const mass = (x0, z0, x1, z1, top, { pave = true, col = true, lip = true, stair = false } = {}) => {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, h = top - 0.1 - BASE;
    k.add(new THREE.BoxGeometry(w, h, d), rubbleM(), cx, BASE + h / 2, cz);
    if (lip) k.add(rbox(w + 0.08, 0.12, d + 0.08, 0.035), capM(), cx, top - 0.07, cz);
    if (pave) k.add(new THREE.BoxGeometry(w - 0.06, 0.04, d - 0.06), paveM(), cx, top - 0.005, cz);
    if (col) B.col(cx, cz, w / 2, d / 2, top, stair ? { stair: true } : {});
  };
  // stairs from level hi down to lo across the rectangle, in n treads; dir: which way they go down ('+x', '-x', '+z', '-z')
  const stairs = (x0, z0, x1, z1, dir, hi, lo, n) => {
    const alongX = dir[1] === 'x', sgn = dir[0] === '+' ? 1 : -1, L = alongX ? x1 - x0 : z1 - z0, run = L / n;
    for (let i = 0; i < n; i++) {
      const top = hi - ((hi - lo) * (i + 1)) / (n + 1);
      const s0 = sgn > 0 ? i * run : L - (i + 1) * run;
      const [a0, b0, a1, b1] = alongX ? [x0 + s0, z0, x0 + s0 + run, z1] : [x0, z0 + s0, x1, z0 + s0 + run];
      mass(a0, b0, a1, b1, top, { stair: true });
    }
  };
  const bridge = (x0, z0, x1, z1) => B.col((x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2, 0, { seeThrough: true });   // (an invisible tread over a seam of water between two slabs)

  // the north walkway (raised), its west end and the stairs down the west side
  mass(X0, Z0, 4, -9.6, U);
  mass(X0, -9.6, -11.6, -6.6, U);
  stairs(X0, -6.6, -11.6, -4.1, '+z', U, 0, 5);
  mass(X0, -4.1, -11.6, Z1, 0);                              // the west walkway
  stairs(4, Z0, 6.5, -9.6, '+x', U, 0, 5);                    // the north walkway's stairs down to the colonnade
  mass(6.5, Z0, X1, -7, 0);                                   // under the colonnade (north-east)
  mass(6.5, -7, 8.5, Z1, 0);                                  // the east pier
  // stepping slabs along the near side, with seams of water between
  const slabs = [[-11.6, -6.4], [-6.0, -0.8], [-0.4, 3.6], [4.0, 6.5]];
  for (const [a, b] of slabs) mass(a, 9.6, b, Z1, 0);
  for (let i = 1; i < slabs.length; i++) bridge(slabs[i - 1][1] - 0.05, 9.6, slabs[i][0] + 0.05, Z1);
  // the island, the bridge to it from the west walkway, a slab from it to the pier
  mass(-5, -3, 5, 8, ISL);
  mass(-11.6, 4.6, -5, 6.4, 0, { lip: false });
  mass(5, 1.6, 6.5, 3.4, 0.2);
  // the bridge's piers and the arches between them (seen from the water)
  for (const x of [-9.6, -7.0]) { k.add(rbox(0.7, -BASE - 0.2, 2.0, 0.04), stoneM(), x, BASE / 2 - 0.1, 5.5); }
  for (const [x0, x1] of [[-11.6, -9.95], [-9.25, -7.35], [-6.65, -5]]) {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    for (const z of [4.62, 6.38]) k.add(torus(w / 2, 0.09, 4, 14, Math.PI), capM(), cx, -0.55, z, 0);
  }
  for (const z of [4.65, 6.35]) { k.add(rbox(6.6, 0.32, 0.22, 0.05), capM(), -8.3, 0.16, z); B.col(-8.3, z, 3.3, 0.11, 0.32, { block: true }); }
  // the platform on the island and its steps up
  mass(-0.8, -3, 3.6, 0.6, PLAT);
  stairs(0.4, 0.6, 2.2, 1.8, '+z', PLAT, ISL, 2);

  // ---- the walls: two tall far walls (north, west), low near rims (south, east)
  const wallBox = (x0, x1, z0, z1, y0, y1, m = stoneM()) => k.add(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  // north: openings at floor level in the north-east (two barred arches and the gate between)
  const arches = [{ x: 7.75, w: 1.3, h: 2.0 }, { x: GATE.x, w: GATE.w, h: GATE.h }, { x: 13.0, w: 1.2, h: 2.0 }];
  {
    let x = X0 - T;
    for (const a of arches) {
      wallBox(x, a.x - a.w / 2, Z0 - T, Z0, BASE, H);
      wallBox(a.x - a.w / 2, a.x + a.w / 2, Z0 - T, Z0, a.h, H);
      x = a.x + a.w / 2;
    }
    wallBox(x, X1 + T, Z0 - T, Z0, BASE, H);
    for (const a of arches) {
      k.add(torus(a.w / 2 + 0.06, 0.11, 5, 16, Math.PI), capM(), a.x, a.h - a.w / 2 + 0.05, Z0 + 0.04);
      for (const s of [-1, 1]) k.add(rbox(0.22, a.h - a.w / 2 + 0.05, 0.16, 0.03), capM(), a.x + s * (a.w / 2 + 0.06), (a.h - a.w / 2 + 0.05) / 2, Z0 + 0.04);
      // the dark beyond
      k.add(plane(a.w, a.h), MAT.flat('#0c0f10', 1), a.x, a.h / 2, Z0 - T + 0.02);
      wallBox(a.x - a.w / 2, a.x + a.w / 2, Z0 - T - 1.6, Z0 - T, BASE, 0, rubbleM());
      if (a.x !== GATE.x) {
        for (let bx = a.x - a.w / 2 + 0.15; bx < a.x + a.w / 2 - 0.05; bx += 0.2) k.add(cyl(0.022, 0.022, a.h - 0.1, 5), rustM(), bx, (a.h - 0.1) / 2, Z0 - 0.25);
        for (const y of [0.5, 1.3]) k.add(rbox(a.w, 0.05, 0.05, 0.01), rustM(), a.x, y, Z0 - 0.25);
        B.col(a.x, Z0 - T / 2, a.w / 2, T / 2, H);
      }
    }
    // colliders: the wall either side of the gate, and the back of the gate's passage
    B.col((X0 - T + GATE.x - GATE.w / 2) / 2, Z0 - T / 2, (GATE.x - GATE.w / 2 - X0 + T) / 2, T / 2, H);
    B.col((GATE.x + GATE.w / 2 + X1 + T) / 2, Z0 - T / 2, (X1 + T - GATE.x - GATE.w / 2) / 2, T / 2, H);
    B.col(GATE.x, Z0 - T - 1.0, GATE.w / 2 + 0.2, 0.3, H);
    wallBox(GATE.x - GATE.w / 2 - 0.3, GATE.x - GATE.w / 2, Z0 - T - 1.6, Z0 - T, 0, GATE.h);
    wallBox(GATE.x + GATE.w / 2, GATE.x + GATE.w / 2 + 0.3, Z0 - T - 1.6, Z0 - T, 0, GATE.h);
  }
  // west
  wallBox(X0 - T, X0, Z0 - T, Z1 + T, BASE, H);
  B.col(X0 - T / 2, 0, T / 2, D / 2 + T, H);
  // near rims (low: the camera sees over them), with a coping
  const RIM = 0.55;
  wallBox(X0 - T, X1 + T, Z1, Z1 + T, BASE, RIM, rubbleM());
  wallBox(X1, X1 + T, Z0 - T, Z1, BASE, RIM, rubbleM());
  k.add(rbox(W + 2 * T + 0.06, 0.12, T + 0.08, 0.04), capM(), 0, RIM + 0.05, Z1 + T / 2);
  k.add(rbox(T + 0.08, 0.12, D + T + 0.06, 0.04), capM(), X1 + T / 2, RIM + 0.05, -T / 2);
  B.col(0, Z1 + T / 2, W / 2 + T, T / 2, 1.4);
  B.col(X1 + T / 2, 0, T / 2, D / 2 + T, 1.4);
  // masonry rhythm on the far walls: buttresses, a string course, the cap
  for (const x of [-10, -6, -2, 2]) { k.add(rbox(0.55, H - U, 0.22, 0.04), stoneM(), x, U + (H - U) / 2, Z0 + 0.11); B.col(x, Z0 + 0.11, 0.28, 0.12, H); }
  for (const z of [-8, -4, 0, 4, 8]) { k.add(rbox(0.22, H, 0.55, 0.04), stoneM(), X0 + 0.11, H / 2, z); B.col(X0 + 0.11, z, 0.12, 0.28, H); }
  k.add(rbox(W + T, 0.16, 0.18, 0.04), capM(), 0, 3.4, Z0 + 0.09);
  k.add(rbox(0.18, 0.16, D + T, 0.04), capM(), X0 + 0.09, 3.4, 0);
  k.add(rbox(W + 2 * T + 0.1, 0.2, T + 0.14, 0.05), capM(), 0, H + 0.08, Z0 - T / 2);
  k.add(rbox(T + 0.14, 0.2, D + 2 * T + 0.1, 0.05), capM(), X0 - T / 2, H + 0.08, 0);
  // the corner pillars with their gargoyles (the far corners tall, the near ones short)
  const garg = gargoyleGeo();
  const corner = (x, z, top, face) => {
    k.add(cyl(0.42, 0.48, top - BASE, 10), stoneM(), x, (top + BASE) / 2, z);
    k.add(cyl(0.52, 0.52, 0.16, 10), capM(), x, top + 0.08, z);
    k.add(garg, softMat, x + Math.sin(face) * 0.28, top + 0.16, z + Math.cos(face) * 0.28, face, { sx: 1.25, sy: 1.25, sz: 1.25 });
    B.ccol(x, z, 0.5, top + 0.4);
  };
  corner(X0 + 0.3, Z0 + 0.3, H - 0.4, Math.PI / 4);
  corner(X1 + T / 2, Z0 + 0.3, H - 0.4, -Math.PI / 4);
  corner(X0 + 0.3, Z1 + T / 2, 1.5, Math.PI * 0.75);
  corner(X1 + T / 2, Z1 + T / 2, 1.5, -Math.PI * 0.75);

  // ---- the colonnade before the arches (north-east), gargoyles on its end columns
  const cols = [6.85, 9.4, 11.75, 13.65], cz = -7.5, ch = 2.8;
  for (const x of cols) {
    k.add(rbox(0.7, 0.25, 0.7, 0.04), capM(), x, 0.125, cz);
    k.add(lathe([[0.3, 0], [0.27, 0.1], [0.25, ch - 0.6], [0.27, ch - 0.45], [0.36, ch - 0.35], [0.36, ch - 0.25]], 12), stoneM(), x, 0.25, cz);
    B.ccol(x, cz, 0.34, ch + 0.3);
  }
  k.add(rbox(14 - 6.4, 0.32, 0.5, 0.05), capM(), (6.4 + 14) / 2, ch + 0.16, cz);
  for (const x of cols) k.add(rbox(0.3, 0.26, -Z0 + cz - 0.1, 0.04), stoneM(), x, ch + 0.16, (Z0 + cz) / 2 - 0.05);
  for (const [x, f] of [[cols[0], Math.PI * 0.85], [cols[3], Math.PI * 1.15]]) k.add(garg, softMat, x, ch + 0.32, cz + 0.1, f);

  // ---- railings: the raised walkway's edge, the platform, the colonnade's water side (twelve years: half rusty)
  railing(B, k, [[-11.6, -6.65], [-11.6, -9.55], [-6.5, -9.55]], U, { rusty: true });
  railing(B, k, [[-6.5, -9.55], [-1.5, -9.55], [3.9, -9.55]], U);
  railing(B, k, [[-0.75, -0.9], [-0.75, -2.95], [3.55, -2.95]], PLAT);
  railing(B, k, [[3.55, -2.95], [3.55, 0.55]], PLAT, { rusty: true });
  railing(B, k, [[8.55, -7.05], [11.3, -7.05], [13.95, -7.05]], 0, { rusty: true });
  railing(B, k, [[-11.55, -3.4], [-11.55, -0.6]], 0, { rusty: true });

  // ---- the well-house on the island: the shaft down from the street (its door is the way out)
  const WH = { x0: -4.4, x1: -1.4, z0: -2.6, z1: 0.4, h: 2.6 }, whx = (WH.x0 + WH.x1) / 2, whz = (WH.z0 + WH.z1) / 2;
  {
    const y0 = ISL, w = WH.x1 - WH.x0, d = WH.z1 - WH.z0, door = { w: 1.0, h: 1.85 };
    // walls round a hollow shaft, the door in the south face
    wallBox(WH.x0, WH.x0 + 0.35, WH.z0, WH.z1, y0, y0 + WH.h, rubbleM());
    wallBox(WH.x1 - 0.35, WH.x1, WH.z0, WH.z1, y0, y0 + WH.h, rubbleM());
    wallBox(WH.x0 + 0.35, WH.x1 - 0.35, WH.z0, WH.z0 + 0.35, y0, y0 + WH.h, rubbleM());
    wallBox(WH.x0 + 0.35, whx - door.w / 2, WH.z1 - 0.35, WH.z1, y0, y0 + WH.h, rubbleM());
    wallBox(whx + door.w / 2, WH.x1 - 0.35, WH.z1 - 0.35, WH.z1, y0, y0 + WH.h, rubbleM());
    wallBox(whx - door.w / 2, whx + door.w / 2, WH.z1 - 0.35, WH.z1, y0 + door.h, y0 + WH.h, rubbleM());
    k.add(new THREE.BoxGeometry(w - 0.7, 0.02, d - 0.7), MAT.flat('#121516', 1), whx, y0 + 0.02, whz);
    // its stepped top, open in the middle (the shaft goes on up)
    for (const [i, inset] of [[0, -0.08], [1, 0.22], [2, 0.48]]) {
      const yy = y0 + WH.h + i * 0.2, ww = w - 2 * inset, dd = d - 2 * inset, hole = 1.0;
      k.add(new THREE.BoxGeometry(ww, 0.2, (dd - hole) / 2), capM(), whx, yy + 0.1, whz - (dd + hole) / 4);
      k.add(new THREE.BoxGeometry(ww, 0.2, (dd - hole) / 2), capM(), whx, yy + 0.1, whz + (dd + hole) / 4);
      k.add(new THREE.BoxGeometry((ww - hole) / 2, 0.2, hole), capM(), whx - (ww + hole) / 4, yy + 0.1, whz);
      k.add(new THREE.BoxGeometry((ww - hole) / 2, 0.2, hole), capM(), whx + (ww + hole) / 4, yy + 0.1, whz);
    }
    // the door: a stone frame and its barred leaf standing open; the ladder's foot inside
    k.add(torus(door.w / 2 + 0.05, 0.08, 4, 12, Math.PI), capM(), whx, y0 + door.h - 0.02, WH.z1 + 0.02);
    for (const s of [-1, 1]) k.add(rbox(0.16, door.h, 0.14, 0.03), capM(), whx + s * (door.w / 2 + 0.05), y0 + door.h / 2, WH.z1 + 0.02);
    k.at(whx + door.w / 2 - 0.02, y0, WH.z1 + 0.06, -1.9, () => {
      for (let bx = 0.12; bx < door.w - 0.05; bx += 0.17) k.add(cyl(0.02, 0.02, door.h - 0.15, 5), ironM(), -bx, (door.h - 0.15) / 2 + 0.05, 0);
      for (const y of [0.25, door.h * 0.55, door.h - 0.15]) k.add(rbox(door.w - 0.06, 0.05, 0.04, 0.01), ironM(), -door.w / 2, y, 0);
    });
    for (const s of [-1, 1]) k.add(cyl(0.025, 0.025, WH.h + 0.6, 5), MAT.wood('dark'), whx + s * 0.25, y0 + (WH.h + 0.6) / 2, WH.z0 + 0.5);
    for (let y = 0.3; y < WH.h + 0.5; y += 0.32) k.add(cyl(0.02, 0.02, 0.5, 5), MAT.wood('dark'), whx, y0 + y, WH.z0 + 0.5, 0, { rz: Math.PI / 2 });
    B.col(whx, WH.z0 + 0.4, w / 2, 0.4, y0 + WH.h + 0.6);
    B.col(WH.x0 + 0.2, whz, 0.2, d / 2, y0 + WH.h + 0.6);
    B.col(WH.x1 - 0.2, whz, 0.2, d / 2, y0 + WH.h + 0.6);
    B.col(whx - door.w / 2 - 0.4, WH.z1 - 0.2, 0.4, 0.2, y0 + WH.h + 0.6);
    B.col(whx + door.w / 2 + 0.4, WH.z1 - 0.2, 0.4, 0.2, y0 + WH.h + 0.6);
  }
  R.exits.push({ ...B.world(whx, WH.z1 - 0.1), r: 0.7, to: 'sewer-out' });
  R.spawn = { ...B.world(whx, WH.z1 + 1.35), a: 0 };

  // ---- the project's new heat pipe: down the shaft, out of the well-house's north side, along the island's north
  //      edge on stands, into the blue valve box bolted onto the old gate winch
  const WN = { x: 4.3, z: -1.7, y: ISL };   // the winch
  {
    const py = ISL + 0.7;
    P.pipeline(k, [[-2.2, ISL + WH.h + 0.9, -1.9], [-2.2, py, -1.9], [-2.2, py, -3.35], [WN.x, py, -3.35], [WN.x, py, WN.z - 0.55]], 0.1, MAT.copper(), MAT.brass());
    for (const x of [-0.5, 1.6, 3.4]) { k.add(rbox(0.08, py - WY, 0.08, 0.01), ironM(), x, (py + WY) / 2, -3.35); k.add(rbox(0.3, 0.06, 0.08, 0.01), ironM(), x, py - 0.12, -3.35); }
  }
  // the winch: a drum on two iron frames, a crank; the chain runs up over the water to the gate
  const valve = new THREE.Group(); valve.position.set(WN.x, 0, WN.z); B.group.add(valve);
  {
    const y = ISL;
    for (const s of [-1, 1]) {
      k.add(rbox(0.08, 0.95, 0.08, 0.01), ironM(), WN.x + s * 0.45, y + 0.47, WN.z - 0.2, 0, { rz: s * 0.15 });
      k.add(rbox(0.08, 0.95, 0.08, 0.01), ironM(), WN.x + s * 0.45, y + 0.47, WN.z + 0.2, 0, { rz: s * 0.15 });
      k.add(rbox(0.1, 0.06, 0.5, 0.01), ironM(), WN.x + s * 0.4, y + 0.9, WN.z);
    }
    k.add(cyl(0.2, 0.2, 0.75, 12), rustM(), WN.x, y + 0.92, WN.z, 0, { rz: Math.PI / 2 });
    for (const s of [-1, 1]) k.add(torus(0.21, 0.025, 4, 14), ironM(), WN.x + s * 0.36, y + 0.92, WN.z, Math.PI / 2);
  }
  // the valve box (animated: it knocks), its wheel, the brace through the drum
  {
    const vk = new P.Kit(valve);
    vk.add(rbox(0.5, 0.55, 0.42, 0.04), MAT.paint('#3a5a8a', 0.5), 0, ISL + 0.65, -0.55);
    vk.add(sphere(0.05, 8, 6), MAT.glow('#9ff4ff', '#35d8ff', 1.8), 0.26, ISL + 0.78, -0.55);
    vk.at(0, ISL + 0.98, -0.55, 0, () => P.valveWheel(vk, { r: 0.15, color: '#b8302a' }));
    vk.add(rbox(0.06, 0.06, 0.8, 0.01), MAT.paint('#3a5a8a', 0.5), 0.0, ISL + 0.86, -0.1, 0, { rx: 0.35 });
    vk.flush();
  }
  B.col(WN.x, WN.z - 0.2, 0.55, 0.55, ISL + 1.2);
  const chainEnd = [GATE.x, GATE.h + 0.45, Z0 + 0.25];
  {
    const a = [WN.x, ISL + 1.1, WN.z], b = chainEnd, n = 14, pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n; pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - 0.7 * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]); }
    k.add(pipe(pts, 0.03, 0.12, 5), ironM(), 0, 0, 0);
    k.add(cyl(0.12, 0.12, 0.12, 10), ironM(), b[0], b[1], b[2] + 0.05, 0, { rx: Math.PI / 2 });
  }
  // the gate: a rusted portcullis that rises when the winch turns
  const gate = new THREE.Group(); gate.position.set(GATE.x, 0, Z0 - 0.3); B.group.add(gate);
  {
    const gk = new P.Kit(gate);
    for (let bx = -GATE.w / 2 + 0.1; bx < GATE.w / 2; bx += 0.19) { gk.add(cyl(0.026, 0.026, GATE.h, 5), rustM(), bx, GATE.h / 2, 0); gk.add(lathe([[0.001, 0], [0.03, 0.02], [0.001, 0.1]], 4), rustM(), bx, -0.08, 0, 0, { rx: Math.PI }); }
    for (const y of [0.4, 1.2, 2.0]) gk.add(rbox(GATE.w - 0.04, 0.07, 0.06, 0.01), rustM(), 0, y, 0);
    gk.flush();
  }
  const gateCol = B.col(GATE.x, Z0 - 0.3, GATE.w / 2 + 0.05, 0.1, H);
  B.col(GATE.x, Z0 - (T + 1.6) / 2, GATE.w / 2 + 0.3, (T + 1.6) / 2, 0, { seeThrough: true });   // (the passage's floor)
  R.exits.push({ ...B.world(GATE.x, Z0 - 0.75), r: 0.55, room: 'sewervault' });
  R.entries = { sewervault: { ...B.world(GATE.x, Z0 + 1.6), a: 0 } };

  // ---- lamps (some dead), barrels, blue rocks, spiked rings, plaques
  const lamps = [[-4.6, 4.0, ISL, 1], [-0.45, -2.6, PLAT, 1], [3.2, -2.6, PLAT, 0], [-12.9, 1.0, 0, 1], [-6.0, -11.2, U, 0], [1.4, -11.2, U, 1],
    [9.35, -11.4, 0, 1], [11.65, -11.4, 0, 0], [8.1, 3.0, 0, 1]];
  for (const [x, z, y, lit] of lamps) {
    globeLamp(k, x, y, z, lit);
    B.ccol(x, z, 0.22, y + 1.5);
    if (lit) B.light('#8fd0ff', 2.6, 6.5, x, y + 1.45, z);
  }
  B.light('#a8b4c0', 3.0, 30, 0, 9, 2);   // (the dim fill: grey daylight that seeps down the shafts)
  for (const [x, z, r, y] of [[12.7, -9.2, 0.34, 0], [13.35, -8.4, 0.3, 0], [-12.9, 10.6, 0.34, 0], [-4.2, 7.1, 0.3, ISL]]) { B.put(x, z, 0, P.barrel, { r, h: r * 2.6, pal: 'honey', y, noCol: true }); B.ccol(x, z, r, y + r * 2.6); }
  R.givers.push({ id: 'sw_barrels', ...B.world(13.0, -8.8), y: 0, r: 1.3, top: 0.9, kinds: ['money', 'life'], n: 2 });
  for (const [x, z, s, y] of [[13.1, -10.8, 1.1, 0], [-12.9, -2.4, 1.0, 0], [4.2, 7.0, 0.9, ISL], [7.9, 10.8, 0.8, 0], [-13.0, -10.6, 0.8, U]]) {
    k.add(blueRocks(), softMat, x, y, z, x, { sx: s, sy: s, sz: s });
    B.ccol(x, z, 0.42 * s, y + 0.6 * s);
  }
  for (let z = -2.9; z < 11; z += 1.15) if (z < 4.2 || z > 6.8) spikedRing(k, -11.45, 0, z, z);
  for (const [a, b] of slabs) for (let x = a + 0.4; x < b - 0.2; x += 1.25) spikedRing(k, x, 0, 9.75, x);
  for (let z = -6.4; z < 9; z += 1.4) { spikedRing(k, 6.65, 0, z, z); if (z > -5 && z < 1 || z > 4) spikedRing(k, 8.35, 0, z, -z); }
  for (let x = -4.6; x < 4.8; x += 1.3) spikedRing(k, x, ISL, 7.8, x);
  const pm = plaqueM();
  for (const [x, y, z, ry] of [[-8.0, 3.0, Z0 + 0.02, 0], [12.25, 2.5, Z0 + 0.02, 0], [X0 + 0.02, 1.9, 2.5, Math.PI / 2]]) k.add(plane(0.62, 0.39), pm, x, y, z, ry);

  // ---- the knock: every few seconds the valve box jolts and a ring spreads on the water under the pipe; it stops
  //      once the valve is eased (story/sewers.js plays the sound and counts the beat)
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.32, 24), new THREE.MeshBasicMaterial({ color: '#e8fbff', transparent: true, opacity: 0, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(WN.x - 0.3, WY + 0.02, -3.6); B.group.add(ring);
  const H_ = { valve, gate, gateCol, ring, open: 0, opening: false, knockT: 99, quiet: false };
  R.updaters.push((dt) => {
    // the jolt (0.25 s) and the ring (1.2 s)
    H_.knockT += dt;
    const j = H_.knockT < 0.25 ? Math.sin((H_.knockT / 0.25) * Math.PI * 3) * (1 - H_.knockT / 0.25) : 0;
    valve.position.x = WN.x + j * 0.03; valve.rotation.z = j * 0.02;
    const rk = H_.knockT / 1.2;
    ring.visible = rk < 1; if (ring.visible) { ring.scale.setScalar(1 + rk * 4); ring.material.opacity = (1 - rk) * 0.5; }
    // the gate rises over 2.4 s once the winch turns
    if (H_.opening && H_.open < 1) { H_.open = Math.min(1, H_.open + dt / 2.4); gate.position.y = GATE.h * 0.92 * (H_.open * H_.open * (3 - 2 * H_.open)); if (H_.open >= 1) gateCol.enabled = false; }
  });
  R.hall = {
    valve: { ...B.world(WN.x, WN.z + 0.85), y: ISL, face: Math.PI },
    gate: { ...B.world(GATE.x, Z0 - 0.3) },
    knock() { H_.knockT = 0; },
    // the valve eased (and the gate up); instant: from a save
    setValve(b, instant = false) {
      H_.quiet = b;
      if (!b) { H_.open = 0; H_.opening = false; gate.position.y = 0; gateCol.enabled = true; return; }
      H_.opening = true;
      if (instant) { H_.open = 1; gate.position.y = GATE.h * 0.92; gateCol.enabled = false; }
    },
    get gateOpen() { return H_.open >= 1; },
  };
  return B.finish();
}

// ------------------------------------------------------------------ the treasure room (scene 18)
function buildVault(scene, physics) {
  const { x: CX, z: CZ } = SEWER_AT.sewervault;
  const B = new RoomBuilder(scene, physics, 'sewervault', CX, CZ);
  const R = B.room, k = B.k;
  const W = 8, D = 6.4, H = 3.2, DOOR = -2.2;
  R.view = 10; R.follow = 0.3; R.cave = true; R.music = 'cave'; R.surface = 'stone';
  B.shell({
    W, D, H, t: 0.45, slabH: 0.8,
    floor: vaultFloorM(), slab: rubbleM(), rimMat: rubbleM(), body: stoneM(), rail: capM(), cap: capM(), rimH: 0.75,
    rimGaps: [{ x: DOOR, w: 1.3 }],
  });
  const BZ = -D / 2, LX = -W / 2;
  // the way in: a short passage through the near wall, a candle on each side
  for (const s of [-1, 1]) P.candle(k, DOOR + s * 0.95, 0.84, D / 2 + 0.22);
  B.light('#ffd090', 1.6, 4, DOOR, 1.6, D / 2 - 0.2);
  R.exits.push({ ...B.world(DOOR, D / 2 - 0.2), r: 0.6, room: 'sewer' });
  R.spawn = { ...B.world(DOOR, D / 2 - 1.35), a: Math.PI };
  R.entries = { sewer: R.spawn };
  // the dais and the star chest on it
  const DA = { x0: 0.3, x1: 3.7, z0: BZ, z1: -0.9, h: 0.32 };
  k.add(rbox(DA.x1 - DA.x0, DA.h, DA.z1 - DA.z0, 0.04), capM(), (DA.x0 + DA.x1) / 2, DA.h / 2, (DA.z0 + DA.z1) / 2);
  k.add(rbox(DA.x1 - DA.x0 - 0.4, 0.16, 0.4, 0.03), capM(), (DA.x0 + DA.x1) / 2, 0.08, DA.z1 + 0.2);
  B.col((DA.x0 + DA.x1) / 2, (DA.z0 + DA.z1) / 2, (DA.x1 - DA.x0) / 2, (DA.z1 - DA.z0) / 2, DA.h);
  const CH = { x: 2.0, z: -2.1, y: DA.h, w: 0.95, d: 0.6, h: 0.5 };
  const sm = M('sw_starbox', () => new THREE.MeshStandardMaterial({ map: starTex(), roughness: 0.6 }));
  k.add(rbox(CH.w, CH.h, CH.d, 0.02), sm, CH.x, CH.y + CH.h / 2, CH.z);
  for (const s of [-1, 1]) k.add(rbox(0.05, CH.h + 0.02, CH.d + 0.03, 0.01), MAT.brass(), CH.x + s * (CH.w / 2 - 0.05), CH.y + CH.h / 2, CH.z);
  k.add(rbox(CH.w + 0.03, 0.05, CH.d + 0.03, 0.01), MAT.brass(), CH.x, CH.y + CH.h - 0.02, CH.z);
  B.col(CH.x, CH.z, CH.w / 2, CH.d / 2, CH.y + CH.h + 0.1, { noStand: true });
  // the lid, hinged at the back
  const lid = new THREE.Group(); lid.position.set(CH.x, CH.y + CH.h, CH.z - CH.d / 2); B.group.add(lid);
  {
    const lk = new P.Kit(lid);
    lk.add(rbox(CH.w, 0.08, CH.d, 0.02), sm, 0, 0.04, CH.d / 2);
    lk.add(rbox(CH.w + 0.03, 0.09, 0.05, 0.01), MAT.brass(), 0, 0.045, CH.d - 0.01);
    lk.add(rbox(0.1, 0.12, 0.03, 0.01), MAT.brass(), 0, -0.02, CH.d + 0.01);
    lk.flush();
  }
  // what's in it: a rolled paper (Arthur's map), a stub of chalk, a few old coins (shown until it is opened)
  const inside = new THREE.Group(); B.group.add(inside);
  {
    const ik = new P.Kit(inside);
    ik.add(cyl(0.04, 0.04, 0.42, 8), MAT.flat('#e8dcc0', 0.8), CH.x - 0.1, CH.y + CH.h - 0.04, CH.z, 0.3, { rz: Math.PI / 2 });
    for (let i = 0; i < 5; i++) ik.add(cyl(0.035, 0.035, 0.012, 10), MAT.brass(), CH.x + 0.22 + (i % 3) * 0.05, CH.y + CH.h - 0.07 + i * 0.012, CH.z + 0.08 - (i % 2) * 0.1);
    ik.flush();
  }
  // two lamp pillars, a star plaque on the west wall, a bronze disc on the north wall, Arthur's chalk beside the dais
  for (const [x, z, lit] of [[0.0, BZ + 0.55, 1], [W / 2 - 0.5, -0.4, 1]]) {
    k.add(cyl(0.24, 0.28, 1.5, 10), stoneM(), x, 0.75, z);
    k.add(cyl(0.3, 0.3, 0.1, 10), capM(), x, 1.55, z);
    k.add(sphere(0.17, 14, 10), lit ? glowM() : deadM(), x, 1.8, z);
    for (const r of [0, Math.PI / 2]) k.add(torus(0.18, 0.012, 4, 16), ironM(), x, 1.8, z, r);
    B.ccol(x, z, 0.3, 2.0);
    B.light('#8fd0ff', 2.8, 6, x, 1.9, z);
  }
  k.at(LX + 0.03, 1.75, -0.4, Math.PI / 2, () => {
    k.add(P.disc(0.42, 24), MAT.flat('#1a2c3c', 0.6), 0, 0, 0.0);
    k.add(torus(0.43, 0.04, 6, 24), MAT.brass(), 0, 0, 0.01);
    k.add(plane(0.6, 0.6), M('sw_starP', () => new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (x, Wd) => { x.fillStyle = '#bfe8ff'; x.beginPath(); for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, r = i % 2 ? 18 : 56; x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } x.closePath(); x.fill(); }), transparent: true, alphaTest: 0.1 })), 0, 0, 0.02);
  });
  k.at(1.0, 2.0, BZ + 0.03, 0, () => {
    k.add(P.disc(0.36, 20), MAT.brass(), 0, 0, 0);
    k.add(torus(0.22, 0.05, 6, 20), MAT.copper(), 0, 0, 0.03);
  });
  k.add(plane(1.1, 1.1), M('sw_chalk', () => { const m = new THREE.MeshBasicMaterial({ map: chalkTex(), transparent: true, depthWrite: false }); m.userData.noShadow = true; return m; }), -1.3, 1.25, BZ + 0.02);
  k.at(DA.x0 + 0.35, DA.h, DA.z1 - 0.35, 0.6, () => P.toyBoat(k));
  // a barrel (it gives), blue rocks, spiked rings along the rims and the dais
  B.put(LX + 0.55, D / 2 - 0.65, 0, P.barrel, { r: 0.33, h: 0.86, pal: 'honey' });
  R.givers.push({ id: 'sw_vbarrel', ...B.world(LX + 0.55, D / 2 - 0.65), y: 0, r: 1.2, top: 0.9, kinds: ['money'], n: 3 });
  for (const [x, z, s] of [[LX + 0.6, BZ + 0.7, 1.0], [-1.6, BZ + 0.5, 0.7]]) { k.add(blueRocks(), softMat, x, 0, z, x, { sx: s, sy: s, sz: s }); B.ccol(x, z, 0.42 * s, 0.6 * s); }
  for (let x = LX + 1.2; x < DOOR - 0.6; x += 0.7) spikedRing(k, x, 0, D / 2 - 0.25, x);
  for (let x = DOOR + 1.6; x < W / 2 - 0.3; x += 0.7) spikedRing(k, x, 0, D / 2 - 0.25, x);
  for (let z = -0.3; z < D / 2 - 0.4; z += 0.7) spikedRing(k, W / 2 - 0.25, 0, z, z);
  B.light('#9aa8b4', 1.8, 12, -1, 2.8, 0.5);
  R.vault = {
    chest: { ...B.world(CH.x, CH.z + CH.d / 2 + 0.75), y: DA.h, face: Math.PI, at: B.world(CH.x, CH.z) },
    setChest(open) { lid.rotation.x = open ? -1.75 : 0; inside.visible = !open; },
  };
  return B.finish();
}

export function buildSewerRooms(scene, physics) {
  const sewer = buildHall(scene, physics), sewervault = buildVault(scene, physics);
  SEWER.hall = sewer.hall; SEWER.vault = sewervault.vault;
  return { sewer, sewervault };
}

// ------------------------------------------------------------------ the grate in Bug Street (Citadel)
// a square iron grate in a dressed stone frame set in the lane, hinged at its north edge; chalk on the frame (an
// arrow, "A + L"). Lifted, it stands up on its hinge over the dark of the shaft and the ladder's top rungs: then it is
// a door down (sewerDoors)
export function buildSewerHatch(scene, physics, world) {
  const { x, z } = HATCH, y = physics.groundAt(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); g.name = 'sewerhatch';
  (world?.root || scene).add(g);
  const k = new P.Kit(g);
  const S = 0.45, F = 0.2;   // (the opening's half-size; the frame's width)
  for (const [px, pz, w, d] of [[0, -S - F / 2, 2 * (S + F), F], [0, S + F / 2, 2 * (S + F), F], [-S - F / 2, 0, F, 2 * S], [S + F / 2, 0, F, 2 * S]]) k.add(rbox(w, 0.26, d, 0.03), capM(), px, -0.08, pz);
  k.add(new THREE.BoxGeometry(2 * S, 0.02, 2 * S), MAT.flat('#0b0d0e', 1), 0, -0.02, 0);
  for (const s of [-1, 1]) k.add(rbox(0.04, 0.04, 0.5, 0.01), ironM(), s * 0.18, -0.07, -0.2);
  for (let i = 0; i < 2; i++) k.add(cyl(0.015, 0.015, 0.36, 5), ironM(), 0, -0.05, -0.38 + i * 0.25, 0, { rz: Math.PI / 2 });
  // the chalk mark on the frame's south side
  k.add(plane(0.5, 0.2), M('sw_rimChalk', () => { const m = new THREE.MeshBasicMaterial({ map: canvasTex(128, 52, (c, W, H) => { c.clearRect(0, 0, W, H); c.strokeStyle = c.fillStyle = 'rgba(240,240,232,0.9)'; c.lineWidth = 4; c.font = 'bold 22px sans-serif'; c.fillText('A+L', 6, 34); c.beginPath(); c.moveTo(70, 26); c.lineTo(118, 26); c.moveTo(118, 26); c.lineTo(104, 16); c.moveTo(118, 26); c.lineTo(104, 36); c.stroke(); }), transparent: true, depthWrite: false }); m.userData.noShadow = true; return m; }), 0, 0.055, S + F / 2, Math.PI, { rx: -Math.PI / 2 });
  k.flush();
  // the grate itself, on a hinge at its north edge
  const hinge = new THREE.Group(); hinge.position.set(0, 0.06, -S); g.add(hinge);
  {
    const hk = new P.Kit(hinge);
    for (const [px, pz, w, d] of [[0, 0.03, 2 * S + 0.04, 0.06], [0, 2 * S - 0.03, 2 * S + 0.04, 0.06], [-S + 0.0, S, 0.06, 2 * S], [S - 0.0, S, 0.06, 2 * S]]) hk.add(rbox(w, 0.05, d, 0.01), ironM(), px, 0, pz);
    for (let i = -3; i <= 3; i++) hk.add(rbox(0.035, 0.045, 2 * S - 0.06, 0.008), ironM(), i * 0.12, 0, S);
    hk.add(rbox(2 * S - 0.06, 0.045, 0.035, 0.008), ironM(), 0, 0.005, S);
    hk.add(torus(0.06, 0.012, 4, 10), ironM(), 0, 0.04, 2 * S - 0.12, 0, { rx: Math.PI / 2 });
    hk.flush();
  }
  SEWER.hatch = {
    x, z, y,
    open: false,
    armed: false,   // (lifted with him standing on it, it leads down only once he has stepped off it: story/sewers.js)
    setOpen(b) { this.open = b; this.armed = false; hinge.rotation.x = b ? -1.7 : 0; },
  };
  return SEWER.hatch;
}

export function sewerDoors() {
  const h = SEWER.hatch;
  return h?.open && h.armed ? [{ x: h.x, z: h.z, r: 0.55, room: 'sewer' }] : [];
}
export function sewerExit(to) {
  const h = SEWER.hatch;
  if (to === 'sewer-out' && h) return { x: h.x + 1.3, z: h.z + 0.4, a: Math.PI / 2 };
  return null;
}
