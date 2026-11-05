// OVERLAP-1: coplanar surfaces that flicker (z-fighting), page side; loaded next to tests/lib/player.js by
// tests/overlaps.mjs. Complements tests/worldfit.mjs (3): that one pairs mesh triangles outdoors; this one also sees the
// ground (the terrain grid, read exactly as drawn) and the interiors, the way a player's eye does: along rays.
//
// OVL.init()                 once: three, and every view-culled instanced mesh with all its instances
// OVL.scan(area, opt)        area { room } (entered first) or { bounds: {x0,x1,z0,z1} } (outdoors). Every shown,
//                            static mesh of the scene in the area (characters, sprites, decals that write no depth,
//                            alpha-tested foliage and the draw batches' copies left out) as world triangles in 1 m cells,
//                            the terrain grids exactly as drawn. Then rays:
//                              down, every opt.step m (0.25): the surfaces met, in order, as drawn from above (a face's
//                              side honoured); two consecutive ones within opt.tol (0.02 m) on different meshes or in
//                              different looks (colour × vertex colour × instance colour, texture), facing the same way;
//                              across, along x and z every opt.hstep m (0.25), opt.heights over the ground (0.5, 1.5, 3;
//                              rooms pass their own and floorY): the same for walls.
//                            Each flagged ray: rank (opaque surfaces met before it on that ray), buried (seen from the
//                            side the faces look to, the point is inside a solid or sealed by a face pressed on it).
//                            Rays of one pair within 1.2 m of each other are one spot:
//                              { fam: floor|wall, n rays, vis (not buried), rank (min), gap (m, mean), x y z, box, nrm,
//                                A, B (objects), la, lb (their looks) } and D[A|B] describes the objects.
// OVL.shoot(spot, opt)       [plain, zmap] JPEG data URLs: the camera kept clear of ceilings and walls; zmap paints A
//                            red and B green (interleaved red and green where they fight). opt.pos / opt.look
// OVL.column(x, z)           every surface on the vertical line there (diagnosis)
(() => {
const G = game;
const OVL = window.OVL = {};
let THREE = null;
OVL.init = async () => { THREE = await import('three'); try { const V = await import('./src/engine/viewinst.js'); V.setViewInst(false); } catch (e) { OVL.viErr = String(e); } };

const effVisible = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
const hasBone = (o) => { for (let p = o.parent; p; p = p.parent) if (p.isBone || p.isSkinnedMesh) return true; return false; };
function pathOf(o) { const n = []; for (let p = o, k = 0; p && p !== G.scene && k < 6; p = p.parent, k++) n.push(p.name || (p.isMesh ? (p.geometry?.type || 'Mesh').replace('Geometry', '') : p.type)); return n.join('<'); }
function texName(m) { const t = m?.map; if (!t) return ''; return t.name || t.userData?.key || (t.image?.src ? t.image.src.slice(-30) : (t.source?.data?.id || t.uuid.slice(0, 6))); }

// --- triangle store
let N = 0, CAP = 0, P = null, NRM = null, OB = null, LK = null, SD = null;
function grow(n) { if (N + n <= CAP) return; let c = Math.max(CAP * 2, N + n, 1 << 16); const P2 = new Float32Array(c * 9), N2 = new Float32Array(c * 3), O2 = new Int32Array(c), L2 = new Int32Array(c), S2 = new Uint8Array(c);
  if (P) { P2.set(P); N2.set(NRM); O2.set(OB); L2.set(LK); S2.set(SD); } P = P2; NRM = N2; OB = O2; LK = L2; SD = S2; CAP = c; }
let objs = [], looks = [], lookKey = new Map(), bins = new Map(), CELL = 1, terrains = [];
const look = (k, info) => { let i = lookKey.get(k); if (i === undefined) { i = looks.length; looks.push(info); lookKey.set(k, i); } return i; };
const ck = (i, j) => i * 100003 + j;

function addMesh(o, A, stats) {
  const g = o.geometry, pos = g.attributes.position; if (!pos) return;
  const mats = Array.isArray(o.material) ? o.material : [o.material];
  const idx = g.index; const total = idx ? idx.count : pos.count;
  const ranges = (Array.isArray(o.material) && g.groups.length) ? g.groups.map((gr) => [gr.start, gr.start + gr.count, mats[gr.materialIndex]]) : [[g.drawRange.start, Math.min(total, g.drawRange.start + g.drawRange.count), mats[0]]];
  const col = g.attributes.color;
  const nInst = o.isInstancedMesh ? o.count : 1;
  const M = new THREE.Matrix4(), IM = new THREE.Matrix4(), v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], c = new THREE.Color(), ic = new THREE.Color();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nn = new THREE.Vector3();
  for (let ins = 0; ins < nInst; ins++) {
    M.copy(o.matrixWorld); if (o.isInstancedMesh) { o.getMatrixAt(ins, IM); M.multiply(IM); }
    const det = M.determinant();
    if (o.isInstancedMesh && o.instanceColor) o.getColorAt(ins, ic); else ic.setRGB(1, 1, 1);
    const oi = objs.length;
    objs.push({ o, ins: o.isInstancedMesh ? ins : -1 });
    let added = 0;
    for (const [s0, s1, m] of ranges) {
      if (!m || m.visible === false || m.colorWrite === false || (m.transparent && m.opacity < 0.03)) { stats.skipMat++; continue; }
      const side = m.side === THREE.DoubleSide ? 2 : ((m.side === THREE.BackSide) !== (det < 0) ? 1 : 0);
      const mc = m.color || c.setRGB(1, 1, 1);
      const tn = texName(m);
      for (let t = s0; t + 2 < s1 + 0.5 && t + 2 < total; t += 3) {
        let cr = 0, cg = 0, cb = 0;
        for (let k = 0; k < 3; k++) { const vi = idx ? idx.getX(t + k) : t + k; v[k].fromBufferAttribute(pos, vi).applyMatrix4(M); if (col && m.vertexColors) { cr += col.getX(vi); cg += col.getY(vi); cb += col.getZ(vi); } }
        let minx = Math.min(v[0].x, v[1].x, v[2].x), maxx = Math.max(v[0].x, v[1].x, v[2].x), minz = Math.min(v[0].z, v[1].z, v[2].z), maxz = Math.max(v[0].z, v[1].z, v[2].z);
        if (maxx < A.x0 || minx > A.x1 || maxz < A.z0 || minz > A.z1) continue;
        e1.subVectors(v[1], v[0]); e2.subVectors(v[2], v[0]); nn.crossVectors(e1, e2); const L = nn.length(); if (L < 1e-9) continue; nn.divideScalar(L);
        if (col && m.vertexColors) { cr /= 3; cg /= 3; cb /= 3; } else { cr = 1; cg = 1; cb = 1; }
        const R = cr * (mc.r ?? 1) * ic.r, Gc = cg * (mc.g ?? 1) * ic.g, B = cb * (mc.b ?? 1) * ic.b;
        const lk = look(`${Math.round(R * 40)},${Math.round(Gc * 40)},${Math.round(B * 40)}|${tn}|${m.transparent ? 't' : ''}|${m.polygonOffset ? 'po' : ''}`, { hex: '#' + new THREE.Color(R, Gc, B).getHexString(), tex: tn, transparent: !!m.transparent, depthWrite: m.depthWrite !== false, po: !!m.polygonOffset, mat: m.name || m.type });
        grow(1); const b = N * 9;
        for (let k = 0; k < 3; k++) { P[b + k * 3] = v[k].x; P[b + k * 3 + 1] = v[k].y; P[b + k * 3 + 2] = v[k].z; }
        NRM[N * 3] = nn.x; NRM[N * 3 + 1] = nn.y; NRM[N * 3 + 2] = nn.z; OB[N] = oi; LK[N] = lk; SD[N] = side;
        const i0 = Math.floor(minx / CELL), i1 = Math.floor(maxx / CELL), j0 = Math.floor(minz / CELL), j1 = Math.floor(maxz / CELL);
        if ((i1 - i0 + 1) * (j1 - j0 + 1) > 40000) { stats.huge++; }
        for (let i = Math.max(i0, Math.floor(A.x0 / CELL) - 1); i <= Math.min(i1, Math.floor(A.x1 / CELL) + 1); i++) for (let j = Math.max(j0, Math.floor(A.z0 / CELL) - 1); j <= Math.min(j1, Math.floor(A.z1 / CELL) + 1); j++) { const key = ck(i, j); let a = bins.get(key); if (!a) bins.set(key, a = []); a.push(N); }
        N++; added++;
      }
    }
    stats.tris += added;
    if (added) { const key = pathOf(o); stats.heavy[key] = (stats.heavy[key] || 0) + added; }
  }
}

function addTerrain(gr) {
  const full = gr.userData.full; if (!full) return;
  const p = full.attributes.position, n = Math.round(Math.sqrt(p.count)); if (n * n !== p.count) return;
  gr.updateWorldMatrix(true, false); const wp = new THREE.Vector3().setFromMatrixPosition(gr.matrixWorld);
  const x0 = p.getX(0), z0 = p.getZ(0), step = p.getX(1) - x0;
  const oi = objs.length; objs.push({ o: gr, ins: -1, terrain: true });
  terrains.push({ oi, n, x0: x0 + wp.x, z0: z0 + wp.z, step, oy: wp.y, p, look: look('terrain', { hex: 'terrain', tex: 'terrain', transparent: false, depthWrite: true, po: false, mat: 'terrain' }) });
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

// barycentric in a 2D projection: axes (a,b) indices into xyz; returns [u,v,w] or null
function bary(b, ax, bx, pa, pb, margin) {
  const ax0 = P[b + ax], ab0 = P[b + bx], ax1 = P[b + 3 + ax], ab1 = P[b + 3 + bx], ax2 = P[b + 6 + ax], ab2 = P[b + 6 + bx];
  const d = (ab1 - ab2) * (ax0 - ax2) + (ax2 - ax1) * (ab0 - ab2); if (Math.abs(d) < 1e-12) return null;
  const u = ((ab1 - ab2) * (pa - ax2) + (ax2 - ax1) * (pb - ab2)) / d; if (u < margin) return null;
  const w1 = ((ab2 - ab0) * (pa - ax2) + (ax0 - ax2) * (pb - ab2)) / d; if (w1 < margin) return null;
  const w2 = 1 - u - w1; if (w2 < margin) return null;
  return [u, w1, w2];
}

let stampArr = null, stampN = 0;
function scanRays(A, opt, out) {
  const tol = opt.tol ?? 0.02, EPS = 1e-4;
  const hits = [];
  const rendered = (side, ndir) => side === 2 || (side === 0 ? ndir < 0 : ndir > 0);   // ndir: normal · ray dir
  const report = (kind, arr, axisSign) => {
    // arr: [{t, tri|-1, oi, lk, nd}] sorted by t (distance from ray origin)
    let rank = 0;
    for (let k = 0; k < arr.length; k++) {
      const a = arr[k];
      for (let q = k + 1; q < arr.length && arr[q].t - a.t < tol; q++) {
        const b = arr[q];
        if (a.oi === b.oi && a.lk === b.lk) continue;
        if (a.oi === b.oi && objs[a.oi].terrain) continue;
        // coplanar: normals nearly parallel, same facing
        if (a.nx * b.nx + a.ny * b.ny + a.nz * b.nz < 0.9) continue;
        out.push({ kind, x: a.x, y: a.y, z: a.z, gap: b.t - a.t, oa: a.oi, ob: b.oi, la: a.lk, lb: b.lk, rank, nx: a.nx, ny: a.ny, nz: a.nz });
      }
      const L = looks[a.lk]; if (!L.transparent) rank++;
    }
  };
  // vertical rays
  const s = opt.step ?? 0.25, jx = 0.0731, jz = 0.1173;
  let nv = 0;
  for (let x = A.x0 + jx; x < A.x1; x += s) for (let z = A.z0 + jz; z < A.z1; z += s) {
    hits.length = 0;
    const bin = bins.get(ck(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (bin) for (const t of bin) {
      const ny = NRM[t * 3 + 1]; if (Math.abs(ny) < 0.3) continue;
      if (!rendered(SD[t], -ny)) continue;
      const bb = bary(t * 9, 0, 2, x, z, EPS); if (!bb) continue;
      const b = t * 9, y = bb[0] * P[b + 1] + bb[1] * P[b + 4] + bb[2] * P[b + 7];
      if (y < A.y0 || y > A.y1) continue;
      hits.push({ t: -y, x, y, z, oi: OB[t], lk: LK[t], nx: NRM[t * 3], ny, nz: NRM[t * 3 + 2] });
    }
    for (const T of terrains) { const y = terrainHit(T, x, z); if (y != null && y >= A.y0 && y <= A.y1) hits.push({ t: -y, x, y, z, oi: T.oi, lk: T.look, nx: 0, ny: 1, nz: 0 }); }
    if (hits.length < 2) continue;
    hits.sort((a, b) => a.t - b.t); nv++;
    report('floor', hits);
  }
  // horizontal rays along x and along z, segments of SEG m, heights above the local ground
  const SEG = 4, H = opt.heights ?? [0.5, 1.5, 3];
  if (!stampArr || stampArr.length < N) stampArr = new Uint32Array(Math.max(N, 1 << 16) * 2);
  const ground = (x, z) => { let g = -1e9; for (const T of terrains) { const y = terrainHit(T, x, z); if (y != null && y > g) g = y; } return g > -1e8 ? g : (opt.floorY ?? A.y0); };
  const hs = opt.hstep ?? 0.25; let nh = 0;
  for (const axis of ['x', 'z']) {
    const along = axis === 'x' ? 0 : 2, across = axis === 'x' ? 2 : 0;
    const [a0, a1] = axis === 'x' ? [A.x0, A.x1] : [A.z0, A.z1], [c0, c1] = axis === 'x' ? [A.z0, A.z1] : [A.x0, A.x1];
    for (let c = c0 + 0.0913; c < c1; c += hs) for (let a = a0; a < a1; a += SEG) {
      const am = a + SEG / 2; const gx = axis === 'x' ? am : c, gz = axis === 'x' ? c : am;
      const gy = opt.floorY != null ? opt.floorY : ground(gx, gz);
      // triangles of the cells along the segment
      stampN++; const cand = [];
      for (let k = Math.floor(a / CELL); k <= Math.floor((a + SEG) / CELL); k++) {
        const bin = bins.get(axis === 'x' ? ck(k, Math.floor(c / CELL)) : ck(Math.floor(c / CELL), k)); if (!bin) continue;
        for (const t of bin) { if (stampArr[t] === stampN) continue; stampArr[t] = stampN; if (Math.abs(NRM[t * 3 + along]) >= 0.3) cand.push(t); }
      }
      if (cand.length < 2) continue;
      for (const hh of H) {
        const y = gy + hh;
        // axis x: project to (y,z) plane: indices 1,2 ; axis z: project to (x,y): 0,1
        const pa = axis === 'x' ? 1 : 0, pb = axis === 'x' ? 2 : 1, va = axis === 'x' ? y : c, vb = axis === 'x' ? c : y;
        for (const dir of [1, -1]) {
          hits.length = 0;
          for (const t of cand) {
            const nd = NRM[t * 3 + along] * dir; if (!rendered(SD[t], nd)) continue;
            const bb = bary(t * 9, pa, pb, va, vb, EPS); if (!bb) continue;
            const b = t * 9, p = bb[0] * P[b + along] + bb[1] * P[b + 3 + along] + bb[2] * P[b + 6 + along];
            if (p < a || p > a + SEG) continue;
            const x = axis === 'x' ? p : c, z = axis === 'x' ? c : p;
            hits.push({ t: dir > 0 ? p - a : a + SEG - p, x, y, z, oi: OB[t], lk: LK[t], nx: NRM[t * 3], ny: NRM[t * 3 + 1], nz: NRM[t * 3 + 2] });
          }
          if (hits.length < 2) continue;
          hits.sort((u, w) => u.t - w.t); nh++;
          report('wall' + hh, hits);
        }
      }
    }
  }
  return { nv, nh };
}

function describe(oi) {
  const O = objs[oi], o = O.o;
  if (O.terrain) return { path: 'TERRAIN', terrain: true };
  const m = Array.isArray(o.material) ? o.material[0] : o.material;
  const bb = new THREE.Box3().setFromObject(o);
  return { path: pathOf(o), ins: O.ins, geo: o.geometry?.type, mat: m?.type, name: m?.name, color: m?.color?.getHexString?.(), tex: texName(m), ud: Object.keys(o.userData || {}).slice(0, 6), keep: !!o.userData?.keep,
    box: [bb.min.x, bb.min.y, bb.min.z, bb.max.x, bb.max.y, bb.max.z].map((v) => +v.toFixed(2)), tris: (o.geometry?.index ? o.geometry.index.count : o.geometry?.attributes?.position?.count) / 3 };
}

function cluster(raw) {
  // group by pair (unordered) + kind family (floor / wall), then union nearby points (< 1.2 m)
  const groups = new Map();
  for (const r of raw) {
    const fam = r.kind === 'floor' ? 'floor' : 'wall';
    const key = fam + ':' + Math.min(r.oa, r.ob) + ':' + Math.max(r.oa, r.ob) + ':' + Math.min(r.la, r.lb) + ':' + Math.max(r.la, r.lb);
    let g = groups.get(key); if (!g) groups.set(key, g = []); g.push(r);
  }
  const spots = [];
  for (const [key, list] of groups) {
    const used = new Uint8Array(list.length);
    for (let i = 0; i < list.length; i++) {
      if (used[i]) continue; used[i] = 1; const cl = [list[i]];
      for (let q = 0; q < cl.length; q++) for (let j = 0; j < list.length; j++) if (!used[j] && Math.abs(list[j].x - cl[q].x) < 1.2 && Math.abs(list[j].z - cl[q].z) < 1.2 && Math.abs(list[j].y - cl[q].y) < 1.2) { used[j] = 1; cl.push(list[j]); }
      let x = 0, y = 0, z = 0, gap = 0, rank = 99, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const r of cl) { x += r.x; y += r.y; z += r.z; gap += r.gap; rank = Math.min(rank, r.rank); x0 = Math.min(x0, r.x); x1 = Math.max(x1, r.x); z0 = Math.min(z0, r.z); z1 = Math.max(z1, r.z); y0 = Math.min(y0, r.y); y1 = Math.max(y1, r.y); }
      const n = cl.length, r0 = cl[0];
      spots.push({ fam: key.split(':')[0], n, vis: cl.filter((r) => !r.bur).length,x: +(x / n).toFixed(2), y: +(y / n).toFixed(3), z: +(z / n).toFixed(2), gap: +(gap / n).toFixed(4), rank, box: [x0, y0, z0, x1, y1, z1].map((v) => +v.toFixed(2)), nrm: [r0.nx, r0.ny, r0.nz].map((v) => +v.toFixed(2)),
        A: r0.oa, B: r0.ob, la: looks[r0.la], lb: looks[r0.lb], kinds: [...new Set(cl.map((r) => r.kind))] });
    }
  }
  spots.sort((a, b) => (a.rank - b.rank) || (b.n - a.n));
  return spots;
}

OVL.prepare = async (area) => {
  if (!THREE) await OVL.init();
  if (area.room) { if (G.room?.id !== area.room) { G.enterRoom(area.room, null, true); for (let i = 0; i < 10; i++) G.step(0.05); } }
  else if (G.room) { G.exitRoom({ x: -40, z: -10, a: 0 }, true); for (let i = 0; i < 10; i++) G.step(0.05); }
  const R = area.room ? G.rooms[area.room] : null;
  G.scene.updateMatrixWorld(true);
  let A = area.bounds ? { ...area.bounds } : null;
  if (!A && R) { const bb = new THREE.Box3(); R.group.traverse((o) => { if (o.isMesh && effVisible(o) && !o.userData.drawBatch && o.name !== 'drawBatch') bb.expandByObject(o); }); A = { x0: bb.min.x - 0.5, x1: bb.max.x + 0.5, z0: bb.min.z - 0.5, z1: bb.max.z + 0.5, y0: bb.min.y - 1, y1: bb.max.y + 1 }; }
  A.y0 ??= -50; A.y1 ??= 400;
  return A;
};

OVL.scan = async (area, opt = {}) => {
  const A = await OVL.prepare(area);
  N = 0; objs = []; looks = []; lookKey = new Map(); bins = new Map(); terrains = [];
  const stats = { meshes: 0, tris: 0, skipMat: 0, skipped: {}, huge: 0, heavy: {} };
  const skip = (why) => { stats.skipped[why] = (stats.skipped[why] || 0) + 1; };
  const t0 = performance.now();
  const bb = new THREE.Box3();
  G.scene.traverse((o) => {
    if (o.name === 'terrain' && o.isGroup && effVisible(o)) { addTerrain(o); return; }
    if (!o.isMesh || o.isSprite) return;
    if (o.name === 'terrain') return;
    if (o.name === 'drawBatch' || o.name === 'shadowBatch' || o.userData.drawBatch || o.userData.shadowProxy) return skip('batch');
    if (o.isSkinnedMesh || hasBone(o)) return skip('skinned');
    if (!effVisible(o)) return skip('hidden');
    if (o.isBatchedMesh) return skip('batchedmesh');
    if (o.material?.alphaTest > 0 && o.isInstancedMesh) return skip('foliage');
    if (o.name === 'blobBatch' || (!Array.isArray(o.material) && o.material?.transparent && o.material.depthWrite === false)) return skip('decal');
    if (opt.skipName && opt.skipName.test(pathOf(o))) return skip('name');
    if (!o.isInstancedMesh) { bb.setFromObject(o); if (bb.max.x < A.x0 || bb.min.x > A.x1 || bb.max.z < A.z0 || bb.min.z > A.z1 || bb.max.y < A.y0 || bb.min.y > A.y1) return; }
    stats.meshes++;
    addMesh(o, A, stats);
  });
  const t1 = performance.now();
  const raw = [];
  const rs = scanRays(A, opt, raw);
  // buried: seen from the side the faces look to, is the point inside a solid (the first thing met is a back face)?
  firstHit.min = 0.0005; firstHit.skipT = 0.024;
  for (const r of raw) { firstHit.nd = 0; const t = firstHit([r.x - r.nx * 0.003, r.y - r.ny * 0.003, r.z - r.nz * 0.003], [r.nx, r.ny, r.nz], 1.5); r.bur = t < 0.013 || (t < 1.5 && firstHit.nd > 0) ? 1 : 0; }
  firstHit.min = 0.05; firstHit.skipT = 0;
  const t2 = performance.now();
  const spots = cluster(raw);
  const objIds = new Set(); for (const s of spots) { objIds.add(s.A); objIds.add(s.B); }
  const D = {}; for (const i of objIds) D[i] = describe(i);
  const heavy = Object.entries(stats.heavy).sort((a, b) => b[1] - a[1]).slice(0, 15);
  OVL.last = { A, spots };
  return { area, A, census: { meshes: stats.meshes, tris: stats.tris, skipMat: stats.skipMat, skipped: stats.skipped, terrains: terrains.length, rays: rs, raw: raw.length, ms: [Math.round(t1 - t0), Math.round(t2 - t1)], heavy }, spots, D };
};

// the first surface (any facing) from o along unit dir, within maxT (the stored triangles; terrain ignored)
function firstHit(o, dir, maxT) {
  const seen = new Set(); let best = maxT;
  for (let t = 0; t <= maxT + CELL; t += CELL * 0.5) {
    const x = o[0] + dir[0] * t, z = o[2] + dir[2] * t;
    const bin = bins.get(ck(Math.floor(x / CELL), Math.floor(z / CELL))); if (!bin) continue;
    for (const tri of bin) {
      if (seen.has(tri)) continue; seen.add(tri);
      const b = tri * 9;
      const e1x = P[b + 3] - P[b], e1y = P[b + 4] - P[b + 1], e1z = P[b + 5] - P[b + 2], e2x = P[b + 6] - P[b], e2y = P[b + 7] - P[b + 1], e2z = P[b + 8] - P[b + 2];
      const px = dir[1] * e2z - dir[2] * e2y, py = dir[2] * e2x - dir[0] * e2z, pz = dir[0] * e2y - dir[1] * e2x;
      const det = e1x * px + e1y * py + e1z * pz; if (Math.abs(det) < 1e-12) continue;
      const inv = 1 / det, sx = o[0] - P[b], sy = o[1] - P[b + 1], sz = o[2] - P[b + 2];
      const u = (sx * px + sy * py + sz * pz) * inv; if (u < 0 || u > 1) continue;
      const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
      const v = (dir[0] * qx + dir[1] * qy + dir[2] * qz) * inv; if (v < 0 || u + v > 1) continue;
      const tt = (e2x * qx + e2y * qy + e2z * qz) * inv; const ndh = NRM[tri * 3] * dir[0] + NRM[tri * 3 + 1] * dir[1] + NRM[tri * 3 + 2] * dir[2]; if (firstHit.skipT && ndh > 0.9 && tt < firstHit.skipT) continue; if (tt > (firstHit.min ?? 0.05) && tt < best) { best = tt; firstHit.nd = NRM[tri * 3] * dir[0] + NRM[tri * 3 + 1] * dir[1] + NRM[tri * 3 + 2] * dir[2]; firstHit.oi = OB[tri]; }
    }
    if (dir[0] === 0 && dir[2] === 0) break;
  }
  return best;
}
OVL.firstHit = firstHit;
// every stored triangle crossing the vertical line at (x, z): [y, normal y, side, object path, look]
OVL.column = (x, z) => {
  const out = [], bin = bins.get(ck(Math.floor(x / CELL), Math.floor(z / CELL))) || [];
  for (const t of bin) { const bb = bary(t * 9, 0, 2, x, z, -1e-6); if (!bb) continue; const b = t * 9; const y = bb[0] * P[b + 1] + bb[1] * P[b + 4] + bb[2] * P[b + 7];
    const O = objs[OB[t]]; const bx = new THREE.Box3().setFromObject(O.o); out.push([+y.toFixed(4), +NRM[t * 3 + 1].toFixed(2), SD[t], pathOf(O.o), looks[LK[t]].hex + '/' + looks[LK[t]].tex, OB[t], [bx.min.y, bx.max.y].map((v) => +v.toFixed(3))]); }
  for (const T of terrains) { const y = terrainHit(T, x, z); if (y != null) out.push([+y.toFixed(4), 1, 0, 'TERRAIN', 'terrain', T.oi, [y, y]]); }
  return out.sort((a, b) => b[0] - a[0]);
};
// a picture of a spot: from above for a floor, from its facing side for a wall (kept under any ceiling / in front of
// anything standing before the wall, so the spot itself is in view)
OVL.shoot = (s, opt = {}) => {
  const cam = G.camera; let d = opt.d ?? 3.2;
  const P0 = new THREE.Vector3(s.x, s.y, s.z);
  if (s.fam === 'floor') {
    const dir = new THREE.Vector3(0.55, 1, 0.75).normalize().toArray();
    d = Math.min(d * 1.45, firstHit([s.x, s.y + 0.02, s.z], dir, d * 1.45) - 0.25) / 1.45;
    cam.position.set(s.x + d * 0.55, s.y + d, s.z + d * 0.75);
  } else {
    const dir = new THREE.Vector3(s.nrm[0] + s.nrm[2] * 0.25, 0.2, s.nrm[2] + s.nrm[0] * 0.25).normalize();
    const t = Math.min(d, firstHit([s.x + s.nrm[0] * 0.02, s.y, s.z + s.nrm[2] * 0.02], dir.toArray(), d) - 0.25);
    cam.position.set(s.x + dir.x * t, s.y + dir.y * t, s.z + dir.z * t);
  }
  if (opt.pos) cam.position.set(...opt.pos);
  cam.lookAt(opt.look ? new THREE.Vector3(...opt.look) : P0); cam.updateMatrixWorld();
  if (cam.near > 0.1) { cam.near = 0.1; cam.updateProjectionMatrix(); }
  G.renderer.render();
  const plain = G.renderer.renderer.domElement.toDataURL('image/jpeg', 0.85);
  if (!opt.zmap || s.A === s.B || !objs[s.A] || !objs[s.B]) return [plain];
  // the pair in flat red (A) and green (B): interleaved red/green where they fight
  const swaps = [];
  const paint = (oi, hex) => { const O = objs[oi]; const list = []; if (O.terrain) O.o.traverse((c) => { if (c.isMesh || c.isBatchedMesh) list.push(c); }); else list.push(O.o);
    for (const m of list) { const old = m.material; const mk = (x) => new THREE.MeshBasicMaterial({ color: hex, side: x?.side ?? 0 }); m.material = Array.isArray(old) ? old.map(mk) : mk(old); swaps.push([m, old]); } };
  paint(s.A, 0xff2020); paint(s.B, 0x20ff20);
  try { G.renderer.render(); return [plain, G.renderer.renderer.domElement.toDataURL('image/jpeg', 0.85)]; }
  finally { for (const [m, old] of swaps) m.material = old; G.renderer.render(); }
};
})();
