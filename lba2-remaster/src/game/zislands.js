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
import { rng, smoothstep } from '../engine/math.js';
import { MAX_SLOPE } from '../engine/physics.js';
import { rockGeometry, treeGeometry } from './vegetation.js';
import { tm, pm, cached, bbox, cyl, lathe, Batch, instances, brassM } from './kit.js';
import { esmerShuttle, shuttleTraffic } from './shuttle.js';
import { cloudTex, puffTex, domeTex } from './zeelich.js';
import * as EP from './props-esmer.js';
import { placeLayout, PLACES, TRALU, OLDWATCH, watchAt } from './zplaces.js';

// The original's Zeelich islands (assets/lba2/islands, numbers from the user's files: tools/lba2-islands.py), then
// our own places (src/game/zplaces.js). (Appended at the end: an island's place in the world is its index, and
// saves keep a position on an island.)
//   liftdock    the original's ASCENCE: a cargo lift dock on stilts at the cloud line (ZL-ALL)
//   celebration is the original's CELEBRA2 since ZL-ALL: Celebration Island after the great figure rose from it
export const ISLES = ['otringal', 'knartas', 'mosquibee', 'celebration', 'undergas', 'cxislet', 'platform', 'liftdock', ...PLACES];
export const OURS = new Set(PLACES);
// the names on the shuttles' departures boards (the menus use the text table: text/islands.js)
export const BOARD_NAME = { zeelich: 'ZEELICH SPACEPORT', otringal: 'OTRINGAL', knartas: 'KNARTAS', mosquibee: 'MOSQUIBEE', celebration: 'CELEBRATION', undergas: 'UNDER CELEBRATION', cxislet: 'CX ISLET', platform: 'THE PLATFORM', liftdock: 'THE LIFT DOCK', tralu: 'TRALU ROCK', orchard: 'NECTAR ORCHARD', oldwatch: 'THE OLD WATCH' };
// far from every other region and from each other (the biggest patch is ≈ 210 m across)
export const ISLE_AT = (i) => ({ x: 1900 + i * 330, z: 1800 });
const SEA = -9;            // the ground under the clouds, past every island's edge
const SHORE = -0.5;        // the sea next to land: just under the waterline (physics WATER_FLOOR -0.35)
const CLOUD_Y = -1.4;      // the sea of clouds, just under the original's level 0
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
  EP.setSignWords(ESMER_WORDS);
  ISLES.forEach((n, i) => { if (LAYOUTS[n]) out['isle_' + n] = buildIsland(scene, physics, n, LAYOUTS[n], ISLE_AT(i)); });
  return out;
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
  'LIFT', 'CARGO DOCK', 'TRADING POST', 'QUAY', 'WEIGH BEAM', 'ORCHARD', 'PRESS HOUSE', 'CLOUD CATCHER', 'OLD WATCH', 'TELESCOPE', 'THE FIGURE'];
const STYLE = {
  otringal: {   // the Esmers' capital: a paved plaza with a fountain, market stalls, banners, the Grand Hall
    trees: '#ffe4ec', ground: ['#f2e6b4', '#e6dcaa', '#e8d4c0'], pave: 'cobble', paveAt: (x, z) => x > -29 && x < 16 && z > -21 && z < 28,
    walls: ['#fbf0ea', '#f8e8d8', '#f6dce6', '#fff4e0', '#f1e2f6'], domes: [['#d89a30', '#ffe6a8'], ['#2f8a9a', '#a8e8ee'], ['#c84a7a', '#ffc8dc'], ['#8a5ac0', '#e8c8ff']],
    grand: { x: 5.6, z: -23.9 }, portico: { x0: 1.5, x1: 9.7, z0: -20.5, z1: -16.8, zc: -18.5 }, target: { x: 5.6, z: -16.2, word: 'GRAND HALL' }, near: 16, far: 34,
    crates: 'wood', lines: ['#7a3a8a', '#f0c040', '#f4eee0', '#2f8a9a'],
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
      api.street({ benches: 4, clutter: 10, kinds: ['jars', 'crates', 'planter', 'bin', 'barrels'], lamps: 11, doors: 0.8, banners: 9, lines: true, fillSpacing: 8 });
      api.signs([{ word: 'MARKET', x: -14, z: 8 }]);
    },
  },
  knartas: {   // houses and a harbour: the F-shaped quay in the clouds with boats, nets, bollards and a light
    trees: '#d8f0f8', ground: ['#e8f0b0', '#dce8a4', '#e8dcc0'], pave: 'concrete', paveAt: (x, z) => x < -7.5 && z < -6,
    walls: ['#f8f0e4', '#e6f0f4', '#f4e4d4', '#eef4e4'], domes: [['#2f8a9a', '#a8e8ee'], ['#3a6ac0', '#c8dcff'], ['#d89a30', '#ffe6a8']],
    target: { x: -13.5, z: -22.0, word: 'HARBOUR' }, near: 10, far: 34, padClear: 3.3, padSlope: 1.4, padR: 3.3, D: [9, 8, 7, 6.5], ahead: 3, padIn: (x, z) => x < -8, gate: { x0: -5.0, x1: 5.6, z0: -23.6, z1: -20.9 },
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
      for (const [x, z, ry] of [[-24, -48.6, Math.PI / 2], [-16, -31.6, -Math.PI / 2], [-27, -11.4, -Math.PI / 2], [-12.5, -48.8, Math.PI / 2 + 0.2]]) api.add('skiff', x, z, ry, { color: ['#c84a3a', '#2f7f86', '#d89a30', '#7a3a8a'][Math.abs(Math.round(x)) % 4] });
      api.open('netRack', 3, { lo: 1.6, space: 6, around: { x: -22, z: -40, r: 14 }, face: { x: -22, z: -30 } });
      api.open('crates', 5, { lo: 1.4, space: 4, around: { x: -15, z: -30, r: 16 }, opts: (i) => ({ n: 2 + (i % 3), seed: i + 3 }) });
      api.open('barrels', 3, { lo: 1.3, space: 5, around: { x: -18, z: -18, r: 12 } });
      api.open('laundry', 3, { lo: 1.8, space: 9, around: { x: 22, z: 20, r: 22 } });
      api.street({ benches: 4, clutter: 8, kinds: ['barrels', 'crates', 'jars', 'bin', 'planter'], lamps: 12, doors: 0.85, banners: 0, lines: true, fillSpacing: 8 });
      api.signs([{ word: 'VILLAGE', x: 22, z: 22 }]);
    },
  },
  mosquibee: {   // the Mosquibees' honey island: a hive meadow on the broad top, flower beds and hives on the ledges
    mainNear: { x: 28, z: -20 },
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
  tralu: {   // Tralu Rock, an Esmer trading post: the market on the crown round a great weigh-beam, a crane lowering
    // goods to the quay shelf below, skiffs tied up in the clouds, a ramp curving round the south face
    trees: '#ffe8c8', ground: ['#f0e0b0', '#e6d6a4', '#e8cdb8'], pave: 'cobble', paveAt: (x, z) => Math.hypot(x, z) < 10.5,
    walls: ['#fbefe0', '#f6e0cc', '#f8e8f0'], domes: [['#d89a30', '#ffe6a8'], ['#2f8a9a', '#a8e8ee'], ['#c84a7a', '#ffc8dc']],
    target: { x: 2.6, z: 1.6, word: 'TRADING POST' }, near: 8, far: 16, D: [8, 7, 6.5, 6], ahead: 3, padClear: 3.2, padSlope: 1.6,
    crates: 'wood', lines: ['#d89a30', '#2f8a9a', '#f4eee0', '#c84a7a'],
    landmark(api) {
      const b = api.near('weighBeam', 2.6, 1.6, 0.3, {}, 3);
      const pois = [b ? { x: b.x, z: b.z + 3.4, word: 'WEIGH BEAM', at: b } : { ...api.S.target }];
      const qa = TRALU.quayA, c = api.near('crane', Math.cos(qa) * 11.2, Math.sin(qa) * 11.2, -Math.PI / 2, { h: 6, jib: 8.5 }, 2.5);
      pois.push({ x: Math.cos(qa) * 20, z: Math.sin(qa) * 20, word: 'QUAY', at: c });
      return pois;
    },
    dress(api) {
      const b = api.pois[0].at || api.S.target;
      api.open('stall', 4, { lo: 2.4, space: 6, around: { x: 0, z: 0, r: 11 }, face: b, opts: (i) => ({ goods: ['cloth', 'jars', 'fruit', 'honey'][i % 4], a: ['#2f8a9a', '#d89a30', '#e8608a', '#9a5ac8'][i % 4], b: '#f8eee4', seed: i + 31 }) });
      // the quay: bollards along its brink, skiffs tied up below, crates and barrels waiting
      const qa = TRALU.quayA;
      for (let k = -3; k <= 3; k++) { const a = qa + k * 0.16; api.near('bollard', Math.cos(a) * 22.4, Math.sin(a) * 22.4, 0, {}, 1.2); }
      for (const [k, c] of [[-2, '#c84a3a'], [0.5, '#2f7f86'], [2.5, '#d89a30']]) { const a = qa + k * 0.18; api.add('skiff', Math.cos(a) * 26.5, Math.sin(a) * 26.5, a, { color: c }); }
      api.open('crates', 5, { lo: 1.2, space: 3.5, around: { x: Math.cos(qa) * 19, z: Math.sin(qa) * 19, r: 7 }, opts: (i) => ({ kind: i % 2 ? 'cargo' : 'wood', n: 2 + (i % 3), seed: i + 41 }) });
      api.open('barrels', 2, { lo: 1.2, space: 4, around: { x: Math.cos(qa) * 19, z: Math.sin(qa) * 19, r: 7 } });
      api.open('crates', 4, { lo: 1.4, space: 4, around: { x: -2, z: -4, r: 9 }, opts: (i) => ({ kind: 'wood', n: 2 + (i % 3), seed: i + 51 }) });
      // the ramp's lamps (it climbs the south face)
      for (let k = 0; k < 5; k++) { const a = TRALU.ramp.a0 + 0.2 + k * 0.45, rr = TRALU.ramp.r + 1.2; api.near('lamp', Math.cos(a) * rr, Math.sin(a) * rr, 0, {}, 0.8); }
      api.street({ benches: 3, clutter: 6, kinds: ['crates', 'jars', 'barrels', 'planter', 'bin'], lamps: 9, doors: 0.9, banners: 4, lines: true, fillSpacing: 7 });
      api.giver(['money'], -2.0, 0.5, 1);
      api.signs([{ word: 'QUAY', x: Math.cos(qa) * 20, z: Math.sin(qa) * 20 }]);
    },
  },
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
  cxislet: {   // a small outpost: a radio mast, a flag, a water tank, the depot's crates under the old tower
    trees: '#eef0d8', ground: ['#ece4b8', '#e0d8ac', '#e8d0b0'], pave: 'concrete', paveAt: () => false,
    walls: ['#e8e0d0', '#f0e8d8'], domes: [['#3a6a5a', '#b8e0c8'], ['#2f8a9a', '#a8e8ee']],
    target: { x: -6, z: -9.5, word: 'OUTPOST' }, near: 10, far: 24, D: [8.0, 7.0, 6.5],
    crates: 'cargo', lines: ['#3a8a9a', '#f0c040', '#f4eee0'],
    landmark(api) {
      const pois = [{ ...api.S.target }];
      const m = api.near('mast', -8.5, -8.5, 0, { h: 8 }, 3);
      if (m) { api.near('flagPole', m.x + 3.0, m.z + 1.0, 0, { h: 6 }, 1.5); api.near('waterTank', m.x - 0.5, m.z + 3.4, 0, {}, 2); }
      return pois;
    },
    dress(api) {
      api.open('crates', 6, { lo: 1.2, space: 3.5, around: { x: 0, z: 0, r: 18 }, opts: (i) => ({ kind: i % 2 ? 'cargo' : 'wood', n: 2 + (i % 3), seed: i + 2 }) });
      api.open('barrels', 3, { lo: 1.2, space: 4, around: { x: 0, z: 0, r: 18 } });
      api.street({ benches: 2, clutter: 6, kinds: ['crates', 'barrels', 'jars', 'bin'], lamps: 8, doors: 1, banners: 0, lines: false, fillSpacing: 6 });
      api.signs([]);
    },
  },
  platform: {   // the High Platform: an industrial deck — cranes, cargo crates, barriers and warning signs
    trees: '#e0e8e4', ground: ['#d8dcc0', '#ccd0b4', '#d8ccb8'], pave: 'concrete', paveAt: (x, z) => x > 14 && x < 41 && z < -18.5,
    walls: ['#d8dce0', '#e0e4e8', '#e8e0d8'], domes: [['#4a6a8a', '#b8d0e8'], ['#2f8a9a', '#a8e8ee']],
    target: { x: 36.4, z: -29, word: 'LOADING DECK' }, near: 13, far: 30, padClear: 3.0, padSlope: 1.0, padR: 3.2, padIn: (x, z) => z < -19,
    crates: 'cargo', lines: ['#f0c040', '#2a2a2a'],
    landmark(api) {
      const pois = [{ ...api.S.target }];
      const c = api.near('crane', 36.5, -23, 0, { h: 9, jib: 7 }, 2.5);
      if (c) pois.push({ x: c.x - 3, z: c.z, word: 'CRANE', at: c });
      return pois;
    },
    dress(api) {
      api.open('crates', 14, { lo: 1.0, space: 2.6, around: { x: 28, z: -30, r: 18 }, opts: (i) => ({ kind: i % 3 ? 'cargo' : 'wood', n: 2 + (i % 3), seed: i + 4 }) });
      api.open('barrier', 4, { lo: 1.0, space: 6, around: { x: 28, z: -32, r: 16 }, opts: () => ({ len: 2.4 }) });
      api.open('warn', 4, { lo: 1.0, space: 7, around: { x: 28, z: -32, r: 16 }, face: api.spawn, opts: (i) => ({ text: ['CRANE AREA', 'KEEP CLEAR', 'MIND THE EDGE', 'LOADING DECK'][i % 4] }) });
      api.open('barrels', 4, { lo: 1.2, space: 5, around: { x: 28, z: -32, r: 16 } });
      api.street({ benches: 2, clutter: 8, kinds: ['crates', 'barrels', 'bottles', 'bin'], lamps: 10, doors: 0.8, banners: 0, lines: false, cage: 4, fillSpacing: 6 });
      api.signs([{ word: 'BRIDGE', x: 42, z: 0 }]);
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
};
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
  let best = null; const why = [0, 0, 0, 0, 0, 0, 0, 0];
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
      if (!best || score > best.score) best = { score, x, z, sx, sz, a: Math.atan2(ux, uz), seen };
    }
  }
  const pad = best ? { x: best.x, z: best.z, toward: best.a } : { x: A.pad.x, z: A.pad.z, toward: A.pad.toward };
  { let s = 0, n = 0; for (let a = -1.7; a <= 1.7; a += 1.7) for (let b = -1.7; b <= 1.7; b += 1.7) { const h = hAt(pad.x + a, pad.z + b); if (h != null) { s += h; n++; } } pad.y = n ? s / n : A.pad.y; }
  const spawn = best ? { x: best.sx, z: best.sz, a: best.a } : null;   // (none: beside the pad, as before)
  // the shuttle and the walk from it are kept clear; the shuttle blocks
  const stamp = (x, z, r, arr, v = 1) => disc(x, z, r, (k) => { arr[k] = v; return true; });
  stamp(pad.x, pad.z, 5.0, keep); stamp(pad.x, pad.z, 3.6, walk, 0);
  for (const f of A.floors || []) if (f.stair) rect((f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2, (f.x1 - f.x0) / 2 + 0.8, (f.z1 - f.z0) / 2 + 0.8, (k) => { keep[k] = 1; });   // (stairs stay clear)
  if (spawn) { stamp(spawn.x, spawn.z, 2.0, keep); line(pad.x, pad.z, spawn.x, spawn.z, (k) => { keep[k] = 1; return true; }); }
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
    for (const k of F.inside) {
      if (occ[k]) { rej[1]++; return null; }
      if (keep[k]) { rej[2]++; return null; }
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
  const add = (kind, x, z, ry = 0, o = {}) => { const it = { kind, x, z, ry, o }; items.push(it); return it; };
  const lines = [];
  const lineItem = (a, ha, b, hb, o = {}) => lines.push({ kind: 'line', a: { x: a.x, z: a.z, h: ha }, b: { x: b.x, z: b.z, h: hb }, o });
  const pipe = (pts) => { const m = pts[Math.floor(pts.length / 2)]; items.push({ kind: 'pipe', pts, x: m.x, z: m.z, ry: 0, o: {} }); };

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
    for (let j = cj(z - 3); j <= cj(z + 3); j++) for (let i = ci(x - 3); i <= ci(x + 3); i++) { if (!inF(i, j)) continue; const k = j * fx + i; if (!reach[k]) continue; const dd = Math.hypot(wx(i) - x, wz(j) - z); if (dd > 0.9 && dd < bd) { bd = dd; bk = k; } }
    if (bk < 0) return null;
    const g = { kinds, n, x: wx(bk % fx), z: wz(Math.floor(bk / fx)), y: hAt(wx(bk % fx), wz(Math.floor(bk / fx))) };
    api.givers.push(g); return g;
  };
  const P0 = (S.landmark ? S.landmark(api) : [T]) || [T];
  api.pois.push(...P0); pois.push(...P0);
  reachN = bfs();
  const routes = [];
  for (const p of pois) {
    // the reachable cell nearest the point, then back along the walk to the landing
    let bk = -1, bd = 1e9;
    for (let j = cj(p.z - 5); j <= cj(p.z + 5); j++) for (let i = ci(p.x - 5); i <= ci(p.x + 5); i++) { if (!inF(i, j)) continue; const k = j * fx + i; if (!reach[k]) continue; const d = Math.hypot(wx(i) - p.x, wz(j) - p.z); if (d < bd) { bd = d; bk = k; } }
    if (bk < 0) continue;
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
      const t = Math.abs(A.mid.x - o.x) > Math.abs(A.mid.z - o.z) ? [Math.sign(A.mid.x - o.x), 0] : [0, Math.sign(A.mid.z - o.z)];
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
      const posts = [...ls.map((p) => ({ ...p, h: 3.3 })), ...bn.map((p) => ({ ...p, h: 4.8 }))];
      const used = new Set();
      for (const a of posts) for (const b of posts) {
        if (a === b || used.has(a) || used.has(b)) continue;
        const d = Math.hypot(a.x - b.x, a.z - b.z); if (d < 4 || d > 11) continue;
        lineItem(a, a.h, b, b.h, { kind: lanterns && lines.length % 2 ? 'lanterns' : 'pennants', sag: 0.35 + d * 0.03 }); used.add(a); used.add(b);
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
  return { pad, spawn, items, lines, pois, routes, reachN, why, rej, dbg, seen: best?.seen ?? -1, givers: api.givers, board: api.board || null };
}

// ================================================================== ground colours (Zeelich's palette)
const C = (c) => new THREE.Color(c);
const COL0 = { turf: C('#f4ecb8'), turf2: C('#e4e8a8'), rock: C('#d8b4c4'), rockHi: C('#ecd0d4'), dust: C('#e8d4c0'), rim: C('#c8a0b8'), path: C('#f0d8c0'), pave: C('#fff0e8') };

// ================================================================== one island
function buildIsland(scene, physics, name, L, at) {
  const ox = at.x, oz = at.z;
  const S = STYLE[name] || {};
  if (S.layout) L = S.layout(L);   // (Celebration: its later state's figure)
  if (S.decks) L = deckLayout(L, S);   // (the Lift Dock: its decks are its ground)
  const A = analyse(L, S), { w, d, H, cx, cz, gx, gz } = A;
  const plan = planIsland(name, L, A), pad = plan.pad;
  const COL = { ...COL0, ...(S.ground ? { turf: C(S.ground[0]), turf2: C(S.ground[1]), dust: C(S.ground[2]) } : {}) };
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
  };
  const terrain = new Terrain({ size, segs, heightFn, colorFn, splatFn, textures: { ...TX, rock: TX.cliff, cobble: S.pave === 'cobble' ? TX.cobble : TX.concrete } });
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
    music: 'zeelich', cloudY: CLOUD_Y,
    env: { fog: '#efcade', sun: '#fff0dc', hemiSky: '#f8e2ff', hemiGround: '#a07c9c', sunI: 2.5, hemiI: 1.3, fogRange: [85, 300], ...(S.env || {}) },
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
  const B = new Batch(group);
  const walls = (S.walls || ['#fbf0f0', '#f1e2f6', '#f8e8d8', '#e6f0f4', '#f6dce6']).map((c) => tm('plasterWall', { color: c, rough: 0.95 }));
  // (each dome colour its own material: kit.tm keys a texture by name, which made all four the first one)
  const domes = (S.domes || [['#8a5ac0', '#e8c8ff'], ['#2f8a9a', '#a8e8ee'], ['#c84a7a', '#ffc8dc'], ['#d89a30', '#ffe6a8']]).map(([a, b]) => EP.cm(domeTex(a, b), { rough: 0.4 }));
  const deckM = tm('deck', { color: '#e0d8e8', rough: 0.65, metal: 0.25 });
  const plankM = tm('planks', { color: '#d8b080' });
  const stoneM = tm('stone', { color: '#ecdce4' });
  const brass = brassM();
  const jarM = pm('#d87a5a', 0.6);
  const winM = pm('#3a3050', 0.35, { emissive: '#5a4060', emissiveIntensity: 0.25 });
  const domeGeo = cached('isle-dome', () => lathe([[1.0, 0], [1.08, 0.25], [1.02, 0.6], [0.7, 0.95], [0.32, 1.2], [0.04, 1.42]], 16, 1));
  const spireGeo = cached('isle-spire', () => lathe([[0.5, 0], [0.42, 0.1], [0.3, 0.5], [0.22, 0.85], [0.16, 0.97], [0.0, 1.0]], 10));
  const trees = [[], []], rocks = [[], [], []], bushes = [], plants = [];
  const pick = (o, list) => list[o.body % list.length];
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
  const landFrac = (o) => { let n = 0, t = 0; for (const a of [-0.4, 0, 0.4]) for (const b of [-0.4, 0, 0.4]) { t++; if (raw(o.x + a * o.sx, o.z + b * o.sz) != null) n++; } return n / t; };
  for (const o of A.decor) {
    const y0 = o.y, top = o.y + o.sy, ex = Math.max(0.2, o.sx), ez = Math.max(0.2, o.sz);
    if (o.shape === 'skip') continue;   // (drawn by the style's own piece, or left out: a rail, a beam)
    if (!o.solid && o.shape !== 'deck' && Math.hypot(o.x - pad.x, o.z - pad.z) < 4.2 + Math.max(o.sx, o.sz) / 2) continue;   // (under the shuttle's pad)
    // (a small thing standing on a steep slope gets no block: he would slide into it and be held there)
    const gi = Math.round(gx(o.x)), gj = Math.round(gz(o.z));
    let onSteep = false; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const ii = gi + a, jj = gj + b; if (ii >= 0 && jj >= 0 && ii < L.nx && jj < L.nz && A.steep[jj * L.nx + ii]) onSteep = true; }
    const small = (c) => { if (!onSteep) col(c); };
    const shape = o.shape === 'house' && o.sy > 3 && landFrac(o) < 0.35 ? 'hulk'
      : o.shape === 'house' && G && o.x - ex / 2 < G.x1 && o.x + ex / 2 > G.x0 && o.z - ez / 2 < G.z0 && o.z + ez / 2 > G.z1 ? 'gate' : o.shape;
    switch (shape) {
      case 'hulk': {   // a big object standing in the clouds by a quay: a moored barge
        const along = ez >= ex, P = new EP.Place(B, o.x, S.hulk ? S.hulk.y : CLOUD_Y + 0.4, o.z, along ? 0 : Math.PI / 2);
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
        B.add(bbox(ex * 0.8, o.sy, ez * 0.8, 0.06, 1.8), stoneM, o.x, y0 + o.sy / 2, o.z);
        break;
      }
      case 'block': {   // a fallen block of the old wall
        const a = (o.beta / 4096) * Math.PI * 2;
        B.add(bbox(ex, o.sy, ez, 0.08, 1.8), stoneM, o.x, y0 + o.sy / 2 - 0.08, o.z, 0.06, a, 0.04);
        small({ type: 'box', x: o.x, z: o.z, hw: ex * 0.45, hd: ez * 0.45, rot: a, top: y0 + o.sy - 0.1, noStand: o.sy > 0.5 });
        break;
      }
      case 'gate': {   // a gatehouse: its two halves either side of the causeway, a lintel and a roof over the passage
        const wallH = o.sy > 4.5 ? o.sy * 0.62 : o.sy, m = pick(o, walls);
        for (const [z0, z1] of [[o.z - ez / 2, G.z0], [G.z1, o.z + ez / 2]]) {
          const dz = z1 - z0; if (dz < 0.4) continue;
          B.add(bbox(ex - 0.15, wallH, dz, 0.06, 2.2), m, o.x, y0 + wallH / 2, (z0 + z1) / 2);
          col({ type: 'box', x: o.x, z: (z0 + z1) / 2, hw: ex / 2 - 0.05, hd: dz / 2 - 0.02, top, noStand: true });
        }
        const lh = Math.max(0.5, wallH - 2.5);
        B.add(bbox(ex - 0.15, lh, G.z0 - G.z1 + 0.1, 0.05, 2.2), m, o.x, y0 + wallH - lh / 2, (G.z0 + G.z1) / 2);
        B.add(bbox(ex + 0.1, 0.22, ez + 0.1, 0.05, 1.6), stoneM, o.x, y0 + wallH + 0.11, o.z);
        for (const sx of [-1, 1]) B.add(bbox(0.16, 0.3, G.z0 - G.z1 + 0.5, 0.03, 1), stoneM, o.x + sx * (ex / 2 - 0.02), y0 + wallH - lh - 0.15, (G.z0 + G.z1) / 2);
        if (o.sy > 4.5) { const rr = Math.min(ex, ez) * 0.42, dh = (o.sy - wallH - 0.22) / 1.42; B.add(domeGeo, pick(o, domes), o.x, y0 + wallH + 0.22, o.z, 0, 0, 0, rr, Math.max(0.3, dh), rr); }
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
        B.add(bbox(ex - 0.15, wallH, ez - 0.15, 0.06, 2.2), pick(o, walls), o.x, y0 + wallH / 2, o.z);
        B.add(bbox(ex + 0.1, 0.22, ez + 0.1, 0.05, 1.6), stoneM, o.x, y0 + wallH + 0.11, o.z);
        if (o.sy > 4.5) {
          const rr = Math.min(ex, ez) * 0.42, dh = (o.sy - wallH - 0.22) / 1.42;
          B.add(domeGeo, pick(o, domes), o.x, y0 + wallH + 0.22, o.z, 0, 0, 0, rr, Math.max(0.3, dh), rr);
          B.add(cyl(0.05, 0.05, 0.6, 6), brass, o.x, top - 0.1, o.z);
        }
        // a door on the side facing the island's middle, and a few windows
        const toward = Math.abs(A.mid.x - o.x) > Math.abs(A.mid.z - o.z) ? [Math.sign(A.mid.x - o.x), 0] : [0, Math.sign(A.mid.z - o.z)];
        const dx = toward[0] * (ex / 2 - 0.02), dz = toward[1] * (ez / 2 - 0.02);
        B.add(bbox(toward[0] ? 0.12 : 1.0, Math.min(2.0, wallH * 0.8), toward[1] ? 0.12 : 1.0, 0.02), plankM, o.x + dx, y0 + Math.min(2.0, wallH * 0.8) / 2, o.z + dz);
        // round-topped windows: a dark pane in a pale frame, along each wall at 1.6 m
        if (wallH > 2.4) for (const [nx, nz, len] of [[1, 0, ez], [-1, 0, ez], [0, 1, ex], [0, -1, ex]]) {
          const n = Math.max(0, Math.floor((len - 1.2) / 2.2));
          for (let q = 0; q < n; q++) {
            const u = (q - (n - 1) / 2) * 2.2, wx = o.x + (nx ? nx * (ex / 2 - 0.04) : u), wz = o.z + (nz ? nz * (ez / 2 - 0.04) : u);
            if ((nx === toward[0] && nz === toward[1]) && Math.abs(u) < 1.0) continue;   // (not over the door)
            B.add(bbox(nx ? 0.1 : 0.7, 0.95, nz ? 0.1 : 0.7, 0.02), winM, wx, y0 + Math.min(wallH - 0.7, 1.9), wz);
          }
        }
        col({ type: 'box', x: o.x, z: o.z, hw: ex / 2 - 0.05, hd: ez / 2 - 0.05, top, noStand: true });
        break;
      }
      case 'tower': {
        const rr = Math.min(ex, ez) * 0.48;
        B.add(cyl(rr * 0.85, rr, o.sy * 0.78, 12, 2), pick(o, walls), o.x, y0 + o.sy * 0.39, o.z);
        B.add(domeGeo, pick(o, domes), o.x, y0 + o.sy * 0.78, o.z, 0, 0, 0, rr * 0.95, (o.sy * 0.22) / 1.42, rr * 0.95);
        // brass bands, slit windows, a door toward the landing (a watchtower, not a plain drum)
        const H0 = o.sy * 0.78;
        for (const f of [0.08, 0.5, 0.97]) { const rf = rr - (rr * 0.15) * f; B.add(cached('isle-tband' + rf.toFixed(2), () => new THREE.TorusGeometry(rf + 0.03, 0.07, 4, 24).rotateX(Math.PI / 2)), brass, o.x, y0 + H0 * f, o.z); }
        const sp = plan.spawn || pad, da = Math.atan2(sp.x - o.x, sp.z - o.z);
        for (let q = 0; q < 6; q++) { const a = da + Math.PI / 6 + (q / 6) * Math.PI * 2, y = y0 + H0 * 0.72, rf = rr - rr * 0.15 * 0.72; B.add(bbox(0.36, 1.1, 0.14, 0.03), winM, o.x + Math.sin(a) * (rf - 0.02), y, o.z + Math.cos(a) * (rf - 0.02), 0, a); }
        B.add(bbox(1.2, 2.1, 0.16, 0.03), plankM, o.x + Math.sin(da) * (rr - 0.04), y0 + 1.05, o.z + Math.cos(da) * (rr - 0.04), 0, da);
        B.add(bbox(1.5, 0.22, 0.3, 0.03, 1), stoneM, o.x + Math.sin(da) * rr, y0 + 2.2, o.z + Math.cos(da) * rr, 0, da);
        col({ type: 'cyl', x: o.x, z: o.z, r: rr, top, noStand: true });
        break;
      }
      case 'wall': {
        B.add(bbox(ex, o.sy, ez, 0.04, 2.2), stoneM, o.x, y0 + o.sy / 2, o.z);
        col({ type: 'box', x: o.x, z: o.z, hw: ex / 2, hd: ez / 2, top, noStand: o.sy > 1.2 });
        break;
      }
      case 'deck': case 'slab': {
        const t = Math.max(0.12, o.sy);
        B.add(bbox(ex, t, ez, 0.04, 2), o.shape === 'deck' ? deckM : stoneM, o.x, top - t / 2, o.z);
        // posts down to the ground (or into the clouds) under a deck that stands clear of it
        const g = tgy(o.x, o.z);
        if (A.floorAt && o.shape === 'deck') {   // (the Lift Dock: timber stilts every few metres, down into the clouds)
          const nxp = Math.max(2, Math.round(ex / 4) + 1), nzp = Math.max(2, Math.round(ez / 4) + 1), hh = top - t - (CLOUD_Y - 2);
          for (let a = 0; a < nxp; a++) for (let b = 0; b < nzp; b++) B.add(cyl(0.2, 0.26, hh, 8), plankM, o.x - ex / 2 + 0.35 + (a / (nxp - 1)) * (ex - 0.7), CLOUD_Y - 2 + hh / 2, o.z - ez / 2 + 0.35 + (b / (nzp - 1)) * (ez - 0.7));
        } else if (top - g > 1.0) for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const px = o.x + sx * (ex / 2 - 0.3), pz = o.z + sz * (ez / 2 - 0.3), pg = Math.max(gy(px, pz), CLOUD_Y - 2);
          if (top - t - pg > 0.3) B.add(cyl(0.12, 0.14, top - t - pg, 8), brass, px, pg + (top - t - pg) / 2, pz);
        }
        // a walkable floor (held by its top) that one can pass under when it is high enough
        col({ type: 'box', x: o.x, z: o.z, hw: ex / 2, hd: ez / 2, top, bottom: top - t - 0.05 });
        break;
      }
      case 'spire': {
        const rr = Math.max(0.25, Math.min(ex, ez) * 0.45);
        B.add(spireGeo, pick(o, walls), o.x, y0, o.z, 0, 0, 0, rr * 2, o.sy, rr * 2);
        col({ type: 'cyl', x: o.x, z: o.z, r: rr * 0.8, top, noStand: true });
        break;
      }
      case 'lamp': {
        B.add(cyl(0.07, 0.09, o.sy - 0.4, 8), brass, o.x, y0 + (o.sy - 0.4) / 2, o.z);
        B.add(cached('isle-lamp', () => new THREE.SphereGeometry(0.22, 12, 8)), pm('#fff4d8', 0.3, { emissive: '#ffd890', emissiveIntensity: 1.2 }), o.x, top - 0.25, o.z);
        col({ type: 'cyl', x: o.x, z: o.z, r: 0.2, top, noStand: true });
        break;
      }
      case 'tree': trees[o.body % 2].push(o); col({ type: 'cyl', x: o.x, z: o.z, r: 0.3, top, noStand: true }); break;
      case 'rock': rocks[o.body % 3].push(o); small({ type: 'box', x: o.x, z: o.z, hw: ex * 0.4, hd: ez * 0.4, top: y0 + o.sy * 0.85, noStand: o.sy > 1.2 }); break;
      case 'crate': {
        B.add(bbox(ex * 0.9, o.sy, ez * 0.9, 0.04, 1), plankM, o.x, y0 + o.sy / 2, o.z);
        if (Math.max(ex, ez) >= 0.5) small({ type: 'box', x: o.x, z: o.z, hw: ex * 0.45, hd: ez * 0.45, top, noStand: o.sy > 1.2 });
        break;
      }
      case 'jar': {
        const rr = Math.min(ex, ez) * 0.45;
        B.add(cached('isle-jar', () => lathe([[0.0, 0], [0.7, 0.05], [1.0, 0.4], [0.85, 0.8], [0.45, 0.92], [0.5, 1.0], [0, 1.0]], 12)), jarM, o.x, y0, o.z, 0, 0, 0, rr, o.sy, rr);
        if (Math.max(ex, ez) >= 0.5) small({ type: 'cyl', x: o.x, z: o.z, r: rr, top, noStand: o.sy > 1.2 });
        break;
      }
      case 'fence': {
        // posts and two rails along its length
        const along = ex > ez, len = along ? ex : ez, n = Math.max(2, Math.round(len / 1.2) + 1), h = Math.min(o.sy, 1.3);
        for (let q = 0; q < n; q++) { const u = -len / 2 + (q / (n - 1)) * len; B.add(cyl(0.06, 0.07, h, 6), plankM, o.x + (along ? u : 0), y0 + h / 2, o.z + (along ? 0 : u)); }
        for (const ry of [h * 0.45, h * 0.9]) B.add(bbox(along ? len : 0.07, 0.08, along ? 0.07 : len, 0.02), plankM, o.x, y0 + ry, o.z);
        small({ type: 'box', x: o.x, z: o.z, hw: Math.max(0.12, ex / 2), hd: Math.max(0.12, ez / 2), top: y0 + h, noStand: true });
        break;
      }
      case 'bush': bushes.push(o); if (Math.max(ex, ez) >= 0.5) small({ type: 'cyl', x: o.x, z: o.z, r: Math.min(ex, ez) * 0.35, top, noStand: true, seeThrough: true }); break;
      default: plants.push(o);
    }
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
  };
  const groundUnder = (x, z, rr) => { if (A.floorAt) return gy(x, z); let y = gy(x, z); for (let q = 0; q < 6; q++) { const a = (q / 6) * Math.PI * 2; y = Math.min(y, gy(x + Math.sin(a) * rr, z + Math.cos(a) * rr)); } return y; };
  let pieces = 0;
  for (const it of plan.items) {
    if (it.kind === 'pipe') {
      const pc = []; EP.pipeRun(B, it.pts.map((p) => [p.x, gy(p.x, p.z) + p.h, p.z]), { cols: pc, gy }); for (const c of pc) col(c); pieces++; continue;
    }
    if (it.kind === 'skiff') {
      const g = EP.skiff(group, it.x, CLOUD_Y + 0.15, it.z, it.ry, it.o.color), ph = it.x * 0.7;
      updaters.push((dt, t) => { g.position.y = CLOUD_Y + 0.15 + Math.sin(t * 0.9 + ph) * 0.12; g.rotation.z = Math.sin(t * 0.7 + ph) * 0.04; }); pieces++; continue;
    }
    const f = BUILD[it.kind]; if (!f) continue;
    const fr = FOOT[it.kind]?.(it.o) || { r: 0.5 };
    const P = new EP.Place(B, it.x, groundUnder(it.x, it.z, Math.min(1.2, (fr.r ?? Math.max(fr.hw, fr.hd)) * 0.6)), it.z, it.ry);
    f(P, it.o || {});
    for (const c of P.cols) col(c);
    for (const e of P.extra) { group.add(e.obj); updaters.push(e.update); }
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
          B.add(bbox(hw * 2, hgt, hd * 2, 0.03, 1.4), plankM, mx, y - hgt / 2, mz);
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
  B.build();
  // instanced pieces, each scaled to its object's box (by the geometry's own size)
  const fit = (geo, list, mat, ys = 1) => {
    if (!list.length) return;
    geo.computeBoundingBox(); const b = geo.boundingBox, gw = b.max.x - b.min.x, gh = b.max.y - b.min.y, gd = b.max.z - b.min.z;
    instances(group, geo, mat, list.map((o) => ({ x: o.x, y: o.y - b.min.y * (o.sy / gh) * ys, z: o.z, ry: (o.beta / 4096) * Math.PI * 2, sx: Math.max(0.3, o.sx) / gw, sy: (o.sy / gh) * ys, sz: Math.max(0.3, o.sz) / gd, color: new THREE.Color(S.trees || '#fff0ff').multiplyScalar(0.9 + r() * 0.15) })));
  };
  const vc = pm('#ffffff', 0.85, { vertexColors: true });
  fit(treeGeometry('round', 3), trees[0], vc); fit(treeGeometry('tall', 2), trees[1], vc); fit(treeGeometry('bush', 1), bushes, vc);
  fit(treeGeometry('bush', 2), plants, vc);
  const rockMat = pm('#ffffff', 0.9, { vertexColors: true, emissive: '#3a2030', emissiveIntensity: 0.4 });
  rocks.forEach((list, v) => fit(rockGeometry(v + 1), list, rockMat));

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
  const lk = plan.pois[0]?.at || (S.grand && plan.pois[0]?.word === S.target?.word ? S.grand : null) || plan.pois[0];
  R.landmark = p0 ? { x: ox + p0.x, z: oz + p0.z, word: plan.pois[0].word, look: { x: ox + lk.x, z: oz + lk.z } } : null;
  R.pois = plan.pois.filter((p) => p.reach).map((p) => ({ x: ox + p.reach.x, z: oz + p.reach.z, word: p.word }));
  R.dressing = pieces; R.rails = rails;
  // LBA2's zone givers: a hop on the spot shakes out a bonus, once (game.giverHop; ids kept in the save)
  R.givers = (plan.givers || []).map((g, i) => ({ id: name + '-' + i, x: ox + g.x, z: oz + g.z, y: g.y, r: 1.1, kinds: g.kinds, n: g.n }));
  R.board = plan.board ? { x: ox + plan.board.x, z: oz + plan.board.z } : null;
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
    mk(cloudTex(true), CLOUD_Y - 2.5, 14, '#ffffff', 1, 0.0012, false);
    mk(cloudTex(false), CLOUD_Y, 10, '#ffffff', 0.9, 0.002, true);
    mk(cloudTex(false), CLOUD_Y + 1.1, 6, '#fff0f6', 0.45, -0.0015, true);
    const puffM = new THREE.SpriteMaterial({ map: puffTex(), color: '#fff4f8', transparent: true, depthWrite: false, fog: true, opacity: 0.8 });
    const puffs = [];
    for (let j = 0; j < L.nz; j += 4) for (let i = 0; i < L.nx; i += 4) {
      const k = j * L.nx + i; if (H[k] != null) continue;
      // sea next to land
      let near = false; for (let b = -3; b <= 3 && !near; b++) for (let a = -3; a <= 3; a++) { const m = (j + b) * L.nx + (i + a); if (i + a >= 0 && j + b >= 0 && i + a < L.nx && j + b < L.nz && H[m] != null) { near = true; break; } }
      if (!near || r() < 0.4) continue;
      const sp = new THREE.Sprite(puffM); const s = 5 + r() * 6, y = CLOUD_Y + 0.6 + r() * 1.5;
      sp.position.set(cx(i) + (r() - 0.5) * 4, y, cz(j) + (r() - 0.5) * 4); sp.scale.set(s * 1.6, s, 1); group.add(sp); puffs.push({ sp, y, ph: r() * 6 });
    }
    updaters.push((dt, t) => { for (const p of puffs) p.sp.position.y = p.y + Math.sin(t * 0.25 + p.ph) * 0.4; });
    shuttleTraffic(group, updaters, { cx: 0, cz: 0, y: 30 + L.maxH, r: Math.max(w, d) * 0.7 + 30, n: 2, speed: 0.04 });
  }
  return R;
}
