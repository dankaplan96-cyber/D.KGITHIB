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
import { buildTown, townHeight, streetDist, bugFootDist, LAWN_FENCE, HOUSE_PADS, HOUSE_KEEP, HOUSE_FLATS, HOUSE_PADS_PRE, HOUSE_FLATS_PRE, OLD_BUG, OLD_PINK_DZ } from './town.js';
import { treeGeometry, rockGeometry, grassClumpGeometry, flowerGeometry, tulipGeometry, palmGeometry } from './vegetation.js';
import { buildIsland, keepClear, keepClearNew, STUMP, SHIFT, ISLET, QUAY_R, HARBOUR_PLAT, plateauStairAt, plateauStairGround, PLATEAU_STAIR_BOX } from './island.js';
import { buildDinoFly, DINO_AT } from './dinofly.js';
import { buildLighthouse, LH_STEPS, LH_STEP_W, LH_ANNEX } from './lighthouse.js';
import { buildStatue } from './statue.js';
import { buildCliffRocks, stoneColumnGeometry, plateauStonesGeometry, ROCKS_OLD } from './cliffs.js';
import { setLod, LOD_DETAIL, setLodDetail, BATCH, LodBatch } from './kit.js';
import { culledToo } from '../engine/viewinst.js';
import { mergeStatic } from '../engine/merge.js';
import { COAST, LEVELS, PROPS, SHELVES, CLIFFS_TOP } from './citadel-layout.js';
import { lifeClear } from './townlife.js';
import { buildHarbourZeelich, zhClear } from './harbourzeelich.js';
import { ASYLUM_DOOR, climbPaveDist, climbClear, climbDropRock, climbShelfRows, climbRampFill, CLIMB_RAMP, CLIMB_JOG, CLIMB_STRAIGHT, CLIMB_FOOT, CLIMB_FOOT_Y } from './lba1places.js';
import { BRIDGE } from './spaceport.js';
import { HATCHES } from './sewers.js';
import { TOWN_FLAT, PROM, PROM_H, PROM_STAIR, PROM_WALLS, PLAZA, flatClear, LAWN, lawnClear, V143_EAST, PROM_EDGE, PIPE_METER } from './citadel-layout.js';

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
// MAP-ORIG (LBA2 from the play camera, docs/lba-maturity/MAP-ORIG.md): LBA2's town is a grid of straight paved streets,
// about 3 m wide and flush with the brown earth, round rectangular blocks; ours read as fields crossed by dirt paths.
// A first step, the ground's texture only (no height, collider, door or route changes): the streets of LBA2's grid
// that run between our houses, traced from its town seen from above (lines of our frame, LAYOUT applied; the one by
// the fields' path on that path's line, 3 m east of LBA2's), the promenade on the town's sea wall, and the harbour
// wing's yard, paved in front of the long hall and Nell's as LBA2's harbour platform is. The square and its streets
// (town.js STREETS) stay as they are. [x0, z0, x1, z1, width]
const GRID_STREETS = [
  // (P135, the user's photo: the west street and its foot stopped 4 m short of the street down to the promenade's flight
  //  (x -64), a bay of dirt between: it runs on north to that street now, its end flush in it)
  [-58.9, -4.16, -58.9, 57.0, 3.0],    // the west street, from the street to the harbour south past the water office
  [-60.4, 2.9, -51.4, 2.9, 3.0],     // its foot, east to the square's ring
  [-55.4, -4.16, -55.4, 2.9, 4.0],   // (P135) the corner between it, its foot, the street to the flight and the block's west street (x −52) paved (a bare kerbed bed was left there)
  // (P135: it stopped square 7 m short of the footbridge, in the dirt: it ends now on a link south along the bridge's foot,
  //  x −34…−31, flush with the bridge's west end, where its bollards and sign post stand)
  [-63.4, 31.3, -31.0, 31.3, 3.0],   // the cross street past Chez Luc, toward the footbridge
  [-45.6, 31.3, -45.6, 53.1, 3.0],   // south from it along the fields' path
  [-60.4, 53.1, -44.1, 53.1, 3.0],   // the south cross street
  [-73.68, -27.0, -73.68, 17.5, 2.9],   // the promenade on the sea wall, inside its rail (FLAT-TOWN: from the wall's coping to its inland edge, on to the knoll)
  // CITADEL-ORIG-2 (the user, 16.11: "excellent" to the grid past the square): LBA2's east street runs at x −31 from the
  // square's block to the cross street, where Pippa's shop and Fosse's office stand now. They stay: the street runs
  // 3.5 m west of LBA2's, before their west-facing doors, from the square's paved ring down to the cross street
  [-35.0, 3.6, -35.0, 31.3, 3.0],
  [-32.5, 31.3, -32.5, 40.5, 3.0],   // (P135) the link from the cross street to the footbridge's foot (spaceport.js BRIDGE: x0 −31, z 38…42)
  // P42 (the user, 22.11: the north cross streets as LBA2's): LBA2 rings the square's block with streets. Ours: the
  // street along the square's north rim (tangent to its kerb ring, across the climb's paving), the block's west side
  // from it down past the square to the west street's foot (LBA2's x −52), its east side on LBA2's line from it down to
  // Pippa's street by her shop's north wall. (LBA2's second cross street, 3.5 m further north along the terraces'
  // foot, is left out: our ground there rises and falls 3.1–4.6 m along its line, the first shelf's slope; paving it
  // read as a paved hillside)
  [-52.0, -15.8, -32.5, -15.8, 3.0],
  [-52.0, -15.8, -52.0, 2.9, 3.0],
  [-32.5, -15.8, -32.5, -4.0, 3.0],
  // FLAT-TOWN: the street down to the harbour's end (town.js STREETS, x −64) on to the foot of the promenade's flight
  [-63.5, -4.16, -66.0, -4.16, 3.2],
];
// (AUDIT-FIX, the user's P49: from the quay's east face, x0 QUAY.x1 − 0.5 — it began at −104.5 and the quay's paving stopped
//  at −108, so between them, by the PIER signpost and the ferry's board, the old harbour path's dirt and the grass beside it
//  showed on the paved quay in straight-edged patches)
const HARBOUR_YARD = { x0: QUAY.x1 - 0.5, z0: 30.4, x1: -75.5, z1: 44.0 };   // (only where the ground stands above the shore, h > 1.2; CITADEL-ORIG-2: on to the platform's south face)
// CITADEL-ORIG-2: LBA2's harbour platform (island.js HARBOUR_PLAT), paved to its straight faces
const HARBOUR_SE = { x0: -91.3, z0: 44.0, x1: -79.0, z1: 51.0 };
// the block the south streets close (between the west street, the fields' path and the two cross streets): LBA2's
// blocks are a lawn inside a band of brown earth along the paving; inside its streets' edges [x0, z0, x1, z1]
const TOWN_BLOCK = { x0: -57.4, z0: 32.8, x1: -47.1, z1: 51.6, band: 2.0 };
// CITADEL-ORIG-2: the middle block (between the west street, the new east street, the square's street and the cross
// street) has LBA2's band of earth round its lawn too, and south of the south cross street LBA2's long lawn strip, its
// lattice fence along the street (LBA2: the one fenced lawn of the town's south; the fence: town.js latticeFence)
const TOWN_BLOCKS = [TOWN_BLOCK, { x0: -57.4, z0: 4.4, x1: -36.5, z1: 29.8, band: 2.0 }, { x0: -60.4, z0: 54.6, x1: -46.6, z1: 60.4, band: 1.6 }];
const inTownGrid = (x, z) => x > -75 && x < -22 && z > 1 && z < 56;   // (the town south of the square, shore to shore)
export function gridPaveDist(x, z) {
  let d = Math.min(boxDist(x, z, HARBOUR_YARD.x0, HARBOUR_YARD.z0, HARBOUR_YARD.x1, HARBOUR_YARD.z1), boxDist(x, z, HARBOUR_SE.x0, HARBOUR_SE.z0, HARBOUR_SE.x1, HARBOUR_SE.z1));
  for (const [x0, z0, x1, z1, w] of GRID_STREETS) d = Math.min(d, distToSegment(x, z, x0, z0, x1, z1) - w / 2);
  return d;   // (< 0 on the paving)
}
// LAWN-EDGES (P112, the user's pick b, 23.11): LBA2's town paving ends in straight, kerbed edges, a ~2 m band of brown
// earth inside them, the lawn inside that. Ours was a splat weight per grid point (0.93 m) with noise, so its edge
// stepped across the triangles (a zig-zag). Now: one noise-free signed distance to all of Citadel's paving (townPaveDist),
// stored per grid point (Terrain edgeFn) and cut by the terrain shader per pixel at 0: linear across a triangle, so a
// straight line stays straight. The band is cut on the same distance (townBandW). The splat keeps a step copy of both
// for the map, the probes and the scatter filters. (gridPaveDist above stays as it was: the scatter's filters use it.)
// The grid streets as rectangles: an end that stops on another street's edge or inside it is cut flush there, one near
// other paving keeps its round cap (it meets the square's ring or a lane), a free end is square (LBA2's dead ends).
const PLOT_ZONE = { x0: -76, x1: -20, z0: -17, z1: 62 };   // (the town's plots: the grid south of the square, the square's block)
const GRID_RECTS = GRID_STREETS.map(([x0, z0, x1, z1, w], i) => {
  const len = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / len, uz = (z1 - z0) / len, hw = w / 2;
  const other = (x, z) => {
    let d = Math.min(boxDist(x, z, HARBOUR_YARD.x0, HARBOUR_YARD.z0, HARBOUR_YARD.x1, HARBOUR_YARD.z1), boxDist(x, z, HARBOUR_SE.x0, HARBOUR_SE.z0, HARBOUR_SE.x1, HARBOUR_SE.z1));
    GRID_STREETS.forEach(([a, b, c, e, ww], j) => { if (j !== i) d = Math.min(d, distToSegment(x, z, a, b, c, e) - ww / 2); });
    return Math.min(d, streetDist(x, z), bugFootDist(x, z), Math.hypot(x - POI.village.x, z - POI.village.z) - 9.45);
  };
  const end = (x, z) => { const o = other(x, z); return o <= 0.01 ? 'flush' : o < hw + 0.3 ? 'round' : 'square'; };
  return { x0, z0, ux, uz, len, hw, ea: end(x0, z0), eb: end(x1, z1), prom: x0 === -73.68 && x1 === -73.68 };   // (the promenade: by its line, not its place in the list)
});
function rectDist(x, z, R) {
  const dx = x - R.x0, dz = z - R.z0, t = dx * R.ux + dz * R.uz, p = Math.abs(dz * R.ux - dx * R.uz) - R.hw;
  if ((t < 0 && R.ea === 'round') || (t > R.len && R.eb === 'round')) return distToSegment(x, z, R.x0, R.z0, R.x0 + R.ux * R.len, R.z0 + R.uz * R.len) - R.hw;
  const a = t < R.len / 2 ? -t - (R.ea === 'square' ? R.hw : 0) : t - R.len - (R.eb === 'square' ? R.hw : 0);
  return a > 0 && p > 0 ? Math.hypot(a, p) : Math.max(a, p);
}
// signed distance to the town's paving (< 0 on it), noise-free; h: the ground's height there (the grid's paving, the
// harbour yard and the quay only above the shore, h > 1.2, as before). prom: the promenade's own distance apart.
const TP_LAST = { x: NaN, z: NaN, h: NaN, r: null };   // (the terrain asks twice per grid point: the splat, the edge)
function townPaveParts(x, z, h) {
  if (x < -112 || x > -8 || z < -82 || z > 66) return [9, 9];
  if (x === TP_LAST.x && z === TP_LAST.z && h === TP_LAST.h) return TP_LAST.r;
  TP_LAST.x = x; TP_LAST.z = z; TP_LAST.h = h; TP_LAST.r = townPaveCalc(x, z, h);
  return TP_LAST.r;
}
function townPaveCalc(x, z, h) {
  let d = 9, pr = 9;
  if (h > 1.2) {
    d = Math.min(boxDist(x, z, HARBOUR_YARD.x0, HARBOUR_YARD.z0, HARBOUR_YARD.x1, HARBOUR_YARD.z1), boxDist(x, z, HARBOUR_SE.x0, HARBOUR_SE.z0, HARBOUR_SE.x1, HARBOUR_SE.z1));
    for (const R of GRID_RECTS) { const r = rectDist(x, z, R); if (R.prom) pr = r; else if (r < d) d = r; }
    d = Math.min(d, Math.max(roundBoxDist(x, z, QUAY.x0, QUAY.z0, QUAY.x1 + 3, QUAY.z1, QUAY_R), x - QUAY.x1) - 0.2);   // (the quay, to its east face)
  }
  const vd = Math.hypot(x - POI.village.x, z - POI.village.z);
  d = Math.min(d, vd - 9.45);   // (the square, under the plaza's steps)
  if (vd < 30) d = Math.min(d, streetDist(x, z), bugFootDist(x, z));
  d = Math.min(d, climbPaveDist(x, z));
  const F = POI.fort;
  d = Math.min(d, boxDist(x, z, F.x - F.half, F.z - F.half, F.x + F.half, F.z + F.half), boxDist(x, z, F.x - F.half - 5, F.z - 4.5, F.x - F.half + 1, F.z + 4.5));   // (the fort and its forecourt)
  return [d, pr];
}
function townPaveDist(x, z, h) { const [d, pr] = townPaveParts(x, z, h); return Math.min(d, pr); }
// the earth band's width at x, z (0: none): in the town's plots at the street's level, along every street but the
// promenade (its inland edge is its wall's coping); LBA2's lawn strip south of the south cross street has a narrower one
const STRIP = TOWN_BLOCKS[2];
function townBandW(x, z, h, parts) {
  if (x < PLOT_ZONE.x0 || x > PLOT_ZONE.x1 || z < PLOT_ZONE.z0 || z > PLOT_ZONE.z1 || Math.abs(h - TOWN_FLAT) > 0.35) return 0;
  const [d, pr] = parts || townPaveParts(x, z, h);
  if (pr < d) return 0;
  return x > STRIP.x0 && x < STRIP.x1 && z > STRIP.z0 - 0.5 && z < STRIP.z1 ? STRIP.band : 2.0;
}
// on the band (for the scatter's filters: no tufts, wild flowers or bushes on it)
function onTownBand(x, z, h, pad = 0) {
  const parts = townPaveParts(x, z, h), bw = townBandW(x, z, h, parts);
  const d = Math.min(parts[0], parts[1]);
  return bw > 0 && d > -0.1 && d < bw + pad;
}
// the terrain's edge attribute at a grid point: [distance to the paving, the band's width]
function islandEdge(x, z, h, e) {
  const parts = townPaveParts(x, z, h);
  e[0] = Math.min(parts[0], parts[1]); e[1] = townBandW(x, z, h, parts);
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
    // CITADEL-ORIG-2 (the user, 16.11: LBA2's paved harbour platform): straight-walled, as LBA2's, where our shore ran
    // round in curves: the yard's strip and the trading house's ground stand level at the platform's height, and the
    // water before their faces, and before the quay's south and east faces, is cut straight (the walls: island.js)
    const P = HARBOUR_PLAT;
    if (x > P.x0 - 1 && x < P.x2 + 1 && z > P.zS - 4.5 && z < P.zS + 1) h = lerp(h, P.h, smoothstep(P.x0 - 1, P.x0 + 0.5, x) * smoothstep(P.zS - 4.5, P.zS - 3, z));
    if (x > P.x1 - 0.6 && x < P.x2 + 1 && z > P.zS - 1 && z < P.zSE + 1) h = lerp(h, P.h, smoothstep(P.x2 + 1, P.x2 - 0.5, x));
    // (only near the walls: from P.zFar on south the ground is the island's own again — the bay, the lighthouse's headland)
    // HARBOUR-BRINK (slidetraps (−91.67, 44.22)): where a sea wall stands (`wall`; `faces`: the faces really built in
    // island.js, [distance out from the face, the level behind it]), the ground is that level right up to the face and
    // sea from it on. The terrain grid (0.93 m) can't hold a step there, so: no grid point inside a face is lowered (the
    // soft cut lowered the last row inside the yard's south face 0.44 m: the paving's ground sloped from z 42.9 and
    // turned steep 0.14 m before the face, a bank too steep to stand on that ran 0.3 m out past the face over the water,
    // where the sea stopped a slide dead); the first point out from a face (f under one grid step) is sunk just so far
    // that the bank from the last point in, level, reaches the sea (−0.35, physics.js WATER_FLOOR; −0.4 here) 0.1 m past
    // the face; island.js lays the walls' walkable tops over the bank, out to 0.1 m past the face. Points farther out are
    // the basin's floor, as before. Away from the walls (south of them, round their ends) the cut is the soft one it was.
    const sea = (dw, wall, faces) => {
      dw -= smoothstep(P.zFar, P.zFar + 3, z) * 9;
      if (wall && z < P.zFar && !BRINK_OFF) {
        if (dw <= 0) return;
        const st = TERRAIN_SIZE / TERRAIN_SEGS;
        let d = 0;
        for (const [f, L] of faces) if (f > 0 && f < st) d = Math.min(d, Math.max(-16, Math.min(-0.45, L - (L + 0.4) * st / (st - f + 0.1))));
        h = Math.min(h, d < 0 ? d : -3.2);
        return;
      }
      const k = smoothstep(-0.3, 0.6, dw); if (k > 0) h = lerp(h, Math.min(h, -3.2), k);
    };
    if (x > QUAY.x1 - 1 && x < P.x1 + 1 && z > P.zS - 1 && z < P.zFar + 3) {   // (the notch inside the L)
      const fq = x - QUAY.x1, f1 = P.x1 - x, fs = z - P.zS;   // (the quay's east face runs to z QUAY.z1, the trading house ground's west face to zSE)
      const faces = [[fs, P.h]]; if (z < QUAY.z1) faces.push([fq, QUAY.h]); if (z < P.zSE) faces.push([f1, P.h]);
      sea(Math.min(fq, f1, fs), z < P.zSE || (z < QUAY.z1 && fq < f1), faces);
    }
    if (x >= P.x1 - 0.3 && x < P.x2 && z > P.zSE - 1 && z < P.zFar + 3) sea(z - P.zSE - (1 - smoothstep(P.x2, P.x2 - 1.5, x)) * 5, x >= P.x1 && x < P.x2 - 1.5, [[z - P.zSE, P.h]]);   // (before the trading house's ground)
    if (x > QUAY.x0 + QUAY_R && x < QUAY.x1 + 0.6 && z > QUAY.z1 - 1 && z < P.zFar + 3) sea(z - QUAY.z1, x < QUAY.x1, [[z - QUAY.z1, QUAY.h]]);   // (before the quay's south face)
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
  return flatTown(x, z, h);
}
// the ramp's height on its axis, as islandHeight0 had it before the fill
function rampAxisHeight(x, z) { return islandHeight0(x, z); }

// FLAT-TOWN (flattown.js): the town's ground level. In the zones [x0, z0, x1, z1] (eased over `fade` m inside their
// edges) the old ground's departure from the level is kept only where it is a real feature: nothing under 1.1 m, all
// of it over 2.8 m (a shelf's face, the sea cliff: their tops and feet now meet the level at a crease, not a bank); on
// the paving (and 1 m round it) none up to 1.6 m. Kept as it was: the ground round the first stepping stone's foot
// (its first step is measured from it; off the paving). The stepping stones' path (PATHS[4]) now runs level from Bug
// Street to the shelf's foot and climbs from there, where it ran up a bank from the street. FLAT_OFF: the ground as it
// stood, for the scatter's view of it (no random draw moves).
let FLAT_OFF = false;
const FLAT_ZONES = [
  { x0: -74.5, z0: -24.0, x1: -20.0, z1: 66.0, fade: 2.5 },   // the town, from the west shelf's foot to the east shore, the terraces' foot to the fields
  { x0: -102.0, z0: 21.0, x1: -74.5, z1: 41.0, fade: 2.0 },   // the harbour wing's ground (the quay, 1.8 m, and the platform's brink south of z 42.5 stay as they are)
];
function flatTown(x, z, h) {
  if (FLAT_OFF || PRE80) return h;
  let w = 0;
  for (const Z of FLAT_ZONES) {
    const e = Math.min(x - Z.x0, Z.x1 - x, z - Z.z0, Z.z1 - z);
    if (e > 0) w = Math.max(w, smoothstep(0, Z.fade, e));
  }
  if (w <= 0) return h;
  const d = h - TOWN_FLAT, a = Math.abs(d);
  const pave = a < 2.4 ? smoothstep(1.0, -0.1, Math.min(gridPaveDist(x, z), streetDist(x, z), bugFootDist(x, z), Math.hypot(x - POI.village.x, z - POI.village.z) - 9.9)) * smoothstep(2.4, 1.6, a) : 0;
  w *= Math.max(smoothstep(4.0, 6.0, Math.hypot(x - POI.stonesStart.x, z - POI.stonesStart.z)), pave);
  if (w <= 0) return h;
  return TOWN_FLAT + d * lerp(1, smoothstep(1.1, 2.8, a) * (1 - pave), w);
}
// The promenade on the sea wall (flattown.js PROM): its strip level at PROM_H from the sea face's row to the inland
// row; the sea face's foot row (the low side) no higher than the ground a row further out (the bank between is inside
// the wall); round the strip's inland side and ends the ground eases back over 1.5 m (short of the stepping stones'
// foot) where it is within 1–1.5 m of the level (the shelf's own top); where it is lower (behind the water office) it
// is the town's level, under the inland wall.
const PROM_STEP = 260 / 280;
// (every grid point FLAT-TOWN may move: the scatter's view of them, scatterGround) [x0, z0, x1, z1]
const FLAT_BOXES = [
  ...FLAT_ZONES.map((Z) => [Z.x0, Z.z0, Z.x1, Z.z1]),
  [PROM.xo - 0.6, PROM.z0 - 2.4, PROM.x1 + 2.4, PROM.z1 + 2.4],
  [PROM_STAIR.xb - 0.1, PROM_STAIR.zN - 2.1, PROM_STAIR.xa + 3.1, PROM_STAIR.zS + 2.7],
  // (and round every house: a floor's level is the ground before its door, so its ease reaches past the zones)
  ...HOUSE_FLATS.map((f) => { const R = f.hw + f.hd + f.flat + f.ease; return [f.x - R, f.z - R, f.x + R, f.z + R]; }),
];
function promenade(x, z, h) {
  if (FLAT_OFF || PRE80) return h;
  // (C66, ORDER 66.2: before the inland wall the town's level three grid columns out from its face: the guard below stopped
  //  the rule a column short of the "two rows out" it meant, and one point of the old ridge kept by flatTown's 2.8 m rule
  //  stood as a spike, 2.2 m over the street at (−70.43, 4.86) beside the wall's foot; north of z 0.08 the flight's)
  const IW = PROM_WALLS[2];
  if (z > IW.z0 && z < IW.z1 && z > PROM_STAIR.zS + 2.6 && x > PROM.x1 + 1.6 && x < PROM.xi + 3.4) return TOWN_FLAT;
  if (x < PROM.xo - 1.4 || x > PROM.x1 + 1.6 || z < PROM.z0 - 2.3 || z > PROM.z1 + 2.3) return h;
  const ez = Math.max(PROM.z0 - z, z - PROM.z1, 0);
  // (the foot row and the row out from it: where it is water, under the water's floor — the shallow ledges the old
  //  cliff stood on are cut off from the land by the wall, and the trap filler would build them up into a bank before
  //  its face; south of z 15, where it is the harbour's ground, its level)
  if (x < PROM.xo - 0.45) return ez > 0 || z > 15 ? h : Math.min(h, -0.6);
  if (x < PROM.xo + 0.45) { if (ez > 0) return h; const out = islandHeight(x - PROM_STEP, z); return Math.min(h, z > 15 ? out : Math.min(out, -0.6)); }
  const de = Math.hypot(Math.max(x - PROM.x1, 0), ez);
  if (de <= 0) return PROM_H;
  if (z > PROM_STAIR.zN - 2.0 && z < PROM_STAIR.zS + 2.6) return h;   // (the flight and the low ground south of it: promStair's)
  if (z > IW.z0 && z < IW.z1 && x < PROM.xi + 1.2) return TOWN_FLAT;   // (before the inland wall: the town's level, two rows out)
  return lerp(h, PROM_H, (1 - smoothstep(0, 1.5, de)) * smoothstep(1.5, 1.0, Math.abs(h - PROM_H)));
}
// The square's plaza (flattown.js PLAZA, LBA2's): level at its top inside r, the ground under its steps the incline
// through their outer edges (island.js lays the two stone steps over it; the grid's 0.93 m can't hold a step). Not in
// the climb's measure of the ground (CLIMB_OFF: its line starts at the well, and its smoothing, never falling, would
// carry the plaza's top on over the north street where the flight begins)
function plaza(x, z, h) {
  if (FLAT_OFF || PRE80 || CLIMB_OFF) return h;
  const P = PLAZA, r = Math.hypot(x - P.x, z - P.z), w = P.n * P.tread;
  if (r >= P.r + w) return h;
  return r <= P.r ? TOWN_FLAT + P.n * P.step : TOWN_FLAT + P.n * P.step * (P.r + w - r) / w - 0.03 * Math.min(1, (P.r + w - r) / 0.15);   // (3 cm under the steps: their rings are polygons, a chord inside the circle)
}
// the flight up to it (PROM_STAIR): under the steps the ground is the incline through their back edges, level across
// (the steps' own colliders carry him: island.js); north of it level with it for a grid row, the shelf's face easing down to it within 2 m; south of
// it, past the flight's south face, the town's level (the old path's bank there, 3–5.6 m, was a hump in the street)
function promStair(x, z, h) {
  const S = PROM_STAIR;
  if (FLAT_OFF || PRE80 || z < S.zN - 2.0 || z > S.zS + 2.6 || x < S.xb - 0.01 || x > S.xa + 3.0) return h;
  if (x > S.xa) return TOWN_FLAT;   // (before its foot: the street's level, where the old path's ramp began its bank)
  if (z > S.zS - 0.1) return TOWN_FLAT;
  const t = Math.max(0, Math.min(1, (S.xa - x) / (S.xa - S.xb))), r = TOWN_FLAT + (PROM_H - TOWN_FLAT) * t - 0.04 * Math.min(1, t * 5);   // (4 cm under the treads' back edges)
  return lerp(h, r, 1 - smoothstep(0.95, 2.0, S.zN - z));   // (level with the flight one grid row past its north side: the row between ran up over its edge)
}
// WORLD-FIX: every house stands on its own level floor (town.js HOUSE_FLATS): the ground under its footprint and a
// margin round it at the height of the ground before its door, easing back to the land beyond. Applied last, so
// no ramp, rise or town noise tilts a house again. (The ground round each house was measured by tests/worldfit.mjs.)
let FLAT_LVL = null, FLAT_LVL_PRE = null, FLAT_LVL_OFF = null;   // (FLAT-TOWN: the floors as they stood, for FLAT_OFF)
const flatLevels = (F) => F.map((f) => islandHeight0(f.door[0], f.door[1])).map((v, i, a) => (F[i].with != null ? a[F[i].with] : v));
function houseFlats(x, z, h) {
  const FL = PRE80 ? HOUSE_FLATS_PRE : HOUSE_FLATS;
  const LV = PRE80 ? (FLAT_LVL_PRE ??= flatLevels(FL)) : FLAT_OFF ? (FLAT_LVL_OFF ??= flatLevels(FL)) : (FLAT_LVL ??= flatLevels(FL));
  for (let i = 0; i < FL.length; i++) {
    const f = FL[i], dx = x - f.x, dz = z - f.z, R = f.flat + f.ease;
    if (Math.abs(dx) > f.hw + f.hd + R || Math.abs(dz) > f.hw + f.hd + R) continue;
    const ex = Math.abs(f.c * dx - f.s * dz) - f.hw, ez = Math.abs(f.s * dx + f.c * dz) - f.hd;
    const d = ex > 0 && ez > 0 ? Math.hypot(ex, ez) : Math.max(ex, ez);
    if (d < R) h = lerp(LV[i], h, smoothstep(f.flat, R, d));
  }
  return h;
}
// FLAT-TOWN-2 (citadel-layout.js LAWN): the south block's lawns at LBA2's levels, on the grid's points: the bed's (+0.63)
// and the ring's rows (+0.21) at their level, the low rows round them the street's (they are already); the banks between
// are inside the masonry (island.js buildFlatTown)
function lawns(x, z, h) {
  if (FLAT_OFF || PRE80) return h;
  const e = 0.01, [bx0, bz0, bx1, bz1] = LAWN.bedBox, [rx0, rz0, rx1, rz1] = LAWN.ringBox;
  if (x < rx0 - e || x > rx1 + e || z < rz0 - e || z > rz1 + e) return h;
  return x >= bx0 - e && x <= bx1 + e && z >= bz0 - e && z <= bz1 + e ? LAWN.bed : LAWN.ring;
}
export function islandHeight(x, z) {
  // (the climb's ramp level across to its wall, lba1places.js: after the house pads, whose ease ran under its east edge)
  // (FLAT-TOWN: then the promenade's flight and the promenade itself, over the house floors' eases)
  // (FLAT-TOWN-2: then the south block's lawns)
  return lawns(x, z, promenade(x, z, promStair(x, z, plaza(x, z, waterKnoll(x, z, climbGround(x, z, climbRampFill(x, z, houseFlats(x, z, islandHeight0(x, z)), rampAxisHeight)))))));
}

// REVIEW-CITADEL-ART (c): the knoll north of the water office (the first shelf's outline, its wobble, citadel-layout.js)
// ran 2 m past the office's front, so its rock face stood as a heap of blocks in the front yard, left of the door. Its
// east face is cut back to the office's front line (the face's foot on it, KNOLL_FOOT, 2.2 m up per metre back); the
// shelf itself, its south face and its top stay. The scatter and the cliff rocks decide on the ground as it stood
// (scatterGround, KNOLL_OFF: no random draw moves); the rocks of the old face are shaped on the new one.
const KNOLL_BOX = [-68.6, 15.2, -62.5, 21.4], KNOLL_FOOT = -66.2, KNOLL_Y = 2.45;
let KNOLL_OFF = false;
// HARBOUR-BRINK: the harbour platform's sea walls (baseHeight's harbour cut; BRINK_OFF: the soft cut as it stood, for
// the scatter's view of the ground — a rock in the shallows by the quay's south-west corner dropped out of the scatter
// and every rock drawn after it moved)
const BRINK_BOX = [-119.5, 42.5, -78, 60.5];
let BRINK_OFF = false;
// FLAT-TOWN-2's east shore wall reverted (22.11): a v143 save's spot on the ground that wall had made (its top, the
// filled coves, the sunk ledge: V143_EAST) that is now in a cove, on the drop or below the shore: the nearest spot to
// its west on the town's level, terrain or a walkable top such as the footbridge's (the loader grounds him there:
// main.js applySave); any other spot as it is
export function shoreSpot(at, physics) {
  const E = V143_EAST;
  if (!at || !physics || !(at.z > E.z0 && at.z < E.z1 && at.x > E.x0 && at.x < E.x1)) return at;
  // (standable: the ground at the town's level there and 0.6 m round, nothing standing higher over it: a house, a prop)
  const g = (x, z) => { const h = physics.groundAt(x, z); return h < TOWN_FLAT + 0.8 ? h : -99; }, lo = TOWN_FLAT - 0.5;
  const ok = (x) => g(x, at.z) > TOWN_FLAT - 0.35 && g(x + 0.6, at.z) > lo && g(x - 0.6, at.z) > lo && g(x, at.z + 0.6) > lo && g(x, at.z - 0.6) > lo;
  if (ok(at.x)) return at;
  for (let x = at.x - 0.25; x > E.x0 - 6; x -= 0.25) if (ok(x)) return { ...at, x: x - 0.4 };
  return at;
}
// C66 (ORDER 66.2): an older save's spot that C66's colliders now shut out: on the sea wall's coping outside the
// promenade's rail or the slope west of the walk's north end (PROM_EDGE: island.js promEdge closed the gaps there) loads
// on the walk inside it; in or against the water main's meter cabinet where it stands now (PIPE_METER, 0.8 m east of
// where it stood) on the walk west of it (the loader grounds him and unwedge clears any post: main.js applySave); any
// other spot as it is
export function promSpot(at) {
  if (!at) return at;
  const E = PROM_EDGE, M = PIPE_METER, r = 0.4;
  if (at.z > E.zN && at.z < E.z1 && at.x > PROM.xo - 1.2 && at.x < E.out) return { ...at, x: E.back, z: Math.max(at.z, E.z0 + 0.5) };
  if (at.x > M.x - M.west - r && at.x < M.x + M.east + r && Math.abs(at.z - M.z) < M.half + r) return { ...at, x: M.x - M.west - r - 0.05 };
  return at;
}
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
let CLIMB_OFF = false, CLIMB_PROF = null, CLIMB_PROF_ON = null, CLIMB_PROF_OFF = null;   // (FLAT-TOWN: one for the ground as it stood, FLAT_OFF)
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
let CLIMB_NZ = null, CLIMB_NZ_ON = null, CLIMB_NZ_OFF = null;
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
  CLIMB_NZ = FLAT_OFF ? (CLIMB_NZ_OFF ??= climbNorthProfile()) : (CLIMB_NZ_ON ??= climbNorthProfile());
  const P = CLIMB_NZ, f = Math.max(0, Math.min(P.length - 1.001, (CLIMB_NZ0 - z) / CLIMB_NDZ)), i = Math.floor(f), ph = P[i] + (P[i + 1] - P[i]) * (f - i);
  const r = smoothstep(0.1, 0.4, ph - h), w = 1 - smoothstep(lerp(0.2, 0.5, r), lerp(1.4, 0.6, r), d);
  return lerp(h, ph, w);
}
function climbGround(x, z, h) {
  if (CLIMB_OFF || PRE80 || x < CLIMB_BOX[0] || x > CLIMB_BOX[2] || z < CLIMB_BOX[1] || z > CLIMB_BOX[3]) return h;
  CLIMB_PROF = FLAT_OFF ? (CLIMB_PROF_OFF ??= climbProfile()) : (CLIMB_PROF_ON ??= climbProfile());
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
// (P121: `along` > 0 tests points every `along` m along each triangle's edges too: a wall thinner than the rock runs
//  through it between its corners)
function dropRocks(mesh, inside, [x0, z0, x1, z1], along = 0) {
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
  for (const t of near) for (let v = 0; v < 3; v++) {
    const i = t * 3 + v; if (inside(A[i * 3], A[i * 3 + 2], A[i * 3 + 1])) { gone.add(find(key(i))); continue; }   // (x, z, y)
    if (!along) continue;
    const j = t * 3 + (v + 1) % 3, L = Math.hypot(A[j * 3] - A[i * 3], A[j * 3 + 1] - A[i * 3 + 1], A[j * 3 + 2] - A[i * 3 + 2]), n = Math.floor(L / along);
    for (let k = 1; k < n; k++) { const f = k / n; if (inside(A[i * 3] + (A[j * 3] - A[i * 3]) * f, A[i * 3 + 2] + (A[j * 3 + 2] - A[i * 3 + 2]) * f, A[i * 3 + 1] + (A[j * 3 + 1] - A[i * 3 + 1]) * f)) { gone.add(find(key(i))); break; } }
  }
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

// P121: a cliff rock that built masonry now stands in (the fort's south wall over the hostel's yard, the climb's yard
// walls: tests/overlap-sweep.mjs (g)) goes whole, once everything on Citadel is built (main.js, after the asylum's
// climb and the hatches): a corner of it, or a point on an edge (every 10 cm), 10 cm or more inside a box collider (a
// wall, a house, steps; not the camera's own volumes), under its top
export function rocksOutOfMasonry(W) {
  if (ROCKS_OLD || !W_cliffs) return 0;
  const P = W.physics, inBox = (c, x, z) => { const dx = x - c.x, dz = z - c.z, lx = dx * c.cos + dz * c.sin, lz = -dx * c.sin + dz * c.cos; return Math.min(c.hw - Math.abs(lx), c.hd - Math.abs(lz)); };
  return (W_cliffs.mesh.userData.masonryDropped = dropRocks(W_cliffs.mesh, (x, z, y) => P.near(x, z).some((c) => c.type === 'box' && c.enabled && !c.camOnly && y > c.bottom && y < c.top - 0.1 && inBox(c, x, z) > 0.1), [-220, -130, 70, 160], 0.1));
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
  // the town's paving: the square, its streets and Bug Street's foot (REVIEW-CITADEL-ART b), the way up to the fort's
  // terrace (CLIMB-1), the quay (AUDIT-FIX, P49: to its east face), LBA2's grid streets, the promenade and the harbour's
  // yard (MAP-ORIG), the fort and its forecourt. LAWN-EDGES: a step at the noise-free edge (townPaveDist): the shader
  // cuts it straight per pixel (the edge attribute); this copy is for the map, the probes and the scatter's filters
  if (townPaveDist(x, z, h) < 0) w[4] = 3;
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
  // (LAWN-EDGES: the plots' earth band along the paving, TOWN_BLOCKS' before, is the shader's: townBandW)
  if (flatClear(x, z, 0.6)) w[2] = 0;   // (FLAT-TOWN: no cliff rock at a wall's or the flight's foot: the steep bank is inside the masonry)
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
  const rock = smoothstep(0.1, 0.2, b) * away * smoothstep(7, 11, yd) * (inTownGrid(x, z) ? 0 : 1);   // (MAP-ORIG: no bare rock among LBA2's town streets)
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
  // (the difference before − then added to the terrain's own point as it then stood, so the pit fills and the trap
  //  filler's steps stay. FLAT-TOWN: "then", the ground before FLAT-TOWN (FLAT_OFF), so every view below is the one the
  //  scatter had; the terrain's point as it then stood: FLAT_THEN, the grid built from that ground, trap filler and all)
  const thenAt = (k, x, z) => { FLAT_OFF = true; const old = islandHeight(x, z); FLAT_OFF = false; return [FLAT_THEN[k], old]; };
  const view = (boxes, off) => {
    for (const [x0, z0, x1, z1] of boxes) {
      for (let j = Math.max(0, jz(z0)); j <= Math.min(T.segs, jz(z1)); j++) for (let i = Math.max(0, ix(x0)); i <= Math.min(T.segs, ix(x1)); i++) {
        const k = j * n + i, x = T.x0 + i * T.step, z = T.z0 + j * T.step;
        if (pre.has(k)) continue;
        const [base, old] = thenAt(k, x, z);
        off(true); FLAT_OFF = true; const before = islandHeight(x, z); FLAT_OFF = false; off(false);
        const d = before - old;
        if (d !== 0) pre.set(k, base + d);
      }
    }
  };
  view(PRE80_BOXES, (v) => { PRE80 = v; });
  view([CLIMB_BOX], (v) => { CLIMB_OFF = v; });   // (CLIMB-2: and the ramp's corridor as it stood before its even incline, so no random draw moves)
  view([KNOLL_BOX], (v) => { KNOLL_OFF = v; });   // (REVIEW-CITADEL-ART c: and the water office's knoll as it stood before its east face was cut back)
  view([BRINK_BOX], (v) => { BRINK_OFF = v; });   // (HARBOUR-BRINK: and the ground by the harbour platform's sea walls as it stood before the brink was made level)
  // (FLAT-TOWN: and the town's ground, the promenade, its flight and the house floors as they stood before they were made level)
  for (const [x0, z0, x1, z1] of [FLAT_WINDOW]) {
    for (let j = Math.max(0, jz(z0)); j <= Math.min(T.segs, jz(z1)); j++) for (let i = Math.max(0, ix(x0)); i <= Math.min(T.segs, ix(x1)); i++) {
      const k = j * n + i;
      if (pre.has(k)) continue;
      const base = FLAT_THEN[k];
      if (base !== T.heights[k]) pre.set(k, base);
    }
  }
  // (CAVE-STAIR: and the ground under the plateau's stair as it stood before it was cut to the flight's line)
  for (const [k, v] of STAIR_PRE) if (!pre.has(k)) pre.set(k, v);
  const hv = (i, j) => { i = Math.max(0, Math.min(T.segs, i)); j = Math.max(0, Math.min(T.segs, j)); const k = j * n + i; return pre.has(k) ? pre.get(k) : T.heights[k]; };
  const near = (x, z, m) => [...PRE80_BOXES, CLIMB_BOX, KNOLL_BOX, BRINK_BOX, PLATEAU_STAIR_BOX, FLAT_WINDOW].some(([x0, z0, x1, z1]) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m);
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
let STAIR_PRE = new Map();   // (CAVE-STAIR: the grid's points under the plateau's stair before the cut: index → height)
let FLAT_THEN = null;   // (FLAT-TOWN: the grid before it, buildHeightGrid)
const FLAT_WINDOW = [...FLAT_BOXES, CLIMB_BOX].reduce((a, b) => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])], [Infinity, Infinity, -Infinity, -Infinity]);
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
  // FLAT-TOWN: the grid as it stood before (FLAT_OFF), trap filler and all, for the scatter's view (scatterGround): the
  // same raw points outside FLAT_WINDOW, the ground as it stood inside it
  {
    const old = h.slice(), [wx0, wz0, wx1, wz1] = FLAT_WINDOW;
    FLAT_OFF = true;
    for (let j = Math.max(0, Math.ceil((wz0 - Z0) / step)); j <= Math.min(segs, Math.floor((wz1 - Z0) / step)); j++)
      for (let i = Math.max(0, Math.ceil((wx0 - X0) / step)); i <= Math.min(segs, Math.floor((wx1 - X0) / step)); i++) old[j * n + i] = islandHeight(X0 + i * step, Z0 + j * step);
    FLAT_OFF = false;
    fixTraps(old, n, X0, Z0, step);
    FLAT_THEN = old;
  }
  const trapped = fixTraps(h, n, X0, Z0, step);
  // CAVE-STAIR: the ground under the plateau's stair cut to the flight's line (island.js plateauStairGround), after the
  // trap filler: the island's own ground there is the sea cliff (6–9 m), and what lay over the treads was the filler's
  // fill stepping down from the bank (0.79 m a point); cut before it, the filler only filled it again. The points as
  // they stood are kept for scatterGround (no random draw moves)
  STAIR_PRE = new Map();
  {
    const [x0, z0, x1, z1] = PLATEAU_STAIR_BOX;
    for (let j = 0; j < n; j++) { const z = Z0 + j * step; if (z < z0 || z > z1) continue;
      for (let i = 0; i < n; i++) { const x = X0 + i * step; if (x < x0 || x > x1) continue;
        const a = j * n + i, v = plateauStairGround(x, z, h[a]); if (v !== h[a]) { STAIR_PRE.set(a, h[a]); h[a] = v; } } }
  }
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
  const terrain = new Terrain({ size: TERRAIN_SIZE, segs: TERRAIN_SEGS, cx: ISLAND.cx, cz: ISLAND.cz, heightFn: grid.at, colorFn: islandColor, splatFn: islandSplat, edgeFn: islandEdge, textures: { ...TX, rock: TX.cliff } });   // (LAWN-EDGES: edgeFn)
  tintGrid = null;
  scene.add(terrain.mesh);
  const physics = new Physics(terrain);
  const zones = new ZoneSystem();
  const H = (x, z) => terrain.heightAt(x, z);
  yield 'ground';
  // faceted rock faces on the terrace cliffs (not on the path ramps or the paved quay)
  // (WORLD-80: the scatter's view of the ground, as it stood before step 2: see PATHS_SCATTER)
  const SG = scatterGround(terrain), HS = SG.heightAt;
  climbShelfRows(H);   // (CLOUD_ORDERS 17: the shelf's fill on this ground, so the rocks and the scatter keep out of it)
  // (P121: the rocks where masonry now stands go inside buildCliffRocks, before the rest are settled — were dropRocks
  //  after it: a rock settled against one that was then dropped)
  W_cliffs = buildCliffRocks(scene, terrain, TX.cliff, {
    decide: SG,
    skip: (x, z) => pathDistScatter(x, z) < 3.2 || boxDist(x, z, QUAY.x0 - 2, QUAY.z0 - 2, QUAY.x1 + 2, QUAY.z1 + 2) < 0,
    cut: [
      [climbDropRock, [-45, -54, -20, -16]],   // (CLIMB-1; CLIMB-15: and the shelf's wall; CLOUD_ORDERS 17: and the new paving)
      // (FLAT-TOWN: the rocks of the old sea cliff and ridge under the promenade, its walls and its flight; flatClear)
      [(x, z) => (x > -77.4 && x < PROM.x1 + 0.3 && z > PROM.z0 - 0.4 && z < PROM_WALLS[1].z1 + 0.2) || flatClear(x, z, 0.4), [-78, PROM.z0 - 3, PROM_STAIR.xa + 1, 21]],
      [(x, z, y) => plateauStairAt(x, z, 0, y), [-90, -88, -78, -78]],   // (REVIEW-CITADEL-ART d: the steps up from the plateau's door, island.js; CAVE-STAIR: and a rock standing up through its landing)
    ],
  });
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
  W.gridPaveDist = gridPaveDist;   // (C66: the town's kerbs keep off where the grid's paving lies on both sides, town.js curbs)
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
  // OVERLAP-SWEEP: the grass and wild flowers a later builder's paving, plates or kerbs stand over (the scatter ran before it
  // was built): hidden once, as the scatter hides one (scaled to 1e-4), where an upward face of root's static meshes lies
  // over the tuft's foot (up to 0.5 m: a slab, a plate, a kerb, a step) or less than 5 cm under it. Placement time only
  // (a 1 m grid of root's upward faces).
  W.clearSmallUnder = (root) => {
    root.updateMatrixWorld(true);
    const cells = new Map(), v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nn = new THREE.Vector3();
    root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.geometry?.attributes.position) return;
      const m = [o.material].flat()[0]; if (!m || m.transparent || m.visible === false) return;
      const g = o.geometry, p = g.attributes.position, ix = g.index, n = ix ? ix.count : p.count;
      for (let t = 0; t + 2 < n; t += 3) {
        for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(p, ix ? ix.getX(t + k) : t + k).applyMatrix4(o.matrixWorld);
        nn.crossVectors(e1.subVectors(v[1], v[0]), e2.subVectors(v[2], v[0])); const L = nn.length(); if (L < 1e-9 || nn.y / L < 0.7) continue;
        const T = [v[0].x, v[0].y, v[0].z, v[1].x, v[1].y, v[1].z, v[2].x, v[2].y, v[2].z];
        for (let i = Math.floor(Math.min(T[0], T[3], T[6])); i <= Math.floor(Math.max(T[0], T[3], T[6])); i++) for (let j = Math.floor(Math.min(T[2], T[5], T[8])); j <= Math.floor(Math.max(T[2], T[5], T[8])); j++) { const key = i * 100003 + j; let l = cells.get(key); if (!l) cells.set(key, l = []); l.push(T); }
      }
    });
    if (!cells.size) return 0;
    const under = (x, y, z) => { for (const T of cells.get(Math.floor(x) * 100003 + Math.floor(z)) || []) {
      const d = (T[5] - T[8]) * (T[0] - T[6]) + (T[6] - T[3]) * (T[2] - T[8]); if (Math.abs(d) < 1e-12) continue;
      const a = ((T[5] - T[8]) * (x - T[6]) + (T[6] - T[3]) * (z - T[8])) / d, b = ((T[8] - T[2]) * (x - T[6]) + (T[0] - T[6]) * (z - T[8])) / d, c = 1 - a - b;
      if (a < 0 || b < 0 || c < 0) continue;
      const ty = a * T[1] + b * T[4] + c * T[7]; if (ty > y - 0.05 && ty < y + 0.5) return true; } return false; };   // (a plate, a slab, a kerb: not a roof high over it)
    const M = new THREE.Matrix4(), P0 = new THREE.Vector3(), S = new THREE.Vector3(1e-4, 1e-4, 1e-4); let hid = 0;
    for (const P of W.smallPools) for (const t of P.tiles) {
      let ch = false;
      for (let i = 0; i < t.count; i++) {
        t.getMatrixAt(i, M); const e = M.elements; if (e[0] * e[0] + e[1] * e[1] + e[2] * e[2] < 1e-4) continue;
        P0.setFromMatrixPosition(M);
        if (under(P0.x, P0.y, P0.z)) { M.scale(S); t.setMatrixAt(i, M); ch = true; hid++; }
      }
      if (ch) { t.instanceMatrix.needsUpdate = true; P.dirty = true; }
    }
    if (hid && W.smallPools.some((P) => P.im)) fillPools();   // (before the pools exist, their first fill takes the change)
    return hid;
  };
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
  const fenceDist = (x, z) => distToSegment(x, z, LAWN_FENCE[0][0], LAWN_FENCE[0][1], LAWN_FENCE[1][0], LAWN_FENCE[1][1]);   // (CITADEL-ORIG-2: the lawn strip's lattice fence)
  for (const t of [...trees, ...bushes]) if (!t.gone && (gridPaveDist(t.x, t.z) < 1.2 || flatClear(t.x, t.z, 1.0) || fenceDist(t.x, t.z) < 1.4)) { t.s = 1e-4; t.gone = true; }   // (MAP-ORIG: none on the new paving; filtered after the scatter, so no random draw moves)
  // (FLAT-TOWN-2: none in the lawns' masonry, by their size: a tree's trunk and a bush's crown keep off it)
  for (const t of trees) if (!t.gone && lawnClear(t.x, t.z, 0.6 + 0.42 * t.s)) { t.s = 1e-4; t.gone = true; }
  for (const b of bushes) if (!b.gone && lawnClear(b.x, b.z, 0.3 + 0.6 * b.s)) { b.s = 1e-4; b.gone = true; }
  // (LAWN-EDGES: none on the plots' earth band: the bushes stand in the lawn inside it, as LBA2's plants in its blocks)
  W.lawnEdges = { bushes: 0 };
  for (const b of bushes) if (!b.gone && onTownBand(b.x, b.z, H(b.x, b.z), 0.3 * b.s)) { b.s = 1e-4; b.gone = true; W.lawnEdges.bushes++; }
  { const L = LAWN.box, beds = PROPS.tulips.filter(([x0, x1, z]) => x0 > L[0] && x1 < L[2] && z > L[1] && z < L[3]);   // (and off its tulip beds, island.js fits them after)
    for (const b of bushes) if (!b.gone && beds.some(([x0, x1, z]) => boxDist(b.x, b.z, x0 - 0.5, z - 0.7, x1 + 0.5, z + 0.7) < 0.6 * b.s + 0.6)) { b.s = 1e-4; b.gone = true; } }
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
  // (CAM-CROWN, PLAYTHROUGH PT-7: the tall trees' and the pines' crowns reach down to a metre over the ground: the play
  //  camera's sight lines count their dense core, `sight` (camera.js _line), as it counts a wall)
  // (CAM-COVER, release audit v75 F-8: and the round and fruit trees' crowns, from 1.95 m up — the leaf mass round
  //  2.85 m, vegetation.js, its lobes 1.0 m out —: by the hopscotch a round crown filled the view between the camera and
  //  him, his outline showing, while the sight test read him as seen. A line under the crown still sees him. `soft`:
  //  counted once he has stood a moment, camera.js CH_SOFT_T)
  // (AUDIT-FIX, RELEASE-AUDIT-v96 A-6/F-8: the round and fruit crowns' shape for the camera is the leaf mass as drawn,
  //  `bulb`: measured on the crowns' meshes (every variant, both LODs), 1.75–1.9 m round from 2.3 to 3.5 m, 1.4 m at 2.0 m and
  //  at 3.9 m, from 1.8 to 4.1 m (the instance stands 8 cm low): a round flattened at top and foot. The cylinder of 1.5 m from
  //  1.95 m stood 0.3–0.4 m inside the leaves, so a camera with its arm's end in them read him as seen while the crown
  //  filled the frame (camcover's crown spot, the cliff plateau's tree in chapter 2))
  const SIGHT = { tall: [0.62, 1.1, 5.6], pine: [0.85, 1.0, 4.6], round: [1.9, 1.72, 4.02, true], fruit: [1.9, 1.72, 4.02, true] };   // (core radius, from, to: m at scale 1; bulb)
  for (const t of trees) if (!t.gone) {
    const S = SIGHT[t.kind];
    physics.add({ type: 'cyl', x: t.x, z: t.z, r: (t.kind === 'palm' ? 0.3 : 0.42) * t.s, camR: 1.5 * t.s, top: t.h + 6 * t.s, seeThrough: false, ...(S ? { sight: { r: S[0] * t.s * (CROWN[t.kind] ?? 1), y0: t.h + S[1] * t.s, y1: t.h + S[2] * t.s, soft: t.kind === 'round' || t.kind === 'fruit', bulb: !!S[3] } } : {}) });
  }
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
  for (const t of [...grass, ...flowers]) if (!t.gone && (gridPaveDist(t.x, t.z) < 0.5 || flatClear(t.x, t.z, 0.3) || lawnClear(t.x, t.z, 0.3) || onTownBand(t.x, t.z, H(t.x, t.z), 0.15) || townPaveDist(t.x, t.z, H(t.x, t.z)) < 0.3 || fenceDist(t.x, t.z) < 0.35)) { t.s = 1e-4; t.gone = true; }   // (MAP-ORIG: none on the new paving; LAWN-EDGES: nor on the plots' earth band)
  for (const t of [...grass, ...flowers]) if (!t.gone && (inNewHouse(t.x, t.z, 0.4) || isletSteep(t.x, t.z, 0.6) || keepClearNew(t.x, t.z, -0.6))) { t.s = 1e-4; t.gone = true; }   // (WORLD-80)
  // (OVERLAP-SWEEP: none where the ground is drawn as paving — the terrain's own cobble weight at the tuft's foot, the
  //  nearest vertex of the grid as drawn; 289 tufts and flowers stood on painted cobbles. Filtered after the scatter)
  { const F = terrain.mesh.userData.full, C2 = F?.attributes.splat2, Pp = F?.attributes.position;
    if (C2 && Pp) { const n = Math.round(Math.sqrt(Pp.count)), ox = terrain.mesh.position.x, oz = terrain.mesh.position.z, x0 = Pp.getX(0) + ox, z0 = Pp.getZ(0) + oz, st = Pp.getX(1) - Pp.getX(0);
      const cob = (x, z) => { const i = Math.round((x - x0) / st), j = Math.round((z - z0) / st); return i < 0 || j < 0 || i >= n || j >= n ? 0 : C2.getX(j * n + i); };
      for (const t of [...grass, ...flowers]) if (!t.gone && cob(t.x, t.z) >= 0.5) { t.s = 1e-4; t.gone = true; } } }
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
  const lifeBeds = new Set(); for (const list of beds) for (const t of list) if (lifeClear(t.x, t.z) || inNewHouse(t.x, t.z, 0.6) || newPathDist(t.x, t.z) < 1.7 || gridPaveDist(t.x, t.z) < 0.8 || flatClear(t.x, t.z, 0.6) || lawnClear(t.x, t.z, 0.3) || fenceDist(t.x, t.z) < 0.6 || streetDist(t.x, t.z) < 0.7) lifeBeds.add(t.bed);   // (the user, 16.11, a picture: yellow tulips growing out of MAP-ORIG's new paving — a bed touching any paving is left out whole; FLAT-TOWN-2: or the lawns' masonry)
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
  // (TEST-DEBT, slidetraps: and every house's walls, as TREES-1 keeps the trees and bushes out of them — the scatter
  //  checks only the new houses, so a boulder stood half inside the stone house's west corner (−31.5, −25.0), stopping
  //  the lane round it dead and holding a slide off the terrace bank in the pocket behind it: SLIDE-RESCUE found no
  //  footing and put him back)
  for (const r of rocks) if (blockDist(r.x, r.z, false) < r.s * 1.1 + 0.2 || gridPaveDist(r.x, r.z) < r.s * 1.1 || flatClear(r.x, r.z, r.s * 1.1) || fenceDist(r.x, r.z) < r.s * 1.1 + 0.3 || doorLane(r.x, r.z, r.s * 1.1) || isletClear(r.x, r.z) || newPathDist(r.x, r.z) < 2.5 || inNewHouse(r.x, r.z, r.s * 1.1 + 0.3) || keepClearNew(r.x, r.z, r.s * 1.1) || (r.h > 1.2 && isletSteep(r.x, r.z, 0.55)) || climbClear(r.x, r.z, r.s * 1.1) || benchRoom(r.x, r.z, r.s * 1.1)) r.s = 1e-4;
  const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  for (let v = 0; v < 3; v++) mkInst(rockGeometry(v + 1), rockMat, rocks.filter((r, i) => i % 3 === v), true, (c) => c.setRGB(1, 1, 1).multiplyScalar(0.9 + rand() * 0.15), rockGeometry(v + 1, 1));
  if (BATCH.on) batchFor(rockMat).build();
  for (const r of rocks) if (r.s > 0.6) physics.add({ type: 'cyl', x: r.x, z: r.z, r: r.s * 1.1, top: r.h + r.s * 0.95, seeThrough: true });

  yield 'plants';
  // ---------- harbour, station, depot, pipeline, valves (see island.js) ----------
  W.signs = [];
  W.pathDist = pathDist;
  W.shoreSpot = (at) => shoreSpot(promSpot(at), physics);   // (an older save's spot on FLAT-TOWN-2's reverted east shore wall, main.js applySave; C66: outside the promenade's rail or in the meter cabinet)
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
    physics.add({ type: 'cyl', x: L.x, z: L.z, r: 3.1, top: g + 15 });   // (MAP-ORIG: the tower is 14.6 m to its finial)
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
    part(new THREE.CircleGeometry(0.52, 32), face, 0, 0, 0.062); part(new THREE.CircleGeometry(0.52, 32), face, 0, 0, -0.062, Math.PI);   // (painted both sides; AUDIT-FIX: 7 mm off the butt's faces, at 0.057 they flickered against them, worldfit)
    part(new THREE.TorusGeometry(0.575, 0.045, 8, 36), ringMat, 0, 0, 0);   // the hoop: its glow says hit or not
    part(new THREE.BoxGeometry(0.1, 0.2, 0.18), wood, 0, -0.62, 0);   // the bracket over the post's pin
    mergeStatic(disc, { recolor: true, retex: true });   // (the butt, the bracket and both faces: one draw; the hoop, whose glow changes, its own)
    physics.add({ type: 'cyl', x: T.x, z: T.z, r: 0.25, top: g + 2.4, seeThrough: true });
    W.target = { x: T.x, y: ty, z: T.z, ringMat, disc, hit: false };
    W.updaters.push((dt, t) => { if (!W.target.hit) disc.rotation.z = Math.sin(t * 2) * 0.07; });

    // shard pedestal on top of the plateau
    const pg = H(P.x, P.z);
    physics.add({ type: 'cyl', x: P.x, z: P.z, r: 0.9, top: pg + 1.0 });
    W.shard1Spot = { x: P.x, y: pg + 2.0, z: P.z };
    // some standing stones up there, round the shard's pedestal
    // (STONES-PLATEAU, release audit v75: they were bare flat-grey boxes and the pedestal a plain grey drum, seven draws;
    //  now rough slabs of the cliff's own rock with lichen, broad face to the centre, and a hand-cut pedestal, in the
    //  cliff rocks' material as the stepping stones (STONES-31): one mesh for all seven, cliffs.js plateauStonesGeometry.
    //  The colliders are the ones they had)
    const ring = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = P.x + Math.cos(a) * 6.5, z = P.z + Math.sin(a) * 6.5 / 1.15;
      ring.push({ x, z, ry: Math.atan2(Math.cos(a), Math.sin(a)) + Math.sin(i * 2.3) * 0.22, h: 3 + (i % 2) * 0.5, seed: 7301 + i * 613 });
      physics.add({ type: 'cyl', x, z, r: 0.6, top: H(x, z) + 3.5 });
    }
    const plateauStones = new THREE.Mesh(plateauStonesGeometry({ stones: ring, pedestal: { x: P.x, z: P.z, y: pg, h: 1.0 }, ground: H }), W_cliffs.mesh.material);
    plateauStones.castShadow = plateauStones.receiveShadow = true; plateauStones.name = 'plateauStones';
    scene.add(plateauStones);
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
  W.givers.push({ id: 'stump', ...STUMP, r: 2.0, top: 0.8, kinds: ['money'], n: 10, once: true });   // (CLOVER-BALANCE option A: 10 kashes in place of its clover, once ever as before)
  // the Dino-Fly naps where he lay in LBA2 (DINOFLY-POS): the user's files place him (scene 49, the start of LBA2 after
  // the storm, and scene 195; File3D 109, body 167) south-west of Twinsen's house, at our (-58.0, 95.3), turned 1200 of
  // 4096 (1.84 rad); twelve years on it is still his spot in the grass behind the house
  // (BEHAVIOUR-MODES, P125: for the yard's sneak step he naps on the yard's west lawn; ?dino=lba2 puts him back on this
  //  shelf: dinofly.js DINO_AT)
  buildDinoFly(scene, W, DINO_AT.x, DINO_AT.z, DINO_AT.ry);
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
  W.gridKerbs = () => gridKerbs(W);
  return W;
}

// LAWN-EDGES: the kerb stones along every straight edge of the grid's paving (GRID_RECTS but the promenade, the harbour's
// two yards) where a plot lies beyond it (townBandW), the town's stones (town.js curbs: 0.2 × 0.16 m, 0.12 m off the
// paving's edge); called once the town's dressing stands (citydress.js), so they keep off everything on the ground:
// a collider over the ground (a house, a wall, the lawns' masonry, a bench, a lamp, a bush), the sewer's hatches, a
// change of level, paving beyond the kerb (it divides nothing: C66), a kerb already laid (the streets', an earlier
// line's: at a corner the first line runs on to the other street's paving, the second stops against it). Each valid run
// is filled with stones stretched to fit it. Returns [x, y, z, ang, len] for town.js kerbMesh.
function gridKerbs(W) {
  const { physics: P, H } = W, out = [], CELL = 0.5, laid = new Map();
  const key = (x, z) => Math.floor(x / CELL) * 100003 + Math.floor(z / CELL);
  const lay = (x, z) => { const k = key(x, z); let l = laid.get(k); if (!l) laid.set(k, l = []); l.push(x, z); };
  const near = (x, z, r) => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const l = laid.get(key(x + i * CELL, z + j * CELL)); if (l) for (let q = 0; q < l.length; q += 2) if (Math.hypot(l[q] - x, l[q + 1] - z) < r) return true; } return false; };
  for (const [x, , z, a] of W.kerbStones || []) for (let s = -0.28; s <= 0.28; s += 0.07) lay(x + Math.sin(a) * s, z + Math.cos(a) * s);
  const hatch = (x, z) => Object.values(HATCHES).some((h) => { const r = h.S + (h.rails ? 0.7 : 0.3) + 0.2; return Math.abs(x - h.x) < r && Math.abs(z - h.z) < r; });
  const ok = (x, z, nx, nz) => {
    const h = H(x, z), parts = townPaveParts(x, z, h);
    if (Math.min(parts[0], parts[1]) < 0.015) return false;   // (on paving: another street's)
    const qx = x + nx * 0.5, qz = z + nz * 0.5, hq = H(qx, qz);
    if (!(townBandW(qx, qz, hq) > 0) || Math.abs(hq - h) > 0.12) return false;   // (a plot beyond it, at its level)
    if (townPaveDist(x + nx * 0.35, z + nz * 0.35, h) < 0) return false;
    if (Math.abs(H(x - nx * 0.3, z - nz * 0.3) - h) > 0.06) return false;   // (the paving level with it)
    if (flatClear(x, z, 0.1) || lawnClear(x, z, 0.1) || hatch(x, z) || near(x, z, 0.11)) return false;
    for (const c of P.near(x, z)) if (c.enabled && c.top > h + 0.04 && P._inside(c, x, z, 0.1)) return false;
    return true;
  };
  // a kerb's line: from (ax, az) along (ux, uz) for L m, the plot on the side (nx, nz)
  const line = (ax, az, ux, uz, L, nx, nz) => {
    const st = 0.05, n = Math.floor(L / st);
    let s0 = -1;
    const run = (a, b) => {   // samples a..b valid
      const len = (b - a) * st; if (len < 0.3) return;
      const k = Math.max(1, Math.round(len / 0.55)), sl = len / k;
      for (let i = 0; i < k; i++) {
        const t = a * st + (i + 0.5) * sl, x = ax + ux * t, z = az + uz * t;
        out.push([x, H(x, z), z, Math.atan2(ux, uz), sl - 0.01]);
      }
      for (let i = a; i <= b; i++) lay(ax + ux * i * st, az + uz * i * st);
    };
    for (let i = 0; i <= n; i++) {
      const good = ok(ax + ux * i * st, az + uz * i * st, nx, nz);
      if (good && s0 < 0) s0 = i;
      if (!good && s0 >= 0) { run(s0, i - 1); s0 = -1; }
    }
    if (s0 >= 0) run(s0, n);
  };
  const o = 0.12, e = 0.22;   // (the stone's centre off the paving; its outer face)
  for (const R of GRID_RECTS) {
    if (R.prom) continue;
    const px = -R.uz, pz = R.ux;   // (across the street)
    const t0 = R.ea === 'square' ? -R.hw - e : 0, t1 = R.len + (R.eb === 'square' ? R.hw + e : 0);
    for (const sd of [-1, 1]) {
      const ax = R.x0 + R.ux * t0 + px * sd * (R.hw + o), az = R.z0 + R.uz * t0 + pz * sd * (R.hw + o);
      line(ax, az, R.ux, R.uz, t1 - t0, px * sd, pz * sd);
    }
    // a free end: its kerb across the street
    for (const [end, t, sg] of [[R.ea, 0, -1], [R.eb, R.len, 1]]) {
      if (end !== 'square') continue;
      const cx = R.x0 + R.ux * (t + sg * (R.hw + o)), cz = R.z0 + R.uz * (t + sg * (R.hw + o)), w = R.hw + e;
      line(cx - px * w, cz - pz * w, px, pz, 2 * w, R.ux * sg, R.uz * sg);
    }
  }
  for (const B of [HARBOUR_YARD, HARBOUR_SE]) {
    const W2 = B.x1 - B.x0 + 2 * e, D2 = B.z1 - B.z0 + 2 * e;
    line(B.x0 - e, B.z0 - o, 1, 0, W2, 0, -1); line(B.x0 - e, B.z1 + o, 1, 0, W2, 0, 1);
    line(B.x0 - o, B.z0 - e, 0, 1, D2, -1, 0); line(B.x1 + o, B.z0 - e, 0, 1, D2, 1, 0);
  }
  W.lawnEdges = { ...(W.lawnEdges || {}), kerbs: out.length, streetKerbs: (W.kerbStones || []).length };
  return out;
}
