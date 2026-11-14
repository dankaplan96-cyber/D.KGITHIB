// LBA1's rooms, rebuilt in our style from their layouts. assets/lba1/<name>.json holds numbers only, measured from
// the user's LBA1 files in the scratchpad (never the bricks themselves): the room's cells (64×25×64 at most, 512
// units across = 0.87 m, 256 high = 0.43 m), per cell its collision shape (1 solid, 2–5 slopes, 6–13 corner slopes)
// and the average colour of its brick; the hero's start, the actors' spots (with the LBA1 body each stood for) and
// the exit zones. Here the cells become our geometry: exposed faces merged into runs, our stone texture on the sides
// and a plain plaster on the tops, tinted with the measured colours; slopes as ramps; one box collider per merged
// run of solid cells; the walls on the camera's side cut down to a rim, as in our other rooms.
//
//   await preloadLba1Rooms()                       fetch the layouts (before the game is built)
//   buildLba1Room(scene, physics, id, name, cx, cz, opts) → a room (RoomBuilder contract: spawn, exits, …) and
//     R.cell(x, y, z) → world {x, y, z} of a cell's centre; R.layout (the numbers); R.spots (actors, in world)
import * as THREE from 'three';
import { RoomBuilder } from './interiors.js';
import { TEX } from './props.js';

export const CELL = 2.1 / 1240 * 512, CH = 2.1 / 1240 * 256;   // 0.867 m, 0.434 m
const LAYOUTS = {};
export async function preloadLba1Rooms(names = ['asylum', 'bumaze']) {
  await Promise.all(names.map(async (n) => {
    try { const r = await fetch(`assets/lba1/${n}.json`); if (r.ok) LAYOUTS[n] = await r.json(); } catch { /* the room is left out */ }
  }));
}
export const hasLba1Room = (n) => !!LAYOUTS[n];

const SOLID = 1;
// (order 20) a lattice girder's face (white: the cell's colour tints it; the holes cut by alphaTest) and a grate's
// plate (one tile a cell)
let GIRDER_TEX = null, GRATE_TEX = null, GRILLE_TEX = null;
const canvasTex = (S, draw) => { const c = document.createElement('canvas'); c.width = c.height = S; draw(c.getContext('2d'), S); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
const girderTex = () => (GIRDER_TEX ??= canvasTex(64, (x, S) => {
  x.clearRect(0, 0, S, S);
  x.strokeStyle = '#d8d2d2'; x.lineWidth = 6; x.beginPath(); x.moveTo(0, 0); x.lineTo(S, S); x.moveTo(S, 0); x.lineTo(0, S); x.stroke();
  x.fillStyle = '#ece6e6'; x.fillRect(0, 0, 9, S); x.fillRect(S - 9, 0, 9, S); x.fillRect(0, 0, S, 5);
  x.fillStyle = '#9a9090'; x.fillRect(7, 0, 2, S); x.fillRect(S - 9, 0, 2, S); x.fillRect(0, 4, S, 1);
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 3, S);
}));
const grilleTex = () => (GRILLE_TEX ??= canvasTex(64, (x, S) => {
  x.clearRect(0, 0, S, S); x.strokeStyle = '#ffffff'; x.lineWidth = 5;
  for (const o of [-S, 0, S]) { x.beginPath(); x.moveTo(o, 0); x.lineTo(o + S, S); x.moveTo(o + S, 0); x.lineTo(o, S); x.stroke(); }
}));
const grateTex = () => (GRATE_TEX ??= canvasTex(128, (x, S) => {
  x.fillStyle = '#c9d1d0'; x.fillRect(0, 0, S, S);
  for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) {
    const cx = 6 + i * 12.4 + (j % 2) * 6.2, cy = 6 + j * 12.4;
    x.fillStyle = '#e8eeec'; x.beginPath(); x.arc(cx - 0.8, cy - 0.8, 3.6, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#3d4847'; x.beginPath(); x.arc(cx, cy, 3.1, 0, Math.PI * 2); x.fill();
  }
  x.fillStyle = '#7f8988'; x.fillRect(0, 0, S, 3); x.fillRect(0, 0, 3, S);
  x.fillStyle = '#e6ecea'; x.fillRect(0, 3, S, 1); x.fillRect(3, 0, 1, S);
}));
const slopeTop = (shape, u, v) => {   // the top of a slope cell at (u, v) in [0,1]² of the cell (u along x, v along z)
  switch (shape) {
    case 2: return u; case 3: return v; case 4: return 1 - v; case 5: return 1 - u;
    case 6: case 10: return Math.max(u, v) * 0.5 + 0.25; case 7: case 11: return 0.5;
    default: return 0.5;
  }
};

export function buildLba1Room(scene, physics, id, name, cx, cz, opts = {}) {
  const L = LAYOUTS[name];
  const B = new RoomBuilder(scene, physics, id, cx, cz);
  const R = B.room;
  if (!L) { R.spawn = { x: cx, z: cz, a: 0 }; R.missing = true; return B.finish(); }
  const [SX, , SZ] = L.size, ox = -SX * CELL / 2, oz = -SZ * CELL / 2;
  const tint = opts.tint ?? 1.35;
  // the cells: key "x,y,z" → [shape, colour]
  const C = new Map();
  for (const [k, runs] of Object.entries(L.cols)) {
    const [x, z] = k.split(',').map(Number);
    for (const [y, len, shape, col] of runs) for (let i = 0; i < len; i++) C.set(`${x},${y + i},${z}`, [shape, col]);
  }
  // (opts.carve: [x0, y0, z0, x1, y1, z1] cell boxes, inclusive, taken out of the layout: a door broken through)
  for (const [x0, y0, z0, x1, y1, z1] of opts.carve || []) for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) C.delete(`${x},${y},${z}`);
  // the camera's side (+x, +z): a column next to the outside is cut down to two cells above its floor
  const colTop = new Map(), colFloor = new Map();
  for (const [k, runs] of Object.entries(L.cols)) { colFloor.set(k, runs[0][0] + runs[0][1]); colTop.set(k, runs[runs.length - 1][0] + runs[runs.length - 1][1]); }
  const outside = (x, z) => !L.cols[`${x},${z}`];
  // (opts.clear: [x0, z0, x1, z1, y] — the cells of that box at height y and up taken out, drawn and solid: ceiling beams
  //  whose walls and pillars the cut-away took, left hanging over the rooms as slabs over nothing)
  const cleared = (x, y, z) => !!opts.clear && opts.clear.some(([x0, z0, x1, z1, yc]) => y >= yc && x >= x0 && x <= x1 && z >= z0 && z <= z1);
  const cut = (x, y, z) => {
    if (cleared(x, y, z)) return true;
    if (opts.noCut) return false;
    const k = `${x},${z}`, rim = opts.rim ?? 2;
    let f = colFloor.get(k) ?? 0;
    const near = outside(x + 1, z) || outside(x, z + 1) || outside(x + 1, z + 1) || x >= SX - 1 || z >= SZ - 1;
    // (ASYLUM-21, opts.meetFloors: a wall on the camera's side that carries a raised floor beside it — a slab over
    //  nothing, two cells or more above the wall's own floor — keeps its rim over that floor, as LBA1 builds it: cut to
    //  its own floor, it stood 5 cells under the office's edge, and the void under the slab showed as a black slot
    //  between them, its cut top a ledge he walked on)
    if (opts.meetFloors && near) for (const n of [`${x - 1},${z}`, `${x},${z - 1}`]) { const r = L.cols[n]; if (r && r[0][0] - (f + rim) >= 2) f = Math.max(f, colFloor.get(n)); }
    return near && y >= f + rim;
  };
  const solidAt = (x, y, z) => { const c = C.get(`${x},${y},${z}`); return !!c && c[0] === SOLID && !cut(x, y, z); };
  // ---- FITTINGS (ASYLUM-4, opts.fittings): LBA1 draws some cells as things thinner than a cell — its bricks are
  // pictures, the cell only their collision. Two kinds read here as what they are, drawn as such, their colliders kept:
  //  - the hanging lamps: nine slope cells in one pattern (shapes 10 3 13 / 2 1 5 / 12 4 11, a dome over a 3×3),
  //    hanging over a floor (four in the asylum: over the loft, the kitchen counter, the upper walk, the office desk),
  //    and the round tables under them (the same pattern, white); drawn as nine wedges each, they were the "slabs and
  //    wedges floating in mid-air" by the walls
  //  - the pipes: runs of one-cell-thick, grey-teal cells (the brick's colour, green and blue over red) hanging off the
  //    walls and ceilings, three cells or more; drawn as boxes they were 0.87 m beams standing out of the walls
  const art = new Set(), lampAt = [], tableAt = [], pipeSet = new Set();
  // (order 20, opts.hidden: [x0, y0, z0, x1, y1, z1] cell boxes drawn as nothing, their colliders kept: LBA1's cells
  //  without a brick of their own — the asylum's boiler, its body a picture drawn by the bricks in front of it — which
  //  the place draws as what it is)
  for (const [x0, y0, z0, x1, y1, z1] of [...(opts.hidden || []), ...(opts.grilles || []).map(([gx, y0, z0, y1, z1]) => [gx, y0, z0, gx, y1, z1])]) for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) if (C.has(`${x},${y},${z}`)) art.add(`${x},${y},${z}`);
  if (opts.fittings) {
    const LAMP = [10, 3, 13, 2, 1, 5, 12, 4, 11], nine = (x, z, f) => LAMP.every((s, i) => f(x + (i % 3), z + Math.floor(i / 3), s));
    for (const [k, c] of C) {
      if (c[0] !== 10) continue;
      const [x, y, z] = k.split(',').map(Number);
      if (!nine(x, z, (a, b, s) => C.get(`${a},${y},${b}`)?.[0] === s && !C.has(`${a},${y + 1},${b}`))) continue;
      // (hanging: three cells or more of nothing under all of the nine. Under each of the four, seven cells down, the
      //  same nine a cell or less over a floor, white, lit from the top left: its round table — drawn as one, a top on a
      //  pedestal)
      const hanging = nine(x, z, (a, b) => !C.has(`${a},${y - 1},${b}`) && !C.has(`${a},${y - 2},${b}`) && !C.has(`${a},${y - 3},${b}`));
      for (let i = 0; i < 9; i++) art.add(`${x + (i % 3)},${y},${z + Math.floor(i / 3)}`);
      (hanging ? lampAt : tableAt).push([x + 1, y, z + 1]);
    }
    const teal = (k) => { const c = C.get(k); if (!c || art.has(k)) return false; const [r, g, b] = L.pal[c[1]] || [0, 0, 0]; return g - r >= 8 && b - r >= 8 && Math.max(r, g, b) <= 100; };
    const cand = new Set();
    for (const k of C.keys()) {
      if (!teal(k)) continue;
      const [x, y, z] = k.split(',').map(Number), dn = `${x},${y - 1},${z}`, up = `${x},${y + 1},${z}`;
      if ((C.has(dn) && !teal(dn)) || (C.has(up) && !teal(up)) || cut(x, y, z)) continue;   // (hangs: on nothing, under nothing but itself)
      cand.add(k);
    }
    // (a line, not a slab: no more than three of them in its 3×3 at its height, or none on its diagonals — a tee, a cross)
    const line = [...cand].filter((k) => { const [x, y, z] = k.split(',').map(Number); let n = 0, dg = 0; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const h = cand.has(`${x + i},${y},${z + j}`); n += h; if (i && j) dg += h; } return n <= 3 || dg === 0; });
    const ls = new Set(line), done = new Set();
    for (const k of line) {   // (runs of three or more, joined face to face)
      if (done.has(k)) continue;
      const comp = [k], st = [k]; done.add(k);
      while (st.length) { const [x, y, z] = st.pop().split(',').map(Number); for (const [a, b, c] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const n = `${x + a},${y + b},${z + c}`; if (ls.has(n) && !done.has(n)) { done.add(n); comp.push(n); st.push(n); } } }
      if (comp.length >= 3) for (const c of comp) { pipeSet.add(c); art.add(c); }
    }
    // (order 20: a run's bends, valves and joints the colour test missed — a bend's brick half pipe, half the wall
    //  behind it; a valve red — taken into the run they touch when they hang as the run does: nothing under them but
    //  the run, at most one wall beside them, never a floor)
    const greyish = (k) => { const c = C.get(k); if (!c || art.has(k)) return false; const [r, g, b] = L.pal[c[1]] || [0, 0, 0]; return Math.max(r, g, b) <= 104 && Math.max(r, g, b) - Math.min(r, g, b) <= 24; };
    const D6 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    for (let pass = 0; pass < 2; pass++) {
      const add = new Set();
      for (const k of pipeSet) {
        const [x, y, z] = k.split(',').map(Number);
        for (const [a, b, c] of D6) {
          const n = `${x + a},${y + b},${z + c}`; if (pipeSet.has(n) || add.has(n) || !greyish(n) || cut(x + a, y + b, z + c)) continue;
          const dn = `${x + a},${y + b - 1},${z + c}`, up = `${x + a},${y + b + 1},${z + c}`;
          if ((C.has(dn) && !pipeSet.has(dn)) || (C.has(up) && !pipeSet.has(up) && !greyish(up))) continue;
          let side = 0; for (const [p, q] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const m = `${x + a + p},${y + b},${z + c + q}`; if (C.has(m) && !pipeSet.has(m)) side++; }
          if (side <= 1) add.add(n);
        }
      }
      for (const n of add) { pipeSet.add(n); art.add(n); }
    }
    // (order 20: LBA1 draws one pipe over two cells side by side where it runs across a cell boundary; drawn as two runs
    //  joined at every cell they were a ladder. Of two parallel runs side by side the second is left out (not drawn,
    //  its collider kept))
    const E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], K = (p) => p.join(','), sh = (k, b, d) => { const p = k.split(',').map(Number); p[b] += d; return K(p); };
    const drop = new Set();
    for (let a = 0; a < 3; a++) {
      // the runs along a, three cells or more
      const rs = [], at = new Map(), seen = new Set();
      for (const k of pipeSet) {
        if (seen.has(k)) continue;
        let s0 = k; while (pipeSet.has(sh(s0, a, -1))) s0 = sh(s0, a, -1);
        const run = []; for (let c = s0; pipeSet.has(c); c = sh(c, a, 1)) { run.push(c); seen.add(c); }
        if (run.length >= 3) { for (const c of run) at.set(c, rs.length); rs.push(run); }
      }
      rs.forEach((run, i) => {
        if (run.some((c) => drop.has(c))) return;
        for (let b = 0; b < 3; b++) {
          if (b === a) continue;
          const n = new Map(); for (const c of run) { const j = at.get(sh(c, b, -1)); if (j != null && j !== i) n.set(j, (n.get(j) || 0) + 1); }
          for (const [j, m] of n) if (m >= 2 && m >= Math.min(run.length, rs[j].length) * 0.6 && !rs[j].some((c) => drop.has(c))) { for (const c of run) drop.add(c); return; }
        }
      });
    }
    for (const k of drop) pipeSet.delete(k);
    // (and a cell left on its own — no run beside it — is no pipe: a lone joint was a ball in the air)
    for (const k of [...pipeSet]) if (![0, 1, 2].some((b) => pipeSet.has(sh(k, b, 1)) || pipeSet.has(sh(k, b, -1)))) pipeSet.delete(k);
  }
  // ---- GIRDERS (order 20, opts.girders): LBA1's tall maroon posts and the beams between them are lattice girders (an
  //  open truss, a pyramid cap), drawn by bricks over a solid cell; as solid maroon brick columns they read as chimneys.
  //  A maroon cell in a vertical run of three or more, or in a beam of three or more hanging over nothing, is drawn as
  //  an open lattice inset in its cell; its collider is kept
  const girder = new Map();   // key → 'post' | axis index of the beam (0 x, 2 z)
  if (opts.girders) {
    const maroon = (x, y, z) => { const c = C.get(`${x},${y},${z}`); if (!c || c[0] !== SOLID || cut(x, y, z) || art.has(`${x},${y},${z}`)) return false; const [r, g, b] = L.pal[c[1]] || [0, 0, 0], m = Math.max(r, g, b); return r >= g + 8 && r >= b + 8 && m >= 60 && m <= 72; };
    const runOf = (x, y, z, d, ok) => { let s = 0; while (ok(x - d[0] * (s + 1), y - d[1] * (s + 1), z - d[2] * (s + 1))) s++; const out = []; for (let i = -s; ok(x + d[0] * i, y + d[1] * i, z + d[2] * i); i++) out.push([x + d[0] * i, y + d[1] * i, z + d[2] * i]); return out; };
    for (const k of C.keys()) {
      const [x, y, z] = k.split(',').map(Number);
      if (maroon(x, y, z) && runOf(x, y, z, [0, 1, 0], maroon).length >= 3) girder.set(k, 'post');
    }
    for (const k of C.keys()) {
      const [x, y, z] = k.split(',').map(Number); if (girder.has(k) || !maroon(x, y, z)) continue;
      for (const a of [0, 2]) {
        const d = a ? [0, 0, 1] : [1, 0, 0], run = runOf(x, y, z, d, maroon);
        if (run.length >= 3 && run.every(([p, q, r]) => girder.get(`${p},${q},${r}`) === 'post' || !C.has(`${p},${q - 1},${r}`))) { for (const [p, q, r] of run) if (!girder.has(`${p},${q},${r}`)) girder.set(`${p},${q},${r}`, a); }
      }
    }
  }
  const pipeEnds = { turned: 0, flange: 0 };   // (order 20: how the pipes' free ends were finished, R.fittings)
  // (the floodlights on the posts: LBA1 hangs a white reflector on two sides of a post, one or two pale cells beside it;
  //  drawn as cells they were pale cubes stuck to the post's top. A lamp per such column, its colliders kept)
  const postLamps = [];
  if (opts.girders) {
    const seenL = new Set();
    for (const [k, how] of girder) {
      if (how !== 'post') continue;
      const [x, y, z] = k.split(',').map(Number);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ys = [];
        for (const yy of [y, y + 1]) { const n = `${x + dx},${yy},${z + dz}`, c = C.get(n); if (!c || c[0] !== SOLID || art.has(n)) continue; const [r, g, b] = L.pal[c[1]] || [0, 0, 0]; if (Math.min(r, g, b) >= 120 && Math.max(r, g, b) - Math.min(r, g, b) <= 24 && girder.get(`${x},${yy},${z}`) === 'post') ys.push(yy); }
        const lo = `${x + dx},${y - 1},${z + dz}`;
        if (!ys.length || ys[0] !== y || seenL.has(`${x + dx},${z + dz}`) || (C.has(lo) && !art.has(lo))) continue;
        seenL.add(`${x + dx},${z + dz}`); for (const yy of ys) art.add(`${x + dx},${yy},${z + dz}`);
        postLamps.push({ x, z, dx, dz, y: y + ys.length / 2 });
      }
    }
  }
  const wallAt = (x, y, z) => solidAt(x, y, z) && !art.has(`${x},${y},${z}`) && !girder.has(`${x},${y},${z}`);   // (a face's neighbour that hides it)
  // ---- LIDS (ASYLUM-1): LBA1 shows the room the hero is in cut open above him. The original does it with its grid
  // zones (type 3: while the hero is inside the box, a fragment without the ceiling replaces the bricks there). Here a
  // lid is such a box (LBA1 cell coords, [x0, y0, z0, x1, y1, z1] as the zones give them) and `cut` (the cell height from
  // which it is cut away; default its floor y0 + 2, the rim of our other rooms): the cells at or above `cut` over the
  // box's floor (the ceiling, beams), and those of the walls on the camera's side (+x, +z) that stand in front of that
  // floor, up to `near` cells beyond the box, go into meshes of their own that fade out while the hero is inside and
  // back in when he leaves. Colliders are unchanged. opts.lids: [{ box, cut?, near?, sight?, name? }] (sight: also cut
  // while its beams stand between him and the camera); opts.gridZones: the layout's own type-3 zones as lids too;
  // opts.overhead: the ceilings and beams left over (over a walkable floor, at least OVER cells above it) grouped in
  // OVER_CHUNK-cell squares, each cut while it stands between him and the camera (a beam over a corridor need not be
  // over him to hide him).
  const colStack = new Map();   // "x,z" → the top of the column's lowest unbroken stack of cells (its floor or wall top)
  for (const k of Object.keys(L.cols)) {
    const [x, z] = k.split(',').map(Number);
    let y = 0; while (y < 25 && !C.has(`${x},${y},${z}`)) y++;
    while (y < 25 && C.has(`${x},${y},${z}`)) y++;
    colStack.set(k, y);
  }
  const lidDefs = [...(opts.gridZones ? (L.zones || []).filter((zn) => zn.type === 3).map((zn) => ({ box: zn.box, zone: zn.to })) : []), ...(opts.lids || [])];
  const lidOf = new Map();      // "x,y,z" → [lid indices]
  const addLid = (key, i) => { if (!lidOf.has(key)) lidOf.set(key, []); lidOf.get(key).push(i); };
  // (the cells tested on his sight line, key (x·32 + y)·64 + z → their lid: the leftovers', and a `sight` lid's beams)
  const overCell = new Map(), ock = (x, y, z) => (x * 32 + y) * 64 + z;
  const lids = lidDefs.map((d, i) => {
    const [bx0, by0, bz0, bx1, by1, bz1] = d.box, cutY = d.cut ?? by0 + 2, near = d.near ?? 2;
    const X0 = Math.ceil(bx0 - 0.5), X1 = Math.floor(bx1 - 0.5), Z0 = Math.ceil(bz0 - 0.5), Z1 = Math.floor(bz1 - 0.5);
    const inBox = (x, z) => x >= X0 && x <= X1 && z >= Z0 && z <= Z1;
    const floorCol = (x, z) => { const t = colStack.get(`${x},${z}`); return t != null && t <= cutY; };
    const inc = new Set();
    // (walls in front of the floor from the camera: reached from the floor toward +x/+z, in order of x + z)
    for (let s = X0 + Z0; s <= X1 + Z1 + 2 * near; s++) for (let x = X0; x <= X1 + near; x++) {
      const z = s - x; if (z < Z0 || z > Z1 + near) continue;
      const k = `${x},${z}`; if (!colStack.has(k)) continue;
      if (inBox(x, z) && floorCol(x, z)) { inc.add(k); continue; }
      if (!floorCol(x, z) && (inc.has(`${x - 1},${z}`) || inc.has(`${x},${z - 1}`) || inc.has(`${x - 1},${z - 1}`))) inc.add(k);   // (a wall only)
    }
    for (const k of inc) {
      const [x, z] = k.split(',').map(Number);
      for (let y = cutY; y < 25; y++) if (C.has(`${x},${y},${z}`)) {
        addLid(`${x},${y},${z}`, i);
        // (d.sight: the beams over its floor also cut it while they stand between him and the camera, as the leftovers)
        if (d.sight && inBox(x, z) && floorCol(x, z) && !overCell.has(ock(x, y, z))) overCell.set(ock(x, y, z), i);
      }
    }
    return { i, box: [bx0, by0, bz0, bx1, by1, bz1], cut: cutY, zone: d.zone, name: d.name, sight: !!d.sight, cols: inc.size, f: 1, active: false, hold: 0 };
  });
  if (opts.overhead) {   // the ceilings and beams no lid covers: by squares, cut while one is between him and the camera
    const OVER = 4, OVER_CHUNK = 16, chunks = new Map();
    for (const k of Object.keys(L.cols)) {
      const [x, z] = k.split(',').map(Number), f = colStack.get(k);
      let y = f; while (y < 25 && !C.has(`${x},${y},${z}`)) y++;
      if (y >= 25 || y - f < OVER) continue;
      const ci = Math.floor(x / OVER_CHUNK), cj = Math.floor(z / OVER_CHUNK);
      for (; y < 25; y++) {
        const key = `${x},${y},${z}`; if (!C.has(key) || lidOf.has(key) || cleared(x, y, z)) continue;
        // (order 8: a leftover he can stand on — a gallery's floor, a flight of steps up over a room — is a lid of its own,
        //  apart from the beams round it: cut while it hides him below, kept while he stands on it. In one lid with the
        //  beams over it, the beams on his sight line took his own floor away and left him in black void)
        //  (a floor: open above, and a slab over nothing or a step of a flight; a wall's top, with its wall under it, is not)
        let walk = !C.has(`${x},${y - 1},${z}`) || C.get(key)[0] >= 2;
        for (let a = 1; a <= OVER && walk; a++) if (C.has(`${x},${y + a},${z}`)) walk = false;
        const ck = `${ci},${cj}${walk ? ',w' : ''}`;
        if (!chunks.has(ck)) chunks.set(ck, { cells: [], low: 25, i: ci, j: cj });
        const c = chunks.get(ck); c.cells.push(key); c.low = Math.min(c.low, y);
      }
    }
    for (const c of chunks.values()) {
      const { i, j } = c, n = lids.length;
      lids.push({ i: n, box: [i * OVER_CHUNK, 0, j * OVER_CHUNK, (i + 1) * OVER_CHUNK, 25, (j + 1) * OVER_CHUNK], cut: c.low, over: true, cells: c.cells.length, f: 1, active: false, hold: 0 });
      for (const key of c.cells) { addLid(key, n); const [x, y, z] = key.split(',').map(Number); overCell.set(ock(x, y, z), n); }
    }
  }
  const sigOf = (x, y, z) => { const l = lidOf.get(`${x},${y},${z}`); return l ? l.join('+') : ''; };
  // a face between two solid cells is drawn when they are cut away apart (a lid's cell against the room's own: the
  // room's face, which shows when the lid is gone; two lids: both)
  const faceShown = (x, y, z, nx, ny, nz) => {
    if (!wallAt(nx, ny, nz)) return true;
    const a = sigOf(x, y, z), b = sigOf(nx, ny, nz);
    return a !== b && b !== '';
  };
  const pal = L.pal.map(([r, g, b]) => new THREE.Color(Math.min(1, r / 255 * tint * 1.25), Math.min(1, g / 255 * tint * 1.25), Math.min(1, b / 255 * tint * 1.25)).convertSRGBToLinear());

  // ---- faces: per direction, runs of exposed faces of one colour merged along x
  const bufs = new Map();   // signature ('' the room, else its lids) → { pos, nrm, colr, uv } per kind
  let pos, nrm, colr, uv;
  const useSig = (sig) => {
    if (!bufs.has(sig)) { const k4 = () => ({ side: [], top: [], pipe: [], glow: [], girder: [], grate: [], pool: [], grille: [] }); bufs.set(sig, { pos: k4(), nrm: k4(), colr: k4(), uv: k4() }); }
    ({ pos, nrm, colr, uv } = bufs.get(sig));
  };
  useSig('');
  const quad = (kind, a, b, c, d, n, col, uvs) => {
    for (const p of [a, b, c, a, c, d]) pos[kind].push(p[0], p[1], p[2]);
    for (let i = 0; i < 6; i++) { nrm[kind].push(n[0], n[1], n[2]); colr[kind].push(col.r, col.g, col.b); }
    for (const t of [uvs[0], uvs[1], uvs[2], uvs[0], uvs[2], uvs[3]]) uv[kind].push(t[0], t[1]);
  };
  const W = (x, y, z) => [ox + x * CELL, y * CH, oz + z * CELL];
  const cells = [...C.entries()].map(([k, v]) => { const [x, y, z] = k.split(',').map(Number); return { x, y, z, shape: v[0], col: v[1] }; });
  // (order 20, opts.grate: LBA1's walks, landings and stairs are teal metal grates (a brick of fine holes), its rooms
  //  dark flagstones: a teal top is drawn as a grate, not in the floors' cream plaster that made them pale mint)
  const tealTop = (ci) => { const [r, g, b] = L.pal[ci] || [0, 0, 0]; return !!opts.grate && g - r >= 16 && b - r >= 16; };
  const gridUV = (pts) => pts.map((p) => [p[0] / CELL, p[2] / CELL]);
  // (order 20, opts.capWalls: the top of a wall — a solid cell on a solid cell, one or two cells across — in the walls'
  //  stone, as LBA1 caps every wall in brick: in the floors' plaster the walls' tops read as more floor)
  const topOpen = (x, y, z) => wallAt(x, y, z) && !wallAt(x, y + 1, z);
  const across = (x, y, z, dx, dz) => { let n = 1; for (let s = 1; s <= 3 && topOpen(x + dx * s, y, z + dz * s); s++) n++; for (let s = 1; s <= 3 && topOpen(x - dx * s, y, z - dz * s); s++) n++; return n; };
  const capped = (x, y, z) => !!opts.capWalls && wallAt(x, y - 1, z) && Math.min(across(x, y, z, 1, 0), across(x, y, z, 0, 1)) <= 2;
  // a girder cell: an open lattice inset GI of the cell on its open sides (a beam also BI top and bottom); a post's top
  // a slab and a low pyramid
  const GI = 0.2, BI = 0.15, OPQ = [[0.03, 0.03], [0.03, 0.03], [0.03, 0.03], [0.03, 0.03]];   // (OPQ: the lattice's solid corner)
  const drawGirder = (x, y, z, how, col) => {
    const isG = (a, b, c2) => girder.has(`${a},${b},${c2}`);
    if (how === 'post') {
      const x0 = x + GI, x1 = x + 1 - GI, z0 = z + GI, z1 = z + 1 - GI, h = CH / ((1 - 2 * GI) * CELL), v0 = y * h, v1 = (y + 1) * h;
      const S = [[[x1, z1], [x1, z0], [1, 0, 0]], [[x0, z0], [x0, z1], [-1, 0, 0]], [[x0, z1], [x1, z1], [0, 0, 1]], [[x1, z0], [x0, z0], [0, 0, -1]]];
      for (const [[ax, az], [bx, bz], n] of S) quad('girder', W(ax, y, az), W(bx, y, bz), W(bx, y + 1, bz), W(ax, y + 1, az), n, col, [[0, v0], [1, v0], [1, v1], [0, v1]]);
      if (!isG(x, y + 1, z) && !solidAt(x, y + 1, z)) {
        const e = GI - 0.06, t = 0.18;
        const p = [W(x + e, y + 1, z + e), W(x + e, y + 1, z + 1 - e), W(x + 1 - e, y + 1, z + 1 - e), W(x + 1 - e, y + 1, z + e)];
        for (const [i, j, n] of [[0, 1, [-1, 0, 0]], [1, 2, [0, 0, 1]], [2, 3, [1, 0, 0]], [3, 0, [0, 0, -1]]]) {
          const a = p[i], b = p[j];
          quad('girder', a, b, [b[0], b[1] + t, b[2]], [a[0], a[1] + t, a[2]], n, col, OPQ);
        }
        const ap = W(x + 0.5, y + 1.75, z + 0.5), q = p.map((v) => [v[0], v[1] + t, v[2]]);
        for (const [i, j, n] of [[0, 1, [-0.7, 0.7, 0]], [1, 2, [0, 0.7, 0.7]], [2, 3, [0.7, 0.7, 0]], [3, 0, [0, 0.7, -0.7]]]) quad('girder', q[i], q[j], ap, ap, n, col, OPQ);
      }
      return;
    }
    // a beam along axis `how` (0 x, 2 z): its two long sides, top and bottom, and an end where the girder stops in the air
    const along = how === 0, w = (1 - 2 * GI) * CELL;
    const P = (u, yy, v) => (along ? W(x + u, yy, z + v) : W(x + v, yy, z + u));   // (u along the beam, v across)
    const ya = y + BI, yb = y + 1 - BI, u0 = (along ? x : z) * CELL / w, u1 = u0 + CELL / w;
    const nA = along ? [0, 0, 1] : [1, 0, 0], nB = along ? [0, 0, -1] : [-1, 0, 0];
    quad('girder', P(0, ya, 1 - GI), P(1, ya, 1 - GI), P(1, yb, 1 - GI), P(0, yb, 1 - GI), nA, col, [[u0, 0], [u1, 0], [u1, 1], [u0, 1]]);
    quad('girder', P(1, ya, GI), P(0, ya, GI), P(0, yb, GI), P(1, yb, GI), nB, col, [[u1, 0], [u0, 0], [u0, 1], [u1, 1]]);
    quad('girder', P(0, yb, GI), P(0, yb, 1 - GI), P(1, yb, 1 - GI), P(1, yb, GI), [0, 1, 0], col, [[u0, 0], [u0, 1], [u1, 1], [u1, 0]]);
    quad('girder', P(0, ya, 1 - GI), P(0, ya, GI), P(1, ya, GI), P(1, ya, 1 - GI), [0, -1, 0], col, [[u0, 1], [u0, 0], [u1, 0], [u1, 1]]);
    for (const e of [0, 1]) {
      const nx = along ? x + (e ? 1 : -1) : x, nz = along ? z : z + (e ? 1 : -1);
      if (isG(nx, y, nz) || wallAt(nx, y, nz)) continue;
      quad('girder', P(e, ya, GI), P(e, ya, 1 - GI), P(e, yb, 1 - GI), P(e, yb, GI), along ? [e ? 1 : -1, 0, 0] : [0, 0, e ? 1 : -1], col, OPQ);
    }
  };
  for (const c of cells) {
    const { x, y, z, shape } = c;
    if (cut(x, y, z) || art.has(`${x},${y},${z}`)) continue;
    const col = pal[c.col] || pal[0];
    useSig(sigOf(x, y, z));
    if (girder.has(`${x},${y},${z}`)) { drawGirder(x, y, z, girder.get(`${x},${y},${z}`), col); continue; }
    if (shape === SOLID) {
      // (ASYLUM-4, opts.capStone: the top of a post or a block standing alone — fewer than two of its four neighbours
      //  at its height — in the walls' stone, not the floors' cream plaster, which made LBA1's maroon wooden posts pink)
      const alone = opts.capStone && [[1, 0], [-1, 0], [0, 1], [0, -1]].reduce((n, [dx, dz]) => n + wallAt(x + dx, y, z + dz), 0) < 2;
      if (faceShown(x, y, z, x, y + 1, z)) {
        const [a, b] = [W(x, y + 1, z), W(x + 1, y + 1, z + 1)], pts = [[a[0], a[1], a[2]], [a[0], a[1], b[2]], [b[0], a[1], b[2]], [b[0], a[1], a[2]]];
        const kind = alone ? 'side' : tealTop(c.col) ? 'grate' : capped(x, y, z) ? 'side' : 'top';
        quad(kind, ...pts, [0, 1, 0], col, kind === 'grate' ? gridUV(pts) : pts.map((p) => [p[0] / 1.7, p[2] / 1.7]));
      }
      // the four sides (the bottom is never seen), each outward
      const F = {
        '1,0': [[x + 1, y, z + 1], [x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1]],
        '-1,0': [[x, y, z], [x, y, z + 1], [x, y + 1, z + 1], [x, y + 1, z]],
        '0,1': [[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]],
        '0,-1': [[x + 1, y, z], [x, y, z], [x, y + 1, z], [x + 1, y + 1, z]],
      };
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!faceShown(x, y, z, x + dx, y, z + dz)) continue;
        const q = F[`${dx},${dz}`].map(([a1, b1, c1]) => W(a1, b1, c1));
        const h = (p) => (dx ? p[2] : p[0]) / 1.7;
        quad('side', q[0], q[1], q[2], q[3], [dx, 0, dz], col, q.map((p) => [h(p), p[1] / 1.7]));
      }
    } else if (shape >= 2) {
      // a ramp: the top surface follows the slope, solid below
      const P = (u, v) => { const t = slopeTop(shape, u, v); const w = W(x + u, y + t, z + v); return [w[0], w[1], w[2]]; };
      const a = P(0, 0), b = P(0, 1), cc = P(1, 1), d = P(1, 0);
      if (tealTop(c.col)) quad('grate', a, b, cc, d, [0, 1, 0], col, gridUV([a, b, cc, d]));
      else quad('top', a, b, cc, d, [0, 1, 0], col, [[a[0] / 1.7, a[2] / 1.7], [b[0] / 1.7, b[2] / 1.7], [cc[0] / 1.7, cc[2] / 1.7], [d[0] / 1.7, d[2] / 1.7]]);
      // (order 8: and its sides, up to the slope, where nothing stands beside it: a flight of steps over a room was its
      //  tops alone, pale sheets hanging in the air)
      //  A step hanging less than a man's height over the floor below (LBA1's flights: one cell of slope over nothing)
      //  is filled down to that floor, sides and a collider, so the flight stands on the floor as a solid stair; one
      //  higher up keeps the open way under it.
      let yb = y;
      if (!C.has(`${x},${y - 1},${z}`)) { let k = y - 1; while (k >= 0 && !C.has(`${x},${k},${z}`)) k--; if (k >= 0 && y - (k + 1) < 4) yb = k + 1; }
      if (yb < y) B.col(ox + (x + 0.5) * CELL, oz + (z + 0.5) * CELL, CELL / 2, CELL / 2, y * CH, { bottom: yb * CH, seeThrough: true, noStand: true });
      const S = {
        '1,0': [[1, 1], [1, 0]], '-1,0': [[0, 0], [0, 1]], '0,1': [[0, 1], [1, 1]], '0,-1': [[1, 0], [0, 0]],
      };
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = C.get(`${x + dx},${y},${z + dz}`);
        if (n && !art.has(`${x + dx},${y},${z + dz}`) && (n[0] >= 2 || solidAt(x + dx, y, z + dz))) continue;
        const [[u0, v0], [u1, v1]] = S[`${dx},${dz}`], t0 = slopeTop(shape, u0, v0), t1 = slopeTop(shape, u1, v1);
        if (t0 + t1 < 0.02 && yb === y) continue;
        const q = [W(x + u0, yb, z + v0), W(x + u1, yb, z + v1), W(x + u1, y + t1, z + v1), W(x + u0, y + t0, z + v0)];
        const h = (p) => (dx ? p[2] : p[0]) / 1.7;
        quad('side', q[0], q[1], q[2], q[3], [dx, 0, dz], col, q.map((p) => [h(p), p[1] / 1.7]));
      }
    }
  }
  // ---- the fittings' shapes (opts.fittings, above), each in its cell's lid as the faces are
  if (art.size || postLamps.length) {
    const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _m = new THREE.Matrix4(), _nm = new THREE.Matrix3(), _q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
    const flat = (g) => (g.index ? g.toNonIndexed() : g);
    const put = (kind, g, m, col) => {
      const p = g.attributes.position, n = g.attributes.normal; _nm.getNormalMatrix(m);
      for (let i = 0; i < p.count; i++) {
        _v.fromBufferAttribute(p, i).applyMatrix4(m); _n.fromBufferAttribute(n, i).applyMatrix3(_nm).normalize();
        pos[kind].push(_v.x, _v.y, _v.z); nrm[kind].push(_n.x, _n.y, _n.z); colr[kind].push(col.r, col.g, col.b); uv[kind].push(0, 0);
      }
    };
    const PR = 0.13, tube = flat(new THREE.CylinderGeometry(PR, PR, 1, 8, 1, true)), joint = flat(new THREE.SphereGeometry(PR * 1.18, 8, 5)), flange = flat(new THREE.CylinderGeometry(PR * 1.45, PR * 1.45, 1, 10)), ends = pipeEnds;
    const seg = (kind, a, b, col, g = tube) => {   // (a tube from a to b, world-local)
      const d = _v.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(); if (len < 1e-3) return;
      _q.setFromUnitVectors(UP, d.divideScalar(len));
      put(kind, g, _m.compose(new THREE.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, new THREE.Vector3(1, len, 1)), col);
    };
    // the pipes: each run along an axis keeps one offset toward the wall it runs on (0.22 m off the cell's middle, so the
    // pipe lies against the wall, not out in the room), a joint where it turns or ends, an end that meets a wall goes in
    const key = (x, y, z) => `${x},${y},${z}`, AX = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], OFF = 0.22;
    const off = new Map();
    for (const k of pipeSet) off.set(k, [0, 0, 0, 0, 0, 0]);   // (sum and count per component)
    for (let a = 0; a < 3; a++) {
      const seen = new Set();
      for (const k of pipeSet) {
        if (seen.has(k)) continue;
        const [x, y, z] = k.split(',').map(Number), d = AX[a];
        let s = 0; while (pipeSet.has(key(x + d[0] * (s - 1), y + d[1] * (s - 1), z + d[2] * (s - 1)))) s--;
        const run = []; for (let i = s; pipeSet.has(key(x + d[0] * i, y + d[1] * i, z + d[2] * i)); i++) run.push([x + d[0] * i, y + d[1] * i, z + d[2] * i]);
        run.forEach((p) => seen.add(key(...p)));
        if (run.length < 2) continue;
        for (const b of [0, 1, 2]) {   // (the components across the run: the wall side most of its cells have)
          if (b === a || b === 1) continue;   // (never up or down: hung pipes hang where LBA1 drew them)
          let w = 0;
          for (const p of run) { const q = [...p]; q[b] += 1; const r2 = [...p]; r2[b] -= 1; w += wallAt(...q) - wallAt(...r2); }
          for (const p of run) { const o = off.get(key(...p)); o[b * 2] += Math.sign(w); o[b * 2 + 1]++; }
        }
      }
    }
    const pipeCol = new THREE.Color(0, 0, 0); let pn = 0;
    for (const k of pipeSet) { const c = pal[C.get(k)[1]]; if (c) { pipeCol.add(c); pn++; } }
    if (pn) pipeCol.multiplyScalar(1 / pn);
    if (opts.pipeCol) pipeCol.set(opts.pipeCol).convertSRGBToLinear();   // (order 20: LBA1's pipes are teal-grey, the cells' mean a grey)
    const P = (k) => { const [x, y, z] = k.split(',').map(Number), o = off.get(k), w = W(x + 0.5, y + 0.5, z + 0.5); return [w[0] + (o[1] ? o[0] / o[1] : 0) * OFF, w[1], w[2] + (o[5] ? o[4] / o[5] : 0) * OFF]; };
    for (const k of pipeSet) {
      const [x, y, z] = k.split(',').map(Number), c = P(k), dirs = [];
      useSig(sigOf(x, y, z));
      for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const n = key(x + d[0], y + d[1], z + d[2]);
        if (pipeSet.has(n)) { dirs.push(d); if (d[0] + d[1] + d[2] > 0) seg('pipe', c, P(n), pipeCol); }
      }
      const straight = dirs.length === 2 && dirs[0].every((v, i) => v === -dirs[1][i]);
      if (!straight) put('pipe', joint, _m.makeTranslation(c[0], c[1], c[2]), pipeCol);
      if (dirs.length === 1) {   // (an end: into the wall, floor or ceiling it meets — cut away or not —, else turned into the
        //  wall it hangs on; only an end with nothing round it gets a flange: order 20, the caps hanging in mid-air)
        const d = dirs[0].map((v) => -v), lay = (a, b, e) => C.has(key(a, b, e)) && !art.has(key(a, b, e));
        if (lay(x + d[0], y + d[1], z + d[2])) seg('pipe', c, [c[0] + d[0] * CELL * 0.5, c[1] + d[1] * CH * 0.5, c[2] + d[2] * CELL * 0.5], pipeCol);
        else {
          const side = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, -1, 0], [0, 1, 0]].find((s2) => (s2[0] !== d[0] || s2[1] !== d[1] || s2[2] !== d[2]) && (s2[0] !== -d[0] || s2[1] !== -d[1] || s2[2] !== -d[2]) && lay(x + s2[0], y + s2[1], z + s2[2]));
          if (side) { const e = [c[0] + side[0] * CELL * 0.5, c[1] + side[1] * CH * 0.5, c[2] + side[2] * CELL * 0.5]; seg('pipe', c, e, pipeCol); ends.turned++; }
          else { seg('pipe', c, [c[0] + d[0] * 0.07, c[1] + d[1] * 0.07, c[2] + d[2] * 0.07], pipeCol, flange); ends.flange++; }
        }
      }
    }
    // the hanging lamps: a dark dome shade on a short rod, a warm bulb under it (no light of its own: the room's lamps
    // light it; the bulb glows)
    const dome = flat(new THREE.SphereGeometry(0.46, 16, 5, 0, Math.PI * 2, 0, Math.PI / 2)), rim = flat(new THREE.TorusGeometry(0.46, 0.035, 5, 20)), bulb = flat(new THREE.SphereGeometry(0.13, 10, 6));
    const rod = flat(new THREE.CylinderGeometry(0.012, 0.012, 1, 5, 1, true)), rose = flat(new THREE.CylinderGeometry(0.05, 0.09, 0.08, 10));
    // (order 20: LBA1's domes are teal-blue with a white lit rim; on a 2.6 m rod the dark dome over the walk read as a
    //  floor lamp's foot with its pole. Now a thin cable up to the ceiling cell over it (or the room's top), and its
    //  light lies as a warm pool on the table or floor under it)
    const shadeCol = new THREE.Color('#3f7f8e').convertSRGBToLinear(), rimCol = new THREE.Color('#f2f0e8').convertSRGBToLinear(), white = new THREE.Color(1, 1, 1);
    const pool = flat(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2)), poolCol = new THREE.Color('#ffd9a0').convertSRGBToLinear();
    for (const [x, y, z] of lampAt) {
      useSig(sigOf(x, y, z));
      // (order 20: a lamp over a table hangs 1.5 m over its top, not LBA1's 3 m: with nothing in between, so high over
      //  the walk it read as a lamp standing on the floor behind)
      const tb = tableAt.find(([a, , b]) => a === x && b === z);
      const c = W(x + 0.5, y + 0.25, z + 0.5); if (tb && opts.lowLamps) c[1] = Math.min(c[1], W(0, tb[1] + 1, 0)[1] + 1.5);
      put('pipe', dome, _m.compose(new THREE.Vector3(c[0], c[1], c[2]), _q.identity(), new THREE.Vector3(1, 0.55, 1)), shadeCol);
      put('pipe', rim, _m.compose(new THREE.Vector3(c[0], c[1], c[2]), _q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1)), rimCol);
      let top = y + 1; while (top < 25 && !C.has(key(x, top, z))) top++;
      const ct = W(0, top, 0)[1];
      seg('pipe', [c[0], c[1] + 0.24, c[2]], [c[0], ct, c[2]], shadeCol, rod);
      if (top < 25) put('pipe', rose, _m.makeTranslation(c[0], ct - 0.04, c[2]), shadeCol);
      put('glow', bulb, _m.makeTranslation(c[0], c[1] - 0.06, c[2]), white);
      // (the pool: on the table under it — its top a cell over the table's cells — or the floor)
      let fy = y - 1; while (fy >= 0 && !C.has(key(x, fy, z))) fy--;
      const py = tb ? W(0, tb[1] + 1, 0)[1] + 0.012 : W(0, fy + 1, 0)[1] + 0.012;
      if (tb || fy >= 0) { useSig(sigOf(x, tb ? tb[1] : fy, z)); const pr = tb ? 1.05 : 1.4, pp = pool.attributes.position; for (let i = 0; i < pp.count; i++) { const f = Math.pow(Math.max(0, 1 - Math.hypot(pp.getX(i), pp.getZ(i))), 1.4); pos.pool.push(c[0] + pp.getX(i) * pr, py, c[2] + pp.getZ(i) * pr); nrm.pool.push(0, 1, 0); colr.pool.push(poolCol.r * f, poolCol.g * f, poolCol.b * f); uv.pool.push(0, 0); } }
    }
    // the posts' floodlights: an arm off the post, a white reflector tipped down and out, its face aglow
    const refl = flat(new THREE.CylinderGeometry(0.11, 0.27, 0.3, 14, 1, true)), face = flat(new THREE.CircleGeometry(0.25, 14).rotateX(-Math.PI / 2)), arm = flat(new THREE.CylinderGeometry(0.025, 0.025, 1, 5, 1, true));
    const reflCol = new THREE.Color('#eceae4').convertSRGBToLinear();
    for (const { x, z, dx, dz, y } of postLamps) {
      useSig(sigOf(x + dx, Math.floor(y), z + dz));
      const p = W(x + 0.5, y, z + 0.5), c = [p[0] + dx * CELL * 0.62, p[1], p[2] + dz * CELL * 0.62];
      seg('pipe', [p[0], p[1], p[2]], c, pipeCol, arm);
      // (the reflector's axis: out from the post and 35° down; its wide mouth outward)
      const ax = new THREE.Vector3(dx * Math.cos(0.6), -Math.sin(0.6), dz * Math.cos(0.6));
      _q.setFromUnitVectors(UP, ax);
      put('pipe', refl, _m.compose(new THREE.Vector3(c[0] + ax.x * 0.12, c[1] + ax.y * 0.12, c[2] + ax.z * 0.12), _q, new THREE.Vector3(1, 1, 1)), reflCol);
      put('glow', face, _m.compose(new THREE.Vector3(c[0] + ax.x * 0.25, c[1] + ax.y * 0.25, c[2] + ax.z * 0.25), _q, new THREE.Vector3(1, 1, 1)), white);
    }
    const disc = flat(new THREE.CylinderGeometry(1.2, 1.2, 0.09, 28)), post = flat(new THREE.CylinderGeometry(0.11, 0.14, 1, 10, 1, true)), foot = flat(new THREE.CylinderGeometry(0.42, 0.5, 0.05, 18));
    const tableCol = new THREE.Color('#d9d2c2').convertSRGBToLinear();
    for (const [x, y, z] of tableAt) {
      useSig(sigOf(x, y, z));
      const top = W(x + 0.5, y + 1, z + 0.5), bot = W(x + 0.5, y - 1, z + 0.5);
      put('pipe', disc, _m.makeTranslation(top[0], top[1] - 0.045, top[2]), tableCol);
      seg('pipe', [top[0], bot[1], top[2]], [top[0], top[1] - 0.09, top[2]], tableCol, post);
      put('pipe', foot, _m.makeTranslation(top[0], bot[1] + 0.025, top[2]), tableCol);
    }
  }
  // ---- GRILLES (order 20, opts.grilles: [x, y0, z0, y1, z1] the lattice cells of a window in a wall along z at x,
  // inclusive): LBA1's lattice windows — a black diamond lattice in a dark frame, its bricks on solid cells; drawn as
  // cells they were black slabs set in the wall. The cells (in opts.hidden too) are drawn as a lattice across their
  // middle, in their frame's lid; their colliders are kept
  for (const [gx, y0, z0, y1, z1] of opts.grilles || []) {
    useSig(sigOf(gx, y0 - 1, z0));
    const X = ox + (gx + 0.5) * CELL, Z0 = oz + z0 * CELL, Z1 = oz + (z1 + 1) * CELL, Y0 = y0 * CH, Y1 = (y1 + 1) * CH, T = 0.55, wc = new THREE.Color(1, 1, 1);
    quad('grille', [X, Y0, Z1], [X, Y0, Z0], [X, Y1, Z0], [X, Y1, Z1], [1, 0, 0], wc, [[Z1 / T, Y0 / T], [Z0 / T, Y0 / T], [Z0 / T, Y1 / T], [Z1 / T, Y1 / T]]);
  }
  const mats = {
    side: new THREE.MeshStandardMaterial({ map: TEX.stone(opts.stone || 'grey'), vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }),
    top: new THREE.MeshStandardMaterial({ map: TEX.plaster('#f4f0ea'), vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }),
    pipe: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: opts.pipeCol ? 0.1 : 0.2 }),
    glow: new THREE.MeshStandardMaterial({ vertexColors: true, color: '#fff4d8', emissive: '#ffd890', emissiveIntensity: 2.2, roughness: 0.4 }),
    girder: new THREE.MeshStandardMaterial({ map: girderTex(), vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.25 }),
    grate: new THREE.MeshStandardMaterial({ map: grateTex(), vertexColors: true, roughness: 0.55, metalness: 0.3 }),
    grille: new THREE.MeshStandardMaterial({ map: grilleTex(), color: '#3a3434', alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.4 }),
    pool: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: opts.poolI ?? 0.22, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  };
  mats.girder.color.setScalar(opts.girderGain ?? 1.6); mats.grate.color.setScalar(opts.grateGain ?? 1.0);
  // (the stone texture is darker than white: lift the side colours a little)
  mats.side.color.set(opts.sideCol || '#ffffff').multiplyScalar(opts.sideGain ?? 1.6);
  // (WORLD-ART-7: opts.topCol / opts.sideCol tint floors and walls apart; the measured brick colours alone make both the same grey)
  if (opts.topCol) mats.top.color.set(opts.topCol);
  for (const kind of ['side', 'top']) { const m = mats[kind]; m.map = m.map.clone(); m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; m.map.needsUpdate = true; }
  // a lid's meshes: transparent from the start (its fade changes only the opacity, never the program), writing depth
  // as the room does; where one is drawn over the hero it clears his mark in the stencil, so his silhouette shows
  // through it as through any wall (characters.js addSilhouette)
  const lidMat = (m) => { const c = m.clone(); c.userData.lid = true; c.transparent = true; c.depthWrite = true; c.stencilWrite = true; c.stencilRef = 0; c.stencilFunc = THREE.AlwaysStencilFunc; c.stencilZPass = THREE.ReplaceStencilOp; return c; };
  const lidMeshes = [];
  for (const [sig, b] of bufs) {
    const lm = sig ? { side: lidMat(mats.side), top: lidMat(mats.top), pipe: lidMat(mats.pipe), glow: lidMat(mats.glow), girder: lidMat(mats.girder), grate: lidMat(mats.grate), pool: mats.pool, grille: lidMat(mats.grille) } : mats;
    for (const kind of ['side', 'top', 'pipe', 'glow', 'girder', 'grate', 'pool', 'grille']) {
      if (!b.pos[kind].length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos[kind], 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nrm[kind], 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.colr[kind], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv[kind], 2));
      const mesh = new THREE.Mesh(g, lm[kind]); mesh.castShadow = kind !== 'glow' && kind !== 'pool'; mesh.receiveShadow = kind !== 'pool';
      // (userData.keep: a toggling part, so the shadow batches (shadowcull.js) and draw batches leave it on its own)
      if (sig) { mesh.name = 'lid:' + sig; mesh.userData.keep = true; lidMeshes.push({ mesh, lids: sig.split('+').map(Number) }); }
      B.group.add(mesh);
    }
  }
  // ---- the footing (opts.footing: { depth, below }): the outer walls on the camera's side (+x, +z) that stand on the
  // grid's lowest levels (their bottom cell at or under `below`) carried on down `depth` m into the dark, fading to black.
  // The grid's floors are one cell thick over nothing: where the view follows the hero to the edge of a big room (the
  // asylum's store, at its lowest corner) the frame was 30–40 % black hole under the floor; now the building's mass goes
  // down into the dark under its walls. One mesh, the room's wall material, no shadow.
  if (opts.footing) {
    const { depth = 9, below = 1 } = opts.footing, rows = opts.footing.rows || [[0, 1], [depth / 3, 0.62], [depth, 0]];   // (down from the bottom: the colour's share)
    const P = [], N = [], Co = [], U = [];
    for (const [k, runs] of Object.entries(L.cols)) {
      const [x, z] = k.split(',').map(Number), y0 = runs[0][0];
      if (y0 > below) continue;
      const col = pal[C.get(`${x},${y0},${z}`)?.[1] ?? runs[0][3]] || pal[0];
      for (const [dx, dz] of [[1, 0], [0, 1]]) {
        if (!outside(x + dx, z + dz)) continue;
        const ends = dx ? [[x + 1, z], [x + 1, z + 1]] : [[x + 1, z + 1], [x, z + 1]];   // (wound to face the camera, as the room's own faces: a back face lit from behind read as a pale wedge)
        const [a, b] = ends.map(([ex, ez]) => [ox + ex * CELL, oz + ez * CELL]), top = y0 * CH;
        for (let i = 0; i < rows.length - 1; i++) {
          const y1 = top - rows[i][0], y2 = top - rows[i + 1][0], f1 = rows[i][1], f2 = rows[i + 1][1];
          for (const [p, y, f] of [[a, y1, f1], [b, y1, f1], [b, y2, f2], [a, y1, f1], [b, y2, f2], [a, y2, f2]]) {
            P.push(p[0], y, p[1]); N.push(dx, 0, dz); Co.push(col.r * f, col.g * f, col.b * f); U.push((dx ? p[1] : p[0]) / 1.7, y / 1.7);
          }
        }
      }
    }
    // (and where a floor runs out to the grid's edge on the camera's side with no wall of its own — the asylum's east
    //  walk, its south end — the cut wall's rim the room's other edges have: a parapet two cells high, 0.25 m thick, its
    //  face and top in the wall's stone, a collider so the floor no longer ends in a drop into black)
    const T = 0.25 / CELL, RH = 2;
    const quadP = (pts, n, c) => { for (const i of [0, 1, 2, 0, 2, 3]) { const [px, py, pz] = pts[i]; P.push(px, py, pz); N.push(n[0], n[1], n[2]); Co.push(c.r, c.g, c.b); U.push((n[1] ? px : n[0] ? pz : px) / 1.7, (n[1] ? pz : py) / 1.7); } };
    for (const [k, runs] of Object.entries(L.cols)) {
      const [x, z] = k.split(',').map(Number), f = colFloor.get(k);
      if (colTop.get(k) !== f) continue;   // (a wall stands there: cut to its rim already)
      const col = pal[C.get(`${x},${f - 1},${z}`)?.[1] ?? runs[runs.length - 1][3]] || pal[0];
      for (const [dx, dz] of [[1, 0], [0, 1]]) {
        if (!outside(x + dx, z + dz)) continue;
        const X0 = dx ? x + 1 - T : x, X1 = x + 1, Z0 = dz ? z + 1 - T : z, Z1 = z + 1, y0 = f * CH, y1 = (f + RH) * CH;
        const w = (cx2, y, cz2) => [ox + cx2 * CELL, y, oz + cz2 * CELL];
        if (dx) quadP([w(X1, y0, Z1), w(X1, y0, Z0), w(X1, y1, Z0), w(X1, y1, Z1)], [1, 0, 0], col);   // (wound to face the camera)
        else quadP([w(X0, y0, Z1), w(X1, y0, Z1), w(X1, y1, Z1), w(X0, y1, Z1)], [0, 0, 1], col);
        quadP([w(X0, y1, Z0), w(X0, y1, Z1), w(X1, y1, Z1), w(X1, y1, Z0)], [0, 1, 0], col);
        B.col(ox + (X0 + X1) / 2 * CELL, oz + (Z0 + Z1) / 2 * CELL, (X1 - X0) * CELL / 2 + 0.05, (Z1 - Z0) * CELL / 2 + 0.05, y1, { bottom: y0 - 0.2, seeThrough: true, noStand: true });
      }
    }
    if (P.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(Co, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
      const mesh = new THREE.Mesh(g, mats.side); mesh.name = 'footing'; mesh.castShadow = false; mesh.receiveShadow = true;
      B.group.add(mesh);
    }
  }

  // ---- colliders: each column's runs of solid cells, merged into rectangles of equal runs
  const runs = new Map();
  for (const [k, list] of Object.entries(L.cols)) {
    const [x, z] = k.split(',').map(Number);
    // merge the solid runs of a column (shape 1), treating slopes as steps to their top
    let cur = null;
    const flush = () => { if (cur) { const key = `${cur[0]},${cur[1]},${cur.stair ? 1 : 0}`; if (!runs.has(key)) runs.set(key, new Set()); runs.get(key).add(`${x},${z}`); cur = null; } };
    for (let y = 0; y < 25; y++) {
      const c = C.get(`${x},${y},${z}`);
      const solid = c && c[0] === SOLID && !cut(x, y, z), slope = c && c[0] >= 2;
      if (solid) { if (cur && !cur.stair && cur[0] + cur[1] === y) cur[1]++; else { flush(); cur = [y, 1]; } }
      else if (slope) { flush(); cur = [y, 1]; cur.stair = true; flush(); }
      else flush();
    }
    flush();
  }
  for (const [key, set] of runs) {
    const [y, len, stair] = key.split(',').map(Number);
    const used = new Set();
    for (const k of set) {
      if (used.has(k)) continue;
      const [x, z] = k.split(',').map(Number);
      let x1 = x; while (set.has(`${x1 + 1},${z}`) && !used.has(`${x1 + 1},${z}`)) x1++;
      let z1 = z;
      for (;;) { let ok = true; for (let xx = x; xx <= x1; xx++) if (!set.has(`${xx},${z1 + 1}`) || used.has(`${xx},${z1 + 1}`)) { ok = false; break; } if (!ok) break; z1++; }
      for (let xx = x; xx <= x1; xx++) for (let zz = z; zz <= z1; zz++) used.add(`${xx},${zz}`);
      const top = (y + len) * CH, bottom = stair ? y * CH - 0.01 : y * CH;
      // (+0.07: neighbouring boxes overlap, so no seam opens between two heights — the ground test shrinks boxes by 0.05)
      B.col(ox + (x + x1 + 1) / 2 * CELL, oz + (z + z1 + 1) / 2 * CELL, (x1 - x + 1) * CELL / 2 + 0.07, (z1 - z + 1) * CELL / 2 + 0.07, stair ? top - CH * 0.45 : top, { bottom, stair: !!stair, seeThrough: true });
    }
  }

  // ---- contract: cells to world, the start, the actors' spots, the exits (zone boxes)
  R.layout = L;
  R.cell = (x, y, z) => ({ x: cx + ox + x * CELL, y: y * CH, z: cz + oz + z * CELL });
  const h = L.hero || [SX / 2, 1, SZ / 2];
  const hs = R.cell(h[0], h[1], h[2]);
  R.spawn = { x: hs.x, z: hs.z, a: opts.spawnA ?? Math.PI };
  R.spots = (L.actors || []).map((a) => ({ body: a.body, ...R.cell(a.at[0], a.at[1], a.at[2]) }));
  R.zoneBoxes = (L.zones || []).filter((z) => z.type === 0).map((z) => { const a = R.cell(z.box[0], z.box[1], z.box[2]), b = R.cell(z.box[3], z.box[4], z.box[5]); return { to: z.to, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, y: a.y, hw: Math.abs(b.x - a.x) / 2 + 0.4, hd: Math.abs(b.z - a.z) / 2 + 0.4 }; });
  R.view = opts.view ?? 22; R.follow = opts.follow ?? 0.7;   // (big rooms: the view travels with the hero)
  // the lids: the one(s) over the hero fade out in LID_FADE s, the others back in (dt ≥ LID_FADE: at once)
  R.lids = lids; R.lidMeshes = lidMeshes;
  R.fittings = { lamps: lampAt.map(([x, y, z]) => R.cell(x + 0.5, y + 0.25, z + 0.5)), tables: tableAt.map(([x, y, z]) => R.cell(x + 0.5, y + 1, z + 0.5)), pipeCells: pipeSet.size, pipeEnds: pipeEnds, girders: girder.size, hidden: (opts.hidden || []).length };   // (ASYLUM-4: what was drawn as fittings)
  R.toCell = (wx, wy, wz) => ({ x: (wx - cx - ox) / CELL, y: wy / CH, z: (wz - cz - oz) / CELL });
  if (lids.length) {
    const LID_FADE = 0.25;
    const seen = new Set();
    R.updateLids = (hero, dt = 1, cam = globalThis.game?.camera) => {
      const p = R.toCell(hero.pos.x, hero.pos.y + 0.05, hero.pos.z);
      // the leftovers on the sight lines from his feet, chest and head to the camera
      seen.clear();
      if (overCell.size && cam) {
        const c = R.toCell(cam.position.x, cam.position.y, cam.position.z);
        // (his body is wider than a line: rays from across it, side to side as the camera sees him, ±0.4 m)
        const dx = c.x - p.x, dz = c.z - p.z, dl = Math.hypot(dx, dz) || 1, sx = -dz / dl, sz = dx / dl;
        for (const hy of [0.3, 1.0, 1.6]) for (const s of [-0.45, 0, 0.45]) {
          const a = R.toCell(hero.pos.x, hero.pos.y + hy, hero.pos.z); a.x += sx * s; a.z += sz * s;
          const tEnd = c.y > 25 ? (25 - a.y) / (c.y - a.y) : 1;   // (only up to the layout's top)
          const n = Math.ceil(tEnd * Math.hypot(c.x - a.x, (c.y - a.y) * CH / CELL, c.z - a.z) / 0.3);
          for (let k = 1; k <= n; k++) {
            const t = (k / n) * tEnd, x = Math.floor(a.x + (c.x - a.x) * t), y = Math.floor(a.y + (c.y - a.y) * t), z = Math.floor(a.z + (c.z - a.z) * t);
            if (y >= 25) break;
            if (x < 0 || z < 0 || x >= 64 || z >= 64 || y < 0) continue;
            const i = overCell.get(ock(x, y, z)); if (i != null) seen.add(i);
          }
        }
      }
      // (order 8: never the leftover he stands on — its cell under his feet, or the step he is on: cut, it left him in
      //  black void and took the flight away under him)
      const fx = Math.floor(p.x), fz = Math.floor(p.z), fy = Math.floor(p.y);
      const under = [...(lidOf.get(`${fx},${fy - 1},${fz}`) || []), ...(lidOf.get(`${fx},${fy},${fz}`) || [])];
      for (const i of under) if (lids[i].over) seen.delete(i);
      for (const l of lids) {
        if (l.over) { l.hold = seen.has(l.i) ? 0.6 : under.includes(l.i) ? 0 : Math.max(0, l.hold - dt); l.active = l.hold > 0; }   // (held a moment: no flicker)
        else {
          const [x0, y0, z0, x1, y1, z1] = l.box, m = l.active ? 0.3 : 0;   // (a little slack to leave: no flicker in a doorway)
          l.active = p.x >= x0 - m && p.x <= x1 + m && p.z >= z0 - m && p.z <= z1 + m && p.y >= y0 - 1.5 && p.y <= y1 + 0.5;
          if (l.sight) { l.hold = seen.has(l.i) ? 0.6 : Math.max(0, l.hold - dt); l.active ||= l.hold > 0; }
        }
        const goal = l.active ? 0 : 1;
        l.f = dt >= LID_FADE ? goal : goal > l.f ? Math.min(goal, l.f + dt / LID_FADE) : Math.max(goal, l.f - dt / LID_FADE);
      }
      for (const { mesh, lids: ids } of lidMeshes) {
        let f = 1; for (const i of ids) f = Math.min(f, lids[i].f);
        mesh.visible = f > 0.01; if (mesh.material.userData.lid) mesh.material.opacity = f;   // (never a material shared with the room: its pools)
      }
    };
    // (CUT-RESTORE, original-mechanics wave 3: a new visit — a door, a load, a respawn, a cinematic's cut — starts from the
    //  room's own state: every lid back in at once and the ones over the spot he lands on cut at once; no lid left cut
    //  from where he was last time, fading back in through the first frames. The sight lines wait for the camera's first
    //  frame here: until then the camera still stands where the last scene had it)
    R.resetCut = () => { for (const l of lids) { l.hold = 0; l.active = false; l.f = 1; } R._lidSnap = true; };
    R.updaters.push((dt) => {
      const G = globalThis.game; if (!G?.hero || G.room !== R) return;
      if (R._lidSnap) { R._lidSnap = false; R.updateLids(G.hero, 1, null); return; }
      R.updateLids(G.hero, dt);
    });
  }
  // light: a few lamps spread over the room
  for (let i = 0; i < 9; i++) { const p = R.cell(SX * (1 + (i % 3) * 2) / 6, 0, SZ * (1 + Math.floor(i / 3) * 2) / 6); B.light(opts.lamp || '#ffe8c8', opts.lampI ?? 14, Math.max(SX, SZ) * CELL * 0.45, p.x - cx, 7.5, p.z - cz); }
  return B.finish();
}
