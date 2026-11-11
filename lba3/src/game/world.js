// The island of Solmere: terrain, props, colliders, interactables.
// Everything is generated from code (no ripped assets).
import * as THREE from 'three';
import { shuttleTraffic } from './shuttle.js';
import { Dog, addDogs } from './dogs.js';
import { Terrain } from '../engine/terrain.js';
import { Physics } from '../engine/physics.js';
import { ZoneSystem } from '../engine/scripts.js';
import { fbm, noise2, smoothstep, lerp, rng, distToSegment } from '../engine/math.js';
import { mat } from '../engine/rig.js';
import { textures } from '../engine/textures.js';
import { buildTown, townHeight, streetDist, bugFootDist, HOUSE_PADS, HOUSE_KEEP, HOUSE_FLATS, HOUSE_PADS_PRE, HOUSE_FLATS_PRE, OLD_BUG, OLD_PINK_DZ } from './town.js';
import { treeGeometry, rockGeometry, grassClumpGeometry, flowerGeometry, tulipGeometry, palmGeometry } from './vegetation.js';
import { buildIsland, keepClear, keepClearNew, STUMP, SHIFT, ISLET, QUAY_R, plateauStairAt } from './island.js';
import { buildDinoFly } from './dinofly.js';
import { buildLighthouse, LH_STEPS, LH_STEP_W, LH_ANNEX } from './lighthouse.js';
import { buildStatue } from './statue.js';
import { buildCliffRocks, stoneColumnGeometry } from './cliffs.js';
import { setLod, LOD_DETAIL, setLodDetail, BATCH, LodBatch } from './kit.js';
import { culledToo } from '../engine/viewinst.js';
import { mergeStatic } from '../engine/merge.js';
import { COAST, LEVELS, PROPS, SHELVES, CLIFFS_TOP } from './citadel-layout.js';
import { lifeClear } from './townlife.js';
import { buildHarbourZeelich, zhClear } from './harbourzeelich.js';
import { ASYLUM_DOOR, climbPaveDist, climbClear, climbDropRock, climbShelfRows, climbRampFill, CLIMB_RAMP, CLIMB_JOG, CLIMB_STRAIGHT, CLIMB_FOOT, CLIMB_FOOT_Y } from './lba1places.js';
import { BRIDGE } from './spaceport.js';
import { HATCHES } from './sewers.js';

// the town's twelve-years-on places (townlife.js) keep the island's scatter out: an instance there is shrunk to
// nothing and gets no collider (not removed, so every later random draw, and so the rest of the island, is unchanged)
// (WORLD-80: and the west islet's dome and figure keep it out the same way)
const isletClear = (x, z) => x < -140 && (Math.hypot(x - ISLET.dome.x, z - ISLET.dome.z) < ISLET.dome.r + 1.4 || Math.hypot(x - ISLET.figure.x, z - ISLET.figure.z) < 1.8);
const clearLife = (list) => { for (const t of list) if (lifeClear(t.x, t.z) || isletClear(t.x, t.z)) { t.s = 1e-4; t.gone = true; } };

// Citadel Island follows the original LBA2 map (citadel-layout.js: the coast and four terrace levels). LAYOUT
// places that map in our frame so its town falls on ours: the town and the harbour were built first, here, and
// the original's quay wall along the west of its town lands on our quay. The terrain grid is centred on it.
export const LAYOUT = { dx: -76, dz: 16 };
export const ISLAND = { cx: -76, cz: 16 };
// HEADING-LOAD: grass, flowers and tulips drawn only where the view can show them. A small kind's pool (PERF-CALLS: one
// InstancedMesh per kind for the tiles within the small-detail distance) took every tile in reach, in view or not: on
// Citadel's street 13 draws of 91–113k triangles whatever the camera faced. Now each tile's instances are grouped in
// SUB × SUB m squares (each with a sphere round its tufts, grown by more than the sway can move them) and, before each
// frame's main render, the pool holds only the instances of the squares that touch the camera's frustum, in their old
// order (the same instances, matrices, colours and thinning; nothing that can reach the view is left out: the same
// pixels). A pool is refilled only when its set of squares changes. `on` false: every tile in reach, as before (the
// benchmark's A/B line, benchgpu.js).
// `thin` (a trade-off, OFF unless chosen: HEADING-LOAD's report): the squares further than thin.from m from Twinsen keep
// only the first thin.keep of each tile's instances (the tiles' own random order: an even thinning, as Low's).
export const SMALL_VIEW = { on: true, sub: 9, margin: 0.6, thin: null };
export const POI = {
  start: { x: -38, z: 4 },
  village: { x: -42, z: -4 },
  harbour: { x: -113.5, z: 44 },        // at the west end of the original's pier (island.js SHIFT.harbour)
  // on the northern plateau (the original's level 4, ~14 m): the project station by the old citadel's ruins at its
  // east end, the depot and the orchard toward the Wizard's lane in the west
  lighthouse: { x: -107.5, z: 90.5 },   // "at the end of the island": the south-west headland, as in the original
  sage: { x: -105.5, z: 97.5 },
  // the Whispering Cliffs: a rock stack on the plateau's southern rim, reached only by the stepping stones
  plateau: { x: -56, z: -44, r: 11, h: CLIFFS_TOP },
  stonesStart: { x: -68, z: -22 },
  target: { x: -69, z: -29 },
  camp: { x: -76, z: -70 },
  chest: { x: -75, z: -65 },
  fort: { x: -28, z: -65, half: 13 },
};

// LBA2-style terraces: levels separated by steep rock cliffs
// (CITADEL-TERRACES: the four shelves stand at the original's heights above the town — 3.76 / 7.31 / 11.08 / 13.58 m, from
// tools/worldscore/ref/citadel.json — so the steps run 3.76, 3.55, 3.77, 2.50 m instead of four of 2.9; the rock stack
// on the rim stands 2.9 m over the top shelf)
export const LEVEL0 = 2.3, LEVEL_STEP = 2.9;   // (LEVEL_STEP: the rock stack's height over its shelf)
export const level = (k) => LEVEL0 + (k ? SHELVES[k - 1] : 0);
const stepOf = (k) => SHELVES[k - 1] - (k > 1 ? SHELVES[k - 2] : 0);


// the town core keeps exactly the heights it was built on
const FLATS = [{ ...POI.village, r: 20, h: 2.2 }];
// harbour quay (paved, rubble embankment on the sea side) and the basin in front of it
// (at the west end of the original's pier; see island.js SHIFT.harbour)
const HS = SHIFT.harbour;
export const QUAY = { x0: -74.5 + HS.x, x1: -61.5 + HS.x, z0: -13 + HS.z, z1: 7 + HS.z, h: 1.8 };
// (HARBOUR-CUT: the basin is a rounded one, an ellipse 14 m × 9 m semi-axes centred 1 m off the quay face in front of
// the quay's middle, so the cut no longer runs straight on to the map's edge; the quay's corners are rounded, QUAY_R)
const BAY = { x: QUAY.x0 - 1, z: (QUAY.z0 + QUAY.z1) / 2, a: 14, b: 9 };

export const PATHS = [
  [[-42, -4], [-37, -20], [-34, -36], [-42, -50], [-48, -56]],                          // from the square up to the plateau
  [[-48, -56], [-50, -62], [-45, -65]],                                                 // to the station gate
  [[-48, -56], [-58, -66], [-64, -75], [-86, -76], [-94, -70]],                         // through the depot to the Wizard's lane
  [[-58, -66], [-70, -60], [-75, -57]],                                                 // to the orchard
  // the west street to the stepping stones (WORLD-80: from Bug Street's end round the north house of its pair)
  // (CITADEL-TERRACES: on up onto the first shelf, now 3.76 m over the town, by its own ramp to the first stone's foot)
  [[-55.6, -12.6], [-55.4, -18.8], [-58.5, -19.6], [-66.5, -20.6], [-69.4, -22.8]],
  [[-60, -4.5], [-73, -4.5]],                                                           // up onto the original's promenade above the shore
  [[-46, 31], [-60, 33], [-74, 35.5], [-90, 38], [-107.5, 39]],                        // west past the baggage-claim building to the harbour
  [[-44, 10], [-46, 40], [-45, 74], [-44.5, 79.5]],                                     // south through the fields to Twinsen's door
  [[-45, 74], [-58, 73], [-70, 88], [-86, 93], [-100, 97], [-107.5, 96.5]],             // over the bay's sand to the lighthouse
];

export function pathDist(x, z) {
  let d = 1e9;
  for (const p of PATHS) for (let i = 0; i < p.length - 1; i++) d = Math.min(d, distToSegment(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]));
  return d;
}
// WORLD-80: the scatter of trees, bushes, grass, flowers, tulip beds, rocks and the cliffs' rock faces draws its places
// from one random sequence each, so a decision that changes moves everything drawn after it, all over the island (and
// the bushes' and rocks' colliders with it). The scatter decides with the paths, the houses and the west islet's
// ground as they stood before WORLD-80 step 2; whatever now stands on the new path, in the new houses or on the
// islet's new rock face is taken out after the scatter (shrunk to nothing, no collider), as townlife's places are.
const PATHS_SCATTER = PATHS.map((p, i) => (i === 4 ? [[-58, -6], [-66, -18]] : p));
function pathDistScatter(x, z) {
  let d = 1e9;
  for (const p of PATHS_SCATTER) for (let i = 0; i < p.length - 1; i++) d = Math.min(d, distToSegment(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]));
  return d;
}
const newPathDist = (x, z) => { const p = PATHS[4]; let d = 1e9; for (let i = 0; i < p.length - 1; i++) d = Math.min(d, distToSegment(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1])); return d; };
// (POLISH-14 f) the glider field's landing (story/network.js CITADEL_LANDING): kept clear of the scattered bushes
const GLIDER_LANDING = { x: -58, z: -60 }, LANDING_CLEAR = 1.6;
const NEW_HOUSES = new Set(['bug', 'bug2', 'pink']);   // (moved or added by WORLD-80; 'bug' stood at town.js OLD_BUG; 'pink' moved by DOORS-LBA2)

// signed distance to an axis-aligned rectangle (negative inside)
function boxDist(x, z, x0, z0, x1, z1) {
  const dx = Math.max(x0 - x, x - x1), dz = Math.max(z0 - z, z - z1);
  return dx > 0 && dz > 0 ? Math.hypot(dx, dz) : Math.max(dx, dz);
}
// the same with the four corners rounded to radius r (negative inside)
function roundBoxDist(x, z, x0, z0, x1, z1, r) {
  const qx = Math.abs(x - (x0 + x1) / 2) - ((x1 - x0) / 2 - r), qz = Math.abs(z - (z0 + z1) / 2) - ((z1 - z0) / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0) - r;
}
// signed distance (first-order) to an ellipse with semi-axes a (x) and b (z), negative inside
function ellipseDist(x, z, cx, cz, a, b) {
  const dx = x - cx, dz = z - cz, k0 = Math.hypot(dx / a, dz / b), k1 = Math.hypot(dx / (a * a), dz / (b * b));
  return k1 < 1e-9 ? -Math.min(a, b) : (k0 * (k0 - 1)) / k1;
}
// the harbour quay's outline (its corners rounded: QUAY_R, island.js builds its wall, rail and coping on the same arcs)
const quayDist = (x, z) => roundBoxDist(x, z, QUAY.x0, QUAY.z0, QUAY.x1, QUAY.z1, QUAY_R);

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
function townKeep(x, z) {
  const vd = Math.hypot(x - POI.village.x, z - POI.village.z);
  let k = 1 - smoothstep(15, 21, vd);
  for (const [hx, hz, r] of HOUSE_KEEP) k = Math.max(k, 1 - smoothstep(r, r + 2.5, Math.hypot(x - hx, z - hz)));
  if (vd < 30) k = Math.max(k, 1 - smoothstep(1.2, 3.5, streetDist(x, z)));
  // the street down to the harbour hands over to the quay
  if (x < -58) k *= smoothstep(-64, -59, x);
  return k;
}

// ---------- the original layout as distance fields ----------
// Signed distance (metres, + inside) to each layer of citadel-layout.js (0 the coast, 1–4 the terrace levels),
// sampled once on a 2 m grid over the island and read back bilinearly.
const SD_STEP = 2, SD_N = 131, SD_X0 = ISLAND.cx - 130, SD_Z0 = ISLAND.cz - 130, SD_CAP = 24;
let SD = null;
function sdLayer(polys) {
  const P = polys.map((p) => {
    const xs = [], zs = [];
    for (let i = 0; i < p.length; i += 2) { xs.push(p[i] + LAYOUT.dx); zs.push(p[i + 1] + LAYOUT.dz); }
    return { xs, zs, x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
  });
  const f = new Float32Array(SD_N * SD_N);
  for (let j = 0; j < SD_N; j++) for (let i = 0; i < SD_N; i++) {
    const x = SD_X0 + i * SD_STEP, z = SD_Z0 + j * SD_STEP;
    let inside = false, d = SD_CAP;
    for (const q of P) {
      if (x < q.x0 - d || x > q.x1 + d || z < q.z0 - d || z > q.z1 + d) continue;
      const n = q.xs.length;
      let c = false;
      for (let a = 0, b = n - 1; a < n; b = a++) {
        const xa = q.xs[a], za = q.zs[a], xb = q.xs[b], zb = q.zs[b];
        if ((za > z) !== (zb > z) && x < ((xb - xa) * (z - za)) / (zb - za) + xa) c = !c;
        if (Math.max(Math.min(xa, xb) - x, x - Math.max(xa, xb), Math.min(za, zb) - z, z - Math.max(za, zb)) < d) d = Math.min(d, distToSegment(x, z, xa, za, xb, zb));
      }
      if (c) inside = true;
    }
    f[j * SD_N + i] = inside ? d : -d;
  }
  return f;
}
function sd(k, x, z) {
  SD ??= [COAST, ...LEVELS].map(sdLayer);
  const F = SD[k];
  const gx = (x - SD_X0) / SD_STEP, gz = (z - SD_Z0) / SD_STEP;
  if (gx < 0 || gz < 0 || gx >= SD_N - 1 || gz >= SD_N - 1) return -SD_CAP;
  const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j, o = j * SD_N + i;
  return (F[o] * (1 - fx) + F[o + 1] * fx) * (1 - fz) + (F[o + SD_N] * (1 - fx) + F[o + SD_N + 1] * fx) * fz;
}
// a wobble on every outline so the traced polygons read as rock and shore, not as straight edges
const jag = (x, z, s) => fbm(x * 0.07 + s, z * 0.07 - s, 3) * 2.4;
// distance inland from the shore (negative at sea)
export function coastDist(x, z) { return sd(0, x, z) + jag(x, z, 0); }
// sand where the original has it: the bay between the south-west islet and the southern hill
const BEACHES = [{ x: -2 + LAYOUT.dx, z: 80 + LAYOUT.dz, r: 18 }];
function beachMask(x, z) {
  let b = 0;
  for (const B of BEACHES) b = Math.max(b, 1 - smoothstep(B.r * 0.6, B.r, Math.hypot(x - B.x, z - B.z)));
  return b;
}

// WORLD-80: the west islet's top stands 2.2 m higher (the original's 12.1 m, our lift +1.1): its last step (level 3,
// west of ISLET_X) is a taller rock face; the great dome stands on a level floor at that height (baseHeight)
const ISLET_X = -132, ISLET_TOP = 13.2, ISLET_LIFT = ISLET_TOP - level(3);   // (13.2 m: its top as WORLD-80 set it, 2.3 + 3 × 2.9 + 2.2, whatever the shelves are)
// the layout's terraces: each level polygon adds one LBA2 step (2.9 m) with a craggy rock face at its edge
let PRE80 = false;   // (true while the scatter's copy of the ground before WORLD-80 step 2 is computed: scatterGround)
function terraces(x, z) {
  let h = LEVEL0, cliff = 0;
  for (let k = 1; k <= 4; k++) {
    const d = sd(k, x, z) + jag(x, z, k * 3.1);
    if (d < -1.2) continue;
    const s = smoothstep(-1.1, 1.1, d);
    h += (k === 3 && x < ISLET_X && !PRE80 ? stepOf(k) + ISLET_LIFT : stepOf(k)) * s;
    cliff = Math.max(cliff, s * (1 - s) * 4);
  }
  h += cliff * fbm(x * 0.5, z * 0.5, 2) * 0.7;                        // craggy faces
  h += (1 - cliff) * fbm(x * 0.06 + 9, z * 0.06, 2) * 0.25;           // gentle undulation on the levels
  return h;
}

// everything except the path ramps
function baseHeight(x, z) {
  let h = terraces(x, z);
  // (WORLD-80: the dome's floor on the islet's top, a little wider than its plinth; the coast below still cuts it)
  if (x < ISLET_X && !PRE80) { const D = ISLET.dome, d = Math.hypot(x - D.x, z - D.z); if (d < D.r + 3.4) h = lerp(h, ISLET_TOP, 1 - smoothstep(D.r + 1.3, D.r + 3.2, d)); }
  // coast: rock cliffs into the sea, sand in the bay
  const dc = coastDist(x, z), b = beachMask(x, z);
  const cliffCoast = lerp(h, -2.6, smoothstep(0.8, -1.6, dc));
  h = lerp(cliffCoast, Math.min(h, lerp(1.1, -1.8, smoothstep(6, -3, dc))), b * smoothstep(12, 7, dc));
  if (dc < -1.6) h = Math.max(-6, Math.min(h, -1.8 + (dc + 1.6) * 0.9));
  // the lighthouse's headland, and level pads under the houses outside town (Twinsen's)
  {
    const d = Math.hypot(x - POI.lighthouse.x, z - POI.lighthouse.z);
    h = lerp(h, level(1) + fbm(x * 0.3, z * 0.3, 2) * 0.15, 1 - smoothstep(6.5, 8.6, d));
    for (const p of PRE80 ? HOUSE_PADS_PRE : HOUSE_PADS) h = lerp(h, LEVEL0 + 0.05, 1 - smoothstep(p.r * 0.7, p.r, Math.hypot(x - p.x, z - p.z)));
  }
  // project depot yard (the old camp)
  {
    const d = boxDist(x, z, POI.camp.x - 12, POI.camp.z - 9, POI.camp.x + 12, POI.camp.z + 9);
    h = lerp(h, level(4) + 0.1, 1 - smoothstep(0, 4, d));
  }
  // Funfrock's fortress on its rock
  {
    const F = POI.fort, s = F.half + 3;
    const d = boxDist(x, z, F.x - s - 3, F.z - s, F.x + s, F.z + s); // a forecourt before the west gate
    h = lerp(h, level(4), 1 - smoothstep(0, 2.2, d));
  }
  // harbour: the basin and the quay
  {
    // (the basin only digs: where the sea floor is already deeper than 3.2 m it is left as it is, the old straight cut
    // lifted it to 3.2 m all the way to the map's edge and showed as a pale bar in the water)
    const db = ellipseDist(x, z, BAY.x, BAY.z, BAY.a, BAY.b);
    h = lerp(h, Math.min(h, -3.2), 1 - smoothstep(-0.6, 0.8, db));
    const dq = quayDist(x, z);
    h = lerp(h, QUAY.h, 1 - smoothstep(0, 3.5, dq));
    // the quay drops straight into the basin (the embankment wall hides the step; round the corners, too)
    if (x < QUAY.x0 + QUAY_R + 0.3 && db < 0.8) h = Math.min(h, lerp(-3.2, QUAY.h, smoothstep(0.6, -0.3, dq)));
  }
  // the Whispering Cliffs: a rock stack on the plateau's rim
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
// (WORLD-80: the ramps keep the paths and the ground as they stood before step 2 — PATHS_SCATTER, computed in PRE80 —
// so the ground by the stepping stones, from which their first step is measured, is the same metre for metre; the
// west street's new line round Bug Street's pair runs on level ground and needs no ramp of its own)
const RAMP = 0.26, DS = 0.5;
let profiles = null;
function buildProfiles(paths) {
  return paths.map((p) => {
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
  if (!profiles) { const was = PRE80; PRE80 = true; profiles = buildProfiles(PATHS); PRE80 = was; }
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

function islandHeight0(x, z) {
  let h = pathRamp(x, z, baseHeight(x, z));
  const k = townKeep(x, z);
  if (k > 0) h = lerp(h, townCoreHeight(x, z), k);
  return h;
}
// the ramp's height on its axis, as islandHeight0 had it before the fill
function rampAxisHeight(x, z) { let h = pathRamp(x, z, baseHeight(x, z)); const k = townKeep(x, z); return k > 0 ? lerp(h, townCoreHeight(x, z), k) : h; }
// WORLD-FIX: every house stands on its own level floor (town.js HOUSE_FLATS): the ground under its footprint and a
// margin round it at the height of the ground before its door, easing back to the land beyond. Applied last, so
// no ramp, rise or town noise tilts a house again. (The ground round each house was measured by tests/worldfit.mjs.)
let FLAT_LVL = null, FLAT_LVL_PRE = null;
const flatLevels = (F) => F.map((f) => islandHeight0(f.door[0], f.door[1])).map((v, i, a) => (F[i].with != null ? a[F[i].with] : v));
function houseFlats(x, z, h) {
  const FL = PRE80 ? HOUSE_FLATS_PRE : HOUSE_FLATS;
  const LV = PRE80 ? (FLAT_LVL_PRE ??= flatLevels(FL)) : (FLAT_LVL ??= flatLevels(FL));
  for (let i = 0; i < FL.length; i++) {
    const f = FL[i], dx = x - f.x, dz = z - f.z, R = f.flat + f.ease;
    if (Math.abs(dx) > f.hw + f.hd + R || Math.abs(dz) > f.hw + f.hd + R) continue;
    const ex = Math.abs(f.c * dx - f.s * dz) - f.hw, ez = Math.abs(f.s * dx + f.c * dz) - f.hd;
    const d = ex > 0 && ez > 0 ? Math.hypot(ex, ez) : Math.max(ex, ez);
    if (d < R) h = lerp(LV[i], h, smoothstep(f.flat, R, d));
  }
  return h;
}
export function islandHeight(x, z) {
  // (the climb's ramp level across to its wall, lba1places.js: after the house pads, whose ease ran under its east edge)
  return waterKnoll(x, z, climbGround(x, z, climbRampFill(x, z, houseFlats(x, z, islandHeight0(x, z)), rampAxisHeight)));
}

// REVIEW-CITADEL-ART (c): the knoll north of the water office (the first shelf's outline, its wobble, citadel-layout.js)
// ran 2 m past the office's front, so its rock face stood as a heap of blocks in the front yard, left of the door. Its
// east face is cut back to the office's front line (the face's foot on it, KNOLL_FOOT, 2.2 m up per metre back); the
// shelf itself, its south face and its top stay. The scatter and the cliff rocks decide on the ground as it stood
// (scatterGround, KNOLL_OFF: no random draw moves); the rocks of the old face are shaped on the new one.
const KNOLL_BOX = [-68.6, 15.2, -62.5, 21.4], KNOLL_FOOT = -66.2, KNOLL_Y = 2.45;
let KNOLL_OFF = false;
function waterKnoll(x, z, h) {
  if (KNOLL_OFF || x < KNOLL_BOX[0] || x > KNOLL_BOX[2] || z < KNOLL_BOX[1] || z > KNOLL_BOX[3]) return h;
  return Math.min(h, KNOLL_Y + Math.max(0, KNOLL_FOOT - x) * 2.2);
}

// CLIMB-2 (the user's photo, 5.11: the cobbles folded into a pit beside the retaining wall): the paved ramp up to the
// fort (lba1places.js CLIMB_RAMP) is one even surface. Inside its corridor the ground is the ramp's own smooth incline,
// level across: its line is the ground along the ramp's middle as it was, smoothed and never falling on the way up; it
// is the whole ground within 1.8 m of the middle (the paving, the kerbs, the wall's foot) and eases back to the land
// by 2.6 m. Past the square's kerb ring to the fork; the ground everywhere else is unchanged, and the physics walks the
// same heightfield the paving is painted on. (CLIMB_OFF: the ground as it stood before, for the scatter's view of it)
let CLIMB_OFF = false, CLIMB_PROF = null;
const CLIMB_S0 = 10.6, CLIMB_FULL = 1.8, CLIMB_EASE = 2.6, CLIMB_DS = 0.25;
const CLIMB_BOX = [-41.8, -38.4, -29.0, -11.6];   // (CLOUD_ORDERS 17: to the straight's east side, x −29.98; the scatter's view of it as it stood)
function climbLocal(x, z) {
  let best = 1e9, bs = 0, s0 = 0;
  for (let i = 0; i < CLIMB_RAMP.length - 1; i++) {
    const [ax, az] = CLIMB_RAMP[i], [bx, bz] = CLIMB_RAMP[i + 1], dx = bx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (L * L))), d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < best) { best = d; bs = s0 + t * L; }
    s0 += L;
  }
  return [bs, best, s0];
}
function climbProfile() {
  const [, , L] = climbLocal(0, 0), n = Math.ceil(L / CLIMB_DS) + 1, at = (s) => {
    let s0 = 0;
    for (let i = 0; i < CLIMB_RAMP.length - 1; i++) {
      const [ax, az] = CLIMB_RAMP[i], [bx, bz] = CLIMB_RAMP[i + 1], l = Math.hypot(bx - ax, bz - az);
      if (s <= s0 + l || i === CLIMB_RAMP.length - 2) { const t = Math.min(1, (s - s0) / l); return [ax + (bx - ax) * t, az + (bz - az) * t]; }
      s0 += l;
    }
  };
  CLIMB_OFF = true;
  let p = Array.from({ length: n }, (_, i) => islandHeight(...at(Math.min(L, i * CLIMB_DS))));
  CLIMB_OFF = false;
  for (let pass = 0; pass < 4; pass++) p = p.map((v, i) => { let a = 0, c = 0; for (let j = -6; j <= 6; j++) { const k = i + j; if (k >= 0 && k < n) { a += p[k]; c++; } } return a / c; });
  for (let i = 1; i < n; i++) p[i] = Math.max(p[i], p[i - 1]);
  return { p, L };
}
const climbProfAt = (s) => { const P = CLIMB_PROF.p, f = Math.max(0, s) / CLIMB_DS, i = Math.min(P.length - 2, Math.floor(f)); return P[i] + (P[i + 1] - P[i]) * Math.min(1, f - i); };
// CLOUD_ORDERS 17: the landing at the yard's edge, the straight on the flight's axis and the square landing at its foot
// (lba1places.js CLIMB_JOG, CLIMB_STRAIGHT, CLIMB_FOOT): the ground in them level across, rising with z from the second
// leg's own height at the landing's south edge (on with the leg's slope, so the two meet without a fold) to
// CLIMB_FOOT_Y at the foot landing's south edge, smoothed ±0.75 m, never falling on the way up; level from there under
// the first steps. Beyond their edges it eases back to the land within 1.4 m where it cuts into the land (the stump's
// bank comes down to the kerb), and within 0.6 m where it is raised over it (the yard, under the shelf's wall: the walls'
// faces stand on the terrain's grid lines there, so the paving is level to them, the ground falls away only behind them,
// and no raised ground reaches the stone house's eaves)
let CLIMB_NZ = null;
const CLIMB_NDZ = 0.25, CLIMB_NZ0 = CLIMB_JOG[3] + 1.5;
function climbNorthProfile() {
  const z0 = CLIMB_JOG[3], z1 = CLIMB_FOOT[3], [ax, az] = CLIMB_RAMP[1], [bx, bz] = CLIMB_RAMP[2];
  const at = (z) => climbLocal(ax + (bx - ax) * (z - az) / (bz - az), z)[0];
  const hs = climbProfAt(at(z0)), m0 = (hs - climbProfAt(at(z0 + 1))) / 1, hf = CLIMB_FOOT_Y;
  const n = Math.ceil((CLIMB_NZ0 - (CLIMB_STRAIGHT[1] - 1.5)) / CLIMB_NDZ) + 1;
  const raw = (z) => (z >= z0 ? hs - m0 * (z - z0) : z <= z1 ? hf : hs + (hf - hs) * (z0 - z) / (z0 - z1));
  let p = Array.from({ length: n }, (_, i) => raw(CLIMB_NZ0 - i * CLIMB_NDZ));
  for (let pass = 0; pass < 2; pass++) p = p.map((v, i) => { let a = 0, c = 0; for (let j = -3; j <= 3; j++) { const k = i + j; if (k >= 0 && k < n) { a += p[k]; c++; } } return a / c; });
  for (let i = 1; i < n; i++) p[i] = Math.max(p[i], p[i - 1]);
  return p.map((v, i) => (CLIMB_NZ0 - i * CLIMB_NDZ <= z1 - 0.75 ? hf : Math.min(v, hf)));
}
function climbNorth(x, z, h) {
  let d = Infinity;
  for (const [x0, z0, x1, z1] of [CLIMB_JOG, CLIMB_STRAIGHT, CLIMB_FOOT]) {
    const dx = Math.max(x0 - x, x - x1), dz = Math.max(z0 - z, z - z1);
    d = Math.min(d, dx > 0 && dz > 0 ? Math.hypot(dx, dz) : Math.max(dx, dz));
  }
  if (d >= 1.0) return h;
  CLIMB_NZ ??= climbNorthProfile();
  const P = CLIMB_NZ, f = Math.max(0, Math.min(P.length - 1.001, (CLIMB_NZ0 - z) / CLIMB_NDZ)), i = Math.floor(f), ph = P[i] + (P[i + 1] - P[i]) * (f - i);
  const r = smoothstep(0.1, 0.4, ph - h), w = 1 - smoothstep(lerp(0.2, 0.5, r), lerp(1.4, 0.6, r), d);
  return lerp(h, ph, w);
}
function climbGround(x, z, h) {
  if (CLIMB_OFF || PRE80 || x < CLIMB_BOX[0] || x > CLIMB_BOX[2] || z < CLIMB_BOX[1] || z > CLIMB_BOX[3]) return h;
  CLIMB_PROF ??= climbProfile();
  const [s, o, L] = climbLocal(x, z);
  let r = h;
  if (o < CLIMB_EASE && s >= CLIMB_S0 && s <= L) {
    const w = (1 - smoothstep(CLIMB_FULL, CLIMB_EASE, o)) * smoothstep(CLIMB_S0, CLIMB_S0 + 1.6, s) * (1 - smoothstep(L - 1.2, L, s));
    r = lerp(h, climbProfAt(s), w);
  }
  return climbNorth(x, z, r);
}
export const debugHeight = islandHeight;

// Vertex tint: subtle painterly variation + darkening in hollows (like
// LBA2's baked terrain intensity map). The texture colour comes from the splat.
let tintGrid = null;
function islandColor(x, z, h, slope, c) {
  const n = fbm(x * 0.09, z * 0.09, 3);
  const v = 0.92 + n * 0.16;
  // GFX-LOOK-2: the lawns read as one flat green from the street. Broad patches (~25 m) now lean a little warm and dry
  // or cool and lush, as LBA2's painted ground varies: ±5 % per channel, free (the vertex tint is there anyway)
  const d = Math.max(-1, Math.min(1, fbm(x * 0.04 + 7.3, z * 0.04 - 2.1, 2) * 1.8));
  c.setRGB(v * (1 + d * 0.05), v * (1 + d * 0.01), v * 0.97 * (1 - d * 0.06));
  if (h < -0.2) c.multiplyScalar(0.8);
  if (tintGrid) {
    // concave spots (cliff feet) darker, convex rims lighter
    const cv = tintGrid(x, z) - h;
    // (kept subtle: a strong darkening read as a dirty halo around every cliff foot)
    c.multiplyScalar(Math.max(0.86, Math.min(1.06, 1 + cv * -0.1)));
  }
  if (slope > 0.9) c.multiplyScalar(0.92 + Math.min(0.1, (h % LEVEL_STEP) * 0.03));
}

// CLIMB-1: the cliff rocks where masonry now stands (the asylum's climb, lba1places.js) are left out whole, after they are
// all drawn (so no random draw and no other rock moves): each rock is a closed solid of its own triangles, found by the
// corners they share; one that has a corner in the masonry goes, all of it. Only the triangles in box [x0, z0, x1, z1].
function dropRocks(mesh, inside, [x0, z0, x1, z1]) {
  const P = mesh.geometry.attributes.position, A = P.array, nT = P.count / 3, par = new Map(), near = [];
  const key = (i) => `${A[i * 3].toFixed(4)},${A[i * 3 + 1].toFixed(4)},${A[i * 3 + 2].toFixed(4)}`;
  const find = (k) => { let r = k; while (par.get(r) !== r) r = par.get(r); par.set(k, r); return r; };
  for (let t = 0; t < nT; t++) {
    const x = A[t * 9], z = A[t * 9 + 2];
    if (x < x0 || x > x1 || z < z0 || z > z1) continue;
    near.push(t);
    const ks = [key(t * 3), key(t * 3 + 1), key(t * 3 + 2)];
    for (const k of ks) if (!par.has(k)) par.set(k, k);
    par.set(find(ks[1]), find(ks[0])); par.set(find(ks[2]), find(ks[0]));
  }
  const gone = new Set();
  for (const t of near) for (let v = 0; v < 3; v++) { const i = t * 3 + v; if (inside(A[i * 3], A[i * 3 + 2])) gone.add(find(key(i))); }
  if (!gone.size) return 0;
  const drop = new Uint8Array(nT);
  for (const t of near) if (gone.has(find(key(t * 3)))) drop[t] = 1;
  const g = mesh.geometry, out = {};
  for (const [name, at] of Object.entries(g.attributes)) {
    const s = at.itemSize, src = at.array, dst = new Float32Array(src.length);
    let o = 0;
    for (let t = 0; t < nT; t++) if (!drop[t]) { dst.set(src.subarray(t * 3 * s, (t + 1) * 3 * s), o); o += 3 * s; }
    out[name] = new THREE.Float32BufferAttribute(dst.subarray(0, o), s);
  }
  for (const [name, at] of Object.entries(out)) g.setAttribute(name, at);
  g.computeBoundingBox(); g.computeBoundingSphere();
  return drop.reduce((a, b) => a + b, 0);
}

// Splat weights: [grass, sand, rock, dirt, cobbles]
function islandSplat(x, z, h, slope, w) {
  const n = fbm(x * 0.2, z * 0.2, 2);
  w[0] = smoothstep(0.7, 1.4, h + n * 0.3);
  w[1] = 1 - w[0];
  const beach = beachMask(x, z) * smoothstep(12, 7, coastDist(x, z));
  // rock only where the ground is really steep: the cliff meshes carry the rock look, and a wider band of
  // rock-tinted terrain around them read as a blurred purple smear on the ~1 m grid
  // (GFX-LOOK-2: from slope 0.9, was 1.05: the cliff blocks (cliffs.js) stand from slope 1.05, where this weight was
  //  still 0, so the grass ran down over their feet as a green veil; the terrain's rock edge is crisp now, so the
  //  wider band no longer reads as a smear)
  w[2] = smoothstep(0.9, 1.25, slope + n * 0.08) * (1.6 - beach * 1.6);
  w[3] = 0; w[4] = 0;
  if (h > 0.8) {
    const pd = pathDist(x, z);
    w[3] = smoothstep(2.05, 1.55, pd + n * 0.35) * 2.4; // (a fairly clean edge, as LBA2's paths)
    const cd = boxDist(x, z, POI.camp.x - 11, POI.camp.z - 8, POI.camp.x + 11, POI.camp.z + 8);
    w[3] = Math.max(w[3], smoothstep(1.5, -1.5, cd + n * 2) * 2);
  }
  const vd = Math.hypot(x - POI.village.x, z - POI.village.z);
  w[4] = smoothstep(9.9, 9.0, vd) * 3; // the square, edged by a curb ring (town.js)
  if (vd < 30) w[4] = Math.max(w[4], smoothstep(0.35, -0.25, Math.min(streetDist(x, z), bugFootDist(x, z)) + n * 0.25) * 3);   // (REVIEW-CITADEL-ART b: and Bug Street's foot)
  // CLIMB-1: the way up to the fort's terrace, paved as the streets (lba1places.js climbPaveDist)
  w[4] = Math.max(w[4], smoothstep(0.3, -0.25, climbPaveDist(x, z) + n * 0.2) * 3);
  // in town the ground between the streets is brown soil with lawns (Citadel Island)
  if (vd < 36 && h > 0.8) {
    const soil = townSoil(x, z, n) * (1 - Math.min(1, w[4] / 1.5)); // never on the paving
    w[3] = Math.max(w[3], soil * 2.5);
    w[0] *= 1 - soil * 0.95;
  }
  if (h > 1.2) {   // WA-12 (proto)
    const [soil, rock] = wildGround(x, z, n);
    w[3] = Math.max(w[3], soil * 2.5); w[0] *= 1 - soil * 0.95;
    w[2] = Math.max(w[2], rock * 1.2);
  }
  // the quay is paved
  if (Math.max(roundBoxDist(x, z, QUAY.x0, QUAY.z0, QUAY.x1 + 3, QUAY.z1, QUAY_R), x - (QUAY.x1 - 1)) < 0.2 + n * 0.8 && h > 1.2) w[4] = Math.max(w[4], 3);
  const fd = Math.max(Math.abs(x - POI.fort.x), Math.abs(z - POI.fort.z));
  if (fd < POI.fort.half) w[4] = 3;
  if (boxDist(x, z, POI.fort.x - POI.fort.half - 5, POI.fort.z - 4.5, POI.fort.x - POI.fort.half + 1, POI.fort.z + 4.5) < n * 1.2) w[4] = 3; // the forecourt
  { const pave = 1 - Math.min(1, w[4] / 1.5); w[3] *= pave; w[0] *= pave; w[1] *= pave; w[2] *= pave; } // paving covers paths, soil and grass
  if (w[2] > 0) { w[0] *= 1 - Math.min(1, w[2]); w[3] *= 1 - Math.min(1, w[2]); w[1] *= 1 - Math.min(1, w[2]); }
}

// WA-12 (proto): LBA2's Citadel is mostly bare ground outside the town: broad patches (~20 m) of brown soil and of grey
// rock showing through the grass, kept off the town, the fort and a little way off the paths. Returns [soil, rock] 0..1.
function wildGround(x, z, n = 0) {
  if (Math.hypot(x - POI.village.x, z - POI.village.z) < 40) return [0, 0];
  if (Math.max(Math.abs(x - POI.fort.x), Math.abs(z - POI.fort.z)) < POI.fort.half + 8) return [0, 0];
  const away = smoothstep(2.4, 4.5, pathDist(x, z));
  const a = fbm(x * 0.05 + 11.3, z * 0.05 - 4.2, 3) + n * 0.12, b = fbm(x * 0.045 - 6.1, z * 0.045 + 9.7, 3) + n * 0.12;
  // WA-12b (proto): no bare rock in a house's yard (the neighbour's yard was one grey slab to its door): rock only
  // 7–11 m and more from any house's walls; the soil may come closer (LBA2's houses stand in brown earth)
  let yd = 1e9;
  for (const hf of HOUSE_FLATS) { const dx = x - hf.x, dz = z - hf.z, lx = hf.c * dx - hf.s * dz, lz = hf.s * dx + hf.c * dz; yd = Math.min(yd, Math.hypot(Math.max(Math.abs(lx) - hf.hw, 0), Math.max(Math.abs(lz) - hf.hd, 0))); }
  const rock = smoothstep(0.1, 0.2, b) * away * smoothstep(7, 11, yd);
  const soil = smoothstep(0.0, 0.1, a) * (1 - rock) * Math.max(away, 0.6);
  return [soil, rock];
}

// how much bare soil (vs lawn) the town ground shows at x,z
function townSoil(x, z, n = 0) {
  const vd = Math.hypot(x - POI.village.x, z - POI.village.z);
  if (vd > 36) return 0;
  const lawn = smoothstep(-0.08, 0.12, fbm(x * 0.07 + 3.1, z * 0.07 - 1.7, 2) + n * 0.15);
  return (1 - smoothstep(24, 36, vd)) * (1 - lawn);
}

// WORLD-80: the ground as the scatter sees it (PATHS_SCATTER): the ground before step 2 where step 2 changed it — the
// west islet (its raised top, the dome's floor), Bug Street (its pair's floors, the path round them) and the stone
// house's porch — on the terrain's own grid points (computed as before; the trap filler never reached those places)
// and its own triangles (Terrain.heightAt); elsewhere the terrain itself.
const PRE80_BOXES = [[-186, -40, ISLET_X + 1, 20], [-76, -30, -46, 2], [-33, -38, -18, -24]];
function scatterGround(T) {
  const n = T.segs + 1, pre = new Map();
  const ix = (x) => Math.round((x - T.x0) / T.step), jz = (z) => Math.round((z - T.z0) / T.step);
  // (the difference before − now added to the terrain's own point, so the pit fills and the trap filler's steps stay)
  for (const [x0, z0, x1, z1] of PRE80_BOXES) {
    for (let j = Math.max(0, jz(z0)); j <= Math.min(T.segs, jz(z1)); j++) for (let i = Math.max(0, ix(x0)); i <= Math.min(T.segs, ix(x1)); i++) {
      const k = j * n + i, x = T.x0 + i * T.step, z = T.z0 + j * T.step;
      if (pre.has(k)) continue;
      PRE80 = true; const before = islandHeight(x, z); PRE80 = false;
      const d = before - islandHeight(x, z);
      if (d !== 0) pre.set(k, T.heights[k] + d);
    }
  }
  // (CLIMB-2: and the ramp's corridor as it stood before its even incline, so no random draw moves)
  {
    const [x0, z0, x1, z1] = CLIMB_BOX;
    for (let j = Math.max(0, jz(z0)); j <= Math.min(T.segs, jz(z1)); j++) for (let i = Math.max(0, ix(x0)); i <= Math.min(T.segs, ix(x1)); i++) {
      const k = j * n + i, x = T.x0 + i * T.step, z = T.z0 + j * T.step;
      if (pre.has(k)) continue;
      CLIMB_OFF = true; const before = islandHeight(x, z); CLIMB_OFF = false;
      const d = before - islandHeight(x, z);
      if (d !== 0) pre.set(k, T.heights[k] + d);
    }
  }
  // (REVIEW-CITADEL-ART c: and the water office's knoll as it stood before its east face was cut back)
  {
    const [x0, z0, x1, z1] = KNOLL_BOX;
    for (let j = Math.max(0, jz(z0)); j <= Math.min(T.segs, jz(z1)); j++) for (let i = Math.max(0, ix(x0)); i <= Math.min(T.segs, ix(x1)); i++) {
      const k = j * n + i, x = T.x0 + i * T.step, z = T.z0 + j * T.step;
      if (pre.has(k)) continue;
      KNOLL_OFF = true; const before = islandHeight(x, z); KNOLL_OFF = false;
      const d = before - islandHeight(x, z);
      if (d !== 0) pre.set(k, T.heights[k] + d);
    }
  }
  const hv = (i, j) => { i = Math.max(0, Math.min(T.segs, i)); j = Math.max(0, Math.min(T.segs, j)); const k = j * n + i; return pre.has(k) ? pre.get(k) : T.heights[k]; };
  const near = (x, z, m) => [...PRE80_BOXES, CLIMB_BOX, KNOLL_BOX].some(([x0, z0, x1, z1]) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m);
  const heightAt = (x, z) => {
    if (!near(x, z, 2)) return T.heightAt(x, z);
    const gx = (x - T.x0) / T.step, gz = (z - T.z0) / T.step, i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j;
    const h00 = hv(i, j), h10 = hv(i + 1, j), h01 = hv(i, j + 1), h11 = hv(i + 1, j + 1);
    if (fx + fz < 1) return h00 + (h10 - h00) * fx + (h01 - h00) * fz;
    return h11 + (h01 - h11) * (1 - fx) + (h10 - h11) * (1 - fz);
  };
  const slopeAt = (x, z) => {
    if (!near(x, z, 4)) return T.slopeAt(x, z);
    const e = T.step, dx = heightAt(x + e, z) - heightAt(x - e, z), dz = heightAt(x, z + e) - heightAt(x, z - e);
    return Math.hypot(dx, dz) / (2 * e);
  };
  return { heightAt, slopeAt };
}

// ---------- the terrain grid, checked for soft-locks ----------
const TERRAIN_SIZE = 260, TERRAIN_SEGS = 280;
export function buildHeightGrid(size, segs) {
  const n = segs + 1, half = size / 2, step = size / segs, X0 = ISLAND.cx - half, Z0 = ISLAND.cz - half;
  const h = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) h[j * n + i] = islandHeight(X0 + i * step, Z0 + j * step);
  // pits found by playing that the filler below misses (its 4-neighbour grid model is kinder than the real walk):
  // filled up to their rim, soft-edged (QA.md D18)
  for (const f of PIT_FILLS) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = X0 + i * step, z = Z0 + j * step, dx = Math.max(f.x0 - x, 0, x - f.x1), dz = Math.max(f.z0 - z, 0, z - f.z1);
    const w = 1 - smoothstep(0, 1.5, Math.hypot(dx, dz)), a = j * n + i;
    if (w > 0 && h[a] < f.h) h[a] += (f.h - h[a]) * w;
  }
  const trapped = fixTraps(h, n, X0, Z0, step);
  // blurred copy for the concavity tint
  const blur = new Float32Array(n * n);
  const R = 2;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let sum = 0, c = 0;
    for (let b = -R; b <= R; b++) for (let a = -R; a <= R; a++) { const ii = Math.min(n - 1, Math.max(0, i + a)), jj = Math.min(n - 1, Math.max(0, j + b)); sum += h[jj * n + ii]; c++; }
    blur[j * n + i] = sum / c;
  }
  const idx = (x, z) => Math.min(n - 1, Math.max(0, Math.round((z - Z0) / step))) * n + Math.min(n - 1, Math.max(0, Math.round((x - X0) / step)));
  tintGrid = (x, z) => blur[idx(x, z)];
  return { heights: h, trapped, at: (x, z) => h[idx(x, z)] };
}

// the gully at the plateau's edge below the orchard: a dead end 8 m deep whose banks can't be climbed (a dodge at the
// orchard's edge dropped Twinsen into it for good)
const PIT_FILLS = [{ x0: -70.5, x1: -65.5, z0: -55.5, z1: -46.5, h: level(4) }];

// Every walkable cell must be able to walk back to the town (cliffs can be
// dropped down, never climbed). Cells that cannot are pits: fill them with
// a climbable ramp from their rim until none are left.
function fixTraps(h, n, X0, Z0, step) {
  const climb = step * 0.95, SEA = -0.35;
  const si = Math.round((POI.start.x - X0) / step), sj = Math.round((POI.start.z - Z0) / step);
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
// (diagnostics: which builder made a top-level object, for tests/drawcalls.mjs)
export function tagSrc(root, from, name) { for (let i = from; i < root.children.length; i++) root.children[i].userData.src ??= name; }
// LAZY-REGIONS: the build runs in steps (a generator: each `yield` is a point where the loading screen may paint and
// move its bar; the statements and their order, so every random draw, are those of the one-piece build).
// buildWorld() runs it to the end in one go.
export function buildWorld(parentScene) { const it = buildWorldSteps(parentScene); for (;;) { const r = it.next(); if (r.done) return r.value; } }
export function* buildWorldSteps(parentScene) {
  // everything outdoors lives in one group so interiors can hide it
  const scene = new THREE.Group();
  parentScene.add(scene);
  const TX = textures();
  yield 'textures';
  const grid = buildHeightGrid(TERRAIN_SIZE, TERRAIN_SEGS);
  yield 'heights';
  const terrain = new Terrain({ size: TERRAIN_SIZE, segs: TERRAIN_SEGS, cx: ISLAND.cx, cz: ISLAND.cz, heightFn: grid.at, colorFn: islandColor, splatFn: islandSplat, textures: { ...TX, rock: TX.cliff } });
  tintGrid = null;
  scene.add(terrain.mesh);
  const physics = new Physics(terrain);
  const zones = new ZoneSystem();
  const H = (x, z) => terrain.heightAt(x, z);
  yield 'ground';
  // faceted rock faces on the terrace cliffs (not on the path ramps or the paved quay)
  // (WORLD-80: the scatter's view of the ground, as it stood before step 2: see PATHS_SCATTER)
  const SG = scatterGround(terrain), HS = SG.heightAt;
  W_cliffs = buildCliffRocks(scene, terrain, TX.cliff, {
    decide: SG,
    skip: (x, z) => pathDistScatter(x, z) < 3.2 || boxDist(x, z, QUAY.x0 - 2, QUAY.z0 - 2, QUAY.x1 + 2, QUAY.z1 + 2) < 0,
  });
  climbShelfRows(H);   // (CLOUD_ORDERS 17: the shelf's fill on this ground, so the rocks and the scatter keep out of it)
  dropRocks(W_cliffs.mesh, climbDropRock, [-45, -54, -20, -16]);   // (CLIMB-1; CLIMB-15: and the shelf's wall; CLOUD_ORDERS 17: and the new paving)
  dropRocks(W_cliffs.mesh, (x, z) => plateauStairAt(x, z), [-90, -88, -78, -78]);   // (REVIEW-CITADEL-ART d: the steps up from the plateau's door, island.js)
  const W = {
    terrain, physics, zones, H, POI, trapFixes: grid.trapped, givers: [],
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
        #elif defined( USE_BATCHING )
          vec3 ip = batchingMatrix[3].xyz;
        #else
          vec3 ip = vec3(0.0);
        #endif
        float sw = sin(uTime * (1.3 + uWind) + ip.x * 0.31 + ip.z * 0.23) * ${amount.toFixed(3)} * uWind * max(position.y, 0.0);
        transformed.x += sw; transformed.z += sw * 0.6;`);
    };
    m.customProgramCacheKey = () => 'sway' + amount;
    return m;
  };

  yield 'terrain';
  // ---------- Lupin-Burg: houses, square, streets, props (see town.js) ----------
  { const n0 = scene.children.length; buildTown(scene, W); tagSrc(scene, n0, 'town'); }
  yield 'town';
  // the statue of Twinsen and Zoé (STATUE; src/game/statue.js): the original's stands in the middle of the square,
  // where the well is now; it stands at the square's north side, facing the well
  { const n0 = scene.children.length; buildStatue(scene, W, -43.2, -10.4, Math.atan2(-42 - -43.2, -4 - -10.4)); tagSrc(scene, n0, 'statue'); }
  const V = POI.village;

  yield 'statue';
  // ---------- trees / grass / rocks (sculpted, instanced; see vegetation.js) ----------
  const exclusions = [
    { ...POI.village, r: 22 }, { ...POI.camp, r: 17 }, { x: POI.fort.x, z: POI.fort.z, r: 18 },
    { ...POI.lighthouse, r: 10 }, { ...POI.target, r: 5 }, { ...STUMP, r: 4 },
  ];
  const inHouseOf = (list) => (x, z, pad) => list.some((h) => {
    const dx = x - h.x, dz = z - h.z, lx = dx * Math.cos(h.ry) - dz * Math.sin(h.ry), lz = dx * Math.sin(h.ry) + dz * Math.cos(h.ry);
    return Math.abs(lx) < h.w / 2 + pad && Math.abs(lz) < h.d / 2 + pad;
  });
  const inHouse = inHouseOf(W.houses);
  // (WORLD-80: the scatter's view — the houses, paths and islet ground before step 2 — and what changed, filtered after)
  const SCATTER_HOUSES = W.houses.filter((h) => h.id !== 'bug2').map((h) => (h.id === 'bug' ? { ...h, ...OLD_BUG, door: null } : h.id === 'pink' ? { ...h, ry: 0, z: h.z + OLD_PINK_DZ, door: { x: h.x, z: h.z + (h.x - h.door.x) + OLD_PINK_DZ } } : h));
  const inHouseS = inHouseOf(SCATTER_HOUSES), inNewHouse = inHouseOf(W.houses.filter((h) => NEW_HOUSES.has(h.id)));
  const isletSteep = (x, z, s) => x < ISLET_X + 2 && terrain.slopeAt(x, z) > s;
  const okSpot = (x, z, clear = 3) => {
    const h = HS(x, z);
    if (h < 1.3) return false;
    if (SG.slopeAt(x, z) > 0.55) return false;
    for (const e of exclusions) if (Math.hypot(x - e.x, z - e.z) < e.r) return false;
    if (pathDistScatter(x, z) < clear) return false;
    if (keepClear(x, z, 0.5)) return false;
    return true;
  };
  const trees = [];
  // the original's trees and palms first, where they fit our island (off the paths, streets, houses and sites)
  for (const [x, z, k] of PROPS.trees) {
    const h = H(x, z);
    if (HS(x, z) < 1.0 || SG.slopeAt(x, z) > 0.6 || inHouseS(x, z, 1.6) || pathDistScatter(x, z) < 1.8 || streetDist(x, z) < 0.9 || keepClear(x, z, 1.2)) continue;
    if (physics.near(x, z).some((c) => c.enabled && c.top > h + 0.1 && physics._inside(c, x, z, 0.9))) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 2.2)) continue;
    trees.push({ x, z, h, s: k === 4 ? 0.75 : k === 1 ? 0.75 : 0.8, kind: k === 4 ? 'palm' : k === 1 ? 'tall' : 'round', ry: x * 1.3 + z, orig: true });
  }
  for (let i = 0; i < 1600 && trees.length < 300; i++) {
    const x = ISLAND.cx + (rand() - 0.5) * 200, z = ISLAND.cz + (rand() - 0.5) * 220;
    // the original's trees stand mostly on the northern plateau; a few in the fields and on the southern hill
    const forest = z < -50;
    const north = z > 80;
    const p = forest ? 0.6 : north ? 0.35 : 0.12;
    if (rand() > p) continue;
    if (!okSpot(x, z)) continue;
    if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 3.0)) continue;
    const kr = rand();
    const kind = forest ? (kr < 0.55 ? 'pine' : kr < 0.8 ? 'tall' : 'round') : (kr < 0.25 ? 'pine' : kr < 0.4 ? 'tall' : kr < 0.55 ? 'fruit' : 'round');
    trees.push({ x, z, h: H(x, z), s: 0.72 + rand() * 0.35, kind, ry: rand() * 6.28 });
  }
  // a few hand-placed trees and bushes around town
  for (const [x, z, kind, s] of [[-56, -21, 'round', 1.1], [-45, -21, 'fruit', 1.0], [-38, -12, 'round', 0.9], [-26, -11, 'tall', 1.0], [-51, 9.5, 'fruit', 0.95],
    [-37, 11, 'round', 1.05], [-24, 3, 'tall', 1.1], [-60, -12, 'pine', 1.0], [-59.5, 8.5, 'round', 0.9], [-34.5, -23, 'pine', 1.1]]) if (!inHouseS(x, z, 1.2) && !trees.some((t) => Math.hypot(t.x - x, t.z - z) < 2.5)) trees.push({ x, z, h: H(x, z), s: s * 0.8, kind, ry: x * 1.7 });
  const bushes = [];
  for (const [x, z] of [[-54.6, -10.6], [-47.0, -18.9], [-41.8, -19.2], [-36.5, -6.5], [-33.0, 4.2], [-53.2, 6.8], [-48.6, 11.6], [-40.6, 13.8], [-27.6, -13.7], [-58.4, -1.8], [-26.5, 9.6]]) if (!inHouseS(x, z, 0.8)) bushes.push({ x, z, h: H(x, z), s: 0.9 + ((x * 7) % 1 + 1) % 1 * 0.4, ry: z });
  for (let i = 0; i < 600 && bushes.length < 120; i++) {
    const x = ISLAND.cx + (rand() - 0.5) * 190, z = ISLAND.cz + (rand() - 0.5) * 210;
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
  // trees, palms, bushes and rocks go into one BatchedMesh per material where the browser can draw it in one call
  // (kit.js LodBatch); the tiles below remain for grass and flowers, and for everything without WEBGL_multi_draw
  W.batches = [];
  const batchFor = (m) => { let b = W.batches.find((x) => x.mat === m); if (!b) { b = new LodBatch(scene, m); W.batches.push(b); } return b; };
  const _bm = new THREE.Matrix4(), _bq = new THREE.Quaternion(), _be = new THREE.Euler(), _bp = new THREE.Vector3(), _bs = new THREE.Vector3();
  // PERF-CALLS: grass, flowers and tulips: the tiles near Twinsen in ONE InstancedMesh per kind (geometry and
  // material), refilled from the tiles' own instances whenever a tile comes within or goes beyond the small-detail
  // distance (or the preset's share of them changes). On the street at Medium 27 tile draws were 5–10 kinds × the
  // 4–6 tiles in reach; now one per kind. The same instances (matrices, colours, the preset's even thinning), the
  // same material and its sway; tiles in reach but out of the view now go to the GPU too (60–100 vertices a tuft).
  W.smallPools = [];
  const smallPool = (g, m) => {
    let P = W.smallPools.find((x) => x.g === g && x.m === m);
    if (!P) { P = { g, m, tiles: [], im: null, dirty: true }; W.smallPools.push(P); }
    return P;
  };
  const fillPools = () => {
    for (const P of W.smallPools) {
      if (!P.im) {
        const cap = P.tiles.reduce((a, t) => a + t.instanceMatrix.count, 0);
        P.im = new THREE.InstancedMesh(P.g, P.m, Math.max(1, cap)); P.im.castShadow = false; P.im.receiveShadow = true; P.im.count = 0; P.im.name = 'smallPool';
        // (HEADING-LOAD: the pool holds only what is in view (viewPools, below), refilled at the render itself; three's own
        //  sphere test and drawcull.js's BoxCull — which runs before the refill, with the last frame's content — are left
        //  out: either could hide a pool for a frame just as squares that came into view were put into it)
        P.im.frustumCulled = !SMALL_VIEW.on; culledToo(P.im);
        if (P.tiles.some((t) => t.instanceColor)) P.im.setColorAt(0, new THREE.Color(1, 1, 1));
        scene.add(P.im);
      }
      if (!P.dirty) continue;
      P.dirty = false;
      const M = P.im.instanceMatrix.array, C = P.im.instanceColor?.array;
      let k = 0;
      for (const t of P.tiles) {
        if (!t.visible) continue;
        const n = t.count, V = t.userData.view, mask = SMALL_VIEW.on && V ? V.mask : -1, far = mask !== -1 && SMALL_VIEW.thin ? V.far & mask : 0;
        if (mask === 0) continue;
        if ((mask === -1 || mask === V.all) && !far) {
          M.set(t.instanceMatrix.array.subarray(0, n * 16), k * 16);
          if (C && t.instanceColor) C.set(t.instanceColor.array.subarray(0, n * 3), k * 3);
          k += n; continue;
        }
        // (HEADING-LOAD: the instances of the squares in view, in their order)
        const TM = t.instanceMatrix.array, TC = t.instanceColor?.array, sub = V.sub, nk = far ? Math.round(n * SMALL_VIEW.thin.keep) : n;
        for (let i = 0; i < n; i++) {
          const b = 1 << sub[i];
          if (!(mask & b) || (i >= nk && far & b)) continue;
          M.set(TM.subarray(i * 16, i * 16 + 16), k * 16);
          if (C && TC) C.set(TC.subarray(i * 3, i * 3 + 3), k * 3);
          k++;
        }
      }
      P.im.count = k; P.im.visible = k > 0;
      P.im.instanceMatrix.needsUpdate = true; if (P.im.instanceColor) P.im.instanceColor.needsUpdate = true;
      if (k) { P.im.computeBoundingSphere(); P.im.computeBoundingBox(); }
    }
  };
  W.fillPools = fillPools;
  // HEADING-LOAD (SMALL_VIEW, above): a tile's squares — for each instance the square it is in, and per square a sphere
  // round its instances (each instance's bounding sphere at its scale, plus the sway's reach)
  const viewSquares = (part, g) => {
    if (!g.boundingSphere) g.computeBoundingSphere();
    const S = SMALL_VIEW.sub, gs = g.boundingSphere, sub = new Uint8Array(part.length), box = new Map();
    let x0 = Infinity, z0 = Infinity;
    for (const [t] of part) { x0 = Math.min(x0, t.x); z0 = Math.min(z0, t.z); }
    part.forEach(([t], j) => {
      const i = Math.min(3, Math.floor((t.x - x0) / S)), k = Math.min(3, Math.floor((t.z - z0) / S)), q = i * 4 + k;   // (a tile is 36 m: 4 × 4 squares; the last row takes any rest)
      sub[j] = q;
      const r = (gs.radius + gs.center.length()) * t.s + SMALL_VIEW.margin, y = t.h - 0.08;
      let b = box.get(q); if (!b) box.set(q, (b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]));
      b[0] = Math.min(b[0], t.x - r); b[1] = Math.min(b[1], y - r); b[2] = Math.min(b[2], t.z - r); b[3] = Math.max(b[3], t.x + r); b[4] = Math.max(b[4], y + r); b[5] = Math.max(b[5], t.z + r);
    });
    const spheres = [];
    let all = 0;
    for (const [q, b] of box) { all |= 1 << q; spheres.push({ q, s: new THREE.Sphere(new THREE.Vector3((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2), Math.hypot(b[3] - b[0], b[4] - b[1], b[5] - b[2]) / 2) }); }
    return { sub, spheres, all, mask: all, far: 0 };
  };
  // before each render of the scene with a perspective camera (three calls the scene's onBeforeRender with this frame's
  // camera matrices, before it builds the render list and uploads the instances): each tile in reach, its squares in view
  const _vf = new THREE.Frustum(), _vm = new THREE.Matrix4();
  W.viewPools = (camera) => {
    if (!SMALL_VIEW.on || !scene.visible || !camera?.isPerspectiveCamera) return;
    _vf.setFromProjectionMatrix(_vm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    let any = false;
    const TH = SMALL_VIEW.thin, F = W.lodFocus;
    for (const P of W.smallPools) {
      for (const t of P.tiles) {
        const V = t.userData.view; if (!V || !t.visible) continue;
        let mask = 0, far = 0;
        for (const { q, s } of V.spheres) if (_vf.intersectsSphere(s)) mask |= 1 << q;
        // (the thinning's squares by their centre's distance from Twinsen, 2 m either way before one changes)
        if (TH && F) for (const { q, s } of V.spheres) { const d = Math.hypot(s.center.x - F.x, s.center.z - F.z), was = V.far & (1 << q); if (was ? d > TH.from - 2 : d > TH.from + 2) far |= 1 << q; }
        if (mask !== V.mask || far !== V.far) { V.mask = mask; V.far = far; P.dirty = true; any = true; }
      }
    }
    if (any) fillPools();
  };
  W.setSmallView = (on) => { SMALL_VIEW.on = !!on; for (const P of W.smallPools) { if (P.im) P.im.frustumCulled = !SMALL_VIEW.on; P.dirty = true; for (const t of P.tiles) if (t.userData.view) t.userData.view.mask = t.userData.view.all; } fillPools(); };
  { const before = parentScene.onBeforeRender; parentScene.onBeforeRender = function (r, sc, camera, ...a) { before.call(this, r, sc, camera, ...a); W.viewPools(camera); }; }
  // (WORLD-ART-6: LBA2's Citadel trees have broad, chunky crowns: round 3.2 m wide against our 2.7, tall 3.0 against 2.2,
  //  measured from the original's models; the crown (and trunk) widened across, the height kept)
  const CROWN = { round: 1.18, tall: 1.3, fruit: 1.15 };
  const mkInst = (geo, m, list, shadow = true, colorFn = null, geoLo = null, small = false) => {
    const tiles = new Map();
    if (BATCH.on && geoLo && shadow && !small) {
      // (same tile order as below for the colour function's random draws, so the rest of the island is unchanged)
      list.forEach((t) => { const k = Math.floor(t.x / TILE) + ',' + Math.floor(t.z / TILE); if (!tiles.has(k)) tiles.set(k, []); tiles.get(k).push(t); });
      const B = batchFor(m);
      for (const part of tiles.values()) {
        const cols = colorFn ? part.map((t, i) => colorFn(tint, t, i).clone?.() ?? tint.clone()) : null;
        part.forEach((t, j) => {
          if (t.gone) return;
          _bm.compose(_bp.set(t.x, t.h - 0.08, t.z), _bq.setFromEuler(_be.set(0, t.ry, 0)), _bs.set(t.s * (CROWN[t.kind] ?? 1), t.s, t.s * (CROWN[t.kind] ?? 1)));
          B.add(geo, geoLo, _bm, cols ? cols[j] : null);
        });
      }
      return [];
    }
    list.forEach((t, i) => { const k = Math.floor(t.x / TILE) + ',' + Math.floor(t.z / TILE); if (!tiles.has(k)) tiles.set(k, []); tiles.get(k).push([t, i]); });
    const o = new THREE.Object3D();
    const out = [];
    for (const part of tiles.values()) {
      // grass and flowers in a random order within the tile (tulips come bed by bed), so that drawing only the
      // first part of them on Low thins them evenly (its own random stream: the island's draws are unchanged)
      if (small) { const r = rng(part.length * 7 + 1); for (let i = part.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [part[i], part[j]] = [part[j], part[i]]; } }
      // (the colour function draws random numbers: call it once per instance, both levels share the result)
      const cols = colorFn ? part.map(([t, i]) => colorFn(tint, t, i).clone?.() ?? tint.clone()) : null;
      const make = (g) => {
        const im = new THREE.InstancedMesh(g, m, part.length);
        im.castShadow = shadow; im.receiveShadow = true;
        part.forEach(([t], j) => {
          o.position.set(t.x, t.h - 0.08, t.z); o.rotation.set(0, t.ry, 0); o.scale.set(t.s * (CROWN[t.kind] ?? 1), t.s, t.s * (CROWN[t.kind] ?? 1)); o.updateMatrix();
          im.setMatrixAt(j, o.matrix);
          if (cols) im.setColorAt(j, cols[j]);
        });
        im.computeBoundingSphere();
        if (small) { smallPool(g, m).tiles.push(im); im.userData.view = viewSquares(part, g); } else scene.add(im);   // (PERF-CALLS: a small tile is drawn through its pool)
        out.push(im);
        return im;
      };
      const hi = make(geo);
      let lo = null;
      if (geoLo) lo = make(geoLo);
      const cx = part.reduce((a, [t]) => a + t.x, 0) / part.length, cz = part.reduce((a, [t]) => a + t.z, 0) / part.length;
      if (lo || small) { const T = { cx, cz, hi, lo, small, near: true, n: part.length }; if (lo) setLod(T, true); W.lodTiles.push(T); }
    }
    return out;
  };
  // (shadow distance of small props and the view-frustum test for every caster: engine/shadowcull.js)
  // the distances follow the graphics preset (kit.js LOD_PRESETS: High 40 / 58 m as before, Medium 34 / 46 m,
  // Low 18 / 26 m and half of the grass and flowers: PERF-BATTERY-2); W.setDetail(quality) applies one
  W.detail = { treeNear: LOD_NEAR, smallFar: FAR_SMALL };
  W.setDetail = (q) => {
    setLodDetail(q);
    W.detail = { treeNear: LOD_DETAIL.near, smallFar: LOD_DETAIL.smallFar, small: LOD_DETAIL.small };
    // fewer grass tufts and flowers: the instances are in random order, so the first part is an even thinning
    for (const T of W.lodTiles) if (T.small) T.hi.count = Math.max(1, Math.round(T.n * LOD_DETAIL.small));
    for (const P of W.smallPools) P.dirty = true;
    fillPools();
    for (const T of W.lodTiles) if (!T.small) setLod(T, T.near);
  };
  W.lodFocus = null;
  W.setSmallThin = (thin) => { SMALL_VIEW.thin = thin || null; for (const P of W.smallPools) { P.dirty = true; for (const t of P.tiles) if (t.userData.view) t.userData.view.far = 0; } fillPools(); };
  W.updateLod = (focus) => {
    W.lodFocus = focus;
    const near = LOD_DETAIL.near, far = LOD_DETAIL.smallFar;
    for (const B of W.batches) B.update(focus, near);
    for (const T of W.lodTiles) {
      const d = Math.hypot(focus.x - T.cx, focus.z - T.cz);
      if (T.small) { const v = d < far; if (T.hi.visible !== v) { T.hi.visible = v; T.pool ??= W.smallPools.find((P) => P.tiles.includes(T.hi)); if (T.pool) T.pool.dirty = true; } continue; }
      const was = T.near;
      if (T.near && d > near + 4) T.near = false; else if (!T.near && d < near - 4) T.near = true;
      if (T.near !== was) setLod(T, T.near);
    }
    fillPools();
    // (the small props' shadow distance now lives in engine/shadowcull.js, with the view-frustum test)
  };
  const shadeVar = (c) => c.setRGB(1, 1, 1).multiplyScalar(0.88 + rand() * 0.2).offsetHSL((rand() - 0.5) * 0.03, 0, 0);
  clearLife(trees); clearLife(bushes);
  // (WORLD-FIX / R6: the way out of every house door stays open — no tree or bush in a 4 m lane straight out of it for
  //  11 m, so the first steps out of a door are never into a bush. Filtered after the scatter: no random draw moves.)
  const doorLane = (x, z, pad) => W.houses.some((h) => {
    if (!h.door) return false;
    const nx = Math.sin(h.ry), nz = Math.cos(h.ry);   // (the front wall's outward normal: the door is in the front wall)
    const dx = x - h.door.x, dz = z - h.door.z, along = dx * nx + dz * nz, across = Math.abs(dx * nz - dz * nx);
    return along > -0.5 && along < 11 && across < 2 + pad;
  });
  for (const t of trees) if (!t.gone && doorLane(t.x, t.z, 0.45 * t.s)) { t.s = 1e-4; t.gone = true; }
  for (const b of bushes) if (!b.gone && doorLane(b.x, b.z, 0.6 * b.s)) { b.s = 1e-4; b.gone = true; }
  // (WORLD-80: off the new path to the stepping stones, out of Bug Street's pair and the stone house's porch, off the
  // islet's raised rock face)
  for (const t of trees) if (!t.gone && (newPathDist(t.x, t.z) < 2.2 || inNewHouse(t.x, t.z, 1.4) || isletSteep(t.x, t.z, 0.55) || keepClearNew(t.x, t.z, 0.5))) { t.s = 1e-4; t.gone = true; }
  for (const b of bushes) if (!b.gone && (newPathDist(b.x, b.z) < 1.9 || inNewHouse(b.x, b.z, 0.9) || isletSteep(b.x, b.z, 0.55) || keepClearNew(b.x, b.z, 0.3))) { b.s = 1e-4; b.gone = true; }
  // (WA-15: none where the harbour front's Zeelich buildings stand)
  for (const t of trees) if (!t.gone && zhClear(t.x, t.z, 0.6 + 0.42 * t.s)) { t.s = 1e-4; t.gone = true; }
  for (const b of bushes) if (!b.gone && zhClear(b.x, b.z, 0.3 + 0.6 * b.s)) { b.s = 1e-4; b.gone = true; }
  // (CLIMB-1: none in the climb's masonry or on its paved terrace, lba1places.js)
  for (const t of trees) if (!t.gone && climbClear(t.x, t.z, 0.6 + 0.42 * t.s)) { t.s = 1e-4; t.gone = true; }
  for (const b of bushes) if (!b.gone && climbClear(b.x, b.z, 0.3 + 0.6 * b.s)) { b.s = 1e-4; b.gone = true; }
  // (BENCHES-1: the original's benches, citadel-layout.js PROPS.benches, keep their room: no scattered bush and no
  //  scattered tree's trunk within 1.2 m of one — a bush stood 0.9 m before the harbour path's bench, a pine's trunk before
  //  the lighthouse's. The original's own trees stay; filtered after the scatter, so no random draw moves)
  const benchRoom = (x, z, pad) => PROPS.benches.some(([bx, bz, f]) => {
    const ry = f * Math.PI / 2, dx = x - bx, dz = z - bz, u = dx * Math.cos(ry) - dz * Math.sin(ry), v = dx * Math.sin(ry) + dz * Math.cos(ry);
    return Math.abs(u) < 0.85 + 1.2 + pad && Math.abs(v) < 0.3 + 1.2 + pad;
  });
  for (const t of trees) if (!t.gone && !t.orig && benchRoom(t.x, t.z, 0.42 * t.s)) { t.s = 1e-4; t.gone = true; }
  for (const b of bushes) if (!b.gone && benchRoom(b.x, b.z, 0.6 * b.s)) { b.s = 1e-4; b.gone = true; }
  // (POLISH-14 f: the glider field's landing, story/network.js CITADEL_LANDING and evacuation.js LANDING, where he
  //  steps down from the glider: no scattered bush within LANDING_CLEAR m of it — two stood on it, their colliders
  //  over the spot he is put on. Filtered after the scatter, so no random draw moves)
  for (const b of bushes) if (!b.gone && Math.hypot(b.x - GLIDER_LANDING.x, b.z - GLIDER_LANDING.z) < LANDING_CLEAR + 0.6 * b.s) { b.s = 1e-4; b.gone = true; }
  // TREES-1 (the user, 4.11.2026: a tree stood inside Twinsen's house, its crown out through the thatch). okSpot keeps
  // the scatter out of the square's ring (exclusions: POI.village) and the original's trees 1.6 m off the houses, but
  // nothing kept the scattered trees and bushes out of the houses beyond the square: a tall tree grew in Twinsen's
  // house and two in the harbour wing's neighbour, bushes in the museum and the stone house, crowns through the walls
  // of the water house, the wing and the baggage hall. Now no tree, palm or bush stands within its crown's reach of a
  // house's walls (the farthest leaf from its trunk, measured on the sculpts, at its scale and crown width; a leaf may
  // touch the wall's face, 0.15 m, 0.1 for a bush: the original's tree by the harbour wing keeps its place), nor in the
  // asylum's block-house or on the spaceport's footbridge (both built later, main.js; on the bridge only the trunk
  // counts: a crown may lean over a deck at the ground). Filtered after the scatter like the rest above: no random
  // draw moves and every other tree keeps its place. The grass, flowers and tulips keep out of the same floors below.
  const BLOCKS = [...W.houses.map((h) => ({ x: h.x, z: h.z, ry: h.ry, w: h.w, d: h.d })),
    { x: ASYLUM_DOOR.x - 0.3, z: ASYLUM_DOOR.z, ry: 0, w: 3.0, d: 3.6 },   // (lba1places.js asylumDoor: its stone block)
    { x: (BRIDGE.x0 + BRIDGE.x1) / 2, z: BRIDGE.z, ry: 0, w: BRIDGE.x1 - BRIDGE.x0, d: BRIDGE.hw * 2, deck: true },
    // (DOORS-LBA2: the sewer's two street hatches, the lower town's with its rails, sewers.js; built later, main.js)
    ...Object.values(HATCHES).map((h) => ({ x: h.x, z: h.z, ry: 0, w: 2 * (h.S + (h.rails ? 0.7 : 0.3)), d: 2 * (h.S + (h.rails ? 0.7 : 0.3)) })),
    ...Object.values(HATCHES).filter((h) => h.rails).map((h) => ({ x: h.x - h.S - 1.3, z: h.z, ry: 0, w: 1.4, d: 3.2 }))];   // (and the way onto it from the west, between its bollards)
  // (how far (x, z) stands outside the nearest block's walls; inside, minus its depth)
  const blockDist = (x, z, decks = true) => {
    let m = Infinity;
    for (const b of BLOCKS) {
      if (b.deck && !decks) continue;
      const dx = x - b.x, dz = z - b.z, c = Math.cos(b.ry), s = Math.sin(b.ry), ax = Math.abs(dx * c - dz * s) - b.w / 2, az = Math.abs(dx * s + dz * c) - b.d / 2;
      m = Math.min(m, ax > 0 || az > 0 ? Math.hypot(Math.max(ax, 0), Math.max(az, 0)) : Math.max(ax, az));
    }
    return m;
  };
  const REACH = { round: 1.9, fruit: 1.9, tall: 0.9, pine: 1.67, palm: 2.87, bush: 0.85 };   // (vegetation.js, at scale 1)
  for (const t of trees) if (!t.gone && (blockDist(t.x, t.z, false) < REACH[t.kind] * (CROWN[t.kind] ?? 1) * t.s - 0.15 || blockDist(t.x, t.z) < 0.45 * t.s)) { t.s = 1e-4; t.gone = true; }
  for (const b of bushes) if (!b.gone && blockDist(b.x, b.z) < REACH.bush * b.s - 0.1) { b.s = 1e-4; b.gone = true; }
  yield 'tree spots';
  const VARS = { round: 3, fruit: 2, tall: 2, pine: 2 };
  for (const [kind, nv] of Object.entries(VARS)) for (let v = 0; v < nv; v++) {
    const list = trees.filter((t, i) => t.kind === kind && i % nv === v);
    if (list.length) mkInst(treeGeometry(kind, v + 1), leafMat, list, true, shadeVar, treeGeometry(kind, v + 1, 1));
    yield 'tree ' + kind;
  }
  const palmList = trees.filter((t) => t.kind === 'palm');
  for (let v = 0; v < 2; v++) { const list = palmList.filter((t, i) => i % 2 === v); if (list.length) mkInst(palmGeometry(v + 1), leafMat, list, true, shadeVar, palmGeometry(v + 1, 1)); }
  for (let v = 0; v < 3; v++) mkInst(treeGeometry('bush', v + 1), leafMat, bushes.filter((b, i) => i % 3 === v), true, shadeVar, treeGeometry('bush', v + 1, 1));
  if (BATCH.on) batchFor(leafMat).build();
  for (const t of trees) if (!t.gone) physics.add({ type: 'cyl', x: t.x, z: t.z, r: (t.kind === 'palm' ? 0.3 : 0.42) * t.s, camR: 1.5 * t.s, top: t.h + 6 * t.s, seeThrough: false });
  for (const b of bushes) if (!b.gone) physics.add({ type: 'cyl', x: b.x, z: b.z, r: 0.6 * b.s, top: b.h + 0.9 * b.s, noStand: true, seeThrough: true });
  W.trees = trees;

  yield 'trees';
  // grass clumps + wild flowers (none on streets, the square or inside houses)
  const grass = [], flowers = [];
  for (let i = 0; i < 16000 && grass.length < 5200; i++) {
    const x = ISLAND.cx + (rand() - 0.5) * 210, z = ISLAND.cz + (rand() - 0.5) * 220;
    const h = H(x, z);
    if (HS(x, z) < 1.2 || SG.slopeAt(x, z) > 0.6) continue;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 10.5) continue;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 32 && (streetDist(x, z) < 0.5 || inHouseS(x, z, 0.4))) continue;
    if (Math.max(Math.abs(x - POI.fort.x), Math.abs(z - POI.fort.z)) < 11) continue;
    if (pathDistScatter(x, z) < 1.4 || townSoil(x, z) > 0.3) continue;
    if (keepClear(x, z, -0.6)) continue;
    grass.push({ x, z, h: h + 0.06, s: 0.7 + rand() * 0.8, ry: rand() * 6.28 });
    if (rand() < 0.1) flowers.push({ x: x + 0.3, z: z + 0.2, h: H(x + 0.3, z + 0.2), s: 0.8 + rand() * 0.5, ry: rand() * 6 });
  }
  // denser grass along the house walls and fences in town
  for (let i = 0; i < 4000; i++) {
    const x = POI.village.x + (rand() - 0.5) * 50, z = POI.village.z + (rand() - 0.5) * 50;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 10.5 || streetDist(x, z) < 0.4 || inHouseS(x, z, 0.25) || !inHouseS(x, z, 1.4) || townSoil(x, z) > 0.5) continue;
    grass.push({ x, z, h: H(x, z) + 0.04, s: 0.8 + rand() * 0.6, ry: rand() * 6.28 });
    if (rand() < 0.15) flowers.push({ x, z, h: H(x, z), s: 0.9, ry: rand() * 6 });
  }
  const grassMat = sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }), 0.16);
  // (R6: a narrower spread of brightness from tuft to tuft — the same random draws, the bright end brought down)
  const grassTint = (c) => c.setHSL(0.27 + (rand() - 0.5) * 0.04, 0.22 + rand() * 0.14, 0.8 + rand() * 0.08).lerp(new THREE.Color(1, 1, 1), 0.45);
  // R6, outdoor readability: the walking routes' edges stay calm — no tufts within 2.2 m of a path's line or 0.9 m of
  // a street, no wild flowers within 3 m (the tulip beds stay: they are placed by the paths on purpose). Filtered
  // after the scatter, so the random draws and everything placed after them are unchanged.
  const calm = (t, r) => pathDist(t.x, t.z) >= r && !(Math.hypot(t.x - POI.village.x, t.z - POI.village.z) < 36 && streetDist(t.x, t.z) < r - 1.3);
  for (const t of grass) if (!calm(t, 2.2)) { t.s = 1e-4; t.gone = true; }
  for (const t of flowers) if (!calm(t, 3.0)) { t.s = 1e-4; t.gone = true; }
  // WA-12: no tufts on the wild ground's bare soil and rock (filtered here, after the scatter, like `calm` above: the
  // random draws and everything placed after them stay as they were — skipping inside the loop moved the town's props)
  for (const t of grass) if (!t.gone) { const [soil, rock] = wildGround(t.x, t.z); if (soil + rock > 0.4) { t.s = 1e-4; t.gone = true; } }
  clearLife(grass); clearLife(flowers);
  for (const t of [...grass, ...flowers]) if (!t.gone && zhClear(t.x, t.z, 0.2)) { t.s = 1e-4; t.gone = true; }   // (WA-15)
  for (const t of [...grass, ...flowers]) if (!t.gone && blockDist(t.x, t.z) < 0) { t.s = 1e-4; t.gone = true; }   // (TREES-1: none in a floor; at a wall's foot they stay)
  for (const t of [...grass, ...flowers]) if (!t.gone && climbClear(t.x, t.z, 0.2)) { t.s = 1e-4; t.gone = true; }   // (CLIMB-1)
  for (const t of [...grass, ...flowers]) if (!t.gone && (inNewHouse(t.x, t.z, 0.4) || isletSteep(t.x, t.z, 0.6) || keepClearNew(t.x, t.z, -0.6))) { t.s = 1e-4; t.gone = true; }   // (WORLD-80)
  for (let v = 0; v < 3; v++) mkInst(grassClumpGeometry(v + 5, 8 + v * 2), grassMat, grass.filter((g, i) => i % 3 === v), false, grassTint, null, true);
  const flowerMat = sway(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), 0.12);
  ['#ffd84a', '#ff6fa3', '#ffffff', '#b28cff', '#ff8a3d'].forEach((col, k) => mkInst(flowerGeometry(col), flowerMat, flowers.filter((f, i) => i % 5 === k), false, null, null, true));

  // tulip beds on the grass beside the paths and around town (dense, one colour per bed, as on LBA2's Citadel)
  const BED_COLS = ['#e8343a', '#ffd23a', '#3a6fe8', '#ff7ab0', '#f4f4f0'];
  const beds = BED_COLS.map(() => []);
  const bedOk = (x, z) => {
    const h = HS(x, z);
    if (h < 1.3 || SG.slopeAt(x, z) > 0.35) return false;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 10.8) return false;
    if (Math.hypot(x - POI.village.x, z - POI.village.z) < 34 && (streetDist(x, z) < 0.7 || inHouseS(x, z, 0.5))) return false;
    if (Math.max(Math.abs(x - POI.fort.x), Math.abs(z - POI.fort.z)) < 15) return false;
    if (pathDistScatter(x, z) < 1.7 || keepClear(x, z, 0.2)) return false;
    return true;
  };
  const addBed = (cx, cz, k, n, rx, rz, rot) => {
    for (let i = 0; i < n; i++) {
      const u = (rand() - 0.5) * 2, v = (rand() - 0.5) * 2;
      if (u * u + v * v > 1) { i--; continue; }
      const x = cx + Math.cos(rot) * u * rx - Math.sin(rot) * v * rz, z = cz + Math.sin(rot) * u * rx + Math.cos(rot) * v * rz;
      if (!bedOk(x, z)) continue;
      beds[k].push({ x, z, h: H(x, z), s: 1.05 + rand() * 0.35, ry: rand() * 6.28, bed: bedN });
    }
  };
  let bedN = 0;
  for (const path of PATHS_SCATTER) {
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
  for (const hs of SCATTER_HOUSES) {
    for (let k = 0; k < 2; k++) {
      const a = rand() * 6.28, r = 3.4 + rand() * 1.2;
      const cx = hs.x + Math.cos(a) * r, cz = hs.z + Math.sin(a) * r;
      if (bedOk(cx, cz)) addBed(cx, cz, bedN++ % BED_COLS.length, 24 + Math.floor(rand() * 10), 1.1, 0.45, a + Math.PI / 2);
    }
  }
  // (hidden beyond FAR_SMALL like the grass: a bed far off is a few pixels of colour, and thousands of tulips)
  // (a bed reaching into one of the town's places — the pump's footpath, Nell's shop — is left out whole)
  const lifeBeds = new Set(); for (const list of beds) for (const t of list) if (lifeClear(t.x, t.z) || inNewHouse(t.x, t.z, 0.6) || newPathDist(t.x, t.z) < 1.7) lifeBeds.add(t.bed);
  for (let k = 0; k < beds.length; k++) beds[k] = beds[k].filter((t) => !lifeBeds.has(t.bed));
  for (const list of beds) for (const t of list) if (blockDist(t.x, t.z) < 0) t.s = 1e-4;   // (TREES-1: a bed's tulips that stood in a house's floor)
  beds.forEach((list, k) => { if (list.length) mkInst(tulipGeometry(BED_COLS[k]), flowerMat, list, false, null, null, true); });
  fillPools();   // (PERF-CALLS: the small kinds' pools made now, with the rest of the island: uploaded behind the loading screen)
  W.flowerBeds = { beds: bedN, tulips: beds.reduce((a, l) => a + l.length, 0) };

  const rocks = [];
  for (let i = 0; i < 600 && rocks.length < 140; i++) {
    const x = ISLAND.cx + (rand() - 0.5) * 220, z = ISLAND.cz + (rand() - 0.5) * 230;
    const h = H(x, z), hs = HS(x, z);
    if (hs < -1 || hs > 18) continue;
    if (!okSpot(x, z, 2.5) && hs > 1.3) continue;
    rocks.push({ x, z, h: h - 0.1, s: 0.3 + rand() * 0.8, ry: rand() * 6 });
  }
  // (the doors' lanes, as the trees and bushes; WORLD-80: the new path, the new houses, the islet's dome and rock face;
  //  REVIEW-CITADEL: and the benches' room, as BENCHES-1 keeps it for the trees and bushes: a boulder stood where one sits
  //  down on the harbour path's bench, and Marda walked over its top to sit)
  for (const r of rocks) if (doorLane(r.x, r.z, r.s * 1.1) || isletClear(r.x, r.z) || newPathDist(r.x, r.z) < 2.5 || inNewHouse(r.x, r.z, r.s * 1.1 + 0.3) || keepClearNew(r.x, r.z, r.s * 1.1) || (r.h > 1.2 && isletSteep(r.x, r.z, 0.55)) || climbClear(r.x, r.z, r.s * 1.1) || benchRoom(r.x, r.z, r.s * 1.1)) r.s = 1e-4;
  const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  for (let v = 0; v < 3; v++) mkInst(rockGeometry(v + 1), rockMat, rocks.filter((r, i) => i % 3 === v), true, (c) => c.setRGB(1, 1, 1).multiplyScalar(0.9 + rand() * 0.15), rockGeometry(v + 1, 1));
  if (BATCH.on) batchFor(rockMat).build();
  for (const r of rocks) if (r.s > 0.6) physics.add({ type: 'cyl', x: r.x, z: r.z, r: r.s * 1.1, top: r.h + r.s * 0.95, seeThrough: true });

  yield 'plants';
  // ---------- harbour, station, depot, pipeline, valves (see island.js) ----------
  W.signs = [];
  W.pathDist = pathDist;
  { const n0 = scene.children.length; buildIsland(scene, W); tagSrc(scene, n0, 'island'); }
  { const n0 = scene.children.length; buildHarbourZeelich(scene, physics, H); tagSrc(scene, n0, 'harbourzeelich'); }   // (WA-15)

  yield 'island';
  // ---------- lighthouse ----------
  {
    const L = POI.lighthouse, g = H(L.x, L.z);
    const grp = new THREE.Group(); grp.position.set(L.x, g, L.z); scene.add(grp);
    // (I-3, CITADEL-85: the tower is src/game/lighthouse.js, in LBA2's shape: a square white tower with grey quoins, a
    // gallery, the glazed lantern under a domed grey cap, the annex with the door at its foot; merged, one mesh per
    // material, only the tower's plaster and dressed stone cast)
    const lampMat = new THREE.MeshStandardMaterial({ color: '#444', emissive: '#ffefb0', emissiveIntensity: 0.05, transparent: true, opacity: 0.85 });
    const { lampY } = buildLighthouse(grp, lampMat);
    // the beam (visible once the Sun Lens is restored)
    const beamGeo = new THREE.ConeGeometry(4, 60, 24, 1, true);
    beamGeo.translate(0, -30, 0); beamGeo.rotateZ(Math.PI / 2);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: '#fff2c0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    beam.position.y = lampY;
    grp.add(beam);
    const light = new THREE.PointLight('#ffe9b0', 0, 40, 1.5);
    light.position.y = lampY; grp.add(light);
    physics.add({ type: 'cyl', x: L.x, z: L.z, r: 3.1, top: g + 20 });
    physics.add({ type: 'box', x: L.x, z: L.z + (LH_ANNEX.z0 + LH_ANNEX.z1) / 2 + 0.03, hw: LH_ANNEX.hw + 0.05, hd: (LH_ANNEX.z1 - LH_ANNEX.z0) / 2 + 0.03, rot: 0, top: g + LH_ANNEX.top });   // (CITADEL-85: the annex, whose front corners stand outside the cylinder)
    physics.add({ type: 'box', x: L.x, z: L.z + 3.05, hw: LH_STEP_W / 2, hd: 0.25 + 0.12, rot: 0, top: g + 0.15, stair: true });   // (the doorstep, lighthouse.js, to z 3.3)
    for (const S of LH_STEPS) physics.add({ type: 'box', x: L.x, z: L.z + (S.z0 + S.z1) / 2, hw: LH_STEP_W / 2, hd: (S.z1 - S.z0) / 2 + 0.12, rot: 0, top: g + S.top, stair: true });   // (the steps up to the door; +0.12: overlapping, no seam to drop through under groundAt's 5 cm shrink, as the rooms' stairs)
    W.lighthouse = { lampMat, beam, light, power: 0 };
    W.updaters.push((dt, t) => {
      const p = W.lighthouse.power;
      lampMat.emissiveIntensity = 0.05 + p * 6;
      beam.material.opacity = p * 0.22;
      light.intensity = p * 60;
      beam.rotation.y = t * 0.8;
    });
    // sage's hut barrels (hidden flask)
    // (GFX-LOOK-2: staved, bulging barrels with a lid and two iron hoops, as the town's, instead of two plain brown
    //  cylinders; the same size, place and collider; only the body casts a shadow, as the cylinder did)
    const bWood = TX.wood.clone(); bWood.needsUpdate = true; bWood.repeat.set(2, 1);
    const bMat = new THREE.MeshStandardMaterial({ map: bWood, color: '#b07a4c', roughness: 0.9 }), bLid = new THREE.MeshStandardMaterial({ map: TX.wood, color: '#946038', roughness: 0.9 });
    const bIron = mat('#3a3a3a', 0.5, { metalness: 0.5 });
    const bPts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; bPts.push(new THREE.Vector2(0.38 + Math.sin(t * Math.PI) * 0.07, t * 1.1)); }
    const bBody = new THREE.LatheGeometry(bPts, 16), bTop = new THREE.CircleGeometry(0.39, 16).rotateX(-Math.PI / 2), bHoop = new THREE.TorusGeometry(0.405, 0.02, 6, 20).rotateX(Math.PI / 2);
    for (const [ox, oz] of [[4.5, 2.5], [5.3, 1.6]]) {
      const bx = L.x + ox, bz = L.z + oz, by = H(bx, bz);
      add(scene, bBody, bMat, bx, by, bz, { ry: ox * 2.1 });
      add(scene, bTop, bLid, bx, by + 1.09, bz, { cast: false });
      for (const hy of [0.14, 0.96]) add(scene, bHoop, bIron, bx, by + hy, bz, { cast: false });
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
    // (CONTROL-FEEL: the first stone stands 1 m over the lowest ground he can come at it from — the street's side is
    // 1 m under its foot; that took the old 1.77 m jump, not LBA2's 1.19 m)
    let base = H(S.x, S.z);
    for (let i = 0; i < 12; i++) base = Math.min(base, H(S.x + Math.sin(i * Math.PI / 6) * 1.9, S.z + Math.cos(i * Math.PI / 6) * 1.9));
    // PLAY-7-14: the last stone's top is the plateau's own ground round it (WORLD-80's Citadel stands it 16.8-16.9 m,
    // above POI.plateau.h): a top under it left a 1.15 m step from the last-but-one stone onto the plateau, past LBA2's
    // 1.14 m apex, with the cliff's rim poking through that stone. The stones stand where they did (13 of them).
    // (CITADEL-TERRACES: the sideways wobble counts from the top stone, so the last stones (and their nudges, below) stand as they did
    // when the climb was 13 stones, whatever their number is now)
    const at = (cnt, i) => { const wob = Math.sin((i + 13 - cnt) * 1.7) * 1.2, k = i / (cnt - 1); return { x: S.x + ux * edge * k - uz * wob, z: S.z + uz * edge * k + ux * wob }; };
    const rimTop = (q) => { let m = H(q.x, q.z); for (let a = 0; a < 12; a++) m = Math.max(m, H(q.x + Math.sin(a * Math.PI / 6) * 0.9, q.z + Math.cos(a * Math.PI / 6) * 0.9)); return m; };
    let n = Math.ceil((P.h - base) / 1.05), endTop = P.h - 0.15;
    for (let pass = 0; pass < 2; pass++) { endTop = Math.max(P.h - 0.15, rimTop(at(n, n - 1))); n = Math.ceil((endTop + 0.15 - base) / 1.05); }
    W.stones = [];
    const stoneMat = mat('#8d8578', { roughness: 0.95 });
    const rockMat = W_cliffs.mesh.material;   // (STONES-31: the cliff rocks' own material: one program, no new texture)
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      // (SMALL-FIXES: the last-but-one stone was cut into the cliff's rim: its far half had the rim 0.3-1.0 m over its top
      // and its near half hung over the drop, so the last hop to the plateau was fussy. It stands 1.65 m out from the rim
      // now (the whole top clear of it, 2.6 m centre to centre from the last stone), the one under it 0.2 m with it)
      const nudge = i === n - 3 ? [0, 0.2] : i === n - 2 ? [0.4, 1.6] : [0, 0];
      const p0 = at(n, i), x = p0.x + nudge[0], z = p0.z + nudge[1];
      const top = base + 1.0 + (endTop - base - 1.0) * k;
      const r = 1.15;
      const grp = new THREE.Group();
      const ground = H(x, z);
      // (STONES-31: a column of the cliffs' rock with a mossy worn cap, cliffs.js stoneColumnGeometry: one mesh a stone,
      //  was a bare cylinder and a green disc, two. It reaches 0.6 m under the lowest ground round its foot once risen;
      //  the earth stain sits where that ground meets it. Its top, y = 0 in the group, is the collider's top as before)
      let low = ground;
      for (let a = 0; a < 12; a++) low = Math.min(low, H(x + Math.sin(a * Math.PI / 6) * 1.7, z + Math.cos(a * Math.PI / 6) * 1.7));
      const rock = new THREE.Mesh(stoneColumnGeometry(9101 + i * 7919, top - low + 0.6, (lx, lz) => H(x + lx, z + lz) - top), rockMat);
      rock.castShadow = rock.receiveShadow = true; rock.name = 'steppingStone'; grp.add(rock);
      grp.position.set(x, ground - 0.3, z);
      scene.add(grp);
      const c = physics.add({ type: 'cyl', x, z, r, top: ground - 0.3, enabled: false });
      // (PERF-2: until they rise, a stone wholly under the drawn ground — its top, the moss at ground − 0.29, below the
      // terrain all round its rim — is not drawn at all; ~10 draw calls a frame for nothing on the street)
      // (G1-QUEST #20: the ones on sloping ground were drawn, and their moss caps showed through the dirt as flat green
      //  plates along the path. None is drawn until they rise: raiseStones shows them, from just under the ground)
      grp.visible = false;
      W.stones.push({ grp, c, top, ground: ground - 0.3, delay: i * 0.25 });
    }
    W.stonesRisen = false;
    W.raiseStones = (instant = false) => {
      W.stonesRisen = true;
      for (const s of W.stones) s.grp.visible = true;
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
    // (TARGET-1, the user 5.11: seen close it read as "a tree like a green ring on a stick", "it doesn't look good": a thick
    //  glowing hoop round a blank pale disc on a bare brown pole, and once hit the hoop's green made it a crown. Now a target
    //  as the villagers would make one: a straw butt with a painted face, red and cream rings round a gold middle, hung on a
    //  pin at the top of a post braced by two stays. The thin hoop round its rim still glows, orange until it's hit, then
    //  green; the board, not only the hoop, rocks on its pin until then. Its place, height and hit radius are unchanged.)
    const T = POI.target, g = H(T.x, T.z);
    const ty = g + 1.9;
    const wood = mat('#6b4a2e');
    const foot = ty - 0.6;   // (the post stops at the board's foot, where its pin is: it never shows through the face)
    const stand = new THREE.Group(); scene.add(stand);   // (the post and its two stays: one draw, mergeStatic below)
    add(stand, new THREE.CylinderGeometry(0.07, 0.12, foot - g, 8), wood, T.x, (g + foot) / 2, T.z);
    for (const s of [-1, 1]) add(stand, new THREE.CylinderGeometry(0.045, 0.055, 1.18, 6), wood, T.x, g + 0.55, T.z + s * 0.27, { rx: -s * Math.atan2(0.42, 1.1) });
    mergeStatic(stand);
    const ringMat = new THREE.MeshStandardMaterial({ color: '#ff8a2a', emissive: '#ff6a00', emissiveIntensity: 1.6 });
    const faceTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), S = 128;
      ['#b8302a', '#f2ead6', '#b8302a', '#f2ead6', '#e0a83a'].forEach((col, i) => { x.fillStyle = col; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - i * 12.5, 0, 7); x.fill(); });
      x.strokeStyle = 'rgba(60,24,12,0.55)'; x.lineWidth = 1.5; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(S / 2, S / 2, S / 2 - i * 12.5 - 0.8, 0, 7); x.stroke(); }
      x.strokeStyle = 'rgba(90,60,20,0.18)'; x.lineWidth = 1; for (let i = 0; i < 70; i++) { const a = i * 2.39996, r = 8 + (i * 37) % 54; x.beginPath(); x.moveTo(S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r); x.lineTo(S / 2 + Math.cos(a) * (r + 5), S / 2 + Math.sin(a + 0.3) * (r + 5)); x.stroke(); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const disc = new THREE.Group(); disc.position.set(T.x, foot, T.z); disc.rotation.order = 'ZYX'; disc.rotation.y = Math.PI / 2; scene.add(disc);   // (ZYX: rotation.z then swings it about the horizontal across its face)
    const part = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y + 0.6, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; disc.add(o); return o; };
    part(new THREE.CylinderGeometry(0.56, 0.56, 0.11, 28).rotateX(Math.PI / 2), mat('#c8a464'), 0, 0, 0);   // the straw butt
    const face = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.9 });
    part(new THREE.CircleGeometry(0.52, 32), face, 0, 0, 0.057); part(new THREE.CircleGeometry(0.52, 32), face, 0, 0, -0.057, Math.PI);   // (painted both sides)
    part(new THREE.TorusGeometry(0.575, 0.045, 8, 36), ringMat, 0, 0, 0);   // the hoop: its glow says hit or not
    part(new THREE.BoxGeometry(0.1, 0.2, 0.18), wood, 0, -0.62, 0);   // the bracket over the post's pin
    mergeStatic(disc, { recolor: true, retex: true });   // (the butt, the bracket and both faces: one draw; the hoop, whose glow changes, its own)
    physics.add({ type: 'cyl', x: T.x, z: T.z, r: 0.25, top: g + 2.4, seeThrough: true });
    W.target = { x: T.x, y: ty, z: T.z, ringMat, disc, hit: false };
    W.updaters.push((dt, t) => { if (!W.target.hit) disc.rotation.z = Math.sin(t * 2) * 0.07; });

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

  yield 'landmarks';
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
  // givers outdoors (most are indoors, as in the original): the sage's barrels and the old stump
  W.givers.push({ id: 'barrels', x: W.barrels.x, z: W.barrels.z, r: 2.0, top: 1.1, kinds: ['magic'] });
  W.givers.push({ id: 'stump', ...STUMP, r: 2.0, top: 0.8, kinds: ['clover'] });
  // the Dino-Fly naps where he lay in LBA2 (DINOFLY-POS): the user's files place him (scene 49, the start of LBA2 after
  // the storm, and scene 195; File3D 109, body 167) south-west of Twinsen's house, at our (-58.0, 95.3), turned 1200 of
  // 4096 (1.84 rad); twelve years on it is still his spot in the grass behind the house
  buildDinoFly(scene, W, -58.0, 95.3, 1.84);
  W.storm = 1;
  W.update = (dt, t) => {
    swayU.uTime.value = t;
    swayU.uWind.value = 0.4 + W.storm * 1.2;
    for (const u of W.updaters) u(dt, t);
  };
  // the Esmers' shuttles: Zeelich's traffic, crossing high over the island (src/game/shuttle.js)
  shuttleTraffic(W.root, W.updaters, { cx: -40, cz: 10, y: 46, r: 120, n: 2, speed: 0.03 });
  // a poodle (LBA2's, src/game/dogs.js) noses about the square by the well
  W.dogs = addDogs([new Dog({ parent: W.root, physics, coat: 'poodle', x: POI.village.x + 4, z: POI.village.z - 3, area: { x0: POI.village.x + 1.5, z0: POI.village.z - 6.5, x1: POI.village.x + 7, z1: POI.village.z - 1 } })], W.updaters);
  return W;
}
