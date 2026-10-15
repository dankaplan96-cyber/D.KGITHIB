// Zeelich places of our own (ZL-ALL, "invent new places"; not in LBA2). Each is a layout in the same numbers-only
// form as the original's islands (assets/lba2/islands/*.json: heights in cm on a 1.7122 m grid, objects as
// [x, z, bottom y, size x, size y, size z, turn 0..4095, kind, body]), so src/game/zislands.js builds, plans,
// dresses and edges it exactly like Otringal or Knartas. Shapes are made from rounded outlines, domes, cliffs and
// curved ramps (no boxes): the ground is a sum of smooth pieces, sampled on the grid.
//
//   tralu     Tralu Rock — an Esmer trading post on a tall rock: the market on its crown, a quay shelf below where
//             the cloud skiffs tie up, a ramp curving round the rock's south face between them.
//   orchard   The Nectar Orchard — a broad rounded hill of nectar trees in rows along its contours, a press
//             house at its foot, a cloud-catcher on the crown; the north side breaks off in a cliff.
//   oldwatch  The Old Watch — a crescent ridge with a ruined watchtower on its north horn (older than the
//             council), fallen stones along the crest, and an old telescope on the south horn looking out.
//
// placeLayout(name) → the layout object (or null); PLACES lists the names; TRALU/ORCHARD/OLDWATCH hold the
// numbers their dressing (zislands.js STYLE) needs. Pure numbers: runs in node too.
import { rng } from '../engine/math.js';

export const PLACES = ['tralu', 'orchard', 'oldwatch'];
const CELL = 1.7122;
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
// a wobbly outline: radius at angle a (a few low harmonics, seeded)
const lobes = (seed, R, amp = 0.12, n = 4) => {
  const r = rng(seed), H = [];
  for (let k = 2; k < 2 + n; k++) H.push([k, (r() * 2 - 1) * amp / (k - 1), r() * Math.PI * 2]);
  return (a) => R * (1 + H.reduce((s, [k, m, p]) => s + m * Math.sin(k * a + p), 0));
};
// soft undulation (metres), a few crossed sines
const bumps = (seed, amp, scale) => { const r = rng(seed), P = []; for (let i = 0; i < 5; i++) P.push([r() * 6.28, r() * 6.28, (0.6 + r()) / scale]); return (x, z) => amp * P.reduce((s, [a, b, f]) => s + Math.sin(x * f + a) * Math.sin(z * f * 0.8 + b), 0) / P.length; };

// an object of ours in the original's form; its bottom (null) is set to the lowest ground under it
const obj = (x, z, sx, sy, sz, kind, body, turn = 0, y = null) => [+x.toFixed(2), +z.toFixed(2), y, sx, sy, sz, turn, kind, body];
function sample(name, n, hf, decor, note) {
  const half = ((n - 1) * CELL) / 2, heights = new Array(n * n);
  let maxH = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const h = hf(-half + i * CELL, -half + j * CELL);
    const v = h == null || h < 0.12 ? -600 : Math.round(h * 100);
    heights[j * n + i] = v; if (v > 0) maxH = Math.max(maxH, v / 100);
  }
  for (const o of decor) if (o[2] == null) {
    let lo = 1e9;
    for (const [a, b] of [[0, 0], [-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) { const h = hf(o[0] + a * o[3], o[1] + b * o[5]); if (h != null && h > 0.2) lo = Math.min(lo, h); }
    o[2] = lo < 1e8 ? +(lo - 0.05).toFixed(2) : 0.3;
  }
  return { name, size: [+(n * CELL).toFixed(1), +(n * CELL).toFixed(1)], cell: CELL, nx: n, nz: n, maxH, heights, decor, ours: true, note };
}

// ================================================================== Tralu Rock: the trading post
export const TRALU = { TOP: 12.2, QUAY: 2.4, ramp: { r: 21.0, hw: 3.3, a0: 0.3, a1: 2.6 }, quayA: -0.3 };
function tralu() {
  const { TOP, QUAY, ramp } = TRALU, rTop = lobes(31, 15.8, 0.08), rOut = lobes(37, 28, 0.06), top = bumps(5, 0.35, 6);
  const hf = (x, z) => {
    const r = Math.hypot(x, z), a = Math.atan2(z, x);   // (a = 0 east, + toward the south)
    // the rock: a rounded crown, its sides a cliff
    const rt = rTop(a), crown = TOP + top(x, z) - (r / rt) ** 4 * 0.6;
    let h = r <= rt ? crown : crown - (r - rt) * 4.2;
    // the landing at the ramp's head joins the crown
    for (const rr of [ramp.r, ramp.r - 3.0, ramp.r - 6.0]) {
      const hx = Math.cos(ramp.a1 + 0.08) * rr, hz = Math.sin(ramp.a1 + 0.08) * rr, hd = Math.hypot(x - hx, z - hz);
      if (hd < 5.0) h = Math.max(h, TOP - 0.2 - ss(3.6, 5.0, hd) * 30);
    }
    // the quay: a crescent shelf on the east side, low over the clouds
    const qa = Math.abs(angDiff(a, TRALU.quayA)), qOut = rOut(a) * 0.98;
    if (qa < 1.05 && r > rt + 1.5 && r < qOut) h = Math.max(h, QUAY + 0.15 * Math.sin(x * 0.4) - ss(0.85, 1.05, qa) * 6);
    // the ramp round the south face: a shelf rising from the quay to the crown (gentle: ≈ 0.25)
    if (a > ramp.a0 - 0.45 && a < ramp.a1 + 0.1) {
      const t = ss(ramp.a0, ramp.a1, a) * 0.6 + Math.min(1, Math.max(0, (a - ramp.a0) / (ramp.a1 - ramp.a0))) * 0.4;
      const rh = QUAY + (TOP - 0.25 - QUAY) * t, d = Math.abs(r - ramp.r);
      // (inward the shelf runs flat to the cliff's foot, no trench; outward it breaks off over the clouds)
      if (r < ramp.r && r > rt - 1) h = Math.max(h, rh);
      else if (d < ramp.hw + 1.2) h = Math.max(h, rh - ss(ramp.hw, ramp.hw + 1.2, d) * 20);
    }
    if (r > rOut(a) && h < TOP - 1) h = Math.min(h, -1);   // (the sea beyond the outline)
    return h;
  };
  const D = [
    obj(-3.0, -8.2, 7.6, 7.4, 6.2, 'building', 901),          // the trading house (domed)
    obj(7.0, 9.6, 3.8, 3.4, 3.4, 'building', 903),            // the clerk's office
    obj(-12.6, -5.2, 2.6, 8.2, 2.6, 'building', 904),          // the lookout tower (west rim)
    obj(22.6, -11.4, 5.4, 4.0, 4.0, 'building', 905),          // the quay's warehouse
  ];
  return sample('tralu', 53, hf, D, 'Ours (not LBA2): Tralu Rock, an Esmer trading post. Generated layout numbers (src/game/zplaces.js).');
}

// ================================================================== the Nectar Orchard
export const ORCHARD = { CROWN: 9.5, rows: [11, 16.5, 22, 27.5], paths: [Math.PI / 2, -Math.PI / 2 + 0.2, 0.15, Math.PI - 0.1], terrace: { x: -19.4, z: 2.0 } };
function orchard() {
  const R = lobes(53, 36, 0.1, 5), { CROWN } = ORCHARD, wob = bumps(9, 0.45, 5);
  const base = (x, z) => {
    const r = Math.hypot(x, z), a = Math.atan2(z, x), Rr = R(a), u = r / Rr;
    if (u > 1.0) return null;
    // a rounded hill (gentle everywhere), a short shore at its foot
    let h = 0.6 + CROWN * Math.max(0, 1 - u * u) ** 1.15 + wob(x, z) * (1 - u);
    h -= ss(0.93, 1.0, u) * 0.5;
    // the north side breaks off: a cliff over the clouds
    const cut = -Rr * 0.62;
    if (z < cut) h -= (cut - z) * 3.4;
    return h;
  };
  // the landing: a level shelf cut into the west slope where the path climbs (the shuttle comes down there)
  const T = ORCHARD.terrace, Th = base(T.x, T.z);
  const hf = (x, z) => { const h = base(x, z); if (h == null) return h; const d = Math.hypot(x - T.x, z - T.z); return d < 9 ? h + (Th - h) * ss(9, 6, d) : h; };
  const D = [
    obj(4.0, 27.5, 7.0, 6.6, 5.4, 'building', 921),             // the press house (south foot)
    obj(-6.8, 28.6, 3.4, 3.0, 3.0, 'building', 922),            // its store
  ];
  // nectar trees in rows along the contours (rings round the crown), gaps where the paths climb the hill
  const r = rng(77);
  ORCHARD.rows.forEach((rad, ri) => {
    const n = Math.round(rad * 0.9);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + ri * 0.21;
      if (ORCHARD.paths.some((p) => Math.abs(angDiff(a, p)) < 2.6 / rad)) continue;
      const x = Math.cos(a) * rad, z = Math.sin(a) * rad;
      if (z < -R(a) * 0.62 + 3 || Math.hypot(x - ORCHARD.terrace.x, z - ORCHARD.terrace.z) < 8) continue;
      const s = 1.9 + r() * 0.7;
      D.push(obj(x, z, s * 0.6, s * 1.55, s * 0.6, 'tall', 940 + (k % 2), Math.round(r() * 4095)));
    }
  });
  return sample('orchard', 57, hf, D, 'Ours (not LBA2): the Nectar Orchard. Generated layout numbers (src/game/zplaces.js).');
}

// ================================================================== the Old Watch: the ruin on the crescent
export const OLDWATCH = { C: { x: 7, z: 0 }, ARC: 17.5, A: 2.0, terrace: 4.6 };
// a point on the crescent's spine: s 0 (the north horn) … 1 (the south horn), off metres outward
// (the spine bends: its radius swells and shrinks along it, so the crescent isn't a drawn circle)
const spineR = (s) => OLDWATCH.ARC * (1 + 0.16 * Math.sin(s * Math.PI * 1.6 + 0.4) - 0.07 * Math.cos(s * Math.PI * 3.1));
export const watchAt = (s, off = 0) => { const { C, A } = OLDWATCH, phi = -A + s * 2 * A, rr = spineR(s) + off; return { x: C.x - Math.cos(phi) * rr, z: C.z + Math.sin(phi) * rr }; };
function oldwatch() {
  const { C, A } = OLDWATCH, wob = bumps(17, 1.3, 3.5), fine = bumps(23, 0.4, 2);
  // the crescent opens to the east: its spine is an arc round C through the west, from the north horn to the south
  const hf = (x, z) => {
    const dx = x - C.x, dz = z - C.z, r = Math.hypot(dx, dz), phi = Math.atan2(dz, -dx);   // (phi 0 at the west)
    const s = Math.max(0, Math.min(1, (phi + A) / (2 * A)));   // 0 at the north horn … 1 at the south
    const R = spineR(s);
    let d;
    if (Math.abs(phi) <= A) d = Math.abs(r - R);
    else { const t = watchAt(phi < 0 ? 0 : 1); d = Math.hypot(x - t.x, z - t.z); }
    // the horns swell into knolls: the tower's on the north, the telescope's on the south
    const W = 6.0 + 1.6 * Math.sin(s * Math.PI) + 3.6 * Math.exp(-(((s - 0.06) / 0.11) ** 2)) + 2.8 * Math.exp(-(((s - 0.94) / 0.09) ** 2)) + wob(x * 0.6, z * 0.6);
    // the outer side drops in a cliff; the inner side runs out in a long gentle slope to a cove (wider)
    const outer = r > R && Math.abs(phi) <= A, Wi = outer ? W : W * (1.45 + 0.25 * Math.sin(s * 9.0));
    if (d > Wi) return null;
    // the crest: a level knoll on the north horn (the tower), a saddle, a rounded south horn (the telescope)
    const crest = 4.0 + 3.6 * Math.min(1, (1 - s) / 0.85) ** 1.4 + 1.0 * Math.sin(s * Math.PI) ** 2 + fine(x, z);
    const h = crest - (outer ? ss(W * 0.55, W, d) * (crest + 2) : ss(W * 0.3, Wi, d) * (crest - 0.6));
    // the old landing terrace: a level shelf on the inner slope at the crescent's middle (the shuttle lands there)
    const T = watchAt(0.5, -4.0), td = Math.hypot(x - T.x, z - T.z);
    return td < 9.5 ? Math.max(h, 0.3) + (OLDWATCH.terrace - Math.max(h, 0.3)) * ss(9.5, 6.0, td) : h;
  };
  const D = [];
  // fallen blocks of the old wall along the crest, seeded
  const r = rng(91);
  for (let k = 0; k < 9; k++) { const p = watchAt(0.2 + k * 0.075, (r() - 0.5) * 5); D.push(obj(p.x, p.z, 0.9 + r() * 0.8, 0.55 + r() * 0.4, 0.8 + r() * 0.8, 'prop', 960 + (k % 3), Math.round(r() * 4095))); }
  return sample('oldwatch', 45, hf, D, 'Ours (not LBA2): the Old Watch, a ruined watch platform. Generated layout numbers (src/game/zplaces.js).');
}

const MAKE = { tralu, orchard, oldwatch };
export function placeLayout(name) { return MAKE[name] ? MAKE[name]() : null; }
