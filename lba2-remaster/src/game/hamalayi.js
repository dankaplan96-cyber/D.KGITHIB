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
import { tm, pm, ctex, cached, bbox, cyl, lathe, tube, Batch, member, rod, mesh, instances } from './kit.js';

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

const r0 = rng(9191);
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
  if (Math.hypot(x - LHAR.x, z - LHAR.z) < 9 && Math.abs(h - L1) < 1) { w[4] = 0.9; }
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
  const stoneHouse = (x, z, ry, w, d, h, { chimney = true, door = 0.4, roof = slate, tint = '#b8b0a4', flags = true } = {}) => {
    const g = new THREE.Group(); const gy = H(x, z) - 0.25; g.position.set(x, gy, z); g.rotation.y = ry; group.add(g);
    const HB = new Batch(g);
    HB.add(bbox(w, h + 0.25, d, 0.12, 1.6), stone(tint), 0, (h + 0.25) / 2, 0);
    // pitched slate roof with snow on it
    const pitch = Math.atan2(1.3, d / 2);
    for (const s of [-1, 1]) {
      HB.add(bbox(w + 0.5, 0.16, d / 2 / Math.cos(pitch) + 0.35, 0.03, 1), roof, 0, h + 0.25 + 0.65, s * d / 4, s * pitch, 0, 0);
      HB.add(bbox(w + 0.55, 0.08, d / 2 / Math.cos(pitch) + 0.3, 0.03, 1), snowM, 0, h + 0.25 + 0.76, s * d / 4, s * pitch, 0, 0);
    }
    const gable = cached('gable' + d.toFixed(2), () => { const sh = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, 1.3)]); return new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-0.15, 0, 0); });
    for (const s of [-1, 1]) HB.add(gable, stone(tint), s * (w / 2 - 0.15), h + 0.25, 0);
    HB.add(bbox(1.0, 1.9, 0.2, 0.03, 1), darkWood, w * door - w / 2 + 0.5, 0.95 + 0.25, d / 2 + 0.03);
    HB.add(bbox(1.25, 0.14, 0.3, 0.02, 1), wood, w * door - w / 2 + 0.5, 2.0 + 0.25, d / 2 + 0.05);
    for (const wx of [-w / 2 + 0.7, w / 2 - 0.8]) if (Math.abs(wx - (w * door - w / 2 + 0.5)) > 1) { HB.add(bbox(0.6, 0.6, 0.12, 0.02, 1), pm('#ffd890', 0.4, { emissive: '#ff9a40', emissiveIntensity: 0.6 }), wx, 1.6 + 0.25, d / 2 + 0.02); HB.add(bbox(0.74, 0.08, 0.2, 0.01, 1), wood, wx, 1.26 + 0.25, d / 2 + 0.06); }
    if (chimney) { HB.add(bbox(0.55, 1.4, 0.55, 0.04, 1), stone('#9a9286'), w / 2 - 0.8, h + 1.6, -d / 4); }
    HB.build();
    col({ type: 'box', x: x, z: z, hw: w / 2, hd: d / 2, rot: ry, top: gy + h + 2, });
    if (chimney) smokes.push({ x: x + Math.cos(ry) * (w / 2 - 0.8) + Math.sin(ry) * (-d / 4), y: gy + h + 2.4, z: z - Math.sin(ry) * (w / 2 - 0.8) + Math.cos(ry) * (-d / 4) });
    const cs = Math.cos(ry), sn = Math.sin(ry), dx = w * door - w / 2 + 0.5;
    return { door: { x: ox + x + cs * dx + sn * (d / 2 + 0.9), z: oz + z - sn * dx + cs * (d / 2 + 0.9) }, flags };
  };
  const smokes = [];
  R.hut = stoneHouse(HUT.x, HUT.z, 0.4, 4.4, 3.6, 2.4).door;

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

  // ---- the trail: cairns and a rope rail
  for (let i = 0; i < TRAIL.length - 1; i++) {
    const [ax, az] = TRAIL[i], [bx, bz] = TRAIL[i + 1];
    for (let t = 0.15; t < 1; t += 0.35) { const x = ax + (bx - ax) * t + 2.6, z = az + (bz - az) * t; B.add(new THREE.DodecahedronGeometry(0.4, 0), stone('#9a9488'), x, H(x, z) + 0.3, z); B.add(new THREE.DodecahedronGeometry(0.25, 0), stone('#a8a296'), x, H(x, z) + 0.75, z); }
  }

  // ---- Lhar
  const doors = [];
  const HOUSES = [[-22, 4, 0.3, 5.5, 4.4, 2.6], [-12, -4, 0.0, 6.2, 4.6, 2.8], [2, -3, -0.2, 5.0, 4.2, 2.5], [-24, 20, 0.5, 4.8, 4.0, 2.4], [6, 18, -0.6, 5.2, 4.2, 2.6]];
  for (const [x, z, ry, w, d, h] of HOUSES) doors.push(stoneHouse(x, z, ry, w, d, h).door);
  R.lharDoors = doors;
  // prayer-flag lines between the houses
  {
    const fm = new THREE.MeshStandardMaterial({ map: flagTex(), side: THREE.DoubleSide, roughness: 0.9 });
    for (const [a, b] of [[0, 1], [1, 2], [0, 3], [2, 4]]) {
      const [ax, az] = HOUSES[a], [bx, bz] = HOUSES[b];
      const ya = H(ax, az) + 3.4, yb = H(bx, bz) + 3.4, L = Math.hypot(bx - ax, bz - az), n = Math.floor(L / 0.7);
      B.add(tube([[ax, ya, az], [(ax + bx) / 2, (ya + yb) / 2 - 0.7, (az + bz) / 2], [bx, yb, bz]], 0.015, 4, 1), rope, 0, 0, 0);
      for (let k = 1; k < n; k++) {
        const t = k / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = ya + (yb - ya) * t - Math.sin(t * Math.PI) * 0.7;
        const f = new THREE.Mesh(cached('flagq', () => new THREE.PlaneGeometry(0.34, 0.42).translate(0, -0.21, 0)), fm);
        f.position.set(x, y, z); f.rotation.y = -Math.atan2(bz - az, bx - ax); group.add(f);
        const ux = (k % 5) / 5; f.geometry = f.geometry.clone(); const uv = f.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, ux + uv.getX(i) * 0.2);
      }
    }
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
  // stacked firewood, a well with a frozen bucket, benches
  B.add(bbox(2.4, 1.1, 0.9, 0.05, 1), tm('wood', { color: '#9a7050' }), -16, H(-16, 10) + 0.55, 10);
  // the project's heat station at the foot of the lift: a teal shed, a pipe, a heat post
  const HP = { x: LIFT.x - 3.2, z: LIFT.z + 2.4 };
  {
    const gy = H(HP.x, HP.z);
    B.add(bbox(2.4, 2.2, 1.8, 0.06, 2), teal, HP.x - 2.4, gy + 1.1, HP.z + 0.6);
    B.add(cyl(0.12, 0.12, 2.2, 8, 0), pm('#c8a050', 0.4, { metalness: 0.6 }), HP.x, gy + 1.1, HP.z);
    B.add(tube([[HP.x - 1.2, gy + 1.6, HP.z + 0.4], [HP.x - 0.4, gy + 1.8, HP.z + 0.2], [HP.x, gy + 2.2, HP.z]], 0.08, 6, 1), iron, 0, 0, 0);
    col({ type: 'box', x: HP.x - 2.4, z: HP.z + 0.6, hw: 1.2, hd: 0.9, top: gy + 2.2 });
    col({ type: 'cyl', x: HP.x, z: HP.z, r: 0.25, top: gy + 2.4, noStand: true });
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
  const winchIce = mesh(group, new THREE.IcosahedronGeometry(0.9, 0).scale(1.2, 0.9, 1), ice, LIFT.x + 2.4, liftY0 + 0.6, LIFT.z + 1.2, 0, { cast: false });
  {
    const LB = new Batch(group);
    const tx = LIFT.x, tz = LIFT.top.z + 1.0;
    for (const [dx, dz] of [[-1.4, -1.0], [1.4, -1.0], [-1.4, 1.0], [1.4, 1.0]]) member(LB, [tx + dx, L3, tz + dz], [tx + dx * 0.6, L3 + 4.2, tz + dz * 0.6], 0.16, darkWood);
    member(LB, [tx - 1.0, L3 + 4.0, tz], [tx + 1.0, L3 + 4.0, tz], 0.2, darkWood);
    LB.add(new THREE.TorusGeometry(0.5, 0.08, 6, 18), iron, tx, L3 + 3.7, tz + 0.2);
    // the winch at the bottom: a drum on a frame
    LB.add(cyl(0.45, 0.45, 1.4, 14, 0), wood, LIFT.x + 2.4, liftY0 + 0.7, LIFT.z + 1.2, 0, 0, Math.PI / 2);
    for (const s of [-1, 1]) LB.add(bbox(0.14, 1.2, 1.0, 0.02, 1), darkWood, LIFT.x + 2.4 + s * 0.8, liftY0 + 0.6, LIFT.z + 1.2);
    LB.build();
    col({ type: 'box', x: LIFT.x + 2.4, z: LIFT.z + 1.2, hw: 0.9, hd: 0.6, top: liftY0 + 1.2, noStand: true });
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

  // ---- the monastery: a stone hall with a gate, prayer wheels, a courtyard wall
  {
    const mx = MONAST.x, mz = MONAST.z, gy = H(mx, mz);
    const MB = new Batch(group);
    MB.add(bbox(14, 6, 9, 0.2, 2), stone('#c8b8a0'), mx, gy + 3, mz - 6);
    MB.add(bbox(15, 0.6, 10, 0.1, 2), tm('wood', { color: '#8a3a2a' }), mx, gy + 6.3, mz - 6);
    MB.add(new THREE.ConeGeometry(3.4, 3.2, 4).rotateY(Math.PI / 4), tm('roof', { color: '#c8a050' }), mx, gy + 8.2, mz - 6);
    for (const s of [-1, 1]) { MB.add(bbox(0.8, 5, 0.8, 0.1, 1), stone('#b8a890'), mx + s * 2.5, gy + 2.5, mz - 1.5); }
    MB.add(bbox(5.8, 0.9, 0.9, 0.08, 1), tm('wood', { color: '#8a3a2a' }), mx, gy + 5.2, mz - 1.5);
    for (let i = 0; i < 6; i++) MB.add(cyl(0.22, 0.22, 0.7, 12, 0), tm('brass', { rough: 0.35, metal: 0.7 }), mx - 5 + i * 0.6, gy + 1.0, mz - 1.4);
    for (const [ax, az, bx, bz] of [[mx - 9, mz - 1, mx - 9, mz + 10], [mx + 9, mz - 1, mx + 9, mz + 10], [mx - 9, mz + 10, mx - 2, mz + 10], [mx + 2, mz + 10, mx + 9, mz + 10]]) {
      const L = Math.hypot(bx - ax, bz - az);
      MB.add(bbox(0.7, 2.2, L, 0.08, 1.6), stone('#b8a890'), (ax + bx) / 2, gy + 1.1, (az + bz) / 2, 0, Math.atan2(bx - ax, bz - az), 0);
      col({ type: 'box', x: (ax + bx) / 2, z: (az + bz) / 2, hw: 0.35, hd: L / 2, rot: Math.atan2(bx - ax, bz - az), top: gy + 2.2 });
    }
    MB.build();
    col({ type: 'box', x: mx, z: mz - 6, hw: 7, hd: 4.5, top: gy + 9 });
    smokes.push({ x: mx + 4, y: gy + 7, z: mz - 8 });
  }
  R.monastery = { gate: W(MONAST.x, MONAST.z + 11), yard: W(MONAST.x, MONAST.z + 4) };

  // ---- the observatory on the peak: a drum with a copper dome and a slit
  {
    const gy = H(OBS.x, OBS.z);
    const OB = new Batch(group);
    OB.add(cyl(5, 5.4, 5.5, 24, 2), stone('#d8d0c4'), OBS.x, gy + 2.75, OBS.z);
    OB.add(lathe([[5.2, 0], [5.0, 1.2], [4.2, 2.6], [2.6, 3.8], [0.01, 4.4]], 24, 0), tm('brass', { color: '#5ab0a0', rough: 0.4, metal: 0.6 }), OBS.x, gy + 5.5, OBS.z);
    OB.add(bbox(1.2, 3.6, 0.5, 0.05, 1), pm('#2a2a3a', 0.5), OBS.x, gy + 7.4, OBS.z + 3.4, -0.6, 0, 0);
    OB.add(bbox(1.8, 2.6, 0.4, 0.05, 1), darkWood, OBS.x, gy + 1.3, OBS.z + 5.2);
    OB.build();
    col({ type: 'cyl', x: OBS.x, z: OBS.z, r: 5.3, top: gy + 9 });
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
  R.vent = { ...W(VENT.x, VENT.z), open: false, setOpen(b) { this.open = !!b; ventCap.visible = !b; steam.material.opacity = b ? 0.3 : 0; } };
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
    instances(group, pine, pm2, list);
    for (const t of list) col({ type: 'cyl', x: t.x, z: t.z, r: 0.4 * t.s, top: t.y + 6, seeThrough: true });
    const rocks = [];
    for (let i = 0; i < 120; i++) {
      const x = (r0() - 0.5) * 190, z = (r0() - 0.5) * 190;
      if (Math.abs(x) > 90 || Math.abs(z - 5) > 92 || Math.hypot(x - LHAR.x, z - LHAR.z) < LHAR.r - 4 || seg(TRAIL, x, z) < 3 || seg(LEDGE, x, z) < 2.5 || seg(RIDGE, x, z) < 3) continue;
      rocks.push({ x, y: H(x, z) - 0.1, z, ry: r0() * 6, s: 0.3 + r0() * 0.9, color: '#c8c8d0' });
    }
    const rm = pm('#ffffff', 0.95, { vertexColors: true });
    for (let v = 0; v < 3; v++) instances(group, rockGeometry(v + 1), rm, rocks.filter((_, i) => i % 3 === v));
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
