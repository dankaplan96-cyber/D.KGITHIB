// Desert Island (chapters 4–5). An outdoor region like Zeelich (a room flagged `outdoor`, its own sky), but
// with real ground: a heightfield patch registered on the shared terrain (Terrain.addPatch), so walking,
// sliding, the ball and the camera work as on Citadel. Beyond the shore the patch drops below the sea floor
// limit, which actors may not enter.
//
// CONTRACT used by src/game/story/dig.js (chapter 4) and steam.js (chapter 5). World coordinates.
//   R.dock {x,z,a}            arrival from the ferry; R.ferry {setVisible(b)}
//   R.npcSpots {hesk, tarra, ilka, dallan, guard, kid, trader, weaver} {x,z,a}
//   R.oasis {x,z,r, level, setLevel(0..1)}          the pond: dry (0) → full (1); palms green up with it
//   R.pump {x,z, gears:[{x,y,z,i,jam,turning,setTurning(b),kick()}], jam, state, setState('jammed'|'leak'|'running'),
//          setRunning(b), running, strain, onGust, gustNow(), joint:{x,z,y,loose,spraying,setLoose(b),setSpray(b)}}
//          wind-pump: the jammed gear is ball target `gear`, the two sound ones `gearOk`; the pipe's loose joint
//   R.yacht {x,z,a, ride(pathKey, done)}            Hesk's sand-yacht; paths: 'toCamp', 'toDig', 'toVillage'
//   R.camp {x,z}                                     Ilka's camp under the north mesa
//   R.post {x0,z0,x1,z1, gate:{x,z,open(),isOpen}, office:{x,z}, desk:{x,z}, patrol:[[x,z]...], cover:[{x,z,r}]}
//   R.storm {level, setLevel(0..1)}                 sandstorm: fog closes in, dust blows; drones see less
//   R.dig {x,z, gate:{x,z,open(),isOpen,flash(ok),keypad:{x,z,y}}, seals:[{x,y,z,on,setOn(b)}], carvings:{x,z}, door:{x,z}, bottomY, reveal()}
//        seals = the three warm discs (ball targets `seal`); cold:[{x,y,z}] the two cold ones (targets `cold`);
//        crack {x,z,y} the crystal-crusted crack beside the last ramp
//        the bottom of the excavation is the Temple of Bù's gate; reveal() slides its stone door away
//   R.ruins {x,z, door:{x,z}}                        FunFrock's buried condenser hall (chapter 5)
//   R.bore {x,z}                                     the project's test bore inside the post (chapter 5)
//   R.kesh                                           Kesh twelve years on (keshlife.js): the cool room, Lumi's loom, poles
//   R.shutDoors [{id,x,y,z,ry}]  R.figures [{x,z}]  R.gateway {x,z}  R.school {x,z}   the original's old places (desertold.js)
// Heights (WORLD-80 step 3): the ground is the original island's heightfield (its low plain 0.3–3 m, its ridge up to
// 11 m) except within our places, which keep their own level: Kesh, the oasis, the pump, the pier road and the dig on
// the old plain's BASE = 5.0 (the dig steps down 1.6 m per terrace to bottomY = 0.2), the post's pad, the camp, the
// glider field and the condenser hall at the original's level there.
import * as THREE from 'three';
import { Terrain } from '../engine/terrain.js';
import { textures } from '../engine/textures.js';
import { rng, smoothstep, distToSegment } from '../engine/math.js';
import { rockGeometry } from './vegetation.js';
import { shuttleTraffic } from './shuttle.js';
import { buildKesh, keshFlat, keshBank, keshDrift, keshClear, DRIFT_H, YACHT_ROUTES, routeDist } from './keshlife.js';
import { CELL as OC, NX as ONX, NZ as ONZ, W as OW, D as OD, UNIT as OU, HEIGHTS as OHEIGHTS } from './desert-layout.js';
import { fitAdd } from './worldfit.js';
import { Plume } from '../engine/softfx.js';
import { dressCamp, dressPost, tinted, tintedBatch, Wd } from './desertdress.js';
import { buildOldPlaces, pavedAt, rillAt, coveAt, OLD_ROCKS } from './desertold.js';
import {
  tm, pm, ctex, cached, bbox, boxUV, cyl, lathe, tube, Batch, member, rod, mesh, instances, lodInstances, emblemMaterial, emq, mergeGeos,
} from './kit.js';

export const DESERT = { x: 3400, z: 0 };
const SIZE = 300, SEGS = 300;   // (the original's island reaches 141 m from our centre; 1 m points, as before, on whole metres: the dig's walls and discs sample as they did)
const BASE = 5.0;
const SEA_Y = -0.2;

// ================================================================== layout (local coordinates)
const DOCK = { x: -106, z: 4, deck: 2.0 };
// (LAZY-REGIONS: where the ferry lands, known before the island is built: travel.js)
export const DESERT_DOCK = { x: DESERT.x + DOCK.x - 2, z: DESERT.z + DOCK.z, a: Math.PI / 2 };
const VILLAGE = { x: -50, z: 2, r: 19 };
const OASIS = { x: -40, z: -15, r: 7.5 };
const PUMP = { x: -30, z: -7 };
const PUMP_JAM = 1;   // the wind-pump's jammed gear: the middle one (ADV-2)
const PIPE_J = { x: -32.2, z: -11.6 };   // the pipe's low joint, on walkable ground east of the oasis basin (ADV-2)
const GEAR_S = 1.3, GEAR_Y = 1.7;   // the pump's gears: scale, and height on the tower
const PUMP_TANK = { x: PUMP.x + 1.0, z: PUMP.z - 4.0 };   // the pump's water tank on stilts   // the pump's gears, larger than the first version's so a gust's shudder reads from the play camera
const POST = { x0: 26, x1: 58, z0: -34, z1: -8, y: 1.6, gateZ: -21 };   // (WORLD-80 step 3: its pad a metre over the original's low ground; it stood on our old 5 m plain)
const DIG = { x: 64, z: 28, r: 16 };
const CAMP = { x: -10, z: -46 };
const RUINS = { x: 12, z: 50 };
const GLIDER = { x: -60, z: -36 };   // (travel.js DES.glider: the field on the beach terrace south-west of the village)
// (WORLD-80 step 3: the three invented mesas are gone — the original's ground stands there; the list stays so the
//  rubble's random draws below fall as they did)
const MESAS = [
  { x: -6, z: -70, rx: 24, rz: 13, h: 15, gone: true },
  { x: 38, z: 72, rx: 17, rz: 11, h: 13, gone: true },
  { x: 86, z: -26, rx: 9, rz: 15, h: 12, gone: true },
  { x: -70, z: 52, rx: 13, rz: 9, h: 11, gone: true },
  { x: 92, z: 46, rx: 7, rz: 7, h: 9, gone: true },
];
const TRACKS = [
  [[-86, 4], [-70, 4], [-58, 3], [-40, 5], [-22, 7], [0, 9], [22, 6], [26, -21]],
  [[0, 9], [18, 18], [42, 24], [50, 27]],
  [[-22, 7], [-18, -20], [-12, -38]],
  [[0, 9], [6, 30], [10, 44]],
  // WORLD-80 step 3: from the plaza north past the oasis's rim, through the gap in the big house's garden wall, over
  // the land bridge and along the pool's east rim to the School of Magic (desertold.js)
  [[-46, -2], [-47, -26], [-45, -46], [-49, -58], [-49.5, -66.3], [-60, -67.3]],
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

// ================================================================== the original's island (WORLD-SHAPE)
// The coast and the high ground follow the original LBA2 Desert Island (desert-layout.js: its height grid as numbers,
// 219 × 274 m), turned into our frame so every place of ours stands inland: ours = R(deg) · original + t. The turn and
// shift were searched over (every 5°, 2 m) for the largest margin between our places and the original's coast. Its
// inlets, the north lagoon, the round hill and the long south-east arm are the original's; our dunes, flats, tracks,
// the dig and the mesas by the camp and the School of Magic are ours, on top.
export const DESERT_FIT = { deg: 275, tx: -4, tz: -40 };
const FIT_C = Math.cos(DESERT_FIT.deg * Math.PI / 180), FIT_S = Math.sin(DESERT_FIT.deg * Math.PI / 180);
let OG = null;
// the original's height (m) under our (x, z); 0 is its sea
function origH(x, z) {
  OG ??= Uint8Array.from(atob(OHEIGHTS), (c) => c.charCodeAt(0));
  const qx = x - DESERT_FIT.tx, qz = z - DESERT_FIT.tz;
  const gx = (FIT_C * qx + FIT_S * qz + OW / 2) / OC, gz = (-FIT_S * qx + FIT_C * qz + OD / 2) / OC;
  if (gx < 0 || gz < 0 || gx >= ONX - 1 || gz >= ONZ - 1) return 0;
  const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j, o = j * ONX + i;
  return ((OG[o] * (1 - fx) + OG[o + 1] * fx) * (1 - fz) + (OG[o + ONX] * (1 - fx) + OG[o + ONX + 1] * fx) * fz) * OU;
}
// our places (WORLD-80 step 3): [x, z, r, level] — each stays flat at its own level within r and blends into the
// original's ground over RELIEF_GAP m beyond it; the land mask keeps land at least r round it (the coast gives way
// where the original's is closer). Kesh, the oasis, the pump, Hesk's board, the pier road and the dig stay on our old
// 5 m plain; the camp, the glider field and the condenser hall stand at the original's ground there. (The School of
// Magic's mesa at (−70, 52) is gone: the School stands at the original's place, desertold.js.) The tracks and the
// yacht's routes are no longer keeps: they follow the original's ground, smoothed (origGround).
const CAMP_Y = 3.0, RUINS_Y = 1.6, GLIDER_Y = 1.8;
const KEEP = [[-50, 2, 22, BASE], [-70, -6, 9, BASE], [-40, -15, 14, BASE], [-30, -7, 8, BASE], [64, 28, 24, BASE], [-10, -46, 12, CAMP_Y],
  [12, 50, 12, RUINS_Y], [GLIDER.x, GLIDER.z, 11, GLIDER_Y], [-21.6, 15.2, 5, BASE], [-84, 4, 6, BASE]];
const RELIEF_GAP = 6;
const postDist = (x, z) => Math.max(POST.x0 - 8 - x, x - POST.x1 - 8, POST.z0 - 8 - z, z - POST.z1 - 8);
function keepDist(x, z) {   // metres outside the nearest keep (negative inside)
  let d = postDist(x, z);
  for (const [kx, kz, r] of KEEP) d = Math.min(d, Math.hypot(x - kx, z - kz) - r);
  return d;
}
// how much of our ground shows at (x, z) (1 inside a keep, 0 beyond the gap) and at which level (the keeps' levels,
// weighted by how near each is)
function keepMix(x, z) {
  let w = 1, sw = 0, sl = 0;
  const take = (d, level) => { const k = 1 - smoothstep(0, RELIEF_GAP, d); if (k <= 0) return; w *= 1 - k; sw += k; sl += k * level; };
  take(postDist(x, z), POST.y);
  for (const [kx, kz, r, level] of KEEP) take(Math.hypot(x - kx, z - kz) - r, level);
  return [1 - w, sw ? sl / sw : BASE];
}
// signed distance to the coast (m, + inland) on a 1 m grid over the patch, from the original's land plus our keeps
const CD_STEP = 1, CD_N = SIZE / CD_STEP + 1;
let CD = null, KD = null;
function buildCoast() {
  const n = CD_N, h0 = SIZE / 2, land = new Uint8Array(n * n);
  KD = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = -h0 + i * CD_STEP, z = -h0 + j * CD_STEP, k = j * n + i;
    KD[k] = keepDist(x, z);
    land[k] = origH(x, z) > 0.05 || KD[k] < 0 ? 1 : 0;
  }
  // two chamfer passes (distance to the other kind), for the land and for the sea
  const dist = (want) => {
    const d = new Float32Array(n * n), BIG = 1e6, a = CD_STEP, b = CD_STEP * Math.SQRT2;
    for (let k = 0; k < n * n; k++) d[k] = land[k] === want ? BIG : 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const k = j * n + i; if (!d[k]) continue;
      let v = d[k];
      if (i > 0) v = Math.min(v, d[k - 1] + a);
      if (j > 0) { v = Math.min(v, d[k - n] + a); if (i > 0) v = Math.min(v, d[k - n - 1] + b); if (i < n - 1) v = Math.min(v, d[k - n + 1] + b); }
      d[k] = v;
    }
    for (let j = n - 1; j >= 0; j--) for (let i = n - 1; i >= 0; i--) {
      const k = j * n + i; if (!d[k]) continue;
      let v = d[k];
      if (i < n - 1) v = Math.min(v, d[k + 1] + a);
      if (j < n - 1) { v = Math.min(v, d[k + n] + a); if (i < n - 1) v = Math.min(v, d[k + n + 1] + b); if (i > 0) v = Math.min(v, d[k + n - 1] + b); }
      d[k] = v;
    }
    return d;
  };
  const din = dist(1), dout = dist(0);
  CD = new Float32Array(n * n);
  for (let k = 0; k < n * n; k++) CD[k] = land[k] ? din[k] - CD_STEP / 2 : -(dout[k] - CD_STEP / 2);
}
function gridAt(kd, x, z, out) {
  if (!CD) buildCoast();
  const F = kd ? KD : CD;
  const gx = (x + SIZE / 2) / CD_STEP, gz = (z + SIZE / 2) / CD_STEP;
  if (gx < 0 || gz < 0 || gx >= CD_N - 1 || gz >= CD_N - 1) return out;
  const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j, o = j * CD_N + i;
  return (F[o] * (1 - fx) + F[o + 1] * fx) * (1 - fz) + (F[o + CD_N] * (1 - fx) + F[o + CD_N + 1] * fx) * fz;
}
// distance inland from the shore (negative at sea), with a small wobble so the coast reads as sand and rock (WORLD-80
// step 3: 0.4 m, so the original's beach stays where its numbers put it)
export function coastDist(x, z) {
  return gridAt(false, x, z, -40) + Math.sin(x * 0.21 + z * 0.13) * Math.sin(z * 0.17 - x * 0.09) * 0.4;
}
// keepDist read from the same 2 m grid (the ground asks it twice per point)
const keepNear = (x, z) => gridAt(true, x, z, 99);
export function trackDist(x, z, list = TRACKS) {   // (the sand tracks; also containers.js keeps off them)
  let d = 1e9;
  for (const p of list) for (let i = 0; i < p.length - 1; i++) d = Math.min(d, distToSegment(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]));
  return d;
}
// the tracks whose ground is smoothed (origGround): the old ones over the ridge; the School's path keeps the original's
// terraces (its rim walk and land bridge are narrow steps a smoothing would flatten)
const SMOOTH_TRACKS = TRACKS.slice(0, 4);
const inPost = (x, z, pad = 0) => x > POST.x0 - pad && x < POST.x1 + pad && z > POST.z0 - pad && z < POST.z1 + pad;

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

// the original's ground under (x, z), smoothed along our tracks and the yacht's routes (its terraces are steps of a
// metre or two: a sand track climbs them as a slope, not a kerb); only land is averaged, so a terrace by the water
// keeps its edge
function origGround(x, z) {
  const O = origH(x, z), td = Math.min(trackDist(x, z, SMOOTH_TRACKS), routeDist(x, z));
  if (td > 6 || O <= 0.05) return O;
  let s = 0, n = 0;
  for (const dx of [-3, 0, 3]) for (const dz of [-3, 0, 3]) { const v = origH(x + dx, z + dz); if (v > 0.05) { s += v; n++; } }
  return O + ((n ? s / n : O) - O) * smoothstep(6, 2.5, td);
}

function heightFn(x, z) {
  // our places: the old plain with its dunes (long crests across the wind, from the west, with a cross ripple), flat
  // where people live and drive, each place at its own level (keepMix)
  const crest = Math.max(0, Math.sin(x * 0.085 + z * 0.045 + Math.sin(z * 0.035) * 1.2));
  const dunes = crest * crest * 2.0 + Math.sin(x * 0.19 + z * 0.12) * 0.35 + Math.sin(x * 0.05 - z * 0.08) * 0.6;
  let flat = 0;
  flat = Math.max(flat, smoothstep(VILLAGE.r + 8, VILLAGE.r, Math.hypot(x - VILLAGE.x, z - VILLAGE.z)));
  flat = Math.max(flat, smoothstep(5, 2, trackDist(x, z)));
  flat = Math.max(flat, inPost(x, z, 6) ? 1 - smoothstep(0, 6, Math.max(POST.x0 - x, x - POST.x1, POST.z0 - z, z - POST.z1, 0)) : 0);
  flat = Math.max(flat, smoothstep(DIG.r + 8, DIG.r + 2, Math.hypot(x - DIG.x, z - DIG.z)));
  flat = Math.max(flat, smoothstep(12, 6, Math.hypot(x - CAMP.x, z - CAMP.z)));
  flat = Math.max(flat, smoothstep(10, 5, Math.hypot(x - RUINS.x, z - RUINS.z)));
  flat = Math.max(flat, smoothstep(13, 7, Math.hypot(x - GLIDER.x, z - GLIDER.z)));
  flat = Math.max(flat, keshFlat(x, z));
  const [kw, level] = keepMix(x, z);
  let ours = level + dunes * (1 - flat);
  // Kesh's sand (keshlife.js): the dune against the cool room, sand banked on the screens, a drift over the yacht's track
  ours += keshBank(x, z) + DRIFT_H * keshDrift(x, z);
  // the post sits on a levelled concrete pad
  if (inPost(x, z)) ours = POST.y;
  // the oasis basin
  const od = Math.hypot(x - OASIS.x, z - OASIS.z);
  if (od < OASIS.r + 5) ours -= 1.5 * smoothstep(OASIS.r + 5, OASIS.r - 2, od);
  // a place of ours by the sea runs down to a beach (the original's own shores keep their heights, cliffs and all)
  const cd = coastDist(x, z);
  if (kw > 0) ours = Math.min(ours, 0.35 + 0.6 * Math.max(0, cd));
  // everywhere else the ground is the original island's (WORLD-80 step 3): its terraces, its ridge, its low plain and
  // its beaches as its numbers have them; our places blend into it over RELIEF_GAP m
  let h = kw >= 1 ? ours : kw <= 0 ? origGround(x, z) : origGround(x, z) * (1 - kw) + ours * kw;
  const dg = digHeight(x, z);
  if (dg != null) h = Math.min(h, dg);
  // the School's water channel at the mask's foot (desertold.js)
  const rl = rillAt(x, z);
  if (rl > 0) h = Math.min(h, -0.5 + 1.6 * (1 - rl));
  // near the pier the beach slopes gently down to the deck
  const dd = Math.hypot(x - (DOCK.x + 8), (z - DOCK.z) * 0.8);
  if (dd < 22) h = h + (DOCK.deck + 0.2 + (h - DOCK.deck - 0.2) * smoothstep(4, 22, dd) - h) * (1 - smoothstep(16, 22, dd));
  // the sea: beyond the shore (the original's, or one of our places') the ground drops under the water at once and
  // the sea bed falls away, faster off a high shore
  const kn = keepNear(x, z), sl = 0.45 + 0.6 * smoothstep(6, 0, kn) + smoothstep(0, 8, kn) * 0.2 * Math.max(0, origH(x, z) - 2);
  let out = cd < 0 ? Math.max(-3.2, Math.min(h, -0.4 + sl * cd)) : h;
  // the islet's cove floor, held just above the water (the original's door there stands at the waterline: desertold.js)
  const cv = coveAt(x, z);
  if (cv > 0) out = Math.max(out, 0.75 * cv);
  // the pier's landward end steps onto sand at the deck's height: after the shore blend, which would otherwise
  // pull the ground there down to the sea floor (below the water line: a gap nobody can walk across)
  const ex = x - (DOCK.x + 17), w = (1 - smoothstep(3, 12, Math.abs(z - DOCK.z))) * smoothstep(-2.5, -1.0, ex) * (1 - smoothstep(4, 8, ex));
  const floor = DOCK.deck - 0.1;
  return out < floor ? out + (floor - out) * w : out;
}

const C = (h) => new THREE.Color(h);
const COL = { sand: C('#fff2dc'), sandDark: C('#ead0a8'), rock: C('#e0a080'), rockTop: C('#ecc0a0'), dirt: C('#d8b090'), pad: C('#d8d0c4'), pave: C('#e6dac6'), grass: C('#c8d890'), wet: C('#a88a60'), sandCrest: C('#fff8ec'), sandLee: C('#e2b888'), sandRed: C('#e8b48c') };
function colorFn(x, z, h, slope, c) {
  c.copy(COL.sand);
  const n = Math.sin(x * 0.7 + z * 0.4) * Math.sin(z * 0.6 - x * 0.2);
  c.lerp(COL.sandDark, 0.25 + n * 0.15 + smoothstep(3.5, 1.0, h) * 0.12);   // (the low plain a shade warmer than the terraces)
  // wind-sorted sand: pale crests, a warmer lee side behind each crest, and broad patches of
  // redder sand so the open ground reads at a distance (same crest phase as heightFn)
  const ph = x * 0.085 + z * 0.045 + Math.sin(z * 0.035) * 1.2;
  const crest = Math.max(0, Math.sin(ph)), lee = Math.max(0, -Math.cos(ph)) * smoothstep(0, 0.4, Math.sin(ph + 0.6));
  c.lerp(COL.sandCrest, crest * crest * 0.35);
  c.lerp(COL.sandLee, lee * 0.22);
  const big = Math.sin(x * 0.021 + 1.3) * Math.sin(z * 0.017 - 0.4) + Math.sin((x + z) * 0.011) * 0.5;
  c.lerp(COL.sandRed, smoothstep(0.35, 1.1, big) * 0.3);
  if (slope > 0.8) c.lerp(COL.rock, smoothstep(0.8, 1.6, slope));
  if (h > 10.5) c.lerp(COL.rockTop, 0.6);   // (the original's ridge top)
  const pv = pavedAt(x, z);
  if (pv > 0) c.lerp(COL.pave, pv * 0.85);   // (the School's plaza and rim walk, the compound's yard)
  if (inPost(x, z)) c.copy(COL.pad);
  if (h < 0.5) c.lerp(COL.wet, smoothstep(0.5, -0.5, h));   // (wet sand only at the waterline: the original's beaches lie at 0.3 m)
}
function splatFn(x, z, h, slope, w) {
  w[0] = 0; w[1] = 1; w[2] = 0; w[3] = 0; w[4] = 0;
  const rk = smoothstep(0.75, 1.3, slope) + (h > 10.5 ? 0.45 : 0);
  w[2] = rk; w[1] = Math.max(0, 1 - rk);
  const pv = pavedAt(x, z);
  if (pv > 0) { w[4] = 2 * pv; w[1] *= 1 - pv; }
  const td = trackDist(x, z);
  if (td < 2.4) { const dr = 1 - keshDrift(x, z); w[3] = smoothstep(2.4, 1.2, td) * 1.6 * dr; w[1] *= 0.5 + 0.5 * (1 - dr); }   // (the drift covers the track)
  if (Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < VILLAGE.r - 4) { w[3] += 0.8; }
  const od = Math.hypot(x - OASIS.x, z - OASIS.z);
  if (od > OASIS.r - 1 && od < OASIS.r + 4) w[0] = 0.7 * smoothstep(OASIS.r + 4, OASIS.r + 1, od);
  if (inPost(x, z)) { w[4] = 2; w[1] = 0; w[3] = 0; }
}

// The ground on the terrain's own grid, checked for soft-locks as on Citadel (world.js fixTraps): every walkable
// point must be able to walk back to Kesh (drops are fine, climbs only up to the walkable slope). A pit the
// original's sea cliffs and our mesas leave (a strip of beach under a cliff, a hollow between rocks) is lifted
// into a ramp from its rim until none is left.
function groundGrid() {
  const n = SEGS + 1, step = SIZE / SEGS, x0 = -SIZE / 2, h = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) h[j * n + i] = heightFn(x0 + i * step, x0 + j * step);
  const climb = step * 0.95, SEA = -0.35;
  // a sliver of wet sand at the foot of a sea cliff (one point wide) goes under the water: the cliff stands in the sea
  for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
    const k = j * n + i, v = h[k];
    if (v < SEA || v > 0.6) continue;
    const top = Math.max(h[k - 1], h[k + 1], h[k - n], h[k + n]), low = Math.min(h[k - 1], h[k + 1], h[k - n], h[k + n]);
    if (top - v > 3 && low < SEA) h[k] = -0.6;
  }
  // one flood from Kesh: a neighbour joins if it can walk back up to the point it was reached from; those that
  // can't wait until the flood has gone everywhere it can, then each still left out is lifted to just under that
  // point (a step of the ramp) and the flood goes on from it
  const si = Math.round((VILLAGE.x - x0) / step), sj = Math.round((VILLAGE.z - x0) / step);
  let fixed = 0;
  const seen = new Uint8Array(n * n), q = new Int32Array(n * n);
  let qh = 0, qt = 0, wait = [];
  seen[sj * n + si] = 1; q[qt++] = sj * n + si;
  for (;;) {
    while (qh < qt) {
      const c = q[qh++], ci = c % n, cj = (c - ci) / n;
      for (let k = 0; k < 4; k++) {
        const ai = ci + (k === 0 ? 1 : k === 1 ? -1 : 0), aj = cj + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (ai < 0 || aj < 0 || ai >= n || aj >= n) continue;
        const a = aj * n + ai;
        if (seen[a] || h[a] < SEA) continue;
        if (h[c] - h[a] > climb) { wait.push(a, c); continue; }
        seen[a] = 1; q[qt++] = a;
      }
    }
    if (!wait.length) break;
    const w = wait; wait = [];
    for (let k = 0; k < w.length; k += 2) {
      const a = w[k], c = w[k + 1];
      if (seen[a]) continue;
      h[a] = h[c] - climb * 0.9; fixed++; seen[a] = 1; q[qt++] = a;
    }
  }
  return { fixed, at: (x, z) => h[Math.min(SEGS, Math.max(0, Math.round((z - x0) / step))) * n + Math.min(SEGS, Math.max(0, Math.round((x - x0) / step)))] };
}

// ================================================================== painted textures (desert only)
const carvingTex = () => ctex('carving', 1024, 256, (x, CW, H) => {
  // an old relief of the planet in its shell: two suns above, the shell's ring, seams and five vents, drawn in the
  // middle 512 px; a frieze of waves and sun glyphs runs out to either side (POLISH-AUDIT #5: the lintel is a long
  // panel, and the picture was squashed to a sliver; pale stone, dark lines, so the relief reads)
  const W = 512;
  x.fillStyle = '#e4cba0'; x.fillRect(0, 0, CW, H);
  const r = rng(77);
  for (let i = 0; i < 2800; i++) { x.fillStyle = `rgba(${90 + r() * 60},${50 + r() * 40},${30 + r() * 20},${0.15 + r() * 0.2})`; x.fillRect(r() * CW, r() * H, 2 + r() * 3, 2 + r() * 3); }
  const line = (w, a) => { x.lineWidth = w; x.strokeStyle = `rgba(74,34,16,${Math.min(1, a * 1.25)})`; };
  // the friezes: three rows of waves between two rules, a sun glyph at the outer end of each
  for (const s of [-1, 1]) {
    for (let row = 0; row < 3; row++) {
      line(3, 0.6); x.beginPath();
      const y0 = 62 + row * 56;
      for (let k = 0; k <= 200; k += 4) { const px = CW / 2 + s * (270 + k), py = y0 + Math.sin(k * 0.12 + row) * 8; k ? x.lineTo(px, py) : x.moveTo(px, py); }
      x.stroke();
    }
    line(5, 0.7); x.beginPath(); x.moveTo(CW / 2 + s * 262, 24); x.lineTo(CW / 2 + s * 480, 24); x.moveTo(CW / 2 + s * 262, 232); x.lineTo(CW / 2 + s * 480, 232); x.stroke();
    const sx = CW / 2 + s * 438, sy = 128; line(4, 0.7); x.beginPath(); x.arc(sx, sy, 20, 0, Math.PI * 2); x.stroke();
    for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; x.beginPath(); x.moveTo(sx + Math.cos(a) * 26, sy + Math.sin(a) * 26); x.lineTo(sx + Math.cos(a) * 38, sy + Math.sin(a) * 38); x.stroke(); }
  }
  x.save(); x.translate((CW - W) / 2, 0);
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
  x.restore();
  for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(255,230,190,0.18)'; x.fillRect(20 + r() * (CW - 40), 10 + r() * (H - 20), 3, 1); }
});
// the Temple of Bù's masonry: pale warm ashlar with fine mortar, light enough that the gate's shaded face still reads
const buStoneTex = () => ctex('buStone', 256, 256, (x, S) => {
  const r = rng(51);
  x.fillStyle = '#cdb690'; x.fillRect(0, 0, S, S);
  const rows = [0, 58, 118, 172, 226, 256];
  for (let j = 0; j < rows.length - 1; j++) {
    const y0 = rows[j], h = rows[j + 1] - y0;
    let xx = -r() * 50;
    while (xx < S) {
      const w = 56 + r() * 56, t = 226 + r() * 22;
      for (const ox of [-S, 0, S]) {
        const g = x.createLinearGradient(0, y0, 0, y0 + h);
        g.addColorStop(0, `rgb(${t + 6},${t - 6},${t - 30})`); g.addColorStop(1, `rgb(${t - 16},${t - 26},${t - 52})`);
        x.fillStyle = g; x.beginPath(); x.roundRect(xx + ox + 2, y0 + 2, w - 4, h - 4, 5); x.fill();
      }
      xx += w;
    }
  }
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${120 + r() * 60},${90 + r() * 40},${50 + r() * 30},${0.08 + r() * 0.14})`; x.fillRect(r() * S, r() * S, 1 + r() * 3, 1 + r() * 2); }
}, true);
// the passage behind the door once it opens: a glow that is hot in the middle and falls away to the jambs
const passageTex = () => ctex('buPassage', 128, 256, (x, W, H) => {
  const g = x.createRadialGradient(W / 2, H * 0.62, 4, W / 2, H * 0.62, H * 0.78);
  g.addColorStop(0, '#fff4d0'); g.addColorStop(0.35, '#ffc070'); g.addColorStop(0.75, '#d8661c'); g.addColorStop(1, '#6a2a0c');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
}, false);
// Hesk's sail: sun-bleached cloth in panels, an orange band along the foot and a sun on the middle panels
const sailTex = () => ctex('yachtSail', 128, 256, (x, W, H) => {
  x.fillStyle = '#f2e4c4'; x.fillRect(0, 0, W, H);
  for (let k = 0; k < 9; k++) { x.fillStyle = k % 2 ? 'rgba(210,160,90,0.10)' : 'rgba(255,250,235,0.10)'; x.fillRect(0, k * H / 9, W, H / 9); }
  x.fillStyle = 'rgba(120,88,48,0.45)'; for (let k = 1; k < 9; k++) x.fillRect(0, k * H / 9 - 1, W, 2);
  x.fillStyle = '#e8703a'; x.fillRect(0, H * 0.8, W, H * 0.07);
  x.fillStyle = '#c04a22'; x.fillRect(0, H * 0.8 - 3, W, 3); x.fillRect(0, H * 0.87, W, 3);
  x.strokeStyle = '#e8703a'; x.fillStyle = '#e8703a'; x.lineWidth = 3;
  x.beginPath(); x.arc(W * 0.42, H * 0.56, 15, 0, Math.PI * 2); x.fill();
  for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5; x.beginPath(); x.moveTo(W * 0.42 + Math.cos(a) * 21, H * 0.56 + Math.sin(a) * 21); x.lineTo(W * 0.42 + Math.cos(a) * 32, H * 0.56 + Math.sin(a) * 32); x.stroke(); }
  x.fillStyle = 'rgba(90,60,30,0.5)'; x.fillRect(0, 0, 4, H);   // the luff's tabling
}, false);
const awningTex = (a, b) => ctex('aw' + a + b, 64, 64, (x, S) => { for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect(i * S / 4, 0, S / 4, S); } });
const signTex = (text, bg = '#2f6a7a', w = 256) => ctex('sign' + text, w, 96, (x, W, H) => {   // (w: a longer text needs a wider board)
  x.fillStyle = bg; x.fillRect(0, 0, W, H); x.strokeStyle = '#f2e6c8'; x.lineWidth = 6; x.strokeRect(6, 6, W - 12, H - 12);
  x.fillStyle = '#f2e6c8'; x.font = 'bold 38px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, H / 2 + 2);
}, false);

// ================================================================== palms (the oasis's swaying ones, and still ones elsewhere)
const palmTrunkG = () => cached('palmTrunk', () => {
  const parts = [];
  for (let k = 0; k < 9; k++) parts.push([cyl(0.17 - k * 0.008, 0.2 - k * 0.008, 0.62, 8, 0), Math.sin(k * 0.25) * 0.25 * k * 0.12, 0.31 + k * 0.6, 0]);
  return parts;
});
const frondG = () => cached('frond', () => {
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
  const R0 = {};
  const ground = groundGrid();
  const terrain = new Terrain({ size: SIZE, segs: SEGS, tile: Math.ceil(SEGS / 2), heightFn: ground.at, colorFn, splatFn, textures: { ...TX, rock: TX.cliff, cobble: TX.concrete } });
  R0.trapFixes = ground.fixed;
  group.add(terrain.mesh);
  physics.terrain.addPatch(terrain, ox, oz);
  const H = (x, z) => terrain.heightAt(x, z);

  const R = {
    ...R0, id: 'desert', outdoor: true, group, lights: [], exits: [], searches: [], ballTargets: [], updaters,
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
    // (WORLD-80: registered, so tools/worldscore.mjs can match the original's village houses to ours; the door's sill
    //  is 0.3 m under the ground, as the house stands 0.3 m into the sand)
    fitAdd({ region: 'desert', name: 'house kesh' + i, x: ox + hd.x, z: oz + hd.z, ry: hd.ry, oy: gy, w: hd.w, d: hd.d, base: 0, plinth: 0.35, floor: 0.3, steps: 0.6, openings: [{ side: 'front', kind: 'door', x0: -0.15, x1: 1.35, y0: 0, y1: 2.6 }] });
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
    const trunkG = palmTrunkG(), frond = frondG();
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
      // (PERF-CALLS: the crown's 8 fronds in one mesh in the crown's space — they only ever move with the crown (its sway
      //  below): 8 draws → 1 per palm, the same triangles where they were; the crown is a moving part (keep))
      const fl = [];
      for (let k = 0; k < 8; k++) fl.push([frond, new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, k / 8 * Math.PI * 2 + rr() * 0.3, 0.15))]);
      const f = new THREE.Mesh(mergeGeos(fl, false), leafMat); f.castShadow = true; crown.add(f); crown.userData.keep = true;
      palms.push({ g, crown, leafMat, ph: rr() * 6 });
      // (ADV-2: the one palm in front of the pump's gearbox is left out, so the ball and the eye reach the gears from
      // the village side; its random draws still happen, so everything placed after it stays where it was)
      if (px < PUMP.x - 1.5 && px > PUMP.x - 7 && Math.abs(pz - PUMP.z) < 2.6) { g.visible = false; continue; }
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
    const tk = PUMP_TANK;   // (south-east of the tower: out of the line from the village side to the gearbox)
    for (const [dx, dz] of [[-0.9, -0.9], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.9]]) PB.add(cyl(0.1, 0.1, 3.4, 6, 0), darkWood, tk.x + dx, pumpGy + 1.7, tk.z + dz);
    PB.add(cyl(1.25, 1.25, 1.8, 18, 1.5, false), tm('planks', { color: '#b88a5a' }), tk.x, pumpGy + 4.3, tk.z);
    for (const y of [3.6, 5.0]) PB.add(new THREE.TorusGeometry(1.27, 0.04, 6, 24).rotateX(Math.PI / 2), iron, tk.x, pumpGy + y, tk.z);
    // (down to a joint at hand height on the flat east of the oasis basin, then into the basin: PIPE_J, ADV-2)
    PB.add(tube([[tk.x - 0.6, pumpGy + 3.5, tk.z - 0.6], [PIPE_J.x, H(PIPE_J.x, PIPE_J.z) + 0.9, PIPE_J.z], [OASIS.x + 5, oasisY + 0.6, OASIS.z + 4]], 0.09, 6, 1), iron, 0, 0, 0);
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
    // three gears in the tower's gearbox (ADV-2). Since the test bore's tremors began, sand has packed into
    // one of them (PUMP_JAM): at each gust the wheel tugs at the train; the two sound gears rock a little and clack,
    // the jammed one stays put, shudders and spits sand (story/dig.js adds the sand, sparks and sounds: R.pump.onGust).
    // Close up, sand is caked in its teeth. The ball knocks it loose; a sound gear struck only rings and swings back.
    const gearG = cached('gear', () => {
      const s = new THREE.Shape();
      for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 0.42 : 0.5; s.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      const hole = new THREE.Path(); hole.absarc(0, 0, 0.12, 0, Math.PI * 2, true); s.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false }); g.translate(0, 0, -0.06); return g;
    });
    const gearM = pm('#b88a3a', 0.4, { metalness: 0.7 });
    // sand packed into the lower teeth of the jammed gear (an arc of lumps on its rim)
    const cakeG = cached('gearSand', () => new THREE.TorusGeometry(0.46, 0.085, 5, 14, Math.PI * 0.8).rotateZ(Math.PI * 1.1));
    // a gearbox across the tower's west face, facing the way Kesh comes (and the play camera looks) from: three gears
    // in a row on a beam at the height a thrown ball reaches (~2 m by the tower; the first version's 3.6 and 5 m gears
    // were out of its reach), 1.35 m apart so the ball's aim, which goes by direction, picks each one
    B.add(bbox(0.14, 0.16, 3.6, 0.02, 1), rust, PUMP.x - 1.6, pumpGy + GEAR_Y, PUMP.z);
    for (const i of [0, 1, 2]) {
      const jam = i === PUMP_JAM, dir = i % 2 ? -1 : 1;
      const gx = PUMP.x - 1.75, gy = pumpGy + GEAR_Y, gz = PUMP.z + 1.35 * (i - 1);
      const m = mesh(group, gearG, gearM, gx, gy, gz, -Math.PI / 2); m.scale.setScalar(GEAR_S);
      const rustSpot = mesh(group, cached('rustdisc', () => new THREE.CircleGeometry(0.22, 12)), pm('#a85a2a', 0.9), gx - 0.07 * GEAR_S, gy, gz, -Math.PI / 2, { cast: false });
      rustSpot.scale.setScalar(GEAR_S);
      const cake = jam ? mesh(group, cakeG, pm('#d2b07a', 1), gx - 0.02, gy, gz, -Math.PI / 2, { cast: false }) : null;
      cake?.scale.setScalar(GEAR_S);
      const G = {
        x: ox + gx, y: gy, z: oz + gz, nx: -1, nz: 0, i, jam, mesh: m, turning: false, ring: 0,   // (n: the way its face looks)
        setTurning(b) { this.turning = !!b; rustSpot.visible = !b; if (cake) cake.visible = !b; },
        // struck by the ball while the train is held: a sound gear rings and swings back
        kick() { this.ring = 1; },
      };
      updaters.push((dt, t) => {
        const P = R.pump;
        if (G.turning) { m.rotation.z += dt * dir * 2.2 * (P.running ? 1.6 : 1); m.position.set(gx, gy, gz); return; }
        G.ring = Math.max(0, G.ring - dt * 0.7);
        const s = P.strain;
        if (jam) {   // held fast: it shudders against its seat and does not turn
          const j = 0.04 * s;
          m.position.set(gx, gy + Math.sin(t * 47) * j, gz + Math.sin(t * 61) * j);
          m.rotation.z = Math.sin(t * 53) * 0.03 * s;
          if (cake) cake.position.set(m.position.x - 0.02, m.position.y, m.position.z);
        } else m.rotation.z = dir * (0.28 * s + Math.sin(t * 9) * 0.5 * G.ring * G.ring);
      });
      gears.push(G);
      // the jammed gear is the pump's `gear` target; the sound ones `gearOk` (they ring, nothing more)
      R.ballTargets.push(jam ? { x: G.x, y: G.y, z: G.z, r: 0.7, gear: i } : { x: G.x, y: G.y, z: G.z, r: 0.7, gearOk: i });
    }
  }
  // the pipe from the tank to the pond: the tremors shook its low joint apart. Once the gear is free the pump lifts
  // water and it sprays out there, short of the pond; pushing the collar home sends it on (story/dig.js)
  const joint = (() => {
    const tk = PUMP_TANK;
    const jp = new THREE.Vector3(PIPE_J.x, H(PIPE_J.x, PIPE_J.z) + 0.9, PIPE_J.z);
    const tan = new THREE.Vector3(OASIS.x + 5 - (tk.x - 0.6), oasisY + 0.6 - (pumpGy + 3.5), OASIS.z + 4 - (tk.z - 0.6)).normalize();
    const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
    const collar = new THREE.Group(); collar.position.copy(jp); group.add(collar);
    mesh(collar, cyl(0.15, 0.15, 0.36, 10, 0), pm('#9a6a3a', 0.45, { metalness: 0.6 }), 0, 0, 0, 0);
    for (const y of [0.17, -0.17]) mesh(collar, cyl(0.17, 0.17, 0.05, 10, 0), iron, 0, y, 0, 0);
    const qHome = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
    const qLoose = new THREE.Quaternion().setFromAxisAngle(side, 0.32).multiply(qHome);
    // the spray: droplets thrown out sideways and up, and a dark wet patch on the sand under it
    const N = 60, sp = new Float32Array(N * 3), sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const spray = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#d8f2ff', size: 0.13, transparent: true, opacity: 0.9, depthWrite: false }));
    spray.frustumCulled = false; spray.visible = false; group.add(spray);
    const wet = mesh(group, cached('wetdisc', () => new THREE.CircleGeometry(1.1, 16)), pm('#9a7448', 1, { transparent: true, opacity: 0.7 }), jp.x + side.x * 1.2, H(jp.x + side.x * 1.2, jp.z + side.z * 1.2) + 0.03, jp.z + side.z * 1.2, 0, { cast: false, rx: -Math.PI / 2 });
    wet.visible = false;
    const jr = rng(4747);   // (its own sequence: rr's draws place the scenery after this)
    const drops = Array.from({ length: N }, (_, k) => ({ ph: k / N, a: (jr() - 0.5) * 0.9, v: 2.2 + jr() * 1.4 }));
    updaters.push((dt, t) => {
      if (!spray.visible) return;
      drops.forEach((d, k) => {
        const u = (t * 1.3 + d.ph) % 1, tt = u * 0.75, c = Math.cos(d.a), s = Math.sin(d.a);
        const hx = side.x * c - side.z * s, hz = side.z * c + side.x * s;   // (the side direction turned by d.a)
        sp[k * 3] = jp.x + hx * d.v * tt; sp[k * 3 + 1] = jp.y + 0.15 + 2.4 * tt - 4.9 * tt * tt; sp[k * 3 + 2] = jp.z + hz * d.v * tt;
      });
      sg.attributes.position.needsUpdate = true;
    });
    const J = {
      ...W(jp.x, jp.z), y: jp.y, loose: true, spraying: false,
      setLoose(b) { this.loose = !!b; collar.quaternion.copy(b ? qLoose : qHome); collar.position.copy(jp).addScaledVector(tan, b ? 0.14 : 0); },
      setSpray(b) { this.spraying = !!b; spray.visible = !!b; wet.visible = !!b; },
    };
    J.setLoose(true);
    return J;
  })();
  // the pump's state: 'jammed' (the wheel tugs at each gust and stops) → 'leak' (the train turns, the water sprays at
  // the joint) → 'running' (water into the pond)
  const GUST = 3.4;   // seconds from one gust to the next
  R.pump = {
    ...W(PUMP.x, PUMP.z), gears, jam: PUMP_JAM, joint, running: false, state: 'jammed', strain: 0, gustT: 0, onGust: null, _cyc: 0,
    setState(s) {
      this.state = s; this.running = s === 'running';
      for (const G of gears) G.setTurning(s !== 'jammed');
      for (const t of R.ballTargets) if (t.gear != null || t.gearOk != null) t.done = s !== 'jammed';   // (no more aim at a turning train)
      joint.setLoose(s !== 'running'); joint.setSpray(s === 'leak');
    },
    setRunning(b) { this.setState(b ? 'running' : 'jammed'); },   // (older callers)
    gustNow() { this.gustT = (Math.floor(this.gustT / GUST) + 1) * GUST - 0.02; },   // (the next gust at once: after he listens)
  };
  updaters.push((dt) => {
    const P = R.pump;
    if (P.state !== 'jammed') { P.strain = 0; wheel.rotation.z += dt * (P.running ? 2.4 : 2.0); return; }
    P.gustT += dt;
    const u = P.gustT % GUST, cyc = Math.floor(P.gustT / GUST);
    P.strain = u < 0.9 ? Math.sin(Math.PI * u / 0.9) : 0;
    if (u > 0.3 && P._cyc !== cyc) { P._cyc = cyc; P.onGust?.(); }
    // the wheel swings round with the gust and is pulled back by the held train
    wheel.rotation.z = (P.wheelRest ??= wheel.rotation.z) + 0.3 * P.strain;
  });

  // ================================================================ mesas: rock rubble at their feet
  {
    const rocks = [];
    for (const m of MESAS) for (let i = 0; i < 18; i++) {
      const a = rr() * Math.PI * 2, q = 1.05 + rr() * 0.25;
      const x = m.x + Math.cos(a) * m.rx * q, z = m.z + Math.sin(a) * m.rz * q;
      if (m.gone || coastDist(x, z) < 4) continue;
      rocks.push({ x, y: H(x, z) - 0.15, z, ry: rr() * 6, s: 0.5 + rr() * 1.1 });
    }
    for (let i = 0; i < 70; i++) {
      const x = (rr() - 0.5) * 170, z = (rr() - 0.5) * 170;
      if (coastDist(x, z) < 6 || trackDist(x, z) < 5 || inPost(x, z, 4) || Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < VILLAGE.r + 3 || Math.hypot(x - DIG.x, z - DIG.z) < DIG.r + 3) continue;
      rocks.push({ x, y: H(x, z) - 0.1, z, ry: rr() * 6, s: 0.25 + rr() * 0.5 });
    }
    // the original's land beyond the old island's (WORLD-SHAPE): its own draws, so the stream above is untouched
    const r2 = rng(4243), wide = () => (r2() - 0.5) * 280;
    for (let i = 0; i < 170; i++) {
      const x = wide(), z = wide(), ry = r2() * 6, sz = r2();
      if (Math.hypot(x, z) < 80 || coastDist(x, z) < 6 || trackDist(x, z) < 5 || keepNear(x, z) < 2) continue;
      rocks.push({ x, y: H(x, z) - 0.1, z, ry, s: sz < 0.15 ? 0.7 + sz * 4 : 0.25 + sz * 0.5 });
    }
    // the old places' rocks (WORLD-80 step 3, desertold.js): the boulders at the School's rock wall and a few by the houses
    for (const [x, z, s, ry] of OLD_ROCKS) rocks.push({ x, y: H(x, z) - 0.15 * s, z, ry, s });
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
      if (coastDist(x, z) < 5 || trackDist(x, z) < 2.5 || inPost(x, z, 2) || Math.hypot(x - DIG.x, z - DIG.z) < DIG.r + 1) continue;
      const h = H(x, z); if (h > BASE + 4) continue;
      const it = { x, y: h + 0.1, z, ry: rr() * 6, s: 0.5 + rr() * 0.8, color: rr() < 0.5 ? '#9a8a4a' : '#7a7a3a' };
      if (!keshClear(x, z)) list.push(it);
    }
    const r3 = rng(4244), wide = () => (r3() - 0.5) * 280;
    for (let i = 0; i < 520; i++) {
      const x = wide(), z = wide(), ry = r3() * 6, sz = r3(), c = r3();
      if (Math.hypot(x, z) < 82 || coastDist(x, z) < 5 || trackDist(x, z) < 2.5 || keepNear(x, z) < 0) continue;
      const h = H(x, z); if (h > BASE + 4) continue;
      list.push({ x, y: h + 0.1, z, ry, s: 0.5 + sz * 0.8, color: c < 0.5 ? '#9a8a4a' : '#7a7a3a' });
    }
    instances(group, shrubG, pm('#ffffff', 0.95, { flatShading: true }), list, { cast: true });
    const cactM = pm('#5a8a4a', 0.75);
    const CB = new Batch(group);
    for (let i = 0; i < 26; i++) {
      const x = (rr() - 0.5) * 160, z = (rr() - 0.5) * 160;
      if (coastDist(x, z) < 8 || trackDist(x, z) < 3 || inPost(x, z, 3) || Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < VILLAGE.r || Math.hypot(x - DIG.x, z - DIG.z) < DIG.r + 2) continue;
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
    // and a few on the original's land beyond the old island's
    const r4 = rng(4245);
    for (let i = 0; i < 60; i++) {
      const x = (r4() - 0.5) * 280, z = (r4() - 0.5) * 280, h = 1.6 + r4() * 1.6, arms = [r4(), r4(), r4(), r4()];
      if (Math.hypot(x, z) < 78 || coastDist(x, z) < 8 || trackDist(x, z) < 3 || keepNear(x, z) < 0) continue;
      const y = H(x, z); if (y > BASE + 4 || terrain.slopeAt(x, z) > 0.5) continue;
      CB.add(cyl(0.2, 0.24, h, 8, 0), cactM, x, y + h / 2, z);
      CB.add(new THREE.SphereGeometry(0.2, 8, 6), cactM, x, y + h, z);
      [-1, 1].forEach((sd, k) => { if (arms[k * 2] < 0.7) { const ay = y + h * (0.4 + arms[k * 2 + 1] * 0.25); CB.add(cyl(0.13, 0.13, 0.5, 7, 0), cactM, x + sd * 0.4, ay, z, 0, 0, Math.PI / 2); CB.add(cyl(0.13, 0.13, 0.7, 7, 0), cactM, x + sd * 0.62, ay + 0.35, z); } });
      col({ type: 'cyl', x, z, r: 0.35, top: y + h, seeThrough: true });
    }
    CB.build();
  }

  // ================================================================ Ilka's camp (POLISH-AUDIT #15: desertdress.js)
  dressCamp({ group, H, col, ox, oz, updaters }, CAMP);
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
    // (PERF-CALLS: the chain-link panels in one mesh — 36 see-through two-sided panels were 72 draws a frame; they never
    //  move (the gate's two leaves, which slide, stay on their own). Same material, same place, no shadow as before)
    const FB = new Batch(group, { cast: false, receive: false });
    const fence = (ax, az, bx, bz, gap) => {
      const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 3);
      for (let i = 0; i <= n; i++) { const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; PB.add(bbox(0.16, fH + 0.3, 0.16, 0.02, 1), concrete, x, postY + (fH + 0.3) / 2, z); }
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n, mx = ax + (bx - ax) * (t0 + t1) / 2, mz = az + (bz - az) * (t0 + t1) / 2;
        if (gap && Math.abs(mz - gap[1]) < 2.2 && Math.abs(mx - gap[0]) < 2.2) continue;
        fenceMat.map.repeat.set(L / n / 0.5, fH / 0.5);
        FB.add(new THREE.PlaneGeometry(L / n, fH), fenceMat, mx, postY + fH / 2 + 0.1, mz, 0, -Math.atan2(bz - az, bx - ax));
        col({ type: 'box', x: mx, z: mz, hw: L / n / 2, hd: 0.08, rot: -Math.atan2(bz - az, bx - ax), top: postY + fH, noStand: true, seeThrough: true });
      }
    };
    fence(POST.x0, POST.z0, POST.x1, POST.z0);
    fence(POST.x1, POST.z0, POST.x1, POST.z1);
    fence(POST.x1, POST.z1, POST.x0, POST.z1);
    fence(POST.x0, POST.z1, POST.x0, POST.z0, [POST.x0, POST.gateZ]);
    FB.build();
    // the gate: two leaves that slide aside
    for (const s of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(2.0, fH), fenceMat);
      leaf.position.set(POST.x0, postY + fH / 2 + 0.1, POST.gateZ + s * 1.0); leaf.rotation.y = Math.PI / 2; group.add(leaf);
      gateParts.push({ leaf, s, c: col({ type: 'box', x: POST.x0, z: POST.gateZ + s * 1.0, hw: 0.08, hd: 1.0, top: postY + fH, noStand: true, seeThrough: true }) });
    }
    // cabins: teal prefab units with the project emblem
    const cabins = [{ x: 34, z: -30, w: 7, d: 3.4, office: true }, { x: 50, z: -30, w: 6, d: 3.2 }, { x: 52, z: -13, w: 5, d: 3.2, ry: Math.PI }];
    for (const [ci, cb] of cabins.entries()) {
      // (WORLD-80: registered for tools/worldscore.mjs; the east cabin is named for the original's house at S10 / S127, 13 m off)
      fitAdd({ region: 'desert', name: 'post cabin ' + ci, x: ox + cb.x, z: oz + cb.z, ry: cb.ry || 0, oy: postY, w: cb.w, d: cb.d, base: 0.15, plinth: 0.2, floor: 0.15, steps: 0.6, openings: [{ side: 'front', kind: 'door', x0: cb.w / 2 - 1.4, x1: cb.w / 2 - 0.4, y0: 0.15, y1: 2.3 }] });
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
    const sg = new THREE.Mesh(emq(), new THREE.MeshStandardMaterial({ map: signTex('JOINT PROJECT · RESEARCH POST', '#2a5a6a', 640), roughness: 0.8, side: THREE.DoubleSide }));
    sg.scale.set(3.4, 0.9, 1); sg.position.set(POST.x0 - 0.1, postY + 3.3, POST.gateZ); sg.rotation.y = -Math.PI / 2; group.add(sg);
    dressPost({ group, H, col, ox, oz, updaters }, POST);   // (POLISH-AUDIT #15: awnings, a break corner, the equipment of the job)
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
    // the keypad on the post's outer face (ADV-2): nine keys, three of them (1, 4, 7: the left column) worn shiny; a
    // lamp over it flashes red for a wrong code and stays green once open (story/dig.js)
    const kpY = H(gx, gz) + 1.0, kpX = gx - 0.22, kpZ = gz - 2.2;
    DB.add(bbox(0.05, 0.36, 0.28, 0.01, 1), pm('#33302c', 0.6, { metalness: 0.4 }), kpX, kpY, kpZ);
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      DB.add(bbox(0.03, 0.06, 0.06, 0.008, 1), c === 0 ? pm('#e6dcc0', 0.25, { metalness: 0.8 }) : pm('#6a645c', 0.8), kpX - 0.035, kpY + 0.09 - r * 0.085, kpZ - 0.08 + c * 0.08);
    }
    const kpLampM = new THREE.MeshStandardMaterial({ color: '#402020', emissive: '#000000', roughness: 0.4 });
    mesh(group, cached('kpLamp', () => new THREE.SphereGeometry(0.035, 8, 6)), kpLampM, kpX - 0.03, kpY + 0.22, kpZ, 0, { cast: false });
    let kpFlash = 0;
    updaters.push((dt) => { if (kpFlash > 0) { kpFlash -= dt; if (kpFlash <= 0) kpLampM.emissive.set(digGate.open ? '#30ff60' : '#000000'); } });
    digGate.lamp = (ok) => { kpLampM.emissive.set(ok ? '#30ff60' : '#ff2a1a'); kpFlash = ok ? 0 : 1.2; if (ok) digGate.open = true; };
    R.digKeypad = { ...W(kpX - 0.4, kpZ), y: kpY };
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
    // the Temple of Bù's gate (Temple-Park, under Bald Mountain), POLISH-AUDIT #5: a free-standing pale sandstone
    // pylon. Local +z faces the pit's middle (the carved lintel, the stone door the three seals hold shut, the way in);
    // local -z is the outer face, the one the play camera sees from the rim: a big sun medallion with the five vents of
    // the carving in relief (the three warm ones light as their discs open), pilasters with inlays, lamps, a stepped
    // crest. Everything is merged geometry in a handful of materials; the glow is emissive, so there is no light to
    // add and no program to compile after loading. The door sinks into its groove on reveal() with a burst of warm
    // light and dust (src/game/story/dig.js calls it; its positions are untouched).
    const BU = cached('buVC', () => new THREE.MeshStandardMaterial({ map: buStoneTex(), color: '#ffffff', vertexColors: true, roughness: 0.92, emissive: '#4a3418', emissiveIntensity: 0.32 }));
    const buBatch = (parent) => { const b0 = new Batch(parent), b = { add(geo, m, ...a) { if (typeof m === 'string') b0.add(tinted(geo, m), BU, ...a); else b0.add(geo, m, ...a); return b; }, build: () => b0.build() }; return b; };
    const stL = '#fff8ea', stM = '#ecd0a4', stD = '#c29c70', terra = '#b9583c', recessM = pm('#1c120d', 1);
    const glowMat = (c, e, i) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, emissive: e, emissiveIntensity: i });
    const trimM = glowMat('#ffe2b0', '#ff9a3a', 0.55), lampM = glowMat('#ffd9a0', '#ff9a30', 1.15), innerM = new THREE.MeshStandardMaterial({ color: '#000000', roughness: 1, emissive: '#ffffff', emissiveMap: passageTex(), emissiveIntensity: 0 });
    const ventM = [0, 1, 2].map(() => glowMat('#ffe2b0', '#ff9a3a', 0.12));
    const FB = buBatch(face);
    const HP = Math.PI / 2;
    // the body: plinth, wall, terracotta band, cornice and a stepped crest with a small sun on both faces
    FB.add(bbox(6.8, 0.35, 1.4, 0.05, 1.8), stM, 0, 0.175, -0.3);
    FB.add(bbox(6.2, 3.05, 0.95, 0.05, 1.8), stL, 0, 1.875, -0.325);
    FB.add(bbox(6.3, 0.28, 1.0, 0.03, 1.8), terra, 0, 3.2, -0.325);
    FB.add(bbox(6.7, 0.28, 1.4, 0.04, 1.8), stM, 0, 3.54, -0.3);
    FB.add(bbox(2.6, 0.3, 0.9, 0.04, 1.8), stL, 0, 3.83, -0.3);
    // the outer face (toward the camera): the medallion in layers, the five vents, pilasters with lit inlays
    FB.add(cyl(1.12, 1.12, 0.1, 28, 1.8), stM, 0, 1.75, -0.85, HP, 0, 0);
    FB.add(cyl(0.96, 0.96, 0.08, 28, 1.8), stD, 0, 1.75, -0.9, HP, 0, 0);
    FB.add(new THREE.TorusGeometry(0.82, 0.045, 5, 36), trimM, 0, 1.75, -0.955);
    FB.add(cyl(0.7, 0.7, 0.1, 28, 1.8), stL, 0, 1.75, -0.97, HP, 0, 0);
    FB.add(cyl(0.28, 0.34, 0.16, 16, 1.8), stM, 0, 1.75, -1.04, HP, 0, 0);
    for (let k = 0; k < 5; k++) {
      const a = HP + (k - 2) * 0.5, ex = Math.cos(a) * 1.42, ey = 1.75 + Math.sin(a) * 1.42;
      FB.add(bbox(0.16, 0.5, 0.1, 0.02, 1), k % 2 ? stD : ventM[k / 2], ex, ey, -0.86, 0, 0, a - HP);
    }
    for (const s of [-1, 1]) {
      FB.add(bbox(0.5, 2.75, 0.16, 0.03, 1.8), stM, s * 2.5, 1.75, -0.88);
      FB.add(bbox(0.07, 2.3, 0.04, 0.01, 1), trimM, s * 2.5, 1.75, -0.97);
      FB.add(bbox(0.5, 2.75, 0.16, 0.03, 1.8), stM, s * 2.5, 1.75, 0.23);
    }
    // the inner face (toward the pit): jambs, a carved header, the dark passage behind the door, lamps on pedestals
    for (const s of [-1, 1]) FB.add(bbox(0.6, 2.25, 0.26, 0.04, 1.8), stM, s * 1.5, 1.475, 0.28);
    FB.add(bbox(4.0, 0.8, 0.26, 0.04, 1.8), stL, 0, 3.0, 0.28);
    FB.add(bbox(3.5, 0.07, 0.05, 0.01, 1), stD, 0, 3.43, 0.4);
    FB.add(bbox(3.5, 0.07, 0.05, 0.01, 1), stD, 0, 2.57, 0.4);
    FB.add(bbox(2.4, 2.25, 0.06, 0.01, 1), recessM, 0, 1.475, 0.2);
    FB.add(bbox(2.2, 2.1, 0.02, 0.005, 1), innerM, 0, 1.45, 0.235);
    for (const [lx, lz, s] of [[-3.65, -0.7, -1], [3.65, -0.7, 1], [-2.6, 0.22, -1], [2.6, 0.22, 1]]) {
      FB.add(bbox(0.34, 1.35, 0.34, 0.04, 1.8), stM, lx, 0.675, lz);
      FB.add(bbox(0.42, 0.1, 0.42, 0.02, 1.8), stL, lx, 1.4, lz);
      FB.add(bbox(0.28, 0.42, 0.28, 0.04, 1), lampM, lx, 1.66, lz);
      FB.add(cyl(0.02, 0.26, 0.22, 4, 0), stD, lx, 2.0, lz, 0, Math.PI / 4, 0);
    }
    FB.build();
    // the stone door, until the seals open: its own group, so it can sink into the floor
    const doorG = new THREE.Group(); face.add(doorG);
    {
      const DG = buBatch(doorG);
      DG.add(bbox(2.3, 2.22, 0.2, 0.03, 1.8), stM, 0, 1.46, 0.31);
      DG.add(cyl(0.72, 0.72, 0.07, 26, 1.8), stL, 0, 1.5, 0.42, HP, 0, 0);
      DG.add(cyl(0.5, 0.5, 0.09, 22, 1.8), stD, 0, 1.5, 0.43, HP, 0, 0);
      DG.add(cyl(0.18, 0.22, 0.12, 14, 1.8), stL, 0, 1.5, 0.46, HP, 0, 0);
      for (const y of [0.72, 2.28]) DG.add(bbox(2.3, 0.12, 0.06, 0.015, 1.8), stD, 0, y, 0.43);
      DG.build();
    }
    const carv = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshStandardMaterial({ map: carvingTex(), roughness: 0.95 }));
    carv.position.set(0, 3.0, 0.415); face.add(carv);
    col({ type: 'box', x: cxw + Math.cos(wallA) * 0.3, z: czw + Math.sin(wallA) * 0.3, hw: 3.1, hd: 0.7, rot: wallA + Math.PI / 2, top: bottomY + 3.6, noStand: true });
    // reveal(): the door sinks, the passage and the sun ring light, a plume of dust and warm light rises (the room's
    // updaters get the particle system as their third argument). Called while the room has not yet run (a save
    // restored with the seals open) it jumps to the end without the show.
    let roomT = 0, rvT = -1, revealed = false, rvBurst = false, breathAcc = 0;
    const warmOpen = [false, false, false];
    const ease = (u) => u * u * (3 - 2 * u);
    const setReveal = (k) => {
      doorG.position.y = -2.6 * k;
      innerM.emissiveIntensity = 1.5 * k;
      trimM.emissiveIntensity = 0.55 + 1.1 * k;
      for (let i = 0; i < 3; i++) ventM[i].emissiveIntensity = Math.max(warmOpen[i] ? 1.3 : 0.12, 1.3 * k);
    };
    const doorSpot = new THREE.Vector3();
    updaters.push((dt, t, fx) => {
      roomT += dt;
      if (!fx) return;
      if (rvT < 0) {
        if (!revealed) return;
        // afterwards: a little warm air still breathes out of the open passage
        breathAcc += dt * 3;
        while (breathAcc >= 1) { breathAcc -= 1; face.localToWorld(doorSpot.set((Math.random() - 0.5) * 1.6, 0.4, 0.55)); fx.spawn({ x: doorSpot.x, y: doorSpot.y, z: doorSpot.z, vy: 0.5, vx: (Math.random() - 0.5) * 0.2, color: '#ffd9a0', a: 0.28, s0: 0.3, s1: 1.1, life: 2.2, add: 0.7, cell: 0, fi: 0.2, fo: 0.5, drift: 0.2 }); }
        return;
      }
      rvT += dt;
      const k = Math.min(1, rvT / 1.8);
      setReveal(ease(k));
      trimM.emissiveIntensity += 1.4 * Math.max(0, 1 - Math.abs(rvT - 1.2) / 0.6);   // a flash as the door clears
      if (!rvBurst) {
        rvBurst = true;
        face.localToWorld(doorSpot.set(0, 0.3, 0.7)); fx.burst(doorSpot.x, doorSpot.y, doorSpot.z, '#e8cfa0', 26, 1.1);
        fx.spawn({ x: doorSpot.x, y: doorSpot.y + 1.2, z: doorSpot.z, color: '#ffd490', a: 0.6, s0: 1.5, s1: 7, life: 1.4, add: 1, cell: 0, fi: 0.08, fo: 0.5, spin: 0 });
      }
      if (rvT < 2.6) {
        breathAcc += dt * 26;
        while (breathAcc >= 1) {
          breathAcc -= 1;
          face.localToWorld(doorSpot.set((Math.random() - 0.5) * 2.4, 0.2 + Math.random() * 0.5, 0.5 + Math.random() * 0.7));
          fx.spawn({ x: doorSpot.x, y: doorSpot.y, z: doorSpot.z, vx: (Math.random() - 0.5) * 0.5, vy: 1.4 + Math.random() * 1.2, vz: (Math.random() - 0.5) * 0.5, color: Math.random() < 0.5 ? '#e8cfa0' : '#ffd9a0', a: 0.5, s0: 0.4, s1: 1.8, life: 1.8 + Math.random() * 0.8, add: Math.random() < 0.5 ? 0.05 : 0.8, cell: Math.random() < 0.5 ? 1 : 0, drag: 0.4, grav: -0.2, drift: 0.4 });
        }
      } else if (rvT > 4) { rvT = -1; revealed = true; setReveal(1); }
    });
    // Five discs on pillars, like the five vents carved over the door. Bù's builders tied the door to the planet's
    // breath: only a disc with live heat behind it slides. Three are warm (pale crystals crust them and dust rises
    // off them: crystals grow where heat leaks, as Ilka says); two are cold and bare, their vents already closing.
    // Warm ones are ball targets with `seal` 0–2 (old saves' c4_seal0–2), cold ones carry `cold` 0–1 (story/dig.js).
    const sealM = tm('fortStone', { color: '#d8b090' });
    const cryM = pm('#cfefff', 0.15, { emissive: '#3aa8d8', emissiveIntensity: 0.9, flatShading: true });
    const cryG = cached('digCry', () => new THREE.OctahedronGeometry(1, 0).scale(0.45, 1, 0.45));
    // a crust of crystals around (x,y,z) (one batch for all) and dust motes drifting up out of it (one point cloud)
    const CB = new Batch(group, { cast: false }), motes = [];
    const breath = (x, y, z, n, s, seed, big = 1) => {
      const r = rng(seed);
      for (let i = 0; i < n; i++) { const k = (0.09 + r() * 0.12) * big; CB.add(cryG, cryM, x + (r() - 0.5) * s, y + (r() - 0.3) * s * 0.4, z + (r() - 0.5) * s, (r() - 0.5) * 0.9, r() * 3, (r() - 0.5) * 0.9, k, k, k); }
      for (let i = 0; i < 6; i++) motes.push({ x, y, z, ph: i / 6 + r() * 0.1, dx: (r() - 0.5) * s, dz: (r() - 0.5) * s });
    };
    const SLOTS = [['seal', 0], ['cold', 0], ['seal', 1], ['cold', 1], ['seal', 2]];   // left to right, as the carving's vents
    const cold = [];
    SLOTS.forEach(([kind, idx], k) => {
      const a = wallA + Math.PI + (k - 2) * 0.62;
      const sx = DIG.x + Math.cos(a) * 3.6, sz = DIG.z + Math.sin(a) * 3.6;
      const disc = mesh(group, cached('seal', () => cyl(0.55, 0.55, 0.2, 18, 0)), sealM, sx, bottomY + 1.6, sz, 0);
      disc.lookAt(DIG.x, bottomY + 1.6, DIG.z); disc.rotateX(Math.PI / 2);
      const glow = mesh(group, cached('sealGlow', () => new THREE.CircleGeometry(0.32, 16)), pm('#ffd890', 0.4, { emissive: '#ffb040', emissiveIntensity: 0 }).clone(), sx, bottomY + 1.6, sz, 0, { cast: false });
      glow.lookAt(DIG.x, bottomY + 1.6, DIG.z); glow.translateZ(0.12);
      const px = sx + Math.cos(a) * 0.55, pz = sz + Math.sin(a) * 0.55;
      DB.add(bbox(0.9, 3.0, 0.9, 0.08, 1.5), tm('fortStone', { color: kind === 'seal' ? '#b88a68' : '#9a8676' }), px, bottomY + 1.1, pz);
      col({ type: 'cyl', x: px, z: pz, r: 0.6, top: bottomY + 2.6, noStand: true });
      const S = { x: ox + sx, y: bottomY + 1.6, z: oz + sz, slot: k, on: false, setOn(b) { this.on = !!b; glow.material.emissiveIntensity = b ? 2.2 : 0; if (kind === 'seal') { warmOpen[idx] = !!b; ventM[idx].emissiveIntensity = b || revealed ? 1.3 : 0.12; } } };
      if (kind === 'seal') {
        breath(px, bottomY + 2.62, pz, 7, 0.7, 300 + k);                                                        // on the pillar's top
        breath(sx - Math.cos(a) * 0.12, bottomY + 2.1, sz - Math.sin(a) * 0.12, 4, 0.5, 320 + k);                // round the disc's rim
        seals[idx] = S;
        R.ballTargets.push({ x: S.x, y: S.y, z: S.z, r: 0.8, seal: idx });
      } else {
        cold[idx] = S;
        R.ballTargets.push({ x: S.x, y: S.y, z: S.z, r: 0.7, cold: idx });
      }
    });
    // a crack beside the last ramp, crusted with the same crystals and breathing warm air: the rule shown safely
    // before the discs ask for it (story/dig.js: Twinsen remarks on it on his way down)
    // (on the side of the ramp he comes down from: the way round from the gate reaches it from lower angles)
    const crA = DIG_RAMPS[2] - 0.5, crR = DIG.r - 8 - 0.6;
    const crx = DIG.x + Math.cos(crA) * crR, crz = DIG.z + Math.sin(crA) * crR;
    DB.add(bbox(0.22, 1.6, 0.7, 0.02, 1), pm('#2a1c14', 1), DIG.x + Math.cos(crA) * (crR + 0.12), bottomY + 0.8, DIG.z + Math.sin(crA) * (crR + 0.12), 0, -crA, 0);
    breath(crx, bottomY + 0.2, crz, 10, 0.9, 340, 2.0);
    breath(crx, bottomY + 0.95, crz, 6, 0.55, 341, 1.4);
    CB.build();
    {
      const mp = new Float32Array(motes.length * 3), mg = new THREE.BufferGeometry();
      mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
      const pts = new THREE.Points(mg, new THREE.PointsMaterial({ color: '#fff0d0', size: 0.07, transparent: true, opacity: 0.8, depthWrite: false }));
      pts.frustumCulled = false; group.add(pts);
      updaters.push((dt, t) => {
        motes.forEach((p, i) => { const u = (t * 0.35 + p.ph) % 1; mp[i * 3] = p.x + p.dx * (1 + u); mp[i * 3 + 1] = p.y + 0.1 + u * 1.6; mp[i * 3 + 2] = p.z + p.dz * (1 + u); });
        mg.attributes.position.needsUpdate = true;
      });
    }
    DB.build();
    R.dig = {
      ...W(DIG.x, DIG.z), bottomY, seals, cold, crack: { ...W(crx, crz), y: bottomY },
      gate: { ...R.digGateSpot, isOpen: false, open() { if (this.isOpen) return; this.isOpen = true; digGate[0].rotation.x = -1.4; digGate[0].position.y += 1.2; digGate[1].enabled = false; digGate.lamp(true); }, flash(ok) { digGate.lamp(ok); }, keypad: R.digKeypad },
      carvings: W(DIG.x + Math.cos(wallA) * 2.0, DIG.z + Math.sin(wallA) * 2.0),
      door: W(DIG.x + Math.cos(wallA) * 2.7, DIG.z + Math.sin(wallA) * 2.7),   // the temple's gate (enter here)
      reveal() {
        if (revealed || rvT >= 0) return;
        if (roomT < 0.3) { revealed = true; setReveal(1); return; }   // (a restored save: no show)
        rvT = 0; rvBurst = false;
      },
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
  // (FX-SOFT: the two plumes were hard white open cylinders: now soft puffs that rise from the pipes' tops, swell, wander
  //  and thin out, from the game's particle system, which the room's updaters get as their third argument)
  const plumes = [-1, 1].map((sx) => ({ sx, pl: new Plume({ rate: 11, rise: 2.5, h: 9.5, w0: 0.8, w1: 3.8, a: 0.6, add: 0.08, drift: 1.1 }) }));
  let plumeLevel = 0;
  updaters.push((dt, t, fx) => {
    if (plumeLevel <= 0 || !fx) return;
    const gy = H(RUINS.x, RUINS.z) + 2.4;
    for (const p of plumes) p.pl.tick(fx, dt, ox + RUINS.x + p.sx * 4.2, gy, oz + RUINS.z - 2.2, plumeLevel);
  });
  R.ruins = {
    ...W(RUINS.x, RUINS.z), door: W(RUINS.x, RUINS.z + 1.6), stand: W(RUINS.x, RUINS.z + 3.6),
    setDrift(b) { drift.visible = !!b; },
    setPlume(v) { plumeLevel = v; },
  };

  // ================================================================ Hesk's sand-yacht (POLISH-AUDIT #7)
  // A land-yacht: a planked hull with a coaming and a bench, a keel, an outrigger axle with two spoked wheels (rubber
  // tyres, brass hubs), a single steering wheel in a fork under the bow with a tiller, a tapering mast with a boom, a
  // double-sided cloth sail with some belly, stays, shrouds and a sheet, and a pennant. The hull sits where the old
  // plank did (deck 0.72 m up, where the rider stands), the wheels keep the old track, and the parts are merged into
  // five meshes plus the sail. Local +x is forward.
  const yacht = new THREE.Group();
  {
    const hullPts = () => {   // plan outline, x forward, (shape y = -z in the world)
      const s = new THREE.Shape();
      s.moveTo(1.3, 0);
      s.bezierCurveTo(1.05, 0.26, 0.5, 0.62, -0.1, 0.64);
      s.lineTo(-1.1, 0.6);
      s.quadraticCurveTo(-1.8, 0.52, -1.8, 0);
      s.quadraticCurveTo(-1.8, -0.52, -1.1, -0.6);
      s.lineTo(-0.1, -0.64);
      s.bezierCurveTo(0.5, -0.62, 1.05, -0.26, 1.3, 0);
      return s;
    };
    const hullG = cached('yHull', () => {   // the planked body, 0.38 .. 0.72 m
      const g = new THREE.ExtrudeGeometry(hullPts(), { depth: 0.34, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 10 });
      g.rotateX(-Math.PI / 2); g.translate(0, 0.38, 0);
      return boxUV(g, 1.2);
    });
    const coamingG = cached('yCoaming', () => {   // the rim round the cockpit, 0.72 .. 0.92 m
      const s = hullPts(), pts = s.getPoints(36), hole = new THREE.Path();
      pts.forEach((p, i) => { const x = -0.2 + (p.x + 0.2) * 0.8, y = p.y * 0.62; if (i) hole.lineTo(x, y); else hole.moveTo(x, y); });
      s.holes.push(hole);
      const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 1, curveSegments: 10 });
      g.rotateX(-Math.PI / 2); g.translate(0, 0.72, 0);
      return boxUV(g, 1.2);
    });
    const tyreG = cached('yTyre', () => new THREE.TorusGeometry(0.25, 0.085, 8, 18));
    const tyre = '#2a2522', hub = '#c8a050', ropeM = '#d8c49a', iron = '#4a4440', darkWood = Wd('#6a4528');
    const YB = tintedBatch(yacht);
    YB.add(hullG, Wd('#f6dcae'), 0, 0, 0);
    YB.add(coamingG, Wd('#d4693c'), 0, 0, 0);   // (a painted rim: Hesk's orange)
    YB.add(bbox(3.4, 0.14, 0.16, 0.04, 1), darkWood, -0.15, 0.31, 0);                // the keel
    YB.add(bbox(0.2, 0.06, 0.9, 0.02, 1), darkWood, 1.12, 0.78, 0);                  // the foredeck beam
    // the bench and its backrest, behind the rider
    YB.add(bbox(0.5, 0.12, 0.95, 0.03, 1), Wd('#d8b080'), -1.0, 0.86, 0);
    YB.add(bbox(0.1, 0.46, 0.95, 0.03, 1), Wd('#d8b080'), -1.3, 1.1, 0, 0, 0, -0.12);
    // the rear axle: one beam through the hull, a brace to each wheel, a fork on each side of the wheel
    YB.add(bbox(0.14, 0.12, 3.15, 0.03, 1), darkWood, -0.9, 0.55, 0);
    for (const s of [-1, 1]) {
      rod(YB, [-0.9, 0.55, s * 0.6], [-1.15, 0.9, s * 0.62], 0.025, darkWood);
      rod(YB, [-0.9, 0.55, s * 1.5], [-0.5, 0.82, s * 0.62], 0.03, darkWood);
      for (const k of [-1, 1]) YB.add(bbox(0.05, 0.34, 0.04, 0.01, 1), iron, -0.9, 0.46, s * 1.5 + k * 0.14);
    }
    // the wheels: tyre, hub and three crossed spokes each; the front one sits in a fork on a bowsprit
    const wheel = (x, z) => {
      YB.add(tyreG, tyre, x, 0.335, z);
      YB.add(cyl(0.07, 0.07, 0.2, 10, 0), hub, x, 0.335, z, Math.PI / 2, 0, 0);
      for (let k = 0; k < 3; k++) YB.add(bbox(0.5, 0.03, 0.03, 0.005, 1), iron, x, 0.335, z, 0, 0, k * Math.PI / 3);
    };
    wheel(-0.9, 1.5); wheel(-0.9, -1.5); wheel(1.62, 0);
    YB.add(bbox(0.7, 0.1, 0.12, 0.02, 1), darkWood, 1.28, 0.7, 0);                  // the bowsprit
    for (const k of [-1, 1]) YB.add(bbox(0.05, 0.42, 0.04, 0.01, 1), iron, 1.62, 0.55, k * 0.14);
    YB.add(bbox(0.1, 0.05, 0.36, 0.01, 1), iron, 1.62, 0.76, 0);
    rod(YB, [1.5, 0.78, 0], [0.45, 1.0, 0], 0.025, darkWood);                          // the tiller, a pole back to the rider
    // the mast (tapering) with a masthead block, and the stays
    YB.add(cyl(0.035, 0.07, 4.4, 8, 0), darkWood, 0.35, 2.92, 0);
    YB.add(cyl(0.09, 0.09, 0.1, 8, 0), iron, 0.35, 5.12, 0);
    const MH = [0.35, 5.08, 0];
    rod(YB, MH, [1.28, 0.74, 0], 0.012, ropeM, 4);                                     // forestay to the bow
    rod(YB, MH, [-1.75, 0.82, 0], 0.012, ropeM, 4);                                    // backstay to the stern
    for (const s of [-1, 1]) { rod(YB, [0.35, 3.7, 0], [0.05, 0.9, s * 0.64], 0.012, ropeM, 4); rod(YB, [0.35, 3.7, 0], [0.75, 0.9, s * 0.62], 0.012, ropeM, 4); }
    YB.build();
    // the rig that swings out: boom, sheet and the sail (it is turned a little off the keel, as if sheeted in)
    const rig = new THREE.Group(); rig.position.set(0.35, 0, 0); rig.rotation.y = 0.1; yacht.add(rig);
    {
      const RB = tintedBatch(rig);
      rod(RB, [0, 1.15, 0], [-2.3, 1.06, 0], 0.04, darkWood);                          // the boom
      rod(RB, [-2.0, 1.08, 0], [-1.85, 0.86, 0.02], 0.012, ropeM, 4);   // the sheet down to a cleat
      RB.add(bbox(0.1, 0.06, 0.1, 0.01, 1), iron, -1.85, 0.84, 0.02);
      RB.build();
      const sail = new THREE.Mesh(cached('sailGrid', () => {
        // a triangular sail, luff on the mast (x 0), foot on the boom, head at the masthead; a belly of 0.28 m
        const NU = 6, NV = 10, pos = [], uv = [], idx = [];
        for (let j = 0; j <= NV; j++) {
          const v = j / NV, chord = 2.25 * (1 - v) + 0.05, y = 1.2 + v * 3.75;
          for (let i = 0; i <= NU; i++) {
            const u = i / NU, belly = Math.sin(Math.PI * u) * chord * 0.12 * (1 - v * 0.35);
            pos.push(-u * chord - 0.04, y - u * 0.1 * (1 - v), belly); uv.push(u, v);
          }
        }
        for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
        return g;
      }), new THREE.MeshStandardMaterial({ map: sailTex(), side: THREE.DoubleSide, roughness: 0.92 }));
      sail.castShadow = true; rig.add(sail);
    }
    // a pennant at the masthead
    const flag = new THREE.Mesh(cached('yFlag', () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0.3, 0, -0.75, 0.15, 0.05], 3)); g.setIndex([0, 1, 2]); g.computeVertexNormals(); return g; }), canvas('#2f7a9a'));
    flag.position.set(0.35, 5.0, 0); yacht.add(flag);
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

  // ================================================================ the original's old places (WORLD-80 step 3)
  // a still palm (no sway), its trunk and fronds in the island's batch, for the plaza, the compound and the corral
  const staticPalm = (px, pz, s, ry) => {
    const y = H(px, pz) - 0.1, c = Math.cos(ry), sn = Math.sin(ry), trunkM = pm('#b89068', 0.9), leafM = pm('#5a8a3a', 0.8, { side: THREE.DoubleSide });
    for (const [geo, lx, ly] of palmTrunkG()) B.add(geo, trunkM, px + c * lx * s, y + ly * s, pz - sn * lx * s, 0, ry, -0.06, s);
    const cx = px + c * 0.55 * s, cz = pz - sn * 0.55 * s, cy = y + 5.6 * s;
    for (let k = 0; k < 8; k++) B.add(frondG(), leafM, cx, cy, cz, 0, ry + k / 8 * Math.PI * 2 + Math.sin(k * 2.3 + px) * 0.15, 0.15, s);
    col({ type: 'cyl', x: px, z: pz, r: 0.3 * s, top: y + 6 * s, seeThrough: true });
  };
  // a wooden signpost: the board on two posts, facing ry
  const signAt = (text, x, z, ry, bg) => {
    const y = H(x, z), c = Math.cos(ry), s = Math.sin(ry);
    const sg = new THREE.Mesh(emq(), new THREE.MeshStandardMaterial({ map: signTex(text, bg, 384), roughness: 0.8, side: THREE.DoubleSide }));
    sg.scale.set(2.4, 0.6, 1); sg.position.set(x, y + 1.55, z); sg.rotation.y = ry; group.add(sg);
    for (const k of [-1.25, 1.25]) rod(B, [x + c * k, y, z - s * k], [x + c * k, y + 1.95, z - s * k], 0.05, darkWood);
    col({ type: 'box', x, z, hw: 1.3, hd: 0.15, rot: ry, top: y + 1.9, noStand: true, seeThrough: true });
  };
  buildOldPlaces({ R, B, col, H, W, palm: staticPalm, signAt });

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
