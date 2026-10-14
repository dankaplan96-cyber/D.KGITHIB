// Citadel twelve years on, outdoors (the places; src/game/story/life.js gives them their people and stories).
//
//   - The lane north of Twinsen's house (Bug Street's south end): the neighbourhood's old hand pump on its stone
//     plinth with a trough, and right past it the project's new copper heat pipe on low stands. Bram keeps the
//     pump; it is seized since the pipe went in (The Old Pump). The pipe dives under the ground where the pump's
//     own footpath crosses it (fresh earth there: that is where they dug).
//   - Twinsen and Zoé's garden, west of the house: Zoé's raised beds, a small pond where Arthur tries his boats, and
//     his boat box (Twinsen's pliers are in it: Arthur borrowed them).
//   - The harbour quay: a customs booth (Officer Odile) with a barrier, the held Esmer crate roped off beside it,
//     cargo from both worlds (Esmer crates, Mosquibee honey jars, Twinsun barrels), and Nell's repair shop for
//     imported machines (a lean-to on the grass where the harbour path reaches the quay, open toward the path: a
//     bench, an Esmer engine on a stand and a water barrel) — The Mislabelled Shipment.
//
// CONTRACT (world coordinates): buildTownLife(root, physics, W) → W.life = {
//   pump {x, z, use {x,z,a}, pipe {x,z0,z1,gap}, sign, valve, setRunning(b), setFree(b), running,
//         stroke(handsAt?, dur), grip(), handleAngle(), route(hx, hz) → waypoints to the grip},
//   trough {x,z}, pond {x,z}, beds [{x,z}], boatBox {x,z},
//   customs {x, z, barrier}, crate {x, z, setState('held'|'open'|'cleared')},
//   shop {bench {x,z}, work {x,z,a}, route(hx, hz), engine {x,z, setRunning(b)}, barrel {x,z, wx,wz},
//         coupler {x,z,y, setHeat(u, stage 0..3 | 'settled'), stage, setVisible(b)}},
//   spots {bram, odile, nell} {x,z,a} }
// lifeClear(x, z): inside one of these places (the island's scattered bushes, tulip beds and grass keep out).
import * as THREE from 'three';
import { MAT, rbox, plane, cyl, sphere, lathe, torus, canvasTex, Kit } from './props.js';
import * as P from './props.js';

const PUMP = { x: -42.0, z: 65.0 };
const GARDEN = { x: -60.0, z: 83.5 };   // (west of the house, where the ground is flat)
const BEDS = [[1.6, -4.2], [2.4, -2.2]];   // Zoé's raised beds (from the pond; off the lane to the lighthouse)
const BOOTH = { x: -110.5, z: 35.0 };
const CRATE = { x: -108.2, z: 33.9 };
const SHOP = { x: -102.8, z: 33.9 };    // (north of the harbour path, between the quay and the house beside it)
// the pump's handle: a lever from the top of the column toward the lane (west), with a crossbar grip for both
// hands; Twinsen works it standing USE_D west of the pump, side-on to anyone coming along the lane (his hands meet
// the grip: fitted to the hero's 'pump' pose, src/engine/rig.js)
const HANDLE_Y = 1.1, HANDLE_L = 0.8, USE_D = 1.4;

// places the island's scatter keeps clear of (world rectangles)
const CLEAR = [
  { x0: PUMP.x - 2.1, x1: PUMP.x + 2.0, z0: PUMP.z - 1.6, z1: PUMP.z + 1.9 },            // the pump, the trough, the handle side
  { x0: SHOP.x - 3.4, x1: SHOP.x + 1.8, z0: SHOP.z - 1.6, z1: SHOP.z + 1.7 },            // Nell's shop, engine and barrel
  ...BEDS.map(([bx, bz]) => ({ x0: GARDEN.x + bx - 1.1, x1: GARDEN.x + bx + 1.1, z0: GARDEN.z + bz - 0.65, z1: GARDEN.z + bz + 0.65 })),
];
export const lifeClear = (x, z) => CLEAR.some((r) => x > r.x0 && x < r.x1 && z > r.z0 && z < r.z1);

const signTex = (lines, bg = '#2f4a7a', fg = '#f2e6c8') => canvasTex(256, 96, (x, W, H) => {
  x.fillStyle = bg; x.fillRect(0, 0, W, H); x.strokeStyle = fg; x.lineWidth = 5; x.strokeRect(5, 5, W - 10, H - 10);
  // (the type shrinks to fit a long name: NELL'S REPAIRS)
  const fit = (str, px, bold) => { let s = px; do { x.font = `${bold ? 'bold ' : ''}${s}px sans-serif`; s -= 1; } while (s > 10 && x.measureText(str).width > W - 24); };
  x.fillStyle = fg; x.textAlign = 'center'; fit(lines[0], 34, true); x.fillText(lines[0], W / 2, lines[1] ? 44 : 60);
  if (lines[1]) { fit(lines[1], 20, false); x.fillText(lines[1], W / 2, 76); }
});
// a soft round glow (the coupler's halo, its steam)
let _halo = null;
const haloTex = () => _halo || (_halo = canvasTex(64, 64, (x, W) => { const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, W); }));
const tagTex = (text, bg) => canvasTex(96, 48, (x, W, H) => { x.fillStyle = bg; x.fillRect(0, 0, W, H); x.fillStyle = '#ffffff'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2, H / 2 + 1); });

export function buildTownLife(root, physics, W) {
  const g = new THREE.Group(); g.name = 'townlife'; root.add(g);
  // one merged batch per area (each culls on its own)
  const area = () => { const ag = new THREE.Group(); g.add(ag); return new Kit(ag); };
  const gy = (x, z) => physics.groundAt(x, z);
  const box = (x, z, hw, hd, top, extra = {}) => physics.add({ type: 'box', x, z, hw, hd, top, ...extra });
  const L = (W.life = { spots: {} });

  // ================================================================ the old pump and the new pipe
  {
    const k = area();
    const { x, z } = PUMP, y = gy(x, z);
    k.add(rbox(1.0, 0.35, 1.0, 0.06), MAT.stone('grey', 1), x, y + 0.17, z);                 // plinth
    k.add(cyl(0.11, 0.13, 0.8, 10), MAT.iron(), x, y + 0.35 + 0.4, z);                      // the pump's column
    k.add(cyl(0.16, 0.16, 0.12, 12), MAT.iron(), x, y + 1.17, z);
    k.add(sphere(0.09, 10, 8), MAT.iron(), x, y + 1.29, z);
    k.add(rbox(0.2, 0.16, 0.06, 0.02), MAT.iron(), x - 0.12, y + HANDLE_Y, z);               // the handle's bracket
    k.add(cyl(0.035, 0.04, 0.35, 8), MAT.iron(), x + 0.2, y + 0.85, z, 0, { rz: -1.1 });      // spout, over the trough
    // the handle: a lever toward the lane ending in a wooden crossbar (two hands on it); it pivots at the bracket
    const handle = new THREE.Group(); handle.position.set(x - 0.12, y + HANDLE_Y, z); g.add(handle);
    { const bar = new THREE.Mesh(cyl(0.025, 0.025, HANDLE_L, 6), MAT.iron()); bar.rotation.z = Math.PI / 2; bar.position.x = -HANDLE_L / 2; handle.add(bar); bar.castShadow = true;
      const grip = new THREE.Mesh(cyl(0.035, 0.035, 0.52, 8), MAT.wood('dark')); grip.rotation.x = Math.PI / 2; grip.position.x = -HANDLE_L; handle.add(grip); grip.castShadow = true; }
    const SEIZED = -0.35;   // (seized: the handle stuck up)
    handle.rotation.z = SEIZED;
    // the trough: a stone basin east of the pump, water inside when it runs
    const tx = x + 1.3, tz = z;
    k.add(rbox(1.2, 0.45, 0.6, 0.05), MAT.stone('grey', 1), tx, y + 0.22, tz);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.42), new THREE.MeshStandardMaterial({ color: '#7ab8e0', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 }));
    water.rotation.x = -Math.PI / 2; water.position.set(tx, y + 0.3, tz); g.add(water);
    const stream = new THREE.Mesh(cyl(0.02, 0.025, 0.45, 6, true), new THREE.MeshStandardMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.7, roughness: 0.05 }));
    stream.position.set(x + 0.36, y + 0.55, z); stream.visible = false; g.add(stream);
    box(x, z, 0.5, 0.5, y + 1.7, { noStand: true });
    box(tx, tz, 0.6, 0.3, y + 0.62, { noStand: true });                                        // (a trough is not a step)
    // the project's new heat pipe along the lane, on low stands, with a valve box north of the pump. It goes under
    // the ground for the pump's footpath (an elbow down at each side, fresh earth between: where they dug) and at
    // both ends. Twinsen works the handle standing on that fresh earth.
    const px = x - 1.5, gz0 = z - 1.1, gz1 = z + 1.1;
    const pipeH = (zz) => gy(px, zz) + 0.28;
    for (const [za, zb] of [[z - 7, gz0], [gz1, z + 7]]) {
      const len = zb - za, mid = (za + zb) / 2;
      k.add(cyl(0.11, 0.11, len, 10), MAT.copper(), px, pipeH(mid), mid, 0, { rx: Math.PI / 2 });
      for (const ze of [za, zb]) {   // elbow: a joint and a short drop into the ground, a collar where it goes in
        k.add(sphere(0.115, 10, 8), MAT.copper(), px, pipeH(mid), ze);
        k.add(cyl(0.11, 0.11, 0.42, 10), MAT.copper(), px, gy(px, ze) + 0.07, ze);
        k.add(torus(0.13, 0.03, 6, 14), MAT.iron(), px, gy(px, ze) + 0.03, ze, 0, { rx: Math.PI / 2 });
      }
      for (let i = 1, n = Math.max(1, Math.round(len / 3)); i <= n; i++) { const sz2 = za + (len * i) / (n + 1); k.add(rbox(0.08, 0.2, 0.3, 0.02), MAT.iron(), px, gy(px, sz2) + 0.1, sz2); }
      // stopped by it, not stood on it (a 0.4 m pipe); jumped over, he lands clear
      box(px, mid, 0.16, len / 2 + 0.12, pipeH(mid) + 0.34, { noStand: true });
    }
    k.add(rbox(0.7, 0.04, gz1 - gz0 - 0.2, 0.02), MAT.flat('#6a4a2a', 1), px, gy(px, (gz0 + gz1) / 2) + 0.01, (gz0 + gz1) / 2);   // fresh earth over it
    const vz = z - 2.4;
    k.add(rbox(0.4, 0.5, 0.4, 0.04), MAT.paint('#3a5a8a', 0.5), px, gy(px, vz) + 0.25, vz);
    k.add(sphere(0.05, 8, 6), MAT.glow('#9ff4ff', '#35d8ff', 1.8), px + 0.21, gy(px, vz) + 0.38, vz);
    box(px, vz, 0.22, 0.22, gy(px, vz) + 0.62, { noStand: true });
    // a hand-painted sign at the footpath's south side, across the lane so both ways read it: "PUMP. STILL WORKS."
    // (it doesn't yet)
    const sx = x - 1.0, sz = z + 1.5, sTex = MAT.map(signTex(['PUMP', 'still works'], '#f2ead6', '#3a2a1a'), 0.8);
    k.add(cyl(0.03, 0.03, 1.1, 5), MAT.wood('dark'), sx, gy(sx, sz) + 0.55, sz);
    for (const r of [0, Math.PI]) k.add(plane(0.55, 0.3), sTex, sx, gy(sx, sz) + 1.15, sz + Math.cos(r) * 0.035, r);
    physics.add({ type: 'cyl', x: sx, z: sz, r: 0.08, top: gy(sx, sz) + 1.3, noStand: true });
    // the handle's stroke: worked by Twinsen it is lifted, pushed down past level and let back up (0.75 s, the
    // 'pump' pose in src/engine/rig.js), going where his hands take it (its angle is read from his hands each frame,
    // so the grip stays in them); on its own (a drink) it swings down and back in 0.6 s
    let pumpT = 0, rest = SEIZED, hands = null;
    const DOWN = 0.28, piv = handle.position;
    L.pump = {
      x, z, running: false, use: { x: x - USE_D, z, a: Math.PI / 2 },
      pipe: { x: px, z0: z - 7, z1: z + 7, gap: [gz0, gz1] }, sign: { x: sx, z: sz }, valve: { x: px, z: vz },
      setRunning(b) { this.running = b; stream.visible = b; water.material.opacity = b ? 0.9 : 0.25; water.position.y = y + (b ? 0.4 : 0.26); if (b) rest = 0; handle.rotation.z = rest; },
      setFree(b) { rest = b || this.running ? 0 : SEIZED; if (pumpT <= 0) handle.rotation.z = rest; },   // (the valve pin out: the handle drops level)
      // handsAt(): where the hands are now (world), or none for a stroke on its own
      stroke(handsAt = null, dur = 0.6) { pumpT = dur; hands = handsAt; },
      // where the crossbar grip is now (world), and the handle's angle (down > 0), for checks
      grip() { const v = new THREE.Vector3(-HANDLE_L, 0, 0); handle.updateWorldMatrix(true, false); return v.applyMatrix4(handle.matrixWorld); },
      handleAngle() { return handle.rotation.z; },
      // the route to the grip from where he stands (round the plinth and the trough on his side; through the
      // pipe's gap from the far side of the lane)
      route(hx, hz) {
        const rx = hx - x, rz = hz - z, s = rz >= 0 ? 1 : -1, pts = [];
        if (rx > -0.8) {
          if (rx > 0.55 && Math.abs(rz) < 0.75) pts.push({ x: hx, z: z + s * 0.95 });   // (beside the trough: out from it first)
          pts.push({ x: x - 0.75, z: z + s * 0.95 });
        } else if (rx < -1.75 && Math.abs(rz) > 0.35) pts.push({ x: x - 2.3, z });       // (west of the pipe: to the gap)
        pts.push({ x: x - USE_D, z });
        return pts;
      },
    };
    L.pump.setRunning(false);
    const _h = new THREE.Vector3();
    W.updaters.push((dt, t) => {
      if (pumpT > 0) {
        pumpT -= dt;
        const m = hands?.(_h);
        if (m) handle.rotation.z = Math.min(DOWN + 0.12, Math.max(-0.6, Math.atan2(piv.y - m.y, piv.x - m.x)));
        else if (hands) handle.rotation.z += (rest - handle.rotation.z) * Math.min(1, dt * 8);   // (let go: it swings back up)
        else { const ph = Math.min(1, Math.max(0, (0.6 - pumpT) / 0.6)); handle.rotation.z = Math.sin(ph * Math.PI) * DOWN; }
        if (pumpT <= 0) { hands = null; handle.rotation.z = rest; }
      } else handle.rotation.z = rest + (L.pump.running ? Math.sin(t * 0.7) * 0.03 : 0);
    });
    L.trough = { x: tx, z: tz };
    L.spots.bram = { x: x - 0.3, z: z - 2.1, a: 0.1 };   // (on the far side, so E at the pump means the pump)
    k.flush();
  }

  // ================================================================ the garden: raised beds, the pond, Arthur's boat box
  {
    const k = area();
    const { x, z } = GARDEN, y = gy(x, z);
    for (const [bx, bz] of BEDS) {
      const yb = gy(x + bx, z + bz);
      k.add(rbox(1.8, 0.35, 0.9, 0.03), MAT.planks('honey'), x + bx, yb + 0.17, z + bz);
      k.add(rbox(1.7, 0.04, 0.8, 0.01), MAT.flat('#4a3220', 1), x + bx, yb + 0.34, z + bz);
      for (let i = 0; i < 6; i++) k.add(sphere(0.08, 6, 5), MAT.flat(i % 2 ? '#6aa83a' : '#8ac84a', 0.8), x + bx - 0.65 + i * 0.26, yb + 0.42, z + bz + (i % 2 ? 0.15 : -0.15), 0, { sy: 0.6 });
      box(x + bx, z + bz, 0.9, 0.45, yb + 0.62, { noStand: true });   // (not to be walked on: Zoé's seedlings)
    }
    // the pond: a stone rim round a disc of water, a toy sail on it
    const r = 1.5;
    k.add(lathe([[r - 0.05, 0], [r + 0.25, 0], [r + 0.25, 0.22], [r - 0.05, 0.22]], 24), MAT.stone('grey', 1), x, y, z);
    const pond = new THREE.Mesh(new THREE.CircleGeometry(r - 0.05, 24), new THREE.MeshStandardMaterial({ color: '#5aa0c8', roughness: 0.08, metalness: 0.1 }));
    pond.rotation.x = -Math.PI / 2; pond.position.set(x, y + 0.14, z); g.add(pond);
    k.at(x + 0.4, y + 0.14, z - 0.2, 0.6, () => P.toyBoat(k));
    physics.add({ type: 'cyl', x, z, r: r + 0.2, top: y + 0.6, noStand: true });
    L.pond = { x, z }; L.beds = BEDS.map(([bx, bz]) => ({ x: x + bx, z: z + bz }));
    // the boat box: Arthur's, by the pond (paint, string, a spare sail — and Twinsen's pliers)
    const bx = x + 2.5, bz = z + 0.4;
    k.at(bx, y, bz, -0.4, () => P.chest(k, { w: 0.7, d: 0.42, h: 0.38, pal: 'pale', band: MAT.paint('#3b78d8', 0.5) }));
    k.add(plane(0.3, 0.12), MAT.map(tagTex('ARTHUR', '#3b78d8'), 0.8), bx + Math.sin(-0.4) * 0.22, y + 0.22, bz + Math.cos(-0.4) * 0.22, -0.4);
    box(bx, bz, 0.38, 0.24, y + 0.5, { rot: -0.4 });
    L.boatBox = { x: bx + 0.2, z: bz + 0.9 };
    k.flush();
  }

  // ================================================================ the harbour: customs, cargo from two worlds, Nell's shop
  {
    const k = area();
    // --- customs: a booth with a window and a striped barrier arm. A timber-framed plaster hut on a grey plank
    //     skirt under a deep two-step blue roof, its CUSTOMS board standing on the roof (east and west, the ways the
    //     camera looks along the quay), the service window and counter toward the quay (+z, Odile's side), a window
    //     on the seaward side (-z), the door and a narrow window on the west and the posted notices with their stamps
    //     by the barrier (east). Only materials this area's batch already uses: one draw per material, so the count
    //     stays flat. The collider is unchanged (the trim stands at most a few cm proud of it, the step 0.2 m).
    const { x, z } = BOOTH, y = gy(x, z);
    const plaster = MAT.plaster('#f2ead6'), navy = MAT.paint('#2a3a6a', 0.5), dark = MAT.wood('dark'), honey = MAT.wood('honey');
    const glassM = MAT.glass('#bfe6ff', 0.45), customsM = MAT.map(signTex(['CUSTOMS', 'Twinsun - Zeelich']), 0.7);
    k.add(rbox(2.0, 2.3, 1.6, 0.05), plaster, x, y + 1.15, z);
    k.add(rbox(2.08, 0.8, 1.68, 0.02), MAT.planks('grey'), x, y + 0.4, z);                        // plank skirt
    k.add(rbox(2.14, 0.06, 1.74, 0.015), dark, x, y + 0.82, z);                                     // its cap rail
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(rbox(0.12, 2.3, 0.12, 0.02), dark, x + sx * 1.0, y + 1.15, z + sz * 0.8);   // corner posts
    k.add(rbox(2.12, 0.14, 1.72, 0.02), dark, x, y + 2.23, z);                                      // wall plate
    // the roof: a honey fascia under a deep eave slab and a raised cap (thick, overhanging, its edge catching light)
    k.add(rbox(2.56, 0.07, 2.16, 0.015), honey, x, y + 2.31, z);
    k.add(rbox(2.5, 0.13, 2.1, 0.03), navy, x, y + 2.4, z);
    k.add(rbox(2.0, 0.14, 1.6, 0.04), navy, x, y + 2.52, z);
    // the CUSTOMS board on the roof, on two posts, painted on both faces: east (the harbour path from town) and west
    // (the quay's end), the ways the camera looks along the quay
    for (const sz of [-0.55, 0.55]) k.add(cyl(0.035, 0.035, 0.42, 6), MAT.iron(), x, y + 2.72, z + sz);
    k.add(rbox(0.05, 0.5, 1.42, 0.015), dark, x, y + 2.98, z);
    for (const s of [-1, 1]) k.add(plane(1.3, 0.45), customsM, x + s * 0.03, y + 2.98, z, s * Math.PI / 2);
    // a framed window: dark inside behind the glass, a frame proud of the wall, a honey sill (in the face's frame:
    // +z out of the wall, origin on the wall's surface)
    const windowAt = (cx, cy, cz, ry, w, h, bars = 1, sill = true) => k.at(cx, cy, cz, ry, () => {
      k.add(rbox(w, h, 0.02, 0.005), navy, 0, 0, 0.005);
      k.add(rbox(w, h, 0.03, 0.005), glassM, 0, 0, 0.03);
      for (const s of [-1, 1]) { k.add(rbox(w + 0.14, 0.07, 0.07, 0.015), dark, 0, s * (h / 2 + 0.035), 0.035); k.add(rbox(0.07, h, 0.07, 0.015), dark, s * (w / 2 + 0.035), 0, 0.035); }
      for (let i = 1; i <= bars; i++) k.add(rbox(0.035, h, 0.05, 0.008), dark, -w / 2 + (w * i) / (bars + 1), 0, 0.035);
      if (sill) k.add(rbox(w + 0.22, 0.05, 0.14, 0.012), honey, 0, -h / 2 - 0.09, 0.07);
    });
    // the quay side (+z): the service window over the counter (its sill), the bell, the CUSTOMS sign above
    windowAt(x, y + 1.45, z + 0.8, 0, 1.2, 0.5, 2, false);
    k.add(rbox(1.3, 0.06, 0.25, 0.01), honey, x, y + 1.1, z + 0.9);   // the counter
    for (const sx of [-0.5, 0.5]) k.add(rbox(0.05, 0.16, 0.18, 0.01), dark, x + sx, y + 1.0, z + 0.88);   // its brackets
    k.add(plane(1.1, 0.38), customsM, x, y + 1.97, z + 0.82);
    P.deskBell(k, x + 0.4, y + 1.13, z + 0.9);
    // the seaward side (-z): a window
    windowAt(x - 0.15, y + 1.5, z - 0.8, Math.PI, 0.9, 0.55, 1);
    // the west side (-x): the door, plank on a dark frame, a brass knob, a step; a narrow window beside it
    windowAt(x - 1.0, y + 1.5, z - 0.48, -Math.PI / 2, 0.3, 0.5, 0);
    k.at(x - 1.0, y, z + 0.2, -Math.PI / 2, () => {
      k.add(rbox(0.82, 1.9, 0.06, 0.015), dark, 0, 0.95, 0.03);
      k.add(rbox(0.7, 1.82, 0.05, 0.015), honey, 0, 0.93, 0.06);
      for (const hy of [0.45, 1.45]) k.add(rbox(0.66, 0.08, 0.03, 0.01), dark, 0, hy, 0.09);   // ledges
      k.add(sphere(0.035, 8, 6), MAT.brass(), 0.24, 0.95, 0.11);
      k.add(rbox(0.9, 0.08, 0.18, 0.015), dark, 0, 0.04, 0.12);   // the step (8 cm: not something to climb)
    });
    // the barrier side (+x): a notice board with posted forms, each with its red stamp
    k.at(x + 1.0, y, z - 0.2, Math.PI / 2, () => {
      k.add(rbox(0.86, 0.66, 0.04, 0.012), honey, 0, 1.45, 0.03);
      for (const [px, py, pw, ph] of [[-0.22, 1.55, 0.3, 0.36], [0.17, 1.6, 0.28, 0.26], [0.2, 1.3, 0.3, 0.22], [-0.2, 1.27, 0.26, 0.18]]) {
        k.add(rbox(pw, ph, 0.012, 0.003), plaster, px, py, 0.056);
        k.add(rbox(0.07, 0.07, 0.008, 0.002), MAT.paint('#b82a24', 0.45), px + pw / 2 - 0.07, py - ph / 2 + 0.07, 0.064);
      }
    });
    box(x, z, 1.0, 0.8, y + 2.4, { noStand: true });
    const barrier = new THREE.Group(); barrier.position.set(x + 1.3, y + 0.95, z + 0.3); g.add(barrier);
    k.add(cyl(0.08, 0.1, 0.95, 8), MAT.paint('#2a3a6a', 0.5), x + 1.3, y + 0.47, z + 0.3);
    physics.add({ type: 'cyl', x: x + 1.3, z: z + 0.3, r: 0.13, top: y + 1.0, noStand: true });   // the barrier's post
    { const bk = new Kit(barrier); for (let i = 0; i < 6; i++) bk.add(rbox(0.5, 0.08, 0.08, 0.01), MAT.paint(i % 2 ? '#f2ead6' : '#d03a2a', 0.5), 0.25 + i * 0.5, 0, 0); bk.flush(); }
    barrier.rotation.y = -0.15; barrier.rotation.z = 1.2;   // (up: the quay is open; only the crate is held)
    L.customs = { x, z: z + 1.6, barrier };
    L.spots.odile = { x: x - 0.2, z: z + 1.25, a: 0 };

    // --- the held shipment: an Esmer crate (lilac, brass bands, a round lid), roped off, a tag
    const c = CRATE, cy = gy(c.x, c.z);
    const crateG = new THREE.Group(); crateG.position.set(c.x, cy, c.z); g.add(crateG);
    const ck = new Kit(crateG);
    ck.add(rbox(1.0, 0.8, 0.8, 0.08), MAT.paint('#9a7ac8', 0.55), 0, 0.4, 0);
    for (const bx of [-0.35, 0.35]) ck.add(rbox(0.06, 0.82, 0.82, 0.01), MAT.brass(), bx, 0.41, 0);
    const lid = new THREE.Mesh(cyl(0.3, 0.3, 0.06, 18), MAT.brass()); lid.position.set(0, 0.83, 0); crateG.add(lid);
    ck.add(plane(0.5, 0.18), MAT.map(canvasTex(192, 64, (xx, Ww, Hh) => { xx.fillStyle = '#f4ecd4'; xx.fillRect(0, 0, Ww, Hh); xx.fillStyle = '#2a2a2a'; xx.font = 'bold 22px monospace'; xx.fillText('SOUP POT (1)', 10, 40); }), 0.8), 0, 0.45, 0.41);
    ck.flush();
    const tagM = { held: MAT.map(tagTex('HELD', '#c83a2a'), 0.8), open: MAT.map(tagTex('OPENED', '#c88a2a'), 0.8), cleared: MAT.map(tagTex('CLEARED', '#3a9a4a'), 0.8) };
    const tag = new THREE.Mesh(plane(0.3, 0.15), tagM.held); tag.position.set(0.52, 0.6, 0.1); tag.rotation.y = Math.PI / 2; crateG.add(tag);
    // rope on four posts round it
    const posts = [[-0.9, -0.75], [0.9, -0.75], [0.9, 0.75], [-0.9, 0.75]];
    for (const [px, pz] of posts) k.add(cyl(0.04, 0.05, 0.8, 6), MAT.brass(), c.x + px, cy + 0.4, c.z + pz);
    const ropeG = new THREE.Group(); g.add(ropeG); const ropes = [ropeG];
    { const rk = new Kit(ropeG);
      for (let i = 0; i < 4; i++) { const [ax, az] = posts[i], [bx2, bz2] = posts[(i + 1) % 4], len = Math.hypot(bx2 - ax, bz2 - az); rk.add(cyl(0.015, 0.015, len, 5), MAT.paint('#c83a2a', 0.6), c.x + (ax + bx2) / 2, cy + 0.72, c.z + (az + bz2) / 2, Math.atan2(bx2 - ax, bz2 - az), { rx: Math.PI / 2 }); }
      rk.flush(); }
    const crateCol = box(c.x, c.z, 0.95, 0.8, cy + 0.85);
    L.crate = {
      x: c.x, z: c.z + 1.2, state: 'held',
      setState(s) { this.state = s; tag.material = tagM[s]; lid.position.set(s === 'held' ? 0 : -0.25, s === 'held' ? 0.83 : 0.86, s === 'held' ? 0 : 0.0); lid.rotation.z = s === 'held' ? 0 : 0.25; for (const rp of ropes) rp.visible = s !== 'cleared'; },
    };
    void crateCol;

    // --- cargo from both worlds on the quay: Esmer crates, Mosquibee honey jars on a pallet, a Twinsun barrel row
    for (const [ex, ez, s] of [[-108.6, 31.9, 0.7], [-107.7, 31.95, 0.6], [-108.15, 31.9, 0.5]]) {
      const ey = gy(ex, ez) + (s === 0.5 ? 0.7 : 0);
      k.add(rbox(s, s * 0.8, s * 0.8, 0.05), MAT.paint('#9a7ac8', 0.55), ex, ey + s * 0.4, ez);
      k.add(rbox(0.04, s * 0.82, s * 0.82, 0.01), MAT.brass(), ex, ey + s * 0.41, ez);
    }
    box(-108.15, 31.9, 0.75, 0.32, gy(-108.15, 31.9) + 1.1);
    {
      const hx = -105.8, hz = 32.3, hy = gy(hx, hz);
      k.add(rbox(1.2, 0.12, 0.8, 0.02), MAT.wood('pale'), hx, hy + 0.06, hz);
      for (let i = 0; i < 6; i++) { const jx = hx - 0.4 + (i % 3) * 0.4, jz = hz - 0.18 + Math.floor(i / 3) * 0.36; k.add(lathe([[0.001, 0], [0.13, 0], [0.15, 0.12], [0.11, 0.26], [0.07, 0.3], [0.001, 0.3]], 12), MAT.glass('#e8b030', 0.75), jx, hy + 0.12, jz); k.add(cyl(0.075, 0.075, 0.04, 10), MAT.paint('#3a2a1a', 0.6), jx, hy + 0.44, jz); }
      box(hx, hz, 0.6, 0.4, hy + 0.62, { noStand: true });   // (nobody stands on the honey)
    }

    // --- Nell's repair shop: a lean-to on the grass north of the harbour path, its back wall to the north and open
    //     to the path, the quay and the lane from town (so the bench, Nell and the coupler's glow are in view from
    //     the way people come). Built in its own frame: local -x is the open front (world south), +x the back wall.
    const s = SHOP, sy = gy(s.x, s.z), SRY = Math.PI / 2;
    const toW = (lx, lz) => ({ x: s.x + lz, z: s.z - lx });   // (the frame turned by SRY)
    let coupler, benchLamp;
    k.at(s.x, sy, s.z, SRY, () => {
      k.add(rbox(0.15, 2.4, 3.2, 0.02), MAT.planks('grey'), 1.3, 1.2, 0);                           // back wall
      // (the roof, resting on the back wall and rising steeply toward the open front, is built below: its own mesh,
      // so it can fade)
      for (const pz of [-1.55, 1.55]) k.add(cyl(0.06, 0.07, 3.16, 6), MAT.wood('dark'), -1.2, 1.58, pz);
      k.at(0.85, 0, 0, -Math.PI / 2, () => P.workbench(k, { w: 2.2, d: 0.7, h: 0.88 }));
      // spare parts on the bench: gears, a shuttle landing leg, a crate of springs; tools on the back wall
      for (let i = 0; i < 3; i++) k.add(torus(0.08 + i * 0.03, 0.02, 4, 10), MAT.steel(), 0.8, 0.92 + i * 0.02, -0.7 + i * 0.12, 0, { rx: Math.PI / 2 });
      k.add(cyl(0.05, 0.08, 0.7, 8), MAT.paint('#b82a24', 0.45), 0.85, 0.95, -0.1, 0, { rz: Math.PI / 2 - 0.2 });
      for (let i = 0; i < 4; i++) k.add(rbox(0.03, 0.3 + (i % 2) * 0.1, 0.05, 0.01), MAT.steel(), 1.21, 1.5, -0.9 + i * 0.25);
      benchLamp = new THREE.PointLight('#ffd890', 0, 5); k._local(0.4, 2.0, 0, 0, {}).decompose(benchLamp.position, benchLamp.quaternion, benchLamp.scale); g.add(benchLamp);
      // the coupler, once it is on the bench: a brass drum with fins, glowing as it heats (at the front of the bench's
      // east end; Twinsen works from its west end, so he stands beside it, not in front of it)
      coupler = k.pivot(0.7, 0.9, 0.7, 0);
    });
    coupler.visible = false;
    // the roof: tall at the front so the bench and the coupler stay in view from the paths at the normal camera's
    // 26°; from the far view (46°) it fades while the coupler is on the bench and the roof is in the way of it, or
    // while Twinsen stands under it and it hides him (as the town's houses fade)
    const roofM = MAT.paint('#c8602a', 0.6).clone(), signM = MAT.map(signTex(['NELL\'S REPAIRS', 'engines - pumps - shuttles'], '#c8602a', '#f8f0dc'), 0.7).clone(), boardM = MAT.wood('dark').clone();
    const fadeM = [roofM, signM, boardM];
    {
      const rg = new THREE.Group(); rg.position.set(s.x, sy, s.z); rg.rotation.y = SRY; g.add(rg);
      const put = (geo, m, x, y, z, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(0, ry, rz); o.castShadow = o.receiveShadow = true; rg.add(o); };
      put(rbox(2.9, 0.1, 3.4, 0.02), roofM, 0.05, 2.82, 0, 0, -0.3);
      put(plane(1.6, 0.42), signM, -1.36, 3.5, 0, -Math.PI / 2);   // (its board stands on the roof's front edge)
      put(rbox(0.05, 0.46, 1.66, 0.01), boardM, -1.32, 3.5, 0);
    }
    {
      const R = { x0: s.x - 1.75, x1: s.x + 1.75, z0: s.z - 1.5, z1: s.z + 1.45, y0: sy + 2.3, y1: sy + 3.8 }, sample = new THREE.Vector3(), from = new THREE.Vector3();
      let f = 1; const prev = W.fadeOccluders;
      W.fadeOccluders = (cam, hero, dt) => {
        prev?.(cam, hero, dt);
        let hit = false;
        const under = hero.x > R.x0 && hero.x < R.x1 && hero.z > R.z0 && hero.z < R.z1;
        for (const [on, x, y, z] of [[coupler.visible, cw.x, sy + 1.05, cw.z], [under, hero.x, hero.y + 1.4, hero.z]]) {
          if (!on) continue; from.set(x, y, z);
          for (let i = 1; i < 20 && !hit; i++) { sample.copy(from).lerp(cam.position, i / 20); if (sample.x > R.x0 && sample.x < R.x1 && sample.z > R.z0 && sample.z < R.z1 && sample.y > R.y0 && sample.y < R.y1) hit = true; }
        }
        f += ((hit ? 0.25 : 1) - f) * (1 - Math.exp(-dt * 8));
        const see = f < 0.98;
        for (const m of fadeM) { if (m.transparent !== see) { m.transparent = see; m.depthWrite = !see; m.needsUpdate = true; } m.opacity = see ? f : 1; }
      };
    }
    const cm = new THREE.MeshStandardMaterial({ color: '#c89a4a', roughness: 0.35, metalness: 0.75, emissive: '#ff5a1a', emissiveIntensity: 0 });
    { const ck2 = new Kit(coupler); ck2.add(cyl(0.14, 0.14, 0.26, 14), cm, 0, 0.13, 0);
      for (let i = 0; i < 6; i++) ck2.add(rbox(0.02, 0.22, 0.12, 0.004), cm, Math.cos(i) * 0.16, 0.13, Math.sin(i) * 0.16, -i);
      ck2.flush(); }
    { const bw = toW(1.3, 0); box(bw.x, bw.z, 1.6, 0.12, sy + 2.4, { noStand: true }); }
    for (const pz of [-1.55, 1.55]) { const p = toW(-1.2, pz); physics.add({ type: 'cyl', x: p.x, z: p.z, r: 0.1, top: sy + 3.2, noStand: true }); }
    { const b = toW(0.85, 0); box(b.x, b.z, 1.1, 0.35, sy + 0.9, { noStand: true }); }
    // the Esmer engine on its stand at the open west side: a drum, a fan toward the path that spins when it runs
    const ex = s.x - 1.75, ez = s.z + 0.55, ey = gy(ex, ez);
    k.add(rbox(0.5, 0.5, 0.7, 0.03), MAT.iron(), ex, ey + 0.25, ez);
    k.add(cyl(0.25, 0.25, 0.6, 14), MAT.paint('#9a7ac8', 0.5), ex, ey + 0.75, ez, 0, { rx: Math.PI / 2 });
    const fan = new THREE.Group(); fan.position.set(ex, ey + 0.75, ez + 0.34); g.add(fan);
    { const fk = new Kit(fan); for (let i = 0; i < 4; i++) fk.add(rbox(0.1, 0.42, 0.03, 0.01), MAT.brass(), 0, 0, 0, 0, { rz: i * Math.PI / 4 }); fk.flush(); }
    box(ex, ez, 0.3, 0.4, ey + 1.0, { noStand: true });
    let fanOn = false; W.updaters.push((dt) => { if (fanOn) fan.rotation.z += dt * 14; });
    // the water barrel (open, full), beside the engine
    const wx = s.x - 2.95, wz = s.z + 0.45, wy = gy(wx, wz);
    k.at(wx, wy, wz, 0, () => P.barrel(k, { r: 0.36, h: 0.8, pal: 'honey' }));
    const bw = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), new THREE.MeshStandardMaterial({ color: '#5a90b8', roughness: 0.1 })); bw.rotation.x = -Math.PI / 2; bw.position.set(wx, wy + 0.74, wz); g.add(bw);
    physics.add({ type: 'cyl', x: wx, z: wz, r: 0.38, top: wy + 0.82, noStand: true });
    const cw = toW(0.7, 0.7);
    // the coupler's heat, readable at room scale: the brass goes dull red (warming), then bright orange with a halo
    // and a light on the bench and the back wall (glowing: take it off now), then yellow-white and flickering with a
    // column of steam (about to trip; life.js adds the sparks and the ticking). Steam puffs rise from it throughout.
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: '#ff7a30', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    halo.position.set(0, 0.14, 0); halo.userData.fx = true; coupler.add(halo);
    const cLight = new THREE.PointLight('#ff7a30', 0, 3.6); cLight.position.set(cw.x, sy + 1.35, cw.z); g.add(cLight);
    const puffs = [];
    for (let i = 0; i < 10; i++) { const p = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), color: '#eef2f4', transparent: true, opacity: 0, depthWrite: false })); p.visible = false; p.userData.fx = true; g.add(p); puffs.push({ p, life: 0, op: 0 }); }
    const HEAT_LOOK = [   // per stage: emissive colour, intensity, halo opacity/size, light, steam puffs per second and their opacity
      { c: '#000000', e: 0, h: 0, hs: 0.3, l: 0, puff: 0, po: 0 },
      { c: '#b0280a', e: 0.9, h: 0.22, hs: 0.45, l: 0.6, puff: 0.8, po: 0.28 },
      { c: '#ff6414', e: 2.4, h: 0.6, hs: 0.8, l: 2.6, puff: 2.6, po: 0.45 },
      { c: '#ffd890', e: 3.4, h: 0.9, hs: 1.05, l: 4.2, puff: 8, po: 0.6 },
    ];
    let heatU = 0, heatStage = 0, settled = false, puffAcc = 0;
    const _c = new THREE.Color(), _settledC = new THREE.Color('#ff9040');
    W.updaters.push((dt, t) => {
      const on = coupler.visible, H = HEAT_LOOK[on && !settled ? heatStage : 0];
      const flick = heatStage === 3 && !settled ? 0.75 + 0.25 * Math.sin(t * 23) + 0.1 * Math.sin(t * 61) : 1;
      if (settled) { cm.emissive.copy(_settledC); cm.emissiveIntensity = 0.35; }
      else { cm.emissive.copy(_c.set(H.c)); cm.emissiveIntensity = H.e * (heatStage === 1 ? 0.5 + heatU * 2 : 1) * flick; }
      halo.visible = on && H.h > 0; halo.material.color.copy(cm.emissive); halo.material.opacity = H.h * flick; halo.scale.setScalar(H.hs * (heatStage === 3 ? 0.92 + 0.12 * Math.sin(t * 9) : 1));
      cLight.color.copy(cm.emissive); cLight.intensity = on ? H.l * flick : 0;
      // steam: puffs from the top of the drum that rise, swell and thin out
      puffAcc += on ? H.puff * dt : 0;
      while (puffAcc >= 1) {
        puffAcc -= 1;
        const P = puffs.find((q) => q.life <= 0); if (!P) break;
        P.life = 1.3; P.op = H.po; P.p.visible = true; P.p.position.set(cw.x + (Math.random() - 0.5) * 0.12, sy + 1.12, cw.z + (Math.random() - 0.5) * 0.12);
        P.vx = (Math.random() - 0.5) * 0.15; P.vz = (Math.random() - 0.5) * 0.15;
      }
      for (const P of puffs) {
        if (P.life <= 0) continue;
        P.life -= dt; const k = 1 - Math.max(0, P.life) / 1.3;
        P.p.position.x += P.vx * dt; P.p.position.z += P.vz * dt; P.p.position.y += (0.75 - k * 0.3) * dt;
        P.p.scale.setScalar(0.18 + k * 0.55); P.p.material.opacity = P.op * Math.min(1, k * 5) * (1 - k);
        if (P.life <= 0) P.p.visible = false;
      }
    });
    L.shop = {
      bench: toW(0.05, 0.25),
      // his place at the bench (its west end, the coupler to his right), and the way there from beside the bench
      work: { x: s.x - 0.25, z: s.z + 0.02, a: Math.PI },
      route(hx, hz) { const pts = []; if (hx < s.x - 0.7 && hz < s.z + 1.0) pts.push({ x: s.x - 0.6, z: s.z + 1.1 }); pts.push({ x: s.x - 0.25, z: s.z + 0.02 }); return pts; },
      engine: { x: ex + 0.2, z: ez + 0.9, setRunning(b) { fanOn = b; benchLamp.intensity = b ? 3 : 0; } },
      barrel: { x: wx + 0.1, z: wz + 0.85, wx, wz },
      // setHeat(u 0..1 of the way to the trip, stage 0 cool | 1 warming | 2 glowing | 3 about to trip | 'settled')
      coupler: { x: cw.x, z: cw.z, y: sy + 0.9, setHeat(u, st = 0) { heatU = u; settled = st === 'settled'; heatStage = settled ? 0 : st; }, get stage() { return settled ? 'settled' : heatStage; },
        // what it looks like now (for checks): glow colour and strength, its light, halo, steam puffs in the air
        look() { return { c: '#' + cm.emissive.getHexString(), e: +cm.emissiveIntensity.toFixed(2), light: +cLight.intensity.toFixed(2), halo: halo.visible ? +halo.material.opacity.toFixed(2) : 0, puffs: puffs.filter((q) => q.life > 0).length }; },
        setVisible(b) { coupler.visible = b; }, get visible() { return coupler.visible; } },
    };
    // Nell kneels at her dead engine (inside the open west side); once it runs she stands up facing the path
    L.spots.nell = { x: ex + 0.75, z: ez, a: -Math.PI / 2, aDone: Math.PI * 0.25 };
    k.flush();
  }
  return L;
}
