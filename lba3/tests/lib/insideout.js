// INSIDE-OUT, page side (tests/inside-out.mjs loads it). Every mesh of an area (its group, Citadel's world root, or
// what else is in the scene: people's rigs, pickups) is cut into its connected parts (triangles that share a corner,
// welded at WELD = 3 mm: the lathe helpers clamp the axis to r = 0.001, so a finer weld leaves a pinhole in the very
// parts looked for), and each part is judged from its triangles in the geometry's own frame:
//   closed  the sum of its triangles' area vectors is ~0 (|S| / area < CLOSED) and its open edges are short (a
//           pinhole: their length / sqrt(area) < RIM; a tube without caps sums to ~0 too): its signed volume (about its centre)
//           says which way it is wound: negative = inside out (its faces point in; drawn one-sided, its outside is
//           culled from every view outside it)
//   open    otherwise: the area-weighted mean of (face normal . (face centre - part centre) / distance) says whether its
//           faces point away from its middle (+1) or towards it (-1); listed only (a room's shell, a bowl, a cave all
//           point in on purpose)
// The way it is drawn: a material's side (FrontSide 0 | BackSide 1 | DoubleSide: left out), and an instance's own
// mirror (three.js flips the front face per object, by matrixWorld's determinant, never per instance: a mirrored
// instance is drawn inside out). An object's mirror is compensated by the renderer, so it does not count.
// IO.scan(rootSpec) → { meshes, parts, tris, closed: [...], open: [...], skipped }
(() => {
const G = game;
const IO = window.IO = {};
let THREE = null;
IO.init = async () => { THREE = window.__T3 = await import('three'); try { const V = await import('./src/engine/viewinst.js'); V.setViewInst(false); } catch (e) { /* no view instancing */ } };
const WELD = 0.003, CLOSED = 0.01, RIM = 0.05;   // (RIM: its open edges' length / sqrt(its area): a pinhole, not a rim)
const effVisible = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
const onBone = (o) => { for (let p = o.parent; p; p = p.parent) if (p.isBone || p.isSkinnedMesh) return true; return false; };
function pathOf(o) { const n = []; for (let p = o, k = 0; p && p !== G.scene && k < 7; p = p.parent, k++) n.push(p.name || (p.isMesh ? (p.geometry?.type || 'Mesh').replace('Geometry', '') : p.type)); return n.join('<'); }
function texName(m) { const t = m?.map; if (!t) return ''; return t.name || t.userData?.key || (t.image?.src ? t.image.src.slice(-30) : t.uuid.slice(0, 6)); }
const sideOf = (m) => (!m || m.visible === false || m.colorWrite === false || (m.transparent && m.opacity < 0.03)) ? -1 : m.side === THREE.DoubleSide ? 2 : m.side === THREE.BackSide ? 1 : 0;

// the parts of a geometry, in its own frame (cached per geometry and material layout)
const cache = new Map();
function parts(g, sides) {
  const key = g.uuid + ':' + g.attributes.position.version + ':' + sides.join('');
  if (cache.has(key)) return cache.get(key);
  const pos = g.attributes.position, idx = g.index, total = idx ? idx.count : pos.count, nT = Math.floor(total / 3);
  const triSide = new Int8Array(nT).fill(sides.length === 1 ? sides[0] : -1);
  if (sides.length > 1 && g.groups.length) for (const gr of g.groups) { const s = sides[gr.materialIndex] ?? -1; for (let t = Math.floor(gr.start / 3); t < Math.min(nT, Math.floor((gr.start + gr.count) / 3)); t++) triSide[t] = s; }
  // weld the corners, then union the triangles that share one
  const vid = new Int32Array(pos.count), seen = new Map(); let nv = 0;
  for (let i = 0; i < pos.count; i++) {
    const h = Math.round(pos.getX(i) / WELD) + ',' + Math.round(pos.getY(i) / WELD) + ',' + Math.round(pos.getZ(i) / WELD);
    let v = seen.get(h); if (v === undefined) { v = nv++; seen.set(h, v); } vid[i] = v;
  }
  const par = new Int32Array(nT); for (let i = 0; i < nT; i++) par[i] = i;
  const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
  const firstT = new Int32Array(nv).fill(-1);
  const corner = (t, k) => (idx ? idx.getX(t * 3 + k) : t * 3 + k);
  for (let t = 0; t < nT; t++) { if (triSide[t] < 0 || triSide[t] === 2) continue; for (let k = 0; k < 3; k++) { const v = vid[corner(t, k)], f = firstT[v]; if (f < 0) firstT[v] = t; else { const a = find(f), b = find(t); if (a !== b) par[a] = b; } } }
  const P = new Map();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3();
  // pass 1: area, area vector, area-weighted centre, box, sides
  for (let t = 0; t < nT; t++) {
    const s = triSide[t]; if (s < 0 || s === 2) continue;
    a.fromBufferAttribute(pos, corner(t, 0)); b.fromBufferAttribute(pos, corner(t, 1)); c.fromBufferAttribute(pos, corner(t, 2));
    e1.subVectors(b, a); e2.subVectors(c, a); n.crossVectors(e1, e2); const A2 = n.length(); if (A2 < 1e-12) continue;
    const r = find(t); let p = P.get(r);
    if (!p) P.set(r, p = { tris: [], A: 0, S: [0, 0, 0], C: [0, 0, 0], box: [1e9, 1e9, 1e9, -1e9, -1e9, -1e9], front: 0, back: 0, t0: t });
    p.tris.push(t); const A = A2 / 2; p.A += A; p.S[0] += n.x / 2; p.S[1] += n.y / 2; p.S[2] += n.z / 2;
    p.C[0] += A * (a.x + b.x + c.x) / 3; p.C[1] += A * (a.y + b.y + c.y) / 3; p.C[2] += A * (a.z + b.z + c.z) / 3;
    for (const v of [a, b, c]) { const B = p.box; if (v.x < B[0]) B[0] = v.x; if (v.y < B[1]) B[1] = v.y; if (v.z < B[2]) B[2] = v.z; if (v.x > B[3]) B[3] = v.x; if (v.y > B[4]) B[4] = v.y; if (v.z > B[5]) B[5] = v.z; }
    if (s === 1) p.back += A; else p.front += A;
  }
  // the part's open edges (a corner pair used by one triangle only): a tube without its caps sums its area vectors to
  // zero as a closed part does, but its rims are open edges
  const edges = new Map(), wpos = new Float64Array(nv * 3);
  for (let i = 0; i < pos.count; i++) { const v = vid[i]; wpos[v * 3] = pos.getX(i); wpos[v * 3 + 1] = pos.getY(i); wpos[v * 3 + 2] = pos.getZ(i); }
  for (const p of P.values()) for (const t of p.tris) for (let k = 0; k < 3; k++) {
    const va = vid[corner(t, k)], vb = vid[corner(t, (k + 1) % 3)]; if (va === vb) continue;
    const key = va < vb ? va * nv + vb : vb * nv + va; edges.set(key, (edges.get(key) || 0) + 1);
  }
  for (const p of P.values()) { let L = 0; for (const t of p.tris) for (let k = 0; k < 3; k++) {
    const va = vid[corner(t, k)], vb = vid[corner(t, (k + 1) % 3)]; if (va === vb) continue;
    const key = va < vb ? va * nv + vb : vb * nv + va; if (edges.get(key) % 2 === 1) L += Math.hypot(wpos[va * 3] - wpos[vb * 3], wpos[va * 3 + 1] - wpos[vb * 3 + 1], wpos[va * 3 + 2] - wpos[vb * 3 + 2]);
  } p.rim = L; }
  // pass 2: signed volume about the centre; the normals' mean against the centre
  const out = [];
  for (const p of P.values()) {
    if (p.A <= 0) continue;
    const cx = p.C[0] / p.A, cy = p.C[1] / p.A, cz = p.C[2] / p.A;
    let V = 0, dirW = 0;
    for (const t of p.tris) {
      a.fromBufferAttribute(pos, corner(t, 0)); b.fromBufferAttribute(pos, corner(t, 1)); c.fromBufferAttribute(pos, corner(t, 2));
      a.x -= cx; a.y -= cy; a.z -= cz; b.x -= cx; b.y -= cy; b.z -= cz; c.x -= cx; c.y -= cy; c.z -= cz;
      n.crossVectors(b, c); V += a.dot(n) / 6;
      e1.subVectors(b, a); e2.subVectors(c, a); n.crossVectors(e1, e2); const A2 = n.length(); if (A2 < 1e-12) continue;
      const mx = (a.x + b.x + c.x) / 3, my = (a.y + b.y + c.y) / 3, mz = (a.z + b.z + c.z) / 3, ml = Math.hypot(mx, my, mz);
      if (ml > 1e-9) dirW += (n.x * mx + n.y * my + n.z * mz) / ml / 2;   // (area x cos)
    }
    const B = p.box, bv = Math.max(1e-12, (B[3] - B[0]) * (B[4] - B[1]) * (B[5] - B[2]));
    out.push({ n: p.tris.length, t0: p.t0, A: p.A, open: Math.hypot(...p.S) / p.A, rim: p.rim / Math.sqrt(p.A), V, fill: Math.abs(V) / bv, dir: dirW / p.A, box: B, c: [cx, cy, cz], side: p.back > p.front ? 1 : 0 });
  }
  cache.set(key, out);
  return out;
}

const r2 = (v) => Math.round(v * 100) / 100, r3 = (v) => Math.round(v * 1000) / 1000;
// spec: { room } | { citadel: true } | { rest: true } (the scene outside every area's root: rigs, pickups, the sky)
IO.scan = (spec, roots) => {
  const res = { meshes: 0, tris: 0, parts: 0, closed: [], open: [], skipped: {} };
  const skip = (why) => { res.skipped[why] = (res.skipped[why] || 0) + 1; };
  const M = new THREE.Matrix4(), IM = new THREE.Matrix4(), w = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  const visit = (o) => {
    if (!o.isMesh || o.isSprite) return;
    if (o.isSkinnedMesh) return skip('skinned');
    if (o.isBatchedMesh) return skip('batchedmesh');
    if (o.name === 'drawBatch' || o.name === 'shadowBatch' || o.userData.drawBatch || o.userData.shadowProxy) return skip('batch copy');
    const g = o.geometry; if (!g?.attributes?.position) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const sides = mats.map(sideOf);
    if (sides.every((x) => x < 0)) return skip('not drawn');
    if (sides.every((x) => x === 2 || x < 0)) return skip('two-sided');
    res.meshes++;
    const P = parts(g, sides); res.parts += P.length;
    o.updateWorldMatrix(true, false);
    const shown = effVisible(o), bone = onBone(o);
    const nInst = o.isInstancedMesh ? o.count : 1;
    for (const p of P) {
      res.tris += p.n * nInst;
      if (p.A < 1e-5) continue;   // (a crumb: under 0.1 cm^2)
      const closed = p.open < CLOSED && p.rim < RIM && p.fill > 0.005;
      // the instances: each one's own mirror (an object's is compensated by the renderer)
      let flips = 0, kept = 0, first = -1;
      for (let i = 0; i < nInst; i++) {
        let det = 1;
        if (o.isInstancedMesh) { o.getMatrixAt(i, IM); IM.decompose(w, q, s); if (Math.abs(s.x * s.y * s.z) < 1e-6) continue; det = IM.determinant(); }
        kept++;
        const inward = (closed ? p.V : p.dir) * (det < 0 ? -1 : 1) * (p.side === 1 ? -1 : 1) < 0;
        if (inward) { flips++; if (first < 0) first = i; }
      }
      if (!flips) continue;
      // where it is in the world (the first inward instance)
      M.copy(o.matrixWorld); if (o.isInstancedMesh) { o.getMatrixAt(first, IM); M.multiply(IM); }
      const B = p.box, corners = [];
      for (const x of [B[0], B[3]]) for (const y of [B[1], B[4]]) for (const z of [B[2], B[5]]) corners.push(new THREE.Vector3(x, y, z).applyMatrix4(M));
      const wb = [Math.min(...corners.map((v) => v.x)), Math.min(...corners.map((v) => v.y)), Math.min(...corners.map((v) => v.z)), Math.max(...corners.map((v) => v.x)), Math.max(...corners.map((v) => v.y)), Math.max(...corners.map((v) => v.z))];
      M.decompose(w, q, s); const sc = Math.abs(s.x * s.y * s.z);
      const m0 = mats[0];
      const f = { path: pathOf(o), geo: g.uuid.slice(0, 8), gtype: g.type, t0: p.t0, tris: p.n, inst: o.isInstancedMesh ? `${flips}/${kept}` : null,
        mirrorInst: o.isInstancedMesh && (p.V * (p.side === 1 ? -1 : 1)) > 0, size: r2(Math.max(wb[3] - wb[0], wb[4] - wb[1], wb[5] - wb[2])),
        box: wb.map(r2), at: [r2((wb[0] + wb[3]) / 2), r2((wb[1] + wb[4]) / 2), r2((wb[2] + wb[5]) / 2)], m2: r3(p.A * Math.cbrt(sc) ** 2), vol: r3(p.V * sc), fill: r2(p.fill), open: r3(p.open), rim: r3(p.rim), dir: r2(p.dir),
        side: p.side ? 'back' : 'front', hex: m0?.color ? '#' + m0.color.getHexString() : '', tex: texName(m0), shown, bone };
      (closed ? res.closed : res.open).push(f);
    }
  };
  for (const r of roots) r.traverse(visit);
  return res;
};
// the roots of an area: a room's group; Citadel: the world's root; rest: what is in the scene under neither
IO.roots = (spec) => {
  if (spec.room) return [G.rooms[spec.room].group];
  if (spec.citadel) return [G.world.root];
  const own = new Set([G.world?.root, ...Object.values(G.rooms).map((R) => R.group)].filter(Boolean));
  return G.scene.children.filter((c) => !own.has(c));
};
})();
