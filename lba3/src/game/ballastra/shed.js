// W-1: inside Tessa's repair shed (the room 'bl_shed'). Tessa is a compact local mechanic (D9): her shed is built to
// her height and her trade, the way the game's interiors are (RoomBuilder's cut-away room under the fixed camera):
//   - the back wall: a long, low workbench under the window onto the lift (the gantry, the stranded boat on its deck
//     painted beyond the glass), a vice, a float valve she has in pieces, her lamp; the tool wall beside it, every tool
//     on its painted outline (one outline empty: the tool is on the bench)
//   - the left wall: the door from the float; the iron stove in the back corner with its ceramic pipe, a kettle,
//     split driftwood; her drawings pinned over a slanted drawing board (floats in section, a counterweight's chain,
//     no words); a shelf of glazed jars and tins high up, a step-stool under it (she can't reach it otherwise)
//   - the room: a cracked ceramic float on trestles in the middle, half re-glazed; a basket of small floats, coils of
//     rope, a crate of fittings; the hammock slung across the front-right corner with a blanket and a cushion
//   - warm light: the window, the stove's glow, one lamp over the bench
//
// CONTRACT (world coordinates)
//   buildShedRoom(scene, physics) → the room 'bl_shed' (R.spawn by the door; R.exits: the door back to the float,
//   { room: 'ballastra' }: the region's R.entries.bl_shed puts him outside it)
//   SHED (filled when built): door {x, z}, spawn {x, z, a}, bench {x, z, r}, tessa {x, z, a}, stove {x, z, r},
//   hammock {x, z, r}, drawings {x, z, r}
import * as THREE from 'three';
import { RoomBuilder } from '../interiors.js';
import { MAT, M, TEX, rbox, plane, cyl, sphere, lathe, torus, canvasTex, crate, barrel, jar, kettle } from '../props.js';
import { BALLASTRA_AT } from './common.js';

export const SHED = {};
const W = 7.2, D = 5.6, H = 3.0, DOOR_Z = 1.55, WINX = 1.4;

// the window's view: the lift seen from the shed (the gantry and its wheel, the caisson with the boat, the water)
const viewTex = () => M('bl_shedViewT', () => canvasTex(512, 320, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#cfe4ea'); g.addColorStop(0.55, '#e4eee8'); g.addColorStop(0.56, '#6cb8ac'); g.addColorStop(1, '#3f8a8a');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  x.fillStyle = 'rgba(200,190,160,0.8)'; x.fillRect(0, 150, 60, 30); x.fillRect(440, 140, 72, 40);                         // far quays
  x.fillStyle = '#d8cbb0'; x.fillRect(90, 150, 40, 120); x.fillRect(380, 150, 40, 120);                                    // the chamber's walls
  x.fillStyle = '#7a5c40'; x.fillRect(110, 30, 18, 130); x.fillRect(384, 30, 18, 130); x.fillRect(100, 26, 320, 16);        // the gantry
  x.fillStyle = '#b07a3a'; x.beginPath(); x.arc(392, 40, 26, 0, 7); x.fill(); x.fillStyle = '#7a5c40'; x.beginPath(); x.arc(392, 40, 8, 0, 7); x.fill();
  x.strokeStyle = '#44464c'; x.lineWidth = 3; for (const cx of [190, 330]) { x.beginPath(); x.moveTo(cx, 40); x.lineTo(cx, 168); x.stroke(); }
  x.fillStyle = '#a07a52'; x.fillRect(130, 168, 250, 36);                                                                  // the caisson
  x.fillStyle = '#5f9a96'; x.beginPath(); x.moveTo(170, 168); x.lineTo(350, 168); x.lineTo(330, 140); x.lineTo(190, 140); x.closePath(); x.fill();   // the boat
  x.fillStyle = '#e6b866'; x.fillRect(188, 150, 144, 6); x.strokeStyle = '#6a4a32'; x.lineWidth = 4; x.beginPath(); x.moveTo(260, 140); x.lineTo(260, 70); x.stroke();
  x.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 12; i++) x.fillRect(Math.random() * w, 210 + Math.random() * 100, 30, 2);
}));
// her drawings: blue lines on cream paper (a float in section, a chain over a wheel, a balance) — no words
const drawTex = () => M('bl_shedDrawT', () => canvasTex(512, 256, (x, w, h) => {
  x.clearRect(0, 0, w, h);
  const sheet = (sx, sy, sw, sh, rot, fn) => { x.save(); x.translate(sx + sw / 2, sy + sh / 2); x.rotate(rot); x.fillStyle = '#f2ead2'; x.fillRect(-sw / 2, -sh / 2, sw, sh); x.strokeStyle = '#3f6c9c'; x.lineWidth = 3; fn(sw, sh); x.fillStyle = '#c6684c'; x.beginPath(); x.arc(0, -sh / 2 + 8, 5, 0, 7); x.fill(); x.restore(); };
  sheet(10, 20, 150, 200, -0.05, (sw, sh) => { x.beginPath(); x.ellipse(0, 10, 50, 64, 0, 0, 7); x.stroke(); x.beginPath(); x.ellipse(0, 10, 38, 52, 0, 0, 7); x.stroke(); x.beginPath(); x.moveTo(-60, 10); x.lineTo(60, 10); x.stroke(); for (let i = -2; i <= 2; i++) { x.beginPath(); x.moveTo(i * 18, 70); x.lineTo(i * 18 + 8, 86); x.stroke(); } });
  sheet(180, 10, 160, 190, 0.04, (sw, sh) => { x.beginPath(); x.arc(0, -40, 32, 0, 7); x.stroke(); x.beginPath(); x.moveTo(-32, -40); x.lineTo(-32, 70); x.moveTo(32, -40); x.lineTo(32, 30); x.stroke(); x.strokeRect(-56, 70, 48, 20); x.strokeRect(14, 30, 36, 44); x.setLineDash([6, 5]); x.beginPath(); x.moveTo(32, 30); x.lineTo(32, 0); x.stroke(); x.setLineDash([]); });
  sheet(360, 30, 140, 170, -0.08, (sw, sh) => { x.beginPath(); x.moveTo(-50, 0); x.lineTo(50, -12); x.stroke(); x.beginPath(); x.moveTo(0, -6); x.lineTo(-12, 50); x.lineTo(12, 50); x.closePath(); x.stroke(); x.strokeRect(-62, 0, 24, 26); x.strokeRect(38, -12, 24, 34); x.beginPath(); x.arc(0, -6, 5, 0, 7); x.stroke(); });
}));
// the tool wall: a board with painted outlines (one empty)
const toolTex = () => M('bl_shedToolT', () => canvasTex(256, 192, (x, w, h) => {
  x.fillStyle = '#86b8ae'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(40,60,60,0.25)'; x.lineWidth = 2; for (let i = 0; i < w; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
  x.fillStyle = 'rgba(30,50,50,0.35)';
  x.fillRect(20, 30, 14, 110); x.fillRect(12, 24, 30, 16);            // (the outline whose spanner is on the bench)
  x.strokeStyle = '#f4ead6'; x.lineWidth = 3; x.strokeRect(20, 30, 14, 110);
}));

function workbench(k, w) {
  const top = MAT.wood('dark'), leg = MAT.wood('honey');
  k.add(rbox(w, 0.08, 0.78, 0.02), top, 0, 0.76, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(rbox(0.09, 0.74, 0.09, 0.015), leg, sx * (w / 2 - 0.1), 0.37, sz * 0.3);
  k.add(rbox(w - 0.2, 0.04, 0.6, 0.01), leg, 0, 0.18, 0);
  // the vice, a valve in pieces, a spanner, a lamp
  k.add(rbox(0.22, 0.14, 0.18, 0.02), MAT.iron(), -w / 2 + 0.35, 0.87, 0.3);
  k.add(cyl(0.015, 0.015, 0.3, 6), MAT.steel(), -w / 2 + 0.35, 0.9, 0.42, 0, { rz: Math.PI / 2 });
  k.add(lathe([[0.001, 0], [0.12, 0], [0.13, 0.05], [0.08, 0.1], [0.08, 0.18], [0.001, 0.18]], 12), MAT.brass(), 0.1, 0.8, 0.05);
  k.add(torus(0.1, 0.022, 6, 16), MAT.brass(), 0.42, 0.82, 0.1, 0, { rx: Math.PI / 2 });
  for (let i = 0; i < 4; i++) k.add(cyl(0.012, 0.012, 0.05, 6), MAT.steel(), 0.6 + i * 0.06, 0.82, -0.05);
  k.add(rbox(0.05, 0.02, 0.3, 0.008), MAT.steel(), -0.3, 0.81, 0.15, 0.4);
  k.add(cyl(0.08, 0.1, 0.03, 10), MAT.iron(), w / 2 - 0.4, 0.81, -0.2);
  k.add(cyl(0.012, 0.012, 0.42, 6), MAT.iron(), w / 2 - 0.4, 1.03, -0.2);
  k.add(lathe([[0.001, 0.1], [0.14, 0], [0.16, -0.02], [0.001, -0.01]], 12), MAT.paint('#5f9a86', 0.4), w / 2 - 0.4, 1.25, -0.08);
  k.add(sphere(0.05, 8, 6), MAT.glow('#fff2cc', '#ffc070', 1.4), w / 2 - 0.4, 1.22, -0.08);
  return { hw: w / 2, hd: 0.4, top: 0.84 };
}
function stove(k) {
  const ir = MAT.iron();
  k.add(rbox(0.7, 0.7, 0.55, 0.06), ir, 0, 0.45, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(cyl(0.03, 0.04, 0.12, 6), ir, sx * 0.28, 0.06, sz * 0.2);
  k.add(rbox(0.3, 0.2, 0.02, 0.01), MAT.glow('#ffb060', '#ff7020', 1.6), 0, 0.42, 0.28);
  k.add(cyl(0.09, 0.09, H - 0.9, 10), MAT.paint('#5f9a86', 0.35), 0.15, 0.8 + (H - 0.9) / 2, -0.1);
  for (const y of [1.2, 2.0]) k.add(torus(0.095, 0.018, 4, 12), MAT.brass(), 0.15, y, -0.1, 0, { rx: Math.PI / 2 });
  kettle(k, -0.15, 0.8, 0.05, MAT.copper());
  return { hw: 0.4, hd: 0.32, top: 0.9 };
}
// the hammock: a cloth sagging between two hooks (a ruled surface), its ropes, a blanket and a cushion
function hammock(k, L) {
  const g = new THREE.PlaneGeometry(L, 0.9, 16, 4); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), t = x / L + 0.5; p.setXYZ(i, x, 1.35 - 0.55 * 4 * t * (1 - t) - Math.abs(y) * 0.25 * Math.sin(Math.PI * t), y * (0.55 + 0.45 * Math.sin(Math.PI * t))); }
  g.computeVertexNormals();
  k.add(g, M('bl_hammock', () => new THREE.MeshStandardMaterial({ map: TEX.fabric('#d8c49a', '#c6684c'), roughness: 0.95, side: THREE.DoubleSide })), 0, 0, 0);
  for (const s of [-1, 1]) for (const yy of [-0.3, 0.3]) k.add(cyl(0.01, 0.01, 0.5, 4), MAT.paint('#c8a878', 0.9), s * (L / 2 + 0.2), 1.5, yy * 0.6, 0, { rz: s * 1.2 });
  k.add(rbox(0.9, 0.06, 0.6, 0.03), MAT.cloth('#3f6c9c', '#f0e8d6'), 0.3, 0.86, 0, 0.2);
  k.add(rbox(0.4, 0.12, 0.3, 0.06), MAT.cloth('#e6b866', '#c6684c'), -L / 2 + 0.55, 1.06, 0, -0.1);
}

export function buildShedRoom(scene, physics) {
  const { x: CX, z: CZ } = BALLASTRA_AT.bl_shed;
  const B = new RoomBuilder(scene, physics, 'bl_shed', CX, CZ);
  const R = B.room, k = B.k;
  R.view = 9.6; R.follow = 0.25; R.music = 'home'; R.surface = 'wood';
  const boards = M('bl_shedBoards', () => { const m = new THREE.MeshStandardMaterial({ map: TEX.planks('grey'), color: '#b4dccf', roughness: 0.8, emissive: '#ffffff', emissiveMap: TEX.planks('grey'), emissiveIntensity: 0.12 }); m.userData.tile = 2; return m; });   // (the walls inside: her painted teal boards)
  const tiles = MAT.tiles('#9cc8b4', '#86b8a6', '#4a6a60', false, 6);
  B.shell({ W, D, H, t: 0.3, floor: MAT.planks('honey'), slab: MAT.rubble('grey'), body: boards, low: tiles, dado: 0.85, rail: MAT.wood('dark'), cap: MAT.wood('dark'), rimH: 0.45, rimMat: MAT.wood('honey'), beam: MAT.wood('dark'),
    posts: MAT.wood('dark'), postsAt: (L) => [L * 0.33, L * 0.66],
    back: [{ at: WINX, w: 1.7, h: 1.0, y0: 1.05, kind: 'window', view: MAT.map(viewTex(), 0.9, { emissive: '#ffffff', emissiveMap: viewTex(), emissiveIntensity: 0.75 }), frame: MAT.paint('#e6b866', 0.6) }],
    left: [{ at: DOOR_Z, w: 1.1, h: 2.1, y0: 0, kind: 'door', frame: MAT.paint('#e6b866', 0.6), sill: MAT.wood('dark') }] });
  // --- the door (the left wall, near the front)
  const doorZ = DOOR_Z;
  R.exits.push({ ...B.world(-W / 2 + 0.3, doorZ), r: 0.6, room: 'ballastra' });
  R.spawn = { ...B.world(-W / 2 + 1.3, doorZ), a: Math.PI / 2 };
  R.entries = { ballastra: R.spawn };
  // --- the workbench under the window, the tool wall beside it
  const BZ = -D / 2;
  B.put(WINX, BZ + 0.45, 0, (kk) => workbench(kk, 2.2));
  k.add(plane(1.5, 1.1), MAT.map(toolTex(), 0.8), -0.55, 1.65, BZ + 0.02);
  for (let i = 0; i < 6; i++) { const tx = -1.15 + i * 0.24; k.add(rbox(0.04, 0.32 + (i % 3) * 0.08, 0.03, 0.008), i % 2 ? MAT.steel() : MAT.iron(), tx, 1.75, BZ + 0.05); k.add(rbox(0.1, 0.05, 0.04, 0.01), MAT.wood('dark'), tx, 1.93 + (i % 3) * 0.04, BZ + 0.06); }
  k.add(rbox(0.36, 0.05, 0.04, 0.01), MAT.steel(), -0.1, 1.4, BZ + 0.05, 0, { rz: 0.4 });
  k.add(rbox(0.06, 0.26, 0.04, 0.01), MAT.wood('honey'), -0.2, 2.0, BZ + 0.05);
  k.add(rbox(0.18, 0.08, 0.06, 0.01), MAT.iron(), -0.2, 2.15, BZ + 0.06);
  // --- the stove on the back wall near the corner, firewood stacked by it
  B.put(-2.25, BZ + 0.5, 0, (kk) => stove(kk));
  for (let i = 0; i < 5; i++) k.add(cyl(0.06, 0.07, 0.5, 6), MAT.wood('grey'), -1.55 + (i % 2) * 0.05, 0.07 + Math.floor(i / 2) * 0.12, BZ + 0.3 + (i % 2) * 0.13, 0, { rx: Math.PI / 2 });
  B.col(-1.5, BZ + 0.35, 0.22, 0.3, 0.4, { block: true });
  // --- her drawings pinned on the left wall over the hammock (where she lies and looks at them)
  k.add(plane(1.7, 0.85), M('bl_shedDraw', () => { const m = new THREE.MeshStandardMaterial({ map: drawTex(), transparent: true, alphaTest: 0.1, roughness: 0.9 }); return m; }), -W / 2 + 0.02, 2.0, -1.0, Math.PI / 2);
  // --- the high shelf of jars and tins, the step-stool under it (the right end of the back wall)
  k.add(rbox(1.1, 0.04, 0.3, 0.01), MAT.wood('honey'), W / 2 - 0.6, 2.1, BZ + 0.16);
  ['#9cc8b4', '#c8764e', '#3f6c9c', '#e6b866'].forEach((c, i) => jar(k, W / 2 - 1.0 + i * 0.26, 2.12, BZ + 0.16, i % 3 ? 'jar' : 'bottle', c, 0.8));
  B.put(W / 2 - 0.5, BZ + 0.4, 0.2, (kk) => { kk.add(rbox(0.46, 0.04, 0.32, 0.01), MAT.wood('honey'), 0, 0.42, 0); kk.add(rbox(0.42, 0.04, 0.28, 0.01), MAT.wood('honey'), 0, 0.2, 0.06); for (const s of [-1, 1]) kk.add(rbox(0.04, 0.44, 0.3, 0.01), MAT.wood('honey'), s * 0.2, 0.22, 0); return { hw: 0.25, hd: 0.18, top: 0.44 }; });
  // --- the cracked float on trestles in the middle, half re-glazed
  B.put(0.7, 0.35, 0.25, (kk) => {
    for (const s of [-1, 1]) { kk.add(rbox(0.08, 0.7, 0.7, 0.01), MAT.wood('honey'), s * 0.6, 0.35, 0, 0, { rz: s * 0.1 }); kk.add(rbox(0.1, 0.08, 0.9, 0.01), MAT.wood('dark'), s * 0.6, 0.72, 0); }
    kk.add(lathe([[0.001, -0.48], [0.3, -0.42], [0.46, -0.2], [0.5, 0.05], [0.42, 0.32], [0.22, 0.48], [0.001, 0.5]], 18), MAT.flat('#9cc8b4', 0.32), 0, 1.15, 0, 0, { rz: Math.PI / 2 });
    kk.add(rbox(0.2, 0.36, 0.02, 0.01), MAT.flat('#c8b48c', 0.85), 0.05, 1.16, 0.49, 0, { rz: 0.5 });   // (the patch over the crack)
    kk.add(torus(0.5, 0.025, 4, 20), MAT.brass(), 0.3, 1.15, 0, Math.PI / 2);
    return { hw: 0.75, hd: 0.5, top: 1.65 };
  });
  // --- the basket of small floats, rope, a crate of fittings (the front left)
  B.put(-1.4, 1.9, 0, (kk) => {
    kk.add(lathe([[0.001, 0], [0.34, 0], [0.4, 0.38], [0.42, 0.42], [0.001, 0.42]], 12), MAT.wood('pale'), 0, 0, 0);
    for (let i = 0; i < 5; i++) kk.add(sphere(0.13, 10, 8), i % 2 ? MAT.flat('#c8764e', 0.6) : MAT.flat('#9cc8b4', 0.32), Math.sin(i * 1.3) * 0.18, 0.44 + (i % 2) * 0.08, Math.cos(i * 1.3) * 0.18);
    return { r: 0.45, top: 0.6 };
  });
  for (let i = 0; i < 3; i++) k.add(torus(0.24 - i * 0.04, 0.035, 5, 14), MAT.paint('#c8a878', 0.9), -0.4, 0.04 + i * 0.06, 2.2, 0, { rx: Math.PI / 2 });
  B.ccol(-0.4, 2.2, 0.28, 0.2, { block: true });
  B.put(2.3, 1.2, -0.3, (kk) => crate(kk, 0.55, { pal: 'pale' }));
  // --- the hammock slung along the left wall between two posts, low (she is not tall), a rag rug under it
  const HX = -W / 2 + 0.75, HZ = -1.0;
  k.at(HX, 0, HZ, Math.PI / 2, () => {
    hammock(k, 2.1);
    for (const s of [-1, 1]) k.add(rbox(0.14, 1.9, 0.14, 0.02), MAT.wood('dark'), s * 1.35, 0.95, 0);
  });
  for (const s of [-1, 1]) B.ccol(HX, HZ + s * 1.35, 0.12, 1.9);
  B.col(HX, HZ, 0.45, 1.2, 1.1, { block: true });
  k.add(rbox(1.0, 0.015, 1.8, 0.005), MAT.cloth('#c6684c', '#e6b866'), HX + 0.55, 0.01, HZ);
  // --- light: the window's daylight, the stove's glow, the lamp over the bench
  B.light('#fff2dc', 6.5, 10, WINX, 2.3, BZ + 1.3);
  B.light('#ffb070', 2.2, 5, -2.25, 0.9, BZ + 1.0);
  B.light('#ffe2b0', 4.0, 8, -0.8, 2.6, 0.8);
  Object.assign(SHED, {
    door: B.world(-W / 2 + 0.3, doorZ - 0.3),
    spawn: R.spawn,
    bench: { ...B.world(WINX, BZ + 1.25), r: 1.0 },
    tessa: { ...B.world(WINX - 0.4, BZ + 1.2), a: Math.PI },
    stove: { ...B.world(-2.25, BZ + 1.2), r: 0.9 },
    hammock: { ...B.world(HX + 0.6, HZ), r: 1.2 },
    drawings: { ...B.world(HX + 0.7, HZ), r: 1.0 },
  });
  R.npcSpots = { tessa_shed: SHED.tessa };
  return B.finish();
}
