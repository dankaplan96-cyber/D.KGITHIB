// Two places of LBA1's Hamalayi (DECLUTTER, 3.11.2026: the gantry and the rebels' camp were cut), rebuilt in our own style inside our own region (docs/WORLD_SIMILARITY.md, "The
// user's decisions": the Hamalayi stays ours and larger, with a few places a LBA1 player would know).
//
// What is read from the user's LBA1 files is numbers only, measured from the collision grids and the actor lists of
// the Hamalayi's exterior scenes (tools/lba2-islands.py reads the grids the same way). A grid cell is 512 units across
// = 0.867 m at Twinsen's 1240 units = 2.1 m, a layer 256 units = 0.434 m. No brick, texture, mesh or text is used:
// every piece below is drawn with our own materials (props-mountain.js MM, props.js MAT) into a Kit, so a place is
// a handful of merged meshes (Kit.flush) and adds no shader program.
//
//   oldGate      scene 69: two square pillars 1 cell across and 11 layers (4.8 m) tall, 5 cells (4.3 m) apart, a
//                lintel between them at 3.5–4.3 m and a block on its middle; a guard stood beside it.
//   waystone     scenes 9, 65 (twice): a stepped plinth, a ring of ramps round one cell that stands 2.2 m above it
//                (a stone with a lit niche here), on a raised pad 4 × 3 cells.
//
// Every builder draws at the kit's current transform (origin on the ground), front facing +z, and returns what the
// region needs: the colliders as local boxes {x, z, hw, hd, top, bottom?, noStand?, see?} (top and bottom above
// the origin's ground) and the footprint zones the random pines and rocks keep out of.
import * as THREE from 'three';
import { rbox } from './props.js';
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
const bx = (w, h, d) => rbox(r3(w), r3(h), r3(d), 0);          // a plain box, 12 triangles
const rb = (w, h, d, r = 0.05) => rbox(r3(w), r3(h), r3(d), r); // a softly bevelled one (kept for the pieces seen close)
const STONE = () => MM.stone('#d8d0c4');       // the stone of Lhar's houses (the same material, no new program)
const SNOW = () => MM.snow();

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
