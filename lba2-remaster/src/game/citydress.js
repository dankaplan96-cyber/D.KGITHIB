// Citadel's street furniture, twelve years on (SD-1): the bare stretches of the town get what a lived-in Twinsun
// town keeps outdoors — litter bins by the benches, flower tubs and planters beside front doors, sign posts at the
// junctions (to the SQUARE, the HARBOUR, the SPACEPORT and the LIGHTHOUSE, pointing the way one actually walks), a
// few notice boards, resting spots along the long lane south, and on the harbour quay a ferry timetable, mooring
// bollards, a hand cart and a bench by the water. The kit is src/game/props.js's street furniture.
//
// Every piece is fitted where nothing stands: it keeps off the paths' centre lines and the streets' middles, doors,
// signs, givers, the crystals, every NPC's place, the dogs' yards, the townlife places (pump, garden, Nell's shop)
// and the customs booth, clear of every collider already built; a blocked piece may shift up to a metre, else it is
// left out (W.cityDress lists what was placed and what was skipped). Each gets a collider fitting its role: low
// pieces (bins, tubs, bollards, benches) are solid but see-through for the camera, tall ones solid; none can be
// stood on. Static parts merge per material into one Kit per 40 m cell of the town.
//
// CONTRACT: buildCityDressing(root, physics, W) → W.cityDress = { placed, kinds {name: n}, skipped: ['name (x, z): why'] }
import * as THREE from 'three';
import * as P from './props.js';
import { Kit } from './props.js';
import { streetDist } from './town.js';
import { lifeClear } from './townlife.js';

const CUSTOMS = { x0: -114.5, x1: -104.5, z0: 30.5, z1: 38.6 };   // Odile's booth, the barrier, the held crate
const CELL = 40;
const heading = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
// destinations as the walker goes from each junction (first leg of the real route)
const TO = { square: [-42, -4], lane: [-44.6, 12], harbour: [-60, 33], spaceport: [-31, 40], lighthouse: [-58, 73], laneS: [-45.6, 60] };

export function buildCityDressing(root, physics, W) {
  const g = new THREE.Group(); g.name = 'citydress'; root.add(g);
  const T = W.terrain, H = (x, z) => T.heightAt(x, z);
  const kits = new Map();
  const kitAt = (x, z) => { const key = Math.floor(x / CELL) + ',' + Math.floor(z / CELL); let k = kits.get(key); if (!k) { const ag = new THREE.Group(); g.add(ag); k = new Kit(ag); kits.set(key, k); } return k; };

  // ---------------------------------------------------------------- where a piece may stand
  const keep = [   // points with a clearance radius
    // a door and the way up to it (1.6 m out along the house's front)
    ...(W.houses || []).filter((h) => h.door).flatMap((h) => { const d = h.door, ry = h.ry ?? Math.atan2(d.x - h.x, d.z - h.z); return [[d.x, d.z, 1.2], [d.x + Math.sin(ry) * 1.6, d.z + Math.cos(ry) * 1.6, 1.3]]; }),
    ...(W.signs || []).map((s) => [s.x, s.z, 1.4]),
    ...(W.givers || []).map((v) => [v.x, v.z, (v.r || 1.5) + 0.6]),
    [-113, 85, 2], [-28, 40, 2.2], [-45, -84, 2], [-85, -49.5, 2],   // crystals (main.js crystalSpots)
    ...(W.pierEnd ? [[W.pierEnd.x, W.pierEnd.z, 2.5]] : []),
  ];
  const spots = [];   // NPCs' places (filled in by addNpcSpots once the cast exists: see below)
  const placed = [];
  const clearOfColliders = (x, z, rad) => {
    const h = H(x, z);
    for (const c of physics.near(x, z)) {
      if (!c.enabled || c.top < h + 0.05) continue;
      if (physics._inside(c, x, z, rad)) return false;
    }
    return true;
  };
  // why (x, z) can't hold a piece of radius rad (null: it can)
  const whyNot = (x, z, rad, o) => {
    const h = H(x, z);
    if (h < (o.minH ?? 1.2)) return 'low ' + h.toFixed(2);
    if (T.slopeAt(x, z) > 0.45) return 'steep';
    if (W.pathDist && W.pathDist(x, z) < 1.25 + rad) return 'path';
    if (streetDist(x, z) < (o.street ?? -0.5) + rad) return 'street';
    if (lifeClear(x, z) || lifeClear(x + rad, z) || lifeClear(x - rad, z) || lifeClear(x, z + rad) || lifeClear(x, z - rad)) return 'townlife';
    if (x > CUSTOMS.x0 - rad && x < CUSTOMS.x1 + rad && z > CUSTOMS.z0 - rad && z < CUSTOMS.z1 + rad) return 'customs';
    for (const [kx, kz, r] of keep) if (Math.hypot(x - kx, z - kz) < r + rad) return 'keep';
    for (const [kx, kz, r] of spots) if (Math.hypot(x - kx, z - kz) < r + rad) return 'npc';
    for (const d of W.dogs || []) { const A = d.area; if (A && x > A.x0 - rad && x < A.x1 + rad && z > A.z0 - rad && z < A.z1 + rad) return 'dog'; }
    for (const p of placed) if (Math.hypot(x - p.x, z - p.z) < p.r + rad) return 'placed';
    return clearOfColliders(x, z, rad) ? null : 'collider';
  };
  // a footprint (hw × hd turned ry, or a disc) sampled at its corners, edges and centre
  const samples = (x, z, ry, fp) => {
    if (fp.r != null) return [[x, z, fp.r]];
    const ax = Math.cos(ry), az = -Math.sin(ry), bx = Math.sin(ry), bz = Math.cos(ry), rr = Math.min(fp.hw, fp.hd);
    const out = [];
    const nx = Math.max(1, Math.ceil((fp.hw - rr) / rr)), nz = Math.max(1, Math.ceil((fp.hd - rr) / rr));
    for (let i = -nx; i <= nx; i++) for (let j = -nz; j <= nz; j++) { const u = (i / nx) * (fp.hw - rr), v = (j / nz) * (fp.hd - rr); out.push([x + ax * u + bx * v, z + az * u + bz * v, rr]); }
    return out;
  };
  const skipped = [];
  let count = 0;
  const kinds = {};
  // place(name, builder, x, z, ry, fp, opts): fp is the footprint the builder will return (to fit before building)
  const place = (name, fn, x, z, ry, fp, o = {}) => {
    const tries = [[0, 0]];
    let first = '';
    if (o.shift !== 0) for (const d of [0.4, 0.8, 1.1]) for (let k = 0; k < 8; k++) tries.push([Math.cos(k * Math.PI / 4) * d, Math.sin(k * Math.PI / 4) * d]);
    for (const [ox, oz] of tries) {
      const cx = x + ox, cz = z + oz, pts = samples(cx, cz, ry, fp);
      const why = pts.map(([px, pz, r]) => whyNot(px, pz, r + (o.pad ?? 0.1), o)).find(Boolean);
      if (why) { if (!ox && !oz) first = why; continue; }
      // stand it on the lowest ground under its footprint (it sinks a touch on a slope rather than float)
      const y = Math.min(...pts.map(([px, pz]) => H(px, pz))) - 0.02;
      const k = kitAt(cx, cz);
      const got = k.at(cx, y, cz, ry, () => fn(k)) || fp;
      for (const [px, pz, r] of pts) placed.push({ x: px, z: pz, r: r + 0.05 });
      const tall = got.top > 1.3;
      if (got.r != null) physics.add({ type: 'cyl', x: cx, z: cz, r: got.r, top: y + got.top, noStand: true, seeThrough: !tall });
      else physics.add({ type: 'box', x: cx, z: cz, hw: got.hw, hd: got.hd, rot: ry, top: y + got.top, noStand: true, seeThrough: !tall });
      count++; kinds[name] = (kinds[name] || 0) + 1;
      return [cx, cz];
    }
    skipped.push(`${name} (${x.toFixed(1)}, ${z.toFixed(1)}): ${first}`);
    return null;
  };
  // NPCs' places: every NPC defined for Citadel (present now or in some chapter), the townlife spots
  for (const s of Object.values(W.life?.spots || {})) spots.push([s.x, s.z, 1.8]);
  for (const [x, z] of [[-39.6, -2.4], [-40.8, -1.1], [-46.2, -0.9], [-118, 45.2], [-49, 4], [-47.7, 4], [-35.5, -11.5], [-40, 6], [-34, -7.5], [-50, 30], [-30, 45], [-60, 55], [-29.3, 75.3]]) spots.push([x, z, 2.0]);

  // footprints (as the builders return them) and shorthands
  const FP = { bin: { r: 0.29 }, tub: { r: 0.37 }, tubS: { r: 0.33 }, bollard: { r: 0.17 }, post: { r: 0.2 }, bench: { hw: 0.9, hd: 0.34 }, board: { hw: 0.77, hd: 0.2 }, planter: { hw: 0.73, hd: 0.31 }, fountain: { r: 0.34 }, cart: { hw: 1.1, hd: 0.55 }, info: { hw: 0.45, hd: 0.34 }, kiosk: { hw: 1.06, hd: 0.76 } };
  const BIN_COLORS = ['#2a8a7a', '#2f6a9a', '#3f8a4a'];
  let binN = 0;
  const bin = (x, z, ry = 0) => place('bin', (k) => P.litterBin(k, { color: BIN_COLORS[binN++ % 3] }), x, z, ry, FP.bin);
  const tub = (x, z, seed = 1, color) => place('tub', (k) => P.flowerTub(k, { seed, r: 0.32, color: color || '#b8623a' }), x, z, seed, FP.tubS);
  const post = (x, z, boards) => place('signpost', (k) => P.signPost(k, boards), x, z, 0, FP.post, { pad: 0.15 });
  const bench = (x, z, ry, color = '#2f6a9a') => place('bench', (k) => P.waitingBench(k, { w: 1.7, color }), x, z, ry, FP.bench);
  const board = (x, z, ry, kind = 'notices') => place('board-' + kind, (k) => P.streetNoticeBoard(k, { kind, w: 1.3, h: 0.9 }), x, z, ry, FP.board, { pad: 0.2 });
  const planter = (x, z, ry, seed = 1) => place('planter', (k) => P.planterBox(k, { w: 1.4, d: 0.55, seed }), x, z, ry, FP.planter);
  // a bin at one end of an existing bench (collider {x,z,rot,hw}), along its length
  const binBy = (bx, bz, rot, side = 1) => bin(bx + Math.cos(rot) * side * 1.35, bz - Math.sin(rot) * side * 1.35);

  // ---------------------------------------------------------------- the square and its edges
  binBy(-49, -7.4, 1.119, 1);
  binBy(-35.8, 2.6, -2.387, -1);
  const sqx = -44.6, sqz = 6.6;   // where the south lane leaves the square
  post(sqx, sqz, [{ text: 'HARBOUR', a: heading(sqx, sqz, ...TO.lane), color: '#2a8a7a' }, { text: 'SPACEPORT', a: heading(sqx, sqz, ...TO.lane), color: '#7a52b0' }, { text: 'LIGHTHOUSE', a: heading(sqx, sqz, ...TO.lane), color: '#c8452f' }]);
  board(-36.4, -15.2, 0.35);                      // a notice board at the square's north-east corner, read from the square
  place('infostand', (k) => P.infoStand(k), -51.2, -1.6, Math.PI / 2 + 0.2, FP.info);
  // ---------------------------------------------------------------- flower tubs either side of front doors
  let seed = 3;
  for (const h of W.houses || []) {
    const d = h.door; if (!d || h.id === 'twinsen' || Math.hypot(d.x + 30.35, d.z - 75.3) < 1 || Math.hypot(d.x + 99.1, d.z - 31.55) < 1) continue;   // (not Twinsen's own, nor Zoé's spot by the east door, nor Nell's)
    const ry = h.ry ?? Math.atan2(d.x - h.x, d.z - h.z), nx = Math.sin(ry), nz = Math.cos(ry), ax = Math.cos(ry), az = -Math.sin(ry);
    for (const s of [-1, 1]) tub(d.x + nx * 0.5 + ax * s * 1.65, d.z + nz * 0.5 + az * s * 1.65, seed++, s > 0 ? '#b8623a' : '#2f6a9a');
  }
  // ---------------------------------------------------------------- the lane south from the square
  // a resting spot on the way down (bench facing the lane, a bin, a tub)
  bench(-42.3, 19.5, -Math.PI / 2); bin(-42.3, 21.0); tub(-42.3, 18.0, 21);
  // where the harbour path leaves the lane: a sign post, a notice board, bins between the two benches
  { const x = -43.2, z = 30.9;
    post(x, z, [{ text: 'HARBOUR', a: heading(x, z, ...TO.harbour), color: '#2a8a7a' }, { text: 'SPACEPORT', a: heading(x, z, ...TO.spaceport), color: '#7a52b0' }, { text: 'SQUARE', a: heading(x, z, ...TO.lane), color: '#c8452f' }, { text: 'LIGHTHOUSE', a: heading(x, z, ...TO.laneS) }]); }
  board(-42.8, 34.6, -Math.PI / 2);
  bin(-50.8, 34.4); binBy(-48.3, 34.4, Math.PI, -1);
  place('fountain', (k) => P.drinkingFountain(k), -43.4, 37.4, -Math.PI / 2, FP.fountain);
  // further down, a second resting spot facing the lane from the west
  bench(-48.2, 50.0, Math.PI / 2, '#c8452f'); bin(-48.2, 51.6); planter(-48.3, 47.9, Math.PI / 2, 9);
  // by Twinsen's bench at the lane's end, and the lighthouse junction
  binBy(-46.3, 82.1, 1.571, 1);
  { const x = -43.3, z = 73.0;
    post(x, z, [{ text: 'LIGHTHOUSE', a: heading(x, z, ...TO.lighthouse), color: '#c8452f' }, { text: 'SQUARE', a: heading(x, z, -45.6, 60), color: '#2a8a7a' }]); }
  // ---------------------------------------------------------------- the harbour path and the quay
  binBy(-95.11, 29.59, 0, 1); binBy(-67.9, 28.4, 1.571, -1);
  place('handcart', (k) => P.handCart(k, { load: 'sacks', seed: 7 }), -58.4, 30.2, 0.15, FP.cart);
  { const x = -105.6, z = 41.6;
    post(x, z, [{ text: 'PIER', a: -Math.PI / 2, color: '#2a8a7a' }, { text: 'SQUARE', a: heading(x, z, -90, 38), color: '#c8452f' }, { text: 'SPACEPORT', a: heading(x, z, -90, 38), color: '#7a52b0' }]); }
  board(-110.4, 46.6, Math.PI / 2, 'ferry');     // the ferry timetable, in the open quay (read from its east side)
  bin(-109.15, 40.0); bin(-111.85, 40.0);         // either end of the quay's bench
  bench(-109.8, 53.1, 0, '#2a8a7a'); bin(-108.3, 53.2); tub(-111.3, 53.2, 31, '#2f6a9a');   // a bench looking out to sea
  // mooring bollards along the quay's east edge (where it drops to the basin)
  for (const z of [46.6, 49.4, 52.2]) place('bollard', (k) => P.bollard(k), -107.4, z, 0, FP.bollard, { minH: 1.5 });
  place('handcart-quay', (k) => P.handCart(k, { load: 'crates', seed: 9 }), -116.4, 48.8, 1.2, FP.cart);
  // ---------------------------------------------------------------- the foot of the spaceport's bridge
  bench(-34.6, 43.6, Math.PI / 2 + 0.3, '#7a52b0'); bin(-34.0, 45.1); tub(-33.6, 36.2, 41, '#e8c040'); planter(-36.0, 36.6, 0.1, 12);

  for (const k of kits.values()) k.flush();
  W.cityDress = { placed: count, kinds, skipped };
  return W.cityDress;
}
