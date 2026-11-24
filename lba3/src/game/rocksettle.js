// P121 (the user, 24.11: rocks pushed into each other, slivers and a shard out of the joins): the rock pieces merged
// into one mesh (kit.js Batch, props.js Kit: the caves' jammed boulders, the rubble rows; geometry.userData.rockRanges,
// one closed rock per index range) are measured as solids, and a rock that half or more of lies inside another rock of
// a comparable size (at most five times its volume: a boulder in a rock mass reads as set into it) is left out: what
// showed of it were the slivers and shards of one rock's faces out of another's. Its triangles collapse to a point (the
// buffers keep their sizes, no other rock moves, no random draw changes); the ranges left are kept on the geometry.
// Every mesh one builder merges is settled together (a room's boulders of two tones are in two meshes).
// Cliff rocks have their own pass (cliffs.js settleRocks). Runs once, when the mesh is built. tests/overlap-sweep.mjs (f).
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
