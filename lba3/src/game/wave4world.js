// WAVE 4 (docs/lba-maturity/WAVE4.md; CONTENT-15H.md §3 H-9, H-10, H-11): the few pieces the three side stories add to
// places that exist (story/wave4.js builds each once its place is built and shows it by the story's state). Our own
// geometry and canvas textures; nothing from LBA1/LBA2.
//
//   Citadel, the garden pond (townlife.js): Arthur's boat (it takes the place of the toy boat that sat on the pond; a
//     red hull, a tall mast, a sail on a boom that turns with its setting, a keel weight under it once fitted, a lamp on
//     the masthead for the ending's signals) and Lulu's boat (a pink hull, a stubby mast, a lead keel: it rests on the
//     rim, so the weight under it shows).
//   Citadel, the harbour: two flag poles at the pier's root, their pennants streaming inland (the wind off the sea); the
//     hostel's mail sack by Officer Odile's customs booth (until it is released).
//   The tavern (tavern.js): Raph's postcard pinned on the wall behind the bar.
//   Otringal, outside the harbour bar's door (otrbar.js's house): Raph's crate seat, his tip jar, the borrowed Esmer harp
//     or his own guitar on his lap. Citadel, the lighthouse's door: the same seat for the ending (the guitar).
//
// CONTRACT (world coordinates)
//   W4                         filled as each part is built
//   buildPondBoats(W)          → W4.pond {x, z, y (the water), r}; W4.boats {arthur, lulu}: Boat
//   Boat: group; setAt(x, y, z, yaw, heel = 0, pitch = 0); setSail(a) (the boom's angle off the hull, rad); setKeel(on);
//         setLamp(on); setMast(lamp: bool) (the masthead lamp shown); visible(on); pos {x,y,z}, yaw
//   buildHarbourBits(W)        → W4.flags [{x,z}] (the poles), W4.sack {x, z, setOn(on)}
//   buildPostcard(R)           (the tavern room) → W4.card {x, z} (the read spot at the counter), W4.cardAt {x,y,z}
//   buildRaphSeat(parent, id, x, z, y, a) → W4.seats[id] {x, z, y, a, sit {x,z,y,a}, set(instrument: 'harp'|'guitar'|null), setOn(on)}
import * as THREE from 'three';
import { Kit, MAT, rbox, cyl, sphere, lathe, plane, slab, canvasTex } from './props.js';
import * as P from './props.js';

export const W4 = { seats: {} };

// a group placed in world coordinates under a parent that may itself be offset (a room's or an island's group)
function worldGroup(parent, name) {
  const g = new THREE.Group(); g.name = name;
  parent.updateMatrixWorld?.(true);
  const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
  inv.decompose(g.position, g.quaternion, g.scale);
  parent.add(g);
  return g;
}

// ================================================================ the model boats
let _halo = null;
const haloTex = () => _halo || (_halo = canvasTex(64, 64, (x, W) => { const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.35, 'rgba(255,220,140,0.55)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, W); }));

// a model boat: its bow toward local +x, its waterline at y = 0
function makeBoat(parent, { hull, deck = 'pale', sail = '#f2ecdc', stripe = null, mast = 0.42, len = 0.52, beam = 0.13, keelSeen = false }) {
  const root = new THREE.Group(); parent.add(root);
  const heel = new THREE.Group(); root.add(heel);   // (heel and pitch about the hull's middle)
  const k = new Kit(heel);
  const hx = len / 2;
  k.add(slab('w4hull' + len, (s) => { s.moveTo(-hx, 0.07); s.quadraticCurveTo(-hx + 0.03, -0.02, -hx + 0.12, -0.025); s.lineTo(hx - 0.14, -0.025); s.quadraticCurveTo(hx - 0.02, -0.01, hx, 0.08); s.lineTo(-hx, 0.08); }, beam, 0.012), MAT.paint(hull, 0.45), 0, 0, 0);
  k.add(rbox(len - 0.12, 0.016, beam - 0.03, 0.005), MAT.wood(deck), -0.02, 0.083, 0);
  k.add(cyl(0.008, 0.009, mast, 6), MAT.wood('dark'), 0.04, 0.085 + mast / 2, 0);
  k.flush();
  // the sail on its boom: a pivot at the mast's foot, the boom along −x (aft) when the angle is 0
  const piv = new THREE.Group(); piv.position.set(0.04, 0.1, 0); heel.add(piv);
  const sk = new Kit(piv);
  const sh = mast - 0.04, sl = len * 0.48;
  sk.add(slab('w4sail' + sh + sl, (s) => { s.moveTo(0, 0); s.lineTo(-sl, 0); s.quadraticCurveTo(-sl * 0.55, sh * 0.45, 0, sh); }, 0.005, 0), MAT.flat(sail, 0.9), -0.004, 0.012, 0);
  if (stripe) sk.add(rbox(sl * 0.62, 0.025, 0.007, 0.002), MAT.flat(stripe, 0.9), -sl * 0.36, 0.08, 0);
  sk.add(cyl(0.006, 0.006, sl, 5), MAT.wood('dark'), -sl / 2, 0.008, 0, 0, { rz: Math.PI / 2 });
  sk.flush();
  // the keel weight: a lead lump on a short fin under the middle
  const keel = new THREE.Group(); heel.add(keel);
  const kk = new Kit(keel);
  kk.add(rbox(0.012, 0.05, 0.1, 0.004), MAT.wood('dark'), 0.0, -0.05, 0, Math.PI / 2);
  kk.add(sphere(0.03, 10, 8), MAT.flat('#5a5e68', 0.45, { metalness: 0.5 }), 0, -0.085, 0, 0, { sx: 1.7, sy: 0.8, sz: 0.9 });
  kk.flush();
  keel.visible = keelSeen;
  // the masthead lamp (the ending): a brass cup with a glass bead, its own glow
  const lampMat = new THREE.MeshStandardMaterial({ color: '#fff4d8', emissive: '#ffc860', emissiveIntensity: 0, roughness: 0.3 });
  const lamp = new THREE.Group(); lamp.position.set(0.04, 0.085 + mast + 0.02, 0); heel.add(lamp);
  const cup = new THREE.Mesh(cyl(0.02, 0.014, 0.025, 8), MAT.brass()); lamp.add(cup);
  const bead = new THREE.Mesh(sphere(0.022, 10, 8), lampMat); bead.position.y = 0.03; lamp.add(bead);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: '#ffd890', transparent: true, depthWrite: false, opacity: 0 })); glow.scale.setScalar(0.7); glow.position.y = 0.03; lamp.add(glow);
  lamp.visible = false;
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const B = {
    group: root, pos: { x: 0, y: 0, z: 0 }, yaw: 0, sail: 0,
    setAt(x, y, z, yaw, h = 0, p = 0) { root.position.set(x, y, z); root.rotation.y = yaw; heel.rotation.set(h, 0, p); B.pos.x = x; B.pos.y = y; B.pos.z = z; B.yaw = yaw; },
    setSail(a) { B.sail = a; piv.rotation.y = a; },
    flap(t, amp) { piv.rotation.y = B.sail + Math.sin(t * 17) * amp; },
    setKeel(on) { keel.visible = !!on; },
    setMast(on) { lamp.visible = !!on; },
    setLamp(on) { lampMat.emissiveIntensity = on ? 2.4 : 0; glow.material.opacity = on ? 0.95 : 0; },
    visible(on) { root.visible = !!on; },
  };
  return B;
}

export function buildPondBoats(game) {
  const W = game.world, L = W.life;
  if (W4.boats || !L?.pond) return W4.boats;
  const g = worldGroup(W.root, 'wave4 pond boats');
  const y = game.physics.groundAt(L.pond.x, L.pond.z) + 0.14;   // (townlife.js: the pond's water disc)
  W4.pond = { x: L.pond.x, z: L.pond.z, y, r: 1.45, rimY: y - 0.14 + 0.22 };
  W4.boats = {
    arthur: makeBoat(g, { hull: '#c8452f', sail: '#f2ecdc', mast: 0.44 }),
    lulu: makeBoat(g, { hull: '#e05a9a', deck: 'honey', sail: '#fff6ea', stripe: '#e05a9a', mast: 0.3, len: 0.46, keelSeen: true }),
  };
  if (L.toyBoat) L.toyBoat.visible = false;   // (Arthur's boat is now this one)
  return W4.boats;
}

// ================================================================ the harbour: the flags, the mail sack
export const FLAGS = [{ x: -116.6, z: 41.3 }, { x: -116.6, z: 44.7 }];
export const SACK = { x: -112.35, z: 37.75 };
export function buildHarbourBits(game) {
  if (W4.flags) return;
  const W = game.world, PH = game.physics;
  const g = worldGroup(W.root, 'wave4 harbour');
  const k = new Kit(g);
  // the pennants fly toward local +x: turned to stream north (+z), inland, away from the sea
  FLAGS.forEach((p, i) => {
    const y = PH.groundAt(p.x, p.z);
    k.at(p.x, y, p.z, -Math.PI / 2, () => P.flagPole(k, { h: 4.4 + i * 0.3, color: i ? '#3b78d8' : '#e8c040', color2: i ? '#f2ead6' : '#c8452f', len: 1.2 }));
    PH.add({ type: 'cyl', x: p.x, z: p.z, r: 0.24, top: y + 4.6, noStand: true });
  });
  k.flush();
  W4.flags = FLAGS.map((p) => ({ ...p }));
  // the mail sack: canvas, tied at the neck, a tag hanging off it
  const sg = new THREE.Group(); g.add(sg);
  const sk = new Kit(sg);
  const sy = PH.groundAt(SACK.x, SACK.z);
  sk.at(SACK.x, sy, SACK.z, 0.5, () => {
    sk.add(lathe([[0.001, 0], [0.2, 0.02], [0.27, 0.16], [0.26, 0.34], [0.17, 0.48], [0.07, 0.55], [0.06, 0.6], [0.001, 0.6]], 14), MAT.cloth('#b8a47a', '#9a8458'), 0, 0, 0, 0, { sx: 1, sz: 0.8 });
    sk.add(cyl(0.075, 0.075, 0.04, 10), MAT.flat('#6a4a2a', 0.9), 0, 0.57, 0);
    sk.add(sphere(0.07, 8, 6), MAT.cloth('#b8a47a', '#9a8458'), 0, 0.64, 0, 0, { sy: 0.7 });
    sk.add(plane(0.11, 0.07), MAT.map(tagTex(), 0.8), 0.08, 0.47, 0.17, 0.3, { rx: -0.1 });
  });
  sk.flush();
  const col = PH.add({ type: 'cyl', x: SACK.x, z: SACK.z, r: 0.26, top: sy + 0.62, noStand: true });
  W4.sack = { x: SACK.x, z: SACK.z, setOn(on) { sg.visible = !!on; if (col && 'enabled' in col) col.enabled = !!on; } };
}
const tagTex = () => canvasTex(96, 64, (x, W, H) => { x.fillStyle = '#f2ead6'; x.fillRect(0, 0, W, H); x.fillStyle = '#b0302c'; x.font = 'bold 17px sans-serif'; x.textAlign = 'center'; x.fillText('CARGO', W / 2, 26); x.font = '12px sans-serif'; x.fillText('UNDECLARED', W / 2, 46); });

// ================================================================ the tavern: Raph's postcard behind the bar
export function buildPostcard(R, plan) {
  if (W4.card || !R?.group) return;
  const g = worldGroup(R.group, 'wave4 postcard');
  const cx = R.center?.x ?? 0, cz = R.center?.z ?? 0;
  const k = new Kit(g);
  const z = 4.85, wx = cx + plan.LX + 0.035, wy = 1.32;
  k.add(plane(0.3, 0.2), MAT.map(cardTex(), 0.85), wx, wy, cz + z, Math.PI / 2);
  k.add(sphere(0.012, 6, 4), MAT.flat('#c8452f', 0.5), wx + 0.006, wy + 0.08, cz + z);
  k.flush();
  W4.cardAt = { x: wx, y: wy, z: cz + z };
  W4.card = { x: cx + plan.BARX + 0.95, z: cz + z };   // (read across the counter: where he stands before it)
}
const cardTex = () => canvasTex(192, 128, (x, W, H) => {
  const gr = x.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#f2a860'); gr.addColorStop(0.55, '#e8d0e0'); gr.addColorStop(0.56, '#8a7ab8'); gr.addColorStop(1, '#c8c0e8'); x.fillStyle = gr; x.fillRect(0, 0, W, H);
  x.fillStyle = '#5a4a8a'; for (const [bx, bw, bh] of [[20, 26, 40], [52, 18, 56], [76, 30, 34], [120, 22, 48], [150, 26, 30]]) x.fillRect(bx, 72 - bh, bw, bh);
  x.fillStyle = '#e8c040'; x.beginPath(); x.arc(64, 30 - 4, 10, 0, 7); x.fill();
  x.fillStyle = '#ffffff'; x.font = 'bold 18px serif'; x.textAlign = 'center'; x.fillText('OTRINGAL', W / 2, 110);
  x.strokeStyle = '#ffffff'; x.lineWidth = 6; x.strokeRect(3, 3, W - 6, H - 6);
});

// ================================================================ Raph's seat: a crate, a tip jar, an instrument on his lap
// (x, z: the crate's middle; a: the way he faces; y: the ground there)
export function buildRaphSeat(parent, id, x, z, y, a, physics) {
  if (W4.seats[id]) return W4.seats[id];
  const g = worldGroup(parent, 'wave4 raph ' + id);
  const k = new Kit(g);
  const fx = Math.sin(a), fz = Math.cos(a), rx = Math.cos(a), rz = -Math.sin(a);
  k.at(x, y, z, a, () => P.crate(k, 0.5, { pal: 'honey', h: 0.46 }));
  // the tip jar on the ground at his right, its mouth open, a few coins in it
  const jx = x + rx * 0.55 + fx * 0.25, jz = z + rz * 0.55 + fz * 0.25;
  k.add(lathe([[0.001, 0], [0.08, 0], [0.09, 0.04], [0.085, 0.15], [0.065, 0.19], [0.07, 0.21], [0.06, 0.21]], 12), MAT.glass('#cfe8e0', 0.5), jx, y, jz);
  for (let i = 0; i < 3; i++) k.add(cyl(0.025, 0.025, 0.006, 10), MAT.brass(), jx + (i - 1) * 0.02, y + 0.012 + i * 0.008, jz + (i % 2) * 0.015, 0, { rx: 0.3 * i });
  k.flush();
  physics?.add({ type: 'box', x, z, hw: 0.27, hd: 0.27, rot: a, top: y + 0.5, noStand: true });
  // the instruments, on his lap (across his thighs, the neck to his left), each its own group
  const lap = { x: x + fx * 0.3, y: y + 0.64, z: z + fz * 0.3 };
  const inst = (build) => { const ig = new THREE.Group(); ig.position.set(lap.x, lap.y, lap.z); ig.rotation.y = a; g.add(ig); const ik = new Kit(ig); build(ik); ik.flush(); ig.visible = false; return ig; };
  // his guitar: a figure-eight body lying across the lap, its neck up to the left
  const guitar = inst((ik) => {
    ik.at(0, 0, 0, 0, () => {
      ik.add(cyl(0.15, 0.15, 0.08, 18), MAT.wood('honey'), 0.06, 0, 0.0, 0, { rx: Math.PI / 2 - 0.25, sz: 1 });
      ik.add(cyl(0.12, 0.12, 0.08, 18), MAT.wood('honey'), -0.13, 0.03, 0.0, 0, { rx: Math.PI / 2 - 0.25 });
      ik.add(cyl(0.04, 0.04, 0.084, 12), MAT.flat('#2a1a10', 0.6), 0.0, 0.03, 0.01, 0, { rx: Math.PI / 2 - 0.25 });
      ik.add(rbox(0.42, 0.045, 0.02, 0.006), MAT.wood('dark'), 0.38, 0.12, -0.01, 0, { rz: 0.3 });
      ik.add(rbox(0.09, 0.06, 0.025, 0.006), MAT.wood('dark'), 0.61, 0.2, -0.01, 0, { rz: 0.3 });
    });
  });
  // the borrowed Esmer harp: a tall bowed frame with many strings, held upright on the knee
  const harp = inst((ik) => {
    ik.add(lathe([[0.001, 0], [0.09, 0.02], [0.1, 0.1], [0.06, 0.18], [0.001, 0.2]], 12), MAT.paint('#2f8a9a', 0.45), 0.05, -0.02, 0);
    ik.add(P.torus(0.17, 0.014, 6, 18, Math.PI * 1.1), MAT.brass(), 0.05, 0.3, 0, 0, { rz: -0.3 });
    for (let i = 0; i < 11; i++) ik.add(cyl(0.0025, 0.0025, 0.26 - Math.abs(i - 5) * 0.015, 3), MAT.flat('#f2ead6', 0.4), -0.08 + i * 0.026, 0.27, 0);
  });
  const S = {
    x, z, y, a, sit: { x: x - fx * 0.02, z: z - fz * 0.02, y, a },
    set(which) { guitar.visible = which === 'guitar'; harp.visible = which === 'harp'; },
    setOn(on) { g.visible = !!on; },
  };
  W4.seats[id] = S;
  return S;
}
