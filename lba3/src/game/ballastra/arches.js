// W-2 · The Arch District (EXPANSION_WORLD_SPEC.md): the district under and on Ballastra's great arch, the region
// 'bl_arches' and its rooms 'bl_oren', 'bl_mags', 'bl_pump' (archrooms.js). The place only: the story (the cloud's)
// drives its moving parts through BALLASTRA.arches; the residents (W-7) stand on its spots.
//
// One idea, in form rather than paint: a city that lives by the water's level. The lower canal is a walled basin
// whose level the old pumps and the spill gate set: 0 flooded, 1 balanced, 2 low. Everything built on it is built to
// rise and fall with it or to stand clear of it, and keeps the record of where it has been:
//   - the market float rides the level on its corner piles, and its two hinged gangways tilt with it (the one to the
//     row is drawn up out of the water while the row is flooded);
//   - the lower row: narrow, tall houses on stilts, the living floor on top (jettied out on brackets), the wet floor
//     below stained a metre up, a salt line and older marks with dried weed on every wall, three worn doorstep heights
//     (the door's step, the walkway, the boat step a hand above the balanced water), boats tied at two heights,
//     washing lines run from the high floor, hoist beams in the gables; the boarded walkway in front;
//   - the Speaking Steps: a round stone platform whose tiers go down into the canal: the water says how many show;
//   - the level gauge painted on the arch's pier (no words), its bronze float riding the water;
//   - the arch and the old pump machinery (a glazed-ceramic cylinder and a bronze beam on the west pier) are the only
//     big shapes; the upper terrace on the east shoulder is dry, older, glazed tile and stone, with the flood bell.
//
// The plan (local metres, x east, z south; the hero comes in from the harbour in the south):
//   heights: the outer sea 0; the canal 2.25 / 1.4 / 0.4 (levels 0 / 1 / 2); the row's walkway 1.75, its boat steps
//   1.55, the houses' floors 2.0; the quays, the west ledge, the Steps' platform and the dykes 2.8; the terrace 7.0.
//   - the landing (1.4) from the harbour's gate and steps up to the south quay (2.8): the notice board, the jetty north
//     to the market's gangway; the Speaking Steps east of it; the terrace's wide stair up at the quay's east end;
//   - the west ledge along the arch's west pier: the pump room's door, the level gauge on its water face; a stair down
//     at its north end to the walkway;
//   - the lower row along the basin's north side (eight houses; Mags's the third from the west, Dunn's the fifth,
//     older and sunk lower, its door silted); the walkway; a narrow stair up the terrace's wall at its east end;
//   - the upper terrace: Oren's house and an older neighbour on its north part (by the arch's east leg), the bell tower
//     and a third house on its south plaza; the way on to the gardens (W-3) through the plaza's east gate.
//
// CONTRACT (world coordinates; every setter is a pure state setter, `instant` for loading, safe to call any time)
//   ARCHES_AT {x, z}; buildArchesSteps(scene, physics) (a generator, regions.js builds it in steps) /
//   buildArches(scene, physics) → { bl_arches, bl_oren, bl_mags, bl_pump }
//   BALLASTRA.arches = H:
//     rooms ['bl_arches', 'bl_oren', 'bl_mags', 'bl_pump'] · spawns {fromHarbor, fromGardens, orenIn, orenOut, magsIn,
//       magsOut, pumpIn, pumpOut, steps} {x, z, a}
//     exits {toHarbor (active: to W-1's districtEdge), toGardens (data: W-3's fromArches, for the story to enable)}
//     doors {orenOut, orenIn, magsOut, magsIn, pumpOut, pumpIn} {x, z, r, room} (both ways, active as room exits)
//     stands {oren_table, oren_terrace, oren_steps, mags_house, mags_row, mags_steps, dunn_door, corvin_stall,
//       hobb_market, tessa_steps, tessa_pump, tib_bell, quill_steps, row1…row4, market1…market3} {x, z, a}
//     spots {orenPlan, pumpPlates, pumpMachine, spillWheel, dunnDoor, noticeBoard, bellPull, bellCam, bellHorn0…2}
//       {x, z, r} · safe [{x, z}] (several)
//     ballTargets {spillPawl} · swordTargets {spillChain, dunnSilt} {x, y, z, r}
//     canal.setLevel(0|1|2, instant), .level, .y (the water now), .moving
//     row.setHome(b, instant), .home (washing out, shutters open, boats tied; level 0 keeps them in and shut)
//     dunnDoor.setOpen(b, instant), .open · silt.setHits(n 0…3, instant), .hits, .cleared
//     chain.cut(instant), chain.reset(instant), .severed · pawl.release(instant), pawl.reset(instant), .released
//     spillGate.setOpen(b, instant), .open, .moving
//     bell.untie(instant), bell.tie(instant), .tied · bell.setHorn(i, dir 0 terrace | 1 lower row | 2 gardens,
//       instant), .horns · bell.setCam(0|1, instant), .cam · bell.ring() → { tones, horns } (refused while tied:
//       null), .ringing
//     onChange(fn)  fn(what) after any state change ('canal', 'row', 'dunnDoor', 'silt', 'chain', 'pawl', 'spillGate',
//       'bell')
//   Collision follows the state: the walkway and its boat steps are floors only while dry (level 1 and 2), boards
//   close its three ways in at level 0 (the west stair's foot, the east stair's foot, the market's gangway drawn up);
//   the market float and its gangways at the level's height; the Steps' tiers are floors where they are dry; the silt
//   heap and Dunn's door solid until cleared and opened; the pump room's gate solid until open.
import * as THREE from 'three';
import { Batch, cached, bbox, cyl, lathe, tube, compose, tint, tm, pm, ctex, boxUV } from '../kit.js';
import { Place } from '../props-esmer.js';
import { BM, BOB, bobbed, bobGeo, M4, deckSlab, railRun, stepsGeo, lantern, bollard, crateStack, jarCrate, sack, netPile, herbPot, ballastPot, buoyGeo } from './look.js';
import { AM, tallHouse, tideMarks, skiffGeo, stall, gaugeTex, weedGeo } from './archhouses.js';
import { seaSetup, setBedShape } from './sea.js';
import { archGeo, archLine, archW } from './skyline.js';
import { buildArchRooms, ROOMS } from './archrooms.js';
import { BALLASTRA, BALLASTRA_AT } from './common.js';
import { Gulls } from '../gulls.js';
import { WATER_FLOOR } from '../../engine/physics.js';
import { fbm, rng, smoothstep } from '../../engine/math.js';

export { BALLASTRA };
export const ARCHES_AT = BALLASTRA_AT.bl_arches;

// ------------------------------------------------------------------ the plan
const WL = [2.25, 1.4, 0.4];                 // the canal's water: 0 flooded, 1 balanced, 2 low
const LEVEL_NAME = ['flooded', 'balanced', 'low'];
const WALK_Y = 1.75, BOAT_STEP = 1.55, FLOOR = 2.0, QY = 2.8, TER = 7.0, LANDY = 1.4;
const FLOAT_DY = 0.6, FLOAT_MIN = 1.05;      // the market float's deck over the water; aground on the mud at its lowest
const BASIN = { x0: -20, x1: 20, z0: -37, z1: 4 };
const WALK = { x0: -20, x1: 20, z0: -30.5, z1: -28.5 };
const LEDGE = { x0: -24, x1: -20, z0: -25, z1: 4 };
const PIER = { x0: -40, x1: -24, z0: -20, z1: 0, top: 9 };
const QUAY = { x0: -40, x1: 20, z0: 4, z1: 14 };
const TERR = [[20, -40, 40, -18], [20, -18, 24.5, -2], [20, -2, 40, 2], [24, 2, 40, 14]];
const COLLAR = { x0: 24.5, x1: 39.5, z0: -18.5, z1: -1.5, top: TER + 1.0 };
const JETTY = { x0: -7.5, x1: -3.5, z0: -3, z1: 4 };
const FLOAT = { x0: -11, x1: 3, z0: -22, z1: -10 };
const GS = { x0: -6.6, x1: -4.6, zA: -3, zB: -10 };      // the gangway jetty → float (fixed at the jetty)
const GN = { x0: -6.6, x1: -4.6, zA: -28.5, zB: -22 };   // the gangway walkway → float (fixed at the walkway)
const STEPS = { x: 8, z: 0, r: 5, ring: 0.8, tiers: [2.4, 2.0, 1.6, 1.2, 0.8, 0.4] };
const LAND = { x0: -12, x1: -4, z0: 18, z1: 24 };
const ESTAIR = { x0: 18, x1: 20, z0: -28.5, l1: -21, l2: -18.5, z1: -10, land: 4.39 };   // the narrow stair up the terrace wall
const ARCH = { xc: 0, z: -10, rx: 32, ry: 40, foot: -4 };
const BELL = { x: 33, z: 7.5, s: 4.2, h: 5.2 };           // the bell tower's base (on the terrace's south plaza)
const GATE_E = { x: 40, z: 8 };                            // the way on to the gardens
// the lower row: [x, w, kind] (Mags's is 2, Dunn's is 4)
const ROW = [[-17.2, 4.0], [-12.4, 3.6], [-7.2, 4.4], [-2.0, 3.8], [3.2, 4.2], [8.4, 3.6], [13.0, 4.0], [17.0, 2.6]];
const MAGS = 2, DUNN = 4, ROW_Z = -33.5, ROW_D = 5;
const BOATS = [1, 3, 5, 6];                                // the houses whose boats are tied at their steps when home
const SILT_H = [1.0, 0.7, 0.38, 0];
const HORN_DIRS = [Math.PI, -0.35 + Math.PI * 1.5, Math.PI / 2];   // the horns' yaw (local): terrace (north), lower row (west-north-west), gardens (east)

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// the canal's bed (local): mud in the basin, banked up along the row and the ledge; the outer sea round the district
function bedShape() {
  const inB = (x, z) => x > BASIN.x0 && x < BASIN.x1 && z > BASIN.z0 && z < BASIN.z1;
  return {
    bed(x, z) {
      if (inB(x, z)) {
        let h = 0.05 + (fbm(x * 0.21 + 4, z * 0.21 - 2, 2) - 0.5) * 0.18;
        h = Math.max(h, 0.62 - Math.max(0, z + 37) * 0.06);                 // (the bank under the row)
        h = Math.max(h, 0.5 - Math.max(0, x + 20) * 0.12);                  // (the ledge's foot)
        h = Math.max(h, 0.45 - Math.max(0, 20 - x) * 0.12);                 // (the terrace wall's foot)
        return Math.min(h, 0.75);
      }
      const r = Math.hypot(x / 60, (z + 10) / 52);
      return Math.min(-0.65, -4.6 + smoothstep(1.3, 0.75, r) * 3.6 + (fbm(x * 0.05 + 2.2, z * 0.05 + 7.1, 3) - 0.5) * 0.7);
    },
    color(x, z, y, c) {
      if (!inB(x, z)) return;
      const w = fbm(x * 0.3 + 1.7, z * 0.3 - 4.1, 2);
      c.set(y > 0.35 ? '#857654' : '#6c624a');
      if (w > 0.58) c.lerp(new THREE.Color('#5c6a3c'), 0.6);
      if (y > 0.5) c.lerp(new THREE.Color('#9a8a66'), 0.5);
    },
  };
}

export function buildArches(scene, physics) { const it = buildArchesSteps(scene, physics); let r = it.next(); while (!r.done) r = it.next(); return r.value; }

export function* buildArchesSteps(scene, physics) {
  const ox = ARCHES_AT.x, oz = ARCHES_AT.z;
  const group = new THREE.Group(); group.name = 'bl_arches'; group.visible = false; group.position.set(ox, 0, oz); scene.add(group);
  const B = new Batch(group);
  const P = (x, y, z, ry = 0) => new Place(B, x, y, z, ry);
  const statics = [];
  const col = (c) => { const w = physics.add({ ...c, x: c.x + ox, z: c.z + oz }); statics.push(w); return w; };
  const cols = (list) => { for (const c of list) col(c); };
  const box = (x0, z0, x1, z1, top, o = {}) => col({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, top, ...o });
  const keep = (o) => { o.userData.keep = true; return o; };
  const updaters = [];
  const sb = (w, h, d, tile = 1.8) => cached(`blw2sb${w.toFixed(2)}|${h.toFixed(2)}|${d.toFixed(2)}|${tile}`, () => boxUV(new THREE.BoxGeometry(w, h, d), tile));   // (big plain masses: no bevel)

  // ================================================================ the sea, the canal's water, the arch
  setBedShape(bedShape());
  const env = { fog: '#d6e6e2', sun: '#fff2dc', hemiSky: '#d2e6f0', hemiGround: '#8c9a7e', sunI: 2.45, hemiI: 1.32, fogRange: [70, 300], sunDir: [-0.5, 0.8, 0.35] };
  const sea = seaSetup(group, ox, oz, physics, { picture: null, sunDir: env.sunDir, env: { deep: '#2a7e88', shallow: '#68c6b2', sky: '#d6e8e8' } });
  const canalW = sea.inner(BASIN.x0, BASIN.z0, BASIN.x1, BASIN.z1, WL[0]); canalW.name = 'bl_canal';
  {
    const arch = new THREE.Mesh(archGeo(ARCH, { seg: 80, ring: 16 }), pm('#ffffff', 0.9, { vertexColors: true })); arch.castShadow = true; arch.receiveShadow = true; arch.name = 'bl_greatArch'; group.add(arch);
    const far = new THREE.Mesh(archGeo({ xc: -120, z: -210, rx: 24, ry: 30, foot: -4 }, { seg: 40, ring: 10 }), pm('#ffffff', 0.95, { vertexColors: true })); far.name = 'bl_farArch'; group.add(far);
    // the arch's legs: solid, and never stood on
    col({ type: 'box', x: -32, z: ARCH.z, hw: 7.6, hd: 8.6, top: 40, block: true });
    col({ type: 'box', x: 32, z: ARCH.z, hw: 7.2, hd: 8.2, top: 40, block: true });
  }
  yield;

  // ================================================================ stone: the quays, the ledge, the pier, the dykes, the terrace
  const pave = tm('stone', { color: '#f0e4c8', rough: 0.88 });   // (big pale flags: Ballastra's quays are laid like its ware, not cobbled)
  const mass = (x0, z0, x1, z1, top, { paveM = pave, bottom = -2.4, wetTop = 1.0, cap = true, colTop = true, stone = BM.stone() } = {}) => {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    B.add(sb(w, wetTop - bottom, d, 1.7), BM.wet(), cx, (bottom + wetTop) / 2, cz);
    B.add(sb(w + 0.02, top - 0.14 - wetTop, d + 0.02, 1.8), stone, cx, wetTop + (top - 0.14 - wetTop) / 2, cz);
    if (cap) B.add(sb(w + 0.16, 0.18, d + 0.16, 1.2), BM.cap(), cx, top - 0.09, cz);
    if (paveM) B.add(sb(w - 0.12, 0.04, d - 0.12, 1.9), paveM, cx, top + 0.005, cz);
    if (colTop) box(x0, z0, x1, z1, top);
  };
  mass(QUAY.x0, QUAY.z0, QUAY.x1, QUAY.z1, QY);
  mass(LEDGE.x0, LEDGE.z0, LEDGE.x1, LEDGE.z1, QY);
  mass(-40, 0, -24, 4, QY, { cap: false });
  mass(JETTY.x0, JETTY.z0, JETTY.x1, JETTY.z1, QY);
  // the dykes that hold the basin: west of the walkway and north behind the row (no walking on them: the row's backs)
  mass(-24, -39, -20, -30.5, QY, { colTop: false }); box(-24, -39, -20, -30.5, QY + 0.6, { block: true });
  mass(-24, -39, 22, -37, QY, { colTop: false }); box(-24, -39, 22, -37, QY + 0.6, { block: true });
  // the landing below the west stair (stone, at the walkway's height)
  mass(-24, -30.5, -20, -28.5, WALK_Y, { paveM: tm('stone', { color: '#d8ccb0', rough: 0.9 }), wetTop: 0.9, colTop: false });
  const landCol = col({ type: 'box', x: -22, z: -29.5, hw: 2, hd: 1, top: WALK_Y });
  // the west pier at the arch's foot: dressed stone to 9 m, the rock rising out of it; a cornice; the pump room's door
  {
    const { x0, x1, z0, z1, top } = PIER, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    B.add(sb(w, top + 2.4, d, 2.0), AM.ashlar(), cx, (top - 2.4) / 2, cz);
    B.add(sb(w + 0.5, 0.4, d + 0.5, 1.2), BM.cap(), cx, top - 0.2, cz);
    B.add(sb(w + 0.24, 0.24, d + 0.24, 1.2), BM.cap(), cx, QY + 1.2, cz);
    for (const z of [z0 + 2, z1 - 2]) { B.add(sb(0.9, top - QY, 1.0, 1.6), AM.ashlar(), x1 + 0.3, QY + (top - QY) / 2, z); box(x1 - 0.2, z - 0.5, x1 + 0.75, z + 0.5, top, { block: true }); }   // (pilasters)
    col({ type: 'box', x: cx, z: cz, hw: w / 2, hd: d / 2, top: top + 30, block: true });
  }
  // the upper terrace (dressed stone, older) and the collar round the arch's east leg
  for (const [x0, z0, x1, z1] of TERR) mass(x0, z0, x1, z1, TER, { stone: AM.ashlar(), paveM: tm('stone', { color: '#eadfc6', rough: 0.88 }) });
  B.add(sb(COLLAR.x1 - COLLAR.x0, COLLAR.top - TER + 0.4, COLLAR.z1 - COLLAR.z0, 1.6), AM.ashlar(), (COLLAR.x0 + COLLAR.x1) / 2, (COLLAR.top + TER - 0.4) / 2, (COLLAR.z0 + COLLAR.z1) / 2);
  B.add(sb(COLLAR.x1 - COLLAR.x0 + 0.3, 0.2, COLLAR.z1 - COLLAR.z0 + 0.3, 1.2), BM.cap(), (COLLAR.x0 + COLLAR.x1) / 2, COLLAR.top, (COLLAR.z0 + COLLAR.z1) / 2);
  // the terrace's parapets (where it drops to the quay, the basin, the sea), a gap at each stair head
  {
    const par = (x0, z0, x1, z1) => { const w = Math.max(0.4, x1 - x0), d = Math.max(0.4, z1 - z0); B.add(sb(w, 0.7, d, 1.6), AM.ashlar(), (x0 + x1) / 2, TER + 0.35, (z0 + z1) / 2); B.add(sb(w + 0.12, 0.12, d + 0.12, 1.2), BM.cap(), (x0 + x1) / 2, TER + 0.76, (z0 + z1) / 2); box(x0, z0, x1, z1, TER + 0.82, { block: true }); };
    par(20, -40, 20.4, -10); par(20, -6, 20.4, 2); par(20, -40, 40, -39.6); par(39.6, -40, 40, 6.6); par(39.6, 9.4, 40, 14); par(24, 13.6, 40, 14);
    par(24, 2, 24.4, 13.6);
  }
  // the quay's edges: a low kerb of cap stones along the water and the landing's drop (bollards stand on it)
  box(-20, 3.6, JETTY.x0, 4.0, QY + 0.35, { block: true }); box(JETTY.x1, 3.6, STEPS.x - 5.2, 4.0, QY + 0.35, { block: true }); box(STEPS.x + 5.2, 3.6, 20, 4.0, QY + 0.35, { block: true });
  for (const [x0, x1] of [[-20, JETTY.x0], [JETTY.x1, STEPS.x - 5.2], [STEPS.x + 5.2, 20]]) B.add(sb(x1 - x0, 0.36, 0.4, 1.2), BM.cap(), (x0 + x1) / 2, QY + 0.18, 3.8);
  box(-20.4, -25, -20, 3.6, QY + 0.35, { block: true }); B.add(sb(0.4, 0.36, 28.6, 1.2), BM.cap(), -20.2, QY + 0.18, -10.7);
  for (const [x0, x1] of [[QUAY.x0, LAND.x0], [LAND.x1, QUAY.x1]]) { B.add(sb(x1 - x0, 0.36, 0.4, 1.2), BM.cap(), (x0 + x1) / 2, QY + 0.18, 13.8); box(x0, 13.6, x1, 14, QY + 0.35, { block: true }); }
  for (const [x0, z0, x1, z1] of [[JETTY.x0, JETTY.z0, JETTY.x0 + 0.4, JETTY.z1 - 0.4], [JETTY.x1 - 0.4, JETTY.z0, JETTY.x1, JETTY.z1 - 0.4]]) { B.add(sb(x1 - x0, 0.36, z1 - z0, 1.2), BM.cap(), (x0 + x1) / 2, QY + 0.18, (z0 + z1) / 2); box(x0, z0, x1, z1, QY + 0.35, { block: true }); }
  yield;

  // ================================================================ the Speaking Steps: a round platform whose tiers go down into the canal
  const tierCols = [];
  {
    const { x, z, r, ring, tiers } = STEPS;
    // one lathe: the platform's edge, then each tier's tread and riser, down into the mud
    const prof = [[0.001, QY], [r, QY]]; let rr = r;
    for (const t of tiers) { prof.push([rr, t], [rr + ring, t]); rr += ring; }
    prof.push([rr, -0.6], [0.001, -0.6]);
    B.add(cached('blw2steps', () => lathe(prof.map(([a, b]) => [a, b]).reverse(), 48, 2.0)), BM.stone(), x, 0, z);
    // the treads' worn caps (a lighter stone), the platform's radial paving and its ring of seats, the speaker's dais
    rr = r; for (const t of tiers) { B.add(cached('blw2tread' + rr, () => lathe([[rr + ring + 0.03, t + 0.02], [rr - 0.02, t + 0.02], [rr - 0.02, t - 0.08], [rr + ring + 0.03, t - 0.08], [rr + ring + 0.03, t + 0.02]], 48, 1.2)), BM.cap(), x, 0, z); rr += ring; }
    B.add(cached('blw2stepsTop', () => cyl(r - 0.05, r - 0.05, 0.05, 48, 0)), pm('#ffffff', 0.85, { map: ctex('blw2radial', 512, 512, (g, W) => {
      const c = W / 2; g.fillStyle = '#e6d9bc'; g.fillRect(0, 0, W, W); g.strokeStyle = 'rgba(110,90,60,0.35)'; g.lineWidth = 3;
      for (let k = 1; k < 6; k++) { g.beginPath(); g.arc(c, c, k * c / 6, 0, 7); g.stroke(); }
      for (let k = 0; k < 6; k++) for (let i = 0; i < 6 + k * 6; i++) { const a = (i / (6 + k * 6)) * Math.PI * 2 + k; g.beginPath(); g.moveTo(c + Math.cos(a) * k * c / 6, c + Math.sin(a) * k * c / 6); g.lineTo(c + Math.cos(a) * (k + 1) * c / 6, c + Math.sin(a) * (k + 1) * c / 6); g.stroke(); }
      g.fillStyle = '#9cc8b4'; for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.beginPath(); g.arc(c + Math.cos(a) * c * 0.93, c + Math.sin(a) * c * 0.93, 7, 0, 7); g.fill(); }
    }, false) }), x, QY + 0.005, z);
    // the seats: a broken ring of stone benches facing the dais (open toward the quay, where people come in)
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * 0.95 + (i / 8) * Math.PI * 1.1 - 0.1, sx = x + Math.sin(a) * (r - 0.9), sz = z + Math.cos(a) * (r - 0.9);
      B.add(cached('blw2seat', () => compose([[bbox(1.3, 0.12, 0.5, 0.03), 0, 0.42, 0], [bbox(0.24, 0.4, 0.4, 0.03), -0.45, 0.2, 0], [bbox(0.24, 0.4, 0.4, 0.03), 0.45, 0.2, 0]])), BM.cap(), sx, QY, sz, 0, a);
      col({ type: 'box', x: sx, z: sz, hw: 0.65, hd: 0.25, rot: a, top: QY + 0.48, block: true });
    }
    B.add(cached('blw2dais', () => lathe([[0.001, 0.32], [1.1, 0.32], [1.2, 0.26], [1.25, 0], [0.001, 0]], 24, 1)), BM.cap(), x, QY, z);
    B.add(cached('blw2daisring', () => new THREE.TorusGeometry(1.15, 0.05, 5, 32).rotateX(Math.PI / 2)), BM.bronze(), x, QY + 0.3, z);
    col({ type: 'cyl', x, z, r: 1.25, top: QY + 0.32, stair: true });
    col({ type: 'cyl', x, z, r, top: QY });
    rr = r; for (const t of tiers) { rr += ring; tierCols.push({ top: t, c: col({ type: 'cyl', x, z, r: rr, top: t, stair: true }) }); }
  }
  yield;

  // ================================================================ timber: the walkway, the landing, the jetty's gangway posts, the stairs
  const deck = (x0, z0, x1, z1, top, o = {}) => { const p = P((x0 + x1) / 2, 0, (z0 + z1) / 2); deckSlab(p, x1 - x0, z1 - z0, { top, water: 0, ...o }); return p; };
  deck(WALK.x0, WALK.z0, WALK.x1, WALK.z1, WALK_Y, { under: 'piles', seed: 21, mat: BM.deckOld() });
  const walkCol = col({ type: 'box', x: (WALK.x0 + WALK.x1) / 2, z: (WALK.z0 + WALK.z1) / 2, hw: (WALK.x1 - WALK.x0) / 2, hd: (WALK.z1 - WALK.z0) / 2, top: WALK_Y, seeThrough: true });
  deck(LAND.x0, LAND.z0, LAND.x1, LAND.z1, LANDY, { under: 'piles', seed: 22 });
  box(LAND.x0, LAND.z0, LAND.x1, LAND.z1, LANDY, { seeThrough: true });
  const stairs = [];
  // the landing up to the south quay; the ledge down to the west landing; the terrace's wide stair; the narrow stair
  stairs.push(P((LAND.x0 + LAND.x1) / 2, 0, QUAY.z1, 0)); stepsGeo(stairs.at(-1), LAND.x1 - LAND.x0, 0, LAND.z0 - QUAY.z1, QY, LANDY, 6);
  stairs.push(P(-22, 0, LEDGE.z0, Math.PI)); stepsGeo(stairs.at(-1), 4, 0, LEDGE.z0 - WALK.z1, QY, WALK_Y, 5);
  stairs.push(P(22, 0, 2, 0)); stepsGeo(stairs.at(-1), 4, 0, 12, TER, QY, 19);
  stairs.push(P(19, 0, ESTAIR.l1, Math.PI)); stepsGeo(stairs.at(-1), 2, 0, ESTAIR.l1 - ESTAIR.z0, ESTAIR.land, WALK_Y, 12, { wood: true });
  stairs.push(P(19, 0, ESTAIR.z1, Math.PI)); stepsGeo(stairs.at(-1), 2, 0, ESTAIR.z1 - ESTAIR.l2, TER, ESTAIR.land, 12, { wood: true });
  for (const s of stairs) cols(s.cols);
  // the narrow stair's landings on brackets against the terrace wall
  for (const [z0, z1, y] of [[ESTAIR.l1, ESTAIR.l2, ESTAIR.land], [ESTAIR.z1, -6, TER]]) {
    B.add(bbox(2.0, 0.16, z1 - z0, 0.02, 2.2), BM.deck(), 19, y - 0.08, (z0 + z1) / 2);
    for (const z of [z0 + 0.3, z1 - 0.3]) B.add(cached('blw2bracket', () => compose([[bbox(0.14, 0.14, 1.9, 0.02), 0, 0, 0, 0, Math.PI / 2], [bbox(0.12, 0.12, 1.9, 0.02), 0.1, -0.7, 0, 0, Math.PI / 2, -0.75]])), BM.post(), 19, y - 0.25, z);
    box(18, z0, 20, z1, y, { seeThrough: true });
  }
  // the stair's stringer posts down into the water (it stands on the canal's floor)
  for (let z = ESTAIR.z0 + 0.4; z < ESTAIR.z1; z += 2.4) B.add(cached('blw2spost', () => cyl(0.12, 0.14, 8, 7, 1)), BM.post(), 18.12, 0, z);
  yield;

  // ================================================================ rails (where a fall reads as one; the water is a soft edge)
  const rc = [];
  const rail = (ax, az, bx, bz, y, o) => railRun(B, rc, ax, az, bx, bz, y, o);
  // a rail up a stair: posts every step or two, a handrail along the slope
  const slopeRail = (x, za, ya, zb, yb) => {
    const n = Math.max(2, Math.round(Math.abs(zb - za) / 1.3));
    for (let i = 0; i <= n; i++) { const t = i / n, z = za + (zb - za) * t, y = ya + (yb - ya) * t; B.add(cached('blw2srp', () => bbox(0.09, 1.0, 0.09, 0.015, 1)), BM.post(), x, y + 0.5, z); }
    B.add(tube([[x, ya + 1.0, za], [x, yb + 1.0, zb]], 0.04, 5, 1), BM.timber());
    B.add(tube([[x, ya + 0.55, za], [x, yb + 0.55, zb]], 0.03, 5, 1), BM.timber());
    rc.push({ type: 'box', x, z: (za + zb) / 2, hw: 0.08, hd: Math.abs(zb - za) / 2, top: Math.max(ya, yb) + 1.2, seeThrough: true, noStand: true });
  };
  slopeRail(18.05, ESTAIR.z0 + 0.3, WALK_Y + 0.2, ESTAIR.l1, ESTAIR.land); slopeRail(18.05, ESTAIR.l1, ESTAIR.land, ESTAIR.l2, ESTAIR.land);
  slopeRail(18.05, ESTAIR.l2, ESTAIR.land, ESTAIR.z1, TER); slopeRail(18.05, ESTAIR.z1, TER, -6, TER);
  rail(18, -6.05, 20, -6.05, TER, { kind: 'timber' });
  // the wide stair's west side (over the quay's end and the water)
  slopeRail(20.05, 2.2, TER, 10.0, TER - (TER - QY) * 8 / 12);   // (open below, where the treads are a step over the quay: he comes on from the side)
  // the walkway: rope rails along its water edge between the boat steps and the gangway; the landing's rails
  {
    const gaps = [[GN.x0 - 0.1, GN.x1 + 0.1], ...ROW.map(([x, w], i) => { const sx = x + (i === DUNN ? 0 : -w * 0.18); return [sx - 0.9, sx + 0.9]; }), [ESTAIR.x0 - 0.2, 20]];
    gaps.sort((a, b) => a[0] - b[0]);
    let a = WALK.x0 + 0.1;
    for (const [g0, g1] of gaps) { if (g0 - a > 0.8) rail(a, WALK.z1 - 0.05, g0, WALK.z1 - 0.05, WALK_Y, { kind: 'rope', every: 1.6 }); a = Math.max(a, g1); }
  }
  rail(LAND.x0 + 0.05, LAND.z0, LAND.x0 + 0.05, LAND.z1, LANDY, { kind: 'timber' }); rail(LAND.x1 - 0.05, LAND.z0, LAND.x1 - 0.05, LAND.z1, LANDY, { kind: 'timber' });
  rail(LAND.x0, LAND.z1 - 0.05, -9.2, LAND.z1 - 0.05, LANDY, { kind: 'timber' }); rail(-6.8, LAND.z1 - 0.05, LAND.x1, LAND.z1 - 0.05, LANDY, { kind: 'timber' });
  cols(rc); rc.length = 0;
  yield;

  // ================================================================ the lower row: eight narrow, tall houses on stilts
  const shutO = new THREE.Group(); shutO.name = 'bl_shuttersOpen'; keep(shutO); group.add(shutO);
  const shutC = new THREE.Group(); shutC.name = 'bl_shuttersShut'; keep(shutC); group.add(shutC);
  const BO = new Batch(shutO), BC = new Batch(shutC);
  const UPS = [BM.teal, AM.ochreBoards, BM.brick, AM.creamBoards, AM.celadonBoards, BM.teal, AM.ochreBoards, AM.creamBoards];
  const LOWS = [AM.lime, AM.limeWarm, AM.lime, AM.lime, null, AM.limeWarm, AM.lime, AM.limeWarm];
  const houseInfo = [];
  ROW.forEach(([x, w], i) => {
    const dunn = i === DUNN, fy = dunn ? BOAT_STEP : FLOOR;
    const p = P(x, fy, ROW_Z, 0);
    const doorW = i === MAGS ? 1.1 : dunn ? 1.0 : 1.2;
    const low = dunn ? BM.rubble() : LOWS[i](), stain = dunn ? AM.rubbleStain() : AM.limeStain();
    const h0 = dunn ? 3.05 : 2.6;
    const info = tallHouse(p, {
      w, d: ROW_D, stilts: fy + 0.3, trim: BM.post(), leaf: [BM.teal(), BM.brick(), AM.shutter()][i % 3], shutter: i % 2 ? AM.shutterRed() : AM.shutter(),
      storeys: [
        { h: h0, mat: low, stain: { top: 0.95 + (FLOOR - fy), mat: stain }, holes: { s: [{ x: dunn ? 0 : -w * 0.18, y: 0, w: doorW, h: dunn ? 1.75 : 2.0, door: true, arch: dunn, open: dunn }, ...(dunn ? [] : [{ x: w * 0.28, y: 1.15, w: 0.6, h: 0.75, shut: true }])], e: i % 2 ? [{ x: 0.6, y: 1.3, w: 0.5, h: 0.5 }] : [] } },
        { h: 2.5, mat: UPS[i](), frame: true, jet: 0.45, holes: { s: [{ x: -w * 0.2, y: 0.06, w: 0.8, h: 1.9, door: true, leaf: [AM.shutter(), BM.brick(), BM.teal()][(i + 1) % 3] }, { x: w * 0.24, y: 0.8, w: 0.7, h: 1.1, shut: true }], n: [{ x: 0, y: 0.9, w: 0.7, h: 0.9 }], w: [{ x: -0.4, y: 0.9, w: 0.6, h: 0.8 }], e: [{ x: 0.5, y: 0.9, w: 0.6, h: 0.8 }] } },
      ],
      roof: { kind: 'front', mat: i % 3 === 1 ? BM.roofGlaze() : BM.roof(), rise: w * 0.62, over: 0.42, ridge: i % 2 ? BM.celadonDeep() : BM.terracotta() },
      hoist: i % 2 ? 4.2 : 0, finial: i % 2 ? BM.celadon() : BM.terracotta(), chimney: i % 3 === 2 ? BM.terracotta() : i % 3 === 0 ? BM.celadonDeep() : null,
      marks: [0.3 + (FLOOR - fy), 1.45 + (FLOOR - fy)],
    }, { open: { add: (...a) => BO.add(...a) }, shut: { add: (...a) => BC.add(...a) } });
    cols(p.cols);
    houseInfo.push({ x, w, fy, door: dunn ? 0 : -w * 0.18, top: info.top + fy });
    // the living floor's gallery: a narrow timber balcony on brackets out over the walkway (the high floor is where the
    // household lives, works and hangs its washing; nothing of value is kept below the water's old line)
    {
      const gy = FLOOR + 2.6, gz0 = ROW_Z + ROW_D / 2 + 0.45, gd = 0.8, gw = w - 0.3;
      B.add(bbox(gw, 0.12, gd, 0.02, 2.2), BM.deck(), x, gy - 0.06, gz0 + gd / 2);
      B.add(bbox(gw + 0.04, 0.16, 0.08, 0.02, 1), BM.post(), x, gy - 0.16, gz0 + gd - 0.03);
      for (const a of [-1, 1]) B.add(cached('blw2galbr', () => compose([[bbox(0.1, 0.1, 0.9, 0.015), 0, -0.1, 0.4], [bbox(0.09, 0.09, 1.0, 0.015), 0, -0.45, 0.25, Math.atan2(0.7, 0.75)]])), BM.post(), x + a * (gw / 2 - 0.12), gy, gz0);
      const posts = Math.max(3, Math.round(gw / 0.55));
      for (let k = 0; k <= posts; k++) B.add(cached('blw2galp', () => bbox(0.05, 0.9, 0.05, 0.01, 1)), BM.timber(), x - gw / 2 + 0.06 + k * (gw - 0.12) / posts, gy + 0.45, gz0 + gd - 0.05);
      for (const a of [-1, 1]) B.add(cached('blw2galside', () => compose([[bbox(0.05, 0.9, 0.05, 0.01, 1), 0, 0.45, 0.4], [bbox(0.06, 0.07, gd, 0.01, 1), 0, 0.92, 0]])), BM.timber(), x + a * (gw / 2 - 0.03), gy, gz0 + gd / 2);
      B.add(bbox(gw, 0.07, 0.09, 0.015, 1), UPS[i](), x, gy + 0.93, gz0 + gd - 0.05);
      if (i % 3 !== 1) for (const k of [0, 1]) herbPot(P(x + (k ? 0.5 : -0.1) + w * 0.15, gy, gz0 + gd - 0.25), { kind: (i + k) % 4, s: 0.85 });
    }
    // the door's own step (worn), the boat step at the water (a hand over the balanced level), with their colliders
    if (!dunn) {
      const dx = x - w * 0.18;
      B.add(bbox(doorW + 0.5, 0.2, 0.5, 0.03, 1), BM.cap(), dx, FLOOR - 0.12 - 0.1, WALK.z0 - 0.25);
      B.add(cached('blw2worn', () => tint(bbox(0.6, 0.01, 0.3, 0.004), '#d8cfba')), BM.vc(), dx, FLOOR - 0.115, WALK.z0 - 0.25);
      col({ type: 'box', x: dx, z: WALK.z0 - 0.27, hw: doorW / 2 + 0.25, hd: 0.3, top: FLOOR - 0.12, stair: true });
    }
  });
  BO.build(); BC.build();
  // the boat steps: a stone tread before each house, down from the walkway's edge (worn in the middle)
  const boatStepCols = [];
  ROW.forEach(([x], i) => {
    const sx = x + (i === DUNN ? 0 : -ROW[i][1] * 0.18);
    B.add(bbox(1.6, 0.2, 0.8, 0.03, 1), BM.cap(), sx, BOAT_STEP - 0.1, WALK.z1 + 0.4);
    B.add(sb(1.5, BOAT_STEP - 0.2 + 0.4, 0.7, 1.4), BM.wet(), sx, (BOAT_STEP - 0.2 - 0.4) / 2, WALK.z1 + 0.4);
    B.add(cached('blw2wornb', () => tint(bbox(0.7, 0.01, 0.4, 0.004), '#e2dac6')), BM.vc(), sx, BOAT_STEP + 0.005, WALK.z1 + 0.4);
    boatStepCols.push(col({ type: 'box', x: sx, z: WALK.z1 + 0.4, hw: 0.8, hd: 0.45, top: BOAT_STEP, stair: true }));
    // two mooring rings on a post beside it: the high one for a flood, the low one for the balanced water
    B.add(cached('blw2mpost', () => cyl(0.13, 0.15, 3.6, 8, 1)), BM.post(), sx + 1.05, 1.0, WALK.z1 + 0.2);
    for (const ry of [2.6, 1.65]) B.add(cached('blw2ring', () => new THREE.TorusGeometry(0.11, 0.025, 5, 12)), BM.bronze(), sx + 1.05, ry, WALK.z1 + 0.36);
    col({ type: 'cyl', x: sx + 1.05, z: WALK.z1 + 0.2, r: 0.16, top: 2.8, noStand: true });
  });
  // Dunn's: its sunk doorway, a pit below the walkway where the silt gathers, its arched door
  const DX = ROW[DUNN][0];
  B.add(bbox(1.6, 0.16, 0.55, 0.03, 1), BM.cap(), DX, BOAT_STEP - 0.08, WALK.z0 - 0.27);
  const dunnPit = col({ type: 'box', x: DX, z: WALK.z0 - 0.27, hw: 0.8, hd: 0.3, top: BOAT_STEP, stair: true });
  void dunnPit;
  yield;

  // ================================================================ the water's record on the stone (the basin's faces)
  {
    const T = (x0, z0, x1, z1, o) => tideMarks(B, { x0, z0, x1, z1 }, { bottom: -0.2, wet: 1.0, salt: WL[0], stain: AM.stoneStain(), marks: [2.55], ...o });
    T(BASIN.x0, 4, JETTY.x0, 4); T(JETTY.x1, 4, STEPS.x - STEPS.r - STEPS.ring * 6, 4); T(STEPS.x + STEPS.r + STEPS.ring * 6, 4, BASIN.x1, 4);
    T(JETTY.x0, JETTY.z1, JETTY.x0, JETTY.z0, { marks: [] }); T(JETTY.x0, JETTY.z0, JETTY.x1, JETTY.z0, { marks: [] }); T(JETTY.x1, JETTY.z0, JETTY.x1, JETTY.z1, { marks: [] });
    T(LEDGE.x1, LEDGE.z0, LEDGE.x1, LEDGE.z1, { gaps: [[20.0, 21.0]] });
    T(-20, -37, -20, -30.5, { marks: [2.55] }); T(22, -37, -20, -37, { marks: [] });
    T(20, 2, 20, -37, { marks: [2.55, 3.15, 3.9] });
  }
  // the level gauge, painted on the pier's foot where it meets the water (no words), its bronze float in a slot
  const GZ = -4.5, GX = LEDGE.x1;
  {
    B.add(cached('blw2gauge', () => new THREE.PlaneGeometry(0.62, 5.0).rotateY(Math.PI / 2)), pm('#ffffff', 0.7, { map: gaugeTex() }), GX + 0.045, 2.5 - 0.2, GZ);
    // its upper part on a pilaster standing on the ledge's edge, a bronze cap; glazed tiles at the three levels
    B.add(sb(0.7, 2.5, 0.9, 1.4), AM.ashlar(), GX - 0.35, QY + 1.25, GZ);
    B.add(cached('blw2gcap', () => compose([[bbox(0.9, 0.16, 1.1, 0.03), 0, 0, 0], [lathe([[0.001, 0], [0.22, 0], [0.12, 0.3], [0.001, 0.36]], 10), 0, 0.08, 0]])), BM.bronze(), GX - 0.35, QY + 2.55, GZ);
    [['#3f6c9c', WL[0]], ['#5f9a86', WL[1]], ['#e6b866', WL[2]]].forEach(([c, y]) => B.add(cached('blw2gtile' + c, () => tint(bbox(0.06, 0.16, 0.22, 0.01), c)), BM.vc(), GX + 0.06, y, GZ + 0.48));
    for (const s of [-1, 1]) B.add(cached('blw2gslot', () => bbox(0.06, 5.0, 0.06, 0.01)), BM.bronze(), GX + 0.06, 2.3, GZ + s * 0.36);
    col({ type: 'box', x: GX - 0.35, z: GZ, hw: 0.35, hd: 0.45, top: QY + 2.6, noStand: true });
  }
  const marker = keep(new THREE.Mesh(cached('blw2gmark', () => compose([[lathe([[0.001, -0.1], [0.16, -0.06], [0.18, 0.04], [0.06, 0.12], [0.001, 0.12]], 10).rotateZ(Math.PI / 2), 0.1, 0, 0], [bbox(0.04, 0.05, 0.86, 0.01), 0.05, 0.12, 0]])), BM.bronze()));
  marker.position.set(GX + 0.08, WL[0], GZ); marker.castShadow = true; group.add(marker);
  yield;

  // ================================================================ the pump machinery on the west pier (the old beam pump, stopped)
  {
    const py = PIER.top, bx = -30, bz = -10;
    // the glazed cylinder (the pump's barrel) on the pier's top, bronze-banded
    B.add(cached('blw2barrel', () => lathe([[0.001, 0], [1.25, 0], [1.3, 0.25], [1.2, 0.4], [1.2, 3.0], [1.32, 3.15], [1.0, 3.4], [0.001, 3.45]], 28, 2)), BM.celadon(), bx - 4.5, py, bz);
    for (const y of [0.6, 1.5, 2.4]) B.add(cached('blw2barrelband', () => new THREE.TorusGeometry(1.22, 0.07, 6, 28).rotateX(Math.PI / 2)), BM.bronze(), bx - 4.5, py + y, bz);
    // the A-frame of stone and the bronze beam across it, one end over the cylinder, the other out over the basin
    for (const s of [-1, 1]) B.add(cached('blw2aframe', () => compose([[bbox(0.8, 6.0, 0.9, 0.06, 1.6), 0, 3.0, 0, 0, 0, 0.12], [bbox(0.8, 6.0, 0.9, 0.06, 1.6), 0, 3.0, 0, 0, 0, -0.12]])), AM.ashlar(), bx + 0.5, py, bz + s * 1.0);
    B.add(cached('blw2pivot', () => cyl(0.35, 0.35, 2.6, 16).rotateX(Math.PI / 2)), BM.bronze(), bx + 0.5, py + 6.0, bz);
    B.add(cached('blw2beam', () => compose([[bbox(15.5, 0.7, 0.5, 0.06, 1.2), 0, 0, 0.35], [bbox(15.5, 0.7, 0.5, 0.06, 1.2), 0, 0, -0.35], [bbox(15.2, 0.16, 1.1, 0.03, 1), 0, 0.4, 0]])), BM.bronze(), bx + 3.3, py + 6.1, bz, 0, 0, -0.06);
    for (const [ex, ey] of [[bx - 4.5, py + 6.55], [bx + 10.8, py + 5.6]]) B.add(cached('blw2beamhead', () => cyl(0.9, 0.9, 1.1, 18, 0, false).rotateX(Math.PI / 2)), BM.celadonDeep(), ex, ey, bz);
    // the rods: down into the barrel, and down the pier's face into the basin (green below the high-water line)
    B.add(tube([[bx - 4.5, py + 6.0, bz], [bx - 4.5, py + 3.4, bz]], 0.13, 8, 1), BM.iron());
    B.add(tube([[bx + 10.8, py + 5.1, bz], [bx + 10.8, 0.4, bz]], 0.13, 8, 1), BM.iron());
    B.add(cached('blw2rodwet', () => cyl(0.15, 0.15, 1.9, 8)), BM.wet(), bx + 10.8, 1.3, bz);
    B.add(cached('blw2rodguide', () => compose([[bbox(1.2, 0.3, 0.9, 0.04), 0, 0, 0], [cyl(0.24, 0.24, 0.5, 10), 0, 0.1, 0]])), BM.bronze(), bx + 10.8, QY + 2.4, bz);
    col({ type: 'box', x: bx + 10.8, z: bz, hw: 0.3, hd: 0.3, top: QY + 6, noStand: true });
    // a glazed outflow mouth on the pier's face over the ledge (the spill channel's end), weed hung below it
    B.add(cached('blw2mouth', () => lathe([[0.95, -0.3], [0.85, 0], [0.7, 0.3], [0.001, 0.3]], 20, 1).rotateZ(-Math.PI / 2)), BM.celadonDeep(), PIER.x1 + 0.3, QY + 3.1, -16.5);
    B.add(cached('blw2mouthd', () => cyl(0.62, 0.62, 0.1, 18).rotateZ(Math.PI / 2)), BM.dark(), PIER.x1 + 0.32, QY + 3.1, -16.5);
    B.add(weedGeo(1.4, 9).clone().rotateY(Math.PI / 2), BM.vcCloth(), PIER.x1 + 0.6, QY + 2.4, -16.5);
  }
  // the pump room's door in the pier's east face: an arched opening in a bronze frame, its brass plate (no words)
  const PUMP_DOOR = { x: PIER.x1, z: -10.5 };
  {
    const d = P(PUMP_DOOR.x, QY, PUMP_DOOR.z, Math.PI / 2);
    d.add(cached('blw2pdfr', () => compose([[bbox(0.3, 3.0, 0.4, 0.04), -1.0, 1.5, 0], [bbox(0.3, 3.0, 0.4, 0.04), 1.0, 1.5, 0], [new THREE.TorusGeometry(1.0, 0.16, 6, 16, Math.PI), 0, 2.9, 0]])), BM.bronze(), 0, 0, 0.12);
    d.add(cached('blw2pddark', () => compose([[bbox(1.7, 2.9, 0.06, 0.01), 0, 1.45, 0], [cyl(0.85, 0.85, 0.06, 16, 0).rotateX(Math.PI / 2), 0, 2.9, 0]])), BM.dark(), 0, 0, 0.02);
    d.add(cached('blw2pdleaf', () => compose([[bbox(0.8, 2.6, 0.08, 0.02, 0.6), -0.42, 1.3, 0], [bbox(0.08, 2.6, 0.12, 0.01), -0.02, 1.3, 0.04]])), BM.teal(), 0, 0, 0.06, 0, -1.15);
    d.add(cached('blw2pdplate', () => bbox(0.5, 0.36, 0.04, 0.01)), BM.bronze(), 1.5, 1.7, 0.08);
    d.add(cached('blw2pdstep', () => bbox(2.6, 0.12, 1.0, 0.03)), BM.cap(), 0, 0.06, 0.5);
  }
  yield;

  // ================================================================ the upper terrace: Oren's house, its neighbours, the bell tower
  const terraceH = [];
  {
    // Oren's: three storeys, a stone ground floor, glazed tiles, a painted top floor, a glazed side-gabled roof
    const p = P(32.5, TER, -33, 0);
    tallHouse(p, { w: 6.0, d: 5.4, trim: BM.post(), leaf: BM.cobalt(), plinth: { mat: AM.ashlar(), h: 0.3 },
      storeys: [
        { h: 2.8, mat: AM.ashlar(), holes: { s: [{ x: -1.2, y: 0, w: 1.15, h: 2.2, door: true, arch: true }, { x: 1.4, y: 1.0, w: 0.9, h: 1.0 }], e: [{ x: 0, y: 1.1, w: 0.7, h: 0.9 }] } },
        { h: 2.6, mat: BM.glazeTiles(), holes: { s: [{ x: -1.3, y: 0.7, w: 0.8, h: 1.2, shut: true }, { x: 1.3, y: 0.7, w: 0.8, h: 1.2, shut: true }], e: [{ x: 0.2, y: 0.8, w: 0.7, h: 1.0 }] } },
        { h: 2.3, mat: AM.creamBoards(), frame: true, jet: 0.3, holes: { s: [{ x: 0, y: 0.7, w: 1.0, h: 1.0 }] } },
      ],
      roof: { kind: 'side', mat: AM.glazeRoof(), rise: 2.0, over: 0.5, ridge: BM.bronze() }, chimney: BM.celadonDeep(), shutter: AM.shutter() }, { open: B, shut: { add() {} } });
    cols(p.cols); terraceH.push(p);
    // an older neighbour, narrow and tall, its stone weathered; the hip roof in cobalt glaze
    const q = P(25.6, TER, -34.5, 0.04);
    tallHouse(q, { w: 4.2, d: 4.6, trim: BM.post(), leaf: BM.brick(), plinth: { mat: AM.ashlar(), h: 0.3 },
      storeys: [
        { h: 2.7, mat: AM.ashlar(), holes: { s: [{ x: 0.6, y: 0, w: 1.0, h: 2.1, door: true, arch: true }], w: [{ x: 0, y: 1.2, w: 0.6, h: 0.8 }] } },
        { h: 2.5, mat: BM.cobaltTiles(), holes: { s: [{ x: -0.6, y: 0.8, w: 0.7, h: 1.1 }, { x: 0.9, y: 0.8, w: 0.6, h: 1.1 }] } },
        { h: 2.4, mat: AM.limeWarm(), holes: { s: [{ x: 0, y: 0.8, w: 0.8, h: 1.0 }], w: [{ x: 0, y: 0.9, w: 0.6, h: 0.8 }] } },
      ],
      roof: { kind: 'hip', mat: AM.cobaltRoof(), rise: 2.0, over: 0.45 } }, {});
    cols(q.cols);
    // a third on the south plaza, facing the bell
    const r2 = P(38.2, TER, 11.8, -Math.PI / 2);
    tallHouse(r2, { w: 3.2, d: 3.2, trim: BM.post(), leaf: BM.teal(), plinth: { mat: AM.ashlar(), h: 0.3 },
      storeys: [
        { h: 2.6, mat: AM.ashlar(), holes: { s: [{ x: 0, y: 0, w: 1.0, h: 2.1, door: true, arch: true }] } },
        { h: 2.4, mat: BM.glazeTiles(), jet: 0.3, holes: { s: [{ x: 0, y: 0.8, w: 0.8, h: 1.1 }], e: [{ x: 0, y: 0.9, w: 0.6, h: 0.8 }] } },
      ],
      roof: { kind: 'front', mat: AM.glazeRoof(), rise: 2.0, over: 0.4 }, chimney: BM.terracotta() }, {});
    cols(r2.cols);
  }
  // the gardens' gate in the plaza's east parapet: two glazed posts and a lintel, the way on beyond it (scenery)
  {
    const g = P(GATE_E.x, TER, GATE_E.z, -Math.PI / 2);
    for (const s of [-1, 1]) { g.add(cached('blw2gpost', () => bbox(0.6, 3.4, 0.6, 0.05, 1)), AM.ashlar(), s * 1.6, 1.7, 0); g.add(cached('blw2gpcap', () => lathe([[0.001, 0], [0.38, 0], [0.3, 0.22], [0.001, 0.5]], 10)), BM.celadon(), s * 1.6, 3.4, 0); }
    g.add(cached('blw2glint', () => bbox(4.0, 0.5, 0.7, 0.05, 1)), AM.ashlar(), 0, 3.6, 0);
    for (let i = 0; i < 6; i++) B.add(sb(3.0, 0.3, 0.9, 1.2), BM.cap(), GATE_E.x + 0.9 + i * 0.85, TER - 0.2 - i * 0.3, GATE_E.z);
    g.box(-1.6, 0, 0.3, 0.3, 3.4, { block: true }); g.box(1.6, 0, 0.3, 0.3, 3.4, { block: true }); cols(g.cols);
    box(40, 6.6, 41, 9.4, TER, { seeThrough: true });
    box(41, 6.6, 41.4, 9.4, TER + 0.8, { block: true });   // (W-3 lies beyond: the story opens the way)
  }
  yield;

  // ---- the flood bell's tower (static parts): squat, stone, an open belfry, a low hip roof
  const BT = { x: BELL.x, z: BELL.z };
  {
    const s = BELL.s, h = BELL.h, y0 = TER;
    B.add(sb(s, h, s, 1.8), AM.ashlar(), BT.x, y0 + h / 2, BT.z);
    B.add(sb(s + 0.3, 0.3, s + 0.3, 1.2), BM.cap(), BT.x, y0 + h + 0.15, BT.z);
    for (const a of [-1, 1]) for (const b of [-1, 1]) B.add(cached('blw2bpier', () => bbox(0.8, 3.0, 0.8, 0.05, 1.6)), AM.ashlar(), BT.x + a * (s / 2 - 0.4), y0 + h + 1.8, BT.z + b * (s / 2 - 0.4));
    B.add(sb(s + 0.5, 0.36, s + 0.5, 1.2), BM.cap(), BT.x, y0 + h + 3.45, BT.z);
    B.add(cached('blw2broof', () => new THREE.ConeGeometry((s + 1.2) / Math.SQRT2, 1.6, 4, 1).rotateY(Math.PI / 4).translate(0, 0.8, 0)), BM.roofGlaze(), BT.x, y0 + h + 3.6, BT.z);
    // the bell's beam across the belfry
    B.add(cached('blw2bbeam', () => bbox(s - 0.6, 0.3, 0.3, 0.04, 1)), BM.post(), BT.x, y0 + h + 2.85, BT.z);
    // a low door, a slot for the rope, the cam wheel's housing, the horns' three hand-wheels (on the east face)
    B.add(cached('blw2bdoor', () => compose([[bbox(1.1, 2.0, 0.06, 0.01), 0, 1.0, 0], [cyl(0.55, 0.55, 0.06, 12, 0).rotateX(Math.PI / 2), 0, 2.0, 0]])), BM.dark(), BT.x, y0, BT.z + s / 2 + 0.02);
    B.add(cached('blw2bcamh', () => bbox(1.3, 1.3, 0.4, 0.04, 1)), BM.post(), BT.x + 1.2, y0 + 1.6, BT.z + s / 2 + 0.2);
    for (const k of [0, 1, 2]) B.add(cached('blw2bhwax', () => cyl(0.06, 0.06, 0.4, 8).rotateZ(Math.PI / 2)), BM.iron(), BT.x + s / 2 + 0.2, y0 + 1.3, BT.z - 1.3 + k * 1.3);
    col({ type: 'box', x: BT.x, z: BT.z, hw: s / 2 + 0.1, hd: s / 2 + 0.1, top: y0 + h + 6, block: true });
  }
  yield;

  // ================================================================ the market float and its gangways (moving)
  const floatG = keep(new THREE.Group()); floatG.name = 'bl_marketFloat'; group.add(floatG);
  const floatCols = [];
  {
    const fB = new Batch(floatG);
    const fP = (x, z, ry = 0) => new Place(fB, x, 0, z, ry);
    const cx = (FLOAT.x0 + FLOAT.x1) / 2, cz = (FLOAT.z0 + FLOAT.z1) / 2, w = FLOAT.x1 - FLOAT.x0, d = FLOAT.z1 - FLOAT.z0;
    fB.add(bbox(w, 0.3, d, 0.04, 2.2), BM.deck(), cx, -0.15, cz);
    for (const s of [-1, 1]) { fB.add(bbox(w + 0.08, 0.2, 0.1, 0.02, 1), BM.post(), cx, -0.3, cz + s * (d / 2 + 0.03)); fB.add(bbox(0.1, 0.2, d + 0.08, 0.02, 1), BM.post(), cx + s * (w / 2 + 0.03), -0.3, cz); }
    // under it: pontoon boxes and glazed floats (what it rides on)
    for (const s of [-1, 0, 1]) fB.add(bbox(w - 0.4, 0.55, 1.0, 0.08, 1.4), BM.deckOld(), cx, -0.55, cz + s * (d / 2 - 1.2));
    for (let i = 0; i < 8; i++) for (const s of [-1, 1]) fB.add(cached('blfloatpot', () => lathe([[0, -0.32], [0.3, -0.26], [0.4, 0], [0.34, 0.24], [0.16, 0.32], [0, 0.32]], 10)), i % 3 === 1 ? BM.terracotta() : BM.celadon(), FLOAT.x0 + 0.9 + i * (w - 1.8) / 7, -0.5, cz + s * (d / 2 - 0.05));
    // the collars that ride its corner piles
    for (const [x, z] of [[FLOAT.x0, FLOAT.z0], [FLOAT.x1, FLOAT.z0], [FLOAT.x0, FLOAT.z1], [FLOAT.x1, FLOAT.z1]]) fB.add(cached('blw2collar', () => compose([[new THREE.TorusGeometry(0.34, 0.08, 6, 14).rotateX(Math.PI / 2)], [bbox(0.5, 0.14, 0.5, 0.02), 0, -0.1, 0]])), BM.bronze(), x + Math.sign(x - cx) * 0.45, 0.05, z + Math.sign(z - cz) * 0.45);
    // the stalls: Corvin's glazeware and the cloth on the west side, fish and the tea stand on the east
    const st = [
      [stall(fP(-9.6, -13.2, Math.PI / 2), 'glaze', { w: 2.8, awn: ['#5f9a86', '#f2ead6'], seed: 1 })],
      [stall(fP(-9.6, -18.6, Math.PI / 2), 'cloth', { w: 2.8, awn: ['#c6684c', '#f2ead6'], seed: 2 })],
      [stall(fP(0.6, -13.0, -Math.PI / 2), 'fish', { w: 2.6, awn: ['#3f6c9c', '#f2ead6'], seed: 3 })],
      [stall(fP(1.2, -19.2, -Math.PI / 2), 'tea', { w: 2.4, awn: ['#e6b866', '#c6684c'], seed: 4 })],
    ];
    for (const [p] of st) for (const c of p.cols) floatCols.push({ dy: c.top, c: physics.add({ ...c, x: c.x + ox, z: c.z + oz }) });
    // crates of greens, a jar crate, nets, sacks; a lantern pole at the middle; ropes of pennants to it
    const pr = (p) => { for (const c of p.cols) floatCols.push({ dy: c.top, c: physics.add({ ...c, x: c.x + ox, z: c.z + oz }) }); };
    pr(crateStack(fP(-10.2, -10.9, 0.1), { seed: 31, n: 2, marks: ['#6e9a52', '#6e9a52', null] }));
    pr(jarCrate(fP(2.2, -10.8, 0.2), { seed: 4 }));
    pr(netPile(fP(1.8, -21.2)));
    { const p = fP(-10.3, -21.2); sack(p, { lx: 0, lz: 0 }); sack(p, { lx: 0.5, lz: 0.2, lry: 0.6, color: '#cbb488' }); p.box(0.25, 0.1, 0.5, 0.45, 0.65, { block: true }); pr(p); }
    { const p = fP(-3.6, -16.0); p.add(cached('blw2fmast', () => compose([[cyl(0.1, 0.14, 4.4, 8, 1), 0, 2.2, 0], [bbox(0.6, 0.3, 0.6, 0.03), 0, 0.15, 0]])), BM.post()); p.add(cached('blw2fmastlamp', () => new THREE.SphereGeometry(0.16, 10, 8)), BM.glow(), 0, 3.2, 0.2); p.cyl(0, 0, 0.3, 4.4, { block: true }); pr(p); }
    fB.add(cached('blw2pennants', () => {
      const parts = [], ends = [[-11, -10], [3, -10], [-11, -22], [3, -22]];
      for (const [ex, ez] of ends) {
        const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([-3.6 + (ex + 3.6) * t, 4.3 - 2.2 * t + 0.5 * Math.sin(Math.PI * t) * -1 + 0.0, -16 + (ez + 16) * t]); }
        parts.push([tint(tube(pts, 0.012, 3, 1), '#6a5a4a')]);
        for (let k = 1; k < 8; k++) { const [x, y, z] = pts[k]; const g = new THREE.ConeGeometry(0.16, 0.36, 3); g.rotateX(Math.PI); parts.push([tint(g, ['#c6684c', '#e6b866', '#5f9a86', '#3f6c9c'][k % 4]), x, y - 0.2, z, 0, Math.atan2(ex + 3.6, ez + 16), 0]); }
      }
      return compose(parts, true);
    }), BM.vcCloth());
    // the float's edges: rope rails, open at the two gangways
    const frc = [];
    const fr = (ax, az, bx, bz) => railRun(fB, frc, ax, az, bx, bz, 0, { kind: 'rope', every: 1.8 });
    fr(FLOAT.x0 + 0.05, FLOAT.z0, FLOAT.x0 + 0.05, FLOAT.z1); fr(FLOAT.x1 - 0.05, FLOAT.z0, FLOAT.x1 - 0.05, FLOAT.z1);
    fr(FLOAT.x0, FLOAT.z1 - 0.05, GS.x0 - 0.1, FLOAT.z1 - 0.05); fr(GS.x1 + 0.1, FLOAT.z1 - 0.05, FLOAT.x1, FLOAT.z1 - 0.05);
    fr(FLOAT.x0, FLOAT.z0 + 0.05, GN.x0 - 0.1, FLOAT.z0 + 0.05); fr(GN.x1 + 0.1, FLOAT.z0 + 0.05, FLOAT.x1, FLOAT.z0 + 0.05);
    for (const c of frc) floatCols.push({ dy: 1.3, c: physics.add({ ...c, x: c.x + ox, z: c.z + oz }) });
    fB.build();
    floatCols.push({ dy: 0, c: physics.add({ type: 'box', x: cx + ox, z: cz + oz, hw: w / 2, hd: d / 2, top: 0, seeThrough: true }) });
    // (the gangway to the row, drawn up: its gap closed)
    floatCols.push({ dy: 1.3, gnGap: true, c: physics.add({ type: 'box', x: (GN.x0 + GN.x1) / 2 + ox, z: FLOAT.z0 + 0.05 + oz, hw: (GN.x1 - GN.x0) / 2 + 0.1, hd: 0.08, top: 0, seeThrough: true, noStand: true, enabled: false }) });
  }
  // its corner piles (fixed, down into the mud) with the chains to its anchors
  for (const [x, z] of [[FLOAT.x0, FLOAT.z0], [FLOAT.x1, FLOAT.z0], [FLOAT.x0, FLOAT.z1], [FLOAT.x1, FLOAT.z1]]) {
    const px = x + Math.sign(x - (FLOAT.x0 + FLOAT.x1) / 2) * 0.45, pz = z + Math.sign(z - (FLOAT.z0 + FLOAT.z1) / 2) * 0.45;
    B.add(cached('blw2fpile', () => cyl(0.2, 0.24, 5.0, 9, 1)), BM.post(), px, 1.9, pz);
    B.add(cached('blw2fpilecap', () => lathe([[0.001, 0], [0.28, 0], [0.22, 0.18], [0.001, 0.26]], 9)), BM.celadonDeep(), px, 4.4, pz);
    B.add(cached('blw2fpilewet', () => cyl(0.25, 0.25, 2.3, 9, 1)), BM.wet(), px, 1.0, pz);
    col({ type: 'cyl', x: px, z: pz, r: 0.28, top: 4.5, block: true });
  }
  // the gangways: a deck and rails on a hinge at the fixed end, its free end on rollers on the float
  const gangway = (G, name, dir) => {
    const L = Math.abs(G.zB - G.zA), w = G.x1 - G.x0;
    const g = keep(new THREE.Group()); g.name = name; g.position.set((G.x0 + G.x1) / 2, 0, G.zA); group.add(g);
    const gB = new Batch(g);
    gB.add(bbox(w, 0.12, L, 0.02, 2.2), BM.deckOld(), 0, -0.06, dir * L / 2);
    for (const s of [-1, 1]) {
      gB.add(bbox(0.12, 0.3, L, 0.02, 1), BM.post(), s * (w / 2 - 0.06), -0.2, dir * L / 2);
      for (let i = 0; i <= 4; i++) gB.add(cached('blw2gwp', () => bbox(0.08, 1.0, 0.08, 0.01, 1)), BM.post(), s * (w / 2 - 0.06), 0.5, dir * (0.2 + i * (L - 0.4) / 4));
      gB.add(bbox(0.07, 0.08, L, 0.02, 1), BM.timber(), s * (w / 2 - 0.06), 1.0, dir * L / 2);
    }
    for (let i = 1; i < 6; i++) gB.add(cached('blw2cleat' + w, () => bbox(w - 0.3, 0.04, 0.06, 0.01)), BM.post(), 0, 0.02, dir * i * L / 6);
    gB.add(cached('blw2roller', () => cyl(0.1, 0.1, 1.9, 10).rotateZ(Math.PI / 2)), BM.bronze(), 0, -0.12, dir * (L - 0.1));
    gB.build();
    const N = 9, segs = [];
    for (let i = 0; i < N; i++) segs.push(physics.add({ type: 'box', x: (G.x0 + G.x1) / 2 + ox, z: G.zA + dir * (L * (i + 0.5) / N) + oz, hw: w / 2, hd: L / N / 2 + 0.07, top: 0, seeThrough: true, stair: true }));
    // the side rails (fixed: the gangway turns about its hinge only)
    for (const s of [-1, 1]) col({ type: 'box', x: (G.x0 + G.x1) / 2 + s * (w / 2 + 0.02), z: (G.zA + G.zB) / 2, hw: 0.08, hd: L / 2, top: 4.2, seeThrough: true, noStand: true });
    return { g, segs, L, N, G, dir };
  };
  const gS = gangway(GS, 'bl_gangwayS', -1), gN = gangway(GN, 'bl_gangwayN', 1);
  yield;

  // ================================================================ the life of the row: boats, washing, the boards across, the silt, Dunn's door
  // boats tied at the steps (one draw; they ride the water together), and the same boats aground on the mud
  const boatsW = [], boatsA = [];
  BOATS.forEach((hi, k) => {
    const x = ROW[hi][0] + (hi === 3 ? -0.4 : 0.5), z = WALK.z1 + 2.1, c = ['#c6684c', '#5f9a86', '#e6b866', '#3f6c9c'][k];
    boatsW.push([skiffGeo(c), M4(x, 0, z, Math.PI / 2 + (k % 2 ? 0.08 : -0.06)), new THREE.Vector3(x, 0, z)]);
    boatsA.push([skiffGeo(c), new THREE.Matrix4().compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(k % 2 ? 0.14 : -0.12, Math.PI / 2 + (k % 2 ? 0.1 : -0.08), k % 2 ? -0.06 : 0.08, 'YXZ')), new THREE.Vector3(1, 1, 1)), new THREE.Vector3(x, 0, z)]);
  });
  const boatW = keep(new THREE.Mesh(bobGeo(boatsW), bobbed(BM.vc()))); boatW.name = 'bl_rowBoats'; boatW.castShadow = true; group.add(boatW);
  const boatA = keep(new THREE.Mesh(compose(boatsA.map(([g, m]) => [g, ...(() => { const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(); m.decompose(p, q, s); const e = new THREE.Euler().setFromQuaternion(q, 'YXZ'); return [p.x, p.y, p.z, e.x, e.y, e.z]; })()]), true), BM.vc())); boatA.name = 'bl_rowBoatsAground'; boatA.castShadow = true; group.add(boatA);
  // their painters: to the high ring in a flood, the low ring when balanced, slack in the mud when low
  const ropes = [WL[0], WL[1], 0.55].map((by, li) => {
    const parts = [];
    BOATS.forEach((hi) => {
      const sx = ROW[hi][0] + (hi === DUNN ? 0 : -ROW[hi][1] * 0.18), rx = sx + 1.05, rz = WALK.z1 + 0.36, ry = li === 0 ? 2.6 : 1.65;
      const bx = ROW[hi][0] + (hi === 3 ? -0.4 : 0.5) + 1.7, bz = WALK.z1 + 2.1, byy = by + 0.5;
      const mid = li === 2 ? [(rx + bx) / 2, Math.min(ry, byy) - 0.5, (rz + bz) / 2] : [(rx + bx) / 2, (ry + byy) / 2 - 0.15, (rz + bz) / 2];
      parts.push([tube([[rx, ry, rz], mid, [bx, byy, bz]], 0.022, 4, 1)]);
    });
    const m = keep(new THREE.Mesh(compose(parts), BM.rope())); m.name = 'bl_painters' + li; m.visible = false; group.add(m); return m;
  });
  // washing lines from the living floors out over the walkway to poles at the water's edge (the cloths come in at a flood)
  const washG = keep(new THREE.Group()); washG.name = 'bl_washing'; group.add(washG);
  {
    const lines = [], cloths = [], r = rng(77);
    ROW.forEach(([x, w], i) => {
      if (i === DUNN || i === 7) return;
      const hx = x + w * 0.3, y0 = FLOOR + 2.6 + 0.95, y1 = FLOOR + 2.6 + 1.0, z0 = ROW_Z + ROW_D / 2 + 0.45 + 0.75 - 0.5, z1 = WALK.z1 - 0.25;
      B.add(cached('blw2wpole', () => compose([[cyl(0.06, 0.08, 5.0, 7, 1), 0, 2.5, 0], [bbox(0.5, 0.06, 0.06, 0.01), 0, 4.9, 0]])), BM.post(), hx, WALK_Y, z1);
      B.add(cached('blw2wbr', () => compose([[bbox(0.08, 0.08, 0.5, 0.01), 0, 0, 0.25], [new THREE.TorusGeometry(0.05, 0.015, 4, 8), 0, 0, 0.5]])), BM.iron(), hx, y0, z0);
      const pts = []; for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push([hx, y0 + (y1 + 0.3 - y0) * t - 0.25 * Math.sin(Math.PI * t), z0 + 0.5 + (z1 - z0 - 0.5) * t]); }
      lines.push([tint(tube(pts, 0.012, 3, 1), '#6a5a4a')]);
      for (let k = 1; k < 4; k++) {
        const [px, py, pz] = pts[k * 2], ch = 0.45 + r() * 0.35, cw = 0.4 + r() * 0.2, g = new THREE.PlaneGeometry(cw, ch, 2, 3); g.translate(0, -ch / 2, 0);
        const pp = g.attributes.position; for (let q = 0; q < pp.count; q++) pp.setZ(q, Math.sin(pp.getY(q) * 6 + k) * 0.03);
        g.computeVertexNormals();
        cloths.push([tint(g, ['#f0e8d6', '#78b0a6', '#c6684c', '#e6b866', '#3f6c9c'][(i + k) % 5]), px, py - 0.01, pz, 0, Math.PI / 2 + (r() - 0.5) * 0.3, 0]);
      }
      col({ type: 'cyl', x: hx, z: z1, r: 0.1, top: WALK_Y + 5, noStand: true });
    });
    B.add(compose(lines, true), BM.vcCloth());
    const m = new THREE.Mesh(compose(cloths, true), BM.vcCloth()); m.castShadow = true; washG.add(m);
  }
  // the boards across the walkway's three ways in (a flood): planks nailed across between posts
  const boardsG = keep(new THREE.Group()); boardsG.name = 'bl_boards'; group.add(boardsG);
  const boardCols = [];
  {
    const bB = new Batch(boardsG);
    const bar = (cx, cz, w, ry, y0) => {
      const p = new Place(bB, cx, y0, cz, ry);
      for (const s of [-1, 1]) p.add(cached('blw2bpost', () => bbox(0.14, 1.4, 0.14, 0.02, 1)), BM.post(), s * w / 2, 0.7, 0);
      for (const [y, rz] of [[0.4, 0], [0.95, 0], [0.68, 0.3]]) p.add(cached('blw2bplank' + w, () => bbox(w + 0.3, 0.2, 0.05, 0.01, 1)), BM.deckOld(), 0, y, 0.08, 0, 0, rz);
      p.add(cached('blw2bmark', () => tint(bbox(0.3, 0.3, 0.02, 0.005), '#c6684c')), BM.vc(), 0, 0.68, 0.12, 0, 0, Math.PI / 4);
      boardCols.push(physics.add({ type: 'box', x: cx + ox, z: cz + oz, hw: w / 2 + 0.1, hd: 0.15, rot: ry, top: y0 + 1.3, block: true, enabled: false }));
    };
    bar(-22, LEDGE.z0 - 0.1, 3.9, 0, QY);                   // the west stair's head (on the ledge, before it goes down)
    bar(19, ESTAIR.l1 + 0.2, 1.9, 0, ESTAIR.land);          // the narrow stair, at its landing (above the flood)
    bB.build();
  }
  // the silt heap at Dunn's door (three stages, a sword clears it) and his door (a kick opens it)
  const siltG = keep(new THREE.Group()); siltG.name = 'bl_dunnSilt'; group.add(siltG);
  const siltM = [0, 1, 2].map((k) => {
    const h = SILT_H[k], g = cached('blw2silt' + k, () => {
      const s = new THREE.SphereGeometry(1, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2); const p = s.attributes.position, c = [], cc = new THREE.Color();
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), n = fbm(x * 3 + k, z * 3, 2); p.setXYZ(i, x * (0.95 - k * 0.12), y * h + (n - 0.5) * 0.12 * (1 - y), z * (0.75 - k * 0.1)); cc.set(y > 0.6 ? '#7c7050' : '#5e5640').lerp(new THREE.Color('#5c6a3c'), n > 0.55 ? 0.5 : 0); c.push(cc.r, cc.g, cc.b); }
      s.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); s.computeVertexNormals(); return s;
    });
    const m = new THREE.Mesh(g, BM.vc()); m.position.set(DX, BOAT_STEP - 0.05, WALK.z0 + 0.15); m.castShadow = true; m.receiveShadow = true; siltG.add(m); return m;
  });
  { const w2 = new THREE.Mesh(weedGeo(1.2, 5), BM.vcCloth()); w2.position.set(DX, BOAT_STEP + 0.85, WALK.z0 + 0.4); siltM[0].add(w2); w2.position.set(0, 0.88, 0.25); }
  const siltCol = physics.add({ type: 'box', x: DX + ox, z: WALK.z0 - 0.1 + oz, hw: 0.95, hd: 0.75, top: WALK_Y + 0.9, block: true });
  const doorHinge = keep(new THREE.Group()); doorHinge.name = 'bl_dunnDoor'; doorHinge.position.set(DX - 0.5, BOAT_STEP, ROW_Z + ROW_D / 2 - 0.08); group.add(doorHinge);
  {
    const leaf = new THREE.Mesh(cached('blw2dleaf', () => compose([[bbox(0.98, 1.3, 0.07, 0.02, 0.6), 0.5, 0.65, 0], [cyl(0.49, 0.49, 0.07, 12, 0, false).rotateX(Math.PI / 2), 0.5, 1.3, 0], [bbox(0.98, 0.09, 0.1, 0.01), 0.5, 0.35, 0.03], [bbox(0.98, 0.09, 0.1, 0.01), 0.5, 1.05, 0.03]])), AM.boardStain());
    leaf.castShadow = true; doorHinge.add(leaf);
    const ring = new THREE.Mesh(cached('blw2dring', () => new THREE.TorusGeometry(0.07, 0.015, 4, 10)), BM.iron()); ring.position.set(0.82, 0.95, 0.07); doorHinge.add(ring);
  }
  const doorCol = physics.add({ type: 'box', x: DX + ox, z: ROW_Z + ROW_D / 2 + oz, hw: 0.6, hd: 0.15, top: BOAT_STEP + 2.0, block: true });
  // behind it: dark, a few things left on the wet floor (seen when it opens)
  B.add(cached('blw2dunnin', () => compose([[bbox(1.6, 2.0, 0.05, 0.01), 0, 1.0, -1.2], [bbox(1.6, 0.05, 1.2, 0.01), 0, 0.02, -0.6]])), BM.dark(), DX, BOAT_STEP, ROW_Z + ROW_D / 2);
  yield;

  // ================================================================ the bell (moving parts): the bell, its clapper and tie, the horns, the cam
  const bellTop = TER + BELL.h + 2.7;
  const bellG = keep(new THREE.Group()); bellG.name = 'bl_bell'; bellG.position.set(BT.x, bellTop, BT.z); group.add(bellG);
  {
    const b = new THREE.Mesh(cached('blw2bell', () => lathe([[0.001, -0.02], [0.12, 0], [0.2, -0.05], [0.4, -0.3], [0.55, -0.9], [0.72, -1.3], [0.78, -1.42], [0.7, -1.42], [0.6, -1.25], [0.001, -1.25]], 28)), BM.bronze());
    b.castShadow = true; bellG.add(b);
    const yoke = new THREE.Mesh(cached('blw2yoke', () => compose([[bbox(1.4, 0.24, 0.3, 0.03), 0, 0.12, 0], [cyl(0.08, 0.08, 1.6, 8).rotateZ(Math.PI / 2), 0, 0.12, 0]])), BM.post()); bellG.add(yoke);
  }
  const clapper = new THREE.Mesh(cached('blw2clap', () => compose([[cyl(0.04, 0.04, 1.0, 6), 0, -0.6, 0], [new THREE.SphereGeometry(0.14, 10, 8), 0, -1.12, 0]])), BM.iron()); bellG.add(clapper);
  const tieM = new THREE.Mesh(cached('blw2tie', () => compose([[tube([[0, -1.1, 0], [0.4, -1.0, 0.1], [0.74, -1.3, 0.05]], 0.03, 4, 1)], [new THREE.TorusGeometry(0.16, 0.035, 5, 12).rotateX(Math.PI / 2), 0, -1.1, 0], [tube([[0, -1.1, 0], [-0.3, -0.7, -0.2], [-0.6, -0.4, 0.0], [-0.7, 0.05, 0]], 0.03, 4, 1)]])), BM.rope()); bellG.add(tieM);
  const pullRope = keep(new THREE.Mesh(cached('blw2pull', () => tube([[0, 0, 0], [-0.05, -2.2, 0.02], [0, -BELL.h - 1.35, 0]], 0.035, 5, 1)), BM.rope()));
  pullRope.position.set(BT.x - BELL.s / 2 - 0.25, bellTop - 0.2, BT.z); group.add(pullRope);
  B.add(cached('blw2pullarm', () => compose([[bbox(0.8, 0.14, 0.14, 0.02), 0.4, 0, 0], [cyl(0.07, 0.07, 0.3, 8).rotateX(Math.PI / 2), 0, 0, 0]])), BM.post(), BT.x - BELL.s / 2 - 0.25, bellTop - 0.2, BT.z);
  B.add(cached('blw2pullh', () => cyl(0.05, 0.05, 0.5, 8).rotateZ(Math.PI / 2)), BM.timber(), BT.x - BELL.s / 2 - 0.25, TER + 1.1, BT.z);
  // the three horns on a bronze mast through the roof's apex, one over another, each on its own swivel
  const HORN_Y = TER + BELL.h + 3.6 + 1.6 + 0.35;
  B.add(cached('blw2hmast', () => compose([[cyl(0.11, 0.14, 2.6, 10), 0, 1.3, 0], [new THREE.SphereGeometry(0.18, 10, 8), 0, 2.65, 0]])), BM.bronze(), BT.x, HORN_Y - 0.6, BT.z);
  const horns = [0, 1, 2].map((k) => {
    const g = keep(new THREE.Group()); g.name = 'bl_bellHorn' + k;
    g.position.set(BT.x, HORN_Y + k * 0.66, BT.z); group.add(g);
    const m = new THREE.Mesh(cached('blw2horn', () => compose([[lathe([[0.18, 0], [0.2, 0.6], [0.32, 1.4], [0.62, 2.0], [0.7, 2.06], [0.66, 2.1], [0.56, 2.04], [0.001, 2.04]].map(([x, y]) => [x, y]), 22).rotateX(Math.PI / 2), 0, 0, 0.6], [new THREE.TorusGeometry(0.67, 0.05, 6, 22), 0, 0, 2.64], [cyl(0.24, 0.24, 0.4, 12).rotateX(Math.PI / 2), 0, 0, 0.5]])), BM.celadonDeep());
    m.castShadow = true; g.add(m);
    const ring = new THREE.Mesh(cached('blw2hornring', () => compose([[new THREE.TorusGeometry(0.22, 0.05, 6, 14), 0, 0, 0.75], [new THREE.TorusGeometry(0.4, 0.04, 6, 16), 0, 0, 1.75]])), BM.bronze()); g.add(ring);
    const sw = new THREE.Mesh(cached('blw2hornswivel', () => compose([[cyl(0.2, 0.26, 0.5, 10), 0, -0.3, 0], [cyl(0.05, 0.05, 0.9, 6).rotateX(Math.PI / 2), 0, 0, 0.3]])), BM.bronze()); g.add(sw);
    return g;
  });
  // the horns' hand-wheels on the tower's east face (one each), the cam wheel on its south face
  const hwheels = [0, 1, 2].map((k) => { const m = keep(new THREE.Mesh(cached('blw2hwheel', () => compose([[new THREE.TorusGeometry(0.32, 0.04, 5, 16)], ...[0, 1, 2].map((j) => [bbox(0.62, 0.04, 0.04, 0.01), 0, 0, 0, 0, 0, (j * Math.PI) / 3])]).rotateY(Math.PI / 2)), BM.bronze())); m.position.set(BT.x + BELL.s / 2 + 0.42, TER + 1.3, BT.z - 1.3 + k * 1.3); group.add(m); return m; });
  const camW = keep(new THREE.Mesh(cached('blw2cam', () => compose([[cyl(0.5, 0.5, 0.12, 20).rotateX(Math.PI / 2)], [bbox(0.3, 0.42, 0.14, 0.03), 0, 0.5, 0], [cyl(0.08, 0.08, 0.3, 8).rotateX(Math.PI / 2), 0, 0, 0.1]])), BM.bronze()));
  camW.position.set(BT.x + 1.2, TER + 1.6, BT.z + BELL.s / 2 + 0.48); group.add(camW);
  // two painted marks by the cam (one dot, two dots: one tone, two tones)
  B.add(cached('blw2cammarks', () => compose([[tint(cyl(0.06, 0.06, 0.02, 10).rotateX(Math.PI / 2), '#e6b866'), -0.75, 0.75, 0], [tint(cyl(0.06, 0.06, 0.02, 10).rotateX(Math.PI / 2), '#e6b866'), 0.65, 0.75, 0], [tint(cyl(0.06, 0.06, 0.02, 10).rotateX(Math.PI / 2), '#e6b866'), 0.85, 0.75, 0]], true)), BM.vc(), BT.x + 1.2, TER + 1.6, BT.z + BELL.s / 2 + 0.42);
  yield;

  // ================================================================ life: lanterns, bollards, cargo, herbs, cats, the notice board, floating things
  const props = (p) => { cols(p.cols); return p; };
  const lan = (x, z, y, ry = 0) => props(lantern(P(x, y, z, ry)));
  lan(-12.5, 13.0, QY, 0); lan(2.5, 13.0, QY, 0); lan(-21.8, -15.0, QY, Math.PI / 2); lan(-21.8, 1.5, QY, Math.PI / 2); lan(-7.5, 4.6, QY, 0);
  lan(-15.0, -30.2, WALK_Y, Math.PI); lan(5.8, -30.2, WALK_Y, Math.PI); lan(21.0, -1.0, TER, -Math.PI / 2); lan(36.5, -24.0, TER, -Math.PI / 2); lan(28.5, 12.6, TER, Math.PI);
  for (const [x, z] of [[-16, 3.6], [-10, 3.6], [-1.5, 3.6], [16, 3.6], [-19.8, -5], [-19.8, -20]]) props(bollard(P(x, QY, z)));
  // the south quay: goods landed from the harbour waiting to go up to the living floors; the notice board
  props(crateStack(P(-18.0, QY, 10.5, 0.2), { seed: 41, n: 3 })); props(jarCrate(P(-14.6, QY, 11.6, -0.1), { seed: 5 })); props(netPile(P(-30.0, QY, 8.0)));
  { const p = P(-26.0, QY, 11.0); sack(p, { lx: 0, lz: 0, lry: 0.2 }); sack(p, { lx: 0.55, lz: 0.1, lry: -0.4, color: '#cbb488' }); p.box(0.3, 0.05, 0.65, 0.45, 0.65, { block: true }); props(p); }
  for (const [x, z, s] of [[-34, 2.0, 1], [-33, 2.8, 0.8], [11.8, 11.6, 0.9]]) props(ballastPot(P(x, QY, z), { s, mat: s < 1 ? BM.terracotta() : BM.celadon() }));
  const NB = { x: -3.0, z: 12.6 };
  {
    const p = P(NB.x, QY, NB.z, Math.PI);
    for (const s of [-1, 1]) p.add(cached('blw2nbpost', () => bbox(0.16, 2.3, 0.16, 0.02, 1)), BM.post(), s * 0.9, 1.15, 0);
    p.add(cached('blw2nbboard', () => bbox(2.0, 1.2, 0.08, 0.02, 1)), BM.teal(), 0, 1.55, 0);
    p.add(cached('blw2nbroof', () => bbox(2.4, 0.08, 0.5, 0.02, 1)), BM.roof(), 0, 2.3, 0.1, -0.2);
    p.add(cached('blw2nbnotes', () => compose([0, 1, 2, 3, 4].map((i) => [tint(new THREE.PlaneGeometry(0.34, 0.44), ['#f2ead2', '#f6f0e0', '#e8dcc0'][i % 3]), -0.7 + i * 0.36, 1.55 + (i % 2) * 0.12, 0.05, 0, 0, (i - 2) * 0.05]), true)), BM.vcCloth(), 0, 0, 0);
    p.add(cached('blw2nbdraw', () => compose([[tint(new THREE.PlaneGeometry(0.2, 0.04), '#3f6c9c'), -0.7, 1.6, 0.06], [tint(new THREE.PlaneGeometry(0.04, 0.2), '#3f6c9c'), 0.02, 1.55, 0.06], [tint(new THREE.PlaneGeometry(0.22, 0.22), '#c6684c'), 0.36, 1.66, 0.06]], true)), BM.vc(), 0, 0, 0);
    p.box(0, 0, 1.1, 0.2, 2.4, { block: true }); props(p);
  }
  // herbs on the terrace and at the row's doors; a bench on the terrace looking away from the water; cats on warm tiles
  for (const [x, z, k, y] of [[22, -24, 1, TER], [22, -22.8, 0, TER], [28.5, -30.5, 3, TER], [29.4, -30.5, 1, TER], [36.6, -28, 2, TER], [-15.4, -30.3, 1, WALK_Y], [-11.3, -30.3, 0, WALK_Y], [10.6, -30.3, 3, WALK_Y], [15.4, -30.3, 1, WALK_Y]]) herbPot(P(x, y, z), { kind: k, s: 1.1 });
  col({ type: 'box', x: 22, z: -23.4, hw: 0.35, hd: 1.0, top: TER + 0.4, block: true });
  { const p = P(38.6, TER, -24.0, -Math.PI / 2); p.add(cached('blbench', () => compose([[bbox(1.4, 0.07, 0.4, 0.02), 0, 0.45, 0], ...[-1, 1].map((s) => [bbox(0.08, 0.45, 0.36, 0.02), s * 0.6, 0.22, 0])])), BM.timber()); p.box(0, 0, 0.72, 0.22, 0.5, { block: true }); props(p); }
  const cat = (x, y, z, ry, c) => B.add(cached('blw2cat' + c, () => compose([[tint(new THREE.SphereGeometry(0.2, 10, 8).scale(1.5, 0.75, 0.9), c), 0, 0.15, 0], [tint(new THREE.SphereGeometry(0.11, 8, 6), c), 0.32, 0.24, 0], [tint(new THREE.ConeGeometry(0.04, 0.08, 4), c), 0.34, 0.36, 0.05], [tint(new THREE.ConeGeometry(0.04, 0.08, 4), c), 0.34, 0.36, -0.05], [tint(tube([[-0.28, 0.12, 0], [-0.42, 0.06, 0.12], [-0.3, 0.03, 0.26]], 0.025, 4, 1), c), 0, 0, 0]], true)), BM.vc(), x, y, z, 0, ry);
  cat(BT.x - 1.2, TER + BELL.h + 0.3, BT.z + BELL.s / 2 + 0.12, 0.4, '#e2a058'); cat(-16.9, FLOOR + 2.6 + 0.24, ROW_Z + ROW_D / 2 + 0.48, 2.6, '#6a6460'); cat(-2.3, QY + 0.36, 3.8, -0.4, '#f0e8d6');
  // the hanging homes under the arch (scenery: small houses slung from the span on chains, rope ladders down)
  {
    const parts = [], r = rng(13);
    for (const s of [0.4, 0.47, 0.55, 0.62]) {
      const [x, y] = archLine(ARCH, s), iy = y - archW(s) / 2 * 0.86, hy = iy - 4.6 - r() * 1.2, w = 3.0 + r(), hz = ARCH.z + (r() - 0.5) * 4;
      const wall = ['#f2e6cc', '#86b8ae', '#e8bc6c', '#cc7458'][Math.floor(r() * 4)];
      parts.push([tint(new THREE.BoxGeometry(w + 0.4, 0.3, 3.4), '#7a5c40'), x, hy, hz], [tint(new THREE.BoxGeometry(w, 2.4, 3.0), wall), x, hy + 1.35, hz]);
      parts.push([tint(new THREE.ConeGeometry((w + 0.8) / Math.SQRT2, 1.2, 4).rotateY(Math.PI / 4), '#d4835a'), x, hy + 3.15, hz]);
      parts.push([tint(new THREE.BoxGeometry(0.6, 0.9, 0.05), '#2c3a40'), x - w * 0.2, hy + 1.6, hz + 1.52]);
      for (const a of [-1, 1]) parts.push([tint(cyl(0.04, 0.04, iy - hy - 3.0, 4), '#4c4e56'), x + a * w * 0.4, (iy + hy + 3.0) / 2 + 0.3, hz]);
      parts.push([tint(cyl(0.02, 0.02, hy - 2, 3), '#c8a878'), x + w * 0.3, (hy + 2) / 2 - 0.2, hz + 1.6]);
    }
    const m = new THREE.Mesh(compose(parts, true), pm('#ffffff', 0.9, { vertexColors: true })); m.name = 'bl_hangingHomes'; m.castShadow = true; group.add(m);
  }
  // buoys and a herb raft in the outer water; skiffs at the quay (they bob)
  const bobs = [];
  const bob = (geo, x, y, z, ry = 0) => bobs.push([geo, M4(x, y, z, ry), new THREE.Vector3(x, y, z)]);
  for (const [x, z, c] of [[-30, 20, '#c8764e'], [8, 22, '#9cc8b4'], [30, 24, '#e6b866'], [-46, -10, '#c8764e'], [46, -30, '#9cc8b4']]) bob(buoyGeo(c), x, 0, z);
  bob(skiffGeo('#5f9a86'), -15.0, 0, 17.0, 0.2); bob(skiffGeo('#c6684c'), -1.5, 0, 17.6, -0.1);
  { const m = new THREE.Mesh(bobGeo(bobs), bobbed(BM.vc())); m.name = 'bl_floating'; m.castShadow = true; m.userData.keep = true; group.add(m); }
  // gulls on the posts, the bell's roof, the arch's collar, the market's mast
  const gp = [{ x: -16, z: 3.6, y: QY + 0.7 }, { x: 16, z: 3.6, y: QY + 0.7 }, { x: BT.x + 1, z: BT.z, y: TER + BELL.h + 4.7 }, { x: 26, z: -4, y: COLLAR.top + 0.1 }, { x: 37, z: -12, y: COLLAR.top + 0.1 },
    { x: -19.8, z: -20, y: QY + 0.7 }, { x: FLOAT.x0 - 0.45, z: FLOAT.z0 - 0.45, y: 4.6 }, { x: FLOAT.x1 + 0.45, z: FLOAT.z1 + 0.45, y: 4.6 }, { x: -24.5, z: -5, y: PIER.top + 0.1 },
    { x: 6, z: 9, y: QY, ground: true }, { x: 30, z: -26, y: TER, ground: true }];
  const gulls = new Gulls({ parent: group, physics, name: 'bl_w2gulls', n: 6, seed: 31, perches: gp.map((p) => ({ ...p, x: p.x + ox, z: p.z + oz })) });
  for (const m of [gulls.body, gulls.wing]) m.position.set(-ox, 0, -oz);
  B.build();
  yield;

  // ================================================================ the rooms (archrooms.js)
  const AR = buildArchRooms(scene, physics), rooms = AR.rooms, pumpCtl = AR.pump;
  yield;

  // ================================================================ the region's room object
  const W = (x, z, a) => ({ x: x + ox, z: z + oz, ...(a != null ? { a } : {}) });
  const MAGS_DOOR = { x: ROW[MAGS][0] - ROW[MAGS][1] * 0.18, z: WALK.z0 - 0.25 };
  const OREN_DOOR = { x: 32.5 - 1.2, z: -33 + 2.7 + 0.25 };
  const spawns = {
    fromHarbor: W(-8, 20.4, Math.PI), fromGardens: W(GATE_E.x - 1.6, GATE_E.z, -Math.PI / 2), steps: W(STEPS.x, STEPS.z + 3.2, Math.PI),
    orenOut: W(OREN_DOOR.x, OREN_DOOR.z + 1.2, 0), magsOut: W(MAGS_DOOR.x, WALK.z0 + 1.0, 0), pumpOut: W(PUMP_DOOR.x + 1.6, PUMP_DOOR.z, Math.PI / 2),
    orenIn: { ...ROOMS.oren.spawn }, magsIn: { ...ROOMS.mags.spawn }, pumpIn: { ...ROOMS.pump.spawn },
  };
  const doorsOut = {
    orenOut: { ...W(OREN_DOOR.x, OREN_DOOR.z), r: 0.6, room: 'bl_oren' },
    magsOut: { ...W(MAGS_DOOR.x, MAGS_DOOR.z), r: 0.55, room: 'bl_mags' },
    pumpOut: { ...W(PUMP_DOOR.x + 0.35, PUMP_DOOR.z), r: 0.7, room: 'bl_pump' },
  };
  const exits = {
    toHarbor: { ...W(-8, LAND.z1 - 0.6), r: 1.0, room: 'ballastra' },
    toGardens: { ...W(GATE_E.x + 0.6, GATE_E.z), r: 0.8, room: 'bl_gardens' },
  };
  const R = {
    id: 'bl_arches', outdoor: true, sky: false, group, center: new THREE.Vector3(ox, 0, oz), lights: [], exits: [exits.toHarbor, doorsOut.orenOut, doorsOut.magsOut, doorsOut.pumpOut],
    searches: [], ballTargets: [], givers: [], updaters, music: 'harbour', env, spawn: spawns.fromHarbor,
    entries: { ballastra: spawns.fromHarbor, bl_oren: spawns.orenOut, bl_mags: spawns.magsOut, bl_pump: spawns.pumpOut, bl_gardens: spawns.fromGardens },
    sounds: [{ kind: 'water', ...W(-6, -16), r: 30, vol: 0.35 }, { kind: 'water', ...W(0, 22), r: 24, vol: 0.4 }],
    safe: [W(-8, 9), W(8, 9), W(-22, -8), W(30, 0), W(30, -26), W(-8, 21)],
    colliders: statics,
    sample: [W(-8, 21), W(-8, 9), W(-22, -8), W(-22, -22), W(STEPS.x, STEPS.z + 1), W(22, 8), W(30, 0), W(22, -10), W(30, -26), W(-5.5, -1)],
  };
  const STONE_RECTS = [[QUAY.x0, QUAY.z0, QUAY.x1, QUAY.z1], [LEDGE.x0, LEDGE.z0, LEDGE.x1, LEDGE.z1], [JETTY.x0, JETTY.z0, JETTY.x1, JETTY.z1], [20, -40, 40, 14], [-24, -30.5, -20, -28.5]];
  Object.defineProperty(R, 'surface', { get() { const h = globalThis.game?.hero?.pos; if (!h) return 'wood'; const x = h.x - ox, z = h.z - oz; return STONE_RECTS.some(([a, b, c, d]) => x > a && x < c && z > b && z < d) || Math.hypot(x - STEPS.x, z - STEPS.z) < STEPS.r + 4.8 ? 'stone' : 'wood'; } });

  // ================================================================ state and handles
  const S = { level: 0, wy: WL[0], wyFrom: WL[0], wyTo: WL[0], wyT: 1, home: false, dunnOpen: false, doorA: 0, hits: 0, siltK: 0,
    severed: false, pawl: false, gate: false, tied: true, horns: [0, 1, 2], hornA: [0, 0, 0], cam: 0, camA: 0, swing: 0, swingT: 0, ringing: false, rings: [], pullT: 0 };
  const listeners = [];
  const sfx = (name, x, z) => { const G = globalThis.game; if (!G || G.room !== R || G.state !== 'play') return; if (Math.hypot(G.hero.pos.x - ox - x, G.hero.pos.z - oz - z) < 45) G.audio?.play?.(name); };
  const changed = (what) => { for (const f of listeners) { try { f(what); } catch (e) { console.warn('ballastra arches listener', e); } } };
  const CANAL_S = 5, DOOR_S = 0.9;
  // the row's look follows home and the level: washing out and shutters open only when home and not flooded
  const applyRow = () => {
    const out = S.home && S.level !== 0;
    washG.visible = out; shutO.visible = out; shutC.visible = !out;
    boatW.visible = S.home && S.wy > 0.75; boatA.visible = S.home && S.wy <= 0.75;
    ropes.forEach((m, i) => { m.visible = S.home && i === (S.wy > 1.9 ? 0 : S.wy > 0.75 ? 1 : 2); });
  };
  // what follows the water: the float, the gangways, the floors that are dry, the boards, the gauge's float
  const applyWater = () => {
    const wy = S.wy; canalW.position.y = wy; marker.position.y = wy;
    const fy = Math.max(wy + FLOAT_DY, FLOAT_MIN);
    floatG.position.y = fy;
    const dry = wy < WALK_Y - 0.12;
    for (const k of floatCols) { k.c.top = fy + k.dy; if (k.gnGap) k.c.enabled = !dry; }
    walkCol.enabled = dry; landCol.enabled = dry;
    for (const c of boatStepCols) c.enabled = wy < BOAT_STEP - 0.05;
    dunnPit.enabled = wy < BOAT_STEP - 0.05;
    for (const t of tierCols) t.c.enabled = t.top > wy + 0.05;
    boardsG.visible = !dry; for (const c of boardCols) c.enabled = !dry;
    // the gangways: the jetty's to the float always; the row's only while the walkway is dry (else drawn up)
    const put = (gw, yA, yB, up) => {
      const dz = Math.abs(gw.G.zB - gw.G.zA);
      let th = Math.atan2(yB - yA, dz); if (up) th = 0.85;
      gw.g.position.y = yA; gw.g.rotation.x = gw.dir < 0 ? th : -th; gw.g.scale.z = up ? 1 : 1 / Math.cos(th);
      gw.segs.forEach((c, i) => { c.top = yA + (yB - yA) * (i + 0.5) / gw.N; c.enabled = !up; });
    };
    put(gS, QY, fy, false);
    put(gN, WALK_Y, fy, !dry);
    boatW.position.y = wy - 0.02; boatA.position.y = 0.3;
    applyRow();
  };
  const placeDoor = () => { doorHinge.rotation.y = ease(S.doorA) * 1.75; doorCol.enabled = S.doorA < 0.5; };
  const placeSilt = () => { const k = Math.min(3, S.hits); siltM.forEach((m, i) => { m.visible = i === k; }); siltCol.enabled = k < 3; siltCol.top = WALK_Y + Math.max(0.15, SILT_H[k] - 0.15); };
  const placeBell = () => {
    tieM.visible = S.tied; camW.rotation.z = S.camA * Math.PI;
    horns.forEach((g, i) => { g.rotation.y = S.hornA[i]; });
  };
  const hornYaw = (dir) => HORN_DIRS[dir];
  const H = {
    rooms: ['bl_arches', 'bl_oren', 'bl_mags', 'bl_pump'],
    spawns,
    exits,
    doors: { ...doorsOut, orenIn: { ...rooms.bl_oren.exits[0] }, magsIn: { ...rooms.bl_mags.exits[0] }, pumpIn: { ...rooms.bl_pump.exits[0] } },
    stands: {
      oren_table: { ...ROOMS.oren.table }, oren_terrace: W(37.4, -25.2, Math.PI / 2), oren_steps: W(STEPS.x, STEPS.z - 0.4, 0),
      mags_house: { ...ROOMS.mags.host }, mags_row: W(MAGS_DOOR.x + 1.2, WALK.z0 + 1.0, 0.3), mags_steps: W(STEPS.x - 2.6, STEPS.z + 0.9, Math.PI * 0.6),
      dunn_door: W(DX + 1.4, WALK.z0 + 1.1, -Math.PI / 2 - 0.3), corvin_stall: W(-10.2, -13.2, Math.PI / 2), hobb_market: W(1.2, -13.0, -Math.PI / 2),
      tessa_steps: W(STEPS.x + 2.4, STEPS.z + 1.4, -Math.PI * 0.6), tessa_pump: { ...ROOMS.pump.tessa }, tib_bell: W(BT.x - BELL.s / 2 - 1.0, BT.z + 1.2, Math.PI / 2),
      quill_steps: W(STEPS.x + 0.3, STEPS.z + 2.6, Math.PI),
      row1: W(ROW[1][0] - ROW[1][1] * 0.18 + 0.9, WALK.z0 + 0.9, 0.2), row2: W(ROW[3][0] - ROW[3][1] * 0.18 + 0.9, WALK.z0 + 0.9, -0.2),
      row3: W(ROW[5][0] - ROW[5][1] * 0.18 + 0.9, WALK.z0 + 0.9, 0.3), row4: W(ROW[6][0] - ROW[6][1] * 0.18 + 0.9, WALK.z0 + 0.9, -0.3),
      market1: W(-5.6, -12.4, Math.PI * 0.8), market2: W(-2.4, -18.6, -Math.PI / 2), market3: W(-8.0, -20.0, Math.PI / 2 + 0.4),
    },
    spots: {
      orenPlan: { ...ROOMS.oren.plan }, pumpPlates: { ...ROOMS.pump.plates }, pumpMachine: { ...ROOMS.pump.machine }, spillWheel: { ...ROOMS.pump.wheel },
      dunnDoor: { ...W(DX, WALK.z0 + 0.95), r: 0.9 }, noticeBoard: { ...W(NB.x, NB.z - 0.9), r: 1.0 },
      bellPull: { ...W(BT.x - BELL.s / 2 - 0.7, BT.z), r: 0.8 }, bellCam: { ...W(BT.x + 1.2, BT.z + BELL.s / 2 + 1.0), r: 0.8 },
      bellHorn0: { ...W(BT.x + BELL.s / 2 + 0.95, BT.z - 1.3), r: 0.6 }, bellHorn1: { ...W(BT.x + BELL.s / 2 + 0.95, BT.z), r: 0.6 }, bellHorn2: { ...W(BT.x + BELL.s / 2 + 0.95, BT.z + 1.3), r: 0.6 },
    },
    safe: R.safe,
    ballTargets: { spillPawl: { ...ROOMS.pump.pawl } },
    swordTargets: { spillChain: { ...ROOMS.pump.chain }, dunnSilt: { ...W(DX, WALK.z0 + 0.15), y: WALK_Y + 0.5, r: 0.9 } },
    canal: {
      setLevel(l, instant = false) {
        l = clamp(Math.round(l), 0, 2); const was = S.level; S.level = l;
        if (instant) { S.wy = WL[l]; S.wyT = 1; } else if (Math.abs(WL[l] - S.wy) > 1e-3) { S.wyFrom = S.wy; S.wyTo = WL[l]; S.wyT = 0; sfx('waterRun', -6, -16); }
        applyWater(); if (l !== was) changed('canal');
      },
      get level() { return S.level; }, get levelName() { return LEVEL_NAME[S.level]; }, get y() { return S.wy; }, get moving() { return S.wyT < 1; }, LEVELS: WL.slice(),
    },
    row: { setHome(b, instant = false) { b = !!b; const was = S.home; S.home = b; applyRow(); void instant; if (b !== was) changed('row'); }, get home() { return S.home; } },
    dunnDoor: { setOpen(b, instant = false) { b = !!b; const was = S.dunnOpen; S.dunnOpen = b; if (instant) { S.doorA = b ? 1 : 0; placeDoor(); } else if (b !== was) sfx(b ? 'slam' : 'door', DX, WALK.z0); if (b !== was) changed('dunnDoor'); }, get open() { return S.dunnOpen; } },
    silt: { setHits(n, instant = false) { n = clamp(Math.round(n), 0, 3); const was = S.hits; S.hits = n; placeSilt(); if (!instant && n !== was) sfx(n > was ? 'hitStone' : 'thump', DX, WALK.z0); if (n !== was) changed('silt'); }, get hits() { return S.hits; }, get cleared() { return S.hits >= 3; } },
    chain: { cut(instant = false) { if (S.severed) return; S.severed = true; pumpCtl.setChain(true, instant); changed('chain'); }, reset(instant = false) { if (!S.severed) return; S.severed = false; pumpCtl.setChain(false, instant); changed('chain'); }, get severed() { return S.severed; } },
    pawl: { release(instant = false) { if (S.pawl) return; S.pawl = true; pumpCtl.setPawl(true, instant); changed('pawl'); }, reset(instant = false) { if (!S.pawl) return; S.pawl = false; pumpCtl.setPawl(false, instant); changed('pawl'); }, get released() { return S.pawl; } },
    spillGate: { setOpen(b, instant = false) { b = !!b; if (b === S.gate) return; S.gate = b; pumpCtl.setGate(b, instant); changed('spillGate'); }, get open() { return S.gate; }, get moving() { return pumpCtl.gateMoving(); } },
    bell: {
      untie(instant = false) { if (!S.tied) return; S.tied = false; placeBell(); if (!instant) sfx('ropeCreak', BT.x, BT.z); changed('bell'); },
      tie(instant = false) { if (S.tied) return; S.tied = true; placeBell(); void instant; changed('bell'); },
      get tied() { return S.tied; },
      setHorn(i, dir, instant = false) { i = clamp(Math.round(i), 0, 2); dir = clamp(Math.round(dir), 0, 2); if (S.horns[i] === dir && (instant || Math.abs(wrapA(S.hornA[i] - hornYaw(dir))) < 1e-3)) return; S.horns[i] = dir; if (instant) S.hornA[i] = hornYaw(dir); else sfx('gearClack', BT.x, BT.z); placeBell(); changed('bell'); },
      get horns() { return S.horns.slice(); },
      setCam(c, instant = false) { c = c ? 1 : 0; if (c === S.cam) return; S.cam = c; if (instant) S.camA = c; else sfx('clunk', BT.x, BT.z); placeBell(); changed('bell'); },
      get cam() { return S.cam; },
      ring() {
        if (S.tied) { S.pullT = 0.6; sfx('thump', BT.x, BT.z); return null; }
        const tones = S.cam ? 2 : 1;
        S.ringing = true; S.swingT = 0; S.pullT = 0.8; S.rings = tones === 2 ? [0.35, 1.25] : [0.35];
        changed('bell');
        return { tones, horns: S.horns.slice() };
      },
      get ringing() { return S.ringing; },
      HORN_DIRS: ['terrace', 'lower row', 'gardens'],
    },
    onChange(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    // (for tests and pictures: the build's numbers)
    plan: { WL, WALK_Y, BOAT_STEP, FLOOR, QY, TER, FLOAT_DY, FLOAT_MIN, BASIN, WALK, FLOAT, GS, GN, STEPS, ROW, MAGS, DUNN, ROW_Z, ROW_D, LEDGE, QUAY, LAND, ESTAIR, GAUGE: { x: GX, z: GZ }, BELL: { x: BT.x, z: BT.z } },
  };
  function wrapA(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  R.arches = H; R.npcSpots = H.stands; BALLASTRA.arches = H;
  for (const id of ['bl_oren', 'bl_mags', 'bl_pump']) rooms[id].arches = H;

  // ---- the bell's voice: one or two tones (the game's synth, the sound of a bronze bell: a low partial and a hum)
  const bellTone = (at) => {
    const G = globalThis.game, A = G?.audio; if (!A || G.room !== R || G.state !== 'play') return;
    const h = G.hero; if (Math.hypot(h.pos.x - ox - BT.x, h.pos.z - oz - BT.z) > 80) return;
    if (A._tone) { A._tone({ type: 'sine', f0: 196, f1: 194, dur: 2.6, vol: 0.09 }); A._tone({ type: 'triangle', f0: 392, f1: 388, dur: 1.4, vol: 0.035 }); A._tone({ type: 'sine', f0: 470, f1: 466, dur: 1.0, vol: 0.02 }); }
    else A.play?.('clang');
    void at;
  };

  // ---- per frame
  const _v = new THREE.Vector3();
  let dryAt = null, wetT = 0;
  updaters.push((dt, t) => {
    sea.update(dt, t); BOB.t.value = t;
    // the canal fills or drains (about 5 s), everything on it follows
    if (S.wyT < 1) { S.wyT = Math.min(1, S.wyT + dt / CANAL_S); S.wy = S.wyFrom + (S.wyTo - S.wyFrom) * ease(S.wyT); applyWater(); if (S.wyT >= 1) sfx('clunk', -6, -16); }
    // Dunn's door
    const dTo = S.dunnOpen ? 1 : 0;
    if (S.doorA !== dTo) { S.doorA = dTo > S.doorA ? Math.min(1, S.doorA + dt / DOOR_S) : Math.max(0, S.doorA - dt / DOOR_S); placeDoor(); }
    // the bell: the horns turn (about 0.8 s), the cam turns, the bell swings and sounds
    for (let i = 0; i < 3; i++) { const to = hornYaw(S.horns[i]), d = wrapA(to - S.hornA[i]); if (Math.abs(d) > 1e-3) { S.hornA[i] += Math.sign(d) * Math.min(Math.abs(d), dt * 2.4); horns[i].rotation.y = S.hornA[i]; hwheels[i].rotation.x += dt * 6; } }
    if (S.camA !== S.cam) { S.camA = S.cam > S.camA ? Math.min(1, S.camA + dt * 1.6) : Math.max(0, S.camA - dt * 1.6); camW.rotation.z = S.camA * Math.PI; }
    if (S.pullT > 0) { S.pullT = Math.max(0, S.pullT - dt); pullRope.position.y = bellTop - 0.2 - Math.sin(Math.PI * Math.min(1, S.pullT / 0.8)) * 0.35; }
    if (S.ringing) {
      S.swingT += dt;
      for (let i = 0; i < S.rings.length; i++) if (S.rings[i] != null && S.swingT >= S.rings[i]) { bellTone(i); S.rings[i] = null; }
      const k = Math.exp(-S.swingT * 0.9);
      bellG.rotation.x = Math.sin(S.swingT * 4.2) * 0.32 * k; clapper.rotation.x = Math.sin(S.swingT * 4.2 - 0.6) * 0.45 * k;
      if (S.swingT > 4.5) { S.ringing = false; bellG.rotation.x = 0; clapper.rotation.x = 0; changed('bell'); }
    }
    // the life: gulls; the soft edge (anyone over the water without a floor under him is eased back to where he stood)
    const G = globalThis.game;
    if (!G || G.room !== R) return;
    const h = G.hero;
    gulls.update(G.state === 'play' ? dt : 0, { outdoors: true, hero: { x: h.pos.x, y: h.pos.y, z: h.pos.z, speed: h.speed || 0 }, near: [] });
    if (G.state !== 'play' || G.trans) return;
    const gi = physics.groundInfo(h.pos.x, h.pos.z, h.pos.y + 0.6);
    if (gi.brick || gi.h >= WATER_FLOOR) { if (h.onGround) dryAt = { x: h.pos.x, z: h.pos.z }; wetT = 0; return; }
    wetT += dt;
    let to = dryAt; if (to && !physics.groundInfo(to.x, to.z, 60).brick) to = null;
    to ??= nearestSafe(h.pos);
    _v.set(to.x - h.pos.x, 0, to.z - h.pos.z);
    const d = _v.length();
    if (wetT > 1.2 || d < 0.05) { h.pos.x = to.x; h.pos.z = to.z; h.pos.y = physics.groundAt(to.x, to.z, 60); h.vy = 0; h.onGround = true; wetT = 0; dryAt = { x: to.x, z: to.z }; return; }
    const step = Math.min(d, dt * 3.5); h.pos.x += (_v.x / d) * step; h.pos.z += (_v.z / d) * step;
  });
  const nearestSafe = (p) => { let best = R.safe[0], bd = Infinity; for (const s of R.safe) { if (!physics.groundInfo(s.x, s.z, 60).brick) continue; const d = Math.hypot(s.x - p.x, s.z - p.z); if (d < bd) { bd = d; best = s; } } return best; };
  // the start: flooded, the row's people away, Dunn's door silted shut, the gate chained, the bell's clapper tied
  S.hornA = S.horns.map(hornYaw); horns.forEach((g, i) => { g.rotation.y = S.hornA[i]; });
  H.canal.setLevel(0, true); H.row.setHome(false, true); H.silt.setHits(0, true); H.dunnDoor.setOpen(false, true);
  placeDoor(); placeSilt(); placeBell(); applyWater();
  updaters[0](0, 0);
  return { bl_arches: R, ...rooms };
}
