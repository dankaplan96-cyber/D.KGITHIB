// Citadel Spaceport. Twelve years after LBA2, the Esmers' shuttles are ordinary traffic, so Citadel has a port for
// them: a landing platform on stilts over the bay east of the town, a footbridge from the shore, a small terminal
// (Twinsun stone below, an Esmer dome above), a control tower, the departures board, and a shuttle on the pad.
// From chapter 4 on it flies to Zeelich Spaceport only — Zeelich is another planet; its islands are reached from
// there by Esmer shuttle (src/game/travel.js, CONNECT); before that the flights are
// grounded and only the Joint Project's ferry crosses (the board and the gate say so).
//
// A small working port (SD-1): passengers wait on benches in front of the terminal between planters and bins,
// read the departures board by the bridge's end and buy tickets at a kiosk across the way; luggage trolleys, cargo
// crates and a hand cart stand by the pad on the far side; flags fly at the entry and lamps stand along the deck's
// edge; sign posts at both ends of the bridge point to the SPACEPORT and back to the TOWN. The way from the bridge
// to the shuttle (a painted walkway), the pad's ring and the board's reading spot stay clear.
// Everything static is merged per material (one Kit for the platform, one for its furniture).
//
// CONTRACT (world coordinates, Citadel outdoors): buildSpaceport(root, physics, W) → W.spaceport =
//   { pad {x,z,y} (the shuttle: its interactable), landing {x,z,a} (where he steps off), deck {x0,x1,z0,z1,y} }
import * as THREE from 'three';
import * as P from './props.js';
import { Kit, rbox, cyl, lathe, plane, torus, sphere, canvasTex, MAT, paintVC, tinted } from './props.js';
import { esmerShuttle } from './shuttle.js';

// the platform: east of the town over the bay (the shore is at x ≈ −26 at ground level 2.3 m)
const DECK = { x0: -14, x1: 14, z0: 26, z1: 54 };
const BRIDGE = { x0: -31, x1: -13.6, z: 40, hw: 2.0 };
const PAD = { x: 4.5, z: 41 };
const RAIL_H = 1.1;

const nameTex = () => canvasTex(512, 96, (x, W, H) => {
  x.fillStyle = '#f4efe2'; x.fillRect(0, 0, W, H); x.fillStyle = '#2f6a9a'; x.font = 'bold 46px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('SPACEPORT', W / 2, H / 2 + 2);
});
// the departures board's face (CONNECT): the spaceship to Zeelich only
let DEP = null;
const departuresTex = () => (DEP ||= canvasTex(1024, 512, (x, W, H) => {
  x.fillStyle = '#18202c'; x.fillRect(0, 0, W, H); x.strokeStyle = '#e8c040'; x.lineWidth = 10; x.strokeRect(8, 8, W - 16, H - 16);
  x.fillStyle = '#e8c040'; x.font = 'bold 54px Rubik, sans-serif'; x.textAlign = 'center'; x.fillText('DEPARTURES · SPACESHIP', W / 2, 82);
  x.fillStyle = 'rgba(232,192,64,0.5)'; x.fillRect(40, 108, W - 80, 4);
  x.font = 'bold 50px monospace'; x.textAlign = 'left'; x.fillStyle = '#9fe0ff'; x.fillText('ZEELICH SPACEPORT', 60, 210); x.fillStyle = '#ffd860'; x.fillText('PAD 1', 780, 210);
  x.font = '32px Rubik, sans-serif'; x.fillStyle = '#bfe9ff'; x.fillText('Zeelich\'s islands: change at Zeelich', 60, 320); x.fillText('to an Esmer shuttle.', 60, 368);
}));
// heading (as the hero's angle) from a point toward another
const heading = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

export function buildSpaceport(root, physics, W) {
  const g = new THREE.Group(); g.name = 'spaceport'; root.add(g);
  const Y = Math.max(2.3, physics.groundAt(BRIDGE.x0, BRIDGE.z)) + 0.05;   // deck top: level with the shore
  // the platform's structure (deck, stilts, railings, terminal, tower) and its furniture: one Kit each
  const k = new Kit(g), f = new Kit(g);
  const add = (geo, m, x, y, z, ry = 0, o) => k.add(geo, m, x, y, z, ry, o);
  const deckM = MAT.planks('honey'), stone = MAT.stone('sand', 2), white = MAT.plaster('#f4efe2'), steel = MAT.steel(), brass = MAT.brass();
  const blue = MAT.paint('#2f6a9a', 0.5), glass = MAT.glass('#bfe6ff', 0.45), pad = MAT.paint('#8a8f9a', 0.7), yellow = MAT.paint('#e8c040', 0.5);
  const pv = (kit, geo, c, x, y, z, ry = 0, o = {}) => kit.add(tinted(geo, c), paintVC(), x, y, z, ry, o);
  const brick = (x0, x1, z0, z1) => physics.add({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, top: Y, bottom: Y - 0.6 });
  const wall = (x0, x1, z0, z1, top, opts = {}) => physics.add({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: Math.max(0.08, (x1 - x0) / 2), hd: Math.max(0.08, (z1 - z0) / 2), top, noStand: true, ...opts });
  // furniture: build at (x, deck/ground, z) facing ry, and give it the collider its footprint asks for
  const put = (fn, x, z, ry = 0, { y = Y, solid = true, low = true } = {}) => {
    const fp = f.at(x, y, z, ry, () => fn(f));
    if (!fp || !solid) return fp;
    if (fp.r != null) physics.add({ type: 'cyl', x, z, r: fp.r, top: y + fp.top, noStand: true, seeThrough: low });
    else physics.add({ type: 'box', x, z, hw: fp.hw, hd: fp.hd, rot: ry, top: y + fp.top, noStand: true, seeThrough: low });
    return fp;
  };

  // --- the deck, the footbridge, stilts into the bay
  const dw = DECK.x1 - DECK.x0, dd = DECK.z1 - DECK.z0, dcx = (DECK.x0 + DECK.x1) / 2, dcz = (DECK.z0 + DECK.z1) / 2;
  add(rbox(dw, 0.5, dd, 0.06), deckM, dcx, Y - 0.25, dcz);
  add(rbox(dw + 0.4, 0.25, dd + 0.4, 0.04), stone, dcx, Y - 0.62, dcz);
  brick(DECK.x0, DECK.x1, DECK.z0, DECK.z1);
  const bl = BRIDGE.x1 - BRIDGE.x0;
  add(rbox(bl, 0.35, BRIDGE.hw * 2, 0.05), deckM, (BRIDGE.x0 + BRIDGE.x1) / 2, Y - 0.18, BRIDGE.z);
  brick(BRIDGE.x0, BRIDGE.x1 + 0.6, BRIDGE.z - BRIDGE.hw, BRIDGE.z + BRIDGE.hw);
  const stilt = (x, z) => { const h = Y + 6; add(cyl(0.22, 0.28, h, 8), stone, x, Y - 0.5 - h / 2, z); add(cyl(0.3, 0.3, 0.16, 8), stone, x, Y - 0.62, z); };
  for (let x = DECK.x0 + 1; x <= DECK.x1 - 1; x += 6.5) for (const z of [DECK.z0 + 1, dcz, DECK.z1 - 1]) stilt(x, z);
  for (let x = BRIDGE.x0 + 8; x < BRIDGE.x1; x += 5) for (const s of [-1, 1]) stilt(x, BRIDGE.z + s * (BRIDGE.hw - 0.3));
  // the deck's edge: a blue-painted fascia under the planks all round
  for (const [x0, z0, x1, z1] of [[DECK.x0, DECK.z0, DECK.x1, DECK.z0], [DECK.x0, DECK.z1, DECK.x1, DECK.z1], [DECK.x1, DECK.z0, DECK.x1, DECK.z1], [DECK.x0, DECK.z0, DECK.x0, DECK.z1]]) {
    const len = Math.hypot(x1 - x0, z1 - z0) + 0.1, along = x0 === x1 ? Math.PI / 2 : 0;
    pv(k, rbox(len, 0.22, 0.08, 0.02), '#2f6a9a', (x0 + x1) / 2 + (x0 === x1 ? Math.sign(x0) * 0.04 : 0), Y - 0.2, (z0 + z1) / 2 + (z0 === z1 ? (z0 < dcz ? -0.04 : 0.04) : 0), along);
  }

  // --- railings: round the deck (open to the bridge) and along the bridge. Blue posts with a brass handrail, a
  //     mid rail and a toe board along the planks (the toe board keeps a dropped crate on the deck)
  const rail = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 1.6) + 1);
    for (let i = 0; i < n; i++) { const u = i / (n - 1); pv(k, cyl(0.05, 0.06, RAIL_H, 6), '#2f6a9a', x0 + (x1 - x0) * u, Y + RAIL_H / 2, z0 + (z1 - z0) * u); }
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    add(cyl(0.04, 0.04, len, 6), brass, mx, Y + RAIL_H, mz, a, { rx: Math.PI / 2 });
    add(cyl(0.028, 0.028, len, 6), steel, mx, Y + 0.55, mz, a, { rx: Math.PI / 2 });
    pv(k, rbox(0.05, 0.14, len, 0.015), '#e8c040', mx, Y + 0.07, mz, a);
    wall(Math.min(x0, x1) - 0.1, Math.max(x0, x1) + 0.1, Math.min(z0, z1) - 0.1, Math.max(z0, z1) + 0.1, Y + RAIL_H, { seeThrough: true });
  };
  const bz0 = BRIDGE.z - BRIDGE.hw, bz1 = BRIDGE.z + BRIDGE.hw;
  rail(DECK.x0, DECK.z0, DECK.x1, DECK.z0); rail(DECK.x0, DECK.z1, DECK.x1, DECK.z1); rail(DECK.x1, DECK.z0, DECK.x1, DECK.z1);
  rail(DECK.x0, DECK.z0, DECK.x0, bz0); rail(DECK.x0, bz1, DECK.x0, DECK.z1);
  rail(BRIDGE.x0 + 5, bz0, DECK.x0, bz0); rail(BRIDGE.x0 + 5, bz1, DECK.x0, bz1);

  // --- the landing pad and the shuttle; a painted walkway from the bridge to the pad
  add(cyl(4.8, 5.0, 0.12, 32), pad, PAD.x, Y + 0.06, PAD.z);
  add(torus(4.3, 0.08, 6, 40), yellow, PAD.x, Y + 0.13, PAD.z, 0, { rx: Math.PI / 2 });
  for (let i = 0; i < 16; i++) { const a = (i + 0.5) * Math.PI / 8; add(rbox(0.5, 0.02, 0.14, 0.01), i % 2 ? pad : yellow, PAD.x + Math.sin(a) * 4.62, Y + 0.125, PAD.z + Math.cos(a) * 4.62, a + Math.PI / 2); }
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; add(cyl(0.1, 0.12, 0.12, 8), MAT.glow('#fff4c0', '#ffd860', 1.6), PAD.x + Math.sin(a) * 5.2, Y + 0.06, PAD.z + Math.cos(a) * 5.2); }
  for (const s of [-1, 1]) for (let x = DECK.x0 + 0.6; x < PAD.x - 5.6; x += 1.4) pv(k, rbox(0.9, 0.012, 0.1, 0.005), '#e8c040', x + 0.45, Y + 0.006, BRIDGE.z + s * 1.75);
  const sh = esmerShuttle({ landed: true }); sh.position.set(PAD.x, Y + 0.12, PAD.z); sh.rotation.y = -Math.PI / 2; g.add(sh);
  physics.add({ type: 'cyl', x: PAD.x, z: PAD.z, r: 3.2, top: Y + 4.4, noStand: true });

  // --- the terminal on the north side: stone walls, a glass band, a flat roof with an Esmer dome
  const T = { x0: -12.5, x1: 1.5, z0: 26.6, z1: 31.6 }, th = 3.4, tcx = (T.x0 + T.x1) / 2, tcz = (T.z0 + T.z1) / 2;
  add(rbox(T.x1 - T.x0, th, T.z1 - T.z0, 0.06), white, tcx, Y + th / 2, tcz);
  add(rbox(T.x1 - T.x0 + 0.24, 0.3, T.z1 - T.z0 + 0.24, 0.04), stone, tcx, Y + 0.15, tcz);
  add(rbox(T.x1 - T.x0 + 0.05, 0.9, 0.1, 0.02), glass, tcx, Y + 2.2, T.z1 + 0.02);
  for (let x = T.x0 + 1.4; x < T.x1 - 0.5; x += 2.8) pv(k, rbox(0.12, 1.02, 0.08, 0.02), '#2f6a9a', x, Y + 2.2, T.z1 + 0.06);
  add(rbox(T.x1 - T.x0 + 0.5, 0.25, T.z1 - T.z0 + 0.5, 0.04), blue, tcx, Y + th + 0.12, tcz);
  add(lathe([[1.6, 0], [1.75, 0.35], [1.6, 0.9], [1.0, 1.45], [0.4, 1.8], [0.03, 2.1]], 16), MAT.paint('#8a5ac0', 0.4), tcx, Y + th + 0.25, tcz);
  add(cyl(0.05, 0.05, 0.8, 6), brass, tcx, Y + th + 2.6, tcz);
  add(plane(4.2, 0.8), MAT.map(nameTex(), 0.7, { side: THREE.DoubleSide }), tcx, Y + 2.95, T.z1 + 0.09);
  // the door: a glass leaf in a blue frame under a little canopy
  add(rbox(1.5, 2.2, 0.12, 0.02), glass, tcx + 3, Y + 1.1, T.z1 + 0.04);
  pv(k, rbox(1.75, 0.12, 0.16, 0.03), '#2f6a9a', tcx + 3, Y + 2.26, T.z1 + 0.06);
  for (const s of [-1, 1]) pv(k, rbox(0.12, 2.26, 0.16, 0.03), '#2f6a9a', tcx + 3 + s * 0.82, Y + 1.13, T.z1 + 0.06);
  pv(k, rbox(2.3, 0.1, 1.1, 0.03), '#2f6a9a', tcx + 3, Y + 2.62, T.z1 + 0.55, 0, { rx: 0.08 });
  wall(T.x0, T.x1, T.z0, T.z1, Y + th + 0.3);

  // --- the waiting area in front of the terminal: benches facing the pad between a tub, a planter and bins
  for (const bx of [-10.9, -7.7]) put((kk) => P.waitingBench(kk, { w: 1.9 }), bx, T.z1 + 1.45);
  put((kk) => P.flowerTub(kk, { seed: 4 }), -9.3, T.z1 + 1.3);
  put((kk) => P.planterBox(kk, { w: 1.5, d: 0.55, seed: 5, color: '#2f6a9a', flowers: ['#e8343a', '#ffffff', '#f2c94c'] }), -5.45, T.z1 + 0.55);
  put((kk) => P.litterBin(kk), -12.55, T.z1 + 1.15);
  put((kk) => P.litterBin(kk), -6.2, T.z1 + 1.6);
  put((kk) => P.pottedPlant(kk, { kind: 'spiky', s: 1.3, potColor: '#2f6a9a' }), 0.7, T.z1 + 0.6);
  put((kk) => P.drinkingFountain(kk), -0.9, T.z1 + 0.6);

  // --- the departures board, on its own roofed frame by the bridge's end, read from the deck (faces +x)
  const B = { x: -11.2, z: 36.2 };
  f.at(B.x, Y, B.z, Math.PI / 2, () => P.streetNoticeBoard(f, { kind: 'departures', w: 2.8, h: 1.4, y: 1.05 }));
  // (CONNECT: Zeelich is another planet — the board names only the spaceship to Zeelich Spaceport; the islands are
  // reached from there by Esmer shuttle. Our face over the generic departures face.)
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.4), new THREE.MeshStandardMaterial({ map: departuresTex(), emissive: '#ffffff', emissiveMap: departuresTex(), emissiveIntensity: 0.35, roughness: 0.75 }));
    m.position.set(B.x + 0.045, Y + 1.75, B.z); m.rotation.y = Math.PI / 2; g.add(m); }
  wall(B.x - 0.2, B.x + 0.2, B.z - 1.6, B.z + 1.6, Y + 2.7);
  W.signs.push({ x: B.x + 0.6, z: B.z, key: 'port_board' });

  // --- the ticket and information kiosk across the way (its hatch faces the walkway), an island map, a bin
  put((kk) => P.kiosk(kk, { w: 2.1, d: 1.4, h: 2.55, label: 'TICKETS · INFO', color: '#2f6a9a' }), -10.4, 45.5, Math.PI, { low: false });
  put((kk) => P.infoStand(kk), -7.7, 44.1, Math.PI + 0.25);
  put((kk) => P.litterBin(kk, { color: '#2f6a9a' }), -12.9, 44.95);
  put((kk) => P.flowerTub(kk, { seed: 6, color: '#e8c040', r: 0.3 }), -12.85, 46.7);
  put((kk) => P.waitingBench(kk, { w: 1.7, color: '#c8452f' }), -9.6, 52.6, Math.PI);
  put((kk) => P.planterBox(kk, { w: 1.3, seed: 8 }), -12.6, 50.5, Math.PI / 2);

  // --- by the pad's far side: luggage trolleys, cargo for the next flight, a hand cart and a crate stack
  put((kk) => P.luggageTrolley(kk, { seed: 1 }), 1.2, 34.6, 0.35);
  put((kk) => P.luggageTrolley(kk, { seed: 2, load: 2 }), 10.4, 34.4, -0.5);
  put((kk) => P.luggageTrolley(kk, { seed: 5 }), 9.6, 47.6, 2.6);
  f.at(11.9, Y, 28.3, 0.1, () => { P.cargoCrate(f, { w: 1.0, h: 0.85, d: 1.0, color: '#3f6a8a' }); f.at(0, 0.85, 0, 0.2, () => P.cargoCrate(f, { w: 0.8, h: 0.7, d: 0.8, color: '#c8762f' })); });
  physics.add({ type: 'box', x: 11.9, z: 28.3, hw: 0.55, hd: 0.55, rot: 0.1, top: Y + 1.55, noStand: true });
  f.at(10.4, Y, 28.1, -0.2, () => P.crate(f, 0.7));
  f.at(10.5, Y, 29.4, 0.3, () => P.crate(f, 0.55));
  physics.add({ type: 'box', x: 10.45, z: 28.75, hw: 0.45, hd: 1.0, rot: 0, top: Y + 0.7, noStand: true });
  put((kk) => P.barrel(kk, { r: 0.3, h: 0.8 }), 13.0, 30.2);
  put((kk) => P.handCart(kk, { load: 'crates', seed: 4 }), 7.6, 28.6, Math.PI - 0.15);
  put((kk) => P.cargoCrate(kk, { w: 0.9, h: 0.75, d: 0.9, color: '#4a6e62' }), 12.6, 45.6, 0.35);

  // --- flags at the entry, lamps along the deck's edge
  for (const [z, c1, c2] of [[36.7, '#2f6a9a', '#e8c040'], [43.4, '#c8452f', '#f4efe2']]) put((kk) => P.flagPole(kk, { color: c1, color2: c2 }), -13.25, z, 0, { low: false });
  for (const x of [-4.5, 3.0]) put((kk) => P.flagPole(kk, { h: 4.6, color: '#7a52b0', color2: '#e8c040', len: 1.1 }), x, 53.25, 0, { low: false });
  for (const [x, z] of [[-13.2, 32.8], [-13.2, 52.9], [-1, 53.2], [7.0, 53.2], [13.2, 32.5], [13.2, 43.8]]) put((kk) => P.globeLamp(kk, { h: 3.0 }), x, z, 0, { low: false });

  // --- sign posts at the bridge's two ends: to the spaceport from the shore, back to the town from the deck
  const sx0 = BRIDGE.x0 - 1.4, sz0 = BRIDGE.z - BRIDGE.hw - 0.7;
  put((kk) => P.signPost(kk, [{ text: 'SPACEPORT', a: Math.PI / 2 }, { text: 'SQUARE', a: heading(sx0, sz0, -45, 30), color: '#c8452f' }, { text: 'HARBOUR', a: heading(sx0, sz0, -60, 33), color: '#2a8a7a' }]), sx0, sz0, 0, { y: physics.groundAt(sx0, sz0), low: false });
  put((kk) => P.signPost(kk, [{ text: 'TOWN', a: -Math.PI / 2 }, { text: 'SHUTTLE', a: Math.PI / 2, color: '#7a52b0' }], { h: 2.3 }), DECK.x0 + 1.7, BRIDGE.z + BRIDGE.hw + 0.9, 0, { low: false });
  // bollards at the bridge's foot (no carts on the footbridge)
  for (const s of [-1, 1]) put((kk) => P.bollard(kk), BRIDGE.x0 - 0.35, BRIDGE.z + s * (BRIDGE.hw - 0.25), 0, { y: physics.groundAt(BRIDGE.x0 - 0.35, BRIDGE.z + s * (BRIDGE.hw - 0.25)) });

  // --- the control tower in the south-east corner
  const CT = { x: 10.5, z: 50.5 };
  add(cyl(0.9, 1.1, 8, 12), white, CT.x, Y + 4, CT.z);
  add(cyl(1.25, 1.25, 0.3, 12), stone, CT.x, Y + 0.15, CT.z);
  add(cyl(1.7, 1.3, 1.6, 12), glass, CT.x, Y + 8.8, CT.z);
  add(cyl(1.9, 1.9, 0.2, 12), blue, CT.x, Y + 9.7, CT.z);
  add(cyl(0.04, 0.04, 2.0, 6), steel, CT.x, Y + 10.8, CT.z);
  physics.add({ type: 'cyl', x: CT.x, z: CT.z, r: 1.2, top: Y + 10, noStand: true });
  // --- lamps along the bridge
  for (const x of [BRIDGE.x0 + 6, BRIDGE.x0 + 12]) for (const s of [-1, 1]) {
    pv(k, cyl(0.05, 0.06, 2.4, 6), '#2f6a9a', x, Y + 1.2, BRIDGE.z + s * (BRIDGE.hw - 0.15));
    add(sphere(0.17, 10, 8), MAT.glow('#fff4d8', '#ffd890', 1.2), x, Y + 2.45, BRIDGE.z + s * (BRIDGE.hw - 0.15));
  }
  k.flush(); f.flush();
  // the tower's beacon blinks (its own mesh)
  const beacon = new THREE.Mesh(sphere(0.16, 10, 8), MAT.glow('#ff6050', '#ff3020', 2.2)); beacon.position.set(CT.x, Y + 11.85, CT.z); g.add(beacon);
  W.updaters.push((dt, t) => { beacon.visible = (t % 1.6) < 0.8; });

  const S = W.spaceport = {
    pad: { x: PAD.x, z: PAD.z, y: Y },
    landing: { x: PAD.x - 6.2, z: PAD.z - 1.5, a: -Math.PI / 2 },
    deck: { ...DECK, y: Y }, bridge: { ...BRIDGE }, board: B, group: g,
  };
  return S;
}
