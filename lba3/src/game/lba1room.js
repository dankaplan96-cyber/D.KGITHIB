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
    const k = `${x},${z}`, f = colFloor.get(k) ?? 0;
    const near = outside(x + 1, z) || outside(x, z + 1) || outside(x + 1, z + 1) || x >= SX - 1 || z >= SZ - 1;
    return near && y >= f + (opts.rim ?? 2);
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
  }
  const wallAt = (x, y, z) => solidAt(x, y, z) && !art.has(`${x},${y},${z}`);   // (a face's neighbour that hides it)
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
    if (!bufs.has(sig)) { const k4 = () => ({ side: [], top: [], pipe: [], glow: [] }); bufs.set(sig, { pos: k4(), nrm: k4(), colr: k4(), uv: k4() }); }
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
  for (const c of cells) {
    const { x, y, z, shape } = c;
    if (cut(x, y, z) || art.has(`${x},${y},${z}`)) continue;
    const col = pal[c.col] || pal[0];
    useSig(sigOf(x, y, z));
    if (shape === SOLID) {
      // (ASYLUM-4, opts.capStone: the top of a post or a block standing alone — fewer than two of its four neighbours
      //  at its height — in the walls' stone, not the floors' cream plaster, which made LBA1's maroon wooden posts pink)
      const alone = opts.capStone && [[1, 0], [-1, 0], [0, 1], [0, -1]].reduce((n, [dx, dz]) => n + wallAt(x + dx, y, z + dz), 0) < 2;
      if (faceShown(x, y, z, x, y + 1, z)) { const [a, b] = [W(x, y + 1, z), W(x + 1, y + 1, z + 1)]; quad(alone ? 'side' : 'top', [a[0], a[1], a[2]], [a[0], a[1], b[2]], [b[0], a[1], b[2]], [b[0], a[1], a[2]], [0, 1, 0], col, [[a[0] / 1.7, a[2] / 1.7], [a[0] / 1.7, b[2] / 1.7], [b[0] / 1.7, b[2] / 1.7], [b[0] / 1.7, a[2] / 1.7]]); }
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
      quad('top', a, b, cc, d, [0, 1, 0], col, [[a[0] / 1.7, a[2] / 1.7], [b[0] / 1.7, b[2] / 1.7], [cc[0] / 1.7, cc[2] / 1.7], [d[0] / 1.7, d[2] / 1.7]]);
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
  if (art.size) {
    const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _m = new THREE.Matrix4(), _nm = new THREE.Matrix3(), _q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
    const flat = (g) => (g.index ? g.toNonIndexed() : g);
    const put = (kind, g, m, col) => {
      const p = g.attributes.position, n = g.attributes.normal; _nm.getNormalMatrix(m);
      for (let i = 0; i < p.count; i++) {
        _v.fromBufferAttribute(p, i).applyMatrix4(m); _n.fromBufferAttribute(n, i).applyMatrix3(_nm).normalize();
        pos[kind].push(_v.x, _v.y, _v.z); nrm[kind].push(_n.x, _n.y, _n.z); colr[kind].push(col.r, col.g, col.b); uv[kind].push(0, 0);
      }
    };
    const PR = 0.13, tube = flat(new THREE.CylinderGeometry(PR, PR, 1, 8, 1, true)), joint = flat(new THREE.SphereGeometry(PR * 1.18, 8, 5));
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
      if (dirs.length === 1) {   // (an end: into the wall it meets, else a cap)
        const d = dirs[0].map((v) => -v);
        if (wallAt(x + d[0], y + d[1], z + d[2])) seg('pipe', c, [c[0] + d[0] * CELL * 0.5, c[1] + d[1] * CH * 0.5, c[2] + d[2] * CELL * 0.5], pipeCol);
      }
    }
    // the hanging lamps: a dark dome shade on a short rod, a warm bulb under it (no light of its own: the room's lamps
    // light it; the bulb glows)
    const dome = flat(new THREE.SphereGeometry(0.46, 16, 5, 0, Math.PI * 2, 0, Math.PI / 2)), rim = flat(new THREE.TorusGeometry(0.46, 0.03, 5, 20)), bulb = flat(new THREE.SphereGeometry(0.13, 10, 6));
    const rod = flat(new THREE.CylinderGeometry(0.025, 0.025, 1, 6, 1, true));
    const shadeCol = new THREE.Color('#6f9a94').convertSRGBToLinear(), white = new THREE.Color(1, 1, 1);
    for (const [x, y, z] of lampAt) {
      useSig(sigOf(x, y, z));
      const c = W(x + 0.5, y + 0.25, z + 0.5);
      put('pipe', dome, _m.compose(new THREE.Vector3(c[0], c[1], c[2]), _q.identity(), new THREE.Vector3(1, 0.55, 1)), shadeCol);
      put('pipe', rim, _m.compose(new THREE.Vector3(c[0], c[1], c[2]), _q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2), new THREE.Vector3(1, 1, 1)), shadeCol);
      seg('pipe', [c[0], c[1] + 0.22, c[2]], [c[0], c[1] + 2.6, c[2]], shadeCol, rod);
      put('glow', bulb, _m.makeTranslation(c[0], c[1] - 0.06, c[2]), white);
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
  const mats = {
    side: new THREE.MeshStandardMaterial({ map: TEX.stone(opts.stone || 'grey'), vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }),
    top: new THREE.MeshStandardMaterial({ map: TEX.plaster('#f4f0ea'), vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }),
    pipe: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2 }),
    glow: new THREE.MeshStandardMaterial({ vertexColors: true, color: '#fff4d8', emissive: '#ffd890', emissiveIntensity: 2.2, roughness: 0.4 }),
  };
  // (the stone texture is darker than white: lift the side colours a little)
  mats.side.color.set(opts.sideCol || '#ffffff').multiplyScalar(opts.sideGain ?? 1.6);
  // (WORLD-ART-7: opts.topCol / opts.sideCol tint floors and walls apart; the measured brick colours alone make both the same grey)
  if (opts.topCol) mats.top.color.set(opts.topCol);
  for (const kind of ['side', 'top']) { const m = mats[kind]; m.map = m.map.clone(); m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; m.map.needsUpdate = true; }
  // a lid's meshes: transparent from the start (its fade changes only the opacity, never the program), writing depth
  // as the room does; where one is drawn over the hero it clears his mark in the stencil, so his silhouette shows
  // through it as through any wall (characters.js addSilhouette)
  const lidMat = (m) => { const c = m.clone(); c.transparent = true; c.depthWrite = true; c.stencilWrite = true; c.stencilRef = 0; c.stencilFunc = THREE.AlwaysStencilFunc; c.stencilZPass = THREE.ReplaceStencilOp; return c; };
  const lidMeshes = [];
  for (const [sig, b] of bufs) {
    const lm = sig ? { side: lidMat(mats.side), top: lidMat(mats.top), pipe: lidMat(mats.pipe), glow: lidMat(mats.glow) } : mats;
    for (const kind of ['side', 'top', 'pipe', 'glow']) {
      if (!b.pos[kind].length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos[kind], 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nrm[kind], 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.colr[kind], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv[kind], 2));
      const mesh = new THREE.Mesh(g, lm[kind]); mesh.castShadow = kind !== 'glow'; mesh.receiveShadow = true;
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
  R.fittings = { lamps: lampAt.map(([x, y, z]) => R.cell(x + 0.5, y + 0.25, z + 0.5)), tables: tableAt.map(([x, y, z]) => R.cell(x + 0.5, y + 1, z + 0.5)), pipeCells: pipeSet.size };   // (ASYLUM-4: what was drawn as fittings)
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
        mesh.visible = f > 0.01; mesh.material.opacity = f;
      }
    };
    R.updaters.push((dt) => { const G = globalThis.game; if (G?.hero && G.room === R) R.updateLids(G.hero, dt); });
  }
  // light: a few lamps spread over the room
  for (let i = 0; i < 9; i++) { const p = R.cell(SX * (1 + (i % 3) * 2) / 6, 0, SZ * (1 + Math.floor(i / 3) * 2) / 6); B.light(opts.lamp || '#ffe8c8', opts.lampI ?? 14, Math.max(SX, SZ) * CELL * 0.45, p.x - cx, 7.5, p.z - cz); }
  return B.finish();
}
