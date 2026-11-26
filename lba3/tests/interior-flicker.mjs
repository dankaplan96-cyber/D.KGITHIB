// FLICKER-142 (the user, 26.11: "check the flickering in rooms, the wall behind Zoé in the kitchen, and apply it to the
// whole game"): z-fighting inside every interior room, from the room's own camera. worldfit.mjs (3) scans the outdoor
// areas from the sky only, so interior walls were never checked.
//   (1) geometry: every drawn static triangle of the room (merged meshes, plain meshes, every instance of an instanced
//       mesh; a draw batch's originals, not the batch; no skinned bodies; a double-sided face counted both ways), two
//       same-facing triangles in one plane within a threshold of each other that overlap, where the overlap can be seen
//       from the room's camera (a ray from the front layer toward each of the room's camera positions leaves the room
//       unblocked) and the two surfaces look different there (colour, texture or where in it, roughness, glow). The
//       threshold follows the depth buffer's step at the room camera's distance (24-bit depth, the camera's own near
//       plane): 3 mm, and for a wall (a vertical face) up to 8 mm, the depth step over how squarely the camera sees it.
//       A material with a polygon offset of 1 or more, or no depth test, is exempt. Clusters (0.6 m cells, one facing)
//       of 0.02 m² or more FAIL; smaller ones are listed.
//   (2) render: the room's camera (where he comes in, and from the floor nearest each cluster), the game's own render
//       path drawn three times: twice the same (any pixel that changes there is noise, left out), then with a sub-pixel
//       jitter (the lens 2 cm along its axis, its view angle opened to match, the near plane 2 % on: only depths change). Pixels that change on a cluster's overlap confirm
//       it ("seen flickering"); changed pixels elsewhere are listed. The render check may confirm a finding, never
//       clear one (SwiftShader's depth is not a GPU's).
//   (3) coverage: every room the region builder registers that is not outdoor is visited; one that fails to build or to
//       enter FAILS (named), never skipped.
//   (4) the depth range fitted to the room (src/engine/roomdepth.js): from each room camera position the floor he walks
//       (and 2.5 m over it) at least 1.5 × the fitted near plane from the lens, the near plane far out from the room
//       camera (> 10 m), the camera's own near plane for a lens inside the room.
// ROOMS=a,b: those rooms only. SHOTS=dir: per room with a cluster (or every room named in ROOMS) the frame and the
// two-frame diff overlay (red = pixels that change between the two jittered frames) as PNG. REPORT=file.json: every
// finding with its coordinates. SPOTS=room@x,z;...: extra render views from those room-local floor spots, with pictures.
// The game is set to chapter 1 by its flags: Zoé home at the kitchen sink (her spot), as the user saw her.
// Automated runtime only (SwiftShader, headless Chromium).
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
const { check, checkVisual, done } = checker();
const { browser, context, page, errs } = await launch({ width: 960, height: 540 });
// ATTR=1 (report only): each drawn part named by where it was drawn — a small recorder in props.js's / kit.js's hooks
// (globalThis.__PLACE_REC, as tests/place-scan.mjs uses them) keeps each part's box in its group and the call sites
// above the Kit; a finding's part is matched to it by its box. Nothing in the game changes with it but the cost.
if (process.env.ATTR) await context.addInitScript(() => {
  const L = new Map();
  const R = (globalThis.__PLACE_REC = { open: () => null, close() {}, merged() {}, tagN: 0, parts: L });
  const rec = (group, geo, m) => {
    if (!group) return;
    if (!geo.boundingBox) geo.computeBoundingBox();
    const b = geo.boundingBox; if (!b || !Number.isFinite(b.min.x)) return;
    const e = m.elements, lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (let c = 0; c < 8; c++) { const x = c & 1 ? b.max.x : b.min.x, y = c & 2 ? b.max.y : b.min.y, z = c & 4 ? b.max.z : b.min.z;
      const w = [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]];
      for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], w[i]); hi[i] = Math.max(hi[i], w[i]); } }
    const st = String(new Error().stack).split('\n').slice(3, 9).map((l) => { const q = /at (?:([\w$.<>]+) \()?.*?\/([\w.-]+\.m?js):(\d+)/.exec(l); return q ? `${q[1] || '?'}@${q[2]}:${q[3]}` : null; }).filter(Boolean).slice(0, 4).join(' < ');
    let l = L.get(group); if (!l) L.set(group, (l = [])); l.push({ lo, hi, st });
  };
  R.add = (kit, geo, m) => rec(kit.group, geo, m);
  R.bpart = (batch, geo, m) => rec(batch.parent, geo, m);
});
const ev = (f, a) => page.evaluate(f, a);
const SHOTS = process.env.SHOTS || null; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ONLY = process.env.ROOMS ? process.env.ROOMS.split(',') : null;
const FAIL_M2 = 0.02;
// SPOTS=room@x,z;room@x,z (room-local floor spots): extra render views with pictures (a before/after pair from one spot)
const SPOTS = {};
for (const e of (process.env.SPOTS || '').split(';').filter(Boolean)) { const [id, xz] = e.split('@'); (SPOTS[id] ??= []).push(xz.split(',').map(Number)); }

await open(page, '?nocine'); await menu(page, 'new');
// chapter 1 (the project) by its flags: Zoé home at the sink (chapter1.js: R.house.npcSpots.zoe), the opening's
// steps done (no tutorial panel over the picture)
await ev(async () => {
  P.settle(); const G = game, ci = G.story.chapters.findIndex((c) => c.key === 'project');
  Object.assign(G.flags, { prologueDone: true, intro: true, chapter: ci, chapterKey: 'project' }); G.hero.hasBall = true; G.story.refreshCast?.(); P.settle();
  const T = await import(location.origin + '/vendor/three/build/three.module.min.js');
  const { textures } = await import(location.origin + '/src/engine/textures.js');
  const texName = new Map(); for (const [k, t] of Object.entries(textures())) if (t?.source) texName.set(t.source.uuid, k);
  const r3 = (v) => Math.round(v * 1000) / 1000;
  const FL = (window.FL = {});

  // ---------------------------------------------------------------- the room's triangles
  FL.collect = (root) => {
    root.updateMatrixWorld(true);
    const shown = (o) => { for (let p = o; p; p = p.parent) { if (!p.visible) return false; if (p === root) break; } return true; };
    const items = [];   // { o, inst, e (16), mats, nTri }
    let n = 0, instSkipped = 0;
    const _m = new T.Matrix4(), _w = new T.Matrix4();
    root.traverse((o) => {
      if (!o.isMesh || o.isSkinnedMesh || o.isBatchedMesh || o.userData.drawBatch || o.userData.shadowProxy || !shown(o)) return;
      const g = o.geometry; if (!g?.attributes?.position) return;
      const nt = (g.index ? g.index.count : g.attributes.position.count) / 3 | 0;
      if (o.isInstancedMesh) {
        if (nt * o.count > 400000) { instSkipped++; return; }
        for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, _m); _w.multiplyMatrices(o.matrixWorld, _m); items.push({ o, inst: i, e: _w.elements.slice(), nt }); n += nt; }
      } else { items.push({ o, inst: -1, e: o.matrixWorld.elements.slice(), nt }); n += nt; }
    });
    // per triangle: corners (P), mesh item (M), vertex ids (V), material (MT), normal + plane (N), flags (F: 1 skip, 2 flipped copy)
    const cap = n * 2;
    const P = new Float32Array(cap * 9), N = new Float32Array(cap * 4), M = new Int32Array(cap), V = new Int32Array(cap * 3), MT = [], F = new Uint8Array(cap);
    let k = 0;
    const matOf = (o, t) => { if (!Array.isArray(o.material)) return o.material; const gr = o.geometry.groups.find((q) => t * 3 >= q.start && t * 3 < q.start + q.count); return gr ? o.material[gr.materialIndex] : o.material[0]; };
    const drawn = (m) => m && m.visible !== false && m.colorWrite !== false && !(m.transparent && (m.opacity ?? 1) < 0.02);
    for (let it = 0; it < items.length; it++) {
      const { o, e, nt } = items[it], g = o.geometry, pos = g.attributes.position, idx = g.index;
      for (let t = 0; t < nt; t++) {
        const m = matOf(o, t); if (!drawn(m)) continue;
        for (let v = 0; v < 3; v++) {
          const i = idx ? idx.getX(t * 3 + v) : t * 3 + v, x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
          V[k * 3 + v] = i;
          P[k * 9 + v * 3] = e[0] * x + e[4] * y + e[8] * z + e[12]; P[k * 9 + v * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; P[k * 9 + v * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
        }
        M[k] = it; MT[k] = m;
        const s = m.side ?? 0;   // 0 front, 1 back, 2 both
        if (s === 1) F[k] |= 2;
        k++;
        if (s === 2) { P.copyWithin(k * 9, (k - 1) * 9, k * 9); V.copyWithin(k * 3, (k - 1) * 3, k * 3); M[k] = it; MT[k] = m; F[k] = 2; k++; }
      }
    }
    for (let t = 0; t < k; t++) {
      const o = t * 9, ux = P[o + 3] - P[o], uy = P[o + 4] - P[o + 1], uz = P[o + 5] - P[o + 2], vx = P[o + 6] - P[o], vy = P[o + 7] - P[o + 1], vz = P[o + 8] - P[o + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const L = Math.hypot(nx, ny, nz);
      if (L < 2e-6) { F[t] |= 1; continue; }
      const sg = F[t] & 2 ? -1 : 1; nx *= sg / L; ny *= sg / L; nz *= sg / L;
      N[t * 4] = nx; N[t * 4 + 1] = ny; N[t * 4 + 2] = nz; N[t * 4 + 3] = nx * P[o] + ny * P[o + 1] + nz * P[o + 2];
    }
    return { items, n: k, P, N, M, V, MT, F, instSkipped };
  };

  // ---------------------------------------------------------------- (1) the scan
  FL.scan = (id, cams, near) => {
    const R = game.rooms[id], D = FL.collect(R.group), { items, n, P, N, M, V, MT, F } = D;
    // the camera's direction (from the room toward the lens) and distance: the room camera is 90 m off, nearly parallel
    const c0 = cams[0];
    let bx0 = Infinity, by0 = Infinity, bz0 = Infinity, bx1 = -Infinity, by1 = -Infinity, bz1 = -Infinity;
    for (let t = 0; t < n; t++) { if (F[t] & 1) continue; for (let v = 0; v < 3; v++) { const x = P[t * 9 + v * 3], y = P[t * 9 + v * 3 + 1], z = P[t * 9 + v * 3 + 2]; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; if (z < bz0) bz0 = z; if (z > bz1) bz1 = z; } }
    const mid = [(bx0 + bx1) / 2, (by0 + by1) / 2, (bz0 + bz1) / 2];
    let vx = c0.x - R.center.x, vy = c0.y - (R.center.y ?? 0), vz = c0.z - R.center.z; const vl = Math.hypot(vx, vy, vz); vx /= vl; vy /= vl; vz /= vl;
    const camD = vl, dz = (camD * camD) / (near * 16777216);   // (the depth buffer's step there: 24 bits, the near plane's own value)
    const thr = (t) => { const ny = N[t * 4 + 1]; if (Math.abs(ny) > 0.3) return 0.003; const c = Math.abs(N[t * 4] * vx + ny * vy + N[t * 4 + 2] * vz); return Math.min(0.008, Math.max(0.003, dz / Math.max(c, 0.05))); };
    const QMAX = 0.008;
    const off = (m) => m.depthTest === false || (m.polygonOffset && Math.abs(m.polygonOffsetFactor ?? 0) + Math.abs(m.polygonOffsetUnits ?? 0) >= 1);
    // planes facing the camera only
    const buckets = new Map();
    for (let t = 0; t < n; t++) {
      if (F[t] & 1) continue;
      if (N[t * 4] * vx + N[t * 4 + 1] * vy + N[t * 4 + 2] * vz < 0.03) continue;
      const key = Math.round(N[t * 4] * 300) + ',' + Math.round(N[t * 4 + 1] * 300) + ',' + Math.round(N[t * 4 + 2] * 300) + ',' + Math.round(N[t * 4 + 3] / 0.02);
      let l = buckets.get(key); if (!l) buckets.set(key, (l = [])); l.push(t);
    }
    const area2 = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - a[1] * b[0]; } return s / 2; };
    const clip = (subj, a, b) => { const out = []; const side = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]); for (let i = 0; i < subj.length; i++) { const P1 = subj[i], P2 = subj[(i + 1) % subj.length], s1 = side(P1), s2 = side(P2); if (s1 >= 0) out.push(P1); if ((s1 >= 0) !== (s2 >= 0)) { const u = s1 / (s1 - s2); out.push([P1[0] + (P2[0] - P1[0]) * u, P1[1] + (P2[1] - P1[1]) * u]); } } return out; };
    const proj = (t, ccw = true) => { const ax = Math.abs(N[t * 4]), ay = Math.abs(N[t * 4 + 1]), az = Math.abs(N[t * 4 + 2]), o = t * 9;
      const f = ax >= ay && ax >= az ? (i) => [P[o + i + 1], P[o + i + 2]] : ay >= az ? (i) => [P[o + i + 2], P[o + i]] : (i) => [P[o + i], P[o + i + 1]];
      let p = [f(0), f(3), f(6)]; if (ccw && area2(p) < 0) p = p.reverse(); return p; };
    const projWith = (s, t) => { const ax = Math.abs(N[s * 4]), ay = Math.abs(N[s * 4 + 1]), az = Math.abs(N[s * 4 + 2]), o = t * 9;
      const f = ax >= ay && ax >= az ? (i) => [P[o + i + 1], P[o + i + 2]] : ay >= az ? (i) => [P[o + i + 2], P[o + i]] : (i) => [P[o + i], P[o + i + 1]];
      let p = [f(0), f(3), f(6)]; if (area2(p) < 0) p = p.reverse(); return p; };
    const unproj = (t, q) => { const nx = N[t * 4], ny = N[t * 4 + 1], nz = N[t * 4 + 2], d = N[t * 4 + 3], ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
      if (ax >= ay && ax >= az) return [(d - ny * q[0] - nz * q[1]) / nx, q[0], q[1]]; if (ay >= az) return [q[1], (d - nz * q[0] - nx * q[1]) / ny, q[0]]; return [q[0], q[1], (d - nx * q[0] - ny * q[1]) / nz]; };
    const bary = (pp, q) => { const [a, b, c] = pp, d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(d) < 1e-12) return [1 / 3, 1 / 3, 1 / 3];
      const u = ((b[1] - c[1]) * (q[0] - c[0]) + (c[0] - b[0]) * (q[1] - c[1])) / d, v = ((c[1] - a[1]) * (q[0] - c[0]) + (a[0] - c[0]) * (q[1] - c[1])) / d; return [u, v, 1 - u - v]; };
    // what a triangle shows at a point q (in the projection of triangle s's plane)
    const look = (t, q, s) => {
      const it = items[M[t]], o = it.o, g = o.geometry, m = MT[t], wts = bary(projWith(s, t), q);
      const at = (name, size) => { const A = g.attributes[name]; if (!A) return null; const r = new Array(size).fill(0); for (let v = 0; v < 3; v++) for (let c = 0; c < size; c++) r[c] += wts[v] * A.getComponent(V[t * 3 + v], c); return r; };
      const col = m.color ? [m.color.r, m.color.g, m.color.b] : [1, 1, 1], vc = m.vertexColors ? at('color', 3) : null;
      if (vc) for (let c = 0; c < 3; c++) col[c] *= vc[c];
      if (o.isInstancedMesh && o.instanceColor) { const c3 = new T.Color(); o.getColorAt(it.inst, c3); col[0] *= c3.r; col[1] *= c3.g; col[2] *= c3.b; }
      let uv = m.map ? at('uv', 2) : null;
      if (uv) { if (m.map.matrixAutoUpdate) m.map.updateMatrix(); const e = m.map.matrix.elements, u = uv[0], v = uv[1]; uv = [e[0] * u + e[3] * v + e[6], e[1] * u + e[4] * v + e[7]]; }
      const rm = at('rm', 2) || [m.roughness ?? 1, m.metalness ?? 0];
      return { col, map: m.map ? (m.map.source?.uuid || m.map.uuid) : null, uv, rm, glow: m.emissive ? m.emissive.getHex() * (m.emissiveIntensity ?? 1) : 0, op: m.transparent ? m.opacity : 1, add: m.blending };
    };
    const fr = (a) => a - Math.floor(a), wrap = (a, b) => { const d = Math.abs(fr(a) - fr(b)); return Math.min(d, 1 - d); };
    const same = (s, t, q) => { if (MT[s] === MT[t] && items[M[s]].o === items[M[t]].o && !MT[s].map && !MT[s].vertexColors) return true;
      const A = look(s, q, s), B = look(t, q, s);
      if (A.map !== B.map || A.glow !== B.glow || A.op !== B.op || A.add !== B.add) return false;
      if (Math.max(...A.col.map((c, i) => Math.abs(c - B.col[i]))) > 0.03) return false;
      if (Math.abs(A.rm[0] - B.rm[0]) > 0.06 || Math.abs(A.rm[1] - B.rm[1]) > 0.06) return false;
      if (A.uv && B.uv && (wrap(A.uv[0], B.uv[0]) > 0.02 || wrap(A.uv[1], B.uv[1]) > 0.02)) return false;
      return true; };
    const pairs = [], seen = new Set();
    for (const [key, l0] of buckets) {
      const [a, b, c, d] = key.split(',').map(Number), list = [...l0, ...(buckets.get(a + ',' + b + ',' + c + ',' + (d + 1)) || [])];
      if (list.length < 2) continue;
      const cells = new Map(), C = 0.5;
      for (const t of list) { const o = t * 9; const x0 = Math.floor(Math.min(P[o], P[o + 3], P[o + 6]) / C), x1 = Math.floor(Math.max(P[o], P[o + 3], P[o + 6]) / C), y0 = Math.floor(Math.min(P[o + 1], P[o + 4], P[o + 7]) / C), y1 = Math.floor(Math.max(P[o + 1], P[o + 4], P[o + 7]) / C), z0 = Math.floor(Math.min(P[o + 2], P[o + 5], P[o + 8]) / C), z1 = Math.floor(Math.max(P[o + 2], P[o + 5], P[o + 8]) / C);
        if ((x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1) > 4000) continue;
        for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) { const ck = x + ',' + y + ',' + z; let cl = cells.get(ck); if (!cl) cells.set(ck, (cl = [])); cl.push(t); } }
      for (const cl of cells.values()) for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) {
        const s = cl[i], t = cl[j], pk = s < t ? s * 4194304 + t : t * 4194304 + s; if (seen.has(pk)) continue; seen.add(pk);
        if (N[s * 4] * N[t * 4] + N[s * 4 + 1] * N[t * 4 + 1] + N[s * 4 + 2] * N[t * 4 + 2] < 0.99995) continue;
        if (off(MT[s]) || off(MT[t])) continue;
        let gap = 0, gmin = Infinity; for (let v = 0; v < 3; v++) { const g = N[s * 4] * (P[t * 9 + v * 3] - P[s * 9]) + N[s * 4 + 1] * (P[t * 9 + v * 3 + 1] - P[s * 9 + 1]) + N[s * 4 + 2] * (P[t * 9 + v * 3 + 2] - P[s * 9 + 2]); gap = Math.max(gap, Math.abs(g)); gmin = Math.min(gmin, g); }
        if (gap > QMAX || gap > Math.max(thr(s), thr(t))) continue;
        let poly = proj(s); const pb = projWith(s, t);
        for (let e = 0; e < 3 && poly.length; e++) poly = clip(poly, pb[e], pb[(e + 1) % 3]);
        if (poly.length < 3) continue;
        const nd = Math.max(Math.abs(N[s * 4]), Math.abs(N[s * 4 + 1]), Math.abs(N[s * 4 + 2])), ar = Math.abs(area2(poly)) / nd;
        if (ar < 0.0004) continue;
        let cx = 0, cy = 0; for (const q of poly) { cx += q[0]; cy += q[1]; }
        const c2 = [cx / poly.length, cy / poly.length];
        if (same(s, t, c2)) continue;
        pairs.push({ s, t, ar, gap, q: c2, c: unproj(s, c2), poly: poly.map((q) => unproj(s, q)) });
      }
    }
    // the sight rays: every triangle of the room on a grid
    const CELL = 0.75, grid = new Map();
    const glassy = (m) => m.transparent && (m.opacity ?? 1) < 0.6;
    for (let t = 0; t < n; t++) {
      if (F[t] & 3 || glassy(MT[t])) continue;
      const o = t * 9, x0 = Math.floor(Math.min(P[o], P[o + 3], P[o + 6]) / CELL), x1 = Math.floor(Math.max(P[o], P[o + 3], P[o + 6]) / CELL), y0 = Math.floor(Math.min(P[o + 1], P[o + 4], P[o + 7]) / CELL), y1 = Math.floor(Math.max(P[o + 1], P[o + 4], P[o + 7]) / CELL), z0 = Math.floor(Math.min(P[o + 2], P[o + 5], P[o + 8]) / CELL), z1 = Math.floor(Math.max(P[o + 2], P[o + 5], P[o + 8]) / CELL);
      if ((x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1) > 20000) continue;
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) { const ck = x + ',' + y + ',' + z; let l = grid.get(ck); if (!l) grid.set(ck, (l = [])); l.push(t); }
    }
    const exitLen = (ox, oy, oz, dx, dy, dz) => { let L = 200; for (const [o, d, lo, hi] of [[ox, dx, bx0, bx1], [oy, dy, by0, by1], [oz, dz, bz0, bz1]]) { if (Math.abs(d) < 1e-9) continue; const s = ((d > 0 ? hi : lo) - o) / d; if (s >= 0) L = Math.min(L, s); } return L + 0.1; };
    const hits = (ox, oy, oz, dx, dy, dz, L, skip) => {
      const done = new Set();
      for (let s = 0; s <= L; s += CELL * 0.4) {
        const ck = Math.floor((ox + dx * s) / CELL) + ',' + Math.floor((oy + dy * s) / CELL) + ',' + Math.floor((oz + dz * s) / CELL);
        if (done.has(ck)) continue; done.add(ck);
        for (const t of grid.get(ck) || []) {
          if (skip.has(t)) continue;
          const o = t * 9, e1x = P[o + 3] - P[o], e1y = P[o + 4] - P[o + 1], e1z = P[o + 5] - P[o + 2], e2x = P[o + 6] - P[o], e2y = P[o + 7] - P[o + 1], e2z = P[o + 8] - P[o + 2];
          const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x, det = e1x * px + e1y * py + e1z * pz;
          if (Math.abs(det) < 1e-12) continue;
          const inv = 1 / det, tx = ox - P[o], ty = oy - P[o + 1], tz = oz - P[o + 2], u = (tx * px + ty * py + tz * pz) * inv; if (u < 0 || u > 1) continue;
          const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, v = (dx * qx + dy * qy + dz * qz) * inv; if (v < 0 || u + v > 1) continue;
          const d = (e2x * qx + e2y * qy + e2z * qz) * inv; if (d > 0.002 && d < L) return true;
        }
      }
      return false;
    };
    // how much of a pair's overlap is seen: five points of it (its centre, its corners pulled a quarter in), each from
    // every camera position
    const visFrac = (p) => {
      const nx = N[p.s * 4], ny = N[p.s * 4 + 1], nz = N[p.s * 4 + 2], skip = new Set([p.s, p.t]), lift = p.gap + 0.003;
      const pts = [p.c, ...p.poly.slice(0, 4).map((q) => q.map((v, i) => v + (p.c[i] - v) * 0.25))];
      let seenN = 0;
      for (const q of pts) {
        const ox = q[0] + nx * lift, oy = q[1] + ny * lift, oz = q[2] + nz * lift;
        if (cams.some((c) => { let dx = c.x - ox, dy = c.y - oy, dz2 = c.z - oz; const L = Math.hypot(dx, dy, dz2); dx /= L; dy /= L; dz2 /= L; return !hits(ox, oy, oz, dx, dy, dz2, exitLen(ox, oy, oz, dx, dy, dz2), skip); })) seenN++;
      }
      return seenN / pts.length;
    };
    // a triangle named by its piece: a merged mesh's part (kit.js mergeGeos keeps where each part starts) by its size
    // and its centre in the room's frame; the material by its name or texture, and the colour there
    const desc = (t, q) => {
      const it = items[M[t]], o = it.o, g = o.geometry, m = MT[t], src = m?.map?.source?.uuid, e = it.e, pos = g.attributes.position;
      let v0 = 0, v1 = pos.count, part = -1;
      const pv = g.userData.partVerts; if (pv) { const vi = V[t * 3]; let lo = 0, hi = pv.length - 1; while (lo < hi) { const md = (lo + hi + 1) >> 1; if (pv[md] <= vi) lo = md; else hi = md - 1; } part = lo; v0 = pv[lo]; v1 = lo + 1 < pv.length ? pv[lo + 1] : pos.count; }
      const b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
      for (let i = v0; i < v1; i++) { const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), w = [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]]; for (let c = 0; c < 3; c++) { b[c] = Math.min(b[c], w[c]); b[c + 3] = Math.max(b[c + 3], w[c]); } }
      const cc = [R.center.x, 0, R.center.z], L = look(t, q, t);
      const col = '#' + L.col.map((c) => Math.round(Math.min(1, c) * 255).toString(16).padStart(2, '0')).join('');
      let site = '';
      const RP = globalThis.__PLACE_REC?.parts;
      if (RP) for (let g = o.parent; g && !site; g = g.parent) { const l = RP.get(g); if (!l) continue; g.updateMatrixWorld(); const ge = g.matrixWorld.elements;
        const tw = (v) => [ge[0] * v[0] + ge[4] * v[1] + ge[8] * v[2] + ge[12], ge[1] * v[0] + ge[5] * v[1] + ge[9] * v[2] + ge[13], ge[2] * v[0] + ge[6] * v[1] + ge[10] * v[2] + ge[14]];
        let best = null, bd = 0.004;
        for (const q of l) { const a = tw(q.lo), c = tw(q.hi), d = Math.max(...[0, 1, 2].map((i) => Math.abs(Math.min(a[i], c[i]) - b[i]) + Math.abs(Math.max(a[i], c[i]) - b[i + 3]))); if (d < bd) { bd = d; best = q; } }
        if (best) site = ' {' + best.st + '}'; }
      return `${o.name || o.type}${part >= 0 ? ' part ' + part : ''}${it.inst >= 0 ? ' inst ' + it.inst : ''} ${[0, 1, 2].map((c) => (b[c + 3] - b[c]).toFixed(3)).join('×')} @ ${[0, 1, 2].map((c) => ((b[c] + b[c + 3]) / 2 - cc[c]).toFixed(3)).join(',')} ${m?.name || (src && texName.get(src)) || (m?.map ? 'map' : '')}${col}${m.side === 2 ? ' double-sided' : ''}${F[t] & 2 ? ' (back face)' : ''}${site}`;
    };
    const cl = new Map();
    for (const p of pairs) {
      const k2 = Math.round(p.c[0] / 0.6) + ',' + Math.round(p.c[1] / 0.6) + ',' + Math.round(p.c[2] / 0.6) + ',' + Math.round(N[p.s * 4] * 4) + ',' + Math.round(N[p.s * 4 + 1] * 4) + ',' + Math.round(N[p.s * 4 + 2] * 4);
      let q = cl.get(k2); if (!q) cl.set(k2, (q = { list: [] })); q.list.push(p);
    }
    const out = [];
    for (const q of cl.values()) {
      q.list.sort((a, b) => b.ar - a.ar);
      let m2 = 0, raw = 0; const shownList = [];
      for (const p of q.list.slice(0, 16)) { const f = visFrac(p); raw += p.ar; if (f > 0) { m2 += p.ar * f; shownList.push(p); } }
      for (const p of q.list.slice(16)) raw += p.ar;
      if (!shownList.length) continue;
      const p = shownList[0], lc = (v) => v.map((x, i) => r3(x - [R.center.x, 0, R.center.z][i]));
      out.push({ room: id, m2: r3(m2), raw: r3(raw), at: p.c.map(r3), local: lc(p.c), n: [N[p.s * 4], N[p.s * 4 + 1], N[p.s * 4 + 2]].map((v) => Math.round(v * 100) / 100), gapMm: Math.round(p.gap * 10000) / 10,
        a: desc(p.s, p.q), b: desc(p.t, p.q), polys: shownList.slice(0, 16).map((x) => x.poly.map((v) => v.map(r3))) });
    }
    out.sort((a, b) => b.m2 - a.m2);
    return { tris: n, meshes: items.length, instSkipped: D.instSkipped, pairs: pairs.length, camD: r3(camD), near, dzMm: Math.round(dz * 10000) / 10, findings: out, bbox: [bx0, by0, bz0, bx1, by1, bz1].map(r3), mid };
  };

  // ---------------------------------------------------------------- (2) the render check
  const gl = G.renderer.renderer.getContext();
  FL.place = (x, z) => {   // he stands there, the room camera settles on him
    const h = G.hero, PH = G.physics, R = G.room, y = PH.groundAt(x, z, (R.center.y ?? 0) + 6);
    h.pos.set(x, y, z); h.vy = 0; h.onGround = true;
    G.camRig.snap(); for (let i = 0; i < 3; i++) G.camRig.update(1 / 60, h.pos, h.angle, false, null);
    R.updateLids?.(h, 1); G.camera.updateMatrixWorld();
    return G.camera.position.clone();
  };
  FL.floorSpots = (R) => {
    const PH = G.physics, out = [];
    const bounds = R.bounds?.length ? R.bounds : [{ x0: R.center.x - 6, x1: R.center.x + 6, z0: R.center.z - 6, z1: R.center.z + 6 }];
    const y0 = PH.groundAt(R.spawn?.x ?? R.center.x, R.spawn?.z ?? R.center.z);
    for (const b of bounds) for (let x = b.x0 + 0.4; x < b.x1 - 0.3; x += 0.6) for (let z = b.z0 + 0.4; z < b.z1 - 0.3; z += 0.6) {
      const gy = PH.groundAt(x, z, y0 + 6);
      if (!Number.isFinite(gy) || gy < y0 - 1.5 || PH.blockedAt(x, z, gy + 0.3, 0.35)) continue;
      out.push({ x, z, y: gy });
    }
    return out;
  };
  const W = () => gl.drawingBufferWidth, H = () => gl.drawingBufferHeight;
  const grab = () => { G.renderer.render(); const w = W(), h = H(), b = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, b); return b; };
  const DIFF = 12;
  FL.renderDiff = (polys, wantShot) => {
    const cam = G.camera, n0 = cam.near, f0 = cam.fov, p0 = cam.position.clone();
    const A = grab(), A2 = grab();
    // the jitter: the lens 2 cm in along its axis with the view angle opened to match at the focus (the picture moves
    // by a few hundred-thousandths of a pixel: no edge changes), the near plane 2 % on — only the depths change
    const fwd = new T.Vector3(); cam.getWorldDirection(fwd);
    const d = G.camRig.look ? cam.position.distanceTo(G.camRig.look) : 90;
    cam.position.addScaledVector(fwd, 0.02); cam.near = n0 * 1.02;
    cam.fov = (2 * Math.atan(Math.tan((f0 * Math.PI) / 360) * d / (d - 0.02)) * 180) / Math.PI;
    cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const B = grab();
    cam.position.copy(p0); cam.near = n0; cam.fov = f0; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const w = W(), h = H(), ch = new Uint8Array(w * h);
    let noise = 0, changed = 0;
    for (let i = 0; i < w * h; i++) {
      const o = i * 4, dA = Math.max(Math.abs(A[o] - A2[o]), Math.abs(A[o + 1] - A2[o + 1]), Math.abs(A[o + 2] - A2[o + 2]));
      if (dA > DIFF) { noise++; continue; }
      const d = Math.max(Math.abs(A[o] - B[o]), Math.abs(A[o + 1] - B[o + 1]), Math.abs(A[o + 2] - B[o + 2]));
      if (d > DIFF) { ch[i] = 1; changed++; }
    }
    // each finding's overlap on the screen: its changed pixels
    const own = new Uint8Array(w * h), per = [];
    const v = new T.Vector3();
    for (const list of polys) {
      let px = 0, inside = 0;
      for (const poly of list) {
        const sp = poly.map((q) => { v.set(q[0], q[1], q[2]).project(cam); return [(v.x + 1) / 2 * w, (v.y + 1) / 2 * h, v.z]; });
        if (sp.some((q) => q[2] > 1 || q[2] < -1)) continue;
        const xs = sp.map((q) => q[0]), ys = sp.map((q) => q[1]);
        const x0 = Math.max(0, Math.floor(Math.min(...xs)) - 1), x1 = Math.min(w - 1, Math.ceil(Math.max(...xs)) + 1), y0 = Math.max(0, Math.floor(Math.min(...ys)) - 1), y1 = Math.min(h - 1, Math.ceil(Math.max(...ys)) + 1);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          let inn = false; for (let a = 0, b = sp.length - 1; a < sp.length; b = a++) { const [xa, ya] = sp[a], [xb, yb] = sp[b]; if ((ya > y + 0.5) !== (yb > y + 0.5) && x + 0.5 < (xb - xa) * (y + 0.5 - ya) / (yb - ya) + xa) inn = !inn; }
          if (!inn) continue;
          const i = y * w + x; inside++; own[i] = 1; if (ch[i]) px++;
        }
      }
      per.push({ px, inside });
    }
    // changed pixels nobody owns: clusters (8-connected) of 20 or more
    const lab = new Int32Array(w * h), others = []; let nl = 0;
    for (let i = 0; i < w * h; i++) {
      if (!ch[i] || own[i] || lab[i]) continue;
      nl++; const st = [i]; lab[i] = nl; let cnt = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
      while (st.length) { const j = st.pop(), x = j % w, y = (j / w) | 0; cnt++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const k2 = yy * w + xx; if (ch[k2] && !own[k2] && !lab[k2]) { lab[k2] = nl; st.push(k2); } } }
      if (cnt >= 20) others.push({ px: cnt, box: [x0, h - 1 - y1, x1, h - 1 - y0] });
    }
    others.sort((a, b) => b.px - a.px);
    let shot = null;
    if (wantShot) {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x2 = c.getContext('2d'), im = x2.createImageData(w, h), im2 = x2.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const s = ((h - 1 - y) * w + x), o = s * 4, d = (y * w + x) * 4;
        im.data[d] = A[o]; im.data[d + 1] = A[o + 1]; im.data[d + 2] = A[o + 2]; im.data[d + 3] = 255;
        if (ch[s]) { im2.data[d] = 255; im2.data[d + 1] = 0; im2.data[d + 2] = 0; } else { im2.data[d] = A[o] * 0.55; im2.data[d + 1] = A[o + 1] * 0.55; im2.data[d + 2] = A[o + 2] * 0.55; } im2.data[d + 3] = 255; }
      x2.putImageData(im, 0, 0); const plain = c.toDataURL('image/png');
      x2.putImageData(im2, 0, 0); const diff = c.toDataURL('image/png');
      shot = { plain, diff };
    }
    return { w, h, noise, changed, per, others: others.slice(0, 8), shot };
  };
});

const all = await ev(() => [...game.regions.of.keys()].filter((id) => { const c = game.regions.centreOf(id); return c && !c.outdoor; }));
const rooms = ONLY ? ONLY.filter((r) => all.includes(r)) : all;
if (ONLY) for (const r of ONLY) if (!all.includes(r)) console.log('NOT A ROOM ' + r);
console.log(`rooms registered (not outdoor): ${all.length}; scanned here: ${rooms.length}`);
const res = [], failedRooms = [], depthBad = [];
for (const id of rooms) {
  const r = await ev(async ({ id }) => {
    const G = game, R = G.regions.ensure(id, 'flicker');
    if (!R) return { id, err: 'not built' };
    G.enterRoom(id, null, true, true); G.step(0.1); G.step(0.1);
    if (G.room !== R) return { id, err: 'not entered' };
    const spots = FL.floorSpots(R);
    const sp0 = R.spawn ? { x: R.spawn.x, z: R.spawn.z } : spots[0] || { x: R.center.x, z: R.center.z };
    // the room's camera positions: where he comes in, and the floor's far corners (the room camera follows him part way)
    const pick = [sp0];
    if (spots.length) for (const f of [(s) => s.x + s.z, (s) => s.x - s.z, (s) => -s.x + s.z, (s) => -s.x - s.z]) pick.push(spots.reduce((a, b) => (f(b) > f(a) ? b : a)));
    const cams = pick.map((s) => { const c = FL.place(s.x, s.z); return { x: c.x, y: c.y, z: c.z }; });
    // (the depth step at the camera's own near plane, camera.js near0: a later fit of the depth range to the room does not
    //  loosen the scan — what is fixed here holds for any camera)
    const near = G.camRig.near0 ?? G.camera.near;
    const S = FL.scan(id, cams, near);
    // (4) the depth range fitted to the room (engine/roomdepth.js), checked with the room's own box: the floor he walks
    // (each floor spot, at his feet and 2.5 m over them) and where he comes in inside it; from the room camera the near
    // plane far out (the depth step far under a millimetre); a lens in the room (a close-up) keeps the camera's own
    const RD = await import(location.origin + '/src/engine/roomdepth.js');
    const cam = G.camera, h = G.hero, p0 = cam.position.clone(), n0 = cam.near;
    // (every floor spot, at his feet and 2.5 m over them, from each of the room camera's positions: nearer to the lens
    //  than 1.5 × the fitted near plane is a fault — what he walks on could be cut)
    FL.place(sp0.x, sp0.z);
    RD.fitRoomDepth(R, cam); const nearIso = cam.near, dIso = cam.position.distanceTo(G.camRig.look ?? R.center); RD.restoreRoomDepth(cam);
    const box = R._depthBox, outside = [], V3 = cam.position.constructor;
    const pts = [{ ...sp0, y: G.physics.groundAt(sp0.x, sp0.z, 6) }, ...spots].flatMap((s) => [0, 2.5].map((dy) => new V3(s.x, (s.y ?? 0) + dy, s.z)));
    for (const c of cams) {
      cam.position.set(c.x, c.y, c.z); RD.fitRoomDepth(R, cam); const nf = cam.near; RD.restoreRoomDepth(cam);
      for (const v of pts) if (v.distanceTo(cam.position) < nf * 1.5 && outside.length < 3) outside.push([+(v.x - R.center.x).toFixed(2), +v.y.toFixed(2), +(v.z - R.center.z).toFixed(2), +nf.toFixed(1)]);
    }
    cam.position.set(h.pos.x + 1.5, h.pos.y + 1.7, h.pos.z + 1.5);
    RD.fitRoomDepth(R, cam); const nearClose = cam.near; RD.restoreRoomDepth(cam);
    cam.position.copy(p0); cam.near = n0; cam.updateProjectionMatrix();
    const depth = { nearIso: +nearIso.toFixed(2), stepMm: +((dIso * dIso) / (nearIso * 16777216) * 1000).toFixed(4), nearClose, base: n0, outside, box: !!box };
    return { id, spots: spots.length, cams: cams.length, sp0, depth, ...S };
  }, { id }).catch((e) => ({ id, err: e.message.slice(0, 300) }));
  if (r.err) { failedRooms.push(r); console.log('ROOM ' + JSON.stringify({ id, err: r.err })); res.push(r); continue; }
  // the render check: where he comes in, then the floor nearest each cluster not yet in a view
  const want = !!SHOTS && (r.findings.length > 0 || !!ONLY);
  const views = await ev(({ id, findings, sp0, want, extra }) => {
    const G = game, R = G.room, spots = FL.floorSpots(R), out = [], left = findings.map((f, i) => i);
    const inView = (p) => { const v = new (G.camera.position.constructor)(p[0], p[1], p[2]).project(G.camera); return Math.abs(v.x) < 0.85 && Math.abs(v.y) < 0.85 && v.z < 1; };
    const shoot = (s, why) => {
      FL.place(s.x, s.z);
      const idx = findings.map((f, i) => i).filter((i) => inView(findings[i].at));
      const d = FL.renderDiff(idx.map((i) => findings[i].polys), want);
      out.push({ why, at: [Math.round((s.x - R.center.x) * 100) / 100, Math.round((s.z - R.center.z) * 100) / 100], idx, ...d });
      for (const i of idx) { const k = left.indexOf(i); if (k >= 0) left.splice(k, 1); }
    };
    shoot(sp0, 'spawn');
    // (SPOTS: the pictures of an earlier run again, from the same floor spots, its views' `at`)
    for (const [x, z] of extra) shoot({ x: R.center.x + x, z: R.center.z + z }, 'spot');
    while (left.length && out.length < 4 && spots.length) {
      const f = findings[left[0]];
      const s = spots.reduce((a, b) => (Math.hypot(b.x - f.at[0], b.z - f.at[2]) < Math.hypot(a.x - f.at[0], a.z - f.at[2]) ? b : a));
      shoot(s, 'cluster ' + left[0]); if (left[0] === findings.indexOf(f)) left.shift();
    }
    return out;
  }, { id, findings: r.findings, sp0: r.sp0, want: want || !!SPOTS[id], extra: SPOTS[id] || [] }).catch((e) => [{ err: e.message.slice(0, 300) }]);
  r.views = views.map((v) => ({ ...v, shot: undefined }));
  for (const [vi, v] of views.entries()) {
    if (v.err) { console.log('  render error', v.err); continue; }
    v.idx.forEach((fi, j) => { const f = r.findings[fi]; f.seenPx = Math.max(f.seenPx || 0, v.per[j].px); f.screenPx = Math.max(f.screenPx || 0, v.per[j].inside); });
    if (v.shot) for (const k of ['plain', 'diff']) fs.writeFileSync(path.join(SHOTS, `${id}-${vi}-${k}.png`), Buffer.from(v.shot[k].split(',')[1], 'base64'));
  }
  const fail = r.findings.filter((f) => f.m2 >= FAIL_M2);
  const dOk = r.depth.box && !r.depth.outside.length && r.depth.nearClose <= r.depth.base + 1e-6 && r.depth.nearIso > 10;
  if (!dOk) depthBad.push({ id, ...r.depth });
  console.log('ROOM ' + JSON.stringify({ id, depthFit: r.depth, tris: r.tris, meshes: r.meshes, camD: r.camD, near: r.near, depthStepMm: r.dzMm, pairs: r.pairs, clusters: r.findings.length, fail: fail.length,
    render: r.views.map((v) => v.err ? { err: v.err } : { why: v.why, at: v.at, changed: v.changed, noise: v.noise, unowned: v.others.map((o) => o.px + 'px@' + o.box.join(',')) }), instSkipped: r.instSkipped || undefined }));
  for (const f of r.findings) console.log(`  ${f.m2 >= FAIL_M2 ? 'FLICKER' : 'small  '} ${id} ${f.m2} m² (raw ${f.raw}) gap ${f.gapMm} mm at local ${f.local.join(', ')} n ${f.n.join(',')} | ${f.a} | ${f.b}${f.seenPx != null ? ` | render: ${f.seenPx} of ${f.screenPx} px changed` : ''}`);
  for (const f of r.findings) delete f.polys;
  res.push(r);
}
if (process.env.REPORT) fs.writeFileSync(process.env.REPORT, JSON.stringify(res, null, 1));
const fails = res.flatMap((r) => (r.findings || []).filter((f) => f.m2 >= FAIL_M2));
const small = res.flatMap((r) => (r.findings || []).filter((f) => f.m2 < FAIL_M2));
const confirmed = fails.filter((f) => f.seenPx > 0).length;
console.log(`clusters: ${fails.length} of ${FAIL_M2} m² or more (${confirmed} seen flickering in the render check), ${small.length} smaller (listed)`);
check(`(3) every interior room built, entered and scanned (${res.length - failedRooms.length} of ${rooms.length}${ONLY ? '' : `; registered ${all.length}`})`, failedRooms.length === 0 && (ONLY || rooms.length === all.length), failedRooms.map((r) => ({ id: r.id, err: r.err })));
check(`(4) the depth range fitted to each room: his floor (and 2.5 m over it) well beyond the near plane from every room camera position, the near plane far out from the room camera (> 10 m), the camera's own near plane for a lens inside the room (${res.length - failedRooms.length - depthBad.length} of ${res.length - failedRooms.length})`, depthBad.length === 0, depthBad.slice(0, 8));
checkVisual(`(1) no visible z-fighting in any room (same-facing faces within the depth step, ${FAIL_M2} m² or more, seen from the room camera): ${fails.length}; smaller, listed: ${small.length}`, fails.length === 0,
  fails.slice(0, 12).map((f) => ({ room: f.room, m2: f.m2, gapMm: f.gapMm, local: f.local, a: f.a, b: f.b, renderPx: f.seenPx })));
await browser.close();
process.exit(done(errs) ? 1 : 0);
