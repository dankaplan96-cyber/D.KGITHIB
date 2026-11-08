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
export function buildCliffRocks(parent, terrain, tex, { skip = () => false, step = 1.9, minDrop = 1.75, decide = terrain } = {}) {
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
        chunk(Bm, Tm, hr);
        chunks++;
        // the next chunk up: a little narrower, shifted along the cliff
        sOff += (hr() - 0.5) * 0.6; wid *= 0.9 + hr() * 0.08; dep *= 0.92;
      }
      blocks++;
    }
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
  m.userData.blocks = blocks; m.userData.chunks = chunks;
  parent.add(m);
  return { mesh: m, blocks, chunks };
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
  return geo;
}
