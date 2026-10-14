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

export const ISLES = ['otringal', 'knartas', 'mosquibee', 'celebration', 'undergas', 'cxislet', 'platform'];
// far from every other region and from each other (the biggest patch is ≈ 210 m across)
export const ISLE_AT = (i) => ({ x: 1900 + i * 330, z: 1800 });
const SEA = -9;            // the ground under the clouds, past every island's edge
const SHORE = -0.5;        // the sea next to land: just under the waterline (physics WATER_FLOOR -0.35)
const CLOUD_Y = -1.4;      // the sea of clouds, just under the original's level 0
const MARGIN = 14;         // cells of sea round the island's grid

const LAYOUTS = {};
export async function preloadIslands(names = ISLES) {
  await Promise.all(names.map(async (n) => {
    try { const r = await fetch(`assets/lba2/islands/${n}.json`); if (r.ok) LAYOUTS[n] = await r.json(); } catch { /* the island is left out */ }
  }));
}
export const hasIsland = (n) => !!LAYOUTS[n];

export function buildIslands(scene, physics) {
  const out = {};
  ISLES.forEach((n, i) => { if (LAYOUTS[n]) out['isle_' + n] = buildIsland(scene, physics, n, LAYOUTS[n], ISLE_AT(i)); });
  return out;
}

// ================================================================== layout analysis (on the data grid)
// heights in metres (sea = null); the objects with a footprint the hero can't walk through; the landing pad:
// the clearest flat spot of the biggest walkable area, nearest its middle
function analyse(L) {
  const { nx, nz, cell } = L, w = (nx - 1) * cell, d = (nz - 1) * cell;
  const H = new Array(nx * nz);
  for (let k = 0; k < nx * nz; k++) H[k] = L.heights[k] > 0 ? L.heights[k] / 100 : null;
  const gx = (x) => (x + w / 2) / cell, gz = (z) => (z + d / 2) / cell;
  const cx = (i) => -w / 2 + i * cell, cz = (j) => -d / 2 + j * cell;
  const decor = L.decor.map(([x, z, y, sx, sy, sz, beta, kind, body]) => ({ x, z, y, sx, sy, sz, beta, kind, body }));
  for (const o of decor) o.shape = shapeOf(o);
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
  const score = sizes.map((n, k) => n + objs[k] * 6), main = score.indexOf(Math.max(...score));
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
  return { w, d, H, steep, decor, comp, main, clear, cx, cz, gx, gz, pad: { x: cx(pi), z: cz(pj), y: ph / pn, toward: Math.atan2(mx - cx(pi), mz - cz(pj)) }, mid: { x: mx, z: mz } };
}

// what our piece for an original object is, by its size (the original's look isn't used)
function shapeOf(o) {
  const big = Math.max(o.sx, o.sz), small = Math.min(o.sx, o.sz), h = rng((o.body + 1) * 7919)();
  let s;
  if (o.kind === 'building') {
    if (o.sy < 1.0) s = 'deck';
    else if (small < 1.3) s = 'wall';
    else if (o.sy > 2.2 * big) s = 'tower';
    else s = 'house';
  } else if (o.kind === 'tall') s = o.sy > 5.5 ? 'spire' : h < 0.5 ? 'tree' : 'lamp';
  else if (o.kind === 'small') s = 'plant';
  else if (small < 0.45 && big > 0.9) s = 'fence';
  else s = o.sy < 0.45 ? 'slab' : o.sy < 0.75 * big ? (h < 0.4 ? 'crate' : 'rock') : h < 0.5 ? 'bush' : 'jar';
  o.solid = s !== 'plant' && s !== 'slab' && !(s === 'deck') && (big >= 0.5 || s === 'tree' || s === 'spire' || s === 'lamp');
  return s;
}

// ================================================================== ground colours (Zeelich's palette)
const C = (c) => new THREE.Color(c);
const COL = { turf: C('#f4ecb8'), turf2: C('#e4e8a8'), rock: C('#d8b4c4'), rockHi: C('#ecd0d4'), dust: C('#e8d4c0'), rim: C('#c8a0b8') };

// ================================================================== one island
function buildIsland(scene, physics, name, L, at) {
  const ox = at.x, oz = at.z;
  const A = analyse(L), { w, d, H, cx, cz, gx, gz, pad } = A;
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
  };
  const splatFn = (x, z, h, slope, wt) => {
    wt[0] = 1; wt[1] = 0; wt[2] = 0; wt[3] = 0; wt[4] = 0;
    const rk = h < -0.5 ? 1 : smoothstep(0.65, 1.2, slope);
    wt[2] = rk; wt[0] = 1 - rk;
    if (h >= -0.5 && h < 0.8) { wt[1] = smoothstep(0.8, 0.2, h) * 0.8; }
    const pd = Math.hypot(x - pad.x, z - pad.z);
    if (pd < 5.5) { wt[4] = smoothstep(5.5, 4.2, pd) * 2; }
  };
  const terrain = new Terrain({ size, segs, heightFn, colorFn, splatFn, textures: { ...TX, rock: TX.cliff, cobble: TX.concrete } });
  group.add(terrain.mesh);
  physics.terrain.addPatch(terrain, ox, oz);
  const gy = (x, z) => terrain.heightAt(x, z);
  // a high edge over the clouds: the ground between the last land and the sea is a cliff face, too steep to stand
  // on (he would slide to the waterline and be held there). Each grid square with land and sea corners whose land
  // is more than a step above the sea is closed by a low invisible block, so he stops at the brink.
  let edges = 0;
  for (let j = 0; j < L.nz - 1; j++) for (let i = 0; i < L.nx - 1; i++) {
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
    env: { fog: '#efcade', sun: '#fff0dc', hemiSky: '#f8e2ff', hemiGround: '#a07c9c', sunI: 2.5, hemiI: 1.3, fogRange: [85, 300] },
    terrain, H: (x, z) => terrain.heightAt(x - ox, z - oz),
    land: (x, z) => land(x - ox, z - oz),
    size: [w, d], objects: A.decor.length, edges,
    // points of the main walkable area, 5 m apart and clear of objects (tests/zislands.mjs walks them)
    sample: [], walk: 0,
  };
  for (let k = 0; k < L.nx * L.nz; k++) if (A.comp[k] === A.main) R.walk += cell * cell;   // (m² of the main area)
  for (let j = 0; j < L.nz; j += 3) for (let i = 0; i < L.nx; i += 3) { const k = j * L.nx + i; if (A.comp[k] === A.main && A.clear[k] >= 1.5) R.sample.push({ x: ox + cx(i), z: oz + cz(j) }); }
  R.env.fogColor = new THREE.Color(R.env.fog);

  // --- the objects, as our pieces
  const B = new Batch(group);
  const walls = ['#fbf0f0', '#f1e2f6', '#f8e8d8', '#e6f0f4', '#f6dce6'].map((c) => tm('plasterWall', { color: c, rough: 0.95 }));
  const domes = [['#8a5ac0', '#e8c8ff'], ['#2f8a9a', '#a8e8ee'], ['#c84a7a', '#ffc8dc'], ['#d89a30', '#ffe6a8']].map(([a, b]) => tm(domeTex(a, b), { rough: 0.4 }));
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
  for (const o of A.decor) {
    const y0 = o.y, top = o.y + o.sy, ex = Math.max(0.2, o.sx), ez = Math.max(0.2, o.sz);
    // (a small thing standing on a steep slope gets no block: he would slide into it and be held there)
    const gi = Math.round(gx(o.x)), gj = Math.round(gz(o.z));
    let onSteep = false; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const ii = gi + a, jj = gj + b; if (ii >= 0 && jj >= 0 && ii < L.nx && jj < L.nz && A.steep[jj * L.nx + ii]) onSteep = true; }
    const small = (c) => { if (!onSteep) col(c); };
    switch (o.shape) {
      case 'house': {
        const wallH = o.sy > 4.5 ? o.sy * 0.62 : o.sy;
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
        const g = gy(o.x, o.z);
        if (top - g > 1.0) for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
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
  B.build();
  // instanced pieces, each scaled to its object's box (by the geometry's own size)
  const fit = (geo, list, mat, ys = 1) => {
    if (!list.length) return;
    geo.computeBoundingBox(); const b = geo.boundingBox, gw = b.max.x - b.min.x, gh = b.max.y - b.min.y, gd = b.max.z - b.min.z;
    instances(group, geo, mat, list.map((o) => ({ x: o.x, y: o.y - b.min.y * (o.sy / gh) * ys, z: o.z, ry: (o.beta / 4096) * Math.PI * 2, sx: Math.max(0.3, o.sx) / gw, sy: (o.sy / gh) * ys, sz: Math.max(0.3, o.sz) / gd, color: new THREE.Color('#fff0ff').multiplyScalar(0.9 + r() * 0.15) })));
  };
  const vc = pm('#ffffff', 0.85, { vertexColors: true });
  fit(treeGeometry('round', 3), trees[0], vc); fit(treeGeometry('tall', 2), trees[1], vc); fit(treeGeometry('bush', 1), bushes, vc);
  fit(treeGeometry('bush', 2), plants, vc);
  const rockMat = pm('#ffffff', 0.9, { vertexColors: true, emissive: '#3a2030', emissiveIntensity: 0.4 });
  rocks.forEach((list, v) => fit(rockGeometry(v + 1), list, rockMat));

  // --- the shuttle pad and the shuttle (the way back: src/game/story/islands.js)
  {
    const py = gy(pad.x, pad.z);
    const disc = new THREE.Mesh(cached('isle-pad', () => new THREE.CylinderGeometry(3.6, 3.8, 0.25, 24)), pm('#8a8f9a', 0.7, { metalness: 0.2 }));
    disc.position.set(pad.x, py + 0.1, pad.z); disc.receiveShadow = true; group.add(disc);
    const ring = new THREE.Mesh(cached('isle-ring', () => new THREE.TorusGeometry(3.2, 0.07, 6, 32)), pm('#e8c040', 0.5)); ring.rotation.x = Math.PI / 2; ring.position.set(pad.x, py + 0.24, pad.z); group.add(ring);
    const sh = esmerShuttle({ landed: true }); sh.position.set(pad.x, py + 0.23, pad.z); sh.rotation.y = pad.toward + Math.PI / 2; group.add(sh);
    col({ type: 'cyl', x: pad.x, z: pad.z, r: 3.2, top: py + 4.4, noStand: true });
    R.pad = { x: ox + pad.x, z: oz + pad.z, y: py };
    // he stands beside it (to one side, so the camera behind him isn't in the hull), facing the island's middle
    let sp = null;
    const tries = []; for (const d of [0, 0.35, -0.35, 0.7, -0.7, 1.05, -1.05, 1.4]) for (const side of [1, -1]) tries.push(pad.toward + side * (Math.PI / 2 + d));
    for (const a of tries) {
      if (sp) break;
      const x = pad.x + Math.sin(a) * 4.8, z = pad.z + Math.cos(a) * 4.8;
      if (land(x, z) && Math.abs(gy(x, z) - py) < 0.5) sp = { x, z, a: pad.toward };
    }
    sp ||= { x: pad.x + Math.sin(pad.toward) * 4.8, z: pad.z + Math.cos(pad.toward) * 4.8, a: pad.toward };
    R.spawn = { x: ox + sp.x, z: oz + sp.z, a: sp.a };
  }

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
