// HAMALAYI-POLISH: the terrain's finish for the Hamalayi (hamalayi.js). Nothing here changes a height or a collider that
// the story walks on: the heightfield is the one the region always had. What changes is how the cliff rims, the glacier
// basin, the ice vent, the gorge and the felled tree LOOK.
//   · cliff rims: the snow/rock split used to be read per terrain vertex, so every rim showed a comb of triangular teeth
//     (one tooth per 1 m cell). The rock weight is now dilated and blurred (rockField) so the split falls on flat ground, and
//     a rounded, irregular snow lip (snowLips: one merged mesh per 46 m chunk) is laid along every rim it covers
//   · the glacier basin: mottled ice, crevasses, seracs, wind-blown drifts
//   · the vent: a heaved plate of cracked ice with meltwater round it (it melts as before: the story scales and hides the mesh)
//   · the gorge: a meandering river of meltwater between banks of stones and ice shelves, floes, foam
//   · the dead tree: bark, a root plate, three broken stubs, a snow blob that falls off; a fall with acceleration, a thud
//     with a small bounce, a snow puff (makeTree)
// Materials are the plain opaque MeshStandardMaterials the region already uses, so no shader program is new.
import * as THREE from 'three';
import { rng, smoothstep } from '../engine/math.js';
import { MM, driftGeo } from './props-mountain.js';
import { pm, tm, ctex, Batch, bbox } from './kit.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
// smooth value noise (0..1), any seed
const hash = (i, j, s) => { const v = Math.sin(i * 127.1 + j * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
export function vnoise(x, z, s = 0) {
  const i = Math.floor(x), j = Math.floor(z), fx = x - i, fz = z - j, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return lerp(lerp(hash(i, j, s), hash(i + 1, j, s), u), lerp(hash(i, j + 1, s), hash(i + 1, j + 1, s), u), v);
}

// ================================================================== the rock weight, per vertex
// The terrain calls heightFn once per lattice point before it asks colorFn / splatFn: wrapping heightFn keeps those
// heights, so the finish reads neighbours without a second pass over the heightfield.
export function gridCapture(heightFn, size, segs) {
  const n = segs + 1, half = size / 2, step = size / segs, h = new Float32Array(n * n);
  const fn = (x, z) => {
    const v = heightFn(x, z), gi = (x + half) / step, gj = (z + half) / step, i = Math.round(gi), j = Math.round(gj);
    if (Math.abs(gi - i) < 1e-6 && Math.abs(gj - j) < 1e-6 && i >= 0 && j >= 0 && i < n && j < n) h[j * n + i] = v;
    return v;
  };
  const G = { fn, h, n, half, step, _rock: null, ij: (x, z) => [Math.round((x + half) / step), Math.round((z + half) / step)] };
  // rock share per vertex: the steep vertices, grown by one cell and blurred, so the snow's edge lies on flat ground
  G.rock = (x, z) => {
    if (!G._rock) {
      const at = (i, j) => h[clamp(j, 0, n - 1) * n + clamp(i, 0, n - 1)];
      const r0 = new Float32Array(n * n), r1 = new Float32Array(n * n), r2 = new Float32Array(n * n);
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) r0[j * n + i] = smoothstep(0.7, 1.25, Math.hypot(at(i + 1, j) - at(i - 1, j), at(i, j + 1) - at(i, j - 1)) / (2 * step));
      const R = (a, i, j) => a[clamp(j, 0, n - 1) * n + clamp(i, 0, n - 1)];
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { let m = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) m = Math.max(m, R(r0, i + a, j + b) * (a && b ? 0.85 : 1)); r1[j * n + i] = m; }
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) r2[j * n + i] = (R(r1, i - 1, j) + 2 * R(r1, i, j) + R(r1, i + 1, j)) * 0.25;
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) r1[j * n + i] = (R(r2, i, j - 1) + 2 * R(r2, i, j) + R(r2, i, j + 1)) * 0.25;
      G._rock = r1;
    }
    const [i, j] = G.ij(x, z);
    return G._rock[clamp(j, 0, n - 1) * n + clamp(i, 0, n - 1)];
  };
  return G;
}

// ================================================================== the glacier's colour
const ICE = { deep: new THREE.Color('#86b8de'), ice: new THREE.Color('#b8dcf2'), pale: new THREE.Color('#dcf0fb'), teal: new THREE.Color('#98cfdc'), frost: new THREE.Color('#f2f8fd'), wet: new THREE.Color('#9ccaea') };
// mottled glacier ice at (x, z); `k` 0..1 how much of it (the edge of the basin fades into the snow)
export function iceTint(x, z, c, vent, k = 1) {
  const a = vnoise(x * 0.11, z * 0.11, 3), b = vnoise(x * 0.37, z * 0.37, 5), s = vnoise(x * 0.07 + z * 0.02, z * 0.45 - x * 0.12, 8);   // (s: streaks along the wind)
  c.copy(ICE.ice);
  c.lerp(ICE.deep, smoothstep(0.52, 0.8, a) * 0.8);
  c.lerp(ICE.teal, smoothstep(0.55, 0.85, b) * 0.45);
  c.lerp(ICE.pale, smoothstep(0.45, 0.7, 1 - a) * 0.5);
  c.lerp(ICE.frost, smoothstep(0.62, 0.84, s) * 0.85);         // wind-blown powder in streaks
  if (vent != null) c.lerp(ICE.wet, smoothstep(10, 4.5, vent) * 0.6);
  return k;
}

// ================================================================== a ribbon along a polyline, draped on a ground function
// pts [[x, z]...], hw(i) half width at point i; the strip lies at ground + lift. Returns {pos, idx} to merge.
export function ribbonGeo(pts, hw, ground, lift, color) {
  const P = [], C = [], I = [], col = new THREE.Color(color);
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l, w = hw(i);
    for (const s of [-1, 1]) { const x = pts[i][0] + nx * w * s, z = pts[i][1] + nz * w * s; P.push(x, ground(x, z) + lift, z); C.push(col.r, col.g, col.b); }
    if (i) { const o = (i - 1) * 2; I.push(o, o + 1, o + 2, o + 1, o + 3, o + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.setIndex(I);
  // (the strip faces up whichever way the polyline runs)
  g.computeVertexNormals();
  if (g.attributes.normal.getY(0) < 0) { for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; } g.setIndex(I); g.computeVertexNormals(); }
  return g;
}
const mergePlain = (geos) => {
  let nv = 0, ni = 0; for (const g of geos) { nv += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), idx = new Uint32Array(ni);
  let v = 0, o = 0;
  for (const g of geos) { pos.set(g.attributes.position.array, v * 3); nor.set(g.attributes.normal.array, v * 3); col.set(g.attributes.color.array, v * 3); for (let i = 0; i < g.index.count; i++) idx[o + i] = g.index.getX(i) + v; v += g.attributes.position.count; o += g.index.count; }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.BufferAttribute(pos, 3)); m.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); m.setAttribute('color', new THREE.BufferAttribute(col, 3)); m.setIndex(new THREE.BufferAttribute(idx, 1));
  m.computeBoundingSphere(); m.computeBoundingBox();
  return m;
};

// ================================================================== the snow lips along the cliff rims
// Marching squares on the terrain's own heights at each terrace level (threshold just under the level) gives the rim
// as a chain of short segments; a station on every crossed lattice edge (shared, so the lip is watertight) carries a
// rounded profile (back on the flat, a crest, an overhang, a curl under) whose thickness and overhang wander with a
// smooth noise, thinning to almost nothing in places. Visual only: no collider, no shadow cast.
export function snowLips(T, parent, { levels, cell = 46, fade = () => 1 } = {}) {
  const n = T.segs + 1, h = T.heights, x0 = T.x0, z0 = T.z0, st = T.step;
  const H = (x, z) => T.heightAt(x, z);
  const smap = new Map();
  const station = (key, x, z, L) => {
    if (smap.has(key)) return smap.get(key);
    const e = 1.3, gx = H(x + e, z) - H(x - e, z), gz = H(x, z + e) - H(x, z - e), gl = Math.hypot(gx, gz);
    let s = null;
    if (gl > 0.5) {
      const ux = gx / gl, uz = gz / gl;                                       // uphill
      if (Math.abs(H(x + ux * 2.0, z + uz * 2.0) - L) < 1.0 && H(x - ux * 2.2, z - uz * 2.2) < L - 1.3) s = { x, z, ox: -ux, oz: -uz, L, id: smap.size };
    }
    smap.set(key, s); return s;
  };
  const segs = [];
  levels.forEach((L, li) => {
    const t = L - 0.5;
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const a = h[j * n + i], b = h[j * n + i + 1], c = h[(j + 1) * n + i + 1], d = h[(j + 1) * n + i];
      if (Math.min(a, b, c, d) > t || Math.max(a, b, c, d) < t) continue;
      const out = [];
      const edge = (va, vb, key, xa, za, xb, zb) => { if ((va - t) * (vb - t) < 0) { const f = (t - va) / (vb - va); out.push(station(key * 8 + li, xa + (xb - xa) * f, za + (zb - za) * f, L)); } };
      const X = x0 + i * st, Z = z0 + j * st;
      edge(a, b, (j * n + i) * 2, X, Z, X + st, Z);
      edge(b, c, (j * n + i + 1) * 2 + 1, X + st, Z, X + st, Z + st);
      edge(d, c, ((j + 1) * n + i) * 2, X, Z + st, X + st, Z + st);
      edge(a, d, (j * n + i) * 2 + 1, X, Z, X, Z + st);
      if (out.length === 2 && out[0] && out[1]) segs.push([out[0], out[1]]);
    }
  });
  // the profile: [outward distance from the crest, height]; the first point lies on the flat, the last sinks into the face
  const PROF = [[-1.35, 0.0], [-0.75, 0.2], [-0.25, 0.33], [0.2, 0.36], [0.58, 0.26], [0.82, 0.06], [0.76, -0.2], [0.4, -0.42]], NP = PROF.length;
  const chunks = new Map();
  const rim = (s) => {   // the station's eight vertices
    if (s.v) return s.v;
    const cx = s.x - s.ox * 0.35, cz = s.z - s.oz * 0.35, Hc = H(cx, cz);
    s.fade = fade(cx, cz);
    const thick = s.thick = s.fade * (0.42 + 0.5 * vnoise(cx * 0.33, cz * 0.33, 1)) * (0.2 + 0.8 * smoothstep(0.08, 0.36, vnoise(cx * 0.17, cz * 0.17, 3)));
    const over = Math.sqrt(s.fade) * (0.5 + 0.6 * vnoise(cx * 0.21, cz * 0.21, 2) + 0.25 * Math.pow(Math.max(0, Math.sin(cx * 0.9 + cz * 0.7)), 2));
    const back = Math.sqrt(s.fade) * (0.7 + 0.7 * vnoise(cx * 0.27 + 9, cz * 0.27, 5));
    s.v = PROF.map(([u, y], k) => {
      const su = u > 0 ? u * over : u * back, x = cx + s.ox * su, z = cz + s.oz * su;
      let yy = k === 0 ? H(x, z) + 0.03 : k === 1 ? H(x, z) + 0.04 + y * thick : Hc + y * thick;
      if (k === NP - 1) yy = Math.min(yy, H(x, z) - 0.05);
      return [x, yy, z];
    });
    return s.v;
  };
  // keep the runs that matter: no segment where a trail or a walk crosses the rim or where the lip would be a film, and no
  // run shorter than 8 segments (a few metres of lip beside a trail's cut read as torn paper)
  const keep = segs.filter(([a, b]) => { rim(a); rim(b); return !(a.fade < 0.8 || b.fade < 0.8 || a.thick < 0.17 || b.thick < 0.17); });
  const par = new Map(); const find = (i) => { while (par.get(i) !== i) { par.set(i, par.get(par.get(i))); i = par.get(i); } return i; };
  for (const [a, b] of keep) { if (!par.has(a.id)) par.set(a.id, a.id); if (!par.has(b.id)) par.set(b.id, b.id); par.set(find(a.id), find(b.id)); }
  const runLen = new Map(); for (const [a] of keep) { const r = find(a.id); runLen.set(r, (runLen.get(r) || 0) + 1); }
  for (const [a, b] of keep) {
    if (runLen.get(find(a.id)) < 8) continue;
    const key = Math.floor(a.x / cell) + ',' + Math.floor(a.z / cell);
    let C = chunks.get(key); if (!C) { C = { pos: [], idx: [], map: new Map() }; chunks.set(key, C); }
    const base = (s) => { let o = C.map.get(s.id); if (o == null) { o = C.pos.length / 3; C.map.set(s.id, o); for (const p of rim(s)) C.pos.push(...p); } return o; };
    const A = base(a), B = base(b), ox = (a.ox + b.ox) * 0.5, oz = (a.oz + b.oz) * 0.5;
    for (let k = 0; k < NP - 1; k++) {
      const ds = PROF[k + 1][0] - PROF[k][0], dy = PROF[k + 1][1] - PROF[k][1];
      // outward normal of this profile step: (−dy along the outward direction, ds up)
      const nx = ox * -dy, ny = ds, nz = oz * -dy;
      const q = [A + k, B + k, B + k + 1, A + k + 1], P = C.pos;
      const v = (i) => [P[q[i] * 3], P[q[i] * 3 + 1], P[q[i] * 3 + 2]];
      const p0 = v(0), p1 = v(1), p2 = v(2);
      const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2], wx = p2[0] - p0[0], wy = p2[1] - p0[1], wz = p2[2] - p0[2];
      const cy = uz * wx - ux * wz, cx = uy * wz - uz * wy, cz = ux * wy - uy * wx;
      if (cx * nx + cy * ny + cz * nz >= 0) C.idx.push(q[0], q[1], q[2], q[0], q[2], q[3]); else C.idx.push(q[0], q[2], q[1], q[0], q[3], q[2]);
    }
  }
  const mat = MM.snow(); let tris = 0; const out = [];
  for (const [key, C] of chunks) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(C.pos, 3)); g.setIndex(C.idx); g.computeVertexNormals(); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.castShadow = false; m.receiveShadow = true; m.name = 'hlip-' + key; parent.add(m); out.push(m); tris += C.idx.length / 3;
  }
  return { meshes: out, stations: [...smap.values()].filter(Boolean).length, tris };
}

// ================================================================== the glacier basin
// seracs: tilted, tapering prisms of faceted ice (flat-shaded: the normals are the facets'), leaning together in clusters
const seracGeo = (seed) => {
  const r = rng(seed), N = 6, P = [], Nn = [];
  const base = [], top = [];
  for (let i = 0; i < N; i++) { const a = (i + (r() - 0.5) * 0.5) / N * Math.PI * 2, rb = 0.62 + r() * 0.4; base.push([Math.cos(a) * rb, 0, Math.sin(a) * rb]); top.push([Math.cos(a) * rb * (0.38 + r() * 0.2) + 0.1, 0.86 + r() * 0.32 + (i % 2) * 0.14, Math.sin(a) * rb * (0.38 + r() * 0.2)]); }
  const tri = (a, b, c) => { for (const p of [a, b, c]) P.push(...p); };
  for (let i = 0; i < N; i++) { const j = (i + 1) % N; tri(base[i], top[j], top[i]); tri(base[i], base[j], top[j]); }
  const cen = top.reduce((s, p) => [s[0] + p[0] / N, s[1] + p[1] / N, s[2] + p[2] / N], [0, 0, 0]); cen[1] += 0.12;
  for (let i = 0; i < N; i++) tri(top[i], top[(i + 1) % N], cen);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  // winding: every face outward (away from the axis; the top face up)
  const pa = g.attributes.position;
  for (let f = 0; f < pa.count; f += 3) {
    const ax = pa.getX(f), ay = pa.getY(f), az = pa.getZ(f), ux = pa.getX(f + 1) - ax, uy = pa.getY(f + 1) - ay, uz = pa.getZ(f + 1) - az, wx = pa.getX(f + 2) - ax, wy = pa.getY(f + 2) - ay, wz = pa.getZ(f + 2) - az;
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    const mx = (ax + pa.getX(f + 1) + pa.getX(f + 2)) / 3, my = (ay + pa.getY(f + 1) + pa.getY(f + 2)) / 3 - 0.45, mz = (az + pa.getZ(f + 1) + pa.getZ(f + 2)) / 3;
    if (nx * mx + ny * my + nz * mz < 0) { const x = pa.getX(f + 1), y = pa.getY(f + 1), z = pa.getZ(f + 1); pa.setXYZ(f + 1, pa.getX(f + 2), pa.getY(f + 2), pa.getZ(f + 2)); pa.setXYZ(f + 2, x, y, z); }
  }
  g.computeVertexNormals();
  return g;
};
// a crevasse: a ragged dark slot with a raised pale lip, a blue wall and a near-black throat
const crevasse = (list, a, b, w, ground, seed, bend = 0.5) => {
  const r = rng(seed), L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(6, Math.round(L / 0.9)), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const pts = []; let ca = ang;
  for (let i = 0; i <= n; i++) { const t = i / n; if (i) { ca += (r() - 0.5) * bend; } const p = i ? pts[i - 1] : a; pts.push(i ? [p[0] + Math.cos(ca) * L / n, p[1] + Math.sin(ca) * L / n] : [a[0], a[1]]); }
  const prof = (i, f) => w * f * Math.pow(Math.sin(Math.PI * (0.04 + 0.92 * i / n)), 0.7) * (0.75 + 0.25 * Math.sin(i * 1.9 + seed));
  list.push(ribbonGeo(pts, (i) => prof(i, 0.5) + 0.34, ground, 0.03, '#e6f4fc'));
  list.push(ribbonGeo(pts, (i) => prof(i, 0.5) + 0.1, ground, 0.06, '#4a86b8'));
  list.push(ribbonGeo(pts, (i) => prof(i, 0.3), ground, 0.09, '#0a1830'));
  return pts;
};
// seracs, crevasses and drifts on the glacier; returns the colliders it asks for
export function basinDress(env) {
  const { group, H, col, BASIN, VENT, descent, kitOf } = env;
  const r = rng(404), out = { crevasses: [], seracs: 0 };
  const iceM = pm('#b4dcf4', 0.22, { metalness: 0.05, emissive: '#16324e', emissiveIntensity: 0.25 });
  const B = new Batch(group, { cast: true });
  // the descent comes in from the east-north-east: no serac or crevasse on that side, none near the vent
  const a0 = Math.atan2(descent[1] - BASIN.z, descent[0] - BASIN.x);
  const okAt = (x, z, d0 = 12) => {
    const dv = Math.hypot(x - VENT.x, z - VENT.z); if (dv < d0) return false;
    const an = Math.atan2(z - BASIN.z, x - BASIN.x); let da = Math.abs(an - a0); da = Math.min(da, 6.283 - da);
    return da > 0.7 && Math.hypot(x - BASIN.x, z - BASIN.z) < BASIN.r - 1.0;
  };
  // seracs: clusters of three or four leaning blocks round the basin's rim and a few in the middle distance
  let tries = 0, made = 0;
  while (made < 9 && tries++ < 200) {
    const ang = r() * 6.283, d = 8 + r() * (BASIN.r - 9.5), x = BASIN.x + Math.cos(ang) * d, z = BASIN.z + Math.sin(ang) * d;
    if (!okAt(x, z, 13)) continue;
    const n = 3 + Math.floor(r() * 2), s0 = 0.9 + r() * 0.9;
    for (let k = 0; k < n; k++) {
      const q = k === 0 ? 0 : r() * 6.283, off = k === 0 ? 0 : 0.9 + r() * 0.8, sc = k === 0 ? s0 : s0 * (0.45 + r() * 0.3), px = x + Math.cos(q) * off * s0, pz = z + Math.sin(q) * off * s0;
      B.add(seracGeo(7 + Math.floor(r() * 5)), iceM, px, H(px, pz) - 0.12, pz, (r() - 0.5) * 0.3, r() * 6.283, (r() - 0.5) * 0.3, sc * (1.0 + r() * 0.3), sc * (2.1 + r() * 1.8), sc * (1.0 + r() * 0.3));
    }
    col({ type: 'cyl', x, z, r: s0 * 1.05, top: H(x, z) + s0 * 2.4, noStand: true, seeThrough: true });
    made++;
  }
  out.seracs = made;
  // crevasses: long hairlines and a few wide slots (the wide ones get a low collider so no one walks over a hole)
  const geos = [], ground = (x, z) => H(x, z);
  const cs = [];
  tries = 0;
  while (cs.length < 9 && tries++ < 300) {
    const ang = r() * 6.283, d = 5 + r() * (BASIN.r - 8), x = BASIN.x + Math.cos(ang) * d, z = BASIN.z + Math.sin(ang) * d, wide = cs.length < 3;
    const len = wide ? 5.5 + r() * 3 : 4 + r() * 6, dir = r() * 3.14, ex = x + Math.cos(dir) * len, ez = z + Math.sin(dir) * len;
    if (!okAt(x, z, 14) || !okAt(ex, ez, 14) || !okAt((x + ex) / 2, (z + ez) / 2, 14)) continue;
    cs.push({ x, z, ex, ez, wide });
  }
  cs.forEach((c, i) => {
    const w = c.wide ? 0.62 + r() * 0.2 : 0.2 + r() * 0.12;
    const pts = crevasse(geos, [c.x, c.z], [c.ex, c.ez], w * 2.0, ground, 90 + i, c.wide ? 0.3 : 0.55);
    out.crevasses.push(pts);
    if (c.wide) for (let k = 0; k < pts.length - 1; k += 2) {
      const a = pts[k], b = pts[Math.min(pts.length - 1, k + 2)], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 0.1) continue;
      col({ type: 'box', x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, hw: 0.22, hd: L / 2 + 0.05, rot: Math.atan2(b[0] - a[0], b[1] - a[1]), top: H((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) + 0.45, noStand: true, seeThrough: true });
    }
  });
  if (geos.length) {
    const m = new THREE.Mesh(mergePlain(geos), pm('#ffffff', 0.7, { vertexColors: true })); m.name = 'hcrevasses'; m.castShadow = false; m.receiveShadow = true; group.add(m);
  }
  B.build();
  // wind-blown snow: long low sastrugi lying along the wind (from the north-west), small drifts against the seracs' feet
  const K = kitOf('basin');
  for (let i = 0, t = 0; i < 9 && t < 300; t++) {
    const ang = r() * 6.283, d = 11 + r() * (BASIN.r - 12), x = BASIN.x + Math.cos(ang) * d, z = BASIN.z + Math.sin(ang) * d;
    if (Math.hypot(x - VENT.x, z - VENT.z) < 9) continue;
    const an = Math.atan2(z - BASIN.z, x - BASIN.x); let da = Math.abs(an - a0); da = Math.min(da, 6.283 - da); if (da < 0.45) continue;
    K.at(x, H(x, z), z, 0.5 + (r() - 0.5) * 0.4, () => { K.add(driftGeo(i % 4), MM.snow(), 0, -0.06, 0, 0, { sx: 0.9 + r() * 1.5, sy: 0.1 + r() * 0.1, sz: 0.45 + r() * 0.35 }); });
    i++;
  }
  return out;
}

// ================================================================== the ice vent
// A heaved cap of cracked ice (seven plates with dark cracks between them, one hairline fracture across each), the
// meltwater that has pooled round it, a shard or two of floating ice. The cap's local origin is the old cylinder's
// centre (H + 0.4), so the story's melt (scale.y, position.y) and hide work unchanged; top 0.8 above it.
export function ventDress(env) {
  const { group, H, VENT, ventMat } = env;
  const r = rng(77), P = [], C = [];
  const col = new THREE.Color();
  // the plugs's plates: an inner ring of five round the throat, an outer ring of eight, their joints at different angles,
  // each heaved a little differently
  const sectors = (n) => { const w = []; let tot = 0; for (let i = 0; i < n; i++) { w.push(0.6 + r() * 0.8); tot += w[i]; } let a = r() * 6.283; return w.map((v) => { const a0 = a; a += v / tot * Math.PI * 2; return [a0, a]; }); };
  const RS = 1.6, R0 = 0.5, TAU = Math.PI * 2;
  const mk = (list, r0, r1, nr, up) => list.map(([a0, a1]) => ({ a0, a1, r0, r1, nr, heave: (r() - 0.5) * 0.16 + up, tx: (r() - 0.5) * 0.09, tz: (r() - 0.5) * 0.09 }));
  const inner = mk(sectors(5), R0, RS, 2, 0.05), outer = mk(sectors(8), RS, null, 3, 0);
  const plates = [...inner, ...outer];
  const Rout = (an) => 3.15 + 0.4 * vnoise(Math.cos(an) * 1.5 + 5, Math.sin(an) * 1.5 + 5, 11);
  const dome = (rr) => 0.82 - 0.3 * Math.pow(rr / 3.3, 2);
  // every face is wound to face `ex` (the way it should look): up for the top and the bed, radial for the outer wall, into the crack for a crack wall
  const tri = (p, q, w, cp, cq, cw, ex) => {
    const ux = q[0] - p[0], uy = q[1] - p[1], uz = q[2] - p[2], wx = w[0] - p[0], wy = w[1] - p[1], wz = w[2] - p[2];
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
    if (nx * ex[0] + ny * ex[1] + nz * ex[2] < 0) { P.push(...p, ...w, ...q); C.push(...cp, ...cw, ...cq); } else { P.push(...p, ...q, ...w); C.push(...cp, ...cq, ...cw); }
  };
  const UP = [0, 1, 0];
  const cA = new THREE.Color('#dff1fc'), cB = new THREE.Color('#a8d2ee');
  const topC = (rr, x, z) => { const t = clamp(rr / 3.3, 0, 1), v = vnoise(x * 0.9, z * 0.9, 4); col.copy(cA).lerp(cB, t * 0.8 + v * 0.18); return [col.r, col.g, col.b]; };
  const dark = [0.04, 0.1, 0.2], mid = [0.28, 0.5, 0.7], side = [0.55, 0.77, 0.9], c0 = [0.5, 0.74, 0.88];
  const yAt = (pl, x, z, rr) => dome(rr) + pl.heave + pl.tx * x + pl.tz * z;
  const NA = 3;
  for (const pl of plates) {
    const pt = (k, ai) => {
      const t = ai / NA, rmid = (pl.r0 + (pl.r1 ?? 3.3)) / 2, gap = clamp(0.085 / Math.max(0.5, rmid), 0, 0.2), an = lerp(pl.a0 + gap, pl.a1 - gap, t);
      const ra = pl.r0 + (pl.r0 > R0 ? 0.045 : 0), rb = (pl.r1 ?? Rout(an)) - (pl.r1 == null ? 0 : 0.045), rr = lerp(ra, rb, k / pl.nr), x = Math.cos(an) * rr, z = Math.sin(an) * rr;
      return { x, z, rr, y: yAt(pl, x, z, rr), an };
    };
    const V = (p) => [p.x, p.y, p.z], Cc = (p) => topC(p.rr, p.x, p.z);
    for (let k = 0; k < pl.nr; k++) for (let ai = 0; ai < NA; ai++) {
      const p00 = pt(k, ai), p01 = pt(k, ai + 1), p10 = pt(k + 1, ai), p11 = pt(k + 1, ai + 1);
      tri(V(p00), V(p10), V(p11), Cc(p00), Cc(p10), Cc(p11), UP); tri(V(p00), V(p11), V(p01), Cc(p00), Cc(p11), Cc(p01), UP);
    }
    // the walls: the two crack sides, the inner and outer edges (the plugs's rim runs down to below the ground)
    const wall = (p, q, bot, ex, ca) => { const a = V(p), b = V(q), a2 = [p.x, bot, p.z], b2 = [q.x, bot, q.z]; tri(a, a2, b2, ca, dark, dark, ex); tri(a, b2, b, ca, dark, ca, ex); };
    for (let ai = 0; ai < NA; ai++) {
      const p = pt(pl.nr, ai), q = pt(pl.nr, ai + 1), am = (p.an + q.an) / 2;
      if (pl.r1 == null) { const a = V(p), b = V(q), a2 = [p.x, -0.75, p.z], b2 = [q.x, -0.75, q.z], ex = [Math.cos(am), 0, Math.sin(am)]; tri(a, a2, b2, side, mid, mid, ex); tri(a, b2, b, side, mid, side, ex); }
      else wall(p, q, 0.15, [Math.cos(am), 0, Math.sin(am)], c0);
      const p0 = pt(0, ai), q0 = pt(0, ai + 1), am0 = (p0.an + q0.an) / 2;
      wall(p0, q0, 0.15, [-Math.cos(am0), 0, -Math.sin(am0)], c0);
    }
    for (const [ai, dir] of [[0, -1], [NA, 1]]) for (let k = 0; k < pl.nr; k++) {
      const p = pt(k, ai), q = pt(k + 1, ai);
      wall(p, q, 0.15, [-Math.sin(p.an) * dir, 0, Math.cos(p.an) * dir], c0);
    }
  }
  // the crack bed: a dark disc under the plates, level with their gaps
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, b = (i + 1) / 12 * Math.PI * 2; tri([0, 0.15, 0], [Math.cos(b) * 3.0, 0.15, Math.sin(b) * 3.0], [Math.cos(a) * 3.0, 0.15, Math.sin(a) * 3.0], dark, dark, dark, UP); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.computeVertexNormals(); g.computeBoundingSphere();
  const vy = H(VENT.x, VENT.z);
  const cap = new THREE.Mesh(g, ventMat); cap.position.set(VENT.x, vy + 0.4, VENT.z); cap.castShadow = true; cap.receiveShadow = true; cap.name = 'hventcap'; group.add(cap);

  // hairline fractures running out over the plates (children of the cap: they melt with it) and across the ice round it
  const plateAt = (x, z) => { const set = Math.hypot(x, z) < RS ? inner : outer, an = Math.atan2(z, x); for (const p of set) { const d = (((an - p.a0) % TAU) + TAU) % TAU, span = (((p.a1 - p.a0) % TAU) + TAU) % TAU; if (d < span) return p; } return set[0]; };
  const geos = [], rc = rng(31);
  for (let i = 0; i < 6; i++) {
    const pts = [], steps = 9; let ca = rc() * 6.283;
    for (let k = 0; k <= steps; k++) { const rr = 0.7 + k * 0.33; ca += (rc() - 0.5) * 0.18; pts.push([Math.cos(ca) * rr, Math.sin(ca) * rr]); }
    geos.push(ribbonGeo(pts, (k) => 0.035 + 0.025 * Math.sin(k * 1.3 + i), (x, z) => yAt(plateAt(x, z), x, z, Math.hypot(x, z)), 0.02, '#33618f'));
  }
  const crackM = pm('#ffffff', 0.5, { vertexColors: true });
  const crack = new THREE.Mesh(mergePlain(geos), crackM); crack.name = 'hventcracks'; crack.castShadow = false; crack.receiveShadow = true; cap.add(crack);
  const fr = [];
  for (let i = 0; i < 7; i++) {
    const pts = [], steps = 11; let ca = rc() * 6.283;
    for (let k = 0; k <= steps; k++) { const rr = 3.3 + k * 0.55; ca += (rc() - 0.5) * 0.3; pts.push([VENT.x + Math.cos(ca) * rr, VENT.z + Math.sin(ca) * rr]); }
    fr.push(ribbonGeo(pts, (k) => 0.06 + 0.05 * Math.sin(k * 0.9 + i) * (1 - k / steps), (x, z) => H(x, z), 0.05, '#3e72a0'));
  }
  const crackOut = new THREE.Mesh(mergePlain(fr), crackM); crackOut.name = 'hventfractures'; crackOut.castShadow = false; crackOut.receiveShadow = true; group.add(crackOut);

  // meltwater: an irregular pool hugging the ground, a wet rim of darker ice, two rivulets
  const poolM = pm('#86c4e8', 0.05, { metalness: 0.1 }), wetM = pm('#aed6f0', 0.2);
  const ring = (R0, R1, y, mat, seed, name) => {
    const NA = 48, NR = 3, pos = [], idx = [];
    for (let ri = 0; ri <= NR; ri++) for (let ai = 0; ai < NA; ai++) {
      const an = ai / NA * Math.PI * 2, wob = 0.55 + 0.75 * vnoise(Math.cos(an) * 2.4 + seed, Math.sin(an) * 2.4 + seed, 9), rr = lerp(R0, R1 * wob, ri / NR), x = VENT.x + Math.cos(an) * rr, z = VENT.z + Math.sin(an) * rr;
      pos.push(x, H(x, z) + y, z);
    }
    for (let ri = 0; ri < NR; ri++) for (let ai = 0; ai < NA; ai++) { const a = ri * NA + ai, b = ri * NA + (ai + 1) % NA, c = (ri + 1) * NA + ai, d = (ri + 1) * NA + (ai + 1) % NA; idx.push(a, b, c, b, d, c); }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gg.setIndex(idx); gg.computeVertexNormals(); gg.computeBoundingSphere();
    const m = new THREE.Mesh(gg, mat); m.castShadow = false; m.receiveShadow = true; m.name = name; group.add(m); return m;
  };
  ring(2.8, 6.4, 0.035, wetM, 3, 'hventwet');
  ring(2.8, 4.9, 0.07, poolM, 8, 'hventwater');
  return { cap, plates };
}

// ================================================================== the gorge's river
// The gorge's floor is at 0.4–0.7 m; the river is a flat strip at 0.7 (the terrain hides it wherever the bank rises
// above it, so its shoreline is the terrain's own), a deeper channel down its middle, ripples that drift downstream
// (one merged mesh, a periodic pattern, moved by whole periods), foam along the shore and round the stones, stones and
// ice shelves lined along both banks, a few floes, three boulders mid-stream with a low collider.
export function gorgeRiver(env) {
  const { group, H, GM, GORGE, updaters, col, burn } = env;
  const r = rng(515), zc = (x) => (GORGE.z0 + GORGE.z1) / 2 + GM(x);
  burn(70);   // (the old drifting ice chunks drew 70 numbers from the region's random stream: kept, so the pines and rocks stay where they were)
  const X0 = -112, X1 = 112, step = 2;
  const xs = []; for (let x = X0; x <= X1; x += step) xs.push(x);
  const strip = (hwf, y, dz = (x) => 0) => ribbonGeo(xs.map((x) => [x, zc(x) + dz(x)]), (i) => hwf(xs[i]), () => 0, y, '#ffffff');
  const flowM = new THREE.MeshStandardMaterial({ color: '#7ac0e0', roughness: 0.12, metalness: 0.05 });
  const water = new THREE.Mesh(strip(() => 4.2, 0.7), flowM); water.name = 'hriver'; water.receiveShadow = true; group.add(water);
  const chanM = pm('#5ba4cc', 0.1, { metalness: 0.05 });
  const chan = new THREE.Mesh(strip((x) => 1.7 + 0.5 * Math.sin(x * 0.11) , 0.715, (x) => 0.35 * Math.sin(x * 0.07 + 1)), chanM); chan.name = 'hchannel'; chan.receiveShadow = true; group.add(chan);
  let ft = 0; updaters.push((dt) => { ft += dt; flowM.color.setHSL(0.55, 0.55, 0.66 + Math.sin(ft * 2) * 0.02); });
  // shoreline: where the bank passes 0.74, each side, every 2 m
  const shore = (x, s) => { const c = zc(x); let d = 0.8; while (d < 5.5 && H(x, c + s * d) < 0.74) d += 0.15; return d; };
  // ripples: dashes of pale water in the channel, one 8 m period repeated, the mesh slid downstream by whole periods
  const PER = 8, rip = [];
  for (let k = 0; k < 7; k++) {
    const x = r() * PER, len = 1.0 + r() * 1.8, off = (r() - 0.5) * 3.4;
    for (let q = X0; q < X1; q += PER) {
      const pts = []; for (let i = 0; i <= 4; i++) { const xx = q + x + len * i / 4; pts.push([xx, zc(xx) + off + Math.sin(xx * 0.9 + k) * 0.1]); }
      rip.push(ribbonGeo(pts, (i) => 0.045 + 0.05 * Math.sin(Math.PI * i / 4), () => 0, 0.735, '#ffffff'));
    }
  }
  const ripM = pm('#d6eefa', 0.12); const ripples = new THREE.Mesh(mergePlain(rip), ripM); ripples.name = 'hripples'; group.add(ripples);
  let rt = 0; updaters.push((dt) => { rt = (rt + dt * 0.9) % PER; ripples.position.x = rt; });
  // banks: stones, foam, ice shelves
  const B = new Batch(group, { cast: false });
  const stoneM = tm('stone', { color: '#8f8c86' }), shelfM = pm('#dcf0fb', 0.2), foamM = MM.snow();
  const stone = new THREE.DodecahedronGeometry(1, 0); const pa = stone.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i); pa.setXYZ(i, x * (1 + 0.16 * Math.sin(y * 4 + z * 3)), y * 0.7, z * (1 + 0.16 * Math.sin(x * 4 - y * 2))); } stone.computeVertexNormals();
  const foam = [];
  for (const s of [-1, 1]) for (let x = X0 + 2; x < X1 - 2; x += 1.2 + r() * 2.2) {
    const d = shore(x, s), c = zc(x); if (d > 5.2) continue;
    if (r() < 0.62) { const sz = 0.16 + r() * 0.36; B.add(stone, stoneM, x, 0.7 + sz * 0.12, c + s * (d - 0.15 - r() * 0.4), r(), r() * 6, r(), sz * (0.9 + r() * 0.5), sz, sz); }
    if (r() < 0.45) { const len = 1.4 + r() * 2.6, wd = 0.5 + r() * 0.5; B.add(bbox(len, 0.12, wd, 0.05, 1), shelfM, x, 0.745, c + s * (d - wd * 0.35), 0, (r() - 0.5) * 0.5, 0); }
    if (r() < 0.8) { const len = 0.8 + r() * 2.2; const pts = []; for (let i = 0; i <= 3; i++) { const xx = x + len * i / 3; pts.push([xx, zc(xx) + s * (shore(xx, s) - 0.12)]); } foam.push(ribbonGeo(pts, (i) => 0.1 + 0.07 * Math.sin(Math.PI * i / 3), () => 0, 0.74, '#ffffff')); }
  }
  // floes: pale slabs jammed against the stones and along the channel
  for (let i = 0; i < 12; i++) { const x = -70 + r() * 140, o = (r() - 0.5) * 3.2; B.add(bbox(0.9 + r() * 1.2, 0.16, 0.7 + r() * 0.8, 0.06, 1), shelfM, x, 0.77, zc(x) + o, 0, r() * 3, (r() - 0.5) * 0.05); }
  // three boulders mid-stream (a foam ring each) near the tree bridge's reach and west of it, off the channel's line
  for (const [x, o, rad] of [[-24, 1.7, 0.62], [14, -1.5, 0.55], [-48, -1.8, 0.5]]) {
    const z = zc(x) + o; B.add(stone, stoneM, x, 0.7 + rad * 0.3, z, 0.2, r() * 6, 0.1, rad * 1.1, rad * 1.15, rad);
    const pts = []; for (let i = 0; i <= 12; i++) { const a = i / 12 * Math.PI * 2; pts.push([x + Math.cos(a) * (rad * 1.35), z + Math.sin(a) * (rad * 1.35)]); }
    foam.push(ribbonGeo(pts, () => 0.09, () => 0, 0.745, '#ffffff'));
    col({ type: 'cyl', x, z, r: rad * 0.9, top: 0.7 + rad, noStand: true, seeThrough: true });
  }
  B.build();
  if (foam.length) { const f = new THREE.Mesh(mergePlain(foam), foamM); f.name = 'hfoam'; f.castShadow = false; f.receiveShadow = true; group.add(f); }
  return { water };
}
