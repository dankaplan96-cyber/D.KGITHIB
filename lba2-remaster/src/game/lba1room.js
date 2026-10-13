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
export async function preloadLba1Rooms(names = ['asylum', 'bumaze', 'buhalls']) {
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
  // the camera's side (+x, +z): a column next to the outside is cut down to two cells above its floor
  const colTop = new Map(), colFloor = new Map();
  for (const [k, runs] of Object.entries(L.cols)) { colFloor.set(k, runs[0][0] + runs[0][1]); colTop.set(k, runs[runs.length - 1][0] + runs[runs.length - 1][1]); }
  const outside = (x, z) => !L.cols[`${x},${z}`];
  const cut = (x, y, z) => {
    if (opts.noCut) return false;
    const k = `${x},${z}`, f = colFloor.get(k) ?? 0;
    const near = outside(x + 1, z) || outside(x, z + 1) || outside(x + 1, z + 1) || x >= SX - 1 || z >= SZ - 1;
    return near && y >= f + (opts.rim ?? 2);
  };
  const solidAt = (x, y, z) => { const c = C.get(`${x},${y},${z}`); return !!c && c[0] === SOLID && !cut(x, y, z); };
  const pal = L.pal.map(([r, g, b]) => new THREE.Color(Math.min(1, r / 255 * tint * 1.25), Math.min(1, g / 255 * tint * 1.25), Math.min(1, b / 255 * tint * 1.25)).convertSRGBToLinear());

  // ---- faces: per direction, runs of exposed faces of one colour merged along x
  const pos = { side: [], top: [] }, nrm = { side: [], top: [] }, colr = { side: [], top: [] }, uv = { side: [], top: [] };
  const quad = (kind, a, b, c, d, n, col, uvs) => {
    for (const p of [a, b, c, a, c, d]) pos[kind].push(p[0], p[1], p[2]);
    for (let i = 0; i < 6; i++) { nrm[kind].push(n[0], n[1], n[2]); colr[kind].push(col.r, col.g, col.b); }
    for (const t of [uvs[0], uvs[1], uvs[2], uvs[0], uvs[2], uvs[3]]) uv[kind].push(t[0], t[1]);
  };
  const W = (x, y, z) => [ox + x * CELL, y * CH, oz + z * CELL];
  const cells = [...C.entries()].map(([k, v]) => { const [x, y, z] = k.split(',').map(Number); return { x, y, z, shape: v[0], col: v[1] }; });
  for (const c of cells) {
    const { x, y, z, shape } = c;
    if (cut(x, y, z)) continue;
    const col = pal[c.col] || pal[0];
    if (shape === SOLID) {
      if (!solidAt(x, y + 1, z)) { const [a, b] = [W(x, y + 1, z), W(x + 1, y + 1, z + 1)]; quad('top', [a[0], a[1], a[2]], [a[0], a[1], b[2]], [b[0], a[1], b[2]], [b[0], a[1], a[2]], [0, 1, 0], col, [[a[0] / 1.7, a[2] / 1.7], [a[0] / 1.7, b[2] / 1.7], [b[0] / 1.7, b[2] / 1.7], [b[0] / 1.7, a[2] / 1.7]]); }
      // the four sides (the bottom is never seen), each outward
      const F = {
        '1,0': [[x + 1, y, z + 1], [x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1]],
        '-1,0': [[x, y, z], [x, y, z + 1], [x, y + 1, z + 1], [x, y + 1, z]],
        '0,1': [[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]],
        '0,-1': [[x + 1, y, z], [x, y, z], [x, y + 1, z], [x + 1, y + 1, z]],
      };
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (solidAt(x + dx, y, z + dz)) continue;
        const q = F[`${dx},${dz}`].map(([a1, b1, c1]) => W(a1, b1, c1));
        const h = (p) => (dx ? p[2] : p[0]) / 1.7;
        quad('side', q[0], q[1], q[2], q[3], [dx, 0, dz], col, q.map((p) => [h(p), p[1] / 1.7]));
      }
    } else if (shape >= 2) {
      // a ramp: the top surface follows the slope, solid below
      const P = (u, v) => { const t = slopeTop(shape, u, v); const w = W(x + u, y + t, z + v); return [w[0], w[1], w[2]]; };
      const a = P(0, 0), b = P(0, 1), cc = P(1, 1), d = P(1, 0);
      quad('top', a, b, cc, d, [0, 1, 0], col, [[a[0] / 1.7, a[2] / 1.7], [b[0] / 1.7, b[2] / 1.7], [cc[0] / 1.7, cc[2] / 1.7], [d[0] / 1.7, d[2] / 1.7]]);
    }
  }
  const mats = {
    side: new THREE.MeshStandardMaterial({ map: TEX.stone(opts.stone || 'grey'), vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }),
    top: new THREE.MeshStandardMaterial({ map: TEX.plaster('#f4f0ea'), vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }),
  };
  // (the stone texture is darker than white: lift the side colours a little)
  mats.side.color.setScalar(1.6);
  for (const kind of ['side', 'top']) {
    if (!pos[kind].length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos[kind], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm[kind], 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colr[kind], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv[kind], 2));
    for (const m of [mats[kind]]) { m.map = m.map.clone(); m.map.wrapS = m.map.wrapT = THREE.RepeatWrapping; m.map.needsUpdate = true; }
    const mesh = new THREE.Mesh(g, mats[kind]); mesh.castShadow = true; mesh.receiveShadow = true;
    B.group.add(mesh);
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
  // light: a few lamps spread over the room
  for (let i = 0; i < 9; i++) { const p = R.cell(SX * (1 + (i % 3) * 2) / 6, 0, SZ * (1 + Math.floor(i / 3) * 2) / 6); B.light(opts.lamp || '#ffe8c8', opts.lampI ?? 14, Math.max(SX, SZ) * CELL * 0.45, p.x - cx, 7.5, p.z - cz); }
  return B.finish();
}
