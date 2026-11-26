// Citadel Spaceport. Twelve years after LBA2, the Esmers' shuttles are ordinary traffic, so Citadel has a port for
// them: a landing platform on stilts over the bay east of the town, a footbridge from the shore, a small terminal
// (Twinsun stone below, an Esmer dome above), a control tower, and a shuttle on the pad.
// From chapter 4 on it flies to Zeelich Spaceport only — Zeelich is another planet; its islands are reached from
// there by Esmer shuttle (src/game/travel.js, CONNECT); before that passenger flights are
// grounded by the Joint Project (the note on the hatch says so) and only a project ship flies: in chapter 2 Doran
// takes Twinsen across in one (PLANET-1, story/chapter1.js).
//
// SPACEPORT-2 (the user, 15.11, a picture from the shore: "the way in should come from inside the building, as at a
// real airport: you go in, through security, and then out to the area you fly from"). The footbridge ends at the
// terminal's landside door: the terminal stands across the bridge's end on the deck's west side, so the deck (airside)
// is reached only through it — the door from the bridge into the hall (terminal.js: past the ticket counter and the
// security pillars) and out by the gate in its east face onto the walkway to the pad. Back the same way: in by the
// gate, out by the door. The deck's railing meets the terminal's walls on both sides; the bridge's railings run into
// its west face. What was landside in spirit went landside: the TICKETS · INFO kiosk stands on the shore by the
// bridge's foot (Corla, story/stands.js), the departures board hangs on the terminal's west face beside the door. On
// the deck: one bench by the gate (Dov, the family), the fountain and the Zeelich map beside the gate; the cargo
// side by the pad's far side as before (trolleys, crates, a hand cart: Gurt's).
// Everything static is merged per material (one Kit for the platform, one for its furniture).
//
// CONTRACT (world coordinates, Citadel outdoors): buildSpaceport(root, physics, W) → W.spaceport =
//   { pad {x,z,y} (the shuttle: its interactable), landing {x,z,a} (where he steps off, airside), deck {x0,x1,z0,z1,y},
//     bridge {x0,x1,z,hw}, terminal {x0,x1,z0,z1} (the block), door {x,z} / gate {x,z} (its two doors, on its faces),
//     board {x,z, read {x,z}} (the departures board on the west face; where it is read from the bridge), kiosk
//     {x,z,ry} (on the shore), airside(x,z) (on the deck past the terminal?), saneSpot(at) (a spot of an older build
//     inside the terminal's walls → before its door or its gate), group, ship (its Group) }
import * as THREE from 'three';
import * as P from './props.js';
import { Kit, rbox, cyl, lathe, plane, torus, sphere, pipe, canvasTex, MAT, paintVC, tinted } from './props.js';
import { esmerShuttle } from './shuttle.js';
import { occOf } from '../engine/occlude.js';
import { mergeStatic } from '../engine/merge.js';

// the platform: east of the town over the bay (the shore is at x ≈ −26 at ground level 2.3 m)
const DECK = { x0: -14, x1: 14, z0: 26, z1: 54 };
export const BRIDGE = { x0: -31, x1: -13.6, z: 40, hw: 2.0 };   // (world.js keeps the scatter off its deck: TREES-1)
const PAD = { x: 4.5, z: 41 };
const RAIL_H = 1.1;
// SPACEPORT-2: the terminal across the bridge's end (its west face on the deck's west edge, the bridge in its middle)
export const TERMINAL_BLOCK = { x0: -14.0, x1: -7.0, z0: 34.0, z1: 46.0, h: 3.8 };
const TB = TERMINAL_BLOCK;
export const TERMINAL_DOOR = { x: TB.x0, z: BRIDGE.z };   // landside, from the bridge
export const TERMINAL_GATE = { x: TB.x1, z: BRIDGE.z };   // airside, onto the walkway to the pad
// the ticket kiosk on the shore by the bridge's foot (its hatch toward the path; story/stands.js KIOSK reads it)
export const PORT_KIOSK = { x: -35.2, z: 35.7, ry: 0.25 };
// SPACEPORT-3 (the user, 17.11: "the spaceship pad part is very empty and sad"): the apron's working things, each for a
// job somebody does there (roomlife.js CITADEL_PORT; story/chapter1.js: Doran at the fuel cart in chapter 2). World
// coordinates; `stand` is where the one who works it stands, `a` the way they face (the hero's angle)
const hullAt = (a, r) => ({ x: PAD.x + Math.sin(a) * r, z: PAD.z + Math.cos(a) * r });
// (the fuel port's way round the hull from the pad's middle, south-west toward the fuel cart: the middle of one of the
//  octagonal hull's faces, at its apothem at the port's height)
const FUEL_A = -3 * Math.PI / 8;
export const APRON = {
  // the fuel cart south of the walkway's end, its control box toward the gate's side; its hose reel at its north end
  fuel: { x: -0.4, z: 44.0, ry: -Math.PI / 2, stand: { x: -1.38, z: 44.4, a: Math.PI / 2 } },
  // the ship's fuel port, on the red hull's rim (y over the deck), and where one stands to work the coupling
  port: { ...hullAt(FUEL_A, 3.0), y: 1.3, stand: { ...hullAt(FUEL_A - 0.12, 3.85), a: FUEL_A - 0.12 + Math.PI } },
  // the technician's tool trolley by the ship's south-east, the checklist on its top; the hull's points the checks go to
  tools: { x: 8.9, z: 46.1, ry: -2.4 },
  checks: [0.3, 1.05, 2.3].map((a) => ({ ...hullAt(a, 3.85), a: a + Math.PI })),
  // the loading pallet by the ship's north side (cargo for the hold), where the cargo is set down
  pallet: { x: 7.3, z: 35.3, ry: 0.15 },
  // the boarding line: a rope on three posts along the walkway's north edge, the travellers wait north of it
  rope: { x0: -4.3, x1: -1.7, z: 37.75 },
};

const nameTex = () => canvasTex(512, 96, (x, W, H) => {
  x.fillStyle = '#f4efe2'; x.fillRect(0, 0, W, H); x.fillStyle = '#2f6a9a'; x.font = 'bold 46px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('SPACEPORT', W / 2, H / 2 + 2);
});
const gateTex = () => canvasTex(512, 112, (x, W, H) => {
  x.fillStyle = '#f4efe2'; x.fillRect(0, 0, W, H); x.strokeStyle = '#2f6a9a'; x.lineWidth = 8; x.strokeRect(4, 4, W - 8, H - 8);
  x.fillStyle = '#2f6a9a'; x.font = 'bold 50px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('GATE 1 · TOWN', W / 2, H / 2 + 2);
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
  // deck top: level with the shore. (OVERLAP-SWEEP: from the highest ground under the bridge's shore end, not its middle
  // point: the shore rises 15 cm across the bridge's width to the north, and 7 m² of its planks lay under the dirt there)
  let gMax = physics.groundAt(BRIDGE.x0, BRIDGE.z);
  for (let x = BRIDGE.x0; x <= BRIDGE.x0 + 5.5; x += 0.5) for (const dz of [-BRIDGE.hw, -BRIDGE.hw / 2, 0, BRIDGE.hw / 2, BRIDGE.hw]) gMax = Math.max(gMax, physics.terrain.heightAt(x, BRIDGE.z + dz));
  const Y = Math.max(2.3, gMax) + 0.03;
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

  // --- railings: round the deck (on its west edge from the corners to the terminal's walls: SPACEPORT-2, the deck is
  //     shut from the bridge) and along the bridge, into the terminal's west face. Blue posts with a brass handrail, a
  //     mid rail and a toe board along the planks (the toe board keeps a dropped crate on the deck). Each rail's
  //     collider runs 0.1 m past its ends: into the terminal's wall where it meets it (no gap to squeeze through)
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
  rail(DECK.x0, DECK.z0, DECK.x0, TB.z0 - 0.06); rail(DECK.x0, TB.z1 + 0.06, DECK.x0, DECK.z1);
  rail(BRIDGE.x0 + 5, bz0, TB.x0 - 0.06, bz0); rail(BRIDGE.x0 + 5, bz1, TB.x0 - 0.06, bz1);

  // --- the landing pad and the shuttle; a painted walkway from the terminal's gate to the pad
  // (FEET-66: the pad is walked on: a floor at its top, Y + 0.12; before, he stood on the deck under it, his feet 12 cm in
  //  it, and its yellow ring stood 9 cm over the pad: now 1.5 cm over it, the ring's tube sunk into the pad)
  add(cyl(4.8, 5.0, 0.12, 32), pad, PAD.x, Y + 0.06, PAD.z);
  add(torus(4.3, 0.08, 6, 40), yellow, PAD.x, Y + 0.055, PAD.z, 0, { rx: Math.PI / 2 });
  physics.add({ type: 'cyl', x: PAD.x, z: PAD.z, r: 4.9, top: Y + 0.12, bottom: Y - 0.6, seeThrough: true });   // (to 4.85 under him, physics.js: the cap's edge 4.8, its slanting side 3 cm under there)
  for (let i = 0; i < 16; i++) { const a = (i + 0.5) * Math.PI / 8; add(rbox(0.5, 0.02, 0.14, 0.01), i % 2 ? pad : yellow, PAD.x + Math.sin(a) * 4.62, Y + 0.125, PAD.z + Math.cos(a) * 4.62, a + Math.PI / 2); }
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; add(cyl(0.1, 0.12, 0.12, 8), MAT.glow('#fff4c0', '#ffd860', 1.6), PAD.x + Math.sin(a) * 5.2, Y + 0.06, PAD.z + Math.cos(a) * 5.2); }
  for (const s of [-1, 1]) for (let x = TB.x1 + 0.5; x < PAD.x - 5.6; x += 1.4) pv(k, rbox(0.9, 0.012, 0.1, 0.005), '#e8c040', x + 0.45, Y + 0.006, BRIDGE.z + s * 1.75);
  // (TRAVEL-1: the ship is merged on its own and joins the port after the port's merge: the journey film hides it while
  //  its twin flies)
  const sh = esmerShuttle({ landed: true }); sh.position.set(PAD.x, Y + 0.12, PAD.z); sh.rotation.y = -Math.PI / 2; mergeStatic(sh);
  physics.add({ type: 'cyl', x: PAD.x, z: PAD.z, r: 3.2, top: Y + 4.4, noStand: true });

  // --- SPACEPORT-3: the apron at work (APRON above). All of it in the port's two kits (merged with the rest), except the
  //     fuel hose's two states, which change with the port's day (setWork): its line run out to the ship's port while a
  //     ship is readied (flights running; the project's ship in chapter 2), its nozzle hung on the cart while grounded
  const A = APRON, glowW = MAT.glow('#fff4c0', '#ffd860', 1.6), studM = MAT.glow('#bfe9ff', '#5fc0e8', 1.3);
  // the walkway's edge lights (blue studs along its painted lines) and a hazard bar across its end before the pad's ring
  for (const s of [-1, 1]) for (let x = TB.x1 + 1.1; x < PAD.x - 5.6; x += 1.4) add(cyl(0.06, 0.07, 0.05, 8), studM, x, Y + 0.025, BRIDGE.z + s * 1.95);
  for (let i = 0; i < 9; i++) pv(f, rbox(0.3, 0.012, 0.38, 0.004), i % 2 ? '#2a2c30' : '#e8c040', PAD.x - 5.75, Y + 0.008, BRIDGE.z - 1.52 + i * 0.38);
  // the fuel cart: a yellow tank on a wheeled chassis, the control box at its front (its panel lit), the hose reel at its
  // north end with the hose wound on it (built facing +z: its front, the control box, toward the one who works it)
  const fuelCart = (kk) => {
    const c = (geo, col, x, y, z, ry = 0, o) => pv(kk, geo, col, x, y, z, ry, o);
    c(rbox(1.7, 0.12, 0.95, 0.03), '#3a3e46', 0, 0.34, 0);
    for (const sx of [-0.6, 0.6]) for (const sz of [-0.4, 0.4]) c(cyl(0.18, 0.18, 0.1, 12), '#22252a', sx, 0.18, sz, 0, { rx: Math.PI / 2 });
    c(cyl(0.34, 0.34, 1.05, 14), '#e8c040', 0.225, 0.78, -0.12, 0, { rz: Math.PI / 2 });
    for (const ex of [-0.33, 0.78]) c(cyl(0.28, 0.34, 0.06, 14), '#c8a030', ex, 0.78, -0.12, 0, { rz: Math.PI / 2 });
    c(rbox(0.06, 0.08, 0.72, 0.02), '#2f6a9a', 0.225, 0.78, -0.12, 0);
    // the control box before the tank: its top the panel at 1.07 m (a dark face, two lit buttons, a dial)
    c(rbox(0.6, 0.66, 0.2, 0.03), '#d8dcd8', 0.4, 0.73, 0.36);
    c(rbox(0.5, 0.025, 0.16, 0.01), '#1d3550', 0.4, 1.07, 0.36);
    for (const bx of [0.24, 0.36]) kk.add(cyl(0.026, 0.026, 0.025, 8), glowW, bx, 1.09, 0.38);
    c(cyl(0.055, 0.055, 0.02, 12), '#f4efe2', 0.56, 1.09, 0.36);
    // the hose reel: a drum across the cart's north end on two posts, the hose wound round it
    for (const pz of [-0.4, 0.16]) c(rbox(0.06, 0.6, 0.06, 0.02), '#3a3e46', -0.62, 0.7, pz);
    c(cyl(0.2, 0.2, 0.5, 12), '#2a2c30', -0.62, 0.86, -0.12, 0, { rx: Math.PI / 2 });
    for (let i = 0; i < 4; i++) c(torus(0.24, 0.045, 6, 18), '#1f2124', -0.62, 0.86, -0.3 + i * 0.12);
    return { hw: 0.9, hd: 0.5, top: 1.15 };
  };
  put(fuelCart, A.fuel.x, A.fuel.z, A.fuel.ry, { low: false });
  // the ship's fuel port: a brass socket in the red hull's rim (the hose's end, or capped)
  add(sphere(0.09, 10, 8), brass, A.port.x, Y + A.port.y, A.port.z);
  add(cyl(0.13, 0.13, 0.04, 12), MAT.steel(), A.port.x, Y + A.port.y, A.port.z, FUEL_A, { rx: Math.PI / 2 });
  // the technician's tool trolley: two red shelves on legs, a toolbox below, on top the clipboard with the checklist and
  // a spanner (built facing +z)
  put((kk) => {
    const c = (geo, col, x, y, z, ry = 0, o) => pv(kk, geo, col, x, y, z, ry, o);
    for (const y of [0.3, 0.86]) c(rbox(0.9, 0.05, 0.55, 0.02), '#c8452f', 0, y, 0);
    for (const sx of [-0.42, 0.42]) for (const sz of [-0.24, 0.24]) { c(rbox(0.04, 0.84, 0.04, 0.01), '#3a3e46', sx, 0.46, sz); c(cyl(0.05, 0.05, 0.04, 8), '#22252a', sx, 0.04, sz, 0, { rz: Math.PI / 2 }); }
    c(rbox(0.5, 0.22, 0.3, 0.02), '#2f6a9a', -0.1, 0.44, 0); c(rbox(0.52, 0.03, 0.32, 0.01), '#26507a', -0.1, 0.56, 0);
    c(rbox(0.26, 0.012, 0.34, 0.004), '#a87a48', 0.18, 0.895, 0.02, 0.15); c(rbox(0.22, 0.004, 0.28, 0.002), '#f8f4e8', 0.18, 0.904, 0.03, 0.15);
    for (let i = 0; i < 5; i++) c(rbox(0.14, 0.002, 0.012, 0.001), '#5a5a66', 0.17 + (i % 2) * 0.01, 0.907, -0.07 + i * 0.045, 0.15);
    c(rbox(0.05, 0.03, 0.2, 0.01), '#9aa0a8', -0.22, 0.9, -0.05, 0.5);
    return { hw: 0.47, hd: 0.3, top: 0.92 };
  }, A.tools.x, A.tools.z, A.tools.ry);
  // the loading pallet by the ship's north side: a slatted pallet, two cargo crates on it
  put((kk) => {
    for (let i = 0; i < 5; i++) pv(kk, rbox(1.2, 0.04, 0.16, 0.01), '#b88a4a', 0, 0.13, -0.5 + i * 0.25);
    for (const x of [-0.5, 0, 0.5]) pv(kk, rbox(0.12, 0.11, 1.15, 0.01), '#8a6430', x, 0.055, 0);
    kk.at(-0.28, 0.15, -0.05, 0.08, () => P.cargoCrate(kk, { w: 0.62, h: 0.62, d: 0.9, color: '#3f6a8a' }));
    kk.at(0.32, 0.15, 0.12, -0.05, () => P.cargoCrate(kk, { w: 0.55, h: 0.5, d: 0.7, color: '#c8762f' }));
    return { hw: 0.62, hd: 0.6, top: 0.8 };
  }, A.pallet.x, A.pallet.z, A.pallet.ry);
  // the boarding line: three brass posts with a red rope between them (the travellers wait on its far side from the
  // walkway until the crew calls them out to the ship)
  {
    const R = A.rope, xs = [R.x0, (R.x0 + R.x1) / 2, R.x1];
    for (const x of xs) { add(cyl(0.035, 0.035, 0.9, 8), brass, x, Y + 0.45, R.z); add(cyl(0.16, 0.18, 0.05, 12), MAT.steel(), x, Y + 0.025, R.z); add(sphere(0.05, 8, 6), brass, x, Y + 0.92, R.z); }
    for (let i = 0; i < 2; i++) pv(k, cyl(0.022, 0.022, xs[i + 1] - xs[i], 6), '#c8452f', (xs[i] + xs[i + 1]) / 2, Y + 0.8, R.z, 0, { rz: Math.PI / 2 });
    wall(R.x0 - 0.06, R.x1 + 0.06, R.z - 0.06, R.z + 0.06, Y + 0.95, { seeThrough: true });
  }
  // the hose's two states (setWork): kept out of the port's merge and the draw batches (userData.keep: they toggle)
  const hoseRun = new THREE.Group(), hoseIdle = new THREE.Group(); hoseRun.userData.keep = hoseIdle.userData.keep = true;
  {
    const lc = (x, z) => ({ x: A.fuel.x - z, z: A.fuel.z + x });   // (the cart's own frame to the world: it stands at ry −π/2)
    const reel = lc(-0.62, -0.12), kr = new Kit(hoseRun), ki = new Kit(hoseIdle), dark = '#1f2124';
    const ux = Math.sin(FUEL_A), uz = Math.cos(FUEL_A), out = (d, y) => [A.port.x + ux * d, Y + y, A.port.z + uz * d];
    // run: off the reel's north side, down to the deck, across it to the ship and up into the port (the nozzle in it)
    const run = [[reel.x, Y + 0.95, reel.z - 0.26], [reel.x + 0.15, Y + 0.32, reel.z - 0.42], [reel.x + 0.45, Y + 0.06, reel.z - 0.6], out(1.0, 0.06), out(0.45, 0.7), out(0.12, A.port.y - 0.02)];
    pv(kr, pipe(run, 0.045, 0.3, 8), dark, 0, 0, 0);
    { const p = out(0.12, A.port.y - 0.02); pv(kr, cyl(0.07, 0.06, 0.2, 10), '#9aa0a8', p[0], p[1], p[2], FUEL_A, { rx: Math.PI / 2 }); }
    // idle: a short loop off the reel, its nozzle hung on the reel's front post
    const post = lc(-0.62, 0.22);
    pv(ki, pipe([[reel.x, Y + 0.95, reel.z - 0.26], [reel.x - 0.05, Y + 0.45, reel.z - 0.3], [post.x - 0.02, Y + 0.72, post.z - 0.08]], 0.045, 0.3, 8), dark, 0, 0, 0);
    pv(ki, rbox(0.08, 0.22, 0.1, 0.02), '#9aa0a8', post.x - 0.02, Y + 0.8, post.z - 0.1);
    kr.flush(); ki.flush(); mergeStatic(hoseRun); mergeStatic(hoseIdle);
  }

  // --- the terminal across the bridge's end: stone plinth, white walls, a glass band on its long sides and by the gate,
  //     a flat blue roof with an Esmer dome. Its west face (landside) has the door from the bridge, the port's name
  //     over it and the departures board beside it; its east face (airside) the gate onto the walkway
  const T = TB, th = T.h, tcx = (T.x0 + T.x1) / 2, tcz = (T.z0 + T.z1) / 2, tw = T.x1 - T.x0, td = T.z1 - T.z0;
  add(rbox(tw, th, td, 0.06), white, tcx, Y + th / 2, tcz);
  add(rbox(tw + 0.24, 0.3, td + 0.24, 0.04), stone, tcx, Y + 0.15, tcz);
  // on a face (s −1: west, +1: east): u along it (west: +z, east: −z), w out of it; the face's turn for a piece built
  // facing +z (its +x along the face)
  const fx = (s, w) => (s < 0 ? T.x0 - w : T.x1 + w), fz = (s, u) => tcz + (s < 0 ? u : -u), fry = (s) => (s < 0 ? -Math.PI / 2 : Math.PI / 2);
  const onFace = (s, geo, m, u, y, w, o) => add(geo, m, fx(s, w), Y + y, fz(s, u), fry(s), o);
  const pvFace = (s, geo, c, u, y, w, o) => pv(k, geo, c, fx(s, w), Y + y, fz(s, u), fry(s), o);
  // the glass band: along the long sides (north and south), and on the east face either side of the gate
  for (const z of [T.z0 - 0.02, T.z1 + 0.02]) {
    add(rbox(tw - 0.6, 0.9, 0.1, 0.02), glass, tcx, Y + 2.3, z);
    for (let x = T.x0 + 0.9; x < T.x1 - 0.5; x += 2.6) pv(k, rbox(0.12, 1.02, 0.08, 0.02), '#2f6a9a', x, Y + 2.3, z + Math.sign(z - tcz) * 0.04);
  }
  for (const u of [-3.6, 3.6]) { onFace(1, rbox(4.0, 0.9, 0.1, 0.02), glass, u, 2.3, 0.02); for (const du of [-1.3, 1.3]) pvFace(1, rbox(0.12, 1.02, 0.08, 0.02), '#2f6a9a', u + du, 2.3, 0.06); }
  add(rbox(tw + 0.5, 0.25, td + 0.5, 0.04), blue, tcx, Y + th + 0.12, tcz);
  add(lathe([[1.6, 0], [1.75, 0.35], [1.6, 0.9], [1.0, 1.45], [0.4, 1.8], [0.03, 2.1]], 16), MAT.paint('#8a5ac0', 0.4), tcx, Y + th + 0.25, tcz);
  add(cyl(0.05, 0.05, 0.8, 6), brass, tcx, Y + th + 2.6, tcz);
  // the doors: a blue leaf with a dark glass pane and a brass push bar, in a blue frame under a little canopy (it was
  // all pale glass over the white wall, which read as an empty frame: the user, "the door by the spaceship isn't drawn")
  const door = (s) => {
    pvFace(s, rbox(1.5, 2.2, 0.1, 0.02), '#3f7fb0', 0, 1.1, 0.05);
    pvFace(s, rbox(1.06, 1.1, 0.04, 0.01), '#1d3550', 0, 1.5, 0.11);
    onFace(s, rbox(1.0, 1.04, 0.02, 0.01), glass, 0, 1.5, 0.135);
    onFace(s, rbox(0.9, 0.06, 0.06, 0.02), brass, 0, 0.95, 0.15);
    pvFace(s, rbox(1.75, 0.12, 0.16, 0.03), '#2f6a9a', 0, 2.26, 0.06);
    for (const e of [-1, 1]) pvFace(s, rbox(0.12, 2.26, 0.16, 0.03), '#2f6a9a', e * 0.82, 1.13, 0.06);
    pvFace(s, rbox(2.3, 0.1, 1.1, 0.03), '#2f6a9a', 0, 2.62, 0.55, { rx: 0.08 });
  };
  door(-1); door(1);
  onFace(-1, plane(4.2, 0.8), MAT.map(nameTex(), 0.7), 0, 3.2, 0.09);
  onFace(1, plane(2.4, 0.52), MAT.map(gateTex(), 0.7), 0, 3.15, 0.09);
  // the departures board on the west face, north of the door, read from the bridge (CONNECT: Zeelich is another
  // planet — it names only the spaceship to Zeelich Spaceport; the islands are reached from there by Esmer shuttle)
  const BU = -3.15;
  pvFace(-1, rbox(2.62, 1.42, 0.08, 0.02), '#2a2e36', BU, 1.78, 0.04);
  pvFace(-1, rbox(2.8, 0.08, 0.3, 0.02), '#2f6a9a', BU, 2.53, 0.15);
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshStandardMaterial({ map: departuresTex(), emissive: '#ffffff', emissiveMap: departuresTex(), emissiveIntensity: 0.35, roughness: 0.75 }));
    m.position.set(fx(-1, 0.085), Y + 1.78, fz(-1, BU)); m.rotation.y = fry(-1); g.add(m); }
  const B = { x: T.x0, z: fz(-1, BU), read: { x: T.x0 - 0.55, z: BRIDGE.z - BRIDGE.hw - 0.25 } };
  W.signs.push({ x: B.read.x, z: B.read.z, key: 'port_board' });
  wall(T.x0, T.x1, T.z0, T.z1, Y + th + 0.3, { camSkip: true });
  // the play camera rises over the terminal and its dome rather than look through them, as LBA2's camera does over
  // scenery (VP-10, src/engine/occlude.js): the block to its roof slab, the dome by its lathe profile (no spire)
  occOf(W).add({ kind: 'box', x: tcx, z: tcz, hw: tw / 2 + 0.25, hd: td / 2 + 0.25, y0: Y - 1, y1: Y + th + 0.25, name: 'spaceport terminal' });
  occOf(W).add({ kind: 'rev', x: tcx, z: tcz, y0: Y + th, base: Y + th + 0.25, profile: [[0, 2.1], [0.03, 2.1], [0.4, 1.8], [1.0, 1.45], [1.6, 0.9], [1.75, 0.35]], name: 'spaceport dome' });

  // --- by the gate (airside): one bench facing the pad with a bin at its end, the drinking fountain on the terminal's
  //     wall north of the gate, the Zeelich map south of it (read from the walkway). The way from the gate to the
  //     ship stays clear
  // (SPACEPORT-2: the two benches, the tub, the planter, the potted plant and a bin stood along the old terminal's
  //  front; the red bench, its planter, a bin and a tub by the kiosk's corner: one bench and one bin are left)
  put((kk) => P.waitingBench(kk, { w: 1.9 }), -4.0, 34.9);
  put((kk) => P.litterBin(kk), -5.45, 34.75);
  put((kk) => P.drinkingFountain(kk), T.x1 + 0.55, 37.4, Math.PI / 2);
  put((kk) => P.infoStand(kk), -5.6, 44.2, Math.PI);

  // --- the ticket and information kiosk on the shore by the bridge's foot, its hatch toward the path (Corla's)
  put((kk) => P.kiosk(kk, { w: 2.1, d: 1.4, h: 2.55, label: 'TICKETS · INFO', color: '#2f6a9a' }), PORT_KIOSK.x, PORT_KIOSK.z, PORT_KIOSK.ry, { y: physics.groundAt(PORT_KIOSK.x, PORT_KIOSK.z) - 0.04, low: false });

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

  // --- flags on the deck's south edge, lamps along its edge (SPACEPORT-2: the two flags at the bridge's old entry
  //     onto the deck went with it: the terminal's door is the entry now)
  for (const x of [-4.5, 3.0]) put((kk) => P.flagPole(kk, { h: 4.6, color: '#7a52b0', color2: '#e8c040', len: 1.1 }), x, 53.25, 0, { low: false });
  for (const [x, z] of [[-13.2, 32.8], [-13.2, 52.9], [-1, 53.2], [7.0, 53.2], [13.2, 32.5], [13.2, 43.8]]) put((kk) => P.globeLamp(kk, { h: 3.0 }), x, z, 0, { low: false });

  // --- the sign post at the bridge's foot (SPACEPORT-2: the deck's own TOWN / SHUTTLE post went: the gate's sign says
  //     the way to town, through the terminal)
  const sx0 = BRIDGE.x0 - 1.4, sz0 = BRIDGE.z - BRIDGE.hw - 0.7;
  put((kk) => P.signPost(kk, [{ text: 'SPACEPORT', a: Math.PI / 2 }, { text: 'SQUARE', a: heading(sx0, sz0, -45, 30), color: '#c8452f' }, { text: 'HARBOUR', a: heading(sx0, sz0, -60, 33), color: '#2a8a7a' }]), sx0, sz0, 0, { y: physics.groundAt(sx0, sz0), low: false });
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
  // (PERF-IGPU) the two kits share most materials, and the landed shuttle never moves: one mesh per material for
  // the whole port (the departures board and the blinking beacon stay their own meshes)
  mergeStatic(g);
  g.add(sh, hoseRun, hoseIdle);
  // the tower's beacon blinks (its own mesh)
  const beacon = new THREE.Mesh(sphere(0.16, 10, 8), MAT.glow('#ff6050', '#ff3020', 2.2)); beacon.position.set(CT.x, Y + 11.85, CT.z); g.add(beacon);
  W.updaters.push((dt, t) => { beacon.visible = (t % 1.6) < 0.8; });

  const inBlock = (x, z, m = 0) => x > T.x0 - m && x < T.x1 + m && z > T.z0 - m && z < T.z1 + m;
  const S = W.spaceport = {
    pad: { x: PAD.x, z: PAD.z, y: Y },
    landing: { x: PAD.x - 6.2, z: PAD.z - 1.5, a: -Math.PI / 2 },
    deck: { ...DECK, y: Y }, bridge: { ...BRIDGE }, terminal: { ...TB }, door: { ...TERMINAL_DOOR }, gate: { ...TERMINAL_GATE },
    board: B, kiosk: { ...PORT_KIOSK }, group: g, ship: sh,
    // SPACEPORT-3: the apron's working things (APRON); the port's working day: 'run' (a ship being readied: the fuel hose
    // run out to its port) or 'idle' (grounded: the nozzle hung on the cart). story/islands.js portLook sets it
    apron: APRON, work: null,
    setWork(w) { if (w === this.work) return; this.work = w; hoseRun.visible = w === 'run'; hoseIdle.visible = w !== 'run'; },
    // on the deck past the terminal (airside): east of its gate's face, or in the deck's corners north and south of it
    airside: (x, z) => x > DECK.x0 && x < DECK.x1 + 0.5 && z > DECK.z0 - 0.5 && z < DECK.z1 + 0.5 && !inBlock(x, z),
    // SPACEPORT-2: a save of an older build made where the terminal stands now (the deck's west end by the old bridge's
    // end, the board, the kiosk) loads before its door on the bridge (the west half) or out of its gate (the east half),
    // facing away from the wall; anything else as it was
    saneSpot(at) {
      if (!at || !Number.isFinite(at.x) || !Number.isFinite(at.z) || !inBlock(at.x, at.z, 0.5)) return at;
      return at.x < tcx ? { x: T.x0 - 1.6, z: BRIDGE.z, a: -Math.PI / 2 } : { x: T.x1 + 1.6, z: BRIDGE.z, a: Math.PI / 2 };
    },
  };
  S.setWork('idle');
  return S;
}
