// The Hamalayi (chapters 6–7): the mountains in Twinsun's north, where the ice is melting from below. An
// outdoor region on its own terrain patch, like Desert Island: terraces of snow separated by rock cliffs,
// connected by trails; impassable peaks all around.
//
// South → north: the foothills where Hesk's glider comes down (a shepherd's hut) · a meltwater gorge (a dead
// tree knocked across it with the ball is the bridge) · the switchback trail · Lhar, a village of stone
// houses on a terrace under a frozen waterfall · the pass along a ledge, cut by a rockslide; a rope-and-
// pulley lift up the cliff instead, its winch frozen (the project's heat post beside it can thaw it) · the
// old monastery on the upper terrace (the refuge) · the observatory on the peak, and the glacier basin with
// the ice vent (chapter 7).
//
// CONTRACT used by src/game/story/pass.js (chapter 6) and observatory.js (chapter 7). World coordinates.
//   R.landing {x,z,a}; R.glider {x,z}; R.hut {x,z}
//   R.gorge {tree:{x,y,z, fallen, fell(instant?)}}  ballTargets entry {…, tree:true}
//   R.lhar {x,z}; R.npcSpots {yorna, pim, v1, v2, v3, keeper, hesk} {x,z,a}
//   R.lift {bottom:{x,z}, top:{x,z}, y0, y1, frozen, thaw(), up, ride(up, riders, done)}; R.heatPost {x,z, on, setOn(b)}
//   R.slide {x,z}  (the rockslide that blocks the ledge)
//   R.monastery {gate:{x,z}, yard:{x,z}}
//   R.observatory {door:{x,z}, x,z}; R.vent {x,z, open, setOpen(b)}; R.basin {x,z}
//   R.snow {setLevel(0..1)}
import * as THREE from 'three';
import { Terrain } from '../engine/terrain.js';
import { textures } from '../engine/textures.js';
import { rng, smoothstep, distToSegment } from '../engine/math.js';
import { rockGeometry, treeGeometry } from './vegetation.js';
import { tm, pm, ctex, cached, bbox, cyl, lathe, tube, Batch, member, rod, mesh, instances, lodInstances } from './kit.js';
import { Kit, MAT, barrel, crate, handCart } from './props.js';
import { MM, TRIM, mountainHouse, mountainSign, noticeBoard, dryWall, fence, woodpile, sledge, trough, hayRack, dryingRack, lanternPost, firePit, markerFlag, windsock, bellPost, wheel, liftWinch, prayerWheels, monasteryHall, monasteryGate, observatory, heatCabinetDress, drift, logGeo } from './props-mountain.js';

export const HAMALAYI = { x: 4300, z: 0 };
const SIZE = 230, SEGS = 230;
const L0 = 3.0, L1 = 12.0, L3 = 22.0, L4 = 30.0, LB = 16.0; // foothills, Lhar, monastery, peak, glacier basin

// ================================================================== layout (local)
const LANDING = { x: 4, z: 86 };
const HUT = { x: -12, z: 80 };
const GORGE = { z0: 39, z1: 47, bridgeX: -6 };
const TRAIL = [[16, 34], [30, 25], [24, 15], [12, 9]];           // switchbacks L0 → L1
const LHAR = { x: -8, z: 12, r: 22 };
const LEDGE = [[22, 0], [38, -6], [50, -18]];                       // the pass (L1 rising), cut by the slide
const SLIDE = { x: 38, z: -6 };
const LIFT = { x: 24, z: -22.2, top: { x: 24, z: -28.5 } };        // platform on L1 at the cliff foot, rises to L3
const MONAST = { x: 34, z: -44 };
const RIDGE = [[18, -40], [6, -56], [-6, -66]];                     // monastery terrace → peak (L3 → L4)
const OBS = { x: -14, z: -72 };
const BASIN = { x: -48, z: -46, r: 20 };
const DESCENT = [[-22, -66], [-34, -58]];                            // peak → basin (L4 → LB)
const VENT = { x: -50, z: -48 };
// SD-3: the walks a player makes (painted as trodden paths; the dressing keeps clear of them) — [points, half-width]
const PATHS = [
  [[[4, 86], [-1, 74], [-5, 62], [-6, 54], [-6, 33]], 1.8],                    // landing → the tree bridge
  [[[-6, 36], [5, 35.5], [16, 34]], 1.8],                                      // the bridge → the trail
  [[[12, 9], [-8, 13]], 2.0],                                                  // the trail's top → the square
  [[[-8, 13], [4, 5], [12, -5], [19, -14], [24, -20]], 1.6],                   // the square → the lift
  [[[24, -31], [29, -33], [34, -33], [34, -40]], 1.6],                         // the lift's top → the gate → the yard
  [[[34, -32.4], [25, -32.4], [18, -40]], 1.8],                                // the gate → round the wall → the ridge path
  [[[-6, -66], [-14, -66], [-22, -66]], 1.8],                                  // the ridge's end → the door → the descent
];
// spots the story uses (NPCs, interactions, spawns, enemies, ball-throw rings): nothing solid is placed in them
const KEEP = [
  ['landing', 4, 86, 3], ['hesk', 5.5, 82, 1.6], ['glider', 9, 84, 5.5], ['tree', -5.4, 37.8, 5.5], ['bridgeS', -6, 50, 2.5],
  ['lharTest', -8, 20, 1.6], ['shrine', -8, 13, 2.2], ['yorna', -6, 6, 1.8], ['pim', -3, 7.5, 1.8], ['v1', -18, 8, 1.8], ['v2', -14, 1, 1.8], ['v3', 0, 2, 1.8],
  ['kite', -8.6, -13.4, 5], ['heatPost', 20.8, -19.8, 2.2], ['pad', 24, -22.2, 2.6], ['liftBottom', 24, -20, 2], ['winchUse', 26.4, -19.4, 1.2], ['rope', 27.8, -20.8, 1.0],
  ['yornaW', 24, -18.6, 1.2], ['mite0', 20, -17, 1.5], ['mite1', 27, -16, 1.5], ['mite2', 30, -19, 1.5],
  ['liftTop', 24, -29.5, 2.2], ['riders', 24, -31, 2.0], ['crank', 25.6, -29.5, 1.2], ['ramp', 24, -26, 2.4],
  ['gate', 34, -33, 2], ['hesk7', 36, -32, 1.2], ['yard', 34, -40, 2.2], ['y0', 31, -40, 1.2], ['y1', 32.5, -39, 1.2], ['y3', 35.5, -39, 1.2], ['y4', 37, -40, 1.2], ['c7spawn', 34, -38, 1.2], ['c10land', 36, -37, 1.5],
  ['obsDoor', -14, -66, 2], ['obsOut', -14, -63.8, 1.2], ['nmite0', -9.3, -61.4, 1.2], ['nmite0b', -5.3, -61.4, 1.2], ['nmite1', -11.2, -62.7, 1.2], ['nmite1b', -7.2, -62.7, 1.2], ['crawler', 10, -49.5, 1.5],
  ['basin', -48, -46, 21], ['slide', 38, -6, 4],
];

const r0 = rng(9191);
const MAT_WOOD = () => tm('wood', { color: '#6a4a30' });
const SPH = () => cached('hsack', () => new THREE.SphereGeometry(0.28, 10, 7));
const seg = (P, x, z) => { let d = 1e9; for (let i = 0; i < P.length - 1; i++) d = Math.min(d, distToSegment(x, z, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1])); return d; };
// position along a polyline (0..1) of the nearest point
function along(P, x, z) {
  let best = 1e9, tAt = 0, acc = 0; const L = [];
  let tot = 0; for (let i = 0; i < P.length - 1; i++) { const l = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); L.push(l); tot += l; }
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, az] = P[i], [bx, bz] = P[i + 1], dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < best) { best = d; tAt = (acc + t * L[i]) / tot; }
    acc += L[i];
  }
  return tAt;
}

// terrace map: which level a point belongs to (before trails are cut in)
function level(x, z) {
  // the outer wall of peaks
  const edge = Math.max(Math.abs(x) / 100, Math.abs(z - 5) / 102);
  if (edge > 0.93) return 34 + (edge - 0.93) * 300;
  if (z > 31) return L0;
  // the glacier basin west, the peak north-west, the monastery terrace north-east
  if (Math.hypot(x - BASIN.x, z - BASIN.z) < BASIN.r + 6 + Math.sin(Math.atan2(z - BASIN.z, x - BASIN.x) * 3) * 3) return LB;
  if (Math.hypot((x - OBS.x) / 1.2, z - OBS.z) < 14) return L4;
  if (z < -26 && x > 0) return L3;
  if (z < -26) return 26;                       // high rock between the terraces
  if (x > 46) return 24;                        // the east wall above the pass
  return L1;
}
function heightFn(x, z) {
  // blurred terrace levels: sample a small cross so the cliffs are steep but not knife-edged
  const e = 1.6;
  let h = (level(x, z) * 4 + level(x + e, z) + level(x - e, z) + level(x, z + e) + level(x, z - e)) / 8;
  // the meltwater gorge across the foothills
  if (z > GORGE.z0 && z < GORGE.z1) h = Math.min(h, 0.4 + 2.6 * Math.pow(Math.abs(z - (GORGE.z0 + GORGE.z1) / 2) / ((GORGE.z1 - GORGE.z0) / 2), 6));
  // a way back up out of the gorge at its east end
  if (x > 36 && z > GORGE.z0 - 2 && z < GORGE.z1 + 2) h = Math.max(h, L0 - 0.1 - Math.max(0, 46 - x) * 0.3);
  // trails: ramps that cut through the cliffs between levels
  const ramp = (P, y0, y1, w) => { const d = seg(P, x, z); if (d < w + 2) { const y = y0 + (y1 - y0) * along(P, x, z); const k = smoothstep(w + 2, w, d); h = h + (y - h) * k; } };
  ramp(TRAIL, L0, L1, 2.6);
  ramp(LEDGE, L1, L1 + 6, 1.8);
  ramp(RIDGE, L3, L4, 2.4);
  ramp(DESCENT, L4, LB, 2.4);
  // snowdrifts and lumps on the flats
  const lump = Math.sin(x * 0.21 + z * 0.13) * Math.sin(z * 0.17 - x * 0.07) * 0.35;
  return h + lump;
}

const C = (c) => new THREE.Color(c);
const COL = { snow: C('#ffffff'), snowShade: C('#e4ecf8'), rock: C('#d8c8b8'), rockDark: C('#b8a898'), trail: C('#b8a088'), ice: C('#bcdcf0') };
function colorFn(x, z, h, slope, c) {
  c.copy(COL.snow).lerp(COL.snowShade, 0.25 + Math.sin(x * 0.5 + z * 0.3) * 0.1);
  if (slope > 0.75) c.lerp(COL.rock, smoothstep(0.75, 1.4, slope));
  if (h > 32) c.lerp(COL.rockDark, 0.3);
  if (Math.hypot(x - BASIN.x, z - BASIN.z) < BASIN.r + 4 && Math.abs(h - LB) < 1.2) c.lerp(COL.ice, 0.7);
}
function splatFn(x, z, h, slope, w) {
  w[0] = 0; w[1] = 1; w[2] = 0; w[3] = 0; w[4] = 0;
  const rk = smoothstep(0.7, 1.25, slope);
  w[2] = rk; w[1] = 1 - rk;
  const tr = Math.min(seg(TRAIL, x, z), seg(LEDGE, x, z), seg(RIDGE, x, z), seg(DESCENT, x, z));
  if (tr < 2.2) { w[3] = smoothstep(2.2, 1.0, tr) * 1.3; w[1] *= 0.6; }
  // trodden paths with a wandering edge (PATHS), a ragged paved square, the monastery's paved yard
  let pd = 1e9, pw = 0;
  for (const [P, hw] of PATHS) { const d = seg(P, x, z) - hw * (0.55 + 0.18 * Math.sin(x * 0.7 + z * 0.43) + 0.1 * Math.sin(z * 1.9 - x * 0.3)); if (d < pd) { pd = d; pw = hw; } }
  if (pd < 0.8 && slope < 0.9) { const k = smoothstep(0.8, -0.2, pd); w[3] = Math.max(w[3], k * 1.1); w[1] *= 1 - k * 0.45; }
  const a = Math.atan2(z - LHAR.z - 1, x - LHAR.x), rr = 8.6 + Math.sin(a * 3 + 1) * 1.1 + Math.sin(a * 7 + 2) * 0.45;
  if (Math.abs(h - L1) < 1) { const k = smoothstep(rr + 0.6, rr - 0.6, Math.hypot(x - LHAR.x, z - LHAR.z - 1)); if (k > 0) { w[4] = Math.max(w[4], 0.95 * k); w[1] *= 1 - k * 0.5; } }
  if (x > MONAST.x - 8.6 && x < MONAST.x + 8.6 && z > MONAST.z - 1.4 && z < MONAST.z + 9.6) { const e = Math.min(x - MONAST.x + 8.6, MONAST.x + 8.6 - x, z - MONAST.z + 1.4, MONAST.z + 9.6 - z) + Math.sin(x * 1.3 + z) * 0.25; const k = smoothstep(0.0, 1.2, e); w[4] = Math.max(w[4], 0.95 * k); w[1] *= 1 - k * 0.6; }
}

// powder snow: soft drifts and a sparkle of blue-white grains
const snowTex = () => ctex('hsnow', 256, 256, (x, S) => {
  const r = rng(23);
  x.fillStyle = '#f2f6fc'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 60; i++) {
    const cx = r() * S, cy = r() * S, rad = 20 + r() * 50;
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { const g = x.createRadialGradient(cx + ox, cy + oy, 2, cx + ox, cy + oy, rad); g.addColorStop(0, r() < 0.5 ? 'rgba(210,222,240,0.35)' : 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(230,238,250,0)'); x.fillStyle = g; x.fillRect(cx + ox - rad, cy + oy - rad, rad * 2, rad * 2); }
  }
  for (let i = 0; i < 900; i++) { x.fillStyle = r() < 0.5 ? 'rgba(170,190,220,0.35)' : 'rgba(255,255,255,0.9)'; x.fillRect(r() * S, r() * S, 1.5, 1.5); }
});
const flagTex = () => ctex('hflags', 128, 32, (x, W, H) => { const cols = ['#d8302a', '#e8c030', '#2f8a3a', '#2a6ad8', '#f4f4f4']; for (let i = 0; i < 5; i++) { x.fillStyle = cols[i]; x.fillRect(i * W / 5 + 2, 0, W / 5 - 4, H); } }, true);

// ================================================================== build
export function buildHamalayi(scene, physics) {
  const ox = HAMALAYI.x, oz = HAMALAYI.z;
  const group = new THREE.Group(); group.name = 'hamalayi'; group.visible = false; group.position.set(ox, 0, oz); scene.add(group);
  const W = (x, z) => ({ x: ox + x, z: oz + z });
  const col = (c) => physics.add({ ...c, x: c.x + ox, z: c.z + oz });
  const updaters = [];
  const TX = textures();
  const terrain = new Terrain({ size: SIZE, segs: SEGS, heightFn, colorFn, splatFn, textures: { ...TX, rock: TX.cliff, sand: snowTex(), cobble: TX.cobble } });
  group.add(terrain.mesh);
  physics.terrain.addPatch(terrain, ox, oz);
  const H = (x, z) => terrain.heightAt(x, z);
  const R = {
    id: 'hamalayi', outdoor: true, group, lights: [], exits: [], searches: [], ballTargets: [], updaters, music: 'hamalayi',
    env: { fog: '#dfe8f2', sun: '#fff6ec', hemiSky: '#eef2ff', hemiGround: '#c0bccc', sunI: 2.6, hemiI: 1.6, fogRange: [70, 250] },
    terrain,
  };
  R.env.fogColor = new THREE.Color(R.env.fog);
  const B = new Batch(group);
  const stone = (c = '#b8b0a4') => tm('stone', { color: c });
  const slate = tm('slate', { color: '#7a8090' });
  const wood = tm('wood', { color: '#8a6040' });
  const darkWood = tm('wood', { color: '#5a3a24' });
  const iron = pm('#4a4c54', 0.5, { metalness: 0.5 });
  const rope = pm('#c8b08a', 0.9);
  const snowM = pm('#f6faff', 0.9);
  const ice = pm('#bfe4ff', 0.15, { transparent: true, opacity: 0.85, metalness: 0.1 });
  const teal = tm('teal', { rough: 0.55, metal: 0.3 });

  // ---- SD-3 dressing: one Kit per area (merged per material, culled per area); every placed piece is checked
  // against the story's spots and the walking routes (R.dress.log lists any piece that intrudes), and gets a collider
  const KITS = {}, kitOf = (a) => (KITS[a] ??= new Kit(group));
  const dress = { log: [], placed: [] }, keep = KEEP.slice();
  const footR = (fp) => (fp.r != null ? fp.r : Math.hypot(fp.hw, fp.hd));
  const check = (name, x, z, rad) => {
    for (const [k, kx, kz, kr] of keep) { const d = Math.hypot(x - kx, z - kz); if (d < kr + rad * 0.8) dress.log.push(`${name} @${x.toFixed(1)},${z.toFixed(1)} in ${k} (${d.toFixed(1)} < ${(kr + rad * 0.8).toFixed(1)})`); }
    for (const [P, hw] of PATHS) { const d = seg(P, x, z); if (d < hw + rad * 0.8) dress.log.push(`${name} @${x.toFixed(1)},${z.toFixed(1)} on a path (${d.toFixed(1)} < ${(hw + rad * 0.8).toFixed(1)})`); }
  };
  // put(area, name, x, z, ry, build(k) → footprint, opts): builds at the ground there, adds the collider
  //   opts: y (absolute base), col: 'box' | 'cyl' | false, stand (may be stood on), see (camera looks over), nocheck
  const put = (area, name, x, z, ry, fn, o = {}) => {
    const k = kitOf(area), gy = o.y ?? H(x, z);
    let fp = k.at(x, gy, z, ry, () => fn(k)) || {};
    if (fp instanceof Kit) fp = {};
    const rad = footR(fp.hw != null || fp.r != null ? fp : { r: 0.3 });
    if (!o.nocheck) check(name, x, z, rad);
    if (o.col !== false && (fp.hw != null || fp.r != null)) {
      const top = gy + (fp.top ?? 1);
      const c = fp.r != null && o.col !== 'box' ? { type: 'cyl', x, z, r: fp.r, top } : { type: 'box', x, z, hw: fp.hw ?? fp.r, hd: fp.hd ?? fp.r, rot: ry, top };
      if (!o.stand) c.noStand = true;
      if (o.see) c.seeThrough = true;
      col(c);
    }
    dress.placed.push({ name, x, z, r: +rad.toFixed(2) });
    return { ...fp, gy };
  };
  // region-local point of a piece's local (lx, lz) placed at (x, z) turned ry
  const loc = (x, z, ry, lx, lz) => [x + Math.cos(ry) * lx + Math.sin(ry) * lz, z - Math.sin(ry) * lx + Math.cos(ry) * lz];
  // prayer flags: every quad of every line in one mesh (they were a draw call each)
  const flagPos = [], flagUV = [];
  const flagLine = (a, b, sag, step = 0.62) => {
    const L = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(2, Math.floor(L / step)), ry = -Math.atan2(b[2] - a[2], b[0] - a[0]);
    B.add(tube([a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - sag, (a[2] + b[2]) / 2], b], 0.015, 4, 1), rope, 0, 0, 0);
    const cs = Math.cos(ry), sn = Math.sin(ry);
    for (let k = 1; k < n; k++) {
      const t = k / n, x = a[0] + (b[0] - a[0]) * t, z = a[2] + (b[2] - a[2]) * t, y = a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, u = (k % 5) / 5;
      const q = [[-0.17, 0], [0.17, 0], [0.17, -0.42], [-0.17, -0.42]].map(([lx, ly]) => [x + lx * cs, y + ly, z - lx * sn]);
      for (const i of [0, 3, 1, 1, 3, 2]) flagPos.push(...q[i]);
      for (const i of [0, 3, 1, 1, 3, 2]) flagUV.push(u + (i === 1 || i === 2 ? 0.2 : 0), i < 2 ? 1 : 0);
    }
  };

  // ---- the backdrop: far peaks all round (scenery beyond the walkable patch)
  {
    const peakG = cached('hpeak', () => new THREE.ConeGeometry(1, 1, 7, 3));
    const list = [];
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * Math.PI * 2, r = 135 + r0() * 40;
      list.push({ x: Math.cos(a) * r, y: -5, z: Math.sin(a) * r, ry: r0() * 6, sx: 28 + r0() * 22, sy: 50 + r0() * 45, sz: 28 + r0() * 22 });
    }
    instances(group, peakG, pm('#c8d0dc', 0.9, { flatShading: true }), list, { cast: false });
    const caps = list.map((p) => ({ ...p, y: p.y + p.sy * 0.55, sx: p.sx * 0.46, sy: p.sy * 0.46, sz: p.sz * 0.46 }));
    instances(group, peakG, pm('#ffffff', 0.85, { flatShading: true }), caps, { cast: false });
  }

  // ---- the glider's landing and the shepherd's hut
  const glider = new THREE.Group(); glider.position.set(LANDING.x + 5, H(LANDING.x + 5, LANDING.z - 2) + 0.2, LANDING.z - 2); glider.rotation.set(0.05, 0.6, 0.12); group.add(glider);
  {
    const GB = new Batch(glider), body = pm('#c8b890', 0.55), trim = pm('#7a2a1a', 0.5);
    GB.add(cyl(0.7, 0.45, 5.0, 14, 0), body, 0, 1.0, 0, Math.PI / 2, 0, 0);
    GB.add(bbox(9.5, 0.12, 1.5, 0.04, 1), body, 0, 1.85, -0.3);
    GB.add(bbox(9.6, 0.05, 0.25, 0.01, 1), trim, 0, 1.92, -0.95);
    GB.add(bbox(2.6, 0.08, 0.8, 0.02, 1), body, 0, 1.3, 2.4);
    GB.build();
    col({ type: 'box', x: LANDING.x + 5, z: LANDING.z - 2, hw: 4.8, hd: 1.4, rot: -0.6, top: H(LANDING.x + 5, LANDING.z - 2) + 2, noStand: true });
  }
  R.landing = { ...W(LANDING.x, LANDING.z), a: Math.PI };
  R.glider = W(LANDING.x + 5, LANDING.z - 2);
  // a stone house (props-mountain.js): placed on the lowest ground under its footprint; door spot as before
  // (door·w − w/2 + 0.5 along the front, 0.9 m out), so R.hut and the village's doors don't move
  const smokes = [], houses = [];
  const stoneHouse = (area, x, z, ry, w, d, h, o = {}) => {
    let gy = 1e9; for (const [lx, lz] of [[0, 0], [-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) { const [px, pz] = loc(x, z, ry, lx, lz); gy = Math.min(gy, H(px, pz)); }
    gy = Math.min(gy, H(x, z) - 0.3);
    const fp = put(area, 'house', x, z, ry, (k) => mountainHouse(k, { w, d, h, ...o }), { y: gy, nocheck: true, col: false });
    col({ type: 'box', x, z, hw: fp.hw, hd: fp.hd, rot: ry, top: gy + fp.top });
    if (fp.lean) { const [lx, lz] = loc(x, z, ry, fp.lean.lx, fp.lean.lz); col({ type: 'box', x: lx, z: lz, hw: fp.lean.hw, hd: fp.lean.hd, rot: ry, top: gy + fp.lean.top }); }
    if (fp.smoke) { const [sx, sz] = loc(x, z, ry, fp.smoke[0], fp.smoke[2]); smokes.push({ x: sx, y: gy + fp.smoke[1], z: sz }); }
    const ridge = (s) => { const [px, pz] = loc(x, z, ry, s * (fp.ridge.hx - 0.1), 0); return [px, gy + fp.ridge.y + 0.05, pz]; };
    const cs = Math.cos(ry), sn = Math.sin(ry), dx = w * (o.door ?? 0.4) - w / 2 + 0.5;
    const hs = { x, z, ry, w, d, gy, ridge, door: { x: ox + x + cs * dx + sn * (d / 2 + 0.9), z: oz + z - sn * dx + cs * (d / 2 + 0.9) } };
    houses.push(hs); keep.push(['door', hs.door.x - ox, hs.door.z - oz, 1.1]);
    return hs;
  };
  R.hut = stoneHouse('landing', HUT.x, HUT.z, 0.4, 4.4, 3.6, 2.4, { lean: -1, seed: 5, trim: TRIM.green, doorC: TRIM.ochre, pots: true }).door;
  // the landing field: two rows of marker flags along the glider's run, a windsock at its end; the shepherd's yard:
  // a dry-stone fold with a hay rack, a frozen trough, a woodpile, a sledge, a drying rack; a sign to Lhar
  {
    // the field's edge: an arc of marker flags east and north of the glider, the windsock at its far end
    [[15.5, 90], [16.5, 85.5], [16.8, 81], [16, 76.5], [14, 72.5], [10.8, 69.5], [7, 68]].forEach(([x, z], i) => put('landing', 'marker', x, z, -0.6, (k) => markerFlag(k, { color: i % 2 ? '#f4efe2' : '#e8642a' }), { see: true }));
    put('landing', 'windsock', 13.5, 66.5, -0.6, (k) => windsock(k));
    // Hesk's kit by the glider: a crate, a bedroll, a lantern on the snow
    put('landing', 'heskKit', 12.6, 89.5, 0.5, (k) => { crate(k, 0.6); k.at(0.75, 0, 0.15, -0.3, () => crate(k, 0.45, { pal: 'honey' })); k.add(cyl(0.2, 0.2, 0.9, 10, 0), MM.cloth(), -0.1, 0.8, 0.0, 0, { rz: Math.PI / 2 }); return { hw: 0.75, hd: 0.4, top: 1.0 }; });
    put('landing', 'signLanding', -1.5, 82, 0, (k) => mountainSign(k, [{ text: 'LHAR', a: -3.01 }, { text: 'MONASTERY', a: -3.01 }]));
    const fold = [];
    for (let a = 0.75; a <= 5.6; a += 0.42) { const rr = 4.2 + Math.sin(a * 3 + 1) * 0.5, x = -22 + Math.cos(a) * rr * 1.15, z = 80 + Math.sin(a) * rr; fold.push([x, H(x, z), z]); }
    for (const c of dryWall(kitOf('landing'), fold, { h: 0.95, seed: 7 })) { check('fold', c.x, c.z, 0.5); col({ type: 'box', ...c, seeThrough: true }); }
    put('landing', 'foldHay', -23.2, 79.6, 1.4, (k) => hayRack(k, { w: 1.4 }));
    put('landing', 'foldTrough', -20.2, 83.0, 0.2, (k) => trough(k, { len: 1.3, spout: false }));
    const [wx, wz] = loc(HUT.x, HUT.z, 0.4, 2.2 + 0.42, -0.3);
    put('landing', 'hutWood', wx, wz, 0.4 + Math.PI / 2, (k) => woodpile(k, { w: 1.6, h: 1.0 }), { nocheck: true });
    put('landing', 'hutTrough', -7.6, 83.4, 0.4, (k) => trough(k, { len: 1.6 }));
    put('landing', 'hutSledge', -15.2, 85.6, 0.9, (k) => sledge(k, { seed: 2 }), { stand: true });
    put('landing', 'hutRack', -18.4, 88.6, 0.35, (k) => dryingRack(k, { w: 2.4, seed: 4 }));
    put('landing', 'hutLantern', -10.0, 84.6, 0.4 + Math.PI, (k) => lanternPost(k, { h: 2.2 }));
    for (const [x, z, l, h, d, ry, sd] of [[-25.5, 76.5, 3.4, 0.6, 1.4, 1.2, 1], [-14.5, 77.2, 3.0, 0.6, 1.4, 0.4, 2], [21, 70, 4, 0.7, 2.0, 0.3, 3], [-28, 91, 4.4, 0.8, 2.2, 1.0, 0], [30, 92, 3.6, 0.6, 1.8, 2.0, 2], [-30, 55, 5, 0.8, 2.4, 0.5, 1]]) put('landing', 'drift', x, z, ry, (k) => { drift(k, 0, -0.1, 0, l, h, d, 0, sd); }, { col: false, nocheck: true });
    // the gorge's north bank: a sign at the end of the tree bridge; cairns at both ends
    put('landing', 'signGorge', 3, 38.4, 0, (k) => mountainSign(k, [{ text: 'LHAR', a: 1.9 }, { text: 'FOOTHILLS', a: -0.66 }]));
  }

  // ---- the gorge: meltwater below, a dead tree on the north bank
  {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(220, GORGE.z1 - GORGE.z0 - 3), new THREE.MeshStandardMaterial({ color: '#7ac0e0', roughness: 0.15, transparent: true, opacity: 0.9 }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0.7, (GORGE.z0 + GORGE.z1) / 2); group.add(water);
    const flow = water.material; let ft = 0; updaters.push((dt) => { ft += dt; flow.color.setHSL(0.55, 0.55, 0.66 + Math.sin(ft * 2) * 0.02); });
    // ice chunks drifting
    for (let i = 0; i < 14; i++) B.add(bbox(0.8 + r0(), 0.3, 0.6 + r0(), 0.1, 1), ice, -60 + r0() * 120, 0.75, GORGE.z0 + 2 + r0() * (GORGE.z1 - GORGE.z0 - 4), 0, r0() * 3, 0);
  }
  const tree = new THREE.Group();
  const TREE = { x: GORGE.bridgeX, z: GORGE.z0 - 1.5 };
  tree.position.set(TREE.x, H(TREE.x, TREE.z), TREE.z); group.add(tree);
  {
    const TB = new Batch(tree);
    TB.add(cyl(0.28, 0.42, 11, 9, 1), tm('wood', { color: '#6a5a4a' }), 0, 5.5, 0);
    for (let k = 0; k < 5; k++) { const a = k * 1.3, y = 4 + k * 1.3; TB.add(cyl(0.06, 0.12, 2.4, 6, 1), tm('wood', { color: '#6a5a4a' }), Math.cos(a) * 0.9, y + 0.6, Math.sin(a) * 0.9, 0, 0, Math.cos(a) * 0.9); }
    TB.add(new THREE.SphereGeometry(0.9, 8, 6).scale(1.4, 0.5, 1.2), snowM, 0.6, 8.6, 0.3);
    TB.build();
  }
  const treeCol = col({ type: 'cyl', x: TREE.x, z: TREE.z, r: 0.45, top: H(TREE.x, TREE.z) + 11 });
  const bridgeCol = col({ type: 'box', x: TREE.x, z: (GORGE.z0 + GORGE.z1) / 2, hw: 0.55, hd: (GORGE.z1 - GORGE.z0) / 2 + 2.5, top: L0 - 0.2, enabled: false });
  bridgeCol.enabled = false;
  R.gorge = {
    tree: {
      x: ox + TREE.x + 0.6, y: H(TREE.x, TREE.z) + 8.2, z: oz + TREE.z + 0.3, fallen: false,
      fell(instant = false) {
        this.fallen = true; treeCol.enabled = false; bridgeCol.enabled = true;
        if (instant) { tree.rotation.x = Math.PI / 2; tree.position.y = L0 - 0.55; return; }
        let t = 0; const y0 = tree.position.y;
        updaters.push(function fall(dt) { t += dt; const k = Math.min(1, (t / 1.4) ** 2); tree.rotation.x = k * Math.PI / 2; tree.position.y = y0 + (L0 - 0.55 - y0) * k; if (k >= 1) updaters.splice(updaters.indexOf(fall), 1); });
      },
    },
  };
  R.ballTargets.push({ x: R.gorge.tree.x, y: R.gorge.tree.y, z: R.gorge.tree.z, r: 1.2, tree: true });

  // ---- the trail: cairns and a rope rail on posts along its open (lower) side
  {
    const KT = kitOf('trail');
    for (let i = 0; i < TRAIL.length - 1; i++) {
      const [ax, az] = TRAIL[i], [bx, bz] = TRAIL[i + 1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
      let prev = null;
      for (let d = 1.5; d < L - 1.0; d += 2.6) {
        const cx = ax + ux * d, cz = az + uz * d, side = H(cx - uz * 3.4, cz + ux * 3.4) < H(cx + uz * 3.4, cz - ux * 3.4) ? 1 : -1;
        const x = cx - side * uz * 3.4, z = cz + side * ux * 3.4, y = H(x, z);
        KT.add(cyl(0.07, 0.09, 1.25, 6, 0), MAT_WOOD(), x, y + 0.55, z);
        KT.add(new THREE.SphereGeometry(0.09, 6, 3), snowM, x, y + 1.18, z, 0, { sy: 0.5 });
        col({ type: 'cyl', x, z, r: 0.12, top: y + 1.2, noStand: true, seeThrough: true });
        if (prev) B.add(tube([[prev[0], prev[1] + 1.05, prev[2]], [(prev[0] + x) / 2, (prev[1] + y) / 2 + 0.82, (prev[2] + z) / 2], [x, y + 1.05, z]], 0.022, 4, 1), rope, 0, 0, 0);
        prev = [x, y, z];
      }
    }
  }
  for (let i = 0; i < TRAIL.length - 1; i++) {
    const [ax, az] = TRAIL[i], [bx, bz] = TRAIL[i + 1];
    for (let t = 0.15; t < 1; t += 0.35) { const x = ax + (bx - ax) * t + 2.6, z = az + (bz - az) * t; B.add(new THREE.DodecahedronGeometry(0.4, 0), stone('#9a9488'), x, H(x, z) + 0.3, z); B.add(new THREE.DodecahedronGeometry(0.25, 0), stone('#a8a296'), x, H(x, z) + 0.75, z); }
  }

  // ---- Lhar: the same five houses on the same spots, now stone houses with slate roofs (one with an upper floor
  // and a balcony, two with woodsheds), prayer flags strung from ridge to ridge
  const HOUSES = [[-22, 4, 0.3, 5.5, 4.4, 2.6], [-12, -4, 0.0, 6.2, 4.6, 2.8], [2, -3, -0.2, 5.0, 4.2, 2.5], [-24, 20, 0.5, 4.8, 4.0, 2.4], [6, 18, -0.6, 5.2, 4.2, 2.6]];
  const HOPT = [
    { lean: -1, seed: 1, trim: TRIM.green, doorC: TRIM.red, pots: true },
    { h: 4.8, balcony: true, seed: 2, trim: TRIM.blue, doorC: TRIM.red, wall: '#ecdcc4' },
    { lean: -1, seed: 3, trim: TRIM.red, doorC: TRIM.blue, wall: '#dcd0c0' },
    { seed: 4, trim: TRIM.ochre, doorC: TRIM.green, wall: '#e4d4bc' },
    { lean: 1, seed: 6, trim: TRIM.plum, doorC: TRIM.ochre, pots: true },
  ];
  const doors = [];
  HOUSES.forEach(([x, z, ry, w, d, h], i) => { const o = HOPT[i]; doors.push(stoneHouse('lhar', x, z, ry, w, d, o.h ?? h, o).door); });
  R.lharDoors = doors;
  const LH = houses.slice(1);   // (houses[0] is the hut)
  {
    const near = (A, B2) => { const p = A.ridge(1), q = A.ridge(-1); return Math.hypot(p[0] - B2.x, p[2] - B2.z) < Math.hypot(q[0] - B2.x, q[2] - B2.z) ? p : q; };
    for (const [a, b] of [[0, 1], [1, 2], [0, 3], [2, 4]]) flagLine(near(LH[a], LH[b]), near(LH[b], LH[a]), 0.8);
  }
  // the village square: the stepped stone shrine with its flag pole (where everyone meets), a ragged paved
  // floor (the splat), two short dry-stone walls with gaps for the paths, lanterns, a fire with a pot over it, the
  // village trough, a notice board, woodpiles, carts and sledges by the houses — the walks between doors stay open
  {
    const cx = LHAR.x, cz = LHAR.z + 1, gy = H(cx, cz);
    for (const [r, h, y] of [[1.25, 0.35, 0], [0.95, 0.3, 0.35], [0.65, 0.28, 0.65]]) B.add(cyl(r, r * 1.04, h, 12, 0), stone('#b4aca0'), cx, gy + y + h / 2, cz);
    B.add(new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), stone('#d8d0c0'), cx, gy + 0.93, cz);
    B.add(cyl(0.05, 0.06, 4.2, 6, 0), wood, cx, gy + 2.9, cz);
    B.add(new THREE.SphereGeometry(0.11, 8, 6), pm('#e8b84a', 0.4, { metalness: 0.5 }), cx, gy + 5.05, cz);
    col({ type: 'cyl', x: cx, z: cz, r: 1.35, top: gy + 1.1, noStand: true });
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + 0.4, sx = cx + Math.cos(a) * 6.5, sz = cz + Math.sin(a) * 6.5, sy = H(sx, sz);
      B.add(cyl(0.04, 0.05, 1.2, 5, 0), wood, sx, sy + 0.6, sz);
      flagLine([cx, gy + 5.0, cz], [sx, sy + 1.2, sz], 0.35, 0.75);
    }
    // two short walls closing the square's corners (not across a path or a door's walk)
    const arc = (a0, a1, rr, n) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n, r = rr + Math.sin(a * 5) * 0.5, x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r; return [x, H(x, z), z]; });
    for (const [a0, a1, sd] of [[1.68, 2.25, 3], [0.62, 1.22, 4]]) for (const c of dryWall(kitOf('lhar'), arc(a0, a1, 11, 4), { h: 0.75, bw: 0.62, tw: 0.42, seed: sd })) { check('lharWall', c.x, c.z, 0.6); col({ type: 'box', ...c, seeThrough: true }); }
    for (const [x, z] of [[LHAR.x - 4.5, LHAR.z - 6.5], [LHAR.x + 5.5, LHAR.z + 5.5]]) put('lhar', 'lantern', x, z, x < LHAR.x ? 0.5 : 2.6, (k) => lanternPost(k));
    put('lhar', 'firePit', -4, 17.2, 0.3, (k) => firePit(k, { seed: 2 }), { stand: true });
    for (const [x, z, ry] of [[-5.7, 17.6, 1.4], [-3.6, 19.0, 0.15]]) put('lhar', 'logSeat', x, z, ry, (k) => { for (const sx of [-0.45, 0.45]) k.add(cyl(0.13, 0.15, 0.26, 7, 0), MAT_WOOD(), sx, 0.13, 0); k.add(logGeo(0.17, 1.4), MM.logs(), 0, 0.42, 0, Math.PI / 2); k.add(bbox(1.0, 0.05, 0.2, 0.02, 1), snowM, 0.1, 0.6, 0); return { hw: 0.7, hd: 0.2, top: 0.58 }; }, { stand: true });
    put('lhar', 'trough', -17, 12.3, Math.PI / 2 + 0.3, (k) => trough(k, { len: 1.9 }));
    put('lhar', 'notice', -8.2, -0.75, 0, (k) => noticeBoard(k));
    put('lhar', 'woodpileH1', -15.8, -4.4, -Math.PI / 2, (k) => woodpile(k, { w: 1.9, h: 1.1 }));
    put('lhar', 'woodpileH4', 7.5, 15.9, -0.6 + Math.PI, (k) => woodpile(k, { w: 1.4, h: 0.9, lid: false }));
    put('lhar', 'dryingRack', -5.6, -6.2, 0, (k) => dryingRack(k, { seed: 2 }));
    put('lhar', 'cart', -17.3, 2.4, 0.3 + Math.PI / 2, (k) => handCart(k, { load: 'sacks', seed: 4 }));
    put('lhar', 'sledge', -24.6, 8.6, 0.3 + 1.4, (k) => sledge(k, { seed: 1 }), { stand: true });
    put('lhar', 'sledge2', 10.6, 13.6, 2.2, (k) => sledge(k, { seed: 2, load: false }), { stand: true });
    put('lhar', 'barrels', 3.6, -0.2, -0.2, (k) => { barrel(k, { r: 0.3, h: 0.8 }); k.at(0.62, 0, 0.1, 0.4, () => barrel(k, { r: 0.28, h: 0.75, pal: 'dark' })); k.at(0.3, 0, -0.55, 0.2, () => crate(k, 0.55)); return { hw: 0.75, hd: 0.6, top: 0.85 }; });
    put('lhar', 'crates', -26.3, 0.3, 0.3, (k) => { crate(k, 0.6); k.at(0.05, 0.6, 0.02, 0.3, () => crate(k, 0.5, { pal: 'honey' })); k.at(0.7, 0, 0.1, -0.2, () => barrel(k, { r: 0.28, h: 0.78 })); return { hw: 0.7, hd: 0.4, top: 1.1 }; });
    // the goat pen beyond the west houses: a fence with a gate, a hay rack, a shelter roof on posts, a trough
    {
      const P = [[-28.5, 7.0], [-28.6, 4.2], [-31.4, 3.4], [-34.6, 4.0], [-35.6, 7.6], [-35.0, 11.4], [-32.0, 12.6], [-29.0, 11.8], [-28.4, 9.6]].map(([x, z]) => [x, H(x, z), z]);
      for (const c of fence(kitOf('lhar'), P, { gap: P.length - 1 })) { check('pen', c.x, c.z, 0.3); col({ type: 'box', ...c }); }
      put('lhar', 'hayRack', -32.2, 10.6, 0.15, (k) => hayRack(k));
      put('lhar', 'penTrough', -31.0, 5.2, 0.1, (k) => trough(k, { len: 1.4, spout: false }));
      put('lhar', 'shelter', -34.0, 7.6, Math.PI / 2, (k) => {
        const wd = MAT_WOOD();
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(cyl(0.08, 0.09, sz < 0 ? 1.9 : 1.5, 6, 0), wd, sx * 1.3, (sz < 0 ? 1.9 : 1.5) / 2, sz * 0.7);
        k.add(bbox(3.1, 0.12, 2.0, 0.03, 1), tm('planks', { color: '#b88a5a' }), 0, 1.75, 0, 0, { rx: 0.2 });
        k.add(bbox(2.9, 0.12, 1.8, 0.05, 1), MM.snow(), 0, 1.86, 0, 0, { rx: 0.2 });
        k.add(bbox(2.6, 1.1, 0.08, 0.02, 1), tm('planks', { color: '#9a7050' }), 0, 0.55, -0.7);
        return { hw: 1.4, hd: 0.8, top: 2 };
      }, { see: true });
    }
    // drifts round the square's edge and against the walls
    for (const [x, z, l, h, d, ry, sd] of [[-19.5, 18, 2.6, 0.5, 1.4, 0.8, 1], [6.5, 13.4, 2.2, 0.45, 1.2, 2.4, 2], [-1.5, -8.2, 2.4, 0.5, 1.3, 0.1, 3], [-27, 14.5, 3, 0.6, 1.6, 0.4, 0], [11, 17, 3.4, 0.55, 1.6, 1.2, 1]]) put('lhar', 'drift', x, z, ry, (k) => { drift(k, 0, -0.08, 0, l, h, d, 0, sd); }, { col: false, nocheck: true });
  }
  // the frozen waterfall behind the village and the meltwater pond under it
  {
    const fx = -10, fz = -14, gy = H(fx, fz);
    B.add(cyl(1.2, 2.2, 9, 10, 0, true), ice, fx, gy + 4.5, fz - 1.5);
    for (let i = 0; i < 9; i++) B.add(new THREE.ConeGeometry(0.25 + r0() * 0.2, 1.4 + r0() * 1.4, 6).rotateX(Math.PI), ice, fx - 2 + r0() * 4, gy + 7.2 - r0() * 2, fz - 0.8);
  }
  // Pim's kite, frozen fast to the icefall (a ball knocks it free)
  {
    const kx = -8.6, kz = -13.4, ky = H(-10, -14) + 5.6;
    const kite = new THREE.Group(); kite.position.set(kx, ky, kz); kite.rotation.set(0.2, 0.3, 0.5); group.add(kite);
    const km = new THREE.MeshStandardMaterial({ map: flagTex(), side: THREE.DoubleSide, roughness: 0.8 });
    const kg = new THREE.BufferGeometry(); kg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.6, 0, 0.4, 0, 0, 0, -0.9, 0, -0.4, 0, 0], 3)); kg.setAttribute('uv', new THREE.Float32BufferAttribute([0.5, 1, 1, 0.5, 0.5, 0, 0, 0.5], 2)); kg.setIndex([0, 1, 2, 0, 2, 3]); kg.computeVertexNormals();
    kite.add(new THREE.Mesh(kg, km));
    const tail = new THREE.Mesh(cyl(0.01, 0.01, 1.2, 4, 0), rope); tail.position.set(0, -1.4, 0); kite.add(tail);
    R.kite = { x: ox + kx, y: ky, z: oz + kz, setVisible(b) { kite.visible = !!b; } };
    R.ballTargets.push({ x: R.kite.x, y: R.kite.y, z: R.kite.z, r: 0.8, kite: true });
  }
  // the project's heat station at the foot of the lift: a teal shed, a pipe, a heat post
  const HP = { x: LIFT.x - 3.2, z: LIFT.z + 2.4 };
  {
    const gy = H(HP.x, HP.z);
    B.add(bbox(2.4, 2.2, 1.8, 0.06, 2), teal, HP.x - 2.4, gy + 1.1, HP.z + 0.6);
    B.add(cyl(0.12, 0.12, 2.2, 8, 0), pm('#c8a050', 0.4, { metalness: 0.6 }), HP.x, gy + 1.1, HP.z);
    B.add(tube([[HP.x - 1.2, gy + 1.6, HP.z + 0.4], [HP.x - 0.4, gy + 1.8, HP.z + 0.2], [HP.x, gy + 2.2, HP.z]], 0.08, 6, 1), iron, 0, 0, 0);
    col({ type: 'box', x: HP.x - 2.4, z: HP.z + 0.6, hw: 1.2, hd: 0.9, top: gy + 2.2 });
    col({ type: 'cyl', x: HP.x, z: HP.z, r: 0.25, top: gy + 2.4, noStand: true });
    put('lift', 'heatCabinet', HP.x - 2.4, HP.z + 0.6, 0, (k) => heatCabinetDress(k), { y: gy, col: false, nocheck: true });
  }
  const crystalHP = mesh(group, new THREE.OctahedronGeometry(0.22, 0).scale(1, 1.5, 1), pm('#6a4a3a', 0.25, { emissive: '#ff9a3c', emissiveIntensity: 0, flatShading: true }), HP.x, H(HP.x, HP.z) + 2.5, HP.z, 0, { cast: false });
  R.heatPost = { ...W(HP.x, HP.z), on: false, setOn(b) { this.on = !!b; crystalHP.material.emissiveIntensity = b ? 1.6 : 0; } };

  // ---- the ledge and the rockslide
  {
    const gy = H(SLIDE.x, SLIDE.z);
    for (let i = 0; i < 8; i++) B.add(new THREE.DodecahedronGeometry(0.8 + r0() * 0.9, 0), stone('#8a8478'), SLIDE.x - 2 + r0() * 4, gy + 0.6 + r0() * 1.4, SLIDE.z - 1.5 + r0() * 3, r0(), r0(), r0());
    col({ type: 'cyl', x: SLIDE.x, z: SLIDE.z, r: 3.2, top: gy + 3.5, noStand: true });
  }
  R.slide = W(SLIDE.x, SLIDE.z);

  // ---- the rope lift up the cliff: frame at the top, a platform on four ropes, a winch at the bottom
  const plat = new THREE.Group(); group.add(plat);
  const liftY0 = H(LIFT.x, LIFT.z), liftY1 = L3;
  const winchIce = mesh(group, new THREE.IcosahedronGeometry(1.0, 1).scale(1.35, 0.95, 0.9), ice, LIFT.x + 2.4, liftY0 + 0.95, LIFT.z + 1.2, 0, { cast: false });
  {
    const LB = new Batch(group);
    const tx = LIFT.x, tz = LIFT.top.z + 1.0;
    for (const [dx, dz] of [[-1.4, -1.0], [1.4, -1.0], [-1.4, 1.0], [1.4, 1.0]]) member(LB, [tx + dx, L3, tz + dz], [tx + dx * 0.6, L3 + 4.2, tz + dz * 0.6], 0.16, darkWood);
    member(LB, [tx - 1.0, L3 + 4.0, tz], [tx + 1.0, L3 + 4.0, tz], 0.2, darkWood);
    for (const [dx, dz] of [[-1.4, -1.0], [1.4, -1.0]]) member(LB, [tx + dx, L3 + 0.2, tz + dz], [tx, L3 + 3.9, tz + dz], 0.1, darkWood);
    LB.add(bbox(2.4, 0.12, 0.5, 0.04, 1), snowM, tx, L3 + 4.17, tz);
    LB.build();
    // the winch at the bottom: a drum wound with rope between trestles, a gear and a crank (props-mountain.js)
    put('lift', 'winch', LIFT.x + 2.4, LIFT.z + 1.2, 0, (k) => liftWinch(k), { y: liftY0, col: false, nocheck: true });
    col({ type: 'box', x: LIFT.x + 2.4, z: LIFT.z + 1.2, hw: 1.1, hd: 0.65, top: liftY0 + 1.2, noStand: true });
    const KL = kitOf('lift');
    wheel(KL, 0.55, MAT.iron(), tx, L3 + 3.7, tz + 0.2, { spokes: 6 });
    // guide rails up the cliff behind the platform, tied across every 1.5 m
    for (const gx of [LIFT.x - 1.75, LIFT.x + 1.75]) { KL.add(bbox(0.2, L3 - liftY0 + 0.6, 0.2, 0.03, 1), darkWood, gx, (L3 + liftY0 + 0.6) / 2, LIFT.z - 1.55); col({ type: 'cyl', x: gx, z: LIFT.z - 1.55, r: 0.16, top: L3 + 0.6, noStand: true }); }
    for (let y = liftY0 + 1.2; y < L3; y += 1.5) KL.add(bbox(3.7, 0.12, 0.12, 0.02, 1), darkWood, LIFT.x, y, LIFT.z - 1.7);
    const PB = new Batch(plat);
    PB.add(bbox(3.0, 0.16, 2.6, 0.04, 1), tm('planks', { color: '#b88a5a' }), 0, 0, 0);
    for (const [dx, dz] of [[-1.4, -1.2], [1.4, -1.2], [-1.4, 1.2], [1.4, 1.2]]) PB.add(cyl(0.025, 0.025, 1.2, 4, 0), rope, dx, 0.6, dz);
    PB.add(bbox(3.0, 0.08, 0.08, 0.01, 1), darkWood, 0, 1.0, 1.25);
    PB.build();
  }
  const ropeLine = new THREE.Mesh(cyl(0.03, 0.03, 1, 5, 0), rope); group.add(ropeLine);
  const platCol = col({ type: 'box', x: LIFT.x, z: LIFT.z, hw: 1.5, hd: 1.3, top: liftY0 + 0.08 });
  let platY = liftY0, platGoal = liftY0, riders = [], liftDone = null;
  const placePlat = () => {
    plat.position.set(LIFT.x, platY, LIFT.z);
    platCol.top = platY + 0.08;
    ropeLine.position.set(LIFT.x, (platY + L3 + 3.7) / 2, LIFT.z); ropeLine.scale.y = Math.max(0.1, L3 + 3.7 - platY);
  };
  placePlat();
  R.lift = {
    bottom: W(LIFT.x, LIFT.z + 2.2), top: W(LIFT.top.x, LIFT.top.z - 1.0), y0: liftY0, y1: liftY1, frozen: true, up: false,
    thaw() { this.frozen = false; winchIce.visible = false; },
    // move the platform (with the actors standing on it); x/z of riders are kept, their y follows
    ride(up, list, done) { this.up = !!up; platGoal = up ? liftY1 : liftY0; riders = list || []; liftDone = done || null; },
    // (the lift's platform sits at the cliff foot; at the top it docks beside the frame)
    atTop() { return platY > liftY1 - 0.1; },
    pad: W(LIFT.x, LIFT.z),
    winch: W(LIFT.x + 2.4, LIFT.z + 2.2), crank: W(LIFT.top.x + 1.6, LIFT.top.z - 1.0),
  };
  updaters.push((dt) => {
    if (Math.abs(platGoal - platY) < 0.001) return;
    const d = Math.sign(platGoal - platY) * Math.min(Math.abs(platGoal - platY), dt * 1.6);
    platY += d; placePlat();
    for (const a of riders) { a.pos.y = platY + 0.08; a.vy = 0; a.onGround = true; a.sync?.(); }
    if (Math.abs(platGoal - platY) < 0.001) { const cb = liftDone; liftDone = null; riders = []; cb?.(); }
  });
  // at the top the platform swings to the terrace edge: a plank ramp joins it to L3
  col({ type: 'box', x: LIFT.x, z: -26.0, hw: 1.4, hd: 2.4, top: L3, seeThrough: true });
  // a working station: the bell to call it, a lantern, freight waiting to go up, a crank at the top, signs
  put('lift', 'bell', 21.2, -23.6, 0.2, (k) => bellPost(k));
  put('lift', 'liftLantern', 18.6, -22.4, 0.3, (k) => lanternPost(k));
  put('lift', 'freight', 30.6, -22.9, -0.15, (k) => {
    crate(k, 0.7); k.at(0.05, 0.7, 0.0, 0.25, () => crate(k, 0.55, { pal: 'honey' }));
    k.at(0.95, 0, 0.15, 0.1, () => barrel(k, { r: 0.3, h: 0.82 })); k.at(-0.85, 0, 0.2, -0.3, () => crate(k, 0.6, { pal: 'honey' }));
    for (const [x, z] of [[0.6, 0.75], [-0.2, 0.8]]) k.add(SPH(), MM.cloth(), x, 0.25, z, 0, { sx: 1.0, sy: 0.75, sz: 1.2 });
    return { hw: 1.4, hd: 0.7, top: 1.3 };
  });
  put('lift', 'freightSledge', 32.6, -21.4, 0.9, (k) => sledge(k, { seed: 3 }), { stand: true });
  put('lift', 'signLift', 13.5, -12, 0, (k) => mountainSign(k, [{ text: 'LIFT', a: 2.22 }, { text: 'MONASTERY', a: 2.22 }, { text: 'LHAR', a: -0.71 }]));
  put('lift', 'crankTop', 27.2, -29.5, 0, (k) => {
    const wd = MAT.wood('dark');
    for (const sx of [-1, 1]) k.add(bbox(0.14, 1.4, 0.5, 0.02, 1), wd, sx * 0.3, 0.7, 0);
    wheel(k, 0.5, MAT.iron(), 0.0, 1.2, 0, { spokes: 6 });
    k.add(cyl(0.035, 0.035, 0.4, 6, 0), wd, -0.5, 1.6, 0, 0, { rz: Math.PI / 2 });
    return { r: 0.55, top: 1.7 };
  }, { y: L3, nocheck: true });
  put('lift', 'signTop', 20.5, -32.5, 0, (k) => mountainSign(k, [{ text: 'MONASTERY', a: 1.61 }, { text: 'OBSERVATORY', a: -2.82 }, { text: 'LIFT', a: 0.86 }]));
  put('lift', 'woodTop', 29.0, -27.2, Math.PI, (k) => woodpile(k, { w: 1.6, h: 0.9 }));
  put('lift', 'driftTop', 19.5, -27.8, 0.2, (k) => drift(k, 0, -0.1, 0, 3, 0.6, 1.6, 0, 2), { col: false, nocheck: true });

  // ---- the monastery: a whitewashed hall on a stone plinth under two tiers of flared golden roofs, a pillared
  // porch with steps, prayer wheels under lean-to roofs either side, a gate with a little golden roof, dry-stone
  // courtyard walls (the colliders are the old straight walls), the villagers' belongings in the yard's corners
  {
    const mx = MONAST.x, mz = MONAST.z, gy = H(mx, mz);
    const hall = put('monastery', 'hall', mx, mz - 6, 0, (k) => monasteryHall(k), { y: gy, col: false, nocheck: true });
    col({ type: 'box', x: mx, z: mz - 6, hw: 7, hd: 4.5, top: gy + 9 });
    col({ type: 'box', x: mx, z: mz - 6 + hall.porch.lz, hw: hall.porch.hw, hd: hall.porch.hd, top: gy + hall.porch.top });
    for (const [px, pz] of hall.pillars) col({ type: 'cyl', x: mx + px, z: mz - 6 + pz, r: 0.26, top: gy + 4.5, noStand: true });
    smokes.push({ x: mx + hall.smoke[0], y: gy + hall.smoke[1], z: mz - 6 + hall.smoke[2] });
    for (const sx of [-1, 1]) put('monastery', 'wheels', mx + sx * 5.05, mz - 1.05, 0, (k) => prayerWheels(k), { y: gy + 0.05 });
    for (const [ax, az, bx, bz] of [[mx - 9, mz - 1, mx - 9, mz + 10], [mx + 9, mz - 1, mx + 9, mz + 10], [mx - 9, mz + 10, mx - 2, mz + 10], [mx + 2, mz + 10, mx + 9, mz + 10]]) {
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.round(L / 2.4));
      dryWall(kitOf('monastery'), Array.from({ length: n + 1 }, (_, i) => { const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n; return [x, Math.min(gy, H(x, z)), z]; }), { h: 2.15, bw: 0.82, tw: 0.6, coping: 'slate', step: 2.4, seed: Math.round(ax + az), mat: MM.rubble('#e0d4c0') });
      col({ type: 'box', x: (ax + bx) / 2, z: (az + bz) / 2, hw: 0.35, hd: L / 2, rot: Math.atan2(bx - ax, bz - az), top: gy + 2.2 });
    }
    for (const [x, z] of [[mx - 9, mz + 10], [mx + 9, mz + 10]]) { kitOf('monastery').add(bbox(1.1, 2.9, 1.1, 0.05, 1), stone('#c8bca8'), x, gy + 1.15, z); kitOf('monastery').add(bbox(1.3, 0.14, 1.3, 0.03, 1), slate, x, gy + 2.65, z); col({ type: 'box', x, z, hw: 0.55, hd: 0.55, top: gy + 2.7 }); }
    const gt = put('monastery', 'gate', mx, mz + 10, 0, (k) => monasteryGate(k, { gap: 4 }), { y: H(mx, mz + 10), col: false, nocheck: true });
    for (const [px, pz] of gt.pillars) col({ type: 'box', x: mx + px, z: mz + 10 + pz, hw: 0.45, hd: 0.45, top: gy + 3.2 });
    for (const [lx, lz, ln] of gt.leaves) col({ type: 'box', x: mx + lx, z: mz + 10 + lz, hw: 0.07, hd: ln / 2, top: gy + 2.7, noStand: true });
    // the yard's west corner: the villagers' cart, bundles and crates, a fire with a pot, a woodpile on the wall
    put('monastery', 'yardCart', mx - 6.5, mz + 6.6, Math.PI / 2 + 0.1, (k) => handCart(k, { load: 'crates', seed: 5 }));
    put('monastery', 'yardCrates', mx - 7.7, mz + 3.4, 0.15, (k) => { crate(k, 0.65); k.at(0.0, 0.65, 0.0, 0.3, () => crate(k, 0.5, { pal: 'honey' })); k.at(0.1, 0, 0.75, -0.2, () => barrel(k, { r: 0.3, h: 0.8 })); for (const [x, z] of [[0.75, 0.1], [0.7, 0.75]]) k.add(SPH(), MM.cloth(), x, 0.24, z, 0, { sx: 1.1, sy: 0.75, sz: 1.2 }); return { hw: 0.55, hd: 0.95, top: 1.2 }; });
    put('monastery', 'yardFire', mx - 6.0, mz + 2.4, 0.2, (k) => firePit(k, { seed: 4 }), { stand: true });
    put('monastery', 'yardWood', mx - 8.15, mz + 8.0, Math.PI / 2, (k) => woodpile(k, { w: 1.8, h: 1.1 }));
    put('monastery', 'yardSledge', mx - 5.8, mz + 8.3, 1.5, (k) => sledge(k, { seed: 1 }), { stand: true });
    // the east side by the hall: the trough, a bench by the wall; lanterns inside the gate
    put('monastery', 'yardTrough', mx + 7.6, mz + 1.6, -Math.PI / 2, (k) => trough(k, { len: 1.8 }));
    put('monastery', 'yardBench', mx + 8.1, mz + 5.0, -Math.PI / 2, (k) => { const wd = MAT.wood('honey'); k.add(bbox(1.8, 0.08, 0.4, 0.02, 1), wd, 0, 0.45, 0); for (const sx of [-1, 1]) k.add(bbox(0.1, 0.45, 0.36, 0.02, 1), MAT.wood('dark'), sx * 0.75, 0.22, 0); k.add(bbox(1.6, 0.06, 0.3, 0.03, 1), MM.snow(), 0.1, 0.52, 0); return { hw: 0.9, hd: 0.22, top: 0.5 }; }, { stand: true });
    for (const sx of [-1, 1]) put('monastery', 'gateLantern', mx + sx * 3.1, mz + 8.7, sx < 0 ? 0 : Math.PI, (k) => lanternPost(k, { h: 2.3 }));
    put('monastery', 'signGate', mx + 4.5, mz + 12.5, 0, (k) => mountainSign(k, [{ text: 'OBSERVATORY', a: -1.96 }, { text: 'LIFT', a: -1.43 }]));
    // snow drifts in the yard's corners and against the walls outside
    for (const [x, z, l, h, d, ry, sd] of [[mx - 8.0, mz - 0.4, 2.2, 0.55, 1.4, 0, 1], [mx + 8.0, mz - 0.3, 2.0, 0.5, 1.3, 0, 2], [mx + 8.2, mz + 9.2, 2.0, 0.5, 1.2, 0.7, 3], [mx - 10.1, mz + 4, 4.0, 0.7, 1.4, Math.PI / 2, 0], [mx + 10.1, mz + 2, 4.5, 0.75, 1.5, Math.PI / 2, 1], [mx - 6, mz + 10.9, 3.5, 0.55, 1.2, 0, 2], [mx + 6.5, mz + 10.9, 3.2, 0.5, 1.2, 0, 3]]) put('monastery', 'drift', x, z, ry, (k) => { drift(k, 0, -0.08, 0, l, h, d, 0, sd); }, { col: false, nocheck: true });
  }
  R.monastery = { gate: W(MONAST.x, MONAST.z + 11), yard: W(MONAST.x, MONAST.z + 4) };

  // ---- the observatory on the peak: a stone drum with buttresses and windows on a plinth, a balcony round the
  // ribbed verdigris dome, the open slit with the telescope's barrel in it, a framed door under a canopy,
  // a storehouse at the back, supplies by the wall, a sign where the ridge path arrives
  {
    const gy = H(OBS.x, OBS.z);
    const ob = put('obs', 'observatory', OBS.x, OBS.z, 0, (k) => observatory(k, { R: 5.2, H: 5.5, skip: [-2.09] }), { y: gy, col: false, nocheck: true });
    col({ type: 'cyl', x: OBS.x, z: OBS.z, r: 5.3, top: gy + 9 });
    for (const [bx, bz, a] of ob.buttresses) col({ type: 'box', x: OBS.x + bx, z: OBS.z + bz, hw: 0.36, hd: 0.62, rot: a, top: gy + 4.2, noStand: true });
    const sa = -2.09, sr = 7.3;
    stoneHouse('obs', OBS.x + Math.sin(sa) * sr, OBS.z + Math.cos(sa) * sr, sa, 3.2, 2.4, 2.2, { seed: 7, trim: TRIM.teal, doorC: TRIM.blue, chimney: false, door: 0.5 });
    put('obs', 'obsSupplies', OBS.x - 5.4, OBS.z + 2.8, -1.1, (k) => { crate(k, 0.6); k.at(0.7, 0, 0.05, 0.3, () => barrel(k, { r: 0.3, h: 0.8 })); k.at(0.1, 0.6, 0.0, -0.2, () => crate(k, 0.45, { pal: 'honey' })); return { hw: 0.75, hd: 0.4, top: 1.1 }; });
    put('obs', 'signObs', -2.3, -66.8, 0, (k) => mountainSign(k, [{ text: 'OBSERVATORY', a: -1.5 }, { text: 'MONASTERY', a: 0.66 }]));
  }
  R.observatory = { ...W(OBS.x, OBS.z), door: W(OBS.x, OBS.z + 6.0) };

  // ---- the glacier basin and the ice vent
  const ventCap = mesh(group, new THREE.CylinderGeometry(3.2, 3.6, 1.6, 16), ice, VENT.x, H(VENT.x, VENT.z) + 0.4, VENT.z, 0);
  {
    const VB = new Batch(group);
    for (let i = 0; i < 16; i++) { const a = r0() * 6.28, d = 6 + r0() * 14; const x = BASIN.x + Math.cos(a) * d, z = BASIN.z + Math.sin(a) * d; VB.add(new THREE.ConeGeometry(0.4 + r0() * 0.6, 1.2 + r0() * 2.5, 5), ice, x, H(x, z) + 0.6, z, r0() * 0.3, r0() * 6, r0() * 0.3); }
    VB.build();
  }
  const steam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 3.5, 16, 14, 1, true), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }));
  steam.position.set(VENT.x, H(VENT.x, VENT.z) + 8, VENT.z); group.add(steam);
  updaters.push((dt) => { steam.rotation.y += dt * 0.4; });
  const seal = mesh(group, cyl(1.6, 1.6, 0.3, 18, 0), tm('stone', { color: '#b8a898' }), VENT.x, H(VENT.x, VENT.z) + 0.15, VENT.z, 0);
  R.vent = {
    ...W(VENT.x, VENT.z), open: false, melted: false,
    melt(instant = false) { this.melted = true; if (instant) { ventCap.visible = false; return; } let t = 0; updaters.push(function m(dt) { t += dt; ventCap.scale.y = Math.max(0.01, 1 - t / 4); ventCap.position.y = H(VENT.x, VENT.z) + 0.4 - t * 0.2; if (t > 4) { ventCap.visible = false; updaters.splice(updaters.indexOf(m), 1); } }); },
    setOpen(b) { this.open = !!b; if (b) { ventCap.visible = false; seal.rotation.y = 1.2; seal.position.y -= 0.4; } steam.material.opacity = b ? 0.3 : 0; },
  };
  R.ventPatrol = [[VENT.x - 8, VENT.z - 4], [VENT.x + 6, VENT.z - 6], [VENT.x + 7, VENT.z + 6], [VENT.x - 6, VENT.z + 7]].map(([x, z]) => [ox + x, oz + z]);
  R.basin = W(BASIN.x, BASIN.z);
  col({ type: 'cyl', x: VENT.x, z: VENT.z, r: 3.4, top: H(VENT.x, VENT.z) + 1.2, noStand: true });

  // ---- pines on the lower slopes, rocks everywhere
  {
    const pine = treeGeometry('pine', 1), pm2 = pm('#ffffff', 0.85, { vertexColors: true });
    const list = [];
    for (let i = 0; i < 260 && list.length < 70; i++) {
      const x = (r0() - 0.5) * 190, z = (r0() - 0.5) * 190;
      const h = H(x, z);
      if (h > L1 + 2 || terrain.slopeAt(x, z) > 0.5 || seg(TRAIL, x, z) < 4 || Math.hypot(x - LHAR.x, z - LHAR.z) < LHAR.r || (z > GORGE.z0 - 3 && z < GORGE.z1 + 3)) continue;
      if (Math.hypot(x - LANDING.x, z - LANDING.z) < 9) continue;
      list.push({ x, y: h - 0.1, z, ry: r0() * 6, s: 0.8 + r0() * 0.5, color: '#d8e4dc' });
    }
    // (the random pines keep off the walks and out of the lift station's yard: filtered, so the stream of the
    // random sequence — and every rock placed after it — stays as it was)
    for (let i = list.length - 1; i >= 0; i--) { const t = list[i]; if (Math.hypot(t.x - 26, t.z + 20.5) < 8 || PATHS.some(([P, hw]) => seg(P, t.x, t.z) < hw + 0.9)) list.splice(i, 1); }
    for (const [x, z, s] of [[-4, 94, 1.1], [-0.5, 97.5, 0.85], [-8, 96, 0.95], [18, 66, 1.15], [21.5, 64, 0.9], [-24, 66, 1.0], [-27.5, 63, 1.2], [-21, 94, 1.0], [27, 58, 1.05], [-31, -1, 1.1], [-34.5, 19, 1.0], [15, 24, 0.95], [12, -31, 1.0], [9, -34, 0.85], [44.5, -28.5, 1.0], [20, -50, 1.1], [23, -53, 0.9], [46, -52, 1.0]]) {
      if (terrain.slopeAt(x, z) > 0.5) { dress.log.push(`pine @${x},${z} on a slope`); continue; }
      check('pine', x, z, 0.5 * s);
      list.push({ x, y: H(x, z) - 0.1, z, ry: (x * 7.3 + z) % 6, s, color: '#d8e4dc' });
    }
    lodInstances(group, pine, treeGeometry('pine', 1, 1), pm2, list);
    for (const t of list) col({ type: 'cyl', x: t.x, z: t.z, r: 0.4 * t.s, top: t.y + 6, seeThrough: true });
    const rocks = [];
    for (let i = 0; i < 120; i++) {
      const x = (r0() - 0.5) * 190, z = (r0() - 0.5) * 190;
      if (Math.abs(x) > 90 || Math.abs(z - 5) > 92 || Math.hypot(x - LHAR.x, z - LHAR.z) < LHAR.r - 4 || seg(TRAIL, x, z) < 3 || seg(LEDGE, x, z) < 2.5 || seg(RIDGE, x, z) < 3) continue;
      rocks.push({ x, y: H(x, z) - 0.1, z, ry: r0() * 6, s: 0.3 + r0() * 0.9, color: '#c8c8d0' });
    }
    const rm = pm('#ffffff', 0.95, { vertexColors: true });
    for (let v = 0; v < 3; v++) lodInstances(group, rockGeometry(v + 1), rockGeometry(v + 1, 1), rm, rocks.filter((_, i) => i % 3 === v));
    for (const r of rocks) if (r.s > 0.6) col({ type: 'cyl', x: r.x, z: r.z, r: r.s, top: r.y + r.s * 0.9, seeThrough: true });
  }

  // ---- chimney smoke and falling snow
  {
    const puffs = [];
    const pmat = new THREE.SpriteMaterial({ map: ctex('hsmoke', 64, 64, (x, S) => { const g = x.createRadialGradient(S / 2, S / 2, 2, S / 2, S / 2, S / 2); g.addColorStop(0, 'rgba(240,240,245,0.8)'); g.addColorStop(1, 'rgba(240,240,245,0)'); x.fillStyle = g; x.fillRect(0, 0, S, S); }, false), transparent: true, depthWrite: false });
    for (const s of smokes) for (let k = 0; k < 4; k++) { const sp = new THREE.Sprite(pmat); sp.position.set(s.x, s.y, s.z); group.add(sp); puffs.push({ sp, s, ph: k / 4 }); }
    const N = 400, pos = new Float32Array(N * 3), seed = [];
    for (let i = 0; i < N; i++) seed.push([(r0() - 0.5) * 60, r0() * 20, (r0() - 0.5) * 60, 0.6 + r0() * 0.8]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const flakes = new THREE.Points(g, new THREE.PointsMaterial({ color: '#ffffff', size: 0.16, transparent: true, opacity: 0.85, depthWrite: false }));
    flakes.frustumCulled = false; group.add(flakes);
    let snowLevel = 0.5;
    R.snow = { setLevel(k) { snowLevel = k; }, focus: null };
    updaters.push((dt, t) => {
      for (const p of puffs) { const k = (t * 0.25 + p.ph) % 1; p.sp.position.set(p.s.x + k * 1.5, p.s.y + k * 3, p.s.z); p.sp.scale.setScalar(0.6 + k * 1.8); p.sp.material.opacity = (1 - k) * 0.7; }
      flakes.visible = snowLevel > 0.02; flakes.material.opacity = snowLevel * 0.9;
      const f = R.snow.focus; if (!f) return;
      for (let i = 0; i < N; i++) {
        const s = seed[i]; s[1] -= dt * 1.4 * s[3]; s[0] += Math.sin(t + i) * dt * 0.3;
        if (s[1] < -2) s[1] += 22;
        pos[i * 3] = f.x - ox + s[0]; pos[i * 3 + 1] = f.y + s[1] - 4; pos[i * 3 + 2] = f.z - oz + s[2];
      }
      g.attributes.position.needsUpdate = true;
    });
  }

  B.build();
  for (const [name, k] of Object.entries(KITS)) { const n0 = group.children.length; k.flush(); for (const m of group.children.slice(n0)) m.name = 'sd3-' + name; }
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(flagPos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(flagUV, 2)); g.computeVertexNormals();
    const fm = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: flagTex(), side: THREE.DoubleSide, roughness: 0.9 })); fm.name = 'hflags'; group.add(fm);
  }
  R.dress = dress;
  const at = (x, z, a) => ({ ...W(x, z), a });
  R.npcSpots = {
    yorna: at(-6, 6, Math.PI * 0.8), pim: at(-3, 7.5, Math.PI * 0.9), v1: at(-18, 8, 0.6), v2: at(-14, 1, 0.2), v3: at(0, 2, -0.4),
    hesk: at(LANDING.x + 1.5, LANDING.z - 4, 0.4), keeper: at(OBS.x + 2, OBS.z + 7.5, Math.PI),
  };
  R.lhar = W(LHAR.x, LHAR.z);
  R.spawn = { ...R.landing };
  R.levels = { L0, L1, L3, L4, LB };
  return R;
}
