// W-2: the Arch District's three rooms (arches.js builds them with the region). Each says who lives or works in it,
// in the game's cut-away interiors (RoomBuilder: two far walls, low near rims, the fixed room camera):
//   bl_oren  Oren's house on the terrace: dry and orderly. A drafting table under the window (the window looks away
//            from the water: the arch's stone and the sky), his drawings pinned square; a worn formal coat on its hook
//            by the door (the central network's years), shelves of ceramic models (arches, floats, a pump in section),
//            a narrow made bed, a chest, one rug, everything at right angles.
//   bl_mags  Mags's house on the lower row: the wet floor, lived in anyway. The floor patched with odd boards, the
//            water's line on the walls a hand over the floor (the flood's salt) and an older one higher, a committee
//            table with mismatched cups and a teapot, stools for the neighbours, children's things drying by the stove
//            (small clothes, boots, a toy boat), buckets for bailing, a ladder up through the ceiling to the living
//            floor.
//   bl_pump  the old pump room inside the arch's west pier: two glazed-ceramic pump cylinders and a bronze flywheel
//            between them, the manifold of pipes with brass plates (pictures, no words) along the back wall, and the
//            lower row's spill gate: a vertical gate in a stone channel, its spindle and hand-wheel, chained shut with a
//            heavy chain round the wheel and an official seal plate; the pawl on its ratchet high on the pier wall.
//
// CONTRACT (world coordinates)
//   buildArchRooms(scene, physics) → { rooms: { bl_oren, bl_mags, bl_pump }, pump: { setChain(cut, instant),
//     setPawl(released, instant), setGate(open, instant), gateMoving() } }
//   ROOMS (filled when built): oren { spawn, door, table, plan }, mags { spawn, door, host }, pump { spawn, door, tessa,
//     plates, machine, wheel, chain {x, y, z, r}, pawl {x, y, z, r} }
//   Each room's R.exits[0] is its door back to 'bl_arches' (the region's R.entries puts him outside it); the gate's
//   collider is solid until the gate is open.
import * as THREE from 'three';
import { RoomBuilder } from '../interiors.js';
import { MAT, M, TEX, rbox, plane, cyl, sphere, lathe, torus, canvasTex, crate, barrel, jar, kettle, table, chair } from '../props.js';
import { BALLASTRA_AT } from './common.js';
import { chainGeo } from './look.js';

export const ROOMS = { oren: {}, mags: {}, pump: {} };

const flat = (c, r = 0.6) => MAT.flat(c, r);
const celadon = () => MAT.flat('#9cc8b4', 0.3, { metalness: 0.05 });
const celadonDeep = () => MAT.flat('#5f9a86', 0.32, { metalness: 0.05 });
const cobalt = () => MAT.flat('#3f6c9c', 0.3, { metalness: 0.05 });
const bronze = () => MAT.flat('#b07a3a', 0.42, { metalness: 0.6 });

// the views out of the windows (painted: the room camera's line of sight lands on them)
const archView = () => M('bl_w2archViewT', () => canvasTex(512, 320, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#cfe2ea'); g.addColorStop(1, '#eef2ea'); x.fillStyle = g; x.fillRect(0, 0, w, h);
  // the arch's leg: warm banded stone filling the left, a terrace's roofs below, no water anywhere
  for (let i = 0; i < 9; i++) { x.fillStyle = ['#dccaa6', '#e8d9b8', '#cdb48c'][i % 3]; x.beginPath(); x.moveTo(0, i * 36); x.quadraticCurveTo(200 - i * 6, i * 36 + 10, 260 - i * 14, (i + 1) * 36); x.lineTo(0, (i + 1) * 36); x.fill(); }
  x.fillStyle = '#7f9c5e'; x.beginPath(); x.ellipse(210, 30, 60, 16, 0.3, 0, 7); x.fill();
  x.fillStyle = '#8cbcaa'; x.beginPath(); x.moveTo(280, 260); x.lineTo(360, 200); x.lineTo(440, 260); x.fill(); x.fillStyle = '#ead8b4'; x.fillRect(296, 260, 128, 60);
  x.fillStyle = '#d4835a'; x.beginPath(); x.moveTo(420, 280); x.lineTo(480, 236); x.lineTo(540, 280); x.fill();
}));
const rowView = () => M('bl_w2rowViewT', () => canvasTex(512, 320, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#d4e6ea'); g.addColorStop(0.5, '#e8eee6'); g.addColorStop(0.52, '#6cb8ac'); g.addColorStop(1, '#3f8a8a');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = '#b08e6a'; x.fillRect(0, 150, w, 14);                                   // the walkway's edge
  for (let i = 0; i < 6; i++) { x.fillStyle = '#7a5c40'; x.fillRect(30 + i * 90, 150, 8, 60); }
  x.fillStyle = '#d8c4a0'; x.fillRect(150, 110, 200, 40); x.fillStyle = '#c6684c'; x.beginPath(); x.moveTo(140, 110); x.lineTo(250, 70); x.lineTo(360, 110); x.fill();   // the market's awnings
  x.fillStyle = '#c6684c'; x.beginPath(); x.ellipse(380, 210, 60, 12, 0, 0, 7); x.fill();   // a boat
  x.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 10; i++) x.fillRect((i * 97) % w, 230 + (i * 31) % 80, 30, 2);
}));
// Oren's drawings: the arch's section, a pump's cylinder, a float's lines, each pinned square (no words)
const planTex = () => M('bl_w2planT', () => canvasTex(512, 256, (x, w, h) => {
  x.fillStyle = '#efe6cc'; x.fillRect(0, 0, w, h); x.strokeStyle = '#2f4f6c'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(30, 230); x.quadraticCurveTo(130, -40, 230, 230); x.stroke(); x.beginPath(); x.moveTo(60, 230); x.quadraticCurveTo(130, 20, 200, 230); x.stroke();
  for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(20, 230 - i * 30); x.lineTo(240, 230 - i * 30); x.setLineDash([4, 6]); x.stroke(); x.setLineDash([]); }
  x.strokeRect(290, 40, 70, 150); x.beginPath(); x.moveTo(325, 40); x.lineTo(325, 10); x.stroke(); x.strokeRect(300, 60, 50, 40);
  x.beginPath(); x.ellipse(430, 130, 50, 30, 0, 0, 7); x.stroke(); x.beginPath(); x.moveTo(380, 130); x.lineTo(480, 130); x.stroke();
  x.fillStyle = '#c6684c'; for (const [cx, cy] of [[10, 10], [500, 10], [10, 246], [500, 246]]) { x.beginPath(); x.arc(cx, cy, 5, 0, 7); x.fill(); }
}));
// the manifold's brass plates: pictograms of what each pipe does (the pumps, the row, the gardens, the gate)
const plateTex = () => M('bl_w2plateT', () => canvasTex(256, 64, (x, w, h) => {
  x.fillStyle = '#d6a85a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#5a3a1a'; x.lineWidth = 3;
  const cell = (i, fn) => { x.save(); x.translate(i * 64 + 32, 32); x.strokeRect(-28, -26, 56, 52); fn(); x.restore(); };
  cell(0, () => { x.beginPath(); x.arc(0, 0, 14, 0, 7); x.stroke(); x.beginPath(); x.moveTo(-20, 0); x.lineTo(20, 0); x.stroke(); });
  cell(1, () => { for (let i = -1; i <= 1; i++) { x.strokeRect(i * 14 - 5, -6, 10, 16); x.beginPath(); x.moveTo(i * 14 - 7, -6); x.lineTo(i * 14, -14); x.lineTo(i * 14 + 7, -6); x.stroke(); } x.beginPath(); x.moveTo(-22, 14); x.lineTo(22, 14); x.stroke(); });
  cell(2, () => { for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(-12 + i * 12, 4, 6, Math.PI, 0); x.stroke(); x.beginPath(); x.moveTo(-12 + i * 12, 4); x.lineTo(-12 + i * 12, 16); x.stroke(); } });
  cell(3, () => { x.strokeRect(-10, -16, 20, 30); x.beginPath(); x.moveTo(-20, 14); x.lineTo(20, 14); x.stroke(); x.beginPath(); x.moveTo(0, -16); x.lineTo(0, -22); x.stroke(); });
}));
// the seal plate on the chain (cobalt glaze, a stamped balance: the old network's office)
const sealTex = () => M('bl_w2sealT', () => canvasTex(128, 128, (x, w) => {
  x.fillStyle = '#3f6c9c'; x.fillRect(0, 0, w, w); x.strokeStyle = '#e8dcc0'; x.lineWidth = 6; x.strokeRect(8, 8, w - 16, w - 16);
  x.beginPath(); x.moveTo(30, 54); x.lineTo(98, 54); x.moveTo(64, 54); x.lineTo(64, 96); x.moveTo(48, 96); x.lineTo(80, 96); x.stroke();
  for (const s of [-1, 1]) { x.beginPath(); x.arc(64 + s * 30, 70, 12, 0, Math.PI); x.stroke(); }
}));

// ------------------------------------------------------------------ Oren's house
function buildOren(scene, physics) {
  const { x: CX, z: CZ } = BALLASTRA_AT.bl_oren, Wd = 7.6, D = 6.0, H = 3.2, DOOR_Z = 1.9, WINX = 1.6;
  const B = new RoomBuilder(scene, physics, 'bl_oren', CX, CZ), R = B.room, k = B.k;
  R.view = 9.8; R.follow = 0.25; R.music = 'home'; R.surface = 'wood';
  B.shell({ W: Wd, D, H, t: 0.32, floor: MAT.planks('honey'), slab: MAT.stone('sand'), body: MAT.plaster('#f2ead6'), low: MAT.tiles('#9cc8b4', '#8abcaa', '#4f6e64', false, 6), dado: 0.95,
    rail: MAT.wood('dark'), cap: MAT.wood('dark'), rimH: 0.45, rimMat: MAT.stone('sand'), beam: MAT.wood('dark'), posts: MAT.wood('dark'), postsAt: (L) => [L * 0.5],
    back: [{ at: WINX, w: 1.6, h: 1.25, y0: 1.0, kind: 'window', view: MAT.map(archView(), 0.9, { emissive: '#ffffff', emissiveMap: archView(), emissiveIntensity: 0.7 }), frame: MAT.paint('#3f6c9c', 0.5) }],
    left: [{ at: DOOR_Z, w: 1.1, h: 2.2, y0: 0, kind: 'door', frame: MAT.paint('#3f6c9c', 0.5), sill: MAT.stone('slate', 1) }] });
  R.exits.push({ ...B.world(-Wd / 2 + 0.3, DOOR_Z), r: 0.6, room: 'bl_arches' });
  R.spawn = { ...B.world(-Wd / 2 + 1.3, DOOR_Z), a: Math.PI / 2 };
  R.entries = { bl_arches: R.spawn };
  const BZ = -D / 2;
  // the drafting table under the window: a sloped board, the drawing pinned square, a stool, a lamp, his instruments
  B.put(WINX, BZ + 0.6, 0, (kk) => {
    for (const s of [-1, 1]) { kk.add(rbox(0.07, 0.95, 0.07, 0.01), MAT.wood('dark'), s * 0.75, 0.47, 0.25); kk.add(rbox(0.07, 1.1, 0.07, 0.01), MAT.wood('dark'), s * 0.75, 0.55, -0.25); }
    kk.add(rbox(1.7, 0.05, 0.9, 0.015), MAT.wood('honey'), 0, 1.02, 0, 0, { rx: -0.3 });
    kk.add(plane(1.4, 0.7), MAT.map(planTex(), 0.9), 0, 1.06, 0.02, 0, { rx: -0.3 - Math.PI / 2 });
    kk.add(rbox(0.5, 0.02, 0.04, 0.005), MAT.brass(), -0.3, 1.1, 0.33, 0, { rx: -0.3, rz: 0.2 });
    kk.add(rbox(1.6, 0.04, 0.04, 0.008), MAT.wood('dark'), 0, 0.94, 0.42);
    kk.add(cyl(0.08, 0.1, 0.03, 10), MAT.iron(), 0.65, 1.3, -0.3); kk.add(cyl(0.012, 0.012, 0.5, 6), MAT.iron(), 0.65, 1.55, -0.3);
    kk.add(lathe([[0.001, 0.1], [0.14, 0], [0.16, -0.02], [0.001, -0.01]], 12), MAT.paint('#3f6c9c', 0.4), 0.6, 1.8, -0.2);
    kk.add(sphere(0.05, 8, 6), MAT.glow('#fff2cc', '#ffc070', 1.4), 0.6, 1.77, -0.2);
    return { hw: 0.85, hd: 0.45, top: 1.2 };
  });
  B.put(WINX - 0.55, BZ + 1.4, 0.1, (kk) => { kk.add(cyl(0.2, 0.22, 0.05, 12), MAT.wood('honey'), 0, 0.68, 0); for (let i = 0; i < 3; i++) kk.add(cyl(0.025, 0.03, 0.68, 6), MAT.wood('dark'), Math.sin(i * 2.1) * 0.15, 0.34, Math.cos(i * 2.1) * 0.15); return { r: 0.22, top: 0.7 }; });
  // the shelves of ceramic models on the back wall's left: arches, floats, a pump cylinder in section, all in a row
  B.put(-1.6, BZ + 0.22, 0, (kk) => {
    for (const s of [-1, 1]) kk.add(rbox(0.06, 2.3, 0.36, 0.01), MAT.wood('dark'), s * 1.1, 1.15, 0);
    for (const y of [0.3, 0.95, 1.6, 2.25]) kk.add(rbox(2.24, 0.04, 0.36, 0.01), MAT.wood('honey'), 0, y, 0);
    for (let i = 0; i < 4; i++) { const g = new THREE.TorusGeometry(0.16, 0.05, 6, 12, Math.PI); kk.add(g, [celadon(), cobalt(), celadonDeep(), celadon()][i], -0.8 + i * 0.5, 0.98, 0); }
    for (let i = 0; i < 5; i++) kk.add(lathe([[0.001, -0.1], [0.09, -0.08], [0.12, 0], [0.09, 0.08], [0.001, 0.1]], 10), i % 2 ? cobalt() : celadon(), -0.85 + i * 0.42, 1.73, 0.02);
    kk.add(cyl(0.14, 0.14, 0.4, 12, 0, true), celadon(), -0.5, 2.47, 0); kk.add(cyl(0.02, 0.02, 0.5, 6), bronze(), -0.5, 2.5, 0);
    kk.add(rbox(0.5, 0.28, 0.24, 0.02), MAT.wood('honey'), 0.4, 2.41, 0);
    for (let i = 0; i < 3; i++) kk.add(rbox(0.3, 0.2, 0.22, 0.01), flat(['#efe6cc', '#e8dcc0', '#f2ead2'][i]), -0.7 + i * 0.36, 0.42, 0);
    return { hw: 1.15, hd: 0.2, top: 2.3 };
  });
  // the worn formal coat on its hook by the door, the hat above it; the brush beside it
  const coat = new THREE.LatheGeometry([[0.001, 0], [0.32, 0.02], [0.3, 0.6], [0.24, 1.05], [0.2, 1.2], [0.08, 1.26], [0.001, 1.27]].map(([a, b]) => new THREE.Vector2(a, b)), 12);
  coat.scale(1, 1, 0.45);
  k.add(coat, MAT.cloth('#2f4a6c', '#24384f'), -Wd / 2 + 0.3, 0.55, DOOR_Z - 1.1, Math.PI / 2);
  for (let i = 0; i < 4; i++) k.add(sphere(0.025, 6, 4), bronze(), -Wd / 2 + 0.44, 1.15 - i * 0.16, DOOR_Z - 1.1);
  k.add(rbox(0.05, 0.05, 0.4, 0.01), MAT.wood('dark'), -Wd / 2 + 0.18, 1.85, DOOR_Z - 1.1);
  k.add(lathe([[0.001, 0], [0.2, 0], [0.2, 0.02], [0.12, 0.04], [0.12, 0.16], [0.001, 0.17]], 12), MAT.cloth('#2a2a30', '#202026'), -Wd / 2 + 0.3, 1.92, DOOR_Z - 1.1);
  B.col(-Wd / 2 + 0.3, DOOR_Z - 1.1, 0.3, 0.3, 1.9, { block: true });
  // the narrow bed, made square; the chest at its foot; a rug squared to the walls
  B.put(Wd / 2 - 0.6, BZ + 1.25, Math.PI, (kk) => {
    kk.add(rbox(0.9, 0.35, 2.0, 0.02), MAT.wood('dark'), 0, 0.2, 0); kk.add(rbox(0.86, 0.12, 1.96, 0.04), MAT.cloth('#f2ead6', '#e8dcc0'), 0, 0.43, 0);
    kk.add(rbox(0.86, 0.04, 1.4, 0.02), MAT.cloth('#3f6c9c', '#2f5a86'), 0, 0.5, 0.25); kk.add(rbox(0.6, 0.12, 0.34, 0.05), MAT.cloth('#f2ead6', '#ffffff'), 0, 0.54, -0.75);
    kk.add(rbox(0.9, 0.9, 0.06, 0.02), MAT.wood('dark'), 0, 0.6, -1.0);
    return { hw: 0.46, hd: 1.02, top: 0.6 };
  });
  B.put(Wd / 2 - 0.6, BZ + 2.65, 0, (kk) => { kk.add(rbox(0.8, 0.5, 0.5, 0.03), MAT.wood('honey'), 0, 0.25, 0); kk.add(rbox(0.84, 0.06, 0.54, 0.02), bronze(), 0, 0.5, 0); return { hw: 0.42, hd: 0.27, top: 0.55 }; });
  k.add(rbox(2.4, 0.012, 1.6, 0.004), MAT.cloth('#5f9a86', '#e8dcc0'), 0.2, 0.006, 0.6);
  // a small table with a cup and a folded cloth by the window side; a second chair
  B.put(0.4, 1.4, 0, (kk) => table(kk, { w: 0.9, d: 0.6, pal: 'dark' }));
  k.add(lathe([[0.001, 0], [0.05, 0], [0.06, 0.09], [0.001, 0.09]], 10), celadon(), 0.5, 0.79, 1.35);
  B.put(0.4, 2.15, Math.PI, (kk) => chair(kk, { pal: 'dark', cushion: '#3f6c9c' }));
  // light: the window, a lamp on the drafting table, a warm one over the room
  B.light('#fff2dc', 6.0, 10, WINX, 2.3, BZ + 1.3);
  B.light('#ffe2b0', 3.6, 8, 0.2, 2.7, 0.8);
  Object.assign(ROOMS.oren, {
    door: B.world(-Wd / 2 + 0.3, DOOR_Z), spawn: R.spawn,
    table: { ...B.world(WINX + 0.4, BZ + 1.55), a: Math.PI }, plan: { ...B.world(WINX, BZ + 1.35), r: 1.0 },
  });
  R.npcSpots = { oren_table: ROOMS.oren.table };
  return B.finish();
}

// ------------------------------------------------------------------ Mags's house (the lower row's wet floor)
function buildMags(scene, physics) {
  const { x: CX, z: CZ } = BALLASTRA_AT.bl_mags, Wd = 7.0, D = 5.6, H = 2.9, DOOR_Z = 1.5, WINX = 1.3;
  const B = new RoomBuilder(scene, physics, 'bl_mags', CX, CZ), R = B.room, k = B.k;
  R.view = 9.4; R.follow = 0.25; R.music = 'home'; R.surface = 'wood';
  // the walls: limewash, stained to the old line (the dado), the flood's salt line a hand over the floor, an older
  // dark line higher with weed caught on it
  const stained = M('bl_w2magsStain', () => new THREE.MeshStandardMaterial({ map: TEX.plaster('#cfcbae'), color: '#d8d4b8', roughness: 0.95 }));
  B.shell({ W: Wd, D, H, t: 0.28, floor: MAT.planks('grey'), slab: MAT.rubble('grey'), body: MAT.plaster('#f2e8d2'), low: stained, dado: 0.95, rail: flat('#f6f2e4', 0.9),
    cap: MAT.wood('dark'), rimH: 0.45, rimMat: MAT.wood('honey'), beam: MAT.wood('dark'), posts: MAT.wood('dark'), postsAt: (L) => [L * 0.45],
    back: [{ at: WINX, w: 1.2, h: 0.95, y0: 1.05, kind: 'window', view: MAT.map(rowView(), 0.9, { emissive: '#ffffff', emissiveMap: rowView(), emissiveIntensity: 0.7 }), frame: MAT.paint('#5f9a86', 0.6) }],
    left: [{ at: DOOR_Z, w: 1.1, h: 2.0, y0: 0, kind: 'door', frame: MAT.paint('#5f9a86', 0.6), sill: MAT.stone('slate', 1) }] });
  R.exits.push({ ...B.world(-Wd / 2 + 0.3, DOOR_Z), r: 0.6, room: 'bl_arches' });
  R.spawn = { ...B.world(-Wd / 2 + 1.3, DOOR_Z), a: Math.PI / 2 };
  R.entries = { bl_arches: R.spawn };
  const BZ = -D / 2;
  // the flood's salt line on the two far walls, a hand over the floor; the old dark line at 1.5 m with weed
  for (const [x, z, w, ry] of [[0, BZ + 0.012, Wd, 0], [-Wd / 2 + 0.012, 0, D, Math.PI / 2]]) {
    k.add(rbox(w, 0.035, 0.012, 0.004), flat('#fbf8ee', 0.9), x, 0.24, z, ry);
    k.add(rbox(w, 0.025, 0.012, 0.004), flat('#8a8670', 0.95), x, 1.5, z, ry);
  }
  // the patched floor: odd boards over the worst of it
  for (const [x, z, w, d, c] of [[0.6, 0.4, 1.1, 0.5, '#b89a72'], [-1.4, -0.8, 0.8, 0.9, '#a68a66'], [1.9, -1.2, 0.7, 0.45, '#c4a67c'], [-0.4, 1.7, 1.3, 0.35, '#9c8462']]) {
    k.add(rbox(w, 0.025, d, 0.006), MAT.flat(c, 0.85), x, 0.012, z);
    for (const s of [-1, 1]) k.add(sphere(0.015, 4, 3), MAT.iron(), x + s * (w / 2 - 0.06), 0.03, z);
  }
  // the committee table: round, mismatched cups, a teapot, a slate with tallies; stools round it
  B.put(0.5, 0.1, 0, (kk) => table(kk, { w: 1.4, round: true, pal: 'grey' }));
  ['#9cc8b4', '#c8764e', '#f2ead6', '#3f6c9c', '#e6b866', '#9cc8b4'].forEach((c, i) => { const a = i * 1.05 + 0.3; k.add(lathe([[0.001, 0], [0.04, 0], [0.055, 0.08], [0.001, 0.08]], 8), flat(c, 0.4), 0.5 + Math.sin(a) * 0.45, 0.79, 0.1 + Math.cos(a) * 0.45); });
  k.add(lathe([[0.001, 0], [0.1, 0], [0.13, 0.08], [0.11, 0.15], [0.05, 0.18], [0.001, 0.19]], 12), celadonDeep(), 0.5, 0.79, 0.1);
  k.add(rbox(0.3, 0.012, 0.22, 0.004), flat('#2e3436', 0.8), 0.25, 0.79, -0.15, 0.3);
  for (let i = 0; i < 5; i++) { const a = i * 1.26 + 0.6; B.put(0.5 + Math.sin(a) * 1.05, 0.1 + Math.cos(a) * 1.05, a, (kk) => { kk.add(cyl(0.18, 0.16, 0.42, 8), MAT.wood(i % 2 ? 'honey' : 'grey'), 0, 0.21, 0); return { r: 0.18, top: 0.43 }; }); }
  // the stove in the back corner, children's things drying on a line by it, small boots, a toy boat
  B.put(-2.6, BZ + 0.5, 0, (kk) => {
    kk.add(lathe([[0.001, 0], [0.34, 0], [0.38, 0.55], [0.3, 0.7], [0.001, 0.7]], 10), flat('#c8764e', 0.7), 0, 0, 0);
    kk.add(rbox(0.24, 0.16, 0.02, 0.01), MAT.glow('#ffb060', '#ff7020', 1.4), 0, 0.32, 0.36);
    kk.add(cyl(0.08, 0.08, H - 0.7, 10), celadonDeep(), 0, 0.7 + (H - 0.7) / 2, -0.1);
    kettle(kk, 0.05, 0.7, 0.05, MAT.copper());
    return { r: 0.42, top: 0.75 };
  });
  k.add(cyl(0.008, 0.008, 2.0, 4), flat('#6a5a4a', 0.9), -1.9, 1.7, BZ + 0.6, 0, { rz: Math.PI / 2 });
  ['#e6b866', '#78b0a6', '#c6684c', '#f0e8d6'].forEach((c, i) => { const g = new THREE.PlaneGeometry(0.26, 0.32, 1, 2); g.translate(0, -0.16, 0); k.add(g, MAT.flat(c, 0.95, { side: THREE.DoubleSide }), -2.7 + i * 0.4, 1.69, BZ + 0.6); });
  for (const s of [-1, 1]) k.add(rbox(0.1, 0.12, 0.2, 0.03), flat('#7a5c40', 0.8), -1.6 + s * 0.07, 0.06, BZ + 1.0);
  k.add(rbox(0.32, 0.08, 0.12, 0.03), flat('#c6684c', 0.6), -1.2, 0.04, BZ + 1.25, 0.6); k.add(cyl(0.008, 0.008, 0.2, 4), MAT.wood('dark'), -1.2, 0.18, BZ + 1.25);
  // buckets for bailing and a broom by the door (the flood comes in here)
  for (let i = 0; i < 3; i++) k.add(lathe([[0.001, 0], [0.13, 0], [0.16, 0.28], [0.001, 0.28]], 10, 0, 0, Math.PI * 2), MAT.wood('pale'), -Wd / 2 + 0.45 + i * 0.12, i === 2 ? 0.28 : 0, DOOR_Z + 0.75 + (i % 2) * 0.32);
  B.col(-Wd / 2 + 0.5, DOOR_Z + 0.9, 0.25, 0.35, 0.5, { block: true });
  k.add(cyl(0.015, 0.015, 1.3, 5), MAT.wood('honey'), -Wd / 2 + 0.25, 0.7, DOOR_Z - 0.75, 0, { rz: 0.15 });
  // the ladder up through the ceiling to the living floor (the hatch's frame), on the right of the back wall
  const LX = Wd / 2 - 0.9;
  for (const s of [-1, 1]) k.add(rbox(0.07, H + 0.2, 0.07, 0.01), MAT.wood('honey'), LX + s * 0.25, (H + 0.2) / 2, BZ + 0.55, 0, { rx: -0.18 });
  for (let i = 0; i < 8; i++) k.add(cyl(0.025, 0.025, 0.5, 6), MAT.wood('dark'), LX, 0.25 + i * 0.36, BZ + 0.55 + 0.05 - i * 0.065, 0, { rz: Math.PI / 2 });
  k.add(rbox(0.9, 0.08, 0.9, 0.02), MAT.wood('dark'), LX, H - 0.04, BZ + 0.4);
  B.col(LX, BZ + 0.45, 0.32, 0.35, H, { block: true });
  // a bench with a folded blanket under the window
  B.put(WINX - 0.3, BZ + 0.35, 0, (kk) => { kk.add(rbox(1.4, 0.07, 0.4, 0.02), MAT.wood('grey'), 0, 0.45, 0); for (const s of [-1, 1]) kk.add(rbox(0.08, 0.45, 0.36, 0.02), MAT.wood('grey'), s * 0.6, 0.22, 0); kk.add(rbox(0.5, 0.1, 0.34, 0.04), MAT.cloth('#c6684c', '#e6b866'), 0.3, 0.53, 0); return { hw: 0.72, hd: 0.22, top: 0.5 }; });
  B.light('#fff2dc', 5.0, 9, WINX, 2.1, BZ + 1.3);
  B.light('#ffb070', 2.0, 5, -2.6, 0.9, BZ + 1.0);
  B.light('#ffe2b0', 3.2, 8, 0.5, 2.4, 0.4);
  Object.assign(ROOMS.mags, { door: B.world(-Wd / 2 + 0.3, DOOR_Z), spawn: R.spawn, host: { ...B.world(0.5 - 1.05, 0.1 + 0.2), a: Math.PI / 2 } });
  R.npcSpots = { mags_house: ROOMS.mags.host };
  return B.finish();
}

// ------------------------------------------------------------------ the pump room inside the arch's pier
function buildPump(scene, physics) {
  const { x: CX, z: CZ } = BALLASTRA_AT.bl_pump, Wd = 12, D = 9, H = 6, DOOR_Z = 2.6;
  const B = new RoomBuilder(scene, physics, 'bl_pump', CX, CZ), R = B.room, k = B.k;
  R.view = 13.5; R.follow = 0.35; R.music = 'workshop'; R.surface = 'stone';
  B.shell({ W: Wd, D, H, t: 0.6, floor: MAT.stone('sand', 1.4), slab: MAT.stone('sand'), body: MAT.stone('sand', 2), low: MAT.stone('slate', 1.5), dado: 1.0, rail: bronze(),
    cap: MAT.stone('sand', 1), rimH: 0.55, rimMat: MAT.stone('sand'), beam: bronze(), posts: MAT.stone('sand', 1), postsAt: (L) => [L * 0.33, L * 0.66],
    left: [{ at: DOOR_Z, w: 1.6, h: 2.6, y0: 0, kind: 'door', frame: bronze(), sill: MAT.stone('slate', 1) }] });
  R.exits.push({ ...B.world(-Wd / 2 + 0.35, DOOR_Z), r: 0.7, room: 'bl_arches' });
  R.spawn = { ...B.world(-Wd / 2 + 1.6, DOOR_Z), a: Math.PI / 2 };
  R.entries = { bl_arches: R.spawn };
  const BZ = -D / 2;
  // the two glazed pump cylinders on their plinths, the bronze flywheel between them on its shaft
  for (const x of [-2.6, 1.0]) B.put(x, -0.6, 0, (kk) => {
    kk.add(rbox(2.1, 0.5, 2.1, 0.05), MAT.stone('slate', 1), 0, 0.25, 0);
    kk.add(lathe([[0.001, 0], [0.85, 0], [0.9, 0.15], [0.82, 0.3], [0.82, 3.0], [0.92, 3.15], [0.7, 3.4], [0.001, 3.45]], 28), celadon(), 0, 0.5, 0);
    for (const y of [0.9, 1.9, 2.9]) kk.add(torus(0.84, 0.05, 6, 28), bronze(), 0, 0.5 + y, 0, 0, { rx: Math.PI / 2 });
    kk.add(cyl(0.12, 0.12, 1.4, 10), MAT.iron(), 0, 4.5, 0);
    return { r: 1.05, top: 4.0 };
  });
  k.add(cyl(0.16, 0.16, 4.4, 12), MAT.iron(), -0.8, 4.3, -0.6, 0, { rz: Math.PI / 2 });
  const fly = k.pivot(-0.8, 4.3, -0.6, 0);
  { const fm = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.14, 8, 32), bronze()); fm.rotation.y = Math.PI / 2; fly.add(fm); for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.9, 0.08), bronze()); sp.rotation.x = (i * Math.PI) / 6; fly.add(sp); } }
  for (const x of [-2.6 + 1.0, 1.0 - 1.0]) k.add(rbox(0.3, 4.4, 0.4, 0.04), MAT.stone('slate', 1), x - 0.02, 2.2, -0.6);
  // the manifold along the back wall: pipes from the cylinders into the wall, each with a brass plate
  for (let i = 0; i < 4; i++) {
    const px = -4.6 + i * 1.3;
    k.add(cyl(0.14, 0.14, 2.6, 10), MAT.copper(), px, 1.8, BZ + 0.35);
    k.add(torus(0.17, 0.035, 5, 12), bronze(), px, 3.1, BZ + 0.35, 0, { rx: Math.PI / 2 });
    k.add(cyl(0.12, 0.12, 0.9, 10), MAT.copper(), px, 3.1, BZ + 0.75, 0, { rx: Math.PI / 2 });
  }
  k.add(cyl(0.2, 0.2, 5.2, 12), MAT.copper(), -2.65, 0.5, BZ + 0.35, 0, { rz: Math.PI / 2 });
  k.add(plane(2.0, 0.5), MAT.map(plateTex(), 0.45, { metalness: 0.5 }), -2.65, 1.3, BZ + 0.53);
  B.col(-2.65, BZ + 0.45, 2.7, 0.3, 3.2, { block: true });
  // the spill gate: a stone channel in the back wall's right part, the vertical gate in bronze-framed grooves, its
  // spindle up to a frame with the hand-wheel, the ratchet and pawl high on the pier wall
  const GX = 3.2, GW = 1.8, GH = 2.4;
  k.add(rbox(GW + 0.8, 0.3, 1.6, 0.04), MAT.stone('slate', 1), GX, -0.15, BZ - 0.2);
  for (const s of [-1, 1]) { k.add(rbox(0.4, H, 0.6, 0.04), MAT.stone('sand', 1), GX + s * (GW / 2 + 0.2), H / 2, BZ + 0.1); k.add(rbox(0.1, 4.2, 0.14, 0.01), bronze(), GX + s * (GW / 2 + 0.02), 2.1, BZ + 0.38); }
  k.add(rbox(GW + 0.8, 0.5, 0.6, 0.04), MAT.stone('sand', 1), GX, 4.4, BZ + 0.1);
  k.add(plane(GW, 2.6), flat('#1c2226', 0.9), GX, 1.3, BZ - 0.15);
  const gate = k.pivot(GX, 0, BZ + 0.36, 0);
  { const gl = new THREE.Mesh(new THREE.BoxGeometry(GW, GH, 0.14), MAT.wood('dark')); gl.position.y = GH / 2; gl.castShadow = true; gate.add(gl);
    for (const y of [0.3, 1.2, 2.1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(GW + 0.04, 0.12, 0.18), bronze()); b.position.y = y; gate.add(b); }
    const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 8), MAT.iron()); sp.position.y = GH + 1.2; gate.add(sp); }
  // the wheel's frame in front of the gate, the hand-wheel, the ratchet at the top with the pawl
  k.add(rbox(0.16, 1.4, 0.16, 0.02), MAT.iron(), GX - 0.9, 0.7, BZ + 1.25); k.add(rbox(0.16, 1.4, 0.16, 0.02), MAT.iron(), GX + 0.9, 0.7, BZ + 1.25);
  k.add(rbox(1.96, 0.14, 0.16, 0.02), MAT.iron(), GX, 1.4, BZ + 1.25);
  const wheel = k.pivot(GX, 1.15, BZ + 1.38, 0);
  { const w = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 6, 24), bronze()); wheel.add(w); for (let i = 0; i < 3; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.05, 0.05), bronze()); sp.rotation.z = (i * Math.PI) / 3; wheel.add(sp); } }
  k.add(cyl(0.035, 0.035, 0.35, 6), MAT.iron(), GX, 1.15, BZ + 1.25, 0, { rx: Math.PI / 2 });
  k.add(cyl(0.035, 0.035, 3.5, 6), MAT.iron(), GX + 0.6, 2.9, BZ + 0.5);
  k.add(cyl(0.4, 0.4, 0.14, 16), MAT.iron(), GX + 0.6, 4.75, BZ + 0.55, 0, { rx: Math.PI / 2 });
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; k.add(rbox(0.1, 0.12, 0.14, 0.01), MAT.iron(), GX + 0.6 + Math.cos(a) * 0.44, 4.75 + Math.sin(a) * 0.44, BZ + 0.55, 0, { rz: a }); }
  const pawl = k.pivot(GX + 1.25, 5.35, BZ + 0.62, 0);
  { const pm = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.1), MAT.paint('#c8443a', 0.4)); pm.position.x = -0.32; pm.rotation.z = -0.35; pawl.add(pm); const kn = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), MAT.glow('#c8443a', '#5a1408', 0.5)); kn.position.set(0.12, 0.05, 0); pawl.add(kn); }
  k.add(cyl(0.06, 0.06, 0.2, 8), MAT.iron(), GX + 1.25, 5.35, BZ + 0.6, 0, { rx: Math.PI / 2 });
  // the chain: from the wheel's rim round to a staple in the floor, heavy links, the official seal plate on it
  const chainG = new THREE.Group(); chainG.name = 'bl_spillChain'; R.group.add(chainG);
  { const g1 = chainGeo([GX - 0.4, 1.35, BZ + 1.42], [GX - 1.2, 0.08, BZ + 2.2], { link: 0.16, r: 0.06 });
    const g2 = chainGeo([GX + 0.4, 1.0, BZ + 1.42], [GX - 1.2, 0.08, BZ + 2.2], { link: 0.16, r: 0.06 });
    for (const g of [g1, g2]) { const m = new THREE.Mesh(g, MAT.iron()); m.castShadow = true; chainG.add(m); }
    const seal = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.04), MAT.map(sealTex(), 0.4)); seal.position.set(GX - 0.8, 0.7, BZ + 1.85); seal.rotation.set(-0.5, 0.4, 0); chainG.add(seal);
  }
  const chainCut = new THREE.Group(); chainCut.name = 'bl_spillChainCut'; R.group.add(chainCut); chainCut.visible = false;
  { const g1 = chainGeo([GX - 0.4, 1.35, BZ + 1.42], [GX - 0.45, 0.4, BZ + 1.46], { link: 0.16, r: 0.06 });
    const g2 = chainGeo([GX - 1.6, 0.08, BZ + 2.4], [GX - 0.4, 0.08, BZ + 2.0], { link: 0.16, r: 0.06 });
    for (const g of [g1, g2]) { const m = new THREE.Mesh(g, MAT.iron()); chainCut.add(m); }
    const seal = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.04), MAT.map(sealTex(), 0.4)); seal.position.set(GX - 1.0, 0.03, BZ + 2.3); seal.rotation.set(-Math.PI / 2, 0, 0.6); chainCut.add(seal);
  }
  k.add(torus(0.1, 0.03, 5, 10), MAT.iron(), GX - 1.2, 0.08, BZ + 2.2, 0, { rx: Math.PI / 2 });
  B.col(GX, BZ + 1.3, 1.05, 0.25, 1.5, { block: true });
  const gateCol = B.col(GX, BZ + 0.36, GW / 2, 0.12, 4.0, { block: true });
  // the channel behind the gate (dry stone, a step down): his to stand in once the gate is up
  B.col(GX, BZ - 0.2, GW / 2, 0.45, -0.05, { seeThrough: true });
  // crates of old spare parts, a lamp, a workbench where Tessa will lay out her tools
  B.put(-4.9, 3.0, 0.2, (kk) => crate(kk, 0.6, { pal: 'grey' })); B.put(-4.2, 3.6, -0.3, (kk) => crate(kk, 0.5, { pal: 'grey' }));
  B.put(4.6, 2.6, -Math.PI / 2, (kk) => { kk.add(rbox(1.8, 0.08, 0.7, 0.02), MAT.wood('dark'), 0, 0.82, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) kk.add(rbox(0.08, 0.8, 0.08, 0.01), MAT.wood('honey'), sx * 0.82, 0.4, sz * 0.28); kk.add(torus(0.12, 0.03, 5, 12), bronze(), 0.3, 0.88, 0, 0, { rx: Math.PI / 2 }); kk.add(rbox(0.3, 0.05, 0.12, 0.01), MAT.steel(), -0.4, 0.88, 0.1, 0.3); return { hw: 0.92, hd: 0.38, top: 0.86 }; });
  B.put(4.6, -1.0, 0, (kk) => barrel(kk, { r: 0.34, pal: 'grey' }));
  // light: lamps on the walls (glazed), the daylight through the door
  for (const [x, z] of [[-5.6, -2], [-1.2, BZ + 0.1], [5.6, -1.5]]) k.add(sphere(0.14, 10, 8), MAT.glow('#fff2cc', '#ffc070', 1.4), x, 3.0, z);
  B.light('#ffe2b0', 5.5, 11, -3.0, 3.6, 0.5);
  B.light('#fff0d8', 4.5, 10, 3.2, 3.2, BZ + 2.0);
  B.light('#d8ecff', 3.0, 8, -Wd / 2 + 1.0, 2.0, DOOR_Z);
  // state: the chain, the pawl, the gate
  const S = { cut: false, pawl: 0, pawlTo: 0, gate: 0, gateTo: 0 };
  const place = () => { pawl.rotation.z = S.pawl * 1.2; gate.position.y = S.gate * 1.9; gateCol.enabled = S.gate < 0.6; wheel.rotation.z = -S.gate * 7; };
  R.updaters.push((dt, t) => {
    if (S.pawl !== S.pawlTo) { S.pawl = S.pawlTo > S.pawl ? Math.min(1, S.pawl + dt * 3) : Math.max(0, S.pawl - dt * 2); place(); }
    if (S.gate !== S.gateTo) { S.gate = S.gateTo > S.gate ? Math.min(1, S.gate + dt / 3.0) : Math.max(0, S.gate - dt / 3.0); place(); }
    fly.rotation.x = Math.sin(t * 0.3) * 0.004;   // (it stands; a breath of a sway when the water moves)
  });
  const sfx = (n) => { const G = globalThis.game; if (G?.room === R && G.state === 'play') G.audio?.play?.(n); };
  const ctl = {
    setChain(cut, instant) { S.cut = !!cut; chainG.visible = !S.cut; chainCut.visible = S.cut; if (!instant) sfx(S.cut ? 'clang' : 'rattle'); },
    setPawl(rel, instant) { S.pawlTo = rel ? 1 : 0; if (instant) S.pawl = S.pawlTo; else sfx('clunk'); place(); },
    setGate(open, instant) { S.gateTo = open ? 1 : 0; if (instant) S.gate = S.gateTo; else sfx('grind'); place(); },
    gateMoving() { return S.gate !== S.gateTo; },
  };
  place();
  Object.assign(ROOMS.pump, {
    door: B.world(-Wd / 2 + 0.35, DOOR_Z), spawn: R.spawn,
    tessa: { ...B.world(-0.8, 1.6), a: Math.PI }, machine: { ...B.world(-0.8, 1.0), r: 1.2 }, plates: { ...B.world(-2.65, BZ + 1.2), r: 1.0 },
    wheel: { ...B.world(GX, BZ + 1.95), r: 0.9 },
    chain: { ...B.world(GX - 0.8, BZ + 1.8), y: 0.7, r: 0.6 },
    pawl: { ...B.world(GX + 1.0, BZ + 0.62), y: 5.35, r: 0.5 },
  });
  R.npcSpots = { tessa_pump: ROOMS.pump.tessa };
  return { R: B.finish(), ctl };
}

export function buildArchRooms(scene, physics) {
  const oren = buildOren(scene, physics), mags = buildMags(scene, physics), pump = buildPump(scene, physics);
  return { rooms: { bl_oren: oren, bl_mags: mags, bl_pump: pump.R }, pump: pump.ctl };
}
