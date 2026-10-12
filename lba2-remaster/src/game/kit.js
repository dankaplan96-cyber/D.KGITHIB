// Shared building kit for the outdoor regions (Desert Island, the Hamalayi, …), extracted from the Zeelich
// builder (src/game/zeelich.js keeps its own copy for now). Bevelled boxes with world-scaled UVs, lathes,
// tubes, merged batches per material, wall panels with openings, polygon helpers.
import * as THREE from 'three';
import { textures } from '../engine/textures.js';
export const MC = new Map();
export const TILE = { cliff: 4.5, stone: 1.8, plaster: 2.2, planks: 2.2, brass: 1.6, teal: 2.2, hazard: 0.9, deck: 2.0, cobble: 3.2, grass: 4.0, dirt: 3.0, rubble: 1.7, tiles: 1.0, concrete: 2.6, metal: 2.6, roof: 1.6 };
export function tm(name, opts = {}) {
  const key = name + JSON.stringify(opts);
  if (MC.has(key)) return MC.get(key);
  const map = typeof name === 'string' ? textures()[name] : name;
  const m = new THREE.MeshStandardMaterial({ map, color: opts.color || '#ffffff', roughness: opts.rough ?? 0.88, metalness: opts.metal ?? 0, vertexColors: !!opts.vc, emissive: opts.emissive || '#000000', emissiveIntensity: opts.ei ?? 1, side: opts.side ?? THREE.FrontSide, transparent: !!opts.transparent, alphaTest: opts.alphaTest ?? 0 });
  MC.set(key, m);
  return m;
}
export function pm(color, rough = 0.8, extra = {}) {
  const key = '_' + color + rough + JSON.stringify(extra);
  if (MC.has(key)) return MC.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
  MC.set(key, m);
  return m;
}
export const VC = () => pm('#ffffff', 0.85, { vertexColors: true });
export const brassM = () => tm('brass', { rough: 0.36, metal: 0.75 });
export const tealM = () => tm('teal', { rough: 0.55, metal: 0.3 });
export const darkSteel = () => pm('#3a4048', 0.5, { metalness: 0.55 });
export const glowCyan = () => pm('#9ff4ff', 0.3, { emissive: '#35d8ff', emissiveIntensity: 2.4 });

// ================================================================== painted textures (Zeelich only)
const TC = new Map();
export function ctex(key, w, h, draw, repeat = true) {
  if (TC.has(key)) return TC.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  TC.set(key, t);
  return t;
}
export const wrap9 = (S, fn) => { for (const a of [-S, 0, S]) for (const b of [-S, 0, S]) fn(a, b); };

export const GC = new Map();
export const cached = (key, fn) => { if (!GC.has(key)) GC.set(key, fn()); return GC.get(key); };
export function scaleUV(geo, s) { const uv = geo.attributes.uv; if (!uv) return geo; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / s, uv.getY(i) / s); uv.needsUpdate = true; return geo; }
export function bbox(w, h, d, r = 0.03, tile = 1) {
  return cached(`bb${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)},${r},${tile}`, () => {
    r = Math.min(r, w / 2.2, h / 2.2, d / 2.2);
    const sw = w - 2 * r, sh = h - 2 * r, rc = Math.min(r * 0.6, sw / 2.2, sh / 2.2);
    const s = new THREE.Shape();
    s.moveTo(-sw / 2 + rc, -sh / 2); s.lineTo(sw / 2 - rc, -sh / 2); s.quadraticCurveTo(sw / 2, -sh / 2, sw / 2, -sh / 2 + rc);
    s.lineTo(sw / 2, sh / 2 - rc); s.quadraticCurveTo(sw / 2, sh / 2, sw / 2 - rc, sh / 2); s.lineTo(-sw / 2 + rc, sh / 2);
    s.quadraticCurveTo(-sw / 2, sh / 2, -sw / 2, sh / 2 - rc); s.lineTo(-sw / 2, -sh / 2 + rc); s.quadraticCurveTo(-sw / 2, -sh / 2, -sw / 2 + rc, -sh / 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: r > 0.001, bevelThickness: r, bevelSize: r, bevelSegments: 2, curveSegments: 2 });
    g.translate(0, 0, -(d - 2 * r) / 2);
    return boxUV(g, tile);
  });
}
export function boxUV(geo, tile = 1) {
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal;
  if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(p.count * 2), 2));
  const uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay > ax && ay > az) { u = p.getX(i); v = p.getZ(i); } else if (ax > az) { u = p.getZ(i) * Math.sign(n.getX(i) || 1); v = p.getY(i); } else { u = -p.getX(i) * Math.sign(n.getZ(i) || 1); v = p.getY(i); }
    uv.setXY(i, u / tile, v / tile);
  }
  uv.needsUpdate = true;
  return geo;
}
export function lathe(pts, seg = 16, tile = 0, phiStart = 0, phiLen = Math.PI * 2) {
  const g = new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(Math.max(0.0001, a), b)), seg, phiStart, phiLen);
  if (tile) {
    const uv = g.attributes.uv, pos = g.attributes.position;
    let rmax = 0; for (const [a] of pts) rmax = Math.max(rmax, a);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * phiLen * rmax) / tile, pos.getY(i) / tile);
  }
  return g;
}
export function cyl(rt, rb, h, seg = 12, tile = 0, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
  if (tile) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * Math.PI * 2 * Math.max(rt, rb)) / tile, (uv.getY(i) * h) / tile); }
  return g;
}
export function tube(points, r, seg = 8, tile = 1, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', 0.1);
  const len = curve.getLength();
  const g = new THREE.TubeGeometry(curve, Math.max(2, Math.ceil(len * 3)), r, seg, closed);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * len) / tile, (uv.getY(i) * Math.PI * 2 * r) / tile);
  return g;
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
export class Batch {
  constructor(parent, { cast = true, receive = true } = {}) { this.parent = parent; this.items = new Map(); this.cast = cast; this.receive = receive; }
  add(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    _m4.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz));
    return this.addM(geo, mat, _m4.clone());
  }
  addM(geo, mat, m) { if (!this.items.has(mat)) this.items.set(mat, []); this.items.get(mat).push([geo, m]); return this; }
  build() {
    const out = [];
    for (const [mat, list] of this.items) {
      const mesh = new THREE.Mesh(mergeGeos(list, !!mat.vertexColors), mat);
      mesh.castShadow = this.cast && !mat.transparent; mesh.receiveShadow = this.receive;
      this.parent.add(mesh); out.push(mesh);
    }
    this.items.clear();
    return out;
  }
}
export function mergeGeos(list, withColor) {
  let nv = 0, ni = 0;
  for (const [g] of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = withColor ? new Float32Array(nv * 3) : null;
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  const nm = new THREE.Matrix3(), p = new THREE.Vector3();
  let vo = 0, io = 0;
  for (const [g, m] of list) {
    nm.getNormalMatrix(m);
    const flip = m.determinant() < 0;
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, C = g.attributes.color;
    for (let i = 0; i < P.count; i++) {
      p.fromBufferAttribute(P, i).applyMatrix4(m); pos[(vo + i) * 3] = p.x; pos[(vo + i) * 3 + 1] = p.y; pos[(vo + i) * 3 + 2] = p.z;
      if (N) { p.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[(vo + i) * 3] = p.x; nor[(vo + i) * 3 + 1] = p.y; nor[(vo + i) * 3 + 2] = p.z; }
      if (U) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i); }
      if (col) { if (C) { col[(vo + i) * 3] = C.getX(i); col[(vo + i) * 3 + 1] = C.getY(i); col[(vo + i) * 3 + 2] = C.getZ(i); } else col.fill(1, (vo + i) * 3, (vo + i) * 3 + 3); }
    }
    if (g.index) { for (let i = 0; i < g.index.count; i += 3) { idx[io + i] = g.index.getX(i) + vo; idx[io + i + 1] = g.index.getX(flip ? i + 2 : i + 1) + vo; idx[io + i + 2] = g.index.getX(flip ? i + 1 : i + 2) + vo; } }
    else for (let i = 0; i < P.count; i += 3) { idx[io + i] = i + vo; idx[io + i + 1] = (flip ? i + 2 : i + 1) + vo; idx[io + i + 2] = (flip ? i + 1 : i + 2) + vo; }
    vo += P.count; io += g.index ? g.index.count : P.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}
export function compose(parts, withColor = false) { return mergeGeos(parts.map(([g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx]) => [g, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz))]), withColor); }
export function tint(geo, color) {
  const g = geo.clone(), c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
export function instances(parent, geo, mat, list, { cast = true, receive = true } = {}) {
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  const o = new THREE.Object3D();
  list.forEach((it, i) => {
    o.position.set(it.x, it.y, it.z); o.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0, 'YXZ');
    if (it.s != null) o.scale.setScalar(it.s); else o.scale.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
    o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    if (it.color) im.setColorAt(i, new THREE.Color(it.color));
  });
  im.count = list.length; im.castShadow = cast; im.receiveShadow = receive;
  parent.add(im);
  return im;
}
// Instances in ~32 m tiles with a coarse stand-in for distant tiles (the regions' trees and rocks). The tiles
// switch in updateKitLod(focus) — called every frame for the active region — with 4 m of hysteresis.
export const KIT_LOD = { tiles: [] };
export function lodInstances(parent, geo, geoLo, mat, list, opts = {}, tile = 32) {
  const tiles = new Map();
  for (const it of list) { const k = Math.floor(it.x / tile) + ',' + Math.floor(it.z / tile); if (!tiles.has(k)) tiles.set(k, []); tiles.get(k).push(it); }
  const out = [];
  for (const part of tiles.values()) {
    const hi = instances(parent, geo, mat, part, opts);
    hi.computeBoundingSphere();
    const lo = geoLo ? instances(parent, geoLo, mat, part, opts) : null;
    if (lo) lo.computeBoundingSphere();
    const cx = part.reduce((a, it) => a + it.x, 0) / part.length, cz = part.reduce((a, it) => a + it.z, 0) / part.length;
    if (lo) { const T = { parent, cx, cz, hi, lo, near: true }; setLod(T, true); KIT_LOD.tiles.push(T); }
    out.push(hi);
  }
  return out;
}
export function updateKitLod(focus, near = 40) {
  for (const T of KIT_LOD.tiles) {
    if (!T.parent.visible) continue;
    const d = Math.hypot(focus.x - (T.parent.position.x + T.cx), focus.z - (T.parent.position.z + T.cz));
    if (T.near && d > near + 4) T.near = false; else if (!T.near && d < near - 4) T.near = true;
    setLod(T, T.near);
  }
}
// A near tile shows its detailed instances but casts its shadow with the coarse ones, drawn in the main view
// with a material that writes neither colour nor depth (three's shadow pass tests the main camera's layers
// and material.visible, so a mesh can't be in the shadow map only). The shadow map is ~2 cm a texel, where
// the stand-in's outline reads the same; near trees and rocks were ~6k triangles each in it.
const SHADOW_ONLY = {};
function shadowOnly(m) { return (SHADOW_ONLY[m.side] ??= new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: m.side })); }
export function setLod(T, near) {
  const { hi, lo } = T;
  T.cast ??= hi.castShadow;
  T.mat ??= lo?.material;
  hi.visible = near;
  if (!lo) return;
  hi.castShadow = false; lo.castShadow = T.cast;
  lo.visible = !near || T.cast;
  lo.material = near ? shadowOnly(T.mat) : T.mat;
}
export function mesh(parent, geo, mat, x = 0, y = 0, z = 0, ry = 0, { cast = true, rx = 0, rz = 0 } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz, 'YXZ');
  m.castShadow = cast; m.receiveShadow = true;
  parent.add(m);
  return m;
}
// local frame at (x,z) rotated ry → parent coordinates
export const frame = (x, z, ry) => (lx, lz) => [x + Math.cos(ry) * lx + Math.sin(ry) * lz, z - Math.sin(ry) * lx + Math.cos(ry) * lz];
const _ux = new THREE.Vector3(1, 0, 0), _uy = new THREE.Vector3(0, 1, 0);
export function member(B, a, b, w, mat, tile = 1, round = 0.02) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(_ux, d.normalize());
  B.addM(bbox(+len.toFixed(2), w, w, round, tile), mat, new THREE.Matrix4().compose(A.add(Bv).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
}
export function rod(B, a, b, r, mat, seg = 8) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(_uy, d.normalize());
  B.addM(cyl(r, r, +len.toFixed(2), seg, 1), mat, new THREE.Matrix4().compose(A.add(Bv).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
}
// the Joint Project emblem (same design as on Citadel)
export function emblemMaterial() {
  return cached('emblemMat', () => {
    const t = ctex('emblem', 128, 128, (x) => {
      x.clearRect(0, 0, 128, 128);
      x.strokeStyle = '#bff8ff'; x.fillStyle = '#bff8ff'; x.lineWidth = 11;
      x.beginPath(); x.arc(64, 70, 34, 0, Math.PI * 2); x.stroke();
      for (const s of [-1, 1]) { x.beginPath(); x.moveTo(64 + s * 26, 46); x.quadraticCurveTo(64 + s * 46, 30, 64 + s * 44, 8); x.quadraticCurveTo(64 + s * 36, 30, 64 + s * 16, 40); x.fill(); }
      x.beginPath(); x.moveTo(64, 50); x.quadraticCurveTo(80, 74, 64, 86); x.quadraticCurveTo(48, 74, 64, 50); x.fill();
    }, false);
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#3fe6ff', emissiveIntensity: 2.2, color: '#9ff0ff', transparent: true, alphaTest: 0.3, depthWrite: false, roughness: 0.4, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
  });
}
export const emq = () => cached('emq', () => new THREE.PlaneGeometry(1, 1));

// Openings: polyline from bottom-left, up the left jamb, over the arch, down to bottom-right.
// o = {x, y, w, h, horse|arch|round}; g grows the outline (for frames).
export function openingPts(o, g = 0, n = 14) {
  const hw = o.w / 2 + g, pts = [[o.x - hw, o.y]];
  if (o.horse) {
    const R0 = (o.w / 2) * 1.16, yc = o.y + o.h - R0, R = R0 + g;
    const b = Math.sqrt(Math.max(0, R * R - hw * hw)), beta = Math.atan2(b, hw);
    for (let i = 0; i <= n; i++) { const a = Math.PI + beta - (i / n) * (Math.PI + 2 * beta); pts.push([o.x + Math.cos(a) * R, yc + Math.sin(a) * R]); }
  } else if (o.arch) {
    const yc = o.y + o.h - o.w / 2;
    for (let i = 0; i <= n; i++) { const a = Math.PI - (i / n) * Math.PI; pts.push([o.x + Math.cos(a) * hw, yc + Math.sin(a) * hw]); }
  } else pts.push([o.x - hw, o.y + o.h + g], [o.x + hw, o.y + o.h + g]);
  pts.push([o.x + hw, o.y]);
  return pts;
}
export const toPath = (p, pts) => { pts.forEach(([a, b], i) => (i ? p.lineTo(a, b) : p.moveTo(a, b))); p.closePath(); return p; };
// wall panel in XY (x along, y up) extruded toward +z by t, with openings
export function panelGeo(len, h, t, holes = [], tile = TILE.plaster) {
  const s = new THREE.Shape();
  s.moveTo(-len / 2, 0); s.lineTo(len / 2, 0); s.lineTo(len / 2, h); s.lineTo(-len / 2, h); s.lineTo(-len / 2, 0);
  for (const o of holes) {
    const p = new THREE.Path();
    if (o.round) p.absarc(o.x, o.y + o.h / 2, o.w / 2, 0, Math.PI * 2, true);
    else toPath(p, openingPts(o));
    s.holes.push(p);
  }
  return boxUV(new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 16 }), tile);
}
// U-shaped frame around an opening (outline grown by `ring`), `depth` thick
export function frameGeo(o, ring, depth, tile = 1) {
  return cached('fr' + JSON.stringify(o) + ring + depth + tile, () => {
    const outer = openingPts(o, ring), inner = openingPts(o, 0).reverse();
    const s = toPath(new THREE.Shape(), outer.concat(inner));
    return boxUV(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1 }), tile);
  });
}
// flat filled opening (door leaf, lattice), slightly larger than the hole
export function fillGeo(o, grow, depth, tile = 0.5) {
  return cached('fi' + JSON.stringify(o) + grow + depth + tile, () => {
    const s = toPath(new THREE.Shape(), openingPts(o, grow));
    const g = depth > 0 ? new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }) : new THREE.ShapeGeometry(s);
    return boxUV(g, tile);
  });
}

// ================================================================== polygon helpers
export function chaikin(P, it = 2) {
  let pts = P;
  for (let k = 0; k < it; k++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    pts = out;
  }
  return pts;
}
export function insidePoly(P, x, z) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, zi] = P[i], [xj, zj] = P[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
export function zIntervals(P, x) {
  const zs = [];
  for (let i = 0; i < P.length; i++) {
    const [ax, az] = P[i], [bx, bz] = P[(i + 1) % P.length];
    if ((ax <= x && bx > x) || (bx <= x && ax > x)) zs.push(az + ((x - ax) / (bx - ax)) * (bz - az));
  }
  zs.sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i + 1 < zs.length; i += 2) out.push([zs[i], zs[i + 1]]);
  return out;
}
// distance from a point to the polygon edge (positive)
export function edgeDist(P, x, z) {
  let d = 1e9;
  for (let i = 0; i < P.length; i++) {
    const [ax, az] = P[i], [bx, bz] = P[(i + 1) % P.length];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return d;
}
// resample a closed polygon every ~step metres
export function resample(P, step) {
  const out = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}
export function shapeOf(P) { const s = new THREE.Shape(); P.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z))); s.closePath(); return s; }
// a flat horizontal slab from a polygon (top at y=0, `depth` thick), UVs in metres / tile
export function slabGeo(P, depth, tile, holes = []) {
  const s = shapeOf(P);
  for (const h of holes) s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 24 });
  g.rotateX(-Math.PI / 2);
  return boxUV(g, tile);
}
