// Lupin-Burg (Citadel Island): Twinsen's corner of town.
// A small square with the well, Bug Street leaving it (on south, past the fields, to Twinsen's house),
// a shop with a striped awning and a globe sign, and the things people
// leave around: benches, laundry, barrels, tools, a radio on a sill,
// potted plants, fenced gardens and lamps.
import * as THREE from 'three';
import { buildHouse } from './architecture.js';
import { mergeStatic } from '../engine/merge.js';
import { textures } from '../engine/textures.js';
import { sculptRigid } from '../engine/sculpt.js';
import { rng, distToSegment, smoothstep } from '../engine/math.js';
import { PROPS } from './citadel-layout.js';

export const V = { x: -42, z: -4 }; // the town square (well)

// cobbled streets: polyline + width (metres)
export const STREETS = [
  { pts: [[-42, -4], [-47.5, -9.0], [-53.2, -12.6]], w: [3.6, 2.6, 3.2] },                 // Bug Street (the lane carries on south to Twinsen's house)
  { pts: [[-42, -4], [-50, -5.2], [-57, -4.4], [-64, -4]], w: [3.8, 3.0, 2.6, 2.4] },     // down to the harbour
  { pts: [[-42, -4], [-36, -2.4], [-33.2, -1.2]], w: [4.2, 3.4, 2.8] },                  // to Pippa's shop
  { pts: [[-42, -4], [-41.5, 4], [-44.3, 9.8]], w: [3.8, 2.8, 2.6] },                    // south lane
];

export function streetDist(x, z) {
  let best = 1e9, bw = 0;
  for (const s of STREETS) for (let i = 0; i < s.pts.length - 1; i++) {
    const [a, b] = [s.pts[i], s.pts[i + 1]];
    const d = distToSegment(x, z, a[0], a[1], b[0], b[1]);
    const t = Math.max(0, Math.min(1, ((x - a[0]) * (b[0] - a[0]) + (z - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)));
    const w = s.w[i] + (s.w[i + 1] - s.w[i]) * t;
    if (d - w / 2 < best) { best = d - w / 2; bw = w; }
  }
  return best; // < 0 inside a street
}

// Twinsen's corner sits on a small rise above the square
const RISE = { x: -51, z: -14.5, r: 10, h: 0.75 };
export function townHeight(x, z, h) {
  const d = Math.hypot(x - RISE.x, z - RISE.z);
  return h + RISE.h * (1 - smoothstep(RISE.r * 0.55, RISE.r, d));
}

const HOUSES = [
  // Twinsen's house: matches the interior (9 × 7 m room), door to the right, blue shutters
  // Twinsen's house stands where the original's does, south of the village by the path to the lighthouse
  // (LBA2 scene 0's door), its front to the east; a neighbour's house has its old place in Bug Street
  { id: 'twinsen', x: -50.6, z: 79.8, ry: Math.PI / 2, pad: 9, w: 9.4, d: 7.4, h: 3.3, door: { x: 2.6 }, wall: 'plaster', tint: '#fff8ea', roof: 'roof', shutters: '#3b78d8', beams: true, chimneyX: -0.3, lit: true,
    windows: [{ side: 'front', x: -2.3 }, { side: 'front', x: -0.2, w: 0.7 }, { side: 'left', x: -1.2 }, { side: 'right', x: 1.2 }, { side: 'back', x: 0 }] },
  // the others stand by the original's doors (LBA2's scenes 5, 37, 15, 3, 17, 9, 7, 8, 14), in our own styles
  { id: 'bug', x: -57, z: -16.8, ry: 0.25, w: 7.6, d: 6.2, h: 3.1, door: { x: 1.9 }, wall: 'stone', tint: '#f0e8dc', roof: 'roofBlue', shutters: '#d8a13b', chimneyX: 0.25,
    windows: [{ side: 'front', x: -1.6 }, { side: 'left', x: 0 }, { side: 'right', x: 0.4 }] },
  { id: 'stone', x: -31.7, z: -24.6, ry: 0.05, w: 8.0, d: 5.4, h: 3.1, door: { x: 1.7 }, wall: 'stone', roof: 'roofBlue', shutters: '#3f9a6a', chimneyX: 0.3,
    windows: [{ side: 'front', x: 1.4 }, { side: 'left', x: 0 }, { side: 'right', x: -0.6, y: 1.4, w: 0.6, h: 0.7 }] },
  { id: 'shop', x: -30, z: 0.5, ry: -Math.PI / 2, w: 7, d: 5.6, h: 3.4, door: { x: -1.6, arch: false }, wall: 'stone', tint: '#f4f0ea', roof: 'roof', shutters: '#c8452f', awning: '#c8452f', awningW: 3.4, awningX: 0.6, beams: true,
    windows: [{ side: 'front', x: 0.9, y: 0.9, w: 1.6, h: 1.2, noShutters: true }, { side: 'right', x: 0.4 }, { side: 'left', x: 0.8 }] },
  { id: 'water', x: -68.7, z: 11.0, ry: Math.PI / 2, w: 6.2, d: 4.8, h: 3.0, door: { x: 0.0 }, wall: 'plaster', tint: '#dfe8f2', roof: 'roofBlue', shutters: '#3b5bb8', chimneyX: -0.25,
    windows: [{ side: 'front', x: -1.6 }, { side: 'right', x: 0 }] },
  { id: 'pink', x: -28.5, z: 24.6, ry: 0, w: 6.0, d: 5, h: 3.0, door: { x: 0.0 }, wall: 'plaster', tint: '#f8dcd2', roof: 'roof', shutters: '#8f4fc1', beams: true,
    windows: [{ side: 'front', x: -1.2 }, { side: 'left', x: 0.3 }] },
  { id: 'south', x: -48.2, z: 23.3, ry: 0, w: 9.0, d: 6.2, h: 3.2, door: { x: 2.1 }, wall: 'stone', roof: 'roof', shutters: '#d8a13b', chimneyX: 0.3,
    windows: [{ side: 'front', x: 1.2 }, { side: 'front', x: -2.8, w: 0.6 }, { side: 'right', x: 0 }] },
  { id: 'nbr', x: -33.6, z: 75.3, ry: Math.PI / 2, w: 5.6, d: 5.0, h: 3.0, door: { x: 0.0 }, wall: 'plaster', tint: '#e8f0d8', roof: 'roof', shutters: '#3f9a6a', chimneyX: 0.2,
    windows: [{ side: 'front', x: -1.5 }, { side: 'left', x: 0 }] },
  // the harbour wing: the baggage claim building and its neighbour (LBA2's holomap), and the big house by the field
  { id: 'baggage', x: -84.2, z: 25.4, ry: 0, w: 15, d: 8.8, h: 3.6, door: { x: -4.6 }, wall: 'stone', tint: '#ece4d4', roof: 'roofBlue', shutters: '#3b5bb8', chimneyX: 0.35,
    windows: [{ side: 'front', x: 1.0 }, { side: 'front', x: 4.6 }, { side: 'front', x: -1.8, w: 0.7 }, { side: 'left', x: 0 }, { side: 'right', x: 0 }] },
  { id: 'wing2', x: -100.8, z: 26.4, ry: 0, w: 7.5, d: 8.8, h: 3.2, door: { x: 1.7 }, wall: 'plaster', tint: '#f4ead8', roof: 'roof', shutters: '#c8452f', chimneyX: -0.25,
    windows: [{ side: 'front', x: -1.6 }, { side: 'left', x: 0 }, { side: 'right', x: 1.0 }] },
  { id: 'museum', x: -71.0, z: 42.5, ry: Math.PI / 2, w: 9.0, d: 8.0, h: 3.4, door: { x: 1.4 }, wall: 'plaster', tint: '#f0e0f0', roof: 'roof', shutters: '#8f4fc1', beams: true, chimneyX: 0.3,
    windows: [{ side: 'front', x: -1.8 }, { side: 'front', x: 3.4 }, { side: 'left', x: 0 }, { side: 'right', x: 0 }] },
];
// the houses beyond the square stand on level pads; those round it keep the town's own ground (world.js)
for (const h of HOUSES) if (!h.pad && Math.hypot(h.x - V.x, h.z - V.z) > 18) h.pad = Math.max(h.w, h.d) * 0.75 + 2;
export const HOUSE_KEEP = HOUSES.filter((h) => !h.pad).map((h) => [h.x, h.z, Math.max(h.w, h.d) * 0.72]);

// houses that stand outside the town core get a level pad (world.js)
export const HOUSE_PADS = HOUSES.filter((h) => h.pad).map((h) => ({ x: h.x, z: h.z, r: h.pad }));

// ------------------------------------------------------------------ helpers
const M = new Map();
function mat(color, rough = 0.85, extra = {}) {
  const k = color + rough + JSON.stringify(extra);
  if (!M.has(k)) M.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra }));
  return M.get(k);
}
function texMat(name, rx = 1, ry = 1, color = '#ffffff') {
  const k = name + rx + ry + color;
  if (!M.has(k)) { const t = textures()[name].clone(); t.needsUpdate = true; t.repeat.set(rx, ry); M.set(k, new THREE.MeshStandardMaterial({ map: t, color, roughness: 0.9 })); }
  return M.get(k);
}
function put(parent, geo, material, x, y, z, ry = 0, cast = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); m.rotation.y = ry;
  m.castShadow = cast; m.receiveShadow = true;
  parent.add(m);
  return m;
}
const sculpted = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
function sculpt(key, prims, groups, colors, bounds, cell, paint) {
  return sculptRigid({ key, prims, groups, colors, bounds, cell, paint, joinK: 0.01 });
}

// ------------------------------------------------------------------ props
function barrelGeo() {
  // lathe barrel with a bulge, staves via texture, iron hoops added separately
  const pts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector2(0.34 + Math.sin(t * Math.PI) * 0.07, t * 0.95)); }
  return new THREE.LatheGeometry(pts, 16);
}
function barrel(parent, x, y, z, r) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = r() * 6; g.rotation.z = (r() - 0.5) * 0.04;
  parent.add(g);
  put(g, barrelGeo(), texMat('wood', 2, 1, '#c89060'), 0, 0, 0);
  put(g, new THREE.CircleGeometry(0.35, 16), texMat('wood', 1, 1, '#a87040'), 0, 0.95, 0).rotation.x = -Math.PI / 2;
  for (const hy of [0.12, 0.83]) put(g, new THREE.TorusGeometry(0.37 + (hy > 0.5 ? 0 : 0), 0.018, 6, 20), mat('#3a3a3a', 0.5, { metalness: 0.5 }), 0, hy, 0).rotation.x = Math.PI / 2;
  return g;
}
function bench(parent, x, y, z, ry) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const wood = texMat('wood', 0.4, 2, '#d8443a');
  for (let i = 0; i < 3; i++) put(g, new THREE.BoxGeometry(1.7, 0.05, 0.13), wood, 0, 0.46, -0.16 + i * 0.16);
  for (let i = 0; i < 2; i++) { const b = put(g, new THREE.BoxGeometry(1.7, 0.05, 0.12), wood, 0, 0.72 + i * 0.16, -0.31); b.rotation.x = -0.18; }
  const iron = mat('#2f3236', 0.5, { metalness: 0.5 });
  for (const sx of [-0.7, 0.7]) {
    put(g, new THREE.BoxGeometry(0.06, 0.46, 0.06), iron, sx, 0.23, 0.12);
    const back = put(g, new THREE.BoxGeometry(0.06, 0.95, 0.06), iron, sx, 0.47, -0.27); back.rotation.x = -0.18;
    put(g, new THREE.BoxGeometry(0.06, 0.06, 0.5), iron, sx, 0.44, -0.06);
  }
  return g;
}
// Citadel street lamp (as in LBA2): grey post on a stepped pyramid base, two
// curled arms like a lyre, a big blue glass globe on top
function lamp(parent, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const metal = mat('#7d8088', 0.55, { metalness: 0.35 });
  put(g, new THREE.CylinderGeometry(0.2, 0.36, 0.3, 4), metal, 0, 0.15, 0, Math.PI / 4);
  put(g, new THREE.CylinderGeometry(0.12, 0.2, 0.25, 4), metal, 0, 0.42, 0, Math.PI / 4);
  put(g, new THREE.CylinderGeometry(0.055, 0.085, 2.2, 6), metal, 0, 1.6, 0);
  put(g, new THREE.CylinderGeometry(0.1, 0.07, 0.16, 8), metal, 0, 2.72, 0);
  for (const sx of [-1, 1]) {
    // each arm: a curve that leaves the post, bends outwards and curls back in
    const pts = [[0.04, 2.25], [0.22, 2.42], [0.34, 2.68], [0.33, 2.92], [0.22, 3.0], [0.16, 2.9]].map(([px, py]) => new THREE.Vector3(px * sx, py, 0));
    put(g, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.035, 6), metal, 0, 0, 0);
  }
  const glass = new THREE.MeshStandardMaterial({ color: '#2f7fd8', roughness: 0.22, metalness: 0.1, emissive: '#3a8cff', emissiveIntensity: 0.25 });
  put(g, new THREE.SphereGeometry(0.34, 22, 16), glass, 0, 3.12, 0);
  put(g, new THREE.CylinderGeometry(0.04, 0.06, 0.1, 8), metal, 0, 3.5, 0);
  return g;
}
function bunting(parent, W, lamps) {
  const { H } = W;
  const cols = ['#e8433a', '#f4c430', '#3a8fd8', '#f6efe0', '#58b04a', '#e87ab0'].map((c) => new THREE.Color(c));
  // lamps in order around the square; string each to the next when they are close enough
  const pts = lamps.map(([x, z]) => new THREE.Vector3(x, H(x, z) + 2.78, z)).sort((a, b) => Math.atan2(a.z - V.z, a.x - V.x) - Math.atan2(b.z - V.z, b.x - V.x));
  const pos = [], col = [], ropes = [];
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length], len = a.distanceTo(b);
    if (len > 17) return;
    const sag = 0.25 + len * 0.045;
    const at = (u) => new THREE.Vector3().lerpVectors(a, b, u).add(new THREE.Vector3(0, -Math.sin(u * Math.PI) * sag, 0));
    ropes.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 9 }, (_, k) => at(k / 8))), 24, 0.013, 4));
    const n = Math.floor(len / 0.46);
    for (let k = 1; k < n; k++) {
      const p0 = at((k - 0.38) / n), p1 = at((k + 0.38) / n), pm = at(k / n);
      const tip = pm.clone().add(new THREE.Vector3(0, -0.34, 0));
      const c = cols[(k + i * 2) % cols.length];
      for (const v of [p0, p1, tip]) { pos.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); }
    }
  });
  const grp = new THREE.Group(); grp.visible = false; parent.add(grp);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const flags = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }));
  flags.castShadow = true; grp.add(flags);
  const rope = mat('#d8c8a0', 0.9);
  for (const r of ropes) grp.add(new THREE.Mesh(r, rope));
  return { group: grp, setVisible(on) { grp.visible = !!on; } };
}
function heatPosts(parent, W, spots) {
  const { H, physics } = W;
  const teal = mat('#2c7f86', 0.45, { metalness: 0.35 }), brass = mat('#c89a3c', 0.35, { metalness: 0.6 });
  const crystal = new THREE.MeshStandardMaterial({ color: '#6a4a3a', roughness: 0.25, emissive: '#ff9a3c', emissiveIntensity: 0, flatShading: true });
  const geo = {
    base: new THREE.CylinderGeometry(0.2, 0.24, 0.16, 8),
    pipe: new THREE.CylinderGeometry(0.075, 0.075, 1.05, 10),
    collar: new THREE.CylinderGeometry(0.105, 0.105, 0.07, 12),
    cup: new THREE.CylinderGeometry(0.17, 0.09, 0.14, 8, 1, true),
    gem: new THREE.OctahedronGeometry(0.15, 0).scale(1, 1.5, 1),
  };
  const posts = [];
  for (const [x, z] of spots) {
    const y = H(x, z) - 0.04;
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = posts.length * 1.7; g.scale.setScalar(1.3); parent.add(g);
    put(g, geo.base, teal, 0, 0.08, 0);
    put(g, geo.pipe, teal, 0, 0.66, 0);
    for (const cy of [0.2, 0.62, 1.12]) put(g, geo.collar, brass, 0, cy, 0);
    const cup = put(g, geo.cup, brass, 0, 1.24, 0); cup.material = brass; cup.castShadow = false;
    put(g, geo.gem, crystal, 0, 1.4, 0, 0, false);
    physics.add({ type: 'cyl', x, z, r: 0.2, top: y + 1.95, noStand: true, seeThrough: true });
    posts.push({ x, y: y + 1.82, z });
  }
  let level = 0, puffT = 0;
  W.updaters.push((dt, t) => {
    const on = W.station?.active ? 1 : 0;
    level += (on - level) * Math.min(1, dt * 0.8);
    crystal.emissiveIntensity = level * (1.3 + Math.sin(t * 2.2) * 0.25);
    crystal.color.setRGB(0.42 + level * 0.5, 0.29 + level * 0.3, 0.23);
    if (level > 0.5 && W.particles && (puffT -= dt) <= 0) {
      puffT = 0.6;
      const p = posts[Math.floor(Math.random() * posts.length)];
      W.particles.burst(p.x, p.y + 0.25, p.z, '#ffe2c0', 1, 0.5);
    }
  });
  return { posts, get level() { return level; } };
}
function fence(root, H, a, b, r) {
  // ~50 pickets and tips per run: built in a group of its own and merged (≈100 draw calls → 2)
  const parent = new THREE.Group(); root.add(parent);
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ang = Math.atan2(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(2, Math.round(len / 0.32));
  const wood = mat('#f2eadc', 0.8);
  const geo = new THREE.BoxGeometry(0.09, 0.85, 0.035);
  const tip = new THREE.ConeGeometry(0.065, 0.12, 4);
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t, y = H(x, z);
    const p = put(parent, geo, wood, x, y + 0.42, z, ang + Math.PI / 2);
    p.rotation.z = (r() - 0.5) * 0.06;
    put(parent, tip, wood, x, y + 0.9, z, Math.PI / 4).castShadow = false;
  }
  for (const hy of [0.3, 0.68]) {
    const rail = put(parent, new THREE.BoxGeometry(len, 0.06, 0.04), wood, (a[0] + b[0]) / 2, H((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) + hy, (a[1] + b[1]) / 2, ang + Math.PI / 2);
    rail.position.z += 0.0;
  }
  mergeStatic(parent);
}
function stoneWall(parent, H, physics, a, b, h = 0.7) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ang = Math.atan2(b[0] - a[0], b[1] - a[1]);
  const cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2, y = H(cx, cz);
  put(parent, new THREE.BoxGeometry(0.5, h, len), texMat('stone', 1, len / 1.6), cx, y + h / 2 - 0.05, cz, ang);
  put(parent, new THREE.BoxGeometry(0.62, 0.1, len + 0.12), texMat('stone', 1, len / 2, '#d8d0c4'), cx, y + h, cz, ang);
  physics.add({ type: 'box', x: cx, z: cz, hw: 0.3, hd: len / 2, rot: ang, top: y + h + 0.05, seeThrough: true });
}
function laundry(parent, H, a, b, r) {
  const post = mat('#7a5232', 0.9);
  const ya = H(a[0], a[1]), yb = H(b[0], b[1]);
  put(parent, new THREE.CylinderGeometry(0.05, 0.06, 2.2, 6), post, a[0], ya + 1.1, a[1]);
  put(parent, new THREE.CylinderGeometry(0.05, 0.06, 2.2, 6), post, b[0], yb + 1.1, b[1]);
  const pts = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * t, ya + (yb - ya) * t + 2.1 - Math.sin(t * Math.PI) * 0.18, a[1] + (b[1] - a[1]) * t)); }
  put(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.008, 4), mat('#e8e0d0', 0.9), 0, 0, 0, 0, false);
  const cols = ['#7fb2ec', '#ffffff', '#e05a5a', '#f4d27a', '#7fb2ec', '#d0e8c0'];
  const cloths = [];
  for (let i = 1; i < 6; i++) {
    const t = i / 6, p = pts[Math.round(t * 10)];
    const w = 0.35 + r() * 0.25, h = 0.45 + r() * 0.35;
    const g = new THREE.PlaneGeometry(w, h, 3, 3); g.translate(0, -h / 2, 0);
    const c = put(parent, g, new THREE.MeshStandardMaterial({ color: cols[i], side: THREE.DoubleSide, roughness: 0.9 }), p.x, p.y, p.z, Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2);
    cloths.push(c);
  }
  return cloths;
}
function tools(parent, x, y, z, ry) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const wood = mat('#a8794a', 0.8), iron = mat('#6a6e74', 0.4, { metalness: 0.6 });
  const rake = new THREE.Group(); rake.rotation.z = 0.22; g.add(rake);
  put(rake, new THREE.CylinderGeometry(0.025, 0.025, 1.5, 6), wood, 0, 0.75, 0);
  put(rake, new THREE.BoxGeometry(0.4, 0.04, 0.04), iron, 0, 1.5, 0);
  for (let i = 0; i < 7; i++) put(rake, new THREE.CylinderGeometry(0.008, 0.008, 0.1, 4), iron, -0.18 + i * 0.06, 1.55, 0);
  const shovel = new THREE.Group(); shovel.position.x = 0.35; shovel.rotation.z = -0.18; g.add(shovel);
  put(shovel, new THREE.CylinderGeometry(0.025, 0.025, 1.2, 6), wood, 0, 0.85, 0);
  const blade = put(shovel, new THREE.SphereGeometry(0.15, 10, 6, 0, Math.PI), iron, 0, 0.17, 0); blade.scale.set(1, 1.4, 0.3);
  put(g, new THREE.CylinderGeometry(0.15, 0.12, 0.28, 12, 1, true), mat('#7a7f86', 0.4, { metalness: 0.5, side: THREE.DoubleSide }), -0.4, 0.14, 0.1); // watering bucket
}
function radio(parent, x, y, z, ry) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const body = put(g, new THREE.BoxGeometry(0.34, 0.22, 0.16), mat('#8a3a2a', 0.5), 0, 0.11, 0);
  void body;
  put(g, new THREE.CylinderGeometry(0.07, 0.07, 0.02, 14), mat('#d8c8a0', 0.7), -0.07, 0.11, 0.085).rotation.x = Math.PI / 2;
  for (const dx of [0.08, 0.13]) put(g, new THREE.CylinderGeometry(0.018, 0.018, 0.03, 8), mat('#e0b030', 0.4, { metalness: 0.5 }), dx, 0.13, 0.085).rotation.x = Math.PI / 2;
  const ant = put(g, new THREE.CylinderGeometry(0.004, 0.004, 0.4, 4), mat('#c0c0c0', 0.3, { metalness: 0.8 }), 0.12, 0.4, -0.04); ant.rotation.z = -0.4;
}
function pot(parent, x, y, z, flower, r) {
  const pts = [[0.12, 0], [0.15, 0.04], [0.19, 0.28], [0.21, 0.3], [0.19, 0.32]].map(([a, b]) => new THREE.Vector2(a, b));
  put(parent, new THREE.LatheGeometry(pts, 14), mat('#c06a3a', 0.85), x, y, z);
  const geo = sculpt('potplant', [
    { type: 'ell', c: [0, 0.48, 0], r: [0.2, 0.18, 0.2], mat: 'leaf', group: 'l', bone: 'x', wobble: (a, b, c) => Math.sin(a * 30) * Math.sin(b * 28) * Math.sin(c * 26) * 0.02 },
    { type: 'ell', c: [0.1, 0.6, 0.05], r: [0.12, 0.12, 0.12], mat: 'leaf', group: 'l', bone: 'x' },
  ], { l: 0.08 }, { leaf: '#4f9a38' }, { min: [-0.3, 0.25, -0.3], max: [0.3, 0.8, 0.3] }, 0.025);
  put(parent, geo, sculpted, x, y, z, r() * 6);
  if (flower) for (let i = 0; i < 5; i++) put(parent, new THREE.IcosahedronGeometry(0.04, 0), mat(flower, 0.6), x + (r() - 0.5) * 0.3, y + 0.6 + r() * 0.12, z + (r() - 0.5) * 0.3, 0, false);
}
function sign(parent, x, y, z, ry, text) {
  // crooked wooden street sign
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.set(0, ry, 0.07); parent.add(g);
  put(g, new THREE.CylinderGeometry(0.06, 0.07, 2.1, 6), mat('#7a5232', 0.9), 0, 1.05, 0);
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x2 = c.getContext('2d');
  x2.fillStyle = '#c9a66b'; x2.fillRect(0, 0, 256, 64);
  x2.strokeStyle = '#7a5232'; x2.lineWidth = 6; x2.strokeRect(3, 3, 250, 58);
  x2.fillStyle = '#3a2410'; x2.font = 'bold 30px Rubik, sans-serif'; x2.textAlign = 'center'; x2.textBaseline = 'middle'; x2.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const board = put(g, new THREE.BoxGeometry(1.1, 0.3, 0.05), [mat('#a8794a'), mat('#a8794a'), mat('#a8794a'), mat('#a8794a'), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 })], 0.45, 1.75, 0.05);
  board.rotation.z = -0.1;
}
function globeSign(parent, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  const iron = mat('#2a2c30', 0.45, { metalness: 0.5 });
  put(g, new THREE.CylinderGeometry(0.05, 0.07, 2.6, 8), iron, 0, 1.3, 0);
  put(g, new THREE.TorusGeometry(0.34, 0.02, 6, 24), iron, 0, 2.95, 0);
  put(g, new THREE.SphereGeometry(0.28, 20, 14), mat('#2f7fd0', 0.35), 0, 2.95, 0);
  const band = put(g, new THREE.TorusGeometry(0.285, 0.015, 6, 24), mat('#e0b030', 0.4, { metalness: 0.6 }), 0, 2.95, 0); band.rotation.x = Math.PI / 2;
}
function well(parent, H, physics, x, z) {
  const g = new THREE.Group(); g.position.set(x, H(x, z), z); parent.add(g);
  // stone ring (lathe) with a rim, water inside, a tiled little roof on two posts, crank and bucket
  const ring = [[1.0, 0], [1.08, 0.02], [1.1, 0.75], [1.18, 0.8], [1.18, 0.92], [0.9, 0.92], [0.88, 0.8], [0.88, 0.1]].map(([a, b]) => new THREE.Vector2(a, b));
  put(g, new THREE.LatheGeometry(ring, 24), texMat('stone', 3, 0.6), 0, 0, 0);
  const water = put(g, new THREE.CircleGeometry(0.88, 24), new THREE.MeshStandardMaterial({ color: '#1a3a4a', roughness: 0.2 }), 0, 0.45, 0, 0, false);
  water.rotation.x = -Math.PI / 2;
  const wood = texMat('wood', 0.3, 2, '#b07848');
  for (const sx of [-1, 1]) put(g, new THREE.BoxGeometry(0.14, 2.3, 0.14), wood, sx * 1.0, 1.15, 0);
  const beam = put(g, new THREE.CylinderGeometry(0.07, 0.07, 2.3, 8), wood, 0, 1.75, 0); beam.rotation.z = Math.PI / 2;
  const crank = put(g, new THREE.BoxGeometry(0.05, 0.3, 0.05), mat('#3a3a3a', 0.5), 1.18, 1.62, 0); void crank;
  const rope = put(g, new THREE.CylinderGeometry(0.012, 0.012, 0.9, 4), mat('#c9a66b', 0.9), 0, 1.3, 0); void rope;
  const bucket = put(g, new THREE.CylinderGeometry(0.17, 0.13, 0.26, 12), texMat('wood', 1, 1, '#a07040'), 0, 0.82, 0); void bucket;
  const roofG = new THREE.Group(); roofG.position.y = 2.35; g.add(roofG);
  for (const sx of [-1, 1]) {
    const slab = put(roofG, new THREE.BoxGeometry(1.0, 0.08, 2.6), texMat('roof', 1, 2), sx * 0.42, 0.25, 0); slab.rotation.z = -sx * 0.65;
  }
  put(roofG, new THREE.CylinderGeometry(0.07, 0.07, 2.7, 8), mat('#a8442c', 0.8), 0, 0.56, 0).rotation.x = Math.PI / 2;
  physics.add({ type: 'cyl', x, z, r: 1.25, top: H(x, z) + 0.95, noStand: true, seeThrough: true });
}
function curbs(parent, H) {
  // granite curb stones along both edges of each street, instanced
  const pos = [];
  for (const s of STREETS) for (let i = 0; i < s.pts.length - 1; i++) {
    const a = s.pts[i], b = s.pts[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ang = Math.atan2(b[0] - a[0], b[1] - a[1]);
    const nx = Math.cos(ang), nz = -Math.sin(ang);
    for (let d = 0; d < len; d += 0.55) {
      const t = d / len, w = (s.w[i] + (s.w[i + 1] - s.w[i]) * t) / 2 + 0.12;
      for (const side of [-1, 1]) {
        const x = a[0] + (b[0] - a[0]) * t + nx * w * side, z = a[1] + (b[1] - a[1]) * t + nz * w * side;
        if (Math.hypot(x - V.x, z - V.z) < 9.9) continue; // inside the square
        if (streetDist(x, z) < -0.05) continue;          // inside another street
        pos.push([x, H(x, z), z, ang]);
      }
    }
  }
  // a ring of curb stones around the square, open where the streets leave it
  for (let a = 0; a < Math.PI * 2; a += 0.55 / 9.4) {
    const x = V.x + Math.sin(a) * 9.4, z = V.z + Math.cos(a) * 9.4;
    if (streetDist(x, z) < 0.15) continue;
    pos.push([x, H(x, z), z, a + Math.PI / 2]);
  }
  const geo = new THREE.BoxGeometry(0.2, 0.16, 0.56, 1, 1, 1);
  const im = new THREE.InstancedMesh(geo, mat('#b9b3a8', 0.9), pos.length);
  const o = new THREE.Object3D(), c = new THREE.Color();
  pos.forEach(([x, y, z, a], i) => {
    o.position.set(x, y + 0.02, z); o.rotation.set(0, a + Math.sin(i * 1.7) * 0.03, Math.sin(i * 2.3) * 0.02); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    im.setColorAt(i, c.setRGB(1, 1, 1).multiplyScalar(0.86 + ((i * 7919) % 13) / 13 * 0.18));
  });
  im.receiveShadow = true;
  parent.add(im);
}

// ------------------------------------------------------------------ build
export function buildTown(scene, W) {
  const { physics, H } = W;
  const r = rng(77);
  W.houses = [];
  const houseInfo = {};
  const built = [];
  for (const [i, hd] of HOUSES.entries()) {
    built[i] = buildHouse({ ...hd, seed: i + 3 });
    const g = H(hd.x, hd.z);
    built[i].group.position.set(hd.x, g - 0.05, hd.z);
    built[i].group.rotation.y = hd.ry;
    scene.add(built[i].group);
    for (const c of built[i].colliders) physics.add({ type: 'box', x: hd.x, z: hd.z, hw: c.hw, hd: c.hd, rot: hd.ry, top: g + c.top, fades: true });
    const dz = built[i].door.z, dx = built[i].door.x;
    const door = { x: hd.x + Math.sin(hd.ry) * dz + Math.cos(hd.ry) * dx, z: hd.z + Math.cos(hd.ry) * dz - Math.sin(hd.ry) * dx };
    const info = { x: hd.x, z: hd.z, ry: hd.ry, w: hd.w, d: hd.d, g, door, id: hd.id };
    W.houses.push(info);
    houseInfo[hd.id] = info;
  }
  // local → world helper for a house
  const at = (id, lx, lz) => { const h = houseInfo[id]; return [h.x + Math.cos(h.ry) * lx + Math.sin(h.ry) * lz, h.z - Math.sin(h.ry) * lx + Math.cos(h.ry) * lz]; };

  well(scene, H, physics, V.x, V.z);
  W.well = { x: V.x, z: V.z };

  // Pippa's fruit stall at the edge of the square, facing the well
  {
    const sx = -47.5, sz = 0, sry = Math.atan2(V.x - sx, V.z - sz), g = H(sx, sz);
    const st = new THREE.Group(); st.position.set(sx, g, sz); st.rotation.y = sry; scene.add(st);
    const wood = texMat('wood', 1, 1, '#b07848');
    put(st, new THREE.BoxGeometry(3, 0.95, 1.1), wood, 0, 0.47, 0);
    put(st, new THREE.BoxGeometry(3.2, 0.06, 1.3), wood, 0, 0.97, 0);
    for (const px of [-1.5, 1.5]) for (const pz of [-0.5, 0.5]) put(st, new THREE.BoxGeometry(0.1, pz < 0 ? 2.5 : 2.1, 0.1), wood, px, pz < 0 ? 1.25 : 1.05, pz);
    // canvas roof sloping toward the customer, striped like the shop awning
    const cloth = new THREE.PlaneGeometry(3.4, 1.5, 6, 3);
    const cp = cloth.attributes.position;
    for (let i = 0; i < cp.count; i++) cp.setZ(i, Math.sin((cp.getX(i) / 3.4 + 0.5) * Math.PI * 6) * 0.03 - Math.abs(cp.getY(i)) * 0.0);
    cloth.computeVertexNormals();
    const cl = put(st, cloth, new THREE.MeshStandardMaterial({ color: '#e9c43a', side: THREE.DoubleSide, roughness: 0.9 }), 0, 2.3, 0.05);
    cl.rotation.x = -Math.PI / 2 + 0.3;
    const fruit = ['#e03a3a', '#f0a030', '#7ac943', '#ffd84a'];
    for (let i = 0; i < 4; i++) {
      put(st, new THREE.BoxGeometry(0.6, 0.12, 0.45), wood, -1.05 + i * 0.7, 1.06, 0.1);
      for (let k = 0; k < 6; k++) put(st, new THREE.SphereGeometry(0.07, 8, 6), mat(fruit[i], 0.6), -1.22 + i * 0.7 + (k % 3) * 0.17, 1.17, 0.02 + Math.floor(k / 3) * 0.16, 0, false);
    }
    physics.add({ type: 'box', x: sx, z: sz, hw: 1.55, hd: 0.6, rot: sry, top: g + 1.0, noStand: true, seeThrough: true });
    W.stall = { x: sx + Math.sin(sry) * 1.6, z: sz + Math.cos(sry) * 1.6, a: sry };
  }

  // static street dressing goes into one group that is merged per material at the end
  const dress = new THREE.Group(); scene.add(dress);
  // lamps around the square, at the original's four corners (the other street lamps: island.js)
  const SQUARE_LAMPS = PROPS.lamps.slice(0, 4);
  for (const [i, [x, z]] of SQUARE_LAMPS.entries()) {
    lamp(dress, x, H(x, z), z);
    if (i < 2) { const l = new THREE.PointLight('#9cc8ff', 6, 11, 2); l.position.set(x, H(x, z) + 3.1, z); scene.add(l); W.lights.push(l); }
    physics.add({ type: 'cyl', x, z, r: 0.2, top: H(x, z) + 3, seeThrough: true });
  }
  // benches facing the well
  for (const [x, z] of [[-49, -7.4], [-35.8, 2.6]]) {
    const ry = Math.atan2(V.x - x, V.z - z);
    bench(dress, x, H(x, z), z, ry);
    physics.add({ type: 'box', x, z, hw: 0.85, hd: 0.3, rot: ry, top: H(x, z) + 0.5, noStand: true, seeThrough: true });
  }
  // Twinsen's front garden: picket fence, a bench under the window, laundry, tools, a radio on the sill, pots
  const tw = houseInfo.twinsen;
  const gy = (p) => H(p[0], p[1]);
  fence(scene, H, at('twinsen', -7.0, -1.8), at('twinsen', -7.0, 5.6), r);
  fence(scene, H, at('twinsen', -7.0, 5.6), at('twinsen', 0.6, 5.6), r);
  const bp = at('twinsen', -2.3, 4.3);
  bench(dress, bp[0], gy(bp), bp[1], tw.ry);
  physics.add({ type: 'box', x: bp[0], z: bp[1], hw: 0.85, hd: 0.3, rot: tw.ry, top: gy(bp) + 0.5, noStand: true, seeThrough: true });
  W.laundry = laundry(scene, H, at('twinsen', -6.0, 4.6), at('twinsen', -6.0, -1.0), r);
  const tl = at('twinsen', -5.3, 0.3);
  tools(dress, tl[0], gy(tl), tl[1], tw.ry + Math.PI / 2);
  const rd = at('twinsen', -0.2, 3.78);
  radio(dress, rd[0], tw.g + 1.2, rd[1], tw.ry);
  for (const [lx, lz, f] of [[1.6, 4.3, '#ff5a7a'], [3.65, 4.3, '#ffd84a'], [-4.2, 4.5, null], [-0.6, 5.0, '#d06aff']]) { const p = at('twinsen', lx, lz); pot(dress, p[0], gy(p), p[1], f, r); }
  for (const [lx, lz] of [[5.3, 2.4], [5.4, 1.5]]) { const p = at('twinsen', lx, lz); barrel(dress, p[0], gy(p), p[1], r); physics.add({ type: 'cyl', x: p[0], z: p[1], r: 0.4, top: gy(p) + 1, noStand: true, seeThrough: true }); }
  { const p = at('twinsen', 5.35, 1.95); W.givers.push({ id: 'home-barrels', x: p[0], z: p[1], r: 1.6, top: 1.1, kinds: ['money', 'life', 'magic'], n: 2 }); }
  const sg = at('twinsen', 4.6, 6.0);
  sign(dress, sg[0], gy(sg), sg[1], tw.ry + 0.3, 'Bug St.');
  // shop: globe sign and barrels; low stone walls by the water office and the stone house
  const sh = at('shop', 3.9, 3.3);
  globeSign(dress, sh[0], gy(sh), sh[1]);
  physics.add({ type: 'cyl', x: sh[0], z: sh[1], r: 0.15, top: gy(sh) + 3, seeThrough: true });
  for (const [lx, lz] of [[-3.0, 3.4], [-3.4, 2.6]]) { const p = at('shop', lx, lz); barrel(dress, p[0], gy(p), p[1], r); physics.add({ type: 'cyl', x: p[0], z: p[1], r: 0.4, top: gy(p) + 1, noStand: true, seeThrough: true }); }
  { const p = at('shop', -3.2, 3.0); W.givers.push({ id: 'shop-barrels', x: p[0], z: p[1], r: 1.6, top: 1.1, kinds: ['money'], n: 3 }); }
  stoneWall(dress, H, physics, at('water', -3.4, 3.0), at('water', -3.4, 6.6));
  stoneWall(dress, H, physics, at('stone', 3.4, 0.6), at('stone', 3.4, 4.2));
  for (const [id, lx, lz] of [['pink', -2.2, 3.4], ['south', 2.6, 3.3], ['stone', -2.4, 3.2]]) { const p = at(id, lx, lz); pot(dress, p[0], gy(p), p[1], ['#ff8a3d', '#d06aff', '#ffffff'][Math.floor(r() * 3)], r); }
  curbs(dress, H);
  // all of the above is static: one mesh per material (lights stay as they are)
  mergeStatic(dress);

  // houses between the camera and Twinsen fade out (each house gets its own
  // copies of the shared materials so only that house turns see-through)
  const fades = HOUSES.map((hd, i) => {
    const h = W.houses[i], mats = new Map();
    built[i].group.traverse((o) => {
      if (!o.isMesh) return;
      if (!mats.has(o.material)) mats.set(o.material, o.material.clone());
      o.material = mats.get(o.material);
    });
    return { h, top: h.g + hd.h + built[i].gableH + 0.6, mats: [...mats.values()], f: 1 };
  });
  // each house is static: one mesh per material (after the fade materials are assigned)
  for (const b of built) mergeStatic(b.group);
  const sample = new THREE.Vector3();
  const CORRIDOR = [[0, 0.4], [0, 1.0], [0, 1.8], [-3, 1.0], [3, 1.0], [-1.5, 2.6], [1.5, 2.6]];
  const right = new THREE.Vector3();
  W.fadeOccluders = (cam, hero, dt) => {
    right.setFromMatrixColumn(cam.matrixWorld, 0).setY(0).normalize();
    for (const F of fades) {
      const { h } = F;
      let hit = false;
      // a corridor of sight lines: to Twinsen and to points 3 m either side of him, so a
      // house that would fill the foreground of the shot fades too, not only one that hides him
      for (const [ox, hy] of CORRIDOR) for (let k = 1; k < 16 && !hit; k++) {
        sample.set(hero.x + right.x * ox, hero.y + hy, hero.z + right.z * ox).lerp(cam.position, k / 16);
        const dx = sample.x - h.x, dz = sample.z - h.z;
        const lx = dx * Math.cos(h.ry) - dz * Math.sin(h.ry), lz = dx * Math.sin(h.ry) + dz * Math.cos(h.ry);
        if (Math.abs(lx) < h.w / 2 + 0.6 && Math.abs(lz) < h.d / 2 + 0.6 && sample.y < F.top) hit = true;
      }
      // A house in the way fades right out (it used to stop at 10%: its roof, walls and porch then stacked into a
      // tinted veil over half the screen, e.g. at Twinsen's own door with the camera behind the house). Once faded
      // it draws nothing (colorWrite off; it still casts its shadow). The caller passes a large dt to snap the
      // state on a scene change (Game.occluders), so a new scene never opens on a wall of roof tiles.
      const goal = hit ? 0 : 1;
      F.f += (goal - F.f) * (1 - Math.exp(-dt * 8));
      const see = F.f < 0.98, gone = F.f < 0.03;
      for (const m of F.mats) {
        if (m.transparent !== see) { m.transparent = see; m.needsUpdate = true; }
        m.opacity = see ? F.f : 1;
        m.depthWrite = !see;
        m.colorWrite = !gone;
      }
    }
  };

  // the Joint Project's heat posts: a teal pipe with brass collars and a crystal cap by every front door and at
  // Pippa's stall, fed from the station's heat line. Dark until the station runs (chapter 1, once the water is
  // back), then they glow and breathe a little warm air: the benefit the town sees before the evacuation plan.
  W.heatPosts = heatPosts(scene, W, [
    ...W.houses.map((hs) => {
      let nx = hs.door.x - hs.x, nz = hs.door.z - hs.z; const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l;
      return [hs.door.x + nx * 1.0 - nz * 1.45, hs.door.z + nz * 1.0 + nx * 1.45];
    }),
    [W.stall.x + Math.cos(W.stall.a) * 2.3, W.stall.z - Math.sin(W.stall.a) * 2.3],
  ]);
  // epilogue: bunting strung between the square's lamps (hidden until the town celebrates)
  W.bunting = bunting(scene, W, SQUARE_LAMPS);
  // laundry flutters in the wind
  W.updaters.push((dt, t) => { W.laundry.forEach((c, i) => { c.rotation.x = Math.sin(t * 2.1 + i) * 0.12 * (0.4 + W.storm); }); });
  return { houseInfo, at };
}
