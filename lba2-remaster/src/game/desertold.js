// Desert Island: the original's old places (WORLD-80 step 3, docs/WORLD_SIMILARITY.md "Desert Island"). Where the
// original island has a building, a figure or a door we had not built, built here in Kesh's adobe and the island's
// stone from the original's numbers only (tools/worldscore/ref/desert.json turned into our frame: desert.js
// DESERT_FIT): their places, footprints and heights; nothing of the original's graphics.
//
//   - The School of Magic (the user's decision, 26.10.2026): the "high façade" (body 43: 6.7 × 3.3 m, 8.6 m tall) is a
//     giant grey stone mask set in a rock wall, deep brows, glowing orange-red eyes, the School's door carved in its
//     chin; beside it the great hall (body 48: 10.2 × 7.0 m, 6.7 m tall) stands in the sunken pool the original has
//     there, a squat stone block with a crenellated roof and a Moorish arched doorway (blue tiled surround, orange
//     edge) opening onto the pool's rim walk; a paved plaza below the mask with a palm, low tiled walls and a wooden
//     signpost; the white blocks (bodies 46) and the fallen cubes (45) on the mask's terrace, horned stone pillars
//     (body 32 and two of ours), a water channel at the mask's foot with an arched stone bridge in front of the door.
//   - Around Kesh: the big house S40 with its stoop, garden wall, palm and pillar; the tall building at S28 (a tower in
//     its hollow under the ridge); the house of body 49; two 5.2 m standing figures on the knolls west of the village.
//   - North of the research post: the twin 5.2 m pillars, the old corral's post-and-rail fences on the original's
//     lines (bodies 78), its gate, troughs, water tank and lean-to.
//   - The north-east: the walled compound S24 (two houses joined by walls round a yard with a well, palms, pillars).
//   - The gateway over the track to the dig (body 64: two posts under a 9 m lintel); the hut on the north-west
//     plateau (S113); the islet's door in its cove with the 4.6 m figure and a pillar before it.
// Every door that leads nowhere is shut: R.shutDoors (the base interactions answer "Locked.", story/prologue.js).
// Every building is registered (worldfit.js fitAdd) and every figure kept as a spot, so tools/worldscore.mjs can
// match them to the original's landmarks (tools/worldscore/landmarks.json). All geometry goes into the island's one
// draw batch per material (desert.js B), so the island's draw calls grow only by the few new materials.
import * as THREE from 'three';
import { tm, pm, bbox, cyl, lathe, tube, cached, frame, scaleUV, TILE } from './kit.js';
import { fitAdd } from './worldfit.js';
import { rng, smoothstep } from '../engine/math.js';

// ------------------------------------------------------------------ the places (local metres, desert.js's frame)
// the School's mask (body 43): its centre, and the way it faces (east, +x: the hall and the plaza lie south and east of it)
export const SCHOOL_SITE = { x: -69.1, z: -72.7, ry: Math.PI / 2, w: 6.69, d: 3.34, h: 8.64 };
export const SCHOOL_DOOR = { x: -66.3, z: -72.7 };                 // where he stands to go in (on the forecourt before the chin)
const HALL = { x: -67.8, z: -61.7, w: 10.19, d: 7.02, top: 6.69 };  // (body 48; its top 6.69 m over the pool's floor)
const POOL = { x0: -78.5, x1: -50.6, z0: -66.0, z1: -50.5 };       // the sunken pool (the original's 0 m hollow) the hall stands in; its rim walk runs round it
const COVE = { x0: 113.5, x1: 119.3, z0: -124.6, z1: -119.4 };        // the islet's cove, the original's 0.2 m floor before its door (kept out of the water)
const RILL = { x0: -65.0, x1: -62.4, z0: -80.0, z1: -68.6 };        // the water channel at the mask's foot
const FORECOURT = { x0: -67.4, x1: -65.0, z0: -76.2, z1: -69.2 };   // the stone forecourt before the chin door (1.3 m, the terrace's level)
const PLAZA = { x0: -62.4, x1: -54.5, z0: -80.5, z1: -68.3 };       // the paved plaza east of the channel (0.3 m, the original's level)
const COMPOUND_YARD = { x0: 43.5, x1: 50.2, z0: -122.2, z1: -115.2 };

// rocks of the old places, drawn by the island's LOD-instanced rock tiles (desert.js, with their colliders): the
// boulders flanking the mask's rock wall, and small rocks by S40, Hesk's berth and the south-west grove
export const OLD_ROCKS = [
  [-71.7, -77.7, 1.9, 0.4], [-72.0, -68.1, 2.2, 2.3], [-70.7, -72.3, 1.6, 1.1],
  [-45.0, -33.0, 0.6, 1.0], [-29.4, -46.8, 0.7, 2.0], [-44.3, -48.2, 0.5, 0.5],
  [-7.5, -8.4, 0.8, 1.4], [-5.2, -7.2, 0.5, 2.2], [-2.8, -11.6, 0.9, 3.1], [-9.4, -14.0, 0.6, 0.7],
  [-64.0, 45.5, 0.9, 1.9], [-71.8, 41.2, 0.7, 0.3], [-60.5, 42.4, 0.55, 2.6], [-69.6, 51.6, 0.8, 1.2], [-75.6, 48.0, 0.6, 4.0],
];   // [x, z, scale, turn]

const inRect = (r, x, z, pad = 0) => x > r.x0 - pad && x < r.x1 + pad && z > r.z0 - pad && z < r.z1 + pad;
// 0..1 inside a rectangle, falling to 0 over `soft` m outside it
const rectW = (r, x, z, soft) => { const d = Math.max(r.x0 - x, x - r.x1, r.z0 - z, z - r.z1); return 1 - smoothstep(0, soft, d); };
// how much the ground is paved here (the School's plaza and forecourt, the rim walk round the pool, the compound's yard)
export function pavedAt(x, z) {
  let p = Math.max(rectW(PLAZA, x, z, 0.8), rectW(FORECOURT, x, z, 0.6), rectW(COMPOUND_YARD, x, z, 0.6));
  const d = Math.max(POOL.x0 - x, x - POOL.x1, POOL.z0 - z, z - POOL.z1);   // (+ outside the pool: the walk is its 2.6 m rim)
  if (d > -0.5 && d < 3.2) p = Math.max(p, 1 - smoothstep(2.4, 3.2, d));
  return p;
}
// how deep the water channel cuts here (0..1)
export function rillAt(x, z) { return rectW(RILL, x, z, 0.7); }
// the islet's cove floor (0..1): held at 0.75 m, above the water and the cliff-foot rule (desert.js groundGrid)
export function coveAt(x, z) { return rectW(COVE, x, z, 1.0); }

// the sides of a building, in worldfit's convention: the front is local +z; (u along the wall from its middle, v out)
const SIDE = {
  front: { at: (b, u, v) => [u, b.d / 2 + v], yaw: 0, half: (b) => b.w / 2 },
  back: { at: (b, u, v) => [-u, -b.d / 2 - v], yaw: Math.PI, half: (b) => b.w / 2 },
  left: { at: (b, u, v) => [-b.w / 2 - v, u], yaw: -Math.PI / 2, half: (b) => b.d / 2 },
  right: { at: (b, u, v) => [b.w / 2 + v, -u], yaw: Math.PI / 2, half: (b) => b.d / 2 },
};
function extrude(shape, depth, tile = 1) { return scaleUV(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 }), tile); }
// a horseshoe (Moorish) arch opening: hw its half-width, sp the springing height, the arc running `over` rad past the half
function horseshoe(hw, sp, over = 0.3) {
  const s = new THREE.Shape(), c = Math.cos(over), q = Math.sin(over);
  s.moveTo(-hw * c, 0); s.lineTo(-hw * c, sp - hw * q); s.absarc(0, sp, hw, Math.PI + over, -over, true); s.lineTo(hw * c, 0); s.closePath();
  return s;
}
function ringOf(hwIn, hwOut, sp, over = 0.3) {   // the surround between two horseshoes (as a shape with a hole)
  const o = horseshoe(hwOut, sp, over), i = horseshoe(hwIn, sp, over);
  o.holes.push(new THREE.Path(i.getPoints(24).reverse()));
  return o;
}

// ------------------------------------------------------------------ build
// C: { R, B, col, H, W, palm(x, z, s, ry), signAt(text, x, z, ry, bg) } from desert.js (B the island's batch; H the ground)
export function buildOldPlaces(C) {
  const { R, B, col, H, W } = C;
  R.shutDoors = [];
  R.figures = [];
  // materials: the island's own (kit.js caches by name and options: the same objects desert.js draws with), plus a
  // few of stone for the School, the pillars and the figures
  const M = {
    adobe: (c) => tm('plasterWall', { color: c, rough: 0.95 }), roof: tm('plaster', { color: '#d8a878' }),
    wood: tm('wood', { color: '#9a6a40' }), darkWood: tm('wood', { color: '#6a4528' }), plank: tm('planks', { color: '#d8b080' }),
    iron: pm('#4a4440', 0.55, { metalness: 0.5 }), dark: pm('#2a1c14', 0.95), concrete: tm('concrete', { color: '#d8d0c0' }),
    stone: tm('stone', { color: '#d6c9b2' }), grey: tm('stone', { color: '#dedae2' }), cliff: tm('cliff', { color: '#c9b096' }),
    white: tm('plaster', { color: '#f2eee4' }), blue: pm('#2a62a8', 0.45), orange: pm('#e07a2a', 0.6),
    eye: pm('#ff5a1a', 0.3, { emissive: '#d82a00', emissiveIntensity: 1.4 }),
  };
  const r = rng(4949);
  const shut = (id, x, y, z, ry, out = 0.9) => R.shutDoors.push({ id, ...W(x + Math.sin(ry) * out, z + Math.cos(ry) * out), y, ry });
  const figure = (x, z) => R.figures.push(W(x, z));

  // ---------------------------------------------------------------- a house of Kesh's adobe (two storeys when tall)
  // o: { name, x, z, w, d, h, ry, tint, door: { side, u }, shut, windows: [{ side, u }], stoop }
  const adobe = (o) => {
    const b = { w: o.w, d: o.d }, f = frame(o.x, o.z, o.ry), at = (lx, lz) => f(lx, lz);
    // the ground under its corners: the floor sits on the highest, the plinth reaches the lowest
    const gs = [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 0]].map(([sx, sz]) => { const [x, z] = at(sx * o.w / 2, sz * o.d / 2); return H(x, z); });
    const gy = o.gy ?? Math.max(...gs), low = Math.min(...gs, gy) - 0.6, wall = M.adobe(o.tint), two = o.h > 4.2;
    const add = (geo, mat, lx, y, lz, yaw = 0) => { const [x, z] = at(lx, lz); B.add(geo, mat, x, y, z, 0, o.ry + yaw, 0); };
    const piece = (side, u, v, geo, mat, y) => { const S = SIDE[side], [lx, lz] = S.at(b, u, v); add(geo, mat, lx, y, lz, S.yaw); };
    add(bbox(o.w, gy + o.h - low, o.d, 0.22, 2.2), wall, 0, (gy + o.h + low) / 2, 0);
    for (const [px, pz, pw, pd] of [[0, o.d / 2 - 0.12, o.w, 0.24], [0, -o.d / 2 + 0.12, o.w, 0.24], [o.w / 2 - 0.12, 0, 0.24, o.d], [-o.w / 2 + 0.12, 0, 0.24, o.d]]) add(bbox(pw, 0.55, pd, 0.1, 2.2), wall, px, gy + o.h + 0.25, pz);
    add(bbox(o.w - 0.4, 0.1, o.d - 0.4, 0, 2), M.roof, 0, gy + o.h + 0.02, 0);
    for (let k = -o.w / 2 + 0.6; k < o.w / 2 - 0.3; k += 0.8) for (const s of [-1, 1]) add(cyl(0.09, 0.1, 0.5, 7, 0), M.darkWood, k, gy + o.h - 0.4, s * (o.d / 2 + 0.2), 0);
    for (const s of [-1, 1]) for (let k = -o.w / 2 + 0.6; k < o.w / 2 - 0.3; k += 0.8) { const [x, z] = at(k, s * (o.d / 2 + 0.2)); B.add(cyl(0.09, 0.1, 0.5, 7, 0), M.darkWood, x, gy + o.h - 0.4, z, Math.PI / 2, o.ry, 0); }
    if (two) for (const side of ['front', 'back', 'left', 'right']) piece(side, 0, 0.06, bbox(SIDE[side].half(b) * 2 - 0.3, 0.16, 0.12, 0, 1), M.roof, gy + o.h * 0.52);   // (a string course between the storeys)
    // the door: recessed, framed in wood, its leaf closed when shut or ajar when it is lived in
    const D = o.door;
    piece(D.side, D.u, -0.05, bbox(1.25, 2.15, 0.3, 0.04, 1), M.dark, gy + 1.08);
    piece(D.side, D.u, 0.02, bbox(1.45, 0.16, 0.38, 0, 1), M.wood, gy + 2.2);
    for (const s of [-1, 1]) piece(D.side, D.u + s * 0.68, 0.02, bbox(0.14, 2.2, 0.36, 0, 1), M.wood, gy + 1.1);
    if (o.shut) piece(D.side, D.u, 0.04, bbox(1.2, 2.1, 0.08, 0, 0.6), M.plank, gy + 1.05);
    else { const S = SIDE[D.side], [lx, lz] = S.at(b, D.u - 0.15, 0.28); add(bbox(0.95, 1.95, 0.08, 0, 0.6), M.plank, lx, gy + 1.0, lz, S.yaw - 0.55); }
    piece(D.side, D.u, 0.32, bbox(1.7, 0.16, 0.6, 0, 1), M.stone, gy + 0.02);   // the sill's step
    // windows: small, deep, with a wooden sill and one open shutter; the upper storey's higher
    for (const w of o.windows || []) {
      const y = gy + (w.up ? o.h * 0.52 + 1.3 : 2.0);
      piece(w.side, w.u, -0.05, bbox(0.7, 0.8, 0.3, 0, 1), M.dark, y);
      piece(w.side, w.u, 0.03, bbox(0.86, 0.1, 0.34, 0, 1), M.wood, y - 0.45);
      { const S = SIDE[w.side], [lx, lz] = S.at(b, w.u - 0.6, 0.12); add(bbox(0.38, 0.8, 0.05, 0, 0.6), pm(o.shutter || '#3a7a9a', 0.7), lx, y, lz, S.yaw + 0.5); }
    }
    for (let k = 0; k < 3; k++) add(lathe([[0.01, 0], [0.22, 0.04], [0.3, 0.3], [0.18, 0.55], [0.15, 0.62], [0.17, 0.66]], 12, 0), pm(['#c86a3a', '#d8a050', '#a85030'][k], 0.85), -o.w / 2 + 0.7 + k * 0.6, gy + o.h + 0.07, -o.d / 2 + 0.7);
    // a paved stoop before the door (S40's: body 28, a 3 m slab)
    if (o.stoop) { const S = SIDE[D.side], [lx, lz] = S.at(b, D.u, o.stoop / 2 + 0.1); add(bbox(o.stoop, 0.3, o.stoop, 0, 1.5), M.stone, lx, gy - 0.1, lz, S.yaw); }
    const [cx, cz] = at(0, 0);
    col({ type: 'box', x: cx, z: cz, hw: o.w / 2, hd: o.d / 2, rot: o.ry, top: gy + o.h + 0.6 });
    fitAdd({ region: 'desert', name: o.name, x: W(cx, cz).x, z: W(cx, cz).z, ry: o.ry, oy: gy, w: o.w, d: o.d, base: low - gy, plinth: 0.1, floor: 0.02, steps: 0.6,
      openings: [{ side: D.side, kind: 'door', x0: D.u - 0.75, x1: D.u + 0.75, y0: 0, y1: 2.3 }, ...(o.windows || []).map((w) => ({ side: w.side, kind: 'window', x0: w.u - 0.8, x1: w.u + 0.45, y0: (w.up ? o.h * 0.52 + 1.3 : 2.0) - 0.5, y1: (w.up ? o.h * 0.52 + 1.3 : 2.0) + 0.45 }))] });
    if (o.shut) { const S = SIDE[D.side], [lx, lz] = S.at(b, D.u, 0.05), [x, z] = at(lx, lz); shut(o.name, x, gy, z, o.ry + S.yaw); }
    return { gy, at };
  };

  // ---------------------------------------------------------------- a standing stone figure (robed, hooded, a staff)
  const stoneFigure = (x, z, ry, h, mat = M.stone) => {
    const f = frame(x, z, ry), fg = H(x, z), ph = Math.min(0.9, h * 0.17), k = (h - ph) / 3.5;
    B.add(bbox(1.3 * k + 0.4, ph + 0.5, 1.3 * k + 0.4, 0.06, 1), M.grey, x, fg + (ph - 0.5) / 2, z, 0, ry, 0);
    B.add(bbox(1.3 * k + 0.55, 0.14, 1.3 * k + 0.55, 0.04, 1), M.grey, x, fg + ph - 0.05, z, 0, ry, 0);
    const y0 = fg + ph + 0.02;
    B.add(lathe([[0, 0], [0.7, 0], [0.72, 0.12], [0.6, 0.7], [0.46, 1.45], [0.5, 1.95], [0.58, 2.28], [0.4, 2.5], [0.15, 2.6], [0, 2.62]], 14, TILE.stone), mat, x, y0, z, 0, ry, 0, k, k, 0.72 * k);
    B.add(cached('w80d-head', () => new THREE.SphereGeometry(0.25, 10, 8)), mat, x, y0 + 2.84 * k, z, 0, 0, 0, k);
    { const [hx, hz] = f(0, -0.06 * k); B.add(lathe([[0.36, 0], [0.37, 0.2], [0.31, 0.44], [0.18, 0.7], [0.06, 0.92], [0, 0.97]], 10, TILE.stone), M.grey, hx, y0 + 2.58 * k, hz, 0, ry, 0, k); }
    { const [fx, fz] = f(0, 0.255 * k); B.add(cached('w80d-face', () => new THREE.CircleGeometry(0.17, 10).scale(1, 1.25, 1)), M.dark, fx, y0 + 2.86 * k, fz, 0, ry, 0, k); }
    const [sx, sz] = f(-0.58 * k, 0.18 * k);
    B.add(cyl(0.045 * k, 0.05 * k, 3.42 * k, 6), M.darkWood, sx, y0 + 1.69 * k, sz);
    B.add(cached('w80d-staff', () => new THREE.OctahedronGeometry(0.13, 0)), M.grey, sx, y0 + 3.48 * k, sz, 0, 0, 0, k);
    const [ax, az] = f(-0.42 * k, 0.12 * k), [hx, hz] = f(-0.55 * k, 0.2 * k);
    B.add(tube([[ax, y0 + 2.28 * k, az], [(ax + hx) / 2 - 0.02, y0 + 1.95 * k, (az + hz) / 2], [hx, y0 + 1.72 * k, hz]], 0.13 * k, 6, TILE.stone), mat);
    { const [a1x, a1z] = f(0.5 * k, 0.05 * k), [a2x, a2z] = f(0.42 * k, 0.32 * k), [a3x, a3z] = f(-0.05 * k, 0.38 * k); B.add(tube([[a1x, y0 + 2.25 * k, a1z], [a2x, y0 + 1.8 * k, a2z], [a3x, y0 + 1.82 * k, a3z]], 0.12 * k, 6, TILE.stone), mat); }
    col({ type: 'box', x, z, hw: 0.65 * k + 0.2, hd: 0.65 * k + 0.2, rot: ry, top: fg + h });
    figure(x, z);
  };
  // a horned stone pillar: a tapered square shaft, a capital, two horns curving out (the reference's horned pillars)
  const hornedPillar = (x, z, ry, h) => {
    const fg = H(x, z), w = 0.3 + h * 0.12;
    B.add(bbox(w + 0.5, 0.5, w + 0.5, 0.04, 1), M.grey, x, fg + 0.1, z, 0, ry, 0);
    B.add(lathe([[0, 0], [w / 2, 0], [w / 2 * 0.78, h - 1.1], [w / 2 * 0.95, h - 0.95], [w / 2 * 0.95, h - 0.7], [0, h - 0.7]], 4, TILE.stone), M.stone, x, fg + 0.3, z, 0, ry + Math.PI / 4, 0);
    const f = frame(x, z, ry);
    for (const s of [-1, 1]) { const [hx, hz] = f(s * w * 0.42, 0); B.add(cached('w80d-horn', () => new THREE.ConeGeometry(0.17, 1.1, 7)), M.stone, hx, fg + h - 0.25, hz, 0, 0, -s * 0.55); }
    col({ type: 'cyl', x, z, r: w / 2 + 0.15, top: fg + h, seeThrough: true });
    return fg;
  };
  // a post-and-rail fence piece (the original's 3.24 m sections, 1 m tall) with its collider
  const rail = (x, z, len, ry, h = 1.0) => {
    const g = H(x, z), f = frame(x, z, ry);
    for (const s of [-1, 1]) { const [px, pz] = f(s * (len / 2 - 0.12), 0); B.add(cyl(0.06, 0.07, h + 0.2, 6), M.darkWood, px, H(px, pz) + (h + 0.2) / 2 - 0.1, pz); }
    for (const y of [h - 0.08, h * 0.55]) B.add(bbox(len - 0.1, 0.08, 0.06, 0, 1), M.wood, x, g + y, z, 0, ry, 0);
    col({ type: 'box', x, z, hw: len / 2, hd: 0.24, rot: ry, top: g + h, noStand: true, seeThrough: true });
  };
  // a low adobe garden wall piece (S40's and the compound's), its collider
  const lowWall = (x, z, len, ry, h = 1.2, mat = M.adobe('#e6b07e')) => { const g = H(x, z); B.add(bbox(len, h + 0.3, 0.32, 0.05, 2.2), mat, x, g + (h - 0.3) / 2, z, 0, ry, 0); B.add(bbox(len + 0.06, 0.12, 0.42, 0, 1), M.stone, x, g + h + 0.04, z, 0, ry, 0); col({ type: 'box', x, z, hw: len / 2, hd: 0.2, rot: ry, top: g + h, noStand: true, seeThrough: true }); };
  // a wooden trough on legs
  const trough = (x, z, ry, len = 3.2) => { const g = H(x, z); B.add(bbox(len, 0.5, 0.8, 0.04, 1), M.plank, x, g + 0.75, z, 0, ry, 0); const f = frame(x, z, ry); for (const s of [-1, 1]) for (const t of [-1, 1]) { const [px, pz] = f(s * (len / 2 - 0.3), t * 0.3); B.add(cyl(0.05, 0.05, 0.6, 6), M.darkWood, px, g + 0.3, pz); } col({ type: 'box', x, z, hw: len / 2, hd: 0.45, rot: ry, top: g + 1.0, noStand: true, seeThrough: true }); };

  // ================================================================ the School of Magic
  {
    const S = SCHOOL_SITE, f = frame(S.x, S.z, S.ry);   // (local +z faces east: f(u, v): u along the face (north −), v out of it)
    const g = H(S.x, S.z), base = g - 0.4, top = g + S.h;
    // the canyon wall the mask is set in: a slab of the terrace's rock behind the face, boulders at its ends and over it
    { const [bx, bz] = f(0, -2.3); B.add(bbox(S.w + 2.6, S.h + 1.4, 2.6, 0.5, TILE.cliff), M.cliff, bx, base + (S.h + 1.4) / 2 - 0.2, bz, 0, S.ry, 0); col({ type: 'box', x: bx, z: bz, hw: (S.w + 2.6) / 2, hd: 1.3, rot: S.ry, top: top + 0.9, camSkip: true }); }
    // (the boulders at its ends: OLD_ROCKS, drawn by the island's rock tiles)
    // the face: a broad stone egg, its chin pushed forward
    { const [cx, cz] = f(0, -0.35); B.add(cached('w80d-sphere', () => new THREE.SphereGeometry(1, 18, 14)), M.grey, cx, g + 4.5, cz, 0, S.ry, 0, S.w / 2 - 0.1, 4.15, 1.45); }
    { const [cx, cz] = f(0, 0.55); B.add(bbox(3.4, 3.0, 1.6, 0.45, 1), M.grey, cx, g + 1.4, cz, 0, S.ry, 0); }   // the chin
    // the brows, slanting down to the nose; the eyes glowing in their sockets; the long nose
    for (const s of [-1, 1]) {
      { const [bx, bz] = f(s * 1.5, 1.05); B.add(bbox(2.6, 0.7, 1.1, 0.2, 1), M.grey, bx, g + 6.55, bz, 0, S.ry - s * 0.22, s * 0.3); }
      { const [ex, ez] = f(s * 1.45, 1.0); B.add(cached('w80d-sphere', () => new THREE.SphereGeometry(1, 18, 14)), M.eye, ex, g + 5.85, ez, 0, S.ry, s * 0.28, 0.75, 0.34, 0.3); }
      { const [ex, ez] = f(s * 1.45, 0.85); B.add(cached('w80d-sphere', () => new THREE.SphereGeometry(1, 18, 14)), M.dark, ex, g + 5.85, ez, 0, S.ry, s * 0.28, 1.0, 0.55, 0.4); }
    }
    { const [nx, nz] = f(0, 1.1); B.add(cached('w80d-nose', () => new THREE.ConeGeometry(0.55, 2.2, 4)), M.grey, nx, g + 4.9, nz, -0.22, S.ry + Math.PI / 4, 0); }
    // the door in the chin: a stone frame, a dark reveal, a wooden leaf, a star over it; the forecourt slab before it
    const [dx, dz] = f(0, 1.36), doorY = g;
    B.add(bbox(1.6, 2.3, 0.4, 0.04, 1), M.dark, dx, doorY + 1.15, dz, 0, S.ry, 0);
    B.add(bbox(2.0, 0.26, 0.5, 0, 1), M.stone, dx, doorY + 2.42, dz, 0, S.ry, 0);
    for (const s of [-1, 1]) { const [jx, jz] = f(s * 0.92, 1.4); B.add(bbox(0.26, 2.4, 0.46, 0, 1), M.stone, jx, doorY + 1.2, jz, 0, S.ry, 0); }
    { const [lx, lz] = f(0, 1.5); B.add(bbox(1.5, 2.2, 0.08, 0, TILE.planks), M.darkWood, lx, doorY + 1.1, lz, 0, S.ry, 0); }
    { const [sx, sz] = f(0, 1.56); B.add(cached('w80d-star', () => new THREE.CircleGeometry(0.22, 5)), pm('#bff4ff', 0.4, { emissive: '#40a0d0', emissiveIntensity: 1.0 }), sx, doorY + 1.75, sz, 0, S.ry, 0); }
    { const F = FORECOURT, cx = (F.x0 + F.x1) / 2, cz = (F.z0 + F.z1) / 2; B.add(bbox(F.x1 - F.x0, 1.3, F.z1 - F.z0, 0.04, 1.5), M.stone, cx, g - 0.62, cz); col({ type: 'box', x: cx, z: cz, hw: (F.x1 - F.x0) / 2, hd: (F.z1 - F.z0) / 2, top: g + 0.03 }); }
    // the mask's body is solid; the forecourt is stood on
    { const [cx, cz] = f(0, 0.3); col({ type: 'box', x: cx, z: cz, hw: S.w / 2 + 0.1, hd: 1.7, rot: S.ry, top: top, camSkip: true }); }
    fitAdd({ region: 'desert', name: 'the school mask', x: W(S.x, S.z).x, z: W(S.x, S.z).z, ry: S.ry, oy: g, w: S.w, d: S.d, base: -0.4, plinth: 0.2, floor: 0, steps: 0.6, openings: [{ side: 'front', kind: 'door', x0: -1.05, x1: 1.05, y0: 0, y1: 2.6 }] });
    C.schoolSpot = { x: dx, z: dz };
    // the white blocks (bodies 46) and the fallen cubes (45) on the terrace, the horned pillar (body 32) to the north
    for (const [bx, bz] of [[-74.7, -72.4], [-78.2, -72.7]]) { const bg = H(bx, bz); B.add(bbox(2.95, 2.95, 3.93, 0.08, 1.5), M.white, bx, bg + 1.2, bz); B.add(bbox(3.15, 0.2, 4.13, 0.04, 1), M.stone, bx, bg + 2.75, bz); col({ type: 'box', x: bx, z: bz, hw: 1.5, hd: 2.0, top: bg + 2.85 }); }
    for (const [bx, bz, ry] of [[-71.6, -75.6, 0.3], [-68.2, -77.0, 1.2], [-69.8, -78.7, 2.4]]) { const bg = H(bx, bz); B.add(bbox(1.67, 1.67, 1.67, 0.06, 1), M.stone, bx, bg + 0.7, bz, 0, ry, 0.08); col({ type: 'box', x: bx, z: bz, hw: 0.85, hd: 0.85, rot: ry, top: bg + 1.5 }); }
    hornedPillar(-67.0, -90.6, 0, 4.25);
    // the water channel at the mask's foot (the ground is cut by desert.js rillAt) and the arched stone bridge over it
    // before the door, from the forecourt (1.3 m) down two steps onto the plaza (0.3 m)
    {
      const x0 = FORECOURT.x1, x1 = RILL.x1 + 0.5, cz = S.z, L = x1 - x0, y = g + 0.02;
      B.add(bbox(L + 0.2, 0.34, 2.6, 0.04, 1.5), M.stone, (x0 + x1) / 2, y - 0.17, cz);
      B.add(cyl(1.25, 1.25, 2.4, 14, TILE.stone, true), M.stone, (x0 + x1) / 2, y - 0.9, cz, 0, 0, Math.PI / 2);   // the arch's barrel under the deck
      for (const s of [-1, 1]) { B.add(bbox(L + 0.2, 0.5, 0.26, 0, 1), M.stone, (x0 + x1) / 2, y + 0.25, cz + s * 1.17); col({ type: 'box', x: (x0 + x1) / 2, z: cz + s * 1.17, hw: L / 2 + 0.1, hd: 0.13, top: y + 0.5, noStand: true, seeThrough: true }); }
      col({ type: 'box', x: (x0 + x1) / 2, z: cz, hw: L / 2 + 0.1, hd: 1.05, top: y });
      const pg = H(x1 + 1.2, cz);   // the plaza's ground east of the bridge
      [[0.0, 0.66], [0.5, 0.33]].forEach(([dx2, t]) => { const sy = pg + (y - pg) * t, sx = x1 + 0.25 + dx2 * 2; B.add(bbox(0.52, sy - pg + 0.3, 2.6, 0, 1), M.stone, sx, (sy + pg - 0.3) / 2, cz); col({ type: 'box', x: sx, z: cz, hw: 0.26, hd: 1.3, top: sy }); });
      B.add(bbox(2.4, 0.5, 0.26, 0, 1), M.stone, x1 + 1.0, y - 0.1, cz + 1.17); B.add(bbox(2.4, 0.5, 0.26, 0, 1), M.stone, x1 + 1.0, y - 0.1, cz - 1.17);
    }
    // the plaza: low tiled walls along its east edge, a palm, the signpost; two horned pillars flanking the bridge's foot
    { const P = PLAZA; for (let z = P.z0 + 1.4; z < P.z1 - 1.0; z += 2.8) { const g2 = H(P.x1, z); B.add(bbox(0.3, 0.9, 2.6, 0.04, 1.5), M.stone, P.x1, g2 + 0.3, z); B.add(bbox(0.42, 0.1, 2.7, 0, 1), M.blue, P.x1, g2 + 0.78, z); col({ type: 'box', x: P.x1, z, hw: 0.2, hd: 1.3, top: g2 + 0.8, noStand: true, seeThrough: true }); } }
    C.palm(-58.6, -77.4, 1.05, 0.7);
    C.signAt('SCHOOL OF MAGIC', -59.6, -70.2, Math.PI * 0.5, '#6a4a2a');   // (facing east, the way he comes along the rim walk)
    hornedPillar(RILL.x1 + 2.2, S.z - 2.4, 0, 3.4); hornedPillar(RILL.x1 + 2.2, S.z + 2.4, 0, 3.4);
    // a stone stair from the plaza (0.3) up to the rim walk (2.3) at the plaza's south-east corner
    { const sx = -56.2, z0 = PLAZA.z1, top0 = H(sx, z0 + 2.6), bot = H(sx, z0 - 1.2), n = 5; for (let k = 0; k < n; k++) { const y = bot + (top0 - bot) * (k + 1) / n, zz = z0 - 0.3 + k * 0.5; B.add(bbox(2.4, y - bot + 0.4, 0.52, 0, 1), M.stone, sx, (y + bot - 0.4) / 2, zz); col({ type: 'box', x: sx, z: zz, hw: 1.2, hd: 0.26, top: y }); } }

    // ---- the great hall in the pool: a stepped plinth rising out of the water, stone walls, a crenellated roof, the
    //      Moorish arched doorway on the north side opening onto the rim walk (shut), slit windows, a corner stair turret
    {
      const Hh = HALL, sill = H(Hh.x, Hh.z - Hh.d / 2 - 1.2) + 0.05, wallTop = sill + Hh.top - 2.3 - 0.8, roofTop = wallTop + 0.8;
      B.add(bbox(Hh.w + 1.0, sill + 3.6, Hh.d + 1.0, 0.1, TILE.stone), M.grey, Hh.x, sill - 1.8 - 0.2, Hh.z);         // the plinth, down into the pool
      B.add(bbox(Hh.w + 0.5, 0.3, Hh.d + 0.5, 0.04, TILE.stone), M.stone, Hh.x, sill - 0.15, Hh.z);
      B.add(bbox(Hh.w, wallTop - sill, Hh.d, 0.12, TILE.stone), M.stone, Hh.x, (wallTop + sill) / 2, Hh.z);
      B.add(bbox(Hh.w + 0.3, 0.3, Hh.d + 0.3, 0.04, 1), M.grey, Hh.x, wallTop + 0.1, Hh.z);                            // the cornice
      B.add(bbox(Hh.w - 0.6, 0.1, Hh.d - 0.6, 0, 2), M.roof, Hh.x, wallTop + 0.3, Hh.z);
      // merlons round the roof
      for (const [side, n] of [['front', 6], ['back', 6], ['left', 4], ['right', 4]]) {
        const S2 = SIDE[side], half = S2.half(Hh);
        for (let i = 0; i < n; i++) { const u = -half + 0.45 + (i / (n - 1)) * (2 * half - 0.9), [lx, lz] = S2.at(Hh, u, -0.2); B.add(bbox(0.8, 0.8, 0.4, 0.05, 1), M.stone, Hh.x + lx, roofTop - 0.4 + 0.25, Hh.z + lz, 0, S2.yaw, 0); }
      }
      // the doorway: the dark reveal, the shut leaf, the blue tiled surround with its orange edge; a star window over it
      const hw = 1.0, sp = 2.1, dz0 = Hh.z - Hh.d / 2;
      { const sh = horseshoe(hw, sp); B.add(extrude(sh, 0.5, 1), M.dark, Hh.x, sill, dz0 - 0.45); B.add(extrude(sh, 0.08, TILE.planks), M.darkWood, Hh.x, sill, dz0 - 0.1); }
      B.add(extrude(ringOf(hw, hw + 0.42, sp), 0.1, 1), M.blue, Hh.x, sill, dz0 - 0.12);
      B.add(extrude(ringOf(hw + 0.42, hw + 0.52, sp), 0.12, 1), M.orange, Hh.x, sill, dz0 - 0.12);
      for (const hy of [0.7, 1.7]) B.add(bbox(1.9, 0.07, 0.03, 0, 1), M.iron, Hh.x, sill + hy, dz0 - 0.02);
      B.add(cached('w80d-star8', () => new THREE.CircleGeometry(0.42, 8)), M.blue, Hh.x, wallTop - 0.9, dz0 - 0.02);
      B.add(cached('w80d-star', () => new THREE.CircleGeometry(0.22, 5)), pm('#bff4ff', 0.4, { emissive: '#40a0d0', emissiveIntensity: 1.0 }), Hh.x, wallTop - 0.9, dz0 - 0.04);
      // slit windows on the east and west faces, blue-edged
      for (const s of [-1, 1]) for (const dzz of [-1.8, 1.8]) { const wx = Hh.x + s * (Hh.w / 2 + 0.02); B.add(bbox(0.06, 1.3, 0.34, 0, 1), M.dark, wx, sill + 2.6, Hh.z + dzz); B.add(bbox(0.05, 1.5, 0.54, 0, 1), M.blue, wx - s * 0.01, sill + 2.6, Hh.z + dzz); }
      // the threshold slab between the rim walk and the door, stood on; the hall itself is solid
      B.add(bbox(3.4, 0.5, 1.6, 0.04, 1.5), M.stone, Hh.x, sill - 0.25, dz0 - 0.7); col({ type: 'box', x: Hh.x, z: dz0 - 0.7, hw: 1.7, hd: 0.8, top: sill });
      col({ type: 'box', x: Hh.x, z: Hh.z, hw: Hh.w / 2 + 0.5, hd: Hh.d / 2 + 0.5, top: roofTop, camSkip: true });
      shut('hall', Hh.x, sill, dz0, Math.PI, 1.2);
      fitAdd({ region: 'desert', name: 'the school hall', x: W(Hh.x, Hh.z).x, z: W(Hh.x, Hh.z).z, ry: 0, oy: sill, w: Hh.w, d: Hh.d, base: -3.6, plinth: 0.0, floor: 0.0, steps: 0.6, openings: [{ side: 'back', kind: 'door', x0: -1.6, x1: 1.6, y0: 0, y1: 3.4 }] });
      // the rim walk's parapet along the pool, east of the hall and down the east rim (a low tiled wall; he keeps dry)
      const par = (x, z, len, ry) => { const g2 = H(x, z); B.add(bbox(len, 0.75, 0.3, 0.04, 1.5), M.stone, x, g2 + 0.2, z, 0, ry, 0); B.add(bbox(len + 0.04, 0.1, 0.42, 0, 1), M.blue, x, g2 + 0.62, z, 0, ry, 0); col({ type: 'box', x, z, hw: len / 2, hd: 0.2, rot: ry, top: g2 + 0.7, noStand: true, seeThrough: true }); };
      for (let x = Hh.x + Hh.w / 2 + 1.4; x < POOL.x1 - 0.2; x += 2.4) par(x, POOL.z0 + 0.15, 2.3, 0);   // (on the brink: the walk behind it stays free)
      for (let z = POOL.z0 + 1.6; z < POOL.z1 - 0.6; z += 2.4) par(POOL.x1 - 0.25, z, 2.3, Math.PI / 2);
      C.palm(-39.5, -61.1, 0.95, 2.1);   // (body 11/12: the tree east of the pool)
    }
  }

  // ================================================================ around Kesh
  // the big house S40 (body 24), its stoop (28), garden wall (31), the horned pillar (32), the palm (9/10), a hand cart (16/17)
  adobe({ name: 'house s40', x: -35.5, z: -38.9, w: 6.08, d: 7.6, h: 5.07, ry: -Math.PI / 2, tint: '#e9b98a', shutter: '#c84a3a', door: { side: 'front', u: 0.3 }, stoop: 3.0, shut: true,
    windows: [{ side: 'front', u: -2.0 }, { side: 'front', u: -1.6, up: true }, { side: 'front', u: 1.8, up: true }, { side: 'left', u: -1.2 }, { side: 'left', u: 1.0, up: true }, { side: 'right', u: 1.2, up: true }] });
  for (const [x, z, ry] of [[-33.4, -44.9, 0], [-35.5, -45.1, 0], [-37.7, -45.3, 0], [-39.8, -45.5, 0], [-42.0, -45.7, 0], [-48.3, -46.2, 0], [-50.5, -46.4, 0], [-32.2, -43.6, Math.PI / 2]]) lowWall(x, z, 2.12, ry);
  hornedPillar(-43.0, -41.3, 0, 4.25);
  C.palm(-46.9, -36.3, 1.1, 2.6);
  { const g = H(-25.4, -45.7); B.add(bbox(2.4, 0.5, 1.2, 0.04, 1), M.plank, -25.4, g + 0.85, -45.7); for (const s of [-1, 1]) B.add(cyl(0.55, 0.55, 0.14, 12, 0), M.darkWood, -25.4 + s * 1.1, g + 0.55, -45.7 - 0.7, Math.PI / 2, 0, 0); B.add(cyl(0.05, 0.05, 2.6, 6), M.darkWood, -25.4, g + 0.75, -44.4, Math.PI / 2, 0, 0); col({ type: 'box', x: -25.4, z: -45.7, hw: 1.3, hd: 0.8, top: g + 1.1, noStand: true, seeThrough: true }); }
  // the tall building at S28 (body 52): a tower in its hollow under the ridge, its door to the west
  {
    // (it stands on the hollow's floor; its north end runs into the ridge, whose top its roof reaches, as the original's does)
    const T = { x: 4.0, z: 1.3, w: 2.47, d: 7.19, h: 8.36 }, gy = H(T.x - T.w / 2 - 0.5, T.z - 1.5), low = gy - 0.6;
    B.add(bbox(T.w, gy + T.h * 0.55 - low, T.d, 0.1, TILE.stone), M.stone, T.x, (gy + T.h * 0.55 + low) / 2, T.z);
    B.add(bbox(T.w - 0.2, T.h * 0.45, T.d - 0.2, 0.1, TILE.stone), M.adobe('#e2a878'), T.x, gy + T.h * 0.55 + T.h * 0.225, T.z);
    B.add(bbox(T.w + 0.2, 0.25, T.d + 0.2, 0.04, 1), M.stone, T.x, gy + T.h * 0.55 + 0.05, T.z);
    for (let i = 0; i < 4; i++) for (const s of [-1, 1]) { B.add(bbox(0.5, 0.6, 0.3, 0.04, 1), M.stone, T.x + s * (T.w / 2 - 0.2), gy + T.h + 0.1, T.z - T.d / 2 + 0.6 + i * (T.d - 1.2) / 3); }
    for (const s of [-1, 1]) B.add(bbox(0.5, 0.6, 0.3, 0.04, 1), M.stone, T.x, gy + T.h + 0.1, T.z + s * (T.d / 2 - 0.2));
    B.add(bbox(T.w - 0.5, 0.1, T.d - 0.5, 0, 2), M.roof, T.x, gy + T.h - 0.15, T.z);
    for (const zz of [-2.2, 0, 2.2]) for (const s of [-1, 1]) B.add(bbox(0.08, 1.1, 0.3, 0, 1), M.dark, T.x + s * (T.w / 2 + 0.01), gy + T.h * 0.55 + 1.9, T.z + zz);
    for (const zz of [-1.6, 1.6]) B.add(bbox(0.08, 0.8, 0.5, 0, 1), M.dark, T.x - T.w / 2 - 0.01, gy + 2.6, T.z + zz);
    B.add(bbox(0.3, 2.1, 1.2, 0, 1), M.dark, T.x - T.w / 2 + 0.1, gy + 1.05, T.z - 1.5);
    B.add(bbox(0.08, 2.0, 1.1, 0, TILE.planks), M.darkWood, T.x - T.w / 2 - 0.02, gy + 1.0, T.z - 1.5);
    B.add(bbox(0.3, 0.26, 1.6, 0, 1), M.grey, T.x - T.w / 2 - 0.05, gy + 2.22, T.z - 1.5);
    for (const s of [-1, 1]) B.add(bbox(0.3, 2.3, 0.26, 0, 1), M.grey, T.x - T.w / 2 - 0.05, gy + 1.1, T.z - 1.5 + s * 0.72);
    B.add(bbox(0.9, 0.16, 1.9, 0, 1), M.stone, T.x - T.w / 2 - 0.4, gy + 0.03, T.z - 1.5);
    col({ type: 'box', x: T.x, z: T.z, hw: T.w / 2, hd: T.d / 2, top: gy + T.h + 0.5 });
    shut('s28', T.x - T.w / 2, gy, T.z - 1.5, -Math.PI / 2, 1.0);
    fitAdd({ region: 'desert', name: 'tower s28', x: W(T.x, T.z).x, z: W(T.x, T.z).z, ry: 0, oy: gy, w: T.w, d: T.d, base: low - gy, plinth: 0.1, floor: 0.02, steps: 0.6, openings: [{ side: 'left', kind: 'door', x0: -2.3, x1: -0.7, y0: 0, y1: 2.4 }] });
  }
  // the house of body 49, north of the pool, its door to the south
  adobe({ name: 'house b49', x: -47.8, z: -76.9, w: 7.46, d: 7.71, h: 4.64, ry: 0, tint: '#f0c898', shutter: '#2f7a9a', door: { side: 'front', u: -1.2 }, shut: true,
    windows: [{ side: 'front', u: 1.6 }, { side: 'front', u: 1.8, up: true }, { side: 'front', u: -1.4, up: true }, { side: 'right', u: -1.5 }, { side: 'right', u: 1.2, up: true }, { side: 'left', u: 0.8, up: true }] });
  for (const [x, z] of [[-55.7, -73.9], [-58.1, -74.1]]) { const g = H(x, z); B.add(lathe([[0.01, 0], [0.26, 0.05], [0.34, 0.4], [0.2, 0.75], [0.17, 0.86], [0.2, 0.92]], 12, 0), pm('#c86a3a', 0.85), x, g, z); col({ type: 'cyl', x, z, r: 0.35, top: g + 0.9, noStand: true, seeThrough: true }); }
  // the two standing figures on the knolls west of the village (bodies 0 and 33), looking out over the beach
  stoneFigure(-117.8, -31.9, Math.PI / 2, 5.18, M.grey);
  stoneFigure(-83.3, -31.9, Math.PI * 0.75, 5.18, M.grey);

  // ================================================================ north of the post: the twin pillars and the old corral
  {
    const fg0 = hornedPillar(55.7, -54.1, Math.PI / 2, 5.15); void fg0;
    hornedPillar(51.4, -54.5, Math.PI / 2, 5.15);
    figure(55.7, -54.1); figure(51.4, -54.5);
    for (const [x, z, ry] of [[55.3, -52.6, 0], [54.0, -51.4, Math.PI / 2], [51.8, -51.6, Math.PI / 2]]) lowWall(x, z, 2.12, ry, 1.4, M.stone);
    // the fences (bodies 78) on the original's lines: along z (turn 0/180) and along x (90/270), the gate (84) left open
    const NS = [[43.6, -57.0], [60.6, -55.6], [43.9, -60.3], [44.2, -63.5], [44.4, -66.8], [44.7, -70.0], [45.0, -73.3], [45.3, -76.5], [45.6, -79.8], [64.1, -58.6], [64.4, -61.8], [64.6, -65.1], [64.9, -68.3], [61.9, -71.9], [62.2, -75.1], [62.5, -78.4], [62.8, -81.6], [63.1, -84.9], [54.5, -68.7], [54.2, -65.4], [53.9, -62.2]];
    const EW = [[44.8, -55.0], [62.5, -56.8], [63.2, -69.9], [46.7, -71.2], [50.0, -70.9], [53.2, -70.7], [51.9, -60.9], [48.7, -61.2]];
    for (const [x, z] of NS) rail(x, z, 3.24, Math.PI / 2);
    for (const [x, z] of EW) rail(x, z, 3.24, 0);
    { const g = H(45.7, -61.5); for (const s of [-1, 1]) { B.add(cyl(0.08, 0.09, 1.5, 7), M.darkWood, 45.7, g + 0.7, -61.5 + s * 1.5); } B.add(bbox(0.08, 0.08, 2.84, 0, 1), M.wood, 45.0, g + 1.0, -61.5, 0, 0, 0.35); }   // the gate, swung open
    trough(48.1, -54.8, Math.PI / 2); trough(59.0, -53.7, Math.PI / 2); trough(49.6, -67.5, 0, 2.6);
    // the water tank on posts (body 83) and the lean-to (85–90)
    { const x = 49.4, z = -65.0, g = H(x, z); for (const [dx, dz] of [[-0.9, -1.1], [0.9, -1.1], [0.9, 1.1], [-0.9, 1.1]]) B.add(cyl(0.09, 0.1, 3.0, 6), M.darkWood, x + dx, g + 1.5, z + dz); B.add(cyl(1.1, 1.1, 1.7, 16, 1.5, false), tm('planks', { color: '#b88a5a' }), x, g + 3.85, z); for (const y of [3.2, 4.5]) B.add(new THREE.TorusGeometry(1.12, 0.04, 6, 24).rotateX(Math.PI / 2), M.iron, x, g + y, z); col({ type: 'box', x, z, hw: 1.2, hd: 1.3, top: g + 5.0, noStand: true, seeThrough: true }); }
    { const x = 60.0, z = -75.2, g = H(x, z); for (const [dx, dz] of [[-1.7, -1.0], [1.7, -1.0], [-1.7, 1.0], [1.7, 1.0]]) B.add(cyl(0.08, 0.09, 2.4, 6), M.darkWood, x + dx, g + 1.2, z + dz); B.add(bbox(4.1, 0.1, 2.6, 0, 1), M.plank, x, g + 2.42, z, 0.12, 0, 0); B.add(bbox(4.3, 2.3, 0.25, 0.05, 2.2), M.adobe('#e6b07e'), x, g + 1.15, z + 1.15); col({ type: 'box', x, z: z + 1.15, hw: 2.15, hd: 0.15, top: g + 2.3, noStand: true, seeThrough: true }); }
    C.palm(56.1, -80.9, 1.0, 1.4); C.palm(60.4, -82.9, 0.9, 3.1); C.palm(49.2, -74.4, 1.05, 0.2);
  }

  // ================================================================ the north-east: the walled compound S24
  {
    const a = adobe({ name: 'compound house 94', x: 40.2, z: -119.3, w: 6.69, d: 7.43, h: 4.64, ry: Math.PI / 2, tint: '#e2a878', shutter: '#2f7a9a', door: { side: 'front', u: 0.4 }, shut: true,
      windows: [{ side: 'front', u: -2.0 }, { side: 'front', u: -1.8, up: true }, { side: 'front', u: 1.9, up: true }, { side: 'back', u: 1.4 }, { side: 'back', u: -1.6, up: true }] });
    adobe({ name: 'compound house 95', x: 52.4, z: -118.2, w: 4.46, d: 7.43, h: 3.72, ry: -Math.PI / 2, tint: '#f2d2a8', shutter: '#e8b84a', door: { side: 'front', u: 0.3 }, shut: true,
      windows: [{ side: 'front', u: -2.0 }, { side: 'back', u: 1.6 }, { side: 'back', u: -1.6 }] });
    // the walls joining them round the yard (bodies 98, 99), the well in the yard (100), its door toward the south (S24)
    for (const z of [-122.2, -115.2]) lowWall((43.5 + 50.2) / 2, z, 50.2 - 43.5 - 0.1, 0, 2.6, M.adobe('#e6b07e'));
    { const x = 45.9, z = -119.0, g = a.gy; B.add(cyl(1.0, 1.1, 0.9, 14, 1.5), M.stone, x, g + 0.45, z); B.add(cyl(0.72, 0.72, 0.2, 14, 0), M.dark, x, g + 0.85, z); for (const s of [-1, 1]) B.add(cyl(0.07, 0.07, 2.2, 6), M.darkWood, x + s * 0.9, g + 1.1, z); B.add(bbox(2.1, 0.12, 0.3, 0, 1), M.darkWood, x, g + 2.2, z); col({ type: 'cyl', x, z, r: 1.1, top: g + 0.9, noStand: true }); }
    { const g = H(53.9, -122.4); shut('compound-s', 53.9, g, -121.9 - 0.05, Math.PI, 1.0); B.add(bbox(1.3, 2.1, 0.3, 0, 1), M.dark, 53.9, g + 1.05, -121.9 - 0.08); B.add(bbox(1.2, 2.0, 0.08, 0, TILE.planks), M.darkWood, 53.9, g + 1.0, -121.9 - 0.22); B.add(bbox(1.6, 0.16, 0.4, 0, 1), M.wood, 53.9, g + 2.18, -121.9 - 0.2); }
    for (const [x, z, ry] of [[36.5, -125.0, 0], [55.2, -112.6, 0]]) hornedPillar(x, z, ry, 4.25);
    C.palm(47.0, -126.8, 1.0, 0.9); C.palm(43.2, -112.0, 1.05, 2.0); C.palm(59.0, -122.5, 0.95, 4.1); C.palm(41.4, -127.1, 0.9, 1.6); C.palm(49.7, -108.5, 1.0, 5.0);
    for (const [x, z] of [[51.4, -123.0], [64.9, -116.1]]) { const g = H(x, z); B.add(bbox(0.95, 0.95, 0.95, 0.04, 1), M.plank, x, g + 0.48, z, 0, 0.4, 0); col({ type: 'box', x, z, hw: 0.5, hd: 0.5, top: g + 0.95 }); }
  }

  // ================================================================ the gateway over the track to the dig (body 64)
  {
    // centred on the track's last leg ((36, 22) → (44, 25)): two stone posts 4.5 m either side of its line, the lintel over
    const ax = 36, az = 22, bx = 44, bz = 25, L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
    const t = ((43.0 - ax) * ux + (26.3 - az) * uz), cx = ax + ux * t, cz = az + uz * t, ry = -Math.atan2(uz, ux);
    const ph = 7.0, g = Math.max(H(cx + uz * 4.5, cz - ux * 4.5), H(cx - uz * 4.5, cz + ux * 4.5));
    for (const s of [-1, 1]) {
      const px = cx - uz * s * 4.5, pz = cz + ux * s * 4.5, pg = H(px, pz);
      B.add(bbox(1.1, ph + 0.4 + (g - pg), 1.1, 0.06, TILE.stone), M.stone, px, pg - 0.4 + (ph + 0.4 + (g - pg)) / 2, pz, 0, ry, 0);
      B.add(bbox(1.4, 0.3, 1.4, 0.04, 1), M.grey, px, pg + 0.1, pz, 0, ry, 0);
      B.add(bbox(1.35, 0.4, 1.35, 0.04, 1), M.grey, px, g + ph - 0.2, pz, 0, ry, 0);
      col({ type: 'box', x: px, z: pz, hw: 0.6, hd: 0.6, rot: ry, top: g + ph + 1.4 });
    }
    B.add(bbox(8.99 + 1.4, 1.42, 0.6, 0.05, TILE.stone), M.stone, cx, g + ph + 0.71, cz, 0, ry + Math.PI / 2, 0);
    B.add(bbox(8.99 + 1.8, 0.3, 0.9, 0.04, 1), M.grey, cx, g + ph + 1.52, cz, 0, ry + Math.PI / 2, 0);
    for (let k = -3; k <= 3; k++) B.add(cached('w80d-star8', () => new THREE.CircleGeometry(0.42, 8)), M.grey, cx - uz * 0 + ux * k * 1.3, g + ph + 0.7, cz + uz * k * 1.3, 0, ry + Math.PI / 2, 0);
    R.gateway = W(cx, cz);
  }

  // ================================================================ the hut on the north-west plateau (S113)
  // (on the plateau's west brink: its floor between the plateau and the slope below, on a plinth down the slope, its door at the
  //  south wall's east end where the ground meets the floor)
  adobe({ name: 'hut s113', x: -115.3, z: -99.6, w: 6.08, d: 5.14, h: 2.36, ry: 0, gy: 4.6, tint: '#f2d2a8', shutter: '#c84a3a', door: { side: 'front', u: 2.1 }, shut: true, windows: [{ side: 'right', u: 0.6 }, { side: 'back', u: -1.4 }] });

  // ================================================================ small things where the original's cells are fuller than ours
  // (docs/WORLD_SIMILARITY.md, the objects part): water jars at the big houses' doors and under the compound's walls,
  // Hesk's spare gear by his berth, a palm grove with its rocks on the south-west shore where the School's mesa stood,
  // barrels and sacks in the corral, jars by Kesh's south houses. Each a collider of its kind (a jar or a crate stops
  // him; a sack is stepped over).
  const jar = (x, z, c = '#c86a3a', k = 1) => { const g = H(x, z); B.add(lathe([[0.01, 0], [0.26, 0.05], [0.34, 0.4], [0.2, 0.75], [0.17, 0.86], [0.2, 0.92]], 12, 0), pm(c, 0.85), x, g, z, 0, 0, 0, k); col({ type: 'cyl', x, z, r: 0.35 * k, top: g + 0.9 * k, noStand: true, seeThrough: true }); };
  const crate = (x, z, ry, s = 0.8) => { const g = H(x, z); B.add(bbox(s, s, s, 0, 1), M.plank, x, g + s / 2, z, 0, ry, 0); col({ type: 'box', x, z, hw: s / 2, hd: s / 2, rot: ry, top: g + s }); };
  const barrel = (x, z) => { const g = H(x, z); B.add(cyl(0.3, 0.27, 0.86, 12, 1), M.wood, x, g + 0.43, z); for (const hy of [0.16, 0.7]) B.add(cyl(0.305, 0.305, 0.05, 12, 0), M.iron, x, g + hy, z); col({ type: 'cyl', x, z, r: 0.31, top: g + 0.88 }); };
  const sack = (x, z, ry) => { const g = H(x, z); B.add(cached('w80d-sack', () => new THREE.SphereGeometry(0.42, 10, 7).scale(1, 0.62, 0.8)), pm('#d8c49a', 0.95), x, g + 0.24, z, 0, ry, 0); col({ type: 'cyl', x, z, r: 0.4, top: g + 0.45, seeThrough: true }); };
  // S40: jars by its door and along its garden wall, a woodpile and crates in the yard
  for (const [x, z, c] of [[-40.6, -41.2, '#c86a3a'], [-40.6, -36.3, '#d8a050'], [-34.4, -44.2, '#a85030'], [-36.2, -44.3, '#c86a3a'], [-38.0, -44.4, '#d8a050']]) jar(x, z, c);
  crate(-31.2, -41.6, 0.3); crate(-31.3, -40.6, 0.3, 0.7); barrel(-31.0, -36.8); sack(-33.0, -35.2, 0.4); sack(-33.8, -35.6, 1.2);
  // Hesk's berth: spare gear east of the yacht's stop (clear of its lines, the board and the poles)
  for (const [x, z] of [[-13.2, 3.6], [-12.4, 4.3]]) barrel(x, z);
  crate(-14.0, 2.4, 0.2); crate(-13.1, 1.6, 0.2, 0.7); sack(-11.6, 2.8, 0.9);
  { const g = H(-12.6, 0.2); B.add(cyl(0.22, 0.22, 3.6, 8, 1), tm('planks', { color: '#e8d8b8' }), -12.6, g + 0.25, 0.2, 0, 0, Math.PI / 2); col({ type: 'box', x: -12.6, z: 0.2, hw: 1.8, hd: 0.25, top: g + 0.45, seeThrough: true }); }   // (a rolled sail; all of it south of the track and the yacht's lines)
  // the south-west shore where the School's mesa stood: a grove of palms among rocks (the original has its trees there)
  for (const [x, z, s, ry] of [[-70.5, 38.5, 1.0, 0.4], [-66.2, 42.8, 1.1, 2.2], [-73.4, 44.6, 0.9, 1.1], [-68.0, 48.2, 1.0, 3.5], [-62.8, 38.0, 0.95, 5.0]]) C.palm(x, z, s, ry);
  // the corral: barrels and sacks by the troughs
  barrel(50.8, -56.6); barrel(51.6, -57.0); sack(47.2, -57.4, 0.3); sack(48.0, -58.1, 1.5); crate(57.4, -58.2, 0.4); crate(58.3, -58.2, 0.4, 0.7);
  // the compound: jars under the yard walls, a crate stack by the east house
  for (const [x, z, c] of [[44.6, -121.4, '#c86a3a'], [45.4, -121.5, '#d8a050'], [48.8, -115.9, '#a85030'], [49.6, -116.0, '#c86a3a']]) jar(x, z, c, 0.9);
  crate(56.2, -116.4, 0.2); crate(56.3, -115.3, 0.2, 0.7); sack(56.0, -120.6, 0.8);
  // Kesh's south houses: jars at their corners (clear of their doors, the containers and the people's places)
  for (const [x, z, c] of [[-33.0, 12.4, '#d8a050'], [-32.4, 13.2, '#c86a3a'], [-39.4, 18.2, '#a85030'], [-46.6, 19.4, '#d8a050'], [-47.4, 18.6, '#c86a3a']]) jar(x, z, c, 0.9);

  // ================================================================ the islet: its door in the cove's cliff, the figure and the pillar before it
  {
    const x = 119.0, z = -120.8, g = H(118.0, -120.8), ry = -Math.PI / 2;   // (the door faces west over the cove)
    B.add(bbox(0.9, 2.6, 2.4, 0.08, TILE.stone), M.grey, x + 0.2, g + 1.3, z, 0, 0, 0);
    B.add(bbox(0.3, 2.3, 1.4, 0, 1), M.dark, x - 0.3, g + 1.15, z);
    B.add(bbox(0.08, 2.2, 1.3, 0, TILE.planks), M.darkWood, x - 0.45, g + 1.1, z);
    B.add(bbox(0.3, 0.3, 2.0, 0, 1), M.stone, x - 0.4, g + 2.45, z);
    for (const s of [-1, 1]) B.add(bbox(0.3, 2.5, 0.3, 0, 1), M.stone, x - 0.4, g + 1.2, z + s * 0.85);
    B.add(bbox(1.62, 1.5, 1.54, 0.05, 1), M.white, x - 0.1, g + 3.3, z);   // (body 105, over the door)
    col({ type: 'box', x: x + 0.1, z, hw: 0.6, hd: 1.3, top: g + 4.2 });
    shut('islet', x - 0.45, g, z, ry, 1.0);
    stoneFigure(118.3, -122.3, Math.PI * 0.4, 4.55, M.grey);
    hornedPillar(118.2, -119.3, 0, 4.05);
  }
  R.school = W(SCHOOL_SITE.x, SCHOOL_SITE.z);
}
