// U-1 "The Last Ferry" (the user's side quest, docs/lba-maturity/DEPTH-PLAN.md; the story in story/ferry.js): the things
// on Zeelich's terminal island the old sky-ferry line needs. Ours (the terminal island is a new city of Zeelich, no
// original layout); built from the project's own kit (props.js), nothing from LBA1/LBA2's files.
//
// What stands where (Zeelich-local metres: x, z from the island's origin; y is world height, the island walks at 6.0):
//   - the West Pier (zeelich.js PIER) keeps its rails and bollards. Its one-crate stack by the pier root became the
//     SAILINGS BOARD (the replacement, not an addition). At the pier's rail gap: the LOADING BRIDGE (a hinged ramp, up
//     until the winch house lowers it) under a small derrick post whose cord rings the landing BELL.
//   - the WINCH HOUSE behind the gateway's south pillar (x −47.6…−44.6, z 6.9…11.4): a door in its north wall; inside,
//     the bridge's hand wheel on the west wall; a partition with one hole (the port) across the house; the bridge's
//     COUNTERWEIGHT hangs in front of the port while the bridge is up; behind the partition the CABLE DRUM, and at its
//     east end the CATCH (a ratchet and pawl) whose trip paddle faces the back wall: only something through the port
//     reaches it. The drum's cable runs out through the west wall to the ferry's bow.
//   - the ferry "Patience" (zeelich.js buildFerry, the model kept out of sight until now) at the WEST berth; the second
//     berth off MILL LANE STEPS: a short timber stage off the south shore below the Cistern Rise, with one post that
//     holds its sign and its bell. The ferry's deck: a telegraph (its handle starts a sailing) and Oshra's tea crate.
//   - the deck is walkable only while she is moored, and only at her berth (DECK colliders per berth).
//
// CONTRACT  buildSkyFerry(game, Z) → Z.skyferry (story/ferry.js reads and drives it; world points, y world):
//   berth {west, mill}: {x, z, rot}; route(from, to) → { L, at(s) → {x, z, rot} }   (s: metres along it)
//   hut {x0, x1, z0, z1, door:{x, z}}, wheel {x, z, a, y, stand}, port {x, y, z}, trip {x, y, z, r}, weight {x, y, z},
//   plate {x, z}, drum {x, z}, cord {west, mill}: touch points; board {x, z, read}; millBoard {x, z};
//   telegraph(): its touch point on the moored ferry; deckSpot(name, berth?) → {x, z, a} (ferry-local spots in the world)
//   setBridge(k 0 up … 1 down), setWeight(k 0 down … 1 up), setCatch(free), setCable(state 'taut'|'gone'), setRopes(on),
//   setBoard('closed'|'open'|'tea'), setMoor(berth|null), place(x, z, rot), setTelegraph(k), shellFade(k), ringBell(which)
//   inHut(x, z)
import * as THREE from 'three';
import { Kit, MAT, rbox, cyl, plane, canvasTex, lathe, torus } from './props.js';
import { roomOcc } from './roomocc.js';
import { touch } from './story/reach.js';

const Y0 = 6.0;
export const LF = {
  hut: { x0: -47.6, x1: -44.6, z0: 6.9, z1: 11.4, h: 2.9, t: 0.2 },
  door: { x: -45.8, hw: 0.55, h: 2.1 },
  wheel: { x: -47.3, y: 1.12, z: 7.75, r: 0.34 },
  part: { z: 9.0, t: 0.3 },
  port: { x: -45.5, hw: 0.42, y0: 0.85, y1: 1.75 },   // (the ball, 0.14 m round, needs the room: a throw leaves the hand ~1.45 m up)
  weight: { w: 0.9, h: 0.95, d: 0.26, z: 8.7, down: 0.82, up: 1.85 },
  drum: { x0: -46.95, x1: -45.68, z: 9.85, y: 0.78, r: 0.42 },
  trip: { x: -45.5, y: 1.3, z: 10.75, r: 0.32 },
  bridge: { x: -55.6, z: 2.15, w: 1.4, L: 2.45 },
  post: { x: -56.65, z: 1.9, h: 3.3 },
  cordW: { x: -56.4, z: 1.72 },
  board: { x: -52.6, z: -1.72 },
  stage: { x: -20.4, z0: 27.6, z1: 31.55, hw: 1.0 },
  cordM: { x: -21.1, z: 27.95 },
  berth: { west: { x: -57.6, z: 6.0, rot: 0 }, mill: { x: -22.4, z: 33.0, rot: 0 } },
  deckTop: Y0 + 0.21,
};
// the ferry's foredeck spots (ferry-local: +x the bow, +z starboard; a: the way one faces in the ferry's frame)
export const DECK = {
  tel: { x: 1.25, z: 1.0 },              // the telegraph's handle
  hero: { x: 2.05, z: -0.25, a: Math.PI / 2 },
  captain: { x: 1.2, z: -0.95, a: Math.PI / 2 },
  oshra: { x: 2.55, z: 0.95, a: -Math.PI / 2 + 0.6 },
  crate: { x: 3.15, z: 1.0 },
  wick: { x: 3.55, z: -0.35, a: Math.PI / 2 },
  board: { x: 2.0, z: -1.45, a: 0 },     // where one steps aboard (the bridge or the stage's end)
  step: { x: 2.6, z: -1.0 },             // (a way-point for those stepping aboard at Mill Lane, clear of the hero's spot)
};
// the ways between the berths (Zeelich-local): out from the berth sideways, round the south-west cliffs, in sideways
const WAY = [[-57.6, 10.5], [-61, 17], [-56, 27], [-45, 34.5], [-33, 38.5], [-22.4, 38.5]];

// a route: the berth's sidle out (heading held), the open water (heading along the way), the sidle in. The heading is
// smoothed along the way so she pivots on her pods instead of snapping; exact at both berths.
export function makeRoute(from, to) {
  const A = LF.berth[from], B = LF.berth[to];
  const mid = from === 'west' ? WAY : [...WAY].reverse();
  const pts = [[A.x, A.z], ...mid, [B.x, B.z]];
  const STEP = 0.2, S = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / STEP));
    const fixed = i === 0 || i === pts.length - 2;
    const hd = Math.atan2(-(bz - az), bx - ax);
    for (let k = 0; k < n; k++) S.push({ x: ax + (bx - ax) * (k / n), z: az + (bz - az) * (k / n), h: fixed ? (i === 0 ? A.rot : B.rot) : hd });
  }
  S.push({ x: B.x, z: B.z, h: B.rot });
  // unwrap, then smooth with a window that shrinks to nothing at the berths
  for (let i = 1; i < S.length; i++) { let d = S[i].h - S[i - 1].h; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; S[i].h = S[i - 1].h + d; }
  let L = 0; S[0].s = 0;
  for (let i = 1; i < S.length; i++) { L += Math.hypot(S[i].x - S[i - 1].x, S[i].z - S[i - 1].z); S[i].s = L; }
  const W = 4.0, sm = S.map((p) => {
    const w = Math.min(W, p.s, L - p.s);
    let a = 0, n = 0;
    for (const q of S) if (Math.abs(q.s - p.s) <= w) { a += q.h; n++; }
    return n ? a / n : p.h;
  });
  S.forEach((p, i) => { p.h = sm[i]; });
  const at = (s) => {
    s = Math.max(0, Math.min(L, s));
    let lo = 0, hi = S.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m].s <= s) lo = m; else hi = m; }
    const a = S[lo], b = S[hi], k = b.s > a.s ? (s - a.s) / (b.s - a.s) : 0;
    return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, rot: a.h + (b.h - a.h) * k };
  };
  return { L, at, from, to };
}
// the voyage's speed: up to speed in ACC s, down again in the last ACC s, a steady pace between (total T s)
export function voyage(L, T, t, ACC = 4) {
  const v = L / (T - ACC);
  if (t <= 0) return 0;
  if (t >= T) return L;
  if (t < ACC) return 0.5 * (v / ACC) * t * t;
  if (t > T - ACC) return L - 0.5 * (v / ACC) * (T - t) * (T - t);
  return 0.5 * v * ACC + v * (t - ACC);
}

// the boards' faces
function boardTex(lines, { bg = '#2f5a6a', ink = '#f2e6c8', strip = null, chalk = [] } = {}) {
  return canvasTex(512, 320, (x, W, H) => {
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#c8a040'; x.lineWidth = 12; x.strokeRect(6, 6, W - 12, H - 12);
    x.fillStyle = ink; x.textAlign = 'center';
    lines.forEach(([s, size, y]) => { x.font = `bold ${size}px sans-serif`; x.fillText(s, W / 2, y); });
    if (strip) { x.save(); x.translate(W / 2, 168); x.rotate(-0.09); x.fillStyle = '#e8dcc0'; x.fillRect(-230, -30, 460, 60); x.fillStyle = '#a8302a'; x.font = 'bold 40px sans-serif'; x.fillText(strip, 0, 14); x.restore(); }
    x.fillStyle = '#f4f4ee'; x.font = 'bold 30px "Comic Sans MS", cursive, sans-serif';
    chalk.forEach(([s, y]) => x.fillText(s, W / 2, y));
  });
}

export function buildSkyFerry(game, Z) {
  if (Z.skyferry) return Z.skyferry;
  const P = game.physics, O = Z.group.position, OX = O.x, OZ = O.z;
  const W = (x, z) => ({ x: OX + x, z: OZ + z });
  const root = new THREE.Group(); root.name = 'skyferry'; Z.group.add(root);
  const col = (c) => P.add({ ...c, x: OX + c.x, z: OZ + c.z });
  const stat = new Kit(root);
  const H = LF.hut, D = LF.door;
  const wood = MAT.wood('dark'), pale = MAT.planks('honey'), brass = MAT.brass(), iron = MAT.iron();
  const teal = MAT.paint('#2f7a84', 0.55), red = MAT.paint('#b0402a', 0.6);
  const rope = MAT.flat('#c8a878', 0.9);

  // ---------------------------------------------------------------- the winch house (its shell fades while he is in it)
  const shellG = new THREE.Group(); root.add(shellG);
  const shell = new Kit(shellG); shell.recolor = false;
  const wallM = MAT.plaster('#e2d6cc').clone(), trimM = MAT.paint('#3a7a8a', 0.55).clone(), roofM = MAT.plates('#7a8a92', 1).clone();
  const shellMats = [wallM, trimM, roofM];
  const cx = (H.x0 + H.x1) / 2, cz = (H.z0 + H.z1) / 2, w = H.x1 - H.x0, d = H.z1 - H.z0, t = H.t;
  const wall = (x, z, ww, dd, y0 = 0, hh = H.h) => {
    shell.add(rbox(ww, hh, dd, 0.03), wallM, x, Y0 + y0 + hh / 2, z);
    col({ type: 'box', x, z, hw: ww / 2, hd: dd / 2, rot: 0, top: Y0 + y0 + hh, bottom: Y0 + y0 - 0.05, camSkip: true });
  };
  wall(H.x0 + t / 2, cz, t, d);                        // west
  wall(H.x1 - t / 2, cz, t, d);                        // east
  wall(cx, H.z1 - t / 2, w - 2 * t, t);                // back (south)
  const dl = D.x - D.hw, dr = D.x + D.hw;
  wall((H.x0 + dl) / 2, H.z0 + t / 2, dl - H.x0, t);   // north, west of the door
  wall((dr + H.x1) / 2, H.z0 + t / 2, H.x1 - dr, t);   // north, east of the door
  shell.add(rbox(dr - dl + 0.02, H.h - D.h, t, 0.03), wallM, D.x, Y0 + D.h + (H.h - D.h) / 2, H.z0 + t / 2);   // (the lintel)
  shell.add(rbox(w + 0.36, 0.14, d + 0.36, 0.04), roofM, cx, Y0 + H.h + 0.07, cz);
  for (const [x, z, ww, dd] of [[cx, H.z0 - 0.01, w + 0.04, 0.05], [cx, H.z1 + 0.01, w + 0.04, 0.05]]) shell.add(rbox(ww, 0.16, dd, 0.02), trimM, x, Y0 + H.h - 0.12, z);
  for (const s of [-1, 1]) shell.add(rbox(0.1, D.h + 0.08, 0.26, 0.02), trimM, D.x + s * (D.hw + 0.03), Y0 + D.h / 2, H.z0 + t / 2);
  shell.add(rbox(dr - dl + 0.26, 0.12, 0.26, 0.02), trimM, D.x, Y0 + D.h + 0.06, H.z0 + t / 2);
  shell.flush();
  // the camera: as any house from outside; inside, it keeps its arm and the shell fades (story/ferry.js shellFade)
  roomOcc(Z, P.terrain).add({ kind: 'box', x: OX + cx, z: OZ + cz, hw: w / 2, hd: d / 2, y0: Y0 - 0.1, y1: Y0 + H.h + 0.2, walkUnder: { x0: OX + H.x0, x1: OX + H.x1, z0: OZ + H.z0 - 0.2, z1: OZ + H.z1 }, name: 'winch house' });

  // the brass plate by the door, inside (the procedure)
  const PL = { x: H.x1 - t - 0.01, y: Y0 + 1.45, z: H.z0 + t + 0.55 };
  { const tx = canvasTex(256, 160, (x, Wd, Hh) => { x.fillStyle = '#d8b060'; x.fillRect(0, 0, Wd, Hh); x.strokeStyle = '#6a4a1a'; x.lineWidth = 8; x.strokeRect(4, 4, Wd - 8, Hh - 8); x.fillStyle = '#3a2a10'; x.textAlign = 'left'; x.font = 'bold 26px serif'; ['1. BRIDGE DOWN', '2. TRIP THE CATCH', '3. RING OFF'].forEach((s, i) => x.fillText(s, 22, 48 + i * 40)); });
    const m = new THREE.Mesh(plane(0.42, 0.26), MAT.map(tx, 0.4, { metalness: 0.5 })); m.position.set(PL.x, PL.y, PL.z); m.rotation.y = -Math.PI / 2; root.add(m); }

  // the bridge's hand wheel on the west wall (it turns; its shaft goes out through the wall)
  const WH = LF.wheel;
  const wheel = new THREE.Group(); wheel.position.set(WH.x, Y0 + WH.y, WH.z); root.add(wheel);
  { const k = new Kit(wheel); k.add(torus(WH.r, 0.035, 8, 24), iron, 0, 0, 0, Math.PI / 2);
    for (let i = 0; i < 4; i++) k.add(rbox(0.04, WH.r * 2, 0.04, 0.01), iron, 0, 0, 0, 0, { rx: i * Math.PI / 4 });
    k.add(cyl(0.07, 0.07, 0.12, 10), brass, -0.02, 0, 0, 0, { rz: Math.PI / 2 }); k.flush(); }
  stat.add(cyl(0.04, 0.04, 0.32, 8), iron, H.x0 + 0.1, Y0 + WH.y, WH.z, 0, { rz: Math.PI / 2 });

  // the partition across the house, with its one hole (the port)
  const PT = LF.part, PO = LF.port, iw0 = H.x0 + t, iw1 = H.x1 - t;
  const part = (x0, x1, y0, y1) => {
    stat.add(rbox(x1 - x0, y1 - y0, 0.08, 0.01), wood, (x0 + x1) / 2, Y0 + (y0 + y1) / 2, PT.z);
    col({ type: 'box', x: (x0 + x1) / 2, z: PT.z, hw: (x1 - x0) / 2, hd: PT.t / 2, rot: 0, top: Y0 + y1, bottom: Y0 + y0, camSkip: true });
  };
  part(iw0, PO.x - PO.hw, 0, H.h); part(PO.x + PO.hw, iw1, 0, H.h);
  part(PO.x - PO.hw, PO.x + PO.hw, 0, PO.y0); part(PO.x - PO.hw, PO.x + PO.hw, PO.y1, H.h);
  // the port's brass rim
  for (const [x, y, ww, hh] of [[PO.x, PO.y0, PO.hw * 2 + 0.08, 0.04], [PO.x, PO.y1, PO.hw * 2 + 0.08, 0.04], [PO.x - PO.hw, (PO.y0 + PO.y1) / 2, 0.04, PO.y1 - PO.y0], [PO.x + PO.hw, (PO.y0 + PO.y1) / 2, 0.04, PO.y1 - PO.y0]])
    stat.add(rbox(ww, hh, 0.1, 0.01), brass, x, Y0 + y, PT.z - 0.01);

  // the counterweight in its frame, in front of the port: down (covering it) while the bridge is up
  const WG = LF.weight;
  for (const s of [-1, 1]) stat.add(rbox(0.05, H.h - 0.05, 0.05, 0.01), iron, PO.x + s * (WG.w / 2 + 0.05), Y0 + (H.h - 0.05) / 2, WG.z);
  const weight = new THREE.Mesh(rbox(WG.w, WG.h, WG.d, 0.03), MAT.iron()); weight.castShadow = true; root.add(weight);
  const chain = new THREE.Mesh(cyl(0.015, 0.015, 1, 5), iron); root.add(chain);
  const wcol = col({ type: 'box', x: PO.x, z: WG.z, hw: WG.w / 2, hd: WG.d / 2 + 0.06, rot: 0, top: Y0 + WG.down + WG.h, bottom: Y0 + WG.down, camSkip: true });

  // the drum, the cable on it, and the catch at its east end; the trip paddle faces the back wall
  const DR = LF.drum;
  const drum = new THREE.Group(); drum.position.set((DR.x0 + DR.x1) / 2, Y0 + DR.y, DR.z); root.add(drum);
  { const k = new Kit(drum), L = DR.x1 - DR.x0;
    k.add(cyl(DR.r * 0.82, DR.r * 0.82, L - 0.1, 16), MAT.flat('#7a6a50', 0.95), 0, 0, 0, 0, { rz: Math.PI / 2 });   // (the cable, wound)
    for (const s of [-1, 1]) k.add(cyl(DR.r, DR.r, 0.05, 18), iron, s * (L / 2 - 0.03), 0, 0, 0, { rz: Math.PI / 2 });
    for (let i = 0; i < 6; i++) k.add(rbox(0.08, 0.06, 0.06, 0.01), iron, L / 2 + 0.04, Math.cos(i * 1.047) * (DR.r + 0.05), Math.sin(i * 1.047) * (DR.r + 0.05));   // (the ratchet's teeth)
    k.flush(); }
  for (const x of [DR.x0 - 0.05, DR.x1 + 0.12]) stat.add(rbox(0.1, DR.y + 0.1, 0.18, 0.02), iron, x, Y0 + (DR.y + 0.1) / 2, DR.z);
  col({ type: 'box', x: (DR.x0 + DR.x1) / 2, z: DR.z, hw: (DR.x1 - DR.x0) / 2 + 0.1, hd: DR.r, rot: 0, top: Y0 + DR.y + DR.r, bottom: Y0, camSkip: true });
  // the pawl: an iron dog on a pivot block bracketed from the back wall, its red trip paddle toward the wall
  const TR = LF.trip;
  stat.add(rbox(0.12, 0.5, 0.42, 0.02), iron, TR.x, Y0 + 1.42, H.z1 - t - 0.21);
  const pawl = new THREE.Group(); pawl.position.set(TR.x, Y0 + 1.42, DR.z + 0.62); root.add(pawl);
  { const k = new Kit(pawl);
    k.add(rbox(0.07, 0.07, 0.62, 0.01), iron, 0, -0.18, -0.24, 0, { rx: -0.55 });   // (the dog, down onto the teeth)
    k.add(rbox(0.26, 0.2, 0.04, 0.01), red, 0, -0.12, 0.08);                         // (the trip paddle, facing the wall)
    k.add(cyl(0.05, 0.05, 0.14, 10), brass, 0, 0, 0, 0, { rz: Math.PI / 2 }); k.flush(); }

  // the drum's cable out through the west wall to the ferry's bow (taut while the catch holds)
  const cable = new THREE.Mesh(cyl(0.03, 0.03, 1, 6), MAT.flat('#5a5048', 0.9)); cable.castShadow = true; root.add(cable);

  // ---------------------------------------------------------------- the loading bridge, its derrick post and the bell
  const BR = LF.bridge, PS = LF.post;
  const ramp = new THREE.Group(); ramp.position.set(BR.x, Y0 + 0.02, BR.z); root.add(ramp);
  { const k = new Kit(ramp);
    k.add(rbox(BR.w, 0.08, BR.L, 0.02), pale, 0, 0.0, BR.L / 2);
    for (const s of [-1, 1]) k.add(rbox(0.08, 0.14, BR.L, 0.02), teal, s * (BR.w / 2 - 0.04), 0.07, BR.L / 2);
    for (let i = 1; i < 6; i++) k.add(rbox(BR.w - 0.1, 0.03, 0.05, 0.01), wood, 0, 0.055, i * BR.L / 6);
    k.add(cyl(0.05, 0.05, BR.w + 0.1, 8), brass, 0, 0, 0, 0, { rz: Math.PI / 2 }); k.flush(); }
  const rampCol = col({ type: 'box', x: BR.x, z: BR.z + BR.L / 2 - 0.05, hw: BR.w / 2, hd: BR.L / 2, rot: 0, top: Y0 + 0.11, enabled: false, seeThrough: true });
  // the post (with its jib over the ramp), the bell under the jib, the cord down to the hand
  stat.add(rbox(0.16, PS.h, 0.16, 0.02), wood, PS.x, Y0 + PS.h / 2, PS.z);
  stat.add(rbox(0.12, 0.12, 1.5, 0.02), wood, PS.x, Y0 + PS.h - 0.1, PS.z + 0.65);
  stat.add(rbox(0.12, 0.6, 0.12, 0.02), wood, PS.x, Y0 + PS.h - 0.45, PS.z + 0.3, 0, { rx: 0.75 });
  col({ type: 'cyl', x: PS.x, z: PS.z, r: 0.14, top: Y0 + PS.h, noStand: true });
  const bells = {};
  const bellAt = (name, x, y, z, cord) => {
    const b = new THREE.Group(); b.position.set(x, y, z); root.add(b);
    const k = new Kit(b); k.add(lathe([[0, -0.2], [0.13, -0.2], [0.11, -0.12], [0.07, 0.02], [0.03, 0.06], [0, 0.07]], 12), brass); k.add(cyl(0.012, 0.012, 0.12, 5), iron, 0, 0.12, 0); k.flush();
    const c = new THREE.Mesh(cyl(0.012, 0.012, y - 0.2 - (Y0 + 1.42), 5), rope); c.position.set(cord.x, (y - 0.2 + Y0 + 1.42) / 2, cord.z); root.add(c);
    stat.add(cyl(0.03, 0.025, 0.1, 6), wood, cord.x, Y0 + 1.42, cord.z);   // (the cord's grip)
    bells[name] = { grp: b, t: 0 };
  };
  bellAt('west', LF.cordW.x, Y0 + 2.75, LF.cordW.z, LF.cordW);
  // the bridge's lifting cable (the jib's tip to the ramp's end) and the long cable from the winch house to the post's top
  const lift = new THREE.Mesh(cyl(0.018, 0.018, 1, 5), MAT.flat('#5a5048', 0.9)); root.add(lift);
  const span = (m, a, b) => { const v = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), L = v.length(); m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.normalize()); };
  { const m = new THREE.Mesh(cyl(0.018, 0.018, 1, 5), MAT.flat('#5a5048', 0.9)); root.add(m); span(m, [H.x0 - 0.02, Y0 + 2.2, WH.z], [PS.x, Y0 + PS.h - 0.15, PS.z]); }

  // ---------------------------------------------------------------- the sailings board (in place of the pier's single crate)
  const BD = LF.board;
  for (const s of [-1, 1]) stat.add(rbox(0.1, 2.05, 0.1, 0.02), wood, BD.x + s * 0.68, Y0 + 1.02, BD.z);
  const boardFace = new THREE.Mesh(plane(1.3, 0.82), MAT.flat('#ffffff', 0.85)); boardFace.position.set(BD.x, Y0 + 1.55, BD.z + 0.06); root.add(boardFace);
  stat.add(rbox(1.42, 0.92, 0.08, 0.02), wood, BD.x, Y0 + 1.55, BD.z);
  col({ type: 'box', x: BD.x, z: BD.z, hw: 0.74, hd: 0.08, rot: 0, top: Y0 + 2.05, block: true });
  const TEX = {
    closed: boardTex([['SKY-FERRY "PATIENCE"', 40, 64], ['WEST PIER - MILL LANE', 34, 112], ['SAILINGS ON THE BELL', 30, 236]], { strip: 'LINE CLOSED', chalk: [['NEXT SAILING ON TIME', 284]] }),
    open: boardTex([['SKY-FERRY "PATIENCE"', 40, 64], ['WEST PIER - MILL LANE', 34, 112], ['SAILINGS ON THE BELL', 30, 236]], { chalk: [['RUNNING', 172], ['NEXT SAILING ON TIME', 284]] }),
    tea: boardTex([['SKY-FERRY "PATIENCE"', 40, 64], ['WEST PIER - MILL LANE', 34, 112], ['SAILINGS ON THE BELL', 30, 236]], { chalk: [['RUNNING  -  TEA ON DECK', 172], ['NEXT SAILING ON TIME', 284]] }),
  };
  const boardMats = Object.fromEntries(Object.entries(TEX).map(([k, tx]) => [k, MAT.map(tx, 0.8)]));

  // ---------------------------------------------------------------- Mill Lane Steps: the stage, its post, sign and bell
  const ST = LF.stage, sL = ST.z1 - ST.z0;
  stat.add(rbox(ST.hw * 2, 0.16, sL, 0.02), pale, ST.x, Y0 - 0.08, (ST.z0 + ST.z1) / 2);
  for (const s of [-1, 1]) {
    stat.add(rbox(0.14, 0.24, sL, 0.02), teal, ST.x + s * (ST.hw - 0.07), Y0 - 0.26, (ST.z0 + ST.z1) / 2);
    for (const z of [ST.z0 + 1.0, ST.z1 - 0.2]) { stat.add(rbox(0.07, 1.0, 0.07, 0.01), teal, ST.x + s * (ST.hw - 0.05), Y0 + 0.5, z); stat.add(rbox(0.12, 2.6, 0.12, 0.02), wood, ST.x + s * (ST.hw - 0.12), Y0 - 1.5, z); }
    stat.add(cyl(0.035, 0.035, sL - 1.2, 6), brass, ST.x + s * (ST.hw - 0.05), Y0 + 1.0, (ST.z0 + 1.0 + ST.z1 - 0.2) / 2, 0, { rx: Math.PI / 2 });
    col({ type: 'box', x: ST.x + s * (ST.hw - 0.05), z: (ST.z0 + 1.0 + ST.z1 - 0.2) / 2, hw: 0.06, hd: (sL - 1.2) / 2, rot: 0, top: Y0 + 1.05, noStand: true, seeThrough: true });
  }
  col({ type: 'box', x: ST.x, z: (ST.z0 + ST.z1) / 2, hw: ST.hw, hd: sL / 2, rot: 0, top: Y0, seeThrough: true });
  // the stage's post on the shore: its sign (facing the lane) and its bell
  const MP = { x: ST.x - ST.hw - 0.2, z: ST.z0 + 0.35 };
  stat.add(rbox(0.14, 3.0, 0.14, 0.02), wood, MP.x, Y0 + 1.5, MP.z);
  stat.add(rbox(0.7, 0.12, 0.12, 0.02), wood, MP.x + 0.3, Y0 + 2.85, MP.z);
  col({ type: 'cyl', x: MP.x, z: MP.z, r: 0.12, top: Y0 + 3.0, noStand: true });
  { const tx = boardTex([['MILL LANE STEPS', 44, 96], ['SKY-FERRY TO WEST PIER', 32, 170]], { chalk: [['RING FOR THE FERRY', 256]] });
    const m = new THREE.Mesh(plane(0.9, 0.56), MAT.map(tx, 0.8)); m.position.set(MP.x, Y0 + 1.9, MP.z - 0.09); m.rotation.y = Math.PI; root.add(m);
    stat.add(rbox(0.98, 0.64, 0.05, 0.02), wood, MP.x, Y0 + 1.9, MP.z - 0.05); }
  bellAt('mill', LF.cordM.x, Y0 + 2.7, LF.cordM.z, LF.cordM);

  // ---------------------------------------------------------------- the ferry's deck: telegraph, tea crate, mooring
  const F = Z.ferry, fgrp = F.group, bob = F.bob || fgrp;
  const deckY = LF.deckTop - (fgrp.position.y);   // (the deck's top in the ferry group's frame)
  const tel = new THREE.Group(); tel.position.set(DECK.tel.x, deckY, DECK.tel.z); bob.add(tel);
  const handle = new THREE.Group(); handle.position.set(0, 1.0, 0); tel.add(handle);
  { const k = new Kit(tel); k.add(lathe([[0.14, 0], [0.1, 0.06], [0.06, 0.12], [0.06, 0.8], [0.12, 0.86], [0.16, 0.95], [0, 0.97]], 14), brass);
    const dial = canvasTex(128, 128, (x, Wd, Hh) => { x.fillStyle = '#f2ecdc'; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill(); x.fillStyle = '#2a2a2a'; x.textAlign = 'center'; x.font = 'bold 18px sans-serif'; x.fillText('STOP', 64, 30); x.fillText('SLOW', 30, 70); x.fillText('AHEAD', 64, 112); });
    k.add(cyl(0.13, 0.13, 0.02, 18), MAT.map(dial, 0.5), 0, 0.93, 0, 0, { rx: 0 }); k.flush();
    const hk = new Kit(handle); hk.add(rbox(0.04, 0.32, 0.04, 0.01), brass, 0, 0.12, 0); hk.add(cyl(0.035, 0.035, 0.1, 8), MAT.paint('#2a2a2a', 0.5), 0, 0.3, 0, 0, { rz: Math.PI / 2 }); hk.flush(); }
  const crate = new THREE.Group(); crate.position.set(DECK.crate.x, deckY, DECK.crate.z); bob.add(crate);
  { const k = new Kit(crate); k.add(rbox(0.5, 0.55, 0.4, 0.03), wood, 0, 0.275, 0);
    k.add(lathe([[0, 0], [0.11, 0.01], [0.13, 0.08], [0.1, 0.17], [0.05, 0.2], [0.03, 0.24], [0, 0.25]], 12), MAT.paint('#3a8a9a', 0.35), -0.08, 0.55, 0);   // (the glazed teapot)
    for (const [x, z] of [[0.13, 0.08], [0.13, -0.1]]) k.add(cyl(0.04, 0.03, 0.07, 10), MAT.paint('#e0a8c8', 0.35), x, 0.585, z);
    k.flush(); }
  crate.visible = false;
  // her mooring ropes to the pier's bollards, at the west berth only (the model's own ropes were made for an old spot)
  for (const m of F.ropes || []) m.visible = false;
  const moorRopes = [];
  for (const [bx, fx] of [[-61.2, -4.5], [-54.0, 3.2]]) {
    const m = new THREE.Mesh(cyl(0.035, 0.035, 1, 5), rope); root.add(m); moorRopes.push(m);
    const B = LF.berth.west; span(m, [bx, Y0 + 0.5, 1.9 + 0.3], [B.x + fx, Y0 + 0.4, B.z - 1.75]);   // (from the bollard's rim, not through its head)
  }
  // the deck where one may walk, per berth: the foredeck (two boxes, the bow narrower), the cabin blocking
  const decks = {};
  for (const [name, B] of Object.entries(LF.berth)) decks[name] = [
    col({ type: 'box', x: B.x + 1.85, z: B.z, hw: 0.9, hd: 1.5, rot: 0, top: LF.deckTop, enabled: false, seeThrough: true }),
    col({ type: 'box', x: B.x + 3.375, z: B.z, hw: 0.625, hd: 0.95, rot: 0, top: LF.deckTop, enabled: false, seeThrough: true }),
    col({ type: 'box', x: B.x - 1.4, z: B.z, hw: 2.35, hd: 1.45, rot: 0, top: LF.deckTop + 2.3, bottom: LF.deckTop - 0.3, enabled: false, noStand: true }),
    col({ type: 'cyl', x: B.x + DECK.tel.x, z: B.z + DECK.tel.z, r: 0.16, top: LF.deckTop + 1.0, enabled: false, noStand: true }),
    col({ type: 'box', x: B.x + DECK.crate.x, z: B.z + DECK.crate.z, hw: 0.27, hd: 0.22, rot: 0, top: LF.deckTop + 0.55, enabled: false, block: true }),
  ];
  // the envelope fades while he stands on her deck (its own material: the batch shares Zeelich's)
  const envMeshes = F.upper || [];
  stat.flush();

  // ---------------------------------------------------------------- the API
  const api = {
    root, berth: LF.berth,
    hut: { ...W(H.x0, H.z0), x0: OX + H.x0, x1: OX + H.x1, z0: OZ + H.z0, z1: OZ + H.z1, door: W(D.x, H.z0 - 0.6) },
    wheel: { ...W(WH.x, WH.z), y: Y0 + WH.y, a: -Math.PI / 2, stand: W(WH.x + 0.48, WH.z) },
    port: { ...W(PO.x, PT.z), y: Y0 + (PO.y0 + PO.y1) / 2 },
    trip: { ...W(TR.x, TR.z), y: Y0 + TR.y, r: TR.r },
    weight: { ...W(PO.x, WG.z - WG.d / 2 - 0.06), y: Y0 + WG.down + WG.h / 2 },   // (its face toward the door: the ball's mark is in front of its collider)
    plate: W(PL.x - 0.05, PL.z),
    drum: W((DR.x0 + DR.x1) / 2, DR.z),
    throwSpot: { ...W(PO.x, H.z0 + 0.8), a: 0 },
    cord: { west: touch(OX + LF.cordW.x, OZ + LF.cordW.z, 0, 'reach'), mill: touch(OX + LF.cordM.x, OZ + LF.cordM.z, -Math.PI / 2, 'reach') },
    board: { ...W(BD.x, BD.z + 0.9), read: W(BD.x, BD.z) },
    millBoard: W(MP.x, MP.z - 0.8),
    landing: { west: { ...W(BR.x + 0.4, 0.6), a: Math.PI }, mill: { ...W(ST.x, ST.z0 + 0.2), a: Math.PI } },
    bridgeTop: W(BR.x, BR.z + 0.5),
    inHut(x, z) { return x > OX + H.x0 && x < OX + H.x1 && z > OZ + H.z0 - 0.1 && z < OZ + H.z1; },
    // ferry-local spot → world (the ferry where it is now, or at a berth)
    deckSpot(name, at = null) {
      const s = DECK[name], p = at ? { x: OX + LF.berth[at].x, z: OZ + LF.berth[at].z, rot: LF.berth[at].rot } : { x: OX + fgrp.position.x, z: OZ + fgrp.position.z, rot: fgrp.rotation.y };
      const c = Math.cos(p.rot), sn = Math.sin(p.rot);
      // (rotation.y = rot: local +x → (cos, −sin), local +z → (sin, cos))
      const x = p.x + s.x * c + s.z * sn, z = p.z - s.x * sn + s.z * c;
      // (an actor's angle a faces (sin a, cos a); a ferry-local facing turns with her)
      return { x, z, a: (s.a ?? 0) + p.rot };
    },
    telegraph(at) { const s = api.deckSpot('tel', at); return touch(s.x, s.z, (at ? LF.berth[at].rot : fgrp.rotation.y), 'setDown'); },
    place(x, z, rot) { fgrp.position.x = x; fgrp.position.z = z; fgrp.rotation.y = rot; },   // (Zeelich-local)
    setMoor(at) { for (const [name, list] of Object.entries(decks)) for (const c of list) c.enabled = name === at; F.bobK = at ? 0.15 : 1; },
    setRopes(on) { for (const m of moorRopes) m.visible = on; },
    setBridge(k) {
      const a = -1.25 + (1.25 - 0.078) * k; ramp.rotation.x = a;
      rampCol.enabled = k >= 0.999;
      const end = [BR.x, Y0 + 0.02 - Math.sin(a) * BR.L, BR.z + Math.cos(a) * BR.L];
      span(lift, [BR.x, Y0 + PS.h - 0.15, PS.z + 1.35], end);
      api.bridgeK = k;
    },
    setWeight(k) {
      const y = WG.down + (WG.up - WG.down) * k;
      weight.position.set(PO.x, Y0 + y + WG.h / 2, WG.z);
      span(chain, [PO.x, Y0 + y + WG.h, WG.z], [PO.x, Y0 + H.h - 0.05, WG.z]);
      wcol.enabled = k < 0.5;
      api.weightK = k;
    },
    setCatch(free) { pawl.rotation.x = free ? -0.7 : 0; api.free = free; },
    spinDrum(dt) { drum.rotation.x += dt * 9; },
    setCable(state) {
      cable.visible = state === 'taut';
      if (cable.visible) { const B = LF.berth.west; span(cable, [H.x0 - 0.02, Y0 + 0.85, DR.z], [B.x + 5.7, Y0 + 0.45, B.z - 0.1]); }
    },
    setBoard(k) { const m = boardMats[k] || boardMats.closed; if (boardFace.material !== m) boardFace.material = m; api.boardState = k; },
    setTelegraph(k) { handle.rotation.z = -0.9 * k; },
    setCrate(on) { crate.visible = on; },
    shellFade(k) {
      for (const m of shellMats) { const see = k < 0.99; if (m.transparent !== see) { m.transparent = see; m.depthWrite = !see; m.needsUpdate = true; } m.opacity = k; }
    },
    envFade(k) {
      for (const e of envMeshes) { const m = e.material, see = k < 0.99; if (m.transparent !== see) { m.transparent = see; m.depthWrite = !see; m.needsUpdate = true; } m.opacity = k; }
    },
    ringBell(which) { const b = bells[which]; if (b) b.t = 1.2; },
    // per frame: the bells swing out their ring
    update(dt) { for (const b of Object.values(bells)) { if (b.t > 0) { b.t = Math.max(0, b.t - dt); b.grp.rotation.x = Math.sin(b.t * 18) * 0.35 * b.t; } } },
  };
  api.setBridge(0); api.setWeight(0); api.setCatch(false); api.setCable('taut'); api.setBoard('closed'); api.setTelegraph(0);
  Z.skyferry = api;
  return api;
}
