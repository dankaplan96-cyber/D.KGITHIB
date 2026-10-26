// Four places of LBA1's Hamalayi, rebuilt in our own style inside our own region (docs/WORLD_SIMILARITY.md, "The
// user's decisions": the Hamalayi stays ours and larger, with a few places a LBA1 player would know).
//
// What is read from the user's LBA1 files is numbers only, measured from the collision grids and the actor lists of
// the Hamalayi's exterior scenes (tools/lba2-islands.py reads the grids the same way). A grid cell is 512 units across
// = 0.867 m at Twinsen's 1240 units = 2.1 m, a layer 256 units = 0.434 m. No brick, texture, mesh or text is used:
// every piece below is drawn with our own materials (props-mountain.js MM, props.js MAT) into a Kit, so a place is
// a handful of merged meshes (Kit.flush) and adds no shader program.
//
//   gantry       scene 65: a long, narrow stone causeway on its own, 28 cells (24 m) out over open ground, one cell
//                wide and 4.8 m up, ending in a T with a raised block; at its head an arcade of three piers
//                (3 × 5 cells, 6.1 m) and two lintel spans (4 cells clear, 5.2 m under), 17 cells (14.7 m) long.
//                It is the one piece of that scene a player cannot mistake. Here the platform on the arcade is
//                reached by a stair at its west end, two steps lead down to the deck, and a low parapet runs along
//                the edges (the original had none); the deck is two cells wide instead of one so that it walks.
//   oldGate      scene 69: two square pillars 1 cell across and 11 layers (4.8 m) tall, 5 cells (4.3 m) apart, a
//                lintel between them at 3.5–4.3 m and a block on its middle; a guard stood beside it.
//   rebelCamp    scene 9: the camouflaged Rabbibunny clones (bodies 66, 67) and the camouflaged Sphero (68) of
//                LBA1's catalogue stand together here, round a platform 5 × 8 cells (4.3 × 6.9 m) raised one
//                layer on ramped edges; three blocks 1.3 m high in a triangle on it and a fourth, low one beside
//                them (tents here), the three sentries' spots 1.7–6 m off its edges (snow nests here).
//   waystone     scenes 9, 65 (twice): a stepped plinth, a ring of ramps round one cell that stands 2.2 m above it
//                (a stone with a lit niche here), on a raised pad 4 × 3 cells.
//
// Every builder draws at the kit's current transform (origin on the ground), front facing +z, and returns what the
// region needs: the colliders as local boxes {x, z, hw, hd, top, bottom?, noStand?, see?} (top and bottom above
// the origin's ground) and the footprint zones the random pines and rocks keep out of.
import * as THREE from 'three';
import { MAT, rbox, cyl, sphere, tinted } from './props.js';
import { MM, drift } from './props-mountain.js';

export const CELL = 2.1 / 1240 * 512;     // 0.867 m
export const LAYER = 2.1 / 1240 * 256;    // 0.434 m
const C = CELL, Ly = LAYER;

const GC = new Map();
const cached = (key, make) => { let g = GC.get(key); if (!g) { g = make(); GC.set(key, g); } return g; };
const r3 = (v) => Math.round(v * 1000) / 1000;

// ---------------------------------------------------------------- small geometries (flat-shaded, no bottom)
const _v = (x, y, z) => new THREE.Vector3(x, y, z);
function mesh(key, build) {
  return cached(key, () => {
    const P = [], N = [];
    // a quad (a, b, c, d), turned to face the way of `out` (a vector from the part's middle, roughly outward)
    build((a, b, c, d, out) => {
      const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
      const flip = n.dot(out) < 0;
      const t = flip ? [a, d, c, a, c, b] : [a, b, c, a, c, d];
      if (flip) n.negate();
      for (const v of t) { P.push(v.x, v.y, v.z); N.push(n.x, n.y, n.z); }
    }, (a, b, c, out) => {
      const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).normalize();
      const flip = n.dot(out) < 0;
      const t = flip ? [a, c, b] : [a, b, c];
      if (flip) n.negate();
      for (const v of t) { P.push(v.x, v.y, v.z); N.push(n.x, n.y, n.z); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    return g;
  });
}
// a slab with sloped sides (a ramped edge all round): top tw × td, bottom bw × bd, height h, y from 0
export const frustum = (tw, td, bw, bd, h) => mesh(`fr${r3(tw)},${r3(td)},${r3(bw)},${r3(bd)},${r3(h)}`, (quad) => {
  const tx = tw / 2, tz = td / 2, bx = bw / 2, bz = bd / 2;
  quad(_v(-tx, h, -tz), _v(-tx, h, tz), _v(tx, h, tz), _v(tx, h, -tz), _v(0, 1, 0));
  quad(_v(-bx, 0, bz), _v(bx, 0, bz), _v(tx, h, tz), _v(-tx, h, tz), _v(0, 0.3, 1));
  quad(_v(bx, 0, -bz), _v(-bx, 0, -bz), _v(-tx, h, -tz), _v(tx, h, -tz), _v(0, 0.3, -1));
  quad(_v(bx, 0, bz), _v(bx, 0, -bz), _v(tx, h, -tz), _v(tx, h, tz), _v(1, 0.3, 0));
  quad(_v(-bx, 0, -bz), _v(-bx, 0, bz), _v(-tx, h, tz), _v(-tx, h, -tz), _v(-1, 0.3, 0));
});
// a stair of n steps rising along +x (rise × run each, width w across z), solid underneath, stone cheeks either side
export const stairGeo = (n, w, rise, run) => mesh(`st${n},${r3(w)},${r3(rise)},${r3(run)}`, (quad) => {
  const z0 = -w / 2, z1 = w / 2;
  for (let i = 0; i < n; i++) {
    const x0 = i * run, x1 = x0 + run, y0 = i * rise, y1 = y0 + rise;
    quad(_v(x0, y1, z0), _v(x0, y1, z1), _v(x1, y1, z1), _v(x1, y1, z0), _v(0, 1, 0));            // tread
    quad(_v(x0, y0, z1), _v(x0, y0, z0), _v(x0, y1, z0), _v(x0, y1, z1), _v(-1, 0, 0));           // riser
    quad(_v(x0, 0, z1), _v(x1, 0, z1), _v(x1, y1, z1), _v(x0, y1, z1), _v(0, 0, 1));              // cheeks
    quad(_v(x1, 0, z0), _v(x0, 0, z0), _v(x0, y1, z0), _v(x1, y1, z0), _v(0, 0, -1));
  }
});
// a pup tent: ridge along z, w wide, l long, h high; open at the front (+z) with a dark door triangle
export const tentGeo = (w, l, h) => mesh(`tt${r3(w)},${r3(l)},${r3(h)}`, (quad, tri) => {
  const x = w / 2, z = l / 2;
  quad(_v(-x, 0, -z), _v(-x, 0, z), _v(0, h, z), _v(0, h, -z), _v(-1, 0.5, 0));
  quad(_v(x, 0, z), _v(x, 0, -z), _v(0, h, -z), _v(0, h, z), _v(1, 0.5, 0));
  tri(_v(-x, 0, -z), _v(0, h, -z), _v(x, 0, -z), _v(0, 0.2, -1));
});
export const tentDoor = (w, h) => mesh(`td${r3(w)},${r3(h)}`, (quad, tri) => { tri(_v(-w / 2, 0, 0), _v(w / 2, 0, 0), _v(0, h, 0), _v(0, 0, 1)); });
const bx = (w, h, d) => rbox(r3(w), r3(h), r3(d), 0);          // a plain box, 12 triangles
const rb = (w, h, d, r = 0.05) => rbox(r3(w), r3(h), r3(d), r); // a softly bevelled one (kept for the pieces seen close)
const STONE = () => MM.stone('#d8d0c4');       // the stone of Lhar's houses (the same material, no new program)
const SNOW = () => MM.snow();
const cloth = (k, geo, color, x, y, z, ry = 0, o = {}) => k.add(tinted(geo, color), MM.cloth(), x, y, z, ry, o);

// ================================================================ 1. the gantry (scene 65)
// origin: the arcade's middle on the ground. The arcade runs along z (17 cells), its depth along x (5 cells); the
// causeway leaves the east face (+x) through the opening at z = +2.6 (cell 32 of the scene, the original's column).
export function gantry(k) {
  const W = 17 * C, D = 5 * C, PH = 14 * Ly, LB = 12 * Ly, DECK_TOP = 11 * Ly, DECK_T = 2 * Ly, OPEN = 4 * C, PIER = 3 * C;
  const stone = STONE(), snow = SNOW(), cols = [], zones = [];
  const col = (c) => cols.push(c);
  const DZ = 2.6, DW = 1.8, RUN = 28 * C, XE = D / 2 + RUN;                 // the deck's z and width; its far end
  const piers = [0, 7, 14].map((c) => -W / 2 + c * C + PIER / 2);
  // piers: stone from below the ground to the top, a rubble course at the foot, a proud band, a cornice under the snow
  for (const z of piers) {
    k.add(bx(PIER, PH + 1.2, D), stone, 0, (PH - 1.2) / 2, z);
    k.add(rb(PIER + 0.22, 0.9, D + 0.22, 0.05), stone, 0, 0.35, z);
    k.add(rb(PIER + 0.14, 0.18, D + 0.14, 0.03), stone, 0, 2.9, z);
    k.add(rb(PIER + 0.2, 0.24, D + 0.2, 0.04), stone, 0, PH - 0.12, z);
    col({ x: 0, z, hw: D / 2, hd: PIER / 2, top: PH });
  }
  // lintels over the two openings, with a corbel under each end
  for (const [a, b] of [[0, 1], [1, 2]]) {
    const zc = (piers[a] + piers[b]) / 2, span = piers[b] - piers[a] - PIER;
    k.add(bx(span + 0.3, PH - LB, D), stone, 0, LB + (PH - LB) / 2, zc);
    for (const e of [-1, 1]) k.add(rb(0.5, 0.42, D - 0.5, 0.05), stone, 0, LB - 0.2, zc + e * (span / 2 - 0.2));
    col({ x: 0, z: zc, hw: D / 2, hd: span / 2 + 0.15, top: PH, bottom: LB, see: true });
  }
  // the platform's snow, a parapet round it (gaps for the west stair and the east steps)
  k.add(rb(D + 0.12, 0.12, W + 0.12, 0.03), snow, 0, PH + 0.02, 0);
  const PT = 0.34, PHT = 0.66;
  const parapet = (x, z, w, d) => {
    k.add(rb(w, PHT, d, 0.04), stone, x, PH + PHT / 2, z); k.add(rb(w + 0.04, 0.1, d + 0.04, 0.03), snow, x, PH + PHT + 0.02, z);
    col({ x, z, hw: w / 2, hd: d / 2, top: PH + PHT, bottom: PH - 0.1, noStand: true, see: true });
  };
  for (const e of [-1, 1]) parapet(0, e * (W / 2 - PT / 2), D, PT);                            // the two ends
  const e0 = -W / 2 + PT, e1 = W / 2 - PT;
  const sides = [[-1, [[e0, -1.2], [1.2, e1]]], [1, [[e0, 1.5], [3.7, e1]]]];                  // west, east: the runs between the gaps
  for (const [e, runs] of sides) for (const [z0, z1] of runs) parapet(e * (D / 2 - PT / 2), (z0 + z1) / 2, PT, z1 - z0);
  // the stair up the west face: 12 steps and the platform makes the 13th
  const rise = PH / 13, run = 0.56, N = 12, x0 = -D / 2 - N * run;
  k.add(stairGeo(N, 2.0, rise, run), stone, x0, 0, 0);
  for (let i = 0; i < N; i++) col({ x: x0 + i * run + (N * run - i * run) / 2, z: 0, hw: (N * run - i * run) / 2, hd: 1.0, top: (i + 1) * rise });
  // two steps down from the platform's east edge to the deck, cut into the lintel's east face
  const dRise = (PH - DECK_TOP) / 3;
  for (let i = 0; i < 2; i++) {
    const top = PH - (i + 1) * dRise, xx = D / 2 + i * run + run / 2;
    k.add(rb(run, top - (DECK_TOP - DECK_T), DW, 0.04), stone, xx, (top + DECK_TOP - DECK_T) / 2, DZ);
    col({ x: xx, z: DZ, hw: run / 2, hd: DW / 2, top, bottom: DECK_TOP - DECK_T });
  }
  // the deck: a stone beam on nothing, a strip of snow along it, a low kerb each side
  const dx0 = D / 2 + 2 * run, dl = XE - dx0;
  k.add(rb(dl, DECK_T, DW, 0.05), stone, dx0 + dl / 2, DECK_TOP - DECK_T / 2, DZ);
  k.add(rb(dl, 0.07, DW - 0.5, 0.02), snow, dx0 + dl / 2, DECK_TOP + 0.02, DZ);
  col({ x: dx0 + dl / 2, z: DZ, hw: dl / 2, hd: DW / 2, top: DECK_TOP, bottom: DECK_TOP - DECK_T });
  for (const s of [-1, 1]) {
    const z = DZ + s * (DW / 2 - 0.12);
    k.add(rb(dl, PHT, 0.24, 0.04), stone, dx0 + dl / 2, DECK_TOP + PHT / 2, z);
    k.add(rb(dl, 0.08, 0.28, 0.03), snow, dx0 + dl / 2, DECK_TOP + PHT + 0.02, z);
    col({ x: dx0 + dl / 2, z, hw: dl / 2, hd: 0.12, top: DECK_TOP + PHT, bottom: DECK_TOP - DECK_T, noStand: true, see: true });
  }
  // the T at the end: a bar 2 cells deep, 3 cells across, a column under it to the ground, a block with a lantern
  const TD = 2 * C, TW = 3 * C, tx = XE + TD / 2;
  k.add(rb(TD, DECK_T, TW, 0.05), stone, tx, DECK_TOP - DECK_T / 2, DZ);
  k.add(rb(TD - 0.3, 0.07, TW - 0.3, 0.02), snow, tx, DECK_TOP + 0.02, DZ);
  k.add(bx(C, DECK_TOP - DECK_T + 1.2, C), stone, tx, (DECK_TOP - DECK_T - 1.2) / 2, DZ);
  col({ x: tx, z: DZ, hw: TD / 2, hd: TW / 2, top: DECK_TOP, bottom: DECK_TOP - DECK_T });
  col({ x: tx, z: DZ, hw: C / 2, hd: C / 2, top: DECK_TOP, noStand: true, see: true });
  for (const [x, z, w, d] of [[tx + TD / 2 - 0.12, DZ, 0.24, TW - 0.48], [tx, DZ - TW / 2 + 0.12, TD, 0.24], [tx, DZ + TW / 2 - 0.12, TD, 0.24]]) {
    k.add(rb(w, PHT, d, 0.04), stone, x, DECK_TOP + PHT / 2, z); k.add(rb(w + 0.04, 0.08, d + 0.04, 0.03), snow, x, DECK_TOP + PHT + 0.02, z);
    col({ x, z, hw: w / 2, hd: d / 2, top: DECK_TOP + PHT, bottom: DECK_TOP - DECK_T, noStand: true, see: true });
  }
  const bk = tx + TD / 2 - C / 2 - 0.2;
  k.add(rb(C, C, C, 0.05), stone, bk, DECK_TOP + C / 2, DZ);
  k.add(rb(C + 0.1, 0.1, C + 0.1, 0.03), snow, bk, DECK_TOP + C + 0.02, DZ);
  col({ x: bk, z: DZ, hw: C / 2, hd: C / 2, top: DECK_TOP + C, bottom: DECK_TOP - 0.1, noStand: true, see: true });
  // a lantern on the block: a stone post, a lit glass, a snow cap
  k.add(rb(0.3, 1.0, 0.3, 0.04), stone, bk, DECK_TOP + C + 0.5, DZ);
  k.add(rb(0.3, 0.38, 0.3, 0.04), MM.glow(), bk, DECK_TOP + C + 1.19, DZ);
  k.add(rb(0.42, 0.1, 0.42, 0.03), snow, bk, DECK_TOP + C + 1.43, DZ);
  // a mast at the platform's south end for a line of prayer flags down to the lantern
  const MZ = W / 2 - 0.75;
  k.add(rb(0.3, 3.0, 0.3, 0.04), stone, 0, PH + 1.5, MZ);
  k.add(rb(0.4, 0.1, 0.4, 0.03), snow, 0, PH + 3.03, MZ);
  col({ x: 0, z: MZ, hw: 0.1, hd: 0.1, top: PH + 3, bottom: PH - 0.1, noStand: true, see: true });
  zones.push({ x: 0, z: 0, hw: D / 2 + 1.5, hd: W / 2 + 1.5 }, { x: x0 / 2 - D / 4, z: 0, hw: (D / 2 - x0) / 2 + 1.2, hd: 2.4 }, { x: (D / 2 + tx) / 2, z: DZ, hw: (tx - D / 2) / 2 + 2, hd: 2.6 });
  return {
    colliders: cols, zones, deckTop: DECK_TOP, top: PH, end: { x: tx, z: DZ }, lantern: { x: bk, y: DECK_TOP + C + 1.2, z: DZ },
    mast: { x: 0, y: PH + 3.0, z: MZ },
    stairFoot: { x: x0 - 0.4, z: 0 }, stairTop: { x: -D / 2, z: 0 },
  };
}

// ================================================================ 2. the old gate (scene 69)
// origin: the middle of the opening on the ground, the opening along x (4.3 m clear), the walk through it along z.
export function oldGate(k) {
  const PH = 11 * Ly, CL = 5 * C, LB = 8 * Ly, LT = 10 * Ly, PX = CL / 2 + C / 2;
  const stone = STONE(), snow = SNOW(), cols = [];
  for (const s of [-1, 1]) {
    k.add(rb(C + 0.5, 0.6, C + 0.5, 0.06), stone, s * PX, 0.1, 0);
    k.add(rb(C, PH + 0.5, C, 0.05), stone, s * PX, (PH - 0.5) / 2, 0);
    k.add(rb(C + 0.16, 0.16, C + 0.16, 0.03), stone, s * PX, 1.25, 0);                  // a band at the height of Twinsen's shoulder
    k.add(rb(C + 0.26, 0.2, C + 0.26, 0.04), stone, s * PX, PH + 0.1, 0);               // a capstone
    k.add(rb(C + 0.3, 0.09, C + 0.3, 0.03), snow, s * PX, PH + 0.24, 0);
    cols.push({ x: s * PX, z: 0, hw: C / 2, hd: C / 2, top: PH, noStand: true, see: true });
  }
  k.add(rb(CL - 0.02, LT - LB, C, 0.05), stone, 0, (LT + LB) / 2, 0);                // the lintel, between the pillars
  k.add(rb(CL + 0.34, 0.09, C + 0.06, 0.03), snow, 0, LT + 0.04, 0);
  k.add(rb(C * 0.9, PH - LT, C * 0.9, 0.04), stone, 0, LT + (PH - LT) / 2, 0);   // the block on its middle
  k.add(rb(C, 0.08, C, 0.03), snow, 0, PH + 0.03, 0);
  for (const s of [-1, 1]) k.add(rb(0.34, 0.4, 0.5, 0.05), stone, s * (CL / 2 - 0.2), LB - 0.2, 0);   // brackets under the lintel's ends
  cols.push({ x: 0, z: 0, hw: CL / 2 + 0.15, hd: C / 2, top: LT, bottom: LB - 0.1, see: true });
  return { colliders: cols, zones: [{ x: 0, z: 0, hw: CL / 2 + C + 1.2, hd: 1.8 }], clear: CL, top: PH, lintel: LB, postX: PX };
}

// ================================================================ 3. the rebels' camp (scene 9)
// origin: the middle of the platform on the ground, its long side along z.
const NESTS = [[-1, -6.5], [7, -5.5], [4, -2.5]];   // the three sentries' spots, in cells from the platform's middle (b66, b67, b68)
export function rebelCamp(k) {
  const TW = 5 * C, TD = 8 * C, E = 0.9;
  const stone = STONE(), snow = SNOW(), cols = [], zones = [];
  k.add(frustum(TW, TD, TW + 2 * E, TD + 2 * E, Ly), stone, 0, 0, 0);
  k.add(bx(TW + 2 * E - 0.12, 0.5, TD + 2 * E - 0.12), stone, 0, -0.25, 0);
  cols.push({ x: 0, z: 0, hw: TW / 2 + E * 0.35, hd: TD / 2 + E * 0.35, top: Ly });
  // snow lying in the edges of the platform's ramps
  [[-TW / 2 - 0.7, 1.0, 3.0, 0.5, 1.4, 1.6, 1], [TW / 2 + 0.9, -1.4, 2.6, 0.45, 1.3, 1.5, 2], [0.3, TD / 2 + 0.9, 2.6, 0.4, 1.2, 0.05, 3], [-0.8, -TD / 2 - 0.8, 2.8, 0.45, 1.3, -0.1, 0]].forEach(([x, z, l, h, d, ry, sd]) => drift(k, x, -0.08, z, l, h, d, ry, sd));
  // the three tents (the original's blocks 1.3 m high stood at cells (27,14) (29,14) (28,16); the fourth, 0.4 m, at (29,16)):
  // snow-white canvas with camouflage patches, a dark door, ridge poles
  const tents = [[-C, -2.5 * C, 0.05], [C, -2.5 * C, -0.05], [0, -0.5 * C, 0.02]];
  const patch = ['#9aa6b8', '#8d8a80', '#b4bcc8'];
  tents.forEach(([x, z, ry], i) => {
    k.at(x, Ly, z, ry, () => {
      cloth(k, tentGeo(1.35, 1.6, 1.3), '#eef2f8', 0, 0, 0);
      cloth(k, tentDoor(0.9, 1.0), '#2a2e38', 0, 0.0, 0.8 + 0.01);
      for (const s of [-1, 1]) {
        cloth(k, bx(0.46 + i * 0.05, 0.03, 0.5), patch[(i + (s > 0 ? 1 : 0)) % 3], s * 0.34, 0.67, -0.35, 0, { rz: -s * Math.atan2(1.3, 0.675) });
        cloth(k, bx(0.3, 0.03, 0.36), patch[(i + 2 + (s > 0 ? 1 : 0)) % 3], s * 0.2, 0.93, 0.28, 0, { rz: -s * Math.atan2(1.3, 0.675) });
      }
    });
    cols.push({ x, z, hw: 0.7, hd: 0.82, top: Ly + 1.3, noStand: true, see: true });
  });
  // the low one: a stack of supply sacks under a snow-white cloth
  k.add(rb(0.8, 0.5, 0.8, 0.12), SNOW(), C, Ly + 0.25, -0.5 * C + 1.3);
  cloth(k, rb(0.84, 0.18, 0.84, 0.05), '#a8b2c2', C, Ly + 0.46, -0.5 * C + 1.3);
  cols.push({ x: C, z: -0.5 * C + 1.3, hw: 0.42, hd: 0.42, top: Ly + 0.55, noStand: true, see: true });
  // the sentries' snow nests: a crescent of snow blocks open toward the platform
  const nests = NESTS.map(([cx, cz]) => {
    const x = cx * C, z = cz * C, a0 = Math.atan2(-x, -z);     // the way to the middle of the platform
    for (let i = 0; i < 7; i++) {
      const a = a0 + (i - 3) * 0.5 + Math.PI, r = 0.95, bxx = x + Math.sin(a) * r, bzz = z + Math.cos(a) * r, h = 0.46 + (i % 3) * 0.07;
      k.add(rb(0.62, h, 0.42, 0.08), snow, bxx, h / 2 - 0.02, bzz, a + (i % 2 ? 0.08 : -0.06));
    }
    zones.push({ x, z, hw: 1.5, hd: 1.5 });
    return { x, z };
  });
  zones.push({ x: 0, z: 0, hw: TW / 2 + E + 1.2, hd: TD / 2 + E + 1.2 });
  return { colliders: cols, zones, nests, top: Ly };
}

// ================================================================ 4. the waystone (scenes 9 and 65)
// origin: the middle of the plinth on the ground.
export function waystone(k) {
  const stone = STONE(), snow = SNOW(), cols = [];
  const PW = 4 * C, PD = 3 * C, H1 = 2 * Ly, H2 = Ly, SH = 5 * Ly;
  k.add(frustum(PW, PD, PW + 0.9, PD + 0.9, H1), stone, 0, 0, 0);
  k.add(bx(PW + 0.8, 0.5, PD + 0.8), stone, 0, -0.25, 0);
  k.add(frustum(1.9, 1.9, 2.6, 2.6, H2), stone, 0, H1, 0);
  k.add(rb(C, SH, C, 0.05), stone, 0, H1 + H2 + SH / 2, 0);
  k.add(rb(C + 0.2, 0.18, C + 0.2, 0.04), stone, 0, H1 + H2 + SH + 0.09, 0);
  k.add(rb(C + 0.28, 0.1, C + 0.28, 0.03), snow, 0, H1 + H2 + SH + 0.2, 0);
  // the niche on the stone's face: a lit window with a stone sill
  k.add(rb(0.4, 0.5, 0.06, 0.02), MM.glow(), 0, H1 + H2 + SH * 0.62, C / 2 + 0.01);
  k.add(rb(0.52, 0.08, 0.14, 0.02), stone, 0, H1 + H2 + SH * 0.62 - 0.3, C / 2 + 0.05);
  [[-PW / 2 - 0.5, 0.2, 2.2, 0.45, 1.2, 0.3, 1], [PW / 2 + 0.6, -0.5, 2.0, 0.4, 1.1, -0.2, 2]].forEach(([x, z, l, h, d, ry, sd]) => drift(k, x, -0.08, z, l, h, d, ry, sd));
  cols.push({ x: 0, z: 0, hw: PW / 2 + 0.45, hd: PD / 2 + 0.45, top: Ly });               // (two low stages, each within a step)
  cols.push({ x: 0, z: 0, hw: PW / 2 - 0.1, hd: PD / 2 - 0.1, top: H1 });
  cols.push({ x: 0, z: 0, hw: C / 2 + 0.55, hd: C / 2 + 0.55, top: H1 + H2 });
  cols.push({ x: 0, z: 0, hw: C / 2, hd: C / 2, top: H1 + H2 + SH, noStand: true, see: true });
  return { colliders: cols, zones: [{ x: 0, z: 0, hw: PW / 2 + 1.5, hd: PD / 2 + 1.5 }], top: H1 + H2 + SH };
}
