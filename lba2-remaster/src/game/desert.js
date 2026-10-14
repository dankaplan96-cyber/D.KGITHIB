// Desert Island (chapters 4–5). An outdoor region like Zeelich (a room flagged `outdoor`, its own sky), but
// with real ground: a heightfield patch registered on the shared terrain (Terrain.addPatch), so walking,
// sliding, the ball and the camera work as on Citadel. Beyond the shore the patch drops below the sea floor
// limit, which actors may not enter.
//
// CONTRACT used by src/game/story/dig.js (chapter 4) and steam.js (chapter 5). World coordinates.
//   R.dock {x,z,a}            arrival from the ferry; R.ferry {setVisible(b)}
//   R.npcSpots {hesk, tarra, ilka, dallan, guard, kid, trader, weaver} {x,z,a}
//   R.oasis {x,z,r, level, setLevel(0..1)}          the pond: dry (0) → full (1); palms green up with it
//   R.pump {x,z, gears:[{x,y,z,turning,setTurning(b)}], setRunning(b), running}   wind-pump; gears are ball targets
//   R.yacht {x,z,a, ride(pathKey, done)}            Hesk's sand-yacht; paths: 'toCamp', 'toDig', 'toVillage'
//   R.camp {x,z}                                     Ilka's camp under the north mesa
//   R.post {x0,z0,x1,z1, gate:{x,z,open(),isOpen}, office:{x,z}, desk:{x,z}, patrol:[[x,z]...], cover:[{x,z,r}]}
//   R.storm {level, setLevel(0..1)}                 sandstorm: fog closes in, dust blows; drones see less
//   R.dig {x,z, gate:{x,z,open(),isOpen}, seals:[{x,y,z,on,setOn(b)}], carvings:{x,z}, door:{x,z}, bottomY, reveal()}
//        the bottom of the excavation is the Temple of Bù's gate; reveal() slides its stone door away
//   R.ruins {x,z, door:{x,z}}                        FunFrock's buried condenser hall (chapter 5)
//   R.bore {x,z}                                     the project's test bore inside the post (chapter 5)
//   R.kesh                                           Kesh twelve years on (keshlife.js): the cool room, Lumi's loom, poles
// Heights: island ground BASE = 5.0; the dig steps down 1.6 m per terrace to bottomY = 0.4.
import * as THREE from 'three';
import { Terrain } from '../engine/terrain.js';
import { textures } from '../engine/textures.js';
import { rng, smoothstep, distToSegment } from '../engine/math.js';
import { rockGeometry } from './vegetation.js';
import { shuttleTraffic } from './shuttle.js';
import { buildKesh, keshFlat, keshBank, keshDrift, keshClear, DRIFT_H, YACHT_ROUTES } from './keshlife.js';
import {
  tm, pm, ctex, cached, bbox, cyl, lathe, tube, Batch, member, rod, mesh, instances, lodInstances, emblemMaterial, emq,
} from './kit.js';

export const DESERT = { x: 3400, z: 0 };
const SIZE = 250, SEGS = 250;
const BASE = 5.0;
const SEA_Y = -0.2;

// ================================================================== layout (local coordinates)
const DOCK = { x: -106, z: 4, deck: 2.0 };
const VILLAGE = { x: -50, z: 2, r: 19 };
const OASIS = { x: -40, z: -15, r: 7.5 };
const PUMP = { x: -30, z: -7 };
const POST = { x0: 26, x1: 58, z0: -34, z1: -8, y: BASE + 0.35, gateZ: -21 };
const DIG = { x: 64, z: 28, r: 16 };
const CAMP = { x: -10, z: -46 };
const RUINS = { x: 12, z: 50 };
const MESAS = [
  { x: -6, z: -70, rx: 24, rz: 13, h: 15 },
  { x: 38, z: 72, rx: 17, rz: 11, h: 13 },
  { x: 86, z: -26, rx: 9, rz: 15, h: 12 },
  { x: -70, z: 52, rx: 13, rz: 9, h: 11 },
  { x: 92, z: 46, rx: 7, rz: 7, h: 9 },
];
const TRACKS = [
  [[-86, 4], [-70, 4], [-58, 3], [-40, 5], [-22, 7], [0, 9], [22, 6], [26, -21]],
  [[0, 9], [18, 18], [42, 24], [50, 27]],
  [[-22, 7], [-18, -20], [-12, -38]],
  [[0, 9], [6, 30], [10, 44]],
];
const HOUSES = [
  { x: -60, z: -8, w: 6.4, d: 5.2, h: 3.4, ry: 0.15, stair: 1, tint: '#e9b98a', awning: '#c84a3a' },
  { x: -64, z: 10, w: 5.4, d: 5.0, h: 3.0, ry: Math.PI / 2 + 0.1, tint: '#f0c898' },
  { x: -50, z: 16, w: 7.2, d: 5.4, h: 3.8, ry: Math.PI, stair: -1, tint: '#e2a878', awning: '#2f7a9a', tarra: true },
  { x: -36, z: 15, w: 5.0, d: 4.6, h: 3.0, ry: Math.PI - 0.2, tint: '#f2d2a8' },
  { x: -54, z: -18, w: 5.6, d: 4.8, h: 3.2, ry: 0.5, tint: '#e6b07e', awning: '#e8b84a' },
];

const rr = rng(4141);
const angDiff = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
const islandR = (a) => 90 + 7 * Math.sin(3 * a + 0.6) + 5 * Math.sin(5 * a + 2.1) + 2.5 * Math.sin(9 * a + 0.4) + 10 * Math.exp(-(angDiff(a, Math.PI - 0.05) ** 2) / 0.012);
function trackDist(x, z) {
  let d = 1e9;
  for (const p of TRACKS) for (let i = 0; i < p.length - 1; i++) d = Math.min(d, distToSegment(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]));
  return d;
}
const inPost = (x, z, pad = 0) => x > POST.x0 - pad && x < POST.x1 + pad && z > POST.z0 - pad && z < POST.z1 + pad;
const mesaQ = (m, x, z) => Math.pow(Math.pow(Math.abs(x - m.x) / m.rx, 4) + Math.pow(Math.abs(z - m.z) / m.rz, 4), 0.25) + Math.sin(Math.atan2(z - m.z, x - m.x) * 7 + m.x) * 0.03;

// --- dig terraces: rings 16→12→8→4 m, each 1.6 m lower; one ramp per ring boundary at its own angle
const DIG_RAMPS = [0.35, 2.55, 4.6];
function digHeight(x, z) {
  const dx = x - DIG.x, dz = z - DIG.z, r = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
  if (r > DIG.r + 2) return null;
  const level = (k) => BASE - 1.6 * k;
  let h = BASE;
  for (let k = 0; k < 3; k++) {
    const rk = DIG.r - 4 * k;          // the wall of terrace k → k+1
    const da = Math.abs(((a - DIG_RAMPS[k] + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    const ramp = da < 0.32;
    const w = ramp ? 3.6 : 1.3;        // a long ramp, or a steep shored wall
    const t = smoothstep(rk + w / 2, rk - w / 2, r);
    h = h + (level(k + 1) - level(k)) * (ramp ? Math.min(1, Math.max(0, (rk + w / 2 - r) / w)) : t);
  }
  return h;
}

function heightFn(x, z) {
  const a = Math.atan2(z, x), s = Math.hypot(x, z) / islandR(a);
  // dunes: long crests across the wind (from the west) with a cross ripple
  const crest = Math.max(0, Math.sin(x * 0.085 + z * 0.045 + Math.sin(z * 0.035) * 1.2));
  let dunes = crest * crest * 2.0 + Math.sin(x * 0.19 + z * 0.12) * 0.35 + Math.sin(x * 0.05 - z * 0.08) * 0.6;
  // flat where people live and drive
  let flat = 0;
  flat = Math.max(flat, smoothstep(VILLAGE.r + 8, VILLAGE.r, Math.hypot(x - VILLAGE.x, z - VILLAGE.z)));
  flat = Math.max(flat, smoothstep(5, 2, trackDist(x, z)));
  flat = Math.max(flat, inPost(x, z, 6) ? 1 - smoothstep(0, 6, Math.max(POST.x0 - x, x - POST.x1, POST.z0 - z, z - POST.z1, 0)) : 0);
  flat = Math.max(flat, smoothstep(DIG.r + 8, DIG.r + 2, Math.hypot(x - DIG.x, z - DIG.z)));
  flat = Math.max(flat, smoothstep(12, 6, Math.hypot(x - CAMP.x, z - CAMP.z)));
  flat = Math.max(flat, smoothstep(10, 5, Math.hypot(x - RUINS.x, z - RUINS.z)));
  flat = Math.max(flat, keshFlat(x, z));
  let h = BASE + dunes * (1 - flat);
  // Kesh's sand (keshlife.js): the dune against the cool room, sand banked on the screens, a drift over the yacht's track
  h += keshBank(x, z) + DRIFT_H * keshDrift(x, z);
  // the post sits on a levelled concrete pad
  if (inPost(x, z)) h = POST.y;
  // the oasis basin
  const od = Math.hypot(x - OASIS.x, z - OASIS.z);
  if (od < OASIS.r + 5) h -= 1.5 * smoothstep(OASIS.r + 5, OASIS.r - 2, od);
  // mesas: flat tops, sheer sides
  for (const m of MESAS) {
    const q = mesaQ(m, x, z);
    if (q < 1.15) {
      const t = smoothstep(1.1, 0.95, q);
      const top = BASE + m.h + Math.sin(x * 0.3) * Math.sin(z * 0.27) * 0.4;
      h = h + (top - h) * t;
    }
  }
  const dg = digHeight(x, z);
  if (dg != null) h = Math.min(h, dg);
  // the shore: a short beach, then the sea floor
  const land = smoothstep(1.03, 0.88, s);
  // near the pier the beach slopes gently down to the deck
  const dd = Math.hypot(x - (DOCK.x + 8), (z - DOCK.z) * 0.8);
  if (dd < 22) h = h + (DOCK.deck + 0.2 + (h - DOCK.deck - 0.2) * smoothstep(4, 22, dd) - h) * (1 - smoothstep(16, 22, dd));
  const out = -3.2 + (h + 3.2) * land;
  // the pier's landward end steps onto sand at the deck's height: after the shore blend, which would otherwise
  // pull the ground there down to the sea floor (below the water line: a gap nobody can walk across)
  const ex = x - (DOCK.x + 17), w = (1 - smoothstep(3, 10, Math.abs(z - DOCK.z))) * smoothstep(-2.5, -1.0, ex) * (1 - smoothstep(4, 8, ex));
  const floor = DOCK.deck - 0.1;
  return out < floor ? out + (floor - out) * w : out;
}

const C = (h) => new THREE.Color(h);
const COL = { sand: C('#fff2dc'), sandDark: C('#ead0a8'), rock: C('#e0a080'), rockTop: C('#ecc0a0'), dirt: C('#d8b090'), pad: C('#d8d0c4'), grass: C('#c8d890'), wet: C('#a88a60'), sandCrest: C('#fff8ec'), sandLee: C('#e2b888'), sandRed: C('#e8b48c') };
function colorFn(x, z, h, slope, c) {
  c.copy(COL.sand);
  const n = Math.sin(x * 0.7 + z * 0.4) * Math.sin(z * 0.6 - x * 0.2);
  c.lerp(COL.sandDark, 0.25 + n * 0.15 + smoothstep(BASE + 1.5, BASE - 1, h) * 0.2);
  // wind-sorted sand: pale crests, a warmer lee side behind each crest, and broad patches of
  // redder sand so the open ground reads at a distance (same crest phase as heightFn)
  const ph = x * 0.085 + z * 0.045 + Math.sin(z * 0.035) * 1.2;
  const crest = Math.max(0, Math.sin(ph)), lee = Math.max(0, -Math.cos(ph)) * smoothstep(0, 0.4, Math.sin(ph + 0.6));
  c.lerp(COL.sandCrest, crest * crest * 0.35);
  c.lerp(COL.sandLee, lee * 0.22);
  const big = Math.sin(x * 0.021 + 1.3) * Math.sin(z * 0.017 - 0.4) + Math.sin((x + z) * 0.011) * 0.5;
  c.lerp(COL.sandRed, smoothstep(0.35, 1.1, big) * 0.3);
  if (slope > 0.8) c.lerp(COL.rock, smoothstep(0.8, 1.6, slope));
  if (h > BASE + 6) c.lerp(COL.rockTop, 0.6);
  if (inPost(x, z)) c.copy(COL.pad);
  if (h < 1.2) c.lerp(COL.wet, smoothstep(1.2, -0.5, h));
}
function splatFn(x, z, h, slope, w) {
  w[0] = 0; w[1] = 1; w[2] = 0; w[3] = 0; w[4] = 0;
  const rk = smoothstep(0.75, 1.3, slope) + (h > BASE + 6 ? 0.45 : 0);
  w[2] = rk; w[1] = Math.max(0, 1 - rk);
  const td = trackDist(x, z);
  if (td < 2.4) { const dr = 1 - keshDrift(x, z); w[3] = smoothstep(2.4, 1.2, td) * 1.6 * dr; w[1] *= 0.5 + 0.5 * (1 - dr); }   // (the drift covers the track)
  if (Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < VILLAGE.r - 4) { w[3] += 0.8; }
  const od = Math.hypot(x - OASIS.x, z - OASIS.z);
  if (od > OASIS.r - 1 && od < OASIS.r + 4) w[0] = 0.7 * smoothstep(OASIS.r + 4, OASIS.r + 1, od);
  if (inPost(x, z)) { w[4] = 2; w[1] = 0; w[3] = 0; }
}

// ================================================================== painted textures (desert only)
const carvingTex = () => ctex('carving', 512, 256, (x, W, H) => {
  // an old relief of the planet in its shell: two suns above, the shell's ring, seams and five vents
  x.fillStyle = '#b8835c'; x.fillRect(0, 0, W, H);
  const r = rng(77);
  for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${90 + r() * 60},${50 + r() * 40},${30 + r() * 20},${0.15 + r() * 0.2})`; x.fillRect(r() * W, r() * H, 2 + r() * 3, 2 + r() * 3); }
  const line = (w, a) => { x.lineWidth = w; x.strokeStyle = `rgba(60,30,18,${a})`; };
  line(6, 0.75); x.beginPath(); x.arc(W / 2, H * 0.62, 78, 0, Math.PI * 2); x.stroke();
  line(3, 0.6); x.beginPath(); x.arc(W / 2, H * 0.62, 96, 0, Math.PI * 2); x.stroke();
  for (const [sx, sy] of [[W * 0.3, 30], [W * 0.7, 30]]) { line(4, 0.7); x.beginPath(); x.arc(sx, sy, 16, 0, Math.PI * 2); x.stroke(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; x.beginPath(); x.moveTo(sx + Math.cos(a) * 20, sy + Math.sin(a) * 20); x.lineTo(sx + Math.cos(a) * 28, sy + Math.sin(a) * 28); x.stroke(); } }
  // seams in the shell and the vents breathing out
  line(2.5, 0.55);
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k - 2) * 0.62, cx = W / 2 + Math.cos(a) * 96, cy = H * 0.62 + Math.sin(a) * 96;
    x.beginPath(); x.moveTo(W / 2 + Math.cos(a) * 78, H * 0.62 + Math.sin(a) * 78); x.lineTo(cx, cy); x.stroke();
    for (let j = 0; j < 3; j++) { x.beginPath(); x.arc(cx + Math.cos(a) * (10 + j * 9), cy + Math.sin(a) * (10 + j * 9), 4 + j * 3, a - 1, a + 1); x.stroke(); }
  }
  // the sleeper inside, curled
  line(4, 0.65); x.beginPath(); x.arc(W / 2, H * 0.64, 36, 0.4, Math.PI * 1.8); x.stroke();
  x.beginPath(); x.arc(W / 2 + 10, H * 0.6, 12, 0, Math.PI * 2); x.stroke();
  for (let i = 0; i < 26; i++) { x.fillStyle = 'rgba(255,230,190,0.18)'; x.fillRect(20 + r() * (W - 40), 10 + r() * (H - 20), 3, 1); }
});
const awningTex = (a, b) => ctex('aw' + a + b, 64, 64, (x, S) => { for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect(i * S / 4, 0, S / 4, S); } });
const signTex = (text, bg = '#2f6a7a') => ctex('sign' + text, 256, 96, (x, W, H) => {
  x.fillStyle = bg; x.fillRect(0, 0, W, H); x.strokeStyle = '#f2e6c8'; x.lineWidth = 6; x.strokeRect(6, 6, W - 12, H - 12);
  x.fillStyle = '#f2e6c8'; x.font = 'bold 38px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, H / 2 + 2);
}, false);

// ================================================================== build
export function buildDesert(scene, physics) {
  const ox = DESERT.x, oz = DESERT.z;
  const group = new THREE.Group();
  group.name = 'desert';
  group.visible = false;
  group.position.set(ox, 0, oz);
  scene.add(group);
  const W = (x, z) => ({ x: ox + x, z: oz + z });
  const col = (c) => physics.add({ ...c, x: c.x + ox, z: c.z + oz });
  const updaters = [];
  const TX = textures();

  // --- ground
  const terrain = new Terrain({ size: SIZE, segs: SEGS, heightFn, colorFn, splatFn, textures: { ...TX, rock: TX.cliff, cobble: TX.concrete } });
  group.add(terrain.mesh);
  physics.terrain.addPatch(terrain, ox, oz);
  const H = (x, z) => terrain.heightAt(x, z);

  const R = {
    id: 'desert', outdoor: true, group, lights: [], exits: [], searches: [], ballTargets: [], updaters,
    music: 'desert',
    env: { fog: '#f0d2a2', sun: '#fff0d4', hemiSky: '#ffe6bc', hemiGround: '#b4845a', sunI: 2.9, hemiI: 1.25, fogRange: [80, 280] },
    terrain, H: (x, z) => H(x - ox, z - oz),
  };
  R.env.fogColor = new THREE.Color(R.env.fog);

  // --- the sea around it
  {
    const t = TX.sea.clone(); t.needsUpdate = true; t.repeat.set(70, 70); t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1000), new THREE.MeshStandardMaterial({ map: t, color: '#7ac4e0', roughness: 0.25, metalness: 0.05 }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = SEA_Y; sea.receiveShadow = true; group.add(sea);
    updaters.push((dt, time) => { t.offset.set(time * 0.006, time * 0.004); });
  }

  const B = new Batch(group);
  const adobe = (tint) => tm('plasterWall', { color: tint, rough: 0.95 });
  const wood = tm('wood', { color: '#9a6a40' });
  const darkWood = tm('wood', { color: '#6a4528' });
  const plank = tm('planks', { color: '#d8b080' });
  const rope = pm('#c8b08a', 0.9);
  const iron = pm('#4a4440', 0.55, { metalness: 0.5 });
  const rust = pm('#8a5038', 0.8, { metalness: 0.3 });
  const teal = tm('teal', { rough: 0.55, metal: 0.3 });
  const concrete = tm('concrete', { color: '#d8d0c0' });
  const canvas = (c) => pm(c, 0.9, { side: THREE.DoubleSide });
  const dark = pm('#2a1c14', 0.95);

  // ================================================================ dock and pier
  {
    const y = DOCK.deck, x0 = DOCK.x - 12, x1 = DOCK.x + 17, z = DOCK.z;
    for (let x = x0; x < x1; x += 1.1) B.add(bbox(1.05, 0.12, 3.6, 0.02, 1), plank, x + 0.55, y - 0.06, z, 0, 0, 0);
    for (let x = x0 + 0.5; x < x1; x += 3.2) for (const s of [-1, 1]) B.add(cyl(0.16, 0.18, 4.5, 8, 1), darkWood, x, y - 2.2, z + s * 1.7);
    for (const s of [-1, 1]) for (let x = x0 + 0.5; x < x1 - 1; x += 3.2) rod(B, [x, y, z + s * 1.75], [x, y + 0.9, z + s * 1.75], 0.05, darkWood);
    for (const s of [-1, 1]) B.add(tube([[x0 + 0.5, y + 0.85, z + s * 1.75], [(x0 + x1) / 2, y + 0.75, z + s * 1.75], [x1 - 2, y + 0.85, z + s * 1.75]], 0.03, 6, 1), rope, 0, 0, 0);
    col({ type: 'box', x: (x0 + x1) / 2, z, hw: (x1 - x0) / 2, hd: 1.8, top: y, seeThrough: true });
    for (const s of [-1, 1]) col({ type: 'box', x: (x0 + x1) / 2, z: z + s * 1.85, hw: (x1 - x0) / 2, hd: 0.08, top: y + 1, noStand: true, seeThrough: true });
    // a sign
    const sg = new THREE.Mesh(emq(), new THREE.MeshStandardMaterial({ map: signTex('KESH'), roughness: 0.8 }));
    sg.scale.set(1.6, 0.6, 1); sg.position.set(x1 + 2, H(x1 + 2, z + 3.2) + 2.1, z + 3.2); sg.rotation.y = -Math.PI / 2; group.add(sg);
    rod(B, [x1 + 2.05, H(x1 + 2, z + 3.2), z + 2.6], [x1 + 2.05, H(x1 + 2, z + 3.2) + 2.4, z + 2.6], 0.05, darkWood);
    rod(B, [x1 + 2.05, H(x1 + 2, z + 3.2), z + 3.8], [x1 + 2.05, H(x1 + 2, z + 3.2) + 2.4, z + 3.8], 0.05, darkWood);
  }
  R.dock = { ...W(DOCK.x - 2, DOCK.z), a: Math.PI / 2 };
  // a coil of rope on the pier (chapter 4: for Hesk's sand-yacht)
  {
    const coil = new THREE.Group(); coil.position.set(DOCK.x + 6, DOCK.deck, DOCK.z - 1.2); group.add(coil);
    for (let k = 0; k < 4; k++) mesh(coil, new THREE.TorusGeometry(0.32 - k * 0.02, 0.05, 6, 18).rotateX(Math.PI / 2), rope, 0, 0.05 + k * 0.08, 0);
    R.rope = { ...W(DOCK.x + 6, DOCK.z - 1.2), setVisible(b) { coil.visible = !!b; } };
  }
  // the project ferry tied up at the pier (a simple hull; the full ferry model lives on Citadel)
  const ferry = new THREE.Group(); ferry.position.set(DOCK.x - 6, SEA_Y, DOCK.z - 4.2); group.add(ferry);
  {
    const FB = new Batch(ferry);
    FB.add(lathe([[0.01, 0], [1.4, 0.15], [1.7, 0.9], [1.75, 1.6]], 20, 1), pm('#e8eef2', 0.4), 0, 0, 0, 0, 0, 0, 3.6, 1, 1);
    FB.add(bbox(6.2, 1.3, 2.2, 0.15, 1), teal, 0, 2.2, 0);
    FB.add(bbox(5.8, 0.12, 2.6, 0.04, 1), pm('#2a3a44', 0.5), 0, 2.9, 0);
    FB.add(cyl(0.9, 0.9, 0.3, 24, 0), pm('#9ff4ff', 0.3, { emissive: '#35d8ff', emissiveIntensity: 1.5 }), 0, 0.05, 0);
    FB.build();
  }
  R.ferry = { setVisible(b) { ferry.visible = !!b; } };

  // ================================================================ the village of Kesh
  const houseDoors = [];
  for (const [i, hd] of HOUSES.entries()) {
    const g = new THREE.Group(); const gy = H(hd.x, hd.z) - 0.3;
    g.position.set(hd.x, gy, hd.z); g.rotation.y = hd.ry; group.add(g);
    const HB = new Batch(g);
    const wall = adobe(hd.tint);
    HB.add(bbox(hd.w, hd.h + 0.3, hd.d, 0.22, 2.2), wall, 0, (hd.h + 0.3) / 2, 0);
    // parapet with soft rounded corners, and the roof slab inside it
    for (const [px, pz, pw, pd] of [[0, hd.d / 2 - 0.12, hd.w, 0.24], [0, -hd.d / 2 + 0.12, hd.w, 0.24], [hd.w / 2 - 0.12, 0, 0.24, hd.d], [-hd.w / 2 + 0.12, 0, 0.24, hd.d]]) HB.add(bbox(pw, 0.55, pd, 0.1, 2.2), wall, px, hd.h + 0.55, pz);
    HB.add(bbox(hd.w - 0.4, 0.1, hd.d - 0.4, 0.02, 2), tm('plaster', { color: '#d8a878' }), 0, hd.h + 0.32, 0);
    // vigas: roof beams poking through the front and back walls
    for (let k = -hd.w / 2 + 0.6; k < hd.w / 2 - 0.3; k += 0.8) for (const s of [-1, 1]) HB.add(cyl(0.09, 0.1, 0.5, 7, 0), darkWood, k, hd.h - 0.1, s * (hd.d / 2 + 0.2), Math.PI / 2, 0, 0);
    // door: recessed, framed in wood, a plank leaf ajar
    HB.add(bbox(1.25, 2.15, 0.3, 0.04, 1), dark, 0.6, 1.08, hd.d / 2 - 0.05);
    HB.add(bbox(1.45, 0.16, 0.38, 0.03, 1), wood, 0.6, 2.2, hd.d / 2 + 0.02);
    for (const s of [-1, 1]) HB.add(bbox(0.14, 2.2, 0.36, 0.03, 1), wood, 0.6 + s * 0.68, 1.1, hd.d / 2 + 0.02);
    HB.add(bbox(0.95, 1.95, 0.08, 0.02, 0.6), plank, 0.45, 1.0, hd.d / 2 + 0.28, 0, -0.55, 0);
    // windows: small, deep, with wooden shutters
    for (const wx of [-hd.w / 2 + 1.1, -hd.w / 2 + 2.4]) {
      if (wx > 0.1) continue;
      HB.add(bbox(0.7, 0.8, 0.3, 0.03, 1), dark, wx, 2.0, hd.d / 2 - 0.05);
      HB.add(bbox(0.86, 0.1, 0.34, 0.02, 1), wood, wx, 1.55, hd.d / 2 + 0.03);
      HB.add(bbox(0.38, 0.8, 0.05, 0.01, 0.6), pm(hd.awning || '#3a7a9a', 0.7), wx - 0.6, 2.0, hd.d / 2 + 0.12, 0, 0.5, 0);
    }
    // outside stair to the roof (steps you can climb)
    if (hd.stair) {
      const s = hd.stair, n = 6, sx = s * (hd.w / 2 + 0.55);
      for (let k = 0; k < n; k++) {
        const y = (k + 1) * (hd.h + 0.3) / n, zz = hd.d / 2 - 0.5 - k * (hd.d - 1.0) / n;
        HB.add(bbox(1.0, y, (hd.d - 1.0) / n + 0.02, 0.05, 2.2), wall, sx, y / 2, zz);
      }
    }
    // rooftop: jars, a ladder top, a clothesline
    for (let k = 0; k < 3; k++) HB.add(lathe([[0.01, 0], [0.22, 0.04], [0.3, 0.3], [0.18, 0.55], [0.15, 0.62], [0.17, 0.66]], 12, 0), pm(['#c86a3a', '#d8a050', '#a85030'][k], 0.85), -hd.w / 2 + 0.7 + k * 0.6, hd.h + 0.37, -hd.d / 2 + 0.7);
    // an awning over the door on striped cloth
    if (hd.awning) {
      const aw = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), new THREE.MeshStandardMaterial({ map: awningTex(hd.awning, '#f4e8d0'), side: THREE.DoubleSide, roughness: 0.9 }));
      aw.position.set(0.6, 2.75, hd.d / 2 + 0.65); aw.rotation.x = -Math.PI / 2 + 0.35; aw.castShadow = true; g.add(aw);
      for (const s of [-1, 1]) rod(HB, [0.6 + s * 1.15, 0, hd.d / 2 + 1.3], [0.6 + s * 1.15, 2.55, hd.d / 2 + 1.3], 0.04, wood);
    }
    HB.build();
    // colliders (body, stair)
    const cs = Math.cos(hd.ry), sn = Math.sin(hd.ry);
    const wpos = (lx, lz) => ({ x: hd.x + cs * lx + sn * lz, z: hd.z - sn * lx + cs * lz });
    col({ type: 'box', ...wpos(0, 0), hw: hd.w / 2, hd: hd.d / 2, rot: hd.ry, top: gy + hd.h + 0.8 });
    if (hd.stair) {
      const s = hd.stair, n = 6;
      for (let k = 0; k < n; k++) {
        const y = (k + 1) * (hd.h + 0.3) / n, zz = hd.d / 2 - 0.5 - k * (hd.d - 1.0) / n;
        col({ type: 'box', ...wpos(s * (hd.w / 2 + 0.55), zz), hw: 0.5, hd: (hd.d - 1.0) / n / 2 + 0.01, rot: hd.ry, top: gy + y });
      }
      col({ type: 'box', ...wpos(0, 0), hw: hd.w / 2 - 0.25, hd: hd.d / 2 - 0.25, rot: hd.ry, top: gy + hd.h + 0.37 });
    }
    houseDoors.push({ ...wpos(0.6, hd.d / 2 + 0.9), house: i, tarra: !!hd.tarra });
  }
  R.houseDoors = houseDoors.map((d) => ({ ...W(d.x, d.z), house: d.house, tarra: d.tarra }));

  // market stall on the plaza
  {
    const sx = VILLAGE.x + 2, sz = VILLAGE.z - 4, gy = H(sx, sz);
    const SB = new Batch(group);
    SB.add(bbox(2.8, 0.9, 1.0, 0.04, 1), wood, sx, gy + 0.45, sz);
    for (const [dx, dz] of [[-1.3, -0.45], [1.3, -0.45], [-1.3, 0.45], [1.3, 0.45]]) SB.add(cyl(0.05, 0.05, 2.4, 6, 0), darkWood, sx + dx, gy + 1.2, sz + dz);
    for (let k = 0; k < 7; k++) SB.add(lathe([[0.01, 0], [0.12, 0.02], [0.16, 0.18], [0.08, 0.3], [0.09, 0.34]], 10, 0), pm(['#c86a3a', '#3a7a9a', '#d8a050'][k % 3], 0.7), sx - 1.1 + k * 0.36, gy + 0.9, sz - 0.15);
    SB.build();
    const aw = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshStandardMaterial({ map: awningTex('#2f7a9a', '#f4e8d0'), side: THREE.DoubleSide }));
    aw.position.set(sx, gy + 2.45, sz); aw.rotation.x = -Math.PI / 2 + 0.12; aw.castShadow = true; group.add(aw);
    col({ type: 'box', x: sx, z: sz, hw: 1.45, hd: 0.55, top: gy + 0.95, noStand: true, seeThrough: true });
  }

  // ================================================================ the oasis: pond, palms, reeds
  const oasisY = H(OASIS.x, OASIS.z);
  const pond = new THREE.Mesh(new THREE.CircleGeometry(OASIS.r + 0.8, 40), new THREE.MeshStandardMaterial({ color: '#3a9ab8', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88 }));
  pond.rotation.x = -Math.PI / 2; pond.position.set(OASIS.x, oasisY + 0.15, OASIS.z); pond.receiveShadow = true; group.add(pond);
  const mud = new THREE.Mesh(new THREE.CircleGeometry(OASIS.r + 1.5, 40), pm('#8a6a48', 1));
  mud.rotation.x = -Math.PI / 2; mud.position.set(OASIS.x, oasisY + 0.04, OASIS.z); group.add(mud);
  col({ type: 'cyl', x: OASIS.x, z: OASIS.z, r: OASIS.r + 0.2, top: oasisY + 2.2, noStand: true, seeThrough: true });
  const palms = [];
  {
    const trunkG = cached('palmTrunk', () => {
      const parts = [];
      for (let k = 0; k < 9; k++) parts.push([cyl(0.17 - k * 0.008, 0.2 - k * 0.008, 0.62, 8, 0), Math.sin(k * 0.25) * 0.25 * k * 0.12, 0.31 + k * 0.6, 0]);
      return parts;
    });
    const frond = cached('frond', () => {
      const g = new THREE.BufferGeometry(); const pos = [], idx = [];
      const n = 8;
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = t * 2.6, y = Math.sin(t * Math.PI * 0.8) * 0.6 - t * t * 1.1, w = 0.42 * Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.05));
        pos.push(x, y, -w, x, y - 0.06, 0, x, y, w);
        if (i < n) { const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
      }
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      return g;
    });
    const trunkM = pm('#b89068', 0.9);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + rr() * 0.4, d = OASIS.r + 2.2 + rr() * 2.5;
      const px = OASIS.x + Math.cos(a) * d, pz = OASIS.z + Math.sin(a) * d, s = 0.85 + rr() * 0.35;
      const g = new THREE.Group(); g.position.set(px, H(px, pz) - 0.1, pz); g.rotation.y = rr() * 6; g.scale.setScalar(s); group.add(g);
      const PB = new Batch(g);
      for (const [geo, x, y] of trunkG) PB.add(geo, trunkM, x, y, 0, 0, 0, -0.06);
      PB.build();
      const crown = new THREE.Group(); crown.position.set(0.55, 5.6, 0); g.add(crown);
      const leafMat = pm('#5a8a3a', 0.8, { side: THREE.DoubleSide });
      for (let k = 0; k < 8; k++) { const f = new THREE.Mesh(frond, leafMat); f.rotation.y = k / 8 * Math.PI * 2 + rr() * 0.3; f.rotation.z = 0.15; f.castShadow = true; crown.add(f); }
      palms.push({ g, crown, leafMat, ph: rr() * 6 });
      col({ type: 'cyl', x: px, z: pz, r: 0.3 * s, top: H(px, pz) + 6, seeThrough: true });
    }
    updaters.push((dt, t) => { for (const p of palms) p.crown.rotation.x = Math.sin(t * 0.9 + p.ph) * 0.04; });
  }
  R.oasis = {
    ...W(OASIS.x, OASIS.z), r: OASIS.r, level: 0,
    setLevel(k) {
      this.level = k;
      pond.scale.setScalar(0.25 + 0.75 * k); pond.position.y = oasisY + 0.05 + 0.25 * k; pond.visible = k > 0.02;
      mud.material.color.set(k > 0.5 ? '#6a5a3a' : '#9a7a52');
      for (const p of palms) p.leafMat.color.set(k > 0.5 ? '#4a8a34' : '#8a8a4a');
    },
  };
  R.oasis.setLevel(0.15);

  // ================================================================ the wind-pump (three seized gears)
  const pumpGy = H(PUMP.x, PUMP.z);
  const wheel = new THREE.Group();
  const gears = [];
  {
    const PB = new Batch(group);
    const h = 9.5, b = 1.6;
    const legs = [[-b, -b], [b, -b], [b, b], [-b, b]];
    for (const [lx, lz] of legs) member(PB, [PUMP.x + lx, pumpGy, PUMP.z + lz], [PUMP.x + lx * 0.25, pumpGy + h, PUMP.z + lz * 0.25], 0.12, rust);
    for (let k = 1; k < 5; k++) {
      const y = pumpGy + k * 1.9, f = 1 - (k * 1.9) / h * 0.75;
      for (let i = 0; i < 4; i++) { const [ax, az] = legs[i], [bx, bz] = legs[(i + 1) % 4]; member(PB, [PUMP.x + ax * f, y, PUMP.z + az * f], [PUMP.x + bx * f, y, PUMP.z + bz * f], 0.07, rust); }
    }
    PB.add(bbox(1.4, 0.12, 1.4, 0.02, 1), plank, PUMP.x, pumpGy + h - 0.3, PUMP.z);
    PB.add(bbox(0.7, 0.6, 1.1, 0.06, 1), iron, PUMP.x, pumpGy + h + 0.1, PUMP.z);
    // the tail vane
    PB.add(bbox(2.4, 0.08, 0.08, 0.01, 1), iron, PUMP.x + 1.4, pumpGy + h + 0.15, PUMP.z);
    PB.add(bbox(0.05, 1.0, 1.4, 0.01, 1), pm('#c84a3a', 0.7), PUMP.x + 2.6, pumpGy + h + 0.2, PUMP.z);
    // the pump rod, the tank on stilts, a pipe to the pond
    PB.add(cyl(0.05, 0.05, h - 0.4, 6, 0), iron, PUMP.x, pumpGy + (h - 0.4) / 2, PUMP.z);
    const tk = { x: PUMP.x - 4.2, z: PUMP.z - 2 };
    for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]]) PB.add(cyl(0.1, 0.1, 3.4, 6, 0), darkWood, tk.x + dx, pumpGy + 1.7, tk.z + dz);
    PB.add(cyl(1.25, 1.25, 1.8, 18, 1.5, false), tm('planks', { color: '#b88a5a' }), tk.x, pumpGy + 4.3, tk.z);
    for (const y of [3.6, 5.0]) PB.add(new THREE.TorusGeometry(1.27, 0.04, 6, 24).rotateX(Math.PI / 2), iron, tk.x, pumpGy + y, tk.z);
    PB.add(tube([[tk.x - 0.6, pumpGy + 3.5, tk.z - 0.6], [tk.x - 2.5, pumpGy + 1.0, tk.z - 3], [OASIS.x + 5, oasisY + 0.6, OASIS.z + 4]], 0.09, 6, 1), iron, 0, 0, 0);
    PB.build();
    col({ type: 'box', x: PUMP.x, z: PUMP.z, hw: b, hd: b, top: pumpGy + 9, noStand: true, seeThrough: true });
    col({ type: 'cyl', x: tk.x, z: tk.z, r: 1.3, top: pumpGy + 5.2, noStand: true, seeThrough: true });
    // the wheel: 14 sheet-metal sails on a ring
    wheel.position.set(PUMP.x - 0.6, pumpGy + h + 0.15, PUMP.z); wheel.rotation.y = Math.PI / 2; group.add(wheel);
    const WB = new Batch(wheel);
    WB.add(new THREE.TorusGeometry(1.75, 0.04, 6, 32), iron, 0, 0, 0);
    WB.add(new THREE.TorusGeometry(0.7, 0.03, 6, 20), iron, 0, 0, 0);
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; WB.add(bbox(1.25, 0.34, 0.03, 0.01, 1), pm('#d8d0c0', 0.5, { metalness: 0.4 }), Math.cos(a) * 1.25, Math.sin(a) * 1.25, 0, 0.4, 0, a); }
    WB.add(cyl(0.18, 0.18, 0.3, 10, 0), iron, 0, 0, 0, Math.PI / 2, 0, 0);
    WB.build();
    // three seized gears on the gear train down the tower (the ball knocks each one loose)
    const gearG = cached('gear', () => {
      const s = new THREE.Shape();
      for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 0.42 : 0.5; s.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      const hole = new THREE.Path(); hole.absarc(0, 0, 0.12, 0, Math.PI * 2, true); s.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false }); g.translate(0, 0, -0.06); return g;
    });
    const gearM = pm('#b88a3a', 0.4, { metalness: 0.7 });
    for (const [k, y] of [[0, 2.2], [1, 3.6], [2, 5.0]].entries()) {
      void k;
      const gx = PUMP.x + 0.3 * (y[0] - 1), gz = PUMP.z + 1.9 - y[1] * 0.12;
      const m = mesh(group, gearG, gearM, gx, pumpGy + y[1], gz, 0);
      const rustSpot = mesh(group, cached('rustdisc', () => new THREE.CircleGeometry(0.22, 12)), pm('#a85a2a', 0.9), gx, pumpGy + y[1], gz + 0.07, 0, { cast: false });
      const G = { x: ox + gx, y: pumpGy + y[1], z: oz + gz, turning: false, setTurning(b) { this.turning = !!b; rustSpot.visible = !b; } };
      updaters.push((dt) => { if (G.turning) m.rotation.z += dt * (y[0] % 2 ? -2.2 : 2.2) * (R.pump.running ? 1.6 : 1); });
      gears.push(G);
      R.ballTargets.push({ x: G.x, y: G.y, z: G.z, r: 0.75, gear: y[0] });
    }
  }
  R.pump = {
    ...W(PUMP.x, PUMP.z), gears, running: false,
    setRunning(b) { this.running = !!b; },
  };
  updaters.push((dt) => { wheel.rotation.z += dt * (R.pump.running ? 2.4 : 0.05); });

  // ================================================================ mesas: rock rubble at their feet
  {
    const rocks = [];
    for (const m of MESAS) for (let i = 0; i < 18; i++) {
      const a = rr() * Math.PI * 2, q = 1.05 + rr() * 0.25;
      const x = m.x + Math.cos(a) * m.rx * q, z = m.z + Math.sin(a) * m.rz * q;
      if (Math.hypot(x, z) > 82) continue;
      rocks.push({ x, y: H(x, z) - 0.15, z, ry: rr() * 6, s: 0.5 + rr() * 1.1 });
    }
    for (let i = 0; i < 70; i++) {
      const x = (rr() - 0.5) * 170, z = (rr() - 0.5) * 170;
      if (Math.hypot(x, z) > 80 || trackDist(x, z) < 5 || inPost(x, z, 4) || Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < VILLAGE.r + 3 || Math.hypot(x - DIG.x, z - DIG.z) < DIG.r + 3) continue;
      rocks.push({ x, y: H(x, z) - 0.1, z, ry: rr() * 6, s: 0.25 + rr() * 0.5 });
    }
    const rm = pm('#ffffff', 0.95, { vertexColors: true });
    // (Kesh's places stay clear: filtered after the draw, so the island's other rocks keep their places)
    for (let i = rocks.length - 1; i >= 0; i--) if (keshClear(rocks[i].x, rocks[i].z, rocks[i].s)) rocks.splice(i, 1);
    for (let v = 0; v < 3; v++) {
      const list = rocks.filter((_, i) => i % 3 === v).map((r) => ({ ...r, color: '#e8a888' }));
      lodInstances(group, rockGeometry(v + 1), rockGeometry(v + 1, 1), rm, list);
    }
    for (const r of rocks) if (r.s > 0.6) col({ type: 'cyl', x: r.x, z: r.z, r: r.s * 1.0, top: r.y + r.s * 0.9, seeThrough: true });
  }
  // dry shrubs and cacti
  {
    const shrubG = cached('shrub', () => new THREE.IcosahedronGeometry(0.5, 0).scale(1, 0.55, 1));
    const list = [];
    for (let i = 0; i < 220; i++) {
      const x = (rr() - 0.5) * 170, z = (rr() - 0.5) * 170;
      if (Math.hypot(x, z) > 82 || trackDist(x, z) < 2.5 || inPost(x, z, 2) || Math.hypot(x - DIG.x, z - DIG.z) < DIG.r + 1) continue;
      const h = H(x, z); if (h > BASE + 4) continue;
      const it = { x, y: h + 0.1, z, ry: rr() * 6, s: 0.5 + rr() * 0.8, color: rr() < 0.5 ? '#9a8a4a' : '#7a7a3a' };
      if (!keshClear(x, z)) list.push(it);
    }
    instances(group, shrubG, pm('#ffffff', 0.95, { flatShading: true }), list, { cast: true });
    const cactM = pm('#5a8a4a', 0.75);
    const CB = new Batch(group);
    for (let i = 0; i < 26; i++) {
      const x = (rr() - 0.5) * 160, z = (rr() - 0.5) * 160;
      if (Math.hypot(x, z) > 78 || trackDist(x, z) < 3 || inPost(x, z, 3) || Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < VILLAGE.r || Math.hypot(x - DIG.x, z - DIG.z) < DIG.r + 2) continue;
      const y = H(x, z), h = 1.6 + rr() * 1.6, keep = !keshClear(x, z);   // (the draws happen either way: the rest keep their places)
      if (keep) CB.add(cyl(0.2, 0.24, h, 8, 0), cactM, x, y + h / 2, z);
      if (keep) CB.add(new THREE.SphereGeometry(0.2, 8, 6), cactM, x, y + h, z);
      for (const s of [-1, 1]) if (rr() < 0.7) {
        const ay = y + h * (0.4 + rr() * 0.25);
        if (!keep) continue;
        CB.add(cyl(0.13, 0.13, 0.5, 7, 0), cactM, x + s * 0.4, ay, z, 0, 0, Math.PI / 2);
        CB.add(cyl(0.13, 0.13, 0.7, 7, 0), cactM, x + s * 0.62, ay + 0.35, z);
      }
      if (keep) col({ type: 'cyl', x, z, r: 0.35, top: y + h, seeThrough: true });
    }
    CB.build();
  }

  // ================================================================ Ilka's camp
  {
    const cx = CAMP.x, cz = CAMP.z, gy = H(cx, cz);
    const KB = new Batch(group);
    // a ridge tent
    const tentG = cached('tent', () => {
      const g = new THREE.BufferGeometry();
      const L = 3.2, Wd = 2.6, Ht = 2.0;
      const v = [-L / 2, 0, -Wd / 2, L / 2, 0, -Wd / 2, L / 2, Ht, 0, -L / 2, Ht, 0, -L / 2, 0, Wd / 2, L / 2, 0, Wd / 2];
      g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
      g.setIndex([0, 1, 2, 0, 2, 3, 4, 3, 2, 4, 2, 5, 0, 3, 4, 1, 5, 2]);
      g.computeVertexNormals(); return g;
    });
    KB.add(tentG, canvas('#d8c8a0'), cx, gy, cz - 1.5);
    KB.add(bbox(1.6, 0.08, 0.9, 0.02, 1), plank, cx + 2.6, gy + 0.78, cz + 0.6);
    for (const [dx, dz] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) KB.add(cyl(0.03, 0.03, 0.76, 5, 0), iron, cx + 2.6 + dx, gy + 0.38, cz + 0.6 + dz);
    // sample crates, a telescope, a lantern, papers
    for (let k = 0; k < 4; k++) KB.add(bbox(0.6, 0.45, 0.45, 0.03, 1), tm('planks', { color: '#c8a070' }), cx - 2.4 + (k % 2) * 0.65, gy + 0.23 + Math.floor(k / 2) * 0.46, cz + 1.4);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; rod(KB, [cx + 4.2, gy + 1.3, cz - 1.0], [cx + 4.2 + Math.cos(a) * 0.5, gy, cz - 1.0 + Math.sin(a) * 0.5], 0.025, iron); }
    KB.add(cyl(0.07, 0.1, 1.2, 10, 0), pm('#b88a3a', 0.35, { metalness: 0.7 }), cx + 4.2, gy + 1.5, cz - 1.0, 0, 0, -0.9);
    KB.add(bbox(0.3, 0.02, 0.4, 0.004, 0.3), pm('#f4ecd8', 0.9), cx + 2.4, gy + 0.83, cz + 0.6, 0, 0.3, 0);
    KB.build();
    col({ type: 'box', x: cx, z: cz - 1.5, hw: 1.6, hd: 1.3, top: gy + 2, noStand: true });
    col({ type: 'box', x: cx + 2.6, z: cz + 0.6, hw: 0.8, hd: 0.45, top: gy + 0.8, noStand: true, seeThrough: true });
  }
  R.camp = W(CAMP.x, CAMP.z);

  // ================================================================ the project's research post
  const postY = POST.y;
  const gateParts = [];
  const cover = [];
  {
    const PB = new Batch(group);
    // chain-link fence on concrete posts
    const fenceMat = new THREE.MeshStandardMaterial({ map: ctex('chain', 64, 64, (x, S) => { x.clearRect(0, 0, S, S); x.strokeStyle = '#9aa4aa'; x.lineWidth = 3; for (let i = -S; i < S * 2; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + S, S); x.stroke(); x.beginPath(); x.moveTo(i + S, 0); x.lineTo(i, S); x.stroke(); } }), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.4 });
    const fH = 2.6;
    const fence = (ax, az, bx, bz, gap) => {
      const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 3);
      for (let i = 0; i <= n; i++) { const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; PB.add(bbox(0.16, fH + 0.3, 0.16, 0.02, 1), concrete, x, postY + (fH + 0.3) / 2, z); }
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n, mx = ax + (bx - ax) * (t0 + t1) / 2, mz = az + (bz - az) * (t0 + t1) / 2;
        if (gap && Math.abs(mz - gap[1]) < 2.2 && Math.abs(mx - gap[0]) < 2.2) continue;
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(L / n, fH), fenceMat);
        fenceMat.map.repeat.set(L / n / 0.5, fH / 0.5);
        panel.position.set(mx, postY + fH / 2 + 0.1, mz); panel.rotation.y = -Math.atan2(bz - az, bx - ax); group.add(panel);
        col({ type: 'box', x: mx, z: mz, hw: L / n / 2, hd: 0.08, rot: -Math.atan2(bz - az, bx - ax), top: postY + fH, noStand: true, seeThrough: true });
      }
    };
    fence(POST.x0, POST.z0, POST.x1, POST.z0);
    fence(POST.x1, POST.z0, POST.x1, POST.z1);
    fence(POST.x1, POST.z1, POST.x0, POST.z1);
    fence(POST.x0, POST.z1, POST.x0, POST.z0, [POST.x0, POST.gateZ]);
    // the gate: two leaves that slide aside
    for (const s of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(2.0, fH), fenceMat);
      leaf.position.set(POST.x0, postY + fH / 2 + 0.1, POST.gateZ + s * 1.0); leaf.rotation.y = Math.PI / 2; group.add(leaf);
      gateParts.push({ leaf, s, c: col({ type: 'box', x: POST.x0, z: POST.gateZ + s * 1.0, hw: 0.08, hd: 1.0, top: postY + fH, noStand: true, seeThrough: true }) });
    }
    // cabins: teal prefab units with the project emblem
    const cabins = [{ x: 34, z: -30, w: 7, d: 3.4, office: true }, { x: 50, z: -30, w: 6, d: 3.2 }, { x: 52, z: -13, w: 5, d: 3.2, ry: Math.PI }];
    for (const cb of cabins) {
      PB.add(bbox(cb.w, 2.7, cb.d, 0.08, 2.2), teal, cb.x, postY + 1.35 + 0.15, cb.z);
      PB.add(bbox(cb.w + 0.3, 0.14, cb.d + 0.3, 0.03, 2), pm('#e8eef0', 0.5), cb.x, postY + 2.9, cb.z);
      for (let k = 0; k < 2; k++) PB.add(bbox(0.9, 0.7, 0.05, 0.01, 1), pm('#8ad0e0', 0.2, { emissive: '#2a6a7a', emissiveIntensity: 0.4 }), cb.x - cb.w / 4 + k * cb.w / 2, postY + 1.8, cb.z + (cb.ry ? -1 : 1) * (cb.d / 2 + 0.02));
      PB.add(bbox(0.9, 2.0, 0.06, 0.01, 1), pm('#2a3a44', 0.5), cb.x + cb.w / 2 - 0.9, postY + 1.15, cb.z + (cb.ry ? -1 : 1) * (cb.d / 2 + 0.03));
      const em = new THREE.Mesh(emq(), emblemMaterial()); em.scale.setScalar(0.9);
      em.position.set(cb.x, postY + 2.1, cb.z + (cb.ry ? -1 : 1) * (cb.d / 2 + 0.06)); if (cb.ry) em.rotation.y = Math.PI; group.add(em);
      col({ type: 'box', x: cb.x, z: cb.z, hw: cb.w / 2, hd: cb.d / 2, top: postY + 3 });
      cover.push({ x: ox + cb.x, z: oz + cb.z, r: Math.max(cb.w, cb.d) / 2 });
    }
    R.post = {
      x0: ox + POST.x0, z0: oz + POST.z0, x1: ox + POST.x1, z1: oz + POST.z1,
      gate: { ...W(POST.x0 - 0.8, POST.gateZ), isOpen: false, open() { this.isOpen = true; for (const p of gateParts) { p.leaf.position.z = POST.gateZ + p.s * 2.9; p.c.enabled = false; } }, close() { this.isOpen = false; for (const p of gateParts) { p.leaf.position.z = POST.gateZ + p.s * 1.0; p.c.enabled = true; } } },
      office: W(cabins[0].x + cabins[0].w / 2 - 0.9, cabins[0].z + cabins[0].d / 2 + 0.8),
      desk: W(cabins[0].x + cabins[0].w / 2 - 0.9, cabins[0].z + cabins[0].d / 2 + 0.8),
      patrol: [[30, -12], [44, -12], [56, -20], [44, -24], [30, -24]].map(([x, z]) => [ox + x, oz + z]),
      cover,
    };
    // the test bore: a derrick over a capped well-head, pipes and a pressure tank (chapter 5's problem)
    const bx = 42, bz = -18;
    const h = 11, b = 1.5;
    for (const [lx, lz] of [[-b, -b], [b, -b], [b, b], [-b, b]]) member(PB, [bx + lx, postY, bz + lz], [bx + lx * 0.2, postY + h, bz + lz * 0.2], 0.14, pm('#d8a030', 0.5, { metalness: 0.4 }));
    for (let k = 1; k < 5; k++) { const y = postY + k * 2.2, f = 1 - (k * 2.2) / h * 0.8; for (let i = 0; i < 4; i++) { const L = [[-b, -b], [b, -b], [b, b], [-b, b]]; const [ax, az] = L[i], [cx2, cz2] = L[(i + 1) % 4]; member(PB, [bx + ax * f, y, bz + az * f], [bx + cx2 * f, y, bz + cz2 * f], 0.08, pm('#d8a030', 0.5, { metalness: 0.4 })); } }
    PB.add(cyl(0.7, 0.9, 1.2, 16, 1), pm('#5a6066', 0.4, { metalness: 0.6 }), bx, postY + 0.6, bz);
    PB.add(cyl(0.35, 0.35, 0.5, 12, 0), pm('#c84a3a', 0.5, { metalness: 0.4 }), bx, postY + 1.45, bz);
    PB.add(cyl(1.0, 1.0, 3.2, 18, 1), pm('#d8dde0', 0.4, { metalness: 0.5 }), bx + 5, postY + 1.6, bz + 2, 0, 0, Math.PI / 2);
    PB.add(tube([[bx + 0.8, postY + 0.8, bz], [bx + 2.5, postY + 1.0, bz + 1], [bx + 3.4, postY + 1.6, bz + 2]], 0.12, 8, 1), iron, 0, 0, 0);
    col({ type: 'box', x: bx, z: bz, hw: b, hd: b, top: postY + h, noStand: true, seeThrough: true });
    col({ type: 'box', x: bx + 5, z: bz + 2, hw: 1.7, hd: 1.0, top: postY + 2.6, noStand: true });
    cover.push({ x: ox + bx + 5, z: oz + bz + 2, r: 1.7 });
    R.bore = { ...W(bx, bz), valve: W(bx - 1.9, bz + 0.2), y: postY };
    // the relief valve on the well-head: a big red wheel
    PB.add(new THREE.TorusGeometry(0.42, 0.06, 6, 20), pm('#c84a3a', 0.5, { metalness: 0.3 }), bx - 1.0, postY + 1.15, bz + 0.2, 0, Math.PI / 2, 0);
    PB.add(cyl(0.08, 0.08, 1.0, 8, 0), iron, bx - 0.6, postY + 1.15, bz + 0.2, 0, 0, Math.PI / 2);
    // crates, a generator, a floodlight mast
    const crateM = tm('planks', { color: '#c8a070' });
    for (const [x, z, s] of [[30, -16, 1], [31.2, -16, 0.8], [30.5, -14.8, 0.9], [54, -26, 1], [54, -24.8, 1], [36, -10, 0.8]]) {
      PB.add(bbox(s, s, s, 0.04, 1), crateM, x, postY + s / 2, z);
      col({ type: 'box', x, z, hw: s / 2, hd: s / 2, top: postY + s });
      cover.push({ x: ox + x, z: oz + z, r: s * 0.7 });
    }
    PB.add(bbox(2.0, 1.4, 1.2, 0.08, 1), pm('#c8a030', 0.5, { metalness: 0.3 }), 46, postY + 0.7, -29);
    col({ type: 'box', x: 46, z: -29, hw: 1.0, hd: 0.6, top: postY + 1.4 });
    PB.add(cyl(0.12, 0.16, 8, 8, 0), iron, 57, postY + 4, -9);
    PB.add(bbox(1.1, 0.6, 0.4, 0.05, 1), pm('#fff4d0', 0.3, { emissive: '#ffe0a0', emissiveIntensity: 1.2 }), 56.6, postY + 8, -9.4, 0.4, 0.6, 0);
    PB.build();
    // a sign on the gate
    const sg = new THREE.Mesh(emq(), new THREE.MeshStandardMaterial({ map: signTex('JOINT PROJECT · RESEARCH POST', '#2a5a6a'), roughness: 0.8, side: THREE.DoubleSide }));
    sg.scale.set(3.4, 0.9, 1); sg.position.set(POST.x0 - 0.1, postY + 3.3, POST.gateZ); sg.rotation.y = -Math.PI / 2; group.add(sg);
  }

  // ================================================================ the dig
  const seals = [];
  const digGate = [];
  {
    const DB = new Batch(group);
    // scaffold posts and a hoist on the rim, tarps, buckets, ladders down the terrace walls
    const rimY = BASE;
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + 0.2, x = DIG.x + Math.cos(a) * (DIG.r + 1.5), z = DIG.z + Math.sin(a) * (DIG.r + 1.5);
      if (Math.abs(((a - 3.6 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.35) continue; // (the gate side)
      DB.add(cyl(0.07, 0.07, 1.3, 6, 0), darkWood, x, H(x, z) + 0.65, z);
    }
    for (let i = 0; i < 10; i++) {
      const a0 = i / 10 * Math.PI * 2 + 0.2, a1 = (i + 1) / 10 * Math.PI * 2 + 0.2;
      if (Math.abs(((a0 + 0.31 - 3.6 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.4) continue;
      const p0 = [DIG.x + Math.cos(a0) * (DIG.r + 1.5), 0, DIG.z + Math.sin(a0) * (DIG.r + 1.5)], p1 = [DIG.x + Math.cos(a1) * (DIG.r + 1.5), 0, DIG.z + Math.sin(a1) * (DIG.r + 1.5)];
      p0[1] = H(p0[0], p0[2]) + 1.1; p1[1] = H(p1[0], p1[2]) + 1.1;
      DB.add(tube([p0, [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 - 0.15, (p0[2] + p1[2]) / 2], p1], 0.025, 5, 1), pm('#e8c040', 0.7), 0, 0, 0);
      // rope barrier blocks the rim except at the gate
      const mx = (p0[0] + p1[0]) / 2, mz = (p0[2] + p1[2]) / 2;
      col({ type: 'box', x: mx, z: mz, hw: Math.hypot(p1[0] - p0[0], p1[2] - p0[2]) / 2, hd: 0.1, rot: -Math.atan2(p1[2] - p0[2], p1[0] - p0[0]), top: rimY + 1.3, noStand: true, seeThrough: true });
    }
    // the dig gate: a barrier pole across the rim path (west side, toward the track)
    const ga = 3.6, gx = DIG.x + Math.cos(ga) * (DIG.r + 1.5), gz = DIG.z + Math.sin(ga) * (DIG.r + 1.5);
    const pole = new THREE.Group(); pole.position.set(gx, H(gx, gz) + 1.0, gz); group.add(pole);
    const PB2 = new Batch(pole);
    PB2.add(bbox(0.12, 0.12, 4.2, 0.03, 0.5), tm('hazard'), 0, 0, 0);
    PB2.build();
    DB.add(bbox(0.4, 1.2, 0.4, 0.04, 1), concrete, gx, H(gx, gz) + 0.6, gz - 2.2);
    const gc = col({ type: 'box', x: gx, z: gz, hw: 0.2, hd: 2.1, top: H(gx, gz) + 1.6, noStand: true, seeThrough: true });
    digGate.push(pole, gc);
    R.digGateSpot = W(gx - 1.5, gz);
    // tarps, buckets, sieves on terrace 1
    for (let k = 0; k < 6; k++) {
      const a = k * 1.05 + 0.5, x = DIG.x + Math.cos(a) * 13.8, z = DIG.z + Math.sin(a) * 13.8;
      DB.add(lathe([[0.01, 0], [0.18, 0.01], [0.22, 0.32], [0.24, 0.34]], 10, 0), pm('#7a8a9a', 0.6, { metalness: 0.3 }), x, H(x, z), z);
    }
    // ladders down each terrace wall, beside the ramps (a quicker way down)
    for (let k = 0; k < 3; k++) {
      const a = DIG_RAMPS[k] + 0.9, rk = DIG.r - 4 * k;
      const x = DIG.x + Math.cos(a) * (rk - 0.25), z = DIG.z + Math.sin(a) * (rk - 0.25);
      const ytop = BASE - 1.6 * k, ybot = ytop - 1.6;
      for (const s of [-1, 1]) DB.add(cyl(0.035, 0.035, 2.0, 5, 0), wood, x + Math.sin(a) * s * 0.25, (ytop + ybot) / 2 + 0.2, z - Math.cos(a) * s * 0.25);
      for (let r = 0; r < 5; r++) DB.add(cyl(0.025, 0.025, 0.5, 5, 0), wood, x, ybot + 0.3 + r * 0.38, z, 0, -a, Math.PI / 2);
    }
    // timber shoring along the steep terrace walls (the ramps stay open)
    for (let k = 0; k < 3; k++) {
      const rk = DIG.r - 4 * k, ytop = BASE - 1.6 * k, ybot = ytop - 1.6;
      const n = Math.round(rk * Math.PI * 2 / 1.3);
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        if (angDiff(a, DIG_RAMPS[k]) < 0.42) continue;
        const r0 = rk - 0.35, x = DIG.x + Math.cos(a) * r0, z = DIG.z + Math.sin(a) * r0;
        DB.add(bbox(1.32, 1.75, 0.1, 0.02, 0.8), plank, x, (ytop + ybot) / 2 + 0.05, z, 0, -a + Math.PI / 2, 0);
        if (i % 3 === 0) DB.add(cyl(0.07, 0.07, 1.9, 6, 0), darkWood, DIG.x + Math.cos(a) * (r0 - 0.1), (ytop + ybot) / 2 + 0.1, DIG.z + Math.sin(a) * (r0 - 0.1));
      }
    }
    // the bottom: a stone face with the carving, and three seals (old stone discs that slide when struck)
    const bottomY = BASE - 1.6 * 3;
    const wallA = DIG_RAMPS[2] + Math.PI;
    const cxw = DIG.x + Math.cos(wallA) * 3.2, czw = DIG.z + Math.sin(wallA) * 3.2;
    const face = new THREE.Group(); face.position.set(cxw, bottomY, czw); face.rotation.y = -wallA - Math.PI / 2; group.add(face);
    // the Temple of Bù's gate (Temple-Park, under Bald Mountain): a slate portal with a lintel of carved arches;
    // the three seals hold its stone door shut (src/game/temple.js is the temple inside)
    const FB = new Batch(face);
    FB.add(bbox(5.6, 3.6, 0.7, 0.12, 2), tm('fortStone', { color: '#6c6f74' }), 0, 1.8, -0.25);
    FB.add(bbox(3.0, 0.7, 0.9, 0.08, 1), tm('fortStone', { color: '#8a5a62' }), 0, 3.15, 0.0);
    for (const s of [-1, 1]) FB.add(bbox(0.6, 3.0, 0.8, 0.08, 1), tm('fortStone', { color: '#55575d' }), s * 1.45, 1.5, 0.05);
    FB.add(bbox(2.3, 2.8, 0.2, 0.02, 1), pm('#141214', 1), 0, 1.4, 0.0);
    FB.build();
    const carv = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.55), new THREE.MeshStandardMaterial({ map: carvingTex(), roughness: 0.95 }));
    carv.position.set(0, 3.15, 0.47); face.add(carv);
    const cover2 = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.8, 0.3), tm('fortStone', { color: '#7a7268' }));
    cover2.position.set(0, 1.4, 0.15); cover2.castShadow = true; face.add(cover2);   // the stone door, until the seals open
    col({ type: 'box', x: cxw, z: czw, hw: 2.6, hd: 0.4, rot: wallA + Math.PI / 2, top: bottomY + 3.2, noStand: true });
    const sealM = tm('fortStone', { color: '#d8b090' });
    for (let k = 0; k < 3; k++) {
      const a = wallA + (k - 1) * 0.95 + Math.PI;
      const sx = DIG.x + Math.cos(a) * 3.6, sz = DIG.z + Math.sin(a) * 3.6;
      const disc = mesh(group, cached('seal', () => cyl(0.55, 0.55, 0.2, 18, 0)), sealM, sx, bottomY + 1.6, sz, 0, { rx: Math.PI / 2 });
      disc.rotation.set(Math.PI / 2, 0, -a + Math.PI / 2, 'YXZ');
      disc.lookAt(DIG.x + ox, bottomY + 1.6, DIG.z + oz); // (the group sits at the origin offset: face the centre)
      disc.position.set(sx, bottomY + 1.6, sz); disc.lookAt(DIG.x, bottomY + 1.6, DIG.z); disc.rotateX(Math.PI / 2);
      const glow = mesh(group, cached('sealGlow', () => new THREE.CircleGeometry(0.32, 16)), pm('#ffd890', 0.4, { emissive: '#ffb040', emissiveIntensity: 0 }), sx, bottomY + 1.6, sz, 0, { cast: false });
      glow.lookAt(DIG.x, bottomY + 1.6, DIG.z); glow.translateZ(0.12);
      DB.add(bbox(0.9, 3.0, 0.9, 0.08, 1.5), tm('fortStone', { color: '#b88a68' }), sx + Math.cos(a) * 0.55, bottomY + 1.1, sz + Math.sin(a) * 0.55);
      const S = { x: ox + sx, y: bottomY + 1.6, z: oz + sz, on: false, setOn(b) { this.on = !!b; glow.material.emissiveIntensity = b ? 2.2 : 0; } };
      seals.push(S);
      R.ballTargets.push({ x: S.x, y: S.y, z: S.z, r: 0.8, seal: k });
      col({ type: 'cyl', x: sx + Math.cos(a) * 0.55, z: sz + Math.sin(a) * 0.55, r: 0.6, top: bottomY + 2.6, noStand: true });
    }
    DB.build();
    R.dig = {
      ...W(DIG.x, DIG.z), bottomY, seals,
      gate: { ...R.digGateSpot, isOpen: false, open() { this.isOpen = true; digGate[0].rotation.x = -1.4; digGate[0].position.y += 1.2; digGate[1].enabled = false; } },
      carvings: W(DIG.x + Math.cos(wallA) * 2.0, DIG.z + Math.sin(wallA) * 2.0),
      door: W(DIG.x + Math.cos(wallA) * 2.7, DIG.z + Math.sin(wallA) * 2.7),   // the temple's gate (enter here)
      reveal() { cover2.visible = false; },
    };
  }

  // the Esmers' shuttles come and go through Bald Mountain (LBA2): two circling over Temple-Park
  shuttleTraffic(group, updaters, { cx: DIG.x, cz: DIG.z, y: 30, r: 60, n: 2, speed: 0.05 });

  // ================================================================ FunFrock's buried condenser hall
  {
    const gy = H(RUINS.x, RUINS.z);
    const UB = new Batch(group);
    UB.add(bbox(7, 3.6, 4, 0.3, 2.6), concrete, RUINS.x, gy + 1.2, RUINS.z - 1.0);
    UB.add(bbox(2.6, 2.6, 0.5, 0.05, 1), pm('#1a1612', 0.95), RUINS.x, gy + 1.3, RUINS.z + 1.0);
    UB.add(bbox(1.2, 2.4, 0.12, 0.02, 1), rust, RUINS.x - 0.6, gy + 1.2, RUINS.z + 1.3, 0, 0.6, 0);
    UB.add(bbox(3.2, 0.4, 0.8, 0.06, 1), concrete, RUINS.x, gy + 2.75, RUINS.z + 1.1);
    for (const s of [-1, 1]) UB.add(cyl(0.3, 0.35, 3.0, 10, 1), rust, RUINS.x + s * 4.2, gy + 0.8, RUINS.z - 2.2, 0.3, 0, s * 0.4);
    UB.build();
    col({ type: 'box', x: RUINS.x, z: RUINS.z - 1.0, hw: 3.5, hd: 2.0, top: gy + 3 });
  }
  // sand drifted against the door (chapter 5 digs it out), and the plume once the steam runs through
  const drift = mesh(group, new THREE.SphereGeometry(1.8, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.2, 0.75, 0.7), tm('sand', { color: '#f6deb0' }), RUINS.x, H(RUINS.x, RUINS.z + 1.6) - 0.1, RUINS.z + 1.6);
  const plumes = [];
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 1.4, 9, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); p.position.set(RUINS.x + s * 4.2, H(RUINS.x, RUINS.z) + 6.5, RUINS.z - 2.2); group.add(p); plumes.push(p); }
  updaters.push((dt, t) => { for (const p of plumes) { p.rotation.y += dt * 0.3; p.scale.x = p.scale.z = 1 + Math.sin(t * 1.3) * 0.06; } });
  R.ruins = {
    ...W(RUINS.x, RUINS.z), door: W(RUINS.x, RUINS.z + 1.6), stand: W(RUINS.x, RUINS.z + 3.6),
    setDrift(b) { drift.visible = !!b; },
    setPlume(v) { for (const p of plumes) p.material.opacity = v * 0.35; },
  };

  // ================================================================ Hesk's sand-yacht
  const yacht = new THREE.Group();
  {
    const YB = new Batch(yacht);
    YB.add(bbox(3.4, 0.35, 1.2, 0.12, 1), plank, 0, 0.6, 0);
    YB.add(bbox(0.2, 0.2, 3.2, 0.04, 1), darkWood, -0.6, 0.55, 0);
    for (const [dx, dz] of [[1.5, 0], [-0.6, -1.5], [-0.6, 1.5]]) YB.add(cyl(0.28, 0.28, 0.14, 12, 0), iron, dx, 0.28, dz, Math.PI / 2, 0, 0);
    YB.add(cyl(0.06, 0.06, 5.0, 6, 0), darkWood, 0.4, 3.1, 0);
    YB.build();
    const sail = new THREE.Mesh(cached('sailTri', () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.9, 0, 0, 5.3, 0, -2.6, 1.0, 0], 3)); g.setIndex([0, 1, 2]); g.computeVertexNormals(); return g; }), new THREE.MeshStandardMaterial({ map: awningTex('#e86a3a', '#f4e8d0'), side: THREE.DoubleSide }));
    sail.position.set(0.35, 0, 0); sail.castShadow = true; yacht.add(sail);
  }
  const YACHT = { x: -24, z: 11, a: 0 };
  yacht.position.set(YACHT.x, H(YACHT.x, YACHT.z), YACHT.z); group.add(yacht);
  const yachtCol = col({ type: 'box', x: YACHT.x, z: YACHT.z, hw: 1.8, hd: 0.7, top: H(YACHT.x, YACHT.z) + 0.8, noStand: true });
  const YPATHS = YACHT_ROUTES;   // (keshlife.js: Hesk's poles keep clear of them)
  const ENDS = { village: [YACHT.x, YACHT.z, YPATHS.toVillage], camp: [-8, -40, YPATHS.toCamp], dig: [44, 25, YPATHS.toDig] };
  R.yacht = {
    ...W(YACHT.x, YACHT.z), a: YACHT.a, riding: null,
    // where the yacht is parked: 'village', 'camp' or 'dig' (for saves)
    placeAt(key) {
      const e = ENDS[key]; if (!e) return;
      const P = e[2], a = P[P.length - 2], b = P[P.length - 1];
      yacht.position.set(e[0], H(e[0], e[1]), e[1]); yacht.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
      yachtCol.x = ox + e[0]; yachtCol.z = oz + e[1]; yachtCol.top = H(e[0], e[1]) + 0.8; physics.update(yachtCol);
      this.x = ox + e[0]; this.z = oz + e[1];
    },
    spot(key) { const e = ENDS[key]; return e ? W(e[0], e[1]) : null; },
    // carry the hero along a path (a short ride, then done(); the yacht stays at the end)
    ride(key, hero, done) {
      const P = YPATHS[key]; if (!P) { done?.(); return; }
      const L = []; let tot = 0; for (let i = 0; i < P.length - 1; i++) { const l = Math.hypot(P[i + 1][0] - P[i][0], P[i + 1][1] - P[i][1]); L.push(l); tot += l; }
      this.riding = { P, L, tot, d: 0, hero, done };
      yachtCol.enabled = false;
    },
  };
  updaters.push((dt) => {
    const Y = R.yacht.riding; if (!Y) return;
    Y.d = Math.min(Y.tot, Y.d + dt * 11);
    let d = Y.d, i = 0; while (i < Y.L.length - 1 && d > Y.L[i]) { d -= Y.L[i]; i++; }
    const t = Math.min(1, d / Y.L[i]), a = Y.P[i], b = Y.P[i + 1];
    const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    yacht.position.set(x, H(x, z), z); yacht.rotation.y = -Math.atan2(b[1] - a[1], b[0] - a[0]);
    yacht.rotation.z = Math.sin(Y.d * 0.7) * 0.03;
    if (Y.hero) { Y.hero.pos.set(ox + x, H(x, z) + 0.75, oz + z); Y.hero.angle = Math.atan2(b[0] - a[0], b[1] - a[1]); Y.hero.vy = 0; Y.hero.onGround = true; }
    if (Y.d >= Y.tot) {
      R.yacht.riding = null;
      yachtCol.x = ox + x; yachtCol.z = oz + z; yachtCol.top = H(x, z) + 0.8; physics.update(yachtCol); yachtCol.enabled = true;
      R.yacht.x = ox + x; R.yacht.z = oz + z;
      if (Y.hero) { const side = -Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2; const hx = x + Math.cos(side) * 1.8, hz = z - Math.sin(side) * 1.8; Y.hero.pos.set(ox + hx, H(hx, hz), oz + hz); }
      Y.done?.();
    }
  });

  // ================================================================ the sandstorm
  {
    const N = 260, pos = new Float32Array(N * 3), seed = [];
    for (let i = 0; i < N; i++) seed.push([(rr() - 0.5) * 80, rr() * 10, (rr() - 0.5) * 80, 0.6 + rr()]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(g, new THREE.PointsMaterial({ color: '#e8c890', size: 1.6, transparent: true, opacity: 0, depthWrite: false, map: ctex('dustp', 64, 64, (x, S) => { const gr = x.createRadialGradient(S / 2, S / 2, 1, S / 2, S / 2, S / 2); gr.addColorStop(0, 'rgba(255,240,210,0.9)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); x.fillStyle = gr; x.fillRect(0, 0, S, S); }, false) }));
    dust.frustumCulled = false; group.add(dust);
    const clear = new THREE.Color('#f0d2a2'), storm = new THREE.Color('#d8a868');
    let level = 0, t = 0;
    R.storm = {
      level: 0,
      setLevel(k) { this.level = Math.max(0, Math.min(1, k)); },
      focus: null,
    };
    updaters.push((dt) => {
      t += dt;
      level += (R.storm.level - level) * Math.min(1, dt * 0.8);
      R.env.fogRange[0] = 80 - level * 70; R.env.fogRange[1] = 280 - level * 235;
      R.env.fogColor.copy(clear).lerp(storm, level);
      dust.material.opacity = level * 0.55; dust.visible = level > 0.02;
      if (!dust.visible) return;
      const f = R.storm.focus || { x: ox, z: oz };
      for (let i = 0; i < N; i++) {
        const s = seed[i];
        s[0] += dt * 14 * s[3]; if (s[0] > 40) s[0] -= 80;
        pos[i * 3] = f.x - ox + s[0]; pos[i * 3 + 1] = H(f.x - ox, f.z - oz) + s[1] + Math.sin(t * 2 + i) * 0.4; pos[i * 3 + 2] = f.z - oz + s[2];
      }
      g.attributes.position.needsUpdate = true;
    });
  }

  // Kesh twelve years on: the cool room, Lumi's loom and sail, the sand screens, Hesk's poles and yacht stop
  R.kesh = buildKesh({ group, col, H, W, updaters, ox, oz });

  B.build();

  // ================================================================ people
  const at = (x, z, a) => ({ ...W(x, z), a });
  R.npcSpots = {
    hesk: at(-25.5, 13.2, Math.PI * 0.9),
    tarra: at(-49, 11.5, 0),
    ilka: at(-7, -43, Math.PI * 0.75),
    dallan: at(31, -19, -Math.PI / 2),
    guard: at(24.5, -18.5, -Math.PI / 2),
    kid: at(-44, -4, 0.6),
    trader: at(VILLAGE.x + 2, VILLAGE.z - 5.4, 0),
    weaver: R.kesh.lumi,   // (at her loom, in the sail's shade: keshlife.js)
  };
  R.spawn = { ...R.dock };
  R.plaza = W(VILLAGE.x, VILLAGE.z);
  R.oasisEdge = W(OASIS.x + OASIS.r + 1.6, OASIS.z + 2.0);
  R.digTerraceY = [BASE, BASE - 1.6, BASE - 3.2, BASE - 4.8];
  return R;
}
