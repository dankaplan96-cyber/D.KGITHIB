// P121 (the user, 24.11: rocks pushed into each other, slivers and a shard out of the joins): the rock pieces merged
// into one mesh (kit.js Batch, props.js Kit: the caves' jammed boulders, the rubble rows; geometry.userData.rockRanges,
// one closed rock per index range) are measured as solids, and a rock that half or more of lies inside another rock of
// a comparable size (at most five times its volume: a boulder in a rock mass reads as set into it) is left out: what
// showed of it were the slivers and shards of one rock's faces out of another's. Its triangles collapse to a point (the
// buffers keep their sizes, no other rock moves, no random draw changes); the ranges left are kept on the geometry.
// Every mesh one builder merges is settled together (a room's boulders of two tones are in two meshes).
// Cliff rocks have their own pass (cliffs.js settleRocks). Runs once, when the mesh is built. tests/overlap-sweep.mjs (f).
import { ROCKS_OLD } from './cliffs.js';
const CELL = 0.15;
export function settleRockRanges(geos) {
  if (!Array.isArray(geos)) geos = [geos];
  const ck = (i, j) => (i + 32768) * 65536 + (j + 32768);
  const rocks = [];
  for (const geo of geos) if (geo.index && geo.userData.rockRanges) for (const [a, b] of geo.userData.rockRanges) rocks.push(rock(geo, a, b));
  if (rocks.length < 2) return 0;
  function rock(geo, a, b) {
    const p = geo.attributes.position.array, ix = geo.index.array;
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9, v = 0;
    for (let t = a; t < b; t += 3) {
      const A = ix[t] * 3, B = ix[t + 1] * 3, C = ix[t + 2] * 3;
      for (const q of [A, B, C]) { x0 = Math.min(x0, p[q]); x1 = Math.max(x1, p[q]); z0 = Math.min(z0, p[q + 2]); z1 = Math.max(z1, p[q + 2]); }
      v += (p[A] * (p[B + 1] * p[C + 2] - p[B + 2] * p[C + 1]) - p[A + 1] * (p[B] * p[C + 2] - p[B + 2] * p[C]) + p[A + 2] * (p[B] * p[C + 1] - p[B + 1] * p[C])) / 6;
    }
    return { geo, p, ix, a, b, box: [x0, z0, x1, z1], vol: v, iv: new Map() };
  }
  // (a range that is not a closed, outward solid has no volume to speak of: left as it is)
  const live = rocks.filter((r) => r.vol > 1e-3);
  const ivOf = (r, i, j) => {
    const k = ck(i, j); let l = r.iv.get(k); if (l) return l;
    const { p, ix } = r, x = (i + 0.5) * CELL, z = (j + 0.5) * CELL, hs = [];
    for (let t = r.a; t < r.b; t += 3) {
      const A = ix[t] * 3, B = ix[t + 1] * 3, C = ix[t + 2] * 3, ax = p[A], az = p[A + 2], bx = p[B], bz = p[B + 2], cx = p[C], cz = p[C + 2];
      if ((x < ax && x < bx && x < cx) || (x > ax && x > bx && x > cx) || (z < az && z < bz && z < cz) || (z > az && z > bz && z > cz)) continue;
      const d = (bx - ax) * (cz - az) - (bz - az) * (cx - ax); if (Math.abs(d) < 1e-12) continue;
      const u = ((x - ax) * (cz - az) - (z - az) * (cx - ax)) / d, v = ((bx - ax) * (z - az) - (bz - az) * (x - ax)) / d;
      if (u < 0 || v < 0 || u + v > 1) continue;
      hs.push(p[A + 1] + u * (p[B + 1] - p[A + 1]) + v * (p[C + 1] - p[A + 1]));
    }
    hs.sort((m, n) => m - n); l = []; for (let q = 0; q + 1 < hs.length; q += 2) l.push([hs[q], hs[q + 1]]);
    r.iv.set(k, l); return l;
  };
  const hash = new Map();
  live.forEach((r, ri) => { for (let i = Math.floor(r.box[0] / 2); i <= Math.floor(r.box[2] / 2); i++) for (let j = Math.floor(r.box[1] / 2); j <= Math.floor(r.box[3] / 2); j++) { const k = ck(i, j); let l = hash.get(k); if (!l) hash.set(k, l = []); l.push(ri); } });
  const seen = new Set(), bad = [];
  for (const l of hash.values()) for (let s = 0; s < l.length; s++) for (let q = s + 1; q < l.length; q++) {
    const ka = Math.min(l[s], l[q]), kb = Math.max(l[s], l[q]), key = ka * 65536 + kb; if (seen.has(key)) continue; seen.add(key);
    const A = live[ka], B = live[kb];
    if (Math.max(A.vol, B.vol) > 5 * Math.min(A.vol, B.vol)) continue;
    const x0 = Math.max(A.box[0], B.box[0]), x1 = Math.min(A.box[2], B.box[2]), z0 = Math.max(A.box[1], B.box[1]), z1 = Math.min(A.box[3], B.box[3]);
    if (x0 >= x1 || z0 >= z1) continue;
    let o = 0;
    for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) for (const [a0, a1] of ivOf(A, i, j)) for (const [b0, b1] of ivOf(B, i, j)) o += Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)) * CELL * CELL;
    const f = o / Math.min(A.vol, B.vol);
    if (f >= 0.45) bad.push({ a: ka, b: kb, f, small: A.vol <= B.vol ? ka : kb });
  }
  // the most buried first, until no such pair is left
  let dropped = 0;
  for (;;) {
    const L = bad.filter((q) => !live[q.a].gone && !live[q.b].gone); if (!L.length) break;
    const sc = new Map(); for (const q of L) sc.set(q.small, (sc.get(q.small) || 0) + q.f);
    let w = -1, ws = -1; for (const [ri, s] of sc) if (s > ws) { ws = s; w = ri; }
    const W = live[w]; W.gone = true; dropped++;
    for (let t = W.a; t < W.b; t++) W.ix[t] = W.ix[W.a];
    W.geo.index.needsUpdate = true; W.geo.userData.rocksDropped = (W.geo.userData.rocksDropped || 0) + 1;
  }
  if (dropped) for (const geo of geos) if (geo.userData.rockRanges) geo.userData.rockRanges = rocks.filter((r) => r.geo === geo && !r.gone).map((r) => [r.a, r.b]);
  for (const r of rocks) r.iv = null;
  return dropped;
}

// ROCKS-MASONRY (P121's rule for every area: its sweep, tests/overlap-sweep.mjs (g), left 19 rocks cut by built parts
// in c3gallery, c3shaft, c3core and Under Celebration — boulders and rims laid by a room's rock runs and scatters before
// its machines, crates, decks and floors went in, which nothing checked). Once an area is built (regions.js finish), every
// rock of its merged meshes (geometry.userData.rockRanges, kit.js / props.js) is measured against the area's built parts
// as solids, on vertical rays every 10 cm: a part that is not rock (another look than the rock's: not its own cave wall,
// lintel or rim), not marked as rock's company (material.userData.rockSet: crystals growing out of rubble, Tralu's
// rock floor and rim caps, a mouth's dark inside) and not slender (a post, a beam, a rail, a cable: fixed into the
// rock). A rock that such a part cuts by more than 4 cm on 3 rays or more, above the lowest 35 % of the rock (a rock
// bedded in a floor is as one in the ground), is
//   - lowered under it, when every cut is a part over the rock's upper side (a floor or a deck it pushes up through: the
//     chasm's cliff boulders through the gallery's shelves) and half its height at most clears it, unless the part then
//     covers the whole rock (it would be hidden: left out);
//   - left out otherwise (its triangles collapse to a point, as rocksettle's pairs; a rock's own collider goes with it).
// Lowered rocks are settled again with their neighbours (settleRockRanges). ?rocks=old turns it off, as P121's passes.
// Nothing else moves; no random draw changes. ROCK_LOG and the room's R.rocksMasonry keep what it did (tests, the report).
export const ROCK_LOG = [];
const MS = 0.1, MD = 0.04, MN = 3;
export function rocksOutOfBuilt(root, { colliders = null, area = '' } = {}) {
  if (ROCKS_OLD || !root) return null;
  const t0 = performance.now();
  root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && !o.isSkinnedMesh && o.visible !== false && o.geometry?.attributes?.position) meshes.push(o); });
  // ---- the rocks: one closed solid per index range, in world space
  const rocks = [];
  for (const o of meshes) {
    const g = o.geometry; if (!g.userData.rockRanges || !g.index || Array.isArray(o.material)) continue;
    const ix = g.index.array, p = g.attributes.position.array, e = o.matrixWorld.elements;
    for (const [a, b] of g.userData.rockRanges) {
      if (b - a < 12 || (ix[a] === ix[a + 1] && ix[a] === ix[a + 2])) continue;   // (already left out)
      let v0 = 1e9, v1 = -1;
      for (let t = a; t < b; t++) { if (ix[t] < v0) v0 = ix[t]; if (ix[t] > v1) v1 = ix[t]; }
      const n = v1 - v0 + 1, W = new Float32Array(n * 3), box = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
      for (let i = 0; i < n; i++) {
        const q = (v0 + i) * 3, x = p[q], y = p[q + 1], z = p[q + 2];
        const wx = e[0] * x + e[4] * y + e[8] * z + e[12], wy = e[1] * x + e[5] * y + e[9] * z + e[13], wz = e[2] * x + e[6] * y + e[10] * z + e[14];
        W[i * 3] = wx; W[i * 3 + 1] = wy; W[i * 3 + 2] = wz;
        if (wx < box[0]) box[0] = wx; if (wy < box[1]) box[1] = wy; if (wz < box[2]) box[2] = wz; if (wx > box[3]) box[3] = wx; if (wy > box[4]) box[4] = wy; if (wz > box[5]) box[5] = wz;
      }
      rocks.push({ o, g, mat: o.material, a, b, v0, W, box });
    }
  }
  if (!rocks.length) return null;
  const C = 1, ck = (i, j) => (i + 32768) * 65536 + (j + 32768);
  const rockHash = new Map();
  rocks.forEach((r, ri) => { for (let i = Math.floor(r.box[0] / C); i <= Math.floor(r.box[3] / C); i++) for (let j = Math.floor(r.box[2] / C); j <= Math.floor(r.box[5] / C); j++) { const k = ck(i, j); let l = rockHash.get(k); if (!l) rockHash.set(k, l = []); l.push(ri); } });
  // (a box in the world near a rock: over its footprint, from half its height under it (a lowered rock's new foot) to its top)
  const nearRock3 = (x0, y0, z0, x1, y1, z1) => {
    for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(z0 / C); j <= Math.floor(z1 / C); j++) for (const ri of rockHash.get(ck(i, j)) || []) {
      const b = rocks[ri].box; if (x1 > b[0] - 0.05 && x0 < b[3] + 0.05 && z1 > b[2] - 0.05 && z0 < b[5] + 0.05 && y1 > b[1] - 0.55 * (b[4] - b[1]) && y0 < b[4] + 0.05) return true;
    }
    return false;
  };
  const worldBox = (e, x0, y0, z0, x1, y1, z1) => { const w = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]; for (const X of [x0, x1]) for (const Y of [y0, y1]) for (const Z of [z0, z1]) for (let k = 0; k < 3; k++) { const v = e[k] * X + e[4 + k] * Y + e[8 + k] * Z + e[12 + k]; if (v < w[k]) w[k] = v; if (v > w[k + 3]) w[k + 3] = v; } return w; };
  const nearRock = (x0, z0, x1, z1) => { for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(z0 / C); j <= Math.floor(z1 / C); j++) if (rockHash.has(ck(i, j))) return true; return false; };
  const sameLook = (a, b) => (a.map || b.map) ? !!(a.map && b.map && (a.map === b.map || (a.map.source && a.map.source === b.map.source))) : !!(a.color && b.color && a.color.equals(b.color));
  const rockMats = [...new Set(rocks.map((r) => r.mat))];
  // ---- the built parts near them: triangles (world), each with its mesh's look and its part
  const T = [], tri = new Map();   // T: x0 y0 z0 x1 y1 z1 x2 y2 z2 ny per triangle; tri: cell → triangle ids
  const TP = [], TM = [];           // the triangle's part id; its material
  const PK = [], PI = [], PR = [], PS = [];   // per part: its mesh, its number there, its index range, slender or not
  for (const o of meshes) {
    const g = o.geometry; if (g.userData.rock && !g.userData.rockRanges) continue;   // (a rock mesh of its own: cliffs.js, a lone boulder)
    if (!g.boundingBox) g.computeBoundingBox();
    const bb = g.boundingBox, e = o.matrixWorld.elements;
    if (!nearRock3(...worldBox(e, bb.min.x, bb.min.y, bb.min.z, bb.max.x, bb.max.y, bb.max.z))) continue;
    const mats = Array.isArray(o.material) ? o.material : [o.material], ix = g.index ? g.index.array : null, p = g.attributes.position.array;
    const total = ix ? ix.length : p.length / 3;
    const ranges = Array.isArray(o.material) && g.groups.length ? g.groups.map((q) => [q.start, Math.min(total, q.start + q.count), mats[q.materialIndex]]) : [[0, total, mats[0]]];
    const ok = (m) => m && m.visible !== false && m.colorWrite !== false && !(m.transparent && m.opacity < 0.03) && !m.userData?.rockSet;
    if (!ranges.some(([, , m]) => ok(m) && !rockMats.every((rm) => sameLook(rm, m)))) continue;   // (nothing but the rocks' own look: their walls)
    const inRock = new Uint8Array(total / 3 | 0);
    for (const [a, b] of g.userData.rockRanges || []) for (let t = a; t < b; t += 3) inRock[t / 3 | 0] = 1;
    // (the parts: what each k.add put in a merged mesh, geometry.userData.parts (kit.js, props.js: one closed piece each, a
    //  box, a rounded box, a lathe); a mesh of its own is one part)
    const starts = g.userData.parts || [0], verts = g.userData.partVerts, mine = new Map(), skip = new Map(), nv = p.length / 3;
    // (a merged piece wholly away from every rock is passed over whole: its corners' box, from its own vertices)
    const away = (key) => {
      if (!verts || verts.length !== starts.length) return false;
      let r = skip.get(key); if (r !== undefined) return r;
      const v0 = verts[key], v1 = verts[key + 1] ?? nv; let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
      for (let v = v0; v < v1; v++) { const x = p[v * 3], y = p[v * 3 + 1], z = p[v * 3 + 2]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
      r = !nearRock3(...worldBox(e, x0, y0, z0, x1, y1, z1)); skip.set(key, r); return r;
    };
    let pi = 0, pid = -1;
    for (const [s0, s1, m] of ranges) {
      if (!ok(m) || rockMats.every((rm) => sameLook(rm, m))) continue;
      pi = 0;
      for (let t = s0; t + 2 < s1; t += 3) {
        if (inRock[t / 3 | 0]) continue;
        while (pi < starts.length && starts[pi] <= t) pi++;
        if (away(pi - 1)) { t = Math.min(s1, starts[pi] ?? s1) - 3; continue; }
        const q0 = (ix ? ix[t] : t) * 3, q1 = (ix ? ix[t + 1] : t + 1) * 3, q2 = (ix ? ix[t + 2] : t + 2) * 3;
        const ax = e[0] * p[q0] + e[4] * p[q0 + 1] + e[8] * p[q0 + 2] + e[12], az = e[2] * p[q0] + e[6] * p[q0 + 1] + e[10] * p[q0 + 2] + e[14];
        const bx = e[0] * p[q1] + e[4] * p[q1 + 1] + e[8] * p[q1 + 2] + e[12], bz = e[2] * p[q1] + e[6] * p[q1 + 1] + e[10] * p[q1 + 2] + e[14];
        const cx = e[0] * p[q2] + e[4] * p[q2 + 1] + e[8] * p[q2 + 2] + e[12], cz = e[2] * p[q2] + e[6] * p[q2 + 1] + e[10] * p[q2 + 2] + e[14];
        const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
        if (Math.abs(ny) < 1e-9) continue;   // (an upright face: no vertical ray meets it)
        const x0 = Math.min(ax, bx, cx), x1 = Math.max(ax, bx, cx), z0 = Math.min(az, bz, cz), z1 = Math.max(az, bz, cz);
        if (!nearRock(x0, z0, x1, z1)) continue;
        const key = pi - 1; if (!(pid >= 0 && PK[pid] === o && PI[pid] === key)) { pid = mine.get(key) ?? -1; if (pid < 0) { pid = PK.length; PK.push(o); PI.push(key); PR.push([starts[key] ?? 0, starts[key + 1] ?? total]); mine.set(key, pid); } }
        const id = TP.length; TP.push(pid); TM.push(m);
        T.push(ax, e[1] * p[q0] + e[5] * p[q0 + 1] + e[9] * p[q0 + 2] + e[13], az, bx, e[1] * p[q1] + e[5] * p[q1 + 1] + e[9] * p[q1 + 2] + e[13], bz, cx, e[1] * p[q2] + e[5] * p[q2 + 1] + e[9] * p[q2 + 2] + e[13], cz, ny);
        for (let i = Math.floor(x0 / C); i <= Math.floor(x1 / C); i++) for (let j = Math.floor(z0 / C); j <= Math.floor(z1 / C); j++) { const k = ck(i, j); if (!rockHash.has(k)) continue; let l = tri.get(k); if (!l) tri.set(k, l = []); l.push(id); }
      }
    }
  }
  // (a part's breadth across, from its corners' spread over the ground (twice the least principal deviation): under 0.32 m it is a
  //  post, a beam, a rail, a pipe or a cable, which ends in the rock it is fixed to — the shaft's I-beams in its walls,
  //  the tunnel's shoring, the mirror's post, the core's stanchions — not a body that cuts it)
  const slender = (pid) => {
    if (PS[pid] !== undefined) return PS[pid];
    const o = PK[pid], g = o.geometry, ix = g.index ? g.index.array : null, p = g.attributes.position.array, e = o.matrixWorld.elements, [t0, t1] = PR[pid];
    let n = 0, sx = 0, sz = 0, sxx = 0, szz = 0, sxz = 0;
    for (let t = t0; t < t1; t++) { const q = (ix ? ix[t] : t) * 3, wx = e[0] * p[q] + e[4] * p[q + 1] + e[8] * p[q + 2] + e[12], wz = e[2] * p[q] + e[6] * p[q + 1] + e[10] * p[q + 2] + e[14]; n++; sx += wx; sz += wz; sxx += wx * wx; szz += wz * wz; sxz += wx * wz; }
    if (!n) return (PS[pid] = false);
    const mx = sx / n, mz = sz / n, a = sxx / n - mx * mx, b = szz / n - mz * mz, c = sxz / n - mx * mz, lmin = (a + b) / 2 - Math.sqrt(((a - b) / 2) ** 2 + c * c);
    return (PS[pid] = 2 * Math.sqrt(Math.max(0, lmin)) < 0.32);   // (corners: a box's spread is half its width each way)
  };
  const tc = performance.now();
  const hitY = (w, o, x, z) => {   // (the triangle at w[o..o+8] under the ray at x, z: its y, or null)
    const ax = w[o], az = w[o + 2], bx = w[o + 3], bz = w[o + 5], cx = w[o + 6], cz = w[o + 8];
    if ((x < ax && x < bx && x < cx) || (x > ax && x > bx && x > cx) || (z < az && z < bz && z < cz) || (z > az && z > bz && z > cz)) return null;
    const d = (bx - ax) * (cz - az) - (bz - az) * (cx - ax); if (Math.abs(d) < 1e-12) return null;
    const u = ((x - ax) * (cz - az) - (z - az) * (cx - ax)) / d, v = ((bx - ax) * (z - az) - (bz - az) * (x - ax)) / d;
    if (u < 0 || v < 0 || u + v > 1) return null;
    return w[o + 1] + u * (w[o + 4] - w[o + 1]) + v * (w[o + 7] - w[o + 1]);
  };
  // (what a part is, for the log: its rays cut, its colour, its box in the world)
  const partInfo = (pid, n) => {
    const o = PK[pid], m = Array.isArray(o.material) ? o.material[0] : o.material, g = o.geometry, ix = g.index?.array, p = g.attributes.position.array, e = o.matrixWorld.elements, b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (let t = PR[pid][0]; t < PR[pid][1]; t++) { const q = (ix ? ix[t] : t) * 3; for (let k = 0; k < 3; k++) { const v = e[k] * p[q] + e[4 + k] * p[q + 1] + e[8 + k] * p[q + 2] + e[12 + k]; b[k] = Math.min(b[k], v); b[k + 3] = Math.max(b[k + 3], v); } }
    return `${n} rays: #${m?.color?.getHexString?.() || ''}${m?.map ? ' textured' : ''} part ${b.map((v) => Math.round(v * 100) / 100).join(',')}`;
  };
  // ---- each rock against the parts under its rays
  let lowered = 0, dropped = 0, offCols = 0, nRays = 0, nTests = 0;
  const acts = [];
  const lowGeos = new Set();
  for (const r of rocks) {
    const [bx0, by0, bz0, bx1, by1, bz1] = r.box;
    const H = by1 - by0, cand = new Set();
    // (the parts under its footprint, of another look, not slender; none reaching above its bedded foot: nothing to do)
    for (let i = Math.floor(bx0 / C); i <= Math.floor(bx1 / C); i++) for (let j = Math.floor(bz0 / C); j <= Math.floor(bz1 / C); j++) for (const id of tri.get(ck(i, j)) || []) {
      const o = id * 10; if (Math.max(T[o], T[o + 3], T[o + 6]) < bx0 || Math.min(T[o], T[o + 3], T[o + 6]) > bx1 || Math.max(T[o + 2], T[o + 5], T[o + 8]) < bz0 || Math.min(T[o + 2], T[o + 5], T[o + 8]) > bz1) continue;
      if (!sameLook(r.mat, TM[id]) && !slender(TP[id])) cand.add(id);
    }
    if (!cand.size) continue;
    let any = false;
    for (const id of cand) { const o = id * 10; if (Math.max(T[o + 1], T[o + 4], T[o + 7]) > by0 + 0.35 * H && Math.min(T[o + 1], T[o + 4], T[o + 7]) < by1) { any = true; break; } }
    if (!any) continue;
    // the rock's own triangles (world) and the parts' in buckets of 0.25 m over its footprint: each ray meets its bucket's
    const LB = 0.25, ni = Math.floor((bx1 - bx0) / LB) + 1, nj = Math.floor((bz1 - bz0) / LB) + 1, bk = Array.from({ length: ni * nj }, () => [[], []]);
    const put = (w, o, slot, id) => { const i0 = Math.max(0, Math.floor((Math.min(w[o], w[o + 3], w[o + 6]) - bx0) / LB)), i1 = Math.min(ni - 1, Math.floor((Math.max(w[o], w[o + 3], w[o + 6]) - bx0) / LB)), j0 = Math.max(0, Math.floor((Math.min(w[o + 2], w[o + 5], w[o + 8]) - bz0) / LB)), j1 = Math.min(nj - 1, Math.floor((Math.max(w[o + 2], w[o + 5], w[o + 8]) - bz0) / LB)); for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) bk[i * nj + j][slot].push(id); };
    const RT = [], ix = r.g.index.array, W = r.W;
    for (let t = r.a; t < r.b; t += 3) { const o = RT.length; for (let k = 0; k < 3; k++) { const q = (ix[t + k] - r.v0) * 3; RT.push(W[q], W[q + 1], W[q + 2]); } put(RT, o, 0, o); }
    for (const id of cand) put(T, id * 10, 1, id);
    const rays = [];   // { rk: [[bot, top]…], pv: Map(part → [[bot, top]…]) }
    for (let x = bx0 + MS / 2; x < bx1; x += MS) for (let z = bz0 + MS / 2; z < bz1; z += MS) {
      const [bR, bP] = bk[Math.min(ni - 1, Math.floor((x - bx0) / LB)) * nj + Math.min(nj - 1, Math.floor((z - bz0) / LB))];
      nRays++; nTests += bR.length + bP.length;
      const hs = []; for (const o of bR) { const y = hitY(RT, o, x, z); if (y !== null) hs.push(y); }
      if (hs.length < 2) continue;
      hs.sort((m, n) => m - n); const rk = []; for (let q = 0; q + 1 < hs.length; q += 2) rk.push([hs[q], hs[q + 1]]);
      const per = new Map();
      for (const id of bP) { const y = hitY(T, id * 10, x, z); if (y === null) continue; let l = per.get(TP[id]); if (!l) per.set(TP[id], l = []); l.push([y, T[id * 10 + 9]]); }
      const pv = new Map();
      for (const [pid, l] of per) {
        if (l.length % 2) continue;   // (a sheet on this ray, not a closed part)
        l.sort((m, n) => n[0] - m[0]); const out = []; let good = true;
        for (let q = 0; q < l.length; q += 2) { if (!(l[q][1] > 0 && l[q + 1][1] < 0)) { good = false; break; } out.push([l[q + 1][0], l[q][0]]); }
        if (good) pv.set(pid, out);
      }
      rays.push({ rk, pv });
    }
    // (the cuts with the rock lowered by `s`: per part, the rays cut, whether each cut is from above, the drop that clears it)
    const cuts = (s) => {
      const res = new Map(), bot = by0 - s;
      for (const { rk, pv } of rays) for (const [pid, pl] of pv) {
        let best = null;
        for (const [r0, r1] of rk) for (const [p0, p1] of pl) {
          const a0 = r0 - s, a1 = r1 - s, d = Math.min(a1, p1) - Math.max(a0, p0);
          if (d <= MD || Math.min(a1, p1) - bot <= 0.35 * H) continue;
          if (!best || d > best.d) best = { d, above: p0 >= a0 + 0.4 * (a1 - a0), need: a1 - p0 + 0.03 };
        }
        if (!best) continue;
        let c = res.get(pid); if (!c) res.set(pid, c = { pid, n: 0, above: true, need: 0 });
        c.n++; c.above &&= best.above; c.need = Math.max(c.need, best.need);
      }
      return [...res.values()].filter((c) => c.n >= MN);
    };
    const bad = cuts(0); if (!bad.length) continue;
    let act = 'left out', by = 0;
    if (bad.every((c) => c.above)) {
      const L = Math.max(...bad.map((c) => c.need));
      // (hidden: a part over the lowered rock on nearly every ray)
      const covered = rays.filter(({ rk, pv }) => { const top = Math.max(...rk.map((q) => q[1])) - L; for (const pl of pv.values()) for (const [p0] of pl) if (p0 >= top - 0.01) return true; return false; }).length;
      if (L <= 0.5 * H && covered < 0.9 * rays.length && !cuts(L).length) { act = 'lowered'; by = L; }
    }
    const pos = r.g.attributes.position, ixa = r.g.index.array;
    if (act === 'lowered') {
      // (the range's own vertices, in the mesh's frame: the world drop turned back by the matrix's y column)
      const e = r.o.matrixWorld.elements, sy = Math.hypot(e[4], e[5], e[6]) || 1, dy = -by / sy;
      const seen = new Set(); for (let t = r.a; t < r.b; t++) { const v = ixa[t]; if (seen.has(v)) continue; seen.add(v); pos.array[v * 3 + 1] += dy; }
      pos.needsUpdate = true; r.g.computeBoundingSphere(); r.g.boundingBox = null; lowGeos.add(r.g); lowered++;
    } else {
      for (let t = r.a; t < r.b; t++) ixa[t] = ixa[r.a];
      r.g.index.needsUpdate = true; r.g.userData.rocksDropped = (r.g.userData.rocksDropped || 0) + 1; dropped++;
    }
    // its own collider (centred on it, 30 cm at most off its middle, no wider and no higher than it; a neighbour's — the
    // drum's, the crate stack's — is not): off with it, or down with it
    const cols = [], mx = (bx0 + bx1) / 2, mz = (bz0 + bz1) / 2;
    if (colliders) for (const c of colliders) {
      if (c.enabled === false || c.camOnly || Math.hypot(c.x - mx, c.z - mz) > 0.3) continue;
      const ext = c.type === 'cyl' ? c.r : Math.max(c.hw || 0, c.hd || 0);
      if (ext > Math.max(bx1 - bx0, bz1 - bz0) / 2 + 0.15 || c.top > by1 + 0.3 || c.top < by0 + 0.3 * H) continue;
      if (act === 'lowered') c.top -= by; else c.enabled = false;
      offCols++; cols.push(`${c.type} ${Math.round(c.x * 100) / 100},${Math.round(c.z * 100) / 100} top ${Math.round(c.top * 100) / 100}${act === 'lowered' ? ' (lowered)' : ' (off)'}`);
    }
    acts.push({ area, act, by: Math.round(by * 100) / 100, x: Math.round((bx0 + bx1) * 50) / 100, z: Math.round((bz0 + bz1) * 50) / 100, y: Math.round(by0 * 100) / 100, h: Math.round(H * 100) / 100, cols, cuts: bad.map((c) => partInfo(c.pid, c.n)) });
  }
  for (const g of lowGeos) settleRockRanges(g);
  const ms = performance.now() - t0;
  ROCK_LOG.push(...acts);
  return { rocks: rocks.length, lowered, dropped, colliders: offCols, ms: Math.round(ms * 10) / 10, msParts: Math.round((tc - t0) * 10) / 10, tris: TP.length, nRays, nTests, acts };
}
