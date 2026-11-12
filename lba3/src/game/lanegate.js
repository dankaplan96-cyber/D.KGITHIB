// CAMPAIGN-6 (the user's treatment of 11.11.2026, section 7 "The evacuation — Zoé finds the omission"): the lane's old
// water gate, its culvert and cart landing, the project's notice board on the lighthouse path and the project's list
// cart. Ours (the sequel's; LBA2 has no such gate): the lane north of Twinsen's house (Bug Street) leaves the plaza
// between the end of the garden railing and the project's copper heat pipe, and that throat is where it stands.
//
// What stands there (Citadel's world metres; story/laneline.js plays it):
//   - two stone posts across the lane's mouth and a two-leaf iron gate between them. It is the water office's flood gate:
//     a float in a cage on the west post holds its catch while the culvert under the lane is full. Open (every chapter
//     but the evacuation's first half) the leaves stand swung back against the posts, out of the way
//   - the culvert's grate across the lane just inside the gate; full, the water stands over it in a sheet
//   - the cart landing: a flagged stop on the west side between the railing and the pump house, a bench, a sign
//     (CART STOP · LANE); the lane's bundles on it while its people wait
//   - (chapter 8 only) the project's notice board at the lighthouse path's stop: the list cart's SCHEDULE and ROUTE
//   - (chapter 8 only, while a scene runs) the list cart: a motor wagon in the project's teal, two side benches, a driver's
//     bench behind the bonnet. It drives a path (pose(s)); its riders are the story's people, seated by the story
//
// Draw calls: the gate's posts, the landing, the grate and the signs are one Kit (merged per material, ~5); the two leaves,
// the float and the water sheet one mesh each; the bundles one Batch (3) shown while people wait. The board is a Kit of its
// own (~3, only drawn near the lighthouse path). The cart is a Batch (~6) drawn only while it drives.
//
// CONTRACT (story/laneline.js; world points)
//   buildLaneGate(game) → W.laneGate = {
//     gate {x, z, setOpen(b, instant), open, tick}, culvert {setFull(b, instant), full}, float,
//     landing {x, z, spots: [{x, z, a}], stop {x, z, a} (where the cart stands), bundles (Group)},
//     board {x, z, sched: {x, z, front}, route: {x, z, front}, group}, cart: { group, pose(x, z, a), seat(i) → {x, y, z, a},
//     driver() → {x, y, z, a}, show(b) }, paths: { pass: [[x, z]...], come: [...], leave: [...] } }
import * as THREE from 'three';
import { Kit, MAT, rbox, cyl, sphere, canvasTex } from './props.js';
import { Batch, tm } from './kit.js';
import { addBundle } from './story/shelters.js';

// the gate's posts (centres) across the lane's throat: the railing's end at x −47.7, the copper pipe at −43.5
const GATE = { x0: -47.5, x1: -44.0, z: 60.55 };
const POST = 0.34, LEAF = (GATE.x1 - GATE.x0 - POST) / 2, OPEN = 1.48;
const GRATE = { x: (GATE.x0 + GATE.x1) / 2, z: 61.4, hw: 1.45, hd: 0.36 };
const LANDING = { x: -48.9, z: 62.45, hw: 0.95, hd: 1.5, h: 0.14 };
// the board on the lighthouse path's stop (north edge of the path, facing the path)
const BOARD = { x: -89.6, z: 95.0, ry: 0 };   // (on the flat by the gather point, west of the rock; facing the path)
// the cart's own frame: +z forward; its riders' roots on the bed (BED), the benches' tops 0.45 m above
const BED = 0.58;
const SEATS = [[-0.55, -1.2, Math.PI / 2], [0.55, -1.2, -Math.PI / 2], [-0.55, -0.45, Math.PI / 2], [0.55, -0.45, -Math.PI / 2], [-0.55, 0.3, Math.PI / 2], [0.55, 0.3, -Math.PI / 2]];
const STOP = { x: (GATE.x0 + GATE.x1) / 2 + 0.05, z: 62.7 };   // (where it stands at the landing, facing down the lane)
// its paths: the pass (down the plaza's road to the shut gate, a stop, then off west to the fields), the way in to the
// landing (down the same road, through the gate) and the way out (backed up to the road, then up toward the bridge)
// (the westward leg keeps north of the bush at the corner and of the hill farm's bundle; the turn out of the lane is a
//  reverse with the tail swung west, then forward up the road: no U-turn in a lane four metres wide)
const PATHS = {
  pass: [[-45.95, 46.0], [-45.85, 52.0], [-45.8, 56.4], [-47.2, 57.9], [-53.5, 58.3], [-60.5, 59.0], [-69.0, 59.6]],
  passStop: 10.2,   // (arc length of the stop at the shut gate)
  come: [[-46.0, 44.0], [-45.9, 52.0], [-45.75, 57.5], [STOP.x, STOP.z]],
  back: [[STOP.x, STOP.z], [-45.75, 58.8], [-47.4, 57.9], [-49.2, 58.6]],
  leave: [[-49.2, 58.6], [-46.7, 57.2], [-45.95, 52.0], [-46.0, 44.0], [-45.6, 36.0]],
};
export const LANE = { GATE, GRATE, LANDING, BOARD, STOP, PATHS };

// one texture for the signs and the board's sheets (a quad on its part: atlas(u0, v0, u1, v1), in the canvas's pixels)
const ATLAS_W = 1024, ATLAS_H = 512;
let ATLAS = null;
const atlasTex = () => (ATLAS ??= canvasTex(ATLAS_W, ATLAS_H, (x) => {
  const plate = (x0, y0, w, h, bg, ink, lines, sizes) => {
    x.fillStyle = bg; x.fillRect(x0, y0, w, h); x.strokeStyle = ink; x.lineWidth = 5; x.strokeRect(x0 + 6, y0 + 6, w - 12, h - 12);
    x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle';
    lines.forEach((l, i) => { x.font = `bold ${sizes[i]}px sans-serif`; x.fillText(l, x0 + w / 2, y0 + h * (lines.length === 1 ? 0.5 : (i + 0.75) / (lines.length + 0.5))); });
  };
  // (0) the gate's plate: 0..512 × 0..128
  plate(0, 0, 512, 128, '#26384a', '#e8e4d4', ['LANE · WATER GATE', 'SHUT WHILE THE CULVERT IS FULL'], [40, 24]);
  // (1) the landing's sign: 512..1024 × 0..128
  plate(512, 0, 512, 128, '#e8dcc0', '#2a1a10', ['CART STOP · LANE'], [52]);
  // (2) the cart's side plate: 0..512 × 128..192
  plate(0, 128, 512, 64, '#e8e4d4', '#1f4f54', ['JOINT PROJECT · LIST CART'], [34]);
  // (3) the board's header: 512..1024 × 128..192
  plate(512, 128, 512, 64, '#1f4f54', '#e8e4d4', ['LIST CART · STOP 5 · LIGHTHOUSE PATH'], [22]);
  // (4) the schedule: 0..512 × 192..512 (every stop, every round; the lane's names)
  x.fillStyle = '#f2ecd8'; x.fillRect(0, 192, 512, 320); x.fillStyle = '#1a1a1a'; x.textAlign = 'left'; x.textBaseline = 'alphabetic';
  x.font = 'bold 32px sans-serif'; x.fillText('SCHEDULE · EVERY ROUND', 24, 236);
  const stops = [['1 BRIDGE', 'boarding'], ['2 PLAZA', '6 names'], ['3 FIELDS', '4 names'], ['4 LANE GATE', 'BRAM · HEDDA · FENN'], ['5 LIGHTHOUSE PATH', '3 names']];
  x.font = '24px sans-serif';
  stops.forEach(([a, b], i) => { const y = 284 + i * 44; x.fillStyle = i === 3 ? '#8a2a1a' : '#1a1a1a'; x.fillText(a, 28, y); x.fillText(b, 270, y); });
  // (5) the route sheet: 512..1024 × 192..512 (a drawn route that goes round the lane)
  x.fillStyle = '#e4ecef'; x.fillRect(512, 192, 512, 320); x.fillStyle = '#1a1a1a'; x.font = 'bold 32px sans-serif'; x.fillText('ROUTE · DRIVER', 536, 236);
  const P = [[600, 300], [700, 300], [800, 360], [900, 470]];
  x.strokeStyle = '#1f6f74'; x.lineWidth = 10; x.lineJoin = 'round'; x.beginPath(); P.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke();
  x.fillStyle = '#1f6f74'; for (const [a, b] of P) { x.beginPath(); x.arc(a, b, 11, 0, 7); x.fill(); }
  x.strokeStyle = '#8a2a1a'; x.lineWidth = 4; x.setLineDash([10, 8]); x.beginPath(); x.moveTo(800, 360); x.lineTo(690, 440); x.stroke(); x.setLineDash([]);
  x.fillStyle = '#8a2a1a'; x.font = 'bold 22px sans-serif'; x.fillText('LANE: GATE SHUT', 560, 470); x.fillText('NO STOP', 560, 496);
  x.strokeStyle = '#8a2a1a'; x.lineWidth = 5; x.beginPath(); x.moveTo(672, 424); x.lineTo(706, 456); x.moveTo(706, 424); x.lineTo(672, 456); x.stroke();
}));
const atlasMat = () => MAT.map(atlasTex(), 0.8);
// a quad showing the atlas's rectangle (pixels), w × h metres
function atlasPlane(w, h, px0, py0, px1, py1) {
  const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const u = uv.getX(i), v = uv.getY(i);
    uv.setXY(i, (px0 + u * (px1 - px0)) / ATLAS_W, 1 - (py1 - v * (py1 - py0)) / ATLAS_H);
  }
  g.userData.keepUV = true;
  return g;
}

// one gate leaf, from its hinge (x = 0) along +x: three rails, upright bars, a brace (one mesh)
function leafGeo() {
  const parts = [], bx = (w, h, d, x, y, z, rz = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rz) g.rotateZ(rz); g.translate(x, y, z); parts.push(g); };
  bx(LEAF, 0.07, 0.06, LEAF / 2, 1.32, 0); bx(LEAF, 0.07, 0.06, LEAF / 2, 0.3, 0); bx(LEAF, 0.05, 0.05, LEAF / 2, 0.82, 0);
  bx(0.07, 1.12, 0.07, 0.04, 0.81, 0); bx(0.07, 1.12, 0.07, LEAF - 0.04, 0.81, 0);
  for (let i = 1; i < 7; i++) bx(0.035, 1.0, 0.035, (LEAF * i) / 7, 0.81, 0);
  const dl = Math.hypot(LEAF - 0.1, 1.0); bx(dl, 0.05, 0.04, LEAF / 2, 0.81, 0, Math.atan2(1.0, LEAF - 0.1));
  // (the bar of the catch at the meeting edge)
  bx(0.14, 0.05, 0.05, LEAF - 0.02, 1.0, 0.05);
  const g = mergeBoxes(parts);
  return g;
}
function mergeBoxes(list) {
  let n = 0, ni = 0; for (const g of list) { n += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = new Uint16Array(ni);
  let vo = 0, io = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3); uv.set(g.attributes.uv.array, vo * 2);
    for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo;
    vo += g.attributes.position.count; io += g.index.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1)); out.computeBoundingSphere();
  return out;
}

export function buildLaneGate(game) {
  const W = game.world, PH = game.physics;
  if (W.laneGate) return W.laneGate;
  const gy = (x, z) => PH.groundAt(x, z);
  const root = new THREE.Group(); root.name = 'lanegate'; W.root.add(root);
  const k = new Kit(root);
  const stone = MAT.stone('sand', 1.4), slate = MAT.stone('slate', 1.2), iron = MAT.iron(), atlas = atlasMat();

  // ---- the posts, their caps, the gate's plate (outside, north face) and the float's cage (inside, on the west post)
  const y0 = Math.max(gy(GATE.x0, GATE.z), gy(GATE.x1, GATE.z));
  for (const x of [GATE.x0, GATE.x1]) {
    const y = gy(x, GATE.z);
    k.add(rbox(POST, 1.55, POST, 0.03), stone, x, y + 0.775, GATE.z);
    k.add(rbox(POST + 0.1, 0.1, POST + 0.1, 0.02), slate, x, y + 1.6, GATE.z);
    for (const hy of [0.45, 1.15]) k.add(new THREE.BoxGeometry(0.08, 0.05, 0.08), iron, x + (x === GATE.x0 ? 1 : -1) * (POST / 2 + 0.02), y + hy, GATE.z);   // (the hinges)
    PH.add({ type: 'box', x, z: GATE.z, hw: POST / 2, hd: POST / 2, top: y + 1.65, noStand: true });
  }
  const yw = gy(GATE.x0, GATE.z);
  k.add(atlasPlane(0.62, 0.155, 0, 0, 512, 128), atlas, GATE.x0, yw + 1.12, GATE.z - POST / 2 - 0.006, Math.PI);
  // the float's cage: four rods on a foot, a cap with the catch's rod up to the post
  const FC = { x: GATE.x0 + 0.02, z: GATE.z + POST / 2 + 0.16 };
  for (const [dx, dz] of [[-0.07, -0.07], [0.07, -0.07], [-0.07, 0.07], [0.07, 0.07]]) k.add(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 5), iron, FC.x + dx, yw + 0.52, FC.z + dz);
  k.add(new THREE.BoxGeometry(0.2, 0.04, 0.2), iron, FC.x, yw + 1.03, FC.z); k.add(new THREE.BoxGeometry(0.2, 0.04, 0.2), iron, FC.x, yw + 0.03, FC.z);
  const float = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), MAT.paint('#c4402e', 0.45)); float.castShadow = true; root.add(float);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 5), iron); root.add(rod);

  // ---- the leaves (each its own pivot at its post's inner face)
  const lg = leafGeo();
  const pivW = new THREE.Group(), pivE = new THREE.Group();
  pivW.position.set(GATE.x0 + POST / 2, y0, GATE.z); pivE.position.set(GATE.x1 - POST / 2, y0, GATE.z);
  for (const p of [pivW, pivE]) { const m = new THREE.Mesh(lg, iron); m.castShadow = true; m.receiveShadow = true; p.add(m); root.add(p); }
  const col = PH.add({ type: 'box', x: GRATE.x, z: GATE.z, hw: (GATE.x1 - GATE.x0) / 2 - POST / 2, hd: 0.08, top: y0 + 1.4, noStand: true, enabled: false });

  // ---- the culvert's grate inside the gate: a stone frame, iron bars, the pit's dark under them, the water over them
  const gyG = Math.max(gy(GRATE.x - GRATE.hw, GRATE.z), gy(GRATE.x + GRATE.hw, GRATE.z), gy(GRATE.x, GRATE.z - GRATE.hd), gy(GRATE.x, GRATE.z + GRATE.hd));
  for (const s of [-1, 1]) {
    k.add(new THREE.BoxGeometry(GRATE.hw * 2 + 0.2, 0.06, 0.1), slate, GRATE.x, gyG + 0.02, GRATE.z + s * (GRATE.hd + 0.05));
    k.add(new THREE.BoxGeometry(0.1, 0.06, GRATE.hd * 2), slate, GRATE.x + s * (GRATE.hw + 0.05), gyG + 0.02, GRATE.z);
  }
  for (let i = 0; i <= 18; i++) k.add(new THREE.BoxGeometry(0.03, 0.03, GRATE.hd * 2), iron, GRATE.x - GRATE.hw + (i * GRATE.hw * 2) / 18, gyG + 0.04, GRATE.z);
  const pit = new THREE.Mesh(new THREE.PlaneGeometry(GRATE.hw * 2, GRATE.hd * 2).rotateX(-Math.PI / 2), MAT.flat('#141a1e', 1)); pit.position.set(GRATE.x, gyG + 0.022, GRATE.z); pit.receiveShadow = true; root.add(pit);
  const waterM = new THREE.MeshStandardMaterial({ color: '#4a7f9c', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.72, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const sheet = new THREE.Mesh(new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2), waterM);
  sheet.scale.set(GRATE.hw + 0.3, 1, GRATE.hd + 0.42); sheet.position.set(GRATE.x, gyG + 0.05, GRATE.z + 0.1); root.add(sheet);

  // ---- the landing: a flagged stop a step up, a bench on its west edge, the sign at its corner by the lane
  const yl = Math.max(gy(LANDING.x - LANDING.hw, LANDING.z - LANDING.hd), gy(LANDING.x + LANDING.hw, LANDING.z + LANDING.hd), gy(LANDING.x, LANDING.z));
  k.add(rbox(LANDING.hw * 2, LANDING.h + 0.25, LANDING.hd * 2, 0.03), slate, LANDING.x, yl + (LANDING.h - 0.25) / 2, LANDING.z);
  PH.add({ type: 'box', x: LANDING.x, z: LANDING.z, hw: LANDING.hw, hd: LANDING.hd, top: yl + LANDING.h });
  const bx = LANDING.x - LANDING.hw + 0.28, ytop = yl + LANDING.h;
  k.add(rbox(0.38, 0.06, 1.9, 0.02), MAT.planks('honey'), bx, ytop + 0.45, LANDING.z);
  for (const dz of [-0.75, 0.75]) k.add(new THREE.BoxGeometry(0.3, 0.42, 0.06), iron, bx, ytop + 0.21, LANDING.z + dz);
  PH.add({ type: 'box', x: bx, z: LANDING.z, hw: 0.2, hd: 0.95, top: ytop + 0.5, noStand: true });
  const sp = { x: LANDING.x + LANDING.hw - 0.12, z: LANDING.z - LANDING.hd + 0.14 };
  k.add(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 6), iron, sp.x, ytop + 0.95, sp.z);
  k.add(atlasPlane(0.62, 0.155, 512, 0, 1024, 128), atlas, sp.x + 0.045, ytop + 1.72, sp.z, Math.PI / 2);
  k.add(atlasPlane(0.62, 0.155, 512, 0, 1024, 128), atlas, sp.x - 0.045, ytop + 1.72, sp.z, -Math.PI / 2);
  PH.add({ type: 'cyl', x: sp.x, z: sp.z, r: 0.08, top: ytop + 1.9, noStand: true, seeThrough: true });
  k.flush();
  // the bundles the lane's people bring (shown while they wait)
  const bundles = new THREE.Group(); bundles.visible = false; root.add(bundles);
  { const B = new Batch(bundles); for (const [dx, dz, a] of [[0.1, -0.9, 0.4], [0.35, -0.2, 2.0], [0.0, 0.6, -0.7], [0.4, 1.15, 1.1]]) addBundle(B, LANDING.x + dx, ytop, LANDING.z + dz, a); B.build(); }
  const spots = [[-48.35, 61.4, Math.PI / 2], [-48.4, 62.3, Math.PI / 2], [-48.3, 63.2, Math.PI / 2], [-48.9, 61.9, Math.PI / 2 + 0.3]].map(([x, z, a]) => ({ x, z, a }));

  // ---- state: the gate open or shut (swung on the world's own clock), the culvert full or drained
  let p = 1, dir = 0, lv = 0, lvDir = 0;
  const poseGate = () => {
    const u = p * p * (3 - 2 * p);
    // (both swing in, toward the landing: the west leaf from +x round to +z, the east one from −x round to +z)
    pivW.rotation.y = -OPEN * u; pivE.rotation.y = Math.PI + OPEN * u;
    col.enabled = p < 0.5;
  };
  const poseWater = () => {
    sheet.visible = lv > 0.02; sheet.scale.set((GRATE.hw + 0.3) * (0.4 + 0.6 * lv), 1, (GRATE.hd + 0.42) * (0.4 + 0.6 * lv)); waterM.opacity = 0.3 + 0.42 * lv;
    float.position.set(FC.x, yw + 0.12 + 0.82 * lv, FC.z); rod.position.set(FC.x, yw + 0.37 + 0.82 * lv, FC.z);
  };
  const L = W.laneGate = {
    root, k,
    gate: {
      x: GRATE.x, z: GATE.z, get open() { return p > 0.5; },
      // (instant: at once; otherwise the leaves swing back over ~1.8 s)
      setOpen(b, instant = false) { if (instant) { p = b ? 1 : 0; dir = 0; poseGate(); } else dir = b ? 1 : -1; },
    },
    culvert: { get full() { return lv > 0.5; }, setFull(b, instant = false) { if (instant) { lv = b ? 1 : 0; lvDir = 0; poseWater(); } else lvDir = b ? 1 : -1; }, x: GRATE.x, z: GRATE.z, y: gyG },
    float: { x: FC.x, z: FC.z },
    landing: { x: LANDING.x, z: LANDING.z, y: ytop, spots, stop: { ...STOP, a: 0 }, bundles, sign: { x: sp.x, z: sp.z } },
    paths: PATHS,
  };
  W.updaters.push((dt) => {
    if (dir) { p = Math.min(1, Math.max(0, p + dir * dt / 1.8)); poseGate(); if (p === 0 || p === 1) dir = 0; }
    if (lvDir) { lv = Math.min(1, Math.max(0, lv + lvDir * dt / 2.4)); poseWater(); if (lv === 0 || lv === 1) lvDir = 0; }
  });
  poseGate(); poseWater();
  L.cart = buildCart(root, game);
  return L;
}

// the notice board at the lighthouse path's stop (chapter 8: the evacuation's); its own group, shown by the story
export function buildLaneBoard(game) {
  const W = game.world, PH = game.physics, L = W.laneGate;
  if (!L || L.board) return L?.board;
  const g = new THREE.Group(); g.visible = false; W.root.add(g);
  const k = new Kit(g), atlas = atlasMat(), wood = MAT.wood('dark');
  const { x, z } = BOARD, y = PH.groundAt(x, z);
  for (const s of [-1, 1]) k.add(new THREE.BoxGeometry(0.1, 2.7, 0.1), wood, x + s * 0.95, y + 0.85, z);   // (down into the slope)
  k.add(rbox(1.9, 1.05, 0.06, 0.02), wood, x, y + 1.42, z - 0.03);
  k.add(rbox(2.1, 0.06, 0.4, 0.02), MAT.stone('slate', 1.2), x, y + 2.22, z);
  k.add(atlasPlane(1.7, 0.21, 512, 128, 1024, 192), atlas, x, y + 1.82, z + 0.006);
  k.add(atlasPlane(0.78, 0.49, 0, 192, 512, 512), atlas, x - 0.42, y + 1.37, z + 0.006);
  k.add(atlasPlane(0.78, 0.49, 512, 192, 1024, 512), atlas, x + 0.42, y + 1.37, z + 0.006);
  k.flush();
  const col = PH.add({ type: 'box', x, z, hw: 1.0, hd: 0.1, top: y + 2.25, noStand: true, enabled: false });
  const at = (dx) => ({ x: x + dx, z, a: Math.PI, front: { x: x + dx, z: z + 1.0 } });
  L.board = { x, z, y, group: g, sched: at(-0.42), route: at(0.42), show(b) { g.visible = !!b; col.enabled = !!b; } };
  return L.board;
}

// ---------------------------------------------------------------- the list cart
function buildCart(parent, game) {
  const grp = new THREE.Group(); grp.visible = false; parent.add(grp);
  const B = new Batch(grp);
  const teal = MAT.paint('#2f6f74', 0.5), iron = MAT.iron(), steel = MAT.steel(), wood = MAT.planks('honey'), hazard = tm('hazard'), dark = MAT.flat('#26262a', 0.9);
  const bx = (m, w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => B.add(new THREE.BoxGeometry(w, h, d), m, x, y, z, rx, ry, rz);
  bx(teal, 1.6, 0.16, 3.5, 0, 0.5, 0);                                  // the chassis and the bed
  for (const s of [-1, 1]) { bx(hazard, 0.03, 0.2, 3.3, s * 0.815, 0.36, 0); bx(teal, 0.06, 0.32, 2.65, s * 0.78, 0.74, -0.38); }   // the skirts, the side rails
  bx(teal, 1.6, 0.32, 0.06, 0, 0.74, -1.72);                             // the tailboard
  for (const s of [-1, 1]) {
    bx(wood, 0.36, 0.06, 2.4, s * 0.55, 1.03, -0.45);                    // the side benches (their tops 0.45 m over the bed)
    for (const z of [-1.5, -0.45, 0.6]) bx(iron, 0.3, 0.42, 0.05, s * 0.55, 0.79, z);
  }
  bx(wood, 1.2, 0.06, 0.38, 0, 1.03, 1.05); bx(wood, 1.2, 0.3, 0.05, 0, 1.24, 0.84); bx(iron, 1.1, 0.42, 0.06, 0, 0.79, 1.05);   // the driver's bench
  bx(teal, 1.5, 0.5, 0.6, 0, 0.83, 1.55); bx(hazard, 1.5, 0.14, 0.04, 0, 0.68, 1.86);   // the bonnet, its striped front
  B.add(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 6), iron, 0, 1.18, 1.3, -0.6);
  B.add(new THREE.TorusGeometry(0.15, 0.022, 6, 16), dark, 0, 1.42, 1.18, -0.6 + Math.PI / 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    B.add(new THREE.CylinderGeometry(0.36, 0.36, 0.2, 16).rotateZ(Math.PI / 2), dark, sx * 0.82, 0.36, sz * 1.15);
    B.add(new THREE.CylinderGeometry(0.12, 0.12, 0.22, 10).rotateZ(Math.PI / 2), steel, sx * 0.83, 0.36, sz * 1.15);
  }
  for (const s of [-1, 1]) B.add(atlasPlane(1.0, 0.125, 0, 128, 512, 192), atlasMat(), s * 0.756, 0.98, 1.55, 0, s * Math.PI / 2, 0);
  B.build();
  const PH = game.physics, _m = new THREE.Matrix4(), _v = new THREE.Vector3();
  const C = {
    group: grp, x: 0, z: 0, a: 0,
    show(b) { grp.visible = !!b; },
    // stand it at (x, z) facing a (0: +z), on the ground (its pitch from the ground under its axles)
    pose(x, z, a) {
      C.x = x; C.z = z; C.a = a;
      const fx = Math.sin(a) * 1.15, fz = Math.cos(a) * 1.15;
      const yf = PH.groundAt(x + fx, z + fz), yb = PH.groundAt(x - fx, z - fz);
      grp.position.set(x, (yf + yb) / 2, z); grp.rotation.set(0, a, 0, 'YXZ'); grp.rotateX(-Math.atan2(yf - yb, 2.3));
      grp.updateMatrixWorld(true);
    },
    local(lx, ly, lz) { _v.set(lx, ly, lz).applyMatrix4(_m.copy(grp.matrixWorld)); return { x: _v.x, y: _v.y, z: _v.z }; },
    seat(i) { const [sx, sz, sa] = SEATS[i % SEATS.length]; return { ...C.local(sx, BED, sz), a: C.a + sa }; },
    driver() { return { ...C.local(0, BED, 1.05), a: C.a }; },
    side() { return C.local(-1.25, 0, -0.4); },   // (where a rider steps up from: beside the west bench)
  };
  return C;
}

// a path's pose at arc length s: { x, z, a, end } (a: the heading along it; near a corner the two legs' headings blend)
export function pathPose(path, s) {
  const segs = [];
  let tot = 0;
  for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); segs.push(l); tot += l; }
  s = Math.max(0, Math.min(tot, s));
  let i = 0, acc = 0;
  while (i < segs.length - 1 && acc + segs[i] < s) { acc += segs[i]; i++; }
  const u = segs[i] > 0 ? (s - acc) / segs[i] : 0, A = path[i], Bp = path[i + 1];
  const head = (k) => Math.atan2(path[k + 1][0] - path[k][0], path[k + 1][1] - path[k][1]);
  let a = head(i);
  const blend = (h0, h1, w) => { const d = Math.atan2(Math.sin(h1 - h0), Math.cos(h1 - h0)); return h0 + d * w; };
  const R = 1.4;
  if (i < segs.length - 1 && segs[i] - (s - acc) < R) a = blend(a, head(i + 1), 0.5 * (1 - (segs[i] - (s - acc)) / R));
  if (i > 0 && s - acc < R) a = blend(head(i - 1), a, 0.5 + 0.5 * ((s - acc) / R));
  return { x: A[0] + (Bp[0] - A[0]) * u, z: A[1] + (Bp[1] - A[1]) * u, a, end: s >= tot - 1e-6, len: tot };
}
