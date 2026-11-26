// P135 PATH-ENDS (the user, 26.11: "make sure all the paths are complete and not cut off in the middle like here"): the
// paving of every outdoor area the game builds — the terrains' own (Citadel, Zeelich, Desert Island with Kesh, the
// Hamalayi, the Zeelich isles) as the shader draws it (the per-pixel edge distance where a terrain has one, else the
// splat's paving share), and paving built as meshes (the town cobbles' texture, Zeelich's flags) — on a 0.25 m raster,
// thinned to its middle lines. Two faults are listed:
//   END  a paved strip (≤ 7 m wide) whose end reaches nothing within AHEAD m (tests/lib/pathends.js judge): no door's
//        trigger, no building-size solid (a wall, a house, a stair, a parapet, a fence, a bench), no face in the ground
//        (a quay, a stair, a cliff: a jump ≥ 0.3 m), not the sea, no paving again within 3 m. A bin, a lamp, a post or a
//        tree there is a prop, not a destination.
//   GAP  a paving's edge facing other paving straight out across 0.75–5 m of level bare ground with nothing solid
//        between (rays along the edge's normal, ≥ 1.5 m of edge): the way stops short of the next one (the user's photo).
// Not paths: the isles' terrain paving is their landing pads, round squares and WA-11's bare stone patches (noise
// blobs): listed apart, not counted. Ballastra's districts are paved masses over water (no terrain).
// Env: SERVE=1 (or GAME_URL), TAG=before|after, OUT=dir (default captures/paths-135/<TAG>), SHOTS=0 (no pictures),
// ONLY=area,area, AHEAD=2.0, KNOWN=file.json ([{ area, x, z, why }]: ends/gaps accepted as deliberate, within 2.5 m),
// MAXOPEN=n (FAIL above n not accepted; default 0). KNOWN defaults to tests/fixtures/paths-135-known.json, each entry with
// its reason (planted beds enclosed by paving, a fork, a rill's crossing, a porch).
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const TAG = process.env.TAG || 'scan', OUT = process.env.OUT || fileURLToPath(new URL('../captures/paths-135/' + TAG, import.meta.url));
const SHOTS = process.env.SHOTS !== '0', ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null, AHEAD = +(process.env.AHEAD || 2.0);
const MAXOPEN = +(process.env.MAXOPEN || 0), KNOWN = JSON.parse(fs.readFileSync(process.env.KNOWN || fileURLToPath(new URL('./fixtures/paths-135-known.json', import.meta.url)), 'utf8'));   // (KNOWN=none: no list)
fs.mkdirSync(OUT, { recursive: true });
const { browser, page } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.Q ? '&' + process.env.Q : ''));
await menu(page, 'new');
await page.addScriptTag({ path: fileURLToPath(new URL('./lib/pathends.js', import.meta.url)) });
// every outdoor area built (the Zeelich isles, the expansion's districts: whatever this build has)
const areas = await ev(() => { const R = game.regions, ids = []; for (const [id] of R.groups) if (['zeelich', 'desert', 'hamalayi', 'ballastra', 'bl_arches', 'bl_gardens'].includes(id) || id.startsWith('isle_')) { try { R.buildGroup(id, 'scan'); ids.push(id); } catch (e) { ids.push(id + ' (failed: ' + e.message + ')'); } } return ids; });
console.log('areas built:', areas.join(', '));
const grids = await ev(() => PE.grids());
const meshTris = await ev(() => PE.meshes());

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
  const W = Math.ceil((x1 - x0) / RES), H = Math.ceil((z1 - z0) / RES), M = new Uint8Array(W * H), src = new Uint8Array(W * H), Y = new Float32Array(W * H).fill(NaN);
  const fs_ = Gs.map(fAtOf);
  if (fs_.length) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const X = x0 + (x + 0.5) * RES, Z = z0 + (y + 0.5) * RES; for (const f of fs_) if (f(X, Z) < 0) { M[y * W + x] = 1; src[y * W + x] = 1; break; } }
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
  return { X0: x0, Z0: z0, W, H, M, src, Y };
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
  const nbrs = (p) => { const x = p % W, y = (p / W) | 0, out = []; for (let v = -1; v <= 1; v++) for (let u = -1; u <= 1; u++) { if (!u && !v) continue; const a = x + u, b = y + v; if (a >= 0 && b >= 0 && a < W && b < H && S[b * W + a]) out.push(b * W + a); } return out; };
  const branch = (p) => { const out = [p], set = new Set(out); let prev = -1, cur = p; for (;;) { const nn = nbrs(cur).filter((q) => q !== prev && !set.has(q)); if (nn.length !== 1 || nbrs(nn[0]).length > 2) return { px: out, junction: nn.length >= 1 }; prev = cur; cur = nn[0]; out.push(cur); set.add(cur); if (out.length > 8000) return { px: out, junction: false }; } };
  // spurs (the thinning's twigs into a strip's or a square's corners): along a twig the half-width grows about as fast as
  // the twig runs; along a strip's middle it stays. A branch whose length is under 1.6 × the growth of the half-width
  // along it (+ 0.5 m) is a twig: pruned, until none is left
  for (let round = 0; round < 8; round++) {
    let pruned = 0;
    for (let p = 0; p < W * H; p++) {
      if (!S[p] || nbrs(p).length !== 1) continue;
      const b = branch(p); if (!b.junction) continue;
      const last = b.px[b.px.length - 1], len = b.px.length * RES, grow = (D[last] - D[p]) * RES;
      if (len < 1.6 * grow + 0.5) { for (const q of b.px) S[q] = 0; pruned++; }
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
    if (w > 7 || len < 0.75 * w) continue;
    const ex = (p % W + 0.5) * RES + X0, ez = (((p / W) | 0) + 0.5) * RES + Z0, bx = (back % W + 0.5) * RES + X0, bz = (((back / W) | 0) + 0.5) * RES + Z0;
    let dx = ex - bx, dz = ez - bz; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    let tx = ex, tz = ez; for (let k = 0; k < 40; k++) { const x = tx + dx * RES, z = tz + dz * RES; if (!pav(x, z)) break; tx = x; tz = z; }
    let gap = null; for (let a = 0.5; a <= 3; a += 0.25) if (pav(tx + dx * a, tz + dz * a)) { gap = a; break; }
    tips.push({ y: yAt(tx, tz), x: +tx.toFixed(2), z: +tz.toFixed(2), dx: +dx.toFixed(3), dz: +dz.toFixed(3), w: +w.toFixed(2), len: +len.toFixed(1), gap });
  }
  // the gap rays: from each edge pixel along its outward normal (the mean of the bare pixels round it), across bare
  // ground to paving again 0.75–5 m on
  const rays = [];
  for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) {
    const p = y * W + x; if (M[p] !== 1) continue;
    if (M[p - 1] && M[p + 1] && M[p - W] && M[p + W]) continue;
    let nx = 0, nz = 0; for (let v = -2; v <= 2; v++) for (let u = -2; u <= 2; u++) if (!M[(y + v) * W + x + u]) { nx += u; nz += v; }
    const nl = Math.hypot(nx, nz); if (nl < 1e-6) continue; nx /= nl; nz /= nl;
    const sx = X0 + (x + 0.5) * RES, sz = Z0 + (y + 0.5) * RES;
    let hit = null;
    for (let a = 0.5; a <= 5.01; a += RES / 2) { if (pav(sx + nx * a, sz + nz * a)) { hit = a; break; } }
    if (hit == null || hit < 0.75) continue;
    // (an inside corner's own edge: the paving met again within 1 m sideways of the ray's start is the same edge turning)
    rays.push({ y: yAt(sx, sz), x0: +sx.toFixed(2), z0: +sz.toFixed(2), x1: +(sx + nx * hit).toFixed(2), z1: +(sz + nz * hit).toFixed(2), nx, nz, L: hit });
  }
  return { tips, rays, S };
}

const all = [], gapRays = [], rasters = {};
for (const name of names) {
  const R = raster(name); if (!R) continue;
  const A = analyse(R);
  rasters[name] = { ...R, S: A.S };
  const notPath = name.startsWith('isle_') ? 'isle paving: landing pad, round square or WA-11 bare patch (not a path)' : null;
  for (const t of A.tips) {
    const k = Math.floor((t.z - R.Z0) / RES) * R.W + Math.floor((t.x - R.X0) / RES);
    all.push({ type: 'END', area: name, ...t, mesh: (R.src[k] & 2) > 0, notPath: notPath && !(R.src[k] & 2) ? notPath : null, id: all.length });
  }
  for (const r of A.rays) gapRays.push({ area: name, ...r, notPath, id: gapRays.length });
}
const judged = await ev(({ tips, ahead }) => PE.judge(tips, ahead), { tips: all, ahead: AHEAD });
for (const j of judged) Object.assign(all[j.id], { h0: j.h0, hits: j.hits });
const gj = await ev((rays) => PE.gaps(rays), gapRays.map(({ id, x0, z0, x1, z1, y }) => ({ id, x0, z0, x1, z1, y })));
for (const j of gj) Object.assign(gapRays[j.id], j);
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
// (the two sides of one gap are one fault: the second listed within 6 m of the first's far side, facing back, is dropped)
const gaps = [];
for (const g of gapsFound) { if (gaps.some((h) => h.area === g.area && h.dx * g.dx + h.dz * g.dz < -0.8 && Math.hypot(h.x + h.dx * h.L - g.x, h.z + h.dz * h.L - g.z) < 6)) continue; gaps.push(g); }
const isDest = (h) => h.kind !== 'prop';
for (const t of all) {
  const r = t.hits.filter(isDest);
  t.dead = !r.length && t.gap == null;
  t.why = t.gap != null ? `paving again ${t.gap} m on` : t.hits.map((h) => h.kind + (h.kind === 'solid' || h.kind === 'prop' ? ` ${h.size} m` : h.kind === 'face' ? ` ${h.dh} m` : h.kind === 'door' ? ' ' + h.id : '') + ` @${h.a}`).slice(0, 3).join('; ') || 'nothing';
}
const found = [...all.filter((t) => t.dead), ...gaps];
for (const t of found) t.known = KNOWN.find((k) => k.area === t.area && Math.hypot(k.x - t.x, k.z - t.z) < 2.5)?.why || null;
const counted = found.filter((t) => !t.notPath), open_ = counted.filter((t) => !t.known);
console.log(`\n${names.length} areas (${names.join(', ')}); ${all.length} strip ends, ${gapRays.length} gap rays (${openRays.length} open)`);
console.log(`found: ${counted.length} on paths (${counted.filter((t) => t.type === 'END').length} dead ends, ${counted.filter((t) => t.type === 'GAP').length} gaps), ${counted.length - open_.length} accepted as deliberate; ${found.length - counted.length} on isle patches (not paths)`);
for (const t of all) if (!t.notPath) console.log(`${t.dead ? (t.known ? 'KNOWN' : 'DEAD ') : 'ok   '} END ${t.area.padEnd(14)} (${t.x.toFixed(1)}, ${t.z.toFixed(1)}) w ${t.w} m heading (${t.dx}, ${t.dz}) ${t.mesh ? 'mesh ' : ''}${t.known ? '— ' + t.known : t.why}`);
for (const g of gaps) if (!g.notPath) console.log(`${g.known ? 'KNOWN' : 'GAP  '} GAP ${g.area.padEnd(14)} (${g.x.toFixed(1)}, ${g.z.toFixed(1)}) ${g.L} m of bare ground across ${g.edge} m of edge, heading (${g.dx}, ${g.dz})${g.known ? ' — ' + g.known : ''}`);
console.log(`isle patches: ${found.filter((t) => t.notPath).map((t) => `${t.type} ${t.area} (${t.x.toFixed(0)}, ${t.z.toFixed(0)})`).join('; ') || 'none'}`);
// a plan of each area's paving: paving grey, middle lines dark, found ends/gaps red (accepted amber), reached ends green
for (const [name, R] of Object.entries(rasters)) {
  const mine = [...all.filter((t) => t.area === name), ...gaps.filter((g) => g.area === name)];
  fs.writeFileSync(path.join(OUT, `plan-${name}.json`), JSON.stringify({ X0: R.X0, Z0: R.Z0, W: R.W, H: R.H, res: RES, mask: Buffer.from(R.M.map((v, p) => v + (R.S[p] ? 1 : 0))).toString('base64'), ends: mine.map((t) => ({ x: t.x, z: t.z, dead: t.type === 'GAP' || t.dead, known: !!t.known || !!t.notPath, gap: t.type === 'GAP' ? [t.x + t.dx * t.L, t.z + t.dz * t.L] : null })) }));
}
if (SHOTS) for (const t of counted) {
  const a = Math.atan2(t.dx, t.dz), back = t.type === 'GAP' ? 2.6 : 3.2;
  await ev(({ x, z, a, area }) => { const G = game; if (area === 'citadel') G.exitRoom({ x, z, a }, true, true); else G.enterRoom(area, { x, z, a }, true, true); G.hero.angle = a; G.camRig.lba && (G.camRig.lba.init = false); G.step(1.2); G.renderer.render(); }, { x: t.x - t.dx * back, z: t.z - t.dz * back, a, area: t.area });
  t.shot = `${t.type.toLowerCase()}-${t.area}-${Math.round(t.x)}_${Math.round(t.z)}.png`;
  await page.screenshot({ path: path.join(OUT, t.shot), timeout: 180000 });
}
fs.writeFileSync(path.join(OUT, 'found.json'), JSON.stringify(found.map(({ hits, ...t }) => t), null, 1));
fs.writeFileSync(path.join(OUT, 'ends.json'), JSON.stringify(all, null, 1));
check(`paths cut off: dead ends and gaps on paths (≤ ${MAXOPEN} not accepted)`, open_.length <= MAXOPEN, open_.map((t) => `${t.type} ${t.area} (${t.x}, ${t.z})`));
done();
await browser.close();
