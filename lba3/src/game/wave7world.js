// WAVE 7 (docs/lba-maturity/WAVE7.md; CONTENT-15H.md §3 H-17, H-18): the pieces the two side stories add to places that
// exist (story/wave7.js builds each once its place is built and shows it by the story's state). Our own geometry and
// canvas textures; nothing from LBA1/LBA2. The harbour does not move (the user's standing rule): there, only stencils
// on the cargo lift's own two crates and a pin with a tag on its own control.
//
//   Citadel, the harbour's cargo lift (island.js cargoLift, the opening's): STATION stencilled on its two crates (the one
//     on the hook has Pippa's chalk SHELTER under the paint; the one aboard the barge has nothing under it); a pin through
//     the control's lever with a red tag (HELD).
//   Citadel, Pippa's stall: one of her crates beside it, SHELTER in her chalk (the loop on the S).
//   The baggage claim (baggage.js, the 'bug' house): the back store, a wire cage against the front hall's left wall with
//     a roller shutter on its hall side, the old conveyor inside it, its lever outside, the bales of blankets, the lift's
//     pin on a hook, the back door through the left wall (bolted; once unbolted it stands open on a dim passage).
//   Citadel, behind the 'bug' house: the back door on its west wall (the back passage's outer end).
//   Citadel, the depot shelter's door (story/shelters.js): bales and water casks stacked by the door once delivered.
//   Desert Island, Kesh: Lumi's shade (keshlife.js out.sail) torn, rigged again by Dallan (two corners tied, the third on
//     the ground with its ring), up; the canvas roll and two spare poles he brought.
//
// CONTRACT (world coordinates unless named)
//   W7                          filled as each part is built
//   buildLiftBits(game)         → W7.lift { crateA () → {x,y,z}, crateB () → {x,y,z}, ctrl {x,z}, setOn(b), setPin(b), setCrate(b) }
//   buildStallCrate(game)       → W7.stall { x, z, setOn(b) }
//   buildBackStore(R, plan, physics) (the baggage room) → W7.store { lever {x,z}, pin {x,z}, door {x,z}, inside(x,z),
//                                 setShutter(u 0..1), setBales('back'|'in'|'out'|null), setPin(b), setDoor(open), setLever(-1|0|1),
//                                 exit {x,z} (the back door's trigger, room) }
//   buildBackDoor(game)         → W7.backDoor { x, z, out {x,z,a}, setOpen(b) } (on the 'bug' house's west wall)
//   buildShelterStock(game, frame) → W7.stock { setOn(b) }
//   buildShade(desertRoom)      → W7.shade { setState('whole'|'torn'|'rigged'|'up'), hook {x,y,z}, roll {x,z}, dallan {x,z,a} }
import * as THREE from 'three';
import { Kit, MAT, rbox, cyl, sphere, lathe, plane, torus, canvasTex } from './props.js';
import * as P from './props.js';

export const W7 = {};

// a group placed in world coordinates under a parent that may itself be offset (a room's or an island's group)
function worldGroup(parent, name) {
  const g = new THREE.Group(); g.name = name;
  parent.updateMatrixWorld?.(true);
  const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
  inv.decompose(g.position, g.quaternion, g.scale);
  parent.add(g);
  return g;
}

// ================================================================ the textures
const stencilTex = (chalk) => canvasTex(256, 128, (x, W, H) => {
  x.clearRect(0, 0, W, H);
  if (chalk) {
    // Pippa's hand under the paint: big chalk letters, the S with a loop, half rubbed out by the stencil brush
    x.save(); x.globalAlpha = 0.85; x.fillStyle = '#f4f0e4'; x.font = 'italic bold 50px serif'; x.textAlign = 'center'; x.translate(W / 2, 92); x.rotate(-0.06); x.fillText('SHELTER', 0, 0); x.restore();
    x.strokeStyle = 'rgba(244,240,228,0.85)'; x.lineWidth = 4; x.beginPath(); x.arc(46, 58, 9, 0, Math.PI * 2); x.stroke();
  }
  x.fillStyle = '#1e2a30'; x.font = 'bold 44px monospace'; x.textAlign = 'center';
  // a stencil: the letters broken by their bridges
  x.fillText('STATION', W / 2, 52);
  x.fillStyle = 'rgba(0,0,0,0)'; x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 7; i++) x.fillRect(34 + i * 27.5, 30, 3, 26);
  x.globalCompositeOperation = 'source-over';
});
const chalkTex = () => canvasTex(256, 128, (x, W, H) => {
  x.clearRect(0, 0, W, H);
  x.fillStyle = '#f4f0e4'; x.font = 'italic bold 52px serif'; x.textAlign = 'center';
  x.save(); x.translate(W / 2, 80); x.rotate(-0.05); x.fillText('SHELTER', 0, 0); x.restore();
  x.strokeStyle = '#f4f0e4'; x.lineWidth = 4; x.beginPath(); x.arc(44, 46, 9, 0, Math.PI * 2); x.stroke();
});
const fit = (x, s, px, bold, max) => { let n = px; do { x.font = `${bold ? 'bold ' : ''}${n}px sans-serif`; } while (x.measureText(s).width > max && --n > 6); };
const tagTex = (top, bot, w = 96, h = 64) => canvasTex(w, h, (x, W, H) => { x.fillStyle = '#c8452f'; x.fillRect(0, 0, W, H); x.fillStyle = '#f2ead6'; x.textAlign = 'center'; fit(x, top, Math.round(H * 0.32), true, W - 8); x.fillText(top, W / 2, H * 0.45); fit(x, bot, Math.round(H * 0.18), false, W - 8); x.fillText(bot, W / 2, H * 0.76); });
const meshTex = () => canvasTex(64, 64, (x, S) => { x.clearRect(0, 0, S, S); x.strokeStyle = '#9aa0a6'; x.lineWidth = 3; for (let i = -S; i < S * 2; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + S, S); x.stroke(); x.beginPath(); x.moveTo(i + S, 0); x.lineTo(i, S); x.stroke(); } });
const shutterTex = () => canvasTex(64, 128, (x, W, H) => { for (let y = 0; y < H; y += 8) { x.fillStyle = (y / 8) % 2 ? '#2f6f74' : '#3d8288'; x.fillRect(0, y, W, 8); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, y + 7, W, 1); } });
let _st = {};
const tex = (k, f) => _st[k] || (_st[k] = f());
const decalMat = (k, f) => new THREE.MeshStandardMaterial({ map: tex(k, f), transparent: true, alphaTest: 0.2, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2 });

// ================================================================ the harbour's cargo lift: stencils, the pin
export function buildLiftBits(game) {
  if (W7.lift) return W7.lift;
  const L = game.world?.cargoLift; if (!L) return null;
  const decals = [];
  // (a stencil on both of the crate's plain sides, ±x; the emblems are on ±z)
  const stencil = (parent, chalk, ox = 0, oy = 0, oz = 0, ry = 0) => {
    const g = new THREE.Group(); g.position.set(ox, oy, oz); g.rotation.y = ry; parent.add(g);
    for (const s of [-1, 1]) { const m = new THREE.Mesh(plane(0.62, 0.31), decalMat(chalk ? 'stc' : 'stp', () => stencilTex(chalk))); m.position.set(s * 0.408, 0.02, 0); m.rotation.y = s * Math.PI / 2; m.renderOrder = 1; g.add(m); }
    decals.push(g); return g;
  };
  stencil(L.crate, true);
  stencil(L.barge, false, -0.6, 0.76, 0.1, 0.15);   // (the crate that stays aboard: barge-local, as island.js put it)
  // the pin through the lever's slot and its tag, on the control box (the lever's own parent)
  const ctrl = L.lever.parent;
  const pin = new THREE.Group(); ctrl.add(pin);
  const k = new Kit(pin);
  k.add(cyl(0.012, 0.012, 0.16, 6), MAT.steel(), 0.0, 0.17, 0.05, 0, { rz: Math.PI / 2 });
  k.add(torus(0.025, 0.005, 4, 10), MAT.steel(), 0.09, 0.17, 0.05, 0, { ry: Math.PI / 2 });
  k.add(cyl(0.002, 0.002, 0.1, 3), MAT.flat('#d8c8a0', 0.9), 0.1, 0.12, 0.05);
  k.add(plane(0.09, 0.06), MAT.map(tagTex('HELD', 'KEY: BAGGAGE'), 0.8), 0.1, 0.05, 0.062);
  k.add(plane(0.09, 0.06), MAT.map(tagTex('HELD', 'KEY: BAGGAGE'), 0.8), 0.1, 0.05, 0.038, Math.PI);
  k.flush();
  const wp = (o) => { o.updateMatrixWorld(true); const v = o.getWorldPosition(new THREE.Vector3()); return { x: v.x, y: v.y, z: v.z }; };
  const kn = wp(L.knob);
  W7.lift = {
    L, ctrl: { x: kn.x, z: kn.z },
    crateA: () => wp(L.crate),
    crateB: () => { const v = new THREE.Vector3(-0.6, 0.76, 0.1); L.barge.updateMatrixWorld(true); v.applyMatrix4(L.barge.matrixWorld); return { x: v.x, y: v.y, z: v.z }; },
    setOn(on) { for (const d of decals) d.visible = !!on; },
    setPin(on) { pin.visible = !!on; },
    setCrate(on) { L.crate.visible = !!on; },
  };
  W7.lift.setOn(false); W7.lift.setPin(false);
  return W7.lift;
}

// ================================================================ Pippa's chalked crate, beside her stall
export function buildStallCrate(game) {
  if (W7.stall) return W7.stall;
  const W = game.world, S = W?.stall; if (!S) return null;
  // the stall's middle is 1.6 m behind where Pippa stands; the crate at its south-west end, against it
  const a = S.a, sx = S.x - Math.sin(a) * 1.6, sz = S.z - Math.cos(a) * 1.6;
  const rx = Math.cos(a), rz = -Math.sin(a);
  const x = sx - rx * 2.0 + Math.sin(a) * 0.15, z = sz - rz * 2.0 + Math.cos(a) * 0.15, y = game.physics.groundAt(x, z);
  const g = worldGroup(W.root, 'wave7 stall crate'); const k = new Kit(g);
  k.at(x, y, z, a + 0.2, () => { P.crate(k, 0.55, { pal: 'honey' }); });
  k.flush();
  const ch = new THREE.Mesh(plane(0.48, 0.24), decalMat('chalk', chalkTex)); ch.position.set(x + Math.sin(a + 0.2) * 0.285, y + 0.3, z + Math.cos(a + 0.2) * 0.285); ch.rotation.y = a + 0.2; g.add(ch);
  const col = game.physics.add({ type: 'box', x, z, hw: 0.28, hd: 0.28, rot: a + 0.2, top: y + 0.55, noStand: true });
  W7.stall = { x: x + Math.sin(a) * 0.75, z: z + Math.cos(a) * 0.75, at: { x, z }, setOn(on) { g.visible = !!on; col.enabled = !!on; } };
  return W7.stall;
}

// ================================================================ the baggage claim's back store
// plan: BAGGAGE_PLAN (room frame); R: the room (R.center: the frame's origin in the world)
export function buildBackStore(R, plan, physics) {
  if (W7.store) return W7.store;
  const S = plan.store, cx = R.center.x, cz = R.center.z;
  const g = worldGroup(R.group, 'wave7 back store');
  const k = new Kit(g);
  const x0 = S.x0, x1 = S.x1, z0 = S.z0, z1 = S.z1, HT = 2.2;
  const X = (x) => cx + x, Z = (z) => cz + z;
  const iron = MAT.iron(), teal = MAT.paint('#2f6f74', 0.5);
  const meshM = new THREE.MeshStandardMaterial({ map: tex('mesh', meshTex), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.6, metalness: 0.4 });
  const cols = [];
  const wallCol = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az); cols.push(physics.add({ type: 'box', x: X((ax + bx) / 2), z: Z((az + bz) / 2), hw: L / 2, hd: 0.05, rot: -Math.atan2(bz - az, bx - ax), top: HT, noStand: true, seeThrough: true })); };
  // the cage: posts and a top rail in teal iron, mesh panels between
  const panel = (ax, az, bx, bz) => {
    const L = Math.hypot(bx - ax, bz - az), ry = -Math.atan2(bz - az, bx - ax);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L, HT - 0.1), meshM); m.position.set(X((ax + bx) / 2), (HT - 0.1) / 2 + 0.05, Z((az + bz) / 2)); m.rotation.y = ry; g.add(m);
    meshM.map.repeat?.set(1, 1);
    k.add(rbox(L, 0.06, 0.06, 0.01), teal, X((ax + bx) / 2), HT, Z((az + bz) / 2), ry);
    k.add(rbox(L, 0.05, 0.05, 0.01), teal, X((ax + bx) / 2), 0.05, Z((az + bz) / 2), ry);
  };
  for (const [x, z] of [[x0 + 0.03, z0], [x1, z0], [x1, S.sh0], [x1, S.sh1], [x1, z1], [x0 + 0.03, z1]]) k.add(rbox(0.07, HT + 0.03, 0.07, 0.01), teal, X(x), (HT + 0.03) / 2, Z(z));
  panel(x0, z0, x1, z0); wallCol(x0, z0, x1, z0);
  panel(x0, z1, x1, z1); wallCol(x0, z1, x1, z1);
  panel(x1, z0, x1, S.sh0); wallCol(x1, z0, x1, S.sh0);
  panel(x1, S.sh1, x1, z1); wallCol(x1, S.sh1, x1, z1);
  // the sign over the shutter
  k.add(plane(1.1, 0.26), MAT.map(tagTex('BACK STORE', 'STAFF ONLY', 256, 60), 0.8), X(x1 + 0.04), HT + 0.22, Z((S.sh0 + S.sh1) / 2), Math.PI / 2);
  // the roller shutter: its drum box on top, the curtain that rolls up into it
  const SW = S.sh1 - S.sh0, SH = HT - 0.05;
  k.add(rbox(0.26, 0.26, SW + 0.1, 0.03), teal, X(x1 + 0.08), HT + 0.12, Z((S.sh0 + S.sh1) / 2));
  const curtain = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshStandardMaterial({ map: tex('shutter', shutterTex), side: THREE.DoubleSide, roughness: 0.55, metalness: 0.3 }));
  curtain.geometry.translate(0, -SH / 2, 0); curtain.position.set(X(x1 + 0.02), HT, Z((S.sh0 + S.sh1) / 2)); curtain.rotation.y = Math.PI / 2; curtain.castShadow = true; g.add(curtain);
  const shutCol = physics.add({ type: 'box', x: X(x1), z: Z((S.sh0 + S.sh1) / 2), hw: 0.06, hd: SW / 2, top: HT, noStand: true });
  // the old conveyor inside, along the cage's back (north) side: a frame of rollers from the back door's side to the shutter
  const cz0 = z0 + 0.42, cL = x1 - x0 - 0.35, cX = (x0 + 0.15 + x1 - 0.2) / 2;
  k.add(rbox(cL, 0.08, 0.62, 0.02), iron, X(cX), 0.5, Z(cz0));
  for (const s of [-1, 1]) for (const e of [-1, 1]) k.add(rbox(0.05, 0.5, 0.05, 0.01), iron, X(cX + e * (cL / 2 - 0.05)), 0.25, Z(cz0 + s * 0.27));
  for (let i = 0; i < Math.floor(cL / 0.2); i++) k.add(cyl(0.03, 0.03, 0.58, 8), MAT.steel(), X(x0 + 0.25 + i * 0.2), 0.57, Z(cz0), 0, { rx: Math.PI / 2 });
  cols.push(physics.add({ type: 'box', x: X(cX), z: Z(cz0), hw: cL / 2, hd: 0.32, top: 0.62, noStand: true }));
  // the lever outside, by the shutter's north end (toward the stair): a quadrant on a stand, the handle on a pivot
  const LV = { x: x1 + 0.3, z: S.sh0 - 0.45 };
  k.add(rbox(0.22, 0.7, 0.16, 0.02), iron, X(LV.x), 0.35, Z(LV.z));
  k.add(torus(0.22, 0.015, 4, 12, Math.PI), MAT.brass(), X(LV.x), 0.72, Z(LV.z), Math.PI / 2);
  const lever = new THREE.Group(); lever.position.set(X(LV.x), 0.72, Z(LV.z)); g.add(lever);
  const lk = new Kit(lever); lk.add(cyl(0.018, 0.022, 0.55, 6), iron, 0, 0.27, 0); lk.add(sphere(0.045, 10, 8), MAT.paint('#b0302c', 0.5), 0, 0.56, 0); lk.flush();
  cols.push(physics.add({ type: 'box', x: X(LV.x), z: Z(LV.z), hw: 0.12, hd: 0.1, top: 1.2, noStand: true }));
  // the bales of blankets (chalk SHELTER on their wrappers) on the conveyor: a group that slides along it
  const bales = new THREE.Group(); g.add(bales);
  const bk = new Kit(bales);
  for (const [i, c] of [['#c8b890', '#a89870'], ['#b8a8c8', '#9888a8']].entries()) {
    bk.add(rbox(0.62, 0.44, 0.5, 0.12), MAT.cloth(c[0], c[1]), i * 0.68, 0.84, 0);
    bk.add(rbox(0.64, 0.04, 0.52, 0.01), MAT.flat('#6a4a2a', 0.9), i * 0.68, 0.84, 0);
  }
  bk.flush();
  for (let i = 0; i < 2; i++) { const ch = new THREE.Mesh(plane(0.5, 0.22), decalMat('chalk', chalkTex)); ch.position.set(i * 0.68, 0.86, 0.255); bales.add(ch); }
  bales.position.set(X(x0 + 0.5), 0, Z(cz0));
  const BALES = { back: x0 + 0.5, in: x0 + 0.5, out: x1 - 1.05 };
  // the lift's pin on a hook on the cage's south mesh, inside, its red tag
  const PIN = { x: x1 - 0.55, z: z1 - 0.06 };
  k.add(rbox(0.12, 0.03, 0.03, 0.01), iron, X(PIN.x), 1.45, Z(PIN.z));
  const pin = new THREE.Group(); pin.position.set(X(PIN.x), 1.4, Z(PIN.z - 0.04)); g.add(pin);
  const pk = new Kit(pin);
  pk.add(cyl(0.012, 0.012, 0.16, 6), MAT.steel(), 0, -0.06, 0);
  pk.add(plane(0.1, 0.066), MAT.map(tagTex('LIFT KEY', 'CARGO LIFT 1'), 0.8), 0, -0.17, -0.004, Math.PI);
  pk.flush();
  // the back door in the left wall: a plank leaf with a bolt (the wall's opening is baggage.js's), and the dim passage
  // seen through it once it stands open
  const D = S.door, dt = 0.55;
  const leaf = new THREE.Group(); leaf.position.set(X(x0 - dt / 2), 0, Z(D.z)); g.add(leaf);
  const dk = new Kit(leaf);
  dk.add(rbox(0.05, D.h - 0.04, D.w - 0.04, 0.01), MAT.planks('dark'), 0, (D.h - 0.04) / 2, 0);
  for (const y of [0.4, 1.7]) dk.add(rbox(0.07, 0.12, D.w - 0.1, 0.01), MAT.wood('dark'), 0.03, y, 0);
  dk.add(rbox(0.06, 0.07, 0.5, 0.01), iron, dt / 2 - 0.02, 1.1, -0.15);
  dk.flush();
  const passage = new THREE.Mesh(plane(D.w + 0.1, D.h + 0.1), MAT.flat('#3a3630', 0.95)); passage.position.set(X(x0 - dt - 0.6), D.h / 2, Z(D.z)); passage.rotation.y = Math.PI / 2; g.add(passage);
  const doorCol = physics.add({ type: 'box', x: X(x0 - 0.1), z: Z(D.z), hw: 0.12, hd: D.w / 2, top: D.h, noStand: true });
  g.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  k.flush();
  const S7 = {
    lever: { x: X(LV.x + 0.5), z: Z(LV.z) }, leverAt: { x: X(LV.x), z: Z(LV.z) }, pin: { x: X(PIN.x), z: Z(PIN.z - 0.5) }, door: { x: X(x0 + 0.45), z: Z(D.z) },
    exit: { x: X(x0 + 0.2), z: Z(D.z) }, spawn: { x: X(x0 + 0.95), z: Z(D.z), a: Math.PI / 2 },
    shutterAt: { x: X(x1 + 0.6), z: Z((S.sh0 + S.sh1) / 2) },
    inside: (x, z) => x > X(x0) && x < X(x1) && z > Z(z0) && z < Z(z1),
    u: 0,
    setShutter(u) { S7.u = u = Math.max(0, Math.min(1, u)); curtain.scale.y = Math.max(0.04, 1 - u); shutCol.enabled = u < 0.85; },
    setBales(where) { bales.visible = !!where; if (where) bales.position.x = X(BALES[where] ?? BALES.back); },
    baleX(x) { bales.position.x = X(x); }, BALES,
    setPin(on) { pin.visible = !!on; },
    setDoor(open) { leaf.rotation.y = open ? -1.7 : 0; leaf.position.x = X(x0 - dt / 2) + (open ? 0.3 : 0); leaf.position.z = Z(D.z) + (open ? -D.w / 2 + 0.05 : 0); passage.visible = !!open; doorCol.enabled = !open; },
    setLever(p) { lever.rotation.z = -p * 0.55; },   // (−1 in · 0 stopped · 1 out: toward the hall)
    group: g,
  };
  S7.setShutter(0); S7.setDoor(false); S7.setLever(0);
  W7.store = S7;
  return S7;
}

// ================================================================ the back door on the 'bug' house's west wall
export function buildBackDoor(game) {
  if (W7.backDoor) return W7.backDoor;
  const W = game.world, h = W?.houses?.find((x) => x.id === 'bug'); if (!h) return null;
  // the house's frame: local x → world −z, local z → world +x (its front door faces east); the back wall at local z −d/2
  const lx = -1.7, x = h.x - h.d / 2 - 0.02, z = h.z - lx, y = game.physics.groundAt(x - 0.6, z);
  const g = worldGroup(W.root, 'wave7 back door'); const k = new Kit(g);
  k.add(rbox(0.12, 2.3, 1.3, 0.02), MAT.wood('dark'), x - 0.03, y + 1.15, z);           // (the frame)
  k.add(rbox(0.14, 0.16, 1.5, 0.03), MAT.stone('grey', 1), x - 0.05, y + 2.36, z);      // (the lintel)
  k.add(rbox(0.5, 0.12, 1.3, 0.03), MAT.stone('sand', 1), x - 0.25, y + 0.06, z);       // (the step)
  k.flush();
  const leaf = new THREE.Group(); leaf.position.set(x - 0.1, y + 0.12, z + 0.53); g.add(leaf);
  const lk = new Kit(leaf); lk.add(rbox(0.05, 2.06, 1.04, 0.01), MAT.planks('dark'), 0, 1.03, -0.53); for (const yy of [0.4, 1.6]) lk.add(rbox(0.07, 0.12, 0.98, 0.01), MAT.wood('dark'), -0.02, yy, -0.53); lk.add(sphere(0.04, 8, 6), MAT.brass(), -0.05, 1.0, -0.95); lk.flush();
  const dark = new THREE.Mesh(plane(1.04, 2.06), MAT.flat('#2e2a26', 0.95)); dark.position.set(x - 0.075, y + 1.15, z); dark.rotation.y = -Math.PI / 2; g.add(dark);
  const D = {
    x: x - 0.75, z, y, door: { x: x - 0.75, z },
    out: { x: x - 1.95, z, a: -Math.PI / 2 },
    setOpen(on) { leaf.rotation.y = on ? 1.6 : 0; dark.visible = !!on; },
    group: g,
  };
  D.setOpen(false);
  W7.backDoor = D;
  return D;
}

// ================================================================ the depot shelter's door: blankets and casks delivered
export function buildShelterStock(game, frame, parent) {
  if (W7.stock) return W7.stock;
  const PH = game.physics, g = worldGroup(parent || game.world.root, 'wave7 shelter stock'), k = new Kit(g);
  const A = frame.at(0.75, -2.3), B = frame.at(0.8, -3.05), ry = Math.atan2(frame.n.x, frame.n.z);
  const ya = PH.groundAt(A.x, A.z), yb = PH.groundAt(B.x, B.z);
  k.at(A.x, ya, A.z, ry, () => {
    for (const [i, c] of [['#c8b890', '#a89870'], ['#b8a8c8', '#9888a8'], ['#c8b890', '#a89870']].entries()) k.add(rbox(0.62, 0.42, 0.5, 0.12), MAT.cloth(c[0], c[1]), 0, 0.21 + i * 0.42, 0, i * 0.15);
  });
  k.at(B.x, yb, B.z, ry, () => { P.barrel(k, { r: 0.26, h: 0.7 }); k.at(0.0, 0, -0.62, 0, () => P.barrel(k, { r: 0.26, h: 0.7 })); });
  k.flush();
  const cols = [PH.add({ type: 'box', x: A.x, z: A.z, hw: 0.34, hd: 0.3, rot: ry, top: ya + 1.3, noStand: true }), PH.add({ type: 'box', x: B.x - frame.n.x * 0.0, z: B.z, hw: 0.3, hd: 0.62, rot: ry, top: yb + 0.72, noStand: true })];
  W7.stock = { at: A, setOn(on) { g.visible = !!on; for (const c of cols) c.enabled = !!on; } };
  W7.stock.setOn(false);
  return W7.stock;
}

// ================================================================ Kesh: Lumi's shade
export function buildShade(R) {
  if (W7.shade) return W7.shade;
  const S = R?.kesh?.sail; if (!S) return null;
  const grp = S.group, P0 = S.pts, mat = S.mesh.material;
  const g = new THREE.Group(); g.name = 'wave7 shade'; grp.add(g);
  const ox = grp.position.x, oz = grp.position.z;
  const tri = (a, b, c, sag = 0.08) => {
    const m = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3 - sag, (a[2] + b[2] + c[2]) / 3];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...m], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 3, 0, 1.5, 3, 1.5, 1], 2));
    geo.setIndex([0, 1, 3, 1, 2, 3, 2, 0, 3]); geo.computeVertexNormals();
    const me = new THREE.Mesh(geo, mat); me.castShadow = true; return me;
  };
  const [p0, p1, p2] = P0;
  // torn: two ragged strips hanging off the low poles' tops, and the high pole bare
  const torn = new THREE.Group(); g.add(torn);
  torn.add(tri(p1, [p1[0] - 0.35, p1[1] - 1.5, p1[2] - 0.1], [p1[0] - 0.75, p1[1] - 0.9, p1[2] + 0.25], 0.02));
  torn.add(tri(p2, [p2[0] - 0.2, p2[1] - 1.3, p2[2] - 0.35], [p2[0] - 0.55, p2[1] - 0.6, p2[2] - 0.6], 0.02));
  torn.add(tri(p1, [p1[0] - 0.8, p1[1] - 0.25, p1[2] - 0.3], [p1[0] - 0.5, p1[1] - 0.75, p1[2] - 0.15], 0.0));
  // rigged: the new canvas tied to the low poles, its third corner down by the high pole's foot, the ring on it
  const rigged = new THREE.Group(); g.add(rigged);
  const low = [p0[0] + 0.35, S.H(p0[0] + 0.35, p0[2] + 0.35) + 0.4, p0[2] + 0.35];
  rigged.add(tri(p1, p2, low, 0.15));
  const k = new Kit(rigged);
  k.add(torus(0.07, 0.012, 5, 12), MAT.brass(), low[0], low[1] + 0.02, low[2], 0, { rx: 0.4 });
  k.flush();
  // the hook at the high pole's top (always there: the ring goes onto it), the canvas roll and two spare poles
  const kh = new Kit(g);
  kh.add(torus(0.06, 0.012, 5, 10, Math.PI * 1.3), MAT.iron(), p0[0] + 0.06, p0[1] + 0.02, p0[2], Math.PI / 2);
  kh.flush();
  const rollAt = [p1[0] + 0.7, p1[2] - 0.9];
  const roll = new THREE.Group(); g.add(roll);
  const rk = new Kit(roll);
  const gy = S.H(rollAt[0], rollAt[1]);
  rk.add(cyl(0.16, 0.16, 1.4, 12), MAT.cloth('#f4e8d0', '#e86a3a'), rollAt[0], gy + 0.16, rollAt[1], 0.3, { rz: Math.PI / 2 });
  for (const d of [-0.22, 0.0]) rk.add(cyl(0.04, 0.04, 2.6, 6), MAT.wood('honey'), rollAt[0] + 0.2, gy + 0.05, rollAt[1] + 0.35 + d, 0.25, { rz: Math.PI / 2 });
  rk.flush();
  const Sh = {
    state: 'whole',
    hook: { x: ox + p0[0], y: p0[1], z: oz + p0[2] },
    roll: { x: ox + rollAt[0], z: oz + rollAt[1] },
    dallan: { x: ox + p0[0] + 1.3, z: oz + p0[2] + 0.5, a: -2.0 },
    setState(s) {
      Sh.state = s;
      S.mesh.visible = s === 'whole' || s === 'up';
      torn.visible = s === 'torn'; rigged.visible = s === 'rigged';
      roll.visible = s === 'rigged';
    },
    group: g,
  };
  Sh.setState('whole');
  W7.shade = Sh;
  return Sh;
}
