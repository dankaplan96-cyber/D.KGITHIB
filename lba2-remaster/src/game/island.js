// Citadel Island outside the town: harbour, lighthouse, Funfrock's old
// fortress turned into the Joint Project station, the project depot, the
// water main with its three bypass valves, the Whispering Cliffs, signs and
// small props. Called from world.js after the town and the vegetation.
//
// Kit rules (docs/ART_KIT.md): bevelled edges, real thickness, painted
// textures with world-scaled UVs, sculpted geometry for organic shapes,
// instancing/merging for repeated parts, a collider for every solid thing.
import * as THREE from 'three';
import { textures } from '../engine/textures.js';
import { sculptRigid } from '../engine/sculpt.js';
import { rng, smoothstep, lerp, fbm, noise2, distToSegment } from '../engine/math.js';
import { rockGeometry, treeGeometry } from './vegetation.js';
import { buildHouse } from './architecture.js';
import { t } from './i18n.js';
import './text/world.js';

// ================================================================== layout
// Everything that the vegetation scatter must keep clear of (world.js asks
// keepClear() before placing a tree, bush, rock or grass clump).
export const HARBOUR = { quayX: -74.5, z: -4, pierLen: 16.5, pierW: 3.2, deck: 1.75 };
export const LIGHTHOUSE = { x: 2, z: -80, half: 2.35, cottage: { x: 11.5, z: -71.5, ry: -Math.PI / 2 - 0.2 } };
export const STATION = { x: 48, z: 36, half: 13, wall: 2.0 };
export const DEPOT = { x0: -1, x1: 19, z0: 44, z1: 60, gateW: [44.6, 48.2], gateE: [45.4, 49.0] };
export const ORCHARD = { x: -29.2, z: 27.4, half: 2.6, ry: 0.74 };
// the water main from the station to the edge of town (where it goes underground)
export const PIPE = [
  [35.6, 40.6], [31.2, 43.4], [26.8, 47.6], [19.0, 50.6], [13.0, 50.6], [6.0, 50.6], [-1.0, 50.0],
  [-8.6, 45.2], [-19.0, 35.6], [-25.8, 29.0], [-30.6, 23.6], [-33.4, 19.4],
];
export const PIPE_DIVE = 9; // index where the main dives into the ground (towards town)
export const BRANCH = [[58.6, 24.0], [58.2, 10.0], [57.0, -4.0], [55.6, -13.6]]; // to the Whispering Cliffs reservoir

export function keepClear(x, z, pad = 0) {
  if (x > HARBOUR.quayX - 20 && x < -60 + pad && z > -14 - pad && z < 8 + pad) return true;
  if (Math.hypot(x - LIGHTHOUSE.x, z - LIGHTHOUSE.z) < 7 + pad) return true;
  if (Math.hypot(x - LIGHTHOUSE.cottage.x, z - LIGHTHOUSE.cottage.z) < 6 + pad) return true;
  if (Math.max(Math.abs(x - STATION.x), Math.abs(z - STATION.z)) < STATION.half + 3.5 + pad) return true;
  if (x > DEPOT.x0 - 2 - pad && x < DEPOT.x1 + 2 + pad && z > DEPOT.z0 - 2 - pad && z < DEPOT.z1 + 2 + pad) return true;
  if (Math.hypot(x - ORCHARD.x, z - ORCHARD.z) < 4.5 + pad) return true;
  if (polyDist(PIPE, x, z) < 1.4 + pad || polyDist(BRANCH, x, z) < 1.4 + pad) return true;
  return false;
}
function polyDist(P, x, z) {
  let d = 1e9;
  for (let i = 0; i < P.length - 1; i++) d = Math.min(d, distToSegment(x, z, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]));
  return d;
}

// ================================================================== materials
const MC = new Map();
const TILE = { rubble: 1.7, fortStone: 3.2, stone: 2.2, planks: 2.2, brass: 1.6, teal: 2.2, hazard: 0.9, deck: 2.0, slate: 1.8, concrete: 2.6, pipe: 1.6, wood: 1.3, cliff: 4.5, plasterWall: 2.2, roof: 1.4 };
// textured material; geometry carries world-scaled UVs (1 unit = 1 tile)
function tm(name, opts = {}) {
  const key = name + JSON.stringify(opts);
  if (MC.has(key)) return MC.get(key);
  const map = textures()[name];
  const m = new THREE.MeshStandardMaterial({ map, color: opts.color || '#ffffff', roughness: opts.rough ?? 0.88, metalness: opts.metal ?? 0, vertexColors: !!opts.vc, emissive: opts.emissive || '#000000', emissiveIntensity: opts.ei ?? 1, side: opts.side ?? THREE.FrontSide, flatShading: !!opts.flat });
  MC.set(key, m);
  return m;
}
function pm(color, rough = 0.8, extra = {}) {
  const key = '_' + color + rough + JSON.stringify(extra);
  if (MC.has(key)) return MC.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
  MC.set(key, m);
  return m;
}
const VC = () => pm('#ffffff', 0.85, { vertexColors: true });

// ================================================================== geometry helpers
const GC = new Map();
const cached = (key, fn) => { if (!GC.has(key)) GC.set(key, fn()); return GC.get(key); };

function scaleUV(geo, s) {
  const uv = geo.attributes.uv;
  if (!uv) return geo;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / s, uv.getY(i) / s);
  uv.needsUpdate = true;
  return geo;
}
// box with rounded/bevelled edges and world-scaled UVs (tile metres per texture)
function bbox(w, h, d, r = 0.03, tile = 1) {
  return cached(`bb${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)},${r},${tile}`, () => {
    r = Math.min(r, w / 2.2, h / 2.2, d / 2.2);
    const sw = w - 2 * r, sh = h - 2 * r;
    const s = new THREE.Shape();
    const rc = Math.min(r * 0.6, sw / 2.2, sh / 2.2);
    s.moveTo(-sw / 2 + rc, -sh / 2); s.lineTo(sw / 2 - rc, -sh / 2); s.quadraticCurveTo(sw / 2, -sh / 2, sw / 2, -sh / 2 + rc);
    s.lineTo(sw / 2, sh / 2 - rc); s.quadraticCurveTo(sw / 2, sh / 2, sw / 2 - rc, sh / 2); s.lineTo(-sw / 2 + rc, sh / 2);
    s.quadraticCurveTo(-sw / 2, sh / 2, -sw / 2, sh / 2 - rc); s.lineTo(-sw / 2, -sh / 2 + rc); s.quadraticCurveTo(-sw / 2, -sh / 2, -sw / 2 + rc, -sh / 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: r > 0.001, bevelThickness: r, bevelSize: r, bevelSegments: 2, curveSegments: 2 });
    g.translate(0, 0, -(d - 2 * r) / 2);
    return scaleUV(g, tile);
  });
}
// extruded profile (shape in XY) along Z, world UVs
function extrude(shape, depth, tile = 1, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 8 });
  return scaleUV(g, tile);
}
function lathe(pts, seg = 16, tile = 0) {
  const g = new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), seg);
  if (tile) {
    // u around (circumference in metres), v along the profile length
    const uv = g.attributes.uv, pos = g.attributes.position;
    let rmax = 0; for (const [a] of pts) rmax = Math.max(rmax, a);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * Math.PI * 2 * rmax) / tile, pos.getY(i) / tile);
  }
  return g;
}
function cyl(rt, rb, h, seg = 12, tile = 0) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1);
  if (tile) {
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * Math.PI * 2 * Math.max(rt, rb)) / tile, (uv.getY(i) * h) / tile);
  }
  return g;
}
// tube along points (open), uv u along length
function tube(points, r, seg = 10, tile = 1, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', 0.1);
  const len = curve.getLength();
  const g = new THREE.TubeGeometry(curve, Math.max(2, Math.ceil(len * 2)), r, seg, closed);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * len) / tile, (uv.getY(i) * Math.PI * 2 * r) / tile);
  return g;
}

// Static batching: collect (geometry, material, transform) and merge per material.
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
class Batch {
  constructor(parent, { cast = true, receive = true } = {}) { this.parent = parent; this.items = new Map(); this.cast = cast; this.receive = receive; }
  add(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    _m4.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz));
    return this.addM(geo, mat, _m4.clone());
  }
  addM(geo, mat, m) {
    if (!this.items.has(mat)) this.items.set(mat, []);
    this.items.get(mat).push([geo, m]);
    return this;
  }
  build() {
    const out = [];
    for (const [mat, list] of this.items) {
      const geo = mergeGeos(list, !!mat.vertexColors);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = this.cast; mesh.receiveShadow = this.receive;
      this.parent.add(mesh);
      out.push(mesh);
    }
    this.items.clear();
    return out;
  }
}
function mergeGeos(list, withColor) {
  let nv = 0, ni = 0;
  for (const [g] of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = withColor ? new Float32Array(nv * 3) : null;
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  const nm = new THREE.Matrix3(), p = new THREE.Vector3();
  let vo = 0, io = 0;
  for (const [g, m] of list) {
    nm.getNormalMatrix(m);
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, C = g.attributes.color;
    for (let i = 0; i < P.count; i++) {
      p.fromBufferAttribute(P, i).applyMatrix4(m); pos.set([p.x, p.y, p.z], (vo + i) * 3);
      if (N) { p.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.set([p.x, p.y, p.z], (vo + i) * 3); }
      if (U) uv.set([U.getX(i), U.getY(i)], (vo + i) * 2);
      if (col) { if (C) col.set([C.getX(i), C.getY(i), C.getZ(i)], (vo + i) * 3); else col.set([1, 1, 1], (vo + i) * 3); }
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo;
    else for (let i = 0; i < P.count; i++) idx[io + i] = i + vo;
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
// merge a list of [geo, matrix] into one geometry (for instancing composite props)
function compose(parts, withColor = false) { return mergeGeos(parts.map(([g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx]) => [g, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz))]), withColor); }
// paint a geometry with one vertex colour (for composing multi-colour props into one vertex-coloured mesh)
function tint(geo, color) {
  const g = geo.clone(), c = new THREE.Color(color), n = g.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
function instances(parent, geo, mat, list, { cast = true, receive = true } = {}) {
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  const o = new THREE.Object3D();
  list.forEach((it, i) => {
    o.position.set(it.x, it.y, it.z); o.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0, 'YXZ');
    if (it.s != null) o.scale.setScalar(it.s); else o.scale.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
    o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    if (it.color) im.setColorAt(i, new THREE.Color(it.color));
  });
  im.count = list.length;
  im.castShadow = cast; im.receiveShadow = receive;
  parent.add(im);
  return im;
}
function mesh(parent, geo, mat, x = 0, y = 0, z = 0, ry = 0, { cast = true, rx = 0, rz = 0 } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz, 'YXZ');
  m.castShadow = cast; m.receiveShadow = true;
  parent.add(m);
  return m;
}
// local → world for a frame at (x,z) rotated ry
const frame = (x, z, ry) => (lx, lz) => [x + Math.cos(ry) * lx + Math.sin(ry) * lz, z - Math.sin(ry) * lx + Math.cos(ry) * lz];

// canvas texture helper
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  return tx;
}
// the Joint Project emblem: a cyan ring with two horns and a drop in the middle
let emblemTex = null;
function emblem() {
  emblemTex ??= canvasTex(128, 128, (x) => {
    x.clearRect(0, 0, 128, 128);
    x.strokeStyle = '#bff8ff'; x.fillStyle = '#bff8ff'; x.lineWidth = 11;
    x.beginPath(); x.arc(64, 70, 34, 0, Math.PI * 2); x.stroke();
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(64 + s * 26, 46); x.quadraticCurveTo(64 + s * 46, 30, 64 + s * 44, 8); x.quadraticCurveTo(64 + s * 36, 30, 64 + s * 16, 40); x.fill(); }
    x.beginPath(); x.moveTo(64, 50); x.quadraticCurveTo(80, 74, 64, 86); x.quadraticCurveTo(48, 74, 64, 50); x.fill();
  });
  return emblemTex;
}
let emblemMat = null;
function emblemMaterial() {
  emblemMat ??= new THREE.MeshStandardMaterial({ map: emblem(), emissiveMap: emblem(), emissive: '#3fe6ff', emissiveIntensity: 2.2, color: '#9ff0ff', transparent: true, alphaTest: 0.3, depthWrite: false, roughness: 0.4, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
  return emblemMat;
}
const glowCyan = () => pm('#9ff4ff', 0.3, { emissive: '#35d8ff', emissiveIntensity: 2.4 });

// ================================================================== shared props
// Citadel street lamp (same design as the town's): stepped base, post, lyre arms, blue globe
function lampGeo() {
  return cached('lamp', () => {
    const metal = [];
    metal.push([cyl(0.2, 0.36, 0.3, 4), 0, 0.15, 0, 0, Math.PI / 4]);
    metal.push([cyl(0.12, 0.2, 0.25, 4), 0, 0.42, 0, 0, Math.PI / 4]);
    metal.push([cyl(0.055, 0.085, 2.2, 8), 0, 1.6, 0]);
    metal.push([cyl(0.1, 0.07, 0.16, 8), 0, 2.72, 0]);
    for (const sx of [-1, 1]) {
      const pts = [[0.04, 2.25], [0.22, 2.42], [0.34, 2.68], [0.33, 2.92], [0.22, 3.0], [0.16, 2.9]].map(([px, py]) => [px * sx, py, 0]);
      metal.push([tube(pts, 0.035, 6, 1)]);
    }
    metal.push([cyl(0.04, 0.06, 0.1, 8), 0, 3.5, 0]);
    return { metal: compose(metal), globe: new THREE.SphereGeometry(0.34, 22, 16).translate(0, 3.12, 0) };
  });
}
const lampMetal = () => pm('#7d8088', 0.55, { metalness: 0.35 });
const lampGlass = () => pm('#2f7fd8', 0.22, { metalness: 0.1, emissive: '#3a8cff', emissiveIntensity: 0.25 });
function lamp(W, parent, x, z, light = false) {
  const y = W.H(x, z), L = lampGeo();
  mesh(parent, L.metal, lampMetal(), x, y, z);
  mesh(parent, L.globe, lampGlass(), x, y, z);
  if (light) { const l = new THREE.PointLight('#9cc8ff', 5, 10, 2); l.position.set(x, y + 3.1, z); parent.add(l); W.lights.push(l); }
  W.physics.add({ type: 'cyl', x, z, r: 0.2, top: y + 3, seeThrough: true });
}

// lathe barrel with a bulge and iron hoops, as one vertex-coloured geometry
function barrelGeo() {
  return cached('barrel', () => {
    const pts = []; for (let i = 0; i <= 10; i++) { const k = i / 10; pts.push([0.34 + Math.sin(k * Math.PI) * 0.07, k * 0.95]); }
    const body = lathe(pts, 16, 0); const uv = body.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2.5, uv.getY(i));
    const top = new THREE.CircleGeometry(0.35, 16).rotateX(-Math.PI / 2).translate(0, 0.93, 0);
    return { body: compose([[body], [top]]), hoops: compose([0.1, 0.36, 0.6, 0.85].map((hy) => [new THREE.TorusGeometry(0.36 + Math.sin(hy / 0.95 * Math.PI) * 0.07, 0.018, 6, 22).rotateX(Math.PI / 2), 0, hy, 0])) };
  });
}
function barrels(W, parent, list, r) {
  const B = barrelGeo();
  const items = list.map(([x, z, lying]) => ({ x, y: W.H(x, z) + (lying ? 0.4 : 0), z, ry: r() * 6, rz: lying ? Math.PI / 2 : (r() - 0.5) * 0.04 }));
  instances(parent, B.body, tm('wood', { color: '#c89060' }), items);
  instances(parent, B.hoops, pm('#3a3a3a', 0.5, { metalness: 0.5 }), items);
  for (const it of items) W.physics.add({ type: 'cyl', x: it.x, z: it.z, r: 0.42, top: it.y + 1, noStand: true, seeThrough: true });
}

// Wooden crate: plank faces in a frame of thicker battens with a diagonal brace
function crateGeo() {
  return cached('crate', () => {
    const planks = [], frame = [];
    const s = 0.98, h = s / 2;
    planks.push([bbox(s - 0.06, s - 0.06, s - 0.06, 0.01, 0.5)]);
    // battens along the 12 edges
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      frame.push([bbox(0.09, s, 0.09, 0.015, 0.5), a * (h - 0.04), h, b * (h - 0.04)]);
      frame.push([bbox(s, 0.09, 0.09, 0.015, 0.5), 0, h + a * (h - 0.04), b * (h - 0.04)]);
      frame.push([bbox(0.09, 0.09, s, 0.015, 0.5), a * (h - 0.04), h + b * (h - 0.04), 0]);
    }
    // diagonal braces on four sides
    const diag = Math.hypot(s - 0.16, s - 0.16);
    for (let k = 0; k < 4; k++) {
      const ry = (k * Math.PI) / 2;
      frame.push([bbox(diag, 0.08, 0.04, 0.012, 0.5), Math.sin(ry) * (h + 0.005), h, Math.cos(ry) * (h + 0.005), 0, ry, Math.PI / 4 * (k % 2 ? 1 : -1)]);
    }
    const body = compose(planks); body.translate(0, h, 0);
    return { planks: body, frame: compose(frame) };
  });
}
const crateMats = () => [tm('planks', { color: '#e0b080' }), tm('wood', { color: '#9a6a40' })];
function crateMesh(scale = 1) {
  const C = crateGeo(), [a, b] = crateMats();
  const g = new THREE.Group();
  const m1 = new THREE.Mesh(C.planks, a), m2 = new THREE.Mesh(C.frame, b);
  for (const m of [m1, m2]) { m.castShadow = m.receiveShadow = true; g.add(m); }
  g.scale.setScalar(scale);
  return g;
}
// static crate stacks (instanced)
function crateStack(W, parent, list, r) {
  const C = crateGeo(), [a, b] = crateMats();
  const items = [];
  for (const [x, z, n = 1, s = 1] of list) {
    const y = W.H(x, z), ry = r() * 0.6;
    for (let k = 0; k < n; k++) items.push({ x: x + (r() - 0.5) * 0.06, y: y + k * s, z: z + (r() - 0.5) * 0.06, ry: ry + (r() - 0.5) * 0.25, s });
    W.physics.add({ type: 'box', x, z, hw: s / 2, hd: s / 2, rot: ry, top: y + n * s, seeThrough: n * s < 1.6 });
  }
  instances(parent, C.planks, a, items);
  instances(parent, C.frame, b, items);
}

// Zeelich-tech cargo crate: teal steel with brass corners and the glowing emblem
function techCrateGeo() {
  return cached('techcrate', () => {
    const s = 1.0, h = s / 2;
    const corners = [];
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (const yy of [0.06, s - 0.06]) corners.push([bbox(0.2, 0.14, 0.2, 0.03, 0.5), a * (h - 0.08), yy, b * (h - 0.08)]);
    const ribs = [];
    for (const yy of [0.33, 0.66]) ribs.push([bbox(s + 0.03, 0.05, s + 0.03, 0.015, 1), 0, yy, 0]);
    const body = bbox(s - 0.02, s - 0.02, s - 0.02, 0.05, 1.1).clone().translate(0, h, 0);
    return { body, brass: compose(corners.concat(ribs)) };
  });
}
function techCrates(W, parent, list, r, out = []) {
  const C = techCrateGeo();
  const items = [];
  const em = [];
  for (const [x, z, n = 1, s = 1, base = null] of list) {
    const y = base ?? W.H(x, z), ry = r() * 0.5;
    for (let k = 0; k < n; k++) items.push({ x, y: y + k * s, z, ry: ry + (r() - 0.5) * 0.15, s });
    em.push({ x: x + Math.sin(ry) * (s / 2 + 0.012), y: y + s * 0.55, z: z + Math.cos(ry) * (s / 2 + 0.012), ry, s: s * 0.62 });
    out.push(W.physics.add({ type: 'box', x, z, hw: s / 2, hd: s / 2, rot: ry, top: y + n * s, seeThrough: n * s < 1.6 }));
  }
  const g = new THREE.Group(); parent.add(g);
  instances(g, C.body, tm('teal', { rough: 0.6, metal: 0.3 }), items);
  instances(g, C.brass, tm('brass', { rough: 0.4, metal: 0.7 }), items);
  instances(g, cached('emq', () => new THREE.PlaneGeometry(1, 1)), emblemMaterial(), em, { cast: false });
  return g;
}

// Signpost: rough post, board with painted pictogram + arrow (language-free), frame
function signpost(W, parent, x, z, ry, key, draw) {
  const y = W.H(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(0, ry, 0.05); parent.add(g);
  const wood = tm('wood', { color: '#b88a5a' });
  mesh(g, bbox(0.13, 2.2, 0.13, 0.03, 1), wood, 0, 1.1, 0);
  mesh(g, bbox(0.1, 0.1, 0.5, 0.02, 1), wood, 0, 0.12, 0, 0, { rz: 0.5 });
  const tex = canvasTex(256, 128, (c, w, h) => {
    c.fillStyle = '#d2ae74'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? 'rgba(120,80,40,0.12)' : 'rgba(255,240,210,0.1)'; c.fillRect(0, i * 32, w, 32); c.fillStyle = 'rgba(80,50,20,0.5)'; c.fillRect(0, i * 32 + 31, w, 1.5); }
    c.strokeStyle = '#6a4424'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
    c.fillStyle = '#3a2410'; c.strokeStyle = '#3a2410';
    draw(c, w, h);
  });
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
  const edge = tm('wood', { color: '#8a5a32' });
  const board = mesh(g, bbox(1.25, 0.62, 0.07, 0.02, 1), [edge], 0.0, 1.78, 0.09);
  board.material = edge;
  const front = mesh(g, cached('signq', () => new THREE.PlaneGeometry(1.2, 0.58)), face, 0, 1.78, 0.13, 0, { cast: false });
  const back = mesh(g, cached('signq', () => new THREE.PlaneGeometry(1.2, 0.58)), face, 0, 1.78, 0.05, Math.PI, { cast: false });
  void front; void back;
  W.physics.add({ type: 'cyl', x, z, r: 0.2, top: y + 2.2, seeThrough: true });
  W.signs.push({ x, z, key });
  return g;
}
// pictograms for the signs
const PICT = {
  arrow(c, x, y, dir = 1, s = 1) { c.save(); c.translate(x, y); c.scale(dir * s, s); c.beginPath(); c.moveTo(-26, -7); c.lineTo(6, -7); c.lineTo(6, -18); c.lineTo(28, 0); c.lineTo(6, 18); c.lineTo(6, 7); c.lineTo(-26, 7); c.closePath(); c.fill(); c.restore(); },
  anchor(c, x, y) { c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.arc(x, y - 30, 7, 0, 7); c.stroke(); c.beginPath(); c.moveTo(x, y - 23); c.lineTo(x, y + 26); c.stroke(); c.beginPath(); c.moveTo(x - 16, y - 12); c.lineTo(x + 16, y - 12); c.stroke(); c.beginPath(); c.arc(x, y + 4, 24, 0.25, Math.PI - 0.25); c.stroke(); },
  tower(c, x, y) { c.beginPath(); c.moveTo(x - 12, y + 34); c.lineTo(x - 8, y - 14); c.lineTo(x + 8, y - 14); c.lineTo(x + 12, y + 34); c.fill(); c.fillRect(x - 13, y - 20, 26, 5); c.fillStyle = '#e8a020'; c.fillRect(x - 7, y - 32, 14, 12); c.fillStyle = '#3a2410'; c.beginPath(); c.moveTo(x - 10, y - 32); c.lineTo(x, y - 42); c.lineTo(x + 10, y - 32); c.fill(); },
  cliff(c, x, y) { c.beginPath(); c.moveTo(x - 34, y + 30); c.lineTo(x - 30, y - 6); c.lineTo(x - 14, y - 14); c.lineTo(x - 4, y - 34); c.lineTo(x + 10, y - 30); c.lineTo(x + 14, y + 30); c.fill(); c.fillStyle = '#c03020'; c.beginPath(); c.moveTo(x + 22, y - 8); c.lineTo(x + 38, y + 22); c.lineTo(x + 6, y + 22); c.closePath(); c.fill(); c.fillStyle = '#fff'; c.fillRect(x + 20, y + 2, 4, 10); c.fillRect(x + 20, y + 15, 4, 4); c.fillStyle = '#3a2410'; },
  gear(c, x, y, r = 26) { c.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? r : r + 9; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); c.fillStyle = '#d2ae74'; c.beginPath(); c.arc(x, y, r * 0.42, 0, 7); c.fill(); c.fillStyle = '#3a2410'; },
  drop(c, x, y) { c.fillStyle = '#2a7ac0'; c.beginPath(); c.moveTo(x, y - 30); c.quadraticCurveTo(x + 24, y + 4, x, y + 26); c.quadraticCurveTo(x - 24, y + 4, x, y - 30); c.fill(); c.fillStyle = '#3a2410'; },
  well(c, x, y) { c.fillRect(x - 24, y + 4, 48, 26); c.beginPath(); c.moveTo(x - 32, y - 10); c.lineTo(x, y - 34); c.lineTo(x + 32, y - 10); c.fill(); c.fillRect(x - 22, y - 12, 5, 18); c.fillRect(x + 17, y - 12, 5, 18); },
  fish(c, x, y) { c.beginPath(); c.ellipse(x, y, 26, 13, 0, 0, 7); c.fill(); c.beginPath(); c.moveTo(x + 20, y); c.lineTo(x + 38, y - 14); c.lineTo(x + 38, y + 14); c.fill(); c.fillStyle = '#d2ae74'; c.beginPath(); c.arc(x - 14, y - 3, 3.5, 0, 7); c.fill(); c.fillStyle = '#3a2410'; },
  cross(c, x, y) { c.save(); c.translate(x, y); c.rotate(Math.PI / 4); c.fillStyle = '#b02a1a'; c.fillRect(-28, -6, 56, 12); c.fillRect(-6, -28, 12, 56); c.restore(); c.fillStyle = '#3a2410'; },
};

// ================================================================== harbour
function buildHarbour(W, root, r) {
  const { physics, H } = W;
  const g = new THREE.Group(); g.name = 'harbour'; root.add(g);
  const B = new Batch(g);
  const QX = HARBOUR.quayX, QH = 1.8, Z0 = -13, Z1 = 7;
  const pz = HARBOUR.z, pw = HARBOUR.pierW, deck = HARBOUR.deck, plen = HARBOUR.pierLen;

  // --- rubble embankment along the quay face, battered, with a dressed coping course
  {
    const s = new THREE.Shape();
    s.moveTo(-0.2, -3.6); s.lineTo(1.6, -3.6); s.lineTo(1.6, QH - 0.18); s.lineTo(0.18, QH - 0.18); s.lineTo(-0.2, -3.6);
    const wallGeo = extrude(s, Z1 - Z0 + 1.2, TILE.rubble);
    // shape is in XY (x outward→inward, y up), extruded along z
    B.add(wallGeo, tm('rubble', { color: '#d8d4dc' }), QX, 0, Z0 - 0.6);
    // the bay's side walls (short returns) so the quay corners look built
    for (const [zz, dir] of [[Z0 + 0.6, 1], [Z1 - 0.6, -1]]) {
      const s2 = new THREE.Shape();
      s2.moveTo(0, -3.6); s2.lineTo(1.4, -3.6); s2.lineTo(1.2, QH - 0.18); s2.lineTo(0, QH - 0.18); s2.lineTo(0, -3.6);
      B.add(extrude(s2, 2.6, TILE.rubble), tm('rubble', { color: '#d8d4dc' }), QX - 2.6, 0, zz + (dir > 0 ? -1.4 : 0), 0, Math.PI / 2 * 0, 0);
    }
    // coping stones: individual bevelled blocks with slight jitter
    const cope = [];
    for (let z = Z0 - 0.4; z < Z1 + 0.4; z += 0.9) cope.push({ x: QX + 0.32, y: QH - 0.2, z: z + 0.45, ry: (r() - 0.5) * 0.03, sx: 1, sy: 1, sz: 1, color: new THREE.Color().setScalar(0.85 + r() * 0.2) });
    instances(g, cached('cope', () => bbox(0.9, 0.24, 0.88, 0.04, TILE.stone).translate(0, 0.12, 0)), tm('stone', { color: '#e8e4dc' }), cope);
    physics.add({ type: 'box', x: QX + 0.6, z: (Z0 + Z1) / 2, hw: 0.6, hd: (Z1 - Z0) / 2 + 0.6, rot: 0, top: QH + 0.04, seeThrough: true });
  }

  // --- square white bollards with teal rails along the quay edge (#47)
  {
    const bollard = cached('bollard', () => compose([
      [bbox(0.56, 0.16, 0.56, 0.03, 1), 0, 0.08, 0],
      [bbox(0.4, 0.66, 0.4, 0.03, 1), 0, 0.48, 0],
      [bbox(0.52, 0.12, 0.52, 0.03, 1), 0, 0.86, 0],
      [cyl(0.02, 0.36, 0.2, 4).rotateY(Math.PI / 4), 0, 1.02, 0],
    ]));
    const posts = [];
    const gapA = pz - pw / 2 - 0.5, gapB = pz + pw / 2 + 0.5;
    const zs = [];
    for (let z = Z0 + 0.1; z <= Z1 - 0.1; z += 3.0) if (z < gapA || z > gapB) zs.push(z);
    zs.push(gapA, gapB); zs.sort((a, b) => a - b);
    for (const z of zs) posts.push({ x: QX + 0.45, y: QH + 0.04, z, ry: (r() - 0.5) * 0.06 });
    instances(g, bollard, tm('concrete', { color: '#f4f2ee', rough: 0.75 }), posts);
    const teal = pm('#2a9a8a', 0.4, { metalness: 0.5 });
    for (let i = 0; i < zs.length - 1; i++) {
      const a = zs[i], b = zs[i + 1];
      if (a === gapA && b === gapB) continue;
      for (const hy of [0.55]) B.add(cyl(0.045, 0.045, b - a, 8), teal, QX + 0.45, QH + hy, (a + b) / 2, Math.PI / 2, 0, 0);
    }
    for (const p of posts) physics.add({ type: 'box', x: p.x, z: p.z, hw: 0.3, hd: 0.3, rot: 0, top: QH + 1.1, seeThrough: true });
    // the rail itself blocks (you cannot step off the quay into the basin except over the pier)
    for (let i = 0; i < zs.length - 1; i++) {
      const a = zs[i], b = zs[i + 1];
      if (a === gapA && b === gapB) continue;
      physics.add({ type: 'box', x: QX + 0.45, z: (a + b) / 2, hw: 0.12, hd: (b - a) / 2, rot: 0, top: QH + 1.05, seeThrough: true, noStand: true });
    }
  }

  // --- plank pier on piles
  {
    const x0 = QX + 0.3, x1 = QX - plen;
    const planks = [];
    for (let x = x0; x > x1; x -= 0.3) planks.push({ x: x - 0.14, y: deck - 0.05, z: pz + (r() - 0.5) * 0.06, ry: (r() - 0.5) * 0.015, sx: 1, sy: 1, sz: 0.97 + r() * 0.06, color: new THREE.Color().setScalar(0.82 + r() * 0.3) });
    instances(g, cached('plank', () => bbox(0.27, 0.09, pw, 0.015, TILE.planks)), tm('planks', { color: '#e8d2b8' }), planks);
    const wood = tm('wood', { color: '#8a6a4a' });
    for (const zz of [-pw / 2 + 0.2, 0, pw / 2 - 0.2]) B.add(bbox(plen + 0.3, 0.22, 0.18, 0.02, TILE.wood).rotateY(Math.PI / 2), wood, (x0 + x1) / 2, deck - 0.21, pz + zz, 0, Math.PI / 2, 0);
    const piles = [];
    for (let x = x0 - 0.4; x > x1 - 0.2; x -= 2.75) {
      B.add(bbox(0.2, 0.22, pw + 0.5, 0.02, TILE.wood), wood, x, deck - 0.42, pz);
      for (const s of [-1, 1]) piles.push({ x: x + (r() - 0.5) * 0.05, y: deck - 0.3, z: pz + s * (pw / 2 + 0.05), ry: r() * 6, rz: (r() - 0.5) * 0.03 });
      // diagonal bracing between the piles
      B.add(bbox(0.08, 2.4, 0.12, 0.02, TILE.wood), wood, x, -0.4, pz, 0, 0, 0.9);
    }
    instances(g, cached('pile', () => { const p = cyl(0.15, 0.17, 4.6, 9, TILE.wood); p.translate(0, -2.3 + 0.35, 0); return p; }), tm('wood', { color: '#6a5038' }), piles);
    // mooring posts with rope at the far end and a ladder down to the water
    for (const s of [-1, 1]) {
      const mx = x1 + 0.5, mz = pz + s * (pw / 2 - 0.25);
      B.add(cyl(0.12, 0.14, 0.75, 9, TILE.wood), wood, mx, deck + 0.37, mz);
      B.add(new THREE.TorusGeometry(0.15, 0.04, 6, 14), pm('#c8b07a', 0.95), mx, deck + 0.42, mz, Math.PI / 2, 0, 0);
      physics.add({ type: 'cyl', x: mx, z: mz, r: 0.18, top: deck + 0.75, seeThrough: true, noStand: true });
    }
    for (const yy of [0.2, 0.6, 1.0, 1.4]) B.add(bbox(0.06, 0.06, 0.6, 0.01, 1), pm('#5a5a5a', 0.5, { metalness: 0.5 }), x1 - 0.02, yy - 0.2, pz + 0.6);
    for (const s of [-1, 1]) B.add(bbox(0.06, 2.0, 0.06, 0.01, 1), pm('#5a5a5a', 0.5, { metalness: 0.5 }), x1 - 0.02, 0.6, pz + 0.6 + s * 0.3);
    physics.add({ type: 'box', x: (x0 + x1) / 2, z: pz, hw: (x0 - x1) / 2, hd: pw / 2, rot: 0, top: deck, seeThrough: true });
    W.pierEnd = { x: x1 + 1.8, z: pz, y: deck };
    W.pierStart = { x: QX + 2.0, z: pz };
  }

  // --- Doran's harbour shed: rubble walls, plank roof, a door that stays shut
  {
    const sx = -67.2, sz = 4.4, ry = Math.PI;
    const shed = buildHouse({ w: 4.8, d: 3.6, h: 2.5, pitch: 0.5, overhang: 0.3, wall: 'rubble', tint: '#e8e4e8', roof: 'planks', door: { x: 1.1, arch: false }, doorColor: '#7a5a3a', shutters: '#2a8a7a', chimney: false, seed: 41,
      windows: [{ side: 'front', x: -1.0, y: 1.2, w: 0.7, h: 0.75 }, { side: 'right', x: 0, y: 1.25, w: 0.6, h: 0.6 }] });
    const y = H(sx, sz);
    shed.group.position.set(sx, y - 0.05, sz); shed.group.rotation.y = ry;
    g.add(shed.group);
    for (const c of shed.colliders) physics.add({ type: 'box', x: sx, z: sz, hw: c.hw, hd: c.hd, rot: ry, top: y + 4 });
    W.harbourShed = { x: sx, z: sz, door: { x: sx - 1.1, z: sz - 3.6 / 2 - 0.75 } };
    // fishing tools against the wall: oars, a net on a rack, lobster pots
    const at = frame(sx, sz, ry);
    const [ox, oz] = at(-2.0, 2.4);
    const rack = new THREE.Group(); rack.position.set(ox, H(ox, oz), oz); rack.rotation.y = ry; g.add(rack);
    const wood = tm('wood', { color: '#a07a50' });
    for (const s of [-1, 1]) mesh(rack, bbox(0.1, 1.9, 0.1, 0.02, 1), wood, s * 1.0, 0.95, 0);
    mesh(rack, cyl(0.04, 0.04, 2.3, 8).rotateZ(Math.PI / 2), wood, 0, 1.85, 0);
    mesh(rack, netGeo(2.0, 1.6), netMat(), 0, 1.83, 0.02, 0, { cast: false });
    physics.add({ type: 'box', x: ox, z: oz, hw: 1.1, hd: 0.25, rot: ry, top: H(ox, oz) + 1.9, seeThrough: true });
  }

  // --- Doran's fishing boat and the project ferry
  {
    const boat = fishingBoat();
    boat.position.set(QX - 6.4, 0, pz + pw / 2 + 1.7);
    boat.rotation.y = 0.04;
    g.add(boat);
    W.updaters.push((dt, tt) => { boat.position.y = Math.sin(tt * 1.3) * 0.06 * (0.6 + W.storm); boat.rotation.z = Math.sin(tt * 1.1) * 0.025 * (0.5 + W.storm * 2); });
    physics.add({ type: 'box', x: boat.position.x, z: boat.position.z, hw: 2.8, hd: 1.05, rot: 0, top: 0.9, noStand: true });
    W.fishingBoat = boat;

    const ferry = buildFerry(W, g, QX - plen + 4.6, pz - pw / 2 - 2.6);
    W.ferry = ferry;
  }

  // --- the quay: lamps, bench, tulip beds, barrels, crates, nets, cleats, sign
  lamp(W, g, -70.5, -9.6, true);
  lamp(W, g, -70.5, 1.8);
  lamp(W, g, -63.2, -11.2);
  tulipBed(W, g, -64.8, -9.0, 4.2, 1.4, 0, r);
  tulipBed(W, g, -63.6, 1.2, 1.4, 3.4, 0, r);
  bench(W, g, -65.0, -7.0, Math.PI, r);
  barrels(W, g, [[-73.1, 5.6], [-72.3, 6.1], [-73.2, 4.7], [-69.8, 6.2, true]], r);
  crateStack(W, g, [[-71.6, -11.6, 2], [-70.5, -12.0, 1], [-72.6, -10.6, 1, 0.8]], r);
  netHeap(W, g, -73.0, 2.2, r);
  // iron mooring bitts at the quay edge
  for (const z of [-11.0, 3.6]) {
    const x = QX + 1.0, y = QH;
    for (const s of [-0.22, 0.22]) B.add(lathe([[0, 0], [0.13, 0], [0.11, 0.08], [0.09, 0.32], [0.14, 0.38], [0.14, 0.44], [0, 0.46]], 12), pm('#2e3238', 0.45, { metalness: 0.6 }), x, y, z + s);
    B.add(bbox(0.42, 0.06, 0.82, 0.02, 1), pm('#2e3238', 0.45, { metalness: 0.6 }), x, y + 0.03, z);
    physics.add({ type: 'box', x, z, hw: 0.2, hd: 0.4, rot: 0, top: y + 0.46, seeThrough: true, noStand: true });
  }
  // Esmer cargo stack waiting for the ferry (toggled by the story)
  {
    const cargoCols = [];
    const cargo = techCrates(W, g, [[-71.4, -7.6, 2, 0.9], [-72.4, -8.4, 1, 0.9], [-70.4, -8.3, 1, 0.8]], r, cargoCols);
    W.harbour = { cargo, setCargo(on) { cargo.visible = on; cargoCols.forEach((c) => (c.enabled = on)); } };
  }
  B.build();
}

// ------------------------------------------------------------------ hull
// A proper boat hull: stations along the length with a rounded U section,
// raised sheer at the bow, a transom at the stern, real plank thickness.
function hullGeometry({ L, B, D, sheer = 0.3, transom = 0.75, nu = 28, nv = 16, t = 0.07, paint }) {
  const hb = (u) => {
    if (u < 0.55) return (B / 2) * lerp(transom, 1, smoothstep(0, 0.45, u));
    const k = (u - 0.55) / 0.45;
    return (B / 2) * Math.pow(Math.max(0, Math.cos(k * Math.PI / 2)), 0.75);
  };
  const dep = (u) => D * (0.82 + 0.18 * Math.sin(Math.PI * Math.min(1, u * 1.1))) * (u > 0.85 ? lerp(1, 0.75, (u - 0.85) / 0.15) : 1);
  const top = (u) => sheer * Math.pow(Math.abs(2 * u - 1), 2) * (u > 0.5 ? 1.6 : 0.5);
  const P = [], N = [], C = [], UV = [], I = [];
  const col = new THREE.Color();
  const pushSurf = (inner) => {
    const base = P.length / 3;
    for (let i = 0; i <= nu; i++) {
      const u = i / nu, w = Math.max(0.001, hb(u) - (inner ? t : 0)), d = Math.max(0.001, dep(u) - (inner ? t : 0)), y0 = top(u);
      for (let j = 0; j <= nv; j++) {
        const v = -1 + (2 * j) / nv, a = v * Math.PI / 2;
        const x = L * (u - 0.5), y = y0 - d * Math.pow(Math.cos(a), 0.85), z = w * Math.sin(a);
        P.push(x, y, z);
        UV.push(x / 2.2, (v * (w + d)) / 2.2);
        paint(col, y, u, v, inner); C.push(col.r, col.g, col.b);
      }
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = base + i * (nv + 1) + j, b = a + nv + 1;
      if (inner) I.push(a, a + 1, b, b, a + 1, b + 1); else I.push(a, b, a + 1, b, b + 1, a + 1);
    }
    return base;
  };
  const o = pushSurf(false), n = pushSurf(true);
  // gunwale rims (top edges) joining outer and inner
  for (const j of [0, nv]) for (let i = 0; i < nu; i++) {
    const a = o + i * (nv + 1) + j, b = o + (i + 1) * (nv + 1) + j, c = n + i * (nv + 1) + j, d = n + (i + 1) * (nv + 1) + j;
    if (j === 0) I.push(a, c, b, b, c, d); else I.push(a, b, c, b, d, c);
  }
  // transom: fan over the stern section, outer and inner
  for (const [s, flip] of [[o, false], [n, true]]) {
    const cx = P[s * 3], cy = P[(s + nv / 2) * 3 + 1] * 0.3, cz = 0;
    const ci = P.length / 3; P.push(cx, top(0) * 0.6 + cy * 0, cz); UV.push(0, 0); paint(col, -0.1, 0, 0, flip); C.push(col.r, col.g, col.b);
    for (let j = 0; j < nv; j++) { const a = s + j, b = s + j + 1; if (flip) I.push(ci, a, b); else I.push(ci, b, a); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setIndex(I);
  g.computeVertexNormals();
  return { geo: g, hb, top, dep };
}

function fishingBoat() {
  const grp = new THREE.Group();
  const H0 = 0.62; // gunwale height above the water amidships
  const hull = cached('fishhull', () => hullGeometry({ L: 5.4, B: 2.0, D: 1.0, sheer: 0.32, transom: 0.7, t: 0.06,
    paint: (c, y, u, v, inner) => {
      if (inner) c.set('#b08a60');
      else if (y < -0.32) c.set('#7a2a22');
      else if (y > -0.08) c.set(y > 0.0 ? '#f2ece0' : '#2a6aa8');
      else c.set('#c8402e');
    } }));
  const hm = mesh(grp, hull.geo, tm('planks', { vc: true, rough: 0.8 }), 0, H0, 0);
  void hm;
  const wood = tm('wood', { color: '#b08458' });
  // top rail, thwarts, floor boards, a small cuddy at the bow, mast with a furled sail, oars, nets
  const ins = (u) => Math.max(0.05, hull.hb(u) - 0.08);
  for (const u of [0.25, 0.5]) mesh(grp, bbox(0.22, 0.05, ins(u) * 2, 0.015, 1), wood, 5.4 * (u - 0.5), H0 - 0.25, 0);
  mesh(grp, bbox(3.6, 0.04, 1.0, 0.01, TILE.planks), tm('planks', { color: '#d8b890' }), -0.3, H0 - 0.62, 0);
  const cuddy = new THREE.Group(); cuddy.position.set(1.35, H0, 0); grp.add(cuddy);
  mesh(cuddy, bbox(1.2, 0.55, 1.3, 0.05, 1), tm('planks', { color: '#f2ece0' }), 0, 0.12, 0);
  mesh(cuddy, bbox(1.35, 0.08, 1.45, 0.03, 1), tm('wood', { color: '#2a6aa8' }), 0, 0.43, 0);
  for (const s of [-1, 1]) mesh(cuddy, new THREE.CircleGeometry(0.1, 12), pm('#203040', 0.2, { metalness: 0.2 }), -0.15, 0.15, s * 0.661, s > 0 ? 0 : Math.PI, { cast: false });
  mesh(grp, cyl(0.05, 0.065, 3.4, 8, 1), wood, 0.7, H0 + 1.5, 0);
  mesh(grp, cyl(0.035, 0.035, 2.2, 6).rotateZ(Math.PI / 2), wood, -0.3, H0 + 0.75, 0);
  // furled sail: a sculpted roll along the boom
  mesh(grp, cached('furl', () => sculptRigid({ key: 'furl', prims: [
    { type: 'cone', a: [-1.05, 0, 0], b: [1.0, 0, 0], r1: 0.13, r2: 0.09, mat: 'c', group: 'a', wobble: (x, y, z) => Math.sin(x * 9) * 0.02 + Math.sin(x * 23 + y * 9) * 0.008 },
    { type: 'ell', c: [-0.2, -0.05, 0], r: [0.5, 0.16, 0.16], mat: 'c', group: 'a' },
  ], groups: { a: 0.08 }, colors: { c: '#efe6d2' }, bounds: { min: [-1.3, -0.3, -0.3], max: [1.3, 0.3, 0.3] }, cell: 0.035 })), VC(), -0.3, H0 + 0.88, 0);
  // oars resting across the thwarts
  for (const s of [-0.25, 0.25]) mesh(grp, compose([[cyl(0.025, 0.025, 2.6, 6).rotateZ(Math.PI / 2)], [bbox(0.5, 0.02, 0.14, 0.01, 1), -1.35, 0, 0]]), wood, -0.5, H0 - 0.18, s, 0.08 * s * 4);
  // a heap of net in the stern
  mesh(grp, netHeapGeo(1), VC(), -1.7, H0 - 0.55, 0.1, 0.3);
  grp.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return grp;
}

// The Joint Project ferry: Zeelich-tech motor ship, teal hull with a brass
// band, white-and-brass superstructure, a funnel and the glowing emblem.
function buildFerry(W, parent, x, z) {
  const grp = new THREE.Group(); grp.position.set(x, 0, z); parent.add(grp);
  const L = 12.5, Bm = 4.4, H0 = 1.95; // gunwale above water
  const hull = cached('ferryhull', () => hullGeometry({ L, B: Bm, D: 2.9, sheer: 0.55, transom: 0.82, t: 0.1, nu: 34, nv: 18,
    paint: (c, y, u, v, inner) => {
      if (inner) c.set('#6a7480');
      else if (y < -1.95) c.set('#5a2c26');        // antifouling below the waterline
      else if (y < -1.7) c.set('#e8e2d0');
      else if (y > -0.32) c.set(y > -0.12 ? '#e0b860' : '#c89a48'); // brass sheer band
      else c.set('#2f8c8a');                         // teal hull
    } }));
  mesh(grp, hull.geo, tm('teal', { vc: true, color: '#ffffff', rough: 0.55, metal: 0.25 }), 0, H0, 0);
  const deckY = H0 - 0.22;
  // deck: outline of the inner hull at deck height
  {
    const s = new THREE.Shape();
    const n = 24, pts = [];
    for (let i = 0; i <= n; i++) { const u = i / n; pts.push([L * (u - 0.5), Math.max(0.02, hull.hb(u) - 0.12)]); }
    pts.forEach(([a, b], i) => (i ? s.lineTo(a, b) : s.moveTo(a, b)));
    for (let i = n; i >= 0; i--) s.lineTo(pts[i][0], -pts[i][1]);
    const dg = extrude(s, 0.12, TILE.deck); dg.rotateX(Math.PI / 2);
    mesh(grp, dg, tm('deck', { color: '#c8c4d4', rough: 0.7, metal: 0.2 }), 0, deckY, 0);
  }
  const teal = tm('teal', { rough: 0.55, metal: 0.3 }), brass = tm('brass', { rough: 0.38, metal: 0.75 }), white = tm('concrete', { color: '#f4f0e8', rough: 0.6 });
  // cabin with portholes
  const cab = new THREE.Group(); cab.position.set(-1.6, deckY, 0); grp.add(cab);
  mesh(cab, bbox(5.2, 2.0, 3.0, 0.12, 2), white, 0, 1.0, 0);
  mesh(cab, bbox(5.5, 0.16, 3.3, 0.06, 1.5), brass, 0, 2.06, 0);
  mesh(cab, bbox(5.25, 0.3, 3.05, 0.04, 1), teal, 0, 0.15, 0);
  const port = cached('porthole', () => new THREE.TorusGeometry(0.2, 0.05, 8, 18));
  const glass = pm('#a8f0ff', 0.15, { emissive: '#3ad0ff', emissiveIntensity: 0.6, metalness: 0.3 });
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) {
    const px = -1.9 + i * 1.25;
    mesh(cab, port, brass, px, 1.15, s * 1.52, 0, { cast: false });
    mesh(cab, new THREE.CircleGeometry(0.18, 16), glass, px, 1.15, s * 1.515, s > 0 ? 0 : Math.PI, { cast: false });
  }
  // wheelhouse on top
  const wh = new THREE.Group(); wh.position.set(-0.4, deckY + 2.14, 0); grp.add(wh);
  mesh(wh, bbox(2.4, 1.5, 2.4, 0.1, 2), white, 0, 0.75, 0);
  mesh(wh, bbox(2.7, 0.18, 2.7, 0.06, 1.5), brass, 0, 1.58, 0);
  const win = pm('#2a5a70', 0.1, { metalness: 0.4, emissive: '#2a9ac0', emissiveIntensity: 0.25 });
  mesh(wh, bbox(0.05, 0.62, 2.0, 0.02, 1), win, 1.21, 0.95, 0);
  for (const s of [-1, 1]) mesh(wh, bbox(1.7, 0.62, 0.05, 0.02, 1), win, 0, 0.95, s * 1.21);
  mesh(wh, cyl(0.04, 0.04, 1.2, 6, 1), brass, -0.6, 2.2, 0);
  mesh(wh, new THREE.SphereGeometry(0.11, 12, 8), glowCyan(), -0.6, 2.85, 0, 0, { cast: false });
  // funnel (brass, teal band, emblem)
  mesh(grp, lathe([[0.62, 0], [0.62, 0.15], [0.55, 0.2], [0.58, 1.9], [0.66, 2.0], [0.66, 2.12], [0.5, 2.12]], 20, 1.2), brass, -3.4, deckY + 2.1, 0);
  mesh(grp, cyl(0.6, 0.59, 0.42, 20, 1.2), teal, -3.4, deckY + 3.2, 0);
  for (const s of [-1, 1]) mesh(grp, cached('emq', () => new THREE.PlaneGeometry(1, 1)), emblemMaterial(), -3.4, deckY + 3.15, s * 0.6, s > 0 ? 0 : Math.PI, { cast: false }).scale.setScalar(0.62);
  // big emblem on the cabin sides
  for (const s of [-1, 1]) {
    const e = mesh(grp, cached('emq', () => new THREE.PlaneGeometry(1, 1)), emblemMaterial(), 1.25 - 1.6, deckY + 1.15, s * 1.53, s > 0 ? 0 : Math.PI, { cast: false });
    e.scale.setScalar(1.25);
  }
  for (const s of [-1, 1]) { const e = mesh(grp, cached('emq', () => new THREE.PlaneGeometry(1, 1)), emblemMaterial(), 3.6, H0 - 0.95, s * (hull.hb(0.79) + 0.04), s > 0 ? 0 : Math.PI, { cast: false, rz: 0 }); e.scale.setScalar(0.95); }
  // bow: hatch, bitts, mast with a lamp
  mesh(grp, bbox(1.4, 0.35, 1.4, 0.06, 1), teal, 2.6, deckY + 0.17, 0);
  mesh(grp, bbox(1.5, 0.08, 1.5, 0.03, 1), tm('hazard', { rough: 0.6 }), 2.6, deckY + 0.38, 0);
  mesh(grp, cyl(0.07, 0.09, 3.2, 8, 1), brass, 4.4, deckY + 1.6, 0);
  mesh(grp, new THREE.SphereGeometry(0.12, 12, 8), glowCyan(), 4.4, deckY + 3.25, 0, 0, { cast: false });
  // railing following the deck edge (teal posts, brass top rail)
  {
    const n = 22, top = [], mid = [];
    const posts = [];
    for (const s of [-1, 1]) {
      const pts1 = [], pts2 = [];
      for (let i = 0; i <= n; i++) {
        const u = 0.04 + (i / n) * 0.9, px = L * (u - 0.5), pzz = s * (hull.hb(u) - 0.16), py = hull.top(u) + H0 - 0.22;
        pts1.push([px, py + 0.95, pzz]); pts2.push([px, py + 0.5, pzz]);
        if (i % 2 === 0 && !(px > -0.3 && px < 1.3 && s < 0)) posts.push({ x: px, y: py, z: pzz });
      }
      top.push(pts1); mid.push(pts2);
    }
    for (const p of top) mesh(grp, tube(p, 0.04, 6, 1), brass, 0, 0, 0, 0, { cast: false });
    for (const p of mid) mesh(grp, tube(p, 0.025, 6, 1), teal, 0, 0, 0, 0, { cast: false });
    instances(grp, cached('rpost', () => cyl(0.03, 0.03, 0.95, 6).translate(0, 0.475, 0)), teal, posts, { cast: false });
  }
  // lifebuoys
  const buoy = cached('buoy', () => { const g = new THREE.TorusGeometry(0.3, 0.09, 8, 20); const c = []; const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getY(i), p.getX(i)); const red = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8) % 2; const cc = new THREE.Color(red ? '#d8402a' : '#f4f0e8'); c.push(cc.r, cc.g, cc.b); } g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); return g; });
  for (const s of [-1, 1]) mesh(grp, buoy, VC(), -0.2, deckY + 1.15, s * 1.62, s > 0 ? 0 : Math.PI);
  // gangway from the pier to the deck
  const gw = new THREE.Group(); gw.position.set(2.0, 0, 2.05); grp.add(gw);
  const gwLen = 1.6;
  const plank = mesh(gw, bbox(0.9, 0.07, gwLen, 0.02, 1), tm('planks', { color: '#d8c0a0' }), 0, (deckY + HARBOUR.deck) / 2, 0, 0, { rx: (HARBOUR.deck - deckY) / gwLen * -1 });
  void plank;
  for (const s of [-1, 1]) mesh(gw, tube([[s * 0.45, deckY + 0.8, -gwLen / 2], [s * 0.45, HARBOUR.deck + 0.8, gwLen / 2]], 0.025, 6, 1), brass, 0, 0, 0);
  grp.traverse((m) => { if (m.isMesh) { m.receiveShadow = true; } });

  // colliders: hull (walkable deck), cabin, wheelhouse, funnel, gangway
  const P = W.physics, cols = [];
  cols.push(P.add({ type: 'box', x: x - 0.2, z, hw: L / 2 - 1.2, hd: Bm / 2 - 0.25, rot: 0, top: deckY + 0.06, seeThrough: true }));
  cols.push(P.add({ type: 'box', x: x + 5.0, z, hw: 0.7, hd: 0.9, rot: 0, top: deckY + 0.06, seeThrough: true }));
  cols.push(P.add({ type: 'box', x: x - 1.6, z, hw: 2.65, hd: 1.55, rot: 0, top: deckY + 4.0 }));
  cols.push(P.add({ type: 'box', x: x + 2.6, z, hw: 0.72, hd: 0.72, rot: 0, top: deckY + 0.42, seeThrough: true }));
  cols.push(P.add({ type: 'box', x: x + 2.0, z: z + 2.05, hw: 0.45, hd: gwLen / 2 + 0.25, rot: 0, top: Math.max(deckY, HARBOUR.deck) + 0.02, seeThrough: true }));
  // rails along the deck edge keep people aboard
  for (const s of [-1, 1]) cols.push(P.add({ type: 'box', x: x - 0.2, z: z + s * (Bm / 2 - 0.12), hw: L / 2 - 1.0, hd: 0.08, rot: 0, top: deckY + 1.0, noStand: true, seeThrough: true, gap: s < 0 ? null : 1 }));
  // the starboard rail has the gangway gap: split it
  const sb = cols.pop();
  sb.enabled = false;
  cols.push(P.add({ type: 'box', x: x - 2.4, z: z + (Bm / 2 - 0.12), hw: 4.0, hd: 0.08, rot: 0, top: deckY + 1.0, noStand: true, seeThrough: true }));
  cols.push(P.add({ type: 'box', x: x + 4.0, z: z + (Bm / 2 - 0.3), hw: 1.4, hd: 0.08, rot: -0.25, top: deckY + 1.0, noStand: true, seeThrough: true }));

  const glow = new THREE.PointLight('#5ae0ff', 2.5, 7, 2); glow.position.set(-1.6, deckY + 1.2, 2.6); grp.add(glow);
  W.updaters.push((dt, tt) => {
    if (!grp.visible) return;
    grp.position.y = Math.sin(tt * 0.9) * 0.04 * (0.6 + W.storm);
    grp.rotation.x = Math.sin(tt * 0.7) * 0.008 * (0.5 + W.storm * 2);
    emblemMaterial().emissiveIntensity = 1.8 + Math.sin(tt * 2.2) * 0.5;
  });
  return {
    group: grp, x, z, y: deckY, gangway: { x: x + 2.0, z: z + 2.05 },
    setVisible(on) { grp.visible = on; cols.forEach((c) => (c.enabled = on)); sb.enabled = false; },
  };
}

// ------------------------------------------------------------------ nets, tulips, bench
let netTex = null;
function netMat() {
  netTex ??= canvasTex(64, 64, (x) => {
    x.clearRect(0, 0, 64, 64); x.strokeStyle = '#d8cfb0'; x.lineWidth = 2;
    for (let i = 0; i < 4; i++) { x.beginPath(); x.moveTo(0, i * 16 + 8); x.lineTo(64, i * 16 + 8); x.stroke(); x.beginPath(); x.moveTo(i * 16 + 8, 0); x.lineTo(i * 16 + 8, 64); x.stroke(); }
    x.fillStyle = '#b0a080'; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) x.fillRect(i * 16 + 6, j * 16 + 6, 4, 4);
  });
  netTex.wrapS = netTex.wrapT = THREE.RepeatWrapping; netTex.repeat.set(5, 4);
  return pm('#ffffff', 0.95, { map: netTex, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide });
}
function netGeo(w, h) {
  return cached('net' + w + h, () => {
    const g = new THREE.PlaneGeometry(w, h, 12, 8);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), k = (h / 2 - y) / h;
      p.setZ(i, Math.sin(x * 3.1) * 0.06 * k + k * k * 0.1);
      p.setY(i, y - h / 2 - Math.cos((x / w) * Math.PI) * 0.12 * k);
    }
    g.computeVertexNormals();
    return g;
  });
}
function netHeapGeo(s = 1) {
  return cached('netheap' + s, () => sculptRigid({ key: 'netheap' + s, prims: [
    { type: 'ell', c: [0, 0.12, 0], r: [0.55 * s, 0.22 * s, 0.45 * s], mat: 'n', group: 'a', wobble: (x, y, z) => Math.sin(x * 21) * Math.sin(z * 19) * 0.025 + Math.sin(x * 40 + z * 33) * 0.01 },
    { type: 'ell', c: [0.25 * s, 0.2 * s, 0.1], r: [0.32 * s, 0.18 * s, 0.3 * s], mat: 'n', group: 'a', wobble: (x, y, z) => Math.sin(x * 25 + y * 17) * 0.02 },
    { type: 'ell', c: [-0.3 * s, 0.1, -0.1], r: [0.12, 0.12, 0.12], mat: 'f', group: 'b' },
    { type: 'ell', c: [0.1, 0.32 * s, -0.15], r: [0.1, 0.1, 0.1], mat: 'f', group: 'b' },
  ], groups: { a: 0.1, b: 0 }, joinK: 0.02, colors: { n: '#a89a78', f: '#e8702a' },
  paint: (p, m, c) => { if (m === 'n') c.offsetHSL(0, 0, Math.sin(p.x * 30) * Math.sin(p.z * 27) * 0.06); },
  bounds: { min: [-0.8 * s, -0.12, -0.7 * s], max: [0.8 * s, 0.5 * s, 0.7 * s] }, cell: 0.035 }));
}
function netHeap(W, parent, x, z, r) {
  mesh(parent, netHeapGeo(1), VC(), x, W.H(x, z), z, r() * 6);
  W.physics.add({ type: 'cyl', x, z, r: 0.6, top: W.H(x, z) + 0.45, seeThrough: true, noStand: true });
}

// tulip: stem, two leaves and a cup (instanced; colour per instance)
function tulipGeo() {
  return cached('tulip', () => {
    const stem = cyl(0.008, 0.011, 0.34, 4).translate(0, 0.17, 0);
    const leafA = new THREE.SphereGeometry(0.05, 6, 4).scale(0.35, 2.2, 0.12).translate(0.03, 0.09, 0).rotateZ(-0.25);
    const leafB = leafA.clone().rotateY(2.4);
    const cup = lathe([[0, 0], [0.03, 0.005], [0.042, 0.03], [0.04, 0.065], [0.028, 0.085], [0.034, 0.095]], 8).translate(0, 0.33, 0);
    return { green: compose([[stem], [leafA], [leafB]]), cup };
  });
}
function tulipBed(W, parent, x, z, w, d, ry, r) {
  const y = W.H(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  // dressed stone curb around dark soil
  const stone = tm('stone', { color: '#e0dcd4' });
  for (const s of [-1, 1]) { mesh(g, bbox(w + 0.3, 0.26, 0.16, 0.03, TILE.stone), stone, 0, 0.1, s * (d / 2 + 0.07)); mesh(g, bbox(0.16, 0.26, d, 0.03, TILE.stone), stone, s * (w / 2 + 0.07), 0.1, 0); }
  mesh(g, bbox(w, 0.16, d, 0.04, 1), tm('dirt', { color: '#6a4a30' }), 0, 0.07, 0, 0, { cast: false });
  const T = tulipGeo(), list = [], cups = [];
  const cols = ['#e8302a', '#f08a1a', '#f4d020', '#e8302a', '#ff5a8a'];
  for (let i = 0; i < w * d * 14; i++) {
    const lx = (r() - 0.5) * (w - 0.2), lz = (r() - 0.5) * (d - 0.2);
    const it = { x: lx, y: 0.14, z: lz, ry: r() * 6, s: 0.9 + r() * 0.4 };
    list.push(it); cups.push({ ...it, color: cols[Math.floor((lx + w) * 1.3) % cols.length] });
  }
  instances(g, T.green, pm('#4f8f3a', 0.8), list, { cast: false });
  instances(g, T.cup, pm('#ffffff', 0.6), cups, { cast: false });
  W.physics.add({ type: 'box', x, z, hw: w / 2 + 0.15, hd: d / 2 + 0.15, rot: ry, top: y + 0.24, seeThrough: true });
}
function bench(W, parent, x, z, ry) {
  const y = W.H(x, z);
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const wood = tm('wood', { color: '#e0503e' });
  for (let i = 0; i < 3; i++) mesh(g, bbox(1.7, 0.05, 0.13, 0.015, 1), wood, 0, 0.46, -0.16 + i * 0.16);
  for (let i = 0; i < 2; i++) mesh(g, bbox(1.7, 0.05, 0.12, 0.015, 1), wood, 0, 0.72 + i * 0.16, -0.31, 0, { rx: -0.18 });
  const iron = pm('#2f3236', 0.5, { metalness: 0.5 });
  for (const sx of [-0.7, 0.7]) {
    mesh(g, bbox(0.06, 0.46, 0.06, 0.01, 1), iron, sx, 0.23, 0.12);
    mesh(g, bbox(0.06, 0.95, 0.06, 0.01, 1), iron, sx, 0.47, -0.27, 0, { rx: -0.18 });
    mesh(g, bbox(0.06, 0.06, 0.5, 0.01, 1), iron, sx, 0.44, -0.06);
  }
  W.physics.add({ type: 'box', x, z, hw: 0.85, hd: 0.3, rot: ry, top: y + 0.5, noStand: true, seeThrough: true });
}

// ================================================================== entry
export function buildIsland(scene, W) {
  const r = rng(4242);
  W.signs = W.signs || [];
  buildHarbour(W, scene, r);
  W.island = { keepClear };
}
