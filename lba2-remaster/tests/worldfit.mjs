// WORLD-FIX: the open world must not swallow its houses, and doors and windows must not lie on top of each other
// (the user, 2026-10-20). A scan over Citadel, Zeelich and Zeelich's islands (Desert Island and the Hamalayi are
// scanned for z-fighting and reported, not judged):
//  (1) every building the builders register (src/game/worldfit.js: the town's houses, the harbour shed, the project's
//      buildings, Zeelich's street, every Esmer house, gatehouse and tower on the islands) against the ground round
//      it: ground over the plinth (the wall eaten), a gap under the plinth (floating), a door sill under the ground
//      or hanging over it, a window at the ground;
//  (2) each wall's openings with everything that stands round them (surrounds, alfiz frames, sills, open shutters,
//      flower boxes, lanterns, signs, downpipes): two that overlap, one that runs into the corner quoins/piers or into
//      the eaves/frieze, two the same; and two buildings whose footprints cut into each other;
//  (3) z-fighting: every drawn static triangle of the area, two coplanar (within 3 mm) same-facing triangles that
//      overlap where the overlap can be seen from above (a ray toward the sky at 30–70° that leaves it unblocked
//      for 8 m; inside a wall or under a floor it is not seen) and the two surfaces look different there (colour,
//      texture or where in it, roughness, glow); clusters of 0.15 m² or more fail, smaller ones are listed;
//  (4) coverage: every tall, big collider that is not one of the registered buildings is listed (a building the scan
//      does not know about), so the list of what is checked stays honest.
// REPORT=<file.json> keeps every finding with its coordinates. GAME_URL as the other tests.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
const { check, done } = checker();
const { browser, page, errs } = await launch({ width: 640, height: 360 });
await open(page, '?nocine');
await menu(page, 'new');

const res = await page.evaluate(async (ONLY) => {
  const G = game, W = G.world, phys = W.physics, T = phys.terrain;
  const { FIT, sideLocal, toWorld } = await import('./src/game/worldfit.js');
  const r2 = (v) => Math.round(v * 100) / 100;
  // ---------------------------------------------------------------- the areas
  const areas = [{ id: 'citadel', root: W.root, x: -76, z: 16, r: 135, judged: true }];
  for (const [id, R] of Object.entries(G.rooms)) {
    if (!R.outdoor) continue;
    const p = R.group.position, r = R.size ? Math.max(...R.size) / 2 + 25 : 140;
    areas.push({ id, root: R.group, x: p.x, z: p.z, r, judged: id === 'zeelich' || !!R.isle });
  }
  const areaOf = (x, z) => areas.find((a) => Math.abs(x - a.x) < a.r && Math.abs(z - a.z) < a.r)?.id ?? null;
  // the ground: the terrain where an area has one (a raised bed or a crate by a wall is not the ground), else the
  // walkable surface (Zeelich's island is a slab of bricks)
  const cloudOf = (x, z) => { const a = areaOf(x, z); const R = a && G.rooms[a]; return R?.cloudY ?? -Infinity; };
  // (under the cloud sea of Zeelich and its islands nothing is seen: a foundation need only reach the clouds)
  const ground = (x, z, y) => { const t = T.heightAt(x, z); return Math.max(cloudOf(x, z) - 0.5, t > y - 4 ? t : phys.groundAt(x, z, y + 0.3)); };

  // ---------------------------------------------------------------- (1) + (2) the registered buildings
  const fit = [];
  const add = (b, kind, at, extra) => fit.push({ area: b.region, building: b.name, kind, at: at.map(r2), ...extra });
  for (const b of FIT) {
    const pad = b.pad ?? 0.05, oy = b.oy;
    const W_ = (lx, lz) => toWorld(b, lx, lz);
    // round the walls, 0.25 m out from the plinth
    let over = null, gap = null;
    for (const side of b.round ? [] : ['front', 'back', 'left', 'right']) {
      const half = side === 'front' || side === 'back' ? b.w / 2 : b.d / 2;
      for (let u = -half; u <= half + 1e-6; u += 0.4) {
        const [lx, lz] = sideLocal(b, side, u, pad + 0.25), [x, z] = W_(lx, lz), g = ground(x, z, oy + b.floor);
        const o = g - (oy + b.plinth), q = oy + b.base - g;
        // (a blind wall set into the rise behind it, as the original builds into its terraces, may have ground up it,
        // and so may the corner of the next wall beside it, round its corner pier)
        const END = { front: ['left', 'right'], back: ['right', 'left'], left: ['back', 'front'], right: ['front', 'back'] }[side];
        const atBankedCorner = Math.abs(u) > half - 1.0 && b.banked?.includes(END[u < 0 ? 0 : 1]);
        if (o > 0.06 && !b.banked?.includes(side) && !atBankedCorner && (!over || o > over.by)) over = { by: o, at: [x, g, z], side };
        if (q > 0.03 && (!gap || q > gap.by)) gap = { by: q, at: [x, g, z], side };
      }
    }
    if (b.round) for (let a = 0; a < 6.283; a += 0.25) {
      const R = b.w / 2 + 0.25, x = b.x + Math.sin(a) * R, z = b.z + Math.cos(a) * R, g = ground(x, z, oy + b.floor);
      const o = g - (oy + b.plinth), q = oy + b.base - g;
      if (o > 0.06 && (!over || o > over.by)) over = { by: o, at: [x, g, z], side: 'round' };
      if (q > 0.03 && (!gap || q > gap.by)) gap = { by: q, at: [x, g, z], side: 'round' };
    }
    if (over) add(b, 'ground over the plinth (the wall is swallowed)', over.at, { by: r2(over.by), side: over.side });
    if (gap) add(b, 'gap under the plinth (floating)', gap.at, { by: r2(gap.by), side: gap.side });
    // doors and windows against the ground in front of them
    for (const op of b.openings) {
      if (op.kind === 'door') {
        const c = (op.x0 + op.x1) / 2;
        let hi = null, lo = null;
        for (const u of [c - 0.4, c, c + 0.4]) for (const v of [pad + 0.45, pad + 0.9]) {
          const [lx, lz] = sideLocal(b, op.side, u, v), [x, z] = W_(lx, lz), g = ground(x, z, oy + b.floor);
          const up = g - (oy + b.floor), down = oy + b.floor - g;
          if (up > 0.04 && (!hi || up > hi.by)) hi = { by: up, at: [x, g, z] };
          if (down > b.steps && (!lo || down > lo.by)) lo = { by: down, at: [x, g, z] };
        }
        if (hi) add(b, 'door sill under the ground', hi.at, { by: r2(hi.by), side: op.side });
        if (lo) add(b, 'door hanging over the ground (no steps that far)', lo.at, { by: r2(lo.by), side: op.side });
      }
      if (op.kind === 'window') {
        let hi = null;
        for (const u of [op.x0 + 0.1, (op.x0 + op.x1) / 2, op.x1 - 0.1]) {
          const [lx, lz] = sideLocal(b, op.side, u, pad + 0.3), [x, z] = W_(lx, lz), g = ground(x, z, oy + b.floor);
          const up = g - (oy + op.y0 - 0.15);
          if (up > 0 && (!hi || up > hi.by)) hi = { by: up, at: [x, g, z] };
        }
        if (hi) add(b, 'window at the ground', hi.at, { by: r2(hi.by), side: op.side });
      }
    }
    // the openings of each wall against each other, the corners and the eaves
    const center = (op) => { const [lx, lz] = sideLocal(b, op.side, (op.x0 + op.x1) / 2, 0); const [x, z] = W_(lx, lz); return [x, oy + (op.y0 + op.y1) / 2, z]; };
    const ops = b.openings;
    for (let i = 0; i < ops.length; i++) {
      const A = ops[i];
      if (b.sides && A.kind !== 'band' && A.kind !== 'step' && A.kind !== 'pipe') {
        const free = b.sides[A.side];
        if (A.x0 < -free - 0.01 || A.x1 > free + 0.01) add(b, `${A.kind} runs into the corner`, center(A), { side: A.side, by: r2(Math.max(-free - A.x0, A.x1 - free)) });
        const top = b.top?.[A.side];
        if (top != null && A.y1 > top + 0.01 && A.kind !== 'sign') add(b, `${A.kind} runs into the eaves/frieze`, center(A), { side: A.side, by: r2(A.y1 - top) });
      }
      for (let j = i + 1; j < ops.length; j++) {
        const B = ops[j];
        if (A.side !== B.side) continue;
        const pair = [A.kind, B.kind].sort().join('+');
        if (['door+step', 'balcony+band', 'band+band'].includes(pair)) continue;
        const ox = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), oyy = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0);
        if (ox > 0.01 && oyy > 0.01) add(b, Math.abs(A.x0 - B.x0) < 0.02 && Math.abs(A.x1 - B.x1) < 0.02 && A.kind === B.kind ? `${A.kind} duplicated` : `${A.kind} overlaps ${B.kind}`, center(A), { side: A.side, by: r2(Math.min(ox, oyy)) });
      }
    }
  }
  // buildings cutting into each other (their footprints, 2 cm in)
  const corners = (b) => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sz]) => toWorld(b, sx * (b.w / 2 - 0.02), sz * (b.d / 2 - 0.02)));
  const sep = (P, Q) => { for (const S of [P, Q]) for (let i = 0; i < 4; i++) { const [ax, az] = S[i], [bx, bz] = S[(i + 1) % 4], nx = bz - az, nz = ax - bx;
    const pr = (L) => L.map(([x, z]) => x * nx + z * nz), p = pr(P), q = pr(Q); if (Math.max(...p) < Math.min(...q) || Math.max(...q) < Math.min(...p)) return true; } return false; };
  for (let i = 0; i < FIT.length; i++) for (let j = i + 1; j < FIT.length; j++) {
    const A = FIT[i], B = FIT[j];
    if (A.region !== B.region || Math.hypot(A.x - B.x, A.z - B.z) > (Math.hypot(A.w, A.d) + Math.hypot(B.w, B.d)) / 2) continue;
    if (!sep(corners(A), corners(B))) fit.push({ area: A.region, building: A.name, kind: 'cuts into ' + B.name, at: [r2((A.x + B.x) / 2), r2(A.oy), r2((A.z + B.z) / 2)] });
  }

  // ---------------------------------------------------------------- (4) coverage
  const inFit = (x, z, area) => FIT.some((b) => b.region === area && (() => { const dx = x - b.x, dz = z - b.z, c = Math.cos(b.ry), s = Math.sin(b.ry); return Math.abs(c * dx - s * dz) < b.w / 2 + 0.6 && Math.abs(s * dx + c * dz) < b.d / 2 + 0.6; })());
  const unregistered = [];
  for (const c of phys.colliders) {
    if (!c.enabled) continue;
    const big = c.type === 'box' ? Math.min(c.hw, c.hd) >= 1.2 && c.hw * c.hd * 4 >= 9 : c.r >= 1.6;
    if (!big) continue;
    const area = areaOf(c.x, c.z); if (!area) continue;
    const g = T.heightAt(c.x, c.z);
    if (c.top - g < 2.5 || c.top - g > 40) continue;
    if (!inFit(c.x, c.z, area)) unregistered.push({ area, type: c.type, at: [r2(c.x), r2(g), r2(c.z)], size: c.type === 'box' ? [r2(c.hw * 2), r2(c.hd * 2)] : [r2(c.r * 2)], top: r2(c.top - g) });
  }

  // ---------------------------------------------------------------- (3) z-fighting
  const zf = [], stats = {};
  const { textures } = await import('./src/engine/textures.js'), texName = new Map();
  for (const [k, t] of Object.entries(textures())) if (t?.source) texName.set(t.source.uuid, k);
  for (const A of areas) {
    if (ONLY && !ONLY.includes(A.id)) continue;
    const root = A.root; root.updateMatrixWorld(true);
    const meshes = [], tm = new Set([W.terrain.mesh, ...Object.values(G.rooms).map((R) => R.terrain?.mesh).filter(Boolean)]);
    const shown = (o) => { for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return false; return true; };
    const inTerrain = (o) => { for (let p = o; p && p !== root; p = p.parent) if (tm.has(p)) return true; return false; };
    root.traverse((o) => {
      if (!o.isMesh || inTerrain(o) || o.isInstancedMesh || o.isBatchedMesh || o.isSkinnedMesh || o.userData.drawBatch || o.userData.shadowProxy || !shown(o)) return;
      if ([o.material].flat().every((m) => !m || m.visible === false || m.colorWrite === false)) return;
      if (o.geometry?.attributes?.position) meshes.push(o);
    });
    let n = 0; for (const o of meshes) n += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 | 0;
    const P = new Float32Array(n * 9), N = new Float32Array(n * 4), M = new Int32Array(n), V = new Int32Array(n * 3);
    let k = 0;
    for (let mi = 0; mi < meshes.length; mi++) {
      const o = meshes[mi], g = o.geometry, pos = g.attributes.position, idx = g.index, cnt = idx ? idx.count : pos.count, e = o.matrixWorld.elements;
      for (let t = 0; t + 2 < cnt; t += 3, k++) {
        for (let v = 0; v < 3; v++) {
          const i = idx ? idx.getX(t + v) : t + v, x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
          V[k * 3 + v] = i;
          P[k * 9 + v * 3] = e[0] * x + e[4] * y + e[8] * z + e[12]; P[k * 9 + v * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; P[k * 9 + v * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
        }
        M[k] = mi;
      }
    }
    // planes
    const buckets = new Map(), Q = 0.003;
    for (let t = 0; t < n; t++) {
      const o = t * 9, ux = P[o + 3] - P[o], uy = P[o + 4] - P[o + 1], uz = P[o + 5] - P[o + 2], vx = P[o + 6] - P[o], vy = P[o + 7] - P[o + 1], vz = P[o + 8] - P[o + 2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const L = Math.hypot(nx, ny, nz);
      if (L < 4e-4) { N[t * 4 + 3] = NaN; continue; }
      nx /= L; ny /= L; nz /= L;
      N[t * 4] = nx; N[t * 4 + 1] = ny; N[t * 4 + 2] = nz; N[t * 4 + 3] = nx * P[o] + ny * P[o + 1] + nz * P[o + 2];
      if (ny < -0.2) continue;   // (facing down: never seen from the play camera)
      const key = Math.round(nx * 300) + ',' + Math.round(ny * 300) + ',' + Math.round(nz * 300) + ',' + Math.round(N[t * 4 + 3] / 0.02);   // (a coarse bucket; the exact test is below)
      let l = buckets.get(key); if (!l) buckets.set(key, (l = [])); l.push(t);
    }
    const area2 = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - a[1] * b[0]; } return s / 2; };
    const clip = (subj, a, b) => { const out = []; const side = (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]); for (let i = 0; i < subj.length; i++) { const P1 = subj[i], P2 = subj[(i + 1) % subj.length], s1 = side(P1), s2 = side(P2); if (s1 >= 0) out.push(P1); if ((s1 >= 0) !== (s2 >= 0)) { const u = s1 / (s1 - s2); out.push([P1[0] + (P2[0] - P1[0]) * u, P1[1] + (P2[1] - P1[1]) * u]); } } return out; };
    const proj = (t, ccw = true) => { const ax = Math.abs(N[t * 4]), ay = Math.abs(N[t * 4 + 1]), az = Math.abs(N[t * 4 + 2]), o = t * 9;
      const f = ax >= ay && ax >= az ? (i) => [P[o + i + 1], P[o + i + 2]] : ay >= az ? (i) => [P[o + i + 2], P[o + i]] : (i) => [P[o + i], P[o + i + 1]];
      let p = [f(0), f(3), f(6)]; if (ccw && area2(p) < 0) p = p.reverse(); return p; };
    const unproj = (t, q) => { const nx = N[t * 4], ny = N[t * 4 + 1], nz = N[t * 4 + 2], d = N[t * 4 + 3], ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
      if (ax >= ay && ax >= az) return [(d - ny * q[0] - nz * q[1]) / nx, q[0], q[1]]; if (ay >= az) return [q[1], (d - nz * q[0] - nx * q[1]) / ny, q[0]]; return [q[0], q[1], (d - nx * q[0] - ny * q[1]) / nz]; };
    // what a triangle shows at a point (its 2D projection q): colour (material × vertex colour), texture and where in
    // it, roughness/metalness, glow. Coplanar overlaps of two surfaces that look the same at that point don't flicker.
    const bary = (pp, q) => { const [a, b, c] = pp, d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(d) < 1e-12) return [1 / 3, 1 / 3, 1 / 3];
      const u = ((b[1] - c[1]) * (q[0] - c[0]) + (c[0] - b[0]) * (q[1] - c[1])) / d, v = ((c[1] - a[1]) * (q[0] - c[0]) + (a[0] - c[0]) * (q[1] - c[1])) / d; return [u, v, 1 - u - v]; };
    const look = (t, q) => {
      const o = meshes[M[t]], g = o.geometry, m = [o.material].flat()[0] || {}, wts = bary(proj(t, false), q);
      const at = (name, size) => { const A = g.attributes[name]; if (!A) return null; const r = new Array(size).fill(0); for (let v = 0; v < 3; v++) for (let c = 0; c < size; c++) r[c] += wts[v] * A.getComponent(V[t * 3 + v], c); return r; };
      const col = m.color ? [m.color.r, m.color.g, m.color.b] : [1, 1, 1], vc = m.vertexColors ? at('color', 3) : null;
      if (vc) for (let c = 0; c < 3; c++) col[c] *= vc[c];
      let uv = m.map ? at('uv', 2) : null;
      if (uv) { if (m.map.matrixAutoUpdate) m.map.updateMatrix(); const e = m.map.matrix.elements, u = uv[0], v = uv[1]; uv = [e[0] * u + e[3] * v + e[6], e[1] * u + e[4] * v + e[7]]; }
      const rm = at('rm', 2) || [m.roughness ?? 1, m.metalness ?? 0];
      return { col, map: m.map ? (m.map.source?.uuid || m.map.uuid) : null, uv, rm, glow: m.emissive ? m.emissive.getHex() * (m.emissiveIntensity ?? 1) : 0, side: m.side };
    };
    const fr = (a) => a - Math.floor(a), wrap = (a, b) => { const d = Math.abs(fr(a) - fr(b)); return Math.min(d, 1 - d); };
    const same = (s, t, q) => { const A = look(s, q), B = look(t, q);
      if (A.map !== B.map || A.glow !== B.glow) return false;
      if (Math.max(...A.col.map((c, i) => Math.abs(c - B.col[i]))) > 0.03) return false;
      if (Math.abs(A.rm[0] - B.rm[0]) > 0.06 || Math.abs(A.rm[1] - B.rm[1]) > 0.06) return false;
      if (A.uv && B.uv && (wrap(A.uv[0], B.uv[0]) > 0.02 || wrap(A.uv[1], B.uv[1]) > 0.02)) return false;
      return true; };
    const pairs = [], seen = new Set();
    for (const [key, l0] of buckets) {
      const [a, b, c, d] = key.split(',').map(Number), list = [...l0, ...(buckets.get(a + ',' + b + ',' + c + ',' + (d + 1)) || [])];
      if (list.length < 2) continue;
      const cells = new Map();
      for (const t of list) { const o = t * 9; const x0 = Math.floor(Math.min(P[o], P[o + 3], P[o + 6])), x1 = Math.floor(Math.max(P[o], P[o + 3], P[o + 6])), y0 = Math.floor(Math.min(P[o + 1], P[o + 4], P[o + 7])), y1 = Math.floor(Math.max(P[o + 1], P[o + 4], P[o + 7])), z0 = Math.floor(Math.min(P[o + 2], P[o + 5], P[o + 8])), z1 = Math.floor(Math.max(P[o + 2], P[o + 5], P[o + 8]));
        if ((x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1) > 4000) continue;
        for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) { const ck = x + ',' + y + ',' + z; let cl = cells.get(ck); if (!cl) cells.set(ck, (cl = [])); cl.push(t); } }
      for (const cl of cells.values()) for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) {
        const s = cl[i], t = cl[j], pk = s < t ? s * 4194304 + t : t * 4194304 + s; if (seen.has(pk)) continue; seen.add(pk);
        if (N[s * 4] * N[t * 4] + N[s * 4 + 1] * N[t * 4 + 1] + N[s * 4 + 2] * N[t * 4 + 2] < 0.99995) continue;
        // (in one plane: each of t's corners within Q of s's plane, measured from s's own corner — the plane offsets
        // themselves are too coarse this far from the origin, where a hundredth of a degree is centimetres)
        let off = 0; for (let v = 0; v < 3; v++) off = Math.max(off, Math.abs(N[s * 4] * (P[t * 9 + v * 3] - P[s * 9]) + N[s * 4 + 1] * (P[t * 9 + v * 3 + 1] - P[s * 9 + 1]) + N[s * 4 + 2] * (P[t * 9 + v * 3 + 2] - P[s * 9 + 2])));
        if (off > Q) continue;
        let poly = proj(s); const pb = proj(t);
        for (let e = 0; e < 3 && poly.length; e++) poly = clip(poly, pb[e], pb[(e + 1) % 3]);
        if (poly.length < 3) continue;
        const nd = Math.max(Math.abs(N[s * 4]), Math.abs(N[s * 4 + 1]), Math.abs(N[s * 4 + 2])), ar = Math.abs(area2(poly)) / nd;
        if (ar < 0.002) continue;
        let cx = 0, cy = 0; for (const q of poly) { cx += q[0]; cy += q[1]; }
        const c2 = [cx / poly.length, cy / poly.length];
        if (same(s, t, c2, pb)) continue;   // (two identical surfaces: nothing flickers)
        pairs.push({ s, t, ar, c: unproj(s, c2) });
      }
    }
    // clusters (0.6 m, same facing), then whether any of their overlaps can be seen
    const cl = new Map();
    for (const p of pairs) {
      const k = Math.round(p.c[0] / 0.6) + ',' + Math.round(p.c[1] / 0.6) + ',' + Math.round(p.c[2] / 0.6) + ',' + Math.round(N[p.s * 4] * 4) + ',' + Math.round(N[p.s * 4 + 2] * 4);
      let q = cl.get(k); if (!q) cl.set(k, (q = { area: 0, list: [] })); q.area += p.ar; q.list.push(p);
    }
    const cand = [...cl.values()].filter((q) => q.area >= 0.02);
    // a grid of every triangle near a candidate, for the sight rays
    const CELL = 1.5, grid = new Map(), near = new Set();
    for (const q of cand) for (const p of q.list.slice(0, 8)) { const i = Math.floor(p.c[0] / 10), j = Math.floor(p.c[2] / 10); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) near.add((i + a) + ',' + (j + b)); }
    if (cand.length) for (let t = 0; t < n; t++) {
      if (Number.isNaN(N[t * 4 + 3])) continue;
      const o = t * 9, mx = (P[o] + P[o + 3] + P[o + 6]) / 3, mz = (P[o + 2] + P[o + 5] + P[o + 8]) / 3;
      if (!near.has(Math.floor(mx / 10) + ',' + Math.floor(mz / 10))) continue;
      const x0 = Math.floor(Math.min(P[o], P[o + 3], P[o + 6]) / CELL), x1 = Math.floor(Math.max(P[o], P[o + 3], P[o + 6]) / CELL), y0 = Math.floor(Math.min(P[o + 1], P[o + 4], P[o + 7]) / CELL), y1 = Math.floor(Math.max(P[o + 1], P[o + 4], P[o + 7]) / CELL), z0 = Math.floor(Math.min(P[o + 2], P[o + 5], P[o + 8]) / CELL), z1 = Math.floor(Math.max(P[o + 2], P[o + 5], P[o + 8]) / CELL);
      if ((x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1) > 6000) continue;
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) { const ck = x + ',' + y + ',' + z; let l = grid.get(ck); if (!l) grid.set(ck, (l = [])); l.push(t); }
    }
    const hits = (ox, oy, oz, dx, dy, dz, L, skip) => {   // any triangle on the segment (Möller–Trumbore), the ray's cells in steps
      const done = new Set();
      for (let s = 0; s <= L; s += CELL * 0.4) {
        const ck = Math.floor((ox + dx * s) / CELL) + ',' + Math.floor((oy + dy * s) / CELL) + ',' + Math.floor((oz + dz * s) / CELL);
        if (done.has(ck)) continue; done.add(ck);
        for (const t of grid.get(ck) || []) {
          if (skip.has(t)) continue;
          const o = t * 9, e1x = P[o + 3] - P[o], e1y = P[o + 4] - P[o + 1], e1z = P[o + 5] - P[o + 2], e2x = P[o + 6] - P[o], e2y = P[o + 7] - P[o + 1], e2z = P[o + 8] - P[o + 2];
          const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x, det = e1x * px + e1y * py + e1z * pz;
          if (Math.abs(det) < 1e-9) continue;
          const inv = 1 / det, tx = ox - P[o], ty = oy - P[o + 1], tz = oz - P[o + 2], u = (tx * px + ty * py + tz * pz) * inv; if (u < 0 || u > 1) continue;
          const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, v = (dx * qx + dy * qy + dz * qz) * inv; if (v < 0 || u + v > 1) continue;
          const d = (e2x * qx + e2y * qy + e2z * qz) * inv; if (d > 0.006 && d < L) return true;
        }
      }
      return false;
    };
    const DIRS = [];
    for (const el of [0.52, 0.87, 1.22]) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; DIRS.push([Math.cos(el) * Math.sin(a), Math.sin(el), Math.cos(el) * Math.cos(a)]); }
    const seenFrom = (p) => { const nx = N[p.s * 4], ny = N[p.s * 4 + 1], nz = N[p.s * 4 + 2], skip = new Set([p.s, p.t]);
      for (const [dx, dy, dz] of DIRS) { if (dx * nx + dy * ny + dz * nz < 0.12) continue; if (!hits(p.c[0] + nx * 0.004, p.c[1] + ny * 0.004, p.c[2] + nz * 0.004, dx, dy, dz, 8, skip)) return true; } return false; };
    const desc = (o) => { const m = [o.material].flat()[0], src = m?.map?.source?.uuid; return (o.userData.src || o.parent?.name || o.name || '?') + ':' + (m?.name || (src && texName.get(src)) || '') + '#' + (m?.color?.getHexString?.() || ''); };
    let vis = 0;
    for (const q of cand) {
      q.list.sort((a, b) => b.ar - a.ar);
      const p = q.list.slice(0, 6).find(seenFrom);
      if (!p) continue;
      vis++;
      const nb = FIT.filter((b) => b.region === A.id).map((b) => ({ b, d: Math.hypot(b.x - p.c[0], b.z - p.c[2]) - Math.hypot(b.w, b.d) / 2 })).sort((a, b) => a.d - b.d)[0];
      zf.push({ area: A.id, judged: A.judged, at: p.c.map(r2), n: [N[p.s * 4], N[p.s * 4 + 1], N[p.s * 4 + 2]].map(r2), m2: r2(q.area), a: desc(meshes[M[p.s]]), b: desc(meshes[M[p.t]]), near: nb && nb.d < 2 ? nb.b.name : null,
        ta: Array.from(P.subarray(p.s * 9, p.s * 9 + 9), r2), tb: Array.from(P.subarray(p.t * 9, p.t * 9 + 9), r2) });
    }
    stats[A.id] = { triangles: n, meshes: meshes.length, overlaps: pairs.length, clusters: cl.size, candidates: cand.length, visible: vis };
  }
  return { only: ONLY, buildings: FIT.map((b) => ({ area: b.region, name: b.name })), fit, unregistered, zf, stats, banked: FIT.reduce((a, b) => a + (b.banked?.length || 0), 0) };
}, process.env.AREAS ? process.env.AREAS.split(',') : null);   // (AREAS=a,b: the z-fight scan of those areas only, for a quick look)

if (process.env.REPORT) fs.writeFileSync(process.env.REPORT, JSON.stringify(res, null, 1));
const judged = (a) => a === 'citadel' || a === 'zeelich' || a.startsWith('isle_');
const byArea = {}; for (const b of res.buildings) byArea[b.area] = (byArea[b.area] || 0) + 1;
console.log('registered buildings', JSON.stringify(byArea));
for (const [a, s] of Object.entries(res.stats)) console.log('z-fight scan', a, JSON.stringify(s));
for (const f of res.fit) console.log('  fit', f.area, '|', f.building, '|', f.kind, f.by != null ? 'by ' + f.by + ' m' : '', f.side || '', 'at', f.at.join(', '));
for (const z of res.zf) console.log('  z-fight', z.area, z.m2 + ' m²', 'at', z.at.join(', '), 'n', z.n.join(','), z.a, '|', z.b, z.near ? '(' + z.near + ')' : '');
for (const u of res.unregistered) console.log('  not registered', u.area, u.type, 'at', u.at.join(', '), 'size', u.size.join('×'), 'top', u.top);
check('every area has registered buildings: Citadel (the town, the harbour shed, the project buildings), Zeelich\'s street and the islands\' Esmer buildings',
  ['citadel', 'zeelich'].every((a) => byArea[a] >= 5) && Object.keys(byArea).filter((a) => a.startsWith('isle_')).length >= 6, byArea);
for (const kind of ['swallowed', 'floating', 'door sill under', 'door hanging', 'window at the ground']) {
  const key = { swallowed: 'ground over the plinth', floating: 'gap under the plinth', 'door sill under': 'door sill under', 'door hanging': 'door hanging', 'window at the ground': 'window at the ground' }[kind];
  const bad = res.fit.filter((f) => judged(f.area) && f.kind.startsWith(key));
  check(`(1) no building ${kind === 'swallowed' ? 'swallowed by the ground round it (ground over its plinth)' : kind === 'floating' ? 'floating (a gap under its plinth)' : kind === 'door sill under' ? 'with a door sill under the ground' : kind === 'door hanging' ? 'with a door hanging over the ground beyond its steps' : 'with a window at the ground'} in Citadel, Zeelich or the islands (${bad.length})`, bad.length === 0, bad.slice(0, 6));
}
const fac = res.fit.filter((f) => judged(f.area) && / overlaps |duplicated|runs into/.test(f.kind));
check(`(2) no opening on top of another (door, window, frame, shutter, sill, lantern, sign, pipe), duplicated, or running into a corner or the eaves (${fac.length})`, fac.length === 0, fac.slice(0, 6));
const cut = res.fit.filter((f) => judged(f.area) && f.kind.startsWith('cuts into'));
check(`(2) no two buildings cut into each other (${cut.length})`, cut.length === 0, cut.slice(0, 6));
// (judged: an overlap of 0.15 m² or more — a 40 cm square of flicker; the smaller ones are printed above and in REPORT,
// and the residual list is kept in QA.md)
const zj = res.zf.filter((z) => z.judged && z.m2 >= 0.15);
console.log('banked (blind) walls set into a rise:', res.banked);
check(`(3) no visible z-fighting (coplanar overlapping faces of 0.15 m² or more seen from the play camera's side) in Citadel, Zeelich or the islands (${zj.length}; smaller, listed: ${res.zf.filter((z) => z.judged && z.m2 < 0.15).length})`, zj.length === 0, zj.slice(0, 6));
await browser.close();
process.exit(done(errs) ? 1 : 0);
