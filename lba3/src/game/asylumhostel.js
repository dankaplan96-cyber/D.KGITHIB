// ASYLUM-2: FunFrock's asylum twelve years on (LBA1 room 0, src/game/lba1places.js): officially the Joint Project's
// hostel for its Esmer workers from Zeelich, and behind it Vesk's hidden storehouse (the cloud's answer, 3.11.2026).
// The layout is LBA1's (the grid, lba1room.js); this file adds what lives in it now and the front door outside.
//
// THE TWO WAYS IN, as LBA1's two exits (zone type 0, both to its scene 1, the yard):
//   front  LBA1's main entrance on the upper level (cells 36.5–37.5, 14, 8.5–13.5, the tall portal between two posts
//          at the upper walk's east end). Outside: a brick portico against the old fort's SOUTH wall, between its two
//          south towers (ASYLUM_FRONT). Why there: it is the way people arrive. The only stair onto the fort's terrace
//          (lba1places.js ASYLUM_STEPS, up the ledge from the plateau and the town) tops out right below it, and the
//          play camera looks north at that wall face from the terrace, so the door is the first thing seen on the way
//          up; the south face is the terrace's widest flat stretch (x −37…−18), clear of the water main's legs and the
//          rocks. The asylum's halls lie under the fort; its upper level is the near-surface one, so the front opens at
//          the terrace's level, while the deep stair-well is reached by a long stair down (the side door).
//   side   LBA1's low stair-well (cells 9.5–11.5, 1, 41.5–42.5): the squat block-house round the corner outside the
//          fort's east wall (ASYLUM_DOOR), out of sight of the approach: a service way (the store's goods, the dig's
//          cable go that way).
//
// CONTRACT (world coordinates; filled on the room R when it is built)
//   ASYLUM_FRONT                    the portico's door (x, z: the wall face; a: the way out)
//   buildAsylumFront(scene, physics) → { door: {x, z}, out: {x, z, a} }   (on Citadel, with the block-house)
//   dressAsylum(R, physics)         the hostel, the store, the two offices, the plaque and the handles below
//   R.ways = { front: {x, z, a}, side: {x, z, a} }   where a door leads in
//   R.npcSpots = { worker1…worker4, cook, foreman, sleeper, guard1, guard2 }: { x, y, z, a, pose?, role, lba1 }
//            at the original actors' places (LBA1's nurses and doctors, bodies 9/11; body 14; the clone, 13) where they
//            fit, each on clear floor; a: the heading (0 = +z); pose: 'sit' | 'lie' when the furniture is there for it
//   R.asylumHostel = {
//     spots: { hiddenCrate, veskDesk, plaque, register, cellPlaque }: { x, z, r }   (the story's searches / looks)
//     veskOffice: { door: { setOpen(b, instant), open } }   his locked office (shut at the start; collision follows)
//     store: { setCleared(b, instant), cleared }   chapters 3–7: the crates, the humming crate and the guard posts
//            gone (collision follows)
//     hum: { setOn(b) }   the humming crate's faint shimmer (on at the start)
//   }
import * as THREE from 'three';
import { Kit, MAT, rbox, plane, cyl, sphere, lathe, slab, canvasTex, pottedPlant, locker, rug, stove, dresser, table, bench, floorLamp, pot, kettle, plate,
  ledger, papers, bookStack, deskLamp, officeChair, noticeBoard, wallClock, filingCabinet, crate, chest, desk, coatStand } from './props.js';
import { tileTex, cm, latticeM } from './props-esmer.js';

export const ASYLUM_FRONT = { x: -26.5, z: -50.58, a: 0 };   // (the fort's south wall, outer face at its foot; out = +z)

// ---- placeholder words (the story may change them): the hostel's sign, the Council's plaque, a crate stamp
const enamelTex = (line, { w = 1024, h = 128, bg = '#245e5c', fg = '#f2e6c8', px = 58 } = {}) => canvasTex(w, h, (x, W, H) => {
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#d9a94a'; x.lineWidth = 7; x.strokeRect(8, 8, W - 16, H - 16);
  x.fillStyle = fg; x.font = `bold ${px}px Georgia, 'Times New Roman', serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(line, W / 2, H / 2 + 3, W - 60);
});
export const HOSTEL_SIGN = "JOINT PROJECT · WORKERS' HOSTEL";
export const COUNCIL_PLAQUE = ['SEALED BY ORDER OF THE', 'CITADEL ISLAND COUNCIL', "AFTER FUNFROCK'S FALL.", 'NEVER AGAIN.'];
export const plaqueTex = (lines, { w = 512, h = 320 } = {}) => canvasTex(w, h, (x, W, H) => {
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#8a6a3a'); g.addColorStop(0.5, '#b8924e'); g.addColorStop(1, '#6e5230');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#4a3418'; x.lineWidth = 10; x.strokeRect(12, 12, W - 24, H - 24);
  x.fillStyle = '#3a2810'; for (const [cx, cy] of [[30, 30], [W - 30, 30], [30, H - 30], [W - 30, H - 30]]) { x.beginPath(); x.arc(cx, cy, 7, 0, 7); x.fill(); }
  x.fillStyle = '#2e2008'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const n = lines.length, lh = (H - 90) / Math.max(1, n);
  lines.forEach((s, i) => { x.font = `bold ${Math.min(40, lh * 0.62)}px Georgia, 'Times New Roman', serif`; x.fillText(s, W / 2, 45 + lh * (i + 0.5), W - 70); });
});

// ================================================================== the front door on Citadel
// A brick portico against the fort's south wall: two piers and a lintel round a deep doorway (the doors 1.3 m back),
// a plaster plinth, pilasters, architrave and a thick cornice, a pediment with a slate roof and an Esmer tile roundel;
// the hostel's enamel sign on the lintel, two brass lanterns (no lights: emissive glass), two potted plants from home.
export function buildAsylumFront(scene, physics) {
  const F = ASYLUM_FRONT, gy = physics.groundAt(F.x, F.z + 2.2, 40);
  const g = new THREE.Group(); g.name = 'asylum-front'; g.position.set(F.x, gy, F.z); g.rotation.y = F.a; scene.add(g);
  const k = new Kit(g);
  const brick = MAT.stone('grey', 1), trim = MAT.plaster('#e2dccf'), slate = MAT.stone('slate', 1), wood = MAT.paint('#2f5f5a', 0.5), woodD = MAT.paint('#1f403d', 0.5), br = MAT.brass();
  const W = 4.6, D = 1.8, H = 4.5, ow = 1.8, oh = 2.85, z0 = -0.5, zf = z0 + D;   // (zf: the front face)
  const zc = (z0 + zf) / 2;
  for (const s of [-1, 1]) k.add(rbox((W - ow) / 2, H, D, 0.03), brick, s * (ow / 2 + (W - ow) / 4), H / 2, zc);
  k.add(rbox(ow, H - oh, D, 0.03), brick, 0, oh + (H - oh) / 2, zc);
  // plinth, pilasters, architrave, cornice
  for (const s of [-1, 1]) {
    k.add(rbox((W - ow) / 2 + 0.08, 0.42, D + 0.08, 0.03), trim, s * (ow / 2 + (W - ow) / 4), 0.21, zc + 0.02);
    for (const px of [ow / 2 + 0.34, W / 2 - 0.2]) k.add(rbox(0.36, H - 0.75, 0.1, 0.02), trim, s * px, 0.42 + (H - 0.75) / 2, zf + 0.04);
    k.add(rbox(0.2, oh + 0.1, 0.1, 0.02), trim, s * (ow / 2 + 0.1), oh / 2 + 0.05, zf + 0.05);
    k.add(rbox(0.06, oh - 0.1, D - 0.3, 0.01), trim, s * (ow / 2 - 0.03), oh / 2, zc + 0.1);   // (the reveal's lining)
  }
  k.add(rbox(ow + 0.4, 0.22, 0.12, 0.02), trim, 0, oh + 0.11, zf + 0.05);
  k.add(rbox(W + 0.3, 0.16, D + 0.25, 0.03), trim, 0, H - 0.08, zc + 0.12);
  k.add(rbox(W + 0.55, 0.2, D + 0.5, 0.04), trim, 0, H + 0.1, zc + 0.25);
  // the pediment (brick) and its slate roof
  const pw = W / 2 + 0.15, ph = 1.15;
  k.add(slab('asyped' + pw, (s) => { s.moveTo(-pw, 0); s.lineTo(pw, 0); s.lineTo(0, ph); s.lineTo(-pw, 0); }, D + 0.1, 0.02), brick, 0, H + 0.2, z0 + 0.05);
  const rl = Math.hypot(pw + 0.25, ph + 0.12), ra = Math.atan2(ph + 0.12, pw + 0.25);
  for (const s of [-1, 1]) k.add(rbox(rl, 0.16, D + 0.6, 0.03), slate, s * (pw + 0.25) / 2, H + 0.2 + (ph + 0.12) / 2 + 0.06, zc + 0.3, 0, { rz: -s * ra });
  k.add(rbox(0.22, 0.2, D + 0.62, 0.04), slate, 0, H + 0.2 + ph + 0.15, zc + 0.3);
  k.add(new THREE.CircleGeometry(0.36, 20), cm(tileTex('#2f8a9a', '#e8b84a', '#d8608a'), { rough: 0.45 }), 0, H + 0.62, z0 + D + 0.11);
  k.add(lathe([[0.37, 0], [0.43, 0], [0.43, 0.05], [0.37, 0.05]], 24), br, 0, H + 0.62, z0 + D + 0.09, 0, { rx: Math.PI / 2 });
  // the doors, 1.3 m back in the doorway: two panelled leaves, brass pulls; a step and the doorway's floor
  for (const s of [-1, 1]) {
    k.add(rbox(ow / 2 - 0.03, oh - 0.06, 0.08, 0.01), wood, s * ow / 4, (oh - 0.06) / 2, z0 + 0.62);
    for (const py of [0.75, 1.95]) k.add(rbox(ow / 2 - 0.28, py < 1 ? 0.9 : 1.1, 0.03, 0.01), woodD, s * ow / 4, py, z0 + 0.67);
    k.add(cyl(0.018, 0.018, 0.34, 6), br, s * 0.12, 1.15, z0 + 0.71);
  }
  k.add(rbox(ow + 0.02, 0.12, D - 0.5, 0.02), trim, 0, 0.06, zc + 0.25);
  k.add(rbox(ow + 1.0, 0.13, 0.62, 0.02), trim, 0, 0.065, zf + 0.31);
  // the sign, the lanterns, the plants
  k.add(plane(ow + 0.3, 0.34), MAT.map(enamelTex(HOSTEL_SIGN), 0.55), 0, oh + 0.55, zf + 0.012);
  k.add(rbox(ow + 0.4, 0.42, 0.04, 0.01), br, 0, oh + 0.55, zf - 0.012);
  for (const s of [-1, 1]) {
    const lx = s * (ow / 2 + 0.72), ly = 2.55, lz = zf + 0.1;
    k.add(rbox(0.06, 0.06, 0.32, 0.01), br, lx, ly + 0.3, lz + 0.12);
    k.add(lathe([[0, 0], [0.13, 0], [0.14, 0.03], [0.05, 0.13], [0.02, 0.2], [0, 0.22]], 8), br, lx, ly + 0.2, lz + 0.28);
    k.add(lathe([[0.04, 0], [0.11, 0.05], [0.12, 0.17], [0.09, 0.22], [0.04, 0.24]], 8), warmGlow(), lx, ly - 0.05, lz + 0.28);
    k.add(lathe([[0, 0], [0.09, 0], [0.09, 0.04], [0, 0.04]], 8), br, lx, ly - 0.08, lz + 0.28);
    k.at(s * (ow / 2 + 0.95), 0, zf + 0.55, 0, () => pottedPlant(k, { kind: s < 0 ? 'spiky' : 'leafy', s: 1.25, potColor: '#3a8a9a' }));
  }
  k.flush();
  for (const m of g.children) if (m.isMesh) m.castShadow = m.material === brick || m.material === trim || m.material === slate;   // (the masonry casts; the small things don't)
  // collision: the piers and the lintel (world: the group only moves, no turn but F.a = 0), the step, the pots
  const wx = (lx) => F.x + lx, wz = (lz) => F.z + lz;
  for (const s of [-1, 1]) physics.add({ type: 'box', x: wx(s * (ow / 2 + (W - ow) / 4)), z: wz(zc + 0.04), hw: (W - ow) / 4 + 0.05, hd: D / 2 + 0.08, rot: 0, top: gy + H + 1.4 });
  physics.add({ type: 'box', x: F.x, z: wz(1.06), hw: ow / 2 + 0.5, hd: 0.86, rot: 0, top: gy + 0.13 });
  for (const s of [-1, 1]) physics.add({ type: 'cyl', x: wx(s * (ow / 2 + 0.95)), z: wz(zf + 0.55), r: 0.3, top: gy + 0.5, noStand: true });
  return { door: { x: F.x, z: wz(z0 + 1.05) }, out: { x: F.x, z: wz(zf + 1.35), a: F.a } };
}

// ================================================================== inside: the hostel and Vesk's store
// (every position in LBA1 cell coordinates through R.cell; y from the room's own collision under it, so a piece stands
//  on the floor or on the grid's own furniture it is put on. One Kit per area: each area draws one mesh per material
//  and is culled on its own. Colliders: the pieces a person walks into; nothing on the walk between the doors, to his
//  cell, the register or the giver.)
const CH = 2.1 / 1240 * 256;   // (lba1room.js CH: a cell's height)
const HALF = Math.PI / 2;
const warmGlow = () => MAT.glow('#fff0d0', '#ffb860', 1.4);   // (one material for every small lamp and flame of ours)
const rngOf = (seed) => { let r = seed * 7 + 1; return () => ((r = (r * 16807) % 2147483647) / 2147483647); };

// a bunk bed along +z (l long, w wide): four posts, two bunks with mattresses, blankets and pillows, a ladder at +x
function bunk(k, { w = 0.95, l = 2.05, low = 0.32, cols = ['#2f7f86', '#e8b84a'] } = {}) {
  const m = MAT.wood('honey'), md = MAT.wood('dark');
  const hi = low + 1.05, H = hi + 0.5;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(rbox(0.07, H, 0.07, 0.015), md, sx * (w / 2 - 0.035), H / 2, sz * (l / 2 - 0.035));
  for (const [y, c] of [[low, cols[0]], [hi, cols[1]]]) {
    for (const sx of [-1, 1]) k.add(rbox(0.05, 0.14, l, 0.012), m, sx * (w / 2 - 0.03), y, 0);
    for (const sz of [-1, 1]) k.add(rbox(w, 0.14, 0.05, 0.012), m, 0, y + 0.06, sz * (l / 2 - 0.03));
    k.add(rbox(w - 0.1, 0.14, l - 0.1, 0.05), MAT.flat('#efe6d2', 0.9), 0, y + 0.1, 0);
    k.add(rbox(w - 0.06, 0.06, l * 0.62, 0.03), MAT.flat(c, 0.9), 0, y + 0.19, l * 0.17);
    k.add(rbox(0.5, 0.1, 0.3, 0.04), MAT.flat('#f8f2e4', 0.9), 0, y + 0.22, -l / 2 + 0.25);
  }
  k.add(rbox(0.05, 0.05, l * 0.7, 0.012), m, -w / 2 + 0.03, hi + 0.42, -0.1);   // (the upper bunk's guard rail)
  for (let i = 0; i < 4; i++) k.add(rbox(0.05, 0.035, 0.4, 0.01), m, w / 2 + 0.04, low + 0.25 + i * 0.27, l / 2 - 0.3);
  return { hw: w / 2 + 0.06, hd: l / 2 + 0.03, top: H };
}
// a hammock slung between two posts along x (span), Esmer striped canvas
function hammock(k, { span = 2.6, cols = ['#d8608a', '#f2e6c8', '#2f8a9a'] } = {}) {
  const md = MAT.wood('dark');
  for (const s of [-1, 1]) { k.add(rbox(0.1, 1.7, 0.1, 0.02), md, s * span / 2, 0.85, 0); k.add(rbox(0.16, 0.06, 0.16, 0.02), md, s * span / 2, 1.72, 0); }
  const n = 9;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = (t - 0.5) * (span - 0.5), sag = 0.95 - Math.sin(t * Math.PI) * 0.35;
    k.add(rbox((span - 0.5) / n + 0.02, 0.03, 0.62, 0.01), MAT.flat(cols[i % cols.length], 0.9), x, sag, 0, 0, { rz: Math.cos(t * Math.PI) * -0.45 });
  }
  for (const s of [-1, 1]) k.add(cyl(0.008, 0.008, 0.5, 4), MAT.flat('#d8c8a0', 0.9), s * (span / 2 - 0.16), 1.3, 0, 0, { rz: s * 0.9 });
  return { hw: span / 2 + 0.08, hd: 0.36, top: 1.75 };
}
// a folding lattice screen (Esmer): panels on a zigzag, each a dark-wood frame round the lattice
function screen(k, { n = 3, pw = 0.62, h = 1.75 } = {}) {
  const md = MAT.wood('dark'), lat = latticeM();
  for (let i = 0; i < n; i++) {
    const a = (i % 2 ? -1 : 1) * 0.35, x = (i - (n - 1) / 2) * pw * 0.94;
    k.at(x, 0, (i % 2) * 0.12, a, () => {
      for (const sx of [-1, 1]) k.add(rbox(0.05, h, 0.05, 0.01), md, sx * pw / 2, h / 2, 0);
      for (const y of [0.12, h - 0.04]) k.add(rbox(pw, 0.05, 0.05, 0.01), md, 0, y, 0);
      for (const s of [-1, 1]) k.add(plane(pw - 0.05, h - 0.22), lat, 0, 0.12 + (h - 0.2) / 2, s * 0.012, s > 0 ? 0 : Math.PI);
    });
  }
  return { hw: n * pw / 2, hd: 0.22, top: h };
}
// a washing line on two posts along x: shirts and cloths pegged on it
function washing(k, { w = 3.0, h = 1.9, cols = ['#f4eee0', '#3a7ac8', '#e8608a', '#f0c040', '#9ad0b0'] } = {}) {
  const md = MAT.wood('dark');
  for (const s of [-1, 1]) k.add(cyl(0.03, 0.035, h + 0.05, 6), md, s * w / 2, (h + 0.05) / 2, 0);
  k.add(cyl(0.006, 0.006, w, 4), MAT.flat('#e8e0c8', 0.9), 0, h - 0.06, 0, 0, { rz: HALF });
  const n = Math.max(2, Math.floor(w / 0.55));
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.35 + i * (w - 0.7) / (n - 1), hh = 0.42 + (i % 2) * 0.2;
    k.add(rbox(0.38, hh, 0.015, 0.005), MAT.flat(cols[i % cols.length], 0.9), x, h - 0.08 - hh / 2, 0, 0, { rz: ((i % 3) - 1) * 0.06 });
  }
  return { hw: w / 2 + 0.05, hd: 0.08, top: h };
}
// a rope barrier: brass posts at pts [[x, z], …] (kit-local), a red rope sagging between them
function ropeLine(k, pts) {
  const br = MAT.brass(), rope = MAT.flat('#a8282a', 0.9);
  for (const [x, z] of pts) k.add(lathe([[0, 0], [0.13, 0], [0.13, 0.03], [0.04, 0.06], [0.03, 0.9], [0.05, 0.93], [0.03, 0.98], [0, 1.0]], 10), br, x, 0, z);
  for (let i = 1; i < pts.length; i++) {
    const [x0, z0] = pts[i - 1], [x1, z1] = pts[i], P = [];
    for (let j = 0; j <= 6; j++) { const t = j / 6; P.push(new THREE.Vector3(x0 + (x1 - x0) * t, 0.9 - Math.sin(t * Math.PI) * 0.16, z0 + (z1 - z0) * t)); }
    k.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P), 10, 0.022, 5, false), rope, 0, 0, 0);
  }
}
// FunFrock's clone statue (ours: a squat helmeted figure in grey stone on a plinth), faces +z
function cloneStatue(k) {
  const st = MAT.stone('grey', 1), pl = MAT.plaster('#cfc8bc');
  k.add(rbox(0.8, 0.5, 0.7, 0.03), pl, 0, 0.25, 0);
  k.add(lathe([[0, 0], [0.3, 0], [0.34, 0.25], [0.32, 0.6], [0.26, 0.85], [0.2, 0.95], [0, 0.97]], 14), st, 0, 0.5, 0);
  k.add(sphere(0.22, 12, 9), st, 0, 1.6, 0.02);
  k.add(lathe([[0, 0], [0.25, 0], [0.24, 0.12], [0.12, 0.24], [0, 0.26]], 12), st, 0, 1.68, 0);
  k.add(rbox(0.05, 0.3, 0.32, 0.02), st, 0, 2.02, 0, 0, { rx: -0.3 });   // (the helmet's crest)
  for (const s of [-1, 1]) k.add(rbox(0.12, 0.5, 0.14, 0.04), st, s * 0.36, 1.12, 0.04, 0, { rz: s * 0.15 });
  return { hw: 0.42, hd: 0.38, top: 2.1 };
}
// a work coat hung over something (a statue's shoulders): draped front and back, sleeves
function coat(k, { c = '#3a5a7a', h = 0.95 } = {}) {
  const m = MAT.flat(c, 0.9), md = MAT.flat('#' + new THREE.Color(c).multiplyScalar(0.7).getHexString(), 0.92);
  for (const s of [-1, 1]) k.add(rbox(0.6, h, 0.04, 0.02), s > 0 ? m : md, 0, -h / 2, s * 0.2, 0, { rx: s * 0.08 });
  for (const s of [-1, 1]) k.add(rbox(0.1, h * 0.8, 0.14, 0.04), m, s * 0.33, -h * 0.42, 0.02, 0, { rz: s * 0.08 });
  k.add(rbox(0.52, 0.06, 0.44, 0.03), md, 0, 0, 0);
}
// a tool rack on a wall (faces +z): a board, spades and picks, a coil of cable; work boots in pairs below
function toolRack(k, { w = 1.6 } = {}) {
  const md = MAT.wood('dark'), ir = MAT.iron(), m = MAT.wood('honey');
  k.add(rbox(w, 0.9, 0.04, 0.01), m, 0, 1.55, 0.02);
  for (let i = 0; i < 5; i++) {
    const x = -w / 2 + 0.2 + i * (w - 0.4) / 4;
    k.add(cyl(0.018, 0.018, 1.25, 6), md, x, 1.25, 0.09, 0, { rz: (i % 2 ? 0.06 : -0.05) });
    if (i % 2) k.add(rbox(0.22, 0.28, 0.02, 0.01), ir, x, 0.66, 0.1); else k.add(rbox(0.36, 0.05, 0.06, 0.01), ir, x, 1.86, 0.1, 0, { rz: 0.15 });
  }
  k.add(new THREE.TorusGeometry(0.18, 0.035, 6, 16), MAT.flat('#1d1d21', 0.9), w / 2 - 0.25, 1.4, 0.1);
  for (let i = 0; i < Math.floor(w / 0.4); i++) for (const s of [-1, 1]) {
    const bx = -w / 2 + 0.25 + i * 0.4 + s * 0.07, c = i % 2 ? '#4a3626' : '#2e2a26';
    k.add(rbox(0.11, 0.24, 0.13, 0.03), MAT.flat(c, 0.9), bx, 0.12, 0.25);
    k.add(rbox(0.11, 0.07, 0.27, 0.03), MAT.flat(c, 0.9), bx, 0.035, 0.31);
  }
  return { hw: w / 2, hd: 0.36, top: 2.0 };
}
// a small home shrine (Esmer): a tiled cabinet, a brass onion dome on it, a candle
function shrine(k) {
  const br = MAT.brass();
  k.add(rbox(0.5, 0.7, 0.36, 0.02), MAT.wood('dark'), 0, 0.35, 0);
  k.add(plane(0.4, 0.5), esmerTile(), 0, 0.38, 0.185);
  k.add(lathe([[0, 0], [0.12, 0], [0.135, 0.04], [0.125, 0.09], [0.08, 0.15], [0.03, 0.2], [0.005, 0.27], [0, 0.28]], 12), br, 0, 0.7, 0);
  k.add(lathe([[0, 0], [0.05, 0], [0.05, 0.02], [0, 0.02]], 8), br, 0.17, 0.7, 0.06);
  k.add(cyl(0.016, 0.016, 0.09, 6), MAT.flat('#f4ecd8', 0.9), 0.17, 0.76, 0.06);
  k.add(sphere(0.02, 6, 4), warmGlow(), 0.17, 0.83, 0.06);
  return { hw: 0.27, hd: 0.2, top: 0.95 };
}
const esmerTile = () => cm(tileTex('#2f8a9a', '#e8b84a', '#d8608a'), { rough: 0.45 });
// Esmer tea glasses (amber, in brass holders) round a brass pot on a tray
function teaSet(k, n = 4, seed = 1) {
  const br = MAT.brass(), tea = MAT.flat('#c8702a', 0.25, { metalness: 0.1 }), r = rngOf(seed);
  k.add(lathe([[0, 0], [0.2, 0], [0.21, 0.02], [0.2, 0.025], [0, 0.025]], 16), br, 0, 0, 0);
  k.add(lathe([[0, 0], [0.08, 0], [0.1, 0.06], [0.09, 0.12], [0.05, 0.15], [0.02, 0.16], [0.03, 0.19], [0, 0.2]], 12), br, 0, 0.025, 0);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r(), d = 0.3 + r() * 0.25;
    k.add(lathe([[0, 0], [0.028, 0], [0.024, 0.05], [0.03, 0.09], [0, 0.09]], 8), tea, Math.cos(a) * d, 0, Math.sin(a) * d);
    k.add(lathe([[0.028, 0], [0.032, 0], [0.032, 0.03], [0.028, 0.03]], 8), br, Math.cos(a) * d, 0, Math.sin(a) * d);
  }
}
// the project's crate stamped ZEELICH (warm crystals inside): planks, battens, the stamp on two sides; open: crystals
const stampTex = () => canvasTex(256, 256, (x, W, H) => {
  x.clearRect(0, 0, W, H);
  x.strokeStyle = 'rgba(150,40,30,0.85)'; x.lineWidth = 9; x.strokeRect(22, 78, W - 44, 100);
  x.fillStyle = 'rgba(150,40,30,0.85)'; x.font = "bold 50px 'Courier New', monospace"; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('ZEELICH', W / 2, H / 2 + 2, W - 60);
});
let STAMP = null;
const stampM = () => (STAMP ||= MAT.map(stampTex(), 0.9, { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
function zcrate(k, { s = 0.72, open = false } = {}) {
  const m = MAT.wood('pale'), md = MAT.wood('honey');
  k.add(rbox(s - 0.03, s - 0.03, s - 0.03, 0.012), m, 0, s / 2, 0, 0, { jit: true });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(rbox(0.06, s, 0.06, 0.01), md, sx * (s / 2 - 0.03), s / 2, sz * (s / 2 - 0.03));
  for (const y of [0.04, s - 0.04]) for (const sz of [-1, 1]) k.add(rbox(s, 0.06, 0.05, 0.01), md, 0, y, sz * (s / 2 - 0.025));
  k.add(plane(s * 0.86, s * 0.86), stampM(), 0, s / 2, s / 2 + 0.006);
  k.add(plane(s * 0.86, s * 0.86), stampM(), s / 2 + 0.006, s / 2, 0, HALF);
  if (open) for (let i = 0; i < 5; i++) k.add(lathe([[0, 0], [0.05, 0.05], [0.04, 0.16], [0, 0.22]], 5), warmGlow(), -0.18 + (i % 3) * 0.18, s - 0.12, -0.12 + Math.floor(i / 3) * 0.22, i, { rz: (i - 2) * 0.2 });
  return { hw: s / 2, hd: s / 2, top: s };
}
// a guard's post: a stool, a lantern on an upturned crate, a flask
function guardPost(k) {
  const md = MAT.wood('dark'), br = MAT.brass();
  k.add(lathe([[0, 0], [0.18, 0], [0.18, 0.04], [0, 0.04]], 12), MAT.wood('honey'), 0, 0.5, 0);
  for (let i = 0; i < 3; i++) { const a = i * 2.094; k.add(cyl(0.02, 0.025, 0.5, 5), md, Math.sin(a) * 0.12, 0.25, Math.cos(a) * 0.12); }
  k.add(rbox(0.5, 0.5, 0.5, 0.02), MAT.wood('pale'), 0.55, 0.25, 0.05, 0.3);
  k.add(lathe([[0, 0], [0.08, 0], [0.08, 0.02], [0.05, 0.03], [0.05, 0.2], [0.07, 0.22], [0.02, 0.28], [0, 0.29]], 8), br, 0.55, 0.5, 0.05);
  k.add(cyl(0.045, 0.045, 0.15, 8), warmGlow(), 0.55, 0.61, 0.05);
  k.add(cyl(0.04, 0.04, 0.22, 8), MAT.paint('#3a6a4a', 0.5), 0.42, 0.61, -0.12);
  return { hw: 0.55, hd: 0.32, top: 0.55 };
}
// FunFrock's old plans of the asylum (drawn: the outline of the halls in white on blue, a dashed line, no words)
const plansTex = () => canvasTex(512, 300, (x, W, H) => {
  x.fillStyle = '#2a4a7a'; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(230,240,255,0.85)'; x.lineWidth = 3;
  for (const [a, b, c, d] of [[30, 30, 260, 120], [30, 150, 200, 100], [300, 60, 180, 90], [300, 170, 80, 100], [400, 170, 80, 100]]) x.strokeRect(a, b, c, d);
  x.lineWidth = 1.5; for (let i = 0; i < 12; i++) { x.beginPath(); x.moveTo(40 + i * 18, 40); x.lineTo(40 + i * 18, 140); x.stroke(); }
  x.setLineDash([6, 5]); x.strokeStyle = 'rgba(255,190,120,0.9)'; x.lineWidth = 3; x.beginPath(); x.moveTo(20, 200); x.lineTo(150, 230); x.lineTo(300, 120); x.stroke(); x.setLineDash([]);
  x.strokeRect(W - 130, H - 60, 110, 44);
});

export function dressAsylum(R, physics) {
  const o = R.group.position;
  const W = (x, z) => R.cell(x, 0, z);                                            // a cell's centre in world
  const L = (x, z) => { const w = W(x, z); return [w.x - o.x, w.z - o.z]; };      // …in the room group's frame
  const Y = (x, z, yc) => physics.groundAt(W(x, z).x, W(x, z).z, yc * CH + 0.7);  // the floor or top at cell level yc
  // (PERF: the room's camera sees most of the room at once, so areas of their own bought no culling, only draw calls:
  //  everything that stays put shares one Kit (one mesh per material for the whole hostel); the upper walk (it fades
  //  with the ward's lid), the store (cleared in chapters 3–7) and the humming crate's glow have their own. Only the
  //  big wooden and stone pieces cast shadows: one shadow draw per material, the small things none)
  const groups = {}, kits = [];
  const own = (name) => { const g = new THREE.Group(); g.name = 'asylum:' + name; R.group.add(g); const k = new Kit(g); kits.push(k); return { g, k }; };
  const hostel = own('hostel');
  const area = (name, alone = false) => (groups[name] = { ...(alone ? own(name) : hostel), cols: [] });
  const col = (A, c) => { const cc = physics.add({ seeThrough: true, noStand: true, ...c }); R.colliders.push(cc); A.cols.push(cc); return cc; };
  // put a builder at cell (x, z) on the floor of level yc, turned ry; its footprint becomes a collider
  const put = (A, x, z, yc, ry, fn, opts = {}, { solid = true, pad = 0 } = {}) => {
    const [lx, lz] = L(x, z), y = Y(x, z, yc);
    const fp = A.k.at(lx, y, lz, ry, () => fn(A.k, opts));
    if (fp && solid) {
      const w = W(x, z);
      if (fp.r) col(A, { type: 'cyl', x: w.x, z: w.z, r: fp.r + pad, top: y + fp.top });
      else col(A, { type: 'box', x: w.x, z: w.z, hw: fp.hw + pad, hd: fp.hd + pad, rot: ry, top: y + fp.top });
    }
    return { fp, y, lx, lz };
  };
  const at = (A, x, z, y, ry, fn) => { const [lx, lz] = L(x, z); A.k.at(lx, y, lz, ry, fn); };
  const spot = (x, z, r, yc = 5) => { const w = W(x, z); return { x: w.x, z: w.z, y: Y(x, z, yc), r }; };
  // a washing line: its two posts collide, a person walks under the line
  const washAt = (A, x, z, yc, ry, opts) => {
    const r = put(A, x, z, yc, ry, washing, opts, { solid: false }), w = opts.w || 3, c = Math.cos(ry), sn = Math.sin(ry), m = W(x, z);
    for (const s of [-1, 1]) col(A, { type: 'cyl', x: m.x + c * s * w / 2, z: m.z - sn * s * w / 2, r: 0.08, top: r.y + (opts.h || 1.9) });
  };
  const rugA = ['#2f7f86', '#d8608a', '#e8b84a', '#f4eee0', '#1c3a40'], rugB = ['#a8382a', '#2a4a7a', '#e0b050', '#f0e0b8', '#3a1a12'];
  const flatRug = (A, x, z, yc, w, d, pal, seed, ry = 0) => at(A, x, z, Y(x, z, yc), ry, () => rug(A.k, w, d, pal, seed));

  // ---- the dormitory under the upper walk (LBA1's ward: its three brick bed plinths along the west wall, x 9–11)
  {
    const A = area('dorm');
    for (const [z, c] of [[8, ['#2f7f86', '#e8b84a']], [12, ['#d8608a', '#f2e6c8']], [16, ['#3a6fb0', '#d8608a']]]) put(A, 10.5, z, 5, HALF, bunk, { cols: c, low: 0.15, l: 2.3 });   // (on the plinth)
    for (const [z, c] of [[8, ['#e8b84a', '#2f8a9a']], [16, ['#f2e6c8', '#a8382a']]]) put(A, 20.4, z, 5, -HALF, bunk, { cols: c, l: 2.1 });
    for (let i = 0; i < 4; i++) put(A, 11.6 + i * 1.1, 5.35, 5, 0, locker, { w: 0.9, d: 0.45, h: 1.8, color: '#3f8a86', ajar: i === 2 });
    flatRug(A, 15.5, 12.0, 5, 3.2, 2.2, rugA, 3);
    put(A, 21.1, 12.1, 5, -HALF, shrine);
    washAt(A, 15.8, 16.9, 5, 0, { w: 3.0 });
  }
  // ---- the common room beside it (the ward's east half, past the wall at x 22): hammocks slung between LBA1's
  //      cabinets, a rug
  {
    const A = area('common');
    put(A, 29.0, 6.6, 5, 0, hammock, { span: 2.6 });
    put(A, 31.6, 15.6, 5, 0, hammock, { span: 2.6, cols: ['#2f8a9a', '#e8b84a', '#f2e6c8'] });
    flatRug(A, 29.5, 11.5, 5, 2.6, 1.8, rugB, 5);
    put(A, 34.6, 6.0, 5, 0, pottedPlant, { kind: 'leafy', potColor: '#e8b84a' });
  }
  // ---- the long hall (LBA1's corridor, z 31–36): a runner, warm lamps and benches along its north side, clear of
  //      the walk and of Vesk's door (x 41–42)
  {
    const A = area('hall');
    flatRug(A, 26.0, 33.6, 5, 13.0, 1.5, rugA, 9);
    for (const x of [24.0, 33.0, 46.5]) put(A, x, 31.5, 5, 0, floorLamp);
    for (const x of [29.6, 37.8]) put(A, x, 31.45, 5, 0, bench, { w: 1.5 });
    put(A, 44.0, 32.4, 5, 0, pottedPlant, { kind: 'spiky', s: 1.1, potColor: '#3a8a9a' });
  }
  // ---- the kitchen and mess in the nurses' station (LBA1's counter in its north-west corner, x 15–17, z 20–22)
  {
    const A = area('kitchen');
    const ct = Y(16.5, 21.5, 8);   // (the grid's counter: a worktop on it, pots, a kettle, tea glasses)
    at(A, 16.5, 21.5, ct, 0, () => { const k = A.k; k.add(rbox(2.5, 0.06, 2.5, 0.02), MAT.wood('honey'), 0, 0.03, 0); pot(k, -0.5, 0.06, -0.4); pot(k, 0.1, 0.06, -0.6, { r: 0.1, h: 0.12 }); kettle(k, 0.6, 0.06, -0.3); k.at(0.2, 0.06, 0.4, 0, () => teaSet(k, 3, 2)); });
    put(A, 15.3, 25.3, 5, HALF, stove);
    put(A, 15.35, 28.4, 5, HALF, dresser, { w: 1.5 });
    put(A, 22.0, 25.2, 5, 0, table, { w: 4.0, d: 0.95 });
    for (const dz of [-0.95, 0.95]) put(A, 22.0, 25.2 + dz, 5, 0, bench, { w: 3.4 });
    { const ty = Y(22, 25.2, 5) + 0.78; at(A, 20.6, 25.2, ty, 0, () => teaSet(A.k, 5, 3)); at(A, 23.4, 25.0, ty, 0.6, () => { plate(A.k, 0, 0, 0, 0, '#f2ead6', 0.12, false); plate(A.k, 0.3, 0, 0.1, 0, '#e8b84a', 0.12, false); }); }
    put(A, 26.9, 20.8, 5, -HALF, floorLamp);
    put(A, 15.4, 23.2, 5, HALF, floorLamp);
    flatRug(A, 22.0, 25.2, 5, 5.4, 3.4, rugB, 5);
  }
  // ---- the cells: the first a sleeping room for two (its door opened in the corridor wall: lba1places.js carve, a
  //      step down inside); the second Twinsen's, kept as the workers' curiosity (a rope, the little brass plaque)
  {
    const A = area('cellA');
    put(A, 54.5, 39.0, 4, HALF, bunk, { cols: ['#d8608a', '#2f8a9a'], low: 0.15, l: 2.2 });
    put(A, 57.4, 41.6, 3, HALF, hammock, { span: 2.9 });
    put(A, 59.7, 38.55, 3, -HALF, locker, { w: 0.8, d: 0.45, h: 1.75, color: '#3f8a86', ajar: true });
    put(A, 59.7, 39.5, 3, -HALF, locker, { w: 0.8, d: 0.45, h: 1.75, color: '#3f8a86' });
    put(A, 53.3, 43.7, 3, HALF, shrine);
    put(A, 53.4, 42.4, 3, HALF, pottedPlant, { kind: 'spiky', potColor: '#3a8a9a' });
    put(A, 55.0, 44.3, 3, 0.15, screen, { n: 2, pw: 0.55, h: 1.55 });
    flatRug(A, 55.8, 41.5, 3, 2.4, 1.6, rugA, 3);
    washAt(A, 55.5, 40.2, 3, 0, { w: 2.2, h: 1.65 });
    // the step down from the corridor into the cell (its door in the cell's south wall, cells 56–57 of z 45)
    const st = W(57, 44.55), sy = 4 * CH;
    A.k.at(st.x - o.x, 0, st.z - o.z, 0, () => A.k.add(rbox(1.7, CH + 0.02, 0.78, 0.02), MAT.wood('dark'), 0, 3 * CH + CH / 2, 0));
    col(A, { type: 'box', x: st.x, z: st.z, hw: 0.85, hd: 0.39, rot: 0, top: sy, noStand: false });
  }
  {
    const A = area('cellB');
    const pts = [[52.3, 53.25], [53.85, 53.25], [55.35, 53.25], [55.35, 51.0]];
    const y0 = Y(54, 54.5, 3);
    A.k.at(0, y0, 0, 0, () => ropeLine(A.k, pts.map(([x, z]) => L(x, z))));
    for (let i = 1; i < pts.length; i++) {
      const a = W(...pts[i - 1]), b = W(...pts[i]);
      col(A, { type: 'box', x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, hw: Math.max(0.06, Math.abs(b.x - a.x) / 2), hd: Math.max(0.06, Math.abs(b.z - a.z) / 2), rot: 0, top: y0 + 0.95 });
    }
    // the plaque on a little brass stand by the rope's corner (it says only "CELL 2": the story's words go here)
    at(A, 55.85, 53.75, y0, -0.5, () => { const k = A.k; k.add(cyl(0.02, 0.03, 1.0, 6), MAT.brass(), 0, 0.5, 0); k.add(rbox(0.34, 0.24, 0.03, 0.01), MAT.brass(), 0, 1.02, 0, 0, { rx: -0.6 }); k.add(plane(0.3, 0.2), MAT.map(plaqueTex(['CELL 2'], { w: 256, h: 160 }), 0.5), 0, 1.03, 0.017, 0, { rx: -0.6 }); });
    col(A, { type: 'cyl', ...(() => { const w = W(55.85, 53.75); return { x: w.x, z: w.z }; })(), r: 0.1, top: y0 + 1.1 });
    put(A, 58.6, 56.8, 3, 0, pottedPlant, { kind: 'leafy', potColor: '#d8608a', s: 0.9 });
  }
  // ---- the foreman's office (LBA1's office: the desk the grid keeps at x 47–50, z 20–23; the clone statues)
  {
    const A = area('office');
    const dy = Y(48.6, 21.6, 14);
    at(A, 48.6, 21.6, dy, 0, () => { const k = A.k; ledger(k, -0.4, 0, 0.1, 0.2); papers(k, 0.45, 0, -0.1, 3, 4, 'project'); bookStack(k, 0.95, 0, -0.25, 3, 5); });
    at(A, 47.8, 21.0, dy, 0.4, () => deskLamp(A.k));
    put(A, 49.0, 24.2, 10, Math.PI, officeChair);
    // the duty board on the back wall, a clock, the filing cabinets
    at(A, 52.0, 20.15, Y(52, 20.6, 10) + 1.55, 0, () => noticeBoard(A.k, 1.6, 0.9, 6));
    at(A, 53.9, 20.12, Y(53.9, 20.6, 10) + 2.1, 0, () => wallClock(A.k, 0.2));
    for (const z of [26.6, 27.5]) put(A, 46.4, z, 10, HALF, filingCabinet, { color: '#5a6a5a' });
    // the clone statues pushed into the corner by the stair, the workers' coats hung on them
    for (const [x, z, ry, c] of [[61.4, 27.8, -2.4, '#3a5a7a'], [60.1, 28.5, -2.9, '#8a4a3a']]) {
      const s = put(A, x, z, 10, ry, cloneStatue);
      A.k.at(s.lx, s.y + 1.5, s.lz, ry, () => coat(A.k, { c }));
    }
    flatRug(A, 55.0, 24.6, 10, 3.4, 2.4, rugB, 5);
  }
  // ---- the service hall at the side stair: the project's tool rack and work boots, crates of "pipe fittings", the
  //      Council's plaque at the old bricking (on the hall's east wall, beside the broken stub)
  {
    const A = area('service');
    put(A, 6.4, 37.45, 5, 0, toolRack, { w: 1.7 });
    for (const [x, z, s] of [[2.2, 37.9, 0.7], [3.15, 37.85, 0.6]]) put(A, x, z, 5, 0.2, (k) => crate(k, s));
    const pw = W(13.97, 41.4), py = Y(13, 41.4, 5);
    A.k.at(pw.x - o.x, py + 1.2, pw.z - o.z, -HALF, () => { const k = A.k; k.add(rbox(0.8, 0.54, 0.04, 0.01), MAT.brass(), 0, 0, 0); k.add(plane(0.74, 0.48), MAT.map(plaqueTex(COUNCIL_PLAQUE), 0.45), 0, 0, 0.022); });
  }
  // ---- the upper walk to the front door (on the slab over the ward: it fades with the ward's lid), and the doors in
  //      LBA1's tall portal (cells 37, 9–14): two leaves, lattice side lights, a glowing fanlight
  const up = area('upper', true);
  {
    const A = up;
    flatRug(A, 27.0, 11.5, 14, 9.5, 1.5, rugA, 9);
    put(A, 33.6, 15.2, 14, Math.PI, bench, { w: 1.6 });
    put(A, 34.0, 6.9, 14, 0, coatStand);
    put(A, 31.8, 7.0, 14, 0, pottedPlant, { kind: 'spiky', s: 1.2, potColor: '#3a8a9a' });
    put(A, 31.8, 16.2, 14, 0, pottedPlant, { kind: 'leafy', s: 1.2, potColor: '#d8608a' });
    const fy = Y(36.4, 11.5, 14), d = W(37.5, 11.5), H = 3.4, ww = 5 * 0.867;
    A.k.at(d.x - o.x, fy, d.z - o.z, HALF, () => {
      const k = A.k, wd = MAT.paint('#2f5f5a', 0.5), wdd = MAT.paint('#1f403d', 0.5), br = MAT.brass(), lat = latticeM(), fr = MAT.wood('dark');
      for (const s of [-1, 1]) {
        k.add(rbox(0.86, 2.6, 0.08, 0.01), wd, s * 0.45, 1.3, 0);
        for (const py of [0.7, 1.85]) k.add(rbox(0.6, py < 1 ? 0.85 : 1.05, 0.03, 0.01), wdd, s * 0.45, py, -0.05);
        k.add(cyl(0.018, 0.018, 0.34, 6), br, s * 0.1, 1.2, -0.08);
        k.add(rbox(0.12, H, 0.16, 0.02), fr, s * 0.96, H / 2, 0);
        for (const sd of [-1, 1]) k.add(plane(ww / 2 - 1.08, 2.5), lat, s * (ww / 4 + 0.51), 1.4, sd * 0.01, sd > 0 ? 0 : Math.PI);
        k.add(rbox(ww / 2 - 1.04, 0.1, 0.12, 0.02), fr, s * (ww / 4 + 0.51), 2.7, 0);
      }
      k.add(rbox(ww, 0.14, 0.18, 0.02), fr, 0, 2.67, 0);
      for (const sd of [-1, 1]) k.add(plane(ww - 0.1, H - 2.78), warmGlow(), 0, 2.74 + (H - 2.74) / 2, sd * 0.01, sd > 0 ? 0 : Math.PI);
    });
    col(A, { type: 'box', x: d.x, z: d.z, hw: 0.14, hd: ww / 2 + 0.05, rot: 0, top: fy + H });
  }
  // ---- Vesk's office: LBA1's sealed room behind the corridor (x 37–43, z 20–29), its door broken through the
  //      corridor wall (cells 41–42 of z 30, lba1places.js carve), the brick filled in under the office's floor (x 44)
  {
    const A = area('vesk');
    const vd = put(A, 40.0, 25.0, 5, Math.PI, desk, { w: 1.7, d: 0.85, leather: '#5a2a2a' });
    put(A, 40.0, 23.8, 5, 0, officeChair, { color: '#3a2a22' });
    at(A, 40.0, 25.0, vd.y + 0.78, Math.PI, () => {
      const k = A.k; k.at(0.55, 0, 0.1, 0, () => deskLamp(k, { shade: '#7a2a22' }));
      k.at(-0.3, 0, 0.05, 0.25, () => { k.add(rbox(0.22, 0.04, 0.3, 0.008), MAT.leather('#3a2010'), 0, 0.02, 0); k.add(rbox(0.04, 0.045, 0.06, 0.006), MAT.brass(), 0.11, 0.022, 0); });   // (his notebook)
      papers(k, 0.2, 0, -0.15, 2, 9, 'form');
    });
    // FunFrock's old plans pinned on the back wall, a strongbox, an open crate of crystals, a cabinet
    at(A, 40.0, 20.12, Y(40, 20.6, 5) + 1.7, 0, () => { const k = A.k; k.add(rbox(1.8, 1.1, 0.02, 0.005), MAT.flat('#cfdce8', 0.9), 0, 0, 0); k.add(plane(1.7, 1.0), MAT.map(plansTex(), 0.9), 0, 0, 0.012); });
    put(A, 37.9, 27.6, 5, HALF, chest, { w: 0.8, d: 0.55, h: 0.5, pal: 'dark', band: MAT.iron() });
    put(A, 42.9, 26.4, 5, -HALF, zcrate, { s: 0.7, open: true });
    put(A, 42.9, 22.8, 5, -HALF, filingCabinet, { color: '#3a3a40' });
    const fw = W(44.5, 25.0), fy = Y(43, 25, 5), fh = 10 * CH - fy + 0.05;
    A.k.at(fw.x - o.x, fy, fw.z - o.z, 0, () => A.k.add(rbox(0.86, fh, 8.7, 0.02), MAT.stone('grey', 1), 0, fh / 2, 0));
    col(A, { type: 'box', x: fw.x, z: fw.z, hw: 0.43, hd: 4.35, rot: 0, top: 10 * CH + 0.05, noStand: false });
  }
  // his door (locked: shut at the start), hinged on the opening's west side, swinging into the office; under it a
  // threshold (the grid has no floor under the wall there)
  const dh = W(41, 30.5), dy = Y(41.5, 31.5, 5), dw = 2 * 0.867;
  { const t = W(42, 30.5), A = groups.vesk; A.k.at(t.x - o.x, 0, t.z - o.z, 0, () => A.k.add(rbox(dw, 0.3, 0.86, 0.02), MAT.stone('grey', 1), 0, dy - 0.15, 0));
    physics.add({ type: 'box', x: t.x, z: t.z, hw: dw / 2, hd: 0.43, rot: 0, top: dy, bottom: dy - 0.4 }); }
  const pivot = new THREE.Group(); pivot.name = 'asylum:veskdoor'; pivot.position.set(dh.x - o.x, dy, dh.z - o.z); R.group.add(pivot);
  { const k = new Kit(pivot), wd = MAT.paint('#4a3a30', 0.5);
    k.add(rbox(dw - 0.04, 2.1, 0.08, 0.01), wd, dw / 2, 1.05, 0);
    for (const py of [0.6, 1.55]) k.add(rbox(dw - 0.34, 0.7, 0.03, 0.01), MAT.paint('#3a2c24', 0.5), dw / 2, py, 0.05);
    k.add(rbox(0.16, 0.24, 0.03, 0.01), MAT.brass(), dw - 0.18, 1.05, 0.06); k.add(sphere(0.035, 8, 6), MAT.brass(), dw - 0.18, 1.0, 0.09);
    k.flush(); }
  const dShut = physics.add({ type: 'box', x: dh.x + dw / 2, z: dh.z, hw: dw / 2, hd: 0.12, rot: 0, top: dy + 2.2, seeThrough: true, noStand: true });
  const dOpen = physics.add({ type: 'box', x: dh.x + 0.06, z: dh.z - dw / 2, hw: 0.08, hd: dw / 2, rot: 0, top: dy + 2.2, seeThrough: true, noStand: true });
  R.colliders.push(dShut, dOpen);
  const door = { open: false, t: 0 };
  const apply = () => { pivot.rotation.y = door.t * HALF * 0.94; dShut.enabled = door.t < 0.5; dOpen.enabled = door.t >= 0.5; };
  door.setOpen = (b, instant = false) => { door.open = !!b; if (instant) door.t = door.open ? 1 : 0; apply(); };
  door.setOpen(false, true);
  R.updaters.push((dt) => { const g = door.open ? 1 : 0; if (door.t === g) return; door.t = door.open ? Math.min(1, door.t + dt * 1.4) : Math.max(0, door.t - dt * 1.4); apply(); });

  // ---- Vesk's store: the old boiler room below the side stair (LBA1's low hall, floor 1, the boiler at x 9–11).
  //      Stacks of crates stamped ZEELICH make two aisles round a middle stack (cover, a way round); two guard posts:
  //      at the stair head (where LBA1's clone stood) and deep in by the boiler; the humming crate behind the boiler.
  const store = area('store', true);
  const storeState = { cleared: false };
  const hum = { on: true };
  {
    const A = store;
    const stack = (x, z, ry, n, seed) => {
      const y = Y(x, z, 1);
      const P = [[-0.4, 0, 0], [0.4, 0, 0], [-0.05, 0.7, 0], [0.2, 0, 0.78]];   // (two side by side, one on top, one in front)
      at(A, x, z, y, ry, () => { for (let i = 0; i < n; i++) { const s = 0.66 + ((seed * 7 + i * 3) % 5) * 0.025; A.k.at(P[i][0], P[i][1], P[i][2], ((i * 0.37 + seed) % 0.4) - 0.2, () => zcrate(A.k, { s, open: i === 3 })); } });
      const w = W(x, z), c = Math.cos(ry), sn = Math.sin(ry), dz = n > 3 ? 0.39 : 0;
      col(A, { type: 'box', x: w.x + sn * dz, z: w.z + c * dz, hw: 0.82, hd: 0.42 + dz, rot: ry, top: y + (n > 2 ? 1.42 : 0.74) });
    };
    stack(6.5, 48.4, 0, 3, 1); stack(6.4, 52.6, 0, 4, 2); stack(4.2, 54.8, 0, 2, 3); stack(13.0, 47.2, HALF, 3, 4); stack(8.6, 55.1, 0, 3, 5);
    put(A, 4.2, 44.1, 5, 0, guardPost);
    put(A, 12.9, 50.3, 1, -HALF, guardPost);
    put(A, 1.45, 53.0, 1, HALF, toolRack, { w: 1.2 });
    // the humming crate: its slats glow faintly, a shimmer rises off it (hum.setOn)
    const hx = 13.1, hz = 54.6, hy = Y(hx, hz, 1);
    const s = put(A, hx, hz, 1, -0.3, zcrate, { s: 0.8 });
    const glowG = new THREE.Group(); glowG.name = 'asylum:hum'; A.g.add(glowG);
    const gk = new Kit(glowG);
    gk.at(s.lx, hy, s.lz, -0.3, () => {
      const gm = MAT.glow('#ffd8a0', '#ff9a40', 2.2);
      for (const sz of [-1, 1]) for (const yy of [0.22, 0.4, 0.58]) { gk.add(rbox(0.68, 0.045, 0.012, 0.004), gm, 0, yy, sz * 0.405); gk.add(rbox(0.012, 0.045, 0.68, 0.004), gm, sz * 0.405, yy, 0); }
      gk.add(rbox(0.66, 0.012, 0.05, 0.004), gm, 0, 0.805, 0.12); gk.add(rbox(0.66, 0.012, 0.05, 0.004), gm, 0, 0.805, -0.14);
    });
    gk.flush();
    const hw = W(hx, hz); let acc = 0;
    hum.setOn = (b) => { hum.on = !!b; glowG.visible = hum.on; };
    R.updaters.push((dt, t, fx) => {
      if (!fx || !hum.on || storeState.cleared) return; acc += dt * 1.6;
      while (acc >= 1) { acc -= 1; fx.spawn({ x: hw.x + (Math.random() - 0.5) * 0.7, y: hy + 0.35 + Math.random() * 0.4, z: hw.z + (Math.random() - 0.5) * 0.7, vy: 0.12, vx: 0, color: '#ffcf90', a: 0.16, s0: 0.12, s1: 0.4, life: 1.4, add: 0.8, cell: 0, fi: 0.3, fo: 0.6, drift: 0.05 }); }
    });
  }
  storeState.setCleared = (b) => { storeState.cleared = !!b; store.g.visible = !storeState.cleared; for (const c of store.cols) c.enabled = !storeState.cleared; };

  // ---- the ward's lid carries what stands on its slab: the upper walk's things and the front doors fade with it
  const wardLid = R.lids?.find((l) => !l.over && !l.name && l.zone === 1);
  if (wardLid) R.updaters.push(() => { up.g.visible = wardLid.f > 0.5; });

  for (const k of kits) k.flush();
  const casts = new Set([MAT.wood('honey'), MAT.wood('dark'), MAT.wood('pale'), MAT.stone('grey', 1)]);
  for (const { group } of kits) for (const m of group.children) if (m.isMesh) m.castShadow = casts.has(m.material);

  // ---- the people's places (the story's: R.npcSpots), at LBA1's actors where they fit (lba1: the original spot)
  const S = (x, yc, z, a, role, lba1, extra = {}) => { const w = W(x, z); return { x: w.x, y: Y(x, z, yc), z: w.z, a, role, lba1, ...extra }; };
  R.npcSpots = {
    foreman: S(55.0, 10, 24.34, Math.PI, 'the foreman, in his office', [55, 10, 24.34]),
    worker1: S(58.07, 10, 23.2, -2.6, 'a worker reporting to the foreman', [58.07, 10, 21.75]),
    worker2: S(47.0, 10, 25.6, Math.PI * 0.75, 'a worker by the old register', [46.41, 10, 23.34]),
    cook: S(18.7, 5, 21.3, -HALF, "the cook at the old nurses' counter", [18, 5, 21]),
    worker3: S(15.6, 14, 3.9, Math.PI * 0.85, 'a worker on the upper walk', [14, 14, 4.09]),
    worker4: S(22.0, 5, 24.25, 0, 'a worker at the mess table, off shift (on the bench)', null, { pose: 'sit' }),
    sleeper: S(10.5, 5, 12, HALF, 'a sleeper in a lower bunk (a: from head to feet)', [14.06, 5, 10.28], { pose: 'lie' }),
    guard1: S(2.4, 5, 45.6, 0, "Vesk's guard at the head of the store's stair", [2, 5, 45.88]),
    guard2: S(11.6, 1, 49.2, -HALF, "Vesk's guard deep in the store, by the boiler", null),
  };
  R.npcSpots.sleeper.y = Y(10.5, 12, 5) + 0.15 + 0.17;   // (on the lower bunk's mattress, on the plinth)
  R.npcSpots.worker4.y = Y(22.0, 24.25, 5) + 0.47;        // (on the bench)
  // ---- the story's handles
  const reg = R.searches.find((s) => s.id === 'asylum_register');
  R.asylumHostel = {
    spots: {
      hiddenCrate: spot(12.3, 54.0, 1.3, 1), veskDesk: spot(40.0, 25.0, 1.3), plaque: spot(12.9, 41.4, 1.2),
      register: reg ? { x: reg.x, z: reg.z, r: reg.r } : null, cellPlaque: spot(55.5, 54.4, 1.0, 3),
    },
    veskOffice: { door }, store: storeState, hum, groups,
  };
}
