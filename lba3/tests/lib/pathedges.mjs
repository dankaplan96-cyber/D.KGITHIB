// P140 PATH-EDGES, the Node half of tests/path-ends.mjs's two new rules (the user, 26.11, on P136's own after picture:
// "still not complete!!!" — the paving ending in a ragged, noisy edge against a dirt lot; a straight kerb facing open
// dirt; a kerbed bare rectangle inside the paving). On one area's rasters (0.25 m): M0 the paving as drawn (terrain and
// meshes, specks kept), Dm the bare earth (pathends.js grid d > 0, not paved).
//   EDGE    a paving's edge must be a clean line: straight, a smooth curve, a corner. Its outline is traced, resampled at
//           0.25 m and smoothed over ±0.75 m; along every 3 m of it the WIGGLE = Σ|turn| − |Σ turn| (a straight edge, a
//           corner, an arc: ~0; a notch: ~180°; splat noise, a grid's saw-tooth: more) must stay under WIG_MAX. A stretch
//           over it is a fault unless the edge meets a wall, a face, the sea or a floor there (pathends.js edgeMeet: a
//           house standing on the paving's edge hides it). Also faults: an ISLAND, a speck of paving (< 3 m²) within
//           1.5 m of a paving's edge, and a HOLE, a bare speck (< 3 m²) inside a paving, unless something stands over it.
//   LOT     bare earth boxed in by paving: the earth's part at least 3 m across (its opening by a 1.5 m disc: a trodden
//           way, LAWN-EDGES' 2 m band along the kerb with the lawn behind it, never), that touches paving on two sides or
//           more (≥ 1.5 m on each, ≥ 6 m²), or is ≥ 12 m² and touches it along ≥ 6 m. A plot so narrow that the band
//           fills it is a lot: there is no lawn behind it.
export const RES = 0.25, WIG_MAX = +(process.env.WIG_MAX || 60), WIG_WIN = +(process.env.WIG_WIN || 3.0), SPECK = 3.0, WIG_S = +(process.env.WIG_S || 2);
const deg = 180 / Math.PI;

// 4-connected components of the pixels where on(p); returns { lab, comps: [{ n, px: [first p], sx, sy }] }
function components(W, H, on, eight = false) {
  const lab = new Int32Array(W * H), comps = [null];
  const st = [];
  for (let p = 0; p < W * H; p++) {
    if (!on(p) || lab[p]) continue;
    const id = comps.length, c = { n: 0, sx: 0, sy: 0, edge: false, pix: [] };
    comps.push(c); lab[p] = id; st.push(p);
    while (st.length) {
      const q = st.pop(), x = q % W, y = (q / W) | 0;
      c.n++; c.sx += x; c.sy += y; c.pix.push(q);
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) c.edge = true;
      for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) {
        if (!u && !v) continue; if (!eight && u && v) continue;
        const a = x + u, b = y + v; if (a < 0 || b < 0 || a >= W || b >= H) continue;
        const r = b * W + a; if (!lab[r] && on(r)) { lab[r] = id; st.push(r); }
      }
    }
  }
  return { lab, comps };
}
// chamfer distance (pixels) to the nearest pixel where src(p) is true
function chamfer(W, H, src) {
  const D = new Float32Array(W * H), s2 = Math.SQRT2;
  for (let p = 0; p < W * H; p++) D[p] = src(p) ? 0 : 1e9;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = y * W + x; if (!D[p]) continue; let v = D[p]; if (x > 0) v = Math.min(v, D[p - 1] + 1); if (y > 0) { v = Math.min(v, D[p - W] + 1); if (x > 0) v = Math.min(v, D[p - W - 1] + s2); if (x < W - 1) v = Math.min(v, D[p - W + 1] + s2); } D[p] = v; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const p = y * W + x; if (!D[p]) continue; let v = D[p]; if (x < W - 1) v = Math.min(v, D[p + 1] + 1); if (y < H - 1) { v = Math.min(v, D[p + W] + 1); if (x < W - 1) v = Math.min(v, D[p + W + 1] + s2); if (x > 0) v = Math.min(v, D[p + W - 1] + s2); } D[p] = v; }
  return D;
}
// the outlines of mask B (marching squares between pixel centres): loops of [x, y] in pixel units
function outlines(W, H, B) {
  const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H ? B[y * W + x] : 0);
  // a crossing point on the edge between two pixel centres: horizontal (x,y)-(x+1,y): id 2(yW'+x), vertical: +1
  const W1 = W + 2, idH = (x, y) => ((y + 1) * W1 + (x + 1)) * 2, idV = (x, y) => ((y + 1) * W1 + (x + 1)) * 2 + 1;
  const ptOf = (id) => { const v = id & 1, k = id >> 1, x = (k % W1) - 1, y = ((k / W1) | 0) - 1; return v ? [x, y + 0.5] : [x + 0.5, y]; };
  const nb = new Map(), link = (a, b) => { (nb.get(a) || nb.set(a, []).get(a)).push(b); (nb.get(b) || nb.set(b, []).get(b)).push(a); };
  for (let y = -1; y < H; y++) for (let x = -1; x < W; x++) {
    const a = at(x, y), b = at(x + 1, y), c = at(x + 1, y + 1), d = at(x, y + 1);   // (corners: tl, tr, br, bl)
    const code = a | (b << 1) | (c << 2) | (d << 3);
    if (code === 0 || code === 15) continue;
    const T = idH(x, y), R = idV(x + 1, y), Bo = idH(x, y + 1), L = idV(x, y);
    const e = [];
    if (a !== b) e.push(T); if (b !== c) e.push(R); if (c !== d) e.push(Bo); if (d !== a) e.push(L);
    if (e.length === 2) link(e[0], e[1]);
    else if (e.length === 4) { if (a) { link(T, L); link(R, Bo); } else { link(T, R); link(Bo, L); } }   // (a saddle: the paved corners kept apart)
  }
  const used = new Set(), loops = [];
  for (const start of nb.keys()) {
    if (used.has(start)) continue;
    const loop = [start]; used.add(start);
    let prev = -1, cur = start;
    for (;;) {
      const nn = (nb.get(cur) || []).filter((q) => q !== prev && !used.has(q));
      if (!nn.length) break;
      prev = cur; cur = nn[0]; used.add(cur); loop.push(cur);
    }
    if (loop.length > 6) loops.push(loop.map(ptOf));
  }
  return loops;
}

// EDGE: wiggly stretches of every outline; ISLAND and HOLE specks. R: { X0, Z0, W, H, M0, src }
export function edges(R, area) {
  const { X0, Z0, W, H } = R, M0 = R.M0, out = [];
  const minPx = SPECK / (RES * RES);
  const P = components(W, H, (p) => M0[p] === 1);
  const big = new Uint8Array(W * H);
  for (let id = 1; id < P.comps.length; id++) if (P.comps[id].n >= minPx) for (const q of P.comps[id].pix) big[q] = 1;
  const toBig = chamfer(W, H, (p) => big[p] === 1);
  const cxz = (c) => [+(X0 + (c.sx / c.n + 0.5) * RES).toFixed(2), +(Z0 + (c.sy / c.n + 0.5) * RES).toFixed(2)];
  for (let id = 1; id < P.comps.length; id++) {
    const c = P.comps[id]; if (c.n >= minPx || !c.pix.some((q) => R.src[q] & 1)) continue;   // (a piece built as a mesh — a step, a plinth's top — is designed, not splat noise)
    let dmin = 1e9; for (const q of c.pix) dmin = Math.min(dmin, toBig[q]);
    if (dmin * RES <= 1.5 && c.n * RES * RES >= 0.1) { const [x, z] = cxz(c); out.push({ type: 'ISLAND', area, x, z, m2: +(c.n * RES * RES).toFixed(2) }); }
  }
  // holes: bare specks enclosed by the big pavings (not touching the raster's border)
  const N = components(W, H, (p) => !big[p]);
  for (let id = 1; id < N.comps.length; id++) {
    const c = N.comps[id]; if (c.edge || c.n >= minPx) continue;
    for (const q of c.pix) big[q] = 1;   // (filled for the outline: the hole is its own finding)
    if (c.n * RES * RES >= 0.1) { const [x, z] = cxz(c); out.push({ type: 'HOLE', area, x, z, m2: +(c.n * RES * RES).toFixed(2) }); }
  }
  // the outlines
  const win = Math.round(WIG_WIN / RES);
  for (const loop of outlines(W, H, big)) {
    // resample at RES along the loop (closed)
    const pts = loop.map(([x, y]) => [X0 + (x + 0.5) * RES, Z0 + (y + 0.5) * RES]);
    let L = 0; const cum = [0];
    for (let i = 1; i <= pts.length; i++) { const a = pts[i - 1], b = pts[i % pts.length]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); cum.push(L); }
    if (L < 4) continue;
    const n = Math.floor(L / RES), rs = [];
    for (let k = 0, s = 0; k < n; k++) { const t = k * RES; while (cum[s + 1] < t) s++; const a = pts[s], b = pts[(s + 1) % pts.length], f = (t - cum[s]) / Math.max(1e-9, cum[s + 1] - cum[s]); rs.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); }
    // smoothed over ±0.75 m (the raster's own steps go)
    const S = WIG_S, sm = rs.map((_, i) => { let x = 0, z = 0; for (let k = -S; k <= S; k++) { const q = rs[(i + k + n) % n]; x += q[0]; z += q[1]; } return [x / (2 * S + 1), z / (2 * S + 1)]; });
    const head = sm.map((_, i) => { const a = sm[(i - 1 + n) % n], b = sm[(i + 1) % n]; return Math.atan2(b[1] - a[1], b[0] - a[0]); });
    const turn = head.map((h, i) => { let t = head[(i + 1) % n] - h; while (t > Math.PI) t -= 2 * Math.PI; while (t < -Math.PI) t += 2 * Math.PI; return t; });
    // (P140, the user's answer to P136) the WA-11 patch paving's outline every 1 m, outward normal: for the patch rule
    if (R.patchLine) {
      const paved = (qx, qz) => { const ii = Math.floor((qx - X0) / RES), jj = Math.floor((qz - Z0) / RES); return ii >= 0 && jj >= 0 && ii < W && jj < H ? big[jj * W + ii] === 1 : false; };
      const patchPx = (qx, qz) => { const ii = Math.floor((qx - X0) / RES), jj = Math.floor((qz - Z0) / RES); return ii >= 0 && jj >= 0 && ii < W && jj < H && (R.src[jj * W + ii] & 4) > 0; };
      const loopId = R.patchLoops = (R.patchLoops || 0) + 1;
      for (let i = 0; i < n; i += 4) {
        const a = sm[(i - 2 + n) % n], b = sm[(i + 2) % n]; let tx = b[0] - a[0], tz = b[1] - a[1]; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
        let nx = -tz, nz = tx; const [px, pz] = rs[i];
        if (paved(px + nx * 0.4, pz + nz * 0.4) && !paved(px - nx * 0.4, pz - nz * 0.4)) { nx = -nx; nz = -nz; }
        if (patchPx(px - nx * 0.4, pz - nz * 0.4)) R.patchLine.push([+px.toFixed(2), +pz.toFixed(2), +nx.toFixed(3), +nz.toFixed(3), loopId, i]);
      }
    }
    const wig = new Float32Array(n);
    for (let i = 0; i < n; i++) { let a = 0, s = 0; for (let k = -(win >> 1); k < win - (win >> 1); k++) { const t = turn[(i + k + n) % n]; a += Math.abs(t); s += t; } wig[i] = (a - Math.abs(s)) * deg; }
    // the flagged stretches (runs over WIG_MAX, joined across ≤ 1 m)
    const bad = Array.from(wig, (v) => v > WIG_MAX);
    if (!bad.some(Boolean)) continue;
    let s0 = bad.findIndex((b) => !b); if (s0 < 0) s0 = 0;
    const runs = []; let cur = null, gap = 0;
    for (let k = 1; k <= n; k++) {
      const i = (s0 + k) % n;
      if (bad[i]) { if (cur && gap <= 4) { cur.b = i; cur.len += gap + 1; } else { cur = { a: i, b: i, len: 1 }; runs.push(cur); } gap = 0; }
      else if (cur) gap++;
    }
    for (const r of runs) {
      const idx = []; for (let k = 0; k < r.len; k++) idx.push((r.a + k) % n);
      const mid = idx[idx.length >> 1], [x, z] = rs[mid];
      let wmax = 0; for (const i of idx) wmax = Math.max(wmax, wig[i]);
      // the samples along it for the meet test: every 0.5 m, with the outward normal (toward the bare side)
      const samples = [];
      for (let k = 0; k < idx.length; k += 2) {
        const i = idx[k], a = sm[(i - 2 + n) % n], b = sm[(i + 2) % n]; let tx = b[0] - a[0], tz = b[1] - a[1]; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
        let nx = -tz, nz = tx; const [px, pz] = rs[i];
        const paved = (qx, qz) => { const ii = Math.floor((qx - X0) / RES), jj = Math.floor((qz - Z0) / RES); return ii >= 0 && jj >= 0 && ii < W && jj < H && big[jj * W + ii] === 1; };
        if (paved(px + nx * 0.4, pz + nz * 0.4) && !paved(px - nx * 0.4, pz - nz * 0.4)) { nx = -nx; nz = -nz; }
        samples.push([+px.toFixed(2), +pz.toFixed(2), +nx.toFixed(3), +nz.toFixed(3)]);
      }
      const ii = Math.floor((x - X0) / RES), jj = Math.floor((z - Z0) / RES);
      let mesh = false; for (let v = -2; v <= 2; v++) for (let u = -2; u <= 2; u++) { const q = (jj + v) * W + ii + u; if (q >= 0 && q < W * H && (R.src[q] & 2)) mesh = true; }
      out.push({ type: 'EDGE', area, x: +x.toFixed(2), z: +z.toFixed(2), len: +(r.len * RES).toFixed(2), wig: Math.round(wmax), mesh, samples });
    }
  }
  // (one finding per ragged place: stretches within 6 m of each other joined, at the longest one's middle)
  const E = out.filter((t) => t.type === 'EDGE'), rest = out.filter((t) => t.type !== 'EDGE'), joined = [];
  for (const t of E.sort((a, b) => b.len - a.len)) {
    const j = joined.find((u) => Math.hypot(u.x - t.x, u.z - t.z) < 6 || u.samples.some(([sx, sz]) => Math.hypot(sx - t.x, sz - t.z) < 3));
    if (j) { j.samples.push(...t.samples); j.len = +(j.len + t.len).toFixed(2); j.wig = Math.max(j.wig, t.wig); j.mesh ||= t.mesh; j.parts++; }
    else joined.push({ ...t, parts: 1 });
  }
  return [...joined, ...rest];
}

// LOT: bare earth boxed in by paving. R: { X0, Z0, W, H, M0, Dm }
export function lots(R, area) {
  const { X0, Z0, W, H, M0, Dm } = R, out = [];
  const dirt = (p) => Dm[p] === 1 && M0[p] !== 1;
  const DD = chamfer(W, H, (p) => !dirt(p));
  const r = 1.5 / RES, core = (p) => DD[p] >= r;
  const toCore = chamfer(W, H, core);
  const open = new Uint8Array(W * H); for (let p = 0; p < W * H; p++) if (dirt(p) && toCore[p] <= r) open[p] = 1;
  const C = components(W, H, (p) => open[p] === 1, true);
  if (C.comps.length <= 1) return out;
  for (let id = 1; id < C.comps.length; id++) {
    const c = C.comps[id], m2 = c.n * RES * RES; if (m2 < 6) continue;
    // the paving it touches: boundary pixels of M0 within 2 px of this component
    const near = new Set(); for (const q of c.pix) { const x = q % W, y = (q / W) | 0; for (let v = -2; v <= 2; v++) for (let u = -2; u <= 2; u++) { const a = x + u, b = y + v; if (a >= 0 && b >= 0 && a < W && b < H && M0[b * W + a] === 1) near.add(b * W + a); } }
    const bins = [0, 0, 0, 0]; let contact = 0;
    for (const q of near) {
      const x = q % W, y = (q / W) | 0;
      if (!(M0[q - 1] !== 1 || M0[q + 1] !== 1 || M0[q - W] !== 1 || M0[q + W] !== 1)) continue;
      // (this pixel's neighbours in the component: the side it faces)
      let nx = 0, nz = 0; for (let v = -2; v <= 2; v++) for (let u = -2; u <= 2; u++) { const a = x + u, b = y + v; if (a >= 0 && b >= 0 && a < W && b < H && C.lab[b * W + a] === id) { nx += u; nz += v; } }
      if (!nx && !nz) continue;
      contact++;
      const ang = Math.atan2(nz, nx); bins[((Math.round(ang / (Math.PI / 2)) % 4) + 4) % 4]++;
    }
    const L = contact * RES, sides = bins.filter((b) => b * RES >= 1.5).length;
    if (!((sides >= 2 && m2 >= 6) || (m2 >= 12 && L >= 6))) continue;
    // its middle: the core pixel deepest in the earth
    let best = -1, bp = c.pix[0]; for (const q of c.pix) if (DD[q] > best) { best = DD[q]; bp = q; }
    out.push({ type: 'LOT', area, x: +(X0 + ((bp % W) + 0.5) * RES).toFixed(2), z: +(Z0 + (((bp / W) | 0) + 0.5) * RES).toFixed(2), m2: +m2.toFixed(1), contact: +L.toFixed(1), sides, across: +(2 * best * RES).toFixed(1) });
  }
  return out;
}
