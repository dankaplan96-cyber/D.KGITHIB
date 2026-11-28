// W-3: the Water Gardens' two rooms (gardens.js builds them with the region), in the game's cut-away interiors
// (RoomBuilder: two far walls, low near rims, the fixed room camera):
//   bl_tunnel  the service tunnel under the splitter house: brick and old pipework, down a ladder from the hatch. Along
//              its back wall: the old main from the aqueduct; the splitter board (three gates in bronze grooves, G1 the
//              gardens, G2 the kiln, G3 the overflow, each shut, half or open, a pictogram under each: sprouts, a flame,
//              waves); G1's hand-wheel in front of it (G2 and G3 are worked by their latches outside); the seized bypass
//              valve (rust over its wheel and spindle); and the unrecorded tap: a newer copper pipe bodged onto the main
//              with clamps and rag, off through the east wall toward the kiln, a brass tap on it.
//   bl_kiln    Corvin's glazing workshop: the water wheel's axle comes through the back wall into a big wooden gear, a
//              shaft and belt to the potter's wheel, a crank to the bellows; the kiln (a brick dome) in the corner, its
//              mouth glowing when it runs; racks of glazed floats on the wall; the glazing table with its buckets.
//
// CONTRACT (world coordinates)
//   buildGardenRooms(scene, physics) → { rooms: { bl_tunnel, bl_kiln }, tunnel: { setGates({1, 2, 3} 0..2),
//     setTap(open, instant), setBypass(free, instant) }, kiln: { setRunning(b), turn(speed 0..1, dt) } }
//   GROOMS (filled when built): tunnel { spawn, door, tap, bypass, gate1 {x, z, r} }, kiln { spawn, door, corvin {x, z, a} }
//   bl_house   (EXP-3, chapter 12) the House of Balances' front hall over the causeway: the counter under the great
//              balance beam, the order book on its stand, the test bench (a Balance Works coil, a knock lever, a needle,
//              an empty regulator saddle with its test card), the project's crates, the brass SOLD cabinet.
//   house: { knock() (the hammer strikes, the needle leaps and settles), setHeld(b) (the crates chalked HELD),
//     setCabinet(open, instant) } · GROOMS.house { spawn, door, fennick {x, z, a}, book, bench, crates, cabinet {x, z, r} }
//   Each room's R.exits[0] is its way back to 'bl_gardens' (the region's R.entries puts him by the hatch or the door).
import * as THREE from 'three';
import { RoomBuilder } from '../interiors.js';
import { MAT, M, rbox, plane, cyl, sphere, lathe, torus, canvasTex, crate, barrel } from '../props.js';
import { BALLASTRA_AT } from './common.js';

export const GROOMS = { tunnel: {}, kiln: {}, house: {} };

const flat = (c, r = 0.6) => MAT.flat(c, r);
const celadon = () => MAT.flat('#9cc8b4', 0.3, { metalness: 0.05 });
const celadonDeep = () => MAT.flat('#5f9a86', 0.32, { metalness: 0.05 });
const cobalt = () => MAT.flat('#3f6c9c', 0.3, { metalness: 0.05 });
const bronze = () => MAT.flat('#b07a3a', 0.42, { metalness: 0.6 });
const rust = () => MAT.flat('#8a4a2a', 0.95);

// the splitter board's pictograms (no words): G1 the gardens (three sprouts), G2 the kiln (a flame), G3 the overflow (waves)
const boardTex = () => M('bl_w3boardT', () => canvasTex(384, 128, (x, w, h) => {
  x.fillStyle = '#d6a85a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#5a3a1a'; x.lineWidth = 5;
  const cell = (i, fn) => { x.save(); x.translate(i * 128 + 64, 64); x.strokeRect(-54, -50, 108, 100); fn(); x.restore(); };
  cell(0, () => { for (let k = -1; k <= 1; k++) { x.beginPath(); x.moveTo(k * 26, 30); x.lineTo(k * 26, -6); x.stroke(); x.beginPath(); x.ellipse(k * 26 - 9, -12, 10, 5, -0.5, 0, 7); x.stroke(); x.beginPath(); x.ellipse(k * 26 + 9, -16, 10, 5, 0.5, 0, 7); x.stroke(); } x.beginPath(); x.moveTo(-44, 32); x.lineTo(44, 32); x.stroke(); });
  cell(1, () => { x.beginPath(); x.moveTo(0, -36); x.quadraticCurveTo(26, -4, 14, 22); x.quadraticCurveTo(0, 34, -14, 22); x.quadraticCurveTo(-26, -4, 0, -36); x.stroke(); x.beginPath(); x.moveTo(-30, 34); x.lineTo(30, 34); x.stroke(); });
  cell(2, () => { for (let k = 0; k < 3; k++) { x.beginPath(); for (let i = 0; i <= 8; i++) { const px = -40 + i * 10, py = -20 + k * 20 + (i % 2 ? -6 : 6); if (i) x.lineTo(px, py); else x.moveTo(px, py); } x.stroke(); } });
}));

// ------------------------------------------------------------------ the service tunnel
function buildTunnel(scene, physics) {
  const { x: CX, z: CZ } = BALLASTRA_AT.bl_tunnel, Wd = 15, D = 5, H = 3.4;
  const B = new RoomBuilder(scene, physics, 'bl_tunnel', CX, CZ), R = B.room, k = B.k;
  R.view = 11.5; R.follow = 0.35; R.music = 'workshop'; R.surface = 'stone';
  const brick = MAT.tiles('#b47a5a', '#a46a4c', '#5e4636', false, 8);
  B.shell({ W: Wd, D, H, t: 0.5, floor: MAT.stone('slate', 1.2), slab: MAT.stone('sand'), body: brick, low: MAT.stone('sand', 1.4), dado: 0.6, rail: MAT.stone('sand', 1),
    cap: MAT.stone('sand', 1), rimH: 0.5, rimMat: MAT.stone('sand'), beam: MAT.stone('sand', 1), posts: MAT.stone('sand', 1), postsAt: (L) => [L * 0.33, L * 0.66] });
  const BZ = -D / 2, LX = -Wd / 2 + 0.9;
  // the ladder up to the hatch (against the back wall at the west end), the hatch's square of daylight over it
  for (const s of [-1, 1]) k.add(rbox(0.07, H + 0.4, 0.07, 0.01), MAT.iron(), LX + s * 0.3, (H + 0.4) / 2, BZ + 0.3);
  for (let i = 0; i < 9; i++) k.add(cyl(0.025, 0.025, 0.6, 6), MAT.iron(), LX, 0.3 + i * 0.36, BZ + 0.3, 0, { rz: Math.PI / 2 });
  k.add(rbox(1.3, 0.12, 1.3, 0.02), MAT.stone('sand', 1), LX, H + 0.066, BZ + 0.6);   // (FLICKER-142: 6 mm over the wall's cap)
  k.add(plane(1.0, 1.0), MAT.glow('#e8f4f0', '#cfe8e4', 0.9), LX, H + 0.136, BZ + 0.6, 0, { rx: -Math.PI / 2 });
  B.col(LX, BZ + 0.3, 0.4, 0.15, H, { block: true });
  R.exits.push({ ...B.world(LX, BZ + 0.95), r: 0.55, room: 'bl_gardens' });
  R.spawn = { ...B.world(LX + 1.5, BZ + 2.0), a: Math.PI / 2 };
  R.entries = { bl_gardens: R.spawn };
  // the old main along the back wall, glazed and bronze-banded, out of the west wall (from the aqueduct) to the east
  k.add(cyl(0.3, 0.3, Wd, 16), celadonDeep(), 0, H - 0.75, BZ + 0.45, 0, { rz: Math.PI / 2 });
  for (let i = 0; i < 7; i++) k.add(torus(0.32, 0.04, 5, 16), bronze(), -Wd / 2 + 1.2 + i * 2.1, H - 0.75, BZ + 0.45, Math.PI / 2);
  for (const x of [-5.4, 1.5, 6.6]) k.add(rbox(0.3, H - 0.75, 0.3, 0.02), MAT.stone('sand', 1), x, (H - 0.75) / 2 - 0.15, BZ + 0.25);
  // the splitter board: a stone slab in a bronze frame, three gates in grooves, the pictograms under them, the down pipes
  const BX = -0.2, slots = [-1.1, 0, 1.1];
  k.add(rbox(3.8, 2.6, 0.3, 0.03), MAT.stone('slate', 1), BX, 1.35, BZ + 0.2);
  for (const s of [-1, 1]) k.add(rbox(0.1, 2.7, 0.14, 0.01), bronze(), BX + s * 1.9, 1.35, BZ + 0.38);
  k.add(rbox(3.9, 0.12, 0.16, 0.01), bronze(), BX, 2.68, BZ + 0.38); k.add(rbox(3.9, 0.12, 0.16, 0.01), bronze(), BX, 0.04, BZ + 0.38);
  k.add(plane(3.3, 1.1), MAT.map(boardTex(), 0.45, { metalness: 0.5 }), BX, 0.62, BZ + 0.37);
  const leaves = slots.map((sx, i) => {
    for (const s of [-1, 1]) k.add(rbox(0.06, 1.3, 0.1, 0.01), bronze(), BX + sx + s * 0.38, 1.85, BZ + 0.4);
    k.add(plane(0.66, 1.2), flat('#1c2226', 0.9), BX + sx, 1.85, BZ + 0.36);
    k.add(cyl(0.11, 0.11, 0.6, 10), MAT.copper(), BX + sx, H - 0.38, BZ + 0.45);
    for (let n = 0; n < 3; n++) k.add(sphere(0.045, 8, 6), MAT.glow(['#e6b866', '#5f9a86', '#3f6c9c'][n], ['#7a5010', '#1a4a3a', '#10284a'][n], 0.4), BX + sx + 0.48, 1.4 + n * 0.45, BZ + 0.42);
    const leaf = k.pivot(BX + sx, 1.3, BZ + 0.44, 0);
    const lm = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.5, 0.06), MAT.wood('dark')); lm.castShadow = true; leaf.add(lm);
    const lb = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.06, 0.08), bronze()); lb.position.y = 0.2; leaf.add(lb);
    const ptr = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 4), MAT.paint('#c8443a', 0.4)); ptr.rotation.z = Math.PI / 2; ptr.position.set(0.4, 0, 0.02); leaf.add(ptr);
    void i; return leaf;
  });
  B.col(BX, BZ + 0.3, 1.95, 0.25, 2.7, { block: true });
  // G1's hand-wheel on its spindle in front of the first slot
  k.add(cyl(0.04, 0.04, 0.5, 6), MAT.iron(), BX + slots[0], 1.15, BZ + 0.65, 0, { rx: Math.PI / 2 });
  const g1wheel = k.pivot(BX + slots[0], 1.15, BZ + 0.9, 0);
  { const w = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.035, 6, 20), bronze()); g1wheel.add(w); for (let i = 0; i < 3; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.035, 0.035), bronze()); sp.rotation.z = (i * Math.PI) / 3; g1wheel.add(sp); } }
  B.col(BX + slots[0], BZ + 0.8, 0.32, 0.12, 1.45, { block: true });
  // the bypass: a loop of older iron pipe from the main down past the board, its big valve seized with rust
  const VX = -3.8;
  k.add(cyl(0.16, 0.16, 1.8, 10), MAT.iron(), VX - 0.6, H - 1.65, BZ + 0.45);
  k.add(cyl(0.16, 0.16, 1.2, 10), MAT.iron(), VX, 0.95, BZ + 0.45, 0, { rz: Math.PI / 2 });
  k.add(cyl(0.16, 0.16, 0.9, 10), MAT.iron(), VX + 0.6, 0.5, BZ + 0.45);
  k.add(lathe([[0.001, -0.35], [0.28, -0.3], [0.32, 0], [0.28, 0.3], [0.001, 0.35]], 12), MAT.iron(), VX, 0.95, BZ + 0.45, 0, { rx: Math.PI / 2 });
  k.add(cyl(0.05, 0.05, 0.6, 6), MAT.iron(), VX, 0.95, BZ + 0.85, 0, { rx: Math.PI / 2 });
  const bvWheel = k.pivot(VX, 0.95, BZ + 1.12, 0);
  { const w = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.045, 6, 22), MAT.iron()); bvWheel.add(w); for (let i = 0; i < 2; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 0.05), MAT.iron()); sp.rotation.z = (i * Math.PI) / 2; bvWheel.add(sp); } }
  const crust = new THREE.Group(); crust.name = 'bl_bypassRust'; R.group.add(crust);
  { const r = (s) => { const x = Math.sin(s * 12.9898) * 43758.5453; return x - Math.floor(x); };
    for (let i = 0; i < 16; i++) { const a = r(i) * Math.PI * 2, rr = 0.18 + r(i + 40) * 0.2; const m = new THREE.Mesh(new THREE.SphereGeometry(0.05 + r(i + 7) * 0.05, 6, 4), rust()); m.position.set(VX + Math.cos(a) * rr, 0.95 + Math.sin(a) * rr, BZ + 1.1 + r(i + 3) * 0.08); m.scale.set(1.3, 0.8, 0.6); crust.add(m); }
    const drip = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.02), rust()); drip.position.set(VX, 0.35, BZ + 0.62); crust.add(drip);
    const chainM = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 4, 16), rust()); chainM.position.set(VX, 0.95, BZ + 1.18); chainM.rotation.z = 0.6; crust.add(chainM); }
  B.col(VX, BZ + 0.75, 0.45, 0.45, 1.5, { block: true });
  // the unrecorded tap: bright copper bodged onto the main, clamps and rag at the joint, off through the east wall
  const TX = 4.4;
  k.add(cyl(0.11, 0.11, 0.9, 10), MAT.copper(), TX - 0.6, H - 1.2, BZ + 0.75);
  k.add(cyl(0.11, 0.11, 1.4, 10), MAT.copper(), TX + 0.1, H - 1.65, BZ + 0.75, 0, { rz: Math.PI / 2 });
  k.add(cyl(0.11, 0.11, 1.3, 10), MAT.copper(), TX + 0.8, 1.2, BZ + 0.75);
  k.add(cyl(0.11, 0.11, Wd / 2 - TX - 0.8, 10), MAT.copper(), (TX + 0.8 + Wd / 2) / 2, 0.55, BZ + 0.75, 0, { rz: Math.PI / 2 });
  for (const [x, y, rz] of [[TX - 0.6, H - 0.85, 0], [TX - 0.6, H - 1.5, 0], [TX + 0.8, 1.6, 0], [TX + 2.0, 0.55, Math.PI / 2]]) k.add(torus(0.13, 0.03, 5, 12), MAT.iron(), x, y, BZ + 0.75, 0, { rx: Math.PI / 2, rz });
  k.add(cyl(0.2, 0.2, 0.35, 10), MAT.cloth('#c8b894', '#a89474'), TX - 0.6, H - 1.0, BZ + 0.75);
  k.add(cyl(0.06, 0.06, 0.4, 6), MAT.iron(), TX - 0.6, H - 0.95, BZ + 0.55, 0, { rx: Math.PI / 2 });   // (the bodge's strap round the main)
  k.add(lathe([[0.001, -0.12], [0.14, -0.1], [0.16, 0], [0.14, 0.1], [0.001, 0.12]], 10), MAT.brass(), TX + 0.8, 1.2, BZ + 0.75);
  const tapH = k.pivot(TX + 0.8, 1.2, BZ + 0.95, 0);
  { const h = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.06), MAT.brass()); h.position.x = 0.12; tapH.add(h); const kn = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), MAT.paint('#c8443a', 0.4)); kn.position.x = 0.32; tapH.add(kn); }
  const trickle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.6, 0.03), MAT.glass('#cfeef0', 0.55)); trickle.position.set(TX + 2.4, 0.3, BZ + 0.75); trickle.name = 'bl_tapTrickle'; R.group.add(trickle);
  B.col(TX + 0.4, BZ + 0.7, 1.4, 0.25, 2.2, { block: true });
  // old parts on the floor: a crate, a coil of rope, a lamp
  B.put(6.4, 1.2, 0.3, (kk) => crate(kk, 0.6, { pal: 'grey' })); B.put(-6.2, 1.6, -0.2, (kk) => barrel(kk, { r: 0.3, pal: 'grey' }));
  for (const [x, z] of [[-2.6, BZ + 0.15], [2.6, BZ + 0.15]]) k.add(sphere(0.13, 10, 8), MAT.glow('#fff2cc', '#ffc070', 1.4), x, 2.4, z);
  B.light('#ffe2b0', 4.5, 10, -2.6, 2.4, BZ + 1.2);
  B.light('#ffe2b0', 4.0, 10, 2.8, 2.4, BZ + 1.2);
  B.light('#dff0ee', 2.6, 6, LX, H - 0.4, BZ + 0.8);
  // state
  const S = { gates: { 1: 0, 2: 2, 3: 0 }, tap: true, tapA: 1, free: false, freeA: 0 };
  const place = () => {
    leaves.forEach((l, i) => { l.position.y = 1.3 + S.gates[i + 1] * 0.5; });
    tapH.rotation.z = S.tapA * Math.PI / 2; trickle.visible = S.tapA > 0.5;
    crust.visible = S.freeA < 0.5; bvWheel.rotation.z = S.freeA * Math.PI * 1.5;
  };
  R.updaters.push((dt) => {
    let ch = false;
    const tt = S.tap ? 1 : 0; if (S.tapA !== tt) { S.tapA = tt > S.tapA ? Math.min(1, S.tapA + dt * 2) : Math.max(0, S.tapA - dt * 2); ch = true; }
    const ft = S.free ? 1 : 0; if (S.freeA !== ft) { S.freeA = ft > S.freeA ? Math.min(1, S.freeA + dt / 1.5) : Math.max(0, S.freeA - dt / 1.5); ch = true; }
    if (ch) place();
  });
  const sfx = (n) => { const G = globalThis.game; if (G?.room === R && G.state === 'play') G.audio?.play?.(n); };
  let g1 = 0;
  const ctl = {
    setGates(a) { const d = a[1] - g1; g1 = a[1]; S.gates = { 1: a[1], 2: a[2], 3: a[3] }; g1wheel.rotation.z -= d * 3; place(); },
    setTap(open, instant) { S.tap = !!open; if (instant) S.tapA = S.tap ? 1 : 0; else sfx('clunk'); place(); },
    setBypass(free, instant) { S.free = !!free; if (instant) S.freeA = S.free ? 1 : 0; else sfx(S.free ? 'grind' : 'clunk'); place(); },
  };
  place();
  Object.assign(GROOMS.tunnel, {
    door: B.world(LX, BZ + 0.95), spawn: R.spawn,
    gate1: { ...B.world(BX + slots[0], BZ + 1.5), r: 0.8 }, bypass: { ...B.world(VX, BZ + 1.75), r: 0.8 }, tap: { ...B.world(TX + 0.8, BZ + 1.5), r: 0.8 },
  });
  return { R: B.finish(), ctl };
}

// ------------------------------------------------------------------ Corvin's kiln
function buildKiln(scene, physics) {
  const { x: CX, z: CZ } = BALLASTRA_AT.bl_kiln, Wd = 11, D = 7, H = 4.2, DOOR_Z = 1.8;
  const B = new RoomBuilder(scene, physics, 'bl_kiln', CX, CZ), R = B.room, k = B.k;
  R.view = 11.5; R.follow = 0.3; R.music = 'workshop'; R.surface = 'wood';
  B.shell({ W: Wd, D, H, t: 0.4, floor: MAT.planks('grey'), slab: MAT.stone('sand'), body: MAT.plaster('#f0dcbc'), low: MAT.tiles('#9cc8b4', '#8abcaa', '#4f6e64', false, 6), dado: 1.0,
    rail: MAT.wood('dark'), cap: MAT.wood('dark'), rimH: 0.45, rimMat: MAT.stone('sand'), beam: MAT.wood('dark'), posts: MAT.wood('dark'), postsAt: (L) => [L * 0.5],
    left: [{ at: DOOR_Z, w: 1.4, h: 2.4, y0: 0, kind: 'door', frame: MAT.paint('#5f9a86', 0.5), sill: MAT.stone('slate', 1) }] });
  R.exits.push({ ...B.world(-Wd / 2 + 0.3, DOOR_Z), r: 0.6, room: 'bl_gardens' });
  R.spawn = { ...B.world(-Wd / 2 + 1.4, DOOR_Z), a: Math.PI / 2 };
  R.entries = { bl_gardens: R.spawn };
  const BZ = -D / 2;
  // the wheel's axle through the back wall, the big wooden gear on it, a lay shaft and belt down to the potter's wheel
  const AX = -1.6, AY = 3.0;
  k.add(cyl(0.4, 0.45, 0.3, 14), bronze(), AX, AY, BZ + 0.1, 0, { rx: Math.PI / 2 });
  const gear = k.pivot(AX, AY, BZ + 0.45, 0);
  { const rim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.09, 6, 24), MAT.wood('dark')); gear.add(rim);
    for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.1, 0.1), MAT.wood('honey')); sp.rotation.z = (i * Math.PI) / 4; gear.add(sp); }
    for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, t = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.12), MAT.wood('honey')); t.position.set(Math.cos(a) * 0.96, Math.sin(a) * 0.96, 0); t.rotation.z = a; gear.add(t); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.3, 10), bronze()); hub.rotation.x = Math.PI / 2; gear.add(hub); }
  // the potter's wheel below: a stone flywheel at the foot, the wheel head at the top, the seat; the belt from the gear
  const PW = { x: AX, z: BZ + 1.7 };
  k.add(rbox(1.0, 0.7, 0.9, 0.03), MAT.wood('honey'), PW.x, 0.35, PW.z);
  const head = k.pivot(PW.x, 0.86, PW.z, 0);
  { const hm = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.07, 18), MAT.stone('sand', 1)); head.add(hm); const pot = new THREE.Mesh(new THREE.LatheGeometry([[0.001, 0], [0.14, 0], [0.17, 0.12], [0.12, 0.24], [0.13, 0.28]].map(([a, b]) => new THREE.Vector2(a, b)), 14), MAT.flat('#a88a6a', 0.9)); pot.position.y = 0.04; head.add(pot); }
  k.add(cyl(0.03, 0.03, AY - 0.9, 6), MAT.cloth('#5a4632', '#3e3022'), AX + 0.82, (AY + 0.9) / 2, BZ + 0.95, 0, { rz: 0.05 });
  B.col(PW.x, PW.z, 0.5, 0.45, 0.9, { block: true });
  B.put(PW.x + 0.9, PW.z + 0.6, -0.6, (kk) => { kk.add(cyl(0.2, 0.22, 0.05, 12), MAT.wood('honey'), 0, 0.5, 0); for (let i = 0; i < 3; i++) kk.add(cyl(0.025, 0.03, 0.5, 6), MAT.wood('dark'), Math.sin(i * 2.1) * 0.15, 0.25, Math.cos(i * 2.1) * 0.15); return { r: 0.22, top: 0.52 }; });
  // the kiln: a brick dome in the back right corner, its arched mouth, the glow inside
  const KX = 3.4, KZ = BZ + 1.6;
  k.add(lathe([[0.001, 0], [1.7, 0], [1.75, 0.6], [1.6, 1.4], [1.25, 2.2], [0.7, 2.75], [0.4, 2.95], [0.4, 3.6], [0.001, 3.6]], 18), MAT.stone('sand', 0.8), KX, 0, KZ);
  for (const y of [0.9, 1.9]) k.add(torus(y < 1 ? 1.68 : 1.42, 0.04, 5, 22), MAT.iron(), KX, y, KZ, 0, { rx: Math.PI / 2 });
  // (its mouth faces the room, toward the door and the camera)
  const MZ = KZ + 1.8;
  k.add(torus(0.65, 0.12, 6, 14, Math.PI), MAT.stone('sand', 1), KX, 0.6, MZ + 0.04);
  for (const s2 of [-1, 1]) k.add(rbox(0.24, 0.62, 0.3, 0.03), MAT.stone('sand', 1), KX + s2 * 0.65, 0.31, MZ + 0.04);
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16, 0, Math.PI), MAT.glow('#ffb060', '#ff7a20', 2.2)); mouth.position.set(KX, 0.6, MZ); R.group.add(mouth);
  const mouthLow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.6), MAT.glow('#ffb060', '#ff7a20', 2.2)); mouthLow.position.set(KX, 0.3, MZ); R.group.add(mouthLow);
  const cold = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), flat('#2a2422', 0.9)); cold.position.set(KX, 0.6, MZ + 0.01); R.group.add(cold);
  B.ccol(KX, KZ, 1.8, 3.6, { block: true });
  // the bellows by the kiln, worked by a crank from the gear's shaft
  const BW = { x: 1.0, z: BZ + 0.8 };
  k.add(rbox(0.9, 0.12, 0.7, 0.02), MAT.wood('dark'), BW.x, 0.4, BW.z);
  const bel = k.pivot(BW.x, 0.47, BW.z, 0);
  { const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.4, 12), MAT.cloth('#7a5a3a', '#5a4028')); bm.scale.set(1, 1, 0.8); bm.position.y = 0.2; bel.add(bm); const lid = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.7), MAT.wood('dark')); lid.position.y = 0.42; bel.add(lid); }
  k.add(cyl(0.05, 0.05, 1.6, 6), MAT.iron(), (BW.x + KX - 1.4) / 2, 0.4, BW.z + 0.1, 0, { rz: Math.PI / 2 - 0.2 });
  k.add(cyl(0.025, 0.025, AY - 0.9, 6), MAT.iron(), BW.x, (AY + 0.9) / 2, BW.z - 0.25);
  B.col(BW.x, BW.z, 0.5, 0.4, 0.9, { block: true });
  // racks of glazed floats on the left wall (his trade): three shelves, floats in celadon, cobalt, ochre
  B.put(-Wd / 2 + 0.3, -1.0, Math.PI / 2, (kk) => {
    for (const s of [-1, 1]) kk.add(rbox(0.06, 2.4, 0.4, 0.01), MAT.wood('dark'), s * 1.2, 1.2, 0);
    for (const y of [0.35, 1.05, 1.75, 2.4]) kk.add(rbox(2.44, 0.05, 0.42, 0.01), MAT.wood('honey'), 0, y, 0);
    for (const y of [0.35, 1.05, 1.75]) for (let i = 0; i < 5; i++) kk.add(sphere(0.16, 12, 8), [celadon(), cobalt(), celadonDeep(), MAT.flat('#e6b866', 0.3, { metalness: 0.05 }), celadon()][(i + Math.round(y * 3)) % 5], -0.95 + i * 0.47, y + 0.19, 0.02);
    return { hw: 1.25, hd: 0.22, top: 2.4 };
  });
  // the glazing table: buckets of glaze, brushes, a bowl drying
  B.put(0.4, 1.0, 0, (kk) => {
    kk.add(rbox(1.8, 0.08, 0.8, 0.02), MAT.wood('honey'), 0, 0.82, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) kk.add(rbox(0.07, 0.8, 0.07, 0.01), MAT.wood('dark'), sx * 0.8, 0.41, sz * 0.32);
    for (let i = 0; i < 4; i++) { kk.add(lathe([[0.001, 0], [0.13, 0], [0.15, 0.22], [0.001, 0.22]], 10), MAT.wood('grey'), -0.6 + i * 0.4, 0.86, -0.15); kk.add(cyl(0.135, 0.135, 0.02, 10), [celadon(), cobalt(), MAT.flat('#e6b866', 0.3), celadonDeep()][i], -0.6 + i * 0.4, 1.06, -0.15); }
    kk.add(lathe([[0.001, 0], [0.12, 0], [0.2, 0.1], [0.22, 0.12], [0.001, 0.05]], 12), celadon(), 0.5, 0.86, 0.2);
    return { hw: 0.92, hd: 0.42, top: 0.9 };
  });
  B.put(Wd / 2 - 1.0, 2.2, 0.2, (kk) => crate(kk, 0.6, { pal: 'pale' }));
  // light: the window's daylight, a lamp, the kiln's own (on while it runs)
  for (const [x, z] of [[-3.6, BZ + 0.12], [1.8, BZ + 0.12]]) k.add(sphere(0.13, 10, 8), MAT.glow('#fff2cc', '#ffc070', 1.4), x, 3.0, z);
  B.light('#ffe2b0', 5.0, 10, -2.4, 3.2, 0.2);
  B.light('#fff0d8', 3.5, 9, 1.0, 3.0, -1.0);
  const kl = B.light('#ff9a50', 4.0, 7, KX, 0.9, MZ + 0.8);
  // state
  let running = true, crank = 0;
  const ctl = {
    setRunning(b) { running = !!b; mouth.visible = mouthLow.visible = running; cold.visible = !running; kl.userData.base = running ? 4.0 : 0; const G = globalThis.game; if (G?.room === R) kl.intensity = kl.userData.base; },
    turn(speed, dt) { const a = speed * dt; gear.rotation.z -= a * 0.9; head.rotation.y += a * 6; crank += a * 3; bel.scale.y = 1 - 0.35 * (0.5 + 0.5 * Math.sin(crank)); },
  };
  ctl.setRunning(true);
  Object.assign(GROOMS.kiln, { door: B.world(-Wd / 2 + 0.3, DOOR_Z), spawn: R.spawn, corvin: { ...B.world(PW.x + 0.5, PW.z + 1.3), a: Math.PI } });
  R.npcSpots = { corvin_kiln: GROOMS.kiln.corvin };
  return { R: B.finish(), ctl };
}

// ------------------------------------------------------------------ the House of Balances (EXP-3, chapter 12)
const cardTex = () => M('bl_houseCardT', () => canvasTex(128, 160, (x, w, h) => {
  x.fillStyle = '#efe4c8'; x.fillRect(0, 0, w, h); x.strokeStyle = '#5a3a14'; x.lineWidth = 4; x.strokeRect(4, 4, w - 8, h - 8);
  x.fillStyle = '#2a1e10'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.fillText('B-7', w / 2, 34);
  for (let i = 0; i < 5; i++) x.fillRect(18, 52 + i * 14, w - 36 - (i % 2) * 20, 3);
  x.save(); x.translate(w / 2, 134); x.rotate(-0.15); x.strokeStyle = '#2f7a3a'; x.fillStyle = '#2f7a3a'; x.lineWidth = 3; x.strokeRect(-46, -16, 92, 26); x.font = 'bold 20px sans-serif'; x.fillText('PASSED', 0, 4); x.restore();
}));
const bookTex = () => M('bl_houseBookT', () => canvasTex(256, 160, (x, w, h) => {
  x.fillStyle = '#efe4c8'; x.fillRect(0, 0, w, h); x.fillStyle = '#6a4a2a'; x.fillRect(w / 2 - 2, 0, 4, h);
  x.fillStyle = '#2a1e10'; for (let s = 0; s < 2; s++) for (let i = 0; i < 9; i++) x.fillRect(12 + s * (w / 2), 16 + i * 15, w / 2 - 28 - ((i * 7) % 3) * 12, 3);
  x.fillStyle = '#a02a20'; x.fillRect(w / 2 + 14, 120, 80, 4);
}));
const heldTex = () => M('bl_houseHeldT', () => canvasTex(128, 64, (x, w) => { x.fillStyle = '#3a3430'; x.fillRect(0, 0, w, 64); x.fillStyle = '#f2ece0'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.fillText('HELD', w / 2, 44); }));
function buildHouse(scene, physics) {
  const { x: CX, z: CZ } = BALLASTRA_AT.bl_house, Wd = 13, D = 8, H = 4.6, DOOR_Z = 2.2;
  const B = new RoomBuilder(scene, physics, 'bl_house', CX, CZ), R = B.room, k = B.k;
  R.view = 12.5; R.follow = 0.3; R.music = 'workshop'; R.surface = 'stone';
  B.shell({ W: Wd, D, H, t: 0.45, floor: MAT.tiles('#d8cdb4', '#c8bca2', '#7a6a50', false, 6), slab: MAT.stone('sand'), body: MAT.plaster('#e8dcc4'), low: MAT.tiles('#9cc8b4', '#8abcaa', '#4f6e64', false, 6), dado: 1.1,
    rail: bronze(), cap: MAT.stone('sand', 1), rimH: 0.5, rimMat: MAT.stone('sand'), beam: MAT.wood('dark'), posts: MAT.stone('sand', 1), postsAt: (L) => [L * 0.33, L * 0.66],
    left: [{ at: DOOR_Z, w: 1.5, h: 2.6, y0: 0, kind: 'door', frame: bronze(), sill: MAT.stone('slate', 1) }] });
  R.exits.push({ ...B.world(-Wd / 2 + 0.3, DOOR_Z), r: 0.6, room: 'bl_gardens' });
  R.spawn = { ...B.world(-Wd / 2 + 1.4, DOOR_Z), a: Math.PI / 2 };
  R.entries = { bl_gardens: R.spawn };
  const BZ = -D / 2;
  // the counter, and the great balance over it (the House's sign): a post, a beam, two pans on chains
  const CT = { x: 1.0, z: BZ + 1.7 };
  k.add(rbox(4.2, 1.05, 0.8, 0.03), MAT.wood('dark'), CT.x, 0.52, CT.z); k.add(rbox(4.4, 0.08, 0.95, 0.02), MAT.stone('slate', 1), CT.x, 1.08, CT.z);
  B.col(CT.x, CT.z, 2.2, 0.45, 1.1, { block: true });
  k.add(cyl(0.08, 0.1, 2.6, 8), bronze(), CT.x, 2.4, BZ + 0.5);
  k.add(rbox(3.6, 0.12, 0.12, 0.02), bronze(), CT.x, 3.7, BZ + 0.5);
  for (const s of [-1, 1]) { k.add(cyl(0.01, 0.01, 0.9, 4), MAT.iron(), CT.x + s * 1.7, 3.25, BZ + 0.5); k.add(lathe([[0.001, 0], [0.42, 0.02], [0.45, 0.1], [0.001, 0.06]], 14), bronze(), CT.x + s * 1.7, 2.75, BZ + 0.5); }
  k.add(lathe([[0.001, 0], [0.14, 0], [0.001, 0.3]], 8), bronze(), CT.x, 3.82, BZ + 0.5);
  for (let i = 0; i < 3; i++) k.add(rbox(0.5, 0.08, 0.36, 0.01), MAT.cloth(['#6a3a2a', '#2a4a5a', '#5a5a2a'][i], '#2a1e14'), CT.x - 1.4 + i * 0.1, 1.16 + i * 0.08, CT.z + 0.05, i * 0.1);
  k.add(lathe([[0.001, 0], [0.09, 0], [0.07, 0.08], [0.001, 0.12]], 10), bronze(), CT.x + 1.2, 1.12, CT.z + 0.2);
  // the order book on its slanted stand (right of the counter)
  const BK = { x: 4.4, z: BZ + 2.3 };
  k.add(rbox(0.12, 1.0, 0.12, 0.01), MAT.wood('dark'), BK.x, 0.5, BK.z);
  k.add(rbox(0.7, 0.06, 0.5, 0.01), MAT.wood('dark'), BK.x, 1.05, BK.z, 0, { rx: 0.45 });
  k.add(plane(0.62, 0.4), MAT.map(bookTex(), 0.8), BK.x, 1.1, BK.z + 0.01, 0, { rx: -Math.PI / 2 + 0.45 });
  B.col(BK.x, BK.z, 0.35, 0.3, 1.1, { block: true });
  // the test bench (left): a coil on its stand, the needle's dial, the knock lever and its hammer, the empty saddle and card
  const TB = { x: -3.7, z: BZ + 1.3 };
  k.add(rbox(2.8, 0.08, 0.9, 0.02), MAT.wood('honey'), TB.x, 0.92, TB.z); for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(rbox(0.08, 0.9, 0.08, 0.01), MAT.wood('dark'), TB.x + sx * 1.3, 0.45, TB.z + sz * 0.38);
  B.col(TB.x, TB.z, 1.45, 0.5, 1.0, { block: true });
  k.add(cyl(0.05, 0.05, 2.6, 8), MAT.copper(), TB.x, 1.06, TB.z - 0.2, 0, { rz: Math.PI / 2 });   // (the bench's pipe)
  k.add(lathe([[0.001, 0], [0.2, 0], [0.22, 0.08], [0.2, 0.45], [0.12, 0.5], [0.001, 0.5]], 14), celadon(), TB.x - 0.7, 1.0, TB.z - 0.2);
  for (const y of [1.12, 1.3]) k.add(torus(0.215, 0.025, 4, 14), bronze(), TB.x - 0.7, y, TB.z - 0.2, 0, { rx: Math.PI / 2 });
  k.add(cyl(0.2, 0.2, 0.05, 18), MAT.flat('#efe4c8', 0.6), TB.x + 0.1, 1.45, TB.z - 0.12, 0, { rx: Math.PI / 2 });
  k.add(cyl(0.012, 0.012, 0.45, 4), MAT.iron(), TB.x + 0.1, 1.2, TB.z - 0.15);
  k.add(rbox(0.05, 0.03, 0.01, 0.002), MAT.paint('#3a9a4a', 0.4), TB.x + 0.1, 1.62, TB.z - 0.09);   // (green, at the top of the dial)
  const needle = k.pivot(TB.x + 0.1, 1.45, TB.z - 0.085, 0);
  { const n = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.17, 0.01), MAT.paint('#c8443a', 0.4)); n.position.y = 0.075; needle.add(n); }
  k.add(rbox(0.12, 0.3, 0.12, 0.01), MAT.iron(), TB.x + 0.75, 1.1, TB.z - 0.2);
  const hammer = k.pivot(TB.x + 0.75, 1.25, TB.z + 0.05, 0);
  { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.55), MAT.iron()); arm.position.z = 0.22; hammer.add(arm); const hd = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.12), MAT.steel()); hd.position.set(0, -0.02, -0.06); hammer.add(hd); const kn = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), MAT.paint('#c8443a', 0.4)); kn.position.z = 0.5; hammer.add(kn); }
  k.add(rbox(0.5, 0.1, 0.36, 0.02), MAT.stone('sand', 1), TB.x + 1.2, 1.0, TB.z + 0.12);   // (the empty saddle)
  k.add(plane(0.2, 0.25), MAT.map(cardTex(), 0.7), TB.x + 1.2, 1.2, TB.z - 0.04);
  k.add(cyl(0.006, 0.006, 0.15, 4), MAT.iron(), TB.x + 1.2, 1.38, TB.z - 0.045);
  // the project's crates (right front), a sign that goes up when the shipment is held
  B.put(4.9, 1.6, 0.1, (kk) => crate(kk, 0.8, { pal: 'pale' })); B.put(5.0, 2.6, -0.2, (kk) => crate(kk, 0.7, { pal: 'pale' })); B.put(4.0, 2.1, 0.3, (kk) => crate(kk, 0.6, { pal: 'grey' }));
  const held = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), MAT.map(heldTex(), 0.8)); held.position.set(4.9, 0.55, 2.02); held.visible = false; R.group.add(held);
  // the SOLD cabinet on the back wall (right): brass doors that open
  const CB = { x: 3.4, z: BZ + 0.3 };
  k.add(rbox(1.4, 2.4, 0.5, 0.02), MAT.wood('dark'), CB.x, 1.2, CB.z);
  for (let i = 0; i < 4; i++) k.add(rbox(1.2, 0.04, 0.4, 0.01), MAT.wood('honey'), CB.x, 0.5 + i * 0.5, CB.z + 0.06);
  for (let i = 0; i < 6; i++) k.add(rbox(0.12, 0.34, 0.3, 0.01), MAT.cloth('#c8b894', '#a89474'), CB.x - 0.45 + i * 0.18, 1.2, CB.z + 0.08, 0.05 * i);
  const doors = [-1, 1].map((s) => { const p = k.pivot(CB.x + s * 0.68, 1.25, CB.z + 0.27, 0); const m = new THREE.Mesh(new THREE.BoxGeometry(0.66, 2.1, 0.04), bronze()); m.position.x = -s * 0.33; p.add(m); return { p, s }; });
  B.col(CB.x, CB.z, 0.72, 0.28, 2.4, { block: true });
  // shelves of coils on the left wall, boxed (the House's trade)
  B.put(-Wd / 2 + 0.3, -0.6, Math.PI / 2, (kk) => {
    for (const s of [-1, 1]) kk.add(rbox(0.06, 2.2, 0.4, 0.01), MAT.wood('dark'), s * 1.1, 1.1, 0);
    for (const y of [0.4, 1.1, 1.8]) { kk.add(rbox(2.24, 0.05, 0.42, 0.01), MAT.wood('honey'), 0, y, 0); for (let i = 0; i < 4; i++) kk.add(lathe([[0.001, 0], [0.13, 0], [0.13, 0.32], [0.001, 0.32]], 10), celadon(), -0.8 + i * 0.52, y + 0.03, 0); }
    return { hw: 1.15, hd: 0.22, top: 2.2 };
  });
  for (const [x, z] of [[-3.0, BZ + 0.12], [3.0, BZ + 0.12]]) k.add(sphere(0.13, 10, 8), MAT.glow('#fff2cc', '#ffc070', 1.4), x, 3.2, z);
  B.light('#ffe2b0', 5.5, 12, -2.6, 3.4, 0.3);
  B.light('#fff0d8', 4.5, 11, 2.8, 3.2, -0.8);
  // state
  const S = { kt: 0, nd: 0, open: 0, openTo: 0 };
  const place = () => { hammer.rotation.x = -Math.sin(Math.min(1, S.kt) * Math.PI) * 0.9; needle.rotation.z = -S.nd; doors.forEach(({ p, s }) => { p.rotation.y = s * S.open * 1.6; }); };
  R.updaters.push((dt) => {
    let ch = false;
    if (S.kt > 0) { S.kt = Math.max(0, S.kt - dt * 2.2); ch = true; }
    // (the needle: thrown by the knock, then back on green at once, held as if by a hand)
    const want = S.kt > 0.55 ? 1.3 : 0; if (Math.abs(S.nd - want) > 1e-3) { S.nd += (want - S.nd) * Math.min(1, dt * (want ? 18 : 4)); ch = true; }
    if (S.open !== S.openTo) { S.open = S.openTo > S.open ? Math.min(1, S.open + dt) : Math.max(0, S.open - dt); ch = true; }
    if (ch) place();
  });
  const ctl = {
    knock() { S.kt = 1; const G = globalThis.game; if (G?.room === R) G.audio?.play?.('clang'); },
    setHeld(b) { held.visible = !!b; },
    setCabinet(open, instant) { S.openTo = open ? 1 : 0; if (instant) S.open = S.openTo; place(); },
  };
  place();
  Object.assign(GROOMS.house, {
    door: B.world(-Wd / 2 + 0.3, DOOR_Z), spawn: R.spawn,
    fennick: { ...B.world(CT.x, BZ + 0.85), a: 0 },
    book: { ...B.world(BK.x, BK.z + 0.75), r: 0.8 }, bench: { ...B.world(TB.x + 0.4, TB.z + 1.0), r: 0.9 },
    crates: { ...B.world(4.3, 3.1), r: 0.9 }, cabinet: { ...B.world(CB.x, CB.z + 1.0), r: 0.8 },
  });
  R.npcSpots = { fennick: GROOMS.house.fennick };
  return { R: B.finish(), ctl };
}

export function buildGardenRooms(scene, physics) {
  const t = buildTunnel(scene, physics), k = buildKiln(scene, physics), h = buildHouse(scene, physics);
  return { rooms: { bl_tunnel: t.R, bl_kiln: k.R, bl_house: h.R }, tunnel: t.ctl, kiln: k.ctl, house: h.ctl };
}
