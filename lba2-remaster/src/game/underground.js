// Chapter 3 — "The Shell": the underground region under Zeelich's drill shaft. Five interior rooms built
// with the interiors' RoomBuilder (fixed iso camera, far walls drawn, near walls cut down to a rim), placed
// far from everything else at x = 1800…2200, z = 0.
//
//   c3shaft   the bottom of the drill shaft: the lift cage Vesk rode down, the bore column, raw rock
//   c3deep    the project's deep installation: heat exchanger, cooling valves, catwalk, drones' floor
//   c3gallery the crystal galleries: giant crystals around a chasm, stepping stones raised by pillars
//   c3sendell Sendell's chamber: round, old smooth stone, a still pool with light rising from it
//   c3core    the core: the bore head pressing into the cracked shell, three conversion pylons
//
// CONTRACT for the story (src/game/story/chapter3.js). Every x/z is a WORLD coordinate; y is world height.
//   all rooms   R.spawn {x,z,a}, R.exits [{x,z,r,to}], R.music, R.ballTargets, R.searches, R.updaters
//   c3shaft     exits 'c3-up' (lift pad), 'c3-deep' (tunnel); R.lift {x,z} pad centre
//   c3deep      R.valves [{id:'A'|'B'|'C', x,z,y, open, setOpen(b)}]; R.diagram {x,z} (+ searches id 'diagram')
//               R.coolDoor {x,z, isOpen, open(instant?)} — its collider is disabled when opened
//               R.patrol [[x,z]…] drone loop on the lower floor; R.cover [{x,z,r}]
//               R.ballSwitch {x,y,z, on, setOn(b)} (ballTargets entry {…, ballSwitch:true})
//               R.ladder {x,z, lowered, lower(instant?)}: the hinged stair to the upper catwalk (valve C)
//               R.upperY catwalk height; exits 'c3-shaft' (entrance), 'c3-gallery' (behind the shutter)
//   c3gallery   R.pillars [{i,x,y,z, lit, setLit(b)}] (ballTargets {…, pillar:i})
//               R.stones {sets:[[…stone]], raised:[b,b,b], raise(i, instant?), group}; R.mites [{x,z}]
//               R.deckY walking height; exits 'c3-deep' (start side), 'c3-sendell' (far side)
//   c3sendell   R.sendellSpot {x,y,z}; R.presence {group, setVisible(b), setIntensity(0..1)}
//               exits 'c3-gallery', 'c3-core'
//   c3core      R.pylons [{i,x,y,z, state, setState(0|1|2), target:{x,y,z}}] (ballTargets {…, pylon:i})
//               R.reflectors [{x,y,z, nx,nz, hw, y0,y1, collider}] brass bank-shot panels: a room updater
//               mirrors the magic ball off them (R.reflectBall(ball, dt) does the same on demand)
//               R.console {x,z}; R.npcSpots {vesk}; R.bossSpot {x,y,z}; R.arena {x0,z0,x1,z1}
//               R.field {level, setLevel(0..1)}; R.drill {spin, mode, setSpin(rad/s), setMode('drill'|'shield')}
//               exit 'c3-sendell'
import * as THREE from 'three';
import { RoomBuilder, glowSprite, twoSided, sag } from './interiors.js';
import { Kit, MAT, M, rbox, plane, cyl, sphere, torus, lathe, pipe, slab, canvasTex } from './props.js';
import * as P from './props.js';
import { rng, smoothstep, lerp } from '../engine/math.js';

// ================================================================ shared kit
const GC = new Map();
const cached = (key, make) => { let g = GC.get(key); if (!g) { g = make(); GC.set(key, g); } return g; };
const TEAL = '#3f8a86';
const hash3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const h = (a, b, c) => hash3(ix + a, iy + b, iz + c);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(h(0, 0, 0), h(1, 0, 0), u), l(h(0, 1, 0), h(1, 1, 0), u), v), l(l(h(0, 0, 1), h(1, 0, 1), u), l(h(0, 1, 1), h(1, 1, 1), u), v), w);
}
const tiled = (t, rx = 1, ry = 1) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t; };
const stdM = (o, tile = 0, extra = {}) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.85, ...o }); m.userData.tile = tile; Object.assign(m.userData, extra); return m; };

// --- faceted rock (LBA2 cave rock: flat facets, stratified paint, a flat base sitting on the floor)
function rockGeo(seed, { detail = 1, rough = 0.32, flat = 0.3, freq = 1.4 } = {}) {
  return cached(`rk${seed}|${detail}|${rough}|${flat}|${freq}`, () => {
    const g = new THREE.IcosahedronGeometry(1, detail);
    const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = vnoise(v.x * freq + seed * 3.7, v.y * freq + seed, v.z * freq - seed * 1.3) * 2 - 1;
      const n2 = vnoise(v.x * freq * 2.3 - seed, v.y * freq * 2.3 + 7, v.z * freq * 2.3 + seed) * 2 - 1;
      v.multiplyScalar(1 + rough * n + rough * 0.4 * n2);
      if (v.y < -flat) v.y = -flat + (v.y + flat) * 0.12;
      p.setXYZ(i, v.x, v.y + flat, v.z);
    }
    g.computeVertexNormals();
    const col = new Float32Array(p.count * 3), N = g.attributes.normal;
    for (let f = 0; f < p.count; f += 3) {
      const up = N.getY(f), t = (0.8 + 0.28 * hash3(f, seed, 3)) * (up > 0.55 ? 1.14 : up < -0.2 ? 0.7 : 1);
      for (let j = 0; j < 3; j++) { col[(f + j) * 3] = t; col[(f + j) * 3 + 1] = t; col[(f + j) * 3 + 2] = t * 1.03; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  });
}
const rockTex = () => M('ugrocktex', () => tiled(canvasTex(256, 256, (x, W, H) => {
  const r = rng(31);
  x.fillStyle = '#8c857f'; x.fillRect(0, 0, W, H);
  // strata: soft bands of lighter and darker rock, slightly wavy
  for (let y = 0; y < H; y += 10 + r() * 18) {
    const k = r(), c = k < 0.4 ? 'rgba(52,40,46,0.35)' : k < 0.75 ? 'rgba(206,194,184,0.3)' : 'rgba(120,90,140,0.25)';
    x.fillStyle = c; x.beginPath(); x.moveTo(0, y);
    for (let xx = 0; xx <= W; xx += 16) x.lineTo(xx, y + Math.sin(xx * 0.05 + y) * 3);
    const h = 3 + r() * 8; for (let xx = W; xx >= 0; xx -= 16) x.lineTo(xx, y + h + Math.sin(xx * 0.05 + y) * 3);
    x.fill();
  }
  for (let i = 0; i < 26; i++) { const px = r() * W, py = r() * H; x.strokeStyle = 'rgba(25,25,35,0.45)'; x.lineWidth = 1 + r(); x.beginPath(); x.moveTo(px, py); let cx = px, cy = py; for (let j = 0; j < 5; j++) { cx += (r() - 0.5) * 24; cy += r() * 14; x.lineTo(cx, cy); } x.stroke(); }
  for (let i = 0; i < 700; i++) { x.fillStyle = r() < 0.5 ? 'rgba(220,225,240,0.25)' : 'rgba(20,20,30,0.3)'; x.fillRect(r() * W, r() * H, 1.5, 1.5); }
})));
const rockMat = (color = '#8a90a4') => M('ugrock' + color, () => stdM({ map: rockTex(), color, vertexColors: true, roughness: 0.93, flatShading: true }, 2.2));
// natural cave floor: pale-dark rock with soft patches, cracks and grit (1 tile = 4 m)
const floorTex = (base, alt, key) => M('ugfloortex' + key, () => tiled(canvasTex(512, 512, (x, W, H) => {
  const r = rng(key.length * 13 + 5);
  x.fillStyle = base; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) {
    const px = r() * W, py = r() * H, rr = 20 + r() * 70, g = x.createRadialGradient(px, py, 0, px, py, rr);
    const c = r() < 0.5 ? alt : 'rgba(255,255,255,0.10)';
    g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) { x.save(); x.translate(ox, oy); x.fillStyle = g; x.fillRect(px - rr, py - rr, rr * 2, rr * 2); x.restore(); }
  }
  // flat slabs of rock with dark seams
  for (let i = 0; i < 34; i++) {
    const px = r() * W, py = r() * H, n = 5 + Math.floor(r() * 3), rad = 26 + r() * 40;
    x.beginPath();
    for (let j = 0; j <= n; j++) { const a = (j / n) * Math.PI * 2, rr = rad * (0.7 + r() * 0.4); x.lineTo(px + Math.cos(a) * rr, py + Math.sin(a) * rr * 0.8); }
    x.strokeStyle = 'rgba(15,15,25,0.5)'; x.lineWidth = 2.2; x.stroke();
    x.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},0.05)`; x.fill();
  }
  for (let i = 0; i < 2600; i++) { x.fillStyle = r() < 0.5 ? 'rgba(230,230,245,0.18)' : 'rgba(10,10,20,0.28)'; const s = 1 + r() * 2; x.fillRect(r() * W, r() * H, s, s); }
})));
const floorMat = (base, alt, key) => M('ugfloor' + key, () => stdM({ map: floorTex(base, alt, key), roughness: 0.9 }, 4));

// --- crystals: hexagonal prisms with a pointed tip (same species as the well's)
const crystalGeo = (sides = 6) => cached('cry' + sides, () => { const g = new THREE.LatheGeometry([[0.001, -0.05], [0.8, 0], [1, 0.12], [1, 0.72], [0.001, 1]].map(([a, b]) => new THREE.Vector2(a, b)), sides); return g.toNonIndexed(); });
const crystalMat = (c, e, k, op = 0.9) => M(`ugcry${c}${e}${k}${op}`, () => stdM({ color: c, emissive: e, emissiveIntensity: k, roughness: 0.12, metalness: 0.1, transparent: op < 1, opacity: op, flatShading: true }, 0, { noShadow: true }));
const CYAN = () => crystalMat('#aef6ff', '#1ab8e8', 0.9), VIOLET = () => crystalMat('#e0c0ff', '#8a3aef', 0.8), DIM = () => crystalMat('#7a8aa8', '#203a5a', 0.35, 1);
// cluster of crystals growing from (0,0,0) out along +y (tilt it with the kit), seed-stable
function crystals(k, n, s, seed, mats, spread = 0.5) {
  const r = rng(seed * 97 + 3);
  for (let i = 0; i < n; i++) {
    const big = i === 0, a = r() * Math.PI * 2, d = big ? 0 : (0.15 + r() * spread) * s;
    const h = s * (big ? 1.6 + r() * 0.6 : 0.6 + r() * 0.9), rad = s * (big ? 0.24 : 0.1 + r() * 0.1);
    const m = mats[i % mats.length];
    k.add(crystalGeo(), m, Math.cos(a) * d, -0.05 * s, Math.sin(a) * d, r() * 3, { rx: Math.cos(a) * (big ? 0.15 : 0.35 + r() * 0.4), rz: -Math.sin(a) * (big ? 0.15 : 0.35 + r() * 0.4), sx: rad, sy: h, sz: rad });
  }
}

// --- the Joint Project's machinery language: teal plates, brass flanges, hazard stripes, tread decks
const teal = () => MAT.plates(TEAL, 1), tealP = () => MAT.paint(TEAL, 0.45), brass = () => MAT.brass(), iron = () => MAT.iron();
const deck = () => MAT.tread('#7e8a90'), hazard = () => MAT.hazard(), dark = () => MAT.paint('#26302e', 0.5), cable = () => MAT.flat('#18181c', 0.6);
// I-beam along local x
function ibeam(k, L, h = 0.32, w = 0.22, m = null) {
  m = m || tealP();
  k.add(rbox(L, h - 0.06, 0.05, 0.012), m, 0, 0, 0);
  for (const s of [-1, 1]) k.add(rbox(L, 0.045, w, 0.012), m, 0, s * (h / 2 - 0.022), 0);
}
// vertical I-beam column of height h (web facing local x)
function column(k, h, w = 0.26, m = null) {
  m = m || tealP();
  k.add(rbox(0.05, h, w - 0.04, 0.012), m, 0, h / 2, 0);
  for (const s of [-1, 1]) k.add(rbox(w, h, 0.045, 0.012), m, 0, h / 2, s * (w / 2 - 0.02));
  k.add(rbox(w + 0.14, 0.06, w + 0.14, 0.015), iron(), 0, 0.03, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(cyl(0.025, 0.025, 0.05, 6), brass(), sx * (w / 2 + 0.03), 0.07, sz * (w / 2 + 0.03));
}
// project wall lamp: bracket arm and a caged lamp, facing +z (wall at -z)
function wallLamp(k, { glow = '#fff2d0', shade = TEAL, arm = 0.35 } = {}) {
  k.add(rbox(0.16, 0.24, 0.04, 0.012), iron(), 0, 0, 0.02);
  k.add(pipe([[0, 0, 0.03], [0, 0, arm - 0.05], [0, -0.06, arm]], 0.022, 0.05, 6), iron(), 0, 0, 0);
  k.add(lathe([[0.001, 0.16], [0.05, 0.15], [0.17, 0.02], [0.18, 0], [0.16, -0.005], [0.04, 0.13], [0.001, 0.14]], 14), MAT.flat(shade, 0.45, { metalness: 0.3, side: THREE.DoubleSide }), 0, -0.2, arm);
  k.add(sphere(0.085, 10, 8), MAT.glow(glow, '#ffd890', 2.0), 0, -0.2, arm);
  for (let i = 0; i < 4; i++) k.add(torus(0.12, 0.008, 4, 4, Math.PI), iron(), 0, -0.2, arm, (i * Math.PI) / 4, { rx: 0 });
}
// floodlight on a tripod, head facing +z, tilted down
function floodlight(k, { h = 1.7, tilt = 0.45 } = {}) {
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; k.add(cyl(0.02, 0.025, h * 1.04, 6), iron(), Math.sin(a) * 0.28, h / 2, Math.cos(a) * 0.28, 0, { rx: -Math.cos(a) * 0.17, rz: Math.sin(a) * 0.17 }); }
  k.add(cyl(0.035, 0.035, 0.4, 8), iron(), 0, h, 0);
  k.at(0, h + 0.25, 0, 0, () => {
    k.add(rbox(0.56, 0.42, 0.24, 0.05), tealP(), 0, 0, 0, 0, { rx: tilt });
    k.add(plane(0.44, 0.3), MAT.glow('#fff8e0', '#ffe0a0', 2.2), 0, -Math.sin(tilt) * 0.125, Math.cos(tilt) * 0.125, 0, { rx: tilt });
    k.add(rbox(0.6, 0.05, 0.08, 0.015), brass(), 0, 0.23, 0.08, 0, { rx: tilt });
    for (const s of [-1, 1]) k.add(rbox(0.04, 0.3, 0.1, 0.01), iron(), s * 0.31, -0.04, 0);
  });
  return { r: 0.35, top: h + 0.5 };
}
// a painted project sign: teal plate, hazard border, stencilled cream lettering (and the emblem)
const signTex = (lines, { w = 512, h = 192, bg = '#2a5e5a', fg = '#efe2bf', emblem = true, arrow = 0 } = {}) => M('ugsign' + lines.join('|') + w + h + bg + arrow, () => canvasTex(w, h, (x, W, H) => {
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  const r = rng(lines.join('').length);
  for (let i = 0; i < 24; i++) { const px = r() * W, py = r() * H, rr = 10 + r() * 40, g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, 'rgba(0,0,0,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
  x.save(); x.beginPath(); x.rect(0, 0, W, 16); x.rect(0, H - 16, W, 16); x.clip();
  x.fillStyle = '#1e1e22'; x.fillRect(0, 0, W, H); x.fillStyle = '#e8b830';
  for (let i = -2; i < W / 20 + 2; i++) { x.beginPath(); x.moveTo(i * 28, 0); x.lineTo(i * 28 + 14, 0); x.lineTo(i * 28 + 14 + H, H); x.lineTo(i * 28 + H, H); x.fill(); }
  x.restore();
  for (const [px, py] of [[10, 26], [W - 10, 26], [10, H - 26], [W - 10, H - 26]]) { x.fillStyle = '#9ab8b0'; x.beginPath(); x.arc(px, py, 4, 0, 7); x.fill(); }
  let x0 = 24;
  if (emblem) {
    const cy = H / 2, rr = H * 0.26; x0 = 28 + rr * 2.4;
    x.strokeStyle = '#e0b25a'; x.lineWidth = 5; x.beginPath(); x.arc(20 + rr * 1.2, cy, rr * 1.05, Math.PI * 0.15, Math.PI * 0.85, true); x.stroke();
    const g = x.createRadialGradient(20 + rr * 1.2, cy, 2, 20 + rr * 1.2, cy, rr * 0.75); g.addColorStop(0, '#e8ffff'); g.addColorStop(1, '#1a8aa0'); x.fillStyle = g; x.beginPath(); x.arc(20 + rr * 1.2, cy, rr * 0.72, 0, 7); x.fill();
  }
  x.fillStyle = fg; x.textBaseline = 'middle';
  const lh = (H - 40) / lines.length;
  lines.forEach((t, i) => { const fs = Math.min(lh * (i === 0 ? 0.8 : 0.62), 64); x.font = `bold ${fs}px 'Arial Narrow', Arial, sans-serif`; x.fillText(t, x0, 20 + lh * (i + 0.5)); });
  if (arrow) { x.save(); x.translate(W - 50, H / 2); x.rotate(arrow > 0 ? 0 : Math.PI); x.fillStyle = fg; x.beginPath(); x.moveTo(-22, -14); x.lineTo(4, -14); x.lineTo(4, -28); x.lineTo(30, 0); x.lineTo(4, 28); x.lineTo(4, 14); x.lineTo(-22, 14); x.fill(); x.restore(); }
}));
const signMat = (lines, o) => { const t = signTex(lines, o); return M('ugsignm' + t.uuid, () => stdM({ map: t, roughness: 0.6, metalness: 0.2 })); };
// riveted sign plate facing +z (centre at origin)
function signPlate(k, w, h, mat) {
  k.add(rbox(w + 0.08, h + 0.08, 0.05, 0.015), iron(), 0, 0, 0.0);
  k.add(plane(w, h), mat, 0, 0, 0.028);
}
// a sagging black cable through points (adds sag to each span)
function cableRun(k, pts, r = 0.03, s = 0.15) {
  const all = [];
  for (let i = 1; i < pts.length; i++) { const seg = sag(pts[i - 1], pts[i], s, 6); if (i > 1) seg.shift(); all.push(...seg); }
  k.add(pipe(all, r, 0.08, 6), cable(), 0, 0, 0);
}
// crates of the project (teal-green, stencil) stacked; returns collider top
function crateStack(B, x, z, ry, sizes) {
  const k = B.k; let y = 0, top = 0;
  sizes.forEach(([w, h, d, c, dr], i) => { k.at(x, y, z, ry + (dr || 0), () => P.cargoCrate(k, { w, h, d, color: c || ['#4a6e62', '#5f8068', '#3f6a70'][i % 3] })); y += h; top = y; });
  const [w0, , d0] = sizes[0];
  B.col(x, z, w0 / 2, d0 / 2, top, { rot: ry, noStand: true });
  return top;
}

// rough cave walls: a backing wall with rock boulders jammed along its inner face (local frame of a
// far wall: run along x from 0..L, inner face at z = 0, facing +z) — call inside k.at(...)
function rockWallRun(k, L, H, seed, mat, { tiers = 2, depth = 1.0, step = 1.5, top = 0.4 } = {}) {
  const r = rng(seed);
  k.add(new THREE.BoxGeometry(L, H, 0.6), mat, L / 2, H / 2, -0.3 - depth * 0.4);
  for (let t = 0; t < tiers; t++) {
    const y0 = t * (H / tiers) * 0.9;
    for (let x = (t % 2) * step * 0.5; x < L + step * 0.4; x += step * (0.75 + r() * 0.45)) {
      const sx = step * (0.65 + r() * 0.35), sy = (H / tiers) * (0.62 + r() * 0.45) * (t === tiers - 1 ? 1 + top : 1), sz = depth * (0.55 + r() * 0.35);
      k.add(rockGeo(Math.floor(r() * 40)), mat, Math.min(Math.max(x, 0.3), L - 0.3), y0, -depth * 0.25 + (r() - 0.5) * 0.15, r() * 6, { sx, sy, sz });
    }
  }
}

// standard cave enclosure: floor, section slab, two tall rock walls (-x, -z), low near rims, colliders
function caveShell(B, { W, D, H, t = 0.7, floor, slabMat, rock, seed = 1, rimH = 0.55, openings = [], inset = 0.55 }) {
  const k = B.k;
  B.W = W; B.D = D; B.H = H;
  k.add(new THREE.BoxGeometry(W + 2 * t, 0.1, D + 2 * t), floor, 0, -0.05, 0);
  k.add(new THREE.BoxGeometry(W + 2 * t, 0.9, D + 2 * t), slabMat, 0, -0.55, 0);
  B.col(0, 0, W / 2, D / 2, 0, { seeThrough: true, bottom: -1 });
  // far walls in their own frames, skipping openings ({wall:'back'|'left', at, w, h})
  const run = (wall, L, ox, oz, ry) => {
    const ops = openings.filter((o) => o.wall === wall).sort((a, b) => a.at - b.at);
    let x = 0, i = 0;
    for (const o of ops) {
      const a = o.at - o.w / 2, b = o.at + o.w / 2;
      if (a - x > 0.2) k.at(ox, 0, oz, ry, () => k.at(x, 0, 0, 0, () => rockWallRun(k, a - x, H, seed + i * 7 + (wall === 'back' ? 0 : 50), rock)));
      // lintel rock over the opening
      k.at(ox, 0, oz, ry, () => { k.add(new THREE.BoxGeometry(o.w + 0.4, H - o.h, 0.8), rock, o.at, o.h + (H - o.h) / 2, -0.7); k.add(rockGeo(seed + i), rock, o.at, o.h + 0.1, -0.5, 0.4, { sx: o.w * 0.75, sy: (H - o.h) * 0.9, sz: 0.7 }); });
      x = b; i++;
    }
    if (L - x > 0.2) k.at(ox, 0, oz, ry, () => k.at(x, 0, 0, 0, () => rockWallRun(k, L - x, H, seed + i * 7 + (wall === 'back' ? 0 : 50), rock)));
  };
  run('back', W + t, -W / 2 - t, -D / 2, 0);
  run('left', D + t, -W / 2, D / 2 + t, Math.PI / 2);
  // near rims: low rock walls with boulders
  const r = rng(seed + 99);
  k.add(new THREE.BoxGeometry(W + 2 * t, rimH, t), rock, 0, rimH / 2, D / 2 + t / 2);
  k.add(new THREE.BoxGeometry(t, rimH, D + t), rock, W / 2 + t / 2, rimH / 2, -t / 2);
  for (let x = -W / 2; x < W / 2 + t; x += 1.1 + r() * 0.6) k.add(rockGeo(Math.floor(r() * 30)), rock, x, rimH * 0.5, D / 2 + t * 0.5, r() * 6, { sx: 0.6 + r() * 0.4, sy: rimH * (0.6 + r() * 0.6), sz: t * 0.75 });
  for (let z = -D / 2; z < D / 2 + t; z += 1.1 + r() * 0.6) k.add(rockGeo(Math.floor(r() * 30)), rock, W / 2 + t * 0.5, rimH * 0.5, z, r() * 6, { sx: t * 0.75, sy: rimH * (0.6 + r() * 0.6), sz: 0.6 + r() * 0.4 });
  // colliders: four walls, with gaps for openings in the far walls
  const t2 = t / 2;
  const colRun = (wall) => {
    const ops = openings.filter((o) => o.wall === wall).sort((a, b) => a.at - b.at);
    const L = wall === 'back' ? W : D;
    let a = -t;
    const seg = (s0, s1) => { if (s1 - s0 < 0.05) return; if (wall === 'back') B.col(-W / 2 + (s0 + s1) / 2, -D / 2 - t2 + inset / 2, (s1 - s0) / 2, t2 + inset / 2, H); else B.col(-W / 2 - t2 + inset / 2, D / 2 - (s0 + s1) / 2, t2 + inset / 2, (s1 - s0) / 2, H); };
    for (const o of ops) { const at = wall === 'back' ? o.at - t : o.at - t; seg(a, at - o.w / 2); a = at + o.w / 2; }
    seg(a, L + t);
  };
  colRun('back'); colRun('left');
  B.col(W / 2 + t2, 0, t2, D / 2 + t, H);
  B.col(0, D / 2 + t2, W / 2 + t, t2, H);
}
// scatter of pebbles and small rocks over free floor (avoid: [[x,z,r],…])
function pebbles(k, W, D, n, seed, mat, avoid = []) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = (r() - 0.5) * (W - 1), z = (r() - 0.5) * (D - 1);
    if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
    const s = 0.08 + r() * r() * 0.32;
    k.add(rockGeo(Math.floor(r() * 30), { detail: 0 }), mat, x, -0.02, z, r() * 6, { sx: s * (1 + r()), sy: s * 0.8, sz: s });
  }
}
// rising steam / dust motes as a Points cloud around sources [[x,z,r],…]
function motes(B, sources, { n = 60, color = '#e8f4ff', size = 0.3, op = 0.3, hmax = 3, speed = 0.5, y0 = 0 } = {}) {
  const sp = new Float32Array(n * 3), sd = [];
  for (let i = 0; i < n; i++) { const s = sources[i % sources.length]; sd.push({ x: s[0] + (Math.random() - 0.5) * s[2], z: s[1] + (Math.random() - 0.5) * s[2], y: Math.random() * hmax, v: speed * (0.6 + Math.random() * 0.8) }); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size, transparent: true, opacity: op, depthWrite: false }));
  B.group.add(pts);
  B.room.updaters.push((dt) => {
    for (let i = 0; i < n; i++) { const s = sd[i]; s.y += s.v * dt; if (s.y > hmax) s.y = 0; sp[i * 3] = s.x + Math.sin(s.y * 2 + i) * 0.15; sp[i * 3 + 1] = y0 + s.y; sp[i * 3 + 2] = s.z; }
    g.attributes.position.needsUpdate = true;
  });
  return pts;
}
// additive light shaft (a soft open cone)
function lightShaft(B, x, y, z, r0, r1, h, color, op) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, 24, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(x, y, z); B.group.add(m);
  return m;
}
// helical stripes for turning drill pipe
const drillTex = () => M('ugdrilltex', () => tiled(canvasTex(128, 256, (x, W, H) => {
  const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#5a6068'); g.addColorStop(0.5, '#a8acb4'); g.addColorStop(1, '#5a6068');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(30,32,38,0.75)';
  for (let i = -2; i < 6; i++) { x.beginPath(); x.moveTo(0, i * 64); x.lineTo(W, i * 64 + 48); x.lineTo(W, i * 64 + 62); x.lineTo(0, i * 64 + 14); x.fill(); }
  x.fillStyle = 'rgba(224,178,90,0.5)';
  for (let i = -2; i < 6; i++) { x.beginPath(); x.moveTo(0, i * 64 + 16); x.lineTo(W, i * 64 + 64); x.lineTo(W, i * 64 + 68); x.lineTo(0, i * 64 + 20); x.fill(); }
})));
// push a full rotation (yaw, then pitch/roll) on the kit's stack for fn
const _tm = new THREE.Matrix4(), _tq = new THREE.Quaternion(), _te = new THREE.Euler(), _ts = new THREE.Vector3(1, 1, 1), _tp = new THREE.Vector3();
function tilt(k, x, y, z, ry, rx, rz, fn) {
  _tm.compose(_tp.set(x, y, z), _tq.setFromEuler(_te.set(rx, ry, rz, 'YXZ')), _ts);
  k.stack.push(k.top.clone().multiply(_tm));
  try { return fn(); } finally { k.pop(); }
}
// the Joint Project's emblem (planet in a horned ring, the two worlds' stars)
const emblemTex = (bg = '#2a5e5a') => M('ugemblem' + bg, () => canvasTex(256, 256, (x, W) => {
  x.fillStyle = bg; x.beginPath(); x.arc(128, 128, 126, 0, 7); x.fill();
  x.strokeStyle = '#e0b25a'; x.lineWidth = 8; x.beginPath(); x.arc(128, 128, 118, 0, 7); x.stroke();
  x.translate(128, 132);
  x.lineWidth = 10; x.beginPath(); x.arc(0, 0, 70, Math.PI * 0.15, Math.PI * 0.85, true); x.stroke();
  x.beginPath(); x.moveTo(-66, 24); x.quadraticCurveTo(-90, -10, -76, -56); x.moveTo(66, 24); x.quadraticCurveTo(90, -10, 76, -56); x.stroke();
  const g = x.createRadialGradient(0, 0, 4, 0, 0, 50); g.addColorStop(0, '#e8ffff'); g.addColorStop(0.5, '#5ff4ff'); g.addColorStop(1, '#1a6a78'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 46, 0, 7); x.fill();
  x.lineWidth = 3; x.strokeStyle = '#e8ffff'; x.beginPath(); x.ellipse(0, 0, 62, 15, -0.3, 0, 7); x.stroke();
  x.fillStyle = '#ffe890'; for (const sx of [-1, 1]) { x.beginPath(); x.arc(sx * 38, -92, 8, 0, 7); x.fill(); }
}));
// flush a Kit whose merged meshes must not cast shadows (tall machinery would streak the floor with sun shadows)
function flushNoShadow(kt) { const n = kt.group.children.length; kt.flush(); for (let i = n; i < kt.group.children.length; i++) kt.group.children[i].castShadow = false; }
// small helpers
const ang = (ax, az, bx, bz) => Math.atan2(bx - ax, bz - az);
const polar = (phi, r, cx = 0, cz = 0) => [cx + Math.sin(phi) * r, cz + Math.cos(phi) * r];

// ================================================================ 1. c3shaft — bottom of the drill shaft
// Raw rock round a project landing: the lift (Zeelich's pad, empty, under its liner on four guide columns),
// the bore column turning inside its lattice casing, a tunnel mouth on to the deep installation.
function buildShaft(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'c3shaft', 1800, 0);
  const R = B.room, k = B.k, kt = new Kit(B.group);
  const W = 17, D = 12.5, H = 5.4;
  R.view = 16.2; R.follow = 0.3; R.cave = true; R.music = 'under';
  const rock = rockMat('#b4a8a4'), rockD = rockMat('#8a7e80');
  const tunnelX = 5.2;
  caveShell(B, { W, D, H, floor: floorMat('#776b68', 'rgba(40,30,36,0.4)', 'shaft'), slabMat: MAT.rubble('grey'), rock, seed: 11, openings: [{ wall: 'back', at: tunnelX + W / 2 + 0.7, w: 2.8, h: 3.1 }] });
  const BZ = -D / 2, LX = -W / 2;

  // --- the lift: Zeelich's pad at the bottom of its shaft, under a teal liner on four guide columns
  const LS = { x: -4.7, z: -1.7 }, LR = 2.05, padR = 1.7;
  k.add(cyl(LR + 1.0, LR + 1.05, 0.08, 40), deck(), LS.x, 0.04, LS.z);
  k.add(cyl(LR + 1.08, LR + 1.08, 0.06, 40, true), hazard(), LS.x, 0.05, LS.z);
  k.add(cyl(LR + 0.12, LR + 0.12, 0.12, 40), dark(), LS.x, 0.06, LS.z);
  const pad = new THREE.Group(); pad.position.set(LS.x, 0.14, LS.z); B.group.add(pad);
  const padM = (geo, m, x = 0, y = 0, z = 0, o = {}) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); if (o.rx) me.rotation.x = o.rx; me.castShadow = me.receiveShadow = true; pad.add(me); return me; };
  padM(lathe([[0.001, -0.3], [padR, -0.3], [padR + 0.05, -0.05], [padR - 0.05, 0.02], [0.001, 0.02]], 32), MAT.flat('#c8c0d8', 0.6, { metalness: 0.3 }));
  padM(new THREE.RingGeometry(padR - 0.35, padR - 0.08, 32), hazard(), 0, 0.03, 0, { rx: -Math.PI / 2 });
  padM(new THREE.CircleGeometry(0.75, 32), M('ugemblemM', () => stdM({ map: emblemTex(), roughness: 0.6, transparent: true })), 0, 0.035, 0, { rx: -Math.PI / 2 });
  for (let i = 0; i < 4; i++) padM(cyl(0.06, 0.06, 1.0, 8), brass(), Math.sin(i * Math.PI / 2 + 0.6) * (padR - 0.12), 0.5, Math.cos(i * Math.PI / 2 + 0.6) * (padR - 0.12));
  B.ccol(LS.x, LS.z, padR + 0.1, 0.14, { seeThrough: true });
  const legs = [0, 1, 2, 3].map((i) => polar(Math.PI / 4 + i * Math.PI / 2, LR + 0.12, LS.x, LS.z));
  const linerY = 4.3;
  legs.forEach(([x, z], i) => {
    kt.at(x, 0, z, Math.PI / 4 + i * Math.PI / 2, () => column(kt, 16, 0.3));
    B.ccol(x, z, 0.24, 16, { noStand: true });
    kt.add(cyl(0.02, 0.02, 16, 5), MAT.steel(), x + (LS.x - x) * 0.08, 8, z + (LS.z - z) * 0.08);
  });
  kt.add(cyl(LR + 0.3, LR + 0.3, 14, 36, true), twoSided(teal()), LS.x, linerY + 7, LS.z);
  for (let y = linerY + 1.4; y < 18; y += 2.2) kt.add(torus(LR + 0.34, 0.07, 6, 40), brass(), LS.x, y, LS.z, 0, { rx: Math.PI / 2 });
  kt.add(torus(LR + 0.42, 0.16, 6, 40), tealP(), LS.x, linerY - 0.05, LS.z, 0, { rx: Math.PI / 2 });
  kt.add(cyl(LR + 0.5, LR + 0.5, 0.3, 40, true), hazard(), LS.x, linerY - 0.3, LS.z);
  for (let i = 0; i < 12; i++) { const [x, z] = polar((i / 12) * Math.PI * 2, LR + 0.32, LS.x, LS.z); kt.add(rbox(0.12, 13.4, 0.08, 0.02), tealP(), x, linerY + 6.9, z, (i / 12) * Math.PI * 2); }
  for (const [ax, az, bx, bz] of [[LS.x - 1.6, LS.z - 1.6, LX - 0.2, LS.z - 2.6], [LS.x - 1.8, LS.z + 1.1, LX - 0.2, LS.z + 2.4], [LS.x + 0.4, LS.z - 2.3, LS.x + 0.9, BZ - 0.2]]) {
    const L = Math.hypot(bx - ax, bz - az);
    kt.at((ax + bx) / 2, linerY + 0.5, (az + bz) / 2, -Math.atan2(bz - az, bx - ax), () => ibeam(kt, L, 0.36, 0.24));
  }
  k.at(LS.x + 1.25, linerY - 0.85, LS.z + 1.75, Math.PI / 4, () => signPlate(k, 1.1, 0.42, signMat(['SHAFT 1', 'BOTTOM LANDING'], { w: 384, h: 144 })));
  const beam = lightShaft(B, LS.x, 9, LS.z, 0.55, 1.45, 14, '#cfeeff', 0.035);
  B.light('#cfe8ff', 7, 8, LS.x, 3.4, LS.z);
  // call post at the pad
  const cpX = LS.x + 2.35, cpZ = LS.z + 1.55, cpA = ang(cpX, cpZ, LS.x, LS.z) + Math.PI;
  k.at(cpX, 0, cpZ, cpA, () => {
    k.add(rbox(0.42, 1.0, 0.32, 0.03), teal(), 0, 0.5, 0);
    k.add(rbox(0.5, 0.06, 0.4, 0.02), brass(), 0, 1.03, 0);
    k.add(cyl(0.012, 0.012, 0.3, 6), MAT.steel(), 0.08, 1.15, 0.05, 0, { rx: -0.5 });
    k.add(sphere(0.04, 8, 6), MAT.paint('#c8302a', 0.3), 0.08, 1.28, 0.12);
    k.add(sphere(0.05, 10, 8), MAT.glow('#ffe0a0', '#ffb040', 2), -0.1, 1.12, 0);
    k.add(plane(0.26, 0.2), MAT.screen(P.CANV.screen('shaft')), 0, 0.72, 0.162);
  });
  B.col(cpX, cpZ, 0.24, 0.2, 1.1, { noStand: true, rot: cpA });
  cableRun(k, [[cpX, 0.4, cpZ], [cpX - 0.3, 0.03, cpZ - 0.5], [legs[3][0] + 0.25, 0.03, legs[3][1] + 0.1], [legs[3][0], 0.7, legs[3][1]]], 0.025, 0.02);

  // --- the bore column: the turning drill string inside an open lattice casing
  const BC = { x: 1.9, z: -3.3 }, bcR = 1.15;
  const string = new THREE.Group(); string.position.set(BC.x, 0, BC.z); B.group.add(string);
  const strMat = M('ugstring', () => { const m = stdM({ map: drillTex(), roughness: 0.4, metalness: 0.55 }); m.map.repeat.set(2, 9); return m; });
  const sm = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 22, 20, 1, true), strMat); sm.position.y = 10; string.add(sm);
  for (const y of [1.6, 5.9, 10.2]) { const j = new THREE.Mesh(cyl(0.74, 0.74, 0.45, 20), M('ugjoint', () => stdM({ color: '#c8ccd4', roughness: 0.35, metalness: 0.7, map: P.TEX.brushed() }))); j.position.y = y; string.add(j); }
  k.add(lathe([[0.7, 0], [1.75, 0], [1.8, 0.08], [1.7, 0.5], [1.4, 0.62], [1.36, 0.82], [0.74, 0.86], [0.7, 0.8]], 32), teal(), BC.x, 0, BC.z);
  k.add(torus(1.45, 0.06, 6, 32), brass(), BC.x, 0.62, BC.z, 0, { rx: Math.PI / 2 });
  for (let i = 0; i < 16; i++) { const [x, z] = polar((i / 16) * Math.PI * 2, 1.6, BC.x, BC.z); k.add(cyl(0.05, 0.05, 0.1, 6), brass(), x, 0.32, z); }
  k.add(new THREE.RingGeometry(2.0, 2.35, 40), hazard(), BC.x, 0.012, BC.z, 0, { rx: -Math.PI / 2 });
  B.ccol(BC.x, BC.z, 1.8, 0.86, { noStand: true });
  const cl = [0, 1, 2, 3].map((i) => polar(i * Math.PI / 2, bcR + 0.25, BC.x, BC.z));
  cl.forEach(([x, z], i) => { kt.at(x, 0.86, z, i * Math.PI / 2, () => column(kt, 17, 0.28)); });
  for (let y = 2.6; y < 18; y += 2.4) {
    kt.add(torus(bcR + 0.25, 0.09, 6, 32), tealP(), BC.x, y, BC.z, 0, { rx: Math.PI / 2 });
    for (const dy of [-0.11, 0.11]) kt.add(torus(bcR + 0.25, 0.035, 5, 32), brass(), BC.x, y + dy, BC.z, 0, { rx: Math.PI / 2 });
  }
  for (let i = 2; i < 4; i++) {
    // the two faces toward the camera stay open so the turning string shows
    const [ax, az] = cl[i], [bx, bz] = cl[(i + 1) % 4];
    for (let y = 2.6; y < 15; y += 2.4) for (const s of [0, 1]) kt.add(pipe([[ax, y + (s ? 2.4 : 0), az], [bx, y + (s ? 0 : 2.4), bz]], 0.035, 0.05, 5), iron(), 0, 0, 0);
  }
  // three cable runs down the casing, into a floor trench, away into the tunnel
  const tr = [[BC.x + 1.5, BC.z + 0.9], [tunnelX - 1.0, BC.z + 0.9], [tunnelX - 1.0, BZ - 2]];
  for (let c = 0; c < 3; c++) {
    const [x, z] = polar(Math.PI / 4 + 0.35 + c * 0.13, bcR + 0.48, BC.x, BC.z), col = ['#18181c', '#8a2a24', '#22324e'][c], off = (c - 1) * 0.13;
    kt.add(pipe([[x, 18, z], [x, 1.2, z], [x + 0.15, 0.1, z + 0.35], [tr[0][0] + off, 0.06, tr[0][1] + off], [tr[1][0] + off, 0.06, tr[1][1] + off], [tr[2][0] + off, 0.06, tr[2][1]]], 0.05, 0.3, 6), MAT.flat(col, 0.55), 0, 0, 0);
  }
  for (let y = 3.8; y < 16; y += 2.4) { const [x, z] = polar(Math.PI / 4 + 0.48, bcR + 0.5, BC.x, BC.z); kt.add(rbox(0.5, 0.1, 0.18, 0.02), iron(), x, y, z, Math.PI / 4 + 0.48); }
  // trench gratings with brass edging over the cables
  const grate = (x0, z0, x1, z1) => { const L = Math.hypot(x1 - x0, z1 - z0); k.at((x0 + x1) / 2, 0, (z0 + z1) / 2, -Math.atan2(z1 - z0, x1 - x0), () => { k.add(rbox(L + 0.5, 0.05, 0.6, 0.01), MAT.tread('#5a6068'), 0, 0.1, 0); for (const s of [-1, 1]) k.add(rbox(L + 0.5, 0.08, 0.06, 0.015), brass(), 0, 0.07, s * 0.33); }); };
  grate(tr[0][0] + 0.2, tr[0][1], tr[1][0], tr[1][1]); grate(tr[1][0], tr[1][1] - 0.3, tr[2][0], BZ + 0.5);
  for (const [y, phi] of [[3.5, Math.PI / 4], [5.9, -Math.PI / 4 + 0.3], [8.3, Math.PI * 0.6]]) {
    const [x, z] = polar(phi, bcR + 0.38, BC.x, BC.z);
    kt.at(x, y, z, phi, () => wallLamp(kt, { arm: 0.3 }));
    const [lx, lz] = polar(phi, bcR + 1.3, BC.x, BC.z);
    B.light('#ffe2b8', y < 5 ? 8 : 4, 9, lx, y - 0.5, lz);
  }
  k.at(BC.x + 1.32, 1.5, BC.z + 1.32, Math.PI / 4, () => signPlate(k, 1.0, 0.38, signMat(['BORE 1', 'KEEP CLEAR'], { w: 384, h: 144, bg: '#6a2a24' })));
  // cracked rock at the bore's foot: the first crystals, warm steam
  for (const [x, z, s, sd, ry] of [[BC.x - 2.35, BC.z + 0.7, 0.6, 3, 0.4], [BC.x + 2.5, BC.z - 0.6, 0.5, 5, 1.6], [BC.x - 0.9, BC.z - 2.3, 0.45, 8, 2.2]]) {
    k.at(x, 0, z, ry, () => { crystals(k, 5, s, sd, [CYAN(), DIM(), VIOLET()]); k.add(rockGeo(sd + 2), rockD, 0, -0.05, 0, 0, { sx: s * 1.4, sy: s * 0.5, sz: s * 1.2 }); });
    B.ccol(x, z, s * 0.8, s * 1.4, { noStand: true });
  }
  B.light('#40d0ff', 3, 4.5, BC.x - 2.2, 0.9, BC.z + 1.1);
  motes(B, [[BC.x - 2.2, BC.z + 0.9, 0.6], [BC.x + 2.3, BC.z - 0.5, 0.5]], { n: 40, color: '#f6f0ff', size: 0.35, op: 0.2, hmax: 3.2, speed: 0.45 });

  // --- the tunnel mouth: a steel portal, hazard lintel, sign; a short tunnel with a lamp going away
  const TZ = BZ;
  k.at(tunnelX, 0, TZ, 0, () => {
    for (const s of [-1, 1]) k.at(s * 1.55, 0, 0.1, 0, () => column(k, 3.5, 0.32));
    k.at(0, 3.55, 0.1, 0, () => ibeam(k, 3.5, 0.42, 0.3));
    k.add(rbox(3.3, 0.3, 0.06, 0.02), hazard(), 0, 3.12, 0.28);
    k.at(0, 4.15, 0.24, 0, () => signPlate(k, 1.8, 0.52, signMat(['DEEP INSTALLATION', 'LEVEL -2  ·  COOLING'], { w: 512, h: 150, arrow: 1 })));
    k.add(new THREE.BoxGeometry(2.9, 0.1, 3.4), floorMat('#776b68', 'rgba(40,30,36,0.4)', 'shaft'), 0, -0.05, -1.8);
    for (const s of [-1, 1]) for (let z = -0.8; z > -3.4; z -= 1.2) k.add(rockGeo(7 + Math.round(-z * 3) + (s > 0 ? 5 : 0)), rockD, s * 1.7, 0, z, z * 2, { sx: 0.8, sy: 1.9, sz: 0.9 });
    k.add(new THREE.BoxGeometry(3.8, 0.3, 3.4), rockD, 0, 3.15, -1.8);
    for (let z = -0.7; z > -3.4; z -= 1.3) { for (const s of [-1, 1]) k.add(rbox(0.16, 3.0, 0.16, 0.03), tealP(), s * 1.25, 1.5, z); k.add(rbox(2.66, 0.16, 0.16, 0.03), tealP(), 0, 2.95, z); }
    k.at(-1.15, 2.3, -2.0, Math.PI / 2, () => wallLamp(k, { arm: 0.22 }));
    k.add(plane(2.6, 3.2), MAT.flat('#050406', 1), 0, 1.6, -3.4);
    // rock heaped over the portal so the wall line stays whole
    for (const [x, sx, sy] of [[-1.6, 1.4, 1.6], [0.2, 1.8, 1.4], [1.8, 1.3, 1.7]]) k.add(rockGeo(31 + Math.round(x * 3)), rock, x, 3.9, -0.6, x, { sx, sy, sz: 0.9 });
  });
  B.light('#ffdcb0', 3.5, 5, tunnelX - 0.6, 2.2, TZ - 1.8);
  B.light('#ffe6c0', 5, 7, tunnelX, 2.6, TZ + 1.4);
  // laid steel plates: the walked route from the lift to the tunnel
  const plates = [[-1.9, -0.2, 0.1], [-0.2, 0.4, -0.05], [1.5, 0.95, 0.08], [3.2, 0.95, -0.04], [4.6, 0.4, 0.12], [tunnelX, -1.1, 0.0], [tunnelX + 0.1, -2.7, 0.06], [tunnelX, -4.3, -0.03]];
  plates.forEach(([x, z, ry], i) => k.at(x, 0, z, ry, () => { k.add(rbox(1.5, 0.05, 1.3, 0.015), MAT.tread('#8e8a92'), 0, 0.025, 0); if (i % 2) k.add(rbox(1.5, 0.02, 0.12, 0.005), hazard(), 0, 0.055, 0.55); for (const sx of [-0.65, 0.65]) for (const sz of [-0.55, 0.55]) k.add(sphere(0.025, 6, 4), iron(), sx, 0.05, sz); }));
  R.exits.push({ ...B.world(tunnelX, TZ + 0.3), r: 0.95, to: 'c3-deep' });
  R.exits.push({ ...B.world(LS.x, LS.z), r: 0.8, to: 'c3-up' });
  R.lift = B.world(LS.x, LS.z);
  R.spawn = { ...B.world(LS.x + 2.6, LS.z + 0.2), a: Math.PI / 2 };

  // --- the landing's working clutter
  // flatbed cart with spare drill pipe, beside the tunnel
  const cx = tunnelX - 2.8, cz = BZ + 1.55;
  k.at(cx, 0, cz, 0.12, () => {
    k.add(rbox(2.2, 0.12, 1.0, 0.03), tealP(), 0, 0.42, 0);
    k.add(rbox(2.2, 0.1, 1.0, 0.02), deck(), 0, 0.5, 0);
    for (const sx of [-0.8, 0.8]) for (const sz of [-0.45, 0.45]) { k.add(cyl(0.17, 0.17, 0.08, 14), dark(), sx, 0.18, sz, 0, { rx: Math.PI / 2 }); k.add(cyl(0.06, 0.06, 0.1, 8), brass(), sx, 0.18, sz, 0, { rx: Math.PI / 2 }); }
    for (const sx of [-1.08, 1.08]) k.add(rbox(0.06, 0.5, 1.0, 0.02), tealP(), sx, 0.75, 0);
    for (let i = 0; i < 5; i++) { const y = 0.66 + Math.floor(i / 3) * 0.24, z = -0.3 + (i % 3) * 0.3 + Math.floor(i / 3) * 0.15; k.add(cyl(0.12, 0.12, 2.0, 12), MAT.steel(), 0, y, z, 0, { rz: Math.PI / 2 }); k.add(cyl(0.14, 0.14, 0.22, 12), brass(), 0.92, y, z, 0, { rz: Math.PI / 2 }); }
    k.add(pipe([[-1.1, 0.5, 0], [-1.6, 0.5, 0], [-1.7, 0.9, 0]], 0.03, 0.1, 6), iron(), 0, 0, 0);
  });
  B.col(cx, cz, 1.15, 0.55, 1.1, { rot: 0.12, noStand: true });
  // cable drums
  const drum = (x, z, ry, s = 1) => k.at(x, 0, z, ry, () => {
    for (const sx of [-1, 1]) k.add(cyl(0.55 * s, 0.55 * s, 0.06, 20), MAT.wood('grey'), sx * 0.3 * s, 0.55 * s, 0, 0, { rz: Math.PI / 2 });
    k.add(cyl(0.4 * s, 0.4 * s, 0.56 * s, 18), MAT.flat('#8a2a24', 0.6), 0, 0.55 * s, 0, 0, { rz: Math.PI / 2 });
    for (let i = 0; i < 5; i++) k.add(torus(0.4 * s, 0.03 * s, 4, 18), MAT.flat('#6a1e1a', 0.6), (i - 2) * 0.11 * s, 0.55 * s, 0, Math.PI / 2);
  });
  drum(-1.4, 3.6, 0.4); B.ccol(-1.4, 3.6, 0.6, 1.1, { noStand: true });
  drum(LX + 1.0, 4.4, 1.2, 0.8); B.ccol(LX + 1.0, 4.4, 0.5, 0.9, { noStand: true });
  crateStack(B, LX + 1.0, 2.5, 0.2, [[1.0, 0.8, 0.9], [0.75, 0.6, 0.7, null, -0.25]]);
  crateStack(B, 7.3, -4.4, -0.15, [[0.95, 0.85, 0.95], [0.7, 0.6, 0.7, '#5f8068', 0.3]]);
  crateStack(B, 7.6, -2.8, 0.3, [[0.8, 0.7, 0.8]]);
  B.put(7.0, -5.7, 0, P.barrel, { r: 0.3, h: 0.85, pal: 'grey' });
  B.put(7.7, -5.6, 0, P.barrel, { r: 0.3, h: 0.85, pal: 'grey' });
  // the generator in the near corner: humming, cabled to the bore
  const gX = 5.6, gZ = 3.6;
  k.at(gX, 0, gZ, -Math.PI / 4, () => {
    k.add(rbox(2.2, 0.14, 1.2, 0.03), iron(), 0, 0.07, 0);
    k.add(rbox(1.6, 1.1, 1.0, 0.08), teal(), -0.2, 0.69, 0);
    k.add(lathe([[0.001, 0], [0.42, 0], [0.45, 0.05], [0.45, 0.95], [0.42, 1.0], [0.001, 1.0]], 20), tealP(), 0.75, 0.65, 0, 0, { rz: Math.PI / 2 });
    k.add(torus(0.36, 0.03, 5, 20), brass(), 1.0, 0.65, 0, Math.PI / 2);
    k.add(P.disc(0.33, 20), MAT.flat('#1a1c20', 0.6), 1.005, 0.65, 0, Math.PI / 2);
    for (let i = 0; i < 6; i++) k.add(rbox(0.66, 0.035, 0.02, 0.005), iron(), 1.01, 0.65, 0, Math.PI / 2, { rz: (i * Math.PI) / 6 });
    for (let i = 0; i < 5; i++) k.add(rbox(1.3, 0.04, 0.02, 0.005), dark(), -0.2, 0.4 + i * 0.12, 0.51);
    k.add(rbox(0.5, 0.36, 0.04, 0.01), brass(), -0.55, 0.85, 0.52);
    k.at(-0.55, 0.85, 0.54, 0, () => P.gauge(k, { r: 0.1, v: 0.7, stem: false }));
    k.add(pipe([[-0.7, 1.24, -0.2], [-0.7, 1.9, -0.2], [-0.4, 2.05, -0.2]], 0.07, 0.15, 8), iron(), 0, 0, 0);
    k.add(sphere(0.06, 8, 6), MAT.glow('#b0ff90', '#40d040', 1.6), 0.3, 1.27, 0.3);
  });
  B.col(gX, gZ, 1.15, 0.65, 1.3, { rot: -Math.PI / 4, noStand: true });
  cableRun(k, [[gX - 0.6, 0.6, gZ - 0.6], [gX - 1.4, 0.03, gZ - 1.6], [BC.x + 2.6, 0.03, BC.z + 2.2], [BC.x + 1.2, 0.5, BC.z + 1.0]], 0.045, 0.02);
  // the crew's tea corner: folding table, thermos, mugs, a crate seat
  const tX = -1.4, tZ = 5.0;
  k.at(tX, 0, tZ, 0.2, () => {
    k.add(rbox(1.1, 0.05, 0.62, 0.02), MAT.wood('honey'), 0, 0.74, 0);
    for (const sx of [-0.45, 0.45]) { k.add(pipe([[sx, 0.72, -0.25], [sx + 0.05, 0.02, 0.25]], 0.018, 0.05, 5), iron(), 0, 0, 0); k.add(pipe([[sx, 0.72, 0.25], [sx + 0.05, 0.02, -0.25]], 0.018, 0.05, 5), iron(), 0, 0, 0); }
    k.add(lathe([[0.001, 0], [0.06, 0], [0.06, 0.26], [0.04, 0.3], [0.04, 0.34], [0.001, 0.34]], 12), MAT.paint('#3a6fb0', 0.4), -0.3, 0.765, 0.05);
    for (const [x, z] of [[0.05, 0.1], [0.22, -0.1]]) k.add(lathe([[0.001, 0], [0.045, 0], [0.05, 0.1], [0.045, 0.1], [0.04, 0.01], [0.001, 0.01]], 10), MAT.flat('#efe6d6', 0.4), x, 0.765, z);
    P.papers(k, 0.35, 0.765, 0.12, 2, 41, 'project');
  });
  B.col(tX, tZ, 0.58, 0.34, 0.78, { rot: 0.2, noStand: true, seeThrough: true });
  B.put(tX + 1.0, tZ - 0.3, 0.4, P.cargoCrate, { w: 0.55, h: 0.45, d: 0.55, color: '#5f8068' });
  B.put(-3.2, 5.4, 0.1, P.cargoCrate, { w: 0.8, h: 0.7, d: 0.8 });
  // floodlight on the bore and the landing
  B.put(-1.3, 1.9, ang(-1.3, 1.9, BC.x, BC.z), floodlight, {});
  B.light('#fff0d0', 6, 8, -0.6, 2.3, 0.6);
  // toolbox left by the pad
  k.at(LS.x + 2.9, 0, LS.z - 1.5, 0.5, () => { k.add(rbox(0.55, 0.24, 0.26, 0.02), MAT.paint('#c8302a', 0.45), 0, 0.12, 0); k.add(pipe([[-0.17, 0.24, 0], [-0.14, 0.33, 0], [0.14, 0.33, 0], [0.17, 0.24, 0]], 0.012, 0.03, 5), iron(), 0, 0, 0); });
  B.col(LS.x + 2.9, LS.z - 1.5, 0.3, 0.16, 0.34, { rot: 0.5, noStand: true, seeThrough: true });
  // cables from the liner ring to the walls, lamps on the walls
  cableRun(kt, [[legs[0][0], linerY - 0.3, legs[0][1]], [LX + 0.3, 4.0, -5.0]], 0.03, 0.5);
  cableRun(kt, [[legs[1][0], linerY - 0.3, legs[1][1]], [-1.0, 4.5, BZ + 0.3]], 0.03, 0.6);
  cableRun(kt, [[cl[2][0], 4.0, cl[2][1]], [-1.0, 4.5, BZ + 0.3]], 0.03, 0.3);
  for (const [x, z, ry] of [[LX + 0.45, 2.8, Math.PI / 2], [-1.2, BZ + 0.45, 0]]) { k.at(x, 3.0, z, ry, () => wallLamp(k)); const [lx, lz] = ry ? [x + 1.1, z] : [x, z + 1.1]; B.light('#ffe2b8', 5, 7, lx, 2.6, lz); }

  // --- the rock: outcrops, boulders, crystal seams starting to show in the walls
  for (const [x, z, s, sy, sd] of [[LX + 1.0, 5.4, 1.3, 1.0, 4], [-2.8, BZ + 0.9, 1.1, 1.5, 9], [7.9, BZ + 2.4, 1.0, 1.3, 12], [LX + 0.7, -5.2, 1.3, 2.2, 15], [8.0, 5.2, 1.0, 0.8, 18], [2.2, 5.6, 0.8, 0.6, 19]]) {
    k.add(rockGeo(sd), rock, x, 0, z, sd, { sx: s, sy, sz: s * 0.9 });
    B.ccol(x, z, s * 0.85, sy * 1.2, { noStand: true });
  }
  for (const [x, y, z, ry, s, sd] of [[LX + 0.35, 2.2, -0.2, Math.PI / 2, 0.55, 21], [LX + 0.35, 1.1, 4.0, Math.PI / 2, 0.42, 22], [-2.9, 2.8, BZ + 0.35, 0, 0.5, 23], [3.4, 1.4, BZ + 0.35, 0, 0.4, 24], [8.2, 2.0, BZ + 0.4, 0, 0.36, 25]]) {
    tilt(k, x, y, z, ry, Math.PI / 2 - 0.35, 0, () => crystals(k, 6, s, sd, [CYAN(), VIOLET(), DIM()], 0.6));
  }
  for (const [x, y, z] of [[LX + 1.0, 2.2, -0.2], [-2.9, 2.8, BZ + 1.0]]) B.light('#40c8ff', 2.4, 4, x, y, z);
  pebbles(k, W, D, 110, 7, rockD, [[LS.x, LS.z, 3.3], [BC.x, BC.z, 2.6], [tunnelX, BZ + 2.5, 2.2], [cx, cz, 1.5], [LS.x + 2.6, LS.z + 0.2, 1.2], [1.5, 0.6, 2.2], [tX, tZ, 1.2], [gX, gZ, 1.6]]);
  B.light('#d8c8e8', 2.5, 24, -1, 7, 1);

  flushNoShadow(kt);
  R.updaters.push((dt, t) => {
    string.rotation.y = t * 1.1;
    beam.material.opacity = 0.03 + Math.sin(t * 0.7) * 0.01;
  });
  const room = B.finish();
  room.center.set(B.cx - 0.8, 0, B.cz - 1.0);
  return room;
}

// ================================================================ registration
export function buildUnderground(scene, physics) {
  const rooms = {
    c3shaft: buildShaft(scene, physics),
  };
  return rooms;
}
