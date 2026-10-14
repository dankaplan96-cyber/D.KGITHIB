// Citadel twelve years on, outdoors (the places; src/game/story/life.js gives them their people and stories).
//
//   - The lane north of Twinsen's house (Bug Street's south end): the neighbourhood's old hand pump on its stone
//     plinth with a trough, and right past it the project's new copper heat pipe on low stands. Bram keeps the
//     pump; it is seized since the pipe went in (The Old Pump).
//   - Twinsen and Zoé's garden, west of the house: Zoé's raised beds, a small pond where Arthur tries his boats, and
//     his boat box (Twinsen's pliers are in it: Arthur borrowed them).
//   - The harbour quay: a customs booth (Officer Odile) with a barrier, the held Esmer crate roped off beside it,
//     cargo from both worlds (Esmer crates, Mosquibee honey jars, Twinsun barrels), and Nell's repair shop for
//     imported machines (a lean-to with a bench, an Esmer engine on a stand and a water barrel) — The Mislabelled
//     Shipment.
//
// CONTRACT (world coordinates): buildTownLife(root, physics, W) → W.life = {
//   pump {x, z, setRunning(b), running}, trough {x,z}, pipe, beds, pond {x,z}, boatBox {x,z},
//   customs {x, z, barrier}, crate {x, z, setState('held'|'open'|'cleared')}, cargo,
//   shop {bench {x,z}, engine {x,z, setRunning(b)}, barrel {x,z}, coupler {setHeat(0..1), setVisible(b)}},
//   spots {bram, odile, nell} {x,z,a} }
import * as THREE from 'three';
import { MAT, rbox, plane, cyl, sphere, lathe, torus, canvasTex, Kit } from './props.js';
import * as P from './props.js';

const PUMP = { x: -42.0, z: 65.0 };
const GARDEN = { x: -60.0, z: 83.5 };   // (west of the house, where the ground is flat)
const BOOTH = { x: -110.5, z: 35.0 };
const CRATE = { x: -108.2, z: 33.9 };
const SHOP = { x: -104.4, z: 36.9 };

const signTex = (lines, bg = '#2f4a7a', fg = '#f2e6c8') => canvasTex(256, 96, (x, W, H) => {
  x.fillStyle = bg; x.fillRect(0, 0, W, H); x.strokeStyle = fg; x.lineWidth = 5; x.strokeRect(5, 5, W - 10, H - 10);
  x.fillStyle = fg; x.textAlign = 'center'; x.font = 'bold 34px sans-serif'; x.fillText(lines[0], W / 2, lines[1] ? 44 : 60);
  if (lines[1]) { x.font = '20px sans-serif'; x.fillText(lines[1], W / 2, 76); }
});
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
    k.add(cyl(0.11, 0.13, 1.15, 10), MAT.iron(), x, y + 0.35 + 0.57, z);                    // barrel of the pump
    k.add(cyl(0.16, 0.16, 0.12, 12), MAT.iron(), x, y + 1.5, z);
    k.add(sphere(0.09, 10, 8), MAT.iron(), x, y + 1.62, z);
    k.add(cyl(0.035, 0.04, 0.35, 8), MAT.iron(), x + 0.2, y + 1.2, z, 0, { rz: -1.1 });      // spout
    const handle = new THREE.Group(); handle.position.set(x - 0.12, y + 1.5, z); g.add(handle);
    { const bar = new THREE.Mesh(cyl(0.025, 0.025, 0.9, 6), MAT.iron()); bar.rotation.z = Math.PI / 2; bar.position.x = -0.42; handle.add(bar); bar.castShadow = true;
      const knob = new THREE.Mesh(sphere(0.05, 8, 6), MAT.wood('dark')); knob.position.x = -0.86; handle.add(knob); }
    handle.rotation.z = 0.35;   // (seized: handle stuck up)
    // the trough: a stone basin, water inside when it runs
    const tx = x + 1.3, tz = z;
    k.add(rbox(1.2, 0.45, 0.6, 0.05), MAT.stone('grey', 1), tx, y + 0.22, tz);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.42), new THREE.MeshStandardMaterial({ color: '#7ab8e0', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 }));
    water.rotation.x = -Math.PI / 2; water.position.set(tx, y + 0.3, tz); g.add(water);
    const stream = new THREE.Mesh(cyl(0.02, 0.025, 0.7, 6, true), new THREE.MeshStandardMaterial({ color: '#cfe8ff', transparent: true, opacity: 0.7, roughness: 0.05 }));
    stream.position.set(x + 0.36, y + 0.85, z); stream.visible = false; g.add(stream);
    box(x, z, 0.5, 0.5, y + 1.7, { noStand: true });
    box(tx, tz, 0.6, 0.3, y + 0.45);
    // a hand-painted sign: "PUMP. STILL WORKS." (it doesn't yet)
    k.add(cyl(0.03, 0.03, 1.1, 5), MAT.wood('dark'), x - 0.75, y + 0.55, z + 0.45);
    k.add(plane(0.55, 0.3), MAT.map(signTex(['PUMP', 'still works'], '#f2ead6', '#3a2a1a'), 0.8), x - 0.75, y + 1.15, z + 0.47);
    // the project's new heat pipe along the lane, on low stands, with a valve box beside the pump
    const px = x - 1.5;
    k.add(cyl(0.11, 0.11, 14, 10), MAT.copper(), px, gy(px, z) + 0.28, z, 0, { rx: Math.PI / 2 });
    for (let dz = -6; dz <= 6; dz += 3) k.add(rbox(0.08, 0.2, 0.3, 0.02), MAT.iron(), px, gy(px, z + dz) + 0.1, z + dz);
    k.add(rbox(0.4, 0.5, 0.4, 0.04), MAT.paint('#3a5a8a', 0.5), px, gy(px, z - 1.2) + 0.25, z - 1.2);
    k.add(sphere(0.05, 8, 6), MAT.glow('#9ff4ff', '#35d8ff', 1.8), px + 0.21, gy(px, z - 1.2) + 0.38, z - 1.2);
    box(px, z - 1.2, 0.22, 0.22, gy(px, z - 1.2) + 0.5, { noStand: true });
    let pumpT = 0;
    L.pump = {
      x, z, running: false,
      setRunning(b) { this.running = b; stream.visible = b; water.material.opacity = b ? 0.9 : 0.25; water.position.y = y + (b ? 0.4 : 0.26); handle.rotation.z = b ? 0 : 0.35; },
      stroke() { pumpT = 0.6; },
    };
    L.pump.setRunning(false);
    W.updaters.push((dt, t) => { if (pumpT > 0) { pumpT -= dt; handle.rotation.z = Math.sin((0.6 - pumpT) / 0.6 * Math.PI) * 0.5; } else if (L.pump.running) handle.rotation.z = Math.sin(t * 0.7) * 0.03; });
    L.trough = { x: tx, z: tz };
    L.spots.bram = { x: x - 0.3, z: z - 2.1, a: 0.1 };   // (on the far side, so E at the pump means the pump)
    k.flush();
  }

  // ================================================================ the garden: raised beds, the pond, Arthur's boat box
  {
    const k = area();
    const { x, z } = GARDEN, y = gy(x, z);
    for (const [bx, bz] of [[-1.0, -4.6], [-1.0, -6.7]]) {
      k.add(rbox(1.8, 0.35, 0.9, 0.03), MAT.planks('honey'), x + bx, y + 0.17, z + bz);
      k.add(rbox(1.7, 0.04, 0.8, 0.01), MAT.flat('#4a3220', 1), x + bx, y + 0.34, z + bz);
      for (let i = 0; i < 6; i++) k.add(sphere(0.08, 6, 5), MAT.flat(i % 2 ? '#6aa83a' : '#8ac84a', 0.8), x + bx - 0.65 + i * 0.26, y + 0.42, z + bz + (i % 2 ? 0.15 : -0.15), 0, { sy: 0.6 });
      box(x + bx, z + bz, 0.9, 0.45, y + 0.36);
    }
    // the pond: a stone rim round a disc of water, a toy sail on it
    const r = 1.5;
    k.add(lathe([[r - 0.05, 0], [r + 0.25, 0], [r + 0.25, 0.22], [r - 0.05, 0.22]], 24), MAT.stone('grey', 1), x, y, z);
    const pond = new THREE.Mesh(new THREE.CircleGeometry(r - 0.05, 24), new THREE.MeshStandardMaterial({ color: '#5aa0c8', roughness: 0.08, metalness: 0.1 }));
    pond.rotation.x = -Math.PI / 2; pond.position.set(x, y + 0.14, z); g.add(pond);
    k.at(x + 0.4, y + 0.14, z - 0.2, 0.6, () => P.toyBoat(k));
    physics.add({ type: 'cyl', x, z, r: r + 0.2, top: y + 0.6, noStand: true });
    L.pond = { x, z };
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
    // --- customs: a booth with a window and a striped barrier arm
    const { x, z } = BOOTH, y = gy(x, z);
    k.add(rbox(2.0, 2.3, 1.6, 0.05), MAT.plaster('#f2ead6'), x, y + 1.15, z);
    k.add(rbox(2.3, 0.15, 1.9, 0.04), MAT.paint('#2a3a6a', 0.5), x, y + 2.37, z);
    k.add(rbox(1.2, 0.6, 0.04, 0.01), MAT.glass('#bfe6ff', 0.45), x, y + 1.45, z + 0.81);
    k.add(rbox(1.3, 0.06, 0.25, 0.01), MAT.wood('honey'), x, y + 1.1, z + 0.9);   // the counter
    k.add(plane(1.3, 0.45), MAT.map(signTex(['CUSTOMS', 'Twinsun - Zeelich']), 0.7), x, y + 2.0, z + 0.82);
    P.deskBell(k, x + 0.4, y + 1.13, z + 0.9);
    box(x, z, 1.0, 0.8, y + 2.4, { noStand: true });
    const barrier = new THREE.Group(); barrier.position.set(x + 1.3, y + 0.95, z + 0.3); g.add(barrier);
    k.add(cyl(0.08, 0.1, 0.95, 8), MAT.paint('#2a3a6a', 0.5), x + 1.3, y + 0.47, z + 0.3);
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
      box(hx, hz, 0.6, 0.4, hy + 0.46);
    }

    // --- Nell's repair shop: a lean-to against the quay's end, open to the west
    const s = SHOP, sy = gy(s.x, s.z);
    k.add(rbox(0.15, 2.4, 3.2, 0.02), MAT.planks('grey'), s.x + 1.3, sy + 1.2, s.z);                    // back wall (east)
    k.add(rbox(2.9, 0.1, 3.4, 0.02), MAT.paint('#c8602a', 0.6), s.x + 0.1, sy + 2.45, s.z, 0, { rz: 0.12 }); // roof, sloping to the west
    for (const pz of [-1.55, 1.55]) k.add(cyl(0.06, 0.07, 2.2, 6), MAT.wood('dark'), s.x - 1.2, sy + 1.1, s.z + pz);
    box(s.x + 1.3, s.z, 0.12, 1.6, sy + 2.4, { noStand: true });
    for (const pz of [-1.55, 1.55]) physics.add({ type: 'cyl', x: s.x - 1.2, z: s.z + pz, r: 0.1, top: sy + 2.3, noStand: true });
    k.add(plane(1.6, 0.42), MAT.map(signTex(['NELL\'S REPAIRS', 'engines - pumps - shuttles'], '#c8602a', '#f8f0dc'), 0.7), s.x - 1.15, sy + 2.25, s.z, -Math.PI / 2);
    k.at(s.x + 0.85, sy, s.z, -Math.PI / 2, () => P.workbench(k, { w: 2.2, d: 0.7, h: 0.88 }));
    box(s.x + 0.85, s.z, 0.35, 1.1, sy + 0.9, { noStand: true });
    // spare parts on the bench: gears, a shuttle landing leg, a crate of springs
    for (let i = 0; i < 3; i++) k.add(torus(0.08 + i * 0.03, 0.02, 4, 10), MAT.steel(), s.x + 0.8, sy + 0.92 + i * 0.02, s.z - 0.7 + i * 0.12, 0, { rx: Math.PI / 2 });
    k.add(cyl(0.05, 0.08, 0.7, 8), MAT.paint('#b82a24', 0.45), s.x + 0.85, sy + 0.95, s.z + 0.5, 0, { rz: Math.PI / 2 - 0.2 });
    const benchLamp = new THREE.PointLight('#ffd890', 0, 5); benchLamp.position.set(s.x + 0.6, sy + 2.0, s.z); g.add(benchLamp);
    // the coupler, once it is on the bench: a brass drum with fins, glowing as it heats
    const coupler = new THREE.Group(); coupler.position.set(s.x + 0.85, sy + 0.9, s.z - 0.15); g.add(coupler); coupler.visible = false;
    const cm = new THREE.MeshStandardMaterial({ color: '#c89a4a', roughness: 0.35, metalness: 0.75, emissive: '#ff5a1a', emissiveIntensity: 0 });
    { const ck2 = new Kit(coupler); ck2.add(cyl(0.14, 0.14, 0.26, 14), cm, 0, 0.13, 0);
      for (let i = 0; i < 6; i++) ck2.add(rbox(0.02, 0.22, 0.12, 0.004), cm, Math.cos(i) * 0.16, 0.13, Math.sin(i) * 0.16, -i);
      ck2.flush(); }
    // the Esmer engine on its stand: a drum, a fan that spins when it runs
    const ex = s.x - 0.6, ez = s.z + 1.75, ey = gy(ex, ez);
    k.add(rbox(0.7, 0.5, 0.5, 0.03), MAT.iron(), ex, ey + 0.25, ez);
    k.add(cyl(0.25, 0.25, 0.6, 14), MAT.paint('#9a7ac8', 0.5), ex, ey + 0.75, ez, 0, { rz: Math.PI / 2 });
    const fan = new THREE.Group(); fan.position.set(ex - 0.34, ey + 0.75, ez); g.add(fan);
    { const fk = new Kit(fan); for (let i = 0; i < 4; i++) fk.add(rbox(0.03, 0.42, 0.1, 0.01), MAT.brass(), 0, 0, 0, 0, { rx: i * Math.PI / 4 }); fk.flush(); }
    box(ex, ez, 0.4, 0.3, ey + 1.0, { noStand: true });
    let fanOn = false; W.updaters.push((dt) => { if (fanOn) fan.rotation.x += dt * 14; });
    // the water barrel (open, full)
    const wx = s.x - 2.3, wz = s.z + 2.45, wy = gy(wx, wz);
    k.at(wx, wy, wz, 0, () => P.barrel(k, { r: 0.36, h: 0.8, pal: 'honey' }));
    const bw = new THREE.Mesh(new THREE.CircleGeometry(0.3, 16), new THREE.MeshStandardMaterial({ color: '#5a90b8', roughness: 0.1 })); bw.rotation.x = -Math.PI / 2; bw.position.set(wx, wy + 0.74, wz); g.add(bw);
    physics.add({ type: 'cyl', x: wx, z: wz, r: 0.38, top: wy + 0.82, noStand: true });
    L.shop = {
      bench: { x: s.x + 0.1, z: s.z - 0.15 },
      engine: { x: ex - 0.9, z: ez, setRunning(b) { fanOn = b; benchLamp.intensity = b ? 3 : 0; } },
      barrel: { x: wx - 0.75, z: wz },
      coupler: { setHeat(h) { cm.emissiveIntensity = h * 2.2; }, setVisible(b) { coupler.visible = b; }, get visible() { return coupler.visible; } },
    };
    L.spots.nell = { x: s.x - 0.35, z: s.z - 0.9, a: -Math.PI / 2 };
    k.flush();
  }
  return L;
}
