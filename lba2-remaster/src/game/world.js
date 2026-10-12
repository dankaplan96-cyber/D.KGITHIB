// The island of Solmere: terrain, props, colliders, interactables.
// Everything is generated from code (no ripped assets).
import * as THREE from 'three';
import { Terrain } from '../engine/terrain.js';
import { Physics } from '../engine/physics.js';
import { ZoneSystem } from '../engine/scripts.js';
import { fbm, noise2, smoothstep, lerp, rng, distToSegment } from '../engine/math.js';
import { mat } from '../engine/rig.js';
import { textures } from '../engine/textures.js';
import { buildTown, townHeight, streetDist } from './town.js';
import { treeGeometry, rockGeometry, grassClumpGeometry, flowerGeometry, tulipGeometry } from './vegetation.js';
import { buildIsland, keepClear } from './island.js';
import { buildCliffRocks } from './cliffs.js';

export const POI = {
  start: { x: -38, z: 4 },
  village: { x: -42, z: -4 },
  harbour: { x: -68, z: -3 },
  lighthouse: { x: 2, z: -80 },
  sage: { x: 4, z: -73 },
  plateau: { x: 55, z: -25, r: 11, h: 14 },
  stonesStart: { x: 34, z: -6 },
  target: { x: 31, z: -12 },
  camp: { x: 8, z: 52 },
  chest: { x: 9, z: 57 },
  fort: { x: 48, z: 36, half: 13 },
};

// LBA2-style terraces: levels separated by steep rock cliffs
export const LEVEL0 = 2.3, LEVEL_STEP = 2.9;
export const level = (k) => LEVEL0 + LEVEL_STEP * k;

// the old (pre-terrace) flats; the town core keeps exactly these heights
const FLATS = [
  { ...POI.village, r: 20, h: 2.2 },
  { x: 8, z: 52, r: 15, h: 2.6 },
  { x: 48, z: 36, r: 16, h: 3.0 },
  { x: 2, z: -77, r: 8, h: 9.5 },
];
// harbour quay (paved, rubble embankment on the sea side) and the basin in front of it
export const QUAY = { x0: -74.5, x1: -61.5, z0: -13, z1: 7, h: 1.8 };
const BAY = { x1: QUAY.x0 - 0.1, z0: QUAY.z0 + 0.6, z1: QUAY.z1 - 0.6 };

export const PATHS = [
  [[-42, -4], [-30, -30], [-14, -55], [2, -72]],
  [[-42, -4], [-28, 18], [-6, 42], [8, 52]],
  [[8, 52], [26, 44], [32.5, 36]],
  [[-42, -4], [-12, -8], [14, -7], [33, -7]],
  [[31.5, 34], [30.5, 21], [37, 14], [34, -2]],
];

export function pathDist(x, z) {
  let d = 1e9;
  for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) d = Math.min(d, distToSegment(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]));
  return d;
}

// signed distance to an axis-aligned rectangle (negative inside)
function boxDist(x, z, x0, z0, x1, z1) {
  const dx = Math.max(x0 - x, x - x1), dz = Math.max(z0 - z, z - z1);
  return dx > 0 && dz > 0 ? Math.hypot(dx, dz) : Math.max(dx, dz);
}

// the heights the town was built on (kept verbatim in the town core)
function townCoreHeight(x, z) {
  const r = Math.hypot(x, z);
  const a = Math.atan2(z, x);
  const coast = 96 + noise2(Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + 5) * 8 + fbm(x * 0.03, z * 0.03, 2) * 4;
  const t = r / coast;
  let h = 3.2 + fbm(x * 0.018, z * 0.018) * 3.2 + fbm(x * 0.07, z * 0.07, 2) * 0.6;
  h = lerp(h, 0.6, smoothstep(0.72, 0.9, t));
  h -= smoothstep(0.88, 1.12, t) * 7;
  for (const f of FLATS) {
    const d = Math.hypot(x - f.x, z - f.z);
    h = lerp(h, f.h, 1 - smoothstep(f.r * 0.65, f.r, d));
  }
  return townHeight(x, z, h);
}
// how strongly a point belongs to the town core (houses and streets stay put)
const HOUSE_KEEP = [[-51, -15, 7], [-31.5, -16.5, 5.2], [-30, 0.5, 5.4], [-56, 3, 4.6], [-29.5, 6.5, 5], [-45, 13.5, 5.6]];
function townKeep(x, z) {
  const vd = Math.hypot(x - POI.village.x, z - POI.village.z);
  let k = 1 - smoothstep(15, 21, vd);
  for (const [hx, hz, r] of HOUSE_KEEP) k = Math.max(k, 1 - smoothstep(r, r + 2.5, Math.hypot(x - hx, z - hz)));
  if (vd < 30) k = Math.max(k, 1 - smoothstep(1.2, 3.5, streetDist(x, z)));
  // the street down to the harbour hands over to the quay
  if (x < -58) k *= smoothstep(-64, -59, x);
  return k;
}

function coastT(x, z) {
  const a = Math.atan2(z, x);
  const coast = 95 + noise2(Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + 5) * 8 + fbm(x * 0.03, z * 0.03, 2) * 4;
  return Math.hypot(x, z) / coast;
}
// sandy coves (angle sectors) instead of rock cliffs
function beachMask(x, z) {
  const a = Math.atan2(z, x);
  const sec = (c, w) => 1 - smoothstep(w * 0.6, w, Math.abs(Math.atan2(Math.sin(a - c), Math.cos(a - c))));
  return Math.max(sec(1.25, 0.32), sec(-1.15, 0.2), sec(0.35, 0.22));
}

// natural relief before terracing: higher toward the north (lighthouse) and
// the north-east (Whispering Cliffs), low toward the southern coast
function natural(x, z) {
  let n = 3.6 - z * 0.03 + x * 0.008 + fbm(x * 0.012 + 3.7, z * 0.012 - 1.2, 3) * 5.2;
  const dl = Math.hypot(x - 2, z + 79);
  n += Math.exp(-(dl * dl) / (2 * 11 * 11)) * 4;
  const t = coastT(x, z);
  n = Math.min(n, 3.3 + (0.965 - t) * 70); // the coastal band stays on the lowest terrace
  return Math.max(n, LEVEL0 - 0.9);          // nothing below the lowest terrace inland (coves are cut separately)
}
function terrace(n, x, z) {
  const u = (n - LEVEL0) / LEVEL_STEP + 0.5 + fbm(x * 0.11, z * 0.11, 2) * 0.16;
  const k = Math.floor(u), f = u - k;
  const s = smoothstep(0.93, 1.0, f);
  const cliff = s * (1 - s) * 4;
  let h = LEVEL0 + LEVEL_STEP * (k + s);
  h += cliff * fbm(x * 0.5, z * 0.5, 2) * 0.7;                        // craggy faces
  h += (1 - cliff) * fbm(x * 0.06 + 9, z * 0.06, 2) * 0.25;           // gentle undulation on the levels
  return h;
}

// everything except the path ramps
function baseHeight(x, z) {
  let h = terrace(natural(x, z), x, z);
  // coast: rock cliffs into the sea, sandy coves in a few places
  const t = coastT(x, z);
  const b = beachMask(x, z);
  const cliffCoast = lerp(h, -2.6, smoothstep(0.962, 0.99, t));
  h = lerp(cliffCoast, Math.min(h, lerp(1.1, -1.8, smoothstep(0.85, 1.0, t))), b * smoothstep(0.8, 0.86, t));
  if (t > 0.99) h = Math.max(-6, Math.min(h, -1.8 - (t - 0.99) * 30));
  // lighthouse outcrop
  {
    const d = Math.hypot(x - POI.lighthouse.x, z - POI.lighthouse.z);
    h = lerp(h, level(3) + fbm(x * 0.3, z * 0.3, 2) * 0.15, 1 - smoothstep(6.5, 8.6, d));
  }
  // project depot yard (the old camp)
  {
    const d = boxDist(x, z, POI.camp.x - 12, POI.camp.z - 9, POI.camp.x + 12, POI.camp.z + 9);
    h = lerp(h, level(0) + 0.1, 1 - smoothstep(0, 4, d));
  }
  // Funfrock's fortress on its rock
  {
    const F = POI.fort, s = F.half + 3;
    const d = boxDist(x, z, F.x - s - 3, F.z - s, F.x + s, F.z + s); // a forecourt before the west gate
    h = lerp(h, level(1), 1 - smoothstep(0, 2.2, d));
  }
  // harbour: the basin and the quay
  {
    const db = boxDist(x, z, -400, BAY.z0, BAY.x1, BAY.z1);
    h = lerp(h, -3.2, 1 - smoothstep(-0.6, 0.8, db));
    const dq = boxDist(x, z, QUAY.x0, QUAY.z0, QUAY.x1, QUAY.z1);
    h = lerp(h, QUAY.h, 1 - smoothstep(0, 3.5, dq));
    // the quay drops straight into the basin (the embankment wall hides the step)
    if (x < QUAY.x0 + 0.3 && db < 0.8) h = Math.min(h, lerp(-3.2, QUAY.h, smoothstep(QUAY.x0 - 0.6, QUAY.x0 + 0.3, x)));
  }
  // plateau ("Whispering Cliffs")
  {
    const P = POI.plateau;
    const dp = Math.hypot(x - P.x, (z - P.z) * 1.15);
    const pw = 1 - smoothstep(P.r, P.r + 2.4, dp);
    h = lerp(h, P.h + fbm(x * 0.2, z * 0.2, 2) * 0.25, pw);
  }
  return h;
}

// Path ramps: each path gets a height profile sampled along it that climbs
// at most RAMP m/m; near the path the ground follows that profile, so every
// path crosses the cliffs on a smooth ramp (cut half into the upper level,
// half built out onto the lower one).
const RAMP = 0.26, DS = 0.5;
let profiles = null;
function buildProfiles() {
  profiles = PATHS.map((p) => {
    const segs = [];
    let s0 = 0;
    for (let i = 0; i < p.length - 1; i++) { const L = Math.hypot(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]); segs.push({ a: p[i], b: p[i + 1], L, s0 }); s0 += L; }
    const n = Math.ceil(s0 / DS) + 1;
    const base = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const s = Math.min(s0, i * DS);
      const sg = segs.find((g) => s <= g.s0 + g.L + 1e-6) || segs[segs.length - 1];
      const t = (s - sg.s0) / sg.L;
      base[i] = baseHeight(sg.a[0] + (sg.b[0] - sg.a[0]) * t, sg.a[1] + (sg.b[1] - sg.a[1]) * t);
    }
    const fill = Float32Array.from(base), cut = Float32Array.from(base);
    const g = RAMP * DS;
    for (let i = 1; i < n; i++) { fill[i] = Math.max(fill[i], fill[i - 1] - g); cut[i] = Math.min(cut[i], cut[i - 1] + g); }
    for (let i = n - 2; i >= 0; i--) { fill[i] = Math.max(fill[i], fill[i + 1] - g); cut[i] = Math.min(cut[i], cut[i + 1] + g); }
    // a little smoothing so the ramps ease in and out
    let prof = fill.map((v, i) => (v + cut[i]) / 2);
    for (let pass = 0; pass < 3; pass++) prof = prof.map((v, i) => (prof[Math.max(0, i - 2)] + prof[Math.max(0, i - 1)] + v + prof[Math.min(n - 1, i + 1)] + prof[Math.min(n - 1, i + 2)]) / 5);
    return { segs, prof };
  });
}
function pathRamp(x, z, h) {
  if (!profiles) buildProfiles();
  let wsum = 0, hsum = 0, wmax = 0;
  for (const P of profiles) {
    let best = 1e9, bs = 0;
    for (const g of P.segs) {
      const dx = g.b[0] - g.a[0], dz = g.b[1] - g.a[1];
      const t = Math.max(0, Math.min(1, ((x - g.a[0]) * dx + (z - g.a[1]) * dz) / (g.L * g.L)));
      const d = Math.hypot(x - g.a[0] - dx * t, z - g.a[1] - dz * t);
      if (d < best) { best = d; bs = g.s0 + t * g.L; }
    }
    if (best > 5) continue;
    const w = 1 - smoothstep(2.3, 4.6, best);
    if (w <= 0) continue;
    const fi = bs / DS, i0 = Math.floor(fi), i1 = Math.min(P.prof.length - 1, i0 + 1);
    const ph = lerp(P.prof[i0], P.prof[i1], fi - i0);
    wsum += w; hsum += w * ph; wmax = Math.max(wmax, w);
  }
  if (wsum === 0) return h;
  return lerp(h, hsum / wsum, wmax);
}

export function islandHeight(x, z) {
  let h = pathRamp(x, z, baseHeight(x, z));
  const k = townKeep(x, z);
  if (k > 0) h = lerp(h, townCoreHeight(x, z), k);
  return h;
}
export const debugHeight = islandHeight;

// Vertex tint: subtle painterly variation + darkening in hollows (like
// LBA2's baked terrain intensity map). The texture colour comes from the splat.
let tintGrid = null;
function islandColor(x, z, h, slope, c) {
  const n = fbm(x * 0.09, z * 0.09, 3);
  const v = 0.92 + n * 0.16;
  c.setRGB(v, v, v * 0.97);
  if (h < -0.2) c.multiplyScalar(0.8);
  if (tintGrid) {
    // concave spots (cliff feet) darker, convex rims lighter
    const cv = tintGrid(x, z) - h;
    // (kept subtle: a strong darkening read as a dirty halo around every cliff foot)
    c.multiplyScalar(Math.max(0.86, Math.min(1.06, 1 + cv * -0.1)));
  }
  if (slope > 0.9) c.multiplyScalar(0.92 + Math.min(0.1, (h % LEVEL_STEP) * 0.03));
}

// Splat weights: [grass, sand, rock, dirt, cobbles]
function islandSplat(x, z, h, slope, w) {
  const n = fbm(x * 0.2, z * 0.2, 2);
  w[0] = smoothstep(0.7, 1.4, h + n * 0.3);
  w[1] = 1 - w[0];
  const beach = beachMask(x, z) * smoothstep(0.8, 0.86, coastT(x, z));
  // rock only where the ground is really steep: the cliff meshes carry the rock look, and a wider band of
  // rock-tinted terrain around them read as a blurred purple smear on the ~1 m grid
  w[2] = smoothstep(1.05, 1.4, slope + n * 0.08) * (1.6 - beach * 1.6);
  w[3] = 0; w[4] = 0;
  if (h > 0.8) {
    const pd = pathDist(x, z);
    w[3] = smoothstep(2.05, 1.55, pd + n * 0.35) * 2.4; // (a fairly clean edge, as LBA2's paths)
    const cd = boxDist(x, z, POI.camp.x - 11, POI.camp.z - 8, POI.camp.x + 11, POI.camp.z + 8);
    w[3] = Math.max(w[3], smoothstep(1.5, -1.5, cd + n * 2) * 2);
  }
  const vd = Math.hypot(x - POI.village.x, z - POI.village.z);
  w[4] = smoothstep(9.9, 9.0, vd) * 3; // the square, edged by a curb ring (town.js)
  if (vd < 30) w[4] = Math.max(w[4], smoothstep(0.35, -0.25, streetDist(x, z) + n * 0.25) * 3);
  // in town the ground between the streets is brown soil with lawns (Citadel Island)
  if (vd < 36 && h > 0.8) {
    const soil = townSoil(x, z, n) * (1 - Math.min(1, w[4] / 1.5)); // never on the paving
    w[3] = Math.max(w[3], soil * 2.5);
    w[0] *= 1 - soil * 0.95;
  }
  // the quay is paved
  if (boxDist(x, z, QUAY.x0, QUAY.z0, QUAY.x1 - 1, QUAY.z1) < 0.2 + n * 0.8 && h > 1.2) w[4] = Math.max(w[4], 3);
  const fd = Math.max(Math.abs(x - POI.fort.x), Math.abs(z - POI.fort.z));
  if (fd < POI.fort.half) w[4] = 3;
  if (boxDist(x, z, POI.fort.x - POI.fort.half - 5, POI.fort.z - 4.5, POI.fort.x - POI.fort.half + 1, POI.fort.z + 4.5) < n * 1.2) w[4] = 3; // the forecourt
  { const pave = 1 - Math.min(1, w[4] / 1.5); w[3] *= pave; w[0] *= pave; w[1] *= pave; w[2] *= pave; } // paving covers paths, soil and grass
  if (w[2] > 0) { w[0] *= 1 - Math.min(1, w[2]); w[3] *= 1 - Math.min(1, w[2]); w[1] *= 1 - Math.min(1, w[2]); }
}

// how much bare soil (vs lawn) the town ground shows at x,z
function townSoil(x, z, n = 0) {
  const vd = Math.hypot(x - POI.village.x, z - POI.village.z);
  if (vd > 36) return 0;
  const lawn = smoothstep(-0.08, 0.12, fbm(x * 0.07 + 3.1, z * 0.07 - 1.7, 2) + n * 0.15);
  return (1 - smoothstep(24, 36, vd)) * (1 - lawn);
}

// ---------- the terrain grid, checked for soft-locks ----------
const TERRAIN_SIZE = 260, TERRAIN_SEGS = 280;
export function buildHeightGrid(size, segs) {
  const n = segs + 1, half = size / 2, step = size / segs;
  const h = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) h[j * n + i] = islandHeight(-half + i * step, -half + j * step);
  const trapped = fixTraps(h, n, half, step);
  // blurred copy for the concavity tint
  const blur = new Float32Array(n * n);
  const R = 2;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let sum = 0, c = 0;
    for (let b = -R; b <= R; b++) for (let a = -R; a <= R; a++) { const ii = Math.min(n - 1, Math.max(0, i + a)), jj = Math.min(n - 1, Math.max(0, j + b)); sum += h[jj * n + ii]; c++; }
    blur[j * n + i] = sum / c;
  }
  const idx = (x, z) => Math.min(n - 1, Math.max(0, Math.round((z + half) / step))) * n + Math.min(n - 1, Math.max(0, Math.round((x + half) / step)));
  tintGrid = (x, z) => blur[idx(x, z)];
  return { heights: h, trapped, at: (x, z) => h[idx(x, z)] };
}

// Every walkable cell must be able to walk back to the town (cliffs can be
// dropped down, never climbed). Cells that cannot are pits: fill them with
// a climbable ramp from their rim until none are left.
function fixTraps(h, n, half, step) {
  const climb = step * 0.95, SEA = -0.35;
  const si = Math.round((POI.start.x + half) / step), sj = Math.round((POI.start.z + half) / step);
  let fixed = 0;
  for (let iter = 0; iter < 60; iter++) {
    const seen = new Uint8Array(n * n);
    const q = new Int32Array(n * n);
    let qh = 0, qt = 0;
    seen[sj * n + si] = 1; q[qt++] = sj * n + si;
    while (qh < qt) {
      const c = q[qh++], ci = c % n, cj = (c - ci) / n;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ai = ci + di, aj = cj + dj;
        if (ai < 0 || aj < 0 || ai >= n || aj >= n) continue;
        const a = aj * n + ai;
        if (seen[a] || h[a] < SEA) continue;
        if (h[c] - h[a] > climb) continue; // from a you could not climb up to c
        seen[a] = 1; q[qt++] = a;
      }
    }
    let changed = 0;
    for (let a = 0; a < n * n; a++) {
      if (seen[a] || h[a] < SEA) continue;
      const ai = a % n, aj = (a - ai) / n;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const bi = ai + di, bj = aj + dj;
        if (bi < 0 || bj < 0 || bi >= n || bj >= n) continue;
        const b = bj * n + bi;
        if (seen[b] && h[b] - h[a] > climb) { h[a] = h[b] - climb * 0.9; changed++; break; }
      }
    }
    fixed += changed;
    if (!changed) break;
  }
  return fixed;
}

function add(scene, geo, material, x, y, z, { rx = 0, ry = 0, rz = 0, cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = cast;
  m.receiveShadow = receive;
  scene.add(m);
  return m;
}

let W_cliffs = null;
export function buildWorld(parentScene) {
  // everything outdoors lives in one group so interiors can hide it
  const scene = new THREE.Group();
  parentScene.add(scene);
  const TX = textures();
  const grid = buildHeightGrid(TERRAIN_SIZE, TERRAIN_SEGS);
  const terrain = new Terrain({ size: TERRAIN_SIZE, segs: TERRAIN_SEGS, heightFn: grid.at, colorFn: islandColor, splatFn: islandSplat, textures: { ...TX, rock: TX.cliff } });
  tintGrid = null;
  scene.add(terrain.mesh);
  const physics = new Physics(terrain);
  const zones = new ZoneSystem();
  const H = (x, z) => terrain.heightAt(x, z);
  // faceted rock faces on the terrace cliffs (not on the path ramps or the paved quay)
  W_cliffs = buildCliffRocks(scene, terrain, TX.cliff, {
    skip: (x, z) => pathDist(x, z) < 3.2 || boxDist(x, z, QUAY.x0 - 2, QUAY.z0 - 2, QUAY.x1 + 2, QUAY.z1 + 2) < 0,
  });
  const W = {
    terrain, physics, zones, H, POI, trapFixes: grid.trapped,
    interactables: [], ballTargets: [], crates: [], updaters: [], lights: [], swayMats: [], TX, root: scene,
  };
  const rand = rng(42);

  // ---------- foliage sway shader ----------
  const swayU = { uTime: { value: 0 }, uWind: { value: 1 } };
  W.swayU = swayU;
  const sway = (m, amount) => {
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = swayU.uTime;
      sh.uniforms.uWind = swayU.uWind;
      sh.vertexShader = 'uniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #else
          vec3 ip = vec3(0.0);
        #endif
        float sw = sin(uTime * (1.3 + uWind) + ip.x * 0.31 + ip.z * 0.23) * ${amount.toFixed(3)} * uWind * max(position.y, 0.0);
        transformed.x += sw; transformed.z += sw * 0.6;`);
    };
    m.customProgramCacheKey = () => 'sway' + amount;
    return m;
  };

  // ---------- Lupin-Burg: houses, square, streets, props (see town.js) ----------
  buildTown(scene, W);
  const V = POI.village;

  // ---------- trees / grass / rocks (sculpted, instanced; see vegetation.js) ----------
  const exclusions = [
    { ...POI.village, r: 22 }, { ...POI.camp, r: 17 }, { x: POI.fort.x, z: POI.fort.z, r: 18 },
    { x: 2, z: -77, r: 10 }, { ...POI.target, r: 5 }, { x: 40, z: -14, r: 9 },
  ];
  const inHouse = (x, z, pad) => W.houses.some((h) => {
    const dx = x - h.x, dz = z - h.z, lx = dx * Math.cos(h.ry) - dz * Math.sin(h.ry), lz = dx * Math.sin(h.ry) + dz * Math.cos(h.ry);
    return Math.abs(lx) < h.w / 2 + pad && Math.abs(lz) < h.d / 2 + pad;
  });
  const okSpot = (x, z, clear = 3) => {
    const h = H(x, z);
    if (h < 1.3) return false;
    if (terrain.slopeAt(x, z) > 0.55) return false;
    for (const e of exclusions) if (Math.hypot(x - e.x, z - e.z) < e.r) return false;
    if (pathDist(x, z) < clear) return false;
    if (keepClear(x, z, 0.5)) return false;
    return true;
  };
  const trees = [];
  for (let i = 0; i < 1600 && trees.length < 300; i++) {
    const x = (rand() - 0.5) * 200, z = (rand() - 0.5) * 200;
    const forest = x > 12 && z < 22 && z > -60;
    const north = z < -30 && x < 0;
    const p = forest ? 0.75 : north ? 0.4 : 0.15;
    if (rand() > p) continue;
    if (!okSpot(x, z)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 3.0)) continue;
    const kr = rand();
    const kind = forest ? (kr < 0.55 ? 'pine' : kr < 0.8 ? 'tall' : 'round') : (kr < 0.25 ? 'pine' : kr < 0.4 ? 'tall' : kr < 0.55 ? 'fruit' : 'round');
    trees.push({ x, z, h: H(x, z), s: 0.72 + rand() * 0.35, kind, ry: rand() * 6.28 });
  }
  // a few hand-placed trees and bushes around town
  for (const [x, z, kind, s] of [[-56, -21, 'round', 1.1], [-45, -21, 'fruit', 1.0], [-38, -12, 'round', 0.9], [-26, -11, 'tall', 1.0], [-51, 9.5, 'fruit', 0.95],
    [-37, 11, 'round', 1.05], [-24, 3, 'tall', 1.1], [-60, -12, 'pine', 1.0], [-59.5, 8.5, 'round', 0.9], [-34.5, -23, 'pine', 1.1]]) trees.push({ x, z, h: H(x, z), s: s * 0.8, kind, ry: x * 1.7 });
  const bushes = [];
  for (const [x, z] of [[-54.6, -10.6], [-47.0, -18.9], [-41.8, -19.2], [-36.5, -6.5], [-33.0, 4.2], [-53.2, 6.8], [-48.6, 11.6], [-40.6, 13.8], [-27.6, -13.7], [-58.4, -1.8], [-26.5, 9.6]]) bushes.push({ x, z, h: H(x, z), s: 0.9 + ((x * 7) % 1 + 1) % 1 * 0.4, ry: z });
  for (let i = 0; i < 600 && bushes.length < 120; i++) {
    const x = (rand() - 0.5) * 190, z = (rand() - 0.5) * 190;
    if (!okSpot(x, z, 2)) continue;
    bushes.push({ x, z, h: H(x, z), s: 0.7 + rand() * 0.6, ry: rand() * 6 });
  }
  const leafMat = sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 }), 0.022);
  const tint = new THREE.Color();
  // instanced vegetation, split into 36 m tiles so the camera and the sun's shadow camera can cull
  // what they don't see (one InstancedMesh per kind covering the whole island is always drawn in full)
  const TILE = 36;
  // Distance detail per tile (from Twinsen, updated every frame in W.update): a tree tile swaps to its coarse
  // sculpt beyond LOD_NEAR (with a little hysteresis so it doesn't flicker at the boundary); grass and flower
  // tiles are hidden beyond FAR_SMALL, where a 60-triangle tuft is a fraction of a pixel.
  const LOD_NEAR = 40, FAR_SMALL = 58;
  W.lodTiles = [];
  const mkInst = (geo, m, list, shadow = true, colorFn = null, geoLo = null, small = false) => {
    const tiles = new Map();
    list.forEach((t, i) => { const k = Math.floor(t.x / TILE) + ',' + Math.floor(t.z / TILE); if (!tiles.has(k)) tiles.set(k, []); tiles.get(k).push([t, i]); });
    const o = new THREE.Object3D();
    const out = [];
    for (const part of tiles.values()) {
      // (the colour function draws random numbers: call it once per instance, both levels share the result)
      const cols = colorFn ? part.map(([t, i]) => colorFn(tint, t, i).clone?.() ?? tint.clone()) : null;
      const make = (g) => {
        const im = new THREE.InstancedMesh(g, m, part.length);
        im.castShadow = shadow; im.receiveShadow = true;
        part.forEach(([t], j) => {
          o.position.set(t.x, t.h - 0.08, t.z); o.rotation.set(0, t.ry, 0); o.scale.setScalar(t.s); o.updateMatrix();
          im.setMatrixAt(j, o.matrix);
          if (cols) im.setColorAt(j, cols[j]);
        });
        im.computeBoundingSphere();
        scene.add(im);
        out.push(im);
        return im;
      };
      const hi = make(geo);
      let lo = null;
      if (geoLo) { lo = make(geoLo); lo.visible = false; }
      const cx = part.reduce((a, [t]) => a + t.x, 0) / part.length, cz = part.reduce((a, [t]) => a + t.z, 0) / part.length;
      if (lo || small) W.lodTiles.push({ cx, cz, hi, lo, small, near: true });
    }
    return out;
  };
  W.updateLod = (focus) => {
    for (const T of W.lodTiles) {
      const d = Math.hypot(focus.x - T.cx, focus.z - T.cz);
      if (T.small) { T.hi.visible = d < FAR_SMALL; continue; }
      if (T.near && d > LOD_NEAR + 4) T.near = false; else if (!T.near && d < LOD_NEAR - 4) T.near = true;
      T.hi.visible = T.near; T.lo.visible = !T.near;
    }
  };
  const shadeVar = (c) => c.setRGB(1, 1, 1).multiplyScalar(0.88 + rand() * 0.2).offsetHSL((rand() - 0.5) * 0.03, 0, 0);
  const VARS = { round: 3, fruit: 2, tall: 2, pine: 2 };
  for (const [kind, nv] of Object.entries(VARS)) for (let v = 0; v < nv; v++) {
    const list = trees.filter((t, i) => t.kind === kind && i % nv === v);
    if (list.length) mkInst(treeGeometry(kind, v + 1), leafMat, list, true, shadeVar, treeGeometry(kind, v + 1, 1));
  }
  for (let v = 0; v < 3; v++) mkInst(treeGeometry('bush', v + 1), leafMat, bushes.filter((b, i) => i % 3 === v), true, shadeVar, treeGeometry('bush', v + 1, 1));
  for (const t of trees) physics.add({ type: 'cyl', x: t.x, z: t.z, r: 0.42 * t.s, camR: 1.5 * t.s, top: t.h + 6 * t.s, seeThrough: false });
  for (const b of bushes) physics.add({ type: 'cyl', x: b.x, z: b.z, r: 0.6 * b.s, top: b.h + 0.9 * b.s, noStand: true, seeThrough: true });
  W.trees = trees;

  // grass clumps + wild flowers (none on streets, the square or inside houses)
  const grass = [], flowers = [];
  for (let i = 0; i < 16000 && grass.length < 5200; i++) {
    const x = (rand() - 0.5) * 210, z = (rand() - 0.5) * 210;
    const h = H(x, z);
    if (h < 1.2 || terrain.slopeAt(x, z) > 0.6) continue;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 10.5) continue;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 32 && (streetDist(x, z) < 0.5 || inHouse(x, z, 0.4))) continue;
    if (Math.max(Math.abs(x - POI.fort.x), Math.abs(z - POI.fort.z)) < 11) continue;
    if (pathDist(x, z) < 1.4 || townSoil(x, z) > 0.3) continue;
    if (keepClear(x, z, -0.6)) continue;
    grass.push({ x, z, h: h + 0.06, s: 0.7 + rand() * 0.8, ry: rand() * 6.28 });
    if (rand() < 0.1) flowers.push({ x: x + 0.3, z: z + 0.2, h: H(x + 0.3, z + 0.2), s: 0.8 + rand() * 0.5, ry: rand() * 6 });
  }
  // denser grass along the house walls and fences in town
  for (let i = 0; i < 4000; i++) {
    const x = POI.village.x + (rand() - 0.5) * 50, z = POI.village.z + (rand() - 0.5) * 50;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 10.5 || streetDist(x, z) < 0.4 || inHouse(x, z, 0.25) || !inHouse(x, z, 1.4) || townSoil(x, z) > 0.5) continue;
    grass.push({ x, z, h: H(x, z) + 0.04, s: 0.8 + rand() * 0.6, ry: rand() * 6.28 });
    if (rand() < 0.15) flowers.push({ x, z, h: H(x, z), s: 0.9, ry: rand() * 6 });
  }
  const grassMat = sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }), 0.16);
  const grassTint = (c) => c.setHSL(0.27 + (rand() - 0.5) * 0.05, 0.25 + rand() * 0.2, 0.85 + rand() * 0.15).lerp(new THREE.Color(1, 1, 1), 0.6);
  for (let v = 0; v < 3; v++) mkInst(grassClumpGeometry(v + 5, 8 + v * 2), grassMat, grass.filter((g, i) => i % 3 === v), false, grassTint, null, true);
  const flowerMat = sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), 0.12);
  ['#ffd84a', '#ff6fa3', '#ffffff', '#b28cff', '#ff8a3d'].forEach((col, k) => mkInst(flowerGeometry(col), flowerMat, flowers.filter((f, i) => i % 5 === k), false, null, null, true));

  // tulip beds on the grass beside the paths and around town (dense, one colour per bed, as on LBA2's Citadel)
  const BED_COLS = ['#e8343a', '#ffd23a', '#3a6fe8', '#ff7ab0', '#f4f4f0'];
  const beds = BED_COLS.map(() => []);
  const bedOk = (x, z) => {
    const h = H(x, z);
    if (h < 1.3 || terrain.slopeAt(x, z) > 0.35) return false;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 10.8) return false;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 34 && (streetDist(x, z) < 0.7 || inHouse(x, z, 0.5))) return false;
    if (Math.max(Math.abs(x - POI.fort.x), Math.abs(z - POI.fort.z)) < 15) return false;
    if (pathDist(x, z) < 1.7 || keepClear(x, z, 0.2)) return false;
    return true;
  };
  const addBed = (cx, cz, k, n, rx, rz, rot) => {
    for (let i = 0; i < n; i++) {
      const u = (rand() - 0.5) * 2, v = (rand() - 0.5) * 2;
      if (u * u + v * v > 1) { i--; continue; }
      const x = cx + Math.cos(rot) * u * rx - Math.sin(rot) * v * rz, z = cz + Math.sin(rot) * u * rx + Math.cos(rot) * v * rz;
      if (!bedOk(x, z)) continue;
      beds[k].push({ x, z, h: H(x, z), s: 1.05 + rand() * 0.35, ry: rand() * 6.28 });
    }
  };
  let bedN = 0;
  for (const path of PATHS) {
    for (let i = 0; i < path.length - 1; i++) {
      const [x0, z0] = path[i], [x1, z1] = path[i + 1];
      const L = Math.hypot(x1 - x0, z1 - z0), tx = (x1 - x0) / L, tz = (z1 - z0) / L;
      for (let d = 3 + rand() * 3; d < L - 3; d += 5 + rand() * 4) {
        const side = rand() < 0.5 ? 1 : -1, off = 2.3 + rand() * 0.8;
        const cx = x0 + tx * d - tz * off * side, cz = z0 + tz * d + tx * off * side;
        if (!bedOk(cx, cz)) continue;
        addBed(cx, cz, bedN++ % BED_COLS.length, 34 + Math.floor(rand() * 16), 1.3 + rand() * 0.7, 0.55, Math.atan2(tz, tx));
      }
    }
  }
  // beds along the town's house fronts
  for (const hs of W.houses || []) {
    for (let k = 0; k < 2; k++) {
      const a = rand() * 6.28, r = 3.4 + rand() * 1.2;
      const cx = hs.x + Math.cos(a) * r, cz = hs.z + Math.sin(a) * r;
      if (bedOk(cx, cz)) addBed(cx, cz, bedN++ % BED_COLS.length, 24 + Math.floor(rand() * 10), 1.1, 0.45, a + Math.PI / 2);
    }
  }
  beds.forEach((list, k) => { if (list.length) mkInst(tulipGeometry(BED_COLS[k]), flowerMat, list, false); });
  W.flowerBeds = { beds: bedN, tulips: beds.reduce((a, l) => a + l.length, 0) };

  const rocks = [];
  for (let i = 0; i < 600 && rocks.length < 140; i++) {
    const x = (rand() - 0.5) * 220, z = (rand() - 0.5) * 220;
    const h = H(x, z);
    if (h < -1 || h > 13) continue;
    if (!okSpot(x, z, 2.5) && h > 1.3) continue;
    rocks.push({ x, z, h: h - 0.1, s: 0.3 + rand() * 0.8, ry: rand() * 6 });
  }
  const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  for (let v = 0; v < 3; v++) mkInst(rockGeometry(v + 1), rockMat, rocks.filter((r, i) => i % 3 === v), true, (c) => c.setRGB(1, 1, 1).multiplyScalar(0.9 + rand() * 0.15));
  for (const r of rocks) if (r.s > 0.6) physics.add({ type: 'cyl', x: r.x, z: r.z, r: r.s * 1.1, top: r.h + r.s * 0.95, seeThrough: true });

  // ---------- harbour, station, depot, pipeline, valves (see island.js) ----------
  W.signs = [];
  W.pathDist = pathDist;
  buildIsland(scene, W);

  // ---------- lighthouse ----------
  {
    const L = POI.lighthouse, g = H(L.x, L.z);
    const grp = new THREE.Group(); grp.position.set(L.x, g, L.z); scene.add(grp);
    const segH = 3.2;
    for (let i = 0; i < 5; i++) {
      const r0 = 3.0 - i * 0.3, r1 = 3.0 - (i + 1) * 0.3;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, segH, 24), mat(i % 2 ? '#d23b2f' : '#f4f1ea', { roughness: 0.6 }));
      m.position.y = segH * i + segH / 2; m.castShadow = m.receiveShadow = true; grp.add(m);
    }
    const topY = segH * 5;
    const balcony = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.3, 24), mat('#333', { metalness: 0.6 }));
    balcony.position.y = topY; grp.add(balcony);
    const lampMat = new THREE.MeshStandardMaterial({ color: '#444', emissive: '#ffefb0', emissiveIntensity: 0.05, transparent: true, opacity: 0.85 });
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 2, 16), lampMat);
    lamp.position.y = topY + 1.1; grp.add(lamp);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.4, 16), mat('#d23b2f'));
    cap.position.y = topY + 2.8; cap.castShadow = true; grp.add(cap);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.2), mat('#5a3a20'));
    door.position.set(0, 1.1, 2.95); grp.add(door);
    // the beam (visible once the Sun Lens is restored)
    const beamGeo = new THREE.ConeGeometry(4, 60, 24, 1, true);
    beamGeo.translate(0, -30, 0); beamGeo.rotateZ(Math.PI / 2);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: '#fff2c0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beam.position.y = topY + 1.1;
    grp.add(beam);
    const light = new THREE.PointLight('#ffe9b0', 0, 40, 1.5);
    light.position.y = topY + 1.1; grp.add(light);
    physics.add({ type: 'cyl', x: L.x, z: L.z, r: 3.1, top: g + 20 });
    W.lighthouse = { lampMat, beam, light, power: 0 };
    W.updaters.push((dt, t) => {
      const p = W.lighthouse.power;
      lampMat.emissiveIntensity = 0.05 + p * 6;
      beam.material.opacity = p * 0.22;
      light.intensity = p * 60;
      beam.rotation.y = t * 0.8;
    });
    // sage's hut barrels (hidden flask)
    for (const [ox, oz] of [[4.5, 2.5], [5.3, 1.6]]) {
      const bx = L.x + ox, bz = L.z + oz;
      add(scene, new THREE.CylinderGeometry(0.45, 0.4, 1.1, 12), mat('#7b5532'), bx, H(bx, bz) + 0.55, bz);
      physics.add({ type: 'cyl', x: bx, z: bz, r: 0.45, top: H(bx, bz) + 1.1, noStand: true, seeThrough: true });
    }
    W.barrels = { x: L.x + 4.9, z: L.z + 2.1 };
  }

  // ---------- Whispering Cliffs: target + rising stepping stones ----------
  {
    const P = POI.plateau, S = POI.stonesStart;
    const dx = P.x - S.x, dz = P.z - S.z;
    const dl = Math.hypot(dx, dz);
    const ux = dx / dl, uz = dz / dl;
    // the last stone stands wholly on the plateau's flat top, so you step off it onto level ground
    // (stepping onto the steep cliff face beside it would slide you back down)
    const edge = dl - (P.r - 1.4) / Math.hypot(ux, uz * 1.15);
    const base = H(S.x, S.z);
    const n = Math.ceil((P.h - base) / 1.05);
    W.stones = [];
    const stoneMat = mat('#8d8578', { roughness: 0.95 });
    const mossMat = mat('#5d8a3a', { roughness: 0.95 });
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      const wob = Math.sin(i * 1.7) * 1.2;
      const x = S.x + ux * edge * k - uz * wob, z = S.z + uz * edge * k + ux * wob;
      const top = base + 1.0 + (P.h - 0.15 - base - 1.0) * k;
      const r = 1.15;
      const grp = new THREE.Group();
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, 30, 9), stoneMat);
      pillar.position.y = -15; pillar.castShadow = pillar.receiveShadow = true; grp.add(pillar);
      const moss = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.12, 9), mossMat);
      moss.position.y = -0.05; grp.add(moss);
      const ground = H(x, z);
      grp.position.set(x, ground - 0.3, z);
      scene.add(grp);
      const c = physics.add({ type: 'cyl', x, z, r, top: ground - 0.3, enabled: false });
      W.stones.push({ grp, c, top, ground: ground - 0.3, delay: i * 0.25 });
    }
    W.stonesRisen = false;
    W.raiseStones = (instant = false) => {
      W.stonesRisen = true;
      W.stones.forEach((s) => { s.c.enabled = true; s.t = instant ? 99 : -s.delay; });
    };
    W.updaters.push((dt) => {
      if (!W.stonesRisen) return;
      for (const s of W.stones) {
        s.t += dt;
        const k = smoothstep(0, 1.4, s.t);
        const y = lerp(s.ground, s.top, k);
        s.grp.position.y = y;
        s.c.top = y;
      }
    });

    // ball target
    const T = POI.target, g = H(T.x, T.z);
    const ty = g + 1.9;
    add(scene, new THREE.CylinderGeometry(0.15, 0.2, 1.9, 8), mat('#6b4a2e'), T.x, g + 0.95, T.z);
    const ringMat = new THREE.MeshStandardMaterial({ color: '#ff8a2a', emissive: '#ff6a00', emissiveIntensity: 2.2 });
    const disc = add(scene, new THREE.TorusGeometry(0.6, 0.14, 10, 24), ringMat, T.x, ty, T.z, { ry: Math.PI / 2 });
    add(scene, new THREE.CircleGeometry(0.5, 20), mat('#f4efe2', { side: THREE.DoubleSide }), T.x, ty, T.z, { ry: Math.PI / 2 });
    physics.add({ type: 'cyl', x: T.x, z: T.z, r: 0.25, top: g + 2.4, seeThrough: true });
    W.target = { x: T.x, y: ty, z: T.z, ringMat, disc, hit: false };
    W.updaters.push((dt, t) => { if (!W.target.hit) disc.rotation.x = Math.sin(t * 2) * 0.2; });

    // shard pedestal on top of the plateau
    const pg = H(P.x, P.z);
    add(scene, new THREE.CylinderGeometry(0.8, 1.0, 1.0, 8), mat('#cfc6b4'), P.x, pg + 0.5, P.z);
    physics.add({ type: 'cyl', x: P.x, z: P.z, r: 0.9, top: pg + 1.0 });
    W.shard1Spot = { x: P.x, y: pg + 2.0, z: P.z };
    // some standing stones up there
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = P.x + Math.cos(a) * 6.5, z = P.z + Math.sin(a) * 6.5 / 1.15;
      add(scene, new THREE.BoxGeometry(0.9, 3 + (i % 2), 0.6), stoneMat, x, H(x, z) + 1.5, z, { ry: -a });
      physics.add({ type: 'cyl', x, z, r: 0.6, top: H(x, z) + 3.5 });
    }
  }

  // ---------- zones (LBA-style) ----------
  zones.add({ type: 'checkpoint', id: 'cp_village', x: V.x, z: V.z, r: 8 });
  zones.add({ type: 'checkpoint', id: 'cp_lighthouse', x: POI.sage.x, z: POI.sage.z + 3, r: 6 });
  zones.add({ type: 'checkpoint', id: 'cp_cliffs', x: POI.stonesStart.x - 3, z: POI.stonesStart.z, r: 5 });
  zones.add({ type: 'checkpoint', id: 'cp_fort', x: POI.fort.x - POI.fort.half - 6, z: POI.fort.z, r: 4 });
  zones.add({ type: 'checkpoint', id: 'cp_plateau', x: POI.plateau.x, z: POI.plateau.z, r: 6, y0: POI.plateau.h - 1 });
  zones.add({ type: 'arena', id: 'arena', x: POI.fort.x, z: POI.fort.z, hw: POI.fort.half - 1, hd: POI.fort.half - 1 });
  zones.add({ type: 'region', id: 'camp', x: POI.camp.x, z: POI.camp.z, r: 15 });
  zones.add({ type: 'hint', id: 'hint_target', x: POI.target.x - 4, z: POI.target.z + 3, r: 6, once: true });

  // hidden-object search spots
  W.searchSpots = [
    { id: 'barrels', x: W.barrels.x, z: W.barrels.z, r: 2.0, reward: 'flask' },
    { id: 'stump', x: 46, z: -2, r: 2.0, reward: 'clover' },
  ];
  W.storm = 1;
  W.update = (dt, t) => {
    swayU.uTime.value = t;
    swayU.uWind.value = 0.4 + W.storm * 1.2;
    for (const u of W.updaters) u(dt, t);
  };
  return W;
}
