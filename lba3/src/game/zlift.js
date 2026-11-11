// CAMPAIGN-3 (the user's treatment of 11.11.2026, section 3 "Zeelich — a town that needs the project"): the Cistern
// Rise on Mill Lane, between Zeelich Spaceport's bridge and the Esmer street. Ours (the terminal island is a new city
// of Zeelich: no original layout to match); Zeelich's own shapes and materials (zeelich.js's stone, teal metal, brass).
//
// What stands there (local metres, the island's frame; walking level Y0):
//   - a stone terrace 3.6 m high (x −18.2…−11, z 19.6…26.4): the quarter's cistern on top (a capped tank with a filler
//     on its east side and a float gauge), a low parapet round it, a stair up its south face from the bridge's side
//   - on its east face, facing the lane from the bridge: the freight lift (a deck between two guide rails under a head
//     frame; the motor house with the brake lever, the feed box and the speaking horn at its foot; the store hatch in
//     the wall under it, where the dockers carry the crates landed at the bridge)
//   - the water cart on the lift's deck (a tank on four wheels), the frame's safety chain and hook over it, the landing
//     bell on the head frame's post
//   - on its west face: Irsa's Pump Works (a bench along the wall with her test pump No. 9: a dial of three settings, a
//     crank, a gauge; casings and a flywheel waiting; her sign) under a brass wheel on a mast (seen from the bridge)
//   - at its north-east corner, on the lane: the quarter's standpipe and trough (fed from the cistern)
//
// CONTRACT (story/zeelift.js; world points unless said)
//   buildCisternRise({ group, col, W, updaters, Y0, mat }) → R.lift:
//     top (y of the terrace), half, low (the deck's heights), deckY (now)
//     spots {kell, brelA, brelB, brelClear, irsa, tap, stairFoot, stairTop}
//     hook, bell, feed, cart (its push bar), cock (its cock, at the filler), dial, crank: touch points {x, z, a, clip, front}
//     (story/reach.js: each thing stands at the height of the hand of its clip); ride (= cart.front), deck {x, z}, filler,
//     standpipe, cistern, sign {x, z}
//     setState({ deck: 'half'|'low'|'top', hooked, fed, cart: 'deck'|'filler', water, dial })   the look for a story state
//     moveDeck(to, secs, riders, done)   the deck (and the cart on it, and whoever rides) to a height
//     pushCart(k)  0…1 along the rails to the filler; tipCart(k); ringBell(); dropHook(k); spinCrank(); kick(dir)
//   liftClear(x, z, pad)   the scatter keeps off it (zeelich.js)
import * as THREE from 'three';
import { mergeStatic } from '../engine/merge.js';
import { touch } from './story/reach.js';

const T = { x0: -18.2, x1: -11.0, z0: 19.6, z1: 26.4, h: 3.6 };
const BAY = { z0: 21.6, z1: 24.0 }, DECK = { x: -9.85, z: 22.8, hw: 1.1, hd: 1.15 };
const HALF = 2.1, LOW = 0.14;
const CIS = { x: -15.6, z: 22.35, r: 1.55, h: 1.9 };
const CART0 = { x: -10.2, z: 22.8 }, PUSH = 3.0;
const STAIR = { n: 12, x0: -11.4, tread: 0.55, z0: 26.4, w: 1.8 };
const WORKS = { x: -18.2, z0: 21.4, z1: 24.6 };
const ZONE = [-21.6, 17.6, -6.6, 28.7];
export const liftClear = (x, z, pad = 0) => x > ZONE[0] - pad && x < ZONE[2] + pad && z > ZONE[1] - pad && z < ZONE[3] + pad;

const signTex = (lines, { bg = '#e8dcc0', ink = '#2a1a10', w = 512, h = 128, size = 40 } = {}) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = ink; x.lineWidth = 6; x.strokeRect(5, 5, w - 10, h - 10);
  x.fillStyle = ink; x.textAlign = 'center'; x.font = `bold ${size}px sans-serif`;
  lines.forEach((l, i) => x.fillText(l, w / 2, h / 2 + size * 0.36 + (i - (lines.length - 1) / 2) * size * 1.1));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
};
const dialTex = () => {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#f2ecdc'; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill(); x.strokeStyle = '#2a2a2a'; x.lineWidth = 3;
  for (let v = 0; v <= 6; v++) { const a = Math.PI * (1.15 + v * 0.117); x.beginPath(); x.moveTo(64 + Math.cos(a) * 44, 64 + Math.sin(a) * 44); x.lineTo(64 + Math.cos(a) * 56, 64 + Math.sin(a) * 56); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};

export function buildCisternRise({ group, col, W, updaters, Y0, mat }) {
  const TOP = Y0 + T.h;
  const S = new THREE.Group(); group.add(S);   // everything that never moves: merged per material at the end
  const add = (geo, m, x, y, z, ry = 0, rx = 0, rz = 0, to = S) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; to.add(o); return o; };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d), cyl = (a, b, h, n = 12) => new THREE.CylinderGeometry(a, b, h, n);
  const paint = (c, r = 0.6, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
  const wood = mat.planks, stone = mat.stone, brass = mat.brass, teal = mat.teal, steel = mat.steel;
  const red = paint('#b8302a', 0.45), cream = paint('#e2d6cc', 0.85), dark = paint('#2a2e34', 0.7);
  const cw = (T.x1 - T.x0), cd = (T.z1 - T.z0), cx = (T.x0 + T.x1) / 2, cz = (T.z0 + T.z1) / 2;

  // ---- the terrace, its coping and parapet (open at the stair's head and at the lift's bay)
  add(box(cw, T.h, cd), stone, cx, Y0 + T.h / 2, cz);
  add(box(cw + 0.3, 0.14, cd + 0.3), stone, cx, TOP - 0.065, cz);
  col({ type: 'box', x: cx, z: cz, hw: cw / 2, hd: cd / 2, rot: 0, top: TOP });
  const para = (x0, z0, x1, z1) => {
    const w = Math.abs(x1 - x0) + 0.28, d = Math.abs(z1 - z0) + 0.28;
    add(box(w, 0.62, d), cream, (x0 + x1) / 2, TOP + 0.31, (z0 + z1) / 2); add(box(w + 0.08, 0.08, d + 0.08), teal, (x0 + x1) / 2, TOP + 0.66, (z0 + z1) / 2);
    col({ type: 'box', x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: w / 2, hd: d / 2, rot: 0, top: TOP + 1.0, bottom: TOP - 0.2, noStand: true, seeThrough: true });
  };
  const stairTopX = STAIR.x0 - STAIR.n * STAIR.tread;   // (−18.0: the stair's head; the parapet's gap there)
  para(T.x0, T.z0, T.x1, T.z0);                                   // north
  para(T.x0, T.z0, T.x0, T.z1);                                   // west
  para(T.x0 + 2.3, T.z1, T.x1, T.z1);                             // south, from the stair's head on (a way in 1.9 m wide)
  para(T.x1, T.z0, T.x1, BAY.z0 - 0.15); para(T.x1, BAY.z1 + 0.15, T.x1, T.z1);   // east, either side of the bay
  // ---- the stair up the south face, from the bridge's side (12 steps of 0.3 m), an outer rail
  for (let i = 0; i < STAIR.n; i++) {
    const x = STAIR.x0 - (i + 0.5) * STAIR.tread, top = Y0 + (i + 1) * (T.h / STAIR.n);
    add(box(STAIR.tread, top - Y0, STAIR.w), stone, x, (Y0 + top) / 2, STAIR.z0 + STAIR.w / 2);
    add(box(STAIR.tread + 0.04, 0.06, STAIR.w + 0.06), stone, x, top - 0.03, STAIR.z0 + STAIR.w / 2);
    // (each step's brick runs on under the ones above it, to the stair's head: no seam between two steps to drop into;
    //  stair: the height under his feet decides, step by step, and the steps ahead never push him aside)
    { const xe = STAIR.x0 - i * STAIR.tread; col({ type: 'box', x: (xe + T.x0) / 2, z: STAIR.z0 + STAIR.w / 2 - 0.075, hw: (xe - T.x0) / 2, hd: STAIR.w / 2 + 0.075, rot: 0, top, stair: true }); }   // (0.15 m into the terrace's brick: no seam at the head either, physics.js groundInfo)
  }
  { // the head landing joins the terrace (its top step runs on to the west edge)
    const x0 = T.x0, x1 = stairTopX; add(box(x1 - x0, T.h, STAIR.w), stone, (x0 + x1) / 2, Y0 + T.h / 2, STAIR.z0 + STAIR.w / 2);
    const len = STAIR.n * STAIR.tread, ang = Math.atan2(T.h, len);
    for (let i = 0; i <= STAIR.n; i += 3) add(cyl(0.035, 0.035, 0.95, 6), teal, STAIR.x0 - i * STAIR.tread, Y0 + i * (T.h / STAIR.n) + 0.47, STAIR.z0 + STAIR.w - 0.05);
    add(cyl(0.03, 0.03, Math.hypot(len, T.h), 6), teal, STAIR.x0 - len / 2, Y0 + T.h / 2 + 0.92, STAIR.z0 + STAIR.w - 0.05, 0, 0, Math.PI / 2 - ang);
    col({ type: 'box', x: (STAIR.x0 + T.x0) / 2, z: STAIR.z0 + STAIR.w + 0.02, hw: (STAIR.x0 - T.x0) / 2, hd: 0.06, rot: 0, top: TOP + 1.0, bottom: Y0 + 0.5, noStand: true, seeThrough: true });
  }
  // ---- the cistern: a plastered tank under a teal cap with a gold spike, the filler on its east side, the float gauge
  add(cyl(CIS.r, CIS.r + 0.06, CIS.h, 20), cream, CIS.x, TOP + CIS.h / 2, CIS.z);
  add(cyl(CIS.r + 0.05, CIS.r + 0.05, 0.16, 20), teal, CIS.x, TOP + 0.5, CIS.z); add(cyl(CIS.r + 0.05, CIS.r + 0.05, 0.16, 20), teal, CIS.x, TOP + CIS.h - 0.3, CIS.z);
  add(new THREE.ConeGeometry(CIS.r + 0.2, 0.95, 8), teal, CIS.x, TOP + CIS.h + 0.47, CIS.z, Math.PI / 8);
  add(cyl(0.02, 0.05, 0.55, 6), brass, CIS.x, TOP + CIS.h + 1.15, CIS.z);
  col({ type: 'cyl', x: CIS.x, z: CIS.z, r: CIS.r + 0.08, top: TOP + CIS.h + 0.9, noStand: true });
  const FIL = { x: CIS.x + CIS.r + 0.32, z: CART0.z };
  add(cyl(0.34, 0.1, 0.4, 12), brass, FIL.x, TOP + 0.95, FIL.z); add(cyl(0.09, 0.09, 0.6, 8), brass, FIL.x - 0.2, TOP + 0.62, FIL.z, 0, 0, 0.7);
  add(cyl(0.05, 0.07, 0.75, 8), brass, FIL.x, TOP + 0.375, FIL.z);
  col({ type: 'cyl', x: FIL.x, z: FIL.z, r: 0.3, top: TOP + 1.15, noStand: true, seeThrough: true });
  add(cyl(0.025, 0.025, 1.7, 6), steel, CIS.x + 0.9, TOP + 0.95, CIS.z + CIS.r + 0.12);   // the gauge's rod on the south-east side
  for (const z of [CART0.z - 0.34, CART0.z + 0.34]) add(box(T.x1 - FIL.x - 0.3, 0.05, 0.06), steel, (T.x1 + FIL.x + 0.3) / 2, TOP + 0.03, z);   // the cart's rails
  // the feed down the north face to the quarter's standpipe and round to the works
  add(cyl(0.05, 0.05, T.h + 0.4, 8), brass, T.x1 - 0.9, Y0 + T.h / 2 + 0.3, T.z0 - 0.1);
  const TAP = { x: T.x1 - 0.9, z: T.z0 - 0.75 };
  add(cyl(0.05, 0.05, 0.6, 8), brass, TAP.x, Y0 + 0.95, T.z0 - 0.42, 0, Math.PI / 2); add(cyl(0.035, 0.045, 0.18, 8), brass, TAP.x, Y0 + 0.86, TAP.z);
  add(box(1.3, 0.42, 0.62), stone, TAP.x, Y0 + 0.21, TAP.z); add(box(1.08, 0.06, 0.4), paint('#2f3a44', 0.4), TAP.x, Y0 + 0.4, TAP.z);
  col({ type: 'box', x: TAP.x, z: TAP.z, hw: 0.66, hd: 0.32, rot: 0, top: Y0 + 0.45, noStand: true, seeThrough: true });
  // ---- the lift: two guide rails up the east face, the head frame over the bay, the landing pad, the store hatch
  for (const z of [BAY.z0 - 0.02, BAY.z1 + 0.02]) {
    add(box(0.16, T.h + 2.7, 0.16), teal, T.x1 + 0.1, Y0 + (T.h + 2.7) / 2, z);
    col({ type: 'cyl', x: T.x1 + 0.1, z, r: 0.12, top: TOP + 2.7, noStand: true, seeThrough: true });
  }
  add(box(0.2, 0.2, BAY.z1 - BAY.z0 + 0.5), teal, T.x1 + 0.1, TOP + 2.75, DECK.z);
  add(box(1.5, 0.14, 0.14), teal, T.x1 + 0.75, TOP + 2.75, DECK.z); add(cyl(0.22, 0.22, 0.1, 14), brass, T.x1 + 1.15, TOP + 2.6, DECK.z, 0, Math.PI / 2);
  add(box(2 * DECK.hw + 0.2, 0.08, 2 * DECK.hd + 0.2), wood, DECK.x, Y0 + 0.04, DECK.z);
  add(box(0.06, 1.5, 1.5), dark, T.x1 + 0.035, Y0 + 0.75, DECK.z); add(box(0.1, 0.12, 1.7), stone, T.x1 + 0.06, Y0 + 1.56, DECK.z);
  // the motor house north of the bay: the motor on top, the horn of the platform's speaking tube, the feed box
  const MH = { x: -9.9, z: 20.6, hw: 0.55, hd: 0.7, h: 1.35 };
  add(box(MH.hw * 2, MH.h, MH.hd * 2), teal, MH.x, Y0 + MH.h / 2, MH.z); add(box(MH.hw * 2 + 0.12, 0.08, MH.hd * 2 + 0.12), steel, MH.x, Y0 + MH.h + 0.04, MH.z);
  add(cyl(0.3, 0.3, 0.8, 14), steel, MH.x, Y0 + MH.h + 0.38, MH.z - 0.1, 0, Math.PI / 2);
  for (let i = 0; i < 4; i++) add(new THREE.TorusGeometry(0.31, 0.025, 5, 14), steel, MH.x, Y0 + MH.h + 0.38, MH.z - 0.4 + i * 0.2);
  add(cyl(0.2, 0.03, 0.45, 12), brass, MH.x + MH.hw + 0.2, Y0 + 1.75, MH.z - 0.45, 0, 0, -Math.PI / 2 + 0.5); add(cyl(0.03, 0.03, 0.5, 6), brass, MH.x + MH.hw - 0.05, Y0 + 1.5, MH.z - 0.45);
  add(box(0.5, 0.6, 0.16), dark, MH.x, Y0 + 1.0, MH.z - MH.hd - 0.08);
  col({ type: 'box', x: MH.x, z: MH.z, hw: MH.hw, hd: MH.hd + 0.12, rot: 0, top: Y0 + MH.h + 0.75, noStand: true });
  // the crates landed at the bridge's mouth
  const STK = { x: -7.2, z: 25.2 };
  for (const [dx, dz, y, s] of [[0, 0, 0, 0.7], [0.75, 0.1, 0, 0.62], [0.3, 0.05, 0.7, 0.58]]) add(box(s, s, s), wood, STK.x + dx, Y0 + y + s / 2, STK.z + dz, 0.2 * dx);
  col({ type: 'box', x: STK.x + 0.36, z: STK.z + 0.04, hw: 0.75, hd: 0.42, rot: 0, top: Y0 + 1.3, noStand: true });
  // ---- Irsa's Pump Works on the west face: the bench along the wall, the test pump, what waits to be mended, her sign
  const BX = WORKS.x - 0.42, BZc = (WORKS.z0 + WORKS.z1) / 2, BL = WORKS.z1 - WORKS.z0;
  add(box(0.8, 0.08, BL), wood, BX, Y0 + 0.88, BZc);
  for (const z of [WORKS.z0 + 0.15, BZc, WORKS.z1 - 0.15]) for (const x of [BX - 0.3, BX + 0.3]) add(box(0.09, 0.84, 0.09), wood, x, Y0 + 0.42, z);
  add(box(0.7, 0.04, BL - 0.3), wood, BX, Y0 + 0.25, BZc);
  col({ type: 'box', x: BX, z: BZc, hw: 0.42, hd: BL / 2, rot: 0, top: Y0 + 0.92, noStand: true });
  const PUMP = { x: BX + 0.05, z: BZc };   // No. 9 on the bench: a casing on feet, its plate, the gauge's stem
  add(cyl(0.2, 0.2, 0.55, 14), teal, PUMP.x, Y0 + 1.16, PUMP.z, 0, Math.PI / 2); add(box(0.3, 0.06, 0.5), steel, PUMP.x, Y0 + 0.95, PUMP.z);
  add(cyl(0.05, 0.05, 0.5, 8), brass, PUMP.x + 0.24, Y0 + 1.16, PUMP.z + 0.05, 0, 0, Math.PI / 2);
  add(cyl(0.016, 0.016, 0.42, 6), brass, PUMP.x, Y0 + 1.55, PUMP.z);
  add(new THREE.PlaneGeometry(0.34, 0.1), new THREE.MeshStandardMaterial({ map: signTex(["IRSA'S · No. 9"], { bg: '#c9a040', ink: '#2a1a08', w: 256, h: 80, size: 30 }), roughness: 0.5 }), PUMP.x - 0.205, Y0 + 1.17, PUMP.z, -Math.PI / 2);
  // casings and a flywheel waiting on the ground at the bench's north end, a tool rack on the wall over it
  for (const [dz, r, c] of [[-0.9, 0.3, teal], [-1.55, 0.24, steel]]) { add(cyl(r, r, 0.6, 12), c, BX - 0.1, Y0 + r, WORKS.z0 + dz, 0, 0, Math.PI / 2); }
  add(new THREE.TorusGeometry(0.42, 0.06, 6, 18), red, WORKS.x - 0.12, Y0 + 0.5, WORKS.z0 - 1.3, Math.PI / 2, 0, 0.25);
  col({ type: 'box', x: BX - 0.05, z: WORKS.z0 - 1.2, hw: 0.45, hd: 0.72, rot: 0, top: Y0 + 0.7, noStand: true, seeThrough: true });
  add(box(0.05, 0.5, 1.9), wood, WORKS.x - 0.04, Y0 + 1.75, BZc);
  for (let i = 0; i < 6; i++) add(box(0.03, 0.34 - (i % 3) * 0.06, 0.05), steel, WORKS.x - 0.08, Y0 + 1.72, BZc - 0.75 + i * 0.3);
  const SIGN = { x: WORKS.x - 0.05, z: WORKS.z1 + 1.0 };
  add(box(0.06, 0.56, 1.7), wood, SIGN.x, Y0 + 2.2, SIGN.z);
  add(new THREE.PlaneGeometry(1.6, 0.46), new THREE.MeshStandardMaterial({ map: signTex(["IRSA'S PUMP WORKS"], { size: 46 }), roughness: 0.8 }), SIGN.x - 0.035, Y0 + 2.2, SIGN.z, -Math.PI / 2);
  // the brass wheel's mast at the terrace's north-west corner (the wheel itself turns: below)
  const MAST = { x: T.x0 + 0.45, z: T.z0 + 0.45, h: 5.4 };
  add(cyl(0.07, 0.1, MAST.h, 8), teal, MAST.x, TOP + MAST.h / 2, MAST.z); add(box(0.5, 0.1, 0.1), teal, MAST.x - 0.2, TOP + MAST.h - 0.9, MAST.z);
  col({ type: 'cyl', x: MAST.x, z: MAST.z, r: 0.14, top: TOP + MAST.h, noStand: true, seeThrough: true });
  // (the stair's head: a rail across its west end)
  add(box(0.08, 0.95, STAIR.w), teal, T.x0 - 0.02, TOP + 0.47, STAIR.z0 + STAIR.w / 2);
  col({ type: 'box', x: T.x0 - 0.04, z: STAIR.z0 + STAIR.w / 2, hw: 0.06, hd: STAIR.w / 2, rot: 0, top: TOP + 1.0, bottom: TOP - 0.2, noStand: true, seeThrough: true });

  // ---- what moves
  const D = new THREE.Group(); group.add(D);
  // (the small moving parts cast no shadow of their own — a draw each in the shadow pass; the deck, the cart and the wheel do)
  const dyn = (geo, m, x, y, z, parent = D) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  // the brass wheel on the mast: eight spokes, turning in the wind
  const wheel = new THREE.Group(); wheel.position.set(MAST.x - 0.48, TOP + MAST.h - 0.9, MAST.z); wheel.userData.keep = true; D.add(wheel);
  { const g2 = new THREE.Group(); const rim = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.07, 6, 24), brass); g2.add(rim); for (let i = 0; i < 4; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.05, 0.05), brass); sp.rotation.z = (i * Math.PI) / 4; g2.add(sp); } const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 10), brass); hub.rotation.x = Math.PI / 2; g2.add(hub); mergeStatic(g2, { recolor: false }); g2.rotation.y = Math.PI / 2; wheel.add(g2); wheel.userData.spin = g2; }
  // the deck: planks on a steel frame, a toe rail on its open sides; the cart rides on it
  const deck = new THREE.Group(); deck.position.set(DECK.x, Y0 + HALF, DECK.z); deck.userData.keep = true; D.add(deck);
  { const g2 = new THREE.Group(); const a2 = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; g2.add(o); };
    a2(box(2 * DECK.hw, 0.1, 2 * DECK.hd), wood, 0, -0.05, 0); a2(box(2 * DECK.hw + 0.1, 0.14, 0.1), steel, 0, -0.17, -DECK.hd + 0.05); a2(box(2 * DECK.hw + 0.1, 0.14, 0.1), steel, 0, -0.17, DECK.hd - 0.05);
    a2(box(0.06, 0.1, 2 * DECK.hd), red, DECK.hw - 0.03, 0.05, 0); a2(box(2 * DECK.hw, 0.1, 0.06), red, 0, 0.05, DECK.hd - 0.03); a2(box(2 * DECK.hw, 0.1, 0.06), red, 0, 0.05, -DECK.hd + 0.03);
    mergeStatic(g2, { recolor: true, retex: true }); deck.add(g2); }
  // (its brick reaches 0.2 m into the terrace's: no seam to fall into between the deck and the upper landing)
  const deckCol = col({ type: 'box', x: DECK.x - 0.1, z: DECK.z, hw: DECK.hw + 0.1, hd: DECK.hd, rot: 0, top: Y0 + HALF, bottom: Y0 + HALF - 0.25 });
  // the cart: a tank on a frame with four wheels, a push bar at its east end, a ring on top for the chain
  const cart = new THREE.Group(); cart.position.set(CART0.x, Y0 + HALF, CART0.z); cart.userData.keep = true; D.add(cart);
  const tank = new THREE.Group(); tank.position.set(0, 0.38, 0); cart.add(tank);
  { const g2 = new THREE.Group(); const a2 = (geo, m, x, y, z, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); o.castShadow = true; g2.add(o); };
    a2(cyl(0.36, 0.36, 1.15, 14), paint('#3f7f9a', 0.5), 0, 0.36, 0, 0, Math.PI / 2); for (const x of [-0.42, 0.42]) a2(new THREE.TorusGeometry(0.365, 0.025, 5, 16), brass, x, 0.36, 0, 0, 0);
    g2.children.slice(1).forEach((c) => { c.rotation.y = Math.PI / 2; });
    a2(new THREE.TorusGeometry(0.07, 0.018, 5, 10), steel, 0, 0.77, 0); a2(cyl(0.045, 0.055, 0.16, 8), brass, -0.3, 0.62, 0.4, Math.PI / 2);
    mergeStatic(g2, { recolor: false }); tank.add(g2); }
  { const g2 = new THREE.Group(); const a2 = (geo, m, x, y, z, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.x = rx; o.castShadow = true; g2.add(o); };
    a2(box(1.3, 0.08, 0.7), wood, 0, 0.34, 0); for (const x of [-0.45, 0.45]) for (const z of [-0.36, 0.36]) a2(cyl(0.17, 0.17, 0.07, 12), dark, x, 0.17, z, Math.PI / 2);
    a2(box(0.05, 0.66, 0.05), steel, 0.66, 0.69, -0.3); a2(box(0.05, 0.66, 0.05), steel, 0.66, 0.69, 0.3); a2(box(0.05, 0.05, 0.66), steel, 0.66, 1.02, 0);
    mergeStatic(g2, { recolor: true, retex: true }); cart.add(g2); }
  const cartCol = col({ type: 'box', x: CART0.x, z: CART0.z, hw: 0.68, hd: 0.4, rot: 0, top: Y0 + HALF + 1.2, bottom: Y0 + HALF, noStand: true });
  const cartCol2 = col({ type: 'box', x: CART0.x - PUSH, z: CART0.z, hw: 0.68, hd: 0.4, rot: 0, top: TOP + 1.2, bottom: TOP, noStand: true }); cartCol2.enabled = false;
  // the safety chain from the head frame's jib, its hook (hauled up clear; let down onto the cart's ring)
  const chain = dyn(new THREE.CylinderGeometry(0.012, 0.012, 1, 5), steel, CART0.x, TOP + 2.2, CART0.z); chain.userData.keep = true;
  const hook = dyn(new THREE.TorusGeometry(0.06, 0.016, 5, 10, Math.PI * 1.5), brass, CART0.x, TOP + 1.7, CART0.z); hook.userData.keep = true;
  add(box(1.1, 0.1, 0.1), teal, T.x1 + 0.6, TOP + 2.72, CART0.z);
  // the chain's hand wheel on the south post, the bell on the north one (their brackets)
  const HOOK = { x: T.x1 - 0.2, z: BAY.z1 + 0.2 }, BELL = { x: T.x1 - 0.2, z: BAY.z0 - 0.2 };
  const hwheel = dyn(new THREE.TorusGeometry(0.16, 0.022, 5, 14), red, HOOK.x, TOP + 1.2, HOOK.z); hwheel.rotation.y = Math.PI / 2; hwheel.userData.keep = true;
  add(box(0.34, 0.06, 0.06), steel, HOOK.x + 0.15, TOP + 1.2, HOOK.z);
  const bell = new THREE.Group(); bell.position.set(BELL.x, TOP + 1.55, BELL.z); bell.userData.keep = true; D.add(bell);
  dyn(new THREE.CylinderGeometry(0.05, 0.13, 0.2, 10), brass, 0, -0.12, 0, bell); dyn(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 4), dark, 0, -0.38, 0, bell);
  add(box(0.34, 0.05, 0.05), steel, BELL.x + 0.15, TOP + 1.57, BELL.z);
  mergeStatic(bell, { recolor: true, retex: true });
  // the brake lever on the motor house's east side (Kell's), the feed switch on its north face, the flywheel
  const lever = new THREE.Group(); lever.position.set(MH.x + MH.hw + 0.06, Y0 + 0.75, MH.z + 0.3); lever.userData.keep = true; D.add(lever);
  dyn(new THREE.BoxGeometry(0.06, 0.95, 0.06), red, 0, 0.42, 0, lever); dyn(new THREE.SphereGeometry(0.06, 8, 6), dark, 0, 0.92, 0, lever);
  mergeStatic(lever, { recolor: true, retex: true });
  const sw = new THREE.Group(); sw.position.set(MH.x, Y0 + 1.0, MH.z - MH.hd - 0.17); sw.userData.keep = true; D.add(sw);
  dyn(new THREE.BoxGeometry(0.05, 0.34, 0.05), brass, 0, 0.15, 0, sw); dyn(new THREE.SphereGeometry(0.045, 8, 6), red, 0, 0.33, 0, sw);
  mergeStatic(sw, { recolor: true, retex: true });
  const fly = dyn(new THREE.TorusGeometry(0.33, 0.05, 6, 18), red, MH.x, Y0 + MH.h + 0.38, MH.z + 0.42); fly.userData.keep = true;
  { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.04), steel); fly.add(sp); const sp2 = sp.clone(); sp2.rotation.z = Math.PI / 2; fly.add(sp2); }
  // the cistern's float (up the rod as it fills), the standpipe's water, the bench pump's gauge, dial and crank
  const float_ = dyn(new THREE.SphereGeometry(0.09, 10, 8), red, CIS.x + 0.9, TOP + 0.3, CIS.z + CIS.r + 0.12); float_.userData.keep = true;
  const water = dyn(new THREE.CylinderGeometry(0.014, 0.018, 0.42, 6), new THREE.MeshStandardMaterial({ color: '#cfe8ff', roughness: 0.05, transparent: true, opacity: 0.75, emissive: '#5a8ab0', emissiveIntensity: 0.2 }), TAP.x, Y0 + 0.62, TAP.z); water.visible = false; water.castShadow = false; water.userData.keep = true;
  const pour = dyn(new THREE.CylinderGeometry(0.03, 0.05, 0.5, 6), water.material, FIL.x + 0.25, TOP + 1.1, FIL.z); pour.rotation.z = 0.9; pour.visible = false; pour.castShadow = false; pour.userData.keep = true;
  const face = dyn(new THREE.CircleGeometry(0.15, 18), new THREE.MeshStandardMaterial({ map: dialTex(), roughness: 0.6 }), PUMP.x - 0.02, Y0 + 1.86, PUMP.z); face.rotation.y = -Math.PI / 2; face.userData.keep = true;
  const needle = dyn(new THREE.BoxGeometry(0.012, 0.13, 0.008), dark, PUMP.x - 0.035, Y0 + 1.86, PUMP.z); needle.geometry.translate(0, 0.055, 0); needle.rotation.y = -Math.PI / 2; needle.userData.keep = true;
  const DIAL = { x: BX - 0.25, z: PUMP.z - 0.75 }, CRANK = { x: BX - 0.25, z: PUMP.z + 0.78 };   // (at the bench's front edge: within his reach)
  const knob = new THREE.Group(); knob.position.set(DIAL.x, Y0 + 0.97, DIAL.z); knob.userData.keep = true; D.add(knob);
  dyn(new THREE.CylinderGeometry(0.11, 0.12, 0.07, 12), brass, 0, 0, 0, knob); dyn(new THREE.BoxGeometry(0.03, 0.03, 0.12), red, 0, 0.045, -0.05, knob);
  mergeStatic(knob, { recolor: true, retex: true });
  const crank = new THREE.Group(); crank.position.set(CRANK.x, Y0 + 1.18, CRANK.z); crank.userData.keep = true; D.add(crank);
  { const w2 = dyn(new THREE.TorusGeometry(0.2, 0.025, 5, 14), red, 0, 0, 0, crank); w2.rotation.y = Math.PI / 2; dyn(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6), dark, -0.08, 0.2, 0, crank).rotation.z = Math.PI / 2; }
  mergeStatic(crank, { recolor: true, retex: true });
  add(cyl(0.03, 0.03, 0.3, 6), steel, CRANK.x + 0.02, Y0 + 1.03, CRANK.z, 0, 0, 0);   // the crank's stand on the bench
  mergeStatic(S, { recolor: true, retex: true });

  // ---- state and motion
  const TP = (x, z, a, clip) => { const p = W(x, z); return touch(p.x, p.z, a, clip); };
  const A = {
    top: TOP, half: Y0 + HALF, low: Y0 + LOW, deckY: Y0 + HALF, y0: Y0,
    spots: {
      kell: { ...W(MH.x + MH.hw + 0.75, MH.z + 0.3), a: -Math.PI / 2 },
      brelA: { ...W(STK.x - 0.55, STK.z - 0.75), a: Math.PI / 4 }, brelB: { ...W(T.x1 + 0.75, DECK.z), a: -Math.PI / 2 }, brelClear: { ...W(STK.x - 1.2, STK.z - 0.2), a: -Math.PI / 2 },
      brelTap: { ...W(TAP.x, TAP.z - 0.85), a: 0 }, brelWay: [W(MH.x + MH.hw + 1.9, MH.z + 0.6), W(MH.x + MH.hw + 1.2, MH.z - MH.hd - 1.5)],   // (his way from the lane round the motor house to the standpipe)
      irsa: { ...W(BX - 0.25, WORKS.z1 + 1.0), a: Math.atan2(-1, -0.6) },   // (under her sign, off the bench's end: the crank's prompt is his) irsaTap: { ...W(TAP.x + 0.95, TAP.z - 0.5), a: -Math.PI / 2 - 0.5 },
      stairFoot: W(STAIR.x0 + 0.8, STAIR.z0 + STAIR.w / 2), stairTop: W(T.x0 + 0.6, T.z1 - 0.7),
    },
    // (what his hand goes to — story/reach.js: the point, the way he faces it, the clip for its height, where he stands)
    hook: TP(HOOK.x - 0.04, HOOK.z, Math.PI / 2, 'tinker'),                       // the chain's hand wheel
    bell: TP(BELL.x, BELL.z, Math.PI / 2, 'tinker'),                              // the bell's cord
    feed: TP(MH.x, MH.z - MH.hd - 0.2, 0, 'tinker'),                              // the feed switch
    cart: TP(CART0.x + 0.66, CART0.z, -Math.PI / 2, 'setDown'),                   // the cart's push bar (on the deck)
    cock: TP(CART0.x - PUSH - 0.3, CART0.z + 0.46, Math.PI, 'setDown'),           // the cart's cock (at the filler)
    deck: W(DECK.x, DECK.z), deckR: Math.max(DECK.hw, DECK.hd), cartEnd: W(CART0.x - PUSH + 1.12, CART0.z),
    filler: W(FIL.x, FIL.z), cistern: W(CIS.x, CIS.z), standpipe: W(TAP.x, TAP.z), sign: W(SIGN.x, SIGN.z),
    dial: TP(DIAL.x, DIAL.z, Math.PI / 2, 'setDown'), crank: TP(CRANK.x - 0.05, CRANK.z, Math.PI / 2, 'tinker'), bench: W(PUMP.x, PUMP.z),
    lane: W(-6.6, 22.8), bay: { ...W(T.x1 - 0.5, DECK.z), z0: W(0, BAY.z0).z, z1: W(0, BAY.z1).z }, wheelAt: W(MAST.x, MAST.z),
    state: {}, running: false, cartK: 0,
    setDeck(y) {
      this.deckY = y; deck.position.y = y; deckCol.top = y; deckCol.bottom = y - 0.25;
      if (this.cartK <= 0) { cart.position.y = y; cartCol.top = y + 1.2; cartCol.bottom = y; }
    },
    setCart(k, tip = 0) {
      this.cartK = k;
      const x = CART0.x - PUSH * k; cart.position.x = x; if (k > 0) cart.position.y = TOP;
      cartCol.enabled = k <= 0; cartCol2.enabled = k >= 1;   // (pushed along the rails it is in his hands: solid again at the filler)
      tank.rotation.z = 0.55 * tip;
    },
    setHook(k) { const y1 = this.deckY + 1.22, y0 = TOP + 2.25, y = y0 + (y1 - y0) * k; hook.position.y = y; const len = TOP + 2.68 - y; chain.scale.y = Math.max(0.05, len); chain.position.y = y + len / 2; hook.visible = chain.visible = this.cartK <= 0; },
    get ride() { return this.cart.front; },   // (he rides at the cart's bar)
    setState(s = {}) {
      const st = (this.state = { deck: 'half', hooked: false, fed: false, cart: 'deck', water: false, dial: 0, ...s });
      this.setCart(st.cart === 'filler' ? 1 : 0, 0);
      this.setDeck(st.deck === 'top' ? TOP : st.deck === 'low' ? Y0 + LOW : Y0 + HALF);
      this.setHook(st.hooked ? 1 : 0);
      lever.rotation.z = st.deck === 'half' ? 0.5 : -0.35; sw.rotation.x = st.fed ? 0.7 : -0.7; this.running = !!st.fed;
      float_.position.y = TOP + (st.water ? 1.55 : 0.3); water.visible = !!st.water; pour.visible = false;
      knob.rotation.y = -st.dial * 0.9; needle.rotation.z = 0; this.moving = null;
    },
    // the deck (the cart on it, the chain, whoever rides) to a height over `secs`; `done` when it is there
    moveDeck(to, secs, riders = [], done = null) { this.moving = { y0: this.deckY, y1: to, t: 0, secs, riders, done }; lever.rotation.z = -0.35; },
    ringBell() { this.bellT = 0; },
    spinCrank(turns = 3) { this.crankT = 0; this.crankN = turns; },
    kick(dir = 1) { this.kickT = 0; this.kickDir = dir; },
    turnHook() { this.hookT = 0; },
    pourOn(b) { pour.visible = !!b; },
  };
  updaters.push((dt, t) => {
    wheel.userData.spin.rotation.x = t * 0.5;
    if (A.running) fly.rotation.z += dt * 7;
    const M = A.moving;
    if (M) {
      M.t = Math.min(M.secs, M.t + dt);
      const k = M.t / M.secs, e = k * k * (3 - 2 * k), y = M.y0 + (M.y1 - M.y0) * e;
      A.setDeck(y); if (A.state.hooked) A.setHook(1);
      for (const a of M.riders) if (a?.pos) { a.pos.y = y; a.vy = 0; a.onGround = true; a.sync?.(); }
      if (M.t >= M.secs) { A.moving = null; M.done?.(); }
    }
    if (A.bellT != null) { A.bellT += dt; bell.rotation.x = 0.7 * Math.sin(A.bellT * 14) * Math.exp(-A.bellT * 1.6); if (A.bellT > 2.2) { A.bellT = null; bell.rotation.x = 0; } }
    if (A.hookT != null) { A.hookT += dt; hwheel.rotation.x = A.hookT * 6; A.setHook(Math.min(1, A.hookT / 1.1)); if (A.hookT >= 1.1) A.hookT = null; }
    if (A.crankT != null) { A.crankT += dt; crank.rotation.x = A.crankT * 9; if (A.crankT > A.crankN * 0.7) { A.crankT = null; } }
    if (A.kickT != null) { A.kickT += dt; needle.rotation.z = -A.kickDir * 0.95 * Math.exp(-A.kickT * 8) * Math.abs(Math.cos(A.kickT * 22)); if (A.kickT > 0.6) { A.kickT = null; needle.rotation.z = 0; } }
  });
  A.setState({});
  return A;
}
