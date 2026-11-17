// OVERLAP-SWEEP, page side (tests/overlap-sweep.mjs loads it next to tests/lib/player.js). One pass over an area's drawn,
// static geometry that measures what tests/lib/overlap.js (z-fighting along rays) and tests/worldfit.mjs (registered
// buildings) do not: the drawn pieces as SOLIDS. Every shown static mesh (instances one by one; characters, sprites,
// foliage cards, draw-batch copies and see-through decals left out) is cut into its connected parts (triangles that
// share a corner: one box, one plank, one rock), and a grid of vertical rays (opt.step, 0.25 m) meets them; along each
// ray a closed part is an interval [bottom, top] (it is entered through an upward face, left through a downward one).
// The ground is the terrain grid where an area has one (Citadel, the Desert, the Hamalayi, the isles' banks), else the
// area's big slabs (a part wider than 25 m both ways: Zeelich's island top).
//
// SW.scan(area, opt) → { census, zf, interp, floats, sunk, buried, plants, decals, D }   (area as OVL: {room} | {bounds})
//   zf      (b) two different surfaces facing up within opt.tol (2 cm) on a ray, drawn from above: spots (rays of one
//               pair within 1.2 m), with the gap, rays, rays seen (nothing opaque over them), looks. The ground too.
//   interp  (a) two parts of DIFFERENT objects, one of them a free piece (an instance, or a lone mesh under 3 m), whose
//               intervals overlap by more than 2 cm on a ray: the pair, rays, deepest overlap, where
//   floats  (c) a cluster of parts that touch each other (boxes within 1.5 cm) resting on nothing: the lowest gap from
//               its bottom to whatever is under it outside the cluster, 2 cm … 1 m, on ≥ 2 rays
//   sunk    (c) a small cluster (under 2.5 m) with its whole bottom under the ground by 5 cm or more
//   buried  (d) a part's flat top (a deck, a step, a path, a slab) under the ground or flush with it (within 3 mm) on some
//               rays and above it on others: it runs into the ground. With the ground's paint where it covers it
//               (grass / sand / rock / dirt / cobbles weights of the terrain)
//   plants  (e) a foliage instance (grass, flowers, tulips, bushes: alpha-tested instanced cards) whose foot stands on a
//               part's flat top that is not the ground (paving, a floor, a deck), or on terrain painted as cobbles
//   decals  (e) a see-through decal mesh (no depth write) lying on a part that is not the ground (where its middle is)
// Every finding has the objects' paths, looks and boxes (D) so the runner can name and judge it.
(() => {
const G = game;
const SW = window.SW = {};
let THREE = null;
SW.init = async () => { THREE = await import('three'); try { SW.blob = (await import('./src/engine/textures.js')).textures().blob; } catch (e) { SW.blob = null; } try { const V = await import('./src/engine/viewinst.js'); V.setViewInst(false); } catch (e) { SW.viErr = String(e); } };
const effVisible = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
const hasBone = (o) => { for (let p = o.parent; p; p = p.parent) if (p.isBone || p.isSkinnedMesh) return true; return false; };
function pathOf(o) { const n = []; for (let p = o, k = 0; p && p !== G.scene && k < 6; p = p.parent, k++) n.push(p.name || (p.isMesh ? (p.geometry?.type || 'Mesh').replace('Geometry', '') : p.type)); return n.join('<'); }
function texName(m) { const t = m?.map; if (!t) return ''; return t.name || t.userData?.key || (t.image?.src ? t.image.src.slice(-30) : (t.source?.data?.id || t.uuid.slice(0, 6))); }

// ------------------------------------------------------------------ the store
let N = 0, CAP = 0, P = null, NRM = null, OB = null, LK = null, SD = null, SL = null;
function grow(n) { if (N + n <= CAP) return; const c = Math.max(CAP * 2, N + n, 1 << 16);
  const P2 = new Float32Array(c * 9), N2 = new Float32Array(c * 3), O2 = new Int32Array(c), L2 = new Int32Array(c), S2 = new Uint8Array(c), Q2 = new Int32Array(c);
  if (P) { P2.set(P); N2.set(NRM); O2.set(OB); L2.set(LK); S2.set(SD); Q2.set(SL); } P = P2; NRM = N2; OB = O2; LK = L2; SD = S2; SL = Q2; CAP = c; }
let objs = [], looks = [], lookKey = new Map(), bins = new Map(), terrains = [], CELL = 1;
let solids = [];   // { oi, box [x0,y0,z0,x1,y1,z1], n (triangles), ground, cl (cluster) }
const look = (k, info) => { let i = lookKey.get(k); if (i === undefined) { i = looks.length; looks.push(info); lookKey.set(k, i); } return i; };
const ck = (i, j) => i * 100003 + j;
const compCache = new Map();

// connected parts of a geometry: triangles that share a corner (welded by position, 0.1 mm), per triangle in draw order
function components(g, ranges, total) {
  const key = g.uuid + ':' + ranges.map((r) => r[0] + '-' + r[1]).join(',');
  if (compCache.has(key)) return compCache.get(key);
  const pos = g.attributes.position, idx = g.index, nT = Math.floor(total / 3);
  const par = new Int32Array(nT); for (let i = 0; i < nT; i++) par[i] = i;
  const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  const first = new Map();
  for (let t = 0; t < nT; t++) for (let k = 0; k < 3; k++) {
    const vi = idx ? idx.getX(t * 3 + k) : t * 3 + k;
    const h = Math.round(pos.getX(vi) * 1e4) + ',' + Math.round(pos.getY(vi) * 1e4) + ',' + Math.round(pos.getZ(vi) * 1e4);
    const f = first.get(h); if (f === undefined) first.set(h, t); else { const a = find(f), b = find(t); if (a !== b) par[a] = b; }
  }
  const lab = new Int32Array(nT), map = new Map(); let n = 0;
  for (let t = 0; t < nT; t++) { const r = find(t); let l = map.get(r); if (l === undefined) { l = n++; map.set(r, l); } lab[t] = l; }
  const out = { lab, n };
  compCache.set(key, out);
  return out;
}

function addMesh(o, A, stats) {
  const g = o.geometry, pos = g.attributes.position; if (!pos) return;
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  const idx = g.index; const total = idx ? idx.count : pos.count;
  const ranges = (Array.isArray(o.material) && g.groups.length) ? g.groups.map((gr) => [gr.start, Math.min(total, gr.start + gr.count), mats[gr.materialIndex]]) : [[g.drawRange.start, Math.min(total, g.drawRange.start + g.drawRange.count), mats[0]]];
  const col = g.attributes.color;
  const comp = components(g, [[0, total]], total);
  const nInst = o.isInstancedMesh ? o.count : 1;
  const M = new THREE.Matrix4(), IM = new THREE.Matrix4(), v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], ic = new THREE.Color();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nn = new THREE.Vector3();
  const free = !!o.isInstancedMesh;   // (a scattered or repeated piece: its instances are placed by code, one by one)
  for (let ins = 0; ins < nInst; ins++) {
    M.copy(o.matrixWorld); if (o.isInstancedMesh) { o.getMatrixAt(ins, IM); M.multiply(IM); }
    if (o.isInstancedMesh) { const sx = M.elements[0] ** 2 + M.elements[1] ** 2 + M.elements[2] ** 2; if (sx < 1e-10) continue; }   // (a hidden instance: scaled to nothing)
    const det = M.determinant();
    if (o.isInstancedMesh && o.instanceColor) o.getColorAt(ins, ic); else ic.setRGB(1, 1, 1);
    const oi = objs.length;
    const base = solids.length; const used = new Map();
    objs.push({ o, ins: o.isInstancedMesh ? ins : -1, free, base });
    let added = 0;
    for (const [s0, s1, m] of ranges) {
      if (!m || m.visible === false || m.colorWrite === false || (m.transparent && m.opacity < 0.03)) { stats.skipMat++; continue; }
      const side = m.side === THREE.DoubleSide ? 2 : ((m.side === THREE.BackSide) !== (det < 0) ? 1 : 0);
      const mc = m.color || { r: 1, g: 1, b: 1 };
      const tn = texName(m);
      for (let t = s0; t + 2 < s1 + 0.5 && t + 2 < total; t += 3) {
        let cr = 0, cg = 0, cb = 0;
        for (let k = 0; k < 3; k++) { const vi = idx ? idx.getX(t + k) : t + k; v[k].fromBufferAttribute(pos, vi).applyMatrix4(M); if (col && m.vertexColors) { cr += col.getX(vi); cg += col.getY(vi); cb += col.getZ(vi); } }
        const minx = Math.min(v[0].x, v[1].x, v[2].x), maxx = Math.max(v[0].x, v[1].x, v[2].x), minz = Math.min(v[0].z, v[1].z, v[2].z), maxz = Math.max(v[0].z, v[1].z, v[2].z);
        const miny = Math.min(v[0].y, v[1].y, v[2].y), maxy = Math.max(v[0].y, v[1].y, v[2].y);
        if (maxx < A.x0 || minx > A.x1 || maxz < A.z0 || minz > A.z1 || maxy < A.y0 || miny > A.y1) continue;
        e1.subVectors(v[1], v[0]); e2.subVectors(v[2], v[0]); nn.crossVectors(e1, e2); const L = nn.length(); if (L < 1e-9) continue; nn.divideScalar(L);
        if (col && m.vertexColors) { cr /= 3; cg /= 3; cb /= 3; } else { cr = 1; cg = 1; cb = 1; }
        const R = cr * (mc.r ?? 1) * ic.r, Gc = cg * (mc.g ?? 1) * ic.g, B = cb * (mc.b ?? 1) * ic.b;
        const lk = look(`${Math.round(R * 40)},${Math.round(Gc * 40)},${Math.round(B * 40)}|${tn}|${m.transparent ? 't' : ''}|${m.polygonOffset ? 'po' : ''}`, { hex: '#' + new THREE.Color(R, Gc, B).getHexString(), tex: tn, transparent: !!m.transparent, po: !!m.polygonOffset });
        // its part
        const c = comp.lab[t / 3 | 0];
        let si = used.get(c);
        if (si === undefined) { si = solids.length; used.set(c, si); solids.push({ oi, box: [1e9, 1e9, 1e9, -1e9, -1e9, -1e9], n: 0, ground: false, cl: -1, lk, vol: 0 }); }
        const S = solids[si], bx = S.box; S.n++;
        if (minx < bx[0]) bx[0] = minx; if (miny < bx[1]) bx[1] = miny; if (minz < bx[2]) bx[2] = minz; if (maxx > bx[3]) bx[3] = maxx; if (maxy > bx[4]) bx[4] = maxy; if (maxz > bx[5]) bx[5] = maxz;
        grow(1); const b = N * 9;
        for (let k = 0; k < 3; k++) { P[b + k * 3] = v[k].x; P[b + k * 3 + 1] = v[k].y; P[b + k * 3 + 2] = v[k].z; }
        NRM[N * 3] = nn.x; NRM[N * 3 + 1] = nn.y; NRM[N * 3 + 2] = nn.z; OB[N] = oi; LK[N] = lk; SD[N] = side; SL[N] = si;
        const i0 = Math.max(Math.floor(minx / CELL), Math.floor(A.x0 / CELL) - 1), i1 = Math.min(Math.floor(maxx / CELL), Math.floor(A.x1 / CELL) + 1);
        const j0 = Math.max(Math.floor(minz / CELL), Math.floor(A.z0 / CELL) - 1), j1 = Math.min(Math.floor(maxz / CELL), Math.floor(A.z1 / CELL) + 1);
        if ((i1 - i0 + 1) * (j1 - j0 + 1) > 40000) stats.huge++;
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const key = ck(i, j); let a = bins.get(key); if (!a) bins.set(key, a = []); a.push(N); }
        N++; added++;
      }
    }
    stats.tris += added;
  }
}

function addTerrain(gr) {
  const full = gr.userData.full; if (!full) return;
  const p = full.attributes.position, n = Math.round(Math.sqrt(p.count)); if (n * n !== p.count) return;
  gr.updateWorldMatrix(true, false); const wp = new THREE.Vector3().setFromMatrixPosition(gr.matrixWorld);
  const x0 = p.getX(0), z0 = p.getZ(0), step = p.getX(1) - x0;
  const oi = objs.length; objs.push({ o: gr, ins: -1, terrain: true });
  terrains.push({ oi, n, x0: x0 + wp.x, z0: z0 + wp.z, step, oy: wp.y, p, spl: full.attributes.splat || null, spl2: full.attributes.splat2 || null,
    look: look('terrain', { hex: 'terrain', tex: 'terrain', transparent: false, po: false }) });
}
function terrainHit(T, x, z) {
  const gx = (x - T.x0) / T.step, gz = (z - T.z0) / T.step, i = Math.floor(gx), j = Math.floor(gz);
  if (i < 0 || j < 0 || i >= T.n - 1 || j >= T.n - 1) return null;
  const fx = gx - i, fz = gz - j, n = T.n, h = (a, b) => T.p.getY((j + b) * n + i + a);
  const h00 = h(0, 0), h10 = h(1, 0), h01 = h(0, 1), h11 = h(1, 1);
  const y = fx + fz < 1 ? h00 + (h10 - h00) * fx + (h01 - h00) * fz : h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
  if (Math.max(h00, h10, h01, h11) < -4) return null;   // (tiles deep under the sea are not drawn)
  return y + T.oy;
}
// the terrain's paint at x, z (the nearest vertex): grass, sand, rock, dirt, cobbles
const PAINT = ['grass', 'sand', 'rock', 'dirt', 'cobbles'];
function terrainPaint(T, x, z) {
  if (!T.spl) return null;
  const i = Math.round((x - T.x0) / T.step), j = Math.round((z - T.z0) / T.step); if (i < 0 || j < 0 || i >= T.n || j >= T.n) return null;
  const k = j * T.n + i, w = [T.spl.getX(k), T.spl.getY(k), T.spl.getZ(k), T.spl.getW(k), T.spl2 ? T.spl2.getX(k) : 0];
  let best = 0; for (let q = 1; q < 5; q++) if (w[q] > w[best]) best = q;
  return { w: w.map((a) => +a.toFixed(2)), top: PAINT[best] };
}
function bary(b, ax, bx, pa, pb, margin) {
  const ax0 = P[b + ax], ab0 = P[b + bx], ax1 = P[b + 3 + ax], ab1 = P[b + 3 + bx], ax2 = P[b + 6 + ax], ab2 = P[b + 6 + bx];
  const d = (ab1 - ab2) * (ax0 - ax2) + (ax2 - ax1) * (ab0 - ab2); if (Math.abs(d) < 1e-12) return null;
  const u = ((ab1 - ab2) * (pa - ax2) + (ax2 - ax1) * (pb - ab2)) / d; if (u < margin) return null;
  const w1 = ((ab2 - ab0) * (pa - ax2) + (ax0 - ax2) * (pb - ab2)) / d; if (w1 < margin) return null;
  const w2 = 1 - u - w1; if (w2 < margin) return null;
  return [u, w1, w2];
}
// every surface on the vertical line at x, z: [{y, ny, t (triangle), si (part), oi, lk}] top down, and the terrain's height
function column(x, z, out) {
  out.length = 0;
  const bin = bins.get(ck(Math.floor(x / CELL), Math.floor(z / CELL)));
  if (bin) for (const t of bin) {
    const ny = NRM[t * 3 + 1]; if (Math.abs(ny) < 0.15) continue;
    const bb = bary(t * 9, 0, 2, x, z, 1e-5); if (!bb) continue;
    const b = t * 9, y = bb[0] * P[b + 1] + bb[1] * P[b + 4] + bb[2] * P[b + 7];
    out.push({ y, ny, t, si: SL[t], oi: OB[t], lk: LK[t] });
  }
  out.sort((a, b) => b.y - a.y);
  let tg = null, T0 = null; for (const T of terrains) { const y = terrainHit(T, x, z); if (y != null && (tg == null || y > tg)) { tg = y; T0 = T; } }
  return { tg, T: T0 };
}
SW.column = (x, z) => { const a = []; const r = column(x, z, a); return { terrain: r.tg, hits: a.map((h) => [+h.y.toFixed(4), +h.ny.toFixed(2), h.si, pathOf(objs[h.oi].o), looks[h.lk].hex + '/' + looks[h.lk].tex]) }; };

// ------------------------------------------------------------------ clusters: parts whose boxes touch (1.5 cm)
function clusterSolids() {
  const par = new Int32Array(solids.length); for (let i = 0; i < par.length; i++) par[i] = i;
  const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  const C = 2, grid = new Map(), E = 0.015;
  solids.forEach((S, i) => {
    const b = S.box, big = Math.max(b[3] - b[0], b[5] - b[2]) > 30;
    if (S.ground || big) return;
    for (let x = Math.floor(b[0] / C); x <= Math.floor(b[3] / C); x++) for (let z = Math.floor(b[2] / C); z <= Math.floor(b[5] / C); z++) {
      const k = ck(x, z); let l = grid.get(k); if (!l) grid.set(k, l = []);
      for (const j of l) { const c = solids[j].box; if (b[0] - E <= c[3] && c[0] - E <= b[3] && b[1] - E <= c[4] && c[1] - E <= b[4] && b[2] - E <= c[5] && c[2] - E <= b[5]) { const p = find(i), q = find(j); if (p !== q) par[p] = q; } }
      l.push(i);
    }
  });
  solids.forEach((S, i) => { S.cl = find(i); });
}

// ------------------------------------------------------------------ the scan
const r2 = (v) => Math.round(v * 100) / 100, r3 = (v) => Math.round(v * 1000) / 1000;
SW.prepare = async (area) => {
  if (!THREE) await SW.init();
  if (area.room) { if (G.room?.id !== area.room) { G.enterRoom(area.room, null, true); for (let i = 0; i < 10; i++) G.step(0.05); } }
  else if (G.room) { G.exitRoom({ x: -40, z: -10, a: 0 }, true); for (let i = 0; i < 10; i++) G.step(0.05); }
  const R = area.room ? G.rooms[area.room] : null;
  G.scene.updateMatrixWorld(true);
  let A = area.bounds ? { ...area.bounds } : null;
  if (!A && R) {
    // (the area's own drawn things; a sky dome, the cloud sea or the ocean plane, wider than 400 m, do not set the bounds)
    const bb = new THREE.Box3(), b1 = new THREE.Box3();
    R.group.traverse((o) => { if (!o.isMesh || !effVisible(o) || o.userData.drawBatch || o.name === 'drawBatch') return; b1.setFromObject(o); if (b1.max.x - b1.min.x > 400 || b1.max.z - b1.min.z > 400) return; bb.union(b1); });
    A = { x0: bb.min.x - 0.5, x1: bb.max.x + 0.5, z0: bb.min.z - 0.5, z1: bb.max.z + 0.5, y0: bb.min.y - 1, y1: bb.max.y + 1 };
  }
  A.y0 ??= -50; A.y1 ??= 400;
  return A;
};

SW.scan = async (area, opt = {}) => {
  const A = await SW.prepare(area);
  N = 0; objs = []; looks = []; lookKey = new Map(); bins = new Map(); terrains = []; solids = [];
  const stats = { meshes: 0, tris: 0, skipMat: 0, skipped: {}, huge: 0 };
  const skip = (why) => { stats.skipped[why] = (stats.skipped[why] || 0) + 1; };
  const foliage = [], decals = [];
  const bb = new THREE.Box3();
  const t0 = performance.now();
  // what moves (people's props, dogs, gulls, shuttles, sails, lifts, doors swinging): its matrix or its instances change
  // over 0.6 s of play; left out (they are not placed pieces)
  const was = new Map(); G.scene.updateMatrixWorld(true);
  G.scene.traverse((o) => { if (o.isMesh) was.set(o, [o.matrixWorld.clone(), o.isInstancedMesh ? o.instanceMatrix.version : 0]); });
  for (let i = 0; i < 6; i++) G.step(0.1);
  G.scene.updateMatrixWorld(true);
  const movers = new Set(); for (const [o, [m, v]] of was) if (!o.matrixWorld.equals(m) || (o.isInstancedMesh && o.instanceMatrix.version !== v)) movers.add(o);
  G.scene.traverse((o) => {
    if (movers.has(o)) return skip('moving');
    if (o.name === 'terrain' && o.isGroup && effVisible(o)) { addTerrain(o); return; }
    if (!o.isMesh || o.isSprite) return;
    if (o.name === 'terrain') return;
    if (o.name === 'drawBatch' || o.name === 'shadowBatch' || o.userData.drawBatch || o.userData.shadowProxy) return skip('batch');
    if (o.isSkinnedMesh || hasBone(o)) return skip('skinned');
    if (!effVisible(o)) return skip('hidden');
    if (o.isBatchedMesh) return skip('batchedmesh');
    const m0 = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!o.isInstancedMesh) { bb.setFromObject(o); if (bb.max.x < A.x0 || bb.min.x > A.x1 || bb.max.z < A.z0 || bb.min.z > A.z1 || bb.max.y < A.y0 || bb.min.y > A.y1) return; }
    if (o.isInstancedMesh && (m0?.alphaTest > 0 || /smallPool|grass|flower|tulip|weed|clover|fern|daisy/i.test(pathOf(o)))) { if (o.name !== 'smallPool') foliage.push(o); return skip('foliage'); }
    if (o.name === 'blobBatch') return skip('blob');
    if (!Array.isArray(o.material) && m0?.transparent && m0.depthWrite === false) { if (!(SW.blob && m0.map === SW.blob)) decals.push(o); return skip('decal'); }   // (a blob shadow under someone is not a decal)
    if (opt.skipName && opt.skipName.test(pathOf(o))) return skip('name');
    if (/(^|<)(dog|cat|fish|bee|drone)|gull|bird/i.test(pathOf(o))) return skip('animal');
    stats.meshes++;
    addMesh(o, A, stats);
  });
  // (Citadel's grass, flowers and tulips: the pools hold only what is near Twinsen; their tiles hold every one)
  if (!area.room && G.world?.smallPools) for (const P of G.world.smallPools) for (const t of P.tiles) foliage.push(t);
  // the ground where there is no terrain: a part wider than 25 m both ways, its top flat (an island's slab)
  // (only where there is no terrain and the area says so: Zeelich's island slab; Ballastra's quays are not ground)
  if (opt.slabGround) for (const S of solids) { const b = S.box; if (b[3] - b[0] > 25 && b[5] - b[2] > 25 && b[4] - b[1] < 8) S.ground = true; }
  clusterSolids();
  const t1 = performance.now();

  // ------------------------------------------------ the rays
  const step = opt.step ?? 0.25, tol = opt.tol ?? 0.02, jx = 0.0731, jz = 0.1173;
  const hits = [], zfRaw = [], pairs = new Map(), clMin = new Map(), solidG = new Map(), sunkCl = new Map();
  const rendered = (side, ndir) => side === 2 || (side === 0 ? ndir < 0 : ndir > 0);
  const outdoor = !area.room || !!G.rooms[area.room]?.outdoor;
  let nRays = 0;
  const iv = new Map();   // part → [[top, bottom], ...] on this ray
  for (let x = A.x0 + jx; x < A.x1; x += step) for (let z = A.z0 + jz; z < A.z1; z += step) {
    const { tg, T } = column(x, z, hits);
    if (!hits.length) continue;
    nRays++;
    // the ground on this ray
    let g = tg, gPart = -1;
    if (g == null) for (const h of hits) if (solids[h.si].ground && h.ny > 0) { if (g == null || h.y > g) { g = h.y; gPart = h.si; } }
    // (b) surfaces facing up, as drawn from above, top down; the terrain among them
    const vis = hits.filter((h) => h.ny > 0.3 && rendered(SD[h.t], -h.ny));
    // (d) the ground is seen on this ray only if nothing opaque lies over it (a house's roof, a porch, a deck)
    let gSeen = g != null; if (gSeen) for (const h of vis) { if (h.y <= g + 0.003) break; if (!looks[h.lk].transparent) { gSeen = false; break; } }
    {
      if (tg != null) { let k = 0; while (k < vis.length && vis[k].y > tg) k++; vis.splice(k, 0, { y: tg, ny: 1, t: -1, si: -1, oi: T.oi, lk: T.look, terrain: true }); }
      let rank = 0;
      for (let k = 0; k < vis.length; k++) {
        const a = vis[k];
        for (let q = k + 1; q < vis.length && a.y - vis[q].y < tol; q++) {
          const b = vis[q];
          if (a.oi === b.oi && a.lk === b.lk) continue;
          if (a.si === b.si && a.si >= 0) continue;
          zfRaw.push({ x, y: a.y, z, gap: a.y - b.y, oa: a.oi, ob: b.oi, la: a.lk, lb: b.lk, sa: a.si, sb: b.si, rank });
        }
        if (!looks[a.lk].transparent) rank++;
      }
    }
    // intervals of the closed parts on this ray
    iv.clear();
    const seq = new Map();
    for (const h of hits) { let l = seq.get(h.si); if (!l) seq.set(h.si, l = []); l.push(h); }
    for (const [si, l] of seq) {
      // (a closed part alternates in, out, in, out; a part that does not is a sheet here: no interval)
      if (l.length % 2) continue;
      let ok = true; const out = [];
      for (let k = 0; k < l.length; k += 2) { if (!(l[k].ny > 0 && l[k + 1].ny < 0)) { ok = false; break; } out.push([l[k].y, l[k + 1].y, l[k].ny]); }
      if (ok) iv.set(si, out);
    }
    const ivs = [...iv.entries()];
    for (const [si, l] of ivs) for (const [t1, b1] of l) solids[si].vol += (t1 - b1) * step * step;
    // (c) each cluster's lowest surface on this ray (open shells too), and what is under it outside the cluster: resting on
    // the ground, on another cluster's top or inside its part is 0
    {
      const low = new Map();
      for (const h of hits) { const S = solids[h.si]; if (S.ground) continue; const l = low.get(S.cl); if (l === undefined || h.y < l.y) low.set(S.cl, h); }
      for (const [cl, h] of low) {
        let clr, sOi = -1;
        if (g != null && h.y <= g + 0.002) clr = 0;
        else {
          let sup = g != null ? g : -Infinity, inside = false; sOi = g != null ? (gPart >= 0 ? solids[gPart].oi : (T ? T.oi : -1)) : -1;
          for (const [sj, l2] of ivs) { if (solids[sj].cl === cl) continue; for (const [t2, b2] of l2) if (t2 >= h.y - 0.002 && b2 <= h.y + 0.002) { inside = true; break; } if (inside) break; }
          if (!inside) for (const q of hits) { if (q.y >= h.y - 0.0005) continue; const Q = solids[q.si]; if (Q.cl === cl || q.ny <= 0) continue; if (q.y > sup) { sup = q.y; sOi = q.oi; } break; }
          clr = inside ? 0 : h.y - sup;
        }
        const cm = clMin.get(cl);
        if (!cm) clMin.set(cl, { min: clr, n: 1, at: [x, h.y, z], sup: sOi, g });
        else { cm.n++; if (clr < cm.min) { cm.min = clr; cm.at = [x, h.y, z]; cm.sup = sOi; cm.g = g; } }
      }
    }
    for (const [si, list] of ivs) {
      const S = solids[si]; if (S.ground) continue;
      for (const [top, bot, nyTop] of list) {
        if (g != null && outdoor) {
          // (c) sunk: how far its bottom is under the ground, per cluster (the least of its rays)
          const sd = g - bot; const sc = sunkCl.get(S.cl);
          if (!sc) sunkCl.set(S.cl, { min: sd, n: 1, at: [x, bot, z], g }); else { sc.n++; if (sd < sc.min) { sc.min = sd; sc.at = [x, bot, z]; sc.g = g; } }
          // (d) its flat top against the ground
          if (nyTop > 0.7) {
            let s = solidG.get(si); if (!s) solidG.set(si, s = { bur: 0, flush: 0, exp: 0, depth: 0, at: null, paint: {}, bx: [1e9, 1e9, -1e9, -1e9] });
            const d = g - top;
            // (under or flush with the ground counts only where that ground is seen; above it always counts)
            if (!gSeen && d > -0.003) continue;
            if (d > 0.003 && d < 0.25) { s.bur++; if (d > s.depth) { s.depth = d; } s.at ??= [x, top, z]; s.bx[0] = Math.min(s.bx[0], x); s.bx[1] = Math.min(s.bx[1], z); s.bx[2] = Math.max(s.bx[2], x); s.bx[3] = Math.max(s.bx[3], z); if (T && d < 0.3) { const pt = terrainPaint(T, x, z); if (pt) s.paint[pt.top] = (s.paint[pt.top] || 0) + 1; } }
            else if (Math.abs(d) <= 0.003) { s.flush++; s.at ??= [x, top, z]; s.bx[0] = Math.min(s.bx[0], x); s.bx[1] = Math.min(s.bx[1], z); s.bx[2] = Math.max(s.bx[2], x); s.bx[3] = Math.max(s.bx[3], z); }
            else if (d <= -0.003) s.exp++;
          }
        }
      }
    }
    // (a) intervals of two parts of different objects, one a free piece, overlapping
    for (let i = 0; i < ivs.length; i++) {
      const [si, li] = ivs[i], Si = solids[si]; if (Si.ground) continue;
      for (let j = i + 1; j < ivs.length; j++) {
        const [sj, lj] = ivs[j], Sj = solids[sj]; if (Sj.ground || Si.oi === Sj.oi) continue;
        if (!objs[Si.oi].free && !objs[Sj.oi].free) continue;
        let d = 0, ym = 0, same = Si.lk === Sj.lk; for (const [ta, ba] of li) for (const [tb, bb2] of lj) { const o = Math.min(ta, tb) - Math.max(ba, bb2); if (o > d) { d = o; ym = (Math.min(ta, tb) + Math.max(ba, bb2)) / 2; } if (Math.abs(ta - tb) > 0.003 || Math.abs(ba - bb2) > 0.003) same = false; }
        if (d <= 0.02 || same) continue;   // (two identical slabs of one look side by side: one surface)
        const key = Math.min(si, sj) * 4194304 + Math.max(si, sj);
        const p = pairs.get(key); if (!p) pairs.set(key, { a: Math.min(si, sj), b: Math.max(si, sj), n: 1, d, v: d * step * step, at: [x, ym, z] }); else { p.n++; p.v += d * step * step; if (d > p.d) { p.d = d; p.at = [x, ym, z]; } }
      }
    }
  }
  const t2 = performance.now();

  // ------------------------------------------------ findings
  const D = {}, need = (oi) => { if (D[oi]) return; const O = objs[oi]; if (!O) return; if (O.terrain) { D[oi] = { path: 'TERRAIN', terrain: true }; return; }
    const o = O.o, m = Array.isArray(o.material) ? o.material[0] : o.material; const b = new THREE.Box3().setFromObject(o);
    D[oi] = { path: pathOf(o), ins: O.ins, inst: !!o.isInstancedMesh, free: !!O.free, geo: o.geometry?.type, mat: m?.name || m?.type, color: m?.color?.getHexString?.(), tex: texName(m), src: o.userData?.src || o.userData?.maker || null,
      box: o.isInstancedMesh ? null : [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z].map(r2) }; };
  const sbox = (si) => solids[si].box.map(r2);
  // (b) spots
  const zf = [];
  { const groups = new Map();
    for (const r of zfRaw) { const k = Math.min(r.oa, r.ob) + ':' + Math.max(r.oa, r.ob) + ':' + Math.min(r.la, r.lb) + ':' + Math.max(r.la, r.lb); let l = groups.get(k); if (!l) groups.set(k, l = []); l.push(r); }
    for (const list of groups.values()) {
      const used = new Uint8Array(list.length);
      for (let i = 0; i < list.length; i++) {
        if (used[i]) continue; used[i] = 1; const cl = [list[i]];
        for (let q = 0; q < cl.length; q++) for (let j = 0; j < list.length; j++) if (!used[j] && Math.abs(list[j].x - cl[q].x) < 1.2 && Math.abs(list[j].z - cl[q].z) < 1.2 && Math.abs(list[j].y - cl[q].y) < 1.2) { used[j] = 1; cl.push(list[j]); }
        let x = 0, y = 0, z = 0, gap = 0, rank = 99, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
        for (const r of cl) { x += r.x; y += r.y; z += r.z; gap += r.gap; rank = Math.min(rank, r.rank); x0 = Math.min(x0, r.x); x1 = Math.max(x1, r.x); z0 = Math.min(z0, r.z); z1 = Math.max(z1, r.z); }
        const n = cl.length, r0 = cl[0]; need(r0.oa); need(r0.ob);
        zf.push({ n, m2: r2(n * step * step), x: r2(x / n), y: r3(y / n), z: r2(z / n), gap: +(gap / n).toFixed(4), rank, seen: cl.filter((r) => r.rank === 0).length, box: [x0, z0, x1, z1].map(r2), A: r0.oa, B: r0.ob, la: looks[r0.la], lb: looks[r0.lb], sa: r0.sa, sb: r0.sb });
      }
    }
    zf.sort((a, b) => b.n - a.n);
  }
  // (a) pairs
  const interp = [];
  for (const p of pairs.values()) { if (p.n < 2) continue; const a = solids[p.a], b = solids[p.b];
    // (the share of the free piece that is inside the other: a crate whose corner touches a wall is not a crate in a wall)
    const fr = Math.max(objs[a.oi].free ? p.v / Math.max(a.vol, 1e-6) : 0, objs[b.oi].free ? p.v / Math.max(b.vol, 1e-6) : 0);
    need(a.oi); need(b.oi);
    interp.push({ n: p.n, m2: r2(p.n * step * step), d: r2(p.d), v: r3(p.v), frac: r2(fr), x: r2(p.at[0]), y: r2(p.at[1]), z: r2(p.at[2]), A: a.oi, B: b.oi, ba: sbox(p.a), bb: sbox(p.b) }); }
  interp.sort((a, b) => b.n * b.d - a.n * a.d);
  // (c) floating clusters
  const floats = [], members = new Map();
  solids.forEach((S, i) => { let l = members.get(S.cl); if (!l) members.set(S.cl, l = []); l.push(i); });
  const clBox = (cl) => { const b = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9]; for (const i of members.get(cl)) { const s = solids[i].box; for (let k = 0; k < 3; k++) { b[k] = Math.min(b[k], s[k]); b[k + 3] = Math.max(b[k + 3], s[k + 3]); } } return b.map(r2); };
  for (const [cl, m] of clMin) {
    if (m.min <= 0.02 || m.min > 1.0 || m.n < 2 || !Number.isFinite(m.min)) continue;
    // (a side or a rim that no vertical ray meets may reach lower than any surface the rays saw: its box says so)
    { const b = clBox(cl); if (m.g != null && b[1] <= m.g + 0.02) continue; if (b[1] <= m.at[1] - m.min + 0.02) continue; }
    const ms = members.get(cl), oi = solids[ms[0]].oi; need(oi); if (m.sup >= 0) need(m.sup);
    floats.push({ gap: r3(m.min), n: m.n, parts: ms.length, x: r2(m.at[0]), y: r2(m.at[1]), z: r2(m.at[2]), A: oi, sup: m.sup, box: clBox(cl), objs: [...new Set(ms.map((i) => solids[i].oi))].slice(0, 6).map((o) => { need(o); return o; }) });
  }
  floats.sort((a, b) => b.gap * b.n - a.gap * a.n);
  // (c) sunk small clusters
  const sunk = [];
  for (const [cl, s] of sunkCl) {
    if (s.min < 0.05 || s.n < 2) continue;
    const b = clBox(cl); if (Math.max(b[3] - b[0], b[5] - b[2]) > 2.5) continue;
    if (b[4] < s.g) continue;   // (wholly under the ground: not seen)
    const ms = members.get(cl), oi = solids[ms[0]].oi; need(oi);
    sunk.push({ depth: r2(s.min), n: s.n, x: r2(s.at[0]), y: r2(s.at[1]), z: r2(s.at[2]), A: oi, box: b });
  }
  // (d) flat tops into the ground
  const buried = [];
  for (const [si, s] of solidG) {
    if (s.bur + s.flush < 2 || s.exp < 2) continue;
    const S = solids[si]; need(S.oi);
    buried.push({ bur: s.bur, flush: s.flush, exp: s.exp, m2: r2((s.bur + s.flush) * step * step), depth: r3(s.depth), x: r2(s.at[0]), y: r2(s.at[1]), z: r2(s.at[2]), A: S.oi, box: sbox(si), under: [s.bx[0], s.bx[1], s.bx[2], s.bx[3]].map(r2), paint: s.paint });
  }
  buried.sort((a, b) => b.m2 - a.m2);
  // (e) foliage on paving and floors, and decals on parts
  const plants = [], pl = new Map(), dec = [];
  const mm = new THREE.Matrix4(), pv = new THREE.Vector3();
  for (const o of foliage) {
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, mm); mm.premultiply(o.matrixWorld); pv.setFromMatrixPosition(mm);
      if (mm.elements[0] ** 2 + mm.elements[1] ** 2 + mm.elements[2] ** 2 < 1e-10) continue;
      if (pv.x < A.x0 || pv.x > A.x1 || pv.z < A.z0 || pv.z > A.z1) continue;
      const { tg, T } = column(pv.x, pv.z, hits);
      // the first upward surface at or under its foot (+ 0.3 m)
      let top = null; for (const h of hits) if (h.ny > 0.3 && h.y <= pv.y + 0.3) { top = h; break; }
      let what = null;
      if (top && (tg == null || top.y > tg + 0.01) && !solids[top.si].ground && top.ny > 0.8 && pv.y - top.y < 0.25) what = { on: top.oi, lk: top.lk, y: top.y };
      else if ((!top || (tg != null && tg >= top.y - 0.01)) && tg != null && T && Math.abs(pv.y - tg) < 0.3) { const pt = terrainPaint(T, pv.x, pv.z); if (pt && pt.w[4] >= 0.5) what = { on: T.oi, paint: 'cobbles', y: tg }; }
      if (!what) continue;
      need(what.on);
      const key = pathOf(o) + '|' + what.on + '|' + (what.lk ?? 'p');
      let p = pl.get(key); if (!p) { pl.set(key, p = { kind: pathOf(o), on: what.on, look: what.lk != null ? looks[what.lk] : { hex: 'terrain', tex: 'cobbles' }, n: 0, at: [], x0: 1e9, z0: 1e9, x1: -1e9, z1: -1e9 }); }
      p.n++; if (p.at.length < 6) p.at.push([r2(pv.x), r2(pv.y), r2(pv.z)]); p.x0 = Math.min(p.x0, pv.x); p.z0 = Math.min(p.z0, pv.z); p.x1 = Math.max(p.x1, pv.x); p.z1 = Math.max(p.z1, pv.z);
    }
  }
  for (const p of pl.values()) plants.push({ ...p, box: [p.x0, p.z0, p.x1, p.z1].map(r2) });
  for (const o of decals) {
    const g = o.geometry, pos = g.attributes.position; if (!pos) continue;
    const b = new THREE.Box3().setFromObject(o); const c = b.getCenter(new THREE.Vector3());
    if (c.x < A.x0 || c.x > A.x1 || c.z < A.z0 || c.z > A.z1) continue;
    if (b.max.y - b.min.y > 0.5) continue;   // (flat ones only: a decal lies on something)
    const { tg } = column(c.x, c.z, hits);
    let top = null; for (const h of hits) if (h.ny > 0.3 && h.y <= c.y + 0.05) { top = h; break; }
    if (!top || (tg != null && tg >= top.y - 0.01) || solids[top.si].ground || c.y - top.y > 0.08) continue;
    need(top.oi);
    const m = Array.isArray(o.material) ? o.material[0] : o.material;
    dec.push({ path: pathOf(o), tex: texName(m), color: m?.color?.getHexString?.(), x: r2(c.x), y: r2(c.y), z: r2(c.z), size: [r2(b.max.x - b.min.x), r2(b.max.z - b.min.z)], on: top.oi, onLook: looks[top.lk] });
  }
  const t3 = performance.now();
  SW.last = { A };
  const census = { meshes: stats.meshes, tris: stats.tris, parts: solids.length, clusters: members.size, terrains: terrains.length, foliage: foliage.length, decals: decals.length, rays: nRays, skipped: stats.skipped, ms: [t1 - t0, t2 - t1, t3 - t2].map(Math.round) };
  compCache.clear();
  return { area, A: { x0: r2(A.x0), x1: r2(A.x1), z0: r2(A.z0), z1: r2(A.z1) }, census, zf, interp, floats, sunk, buried, plants, decals: dec, D };
};

// the store let go (the next area starts afresh; a picture needs it kept)
SW.free = () => { N = 0; CAP = 0; P = NRM = OB = LK = SD = SL = null; objs = []; bins = new Map(); terrains = []; solids = []; compCache.clear(); };

// a picture of a finding { x, y, z, A, B, span }: from above at an angle, the camera kept under any ceiling; with
// opt.zmap a second one with A painted red and B green. Returns JPEG data URLs (the last scan's objects).
SW.shoot = (f, opt = {}) => {
  const cam = G.camera, span = Math.max(1.5, Math.min(10, f.span || 3));
  const dir = new THREE.Vector3(...(opt.dir || [0.55, 1.0, 0.75])).normalize();
  let d = span * 1.4; const tmp = [];
  // (march toward the camera: stop short of the first surface met: a ceiling, a roof, a wall)
  for (let t = 0.6; t < d; t += 0.15) {
    const px = f.x + dir.x * t, py = f.y + dir.y * t, pz = f.z + dir.z * t;
    column(px, pz, tmp); if (tmp.some((h) => Math.abs(h.y - py) < 0.12)) { d = Math.max(0.8, t - 0.35); break; }
  }
  const gp = cam.position.clone(), gq = cam.quaternion.clone(), near = cam.near;
  cam.position.set(f.x + dir.x * d, f.y + dir.y * d, f.z + dir.z * d); cam.lookAt(f.x, f.y, f.z); cam.updateMatrixWorld();
  if (cam.near > 0.05) { cam.near = 0.05; cam.updateProjectionMatrix(); }
  const hv = G.hero.rig?.root?.visible; if (G.hero.rig?.root) G.hero.rig.root.visible = false;
  const out = [];
  const swaps = [];
  try {
    G.renderer.render(); out.push(G.renderer.renderer.domElement.toDataURL('image/jpeg', 0.82));
    if (opt.zmap && (f.A != null || f.B != null)) {
      const paint = (oi, hex) => { const O = objs[oi]; if (!O) return; const list = []; if (O.terrain) O.o.traverse((c) => { if (c.isMesh || c.isBatchedMesh) list.push(c); }); else list.push(O.o);
        const mat = (SW.paintM ??= {})[hex] ??= new THREE.MeshBasicMaterial({ color: hex, side: THREE.DoubleSide });
        for (const m of list) { const old = m.material; m.material = Array.isArray(old) ? old.map(() => mat) : mat; swaps.push([m, old]); } };
      if (f.A != null) paint(f.A, 0xff2020); if (f.B != null && f.B !== f.A) paint(f.B, 0x20ff20);
      G.renderer.render(); out.push(G.renderer.renderer.domElement.toDataURL('image/jpeg', 0.82));
    }
  } finally {
    for (const [m, old] of swaps) m.material = old;
    if (G.hero.rig?.root) G.hero.rig.root.visible = hv;
    cam.position.copy(gp); cam.quaternion.copy(gq); cam.near = near; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
  }
  return out;
};
})();
