// Procedural sculpting: characters are modelled as signed-distance shapes
// (ellipsoids, tapered capsules, tori…) blended with smooth unions, then
// polygonised with Surface Nets into ONE continuous mesh, painted with
// vertex colours (material regions, subtle variation, crease occlusion)
// and automatically skinned to a bone hierarchy.
//
// This gives sculpted, connected bodies (necks that flow into shoulders,
// cheeks, chins, a tunic with a thick hem) instead of visible primitives.
import * as THREE from 'three';

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

// ---------------------------------------------------------------- SDF primitives
function sdEllipsoid(px, py, pz, p) {
  const x = (px - p.c[0]) / p.r[0], y = (py - p.c[1]) / p.r[1], z = (pz - p.c[2]) / p.r[2];
  const k0 = Math.sqrt(x * x + y * y + z * z);
  const x1 = x / p.r[0], y1 = y / p.r[1], z1 = z / p.r[2];
  const k1 = Math.sqrt(x1 * x1 + y1 * y1 + z1 * z1);
  return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(p.r[0], p.r[1], p.r[2]);
}
// tapered capsule between a (radius r1) and b (radius r2) — iq's round cone
function sdRoundCone(px, py, pz, p) {
  const bax = p.b[0] - p.a[0], bay = p.b[1] - p.a[1], baz = p.b[2] - p.a[2];
  const pax = px - p.a[0], pay = py - p.a[1], paz = pz - p.a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = p.r1 - p.r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const y = pax * bax + pay * bay + paz * baz;
  const z = y - l2;
  const qx = pax * l2 - bax * y, qy = pay * l2 - bay * y, qz = paz * l2 - baz * y;
  const x2 = qx * qx + qy * qy + qz * qz;
  const y2 = y * y * l2;
  const z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - p.r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - p.r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - p.r1;
}
// flared skirt: capped cone between y=c-h (radius rb) and y=c+h (radius rt), rounded edges
function sdCappedCone(px, py, pz, p) {
  const x = px - p.c[0], y = py - p.c[1], z = (pz - p.c[2]) / (p.sz || 1);
  const h = p.h, r1 = p.rb, r2 = p.rt;
  const qx = Math.hypot(x, z), qy = y;
  const k2x = r2 - r1, k2y = 2 * h;
  const cax = qx - Math.min(qx, qy < 0 ? r1 : r2), cay = Math.abs(qy) - h;
  const k1x = r2, k1y = h;
  const t = Math.max(0, Math.min(1, ((k1x - qx) * k2x + (k1y - qy) * k2y) / (k2x * k2x + k2y * k2y)));
  const cbx = qx - k1x + k2x * t, cby = qy - k1y + k2y * t;
  const sgn = cbx < 0 && cay < 0 ? -1 : 1;
  return sgn * Math.sqrt(Math.min(cax * cax + cay * cay, cbx * cbx + cby * cby)) * Math.min(1, p.sz || 1) - (p.round || 0);
}
// open bell (a wide sleeve): the shell of a tapered capsule from a (r1) to b (r2), wall thickness `wall`,
// cut flat through b across the axis so the wide end is open and shows the cloth's thickness
function sdBell(px, py, pz, p) {
  const dc = sdRoundCone(px, py, pz, p);
  const shell = Math.abs(dc + p.wall * 0.5) - p.wall * 0.5;
  const ax = p.b[0] - p.a[0], ay = p.b[1] - p.a[1], az = p.b[2] - p.a[2], l = Math.hypot(ax, ay, az);
  const t = ((px - p.b[0]) * ax + (py - p.b[1]) * ay + (pz - p.b[2]) * az) / l;
  return Math.max(shell, t);
}
function sdTorusY(px, py, pz, p) {
  const x = px - p.c[0], y = py - p.c[1], z = (pz - p.c[2]) / (p.sz || 1);
  const q = Math.hypot(x, z) - p.R;
  return Math.hypot(q, y) - p.r;
}
function sdBox(px, py, pz, p) {
  const qx = Math.abs(px - p.c[0]) - p.h[0] + p.round, qy = Math.abs(py - p.c[1]) - p.h[1] + p.round, qz = Math.abs(pz - p.c[2]) - p.h[2] + p.round;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - p.round;
}
function prim(px, py, pz, p) {
  let d;
  switch (p.type) {
    case 'ell': d = sdEllipsoid(px, py, pz, p); break;
    case 'cone': d = p.sz ? sdRoundCone(px, py, p.a[2] + (pz - p.a[2]) / p.sz, p) * Math.min(1, p.sz) : sdRoundCone(px, py, pz, p); break;
    case 'torus': d = sdTorusY(px, py, pz, p); break;
    case 'box': d = sdBox(px, py, pz, p); break;
    case 'ccone': d = sdCappedCone(px, py, pz, p); break;
    case 'bell': d = sdBell(px, py, pz, p); break;
  }
  if (p.cutBelow != null) d = Math.max(d, p.cutBelow - py);      // flat sole etc.
  if (p.cutAbove != null) d = Math.max(d, py - p.cutAbove);
  if (p.cutBehind != null) d = Math.max(d, p.cutBehind - pz);
  if (p.clip) d = Math.max(d, p.clip(px, py, pz));                 // hairlines and cuts
  if (p.wobble) d += p.wobble(px, py, pz);                          // folds, hair strands
  return d;
}
const smin = (a, b, k) => { if (k <= 0) return Math.min(a, b); const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const smax = (a, b, k) => -smin(-a, -b, k);

/**
 * prims: [{type, ..., group, bone, mat, sub?}]
 * groups: {name: k} smooth-union radius inside each group; groups are joined with `joinK`.
 */
export function makeSDF(prims, groups, joinK = 0.015) {
  const solid = prims.filter((p) => !p.sub);
  const subs = prims.filter((p) => p.sub);
  const gnames = [...new Set(solid.map((p) => p.group))];
  const byGroup = gnames.map((g) => solid.filter((p) => p.group === g));
  const gk = gnames.map((g) => groups[g] ?? 0.03);
  // bounds per primitive to skip far ones quickly
  for (const p of solid.concat(subs)) {
    let c, r;
    if (p.type === 'ell') { c = p.c; r = Math.max(...p.r); }
    else if (p.type === 'cone' || p.type === 'bell') { c = p.a.map((v, i) => (v + p.b[i]) / 2); r = Math.hypot(p.a[0] - p.b[0], p.a[1] - p.b[1], p.a[2] - p.b[2]) / 2 + Math.max(p.r1, p.r2); }
    else if (p.type === 'torus') { c = p.c; r = p.R * (p.sz || 1) + p.r; }
    else if (p.type === 'ccone') { c = p.c; r = Math.hypot(p.h, Math.max(p.rb, p.rt)) + (p.round || 0); }
    else { c = p.c; r = Math.hypot(...p.h); }
    p._c = c; p._r = r;
  }
  const fn = (x, y, z, out) => {
    let d = 1e9;
    let best = null, bd = 1e9, second = null, sd = 1e9;
    for (let gi = 0; gi < byGroup.length; gi++) {
      let gd = 1e9;
      const k = gk[gi];
      for (const p of byGroup[gi]) {
        const far = Math.hypot(x - p._c[0], y - p._c[1], z - p._c[2]) - p._r;
        if (far > 0.12) { if (far < bd) { /* not owner candidate unless closer */ } gd = Math.min(gd, far); continue; }
        const pd = prim(x, y, z, p);
        if (pd < bd) { if (best && best.mat !== p.mat) { second = best; sd = bd; } bd = pd; best = p; }
        else if (pd < sd && p.mat !== best?.mat) { sd = pd; second = p; }
        gd = smin(gd, pd, k);
      }
      d = gi === 0 ? gd : smin(d, gd, joinK);
    }
    for (const p of subs) {
      const far = Math.hypot(x - p._c[0], y - p._c[1], z - p._c[2]) - p._r;
      if (far > 0.05) continue;
      d = smax(d, -prim(x, y, z, p), p.k ?? 0.01);
    }
    if (out) { out.owner = best; out.second = second; out.gap = sd - bd; }
    return d;
  };
  return fn;
}

// ---------------------------------------------------------------- Surface Nets
export function surfaceNets(sdf, min, max, cell) {
  const nx = Math.ceil((max[0] - min[0]) / cell) + 1;
  const ny = Math.ceil((max[1] - min[1]) / cell) + 1;
  const nz = Math.ceil((max[2] - min[2]) / cell) + 1;
  const field = new Float32Array(nx * ny * nz);
  const idx = (i, j, k) => (k * ny + j) * nx + i;
  // coarse pass: far from the surface the fine field just copies the coarse value
  const S = 4, cx = Math.ceil(nx / S) + 1, cy = Math.ceil(ny / S) + 1, cz = Math.ceil(nz / S) + 1;
  const coarse = new Float32Array(cx * cy * cz);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    coarse[(k * cy + j) * cx + i] = sdf(min[0] + i * S * cell, min[1] + j * S * cell, min[2] + k * S * cell);
  }
  const far = S * cell * 1.6;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const c = coarse[(Math.round(k / S) * cy + Math.round(j / S)) * cx + Math.round(i / S)];
    field[idx(i, j, k)] = Math.abs(c) > far ? c : sdf(min[0] + i * cell, min[1] + j * cell, min[2] + k * cell);
  }
  const vmap = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cidx = (i, j, k) => (k * (ny - 1) + j) * (nx - 1) + i;
  const pos = [];
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const val = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) {
      const [a, b, e] = corners[c];
      val[c] = field[idx(i + a, j + b, k + e)];
      if (val[c] < 0) mask |= 1 << c;
    }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [e0, e1] of edges) {
      const v0 = val[e0], v1 = val[e1];
      if ((v0 < 0) === (v1 < 0)) continue;
      const t = v0 / (v0 - v1);
      const c0 = corners[e0], c1 = corners[e1];
      sx += c0[0] + (c1[0] - c0[0]) * t; sy += c0[1] + (c1[1] - c0[1]) * t; sz += c0[2] + (c1[2] - c0[2]) * t;
      n++;
    }
    vmap[cidx(i, j, k)] = pos.length / 3;
    pos.push(min[0] + (i + sx / n) * cell, min[1] + (j + sy / n) * cell, min[2] + (k + sz / n) * cell);
  }
  const index = [];
  const quad = (a, b, c, d, flip) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) index.push(a, c, b, a, d, c); else index.push(a, b, c, a, c, d);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const inside = field[idx(i, j, k)] < 0;
    // x edge
    if (i < nx - 1 && inside !== (field[idx(i + 1, j, k)] < 0)) quad(vmap[cidx(i, j - 1, k - 1)], vmap[cidx(i, j, k - 1)], vmap[cidx(i, j, k)], vmap[cidx(i, j - 1, k)], !inside);
    if (j < ny - 1 && inside !== (field[idx(i, j + 1, k)] < 0)) quad(vmap[cidx(i - 1, j, k - 1)], vmap[cidx(i - 1, j, k)], vmap[cidx(i, j, k)], vmap[cidx(i, j, k - 1)], !inside);
    if (k < nz - 1 && inside !== (field[idx(i, j, k + 1)] < 0)) quad(vmap[cidx(i - 1, j - 1, k)], vmap[cidx(i, j - 1, k)], vmap[cidx(i, j, k)], vmap[cidx(i - 1, j, k)], !inside);
  }
  return { positions: new Float32Array(pos), index };
}

// ---------------------------------------------------------------- full pipeline
/**
 * def: { prims, groups, bones: {name: {pos:[x,y,z], parent}}, chains: {boneName: [candidate bones]},
 *        colors: {mat: '#hex'}, paint?(p, mat, color), bounds:{min,max}, cell }
 * Returns { mesh: SkinnedMesh, bones: {name: Bone}, root: Bone }
 */
const geoCache = new Map();
export function buildSculpted(def) {
  let geo = def.key && geoCache.get(def.key);
  if (!geo) {
    geo = fromBake(def) || sculptGeometry(def);
    if (def.key) geoCache.set(def.key, geo);
  }
  return assemble(def, geo);
}

function boneLayout(def) {
  const names = Object.keys(def.bones);
  const worldPos = {};
  names.forEach((nm) => { worldPos[nm] = V(def.bones[nm].pos); });
  const rootName = names.find((nm) => !def.bones[nm].parent);
  return { names, worldPos, rootName };
}

// (also used for polygon models made outside the sculptor: same skeleton, same material)
export function assemble(def, geo) {
  const { names, worldPos, rootName } = boneLayout(def);
  const bones = {};
  names.forEach((nm) => { const b = new THREE.Bone(); b.name = nm; bones[nm] = b; });
  names.forEach((nm) => {
    const par = def.bones[nm].parent;
    const p = par ? worldPos[par] : new THREE.Vector3();
    bones[nm].position.copy(worldPos[nm]).sub(p);
    if (par) bones[par].add(bones[nm]);
  });
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0 });
  const mesh = new THREE.SkinnedMesh(geo, material);
  const root = bones[rootName];
  mesh.add(root);
  const skeleton = new THREE.Skeleton(names.map((nm) => bones[nm]));
  mesh.updateMatrixWorld(true);
  mesh.bind(skeleton);
  mesh.frustumCulled = false;
  return { mesh, bones, root, vertexCount: geo.attributes.position.count };
}

// Rigid (unskinned) sculpt for small parts that need finer detail than the
// body: hands with separate fingers, shoes, props. Attached to a bone.
const rigidCache = new Map();
// triangles per sculpted rigid model (diagnostics: which props are heavy)
export function sculptStats() { return [...rigidCache.entries()].map(([k, g]) => [k, (g.index ? g.index.count : g.attributes.position.count) / 3]).sort((a, b) => b[1] - a[1]); }
export function sculptRigid(def) {
  if (def.key && rigidCache.has(def.key)) return rigidCache.get(def.key);
  const d = { ...def, rigid: true };
  const geo = fromBake(d) || sculptGeometry(d);
  if (def.key) rigidCache.set(def.key, geo);
  return geo;
}

// ---------------------------------------------------------------- bake
// Sculpting is CPU-heavy (seconds per character), so `tools/bake.mjs` saves every
// sculpted geometry once (quantised) to assets/bake.bin; at start-up the game loads
// it and only re-sculpts models whose design changed (fingerprint mismatch).
function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16);
}
export function fingerprint(def) {
  const rep = (k, v) => (typeof v === 'function' ? v.toString() : v);
  return fnv(JSON.stringify([def.prims, def.groups, def.joinK, def.colors, def.bounds, def.cell, def.rigid, def.hard, def.bones, def.chains, def.bias, def.paint && def.paint.toString()], rep));
}
const BAKE = new Map();
export const bakeStats = { hit: 0, miss: 0, missed: [] };
function fromBake(def) {
  if (!def.key) return null;
  const fp = fingerprint(def);
  const b = BAKE.get(def.key);
  if (!b || b.fp !== fp) { bakeStats.miss++; bakeStats.missed.push(def.key); stamp(def, fp); return null; }
  bakeStats.hit++;
  const g = new THREE.BufferGeometry();
  const n = b.n, q = b.q;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) pos[i] = q.min[i % 3] + (b.pos[i] / 65535) * (q.max[i % 3] - q.min[i % 3]);
  const nor = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) nor[i] = b.nor[i] / 127;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) col[i] = b.col[i] / 255;
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (b.si) {
    g.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint16Array(b.si), 4));
    const sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { let t = 0; for (let k = 0; k < 4; k++) t += b.sw[i * 4 + k]; for (let k = 0; k < 4; k++) sw[i * 4 + k] = t ? b.sw[i * 4 + k] / t : (k ? 0 : 1); }
    g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  }
  g.setIndex(new THREE.BufferAttribute(b.idx, 1));
  g.computeBoundingSphere();
  g.userData.bake = { key: def.key, fp };
  return g;
}
// remember key + fingerprint on freshly sculpted geometry (picked up by serializeBake)
const pendingStamp = new Map();
function stamp(def, fp) { pendingStamp.set(def.key, fp); }

export async function loadBake(url) {
  const res = await fetch(url);
  if (!res.ok) return false;
  const buf = await res.arrayBuffer();
  const hl = new DataView(buf).getUint32(0, true);
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hl)));
  const base = 4 + hl;
  const view = (T, off, len) => new T(buf.slice(base + off, base + off + len * T.BYTES_PER_ELEMENT));
  for (const e of head.entries) {
    BAKE.set(e.key, {
      fp: e.fp, n: e.n, q: e.q,
      pos: view(Uint16Array, e.pos, e.n * 3), nor: view(Int8Array, e.nor, e.n * 3), col: view(Uint8Array, e.col, e.n * 3),
      si: e.si != null ? view(Uint8Array, e.si, e.n * 4) : null, sw: e.sw != null ? view(Uint8Array, e.sw, e.n * 4) : null,
      idx: e.big ? view(Uint32Array, e.idx, e.ni) : view(Uint16Array, e.idx, e.ni),
    });
  }
  return true;
}

// everything sculpted so far → one binary (header JSON + aligned blobs)
export function serializeBake() {
  const entries = [], blobs = [];
  let off = 0;
  const push = (arr) => { const pad = (8 - (off % 8)) % 8; if (pad) { blobs.push(new Uint8Array(pad)); off += pad; } const at = off; blobs.push(new Uint8Array(arr.buffer, arr.byteOffset, arr.byteLength)); off += arr.byteLength; return at; };
  for (const [key, geo] of [...geoCache, ...rigidCache]) {
    const fp = geo.userData.bake?.fp || pendingStamp.get(key);
    if (!fp) continue;
    const P = geo.attributes.position.array, N = geo.attributes.normal.array, C = geo.attributes.color.array, n = P.length / 3;
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n * 3; i++) { const a = i % 3; if (P[i] < min[a]) min[a] = P[i]; if (P[i] > max[a]) max[a] = P[i]; }
    const qp = new Uint16Array(n * 3), qn = new Int8Array(n * 3), qc = new Uint8Array(n * 3);
    for (let i = 0; i < n * 3; i++) {
      const a = i % 3, r = max[a] - min[a] || 1;
      qp[i] = Math.round(((P[i] - min[a]) / r) * 65535);
      qn[i] = Math.round(Math.max(-1, Math.min(1, N[i])) * 127);
      qc[i] = Math.round(Math.max(0, Math.min(1, C[i])) * 255);
    }
    const e = { key, fp, n, q: { min, max } };
    e.pos = push(qp); e.nor = push(qn); e.col = push(qc);
    if (geo.attributes.skinIndex) {
      const SI = geo.attributes.skinIndex.array, SW = geo.attributes.skinWeight.array;
      const si = new Uint8Array(n * 4), sw = new Uint8Array(n * 4);
      for (let i = 0; i < n * 4; i++) { si[i] = SI[i]; sw[i] = Math.round(SW[i] * 255); }
      e.si = push(si); e.sw = push(sw);
    }
    const I = geo.index.array; e.ni = I.length; e.big = n > 65535;
    e.idx = push(e.big ? new Uint32Array(I) : new Uint16Array(I));
    entries.push(e);
  }
  const head = new TextEncoder().encode(JSON.stringify({ v: 1, entries }));
  const hpad = (8 - ((4 + head.length) % 8)) % 8;
  const total = 4 + head.length + hpad + off;
  const out = new Uint8Array(total);
  new DataView(out.buffer).setUint32(0, head.length + hpad, true);
  out.set(head, 4);
  for (let i = 0; i < hpad; i++) out[4 + head.length + i] = 32; // spaces: still valid JSON
  let p = 4 + head.length + hpad;
  for (const b of blobs) { out.set(b, p); p += b.length; }
  return out;
}

function sculptGeometry(def) {
  const sdf = makeSDF(def.prims, def.groups, def.joinK);
  const { positions, index } = surfaceNets(sdf, def.bounds.min, def.bounds.max, def.cell);
  const n = positions.length / 3;
  const normals = new Float32Array(n * 3);
  const colors = new Float32Array(n * 3);
  const skinIndex = new Uint16Array(n * 4);
  const skinWeight = new Float32Array(n * 4);

  const { names, worldPos, rootName } = def.rigid ? { names: [], worldPos: {}, rootName: null } : boneLayout(def);
  // bone segments (to first child or a tip) for weighting
  const seg = {};
  names.forEach((nm) => {
    const kids = names.filter((k) => def.bones[k].parent === nm && !def.bones[k].noSeg);
    const a = worldPos[nm];
    const b = def.bones[nm].tip ? V(def.bones[nm].tip) : kids.length ? worldPos[kids[0]] : a.clone().add(new THREE.Vector3(0, -0.05, 0));
    seg[nm] = [a, b];
  });
  const boneIndex = Object.fromEntries(names.map((nm, i) => [nm, i]));
  const distSeg = (p, [a, b]) => {
    const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
    const l2 = abx * abx + aby * aby + abz * abz || 1e-9;
    let t = ((p.x - a.x) * abx + (p.y - a.y) * aby + (p.z - a.z) * abz) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - a.x - abx * t, p.y - a.y - aby * t, p.z - a.z - abz * t);
  };

  const out = {};
  const col = new THREE.Color();
  const p = new THREE.Vector3();
  const e = def.cell * 0.5;
  for (let i = 0; i < n; i++) {
    p.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    // snap the vertex onto the true surface (Surface Nets leaves it up to a
    // fraction of a cell off, which shows as terracing on gentle slopes)
    let gx = 0, gy = 0, gz = 0, gl = 1;
    for (let it = 0; it < 3; it++) {
      gx = sdf(p.x + e, p.y, p.z) - sdf(p.x - e, p.y, p.z);
      gy = sdf(p.x, p.y + e, p.z) - sdf(p.x, p.y - e, p.z);
      gz = sdf(p.x, p.y, p.z + e) - sdf(p.x, p.y, p.z - e);
      gl = Math.hypot(gx, gy, gz) || 1;
      if (it === 2) break;
      const dd = sdf(p.x, p.y, p.z);
      const step = Math.max(-def.cell * 0.5, Math.min(def.cell * 0.5, dd)); // never jump across thin parts
      p.x -= (gx / gl) * step; p.y -= (gy / gl) * step; p.z -= (gz / gl) * step;
    }
    positions[i * 3] = p.x; positions[i * 3 + 1] = p.y; positions[i * 3 + 2] = p.z;
    normals[i * 3] = gx / gl; normals[i * 3 + 1] = gy / gl; normals[i * 3 + 2] = gz / gl;
    sdf(p.x, p.y, p.z, out);
    const owner = out.owner;
    // colour: region + painter + subtle variation + crease darkening
    const m = owner?.mat || 'skin';
    col.set(def.colors[m] || '#ff00ff');
    if (def.paint) def.paint(p, m, col, owner);
    // soften colour borders between materials (avoids stair-stepped seams)
    // (materials listed in def.hard keep a crisp edge: belts, trims, eyes on fur…)
    if (out.second && out.gap < def.cell * 0.9 && !(def.hard && (def.hard.includes(m) || def.hard.includes(out.second.mat)))) {
      const c2 = new THREE.Color(def.colors[out.second.mat] || '#ff00ff');
      if (def.paint) def.paint(p, out.second.mat, c2, out.second);
      col.lerp(c2, 0.5 * (1 - out.gap / (def.cell * 0.9)));
    }
    const vary = 1 + (Math.sin(p.x * 37 + p.y * 23) * Math.sin(p.z * 31 - p.y * 17)) * 0.035;
    const off = 0.035;
    const ao = Math.max(0, Math.min(1, (sdf(p.x + (gx / gl) * off, p.y + (gy / gl) * off, p.z + (gz / gl) * off) - sdf(p.x, p.y, p.z)) / off));
    const shade = vary * (0.72 + 0.28 * ao);
    colors[i * 3] = col.r * shade; colors[i * 3 + 1] = col.g * shade; colors[i * 3 + 2] = col.b * shade;
    if (def.rigid) continue;
    // weights: candidate bones from the owner's chain, inverse distance to bone segments
    const cands = owner?.chain || def.chains[owner?.bone] || [owner?.bone || rootName]; // (a primitive may narrow its own chain)
    const ws = [];
    for (const bn of cands) {
      const d = distSeg(p, seg[bn]) + 0.01;
      const bias = bn === owner?.bone ? 1.0 : (def.bias?.[bn] ?? 1.0);
      ws.push([boneIndex[bn], bias / (d * d * d * d)]);
    }
    ws.sort((a, b) => b[1] - a[1]);
    let sum = 0;
    for (let q = 0; q < 4; q++) sum += ws[q]?.[1] || 0;
    for (let q = 0; q < 4; q++) {
      skinIndex[i * 4 + q] = ws[q]?.[0] ?? 0;
      skinWeight[i * 4 + q] = ws[q] ? ws[q][1] / sum : 0;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (!def.rigid) {
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeight, 4));
  }
  geo.setIndex(index);
  geo.computeBoundingSphere();
  return geo;
}
