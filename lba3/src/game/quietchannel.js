// U-5 "The Quiet Channel" — the world's pieces (docs/lba-maturity/U5-QUIET-CHANNEL.md; the story is
// src/game/story/quietchannel.js, the text src/game/text/quietchannel.js). Ours: nothing here is LBA1/LBA2's.
//
// At the bottom of the shaft (underground.js buildShaft, c3shaft; local metres in its group's frame), between the walk
// from the lift to the tunnel and the crew's tea corner:
//   - the riser: an old service pipe up out of the floor (cooling line two, from Pump Two), up to the height of the lift's
//     liner, across to it and on up the shaft to the station; a plate LINE 2 · PUMP TWO
//   - three valves on a short header off it at hand height, big, middle and small: snapped shut, each hammers the pipe
//     (water hammer) with its own weight: heavy, middle, light
//   - its gauge, facing the room: the needle kicks with every knock on the pipe, by the knock's weight (the rhythm read
//     by sight; the tests measure it); a white lamp over it flashes with the far side's knocks; three amber lamps under it
//     count the knocks of an answer being made
//   - the riser cock (a red T on the pipe at chest height), tagged shut by Vesk (SHAFT CLOSED. V.), opened by the quest
// In the station's control room on Citadel (interiors.js buildControl; the left wall, between the worker's console and
// the instrument rack): the riser's end, a pipe down the wall to a brass speaking horn and a small lamp (lit while the
// channel is open). After the ending, Matto's place on shift is in the deep installation (c3deep), by valve B.
//
// CONTRACT
//   buildRiser(game, R) → QR (R: the c3shaft room)
//     riser {x,z} world; wheels [{w: 3|2|1, x,z,y (the hand's point on the wheel's rim, world), a (the way he faces)}]
//     cock {x,z,y,a}; setNeedle(v 0..1); setCall(k 0..1); setCount(n 0..3); snap(i) (wheel i turns and back);
//     setCock(open, instant); shake(k); state {open}; update(dt) (the wheel and cock animations)
//   buildHorn(game, R) → QH (R: the control room)
//     horn {x,z,y} world, setOpen(b), pulse(k)
//   MATTO_HOME (c3deep local), TOLLI_UP (control local): the people's spots
import * as THREE from 'three';
import { Kit, MAT, rbox, cyl, sphere, torus, pipe, plane, disc, canvasTex } from './props.js';
import * as P from './props.js';

// ------------------------------------------------------------------ the shaft's landing (c3shaft local)
export const RISER = { x: 0.2, z: 3.0, top: 4.5, liner: { x: -2.9, z: 0.05 } };
export const HEADER = { y: 1.2, x1: 2.35 };
// the valves along the header (w: the knock's weight: 3 heavy, 2 middle, 1 light), the wheels facing the room (+z)
export const WHEELS = [{ w: 3, x: 0.95, r: 0.24 }, { w: 2, x: 1.55, r: 0.18 }, { w: 1, x: 2.15, r: 0.12 }];
const WZ = RISER.z + 0.17;           // the wheels' plane
const GAUGE = { y: 2.02, r: 0.22 };   // (big enough to read from the room's camera)
const COCK_Y = 1.48;                 // ('reach': the hand at 1.48 m)
// ------------------------------------------------------------------ the control room (interiors.js buildControl local)
export const HORN = { x: -5.86, y: 1.45, z: 1.08 };
export const TOLLI_UP = { x: -4.7, z: 1.95 };
// ------------------------------------------------------------------ the deep installation, after the ending (c3deep local)
export const MATTO_HOME = { x: 6.1, z: -0.2, face: { x: 7.0, z: 0.6 } };

const own = (o) => new THREE.MeshStandardMaterial({ roughness: 0.4, ...o });
const sign = (lines, w = 256, h = 96, bg = '#2a5e5a', fg = '#efe2bf') => MAT.map(canvasTex(w, h, (x, W, H) => {
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.strokeStyle = fg; x.lineWidth = 4; x.strokeRect(5, 5, W - 10, H - 10);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  const n = lines.length, fs = Math.floor((H - 18) / (n + 0.35));
  x.font = `bold ${fs}px 'Arial Narrow', Arial, sans-serif`;
  lines.forEach((s, i) => x.fillText(s, W / 2, 9 + (i + 0.55) * (H - 18) / n));
}), 0.6);
// the gauge's face: ticks, three weights marked (light, middle, heavy) round the dial, a red zone at the top end
const dialTex = () => canvasTex(128, 128, (x, W, H) => {
  const c = W / 2;
  x.fillStyle = '#f2ead6'; x.beginPath(); x.arc(c, c, c - 2, 0, 7); x.fill();
  x.strokeStyle = '#2a2a2a'; x.lineWidth = 2;
  for (let i = 0; i <= 20; i++) { const a = Math.PI * 0.75 + (i / 20) * Math.PI * 1.5, r0 = i % 5 ? c - 14 : c - 22; x.beginPath(); x.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0); x.lineTo(c + Math.cos(a) * (c - 6), c + Math.sin(a) * (c - 6)); x.stroke(); }
  x.strokeStyle = '#c8452f'; x.lineWidth = 8; x.beginPath(); x.arc(c, c, c - 10, Math.PI * 0.75 + Math.PI * 1.5 * 0.85, Math.PI * 2.25); x.stroke();
  x.fillStyle = '#2a2a2a'; x.font = "bold 15px 'Arial Narrow', Arial, sans-serif"; x.textAlign = 'center';
  x.fillText('LINE 2', c, c + 30);
});

export function buildRiser(game, R) {
  const O = R.group.position, W = (x, z) => ({ x: O.x + x, z: O.z + z });
  const g = new THREE.Group(); g.name = 'qc-riser'; R.group.add(g);
  const k = new Kit(g);
  const pipeM = MAT.paint('#56707a', 0.5), brass = MAT.brass(), iron = MAT.iron();
  const { x: RX, z: RZ } = RISER, L = RISER.liner;
  // the riser: a floor flange, up, across to the lift's liner, on up the shaft
  k.add(cyl(0.2, 0.23, 0.08, 16), iron, RX, 0.04, RZ);
  k.add(pipe([[RX, 0.05, RZ], [RX, RISER.top, RZ], [L.x, RISER.top, L.z], [L.x, 14, L.z]], 0.09, 0.35, 10), pipeM, 0, 0, 0);
  for (const y of [0.55, 3.05, 3.8]) k.add(torus(0.105, 0.03, 6, 16), brass, RX, y, RZ, 0, { rx: Math.PI / 2 });
  for (const y of [5.6, 7.4, 9.2]) k.add(torus(0.105, 0.03, 6, 16), brass, L.x, y, L.z, 0, { rx: Math.PI / 2 });
  // its plate
  k.add(plane(0.5, 0.2), sign(['LINE 2 · PUMP TWO'], 256, 96), RX, 2.78, RZ + 0.1);
  // the header with the three valves (a stub, a bonnet, the wheel on its own pivot)
  k.add(pipe([[RX, HEADER.y, RZ], [HEADER.x1, HEADER.y, RZ]], 0.06, 0.1, 8), pipeM, 0, 0, 0);
  k.add(sphere(0.07, 10, 8), pipeM, HEADER.x1, HEADER.y, RZ);
  k.add(cyl(0.035, 0.035, HEADER.y - 0.05, 8), iron, HEADER.x1, (HEADER.y - 0.05) / 2, RZ);
  k.add(rbox(0.18, 0.04, 0.18, 0.01), iron, HEADER.x1, 0.02, RZ);
  const wheels = [];
  for (const w of WHEELS) {
    k.add(sphere(0.085 + w.r * 0.25, 12, 10), MAT.paint('#3a4448', 0.45), w.x, HEADER.y, RZ + 0.02, 0, { sy: 0.85 });
    k.add(cyl(0.03, 0.03, 0.16, 8), MAT.steel(), w.x, HEADER.y, RZ + 0.09, 0, { rx: Math.PI / 2 });
    const piv = new THREE.Group(); piv.position.set(w.x, HEADER.y, WZ); g.add(piv);
    const wk = new Kit(piv); P.valveWheel(wk, { r: w.r, color: '#c8302a' }); wk.flush();
    wheels.push({ piv, t: -1 });
  }
  // the gauge: its case and face in the kit, the needle on a pivot
  k.add(cyl(0.03, 0.03, 0.12, 8), brass, RX, GAUGE.y - GAUGE.r - 0.04, RZ + 0.08);
  k.at(RX, GAUGE.y, RZ + 0.08, 0, () => {
    k.add(cyl(GAUGE.r * 1.12, GAUGE.r * 1.12, 0.06, 24), brass, 0, 0, 0.0, 0, { rx: Math.PI / 2 });
    k.add(torus(GAUGE.r * 1.06, GAUGE.r * 0.08, 6, 24), brass, 0, 0, 0.045);
    k.add(disc(GAUGE.r, 24), MAT.map(dialTex(), 0.5), 0, 0, 0.04);   // (FLICKER-142: the dial 1 cm off its case, not 2 mm)
  });
  const needle = new THREE.Group(); needle.position.set(RX, GAUGE.y, RZ + 0.08 + 0.04); g.add(needle);
  { const nm = new THREE.Mesh(new THREE.BoxGeometry(GAUGE.r * 0.9, 0.014, 0.008).translate(GAUGE.r * 0.36, 0, 0), own({ color: '#a8201a', roughness: 0.4 })); nm.castShadow = false; needle.add(nm);
    const hub = new THREE.Mesh(sphere(0.016, 8, 6), brass); needle.add(hub); }
  const A0 = Math.PI * 0.75, A1 = Math.PI * 0.75 + Math.PI * 1.5;   // (the dial's sweep, from light to heavy)
  // the far side's lamp over the gauge (white), the answer's count under it (amber)
  const callM = own({ color: '#f4f0e0', emissive: '#fff4d8', emissiveIntensity: 0.05 });
  const callLamp = new THREE.Mesh(sphere(0.06, 10, 8), callM); callLamp.position.set(RX, GAUGE.y + GAUGE.r + 0.1, RZ + 0.11); callLamp.castShadow = false; g.add(callLamp);
  k.add(torus(0.065, 0.014, 5, 14), brass, RX, GAUGE.y + GAUGE.r + 0.1, RZ + 0.1);
  k.add(rbox(0.3, 0.09, 0.03, 0.01), brass, RX, GAUGE.y - GAUGE.r - 0.17, RZ + 0.1);
  const countM = [0, 1, 2].map(() => own({ color: '#5a3a10', emissive: '#ffa020', emissiveIntensity: 0 }));
  countM.forEach((m, i) => { const l = new THREE.Mesh(sphere(0.026, 8, 6), m); l.position.set(RX - 0.08 + i * 0.08, GAUGE.y - GAUGE.r - 0.17, RZ + 0.125); l.castShadow = false; g.add(l); });
  // the riser cock: a red T on a stub, across the pipe (shut) or along it (open); Vesk's paper tag on it
  k.add(cyl(0.05, 0.05, 0.14, 10), brass, RX, COCK_Y, RZ + 0.13, 0, { rx: Math.PI / 2 });
  const cock = new THREE.Group(); cock.position.set(RX, COCK_Y, RZ + 0.2); g.add(cock);
  { const ck = new Kit(cock); const red = MAT.paint('#c8302a', 0.4);
    ck.add(cyl(0.025, 0.025, 0.36, 8), red, 0, 0, 0.0, 0, { rz: Math.PI / 2 });
    for (const s of [-1, 1]) ck.add(sphere(0.035, 8, 6), red, s * 0.18, 0, 0);
    ck.flush(); }
  const tagM = MAT.map(canvasTex(96, 128, (x, Wd, Hd) => {
    x.fillStyle = '#efe4c4'; x.fillRect(0, 0, Wd, Hd); x.fillStyle = '#7a1e18'; x.fillRect(0, 0, Wd, 22);
    x.fillStyle = '#2a2a2a'; x.textAlign = 'center'; x.font = "bold 17px 'Arial Narrow', Arial, sans-serif";
    x.fillText('SHAFT', Wd / 2, 52); x.fillText('CLOSED', Wd / 2, 74); x.font = "italic bold 22px Georgia, serif"; x.fillText('V.', Wd / 2, 106);
    x.fillStyle = '#c8c0a8'; x.beginPath(); x.arc(Wd / 2, 11, 5, 0, 7); x.fill();
  }), 0.9, { side: THREE.DoubleSide });
  const tag = new THREE.Mesh(plane(0.11, 0.15), tagM); tag.position.set(RX + 0.12, COCK_Y - 0.1, RZ + 0.23); tag.rotation.z = 0.12; tag.castShadow = false; g.add(tag);
  k.flush();
  // colliders: the riser, the header (a walker, never a stand)
  game.physics.add({ type: 'cyl', ...W(RX, RZ), r: 0.16, top: RISER.top + 0.1, noStand: true });
  game.physics.add({ type: 'box', ...W((RX + HEADER.x1) / 2 + 0.05, RZ + 0.04), hw: (HEADER.x1 - RX) / 2 + 0.05, hd: 0.15, rot: 0, top: HEADER.y + 0.3, noStand: true, seeThrough: true });

  let cockT = 0, cockGoal = 0, shakeK = 0, t = 0;
  const QR = {
    group: g,
    riser: { ...W(RX, RZ), y: GAUGE.y },
    wheels: WHEELS.map((w) => ({ w: w.w, ...W(w.x, WZ + 0.02), y: HEADER.y, a: Math.PI })),
    cock: { ...W(RX, RZ + 0.2), y: COCK_Y, a: Math.PI },
    state: { open: false, needle: 0, call: 0, count: 0 },
    setNeedle(v) { const u = Math.min(1, Math.max(0, v)); this.state.needle = u; needle.rotation.z = -(A0 + u * (A1 - A0)); },
    setCall(kk) { this.state.call = kk; callM.emissiveIntensity = 0.05 + 3.2 * kk; },
    setCount(n) { this.state.count = n; countM.forEach((m, i) => { m.emissiveIntensity = i < n ? 2.4 : 0; m.color.set(i < n ? '#ffd080' : '#5a3a10'); }); },
    snap(i) { if (wheels[i]) wheels[i].t = 0; },
    shake(kk) { shakeK = Math.max(shakeK, kk); },
    setCock(open, instant = false) { this.state.open = !!open; cockGoal = open ? 1 : 0; if (instant) cockT = cockGoal; tag.visible = !open; },
    update(dt) {
      t += dt;
      for (const w of wheels) if (w.t >= 0) { w.t += dt; const u = w.t < 0.12 ? w.t / 0.12 : Math.max(0, 1 - (w.t - 0.12) / 0.3); w.piv.rotation.z = -1.6 * u; if (w.t > 0.42) { w.t = -1; w.piv.rotation.z = 0; } }
      if (cockT !== cockGoal) cockT = cockGoal > cockT ? Math.min(cockGoal, cockT + dt / 0.5) : Math.max(cockGoal, cockT - dt / 0.5);
      cock.rotation.z = cockT * Math.PI / 2;
      shakeK = Math.max(0, shakeK - dt * 6);
      g.position.x = shakeK > 0.001 ? Math.sin(t * 90) * 0.012 * shakeK : 0;
    },
  };
  QR.setNeedle(0); QR.setCall(0); QR.setCount(0); QR.setCock(false, true);
  R.updaters.push((dt) => QR.update(dt));
  return QR;
}

export function buildHorn(game, R) {
  const O = R.group.position;
  const g = new THREE.Group(); g.name = 'qc-horn'; R.group.add(g);
  const k = new Kit(g), brass = MAT.brass();
  const { x: X, y: Y, z: Z } = HORN;
  // the riser's end: down the wall from the cable trays, a brass bell turned to the room, a lamp and a plate
  k.add(pipe([[X - 0.06, 3.1, Z], [X - 0.06, Y + 0.12, Z], [X + 0.1, Y, Z]], 0.045, 0.1, 8), MAT.paint('#56707a', 0.5), 0, 0, 0);
  k.add(torus(0.055, 0.015, 5, 12), brass, X - 0.06, 2.4, Z, 0, { rx: Math.PI / 2 });
  // (the bell: a lathe along +x, its mouth to the room)
  k.add(P.lathe([[0.045, 0], [0.05, 0.08], [0.07, 0.16], [0.12, 0.24], [0.15, 0.27], [0.14, 0.275], [0.11, 0.25], [0.001, 0.25]], 18), brass, X + 0.08, Y, Z, 0, { rz: -Math.PI / 2 });
  k.add(disc(0.11, 18), MAT.flat('#1a1612', 0.9), X + 0.34, Y, Z, Math.PI / 2);   // (FLICKER-142: inside the bell's mouth, not in its cap)
  k.add(plane(0.36, 0.14), sign(['RISER 2 · SHAFT'], 256, 96), X - 0.03, Y + 0.4, Z, Math.PI / 2);
  const lampM = own({ color: '#203a20', emissive: '#40e060', emissiveIntensity: 0 });
  const lamp = new THREE.Mesh(sphere(0.035, 10, 8), lampM); lamp.position.set(X + 0.02, Y + 0.24, Z + 0.22); lamp.castShadow = false; g.add(lamp);
  k.add(torus(0.04, 0.01, 5, 12), brass, X - 0.01, Y + 0.24, Z + 0.22, Math.PI / 2);
  k.flush();
  let open = false, pk = 0;
  const QH = {
    group: g,
    horn: { x: O.x + X + 0.3, z: O.z + Z, y: Y },
    state: { open: false },
    setOpen(b) { open = !!b; this.state.open = open; this.pulse(0); },
    pulse(kk) { pk = Math.max(pk, kk); },
    update(dt) { pk = Math.max(0, pk - dt * 3); lampM.emissiveIntensity = open ? 1.1 + 2.0 * pk : 0; lampM.color.set(open ? '#b0ffc0' : '#203a20'); },
  };
  QH.setOpen(false);
  R.updaters.push((dt) => QH.update(dt));
  return QH;
}
