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
import { mergeStatic } from '../engine/merge.js';
import { t } from './i18n.js';
import { PROPS } from './citadel-layout.js';
import { streetDist } from './town.js';
import './text/world.js';

// ================================================================== layout
// Everything that the vegetation scatter must keep clear of (world.js asks
// keepClear() before placing a tree, bush, rock or grass clump).
// the harbour's design frame (buildHarbour) and where it stands (SHIFT.harbour, below)
const HARBOUR0 = { quayX: -74.5, z: -4, pierLen: 16.5, pierW: 3.2, deck: 1.75 };
// The project's sites stand on the original map's northern plateau (12 years on, the island has changed: the
// station in Funfrock's old fort, the depot, the orchard, the water main). The station and the depot were first
// built further south-east; their builders keep those first (design) coordinates and are shifted as a whole.
// The harbour stands at the west end of the original's pier (its first place was the west shore by the square).
export const SHIFT = { station: { x: -76, z: -101 }, depot: { x: -84, z: -122 }, orchard: { x: -58, z: -87.5 }, harbour: { x: -45.5, z: 47 } };
export const HARBOUR = { ...HARBOUR0, quayX: HARBOUR0.quayX + SHIFT.harbour.x, z: HARBOUR0.z + SHIFT.harbour.z };
const sh = (k, x, z) => ({ x: x + SHIFT[k].x, z: z + SHIFT[k].z });
export const LIGHTHOUSE = { x: -107.5, z: 90.5, half: 2.35, cottage: { x: -98, z: 99, ry: -Math.PI / 2 - 0.2 } };
const STATION0 = { x: 48, z: 36, half: 13, wall: 2.0 };
export const STATION = { ...STATION0, ...sh('station', STATION0.x, STATION0.z) };
const DEPOT0 = { x0: -1, x1: 19, z0: 44, z1: 60, gateW: [44.0, 48.2], gateE: [45.4, 49.0] };
export const DEPOT = { x0: DEPOT0.x0 + SHIFT.depot.x, x1: DEPOT0.x1 + SHIFT.depot.x, z0: DEPOT0.z0 + SHIFT.depot.z, z1: DEPOT0.z1 + SHIFT.depot.z,
  gateW: DEPOT0.gateW.map((z) => z + SHIFT.depot.z), gateE: DEPOT0.gateE.map((z) => z + SHIFT.depot.z) };
const DEPOT_VALVE = sh('depot', 16.0, 50.6);
const DEPOT_LOOP_X = [4.0, 13.0].map((x) => x + SHIFT.depot.x); // where the drones' loop crosses under the main
// the orchard valve: iron cage centre (x,z, half size) and the drop point of the bypass (dx,dz)
export const ORCHARD = { ...sh('orchard', -21.9, 32.55), half: 2.0, dx: -22.4 + SHIFT.orchard.x, dz: 32.6 + SHIFT.orchard.z };
export const ORCHARD_SHOT = sh('orchard', -15.2, 32.0); // where to stand for the magic-ball shot
// the water main: from the station along the plateau, through the depot, past the orchard, then down the
// cliffs by the west shore to the meter at the edge of town (where it dives into the meter portal)
export const PIPE = [
  [-42.6, -57.3], [-47.5, -61.5], [-55.0, -68.5], [-60.0, -71.4], [-62.4, -71.4], [-64.5, -71.4], [-85.0, -71.4], [-89.5, -73.6],
  [-91.5, -66.0], [-86.0, -58.5], [-80.4, -53.9], [-76.5, -48.0], [-74.2, -38.0], [-73.4, -28.0], [-72.6, -21.0], [-72.4, -18.6],
];
const METER = { x: -72.0, z: -17.0, ry: Math.PI / 2 };
// to the reservoir under the Whispering Cliffs (the rock stack on the plateau's rim)
export const BRANCH = [[-33.0, -50.0], [-35.5, -44.5], [-43.5, -37.0], [-51.0, -32.5], [-55.2, -31.9]];
const CLIFF_VALVE = { z: -36.6 };
const POI_PLATEAU = { h: 16.8 };
// the old stump where a clover hides (a giver, see world.js)
export const STUMP = { x: -30, z: -33 };

export function keepClear(x, z, pad = 0) {
  if (x > HARBOUR.quayX - 20 && x < HARBOUR.quayX + 14.5 + pad && z > HARBOUR.z - 10 - pad && z < HARBOUR.z + 12 + pad) return true;
  if (Math.hypot(x - LIGHTHOUSE.x, z - LIGHTHOUSE.z) < 7 + pad) return true;
  if (Math.hypot(x - LIGHTHOUSE.cottage.x, z - LIGHTHOUSE.cottage.z) < 6 + pad) return true;
  if (Math.max(Math.abs(x - STATION.x), Math.abs(z - STATION.z)) < STATION.half + 3.5 + pad) return true;
  if (x > DEPOT.x0 - 2 - pad && x < DEPOT.x1 + 2 + pad && z > DEPOT.z0 - 2 - pad && z < DEPOT.z1 + 2 + pad) return true;
  if (Math.hypot(x - ORCHARD.x, z - ORCHARD.z) < 4.0 + pad) return true;
  if (Math.hypot(x - METER.x, z - METER.z) < 2.5 + pad) return true;
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

// square white bollard (quay edge, the original's bollard runs)
function bollardGeo() {
  return cached('bollard', () => compose([
    [bbox(0.56, 0.16, 0.56, 0.03, 1), 0, 0.08, 0],
    [bbox(0.4, 0.66, 0.4, 0.03, 1), 0, 0.48, 0],
    [bbox(0.52, 0.12, 0.52, 0.03, 1), 0, 0.86, 0],
    [cyl(0.02, 0.36, 0.2, 4).rotateY(Math.PI / 4), 0, 1.02, 0],
  ]));
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
function buildHarbour(W0, root, r) {
  // built in its design frame (the west shore by the square, where it first stood) and shifted as a whole to
  // the west end of the original's pier: see siteW. What the story reads (pier ends, shed, ferry, lift) is
  // moved to world coordinates at the end.
  const d = SHIFT.harbour, W = siteW(W0, d);
  const { physics, H } = W;
  const g = new THREE.Group(); g.name = 'harbour'; g.position.set(d.x, 0, d.z); root.add(g);
  const B = new Batch(g);
  const QX = HARBOUR0.quayX, QH = 1.8, Z0 = -13, Z1 = 7;
  const pz = HARBOUR0.z, pw = HARBOUR0.pierW, deck = HARBOUR0.deck, plen = HARBOUR0.pierLen;

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
    const bollard = bollardGeo();
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
    boat.position.set(QX - 6.4, 0.28, pz + pw / 2 + 1.7);
    boat.rotation.y = 0.04;
    g.add(boat);
    const boatX = boat.position.x;
    W.boatSurge = 0; // (the opening pulls the boat against its mooring line)
    // (it rides 0.28 m higher than its hull's waterline: the sea's calm swell reaches ~0.2 m, and with the floor
    // boards at the waterline the water showed inside the boat as if it had sunk)
    const RIDE = 0.28;
    W.updaters.push((dt, tt) => { boat.position.x = boatX + W.boatSurge; boat.position.y = RIDE + Math.sin(tt * 1.3) * 0.06 * (0.6 + W.storm); boat.rotation.z = Math.sin(tt * 1.1) * 0.025 * (0.5 + W.storm * 2); });
    physics.add({ type: 'box', x: boat.position.x, z: boat.position.z, hw: 2.8, hd: 1.05, rot: 0, top: 1.2, noStand: true });
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
  W.givers.push({ id: 'quay-barrels', x: -72.6 + d.x, z: 5.4 + d.z, r: 1.8, top: 1.1, kinds: ['money', 'life'], n: 2 });
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
    cargo.userData.keep = true;
  }
  B.build();
  cargoLift(W, g, r);
  mooringLine(W, g);
  // everything else on the quay is static: one mesh per material (≈335 → ≈60 draw calls with shadows)
  // (the boat and the ferry bob as a whole, so each is merged within its own group)
  W.fishingBoat.userData.keep = true; W.ferry.group.userData.keep = true;
  mergeStatic(g); mergeStatic(W.fishingBoat); mergeStatic(W.ferry.group);
  // to world coordinates: what the story and the tests read (the ferry's group stays in the harbour's frame)
  movePt(d, W.pierEnd, W.pierStart, W.harbourShed, W.harbourShed.door, W.ferry, W.ferry.gangway);
  const L = W.cargoLift; L.cratePierW = L.cratePier.clone().add(new THREE.Vector3(d.x, 0, d.z));
}

// ------------------------------------------------------------------ the Joint Project's cargo lift
// A slewing lift on the pier that unloads the project barge moored beside the fishing boat: a teal column with a
// brass motor housing and the project emblem, an arm, a cable and a hook. pose(u) runs one unload cycle
// (0: hook up over the barge, crate aboard → 1: crate set down on the pier, hook raised); shake(k) is the faint
// vibration the opening shows (the hook and the lantern tremble, the puddle on the deck ripples).
function cargoLift(W, parent, r) {
  const g = new THREE.Group(); g.name = 'cargoLift'; g.userData.keep = true; parent.add(g);
  const deck = HARBOUR0.deck, mx = -85.0, mz = -2.75, ARM = 2.0;
  const teal = pm('#2f7a86', 0.45, { metalness: 0.5 }), brassM = pm('#d8b060', 0.3, { metalness: 0.8 }), dark = pm('#2a3038', 0.55, { metalness: 0.5 });
  // column on a bolted base
  mesh(g, cyl(0.46, 0.52, 0.12, 16), dark, mx, deck + 0.06, mz);
  for (let i = 0; i < 6; i++) mesh(g, cyl(0.03, 0.03, 0.05, 6), brassM, mx + Math.cos(i * 1.047) * 0.4, deck + 0.14, mz + Math.sin(i * 1.047) * 0.4);
  mesh(g, cyl(0.15, 0.2, 3.1, 12), teal, mx, deck + 1.66, mz);
  for (const y of [0.6, 1.6, 2.6]) mesh(g, cyl(0.17, 0.17, 0.05, 12), brassM, mx, deck + y, mz);
  // a lantern on a bracket (it trembles with the vibration)
  mesh(g, bbox(0.5, 0.05, 0.05, 0.01), dark, mx - 0.25, deck + 2.3, mz, 0);
  const lantern = new THREE.Group(); lantern.position.set(mx - 0.46, deck + 2.27, mz); g.add(lantern);
  mesh(lantern, cyl(0.006, 0.006, 0.16, 4), dark, 0, -0.08, 0, 0, { cast: false });
  mesh(lantern, cyl(0.07, 0.09, 0.2, 6), brassM, 0, -0.26, 0);
  mesh(lantern, cyl(0.06, 0.06, 0.13, 6), pm('#fff1c8', 0.3, { emissive: '#ffd890', emissiveIntensity: 1.2 }), 0, -0.26, 0, 0, { cast: false });
  // the slewing turret: motor housing with the emblem, the arm, the pulley
  const turret = new THREE.Group(); turret.position.set(mx, deck + 3.2, mz); g.add(turret);
  mesh(turret, bbox(0.62, 0.48, 0.7, 0.06, 1), teal, 0, 0.12, -0.15);
  mesh(turret, bbox(0.66, 0.08, 0.74, 0.03, 1), brassM, 0, 0.4, -0.15);
  for (const s2 of [-1, 1]) {
    const em = mesh(turret, new THREE.PlaneGeometry(0.34, 0.34), emblemMaterial(), s2 * 0.315, 0.12, -0.15, s2 * Math.PI / 2, { cast: false });
    em.renderOrder = 1;
  }
  mesh(turret, bbox(0.16, 0.14, ARM + 0.2, 0.03, 1), teal, 0, 0.32, ARM / 2 - 0.05);
  for (let i = 0; i < 4; i++) mesh(turret, bbox(0.02, 0.1, 0.02, 0.005, 1), brassM, 0.085, 0.32, 0.2 + i * 0.5);
  mesh(turret, cyl(0.09, 0.09, 0.06, 12).rotateZ(Math.PI / 2), brassM, 0, 0.26, ARM);
  // cable (scaled to length), hook block, hook
  const cable = mesh(turret, cyl(0.012, 0.012, 1, 4).translate(0, -0.5, 0), dark, 0, 0.2, ARM, 0, { cast: false });
  const hook = new THREE.Group(); turret.add(hook);
  mesh(hook, bbox(0.14, 0.18, 0.1, 0.03, 1), brassM, 0, -0.09, 0);
  mesh(hook, new THREE.TorusGeometry(0.06, 0.014, 6, 12, Math.PI * 1.4), dark, 0, -0.24, 0, 0, { rz: Math.PI * 0.8 });
  // the barge: a flat project lighter with fenders, one crate staying aboard, the emblem on its side
  const barge = new THREE.Group(); barge.position.set(-85.3, 0, -0.6); g.add(barge);
  mesh(barge, bbox(2.4, 0.45, 1.7, 0.08, 1), pm('#2f6a78', 0.6, { metalness: 0.3 }), 0, 0.12, 0);
  mesh(barge, bbox(2.46, 0.06, 1.76, 0.02, 1), brassM, 0, 0.36, 0);
  for (const [x, z] of [[-1.0, -0.88], [0.0, -0.88], [1.0, -0.88]]) mesh(barge, cyl(0.09, 0.09, 0.32, 8), dark, x, 0.2, z);
  const bem = mesh(barge, new THREE.PlaneGeometry(0.4, 0.4), emblemMaterial(), 0.6, 0.15, 0.861, 0, { cast: false }); bem.renderOrder = 1;
  const crateGeo = bbox(0.8, 0.8, 0.8, 0.04, 1), crateMat = tm('planks', { color: '#c89a68' });
  const mkCrate = (p2) => {
    const c = new THREE.Group(); p2.add(c);
    mesh(c, crateGeo, crateMat, 0, 0, 0);
    for (const s2 of [-1, 1]) for (const t2 of [-1, 1]) mesh(c, bbox(0.06, 0.82, 0.06, 0.01, 1), dark, s2 * 0.39, 0, t2 * 0.39);
    for (const s2 of [-1, 1]) { const e2 = mesh(c, new THREE.PlaneGeometry(0.3, 0.3), emblemMaterial(), 0, 0.05, s2 * 0.405, s2 > 0 ? 0 : Math.PI, { cast: false }); e2.renderOrder = 1; }
    return c;
  };
  const second = mkCrate(barge); second.position.set(-0.6, 0.76, 0.1); second.rotation.y = 0.15;
  const crate = mkCrate(g);
  // a puddle on the deck by the column, with two ripple rings
  const pud = new THREE.Group(); pud.position.set(-84.75, deck + 0.012, -4.2); g.add(pud);
  const pmat = new THREE.MeshStandardMaterial({ color: '#4a5a68', roughness: 0.04, metalness: 0.3, transparent: true, opacity: 0.78 });
  const pmesh = mesh(pud, new THREE.CircleGeometry(0.34, 20), pmat, 0, 0, 0, 0, { rx: -Math.PI / 2, cast: false }); pmesh.scale.set(1.5, 1, 1);
  const rings = [0, 1].map(() => { const m = mesh(pud, new THREE.RingGeometry(0.06, 0.075, 24), new THREE.MeshBasicMaterial({ color: '#dce8f0', transparent: true, opacity: 0, depthWrite: false }), 0, 0.003, 0, 0, { rx: -Math.PI / 2, cast: false }); return m; });
  W.physics.add({ type: 'cyl', x: mx, z: mz, r: 0.5, top: deck + 3.6, seeThrough: true });
  W.physics.add({ type: 'box', x: -85.3, z: -0.6, hw: 1.2, hd: 0.85, rot: 0, top: 0.4, noStand: true });

  // ---- one unload cycle
  const yaw1 = Math.atan2(1.81, -0.85);           // over the pier, clear of the cargo at the pier end
  const BARGE_C = 0.76 + 0.36, PIER_C = deck + 0.41; // crate centre heights aboard / on the deck
  const tipY = 3.2 + 0.2;                          // pulley height above the turret base (turret-local 0.2)
  const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const seg = (u, a, b) => sm((u - a) / (b - a));
  const cratePier = new THREE.Vector3(mx + Math.sin(yaw1) * ARM, PIER_C, mz + Math.cos(yaw1) * ARM);
  const L = {
    group: g, crate, barge, turret, hook, lantern, puddle: pud, mast: { x: mx, z: mz }, cratePier, yaw1,
    shakeK: 0, u: 1,
    pose(u) {
      this.u = u;
      // hook drop below the pulley (m): down to the crate, up with it, over, down to the deck, then up again
      const dCrate = (deck + tipY) - (BARGE_C + 0.4 + 0.27);
      const dHigh = 1.5, dPier = (deck + tipY) - (PIER_C + 0.4 + 0.27), dRest = 1.1;
      let drop, yaw = 0, carry = false;
      if (u < 0.16) drop = dRest + (dCrate - dRest) * seg(u, 0, 0.16);
      else if (u < 0.22) drop = dCrate;
      else if (u < 0.45) { drop = dCrate + (dHigh - dCrate) * seg(u, 0.22, 0.45); carry = true; }
      else if (u < 0.7) { drop = dHigh; yaw = yaw1 * seg(u, 0.45, 0.7); carry = true; }
      else if (u < 0.88) { drop = dHigh + (dPier - dHigh) * seg(u, 0.7, 0.88); yaw = yaw1; carry = true; }
      else { drop = dPier + (dRest - dPier) * seg(u, 0.92, 1.0); yaw = yaw1; }
      turret.rotation.y = yaw;
      cable.scale.y = drop;
      hook.position.set(0, 0.2 - drop, ARM);
      if (carry) {
        // hangs under the hook (a little swing from the turn)
        const p3 = crate.parent.worldToLocal(hook.getWorldPosition(new THREE.Vector3()));
        crate.position.set(p3.x, p3.y - 0.27 - 0.4, p3.z);
        crate.rotation.y = yaw + 0.1;
      } else if (u < 0.22) {
        barge.updateMatrixWorld(); const p3 = crate.parent.worldToLocal(new THREE.Vector3(0.3, 0.76, -0.15).applyMatrix4(barge.matrixWorld));
        crate.position.copy(p3); crate.rotation.y = 0;
      } else { crate.position.copy(cratePier); crate.rotation.y = yaw1 + 0.1; }
    },
    shake(k) { this.shakeK = k; },
  };
  void r;
  L.pose(1);
  let ripT = 0;
  W.updaters.push((dt, tt) => {
    barge.position.y = Math.sin(tt * 1.1 + 0.7) * 0.03 * (0.6 + W.storm);
    const k = L.shakeK;
    lantern.rotation.z = Math.sin(tt * 1.3) * 0.02 + Math.sin(tt * 37) * 0.05 * k;
    lantern.rotation.x = Math.sin(tt * 29) * 0.03 * k;
    hook.rotation.z = Math.sin(tt * 41) * 0.04 * k;
    // ripples: two rings expanding from the middle while it trembles
    ripT += dt * (0.6 + k * 1.4);
    rings.forEach((m, i) => {
      const ph = (ripT * 0.8 + i * 0.5) % 1;
      m.scale.setScalar(1 + ph * 3.2);
      m.material.opacity = k * (1 - ph) * 0.55;
    });
    pmat.roughness = 0.04 + k * 0.12;
  });
  W.cargoLift = L;
}

// Doran's boat is moored to the pier by a bow line that sags and pulls tight as the boat moves
function mooringLine(W, parent) {
  const boat = W.fishingBoat, deck = HARBOUR0.deck;
  const bitt = new THREE.Vector3(-77.7, deck + 0.28, -2.5);
  mesh(parent, cyl(0.07, 0.09, 0.3, 8), pm('#2e3238', 0.45, { metalness: 0.6 }), bitt.x, deck + 0.15, bitt.z);
  const ropeMat = pm('#d8c8a0', 0.9);
  let rope = null;
  const bowLocal = new THREE.Vector3(2.45, 0.86, -0.2), bow = new THREE.Vector3();
  boat.updateMatrixWorld(true);
  parent.updateMatrixWorld(true);
  const L0 = parent.worldToLocal(bow.copy(bowLocal).applyMatrix4(boat.matrixWorld)).distanceTo(bitt) + 0.35;
  const line = { taut: 0 };
  const pts = Array.from({ length: 14 }, () => new THREE.Vector3());
  let acc = 0;
  W.updaters.push((dt) => {
    acc += dt;
    if (acc < 1 / 30 && rope) return;
    acc = 0;
    boat.updateMatrixWorld(true);
    parent.worldToLocal(bow.copy(bowLocal).applyMatrix4(boat.matrixWorld));
    const d = bow.distanceTo(bitt);
    const sag = Math.sqrt(Math.max(0, L0 * L0 - d * d)) * 0.42;
    line.taut = Math.max(0, 1 - sag / 0.3);
    for (let i = 0; i < pts.length; i++) {
      const u = i / (pts.length - 1);
      pts[i].copy(bow).lerp(bitt, u);
      pts[i].y -= Math.sin(u * Math.PI) * sag;
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.022, 5, false);
    if (rope) { rope.geometry.dispose(); rope.geometry = geo; } else { rope = mesh(parent, geo, ropeMat, 0, 0, 0); rope.userData.keep = true; }
  });
  W.mooring = line;
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

// ================================================================== more geometry helpers
// box-projected UVs in the geometry's own space (1 texture tile per `tile` metres):
// faces pointing up get (x,z), faces pointing sideways get (x|z, y)
function boxUV(geo, tile = 1) {
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal;
  if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(p.count * 2), 2));
  const uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay > ax && ay > az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax > az) { u = p.getZ(i) * Math.sign(n.getX(i) || 1); v = p.getY(i); }
    else { u = -p.getX(i) * Math.sign(n.getZ(i) || 1); v = p.getY(i); }
    uv.setXY(i, u / tile, v / tile);
  }
  uv.needsUpdate = true;
  return geo;
}
// a straight structural member (square section, bevelled) from a to b
const _ux = new THREE.Vector3(1, 0, 0);
function memberMatrix(a, b, roll = 0) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const d = B.clone().sub(A), len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(_ux, d.normalize());
  if (roll) q.multiply(new THREE.Quaternion().setFromAxisAngle(_ux, roll));
  return { m: new THREE.Matrix4().compose(A.add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), len };
}
function member(batch, a, b, w, mat, tile = 1, round = 0.02) {
  const { m, len } = memberMatrix(a, b);
  batch.addM(bbox(+len.toFixed(2), w, w, round, tile), mat, m);
}
// a cylinder between two points (pipes, rods)
const _uy = new THREE.Vector3(0, 1, 0);
function rodMatrix(a, b) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const d = B.clone().sub(A), len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(_uy, d.normalize());
  return { m: new THREE.Matrix4().compose(A.add(B).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)), len, q };
}
// wall panel in XY (x along, y up) extruded toward +z by t, with holes [{x,y,w,h,arch|round}]
function panelGeo(len, h, t, holes = [], tile = 2.2) {
  const s = new THREE.Shape();
  s.moveTo(-len / 2, 0); s.lineTo(len / 2, 0); s.lineTo(len / 2, h); s.lineTo(-len / 2, h); s.lineTo(-len / 2, 0);
  for (const o of holes) {
    const p = new THREE.Path();
    if (o.round) { p.absarc(o.x, o.y + o.h / 2, o.w / 2, 0, Math.PI * 2, true); s.holes.push(p); continue; }
    const x0 = o.x - o.w / 2, x1 = o.x + o.w / 2, y0 = o.y, y1 = o.y + o.h;
    p.moveTo(x0, y0); p.lineTo(x1, y0);
    if (o.arch) { p.lineTo(x1, y1 - o.w / 2); p.absarc(o.x, y1 - o.w / 2, o.w / 2, 0, Math.PI, false); }
    else { p.lineTo(x1, y1); p.lineTo(x0, y1); }
    p.lineTo(x0, y0);
    s.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 14 });
  return boxUV(g, tile);
}
// steam puffs: a small pool of soft sprites that rise, grow and fade
let puffTex = null;
function steamSystem(parent, n = 40) {
  puffTex ??= canvasTex(64, 64, (x) => {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.45, 'rgba(240,248,255,0.45)'); g.addColorStop(1, 'rgba(240,248,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  });
  const pool = [];
  for (let i = 0; i < n; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, color: '#f4f8ff', transparent: true, opacity: 0, depthWrite: false, fog: true }));
    s.visible = false; parent.add(s); pool.push({ s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, size: 1 });
  }
  let k = 0;
  return {
    emit(x, y, z, { vx = 0, vy = 1.4, vz = 0, size = 0.8, life = 1.6, spread = 0.25 } = {}) {
      const p = pool[k++ % n];
      p.s.position.set(x + (Math.random() - 0.5) * spread, y, z + (Math.random() - 0.5) * spread);
      p.vx = vx + (Math.random() - 0.5) * 0.4; p.vy = vy * (0.8 + Math.random() * 0.4); p.vz = vz + (Math.random() - 0.5) * 0.4;
      p.life = 0; p.max = life * (0.8 + Math.random() * 0.4); p.size = size; p.s.visible = true;
    },
    update(dt) {
      for (const p of pool) {
        if (!p.s.visible) continue;
        p.life += dt;
        const k2 = p.life / p.max;
        if (k2 >= 1) { p.s.visible = false; continue; }
        p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
        p.vy *= 1 - dt * 0.6;
        p.s.scale.setScalar(p.size * (0.5 + k2 * 1.6));
        p.s.material.opacity = Math.sin(Math.min(1, k2 * 3) * Math.PI / 2) * (1 - k2) * 0.75;
      }
    },
  };
}
// Houses between the camera and Twinsen fade out (town.js); the same for
// the fortress walls, towers and project buildings: each fader owns clones
// of its materials so only that piece turns see-through.
// A builder written in a site's design coordinates runs in a frame: its meshes go into a group moved by d, and
// this stand-in for W looks heights up and places colliders at the moved spot (everything else is W itself).
function siteW(W, d) {
  const P = new Proxy(W.physics, { get: (t, k) => (k === 'add' ? (c) => { c.x += d.x; c.z += d.z; return t.add(c); } : typeof t[k] === 'function' ? t[k].bind(t) : t[k]) });
  return new Proxy(W, {
    get: (t, k) => (k === 'H' ? (x, z) => t.H(x + d.x, z + d.z) : k === 'physics' ? P : k === '_shift' ? d : t[k]),
    set: (t, k, v) => { t[k] = v; return true; },
  });
}
const movePt = (d, ...pts) => { for (const p of pts) if (p) { p.x += d.x; p.z += d.z; } };

function addFader(W, group, x0, z0, x1, z1, top) {
  const d = W._shift;
  if (d) { x0 += d.x; x1 += d.x; z0 += d.z; z1 += d.z; }
  const mats = new Map();
  group.traverse((o) => {
    if (!o.isMesh) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    const out = list.map((m) => { if (!mats.has(m)) mats.set(m, m.clone()); return mats.get(m); });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
  const F = { x0, z0, x1, z1, top, mats: [...mats.values()], f: 1 };
  if (!W._faders) {
    W._faders = [];
    const prev = W.fadeOccluders;
    const sample = new THREE.Vector3();
    W.fadeOccluders = (cam, hero, dt) => {
      prev?.(cam, hero, dt);
      for (const E of W._faders) {
        let hit = false;
        // only when Twinsen is near; the samples run from his feet/head to the camera
        if (hero.x > E.x0 - 18 && hero.x < E.x1 + 18 && hero.z > E.z0 - 18 && hero.z < E.z1 + 18) {
          for (const hy of [0.3, 1.0, 1.8]) for (let k = 1; k < 18 && !hit; k++) {
            sample.set(hero.x, hero.y + hy, hero.z).lerp(cam.position, k / 18);
            if (sample.x > E.x0 && sample.x < E.x1 && sample.z > E.z0 && sample.z < E.z1 && sample.y < E.top) hit = true;
          }
        }
        const goal = hit ? 0.12 : 1;
        E.f += (goal - E.f) * (1 - Math.exp(-dt * 8));
        const see = E.f < 0.98;
        for (const m of E.mats) {
          if (m.transparent !== see && !m.userData.alwaysTransparent) { m.transparent = see; m.needsUpdate = true; }
          m.opacity = see ? E.f * (m.userData.baseOpacity ?? 1) : (m.userData.baseOpacity ?? 1);
          if (!m.userData.alwaysTransparent) m.depthWrite = !see;
        }
      }
    };
  }
  for (const m of F.mats) { if (m.transparent) { m.userData.alwaysTransparent = true; m.userData.baseOpacity = m.opacity; } }
  W._faders.push(F);
  return F;
}

// ================================================================== the Joint Project station
// Funfrock's old fortress (grey-blue ashlar, battered walls with a walk-top
// and merlons, round towers with slate cones, a gatehouse with a portcullis),
// taken over by the Joint Project: a drill derrick over a glowing shaft,
// riveted tanks, flanged pipes, deck plates, an office, a control building
// and the transit beam pad (Otringal's horned ring arch).
const FW = { H: 4.2, T: 2.0 };          // walk-top height, wall thickness
const GATE = { z: STATION.z, w: 3.6, h: 4.0, x0: STATION.x - 15.1, x1: STATION.x - 10.7, half: 4.3, top: 6.9 };

function fortWallGeo(L) {
  return cached('fwall' + L, () => {
    const H = FW.H, s = new THREE.Shape();
    s.moveTo(-1.0, -2.6); s.lineTo(1.42, -2.6); s.lineTo(1.42, 0.0);
    s.lineTo(1.06, H - 0.5); s.lineTo(1.24, H - 0.32); s.lineTo(1.24, H - 0.06); s.lineTo(1.08, H - 0.06);
    s.lineTo(1.08, H + 0.55); s.lineTo(0.42, H + 0.55); s.lineTo(0.42, H); s.lineTo(-0.92, H); s.lineTo(-1.0, H - 0.08);
    s.lineTo(-1.0, -2.6);
    const g = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false });
    g.rotateY(-Math.PI / 2); g.translate(L / 2, 0, 0);
    return boxUV(g, TILE.fortStone);
  });
}
function towerGeo() {
  return cached('ftower', () => {
    const H = FW.H;
    const body = lathe([[0, -2.6], [3.25, -2.6], [3.25, 0], [2.88, H + 1.3], [3.12, H + 1.55], [3.12, H + 1.85], [2.92, H + 1.9], [2.92, H + 2.5], [0, H + 2.5]], 30, TILE.fortStone);
    const roof = lathe([[0, 0], [3.62, 0], [3.62, 0.16], [3.36, 0.34], [2.6, 1.2], [1.7, 2.35], [0.85, 3.5], [0.28, 4.4], [0.0, 4.6]], 30, TILE.slate);
    roof.translate(0, H + 2.45, 0);
    const fin = lathe([[0, 0], [0.16, 0], [0.12, 0.25], [0.06, 0.5], [0.13, 0.62], [0.06, 0.74], [0.02, 1.25], [0, 1.3]], 10);
    fin.translate(0, H + 2.45 + 4.45, 0);
    return { body, roof, fin };
  });
}
function bannerTex() {
  return cached('bannerTex', () => canvasTex(128, 320, (x, w, h) => {
    x.fillStyle = '#1f6e6c'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; x.fillRect(0, Math.random() * h, w, 2); }
    x.strokeStyle = '#d8b060'; x.lineWidth = 8; x.strokeRect(10, 10, w - 20, h - 40);
    x.drawImage(emblem().image, 14, 70, 100, 100);
    x.fillStyle = '#d8b060';
    for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(i * 26 + 4, h - 30); x.lineTo(i * 26 + 17, h); x.lineTo(i * 26 + 30, h - 30); x.fill(); }
    x.fillStyle = '#1f6e6c'; x.fillRect(0, h - 34, w, 6);
  }));
}
function bannerGeo() {
  return cached('banner', () => {
    const g = new THREE.PlaneGeometry(1.1, 2.75, 6, 10), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i), x = p.getX(i); p.setZ(i, Math.sin(x * 4.5 + y * 1.3) * 0.05 + (1.375 - y) * 0.02); }
    g.computeVertexNormals(); g.translate(0, -1.375, 0);
    return g;
  });
}

function buildFortress(W, root, g) {
  const F = STATION, S = F.half, H = FW.H;
  const stoneM = tm('fortStone', { color: '#e6eaf2' });
  const slateM = tm('slate', { color: '#c8d0e0', rough: 0.7 });
  const ironM = pm('#2a2d33', 0.45, { metalness: 0.6 });
  const slitM = pm('#14161a', 0.9);
  const merlonGeo = cached('merlon', () => boxUV(bbox(0.95, 0.82, 0.62, 0.05, 1).translate(0, 0.41, 0), TILE.fortStone));
  const P = W.physics;
  // --- curtain walls: one fader group per side
  const sides = [
    { id: 'N', x: F.x, z: F.z - S, ry: Math.PI, L: 2 * S, box: [F.x - S, F.z - S - 1.6, F.x + S, F.z - S + 1.2] },
    { id: 'S', x: F.x, z: F.z + S, ry: 0, L: 2 * S, box: [F.x - S, F.z + S - 1.2, F.x + S, F.z + S + 1.6] },
    { id: 'E', x: F.x + S, z: F.z, ry: Math.PI / 2, L: 2 * S, box: [F.x + S - 1.2, F.z - S, F.x + S + 1.6, F.z + S] },
  ];
  const wz0 = F.z - S, wz1 = GATE.z - GATE.half, wz2 = GATE.z + GATE.half, wz3 = F.z + S;
  sides.push({ id: 'W1', x: F.x - S, z: (wz0 + wz1) / 2, ry: -Math.PI / 2, L: wz1 - wz0, box: [F.x - S - 1.6, wz0, F.x - S + 1.2, wz1] });
  sides.push({ id: 'W2', x: F.x - S, z: (wz2 + wz3) / 2, ry: -Math.PI / 2, L: wz3 - wz2, box: [F.x - S - 1.6, wz2, F.x - S + 1.2, wz3] });
  for (const sd of sides) {
    const grp = new THREE.Group(); root.add(grp);
    const B = new Batch(grp);
    B.add(fortWallGeo(+sd.L.toFixed(2)), stoneM, sd.x, g, sd.z, 0, sd.ry, 0);
    const n = Math.floor(sd.L / 1.75), list = [];
    const at = frame(sd.x, sd.z, sd.ry);
    for (let i = 0; i < n; i++) {
      const lx = -sd.L / 2 + (i + 0.5) * (sd.L / n);
      if (Math.abs(lx) > sd.L / 2 - 0.9 && sd.L > 20) continue; // the towers cover the ends
      const [x, z] = at(lx, 0.75);
      list.push({ x, y: g + H + 0.55, z, ry: sd.ry + (Math.sin(i * 7.3) * 0.02), sy: 0.94 + Math.abs(Math.sin(i * 3.1)) * 0.12 });
    }
    instances(grp, merlonGeo, stoneM, list);
    // arrow slits on the outer face, the odd drain spout
    for (let i = 1; i < n - 1; i += 3) {
      const lx = -sd.L / 2 + (i + 0.5) * (sd.L / n);
      const [x, z] = at(lx, 1.09);
      B.add(bbox(0.16, 0.95, 0.12, 0.02, 1), slitM, x, g + H - 1.9, z, 0, sd.ry, 0);
    }
    B.build();
    const [x0, z0, x1, z1] = sd.box;
    P.add({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, rot: 0, top: g + H + 1.4 });
    addFader(W, grp, x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, g + H + 1.4);
  }
  // --- corner towers
  const T = towerGeo();
  for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = F.x + cx * S, z = F.z + cz * S;
    const grp = new THREE.Group(); root.add(grp);
    const B = new Batch(grp);
    B.add(T.body, stoneM, x, g, z, 0, cx * 0.7 + cz, 0);
    B.add(T.roof, slateM, x, g, z);
    B.add(T.fin, ironM, x, g, z);
    for (let k = 0; k < 4; k++) {
      const a = Math.atan2(cx, cz) + (k - 1.5) * 0.55;
      B.add(bbox(0.16, 0.9, 0.2, 0.02, 1), slitM, x + Math.sin(a) * 3.0, g + 2.6 + (k % 2) * 1.6, z + Math.cos(a) * 3.0, 0, a, 0);
    }
    B.build();
    P.add({ type: 'cyl', x, z, r: 3.25, top: g + H + 7 });
    addFader(W, grp, x - 3.4, z - 3.4, x + 3.4, z + 3.4, g + H + 7);
  }
  // --- gatehouse with an arched passage
  const gh = new THREE.Group(); root.add(gh);
  {
    const B = new Batch(gh);
    const D = GATE.x1 - GATE.x0, Wd = GATE.half * 2, top = GATE.top;
    const s = new THREE.Shape();
    s.moveTo(-GATE.half, -2.6); s.lineTo(GATE.half, -2.6); s.lineTo(GATE.half, top); s.lineTo(-GATE.half, top); s.lineTo(-GATE.half, -2.6);
    const hole = new THREE.Path(), hw = GATE.w / 2;
    hole.moveTo(-hw, 0); hole.lineTo(hw, 0); hole.lineTo(hw, GATE.h - hw); hole.absarc(0, GATE.h - hw, hw, 0, Math.PI, false); hole.lineTo(-hw, 0);
    s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: false, curveSegments: 16 });
    geo.rotateY(Math.PI / 2);
    boxUV(geo, TILE.fortStone);
    B.add(geo, stoneM, GATE.x0, g, GATE.z);
    // arch voussoirs and a plinth course on the outer face
    const ring = new THREE.Shape();
    ring.absarc(0, GATE.h - hw, hw + 0.42, 0, Math.PI, false); ring.lineTo(-hw, GATE.h - hw); ring.absarc(0, GATE.h - hw, hw, Math.PI, 0, true); ring.lineTo(hw + 0.42, GATE.h - hw);
    const rg = new THREE.ExtrudeGeometry(ring, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: 16 });
    rg.rotateY(-Math.PI / 2); boxUV(rg, 1.4);
    B.add(rg, tm('stone', { color: '#c8ccd4' }), GATE.x0 + 0.02, g, GATE.z);
    for (const sz of [-1, 1]) {
      B.add(bbox(0.5, 0.7, Wd / 2 - hw + 0.1, 0.05, 1), stoneM, GATE.x0 - 0.15, g + 0.25, GATE.z + sz * (hw + (Wd / 2 - hw) / 2 + 0.05));
      B.add(bbox(0.16, 1.0, 0.12, 0.02, 1), slitM, GATE.x0 - 0.01, g + 3.2, GATE.z + sz * (hw + 1.3));
    }
    // corbelled parapet with merlons on three sides
    B.add(bbox(D + 0.5, 0.3, Wd + 0.5, 0.05, 1), stoneM, (GATE.x0 + GATE.x1) / 2, g + top - 0.15, GATE.z);
    const list = [];
    for (let i = 0; i < 5; i++) list.push({ x: GATE.x0 + 0.12, y: g + top, z: GATE.z - GATE.half + 0.6 + i * ((Wd - 1.2) / 4), ry: Math.PI / 2 });
    for (const sz of [-1, 1]) for (let i = 1; i < 3; i++) list.push({ x: GATE.x0 - 0.05 + i * (D / 2.6), y: g + top, z: GATE.z + sz * (GATE.half - 0.18), ry: 0 });
    instances(gh, merlonGeo, stoneM, list);
    // the project's banners on the old gate
    for (const sz of [-1, 1]) {
      const bm = new THREE.MeshStandardMaterial({ map: bannerTex(), roughness: 0.85, side: THREE.DoubleSide });
      const b = mesh(gh, bannerGeo(), bm, GATE.x0 - 0.12, g + top - 0.35, GATE.z + sz * (hw + 1.35), -Math.PI / 2, { cast: false });
      void b;
      B.add(cyl(0.035, 0.035, 1.3, 6).rotateX(Math.PI / 2), tm('brass', { rough: 0.4, metal: 0.7 }), GATE.x0 - 0.14, g + top - 0.3, GATE.z + sz * (hw + 1.35));
    }
    B.build();
  }
  P.add({ type: 'box', x: (GATE.x0 + GATE.x1) / 2, z: GATE.z - GATE.w / 2 - (GATE.half - GATE.w / 2) / 2, hw: (GATE.x1 - GATE.x0) / 2, hd: (GATE.half - GATE.w / 2) / 2, rot: 0, top: g + GATE.top + 0.8 });
  P.add({ type: 'box', x: (GATE.x0 + GATE.x1) / 2, z: GATE.z + GATE.w / 2 + (GATE.half - GATE.w / 2) / 2, hw: (GATE.x1 - GATE.x0) / 2, hd: (GATE.half - GATE.w / 2) / 2, rot: 0, top: g + GATE.top + 0.8 });
  // portcullis: an iron grid in a slot, spiked at the bottom; rises into the gatehouse
  const pc = new THREE.Group(); root.add(pc);
  {
    const gw = GATE.w + 0.3, gh2 = GATE.h + 0.2, parts = [];
    for (let i = 0; i < 9; i++) {
      const z = -gw / 2 + 0.15 + i * ((gw - 0.3) / 8);
      parts.push([bbox(0.1, gh2, 0.1, 0.02, 1), 0, gh2 / 2 + 0.1, z]);
      parts.push([cyl(0.0, 0.07, 0.24, 6), 0, 0.02, z, Math.PI, 0, 0]);
    }
    for (let j = 0; j < 6; j++) parts.push([bbox(0.08, 0.09, gw, 0.02, 1), 0.02, 0.45 + j * 0.72, 0]);
    mesh(pc, compose(parts), ironM, 0, 0, 0);
    pc.position.set(GATE.x0 + 1.15, g, GATE.z);
  }
  const pcCol = P.add({ type: 'box', x: GATE.x0 + 1.15, z: GATE.z, hw: 0.25, hd: GATE.w / 2 + 0.1, rot: 0, top: g + GATE.h + 0.2 });
  addFader(W, gh, GATE.x0 - 0.6, GATE.z - GATE.half - 0.3, GATE.x1 + 0.3, GATE.z + GATE.half + 0.3, g + GATE.top + 0.8);
  const gate = { mesh: pc, c: pcCol, open: false, t: 0, x: GATE.x0 - 1.9, z: GATE.z, y0: g };
  W.gate = gate;
  W.updaters.push((dt) => {
    const want = gate.open ? 1 : 0;
    if (gate.t === want) return;
    gate.t = gate.open ? Math.min(1, gate.t + dt * 0.55) : Math.max(0, gate.t - dt * 0.8);
    pc.position.y = gate.y0 + smoothstep(0, 1, gate.t) * 2.5;
    pcCol.enabled = gate.t < 0.6;
  });
  W.arena = { x: F.x, z: F.z, half: S - 1 };
}

// ------------------------------------------------------------------ project kit
const brassM = () => tm('brass', { rough: 0.38, metal: 0.75 });
const tealM = () => tm('teal', { rough: 0.55, metal: 0.3 });
const darkSteel = () => pm('#3a4048', 0.5, { metalness: 0.55 });
// a flanged pipe run through points [x,y,z]: straight lengths, ball fittings at the bends, flanges
function pipeRun(B, pts, r, { mat = tm('pipe', { rough: 0.5, metal: 0.35 }), flange = brassM(), every = 2.6 } = {}) {
  const fl = cached('flange' + r, () => { const g = cyl(r * 1.42, r * 1.42, 0.09, 14); return g; });
  const bolt = cached('fbolt' + r, () => compose(Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return [cyl(0.025, 0.025, 0.13, 5), Math.cos(a) * r * 1.22, 0, Math.sin(a) * r * 1.22]; })));
  for (let i = 0; i < pts.length - 1; i++) {
    const { m, len, q } = rodMatrix(pts[i], pts[i + 1]);
    B.addM(cyl(r, r, +len.toFixed(2), 14, TILE.pipe), mat, m);
    const n = Math.max(1, Math.round(len / every));
    for (let k = 0; k <= n; k++) {
      if ((k === 0 && i > 0) || (k === n && i < pts.length - 2)) continue; // bends get a fitting instead
      const t2 = k / n;
      const p = new THREE.Vector3(...pts[i]).lerp(new THREE.Vector3(...pts[i + 1]), Math.min(0.985, Math.max(0.015, t2)));
      const fm = new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
      B.addM(fl, flange, fm); B.addM(bolt, darkSteel(), fm);
    }
  }
  for (let i = 1; i < pts.length - 1; i++) {
    B.add(cached('fit' + r, () => new THREE.SphereGeometry(r * 1.22, 14, 10)), mat, ...pts[i]);
  }
}
// riveted tank: concrete plinth, teal shell with brass bands, dome, ladder, gauge, emblem
function dialTex() {
  return cached('dialTex', () => canvasTex(64, 64, (x) => {
    x.fillStyle = '#f4efe0'; x.beginPath(); x.arc(32, 32, 30, 0, 7); x.fill();
    x.strokeStyle = '#3a3020'; x.lineWidth = 2; for (let i = 0; i < 9; i++) { const a = Math.PI * 0.75 + (i / 8) * Math.PI * 1.5; x.beginPath(); x.moveTo(32 + Math.cos(a) * 22, 32 + Math.sin(a) * 22); x.lineTo(32 + Math.cos(a) * 28, 32 + Math.sin(a) * 28); x.stroke(); }
    x.strokeStyle = '#d03020'; x.lineWidth = 5; x.beginPath(); x.arc(32, 32, 25, Math.PI * 0.05, Math.PI * 0.25); x.stroke();
  }));
}
function gauge(B, parent, x, y, z, ry, s = 1) {
  B.add(cached('gaugeBody', () => lathe([[0, 0], [0.16, 0], [0.17, 0.03], [0.17, 0.09], [0.15, 0.1], [0, 0.1]], 16)), brassM(), x, y, z, Math.PI / 2, ry, 0, s);
  const face = mesh(parent, cached('dialq', () => new THREE.CircleGeometry(0.14, 20)), pm('#ffffff', 0.4, { map: dialTex() }), x + Math.sin(ry) * 0.101 * s, y, z + Math.cos(ry) * 0.101 * s, ry, { cast: false });
  face.scale.setScalar(s);
  const needle = mesh(parent, cached('needle', () => bbox(0.02, 0.12, 0.01, 0.004, 1).translate(0, 0.05, 0)), pm('#202020', 0.5), x + Math.sin(ry) * 0.11 * s, y, z + Math.cos(ry) * 0.11 * s, ry, { cast: false });
  needle.scale.setScalar(s); needle.rotation.z = 1.2;
  return needle;
}
function tankGeo(r, h) {
  return cached(`tank${r},${h}`, () => {
    const shell = lathe([[0, 0], [r + 0.02, 0], [r, 0.5], [r, h - 0.5], [r * 0.93, h - 0.22], [r * 0.72, h + 0.02], [r * 0.38, h + 0.2], [0, h + 0.25]], 32, TILE.teal);
    const plinth = lathe([[0, -0.2], [r + 0.42, -0.2], [r + 0.42, 0.18], [r + 0.34, 0.26], [0, 0.26]], 32, TILE.concrete);
    const bands = compose([0.55, h * 0.38, h * 0.7, h - 0.5].map((y) => [new THREE.TorusGeometry(r + 0.025, 0.055, 6, 40).rotateX(Math.PI / 2), 0, y, 0]).concat([[lathe([[0, 0], [0.42, 0], [0.42, 0.1], [0.34, 0.16], [0.3, 0.22], [0, 0.24]], 16), 0, h + 0.18, 0]]));
    const rail = [], rungs = [];
    for (const s of [-0.24, 0.24]) rail.push([cyl(0.03, 0.03, h - 0.2, 6), r + 0.2, 0.3 + (h - 0.2) / 2, s]);
    for (let y = 0.6; y < h; y += 0.32) rungs.push([cyl(0.02, 0.02, 0.48, 5).rotateX(Math.PI / 2), r + 0.2, y, 0]);
    for (const y of [0.8, h - 0.4]) for (const s of [-0.24, 0.24]) rail.push([cyl(0.025, 0.025, 0.22, 5).rotateZ(Math.PI / 2), r + 0.09, y, s]);
    return { shell, plinth, bands, ladder: compose(rail.concat(rungs)) };
  });
}
function tank(W, root, B, x, z, r, h, ry, face, g, vents) {
  const T = tankGeo(r, h);
  B.add(T.plinth, tm('concrete', { color: '#d8d4cc' }), x, g, z);
  B.add(T.shell, tealM(), x, g + 0.26, z, 0, ry, 0);
  B.add(T.bands, brassM(), x, g + 0.26, z, 0, ry, 0);
  B.add(T.ladder, darkSteel(), x, g + 0.26, z, 0, ry, 0);
  // curved emblem decal facing the yard
  const th = 1.3 / r, ea = face;
  const dec = mesh(root, cached('tdec' + r, () => new THREE.CylinderGeometry(r + 0.012, r + 0.012, 1.3, 10, 1, true, -th / 2, th)), emblemMaterial(), x, g + 0.26 + h * 0.55, z, ea, { cast: false });
  void dec;
  W.physics.add({ type: 'cyl', x, z, r: r + 0.42, top: g + h + 0.6 });
  vents.push({ x, y: g + h + 0.55, z });
}
// Zeelich-tech module building: riveted teal walls with real openings, brass
// corner posts and cornice, a brass barrel roof, round windows, a hazard-
// framed sliding door. Door on the local +z face. Returns the group.
function techBuilding(W, root, x, z, ry, { w, d, h, wins = [], picto = null, roofKit = 'vent', key }) {
  const g = W.H(x, z);
  const grp = new THREE.Group(); grp.position.set(x, g, z); grp.rotation.y = ry; root.add(grp);
  const B = new Batch(grp);
  const t = 0.24, base = 0.32;
  const wallM = tm('teal', { rough: 0.6, metal: 0.25, color: '#e8f4f2' }), brass = brassM();
  const conc = tm('concrete', { color: '#cfcac0' });
  B.add(boxUV(bbox(w + 0.36, base, d + 0.36, 0.05, 1), TILE.concrete), conc, 0, base / 2 - 0.02, 0);
  const door = { x: 0, y: 0, w: 1.2, h: 2.25 };
  const holes = { front: [door], back: [], left: [], right: [] };
  for (const o of wins) holes[o.side].push(o);
  const sides = [
    { n: 'front', len: w, pos: [0, base, d / 2 - t], ry: 0 },
    { n: 'back', len: w, pos: [0, base, -d / 2 + t], ry: Math.PI },
    { n: 'left', len: d - 2 * t, pos: [-w / 2 + t, base, 0], ry: -Math.PI / 2 },
    { n: 'right', len: d - 2 * t, pos: [w / 2 - t, base, 0], ry: Math.PI / 2 },
  ];
  const glass = pm('#7fd8e8', 0.12, { metalness: 0.3, emissive: '#3ab8d0', emissiveIntensity: 0.35 });
  for (const sd of sides) {
    const geo = panelGeo(+sd.len.toFixed(3), h, t, holes[sd.n], TILE.teal);
    const m4 = new THREE.Matrix4().compose(new THREE.Vector3(...sd.pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, sd.ry, 0)), new THREE.Vector3(1, 1, 1));
    B.addM(geo, wallM, m4);
    const at = (lx, ly, lz) => new THREE.Vector3(lx, ly, lz).applyMatrix4(m4);
    for (const o of holes[sd.n]) {
      if (o.round) {
        const c = at(o.x, o.y + o.h / 2, t + 0.03);
        B.add(cached('porth' + o.w, () => new THREE.TorusGeometry(o.w / 2 + 0.04, 0.07, 8, 24)), brass, c.x, c.y, c.z, 0, sd.ry, 0);
        const c2 = at(o.x, o.y + o.h / 2, t * 0.4);
        B.add(cached('portg' + o.w, () => new THREE.CircleGeometry(o.w / 2, 20)), glass, c2.x, c2.y, c2.z, 0, sd.ry, 0);
        for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, c3 = at(o.x + Math.cos(a) * (o.w / 2 + 0.04), o.y + o.h / 2 + Math.sin(a) * (o.w / 2 + 0.04), t + 0.09); B.add(cached('rivet', () => new THREE.SphereGeometry(0.03, 6, 4)), brass, c3.x, c3.y, c3.z); }
      } else if (o.win) {
        const c = at(o.x, o.y + o.h / 2, t * 0.4);
        B.add(bbox(o.w, o.h, 0.04, 0.01, 1), glass, c.x, c.y, c.z, 0, sd.ry, 0);
        for (const [fx, fy, fw, fh] of [[0, -o.h / 2 - 0.06, o.w + 0.3, 0.12], [0, o.h / 2 + 0.06, o.w + 0.3, 0.12], [-o.w / 2 - 0.06, 0, 0.12, o.h], [o.w / 2 + 0.06, 0, 0.12, o.h], [0, 0, 0.05, o.h]]) {
          const c4 = at(o.x + fx, o.y + o.h / 2 + fy, t + 0.03);
          B.add(bbox(fw, fh, 0.1, 0.02, 1), brass, c4.x, c4.y, c4.z, 0, sd.ry, 0);
        }
      } else {
        // sliding door (dark teal, brass bands, a porthole) in a hazard-striped frame
        const c = at(o.x, base * 0 + 1.12, t * 0.35);
        B.add(bbox(1.16, 2.22, 0.08, 0.02, TILE.teal), tm('teal', { rough: 0.5, metal: 0.35, color: '#8ab4b4' }), c.x, c.y, c.z, 0, sd.ry, 0);
        for (const yy of [0.35, 1.9]) { const c5 = at(o.x, yy, t * 0.35 + 0.05); B.add(bbox(1.1, 0.07, 0.03, 0.01, 1), brass, c5.x, c5.y, c5.z, 0, sd.ry, 0); }
        const c6 = at(o.x, 1.45, t * 0.35 + 0.05);
        B.add(cached('dporth', () => new THREE.TorusGeometry(0.17, 0.035, 6, 18)), brass, c6.x, c6.y, c6.z, 0, sd.ry, 0);
        B.add(cached('dportg', () => new THREE.CircleGeometry(0.16, 16)), glass, c6.x, c6.y, c6.z - 0.01 * 0, 0, sd.ry, 0);
        const haz = tm('hazard', { rough: 0.6 });
        for (const [fx, fy, fw, fh] of [[-0.68, 1.15, 0.16, 2.42], [0.68, 1.15, 0.16, 2.42], [0, 2.38, 1.52, 0.16]]) {
          const c7 = at(o.x + fx, fy, t + 0.04);
          B.add(boxUV(bbox(fw, fh, 0.1, 0.02, 1), TILE.hazard), haz, c7.x, c7.y, c7.z, 0, sd.ry, 0);
        }
        // canopy and emblem over the door, a step
        const c8 = at(o.x, 2.72, t + 0.35);
        B.add(cached('canopy', () => { const s = new THREE.Shape(); s.moveTo(-0.95, 0); s.quadraticCurveTo(0, 0.5, 0.95, 0); s.lineTo(0.95, -0.08); s.quadraticCurveTo(0, 0.42, -0.95, -0.08); s.lineTo(-0.95, 0); const gg = new THREE.ExtrudeGeometry(s, { depth: 0.75, bevelEnabled: false }); gg.translate(0, 0, -0.375); return boxUV(gg, TILE.brass); }), brass, c8.x, c8.y, c8.z, 0, sd.ry, 0);
        const c9 = at(o.x, -base + 0.1, t + 0.45);
        B.add(boxUV(bbox(1.7, 0.2, 0.7, 0.04, 1), TILE.deck), tm('deck', { rough: 0.6, metal: 0.3 }), c9.x, c9.y, c9.z, 0, sd.ry, 0);
        if (picto) {
          const cp = at(o.x + 1.02, 1.55, t + 0.04);
          B.add(bbox(0.5, 0.5, 0.04, 0.02, 1), brass, cp.x, cp.y, cp.z, 0, sd.ry, 0);
          const pq = mesh(grp, cached('pictq', () => new THREE.PlaneGeometry(0.42, 0.42)), pm('#ffffff', 0.6, { map: picto }), cp.x + Math.sin(sd.ry) * 0.025, cp.y, cp.z + Math.cos(sd.ry) * 0.025, sd.ry, { cast: false });
          void pq;
        }
      }
    }
  }
  // brass corner posts, base band and cornice
  for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) B.add(bbox(0.36, h + 0.1, 0.36, 0.06, 1), brass, cx * (w / 2 - 0.05), base + h / 2, cz * (d / 2 - 0.05));
  for (const sz of [-1, 1]) { B.add(boxUV(bbox(w + 0.34, 0.28, 0.32, 0.05, 1), TILE.brass), brass, 0, base + h, sz * (d / 2)); B.add(boxUV(bbox(w + 0.04, 0.2, 0.3, 0.04, 1), TILE.teal), tm('teal', { color: '#80a8a8', rough: 0.6 }), 0, base + 0.1, sz * (d / 2 + 0.02)); }
  for (const sx of [-1, 1]) { B.add(boxUV(bbox(0.32, 0.28, d + 0.34, 0.05, 1), TILE.brass), brass, sx * (w / 2), base + h, 0); B.add(boxUV(bbox(0.3, 0.2, d, 0.04, 1), TILE.teal), tm('teal', { color: '#80a8a8', rough: 0.6 }), sx * (w / 2 + 0.02), base + 0.1, 0); }
  // barrel roof along x with closed ends
  const rise = 0.75, a = w / 2 + 0.35;
  const roof = cached(`broof${w},${d}`, () => {
    const s = new THREE.Shape();
    s.moveTo(-a, 0); s.quadraticCurveTo(0, 2 * rise, a, 0); s.lineTo(a, -0.16); s.quadraticCurveTo(0, 2 * rise - 0.16, -a, -0.16); s.lineTo(-a, 0);
    const gg = new THREE.ExtrudeGeometry(s, { depth: d + 0.7, bevelEnabled: false, curveSegments: 16 });
    gg.translate(0, 0, -(d + 0.7) / 2);
    return boxUV(gg, TILE.brass);
  });
  B.add(roof, tm('brass', { rough: 0.45, metal: 0.6, color: '#d8c8a8' }), 0, base + h + 0.12, 0);
  const endG = cached(`broofE${w}`, () => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.quadraticCurveTo(0, 2 * (rise - 0.1), w / 2, 0); s.lineTo(-w / 2, 0); const gg = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 16 }); gg.translate(0, 0, -d / 2); return boxUV(gg, TILE.teal); });
  B.add(endG, wallM, 0, base + h + 0.1, 0);
  const em = mesh(grp, cached('emq', () => new THREE.PlaneGeometry(1, 1)), emblemMaterial(), 0, base + h + 0.12 + rise * 0.42, d / 2 + 0.012, 0, { cast: false });
  em.scale.setScalar(0.56);
  // seam ribs over the roof
  for (let k = -2; k <= 2; k++) B.add(cached(`rib${w}`, () => { const pts = []; for (let i = 0; i <= 12; i++) { const u = -1 + i / 6; pts.push([u * a, (1 - u * u) * rise + 0.02, 0]); } return tube(pts, 0.04, 6, 1); }), brass, 0, base + h + 0.12, k * (d + 0.5) / 5);
  // roof kit
  const ry0 = base + h + 0.12 + rise;
  if (roofKit === 'vent') {
    B.add(boxUV(bbox(1.0, 0.5, 0.9, 0.06, 1), TILE.teal), tealM(), -w * 0.22, ry0 - 0.05, 0);
    B.add(cached('fanring', () => new THREE.TorusGeometry(0.34, 0.05, 6, 20).rotateX(Math.PI / 2)), brass, -w * 0.22, ry0 + 0.22, 0);
    B.add(cyl(0.02, 0.02, 1.6, 5, 1), darkSteel(), w * 0.3, ry0 + 0.6, 0.2);
    B.add(cached('antball', () => new THREE.SphereGeometry(0.07, 8, 6)), glowCyan(), w * 0.3, ry0 + 1.42, 0.2);
  } else {
    // dish antenna on a tripod and a beacon cupola
    const dish = cached('dish', () => lathe([[0, 0], [0.3, 0.02], [0.6, 0.12], [0.75, 0.24], [0.73, 0.26], [0.58, 0.15], [0.29, 0.06], [0, 0.04]], 20));
    B.add(dish, tm('concrete', { color: '#f0eee8', rough: 0.5 }), w * 0.22, ry0 + 0.75, 0, -0.7, 0.6, 0);
    B.add(cyl(0.05, 0.07, 0.8, 8, 1), darkSteel(), w * 0.22, ry0 + 0.3, 0);
    B.add(cyl(0.02, 0.02, 0.5, 5, 1), brass, w * 0.22 + 0.15, ry0 + 0.95, 0.12, -0.7, 0.6, 0);
    B.add(lathe([[0, 0], [0.42, 0], [0.42, 0.2], [0.34, 0.24], [0.34, 0.6], [0.4, 0.62], [0.3, 0.82], [0.08, 0.9], [0, 0.92]], 16), brass, -w * 0.25, ry0 - 0.1, 0);
    B.add(cached('beacon', () => new THREE.SphereGeometry(0.22, 14, 10)), glowCyan(), -w * 0.25, ry0 + 0.32, 0);
  }
  B.build();
  W.physics.add({ type: 'box', x, z, hw: w / 2 + 0.2, hd: d / 2 + 0.2, rot: ry, top: g + base + h + 1.0 });
  const f = frame(x, z, ry);
  const [dx, dz] = f(0, d / 2 + 1.0);
  addFader(W, grp, Math.min(x - w / 2, x - d / 2) - 0.4, Math.min(z - d / 2, z - w / 2) - 0.4, Math.max(x + w / 2, x + d / 2) + 0.4, Math.max(z + d / 2, z + w / 2) + 0.4, g + base + h + 1.2);
  void key;
  return { grp, door: { x: dx, z: dz } };
}
function pictoTex(kind) {
  return cached('picto' + kind, () => canvasTex(64, 64, (x) => {
    x.fillStyle = '#16403f'; x.fillRect(0, 0, 64, 64);
    x.fillStyle = '#bff8ff'; x.strokeStyle = '#bff8ff'; x.lineWidth = 3;
    if (kind === 'office') { x.fillRect(16, 12, 26, 34); x.fillStyle = '#16403f'; for (let i = 0; i < 4; i++) x.fillRect(20, 18 + i * 7, 18, 2.5); x.fillStyle = '#bff8ff'; x.fillRect(22, 18, 26, 34); x.fillStyle = '#16403f'; for (let i = 0; i < 4; i++) x.fillRect(26, 24 + i * 7, 18, 2.5); }
    else { x.beginPath(); x.arc(32, 36, 20, Math.PI, 0); x.stroke(); x.beginPath(); x.moveTo(32, 36); x.lineTo(46, 22); x.stroke(); x.beginPath(); x.arc(32, 36, 4, 0, 7); x.fill(); x.fillRect(10, 44, 44, 6); }
  }));
}

// glow textures for the shaft and the transit beam
function radialTex(stops) {
  return cached('radial' + stops.join(), () => canvasTex(128, 128, (x) => {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(([k, c]) => g.addColorStop(k, c));
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  }));
}
function beamTex() {
  return cached('beamTex', () => {
    const t = canvasTex(64, 256, (x, w, h) => {
      const g = x.createLinearGradient(0, h, 0, 0);
      g.addColorStop(0, 'rgba(220,255,255,1)'); g.addColorStop(0.25, 'rgba(120,240,255,0.7)'); g.addColorStop(1, 'rgba(60,200,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(0,0,0,${0.15 + Math.random() * 0.3})`; x.fillRect(Math.random() * w, 0, 2 + Math.random() * 6, h); }
    });
    t.wrapS = THREE.RepeatWrapping;
    return t;
  });
}
// Otringal's horned ring arch, sculpted as one smooth piece (ring in the YZ plane)
function archGeo() {
  return cached('arch', () => {
    const Rc = 1.75, tr = 0.27, cy = 1.62;
    const prims = [];
    const N = 22;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
      prims.push({ type: 'cone', a: [0, cy + Math.sin(a0) * Rc, Math.cos(a0) * Rc], b: [0, cy + Math.sin(a1) * Rc, Math.cos(a1) * Rc], r1: tr, r2: tr, mat: 'r', group: 'ring' });
    }
    for (const s of [-1, 1]) {
      const p0 = [0, cy + Math.sin(0.95) * Rc, s * Math.cos(0.95) * Rc];
      const chain = [p0, [0, cy + 2.05, s * 1.62], [0, cy + 2.75, s * 2.02], [0, cy + 3.4, s * 2.0], [0, cy + 3.85, s * 1.62]];
      const rr = [0.33, 0.27, 0.19, 0.11, 0.035];
      for (let k = 0; k < chain.length - 1; k++) prims.push({ type: 'cone', a: chain[k], b: chain[k + 1], r1: rr[k], r2: rr[k + 1], mat: k > 2 ? 't' : 'h', group: 'horn' + s, sz: 0.85 });
      // feet clasping the ring
      prims.push({ type: 'box', c: [0, 0.32, s * 1.32], h: [0.42, 0.34, 0.5], round: 0.12, mat: 'f', group: 'foot' + s });
      prims.push({ type: 'cone', a: [0, 0.5, s * 1.25], b: [0, cy + Math.sin(-0.75) * Rc, s * Math.cos(-0.75) * Rc], r1: 0.3, r2: 0.22, mat: 'f', group: 'foot' + s });
    }
    return sculptRigid({ key: 'arch', prims, groups: { ring: 0.05, horn1: 0.12, 'horn-1': 0.12, foot1: 0.1, 'foot-1': 0.1 }, joinK: 0.14,
      colors: { r: '#2f8c8a', h: '#2a8280', t: '#1f6664', f: '#c89a48' },
      paint: (p, m, c) => { c.offsetHSL(0, 0, Math.sin(p.y * 7 + p.z * 5) * 0.025 + (m === 'r' ? Math.max(0, p.x) * 0.15 : 0)); },
      bounds: { min: [-0.5, -0.05, -2.45], max: [0.5, cy + 4.0, 2.45] }, cell: 0.055 });
  });
}

function buildStation(W0, root, r) {
  const g = W0.H(STATION.x, STATION.z);
  buildFortress(W0, root, g);
  // (design coordinates from here on: see siteW)
  const d = SHIFT.station, W = siteW(W0, d), F = STATION0;
  const P = W.physics;
  const grp = new THREE.Group(); grp.name = 'station'; grp.position.set(d.x, 0, d.z); root.add(grp);
  const B = new Batch(grp);
  const vents = [];
  const anim = { drill: null, block: null, needles: [], pistons: [], fans: [] };
  const haz = tm('hazard', { rough: 0.6 }), deck = tm('deck', { rough: 0.6, metal: 0.3 });
  const conc = tm('concrete', { color: '#d8d4cc' });

  // --- the bore: concrete pad, deck plates with hazard borders, the shaft collar, the derrick
  const BX = 51.5, BZ = 31.0;
  {
    B.add(boxUV(bbox(9.6, 0.26, 9.6, 0.06, 1), TILE.concrete), conc, BX, g + 0.11, BZ);
    B.add(boxUV(bbox(8.8, 0.06, 8.8, 0.02, 1), TILE.deck), deck, BX, g + 0.26, BZ);
    for (const s of [-1, 1]) {
      B.add(boxUV(bbox(8.8, 0.07, 0.32, 0.02, 1), TILE.hazard), haz, BX, g + 0.27, BZ + s * 4.25);
      B.add(boxUV(bbox(0.32, 0.07, 8.2, 0.02, 1), TILE.hazard), haz, BX + s * 4.25, g + 0.27, BZ);
    }
    P.add({ type: 'box', x: BX, z: BZ, hw: 4.8, hd: 4.8, rot: 0, top: g + 0.29, seeThrough: true });
    // shaft collar: teal steel ring with a brass lip and bolted flange
    const collar = lathe([[2.0, 0.0], [2.0, 1.05], [2.12, 1.16], [2.62, 1.16], [2.66, 1.06], [2.62, 0.4], [2.82, 0.3], [2.82, 0.0]], 40, TILE.teal);
    B.add(collar, tealM(), BX, g + 0.28, BZ);
    B.add(cached('lip', () => new THREE.TorusGeometry(2.38, 0.07, 6, 48).rotateX(Math.PI / 2)), brassM(), BX, g + 0.28 + 1.17, BZ);
    const bolts = [];
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; bolts.push({ x: BX + Math.cos(a) * 2.72, y: g + 0.28 + 0.34, z: BZ + Math.sin(a) * 2.72 }); }
    instances(grp, cached('hexbolt', () => cyl(0.06, 0.06, 0.1, 6)), darkSteel(), bolts, { cast: false });
    // inside: dark walls glowing from below, the cyan core
    const inner = new THREE.CylinderGeometry(1.98, 1.98, 1.06, 32, 4, true);
    { const c = [], p = inner.attributes.position; for (let i = 0; i < p.count; i++) { const k = (p.getY(i) + 0.53) / 1.06; const col = new THREE.Color('#5ff0ff').lerp(new THREE.Color('#0c1a20'), Math.pow(k, 0.6)); c.push(col.r, col.g, col.b); } inner.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); }
    mesh(grp, inner, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }), BX, g + 0.28 + 0.53, BZ, 0, { cast: false });
    const coreMat = new THREE.MeshBasicMaterial({ map: radialTex([[0, '#ffffff'], [0.18, '#c8ffff'], [0.45, '#2ad8f0'], [0.8, '#0a4a5a'], [1, '#081820']]), toneMapped: false });
    const core = mesh(grp, new THREE.CircleGeometry(1.99, 40).rotateX(-Math.PI / 2), coreMat, BX, g + 0.3, BZ, 0, { cast: false });
    core.receiveShadow = false;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex([[0, 'rgba(160,250,255,0.9)'], [0.4, 'rgba(60,210,255,0.35)'], [1, 'rgba(0,120,200,0)']]), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    halo.position.set(BX, g + 1.4, BZ); halo.scale.set(5.5, 3.2, 1); grp.add(halo);
    const coreLight = new THREE.PointLight('#5ae8ff', 6, 12, 2); coreLight.position.set(BX, g + 1.2, BZ); grp.add(coreLight);
    anim.core = { coreMat, halo, coreLight };
    // cross beams carrying the rotary table
    for (const ry of [0, Math.PI / 2]) B.add(boxUV(bbox(5.4, 0.22, 0.3, 0.03, 1), TILE.teal), tealM(), BX, g + 0.28 + 1.27, BZ, 0, ry, 0);
    B.add(lathe([[0, 0], [0.75, 0], [0.78, 0.06], [0.78, 0.18], [0.6, 0.24], [0.2, 0.26], [0, 0.26]], 24), brassM(), BX, g + 0.28 + 1.36, BZ);
    P.add({ type: 'cyl', x: BX, z: BZ, r: 2.85, top: g + 0.28 + 1.4 });
    // derrick: four brass legs tapering to the crown, teal girts and X braces
    const y0 = g + 0.29, Ht = 11.5, b0 = 2.85, b1 = 0.72;
    const hwAt = (y) => b0 + (b1 - b0) * (y / Ht);
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [cx, cz] of corners) member(B, [BX + cx * b0, y0, BZ + cz * b0], [BX + cx * b1, y0 + Ht, BZ + cz * b1], 0.24, brassM(), 1.2);
    const lv = [0.15, 2.6, 5.0, 7.3, 9.5, 11.3];
    for (let i = 0; i < lv.length; i++) {
      const y = lv[i], hw = hwAt(y);
      for (let k = 0; k < 4; k++) {
        const [ax, az] = corners[k], [bx, bz] = corners[(k + 1) % 4];
        member(B, [BX + ax * hw, y0 + y, BZ + az * hw], [BX + bx * hw, y0 + y, BZ + bz * hw], i === 0 ? 0.2 : 0.14, tealM(), 1.2);
        if (i < lv.length - 1) {
          const y2 = lv[i + 1], hw2 = hwAt(y2);
          member(B, [BX + ax * hw, y0 + y, BZ + az * hw], [BX + bx * hw2, y0 + y2, BZ + bz * hw2], 0.09, tealM(), 1.2);
          member(B, [BX + bx * hw, y0 + y, BZ + bz * hw], [BX + ax * hw2, y0 + y2, BZ + az * hw2], 0.09, tealM(), 1.2);
        }
      }
    }
    // feet plates, a hazard-striped band at the working platform, the crown block
    for (const [cx, cz] of corners) {
      B.add(boxUV(bbox(0.7, 0.14, 0.7, 0.03, 1), TILE.brass), brassM(), BX + cx * b0, y0 + 0.07, BZ + cz * b0);
      P.add({ type: 'cyl', x: BX + cx * b0, z: BZ + cz * b0, r: 0.4, top: g + Ht, seeThrough: true });
    }
    const wy = 5.0, whw = hwAt(wy) + 0.35;
    for (const s of [-1, 1]) {
      B.add(boxUV(bbox(whw * 2, 0.08, 0.7, 0.02, 1), TILE.deck), deck, BX, y0 + wy + 0.12, BZ + s * (whw - 0.35));
      B.add(boxUV(bbox(0.7, 0.08, whw * 2 - 1.4, 0.02, 1), TILE.deck), deck, BX + s * (whw - 0.35), y0 + wy + 0.12, BZ);
      B.add(boxUV(bbox(whw * 2 + 0.06, 0.16, 0.06, 0.02, 1), TILE.hazard), haz, BX, y0 + wy + 0.1, BZ + s * whw);
      B.add(boxUV(bbox(0.06, 0.16, whw * 2, 0.02, 1), TILE.hazard), haz, BX + s * whw, y0 + wy + 0.1, BZ);
      for (const yy of [0.55, 1.05]) { B.add(cyl(0.03, 0.03, whw * 2, 6).rotateZ(Math.PI / 2), brassM(), BX, y0 + wy + 0.15 + yy, BZ + s * whw); B.add(cyl(0.03, 0.03, whw * 2, 6).rotateX(Math.PI / 2), brassM(), BX + s * whw, y0 + wy + 0.15 + yy, BZ); }
    }
    B.add(boxUV(bbox(2.1, 0.75, 2.1, 0.1, 1), TILE.teal), tealM(), BX, y0 + Ht + 0.3, BZ);
    B.add(boxUV(bbox(2.3, 0.14, 2.3, 0.05, 1), TILE.brass), brassM(), BX, y0 + Ht + 0.72, BZ);
    for (const s of [-0.35, 0.35]) B.add(cached('sheave', () => new THREE.TorusGeometry(0.42, 0.09, 8, 22)), brassM(), BX + s, y0 + Ht + 1.05, BZ);
    B.add(cyl(0.025, 0.025, 2.2, 5, 1), darkSteel(), BX + 0.7, y0 + Ht + 1.8, BZ + 0.7);
    B.add(cached('antball', () => new THREE.SphereGeometry(0.07, 8, 6)), glowCyan(), BX + 0.7, y0 + Ht + 2.9, BZ + 0.7);
    B.add(cached('beacon', () => new THREE.SphereGeometry(0.22, 14, 10)), glowCyan(), BX, y0 + Ht + 0.95, BZ, 0, 0, 0, 0.7);
    for (const s of [-1, 1]) { const e = mesh(grp, cached('emq', () => new THREE.PlaneGeometry(1, 1)), emblemMaterial(), BX, y0 + Ht + 0.3, BZ + s * 1.06, s > 0 ? 0 : Math.PI, { cast: false }); e.scale.setScalar(0.66); }
    // drill string, travelling block on its cables
    const drill = new THREE.Group(); drill.position.set(BX, 0, BZ); grp.add(drill);
    mesh(drill, cyl(0.13, 0.13, Ht - 1.6, 10, 1), tm('brass', { rough: 0.3, metal: 0.8, color: '#e0d0b0' }), 0, y0 + 0.6 + (Ht - 1.6) / 2, 0);
    mesh(drill, bbox(0.42, 0.9, 0.42, 0.05, 1), tealM(), 0, y0 + 2.6, 0);
    for (let k = 0; k < 3; k++) mesh(drill, cyl(0.2, 0.2, 0.12, 12), brassM(), 0, y0 + 1.7 + k * 2.6, 0);
    anim.drill = drill;
    const block = new THREE.Group(); block.position.set(BX, y0 + 8.4, BZ); grp.add(block);
    mesh(block, bbox(0.75, 1.0, 0.5, 0.1, 1), tm('teal', { color: '#f0c040', rough: 0.5 }), 0, 0, 0);
    mesh(block, boxUV(bbox(0.78, 0.22, 0.53, 0.04, 1), TILE.hazard), haz, 0, -0.42, 0);
    for (const s of [-0.25, 0.25]) mesh(block, cyl(0.02, 0.02, 2.6, 4), darkSteel(), s, 1.8, 0);
    anim.block = block;
  }

  // --- tanks along the north wall, pipes to the bore and across the gate lane to the pump
  tank(W, grp, B, 40.2, 27.9, 2.0, 5.0, Math.PI * 0.5, Math.PI * 0.8, g, vents);
  tank(W, grp, B, 44.6, 27.0, 1.45, 3.7, Math.PI * 0.62, Math.PI * 0.95, g, vents);
  anim.needles.push(gauge(B, grp, 42.18, g + 1.7, 28.4, Math.PI / 2));
  pipeRun(B, [[42.1, g + 0.75, 27.5], [43.3, g + 0.75, 27.5]], 0.22);
  pipeRun(B, [[46.0, g + 0.75, 27.0], [47.4, g + 0.75, 27.0], [47.4, g + 0.75, 29.6], [49.1, g + 0.75, 29.6]], 0.22);
  for (const [x, z] of [[47.4, 28.2]]) { B.add(boxUV(bbox(0.5, 0.55, 0.5, 0.04, 1), TILE.concrete), conc, x, g + 0.27, z); }
  P.add({ type: 'box', x: 47.4, z: 28.3, hw: 0.4, hd: 1.4, rot: 0, top: g + 1.0, noStand: true, seeThrough: true });
  // the big main: up from tank 1, over the gate lane on a trestle bridge, down to the pump
  const yB = g + 4.3;
  const MX = 39.4;
  pipeRun(B, [[MX, g + 1.0, 29.6], [MX, yB, 29.6], [MX, yB, 41.4], [MX, g + 0.85, 41.4], [MX, g + 0.85, 43.7], [38.75, g + 0.85, 43.7]], 0.26);
  for (const z of [32.6, 39.6]) {
    for (const s of [-1, 1]) member(B, [MX + s * 1.1, g, z], [MX + s * 0.2, yB - 0.3, z], 0.18, tealM(), 1.2);
    B.add(boxUV(bbox(2.0, 0.18, 0.3, 0.03, 1), TILE.teal), tealM(), MX, yB - 0.32, z);
    B.add(cached('saddle', () => new THREE.TorusGeometry(0.29, 0.05, 6, 16, Math.PI).rotateZ(Math.PI)), brassM(), MX, yB, z, 0, 0, 0);
    for (const s of [-1, 1]) { B.add(boxUV(bbox(0.5, 0.12, 0.5, 0.02, 1), TILE.brass), brassM(), MX + s * 1.1, g + 0.06, z); P.add({ type: 'cyl', x: MX + s * 1.05, z, r: 0.22, top: yB, seeThrough: true }); }
  }
  // a project sign hung under the bridge over the lane
  {
    B.add(boxUV(bbox(0.12, 1.1, 2.6, 0.03, 1), TILE.brass), brassM(), MX, yB - 1.0, 36.0);
    for (const s of [-1, 1]) B.add(cyl(0.02, 0.02, 0.55, 5, 1), darkSteel(), MX, yB - 0.42, 36.0 + s * 1.1);
    for (const s of [-1, 1]) { const e = mesh(grp, cached('emq', () => new THREE.PlaneGeometry(1, 1)), emblemMaterial(), MX + s * 0.07, yB - 1.0, 36.0, s > 0 ? Math.PI / 2 : -Math.PI / 2, { cast: false }); e.scale.setScalar(0.9); }
  }
  P.add({ type: 'cyl', x: MX, z: 29.6, r: 0.4, top: yB, seeThrough: true });
  P.add({ type: 'box', x: MX, z: 42.5, hw: 0.35, hd: 1.3, rot: 0, top: g + 1.2, noStand: true, seeThrough: true });
  // pump: concrete bed, pump casing, ribbed motor, flywheel; the main leaves through the west wall
  {
    const PX = 38.0, PZ = 43.9;
    B.add(boxUV(bbox(2.6, 0.3, 2.2, 0.05, 1), TILE.concrete), conc, PX, g + 0.13, PZ);
    B.add(lathe([[0, -0.55], [0.5, -0.55], [0.58, -0.4], [0.58, 0.4], [0.5, 0.55], [0, 0.55]], 20, TILE.teal).rotateZ(Math.PI / 2), tealM(), PX + 0.2, g + 0.85, PZ - 0.2);
    const motor = cached('motor', () => { const pts = [[0, -0.45]]; for (let i = 0; i <= 12; i++) pts.push([i % 2 ? 0.4 : 0.44, -0.45 + i * 0.075]); pts.push([0, 0.45]); return lathe(pts, 18).rotateX(Math.PI / 2); });
    B.add(motor, brassM(), PX + 0.2, g + 0.85, PZ + 0.75);
    const fly = mesh(grp, cached('flywheel', () => compose([[new THREE.TorusGeometry(0.42, 0.07, 8, 24)], ...[0, 1, 2].map((k) => [bbox(0.84, 0.06, 0.05, 0.01, 1), 0, 0, 0, 0, 0, (k * Math.PI) / 3]), [cyl(0.1, 0.1, 0.12, 10).rotateX(Math.PI / 2)]])), darkSteel(), PX + 0.2, g + 0.85, PZ + 1.32);
    anim.fans.push(fly);
    anim.needles.push(gauge(B, grp, PX - 0.45, g + 1.45, PZ - 0.2, -Math.PI / 2, 1.2));
    pipeRun(B, [[PX - 0.35, g + 0.85, PZ - 0.2], [PX - 1.0, g + 0.85, PZ - 0.2], [PX - 1.0, g + 2.9, PZ - 0.2], [33.4, g + 2.9, PZ - 0.2]], 0.26);
    P.add({ type: 'box', x: PX, z: PZ, hw: 1.35, hd: 1.15, rot: 0, top: g + 1.6, noStand: true, seeThrough: true });
    vents.push({ x: PX + 0.2, y: g + 1.5, z: PZ - 0.2, small: true });
  }

  // --- office and control buildings, doors facing the yard (north)
  const office = techBuilding(W, grp, 43.2, 45.5, Math.PI, { w: 6.2, d: 4.4, h: 3.0, picto: pictoTex('office'), roofKit: 'vent',
    wins: [{ side: 'front', x: -1.9, y: 1.0, w: 0.85, h: 0.85, round: true }, { side: 'front', x: 1.9, y: 1.0, w: 0.85, h: 0.85, round: true }, { side: 'left', x: 0, y: 1.0, w: 0.85, h: 0.85, round: true }, { side: 'right', x: 0, y: 1.0, w: 0.85, h: 0.85, round: true }, { side: 'back', x: -1.5, y: 1.0, w: 0.85, h: 0.85, round: true }, { side: 'back', x: 1.5, y: 1.0, w: 0.85, h: 0.85, round: true }] });
  const control = techBuilding(W, grp, 50.3, 45.6, Math.PI, { w: 5.0, d: 4.2, h: 3.0, picto: pictoTex('control'), roofKit: 'dish',
    wins: [{ side: 'front', x: -1.6, y: 1.0, w: 0.75, h: 1.0, win: true }, { side: 'front', x: 1.75, y: 1.0, w: 0.75, h: 1.0, win: true }, { side: 'right', x: 0, y: 1.0, w: 0.8, h: 0.8, round: true }, { side: 'left', x: 0, y: 1.0, w: 0.8, h: 0.8, round: true }] });

  // --- transit beam pad: stepped round platform, hazard ring, emitter, the horned arch, the light column
  const BP = { x: 56.4, z: 40.4 };
  const padTop = g + 0.48;
  {
    const plat = boxUV(lathe([[0, 0.48], [2.35, 0.48], [2.45, 0.44], [2.55, 0.26], [3.0, 0.26], [3.08, 0.2], [3.12, 0.0], [0, 0.0]], 48), TILE.deck);
    B.add(plat, deck, BP.x, g, BP.z);
    B.add(cached('padring', () => { const gg = new THREE.RingGeometry(1.95, 2.3, 48, 1); gg.rotateX(-Math.PI / 2); return boxUV(gg, 0.9); }), haz, BP.x, padTop + 0.005, BP.z);
    B.add(cached('padedge', () => new THREE.TorusGeometry(2.42, 0.07, 6, 48).rotateX(Math.PI / 2)), brassM(), BP.x, padTop - 0.03, BP.z);
    B.add(cached('emitRing', () => new THREE.TorusGeometry(1.0, 0.09, 8, 36).rotateX(Math.PI / 2)), brassM(), BP.x, padTop + 0.02, BP.z);
    const emit = new THREE.MeshBasicMaterial({ map: radialTex([[0, '#ffffff'], [0.3, '#bff8ff'], [0.75, '#2ac8e8'], [1, '#0a5060']]), toneMapped: false });
    mesh(grp, new THREE.CircleGeometry(0.98, 32).rotateX(-Math.PI / 2), emit, BP.x, padTop + 0.012, BP.z, 0, { cast: false });
    P.add({ type: 'cyl', x: BP.x, z: BP.z, r: 2.5, top: padTop, seeThrough: true });
    P.add({ type: 'cyl', x: BP.x, z: BP.z, r: 3.1, top: g + 0.26, seeThrough: true });
    // the arch stands across the pad: its ring faces west, toward the gate
    const arch = mesh(grp, archGeo(), VC(), BP.x, padTop - 0.12, BP.z, 0);
    void arch;
    B.add(cached('archInner', () => new THREE.TorusGeometry(1.48, 0.06, 8, 48).rotateY(Math.PI / 2)), tm('brass', { rough: 0.3, metal: 0.8, color: '#d06040' }), BP.x, padTop - 0.12 + 1.62, BP.z);
    for (const s of [-1, 1]) P.add({ type: 'cyl', x: BP.x, z: BP.z + s * 1.5, r: 0.5, top: padTop + 5, seeThrough: true });
    // light column
    const colM = new THREE.MeshBasicMaterial({ map: beamTex(), color: '#9ff4ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
    const col1 = mesh(grp, new THREE.CylinderGeometry(1.15, 1.25, 26, 28, 1, true).translate(0, 13, 0), colM, BP.x, padTop, BP.z, 0, { cast: false });
    const colM2 = colM.clone(); colM2.color.set('#ffffff');
    const col2 = mesh(grp, new THREE.CylinderGeometry(0.45, 0.55, 26, 18, 1, true).translate(0, 13, 0), colM2, BP.x, padTop, BP.z, 0, { cast: false });
    col1.visible = col2.visible = false;
    const beamLight = new THREE.PointLight('#7af0ff', 0, 14, 2); beamLight.position.set(BP.x, padTop + 1.5, BP.z); grp.add(beamLight);
    anim.beam = { colM, colM2, col1, col2, beamLight, emit, k: 0, on: false };
  }

  // --- floodlight masts, crates, barrels, deck walkway from the gate
  for (const [x, z] of [[58.2, 25.8], [37.6, 47.0]]) {
    B.add(lathe([[0, 0], [0.42, 0], [0.42, 0.12], [0.16, 0.2], [0.11, 7.0], [0.16, 7.1], [0, 7.15]], 12, TILE.teal), tealM(), x, g, z);
    B.add(boxUV(bbox(1.8, 0.12, 0.16, 0.03, 1), TILE.brass), brassM(), x, g + 7.0, z, 0, Math.atan2(48 - x, 36 - z) + Math.PI / 2, 0);
    for (const s of [-0.65, 0.65]) {
      const a = Math.atan2(48 - x, 36 - z);
      const lx = x + Math.cos(a) * s, lz = z - Math.sin(a) * s;
      B.add(cached('flood', () => lathe([[0, 0], [0.2, 0], [0.3, 0.3], [0.3, 0.36], [0, 0.36]], 14).rotateX(Math.PI / 2 + 0.5)), darkSteel(), lx, g + 7.25, lz, 0, a, 0);
      B.add(cached('floodL', () => new THREE.CircleGeometry(0.27, 16).translate(0, 0, 0.37).rotateX(0.5)), pm('#fffbe8', 0.3, { emissive: '#fff4c8', emissiveIntensity: 2.0 }), lx, g + 7.25, lz, 0, a, 0);
    }
    P.add({ type: 'cyl', x, z, r: 0.42, top: g + 7, seeThrough: true });
  }
  crateStack(W, grp, [[58.3, 31.4, 2], [58.6, 32.6, 1], [57.2, 32.2, 1, 0.8]], r);
  techCrates(W, grp, [[57.8, 34.6, 2, 0.95], [58.4, 36.0, 1, 0.95]], r);
  barrels(W, grp, [[36.9, 41.0], [37.6, 41.4], [37.1, 40.1, false]], r);
  // walkway plates from the gate passage to the pad
  for (let x = 38.0; x < 53.4; x += 1.6) B.add(boxUV(bbox(1.55, 0.05, 2.2, 0.02, 1), TILE.deck), deck, x + 0.8, g + 0.025, 36.0 + (x > 47 ? (x - 47) * 0.62 : 0), 0, x > 47 ? -0.55 : 0, 0);
  B.build();

  // --- machinery animation and steam (setActive), the beam (setBeam)
  const steam = steamSystem(grp, 48);
  let active = false, emitT = 0;
  const st = {
    x: F.x, z: F.z,
    office: { door: office.door }, control: { door: control.door },
    beamPad: { x: BP.x, y: padTop, z: BP.z }, bore: { x: BX, z: BZ },
    active: false, beam: false,
    setActive(on) { active = !!on; st.active = active; },
    setBeam(on) { anim.beam.on = !!on; st.beam = !!on; if (on) { anim.beam.col1.visible = anim.beam.col2.visible = true; } },
  };
  movePt(d, st, st.office.door, st.control.door, st.beamPad, st.bore);
  W.station = st;
  W.updaters.push((dt, t) => {
    steam.update(dt);
    const run = active ? 1 : 0.15;
    anim.drill.rotation.y += dt * (active ? 2.6 : 0.0);
    anim.block.position.y = g + 0.29 + 8.4 + (active ? Math.sin(t * 0.6) * 0.5 : 0);
    for (const f of anim.fans) f.rotation.z += dt * (active ? 5 : 0);
    anim.needles.forEach((n, i) => { n.rotation.z = (active ? -0.4 : 1.1) + Math.sin(t * (2 + i) + i) * (active ? 0.12 : 0.02); });
    const pulse = 0.8 + Math.sin(t * (active ? 3.2 : 1.1)) * 0.2;
    anim.core.coreLight.intensity = (active ? 9 : 4) * pulse;
    anim.core.halo.material.opacity = (active ? 0.95 : 0.55) * pulse;
    if (active) {
      emitT -= dt;
      if (emitT <= 0) {
        emitT = 0.12;
        const v = vents[Math.floor(Math.random() * vents.length)];
        steam.emit(v.x, v.y, v.z, { size: v.small ? 0.5 : 0.9, vy: 1.6, life: 1.8 });
        if (Math.random() < 0.5) steam.emit(BX + (Math.random() - 0.5) * 2.4, g + 1.6, BZ + (Math.random() - 0.5) * 2.4, { size: 1.1, vy: 1.1, life: 2.2 });
      }
    }
    // the transit beam fades in and out
    const B2 = anim.beam;
    B2.k += ((B2.on ? 1 : 0) - B2.k) * (1 - Math.exp(-dt * 3));
    const flick = 0.9 + Math.sin(t * 23) * 0.05 + Math.sin(t * 7.1) * 0.05;
    B2.colM.opacity = B2.k * 0.55 * flick; B2.colM2.opacity = B2.k * 0.8 * flick;
    B2.colM.map.offset.x = t * 0.15;
    B2.beamLight.intensity = B2.k * 18;
    if (B2.k < 0.01 && !B2.on) B2.col1.visible = B2.col2.visible = false;
    void run;
  });
  // a lamp-light over the yard so the station reads at dusk

}

// ================================================================== the project depot (the old camp)
// A fenced yard: chain-link panels on teal posts with two wide open gates,
// containers, crate stacks, a handcart, floodlight masts, Funfrock's old
// chest, the depot bypass valve and the drones' patrol loop.
function chainMat() {
  return cached('chainMat', () => {
    const map = textures().chain.clone(); map.needsUpdate = true; map.wrapS = map.wrapT = THREE.RepeatWrapping;
    const m = new THREE.MeshStandardMaterial({ map, color: '#c8d0d4', roughness: 0.5, metalness: 0.5, alphaTest: 0.35, side: THREE.DoubleSide });
    return m;
  });
}
function chainGeo(len, h) {
  return cached(`chain${len.toFixed(2)},${h}`, () => { const g = new THREE.PlaneGeometry(len, h); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 0.32, uv.getY(i) * h / 0.32); return g; });
}
// fence from a to b on posts (every ~2.6 m), top + bottom rail, chain-link panels
function meshFence(W, root, B, a, b, h = 2.2) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.round(len / 2.6));
  const ry = Math.atan2(b[0] - a[0], b[1] - a[1]) - Math.PI / 2;
  const post = cached('fpost' + h, () => compose([[cyl(0.06, 0.06, h + 0.1, 8, 1), 0, (h + 0.1) / 2, 0], [cyl(0.09, 0.09, 0.08, 8), 0, h + 0.12, 0], [cyl(0.16, 0.2, 0.25, 8), 0, 0.05, 0]]));
  for (let i = 0; i <= n; i++) {
    const x = a[0] + (b[0] - a[0]) * (i / n), z = a[1] + (b[1] - a[1]) * (i / n);
    B.add(post, tealM(), x, W.H(x, z) - 0.08, z);
  }
  for (let i = 0; i < n; i++) {
    const x0 = a[0] + (b[0] - a[0]) * (i / n), z0 = a[1] + (b[1] - a[1]) * (i / n);
    const x1 = a[0] + (b[0] - a[0]) * ((i + 1) / n), z1 = a[1] + (b[1] - a[1]) * ((i + 1) / n);
    const xm = (x0 + x1) / 2, zm = (z0 + z1) / 2, y = (W.H(x0, z0) + W.H(x1, z1)) / 2;
    const sl = len / n;
    B.add(chainGeo(sl - 0.1, h - 0.15), chainMat(), xm, y + 0.08 + (h - 0.15) / 2, zm, 0, ry, 0);
    for (const yy of [0.08, h]) B.add(cyl(0.035, 0.035, sl, 6, 1).rotateZ(Math.PI / 2), darkSteel(), xm, y + yy, zm, 0, ry, 0);
  }
  W.physics.add({ type: 'box', x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, hw: len / 2, hd: 0.12, rot: ry, top: W.H(a[0], a[1]) + h + 0.1, seeThrough: true, noStand: true });
}
// an open gate leaf (frame + mesh) hinged at `hinge`, swung to angle ry
function gateLeaf(W, root, B, hinge, ry, len, h = 2.1) {
  const [x, z] = hinge, y = W.H(x, z);
  const f = frame(x, z, ry);
  const pts = [[0, 0.1], [len, 0.1], [len, h], [0, h]];
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % 4];
    const [wx0, wz0] = f(ax, 0), [wx1, wz1] = f(bx, 0);
    member(B, [wx0, y + ay, wz0], [wx1, y + by, wz1], 0.07, tealM(), 1, 0.015);
  }
  const [dx0, dz0] = f(0, 0), [dx1, dz1] = f(len, 0);
  member(B, [dx0, y + 0.1, dz0], [dx1, y + h, dz1], 0.05, tealM(), 1, 0.01);
  const [mx, mz] = f(len / 2, 0);
  B.add(chainGeo(len - 0.12, h - 0.15), chainMat(), mx, y + 0.1 + (h - 0.1) / 2, mz, 0, ry, 0);
  B.add(cyl(0.1, 0.1, h + 0.3, 8, 1), darkSteel(), x, y + (h + 0.3) / 2, z);
  // a yellow-black stripe plate on the leaf
  const [px, pz] = f(len * 0.5, 0.05);
  B.add(boxUV(bbox(len * 0.6, 0.18, 0.03, 0.01, 1), TILE.hazard), tm('hazard', { rough: 0.6 }), px, y + 1.1, pz, 0, ry, 0);
  W.physics.add({ type: 'box', x: mx, z: mz, hw: len / 2, hd: 0.1, rot: ry, top: y + h, seeThrough: true, noStand: true });
}
// steel shipping container: frame, corrugated sides (ribs), doors with locking bars
function containerGeo() {
  return cached('container', () => {
    const L = 6.0, Wd = 2.44, Hh = 2.6;
    const body = [], frameP = [], ribs = [];
    body.push([boxUV(bbox(L - 0.2, Hh - 0.24, Wd - 0.12, 0.02, 1), 2.6), 0, Hh / 2, 0]);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      frameP.push([bbox(0.16, Hh, 0.16, 0.02, 1), sx * (L / 2 - 0.08), Hh / 2, sz * (Wd / 2 - 0.08)]);
      frameP.push([bbox(0.2, 0.16, 0.2, 0.02, 1), sx * (L / 2 - 0.09), 0.08, sz * (Wd / 2 - 0.09)]);
      frameP.push([bbox(0.2, 0.16, 0.2, 0.02, 1), sx * (L / 2 - 0.09), Hh - 0.08, sz * (Wd / 2 - 0.09)]);
    }
    for (const s of [-1, 1]) for (const y of [0.1, Hh - 0.1]) frameP.push([bbox(L - 0.3, 0.14, 0.1, 0.02, 1), 0, y, s * (Wd / 2 - 0.05)]);
    for (const s of [-1, 1]) for (const y of [0.1, Hh - 0.1]) frameP.push([bbox(0.1, 0.14, Wd - 0.3, 0.02, 1), s * (L / 2 - 0.05), y, 0]);
    for (let x = -L / 2 + 0.3; x < L / 2 - 0.25; x += 0.27) for (const s of [-1, 1]) ribs.push([boxUV(bbox(0.13, Hh - 0.38, 0.06, 0.015, 1), 2.6), x, Hh / 2, s * (Wd / 2 - 0.04)]);
    for (let z = -Wd / 2 + 0.3; z < Wd / 2 - 0.2; z += 0.27) ribs.push([boxUV(bbox(0.06, Hh - 0.38, 0.13, 0.015, 1), 2.6), -L / 2 + 0.04, Hh / 2, z]);
    // doors on +x: two leaves with locking bars and handles
    const door = [];
    for (const s of [-1, 1]) door.push([boxUV(bbox(0.06, Hh - 0.36, Wd / 2 - 0.16, 0.015, 1), 2.6), L / 2 - 0.02, Hh / 2, s * (Wd / 4 - 0.02)]);
    for (const zz of [-0.85, -0.35, 0.35, 0.85]) {
      door.push([cyl(0.025, 0.025, Hh - 0.3, 6), L / 2 + 0.05, Hh / 2, zz]);
      door.push([bbox(0.05, 0.05, 0.22, 0.01, 1), L / 2 + 0.08, 1.1, zz + 0.1]);
    }
    return { body: compose(body.concat(ribs, door)), frame: compose(frameP) };
  });
}
function container(W, root, B, x, z, ry, color) {
  const C = containerGeo(), y = W.H(x, z);
  B.add(C.body, tm('metal', { color, rough: 0.6, metal: 0.25 }), x, y, z, 0, ry, 0);
  B.add(C.frame, tm('metal', { color: new THREE.Color(color).multiplyScalar(0.7).getStyle(), rough: 0.55, metal: 0.3 }), x, y, z, 0, ry, 0);
  const f = frame(x, z, ry);
  for (const s of [-1, 1]) { const [ex, ez] = f(0.4, s * 1.245); const e = mesh(root, cached('emq', () => new THREE.PlaneGeometry(1, 1)), emblemMaterial(), ex, y + 1.4, ez, ry + (s > 0 ? 0 : Math.PI), { cast: false }); e.scale.setScalar(1.1); }
  W.physics.add({ type: 'box', x, z, hw: 3.05, hd: 1.25, rot: ry, top: y + 2.6 });
}
// two-wheeled handcart loaded with crates
function handcart(W, root, B, x, z, ry, r) {
  const y = W.H(x, z), f = frame(x, z, ry);
  const wood = tm('wood', { color: '#b08458' });
  const at = (lx, ly, lz) => { const [wx, wz] = f(lx, lz); return [wx, y + ly, wz]; };
  B.add(boxUV(bbox(1.9, 0.08, 1.15, 0.02, 1), TILE.planks), tm('planks', { color: '#e0c8a8' }), ...at(0, 0.62, 0), 0, ry, 0);
  for (const s of [-1, 1]) {
    B.add(boxUV(bbox(1.9, 0.3, 0.06, 0.02, 1), TILE.wood), wood, ...at(0, 0.8, s * 0.58), 0, ry, 0);
    member(B, at(0.95, 0.66, s * 0.45), at(2.1, 0.92, s * 0.32), 0.07, wood, 1, 0.015);
    const wheel = cached('cartwheel', () => compose([[new THREE.TorusGeometry(0.42, 0.05, 6, 22)], ...[0, 1, 2, 3].map((k) => [bbox(0.84, 0.04, 0.04, 0.01, 1), 0, 0, 0, 0, 0, (k * Math.PI) / 4]), [cyl(0.07, 0.07, 0.14, 8).rotateX(Math.PI / 2)]]));
    B.add(wheel, darkSteel(), ...at(-0.2, 0.44, s * 0.66), 0, ry, 0);
  }
  member(B, at(-0.2, 0.44, -0.7), at(-0.2, 0.44, 0.7), 0.06, darkSteel(), 1, 0.01);
  B.add(bbox(0.06, 0.6, 0.06, 0.01, 1), wood, ...at(0.85, 0.32, 0), 0, ry, 0);
  const [cx, cz] = f(-0.1, 0.0);
  const C = crateGeo(), [ma, mb] = crateMats();
  const items = [{ x: cx, y: y + 0.66, z: cz, ry: ry + 0.1, s: 0.7 }, { x: f(0.55, 0.15)[0], y: y + 0.66, z: f(0.55, 0.15)[1], ry: ry - 0.2, s: 0.55 }, { x: f(-0.05, 0.05)[0], y: y + 1.36, z: f(-0.05, 0.05)[1], ry: ry + 0.35, s: 0.5 }];
  instances(root, C.planks, ma, items); instances(root, C.frame, mb, items);
  W.physics.add({ type: 'box', x, z, hw: 1.2, hd: 0.75, rot: ry, top: y + 1.4, seeThrough: true, noStand: true });
}
function floodMast(W, B, x, z, ax, az, h = 7) {
  const g = W.H(x, z), a = Math.atan2(ax - x, az - z);
  B.add(lathe([[0, 0], [0.42, 0], [0.42, 0.12], [0.16, 0.2], [0.11, h], [0.16, h + 0.1], [0, h + 0.15]], 12, TILE.teal), tealM(), x, g, z);
  B.add(boxUV(bbox(1.8, 0.12, 0.16, 0.03, 1), TILE.brass), brassM(), x, g + h, z, 0, a + Math.PI / 2, 0);
  for (const s of [-0.65, 0.65]) {
    const lx = x + Math.cos(a) * s, lz = z - Math.sin(a) * s;
    B.add(cached('flood', () => lathe([[0, 0], [0.2, 0], [0.3, 0.3], [0.3, 0.36], [0, 0.36]], 14).rotateX(Math.PI / 2 + 0.5)), darkSteel(), lx, g + h + 0.25, lz, 0, a, 0);
    B.add(cached('floodL', () => new THREE.CircleGeometry(0.27, 16).translate(0, 0, 0.37).rotateX(0.5)), pm('#fffbe8', 0.3, { emissive: '#fff4c8', emissiveIntensity: 2.0 }), lx, g + h + 0.25, lz, 0, a, 0);
  }
  W.physics.add({ type: 'cyl', x, z, r: 0.42, top: g + h, seeThrough: true });
}

// Funfrock's old strongbox: dark planks, iron bands and corner irons, a domed lid
function chestGeo() {
  return cached('chest', () => {
    const wood = [], iron = [];
    wood.push([boxUV(bbox(1.24, 0.66, 0.76, 0.04, 1), 0.9), 0, 0.37, 0]);
    for (const x of [-0.42, 0, 0.42]) iron.push([bbox(0.08, 0.7, 0.8, 0.012, 1), x, 0.37, 0]);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) iron.push([bbox(0.16, 0.7, 0.16, 0.02, 1), sx * 0.58, 0.37, sz * 0.34]);
    iron.push([bbox(1.3, 0.06, 0.82, 0.015, 1), 0, 0.06, 0]);
    iron.push([bbox(0.24, 0.26, 0.05, 0.02, 1), 0, 0.56, 0.4]);
    iron.push([cyl(0.04, 0.04, 0.03, 8).rotateX(Math.PI / 2), 0, 0.52, 0.43]);
    for (const s of [-1, 1]) iron.push([new THREE.TorusGeometry(0.09, 0.022, 6, 12, Math.PI).rotateZ(Math.PI).rotateY(Math.PI / 2), s * 0.66, 0.5, 0]);
    // domed lid, built in pivot space (hinge at the back top edge)
    const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.8, 0); s.quadraticCurveTo(0.82, 0.3, 0.4, 0.34); s.quadraticCurveTo(-0.02, 0.3, 0, 0);
    const lidW = extrude(s, 1.24, 0.9); lidW.rotateY(-Math.PI / 2); lidW.translate(0.62, 0, -0.02); boxUV(lidW, 0.9);
    const lidI = [];
    for (const x of [-0.42, 0, 0.42]) { const sb = new THREE.Shape(); sb.moveTo(-0.02, -0.02); sb.lineTo(0.83, -0.02); sb.quadraticCurveTo(0.85, 0.33, 0.4, 0.37); sb.quadraticCurveTo(-0.05, 0.33, -0.02, -0.02); const gb = extrude(sb, 0.08); gb.rotateY(-Math.PI / 2); gb.translate(x + 0.04, 0, -0.02); lidI.push([gb]); }
    return { wood: compose(wood), iron: compose(iron), lidWood: lidW, lidIron: compose(lidI) };
  });
}

function buildDepot(W0, root, r) {
  // (design coordinates: see siteW)
  const d = SHIFT.depot, W = siteW(W0, d), D = DEPOT0, P = W.physics;
  const grp = new THREE.Group(); grp.name = 'depot'; grp.position.set(d.x, 0, d.z); root.add(grp);
  const B = new Batch(grp);
  // fence with two wide open gates where the path runs through
  meshFence(W, grp, B, [D.x0, D.z0], [D.x1, D.z0]);
  meshFence(W, grp, B, [D.x0, D.z1], [D.x1, D.z1]);
  meshFence(W, grp, B, [D.x0, D.gateW[1]], [D.x0, D.z1]);
  meshFence(W, grp, B, [D.x1, D.z0], [D.x1, D.gateE[0]]);
  meshFence(W, grp, B, [D.x1, D.gateE[1]], [D.x1, D.z1]);
  gateLeaf(W, grp, B, [D.x0, D.gateW[0]], Math.PI - 0.3, 2.0);
  gateLeaf(W, grp, B, [D.x0, D.gateW[1]], -Math.PI + 0.3, 2.0);
  gateLeaf(W, grp, B, [D.x1, D.gateE[0]], 0.3, 1.75);
  gateLeaf(W, grp, B, [D.x1, D.gateE[1]], -0.3, 1.75);
  // containers, crates, cart, masts
  container(W, grp, B, 14.6, 58.2, 0, '#c8503a');
  container(W, grp, B, 1.8, 55.4, Math.PI / 2, '#3a8a86');
  crateStack(W, grp, [[17.6, 53.6, 2], [17.5, 54.8, 1], [17.9, 52.6, 1, 0.8], [11.0, 45.2, 1, 0.9], [12.0, 45.0, 2, 0.8]], r);
  techCrates(W, grp, [[6.0, 58.6, 2, 0.95], [7.2, 58.9, 1, 0.95], [17.6, 56.0, 1, 0.9]], r);
  barrels(W, grp, [[8.4, 44.8], [9.2, 44.7], [8.7, 45.8, true]], r);
  handcart(W, grp, B, 6.4, 45.7, 0.2, r);
  floodMast(W, B, -0.4, 59.4, 9, 52);
  floodMast(W, B, 18.4, 44.6, 9, 52);
  // Funfrock's chest, half-buried among the project crates
  {
    const K = { x: 9, z: 57 }, kg = W.H(K.x, K.z);
    const chest = new THREE.Group(); chest.position.set(K.x, kg, K.z); chest.rotation.y = Math.PI; grp.add(chest);
    const C = chestGeo();
    const darkWood = tm('planks', { color: '#9a7a62' }), iron = pm('#30333a', 0.45, { metalness: 0.6 });
    mesh(chest, C.wood, darkWood); mesh(chest, C.iron, iron);
    const lidPivot = new THREE.Group(); lidPivot.position.set(0, 0.7, -0.4); chest.add(lidPivot);
    mesh(lidPivot, C.lidWood, darkWood); mesh(lidPivot, C.lidIron, iron);
    // Funfrock's red emblem on the lock plate
    const em = mesh(chest, cached('ffq', () => new THREE.CircleGeometry(0.07, 12)), pm('#a02020', 0.5, { emissive: '#400000' }), 0, 0.58, 0.43, 0, { cast: false });
    void em;
    P.add({ type: 'box', x: K.x, z: K.z, hw: 0.7, hd: 0.45, rot: 0, top: kg + 1.0, noStand: true, seeThrough: true });
    W.chest = { ...sh('depot', K.x, K.z), lidPivot, open: false, openT: 0 };
    W.updaters.push((dt) => { if (W.chest.open) { W.chest.openT = Math.min(1, W.chest.openT + dt * 2); lidPivot.rotation.x = -W.chest.openT * 1.9; } });
  }
  // the drones' patrol loop (walkable, clear of every prop by > 1 m)
  W.depot = { ...sh('depot', (D.x0 + D.x1) / 2, (D.z0 + D.z1) / 2), patrol: [[4.0, 48.6], [8.6, 48.0], [13.0, 48.6], [13.0, 55.2], [8.6, 55.6], [4.0, 55.2]].map(([x, z]) => [x + d.x, z + d.z]), valve: { ...DEPOT_VALVE } };
  B.build();
}

// ================================================================== the water main and the three bypass valves
// Funfrock's old pipeline, refitted by the project: riveted teal sections
// with brass flanges on A-frame trestles (high enough to walk under), from
// the station's west wall past the depot and the old orchard to the edge of
// town, where it dives into a concrete portal with a flow meter. A branch
// leaves the station's north wall for the reservoir on the Whispering Cliffs.
function chaikin(P, n = 2) {
  let pts = P.map((p) => p.slice());
  for (let k = 0; k < n; k++) {
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      out.push([ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25], [ax * 0.25 + bx * 0.75, az * 0.25 + bz * 0.75]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}
// sample a plan route every ds and lift it clear of the ground
function pipeProfile(W, route, { clear = 2.75, y0 = null, fix = [], ds = 0.5 } = {}) {
  const P = chaikin(route, 2);
  const xs = [], zs = [];
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, az] = P[i], [bx, bz] = P[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / ds));
    for (let k = 0; k < n; k++) { xs.push(ax + (bx - ax) * (k / n)); zs.push(az + (bz - az) * (k / n)); }
  }
  xs.push(P[P.length - 1][0]); zs.push(P[P.length - 1][1]);
  const n = xs.length, gr = xs.map((x, i) => W.H(x, zs[i]));
  const R = 6;
  let y = gr.map((_, i) => { let m = -1e9; for (let k = Math.max(0, i - R); k <= Math.min(n - 1, i + R); k++) m = Math.max(m, gr[k]); return m + clear; });
  for (let pass = 0; pass < 4; pass++) {
    y = y.map((_, i) => { let s = 0, c = 0; for (let k = Math.max(0, i - 5); k <= Math.min(n - 1, i + 5); k++) { s += y[k]; c++; } return s / c; });
    y = y.map((v, i) => Math.max(v, gr[i] + clear - 0.3));
  }
  // pinned heights (where the main meets a wall or a valve)
  for (const f of fix) {
    let bi = 0, bd = 1e9;
    for (let i = 0; i < n; i++) { const d = Math.hypot(xs[i] - f.x, zs[i] - f.z); if (d < bd) { bd = d; bi = i; } }
    const span = f.span ?? 8;
    for (let i = 0; i < n; i++) { const d = Math.abs(i - bi) * ds; if (d < span) y[i] = lerp(y[i], f.y, smoothstep(span, span * 0.35, d)); }
  }
  if (y0 != null) for (let i = 0; i < n; i++) { const d = i * ds; if (d < 6) y[i] = lerp(y0, y[i], smoothstep(0, 6, d)); }
  return { xs, zs, y, gr, n, ds };
}
function supportGeo() {
  return cached('psupport', () => ({ pad: boxUV(bbox(0.5, 0.18, 0.5, 0.04, 1), TILE.concrete) }));
}
// draw a profile as a pipe: tube, flanges, trestles; returns sampled points
function drawPipe(W, B, prof, { r = 0.3, every = 3.2, supEvery = 4.6, avoid = () => false, from = 0, to = null } = {}) {
  const { xs, zs, y, gr, ds } = prof;
  const i1 = to ?? prof.n - 1;
  const pts = [];
  for (let i = from; i <= i1; i += 2) pts.push([xs[i], y[i], zs[i]]);
  if ((i1 - from) % 2) pts.push([xs[i1], y[i1], zs[i1]]);
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'centripetal');
  const len = curve.getLength();
  const tg = new THREE.TubeGeometry(curve, Math.ceil(len * 1.6), r, 14, false);
  const uv = tg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * len) / TILE.pipe, (uv.getY(i) * Math.PI * 2 * r) / TILE.pipe);
  B.add(tg, tm('pipe', { rough: 0.5, metal: 0.35 }), 0, 0, 0);
  const fl = cached('flange' + r, () => cyl(r * 1.42, r * 1.42, 0.09, 14));
  const bolt = cached('fbolt' + r, () => compose(Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return [cyl(0.025, 0.025, 0.13, 5), Math.cos(a) * r * 1.22, 0, Math.sin(a) * r * 1.22]; })));
  const q = new THREE.Quaternion();
  for (let s = every * 0.5; s < len - 0.5; s += every) {
    const u = s / len, p = curve.getPointAt(u), t = curve.getTangentAt(u);
    q.setFromUnitVectors(_uy, t);
    const m = new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1));
    B.addM(fl, brassM(), m); B.addM(bolt, darkSteel(), m);
  }
  // A-frame trestles
  let last = -1e9;
  for (let i = from + 4; i <= i1 - 4; i++) {
    const s = (i - from) * ds;
    if (s - last < supEvery) continue;
    const x = xs[i], z = zs[i];
    if (avoid(x, z)) continue;
    last = s;
    const tx = xs[Math.min(i1, i + 1)] - xs[i - 1], tz = zs[Math.min(i1, i + 1)] - zs[i - 1], tl = Math.hypot(tx, tz) || 1;
    const nx = -tz / tl, nz = tx / tl, py = y[i] - r - 0.04;
    const ga = W.H(x + nx * 0.95, z + nz * 0.95), gb = W.H(x - nx * 0.95, z - nz * 0.95);
    member(B, [x + nx * 0.95, ga - 0.1, z + nz * 0.95], [x + nx * 0.22, py, z + nz * 0.22], 0.16, tealM(), 1.2, 0.03);
    member(B, [x - nx * 0.95, gb - 0.1, z - nz * 0.95], [x - nx * 0.22, py, z - nz * 0.22], 0.16, tealM(), 1.2, 0.03);
    member(B, [x + nx * 0.62, (ga + py) * 0.45, z + nz * 0.62], [x - nx * 0.62, (gb + py) * 0.45, z - nz * 0.62], 0.1, tealM(), 1.2, 0.02);
    member(B, [x + nx * 0.45, py - 0.06, z + nz * 0.45], [x - nx * 0.45, py - 0.06, z - nz * 0.45], 0.14, brassM(), 1, 0.02);
    B.add(cached('saddle' + r, () => new THREE.TorusGeometry(r + 0.03, 0.045, 6, 16, Math.PI).rotateZ(Math.PI)), brassM(), x, py + r + 0.04, z, 0, Math.atan2(tx, tz) + Math.PI / 2, 0);
    const pad = supportGeo().pad;
    B.add(pad, tm('concrete', { color: '#d0ccc4' }), x + nx * 0.95, ga - 0.02, z + nz * 0.95);
    B.add(pad, tm('concrete', { color: '#d0ccc4' }), x - nx * 0.95, gb - 0.02, z - nz * 0.95);
    for (const sgn of [-1, 1]) W.physics.add({ type: 'cyl', x: x + sgn * nx * 0.9, z: z + sgn * nz * 0.9, r: 0.24, top: py, seeThrough: true });
  }
  return { curve, pts };
}
// index of the profile sample nearest to (x,z)
function nearestSample(prof, x, z) { let bi = 0, bd = 1e9; for (let i = 0; i < prof.n; i++) { const d = Math.hypot(prof.xs[i] - x, prof.zs[i] - z); if (d < bd) { bd = d; bi = i; } } return bi; }

// ------------------------------------------------------------------ valve
// globe valve body with flanges (axis = local Y), a bonnet and a stem, a big
// red hand-wheel on the stem; a little lamp turns from red to cyan when open
function valveParts() {
  return cached('valveParts', () => ({
    body: lathe([[0, -0.5], [0.3, -0.5], [0.3, -0.41], [0.2, -0.39], [0.22, -0.3], [0.36, -0.14], [0.38, 0], [0.36, 0.14], [0.22, 0.3], [0.2, 0.39], [0.3, 0.41], [0.3, 0.5], [0, 0.5]], 22),
    bolts: compose([-0.455, 0.455].flatMap((yy) => Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return [cyl(0.028, 0.028, 0.14, 6), Math.cos(a) * 0.25, yy, Math.sin(a) * 0.25]; }))),
    bonnet: lathe([[0, 0], [0.2, 0], [0.2, 0.06], [0.13, 0.1], [0.12, 0.34], [0.16, 0.36], [0.16, 0.42], [0.06, 0.46], [0, 0.46]], 16),
    stem: cyl(0.035, 0.035, 1, 8),
    wheel: compose([[new THREE.TorusGeometry(0.44, 0.05, 8, 30).rotateX(Math.PI / 2)], ...[0, 1, 2, 3, 4].map((k) => [bbox(0.86, 0.045, 0.06, 0.012, 1), 0, 0, 0, 0, (k * Math.PI) / 5, 0]), [cyl(0.09, 0.09, 0.12, 12)]]),
    grip: compose(Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return [new THREE.SphereGeometry(0.06, 8, 6).scale(1, 1.3, 1), Math.cos(a) * 0.44, 0, Math.sin(a) * 0.44]; })),
  }));
}
// body at `b` with the pipe along `axis`; stem from the body along `dir` (unit) for `stem` m
function makeValve(W, root, B, id, kind, b, axis, dir, stem = 0.65) {
  const V = valveParts();
  const qa = new THREE.Quaternion().setFromUnitVectors(_uy, new THREE.Vector3(...axis).normalize());
  const mb = new THREE.Matrix4().compose(new THREE.Vector3(...b), qa, new THREE.Vector3(1, 1, 1));
  const bodyM = tm('metal', { color: '#5a6a74', rough: 0.5, metal: 0.5 });
  B.addM(V.body, bodyM, mb); B.addM(V.bolts, darkSteel(), mb);
  const qd = new THREE.Quaternion().setFromUnitVectors(_uy, new THREE.Vector3(...dir).normalize());
  const vg = new THREE.Group(); vg.position.set(...b); vg.quaternion.copy(qd); root.add(vg);
  mesh(vg, V.bonnet, bodyM, 0, 0.3, 0);
  mesh(vg, V.stem, brassM(), 0, 0.3 + stem / 2, 0).scale.y = stem;
  const pivot = new THREE.Group(); pivot.position.y = 0.3 + stem; vg.add(pivot);
  mesh(pivot, V.wheel, pm('#c8382a', 0.5, { metalness: 0.3 }));
  mesh(pivot, V.grip, pm('#2a2a2a', 0.7));
  const lampM = pm('#ff4a3a', 0.4, { emissive: '#ff2a1a', emissiveIntensity: 1.6 }).clone();
  mesh(vg, cached('vlamp', () => new THREE.SphereGeometry(0.075, 12, 8)), lampM, 0.24, 0.46, 0, { cast: false });
  mesh(vg, cached('vlampc', () => cyl(0.05, 0.06, 0.08, 10)), darkSteel(), 0.24, 0.39, 0);
  const wc = new THREE.Vector3(0, 0.3 + stem, 0).applyQuaternion(qd).add(new THREE.Vector3(...b));
  const v = {
    id, kind, x: wc.x, y: wc.y, z: wc.z, open: false, spin: 0,
    setOpen(instant = false) {
      if (v.opened) return;
      v.opened = true; v.open = true;
      lampM.color.set('#7af0ff'); lampM.emissive.set('#20c8ff');
      if (instant) { pivot.rotation.y = -Math.PI * 4; return; }
      v.spin = 1.1;
    },
  };
  v.body = { x: b[0], y: b[1], z: b[2] };
  v.pivot = pivot;
  return v;
}

// ------------------------------------------------------------------ the iron cage in the old orchard
function cage(W, root, B, cx, cz, half, gateSide = 'E') {
  const y = W.H(cx, cz), h = 2.45;
  const iron = pm('#2c2f34', 0.45, { metalness: 0.6 });
  const bar = cached('cagebar', () => compose([[cyl(0.022, 0.022, h - 0.05, 6), 0, (h - 0.05) / 2, 0], [cyl(0.0, 0.05, 0.16, 6), 0, h + 0.03, 0]]));
  const sides = [[[-half, -half], [half, -half]], [[half, -half], [half, half]], [[half, half], [-half, half]], [[-half, half], [-half, -half]]];
  const bars = [];
  sides.forEach(([a, b2], si) => {
    const L = Math.hypot(b2[0] - a[0], b2[1] - a[1]), n = Math.round(L / 0.15);
    for (let i = 0; i < n; i++) { const k = (i + 0.5) / n; bars.push({ x: cx + a[0] + (b2[0] - a[0]) * k, y: y - 0.05, z: cz + a[1] + (b2[1] - a[1]) * k }); }
    const ry = Math.atan2(b2[0] - a[0], b2[1] - a[1]) - Math.PI / 2, mx = cx + (a[0] + b2[0]) / 2, mz = cz + (a[1] + b2[1]) / 2;
    for (const yy of [0.18, 1.3, h - 0.12]) B.add(bbox(L, 0.06, 0.07, 0.012, 1), iron, mx, y + yy, mz, 0, ry, 0);
    B.add(boxUV(bbox(L + 0.3, 0.3, 0.32, 0.04, 1), TILE.stone), tm('stone', { color: '#d0ccc4' }), mx, y + 0.1, mz, 0, ry, 0);
    W.physics.add({ type: 'box', x: mx, z: mz, hw: L / 2 + 0.1, hd: 0.14, rot: ry, top: y + 2.42, seeThrough: true, noStand: true });
    void si;
  });
  instances(root, bar, iron, bars);
  for (const [px, pz] of [[-half, -half], [half, -half], [half, half], [-half, half]]) {
    B.add(boxUV(bbox(0.22, h + 0.25, 0.22, 0.03, 1), TILE.stone), tm('stone', { color: '#d8d4cc' }), cx + px, y + (h + 0.25) / 2, cz + pz);
    B.add(cached('postcap', () => lathe([[0, 0], [0.17, 0], [0.17, 0.06], [0.1, 0.12], [0.06, 0.2], [0, 0.24]], 8)), tm('stone', { color: '#d8d4cc' }), cx + px, y + h + 0.25, cz + pz);
  }
  // padlocked gate (chain + lock) on one side
  const gx = gateSide === 'E' ? cx + half + 0.05 : cx, gz = cz;
  B.add(cached('chainlink', () => compose(Array.from({ length: 7 }, (_, i) => [new THREE.TorusGeometry(0.035, 0.012, 5, 8), 0, -i * 0.055, 0, 0, (i % 2) * Math.PI / 2, 0]))), pm('#8a8a90', 0.4, { metalness: 0.7 }), gx, y + 1.42, gz);
  B.add(bbox(0.1, 0.13, 0.05, 0.015, 1), pm('#c8a040', 0.35, { metalness: 0.8 }), gx + 0.02, y + 1.0, gz);
  B.add(new THREE.TorusGeometry(0.035, 0.012, 5, 10, Math.PI).rotateY(Math.PI / 2), pm('#9a9aa0', 0.4, { metalness: 0.7 }), gx + 0.02, y + 1.07, gz);
}

// ------------------------------------------------------------------ the water meter where the main dives
function waterTex() {
  return cached('waterTex', () => {
    const t = canvasTex(64, 128, (x, w, h) => {
      x.fillStyle = '#2a7ac8'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) { x.fillStyle = `rgba(${200 + Math.random() * 55},${230 + Math.random() * 25},255,${0.25 + Math.random() * 0.4})`; const y = Math.random() * h; x.beginPath(); x.ellipse(Math.random() * w, y, 2 + Math.random() * 10, 1 + Math.random() * 3, 0, 0, 7); x.fill(); }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
}
function buildMeter(W, root, B, x, z, ry, yIn) {
  const g = W.H(x, z), f = frame(x, z, ry);
  const conc = tm('concrete', { color: '#d8d4cc' });
  // concrete portal block the main dives into, with a brass coping
  B.add(boxUV(bbox(2.2, 1.6, 2.0, 0.08, 1), TILE.concrete), conc, x, g + 0.7, z, 0, ry, 0);
  B.add(boxUV(bbox(2.4, 0.16, 2.2, 0.05, 1), TILE.brass), brassM(), x, g + 1.55, z, 0, ry, 0);
  B.add(boxUV(bbox(1.7, 0.08, 1.5, 0.03, 1), TILE.deck), tm('deck', { rough: 0.6, metal: 0.3 }), x, g + 1.66, z, 0, ry, 0);
  // the flow meter: a big dial and a glass sight tube in a brass frame, facing +z (local)
  const [mx, mz] = f(0, 1.02);
  const dial = mesh(root, cached('bigdial', () => new THREE.CircleGeometry(0.34, 28)), pm('#ffffff', 0.4, { map: dialTex() }), mx, g + 0.95, mz, ry, { cast: false });
  void dial;
  B.add(cached('dialring', () => new THREE.TorusGeometry(0.36, 0.05, 8, 28)), brassM(), mx, g + 0.95, mz, 0, ry, 0);
  const needle = mesh(root, cached('bigneedle', () => bbox(0.035, 0.3, 0.012, 0.005, 1).translate(0, 0.12, 0)), pm('#1a1a1a', 0.5), mx + Math.sin(ry) * 0.012, g + 0.95, mz + Math.cos(ry) * 0.012, ry, { cast: false });
  const [sx, sz] = f(0.78, 1.04);
  const glassM = pm('#d8f4ff', 0.05, { transparent: true, opacity: 0.35, metalness: 0.2, depthWrite: false });
  mesh(root, cyl(0.12, 0.12, 1.2, 14), glassM, sx, g + 0.95, sz, 0, { cast: false });
  const waterM = new THREE.MeshStandardMaterial({ map: waterTex(), color: '#ffffff', roughness: 0.2, emissive: '#1a5a9a', emissiveIntensity: 0.4, transparent: true, opacity: 0.0 });
  const water = mesh(root, cyl(0.1, 0.1, 1.15, 12), waterM, sx, g + 0.95, sz, 0, { cast: false });
  for (const yy of [0.33, 1.57]) B.add(cyl(0.17, 0.17, 0.1, 14), brassM(), sx, g + yy, sz);
  const lampM = pm('#304050', 0.4, { emissive: '#000000' }).clone();
  const [lx, lz] = f(-0.78, 1.03);
  mesh(root, cached('mlamp', () => new THREE.SphereGeometry(0.12, 12, 8)), lampM, lx, g + 1.2, lz, 0, { cast: false });
  B.add(cyl(0.09, 0.11, 0.12, 12).rotateX(Math.PI / 2), darkSteel(), lx, g + 1.2, lz - 0.0, 0, ry, 0);
  W.physics.add({ type: 'box', x, z, hw: 1.15, hd: 1.05, rot: ry, top: g + 1.7 });
  let k = 0, goal = 0, off = 0;
  W.updaters.push((dt) => {
    k += (goal - k) * (1 - Math.exp(-dt * 1.5));
    needle.rotation.z = 2.2 - k * 4.0 + Math.sin(performance.now() * 0.013) * 0.02 * k;
    off += dt * k * 1.4;
    waterTex().offset.y = -off;
    waterM.opacity = Math.min(1, k * 2.5) * 0.9;
    water.scale.y = Math.max(0.02, Math.min(1, k * 1.4));
    water.position.y = g + 0.375 + 0.575 * water.scale.y;
    lampM.emissive.set(k > 0.05 ? '#20c8ff' : '#000000'); lampM.emissiveIntensity = 1.5 * Math.min(1, k * 3);
  });
  return (v) => { goal = Math.max(0, Math.min(1, v)); };
}

function buildPipeline(W, root, r) {
  const grp = new THREE.Group(); grp.name = 'pipeline'; root.add(grp);
  const B = new Batch(grp);
  const gSt = W.H(STATION.x, STATION.z);
  const pathDist = W.pathDist || (() => 99);
  const D = DEPOT;
  const avoid = (x, z) => {
    if (x > D.x0 - 2 && x < D.x1 + 2 && z > D.z0 - 1 && z < D.z1 + 1) {
      if (Math.abs(x - D.x0) < 0.9 || Math.abs(x - D.x1) < 0.9) return true;
      for (const px of DEPOT_LOOP_X) if (Math.abs(x - px) < 1.4) return true;
      if (x > DEPOT_VALVE.x - 2.4 && x < DEPOT_VALVE.x + 2.4) return true;
    }
    if (Math.hypot(x - ORCHARD.x, z - ORCHARD.z) < ORCHARD.half + 1.4) return true;
    if (Math.max(Math.abs(x - STATION.x), Math.abs(z - STATION.z)) < STATION.half + 1.6) return true;
    return pathDist(x, z) < 1.7;
  };
  // --- the main
  // (over the orchard the main runs high: the ball's lob to the caged valve must pass under it)
  const prof = pipeProfile(W, PIPE, { y0: gSt + 2.9, fix: [{ x: DEPOT_VALVE.x, z: DEPOT_VALVE.z, y: W.H(DEPOT_VALVE.x, DEPOT_VALVE.z) + 3.0, span: 7 },
    { x: ORCHARD.dx, z: ORCHARD.dz + 1, y: W.H(ORCHARD.x, ORCHARD.z) + 5.6, span: 9 }] });
  drawPipe(W, B, prof, { avoid });
  const valves = [];
  // depot: a bypass loop hanging under the main, valve in the middle
  {
    const V = DEPOT_VALVE, g = W.H(V.x, V.z), i = nearestSample(prof, V.x, V.z), ym = prof.y[i], zl = prof.zs[i];
    const yl = g + 0.72;
    pipeRun(B, [[V.x - 1.6, ym, zl], [V.x - 1.6, yl, zl], [V.x - 0.5, yl, zl]], 0.17);
    pipeRun(B, [[V.x + 0.5, yl, zl], [V.x + 1.6, yl, zl], [V.x + 1.6, ym, zl]], 0.17);
    for (const s of [-1, 1]) {
      B.add(cached('tee', () => new THREE.SphereGeometry(0.36, 14, 10)), tm('pipe', { rough: 0.5, metal: 0.35 }), V.x + s * 1.6, ym, zl);
      B.add(boxUV(bbox(0.42, 0.42, 0.42, 0.04, 1), TILE.concrete), tm('concrete', { color: '#d0ccc4' }), V.x + s * 1.6, g + 0.2, zl);
      member(B, [V.x + s * 1.6, g + 0.38, zl], [V.x + s * 1.6, yl - 0.18, zl], 0.1, tealM(), 1, 0.02);
    }
    const v = makeValve(W, grp, B, 'depot', 'use', [V.x, yl, zl], [1, 0, 0], [0, 1, 0], 0.42);
    valves.push(v);
    W.physics.add({ type: 'box', x: V.x, z: zl, hw: 1.85, hd: 0.36, rot: 0, top: yl + 0.6, noStand: true, seeThrough: true });
    // a hazard-striped kerb plate under it and a warning plate
    B.add(boxUV(bbox(3.9, 0.06, 1.2, 0.02, 1), TILE.hazard), tm('hazard', { rough: 0.6 }), V.x, g + 0.03, zl);
  }
  // orchard: a stub from the main drops into an iron cage; the wheel faces the path
  {
    const O = ORCHARD, g = W.H(O.x, O.z), i = nearestSample(prof, O.dx, O.dz + 1.0), ym = prof.y[i];
    const vy = g + 2.95; // (well above the cage's top bar, so a lob over the bars reaches it)
    pipeRun(B, [[prof.xs[i], ym, prof.zs[i]], [O.dx, ym, O.dz], [O.dx, vy + 0.5, O.dz]], 0.2);
    B.add(cached('tee', () => new THREE.SphereGeometry(0.36, 14, 10)), tm('pipe', { rough: 0.5, metal: 0.35 }), prof.xs[i], ym, prof.zs[i]);
    pipeRun(B, [[O.dx, vy - 0.5, O.dz], [O.dx, g - 0.2, O.dz]], 0.2);
    B.add(lathe([[0, 0], [0.48, 0], [0.48, 0.22], [0.4, 0.28], [0, 0.28]], 18, TILE.concrete), tm('concrete', { color: '#d0ccc4' }), O.dx, g - 0.05, O.dz);
    // a bracket from the old column steadies the tall valve
    member(B, [O.dx - 0.9, g, O.dz], [O.dx - 0.18, vy - 0.7, O.dz], 0.1, darkSteel(), 1, 0.02);
    const v = makeValve(W, grp, B, 'orchard', 'ball', [O.dx, vy, O.dz], [0, 1, 0], [1, 0, 0], 0.5);
    valves.push(v);
    W.physics.add({ type: 'cyl', x: O.dx, z: O.dz, r: 0.4, top: vy + 0.6, seeThrough: true });
    cage(W, grp, B, O.x, O.z, O.half, 'E');
  }
  // the dive into the meter portal at the edge of town
  {
    const last = prof.n - 1, ex = prof.xs[last], ez = prof.zs[last], ey = prof.y[last];
    const g = W.H(METER.x, METER.z);
    pipeRun(B, [[ex, ey, ez], [METER.x, ey, METER.z], [METER.x, g + 1.62, METER.z]], 0.3);
    W.setWaterFlow = buildMeter(W, grp, B, METER.x, METER.z, METER.ry, ey);
  }
  // --- the branch to the reservoir on the Whispering Cliffs
  {
    const yb = gSt + 3.4;
    pipeRun(B, [[BRANCH[0][0], gSt + 0.3, BRANCH[0][1]], [BRANCH[0][0], yb, BRANCH[0][1]]], 0.24);
    const bp = pipeProfile(W, BRANCH, { y0: yb, clear: 2.6 });
    drawPipe(W, B, bp, { r: 0.24, avoid });
    const last = bp.n - 1, rx = bp.xs[last], rz = bp.zs[last], ry0 = bp.y[last];
    const top = POI_PLATEAU.h + 0.85, vz = CLIFF_VALVE.z;
    pipeRun(B, [[rx, ry0, rz], [rx, top, rz], [rx, top, vz + 0.55]], 0.24);
    // riser clamps into the rock
    for (let yy = ry0 + 1.8; yy < top - 0.8; yy += 2.2) member(B, [rx, yy, rz], [rx, yy, rz - 0.9], 0.1, darkSteel(), 1, 0.02);
    const v = makeValve(W, grp, B, 'cliff', 'use', [rx, top, vz], [0, 0, 1], [0, 1, 0], 0.4);
    valves.push(v);
    const cg = W.H(rx, vz - 3.2);
    pipeRun(B, [[rx, top, vz - 0.55], [rx, top, vz - 2.3], [rx, cg + 1.35, vz - 2.3]], 0.24);
    // a small cistern: stone drum, brass rim, a teal lid
    const cx = rx, cz = vz - 3.1;
    B.add(lathe([[0, 0], [1.0, 0], [1.0, 1.1], [1.08, 1.16], [1.08, 1.26], [0.9, 1.26], [0.9, 1.2], [0, 1.2]], 24, TILE.stone), tm('stone', { color: '#d8d4cc' }), cx, cg - 0.1, cz);
    B.add(cached('cisrim', () => new THREE.TorusGeometry(1.05, 0.05, 6, 32).rotateX(Math.PI / 2)), brassM(), cx, cg + 1.08, cz);
    B.add(lathe([[0, 0], [0.92, 0], [0.7, 0.18], [0.2, 0.28], [0, 0.3]], 20, TILE.teal), tealM(), cx, cg + 1.18, cz);
    W.physics.add({ type: 'cyl', x: cx, z: cz, r: 1.08, top: cg + 1.45 });
    W.physics.add({ type: 'box', x: rx, z: (vz + 0.6 + vz - 2.3) / 2, hw: 0.3, hd: (2.9) / 2, rot: 0, top: top + 0.3, noStand: true, seeThrough: true });
  }
  W.valves = valves;
  // turning a wheel: two turns over ~1.1 s and a hiss of steam
  const steam = steamSystem(grp, 30);
  let hiss = 0;
  W.updaters.push((dt) => {
    steam.update(dt);
    for (const v of valves) {
      if (v.spin > 0) {
        v.spin = Math.max(0, v.spin - dt);
        v.pivot.rotation.y -= dt * (Math.PI * 4 / 1.1);
        v.hiss = 1.8;
      }
      if (v.hiss > 0) {
        v.hiss -= dt; hiss -= dt;
        if (hiss <= 0) { hiss = 0.07; steam.emit(v.body.x, v.body.y + 0.2, v.body.z, { size: 0.55, vy: 1.6, life: 1.2, spread: 0.4 }); }
      }
    }
  });
  B.build();
}

// ================================================================== dressing: crates, signposts, the stump
// Breakable crates keep their order in W.crates (saves store broken ones by index).
const CRATES = [[-30, 0], [-31, 1.3], [-52, -2], [-81, -76], [-70, -76], [-68, -75.6], [-86, -64], [-38, -71], [-27, -27], [-46, -26]];
function buildDressing(W, root, r) {
  const grp = new THREE.Group(); grp.name = 'dressing'; root.add(grp);
  for (const [x, z] of CRATES) {
    const g = W.H(x, z), ry = x * 0.3;
    const m = crateMesh(1); m.position.set(x, g - 0.02, z); m.rotation.y = ry; grp.add(m);
    const c = W.physics.add({ type: 'box', x, z, hw: 0.5, hd: 0.5, rot: ry, top: g + 1, seeThrough: true });
    W.crates.push({ mesh: m, c, x, z, y: g + 0.5, alive: true });
  }
  // signposts (language-free pictograms; the text shows when read)
  const A = PICT;
  signpost(W, grp, -27.0, -8.2, -Math.PI / 2 + 0.2, 'w_sign_town', (c) => { A.well(c, 150, 66); A.arrow(c, 70, 64, -1, 1.1); });
  signpost(W, grp, -58.5, 71.0, 0.6, 'w_sign_lighthouse', (c) => { A.tower(c, 90, 66); A.arrow(c, 175, 64, 1, 1.1); });
  signpost(W, grp, -63.5, -15.5, 0.0, 'w_sign_cliffs', (c) => { A.cliff(c, 100, 66); A.arrow(c, 190, 64, 1, 0.9); });
  signpost(W, grp, -62.0, -79.0, -0.9, 'w_sign_depot', (c) => { A.gear(c, 128, 64, 30); });
  signpost(W, grp, -47.4, -60.4, -0.6, 'w_sign_station', (c) => { A.gear(c, 90, 64, 26); A.arrow(c, 180, 64, 1, 1.0); });
  signpost(W, grp, -73.5, -58.5, Math.PI / 2 + 0.25, 'w_sign_orchard', (c) => { A.drop(c, 96, 64); A.cross(c, 166, 64); });
  signpost(W, grp, -53.4, -54.2, -0.5, 'w_sign_pipe', (c) => { A.drop(c, 80, 64); c.fillRect(110, 52, 110, 24); c.fillStyle = '#d2ae74'; for (let i = 0; i < 4; i++) c.fillRect(124 + i * 26, 50, 5, 28); c.fillStyle = '#3a2410'; });
  signpost(W, grp, -50.5, 30.0, -Math.PI / 2 - 0.3, 'w_sign_harbour', (c) => { A.anchor(c, 150, 70); A.arrow(c, 70, 64, -1, 1.1); });
  // the stump where a clover hides: sculpted roots and bark, a cut top with rings
  {
    const x = STUMP.x, z = STUMP.z, g = W.H(x, z);
    const geo = cached('stump', () => sculptRigid({ key: 'stump', prims: [
      { type: 'ccone', c: [0, 0.32, 0], h: 0.36, rb: 0.62, rt: 0.5, round: 0.05, mat: 'b', group: 'a', wobble: (px, py, pz) => Math.sin(Math.atan2(pz, px) * 9) * 0.025 + Math.sin(py * 13 + px * 5) * 0.01 },
      ...[0, 1.3, 2.4, 3.6, 4.9].map((a, i) => ({ type: 'cone', a: [Math.cos(a) * 0.35, 0.22, Math.sin(a) * 0.35], b: [Math.cos(a) * (0.95 + (i % 2) * 0.2), -0.08, Math.sin(a) * (0.95 + (i % 2) * 0.2)], r1: 0.2, r2: 0.06, mat: 'b', group: 'a' })),
      { type: 'ell', c: [0, 0.69, 0], r: [0.5, 0.04, 0.5], mat: 'w', group: 'top', cutBelow: 0.66 },
      { type: 'cone', a: [0.28, 0.6, 0.1], b: [0.36, 0.95, 0.16], r1: 0.07, r2: 0.04, mat: 'b', group: 'a' },
    ], groups: { a: 0.1, top: 0.02 }, joinK: 0.03, colors: { b: '#6a4a30', w: '#d8b888' },
    paint: (p, m, c) => { if (m === 'w' || p.y > 0.66) { const rr = Math.hypot(p.x, p.z); c.set(rr > 0.44 ? '#6a4a30' : '#d8b888').offsetHSL(0, 0, Math.sin(rr * 60) * 0.06); } else c.offsetHSL(0, 0, Math.sin(Math.atan2(p.z, p.x) * 23 + p.y * 9) * 0.05); },
    bounds: { min: [-1.3, -0.15, -1.3], max: [1.3, 1.05, 1.3] }, cell: 0.04 }));
    mesh(grp, geo, VC(), x, g - 0.05, z, 0.7);
    W.physics.add({ type: 'cyl', x, z, r: 0.65, top: g + 0.68, seeThrough: true });
  }
}

// ================================================================== the original's street furniture
// Lamps, lanterns, benches, bollards, railings, picket fences and tulip rows where the original island has them
// (citadel-layout.js). Our island is not the original to the metre, so each piece is fitted: it stands only where
// our ground is at least the original's level there (not down in the quay basin under the original's upper
// promenade), is not steep or wet, keeps off the paths, streets, doors and the project's sites, and is clear of
// everything already built; a piece that is blocked may shift up to a metre, else it is left out.
function buildOriginalProps(W, root, r) {
  const grp = new THREE.Group(); grp.name = 'original-props'; root.add(grp);
  const { physics: P, terrain: T } = W;
  const doors = (W.houses || []).map((h) => h.door).filter(Boolean);
  const placed = [];
  // clearance from every enabled collider (that stands above the ground here)
  const clear = (x, z, rad) => {
    const h = W.H(x, z);
    for (const c of P.near(x, z)) {
      if (!c.enabled || c.top < h + 0.05) continue;
      if (P._inside(c, x, z, rad)) return false;
    }
    return true;
  };
  const okAt = (x, z, rad, y0, open) => {
    const h = W.H(x, z);
    if (h < 1.2 || h < y0 - 0.3 || T.slopeAt(x, z) > 0.5) return false;
    if (keepClear(x, z, rad)) return false;
    if (W.pathDist && W.pathDist(x, z) < (open ? 0.9 : 1.3) + rad) return false;
    if (streetDist(x, z) < (open ? -0.6 : 0.2) + rad) return false;
    if (doors.some((d) => Math.hypot(x - d.x, z - d.z) < 2.2 + rad)) return false;
    if (placed.some((p) => Math.hypot(x - p.x, z - p.z) < p.r + rad)) return false;
    return clear(x, z, rad);
  };
  // a piece of length len along its facing (sampled every metre), shifted up to 1 m if it must be
  const fit = (x, z, ry, len, rad, y0, open = false) => {
    const ax = Math.cos(ry), az = -Math.sin(ry); // its length runs across its facing
    const n = Math.max(1, Math.ceil(len)), pts = (cx, cz) => Array.from({ length: n + 1 }, (_, i) => [cx + ax * (i / n - 0.5) * len, cz + az * (i / n - 0.5) * len]);
    const tries = [[0, 0]];
    for (const d of [0.5, 1.0]) for (let k = 0; k < 8; k++) tries.push([Math.cos(k * Math.PI / 4) * d, Math.sin(k * Math.PI / 4) * d]);
    for (const [ox, oz] of tries) {
      const cx = x + ox, cz = z + oz;
      if (pts(cx, cz).every(([px, pz]) => okAt(px, pz, rad, y0, open))) {
        for (const [px, pz] of pts(cx, cz)) placed.push({ x: px, z: pz, r: rad });
        return [cx, cz];
      }
    }
    W.propsSkipped = (W.propsSkipped || 0) + 1;
    return null;
  };
  const Q = Math.PI / 2;
  let n = 0;
  // street lamps (the square's four are the town's)
  for (const [x, z] of PROPS.lamps.slice(4)) { const at = fit(x, z, 0, 0, 0.45, -9, true); if (at) { lamp(W, grp, at[0], at[1], n === 0); n++; } }
  // low lanterns: a stone foot and a glass lamp in a dark iron cage
  {
    const L = cached('lantern', () => ({
      stone: compose([[bbox(0.5, 0.4, 0.5, 0.04, TILE.stone), 0, 0.2, 0], [bbox(0.4, 0.08, 0.4, 0.02, TILE.stone), 0, 0.44, 0]]),
      iron: compose([[cyl(0.03, 0.03, 0.42, 4), 0.13, 0.69, 0.13], [cyl(0.03, 0.03, 0.42, 4), -0.13, 0.69, 0.13], [cyl(0.03, 0.03, 0.42, 4), 0.13, 0.69, -0.13], [cyl(0.03, 0.03, 0.42, 4), -0.13, 0.69, -0.13],
        [cyl(0.03, 0.24, 0.12, 4).rotateY(Math.PI / 4), 0, 0.96, 0], [cyl(0.03, 0.03, 0.08, 6), 0, 1.04, 0]]),
      glass: cyl(0.12, 0.12, 0.38, 8).translate(0, 0.69, 0),
    }));
    const list = [];
    for (const [x, z, y0] of PROPS.lanterns) { const at = fit(x, z, 0, 0, 0.35, y0, true); if (at) list.push({ x: at[0], y: W.H(at[0], at[1]) - 0.02, z: at[1], ry: 0 }); }
    instances(grp, L.stone, tm('stone', { color: '#e6e0d4' }), list);
    instances(grp, L.iron, pm('#2e3238', 0.45, { metalness: 0.6 }), list);
    instances(grp, L.glass, pm('#fff1c8', 0.3, { emissive: '#ffd890', emissiveIntensity: 0.9 }), list, { cast: false });
    for (const p of list) P.add({ type: 'cyl', x: p.x, z: p.z, r: 0.3, top: p.y + 1.05, seeThrough: true, noStand: true });
    n += list.length;
  }
  // benches (facing: the way a sitter looks)
  for (const [x, z, f] of PROPS.benches) { const ry = f * Q, at = fit(x, z, ry, 1.7, 0.4, -9); if (at) { bench(W, grp, at[0], at[1], ry); n++; } }
  // bollard runs: two posts and a teal rail
  {
    const posts = [], teal = pm('#2a9a8a', 0.4, { metalness: 0.5 });
    for (const [x, z, f, y0] of PROPS.bollards) {
      const ry = f * Q, at = fit(x, z, ry, 4.4, 0.35, y0); if (!at) continue;
      const ax = Math.cos(ry) * 2.2, az = -Math.sin(ry) * 2.2;
      for (const s of [-1, 1]) { const px = at[0] + ax * s, pz = at[1] + az * s; posts.push({ x: px, y: W.H(px, pz) - 0.02, z: pz, ry: ry + (r() - 0.5) * 0.06 }); }
      const y = (W.H(at[0] - ax, at[1] - az) + W.H(at[0] + ax, at[1] + az)) / 2;
      mesh(grp, cyl(0.045, 0.045, 4.4, 8), teal, at[0], y + 0.55, at[1], ry, { rz: Math.PI / 2 });
      P.add({ type: 'box', x: at[0], z: at[1], hw: 2.4, hd: 0.25, rot: ry, top: y + 1.0, seeThrough: true, noStand: true });
      n++;
    }
    instances(grp, bollardGeo(), tm('concrete', { color: '#f4f2ee', rough: 0.75 }), posts);
  }
  // railings (6 m): teal posts and two rails, and picket fences (1.7 m), white
  {
    const rail = cached('rail6', () => compose([
      ...[-3, -1.5, 0, 1.5, 3].map((px) => [cyl(0.035, 0.04, 1.0, 6), px, 0.5, 0]),
      [cyl(0.03, 0.03, 6, 6).rotateZ(Math.PI / 2), 0, 0.96, 0], [cyl(0.025, 0.025, 6, 6).rotateZ(Math.PI / 2), 0, 0.5, 0],
    ]));
    const picket = cached('picket17', () => compose([
      ...[-0.72, -0.43, -0.14, 0.14, 0.43, 0.72].flatMap((px) => [[bbox(0.09, 0.85, 0.035, 0.01, 1), px, 0.42, 0], [cyl(0.0, 0.065, 0.12, 4).rotateY(Math.PI / 4), px, 0.9, 0]]),
      [bbox(1.7, 0.06, 0.04, 0.01, 1), 0, 0.3, -0.03], [bbox(1.7, 0.06, 0.04, 0.01, 1), 0, 0.68, -0.03],
    ]));
    const rails = [], pickets = [];
    const put = (list, x, z, ry, len) => {
      const ax = Math.cos(ry) * len / 2, az = -Math.sin(ry) * len / 2;
      const y = Math.min(W.H(x - ax, z - az), W.H(x + ax, z + az), W.H(x, z));
      list.push({ x, y: y - 0.03, z, ry });
      P.add({ type: 'box', x, z, hw: len / 2, hd: 0.12, rot: ry, top: y + 1.0, seeThrough: true, noStand: true });
      n++;
    };
    for (const [x, z, f, y0] of PROPS.rails) { const ry = f * Q, at = fit(x, z, ry, 6, 0.2, y0); if (at) put(rails, at[0], at[1], ry, 6); }
    for (const [x, z, f] of PROPS.pickets) { const ry = f * Q, at = fit(x, z, ry, 1.7, 0.15, -9); if (at) put(pickets, at[0], at[1], ry, 1.7); }
    instances(grp, rail, pm('#2a9a8a', 0.4, { metalness: 0.5 }), rails);
    instances(grp, picket, pm('#f2eadc', 0.8), pickets);
  }
  // tulip rows: a bed under each row
  for (const [x0, x1, z] of PROPS.tulips) {
    const w = x1 - x0 + 0.7, x = (x0 + x1) / 2, at = fit(x, z, 0, w, 0.55, -9);
    if (at) { tulipBed(W, grp, at[0], at[1], w, 1.1, 0, r); n++; }
  }
  W.propsPlaced = n;
}

// ================================================================== entry
export function buildIsland(scene, W) {
  const r = rng(4242);
  W.signs = W.signs || [];
  const T0 = performance.now();
  buildHarbour(W, scene, r);
  const T1 = performance.now();
  buildStation(W, scene, r);
  const T2 = performance.now();
  buildDepot(W, scene, r);
  buildPipeline(W, scene, r);
  buildDressing(W, scene, r);
  buildOriginalProps(W, scene, r);
  console.log(`[isl] harbour ${(T1 - T0) | 0} ms, station ${(T2 - T1) | 0} ms, depot+pipe ${(performance.now() - T2) | 0} ms`);
  W.island = { keepClear };
}
