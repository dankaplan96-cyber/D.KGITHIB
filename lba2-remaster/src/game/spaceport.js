// Citadel Spaceport. Twelve years after LBA2, the Esmers' shuttles are ordinary traffic, so Citadel has a port for
// them: a landing platform on stilts over the bay east of the town, a footbridge from the shore, a small terminal
// (Twinsun stone below, an Esmer dome above), a control tower, the departures board, and a shuttle on the pad.
// From chapter 4 on it flies to Zeelich and its islands (src/game/story/islands.js); before that the flights are
// grounded and only the Joint Project's ferry crosses (the board and the gate say so).
//
// CONTRACT (world coordinates, Citadel outdoors): buildSpaceport(root, physics, W) → W.spaceport =
//   { pad {x,z,y} (the shuttle: its interactable), landing {x,z,a} (where he steps off), deck {x0,x1,z0,z1,y} }
import * as THREE from 'three';
import { rbox, cyl, lathe, plane, canvasTex, MAT } from './props.js';
import { esmerShuttle } from './shuttle.js';

// the platform: east of the town over the bay (the shore is at x ≈ −26 at ground level 2.3 m)
const DECK = { x0: -14, x1: 14, z0: 26, z1: 54 };
const BRIDGE = { x0: -31, x1: -13.6, z: 40, hw: 2.0 };
const PAD = { x: 4.5, z: 41 };
const RAIL_H = 1.1;

const boardTex = () => canvasTex(512, 256, (x, W, H) => {
  x.fillStyle = '#1c2430'; x.fillRect(0, 0, W, H); x.strokeStyle = '#e8c040'; x.lineWidth = 6; x.strokeRect(5, 5, W - 10, H - 10);
  x.fillStyle = '#e8c040'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.fillText('CITADEL SPACEPORT', W / 2, 52);
  x.fillStyle = '#9fe0ff'; x.font = '26px monospace'; x.textAlign = 'left';
  [['ZEELICH', 'ESMER SHUTTLE'], ['OTRINGAL', 'VIA ZEELICH'], ['KNARTAS', 'VIA ZEELICH'], ['MOSQUIBEE', 'VIA ZEELICH']].forEach(([a, b], i) => { x.fillText(a, 30, 104 + i * 36); x.fillText(b, 260, 104 + i * 36); });
});
const nameTex = () => canvasTex(512, 96, (x, W, H) => {
  x.fillStyle = '#f4efe2'; x.fillRect(0, 0, W, H); x.fillStyle = '#2f6a9a'; x.font = 'bold 46px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('SPACEPORT', W / 2, H / 2 + 2);
});

export function buildSpaceport(root, physics, W) {
  const g = new THREE.Group(); g.name = 'spaceport'; root.add(g);
  const Y = Math.max(2.3, physics.groundAt(BRIDGE.x0, BRIDGE.z)) + 0.05;   // deck top: level with the shore
  const add = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const deckM = MAT.planks('honey'), stone = MAT.stone('sand', 2), white = MAT.plaster('#f4efe2'), steel = MAT.steel(), brass = MAT.brass();
  const blue = MAT.paint('#2f6a9a', 0.5), glass = MAT.glass('#bfe6ff', 0.45), pad = MAT.paint('#8a8f9a', 0.7), yellow = MAT.paint('#e8c040', 0.5);
  const brick = (x0, x1, z0, z1) => physics.add({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, top: Y, bottom: Y - 0.6 });
  const wall = (x0, x1, z0, z1, top, opts = {}) => physics.add({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: Math.max(0.08, (x1 - x0) / 2), hd: Math.max(0.08, (z1 - z0) / 2), top, noStand: true, ...opts });

  // --- the deck, the footbridge, stilts into the bay
  const dw = DECK.x1 - DECK.x0, dd = DECK.z1 - DECK.z0, dcx = (DECK.x0 + DECK.x1) / 2, dcz = (DECK.z0 + DECK.z1) / 2;
  add(rbox(dw, 0.5, dd, 0.06), deckM, dcx, Y - 0.25, dcz);
  add(rbox(dw + 0.4, 0.25, dd + 0.4, 0.04), stone, dcx, Y - 0.62, dcz);
  brick(DECK.x0, DECK.x1, DECK.z0, DECK.z1);
  const bl = BRIDGE.x1 - BRIDGE.x0;
  add(rbox(bl, 0.35, BRIDGE.hw * 2, 0.05), deckM, (BRIDGE.x0 + BRIDGE.x1) / 2, Y - 0.18, BRIDGE.z);
  brick(BRIDGE.x0, BRIDGE.x1 + 0.6, BRIDGE.z - BRIDGE.hw, BRIDGE.z + BRIDGE.hw);
  const stilt = (x, z) => { const h = Y + 6; add(cyl(0.22, 0.28, h, 8), stone, x, Y - 0.5 - h / 2, z); };
  for (let x = DECK.x0 + 1; x <= DECK.x1 - 1; x += 6.5) for (const z of [DECK.z0 + 1, dcz, DECK.z1 - 1]) stilt(x, z);
  for (let x = BRIDGE.x0 + 8; x < BRIDGE.x1; x += 5) for (const s of [-1, 1]) stilt(x, BRIDGE.z + s * (BRIDGE.hw - 0.3));

  // --- railings: round the deck (open to the bridge) and along the bridge
  const rail = (x0, z0, x1, z1) => {
    const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 1.6) + 1);
    for (let i = 0; i < n; i++) { const u = i / (n - 1); add(cyl(0.05, 0.05, RAIL_H, 6), steel, x0 + (x1 - x0) * u, Y + RAIL_H / 2, z0 + (z1 - z0) * u); }
    for (const h of [0.5, RAIL_H]) { const m = add(cyl(0.035, 0.035, len, 6), brass, (x0 + x1) / 2, Y + h, (z0 + z1) / 2); m.rotation.set(Math.PI / 2, a, 0, 'YXZ'); }
    wall(Math.min(x0, x1) - 0.1, Math.max(x0, x1) + 0.1, Math.min(z0, z1) - 0.1, Math.max(z0, z1) + 0.1, Y + RAIL_H, { seeThrough: true });
  };
  const bz0 = BRIDGE.z - BRIDGE.hw, bz1 = BRIDGE.z + BRIDGE.hw;
  rail(DECK.x0, DECK.z0, DECK.x1, DECK.z0); rail(DECK.x0, DECK.z1, DECK.x1, DECK.z1); rail(DECK.x1, DECK.z0, DECK.x1, DECK.z1);
  rail(DECK.x0, DECK.z0, DECK.x0, bz0); rail(DECK.x0, bz1, DECK.x0, DECK.z1);
  rail(BRIDGE.x0 + 5, bz0, DECK.x0, bz0); rail(BRIDGE.x0 + 5, bz1, DECK.x0, bz1);

  // --- the landing pad and the shuttle
  add(cyl(4.8, 5.0, 0.12, 32), pad, PAD.x, Y + 0.06, PAD.z);
  { const ring = new THREE.Mesh(new THREE.TorusGeometry(4.3, 0.08, 6, 40), yellow); ring.rotation.x = Math.PI / 2; ring.position.set(PAD.x, Y + 0.13, PAD.z); g.add(ring); }
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; add(cyl(0.1, 0.12, 0.12, 8), MAT.glow('#fff4c0', '#ffd860', 1.6), PAD.x + Math.sin(a) * 5.2, Y + 0.06, PAD.z + Math.cos(a) * 5.2); }
  const sh = esmerShuttle({ landed: true }); sh.position.set(PAD.x, Y + 0.12, PAD.z); sh.rotation.y = -Math.PI / 2; g.add(sh);
  physics.add({ type: 'cyl', x: PAD.x, z: PAD.z, r: 3.2, top: Y + 4.4, noStand: true });

  // --- the terminal on the north side: stone walls, a glass band, a flat roof with an Esmer dome
  const T = { x0: -12.5, x1: 1.5, z0: 26.6, z1: 31.6 }, th = 3.4, tcx = (T.x0 + T.x1) / 2, tcz = (T.z0 + T.z1) / 2;
  add(rbox(T.x1 - T.x0, th, T.z1 - T.z0, 0.06), white, tcx, Y + th / 2, tcz);
  add(rbox(T.x1 - T.x0 + 0.05, 0.9, 0.1, 0.02), glass, tcx, Y + 2.2, T.z1 + 0.02);
  add(rbox(T.x1 - T.x0 + 0.5, 0.25, T.z1 - T.z0 + 0.5, 0.04), blue, tcx, Y + th + 0.12, tcz);
  add(lathe([[1.6, 0], [1.75, 0.35], [1.6, 0.9], [1.0, 1.45], [0.4, 1.8], [0.03, 2.1]], 16), MAT.paint('#8a5ac0', 0.4), tcx, Y + th + 0.25, tcz);
  add(cyl(0.05, 0.05, 0.8, 6), brass, tcx, Y + th + 2.6, tcz);
  add(plane(4.2, 0.8), MAT.map(nameTex(), 0.7, { side: THREE.DoubleSide }), tcx, Y + 2.95, T.z1 + 0.09);
  add(rbox(1.5, 2.2, 0.12, 0.02), glass, tcx + 3, Y + 1.1, T.z1 + 0.04);
  wall(T.x0, T.x1, T.z0, T.z1, Y + th + 0.3);
  // benches in front, a couple of planters
  for (const bx of [-9, -5]) { add(rbox(1.8, 0.12, 0.5, 0.03), MAT.wood('honey'), bx, Y + 0.45, T.z1 + 1.6); for (const s of [-0.7, 0.7]) add(rbox(0.1, 0.42, 0.42, 0.01), steel, bx + s, Y + 0.21, T.z1 + 1.6); }
  wall(-10, -4, T.z1 + 1.3, T.z1 + 1.9, Y + 0.5, { noStand: false });
  // --- the departures board, on two posts by the bridge's end
  const B = { x: -11.2, z: 36.2 };
  add(plane(2.6, 1.3), MAT.map(boardTex(), 0.6, { side: THREE.DoubleSide, emissive: '#ffffff', emissiveIntensity: 0.25 }), B.x, Y + 1.9, B.z, Math.PI / 2);
  for (const s of [-1.2, 1.2]) add(cyl(0.06, 0.07, 2.6, 6), steel, B.x - 0.05, Y + 1.3, B.z + s);
  wall(B.x - 0.15, B.x + 0.15, B.z - 1.35, B.z + 1.35, Y + 2.6);
  W.signs.push({ x: B.x + 0.6, z: B.z, key: 'port_board' });
  // --- the control tower in the south-east corner
  const CT = { x: 10.5, z: 50.5 };
  add(cyl(0.9, 1.1, 8, 12), white, CT.x, Y + 4, CT.z);
  add(cyl(1.7, 1.3, 1.6, 12), glass, CT.x, Y + 8.8, CT.z);
  add(cyl(1.9, 1.9, 0.2, 12), blue, CT.x, Y + 9.7, CT.z);
  add(cyl(0.04, 0.04, 2.0, 6), steel, CT.x, Y + 10.8, CT.z);
  const beacon = add(new THREE.SphereGeometry(0.16, 10, 8), MAT.glow('#ff6050', '#ff3020', 2.2), CT.x, Y + 11.85, CT.z);
  W.updaters.push((dt, t) => { beacon.visible = (t % 1.6) < 0.8; });
  physics.add({ type: 'cyl', x: CT.x, z: CT.z, r: 1.2, top: Y + 10, noStand: true });
  // --- lamps along the bridge
  for (const x of [BRIDGE.x0 + 6, BRIDGE.x0 + 12]) for (const s of [-1, 1]) {
    add(cyl(0.05, 0.06, 2.4, 6), steel, x, Y + 1.2, BRIDGE.z + s * (BRIDGE.hw - 0.15));
    add(new THREE.SphereGeometry(0.17, 10, 8), MAT.glow('#fff4d8', '#ffd890', 1.2), x, Y + 2.45, BRIDGE.z + s * (BRIDGE.hw - 0.15));
  }

  const S = W.spaceport = {
    pad: { x: PAD.x, z: PAD.z, y: Y },
    landing: { x: PAD.x - 6.2, z: PAD.z - 1.5, a: -Math.PI / 2 },
    deck: { ...DECK, y: Y }, bridge: { ...BRIDGE }, board: B, group: g,
  };
  return S;
}
