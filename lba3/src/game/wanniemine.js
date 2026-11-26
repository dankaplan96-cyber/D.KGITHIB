// WAVE 6 · H-16 "The Lift Below" (docs/lba-maturity/CONTENT-15H.md §3, WAVE6.md): the Wannies' deep seam under the
// Platform, the one big new place of the plan. Ours: our own geometry and look; LBA2's Wannies, their mine and its
// lift between the layers only guide the idea (no original data or art is used here).
//
// Three rooms (one regions.js group, 'wanniemine'), the room camera as every interior (LBA2's cut-away: the far walls
// -x and -z tall, the near rims low):
//   wm_landing   the deep landing: the project's reserved cage comes down its shaft in the back-left corner (its lever
//                beside it), the project's ore crates stacked by it, and the deep shift's camp: a stove gone low,
//                bedrolls, a lamp rack, Marl's oil jar. The way on: the timbered tunnel in the left wall.
//   wm_gallery   the deep seam: a long gallery with rails and an ore cart, gems in the back wall, three lamp posts (dark
//                until lit), the side way to the Blow in the back wall, and at the west end the project's bulkhead
//                across the old incline (CLOSED · ORE BY LIFT ONLY), held by two wedges at its foot. Behind it the
//                incline climbs to the old mouth (out onto the Platform).
//   wm_blow      the Blow: the gas pocket the project's drill opened; three vents, a seam of gems going warm in its
//                back wall, the deep shift's strongbox lost in the gas.
//
// CONTRACT (world coordinates unless said; story/liftbelow.js plays it)
//   WM_AT                                 the rooms' places (regions.js AT)
//   buildWannieMine(scene, physics) → { wm_landing, wm_gallery, wm_blow }   (regions.js group 'wanniemine')
//   WM (filled when built):
//     landing: { cage {x,z,a}, lever {x,z}, crates {x,z}, oil {x,z}, stove {x,z}, rack {x,z}, spots {gant, tull, marl},
//                setCage(y) (the cage's deck height over the floor: 0 down), cageY }
//     gallery: { posts [{x,z,y}] (three), setLamp(i, on), wedges [{x,z,y}] (two), setWedge(i, out), bulk {x,z},
//                back {x,z} (its back, on the incline's side), setBulk(state: 'shut'|'falling'|'open', k), mouth {x,z},
//                blowDoor {x,z}, sign {x,z}, spots {marl} }
//     blow:     { centre {x,z}, vents [{x,z}], wake {x}, box {x,z}, setCalm(on), setBox(open), vein {x,z,y}, spots {} }
//   wannieMineDoors() / wannieMineExit(to)  the Platform's mine mouth leads into the gallery's upper end (always open:
//                                           the shortcut once the bulkhead is down); 'wm-out' back out before the mouth
import * as THREE from 'three';
import { RoomBuilder, glowSprite } from './interiors.js';
import { MAT, M, rbox, plane, cyl, sphere, canvasTex, barrel, crate, jar } from './props.js';
import { rockGeo, rockMat, floorTex } from './underground.js';
import { crystalMats, crystalCluster } from './crystallook.js';
import { ISLE_AT, SLOTS } from './zislands.js';

export const WM_AT = { wm_landing: { x: 12000, z: 0 }, wm_gallery: { x: 12100, z: 0 }, wm_blow: { x: 12200, z: 0 } };
export const WM = {};

// ---------------------------------------------------------------- shared look
const hash = (a, b, s) => { const h = Math.sin(a * 127.1 + b * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); };
const rock = () => rockMat('#9a8a82');
const floorM = () => M('wm_floor', () => { const m = new THREE.MeshStandardMaterial({ map: floorTex('#776b68', 'rgba(40,30,36,0.4)', 'shaft'), color: '#bcae9e', roughness: 0.93 }); m.userData.tile = 4.5; m.userData.rockSet = true; return m; });
const timber = () => MAT.wood('dark');
const plank = () => MAT.planks('dark');
const rust = () => MAT.paint('#6e4532', 0.8);
const dark = () => MAT.flat('#0e0d10', 0.95);
const signTex = (lines, { bg = '#e8c84a', ink = '#1a1410', w = 512, h = 192, size = 52, stripes = false } = {}) => canvasTex(w, h, (x, W, H) => {
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  if (stripes) { x.fillStyle = '#1a1410'; for (let i = -H; i < W; i += 48) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 24, 0); x.lineTo(i + 24 - H * 0.35, H * 0.18); x.lineTo(i - H * 0.35, H * 0.18); x.fill(); } }
  x.strokeStyle = ink; x.lineWidth = 8; x.strokeRect(6, 6, W - 12, H - 12);
  x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `bold ${size}px sans-serif`;
  lines.forEach((l, i) => x.fillText(l, W / 2, H / 2 + (stripes ? H * 0.08 : 0) + (i - (lines.length - 1) / 2) * size * 1.15));
});
// a stencil on timber or a crate (letters only, the wood shows through)
const stencilTex = (lines, ink = '#e8dcc0', size = 58) => canvasTex(512, 256, (x, W, H) => {
  x.clearRect(0, 0, W, H); x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `bold ${size}px monospace`;
  lines.forEach((l, i) => x.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * size * 1.2));
});

// a mine set: two timber legs against a wall and a cap beam over them (local: legs at ±w/2, the wall behind at -z)
function timberSet(k, w = 2.4, h = 3.0) {
  for (const s of [-1, 1]) k.add(rbox(0.26, h, 0.26, 0.03), timber(), s * w / 2, h / 2, 0, s * 0.04);
  k.add(rbox(w + 0.5, 0.3, 0.32, 0.03), timber(), 0, h + 0.12, 0);
  return { hw: w / 2 + 0.2, hd: 0.2, top: h };
}
// ---- the warm lamp light (WAVE6 second round, the user 25.11: "keep, and light it"): caged bulbs hung from the timbers,
// their glass self-lit with a soft halo, and the lit pools they throw on the floor. The pools are unlit additive discs
// (no lamp, no shadow: they stay on Low, where the light pool keeps only the two nearest lamps), as Tralu's cave's and the
// lamp room's pools. No new lamp casts a shadow.
const poolTex = () => M('wm_pooltex', () => canvasTex(128, 128, (x, W) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.5, 'rgba(255,255,255,0.42)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, W, W); }));
const poolMat = (color, opacity) => { const m = new THREE.MeshBasicMaterial({ map: poolTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }); m.userData.noShadow = true; return m; };
// a lit pool on the floor (room-local x, z; y the floor under it), its size r (radius, m)
function floorPool(B, x, z, r, mat, y = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), mat);
  m.rotation.x = -Math.PI / 2; m.position.set(x, y + 0.035, z); m.renderOrder = 1; B.group.add(m);
  return m;
}
const bulbGlass = () => M('wm_bulb', () => { const m = new THREE.MeshStandardMaterial({ color: '#ffe6b0', emissive: '#ffb050', emissiveIntensity: 1.8, roughness: 0.3 }); m.userData.noShadow = true; return m; });
// a caged bulb hung on a wire under a timber (room-local; y the wire's top), its halo a sprite
function hangBulb(B, x, y, z, drop = 0.5) {
  const k = B.k;
  k.add(cyl(0.012, 0.012, drop, 4), MAT.iron(), x, y - drop / 2, z);
  k.add(cyl(0.05, 0.09, 0.07, 8), MAT.iron(), x, y - drop - 0.03, z);
  k.add(sphere(0.085, 10, 8), bulbGlass(), x, y - drop - 0.12, z);
  for (let i = 0; i < 3; i++) k.add(rbox(0.015, 0.2, 0.015, 0.004), MAT.iron(), x + Math.sin(i * 2.09) * 0.1, y - drop - 0.13, z + Math.cos(i * 2.09) * 0.1);
  const h = glowSprite('#ffc070', 1.1, 0.55); h.position.set(x, y - drop - 0.12, z); B.group.add(h);
}

// a miner's lamp post: a timber post, an iron arm, a caged glass lamp (its glass a material of its own: it lights)
function lampPost(k, glass) {
  k.add(rbox(0.22, 2.7, 0.22, 0.03), timber(), 0, 1.35, 0);
  k.add(rbox(0.6, 0.08, 0.08, 0.01), MAT.iron(), 0.28, 2.55, 0);
  k.add(cyl(0.015, 0.015, 0.3, 4), MAT.iron(), 0.52, 2.38, 0);
  k.add(cyl(0.16, 0.12, 0.08, 10), MAT.iron(), 0.52, 2.22, 0);
  k.add(cyl(0.13, 0.13, 0.26, 10), glass, 0.52, 2.06, 0);
  for (let i = 0; i < 4; i++) k.add(rbox(0.02, 0.3, 0.02, 0.005), MAT.iron(), 0.52 + Math.sin(i * 1.57) * 0.14, 2.06, Math.cos(i * 1.57) * 0.14);
  k.add(cyl(0.1, 0.14, 0.06, 10), MAT.iron(), 0.52, 1.92, 0);
  return { r: 0.18, top: 2.8 };
}
// the deep shift's bedroll on a plank pallet, a blanket rolled at its head
function bedroll(k, c) {
  k.add(rbox(0.8, 0.1, 1.9, 0.02), plank(), 0, 0.05, 0);
  k.add(rbox(0.7, 0.08, 1.5, 0.04), MAT.cloth(c), 0, 0.14, 0.15);
  k.add(cyl(0.14, 0.14, 0.7, 10), MAT.cloth('#8a7a5a'), 0, 0.22, -0.75, 0, { rz: Math.PI / 2 });
  return { hw: 0.42, hd: 0.95, top: 0.25 };
}
// the camp's iron stove, its door a dull ember (its glow a material of its own)
function stove(k, ember) {
  k.add(rbox(0.8, 0.75, 0.6, 0.04), MAT.iron(), 0, 0.42, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(rbox(0.08, 0.06, 0.08, 0.01), MAT.iron(), sx * 0.34, 0.03, sz * 0.24);
  k.add(rbox(0.32, 0.2, 0.02, 0.01), ember, 0, 0.36, 0.305);
  k.add(cyl(0.08, 0.08, 2.2, 8), MAT.iron(), -0.22, 1.9, -0.18);
  k.add(cyl(0.18, 0.18, 0.18, 12), MAT.copper(), 0.18, 0.9, 0.05);
  return { hw: 0.42, hd: 0.32, top: 0.85 };
}
// the rack of miners' lamps on the wall (most hooks empty: the lamps went up with the ore)
function lampRack(k) {
  k.add(rbox(1.6, 0.12, 0.12, 0.02), timber(), 0, 1.9, 0);
  for (let i = 0; i < 6; i++) {
    k.add(cyl(0.012, 0.012, 0.14, 4), MAT.iron(), -0.65 + i * 0.26, 1.78, 0.08);
    if (i === 1 || i === 4) { k.add(cyl(0.07, 0.07, 0.16, 8), MAT.glass('#d8c8a0', 0.5), -0.65 + i * 0.26, 1.62, 0.08); k.add(cyl(0.05, 0.07, 0.04, 8), MAT.iron(), -0.65 + i * 0.26, 1.72, 0.08); }
  }
  return null;
}
// the oil jar: a tall clay jar with a wooden stopper and a tin funnel hung on it
function oilJar(k) {
  k.add(cyl(0.16, 0.24, 0.6, 12), MAT.paint('#8a5a3a', 0.7), 0, 0.3, 0);
  k.add(cyl(0.1, 0.16, 0.12, 12), MAT.paint('#8a5a3a', 0.7), 0, 0.66, 0);
  k.add(cyl(0.07, 0.07, 0.08, 8), MAT.wood('honey'), 0, 0.76, 0);
  k.add(cyl(0.08, 0.02, 0.14, 8, true), MAT.steel(), 0.2, 0.6, 0, 0, { rz: 0.5 });
  return { r: 0.26, top: 0.8 };
}
// an ore cart on its wheels
function oreCart(k, ore = true) {
  k.add(rbox(1.0, 0.6, 1.4, 0.05), rust(), 0, 0.55, 0);
  for (const z of [-0.45, 0.45]) k.add(cyl(0.16, 0.16, 1.2, 10), MAT.iron(), 0, 0.18, z, 0, { rz: Math.PI / 2 });
  if (ore) for (const [x, z, r] of [[-0.2, -0.3, 0.24], [0.22, 0.1, 0.22], [0, 0.4, 0.2], [-0.15, 0.2, 0.18]]) k.add(rockGeo(Math.floor(x * 10 + z * 20 + 40) % 16, { detail: 0 }), rockMat('#7a8aa0'), x, 0.82, z, x * 3, { sx: r, sy: r * 0.8, sz: r });
  return { hw: 0.55, hd: 0.75, top: 1.0 };
}
// a strongbox: iron-bound timber, its lid a pivot (WM.blow.setBox)
function strongbox(k) {
  k.add(rbox(0.9, 0.5, 0.6, 0.03), MAT.wood('dark'), 0, 0.25, 0);
  for (const x of [-0.3, 0.3]) k.add(rbox(0.06, 0.52, 0.62, 0.01), MAT.iron(), x, 0.26, 0);
  return { hw: 0.46, hd: 0.32, top: 0.55 };
}

// ---------------------------------------------------------------- the cave round a room
// rock walls along the far sides (back: z = -D/2, left: x = -W/2) with masses bedded in them, timber sets in front,
// openings left where tunnels go; the near rims low rock; colliders along the walls' feet. o.open: [{ side, at, w, h, y }]
function caveShell(B, { W, D, H, open = [], seed = 1 }) {
  const k = B.k, crock = rock(), cf = floorM(), RX = W / 2, RZ = D / 2, T = 0.6;
  (B.room.bounds ??= []).push({ x0: B.cx - RX, x1: B.cx + RX, z0: B.cz - RZ, z1: B.cz + RZ });
  // the floor (a grid, so the room's light has points), its collider, the section under it past the near rims
  { const g = new THREE.PlaneGeometry(W, D, Math.round(W / 1.5), Math.round(D / 1.5)); g.rotateX(-Math.PI / 2); k.add(g, cf, 0, 0, 0); }
  B.col(0, 0, RX, RZ, 0, { seeThrough: true, bottom: -1 });
  k.add(new THREE.BoxGeometry(W + 2 * T, 0.8, D + 2 * T), crock, 0, -0.42, 0);
  const gaps = (side) => open.filter((o) => o.side === side);
  const inGap = (side, s, y) => gaps(side).some((o) => Math.abs(s - o.at) < o.w / 2 + 0.15 && y < (o.y || 0) + o.h + 0.2 && y > (o.y || 0) - 0.4);
  // the backing walls (boxes) with their openings cut as runs
  const run = (side) => {
    // (FLICKER-142: each wall's near end 1 cm short of the rim's outer face, which it lay in)
    const L = side === 'back' ? W : D, s0 = side === 'back' ? -RX - T : -RZ, s1 = (side === 'back' ? RX + T : RZ + T) - 0.01;
    const cuts = gaps(side).map((o) => [o.at - o.w / 2, o.at + o.w / 2, o]).sort((a, b) => a[0] - b[0]);
    let a = s0;
    const box = (p, q, y0, y1) => {
      if (q - p < 0.02 || y1 - y0 < 0.02) return;
      if (side === 'back') k.add(new THREE.BoxGeometry(q - p, y1 - y0, T), crock, (p + q) / 2, (y0 + y1) / 2, -RZ - T / 2);
      else k.add(new THREE.BoxGeometry(T, y1 - y0, q - p), crock, -RX - T / 2, (y0 + y1) / 2, (p + q) / 2);
    };
    for (const [p, q, o] of cuts) { box(a, p, 0, H); box(p, q, (o.y || 0) + o.h, H); if (o.y) box(p, q, 0, o.y); a = q; }
    box(a, s1, 0, H);
    void L;
  };
  run('back'); run('left');
  // rock masses bedded in the walls in rough courses, kept out of the openings
  for (const side of ['back', 'left']) {
    const s0 = side === 'back' ? -RX : -RZ, s1 = side === 'back' ? RX : RZ;
    for (let t = 0; t < 3; t++) {
      for (let s = s0 + 0.3 + hash(t, side.length, seed) * 0.6, i = 0; s < s1 - 0.2; s += 1.0 + hash(i, t, seed + 3) * 0.9, i++) {
        const h = (n) => hash(i * 7 + n, t * 13, seed + side.length);
        const y = t * (H / 3) * 0.95 + (t ? -0.2 : 0), sx = 0.6 + h(1) * 0.5, sy = 0.55 + h(2) * 0.5 + t * 0.15, sz = 0.35 + h(3) * 0.3;
        if (inGap(side, s, y) || inGap(side, s - sx * 0.8, y) || inGap(side, s + sx * 0.8, y)) continue;
        const reach = (t === 0 ? 0.28 : 0.5 + t * 0.15) * (0.7 + h(4) * 0.3);
        if (side === 'back') k.add(rockGeo(Math.floor(h(5) * 40)), crock, s, y, -RZ + reach - sz, (h(6) - 0.5) * 0.8, { sx, sy, sz });
        else k.add(rockGeo(Math.floor(h(5) * 40)), crock, -RX + reach - sz, y, s, Math.PI / 2 + (h(6) - 0.5) * 0.8, { sx: sz, sy, sz: sx });
      }
    }
  }
  // the near rims: low rock with stones (the cut-away's edge)
  const rh = 0.5;
  k.add(new THREE.BoxGeometry(W + 2 * T, rh, T), cf, 0, rh / 2, RZ + T / 2);
  k.add(new THREE.BoxGeometry(T, rh, D + T), cf, RX + T / 2, rh / 2, -T / 2);
  for (let x = -RX - T + 0.4, i = 0; x < RX + T; x += 0.9 + hash(i, 2, seed) * 0.7, i++) k.add(rockGeo(i % 12, { detail: 0 }), crock, x, 0.1, RZ + T * 0.45, hash(i, 3, seed) * 6, { sx: 0.45 + hash(i, 4, seed) * 0.3, sy: 0.32 + hash(i, 5, seed) * 0.2, sz: T * 0.6 });
  for (let z = -RZ - T + 0.4, i = 0; z < RZ; z += 0.9 + hash(i, 6, seed) * 0.7, i++) k.add(rockGeo((i + 5) % 12, { detail: 0 }), crock, RX + T * 0.45, 0.1, z, hash(i, 7, seed) * 6, { sx: T * 0.6, sy: 0.32 + hash(i, 8, seed) * 0.2, sz: 0.45 + hash(i, 9, seed) * 0.3 });
  // the colliders: strips along the far walls' feet (cut at the openings), the near rims
  const strip = (side, p, q) => { if (q - p < 0.05) return; if (side === 'back') B.col((p + q) / 2, -RZ + 0.15, (q - p) / 2, 0.45, H, { noStand: true }); else B.col(-RX + 0.15, (p + q) / 2, 0.45, (q - p) / 2, H, { noStand: true }); };
  for (const side of ['back', 'left']) {
    const s0 = side === 'back' ? -RX : -RZ, s1 = side === 'back' ? RX : RZ;
    let a = s0;
    for (const o of gaps(side).sort((p, q) => p.at - q.at)) { strip(side, a, o.at - o.w / 2); a = o.at + o.w / 2; }
    strip(side, a, s1);
  }
  B.col(0, RZ + 0.3, RX + T, 0.32, 1.2, { noStand: true, seeThrough: true });
  B.col(RX + 0.3, 0, 0.32, RZ + T, 1.2, { noStand: true, seeThrough: true });
  // pebbles on the floor near the walls (small enough to walk over)
  for (let i = 0, n = 0; i < 90 && n < 30; i++) {
    const edge = hash(i, 11, seed) < 0.5, x = edge ? -RX + 0.5 + hash(i, 12, seed) * 1.2 : -RX + hash(i, 13, seed) * W, z = edge ? -RZ + hash(i, 14, seed) * D : -RZ + 0.5 + hash(i, 15, seed) * 1.2;
    if (open.some((o) => (o.side === 'back' ? Math.abs(x - o.at) < o.w / 2 + 0.8 && z < -RZ + 2 : Math.abs(z - o.at) < o.w / 2 + 0.8 && x < -RX + 2))) continue;
    const s = 0.06 + hash(i, 16, seed) ** 2 * 0.2;
    k.add(rockGeo(Math.floor(hash(i, 17, seed) * 30), { detail: 0 }), crock, x, -0.01, z, hash(i, 18, seed) * 6, { sx: s * 1.4, sy: s * 0.7, sz: s }); n++;
  }
  return { RX, RZ, crock, cf };
}
// a timbered tunnel mouth in a far wall: posts, a cap, a dark depth (local side 'back' | 'left', at, w, h, y floor)
function tunnelMouth(B, side, at, { w = 2.2, h = 2.6, y = 0, glow = null } = {}) {
  const k = B.k, RX = B.W / 2, RZ = B.D / 2;
  const put = (fn) => (side === 'back' ? k.at(at, y, -RZ, 0, fn) : k.at(-RX, y, at, Math.PI / 2, fn));
  put(() => {
    for (const s of [-1, 1]) k.add(rbox(0.28, h + 0.1, 0.3, 0.03), timber(), s * (w / 2 + 0.1), (h + 0.1) / 2, 0.1);
    k.add(rbox(w + 0.75, 0.32, 0.36, 0.03), timber(), 0, h + 0.2, 0.1);
    k.add(plane(w, h), glow ? MAT.glow(glow[0], glow[1], glow[2] ?? 0.5) : dark(), 0, h / 2, -0.55);
    for (const s of [-1, 1]) k.add(rbox(0.1, h, 0.7, 0.01), dark(), s * w / 2, h / 2, -0.25);
    k.add(rbox(w, 0.1, 0.7, 0.01), dark(), 0, h, -0.25);
    if (!y) for (let i = 0; i < 3; i++) k.add(rbox(w - 0.2, 0.06, 0.16, 0.01), plank(), 0, 0.03, -0.1 - i * 0.22);
  });
}
const gemVein = (k, mats, x, y, z, heading, s, seed) => crystalCluster(k, mats.shell, mats.core, x, y, z, { n: 5, s, heading, spread: 1.0, lean: 0.5, seed });

// ================================================================== the deep landing
function buildLanding(scene, physics) {
  const at = WM_AT.wm_landing, B = new RoomBuilder(scene, physics, 'wm_landing', at.x, at.z);
  const R = B.room, k = B.k;
  const W = 18, D = 14, H = 6;
  B.W = W; B.D = D;
  R.view = 13.5; R.follow = 0.7; R.music = 'cave'; R.cave = true; R.surface = 'stone';
  R.indoor = { sunDir: [0.42, 0.78, 0.46], sun: 0.7, hemi: 0.95 };   // (second round: 0.45 / 0.7, too dark in the play camera)
  const TUN = 3.6;   // (the tunnel to the gallery: the left wall at z 3.6)
  caveShell(B, { W, D, H, open: [{ side: 'left', at: TUN, w: 2.2, h: 2.6 }], seed: 3 });
  tunnelMouth(B, 'left', TUN, { w: 2.2, h: 2.6 });
  R.exits.push({ ...B.world(-W / 2 + 0.35, TUN), r: 0.7, room: 'wm_gallery' });
  // ---- the cage's shaft in the back-left corner: four guides up out of sight, the cage on them (a group: it comes down)
  const CX = -6.0, CZ = -4.0, CW = 2.4;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.add(rbox(0.22, H + 0.5, 0.22, 0.03), timber(), CX + sx * (CW / 2 + 0.15), (H + 0.5) / 2, CZ + sz * (CW / 2 + 0.15));
  for (const y of [2.6, 4.6]) for (const sz of [-1, 1]) k.add(rbox(CW + 0.5, 0.16, 0.16, 0.02), timber(), CX, y, CZ + sz * (CW / 2 + 0.15));
  k.add(rbox(CW + 0.3, 0.08, CW + 0.3, 0.01), dark(), CX, 0.01, CZ);   // (the shaft's sump under the cage)
  const cage = new THREE.Group(); cage.position.set(CX, 0, CZ); B.group.add(cage);
  {
    const ck = new (k.constructor)(cage);
    ck.add(rbox(CW, 0.14, CW, 0.02), plank(), 0, 0.07, 0);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) ck.add(cyl(0.04, 0.04, 2.1, 6), MAT.brass(), sx * (CW / 2 - 0.05), 1.12, sz * (CW / 2 - 0.05));
    for (const y of [0.9, 1.8]) { ck.add(rbox(CW, 0.05, 0.05, 0.01), MAT.brass(), 0, y, -CW / 2 + 0.05); for (const sx of [-1, 1]) ck.add(rbox(0.05, 0.05, CW, 0.01), MAT.brass(), sx * (CW / 2 - 0.05), y, 0); }
    ck.add(rbox(CW + 0.1, 0.1, CW + 0.1, 0.02), MAT.brass(), 0, 2.18, 0);
    ck.add(cyl(0.025, 0.025, 6, 4), MAT.iron(), 0, 5.2, 0);
    ck.add(plane(1.3, 0.48), MAT.map(signTex(['ORE ONLY', 'NO PASSENGERS'], { size: 44, h: 160 }), 0.7), 0, 1.4, -CW / 2 + 0.1);
    ck.flush();
  }
  // its bars: the back and the two sides (the front, toward the camp, is its gate: open)
  B.col(CX, CZ - CW / 2, CW / 2 + 0.1, 0.1, 2.2, { noStand: true, seeThrough: true });
  for (const s of [-1, 1]) B.col(CX + s * CW / 2, CZ, 0.1, CW / 2, 2.2, { noStand: true, seeThrough: true });
  const deck = B.col(CX, CZ, CW / 2 - 0.1, CW / 2 - 0.1, 0.14, { seeThrough: true });
  // the lever on its post at the cage's front right; a bell pull
  const LX = CX + CW / 2 + 0.75, LZ = CZ + CW / 2 + 0.25;
  k.add(rbox(0.3, 0.1, 0.3, 0.02), rust(), LX, 0.05, LZ); k.add(rbox(0.14, 1.0, 0.14, 0.02), rust(), LX, 0.5, LZ);
  const arm = new THREE.Group(); arm.position.set(LX, 1.0, LZ); B.group.add(arm);
  { const am = new THREE.Mesh(cyl(0.03, 0.03, 0.7, 6), MAT.brass()); am.position.y = 0.35; arm.add(am); const kn = new THREE.Mesh(sphere(0.07, 8, 6), MAT.paint('#b8302a', 0.5)); kn.position.y = 0.72; arm.add(kn); arm.rotation.x = -0.6; }
  B.ccol(LX, LZ, 0.2, 1.1);
  // ---- the project's crates stacked by the cage, stencilled
  const stM = MAT.map(stencilTex(['PROJECT', 'GEMS · DEEP']), 0.85, { transparent: true });
  for (const [x, z, y, ry] of [[-2.6, -5.9, 0, 0.1], [-1.5, -5.95, 0, -0.05], [-2.05, -5.9, 0.62, 0.2], [-3.7, -6.0, 0, 0]]) {
    B.put(x, z, ry, (kk) => { const r = crate(kk, 0.62, { pal: 'pale' }); kk.add(plane(0.5, 0.25), stM, 0, 0.36, 0.315); return r; }, { y });
  }
  // ---- the camp: the stove against the back wall, bedrolls, a crate table, the lamp rack, Marl's oil jar
  const ember = M('wm_ember', () => new THREE.MeshStandardMaterial({ color: '#3a1a0a', emissive: '#c85a1a', emissiveIntensity: 0.9 }));
  B.put(5.0, -6.1, 0, (kk) => stove(kk, ember));
  B.put(6.9, -0.8, 0.1, (kk) => bedroll(kk, '#6a4a7a')); B.put(7.2, 2.0, -0.15, (kk) => bedroll(kk, '#3a6a6a')); B.put(4.6, 4.3, Math.PI / 2 + 0.1, (kk) => bedroll(kk, '#7a5a3a'));
  B.put(3.2, -1.2, 0.2, (kk) => { const r = crate(kk, 0.7, { pal: 'honey' }); jar(kk, -0.12, 0.7, 0.1, 'urn', '#c8b898', 0.7); jar(kk, 0.15, 0.7, -0.08, 'jar', '#7a8a9a', 0.6); return r; });
  for (const [x, z] of [[2.2, -1.6], [4.0, -0.2], [3.0, 0.2]]) B.put(x, z, 0, (kk) => { kk.add(cyl(0.2, 0.22, 0.42, 10), MAT.wood('honey'), 0, 0.21, 0); return { r: 0.22, top: 0.42 }; });
  k.at(2.6, 0, -6.9, 0, () => lampRack(k));
  B.put(1.2, -6.0, 0, (kk) => oilJar(kk));
  B.put(7.4, -5.8, 0.4, (kk) => barrel(kk, { pal: 'dark' }));
  B.put(-0.2, 5.6, 0.3, (kk) => oreCart(kk, false));
  for (const x of [-1.0, 3.2, 7.0]) k.at(x, 0, -6.75, 0, () => timberSet(k, 2.0, 3.2));
  for (const z of [-1.0]) k.at(-8.4, 0, z, Math.PI / 2, () => timberSet(k, 2.0, 3.2));   // (OVERLAP-SWEEP: clear of the wall's rock)
  // rails from the cage to the tunnel
  for (const sx of [-0.45, 0.45]) k.add(rbox(0.06, 0.08, 8.0, 0.01), rust(), -6.0 + sx, 0.04, 0.4 + 0, 0);
  for (let i = 0; i < 10; i++) k.add(rbox(1.3, 0.06, 0.18, 0.01), plank(), -6.0, 0.02, -2.2 + i * 0.6 + 0.6);
  // gems in the left wall (the deep seam starts here)
  const vio = crystalMats('violet', { rockSet: true }), cy = crystalMats('cyan', { rockSet: true });
  gemVein(k, vio, -8.6, 1.4, -5.6, Math.PI / 2, 0.45, 3); gemVein(k, cy, -8.7, 2.6, 0.6, Math.PI / 2, 0.35, 7); gemVein(k, vio, 0.8, 2.2, -6.75, 0, 0.4, 11);
  // ---- light: the stove's low glow, the camp's one lamp, the cage's work light, the gems' cold glint
  const stoveL = B.light('#ff9a4a', 3.2, 9, 5.0, 1.2, -5.0);
  B.light('#ffd8a0', 3.6, 13, 4.2, 3.4, 1.4);
  B.light('#e8e0c8', 3.2, 12, -5.0, 4.2, -2.0);
  B.light('#b8a8ff', 1.4, 7, -7.4, 2.0, -3.0);
  // (second round) the bulbs on the back timbers and the left one, a lantern on the cage's guide; their pools, the camp's
  // warm pool round the stove and the bedrolls, the cage's work light on the rails
  for (const x of [-1.0, 3.2, 7.0]) hangBulb(B, x, 3.3, -6.35, 0.45);
  hangBulb(B, -8.0, 3.3, -1.0, 0.45);
  hangBulb(B, CX + CW / 2 + 0.15, 2.5, CZ + CW / 2 + 0.3, 0.3);
  const warmP = poolMat('#ffb060', 0.34), workP = poolMat('#ffe0b0', 0.26);
  for (const x of [-1.0, 3.2, 7.0]) floorPool(B, x, -5.0, 2.4, warmP);
  floorPool(B, -6.9, -1.0, 2.2, warmP);
  floorPool(B, 5.0, 0.2, 4.2, warmP);
  floorPool(B, CX + 0.6, CZ + 3.2, 3.0, workP);
  floorPool(B, -7.2, TUN, 1.8, workP);
  B.light('#ffc890', 3.0, 11, 1.0, 2.8, -5.2);
  B.finish();
  const spots = { gant: { ...B.world(5.0, -4.9), a: 0.25 }, tull: { ...B.world(6.3, 0.8), a: -1.9 }, marl: { ...B.world(2.0, -5.3), a: Math.PI * 0.1 } };
  R.npcSpots = spots;
  R.spawn = { ...B.world(CX, CZ + 0.3), a: 0.3 };
  R.entries = { wm_gallery: { ...B.world(-W / 2 + 1.5, TUN), a: Math.PI / 2 }, cage: R.spawn };
  const L = {
    cage: { ...B.world(CX, CZ + 0.3), a: 0.3 }, lever: B.world(LX, LZ), crates: B.world(-2.4, -5.0), oil: B.world(1.2, -6.0), stove: B.world(5.0, -6.1), rack: B.world(2.6, -6.6), spots,
    cageY: 0,
    setCage(y) { this.cageY = Math.max(0, y); cage.position.y = this.cageY; deck.top = 0.14 + this.cageY; },
    setLever(on) { arm.rotation.x = on ? 0.6 : -0.6; },
    stoveLight: stoveL, ember,
  };
  WM.landing = L;
  return R;
}

// ================================================================== the deep seam (the gallery)
const BULK_X = -9.0, INC = { x0: -10.8, x1: -15.8, top: 3.0, n: 10 };
function buildGallery(scene, physics) {
  const at = WM_AT.wm_gallery, B = new RoomBuilder(scene, physics, 'wm_gallery', at.x, at.z);
  const R = B.room, k = B.k;
  const W = 36, D = 12, H = 6.5, RX = W / 2;
  B.W = W; B.D = D;
  R.view = 15; R.follow = 0.85; R.music = 'cave'; R.cave = true; R.surface = 'stone';
  R.indoor = { sunDir: [0.42, 0.78, 0.46], sun: 0.62, hemi: 0.85 };   // (second round: 0.4 / 0.65 read black before the lamps)
  const LAND = 14.5, BLOW = -1.5, MOUTH_Z = -0.5;
  caveShell(B, { W, D, H, open: [{ side: 'back', at: LAND, w: 2.2, h: 2.6 }, { side: 'back', at: BLOW, w: 2.0, h: 2.4 }, { side: 'left', at: MOUTH_Z, w: 2.2, h: 2.6, y: INC.top }], seed: 5 });
  tunnelMouth(B, 'back', LAND, { w: 2.2, h: 2.6 });
  tunnelMouth(B, 'back', BLOW, { w: 2.0, h: 2.4, glow: ['#3a2210', '#c86a1a', 0.55] });
  tunnelMouth(B, 'left', MOUTH_Z, { w: 2.2, h: 2.6, y: INC.top, glow: ['#c8b8a0', '#e8c890', 0.7] });
  R.exits.push({ ...B.world(LAND, -D / 2 + 0.35), r: 0.7, room: 'wm_landing' });
  R.exits.push({ ...B.world(BLOW, -D / 2 + 0.35), r: 0.65, room: 'wm_blow' });
  R.exits.push({ ...B.world(-RX + 0.35, MOUTH_Z), r: 0.7, y: INC.top, to: 'wm-out' });   // (up on the incline's landing only)
  // the warning board by the Blow's way: THE BLOW · NO LAMPS (striped)
  k.at(BLOW + 2.0, 0, -D / 2 + 0.45, 0, () => {
    k.add(rbox(0.1, 2.0, 0.1, 0.01), timber(), 0, 1.0, 0);
    k.add(rbox(1.3, 0.62, 0.06, 0.01), MAT.wood('honey'), 0, 1.75, 0.06);
    k.add(plane(1.2, 0.54), MAT.map(signTex(['THE BLOW', 'NO LAMPS'], { stripes: true, size: 46 }), 0.7), 0, 1.75, 0.102);   // (FLICKER-142: 1.2 cm off its board, not 5 mm)
  });
  B.ccol(BLOW + 2.0, -D / 2 + 0.45, 0.15, 2.0);
  // ---- rails along the gallery (z 1.0) from the landing's tunnel to the bulkhead, an ore cart, timber sets
  for (const sx of [-0.45, 0.45]) k.add(rbox(26, 0.08, 0.06, 0.01), rust(), 4.0, 0.04, 1.0 + sx);
  for (let x = -8.2; x < 17; x += 0.62) k.add(rbox(0.18, 0.06, 1.3, 0.01), plank(), x, 0.02, 1.0);
  B.put(8.6, 1.0, Math.PI / 2, (kk) => oreCart(kk, true));
  for (const x of [-6.8, -2.6 + 4.2, 5.5, 9.6, 12.2, 16.4]) if (Math.abs(x - BLOW) > 2 && Math.abs(x - LAND) > 2) k.at(x, 0, -D / 2 + 0.25, 0, () => timberSet(k, 2.0, 3.4));
  for (const [x, z] of [[3.4, 4.6], [-4.6, 4.9], [13.8, 4.4]]) B.put(x, z, x, (kk) => { kk.add(rockGeo(Math.floor(Math.abs(x) * 3) % 16), rock(), 0, 0, 0, x, { sx: 0.7, sy: 0.45, sz: 0.6 }); return { r: 0.55, top: 0.45 }; });
  B.put(15.6, 4.6, 0.3, (kk) => barrel(kk, { pal: 'dark' }));
  B.put(6.8, -4.9, 0.2, (kk) => crate(kk, 0.6, { pal: 'pale' }));
  // ---- the seam: gems in the back wall between the posts
  const vio = crystalMats('violet', { rockSet: true }), cy = crystalMats('cyan', { rockSet: true }), vein = crystalMats('vein', { rockSet: true });
  for (const [x, y, s, m, sd] of [[11.0, 1.6, 0.45, vio, 13], [7.2, 2.6, 0.38, cy, 17], [3.6, 1.2, 0.5, vein, 19], [0.6, 2.8, 0.35, vio, 23], [-4.4, 1.8, 0.45, cy, 29], [-7.4, 2.9, 0.32, vio, 31], [15.8, 2.4, 0.4, cy, 37]]) gemVein(k, m, x, y, -D / 2 + 0.55, 0, s, sd);
  // ---- three lamp posts by the back wall (dark until lit)
  const POSTS = [[10.4, -4.4], [2.2, -4.4], [-7.0, -4.2]], posts = [], lamps = [];
  POSTS.forEach(([x, z], i) => {
    const glass = new THREE.MeshStandardMaterial({ color: '#3a342a', emissive: '#000000', emissiveIntensity: 1.6, roughness: 0.3, transparent: true, opacity: 0.85 });
    glass.userData.noShadow = true;
    B.put(x, z, 0, (kk) => lampPost(kk, glass));
    const l = B.light('#ffcf8a', 0, 13, x + 0.52, 2.2, z + 0.3);
    // (second round) its pool on the floor: faint while it is dark, a warm round of light once lit (setLamp), and a halo
    const pm = poolMat('#ffc070', 0.05); floorPool(B, x + 0.6, z + 2.0, 3.4, pm);
    const halo = glowSprite('#ffc070', 1.5, 0); halo.position.set(x + 0.52, 2.06, z); B.group.add(halo);
    lamps.push({ glass, l, pm, halo }); posts.push({ ...B.world(x + 0.2, z + 0.9), y: 0 });
  });
  // a dim cold light from the gems, the landing's tunnel and the Blow's way (amber), so the dark gallery still reads
  B.light('#9a8aff', 1.5, 12, 6.0, 2.4, -3.2);
  B.light('#e8c890', 1.2, 8, LAND, 2.0, -4.2);
  B.light('#ff8a3a', 1.6, 7, BLOW, 1.4, -4.6);
  B.light('#d8c8a8', 4.0, 10, -16.4, INC.top + 2.4, MOUTH_Z);
  // (second round) the landing's end is the camp's side: two bulbs always lit there, their pools; the Blow's way glows
  // amber on the floor; the incline's head: a bulb on the timber over the mouth and the daylight in from it
  hangBulb(B, 16.4, 3.5, -D / 2 + 0.55, 0.4); hangBulb(B, 12.2, 3.5, -D / 2 + 0.55, 0.4);
  const warmP = poolMat('#ffb060', 0.3);
  floorPool(B, 16.0, -3.4, 2.8, warmP); floorPool(B, 12.2, -3.6, 2.4, warmP);
  floorPool(B, LAND, -3.0, 2.2, poolMat('#ffe0b0', 0.22));
  floorPool(B, BLOW, -4.2, 2.0, poolMat('#ff8a3a', 0.3));
  hangBulb(B, -RX + 1.2, INC.top + 3.0, MOUTH_Z - 1.6, 0.4);
  floorPool(B, -17.0, MOUTH_Z - 0.4, 1.1, poolMat('#ffe8c0', 0.4), INC.top);   // (on the landing only: it does not hang over the steps)
  floorPool(B, -17.0, -3.4, 1.1, poolMat('#ffe8c0', 0.26), INC.top);
  B.light('#ffd8a0', 3.0, 9, 15.0, 3.0, -3.0);
  // ---- the old incline: timber steps from the floor up to the mouth's landing at the west end
  const IZ0 = -4.0, IZ1 = 3.0, run = (INC.x0 - INC.x1) / INC.n;
  for (let i = 0; i < INC.n; i++) {
    const tp = INC.top * (i + 1) / (INC.n + 1), x = INC.x0 - (i + 0.5) * run;
    k.add(rbox(run + 0.02, tp, IZ1 - IZ0, 0.015), rock(), x, tp / 2, (IZ0 + IZ1) / 2);
    k.add(rbox(0.14, 0.05, IZ1 - IZ0 - 0.2, 0.01), timber(), x + run / 2 - 0.08, tp + 0.02, (IZ0 + IZ1) / 2);
    B.col(x, (IZ0 + IZ1) / 2, run / 2 + 0.12, (IZ1 - IZ0) / 2, tp, { stair: true });
  }
  const LX0 = INC.x1, LX1 = -RX;   // the landing at the top
  k.add(rbox(LX0 - LX1, INC.top, D, 0.02), rock(), (LX0 + LX1) / 2, INC.top / 2, 0);
  B.col((LX0 + LX1) / 2, 0, (LX0 - LX1) / 2, D / 2, INC.top);
  // the incline's sides: rock shoulders (the steps' width only), a rail on the camera's side
  B.col((INC.x0 + INC.x1) / 2, IZ1 + 0.25, (INC.x0 - INC.x1) / 2 + 0.2, 0.25, INC.top + 1.2, { noStand: true, seeThrough: true });
  B.col((INC.x0 + INC.x1) / 2, IZ0 - 1.0, (INC.x0 - INC.x1) / 2 + 0.2, 1.0, INC.top + 1.2, { noStand: true });
  k.add(rbox(INC.x0 - INC.x1, INC.top * 0.6, 2.0, 0.05), rock(), (INC.x0 + INC.x1) / 2, INC.top * 0.3, IZ0 - 1.0);
  for (let i = 0; i <= 5; i++) { const x = INC.x0 - i * (INC.x0 - INC.x1) / 5, y = INC.top * (i / 5) * 0.92; k.add(rbox(0.1, 1.0, 0.1, 0.01), timber(), x, y + 0.5, IZ1 + 0.25); }
  // (second round) a lantern on the rail half way up: an iron rod up the post, an arm along the rail, a bulb under it
  // (over the rail, out of the way up)
  { const x = INC.x0 - 3 * (INC.x0 - INC.x1) / 5, y = INC.top * 0.6 * 0.92 + 1.0, z = IZ1 + 0.25;
    k.add(rbox(0.04, 0.8, 0.04, 0.01), MAT.iron(), x + 0.07, y + 0.4, z);
    k.add(rbox(0.36, 0.04, 0.04, 0.01), MAT.iron(), x + 0.23, y + 0.78, z);
    hangBulb(B, x + 0.38, y + 0.76, z, 0.1);
    B.light('#ffc890', 3.2, 9, x, y + 0.6, IZ1 - 1.5); }
  { const len = Math.hypot(INC.x0 - INC.x1, INC.top), ang = Math.atan2(INC.top, INC.x0 - INC.x1); k.add(rbox(len, 0.08, 0.08, 0.01), timber(), (INC.x0 + INC.x1) / 2, INC.top / 2 + 0.95, IZ1 + 0.25, 0, { rz: -ang }); }
  k.add(rbox(LX0 - LX1, 0.08, 0.08, 0.01), timber(), (LX0 + LX1) / 2, INC.top + 0.95, IZ1 + 0.25);
  // ---- the project's bulkhead across the gallery at the incline's foot: timber planks on posts, stencilled both
  // sides, two wedges at its east foot; rubble packed behind it (a group: WM.gallery.setBulk tips it into the sump)
  const bulk = new THREE.Group(); bulk.position.set(BULK_X, 0, 0); B.group.add(bulk);
  const bk = new (k.constructor)(bulk);
  for (let i = 0; i < 6; i++) bk.add(rbox(0.16, 0.46, D - 0.4, 0.02), plank(), 0, 0.26 + i * 0.47, 0, 0, { rx: (hash(i, 1, 9) - 0.5) * 0.02 });
  for (const z of [-4.4, -1.4, 1.6, 4.4]) bk.add(rbox(0.26, 3.0, 0.26, 0.03), timber(), -0.18, 1.5, z);   // (its posts behind: the stencil reads from the gallery)
  const bulkTex = MAT.map(stencilTex(['CLOSED', 'ORE BY LIFT ONLY', 'PROJECT'], '#f0e4c8', 52), 0.8, { transparent: true });
  bk.add(plane(3.4, 1.5), bulkTex, 0.1, 1.6, 0, Math.PI / 2);
  bk.add(plane(2.6, 1.15), bulkTex, -0.33, 1.6, 0.1, -Math.PI / 2);
  bk.flush();
  // (OVERLAP-SWEEP: the packed rubble kept between the boards' posts and the incline's first step)
  const rubble = new THREE.Group(); rubble.position.set(BULK_X - 1.0, 0, 0); B.group.add(rubble);
  { const rk2 = new (k.constructor)(rubble); for (let i = 0; i < 16; i++) rk2.add(rockGeo(i % 16), rock(), (hash(i, 2, 4) - 0.5) * 0.2, 0, -5.2 + i * 0.68, hash(i, 4, 4) * 6, { sx: 0.3 + hash(i, 5, 4) * 0.1, sy: 0.8 + hash(i, 6, 4) * 0.6, sz: 0.42 }); rk2.flush(); }
  const wedges = [], wedgeMesh = [];
  for (const z of [-2.6, 2.4]) {
    const wg = new THREE.Group(); wg.position.set(BULK_X + 0.55, 0, z); B.group.add(wg);
    const wm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.32, 0.9, 3, 1).rotateZ(Math.PI / 2).rotateX(Math.PI / 6), MAT.wood('honey'));
    wm.position.set(0.25, 0.14, 0); wm.castShadow = true; wg.add(wm);   // (OVERLAP-SWEEP: its foot on the floor)
    wedges.push({ ...B.world(BULK_X + 0.7, z), y: 0.25 }); wedgeMesh.push(wg);
  }
  const bulkCol = B.col(BULK_X, 0, 0.35, D / 2, 3.6, { noStand: true });
  const rubbleCol = B.col(BULK_X - 1.2, 0, 0.9, D / 2, 2.0, { noStand: true });
  const wedgeCols = wedges.map((w) => B.ccol(w.x - B.cx, w.z - B.cz, 0.32, 0.5, { noStand: true }));
  // what is left when it is down: the planks thrown into the sump at the foot (shown then), the way up clear
  const sump = new THREE.Group(); sump.visible = false; B.group.add(sump);
  { const sk = new (k.constructor)(sump); for (let i = 0; i < 6; i++) sk.add(rbox(0.16, 0.46, 3.2, 0.02), plank(), BULK_X + 0.2 + hash(i, 7, 2) * 0.6, 0.12 + i * 0.03, -4.8 + i * 0.15, 0.3 + hash(i, 8, 2), { rx: Math.PI / 2 - 0.2 }); sk.flush(); }
  B.finish();
  R.spawn = { ...B.world(LAND, -D / 2 + 1.6), a: 0 };
  R.entries = { wm_landing: R.spawn, wm_blow: { ...B.world(BLOW, -D / 2 + 1.5), a: 0 } };
  const G = {
    posts, lamps, wedges, bulk: B.world(BULK_X + 0.9, 0), back: { ...B.world(BULK_X - 3.0, 0), y: INC.top }, mouth: B.world(-RX + 0.35, MOUTH_Z),
    mouthIn: { ...B.world(-RX + 1.6, MOUTH_Z), a: Math.PI / 2 }, blowDoor: B.world(BLOW, -D / 2 + 0.35), sign: B.world(BLOW + 2.0, -D / 2 + 0.9),
    landTop: { x: B.cx + (INC.x1 - 1.0), z: B.cz + MOUTH_Z, y: INC.top },
    setLamp(i, on) { const L = lamps[i]; if (!L) return; L.glass.color.set(on ? '#ffe6b0' : '#3a342a'); L.glass.emissive.set(on ? '#ffb050' : '#000000'); L.l.userData.base = on ? 5.2 : 0; L.l.intensity = R.group.visible ? L.l.userData.base : 0; L.pm.opacity = on ? 0.42 : 0.05; L.halo.material.opacity = on ? 0.6 : 0; },
    setWedge(i, out) { const wg = wedgeMesh[i]; if (!wg) return; wg.visible = !out; wedgeCols[i].enabled = !out; },
    // 'shut', 'falling' (k 0…1: tipped back into the sump), 'open'
    setBulk(state, kk = 1) {
      const fall = state === 'open' ? 1 : state === 'falling' ? kk : 0;
      bulk.visible = state !== 'open'; bulk.rotation.z = fall * 1.35; bulk.position.y = -fall * 1.2;
      rubble.visible = state !== 'open'; rubble.position.y = -fall * 2.2;
      sump.visible = state === 'open';
      bulkCol.enabled = rubbleCol.enabled = state === 'shut';
      for (let i = 0; i < 2; i++) if (state !== 'shut') G.setWedge(i, true);
    },
  };
  WM.gallery = G;
  R.npcSpots = { marl: { ...B.world(1.0, -3.4), a: 0.3 } };
  return R;
}

// ================================================================== the Blow
function buildBlow(scene, physics) {
  const at = WM_AT.wm_blow, B = new RoomBuilder(scene, physics, 'wm_blow', at.x, at.z);
  const R = B.room, k = B.k;
  const W = 18, D = 16, H = 7;
  B.W = W; B.D = D;
  R.view = 15.5; R.follow = 0.55; R.music = 'cave'; R.cave = true; R.surface = 'stone';
  R.indoor = { sunDir: [0.42, 0.78, 0.46], sun: 0.6, hemi: 0.85 };   // (second round: 0.35 / 0.55)
  const DOOR = 5.2;
  caveShell(B, { W, D, H, open: [{ side: 'left', at: DOOR, w: 2.0, h: 2.4 }], seed: 9 });
  tunnelMouth(B, 'left', DOOR, { w: 2.0, h: 2.4 });
  R.exits.push({ ...B.world(-W / 2 + 0.35, DOOR), r: 0.65, room: 'wm_gallery' });
  // the vents: rings of scorched rock round an iron grate, the gas glowing under it (their glow: WM.blow.setCalm)
  const VENTS = [[-3.0, -3.6], [4.6, -3.2], [1.6, 3.0]], ventGlow = M('wm_vent', () => new THREE.MeshStandardMaterial({ color: '#2a1408', emissive: '#ff7a1a', emissiveIntensity: 1.2, roughness: 0.6 }));
  for (const [x, z] of VENTS) {
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; k.add(rockGeo((i + 3) % 12, { detail: 0 }), rock(), x + Math.sin(a) * 1.05, 0, z + Math.cos(a) * 1.05, a, { sx: 0.42, sy: 0.26, sz: 0.36 }); }
    k.add(cyl(0.85, 0.85, 0.05, 16), ventGlow, x, 0.025, z);   // (FLICKER-142: 1 cm over the floor's scorch, which its top lay in)
    for (let i = -3; i <= 3; i++) k.add(rbox(0.05, 0.05, Math.sqrt(Math.max(0.05, 0.72 - (i * 0.22) ** 2)) * 2, 0.01), MAT.iron(), x + i * 0.22, 0.06, z);
  }
  // the seam in the back wall: a big vein, warm while the Blow is in it
  // (the seam's shell its own copy of the warm tint's: setCalm recolours it, and no other place's warm crystals)
  const W0 = crystalMats('warm', { rockSet: true }), warm = { ...W0, shell: W0.shell.clone() }, vio = crystalMats('violet', { rockSet: true });
  warm.shell.userData = { ...W0.shell.userData };
  for (const [x, y, s, sd] of [[1.4, 1.6, 0.7, 41], [2.6, 2.8, 0.5, 43], [0.2, 3.0, 0.42, 47], [3.6, 1.2, 0.45, 53]]) gemVein(k, warm, x, y, -D / 2 + 0.6, 0, s, sd);
  gemVein(k, vio, -8.4, 2.4, -3.0, Math.PI / 2, 0.45, 59);
  // what the gas took: an overturned cart, a dropped lamp, broken sets, the deep shift's strongbox in the far corner
  B.put(-5.6, -6.0, 2.4, (kk) => { kk.add(rbox(1.0, 0.6, 1.4, 0.05), rust(), 0, 0.3, 0, 0, { rz: 1.3 }); return { hw: 0.75, hd: 0.75, top: 0.9 }; });
  k.add(cyl(0.12, 0.12, 0.26, 10), MAT.glass('#a8a090', 0.6), -3.8, 0.12, 5.4, 0, { rz: 1.5 });
  for (const [x, z, r] of [[6.6, 2.0, 0.7], [-7.0, -1.0, 2.2]]) k.add(rbox(0.26, 3.0, 0.26, 0.03), timber(), x, 0.15, z, r, { rz: Math.PI / 2 - 0.1 });
  for (const x of [-4.6, 0.0, 4.6]) if (Math.abs(x - 1.4) > 1.5) k.at(x, 0, -D / 2 + 0.25, 0, () => timberSet(k, 2.0, 3.6));
  const BOX = { x: 7.2, z: -6.6 };
  B.put(BOX.x, BOX.z, -0.5, (kk) => strongbox(kk));
  // (its lid hinged at the back edge: the pivot turns about x)
  const lidBase = new THREE.Group(); lidBase.position.set(BOX.x, 0.5, BOX.z); lidBase.rotation.y = -0.5; B.group.add(lidBase);
  const lid = new THREE.Group(); lid.position.z = -0.31; lidBase.add(lid);
  { const lm = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.12, 0.62), MAT.wood('dark')); lm.position.set(0, 0.06, 0.31); lm.castShadow = true; lid.add(lm); }
  // the gas: soft amber clouds over the vents and in the corner by the box (thin once the Blow is gone)
  const gasM = new THREE.MeshBasicMaterial({ color: '#d89a4a', transparent: true, opacity: 0.05, depthWrite: false });
  gasM.userData.noShadow = true;
  const gas = new THREE.Group(); B.group.add(gas);
  for (const [x, z, s] of [...VENTS.map(([x, z]) => [x, z, 1.6]), [6.4, -6.0, 2.0], [-1.0, -6.2, 1.8]]) for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(sphere(1, 12, 8), gasM); m.position.set(x + (hash(i, x, 1) - 0.5) * 0.8, 0.5 + i * 0.6, z + (hash(i, z, 2) - 0.5) * 0.8); m.scale.set(s * 0.85, s * 0.22, s * 0.85); gas.add(m); }
  // light: the vents' amber, the vein's warm glow, a weak cold light by the door
  const vl = VENTS.map(([x, z]) => B.light('#ff8a3a', 3.4, 9, x, 1.0, z));
  // (second round) the vents' glow on the floor round them, the seam's warm light at the back wall's foot (THE BLOW · NO
  // LAMPS: the light here is the gas's own)
  const ventP = poolMat('#ff8a3a', 0.4), veinP = poolMat('#ffb060', 0.3);
  for (const [x, z] of VENTS) floorPool(B, x, z, 2.6, ventP);
  floorPool(B, 1.8, -D / 2 + 2.2, 3.2, veinP);

  const veinL = B.light('#ffb060', 2.4, 10, 1.8, 2.4, -6.4);
  B.light('#b8c8e0', 1.8, 9, -6.4, 2.8, 4.0);
  B.finish();
  R.spawn = { ...B.world(-W / 2 + 1.5, DOOR), a: Math.PI / 2 };
  R.entries = { wm_gallery: R.spawn };
  const Bl = {
    centre: B.world(1.0, -0.6), vents: VENTS.map(([x, z]) => B.world(x, z)), wake: B.cx - W / 2 + 4.2, box: B.world(BOX.x - 0.6, BOX.z + 0.9), boxAt: B.world(BOX.x, BOX.z),
    bounds: { x0: B.cx - W / 2 + 0.6, x1: B.cx + W / 2 - 0.6, z0: B.cz - D / 2 + 0.6, z1: B.cz + D / 2 - 0.6 },
    vein: { ...B.world(1.6, -D / 2 + 0.9), y: 2.0 },
    setCalm(on) {
      ventGlow.emissiveIntensity = on ? 0.15 : 1.2; ventGlow.emissive.set(on ? '#5a3a2a' : '#ff7a1a');
      gasM.opacity = on ? 0.03 : 0.07; gas.visible = !on;
      ventP.opacity = on ? 0.08 : 0.4; veinP.color.set(on ? '#7ac8ff' : '#ffb060');
      for (const l of vl) { l.userData.base = on ? 0.6 : 3.4; if (R.group.visible) l.intensity = l.userData.base; }
      veinL.color.set(on ? '#9ad8ff' : '#ffb060'); veinL.userData.base = on ? 3.2 : 2.4; if (R.group.visible) veinL.intensity = veinL.userData.base;
      warm.shell.emissive.set(on ? '#1096d0' : '#ff9a3c'); warm.shell.color.set(on ? '#b8f0ff' : '#ffe2b8');
    },
    setBox(open) { lid.rotation.x = open ? -1.9 : 0; },
    gas,
  };
  WM.blow = Bl;
  return R;
}

export function buildWannieMine(scene, physics) {
  return { wm_landing: buildLanding(scene, physics), wm_gallery: buildGallery(scene, physics), wm_blow: buildBlow(scene, physics) };
}

// ---------------------------------------------------------------- the Platform's mine mouth (zislands.js R.wannie)
// The mouth's front spot is known once the Platform is built (R.wannie.mine: 2.6 m out of the mouth, facing it); the
// door is the dark hole itself, 1.2 m in from there; out again, he stands a step before the hole, facing out.
let MOUTH = null;
export function setMineMouth(wannie) { if (wannie?.mine) MOUTH = { ...wannie.mine }; }
export function wannieMineDoors() {
  const m = MOUTH; if (!m) return [];
  const fx = Math.sin(m.a), fz = Math.cos(m.a);   // (a: facing the mouth)
  // (the mouth's rock stands 1.8 m in front of its hole: the door at its foot, 0.6 m on from the front spot; he lands up
  //  on the incline's landing inside, facing down it)
  return [{ house: 'wm_mouth', x: m.x + fx * 0.6, z: m.z + fz * 0.6, r: 0.85, room: 'wm_gallery', region: 'isle_platform', spawn: (R) => WM.gallery?.mouthIn || R.spawn }];
}
export function wannieMineExit(to) {
  if (to !== 'wm-out' || !MOUTH) return null;
  const m = MOUTH;
  return { room: 'isle_platform', x: m.x - Math.sin(m.a) * 0.4, z: m.z - Math.cos(m.a) * 0.4, a: m.a + Math.PI };
}
// the Platform's own place in the world (its island's origin), for the story's spots there before it is built
export const platformOrigin = () => ISLE_AT(SLOTS.indexOf('platform'));
