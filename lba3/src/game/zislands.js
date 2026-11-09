// Zeelich's other islands: Otringal, Knartas, Mosquibee Island, Celebration Island, Under-gas, the CX islet and the
// High Platform. Each is its own outdoor region (like Desert Island), reached by an Esmer shuttle from the pad by
// Zeelich's dock (src/game/story/islands.js). They are open places to explore: no story is set on them.
//
// Their layouts are numbers measured from the original game's islands (assets/lba2/islands/*.json, see
// ASSET_MANIFEST.md): the ground heights, every second cell of the original height grids (≈ 1.71 m apart), and
// where the original's objects stood, as bounding boxes with a size class. Everything drawn here is ours: the
// ground is painted with Zeelich's palette, and each object becomes one of our own pieces of the same size at the
// same place (an Esmer house with a dome, a deck, a wall, a spire, a tree, a rock, a crate, a plant).
//
// The original's level 0 is the sea of clouds: a cell at 0 (or a missing section) is sea here, which nobody may
// enter (the terrain drops to SEA under the clouds), so the islands' edges hold like Zeelich's.
//
// CONTRACT (src/game/story/islands.js, tests/zislands.mjs). World coordinates.
//   ISLES [name]; preloadIslands() (before the game is built); buildIslands(scene, physics) → { isle_<name>: R }
//   R.isle (name); R.spawn {x,z,a} beside the shuttle; R.pad {x,z,y} the shuttle (its interactable); R.cloudY
//   R.land(x, z) → is this ground (not sea); R.sample [{x,z}] points of the main walkable area
import * as THREE from 'three';
import { Terrain } from '../engine/terrain.js';
import { textures } from '../engine/textures.js';
import { rng, smoothstep, fbm } from '../engine/math.js';
import { SpriteBatch } from '../engine/spritebatch.js';
import { MAX_SLOPE } from '../engine/physics.js';
import { rockGeometry, treeGeometry } from './vegetation.js';
import { tm, pm, cached, bbox, cyl, lathe, tint, Batch, instances, cullInstances, brassM, panelGeo, frameGeo, fillGeo, BATCH, ctex } from './kit.js';
import { esmerShuttle, shuttleTraffic } from './shuttle.js';
import { cloudTex, puffTex, domeTex } from './zeelich.js';
import * as EP from './props-esmer.js';
import { placeLayout, PLACES, OLDWATCH, watchAt, BUILDINGS } from './zplaces.js';
import { fitAdd } from './worldfit.js';
import { buildCelPortal } from './celtemple.js';

// The original's Zeelich islands (assets/lba2/islands, numbers from the user's files: tools/lba2-islands.py), then
// our own places (src/game/zplaces.js). (Appended at the end: an island's place in the world is its index, and
// saves keep a position on an island.)
//   liftdock    the original's ASCENCE: a cargo lift dock on stilts at the cloud line (ZL-ALL)
//   celebration is the original's CELEBRA2 since ZL-ALL: Celebration Island after the great figure rose from it
// DECLUTTER (the user, 3.11.2026: "whatever stays must give something to the journey"): the CX islet and Tralu Rock are
// cut. SLOTS keeps every island's old index, so an island's place in the world (ISLE_AT) and a save on it stay as they
// were; a save made on a cut island lands on Zeelich (main.js migrateSave, REMOVED_ROOMS).
export const SLOTS = ['otringal', 'knartas', 'mosquibee', 'celebration', 'undergas', 'cxislet', 'platform', 'liftdock', 'tralu', 'orchard', 'oldwatch'];
export const CUT_ISLES = new Set(['cxislet', 'tralu']);
export const ISLES = SLOTS.filter((n) => !CUT_ISLES.has(n));
export const OURS = new Set(PLACES);
// the names on the shuttles' departures boards (the menus use the text table: text/islands.js)
export const BOARD_NAME = { zeelich: 'ZEELICH SPACEPORT', otringal: 'OTRINGAL', knartas: 'KNARTAS', mosquibee: 'MOSQUIBEE', celebration: 'CELEBRATION', undergas: 'UNDER CELEBRATION', platform: 'THE PLATFORM', liftdock: 'THE LIFT DOCK', orchard: 'NECTAR ORCHARD', oldwatch: 'THE OLD WATCH' };
// far from every other region and from each other (the biggest patch is ≈ 210 m across)
export const ISLE_AT = (i) => ({ x: 1900 + i * 330, z: 1800 });
const SEA = -9;            // the ground under the clouds, past every island's edge
const SHORE = -0.5;        // the sea next to land: just under the waterline (physics WATER_FLOOR -0.35)
const CLOUD_Y = -1.4;      // the sea of clouds, just under the original's level 0
// SKY-9: an island may lay its cloud sea lower (S.cloudDrop, m): the Wannies' platform walks 0–6 m up and its channels
// between the terraces are sea, so the gas at CLOUD_Y filled them 3–5 m under the paths like a pale floor. Its solid
// layer (2.5 m under) stays over SEA. R.cloudY, the plinths, barges, skiffs and footings follow it.
const cloudYOf = (S) => CLOUD_Y - Math.min(4.5, S?.cloudDrop || 0);
const MARGIN = 14;         // cells of sea round the island's grid

const LAYOUTS = {};
export async function preloadIslands(names = ISLES) {
  await Promise.all(names.map(async (n) => {
    if (OURS.has(n)) { LAYOUTS[n] = placeLayout(n); return; }
    try { const r = await fetch(`assets/lba2/islands/${n}.json`); if (r.ok) LAYOUTS[n] = await r.json(); } catch { /* the island is left out */ }
  }));
}
export const hasIsland = (n) => !!LAYOUTS[n];

// (for tools and tests: an island's analysis and plan, numbers only)
export function planOf(name) {
  const S = STYLE[name] || {}; let L = LAYOUTS[name]; if (!L) return null;
  if (S.layout) L = S.layout(L);
  if (S.decks) L = deckLayout(L, S);
  const A = analyse(L, S), P = planIsland(name, L, A, true);
  return { L, A: { w: A.w, d: A.d, main: A.main, comp: Array.from(A.comp), H: A.H, mid: A.mid }, P };
}
export function buildIslands(scene, physics) {
  const out = {};
  ISLES.forEach((n) => { if (LAYOUTS[n]) out['isle_' + n] = buildIsle(scene, physics, n); });
  return out;
}
// LAZY-REGIONS: one island, the first time it is needed (src/game/regions.js). The sign boards' atlas holds every
// island's words, so it is the same whichever island is built first.
export function buildIsle(scene, physics, n) {
  EP.setSignWords(ESMER_WORDS);
  return buildIsland(scene, physics, n, LAYOUTS[n], ISLE_AT(SLOTS.indexOf(n)));
}

// ================================================================== layout analysis (on the data grid)
// heights in metres (sea = null); the objects with a footprint the hero can't walk through; the landing pad:
// the clearest flat spot of the biggest walkable area, nearest its middle
function analyse(L, S = {}) {
  const { nx, nz, cell } = L, w = (nx - 1) * cell, d = (nz - 1) * cell;
  const H = new Array(nx * nz);
  for (let k = 0; k < nx * nz; k++) H[k] = L.heights[k] > 0 ? L.heights[k] / 100 : null;
  const gx = (x) => (x + w / 2) / cell, gz = (z) => (z + d / 2) / cell;
  const cx = (i) => -w / 2 + i * cell, cz = (j) => -d / 2 + j * cell;
  const decor = L.decor.map(([x, z, y, sx, sy, sz, beta, kind, body]) => ({ x, z, y, sx, sy, sz, beta, kind, body }));
  for (const o of decor) o.shape = shapeOf(o, S);
  fitBuildings(decor, H, { nx, nz, cell, w, d, gx, gz, cx, cz, S, decks: !!L.floorAt });
  cutPlants(decor);
  // cells under a solid object
  const blocked = new Uint8Array(nx * nz);
  for (const o of decor) {
    if (!o.solid) continue;
    const i0 = Math.max(0, Math.floor(gx(o.x - o.sx / 2 - 0.3))), i1 = Math.min(nx - 1, Math.ceil(gx(o.x + o.sx / 2 + 0.3)));
    const j0 = Math.max(0, Math.floor(gz(o.z - o.sz / 2 - 0.3))), j1 = Math.min(nz - 1, Math.ceil(gz(o.z + o.sz / 2 + 0.3)));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (Math.abs(cx(i) - o.x) <= o.sx / 2 + 0.3 && Math.abs(cz(j) - o.z) <= o.sz / 2 + 0.3) blocked[j * nx + i] = 1;
    }
  }
  // steep ground: a point where the slope (the steepest way, either side) is past what he can stand on without
  // sliding (physics.steepAt: MAX_SLOPE × 1.35); a margin under it
  const steep = new Uint8Array(nx * nz);
  const at = (i, j) => (i < 0 || j < 0 || i >= nx || j >= nz ? null : H[j * nx + i]);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const v = at(i, j); if (v == null) continue;
    const df = (a, b) => (a == null ? 0 : Math.abs(a - v) / cell);
    const sx = Math.max(df(at(i + 1, j)), df(at(i - 1, j))), sz = Math.max(df(at(i, j + 1)), df(at(i, j - 1)));
    if (Math.hypot(sx, sz) > MAX_SLOPE * 1.2) steep[j * nx + i] = 1;
  }
  // walkable areas: land points that aren't steep, joined where the step between them is one he can walk up
  const comp = new Int32Array(nx * nz).fill(-1), sizes = [];
  const rise = MAX_SLOPE * cell;
  for (let s = 0; s < nx * nz; s++) {
    if (H[s] == null || steep[s] || comp[s] >= 0) continue;
    const id = sizes.length; let n = 0; const q = [s]; comp[s] = id;
    while (q.length) {
      const k = q.pop(); n++;
      const i = k % nx, j = (k - i) / nx;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
        const m = b * nx + a;
        if (H[m] == null || steep[m] || comp[m] >= 0 || Math.abs(H[m] - H[k]) > rise) continue;
        comp[m] = id; q.push(m);
      }
    }
    sizes.push(n);
  }
  // the main area: the biggest, counting the places (objects) on it — a bare plateau loses to the town below it
  const objs = sizes.map(() => 0);
  // (an object counts for each area within 3 points of it: many stand on slopes, between the flats)
  for (const o of decor) {
    const i = Math.round(gx(o.x)), j = Math.round(gz(o.z)), near = new Set();
    for (let b = j - 3; b <= j + 3; b++) for (let a = i - 3; a <= i + 3; a++) if (a >= 0 && b >= 0 && a < nx && b < nz && comp[b * nx + a] >= 0) near.add(comp[b * nx + a]);
    for (const c of near) objs[c]++;
  }
  const score = sizes.map((n, k) => n + objs[k] * 6);
  let main = score.indexOf(Math.max(...score));
  // (an island's style may name the area it lands on: Mosquibee's broad upper meadow, not the small hilltop)
  if (S.mainNear) {
    let bd = 1e9;
    for (let k = 0; k < nx * nz; k++) {
      const c = comp[k]; if (c < 0 || sizes[c] < 60) continue;
      const dd = Math.hypot(cx(k % nx) - S.mainNear.x, cz(Math.floor(k / nx)) - S.mainNear.z);
      if (dd < bd) { bd = dd; main = c; }
    }
  }
  // clearance: steps (cells) to the nearest cell outside the main area or under an object
  const clear = new Float32Array(nx * nz).fill(1e9);
  const q = [];
  for (let k = 0; k < nx * nz; k++) if (comp[k] !== main || blocked[k]) { clear[k] = 0; q.push(k); }
  for (let h = 0; h < q.length; h++) {
    const k = q[h], i = k % nx, j = (k - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
      const m = b * nx + a, c = clear[k] + (di && dj ? 1.414 : 1);
      if (c < clear[m]) { clear[m] = c; q.push(m); }
    }
  }
  let mx = 0, mz = 0, mn = 0;
  for (let k = 0; k < nx * nz; k++) if (comp[k] === main) { mx += cx(k % nx); mz += cz(Math.floor(k / nx)); mn++; }
  mx /= mn; mz /= mn;
  const flat = (k, r) => {   // the largest height difference within r cells
    const i = k % nx, j = (k - i) / nx; let lo = 1e9, hi = -1e9;
    for (let b = j - r; b <= j + r; b++) for (let a = i - r; a <= i + r; a++) { const v = H[b * nx + a]; if (v == null) return 1e9; lo = Math.min(lo, v); hi = Math.max(hi, v); }
    return hi - lo;
  };
  let pad = -1, best = 1e9;
  for (const need of [4.5, 3.6, 2.8, 2.0]) {
    for (let k = 0; k < nx * nz; k++) {
      if (comp[k] !== main || clear[k] < need) continue;
      const fl = flat(k, 2); if (fl > 1.2) continue;
      const score = Math.hypot(cx(k % nx) - mx, cz(Math.floor(k / nx)) - mz) + fl * 12;
      if (score < best) { best = score; pad = k; }
    }
    if (pad >= 0) break;
  }
  if (pad < 0) { let c = -1; for (let k = 0; k < nx * nz; k++) if (comp[k] === main && clear[k] > c) { c = clear[k]; pad = k; } }
  const pi = pad % nx, pj = (pad - pi) / nx;
  let ph = 0, pn = 0; for (let b = pj - 1; b <= pj + 1; b++) for (let a = pi - 1; a <= pi + 1; a++) { const v = H[b * nx + a]; if (v != null) { ph += v; pn++; } }
  return { w, d, H, steep, decor, comp, main, clear, cx, cz, gx, gz, pad: { x: cx(pi), z: cz(pj), y: ph / pn, toward: Math.atan2(mx - cx(pi), mz - cz(pj)) }, mid: { x: mx, z: mz }, floorAt: L.floorAt || null, floors: L.floors || null };
}

// WORLD-FIX (tests/worldfit.mjs): the original's buildings on our ground. The ground here is the original's height
// grid at every second point (1.71 m apart), so under a building it rose through one wall and fell away from
// another: doors under the ground or hanging a metre over it, windows at the ground, plinths floating over slopes.
// And the original sometimes places one building twice, or a building's parts as overlapping objects, which drawn as
// our pieces put walls, doors and windows through each other. Here, before the ground is analysed:
//  - two houses (or towers) whose footprints overlap become one: one mostly inside the other is left out (the other
//    as tall as the taller); two that overlap partly are cut back to meet;
//  - each house's door goes on the side whose ground lies nearest its floor (the island's middle wins a near tie);
//  - the ground under each house and 2.6 m round it (all the grid points whose cells reach its walls) is cut down to
//    its floor, the ground before its door levelled to it; where the ground still falls away, the stone plinth
//    goes down to it (o.bury, its depth under the floor).
const FIT_M = 2.6;
// TREES-1 (the user, 4.11.2026: no tree may stand in a house): the original's trees, bushes and plants whose crown
// reaches into one of its houses or towers as we build them (a tall tree stood in a house on Otringal, a bush across
// two houses there, leaves through walls on Knartas and the Platform, a bush up into the Platform's deck, a nectar
// tree in the Orchard's press house) are cut: o.cut. Each keeps its place in the build's lists, so the colours'
// random draws (and all after them) stay as they were, but draws nothing and blocks nothing. The crown: the ellipse over the object's box (buildIsland's fit() scales
// the sculpt to the box), more than 0.15 m into the house's footprint (a tower's circle), or into a deck's or slab's
// above it when it grows up to its underside.
function cutPlants(decor) {
  const under = (o, b) => { const t = Math.max(0.12, b.sy), bottom = b.y + b.sy - t; return o.y < bottom && o.y + o.sy > bottom - 0.05; };
  const blocks = decor.filter((o) => o.shape === 'house' || o.shape === 'tower' || o.shape === 'deck' || o.shape === 'slab');
  for (const o of decor) {
    if (o.shape !== 'tree' && o.shape !== 'bush' && o.shape !== 'plant' && o.shape !== 'blossom' && o.shape !== 'frond' && o.shape !== 'goldplant') continue;   // (ZEELICH-2: Otringal's plants too)
    // (a nectar tree's crown is wider than its box: props-esmer.js blossomTree, 0.94 m at 1.6 m tall)
    const bl = o.shape === 'blossom' ? (0.94 * o.sy) / 1.6 : 0;
    const rx = bl || Math.max(0.3, o.sx) / 2, rz = bl || Math.max(0.3, o.sz) / 2, R = Math.max(rx, rz), ry = (o.beta / 4096) * Math.PI * 2, c = Math.cos(ry), sn = Math.sin(ry);
    o.cut = blocks.some((b) => {
      if (Math.abs(o.x - b.x) > R + b.sx / 2 || Math.abs(o.z - b.z) > R + b.sz / 2) return false;
      if ((b.shape === 'deck' || b.shape === 'slab') && !under(o, b)) return false;
      for (let k = 0; k < 24; k++) {
        // (the sculpt is scaled along its own axes, then turned by the object's beta: as fit() places it)
        const a = (k / 24) * Math.PI * 2, lx = Math.cos(a) * rx, lz = Math.sin(a) * rz, x = o.x + c * lx + sn * lz, z = o.z - sn * lx + c * lz;
        const inside = b.shape === 'tower' ? Math.min(b.sx, b.sz) * 0.48 - Math.hypot(x - b.x, z - b.z) : Math.min(b.sx / 2 - Math.abs(x - b.x), b.sz / 2 - Math.abs(z - b.z));
        if (inside > 0.15) return true;
      }
      return Math.abs(o.x - b.x) < b.sx / 2 && Math.abs(o.z - b.z) < b.sz / 2;   // (the trunk's foot itself inside)
    });
  }
}
function fitBuildings(decor, H, { nx, nz, cell, w, d, gx, gz, cx, cz, S, decks }) {
  const isH = (o) => o.shape === 'house' || o.shape === 'tower';
  const hs = decor.filter(isH);
  for (let pass = 0; pass < 3; pass++) for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) {
    const A = hs[i], B = hs[j];
    if (!isH(A) || !isH(B)) continue;
    const ox = Math.min(A.x + A.sx / 2, B.x + B.sx / 2) - Math.max(A.x - A.sx / 2, B.x - B.sx / 2), oz = Math.min(A.z + A.sz / 2, B.z + B.sz / 2) - Math.max(A.z - A.sz / 2, B.z - B.sz / 2);
    if (ox <= 0.02 || oz <= 0.02) continue;
    const sm = A.sx * A.sz <= B.sx * B.sz ? A : B, bg = sm === A ? B : A;
    if (ox * oz >= 0.6 * sm.sx * sm.sz) { bg.sy = Math.max(bg.sy, sm.y + sm.sy - bg.y); sm.shape = 'skip'; sm.solid = false; continue; }   // (a storey stacked on top: the one building as tall as both)
    if (ox <= oz) {
      const sg = Math.sign(sm.x - bg.x) || 1, edge = bg.x + sg * (bg.sx / 2 + 0.05), far = sm.x + sg * sm.sx / 2;
      sm.sx = Math.abs(far - edge); sm.x = (far + edge) / 2;
    } else {
      const sg = Math.sign(sm.z - bg.z) || 1, edge = bg.z + sg * (bg.sz / 2 + 0.05), far = sm.z + sg * sm.sz / 2;
      sm.sz = Math.abs(far - edge); sm.z = (far + edge) / 2;
    }
    if (Math.min(sm.sx, sm.sz) < 1.3) { sm.shape = 'skip'; sm.solid = false; }
  }
  if (decks) return;
  const at = (x, z) => { const i = Math.round(gx(x)), j = Math.round(gz(z)); return i < 0 || j < 0 || i >= nx || j >= nz ? null : H[j * nx + i]; };
  let mx = 0, mz = 0, mn = 0; for (let k = 0; k < nx * nz; k++) if (H[k] != null) { mx += cx(k % nx); mz += cz(Math.floor(k / nx)); mn++; }
  mx /= mn || 1; mz /= mn || 1;
  const near = new Float32Array(nx * nz).fill(1e9), target = new Float32Array(nx * nz).fill(NaN);
  for (const o of decor) {
    if (o.shape !== 'house' && o.shape !== 'tower') continue;
    let land = 0; for (const a of [-0.4, 0, 0.4]) for (const b of [-0.4, 0, 0.4]) if (at(o.x + a * o.sx, o.z + b * o.sz) != null) land++;
    if (land < 4) continue;   // (in the clouds: a moored barge, not a house on the ground)
    o.fitted = true;
    // the door's side: one with land before it (not the cloud sea, not another building) whose ground lies nearest
    // the floor; none: no door (the original's objects have none of their own: the door is ours)
    const mid = Math.abs(mx - o.x) > Math.abs(mz - o.z) ? [Math.sign(mx - o.x) || 1, 0] : [0, Math.sign(mz - o.z) || 1];
    const apron = (f) => f[0] ? { x0: Math.min(o.x + f[0] * o.sx / 2, o.x + f[0] * (o.sx / 2 + FIT_M)), x1: Math.max(o.x + f[0] * o.sx / 2, o.x + f[0] * (o.sx / 2 + FIT_M)), z0: o.z - 1.9, z1: o.z + 1.9 }
      : { x0: o.x - 1.9, x1: o.x + 1.9, z0: Math.min(o.z + f[1] * o.sz / 2, o.z + f[1] * (o.sz / 2 + FIT_M)), z1: Math.max(o.z + f[1] * o.sz / 2, o.z + f[1] * (o.sz / 2 + FIT_M)) };
    const blocked = (r) => hs.some((q) => q !== o && isH(q) && q.x + q.sx / 2 > r.x0 && q.x - q.sx / 2 < r.x1 && q.z + q.sz / 2 > r.z0 && q.z - q.sz / 2 < r.z1);
    let best = 1e9; o.face = null;
    for (const f of [mid, [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const g1 = at(o.x + f[0] * (o.sx / 2 + 1.4), o.z + f[1] * (o.sz / 2 + 1.4)), g2 = at(o.x + f[0] * (o.sx / 2 + FIT_M + 0.9), o.z + f[1] * (o.sz / 2 + FIT_M + 0.9));
      const r = apron(f), side = [at(r.x0, r.z0), at(r.x1, r.z0), at(r.x0, r.z1), at(r.x1, r.z1)];
      if (g1 == null || g2 == null || side.some((v) => v == null) || blocked(r)) continue;
      const sc = Math.abs(g1 - o.y) + 0.5 * Math.max(0, Math.abs(g2 - o.y) - 1) + (f === mid ? 0 : 0.35);
      if (sc < best - 1e-6) { best = sc; o.face = f; }
    }
    // (DOORS-1: a house packed in on every side still has its door: onto the alley or lane beside it, where the
    // ground goes on a metre out and no other house stands in a narrow strip before the door)
    if (!o.face) for (const f of [mid, [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const g1 = at(o.x + f[0] * (o.sx / 2 + 0.9), o.z + f[1] * (o.sz / 2 + 0.9));
      const r = f[0] ? { x0: Math.min(o.x + f[0] * o.sx / 2, o.x + f[0] * (o.sx / 2 + 1.0)), x1: Math.max(o.x + f[0] * o.sx / 2, o.x + f[0] * (o.sx / 2 + 1.0)), z0: o.z - 0.7, z1: o.z + 0.7 }
        : { x0: o.x - 0.7, x1: o.x + 0.7, z0: Math.min(o.z + f[1] * o.sz / 2, o.z + f[1] * (o.sz / 2 + 1.0)), z1: Math.max(o.z + f[1] * o.sz / 2, o.z + f[1] * (o.sz / 2 + 1.0)) };
      if (g1 == null || Math.abs(g1 - o.y) > 0.3 || [at(r.x0, r.z0), at(r.x1, r.z0), at(r.x0, r.z1), at(r.x1, r.z1)].some((v) => v == null) || blocked(r)) continue;
      const sc = Math.abs(g1 - o.y) + (f === mid ? 0 : 0.35);
      if (sc < best - 1e-6) { best = sc; o.face = f; }
    }
    if (S.grand && Math.hypot(o.x - S.grand.x, o.z - S.grand.z) < 1) o.face = mid;   // (the Grand Hall's portico stands toward the plaza)
    o.noDoor = !o.face; o.face ??= mid;
    const i0 = Math.max(0, Math.floor(gx(o.x - o.sx / 2 - FIT_M))), i1 = Math.min(nx - 1, Math.ceil(gx(o.x + o.sx / 2 + FIT_M)));
    const j0 = Math.max(0, Math.floor(gz(o.z - o.sz / 2 - FIT_M))), j1 = Math.min(nz - 1, Math.ceil(gz(o.z + o.sz / 2 + FIT_M)));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * nx + i; if (H[k] == null) continue;
      const ex = Math.abs(cx(i) - o.x) - o.sx / 2, ez = Math.abs(cz(j) - o.z) - o.sz / 2, dd = Math.max(ex, ez, 0);
      if (dd > FIT_M || dd >= near[k]) continue;
      // before the door: out from its side, across the door and a little either side
      const fr = o.face[0] ? (cx(i) - o.x) * o.face[0] - o.sx / 2 : (cz(j) - o.z) * o.face[1] - o.sz / 2, lat = o.face[0] ? Math.abs(cz(j) - o.z) : Math.abs(cx(i) - o.x);
      const apron = !o.noDoor && fr > -0.1 && lat < 1.9;
      near[k] = dd; target[k] = (dd <= 0 || apron || H[k] > o.y + 0.02) ? o.y + 0.02 : NaN;
    }
  }
  for (let k = 0; k < nx * nz; k++) if (!Number.isNaN(target[k])) H[k] = target[k];
  // the plinth down to the lowest ground round the walls (the ground's cells there reach a cell further out); a wall
  // whose ground stays well over the floor (a house set into a terrace, its back to the rise above) is banked: blind
  for (const o of decor) {
    if (!o.fitted || o.shape === 'skip') continue;
    let lo = o.y;
    const R = FIT_M + cell;
    const i0 = Math.max(0, Math.floor(gx(o.x - o.sx / 2 - R))), i1 = Math.min(nx - 1, Math.ceil(gx(o.x + o.sx / 2 + R)));
    const j0 = Math.max(0, Math.floor(gz(o.z - o.sz / 2 - R))), j1 = Math.min(nz - 1, Math.ceil(gz(o.z + o.sz / 2 + R)));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const ex = Math.abs(cx(i) - o.x) - o.sx / 2, ez = Math.abs(cz(j) - o.z) - o.sz / 2;
      if (Math.max(ex, ez) > R) continue;
      const v = H[j * nx + i]; lo = Math.min(lo, v == null ? cloudYOf(S) - 0.6 : v);   // (over the cloud sea: down under the clouds)
    }
    o.bury = Math.min(10, Math.max(0.6, o.y - lo + 0.3));
    // (every grid point whose cells reach a wall's foot: within a cell and a bit outside it, along its length)
    const hi = { '1,0': -1e9, '-1,0': -1e9, '0,1': -1e9, '0,-1': -1e9 }, reach = cell + 0.3;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const v = H[j * nx + i]; if (v == null) continue;
      const dx = cx(i) - o.x, dz = cz(j) - o.z, ex = Math.abs(dx) - o.sx / 2, ez = Math.abs(dz) - o.sz / 2;
      if (ex > 0 && ex <= reach && ez <= 0.6) { const k = Math.sign(dx) + ',0'; hi[k] = Math.max(hi[k], v); }
      if (ez > 0 && ez <= reach && ex <= 0.6) { const k = '0,' + Math.sign(dz); hi[k] = Math.max(hi[k], v); }
    }
    o.banked = Object.entries(hi).filter(([, v]) => v > o.y + 0.4).map(([k]) => k.split(',').map(Number));
  }
}

// OTRINGAL-37 (the cloud's original-mechanics sweep, 8.11: "grey rock spikes stand up through the paving between the
// houses" of the high town; docs/lba-maturity/mechanics-entry.md): no scattered rock: they are the original's ground
// itself, a grid point or two of its heights 1-3 m over the street, which the granite (S.turfRock) draws as grey
// peaks between the houses, one at the foot of the way in to a door (looked at on the laptop's GPU, Follow/Medium).
// S.paveFlat { R, span }: the ground drawn and walked on (not the analysis the plan reads: the dressing keeps its
// places) is cut down to the street, the floor of the nearest house within R m of its walls:
//   - a bump in the street, at most max m high: the ground comes back to the street's level (0.3 m over it to 0.6 m
//     under it) on both sides, along x or along z, within span m: not a terrace rising behind a house, nor the rock
//     mass at the rim (it does not come back down to the street within span on either line), nor ground falling away;
//   - the way in to every door, 2.2 m out from its wall and 0.7 m either side (as the dressing keeps it, DOOR-SWEEP),
//     with a grid cell more round it, so no triangle of a peak beside it slopes into it.
// Only lowered, never raised.
function paveFlat(A, L, P) {
  const { nx, nz, cell } = L, { cx, cz, gx, gz } = A, H0 = A.H, H = H0.slice();
  const hs = A.decor.filter((o) => o.fitted && (o.shape === 'house' || o.shape === 'tower'));
  const at = (i, j) => (i < 0 || j < 0 || i >= nx || j >= nz ? null : H0[j * nx + i]);
  const steps = Math.ceil(P.span / cell);
  const back = (i, j, di, dj, ref) => {
    for (let s = 1; s <= steps; s++) { const v = at(i + di * s, j + dj * s); if (v == null || v < ref - 0.6) return false; if (v <= ref + 0.3) return true; }
    return false;
  };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i, v = H0[k]; if (v == null) continue;
    let ref = null, best = P.R;
    for (const o of hs) { const dd = Math.max(Math.abs(cx(i) - o.x) - o.sx / 2, Math.abs(cz(j) - o.z) - o.sz / 2, 0); if (dd <= best) { best = dd; ref = o.y + 0.02; } }
    if (ref == null || v <= ref + 0.25 || v > ref + P.max) continue;
    if ((back(i, j, 1, 0, ref) && back(i, j, -1, 0, ref)) || (back(i, j, 0, 1, ref) && back(i, j, 0, -1, ref))) H[k] = ref;
  }
  for (const o of hs) {
    if (o.noDoor || !o.face) continue;
    const t = o.face, fx = o.x + t[0] * o.sx / 2, fz = o.z + t[1] * o.sz / 2, out = 2.2 + cell, lat = 0.7 + cell;
    const x0 = t[0] ? Math.min(fx, fx + t[0] * out) : o.x - lat, x1 = t[0] ? Math.max(fx, fx + t[0] * out) : o.x + lat;
    const z0 = t[1] ? Math.min(fz, fz + t[1] * out) : o.z - lat, z1 = t[1] ? Math.max(fz, fz + t[1] * out) : o.z + lat;
    for (let j = Math.max(0, Math.ceil(gz(z0))); j <= Math.min(nz - 1, Math.floor(gz(z1))); j++) {
      for (let i = Math.max(0, Math.ceil(gx(x0))); i <= Math.min(nx - 1, Math.floor(gx(x1))); i++) { const k = j * nx + i; if (H[k] != null && H[k] > o.y + 0.02) H[k] = o.y + 0.02; }
    }
  }
  return H;
}

// A place built on decks (the Lift Dock, the original's ASCENCE: its ground is a slab at the cloud line under
// decks on stilts at 4–7 m): the decks' tops are its ground. The style names the original's floor objects
// (S.floors: bodies) and may add decks of its own (S.extraDecor, bodies ≥ 990: ours). Returns the layout with
// heights = the highest deck over each point (else sea), floors [{x0,x1,z0,z1,top}] and floorAt(x, z, inset).
function deckLayout(L, S) {
  const decor = [...L.decor, ...(S.extraDecor || [])];
  const floors = decor.filter((d) => S.floors.includes(d[8]) || d[8] >= 990).map(([x, z, y, sx, sy, sz]) => ({ x0: x - sx / 2, x1: x + sx / 2, z0: z - sz / 2, z1: z + sz / 2, top: +(y + sy).toFixed(2) }));
  for (const s of S.stairs || []) floors.push({ x0: Math.min(s.ax, s.bx) - (s.ax === s.bx ? s.w / 2 : 0), x1: Math.max(s.ax, s.bx) + (s.ax === s.bx ? s.w / 2 : 0), z0: Math.min(s.az, s.bz) - (s.az === s.bz ? s.w / 2 : 0), z1: Math.max(s.az, s.bz) + (s.az === s.bz ? s.w / 2 : 0), top: null, stair: s });
  const stairY = (s, x, z) => { const L2 = Math.hypot(s.bx - s.ax, s.bz - s.az), t = Math.max(0, Math.min(1, ((x - s.ax) * (s.bx - s.ax) + (z - s.az) * (s.bz - s.az)) / (L2 * L2))); return s.y0 + (s.y1 - s.y0) * Math.min(1, Math.ceil(t * s.n) / s.n); };
  const floorAt = (x, z, inset = 0) => {
    let top = null;
    for (const f of floors) {
      if (x < f.x0 + inset || x > f.x1 - inset || z < f.z0 + inset || z > f.z1 - inset) continue;
      const y = f.stair ? stairY(f.stair, x, z) : f.top; if (top == null || y > top) top = y;
    }
    return top;
  };
  const { nx, nz, cell } = L, w = (nx - 1) * cell, d = (nz - 1) * cell, heights = new Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const t = floorAt(-w / 2 + i * cell, -d / 2 + j * cell); heights[j * nx + i] = t == null ? -600 : Math.round(t * 100); }
  return { ...L, decor, heights, floors, floorAt };
}

// what our piece for an original object is, by its size (the original's look isn't used)
function shapeOf(o, S = {}) {
  const big = Math.max(o.sx, o.sz), small = Math.min(o.sx, o.sz), h = rng((o.body + 1) * 7919)();
  let s = S.shape?.(o) || null;
  if (s) {
    o.solid = !['skip', 'deck', 'pier', 'plant', 'slab'].includes(s) && (big >= 0.5 || s === 'tree' || s === 'staff');
    return s;
  }
  if (o.kind === 'building') {
    if (o.sy < 1.0) s = 'deck';
    else if (small < 1.3) s = 'wall';
    else if (o.sy > 2.2 * big) s = 'tower';
    else s = 'house';
  } else if (o.kind === 'tall') s = big < 0.5 ? 'pole' : o.sy > 5.5 ? 'spire' : h < 0.5 ? 'tree' : 'lamp';
  else if (o.kind === 'small') s = 'plant';
  else if (small < 0.45 && big > 0.9) s = 'fence';
  else if (big < 0.45 && o.sy > 0.9) s = 'post';   // (a thin upright: a brass bollard, not a jar)
  else s = o.sy < 0.45 ? 'slab' : o.sy < 0.75 * big ? (h < 0.4 ? 'crate' : 'rock') : h < 0.5 ? 'bush' : 'jar';
  o.solid = s !== 'plant' && s !== 'slab' && !(s === 'deck') && (big >= 0.5 || s === 'tree' || s === 'spire' || s === 'lamp' || s === 'pole' || s === 'post');
  return s;
}

// ================================================================== each island's identity and dressing (numbers only)
// Every island keeps the original's ground and objects; on top, our own dressing gives it its character (what the
// original's island was, in our style) and street life: a landmark and its approach, Esmer street furniture
// (lamps, bins, planters with Zeelich plants, sign posts whose arrow boards name places, benches), and the clutter of
// the island's trade. The plan below is pure numbers — where the shuttle lands, where he stands, and where each
// piece goes — checked on a fine grid against the island's own walkable area: a piece stands only on flat ground
// clear of the original's objects, away from slopes (no slide traps), off the routes and door fronts, and never
// where it would cut a part of the walkable area off from the landing.
//   STYLE[name]: ground / walls / domes palettes, env, paving, the target (the landmark's approach, which the
//   arrival faces), landmark(api) and dress(api) placing pieces through the planner's api.
const ESMER_WORDS = ['SHUTTLE', 'GRAND HALL', 'MARKET', 'FOUNTAIN', 'HARBOUR', 'VILLAGE', 'LIGHTHOUSE', 'HIVES',
  'MEADOW', 'HONEY', 'FESTIVAL', 'STAGE', 'GAS WORKS', 'PUMP HOUSE', 'OUTPOST', 'RADIO MAST', 'DEPOT', 'CRANE',
  'LOADING DECK', 'KEEP CLEAR', 'NO NAKED FLAMES', 'MIND THE EDGE', 'CRANE AREA', 'LOOKOUT', 'BRIDGE', 'HIGH TOWN',
  'LIFT', 'CARGO DOCK', 'TRADING POST', 'QUAY', 'WEIGH BEAM', 'ORCHARD', 'PRESS HOUSE', 'CLOUD CATCHER', 'OLD WATCH', 'TELESCOPE', 'THE FIGURE',
  'MINE', 'BUILDING COMPANY', 'CHAPEL', 'ORE'];   // (ZEELICH-1 item 5: the Wannies' island)
// OTR-VARIETY (the cloud's night order 3, "Cacophony"; docs/future/CLUTTER_AUDIT.md): Otringal's original house
// positions were all drawn as the same domed Esmer shell, a field of copies. On the original's numbers (its big masses
// where they were, ~80 %): neighbours built wall to wall become one building (some kept off the walls they met face to
// face), a filler is left out, and the yard's twenty wall lengths (the original's body 146, 1.34 m thick: drawn as
// houses only because they were not thinner) are the cargo yard's wall again. Each building has a kind that says what
// it is: warehouses by the quay and in the yard (dressed stone, a wide door and a hoist, a flat roof), stores with a
// sign, houses up the lanes (flat roofs with a parapet, balconies, awnings), and domes only on the civic buildings
// round the plaza and a few landmarks of the high town.
// The harbour bar's and the Imperial Hotel's houses (otrbar.js, otrhotel.js find their doors by these names) are
// not touched. Otringal only: its STYLE's layout, shape and house below.
// (no new materials: a kind takes one of the island's wall colours, or the stone a warehouse is built of; each new
// material would be one more island-wide mesh drawn from every view)
const OTR_CIVIC = 3, OTR_COOL = 4;   // (STYLE.otringal.walls: the pale cream, the lilac grey)
const OTR = {
  // the original's buildings (x, z) built as one, in the box round them or the box given ([x0, x1, z0, z1]: kept off
  // the neighbours' walls, which they met face to face, and opening a lane or a small square beside them)
  merge: [
    { of: [[48.62, -60.41], [53.01, -58.33], [53.22, -53.98]], box: [48.6, 55.33, -64.59, -55.8] },   // the high town's hall (three slivers; a square west of it, a lane north)
    { of: [[55.6, -45.33], [55.62, -50.47]], box: [52.13, 58.7, -51.6, -41.86] },   // a high town house
    { of: [[-3.1, -52.82], [1.92, -52.82]], box: [-6.21, 3.82, -55.8, -49.41] },     // the south terrace's long house
    { of: [[-5.56, 56.29], [1.74, 56.29]] },                                         // the lower town's trading post (two copies side by side)
    { of: [[-20.79, -10.21]], box: [-23.47, -18.4, -13.05, -7.37] },                 // the hotel's neighbour, off its wall
    { of: [[62.77, -45.1]], box: [59.07, 66.47, -48.3, -41.4] },                     // the high town's store, off the house behind it
  ],
  drop: [[38.97, -52.01]],   // a 2 m box on the high town's rim (the 1.4 m sliver beside the bar stays: it keeps the bar's door where it is)
  // each kept building's kind (at its place, merged ones at their first part's): sy its new height (m)
  kinds: [
    // the harbour and the yard: warehouses
    { at: [-54.99, -14.66], kind: 'warehouse' },
    { at: [39.75, 43.23], kind: 'warehouse' },
    // the plaza: the Grand Hall's twin over the lower town and the hall across from the hotel are civic; the hotel's
    // neighbour a flat two-storey house
    { at: [3.79, 30.88], kind: 'civic' }, { at: [3.77, 25.54], kind: 'civic' }, { at: [3.82, -10.88], kind: 'civic' },
    { at: [-20.79, -10.21], kind: 'house', flat: true, sy: 6.3, wall: OTR_COOL, balconyP: 1 },
    { at: [15.83, 6.17], kind: 'house', flat: true, sy: 5.0 },
    // the south terrace
    { at: [-3.1, -52.82], kind: 'house', flat: true, sy: 5.4, awningP: 1 },
    { at: [3.42, -59.34], kind: 'house', flat: true, awningP: 1, wall: OTR_COOL },
    { at: [16.7, -71.48], kind: 'house', flat: true, awningP: 1 },
    // the high town: its domed hall and two domed houses on the skyline, the rest flat, one store
    { at: [48.62, -60.41], kind: 'civic' },
    { at: [55.6, -45.33], kind: 'house', flat: true, sy: 6.2, balconyP: 1 },
    { at: [45.02, -52.27], kind: 'house', flat: true, sy: 6.2, balconyP: 1, wall: OTR_COOL },
    { at: [59.43, -59.52], kind: 'house', flat: true, sy: 4.3, awningP: 1 },
    { at: [62.77, -45.1], kind: 'store', sign: 'MARKET', sy: 5.4 },
    // the lower town: the trading post, two houses
    { at: [-5.56, 56.29], kind: 'store', sign: 'TRADING POST' },
    { at: [2.78, 64.63], kind: 'house', flat: true, sy: 4.4, awningP: 1, wall: OTR_COOL },
    { at: [11.88, 43.21], kind: 'house', flat: true, awningP: 1 },
  ],
};
let OTR_SPEC = [];   // (the last layout's kinds at the buildings' places: S.house reads them)
const near0 = (o, [x, z], r = 0.2) => Math.abs(o[0] - x) < r && Math.abs(o[1] - z) < r;
function otrLayout(L) {
  const decor = L.decor.filter((d) => !(d[7] === 'building' && OTR.drop.some((p) => near0(d, p)))).map((d) => (d[8] === 146 ? [...d] : d));   // (the yard's lengths copied: trimmed below)
  const spec = [];
  for (const m of OTR.merge) {
    const parts = m.of.map((p) => decor.find((d) => d[7] === 'building' && near0(d, p))).filter(Boolean);
    if (parts.length !== m.of.length) continue;
    const [x0, x1, z0, z1] = m.box || [Math.min(...parts.map((d) => d[0] - d[3] / 2)), Math.max(...parts.map((d) => d[0] + d[3] / 2)), Math.min(...parts.map((d) => d[1] - d[5] / 2)), Math.max(...parts.map((d) => d[1] + d[5] / 2))];
    const y = Math.min(...parts.map((d) => d[2])), top = Math.max(...parts.map((d) => d[2] + d[4])), a = parts[0];
    const one = [+((x0 + x1) / 2).toFixed(2), +((z0 + z1) / 2).toFixed(2), y, +(x1 - x0).toFixed(2), +(top - y).toFixed(2), +(z1 - z0).toFixed(2), a[6], a[7], a[8]];
    decor.splice(decor.indexOf(a), 1, one);
    for (const d of parts.slice(1)) decor.splice(decor.indexOf(d), 1);
    const k = OTR.kinds.find((q) => near0(a, q.at)); if (k) k.place = [one[0], one[1]];
  }
  // the yard's wall lengths stop at a building they ran into (two met the moored barges' hulls)
  const yard = decor.filter((d) => d[8] === 146), solid = decor.filter((d) => d[7] === 'building' && d[8] !== 146 && d[4] >= 1);
  for (const w of yard) {
    for (const b of solid) {
      const ox = Math.min(w[0] + w[3] / 2, b[0] + b[3] / 2) - Math.max(w[0] - w[3] / 2, b[0] - b[3] / 2), oz = Math.min(w[1] + w[5] / 2, b[1] + b[5] / 2) - Math.max(w[1] - w[5] / 2, b[1] - b[5] / 2);
      if (ox <= 0.02 || oz <= 0.02) continue;
      const i = w[3] >= w[5] ? 0 : 1, s = i ? 5 : 3, sg = Math.sign(w[i] - b[i]) || 1, edge = b[i] + sg * (b[s] / 2 + 0.3), far = w[i] + sg * w[s] / 2;
      w[s] = +Math.abs(far - edge).toFixed(2); w[i] = +((far + edge) / 2).toFixed(2);
      if (Math.sign(far - edge) !== sg) w[s] = 0;
    }
  }
  const out = decor.filter((d) => !(d[8] === 146 && (Math.min(d[3], d[5]) < 0.5 || Math.max(d[3], d[5]) < 1.2)));   // (a length cut away to nothing is gone)
  for (const k of OTR.kinds) {
    const p = k.place || k.at, d = out.find((q) => q[7] === 'building' && near0(q, p, 0.3)); if (!d) continue;
    if (k.sy) { const i = out.indexOf(d); out[i] = [...d]; out[i][4] = k.sy; }
    spec.push({ x: p[0], z: p[1], k });
  }
  OTR_SPEC = spec;
  return { ...L, decor: out };
}
// a building's look by its kind (merged over look(o) in buildIsland's house; M: its materials: walls, stone)
function otrHouse(o, M) {
  const s = OTR_SPEC.find((q) => Math.hypot(q.x - o.x, q.z - o.z) < 1.2)?.k; if (!s) return null;
  const wall = (i) => M.walls[i % M.walls.length];
  if (s.kind === 'warehouse') return { role: 'store', domed: false, wall: M.stone, trim: '#7a7884', awningP: 0, balconyP: 0 };
  if (s.kind === 'store') return { role: 'store', domed: false, sign: s.sign, balconyP: 0, ...(s.wall ? { wall: wall(s.wall) } : {}) };
  if (s.kind === 'civic') return { wall: wall(OTR_CIVIC), balconyP: 0, awningP: 0 };
  return { ...(s.flat ? { domed: false } : {}), ...(s.wall ? { wall: wall(s.wall) } : {}), balconyP: s.balconyP ?? 0.55, awningP: s.awningP ?? 0.6 };
}
// ZEELICH-2 (the cloud's order 6; the user, 4.11: "Zeelich doesn't look like LBA2's Zeelich"): Otringal as the original's
// Otringal looks from the play camera, measured on its ground and bodies (lba-study, numbers only; layout unchanged):
//   - ground: no grass at all (its textured ground a neutral grey granite, k-means #51504a–#a8a196 with #dbd3c9 lights;
//     its paving a pale lavender grey, #d3ced9 / #afa5ad), where ours had green turf and violet cliffs;
//   - buildings: taupe stucco walls (#9e9795–#baafac lit), glass-block bands (#68a9ce), low aqua (#78a1a7–#a1b9ba) or
//     gold (#ab7945) caps and roofs (props-esmer.js setLook), where ours were cream and lilac under violet, rose and
//     orange onions;
//   - railings: grey posts and teal rails (body 5, 90 of them), a hazard bar (body 50, 16), where ours were wooden fences;
//   - plants gold: street trees in square planters with a golden plume (bodies 52–54, 24) and a golden fan plant with
//     red fruit (body 18, 13), where ours were dark green trees and 3.8 m terracotta jars;
//   - the street lamps (body 1, 15) lamps, their heads (body 2, set on top of them) part of them, where ours drew both
//     as jars, the head floating 2.5 m up; mossy rocks (bodies 7, 8, 99, 100) rocks, not jars and 4 m crates; the house
//     parts the original keeps as objects (bodies 12, 13, 108) small doorless buildings and its round capped house
//     (body 48) an octagonal drum under a cap, inside the jar's old collider (a box there blocked a house's door), not 5–6 m jars.
// Twelve years on (80 %): the same kit as the rest of Zeelich, coloured and capped as LBA2's capital; the plaza, the
// Grand Hall, the bar's and the hotel's doors and every kind (OTR) as they were.
const OTR_LBA2 = {
  look: true, turfRock: true, fence: 'rail',
  ground: ['#f4f0e6', '#ece8de', '#e6e0d4'], rock: '#ece8de', rockHi: '#fffcf4', paveCol: '#f0eaf6',
  // (the same five places in the list: OTR_CIVIC the pale one, OTR_COOL the grey one)
  walls: ['#dccfc4', '#d4c8c0', '#e0d4cc', '#e6dcd2', '#ccc4c4'],
  domes: [['#78a8ae', '#b4d8d8'], ['#b0824a', '#e6c47e'], ['#6c9ea8', '#a8d0d4'], ['#82b0b4', '#c0e0de']],
};
//   - the plaza's covered market (bodies 86–95: two rows of stone canopies) canopies, its poster boards (body 29) boards,
//     its stacked planks (bodies 114, 115, 119) planks, a teal-banded bollard (141) a post, where ours drew all of them as
//     2–3 m jars; a flag hung 2 m up (body 24) left out, where ours drew a rock floating there.
const OTR_SHAPE = { 1: 'lamp', 2: 'skip', 18: 'goldplant', 52: 'frond', 53: 'frond', 54: 'frond', 7: 'rock', 8: 'rock', 99: 'rock', 100: 'rock', 12: 'annex', 13: 'annex', 48: 'drum', 108: 'annex',
  86: 'canopy', 87: 'canopy', 88: 'canopy', 89: 'canopy', 90: 'canopy', 93: 'canopy', 94: 'canopy', 95: 'canopy', 29: 'poster', 114: 'planks', 115: 'planks', 119: 'planks', 141: 'post', 24: 'skip' };
function otrShape(o) {
  const s = OTR_SHAPE[o.body] || null;
  if (s === 'lamp') o.lampPost = true;   // (the Esmer street lamp at any height: the original's post and head are 4.8 m)
  return s;
}
// (ZEELICH-2: the original's Otringal rock, pale and speckled: a neutral grey with white and dark flecks and a little
// moss grey, lit planes and cracks; used triplanar on the ground and cliffs where S.turfRock)
const graniteTex = () => ctex('isle-granite', 512, 512, (x, S) => {
  const r = rng(77);
  x.fillStyle = '#bcb8b0'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 160; i++) {
    const px = r() * S, py = r() * S, w = 18 + r() * 60, h = 10 + r() * 30, t = r();
    x.fillStyle = t < 0.4 ? 'rgba(232,230,224,0.5)' : t < 0.7 ? 'rgba(120,118,110,0.35)' : 'rgba(150,154,138,0.35)';
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { x.beginPath(); x.ellipse(px + ox, py + oy, w / 2, h / 2, r() * 3, 0, 7); x.fill(); }
  }
  x.strokeStyle = 'rgba(70,68,62,0.5)'; x.lineWidth = 1.6;
  for (let i = 0; i < 50; i++) {
    let px = r() * S, py = r() * S; const pts = [[px, py]];
    for (let k = 0; k < 5; k++) { px += 8 + r() * 20; py += (r() - 0.5) * 10; pts.push([px, py]); }
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { x.beginPath(); pts.forEach(([a, b], k) => (k ? x.lineTo(a + ox, b + oy) : x.moveTo(a + ox, b + oy))); x.stroke(); }
  }
  for (let i = 0; i < 2600; i++) { const t = r(); x.fillStyle = t < 0.45 ? '#f2f0ea' : t < 0.8 ? '#6a6860' : '#7c8270'; x.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2); }
});
const STYLE = {
  otringal: {   // the Esmers' capital: a paved plaza with a fountain, market stalls, banners, the Grand Hall
    // (ZEELICH-1 item 6: LBA2's Otringal is overcast, misty and pale grey: a grey sky and fog, a softer sun, less colour)
    env: { fog: '#d6d6de', sun: '#ecebf2', hemiSky: '#dedee8', hemiGround: '#787884', sunI: 1.9, hemiI: 1.35, fogRange: [70, 260] }, grade: 0.82, gradeTint: [0.98, 0.98, 1.02], cloudTint: ['#d4d2dc', '#dcdae2', '#e4e2ea'],
    trees: '#ffe4ec', ground: ['#f2e6b4', '#e6dcaa', '#e8d4c0'], pave: 'cobble', paveAt: (x, z) => x > -29 && x < 16 && z > -21 && z < 28,
    walls: ['#fbf0ea', '#f8e8d8', '#f6dce6', '#fff4e0', '#f1e2f6'], domes: [['#d89a30', '#ffe6a8'], ['#2f8a9a', '#a8e8ee'], ['#c84a7a', '#ffc8dc'], ['#8a5ac0', '#e8c8ff']],
    ...OTR_LBA2,   // (ZEELICH-2: LBA2's colours over these)
    grand: { x: 5.6, z: -23.9 }, portico: { x0: 1.5, x1: 9.7, z0: -20.5, z1: -16.8, zc: -18.5 }, target: { x: 5.6, z: -16.2, word: 'GRAND HALL' }, near: 16, far: 34,
    crates: 'wood', lines: ['#7a3a8a', '#f0c040', '#f4eee0', '#2f8a9a'],
    // (OTR-VARIETY: fewer buildings, each of a kind; the yard's wall lengths a wall: OTR above)
    // (ISLES-BAR: the south terrace and the high town had no way up from the plaza (a flood fill of where he walks: the
    //  plaza's 4565 m², 14 of the 23 doors out of reach). A flight of steps up the bank west of the Grand Hall, where
    //  the rock lip already slopes onto the terrace; and the ramp down from the high town, which ended against the
    //  original's thin wall (body 15) at the terrace's garden, goes through: that wall is not built)
    //  (the terrace's rail, the original's fence lengths (body 5) along its lip, opens over the flight's head)
    flights: [{ a: [-6.92, -21.4], b: [-6.92, -26.4], w: 3.2 }],
    open: (o) => (o.body === 15 && Math.hypot(o.x - 26.97, o.z + 59.93) < 0.1) || (o.body === 37 && Math.hypot(o.x - 50.16, o.z + 47.13) < 0.1) || (o.body === 5 && Math.abs(o.z + 27.78) < 0.1 && (Math.abs(o.x + 7.75) < 0.1 || Math.abs(o.x + 6.09) < 0.1)),
    // (ISLES-BAR: the high town's tall beige spires (bodies 37, 42, 3.3 m across) filled its lanes wall to wall: one
    //  stood on the big family's door (not built: S.open), two closed the clinic's lane. Drawn slimmer there, they leave a
    //  way past each side)
    spireK: (o) => ((o.body === 37 || o.body === 42) && o.y > 25 ? 0.22 : 0.45),
    paveFlat: { R: 5, span: 7, max: 3.5 },   // (OTRINGAL-37: the high town's paving without the ground's grey peaks: paveFlat)
    layout: otrLayout, house: otrHouse, shape: (o) => (o.body === 146 && o.kind === 'building' ? 'yardWall' : otrShape(o)), cellBatch: 48,
    landmark(api) {
      const f = api.near('fountain', -5, 6.6, 0, {}, 2.5);
      const pois = [{ ...api.S.target }];
      if (f) pois.push({ x: f.x, z: f.z + 3.4, word: 'FOUNTAIN', at: f });
      // banners either side of the Grand Hall's steps
      for (const s of [-1, 1]) api.near('banner', 5.6 + s * 4.9, -18.9, 0, { colors: ['#7a3a8a', '#f0c040', '#f4eee0'] }, 1.5);
      return pois;
    },
    dress(api) {
      const f = api.pois.find((p) => p.word === 'FOUNTAIN')?.at;
      if (f) {   // benches round the fountain, planters between them
        for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; api.near('bench', f.x + Math.sin(a) * 4.6, f.z + Math.cos(a) * 4.6, a + Math.PI, {}, 0.8); }
        for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; api.near('planter', f.x + Math.sin(a) * 4.4, f.z + Math.cos(a) * 4.4, 0, { kind: k % 3, big: true }, 0.8); }
      }
      // the market: stalls in the open plaza, facing the fountain, crates and jars behind them
      api.open('stall', 4, { lo: 3.0, space: 7, around: { x: -12, z: 8, r: 18 }, face: f || api.S.target, opts: (i) => ({ goods: ['fruit', 'cloth', 'jars', 'fruit'][i % 4], a: ['#e8608a', '#3fa8b8', '#f0c040', '#9a5ac8'][i % 4], b: '#f8eee4', seed: i + 1 }) });
      // (OTR-VARIETY: what the yard and the high town's square are for: cargo stacked by the yard's wall, a stall)
      // (the yard is a patch of its own over the moored barges, not the landing's walkable area: its stacks are set down)
      for (const [x, z, ry, i] of [[40.6, 37.2, 0, 0], [44.2, 37.0, 0.3, 1], [62.4, 37.6, -0.2, 2], [65.0, 62.2, 1.6, 3]]) api.add('crates', x, z, ry, { kind: 'wood', n: 2 + (i % 3), seed: i + 21 });
      api.add('barrels', 61.0, 63.0, 0.4, {});
      api.open('stall', 1, { lo: 2.6, space: 6, around: { x: 45, z: -60, r: 4 }, face: { x: 51.9, z: -60.2 }, opts: () => ({ goods: 'cloth', a: '#2f8a9a', b: '#f8eee4', seed: 9 }) });
      // (OTR-VARIETY: doors 1, every door's front kept clear: at 0.8 a door could lose it to a bench, as the hotel's did)
      api.street({ benches: 4, clutter: 10, kinds: ['jars', 'crates', 'planter', 'bin', 'barrels'], lamps: 11, doors: 1, banners: 9, lines: true, fillSpacing: 8 });
      api.signs([{ word: 'MARKET', x: -14, z: 8 }]);
    },
  },
  knartas: {   // houses and a harbour: the F-shaped quay in the clouds with boats, nets, bollards and a light
    trees: '#d8f0f8', ground: ['#e8f0b0', '#dce8a4', '#e8dcc0'], pave: 'concrete', paveAt: (x, z) => x < -7.5 && z < -6,
    walls: ['#f8f0e4', '#e6f0f4', '#f4e4d4', '#eef4e4'], domes: [['#2f8a9a', '#a8e8ee'], ['#3a6ac0', '#c8dcff'], ['#d89a30', '#ffe6a8']],
    target: { x: -13.5, z: -22.0, word: 'HARBOUR' }, near: 10, far: 34, padClear: 3.3, padSlope: 1.4, padR: 3.3, D: [9, 8, 7, 6.5], ahead: 3, padIn: (x, z) => x < -8, gate: { x0: -5.0, x1: 5.6, z0: -23.6, z1: -20.9 },
    // the jars at a potter's size; the basin between the quay's arms a harbour: a calm cloud-water surface (open to
    // the west), quay walls with a kerb along its three land sides, skiffs moored in it (below: dress)
    // (the original's tall posts along the quay, each with a head on top, are its harbour lamps)
    // (KNARTAS-GATE: the original's lintels (body 31) stood on posts we draw as lamps and trees: drawn, they were grey
    // rocks hanging 2 m up beside the houses; left out. The slab on the gatehouse's roof (38) a stone slab, not a rock)
    shape: (o) => (o.body === 13 && o.kind === 'tall' ? 'lamp' : (o.body === 14 && o.y > 5) || (o.body === 31 && o.y > 4.5) ? 'skip' : o.body === 38 && o.y > 5 ? 'slab' : o.body === 16 && Math.hypot(o.x + 24.31, o.z + 18.51) < 0.05 ? 'skip' : (o.body === 44 && Math.hypot(o.x - 17.98, o.z + 15.84) < 0.05) || (o.body === 45 && Math.hypot(o.x - 19.26, o.z + 15.84) < 0.05) ? 'skip' : null),   // (KNARTAS-LEDGE: not the hedge's fence end the steps pass; DOOR-SWEEP: nor the pennant fence's panel and pole across the fishing family's door, which no way led round)
    lampPosts: true, jarMax: 1.15, harbour: { x0: -42, x1: -16.2, z0: -34.6, z1: -20.1, water: -0.12, open: 'x0' },
    // (KNARTAS-LEDGE: Quill's office's door on its ledge over the middle arm: steps down to the arm, a little toward its
    // south side, clear of the hedges and their fence on the north (narrower where they stand beside it); the arm's tree that
    // stood on the slope in their way stands beside their foot, on the arm)
    doorStairs: { 'knartas--30--18': { lo: -0.25, hi: 1.2, loTop: -0.8, topTo: 2.9 } },
    layout: (L) => ({ ...L, decor: L.decor.map((o) => (o[8] === 27 && o[7] === 'tall' && Math.hypot(o[0] + 23.85, o[1] + 17.55) < 0.05 ? [o[0], -15.75, 2.59, ...o.slice(3)] : o)) }),
    crates: 'wood', lines: ['#f4eee0', '#3a7ac8', '#e8608a', '#f0c040'],
    landmark(api) {
      const pois = [{ ...api.S.target }];
      const L = api.near('beacon', -33.5, -17.6, 0, {}, 2.5);   // the harbour light at the middle arm's end
      if (L) pois.push({ x: L.x + 3.0, z: L.z, word: 'LIGHTHOUSE', at: L });
      return pois;
    },
    dress(api) {
      // the quay's edges: bollards, boats moored alongside in the clouds, nets, crates
      for (const [x0, x1, z, side] of [[-34, -10, -45.4, -1], [-34, -10, -35.0, 1], [-34, -10, -21.3, -1], [-34, -10, -14.6, 1]]) {
        for (let x = x0; x <= x1; x += 6) api.near('bollard', x, z - side * 0.2, 0, {}, 0.6);
      }
      for (const [x, z, ry] of [[-24, -48.6, Math.PI / 2], [-27, -11.4, -Math.PI / 2], [-12.5, -48.8, Math.PI / 2 + 0.2]]) api.add('skiff', x, z, ry, { color: ['#c84a3a', '#2f7f86', '#d89a30', '#7a3a8a'][Math.abs(Math.round(x)) % 4] });
      // moored in the harbour basin, tied to the quay (seen from the landing on the quay's spine)
      for (const [x, z, ry, c, tie] of [[-20.6, -30.4, Math.PI / 2, '#2f7f86', [-17.0, -30.4]], [-21.4, -25.6, Math.PI / 2 + 0.12, '#c84a3a', [-17.0, -25.6]], [-27.5, -31.6, 0.1, '#d89a30', [-27.5, -34.4]], [-30.5, -23.4, Math.PI - 0.15, '#7a3a8a', [-30.5, -20.3]]]) api.add('skiff', x, z, ry, { color: c, harbour: true, tie });
      api.open('netRack', 3, { lo: 1.6, space: 6, around: { x: -22, z: -40, r: 14 }, face: { x: -22, z: -30 } });
      api.open('crates', 5, { lo: 1.4, space: 4, around: { x: -15, z: -30, r: 16 }, opts: (i) => ({ n: 2 + (i % 3), seed: i + 3 }) });
      api.open('barrels', 3, { lo: 1.3, space: 5, around: { x: -18, z: -18, r: 12 } });
      api.open('laundry', 3, { lo: 1.8, space: 9, around: { x: 22, z: 20, r: 22 } });
      api.street({ benches: 4, clutter: 8, kinds: ['barrels', 'crates', 'jars', 'bin', 'planter'], lamps: 12, doors: 0.85, banners: 0, lines: true, fillSpacing: 8 });
      api.signs([{ word: 'VILLAGE', x: 22, z: 22 }]);
    },
  },
  mosquibee: {   // the Mosquibees' honey island: a hive meadow on the broad top, flower beds and hives on the ledges
    // (ZEELICH-1 item 6: LBA2 has the Mosquibees under the gas: a warmer, hazier light; mild, the meadow keeps its colour)
    env: { fog: '#e2c8a8', sun: '#ffe0b0', hemiSky: '#f0dcc4', hemiGround: '#8a6a4a', sunI: 2.2, hemiI: 1.15, fogRange: [75, 280] }, gradeTint: [1.02, 0.99, 0.93], cloudTint: ['#fff0dc', '#fff2e0', '#fff4e8'],
    mainNear: { x: 28, z: -20 },
    // (ISLES-BAR: the hive keepers' hall stands on the ledge 13 m under the meadow's east edge, which nothing reached: a
    //  honey hoist down the cliff, the Mosquibees' own way for the jars)
    hoists: [{ id: 'mb_hoist', tower: [20.3, 9.8, Math.PI], h: 14.5, w: 2.0, head: [17.6, 9.8], foot: [22.5, 9.9] }],
    trees: '#fff0b8', ground: ['#eef2a0', '#f4e890', '#e8d8b0'], pave: 'concrete', paveAt: () => false,
    walls: ['#fff4d8', '#f8e8c0', '#f4f0e0'], domes: [['#d89a30', '#ffe6a8'], ['#c8a020', '#fff0a0']],
    target: { x: 27, z: -6, word: 'HIVES' }, near: 12, far: 30,
    crates: 'nectar', lines: ['#f0c030', '#f4eee0', '#e8608a', '#9ad0b0'], flowerTrees: true,
    landmark(api) {
      const g = api.near('greatHive', 27, -11, 0, {}, 3);
      return [g ? { x: g.x, z: g.z + 4.0, word: 'HIVES', at: g } : { ...api.S.target }];
    },
    dress(api) {
      // rows of hives on the meadow, flower beds between them, a honey stall, nectar crates
      api.open('hive', 10, { lo: 2.0, space: 3.2, around: { x: 26, z: -22, r: 20 }, face: api.S.target });
      api.open('flowerBed', 6, { lo: 2.2, space: 5, around: { x: 26, z: -24, r: 20 }, opts: (i) => ({ w: 2.6, d: 1.2, colors: [['#f0c030', '#e8608a', '#f4eee0'], ['#c050d0', '#f0c030'], ['#e8343a', '#f4eee0', '#f0c030']][i % 3] }) });
      api.open('stall', 1, { lo: 3.0, space: 8, around: { x: 22, z: -14, r: 10 }, face: api.spawn, opts: () => ({ goods: 'honey', a: '#f0c030', b: '#fff4e0', seed: 5 }) });
      api.open('crates', 5, { lo: 1.6, space: 4, around: { x: 28, z: -18, r: 20 }, opts: (i) => ({ kind: 'nectar', n: 2 + (i % 3), seed: i + 1 }) });
      api.open('honey', 4, { lo: 1.4, space: 4, around: { x: 28, z: -18, r: 20 } });
      // the ledges below: hives and beds where the ground is flat (seen from the meadow's edge)
      api.ledges(['hive', 'flowerBed', 'hive', 'honey', 'crates'], 16, { space: 3.5, opts: { kind: 'nectar', colors: ['#f0c030', '#e8608a', '#f4eee0'] } });
      api.street({ benches: 3, clutter: 4, kinds: ['honey', 'crates', 'planter'], lamps: 10, doors: 0.8, banners: 0, lines: false, fillSpacing: 8 });
      api.signs([{ word: 'MEADOW', x: 30, z: -30 }]);
    },
  },
  celebration: {   // Celebration Island: the original's ground (CELEBRAT) with the great figure of its later state
    // (ZEELICH-1 item 6: the volcano's island: a warm haze, the light lava-tinted)
    env: { fog: '#f2cbb4', sun: '#ffd8b0', hemiSky: '#ffdcc8', hemiGround: '#a05a44', sunI: 2.5, hemiI: 1.25, fogRange: [80, 290] }, gradeTint: [1.04, 0.98, 0.93], cloudTint: ['#ffe2d4', '#ffe8dc', '#fff0e4'],
    // (CELEBRA2's new objects, kept as "risen"): twelve years on the figure still stands, its pit filled and paved
    // round its feet, and the island holds its festival there — masts round it, garlands up to the figure
    trees: '#ffd8ec', ground: ['#e4f4b0', '#d8eca8', '#ecdcc0'], pave: 'cobble', paveAt: (x, z) => Math.hypot(x - 2, z - 1) < 10,
    walls: ['#fff0f4', '#f6dce6', '#fbf0e0'], domes: [['#c84a7a', '#ffc8dc'], ['#d89a30', '#ffe6a8']],
    // the figure's parts (CELEBRA2: 17 the body, 18 its back, 16 the head, 20 the crest, 12 + 19 + 21 a staff), set
    // on the paved plaza (9.5 m; they stood on the pit's floor at 6.5 m), numbered 800+ so they keep apart
    // (its body's box, 8.7 × 11.2 m, holds the arms and the robe's spread; our figure stands on a round base of
    // 7.2 m in the box's middle, so the plaza round it stays walkable)
    layout: (L) => ({ ...L, decor: [...L.decor, ...(L.risen || []).filter((o) => [12, 16, 17, 18, 19, 20, 21].includes(o[8]) && Math.hypot(o[0] - 2.2, o[1] - 0.6) < 9).map((o) => o[8] === 17 ? [2.2, 0.6, +(o[2] + 2.99).toFixed(2), 7.2, o[4], 7.2, o[6], o[7], 817] : [o[0], o[1], +(o[2] + 2.99).toFixed(2), o[3], o[4], o[5], o[6], o[7], 800 + o[8]])] }),
    shape: (o) => (o.body === 817 ? 'colossus' : o.body === 812 ? 'staff' : o.body > 800 ? 'skip' : null),
    colossus: { x: 2.2, z: 0.6, h: 28.3, r: 3.3 },
    target: { x: 2.2, z: 0.6, word: 'THE FIGURE' }, near: 7, far: 18, D: [7, 6.5, 6, 5.5, 5], ahead: 7.5, padClear: 3.0, padSlope: 1.4, padR: 3.2,
    crates: 'wood', lines: ['#e8608a', '#f0c040', '#3fa8b8', '#f4eee0', '#9a5ac8'],
    landmark(api) {
      const C = api.S.colossus, pois = [{ ...api.S.target, at: { x: C.x, z: C.z } }];
      // masts round the pit, pennants from each to the next and garlands up to the figure
      const masts = [];
      for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; const m = api.near('pole', C.x + Math.sin(a) * 9.5, C.z + Math.cos(a) * 9.5, 0, { h: 5.6, flag: ['#e8608a', '#f0c040', '#3fa8b8', '#9a5ac8'][k % 4] }, 3); if (m) masts.push(m); }
      masts.forEach((m, i) => { const n = masts[(i + 1) % masts.length]; if (masts.length > 2 && Math.hypot(m.x - n.x, m.z - n.z) < 14) api.line(m, 5.4, n, 5.4, { kind: 'pennants', sag: 0.6 }); api.line(m, 5.2, { x: C.x + (m.x - C.x) * 0.42, z: C.z + (m.z - C.z) * 0.42 }, 9.5, { kind: i % 2 ? 'garland' : 'lanterns', sag: 0.4 }); });
      return pois;
    },
    dress(api) {
      const C = api.S.colossus;
      api.open('stage', 1, { lo: 2.6, space: 8, around: { x: C.x, z: C.z, r: 18 }, face: C, opts: () => ({ w: 4.4, d: 2.4 }) });
      api.open('stall', 2, { lo: 2.6, space: 7, around: { x: C.x, z: C.z, r: 18 }, face: C, opts: (i) => ({ goods: ['fruit', 'cloth'][i], a: ['#e8608a', '#f0c040'][i], b: '#f8eee4', seed: i + 7 }) });
      api.open('boxPlanter', 4, { lo: 1.8, space: 5, around: { x: C.x, z: C.z, r: 16 }, opts: () => ({ len: 2.2 }) });
      api.street({ benches: 3, clutter: 4, kinds: ['planter', 'bin', 'jars'], lamps: 9, doors: 1, banners: 4, lines: true, lanterns: true, fillSpacing: 6 });
      api.giver(['money', 'magic'], C.x - 4.5, C.z + 6.5, 1);
      api.signs([{ word: 'FESTIVAL', x: C.x - 10, z: C.z + 6 }]);
    },
  },
  liftdock: {   // the original's ASCENCE: a cargo lift dock on stilts at the cloud line — decks at 5.5 and 6.7 m, the
    // lift tower on the upper deck, a crane over the east deck, crates stacked, a cloud barge alongside. Ours: the
    // shuttle's landing deck on the west, two stairs up to the upper deck, rails, the tower's working cage.
    decks: true, floors: [1, 9, 15, 19, 14, 32],
    extraDecor: [[-15.55, 13.9, 4.58, 12.1, 0.9, 10.0, 0, 'building', 990]],
    stairs: [{ ax: -6.2, az: 11.4, bx: -6.2, bz: 8.1, w: 2.2, y0: 5.48, y1: 6.74, n: 6 }, { ax: 7.0, az: 7.3, bx: 3.2, bz: 7.3, w: 1.9, y0: 5.48, y1: 6.74, n: 6 }],
    // (the original's lift tower 0/4/5, its piers 6/7/8, rails and beams 10–13/30, the crane 23–29, the pad 35, lamps 2/3)
    shape: (o) => ([0, 4, 5, 10, 11, 12, 13, 30, 23, 24, 25, 26, 27, 28, 29, 35, 2, 3].includes(o.body) ? 'skip' : [6, 7, 8].includes(o.body) ? 'pier'
      : [1, 9, 15, 19, 14, 32, 990].includes(o.body) ? 'deck' : o.body === 31 ? 'hulk' : [17, 20].includes(o.body) ? 'crate' : [21, 22].includes(o.body) ? 'jar' : null),
    hulk: { y: 0.95, h: 7.5 },
    trees: '#e0e8e4', ground: ['#d8dcc0', '#ccd0b4', '#d8ccb8'], pave: 'concrete', paveAt: () => false,
    walls: ['#e8dcd0', '#d8dce0', '#f0e4d8'], domes: [['#2f8a9a', '#a8e8ee'], ['#d89a30', '#ffe6a8']],
    target: { x: -3.8, z: 7.2, word: 'LIFT' }, near: 8, far: 22, D: [7.5, 7, 6.5, 6], ahead: 3, padClear: 2.6, padSlope: 0.6, padR: 3.4, padIn: (x) => x < -11,
    crates: 'cargo', lines: ['#f0c040', '#2f8a9a'],
    landmark(api) {
      const pois = [{ ...api.S.target, at: { x: -3.8, z: 3.3 } }];
      api.add('liftTower', -3.83, 3.33, 0, { h: 11, w: 3.4 });
      const c = api.add('crane', 9.4, 3.3, Math.PI / 2, { h: 7, jib: 6.5 });
      pois.push({ x: 9.4, z: 6.8, word: 'CARGO DOCK', at: c });
      return pois;
    },
    dress(api) {
      for (const [x, z, ry, c] of [[-26, 6, 0.3, '#c84a3a'], [-25, 21, -0.2, '#2f7f86'], [-12, 25, 1.6, '#d89a30'], [16, 17, 1.2, '#7a3a8a']]) api.add('skiff', x, z, ry, { color: c });
      api.open('crates', 6, { lo: 0.9, space: 3, around: { x: 0, z: 12, r: 14 }, opts: (i) => ({ kind: i % 2 ? 'cargo' : 'wood', n: 2 + (i % 3), seed: i + 21 }) });
      api.open('barrels', 3, { lo: 0.9, space: 4, around: { x: -14, z: 14, r: 8 } });
      api.open('warn', 2, { lo: 1.0, space: 6, around: { x: 4, z: 12, r: 10 }, face: api.spawn, opts: (i) => ({ text: ['MIND THE EDGE', 'CRANE AREA'][i] }) });
      api.open('cageLamp', 5, { lo: 1.0, space: 6, around: { x: -4, z: 10, r: 18 } });
      api.giver(['money', 'life'], -3.8, 12.5, 1);
      api.signs([{ word: 'CARGO DOCK', x: 9.4, z: 6.8 }]);
    },
  },
  // ---- our own places (src/game/zplaces.js; not in LBA2) -------------------------------------------------------
  orchard: {   // the Nectar Orchard: a rounded hill of nectar trees in rows along its contours, the press house at its
    // foot, a cloud-catcher on the crown that combs water from the passing cloud for the trees
    trees: '#ffc8e0', ground: ['#d8eca0', '#cfe498', '#e8dcb8'], pave: 'concrete', paveAt: () => false,
    walls: ['#fff4e4', '#f8ead8', '#f4f0e0'], domes: [['#c84a7a', '#ffc8dc'], ['#d89a30', '#ffe6a8']],
    shape: (o) => (o.body === 940 || o.body === 941 ? 'blossom' : null),
    target: { x: 0, z: 0, word: 'CLOUD CATCHER' }, near: 16, far: 30, ahead: 9.5,
    crates: 'nectar', lines: ['#e8608a', '#f0c030', '#f4eee0'], flowerTrees: true,
    landmark(api) {
      const c = api.near('cloudCatcher', 0, 0, 0, {}, 3);
      const pois = [c ? { x: c.x, z: c.z + 5.4, word: 'CLOUD CATCHER', at: c } : { ...api.S.target }];
      const p = api.near('nectarPress', 4.0, 22.2, Math.PI, {}, 3);
      pois.push({ x: 4.0, z: 21.0, word: 'PRESS HOUSE', at: p });
      return pois;
    },
    dress(api) {
      api.open('hive', 6, { lo: 1.6, space: 6, around: { x: 0, z: 0, r: 30 } });
      api.open('flowerBed', 4, { lo: 1.8, space: 6, around: { x: 0, z: 18, r: 12 }, opts: (i) => ({ w: 2.6, d: 1.2, colors: [['#f0c030', '#e8608a', '#f4eee0'], ['#c050d0', '#f0c030']][i % 2] }) });
      api.open('crates', 4, { lo: 1.4, space: 4, around: { x: 2, z: 22, r: 9 }, opts: (i) => ({ kind: 'nectar', n: 2 + (i % 3), seed: i + 61 }) });
      api.open('honey', 3, { lo: 1.4, space: 4, around: { x: 2, z: 22, r: 9 } });
      api.open('stall', 1, { lo: 2.4, space: 8, around: { x: 0, z: 18, r: 10 }, face: api.spawn, opts: () => ({ goods: 'honey', a: '#e8608a', b: '#fff4e0', seed: 71 }) });
      api.street({ benches: 3, clutter: 4, kinds: ['honey', 'crates', 'planter'], lamps: 10, doors: 0.9, banners: 0, lines: false, fillSpacing: 9 });
      const pp = api.pois[1]; if (pp) api.giver(['life'], pp.at?.x ?? pp.x, pp.at?.z ?? pp.z, 1);
      api.signs([{ word: 'ORCHARD', x: -14, z: 6 }]);
    },
  },
  oldwatch: {   // the Old Watch: a crescent ridge over the clouds, the old watchtower broken on its north horn (its dome
    // fallen beside it), blocks of the old wall along the crest, a telescope on the south horn looking out
    trees: '#e8e0f0', ground: ['#dfe6b8', '#d2dcac', '#e2d4c0'], pave: 'concrete', paveAt: () => false,
    walls: ['#e8e0d8', '#e0d8d0'], domes: [['#5a8a8a', '#c8e0d8']],
    shape: (o) => (o.body >= 960 && o.body < 970 ? 'block' : null),
    env: { fog: '#ead2e2', sun: '#fff2e0', hemiSky: '#f4e4ff', hemiGround: '#9a7c98', sunI: 2.4, hemiI: 1.25, fogRange: [90, 320] },
    target: { ...watchAt(0.1), word: 'OLD WATCH' }, near: 12, far: 34, padClear: 3.0, padSlope: 1.4,
    padIn: (x, z) => { const C = OLDWATCH.C, s = (Math.atan2(z - C.z, C.x - x) + OLDWATCH.A) / (2 * OLDWATCH.A); return s > 0.25 && s < 0.8; },
    crates: 'wood', lines: null,
    landmark(api) {
      const n = watchAt(0.06), s = watchAt(0.93), C = OLDWATCH.C;
      const t = api.near('ruinedTower', n.x, n.z, 0, { r: 2.4, h: 7.5 }, 3);
      const pois = [t ? { x: t.x + (C.x - t.x) * 0.25, z: t.z + (C.z - t.z) * 0.25 + 1, word: 'OLD WATCH', at: t } : { ...api.S.target }];
      const ts = api.near('telescope', s.x, s.z, Math.atan2(s.x - C.x, s.z - C.z) + 0.6, {}, 3);
      if (ts) pois.push({ x: ts.x + (C.x - ts.x) * 0.15, z: ts.z + (C.z - ts.z) * 0.15, word: 'TELESCOPE', at: ts });
      return pois;
    },
    dress(api) {
      const t = api.pois[0].at;
      if (t) api.near('fallenDome', t.x + 4.2, t.z + 2.5, 0.8, {}, 3);
      api.open('brokenCol', 6, { lo: 1.2, space: 4.5, around: watchAt(0.3), opts: (i) => ({ h: [2.6, 1.4, 2.0, 0.9, 1.8, 1.2][i % 6] }) });
      api.open('brokenCol', 3, { lo: 1.2, space: 4.5, around: watchAt(0.7) , opts: (i) => ({ h: [1.6, 2.4, 1.0][i % 3] }) });
      const ts = api.pois[1]?.at; if (ts) api.giver(['magic', 'life'], ts.x, ts.z, 1);
      api.street({ benches: 2, clutter: 0, kinds: ['planter'], lamps: 0, doors: 0, banners: 0, lines: false, fillSpacing: 99 });
      api.signs([]);
    },
  },
  undergas: {   // Under Celebration: the gas works — a gas holder and a pump engine, pipes, caged lamps, a dimmer sky
    trees: '#d8d0e8', ground: ['#c8c8a8', '#b8bca0', '#c8b8a8'], pave: 'concrete', paveAt: (x, z) => Math.hypot(x + 17, z + 28) < 15,
    walls: ['#d8d0d8', '#c8c8d0', '#d8c8c0'], domes: [['#4a5a6a', '#a8b8c8'], ['#2f8a9a', '#a8e8ee']],
    env: { fog: '#cdb8cc', sun: '#ffe2c8', hemiSky: '#d8cce8', hemiGround: '#5a4c62', sunI: 2.0, hemiI: 1.05, fogRange: [75, 260] },
    target: { x: -15, z: -25, word: 'GAS WORKS' }, near: 16, far: 30,
    crates: 'cargo', lines: null,
    landmark(api) {
      const pois = [{ ...api.S.target }];
      const g = api.near('gasHolder', -12.5, -33, 0, { r: 2.6, h: 5.2 }, 3);
      const p = api.near('pump', -13, -17.5, Math.PI / 2, {}, 2.5);
      if (g && p) api.pipe([{ x: g.x - 3.0, z: g.z + 1.5, h: 1.2 }, { x: g.x - 3.0, z: (g.z + p.z) / 2, h: 2.6 }, { x: p.x - 2.4, z: (g.z + p.z) / 2, h: 2.6 }, { x: p.x - 2.4, z: p.z - 1.4, h: 1.0 }]);
      if (g) pois.push({ x: g.x - 4.4, z: g.z, word: 'PUMP HOUSE', at: g });
      const g2 = api.near('gasHolder', -24, -41, 0, { r: 2.0, h: 4.2 }, 4);
      if (g && g2) api.pipe([{ x: g2.x + 2.4, z: g2.z, h: 1.0 }, { x: g2.x + 3.2, z: g2.z, h: 2.7 }, { x: g.x - 3.4, z: g2.z, h: 2.7 }, { x: g.x - 3.4, z: g.z - 1.6, h: 1.2 }]);
      return pois;
    },
    dress(api) {
      api.open('bottles', 4, { lo: 1.2, space: 5, around: { x: -18, z: -26, r: 16 }, opts: (i) => ({ n: 3 + (i % 3) }) });
      api.open('cageLamp', 8, { lo: 1.5, space: 7, around: { x: -22, z: -28, r: 22 } });
      api.open('pump', 1, { lo: 2.5, space: 8, around: { x: -30, z: -40, r: 10 } });
      api.open('crates', 4, { lo: 1.4, space: 5, around: { x: -20, z: -30, r: 18 }, opts: (i) => ({ kind: 'cargo', n: 2 + (i % 2), seed: i + 9 }) });
      api.open('barrels', 4, { lo: 1.3, space: 5, around: { x: -22, z: -26, r: 18 } });
      api.open('warn', 3, { lo: 1.2, space: 8, around: { x: -14, z: -26, r: 10 }, face: api.spawn, opts: (i) => ({ text: ['NO NAKED FLAMES', 'KEEP CLEAR', 'MIND THE EDGE'][i % 3] }) });
      api.street({ benches: 2, clutter: 8, kinds: ['barrels', 'crates', 'bottles', 'bin'], lamps: 0, cage: 10, doors: 0.8, banners: 0, lines: false });
      api.signs([{ word: 'LOOKOUT', x: 20, z: -10 }]);
    },
  },
  platform: {   // ZEELICH-1 item 5: the Wannies' island under the gas (LBA2's PLATFORM: the Building Company's yard by the
    // gem mine, the Wannie village of low houses, its chapel; it was "the High Platform", an industrial deck). The lift
    // from the Lift Dock (ASCENCE) comes down here: its foot by the company's yard. Handles: R.wannie (below)
    // (ZEELICH-1 item 6: under the gas — LBA2's Wannies' island: dim, warm and hazy, the light from below the gas)
    // (SKY-9: dim and warm but readable, R8: the gas lights the island from below — a warm hemisphere ground, not a dark
    //  one — and the haze is lighter than the ground; the cloud sea 4.5 m lower, under the island's edges (its channels
    //  read as chasms down to the gas), its billows in greys so the amber tint alone colours it, a glowing orange apart
    //  from the grey-tan paving, finer (cloudRep) so a narrow channel shows billows, not one flat patch; smaller puffs
    //  that stay in the channels instead of cutting their walls)
    env: { fog: '#b09a80', sun: '#ffcc98', hemiSky: '#ccb8a0', hemiGround: '#94704c', sunI: 2.4, hemiI: 1.6, fogRange: [50, 210] }, grade: 0.88, gradeTint: [1.02, 0.985, 0.94],
    cloudTint: ['#7a5030', '#b07a48', '#d09a60'], cloudGrey: true, cloudDrop: 4.5, cloudRep: 2, cloudOp: [1, 0.85, 0.3], puffScale: 0.6,
    trees: '#d8d0b8', ground: ['#b8a888', '#a89878', '#c0ac90'], pave: 'concrete', paveAt: (x, z) => x > 14 && x < 41 && z < -18.5,
    rock: '#b0a498', rockHi: '#c4b8a8',   // (SKY-9: a taupe stone, apart from the sandy ground and the amber gas; Zeelich's pink rock read magenta here)
    walls: ['#d8ccc0', '#cfc4b4', '#e0d4c4'], domes: [['#6a5a4a', '#c8b098'], ['#4a6a6a', '#a8c8c0']],
    target: { x: 27, z: -26, word: 'BUILDING COMPANY' }, near: 13, far: 30, padClear: 3.0, padSlope: 1.0, padR: 3.2, padIn: (x, z) => z < -19,
    crates: 'wood', lines: ['#c8a050', '#5a4a3a'],
    // (DOOR-CLEAR: the yard fence along the front of the Wannie house at (35, 15) ran on 0.2 m past the middle of its
    //  door, 1.4 m out: straight out of the door, or straight back in from where he lands, he walked into its end. It
    //  ends 0.95 m short of the door's middle now; the yard keeps its other sides)
    //  (and the original's two rail lengths 1.6 m up round that house's corner, with no balcony under them, are left out:
    //  drawn, they were a wooden frame hanging across the top of its door)
    shape: (o) => (o.y > 5.8 && Math.hypot(o.x - 37.4, o.z - 12.3) < 2.5 && Math.min(o.sx, o.sz) < 0.45 ? 'skip' : null),
    layout: (L) => ({ ...L, decor: L.decor.map((o) => (Math.abs(o[0] - 39.62) < 0.05 && Math.abs(o[1] - 13.06) < 0.05 && o[5] > 3 ? [o[0], 12.48, o[2], o[3], o[4], 2.18, ...o.slice(6)] : o)) }),
    landmark(api) {
      const pois = [{ ...api.S.target }];
      // the company's board over its yard, before the long building facing the pad
      // (DOOR-SWEEP: to the east of the company's door, not before it: it stood across the way in, its board's
      //  collider down to the ground, and he could only reach the door round its end)
      api.near('boardSign', 31.0, -25.8, 0, { text: 'BUILDING COMPANY', w: 3.6 }, 1.0);
      // the gem mine's mouth on the ramp down to the village, facing west; the lift's foot at the ramp's head
      // (the yard itself is all routes: these are the planner's nearest free spots)
      const m = api.near('mineMouth', 27.5, -9.5, -Math.PI / 2, {}, 3);
      if (m) pois.push({ x: m.x - 3.5, z: m.z, word: 'MINE', at: m });
      const lf = api.near('liftTower', 27, -21.5, Math.PI / 2, { h: 7, w: 3.0 }, 3);
      if (lf) pois.push({ x: lf.x + 2.6, z: lf.z, word: 'LIFT', at: lf });
      // the chapel: the village's southernmost house, up on its terrace (its door faces east); its bell below
      api.near('bellFrame', 38.3, 29.8, 0, {}, 2);
      return pois;
    },
    dress(api) {
      // the ore by the lift's foot and the mine, barrels, caged lamps, the miners' warnings; the village's benches and lines
      api.open('crates', 8, { lo: 1.0, space: 2.6, around: { x: 24, z: -22, r: 8 }, opts: (i) => ({ kind: 'wood', n: 2 + (i % 2), seed: i + 40 }) });
      api.open('barrels', 3, { lo: 1.2, space: 4, around: { x: 30, z: -11, r: 7 } });
      api.open('warn', 3, { lo: 1.0, space: 7, around: { x: 29, z: -13, r: 9 }, face: api.spawn, opts: (i) => ({ text: ['MINE', 'KEEP CLEAR', 'NO NAKED FLAMES'][i % 3] }) });
      api.open('cageLamp', 6, { lo: 1.0, space: 6, around: { x: 30, z: 0, r: 26 } });
      api.street({ benches: 3, clutter: 6, kinds: ['crates', 'barrels', 'jars', 'bin'], lamps: 8, doors: 1, banners: 0, lines: true, fillSpacing: 6 });
      api.signs([{ word: 'VILLAGE', x: 30, z: 18 }, { word: 'CHAPEL', x: 33.5, z: 25 }]);
    },
  },
};

// the room each piece needs on the ground: a radius or a box (half sizes, turned with the piece)
const FOOT = {
  bin: () => ({ r: 0.42 }), planter: (o) => ({ r: o.big ? 0.9 : 0.72 }), boxPlanter: (o) => ({ hw: (o.len ?? 2.2) / 2 + 0.05, hd: 0.4 }),
  bench: () => ({ hw: 0.97, hd: 0.4 }), lamp: () => ({ r: 0.32 }), signpost: () => ({ r: 0.35 }), banner: () => ({ r: 0.3 }), pole: () => ({ r: 0.3 }),
  crates: (o) => ({ r: o.kind === 'cargo' ? 1.15 : 0.95 }), barrels: () => ({ r: 0.85 }), jars: () => ({ r: 0.72 }), honey: () => ({ r: 0.62 }),
  stall: () => ({ hw: 1.85, hd: 1.1 }), hive: () => ({ r: 0.72 }), greatHive: () => ({ r: 2.6 }), flowerBed: (o) => ({ hw: (o.w ?? 2.4) / 2 + 0.12, hd: (o.d ?? 1.2) / 2 + 0.12 }),
  plinth: () => ({ r: 2.4 }), stage: (o) => ({ hw: (o.w ?? 4.4) / 2 + 0.1, hd: (o.d ?? 2.4) / 2 + 0.75 }), fountain: () => ({ r: 2.5 }),
  gasHolder: (o) => ({ r: (o.r ?? 2.6) + 1.0 }), pump: () => ({ hw: 1.85, hd: 1.15 }), cageLamp: () => ({ r: 0.32 }), bottles: (o) => ({ hw: (o.n ?? 4) * 0.16 + 0.2, hd: 0.32 }),
  crane: () => ({ r: 1.65 }), warn: () => ({ r: 0.4 }), barrier: (o) => ({ hw: (o.len ?? 2.4) / 2 + 0.2, hd: 0.2 }),
  mast: () => ({ r: 0.95 }), flagPole: () => ({ r: 0.3 }), waterTank: () => ({ r: 1.05 }), bollard: () => ({ r: 0.3 }), beacon: () => ({ r: 1.3 }),
  netRack: (o) => ({ hw: (o.w ?? 2.6) / 2 + 0.12, hd: 0.25 }), laundry: (o) => ({ hw: (o.w ?? 3.2) / 2 + 0.12, hd: 0.25 }),
  // ZL-ALL / CONNECT
  shuttleBoard: () => ({ hw: 1.0, hd: 0.3 }), weighBeam: () => ({ r: 1.6 }), cloudCatcher: () => ({ r: 4.7 }), nectarPress: () => ({ hw: 1.15, hd: 0.9 }),
  ruinedTower: () => ({ r: 2.6 }), telescope: () => ({ r: 1.8 }), brokenCol: () => ({ r: 0.5 }), fallenDome: () => ({ r: 2.3 }), liftTower: (o) => ({ r: (o.w ?? 3) * 0.75 }),
  // ZEELICH-1 item 5
  mineMouth: () => ({ hw: 3.0, hd: 2.0 }), bellFrame: () => ({ r: 1.0 }), boardSign: (o) => ({ hw: (o.w ?? 2.6) / 2 + 0.1, hd: 0.3 }),
};
// how tall each piece stands (for the camera's view: the big ones are kept out of a chosen view's foreground)
const HGT = { gasHolder: (o) => (o.r ?? 2.6) > 2.2 ? (o.h ?? 5.2) + 1.2 : (o.h ?? 4.2) + 1.2, crane: (o) => o.h ?? 9, mast: (o) => o.h ?? 8, waterTank: () => 3.6, beacon: () => 5.9,
  greatHive: () => 5.2, stall: () => 2.6, pump: () => 2.8, liftTower: (o) => o.h ?? 11, cloudCatcher: (o) => o.h ?? 6.8, ruinedTower: (o) => o.h ?? 7.5,
  weighBeam: () => 4.6, telescope: () => 2.4, stage: () => 2.0, nectarPress: () => 2.6, fountain: () => 3.6, plinth: () => 3.2, netRack: () => 2.3, laundry: () => 2.3,
  colossus: (o) => o.h ?? 28, fallenDome: () => 2.0, hive: () => 1.3, crates: () => 1.3, barrels: () => 0.9, honey: () => 1.0, bench: () => 0.9, planter: () => 1.2,
  boxPlanter: () => 0.8, flowerBed: () => 0.6, bin: () => 1.1, jars: () => 0.8, bottles: () => 1.2, barrier: () => 1.1, brokenCol: (o) => o.h ?? 2.2, warn: () => 2.0,
  mineMouth: () => 4.4, bellFrame: () => 3.2, boardSign: () => 2.6 };
const pieceH = (kind, o = {}) => HGT[kind]?.(o) ?? 1.0;
const THIN_PIECES = new Set(['lamp', 'cageLamp', 'banner', 'pole', 'signpost', 'flagPole', 'bollard', 'post', 'shuttleBoard', 'skiff', 'warn']);
const FS = 0.5;   // the plan's grid (m)
let DEBUG_PLAN = null;

function planIsland(name, L, A, debug = false) {
  if (debug) DEBUG_PLAN = [];
  const S = STYLE[name] || {}, rr = rng(name.length * 977 + L.nx * 13);
  const { nx, nz } = L, { H, comp, main, steep } = A;
  const fx = Math.floor(A.w / FS) + 1, fz = Math.floor(A.d / FS) + 1, X0 = -A.w / 2, Z0 = -A.d / 2, N = fx * fz;
  const wx = (i) => X0 + i * FS, wz = (j) => Z0 + j * FS, ci = (x) => Math.round((x - X0) / FS), cj = (z) => Math.round((z - Z0) / FS);
  const inF = (i, j) => i >= 0 && j >= 0 && i < fx && j < fz;
  const K = (x, z) => { const i = ci(x), j = cj(z); return inF(i, j) ? j * fx + i : -1; };
  const hAt = A.floorAt ? (x, z) => A.floorAt(x, z) : (x, z) => {
    const gxf = A.gx(x), gzf = A.gz(z), i = Math.floor(gxf), j = Math.floor(gzf), u = gxf - i, v = gzf - j; let s = 0, w = 0;
    for (const [a, b, ww] of [[i, j, (1 - u) * (1 - v)], [i + 1, j, u * (1 - v)], [i, j + 1, (1 - u) * v], [i + 1, j + 1, u * v]]) {
      if (a < 0 || b < 0 || a >= nx || b >= nz || H[b * nx + a] == null) continue; s += H[b * nx + a] * ww; w += ww;
    }
    return w ? s / w : null;
  };
  // the fine grid: area (the data point's walkable area, -1 steep, -2 sea), slope, objects (occupied / solid)
  const area = new Int32Array(N).fill(-2), stp = new Uint8Array(N), occ = new Uint8Array(N), sol = new Uint8Array(N), keep = new Uint8Array(N);
  for (let j = 0; j < fz; j++) for (let i = 0; i < fx; i++) {
    const x = wx(i), z = wz(j), k = j * fx + i, gi = Math.round(A.gx(x)), gj = Math.round(A.gz(z));
    if (gi < 0 || gj < 0 || gi >= nx || gj >= nz || H[gj * nx + gi] == null) continue;
    if (A.floorAt && [[0, 0], [0.45, 0], [-0.45, 0], [0, 0.45], [0, -0.45]].some(([a, b]) => A.floorAt(x + a, z + b) == null)) continue;   // (on decks: not at a brink)
    area[k] = comp[gj * nx + gi];
    const fi = Math.floor(A.gx(x)), fj = Math.floor(A.gz(z));
    for (const [a, b] of [[fi, fj], [fi + 1, fj], [fi, fj + 1], [fi + 1, fj + 1]]) {
      if (a < 0 || b < 0 || a >= nx || b >= nz || (H[b * nx + a] == null && !A.floorAt) || steep[b * nx + a]) stp[k] = 1;
    }
  }
  const rect = (x, z, hw, hd, fn) => { for (let j = cj(z - hd); j <= cj(z + hd); j++) for (let i = ci(x - hw); i <= ci(x + hw); i++) if (inF(i, j)) fn(j * fx + i); };
  for (const o of A.decor) {
    if (A.floors && o.shape === 'deck') continue;   // (a deck is the ground there)
    rect(o.x, o.z, Math.max(0.1, o.sx / 2) + 0.25, Math.max(0.1, o.sz / 2) + 0.25, (k) => { occ[k] = 1; });
    if (o.solid) rect(o.x, o.z, Math.max(0.1, o.sx / 2) + 0.38, Math.max(0.1, o.sz / 2) + 0.38, (k) => { sol[k] = 1; });
  }
  // the Grand Hall's portico (columns, steps) before its front
  if (S.portico) { const q = S.portico; rect((q.x0 + q.x1) / 2, (q.z0 + q.z1) / 2, (q.x1 - q.x0) / 2, (q.z1 - q.z0) / 2, (k) => { occ[k] = 1; }); rect((q.x0 + q.x1) / 2, q.zc, (q.x1 - q.x0) / 2, 0.75, (k) => { sol[k] = 1; }); }
  // a gatehouse's passage (Knartas: the two houses across the causeway to the harbour) is open
  if (S.gate) rect((S.gate.x0 + S.gate.x1) / 2, (S.gate.z0 + S.gate.z1) / 2, (S.gate.x1 - S.gate.x0) / 2 + 0.5, (S.gate.z1 - S.gate.z0) / 2 - 0.4, (k) => { sol[k] = 0; occ[k] = 1; });
  const walk = new Uint8Array(N);
  for (let k = 0; k < N; k++) walk[k] = area[k] === main && !stp[k] && !sol[k] ? 1 : 0;
  const chamfer = (src) => {
    const d = new Float32Array(N), a = FS, b = FS * 1.4142;
    for (let k = 0; k < N; k++) d[k] = src(k) ? 0 : 1e9;
    for (let j = 0; j < fz; j++) for (let i = 0; i < fx; i++) { const k = j * fx + i; let v = d[k]; if (i > 0) v = Math.min(v, d[k - 1] + a); if (j > 0) { v = Math.min(v, d[k - fx] + a); if (i > 0) v = Math.min(v, d[k - fx - 1] + b); if (i < fx - 1) v = Math.min(v, d[k - fx + 1] + b); } d[k] = v; }
    for (let j = fz - 1; j >= 0; j--) for (let i = fx - 1; i >= 0; i--) { const k = j * fx + i; let v = d[k]; if (i < fx - 1) v = Math.min(v, d[k + 1] + a); if (j < fz - 1) { v = Math.min(v, d[k + fx] + a); if (i < fx - 1) v = Math.min(v, d[k + fx + 1] + b); if (i > 0) v = Math.min(v, d[k + fx - 1] + b); } d[k] = v; }
    return d;
  };
  const dSol = chamfer((k) => sol[k] || area[k] === -2), dStp = chamfer((k) => stp[k] === 1), dOcc = chamfer((k) => occ[k] || area[k] === -2);
  const disc = (x, z, r, pred) => { for (let j = cj(z - r); j <= cj(z + r); j++) for (let i = ci(x - r); i <= ci(x + r); i++) { const dx = wx(i) - x, dz = wz(j) - z; if (dx * dx + dz * dz > r * r) continue; if (!inF(i, j) || !pred(j * fx + i)) return false; } return true; };
  const line = (ax, az, bx, bz, pred) => { const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.25); for (let t = 0; t <= n; t++) { const k = K(ax + ((bx - ax) * t) / n, az + ((bz - az) * t) / n); if (k < 0 || !pred(k)) return false; } return true; };
  const range = (x, z, r) => { let lo = 1e9, hi = -1e9; for (let a = -r; a <= r + 1e-6; a += 1) for (let b = -r; b <= r + 1e-6; b += 1) { if (a * a + b * b > r * r + 0.01) continue; const h = hAt(x + a, z + b); if (h == null) return 1e9; lo = Math.min(lo, h); hi = Math.max(hi, h); } return hi - lo; };
  // ---- the play camera's view (src/engine/camera.js, the LBA view): what stands between it and him. `tall` holds
  // the top of whatever solid stands on each cell (the original's objects now, our pieces as they are placed;
  // slender things — lamps, poles, sign posts — don't count). view() casts a fan of rays over the lower part of
  // the frame (the ground between the camera and him) and to his body: the share of them stopped by an object
  // short of him is the foreground clutter, `body` whether he is hidden. camKeep marks the ground under those
  // rays (low enough to be hit by a tall piece) so the dressing keeps tall pieces out of a chosen view.
  const tall = new Float32Array(N).fill(-1e9);
  const THIN = new Set(['plant', 'slab', 'deck', 'pier', 'fence', 'post', 'pole', 'lamp', 'skip', 'figure']);
  for (const o of A.decor) if (o.solid && !THIN.has(o.shape)) rect(o.x, o.z, Math.max(0.1, o.sx / 2), Math.max(0.1, o.sz / 2), (k) => { tall[k] = Math.max(tall[k], o.y + o.sy); });
  const VIEW = (() => { const pitch = (300 / 4096) * Math.PI * 2; return { cp: Math.cos(pitch), sp: Math.sin(pitch), dist: 11800 / 750, ah: 2500 / 750, ty: Math.tan((43.6 / 2) * Math.PI / 180) }; })();
  const camKeep = new Uint8Array(N);
  const view = (hx, hz, ux, uz, { stamp = false } = {}) => {
    const hy = hAt(hx, hz) ?? 0, { cp, sp, dist, ah, ty } = VIEW, tx = ty * 16 / 9;
    const fxp = hx + ux * ah, fzp = hz + uz * ah, cx0 = fxp - ux * cp * dist, cz0 = fzp - uz * cp * dist;
    const cy0 = Math.max(hy + 1 + sp * dist, (hAt(cx0, cz0) ?? -9) + 1.5);
    // the camera's frame: forward f (to the look point), right r, up v
    let f = [fxp - cx0, hy + 1 - cy0, fzp - cz0]; const fl = Math.hypot(...f); f = f.map((c) => c / fl);
    let rv = [-f[2], 0, f[0]]; const rl = Math.hypot(...rv); rv = rv.map((c) => c / rl);
    const v = [rv[1] * f[2] - rv[2] * f[1], rv[2] * f[0] - rv[0] * f[2], rv[0] * f[1] - rv[1] * f[0]];
    const tHero = Math.hypot(hx - cx0, hy + 1 - cy0, hz - cz0);
    const march = (d, tMax, mark) => {
      for (let t = 0.6; t < tMax; t += 0.35) {
        const x = cx0 + d[0] * t, y = cy0 + d[1] * t, z = cz0 + d[2] * t, k = K(x, z);
        if (k < 0) continue;
        if (mark && y - (hAt(x, z) ?? -9) < 4.5 && t < tHero) camKeep[k] = 1;
        if (tall[k] > y) return t;
        const g = hAt(x, z); if (g != null && y < g) return -1;
      }
      return -1;
    };
    // (a ray stopped short of him counts whole; one stopped beside him, at his depth, half: a big thing filling a
    // side of the frame right by him crowds the view too)
    let hit = 0, n = 0;
    for (const sy of [-0.85, -0.55, -0.25, 0.05, 0.35]) for (const sx of [-0.85, -0.5, -0.17, 0.17, 0.5, 0.85]) {
      const d = [f[0] + rv[0] * sx * tx + v[0] * sy * ty, f[1] + rv[1] * sx * tx + v[1] * sy * ty, f[2] + rv[2] * sx * tx + v[2] * sy * ty], dl = Math.hypot(...d);
      const t = march(d.map((c) => c / dl), tHero + 2.6, stamp && sy < 0.2); n++;   // (nothing past him counts)
      if (t > 0 && t < tHero - 1.0) hit++;
      else if (t > 0 && t < tHero + 2.5) hit += 0.5;
    }
    let body = 0;
    for (const yy of [0.5, 1.2, 1.8]) { const d = [hx - cx0, hy + yy - cy0, hz - cz0], dl = Math.hypot(...d); if (march(d.map((c) => c / dl), dl - 0.6, false) > 0) body++; }
    return { fg: hit / n, body: body / 3, cam: { x: cx0, z: cz0 } };
  };

  // ---- the landing: the shuttle at one side of the main area, Twinsen a few metres toward the landmark, facing it
  // (the play camera sits behind him, so the shuttle stays behind the camera and the first view is the island)
  const T = S.target || { x: A.mid.x, z: A.mid.z, word: '' };
  // how much of the shuttle the play camera shows at the arrival (src/engine/camera.js, the LBA view: 15.7 m from a
  // point 3.3 m ahead of him, 26.4 degrees down, 43.6 degrees high, 16:9): of 18 points on its hull, those in frame
  const shuttleSeen = (hx, hy, hz, fx2, fz2, px, py, pz) => {
    const pitch = (300 / 4096) * Math.PI * 2, dist = 11800 / 750, ah = 2500 / 750, cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cx0 = hx + fx2 * ah - fx2 * cp * dist, cz0 = hz + fz2 * ah - fz2 * cp * dist, cy0 = hy + 1 + sp * dist;
    const ty = Math.tan((43.6 / 2) * Math.PI / 180), tx = ty * 16 / 9;
    let n = 0;
    for (const yy of [1.0, 2.2, 3.4]) for (let q = 0; q < 6; q++) {
      const a = (q / 6) * Math.PI * 2, r = yy > 3 ? 1.4 : 3.3, X = px + Math.sin(a) * r - cx0, Z = pz + Math.cos(a) * r - cz0, Y = py + yy - cy0;
      const zf = X * fx2 + Z * fz2, xr = X * fz2 - Z * fx2, depth = zf * cp - Y * sp, vy = zf * sp + Y * cp;
      if (depth > 0.3 && Math.abs(xr / (depth * tx)) < 1 && Math.abs(vy / (depth * ty)) < 1) n++;
    }
    return n;
  };
  // (only landings from which the target can be walked to)
  const tReach = new Uint8Array(N);
  {
    // (from the nearest walkable cell that isn't a pocket between objects)
    const cand = [];
    for (let j = cj(T.z - 8); j <= cj(T.z + 8); j++) for (let i = ci(T.x - 8); i <= ci(T.x + 8); i++) if (inF(i, j) && walk[j * fx + i]) cand.push([Math.hypot(wx(i) - T.x, wz(j) - T.z), j * fx + i]);
    cand.sort((a, b) => a[0] - b[0]);
    let ok = false;
    for (const [, tk] of cand) {
      if (tReach[tk]) continue;
      tReach.fill(0);
      const q = [tk]; tReach[tk] = 1;
      for (let h = 0; h < q.length; h++) { const k = q[h], i = k % fx; for (const m of [i > 0 ? k - 1 : -1, i < fx - 1 ? k + 1 : -1, k - fx, k + fx]) if (m >= 0 && m < N && walk[m] && !tReach[m]) { tReach[m] = 1; q.push(m); } }
      if (q.length > 400) { ok = true; break; }
    }
    if (!ok) tReach.fill(1);
  }
  let best = null; const why = [0, 0, 0, 0, 0, 0, 0, 0], cands = [];
  for (let z = Z0 + 5; z < -Z0 - 5; z += 1) for (let x = X0 + 5; x < -X0 - 5; x += 1) {
    const k = K(x, z); if (k < 0 || !walk[k] || (S.padIn && !S.padIn(x, z))) continue;
    if (dSol[k] < (S.padClear ?? 3.9) || dStp[k] < (S.padSlope ?? 2.6)) { why[0]++; continue; }
    if (DEBUG_PLAN) DEBUG_PLAN.push([x, z]);
    const dT = Math.hypot(T.x - x, T.z - z); if (dT < (S.near ?? 12)) { why[1]++; continue; }
    if (!disc(x, z, S.padR ?? 3.7, (q) => area[q] === main && !sol[q])) { why[2]++; continue; }
    const fl = range(x, z, 3); if (fl > 1.0) { why[3]++; continue; }
    const hp = hAt(x, z);
    for (const D of S.D || [8.5, 9.5, 7.5, 6.5]) for (const beta of [0, 0.4, -0.4, 0.65, -0.65, 0.9, -0.9, 1.2, -1.2]) {
      // he stands D from the shuttle, off its line to the landmark by beta, facing the landmark
      const ba = Math.atan2(T.x - x, T.z - z) + beta, sx = x + Math.sin(ba) * D, sz = z + Math.cos(ba) * D;
      const dS = Math.hypot(T.x - sx, T.z - sz); if (dS < (S.ahead ?? 4.5)) { why[7]++; continue; }
      const ux = (T.x - sx) / dS, uz = (T.z - sz) / dS;
      const sk = K(sx, sz); if (sk < 0 || !disc(sx, sz, 1.2, (q) => walk[q] === 1) || !tReach[sk]) { why[4]++; continue; }
      const hs = hAt(sx, sz); if (Math.abs(hs - hp) > 1.6) { why[5]++; continue; }
      if (!line(x + Math.sin(ba) * 4.0, z + Math.cos(ba) * 4.0, sx, sz, (q) => walk[q] === 1)) { why[6]++; continue; }
      const ak = K(sx + ux * 4, sz + uz * 4), ahead = ak >= 0 && area[ak] === main ? 4 : 0;
      const seen = shuttleSeen(sx, hs, sz, ux, uz, x, hp, z);
      const score = Math.min(dT, S.far ?? 34) + ahead - fl * 3 - Math.abs(hs - hp) * 0.6 + Math.min(dSol[k], 7) * 0.3 - seen * 4 - Math.abs(beta) * 2;
      cands.push({ score, x, z, sx, sz, a: Math.atan2(ux, uz), seen });
    }
  }
  // (and nothing big between the camera and him: the original's objects here, the dressing kept out below; the
  // camera's view is cast for the best few dozen only)
  cands.sort((a, b) => b.score - a.score);
  for (const c of cands.slice(0, 48)) {
    const V = view(c.sx, c.sz, Math.sin(c.a), Math.cos(c.a)); c.fg = V.fg; c.score -= Math.max(0, V.fg - 0.08) * 14 + V.body * 8;   // (a little clutter is a town's: only more counts)
    if (!best || c.score > best.score) best = c;
  }
  const pad = best ? { x: best.x, z: best.z, toward: best.a } : { x: A.pad.x, z: A.pad.z, toward: A.pad.toward };
  { let s = 0, n = 0; for (let a = -1.7; a <= 1.7; a += 1.7) for (let b = -1.7; b <= 1.7; b += 1.7) { const h = hAt(pad.x + a, pad.z + b); if (h != null) { s += h; n++; } } pad.y = n ? s / n : A.pad.y; }
  const spawn = best ? { x: best.sx, z: best.sz, a: best.a } : null;   // (none: beside the pad, as before)
  // the shuttle and the walk from it are kept clear; the shuttle blocks
  const stamp = (x, z, r, arr, v = 1) => disc(x, z, r, (k) => { arr[k] = v; return true; });
  stamp(pad.x, pad.z, 5.0, keep); stamp(pad.x, pad.z, 3.6, walk, 0);
  for (const f of A.floors || []) if (f.stair) rect((f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2, (f.x1 - f.x0) / 2 + 0.8, (f.z1 - f.z0) / 2 + 0.8, (k) => { keep[k] = 1; });   // (stairs stay clear)
  if (spawn) { stamp(spawn.x, spawn.z, 2.0, keep); line(pad.x, pad.z, spawn.x, spawn.z, (k) => { keep[k] = 1; return true; }); view(spawn.x, spawn.z, Math.sin(spawn.a), Math.cos(spawn.a), { stamp: true }); }
  // (DOOR-SWEEP: the way in to every house door stays clear of our dressing, 2.2 m out and 0.7 m either side of the
  //  door's middle: a lamp, a crate and the Building Company's board had stood across some, and a door led in only to
  //  a player who found the gap. The original's own objects are not moved)
  for (const o of A.decor) {
    if (o.shape !== 'house' || o.noDoor || !o.face) continue;
    const t = o.face, ex = Math.max(0.2, o.sx), ez = Math.max(0.2, o.sz), dx = o.x + t[0] * (ex / 2), dz = o.z + t[1] * (ez / 2);
    rect(dx + t[0] * 1.1, dz + t[1] * 1.1, t[0] ? 1.1 : 0.7, t[1] ? 1.1 : 0.7, (k) => { keep[k] = 1; });
  }
  const start = spawn ? K(spawn.x, spawn.z) : K(pad.x + Math.sin(pad.toward) * 4.8, pad.z + Math.cos(pad.toward) * 4.8);

  // ---- reach: what he can walk to from the landing (the plan never cuts any of it off)
  const reach = new Uint8Array(N), par = new Int32Array(N);
  const bfs = () => {
    reach.fill(0); if (start < 0 || !walk[start]) return 0;
    const q = [start]; reach[start] = 1; par[start] = -1;
    for (let h = 0; h < q.length; h++) {
      const k = q[h], i = k % fx;
      for (const m of [i > 0 ? k - 1 : -1, i < fx - 1 ? k + 1 : -1, k - fx, k + fx]) if (m >= 0 && m < N && walk[m] && !reach[m]) { reach[m] = 1; par[m] = k; q.push(m); }
    }
    return q.length;
  };
  let reachN = bfs();
  // the walkable cells in a band round a piece: one connected strip (or none) means nothing is cut off by it
  const bandSplit = (x, z, R0) => {
    const r0 = R0 + 0.45, r1 = R0 + 1.3, cells = new Set();
    for (let j = cj(z - r1); j <= cj(z + r1); j++) for (let i = ci(x - r1); i <= ci(x + r1); i++) {
      if (!inF(i, j)) continue; const d = Math.hypot(wx(i) - x, wz(j) - z), k = j * fx + i;
      if (d > r0 && d <= r1 && walk[k]) cells.add(k);
    }
    if (!cells.size) return false;
    const seen = new Set(), q = [cells.values().next().value]; seen.add(q[0]);
    for (let h = 0; h < q.length; h++) { const k = q[h]; for (const m of [k - 1, k + 1, k - fx, k + fx]) if (cells.has(m) && !seen.has(m)) { seen.add(m); q.push(m); } }
    return seen.size < cells.size;
  };
  const items = [], pois = [], rej = [0, 0, 0, 0, 0, 0, 0, 0];
  const fit = (kind, x, z, ry, o) => {
    const f = FOOT[kind](o), c = Math.cos(ry), s = Math.sin(ry), R0 = f.r ?? Math.hypot(f.hw, f.hd);
    const inside = [], ring = [];
    for (let j = cj(z - R0 - 0.5); j <= cj(z + R0 + 0.5); j++) for (let i = ci(x - R0 - 0.5); i <= ci(x + R0 + 0.5); i++) {
      if (!inF(i, j)) return null;
      const dx = wx(i) - x, dz = wz(j) - z, k = j * fx + i;
      let a, b;
      if (f.r != null) { const d = Math.hypot(dx, dz); a = d <= f.r; b = d <= f.r + 0.45; }
      else { const lx = c * dx - s * dz, lz = s * dx + c * dz; a = Math.abs(lx) <= f.hw && Math.abs(lz) <= f.hd; b = Math.abs(lx) <= f.hw + 0.45 && Math.abs(lz) <= f.hd + 0.45; }
      if (a) inside.push(k); if (b) ring.push(k);
    }
    return { inside, ring, R0 };
  };
  // put a piece: on free, flat ground of the main area (o.any: any walkable area, for the ledges), off the routes
  const put = (kind, x, z, ry = 0, o = {}) => {
    const F = fit(kind, x, z, ry, o); if (!F || !F.inside.length) { rej[0]++; return null; }
    let lo = 1e9, hi = -1e9;
    const hg = pieceH(kind, o), big = hg >= 2.2 && !THIN_PIECES.has(kind);
    for (const k of F.inside) {
      if (occ[k]) { rej[1]++; return null; }
      if (keep[k] || (big && camKeep[k])) { rej[2]++; return null; }
      if (stp[k] || sol[k]) { rej[3]++; return null; }
      if (o.any ? area[k] < 0 : area[k] !== main) { rej[4]++; return null; }
      if (dStp[k] < (o.slopeGap ?? 0.9)) { rej[5]++; return null; }
      const h = hAt(wx(k % fx), wz(Math.floor(k / fx))); if (h == null) return null; lo = Math.min(lo, h); hi = Math.max(hi, h);
    }
    if (hi - lo > (o.flat ?? (F.R0 > 1.5 ? 0.5 : 0.35))) { rej[6]++; return null; }
    if (!o.any) {
      const was = F.ring.map((k) => walk[k]), lost = F.ring.reduce((n, k) => n + (reach[k] ? 1 : 0), 0);
      for (const k of F.ring) walk[k] = 0;
      if (bandSplit(x, z, F.R0)) {   // (only when the ground round it is broken up can it cut anything off)
        const n2 = bfs();
        if (n2 < reachN - lost - 2) { F.ring.forEach((k, i) => { walk[k] = was[i]; }); bfs(); rej[7]++; return null; }
        reachN = n2;
      } else { for (const k of F.ring) reach[k] = 0; reachN -= lost; }
    }
    const gap = o.gap ?? 0.45;
    for (const k of F.ring) occ[k] = 1;
    if (gap > 0.45) disc(x, z, F.R0 + gap, (k) => { occ[k] = 1; return true; });
    if (!THIN_PIECES.has(kind)) for (const k of F.inside) tall[k] = Math.max(tall[k], lo + hg);
    const it = { kind, x: +x.toFixed(2), z: +z.toFixed(2), ry: +ry.toFixed(3), o };
    items.push(it);
    return it;
  };
  // try round a point (a spiral of offsets) until a piece fits; ry may follow `face`
  const near = (kind, x, z, ry, o = {}, rad = 2) => {
    for (let d = 0; d <= rad + 1e-6; d += 0.5) {
      const n = d ? Math.max(6, Math.round(d * 6)) : 1;
      for (let q = 0; q < n; q++) { const a = (q / n) * Math.PI * 2 + d; const px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d; const it = put(kind, px, pz, o.face ? Math.atan2(o.face.x - px, o.face.z - pz) : ry, o); if (it) return it; }
    }
    return null;
  };
  const add = (kind, x, z, ry = 0, o = {}) => {
    const it = { kind, x, z, ry, o }; items.push(it);
    const f = FOOT[kind]?.(o), y = hAt(x, z);
    if (f && y != null && !THIN_PIECES.has(kind)) disc(x, z, f.r ?? Math.max(f.hw, f.hd), (k) => { tall[k] = Math.max(tall[k], y + pieceH(kind, o)); return true; });
    return it;
  };
  const lines = [];
  const lineItem = (a, ha, b, hb, o = {}) => lines.push({ kind: 'line', a: { x: a.x, z: a.z, h: ha }, b: { x: b.x, z: b.z, h: hb }, o });
  // (LINE-CLEAR: nothing stands up into a pennant line's path: no lamp's head or arm, no roof, no tree. Along the line,
  // a metre clear of its two posts, at its height under the sag (the pennants hang 0.45 m below the rope), the tallest
  // thing within 0.8 m either side must stay under it. The user saw a lamp's head inside one on Zeelich, 3.11.)
  // (the thin uprights are not in `tall` (the camera sees past them): lamps with their arms, poles, banners, posts, the
  //  original's and ours, each its top and a reach round it)
  const uprights = () => [
    ...items.filter((it) => THIN_PIECES.has(it.kind)).map((it) => ({ x: it.x, z: it.z, top: (hAt(it.x, it.z) ?? 0) + pieceH(it.kind, it.o), r: it.kind === 'lamp' || it.kind === 'cageLamp' ? 0.8 : 0.4 })),
    ...A.decor.filter((o) => ['lamp', 'pole', 'post', 'spire'].includes(o.shape)).map((o) => ({ x: o.x, z: o.z, top: o.y + o.sy, r: o.shape === 'lamp' ? 0.8 : 0.4 })),
  ];
  const clearUnder = (a, ha, b, hb, sag) => {
    const ya = (hAt(a.x, a.z) ?? 0) + ha, yb = (hAt(b.x, b.z) ?? 0) + hb, d = Math.hypot(b.x - a.x, b.z - a.z);
    const ux = (b.x - a.x) / d, uz = (b.z - a.z) / d, n = Math.ceil(d / 0.25);
    const ups = uprights().filter((u) => Math.hypot(u.x - a.x, u.z - a.z) > 0.3 && Math.hypot(u.x - b.x, u.z - b.z) > 0.3);
    for (let i = 0; i <= n; i++) {
      const t = i / n; if (t * d < 1.0 || (1 - t) * d < 1.0) continue;
      const y = ya + (yb - ya) * t - sag * 4 * t * (1 - t) - 0.45, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      for (const w of [-0.8, -0.4, 0, 0.4, 0.8]) { const k = K(x - uz * w, z + ux * w); if (k >= 0 && tall[k] > y) return false; }
      for (const u of ups) if (u.top > y && Math.hypot(u.x - x, u.z - z) < u.r) return false;
    }
    return true;
  };
  const pipe = (pts) => {
    const m = pts[Math.floor(pts.length / 2)]; items.push({ kind: 'pipe', pts, x: m.x, z: m.z, ry: 0, o: {} });
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; line(a.x, a.z, b.x, b.z, (k) => { tall[k] = Math.max(tall[k], (hAt(wx(k % fx), wz(Math.floor(k / fx))) ?? 0) + Math.max(a.h, b.h) + 0.2); return true; }); }
  };

  // ---- the landmark, then the routes to it (kept clear, painted as paths where the ground isn't paved)
  const api = { S, A, pad, spawn: spawn || { x: pad.x, z: pad.z }, put, near, add, line: lineItem, pipe, pois: [], r: rr, givers: [] };
  // the travel point: a departures board beside the shuttle, facing the way he walks from it (CONNECT)
  {
    const sp = spawn || { x: pad.x + Math.sin(pad.toward) * 6, z: pad.z + Math.cos(pad.toward) * 6 }, a0 = Math.atan2(sp.x - pad.x, sp.z - pad.z);
    for (const R0 of [6.2, 7.0, 5.6]) {
      for (const da of [0.9, -0.9, 1.35, -1.35, 0.5, -0.5, 1.9, -1.9]) {
        const a = a0 + da, x = pad.x + Math.sin(a) * R0, z = pad.z + Math.cos(a) * R0;
        const it = put('shuttleBoard', x, z, Math.atan2(sp.x - x, sp.z - z), {}); if (it) { api.board = it; break; }
      }
      if (api.board) break;
    }
  }
  // a giver (LBA2's zone giver: a hop there shakes out a bonus, once) by a piece, on reachable ground beside it
  api.giver = (kinds, x, z, n = 1) => {
    let bk = -1, bd = 1e9;
    for (let j = cj(z - 3); j <= cj(z + 3); j++) for (let i = ci(x - 3); i <= ci(x + 3); i++) { if (!inF(i, j)) continue; const k = j * fx + i; if (!reach[k]) continue; const dd = Math.hypot(wx(i) - x, wz(j) - z); if (dd > 0.9 && dd < bd && disc(wx(i), wz(j), 0.75, (q) => reach[q] === 1)) { bd = dd; bk = k; } }
    if (bk < 0) return null;
    const g = { kinds, n, x: wx(bk % fx), z: wz(Math.floor(bk / fx)), y: hAt(wx(bk % fx), wz(Math.floor(bk / fx))) };
    stamp(g.x, g.z, 1.1, keep);   // (open ground round it: he can stand there and hop)
    api.givers.push(g); return g;
  };
  const P0 = (S.landmark ? S.landmark(api) : [T]) || [T];
  api.pois.push(...P0); pois.push(...P0);
  reachN = bfs();
  const routes = [];
  const sp0 = spawn || { x: pad.x, z: pad.z };
  for (const p of pois) {
    // the reachable cell nearest the point, then back along the walk to the landing
    let bk = -1, bd = 1e9;
    for (let j = cj(p.z - 5); j <= cj(p.z + 5); j++) for (let i = ci(p.x - 5); i <= ci(p.x + 5); i++) { if (!inF(i, j)) continue; const k = j * fx + i; if (!reach[k]) continue; const d = Math.hypot(wx(i) - p.x, wz(j) - p.z); if (d < bd) { bd = d; bk = k; } }
    if (bk < 0) continue;
    // the landmark's view (the first point): where he stands to look at it, the play camera behind him clear of
    // big things in front (view() above); near the point, facing what it shows (its object, or on along the way
    // he came when he stands on the point itself)
    if (p === pois[0]) {
      const L = p.at || (S.grand && p.word === S.target?.word ? S.grand : null) || p, dir = (x, z) => {
        const d = Math.hypot(L.x - x, L.z - z); if (d > 2.5) return [(L.x - x) / d, (L.z - z) / d];
        const e = Math.hypot(L.x - sp0.x, L.z - sp0.z) || 1; return [(L.x - sp0.x) / e, (L.z - sp0.z) / e];
      };
      const score = (k) => { const x = wx(k % fx), z = wz(Math.floor(k / fx)), [ux, uz] = dir(x, z), V = view(x, z, ux, uz); return { s: -Math.hypot(x - p.x, z - p.z) * 0.3 - V.fg * 20 - V.body * 10, fg: V.fg, body: V.body }; };
      let best = { k: bk, ...score(bk) }; const near0 = bk, fg0 = best.fg;
      if (best.fg > 0.06 || best.body > 0) {
        for (let j = cj(p.z - 7); j <= cj(p.z + 7); j += 3) for (let i = ci(p.x - 7); i <= ci(p.x + 7); i += 3) {
          if (!inF(i, j)) continue; const k = j * fx + i; if (!reach[k] || Math.hypot(wx(i) - p.x, wz(j) - p.z) > 7 || dSol[k] < 0.9) continue;
          const c = score(k); if (c.s > best.s) best = { k, ...c };
        }
      }
      bk = best.k;
      const x = wx(bk % fx), z = wz(Math.floor(bk / fx)), [ux, uz] = dir(x, z);
      p.look = { x: x + ux * Math.max(3, Math.hypot(L.x - x, L.z - z)), z: z + uz * Math.max(3, Math.hypot(L.x - x, L.z - z)) };
      p.view = { fg: +best.fg.toFixed(2), body: +best.body.toFixed(2), moved: best.k !== near0, fg0: +fg0.toFixed(2) };
      view(x, z, ux, uz, { stamp: true });
    }
    p.reach = { x: wx(bk % fx), z: wz(Math.floor(bk / fx)) };
    const path = []; for (let k = bk, n = 0; k >= 0 && n < 4000; k = par[k], n++) path.push([wx(k % fx), wz(Math.floor(k / fx))]);
    path.reverse(); routes.push(path);
    for (const [x, z] of path) disc(x, z, 1.0, (k) => { keep[k] = 1; return true; });
  }
  api.routes = routes;
  // wall slots: reachable cells at lo..hi from the nearest object or edge, facing away from it (open space ahead)
  const depth = (kind, o = {}) => { const f = FOOT[kind](o); return f.r ?? f.hd; };
  const slots = ({ lo = 0.5, hi = 1.0, open = 0, around = null, any = false, wall = false, all = false }) => {
    const out = [];
    for (let j = 1; j < fz - 1; j++) for (let i = 1; i < fx - 1; i++) {
      const k = j * fx + i;
      if (any ? (area[k] < 0 || area[k] === main) : !(all ? walk[k] : reach[k])) continue;
      const dd = wall ? dOcc : dSol;
      if (keep[k] || occ[k] || dd[k] < lo || dd[k] > hi) continue;
      const x = wx(i), z = wz(j);
      if (around && Math.hypot(x - around.x, z - around.z) > around.r) continue;
      const gxv = dd[k + 1] - dd[k - 1], gzv = dd[k + fx] - dd[k - fx];
      const ry = Math.atan2(gxv, gzv);
      if (open) { const ok = K(x + Math.sin(ry) * 2.5, z + Math.cos(ry) * 2.5); if (ok < 0 || dSol[ok] < open) continue; }
      out.push({ x, z, ry, k });
    }
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rr() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
  };
  const spaced = (list, space) => (p) => list.every((q) => Math.hypot(q.x - p.x, q.z - p.z) >= space);
  // open: pieces in open ground (lo m clear of objects round them), spread `space` apart, facing `face` or away from walls
  api.open = (kind, n, { lo = 2, hi = 99, space = 4, around = null, face = null, opts = () => ({}) } = {}) => {
    const got = [];
    for (const s of slots({ lo, hi, around })) {
      if (got.length >= n) break;
      if (!spaced(got, space)(s)) continue;
      const ry = face ? Math.atan2(face.x - s.x, face.z - s.z) : s.ry;
      const it = put(kind, s.x, s.z, ry, opts(got.length)); if (it) got.push(it);
    }
    return got;
  };
  // the ledges (Mosquibee): pieces on the other walkable areas, flat ground only, seen from the main one
  api.ledges = (kinds, n, { space = 3.5, opts = {} } = {}) => {
    const got = [];
    for (const s of slots({ lo: 1.2, hi: 99, any: true })) {
      if (got.length >= n) break;
      if (!spaced(got, space)(s) || dStp[s.k] < 1.6) continue;
      const it = put(kinds[got.length % kinds.length], s.x, s.z, s.ry, { ...opts, any: true, slopeGap: 1.6 }); if (it) got.push(it);
    }
    return got;
  };
  // street furniture: door props, benches against walls, clutter, lamps (or caged lamps) and banners along the routes
  api.street = ({ benches = 3, clutter = 6, kinds = ['crates'], lamps = 12, cage = 0, doors = 0.8, banners = 0, lines: withLines = false, lanterns = false, fillSpacing = 10 } = {}) => {
    const kopt = (kind, i) => kind === 'crates' ? { kind: S.crates || 'wood', n: 2 + (i % 3), seed: i + 11 } : kind === 'planter' ? { kind: i % 3 } : kind === 'bottles' ? { n: 3 } : {};
    // doors: a planter one side, something of the household's the other
    const houses = A.decor.filter((o) => o.shape === 'house');
    let di = 0;
    for (const o of houses) {
      if (rr() > doors) continue;
      const ex = Math.max(0.2, o.sx), ez = Math.max(0.2, o.sz);
      const t = o.face || (Math.abs(A.mid.x - o.x) > Math.abs(A.mid.z - o.z) ? [Math.sign(A.mid.x - o.x), 0] : [0, Math.sign(A.mid.z - o.z)]);
      const dx = o.x + t[0] * (ex / 2), dz = o.z + t[1] * (ez / 2), fk = K(dx + t[0] * 1.0, dz + t[1] * 1.0);
      if (fk < 0 || !reach[fk]) continue;
      rect(dx + t[0] * 1.0, dz + t[1] * 1.0, t[0] ? 1.0 : 0.8, t[1] ? 1.0 : 0.8, (k) => { keep[k] = 1; });
      const lat = [t[1], t[0]], ry = Math.atan2(t[0], t[1]);
      put('planter', dx + t[0] * 0.95 + lat[0] * 1.6, dz + t[1] * 0.95 + lat[1] * 1.6, ry, { kind: di % 3 });
      const k2 = kinds[di % kinds.length];
      put(k2, dx + t[0] * 1.0 - lat[0] * 1.7, dz + t[1] * 1.0 - lat[1] * 1.7, ry, kopt(k2, di));
      di++;
    }
    // benches against walls with open ground in front, a bin beside some
    const bs = [];
    for (const s of slots({ lo: 0.45, hi: 0.75, open: 2.5, wall: true })) {
      if (bs.length >= benches) break;
      if (!spaced(bs, 9)(s)) continue;
      const it = put('bench', s.x, s.z, s.ry); if (!it) continue;
      bs.push(it);
      if (bs.length % 2) put('bin', s.x + Math.cos(s.ry) * 1.55, s.z - Math.sin(s.ry) * 1.55, s.ry);
    }
    // clutter by walls
    const cs = [];
    for (let tries = 0; tries < kinds.length && cs.length < clutter; tries++) {
      const kind = kinds[(cs.length + 1) % kinds.length], dp = depth(kind, kopt(kind, 0));
      for (const s of slots({ lo: dp + 0.05, hi: dp + 0.5, wall: true })) {
        if (cs.length >= clutter) break;
        const kd = kinds[(cs.length + 1) % kinds.length]; if (kd !== kind) break;
        if (!spaced(cs, 5)(s)) continue;
        const it = put(kind, s.x, s.z, s.ry, kopt(kind, cs.length)); if (it) cs.push(it);
      }
    }
    // lamps (or caged work lamps) and banners along the routes, alternating sides
    const along = (step, kind, o, lat = 1.9) => {
      const got = [];
      for (const path of routes) {
        let acc = step * 0.5;
        for (let i = 1; i < path.length; i++) {
          acc += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
          if (acc < step) continue;
          const [x, z] = path[i], [px, pz] = path[Math.max(0, i - 3)], dl = Math.hypot(x - px, z - pz) || 1, nxv = -(z - pz) / dl, nzv = (x - px) / dl;
          const side = got.length % 2 ? 1 : -1;
          for (const sd of [side, -side]) {
            const qx = x + nxv * lat * sd, qz = z + nzv * lat * sd;
            if (!spaced(got, step * 0.6)({ x: qx, z: qz })) continue;
            const it = put(kind, qx, qz, Math.atan2(-nxv * sd, -nzv * sd), o); if (it) { got.push(it); acc = 0; break; }
          }
        }
      }
      return got;
    };
    const ls = lamps ? along(lamps, 'lamp', {}) : [];
    if (cage) along(cage, 'cageLamp', {}, 1.8);
    const bn = banners ? along(banners, 'banner', { colors: S.lines ? [S.lines[0], S.lines[1], S.lines[2] || '#f4eee0'] : undefined }, 2.3) : [];
    // no empty stretches: wherever the main area is still bare, a little group by a wall
    const fill = (spacing) => {
      let i = 0;
      for (const s of slots({ lo: 1.0, hi: 1.6, wall: true, all: true })) {
        if (!items.every((q) => Math.hypot(q.x - s.x, q.z - s.z) >= spacing)) continue;
        const kind = kinds[i % kinds.length], it = put(kind, s.x, s.z, s.ry, kopt(kind, i + 40)) || put('planter', s.x, s.z, s.ry, kopt('planter', i)); if (!it) continue;
        i++;
        const lx = Math.cos(s.ry), lz = -Math.sin(s.ry), k2 = i % 2 ? 'planter' : 'bin';
        put(k2, s.x + lx * 1.7, s.z + lz * 1.7, s.ry, kopt(k2, i));
      }
      // (and bare open ground: a planter, a bench or a lamp where nothing stands for a while)
      for (const s of slots({ lo: 2.0, hi: 99, all: true })) {
        if (!items.every((q) => Math.hypot(q.x - s.x, q.z - s.z) >= spacing * 1.2)) continue;
        const kind = ['planter', 'lamp', 'bench', kinds[i % kinds.length]][i % 4];
        if (put(kind, s.x, s.z, s.ry, kopt(kind, i + 60))) i++;
      }
    };
    fill(fillSpacing);
    // pennant lines (or lantern strings) between neighbouring lamps and banners along a route
    if (withLines && S.lines) {
      const posts = [...ls.map((p) => ({ ...p, h: 3.3, arm: true })), ...bn.map((p) => ({ ...p, h: 4.8 }))];
      // (LINE-CLEAR: the rope is tied to a lamp's pole under its arm; leaving on the arm's side it ran through the lamp's
      //  head (the user's picture, 3.11): only on the other side. The arm reaches along the lamp's local +x)
      const offArm = (p, q) => !p.arm || (Math.cos(p.ry) * (q.x - p.x) - Math.sin(p.ry) * (q.z - p.z)) / Math.hypot(q.x - p.x, q.z - p.z) < 0.35;
      const used = new Set();
      for (const a of posts) for (const b of posts) {
        if (a === b || used.has(a) || used.has(b)) continue;
        const d = Math.hypot(a.x - b.x, a.z - b.z); if (d < 4 || d > 11) continue;
        const sag = 0.35 + d * 0.03;
        if (!offArm(a, b) || !offArm(b, a) || !clearUnder(a, a.h, b, b.h, sag)) continue;
        lineItem(a, a.h, b, b.h, { kind: lanterns && lines.length % 2 ? 'lanterns' : 'pennants', sag }); used.add(a); used.add(b);
      }
    }
  };
  // sign posts: by the landing (to the landmarks and the shuttle), by the first landmark (back to the shuttle)
  api.signs = (extra = []) => {
    const words = [...pois, ...extra].filter((p) => p.word);
    const boards = (from) => {
      const b = [{ text: 'SHUTTLE', tx: pad.x, tz: pad.z }];
      for (const p of words) if (Math.hypot(p.x - from.x, p.z - from.z) > 5 && b.length < 3) b.push({ text: p.word, tx: p.x, tz: p.z });
      return b.reverse();
    };
    if (spawn) {
      const lx = Math.cos(spawn.a), lz = -Math.sin(spawn.a);   // (to his right)
      for (const sd of [1, -1]) { const it = near('signpost', spawn.x + lx * 2.6 * sd + Math.sin(spawn.a) * 1.0, spawn.z + lz * 2.6 * sd + Math.cos(spawn.a) * 1.0, 0, { boards: null }, 1.0); if (it) { it.o = { boards: boards(it) }; break; } }
    }
    const p = pois[0]?.reach;
    if (p) { const it = near('signpost', p.x + 2.2, p.z + 1.0, 0, { boards: null }, 1.6); if (it) it.o = { boards: boards(it) }; }
  };
  if (S.dress) S.dress(api);
  const dbg = DEBUG_PLAN && { cands: DEBUG_PLAN, fx, fz, X0, Z0, dSol: Array.from(dSol, (v) => +v.toFixed(1)), dStp: Array.from(dStp, (v) => +v.toFixed(1)), walk: Array.from(walk), occ: Array.from(occ), area: Array.from(area), stp: Array.from(stp), sol: Array.from(sol), reach: Array.from(reach), tReach: Array.from(tReach) }; DEBUG_PLAN = null;
  return { pad, spawn, items, lines, pois, routes, reachN, why, rej, dbg, seen: best?.seen ?? -1, arrivalView: best ? { fg: +best.fg.toFixed(2) } : null,  givers: api.givers, board: api.board || null };
}

// ================================================================== ground colours (Zeelich's palette)
const C = (c) => new THREE.Color(c);
const COL0 = { turf: C('#f4ecb8'), turf2: C('#e4e8a8'), rock: C('#d8b4c4'), rockHi: C('#ecd0d4'), dust: C('#e8d4c0'), rim: C('#c8a0b8'), path: C('#f0d8c0'), pave: C('#fff0e8') };
// WA-11 (proto): each island's own ground, as in LBA2 (the originals' grey share 39–74 %, their grass 0–11 %): broad
// patches of bare rock and of paving across the flat land, in the island's own stone colour. rock / pave: the share of
// the flat land; t: the noise level above which a patch lies, for that share (the patch noise is ~N(0, 0.3)).
const BARE_T = (s) => 0.3 * Math.SQRT2 * erfinv(1 - 2 * s);
function erfinv(y) { const a = 0.147, l = Math.log(1 - y * y), b = 2 / (Math.PI * a) + l / 2; return Math.sign(y) * Math.sqrt(Math.sqrt(b * b - l / a) - b); }
const BARE = {
  otringal: { rock: 0.15, pave: 0.5, stone: '#c4bccc' },     // pale lavender-grey paving and stone
  knartas: { rock: 0.45, pave: 0.1, stone: '#b4b0ac' },      // grey rock, a tiled terrace
  mosquibee: { rock: 0.4, pave: 0, stone: '#b8b0a4' },
  celebration: { rock: 0.65, pave: 0.05, stone: '#8c8490' }, // dark rock (and lava)
  undergas: { rock: 0.65, pave: 0.05, stone: '#7c7880' },
  platform: { rock: 0.4, pave: 0.35, stone: '#8c8c90' },     // dark rock and paving
  liftdock: { rock: 0.5, pave: 0.1, stone: '#a0a0a4' },
};

// ================================================================== one island
// (OTR-VARIETY: S.cellBatch, the island's pieces merged per square of that size (drawbatch.js's CELL, on the world's
// grid) instead of island-wide. A material that only a few buildings far apart use was one piece across the whole
// island, under drawbatch.js's 3000-triangle cut: its cell's batch had the island's bounds and was drawn from
// everywhere. Same interface as kit.js Batch for the builders: add, addM, build)
class CellBatch {
  constructor(parent, size, ox, oz) { this.parent = parent; this.size = size; this.ox = ox; this.oz = oz; this.cells = new Map(); }
  at(x, z) { const k = Math.floor((x + this.ox) / this.size) + ',' + Math.floor((z + this.oz) / this.size); let b = this.cells.get(k); if (!b) this.cells.set(k, (b = new Batch(this.parent))); return b; }
  add(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) { this.at(x, z).add(geo, mat, x, y, z, rx, ry, rz, sx, sy, sz); return this; }
  addM(geo, mat, m) { this.at(m.elements[12], m.elements[14]).addM(geo, mat, m); return this; }
  build() { const out = []; for (const b of this.cells.values()) out.push(...b.build()); return out; }
}
// (ZEELICH-2: an island in LBA2's Esmer look is built with props-esmer.js's look on, and off after)
function buildIsland(scene, physics, name, L, at) {
  EP.setLook(!!STYLE[name]?.look);
  try { return buildIsland0(scene, physics, name, L, at); } finally { EP.setLook(null); }
}
function buildIsland0(scene, physics, name, L, at) {
  const ox = at.x, oz = at.z;
  const S = STYLE[name] || {}, CY = cloudYOf(S);   // (SKY-9: this island's cloud sea)
  if (S.layout) L = S.layout(L);   // (Celebration: its later state's figure)
  if (S.decks) L = deckLayout(L, S);   // (the Lift Dock: its decks are its ground)
  const A = analyse(L, S), { w, d, cx, cz, gx, gz } = A, H = S.paveFlat ? paveFlat(A, L, S.paveFlat) : A.H;   // (OTRINGAL-37: the street's bumps cut down)
  const plan = planIsland(name, L, A), pad = plan.pad;
  const COL = { ...COL0, ...(S.ground ? { turf: C(S.ground[0]), turf2: C(S.ground[1]), dust: C(S.ground[2]) } : {}), ...(S.rock ? { rock: C(S.rock), rockHi: C(S.rockHi || S.rock), rim: C(S.rock).multiplyScalar(0.85) } : {}), ...(S.paveCol ? { pave: C(S.paveCol) } : {}) };
  // the routes (to the landmarks) and the paving, at the terrain's points: worn paths, paved squares
  const route = new Float32Array(L.nx * L.nz).fill(9);
  for (const path of plan.routes) for (let q = 0; q < path.length; q += 2) {
    const [px, pz] = path[q], i0 = Math.round(gx(px)), j0 = Math.round(gz(pz));
    for (let j = j0 - 2; j <= j0 + 2; j++) for (let i = i0 - 2; i <= i0 + 2; i++) { if (i < 0 || j < 0 || i >= L.nx || j >= L.nz) continue; const dd = Math.hypot(cx(i) - px, cz(j) - pz); if (dd < route[j * L.nx + i]) route[j * L.nx + i] = dd; }
  }
  const atData = (x, z) => { const i = Math.round(gx(x)), j = Math.round(gz(z)); return i < 0 || j < 0 || i >= L.nx || j >= L.nz ? -1 : j * L.nx + i; };
  const paved = (x, z) => { const k = atData(x, z); return k >= 0 && A.comp[k] === A.main && !!S.paveAt?.(x, z); };
  const group = new THREE.Group(); group.name = 'isle_' + name; group.visible = false; group.position.set(ox, 0, oz); scene.add(group);
  const col = (c) => physics.add({ ...c, x: c.x + ox, z: c.z + oz });
  const updaters = [];
  const r = rng(name.length * 131 + L.nx);
  const TX = textures();

  // --- ground: the data grid's own points (the terrain's vertices sit on them); the pad levelled
  const cell = L.cell, segs = L.nx - 1 + MARGIN * 2, size = segs * cell;
  const raw = (x, z) => {
    const i = Math.round(gx(x)), j = Math.round(gz(z));
    if (i < 0 || j < 0 || i >= L.nx || j >= L.nz) return null;
    return H[j * L.nx + i];
  };
  // the sea next to land sits just under the waterline (a low shore runs gently into the clouds and stops there,
  // as at any beach); further out it drops away under the clouds
  const shore = new Uint8Array(L.nx * L.nz);
  for (let j = 0; j < L.nz; j++) for (let i = 0; i < L.nx; i++) {
    if (H[j * L.nx + i] != null) continue;
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const ii = i + a, jj = j + b; if (ii >= 0 && jj >= 0 && ii < L.nx && jj < L.nz && H[jj * L.nx + ii] != null) shore[j * L.nx + i] = 1; }
  }
  const heightFn = (x, z) => {
    if (S.decks) return SEA;   // (on decks: the ground is far under the clouds)
    const v = raw(x, z);
    if (v == null) { const i = Math.round(gx(x)), j = Math.round(gz(z)); return i >= 0 && j >= 0 && i < L.nx && j < L.nz && shore[j * L.nx + i] ? SHORE : SEA; }
    const pd = Math.hypot(x - pad.x, z - pad.z);
    return pd < 7 ? v + (pad.y - v) * smoothstep(7, 4.6, pd) : v;
  };
  const land = (x, z) => raw(x, z) != null;
  const colorFn = (x, z, h, slope, c) => {
    if (h < -0.5) { c.copy(COL.rim); return; }
    c.copy(COL.turf).lerp(COL.turf2, 0.5 + Math.sin(x * 0.31 + z * 0.17) * Math.sin(z * 0.23 - x * 0.11) * 0.5);
    if (slope > 0.7) c.lerp(COL.rock, smoothstep(0.7, 1.4, slope));
    if (h > 12) c.lerp(COL.rockHi, smoothstep(12, 26, h) * 0.5);
    if (h < 0.8) c.lerp(COL.dust, smoothstep(0.8, 0.1, h) * 0.6);
    const k = atData(x, z);
    if (k >= 0 && route[k] < 2.2 && !paved(x, z)) c.lerp(COL.path, smoothstep(2.2, 0.8, route[k]) * 0.5);
    if (slope < 0.7 && paved(x, z)) c.copy(COL.pave).lerp(COL.turf, 0.15);
    if (BG && h >= 0.8) { const [r, p] = bare(x, z); if (r + p > 0) c.lerp(BG.col, Math.min(1, r + p)); }   // WA-11 (proto)
  };
  // WA-11 (proto): [rock, pave] shares of the island's bare patches at x,z (none on the landing pad or the paved squares)
  const BG = BARE[name] && { ...BARE[name], col: C(BARE[name].stone), tr: BARE[name].rock ? BARE_T(BARE[name].rock) : 9, tp: BARE[name].pave ? BARE_T(BARE[name].pave / (1 - BARE[name].rock)) : 9 };
  const bare = (x, z) => {
    if (Math.hypot(x - pad.x, z - pad.z) < 7 || paved(x, z)) return [0, 0];
    const r = smoothstep(BG.tr - 0.03, BG.tr + 0.03, fbm(x * 0.07 + 5.3, z * 0.07 - 8.1, 3));
    const p = smoothstep(BG.tp - 0.03, BG.tp + 0.03, fbm(x * 0.06 - 2.7, z * 0.06 + 3.9, 3)) * (1 - r);
    return [r, p];
  };
  const splatFn = (x, z, h, slope, wt) => {
    wt[0] = 1; wt[1] = 0; wt[2] = 0; wt[3] = 0; wt[4] = 0;
    const rk = h < -0.5 ? 1 : smoothstep(0.65, 1.2, slope);
    wt[2] = rk; wt[0] = 1 - rk;
    if (h >= -0.5 && h < 0.8) { wt[1] = smoothstep(0.8, 0.2, h) * 0.8; }
    const pd = Math.hypot(x - pad.x, z - pad.z);
    if (pd < 5.5) { wt[4] = smoothstep(5.5, 4.2, pd) * 2; }
    if (rk < 0.5 && paved(x, z)) { wt[4] = 1.6; wt[0] *= 0.2; }
    else { const k = atData(x, z); if (k >= 0 && rk < 0.5 && route[k] < 1.9) wt[3] = Math.max(wt[3], smoothstep(1.9, 0.9, route[k]) * 1.2); }
    if (BG && h >= 0.8 && rk < 0.5) {   // WA-11 (proto)
      const [r, p] = bare(x, z);
      wt[2] = Math.max(wt[2], r * 1.2); wt[4] = Math.max(wt[4], p * 1.6 * smoothstep(0.45, 0.25, slope)); wt[0] *= 1 - Math.min(1, r + p); wt[3] *= 1 - Math.min(1, r + p);
    }
    if (S.turfRock) { wt[2] += wt[0]; wt[0] = 0; }   // (ZEELICH-2: no grass: the turf is the island's granite)
  };
  const terrain = new Terrain({ size, segs, squares: BATCH.on ? 25 : 0, heightFn, colorFn, splatFn, textures: { ...TX, rock: S.turfRock ? graniteTex() : TX.cliff, cobble: S.pave === 'cobble' ? TX.cobble : TX.concrete } });   // (ZEELICH-2: Otringal's pale granite)
  group.add(terrain.mesh);
  physics.terrain.addPatch(terrain, ox, oz);
  const tgy = (x, z) => terrain.heightAt(x, z);
  const gy = A.floorAt ? (x, z) => A.floorAt(x, z) ?? tgy(x, z) : tgy;
  // a high edge over the clouds: the ground between the last land and the sea is a cliff face, too steep to stand
  // on (he would slide to the waterline and be held there). Each grid square with land and sea corners whose land
  // is more than a step above the sea is closed by a low invisible block, so he stops at the brink.
  // (On decks the rails along their open edges do that: below.)
  let edges = 0;
  if (!S.decks) for (let j = 0; j < L.nz - 1; j++) for (let i = 0; i < L.nx - 1; i++) {
    const c = [H[j * L.nx + i], H[j * L.nx + i + 1], H[(j + 1) * L.nx + i], H[(j + 1) * L.nx + i + 1]];
    const landC = c.filter((v) => v != null);
    if (!landC.length || landC.length === 4) continue;
    const top = Math.max(...landC);
    if (top - SHORE <= MAX_SLOPE * cell * 0.75) continue;
    col({ type: 'box', x: cx(i) + cell / 2, z: cz(j) + cell / 2, hw: cell / 2, hd: cell / 2, top: top + 0.6, noStand: true, seeThrough: true });
    edges++;
  }

  const R = {
    id: 'isle_' + name, isle: name, outdoor: true, sky: true, group, lights: [], exits: [], searches: [], ballTargets: [], updaters,
    music: 'zeelich', cloudY: CY,
    // (ZSTYLE-2: an island without its own sky takes Zeelich's overcast pale grey, as the hub (zeelich.js, ZSTYLE-1); it
    // took the hub's old pink sky and fog)
    env: { fog: '#dcd9e0', sun: '#f4f0e8', hemiSky: '#e2e0e8', hemiGround: '#7e7a84', sunI: 2.15, hemiI: 1.35, fogRange: [80, 290], ...(S.env || {}) },
    grade: S.grade ?? null, gradeTint: S.gradeTint ?? null,   // (ZEELICH-1 item 6: an island's own palette, applied as it is entered: main.js setGrade)
    terrain, H: (x, z) => terrain.heightAt(x - ox, z - oz),
    land: (x, z) => land(x - ox, z - oz),
    size: [w, d], objects: A.decor.length, edges,
    // points of the main walkable area, 5 m apart and clear of objects (tests/zislands.mjs walks them)
    sample: [], walk: 0,
  };
  for (let k = 0; k < L.nx * L.nz; k++) if (A.comp[k] === A.main) R.walk += cell * cell;   // (m² of the main area)
  if (A.floors) {   // (on decks: points on every deck, a metre in from its edges)
    for (const f of A.floors) if (!f.stair) for (let x = f.x0 + 1.2; x <= f.x1 - 1.2; x += 2.5) for (let z = f.z0 + 1.2; z <= f.z1 - 1.2; z += 2.5) {
      if (A.decor.some((o) => o.solid && Math.abs(o.x - x) < o.sx / 2 + 0.7 && Math.abs(o.z - z) < o.sz / 2 + 0.7)) continue;   // (not in a wall or a crate)
      R.sample.push({ x: ox + x, z: oz + z });
    }
  } else for (let j = 0; j < L.nz; j += 3) for (let i = 0; i < L.nx; i += 3) { const k = j * L.nx + i; if (A.comp[k] === A.main && A.clear[k] >= 1.5) R.sample.push({ x: ox + cx(i), z: oz + cz(j) }); }
  R.env.fogColor = new THREE.Color(R.env.fog);

  // --- the objects, as our pieces
  const B = S.cellBatch ? new CellBatch(group, S.cellBatch, ox, oz) : new Batch(group);
  const walls = (S.walls || ['#fbf0f0', '#f1e2f6', '#f8e8d8', '#e6f0f4', '#f6dce6']).map((c) => tm('plasterWall', { color: c, rough: 0.95 }));
  // (each dome colour its own material: kit.tm keys a texture by name, which made all four the first one)
  const domes = (S.domes || [['#8a5ac0', '#e8c8ff'], ['#2f8a9a', '#a8e8ee'], ['#c84a7a', '#ffc8dc'], ['#d89a30', '#ffe6a8']]).map(([a, b]) => S.look ? EP.capM([a, b]) : EP.cm(domeTex(a, b), { rough: 0.4 }));   // (ZEELICH-2: caps in LBA2's look)
  const deckM = tm('deck', { color: '#e0d8e8', rough: 0.65, metal: 0.25 });
  const plankM = tm('planks', { color: '#d8b080' });
  const stoneM = tm('stone', { color: '#ecdce4' });
  const brass = brassM();
  const jarM = pm('#d87a5a', 0.6);
  const spireGeo = cached('isle-spire', () => lathe([[0.5, 0], [0.42, 0.1], [0.3, 0.5], [0.22, 0.85], [0.16, 0.97], [0.0, 1.0]], 10));
  const trees = [[], []], rocks = [[], [], []], bushes = [], plants = [];
  const pick = (o, list) => list[o.body % list.length];
  // a building's look on this island: its walls and dome from the island's palette, painted frames in the domes'
  // colours; a place of ours may give a building its role (zplaces.js BUILDINGS: a store's wide door, a sign)
  const trims = (S.domes || [['#2f8a9a']]).map(([a]) => a);
  const look = (o) => {
    const b = BUILDINGS[o.body] || {};
    return { wall: pick(o, walls), domeM: pick(o, domes), trim: trims[(o.body + 1) % trims.length], accent: S.accent || '#e8b84a', seed: o.body * 13 + Math.round(Math.abs(o.x * 7 + o.z * 3)), awning: [trims[0], '#f8eee4'], role: b.role, sign: b.sign, domed: b.domed };
  };
  // the Grand Hall (Otringal): a portico of four columns before its door, a tiled frieze, broad steps
  const grandHall = (o, wallH) => {
    const ex = o.sx, ez = o.sz, t = Math.abs(A.mid.x - o.x) > Math.abs(A.mid.z - o.z) ? [Math.sign(A.mid.x - o.x), 0] : [0, Math.sign(A.mid.z - o.z)];
    const ry = Math.atan2(t[0], t[1]), fw = t[0] ? ez : ex, front = (t[0] ? ex : ez) / 2;
    const P = new EP.Place(B, o.x + t[0] * front, o.y, o.z + t[1] * front, ry);
    const ch = wallH * 0.82, colG = cached('isle-column', () => lathe([[0.36, 0], [0.36, 0.12], [0.26, 0.2], [0.24, 0.5], [0.21, 0.92], [0.27, 0.96], [0.32, 1.0], [0, 1.0]], 12));
    for (let q = 0; q < 4; q++) { const lx = (q - 1.5) * (fw * 0.27); P.add(colG, stoneM, lx, 0.3, 1.9, 0, 0, 0, 1, ch - 0.3, 1); P.cyl(lx, 1.9, 0.32, ch, { seeThrough: false }); }
    P.add(bbox(fw * 0.95, 0.5, 2.5, 0.05, 1.8), stoneM, 0, ch + 0.25, 1.0);
    P.add(bbox(fw * 0.96, 0.26, 0.06, 0.01, 0.5), EP.EM.tiles(), 0, ch + 0.25, 2.27);
    P.add(bbox(fw * 0.98, 0.14, 2.7, 0.04, 1.6), stoneM, 0, ch + 0.57, 1.0);
    P.add(bbox(fw * 0.9, 0.15, 3.0, 0.03, 1.8), stoneM, 0, 0.075, 1.4);
    P.add(bbox(fw * 0.8, 0.15, 2.4, 0.03, 1.8), stoneM, 0, 0.225, 1.1);
    P.add(cached('isle-hallorb', () => new THREE.SphereGeometry(0.42, 16, 10)), pm('#ffe8a8', 0.3, { emissive: '#ffb040', emissiveIntensity: 0.8, metalness: 0.3 }), 0, ch + 1.1, 2.0);
    for (const c of P.cols) col(c);
    const [sx, sz] = P.pt(0, 1.4); col({ type: 'box', x: sx, z: sz, hw: t[0] ? 1.5 : fw * 0.45, hd: t[0] ? fw * 0.45 : 1.5, top: o.y + 0.15 });
  };
  const G = S.gate;
  // (WORLD-FIX: the original's walls, piers, decks, slabs and crates often meet or overlap at one height; drawn as
  // boxes their faces shared planes and z-fought. Each is lifted 0–16 mm by its own fixed amount, a wall also a hair
  // thinner, so no two share a plane; what they collide with is unchanged)
  const jy = (o) => (((o.body * 7 + Math.round(o.x * 13 + o.z * 17 + o.y * 29)) % 8 + 8) % 8) * 0.003;
  const landFrac = (o) => { let n = 0, t = 0; for (const a of [-0.4, 0, 0.4]) for (const b of [-0.4, 0, 0.4]) { t++; if (raw(o.x + a * o.sx, o.z + b * o.sz) != null) n++; } return n / t; };
  // (OTR-VARIETY: the ends of Otringal's yard-wall lengths; where one ends with no other meeting it, a gate pier)
  // KNARTAS-LEDGE (island-doors: Quill's office on Knartas stands on a ledge 2.5 m over the quay's middle arm; the ground
  // before its door ran level 1.5 m, then fell 1.48 in 1 to the arm, steeper than he walks: out of the door he slid down
  // it and could not walk back up). A flight of dressed steps from the ledge's brink down to where the lane levels out:
  // a landing from the sill to the brink, risers of at most 0.24 m on 0.26 m treads. Across the door's line (u, + to its
  // right as he comes out) from `lo` to `hi`, from `loTop` down to `topTo` m out (wider at the top, narrower where
  // something stands beside the lower steps). Each step's collider runs back under the higher ones to the brink (no seam
  // between them; the height under his feet decides, as on the decks' stairs)
  const doorStair = (P, door, y0, [tx, tz], { lo: u0 = -0.8, hi: u1 = 0.8, loTop = u0, topTo = 0 } = {}) => {
    const [sx, sz] = P.pt(door.x, door.z), lx = -tz, lz = tx, at = (v, u) => [sx + tx * v + lx * u, sz + tz * v + lz * u];
    const g0 = (v) => gy(...at(v, 0)), low = (v, ua, ub) => Math.min(gy(...at(v, ua)), gy(...at(v, (ua + ub) / 2)), gy(...at(v, ub)));
    let v0 = 0.3; while (v0 < 4 && g0(v0 + 0.1) > y0 - 0.06) v0 += 0.1;
    let v1 = v0; while (v1 < v0 + 6 && !(g0(v1) < y0 - 0.4 && Math.abs(g0(v1 + 0.4) - g0(v1)) < 0.06)) v1 += 0.1;
    const yt = y0 + 0.06, yf = g0(v1), n = Math.ceil((yt - yf) / 0.24), rise = (yt - yf) / n, run = 0.26;
    if (yt - yf < 0.5) return;
    // (the steps begin where the ground across their width has fallen under the first one's tread: the terrain at the brink
    // stood over it, a slope he could not walk up onto the landing)
    { const hiG = (v) => { let m = -Infinity; for (let u = Math.min(u0, loTop); u <= u1 + 1e-6; u += 0.2) m = Math.max(m, gy(...at(v, u))); return m; }; while (v0 < v1 && hiG(v0) > yt - rise - 0.03) v0 += 0.05; }
    // a piece from va to vb out, its collider from vc (under the higher ones) to vb
    const piece = (va, vb, vc, top, k) => {
      const ul = vb <= topTo + 1e-6 ? loTop : u0, ua = ul + (k % 2) * 0.006, w = u1 - (k % 2) * 0.006 - ua;   // (alternate sides 6 mm in: no shared planes)
      let gl = Infinity; for (let v = va; v <= vb + 1e-6; v += 0.13) gl = Math.min(gl, low(v, ua, ua + w));
      const bot = Math.min(gl, top) - 0.3, d = vb - va + 0.02, [mx, mz] = at((va + vb + 0.02) / 2, ua + w / 2);
      B.add(bbox(tx ? d : w, top - bot, tx ? w : d, 0.02, 1.8), stoneM, mx, (top + bot) / 2, mz);
      const [cx, cz] = at((vc + vb) / 2, (ul + u1) / 2), cl = vb - vc, cw = u1 - ul;
      col({ type: 'box', x: cx, z: cz, hw: (tx ? cl : cw) / 2, hd: (tx ? cw : cl) / 2, top, stair: true });
    };
    // the landing (6 cm over the ground's apron: never coplanar with it), then the steps
    piece(0.1, v0, 0.1, yt, 0);
    for (let i = 1; i < n; i++) piece(v0 + (i - 1) * run, v0 + i * run, v0 - 0.1, yt - i * rise, i);
  };
  const yardEnds = A.decor.filter((q) => q.shape === 'yardWall').flatMap((q) => { const al = q.sx >= q.sz, h2 = (al ? q.sx : q.sz) / 2; return [[q.x - (al ? h2 : 0), q.z - (al ? 0 : h2)], [q.x + (al ? h2 : 0), q.z + (al ? 0 : h2)]]; });
  for (const o of A.decor) {
    const y0 = o.y, top = o.y + o.sy, ex = Math.max(0.2, o.sx), ez = Math.max(0.2, o.sz);
    if (o.shape === 'skip' || S.open?.(o)) continue;   // (drawn by the style's own piece, or left out: a rail, a beam; S.open: a way through, ISLES-BAR)
    if (!o.solid && o.shape !== 'deck' && Math.hypot(o.x - pad.x, o.z - pad.z) < 4.2 + Math.max(o.sx, o.sz) / 2) continue;   // (under the shuttle's pad)
    // (a small thing standing on a steep slope gets no block: he would slide into it and be held there)
    const gi = Math.round(gx(o.x)), gj = Math.round(gz(o.z));
    let onSteep = false; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const ii = gi + a, jj = gj + b; if (ii >= 0 && jj >= 0 && ii < L.nx && jj < L.nz && A.steep[jj * L.nx + ii]) onSteep = true; }
    // (KNARTAS-GATE: a small thing resting on a roof, well over the ground, blocks only from its own foot up. Its block
    // reached down to the ground: the slab on Knartas's gatehouse roof filled the arch under it, and the harbour with
    // its shuttle pad was cut off from the diggers' village)
    const small = (c) => { if (!onSteep) col(c.bottom == null && y0 - gy(o.x, o.z) > 1.2 ? { ...c, bottom: y0 - 0.05 } : c); };
    const shape = o.shape === 'house' && o.sy > 3 && landFrac(o) < 0.35 ? 'hulk'
      : o.shape === 'house' && G && o.x - ex / 2 < G.x1 && o.x + ex / 2 > G.x0 && o.z - ez / 2 < G.z0 && o.z + ez / 2 > G.z1 ? 'gate' : o.shape;
    switch (shape) {
      case 'hulk': {   // a big object standing in the clouds by a quay: a moored barge
        const along = ez >= ex, P = new EP.Place(B, o.x, S.hulk ? S.hulk.y : CY + 0.4, o.z, along ? 0 : Math.PI / 2);
        EP.barge(P, { len: (along ? ez : ex) * 0.95, beam: (along ? ex : ez) * 0.8, h: S.hulk ? S.hulk.h : Math.min(4, o.sy * 0.5) });
        for (const c of P.cols) col(c);
        break;
      }
      case 'colossus': {   // Celebration's risen figure (ours: a robed, hooded stone figure), facing the landing
        const sp = plan.spawn || pad, P = new EP.Place(B, S.colossus.x, y0 - 0.4, S.colossus.z, Math.atan2(sp.x - S.colossus.x, sp.z - S.colossus.z));
        EP.colossus(P, { h: S.colossus.h, r: S.colossus.r });
        for (const c of P.cols) col(c);
        break;
      }
      case 'figure': break;   // (a part of the figure: blocks the plan, drawn by the colossus)
      case 'blossom': {   // a nectar tree (ours: the Nectar Orchard)
        if (o.cut) break;   // (TREES-1: the one in the press house, cutPlants)
        const P = new EP.Place(B, o.x, y0 - 0.05, o.z, 0); EP.blossomTree(P, { h: o.sy, seed: o.beta % 97 });
        col({ type: 'cyl', x: o.x, z: o.z, r: 0.28, top: y0 + o.sy * 0.6, noStand: true });
        break;
      }
      case 'staff': {   // the figure's staff: a brass pole with a glowing orb in a tiled collar
        const P = new EP.Place(B, o.x, y0, o.z, 0), hh = o.sy + 1.2;
        P.add(cyl(0.3, 0.38, hh, 10), brass, 0, hh / 2, 0);
        P.add(cached('isle-stafforb', () => new THREE.SphereGeometry(1.2, 16, 12)), pm('#bff0ff', 0.25, { emissive: '#3ab8ff', emissiveIntensity: 0.9 }), 0, hh + 0.9, 0);
        P.add(cached('isle-staffcollar', () => cyl(0.9, 0.5, 0.6, 12, 0.6)), EP.EM.tiles(), 0, hh, 0);
        col({ type: 'cyl', x: o.x, z: o.z, r: 0.5, top: y0 + hh + 2, noStand: true });
        break;
      }
      case 'pier': {   // a stone pier under a deck
        B.add(bbox(ex * 0.8, o.sy, ez * 0.8, 0.06, 1.8), stoneM, o.x, y0 + o.sy / 2 + jy(o), o.z);
        break;
      }
      case 'block': {   // a fallen block of the old wall
        const a = (o.beta / 4096) * Math.PI * 2;
        B.add(bbox(ex, o.sy, ez, 0.08, 1.8), stoneM, o.x, y0 + o.sy / 2 - 0.08 + jy(o), o.z, 0.06, a, 0.04);
        small({ type: 'box', x: o.x, z: o.z, hw: ex * 0.45, hd: ez * 0.45, rot: a, top: y0 + o.sy - 0.1, noStand: o.sy > 0.5 });
        break;
      }
      case 'gate': {   // a gatehouse: its two halves either side of the causeway, a lintel and a roof over the passage
        // (each half an Esmer building without a door; the passage a horseshoe arch through both faces under a
        // vault, the dome over the middle)
        const wallH = o.sy > 4.5 ? o.sy * 0.62 : o.sy, lk = look(o), m = lk.wall, pw = G.z1 - G.z0, zc = (G.z0 + G.z1) / 2;
        const roof = wallH + 0.22 - 0.46, hp = Math.min(3.1, roof - 0.7);
        for (const [z0, z1] of [[o.z - ez / 2, G.z0], [G.z1, o.z + ez / 2]]) {
          const dz = z1 - z0; if (dz < 0.4) continue;
          EP.esmerBuilding(new EP.Place(B, o.x, y0, (z0 + z1) / 2, 0), { ...lk, w: ex, d: dz, h: wallH + 0.22, wallH, door: false, domed: false, bury: o.bury, fit: { region: 'isle_' + name, name: `gatehouse half (${o.x.toFixed(1)}, ${((z0 + z1) / 2).toFixed(1)})`, ox, oz } });
          col({ type: 'box', x: o.x, z: (z0 + z1) / 2, hw: ex / 2 - 0.05, hd: dz / 2 - 0.02, top, noStand: true });
        }
        const arch = { x: 0, y: 0, w: +(pw - 0.2).toFixed(2), h: +hp.toFixed(2), horse: true };
        for (const s of [-1, 1]) {
          const P = new EP.Place(B, o.x + s * (ex / 2 - 0.44), y0, zc, s * Math.PI / 2);
          P.add(panelGeo(pw + 0.5, roof, 0.28, [arch]), m, 0, 0, 0);
          P.add(frameGeo(arch, 0.22, 0.1), EP.archTiles(), 0, 0, 0.26);
        }
        // (WORLD-FIX: the vault's top 2 cm under the halves' roofs and the slab over it 1.5 cm proud of them: all three
        // shared one plane and z-fought)
        B.add(bbox(ex - 0.6, roof - hp + 0.28, pw + 0.3, 0.04, 2.2), m, o.x, y0 + hp - 0.3 + (roof - hp + 0.28) / 2, zc);
        B.add(bbox(ex + 0.18, 0.18, pw + 0.5, 0.05, 1.8), stoneM, o.x, y0 + roof - 0.075, zc);
        if (o.sy > 4.5) EP.domeStack(new EP.Place(B, o.x, y0, o.z, 0), { base: roof, h: o.sy, R: Math.min(ex, ez) * 0.34, wallM: m, domeM: lk.domeM });
        break;
      }
      case 'yardWall': {   // (OTR-VARIETY: a length of Otringal's cargo-yard wall: plaster in the island's colour on a
        // stone footing down to the ground, a tiled band and a stone coping; a pier where it ends free (the yard's
        // gateways). Its collider is the original's box, as when it was drawn as a house)
        const al = ex >= ez, len = al ? ex : ez, th = al ? ez : ex, hh = o.sy;
        const ends = [[o.x - (al ? len / 2 : 0), o.z - (al ? 0 : len / 2)], [o.x + (al ? len / 2 : 0), o.z + (al ? 0 : len / 2)]];
        let g = y0; for (const [px, pz] of [...ends, [o.x, o.z]]) g = Math.min(g, Math.max(tgy(px, pz), CY - 1));
        const foot = y0 - g + 0.5, box = (l, h, t, rr = 0.04) => (al ? bbox(l, h, t, rr, 1.8) : bbox(t, h, l, rr, 1.8));
        B.add(box(len, foot, th + 0.1), stoneM, o.x, y0 + 0.5 - foot / 2 + jy(o), o.z);
        B.add(box(len - 0.03, hh - 0.66, th - 0.14, 0.02), pick(o, walls), o.x, y0 + 0.5 + (hh - 0.66) / 2 - 0.02, o.z);
        B.add(box(len - 0.4, 0.26, th - 0.06, 0.01), EP.archTiles(), o.x, y0 + hh - 0.48, o.z);
        B.add(box(len + 0.02, 0.18, th + 0.16), stoneM, o.x, y0 + hh - 0.09 + jy(o), o.z);
        for (const [px, pz] of ends) {
          if (yardEnds.filter(([qx, qz]) => Math.hypot(qx - px, qz - pz) < 0.4).length > 1) continue;
          const pw = th + 0.2, cx = px - (al ? Math.sign(px - o.x) * (pw / 2 - 0.05) : 0), cz = pz - (al ? 0 : Math.sign(pz - o.z) * (pw / 2 - 0.05)), y1 = y0 + 0.5 - foot, y2 = top + 0.4;
          B.add(bbox(pw, y2 - y1, pw, 0.05, 1.8), stoneM, cx, (y1 + y2) / 2, cz);
          B.add(cached('isle-yardknob', () => new THREE.SphereGeometry(0.26, 12, 8)), brass, cx, y2 + 0.2, cz);
        }
        col({ type: 'box', x: o.x, z: o.z, hw: ex / 2, hd: ez / 2, top, noStand: true });
        break;
      }
      case 'pole': {
        if (S.flowerTrees) { const P = new EP.Place(B, o.x, y0, o.z, (o.beta / 4096) * Math.PI * 2); EP.giantFlower(P, { h: o.sy, color: ['#f0c030', '#e8608a', '#f4eee0', '#c050d0'][o.body % 4], seed: o.body + 1 }); }
        else { const P = new EP.Place(B, o.x, y0, o.z, 0); EP.pole(P, { h: o.sy, flag: (S.lines || ['#e8608a'])[o.body % (S.lines || [1]).length] }); }
        small({ type: 'cyl', x: o.x, z: o.z, r: 0.18, top, noStand: true });
        break;
      }
      case 'post': { const P = new EP.Place(B, o.x, y0, o.z, 0); EP.post(P, { h: Math.min(1.6, o.sy) }); small({ type: 'cyl', x: o.x, z: o.z, r: 0.14, top: y0 + Math.min(1.6, o.sy), noStand: true }); break; }
      case 'house': {
        const wallH = o.sy > 4.5 ? o.sy * 0.62 : o.sy;
        if (S.grand && Math.hypot(o.x - S.grand.x, o.z - S.grand.z) < 1) grandHall(o, wallH);
        // an Esmer building (props-esmer.js) on the same footprint and height, its door where it was: on the side
        // facing the island's middle
        const toward = o.face || (Math.abs(A.mid.x - o.x) > Math.abs(A.mid.z - o.z) ? [Math.sign(A.mid.x - o.x), 0] : [0, Math.sign(A.mid.z - o.z)]);
        const P = new EP.Place(B, o.x, y0, o.z, Math.atan2(toward[0], toward[1]));
        // (sides banked into a rise behind them get no windows; world direction → the building's own sides)
        const sideOf = ([vx, vz]) => vx === toward[0] && vz === toward[1] ? 'front' : vx === -toward[0] && vz === -toward[1] ? 'back' : vx === toward[1] && vz === -toward[0] ? 'right' : 'left';
        const blind = (o.banked || []).map(sideOf);
        // (DOORS-1: no door where the ground before it falls away well past a step)
        // (as tests/worldfit.mjs measures it: 0.5–1 m out and 0.4 m either side, ground more than 0.1 under the floor)
        const half = (toward[0] ? ex : ez) / 2;
        const hangs = [0.5, 1.0].some((v) => [-0.4, 0, 0.4].some((u) => { const g = gy(o.x + toward[0] * (half + v) + toward[1] * u, o.z + toward[1] * (half + v) - toward[0] * u); return g != null && y0 - g > 0.1; }));
        const lk0 = look(o), hs0 = S.house?.(o, { walls, stone: stoneM }) || {};
        const built = EP.esmerBuilding(P, { w: toward[0] ? ez : ex, d: toward[0] ? ex : ez, h: o.sy, wallH, bury: o.bury, blind, ...(o.noDoor || hangs ? { door: false } : {}), ...lk0, ...hs0, fit: { region: 'isle_' + name, name: `house (${o.x.toFixed(1)}, ${o.z.toFixed(1)})`, ox, oz } });
        // (DOORS-1: a door that leads nowhere says so: "Locked." (the story's shut doors; a story door at the same
        // place is offered instead))
        // (ISLE-HOMES: what the building is, for its room (ihomes.js): its size, its role and sign; the door's own place)
        if (built.door) { const [dx, dz] = P.pt(built.door.x, built.door.z + 0.8), [sx, sz] = P.pt(built.door.x, built.door.z); (R.shutDoors ||= []).push({ id: `${name}-${o.x.toFixed(0)}-${o.z.toFixed(0)}`, x: ox + dx, y: y0, z: oz + dz, ry: P.ry, sill: { x: ox + sx, z: oz + sz }, w: +(toward[0] ? ez : ex).toFixed(2), d: +(toward[0] ? ex : ez).toFixed(2), h: +o.sy.toFixed(2), role: (hs0.role ?? lk0.role) || 'house', sign: (hs0.sign ?? lk0.sign) || null, domed: !!(lk0.domeM && (hs0.domed ?? lk0.domed) !== false && o.sy > 4.5) }); }
        // (KNARTAS-LEDGE: a door on a ledge over the lane below it gets a flight of steps down: S.doorStairs)
        { const ds = S.doorStairs?.[`${name}-${o.x.toFixed(0)}-${o.z.toFixed(0)}`]; if (built.door && ds) doorStair(P, built.door, y0, toward, ds); }
        col({ type: 'box', x: o.x, z: o.z, hw: ex / 2 - 0.05, hd: ez / 2 - 0.05, top, noStand: true });
        break;
      }
      case 'tower': {
        const rr = Math.min(ex, ez) * 0.48;
        const lk = look(o), H0 = o.sy * 0.78;
        B.add(cyl(rr * 0.85, rr, H0, 16, 2), lk.wall, o.x, y0 + H0 / 2, o.z);
        // a stone base, a corbelled cornice under the ribbed onion dome (props-esmer.js), brass bands
        const tb = Math.max(0.5, (o.bury ?? 0.2) + 0.3);   // (WORLD-FIX: the base down to the lowest ground round it)
        B.add(cyl(rr + 0.08, rr + 0.12, tb, 16, 1.8), stoneM, o.x, y0 + 0.3 - tb / 2, o.z);
        B.add(cached('isle-tcorn' + rr.toFixed(2), () => lathe([[rr * 0.85, 0], [rr * 0.85 + 0.18, 0.14], [rr * 0.85 + 0.22, 0.32], [0, 0.32]], 16, 1.8)), stoneM, o.x, y0 + H0 - 0.3, o.z);
        EP.domeStack(new EP.Place(B, o.x, y0, o.z, 0), { base: H0 + 0.02, h: o.sy, R: rr * 0.92, domeM: lk.domeM, drum: false });
        for (const f of [0.08, 0.5]) { const rf = rr - (rr * 0.15) * f; B.add(cached('isle-tband' + rf.toFixed(2), () => new THREE.TorusGeometry(rf + 0.03, 0.07, 4, 24).rotateX(Math.PI / 2)), brass, o.x, y0 + H0 * f, o.z); }
        // arched lattice windows in painted frames, an arched door toward the landing (a watchtower, not a drum)
        const sp = plan.spawn || pad, da = Math.atan2(sp.x - o.x, sp.z - o.z), tw = { x: 0, y: 0, w: 0.5, h: 1.1, horse: true };
        const tfr = cached('isle-tfr' + lk.trim, () => tint(frameGeo(tw, 0.1, 0.06), lk.trim));
        for (let q = 0; q < 6; q++) {
          const a = da + Math.PI / 6 + (q / 6) * Math.PI * 2, y = y0 + H0 * 0.66, rf = rr - rr * 0.15 * 0.66;
          B.add(fillGeo(tw, 0.02, 0), EP.windowM(), o.x + Math.sin(a) * (rf + 0.01), y, o.z + Math.cos(a) * (rf + 0.01), 0, a);
          B.add(tfr, EP.EM.vc(), o.x + Math.sin(a) * (rf - 0.01), y, o.z + Math.cos(a) * (rf - 0.01), 0, a);
        }
        const td = { x: 0, y: 0, w: 1.1, h: 2.15, horse: true };
        B.add(fillGeo(td, 0.03, 0.06), plankM, o.x + Math.sin(da) * (rr - 0.04), y0 + 0.3, o.z + Math.cos(da) * (rr - 0.04), 0, da);
        B.add(frameGeo(td, 0.18, 0.1), EP.archTiles(), o.x + Math.sin(da) * (rr - 0.02), y0 + 0.3, o.z + Math.cos(da) * (rr - 0.02), 0, da);
        col({ type: 'cyl', x: o.x, z: o.z, r: rr, top, noStand: true });
        fitAdd({ region: 'isle_' + name, name: `tower (${o.x.toFixed(1)}, ${o.z.toFixed(1)})`, round: true, x: o.x + ox, z: o.z + oz, ry: da, oy: y0, w: (rr + 0.12) * 2, d: (rr + 0.12) * 2, base: 0.3 - tb, plinth: 0.3, floor: 0.3, steps: 0.45 });
        break;
      }
      case 'wall': {
        B.add(bbox(ex - jy(o) * 0.5, o.sy, ez - jy(o) * 0.5, 0.04, 2.2), stoneM, o.x, y0 + o.sy / 2 + jy(o), o.z);
        col({ type: 'box', x: o.x, z: o.z, hw: ex / 2, hd: ez / 2, top, noStand: o.sy > 1.2 });
        break;
      }
      case 'deck': case 'slab': {
        const t = Math.max(0.12, o.sy);
        B.add(bbox(ex, t, ez, 0.04, 2), o.shape === 'deck' ? deckM : stoneM, o.x, top - t / 2 + jy(o), o.z);
        // posts down to the ground (or into the clouds) under a deck that stands clear of it
        const g = tgy(o.x, o.z);
        if (A.floorAt && o.shape === 'deck') {   // (the Lift Dock: timber stilts every few metres, down into the clouds)
          const nxp = Math.max(2, Math.round(ex / 4) + 1), nzp = Math.max(2, Math.round(ez / 4) + 1), hh = top - t - (CY - 2);
          for (let a = 0; a < nxp; a++) for (let b = 0; b < nzp; b++) B.add(cyl(0.2, 0.26, hh, 8), plankM, o.x - ex / 2 + 0.35 + (a / (nxp - 1)) * (ex - 0.7), CY - 2 + hh / 2, o.z - ez / 2 + 0.35 + (b / (nzp - 1)) * (ez - 0.7));
        } else if (top - g > 1.0) for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const px = o.x + sx * (ex / 2 - 0.3), pz = o.z + sz * (ez / 2 - 0.3), pg = Math.max(gy(px, pz), CY - 2);
          if (top - t - pg > 0.3) B.add(cyl(0.12, 0.14, top - t - pg, 8), brass, px, pg + (top - t - pg) / 2, pz);
        }
        // a walkable floor (held by its top) that one can pass under when it is high enough
        col({ type: 'box', x: o.x, z: o.z, hw: ex / 2, hd: ez / 2, top, bottom: top - t - 0.05 });
        break;
      }
      case 'spire': {
        const rr = Math.max(0.25, Math.min(ex, ez) * (S.spireK?.(o) ?? 0.45));
        B.add(spireGeo, pick(o, walls), o.x, y0, o.z, 0, 0, 0, rr * 2, o.sy, rr * 2);
        col({ type: 'cyl', x: o.x, z: o.z, r: rr * 0.8, top, noStand: true });
        break;
      }
      case 'lamp': {
        // (a style's lamp posts: the Esmer street lamp, its arm turned with the original's object)
        if ((S.lampPosts && o.sy >= 3) || o.lampPost) { EP.lamp(new EP.Place(B, o.x, y0, o.z, (o.beta / 4096) * Math.PI * 2)); col({ type: 'cyl', x: o.x, z: o.z, r: 0.2, top: y0 + 3.4, noStand: true }); break; }
        B.add(cyl(0.07, 0.09, o.sy - 0.4, 8), brass, o.x, y0 + (o.sy - 0.4) / 2, o.z);
        B.add(cached('isle-lamp', () => new THREE.SphereGeometry(0.22, 12, 8)), pm('#fff4d8', 0.3, { emissive: '#ffd890', emissiveIntensity: 1.2 }), o.x, top - 0.25, o.z);
        col({ type: 'cyl', x: o.x, z: o.z, r: 0.2, top, noStand: true });
        break;
      }
      case 'tree': trees[o.body % 2].push(o); if (!o.cut) col({ type: 'cyl', x: o.x, z: o.z, r: 0.3, top, noStand: true }); break;   // (o.cut: TREES-1, cutPlants)
      case 'rock': rocks[o.body % 3].push(o); small({ type: 'box', x: o.x, z: o.z, hw: ex * 0.4, hd: ez * 0.4, top: y0 + o.sy * 0.85, noStand: o.sy > 1.2 }); break;
      case 'crate': {
        B.add(bbox(ex * 0.9 - jy(o), o.sy, ez * 0.9 - jy(o), 0.04, 1), plankM, o.x, y0 + o.sy / 2 + jy(o), o.z);
        if (Math.max(ex, ez) >= 0.5) small({ type: 'box', x: o.x, z: o.z, hw: ex * 0.45, hd: ez * 0.45, top, noStand: o.sy > 1.2 });
        break;
      }
      case 'jar': {
        const rr = Math.min(ex, ez) * 0.45, jarG = cached('isle-jar', () => lathe([[0.0, 0], [0.7, 0.05], [1.0, 0.4], [0.85, 0.8], [0.45, 0.92], [0.5, 1.0], [0, 1.0]], 12));
        if (S.jarMax && o.sy > S.jarMax) {
          // (a style may cap the jars at a size a potter makes: Knartas' 2–2.5 m ones crowded its walkway) one
          // jar of that size at the original's place, a smaller one leaning beside it; the collider round the big one
          const hj = S.jarMax * (0.86 + 0.14 * ((o.body * 37) % 10) / 10), rj = Math.min(rr, hj * 0.4), a = (o.beta / 4096) * Math.PI * 2;
          B.add(jarG, jarM, o.x, y0, o.z, 0, a, 0, rj, hj, rj);
          if (rr > rj * 1.5) B.add(jarG, jarM, o.x + Math.sin(a) * rj * 1.45, y0, o.z + Math.cos(a) * rj * 1.45, 0.12, a, 0, rj * 0.62, hj * 0.6, rj * 0.62);
          small({ type: 'cyl', x: o.x, z: o.z, r: rj, top: y0 + hj, noStand: hj > 1.2 });
          break;
        }
        B.add(jarG, jarM, o.x, y0, o.z, 0, 0, 0, rr, o.sy, rr);
        if (Math.max(ex, ez) >= 0.5) small({ type: 'cyl', x: o.x, z: o.z, r: rr, top, noStand: o.sy > 1.2 });
        break;
      }
      case 'frond': {   // (ZEELICH-2: Otringal's street tree, props-esmer.js frondTree)
        if (o.cut) break;
        const P = new EP.Place(B, o.x, y0, o.z, (o.beta / 4096) * Math.PI * 2); EP.frondTree(P, { h: o.sy, s: Math.min(1.3, ex, ez), seed: o.body + Math.round(o.x) });
        for (const c of P.cols) small(c);
        break;
      }
      case 'goldplant': {   // (ZEELICH-2: Otringal's golden fan plant, props-esmer.js goldPlant)
        if (o.cut) break;
        const P = new EP.Place(B, o.x, y0, o.z, (o.beta / 4096) * Math.PI * 2); EP.goldPlant(P, { h: o.sy, w: Math.max(ex, ez), seed: Math.round(o.x * 3 + o.z) });
        for (const c of P.cols) small(c);
        break;
      }
      case 'canopy': {   // (ZEELICH-2: a stall of the plaza's covered market: two stone piers, a sloped stone canopy, a counter)
        const al = ez >= ex, len = al ? ez : ex, dep = al ? ex : ez, P = new EP.Place(B, o.x, y0, o.z, al ? Math.PI / 2 : 0), hh = o.sy;
        for (const u of [-len / 2 + 0.15, len / 2 - 0.15]) P.add(bbox(0.2, hh - 0.3, 0.2, 0.03, 1.8), stoneM, u, (hh - 0.3) / 2, -dep / 2 + 0.15);
        P.add(bbox(len, 0.16, dep + 0.3, 0.04, 1.8), stoneM, 0, hh - 0.3, 0.05, 0.32);
        P.add(bbox(len - 0.1, 0.12, 0.08, 0.02, 1), EP.archTiles(), 0, hh - 0.5, dep / 2 + 0.16);
        P.add(bbox(len - 0.3, 0.9, 0.5, 0.03, 1.8), stoneM, 0, 0.45, -dep / 2 + 0.4);
        col({ type: 'box', x: o.x, z: o.z, hw: ex / 2, hd: ez / 2, top: y0 + 0.9, noStand: true });
        break;
      }
      case 'poster': {   // (ZEELICH-2: a poster board on a stone stand, as the original's)
        const al = ex >= ez, P = new EP.Place(B, o.x, y0, o.z, al ? 0 : Math.PI / 2), wd = Math.max(ex, ez), hh = o.sy;
        P.add(bbox(0.3, hh * 0.45, 0.3, 0.04, 1.8), stoneM, 0, hh * 0.225, 0);
        P.add(bbox(wd, hh * 0.55, 0.12, 0.03, 1), EP.EM.dark(), 0, hh * 0.72, 0);
        P.add(cached('isle-poster', () => tint(bbox(1, 1, 0.02, 0.005, 1), '#3c6a4a')), EP.EM.vc(), 0, hh * 0.72, 0.07, 0, 0, 0, wd * 0.9, hh * 0.47, 1);
        P.add(bbox(wd + 0.1, 0.08, 0.16, 0.02, 1), brass, 0, hh * 0.995, 0);
        col({ type: 'box', x: o.x, z: o.z, hw: Math.max(0.15, ex / 2), hd: Math.max(0.15, ez / 2), top, noStand: true });
        break;
      }
      case 'planks': {   // (ZEELICH-2: planks stood on end against a wall)
        const al = ex >= ez, P = new EP.Place(B, o.x, y0, o.z, al ? 0 : Math.PI / 2), wd = Math.max(ex, ez);
        for (const u of [-0.22, 0.2]) P.add(bbox(Math.min(0.32, wd * 0.4), o.sy * (u < 0 ? 1 : 0.92), 0.06, 0.01, 1), plankM, u * wd, o.sy * (u < 0 ? 0.5 : 0.46), 0, 0.05);
        small({ type: 'box', x: o.x, z: o.z, hw: Math.max(0.12, ex / 2), hd: Math.max(0.12, ez / 2), top, noStand: true });
        break;
      }
      case 'drum': {   // (ZEELICH-2: the original's round capped house: an octagonal drum, a glass-block foot, a cap; within the old jar's collider)
        // (in its box's north-west, 2.7 m across: the house door at its south-east corner keeps its front clear)
        const lk = look(o), rr = Math.min(ex, ez) * 0.38, H0 = o.sy * 0.66, x = o.x - 0.35, z = o.z + 0.35;
        B.add(cyl(rr, rr, H0 + 0.4, 8, 2.2).rotateY(Math.PI / 8), lk.wall, x, y0 + H0 / 2 - 0.2, z);
        B.add(cyl(rr + 0.012, rr + 0.012, 0.6, 8, 1, true).rotateY(Math.PI / 8), EP.archTiles(), x, y0 + 0.3, z);
        B.add(cyl(rr + 0.12, rr + 0.12, 0.18, 8, 1.8).rotateY(Math.PI / 8), stoneM, x, y0 + H0, z);
        EP.domeStack(new EP.Place(B, x, y0, z, 0), { base: H0 + 0.09, h: o.sy, R: rr * 1.05, domeM: lk.domeM, drum: false });
        col({ type: 'cyl', x, z, r: rr, top, noStand: true });
        break;
      }
      case 'annex': {   // (ZEELICH-2: a building part the original keeps as an object: a small Esmer building without a door)
        const wallH = o.sy > 4.5 ? o.sy * 0.62 : o.sy;
        EP.esmerBuilding(new EP.Place(B, o.x, y0, o.z, 0), { ...look(o), w: ex, d: ez, h: o.sy, wallH, door: false, bury: 0.4, fit: { region: 'isle_' + name, name: `annex (${o.x.toFixed(1)}, ${o.z.toFixed(1)})`, ox, oz } });
        col({ type: 'box', x: o.x, z: o.z, hw: ex / 2 - 0.05, hd: ez / 2 - 0.05, top, noStand: true });
        break;
      }
      case 'fence': {
        if (S.fence === 'rail') {   // (ZEELICH-2: Otringal's railings, props-esmer.js railing; the same collider)
          const al = ex > ez, h = Math.min(o.sy, 1.3), P = new EP.Place(B, o.x + (al ? 0 : jy(o)), y0, o.z + (al ? jy(o) : 0), al ? 0 : Math.PI / 2);
          EP.railing(P, { len: al ? ex : ez, h, hazard: o.body === 50 });
          small({ type: 'box', x: o.x, z: o.z, hw: Math.max(0.12, ex / 2), hd: Math.max(0.12, ez / 2), top: y0 + h, noStand: true });
          break;
        }
        // posts and two rails along its length
        const along = ex > ez, len = along ? ex : ez, n = Math.max(2, Math.round(len / 1.2) + 1), h = Math.min(o.sy, 1.3);
        for (let q = 0; q < n; q++) { const u = -len / 2 + (q / (n - 1)) * len; B.add(cyl(0.06, 0.07, h, 6), plankM, o.x + (along ? u : 0), y0 + h / 2, o.z + (along ? 0 : u)); }
        for (const ry of [h * 0.45, h * 0.9]) B.add(bbox(along ? len : 0.07, 0.08, along ? 0.07 : len, 0.02), plankM, o.x + (along ? 0 : jy(o)), y0 + ry + jy(o), o.z + (along ? jy(o) : 0));   // (WORLD-FIX: overlapping fences' rails off each other's planes)
        small({ type: 'box', x: o.x, z: o.z, hw: Math.max(0.12, ex / 2), hd: Math.max(0.12, ez / 2), top: y0 + h, noStand: true });
        break;
      }
      case 'bush': bushes.push(o); if (!o.cut && Math.max(ex, ez) >= 0.5) small({ type: 'cyl', x: o.x, z: o.z, r: Math.min(ex, ez) * 0.35, top, noStand: true, seeThrough: true }); break;
      default: plants.push(o);
    }
  }
  // ISLES-BAR (S.flights): a flight of dressed steps up a bank too steep to walk, from a (its foot, local x, z) to b (its
  // head), w m wide: risers of at most 0.24 m; each step's collider runs back under the higher ones to the head (no seam;
  // the height under his feet decides, as on the decks' stairs and KNARTAS-LEDGE's door steps). Where the bank's own
  // ground stands over a step, he walks on the ground (it is gentle enough there: the steps are for the steep part)
  for (const F of S.flights || []) {
    const [ax, az] = F.a, [bx, bz] = F.b, len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len, lx = -uz, lz = ux, hw = F.w / 2;
    const ya = gy(ax, az), yb = gy(bx, bz) + 0.04, n = Math.ceil((yb - ya) / 0.24), rise = (yb - ya) / n, run = len / n;
    const low = (x, z) => { let m = Infinity; for (const u of [-hw, 0, hw]) m = Math.min(m, gy(x + lx * u, z + lz * u)); return m; };
    for (let i = 0; i < n; i++) {
      const v0 = i * run, v1 = (i + 1) * run, top = ya + (i + 1) * rise, mx = ax + ux * (v0 + v1) / 2, mz = az + uz * (v0 + v1) / 2;
      let gl = Infinity; for (let v = v0; v <= v1 + 1e-6; v += run / 2) gl = Math.min(gl, low(ax + ux * v, az + uz * v));
      const bot = Math.min(gl, top) - 0.3, ry = Math.atan2(ux, uz), nw = (i % 2) * 0.012;
      if (top > gl - 0.05) { const m = new THREE.Mesh(bbox(F.w - nw, top - bot, run + 0.02, 0.02, 1.8), stoneM); m.position.set(mx, (top + bot) / 2, mz); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; group.add(m); }
      const cv = (v0 + len) / 2, cl = len - v0;
      col({ type: 'box', x: ax + ux * cv, z: az + uz * cv, hw: Math.abs(ux) > 0.5 ? cl / 2 : hw, hd: Math.abs(ux) > 0.5 ? hw : cl / 2, top, stair: true });
    }
    // low cheek walls either side, so the flight reads as built into the bank
    for (const sd of [-1, 1]) {
      const cx = (ax + bx) / 2 + lx * sd * (hw + 0.15), cz = (az + bz) / 2 + lz * sd * (hw + 0.15), cy0 = Math.min(ya, low(cx, cz)) - 0.3, cy1 = yb + 0.5;
      const m = new THREE.Mesh(bbox(0.3, cy1 - cy0, len + 0.3, 0.03, 1.5), stoneM); m.position.set(cx, (cy0 + cy1) / 2, cz); m.rotation.y = Math.atan2(ux, uz); m.castShadow = m.receiveShadow = true; group.add(m);
      // (the cheek is a sloped rail he cannot cross from the flight: blocks along its length, each at its step's height)
      for (let i = 0; i < n; i += 2) { const v = (i + 1) * run; col({ type: 'box', x: ax + ux * v + lx * sd * (hw + 0.15), z: az + uz * v + lz * sd * (hw + 0.15), hw: Math.abs(ux) > 0.5 ? run * 1.1 : 0.15, hd: Math.abs(ux) > 0.5 ? 0.15 : run * 1.1, top: ya + (i + 1) * rise + 0.5, noStand: true }); }
    }
  }
  // ISLES-BAR (S.hoists): a lift tower against a cliff between two walkable levels the planner keeps apart (Mosquibee's
  // meadow and its ledge): its cage rides up and down; story/isleslife.js offers the ride at its foot and at its head
  // (R.hoists, world coordinates: where he stands to ride, facing away from the tower when he arrives)
  for (const Hs of S.hoists || []) {
    const [tx, tz, ry] = Hs.tower, P = new EP.Place(B, tx, gy(tx, tz), tz, ry);
    EP.liftTower(P, { h: Hs.h, w: Hs.w });
    for (const c of P.cols) col(c);
    for (const e of P.extra) { group.add(e.obj); updaters.push(e.update); }
    const spot = ([x, z]) => ({ x: ox + x, z: oz + z, y: gy(x, z), a: Math.atan2(x - tx, z - tz) });
    (R.hoists ||= []).push({ id: Hs.id, foot: spot(Hs.foot), head: spot(Hs.head), tower: { x: ox + tx, z: oz + tz } });
  }
  // --- the dressing: the plan's pieces, merged into the island's batch (one draw per material)
  const honey = (P) => { EP.crate(P, { s: 0.62, kind: 'nectar' }); EP.honeyJars(P, { n: 5, ly: 0.62, collide: false }); EP.honeyJars(P, { n: 2, lx: 0.62, lz: 0.2, seed: 7, collide: false }); P.box(0, 0, 0.36, 0.36, 0.95); P.r = 0.6; return P; };
  const barrels = (P) => { EP.barrel(P, { lx: -0.36 }); EP.barrel(P, { lx: 0.36, color: '#9a6a48' }); EP.barrel(P, { lz: 0.58, color: '#b88a58' }); return P; };
  const BUILD = {
    bin: (P) => EP.bin(P, { color: S.binColor || '#2f7f86' }), planter: EP.planter, boxPlanter: EP.boxPlanter, bench: EP.bench, lamp: EP.lamp,
    signpost: (P, o) => EP.signpost(P, (o.boards || []).map((b) => ({ text: b.text, ang: Math.atan2(b.tx - P.x, b.tz - P.z) }))),
    crates: EP.crateStack, barrels, jars: EP.jars, honey, stall: EP.stall, banner: EP.bannerPole, pole: EP.pole, hive: EP.hive, greatHive: EP.greatHive,
    flowerBed: EP.flowerBed, plinth: EP.statuePlinth, stage: EP.stage, fountain: EP.fountain, gasHolder: EP.gasHolder, pump: EP.pumpEngine,
    cageLamp: EP.cageLamp, bottles: EP.gasBottles, crane: EP.crane, warn: EP.warnSign, barrier: EP.barrier, mast: EP.radioMast, flagPole: EP.flagPole,
    waterTank: EP.waterTank, bollard: EP.bollard, beacon: EP.beacon, netRack: EP.netRack, laundry: EP.laundry,
    shuttleBoard: (P) => EP.shuttleBoard(P, { title: 'ESMER SHUTTLE · DEPARTURES', lines: ['zeelich', ...ISLES].map((n) => BOARD_NAME[n]) }),
    weighBeam: EP.weighBeam, cloudCatcher: EP.cloudCatcher, nectarPress: EP.nectarPress, ruinedTower: EP.ruinedTower, telescope: EP.telescope,
    brokenCol: EP.brokenCol, fallenDome: EP.fallenDome, liftTower: EP.liftTower,
    mineMouth: EP.mineMouth, bellFrame: EP.bellFrame, boardSign: EP.boardSign,   // (ZEELICH-1 item 5)
  };
  const groundUnder = (x, z, rr) => { if (A.floorAt) return gy(x, z); let y = gy(x, z); for (let q = 0; q < 6; q++) { const a = (q / 6) * Math.PI * 2; y = Math.min(y, gy(x + Math.sin(a) * rr, z + Math.cos(a) * rr)); } return y; };
  let pieces = 0;
  for (const it of plan.items) {
    if (it.kind === 'pipe') {
      const pc = []; EP.pipeRun(B, it.pts.map((p) => [p.x, gy(p.x, p.z) + p.h, p.z]), { cols: pc, gy }); for (const c of pc) col(c); pieces++; continue;
    }
    if (it.kind === 'skiff') {
      // (on the clouds; in a harbour, afloat on its water and tied to the quay by a line)
      const y = it.o.harbour && S.harbour ? S.harbour.water - 0.28 : CY + 0.15;
      if (it.o.harbour) EP.mooredSkiff(new EP.Place(B, it.x, y, it.z, it.ry), { color: it.o.color });
      if (it.o.tie) {   // (from the hull's end nearer the quay)
        const [tx, tz] = it.o.tie, ux = Math.sin(it.ry), uz = Math.cos(it.ry), e = (ux * (tx - it.x) + uz * (tz - it.z) > 0 ? 1 : -1) * 1.7;
        EP.hangingLine(B, [it.x + ux * e, y + 0.62, it.z + uz * e], [tx, gy(tx, tz) + 0.45, tz], { kind: 'plain', sag: 0.3 });
      }
      if (!it.o.harbour) { const g = EP.skiff(group, it.x, y, it.z, it.ry, it.o.color), ph = it.x * 0.7; updaters.push((dt, t) => { g.position.y = y + Math.sin(t * 0.9 + ph) * 0.12; g.rotation.z = Math.sin(t * 0.7 + ph) * 0.04; }); }
      pieces++; continue;
    }
    const f = BUILD[it.kind]; if (!f) continue;
    const fr = FOOT[it.kind]?.(it.o) || { r: 0.5 };
    const P = new EP.Place(B, it.x, groundUnder(it.x, it.z, Math.min(1.2, (fr.r ?? Math.max(fr.hw, fr.hd)) * 0.6)), it.z, it.ry);
    f(P, it.o || {});
    for (const c of P.cols) col(c);
    for (const e of P.extra) { group.add(e.obj); updaters.push(e.update); }
    // (ZEELICH-1 item 5: the story's lift, in world coordinates: R.lift.setLevel / setLever, its top, lever and front)
    if (P.lift && !R.lift) { const Lw = P.lift.local, w2 = ([x, z]) => ({ x: ox + x, z: oz + z }); R.lift = Object.assign(P.lift, { top: { x: ox + Lw.x, z: oz + Lw.z, y: Lw.y }, lever: w2(Lw.lever), front: { ...w2(Lw.front), a: Lw.ry + Math.PI } }); }
    pieces++;
  }
  for (const ln of plan.lines) EP.hangingLine(B, [ln.a.x, gy(ln.a.x, ln.a.z) + ln.a.h, ln.a.z], [ln.b.x, gy(ln.b.x, ln.b.z) + ln.b.h, ln.b.z], { kind: ln.o.kind, sag: ln.o.sag, colors: S.lines || undefined, seed: pieces + 1 });
  // --- on decks: the stairs between their levels, rails along every open edge (the deck's brink and the stairs'
  // sides hold him; a rail is left open where a deck meets another at about its height, or a stair)
  let rails = 0;
  if (A.floors) {
    const onStair = (x, z) => A.floors.some((f) => f.stair && x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1);
    const rail = (ax, az, bx, bz, y) => {
      EP.railRun(B, ax, az, bx, bz, y);
      const len = Math.hypot(bx - ax, bz - az);
      col({ type: 'box', x: (ax + bx) / 2, z: (az + bz) / 2, hw: len / 2 + 0.08, hd: 0.12, rot: Math.atan2(-(bz - az), bx - ax), top: y + 1.0, bottom: y - 1.2, noStand: true, seeThrough: true });
      rails++;
    };
    for (const f of A.floors) {
      if (f.stair) {   // the steps (planks on a timber block), side rails along both sides
        const s = f.stair, along = s.az === s.bz ? 'x' : 'z', L2 = Math.hypot(s.bx - s.ax, s.bz - s.az);
        for (let k = 1; k <= s.n; k++) {
          const t0 = (k - 1) / s.n, t1 = k / s.n, y = s.y0 + (s.y1 - s.y0) * t1, mx = s.ax + (s.bx - s.ax) * (t0 + t1) / 2, mz = s.az + (s.bz - s.az) * (t0 + t1) / 2;
          const dl = L2 / s.n + 0.24, hgt = y - s.y0 + 0.5, hw = along === 'x' ? dl / 2 : s.w / 2, hd = along === 'x' ? s.w / 2 : dl / 2;
          const nw = (k % 2) * 0.012;   // (WORLD-FIX: the overlapping steps' sides alternate 6 mm in: they shared planes and z-fought)
          B.add(bbox(hw * 2 - (along === 'x' ? 0 : nw), hgt, hd * 2 - (along === 'x' ? nw : 0), 0.03, 1.4), plankM, mx, y - hgt / 2, mz);
          col({ type: 'box', x: mx, z: mz, hw, hd, top: y, bottom: s.y0 - 0.6, stair: true });   // (overlapping: no seam between steps; the height under the feet decides)
        }
        for (const sd of [-1, 1]) {
          const nx2 = along === 'x' ? 0 : sd * (s.w / 2), nz2 = along === 'x' ? sd * (s.w / 2) : 0;
          for (let k = 0; k < 3; k++) {   // (in three lengths, following the rise)
            const t0 = k / 3, t1 = (k + 1) / 3;
            EP.railRun(B, s.ax + (s.bx - s.ax) * t0 + nx2, s.az + (s.bz - s.az) * t0 + nz2, s.ax + (s.bx - s.ax) * t1 + nx2, s.az + (s.bz - s.az) * t1 + nz2, s.y0 + (s.y1 - s.y0) * (t0 + 1 / 6));
          }
          col({ type: 'box', x: (s.ax + s.bx) / 2 + nx2, z: (s.az + s.bz) / 2 + nz2, hw: along === 'x' ? L2 / 2 : 0.12, hd: along === 'x' ? 0.12 : L2 / 2, top: s.y1 + 1.0, bottom: s.y0 - 1.2, noStand: true, seeThrough: true });
        }
        continue;
      }
      for (const [ax, az, bx, bz, nx2, nz2] of [[f.x0, f.z0, f.x1, f.z0, 0, -1], [f.x0, f.z1, f.x1, f.z1, 0, 1], [f.x0, f.z0, f.x0, f.z1, -1, 0], [f.x1, f.z0, f.x1, f.z1, 1, 0]]) {
        const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 0.5));
        let runStart = -1;
        const flush = (endI) => { if (runStart < 0) return; const t0 = runStart / n, t1 = endI / n; if ((t1 - t0) * len > 0.4) rail(ax + (bx - ax) * t0 - nx2 * 0.12, az + (bz - az) * t0 - nz2 * 0.12, ax + (bx - ax) * t1 - nx2 * 0.12, az + (bz - az) * t1 - nz2 * 0.12, f.top); runStart = -1; };
        for (let i = 0; i <= n; i++) {
          const px = ax + ((bx - ax) * i) / n, pz = az + ((bz - az) * i) / n, qx = px + nx2 * 0.35, qz = pz + nz2 * 0.35;
          const other = A.floorAt(qx, qz), open = !onStair(qx, qz) && (other == null || Math.abs(other - f.top) > 0.6);
          if (open && runStart < 0) runStart = i;
          if (!open) flush(i);
        }
        flush(n);
      }
    }
  }
  // --- a harbour (S.harbour: Knartas' basin between the quay's arms): quay walls of dressed stone down to the
  // water along every land edge inside it, a kerb on top where the edge holds him (the edge blocks stay as they are)
  const HB = S.harbour, inHarbour = (x, z, m = 0) => HB && x > HB.x0 - m && x < HB.x1 + m && z > HB.z0 - m && z < HB.z1 + m;
  if (HB) {
    const runs = new Map();
    for (let j = 0; j < L.nz; j++) for (let i = 0; i < L.nx; i++) {
      const v = H[j * L.nx + i]; if (v == null || !inHarbour(cx(i), cz(j), cell)) continue;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= L.nx || b >= L.nz || H[b * L.nx + a] != null || !inHarbour(cx(a), cz(b))) continue;
        const key = di ? `x${i}:${di}` : `z${j}:${dj}`;
        if (!runs.has(key)) runs.set(key, { di, dj, line: di ? cx(i) : cz(j), at: [], hs: [] });
        runs.get(key).at.push(di ? cz(j) : cx(i)); runs.get(key).hs.push(tgy(cx(i), cz(j)));
      }
    }
    const quayM = stoneM, kerbM = stoneM, lineM = EP.EM.vc();
    let qk = 0;   // (WORLD-FIX: each run's wall and kerb a few mm off its neighbours': where two meet at a corner their tops z-fought)
    for (const q of runs.values()) {
      const qy = (qk++ % 3) * 0.006;
      q.at.sort((a, b) => a - b);
      const a0 = q.at[0] - cell / 2, a1 = q.at[q.at.length - 1] + cell / 2, len = a1 - a0, mid = (a0 + a1) / 2, top = Math.min(...q.hs);
      const n = q.di || q.dj, th = cell + 0.25, hgt = top - (HB.water - 0.9), along = !!q.dj;   // (along x when the edge faces ±z)
      const c = q.line + n * (th / 2 - 0.12);
      const [bx, bz] = along ? [mid, c] : [c, mid];
      B.add(bbox(along ? len : th, hgt, along ? th : len, 0.05, 1.8), quayM, bx, top - hgt / 2 - 0.03 + qy, bz);
      // a band of darker stone at the waterline, the kerb on top, mooring rings on the face
      B.add(cached(`isle-wline${len.toFixed(2)}|${along}`, () => tint(bbox(along ? len + 0.02 : th + 0.04, 0.35, along ? th + 0.04 : len + 0.02, 0.03, 1.8), '#8a7c98')), lineM, bx, HB.water + 0.12, bz);
      const kc = q.line + n * 0.2;
      B.add(bbox(along ? len : 0.42, 0.34, along ? 0.42 : len, 0.06, 1.8), kerbM, along ? mid : kc, top + 0.14 + qy, along ? kc : mid);
      const face = q.line + n * (th - 0.12);
      for (let u = a0 + 2.0; u < a1 - 1.0; u += 3.4) B.add(cached('isle-mring', () => new THREE.TorusGeometry(0.16, 0.035, 5, 12)), brass, along ? u : face + n * 0.02, top - 0.55, along ? face + n * 0.02 : u, 0, along ? 0 : Math.PI / 2);
    }
  }
  B.build();
  // instanced pieces, each scaled to its object's box (by the geometry's own size)
  // (HEADING-LOAD-2: culled per instance in each pass, kit.js cullInstances: the island-wide meshes went to the GPU in
  //  full at every heading — Otringal's sculpted trees 1.1–1.3M triangles a frame)
  const fit = (geo, list, mat, lo = null, ys = 1) => {
    if (!list.length) return;
    geo.computeBoundingBox(); const b = geo.boundingBox, gw = b.max.x - b.min.x, gh = b.max.y - b.min.y, gd = b.max.z - b.min.z;
    // (TREES-1: a cut plant's colour is drawn all the same, so the island's random stream is unchanged)
    const items = list.map((o) => ({ x: o.x, y: o.y - b.min.y * (o.sy / gh) * ys, z: o.z, ry: (o.beta / 4096) * Math.PI * 2, sx: Math.max(0.3, o.sx) / gw, sy: (o.sy / gh) * ys, sz: Math.max(0.3, o.sz) / gd, color: new THREE.Color(S.trees || '#fff0ff').multiplyScalar(0.9 + r() * 0.15) })).filter((_, i) => !list[i].cut);
    if (items.length) cullInstances(group, geo, mat, items, { lo }).userData.gpuGroup = 'trees';   // (benchgpu.js)
  };
  const vc = pm('#ffffff', 0.85, { vertexColors: true });
  // (lo: the coarse sculpts of a trade-off that is off, kit.js cullInstances: never built in play)
  fit(treeGeometry('round', 3), trees[0], vc, () => treeGeometry('round', 3, 1)); fit(treeGeometry('tall', 2), trees[1], vc, () => treeGeometry('tall', 2, 1));
  fit(treeGeometry('bush', 1), bushes, vc, () => treeGeometry('bush', 1, 1)); fit(treeGeometry('bush', 2), plants, vc, () => treeGeometry('bush', 2, 1));
  const rockMat = pm('#ffffff', 0.9, { vertexColors: true, emissive: '#3a2030', emissiveIntensity: 0.4 });
  rocks.forEach((list, v) => fit(rockGeometry(v + 1), list, rockMat, () => rockGeometry(v + 1, 1)));

  // --- the shuttle pad and the shuttle (the way back: src/game/story/islands.js)
  {
    const py = gy(pad.x, pad.z);
    const disc = new THREE.Mesh(cached('isle-pad', () => new THREE.CylinderGeometry(3.35, 3.5, 0.25, 24)), pm('#8a8f9a', 0.7, { metalness: 0.2 }));
    disc.position.set(pad.x, py + 0.1, pad.z); disc.receiveShadow = true; group.add(disc);
    const ring = new THREE.Mesh(cached('isle-ring', () => new THREE.TorusGeometry(3.0, 0.07, 6, 32)), pm('#e8c040', 0.5)); ring.rotation.x = Math.PI / 2; ring.position.set(pad.x, py + 0.24, pad.z); group.add(ring);
    const sh = esmerShuttle({ landed: true }); sh.position.set(pad.x, py + 0.23, pad.z); sh.rotation.y = pad.toward + Math.PI / 2; group.add(sh);
    col({ type: 'cyl', x: pad.x, z: pad.z, r: 3.2, top: py + 4.4, noStand: true });
    R.pad = { x: ox + pad.x, z: oz + pad.z, y: py };
    // he stands a few metres before it, facing the landmark: the play camera behind him keeps the shuttle out of
    // the first view (the plan's spawn); without one, beside it, facing the island's middle
    let sp = plan.spawn;
    const tries = []; for (const d of [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.4]) for (const side of [1, -1]) tries.push(pad.toward + side * (Math.PI / 2 + d));
    for (const a of tries) {
      if (sp) break;
      const x = pad.x + Math.sin(a) * 4.8, z = pad.z + Math.cos(a) * 4.8;
      if (land(x, z) && Math.abs(gy(x, z) - py) < 0.5) sp = { x, z, a: pad.toward };
    }
    sp ||= { x: pad.x + Math.sin(pad.toward) * 4.8, z: pad.z + Math.cos(pad.toward) * 4.8, a: pad.toward };
    R.spawn = { x: ox + sp.x, z: oz + sp.z, a: sp.a };
  }
  // the landmark (its approach, where the routes end) and the plan's tally; sample points clear of the new pieces
  const p0 = plan.pois[0]?.reach || plan.pois[0];
  const lk = plan.pois[0]?.look || plan.pois[0]?.at || (S.grand && plan.pois[0]?.word === S.target?.word ? S.grand : null) || plan.pois[0];
  R.landmark = p0 ? { x: ox + p0.x, z: oz + p0.z, word: plan.pois[0].word, look: { x: ox + lk.x, z: oz + lk.z } } : null;
  R.pois = plan.pois.filter((p) => p.reach).map((p) => ({ x: ox + p.reach.x, z: oz + p.reach.z, word: p.word }));
  R.dressing = pieces; R.rails = rails;
  // (ISLES-BAR: the pieces a player reads as usable, in world coordinates, with their footprint: story/isleslife.js gives
  //  each a word or a use)
  const USABLE = new Set(['shuttleBoard', 'signpost', 'fountain', 'stall', 'netRack', 'laundry', 'greatHive', 'hive', 'gasHolder', 'pump', 'warn', 'boardSign', 'mineMouth', 'liftTower', 'bellFrame', 'crane', 'cloudCatcher', 'telescope', 'weighBeam', 'nectarPress', 'ruinedTower', 'fallenDome']);
  R.items = plan.items.filter((it) => USABLE.has(it.kind)).map((it) => { const fr = FOOT[it.kind]?.(it.o || {}) || { r: 0.5 }; return { kind: it.kind, x: ox + it.x, z: oz + it.z, ry: it.ry || 0, r: fr.r ?? Math.max(fr.hw || 0.5, fr.hd || 0.5), words: (it.o?.boards || []).map((b) => b.text), text: it.o?.text || '' }; });
  R.views = { arrival: plan.arrivalView, landmark: plan.pois[0]?.view || null };   // (the planner's camera model: foreground share, his body hidden)
  // LBA2's zone givers: a hop on the spot shakes out a bonus, once (game.giverHop; ids kept in the save)
  R.givers = (plan.givers || []).map((g, i) => ({ id: name + '-' + i, x: ox + g.x, z: oz + g.z, y: g.y, r: 1.1, kinds: g.kinds, n: g.n }));
  R.board = plan.board ? { x: ox + plan.board.x, z: oz + plan.board.z } : null;
  // DOORS-1 / PEOPLE-1: where people may stand (world x, z, y and a heading): before the house doors (facing out
  // to the street), at the landmarks and beside the pad; on ground, clear of colliders, 4 m apart, up to 10. The
  // story's people for the islands are the cloud's (none stand here yet); these are their places.
  {
    const cand = [];
    for (const d of R.shutDoors || []) cand.push({ x: d.x + Math.sin(d.ry) * 1.0, z: d.z + Math.cos(d.ry) * 1.0, a: d.ry, y0: d.y, near: 'door' });
    for (const p of R.pois) cand.push({ x: p.x, z: p.z, a: Math.atan2(R.pad.x - p.x, R.pad.z - p.z), near: 'landmark' });
    for (const [dx, dz] of [[3.4, 0], [-3.4, 0], [0, 3.4], [0, -3.4]]) cand.push({ x: R.pad.x + dx, z: R.pad.z + dz, a: Math.atan2(-dx, -dz), near: 'pad' });
    R.peopleSpots = [];
    for (const c of cand) {
      if (R.peopleSpots.length >= 10) break;
      const y = physics.groundAt(c.x, c.z, (c.y0 ?? 50) + 2);
      if (!(y > -1) || (c.y0 != null && Math.abs(y - c.y0) > 0.6) || !R.land(c.x, c.z) || physics.blockedAt(c.x, c.z, y + 0.3, 0.35)) continue;
      if (R.peopleSpots.some((q) => Math.hypot(q.x - c.x, q.z - c.z) < 4)) continue;
      R.peopleSpots.push({ x: +c.x.toFixed(2), z: +c.z.toFixed(2), y: +y.toFixed(2), a: +c.a.toFixed(3), near: c.near });
    }
  }
  R.ours = OURS.has(name);
  R.route = (plan.routes[0] || []).filter((_, i) => i % 4 === 0).map(([x, z]) => ({ x: ox + x, z: oz + z }));
  R.sample = R.sample.filter((p) => Math.hypot(p.x - R.pad.x, p.z - R.pad.z) > 4.4 && plan.items.every((it) => {
    const fr = FOOT[it.kind]?.(it.o || {}); const rr = fr ? (fr.r ?? Math.hypot(fr.hw, fr.hd)) : 0.5;
    return it.kind === 'skiff' || Math.hypot(p.x - ox - it.x, p.z - oz - it.z) > rr + 0.8;
  }));

  // --- the sea of clouds round it, puffs along the shore, other shuttles in the sky
  {
    const mk = (tex, y, rep, color, opacity, speed, transparent) => {
      const map = tex.clone(); map.needsUpdate = true; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(rep, rep);
      const m = new THREE.MeshBasicMaterial({ map, color, transparent, opacity, depthWrite: !transparent, fog: true });
      const pl = new THREE.Mesh(cached('isle-cloudpl', () => new THREE.PlaneGeometry(1400, 1400).rotateX(-Math.PI / 2)), m);
      pl.position.y = y; pl.renderOrder = transparent ? -1 : 0; group.add(pl);
      updaters.push((dt, t) => { map.offset.set(t * speed, t * speed * 0.6); });
    };
    // (ZSTYLE-2: an island with neither its own sky nor its own sea takes the hub's pale lavender-grey sea, grey billows
    // under a lavender-grey tint; it took the old rose sea under white)
    const plain = !S.cloudTint && !S.env, grey = !!S.cloudGrey || plain;
    const ct = S.cloudTint || (plain ? ['#dcd6e8', '#e4def0', '#ece8f4'] : ['#ffffff', '#ffffff', '#fff0f6']);   // (ZEELICH-1 item 6: an island's own cloud sea: grey over Otringal, amber gas below)
    const rep = S.cloudRep || 1, op = S.cloudOp || [1, 0.9, 0.45];   // (SKY-9: an island's own billow size and layer opacities)
    mk(cloudTex(true, grey), CY - 2.5, 14 * rep, ct[0], op[0], 0.0012, false);
    mk(cloudTex(false, grey), CY, 10 * rep, ct[1], op[1], 0.002, true);
    mk(cloudTex(false, grey), CY + 1.1, 6 * rep, ct[2], op[2], -0.0015, true);
    const puffM = new THREE.SpriteMaterial({ map: puffTex(grey), color: S.cloudTint || plain ? ct[2] : '#fff4f8', transparent: true, depthWrite: false, fog: true, opacity: 0.8 });
    const puffs = [], spots = [];
    for (let j = 0; j < L.nz; j += 4) for (let i = 0; i < L.nx; i += 4) {
      const k = j * L.nx + i; if (H[k] != null) continue;
      // sea next to land
      let near = false; for (let b = -3; b <= 3 && !near; b++) for (let a = -3; a <= 3; a++) { const m = (j + b) * L.nx + (i + a); if (i + a >= 0 && j + b >= 0 && i + a < L.nx && j + b < L.nz && H[m] != null) { near = true; break; } }
      if (!near || r() < 0.4 || inHarbour(cx(i), cz(j), 3)) continue;   // (none in a harbour: its water shows)
      const s = (5 + r() * 6) * (S.puffScale || 1), y = CY + 0.6 + r() * 1.5;
      const x = cx(i) + (r() - 0.5) * 4, z = cz(j) + (r() - 0.5) * 4;
      spots.push({ x, y, z, s, ph: r() * 6 });
    }
    // (PERF-ARRIVAL: all the puffs in one draw call, engine/spritebatch.js; they were one call each)
    if (spots.length) {
      const SB = new SpriteBatch(group, puffM, spots.length);
      for (const p of spots) puffs.push({ sp: SB.add(p.x, p.y, p.z, p.s * 1.6, p.s), y: p.y, ph: p.ph });
      SB.update();
      updaters.push((dt, t) => { for (const p of puffs) p.sp.y = p.y + Math.sin(t * 0.25 + p.ph) * 0.4; SB.update(); });
    }
    // the harbour's water: a calm, glossy lilac cloud-water with ripples, fading out on its open side
    if (HB) {
      const map = EP.harbourTex(), fade = EP.fadeTex(HB.open);
      map.repeat.set((HB.x1 - HB.x0) / 7, (HB.z1 - HB.z0) / 7);
      const m = new THREE.MeshStandardMaterial({ map, alphaMap: fade, color: '#ffffff', roughness: 0.22, metalness: 0.15, transparent: true, opacity: 0.94, depthWrite: false, emissive: '#5a4a80', emissiveIntensity: 0.18 });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(HB.x1 - HB.x0, HB.z1 - HB.z0).rotateX(-Math.PI / 2), m);
      pl.position.set((HB.x0 + HB.x1) / 2, HB.water, (HB.z0 + HB.z1) / 2); pl.receiveShadow = true; group.add(pl);
      updaters.push((dt, t) => { map.offset.set(Math.sin(t * 0.05) * 0.08, t * 0.006); });
    }
    shuttleTraffic(group, updaters, { cx: 0, cz: 0, y: 30 + L.maxH, r: Math.max(w, d) * 0.7 + 30, n: 2, speed: 0.04 });
  }
  if (name === 'celebration') R.templePortal = buildCelPortal(group, physics);   // (ZEELICH-1: the Dark Monk's temple's portal on the plaza; the hall is celtemple.js)
  // ZEELICH-1 item 5: the Wannies' island's handles (world coordinates): where the lift sets him down, the mine's mouth,
  // the chapel's door, the ore crates by the lift's foot, and six people's places
  if (name === 'platform') {
    const find = (k) => plan.items.find((it) => it.kind === k), W2 = (x, z, a = 0) => ({ x: ox + x, z: oz + z, a });
    const fr = (it, d, side = 0) => { const fx = Math.sin(it.ry), fz = Math.cos(it.ry); return [it.x + fx * d + fz * side, it.z + fz * d - fx * side]; };
    const m = find('mineMouth'), lf = find('liftTower');
    const mf = m && fr(m, 2.6), lb = lf && fr(lf, 2.6);   // (clear of the ore cart on the rails, of the lift's lever)
    R.wannie = {
      liftBottom: lb ? W2(lb[0], lb[1], lf.ry) : null,
      mine: mf ? W2(mf[0], mf[1], m.ry + Math.PI) : null,
      chapelDoor: W2(32.7, 27.0, -Math.PI / 2),   // (on the terrace before the door; its stair climbs from the east)
      crates: lf ? W2(...fr(lf, 0.5, 3.2)) : null,
      npcSpots: {
        miner1: m ? W2(...fr(m, 4.4, -1.6), m.ry) : null, miner2: m ? W2(...fr(m, 3.8, 2.2), m.ry + 2.6) : null,
        foreman: W2(29.2, -25.0, Math.PI), villager1: W2(27.3, 7.6, Math.PI), villager2: W2(40.7, 14.5, Math.PI / 2), chaplain: W2(36.6, 28.0, Math.PI / 2),
      },
    };
  }
  return R;
}
