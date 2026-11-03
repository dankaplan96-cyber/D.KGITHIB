// W-1 · Float Harbor (EXPANSION_WORLD_SPEC.md): Ballastra's arrival harbour, the region 'ballastra' and Tessa's shed
// 'bl_shed'. The place only: the story (the cloud's) drives its moving parts through BALLASTRA.harbor, and the people
// (Tessa, the dockers) stand on its spots.
//
// The place, from the play camera: a working harbour of floating platforms on a shallow green-blue sea, under one great
// stone arch with the district on stilts round its feet (skyline.js). Three heights: the floats and gangways (0.6 m
// over the water), the spacecraft pad (1.4), the stone cargo quay, the lift's walls and the walkway (2.2); stairs
// between them.
//   1. The pad (south-west): a stone platform with a glazed landing ring; the project's ship stands on it.
//   2. The pontoon row from the pad east to the cargo quay (stairs up), past the lift's outer entrance.
//   3. The cargo quay: two counterweight cranes (A over a moored barge, B by the lift with its latch), crates, jars,
//      nets, sacks, the customs hut (a small glazed-tile booth with a cobalt roof and a cargo balance) at the stair head.
//   4. The boat lift: a stone chamber between the outer water and the higher inner basin (1.7 m); its moving deck is a
//      timber caisson with its own water, hung from a gantry by chains over wheels to a big counterweight in a shaft on
//      the quay, moved by a winch (the crank). The stranded working boat rides on it. A dial reports the level.
//   5. The hinged walkway across the lift's outer entrance, from the quay to the shed's float; Tessa's shed on its own
//      float; a gangway on from there to the district's edge (the way into W-2, closed by its gate for now).
//   6. The shortcut: a swing bridge on the low pier from the pad's north side straight to the district's edge, swung
//      shut at first.
// The walkway is the only way between the quay side (pad, pontoons, quay) and the shed side (shed, district's edge)
// until the shortcut opens: that is what crane B's load blocks.
//
// The lift's rule (the one the spec gives the world, N1 "Wrong Dock"):
//   level = clamp(cw − 1 + (crane released ? 2 : 0), 0, 3)    cw: 0 high, 1 middle, 2 low
//   levels: 0 low (the outer water), 1 halfway (stranded), 2 top (level with the inner basin), 3 over (too high)
//   The counterweight alone is too light for the boat's deck: high or middle it lets the deck down, low it holds it
//   halfway (the start: low, not released → halfway). Crane B's load, swung onto the counterweight, adds two steps.
//   Balanced is the one combination: released and middle → the top; the boat floats free, and the load sits on the
//   counterweight's cradle, clear of the walkway. Released any other way, the load can't seat: it rests on the walkway
//   (blocked). Everything can go back (crane.reset, counterweight.set).
// Getting on and off the deck: from the east wall (the quay) at the top; a stair on the caisson's east side reaches
// the quay's height from any level, so nobody is stranded on it; the west side has a parapet (no way round).
//
// CONTRACT (world coordinates; all setters are pure state setters, `instant` for loading, safe to call any time)
//   HARBOR_AT {x, z}; buildBallastraSteps(scene, physics) (a generator: regions.js builds it in steps) /
//   buildBallastra(scene, physics) → { ballastra, bl_shed }
//   BALLASTRA.harbor = H:
//     rooms ['ballastra', 'bl_shed'] · spawns {pad, shedDoorOut, shedIn, districtEdge} {x, z, a}
//     doors {shedOut: {x, z, r, room:'bl_shed'}, shedIn: {x, z, r, room:'ballastra'}, shed: {setLocked(b), locked}}
//     stands {tessa_shed, tessa_quay, tessa_lift, docker1, docker2, customs, boatOwner, boatOwner_moored} {x, z, a}
//     spots {crank, liftLever, boat (follows the boat), shedBench} {x, z, r} · craneLatch {x, y, z, r}
//     safe [{x, z}] (where to put him back) · sailPath [{x, z}] (the boat's way out, for a camera)
//     counterweight.set(pos, instant), .pos · crane.release(instant), crane.reset(instant), .released
//     lift.level (0–3, read-only), lift.y (the deck's walking height now), lift.moving · walkway.blocked (read-only)
//     balanced (read-only) · boat.sailOut(instant), boat.reset(instant), boat.out, boat.free (the deck at the top)
//     shortcut.setOpen(b, instant), .open
//     onChange(fn)  fn(what) after any state change ('counterweight', 'crane', 'level', 'boat', 'shortcut')
import * as THREE from 'three';
import { Batch, cached, bbox, cyl, lathe, tube, compose, tint, tm, pm, ctex } from '../kit.js';
import { Place } from '../props-esmer.js';
import { BM, BOB, bobbed, bobGeo, M4, deckSlab, railRun, stepsGeo, lantern, bollard, crate, crateStack, jarCrate, sack, netPile, netRack, washingLine, herbPot, ballastPot, barrow, buoyGeo } from './look.js';
import { building } from './build.js';
import { seaSetup, setBedShape } from './sea.js';
import { buildSkyline, archPicture } from './skyline.js';
import { buildShedRoom, SHED } from './shed.js';
import { BALLASTRA, BALLASTRA_AT } from './common.js';
import { esmerShuttle } from '../shuttle.js';
import { Gulls } from '../gulls.js';
import { WATER_FLOOR } from '../../engine/physics.js';

export { BALLASTRA };
export const HARBOR_AT = BALLASTRA_AT.ballastra;

// ------------------------------------------------------------------ the plan (local metres; x east, z south)
const WI = 1.7, FL = 0.6, PD = 1.4, QY = 2.2;               // the inner basin's water, floats, pad, quay
const CH = { x0: -3, x1: 3, z0: -8, z1: 6 };                 // the lift chamber (inside faces)
const CA = { x0: -2.98, x1: 2.98, z0: -7.4, z1: 5.4, rim: 1.0, stair0: -0.2, land0: 3.8 };   // the caisson
const LEVEL_Y = [0.45, 1.3, 2.15, 3.0];                       // the caisson's rim (walking height) at each level
const LEVEL_NAME = ['low', 'half', 'top', 'over'];
const CW_Y = [7.6, 5.4, 3.2];                                 // the counterweight's foot: high, middle, low
const CWB = { x: 5.9, z: -1.0, s: 1.3, h: 1.6 };              // the counterweight block (its shaft on the quay)
const CRB = { x: 10.4, z: 3.6, h: 7.4, jib: 10.4 };           // crane B (by the lift)
const CRA = { x: 19.6, z: 6.0, h: 7.0, jib: 9.0 };            // crane A (over the barge)
const WALK = { x0: -3.02, x1: 3.02, z0: 8.1, z1: 9.7 };       // the walkway across the lift's outer entrance
const LOAD = { rest: { x: 17.8, z: 3.0, y: QY + 1.2 }, block: { x: 2.0, z: 8.9, y: QY }, s: 1.2 };
const SHEDF = { x0: -15, x1: -5, z0: -6, z1: 10 };            // the shed's float
const SHEDB = { x: -10.4, z: -1.35, w: 6, d: 4.9 };           // the shed
const GANG = { x0: -11, x1: -8.5, z0: -25, z1: -6 };          // shed float → the district's edge
const DIST = { x0: -31, x1: -6, z0: -36, z1: -27.4 };         // the district's edge
const PAD = { x0: -34, x1: -18, z0: 10, z1: 26, cx: -26.5, cz: 18.6 };
const ROW = { x0: -14.9, x1: 10, z0: 12.15, z1: 16 };          // the pontoon row
const SC = { x0: -29.5, x1: -26.5, piv: { x: -28, z: -13.4 }, len: 7.2, s0: -12.0, n1: -20.4 };   // the shortcut
const HUT = { x: 13.6, z: 8.9, s: 3.0 };                       // the customs hut
const BASIN = { x0: -3, x1: 14, z0: -30, z1: -9 };
const MOOR = { x: 12.4, z: -21.5, a: 0 };                      // where the boat moors after it sails out
const STONE_RECTS = [[3, -9, 22, 12], [14, -30, 19, -9], [-4, -31, 19, -30], [-4, -30, -3, 11], [PAD.x0, PAD.z0, PAD.x1, PAD.z1], [-29.5, -15, -26.5, -11.8]];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const wrapA = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export const liftLevel = (cw, released) => clamp(cw - 1 + (released ? 2 : 0), 0, 3);

// a painted tile ring for the pad (Ballastra ware: celadon and terracotta in a ring, the balance's beam across it)
const padTex = () => ctex('blpadring', 512, 512, (x, W) => {
  const c = W / 2;
  x.fillStyle = '#e8dcc2'; x.fillRect(0, 0, W, W);
  const ring = (r0, r1, n, a, b) => { for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? a : b; x.beginPath(); x.arc(c, c, r1, (i / n) * Math.PI * 2, ((i + 1) / n) * Math.PI * 2); x.arc(c, c, r0, ((i + 1) / n) * Math.PI * 2, (i / n) * Math.PI * 2, true); x.closePath(); x.fill(); } };
  ring(232, 252, 48, '#9cc8b4', '#f2ead6'); ring(206, 230, 32, '#c8764e', '#e6b866'); ring(120, 128, 1, '#5f9a86', '#5f9a86');
  x.strokeStyle = 'rgba(80,60,40,0.35)'; x.lineWidth = 2; for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2; x.beginPath(); x.moveTo(c + Math.cos(a) * 130, c + Math.sin(a) * 130); x.lineTo(c + Math.cos(a) * 204, c + Math.sin(a) * 204); x.stroke(); }
  x.fillStyle = '#3f6c9c'; x.fillRect(c - 110, c - 8, 220, 16); x.beginPath(); x.moveTo(c - 18, c + 8); x.lineTo(c + 18, c + 8); x.lineTo(c, c - 30); x.closePath(); x.fill();
  for (const s of [-1, 1]) { x.beginPath(); x.arc(c + s * 100, c + 34, 24, 0, Math.PI); x.fill(); x.fillRect(c + s * 100 - 2, c + 8, 4, 26); }
}, false);
// the level dial's face (four marks in the four glazes, no words) and the counterweight's gauge
const dialTex = () => ctex('blliftdial', 128, 128, (x, W) => {
  x.fillStyle = '#f2ead6'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.strokeStyle = '#7a5c40'; x.lineWidth = 6; x.stroke();
  ['#3f6c9c', '#e6b866', '#5f9a86', '#c6684c'].forEach((c, i) => { const a = Math.PI * (1.1 - i * 0.4); x.fillStyle = c; x.beginPath(); x.arc(64 + Math.cos(a) * 44, 64 - Math.sin(a) * 44, 11, 0, 7); x.fill(); });
}, false);
// the crane's chain/cable as a strip of links (a texture on a thin cross of planes, scrolled as the length changes)
const chainTex = () => ctex('blchainT', 32, 128, (x, W, H) => {
  x.clearRect(0, 0, W, H); x.strokeStyle = '#3c3e44'; x.lineWidth = 5;
  for (let i = 0; i < 4; i++) { const y = i * 32 + 16; if (i % 2) { x.fillStyle = '#3c3e44'; x.fillRect(13, y - 14, 6, 28); } else { x.beginPath(); x.ellipse(16, y, 8, 14, 0, 0, 7); x.stroke(); } }
});

export function buildBallastra(scene, physics) { const it = buildBallastraSteps(scene, physics); let r = it.next(); while (!r.done) r = it.next(); return r.value; }

export function* buildBallastraSteps(scene, physics) {
  const ox = HARBOR_AT.x, oz = HARBOR_AT.z;
  const group = new THREE.Group(); group.name = 'ballastra'; group.visible = false; group.position.set(ox, 0, oz); scene.add(group);
  const B = new Batch(group);
  const P = (x, y, z, ry = 0) => new Place(B, x, y, z, ry);
  const statics = [];
  const col = (c) => { const w = physics.add({ ...c, x: c.x + ox, z: c.z + oz }); statics.push(w); return w; };
  const cols = (list) => { for (const c of list) col(c); };
  const box = (x0, z0, x1, z1, top, o = {}) => col({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, top, ...o });
  const updaters = [];

  // ================================================================ the sea and the skyline
  setBedShape({ basin: [BASIN.x0, BASIN.z0, BASIN.x1, BASIN.z1], pit: [CH.x0, CH.z0 - 1, CH.x1, CH.z1 + 5], banks: [[-24, 18, 16], [-18, -31, 12], [-10, 2, 9], [20, 18, 10]] });
  const pic = archPicture();
  const env = { fog: '#d6e6e2', sun: '#fff2dc', hemiSky: '#d2e6f0', hemiGround: '#8c9a7e', sunI: 2.45, hemiI: 1.32, fogRange: [70, 300], sunDir: [-0.5, 0.8, 0.35] };
  const sea = seaSetup(group, ox, oz, physics, { picture: pic.tex, picBox: pic.box, sunDir: env.sunDir, env: { deep: '#2a7e88', shallow: '#68c6b2', sky: '#d6e8e8' } });
  sea.inner(BASIN.x0, BASIN.z0, BASIN.x1, BASIN.z1, WI);
  yield;
  const sky = buildSkyline(group);
  yield;

  // ================================================================ stone: the quay, the lift's walls, the basin, the pad
  const pave = tm('cobble', { color: '#f4e4c4', rough: 0.9 });
  const mass = (x0, z0, x1, z1, top, { paveM = pave, parapet = false, bottom = -2.6, colTop = true } = {}) => {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, wetTop = 0.5;
    B.add(bbox(w, wetTop - bottom, d, 0.04, 1.7), BM.wet(), cx, (bottom + wetTop) / 2, cz);
    B.add(bbox(w + 0.02, top - 0.12 - wetTop, d + 0.02, 0.04, 1.8), BM.stone(), cx, wetTop + (top - 0.12 - wetTop) / 2, cz);
    B.add(bbox(w + 0.14, 0.16, d + 0.14, 0.04, 1.2), BM.cap(), cx, top - 0.08, cz);
    if (paveM) B.add(bbox(w - 0.12, 0.04, d - 0.12, 0.01, 1.9), paveM, cx, top + 0.005, cz);
    if (parapet) {
      B.add(bbox(w - 0.1, 0.55, d - 0.1, 0.05, 1.8), BM.stone(), cx, top + 0.27, cz);
      B.add(bbox(w + 0.04, 0.12, d + 0.04, 0.04, 1.2), BM.cap(), cx, top + 0.6, cz);
      box(x0, z0, x1, z1, top + 0.66, { block: true });
    } else if (colTop) box(x0, z0, x1, z1, top);
  };
  // the cargo quay (round the stair cut at its south edge), its arm north along the basin
  mass(3, -9, 22, 9.6, QY); mass(3, 9.6, 6.5, 12, QY); mass(9.5, 9.6, 22, 12, QY);
  mass(14, -30, 19, -9, QY);
  // the lift chamber's west wall (a parapet, but for the walkway's landing), the basin's walls
  mass(-4, -9, -3, 8.1, QY, { parapet: true }); mass(-4, 8.1, -3, 9.7, QY); mass(-4, 9.7, -3, 11, QY, { parapet: true });
  mass(-4, -30, -3, -9, QY, { parapet: true }); mass(-4, -31, 19, -30, QY, { parapet: true });
  // the lift's sill and the outer gate's piers (no walking on the gates)
  B.add(bbox(6, 1.8, 1.2, 0.04, 1.6), BM.wet(), 0, -1.6, CH.z0 - 0.6);
  // the pad: a stone platform, its glazed landing ring
  mass(PAD.x0, PAD.z0, PAD.x1, PAD.z1, PD, { paveM: tm('stone', { color: '#e8dcc2', rough: 0.88 }) });
  B.add(cached('blpadring', () => cyl(6.4, 6.4, 0.04, 48, 0)), pm('#ffffff', 0.55, { map: padTex() }), PAD.cx, PD + 0.03, PAD.cz);
  // the shortcut's pivot pier (a stone drum)
  B.add(cached('bldrum', () => lathe([[0.001, -2.6], [1.6, -2.6], [1.55, 0.5], [1.5, FL - 0.1], [1.62, FL - 0.1], [1.62, FL], [0.001, FL]], 20)), BM.stone(), SC.piv.x, 0, SC.piv.z);
  col({ type: 'cyl', x: SC.piv.x, z: SC.piv.z, r: 1.55, top: FL });
  // the quay's fenders along the lift (timber beams over the stone: the deck's guides)
  for (const z of [-6.5, -3.5, -0.5, 2.5]) B.add(bbox(0.16, 2.6, 0.3, 0.02, 1), BM.post(), CH.x1 + 0.08, QY - 1.3, z);
  for (const z of [-6.5, -3.5, -0.5, 2.5]) B.add(bbox(0.16, 2.6, 0.3, 0.02, 1), BM.post(), CH.x0 - 0.08, QY - 1.3, z);
  // painted level marks inside the chamber (the four glazes, as on the dial)
  ['#3f6c9c', '#e6b866', '#5f9a86', '#c6684c'].forEach((c, i) => B.add(cached('blmark' + c, () => tint(bbox(0.05, 0.12, 0.6, 0.01), c)), BM.vc(), CH.x1 + 0.02, LEVEL_Y[i] - 0.05, 4.6));
  yield;

  // ================================================================ timber: decks, pontoons, gangways, piers, stairs
  const deck = (x0, z0, x1, z1, top, o = {}) => { const p = P((x0 + x1) / 2, 0, (z0 + z1) / 2); deckSlab(p, x1 - x0, z1 - z0, { top, ...o }); if (o.col !== false) box(x0, z0, x1, z1, top, { seeThrough: true }); return p; };
  // the pontoon row: three floating sections, the middle one hinged in front of the lift's entrance
  deck(ROW.x0, ROW.z0, -4.2, ROW.z1, FL, { under: 'floats', seed: 2 });
  deck(-4.2, ROW.z0, 4.2, ROW.z1, FL, { under: 'floats', mat: BM.deckOld(), seed: 3, col: false });
  deck(4.2, ROW.z0, ROW.x1, ROW.z1, FL, { under: 'floats', seed: 4, col: false });
  box(-4.25, ROW.z0, ROW.x1, ROW.z1, FL, { seeThrough: true });
  for (const x of [-4.2, 4.2]) for (const s of [-1, 1]) B.add(cached('blhinge', () => cyl(0.07, 0.07, 0.5, 8).rotateZ(Math.PI / 2)), BM.bronze(), x, FL - 0.06, (ROW.z0 + ROW.z1) / 2 + s * 1.2);
  // stairs: the pad down to the row, the row up to the quay, the walkway's landing down to the shed's float
  // (stepsGeo records its colliders in each Place: added after)
  const stairs = [];
  stairs.push(P(PAD.x1, 0, 14.1, Math.PI / 2)); stepsGeo(stairs[stairs.length - 1], 3.6, 0, 3.15, PD, FL, 4);
  stairs.push(P(8, 0, 9.6, 0)); stepsGeo(stairs[stairs.length - 1], 3.0, 0, 2.6, QY, FL, 8);
  stairs.push(P(-4, 0, 8.9, -Math.PI / 2)); stepsGeo(stairs[stairs.length - 1], 1.6, 0, 2.6, QY, FL, 8, { wood: true });
  stairs.push(P(-9.75, 0, -27.4, 0)); stepsGeo(stairs[stairs.length - 1], 2.5, 0, 2.4, PD, FL, 4, { wood: true });
  stairs.push(P(-28, 0, -27.4, 0)); stepsGeo(stairs[stairs.length - 1], 3.0, 0, 2.4, PD, FL, 4, { wood: true });
  stairs.push(P(-28, 0, PAD.z0, Math.PI)); stepsGeo(stairs[stairs.length - 1], 3.0, 0, 2.4, PD, FL, 4);
  for (const s of stairs) cols(s.cols);
  // the quay stair's side walls (the cut in the quay)
  for (const x of [6.5, 9.5]) B.add(bbox(0.12, 1.7, 2.6, 0.02, 1.4), BM.stone(), x, FL + 0.75, 10.9);
  // the walkway across the lift's outer entrance (a bascule leaf: its hinge and counterbalance on the quay)
  deck(WALK.x0, WALK.z0, WALK.x1, WALK.z1, QY, { under: null, thick: 0.3, seed: 5 });
  for (const s of [-1, 1]) B.add(bbox(6.2, 0.36, 0.14, 0.02, 1.5), BM.post(), 0, QY - 0.45, (WALK.z0 + WALK.z1) / 2 + s * 0.7);
  for (const s of [-1, 1]) B.add(cached('blbhinge', () => cyl(0.12, 0.12, 0.3, 10).rotateX(Math.PI / 2)), BM.bronze(), 3.15, QY - 0.2, (WALK.z0 + WALK.z1) / 2 + s * 0.7);
  for (const s of [-1, 1]) B.add(bbox(0.24, 3.2, 0.24, 0.03, 1), BM.post(), 4.5, QY + 1.6, (WALK.z0 + WALK.z1) / 2 + s * 1.15);
  B.add(bbox(0.3, 0.3, 2.6, 0.03, 1), BM.post(), 4.5, QY + 3.25, (WALK.z0 + WALK.z1) / 2);
  B.add(bbox(3.6, 0.24, 0.24, 0.03, 1), BM.post(), 4.4, QY + 3.5, (WALK.z0 + WALK.z1) / 2, 0, 0, 0.12);
  B.add(bbox(0.9, 0.9, 0.9, 0.05, 1), BM.celadonDeep(), 6.0, QY + 3.75, (WALK.z0 + WALK.z1) / 2);
  B.add(tube([[2.6, QY + 0.05, 8.9], [3.4, QY + 2.6, 8.9], [3.6, QY + 3.45, 8.9]], 0.03, 4, 1), BM.iron());
  for (const s of [-1, 1]) col({ type: 'box', x: 4.5, z: (WALK.z0 + WALK.z1) / 2 + s * 1.15, hw: 0.16, hd: 0.16, top: QY + 3.2 });
  // the shed's float, the gangway to the district's edge, the district's edge
  deck(SHEDF.x0, SHEDF.z0, SHEDF.x1, SHEDF.z1, FL, { under: 'floats', seed: 6 });
  deck(GANG.x0, GANG.z0, GANG.x1, GANG.z1 + 0.05, FL, { under: 'floats', mat: BM.deckOld(), seed: 7 });
  deck(DIST.x0, DIST.z0, DIST.x1, DIST.z1, PD, { under: 'piles', seed: 8 });
  // the shortcut: the low piers either side of the channel
  deck(SC.x0, SC.s0, SC.x1, PAD.z0 - 2.4, FL, { under: 'piles', mat: BM.deckOld(), seed: 9 });
  deck(SC.x0, -25, SC.x1, SC.n1, FL, { under: 'piles', mat: BM.deckOld(), seed: 10 });
  yield;

  // ================================================================ rails (where a fall reads as one; the sea itself is a soft edge)
  const rc = [];
  const rail = (ax, az, bx, bz, y, o) => railRun(B, rc, ax, az, bx, bz, y, o);
  rail(WALK.x0, WALK.z0, WALK.x1, WALK.z0, QY, { kind: 'timber' }); rail(WALK.x0, WALK.z1, WALK.x1, WALK.z1, QY, { kind: 'timber' });
  rail(3.1, 6.2, 3.1, WALK.z0, QY, { kind: 'iron' }); rail(3.1, WALK.z1, 3.1, 12, QY, { kind: 'iron' });
  rail(-6.6, WALK.z0 - 0.05, -4, WALK.z0 - 0.05, FL, { kind: 'timber', collide: false }); rail(-6.6, WALK.z1 + 0.05, -4, WALK.z1 + 0.05, FL, { kind: 'timber', collide: false });
  rail(3.0, 12.05, 6.5, 12.05, QY, { kind: 'iron' }); rail(9.5, 12.05, 10.0, 12.05, QY, { kind: 'iron' });
  rail(6.5, 9.6, 6.5, 12, QY, { kind: 'iron', collide: false }); rail(9.5, 9.6, 9.5, 12, QY, { kind: 'iron', collide: false });
  rail(ROW.x0 + 0.2, ROW.z1 - 0.05, ROW.x1, ROW.z1 - 0.05, FL, { kind: 'rope', every: 2.2 });
  rail(-3.0, ROW.z0 + 0.05, 3.0, ROW.z0 + 0.05, FL, { kind: 'rope', every: 2.0 });
  for (const x of [GANG.x0 + 0.05, GANG.x1 - 0.05]) rail(x, GANG.z0, x, GANG.z1, FL, { kind: 'rope', every: 2.4 });
  for (const x of [SC.x0 + 0.05, SC.x1 - 0.05]) { rail(x, SC.s0 + 1.3, x, PAD.z0 - 2.4, FL, { kind: 'rope', every: 2.4 }); rail(x, -25, x, SC.n1 - 0.6, FL, { kind: 'rope', every: 2.4 }); }
  rail(DIST.x0 + 0.05, DIST.z0 + 0.4, DIST.x0 + 0.05, DIST.z1, PD, { kind: 'timber' }); rail(DIST.x1 - 0.05, DIST.z0 + 0.4, DIST.x1 - 0.05, DIST.z1, PD, { kind: 'timber' });
  rail(DIST.x0, DIST.z1 - 0.05, SC.x0 - 0.1, DIST.z1 - 0.05, PD, { kind: 'timber' }); rail(SC.x1 + 0.1, DIST.z1 - 0.05, GANG.x0 - 0.1, DIST.z1 - 0.05, PD, { kind: 'timber' }); rail(GANG.x1 + 0.1, DIST.z1 - 0.05, DIST.x1, DIST.z1 - 0.05, PD, { kind: 'timber' });
  rail(SHEDF.x0 + 0.05, SHEDF.z0, SHEDF.x0 + 0.05, SHEDF.z1, FL, { kind: 'rope', every: 2.6 });
  rail(SHEDF.x0, SHEDF.z1 - 0.05, -6.8, SHEDF.z1 - 0.05, FL, { kind: 'rope', every: 2.6 });
  rail(SHEDF.x0, SHEDF.z0 + 0.05, GANG.x0 - 0.05, SHEDF.z0 + 0.05, FL, { kind: 'rope', every: 2.6 }); rail(GANG.x1 + 0.05, SHEDF.z0 + 0.05, SHEDF.x1, SHEDF.z0 + 0.05, FL, { kind: 'rope', every: 2.6 });
  cols(rc); rc.length = 0;
  // the district's gate (W-2 lies beyond it: shut for now) and its fence
  {
    const gz = DIST.z0 + 0.25, gx = -17;
    rail(DIST.x0, gz, gx - 1.6, gz, PD, { kind: 'timber', h: 1.3 }); rail(gx + 1.6, gz, DIST.x1, gz, PD, { kind: 'timber', h: 1.3 }); cols(rc.splice(0));
    const g = P(gx, PD, gz);
    for (const s of [-1, 1]) { g.add(cached('blgatepost', () => bbox(0.36, 3.6, 0.36, 0.04, 1)), BM.post(), s * 1.6, 1.8, 0); g.add(cached('blgatecap', () => lathe([[0.001, 0], [0.26, 0], [0.2, 0.2], [0.001, 0.36]], 8)), BM.celadon(), s * 1.6, 3.6, 0); }
    g.add(cached('blgatebeam', () => bbox(3.8, 0.34, 0.3, 0.04, 1)), BM.post(), 0, 3.2, 0);
    g.add(cached('blgateleaf', () => compose([[bbox(1.5, 1.7, 0.08, 0.02, 0.8)], [bbox(1.5, 0.12, 0.12, 0.02), 0, 0.5, 0.05], [bbox(1.5, 0.12, 0.12, 0.02), 0, -0.5, 0.05], [bbox(1.9, 0.1, 0.1, 0.02), 0, 0, 0.09, 0, 0, 0.85]])), BM.teal(), -0.77, 1.0, 0);
    g.add(cached('blgateleaf', () => null), BM.teal(), 0.77, 1.0, 0, 0, Math.PI);
    g.add(cached('blgatebar', () => bbox(3.0, 0.14, 0.14, 0.02, 1)), BM.post(), 0, 1.1, 0.16);
    g.box(0, 0, 1.6, 0.25, 3.0, { seeThrough: false }); cols(g.cols);
    // the steps up into the district behind it (scenery)
    for (let i = 0; i < 6; i++) B.add(bbox(3.0, 0.3, 0.9, 0.02, 1.2), BM.cap(), gx, PD + 0.15 + i * 0.3, gz - 1.0 - i * 0.85);
  }
  yield;

  // ================================================================ the lift: gantry, wheels, shaft, winch, dial (static parts)
  const GY = 10.6;   // the gantry's top beam
  for (const x of [CH.x0 - 0.5, CH.x1 + 0.5]) for (const s of [-1, 1]) {
    B.add(cached('blgleg', () => bbox(0.36, GY - QY + 0.4, 0.36, 0.04, 1)), BM.post(), x, (QY + GY) / 2, CWB.z + s * 1.3, s * 0.12);
    col({ type: 'box', x, z: CWB.z + s * 1.3, hw: 0.22, hd: 0.22, top: GY });
  }
  B.add(cached('blgbeam', () => bbox(11.8, 0.5, 0.5, 0.05, 1.4)), BM.post(), 1.6, GY, CWB.z);
  B.add(cached('blgbeam2', () => bbox(11.8, 0.18, 0.62, 0.03, 1.4)), BM.timber(), 1.6, GY + 0.33, CWB.z);
  for (const x of [CH.x0 - 0.5, CH.x1 + 0.5]) B.add(cached('blgbrace', () => bbox(0.2, 0.2, 3.2, 0.02, 1)), BM.post(), x, GY - 1.2, CWB.z);
  // the counterweight's shaft: four posts on a stone curb, braces, painted bands (high, middle, low)
  B.add(bbox(2.3, 0.5, 2.3, 0.05, 1.2), BM.cap(), CWB.x, QY + 0.25, CWB.z);
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    B.add(cached('blsp', () => bbox(0.24, GY - QY, 0.24, 0.03, 1)), BM.post(), CWB.x + a * 0.95, (QY + GY) / 2, CWB.z + b * 0.95);
  }
  for (const y of [4.6, 8.6]) for (const s of [-1, 1]) B.add(cached('blspx', () => bbox(2.1, 0.14, 0.14, 0.02, 1)), BM.timber(), CWB.x, y, CWB.z + s * 0.95);
  [['#3f6c9c', CW_Y[0]], ['#5f9a86', CW_Y[1]], ['#c6684c', CW_Y[2]]].forEach(([c, y]) => { for (const a of [-1, 1]) B.add(cached('blcwband' + c, () => tint(bbox(0.28, 0.16, 0.28, 0.02), c)), BM.vc(), CWB.x + a * 0.95, y + CWB.h / 2, CWB.z + 0.95); });
  col({ type: 'box', x: CWB.x, z: CWB.z, hw: 1.15, hd: 1.15, top: QY + 2.2 });
  // the winch beside the shaft (the crank): a timber frame, a drum of chain, two crank handles, a ratchet
  const WX = CWB.x + 2.0, WZ = CWB.z;
  for (const s of [-1, 1]) B.add(cached('blwframe', () => compose([[bbox(0.2, 1.3, 1.1, 0.03, 1), 0, 0.65, 0], [bbox(0.24, 0.2, 1.3, 0.03), 0, 0.1, 0]])), BM.post(), WX, QY, WZ + s * 0.75);
  B.add(cached('blwdrum', () => cyl(0.36, 0.36, 1.3, 14, 1).rotateX(Math.PI / 2)), BM.timber(), WX, QY + 1.0, WZ);
  for (const s of [-1, 1]) B.add(cached('blwdrumr', () => cyl(0.44, 0.44, 0.08, 14).rotateX(Math.PI / 2)), BM.bronze(), WX, QY + 1.0, WZ + s * 0.6);
  B.add(tube([[WX, QY + 1.36, WZ], [CWB.x + 0.6, GY - 0.2, WZ]], 0.035, 4, 1), BM.iron());
  col({ type: 'box', x: WX, z: WZ, hw: 0.4, hd: 0.9, top: QY + 1.5 });
  const crankG = new THREE.Group(); crankG.position.set(WX, QY + 1.0, WZ); crankG.userData.keep = true; group.add(crankG);
  for (const s of [-1, 1]) { const m = new THREE.Mesh(cached('blcrank', () => compose([[bbox(0.08, 0.6, 0.06, 0.01), 0, 0.3, 0], [cyl(0.04, 0.04, 0.34, 6).rotateX(Math.PI / 2), 0, 0.58, 0.16]])), BM.iron()); m.position.z = s * 0.92; m.rotation.z = s > 0 ? 0 : Math.PI; m.castShadow = true; crankG.add(m); }
  // the dial on its post: the level, read by a needle
  const DX = CH.x1 + 1.2, DZ = 1.8;
  B.add(cached('bldialpost', () => bbox(0.22, 1.9, 0.22, 0.03, 1)), BM.post(), DX, QY + 0.95, DZ);
  B.add(cached('bldialface', () => cyl(0.36, 0.36, 0.06, 20).rotateZ(Math.PI / 2)), pm('#ffffff', 0.5, { map: dialTex() }), DX + 0.14, QY + 1.75, DZ);
  B.add(cached('bldialring', () => new THREE.TorusGeometry(0.37, 0.035, 5, 20).rotateY(Math.PI / 2)), BM.bronze(), DX + 0.15, QY + 1.75, DZ);
  B.add(cached('bllever', () => compose([[bbox(0.08, 0.7, 0.08, 0.01), 0, 0.35, 0], [new THREE.SphereGeometry(0.07, 8, 6), 0, 0.72, 0]])), BM.brick(), DX - 0.05, QY + 0.7, DZ + 0.3, 0, 0, -0.35);
  col({ type: 'cyl', x: DX, z: DZ, r: 0.2, top: QY + 2.0, noStand: true });
  const needleP = new THREE.Group(); needleP.position.set(DX + 0.19, QY + 1.75, DZ); needleP.rotation.y = Math.PI / 2; needleP.userData.keep = true; group.add(needleP);
  const needle = new THREE.Mesh(cached('blneedle', () => bbox(0.035, 0.3, 0.02, 0.005).clone().translate(0, 0.13, 0)), BM.iron()); needleP.add(needle);
  yield;

  // ================================================================ the lift: moving parts
  const liftG = new THREE.Group(); liftG.name = 'bl_lift'; liftG.userData.keep = true; group.add(liftG);
  // the caisson, modelled at level 0 (its rim at LEVEL_Y[0])
  const cais = new THREE.Group(); liftG.add(cais);
  const cB = new Batch(cais);
  const R0 = LEVEL_Y[0], cw = CA.x1 - CA.x0 - 0.2, cd = CA.z1 - CA.z0;
  for (const s of [-1, 1]) cB.add(bbox(0.3, 2.4, cd, 0.04, 1.6), BM.timber(), s * (cw / 2 - 0.15), R0 - 1.2, (CA.z0 + CA.z1) / 2);
  for (const z of [CA.z0 + 0.15, CA.z1 - 0.15]) cB.add(bbox(cw, 2.4, 0.3, 0.04, 1.6), BM.timber(), 0, R0 - 1.2, z);
  for (let i = 0; i < 6; i++) for (const s of [-1, 1]) cB.add(cached('blcband', () => bbox(0.06, 2.42, 0.12, 0.01)), BM.bronze(), s * (cw / 2 + 0.01), R0 - 1.2, CA.z0 + 0.8 + i * 2.2);
  // the rims to walk on
  for (const [x0, x1, z0, z1, m] of [[CA.x0 + 0.1, CA.x0 + 1.0, CA.z0, CA.z1, BM.deck()], [CA.x1 - 1.0, CA.x1 - 0.1, CA.z0, CA.stair0, BM.deck()], [CA.x0 + 0.1, CA.x1 - 0.1, CA.z0, CA.z0 + 0.8, BM.deck()], [CA.x0 + 0.1, CA.x1 - 1.0, CA.z1 - 0.8, CA.z1, BM.deck()]])
    cB.add(bbox(x1 - x0, 0.12, z1 - z0, 0.02, 2.2), m, (x0 + x1) / 2, R0 - 0.06, (z0 + z1) / 2);
  // the stair up its east side to a landing at the quay's height from the bottom level
  const STEPN = 8, run = (CA.land0 - CA.stair0) / STEPN;
  for (let i = 0; i < STEPN; i++) { const top = 0.2 * (i + 1); cB.add(bbox(0.9, 0.08, run + 0.02, 0.015, 2.2), BM.deck(), CA.x1 - 0.55, R0 + top - 0.04, CA.stair0 + run * (i + 0.5)); }
  cB.add(bbox(0.9, 0.12, CA.z1 - CA.land0, 0.02, 2.2), BM.deck(), CA.x1 - 0.55, R0 + 1.6 - 0.06, (CA.land0 + CA.z1) / 2);
  cB.add(bbox(0.1, 1.7, CA.z1 - CA.stair0, 0.02, 1), BM.post(), CA.x1 - 1.02, R0 + 0.85, (CA.stair0 + CA.z1) / 2);
  for (let i = 0; i <= 4; i++) cB.add(cached('blcsp', () => bbox(0.08, 1.0, 0.08, 0.01)), BM.post(), CA.x1 - 1.02, R0 + 0.3 + i * 0.4 + 0.5, CA.stair0 + i * (CA.z1 - CA.stair0) / 4);
  cB.add(tube([[CA.x1 - 1.02, R0 + 1.1, CA.stair0], [CA.x1 - 1.02, R0 + 2.6, CA.land0], [CA.x1 - 1.02, R0 + 2.6, CA.z1]], 0.03, 4, 1), BM.timber());
  // lifting lugs where the chains hold it, ceramic fenders
  for (const s of [-1, 1]) cB.add(cached('blclug', () => compose([[bbox(0.3, 0.4, 0.4, 0.04), 0, 0.2, 0], [new THREE.TorusGeometry(0.14, 0.04, 4, 10).rotateY(Math.PI / 2), 0, 0.5, 0]])), BM.bronze(), s * (cw / 2 - 0.1), R0, CWB.z);
  cB.build();
  const cWater = sea.caissonWater(cw - 2.2, cd - 1.8); cWater.position.set(0, R0 - 0.45, (CA.z0 + CA.z1) / 2); cais.add(cWater);
  // the caisson's colliders: [x0, z0, x1, z1, top over the rim]
  const caisCols = [[CA.x0, CA.z0, CA.x0 + 1.02, CA.z1, 0], [CA.x1 - 1.02, CA.z0, CA.x1, CA.stair0, 0], [CA.x0, CA.z0, CA.x1, CA.z0 + 0.82, 0], [CA.x0, CA.z1 - 0.82, CA.x1 - 1.02, CA.z1, 0], [CA.x1 - 1.02, CA.land0 - 0.06, CA.x1, CA.z1, 1.6]];
  for (let i = 0; i < STEPN; i++) caisCols.push([CA.x1 - 1.02, CA.stair0 + run * i - 0.06, CA.x1, CA.stair0 + run * (i + 1) + 0.06, 0.2 * (i + 1), true]);
  const cCols = caisCols.map(([x0, z0, x1, z1, dy, stair]) => ({ dy, c: physics.add({ type: 'box', x: ox + (x0 + x1) / 2, z: oz + (z0 + z1) / 2, hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, top: R0 + dy, seeThrough: true, ...(stair ? { stair: true } : {}) }) }));

  // the boat: a broad working boat, teal with an ochre sheer, a little wheelhouse, a mast with a furled sail
  const boat = new THREE.Group(); boat.name = 'bl_boat'; boat.userData.keep = true;
  {
    const bB = new Batch(boat);
    const hull = cached('blhull', () => {
      const s = new THREE.Shape(); s.moveTo(-1.1, 3.0); s.lineTo(1.1, 3.0); s.quadraticCurveTo(1.25, 0.4, 1.0, -1.8); s.quadraticCurveTo(0.5, -3.2, 0, -3.5); s.quadraticCurveTo(-0.5, -3.2, -1.0, -1.8); s.quadraticCurveTo(-1.25, 0.4, -1.1, 3.0);
      const g = new THREE.ExtrudeGeometry(s, { depth: 1.3, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2, curveSegments: 10 });
      g.rotateX(Math.PI / 2); g.translate(0, 0.7, 0);   // (deck at +0.7, keel at -0.6; bow toward -z)
      const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = 0.62 + 0.38 * Math.min(1, (y + 0.6) / 1.3); p.setX(i, p.getX(i) * k); if (p.getZ(i) < -2.6) p.setY(i, y + (-2.6 - p.getZ(i)) * 0.25); }
      g.computeVertexNormals(); return g;
    });
    bB.add(hull, BM.teal());
    bB.add(cached('blhullsheer', () => bbox(2.36, 0.14, 6.1, 0.04, 1)), BM.ochre(), 0, 0.62, -0.1);
    bB.add(cached('blhulldeck', () => bbox(2.0, 0.06, 5.6, 0.02, 2.2)), BM.deck(), 0, 0.72, 0.0);
    bB.add(cached('blwheelh', () => bbox(1.3, 1.1, 1.3, 0.04, 1)), BM.cream(), 0, 1.3, 1.6);
    bB.add(cached('blwheelhr', () => bbox(1.6, 0.12, 1.6, 0.03, 1)), BM.celadonDeep(), 0, 1.92, 1.6);
    bB.add(cached('blwheelhw', () => bbox(1.32, 0.36, 0.04, 0.01)), BM.dark(), 0, 1.5, 0.94);
    bB.add(cached('blmast', () => cyl(0.06, 0.08, 4.2, 8)), BM.post(), 0, 2.8, -0.8);
    bB.add(cached('blboom', () => cyl(0.05, 0.05, 2.6, 6).rotateX(Math.PI / 2)), BM.post(), 0, 1.6, 0.4);
    bB.add(cached('blsail', () => tint(cyl(0.16, 0.12, 2.5, 8).rotateX(Math.PI / 2), '#e6b866')), BM.vc(), 0, 1.78, 0.4);
    bB.add(tube([[0, 4.8, -0.8], [0, 0.8, -3.3]], 0.012, 3, 1), BM.rope()); bB.add(tube([[0, 4.8, -0.8], [0, 0.8, 2.9]], 0.012, 3, 1), BM.rope());
    for (const s of [-1, 1]) for (const z of [-1.4, 0.6, 2.2]) bB.add(cached('blfender', () => lathe([[0.001, -0.22], [0.14, -0.15], [0.16, 0], [0.14, 0.15], [0.001, 0.22]], 8)), BM.celadon(), s * 1.22, 0.3, z);
    crateStack(new Place(bB, 0.2, 0.72, -1.9, 0.2), { seed: 4, n: 3 });
    bB.add(cached('blboatlamp', () => new THREE.SphereGeometry(0.1, 8, 6)), BM.glow(), 0, 2.05, 2.3);
    bB.build();
  }
  const BOAT0 = { x: 0, z: -1.0 };
  cais.add(boat); boat.position.set(BOAT0.x, R0 - 0.45, BOAT0.z);
  const boatCol = physics.add({ type: 'box', x: ox + BOAT0.x, z: oz + BOAT0.z, hw: 1.2, hd: 3.4, top: R0 + 2.0, block: true });
  // the counterweight: a block of dark stone banded in bronze with a celadon face plate, a cradle on top
  const cwG = new THREE.Group(); cwG.name = 'bl_counterweight'; cwG.userData.keep = true; group.add(cwG);
  {
    const wB = new Batch(cwG);
    wB.add(bbox(CWB.s, CWB.h, CWB.s, 0.08, 1), tm('stone', { color: '#8c8478', rough: 0.9 }), 0, CWB.h / 2, 0);
    for (const y of [0.25, CWB.h - 0.25]) wB.add(bbox(CWB.s + 0.06, 0.12, CWB.s + 0.06, 0.02, 1), BM.bronze(), 0, y, 0);
    wB.add(bbox(0.8, 0.8, 0.04, 0.04, 1), BM.celadon(), 0, CWB.h / 2, CWB.s / 2 + 0.03);
    wB.add(cached('blcwcradle', () => compose([[bbox(1.4, 0.12, 1.4, 0.02), 0, 0, 0], ...[-1, 1].flatMap((a) => [[bbox(0.1, 0.4, 1.4, 0.01), a * 0.65, 0.2, 0], [bbox(1.4, 0.4, 0.1, 0.01), 0, 0.2, a * 0.65]])])), BM.post(), 0, CWB.h + 0.06, 0);
    wB.add(cached('blcwlug', () => new THREE.TorusGeometry(0.16, 0.05, 4, 10)), BM.iron(), 0, CWB.h + 0.5, 0);
    wB.build();
  }
  cwG.position.set(CWB.x, CW_Y[2], CWB.z);
  // chains: a strip of links per chain (two on the deck, one on the counterweight), scrolled as their length changes
  const chainMat = (key) => { const t = chainTex().clone(); t.needsUpdate = true; t.wrapT = THREE.RepeatWrapping; const m = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.4, color: '#9a9ca4' }); m.name = key; return m; };
  const chainG = cached('blchainstrip', () => { const a = new THREE.PlaneGeometry(0.16, 1), b = new THREE.PlaneGeometry(0.16, 1).rotateY(Math.PI / 2); return compose([[a], [b]]); });
  const deckChainM = chainMat('bl_deckChain'), cwChainM = chainMat('bl_cwChain');
  const deckChains = [-1, 1].map((s) => { const m = new THREE.Mesh(chainG, deckChainM); m.position.x = s * (cw / 2 - 0.1); m.position.z = CWB.z; m.castShadow = true; m.userData.keep = true; group.add(m); return m; });
  const cwChain = new THREE.Mesh(chainG, cwChainM); cwChain.position.set(CWB.x, 0, CWB.z); cwChain.castShadow = true; cwChain.userData.keep = true; group.add(cwChain);
  B.add(tube([[-(cw / 2 - 0.1), GY + 0.6, CWB.z], [CWB.x, GY + 0.6, CWB.z]], 0.05, 5, 1), BM.iron());
  // the wheels on the beam (they turn as the chain runs)
  const wheels = [-(cw / 2 - 0.1) + 0.55, cw / 2 - 0.1 - 0.55, CWB.x - 0.55].map((x) => {
    const m = new THREE.Mesh(cached('blwheel', () => compose([[new THREE.TorusGeometry(0.55, 0.07, 6, 20)], ...[0, 1, 2, 3].map((k) => [bbox(1.05, 0.07, 0.06, 0.01), 0, 0, 0, 0, 0, (k * Math.PI) / 4]), [cyl(0.12, 0.12, 0.3, 10).rotateX(Math.PI / 2)]])), BM.bronze());
    m.position.set(x, GY + 0.55 - 0.02, CWB.z + 0.4); m.castShadow = true; m.userData.keep = true; group.add(m); return m;
  });
  // the gates: the inner one opens for the boat (two mitre leaves on pivots), the outer one stays shut
  const gateLeaf = cached('blgateleaf2', () => compose([[bbox(3.1, 3.2, 0.3, 0.04, 1.4), -1.55, 0, 0], ...[0.8, -0.5].map((y) => [bbox(3.1, 0.16, 0.36, 0.02), -1.55, y, 0])]));
  const gate = [-1, 1].map((s) => { const g = new THREE.Group(); g.position.set(-s * CH.x1, QY - 1.5, CH.z0 - 0.4); g.userData.keep = true; group.add(g); const m = new THREE.Mesh(gateLeaf, BM.timber()); m.scale.x = 0.99; m.rotation.y = s > 0 ? Math.PI : 0; m.castShadow = true; g.add(m); return g; });
  const GATE_SHUT = 0.32, GATE_OPEN = 1.5;
  const setGate = (k) => { gate[0].rotation.y = -(GATE_SHUT + (GATE_OPEN - GATE_SHUT) * k); gate[1].rotation.y = GATE_SHUT + (GATE_OPEN - GATE_SHUT) * k; };
  setGate(0);
  for (const s of [-1, 1]) { const g = P(-s * CH.x1, QY - 1.5, CH.z1 + 0.4, 0); g.add(gateLeaf, BM.timber(), 0, 0, 0, 0, (s > 0 ? Math.PI : 0) + s * 0.32); }
  yield;

  // ================================================================ the cranes (counterweight cranes: a stone foot, a timber mast, a slewing jib)
  const craneMast = (C) => {
    const p = P(C.x, QY, C.z);
    p.add(cached('blcfoot', () => bbox(2.4, 0.8, 2.4, 0.06, 1.2)), BM.stone(), 0, 0.4, 0);
    p.add(cached('blcfootcap', () => bbox(2.6, 0.14, 2.6, 0.04, 1.2)), BM.cap(), 0, 0.84, 0);
    p.add(cached('blcmast' + C.h, () => bbox(0.62, C.h, 0.62, 0.06, 1)), BM.post(), 0, 0.9 + C.h / 2, 0);
    for (const k of [0, 1, 2, 3]) { const a = k * Math.PI / 2; p.add(cached('blcstrut', () => bbox(0.18, 2.6, 0.18, 0.02, 1)), BM.timber(), Math.sin(a) * 0.75, 1.9, Math.cos(a) * 0.75, Math.cos(a) * -0.32, 0, Math.sin(a) * 0.32); }
    for (const y of [2.6, 5.2]) p.add(cached('blcmband', () => bbox(0.7, 0.12, 0.7, 0.02)), BM.iron(), 0, y, 0);
    p.box(0, 0, 1.25, 1.25, 0.95 + C.h, { seeThrough: false, noStand: true }); cols(p.cols);
    // the head: a turntable, the jib (two chords and diagonals), the back arm with its counterweight box, the stays
    const head = new THREE.Group(); head.position.set(C.x, QY + 0.9 + C.h, C.z); head.userData.keep = true; group.add(head);
    const hB = new Batch(head);
    hB.add(cached('blcturn', () => cyl(0.7, 0.7, 0.2, 16)), BM.bronze(), 0, 0.1, 0);
    hB.add(cached('blcjib' + C.jib, () => {
      const parts = [], L = C.jib;
      for (const s of [-1, 1]) parts.push([bbox(L, 0.16, 0.16, 0.02, 1.2), L / 2, 0.45, s * 0.28]);
      parts.push([bbox(L * 0.94, 0.14, 0.14, 0.02, 1.2), L * 0.47, 1.1, 0]);
      for (let i = 0; i < Math.round(L / 1.1); i++) { const x = 0.55 + i * 1.1; parts.push([bbox(0.08, 0.72, 0.08, 0.01), x, 0.78, 0, 0, 0, i % 2 ? 0.5 : -0.5], [bbox(0.08, 0.08, 0.6, 0.01), x, 0.45, 0]); }
      parts.push([bbox(3.4, 0.2, 0.7, 0.02, 1), -1.7, 0.45, 0]);
      return compose(parts);
    }), BM.timber(), 0, 0, 0);
    hB.add(cached('blcbox', () => bbox(1.3, 1.1, 1.0, 0.06, 1)), BM.celadonDeep(), -3.0, 0.15, 0);
    hB.add(cached('blcboxb', () => bbox(1.34, 0.1, 1.04, 0.02)), BM.bronze(), -3.0, 0.55, 0);
    hB.add(cached('blcapex', () => bbox(0.22, 2.0, 0.22, 0.02, 1)), BM.post(), 0, 1.4, 0);
    hB.add(tube([[0, 2.35, 0], [C.jib, 0.6, 0]], 0.025, 4, 1), BM.iron()); hB.add(tube([[0, 2.35, 0], [-3.0, 0.75, 0]], 0.025, 4, 1), BM.iron());
    hB.add(cached('blccab', () => bbox(1.1, 1.0, 1.0, 0.05, 1)), BM.brick(), 0.2, -0.45, 0.8);
    hB.add(cached('blccabr', () => bbox(1.3, 0.1, 1.2, 0.02, 1)), BM.roof(), 0.2, 0.1, 0.8);
    hB.build();
    // the trolley, the cable and the hook block
    const trolley = new THREE.Mesh(cached('blctrol', () => compose([[bbox(0.7, 0.3, 0.8, 0.03), 0, 0, 0], ...[-1, 1].map((s) => [cyl(0.12, 0.12, 0.08, 8).rotateX(Math.PI / 2), 0, 0.15, s * 0.3])])), BM.iron());
    trolley.position.set(C.jib * 0.7, 0.25, 0); trolley.castShadow = true; head.add(trolley);
    const cable = new THREE.Mesh(cached('blccable', () => cyl(0.025, 0.025, 1, 4).translate(0, -0.5, 0)), BM.iron()); cable.castShadow = true; group.add(cable); cable.userData.keep = true;
    const hook = new THREE.Mesh(cached('blchook', () => compose([[bbox(0.32, 0.36, 0.24, 0.05), 0, 0, 0], [tube([[0, -0.16, 0], [0, -0.42, 0], [0.13, -0.54, 0], [0.19, -0.42, 0]], 0.035, 5, 1)]])), BM.brick()); hook.castShadow = true; group.add(hook); hook.userData.keep = true;
    return { head, trolley, cable, hook, C };
  };
  const cA = craneMast(CRA), cB2 = craneMast(CRB);
  // the latch high on crane B's mast, facing the lift (the ball's target): a bronze arm, a red-glazed knob
  const LATCH = { x: CRB.x - 0.42, y: QY + 0.9 + 4.6, z: CRB.z + 0.2 };
  const latch = new THREE.Group(); latch.position.set(LATCH.x, LATCH.y, LATCH.z); latch.userData.keep = true; group.add(latch);
  { const lB = new Batch(latch); lB.add(cached('bllatchplate', () => bbox(0.06, 0.6, 0.5, 0.02)), BM.bronze(), 0.03, 0, 0); lB.build(); }
  const latchArm = new THREE.Group(); latch.add(latchArm);
  { const m = new THREE.Mesh(cached('bllatcharm', () => compose([[bbox(0.1, 0.5, 0.1, 0.02), 0, -0.2, 0], [new THREE.SphereGeometry(0.17, 12, 10), 0, -0.48, 0]])), pm('#c8443a', 0.3, { metalness: 0.05, emissive: '#5a1408', emissiveIntensity: 0.5 })); m.position.x = -0.1; m.castShadow = true; latchArm.add(m); }
  // crane B's load: a net of ballast pots (heavy, and plainly so)
  const load = new THREE.Group(); load.name = 'bl_craneLoad'; load.userData.keep = true; group.add(load);
  {
    const lB = new Batch(load);
    for (let i = 0; i < 7; i++) { const a = i * 0.9, r = i ? 0.36 : 0; ballastPot(new Place(lB, Math.sin(a) * r, i ? 0 : 0.55, Math.cos(a) * r), { s: i ? 0.62 : 0.7, mat: i % 3 ? BM.celadon() : BM.terracotta() }); }
    lB.add(cached('blloadnet', () => { const g = new THREE.SphereGeometry(0.78, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62); g.scale(1, 0.95, 1); g.translate(0, 0.25, 0); return tint(g, '#5f7f86'); }), BM.vcCloth(), 0, 0, 0);
    lB.add(cached('blloadring', () => new THREE.TorusGeometry(0.2, 0.05, 5, 12)), BM.iron(), 0, 1.25, 0);
    lB.build();
  }
  const loadCol = physics.add({ type: 'box', x: ox + LOAD.block.x, z: oz + LOAD.block.z, hw: 0.8, hd: 0.9, top: QY + 1.4, enabled: false });
  // crane A holds a net of crates over the barge
  {
    const g = new THREE.Group(); g.userData.keep = true; group.add(g); const cBt = new Batch(g);
    crateStack(new Place(cBt, 0, 0, 0), { seed: 9, n: 4 }); cBt.add(cached('blcanet', () => { const n = new THREE.SphereGeometry(0.95, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.6); n.translate(0, 0.3, 0); return tint(n, '#7a8a6a'); }), BM.vcCloth(), 0, 0, 0); cBt.build();
    cA.slot = g;
  }
  yield;

  // ================================================================ the buildings: Tessa's shed, the customs hut
  {
    const p = P(SHEDB.x, FL, SHEDB.z);
    building(p, { w: SHEDB.w, d: SHEDB.d, h: 2.5, low: BM.glazeTiles(), up: BM.teal(), roof: BM.roof(), ridge: BM.celadonDeep(), trim: BM.ochre(), shutter: BM.brick(), leaf: BM.brick(),
      open: { s: [{ x: 0, y: 0, w: 1.0, h: 2.05, door: true }, { x: 1.9, y: 1.05, w: 0.9, h: 0.8 }], e: [{ x: 0, y: 1.0, w: 1.3, h: 0.95 }], n: [{ x: 1.4, y: 1.2, w: 0.7, h: 0.6 }] } });
    cols(p.cols);
    // the stove's ceramic pipe through the roof, the hoist beam out of the east gable, the sign over the door
    p.add(cached('blshedpipe', () => cyl(0.14, 0.14, 1.8, 10)), BM.celadonDeep(), -1.8, 3.6, -1.2);
    p.add(cached('blshedcowl', () => lathe([[0.001, 0.25], [0.3, 0.05], [0.26, 0], [0.001, 0.04]], 10)), BM.iron(), -1.8, 4.55, -1.2);
    p.add(cached('blhoist', () => bbox(1.6, 0.2, 0.2, 0.02, 1)), BM.post(), SHEDB.w / 2 + 0.5, 3.65, 0);
    p.add(cached('blhoistw', () => cyl(0.16, 0.16, 0.08, 10).rotateX(Math.PI / 2)), BM.bronze(), SHEDB.w / 2 + 1.15, 3.45, 0);
    p.add(tube([[SHEDB.w / 2 + 1.3, 3.45, 0], [SHEDB.w / 2 + 1.3, 1.6, 0]], 0.015, 3, 1), BM.rope());
    p.add(cached('blhoisthook', () => tube([[0, 0, 0], [0, -0.2, 0], [0.1, -0.3, 0], [0.15, -0.2, 0]], 0.025, 4, 1)), BM.iron(), SHEDB.w / 2 + 1.3, 1.6, 0);
    p.add(cached('blshedsign', () => bbox(1.0, 0.5, 0.06, 0.02, 1)), pm('#ffffff', 0.7, { map: ctex('blshedsignT', 128, 64, (x, W, H) => { x.fillStyle = '#e6b866'; x.fillRect(0, 0, W, H); x.strokeStyle = '#3f6c9c'; x.lineWidth = 6; x.beginPath(); x.arc(44, 32, 18, 0, 7); x.stroke(); x.beginPath(); x.moveTo(26, 32); x.lineTo(62, 32); x.stroke(); x.fillStyle = '#6a4a32'; x.fillRect(74, 28, 40, 8); x.beginPath(); x.arc(112, 32, 10, 0, 7); x.fill(); }, false) }), 0, 2.6, SHEDB.d / 2 + 0.06);
    p.add(cached('blshedlamp', () => new THREE.SphereGeometry(0.12, 8, 6)), BM.glow(), 0.85, 2.25, SHEDB.d / 2 + 0.25);
  }
  {
    const p = P(HUT.x, QY, HUT.z, -Math.PI / 2);   // (its front, the hatch, faces west: the top of the stairs)
    building(p, { w: HUT.s, d: HUT.s, h: 2.4, kind: 'hip', rise: 1.5, low: BM.cobaltTiles(), up: BM.cream(), roof: tm('roof', { color: '#7a9cc8', rough: 0.4 }), trim: BM.post(), plinthM: BM.cap(), leaf: BM.teal(),
      open: { s: [{ x: -0.3, y: 0.95, w: 1.4, h: 0.85 }], e: [{ x: 0.2, y: 0, w: 0.9, h: 2.0, door: true }] } });
    cols(p.cols);
    // the hatch's counter shelf, its striped awning, the tally slate, a cargo balance beside it
    p.add(cached('blhutcounter', () => bbox(1.7, 0.08, 0.5, 0.02, 1)), BM.timber(), -0.3, 0.95, HUT.s / 2 + 0.2);
    p.add(cached('blhutaw', () => { const g = new THREE.PlaneGeometry(2.0, 0.9, 6, 1); g.rotateX(-1.1); return g; }), pm('#ffffff', 0.9, { map: ctex('blawT', 64, 64, (x, W) => { for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#f2ead6' : '#5f9a86'; x.fillRect((i * W) / 4, 0, W / 4, W); } }), side: THREE.DoubleSide }), -0.3, 2.05, HUT.s / 2 + 0.35);
    p.add(cached('blhutslate', () => bbox(0.7, 0.9, 0.04, 0.02, 1)), pm('#2e3436', 0.8), 1.05, 1.4, HUT.s / 2 + 0.04);
    p.add(cached('blhutbell', () => lathe([[0.001, 0.2], [0.06, 0.18], [0.1, 0.05], [0.13, 0], [0.001, 0]], 10)), BM.bronze(), 0.55, 1.9, HUT.s / 2 + 0.3);
  }
  {
    // the cargo balance: a beam on a post, two pans, a weight on one
    const p = P(HUT.x - 1.0, QY, HUT.z - 3.3);
    p.add(cached('blbalpost', () => compose([[bbox(0.5, 0.2, 0.5, 0.03), 0, 0.1, 0], [bbox(0.2, 1.9, 0.2, 0.03), 0, 1.05, 0]])), BM.post());
    p.add(cached('blbalbeam', () => bbox(2.6, 0.12, 0.12, 0.02, 1)), BM.bronze(), 0, 2.0, 0, 0, 0, 0.06);
    for (const s of [-1, 1]) { p.add(tube([[s * 1.2, 2.0 - s * 0.07, 0], [s * 1.2, 1.05 - s * 0.07, 0]], 0.012, 3, 1), BM.iron()); p.add(cached('blbalpan', () => cyl(0.42, 0.34, 0.1, 12)), BM.bronze(), s * 1.2, 1.0 - s * 0.07, 0); }
    p.add(cached('blbalwt', () => cyl(0.16, 0.18, 0.3, 10)), BM.iron(), 1.2, 1.1 - 0.07, 0);
    crate(p, { s: 0.6, lx: -1.2, ly: 1.07, lry: 0.3 });
    p.box(0, 0, 1.6, 0.5, 2.1, { seeThrough: true }); cols(p.cols);
  }
  // the ship on the pad (the project's ship, as at Citadel Spaceport), merged into the batch
  {
    const sh = esmerShuttle({ landed: true, scale: 1.15 }); sh.position.set(PAD.cx, PD + 0.06, PAD.cz); sh.rotation.y = -0.6; sh.updateMatrixWorld(true);
    sh.traverse((m) => { if (m.isMesh) B.addM(m.geometry, m.material, m.matrixWorld.clone()); });
    col({ type: 'cyl', x: PAD.cx, z: PAD.cz, r: 3.6, top: PD + 4.6, noStand: true });
    // the gangplank down from its hatch
    const gp = P(PAD.cx + 3.6, PD, PAD.cz - 2.0, -0.6 + Math.PI / 2);
    gp.add(cached('blgplank', () => bbox(1.0, 0.08, 2.0, 0.02, 2.2)), BM.deck(), 0, 0.3, 0.6, 0.18);
  }
  yield;

  // ================================================================ life: lanterns, bollards, cargo, nets, washing, herbs, floating things
  const props = (p) => { cols(p.cols); return p; };
  const lan = (x, z, y, ry = 0) => props(lantern(P(x, y, z, ry)));
  lan(PAD.x1 - 0.6, 11.2, PD, Math.PI / 2); lan(PAD.x1 - 0.6, 25.2, PD, Math.PI / 2); lan(PAD.x0 + 0.6, 11.2, PD, -Math.PI / 2);
  lan(-8.5, ROW.z0 + 0.35, FL, 0); lan(2.0, ROW.z1 - 0.4, FL, Math.PI); lan(6.2, 9.3, QY, 0); lan(11.0, -6.0, QY, Math.PI / 2); lan(16.0, -16.0, QY, Math.PI / 2); lan(16.0, -27.0, QY, Math.PI / 2);
  lan(-5.6, 6.6, FL, -Math.PI / 2); lan(-14.4, -5.3, FL, Math.PI / 2); lan(-10.75, -16.0, FL, -Math.PI / 2); lan(-16.0, -28.0, PD, 0); lan(-25.0, -28.2, PD, 0); lan(-29.25, -2.0, FL, -Math.PI / 2);
  for (const [x, z] of [[12, 11.6], [16, 11.6], [21.6, 9], [21.6, 3], [21.6, -3], [14.4, -12], [14.4, -18], [14.4, -24], [-18.5, 22], [-33.6, 14], [-33.6, 22]]) props(bollard(P(x, x < -17 ? PD : QY, z)));
  // the quay: cargo by crane A's barge, by crane B, the jars waiting for customs, nets, a barrow, sacks
  props(crateStack(P(18.0, QY, 10.2, 0.2), { seed: 1, n: 3 })); props(crateStack(P(20.6, QY, 1.4, -0.3), { seed: 2, n: 4 })); props(crateStack(P(15.4, QY, -1.6, 0.1), { seed: 3, n: 2 }));
  props(crateStack(P(18.2, QY, -6.4, 0.5), { seed: 5, n: 3 }));
  props(jarCrate(P(11.6, QY, 11.0, 0.1), { seed: 1 })); props(jarCrate(P(15.6, QY, 5.6, -0.2), { seed: 2 }));
  props(netPile(P(20.4, QY, -9.6 + 2.0))); props(netRack(P(16.6, QY, -10.8 + 0.2, 0), { w: 2.8 })); props(netRack(P(16.6, QY, -14.0, 0), { w: 2.8, color: '#7a6a5a' }));
  props(barrow(P(13.2, QY, 1.6, 0.6)));
  { const p = P(18.8, QY, 7.2); sack(p, { lx: 0, lz: 0, lry: 0.2 }); sack(p, { lx: 0.55, lz: 0.1, lry: -0.4, color: '#cbb488' }); sack(p, { lx: 0.25, lz: 0.55, lry: 1.0 }); p.box(0.3, 0.25, 0.65, 0.6, 0.65, { block: true }); props(p); }
  for (const [x, z, s] of [[6.6, -6.4, 1], [7.6, -5.6, 0.8], [6.8, -4.6, 0.9]]) props(ballastPot(P(x, QY, z), { s, mat: s < 1 ? BM.terracotta() : BM.celadon() }));
  // the pad: luggage, a windsock
  props(crateStack(P(-20.6, PD, 23.6, 0.3), { seed: 7, n: 2 })); props(jarCrate(P(-31.4, PD, 12.4, -0.4), { seed: 3 }));
  { const p = P(-32.6, PD, 24.6); p.add(cached('blsockpole', () => cyl(0.06, 0.08, 5, 8)), BM.post(), 0, 2.5, 0); p.add(cached('blsock', () => tint(cyl(0.28, 0.1, 1.6, 10, 0, true).rotateZ(Math.PI / 2).translate(0.8, 0, 0), '#e6b866')), BM.vcCloth(), 0.06, 4.7, 0, 0, 0.6, 0); p.cyl(0, 0, 0.15, 5); props(p); }
  // the shed's float: herbs, the washing line, a bench by the door, a rain barrel, float parts on a trestle, rope
  for (const [x, z, k] of [[-6.0, 3.2, 1], [-5.7, 2.4, 0], [-6.2, 1.6, 3], [-14.2, 7.6, 1], [-13.6, 8.6, 2], [-12.6, 1.9, 0], [-7.1, 1.7, 1]]) herbPot(P(x, FL, z), { kind: k, s: 1.1 });
  col({ type: 'box', x: -6.0, z: 2.4, hw: 0.35, hd: 1.1, top: FL + 0.4, block: true }); col({ type: 'box', x: -13.9, z: 8.1, hw: 0.5, hd: 0.7, top: FL + 0.4, block: true });
  props(washingLine(P(-14.3, FL, 4.2, Math.PI / 2), { w: 3.6, h: 2.2, seed: 2 }));
  { const p = P(-8.2, FL, 2.1); p.add(cached('blbench', () => compose([[bbox(1.4, 0.07, 0.4, 0.02), 0, 0.45, 0], ...[-1, 1].map((s) => [bbox(0.08, 0.45, 0.36, 0.02), s * 0.6, 0.22, 0])])), BM.timber()); p.box(0, 0, 0.72, 0.22, 0.5, { block: true }); props(p); }
  { const p = P(-13.0, FL, 1.75); p.add(cached('blrainb', () => lathe([[0, 0], [0.34, 0], [0.38, 0.4], [0.36, 0.85], [0, 0.85]], 12, 1)), BM.timber()); for (const y of [0.15, 0.7]) p.add(cached('blrainbh' + y, () => new THREE.TorusGeometry(0.37, 0.02, 4, 14).rotateX(Math.PI / 2)), BM.iron(), 0, y, 0); p.cyl(0, 0, 0.4, 0.9, { block: true }); props(p); }
  { const p = P(-7.0, FL, 5.6, 0.4); for (const s of [-1, 1]) p.add(cached('bltrestle', () => compose([[bbox(0.08, 0.8, 0.7, 0.01), 0, 0.4, 0, 0.2, 0, 0], [bbox(0.08, 0.08, 0.9, 0.01), 0, 0.8, 0]])), BM.post(), s * 0.7, 0, 0); p.add(cached('blfpart', () => lathe([[0.001, -0.4], [0.3, -0.34], [0.42, 0], [0.34, 0.32], [0.001, 0.4]], 14).rotateZ(Math.PI / 2)), BM.celadon(), 0, 1.25, 0); p.add(cached('blfpartb', () => new THREE.TorusGeometry(0.42, 0.03, 4, 16).rotateY(Math.PI / 2)), BM.bronze(), 0.2, 1.25, 0); p.box(0, 0, 0.85, 0.5, 1.6); props(p); }
  for (let i = 0; i < 3; i++) B.add(cached('blcoil' + i, () => new THREE.TorusGeometry(0.3 - i * 0.05, 0.04, 5, 14).rotateX(Math.PI / 2)), BM.rope(), -14.0, FL + 0.04 + i * 0.07, -3.6);
  // the district's edge: benches, herbs on the rail, crates of greens for the market, a notice post (no words)
  props(crateStack(P(-21.0, PD, -34.6, 0.1), { seed: 8, n: 2, marks: ['#6e9a52', '#6e9a52', null] })); props(netPile(P(-29.4, PD, -34.4)));
  for (const [x, k] of [[-13.0, 1], [-12.3, 0], [-23.5, 3], [-24.2, 1]]) herbPot(P(x, PD, -35.3), { kind: k, s: 1.1 });
  { const p = P(-7.6, PD, -30.0, -Math.PI / 2); p.add(cached('blbench', () => null), BM.timber()); p.box(0, 0, 0.72, 0.22, 0.5, { block: true }); props(p); }
  // the barge alongside the quay under crane A, small boats moored (they bob), buoys, a herb raft
  {
    const p = P(21.6, 0, 16.6, 0.04);
    p.add(cached('blbarge', () => { const g = bbox(4.6, 1.3, 9.0, 0.3, 1.4); return g; }), BM.deckOld(), 0, 0.25, 0);
    p.add(cached('blbargerim', () => bbox(4.8, 0.2, 9.2, 0.05, 1)), BM.brick(), 0, 0.95, 0);
    p.add(cached('blbargehold', () => bbox(3.6, 0.1, 6.6, 0.02, 1)), BM.post(), 0, 0.96, 0.2);
    for (const [lx, lz] of [[-0.8, -2.0], [0.9, 1.4]]) crateStack(new Place(B, ...p.pt(lx, lz).flatMap((v, i) => (i ? [1.0, v] : [v])), 0.3), { seed: 11 + lx * 3, n: 2 });
  }
  const bobs = [];
  const bob = (geo, x, y, z, ry = 0) => bobs.push([geo, M4(x, y, z, ry), new THREE.Vector3(x, y, z)]);
  const skiffG = cached('blskiff', () => {
    const s = new THREE.Shape(); s.moveTo(-0.7, 1.7); s.lineTo(0.7, 1.7); s.quadraticCurveTo(0.8, -0.6, 0, -2.0); s.quadraticCurveTo(-0.8, -0.6, -0.7, 1.7);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.6, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1, curveSegments: 8 }); g.rotateX(Math.PI / 2); g.translate(0, 0.35, 0);
    return compose([[tint(g, '#c6684c')], [tint(bbox(1.2, 0.06, 2.8, 0.02), '#d6b690'), 0, 0.3, 0], [tint(bbox(1.3, 0.08, 0.2, 0.02), '#7a5c40'), 0, 0.42, 0.6], [tint(cyl(0.04, 0.05, 1.8, 6), '#7a5c40'), 0, 1.2, -0.4]], true);
  });
  const skiffG2 = cached('blskiff2', () => tint(skiffG.clone(), '#ffffff'));
  bob(skiffG, -3.0, 0, 18.8, 1.4); bob(skiffG, 8.0, 0, 18.4, 1.7); bob(skiffG, -16.4, 0, 3.0, 0.1); bob(skiffG, 23.6, 0, 6.0, 0.1);
  void skiffG2;
  for (const [x, z, c] of [[-1.5, 22, '#c8764e'], [12, 22, '#9cc8b4'], [-20, 4, '#c8764e'], [-20, -12, '#9cc8b4'], [26, -4, '#e6b866'], [-36, -6, '#c8764e'], [6, -36, '#9cc8b4']]) bob(buoyGeo(c), x, 0, z);
  const raft = cached('blraft', () => {
    const parts = [[tint(bbox(1.8, 0.16, 1.4, 0.03), '#ae9474'), 0, 0.05, 0]];
    for (let i = 0; i < 5; i++) parts.push([tint(lathe([[0, 0], [0.15, 0], [0.2, 0.28], [0, 0.28]], 8), '#c8764e'), -0.6 + (i % 3) * 0.6, 0.13, i < 3 ? -0.3 : 0.35], [tint(new THREE.SphereGeometry(0.17, 6, 4), i % 2 ? '#6a9a4a' : '#86ae56'), -0.6 + (i % 3) * 0.6, 0.52, i < 3 ? -0.3 : 0.35]);
    return compose(parts, true);
  });
  bob(raft, -16.6, 0, 7.8, 0.2); bob(raft, -4.4, 0, -12.6, -0.3); bob(raft, -7.0, 0, -20.0, 0.5);
  { const m = new THREE.Mesh(bobGeo(bobs), bobbed(BM.vc())); m.name = 'bl_floating'; m.castShadow = true; m.receiveShadow = true; m.userData.keep = true; group.add(m); }
  // gulls on the posts, the cranes, the gantry, the shed's ridge
  const gp = [{ x: 12, z: 11.6, y: QY + 0.7 }, { x: 16, z: 11.6, y: QY + 0.7 }, { x: 21.6, z: 3, y: QY + 0.7 }, { x: 14.4, z: -18, y: QY + 0.7 }, { x: -18.5, z: 22, y: PD + 0.7 },
    { x: 1.6, z: CWB.z, y: GY + 0.6 }, { x: -1.4, z: CWB.z, y: GY + 0.6 }, { x: SHEDB.x + 1.4, z: SHEDB.z, y: FL + 4.4 }, { x: SHEDB.x - 1.6, z: SHEDB.z, y: FL + 4.4 }, { x: CRA.x - 3.0, z: CRA.z, y: QY + 0.9 + CRA.h + 0.75 },
    { x: -21.6, z: 16.4, y: PD, ground: true }, { x: 15.0, z: 0.4, y: QY, ground: true }, { x: -12.0, z: 6.0, y: FL, ground: true }];
  const gulls = new Gulls({ parent: group, physics, name: 'bl_gulls', n: 7, seed: 23, perches: gp.map((p) => ({ ...p, x: p.x + ox, z: p.z + oz })) });
  // (the Gulls class works in its parent's frame for drawing but in world terms for the hero: its parent here is the
  //  region's group, so its perches are given in world coordinates and the group's offset is taken off when drawn)
  for (const m of [gulls.body, gulls.wing]) m.position.set(-ox, 0, -oz);
  B.build();
  yield;

  // ================================================================ the shortcut's swing bridge (moving)
  const bridge = new THREE.Group(); bridge.name = 'bl_swingBridge'; bridge.userData.keep = true; bridge.position.set(SC.piv.x, FL, SC.piv.z); group.add(bridge);
  {
    const bB = new Batch(bridge);
    bB.add(bbox(2.4, 0.26, SC.len, 0.03, 2.2), BM.deck(), 0, -0.13, -SC.len / 2);
    for (const s of [-1, 1]) bB.add(bbox(0.24, 0.5, SC.len, 0.03, 1.4), BM.post(), s * 1.25, -0.4, -SC.len / 2);
    for (const s of [-1, 1]) { for (let i = 0; i <= 4; i++) bB.add(cached('blbrp', () => bbox(0.1, 1.0, 0.1, 0.02, 1)), BM.post(), s * 1.15, 0.5, -0.3 - i * (SC.len - 0.6) / 4); bB.add(bbox(0.08, 0.1, SC.len - 0.4, 0.02, 1), BM.timber(), s * 1.15, 0.96, -SC.len / 2); }
    bB.add(cached('blbrturn', () => cyl(1.0, 1.0, 0.12, 18)), BM.bronze(), 0, 0.02, 0);
    bB.add(cached('blbrcw', () => bbox(1.8, 0.7, 1.2, 0.06, 1)), BM.celadonDeep(), 0, -0.25, 1.0);
    bB.build();
  }
  const BR_OPEN = 0, BR_SHUT = -Math.PI / 2;
  const bridgeCol = physics.add({ type: 'box', x: 0, z: 0, hw: 1.2, hd: SC.len / 2, rot: 0, top: FL, seeThrough: true });
  const bridgeRails = [-1, 1].map(() => physics.add({ type: 'box', x: 0, z: 0, hw: 0.09, hd: SC.len / 2 - 0.3, rot: 0, top: FL + 1.3, seeThrough: true, noStand: true }));
  const placeBridgeCols = (a) => {
    const dx = -Math.sin(a), dz = -Math.cos(a), cx = ox + SC.piv.x + dx * SC.len / 2, cz = oz + SC.piv.z + dz * SC.len / 2;
    Object.assign(bridgeCol, { x: cx, z: cz, rot: a }); physics.update(bridgeCol);
    [-1, 1].forEach((s, i) => { const R = bridgeRails[i]; Object.assign(R, { x: cx + Math.cos(a) * s * 1.15, z: cz - Math.sin(a) * s * 1.15, rot: a }); physics.update(R); });
  };

  // ================================================================ the shed's room
  const shed = buildShedRoom(scene, physics);
  yield;

  // ================================================================ the region's room object
  const W = (x, z, a) => ({ x: x + ox, z: z + oz, ...(a != null ? { a } : {}) });
  const spawns = { pad: W(PAD.x1 - 2.4, 14.6, Math.PI / 2), shedDoorOut: W(SHEDB.x, SHEDB.z + SHEDB.d / 2 + 1.4, 0), shedIn: { ...SHED.spawn }, districtEdge: W(-14.0, -31.6, 0) };
  const shedDoorOutside = { ...W(SHEDB.x, SHEDB.z + SHEDB.d / 2 + 0.5), r: 0.6, room: 'bl_shed' };
  const R = {
    id: 'ballastra', outdoor: true, sky: false, group, center: new THREE.Vector3(ox, 0, oz), lights: [], exits: [shedDoorOutside], searches: [], ballTargets: [], givers: [], updaters,
    music: 'harbour', env, spawn: spawns.pad, entries: { bl_shed: spawns.shedDoorOut },
    sounds: [{ kind: 'water', ...W(0, 12), r: 30, vol: 0.4 }, { kind: 'water', ...W(-10, -14), r: 24, vol: 0.35 }],
    safe: [W(PAD.x1 - 3, 18), W(12, 2), W(-9.5, 5.5), W(-16, -31)],
    colliders: statics,
    // points of the walkable harbour, for the tests (tests walk them by input)
    sample: [W(-22, 14.6), W(-10, 14), W(8, 14), W(8, 6), W(16, -4), W(16.5, -22), W(3.5, -3), W(0, 8.9), W(-9.5, 5.5), W(-9.75, -16), W(-14, -31.5), W(-28, -2), W(-28, -23)],
  };
  // what he walks on: the stone of the quay, the walls and the pad, the boards everywhere else
  Object.defineProperty(R, 'surface', { get() { const h = globalThis.game?.hero?.pos; if (!h) return 'wood'; const x = h.x - ox, z = h.z - oz; return STONE_RECTS.some(([a, b, c, d]) => x > a && x < c && z > b && z < d) ? 'stone' : 'wood'; } });

  // ================================================================ state and handles
  const S = { cw: 2, released: false, level: liftLevel(2, false), rim: LEVEL_Y[liftLevel(2, false)], rimFrom: 0, rimTo: 0, rimT: 1,
    cwY: CW_Y[2], cwFrom: 0, cwTo: 0, cwT: 1, crane: 0, craneTo: 0, seat: 0, boatOut: false, boatT: 0, boatTo: 0, gate: 0, sc: false, scA: BR_SHUT, scFrom: BR_SHUT, scTo: BR_SHUT, scT: 1, latch: 0, wheel: 0, crankA: 0, locked: false };
  const listeners = [];
  // the mechanisms' sounds (heard only here, within earshot; never for an instant set)
  const sfx = (name, x, z) => { const G = globalThis.game; if (!G || G.room !== R || G.state !== 'play') return; if (Math.hypot(G.hero.pos.x - ox - x, G.hero.pos.z - oz - z) < 40) G.audio?.play?.(name); };
  const changed = (what) => { for (const f of listeners) { try { f(what); } catch (e) { console.warn('ballastra harbor listener', e); } } };
  const MOVE_S = 1.5, CRANE_S = 2.6, SEAT_S = 1.4, BOAT_S = 9, BRIDGE_S = 4;
  const retarget = (instant) => {
    const lv = liftLevel(S.cw, S.released);
    const lvChanged = lv !== S.level; S.level = lv;
    if (instant) { S.rim = LEVEL_Y[lv]; S.rimT = 1; } else if (Math.abs(LEVEL_Y[lv] - S.rim) > 1e-3) { S.rimFrom = S.rim; S.rimTo = LEVEL_Y[lv]; S.rimT = 0; sfx('grind', 0, 0); }
    if (lvChanged) changed('level');
  };
  // the sail-out path: out of the caisson through the inner gate, round to the arm quay
  const SAIL = [[BOAT0.x, BOAT0.z], [0, -9.5], [0.6, -14.5], [4.2, -19.4], [9.0, -21.8], [MOOR.x, MOOR.z]];
  const sailCurve = new THREE.CatmullRomCurve3(SAIL.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'catmullrom', 0.4);
  const sailLen = sailCurve.getLength();
  const H = {
    rooms: ['ballastra', 'bl_shed'],
    spawns,
    doors: {
      shedOut: shedDoorOutside, shedIn: { ...SHED.door, r: 0.6, room: 'ballastra' },
      shed: { setLocked(b) { S.locked = !!b; R.exits = S.locked ? [] : [shedDoorOutside]; }, get locked() { return S.locked; } },
    },
    stands: {
      tessa_shed: { ...SHED.tessa }, tessa_quay: W(WX + 1.3, WZ + 1.4, -Math.PI / 2 - 0.4), tessa_lift: W(CH.x1 + 0.55, -4.6, -Math.PI / 2),
      docker1: W(19.2, 10.6, 0.3), docker2: W(14.4, 2.4, -Math.PI / 2), customs: W(HUT.x - HUT.s / 2 - 0.9, HUT.z - 0.2, -Math.PI / 2),
      boatOwner: W(CH.x1 + 1.4, -7.2, -Math.PI / 2 - 0.3), boatOwner_moored: W(15.0, -21.0, -Math.PI / 2),
    },
    spots: {
      crank: { ...W(WX + 1.05, WZ), r: 1.1 }, liftLever: { ...W(DX + 0.7, DZ + 0.3), r: 0.9 }, shedBench: { ...SHED.bench },
      get boat() { const p = boat.getWorldPosition(new THREE.Vector3()); return S.boatOut && S.boatT >= 1 ? { x: ox + 14.6, z: p.z, r: 1.4 } : { x: ox + CH.x1 + 0.6, z: p.z, r: 1.4 }; },
    },
    craneLatch: { x: LATCH.x - 0.2 + ox, y: LATCH.y - 0.45, z: LATCH.z + oz, r: 0.6 },
    safe: R.safe,
    sailPath: SAIL.map(([x, z]) => ({ x: x + ox, z: z + oz })),
    counterweight: {
      set(pos, instant = false) {
        pos = clamp(Math.round(pos), 0, 2); const was = S.cw; S.cw = pos;
        if (instant) { S.cwY = CW_Y[pos]; S.cwT = 1; } else if (pos !== was) { S.cwFrom = S.cwY; S.cwTo = CW_Y[pos]; S.cwT = 0; sfx('ropeCreak', CWB.x, CWB.z); }
        S.seatTo = S.released && S.cw === 1 ? 1 : 0; if (instant) S.seat = S.seatTo;
        retarget(instant); if (pos !== was) changed('counterweight');
      },
      get pos() { return S.cw; },
    },
    crane: {
      release(instant = false) { const was = S.released; if (!was && !instant) { sfx('clang', CRB.x, CRB.z); sfx('ropeCreak', CRB.x, CRB.z); } S.released = true; S.craneTo = 1; S.seatTo = S.cw === 1 ? 1 : 0; if (instant) { S.crane = 1; S.seat = S.seatTo; S.latch = 1; } retarget(instant); if (!was) changed('crane'); },
      reset(instant = false) { const was = S.released; if (was && !instant) sfx('ropeCreak', CRB.x, CRB.z); S.released = false; S.craneTo = 0; S.seatTo = 0; if (instant) { S.crane = 0; S.seat = 0; S.latch = 0; } retarget(instant); if (was) changed('crane'); },
      get released() { return S.released; },
    },
    lift: { get level() { return S.level; }, get levelName() { return LEVEL_NAME[S.level]; }, get y() { return S.rim; }, get moving() { return S.rimT < 1; }, LEVELS: LEVEL_Y.slice() },
    walkway: { get blocked() { return S.released && S.cw !== 1; }, get solid() { return loadCol.enabled; } },
    get balanced() { return S.released && S.cw === 1; },
    boat: {
      sailOut(instant = false) { if (S.boatOut) return; S.boatOut = true; S.boatTo = 1; if (instant) { S.boatT = 1; S.gate = 0; } placeBoat(); changed('boat'); },
      reset(instant = false) { if (!S.boatOut) return; S.boatOut = false; S.boatT = 0; S.gate = 0; placeBoat(); changed('boat'); void instant; },
      get out() { return S.boatOut; },
      get free() { return S.level === 2; },
      get sailing() { return S.boatOut && S.boatT < 1; },
    },
    shortcut: {
      setOpen(b, instant = false) { b = !!b; if (b === S.sc && (instant || S.scT >= 1)) return; S.sc = b; const to = b ? BR_OPEN : BR_SHUT; if (instant) { S.scA = to; S.scT = 1; placeBridgeCols(to); bridgeCol.enabled = true; for (const r2 of bridgeRails) r2.enabled = true; } else { S.scFrom = S.scA; S.scTo = to; S.scT = 0; } changed('shortcut'); },
      get open() { return S.sc; },
      get swinging() { return S.scT < 1; },
    },
    onChange(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    // (for tests and pictures: the build's numbers)
    plan: { LEVEL_Y, CW_Y, levelOf: liftLevel },
  };
  R.harbor = H; R.npcSpots = H.stands; BALLASTRA.harbor = H;
  shed.harbor = H;

  // ---- the boat: in the caisson (riding its deck) or sailing out / moored in the basin
  function placeBoat() {
    if (!S.boatOut || S.boatT <= 0) {
      if (boat.parent !== cais) cais.add(boat);
      boat.position.set(BOAT0.x, R0 - 0.45, BOAT0.z); boat.rotation.y = 0; boatCol.enabled = true;
      return;
    }
    if (boat.parent !== group) group.add(boat);
    const u = ease(Math.min(1, S.boatT)), p = sailCurve.getPointAt(u), t2 = sailCurve.getTangentAt(Math.min(0.999, u));
    const y = (1 - Math.min(1, S.boatT * 6)) * (S.rim - 0.45) + Math.min(1, S.boatT * 6) * (WI - 0.02);
    boat.position.set(p.x, y, p.z); boat.rotation.y = Math.atan2(-t2.x, -t2.z);
    boatCol.enabled = false;
  }
  // ---- per frame
  const _v = new THREE.Vector3();
  let dryAt = null, wetT = 0;
  updaters.push((dt, t) => {
    sea.update(dt, t); BOB.t.value = t;
    // the counterweight, the deck
    if (S.cwT < 1) { S.cwT = Math.min(1, S.cwT + dt / MOVE_S); S.cwY = S.cwFrom + (S.cwTo - S.cwFrom) * ease(S.cwT); S.crankA += dt * 6; }
    const rim0 = S.rim;
    if (S.rimT < 1) { S.rimT = Math.min(1, S.rimT + dt / MOVE_S); S.rim = S.rimFrom + (S.rimTo - S.rimFrom) * ease(S.rimT); if (S.rimT >= 1) sfx('clunk', 0, 0); }
    const dRim = S.rim - rim0; S.wheel += dRim / 0.55;
    cais.position.y = S.rim - R0;
    cwG.position.y = S.cwY;
    for (const k of cCols) k.c.top = S.rim + k.dy;
    if (!S.boatOut) boatCol.top = S.rim + 2.0;
    // chains: the deck's from the caisson's lugs to the beam, the counterweight's from its lug to the beam
    const deckTop = S.rim + 0.4, cwTop = S.cwY + CWB.h + 0.6, beam = GY + 0.1;
    for (const m of deckChains) { m.position.y = (deckTop + beam) / 2; m.scale.y = beam - deckTop; }
    deckChainM.map.repeat.y = (beam - deckTop) / 0.42; deckChainM.map.offset.y = -S.rim / 0.42;
    cwChain.position.y = (cwTop + beam) / 2; cwChain.scale.y = beam - cwTop; cwChainM.map.repeat.y = (beam - cwTop) / 0.42; cwChainM.map.offset.y = -S.cwY / 0.42;
    for (const w of wheels) w.rotation.z = S.wheel;
    crankG.rotation.z = S.crankA;
    needle.rotation.z = Math.PI * (1.1 - ((S.rim - LEVEL_Y[0]) / (LEVEL_Y[1] - LEVEL_Y[0])) * 0.4) - Math.PI / 2;
    // crane B: slew from rest to the lift, the load onto the counterweight's cradle (balanced) or onto the walkway
    if (S.crane !== S.craneTo) { S.crane = S.craneTo > S.crane ? Math.min(S.craneTo, S.crane + dt / CRANE_S) : Math.max(S.craneTo, S.crane - dt / CRANE_S); if (S.crane === 1) sfx(S.seatTo ? 'clunk' : 'thump', LOAD.block.x, LOAD.block.z); }
    S.seatTo = S.released && S.cw === 1 ? 1 : 0;
    if (S.seat !== S.seatTo) S.seat = S.seatTo > S.seat ? Math.min(1, S.seat + dt / SEAT_S) : Math.max(0, S.seat - dt / SEAT_S);
    S.latch = S.released ? Math.min(1, S.latch + dt * 3) : Math.max(0, S.latch - dt * 2);
    latchArm.rotation.z = S.latch * 1.9;
    {
      const C = cB2.C, k = ease(S.crane), s2 = ease(S.seat);
      const seatP = { x: CWB.x, z: CWB.z, y: S.cwY + CWB.h + 0.13 }, at = { x: LOAD.block.x + (seatP.x - LOAD.block.x) * s2, z: LOAD.block.z + (seatP.z - LOAD.block.z) * s2, y: LOAD.block.y + (seatP.y - LOAD.block.y) * s2 + Math.sin(Math.PI * s2) * 1.2 };
      const pol = (p) => ({ a: Math.atan2(-(p.z - C.z), p.x - C.x), r: Math.hypot(p.x - C.x, p.z - C.z), y: p.y });
      const A = pol(LOAD.rest), Bp = pol(at);
      const a = A.a + wrapA(Bp.a - A.a) * k, r = A.r + (Bp.r - A.r) * k, y = A.y + (Bp.y - A.y) * k + Math.sin(Math.PI * k) * 1.6;
      cB2.head.rotation.y = a; cB2.trolley.position.x = r;
      const lx = C.x + Math.cos(a) * r, lz = C.z - Math.sin(a) * r;
      load.position.set(lx, y, lz); load.rotation.y = a;
      const top = QY + 0.9 + C.h + 0.25, ly = y + 1.3;
      cB2.cable.position.set(lx, top, lz); cB2.cable.scale.y = Math.max(0.1, top - ly - 0.3); cB2.hook.position.set(lx, ly + 0.25, lz);
      loadCol.enabled = S.released && S.cw !== 1 && k > 0.6 && s2 < 0.35;
    }
    {
      const C = cA.C, a = -1.35 + Math.sin(t * 0.05) * 0.05, r = 7.0;
      cA.head.rotation.y = a; cA.trolley.position.x = r;
      const lx = C.x + Math.cos(a) * r, lz = C.z - Math.sin(a) * r, ly = QY + 1.8 + Math.sin(t * 0.7) * 0.03;
      cA.slot.position.set(lx, ly, lz);
      const top = QY + 0.9 + C.h + 0.25; cA.cable.position.set(lx, top, lz); cA.cable.scale.y = top - ly - 1.9; cA.hook.position.set(lx, ly + 1.75, lz);
    }
    // the boat and the inner gate
    if (S.boatOut && S.boatT < 1) {
      if (S.gate === 0) sfx('clunk', 0, CH.z0);
      S.gate = Math.min(1, S.gate + dt / 1.5);
      if (S.gate >= 1) S.boatT = Math.min(1, S.boatT + dt / BOAT_S);
      placeBoat();
    } else if (S.boatOut && S.boatT >= 1 && S.gate > 0) S.gate = Math.max(0, S.gate - dt / 2.5);
    else if (!S.boatOut) S.gate = Math.max(0, S.gate - dt / 2.5);
    setGate(ease(S.gate));
    if (S.boatOut && S.boatT >= 1) boat.position.y = WI - 0.02 + Math.sin(t * 1.1) * 0.025;
    // the swing bridge
    if (S.scT < 1) {
      S.scT = Math.min(1, S.scT + dt / BRIDGE_S); S.scA = S.scFrom + (S.scTo - S.scFrom) * ease(S.scT);
      if (bridgeCol.enabled) sfx('grind', SC.piv.x, SC.piv.z);
      bridgeCol.enabled = false; for (const r2 of bridgeRails) r2.enabled = false;
      if (S.scT >= 1) { sfx('clunk', SC.piv.x, SC.piv.z); placeBridgeCols(S.scA); bridgeCol.enabled = true; for (const r2 of bridgeRails) r2.enabled = true; }
    }
    bridge.rotation.y = S.scA;
    // the life: gulls; the soft edge (anyone over the water without a floor under him is eased back to where he stood)
    const G = globalThis.game;
    if (!G || G.room !== R) return;
    const h = G.hero;
    gulls.update(G.state === 'play' ? dt : 0, { outdoors: true, hero: { x: h.pos.x, y: h.pos.y, z: h.pos.z, speed: h.speed || 0 }, near: [] });
    if (G.state !== 'play' || G.trans) return;
    const gi = physics.groundInfo(h.pos.x, h.pos.z, h.pos.y + 0.6);
    if (gi.brick || gi.h >= WATER_FLOOR) { if (h.onGround) dryAt = { x: h.pos.x, z: h.pos.z }; wetT = 0; return; }
    wetT += dt;
    const to = dryAt || nearestSafe(h.pos);
    _v.set(to.x - h.pos.x, 0, to.z - h.pos.z);
    const d = _v.length();
    if (wetT > 1.2 || d < 0.05) { h.pos.x = to.x; h.pos.z = to.z; h.pos.y = physics.groundAt(to.x, to.z, 60); h.vy = 0; h.onGround = true; wetT = 0; return; }
    const step = Math.min(d, dt * 3.5); h.pos.x += (_v.x / d) * step; h.pos.z += (_v.z / d) * step;
  });
  const nearestSafe = (p) => { let best = R.safe[0], bd = Infinity; for (const s of R.safe) { const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < bd) { bd = d; best = s; } } return best; };
  // the start: the counterweight low, the crane latched, the deck stranded halfway, the boat aboard, the shortcut shut
  H.counterweight.set(2, true); H.crane.reset(true); H.shortcut.setOpen(false, true);
  placeBridgeCols(BR_SHUT);
  updaters[0](0, 0);
  // the shed's door handle on its room too (the story may read it there)
  return { ballastra: R, bl_shed: shed };
}
