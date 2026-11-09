// W-3 · The Water Gardens (EXPANSION_WORLD_SPEC.md): shared water made visible. The region 'bl_gardens' and its rooms
// 'bl_tunnel' (the service tunnel under the splitter) and 'bl_kiln' (Corvin's glazing workshop), gardenrooms.js. The
// place only: the story (the cloud's) drives its moving parts through BALLASTRA.gardens; the residents (W-7) stand on
// its spots.
//
// One idea, in form: where the water goes is something you can see and follow. It comes in high on a stone aqueduct
// from the north, into the splitter house; out of it run three ways, each its own channel you can walk along:
//   G1 the gardens: a cut channel across the upper yard, under the north path, a spout into the upper basin; from there
//      it steps down through the terraces over the weirs' notches (three basins, rice-terrace fashion, but floating);
//   G2 the kiln: a leat on its own wall the whole length of the north side, falling onto Corvin's water wheel at the far
//      east (the wheel drives his bellows and his potter's wheel);
//   G3 the overflow: west across the plaza and down a stepped spillway to the sea.
// Two big gauges stand side by side at the splitter, readable from the plaza: the upper channel and the lower gardens.
// The record of the water is on the basins' walls (the full line, salt, the older marks): a dry basin shows how far
// it has fallen. The cultivation rafts and the walkways between them ride the basins' water: dry, they sit on cracked
// mud, the walkways low; green, they float high. South of the middle basin, the test installation: a stone platform with
// three linked shallow basins (wadeable), each with a float, a level mark, a lamp, a range dial and a switch latch high
// on a post; a frame with five part slots; a storm tank whose sluice feeds the rig.
//
// The plan (local metres, x east, z south; the hero comes in through the west gate from the Arch District):
//   heights: the sea 0; the upper level 6.4 (the west plaza, the splitter yard, the north and south paths round the upper
//   basin); the middle level 4.8 (the paths round the middle basin, the rig's platform); the lower level 3.2 (the paths
//   round the lower basin, the east terrace with the kiln). Basins: upper x −35…−7.5 (full 5.7, bed 4.7), middle
//   x −5…20.5 (full 4.1, bed 3.1), lower x 23…47.5 (full 2.5, bed 1.5), all z −7…16; weirs between them.
//   - the west plaza (x −56…−35): the gate from the Arch District, the splitter house (north-west), the gauges in front
//     of it, the tunnel's hatch east of it; the overflow channel west, the gardens' channel east; the aqueduct comes in
//     from the north;
//   - the north path along the basins (z −14…−7), stepping down at the weirs; the leat on its wall north of it; each
//     basin a hinged gangway down to a floating walkway, south to the south path's gangway, and a cross walkway;
//   - the south path (z 16…22) and the rig's platform south of the middle basin (z 22…37);
//   - the east terrace (x 47.5…64): Corvin's kiln, its water wheel on the north wall, its bottle chimney; the causeway
//     to the House of Balances leaves its south-east corner (W-4: closed).
//
// CONTRACT (world coordinates; every setter is a pure state setter, `instant` for loading, safe to call any time)
//   GARDENS_AT {x, z}; buildGardensSteps(scene, physics) (a generator, regions.js builds it in steps) /
//   buildGardens(scene, physics) → { bl_gardens, bl_tunnel, bl_kiln }
//   BALLASTRA.gardens = H:
//     rooms ['bl_gardens', 'bl_tunnel', 'bl_kiln'] · spawns {fromArches, fromHouse, tunnelIn, tunnelOut, kilnIn, kilnOut,
//       rig} {x, z, a}
//     exits {toArches (active: to W-2's fromGardens), toHouse (data: W-4's causeway, for the story to enable)}
//     doors {tunnelOut (the hatch, down), tunnelIn (the ladder, up), kilnOut, kilnIn} {x, z, r, room} (active)
//     stands {wenna_rafts, wenna_gauges, grower1, grower2, corvin_kiln, corvin_wheel, tessa_rig, oren_rig, mags_rig,
//       wenna_rig, tib_sluice, rigWatch1…rigWatch4} {x, z, a}
//     spots {gaugeUpper, gaugeLower, tunnelHatch, tap, bypassValve, gate1, rigSlot0…4, rigRange0…2} {x, z, r} ·
//       safe [{x, z}] (several)
//     ballTargets {gate2Latch, gate3Latch, rigSwitch0…2} {x, y, z, r}
//     channels.show({ upper, gardens, kiln, overflow } 0..1 flow (any subset), instant), .flows
//     gauges.set(upper, lower 0..1, instant), .upper, .lower
//     gate.set(id 1|2|3, 0 closed | 1 half | 2 open, instant), .get(id)
//     tap.setOpen(b, instant), .open · bypass.setFree(b, instant), .free
//     rafts.setState(0 dry | 1 recovering | 2 green, instant), .state
//     walkways.setLevel(t 0 dry … 1 full, instant), .level, .moving (the basins' water and all that floats on it)
//     kiln.setRunning(b, instant), .running · wheel.setSpeed(0..1), .speed
//     rig.setPart(slot 0…4, b, instant), rig.setRange(basin 0…2, 0|1|2, instant), rig.setLevels([a, b, c] 0..1,
//       instant), rig.setLamp(basin, 'off'|'green'|'amber'|'red'), rig.spill(basin, toBasin) (a visible overflow,
//       about 2.5 s), rig.setSluice(b, instant); .parts .ranges .levels .lamps .sluice
//     onChange(fn)  fn(what) after any state change ('channels', 'gauges', 'gate', 'tap', 'bypass', 'rafts',
//       'walkways', 'kiln', 'wheel', 'rig')
//   Collision follows the state: the floating walkways and the rafts ride the basins' water (the rafts are planted:
//   not walked on); the gangways tilt from the paths down to them; the rig's basins are shallow floors (wadeable).
import * as THREE from 'three';
import { Batch, cached, bbox, cyl, lathe, tube, compose, tint, tm, pm, ctex, boxUV } from '../kit.js';
import { Place } from '../props-esmer.js';
import { BM, M4, deckSlab, railRun, stepsGeo, lantern, crateStack, sack, herbPot, ballastPot, barrow, buoyGeo, bobbed, bobGeo, BOB } from './look.js';
import { AM, tallHouse, tideMarks, weedGeo } from './archhouses.js';
import { seaSetup, setBedShape } from './sea.js';
import { buildGardenRooms, GROOMS } from './gardenrooms.js';
import { BALLASTRA, BALLASTRA_AT } from './common.js';
import { Gulls } from '../gulls.js';
import { WATER_FLOOR } from '../../engine/physics.js';
import { fbm, rng } from '../../engine/math.js';

export { BALLASTRA };
export const GARDENS_AT = BALLASTRA_AT.bl_gardens;

// ------------------------------------------------------------------ the plan
const UP = 6.4, MID = 4.8, LOW = 3.2;                       // the three path levels
const BZ0 = -7, BZ1 = 16;                                   // the basins' north and south walls
const BAS = [                                               // the basins: x, full water, bed, the paths beside them
  { x0: -35, x1: -7.5, full: 5.7, bed: 4.7, path: UP },
  { x0: -5, x1: 20.5, full: 4.1, bed: 3.1, path: MID },
  { x0: 23, x1: 47.5, full: 2.5, bed: 1.5, path: LOW },
];
BAS.forEach((b) => { b.cx = (b.x0 + b.x1) / 2; });
const DYKES = [{ x0: -7.5, x1: -5, top: 5.85 }, { x0: 20.5, x1: 23, top: 4.25 }];
const NP = { z0: -14, z1: -7 }, SP = { z0: 16, z1: 22 };   // the north and south paths
const STAIRS = [{ x0: -8, x1: -4.5, hi: UP, lo: MID }, { x0: 20.5, x1: 24, hi: MID, lo: LOW }];
const PLAZA = { x0: -56, x1: -35, z0: -27, z1: 22 };
const HOUSE = { x: -46, z: -21.5, w: 7, d: 5 };            // the splitter house (x −49.5…−42.5, z −24…−19)
const G1C = { z0: -20.6, z1: -19.4, x0: -42.5, xt: -30.6, xt1: -29.4, bed: 5.9 };   // the gardens' channel: east, then south under the path
const G3C = { z0: -21.6, z1: -20.4, x0: -56, x1: -49.5, bed: 6.0 };                 // the overflow: west to the edge
const LEAT = { x0: -42.5, x1: 52.0, z0: -23.8, z1: -22.2, y0: 7.5, y1: 6.1 };       // the kiln's leat (bed falls east)
const AQ = { x: -46, z0: -82, z1: -24, bed: 8.4, w: 2.4 };                           // the aqueduct (from the north)
const EAST = { x0: 47.5, x1: 64, z0: -26, z1: 26 };
const KILN = { x0: 52, x1: 62, z0: -21.6, z1: -11.6, door: 55 };
const WHEEL = { x: 51.15, z: -17.0, y: 4.0, r: 2.4 };                   // on the kiln's west wall, its axle into the wall (seen from the terrace)
const PIT = { x0: 50.3, x1: 52, z0: -19.8, z1: -14.2 };
const CHIM = { x: 60.5, z: -8.2 };
const RIG = { x0: -4.5, x1: 20.5, z0: 22, z1: 37 };
const RB = [2.5, 9.25, 16].map((x) => ({ x, z: 31, s: 4.6 }));                       // the rig's three basins A, B, C
const RIG_FLOOR = MID - 0.25, RIG_FULL = MID + 0.15, RIM = MID + 0.2;   // (a step down in, a step up out)
const FRAME = { x: 9.25, z: 25.2 };
const TANK = { x0: -3.8, x1: -0.6, z0: 31, z1: 34.6, top: 6.6 };
const GATE_W = { x: -56, z: 0 };
const GATE2 = { x: -39.6 }, GATE3 = { x: -59.4, z: -24.6 };   // (G3's latch on a pier in the sea north of the spillway)
const CAUSE = { z0: 20.6, z1: 25.4 };
// the rafts in each basin (relative to its centre x, absolute z) and the floating walkways
const RAFT_DX = [-6.2, -2.7, 2.7, 6.2], RAFT_Z = [-1.7, 1.6, 7.4, 10.7], RAFT = { w: 3.0, d: 2.6 };
const WALK = { z0: -3.5, z1: 12.5, w: 2.0, cz: 4.5, cw: 1.6, cx: 8.4 };
const GANG = { w: 2.0, run: 3.5, n: 9 };   // the hinged gangways from the paths down to the walkways' ends

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const lerp = (a, b, t) => a + (b - a) * t;
const levelY = (b, t) => b.bed + 0.12 + t * (b.full - b.bed - 0.12);   // a basin's water at walkway level t

// the drawn bed round the gardens: the sea's floor (the basins have their own beds, drawn here)
function bedShape() {
  return {
    bed(x, z) { const r = Math.hypot(x / 70, (z - 2) / 50); return Math.min(-0.6, -4.4 + Math.max(0, 1.3 - r) * 5.2 + (fbm(x * 0.05 + 1.3, z * 0.05 - 3.3, 3) - 0.5) * 0.7); },
  };
}
// cracked mud (a dry basin) and wet mud (a basin with water in it)
const crackTex = () => ctex('blw3crack', 256, 256, (g, W) => {
  g.fillStyle = '#a28a62'; g.fillRect(0, 0, W, W);
  const r = rng(5);
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? 'rgba(80,60,40,0.08)' : 'rgba(240,220,180,0.08)'; g.fillRect(r() * W, r() * W, 6, 6); }
  g.strokeStyle = 'rgba(60,44,30,0.85)'; g.lineWidth = 2.2;
  const pts = []; for (let i = 0; i < 40; i++) pts.push([r() * W, r() * W]);
  for (const [x, y] of pts) { let px = x, py = y; g.beginPath(); g.moveTo(px, py); for (let k = 0; k < 4; k++) { px += (r() - 0.5) * 70; py += (r() - 0.5) * 70; g.lineTo(px, py); } g.stroke(); }
  g.lineWidth = 1; for (let i = 0; i < 120; i++) { const x = r() * W, y = r() * W; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 30); g.stroke(); }
});
const wetTex = () => ctex('blw3wetmud', 256, 256, (g, W) => {
  g.fillStyle = '#6c624a'; g.fillRect(0, 0, W, W);
  const r = rng(9);
  for (let i = 0; i < 500; i++) { g.fillStyle = r() < 0.6 ? 'rgba(70,90,50,0.18)' : 'rgba(40,34,24,0.15)'; g.beginPath(); g.ellipse(r() * W, r() * W, 4 + r() * 10, 3 + r() * 6, r() * 3, 0, 7); g.fill(); }
});
// the falling water's streaks (one texture, scrolled: every fall in the place)
const fallTex = () => ctex('blw3fall', 64, 256, (g, W, H) => {
  g.clearRect(0, 0, W, H);
  const r = rng(3);
  for (let i = 0; i < 40; i++) { const x = r() * W, w = 2 + r() * 5; const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(230,248,244,0.0)'); gr.addColorStop(0.3 + r() * 0.3, 'rgba(236,250,246,0.85)'); gr.addColorStop(1, 'rgba(210,240,236,0.1)'); g.fillStyle = gr; g.fillRect(x, 0, w, H); }
  g.fillStyle = 'rgba(200,236,230,0.35)'; g.fillRect(0, 0, W, H);
});
// the gauges' scale boards (no words: bands, a celadon "enough" band, a red "low" band)
const gaugeScale = (key, accent) => ctex('blw3gauge' + key, 64, 512, (x, W, H) => {
  x.fillStyle = '#efe6cc'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#c8443a'; x.fillRect(0, H - 110, W, 110);
  x.fillStyle = accent; x.fillRect(0, 70, W, 150);
  x.fillStyle = '#2f4f6c'; for (let i = 0; i <= 10; i++) x.fillRect(i % 5 ? 30 : 8, H - 20 - i * 47, W - (i % 5 ? 38 : 16), i % 5 ? 3 : 6);
}, false);

export function buildGardens(scene, physics) { const it = buildGardensSteps(scene, physics); let r = it.next(); while (!r.done) r = it.next(); return r.value; }

export function* buildGardensSteps(scene, physics) {
  const ox = GARDENS_AT.x, oz = GARDENS_AT.z;
  const group = new THREE.Group(); group.name = 'bl_gardens'; group.visible = false; group.position.set(ox, 0, oz); scene.add(group);
  const B = new Batch(group);
  const P = (x, y, z, ry = 0) => new Place(B, x, y, z, ry);
  const statics = [];
  const col = (c) => { const w = physics.add({ ...c, x: c.x + ox, z: c.z + oz }); statics.push(w); return w; };
  const cols = (list) => { for (const c of list) col(c); };
  const box = (x0, z0, x1, z1, top, o = {}) => col({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, top, ...o });
  const keep = (o) => { o.userData.keep = true; return o; };
  const updaters = [];
  const sb = (w, h, d, tile = 1.8) => cached(`blw3sb${w.toFixed(2)}|${h.toFixed(2)}|${d.toFixed(2)}|${tile}`, () => boxUV(new THREE.BoxGeometry(w, h, d), tile));

  // ================================================================ the sea, the water's materials
  setBedShape(bedShape());
  const env = { fog: '#d8e8e0', sun: '#fff2dc', hemiSky: '#d2e8ee', hemiGround: '#90a07a', sunI: 2.45, hemiI: 1.32, fogRange: [70, 300], sunDir: [-0.45, 0.8, 0.4] };
  const sea = seaSetup(group, ox, oz, physics, { picture: null, sunDir: env.sunDir, env: { deep: '#2a7e88', shallow: '#6cc8b0', sky: '#d8eae6' } });
  // the inner waters (basins, channels): the sea's own look, their depth given (the drawn bed is the sea's)
  const waterMat = (depth) => {
    const m = new THREE.ShaderMaterial({ uniforms: { ...sea.mat.uniforms, uDepthOv: { value: depth } }, vertexShader: sea.mat.vertexShader,
      fragmentShader: sea.mat.fragmentShader.replace('uniform float uTime;', 'uniform float uTime; uniform float uDepthOv;').replace('float depth = max(vWorld.y - ground, 0.0);', 'float depth = uDepthOv;'),
      transparent: true, fog: true, depthWrite: false });
    m.userData.noShadow = true; return m;
  };
  const chanMat = waterMat(0.5);
  const plane = (w, d, nx = 1, nz = 1) => { const g = new THREE.PlaneGeometry(w, d, nx, nz); g.rotateX(-Math.PI / 2); return g; };
  const waterPlane = (x0, z0, x1, z1, y, mat, name) => { const m = new THREE.Mesh(plane(x1 - x0, z1 - z0, Math.max(1, Math.round((x1 - x0) / 2)), Math.max(1, Math.round((z1 - z0) / 2))), mat); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.renderOrder = 2; m.name = name; m.castShadow = false; group.add(keep(m)); return m; };
  // a strip of water along x whose surface falls from y0 to y1 (the leat)
  const slopedStrip = (x0, x1, z0, z1, y0, y1, mat, name) => {
    const n = Math.max(2, Math.round((x1 - x0) / 3)), g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, n, 1); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, lerp(y0, y1, (p.getX(i) + (x1 - x0) / 2) / (x1 - x0)));
    g.computeVertexNormals(); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const m = new THREE.Mesh(g, mat); m.renderOrder = 2; m.name = name; m.castShadow = false; group.add(keep(m)); return m;
  };
  // the falls: one streaked, scrolled material; each fall a vertical sheet (w wide, from top to bottom), facing ry
  const fallT = fallTex(); fallT.wrapS = fallT.wrapT = THREE.RepeatWrapping;
  const fallM = new THREE.MeshStandardMaterial({ map: fallT, transparent: true, depthWrite: false, roughness: 0.3, side: THREE.DoubleSide, color: '#ffffff' }); fallM.userData.noShadow = true;
  const fallGeo = (w, h, curl = 0.25) => { const g = new THREE.PlaneGeometry(w, h, 1, 6); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const t = (h / 2 - p.getY(i)) / h; p.setZ(i, Math.sin(t * Math.PI * 0.5) * curl); } g.computeVertexNormals(); return g; };
  const falls = { upper: [], gardens: [], kiln: [], overflow: [] };
  const fall = (kind, x, top, bottom, z, w, ry, curl) => { const m = new THREE.Mesh(fallGeo(w, top - bottom, curl), fallM); m.position.set(x, (top + bottom) / 2, z); m.rotation.y = ry; m.renderOrder = 3; m.castShadow = false; m.name = 'bl_fall_' + kind; group.add(keep(m)); falls[kind].push(m); return m; };
  yield;

  // ================================================================ stone: the plaza, the paths, the yard, the east terrace, the rig
  const pave = tm('stone', { color: '#efe2c4', rough: 0.88 });
  const mass = (x0, z0, x1, z1, top, { paveM = pave, bottom = -2.4, wetTop = 0.9, cap = true, colTop = true, stone = BM.stone() } = {}) => {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (wetTop > bottom) B.add(sb(w, wetTop - bottom, d, 1.7), BM.wet(), cx, (bottom + wetTop) / 2, cz);
    B.add(sb(w + 0.02, top - 0.14 - wetTop, d + 0.02, 1.8), stone, cx, wetTop + (top - 0.14 - wetTop) / 2, cz);
    if (cap) B.add(sb(w + 0.16, 0.18, d + 0.16, 1.2), BM.cap(), cx, top - 0.09, cz);
    if (paveM) B.add(sb(w - 0.12, 0.04, d - 0.12, 1.9), paveM, cx, top + 0.005, cz);
    if (colTop) box(x0, z0, x1, z1, top);
  };
  // the west plaza (round the splitter house and its channels) and the splitter yard
  mass(PLAZA.x0, -19.4, PLAZA.x1, PLAZA.z1, UP);
  mass(PLAZA.x0, G3C.z1, HOUSE.x - HOUSE.w / 2, -19.4, UP);
  mass(PLAZA.x0, PLAZA.z0, HOUSE.x - HOUSE.w / 2, G3C.z0, UP);
  mass(HOUSE.x - HOUSE.w / 2, PLAZA.z0, HOUSE.x + HOUSE.w / 2, -19.4, UP);
  mass(HOUSE.x + HOUSE.w / 2, PLAZA.z0, -35, G1C.z0, UP);
  mass(-35, G1C.z1, G1C.xt, NP.z0, UP); mass(G1C.xt1, G1C.z1, -24, NP.z0, UP);
  mass(-35, LEAT.z1, -24, G1C.z0, UP, { colTop: false }); box(-35, LEAT.z1, -24, G1C.z0, UP + 1.2, { block: true });   // (the channel's far bank: no way onto it)
  // the channels' beds (cut in the plaza: their walls are the masses' sides)
  B.add(sb(G1C.xt1 - G1C.x0, 0.4, G1C.z1 - G1C.z0, 1.4), BM.wet(), (G1C.x0 + G1C.xt1) / 2, G1C.bed - 0.2, (G1C.z0 + G1C.z1) / 2);
  B.add(sb(G1C.xt1 - G1C.xt, 0.4, NP.z0 - G1C.z1, 1.4), BM.wet(), (G1C.xt + G1C.xt1) / 2, G1C.bed - 0.2, (G1C.z1 + NP.z0) / 2);
  B.add(sb(G3C.x1 - G3C.x0, 0.4, G3C.z1 - G3C.z0, 1.4), BM.wet(), (G3C.x0 + G3C.x1) / 2, G3C.bed - 0.2, (G3C.z0 + G3C.z1) / 2);
  // the north and south paths, stepping down at the weirs; the east terrace; the rig's platform
  const PATHS = [[-35, BAS[0].path, STAIRS[0].x0], [STAIRS[0].x1, BAS[1].path, STAIRS[1].x0], [STAIRS[1].x1, BAS[2].path, EAST.x0]];
  for (const [x0, y, x1] of PATHS) { mass(x0, NP.z0, x1, NP.z1, y, { wetTop: Math.min(0.9, y - 1) }); mass(x0, SP.z0, x1, SP.z1, y, { wetTop: Math.min(0.9, y - 1) }); }
  mass(EAST.x0, EAST.z0, EAST.x1, PIT.z0, LOW);
  mass(EAST.x0, PIT.z0, PIT.x0, PIT.z1, LOW); mass(PIT.x1, PIT.z0, EAST.x1, PIT.z1, LOW);
  mass(EAST.x0, PIT.z1, EAST.x1, EAST.z1, LOW);
  // the rig's platform, round its three sunk basins (their floors a step down: wadeable)
  {
    const rp = { paveM: tm('stone', { color: '#e8dcc0', rough: 0.88 }) }, h = RB[0].s / 2 + 0.3, bz0 = RB[0].z - h, bz1 = RB[0].z + h;
    mass(RIG.x0, RIG.z0, RIG.x1, bz0, MID, rp); mass(RIG.x0, bz1, RIG.x1, RIG.z1, MID, rp);
    let x = RIG.x0; for (const r of RB) { mass(x, bz0, r.x - h, bz1, MID, rp); x = r.x + h; } mass(x, bz0, RIG.x1, bz1, MID, rp);
    for (const r of RB) B.add(sb(r.s, RIG_FLOOR + 2.3, r.s, 1.8), BM.stone(), r.x, (RIG_FLOOR - 0.1 - 2.4) / 2, r.z);
  }
  // the wheel's pit (the tail race's water at the bottom)
  B.add(sb(PIT.x1 - PIT.x0, 0.4, PIT.z1 - PIT.z0, 1.4), BM.wet(), (PIT.x0 + PIT.x1) / 2, 1.3, (PIT.z0 + PIT.z1) / 2);
  // the stairs between the levels (north and south, at the weirs)
  for (const s of STAIRS) for (const [z0, z1] of [[NP.z0, NP.z1], [SP.z0, SP.z1]]) {
    const p = P(s.x0, 0, (z0 + z1) / 2, Math.PI / 2); stepsGeo(p, z1 - z0, 0, s.x1 - s.x0, s.hi, s.lo, 8); cols(p.cols);
    B.add(sb(s.x1 - s.x0, s.lo + 2.4 - 0.1, z1 - z0, 1.8), BM.stone(), (s.x0 + s.x1) / 2, (s.lo - 0.1 - 2.4) / 2, (z0 + z1) / 2);
  }
  // the basins: their walls are the paths' sides; the weirs between them; each basin's bed (mud, cracked when dry)
  const crackM = pm('#ffffff', 1.0, { map: crackTex() }), wetM = pm('#ffffff', 0.95, { map: wetTex() });
  crackM.map.repeat.set(3, 3); wetM.map.repeat.set(3, 3);
  const beds = BAS.map((b, i) => { const m = new THREE.Mesh(plane(b.x1 - b.x0, BZ1 - BZ0), crackM); m.position.set(b.cx, b.bed, (BZ0 + BZ1) / 2); m.receiveShadow = true; m.name = 'bl_bed' + i; group.add(keep(m)); return m; });
  for (const b of BAS) B.add(sb(b.x1 - b.x0, b.bed + 2.4, BZ1 - BZ0, 1.8), BM.rubble(), b.cx, (b.bed - 2.4) / 2 - 0.02, (BZ0 + BZ1) / 2);
  for (const [i, d] of DYKES.entries()) {
    const w = d.x1 - d.x0, cx = (d.x0 + d.x1) / 2;
    B.add(sb(w, d.top + 2.4 - 0.12, BZ1 - BZ0, 1.8), AM.ashlar(), cx, (d.top - 0.12 - 2.4) / 2, (BZ0 + BZ1) / 2);
    // its coping, cut by the spill notch at the middle (the water steps down through it)
    for (const [z0, z1] of [[BZ0, WALK.cz - 0.7], [WALK.cz + 0.7, BZ1]]) B.add(sb(w + 0.1, 0.16, z1 - z0, 1.2), BM.cap(), cx, d.top - 0.04, (z0 + z1) / 2);
    box(d.x0, BZ0, d.x1, BZ1, d.top + 0.6, { block: true });
    tideMarks(B, { x0: d.x0, z0: BZ1, x1: d.x0, z1: BZ0 }, { bottom: BAS[i].bed, wet: BAS[i].bed + 0.35, salt: BAS[i].full, stain: AM.stoneStain(), marks: [BAS[i].full - 0.45] });
  }
  // the water's record on every basin wall: green to the low line, the stain to the full line, the salt there, older marks
  BAS.forEach((b, i) => {
    const T = (x0, z0, x1, z1, gaps) => tideMarks(B, { x0, z0, x1, z1 }, { bottom: b.bed, wet: b.bed + 0.35, salt: b.full, stain: AM.stoneStain(), marks: [b.full - 0.45], gaps });
    // (each run so that its right hand faces into the basin; the gaps are the gangways' heads)
    T(b.x1, BZ0, b.x0, BZ0, [[b.x1 - b.cx - GANG.w / 2 - 0.2, b.x1 - b.cx + GANG.w / 2 + 0.2]]);
    T(b.x0, BZ1, b.x1, BZ1, [[b.cx - b.x0 - GANG.w / 2 - 0.2, b.cx - b.x0 + GANG.w / 2 + 0.2]]);
    if (i === 0) T(b.x0, BZ0, b.x0, BZ1); if (i === 2) T(b.x1, BZ1, b.x1, BZ0);
  });
  yield;

  // ================================================================ kerbs and rails (where a fall reads as one; the water is a soft edge)
  const rc = [];
  const rail = (ax, az, bx, bz, y, o) => railRun(B, rc, ax, az, bx, bz, y, o);
  const kerb = (x0, z0, x1, z1, y) => { const w = Math.max(0.3, x1 - x0), d = Math.max(0.3, z1 - z0); B.add(sb(w, 0.36, d, 1.2), BM.cap(), (x0 + x1) / 2, y + 0.18, (z0 + z1) / 2); box(x0, z0, x1, z1, y + 0.36, { block: true }); };
  const parapet = (x0, z0, x1, z1, y) => { const w = Math.max(0.4, x1 - x0), d = Math.max(0.4, z1 - z0); B.add(sb(w, 0.7, d, 1.6), AM.ashlar(), (x0 + x1) / 2, y + 0.35, (z0 + z1) / 2); B.add(sb(w + 0.12, 0.12, d + 0.12, 1.2), BM.cap(), (x0 + x1) / 2, y + 0.76, (z0 + z1) / 2); box(x0, z0, x1, z1, y + 0.82, { block: true }); };
  // along the basins (open at each gangway)
  BAS.forEach((b) => {
    for (const [z0, z1] of [[BZ0 - 0.3, BZ0], [BZ1, BZ1 + 0.3]]) {
      const a = Math.max(b.x0, b === BAS[0] ? b.x0 : b.x0), e = b.x1;
      kerb(a, z0, b.cx - GANG.w / 2 - 0.05, z1, b.path); kerb(b.cx + GANG.w / 2 + 0.05, z0, e, z1, b.path);
    }
  });
  kerb(-35.3, BZ0, -35, BZ1, UP); kerb(47.5, BZ0, 47.8, BZ1, LOW);
  // the stairs' sides over the weirs and the water: a timber rail down each stair's basin side
  const slopeRailX = (xa, ya, xb, yb, z) => {
    const n = Math.max(2, Math.round(Math.abs(xb - xa) / 1.2));
    for (let i = 0; i <= n; i++) { const t = i / n; B.add(cached('blw3srp', () => bbox(0.09, 1.0, 0.09, 0.015, 1)), BM.post(), xa + (xb - xa) * t, lerp(ya, yb, t) + 0.5, z); }
    B.add(tube([[xa, ya + 1.0, z], [xb, yb + 1.0, z]], 0.04, 5, 1), BM.timber()); B.add(tube([[xa, ya + 0.55, z], [xb, yb + 0.55, z]], 0.03, 5, 1), BM.timber());
    rc.push({ type: 'box', x: (xa + xb) / 2, z, hw: Math.abs(xb - xa) / 2, hd: 0.08, top: Math.max(ya, yb) + 1.2, seeThrough: true, noStand: true });
  };
  for (const s of STAIRS) { slopeRailX(s.x0, s.hi, s.x1, s.lo, NP.z1 - 0.06); slopeRailX(s.x0, s.hi, s.x1, s.lo, SP.z0 + 0.06); }
  // the plaza's edges over the sea: parapets, the west gate's opening, the overflow channel's mouth
  parapet(PLAZA.x0 - 0.4, PLAZA.z0, PLAZA.x0, G3C.z0, UP); parapet(PLAZA.x0 - 0.4, G3C.z1, PLAZA.x0, GATE_W.z - 1.7, UP); parapet(PLAZA.x0 - 0.4, GATE_W.z + 1.7, PLAZA.x0, PLAZA.z1, UP);
  parapet(PLAZA.x0, PLAZA.z0 - 0.4, -35, PLAZA.z0, UP);
  parapet(PLAZA.x0, SP.z1, STAIRS[0].x0, SP.z1 + 0.4, UP);
  rail(STAIRS[0].x0, SP.z1 + 0.15, STAIRS[0].x1, SP.z1 + 0.15, MID, { kind: 'timber' }); rail(STAIRS[1].x0, SP.z1 + 0.15, STAIRS[1].x1, SP.z1 + 0.15, LOW, { kind: 'timber' });
  parapet(RIG.x0 - 0.4, RIG.z0, RIG.x0, RIG.z1 + 0.4, MID); parapet(RIG.x0, RIG.z1, RIG.x1, RIG.z1 + 0.4, MID); parapet(RIG.x1, SP.z1, RIG.x1 + 0.4, RIG.z1 + 0.4, MID);
  parapet(STAIRS[1].x1, SP.z1, EAST.x0, SP.z1 + 0.4, LOW);
  parapet(EAST.x0, EAST.z1, EAST.x1, EAST.z1 + 0.4, LOW); parapet(EAST.x1, EAST.z0, EAST.x1 + 0.4, CAUSE.z0, LOW); parapet(EAST.x1, CAUSE.z1, EAST.x1 + 0.4, EAST.z1 + 0.4, LOW);
  parapet(EAST.x0, EAST.z0 - 0.4, EAST.x1 + 0.4, EAST.z0, LOW); parapet(EAST.x0 - 0.4, SP.z1, EAST.x0, EAST.z1, LOW);
  // the wheel's pit: an iron railing round it on the terrace
  rail(PIT.x0, PIT.z0 - 0.1, PIT.x1, PIT.z0 - 0.1, LOW, { kind: 'iron' }); rail(PIT.x0 - 0.1, PIT.z0, PIT.x0 - 0.1, PIT.z1, LOW, { kind: 'iron' }); rail(PIT.x0, PIT.z1 + 0.1, PIT.x1, PIT.z1 + 0.1, LOW, { kind: 'iron' });
  // the channels' edges in the plaza (low kerbs: the water is open, a step down)
  kerb(HOUSE.x + HOUSE.w / 2, G1C.z1, G1C.xt, G1C.z1 + 0.25, UP); kerb(G1C.xt - 0.25, G1C.z1 + 0.25, G1C.xt, NP.z0, UP); kerb(G1C.xt1, G1C.z1, G1C.xt1 + 0.25, NP.z0, UP);
  kerb(PLAZA.x0, G3C.z1, HOUSE.x - HOUSE.w / 2, G3C.z1 + 0.25, UP);
  // the west gate from the Arch District: two glazed posts and a lintel, the stair beyond going up (scenery)
  {
    const g = P(GATE_W.x, UP, GATE_W.z, Math.PI / 2);
    for (const s of [-1, 1]) { g.add(cached('blw2gpost', () => bbox(0.6, 3.4, 0.6, 0.05, 1)), AM.ashlar(), s * 1.9, 1.7, 0); g.add(cached('blw2gpcap', () => lathe([[0.001, 0], [0.38, 0], [0.3, 0.22], [0.001, 0.5]], 10)), BM.celadon(), s * 1.9, 3.4, 0); }
    g.add(cached('blw3glint', () => bbox(4.6, 0.5, 0.7, 0.05, 1)), AM.ashlar(), 0, 3.6, 0);
    g.box(-1.9, 0, 0.3, 0.3, 3.4, { block: true }); g.box(1.9, 0, 0.3, 0.3, 3.4, { block: true }); cols(g.cols);
    for (let i = 0; i < 5; i++) B.add(sb(1.0, 0.3, 3.4, 1.2), BM.cap(), GATE_W.x - 0.9 - i * 0.9, UP + 0.15 + i * 0.3, GATE_W.z);
    box(GATE_W.x - 1.4, GATE_W.z - 1.7, GATE_W.x - 0.4, GATE_W.z + 1.7, UP + 1.2, { block: true });   // (the way on is the scene change, not the stair)
  }
  cols(rc); rc.length = 0;
  yield;

  // ================================================================ the aqueduct, the splitter house, the leat, the overflow's spillway
  {
    // the aqueduct: a row of tall arches out of the sea, its channel on top (glazed coping), into the house's north wall
    const L = AQ.z1 - AQ.z0, top = AQ.bed - 0.12, n = 9, span = L / n;
    const s = new THREE.Shape(); s.moveTo(-L / 2, -3); s.lineTo(L / 2, -3); s.lineTo(L / 2, top); s.lineTo(-L / 2, top); s.closePath();
    for (let i = 0; i < n; i++) { const c = -L / 2 + span * (i + 0.5), hw = span / 2 - 1.0, sp = top - 2.6 - hw; const h = new THREE.Path(); h.moveTo(c - hw, -2.8); h.lineTo(c + hw, -2.8); h.lineTo(c + hw, sp); h.absarc(c, sp, hw, 0, Math.PI, false); h.lineTo(c - hw, -2.8); s.holes.push(h); }
    const g = new THREE.ExtrudeGeometry(s, { depth: AQ.w, bevelEnabled: false, curveSegments: 8 }); g.translate(0, 0, -AQ.w / 2); g.rotateY(Math.PI / 2);
    boxUV(g, 2.2);
    const m = new THREE.Mesh(g, AM.ashlar()); m.position.set(AQ.x, 0, (AQ.z0 + AQ.z1) / 2); m.castShadow = true; m.receiveShadow = true; m.name = 'bl_aqueduct'; group.add(m);
    for (const sd of [-1, 1]) B.add(sb(0.3, 0.6, L, 1.2), BM.celadonDeep(), AQ.x + sd * (AQ.w / 2 - 0.15), AQ.bed + 0.1, (AQ.z0 + AQ.z1) / 2);
    B.add(sb(AQ.w - 0.6, 0.12, L, 1.4), BM.wet(), AQ.x, AQ.bed - 0.06, (AQ.z0 + AQ.z1) / 2);
    box(AQ.x - AQ.w / 2, PLAZA.z0 - 0.4, AQ.x + AQ.w / 2, HOUSE.z - HOUSE.d / 2, AQ.bed + 0.6, { block: true });
    // where it comes from: a rocky islet to the north, the channel's head cut into it
    B.add(cached('blw3islet', () => { const g = lathe([[0.001, 13], [5, 12.2], [9, 9.5], [12, 5], [15, 1], [17, -2], [0.001, -2]], 14, 3); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); const k = 1 + (fbm(x * 0.2 + 3, z * 0.2 - 1, 2) - 0.5) * 0.35; p.setXYZ(i, x * k, y * (0.9 + (fbm(z * 0.2, x * 0.2, 2) - 0.5) * 0.3), z * k); } g.computeVertexNormals(); return g; }), BM.rubble(), AQ.x + 2, 0, AQ.z0 - 9);
  }
  // the splitter house: stone below, glazed tiles above, a glazed hip roof; the aqueduct's mouth in its north wall
  {
    const p = P(HOUSE.x, UP, HOUSE.z, 0);
    tallHouse(p, { w: HOUSE.w, d: HOUSE.d, trim: BM.post(), leaf: BM.cobalt(), plinth: { mat: AM.ashlar(), h: 0.3 },
      storeys: [
        { h: 3.0, mat: AM.ashlar(), holes: { s: [{ x: 0, y: 0, w: 1.3, h: 2.3, door: true, arch: true }], e: [{ x: 0.5, y: 1.2, w: 0.8, h: 0.9 }] } },
        { h: 2.8, mat: BM.glazeTiles(), holes: { s: [{ x: -1.8, y: 0.8, w: 0.8, h: 1.1 }, { x: 1.8, y: 0.8, w: 0.8, h: 1.1 }], w: [{ x: 0, y: 0.9, w: 0.7, h: 0.9 }] } },
      ],
      roof: { kind: 'hip', mat: AM.glazeRoof(), rise: 2.4, over: 0.5 } }, {});
    cols(p.cols);
    // the channels' mouths: bronze-framed arches at the foot of its east and west walls, and the leat's in the north-east
    for (const [x, z, ry] of [[HOUSE.x + HOUSE.w / 2 + 0.05, (G1C.z0 + G1C.z1) / 2, Math.PI / 2], [HOUSE.x - HOUSE.w / 2 - 0.05, (G3C.z0 + G3C.z1) / 2, -Math.PI / 2]]) {
      B.add(cached('blw3mouth', () => compose([[new THREE.TorusGeometry(0.75, 0.1, 6, 14, Math.PI), 0, 0.15, 0], [bbox(0.16, 0.5, 0.16, 0.02), -0.75, -0.1, 0], [bbox(0.16, 0.5, 0.16, 0.02), 0.75, -0.1, 0]])), BM.bronze(), x, UP - 0.25, z, 0, ry);
      B.add(cached('blw3mouthd', () => compose([[cyl(0.65, 0.65, 0.05, 14, 0, false, ).rotateX(Math.PI / 2), 0, 0.15, -0.03]])), BM.dark(), x, UP - 0.25, z, 0, ry);
    }
  }
  // the leat: its own wall the length of the north side, the channel on top, piers where it crosses the low terrace
  {
    const L = LEAT.x1 - LEAT.x0, cx = (LEAT.x0 + LEAT.x1) / 2, cz = (LEAT.z0 + LEAT.z1) / 2, d = LEAT.z1 - LEAT.z0;
    const n = 16, seg = L / n;
    for (let i = 0; i < n; i++) {
      const x0 = LEAT.x0 + seg * i, xm = x0 + seg / 2, bed = lerp(LEAT.y0, LEAT.y1, (xm - LEAT.x0) / L), ground = xm < -24 ? UP : xm < STAIRS[0].x1 ? UP + 0.6 : xm < STAIRS[1].x1 ? MID + 0.6 : xm < EAST.x0 ? LOW + 0.6 : LOW;
      B.add(sb(seg + 0.02, bed - 0.1 - ground + 2.5, d, 1.8), AM.ashlar(), xm, (bed - 0.1 + ground - 2.5) / 2, cz);
      for (const sd of [-1, 1]) B.add(sb(seg + 0.04, 0.6, 0.26, 1.2), BM.cap(), xm, bed + 0.2, cz + sd * (d / 2 - 0.13));
      B.add(sb(seg, 0.1, d - 0.5, 1.4), BM.wet(), xm, bed - 0.05, cz);
    }
    box(LEAT.x0, LEAT.z0, LEAT.x1, LEAT.z1, LEAT.y0 + 1.2, { block: true });
    // the bank north of the paths (from the yard east to the kiln): reeds and grass on rubble, under the leat
    // the bank between the paths and the leat: rubble and earth sloping up from the path's back edge to the leat's wall,
    // grassed, with clumps of reeds and low shrubs (the leat's seepage keeps it green while the basins are dry)
    const bankG = tm('grass', { color: '#a8bc80', rough: 1 }), bankD = (NP.z0 - LEAT.z1);
    const bank = (x0, x1, path) => {
      const top = lerp(LEAT.y0, LEAT.y1, ((x0 + x1) / 2 - LEAT.x0) / (LEAT.x1 - LEAT.x0)) - 0.4, s = new THREE.Shape();
      s.moveTo(0, -2.4); s.lineTo(bankD, -2.4); s.lineTo(bankD, path + 0.25); s.lineTo(bankD * 0.55, path + 0.25 + (top - path) * 0.35); s.lineTo(0.1, top); s.lineTo(0, top); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: x1 - x0, bevelEnabled: false }); g.rotateY(-Math.PI / 2); boxUV(g, 2.4);
      B.add(g, bankG, x1, 0, LEAT.z1);
      box(x0, LEAT.z1, x1, NP.z0, top + 0.6, { block: true });
      return top;
    };
    const tops = [bank(-24, STAIRS[0].x1, UP), bank(STAIRS[0].x1, STAIRS[1].x1, MID), bank(STAIRS[1].x1, EAST.x0, LOW)];
    // where the paths step down, the bank steps with them behind a dressed retaining wall (and at the east terrace)
    for (const [x, hi] of [[STAIRS[0].x1, tops[0]], [STAIRS[1].x1, tops[1]], [EAST.x0, tops[2]]]) {
      B.add(sb(0.6, hi + 2.4 + 0.3, bankD, 1.8), AM.ashlar(), x, (hi + 0.3 - 2.4) / 2, (LEAT.z1 + NP.z0) / 2);
      B.add(sb(0.76, 0.14, bankD + 0.1, 1.2), BM.cap(), x, hi + 0.37, (LEAT.z1 + NP.z0) / 2);
    }
    const clumps = [], r = rng(41);
    for (let i = 0; i < 46; i++) {
      const x = -23 + r() * 70, k = x < STAIRS[0].x1 ? 0 : x < STAIRS[1].x1 ? 1 : 2, path = [UP, MID, LOW][k], top = tops[k], f = 0.25 + r() * 0.6;
      const z = NP.z0 - f * bankD, y = path + 0.25 + (top - path - 0.25) * (f < 0.45 ? f / 0.45 * 0.35 : 0.35 + (f - 0.45) / 0.55 * 0.65) - 0.05;
      if (r() < 0.55) for (let j = 0; j < 7; j++) { const h = 0.7 + r() * 0.8; clumps.push([tint(cyl(0.008, 0.035, h, 3), r() < 0.5 ? '#6e8e4a' : '#8aa25a'), x + (r() - 0.5) * 0.6, y + h / 2, z + (r() - 0.5) * 0.4, (r() - 0.5) * 0.35, 0, (r() - 0.5) * 0.35]); }
      else for (let j = 0; j < 3; j++) { const s2 = 0.3 + r() * 0.25; clumps.push([tint(new THREE.SphereGeometry(s2, 7, 5).scale(1.1, 0.75, 1), j ? '#7a9a52' : '#64884a'), x + (j - 1) * 0.35, y + s2 * 0.5, z + (r() - 0.5) * 0.3]); }
    }
    B.add(compose(clumps, true), BM.vc());
  }
  // the overflow's stepped spillway down to the sea (west of the plaza), and the stone pier with G3's gate and latch
  {
    const z = (G3C.z0 + G3C.z1) / 2;
    for (let i = 0; i < 6; i++) { const top = G3C.bed - i * 0.95; B.add(sb(1.0, top + 2.4, 1.6, 1.4), BM.wet(), PLAZA.x0 - 0.5 - i * 1.0, (top - 2.4) / 2, z); for (const sd of [-1, 1]) B.add(sb(1.0, top + 2.4 + 0.6, 0.3, 1.4), AM.ashlar(), PLAZA.x0 - 0.5 - i * 1.0, (top + 0.6 - 2.4) / 2, z + sd * 0.95); }
    B.add(sb(1.8, 4.4, 1.8, 1.6), AM.ashlar(), GATE3.x, 0.9, GATE3.z); col({ type: 'box', x: GATE3.x, z: GATE3.z, hw: 0.9, hd: 0.9, top: 3.1, block: true });
    B.add(cached('blw3g3post', () => compose([[bbox(0.22, 2.6, 0.22, 0.02), 0, 1.3, 0], [bbox(0.5, 0.2, 0.3, 0.02), 0, 2.6, 0]])), BM.post(), GATE3.x, 3.1, GATE3.z);
  }
  yield;

  // ================================================================ the gauges (two big glazed columns at the splitter) and the tunnel's hatch
  const GAUGE = [{ x: HOUSE.x - 1.6, z: HOUSE.z + HOUSE.d / 2 + 1.5, accent: '#9cc8b4', cap: BM.celadonDeep() }, { x: HOUSE.x + 0.9, z: HOUSE.z + HOUSE.d / 2 + 1.5, accent: '#7aa0c8', cap: BM.cobalt() }];
  const markers = GAUGE.map((gq, i) => {
    const p = P(gq.x, UP, gq.z, 0);
    p.add(cached('blw3gbase', () => compose([[bbox(1.3, 0.6, 0.9, 0.05, 1.2), 0, 0.3, 0], [bbox(1.45, 0.12, 1.05, 0.03, 1), 0, 0.64, 0]])), AM.ashlar());
    for (const s of [-1, 1]) p.add(cached('blw3gpost', () => bbox(0.14, 3.3, 0.14, 0.02, 1)), BM.bronze(), s * 0.42, 0.7 + 1.65, 0);
    p.add(cached('blw3gtube', () => cyl(0.16, 0.16, 3.0, 12, 0, true)), pm('#d8f0f0', 0.1, { transparent: true, opacity: 0.35, depthWrite: false }), -0.12, 0.7 + 1.55, 0.12);
    p.add(cached('blw3gboard', () => new THREE.PlaneGeometry(0.42, 3.0)), pm('#ffffff', 0.7, { map: gaugeScale(i ? 'lower' : 'upper', gq.accent) }), 0.2, 0.7 + 1.55, 0.11);
    p.add(cached('blw3gcap', () => compose([[bbox(1.0, 0.16, 0.5, 0.03), 0, 0, 0], [lathe([[0.001, 0], [0.28, 0], [0.16, 0.34], [0.001, 0.42]], 10), 0, 0.08, 0]])), gq.cap, 0, 4.06, 0);
    p.box(0, 0, 0.7, 0.48, 4.3, { block: true, seeThrough: false }); cols(p.cols);
    const m = keep(new THREE.Mesh(cached('blw3gmark', () => compose([[new THREE.SphereGeometry(0.13, 10, 8), -0.12, 0, 0], [bbox(0.5, 0.05, 0.05, 0.01), 0.12, 0, 0.05]])), BM.bronze()));
    m.position.set(gq.x, UP + 0.85, gq.z + 0.12); m.castShadow = true; group.add(m); return m;
  });
  const HATCH = { x: HOUSE.x + HOUSE.w / 2 + 2.2, z: HOUSE.z + HOUSE.d / 2 + 1.0 };
  {
    const p = P(HATCH.x, UP, HATCH.z, 0);
    p.add(cached('blw3hkerb', () => compose([[bbox(1.7, 0.18, 0.25, 0.03), 0, 0.09, -0.72], [bbox(1.7, 0.18, 0.25, 0.03), 0, 0.09, 0.72], [bbox(0.25, 0.18, 1.2, 0.03), -0.72, 0.09, 0], [bbox(0.25, 0.18, 1.2, 0.03), 0.72, 0.09, 0]])), BM.cap());
    p.add(cached('blw3hhole', () => bbox(1.2, 0.02, 1.2, 0.005)), BM.dark(), 0, 0.02, 0);
    p.add(cached('blw3hleaf', () => compose([[bbox(1.2, 1.2, 0.08, 0.02, 0.6), 0, 0.6, 0], [new THREE.TorusGeometry(0.12, 0.025, 4, 10), 0, 0.7, 0.06]])), BM.bronze(), 0, 0.12, -0.78, -0.18);
    for (const s of [-1, 1]) p.add(cached('blw3hrail', () => compose([[cyl(0.03, 0.03, 1.1, 6), 0, 0.55, 0], [new THREE.TorusGeometry(0.12, 0.025, 4, 8, Math.PI), 0, 1.1, 0]])), BM.iron(), s * 0.45, 0, 0.4);
    p.box(0, -0.72, 0.85, 0.12, 0.3, { block: true }); p.box(-0.72, 0, 0.12, 0.85, 0.3, { block: true }); p.box(0.72, 0, 0.12, 0.85, 0.3, { block: true }); cols(p.cols);
  }
  yield;

  // ================================================================ the gates: G1 at the gardens' channel's head, G2 on the leat, G3 on the spillway's pier
  const gateLeaves = {};
  const gateFrame = (id, x, y, z, ry, w) => {
    const p = P(x, y, z, ry);
    for (const s of [-1, 1]) p.add(cached('blw3gfpost' + w, () => bbox(0.24, 2.2, 0.3, 0.03, 1)), AM.ashlar(), s * (w / 2 + 0.12), 1.1, 0);
    p.add(cached('blw3gflint' + w, () => bbox(w + 0.6, 0.26, 0.36, 0.03, 1)), AM.ashlar(), 0, 2.2, 0);
    p.add(cached('blw3gfscrew', () => cyl(0.04, 0.04, 0.7, 6)), BM.iron(), 0, 2.6, 0);
    p.add(cached('blw3gfwheel', () => new THREE.TorusGeometry(0.22, 0.03, 5, 14).rotateX(Math.PI / 2)), BM.bronze(), 0, 2.9, 0);
    const leaf = keep(new THREE.Mesh(cached('blw3gleaf' + w, () => compose([[bbox(w, 1.0, 0.1, 0.02, 0.6), 0, 0.5, 0], [bbox(w + 0.04, 0.08, 0.14, 0.01), 0, 0.15, 0], [bbox(w + 0.04, 0.08, 0.14, 0.01), 0, 0.85, 0]])), BM.deckOld()));
    leaf.position.set(x, y - 0.55, z); leaf.rotation.y = ry; leaf.castShadow = true; group.add(leaf);
    gateLeaves[id] = { m: leaf, y0: y - 0.55 };
  };
  gateFrame(1, HOUSE.x + HOUSE.w / 2 + 0.9, UP, (G1C.z0 + G1C.z1) / 2, Math.PI / 2, 1.2);
  gateFrame(2, GATE2.x, LEAT.y0 + 0.2, (LEAT.z0 + LEAT.z1) / 2, Math.PI / 2, 1.1);
  gateFrame(3, PLAZA.x0 - 0.6, G3C.bed, (G3C.z0 + G3C.z1) / 2, Math.PI / 2, 1.6);
  // G2's latch: on a post on the leat's far (north) side, high over its wall; G3's on the pier's post (both ball targets)
  const latch = (x, y, z, ry) => {
    const g = keep(new THREE.Group()); g.position.set(x, y, z); g.rotation.y = ry; group.add(g);
    const arm = new THREE.Mesh(cached('blw3latch', () => compose([[bbox(0.7, 0.1, 0.1, 0.02), -0.3, 0, 0, 0, 0, -0.3], [new THREE.SphereGeometry(0.15, 10, 8), 0.1, 0.04, 0]])), pm('#c8443a', 0.4, { emissive: '#5a1408', emissiveIntensity: 0.5 }));
    arm.castShadow = true; g.add(arm); return g;
  };
  B.add(cached('blw3l2post', () => compose([[bbox(0.22, 3.0, 0.22, 0.02), 0, 1.5, 0], [bbox(0.4, 0.2, 0.4, 0.02), 0, 0, 0]])), BM.post(), GATE2.x + 0.9, LEAT.y0 + 0.5, LEAT.z0 - 0.15);
  const latch2 = latch(GATE2.x + 0.9, LEAT.y0 + 3.1, LEAT.z0 - 0.15, 0);
  const latch3 = latch(GATE3.x, 5.6, GATE3.z, Math.PI / 2);
  B.add(tube([[GATE3.x, 5.5, GATE3.z + 0.1], [PLAZA.x0 - 1.4, 6.6, (G3C.z0 + G3C.z1) / 2 - 1.0], [PLAZA.x0 - 0.6, 8.0, (G3C.z0 + G3C.z1) / 2 - 0.3]], 0.03, 4, 1), BM.iron());   // (its rod to the gate's frame)
  yield;

  // ================================================================ the basins' water, the floating rafts and walkways
  const basinW = BAS.map((b, i) => { const m = waterMat(1.0); const w = waterPlane(b.x0, BZ0, b.x1, BZ1, b.full, m, 'bl_basinWater' + i); return { mesh: w, mat: m }; });
  const floatGs = [], plantGs = [[], [], []], walkCols = [], raftCols = [], gangways = [];
  // a gangway: a deck and rails on a hinge at the path's edge (zFix), tilting down to the floating walkway's end
  const gangway = (bi, zFix, dir) => {
    const b = BAS[bi], L = GANG.run, w = GANG.w;
    const g = keep(new THREE.Group()); g.name = `bl_gangway${bi}${dir > 0 ? 'N' : 'S'}`; g.position.set(b.cx, b.path, zFix); group.add(g);
    const gB = new Batch(g);
    gB.add(bbox(w, 0.12, L, 0.02, 2.2), BM.deckOld(), 0, -0.06, dir * L / 2);
    for (const s of [-1, 1]) {
      gB.add(bbox(0.12, 0.3, L, 0.02, 1), BM.post(), s * (w / 2 - 0.06), -0.2, dir * L / 2);
      for (let i = 0; i <= 3; i++) gB.add(cached('blw2gwp', () => bbox(0.08, 1.0, 0.08, 0.01, 1)), BM.post(), s * (w / 2 - 0.06), 0.5, dir * (0.2 + i * (L - 0.4) / 3));
      gB.add(bbox(0.07, 0.08, L, 0.02, 1), BM.timber(), s * (w / 2 - 0.06), 1.0, dir * L / 2);
    }
    for (let i = 1; i < 6; i++) gB.add(cached('blw3cleat' + w, () => bbox(w - 0.3, 0.04, 0.06, 0.01)), BM.post(), 0, 0.02, dir * i * L / 6);
    gB.add(cached('blw3roller', () => cyl(0.1, 0.1, 1.9, 10).rotateZ(Math.PI / 2)), BM.bronze(), 0, -0.12, dir * (L - 0.1));
    gB.add(cached('blw3hinge', () => cyl(0.09, 0.09, 2.1, 10).rotateZ(Math.PI / 2)), BM.bronze(), 0, -0.05, 0);
    gB.build();
    const N = GANG.n, segs = [];
    for (let i = 0; i < N; i++) segs.push(physics.add({ type: 'box', x: b.cx + ox, z: zFix + dir * (L * (i + 0.5) / N) + oz, hw: w / 2, hd: L / N / 2 + 0.07, top: 0, seeThrough: true, stair: true }));
    for (const s of [-1, 1]) col({ type: 'box', x: b.cx + s * (w / 2 + 0.02), z: zFix + dir * L / 2, hw: 0.08, hd: L / 2, top: b.path + 1.4, seeThrough: true, noStand: true });
    gangways.push({ g, segs, L, N, bi, dir });
  };
  const beanGeo = (st) => cached('blw3bean' + st, () => {
    const parts = [], r = rng(17 + st), leaf = ['#8a7a4a', '#9aae52', '#5e9a42'][st], pole = '#a68462';
    for (let k = 0; k < 4; k++) {
      const x = -0.9 + k * 0.6, h = [0.9, 1.1, 1.5][st];
      parts.push([tint(cyl(0.025, 0.03, h, 4), pole), x, h / 2, 0]);
      const n = [3, 5, 9][st];
      for (let j = 0; j < n; j++) { const y = 0.25 + (j / n) * (h - 0.2); const lg = st === 0 ? tint(new THREE.ConeGeometry(0.07, 0.16, 4).rotateZ(Math.PI * 0.85), leaf) : tint(new THREE.SphereGeometry(0.1 + r() * 0.04, 5, 4).scale(1, 0.55, 1), leaf); parts.push([lg, x + (r() - 0.5) * 0.18, y, (r() - 0.5) * 0.18]); }
      if (st === 2) parts.push([tint(new THREE.SphereGeometry(0.05, 5, 4).scale(0.6, 2.2, 0.6), '#7ab04a'), x + 0.1, h * 0.6, 0.08]);
    }
    return compose(parts, true);
  });
  const reedGeo = (st) => cached('blw3reed' + st, () => {
    const parts = [], r = rng(23 + st), c = ['#a8946a', '#8eae5e', '#5e9a4a'][st];
    for (let k = 0; k < [10, 14, 20][st]; k++) { const h = [0.4, 0.7, 1.2][st] * (0.6 + r() * 0.6), x = (r() - 0.5) * 2.4, z = (r() - 0.5) * 1.8; parts.push([tint(cyl(0.006, 0.035, h, 3), c), x, h / 2, z, (r() - 0.5) * (st === 0 ? 0.9 : 0.25), 0, (r() - 0.5) * (st === 0 ? 0.9 : 0.25)]); }
    return compose(parts, true);
  });
  const flowerGeo = (st) => cached('blw3flower' + st, () => {
    const parts = [], r = rng(31 + st);
    for (let k = 0; k < 14; k++) {
      const x = (r() - 0.5) * 2.4, z = (r() - 0.5) * 1.8, h = [0.18, 0.3, 0.42][st] * (0.7 + r() * 0.6);
      parts.push([tint(cyl(0.008, 0.012, h, 3), st === 0 ? '#9a8a5a' : '#6a9a4a'), x, h / 2, z]);
      if (st === 2 || (st === 1 && k % 3 === 0)) parts.push([tint(new THREE.SphereGeometry(0.07, 6, 4), ['#e8a0b8', '#f2d27a', '#f0e8d6', '#c8786a'][k % 4]), x, h + 0.03, z]);
      else if (st === 0) parts.push([tint(new THREE.SphereGeometry(0.05, 5, 3).scale(1, 0.5, 1), '#8a6a4a'), x + 0.04, h - 0.05, z]);
      else parts.push([tint(new THREE.SphereGeometry(0.07, 5, 4).scale(1, 0.6, 1), '#88b058'), x, h, z]);
    }
    return compose(parts, true);
  });
  BAS.forEach((b, bi) => {
    const fg = keep(new THREE.Group()); fg.name = 'bl_floating' + bi; group.add(fg);
    const fB = new Batch(fg), fP = (x, z, ry = 0) => new Place(fB, x, 0, z, ry);
    // the rafts: a timber deck on glazed floats, a low rim, planted
    const pB = [0, 1, 2].map((st) => { const g = keep(new THREE.Group()); g.name = `bl_plants${bi}_${st}`; fg.add(g); plantGs[st].push(g); return new Batch(g); });
    RAFT_DX.forEach((dx, ci) => RAFT_Z.forEach((z, ri) => {
      const x = b.cx + dx, kind = (ci + ri + bi) % 3;
      fB.add(bbox(RAFT.w, 0.16, RAFT.d, 0.03, 2.2), BM.deckOld(), x, 0.08, z);
      fB.add(cached('blw3raftrim', () => compose([[bbox(RAFT.w, 0.12, 0.08, 0.01, 1), 0, 0, -RAFT.d / 2 + 0.04], [bbox(RAFT.w, 0.12, 0.08, 0.01, 1), 0, 0, RAFT.d / 2 - 0.04], [bbox(0.08, 0.12, RAFT.d, 0.01, 1), -RAFT.w / 2 + 0.04, 0, 0], [bbox(0.08, 0.12, RAFT.d, 0.01, 1), RAFT.w / 2 - 0.04, 0, 0]])), BM.post(), x, 0.22, z);
      fB.add(cached('blw3raftsoil', () => bbox(RAFT.w - 0.2, 0.06, RAFT.d - 0.2, 0.01, 1.2)), AM.mud(), x, 0.2, z);
      for (const sx of [-1, 1]) fB.add(cached('blfloatpot', () => lathe([[0, -0.32], [0.3, -0.26], [0.4, 0], [0.34, 0.24], [0.16, 0.32], [0, 0.32]], 10)), (ci + ri) % 3 === 1 ? BM.terracotta() : BM.celadon(), x + sx * (RAFT.w / 2 - 0.5), -0.24, z, 0, 0, 0, 0.8);
      for (let st = 0; st < 3; st++) pB[st].add(kind === 0 ? beanGeo(st) : kind === 1 ? reedGeo(st) : flowerGeo(st), BM.vc(), x, 0.22, z, 0, ((ci * 7 + ri * 3) % 4) * 0.4);
      raftCols.push({ bi, top: 0.6, c: physics.add({ type: 'box', x: x + ox, z: z + oz, hw: RAFT.w / 2, hd: RAFT.d / 2, top: 0, block: true, noStand: true }) });
    }));
    // the walkways: the long one from gangway to gangway and the cross one, planks on pontoons with posts and a rope
    const walkPiece = (x0, z0, x1, z1) => {
      const p = fP((x0 + x1) / 2, (z0 + z1) / 2); deckSlab(p, x1 - x0, z1 - z0, { top: 0.32, under: 'floats', water: 0, mat: BM.deck(), seed: bi * 5 + 1 });
      walkCols.push({ bi, c: physics.add({ type: 'box', x: (x0 + x1) / 2 + ox, z: (z0 + z1) / 2 + oz, hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, top: 0, seeThrough: true }) });
    };
    walkPiece(b.cx - WALK.w / 2, WALK.z0, b.cx + WALK.w / 2, WALK.cz - WALK.cw / 2);
    walkPiece(b.cx - WALK.w / 2, WALK.cz - WALK.cw / 2, b.cx + WALK.w / 2, WALK.cz + WALK.cw / 2);
    walkPiece(b.cx - WALK.w / 2, WALK.cz + WALK.cw / 2, b.cx + WALK.w / 2, WALK.z1);
    walkPiece(b.cx - WALK.cx, WALK.cz - WALK.cw / 2, b.cx - WALK.w / 2, WALK.cz + WALK.cw / 2);
    walkPiece(b.cx + WALK.w / 2, WALK.cz - WALK.cw / 2, b.cx + WALK.cx, WALK.cz + WALK.cw / 2);
    // short posts with a rope along the long walkway's open stretches (it rides with them)
    for (const s of [-1, 1]) for (const [z0, z1] of [[WALK.z0 + 0.4, WALK.cz - WALK.cw / 2 - 0.1], [WALK.cz + WALK.cw / 2 + 0.1, WALK.z1 - 0.4]]) {
      const x = b.cx + s * (WALK.w / 2 - 0.06), n = Math.max(2, Math.round((z1 - z0) / 1.6));
      for (let i = 0; i <= n; i++) fB.add(cached('blw3wpost', () => bbox(0.08, 0.75, 0.08, 0.01, 1)), BM.post(), x, 0.32 + 0.37, z0 + (z1 - z0) * i / n);
      const pts = []; for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push([x, 0.32 + 0.7 - 0.12 * Math.sin(Math.PI * ((t * n) % 1)), z0 + (z1 - z0) * t]); }
      fB.add(tube(pts, 0.022, 4, 1), BM.rope());
    }
    // lily pads on the open water at the basin's sides (they float too)
    const pads = [], r = rng(61 + bi);
    for (let k = 0; k < 18; k++) { const sx = r() < 0.5 ? -1 : 1, x = b.cx + sx * (8.1 + r() * ((b.x1 - b.x0) / 2 - 8.6)), z = BZ0 + 1 + r() * (BZ1 - BZ0 - 2); pads.push([tint(new THREE.CircleGeometry(0.28 + r() * 0.2, 7, 0.3, Math.PI * 1.8).rotateX(-Math.PI / 2), r() < 0.5 ? '#5e9a52' : '#6eaa5a'), x, 0.02, z]); }
    fB.add(compose(pads, true), BM.vc());
    fB.build(); pB.forEach((q) => q.build());
    floatGs.push(fg);
    // the gangways: hinged at the path's edge (north and south), their free ends on rollers on the walkway's ends
    for (const [zFix, dir] of [[BZ0, 1], [BZ1, -1]]) gangway(bi, zFix, dir);
    // mooring posts at the walkways' ends and corners (fixed: the walkway's rings slide on them)
    for (const [x, z] of [[b.cx - 1.25, WALK.z0 + 0.3], [b.cx + 1.25, WALK.z0 + 0.3], [b.cx - 1.25, WALK.z1 - 0.3], [b.cx + 1.25, WALK.z1 - 0.3], [b.cx - WALK.cx - 0.25, WALK.cz], [b.cx + WALK.cx + 0.25, WALK.cz]]) {
      B.add(cached('blw3mpost' + bi, () => cyl(0.11, 0.13, b.path - b.bed + 1.2, 7, 1)), BM.post(), x, (b.path + b.bed) / 2 + 0.1, z);
      B.add(cached('blw3mcap', () => lathe([[0.001, 0], [0.16, 0], [0.12, 0.12], [0.001, 0.16]], 8)), BM.celadonDeep(), x, b.path + 0.7, z);
      col({ type: 'cyl', x, z, r: 0.14, top: b.path + 0.8, noStand: true, seeThrough: true });
    }
  });
  yield;

  // ================================================================ the channels' water and the falls
  const chan = {
    upper: [waterPlane(AQ.x - AQ.w / 2 + 0.3, AQ.z0, AQ.x + AQ.w / 2 - 0.3, AQ.z1, AQ.bed + 0.3, chanMat, 'bl_chanUpper')],
    gardens: [waterPlane(G1C.x0, G1C.z0, G1C.xt1, G1C.z1, G1C.bed + 0.3, chanMat, 'bl_chanG1a'), waterPlane(G1C.xt, G1C.z1, G1C.xt1, NP.z0, G1C.bed + 0.3, chanMat, 'bl_chanG1b')],
    kiln: [slopedStrip(LEAT.x0 + 0.2, LEAT.x1 - 0.1, LEAT.z0 + 0.25, LEAT.z1 - 0.25, LEAT.y0 + 0.3, LEAT.y1 + 0.3, chanMat, 'bl_chanLeat')],
    overflow: [waterPlane(G3C.x0, G3C.z0, G3C.x1, G3C.z1, G3C.bed + 0.25, chanMat, 'bl_chanG3')],
  };
  chan.kiln.push(waterPlane(PIT.x0 + 0.2, PIT.z0 + 0.2, PIT.x1 - 0.2, PIT.z1 - 0.1, 1.55, chanMat, 'bl_pitWater'));   // (the tail race: wet while the wheel turns)
  fall('gardens', G1C.xt + 0.6, G1C.bed + 0.2, BAS[0].bed, BZ0 + 0.1, 1.0, 0, 0.6);                   // the spout into the upper basin
  fall('gardens', DYKES[0].x1 + 0.05, DYKES[0].top, BAS[1].bed, WALK.cz, 1.2, Math.PI / 2, 0.5);      // the weirs' notches
  fall('gardens', DYKES[1].x1 + 0.05, DYKES[1].top, BAS[2].bed, WALK.cz, 1.2, Math.PI / 2, 0.5);
  fall('kiln', WHEEL.x, LEAT.y1 + 0.05, 1.5, WHEEL.z - WHEEL.r + 0.5, 0.8, 0, 0.9);                   // off the trough onto the wheel's buckets
  for (let i = 0; i < 6; i++) fall('overflow', PLAZA.x0 - 0.5 - i * 1.0, G3C.bed - i * 0.95 + 0.15, G3C.bed - (i + 1) * 0.95, (G3C.z0 + G3C.z1) / 2, 1.3, Math.PI / 2, 0);
  // the spout's lip and the culvert's mouth (glazed)
  B.add(cached('blw3spout', () => compose([[bbox(1.4, 0.2, 0.6, 0.03), 0, 0, 0], [bbox(0.2, 0.4, 0.6, 0.02), -0.6, 0.2, 0], [bbox(0.2, 0.4, 0.6, 0.02), 0.6, 0.2, 0]])), BM.celadonDeep(), G1C.xt + 0.6, G1C.bed + 0.1, BZ0 + 0.3);
  yield;

  // ================================================================ Corvin's kiln: the workshop, its water wheel, the bottle chimney
  {
    const p = P((KILN.x0 + KILN.x1) / 2, LOW, (KILN.z0 + KILN.z1) / 2, 0);
    const w = KILN.x1 - KILN.x0, d = KILN.z1 - KILN.z0, door = KILN.door - (KILN.x0 + KILN.x1) / 2;
    tallHouse(p, { w, d, trim: BM.post(), leaf: BM.teal(), plinth: { mat: AM.ashlar(), h: 0.3 },
      storeys: [{ h: 3.6, mat: AM.limeWarm(), holes: { s: [{ x: door, y: 0, w: 1.5, h: 2.5, door: true, arch: true }, { x: door + 3.4, y: 1.1, w: 1.4, h: 1.2 }], w: [{ x: -1.2, y: 1.2, w: 1.0, h: 1.0 }], e: [{ x: 0, y: 1.2, w: 1.0, h: 1.0 }] } }],
      roof: { kind: 'side', mat: BM.roof(), rise: 2.6, over: 0.55, ridge: BM.terracotta() }, chimney: BM.terracotta() }, {});
    cols(p.cols);
    B.add(sb(w + 0.06, 0.95, 0.06, 1.0), BM.glazeTiles(), (KILN.x0 + KILN.x1) / 2 + 0.0, LOW + 0.3 + 0.48, KILN.z1 + 0.02);
    B.add(sb(0.06, 0.95, d, 1.0), BM.glazeTiles(), KILN.x0 - 0.02, LOW + 0.3 + 0.48, (KILN.z0 + KILN.z1) / 2);
    { const sx = KILN.door, sz = KILN.z1 + 0.32, sy = LOW + 3.15;
      B.add(cached('blw3ksign', () => compose([[bbox(1.6, 0.7, 0.08, 0.02), 0, 0, 0], [bbox(0.08, 0.5, 0.08, 0.01), -0.6, 0.55, -0.15], [bbox(0.08, 0.5, 0.08, 0.01), 0.6, 0.55, -0.15]])), BM.post(), sx, sy, sz);
      B.add(cached('blw3ksignball', () => compose([[new THREE.SphereGeometry(0.24, 12, 8), -0.3, 0, 0], [new THREE.SphereGeometry(0.17, 12, 8), 0.32, -0.04, 0]])), BM.celadon(), sx, sy, sz + 0.12); }
    // the wheel's axle box on the north wall, a bronze bearing
    B.add(cached('blw3axbox', () => compose([[bbox(1.2, 1.2, 0.5, 0.05), 0, 0, 0], [cyl(0.32, 0.32, 0.3, 12).rotateX(Math.PI / 2), 0, 0, -0.35]])), BM.bronze(), KILN.x0 - 0.25, WHEEL.y, WHEEL.z, 0, -Math.PI / 2);
    // the bottle kiln: a brick-coloured lathe on a plinth, its mouth glows when running
    B.add(cached('blw3bottle', () => lathe([[0.001, 0], [1.7, 0], [1.75, 0.5], [1.6, 2.2], [1.25, 4.2], [0.7, 6.2], [0.55, 8.4], [0.62, 8.6], [0.62, 8.8], [0.001, 8.8]], 18, 2)), tm('rubble', { color: '#d4906a', rough: 0.95 }), CHIM.x, LOW, CHIM.z);
    for (const y of [1.2, 3.0, 5.2]) B.add(cached('blw3bband' + y, () => new THREE.TorusGeometry([1.68, 1.45, 0.92][[1.2, 3.0, 5.2].indexOf(y)], 0.05, 5, 18).rotateX(Math.PI / 2)), BM.iron(), CHIM.x, LOW + y, CHIM.z);
    col({ type: 'cyl', x: CHIM.x, z: CHIM.z, r: 1.8, top: LOW + 9, block: true });
  }
  const chimGlow = keep(new THREE.Mesh(cached('blw3cglow', () => compose([[cyl(0.5, 0.5, 0.04, 12), 0, 0, 0], [bbox(0.8, 0.9, 0.05, 0.01), 0, -7.5, 1.72]])), pm('#ffb060', 0.5, { emissive: '#ff8a30', emissiveIntensity: 1.6 })));
  chimGlow.position.set(CHIM.x, LOW + 8.82, CHIM.z); group.add(chimGlow);
  B.add(cached('blw3cmouth', () => compose([[new THREE.TorusGeometry(0.5, 0.08, 5, 12, Math.PI), 0, 1.0, 0], [bbox(0.1, 1.0, 0.1, 0.01), -0.5, 0.5, 0], [bbox(0.1, 1.0, 0.1, 0.01), 0.5, 0.5, 0]])), BM.iron(), CHIM.x, LOW + 0.3, CHIM.z + 1.75);
  const smokeG = keep(new THREE.Group()); smokeG.name = 'bl_kilnSmoke'; group.add(smokeG);
  const smokeM = pm('#e8e4dc', 1.0, { transparent: true, opacity: 0.45, depthWrite: false }); smokeM.userData.noShadow = true;
  const puffs = [0, 1, 2, 3, 4].map((i) => { const m = new THREE.Mesh(cached('blw3puff', () => new THREE.SphereGeometry(0.6, 8, 6)), smokeM); m.position.set(CHIM.x, LOW + 9 + i, CHIM.z); m.castShadow = false; smokeG.add(m); return m; });
  // the overshot wheel: two rims, spokes, buckets; in its pit beside the north wall, the leat's end over it
  const wheelG = keep(new THREE.Group()); wheelG.name = 'bl_waterWheel'; wheelG.position.set(WHEEL.x, WHEEL.y, WHEEL.z); wheelG.rotation.y = Math.PI / 2; group.add(wheelG);
  {
    const R = WHEEL.r, parts = [];
    for (const s of [-1, 1]) parts.push([new THREE.TorusGeometry(R, 0.08, 6, 32), 0, 0, s * 0.3]);
    for (let i = 0; i < 8; i++) for (const s of [-1, 1]) parts.push([bbox(2 * R, 0.1, 0.08, 0.01), 0, 0, s * 0.3, 0, 0, (i * Math.PI) / 8]);
    parts.push([cyl(0.22, 0.22, 0.9, 10).rotateX(Math.PI / 2), 0, 0, 0]);
    const m1 = new THREE.Mesh(compose(parts), BM.post()); m1.castShadow = true; wheelG.add(m1);
    const bk = [];
    for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; bk.push([bbox(0.5, 0.08, 0.66, 0.01), Math.cos(a) * (R - 0.15), Math.sin(a) * (R - 0.15), 0, 0, 0, a + 0.5]); }
    const m2 = new THREE.Mesh(compose(bk), BM.deckOld()); m2.castShadow = true; wheelG.add(m2);
    const bands = new THREE.Mesh(cached('blw3wbands', () => compose([[new THREE.TorusGeometry(R + 0.02, 0.04, 5, 32), 0, 0, 0.36], [new THREE.TorusGeometry(R + 0.02, 0.04, 5, 32), 0, 0, -0.36]])), BM.bronze()); wheelG.add(bands);
  }
  // the leat's end: a wooden trough out over the wheel
  // the leat's end: a timber trough on two posts, out from the leat's corner south over the wheel
  { const z0 = LEAT.z1 - 0.2, z1 = WHEEL.z - WHEEL.r + 0.6, L = z1 - z0, zc = (z0 + z1) / 2, y = LEAT.y1 + 0.05;
    B.add(cached('blw3trough', () => compose([[bbox(1.0, 0.08, L, 0.02), 0, 0, 0], [bbox(0.08, 0.3, L, 0.01), 0.48, 0.15, 0], [bbox(0.08, 0.3, L, 0.01), -0.48, 0.15, 0]])), BM.deckOld(), WHEEL.x, y, zc);
    B.add(cached('blw3troughpost', () => bbox(0.18, y - LOW, 0.18, 0.02, 1)), BM.post(), WHEEL.x - 0.6, (y + LOW) / 2, z0 + 0.4);
    col({ type: 'box', x: WHEEL.x, z: zc, hw: 0.7, hd: L / 2, top: y + 0.3, block: true }); }
  yield;

  // ================================================================ the test installation (N6): three basins, the frame, the dials, the latches, the storm tank
  const rigG = keep(new THREE.Group()); rigG.name = 'bl_rig'; group.add(rigG);
  const rigW = [], rigFloat = [], rigLamp = [], rigDial = [], rigLatch = [];
  const lampM = { off: pm('#5a5650', 0.6), green: pm('#8ee08a', 0.4, { emissive: '#3cc04a', emissiveIntensity: 1.6 }), amber: pm('#ffd070', 0.4, { emissive: '#ffa020', emissiveIntensity: 1.6 }), red: pm('#ff8070', 0.4, { emissive: '#e83020', emissiveIntensity: 1.6 }) };
  RB.forEach((r, i) => {
    const h = r.s / 2;
    // the basin: a stone rim (low, stepped over), the floor shallow, the inner faces glazed celadon with a level mark
    for (const [x0, z0, x1, z1] of [[r.x - h - 0.3, r.z - h - 0.3, r.x + h + 0.3, r.z - h], [r.x - h - 0.3, r.z + h, r.x + h + 0.3, r.z + h + 0.3], [r.x - h - 0.3, r.z - h, r.x - h, r.z + h], [r.x + h, r.z - h, r.x + h + 0.3, r.z + h]]) {
      B.add(sb(x1 - x0, 0.6, z1 - z0, 1.2), BM.cap(), (x0 + x1) / 2, RIM - 0.3, (z0 + z1) / 2);
      box(x0, z0, x1, z1, RIM);
    }
    B.add(sb(r.s, 0.1, r.s, 1.0), BM.glazeTiles(), r.x, RIG_FLOOR - 0.05, r.z);
    for (const [x, z, ry, len] of [[r.x, r.z - h + 0.01, 0, r.s], [r.x, r.z + h - 0.01, Math.PI, r.s], [r.x - h + 0.01, r.z, Math.PI / 2, r.s], [r.x + h - 0.01, r.z, -Math.PI / 2, r.s]]) B.add(cached('blw3rface' + len, () => new THREE.PlaneGeometry(len, RIM - RIG_FLOOR).translate(0, (RIM - RIG_FLOOR) / 2, 0)), BM.glazeTiles(), x, RIG_FLOOR, z, 0, ry);
    box(r.x - h, r.z - h, r.x + h, r.z + h, RIG_FLOOR);
    // the level mark: a bronze strip across the north face at the right level, two small tiles below and above it
    B.add(cached('blw3rmark', () => compose([[bbox(r.s - 0.2, 0.04, 0.03, 0.01), 0, 0, 0], [bbox(0.2, 0.1, 0.03, 0.01), -1.0, -0.12, 0], [bbox(0.2, 0.1, 0.03, 0.01), 1.0, 0.12, 0]])), BM.bronze(), r.x, RIG_FLOOR + 0.25, r.z - h + 0.03);
    const wm = waterMat(0.3); rigW.push(waterPlane(r.x - h, r.z - h, r.x + h, r.z + h, RIG_FLOOR + 0.02, wm, 'bl_rigWater' + i));
    // its float on a guide rod in the north-west corner
    B.add(cached('blw3rrod', () => cyl(0.025, 0.025, 1.1, 6)), BM.bronze(), r.x - h + 0.45, RIG_FLOOR + 0.55, r.z - h + 0.45);
    const fl = keep(new THREE.Mesh(cached('blw3rfloat', () => lathe([[0.001, -0.12], [0.16, -0.08], [0.2, 0], [0.16, 0.08], [0.001, 0.12]], 10)), BM.celadon())); fl.position.set(r.x - h + 0.45, RIG_FLOOR + 0.05, r.z - h + 0.45); fl.castShadow = true; rigG.add(fl); rigFloat.push(fl);
    // the lamp on a post at its north-east corner
    B.add(cached('blw3rlpost', () => compose([[bbox(0.14, 2.0, 0.14, 0.02), 0, 1.0, 0], [lathe([[0.001, 0], [0.2, 0], [0.16, 0.14], [0.001, 0.16]], 10), 0, 2.32, 0]])), BM.post(), r.x + h + 0.15, MID, r.z - h - 0.15);
    const lamp = keep(new THREE.Mesh(cached('blw3rlamp', () => new THREE.SphereGeometry(0.17, 12, 8)), lampM.off)); lamp.position.set(r.x + h + 0.15, MID + 2.18, r.z - h - 0.15); rigG.add(lamp); rigLamp.push(lamp);
    col({ type: 'cyl', x: r.x + h + 0.15, z: r.z - h - 0.15, r: 0.12, top: MID + 2.4, noStand: true });
    // the range dial on a pedestal at its north side: a bronze face, three marks, a pointer
    B.add(cached('blw3dped', () => compose([[bbox(0.4, 1.0, 0.4, 0.03), 0, 0.5, 0], [bbox(0.6, 0.08, 0.5, 0.02), 0, 1.04, 0], [cyl(0.24, 0.24, 0.06, 16).rotateX(Math.PI / 2 - 0.5), 0, 1.15, 0.05]])), AM.ashlar(), r.x + 1.2, MID, r.z - h - 0.9);
    B.add(cached('blw3dmarks', () => compose([0, 1, 2].map((k) => [tint(cyl(0.035, 0.035, 0.02, 8).rotateX(Math.PI / 2 - 0.5), ['#e6b866', '#5f9a86', '#3f6c9c'][k]), Math.sin(-0.9 + k * 0.9) * 0.17, 1.15 + Math.cos(-0.9 + k * 0.9) * 0.17 * Math.cos(0.5), 0.09 + Math.cos(-0.9 + k * 0.9) * 0.17 * Math.sin(0.5)]), true)), BM.vc(), r.x + 1.2, MID, r.z - h - 0.9);
    const dial = keep(new THREE.Group()); dial.position.set(r.x + 1.2, MID + 1.15, r.z - h - 0.84); dial.rotation.x = -(Math.PI / 2 - 0.5) + Math.PI / 2; group.add(dial);
    const ptr = new THREE.Mesh(cached('blw3dptr', () => compose([[bbox(0.04, 0.2, 0.03, 0.005), 0, 0.09, 0], [cyl(0.05, 0.05, 0.05, 8).rotateX(Math.PI / 2)]])), BM.dark()); ptr.position.z = 0.05; dial.add(ptr); rigDial.push(dial);
    col({ type: 'box', x: r.x + 1.2, z: r.z - h - 0.9, hw: 0.3, hd: 0.25, top: MID + 1.2, noStand: true });
    // the switch latch high on a post at its south side (a ball target)
    B.add(cached('blw3spost', () => compose([[bbox(0.22, 3.6, 0.22, 0.02), 0, 1.8, 0], [bbox(0.5, 0.14, 0.4, 0.02), 0, 3.6, 0]])), BM.post(), r.x, MID, r.z + h + 0.6);
    col({ type: 'cyl', x: r.x, z: r.z + h + 0.6, r: 0.16, top: MID + 3.7, noStand: true });
    rigLatch.push(latch(r.x + 0.15, MID + 3.3, r.z + h + 0.75, 0));
  });
  // the troughs that link the basins (A–B, B–C), a sheet of water in each when one spills to the next
  const spills = [];
  for (let i = 0; i < 2; i++) {
    const xa = RB[i].x + RB[i].s / 2 + 0.3, xb = RB[i + 1].x - RB[i + 1].s / 2 - 0.3, z = RB[i].z;
    B.add(cached('blw3trough' + (xb - xa).toFixed(2), () => compose([[bbox(xb - xa + 0.1, 0.12, 0.7, 0.02), 0, 0, 0], [bbox(xb - xa + 0.1, 0.25, 0.1, 0.01), 0, 0.12, 0.3], [bbox(xb - xa + 0.1, 0.25, 0.1, 0.01), 0, 0.12, -0.3]])), BM.celadonDeep(), (xa + xb) / 2, MID + 0.22, z);
    box(xa - 0.1, z - 0.4, xb + 0.1, z + 0.4, MID + 0.5, { block: true });
    const sm = new THREE.Mesh(plane(xb - xa + 0.4, 0.46), fallM); sm.position.set((xa + xb) / 2, MID + 0.33, z); sm.visible = false; sm.renderOrder = 3; group.add(keep(sm)); spills.push(sm);
  }
  // the frame with five part slots (stone saddles in a timber-and-bronze rack); the parts themselves (shown when fitted)
  {
    const p = P(FRAME.x, MID, FRAME.z, 0);
    p.add(cached('blw3frame', () => compose([[bbox(6.2, 0.14, 0.9, 0.02), 0, 0.82, 0], ...[-3, -1, 1, 3].map((k) => [bbox(0.16, 1.8, 0.16, 0.02), k, 0.9, 0.38]), ...[-3, -1, 1, 3].map((k) => [bbox(0.16, 0.82, 0.16, 0.02), k, 0.41, -0.38]), [bbox(6.2, 0.14, 0.14, 0.02), 0, 1.8, 0.38]])), BM.post());
    for (let i = 0; i < 5; i++) p.add(cached('blw3saddle', () => compose([[bbox(0.9, 0.16, 0.6, 0.03), 0, 0, 0], [bbox(0.12, 0.2, 0.6, 0.02), -0.4, 0.15, 0], [bbox(0.12, 0.2, 0.6, 0.02), 0.4, 0.15, 0]])), AM.ashlar(), (i - 2) * 1.15, 0.97, 0);
    p.add(cached('blw3fplate', () => bbox(5.6, 0.3, 0.05, 0.01)), BM.bronze(), 0, 1.55, 0.33);
    p.box(0, 0, 3.15, 0.5, 1.9, { block: true, seeThrough: false }); cols(p.cols);
  }
  const PART_GEO = [
    () => compose([[lathe([[0.001, 0], [0.28, 0], [0.3, 0.08], [0.28, 0.52], [0.18, 0.6], [0.001, 0.6]], 14)], [new THREE.TorusGeometry(0.29, 0.03, 4, 14).rotateX(Math.PI / 2), 0, 0.3, 0]]),   // the ceramic housing
    () => compose([[cyl(0.22, 0.22, 0.1, 14).rotateZ(Math.PI / 2), 0, 0.3, 0], [cyl(0.14, 0.14, 0.12, 12).rotateZ(Math.PI / 2), 0.12, 0.42, 0.05], [cyl(0.04, 0.04, 0.6, 6).rotateZ(Math.PI / 2), 0, 0.3, 0], [bbox(0.5, 0.1, 0.3, 0.02), 0, 0.1, 0]]),   // the brass assembly
    () => compose([[cyl(0.1, 0.1, 0.62, 10).rotateZ(Math.PI / 2), 0, 0.22, 0], [cyl(0.15, 0.15, 0.08, 10).rotateZ(Math.PI / 2), -0.3, 0.22, 0], [cyl(0.15, 0.15, 0.08, 10).rotateZ(Math.PI / 2), 0.3, 0.22, 0]]),   // the core element
    () => compose([[lathe([[0.001, -0.22], [0.2, -0.16], [0.25, 0], [0.2, 0.16], [0.001, 0.22]], 12), 0, 0.26, 0], [new THREE.TorusGeometry(0.06, 0.02, 4, 8), 0, 0.5, 0]]),   // the glazed float
    () => compose([[bbox(0.7, 0.07, 0.07, 0.01), 0, 0.08, -0.22], [bbox(0.7, 0.07, 0.07, 0.01), 0, 0.08, 0.22], [bbox(0.07, 0.5, 0.07, 0.01), -0.32, 0.3, -0.22], [bbox(0.07, 0.5, 0.07, 0.01), 0.32, 0.3, -0.22], [bbox(0.07, 0.5, 0.07, 0.01), -0.32, 0.3, 0.22], [bbox(0.07, 0.5, 0.07, 0.01), 0.32, 0.3, 0.22], [bbox(0.7, 0.07, 0.5, 0.01), 0, 0.55, 0]]),   // the timber frame
  ];
  const PART_MAT = [BM.celadon(), BM.bronze(), BM.cobalt(), BM.celadonDeep(), BM.timber()];
  const parts = PART_GEO.map((fn, i) => { const m = keep(new THREE.Mesh(cached('blw3part' + i, fn), PART_MAT[i])); m.position.set(FRAME.x + (i - 2) * 1.15, MID + 1.13, FRAME.z); m.castShadow = true; m.visible = false; rigG.add(m); return m; });
  // the storm tank on the platform's west end, its sluice and chute into basin A; the feed pipe from the upper basin
  {
    const { x0, x1, z0, z1, top } = TANK, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    B.add(sb(x1 - x0, top - MID, z1 - z0, 1.6), AM.ashlar(), cx, (top + MID) / 2, cz); B.add(sb(x1 - x0 + 0.2, 0.16, z1 - z0 + 0.2, 1.2), BM.cap(), cx, top + 0.08, cz);
    box(x0, z0, x1, z1, top + 0.2, { block: true });
    B.add(cached('blw3chute', () => compose([[bbox(1.6, 0.1, 0.7, 0.02), 0, 0, 0], [bbox(1.6, 0.3, 0.08, 0.01), 0, 0.12, 0.32], [bbox(1.6, 0.3, 0.08, 0.01), 0, 0.12, -0.32]])), BM.celadonDeep(), x1 + 0.7, top - 1.05, RB[0].z + 1.4, 0, 0, -0.45);
    // the feed: a glazed pipe from the upper basin's corner, outside the parapet and down the platform's west edge
    const px = RIG.x0 + 0.3;
    B.add(tube([[-8.4, UP - 0.2, SP.z1 + 0.6], [-6.4, MID + 0.4, SP.z1 + 0.7], [px, MID + 0.4, SP.z1 + 0.8], [px, MID + 0.4, z0 + 1.6], [x0 - 0.1, top - 0.6, z0 + 1.8]], 0.2, 8, 1), BM.celadonDeep());
    for (const z of [SP.z1 + 2.5, SP.z1 + 5.5]) B.add(cached('blw3psaddle', () => bbox(0.5, 0.4, 0.4, 0.03)), AM.ashlar(), px, MID + 0.2, z);
    col({ type: 'box', x: px, z: (SP.z1 + 0.6 + z0 + 1.8) / 2, hw: 0.3, hd: (z0 + 1.8 - SP.z1 - 0.6) / 2, top: MID + 0.7, block: true });
  }
  const sluiceLeaf = keep(new THREE.Mesh(cached('blw3sluice', () => compose([[bbox(0.9, 0.9, 0.1, 0.02, 0.6), 0, 0.45, 0], [bbox(0.94, 0.08, 0.14, 0.01), 0, 0.2, 0], [bbox(0.94, 0.08, 0.14, 0.01), 0, 0.7, 0], [cyl(0.03, 0.03, 1.0, 6), 0, 1.3, 0]])), BM.deckOld()));
  sluiceLeaf.position.set(TANK.x1 + 0.05, TANK.top - 1.4, RB[0].z + 1.4); sluiceLeaf.rotation.y = Math.PI / 2; sluiceLeaf.castShadow = true; group.add(sluiceLeaf);
  const sluiceFall = fall('overflow', TANK.x1 + 1.45, TANK.top - 1.45, RIG_FLOOR + 0.05, RB[0].z + 1.4, 0.5, Math.PI / 2, 0.3); falls.overflow.pop(); sluiceFall.name = 'bl_fall_sluice';
  yield;

  // ================================================================ life: lanterns, the growers' things, the drying rack of floats, gulls
  const props = (p) => { cols(p.cols); return p; };
  const lan = (x, z, y, ry = 0) => props(lantern(P(x, y, z, ry)));
  lan(-53.4, -3.2, UP, Math.PI / 2); lan(-53.4, 3.2, UP, Math.PI / 2); lan(-36.2, -12, UP, -Math.PI / 2); lan(-36.2, 20.6, UP, -Math.PI / 2);
  lan(-9.2, -13.4, UP, 0); lan(19.6, -13.4, MID, 0); lan(46.6, -13.4, LOW, 0); lan(-9.2, 21.4, UP, Math.PI); lan(19.6, 21.4, MID, Math.PI); lan(46.6, 21.4, LOW, Math.PI);
  lan(48.4, -4.0, LOW, Math.PI / 2); lan(-3.8, 36.2, MID, Math.PI);
  // the growers' things by the gangways and the splitter: baskets, a barrow of seed sacks, bean poles in a bundle, herbs
  const basket = (x, y, z, c = '#c8a878') => B.add(cached('blw3basket' + c, () => compose([[tint(lathe([[0.001, 0], [0.24, 0], [0.3, 0.32], [0.32, 0.34], [0.001, 0.34]], 10), c)], [tint(new THREE.TorusGeometry(0.2, 0.02, 4, 10, Math.PI), '#8a6a4a'), 0, 0.34, 0]], true)), BM.vc(), x, y, z);
  basket(BAS[0].cx + 1.9, UP, BZ0 - 0.9); basket(BAS[0].cx + 2.4, UP, BZ0 - 1.4, '#b89868'); col({ type: 'box', x: BAS[0].cx + 2.15, z: BZ0 - 1.15, hw: 0.55, hd: 0.55, top: UP + 0.4, block: true });
  basket(BAS[2].cx - 2.0, LOW, BZ1 + 0.9); col({ type: 'cyl', x: BAS[2].cx - 2.0, z: BZ1 + 0.9, r: 0.35, top: LOW + 0.4, block: true });
  props(barrow(P(-50.8, UP, -15.6, 0.3)));
  B.add(cached('blw3poles', () => compose([0, 1, 2, 3, 4, 5].map((k) => [cyl(0.03, 0.035, 2.4, 5), Math.sin(k) * 0.15, 1.15, Math.cos(k) * 0.15, (k - 2.5) * 0.04, 0, 0.18]))), BM.post(), BAS[1].cx - 2.4, MID, BZ0 - 6.4);
  col({ type: 'cyl', x: BAS[1].cx - 2.4, z: BZ0 - 6.4, r: 0.35, top: MID + 2.2, block: true });
  for (const [x, z, k] of [[-50.4, -18.4, 1], [-41.6, -18.4, 2], [-37.0, 21.0, 0], [-37.0, -13.2, 3]]) { herbPot(P(x, UP, z), { kind: k, s: 1.1 }); col({ type: 'cyl', x, z, r: 0.3, top: UP + 0.5, block: true }); }
  props(crateStack(P(-52.6, UP, 15.4, 0.2), { seed: 52, n: 2, marks: ['#6e9a52', '#6e9a52', null] }));
  { const p = P(-50.6, UP, 16.4); sack(p, { lx: 0, lz: 0, lry: 0.3 }); sack(p, { lx: 0.55, lz: 0.15, lry: -0.4, color: '#cbb488' }); p.box(0.25, 0.05, 0.6, 0.45, 0.65, { block: true }); props(p); }
  // the growers' pergola on the plaza's south part: timber posts and beams, beans grown over it, a bench and seed trays
  {
    const p = P(-47.0, UP, 13.0, 0), pw = 6.0, pd = 3.2, ph = 2.7;
    p.add(cached('blw3pergola', () => compose([...[-1, 1].flatMap((a) => [-1, 0, 1].map((b) => [bbox(0.16, ph, 0.16, 0.02), a * pd / 2, ph / 2, b * pw / 2 * 0.98])), ...[-1, 1].map((a) => [bbox(0.18, 0.2, pw + 0.5, 0.02), a * pd / 2, ph, 0]), ...[-3, -2, -1, 0, 1, 2, 3].map((k) => [bbox(pd + 0.6, 0.12, 0.12, 0.02), 0, ph + 0.16, k * pw / 7])])), BM.post(), 0, 0, 0, 0, Math.PI / 2);
    p.add(cached('blw3pergolaleaves', () => { const parts = [], r = rng(71); for (let i = 0; i < 46; i++) parts.push([tint(new THREE.SphereGeometry(0.22 + r() * 0.18, 6, 4).scale(1.2, 0.6, 1), r() < 0.5 ? '#6e9a4a' : '#86ae56'), (r() - 0.5) * (pw + 0.4), ph + 0.25 + r() * 0.12, (r() - 0.5) * (pd + 0.5)]); for (let i = 0; i < 10; i++) { const x = (i < 5 ? -1 : 1) * pw / 2 * 0.98 * (i % 5 === 2 ? 0 : i % 5 < 2 ? 1 : -1) * (i % 5 === 1 || i % 5 === 3 ? 1 : 1), z = (i < 5 ? -1 : 1) * pd / 2; for (let k = 0; k < 4; k++) parts.push([tint(new THREE.SphereGeometry(0.12, 5, 4), '#6e9a4a'), x + (r() - 0.5) * 0.2, 0.5 + k * 0.55, z + (r() - 0.5) * 0.15]); } return compose(parts, true); }), BM.vc(), 0, 0, 0);
    p.add(cached('blbench', () => compose([[bbox(1.4, 0.07, 0.4, 0.02), 0, 0.45, 0], ...[-1, 1].map((s2) => [bbox(0.08, 0.45, 0.36, 0.02), s2 * 0.6, 0.22, 0])])), BM.timber(), 0.4, 0, -0.8);
    p.add(cached('blw3trays', () => compose([0, 1, 2].map((k) => [bbox(1.0, 0.06, 0.6, 0.01), 0, 0.45 + k * 0.35, 0]).concat([[bbox(0.06, 1.2, 0.06, 0.01), -0.48, 0.6, -0.28], [bbox(0.06, 1.2, 0.06, 0.01), 0.48, 0.6, -0.28], [bbox(0.06, 1.2, 0.06, 0.01), -0.48, 0.6, 0.28], [bbox(0.06, 1.2, 0.06, 0.01), 0.48, 0.6, 0.28]]))), BM.timber(), -2.0, 0, 0.9);
    p.add(cached('blw3seeds', () => { const parts = [], r = rng(5); for (let k = 0; k < 3; k++) for (let i = 0; i < 12; i++) parts.push([tint(new THREE.SphereGeometry(0.035, 4, 3), ['#c8a060', '#8a6a3a', '#a8b060'][k]), -2.0 + (r() - 0.5) * 0.85, 0.5 + k * 0.35, 0.9 + (r() - 0.5) * 0.5]); return compose(parts, true); }), BM.vc(), 0, 0, 0);
    for (const [x, z] of [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]]) p.cyl(z * pw / 2 * 0.98, x * pd / 2, 0.12, ph, { block: true });
    p.box(0.4, -0.8, 0.72, 0.22, 0.5, { block: true }); p.box(-2.0, 0.9, 0.55, 0.35, 1.3, { block: true });
    cols(p.cols);
  }
  // Corvin's drying rack of glazed floats on the east terrace (his trade, seen before his door)
  {
    const p = P(50.2, LOW, -6.0, Math.PI / 2);
    p.add(cached('blw3rack', () => compose([...[-1.3, 0, 1.3].map((x) => [bbox(0.1, 1.9, 0.1, 0.01), x, 0.95, -0.3]), ...[-1.3, 0, 1.3].map((x) => [bbox(0.1, 1.9, 0.1, 0.01), x, 0.95, 0.3]), ...[0.5, 1.1, 1.7].map((y) => [bbox(2.8, 0.06, 0.7, 0.01), 0, y, 0])])), BM.post());
    p.add(cached('blw3rackfloats', () => { const parts = [], r = rng(8); for (const y of [0.5, 1.1, 1.7]) for (let i = 0; i < 6; i++) parts.push([tint(new THREE.SphereGeometry(0.17, 10, 8), ['#9cc8b4', '#3f6c9c', '#5f9a86', '#e6b866'][Math.floor(r() * 4)]), -1.15 + i * 0.46, y + 0.2, (r() - 0.5) * 0.25]); return compose(parts, true); }), pm('#ffffff', 0.3, { vertexColors: true }));
    p.box(0, 0, 1.5, 0.45, 2.0, { block: true }); props(p);
  }
  props(ballastPot(P(61.0, LOW, -4.0), { s: 1.1 })); props(ballastPot(P(62.3, LOW, -3.2), { s: 0.8, mat: BM.cobalt() }));
  // a bench on the rig's platform looking at the basins; another on the plaza by the gauges
  for (const [x, z, ry, y] of [[9.25, 35.6, Math.PI, MID], [-52.0, -12.0, Math.PI / 2, UP]]) { const p = P(x, y, z, ry); p.add(cached('blbench', () => compose([[bbox(1.4, 0.07, 0.4, 0.02), 0, 0.45, 0], ...[-1, 1].map((s) => [bbox(0.08, 0.45, 0.36, 0.02), s * 0.6, 0.22, 0])])), BM.timber()); p.box(0, 0, 0.72, 0.22, 0.5, { block: true }); props(p); }
  // the causeway to the House of Balances (W-4): its first stretch over the sea, a closed bronze gate at its foot
  {
    const cz = (CAUSE.z0 + CAUSE.z1) / 2;
    for (let i = 0; i < 5; i++) { const x = EAST.x1 + 0.4 + i * 6; B.add(sb(6, LOW + 2.2, CAUSE.z1 - CAUSE.z0, 1.8), BM.stone(), x + 3, (LOW - 2.2) / 2, cz + i * 1.2); B.add(sb(6.1, 0.16, CAUSE.z1 - CAUSE.z0 + 0.12, 1.2), BM.cap(), x + 3, LOW - 0.06, cz + i * 1.2); }
    const g = P(EAST.x1 + 0.2, LOW, cz, Math.PI / 2);
    for (const s of [-1, 1]) { g.add(cached('blw3cpost', () => bbox(0.5, 2.8, 0.5, 0.04, 1)), AM.ashlar(), s * 2.6, 1.4, 0); g.add(cached('blw3cpcap', () => lathe([[0.001, 0], [0.32, 0], [0.26, 0.2], [0.001, 0.44]], 10)), BM.cobalt(), s * 2.6, 2.8, 0); }
    g.add(cached('blw3cgate', () => compose([...[-2, -1, 0, 1, 2].map((k) => [cyl(0.03, 0.03, 1.8, 6), k * 0.45, 0.95, 0]), [bbox(4.6, 0.08, 0.06, 0.01), 0, 0.3, 0], [bbox(4.6, 0.08, 0.06, 0.01), 0, 1.7, 0]])), BM.bronze(), 0, 0, 0);
    box(EAST.x1, CAUSE.z0, EAST.x1 + 0.5, CAUSE.z1, LOW + 1.9, { block: true });
  }
  // gulls on the gauges' caps, the aqueduct, the bottle kiln, the leat's wall, the rig's posts
  const gp = [{ x: GAUGE[0].x, z: GAUGE[0].z, y: UP + 4.5 }, { x: AQ.x, z: -50, y: AQ.bed + 0.4 }, { x: CHIM.x + 0.5, z: CHIM.z, y: LOW + 8.8 }, { x: 10, z: LEAT.z0 + 0.1, y: 7.5 },
    { x: RB[2].x, z: RB[2].z + 2.9, y: MID + 3.7 }, { x: -20, z: SP.z0 + 0.15, y: UP + 0.36, ground: true }, { x: 56, z: 0, y: LOW, ground: true }];
  const gulls = new Gulls({ parent: group, physics, name: 'bl_w3gulls', n: 5, seed: 47, perches: gp.map((q) => ({ ...q, x: q.x + ox, z: q.z + oz })) });
  for (const m of [gulls.body, gulls.wing]) m.position.set(-ox, 0, -oz);
  // buoys in the sea round the gardens (they bob)
  const bobs = [];
  for (const [x, z, c] of [[-66, 6, '#c8764e'], [-62, 30, '#9cc8b4'], [30, 34, '#e6b866'], [70, 6, '#c8764e']]) bobs.push([buoyGeo(c), M4(x, 0, z, 0), new THREE.Vector3(x, 0, z)]);
  { const m = new THREE.Mesh(bobGeo(bobs), bobbed(BM.vc())); m.name = 'bl_floatingSea'; m.castShadow = true; m.userData.keep = true; group.add(m); }
  B.build();
  yield;

  // ================================================================ the rooms (gardenrooms.js)
  const GR = buildGardenRooms(scene, physics), rooms = GR.rooms, tunnelCtl = GR.tunnel, kilnCtl = GR.kiln;
  yield;

  // ================================================================ the region's room object
  const W = (x, z, a) => ({ x: x + ox, z: z + oz, ...(a != null ? { a } : {}) });
  const KILN_DOOR = { x: KILN.door, z: KILN.z1 + 0.25 };
  const spawns = {
    fromArches: W(GATE_W.x + 2.4, GATE_W.z, Math.PI / 2), fromHouse: W(EAST.x1 - 2.4, (CAUSE.z0 + CAUSE.z1) / 2, -Math.PI / 2),
    tunnelOut: W(HATCH.x, HATCH.z + 1.6, 0), kilnOut: W(KILN_DOOR.x, KILN_DOOR.z + 1.4, 0), rig: W(FRAME.x, FRAME.z - 2.2, 0),
    tunnelIn: { ...GROOMS.tunnel.spawn }, kilnIn: { ...GROOMS.kiln.spawn },
  };
  const doorsOut = {
    tunnelOut: { ...W(HATCH.x, HATCH.z), r: 0.5, room: 'bl_tunnel' },
    kilnOut: { ...W(KILN_DOOR.x, KILN_DOOR.z), r: 0.6, room: 'bl_kiln' },
  };
  const exits = {
    toArches: { ...W(GATE_W.x + 0.5, GATE_W.z), r: 0.8, room: 'bl_arches' },
    toHouse: { ...W(EAST.x1 - 0.6, (CAUSE.z0 + CAUSE.z1) / 2), r: 0.9, room: 'bl_house' },
  };
  const R = {
    id: 'bl_gardens', outdoor: true, sky: false, group, center: new THREE.Vector3(ox, 0, oz), lights: [], exits: [exits.toArches, doorsOut.tunnelOut, doorsOut.kilnOut],
    searches: [], ballTargets: [], givers: [], updaters, music: 'harbour', env, spawn: spawns.fromArches,
    entries: { bl_arches: spawns.fromArches, bl_tunnel: spawns.tunnelOut, bl_kiln: spawns.kilnOut, bl_house: spawns.fromHouse },
    sounds: [{ kind: 'water', ...W(-21, 4), r: 26, vol: 0.3 }, { kind: 'water', ...W(WHEEL.x, WHEEL.z), r: 18, vol: 0.4 }, { kind: 'water', ...W(G3C.x0 - 3, -21), r: 16, vol: 0.35 }],
    safe: [W(-50, 6), W(-44, -14), W(-20, -10.5), W(8, -10.5), W(36, -10.5), W(56, 0), W(8, 19), W(9, 24), W(-20, 19)],
    colliders: statics,
    sample: [W(-52, 0), W(-44, -15), W(-21, -10.5), W(-21, 4), W(8, -10.5), W(8, 19), W(9, 28), W(36, -10.5), W(55, -8), W(55, 18)],
  };
  // (stone underfoot everywhere but the walkways and the rafts' decks)
  Object.defineProperty(R, 'surface', { get() { const h = globalThis.game?.hero?.pos; if (!h) return 'stone'; const x = h.x - ox, z = h.z - oz; return BAS.some((b) => x > b.x0 && x < b.x1 && z > BZ0 + GANG.run && z < BZ1 - GANG.run) ? 'wood' : 'stone'; } });

  // ================================================================ state and handles
  const S = {
    flow: { upper: 1, gardens: 0, kiln: 1, overflow: 0 }, flowTo: { upper: 1, gardens: 0, kiln: 1, overflow: 0 },
    gUp: 0.9, gLow: 0.1, gUpTo: 0.9, gLowTo: 0.1, gates: { 1: 0, 2: 2, 3: 0 }, gateA: { 1: 0, 2: 2, 3: 0 }, tap: true, free: false,
    rafts: 0, wt: 0, wtFrom: 0, wtTo: 0, wtT: 1, running: true, speed: 1, speedA: 1, wheelA: 0,
    parts: [false, false, false, false, false], ranges: [1, 1, 1], rangeA: [1, 1, 1], levels: [0, 0, 0], levelA: [0, 0, 0], lamps: ['off', 'off', 'off'], sluice: false, sluiceA: 0, spill: [0, 0],
  };
  const listeners = [];
  const sfx = (name, x, z, r = 45) => { const G = globalThis.game; if (!G || G.room !== R || G.state !== 'play') return; if (Math.hypot(G.hero.pos.x - ox - x, G.hero.pos.z - oz - z) < r) G.audio?.play?.(name); };
  const changed = (what) => { for (const f of listeners) { try { f(what); } catch (e) { console.warn('ballastra gardens listener', e); } } };
  const WALK_S = 4, GAUGE_S = 1.5, GATE_S = 1.5;
  // the basins' water and all that floats on it
  const applyWater = () => {
    BAS.forEach((b, i) => {
      const y = levelY(b, S.wt);
      basinW[i].mesh.position.y = y; basinW[i].mesh.visible = S.wt > 0.03; basinW[i].mat.uniforms.uDepthOv.value = y - b.bed;
      floatGs[i].position.y = y;
    });
    for (const k of walkCols) k.c.top = levelY(BAS[k.bi], S.wt) + 0.32;
    for (const k of raftCols) k.c.top = levelY(BAS[k.bi], S.wt) + k.top;
    for (const gw of gangways) {
      const b = BAS[gw.bi], yA = b.path, yB = levelY(b, S.wt) + 0.32, th = Math.atan2(yB - yA, gw.L);
      gw.g.rotation.x = gw.dir < 0 ? th : -th; gw.g.scale.z = 1 / Math.cos(th);
      gw.segs.forEach((c, i) => { c.top = yA + (yB - yA) * (i + 0.5) / gw.N; });
    }
  };
  const applyRafts = () => {
    plantGs.forEach((gs, st) => gs.forEach((g) => { g.visible = st === S.rafts; }));
    beds.forEach((m) => { m.material = S.rafts === 0 ? crackM : wetM; });
  };
  const applyFlow = () => {
    for (const k of Object.keys(chan)) {
      const f = S.flow[k];
      for (const m of chan[k]) m.visible = f > 0.02;
      for (const m of falls[k]) m.visible = f > 0.02;
    }
    chan.upper[0].position.y = AQ.bed + 0.05 + 0.35 * S.flow.upper;
    chan.gardens[0].position.y = chan.gardens[1].position.y = G1C.bed + 0.05 + 0.3 * S.flow.gardens;
    chan.overflow[0].position.y = G3C.bed + 0.05 + 0.3 * S.flow.overflow;
    chan.kiln[0].position.y = -0.3 + 0.3 * S.flow.kiln;
  };
  const applyGauges = () => { markers[0].position.y = UP + 0.85 + S.gUp * 2.6; markers[1].position.y = UP + 0.85 + S.gLow * 2.6; };
  const applyGates = () => { for (const id of [1, 2, 3]) { const L = gateLeaves[id]; L.m.position.y = L.y0 + S.gateA[id] * 0.5; } tunnelCtl.setGates(S.gateA); };
  const applyKiln = () => { chimGlow.visible = S.running; smokeG.visible = S.running; kilnCtl.setRunning(S.running); };
  const applyRig = () => {
    parts.forEach((m, i) => { m.visible = S.parts[i]; });
    rigW.forEach((m, i) => { m.position.y = RIG_FLOOR + 0.02 + S.levelA[i] * (RIG_FULL - RIG_FLOOR); m.visible = S.levelA[i] > 0.02; rigFloat[i].position.y = RIG_FLOOR + 0.05 + S.levelA[i] * (RIG_FULL - RIG_FLOOR); });
    rigLamp.forEach((m, i) => { m.material = lampM[S.lamps[i]]; });
    rigDial.forEach((d, i) => { d.children[0].rotation.z = (1 - S.rangeA[i]) * 0.9; });
    sluiceLeaf.position.y = TANK.top - 1.4 + S.sluiceA * 0.8; sluiceFall.visible = S.sluice && S.sluiceA > 0.5;
    spills.forEach((m, i) => { m.visible = S.spill[i] > 0; });
  };
  const H = {
    rooms: ['bl_gardens', 'bl_tunnel', 'bl_kiln'],
    spawns, exits,
    doors: { ...doorsOut, tunnelIn: { ...rooms.bl_tunnel.exits[0] }, kilnIn: { ...rooms.bl_kiln.exits[0] } },
    stands: {
      wenna_rafts: W(BAS[0].cx + 1.8, BZ0 - 2.2, 0), wenna_gauges: W(HOUSE.x - 0.4, HOUSE.z + HOUSE.d / 2 + 3.6, Math.PI),
      grower1: W(BAS[1].cx + 2.0, SP.z0 + 1.6, Math.PI), grower2: W(BAS[2].cx + 2.4, BZ0 - 2.0, 0),
      corvin_kiln: { ...GROOMS.kiln.corvin }, corvin_wheel: W(PIT.x0 - 1.4, WHEEL.z + 1.6, Math.atan2(WHEEL.x - PIT.x0 + 1.4, -1.6)),
      tessa_rig: W(FRAME.x - 1.4, FRAME.z - 1.3, 0), oren_rig: W(RIG.x1 - 1.4, RIG.z0 + 1.6, Math.atan2(FRAME.x - RIG.x1 + 1.4, RB[1].z - RIG.z0 - 1.6)),
      mags_rig: W(RIG.x0 + 2.6, RIG.z0 + 3.6, Math.PI / 2 + 0.4), wenna_rig: W(RB[1].x - 2.6, RIG.z1 - 1.0, Math.PI), tib_sluice: W(TANK.x0 + 0.4, TANK.z0 - 1.6, 0),
      rigWatch1: W(RB[0].x + 1.4, RIG.z1 - 1.0, Math.PI), rigWatch2: W(RB[2].x - 1.6, RIG.z1 - 1.0, Math.PI), rigWatch3: W(RIG.x1 - 1.0, RB[2].z + 1.8, -Math.PI / 2), rigWatch4: W(RIG.x1 - 1.0, RB[2].z - 1.6, -Math.PI / 2),
    },
    spots: {
      gaugeUpper: { ...W(GAUGE[0].x, GAUGE[0].z + 1.1), r: 0.9 }, gaugeLower: { ...W(GAUGE[1].x, GAUGE[1].z + 1.1), r: 0.9 }, tunnelHatch: { ...W(HATCH.x, HATCH.z + 1.0), r: 0.9 },
      tap: { ...GROOMS.tunnel.tap }, bypassValve: { ...GROOMS.tunnel.bypass }, gate1: { ...GROOMS.tunnel.gate1 },
      ...Object.fromEntries([0, 1, 2, 3, 4].map((i) => ['rigSlot' + i, { ...W(FRAME.x + (i - 2) * 1.15, FRAME.z - 0.95), r: 0.5 }])),
      ...Object.fromEntries([0, 1, 2].map((i) => ['rigRange' + i, { ...W(RB[i].x + 1.2, RB[i].z - RB[i].s / 2 - 1.55), r: 0.6 }])),
    },
    safe: R.safe,
    ballTargets: {
      gate2Latch: { ...W(GATE2.x + 0.9, LEAT.z0 - 0.15), y: LEAT.y0 + 3.1, r: 0.35 }, gate3Latch: { ...W(GATE3.x, GATE3.z), y: 5.6, r: 0.35 },
      ...Object.fromEntries([0, 1, 2].map((i) => ['rigSwitch' + i, { ...W(RB[i].x + 0.15, RB[i].z + RB[i].s / 2 + 0.75), y: MID + 3.3, r: 0.3 }])),
    },
    channels: {
      show(f = {}, instant = false) { let any = false; for (const k of ['upper', 'gardens', 'kiln', 'overflow']) if (f[k] != null) { const v = clamp(+f[k], 0, 1); if (v !== S.flowTo[k]) any = true; S.flowTo[k] = v; if (instant) S.flow[k] = v; } applyFlow(); if (any) { if (!instant) sfx('waterRun', -44, -20, 70); changed('channels'); } },
      get flows() { return { ...S.flowTo }; },
    },
    gauges: { set(u, l, instant = false) { const nu = clamp(+u, 0, 1), nl = clamp(+l, 0, 1), was = S.gUpTo !== nu || S.gLowTo !== nl; S.gUpTo = nu; S.gLowTo = nl; if (instant) { S.gUp = nu; S.gLow = nl; } applyGauges(); if (was) changed('gauges'); }, get upper() { return S.gUpTo; }, get lower() { return S.gLowTo; } },
    gate: { set(id, pos, instant = false) { id = clamp(Math.round(id), 1, 3); pos = clamp(Math.round(pos), 0, 2); const was = S.gates[id]; S.gates[id] = pos; if (instant) S.gateA[id] = pos; else if (pos !== was) sfx('grind', id === 3 ? GATE3.x : id === 2 ? GATE2.x : HOUSE.x, -21); applyGates(); if (pos !== was) changed('gate'); }, get(id) { return S.gates[id]; } },
    tap: { setOpen(b, instant = false) { b = !!b; if (b === S.tap) return; S.tap = b; tunnelCtl.setTap(b, instant); changed('tap'); }, get open() { return S.tap; } },
    bypass: { setFree(b, instant = false) { b = !!b; if (b === S.free) return; S.free = b; tunnelCtl.setBypass(b, instant); changed('bypass'); }, get free() { return S.free; } },
    rafts: { setState(s, instant = false) { s = clamp(Math.round(s), 0, 2); if (s === S.rafts) return; S.rafts = s; applyRafts(); void instant; changed('rafts'); }, get state() { return S.rafts; } },
    walkways: {
      setLevel(t, instant = false) { t = clamp(+t, 0, 1); const was = S.wtTo; S.wtTo = t; if (instant) { S.wt = t; S.wtT = 1; } else if (Math.abs(t - S.wt) > 1e-3) { S.wtFrom = S.wt; S.wtT = 0; sfx('waterRun', -21, 4, 70); } applyWater(); if (t !== was) changed('walkways'); },
      get level() { return S.wtTo; }, get moving() { return S.wtT < 1; }, get y() { return BAS.map((b) => levelY(b, S.wt)); },
    },
    kiln: { setRunning(b, instant = false) { b = !!b; if (b === S.running) return; S.running = b; applyKiln(); void instant; changed('kiln'); }, get running() { return S.running; } },
    wheel: { setSpeed(s) { s = clamp(+s, 0, 1); if (s === S.speed) return; S.speed = s; changed('wheel'); }, get speed() { return S.speed; } },
    rig: {
      setPart(slot, b, instant = false) { slot = clamp(Math.round(slot), 0, 4); b = !!b; if (S.parts[slot] === b) return; S.parts[slot] = b; if (!instant && b) sfx('clunk', FRAME.x, FRAME.z); applyRig(); changed('rig'); },
      setRange(i, r, instant = false) { i = clamp(Math.round(i), 0, 2); r = clamp(Math.round(r), 0, 2); if (S.ranges[i] === r) return; S.ranges[i] = r; if (instant) S.rangeA[i] = r; else sfx('gearClack', RB[i].x, RB[i].z); applyRig(); changed('rig'); },
      setLevels(ls, instant = false) { ls = [0, 1, 2].map((i) => clamp(+(ls?.[i] ?? S.levels[i]), 0, 1)); S.levels = ls; if (instant) S.levelA = ls.slice(); applyRig(); changed('rig'); },
      setLamp(i, c) { i = clamp(Math.round(i), 0, 2); if (!lampM[c]) c = 'off'; if (S.lamps[i] === c) return; S.lamps[i] = c; applyRig(); changed('rig'); },
      spill(from, to) { from = clamp(Math.round(from), 0, 2); to = clamp(Math.round(to), 0, 2); if (Math.abs(from - to) !== 1) return false; S.spill[Math.min(from, to)] = 2.5; sfx('splash', RB[from].x, RB[from].z); applyRig(); changed('rig'); return true; },
      setSluice(b, instant = false) { b = !!b; if (b === S.sluice) return; S.sluice = b; if (instant) S.sluiceA = b ? 1 : 0; else sfx('grind', TANK.x1, RB[0].z); applyRig(); changed('rig'); },
      get parts() { return S.parts.slice(); }, get ranges() { return S.ranges.slice(); }, get levels() { return S.levels.slice(); }, get lamps() { return S.lamps.slice(); }, get sluice() { return S.sluice; },
      get spilling() { return S.spill.map((v) => v > 0); },
      LAMPS: ['off', 'green', 'amber', 'red'],
    },
    onChange(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    // (for tests and pictures: the build's numbers)
    plan: { UP, MID, LOW, BAS, BZ0, BZ1, DYKES, NP, SP, STAIRS, PLAZA, HOUSE, G1C, G3C, LEAT, AQ, EAST, KILN, WHEEL, PIT, CHIM, RIG, RB, RIG_FLOOR, RIG_FULL, FRAME, TANK, GATE_W, GATE2, GATE3, RAFT_DX, RAFT_Z, RAFT, WALK, GANG, HATCH, GAUGE: GAUGE.map((g) => ({ x: g.x, z: g.z })) },
  };
  R.gardens = H; R.npcSpots = H.stands; BALLASTRA.gardens = H;
  for (const id of ['bl_tunnel', 'bl_kiln']) rooms[id].gardens = H;

  // ---- per frame
  const _v = new THREE.Vector3();
  let dryAt = null, wetT = 0;
  updaters.push((dt, t) => {
    sea.update(dt, t); BOB.t.value = t;
    fallT.offset.y = (t * 1.4) % 1;
    // the basins rise or fall (about 4 s), the rafts and walkways ride them
    if (S.wtT < 1) { S.wtT = Math.min(1, S.wtT + dt / WALK_S); S.wt = S.wtFrom + (S.wtTo - S.wtFrom) * ease(S.wtT); applyWater(); if (S.wtT >= 1) sfx('clunk', -21, 4, 70); }
    // the channels' flows, the gauges, the gates, the rig's levels, dials and sluice ease to their settings
    let fl = false; for (const k of Object.keys(S.flow)) { const d = S.flowTo[k] - S.flow[k]; if (Math.abs(d) > 1e-4) { S.flow[k] += Math.sign(d) * Math.min(Math.abs(d), dt / 1.5); fl = true; } } if (fl) applyFlow();
    let gm = false; for (const [k, kt] of [['gUp', 'gUpTo'], ['gLow', 'gLowTo']]) { const d = S[kt] - S[k]; if (Math.abs(d) > 1e-4) { S[k] += Math.sign(d) * Math.min(Math.abs(d), dt / GAUGE_S); gm = true; } } if (gm) applyGauges();
    let gt = false; for (const id of [1, 2, 3]) { const d = S.gates[id] - S.gateA[id]; if (Math.abs(d) > 1e-4) { S.gateA[id] += Math.sign(d) * Math.min(Math.abs(d), (2 * dt) / GATE_S); gt = true; } } if (gt) applyGates();
    let rg = false;
    for (let i = 0; i < 3; i++) { let d = S.levels[i] - S.levelA[i]; if (Math.abs(d) > 1e-4) { S.levelA[i] += Math.sign(d) * Math.min(Math.abs(d), dt / 2.0); rg = true; } d = S.ranges[i] - S.rangeA[i]; if (Math.abs(d) > 1e-4) { S.rangeA[i] += Math.sign(d) * Math.min(Math.abs(d), dt * 3); rg = true; } }
    { const d = (S.sluice ? 1 : 0) - S.sluiceA; if (Math.abs(d) > 1e-4) { S.sluiceA += Math.sign(d) * Math.min(Math.abs(d), dt / 1.5); rg = true; } }
    for (let i = 0; i < 2; i++) if (S.spill[i] > 0) { S.spill[i] = Math.max(0, S.spill[i] - dt); if (S.spill[i] === 0) rg = true; }
    if (rg) applyRig();
    // the wheel: its speed eases to the setting, and it only turns with water on it
    const want = S.speed * Math.min(1, S.flow.kiln * 1.5);
    S.speedA += (want - S.speedA) * Math.min(1, dt * 0.8);
    S.wheelA -= S.speedA * dt * 0.9; wheelG.rotation.z = S.wheelA;
    kilnCtl.turn(S.speedA, dt);
    // the kiln's smoke
    if (S.running) puffs.forEach((m, i) => { const k = ((t * 0.25 + i / puffs.length) % 1); m.position.set(CHIM.x + k * 2.2, LOW + 8.9 + k * 6, CHIM.z - k * 0.8); m.scale.setScalar(0.5 + k * 1.6); });
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
  // the start (N2, "The Missing Water"): the aqueduct full, the gardens' gate shut and their channel dry, the leat running
  // the kiln through the unrecorded tap, the bypass seized; the basins dry, the rafts wilted on cracked mud; the rig empty
  H.gate.set(1, 0, true); H.gate.set(2, 2, true); H.gate.set(3, 0, true);
  H.channels.show({ upper: 1, gardens: 0, kiln: 1, overflow: 0 }, true); H.gauges.set(0.9, 0.1, true);
  tunnelCtl.setTap(true, true); tunnelCtl.setBypass(false, true);
  H.walkways.setLevel(0, true); applyRafts(); applyKiln(); applyRig(); applyGauges(); applyGates(); applyFlow(); applyWater();
  updaters[0](0, 0);
  return { bl_gardens: R, ...rooms };
}
