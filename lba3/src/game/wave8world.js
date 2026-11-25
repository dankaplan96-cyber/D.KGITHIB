// WAVE 8 (docs/lba-maturity/WAVE8.md; CONTENT-15H.md §3 H-19, H-20): the pieces in the world. Ours: our own geometry,
// canvas textures and the game's own dog rig (dogs.js, LBA2's Zeelich dog measured, nothing copied); nothing from
// LBA1/LBA2. The story that plays them: story/wave8.js. Every group is named 'wave8 …' (the overlap sweep's filter).
//
//   hatch   (Zeelich's street) a cellar hatch flush with the ground at a house's back wall: a stone frame and two plank
//           leaves; the left leaf lifts. A dog (dogs.js dogRig, brown coat) asleep across its hinge side, nose on its
//           paws, a "z z" over its head; awake, it sits up square on the hatch and watches
//   arch    (the Hamalayi) an old archway at the foot of the cliff below Lhar's terrace, bricked up, its mortar cracked
//           across (a canvas texture); kicked, the bricks lie in a heap at its foot and the dark of old steps shows. On
//           the terrace above: a rusty grate set in the rock, bolted from below (open once the steps were climbed)
//   ledge   (Desert Island, by the ruins) a low flat rock (1.05 m: a jump's reach, above a walker's step) and, a gap
//           away, a rock ledge (2.15 m: out of reach from the ground, in reach from the flat rock's top) with a
//           surveyor's satchel and a red rag on a stick
//   slate   (Citadel) a slate on two legs by the Weather Wizard's tent door: WEATHER WIZARD. QUIET, PLEASE. WALK IN.
//           TALK PLAINLY.
//   papers  (Otringal's market) a stack of news sheets under a stone at one end of an unattended stall's counter
import * as THREE from 'three';
import { MAT, M, rbox, cyl, sphere, canvasTex, plane, Kit } from './props.js';
import { rockGeometry } from './vegetation.js';
import { dogRig } from './dogs.js';

export const W8 = {};

// a group at a world point inside an area's group (the area's own group is offset)
function holder(parent, x, y, z, ry = 0, name = 'wave8') {
  const grp = new THREE.Group(), gp = parent.position; grp.name = name;
  grp.position.set(x - gp.x, y - gp.y, z - gp.z); grp.rotation.y = ry; parent.add(grp);
  return grp;
}
// local (lx, lz) round (x, z) turned by ry → world
export const turn = (x, z, ry, lx, lz) => ({ x: x + lx * Math.cos(ry) + lz * Math.sin(ry), z: z - lx * Math.sin(ry) + lz * Math.cos(ry) });

const slateTex = (key, lines, { w = 256, h = 192, font = 'bold 26px sans-serif', dy = 46 } = {}) => M('w8-' + key, () => canvasTex(w, h, (x, W, H) => {
  x.fillStyle = '#2c3430'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#6a5034'; x.lineWidth = 12; x.strokeRect(0, 0, W, H);
  x.fillStyle = 'rgba(240,236,224,0.9)'; x.font = font; x.textAlign = 'center';
  lines.forEach((l, i) => x.fillText(l, W / 2, 50 + i * dy));
}));
// the bricked arch's infill: courses of brick, the mortar cracked across in a jagged line
const brickTex = () => M('w8-bricks', () => canvasTex(256, 256, (x, W, H) => {
  x.fillStyle = '#8a8076'; x.fillRect(0, 0, W, H);
  const bh = 22, bw = 52;
  for (let r = 0; r * bh < H; r++) for (let c = -1; c * bw < W; c++) {
    const ox = (r % 2) * (bw / 2), v = 150 + ((r * 7 + c * 13) % 5) * 9;
    x.fillStyle = `rgb(${v + 20},${v - 2},${v - 22})`; x.fillRect(c * bw + ox + 2, r * bh + 2, bw - 4, bh - 4);
  }
  x.strokeStyle = '#2a2420'; x.lineWidth = 4; x.beginPath();
  const pts = [[10, 70], [60, 96], [92, 88], [130, 132], [170, 120], [206, 166], [248, 150]];
  pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke();
  x.lineWidth = 2.5; x.beginPath(); x.moveTo(130, 132); x.lineTo(118, 190); x.lineTo(132, 236); x.stroke();
  x.beginPath(); x.moveTo(92, 88); x.lineTo(100, 40); x.stroke();
}));
const zzzTex = () => M('w8-zzz', () => canvasTex(64, 64, (x) => {
  x.font = 'bold 26px sans-serif'; x.lineWidth = 5; x.strokeStyle = '#1a1a2a'; x.fillStyle = '#e8f0ff';
  for (const [s, a, b] of [['z', 14, 50], ['z', 30, 34], ['Z', 44, 18]]) { x.strokeText(s, a, b); x.fillText(s, a, b); }
}));

// ---------------------------------------------------------------- the cellar hatch and its dog (Zeelich)
// Local frame: origin on the ground at the hatch's middle, -z toward the house's back wall, +z out. The hatch is
// 1.1 m wide (x) and 0.8 m deep; the left leaf (-x) lifts; the dog lies across the right (+x) half, its body along z.
export const HATCH = { w: 1.1, d: 0.8, leaf: { lx: -0.3, lz: 0.2 }, dog: { lx: 0.62, lz: 0.05 } };
export function buildHatch(parent, physics, x, y, z, ry) {
  if (W8.hatch) return W8.hatch;
  const grp = holder(parent, x, y, z, ry, 'wave8 hatch'), k = new Kit(grp);
  const stone = MAT.stone('grey', 1), wood = MAT.wood('dark'), iron = MAT.iron();
  const H = HATCH;
  // the stone frame round the opening (flush: 3 cm proud of the paving)
  for (const s of [-1, 1]) k.add(rbox(0.12, 0.03, H.d + 0.24, 0.01), stone, s * (H.w / 2 + 0.06), 0.015, 0);
  for (const s of [-1, 1]) k.add(rbox(H.w, 0.03, 0.12, 0.01), stone, 0, 0.015, s * (H.d / 2 + 0.06));
  // the fixed right leaf, and the lifting left leaf on its hinge (the -x edge)
  k.add(rbox(H.w / 2 - 0.02, 0.035, H.d, 0.01), wood, H.w / 4, 0.02, 0);
  for (const s of [-0.25, 0.25]) k.add(rbox(H.w / 2 - 0.06, 0.012, 0.05, 0.004), iron, H.w / 4, 0.042, s);
  k.flush();
  const hinge = new THREE.Group(); hinge.position.set(-H.w / 2 + 0.01, 0.02, 0); grp.add(hinge);
  const leaf = new THREE.Mesh(rbox(H.w / 2 - 0.02, 0.035, H.d, 0.01), wood); leaf.position.set(H.w / 4 - 0.01, 0, 0); leaf.castShadow = true; hinge.add(leaf);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 5, 10), iron); ring.rotation.x = Math.PI / 2; ring.position.set(H.w / 2 - 0.12, 0.025, 0); hinge.add(ring);
  const dark = new THREE.Mesh(plane(H.w / 2 - 0.04, H.d - 0.04), MAT.flat('#0b0a09', 1)); dark.rotation.x = -Math.PI / 2; dark.position.set(-H.w / 4, 0.004, 0); dark.visible = false; grp.add(dark);
  // the dog: the game's Zeelich dog rig (brown coat), its body along the hatch's depth, nose toward +z
  const rig = dogRig('brown'); rig.root.name = 'wave8 dog';
  const dp = turn(0, 0, 0, H.dog.lx, H.dog.lz); rig.root.position.set(dp.x, 0, dp.z); grp.add(rig.root);
  const zzz = new THREE.Sprite(new THREE.SpriteMaterial({ map: zzzTex(), transparent: true, depthWrite: false, fog: false }));
  zzz.scale.setScalar(0.5); zzz.position.set(H.dog.lx + 0.1, 1.05, H.dog.lz + 0.5); zzz.name = 'wave8 zzz'; grp.add(zzz);
  // (the dog's body: he never walks into it — a low block, never stood on)
  const dw = turn(x, z, ry, H.dog.lx, H.dog.lz);
  const col = physics.add({ type: 'box', x: dw.x, z: dw.z, hw: 0.32, hd: 0.62, rot: ry, top: y + 0.55, block: true });
  const S = {
    grp, rig, hinge, dark, zzz, col, x, y, z, ry,
    dog: { x: dw.x, z: dw.z },
    leafAt: turn(x, z, ry, H.leaf.lx, H.leaf.lz),
    // (the "mark" actor for noticemark.js: its "?" and "!" over the dog's head)
    mark: { pos: new THREE.Vector3(dw.x, y, dw.z), game: null, alive: true, present: true },
    state: 'sleep', t: 0,
    setOpen(u) { hinge.rotation.z = -1.9 * u; dark.visible = u > 0.05; },
    pose(st, dt, t) {
      // asleep: lying, legs folded under, head down on the paws, a slow breath; awake: sitting up, head raised, watching
      const M0 = rig.M;
      if (st === 'sleep') {
        rig.play('idle'); rig.wag = 0; rig.update(dt, 0, -0.2);
        M0.legs.forEach((l, i) => { l.rotation.x = i < 2 ? -1.35 : 1.35; });
        M0.body.position.y = -0.2 + Math.sin(t * 1.6) * 0.008;
        M0.body.rotation.x = 0.04; M0.head.rotation.x = 0.32;
        if (M0.jaw) M0.jaw.rotation.x = 0.02;
        M0.tail.rotation.y = 0;
      } else {
        rig.play('warn'); rig.wag = 0.05; rig.update(dt, 0, 0);
        M0.legs.forEach((l, i) => { if (i >= 2) l.rotation.x = 1.1; });
        M0.body.rotation.x = 0.35; M0.body.position.y = -0.06;
      }
      zzz.visible = st === 'sleep';
      if (zzz.visible) { zzz.position.y = 0.95 + (t * 0.25 % 0.3); zzz.material.opacity = 1 - (t * 0.25 % 0.3) / 0.3 * 0.7; }
    },
  };
  S.pose('sleep', 0, 0);
  W8.hatch = S;
  return S;
}

// ---------------------------------------------------------------- the bricked arch and the grate (Citadel)
// Local frame (the arch): origin on the ground at the arch's foot, its face toward +z (the arch stands against the cliff
// at -z). 1.3 m wide opening, 2.1 m high; the piers 0.35 wide. The grate: origin on the shelf's ground, flush.
export const ARCH = { w: 1.3, h: 2.1, pier: 0.35, d: 0.6 };
export function buildArch(parent, physics, foot, top) {
  if (W8.arch) return W8.arch;
  const A = ARCH, ry = foot.ry;
  const grp = holder(parent, foot.x, foot.y, foot.z, ry, 'wave8 arch'), k = new Kit(grp);
  const stone = MAT.stone('grey', 1), dark = MAT.flat('#0d0c0b', 1);
  const hw = A.w / 2;
  for (const s of [-1, 1]) k.add(rbox(A.pier, A.h, A.d, 0.03), stone, s * (hw + A.pier / 2), A.h / 2, -A.d / 2);
  k.add(rbox(A.w + 2 * A.pier + 0.1, 0.36, A.d + 0.06, 0.03), stone, 0, A.h + 0.18, -A.d / 2);
  // the dark of the passage and two old steps going up into it
  k.add(rbox(A.w, A.h, 0.05, 0.01), dark, 0, A.h / 2, -A.d + 0.03);
  for (let i = 0; i < 2; i++) k.add(rbox(A.w - 0.04, 0.18, 0.28, 0.02), stone, 0, 0.09 + i * 0.18, -A.d + 0.2 + (1 - i) * 0.28);
  k.flush();
  // the bricked infill (cracked), and the heap it makes once kicked in
  const wall = new THREE.Mesh(rbox(A.w, A.h, 0.2, 0.01), MAT.map(brickTex(), 0.95)); wall.position.set(0, A.h / 2, -0.14); wall.castShadow = true; grp.add(wall);
  const heap = new THREE.Group(); heap.name = 'wave8 heap'; grp.add(heap);
  const hk = new Kit(heap), brick = MAT.flat('#a88a74', 0.95);
  for (let i = 0; i < 14; i++) { const a = i * 2.39, r = 0.12 + (i % 5) * 0.09; hk.add(rbox(0.22, 0.08, 0.11, 0.01), brick, Math.sin(a) * r * 1.6, 0.04 + (i % 3) * 0.06, 0.25 + Math.cos(a) * r * 0.7, a); }
  hk.flush(); heap.visible = false;
  // colliders: the two piers, and the infill (off once kicked in: the doorway itself is never walked into, its prompt
  // climbs the steps)
  const wf = (lx, lz) => turn(foot.x, foot.z, ry, lx, lz);
  for (const s of [-1, 1]) { const p = wf(s * (hw + A.pier / 2), -A.d / 2); physics.add({ type: 'box', ...p, hw: A.pier / 2, hd: A.d / 2, rot: ry, top: foot.y + A.h + 0.36, noStand: true }); }
  const plug = physics.add({ type: 'box', ...wf(0, -A.d / 2), hw: hw, hd: A.d / 2, rot: ry, top: foot.y + A.h, noStand: true });
  // the grate on the shelf above
  const gg = holder(parent, top.x, top.y, top.z, top.ry, 'wave8 grate'), gk = new Kit(gg), iron = MAT.iron();
  gk.add(rbox(1.0, 0.03, 0.8, 0.01), MAT.flat('#0d0c0b', 1), 0, 0.005, 0);
  for (const s of [-1, 1]) gk.add(rbox(0.08, 0.04, 0.88, 0.01), MAT.stone('grey', 1), s * 0.54, 0.02, 0);
  for (const s of [-1, 1]) gk.add(rbox(1.16, 0.04, 0.08, 0.01), MAT.stone('grey', 1), 0, 0.02, s * 0.44);
  gk.flush();
  const bars = new THREE.Group(); gg.add(bars);
  const bk = new Kit(bars), rust = MAT.flat('#6a4630', 0.8, { metalness: 0.3 });
  for (let i = -3; i <= 3; i++) bk.add(rbox(0.035, 0.03, 0.8, 0.005), rust, i * 0.14, 0.05, 0);
  for (const s of [-1, 1]) bk.add(rbox(1.0, 0.03, 0.04, 0.005), rust, 0, 0.05, s * 0.3);
  bk.flush();
  const S = {
    grp, gg, wall, heap, bars, plug, foot, top,
    door: wf(0, 0.55), up: { ...wf(0, 1.2), a: ry },   // the doorway's prompt spot; where he stands back down at the foot
    grate: { x: top.x, z: top.z }, out: { ...turn(top.x, top.z, top.ry, 0, 1.2), a: top.ry },   // where he comes out above
    setOpen(on) { wall.visible = !on; heap.visible = !!on; plug.enabled = !on; },
    setGrate(open) { bars.rotation.x = open ? -0.25 : 0; bars.position.y = open ? 0.06 : 0; },
  };
  S.setOpen(false); S.setGrate(false);
  W8.arch = S;
  return S;
}

// ---------------------------------------------------------------- the ledge with a gap (Desert Island)
// Local frame: origin on the ground at the flat rock's middle; the ledge stands at +z, GAP m from rock edge to rock edge.
export const LEDGE = { low: 1.05, high: 2.15, rLow: 1.1, rHigh: 0.85, gap: 2.0 };
export function buildLedge(parent, physics, x, y, z, ry, { color = '#b89474', seed = 61 } = {}) {
  if (W8.ledge) return W8.ledge;
  const L = LEDGE, grp = holder(parent, x, y, z, ry, 'wave8 ledge'), k = new Kit(grp);
  const rockM = MAT.flat(color, 0.92, { vertexColors: true }), capM = MAT.flat(color, 0.95);
  const hz = L.rLow + L.gap + L.rHigh;   // the ledge's middle along +z
  // the flat rock: one wide rock and a flat cap
  k.add(rockGeometry(seed), rockM, 0, 0.3, 0, 0, { sx: 1.5, sy: 0.8, sz: 1.4 });
  k.add(rbox(L.rLow * 1.9, 0.18, L.rLow * 1.8, 0.07), capM, 0, L.low - 0.09, 0, 0.2);
  // the ledge: three rocks, narrowing up, a cap to stand on
  k.add(rockGeometry(seed + 1), rockM, 0, 0.4, hz, 0.5, { sx: 1.25, sy: 1.25, sz: 1.15 });
  k.add(rockGeometry(seed + 2), rockM, 0.05, 1.3, hz - 0.05, 1.7, { sx: 0.95, sy: 0.95, sz: 0.9 });
  k.add(rbox(L.rHigh * 1.9, 0.2, L.rHigh * 1.8, 0.08), capM, 0, L.high - 0.1, hz, -0.15);
  // the rag on a stick (it stays: the ledge's mark)
  k.add(cyl(0.02, 0.025, 1.3, 5), MAT.wood('dark'), -0.3, L.high + 0.65, hz + 0.2, 0, { rx: 0.12 });
  k.flush();
  const rag = new THREE.Mesh(plane(0.32, 0.22), MAT.flat('#d83a2a', 0.8, { side: THREE.DoubleSide })); rag.position.set(-0.15, L.high + 1.15, hz + 0.27); rag.castShadow = true; grp.add(rag);
  // the satchel (gone once taken): its own small group
  const sat = new THREE.Group(); sat.name = 'wave8 satchel'; sat.position.set(0.25, L.high, hz - 0.15); sat.rotation.y = 0.4; grp.add(sat);
  const sk = new Kit(sat);
  sk.add(rbox(0.36, 0.22, 0.16, 0.05), MAT.flat('#7a5a3a', 0.85), 0, 0.11, 0);
  sk.add(rbox(0.3, 0.05, 0.17, 0.02), MAT.flat('#6a4a2e', 0.85), 0, 0.245, 0);
  sk.flush();
  const low = turn(x, z, ry, 0, 0), high = turn(x, z, ry, 0, hz);
  physics.add({ type: 'cyl', ...low, r: L.rLow, top: y + L.low });
  physics.add({ type: 'cyl', ...high, r: L.rHigh, top: y + L.high });
  const S = { grp, rag, sat, x, y, z, ry, low: { ...low, top: y + L.low }, high: { ...high, top: y + L.high }, bagAt: turn(x, z, ry, 0.25, hz - 0.15),
    setTaken(on) { sat.visible = !on; },
  };
  W8.ledge = S;
  return S;
}

// ---------------------------------------------------------------- the hall's slate (the Hamalayi)
export function buildSlate(parent, x, y, z, ry) {
  if (W8.slate) return W8.slate;
  const grp = holder(parent, x, y, z, ry, 'wave8 slate'), k = new Kit(grp), wood = MAT.wood('dark');
  for (const s of [-1, 1]) k.add(rbox(0.06, 1.2, 0.06, 0.01), wood, s * 0.36, 0.6, -0.05, 0, { rx: 0.12 });
  k.add(rbox(0.04, 1.0, 0.04, 0.01), wood, 0, 0.5, 0.24, 0, { rx: -0.35 });
  k.add(rbox(0.84, 0.64, 0.04, 0.01), wood, 0, 0.98, -0.02, 0, { rx: 0.12 });
  k.flush();
  const face = new THREE.Mesh(plane(0.76, 0.56), MAT.map(slateTex('slate', ['WEATHER WIZARD', 'QUIET, PLEASE', 'WALK IN.', 'TALK PLAINLY.'], { dy: 38, font: 'bold 24px sans-serif' }), 0.95));
  face.position.set(0, 0.98, 0.005); face.rotation.x = -0.12; grp.add(face);
  W8.slate = { grp, x, z, y };
  return W8.slate;
}

// ---------------------------------------------------------------- news sheets on a stall's counter (Otringal)
// (the stall's own frame: props-esmer.js stall — its counter top at 0.935 m, from x -1.65 to 1.65, its front at +z;
//  the goods end at x 1.2, the canopy's posts stand at x ±1.5, z ±0.8)
export function buildPapers(parent, x, y, z, ry) {
  if (W8.papers) return W8.papers;
  const grp = holder(parent, x, y, z, ry, 'wave8 papers'), k = new Kit(grp);
  const paper = MAT.flat('#ece6d6', 0.95), ink = MAT.flat('#3a3632', 0.9);
  for (let i = 0; i < 6; i++) k.add(rbox(0.26, 0.008, 0.19, 0.002), paper, 1.35 + (i % 2) * 0.008, 0.94 + i * 0.008, 0.55, (i % 3) * 0.04);
  k.add(rbox(0.16, 0.004, 0.03, 0.001), ink, 1.35, 0.94 + 6 * 0.008 + 0.002, 0.49, 0.08);
  k.add(sphere(0.05, 7, 5), MAT.stone('grey', 1), 1.38, 0.94 + 6 * 0.008 + 0.035, 0.57, 0, { sy: 0.7 });
  k.flush();
  W8.papers = { grp, x, z };
  return W8.papers;
}
