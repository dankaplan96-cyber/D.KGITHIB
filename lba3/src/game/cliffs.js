// Faceted rock faces along the terrace edges, as on LBA2's Citadel Island: the heightfield gives the cliffs
// their shape and collision, but at its 0.9 m resolution the faces are smooth stretched slopes. Here each
// stretch of cliff gets a row of angular rocks, embedded in the slope and textured with the stratified cliff rock.
// Visual only: collision stays on the terrain, and the rocks sit inside the slope except for some relief.
//
// ROCKS-1 (the user, 2.11: "hollow rocks", "in general, too square"): each rock is a closed solid (a back and a
// bottom: the sea cliffs, ridges and terrace corners showed the old blocks' insides where the ground falls away behind
// or below) and an irregular faceted prism, not a box: a four-cornered foot (mostly buried) and a five- or six-cornered
// top, each ring an irregular polygon jittered per corner and turned its own way, so the sides break into triangular
// facets of their own planes. The face follows the real slope (it leans back between ~70° and ~85°, as the original's
// cliff facets lean: 43–73°, median 56°, measured on its height grid, tools/worldscore/ref/citadel.json) and stands out
// of it by the old blocks' relief; the top narrows, its corners each at their own height, falling back into the hill.
// Rocks over 6 m (the sea cliffs reach 16) are stacks of two or three chunks, each stepping in or out from the one
// under it, instead of one tall column. The texture is projected per face: U along the face's own horizontal, V by
// height (the strata stay level across facets), tops and bottoms by world XZ, so the texel density is even on every
// face (the old U ran along the cliff on every quad: thin stripes on the side faces). tests/rocks.mjs.
import * as THREE from 'three';
import { rng } from '../engine/math.js';

const TEX = 0.32;   // texture repeats per metre (as before)
const STACK2 = 6, STACK3 = 10;   // rock heights (m) over which a rock is a stack of two, of three chunks

// decide: the ground the blocks are chosen on (default the terrain). WORLD-80: world.js passes the ground as it stood
// before a change, so the random draws (and every block after a changed one) stay as they were; each chosen block is
// then shaped on the real ground.
// (ROCKS-1: the placement draws from rng(77) are those of the box-shaped blocks, one for one; each rock's shape draws
// from its own generator seeded by its grid cell, so a rock's shape never moves another rock)
export function buildCliffRocks(parent, terrain, tex, { skip = () => false, step = 1.9, minDrop = 1.75, decide = terrain, cut = [] } = {}) {
  const H = (x, z) => terrain.heightAt(x, z), DH = (x, z) => decide.heightAt(x, z);
  const half = terrain.half - 2;
  const r = rng(77);
  const pos = [], uv = [], col = [];
  const base = new THREE.Color();
  // one triangle (a, b, c counter-clockwise seen from outside), projected and shaded by its own normal
  const tri = (a, b, c, j) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz); if (l < 1e-6) return;
    nx /= l; ny /= l; nz /= l;
    // tops and bottoms (within 45° of level) by world XZ; the rest along the face's horizontal, V by height
    const cap = Math.abs(ny) > 0.707;
    let hx = nz, hz = -nx; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
    // (shade: the lit tops a little lighter, overhangs darker; each facet its own few per cent)
    const sh = Math.min(1.1, Math.max(0.78, 0.94 + ny * 0.14)) * j;
    for (const p of [a, b, c]) {
      pos.push(p[0], p[1], p[2]);
      if (cap) uv.push(p[0] * TEX, p[2] * TEX); else uv.push((p[0] * hx + p[2] * hz) * TEX, p[1] * TEX);
      col.push(base.r * sh, base.g * sh, base.b * sh);
    }
  };
  // a closed chunk: a bottom ring B and a top ring T of corners [x, y, z, angle round the chunk's axis], each convex
  // and in order of angle (counter-clockwise in x, z: the local frame (s, n) below keeps the handedness); the sides
  // a strip of triangles between the two rings (they may have different counts: each triangle its own facet), the
  // top and the bottom fanned from their first corner. Wound outward: every edge is shared by two triangles, once
  // each way (tests/rocks.mjs)
  const chunk = (B, T, hr) => {
    const nB = B.length, nT = T.length, ct = 0.95 + hr() * 0.09, jf = () => ct * (0.96 + hr() * 0.08);   // (each chunk its own tone, each facet a few per cent)
    const aB = (i) => B[i % nB][3] + (i >= nB ? 2 * Math.PI : 0), aT = (j) => T[j % nT][3] + (j >= nT ? 2 * Math.PI : 0);
    for (let i = 0, j = 0; i < nB || j < nT;) {
      if (j >= nT || (i < nB && aB(i + 1) <= aT(j + 1))) { tri(B[i % nB], T[j % nT], B[(i + 1) % nB], jf()); i++; }
      else { tri(B[i % nB], T[j % nT], T[(j + 1) % nT], jf()); j++; }
    }
    for (let k = 1; k < nT - 1; k++) tri(T[0], T[k + 1], T[k], jf());
    for (let k = 1; k < nB - 1; k++) tri(B[0], B[k], B[k + 1], ct);
  };
  let blocks = 0, chunks = 0;
  const rocks = [];   // (P121: each rock's triangles [t0, t1) and its chunks' ranges, its fall line, its tone)
  for (let z = terrain.cz - half; z < terrain.cz + half; z += step) {
    for (let x = terrain.cx - half; x < terrain.cx + half; x += step) {
      const px = x + (r() - 0.5) * step * 0.7, pz = z + (r() - 0.5) * step * 0.7;
      if (decide.slopeAt(px, pz) < 1.05 || skip(px, pz)) continue;
      // uphill direction
      const e = 0.5;
      const uphill = (G) => { const ux = G(px + e, pz) - G(px - e, pz), uz = G(px, pz + e) - G(px, pz - e), l = Math.hypot(ux, uz); return l < 1e-3 ? null : [ux / l, uz / l]; };
      // the drop: highest point a little uphill, lowest a little downhill
      const drop = (G, gx, gz) => {
        let top = -1e9, bot = 1e9, tTop = 0, tBot = 0;
        for (let t = 0; t <= 2.6; t += 0.2) {
          const hu = G(px + gx * t, pz + gz * t), hd = G(px - gx * t, pz - gz * t);
          if (hu > top) { top = hu; tTop = t; }
          if (hd < bot) { bot = hd; tBot = t; }
        }
        return [top, bot, tTop, tBot];
      };
      let g = uphill(DH);
      if (!g) continue;
      let [gx, gz] = g, [top, bot, tTop, tBot] = drop(DH, gx, gz);
      if (top - bot < minDrop || bot < -1.6) continue;
      // (chosen on the decision ground: shaped on the real one)
      if (decide !== terrain) { g = uphill(H) || g; [gx, gz] = g; [top, bot, tTop, tBot] = drop(H, gx, gz); }
      // centre of the face, where the height is half-way
      let tm = 0;
      for (let t = -tBot; t <= tTop; t += 0.1) if (H(px + gx * t, pz + gz * t) >= (top + bot) / 2) { tm = t; break; }
      const cx = px + gx * tm, cz = pz + gz * tm;
      // (the placement draws, as the box-shaped blocks drew them: ten a block)
      const w = step * (0.95 + r() * 0.35);          // overlapping neighbours
      const depth = 1.0 + r() * 0.5;
      const out = 0.12 + r() * 0.22;                 // relief out of the slope at mid-height
      // (WORLD-FIX: each block's top falls back into the hill at its own slope, so no two overlapping blocks share
      // one plane: their flat tops z-fought on the terraces' rims)
      const ix = Math.round((x - terrain.cx) / step), iz = Math.round((z - terrain.cz) / step);
      const y0 = bot - 0.35, y1 = top - 0.04 - r() * 0.12, tilt = ((((ix * 2 + iz * 5) % 13) + 13) % 13) * 0.013;
      r();                                           // (was the old blocks' mid-height break)
      const skew = (r() - 0.5) * 0.3, lean = (r() - 0.5) * 0.2;
      const tone = 0.9 + r() * 0.1;
      base.setRGB(tone, tone * (0.98 + r() * 0.03), tone * (1.0 + r() * 0.04));
      const R = { t0: pos.length / 9, chunks: [], gx, gz, tone: [base.r, base.g, base.b], seed: ((ix * 83492791) ^ (iz * 2971215073) ^ 0x27d4eb2d) >>> 0 };
      // this rock's own shape draws
      const hr = rng(((ix * 73856093) ^ (iz * 19349663) ^ 0x5bd1e995) >>> 0);
      // local frame: s along the cliff (tx, tz), n out of the hill (downhill, −g)
      const tx = -gz, tz = gx;
      const L = (s, n) => [cx + tx * s - gx * n, cz + tz * s - gz * n];
      // the rock's height: its top breaks the rim's line (some a little proud, most a little low)
      const yTop = y1 + (hr() < 0.25 ? hr() * 0.18 : -hr() * 0.55);
      const hgt = yTop - y0;
      // a stack of chunks when it is tall (the sea cliffs run to 16 m): two over 6 m, three over 10 m, the joints at
      // uneven heights; (triangle budget: ROCKS-1 keeps the mesh within +30 % of the box-shaped blocks' 8 144)
      const nCh = hgt > STACK3 ? 3 : hgt > STACK2 ? 2 : 1;
      const cuts = [y0];
      for (let k = 1; k < nCh; k++) cuts.push(y0 + hgt * (k / nCh + (hr() - 0.5) * 0.18 / nCh));
      cuts.push(yTop);
      // a ring: an irregular polygon round an ellipse (half-width a along the cliff, half-depth b into it), an edge
      // facing out of the hill, every corner jittered; turned a little so neighbours do not line up. Each corner
      // [s, n, angle], in order of angle.
      const ring = (nS, a, b) => {
        const P = [], th0 = Math.PI / 2 + Math.PI / nS, turn = (hr() - 0.5) * 0.9;
        for (let k = 0; k < nS; k++) {
          const th = th0 + (2 * Math.PI * k) / nS + (hr() - 0.5) * (2 * Math.PI / nS) * 0.45, rr = 1.06 + (hr() - 0.5) * 0.1;   // (small: the polygon stays convex)
          const s = Math.cos(th) * a * rr, n = Math.sin(th) * b * rr;
          const ss = s * Math.cos(turn) - n * Math.sin(turn), nn = s * Math.sin(turn) + n * Math.cos(turn);
          P.push([ss, nn, (Math.atan2(nn / b, ss / a) + 2 * Math.PI) % (2 * Math.PI)]);
        }
        return P.sort((p, q) => p[2] - q[2]);
      };
      // where the slope stands at a height: n of the first point up the fall line through the centre at or above it
      // (the faces follow the real cliff: a steep one gets near-vertical rocks, a gentler one rocks that lean back)
      const surfN = (y) => {
        const yy = Math.min(Math.max(y, bot + 0.15), top - 0.1);
        for (let t = -5.4; t <= 5.4; t += 0.1) if (H(cx + gx * t, cz + gz * t) >= yy) return -t;
        return 0;
      };
      let sOff = skew, wid = w / 2 * 1.18 * (0.8 + hr() * 0.4), dep = (depth + out) / 2 * 1.1;   // (the polygon inside the ellipse: about as wide as the box was, so neighbours still meet)
      const tall = Math.max(0, hgt / nCh - 2.5);       // (a tall chunk narrows more to its top, and starts wider: a buttress, not a post)
      wid *= 1 + Math.min(0.25, tall * 0.08);
      for (let c = 0; c < nCh; c++) {
        const ya = cuts[c] - (c ? 0.25 : 0), yb = cuts[c + 1], last = c === nCh - 1;
        // the bottom ring (buried or under the chunk below: four corners), the top ring (the silhouette: five or six;
        // a joint under the next chunk: four)
        const RB = ring(4, wid, dep), RT = ring(last ? (hr() < 0.6 ? 5 : 6) : 4, wid, dep);
        const sc = 0.76 + hr() * 0.12 - tall * 0.015, sl = lean + (hr() - 0.5) * 0.5;
        // each ring's face stands out of the slope at its own height: the first chunk's foot just at the cliff's foot,
        // the joints and the top by the old blocks' relief (out) and a little more, each its own (the chunks of a
        // stack step in and out). The face leans back at most ~70° (on a gentler slope the top stands out of it as a
        // crag, not a slab lying on it) and always back a little (≥ ~85°: no overhangs, no plumb walls); at mid-height it stands
        // out of the slope by at least the old relief (on a bulging slope the whole face moves out, ≤ 0.35 m).
        let fB = surfN(ya) + (c ? out * (0.5 + hr()) : out * 0.4 + hr() * 0.08);
        let fT = surfN(yb) + out * (0.6 + hr() * 0.8) + (last ? 0.05 : 0);
        fT = Math.min(Math.max(fT, fB - 0.35 * (yb - ya)), fB - (0.06 + hr() * 0.08) * (yb - ya));
        const need = Math.min(0.35, surfN((ya + yb) / 2) + out * 0.8 - (fB + fT) / 2);
        if (need > 0) { fB += need; fT += need; }
        // and never further out of the hill than the old blocks' faces reached (their relief from the face's centre): on a
        // gentle slope the foot is metres downhill, on the lower ground, the paths' edges and the doors' steps
        fB = Math.min(fB, out + 0.1); fT = Math.min(fT, out + 0.1);
        const nc0 = fB - Math.max(...RB.map((p) => p[1])), nc1 = fT - sc * Math.max(...RT.map((p) => p[1]));
        const Bm = RB.map(([s, n, an]) => { const [bx, bz] = L(sOff + s, nc0 + n); return [bx, ya - (c ? 0 : hr() * 0.1), bz, an]; });
        const peak = last ? Math.floor(hr() * RT.length) : -1, rise = 0.15 + hr() * 0.25;
        const Tm = RT.map(([s, n, an], k) => {
          // top corners: the outer ones at the top (a little bevelled), the inner ones falling back into the hill
          // (tilt: the WORLD-FIX plane per block), one corner at the face raised (the top's facets tip different
          // ways; never one at the back, which would stand out of the grass above as a shard); each
          // corner jittered in place and height. A joint under the next chunk: ±0.1 m (the next chunk's foot
          // overlaps it by ≥ 0.15 m)
          const back = Math.max(0, -n / dep), front = Math.max(0, n / dep);
          const drop = last ? tilt + back * (0.3 + hr() * 0.4) + front * hr() * 0.35 + hr() * 0.05 - (k === peak && n > -0.2 * dep ? rise : 0) : (hr() - 0.5) * 0.2;
          const [qx, qz] = L(sOff + sl + s * sc + (hr() - 0.5) * 0.24, nc1 + n * sc - hr() * 0.3);
          return [qx, yb - drop, qz, an];
        });
        const c0 = pos.length / 9;
        chunk(Bm, Tm, hr);
        R.chunks.push([c0, pos.length / 9]);
        chunks++;
        // the next chunk up: a little narrower, shifted along the cliff
        sOff += (hr() - 0.5) * 0.6; wid *= 0.9 + hr() * 0.08; dep *= 0.92;
      }
      R.t1 = pos.length / 9; rocks.push(R);
      blocks++;
    }
  }
  // P121: the rocks that run into each other at a knoll or a corner (crossing fall lines), and those half or more inside
  // another: each such group becomes one outcrop (the hull of its corners) where that adds little rock over the ground,
  // else its most buried rocks go; what is left has no sliver or shard of one rock showing out of another's face
  // (where masonry now stands: world.js's cut, each [inside(x, z, y), [x0, z0, x1, z1]]: a rock with a corner in it goes
  //  whole, before the rest are settled, so no rock is merged with or dropped for one that is not there)
  for (const R of rocks) for (let t = R.t0 * 9; t < R.t1 * 9 && !R.gone; t += 3) {
    const x = pos[t], y = pos[t + 1], z = pos[t + 2];
    for (const [inside, [x0, z0, x1, z1]] of cut) if (x >= x0 && x <= x1 && z >= z0 && z <= z1 && inside(x, z, y)) { R.gone = true; break; }
  }
  const st = settleRocks(rocks.filter((R) => !R.gone), pos, H);
  const keep = new Uint8Array(pos.length / 9).fill(1);
  for (const R of rocks) if (R.gone) keep.fill(0, R.t0, R.t1);
  let o = 0;
  for (let t = 0; t < keep.length; t++) if (keep[t]) {
    for (let k = 0; k < 9; k++) { pos[o * 9 + k] = pos[t * 9 + k]; col[o * 9 + k] = col[t * 9 + k]; }
    for (let k = 0; k < 6; k++) uv[o * 6 + k] = uv[t * 6 + k];
    o++;
  }
  pos.length = o * 9; col.length = o * 9; uv.length = o * 6;
  for (const O of st.outcrops) {
    const hr = rng(O.seed);
    base.setRGB(...O.tone);
    for (const [a, b, c] of O.faces) tri(O.pts[a], O.pts[b], O.pts[c], 0.95 + hr() * 0.09);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals(); // non-indexed: flat facets
  // (closed and wound outward: one side is enough)
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.95, flatShading: true, side: THREE.FrontSide }));
  m.castShadow = true;
  m.receiveShadow = true;
  m.name = 'cliffRocks';
  m.userData.blocks = blocks; m.userData.chunks = chunks; m.userData.settled = { merged: st.merged, outcrops: st.outcrops.length, dropped: st.dropped, ms: st.ms };
  parent.add(m);
  return { mesh: m, blocks, chunks };
}

// P121 (the user, 24.11, a photo of v150: "this still isn't fixed"): by the water office, at the promenade's south end,
// the knoll's seven rocks stood on three faces of a 6 m mound, each along its own fall line, so they crossed one another:
// the faces of one ran through the next, the pale corner of a rock behind stood out of a darker one as a shard, and one
// was mostly inside another. Rocks along one straight cliff overlap by design (a continuous face: their faces nearly in
// one plane); these crossed. settleRocks measures every pair of rocks as solids (vertical rays on a 0.2 m grid, each
// chunk a closed solid, a rock the union of its chunks) and calls a pair bad when half or more of the smaller is inside
// the other, or when their fall lines differ by over 50° and a sixth of the smaller is inside. Each group of rocks joined
// by bad pairs becomes ONE outcrop, the convex hull of its corners (no slivers inside a hull), where that adds little rock
// over the ground (≤ 15 % of the group's visible rock + 0.3 m³: the corner of a mound, not the open air of a terrace's
// inside corner); else its most buried rocks go (the most inside others first) until no bad pair is left. Nothing else
// moves (no random draw: placements and shapes as before). tests/overlap-sweep.mjs (f).
const SCELL = 0.2;
// (?rocks=old: the rocks as they stood before P121, for the user's comparison: no settling, no masonry pass in world.js)
export const ROCKS_OLD = (() => { try { return new URLSearchParams(location.search).get('rocks') === 'old'; } catch { return false; } })();
function settleRocks(rocks, pos, H) {
  if (ROCKS_OLD) return { outcrops: [], merged: 0, dropped: 0, ms: 0 };
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const ckey = (i, j) => (i + 32768) * 65536 + (j + 32768);
  // the intervals [lo, hi] of a closed run of triangles [a, b) on the vertical line (x, z)
  const hitsOn = (T, a, b, x, z) => {
    const hs = [];
    for (let t = a; t < b; t++) {
      const o = t * 9, ax = T[o], az = T[o + 2], bx = T[o + 3], bz = T[o + 5], cx = T[o + 6], cz = T[o + 8];
      if ((x < ax && x < bx && x < cx) || (x > ax && x > bx && x > cx) || (z < az && z < bz && z < cz) || (z > az && z > bz && z > cz)) continue;
      const d = (bx - ax) * (cz - az) - (bz - az) * (cx - ax); if (Math.abs(d) < 1e-12) continue;
      const u = ((x - ax) * (cz - az) - (z - az) * (cx - ax)) / d, v = ((bx - ax) * (z - az) - (bz - az) * (x - ax)) / d;
      if (u < 0 || v < 0 || u + v > 1) continue;
      hs.push(T[o + 1] + u * (T[o + 4] - T[o + 1]) + v * (T[o + 7] - T[o + 1]));
    }
    return hs.sort((p, q) => p - q);
  };
  const runIv = (a, b, x, z, out) => { const hs = hitsOn(pos, a, b, x, z); for (let k = 0; k + 1 < hs.length; k += 2) out.push([hs[k], hs[k + 1]]); };
  const merge = (l) => { l.sort((p, q) => p[0] - q[0]); const m = []; for (const v of l) { if (m.length && v[0] <= m[m.length - 1][1]) m[m.length - 1][1] = Math.max(m[m.length - 1][1], v[1]); else m.push([v[0], v[1]]); } return m; };
  const ovl = (A, B) => { let o = 0; for (const [a0, a1] of A) for (const [b0, b1] of B) o += Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)); return o; };
  const A2 = SCELL * SCELL;
  // the chunks: each a closed solid; its volume exact (the divergence theorem), its intervals on the grid's lines on demand
  const CH = [];
  rocks.forEach((R, ri) => {
    R.vol = 0;
    for (const [a, b] of R.chunks) {
      let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9, v = 0;
      for (let t = a; t < b; t++) {
        const o = t * 9;
        for (let k = 0; k < 9; k += 3) { x0 = Math.min(x0, pos[o + k]); x1 = Math.max(x1, pos[o + k]); z0 = Math.min(z0, pos[o + k + 2]); z1 = Math.max(z1, pos[o + k + 2]); }
        v += (pos[o] * (pos[o + 4] * pos[o + 8] - pos[o + 5] * pos[o + 7]) - pos[o + 1] * (pos[o + 3] * pos[o + 8] - pos[o + 5] * pos[o + 6]) + pos[o + 2] * (pos[o + 3] * pos[o + 7] - pos[o + 4] * pos[o + 6])) / 6;
      }
      CH.push({ ri, a, b, box: [x0, z0, x1, z1], vol: Math.max(v, 1e-6), iv: new Map() });
      R.vol += Math.max(v, 1e-6);
    }
  });
  const civ = (C, i, j) => { const k = ckey(i, j); let l = C.iv.get(k); if (!l) { l = []; if ((i + 1) * SCELL >= C.box[0] && i * SCELL <= C.box[2] && (j + 1) * SCELL >= C.box[1] && j * SCELL <= C.box[3]) runIv(C.a, C.b, (i + 0.5) * SCELL, (j + 0.5) * SCELL, l); C.iv.set(k, l); } return l; };
  const rockIv = (ri, i, j) => { const l = []; for (const C of rocks[ri].ch) l.push(...civ(C, i, j)); return merge(l); };
  for (const R of rocks) R.ch = [];
  for (const C of CH) rocks[C.ri].ch.push(C);
  // the pairs of chunks of two rocks whose boxes meet (a 2 m hash), their overlap on the grid in the boxes' common part
  const hash = new Map(), HC = 2;
  CH.forEach((C, ci) => { for (let i = Math.floor(C.box[0] / HC); i <= Math.floor(C.box[2] / HC); i++) for (let j = Math.floor(C.box[1] / HC); j <= Math.floor(C.box[3] / HC); j++) { const k = ckey(i, j); let l = hash.get(k); if (!l) hash.set(k, l = []); l.push(ci); } });
  const seenP = new Set(), pairs = new Map();
  for (const l of hash.values()) for (let p = 0; p < l.length; p++) for (let q = p + 1; q < l.length; q++) {
    const A = CH[l[p]], B = CH[l[q]]; if (A.ri === B.ri) continue;
    const pk = l[p] * 65536 + l[q]; if (seenP.has(pk)) continue; seenP.add(pk);
    const x0 = Math.max(A.box[0], B.box[0]), x1 = Math.min(A.box[2], B.box[2]), z0 = Math.max(A.box[1], B.box[1]), z1 = Math.min(A.box[3], B.box[3]);
    if (x0 >= x1 || z0 >= z1) continue;
    let o = 0;
    for (let i = Math.floor(x0 / SCELL); i <= Math.floor(x1 / SCELL); i++) for (let j = Math.floor(z0 / SCELL); j <= Math.floor(z1 / SCELL); j++) o += ovl(civ(A, i, j), civ(B, i, j)) * A2;
    if (o <= 0) continue;
    const a = Math.min(A.ri, B.ri), b = Math.max(A.ri, B.ri), key = a * 65536 + b;
    const P = pairs.get(key) || { o: 0, fc: 0 }; P.o += o; P.fc = Math.max(P.fc, o / Math.min(A.vol, B.vol)); pairs.set(key, P);
  }
  // bad: half (0.45) or more of the smaller rock, or of a smaller chunk, inside the other; or crossing fall lines (over 50°)
  // with a sixth of the smaller inside
  const bad = [], cos50 = Math.cos((50 * Math.PI) / 180);
  for (const [key, P] of pairs) {
    const a = Math.floor(key / 65536), b = key % 65536, Ra = rocks[a], Rb = rocks[b];
    const f = P.o / Math.min(Ra.vol, Rb.vol), cosAng = Ra.gx * Rb.gx + Ra.gz * Rb.gz;
    if (Math.max(f, P.fc) >= 0.45 || (cosAng < cos50 && f > 1 / 6)) bad.push({ a, b, f: Math.max(f, P.fc), small: Ra.vol <= Rb.vol ? a : b });
  }
  // the groups (in the order of their first rock: the same every build)
  const par = rocks.map((_, i) => i), find = (i) => { while (par[i] !== i) { par[i] = par[par[i]]; i = par[i]; } return i; };
  for (const p of bad) { const x = find(p.a), y = find(p.b); if (x !== y) par[x] = y; }
  const groups = new Map();
  for (let i = 0; i < rocks.length; i++) if (bad.some((p) => p.a === i || p.b === i)) { const g = find(i); if (!groups.has(g)) groups.set(g, []); groups.get(g).push(i); }
  const outcrops = []; let merged = 0, dropped = 0;
  for (const M of groups.values()) {
    const set = new Set(M);
    // the hull of the group's corners
    const pts = [], seen = new Set();
    for (const ri of M) for (let t = rocks[ri].t0 * 9; t < rocks[ri].t1 * 9; t += 3) { const k = Math.round(pos[t] * 1e3) + ',' + Math.round(pos[t + 1] * 1e3) + ',' + Math.round(pos[t + 2] * 1e3); if (!seen.has(k)) { seen.add(k); pts.push([pos[t], pos[t + 1], pos[t + 2]]); } }
    const faces = M.length <= 8 ? hull3(pts) : null;
    let ok = false, hullT = null, hullBox = null;
    if (faces) {
      // the rock it adds over the ground (outside every member) against the group's own rock over the ground
      const HT = []; for (const [a, b, c] of faces) HT.push(...pts[a], ...pts[b], ...pts[c]);
      let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); }
      let add = 0, vis = 0;
      for (let i = Math.floor(x0 / SCELL); i <= Math.floor(x1 / SCELL); i++) for (let j = Math.floor(z0 / SCELL); j <= Math.floor(z1 / SCELL); j++) {
        const x = (i + 0.5) * SCELL, z = (j + 0.5) * SCELL, g = H(x, z);
        const U = []; for (const ri of M) U.push(...rockIv(ri, i, j));
        const um = merge(U); for (const [lo, hi] of um) vis += Math.max(0, hi - Math.max(lo, g)) * A2;
        const hs = hitsOn(HT, 0, HT.length / 9, x, z); if (hs.length < 2) continue;
        const lo = Math.max(hs[0], g), hi = hs[hs.length - 1]; if (hi <= lo) continue;
        add += (hi - lo - ovl(um, [[lo, hi]])) * A2;
      }
      ok = add <= 0.15 * vis + 0.3;
      hullT = HT; hullBox = [x0, z0, x1, z1];
    }
    if (ok) {
      const big = M.reduce((p, q) => (rocks[q].vol > rocks[p].vol ? q : p), M[0]);
      for (const ri of M) rocks[ri].gone = true;
      outcrops.push({ pts, faces, tone: rocks[big].tone, seed: rocks[big].seed, HT: hullT, box: hullBox });
      merged += M.length;
      continue;
    }
    // else the most buried go, one by one, until no bad pair is left in the group
    for (;;) {
      const live = bad.filter((p) => set.has(p.a) && !rocks[p.a].gone && !rocks[p.b].gone);
      if (!live.length) break;
      const score = new Map(); for (const p of live) score.set(p.small, (score.get(p.small) || 0) + p.f);
      let worst = -1, ws = -1; for (const [ri, sc] of score) if (sc > ws || (sc === ws && rocks[ri].vol < rocks[worst].vol)) { ws = sc; worst = ri; }
      rocks[worst].gone = true; dropped++;
    }
  }
  // a rock that an outcrop now holds half or more of (it overlapped one of the group) goes too
  for (const O of outcrops) {
    let hv = 0; for (const [a, b, c] of O.faces) { const A = O.pts[a], B = O.pts[b], C = O.pts[c]; hv += (A[0] * (B[1] * C[2] - B[2] * C[1]) - A[1] * (B[0] * C[2] - B[2] * C[0]) + A[2] * (B[0] * C[1] - B[1] * C[0])) / 6; }
    rocks.forEach((R, ri) => {
      if (R.gone) return;
      let o = 0;
      for (const C of R.ch) {
        const x0 = Math.max(C.box[0], O.box[0]), x1 = Math.min(C.box[2], O.box[2]), z0 = Math.max(C.box[1], O.box[1]), z1 = Math.min(C.box[3], O.box[3]);
        if (x0 >= x1 || z0 >= z1) continue;
        for (let i = Math.floor(x0 / SCELL); i <= Math.floor(x1 / SCELL); i++) for (let j = Math.floor(z0 / SCELL); j <= Math.floor(z1 / SCELL); j++) {
          const hs = hitsOn(O.HT, 0, O.HT.length / 9, (i + 0.5) * SCELL, (j + 0.5) * SCELL); if (hs.length < 2) continue;
          o += ovl(civ(C, i, j), [[hs[0], hs[hs.length - 1]]]) * A2;
        }
      }
      if (o / Math.min(R.vol, hv) >= 0.45) { R.gone = true; dropped++; }
    });
    O.HT = O.box = null;
  }
  for (const R of rocks) R.ch = null;
  return { outcrops, merged, dropped, ms: Math.round((typeof performance !== 'undefined' ? performance.now() : 0) - t0) };
}

// a convex hull (incremental) of points [[x, y, z], ...]: faces [[i, j, k], ...] wound outward, or null (flat)
export function hull3(P, eps = 1e-6) {
  const n = P.length; if (n < 4) return null;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  let i0 = 0, i1 = 0; for (let i = 1; i < n; i++) { if (P[i][0] < P[i0][0]) i0 = i; if (P[i][0] > P[i1][0]) i1 = i; }
  if (i0 === i1) return null;
  const d01 = sub(P[i1], P[i0]); let i2 = -1, best = eps;
  for (let i = 0; i < n; i++) { const l = Math.hypot(...cr(d01, sub(P[i], P[i0]))); if (l > best) { best = l; i2 = i; } }
  if (i2 < 0) return null;
  const nrm = cr(d01, sub(P[i2], P[i0])); let i3 = -1; best = eps;
  for (let i = 0; i < n; i++) { const d = Math.abs(dot(nrm, sub(P[i], P[i0]))); if (d > best) { best = d; i3 = i; } }
  if (i3 < 0) return null;
  const faces = [];
  const mk = (a, b, c) => { const nn = cr(sub(P[b], P[a]), sub(P[c], P[a])); return { v: [a, b, c], n: nn, d: dot(nn, P[a]), l: Math.hypot(...nn), on: true }; };
  const cen = [0, 1, 2].map((k) => (P[i0][k] + P[i1][k] + P[i2][k] + P[i3][k]) / 4);
  for (const [a, b, c] of [[i0, i1, i2], [i0, i1, i3], [i0, i2, i3], [i1, i2, i3]]) { let f = mk(a, b, c); if (dot(f.n, cen) - f.d > 0) f = mk(a, c, b); faces.push(f); }
  const used = new Set([i0, i1, i2, i3]);
  for (let p = 0; p < n; p++) {
    if (used.has(p)) continue;
    const vis = faces.filter((f) => f.on && dot(f.n, P[p]) - f.d > 1e-5 * f.l);
    if (!vis.length) continue;
    const E = new Map();
    for (const f of vis) { f.on = false; for (let k = 0; k < 3; k++) { const a = f.v[k], b = f.v[(k + 1) % 3], rk = b + ',' + a; if (E.has(rk)) E.delete(rk); else E.set(a + ',' + b, [a, b]); } }
    for (const [a, b] of E.values()) faces.push(mk(a, b, p));
  }
  // (the dead faces out of the list as it grows: a hull of a few hundred corners stays quick)
  return faces.filter((f) => f.on).map((f) => f.v);
}

// STONES-31 (the user, 7.11: "the cylinders look really weird"): the Whispering Cliffs' rising stepping stones were
// bare nine-sided cylinders, flat brown with a flat green disc on top. Each is now a column of the cliff rocks' own
// kind, drawn with the very same material (the stratified cliff texture, vertex tones, flat facets: one program, one
// draw a stone): an irregular polygon of seven or eight corners, ring under ring, each ring jittered and a little
// wider than the one above (a slight taper, never an overhang), some rings stepping out a few centimetres as a
// stratum's ledge, the whole column leaning its own way. The top is a worn cap: a bevelled rim under a low cushion of
// moss whose edge is ragged (teeth of moss and bare rock round the rim; the moss stays on the top, never over the
// edge). The foot carries a band of earth stain where the column meets the ground once risen, so as it rises the
// stained rock comes up out of the soil. The texture moves with the stone (U along each facet, V by its own height),
// so the strata rise with it. Local frame: y = 0 is the stone's top (its collider's), the column reaches `depth` m
// down; groundY(x, z) is the risen ground's local height at a local point. Shape draws from rng(seed) alone.
// (the collider stays the r 1.15 cylinder: the cap's flat covers it to ~1.1 m, its bevel to ~1.3; the foot reaches
// at most ~0.3 m past it, inside the hero's own radius)
export function stoneColumnGeometry(seed, depth, groundY = () => -1e9) {
  const hr = rng(seed);
  const pos = [], uv = [], col = [];
  const ou = hr() * 9, ov = hr() * 9;                       // (each stone its own patch of the texture)
  // (a little warmer and lighter than the cliff behind, each its own: the path of stones reads against the rock face)
  const tone = 0.98 + hr() * 0.08, base = [tone * (1.05 + hr() * 0.04), tone, tone * (0.88 + hr() * 0.05)];
  const MOSS = [[0.36, 0.88, 0.16], [0.46, 0.92, 0.17], [0.31, 0.76, 0.17]];
  const EARTH = [0.74, 0.6, 0.46];
  // one triangle, wound so its normal points along `out`, projected and shaded as buildCliffRocks' are
  const tri = (a, b, c, out, moss = null) => {
    let ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    let vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz); if (l < 1e-7) return;
    nx /= l; ny /= l; nz /= l;
    if (nx * out[0] + ny * out[1] + nz * out[2] < 0) { [b, c] = [c, b]; nx = -nx; ny = -ny; nz = -nz; }
    const cap = Math.abs(ny) > 0.707;
    let hx = nz, hz = -nx; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
    const sh = Math.min(1.1, Math.max(0.78, 0.94 + ny * 0.14)) * (0.96 + hr() * 0.08);
    const tint = moss || base;
    for (const p of [a, b, c]) {
      pos.push(p[0], p[1], p[2]);
      if (cap) uv.push(p[0] * TEX + ou, p[2] * TEX + ov); else uv.push((p[0] * hx + p[2] * hz) * TEX + ou, p[1] * TEX + ov);
      // (the earth stain: full at the risen ground, gone 0.9 m over it)
      const e = moss ? 1 : Math.min(1, Math.max(0, (p[1] - groundY(p[0], p[2])) / 0.9)), s = e * e * (3 - 2 * e);
      col.push(tint[0] * sh * (EARTH[0] + (1 - EARTH[0]) * s), tint[1] * sh * (EARTH[1] + (1 - EARTH[1]) * s), tint[2] * sh * (EARTH[2] + (1 - EARTH[2]) * s));
    }
  };
  const nS = hr() < 0.5 ? 7 : 8, th0 = hr() * Math.PI * 2, step = (2 * Math.PI) / nS;
  const ang = Array.from({ length: nS }, (_, k) => th0 + k * step + (hr() - 0.5) * step * 0.4);
  const la = hr() * Math.PI * 2, lean = 0.008 + hr() * 0.014;   // (m out per m down, its own way; ≤ 0.08 m at the foot)
  const off = (y) => { const d = Math.min(-y, 0.08 / lean) * lean; return [Math.cos(la) * d, Math.sin(la) * d]; };
  const ringAt = (y, R, yj = 0) => { const [cx, cz] = off(y); return ang.map((a, k) => { const aa = a + (hr() - 0.5) * 0.08; return [cx + Math.cos(aa) * R[k], y + (hr() - 0.5) * yj, cz + Math.sin(aa) * R[k]]; }); };
  // the cap's rim (flat, a little worn), its bevel, then the body down to `depth`
  const Rt = ang.map(() => 1.13 + hr() * 0.09), Rb = Rt.map((r) => r + 0.13 + hr() * 0.06);
  const top = ang.map((a, k) => [Math.cos(a) * Rt[k], -0.005 - hr() * 0.035, Math.sin(a) * Rt[k]]);
  const bevY = -0.15 - hr() * 0.08;
  const rings = [top, ringAt(bevY, Rb, 0.04)];
  let R = Rb.slice(), y = bevY;
  const Rmax = Rb.map((r) => r + 0.17);   // (the foot at most ~0.3 m past the collider: inside the hero's own radius)
  while (y > -depth) {
    const dy = 0.7 + hr() * 0.65; y = Math.max(y - dy, -depth - 0.05);
    R = R.map((r, k) => Math.min(Rmax[k], Math.max(r - 0.01, r + dy * 0.03 + (hr() - 0.5) * 0.06)));
    const ring = ringAt(y, R, y > -depth + 0.1 ? 0.16 : 0);
    rings.push(ring);
    if (y > -depth + 0.3 && hr() < 0.45) {                       // a stratum's ledge: a few cm out, just under
      R = R.map((r, k) => Math.max(r, Math.min(Rmax[k], r + 0.04 + hr() * 0.05)));
      const [cx, cz] = off(y);
      rings.push(ring.map((p, k) => { const a = Math.atan2(p[2] - cz, p[0] - cx); return [cx + Math.cos(a) * R[k], p[1] - 0.05 - hr() * 0.03, cz + Math.sin(a) * R[k]]; }));
      y -= 0.07;
    }
  }
  // the sides: a band of quads between each ring and the next, each cut on its own diagonal (facets of their own planes)
  for (let r = 0; r + 1 < rings.length; r++) {
    const A = rings[r], B = rings[r + 1];
    for (let k = 0; k < nS; k++) {
      const k1 = (k + 1) % nS, o = [Math.cos(ang[k] + step / 2), 0, Math.sin(ang[k] + step / 2)];
      if (hr() < 0.5) { tri(A[k], A[k1], B[k1], o); tri(A[k], B[k1], B[k], o); }
      else { tri(A[k], A[k1], B[k], o); tri(A[k1], B[k1], B[k], o); }
    }
  }
  // the cap: a low cushion of moss (a ring of 2·nS corners, each its own way in from the rim, some on the rim itself)
  // and between it and the rim a band of bare rock of uneven width: a ragged edge, on the top, never over it
  const UP = [0, 1, 0], C = [(hr() - 0.5) * 0.3, 0.022, (hr() - 0.5) * 0.3];
  const E = (m) => { const k = m >> 1, a = top[k % nS], b = top[(k + 1) % nS]; return m & 1 ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2] : a; };
  const M = Array.from({ length: 2 * nS }, (_, m) => { const e = E(m), q = hr(), f = q < 0.3 ? 1 : 0.58 + q * 0.36; return [C[0] + (e[0] - C[0]) * f, 0.008 + hr() * 0.012, C[2] + (e[2] - C[2]) * f]; });
  const moss = () => MOSS[Math.floor(hr() * MOSS.length)];
  for (let m = 0; m < 2 * nS; m++) tri(C, M[m], M[(m + 1) % (2 * nS)], UP, moss());
  for (let k = 0; k < nS; k++) {
    const Tk = top[k], Tk1 = top[(k + 1) % nS], m0 = M[2 * k], m1 = M[2 * k + 1], m2 = M[(2 * k + 2) % (2 * nS)];
    tri(Tk, Tk1, m1, UP); tri(Tk, m1, m0, UP); tri(Tk1, m2, m1, UP);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  geo.userData.rock = true;   // (P121: the overlap sweep's rock parts)
  return geo;
}

// STONES-PLATEAU (release audit v75, F1; the same complaint STONES-31 answered: "stones that look like plain boxes"):
// the Whispering Cliffs plateau's ring of six standing stones were bare flat-grey boxes and the shard's pedestal a
// plain eight-sided drum. Like the stepping stones they are now drawn in the cliff rocks' own material (the stratified
// cliff texture, vertex tones, flat facets) and merged into ONE geometry: one draw for all seven, where there were seven.
//   a standing stone: a slab, broad face to the ring's centre, an irregular polygon of seven or eight corners in an
//     uneven oval, ring over ring, narrowing towards a worn, slanted crown, leaning its own way, a stratum's ledge here
//     and there; lichen on the crown's upward facets and a few on the sides; an earth stain where it leaves the ground.
//   the pedestal: hand-cut, not lathed: a broad foot slab, a shaft, an overhanging chamfered top slab, each octagon's
//     corners a little off true, paler than the stones (dressed stone), moss in the angle of the foot.
// spec: { stones: [{ x, z, ry, h, seed }], pedestal: { x, z, y, h }, ground(x, z) } in world coordinates; every
// stone's foot reaches 0.4 m under the lowest ground round it.
export function plateauStonesGeometry({ stones, pedestal, ground }) {
  const pos = [], uv = [], col = [];
  const LICHEN = [[0.62, 0.74, 0.42], [0.72, 0.78, 0.5], [0.5, 0.66, 0.3]];
  const FOOTMOSS = [[0.6, 0.8, 0.4], [0.68, 0.84, 0.46]];   // (a dusty moss in the angle of the pedestal's foot)
  const EARTH = [0.74, 0.6, 0.46];
  // one piece: its own generator, texture patch and tone; local points turned by ry and set at (X, Y, Z)
  const piece = (seed, X, Y, Z, ry, base) => {
    const hr = rng(seed), ou = hr() * 9, ov = hr() * 9, c = Math.cos(ry), s = Math.sin(ry);
    const W = (p) => [X + p[0] * c + p[2] * s, Y + p[1], Z - p[0] * s + p[2] * c];
    const tri = (a, b, cc, out, tint = null) => {
      let A = W(a), B = W(b), C = W(cc);
      const o = [out[0] * c + out[2] * s, out[1], -out[0] * s + out[2] * c];
      const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz); if (l < 1e-7) return;
      nx /= l; ny /= l; nz /= l;
      if (nx * o[0] + ny * o[1] + nz * o[2] < 0) { [B, C] = [C, B]; [b, cc] = [cc, b]; nx = -nx; ny = -ny; nz = -nz; }
      const cap = Math.abs(ny) > 0.707;
      // (U along the facet's own horizontal in the piece's frame, V by height: the strata stay level and move with it)
      const lnx = nx * c - nz * s, lnz = nx * s + nz * c;
      let hx = lnz, hz = -lnx; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
      const sh = Math.min(1.1, Math.max(0.78, 0.94 + ny * 0.14)) * (0.96 + hr() * 0.08);
      const t = tint || base;
      for (const [P, p] of [[A, a], [B, b], [C, cc]]) {
        pos.push(P[0], P[1], P[2]);
        if (cap) uv.push(p[0] * TEX + ou, p[2] * TEX + ov); else uv.push((p[0] * hx + p[2] * hz) * TEX + ou, p[1] * TEX + ov);
        const e = tint ? 1 : Math.min(1, Math.max(0, (P[1] - ground(P[0], P[2])) / 0.7)), k = e * e * (3 - 2 * e);
        col.push(t[0] * sh * (EARTH[0] + (1 - EARTH[0]) * k), t[1] * sh * (EARTH[1] + (1 - EARTH[1]) * k), t[2] * sh * (EARTH[2] + (1 - EARTH[2]) * k));
      }
    };
    return { hr, tri };
  };
  // the sides between successive rings (each quad cut on its own diagonal), the tint chosen per quad
  const band = (tri, hr, A, B, mid, tintAt = () => null) => {
    const n = A.length;
    for (let k = 0; k < n; k++) {
      const k1 = (k + 1) % n, t = tintAt(k);
      // (a flat band, a ledge's top or a slab's underside, faces up when it steps in, down when it steps out)
      const flat = Math.abs(A[k][1] - B[k][1]) < 0.03, o = flat ? [0, Math.hypot(B[k][0], B[k][2]) < Math.hypot(A[k][0], A[k][2]) ? 1 : -1, 0] : [Math.cos(mid[k]), 0, Math.sin(mid[k])];
      if (hr() < 0.5) { tri(A[k], A[k1], B[k1], o, t); tri(A[k], B[k1], B[k], o, t); }
      else { tri(A[k], A[k1], B[k], o, t); tri(A[k1], B[k1], B[k], o, t); }
    }
  };
  const pick = (hr, L) => L[Math.floor(hr() * L.length)];

  for (const S of stones) {
    const b0 = 0.92 + rng(S.seed + 1)() * 0.08;
    const { hr, tri } = piece(S.seed, S.x, 0, S.z, S.ry, [b0 * 0.98, b0 * 0.97, b0 * 0.93]);
    const g0 = ground(S.x, S.z);
    let low = g0;
    for (let a = 0; a < 8; a++) low = Math.min(low, ground(S.x + Math.sin(a * Math.PI / 4) * 0.7, S.z + Math.cos(a * Math.PI / 4) * 0.7));
    const foot = low - 0.4, top = g0 + S.h;
    const nS = hr() < 0.5 ? 7 : 8, step = (2 * Math.PI) / nS, th0 = hr() * step;
    const ang = Array.from({ length: nS }, (_, k) => th0 + k * step + (hr() - 0.5) * step * 0.35);
    const mid = ang.map((a, k) => (k + 1 < nS ? (a + ang[k + 1]) / 2 : (a + ang[0] + 2 * Math.PI) / 2));
    // an uneven oval: broad along local x (its broad faces are the ±z sides), each corner its own way out
    const rx = 0.5 + hr() * 0.08, rz = 0.27 + hr() * 0.06;
    const R0 = ang.map((a) => (rx * rz) / Math.hypot(rz * Math.cos(a), rx * Math.sin(a)) * (0.9 + hr() * 0.18));
    const la = hr() * Math.PI * 2, lean = 0.02 + hr() * 0.04;
    const off = (y) => { const d = Math.max(0, y - g0) * lean; return [Math.cos(la) * d, Math.sin(la) * d]; };
    const taper = (y) => { const f = Math.max(0, Math.min(1, (y - g0) / S.h)); return 1 - 0.3 * f * f; };
    const ring = (y, R, yj) => { const [cx, cz] = off(y); return ang.map((a, k) => [cx + Math.cos(a) * R[k], y + (hr() - 0.5) * yj, cz + Math.sin(a) * R[k]]); };
    const rings = [ring(foot, R0, 0)];
    let y = foot;
    const crownY = top - 0.45 - hr() * 0.2;
    while (y < crownY - 0.05) {
      y = Math.min(crownY, y + 0.55 + hr() * 0.45);
      const t = taper(y);
      let R = R0.map((r) => r * t * (0.95 + hr() * 0.1));
      rings.push(ring(y, R, y < crownY - 0.05 ? 0.14 : 0.04));
      if (y < crownY - 0.4 && hr() < 0.35) {   // a stratum's ledge: the ring above steps in a few cm
        y += 0.05; R = R.map((r) => r * (0.92 + hr() * 0.04));
        rings.push(ring(y, R, 0.02));
      }
    }
    // the crown: slanted (one shoulder higher), worn round in two steps to an off-centre point
    const sa = hr() * Math.PI * 2, slant = 0.18 + hr() * 0.2;
    const sl = (p) => (Math.cos(sa) * p[0] + Math.sin(sa) * p[2]) * slant;
    const last = rings[rings.length - 1];
    const sh1 = last.map((p) => { const [cx, cz] = off(p[1]); const f = 0.78 + hr() * 0.08; return [cx + (p[0] - cx) * f, top - 0.22 + sl(p) + (hr() - 0.5) * 0.05, cz + (p[2] - cz) * f]; });
    const sh2 = sh1.map((p) => { const [cx, cz] = off(p[1]); const f = 0.45 + hr() * 0.15; return [cx + (p[0] - cx) * f, p[1] + 0.12 + hr() * 0.06, cz + (p[2] - cz) * f]; });
    for (let r = 0; r + 1 < rings.length; r++) {
      const hi = rings[r + 1][0][1] > top - 1.2;
      band(tri, hr, rings[r], rings[r + 1], mid, () => (hi && hr() < 0.18 ? pick(hr, LICHEN) : null));
    }
    band(tri, hr, last, sh1, mid, () => (hr() < 0.3 ? pick(hr, LICHEN) : null));
    band(tri, hr, sh1, sh2, mid, () => (hr() < 0.6 ? pick(hr, LICHEN) : null));
    const [cx, cz] = off(top);
    const apex = [cx + Math.cos(sa) * 0.06, top + 0.02 + slant * 0.06, cz + Math.sin(sa) * 0.06];
    for (let k = 0; k < nS; k++) tri(sh2[k], sh2[(k + 1) % nS], apex, [0, 1, 0], hr() < 0.65 ? pick(hr, LICHEN) : null);
    // the foot's underside (under the ground: closed so a low camera never sees in)
    for (let k = 0; k < nS; k++) tri(rings[0][k], rings[0][(k + 1) % nS], [0, foot, 0], [0, -1, 0]);
  }

  if (pedestal) {
    // dressed stone, paler: octagons, each corner a little off true; moss in the angle of the foot
    const { x: X, z: Z, y: Y, h } = pedestal;
    const { hr, tri } = piece(48611, X, Y, Z, 0.3, [1.12, 1.1, 1.04]);
    const n = 8, ang = Array.from({ length: n }, (_, k) => (k + 0.5) * (Math.PI / 4) + (hr() - 0.5) * 0.05);
    const mid = ang.map((a) => a + Math.PI / 8);
    const oct = (y, r, j) => ang.map((a) => { const rr = r * (1 + (hr() - 0.5) * j); return [Math.cos(a) * rr, y + (hr() - 0.5) * 0.015, Math.sin(a) * rr]; });
    const L = [
      oct(-0.45, 1.12, 0.02), oct(0.2, 1.12, 0.03),            // the foot slab (its lower part under the ground)
      oct(0.2, 0.86, 0.02), oct(0.27, 0.82, 0.02),             // the foot's top, stepping in to the shaft's chamfer
      oct(h - 0.2, 0.76, 0.02),                                // the shaft
      oct(h - 0.2, 0.9, 0.02), oct(h - 0.16, 0.95, 0.02),      // the top slab's underside and its chamfered edge
      oct(h - 0.03, 0.95, 0.02), oct(h, 0.88, 0.02),           // its edge and the worn arris to the top
    ];
    for (let r = 0; r + 1 < L.length; r++) band(tri, hr, L[r], L[r + 1], mid, () => (r === 1 && hr() < 0.4 ? pick(hr, FOOTMOSS) : null));
    const topR = L[L.length - 1], C = [0, h + 0.005, 0];
    for (let k = 0; k < n; k++) tri(topR[k], topR[(k + 1) % n], C, [0, 1, 0]);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  geo.userData.rock = true;   // (P121: the overlap sweep's rock parts)
  return geo;
}
