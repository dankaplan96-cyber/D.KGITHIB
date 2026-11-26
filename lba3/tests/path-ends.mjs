// P140 (the user, 26.11, on P136's own after picture: "still not complete!!!" — a ragged paving edge against a dirt lot,
// a kerb facing open dirt, a kerbed bare rectangle in the paving): two more rules, tests/lib/pathedges.mjs —
//   EDGE  every paving edge a clean line (straight, a smooth curve, a corner): a wiggly stretch (splat noise, a notch, a
//         grid's saw-tooth), a paving speck by an edge (ISLAND) or a bare speck in a paving (HOLE) is a fault, unless the
//         edge meets a wall, a face, the sea or a floor there / something stands over the hole.
//   LOT   bare earth >= 3 m across boxed in by paving (two sides, or >= 12 m2 along >= 6 m of it): an unfinished lot.
//   The isles' WA-11 patches are judged now (the user's answer to P136); the ground under a deck island's decks is not.
//   The line judged is the one the shader draws: run with Q=rockedge=new while ROCK-EDGES is not yet the default (the
//   user's decision, 26.11), so the traced lines are read (pathends.js grid).
//   Env (P140): KNOWN140=file.json ([{ area, x, z, type, why }]: true edges / designed beds, within 3 m), RAW=file (the
//   per-area fields written, gzip JSON), REPLAY=file (no browser: EDGE and LOT from a RAW, unjudged, for tuning),
//   SPOTS=found140.json (also picture these places: a before run's findings, for the after pictures).
import { launch, open, menu, checker } from './lib/boot.mjs';
import { edges as edgeScan, lots as lotScan } from './lib/pathedges.mjs';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const TAG = process.env.TAG || 'scan', OUT = process.env.OUT || fileURLToPath(new URL('../captures/paths-136/' + TAG, import.meta.url));
const SHOTS = process.env.SHOTS !== '0', ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null, AHEAD = +(process.env.AHEAD || 1.25);
const MAXOPEN = +(process.env.MAXOPEN || 0), KNOWN = process.env.KNOWN === 'none' ? [] : JSON.parse(fs.readFileSync(process.env.KNOWN || fileURLToPath(new URL('./fixtures/paths-136-known.json', import.meta.url)), 'utf8'));   // (KNOWN=none: no list)
const KNOWN140 = process.env.KNOWN140 === 'none' ? [] : JSON.parse(fs.readFileSync(process.env.KNOWN140 || fileURLToPath(new URL('./fixtures/paths-140-known.json', import.meta.url)), 'utf8'));
const REPLAY = process.env.REPLAY ? JSON.parse(zlib.gunzipSync(fs.readFileSync(process.env.REPLAY))) : null;
fs.mkdirSync(OUT, { recursive: true });
let browser = null, page = null, ev = null, grids, meshTris;
if (!REPLAY) {
  ({ browser, page } = await launch({ width: 1280, height: 720 }));
  ev = (f, a) => page.evaluate(f, a);
  await open(page, '?nocine' + (process.env.Q ? '&' + process.env.Q : ''));
  await menu(page, 'new');
  await page.addScriptTag({ path: fileURLToPath(new URL('./lib/pathends.js', import.meta.url)) });
  // every outdoor area built (the Zeelich isles, the expansion's districts: whatever this build has)
  const areas = await ev((only) => { const R = game.regions, ids = []; for (const [id] of R.groups) if ((['zeelich', 'desert', 'hamalayi', 'ballastra', 'bl_arches', 'bl_gardens'].includes(id) || id.startsWith('isle_')) && (!only || only.includes(id) || (id.startsWith('bl_') && only.includes('ballastra')))) { try { R.buildGroup(id, 'scan'); ids.push(id); } catch (e) { ids.push(id + ' (failed: ' + e.message + ')'); } } return ids; }, ONLY);
  console.log('areas built:', areas.join(', '));
  grids = await ev(() => PE.grids());
  if (process.env.COVER) console.log('up-facing mesh surfaces by texture (m², per area):', JSON.stringify(await ev(() => PE.cover()), null, 0));
  meshTris = await ev(() => PE.meshes());
  if (process.env.RAW) fs.writeFileSync(process.env.RAW, zlib.gzipSync(JSON.stringify({ grids, meshTris })));
} else ({ grids, meshTris } = REPLAY);
console.log('ground read as:', grids.map((g) => `${g.name} ${g.mode}`).join(', '));
console.log('isle WA-11 patch paving (grid points, judged since P140):', grids.filter((g) => g.patch).map((g) => `${g.name} ${g.patch}`).join(', ') || 'none', '; under decks, left out:', grids.filter((g) => g.under).map((g) => `${g.name} ${g.under}`).join(', ') || 'none');

// ---------------------------------------------------------------- the rasters (Node)
const RES = 0.25;
const names = [...new Set([...grids.map((g) => g.name), ...Object.keys(meshTris)])].filter((n) => !ONLY || ONLY.includes(n));
function raster(name) {
  const Gs = grids.filter((g) => g.name === name), tris = meshTris[name] || [];
  const fAtOf = (G) => (x, z) => {
    const gx = (x - G.x0) / G.step, gz = (z - G.z0) / G.step;
    if (gx < 0 || gz < 0 || gx > G.n - 1 || gz > G.n - 1) return 1;
    const i = Math.min(G.n - 2, Math.floor(gx)), j = Math.min(G.n - 2, Math.floor(gz)), fx = gx - i, fz = gz - j;
    const a = G.f[j * G.n + i], b = G.f[j * G.n + i + 1], c = G.f[(j + 1) * G.n + i], d = G.f[(j + 1) * G.n + i + 1];
    return fx + fz < 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
  };
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
  for (const G of Gs) for (let j = 0; j < G.n; j++) for (let i = 0; i < G.n; i++) if (G.f[j * G.n + i] < 0) { const x = G.x0 + i * G.step, z = G.z0 + j * G.step; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  for (const t of tris) for (let q = 0; q < 6; q += 2) { x0 = Math.min(x0, t[q]); x1 = Math.max(x1, t[q]); z0 = Math.min(z0, t[q + 1]); z1 = Math.max(z1, t[q + 1]); }
  if (x1 < x0) return null;
  x0 -= 6; z0 -= 6; x1 += 6; z1 += 6;
  const W = Math.ceil((x1 - x0) / RES), H = Math.ceil((z1 - z0) / RES), M = new Uint8Array(W * H), src = new Uint8Array(W * H), Y = new Float32Array(W * H).fill(NaN), Dm = new Uint8Array(W * H);
  const fs_ = Gs.map(fAtOf), ds_ = Gs.map((G) => (G.d ? fAtOf({ ...G, f: G.d }) : null));
  if (fs_.length) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const X = x0 + (x + 0.5) * RES, Z = z0 + (y + 0.5) * RES;
    for (let q = 0; q < fs_.length; q++) if (fs_[q](X, Z) < 0) {
      M[y * W + x] = 1; src[y * W + x] = 1;
      const G = Gs[q]; if (G.pk) { const i = Math.round((X - G.x0) / G.step), j = Math.round((Z - G.z0) / G.step); if (G.pk[j * G.n + i]) src[y * W + x] |= 4; }   // (P140: a WA-11 patch)
      break;
    }
    // (P140: the bare earth, from the first terrain that covers the point)
    for (let q = 0; q < Gs.length; q++) { const G = Gs[q]; if (X < G.x0 || Z < G.z0 || X > G.x0 + (G.n - 1) * G.step || Z > G.z0 + (G.n - 1) * G.step) continue; if (ds_[q] && ds_[q](X, Z) > 0) Dm[y * W + x] = 1; break; }
  }
  for (const t of tris) {
    const [ax, az, bx, bz, cx, cz, ty] = t, den = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(den) < 1e-9) continue;
    const i0 = Math.max(0, Math.floor((Math.min(ax, bx, cx) - x0) / RES)), i1 = Math.min(W - 1, Math.ceil((Math.max(ax, bx, cx) - x0) / RES));
    const j0 = Math.max(0, Math.floor((Math.min(az, bz, cz) - z0) / RES)), j1 = Math.min(H - 1, Math.ceil((Math.max(az, bz, cz) - z0) / RES));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const X = x0 + (i + 0.5) * RES, Z = z0 + (j + 0.5) * RES;
      const l1 = ((bz - cz) * (X - cx) + (cx - bx) * (Z - cz)) / den, l2 = ((cz - az) * (X - cx) + (ax - cx) * (Z - cz)) / den;
      if (l1 >= -1e-6 && l2 >= -1e-6 && l1 + l2 <= 1 + 1e-6) { M[j * W + i] = 1; src[j * W + i] |= 2; if (!(Y[j * W + i] >= ty)) Y[j * W + i] = ty; }
    }
  }
  return { X0: x0, Z0: z0, W, H, M, M0: M.slice(), src, Y, Dm };
}

function analyse(R) {
  const { X0, Z0, W, H } = R, M = R.M;
  // components (4-connected); small specks dropped (< 3 m²)
  const lab = new Int32Array(W * H), sizes = [0];
  for (let p = 0; p < W * H; p++) if (M[p] && !lab[p]) {
    const id = sizes.length, st = [p]; lab[p] = id; let n = 0;
    while (st.length) { const q = st.pop(); n++; const x = q % W, y = (q / W) | 0; for (const [u, v] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) if (u >= 0 && v >= 0 && u < W && v < H && M[v * W + u] && !lab[v * W + u]) { lab[v * W + u] = id; st.push(v * W + u); } }
    sizes.push(n);
  }
  for (let p = 0; p < W * H; p++) if (M[p] && sizes[lab[p]] * RES * RES < 3) M[p] = 0;
  const pav = (x, z) => { const i = Math.floor((x - X0) / RES), j = Math.floor((z - Z0) / RES); return i >= 0 && j >= 0 && i < W && j < H && M[j * W + i] === 1; };
  const yAt = (x, z) => { const i = Math.floor((x - X0) / RES), j = Math.floor((z - Z0) / RES), v = R.Y[j * W + i]; return Number.isFinite(v) ? v : null; };
  // distance to the paving's edge (two-pass chamfer, in pixels)
  const D = new Float32Array(W * H), s2 = Math.SQRT2;
  for (let p = 0; p < W * H; p++) D[p] = M[p] ? 1e9 : 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = y * W + x; if (!D[p]) continue; let v = D[p]; v = Math.min(v, x > 0 ? D[p - 1] + 1 : 1); if (y > 0) { v = Math.min(v, D[p - W] + 1); if (x > 0) v = Math.min(v, D[p - W - 1] + s2); if (x < W - 1) v = Math.min(v, D[p - W + 1] + s2); } else v = Math.min(v, 1); D[p] = v; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const p = y * W + x; if (!D[p]) continue; let v = D[p]; v = Math.min(v, x < W - 1 ? D[p + 1] + 1 : 1); if (y < H - 1) { v = Math.min(v, D[p + W] + 1); if (x < W - 1) v = Math.min(v, D[p + W + 1] + s2); if (x > 0) v = Math.min(v, D[p + W - 1] + s2); } else v = Math.min(v, 1); D[p] = v; }
  // the middle lines (Zhang-Suen thinning)
  const S = M.slice();
  const nb = (p) => { const x = p % W, y = (p / W) | 0; const g = (u, v) => (u >= 0 && v >= 0 && u < W && v < H ? S[v * W + u] : 0); return [g(x, y - 1), g(x + 1, y - 1), g(x + 1, y), g(x + 1, y + 1), g(x, y + 1), g(x - 1, y + 1), g(x - 1, y), g(x - 1, y - 1)]; };
  for (let changed = true; changed;) {
    changed = false;
    for (const pass of [0, 1]) {
      const del = [];
      for (let p = 0; p < W * H; p++) {
        if (!S[p]) continue;
        const P = nb(p), B = P.reduce((a, b) => a + b, 0); if (B < 2 || B > 6) continue;
        let A = 0; for (let k = 0; k < 8; k++) if (!P[k] && P[(k + 1) % 8]) A++; if (A !== 1) continue;
        if (pass === 0 ? P[0] * P[2] * P[4] || P[2] * P[4] * P[6] : P[0] * P[2] * P[6] || P[0] * P[4] * P[6]) continue;
        del.push(p);
      }
      for (const p of del) S[p] = 0;
      if (del.length) changed = true;
    }
  }
  // (P136: the thinning leaves staircases, 4-connected steps whose corner pixels have two neighbours: a strip's tip
  //  ending on such a step had two neighbours and was never seen as an end. A corner pixel whose neighbours stay one
  //  piece without it is taken out, so the lines are 8-thin)
  for (let p = 0; p < W * H; p++) {
    if (!S[p]) continue;
    const P = nb(p), n = P.reduce((a, b) => a + b, 0); if (n < 2) continue;
    if (!((P[0] && P[2]) || (P[2] && P[4]) || (P[4] && P[6]) || (P[6] && P[0]))) continue;
    const par = [0, 1, 2, 3, 4, 5, 6, 7], f = (k) => (par[k] === k ? k : (par[k] = f(par[k]))), u = (a, b) => { if (P[a] && P[b]) par[f(a)] = f(b); };
    for (let k = 0; k < 8; k++) { u(k, (k + 1) % 8); if (!(k & 1)) u(k, (k + 2) % 8); }
    const roots = new Set(); for (let k = 0; k < 8; k++) if (P[k]) roots.add(f(k));
    if (roots.size === 1) S[p] = 0;
  }
  const nbrs = (p) => { const x = p % W, y = (p / W) | 0, out = []; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { if (!u && !v) continue; const a = x + u, b = y + v; if (a >= 0 && b >= 0 && a < W && b < H && S[b * W + a]) out.push(b * W + a); } return out; };
  const branch = (p) => { const out = [p], set = new Set(out); let prev = -1, cur = p; for (;;) { const nn = nbrs(cur).filter((q) => q !== prev && !set.has(q)); if (nn.length !== 1 || nbrs(nn[0]).length > 2) return { px: out, junction: nn.length >= 1 }; prev = cur; cur = nn[0]; out.push(cur); set.add(cur); if (out.length > 8000) return { px: out, junction: false }; } };
  // spurs (the thinning's twigs into a strip's or a square's corners): along a twig the half-width grows about as fast as
  // the twig runs; along a strip's middle it stays. A branch whose length is under 1.6 × the growth of the half-width
  // along it (+ 0.5 m) is a twig: pruned, until none is left.
  // (P136: unless it is a strip: from near its tip, ≥ max(1.5 m, 0.75 × its width) along it, its half-width stays within
  //  30 % and ≥ 0.5 m. P135 pruned a stub off a square as a twig — the half-width grows into the square behind it —
  //  so the user's south lane, ending in the dirt by the signpost, was never seen)
  const stripLike = (px) => {
    const Ds = px.map((q) => D[q] * RES);
    for (let s0 = 0; s0 < px.length; s0++) {
      if (Ds[s0] < 0.5) continue;
      if (s0 * RES > Ds[s0] + 0.75) break;
      const need = Math.max(1.5, 1.5 * Ds[s0]) / RES;
      if (s0 + need >= px.length) break;
      let lo = 1e9, hi = 0; for (let k = s0; k <= s0 + need; k++) { lo = Math.min(lo, Ds[k]); hi = Math.max(hi, Ds[k]); }
      if (lo >= 0.5 && hi <= 1.3 * lo) return true;
    }
    return false;
  };
  for (let round = 0; round < 8; round++) {
    let pruned = 0;
    for (let p = 0; p < W * H; p++) {
      if (!S[p] || nbrs(p).length !== 1) continue;
      const b = branch(p); if (!b.junction) continue;
      const last = b.px[b.px.length - 1], len = b.px.length * RES, grow = (D[last] - D[p]) * RES;
      if (len < 1.6 * grow + 0.5 && !stripLike(b.px)) { for (const q of b.px) S[q] = 0; pruned++; }
    }
    if (!pruned) break;
  }
  // the ends: a strip (≤ 7 m wide) running ≥ 0.75 × its width to its end
  const tips = [];
  for (let p = 0; p < W * H; p++) {
    if (!S[p] || nbrs(p).length !== 1) continue;
    const b = branch(p), px = b.px, len = px.length * RES;
    const back = px[Math.min(px.length - 1, Math.round(2 / RES))];
    const ws = px.slice(0, Math.max(3, Math.round(4 / RES))).map((q) => D[q] * RES * 2).sort((a, c) => a - c);
    const w = ws[ws.length >> 1] || D[p] * RES * 2;
    if (w > 7 || (len < 0.75 * w && !stripLike(px))) continue;
    const ex = (p % W + 0.5) * RES + X0, ez = (((p / W) | 0) + 0.5) * RES + Z0, bx = (back % W + 0.5) * RES + X0, bz = (((back / W) | 0) + 0.5) * RES + Z0;
    let dx = ex - bx, dz = ez - bz; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    let tx = ex, tz = ez; for (let k = 0; k < 40; k++) { const x = tx + dx * RES, z = tz + dz * RES; if (!pav(x, z)) break; tx = x; tz = z; }
    let gap = null; for (let a = 0.5; a <= 3; a += 0.25) if (pav(tx + dx * a, tz + dz * a)) { gap = a; break; }
    tips.push({ y: yAt(tx, tz), x: +tx.toFixed(2), z: +tz.toFixed(2), dx: +dx.toFixed(3), dz: +dz.toFixed(3), w: +w.toFixed(2), len: +len.toFixed(1), gap });
  }
  // the gap rays: from each edge pixel along its outward normal (the mean of the bare pixels round it), across bare
  // ground to paving again 0.3–6 m on (P136: P135 asked 0.75–5 m)
  const rays = [];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const p = y * W + x; if (M[p] !== 1) continue;
    if (M[p - 1] && M[p + 1] && M[p - W] && M[p + W]) continue;
    let nx = 0, nz = 0; for (let v = -2; v <= 2; v++) for (let u = -2; u <= 2; u++) if (!M[(y + v) * W + x + u]) { nx += u; nz += v; }
    const nl = Math.hypot(nx, nz); if (nl < 1e-6) continue; nx /= nl; nz /= nl;
    const sx = X0 + (x + 0.5) * RES, sz = Z0 + (y + 0.5) * RES;
    let hit = null;
    for (let a = 0.375; a <= 6.01; a += RES / 2) { if (pav(sx + nx * a, sz + nz * a)) { hit = a; break; } }
    if (hit == null || hit < 0.3) continue;
    // (an inside corner's own edge: the paving met again within 1 m sideways of the ray's start is the same edge turning)
    rays.push({ y: yAt(sx, sz), x0: +sx.toFixed(2), z0: +sz.toFixed(2), x1: +(sx + nx * hit).toFixed(2), z1: +(sz + nz * hit).toFixed(2), nx, nz, L: hit });
  }
  return { tips, rays, S };
}

const all = [], gapRays = [], rasters = {}, f140 = [], patchLines = [];
for (const name of names) {
  const R = raster(name); if (!R) continue;
  const A = analyse(R);
  rasters[name] = { ...R, S: A.S };
  const notPath = null;   // (P136: every area's designed paving is judged; the isles' WA-11 bare patches are left out in PE.grids)
  for (const t of A.tips) {
    const k = Math.floor((t.z - R.Z0) / RES) * R.W + Math.floor((t.x - R.X0) / RES);
    all.push({ type: 'END', area: name, ...t, mesh: (R.src[k] & 2) > 0, patch: (R.src[k] & 4) > 0, notPath: notPath && !(R.src[k] & 2) ? notPath : null, id: all.length });
  }
  const pat = (x, z) => { const i = Math.floor((x - R.X0) / RES), j = Math.floor((z - R.Z0) / RES); return i >= 0 && j >= 0 && i < R.W && j < R.H && (R.src[j * R.W + i] & 4) > 0; };
  for (const r of A.rays) gapRays.push({ area: name, ...r, notPath, patch: pat(r.x0, r.z0) || pat(r.x1 - r.nx * 0.2, r.z1 - r.nz * 0.2), id: gapRays.length });
  // (P140: the edges and the lots, on the paving as drawn, specks kept)
  R.patchLine = [];
  f140.push(...edgeScan(R, name), ...lotScan(R, name));
  // (the patch outline's outer side bare earth: a worn path joins the piece there)
  const dirtAt = (x, z) => { const i = Math.floor((x - R.X0) / RES), j = Math.floor((z - R.Z0) / RES); return i >= 0 && j >= 0 && i < R.W && j < R.H && R.Dm[j * R.W + i] === 1; };
  for (const s of R.patchLine) patchLines.push({ area: name, s, path: dirtAt(s[0] + s[2] * 0.5, s[1] + s[3] * 0.5) });
}
// ---------------------------------------------------------------- P140: EDGE and LOT
const isKnown140 = (t) => KNOWN140.find((k) => k.area === t.area && (!k.type || k.type === t.type) && Math.hypot(k.x - t.x, k.z - t.z) < (k.r || 3))?.why || null;
const line140 = (t) => `${t.type.padEnd(6)} ${t.area.padEnd(14)} (${t.x.toFixed(1)}, ${t.z.toFixed(1)}) ` + (t.type === 'EDGE' ? `${t.len} m of edge, wiggle ${t.wig}°${t.mesh ? ' (mesh paving)' : ''}` : t.type === 'PATCH' ? `${t.len} m of a WA-11 paving patch's edge with no kerb, wall, cliff, deck or path` : t.type === 'LOT' ? `${t.m2} m² of bare earth ${t.across} m across, touching paving along ${t.contact} m on ${t.sides} side(s)` : `${t.m2} m²`);
if (REPLAY) {
  for (const t of f140) { t.known = isKnown140(t); console.log(`${t.known ? 'KNOWN ' : ''}${line140(t)}${t.known ? ' — ' + t.known : ''}`); }
  const c = (ty) => f140.filter((t) => t.type === ty && !t.known).length;
  console.log(`P140 replay (unjudged: no meet test): EDGE ${c('EDGE')}, ISLAND ${c('ISLAND')}, HOLE ${c('HOLE')}, LOT ${c('LOT')}`);
  fs.writeFileSync(path.join(OUT, 'found140-replay.json'), JSON.stringify(f140.map(({ samples, ...t }) => t), null, 1));
  process.exit(0);
}
const judged = await ev(({ tips, ahead }) => PE.judge(tips, ahead), { tips: all, ahead: AHEAD });
for (const j of judged) Object.assign(all[j.id], { h0: j.h0, hits: j.hits });
const gj = await ev((rays) => PE.gaps(rays), gapRays.map(({ id, x0, z0, x1, z1, y }) => ({ id, x0, z0, x1, z1, y })));
for (const j of gj) Object.assign(gapRays[j.id], j);
{ const pr = gapRays.filter((r) => r.open && r.patch), kn = await ev(({ a, b }) => [PE.kerbNear(a, 0.45), PE.kerbNear(b, 0.45)], { a: pr.map((r) => [r.x0 + r.nx * 0.15, r.z0 + r.nz * 0.15]), b: pr.map((r) => [r.x1 - r.nx * 0.15, r.z1 - r.nz * 0.15]) });
  pr.forEach((r, i) => { if (kn[0][i] || kn[1][i]) { r.open = false; r.by = 'kerb (a WA-11 patch)'; } }); }
// the open rays in clusters (starts within 1 m of each other, the same way within 30°); a gap is ≥ 6 rays (1.5 m of
// edge, a path's width: fewer are an inside corner's own edge)
const openRays = gapRays.filter((r) => r.open), used = new Set(), gapsFound = [];
for (const r of openRays) {
  if (used.has(r)) continue;
  const cl = [r]; used.add(r);
  for (let i = 0; i < cl.length; i++) for (const q of openRays) if (!used.has(q) && q.area === cl[i].area && Math.hypot(q.x0 - cl[i].x0, q.z0 - cl[i].z0) < 1.0 && q.nx * r.nx + q.nz * r.nz > 0.86) { used.add(q); cl.push(q); }
  if (cl.length < 6) continue;
  const m = (k) => cl.reduce((s, q) => s + q[k], 0) / cl.length;
  const nx = m('nx'), nz = m('nz'), nl = Math.hypot(nx, nz);
  gapsFound.push({ type: 'GAP', area: r.area, x: +m('x0').toFixed(2), z: +m('z0').toFixed(2), dx: +(nx / nl).toFixed(3), dz: +(nz / nl).toFixed(3), L: +m('L').toFixed(2), edge: +(cl.length * RES).toFixed(2), notPath: r.notPath });
}
// (P136: the gaps a wall or a deck closed, clustered the same way and listed for review by eye: a wall is any
//  non-prop box, a deck any floor over the ground, so each closing is looked at, not trusted)
const closedRays = gapRays.filter((r) => !r.open && r.by && (r.by === 'deck' || r.by.startsWith('wall'))), usedC = new Set(), closed = [];
for (const r of closedRays) {
  if (usedC.has(r)) continue;
  const cl = [r]; usedC.add(r);
  for (let i = 0; i < cl.length; i++) for (const q of closedRays) if (!usedC.has(q) && q.area === cl[i].area && Math.hypot(q.x0 - cl[i].x0, q.z0 - cl[i].z0) < 1.0 && q.nx * r.nx + q.nz * r.nz > 0.86) { usedC.add(q); cl.push(q); }
  if (cl.length < 6) continue;
  const m = (k) => cl.reduce((s2, q) => s2 + q[k], 0) / cl.length;
  closed.push({ area: r.area, x: +m('x0').toFixed(1), z: +m('z0').toFixed(1), L: +m('L').toFixed(2), edge: +(cl.length * RES).toFixed(2), by: r.by });
}
for (const c of closed) console.log(`CLOSED GAP ${c.area.padEnd(14)} (${c.x}, ${c.z}) ${c.L} m across ${c.edge} m of edge, closed by ${c.by}`);
// (the two sides of one gap are one fault: the second listed within 6 m of the first's far side, facing back, is dropped)
const gaps = [];
for (const g of gapsFound) { if (gaps.some((h) => h.area === g.area && h.dx * g.dx + h.dz * g.dz < -0.8 && Math.hypot(h.x + h.dx * h.L - g.x, h.z + h.dz * h.L - g.z) < 6)) continue; gaps.push(g); }
const isDest = (h) => h.kind !== 'prop';
{ const pt = all.filter((t) => t.patch), kn = await ev((pts) => PE.kerbNear(pts, 0.6), pt.map((t) => [t.x + t.dx * 0.2, t.z + t.dz * 0.2]));
  pt.forEach((t, i) => { if (kn[i]) t.hits.push({ kind: 'kerb', a: 0.2 }); }); }   // (P140: a WA-11 patch's kerbed end)
for (const t of all) {
  const r = t.hits.filter(isDest);
  t.dead = !r.length;   // (P136: paving again a little way on is no excuse: the two almost meet)
  t.why = (t.gap != null ? `paving again ${t.gap} m on; ` : '') + [...t.hits.filter(isDest), ...t.hits.filter((h) => !isDest(h))].map((h) => h.kind + (h.kind === 'solid' || h.kind === 'prop' ? ` ${h.size} m` : h.kind === 'face' ? ` ${h.dh} m` : h.kind === 'door' ? ' ' + h.id : '') + ` @${h.a}`).slice(0, 3).join('; ') || 'nothing';
}
// (a gap found at a dead end is the same fault: listed once, as the end)
const deadEnds = all.filter((t) => t.dead);
const found = [...deadEnds, ...gaps.filter((g) => !deadEnds.some((t) => t.area === g.area && Math.hypot(t.x - g.x, t.z - g.z) < 3))];
for (const t of found) t.known = KNOWN.find((k) => k.area === t.area && Math.hypot(k.x - t.x, k.z - t.z) < 2.5)?.why || null;
const counted = found.filter((t) => !t.notPath), open_ = counted.filter((t) => !t.known);
console.log(`\n${names.length} areas (${names.join(', ')}); ${all.length} strip ends, ${gapRays.length} gap rays (${openRays.length} open)`);
console.log(`found: ${counted.length} on paths (${counted.filter((t) => t.type === 'END').length} dead ends, ${counted.filter((t) => t.type === 'GAP').length} gaps), ${counted.length - open_.length} accepted as deliberate; ${found.length - counted.length} on isle patches (not paths)`);
for (const t of all) if (!t.notPath) console.log(`${t.dead ? (t.known ? 'KNOWN' : 'DEAD ') : 'ok   '} END ${t.area.padEnd(14)} (${t.x.toFixed(1)}, ${t.z.toFixed(1)}) w ${t.w} m heading (${t.dx}, ${t.dz}) ${t.mesh ? 'mesh ' : ''}${t.known ? '— ' + t.known : t.why}`);
for (const g of found) if (g.type === 'GAP' && !g.notPath) console.log(`${g.known ? 'KNOWN' : 'GAP  '} GAP ${g.area.padEnd(14)} (${g.x.toFixed(1)}, ${g.z.toFixed(1)}) ${g.L} m of bare ground across ${g.edge} m of edge, heading (${g.dx}, ${g.dz})${g.known ? ' — ' + g.known : ''}`);
console.log(`isle patches: ${found.filter((t) => t.notPath).map((t) => `${t.type} ${t.area} (${t.x.toFixed(0)}, ${t.z.toFixed(0)})`).join('; ') || 'none'}`);
// a plan of each area's paving: paving grey, middle lines dark, found ends/gaps red (accepted amber), reached ends green
for (const [name, R] of Object.entries(rasters)) {
  const mine = [...all.filter((t) => t.area === name), ...gaps.filter((g) => g.area === name)];
  fs.writeFileSync(path.join(OUT, `plan-${name}.json`), JSON.stringify({ X0: R.X0, Z0: R.Z0, W: R.W, H: R.H, res: RES, mask: Buffer.from(R.M.map((v, p) => v + (R.S[p] ? 1 : 0))).toString('base64'), ends: mine.map((t) => ({ x: t.x, z: t.z, dead: t.type === 'GAP' || t.dead, known: !!t.known || !!t.notPath, gap: t.type === 'GAP' ? [t.x + t.dx * t.L, t.z + t.dz * t.L] : null })) }));
}
// (P136: a play-camera picture of every end, dead or reached, and every gap: each is reviewed by eye)
if (SHOTS && process.env.SHOTS136 !== '0') for (const t of [...all, ...found.filter((g) => g.type === 'GAP')]) {   // (P140: SHOTS136=0 leaves out P136's own pictures; the faults are pictured below)
  const a = Math.atan2(t.dx, t.dz), back = t.type === 'GAP' ? 2.6 : 3.2;
  await ev(({ x, z, a, area }) => { const G = game; if (area === 'citadel') G.exitRoom({ x, z, a }, true, true); else G.enterRoom(area, { x, z, a }, true, true); G.hero.angle = a; G.camRig.lba && (G.camRig.lba.init = false); G.step(1.2); G.renderer.render(); }, { x: t.x - t.dx * back, z: t.z - t.dz * back, a, area: t.area });
  t.shot = `${t.type === 'GAP' ? 'gap' : t.dead ? 'dead' : 'end'}-${t.area}-${Math.round(t.x)}_${Math.round(t.z)}.png`;
  await page.screenshot({ path: path.join(OUT, t.shot), timeout: 180000 });
}
// (P140) a ragged stretch is a true edge where most of it meets a wall, a face, the sea or a floor (a house standing on
// the paving's edge hides it); a hole is hidden where something stands over it
const eds = f140.filter((t) => t.type === 'EDGE');
const meets = await ev((list) => list.map((S) => PE.edgeMeet(S)), eds.map((t) => t.samples.map(([x, z, nx, nz]) => [x, z, nx, nz, NaN])));
eds.forEach((t, i) => { const m = meets[i], hit = m.filter(Boolean); t.met = hit.length / Math.max(1, m.length); t.metBy = [...new Set(hit)].join('/'); });
// (P140, the user's answer to P136: every WA-11 paving patch ends at a kerb, a wall, a cliff, a deck, or joins a path:
//  its outline sampled every 1 m; 2 m or more in a row with none of these is a PATCH fault)
{
  const pv = patchLines.filter((p) => !p.path), res = [];
  for (let i = 0; i < pv.length; i += 400) res.push(...(await ev((S) => PE.patchEnds(S), pv.slice(i, i + 400).map((p) => p.s.slice(0, 4)))));
  pv.forEach((p, i) => { p.v = res[i]; });
  for (const p of patchLines) if (p.path) p.v = 'path';
  const tally = {}; for (const p of patchLines) tally[p.v || 'none'] = (tally[p.v || 'none'] || 0) + 1;
  console.log('WA-11 patch outlines (samples every 1 m):', JSON.stringify(tally));
  let run = [];
  const flush = () => { if (run.length >= 2) { const m = run[run.length >> 1]; f140.push({ type: 'PATCH', area: m.area, x: m.s[0], z: m.s[1], len: run.length, samples: run.map((p) => p.s.slice(0, 4)) }); } run = []; };
  for (let i = 0; i < patchLines.length; i++) {
    const p = patchLines[i], q = patchLines[i - 1];
    if (run.length && (q.area !== p.area || q.s[4] !== p.s[4] || p.s[5] - q.s[5] !== 4)) flush();
    if (!p.v) run.push(p); else flush();
  }
  flush();
}
const hs = f140.filter((t) => t.type === 'HOLE'), cov = await ev((pts) => PE.holeCovered(pts), hs.map((t) => [t.x, t.z]));
hs.forEach((t, i) => { t.covered = cov[i]; });
for (const t of f140) {
  t.known = isKnown140(t);
  // (a ragged stretch under 1.5 m is a convex corner's bevel on the terrain's grid (0.25–1.25 m at Citadel's street
  //  corners, looked at from above): listed, not counted; the notch the user saw measured 2.75 m)
  t.ok = (t.type === 'EDGE' && (t.met >= 0.7 || t.len < 1.5)) || (t.type === 'HOLE' && t.covered);
  t.fault = !t.ok && !t.known;
  console.log(`${t.fault ? 'FAULT ' : t.known ? 'KNOWN ' : 'ok    '}${line140(t)}${t.type === 'EDGE' ? `; meets ${Math.round(t.met * 100)} %${t.metBy ? ' (' + t.metBy + ')' : ''}` : t.type === 'HOLE' ? (t.covered ? '; covered' : '; open') : ''}${t.known ? ' — ' + t.known : ''}`);
}
const open140 = f140.filter((t) => t.fault), cnt = (ty, l = open140) => l.filter((t) => t.type === ty).length;
console.log(`P140: ${f140.length} found (EDGE ${cnt('EDGE', f140)}, ISLAND ${cnt('ISLAND', f140)}, HOLE ${cnt('HOLE', f140)}, PATCH ${cnt('PATCH', f140)}, LOT ${cnt('LOT', f140)}); faults: EDGE ${cnt('EDGE')}, ISLAND ${cnt('ISLAND')}, HOLE ${cnt('HOLE')}, PATCH ${cnt('PATCH')}, LOT ${cnt('LOT')}`);
// (P140 pictures: the play camera from the paving's side, and from above, for every fault and every given spot)
// (one picture pair per place: the faults — P140's, and P136's dead ends and gaps — and the given spots, joined within
//  12 m per area; spots.json lists what each picture shows)
const fromFile = process.env.SPOTS ? JSON.parse(fs.readFileSync(process.env.SPOTS, 'utf8')) : [];
const spots = [];
for (const t of [...open140, ...open_.map((u) => ({ ...u, samples: [[u.x, u.z, u.dx, u.dz]] })), ...fromFile]) {
  const sp = spots.find((u) => u.area === t.area && Math.hypot(u.x - t.x, u.z - t.z) < 12);
  if (sp) { sp.what.push(`${t.type} (${(+t.x).toFixed(1)}, ${(+t.z).toFixed(1)})`); continue; }
  spots.push({ area: t.area, x: +t.x, z: +t.z, samples: t.samples, name: `${t.area}-${Math.round(t.x)}_${Math.round(t.z)}`, what: [`${t.type} (${(+t.x).toFixed(1)}, ${(+t.z).toFixed(1)})`] });
}
fs.writeFileSync(path.join(OUT, 'spots140.json'), JSON.stringify(spots.map(({ samples, ...u }) => ({ ...u, nx: samples?.[0]?.[2] ?? 1, nz: samples?.[0]?.[3] ?? 0 })), null, 1));
console.log(`P140 pictures: ${spots.length} places`);
const seenSpot = new Set();
if (SHOTS) for (const t of spots) {
  if (seenSpot.has(t.name)) continue; seenSpot.add(t.name);
  for (const view of ['play', 'top']) {
    await ev(({ x, z, area, view, nx, nz }) => {
      const G = game, a = Math.atan2(nx, nz), back = 4.5, px = x - nx * back, pz = z - nz * back;   // (he stands on the paving, facing the edge)
      if (area === 'citadel') G.exitRoom({ x: px, z: pz, a }, true, true); else G.enterRoom(area, { x: px, z: pz, a }, true, true);
      G.hero.angle = a; G.camRig.lba && (G.camRig.lba.init = false); G.step(1.2);
      const C = G.camera;
      if (view === 'top') { const y = G.physics.terrain.heightAt(x, z), half = 7; C.position.set(x, y + half * 2.2, z + 0.001); C.up.set(0, 0, -1); C.lookAt(x, y, z); C.updateMatrixWorld(); }
      G.renderer.render();
      if (view === 'top') C.up.set(0, 1, 0);
    }, { x: t.x, z: t.z, area: t.area, view, nx: t.samples?.[0]?.[2] ?? t.nx ?? 1, nz: t.samples?.[0]?.[3] ?? t.nz ?? 0 });
    await page.screenshot({ path: path.join(OUT, `p140-${t.name}-${view}.png`), timeout: 180000 });
  }
}
fs.writeFileSync(path.join(OUT, 'found140.json'), JSON.stringify(f140.map(({ samples, ...t }) => ({ ...t, samples: samples ? [samples[0]] : undefined })), null, 1));
fs.writeFileSync(path.join(OUT, 'closed.json'), JSON.stringify(closed, null, 1));
fs.writeFileSync(path.join(OUT, 'found.json'), JSON.stringify(found.map(({ hits, ...t }) => t), null, 1));
fs.writeFileSync(path.join(OUT, 'ends.json'), JSON.stringify(all, null, 1));
check(`paths cut off: dead ends and gaps on paths (≤ ${MAXOPEN} not accepted)`, open_.length <= MAXOPEN, open_.map((t) => `${t.type} ${t.area} (${t.x}, ${t.z})`));
check('P140 EDGE: every paving edge a clean line (no ragged stretch, paving speck by an edge or bare speck in a paving)', !open140.some((t) => !['LOT', 'PATCH'].includes(t.type)), open140.filter((t) => !['LOT', 'PATCH'].includes(t.type)).map((t) => `${t.type} ${t.area} (${t.x}, ${t.z})`));
check('P140 PATCH: every WA-11 paving patch ends at a kerb, a wall, a cliff or a deck, or joins a path', !open140.some((t) => t.type === 'PATCH'), open140.filter((t) => t.type === 'PATCH').map((t) => `PATCH ${t.area} (${t.x}, ${t.z}) ${t.len} m`));
check('P140 LOT: no bare earth boxed in by paving', !open140.some((t) => t.type === 'LOT'), open140.filter((t) => t.type === 'LOT').map((t) => `LOT ${t.area} (${t.x}, ${t.z}) ${t.m2} m²`));
done();
await browser.close();
