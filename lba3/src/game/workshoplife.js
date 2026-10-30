// Baldino's workshop, years on (called from interiors.js buildWorkshop). What an inventor's room gathers over
// time, each thing where it would be used:
//   - the relay table (his active project, laid out in order): two bench relays of the kind he builds for the
//     network in chapter 10, one heat coupler feeding them under a drip can, a lever, a SYNC panel of five lamps,
//     trays of parts in rows, the relay housing drawn by Ilo (an Esmer engineer from the shuttle yard) and him;
//   - the old hoist (an A-frame with a crank, older than Arthur) by the flying machine's nose: the second relay
//     hangs from it, low behind the nose (the pair can't see each other) or raised clear above it;
//   - the stove fan, mended so often its three blades are brass, wood and tin;
//   - the failed experiment: a kettle wired to a coupler boiled dry, its lid is stuck in the vault above, tea up
//     the wall, a note "TEA: BY HAND";
//   - the thunder box on the curio shelf, stopping a toy mill for three seconds in every thirteen (the pulse tool
//     Baldino hands over in chapter 10, before it was ready);
//   - Ilo's perch at the drafting table and a crate of shuttle-yard parts "RETURN TO ILO".
// The story layer (src/game/story/workshop.js) runs the test pair and the looks.
//
// R.life (world {x, z}): spots {lever, tap, crank, fan, pulse, kettle, crate} ({x, z, r});
//   state {on, up, tap, heat, sync, done, pulse} (written by the story every frame; the room's updater animates it);
//   lift (0 = hoist down … 1 = up, as it moves); snap() (jump to the state at once: loads); coupler {x, y, z}
import * as THREE from 'three';
import { Kit, MAT, rbox, plane, cyl, sphere, lathe, torus, pipe, canvasTex } from './props.js';
import * as P from './props.js';
import { buildRelay } from './valveroom.js';

// a paper label or note
const noteTex = (lines, { w = 128, h = 96, bg = '#f8f2d8', ink = '#3a4a8a', font = '14px cursive, serif', dy = 18 } = {}) => canvasTex(w, h, (x, W, H) => {
  x.fillStyle = bg; x.fillRect(0, 0, W, H); x.fillStyle = ink; x.font = font;
  lines.forEach((l, i) => x.fillText(l, 8, 22 + i * dy));
});
// Ilo and Baldino's drawing of the relay housing: his brown scrawl, her neat teal Esmer script in the margins
const drawingTex = () => canvasTex(256, 192, (x, W, H) => {
  x.fillStyle = '#efe4c4'; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(70,46,28,0.9)'; x.lineWidth = 2;
  x.strokeRect(70, 70, 90, 60); x.beginPath(); x.moveTo(140, 70); x.lineTo(140, 16); x.moveTo(126, 22); x.lineTo(154, 22); x.stroke();
  x.beginPath(); x.arc(92, 100, 9, 0, 7); x.stroke();
  for (const lx of [78, 152]) { x.beginPath(); x.moveTo(lx, 130); x.lineTo(lx - 6, 170); x.stroke(); }
  x.font = 'italic 13px Georgia, serif'; x.fillStyle = 'rgba(70,46,28,0.9)'; x.fillText('mast!', 150, 46); x.fillText('B.', 20, 180);
  // her hand: tidy rows of round glyphs, a corrected dimension circled
  x.strokeStyle = '#2a7a7a'; x.fillStyle = '#2a7a7a'; x.lineWidth = 1.6;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { const cx = 180 + c * 16, cy = 84 + r * 18; x.beginPath(); x.arc(cx, cy, 5, 0.3 * c, 0.3 * c + 4.6); x.stroke(); x.fillRect(cx - 1, cy - 1, 2, 2); }
  x.beginPath(); x.ellipse(115, 148, 26, 10, 0, 0, 7); x.stroke(); x.font = '12px sans-serif'; x.fillText('42 → 46', 94, 152);
  x.font = 'bold 13px sans-serif'; x.fillText('ILO', 206, 180);
});
// tea up the wall: a soot ring low down, brown runs and splashes rising to the vault
const teaTex = () => canvasTex(128, 512, (x, W, H) => {
  x.clearRect(0, 0, W, H);
  const g = x.createRadialGradient(64, 480, 4, 64, 480, 58); g.addColorStop(0, 'rgba(30,22,16,0.8)'); g.addColorStop(1, 'rgba(30,22,16,0)');
  x.fillStyle = g; x.fillRect(0, 380, W, 132);
  const tea = (a) => `rgba(128,72,26,${a})`;
  // the jet: drops thinning out as they rise
  for (let i = 0; i < 18; i++) { const y = 430 - i * 21, s = 2 + (i % 3); x.fillStyle = tea(0.7); x.beginPath(); x.ellipse(64 + Math.sin(i * 2.3) * (4 + i * 0.6), y, s, s * 1.6, 0, 0, 7); x.fill(); }
  // the splat at the top, with spikes
  x.fillStyle = tea(0.72); x.beginPath();
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * Math.PI * 2, r = i % 2 ? 22 : 40 + (i % 5) * 6; x.lineTo(64 + Math.cos(a) * r, 48 + Math.sin(a) * r * 0.8); }
  x.fill();
  for (let i = 0; i < 14; i++) { const a = i * 0.45, d = 46 + (i % 4) * 8; x.beginPath(); x.arc(64 + Math.cos(a) * d, 48 + Math.sin(a) * d * 0.8, 3 + (i % 3), 0, 7); x.fill(); }
  // runs dripping down from the splat
  x.strokeStyle = tea(0.6); x.lineCap = 'round';
  for (const [x0, l, w] of [[40, 150, 5], [58, 230, 6], [76, 110, 4], [90, 180, 5], [50, 90, 3]]) { x.lineWidth = w; x.beginPath(); x.moveTo(x0, 60); x.lineTo(x0 + 1, 60 + l); x.stroke(); x.beginPath(); x.arc(x0 + 1, 60 + l, w * 0.9, 0, 7); x.fillStyle = tea(0.6); x.fill(); }
});
const labelTex = (lines, bg, fg) => canvasTex(256, 112, (x, W, H) => {
  x.fillStyle = bg; x.fillRect(0, 0, W, H); x.strokeStyle = fg; x.lineWidth = 4; x.strokeRect(6, 6, W - 12, H - 12);
  x.fillStyle = fg; x.textAlign = 'center'; x.font = 'bold 26px sans-serif'; x.fillText(lines[0], W / 2, 46); x.font = '20px sans-serif'; if (lines[1]) x.fillText(lines[1], W / 2, 84);
});

export function dressWorkshop(B, R, { glowSprite, H }) {
  const k = B.k, L = (R.life = {}), g = B.group, LX = -B.W / 2, BZ = -B.D / 2;
  const brass = MAT.brass(), iron = MAT.iron(), wood = MAT.wood('dark');
  const spot = (x, z, r) => ({ ...B.world(x, z), r });
  L.state = { on: false, up: false, tap: false, heat: 0, sync: 0, done: false, pulse: true };
  L.lift = 0;
  let snap = true;
  L.snap = () => { snap = true; };
  const glow = (c, s, x, y, z) => { const sp = glowSprite(c, s, 0.85); sp.position.set(x, y, z); sp.visible = false; g.add(sp); return sp; };

  // ------------------------------------------------ the relay table (near rim), his project laid out in order
  const tx0 = -3.0, tx1 = -1.35, tz = 3.05, th = 0.86, td = 0.5, tcx = (tx0 + tx1) / 2, tw = tx1 - tx0;
  {
    const top = MAT.wood('honey');
    k.add(rbox(tw, 0.05, td, 0.015), top, tcx, th - 0.025, tz, 0, { jit: true });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(rbox(0.06, th - 0.05, 0.06, 0.012), wood, tcx + sx * (tw / 2 - 0.06), (th - 0.05) / 2, tz + sz * (td / 2 - 0.06));
    k.add(rbox(tw - 0.1, 0.03, td - 0.08, 0.01), wood, tcx, 0.22, tz);
    // under the top: spare relay boxes in a row, waiting for masts
    for (let i = 0; i < 4; i++) k.add(rbox(0.24, 0.17, 0.2, 0.02), brass, tx0 + 0.28 + i * 0.37, 0.33, tz);
    B.col(tcx, tz, tw / 2, td / 2, th, { noStand: true });
  }
  // the lever that starts the pair (a knife switch on a slate block)
  const lvX = -2.45, lvZ = 2.94;
  k.add(rbox(0.24, 0.05, 0.18, 0.012), MAT.flat('#3a3e44', 0.6), lvX, th + 0.025, lvZ);
  for (const s of [-1, 1]) k.add(rbox(0.03, 0.06, 0.05, 0.006), brass, lvX + s * 0.06, th + 0.08, lvZ);
  const lever = new THREE.Group(); lever.position.set(lvX, th + 0.08, lvZ); g.add(lever);
  { const lk = new Kit(lever); lk.add(cyl(0.012, 0.012, 0.22, 6), MAT.steel(), 0, 0.11, 0); lk.add(sphere(0.035, 10, 8), MAT.paint('#c8302a', 0.4), 0, 0.23, 0); lk.flush(); }
  // the bench relays: the network's own model, at a bench scale (lamps get a glow so the pair reads from the camera)
  const RS = 0.55;
  const relayA = buildRelay(); relayA.scale.setScalar(RS); relayA.position.set(-2.72, th, 3.13); g.add(relayA);
  const lampA = new THREE.Vector3(-2.72 - 0.2 * RS, th + 1.0 * RS, 3.13);
  const glowA = glow('#ffc060', 0.42, lampA.x, lampA.y, lampA.z);
  // the drawing, a tidy row of trays (masts, coils, lamps), Ilo's cup, the fee tin
  k.add(plane(0.26, 0.2), MAT.map(drawingTex(), 0.9), -2.43, th + 0.004, 3.17, 0.06, { rx: -Math.PI / 2 });
  const trayC = ['#3f6a8a', '#8a5a2a', '#3f7a4a'];
  for (let i = 0; i < 3; i++) {
    const x = -2.17 + i * 0.19;
    k.add(rbox(0.17, 0.04, 0.2, 0.008), MAT.paint(trayC[i], 0.6), x, th + 0.02, 3.18);
    for (let j = 0; j < 3; j++) {
      const px = x - 0.05 + j * 0.05;
      if (i === 0) k.add(cyl(0.006, 0.006, 0.18, 4), iron, px, th + 0.05, 3.18, 0, { rx: Math.PI / 2 });
      else if (i === 1) k.add(P.helixGeo(0.016, 0.04, 6, 0.004), MAT.copper(), px, th + 0.04, 3.18);
      else P.bulb(k, px, th + 0.04, 3.18, 0.5);
    }
  }
  k.at(-1.44, th, 2.9, 0.4, () => { k.add(lathe([[0.001, 0], [0.035, 0], [0.045, 0.05], [0.04, 0.08], [0.001, 0.08]], 12), MAT.flat('#e89a7a', 0.45), 0, 0, 0); k.add(torus(0.03, 0.007, 4, 10), MAT.flat('#2a7a7a', 0.5), 0, 0.05, 0.0, 0, { sy: 0.4 }); });
  k.add(cyl(0.05, 0.05, 0.06, 12), MAT.paint('#6a7a3a', 0.4), -2.92, th + 0.03, 2.9);
  L.tin = { ...B.world(-2.92, 2.75), y: th + 0.1 };
  k.add(plane(0.09, 0.05), MAT.map(noteTex(['FEE'], { w: 64, h: 32, font: 'bold 18px sans-serif', ink: '#2a2a2a', dy: 0 }), 0.9), -2.92, th + 0.061, 2.9, 0, { rx: -Math.PI / 2 });
  // the SYNC panel: five lamps that fill while the pair holds together
  const spX = -1.9, spZ = 2.9;
  k.add(rbox(0.5, 0.03, 0.1, 0.01), brass, spX, th + 0.015, spZ);
  k.add(plane(0.16, 0.05), MAT.map(noteTex(['SYNC'], { w: 128, h: 40, bg: '#2a2a2a', ink: '#f4e8c8', font: 'bold 26px sans-serif', dy: 6 }), 0.8), spX - 0.33, th + 0.004, spZ, 0, { rx: -Math.PI / 2 });
  const syncM = [], syncG = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.MeshStandardMaterial({ color: '#a8f0b0', emissive: '#30d060', emissiveIntensity: 0, roughness: 0.4 });
    const s = new THREE.Mesh(sphere(0.032, 10, 6), m); s.scale.y = 0.7; s.position.set(spX - 0.18 + i * 0.09, th + 0.035, spZ); g.add(s);
    syncM.push(m); syncG.push(glow('#80ff90', 0.2, s.position.x, s.position.y + 0.03, s.position.z));
  }
  // the coupler in its cradle, the drip can over it on a post, cables to the lever and the relay
  const cX = -1.6, cZ = 3.04, cY = th;
  const cm = new THREE.MeshStandardMaterial({ color: '#c89a4a', roughness: 0.35, metalness: 0.75, emissive: '#ff5a1a', emissiveIntensity: 0 });
  for (const s of [-1, 1]) k.add(torus(0.1, 0.015, 4, 12, Math.PI), brass, cX + s * 0.08, cY + 0.1, cZ, Math.PI / 2, { rz: Math.PI });
  { const ck = new Kit(g); ck.add(cyl(0.09, 0.09, 0.2, 14), cm, cX, cY + 0.12, cZ, 0, { rz: Math.PI / 2 }); for (let i = 0; i < 6; i++) ck.add(rbox(0.16, 0.015, 0.06, 0.004), cm, cX, cY + 0.12 + Math.cos(i) * 0.1, cZ + Math.sin(i) * 0.1, 0, { rx: -i }); ck.flush(); }
  const heatGlow = glow('#ff7a30', 0.5, cX, cY + 0.15, cZ);
  L.coupler = { ...B.world(cX, cZ), y: cY + 0.15 };
  k.add(cyl(0.015, 0.02, 0.75, 6), iron, cX + 0.18, cY + 0.375, cZ + 0.12);
  k.add(rbox(0.22, 0.02, 0.03, 0.006), iron, cX + 0.09, cY + 0.72, cZ + 0.12);
  k.add(lathe([[0.001, 0], [0.06, 0], [0.08, 0.04], [0.08, 0.16], [0.06, 0.18], [0.001, 0.18]], 14), MAT.copper(), cX, cY + 0.5, cZ + 0.06);
  k.add(cyl(0.008, 0.008, 0.08, 6), MAT.copper(), cX, cY + 0.46, cZ + 0.06);
  const tapH = new THREE.Group(); tapH.position.set(cX + 0.02, cY + 0.47, cZ + 0.06); g.add(tapH);
  { const tk = new Kit(tapH); tk.add(rbox(0.09, 0.015, 0.015, 0.004), MAT.paint('#c8302a', 0.4), 0.045, 0, 0); tk.flush(); }
  k.add(plane(0.12, 0.07), MAT.map(noteTex(['SHUT.', 'my sandwich!'], { w: 128, h: 72, font: '15px cursive, serif' }), 0.9), cX + 0.08, cY + 0.62, cZ + 0.142, Math.PI);
  const drops = [];
  for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(sphere(0.012, 6, 4), MAT.flat('#9fd0f0', 0.1)); d.visible = false; d.position.set(cX, cY + 0.42, cZ + 0.06); g.add(d); drops.push(d); }
  k.add(pipe([[cX, th + 0.05, cZ + 0.1], [cX - 0.15, th + 0.01, 3.27], [lvX + 0.1, th + 0.01, 3.27], [lvX + 0.08, th + 0.02, lvZ + 0.1]], 0.01, 0.1, 5), MAT.flat('#1a1a1a', 0.6), 0, 0, 0);
  k.add(pipe([[lvX - 0.1, th + 0.02, lvZ + 0.1], [-2.6, th + 0.01, 3.27], [-2.72, th + 0.15, 3.13]], 0.01, 0.06, 5), MAT.flat('#1a1a1a', 0.6), 0, 0, 0);

  // ------------------------------------------------ the old hoist by the flying machine's nose
  const hx0 = 2.5, hx1 = 3.85, hz = 0.6, beamY = 2.62, hX = 3.17;
  for (const x of [hx0, hx1]) {
    for (const s of [-1, 1]) k.add(rbox(0.09, 2.66, 0.09, 0.015), wood, x, beamY / 2, hz + s * 0.22, 0, { rx: -s * 0.17 });
    k.add(rbox(0.07, 0.07, 0.8, 0.012), wood, x, 0.55, hz);
    for (const s of [-1, 1]) B.ccol(x, hz + s * 0.44, 0.09, 2.6, { noStand: true });
    B.col(x, hz, 0.06, 0.44, 0.62, { noStand: true });   // (the low cross bar: walked into, not through)
  }
  k.add(rbox(hx1 - hx0 + 0.24, 0.12, 0.12, 0.02), MAT.paint('#3a4a5a', 0.5), (hx0 + hx1) / 2, beamY, hz);
  k.add(rbox(0.2, 0.1, 0.16, 0.02), iron, hX, beamY - 0.1, hz);
  // a brass plate: the hoist's own long history (worn), and the crank wheel on the near leg
  k.add(plane(0.24, 0.11), MAT.map(noteTex(['B. HOIST', 'No. 1'], { w: 128, h: 64, bg: '#c8a050', ink: '#3a2a10', font: 'bold 16px serif' }), 0.5), (hx0 + hx1) / 2, beamY, hz + 0.065);
  const crank = new THREE.Group(); crank.position.set(hx0 + 0.07, 1.05, hz - 0.36); g.add(crank);
  { const ck = new Kit(crank); ck.add(torus(0.16, 0.018, 5, 16), iron, 0, 0, 0, Math.PI / 2); for (let i = 0; i < 4; i++) ck.add(rbox(0.02, 0.3, 0.02, 0.005), iron, 0, 0, 0, 0, { rx: i * Math.PI / 4 }); ck.add(cyl(0.015, 0.015, 0.12, 6), MAT.wood('red'), 0.06, 0.16, 0, 0, { rz: Math.PI / 2 }); ck.flush(); }
  const chainM = MAT.flat('#5a5a60', 0.5, { metalness: 0.6 });
  const chain = new THREE.Mesh(cyl(0.012, 0.012, 1, 5), chainM); chain.position.set(hX, beamY - 0.5, hz); g.add(chain);
  const cradle = new THREE.Group(); cradle.position.set(hX, 0.32, hz); g.add(cradle);
  {
    const ck = new Kit(cradle);
    ck.add(rbox(0.46, 0.04, 0.42, 0.01), MAT.wood('pale'), 0, 0, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) ck.add(cyl(0.006, 0.006, 1.2, 4), MAT.cloth('#c9a66b', '#7a5a30'), sx * 0.11, 0.58, sz * 0.1, 0, { rx: -sz * 0.18, rz: sx * 0.19 });
    ck.add(torus(0.05, 0.012, 5, 10), iron, 0, 1.14, 0);
    ck.flush();
  }
  const relayB = buildRelay(); relayB.scale.setScalar(RS); relayB.position.set(0, 0.02, 0); cradle.add(relayB);
  // the cradle and its relay are solid, wherever the hoist has them (low: he can't stand in it; up: head height)
  const cradleCol = B.col(hX, hz, 0.26, 0.24, 0.32 + 0.62, { noStand: true, bottom: 0.27 });
  const glowB = glow('#ffc060', 0.42, 0, 0, 0);
  const lampBOff = new THREE.Vector3(-0.2 * RS, 0.02 + 1.0 * RS, 0);
  const LOW = 0.32, HIGH = 1.32;
  // the link between the two lamps when they hear each other
  const beamM = new THREE.MeshBasicMaterial({ color: '#ffe0a0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1, 6, 1, true), beamM); beam.visible = false; g.add(beam);
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);

  // ------------------------------------------------ the stove fan (left wall), mended again and again
  const fX = -3.62, fZ = -0.2;
  k.add(cyl(0.2, 0.22, 0.05, 16), iron, fX, 0.025, fZ);
  k.add(cyl(0.025, 0.03, 1.1, 8), iron, fX, 0.6, fZ);
  for (const y of [0.45, 0.52, 0.85]) k.add(torus(0.032, 0.006, 4, 10), MAT.copper(), fX, y, fZ, 0, { rx: Math.PI / 2 });
  k.add(cyl(0.08, 0.08, 0.2, 12), MAT.paint('#5a6a4a', 0.5), fX + 0.02, 1.18, fZ, 0, { rz: Math.PI / 2 });
  k.add(cyl(0.083, 0.083, 0.05, 12), MAT.flat('#e8e0c8', 0.9), fX + 0.05, 1.18, fZ, 0, { rz: Math.PI / 2 });
  const fan = new THREE.Group(); fan.position.set(fX + 0.16, 1.18, fZ); g.add(fan);
  {
    const fk = new Kit(fan);
    const blades = [brass, MAT.wood('honey'), MAT.paint('#7a9ab8', 0.35)];
    blades.forEach((m, i) => fk.add(rbox(0.02, 0.36, 0.13, 0.01), m, 0, Math.cos(i * 2.094) * 0.2, Math.sin(i * 2.094) * 0.2, 0, { rx: -i * 2.094 }));
    fk.add(sphere(0.035, 10, 8), brass, 0.01, 0, 0);
    fk.flush();
  }
  k.add(plane(0.1, 0.07), MAT.map(noteTex(['FIXED', '|||| |'], { w: 96, h: 64, font: 'bold 15px sans-serif', ink: '#5a2a1a' }), 0.9), fX + 0.03, 0.9, fZ + 0.035);
  B.ccol(fX, fZ, 0.24, 1.3, { noStand: true });

  // ------------------------------------------------ the thunder box and the toy mill it stops (top of the curio shelf)
  const pbX = LX + 0.3, pbY = 2.23, pbZ = -1.55;
  const pulse = new THREE.Group(); pulse.position.set(pbX, pbY, pbZ); g.add(pulse);
  {
    const pk = new Kit(pulse);
    pk.add(rbox(0.3, 0.22, 0.28, 0.025), MAT.wood('red'), 0, 0.11, 0);
    pk.add(lathe([[0.03, 0], [0.04, 0.08], [0.1, 0.2], [0.11, 0.21]], 14), brass, 0.16, 0.15, 0, 0, { rz: -Math.PI / 2 });
    pk.add(cyl(0.01, 0.01, 0.12, 5), iron, 0, 0.16, 0.17, 0, { rx: Math.PI / 2 });
    pk.add(sphere(0.025, 8, 6), MAT.paint('#c8302a', 0.4), 0, 0.16, 0.23);
    pk.add(plane(0.26, 0.07), MAT.map(noteTex(['THUNDER BOX'], { w: 192, h: 48, bg: '#f4ead0', ink: '#7a1a10', font: 'bold 20px sans-serif', dy: 6 }), 0.9), 0.151, 0.07, 0, Math.PI / 2);
    pk.flush();
  }
  const millX = LX + 0.3, millZ = -0.95;
  k.add(cyl(0.05, 0.075, 0.4, 8), MAT.plaster('#e4d8ee'), millX, pbY + 0.2, millZ);
  k.add(lathe([[0.001, 0], [0.075, 0], [0.001, 0.1]], 8), MAT.paint('#8a5ac0', 0.5), millX, pbY + 0.4, millZ);
  const sails = new THREE.Group(); sails.position.set(millX + 0.09, pbY + 0.33, millZ); g.add(sails);
  { const sk = new Kit(sails); for (let i = 0; i < 4; i++) sk.add(rbox(0.008, 0.2, 0.05, 0.002), MAT.cloth('#efe2c4', '#c8b490'), 0, Math.cos(i * Math.PI / 2) * 0.11, Math.sin(i * Math.PI / 2) * 0.11, 0, { rx: -i * Math.PI / 2 }); sk.add(sphere(0.02, 6, 4), brass, 0, 0, 0); sk.flush(); }
  const zap = glow('#c8a0ff', 0.4, pbX + 0.3, pbY + 0.16, pbZ);

  // ------------------------------------------------ the failed experiment: tea by coupler (back wall, by the radio)
  const kX = 0.6, kZ = BZ + 0.38;
  k.add(cyl(0.2, 0.2, 0.03, 16), iron, kX, 0.68, kZ);
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.3; k.add(cyl(0.012, 0.016, 0.7, 5), iron, kX + Math.cos(a) * 0.13, 0.34, kZ + Math.sin(a) * 0.13, 0, { rx: Math.sin(a) * 0.12, rz: -Math.cos(a) * 0.12 }); }
  const scorch = MAT.flat('#2e2a26', 0.55, { metalness: 0.3 });
  k.add(cyl(0.08, 0.08, 0.13, 12), scorch, kX, 0.76, kZ);
  for (let i = 0; i < 5; i++) k.add(rbox(0.012, 0.11, 0.05, 0.003), scorch, kX + Math.cos(i * 1.26) * 0.085, 0.76, kZ + Math.sin(i * 1.26) * 0.085, -i * 1.26);
  k.at(kX, 0.83, kZ, 0.6, () => {
    k.add(lathe([[0.001, 0], [0.1, 0], [0.12, 0.05], [0.115, 0.12], [0.07, 0.17], [0.065, 0.175]], 14), MAT.flat('#3a3632', 0.4, { metalness: 0.3 }), 0, 0, 0);
    k.add(pipe([[0.09, 0.06, 0], [0.18, 0.12, 0], [0.22, 0.2, 0]], 0.018, 0.05, 6), MAT.flat('#3a3632', 0.4, { metalness: 0.3 }), 0, 0, 0);
    k.add(torus(0.08, 0.012, 5, 12, Math.PI), MAT.flat('#2a1a10', 0.6), 0, 0.17, 0);
  });
  k.add(pipe([[kX + 0.08, 0.76, kZ + 0.05], [kX + 0.25, 0.4, kZ + 0.1], [kX + 0.3, 0.02, kZ + 0.05]], 0.008, 0.06, 4), MAT.flat('#1a1a1a', 0.6), 0, 0, 0);
  k.add(plane(0.5, 2.7), MAT.map(teaTex(), 0.95, { transparent: true, depthWrite: false }), kX, 2.06, BZ + 0.045);
  k.add(plane(0.2, 0.13), MAT.map(noteTex(['TEA:', 'BY HAND.'], { w: 128, h: 80, font: 'bold 17px cursive, serif', ink: '#7a1a10', dy: 22 }), 0.9), kX - 0.12, 1.32, BZ + 0.05, 0, { rz: 0.08 });
  // the lid, stuck in the vault overhead, with cracks round it
  {
    // the vault's cove here: a circle about (z = BZ + c, y = H); at angle a its surface faces (y -sin a, z cos a)
    const c = 0.95, a = 0.4, ny = -Math.sin(a), nz = Math.cos(a), ly = H + c * Math.sin(a) + ny * 0.012, lz = BZ + c * (1 - Math.cos(a)) + nz * 0.012;
    k.add(lathe([[0.001, 0.03], [0.1, 0.0], [0.105, 0.012], [0.03, 0.04], [0.025, 0.07], [0.001, 0.075]], 14), MAT.flat('#3a3632', 0.4, { metalness: 0.3 }), kX, ly, lz, 0, { rx: Math.PI / 2 + a });
    // tea round it on the vault, and cracks (laid in the surface: x along the wall, y up the cove)
    const splat = canvasTex(128, 128, (x, W) => { x.clearRect(0, 0, W, W); x.fillStyle = 'rgba(128,72,26,0.7)'; x.beginPath(); for (let i = 0; i <= 20; i++) { const b = (i / 20) * Math.PI * 2, r = i % 2 ? 26 : 44 + (i % 3) * 8; x.lineTo(64 + Math.cos(b) * r, 64 + Math.sin(b) * r); } x.fill(); for (let i = 0; i < 10; i++) { x.beginPath(); x.arc(64 + Math.cos(i * 0.63) * 58, 64 + Math.sin(i * 0.63) * 58, 3 + (i % 3), 0, 7); x.fill(); } });
    k.add(plane(0.34, 0.34), MAT.map(splat, 0.95, { transparent: true, depthWrite: false }), kX, ly - ny * 0.006, lz - nz * 0.006, 0, { rx: a });
    for (let i = 0; i < 6; i++) {
      const th2 = i * 1.05 + 0.3, d = 0.15 + (i % 2) * 0.03, u = Math.sin(th2) * d;
      k.add(rbox(0.1 + (i % 3) * 0.04, 0.012, 0.008, 0.002), MAT.flat('#4a3a44', 0.9), kX + Math.cos(th2) * d, ly + u * Math.cos(a), lz + u * Math.sin(a), 0, { rx: a, rz: th2 });
    }
  }
  B.col(kX, kZ, 0.22, 0.22, 0.95, { noStand: true });

  // ------------------------------------------------ Ilo's perch at the drafting table, the shuttle yard's crate
  const piX = LX + 1.15, piZ = 1.75;
  k.add(cyl(0.16, 0.2, 0.04, 14), iron, piX, 0.02, piZ);
  k.add(cyl(0.04, 0.05, 0.5, 8), brass, piX, 0.27, piZ);
  k.add(torus(0.16, 0.07, 8, 18), MAT.cloth('#2a8a8a', '#1a5a5a'), piX, 0.58, piZ, 0, { rx: Math.PI / 2 });
  k.add(cyl(0.12, 0.12, 0.05, 14), MAT.cloth('#e89a7a', '#a85a4a'), piX, 0.56, piZ);
  B.ccol(piX, piZ, 0.24, 0.66, { noStand: true, seeThrough: true });
  k.at(3.5, 0, 2.0, 0.2, () => k.add(plane(0.46, 0.2), MAT.map(labelTex(['SHUTTLE YARD', 'return to Ilo'], '#6a4a9a', '#f4ead0'), 0.8), 0, 0.32, 0.302));

  // small moving bits cast no shadow (each caster is drawn again for every shadowed light)
  for (const o of [relayA, relayB, lever, tapH, sails, pulse]) o.traverse((m) => { if (m.isMesh) m.castShadow = false; });

  // ------------------------------------------------ spots
  L.spots = {
    lever: spot(lvX, 2.2, 0.95), tap: spot(cX, 2.2, 0.95), crank: spot(hX - 0.12, -0.05, 1.0),
    fan: spot(fX + 0.62, fZ + 0.05, 0.8), pulse: spot(LX + 0.85, -1.35, 0.8), kettle: spot(kX, BZ + 1.15, 0.9), crate: spot(3.45, 1.35, 0.9),
  };
  L.hoist = B.world(hX, hz);

  // ------------------------------------------------ animation
  let blinkT = 0, dropT = 0, lift = 0, leverA = -0.6, tapA = 0;
  R.updaters.push((dt, tt) => {
    const S = L.state;
    const target = S.up ? 1 : 0;
    if (snap) { lift = target; leverA = S.on || S.done ? 0.6 : -0.6; tapA = S.tap ? -1.2 : 0; snap = false; }
    if (lift !== target) { const st = dt / 1.6; lift = Math.abs(target - lift) <= st ? target : lift + Math.sign(target - lift) * st; crank.rotation.x += dt * 5 * (target ? 1 : -1); }
    L.lift = lift;
    const e = lift * lift * (3 - 2 * lift), yC = LOW + (HIGH - LOW) * e;
    cradle.position.y = yC;
    cradleCol.bottom = yC - 0.05; cradleCol.top = yC + 0.62;   // (room floor at y 0)
    const hookY = yC + 1.14, len = Math.max(0.05, beamY - 0.12 - hookY);
    chain.scale.y = len; chain.position.y = hookY + len / 2;
    cradle.rotation.y = Math.sin(tt * 0.9) * 0.04;
    const on = S.on || S.done, linked = on && lift >= 0.98;
    // lever and tap
    const la = on ? 0.6 : -0.6; leverA += (la - leverA) * Math.min(1, dt * 12); lever.rotation.x = leverA;
    const ta = S.tap ? -1.2 : 0; tapA += (ta - tapA) * Math.min(1, dt * 10); tapH.rotation.y = tapA;
    // lamps: A lights when powered; B answers steady when it can see A, blinks red when it can't
    relayA.userData.setOn(on); glowA.visible = on;
    blinkT += dt;
    _a.copy(lampA); _b.copy(lampBOff).add(cradle.position);
    glowB.position.copy(_b);
    if (linked) { relayB.userData.setOn(true); glowB.visible = true; glowB.material.color.set('#ffc060'); }
    else if (on) { const b = Math.sin(blinkT * 9) > 0; relayB.userData.setOn(b); glowB.visible = b; glowB.material.color.set('#ff5040'); }
    else { relayB.userData.setOn(false); glowB.visible = false; }
    beam.visible = linked;
    if (linked) {
      _d.subVectors(_b, _a); const l = _d.length();
      beam.position.copy(_a).addScaledVector(_d, 0.5); beam.scale.set(1, l, 1); beam.quaternion.setFromUnitVectors(_up, _d.normalize());
      beamM.opacity = 0.35 + 0.25 * Math.sin(tt * 6);
    }
    // the SYNC lamps
    const n = S.done ? 5 : Math.floor(S.sync * 5 + 1e-6);
    for (let i = 0; i < 5; i++) { const lit = i < n; syncM[i].emissiveIntensity = lit ? 2.4 : 0; syncG[i].visible = lit; }
    // the coupler's heat
    cm.emissiveIntensity = S.heat * 2.2;
    heatGlow.visible = S.heat > 0.2; heatGlow.material.opacity = Math.min(0.9, (S.heat - 0.2) * 1.2); heatGlow.scale.setScalar(0.3 + S.heat * 0.4);
    // the drip
    dropT += dt;
    drops.forEach((d, i) => {
      d.visible = S.tap;
      if (!S.tap) return;
      const ph = ((dropT * 1.4 + i / 3) % 1);
      d.position.y = cY + 0.42 - ph * 0.22;
    });
    // the fan wobbles round; the thunder box stops the toy mill for three seconds in every thirteen
    fan.rotation.x += dt * 7; fan.rotation.z = Math.sin(tt * 7) * 0.04;
    pulse.visible = S.pulse;
    const stalled = S.pulse && tt % 13 < 3;
    if (!stalled) sails.rotation.x += dt * 2.2;
    zap.visible = stalled && Math.sin(tt * 40) > 0.3;
  });
  return L;
}
