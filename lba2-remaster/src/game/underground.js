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
function crateStack(B, x, z, ry, sizes, y0 = 0) {
  const k = B.k; let y = y0, top = y0;
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
    for (let i = 0; i < n; i++) { const s = sd[i]; s.y += s.v * dt; if (s.y > hmax) s.y = 0; else if (s.y < 0) s.y = hmax; sp[i * 3] = s.x + Math.sin(s.y * 2 + i) * 0.15; sp[i * 3 + 1] = y0 + s.y; sp[i * 3 + 2] = s.z; }
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
  const cx = tunnelX - 3.6, cz = BZ + 1.45;
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

// ================================================================ 2. c3deep — the project's deep installation
// A machinery hall cut into the rock: the bore's transmission in the corner, heat exchanger 2 in the middle,
// three coolant valves (A on the wall, B on the drain branch, C up on the catwalk), a hinged stair that a ball
// switch lowers, a heavy cooling shutter on to the galleries. Floor-level coolant runs in grated trenches;
// whatever a valve feeds lights up with flowing coolant when it is open.
const concreteTex = () => M('ugconcrete', () => tiled(canvasTex(512, 512, (x, W, H) => {
  const r = rng(77);
  x.fillStyle = '#86868c'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { const px = r() * W, py = r() * H, rr = 20 + r() * 80, g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, r() < 0.6 ? 'rgba(40,40,50,0.16)' : 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
  for (let i = 0; i < 3000; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)'; x.fillRect(r() * W, r() * H, 1.5, 1.5); }
  // 2 m slabs: sawn joints with a light lip
  x.fillStyle = 'rgba(30,30,36,0.7)'; x.fillRect(0, 0, W, 3); x.fillRect(0, 0, 3, H); x.fillRect(0, H / 2, W, 3); x.fillRect(W / 2, 0, 3, H);
  x.fillStyle = 'rgba(255,255,255,0.15)'; x.fillRect(0, 3, W, 2); x.fillRect(3, 0, 2, H); x.fillRect(0, H / 2 + 3, W, 2); x.fillRect(W / 2 + 3, 0, 2, H);
  // oil stains and hairline cracks
  for (let i = 0; i < 6; i++) { const px = r() * W, py = r() * H, rr = 12 + r() * 30; x.fillStyle = 'rgba(30,26,20,0.22)'; x.beginPath(); x.ellipse(px, py, rr, rr * 0.7, r() * 3, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(30,30,36,0.35)'; x.lineWidth = 1;
  for (let i = 0; i < 12; i++) { let px = r() * W, py = r() * H; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 6; j++) { px += (r() - 0.5) * 30; py += (r() - 0.5) * 30; x.lineTo(px, py); } x.stroke(); }
}), 1, 1));
// flowing coolant: bright streaks moving along u
const flowTex = () => M('ugflow', () => tiled(canvasTex(256, 64, (x, W, H) => {
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a3a48'); g.addColorStop(0.5, '#38e8ff'); g.addColorStop(1, '#0a3a48');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) { const px = (i / 9) * W + (i % 3) * 7, gg = x.createLinearGradient(px, 0, px + 26, 0); gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(0.6, 'rgba(230,255,255,0.9)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gg; x.fillRect(px, H * 0.25, 26, H * 0.5); }
}), 1, 1));
// the cooling circuit as painted on the wall plate (the clue: A and C feed the exchanger, B dumps to the drain)
const diagramTex = () => M('ugdiagram', () => canvasTex(768, 512, (x, W, H) => {
  x.fillStyle = '#e8e0c8'; x.fillRect(0, 0, W, H);
  const r = rng(5);
  for (let i = 0; i < 30; i++) { const px = r() * W, py = r() * H, rr = 20 + r() * 60, g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, 'rgba(120,100,60,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
  x.fillStyle = '#2a5e5a'; x.fillRect(0, 0, W, 64);
  x.fillStyle = '#efe2bf'; x.font = "bold 34px 'Arial Narrow', Arial, sans-serif"; x.textBaseline = 'middle';
  x.fillText('COOLING LOOP 2  ·  BORE EXCHANGER', 24, 33);
  x.strokeStyle = '#2a5e5a'; x.lineWidth = 5; x.strokeRect(6, 6, W - 12, H - 12);
  // pipes
  const pipeL = (pts, col = '#2a7a9a', w = 12) => { x.strokeStyle = col; x.lineWidth = w; x.lineJoin = 'round'; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); };
  pipeL([[90, 400], [90, 300], [330, 300]]);            // A → exchanger
  pipeL([[190, 110], [520, 110], [520, 230]]);          // C (upper level) → exchanger
  pipeL([[520, 370], [520, 420], [660, 420], [660, 460]], '#7a7a80'); // B → drain
  // arrows of flow
  x.fillStyle = '#2a7a9a';
  for (const [ax, ay, rot] of [[230, 300, 0], [380, 110, 0], [520, 190, Math.PI / 2]]) { x.save(); x.translate(ax, ay); x.rotate(rot); x.beginPath(); x.moveTo(-14, -16); x.lineTo(16, 0); x.lineTo(-14, 16); x.fill(); x.restore(); }
  // exchanger
  x.fillStyle = '#3f8a86'; x.strokeStyle = '#1e3a38'; x.lineWidth = 4;
  x.beginPath(); x.roundRect(330, 230, 300, 140, 60); x.fill(); x.stroke();
  x.strokeStyle = 'rgba(232,224,200,0.7)'; x.lineWidth = 3; for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(380 + i * 32, 248); x.lineTo(380 + i * 32, 352); x.stroke(); }
  x.fillStyle = '#efe2bf'; x.font = "bold 26px 'Arial Narrow', Arial, sans-serif"; x.fillText('EXCHANGER', 412, 300);
  // valves: bow-tie symbol + letter
  const valve = (vx, vy, label, vert = false) => {
    x.save(); x.translate(vx, vy); if (vert) x.rotate(Math.PI / 2);
    x.fillStyle = '#c8302a'; x.strokeStyle = '#1e1e22'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(-26, -20); x.lineTo(26, 20); x.lineTo(26, -20); x.lineTo(-26, 20); x.closePath(); x.fill(); x.stroke();
    x.restore();
    x.fillStyle = '#1e1e22'; x.font = "bold 44px 'Arial Narrow', Arial, sans-serif"; x.fillText(label, vx - 13, vy + (vert ? 0 : -48));
  };
  valve(90, 360, 'A', true); valve(190, 110, 'C'); valve(590, 420, 'B');
  x.fillStyle = '#4a4a50'; x.font = "bold 20px 'Arial Narrow', Arial, sans-serif";
  x.fillText('FLOOR', 40, 470); x.fillText('CATWALK', 150, 160); x.fillText('DRAIN', 690, 486);
  // the drain, crossed out in red
  x.strokeStyle = '#4a4a50'; x.lineWidth = 4; x.beginPath(); x.arc(660, 470, 22, 0, 7); x.stroke();
  x.strokeStyle = '#d02a20'; x.lineWidth = 12; x.lineCap = 'round';
  x.beginPath(); x.moveTo(612, 380); x.lineTo(708, 476); x.moveTo(708, 380); x.lineTo(612, 476); x.stroke();
}));
// distant passage painted behind a doorway (rock tunnel, a glow at its end)
const passageView = (glow, key) => M('ugpass' + key, () => { const t = canvasTex(256, 256, (x, W, H) => {
  x.fillStyle = '#0e0c12'; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W / 2, H * 0.62, 4, W / 2, H * 0.62, 110); g.addColorStop(0, glow); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(160,150,170,0.25)'; x.lineWidth = 3; for (let i = 1; i < 5; i++) { const s = 1 - i * 0.18; x.strokeRect(W / 2 - W * 0.45 * s, H * 0.62 - H * 0.55 * s, W * 0.9 * s, H * 0.95 * s); }
  x.fillStyle = 'rgba(120,110,120,0.35)'; x.beginPath(); x.moveTo(0, H); x.lineTo(W * 0.38, H * 0.7); x.lineTo(W * 0.62, H * 0.7); x.lineTo(W, H); x.fill();
}); const m = new THREE.MeshBasicMaterial({ map: t }); m.userData.noShadow = true; return m; });

function buildDeep(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'c3deep', 1900, 0);
  const R = B.room, k = B.k, kt = new Kit(B.group);
  const W = 22, D = 16, H = 5.8, t = 0.5, UY = 3.0;
  R.view = 18.4; R.follow = 0.32; R.music = 'under'; R.upperY = UY;
  const BZ = -D / 2, LX = -W / 2;
  const doorX = 5.7, entZ = 5.0;
  B.shell({
    W, D, H, t, slabH: 0.9,
    floor: M('ugconcM', () => stdM({ map: concreteTex(), roughness: 0.82 }, 4)), slab: MAT.rubble('grey'), rimMat: MAT.stone('slate', 1.4),
    body: MAT.plates('#6a747c', 1), low: MAT.plates(TEAL, 1), dado: 1.3, rail: brass(), cap: iron(), beam: iron(),
    posts: iron(), postsAt: (len) => (len === W + 2 * t ? [1.0, 4.4, 7.6, 12.0, 14.6, 18.6, 21.4].map((x) => x + 0.5) : [1.2, 4.5, 8.2, 12.8].map((z) => z + 0.5)),
    back: [{ kind: 'door', at: doorX, w: 2.6, h: 2.9, y0: 0, frame: iron(), view: passageView('rgba(90,220,255,0.55)', 'gal'), sill: MAT.stone('slate', 1) }],
    left: [{ kind: 'door', at: entZ, w: 1.6, h: 2.5, y0: 0, frame: iron(), view: passageView('rgba(255,210,150,0.5)', 'shaft'), sill: MAT.stone('slate', 1) }],
  });
  // raw rock above the panelling: the hall is cut into the mountain
  const rock = rockMat('#c4b8b0');
  k.at(LX - t, H + 0.05, BZ, 0, () => rockWallRun(k, W + t, 1.1, 41, rock, { tiers: 1, depth: 1.1, step: 1.15, top: 0.2 }));
  k.at(LX, H + 0.05, D / 2 + t, Math.PI / 2, () => rockWallRun(k, D + t, 1.1, 43, rock, { tiers: 1, depth: 1.1, step: 1.15, top: 0.2 }));

  // --- coolant materials, one per valve (dark when shut, flowing cyan when open)
  const flowMats = {};
  const flowMat = (id) => (flowMats[id] ??= (() => { const tx = flowTex().clone(); tx.needsUpdate = true; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; const m = stdM({ color: '#28343a', emissive: '#ffffff', emissiveMap: tx, emissiveIntensity: 0, roughness: 0.25, metalness: 0.3 }); m.userData.flow = tx; return m; })());
  const glassPipe = (pts, r, id) => {
    const g = pipe(pts, r, 0.25, 10).clone(), L = pts.reduce((a, p, i) => a + (i ? Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1], p[2] - pts[i - 1][2]) : 0), 0);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * L * 0.6);
    const me = new THREE.Mesh(g, flowMat(id)); me.receiveShadow = true; B.group.add(me);
    for (const p of pts.slice(1, -1)) k.add(sphere(r * 1.35, 10, 8), brass(), p[0], p[1], p[2]);
    return me;
  };
  // a grated trench in the floor whose coolant glows (from a to b along x or z)
  const trench = (ax, az, bx, bz, id) => {
    const L = Math.hypot(bx - ax, bz - az), ry = -Math.atan2(bz - az, bx - ax);
    const gp = new THREE.Group(); gp.position.set((ax + bx) / 2, 0.006, (az + bz) / 2); gp.rotation.y = ry; B.group.add(gp);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.42), flowMat(id)); m.rotation.x = -Math.PI / 2; m.geometry.attributes.uv.array.forEach((v, i, a) => { if (i % 2 === 0) a[i] = v * L * 0.6; }); gp.add(m);
    k.at((ax + bx) / 2, 0, (az + bz) / 2, ry, () => {
      for (let x = -L / 2 + 0.12; x < L / 2; x += 0.2) k.add(rbox(0.05, 0.03, 0.5, 0.008), iron(), x, 0.018, 0);
      for (const s of [-1, 1]) k.add(rbox(L + 0.1, 0.035, 0.07, 0.01), brass(), 0, 0.018, s * 0.27);
    });
  };
  // valve: a riser with a flanged body and a hand wheel facing +z in its frame
  const wheels = {};
  const valveAt = (id, x, z, ry, wy) => {
    k.at(x, 0, z, ry, () => {
      k.add(cyl(0.16, 0.16, wy - 0.2, 12), tealP(), 0, (wy - 0.2) / 2, 0);
      k.add(cyl(0.26, 0.26, 0.06, 14), brass(), 0, wy - 0.42, 0);
      k.add(sphere(0.26, 14, 10), MAT.paint('#3a4448', 0.45), 0, wy - 0.2, 0, 0, { sy: 0.8 });
      k.add(cyl(0.26, 0.26, 0.06, 14), brass(), 0, wy + 0.02, 0);
      k.add(cyl(0.05, 0.05, 0.5, 8), MAT.steel(), 0, wy - 0.2, 0.25, 0, { rx: Math.PI / 2 });
      // id plate
      k.at(0.36, wy - 0.25, 0.05, 0, () => signPlate(k, 0.26, 0.26, M('ugvlbl' + id, () => stdM({ map: canvasTex(64, 64, (c) => { c.fillStyle = '#e8b830'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#1e1e22'; c.font = "bold 50px 'Arial Narrow', Arial"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(id, 32, 35); }), roughness: 0.6 }))));
    });
    const piv = new THREE.Group(); B.group.add(piv);
    const [ox, oz] = [x + Math.sin(ry) * 0.5, z + Math.cos(ry) * 0.5];
    piv.position.set(ox, wy - 0.2, oz); piv.rotation.y = ry;
    const wk = new Kit(piv); P.valveWheel(wk, { r: 0.28, color: '#c8302a' }); wk.flush();
    wheels[id] = piv;
    B.ccol(x, z, 0.3, wy + 0.1, { noStand: true, seeThrough: true });
    return { x: ox, z: oz };
  };

  // --- heat exchanger 2: a teal shell-and-tube body on cradles, finned cooler on top, sight glasses
  const EX = { x: 2.8, z: -2.4 }, EL = 4.4, ER = 1.15, EY = 1.6;
  k.at(EX.x, 0, EX.z, 0, () => {
    const prof = [[0.001, -EL / 2 - ER * 0.5], [ER * 0.55, -EL / 2 - ER * 0.42], [ER * 0.88, -EL / 2 - ER * 0.2], [ER, -EL / 2], [ER, EL / 2], [ER * 0.88, EL / 2 + ER * 0.2], [ER * 0.55, EL / 2 + ER * 0.42], [0.001, EL / 2 + ER * 0.5]];
    k.add(lathe(prof, 28), MAT.paint(TEAL, 0.4), 0, EY, 0, 0, { rz: Math.PI / 2 });
    for (const x of [-EL / 2, EL / 2]) { k.add(torus(ER + 0.04, 0.08, 6, 32), brass(), x, EY, 0, Math.PI / 2); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; k.add(sphere(0.045, 6, 4), iron(), x + Math.sign(x) * 0.06, EY + Math.sin(a) * (ER + 0.04), Math.cos(a) * (ER + 0.04)); } }
    for (const x of [-EL / 6, EL / 6]) k.add(torus(ER + 0.02, 0.04, 5, 32), brass(), x, EY, 0, Math.PI / 2);
    for (const x of [-EL / 3, EL / 3]) { k.add(rbox(0.3, EY - 0.3, 2.0, 0.04), iron(), x, (EY - 0.3) / 2, 0); k.add(rbox(0.5, 0.12, 2.3, 0.03), iron(), x, 0.06, 0); }
    // the fin bank of the cooler riding on top
    k.add(rbox(EL - 0.4, 0.14, 1.1, 0.03), iron(), 0, EY + ER + 0.05, 0);
    for (let i = 0; i < 22; i++) k.add(rbox(0.04, 0.55, 1.0, 0.008), MAT.steel(), -EL / 2 + 0.4 + i * ((EL - 0.8) / 21), EY + ER + 0.4, 0);
    k.add(rbox(EL - 0.3, 0.06, 1.16, 0.02), brass(), 0, EY + ER + 0.7, 0);
    // nameplate and gauges on the front
    k.at(-0.6, EY + 0.15, ER + 0.02, 0, () => signPlate(k, 1.2, 0.4, signMat(['EXCHANGER 2', 'BORE COOLING'], { w: 384, h: 128, emblem: false })));
    for (const [x, v] of [[0.8, 0.85], [1.3, 0.6]]) k.at(x, EY + 0.25, ER + 0.03, 0, () => P.gauge(k, { r: 0.13, v, stem: false }));
  });
  B.col(EX.x, EX.z, EL / 2 + ER * 0.5, ER + 0.1, EY + ER + 0.75, { noStand: true });
  const sight = [];
  for (const x of [-1.3, 0.1]) {
    const m = stdM({ color: '#401810', emissive: '#ff6a20', emissiveIntensity: 1.2, roughness: 0.2 }, 0, { noShadow: true });
    const me = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20), m); me.position.set(EX.x + x, EY - 0.2, EX.z + ER + 0.01); B.group.add(me);
    k.add(torus(0.19, 0.035, 6, 20), brass(), EX.x + x, EY - 0.2, EX.z + ER + 0.02);
    sight.push(m);
  }
  const exLight = B.light('#ff8a40', 3, 5, EX.x - 0.6, EY, EX.z + ER + 1.0);

  // --- valve A: on the left wall; its trench runs to the exchanger's left head
  const VA = { z: EX.z };
  const pa = valveAt('A', LX + 0.32, VA.z, Math.PI / 2, 1.25);
  k.add(rbox(0.6, 0.4, 0.5, 0.04), MAT.stone('slate', 1), LX + 0.3, 0.2, VA.z);
  trench(LX + 0.45, VA.z, EX.x - EL / 2 - 0.6, VA.z, 'A');
  glassPipe([[EX.x - EL / 2 - 0.6, -0.1, VA.z], [EX.x - EL / 2 - 0.6, 0.9, VA.z], [EX.x - EL / 2 - 0.3, EY, VA.z]], 0.13, 'A');
  // --- valve C: on the catwalk, back wall; its high run bridges over to the exchanger's top
  const VC = { x: -8.6 };
  const pc = valveAt('C', VC.x, BZ + 0.3, 0, 1.2 + UY);
  const highY = 5.0;
  glassPipe([[VC.x, UY + 1.45, BZ + 0.3], [VC.x, highY, BZ + 0.3], [EX.x, highY, BZ + 0.3], [EX.x, highY, EX.z], [EX.x, EY + ER + 0.75, EX.z]], 0.14, 'C', 3);
  for (const x of [-5.5, -2.0, 1.2]) { k.add(rbox(0.1, 0.6, 0.5, 0.02), iron(), x, highY + 0.1, BZ + 0.2); k.add(torus(0.17, 0.03, 5, 14), brass(), x, highY, BZ + 0.3, Math.PI / 2); }
  k.add(rbox(0.2, 0.2, 0.2, 0.03), brass(), EX.x, highY, BZ + 0.3);
  k.add(rbox(0.2, 0.2, 0.2, 0.03), brass(), EX.x, highY, EX.z);
  // --- valve B: the drain branch from the exchanger's right head to a floor drain (the red X on the plate)
  const VB = { x: 7.0, z: 0.6 }, DR = { x: 7.0, z: 3.4 };
  const pb = valveAt('B', VB.x, VB.z, Math.PI / 4, 1.2);
  k.add(pipe([[EX.x + EL / 2 + 0.55, EY, EX.z], [VB.x, EY, EX.z], [VB.x, EY, VB.z - 0.1], [VB.x, 1.3, VB.z]], 0.14, 0.3, 10), MAT.paint('#7a7a80', 0.4), 0, 0, 0);
  kt.add(rbox(0.12, EY, 0.12, 0.02), iron(), VB.x, EY / 2, EX.z);
  trench(VB.x, VB.z + 0.4, DR.x, DR.z - 0.6, 'B');
  k.add(P.disc(0.62, 24), MAT.flat('#141418', 0.9), DR.x, 0.008, DR.z, 0, { rx: -Math.PI / 2 });
  for (let i = -2; i <= 2; i++) k.add(rbox(1.1 * Math.cos(Math.asin(Math.min(0.95, Math.abs(i) * 0.22))), 0.04, 0.06, 0.01), iron(), DR.x, 0.02, DR.z + i * 0.22);
  k.add(new THREE.RingGeometry(0.66, 0.92, 28), hazard(), DR.x, 0.012, DR.z, 0, { rx: -Math.PI / 2 });
  k.at(DR.x + 1.3, 0, DR.z + 0.2, -Math.PI / 4, () => { k.add(cyl(0.04, 0.04, 1.3, 6), iron(), 0, 0.65, 0); k.at(0, 1.35, 0.02, 0, () => signPlate(k, 0.6, 0.36, signMat(['DRAIN', 'NOT UNDER LOAD'], { w: 256, h: 150, bg: '#6a2a24', emblem: false }))); });
  B.ccol(DR.x + 1.3, DR.z + 0.2, 0.12, 1.6, { noStand: true, seeThrough: true });
  const drainGlow = glowSprite('#40e0ff', 1.6, 0); drainGlow.position.set(DR.x, 0.3, DR.z); B.group.add(drainGlow);

  R.valves = [];
  const vdefs = [['A', pa, 0, 1.25], ['B', pb, 0, 1.2], ['C', pc, UY, UY + 1.2]];
  for (const [id, p, y, wy] of vdefs) {
    R.valves.push({ id, ...B.world(p.x, p.z), y, wheelY: wy, open: false, turn: 0, setOpen(b) { this.open = !!b; refresh(); } });
  }
  const refresh = () => {
    const st = Object.fromEntries(R.valves.map((v) => [v.id, v.open]));
    const good = st.A && st.C && !st.B;
    for (const m of sight) { m.emissive.set(good ? '#40e8ff' : st.A || st.C ? '#ffb040' : '#ff5a20'); m.color.set(good ? '#103a48' : '#401810'); }
    exLight.color.set(good ? '#60e0ff' : '#ff8a40');
  };
  refresh();

  // --- the catwalk along the back wall (deck at UY), the hinged stair, the gantry with the ball switch
  const CW = { x0: LX, x1: 0.6, z0: BZ, z1: BZ + 2.3 };
  const cwL = CW.x1 - CW.x0, cwX = (CW.x0 + CW.x1) / 2, cwZ = (CW.z0 + CW.z1) / 2;
  k.add(rbox(cwL, 0.08, CW.z1 - CW.z0, 0.02), deck(), cwX, UY - 0.04, cwZ);
  k.add(rbox(cwL, 0.32, 0.1, 0.02), tealP(), cwX, UY - 0.22, CW.z1 - 0.05);
  k.add(rbox(cwL, 0.1, 0.12, 0.02), hazard(), cwX, UY - 0.05, CW.z1 - 0.02);
  for (let x = CW.x0 + 1.2; x < CW.x1; x += 3.0) k.at(x, 0, BZ + 0.25, 0, () => { k.add(rbox(0.16, 0.5, 2.1, 0.02), tealP(), 0, UY - 0.35, 1.0); });
  const posts = [-9.4, -3.4, -0.2];
  for (const x of posts) { k.at(x, 0, CW.z1 - 0.2, 0, () => column(k, UY - 0.08, 0.26)); B.ccol(x, CW.z1 - 0.2, 0.2, UY - 0.1, { noStand: true }); }
  B.col(cwX, cwZ, cwL / 2, (CW.z1 - CW.z0) / 2, UY, { bottom: UY - 0.35, seeThrough: true });
  const stX = -6.0, stW = 1.3;
  k.at(0, UY, 0, 0, () => {
    P.railing(k, [[CW.x0 + 0.1, CW.z1 - 0.06], [stX - stW / 2 - 0.05, CW.z1 - 0.06]], { h: 1.05, step: 1.0 });
    P.railing(k, [[stX + stW / 2 + 0.05, CW.z1 - 0.06], [CW.x1 - 0.06, CW.z1 - 0.06], [CW.x1 - 0.06, BZ + 0.05]], { h: 1.05, step: 1.0 });
  });
  B.col((CW.x0 + stX - stW / 2) / 2, CW.z1 - 0.06, (stX - stW / 2 - CW.x0) / 2, 0.1, UY + 1.1, { bottom: UY - 0.1, noStand: true, seeThrough: true });
  B.col((stX + stW / 2 + CW.x1) / 2, CW.z1 - 0.06, (CW.x1 - stX - stW / 2) / 2, 0.1, UY + 1.1, { bottom: UY - 0.1, noStand: true, seeThrough: true });
  B.col(CW.x1 - 0.06, cwZ, 0.1, (CW.z1 - CW.z0) / 2, UY + 1.1, { bottom: UY - 0.1, noStand: true, seeThrough: true });
  // the hinged stair: 6 steps from the floor (z0) up to the catwalk edge; pivot at the top edge
  const nS = 6, tread = 0.7, sz0 = CW.z1 + nS * tread, rise = UY / (nS + 0);
  const flight = new THREE.Group(); flight.position.set(stX, UY, CW.z1); B.group.add(flight);
  const fk = new Kit(flight);
  const ang0 = Math.atan2(UY, nS * tread), flen = Math.hypot(UY, nS * tread);
  for (const s of [-1, 1]) fk.add(rbox(0.08, 0.3, flen + 0.2, 0.02), tealP(), s * (stW / 2), -UY / 2 - 0.05, nS * tread / 2, 0, { rx: ang0 });
  for (let i = 1; i <= nS; i++) { const zz = nS * tread - (i - 0.5) * tread, yy = i * rise - UY; fk.add(rbox(stW - 0.1, 0.06, tread - 0.06, 0.015), deck(), 0, yy - 0.03, zz); fk.add(rbox(stW - 0.1, 0.04, 0.07, 0.01), hazard(), 0, yy - 0.01, zz + tread / 2 - 0.07); fk.add(rbox(stW - 0.1, rise - 0.06, 0.03, 0.01), tealP(), 0, yy - rise / 2, zz + tread / 2 - 0.02); }
  for (const s of [-1, 1]) fk.add(pipe([[s * (stW / 2), 0.9, 0.1], [s * (stW / 2), -UY + 1.0, nS * tread]], 0.025, 0.1, 6), brass(), 0, 0, 0);
  fk.flush();
  // stair step colliders (enabled when lowered)
  const stepCols = [];
  for (let i = 1; i <= nS; i++) stepCols.push(B.col(stX, sz0 - (i - 0.5) * tread, stW / 2, tread / 2 + 0.1, i * rise, { enabled: false }));
  const STOW = -ang0; // raised: hinged up level with the deck, hanging on its chains
  flight.rotation.x = STOW;
  // gantry over the stair foot with the winch, the chains, and the ball switch
  const gZ = sz0 + 0.6, gH = 4.8;
  for (const s of [-1, 1]) { kt.at(stX + s * 1.25, 0, gZ, 0, () => column(kt, gH, 0.26)); B.ccol(stX + s * 1.25, gZ, 0.2, gH, { noStand: true }); }
  kt.at(stX, gH, gZ, 0, () => ibeam(kt, 2.9, 0.36, 0.26));
  kt.at(stX, gH + 0.38, gZ, 0, () => { kt.add(rbox(0.9, 0.42, 0.55, 0.05), teal(), 0, 0, 0); kt.add(cyl(0.22, 0.22, 0.7, 14), iron(), 0, 0.02, 0.38, 0, { rz: Math.PI / 2 }); kt.add(torus(0.2, 0.05, 6, 16), brass(), 0, 0.02, 0.38, Math.PI / 2); });
  const chains = [];
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 5), iron()); c.castShadow = false; B.group.add(c); chains.push({ c, s }); }
  const swTarget = { x: stX, y: 4.15, z: gZ + 0.3 };
  const swMat = stdM({ color: '#ff8a2a', emissive: '#ff6a00', emissiveIntensity: 1.8, roughness: 0.4 });
  const sw = new THREE.Group(); sw.position.set(swTarget.x, swTarget.y, swTarget.z); sw.rotation.y = Math.PI / 4; B.group.add(sw);
  { const m1 = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.1, 10, 24), swMat); sw.add(m1); const m2 = new THREE.Mesh(new THREE.CircleGeometry(0.34, 20), MAT.flat('#f4efe2', 0.6, { side: THREE.DoubleSide })); sw.add(m2); const m3 = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), swMat); m3.position.z = 0.01; sw.add(m3); }
  kt.add(cyl(0.03, 0.03, gH - swTarget.y - 0.3, 6), iron(), swTarget.x, (gH + swTarget.y + 0.4) / 2, swTarget.z);
  B.light('#ffb070', 2.5, 4, swTarget.x + 0.6, swTarget.y - 0.4, swTarget.z + 0.6);
  R.ballSwitch = { ...B.world(swTarget.x, swTarget.z), y: swTarget.y, on: false, setOn(b) { this.on = !!b; swMat.color.set(b ? '#6aff7a' : '#ff8a2a'); swMat.emissive.set(b ? '#20d040' : '#ff6a00'); } };
  R.ballTargets.push({ ...B.world(swTarget.x, swTarget.z), y: swTarget.y, r: 0.9, ballSwitch: true });
  let stairT = 0, stairGoal = 0;
  R.ladder = {
    ...B.world(stX, sz0 + 0.2), lowered: false,
    lower(instant = false) { this.lowered = true; stairGoal = 1; if (instant) stairT = 1; stepCols.forEach((c) => { c.enabled = true; }); },
  };
  const placeChains = () => {
    // chains from the winch drum to the stair's free end
    const e = new THREE.Vector3(0, -UY, nS * tread).applyEuler(flight.rotation).add(flight.position);
    for (const { c, s } of chains) {
      const a = new THREE.Vector3(stX + s * 0.3, gH + 0.38, gZ + 0.38), b = new THREE.Vector3(e.x + s * (stW / 2), e.y + 0.1, e.z);
      c.position.copy(a).add(b).multiplyScalar(0.5); c.scale.set(1, a.distanceTo(b), 1); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    }
  };
  placeChains();

  // --- the cooling shutter: a heavy hazard-striped door that rolls up into the wall once cooled
  const shutter = new THREE.Group(); shutter.position.set(doorX, 0, BZ + 0.12); B.group.add(shutter);
  const sk = new Kit(shutter);
  sk.add(rbox(2.7, 3.0, 0.18, 0.04), MAT.plates('#5a6670', 1), 0, 1.5, 0);
  for (let i = 0; i < 7; i++) sk.add(rbox(2.66, 0.05, 0.22, 0.01), iron(), 0, 0.2 + i * 0.42, 0);
  sk.add(rbox(2.7, 0.42, 0.21, 0.03), hazard(), 0, 0.22, 0);
  sk.at(0, 1.7, 0.1, 0, () => signPlate(sk, 1.4, 0.46, signMat(['HEAT SHUTTER', 'OPENS AT COOLING'], { w: 384, h: 126, bg: '#6a2a24', emblem: false })));
  sk.flush();
  for (const s of [-1, 1]) k.at(doorX + s * 1.5, 0, BZ + 0.18, 0, () => column(k, 3.2, 0.3));
  k.at(doorX, 3.3, BZ + 0.2, 0, () => ibeam(k, 3.4, 0.4, 0.3));
  k.add(rbox(3.2, 0.42, 0.5, 0.05), tealP(), doorX, 3.7, BZ + 0.2);
  const lamp = new THREE.Mesh(sphere(0.09, 10, 8), stdM({ color: '#ffd0c0', emissive: '#ff3020', emissiveIntensity: 2.2 }, 0, { noShadow: true })); lamp.position.set(doorX + 1.2, 3.62, BZ + 0.48); B.group.add(lamp);
  const doorCol = B.col(doorX, BZ + 0.6, 1.45, 0.6, 3.0);
  let shutT = 0, shutGoal = 0;
  R.coolDoor = { ...B.world(doorX, BZ + 0.6), isOpen: false, collider: doorCol, open(instant = false) { this.isOpen = true; shutGoal = 1; if (instant) shutT = 1; doorCol.enabled = false; lamp.material.emissive.set('#30ff60'); } };
  k.add(plane(2.6, 1.8), M('ughatch', () => stdM({ map: tiled(P.TEX.hazard().clone(), 3, 2), roughness: 0.6 })), doorX, 0.008, BZ + 1.2, 0, { rx: -Math.PI / 2 });
  R.exits.push({ ...B.world(doorX, BZ + 0.45), r: 0.8, to: 'c3-gallery' });
  R.exits.push({ ...B.world(LX + 0.45, entZ), r: 0.75, to: 'c3-shaft' });
  R.spawn = { ...B.world(LX + 1.7, entZ), a: Math.PI / 2 };

  // --- the bore's transmission in the corner: the drill string coming down, a ring gear and its motor
  const TX = { x: 9.5, z: -6.2 };
  const tstring = new THREE.Group(); tstring.position.set(TX.x, 0, TX.z); B.group.add(tstring);
  { const sm = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 12, 18, 1, true), M('ugstring', () => { const m = stdM({ map: drillTex(), roughness: 0.4, metalness: 0.55 }); m.map.repeat.set(2, 9); return m; })); sm.position.y = 6; sm.castShadow = false; tstring.add(sm); }
  const gear = new THREE.Mesh(P.gearGeo(1.35, 36, 0.3, 0.4), brass()); gear.rotation.x = -Math.PI / 2; gear.position.y = 1.45; tstring.add(gear);
  k.add(lathe([[0.6, 0], [1.6, 0], [1.6, 1.2], [1.45, 1.3], [0.6, 1.3]], 28), teal(), TX.x, 0, TX.z);
  k.add(torus(1.6, 0.05, 5, 28), hazard(), TX.x, 0.05, TX.z, 0, { rx: Math.PI / 2 });
  const pin = new THREE.Mesh(P.gearGeo(0.45, 12, 0.3, 0.3), brass()); pin.rotation.x = -Math.PI / 2; pin.position.set(TX.x - 1.65, 1.45, TX.z + 0.4); B.group.add(pin);
  k.add(lathe([[0.001, 0], [0.55, 0], [0.6, 0.1], [0.6, 1.0], [0.5, 1.1], [0.001, 1.1]], 20), tealP(), TX.x - 1.65, 1.75, TX.z + 0.4);
  k.add(rbox(1.2, 1.75, 1.2, 0.06), MAT.plates('#5a6670', 1), TX.x - 1.65, 0.88, TX.z + 0.4);
  for (let i = 0; i < 4; i++) k.add(rbox(0.9, 0.04, 0.02, 0.005), dark(), TX.x - 1.65, 0.6 + i * 0.18, TX.z + 1.01);
  for (let y = 3.0; y < 9; y += 2.0) { kt.add(torus(0.8, 0.07, 6, 24), tealP(), TX.x, y, TX.z, 0, { rx: Math.PI / 2 }); for (let i = 0; i < 3; i++) { const a = i * 2.1 + 0.4; kt.add(rbox(0.1, 0.1, 1.5, 0.02), iron(), TX.x + Math.sin(a) * 1.3, y, TX.z + Math.cos(a) * 1.3, a); } }
  B.ccol(TX.x, TX.z, 1.65, 3.0, { noStand: true });
  B.col(TX.x - 1.65, TX.z + 0.4, 0.62, 0.62, 2.9, { noStand: true });
  k.at(TX.x - 0.3, 2.2, BZ + 0.02, 0, () => signPlate(k, 1.0, 0.36, signMat(['BORE 1', 'DRIVE'], { w: 320, h: 116, bg: '#6a2a24' })));

  // --- cover on the lower floor for the drone's rounds
  R.cover = [];
  const cover = (x, z, r) => R.cover.push({ ...B.world(x, z), r });
  crateStack(B, -8.4, 2.0, 0.15, [[1.1, 0.85, 1.0], [0.85, 0.7, 0.8, null, -0.2]]); cover(-8.4, 2.0, 0.8);
  crateStack(B, -7.4, 0.3, -0.1, [[0.9, 0.8, 0.9]]); cover(-7.4, 0.3, 0.6);
  // a stack of big pipe sections on chocks
  const psX = -2.2, psZ = 3.0;
  k.at(psX, 0, psZ, 0, () => {
    for (const x of [-1.2, 1.2]) k.add(rbox(0.25, 0.22, 1.7, 0.03), MAT.wood('grey'), x, 0.11, 0);
    const rr = 0.36;
    [[-0.38, 0], [0.38, 0], [0, 1]].forEach(([z, row]) => { const y = 0.22 + rr + row * rr * 1.7; k.add(cyl(rr, rr, 3.2, 18, true), twoSided(MAT.paint('#6a7880', 0.45)), 0, y, z * (row ? 0 : 1), 0, { rz: Math.PI / 2 }); for (const s of [-1, 1]) k.add(torus(rr, 0.04, 5, 18), brass(), s * 1.6, y, z * (row ? 0 : 1), Math.PI / 2); });
  });
  B.col(psX, psZ, 1.65, 0.8, 1.75, { noStand: true }); cover(psX, psZ, 1.2);
  // the parked tug and its trailer
  const cgX = 3.2, cgZ = 3.4;
  k.at(cgX, 0, cgZ, 0.05, () => {
    k.add(rbox(1.4, 0.7, 1.1, 0.08), MAT.paint('#d8a13b', 0.45), -1.1, 0.6, 0);
    k.add(rbox(0.7, 0.55, 1.0, 0.06), MAT.paint('#d8a13b', 0.45), -1.45, 1.2, 0);
    k.add(rbox(0.5, 0.05, 0.9, 0.02), MAT.glass('#bfe6ff', 0.4), -1.08, 1.25, 0, 0, { rz: 0.4 });
    for (const sx of [-1.5, -0.6, 0.6, 1.5]) for (const sz of [-0.52, 0.52]) k.add(cyl(0.24, 0.24, 0.16, 16), dark(), sx, 0.24, sz, 0, { rx: Math.PI / 2 });
    k.add(rbox(2.0, 0.12, 1.1, 0.03), deck(), 0.95, 0.5, 0);
    k.at(0.75, 0.56, 0, 0.1, () => P.cargoCrate(k, { w: 0.8, h: 0.7, d: 0.8 }));
    k.at(1.5, 0.56, 0.1, -0.2, () => P.barrel(k, { r: 0.28, h: 0.8, pal: 'grey' }));
    k.add(sphere(0.07, 8, 6), MAT.glow('#fff4c0', '#ffd060', 2), -1.82, 0.85, 0.35);
    k.add(sphere(0.07, 8, 6), MAT.glow('#fff4c0', '#ffd060', 2), -1.82, 0.85, -0.35);
  });
  B.col(cgX, cgZ, 2.0, 0.6, 1.5, { rot: 0.05, noStand: true }); cover(cgX - 1.0, cgZ, 0.8); cover(cgX + 0.9, cgZ, 0.8);
  crateStack(B, 7.8, 5.9, 0.2, [[1.0, 0.85, 0.9], [0.7, 0.6, 0.7, null, 0.3]]); cover(7.8, 5.9, 0.7);
  // a pump skid by the exchanger
  const puX = -1.4, puZ = -4.6;
  k.at(puX, 0, puZ, 0, () => {
    k.add(rbox(1.8, 0.12, 1.0, 0.03), iron(), 0, 0.06, 0);
    k.add(lathe([[0.001, 0], [0.38, 0], [0.4, 0.05], [0.4, 0.75], [0.3, 0.85], [0.001, 0.85]], 18), tealP(), -0.4, 0.5, 0, 0, { rz: Math.PI / 2 });
    k.add(cyl(0.42, 0.42, 0.36, 18), MAT.paint('#3a4448', 0.45), 0.5, 0.55, 0, 0, { rz: Math.PI / 2 });
    k.add(pipe([[0.5, 0.97, 0], [0.5, 1.3, 0], [1.3, 1.3, 0], [1.3, EY, 0.0]], 0.09, 0.15, 8), MAT.paint('#7a7a80', 0.4), 0, 0, 0);
  });
  B.col(puX, puZ, 0.95, 0.55, 1.4, { noStand: true }); cover(puX, puZ, 0.6);
  for (const [x, z] of [[9.9, -2.6], [10.4, -1.9], [9.8, -1.2]]) B.put(x, z, 0, P.barrel, { r: 0.3, h: 0.85, pal: 'grey' });
  // tool lockers and a fire point under the catwalk, a workbench by the entrance
  for (let i = 0; i < 3; i++) B.put(-4.3 + i * 0.95, BZ + 0.28, 0, P.locker, { w: 0.9, d: 0.5, h: 1.95 });
  k.at(-1.0, 1.4, BZ + 0.02, 0, () => { k.add(rbox(0.5, 0.7, 0.06, 0.02), MAT.paint('#c8302a', 0.4), 0, 0, 0.03); k.add(lathe([[0.001, 0], [0.09, 0], [0.09, 0.42], [0.04, 0.5], [0.001, 0.5]], 12), MAT.paint('#c8302a', 0.35), 0, -0.3, 0.17); });
  B.put(LX + 0.45, -5.6, Math.PI / 2, P.instrumentRack, { w: 1.2, kind: 'bars' });
  B.put(LX + 0.42, 0.4, Math.PI / 2, P.console_, { w: 1.4, kinds: ['wave'], levers: 2 });

  // gas bottles on a trolley, a hose reel, pallets by the near rim
  k.at(-5.6, 0, 6.9, 0.1, () => {
    k.add(rbox(1.2, 0.1, 0.6, 0.02), iron(), 0, 0.2, 0);
    for (const sx of [-0.45, 0.45]) k.add(cyl(0.12, 0.12, 0.08, 12), dark(), sx, 0.12, 0.32, 0, { rx: Math.PI / 2 });
    k.add(pipe([[-0.6, 0.2, -0.25], [-0.6, 1.1, -0.25], [-0.6, 1.1, 0.25], [-0.6, 0.2, 0.25]], 0.02, 0.06, 5), iron(), 0, 0, 0);
    for (const [x, c] of [[-0.3, '#3a6fb0'], [0.0, '#c8302a'], [0.3, '#3a6fb0']]) { k.add(lathe([[0.001, 0], [0.13, 0], [0.13, 0.95], [0.08, 1.08], [0.03, 1.12], [0.001, 1.12]], 12), MAT.paint(c, 0.4), x, 0.25, 0); k.add(cyl(0.03, 0.03, 0.1, 6), brass(), x, 1.4, 0); }
  });
  B.col(-5.6, 6.9, 0.65, 0.35, 1.4, { rot: 0.1, noStand: true });
  k.at(-0.6, 0, 6.9, 0, () => { for (const s of [-1, 1]) k.add(cyl(0.5, 0.5, 0.06, 18), MAT.paint('#c8302a', 0.45), 0, 0.55, s * 0.22, 0, { rx: Math.PI / 2 }); k.add(cyl(0.34, 0.34, 0.44, 16), MAT.flat('#e8b830', 0.6), 0, 0.55, 0, 0, { rx: Math.PI / 2 }); for (let i = 0; i < 4; i++) k.add(torus(0.36, 0.04, 5, 18), MAT.flat('#d8a020', 0.6), 0, 0.55, -0.15 + i * 0.1); k.add(rbox(0.1, 0.55, 0.6, 0.02), iron(), 0, 0.27, 0); });
  B.ccol(-0.6, 6.9, 0.5, 1.05, { noStand: true });
  k.at(1.4, 0, 6.8, -0.1, () => { for (let i = 0; i < 4; i++) { k.add(rbox(1.2, 0.04, 1.0, 0.01), MAT.wood('pale'), 0, 0.12 + i * 0.15, 0); for (const z of [-0.4, 0, 0.4]) k.add(rbox(1.2, 0.1, 0.12, 0.01), MAT.wood('honey'), 0, 0.05 + i * 0.15, z); } });
  B.col(1.4, 6.8, 0.6, 0.5, 0.64, { rot: -0.1, noStand: true });

  // --- the diagram on the left wall by the entrance
  const dgZ = 2.3;
  k.at(LX + 0.04, 1.75, dgZ, Math.PI / 2, () => { k.add(rbox(1.68, 1.16, 0.06, 0.02), brass(), 0, 0, 0.02); k.add(plane(1.56, 1.04), M('ugdiagM', () => stdM({ map: diagramTex(), roughness: 0.7 })), 0, 0, 0.055); for (const [sx, sy] of [[-0.78, 0.52], [0.78, 0.52], [-0.78, -0.52], [0.78, -0.52]]) k.add(sphere(0.025, 6, 4), iron(), sx, sy, 0.06); });
  k.at(LX + 0.35, 2.55, dgZ, Math.PI / 2, () => wallLamp(k, { arm: 0.25 }));
  B.light('#fff0d0', 3, 4, LX + 1.2, 2.3, dgZ);
  R.diagram = { ...B.world(LX + 0.9, dgZ), y: 1.75 };
  // painted walkway lines: entrance → stair → shutter
  const line = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az); k.add(plane(L, 0.1), MAT.flat('#e8b830', 0.7), (ax + bx) / 2, 0.004, (az + bz) / 2, -Math.atan2(bz - az, bx - ax), { rx: -Math.PI / 2 }); };
  for (const off of [-0.7, 0.7]) { line(LX + 0.6, entZ + off, -1.0, entZ + off); }
  line(doorX - 0.8, -5.0, doorX - 0.8, -4.0); line(doorX + 0.8, -5.0, doorX + 0.8, -0.8);

  // --- light: high bay lamps, wall lamps, the cyan of the coolant and the shutter's warning lamp
  for (const [x, z] of [[-6.0, 2.4], [0.8, 1.0], [6.8, -2.0]]) { k.at(x, 0, z, 0, () => P.hangingLamp(k, 4.2, H + 0.2, { shade: TEAL })); B.light('#ffe6c4', 8, 10, x, 3.9, z); }
  for (const [x, z, ry] of [[LX, -5.0, Math.PI / 2], [-6.8, BZ, 0], [2.2, BZ, 0]]) { k.at(x, ry ? 2.6 : UY + 1.6, z, ry, () => wallLamp(k)); }
  B.light('#ffe2b8', 4, 7, -6.8, UY + 1.6, BZ + 1.2);
  B.light('#ffe2b8', 4, 7, 2.2, 2.4, BZ + 1.2);
  B.light('#ff6a40', 2.5, 4, doorX, 3.2, BZ + 1.0);
  B.light('#c8d0e8', 2.5, 26, 0, 8, 2);

  flushNoShadow(kt);
  let wasFlow = '';
  R.updaters.push((dt, tt) => {
    tstring.rotation.y = tt * 1.1;
    pin.rotation.z = -tt * 1.1 * (1.35 / 0.45);
    // stair and shutter animation
    if (stairT < stairGoal) { stairT = Math.min(1, stairT + dt / 1.6); const e = stairT * stairT * (3 - 2 * stairT); flight.rotation.x = STOW * (1 - e); placeChains(); }
    else if (stairT >= 1 && flight.rotation.x !== 0) { flight.rotation.x = 0; placeChains(); }
    if (shutT < shutGoal) { shutT = Math.min(1, shutT + dt / 2.2); shutter.position.y = 3.1 * shutT * shutT * (3 - 2 * shutT); }
    else if (shutT >= 1) shutter.position.y = 3.1;
    // valve wheels spin toward their state; coolant flows
    for (const v of R.valves) {
      const goal = v.open ? 1 : 0; v.turn += Math.sign(goal - v.turn) * Math.min(Math.abs(goal - v.turn), dt * 1.2);
      wheels[v.id].children.forEach((c) => { c.rotation.z = -v.turn * Math.PI * 3; });
      const m = flowMats[v.id];
      m.emissiveIntensity = 1.5 * v.turn;
      m.color.setRGB(0.16 + 0.1 * v.turn, 0.2 + 0.3 * v.turn, 0.23 + 0.35 * v.turn);
      m.userData.flow.offset.x = -tt * 0.9;
    }
    const st = R.valves.map((v) => +v.open).join('');
    if (st !== wasFlow) { wasFlow = st; refresh(); }
    drainGlow.material.opacity = 0.7 * R.valves[1].turn;
    exLight.intensity = exLight.userData.base * (0.8 + Math.sin(tt * 3) * 0.2);
    lamp.material.emissiveIntensity = R.coolDoor.isOpen ? 2.2 : 1.2 + Math.max(0, Math.sin(tt * 4)) * 1.6;
  });

  // the drone's loop over the lower floor (world coords): round the pipe stack, the tug and the exchanger
  R.patrol = [[-4.2, 0.9], [5.6, -0.3], [5.6, 5.5], [0.4, 5.6], [-4.6, 5.4]].map(([x, z]) => [B.cx + x, B.cz + z]);
  const room = B.finish();
  room.center.set(B.cx - 0.6, 0, B.cz - 0.8);
  return room;
}

// ================================================================ 3. c3gallery — the crystal galleries
// A big cave of giant crystals (the well's species, grown huge) split by a chasm. The walking level is a
// rock shelf at DY on both sides; the chasm floor is 3.3 m below (a fall hurts, and a rough stair of ledges
// leads back up to the start side). Three crystal pillars stand in the chasm: lighting one with the ball
// raises its set of stepping stones. Vesk's crew crossed on a steel bridge that has since fallen in.
function buildGallery(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'c3gallery', 2000, 0);
  const R = B.room, k = B.k, kt = new Kit(B.group);
  const W = 26, D = 20, DY = 3.0, CY = -0.3, WH = 5.4, t = 0.7;
  const CX0 = -5, CX1 = 5; // the chasm
  R.view = 20.5; R.follow = 0.28; R.cave = true; R.music = 'under'; R.deckY = DY;
  const BZ = -D / 2, LX = -W / 2;
  const rock = rockMat('#b0a4b4'), rockD = rockMat('#7c7088'), rockC = rockMat('#948aa4');
  const floor = floorMat('#6e6474', 'rgba(36,26,48,0.4)', 'gallery');
  const entZ = 5.0, exX = 8.6;

  // --- the two shelves and the chasm floor
  const shelf = (x0, x1) => {
    const w = x1 - x0, cx = (x0 + x1) / 2;
    k.add(new THREE.BoxGeometry(w, DY + 1.2, D + 2 * t), rockC, cx, (DY - 1.2) / 2, 0);
    k.add(new THREE.BoxGeometry(w, 0.08, D), floor, cx, DY - 0.03, 0);
    B.col(cx, 0, w / 2, D / 2, DY, { seeThrough: true, bottom: -2 });
  };
  shelf(LX - t, CX0); shelf(CX1, W / 2 + t);
  k.add(new THREE.BoxGeometry(CX1 - CX0, 0.9, D + 2 * t), rockD, 0, CY - 0.45, 0);
  k.add(new THREE.BoxGeometry(CX1 - CX0, 0.06, D), floorMat('#3e3646', 'rgba(20,10,30,0.5)', 'chasm'), 0, CY + 0.02, 0);
  B.col(0, 0, (CX1 - CX0) / 2 + 0.6, D / 2 + 0.3, CY, { seeThrough: true, bottom: -2 }); // overlaps the shelves: no seam
  // cliff faces of the chasm: faceted boulders jammed along both edges, below the lip
  const cliff = (x, dir, seed) => {
    const r = rng(seed);
    for (let z = -D / 2 + 0.4; z < D / 2; z += 1.2 + r() * 0.5) {
      for (const [y0, sy] of [[CY - 0.1, 1.5 + r() * 0.6], [1.15, 1.0 + r() * 0.5]]) k.add(rockGeo(Math.floor(r() * 40)), rockC, x + dir * (0.1 + r() * 0.25), y0, z, r() * 6, { sx: 0.7 + r() * 0.3, sy, sz: 0.9 + r() * 0.4 });
    }
    // the lip: a bevelled rim along the edge, catching the crystal light
    k.add(rbox(0.5, 0.22, D, 0.08), rock, x - dir * 0.15, DY - 0.08, 0);
  };
  cliff(CX0, 1, 51); cliff(CX1, -1, 57);
  // crystal debris and glowing cracks on the chasm floor
  for (const [x, z, s, sd] of [[-2.6, -8.0, 0.5, 1], [2.8, -4.4, 0.4, 2], [-3.4, 3.8, 0.35, 3], [0.6, 7.6, 0.5, 4], [3.6, 1.6, 0.3, 5], [-0.6, -2.6, 0.3, 6]]) k.at(x, CY, z, sd, () => crystals(k, 4, s, sd + 60, [CYAN(), VIOLET(), DIM()]));
  const crackMat = M('ugcrack', () => stdM({ color: '#d8f8ff', emissive: '#40d8ff', emissiveIntensity: 1.6, roughness: 0.3 }, 0, { noShadow: true }));
  { const r = rng(9); for (let c = 0; c < 7; c++) { let x = (r() - 0.5) * 8, z = (r() - 0.5) * 18; const pts = [[x, CY + 0.06, z]]; for (let j = 0; j < 6; j++) { x = Math.max(CX0 + 0.4, Math.min(CX1 - 0.4, x + (r() - 0.5) * 1.6)); z += (r() - 0.5) * 2.4; pts.push([x, CY + 0.06, z]); } k.add(pipe(pts, 0.035, 0.2, 4), crackMat, 0, 0, 0); } }
  motes(B, [[0, -6, 4], [0, 0, 4], [0, 6, 4]], { n: 70, color: '#a8e8ff', size: 0.45, op: 0.18, hmax: 2.4, speed: 0.25, y0: CY });

  // --- walls: rough rock rising from the chasm floor to above the shelves
  const bwH = WH + DY - CY, a0 = exX - 1.9 - (LX - t);
  k.at(LX - t, CY, BZ, 0, () => rockWallRun(k, a0, bwH, 61, rock, { tiers: 3, depth: 1.2, step: 1.8, top: 0.3 }));
  k.at(exX + 1.9, CY, BZ, 0, () => rockWallRun(k, W / 2 + t - exX - 1.9, bwH, 62, rock, { tiers: 3, depth: 1.2, step: 1.8, top: 0.3 }));
  k.add(new THREE.BoxGeometry(3.8, bwH, 0.6), rock, exX, CY + bwH / 2, BZ - 0.78);
  k.add(new THREE.BoxGeometry(3.8, bwH - (DY - CY) - 3.7, 0.9), rock, exX, DY + 3.7 + (bwH - (DY - CY) - 3.7) / 2, BZ - 0.3);
  k.at(LX, DY, D / 2 + t, Math.PI / 2, () => {
    // left wall, broken by the tunnel from the deep installation
    const a = D / 2 + t - entZ;
    rockWallRun(k, a - 1.4, WH, 63, rock, { tiers: 2, depth: 1.1, step: 1.7, top: 0.3 });
    k.at(a + 1.4, 0, 0, 0, () => rockWallRun(k, D + t - a - 1.4, WH, 64, rock, { tiers: 2, depth: 1.1, step: 1.7, top: 0.3 }));
    k.add(new THREE.BoxGeometry(2.9, WH - 2.7, 1.0), rock, a, 2.7 + (WH - 2.7) / 2, -0.7);
    k.add(rockGeo(5), rock, a, 2.5, -0.4, 0.4, { sx: 2.0, sy: 1.6, sz: 0.8 });
  });
  B.col(0, BZ - 0.35 + 0.3, W / 2 + t, 0.65, DY + WH);
  // left wall colliders either side of the tunnel
  B.col(LX - 0.05, (entZ + 1.4 + D / 2) / 2, 0.65, (D / 2 - entZ - 1.4) / 2 + t, DY + WH);
  B.col(LX - 0.05, (entZ - 1.4 - D / 2) / 2, 0.65, (entZ - 1.4 + D / 2) / 2 + t, DY + WH);
  // near rims (low) and their colliders
  const rimH = 0.55, rr = rng(71);
  k.add(new THREE.BoxGeometry(CX0 - LX + t, rimH, t), rock, (LX - t + CX0) / 2, DY + rimH / 2, D / 2 + t / 2);
  k.add(new THREE.BoxGeometry(W / 2 + t - CX1, rimH, t), rock, (CX1 + W / 2 + t) / 2, DY + rimH / 2, D / 2 + t / 2);
  k.add(new THREE.BoxGeometry(t, rimH, D + t), rock, W / 2 + t / 2, DY + rimH / 2, -t / 2);
  for (let x = LX; x < W / 2 + t; x += 1.1 + rr() * 0.6) { if (x > CX0 - 0.3 && x < CX1 + 0.3) continue; k.add(rockGeo(Math.floor(rr() * 30)), rock, x, DY + rimH * 0.5, D / 2 + t * 0.5, rr() * 6, { sx: 0.6 + rr() * 0.4, sy: rimH * (0.6 + rr() * 0.6), sz: t * 0.75 }); }
  for (let z = -D / 2; z < D / 2 + t; z += 1.1 + rr() * 0.6) k.add(rockGeo(Math.floor(rr() * 30)), rock, W / 2 + t * 0.5, DY + rimH * 0.5, z, rr() * 6, { sx: t * 0.75, sy: rimH * (0.6 + rr() * 0.6), sz: 0.6 + rr() * 0.4 });
  k.add(new THREE.BoxGeometry(CX1 - CX0, 0.5, t), rockD, 0, CY + 0.25, D / 2 + t / 2);
  B.col(0, D / 2 + t / 2, W / 2 + t, t / 2, DY + WH);
  B.col(W / 2 + t / 2, 0, t / 2, D / 2 + t, DY + WH);

  // --- the way back up from the chasm floor: rough ledges against the start cliff (near end)
  const ledges = 7;
  for (let i = 1; i <= ledges; i++) {
    const top = CY + (i * (DY - CY)) / ledges, z = 9.3 - (i - 1) * 0.72, x = CX0 + 0.65;
    k.add(rockGeo(80 + i, { rough: 0.18, flat: 0.6 }), rockC, x, CY, z, i, { sx: 0.75, sy: (top - CY) / 1.6, sz: 0.55 });
    k.add(rbox(1.2, 0.12, 0.75, 0.05), rock, x, top - 0.06, z, i * 0.3);
    B.col(x, z, 0.65, 0.42, top);
  }

  // --- the entrance tunnel from the deep installation: rough rock, project shoring, a lamp
  k.at(LX, DY, entZ, Math.PI / 2, () => {
    k.add(new THREE.BoxGeometry(2.6, 0.08, 3.2), floor, 0, -0.03, -1.4);
    for (let z = -0.4; z > -3.0; z -= 1.1) { for (const s of [-1, 1]) k.add(rbox(0.18, 2.6, 0.18, 0.03), MAT.wood('grey'), s * 1.15, 1.3, z); k.add(rbox(2.6, 0.2, 0.22, 0.03), MAT.wood('grey'), 0, 2.6, z); }
    k.add(plane(2.4, 2.8), MAT.flat('#060508', 1), 0, 1.4, -3.0);
    for (const s of [-1, 1]) for (let z = -0.6; z > -3; z -= 1.0) k.add(rockGeo(90 + Math.round(-z * 5) + (s > 0 ? 7 : 0)), rockD, s * 1.55, 0, z, z, { sx: 0.7, sy: 1.6, sz: 0.8 });
    k.at(-1.0, 2.2, -0.2, Math.PI / 2, () => wallLamp(k, { arm: 0.25 }));
  });
  B.light('#ffdcb0', 4.5, 6, LX + 1.2, DY + 2.2, entZ);
  // the crew's marks at the edge: hazard posts and tape, a survey tripod, a warning board
  const tape = [[-5.4, 6.8], [-5.4, 3.6], [-5.4, -0.2], [-5.4, -3.8]];
  tape.forEach(([x, z]) => k.at(x, DY, z, 0, () => { k.add(cyl(0.05, 0.06, 1.0, 8), MAT.paint('#e8b830', 0.5), 0, 0.5, 0); k.add(rbox(0.12, 0.08, 0.12, 0.02), hazard(), 0, 0.85, 0); }));
  for (let i = 1; i < tape.length; i++) if (i !== 2) k.add(pipe(sag([tape[i - 1][0], DY + 0.85, tape[i - 1][1]], [tape[i][0], DY + 0.85, tape[i][1]], 0.12, 6), 0.02, 0.05, 4), MAT.flat('#e8b830', 0.6), 0, 0, 0);
  k.at(-6.2, DY, 1.9, -0.4, () => { k.add(cyl(0.04, 0.04, 1.5, 6), iron(), 0, 0.75, 0); k.at(0, 1.6, 0.02, 0, () => signPlate(k, 0.9, 0.5, signMat(['DANGER', 'BRIDGE OUT'], { w: 320, h: 170, bg: '#6a2a24', emblem: false }))); });
  B.ccol(-6.2, 1.9, 0.12, DY + 2.0, { noStand: true, seeThrough: true });
  k.at(-7.8, DY, -6.6, 2.4, () => floodlight(k, { h: 1.5, tilt: 0.3 })); B.ccol(-7.8, -6.6, 0.35, DY + 2, { noStand: true });
  B.light('#fff0d0', 4, 8, -7.4, DY + 1.6, -5.9);
  crateStack(B, -11.6, -1.4, 0.2, [[0.9, 0.75, 0.9], [0.7, 0.55, 0.7, null, 0.3]], DY);
  crateStack(B, -10.6, -2.4, -0.3, [[0.7, 0.6, 0.7]], DY);

  // --- the fallen bridge: a steel walkway torn from the far side, hanging into the chasm
  const fb = { x: CX1, z: 8.2 };
  tilt(kt, fb.x, DY - 0.1, fb.z, -Math.PI / 2, 1.0, 0.15, () => {
    kt.add(rbox(1.4, 0.08, 5.2, 0.02), deck(), 0, 0, 2.6);
    for (const s of [-1, 1]) { kt.add(rbox(0.08, 0.3, 5.2, 0.02), tealP(), s * 0.7, -0.1, 2.6); kt.add(pipe([[s * 0.68, 0.9, 0.2], [s * 0.68, 0.9, 4.9]], 0.025, 0.05, 6), brass(), 0, 0, 0); for (let z = 0.4; z < 5; z += 1.1) kt.add(cyl(0.02, 0.02, 0.9, 5), brass(), s * 0.68, 0.45, z); }
    kt.add(rbox(1.4, 0.08, 0.3, 0.02), hazard(), 0, 0.05, 5.1);
  });
  k.at(fb.x + 0.3, DY, fb.z, 0, () => { k.add(rbox(0.6, 0.25, 1.8, 0.04), iron(), 0, 0.12, 0); for (const s of [-1, 1]) k.add(cyl(0.06, 0.06, 0.2, 8), brass(), 0, 0.3, s * 0.7); });
  k.at(-5.3, DY, 8.4, 0, () => { k.add(rbox(0.6, 0.25, 1.8, 0.04), iron(), 0, 0.12, 0); k.add(rbox(0.5, 0.06, 1.4, 0.02), deck(), 0.45, 0.24, 0, 0, { rz: -0.5 }); });

  // --- three crystal pillars in the chasm, each with a heart the ball can wake
  R.pillars = [];
  const PIL = [{ x: -2.4, z: -3.9, h: 8.5, s: 0.95 }, { x: 0.9, z: -6.0, h: 9.5, s: 0.95 }, { x: 0.1, z: -8.3, h: 10.5, s: 1.1 }];
  PIL.forEach((p, i) => {
    const g = new THREE.Group(); B.group.add(g);
    const pk = new Kit(g);
    const body = stdM({ color: '#8a90b0', emissive: '#3a2a7a', emissiveIntensity: 0.35, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.93, flatShading: true }, 0, { noShadow: true });
    const heart = stdM({ color: '#9aa4b8', emissive: '#203048', emissiveIntensity: 0.3, roughness: 0.1, flatShading: true }, 0, { noShadow: true });
    const r = rng(300 + i);
    pk.add(rockGeo(200 + i), rockD, p.x, CY, p.z, i, { sx: 1.6 * p.s, sy: 1.1, sz: 1.5 * p.s });
    pk.add(crystalGeo(), body, p.x, CY, p.z, i, { sx: 0.75 * p.s, sy: p.h, sz: 0.75 * p.s, rx: 0.05, rz: -0.06 });
    for (let j = 0; j < 7; j++) { const a = (j / 7) * Math.PI * 2 + r(), d = 0.5 + r() * 0.5; pk.add(crystalGeo(), body, p.x + Math.cos(a) * d * p.s, CY, p.z + Math.sin(a) * d * p.s, r() * 3, { sx: (0.25 + r() * 0.2) * p.s, sy: p.h * (0.3 + r() * 0.45), sz: (0.25 + r() * 0.2) * p.s, rx: Math.cos(a) * 0.25, rz: -Math.sin(a) * 0.25 }); }
    // the heart: a fat crystal set into the pillar's face toward the start shelf, at shelf height
    const hx = p.x - 0.75 * p.s, hy = DY + 1.6, hz = p.z;
    pk.add(new THREE.OctahedronGeometry(0.55, 0), heart, hx, hy, hz, 0.4, { sy: 1.5 });
    pk.flush();
    const light = B.light('#7af0ff', 0, 9, hx - 0.8, hy + 0.5, hz);
    light.userData.base = 0.0;
    const glow = glowSprite('#9ff4ff', 2.6, 0); glow.position.set(hx - 0.1, hy, hz); B.group.add(glow);
    B.ccol(p.x, p.z, 0.85 * p.s, DY + 6);
    const pl = {
      i, ...B.world(hx, hz), y: hy, lit: false, light, t: 0,
      setLit(b) { this.lit = !!b; },
    };
    pl.body = body; pl.heart = heart; pl.glow = glow;
    R.pillars.push(pl);
    R.ballTargets.push({ ...B.world(hx, hz), y: hy, r: 1.0, pillar: i });
  });

  // --- the stepping stones, three sets, raised from the chasm floor (colliders only when up)
  const SP = [[-3.6, 2.6], [-1.9, 1.2], [0.0, 0.0], [1.6, -1.5], [3.85, -1.9]], SETS = [[0, 1], [2], [3, 4]], SR = 0.65;
  const stoneGroup = new THREE.Group(); B.group.add(stoneGroup);
  const stones = SP.map(([x, z], j) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); stoneGroup.add(g);
    const sk = new Kit(g);
    sk.add(lathe([[0.001, -4.2], [SR * 1.05, -4.2], [SR * 1.1, -1.2], [SR, -0.15], [SR - 0.08, 0], [0.001, 0]], 7), rock, 0, 0, 0, j);
    sk.add(cyl(SR - 0.06, SR - 0.04, 0.05, 7), rock, 0, 0.0, 0, j);
    tilt(sk, SR * 0.8, -0.6, 0, j * 1.3, 0, -0.9, () => crystals(sk, 3, 0.35, 400 + j, [CYAN(), VIOLET()]));
    sk.add(torus(SR - 0.12, 0.03, 4, 7), crackMat, 0, 0.012, 0, j, { rx: Math.PI / 2 });
    sk.flush();
    const low = CY - 0.9;
    g.position.y = low;
    const c = B.ccol(x, z, SR, low, { enabled: false });
    return { g, c, low, top: DY - 0.02, t: -1, delay: 0 };
  });
  const raised = [false, false, false];
  R.stones = {
    group: stoneGroup, sets: SETS.map((s) => s.map((j) => stones[j])), raised,
    raise(i, instant = false) {
      if (raised[i]) return; raised[i] = true;
      SETS[i].forEach((j, n) => { const s = stones[j]; s.c.enabled = true; s.t = instant ? 99 : -n * 0.35; });
    },
  };

  // --- giant crystals: the gallery's forest, on the shelves and up the walls
  const giant = (x, y, z, n, s, sd, mats, ry = 0, rx = 0, rz = 0) => tilt(kt, x, y, z, ry, rx, rz, () => crystals(kt, n, s, sd, mats, 0.45));
  giant(-11.6, DY, -8.6, 7, 2.2, 501, [CYAN(), VIOLET(), CYAN()], 0.3, 0.12, 0.1);
  giant(-12.2, DY, -3.6, 5, 1.3, 502, [VIOLET(), CYAN()], 0, 0, -0.35);
  giant(-7.0, DY, -9.4, 6, 1.6, 503, [CYAN(), VIOLET()], 0, 0.3, 0);
  giant(11.6, DY, -9.2, 4, 1.1, 504, [VIOLET(), CYAN()], 0, 0.35, 0);
  giant(12.0, DY, -6.0, 6, 1.9, 505, [CYAN(), VIOLET(), CYAN()], 0, 0, 0.3);
  giant(11.6, DY, 3.0, 5, 1.4, 506, [VIOLET(), CYAN()], 0, 0, 0.25);
  giant(-12.0, DY, 8.6, 4, 1.0, 507, [CYAN(), VIOLET()], 0, -0.2, -0.2);
  giant(-3.6, CY, -9.4, 5, 1.6, 508, [VIOLET(), CYAN()], 0, 0.25, 0);
  giant(6.6, DY, 8.8, 3, 0.8, 509, [CYAN(), DIM()], 0, -0.3, 0);
  for (const [x, z, r] of [[-11.6, -8.6, 1.6], [-12.2, -3.6, 0.9], [-7.0, -9.4, 1.1], [11.6, -9.2, 0.8], [12.0, -6.0, 1.3], [11.6, 3.0, 1.0], [-12.0, 8.6, 0.7], [6.6, 8.8, 0.6]]) B.ccol(x, z, r, DY + 4, { noStand: true });
  // crystals breaking out of the walls high up
  for (const [x, y, z, ry, s, sd] of [[LX + 0.3, DY + 2.6, -6.0, Math.PI / 2, 0.8, 520], [LX + 0.3, DY + 3.2, 1.2, Math.PI / 2, 0.6, 521], [-3.0, DY + 2.8, BZ + 0.3, 0, 0.9, 522], [3.8, DY + 3.4, BZ + 0.3, 0, 0.7, 523], [10.5, DY + 2.4, BZ + 0.3, 0, 0.6, 524]]) tilt(kt, x, y, z, ry, Math.PI / 2 - 0.3, 0, () => crystals(kt, 6, s, sd, [CYAN(), VIOLET(), DIM()], 0.6));
  // rocks on the shelves
  for (const [x, z, s, sy, sd] of [[-9.6, 8.2, 1.1, 0.9, 531], [-8.8, -2.2, 0.7, 0.6, 532], [9.6, 7.6, 1.0, 0.8, 533], [7.4, -6.6, 0.9, 1.1, 534], [11.8, -1.8, 0.8, 0.7, 535]]) { k.add(rockGeo(sd), rock, x, DY, z, sd, { sx: s, sy, sz: s }); B.ccol(x, z, s * 0.85, DY + sy * 1.2, { noStand: true }); }
  { const r = rng(77); for (let i = 0; i < 110; i++) { const x = (r() - 0.5) * (W - 1), z = (r() - 0.5) * (D - 1); if (x > CX0 - 0.6 && x < CX1 + 0.6) continue; if (Math.hypot(x - (LX + 1.5), z - entZ) < 1.8 || Math.hypot(x - exX, z - BZ) < 2.2) continue; const s = 0.08 + r() * r() * 0.3; k.add(rockGeo(Math.floor(r() * 30), { detail: 0 }), rockD, x, DY - 0.02, z, r() * 6, { sx: s * (1 + r()), sy: s * 0.8, sz: s }); } }

  // --- the far side: an old carved arch in the back wall, smooth pale stone — the way to Sendell
  const old = MAT.stone('lav', 1.6), oldC = MAT.plaster('#d8d4e4');
  k.at(exX, DY, BZ, 0, () => {
    const aw = 2.2, ah = 3.0;
    k.add(slab('ugarch', (s) => { s.moveTo(-aw / 2 - 0.6, 0); s.lineTo(-aw / 2, 0); s.lineTo(-aw / 2, ah - aw / 2); s.absarc(0, ah - aw / 2, aw / 2, Math.PI, 0, true); s.lineTo(aw / 2, 0); s.lineTo(aw / 2 + 0.6, 0); s.lineTo(aw / 2 + 0.6, ah + 0.7); s.lineTo(-aw / 2 - 0.6, ah + 0.7); s.lineTo(-aw / 2 - 0.6, 0); }, 0.5, 0.06), old, 0, 0, 0.05);
    k.add(torus(aw / 2 + 0.22, 0.09, 6, 24, Math.PI), oldC, 0, ah - aw / 2, 0.32);
    for (const sx of [-1, 1]) k.add(rbox(0.32, ah - aw / 2, 0.2, 0.06), oldC, sx * (aw / 2 + 0.22), (ah - aw / 2) / 2, 0.32);
    // the two suns over the keystone, worn
    for (const [sx, rr] of [[-0.32, 0.2], [0.3, 0.14]]) { k.add(P.disc(rr, 18), oldC, sx, ah + 0.32, 0.31); k.add(torus(rr + 0.07, 0.02, 4, 18), oldC, sx, ah + 0.32, 0.31); }
    k.add(new THREE.BoxGeometry(aw, ah, 0.2), MAT.flat('#04060c', 1), 0, ah / 2, -0.4);
    for (const s of [-1, 1]) k.add(rbox(0.7, 0.22, 0.7, 0.05), old, s * 1.2, 0.11, 0.55);
  });
  const archGlow = glowSprite('#7ab8ff', 2.4, 0.35); archGlow.position.set(exX, DY + 1.3, BZ - 0.2); B.group.add(archGlow);
  B.light('#6aa8ff', 4, 7, exX, DY + 1.8, BZ + 1.4);
  R.exits.push({ ...B.world(exX, BZ + 0.6), r: 0.85, to: 'c3-sendell' });
  R.exits.push({ ...B.world(LX + 0.45, entZ), r: 0.8, to: 'c3-deep' });
  R.spawn = { ...B.world(LX + 1.8, entZ), a: Math.PI / 2 };
  R.mites = [B.world(-9.0, 2.6), B.world(-8.2, -5.6), B.world(8.4, -3.4), B.world(9.0, 4.8)];

  // --- light: cold crystal light from below and from the clusters, a dim violet fill
  for (const [x, y, z, c, i, d] of [[-10.5, DY + 2, -7.4, '#5ae0ff', 7, 9], [11.0, DY + 2, -5.0, '#5ae0ff', 6, 9], [-10.8, DY + 1.6, 7.6, '#b07aff', 3.5, 7], [10.6, DY + 1.6, 3.6, '#b07aff', 4, 7], [-3.0, DY - 0.5, -8.4, '#9a6aff', 5, 8], [0, CY + 1.2, 0, '#40c8ff', 6, 9], [0, CY + 1.2, 6.5, '#40c8ff', 3, 7]]) B.light(c, i, d, x, y, z);
  B.light('#b8a8d8', 2.5, 30, 0, DY + 7, 2);

  flushNoShadow(kt);
  R.updaters.push((dt, tt) => {
    for (const s of stones) {
      if (s.t < -0.5 && !s.c.enabled) continue;
      s.t += dt;
      const kk = smoothstep(0, 1.5, s.t);
      const y = lerp(s.low, s.top, kk);
      s.g.position.y = y + (kk > 0 && kk < 1 ? Math.sin(s.t * 40) * 0.02 : 0);
      s.c.top = y;
    }
    for (const p of R.pillars) {
      p.t = Math.max(0, Math.min(1, p.t + (p.lit ? dt : -dt) / 1.2));
      const e = p.t, pulse = 0.85 + Math.sin(tt * 2 + p.i) * 0.15;
      p.body.emissive.setRGB(0.23 + 0.0 * e, 0.16 + 0.55 * e, 0.48 + 0.42 * e); p.body.emissiveIntensity = 0.35 + 0.75 * e * pulse;
      p.heart.emissive.setRGB(0.13 + 0.4 * e, 0.19 + 0.75 * e, 0.28 + 0.72 * e); p.heart.emissiveIntensity = 0.3 + 2.0 * e * pulse;
      p.heart.color.setRGB(0.6 + 0.3 * e, 0.64 + 0.34 * e, 0.72 + 0.28 * e);
      p.light.intensity = 9 * e * pulse; p.glow.material.opacity = 0.75 * e * pulse;
    }
    archGlow.material.opacity = 0.3 + Math.sin(tt * 0.8) * 0.06;
  });
  const room = B.finish();
  room.center.set(B.cx - 2.0, 0, B.cz - 2.0);
  return room;
}

// ================================================================ 4. c3sendell — Sendell's chamber
// Older than anything the project built: a round room of smooth pale stone, fluted pilasters, a frieze, three
// worn reliefs of the two suns, a still pool in the middle with light rising from it. No machinery at all.
const oldFloorTex = () => M('ugoldfloor', () => canvasTex(1024, 1024, (x, W) => {
  const c = W / 2, r = rng(12);
  x.fillStyle = '#8c8aa0'; x.fillRect(0, 0, W, W);
  // concentric courses of slabs with radial joints
  const rings = [[150, 230, 16], [230, 320, 24], [320, 420, 30], [420, 520, 38]];
  for (const [r0, r1, n] of rings) for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + r0 * 0.01, a1 = ((i + 1) / n) * Math.PI * 2 + r0 * 0.01, k = 0.86 + r() * 0.2;
    x.fillStyle = `rgb(${Math.round(176 * k)},${Math.round(172 * k)},${Math.round(196 * k)})`;
    x.beginPath(); x.arc(c, c, r1 - 3, a0 + 0.004, a1 - 0.004); x.arc(c, c, r0 + 3, a1 - 0.004, a0 + 0.004, true); x.closePath(); x.fill();
    const g = x.createRadialGradient(c, c, r0, c, c, r1); g.addColorStop(0, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(0,0,30,0.12)'); x.fillStyle = g; x.fill();
  }
  // a mosaic band of small blue tesserae round the pool
  for (let i = 0; i < 150; i++) { const a = (i / 150) * Math.PI * 2; for (const rr of [158, 170]) { x.fillStyle = (i + rr) % 3 ? '#5a7ac0' : '#a8c8f0'; x.save(); x.translate(c + Math.cos(a) * rr, c + Math.sin(a) * rr); x.rotate(a); x.fillRect(-4, -4, 8, 8); x.restore(); } }
  // wear: a soft path worn round the pool, hairline cracks, specks
  for (let i = 0; i < 40; i++) { const a = r() * Math.PI * 2, rr = 250 + r() * 200, px = c + Math.cos(a) * rr, py = c + Math.sin(a) * rr, g = x.createRadialGradient(px, py, 0, px, py, 50); g.addColorStop(0, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - 50, py - 50, 100, 100); }
  x.strokeStyle = 'rgba(40,36,60,0.35)'; x.lineWidth = 1.2;
  for (let i = 0; i < 18; i++) { let a = r() * Math.PI * 2, rr = 220 + r() * 280; x.beginPath(); x.moveTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); for (let j = 0; j < 6; j++) { a += (r() - 0.5) * 0.08; rr += (r() - 0.5) * 30; x.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); } x.stroke(); }
  for (let i = 0; i < 4000; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(20,20,40,0.12)'; x.fillRect(r() * W, r() * W, 2, 2); }
}));
// the worn relief: two suns, one large and one small, rays, the planet's curve under them
const sunsTex = (seed) => M('ugsuns' + seed, () => canvasTex(384, 384, (x, W, H) => {
  const r = rng(seed);
  x.fillStyle = '#b8b4c8'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { const px = r() * W, py = r() * H, rr = 20 + r() * 60, g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, r() < 0.5 ? 'rgba(80,70,110,0.18)' : 'rgba(255,255,255,0.15)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
  // carved: light from the upper left, so cuts get a dark lower-right lip and a light upper-left one
  const carve = (draw, w) => { x.save(); x.lineCap = 'round'; x.lineWidth = w; x.strokeStyle = 'rgba(50,44,80,0.65)'; x.translate(2.5, 2.5); draw(); x.stroke(); x.restore(); x.save(); x.lineCap = 'round'; x.lineWidth = w; x.strokeStyle = 'rgba(255,255,255,0.55)'; x.translate(-1.5, -1.5); draw(); x.stroke(); x.restore(); };
  const sun = (cx, cy, rr, rays) => {
    carve(() => { x.beginPath(); x.arc(cx, cy, rr, 0, 7); }, 7);
    carve(() => { x.beginPath(); x.arc(cx, cy, rr * 0.55, 0, 7); }, 4);
    carve(() => { x.beginPath(); for (let i = 0; i < rays; i++) { const a = (i / rays) * Math.PI * 2; x.moveTo(cx + Math.cos(a) * rr * 1.25, cy + Math.sin(a) * rr * 1.25); x.lineTo(cx + Math.cos(a) * rr * 1.65, cy + Math.sin(a) * rr * 1.65); } }, 6);
  };
  sun(138, 150, 62, 12); sun(272, 112, 34, 8);
  carve(() => { x.beginPath(); x.arc(W / 2, H + 420, 560, Math.PI * 1.36, Math.PI * 1.64); }, 8);
  carve(() => { x.beginPath(); x.arc(W / 2, H + 440, 560, Math.PI * 1.38, Math.PI * 1.62); }, 4);
  // little figures kneeling toward the suns (very worn)
  for (const px of [96, 192, 288]) carve(() => { x.beginPath(); x.arc(px, 296, 9, 0, 7); x.moveTo(px, 305); x.lineTo(px - 4, 334); x.moveTo(px - 12, 318); x.lineTo(px + 12, 312); }, 4);
  // erosion: chips and cracks across the carving
  x.strokeStyle = 'rgba(60,50,80,0.45)'; x.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) { let px = r() * W, py = r() * H; x.beginPath(); x.moveTo(px, py); for (let j = 0; j < 5; j++) { px += (r() - 0.5) * 50; py += r() * 40; x.lineTo(px, py); } x.stroke(); }
  for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(184,180,200,0.85)'; x.beginPath(); x.arc(r() * W, r() * H, 6 + r() * 16, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(40,36,60,0.6)'; x.lineWidth = 10; x.strokeRect(5, 5, W - 10, H - 10);
}));
// frieze: a running wave-and-spiral band
const friezeTex = () => M('ugfrieze', () => tiled(canvasTex(256, 64, (x, W, H) => {
  x.fillStyle = '#c4c0d4'; x.fillRect(0, 0, W, H);
  const line = (dx, col, w) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); for (let i = 0; i < 4; i++) { const cx = i * 64 + 32 + dx; x.moveTo(cx - 32, 44 + dx); x.quadraticCurveTo(cx - 20, 10 + dx, cx, 24 + dx); x.arc(cx + 8, 28 + dx, 9, Math.PI * 1.1, Math.PI * 3, false); } x.stroke(); };
  line(2, 'rgba(60,54,90,0.6)', 5); line(-1, 'rgba(255,255,255,0.6)', 4);
  x.fillStyle = 'rgba(60,54,90,0.5)'; x.fillRect(0, 0, W, 4); x.fillRect(0, H - 4, W, 4);
}), 6, 1));
const waterTex = () => M('ugwater', () => canvasTex(512, 512, (x, W) => {
  const c = W / 2, g = x.createRadialGradient(c, c, 0, c, c, c); g.addColorStop(0, '#8ad8f8'); g.addColorStop(0.3, '#2a6ea8'); g.addColorStop(1, '#081c36');
  x.fillStyle = g; x.fillRect(0, 0, W, W);
  x.strokeStyle = 'rgba(220,250,255,0.18)'; x.lineWidth = 2; for (let rr = 30; rr < c; rr += 34) { x.beginPath(); x.arc(c, c, rr, 0, 7); x.stroke(); }
}));

// smooth old ashlar: big pale blocks, fine joints, weathering (1 tile = 3 m)
const ashlarTex = () => M('ugashlar', () => tiled(canvasTex(512, 512, (x, W, H) => {
  const r = rng(23), rowH = H / 6;
  x.fillStyle = '#8e8ca6'; x.fillRect(0, 0, W, H);
  for (let row = 0; row < 6; row++) {
    let xx = -r() * 80;
    while (xx < W) {
      const w = 130 + r() * 110, k = 0.95 + r() * 0.1, y = row * rowH;
      const g = x.createLinearGradient(0, y, 0, y + rowH); g.addColorStop(0, `rgb(${Math.round(196 * k)},${Math.round(194 * k)},${Math.round(212 * k)})`); g.addColorStop(1, `rgb(${Math.round(170 * k)},${Math.round(168 * k)},${Math.round(190 * k)})`);
      for (const ox of [-W, 0, W]) { x.fillStyle = g; x.fillRect(xx + ox + 1.5, y + 1.5, w - 3, rowH - 3); }
      xx += w;
    }
  }
  for (let i = 0; i < 50; i++) { const px = r() * W, py = r() * H, rr = 20 + r() * 70, g = x.createRadialGradient(px, py, 0, px, py, rr); g.addColorStop(0, r() < 0.6 ? 'rgba(70,64,100,0.12)' : 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
  for (let i = 0; i < 2500; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(30,30,50,0.08)'; x.fillRect(r() * W, r() * H, 2, 2); }
}), 1, 1));
const ashlar = () => M('ugashlarM', () => stdM({ map: ashlarTex(), roughness: 0.75, side: THREE.DoubleSide }));
// a curved face (lathe between two profile points) with UVs in metres / tile
function arcFace(a, b, p0, pl, tile = 3, segs = 48) {
  const g = new THREE.LatheGeometry([new THREE.Vector2(a[0], a[1]), new THREE.Vector2(b[0], b[1])], segs, p0, pl);
  const uv = g.attributes.uv, pos = g.attributes.position;
  for (let i = 0; i < uv.count; i++) { const rr = Math.hypot(pos.getX(i), pos.getZ(i)); uv.setXY(i, (uv.getX(i) * pl * rr) / tile, (pos.getY(i) + (Math.abs(a[1] - b[1]) < 1e-3 ? rr : 0)) / tile); }
  g.userData.keepUV = true;
  return g;
}

function buildSendell(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'c3sendell', 2100, 0);
  const R = B.room, k = B.k;
  const Rr = 7.4, t = 0.6, H = 4.6, rimH = 0.5, PR = 2.9;
  R.view = 14.2; R.follow = 0.2; R.cave = true; R.music = 'cave';
  const stone = ashlar(), pale = twoSided(MAT.plaster('#d6d2e2')), paleS = MAT.plaster('#d6d2e2');
  const face = (a, b, p0, pl, m, cx = 0, cz = 0) => k.add(m === stone ? arcFace(a, b, p0, pl) : new THREE.LatheGeometry([new THREE.Vector2(a[0], a[1]), new THREE.Vector2(b[0], b[1])], 48, p0, pl), m, cx, 0, cz);
  const F0 = (3 * Math.PI) / 4, F1 = (7 * Math.PI) / 4, N0 = -Math.PI / 4;
  const ENT = Math.PI * 1.6, EXI = Math.PI * 1.07, AW = 0.17; // arch half-angles
  // floor disc with the painted courses, a stone plinth under it
  const fl = new THREE.Mesh(new THREE.CircleGeometry(Rr + 0.02, 64), M('ugoldfloorM', () => stdM({ map: oldFloorTex(), color: '#9c9cc0', roughness: 0.5 })));
  fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; B.group.add(fl);
  k.add(arcFace([Rr + t + 0.1, -1.0], [Rr + t, 0], 0, Math.PI * 2, 3, 64), stone, 0, 0, 0);
  B.ccol(0, 0, Rr + 0.2, 0, { seeThrough: true, bottom: -1 });
  // far half: smooth wall, broken by the two arches; fluted pilasters, frieze, a corbelled top
  const spans = [[F0, EXI - AW], [EXI + AW, ENT - AW], [ENT + AW, F1]];
  for (const [a, b] of spans) {
    face([Rr, H], [Rr, 0], a, b - a, stone);
    face([Rr + t, 0], [Rr + t, H], a, b - a, stone);
    face([Rr, H], [Rr + t, H], a, b - a, pale);
    face([Rr - 0.04, 0.42], [Rr - 0.04, 0.0], a, b - a, pale);
    face([Rr - 0.05, H - 0.5], [Rr - 0.05, H - 0.9], a, b - a, M('ugfriezeM', () => stdM({ map: friezeTex(), roughness: 0.8, side: THREE.DoubleSide })));
    face([Rr - 0.12, H - 0.42], [Rr - 0.12, H - 0.5], a, b - a, pale);
    face([Rr - 0.12, H - 0.9], [Rr - 0.12, H - 0.98], a, b - a, pale);
    face([Rr - 0.3, H + 0.18], [Rr - 0.3, H], a, b - a, pale);
    face([Rr - 0.3, H + 0.18], [Rr + t + 0.05, H + 0.18], a, b - a, pale);
  }
  // pilasters: fluted stone columns with a cushion capital
  for (let ph = F0 + 0.17; ph < F1 - 0.1; ph += 0.33) {
    if (Math.abs(ph - ENT) < AW + 0.12 || Math.abs(ph - EXI) < AW + 0.12) continue;
    const [x, z] = polar(ph, Rr - 0.12);
    k.at(x, 0, z, ph + Math.PI, () => {
      k.add(rbox(0.5, 0.36, 0.3, 0.05), paleS, 0, 0.18, 0);
      for (let f = -1; f <= 1; f++) k.add(cyl(0.08, 0.08, H - 1.4, 8), paleS, f * 0.12, 0.36 + (H - 1.4) / 2, 0.02);
      k.add(rbox(0.5, 0.2, 0.32, 0.08), paleS, 0, H - 0.98 - 0.1, 0);
    });
  }
  // the arches (to the galleries, to the core)
  const arch = (ph, glow, key) => {
    const [x, z] = polar(ph, Rr + 0.05);
    k.at(x, 0, z, ph + Math.PI, () => {
      const aw = 2.0, ah = 2.9;
      k.add(slab('ugarch2', (s) => { s.moveTo(-aw / 2 - 0.45, 0); s.lineTo(-aw / 2, 0); s.lineTo(-aw / 2, ah - aw / 2); s.absarc(0, ah - aw / 2, aw / 2, Math.PI, 0, true); s.lineTo(aw / 2, 0); s.lineTo(aw / 2 + 0.45, 0); s.lineTo(aw / 2 + 0.45, H); s.lineTo(-aw / 2 - 0.45, H); s.lineTo(-aw / 2 - 0.45, 0); }, t + 0.1, 0.05), stone, 0, 0, -t / 2);
      k.add(torus(aw / 2 + 0.16, 0.08, 6, 24, Math.PI), paleS, 0, ah - aw / 2, 0.06);
      for (const sx of [-1, 1]) k.add(rbox(0.26, ah - aw / 2, 0.16, 0.05), paleS, sx * (aw / 2 + 0.16), (ah - aw / 2) / 2, 0.06);
      k.add(rbox(0.36, 0.42, 0.2, 0.06), paleS, 0, ah + 0.12, 0.08);
      k.add(plane(aw, ah), M('ugpassArch' + key, () => { const tt = canvasTex(128, 192, (c, w, h) => { c.fillStyle = '#05060c'; c.fillRect(0, 0, w, h); const g = c.createRadialGradient(w / 2, h * 0.7, 2, w / 2, h * 0.7, 90); g.addColorStop(0, glow); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }); const m = new THREE.MeshBasicMaterial({ map: tt }); m.userData.noShadow = true; return m; }), 0, ah / 2, -t - 0.02);
      k.add(rbox(aw + 0.4, 0.08, t + 0.4, 0.03), paleS, 0, 0.0, -t / 2 + 0.1);
    });
  };
  arch(ENT, 'rgba(120,220,255,0.6)', 'g'); arch(EXI, 'rgba(255,170,120,0.55)', 'c');
  // near half: the low rim
  face([Rr, rimH], [Rr, 0], N0, Math.PI, stone);
  face([Rr + t, 0], [Rr + t, rimH], N0, Math.PI, stone);
  face([Rr, rimH], [Rr + t, rimH], N0, Math.PI, pale);
  for (const ph of [F0, F1]) { const [x, z] = polar(ph, Rr + t / 2); k.add(rbox(t + 0.2, H + 0.2, 0.3, 0.06), paleS, x, (H + 0.2) / 2, z, ph - Math.PI / 2); }
  const NC = 32;
  for (let i = 0; i < NC; i++) { const ph = ((i + 0.5) / NC) * Math.PI * 2, [x, z] = polar(ph, Rr + t / 2); B.col(x, z, (Rr + t / 2) * Math.tan(Math.PI / NC) + 0.05, t / 2 + 0.1, H, { rot: ph }); }

  // three reliefs of the two suns, set in shallow niches
  for (const ph of [Math.PI * 1.25, Math.PI * 1.42, Math.PI * 0.88].filter((p) => p > F0 && p < F1)) {
    const [x, z] = polar(ph, Rr - 0.03);
    k.at(x, 1.15, z, ph + Math.PI, () => {
      k.add(rbox(1.95, 1.95, 0.08, 0.04), paleS, 0, 1.05, 0.0);
      k.add(plane(1.75, 1.75), M('ugsunsM' + Math.round(ph * 10), () => stdM({ map: sunsTex(Math.round(ph * 10)), roughness: 0.85 })), 0, 1.0, 0.045);
      k.add(rbox(1.9, 0.12, 0.22, 0.04), paleS, 0, 0.12, 0.06);
    });
  }
  // old crystal lamps in the wall: small blue crystals in carved cups
  for (const ph of [Math.PI * 1.17, Math.PI * 1.34, Math.PI * 1.5, Math.PI * 0.98]) {
    const [x, z] = polar(ph, Rr - 0.2);
    k.at(x, 2.55, z, ph + Math.PI, () => { k.add(lathe([[0.001, -0.12], [0.16, -0.08], [0.2, 0.06], [0.17, 0.08], [0.001, 0.0]], 12), paleS, 0, 0, 0.1); crystals(k, 3, 0.16, 700 + Math.round(ph * 10), [crystalMat('#cfe8ff', '#4a90ff', 1.4)], 0.3); });
    const [lx, lz] = polar(ph, Rr - 0.9); B.light('#7ab0ff', 1.6, 3.5, lx, 2.6, lz);
  }

  // curved stone benches against the wall, offering bowls, and the shell's cracks reaching even here
  for (const [ph, len] of [[Math.PI * 1.33, 0.36], [Math.PI * 0.92, 0.3]]) {
    const r0 = Rr - 0.95;
    k.add(arcFace([r0 + 0.5, 0.45], [r0, 0.45], ph - len / 2, len, 3, 16), paleS, 0, 0, 0);
    k.add(arcFace([r0, 0.45], [r0, 0.0], ph - len / 2, len, 3, 16), paleS, 0, 0, 0);
    for (const e of [-1, 1]) { const [x, z] = polar(ph + e * len * 0.42, r0 + 0.25); k.add(rbox(0.36, 0.4, 0.5, 0.05), paleS, x, 0.2, z, ph); }
    const [bx, bz] = polar(ph, r0 + 0.25); B.col(bx, bz, Rr * len / 2, 0.3, 0.45, { rot: ph, noStand: true, seeThrough: true });
  }
  for (const ph of [Math.PI * 1.2, Math.PI * 1.46, Math.PI * 1.02]) { const [x, z] = polar(ph, Rr - 0.6); k.add(lathe([[0.001, 0], [0.12, 0], [0.2, 0.1], [0.22, 0.14], [0.18, 0.12], [0.001, 0.06]], 14), paleS, x, 0, z); k.add(sphere(0.06, 8, 6), MAT.glow('#cfe8ff', '#4a90ff', 1.4), x, 0.12, z); }
  const crk = M('ugcrackB', () => stdM({ color: '#d8f0ff', emissive: '#5aa8ff', emissiveIntensity: 1.2, roughness: 0.3 }, 0, { noShadow: true }));
  { const r = rng(44); for (const ph0 of [Math.PI * 1.08, Math.PI * 1.58]) { let ph = ph0, rr = Rr - 0.2; const pts = [[...polar(ph, rr)]]; for (let j = 0; j < 7; j++) { ph += (r() - 0.5) * 0.12; rr -= 0.4 + r() * 0.3; pts.push(polar(ph, rr)); } k.add(pipe(pts.map(([x, z]) => [x, 0.01, z]), 0.03, 0.15, 4), crk, 0, 0, 0); const [cx, cz] = pts[1]; k.at(cx, 0, cz, ph0, () => crystals(k, 3, 0.22, Math.round(ph0 * 100), [CYAN(), VIOLET()])); } }

  // --- the pool: a carved basin, still water, light rising out of it
  k.add(lathe([[PR - 0.05, -0.4], [PR + 0.05, 0.34], [PR + 0.32, 0.4], [PR + 0.55, 0.34], [PR + 0.62, 0.0]], 64), paleS, 0, 0, 0);
  k.add(lathe([[0.001, -0.6], [PR, -0.6], [PR, -0.2]], 48), MAT.flat('#1a2a44', 0.6), 0, 0, 0);
  for (let i = 0; i < 12; i++) { const [x, z] = polar((i / 12) * Math.PI * 2, PR + 0.3); k.add(sphere(0.07, 8, 6), MAT.flat('#9ab8f0', 0.4), x, 0.42, z); }
  const wm = stdM({ color: '#163a5a', map: waterTex(), emissive: '#ffffff', emissiveMap: waterTex(), emissiveIntensity: 0.35, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.92 }, 0, { noShadow: true });
  const water = new THREE.Mesh(new THREE.CircleGeometry(PR + 0.02, 48), wm); water.rotation.x = -Math.PI / 2; water.position.y = -0.18; B.group.add(water);
  B.ccol(0, 0, PR + 0.5, 0.9, { noStand: true, seeThrough: true });
  const column = lightShaft(B, 0, 3.2, 0, 1.0, 2.0, 6.4, '#9fd8ff', 0.05);
  const poolLight = B.light('#8ac8ff', 6, 9, 0, 0.8, 0);
  motes(B, [[0, 0, 3.6]], { n: 50, color: '#cfeaff', size: 0.22, op: 0.5, hmax: 4.5, speed: 0.3, y0: -0.1 });

  // --- the presence: a soft orb of light over the pool, a thin column under it
  const SP = { x: 0, y: 1.9, z: 0 };
  const pres = new THREE.Group(); pres.position.set(SP.x, SP.y, SP.z); B.group.add(pres);
  const add = (geo, color, op) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })); pres.add(m); return m; };
  const core = add(new THREE.SphereGeometry(0.3, 20, 14), '#f4fbff', 0.95);
  const halo = add(new THREE.SphereGeometry(0.72, 20, 14), '#8fd0ff', 0.25);
  const beamM = add(new THREE.CylinderGeometry(0.06, 0.32, 2.1, 16, 1, true), '#bfe6ff', 0.25); beamM.position.y = -1.05; beamM.material.side = THREE.DoubleSide;
  const glow = glowSprite('#9fd4ff', 3.4, 0.7); pres.add(glow);
  const ring = add(new THREE.TorusGeometry(0.75, 0.015, 6, 48), '#cfeaff', 0.5); ring.rotation.x = Math.PI / 2;
  const presLight = new THREE.PointLight('#9fd0ff', 0, 10, 2); pres.add(presLight);
  pres.visible = false;
  let pI = 1;
  R.presence = {
    group: pres, visible: false, intensity: 1,
    setVisible(b) { this.visible = !!b; pres.visible = !!b; },
    setIntensity(v) { this.intensity = Math.max(0, Math.min(1, v)); pI = this.intensity; },
  };
  R.sendellSpot = { ...B.world(SP.x, SP.z), y: SP.y };

  // exits and spawn
  { const [x, z] = polar(ENT, Rr - 0.5); R.exits.push({ ...B.world(x, z), r: 0.8, to: 'c3-gallery' }); const [sx, sz] = polar(ENT, Rr - 2.0); R.spawn = { ...B.world(sx, sz), a: ang(sx, sz, 0, 0) }; }
  { const [x, z] = polar(EXI, Rr - 0.5); R.exits.push({ ...B.world(x, z), r: 0.8, to: 'c3-core' }); }
  B.light('#6a80e0', 2.2, 16, 0, 5, 0);
  B.light('#8aa0ff', 1.6, 9, -3.5, 3.0, -3.5);

  R.updaters.push((dt, tt) => {
    const b = 0.9 + Math.sin(tt * 0.9) * 0.1;
    column.material.opacity = 0.045 * b;
    poolLight.intensity = poolLight.userData.base * b * (pres.visible ? 1 + pI * 0.4 : 1);
    wm.map.rotation = tt * 0.02; wm.map.center.set(0.5, 0.5);
    if (pres.visible) {
      pres.position.y = SP.y + Math.sin(tt * 1.3) * 0.08;
      const s = 0.85 + Math.sin(tt * 2.1) * 0.08;
      core.material.opacity = 0.95 * pI; halo.material.opacity = 0.28 * pI * s; beamM.material.opacity = 0.22 * pI;
      glow.material.opacity = 0.75 * pI * s; glow.scale.setScalar(3.0 + 2.0 * pI);
      ring.material.opacity = 0.45 * pI; ring.rotation.z = tt * 0.5; ring.scale.setScalar(1 + Math.sin(tt * 1.7) * 0.06);
      presLight.intensity = 9 * pI * s;
    }
  });
  return B.finish();
}

// ================================================================ 5. c3core — the core
// A round arena under the shell: the far half of a cracked, translucent crystal dome rises over it (cut away
// on the camera side like every LBA2 interior), the bore head pierces it from above and grinds at it.
// Three conversion pylons stand in armoured bays; each bay's receiver is only reachable by banking the
// ball off a brass reflector on the perimeter. Vesk's console sits on a raised platform.
// Faceted half-dome (far half, x + z < 0), ellipsoid rx × ry, per-face tone in a colour attribute
function domeGeo(rx, ry, detail = 4, rgba = false) {
  const src = new THREE.IcosahedronGeometry(1, detail), p = src.attributes.position, pos = [], col = [];
  for (let f = 0; f < p.count; f += 3) {
    const cx = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3, cy = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3, cz = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3;
    if (cy < 0.01 || cx + cz > 0.1) continue;
    const t = 0.82 + 0.3 * hash3(f, 7, 1);
    for (let j = 0; j < 3; j++) { pos.push(p.getX(f + j) * rx, Math.max(0, p.getY(f + j)) * ry, p.getZ(f + j) * rx); if (rgba) col.push(0.35, 0.82, 1, 0); else col.push(t, t, t * 1.04); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, rgba ? 4 : 3));
  g.computeVertexNormals();
  return g;
}

const NO_ASSIST = Object.freeze({ lit: true });
function buildCore(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'c3core', 2200, 0);
  const R = B.room, k = B.k, kt = new Kit(B.group);
  const Rr = 12.2, ringIn = 11.6, DX = 12.4, DYh = 9.6;
  R.view = 22.5; R.follow = 0.25; R.cave = true; R.music = 'boss';
  const rock = rockMat('#9c90a8'), rockD = rockMat('#6c6078');
  const F0 = (3 * Math.PI) / 4, F1 = (7 * Math.PI) / 4, N0 = -Math.PI / 4;
  const ENT = Math.PI * 0.78;

  // --- floor: rock with a steel deck ring, the exposed shell glowing through cracks at the centre
  const fl = new THREE.Mesh(new THREE.CircleGeometry(Rr + 0.3, 72), floorMat('#5e5468', 'rgba(30,20,50,0.45)', 'core'));
  fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; B.group.add(fl);
  k.add(arcFace([Rr + 0.9, -1.2], [Rr + 0.6, 0], 0, Math.PI * 2, 3, 72), rockD, 0, 0, 0);
  B.ccol(0, 0, Rr + 0.3, 0, { seeThrough: true, bottom: -1 });
  const ringDeck = new THREE.RingGeometry(6.8, 10.6, 72, 1); ringDeck.userData.keepUV = false;
  k.add(ringDeck, deck(), 0, 0.012, 0, 0, { rx: -Math.PI / 2 });
  k.add(new THREE.RingGeometry(6.55, 6.8, 72), hazard(), 0, 0.014, 0, 0, { rx: -Math.PI / 2 });
  for (let i = 0; i < 24; i++) { const [x, z] = polar((i / 24) * Math.PI * 2, 6.95); k.add(cyl(0.05, 0.05, 0.03, 6), brass(), x, 0.02, z); }
  const shellCrack = M('ugshellcrack', () => stdM({ color: '#f0d8ff', emissive: '#a050ff', emissiveIntensity: 1.6, roughness: 0.3 }, 0, { noShadow: true }));
  { const r = rng(5); for (let c = 0; c < 9; c++) { let a = r() * Math.PI * 2, rr = 0.6 + r() * 0.6; const pts = []; for (let j = 0; j < 8; j++) { pts.push([Math.sin(a) * rr, 0.02, Math.cos(a) * rr]); a += (r() - 0.5) * 0.4; rr += 0.55 + r() * 0.35; if (rr > 6.4) break; } if (pts.length > 2) k.add(pipe(pts, 0.04, 0.2, 4), shellCrack, 0, 0, 0); } }
  const pit = new THREE.Mesh(new THREE.CircleGeometry(1.2, 32), new THREE.MeshBasicMaterial({ color: '#b080ff', transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  pit.rotation.x = -Math.PI / 2; pit.position.y = 0.02; B.group.add(pit);
  k.at(0, 0, 0, 0.3, () => crystals(k, 6, 0.5, 901, [VIOLET(), CYAN()], 0.9));
  B.ccol(0, 0, 0.9, 1.2, { noStand: true });
  const herLight = B.light('#a070ff', 5, 9, 0, 0.8, 0);

  // --- the membrane: the far half of the shell, faceted, translucent, cracked where the bore presses
  const memMat = new THREE.MeshStandardMaterial({ color: '#a898e8', emissive: '#4a32c0', emissiveIntensity: 0.55, roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide, flatShading: true, vertexColors: true });
  const mem = new THREE.Mesh(domeGeo(DX, DYh), memMat); mem.renderOrder = 2; B.group.add(mem);
  const edgeMat = M('ugmemedge', () => stdM({ color: '#e8e0ff', emissive: '#9a7aff', emissiveIntensity: 0.9, roughness: 0.2 }, 0, { noShadow: true }));
  { const pts = []; for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI; const u = Math.cos(a), y = Math.sin(a); pts.push([u * DX * Math.SQRT1_2 * 0.995, y * DYh * 0.995, -u * DX * Math.SQRT1_2 * 0.995]); } k.add(pipe(pts, 0.09, 0.3, 6), edgeMat, 0, 0, 0); }
  // the field that will spread over it (vertex alpha, recomputed by setLevel)
  const fgeo = domeGeo(DX * 0.985, DYh * 0.985, 4, true);
  const fmat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
  const fmesh = new THREE.Mesh(fgeo, fmat); fmesh.renderOrder = 3; B.group.add(fmesh);
  // her: a slow violet breathing glow beyond the shell
  const her = glowSprite('#9a60ff', 30, 0.22); her.position.set(-12, 3, -12); B.group.add(her);
  const her2 = glowSprite('#c8a0ff', 14, 0.18); her2.position.set(-8, 1, -8); B.group.add(her2);

  // --- the bore head pressing in from above, cracks spreading from the contact
  const BH = { x: -1.3, z: -1.3 }, bhR = Math.hypot(BH.x, BH.z), contactY = DYh * Math.sqrt(1 - (bhR / DX) ** 2);
  const C = new THREE.Vector3(BH.x, contactY, BH.z);
  const drill = new THREE.Group(); drill.position.set(BH.x, 0, BH.z); B.group.add(drill);
  const dk = new Kit(drill);
  const bitMat = stdM({ color: '#c8ccd4', roughness: 0.35, metalness: 0.75, map: P.TEX.brushed(), emissive: '#ff6a20', emissiveIntensity: 0 });
  const tipY = contactY - 4.6;
  // the bit: a great fluted cone with cutter teeth, its gauge ring, the drill collar going up out of sight
  dk.add(lathe([[0.001, 0], [0.35, 0.25], [0.9, 0.9], [1.6, 1.8], [2.3, 2.7], [2.6, 3.2], [2.6, 3.6], [2.0, 4.1], [1.5, 4.6], [1.4, 5.4]], 24), bitMat, 0, tipY, 0);
  dk.add(torus(2.62, 0.14, 6, 32), brass(), 0, tipY + 3.4, 0, 0, { rx: Math.PI / 2 });
  for (let i = 0; i < 4; i++) {
    const a0 = (i * Math.PI) / 2, pts = [];
    for (let j = 0; j <= 10; j++) { const u = j / 10, rr = 0.3 + u * 2.3, a = a0 + u * 1.6; pts.push([Math.sin(a) * rr, tipY + 0.2 + u * 3.0, Math.cos(a) * rr]); }
    dk.add(pipe(pts, 0.16, 0.2, 6), MAT.paint('#3a3438', 0.5), 0, 0, 0);
    for (let j = 2; j <= 9; j += 2) { const [x, y, z] = pts[j]; dk.add(rbox(0.32, 0.32, 0.32, 0.08), MAT.steel(), x * 1.06, y, z * 1.06, a0 + j * 0.16, { rx: 0.7 }); }
  }
  dk.add(cyl(1.25, 1.25, 22, 20), MAT.paint(TEAL, 0.45), 0, tipY + 5.4 + 11, 0);
  for (let y = tipY + 6.0; y < tipY + 28; y += 2.6) dk.add(torus(1.3, 0.12, 6, 24), brass(), 0, y, 0, 0, { rx: Math.PI / 2 });
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; dk.add(rbox(0.16, 20, 0.22, 0.04), iron(), Math.sin(a) * 1.28, tipY + 16.4, Math.cos(a) * 1.28, a); }
  dk.flush();
  drill.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  const tipGlow = glowSprite('#ff8a40', 5.5, 0.6); tipGlow.position.set(BH.x, tipY + 0.6, BH.z); B.group.add(tipGlow);
  const tipLight = B.light('#ff7a30', 10, 12, BH.x, tipY - 0.2, BH.z);
  const crackMat = new THREE.MeshStandardMaterial({ color: '#fff0e0', emissive: '#ffb070', emissiveIntensity: 2.2, roughness: 0.3 });
  {
    const r = rng(77), u0 = new THREE.Vector3(BH.x / DX, contactY / DYh, BH.z / DX).normalize();
    const walk = (u, dir, n, w) => {
      const pts = []; let cur = u.clone(), d = dir.clone();
      for (let j = 0; j < n; j++) {
        const p = new THREE.Vector3(cur.x * DX * 0.992, cur.y * DYh * 0.992, cur.z * DX * 0.992);
        if (p.y < 0.2 || p.x + p.z > -0.3) break;
        pts.push([p.x, p.y, p.z]);
        d.add(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.5)); d.sub(cur.clone().multiplyScalar(d.dot(cur))).normalize();
        cur.addScaledVector(d, 0.07 + r() * 0.04).normalize();
        if (j > 3 && r() < 0.12 && w > 0.03) walk(cur, d.clone().applyAxisAngle(cur, (r() < 0.5 ? 1 : -1) * (0.5 + r() * 0.6)), Math.floor(n * 0.5), w * 0.6);
      }
      if (pts.length > 2) { const m = new THREE.Mesh(pipe(pts, w, 0.1, 4), crackMat); m.renderOrder = 4; B.group.add(m); }
    };
    for (let c = 0; c < 9; c++) { const a = (c / 9) * Math.PI * 2 + r() * 0.4; const t1 = new THREE.Vector3(0, 1, 0).cross(u0).normalize(), t2 = u0.clone().cross(t1); walk(u0, t1.multiplyScalar(Math.cos(a)).add(t2.multiplyScalar(Math.sin(a))).normalize(), 16, 0.07); }
  }
  // a bright scar ring where the bit meets the shell
  const scar = new THREE.Mesh(new THREE.TorusGeometry(2.75, 0.14, 6, 32), crackMat); scar.position.copy(C); scar.lookAt(C.clone().multiply(new THREE.Vector3(2 / (DX * DX), 2 / (DYh * DYh), 2 / (DX * DX))).add(C)); B.group.add(scar);
  const sparkPts = motes(B, [[BH.x, BH.z, 2.2]], { n: 40, color: '#ffc080', size: 0.18, op: 0.8, hmax: 2.5, speed: -1.6, y0: tipY + 2.6 });

  let spin = 0.8, mode = 'drill', fieldLevel = 0;
  R.drill = {
    spin, mode,
    setSpin(s) { spin = s; this.spin = s; },
    setMode(m) {
      mode = m; this.mode = m;
      const sh = m === 'shield';
      bitMat.emissive.set(sh ? '#40c8ff' : '#ff6a20'); tipGlow.material.color.set(sh ? '#7ae0ff' : '#ff8a40'); tipLight.color.set(sh ? '#6ad8ff' : '#ff7a30');
      crackMat.emissive.set(sh ? '#6ad8ff' : '#ffb070'); sparkPts.visible = !sh;
    },
  };
  // field level: blue spreading from the bore contact over the membrane, the cracks fading
  const fcol = fgeo.attributes.color, fpos = fgeo.attributes.position, maxD = DX * 2.2;
  R.field = {
    level: 0,
    setLevel(v) {
      this.level = fieldLevel = Math.max(0, Math.min(1, v));
      const reach = fieldLevel * maxD;
      for (let i = 0; i < fpos.count; i++) {
        const d = Math.hypot(fpos.getX(i) - C.x, fpos.getY(i) - C.y, fpos.getZ(i) - C.z);
        fcol.setW(i, Math.max(0, Math.min(1, (reach - d) / 3.5)) * 0.55 * (0.8 + 0.2 * hash3(i, 3, 3)));
      }
      fcol.needsUpdate = true;
      crackMat.emissiveIntensity = 2.2 * (1 - fieldLevel) + 0.08;
      crackMat.opacity = 1;
      memMat.emissive.setRGB(0.29 * (1 - fieldLevel) + 0.12 * fieldLevel, 0.2 * (1 - fieldLevel) + 0.45 * fieldLevel, 0.75);
    },
  };
  R.field.setLevel(0);

  // --- the perimeter: steel stanchions round the far half, a ring beam, low rock rim on the near half
  for (let ph = F0 + 0.06; ph <= F1 - 0.05; ph += Math.PI / 14) {
    if (Math.abs(ph - ENT) < 0.16) continue;
    const [x, z] = polar(ph, ringIn + 0.2);
    kt.at(x, 0, z, ph, () => column(kt, 4.0, 0.3));
  }
  { const pts = []; for (let i = 0; i <= 40; i++) { const ph = F0 + 0.06 + (i / 40) * (F1 - F0 - 0.12); pts.push([...polar(ph, ringIn + 0.2)]); } kt.add(pipe(pts.map(([x, z]) => [x, 4.0, z]), 0.14, 0.3, 8), tealP(), 0, 0, 0); kt.add(pipe(pts.map(([x, z]) => [x, 3.8, z]), 0.05, 0.3, 6), brass(), 0, 0, 0); }
  k.add(arcFace([Rr, 0.6], [Rr, 0], N0, Math.PI, 3, 48), rock, 0, 0, 0);
  k.add(arcFace([Rr + 0.6, 0], [Rr + 0.6, 0.6], N0, Math.PI, 3, 48), rock, 0, 0, 0);
  k.add(new THREE.LatheGeometry([new THREE.Vector2(Rr, 0.6), new THREE.Vector2(Rr + 0.6, 0.6)], 48, N0, Math.PI), MAT.stone('slate', 1), 0, 0, 0);
  { const r = rng(3); for (let ph = N0; ph < N0 + Math.PI; ph += 0.16 + r() * 0.08) { const [x, z] = polar(ph, Rr + 0.3); k.add(rockGeo(Math.floor(r() * 30)), rock, x, 0.3, z, r() * 6, { sx: 0.6 + r() * 0.3, sy: 0.4 + r() * 0.4, sz: 0.6 }); } }
  // far half base: rock heaped against the foot of the membrane
  { const r = rng(4); for (let ph = F0; ph < F1; ph += 0.13 + r() * 0.06) { if (Math.abs(ph - ENT) < 0.14) continue; const [x, z] = polar(ph, Rr + 0.2); k.add(rockGeo(Math.floor(r() * 30)), rock, x, 0, z, r() * 6, { sx: 0.9 + r() * 0.5, sy: 0.6 + r() * 0.9, sz: 0.8 }); } }
  const NC = 48;
  for (let i = 0; i < NC; i++) { const ph = ((i + 0.5) / NC) * Math.PI * 2, [x, z] = polar(ph, ringIn + 0.35); B.col(x, z, (ringIn + 0.35) * Math.tan(Math.PI / NC) + 0.06, 0.35, 6, { rot: ph }); }

  // --- the entrance from Sendell's chamber: an old arch standing under the membrane's foot
  { const [x, z] = polar(ENT, ringIn + 0.25);
    k.at(x, 0, z, ENT + Math.PI, () => {
      const aw = 2.0, ah = 2.9, oldM = ashlar(), pale = MAT.plaster('#d6d2e2');
      k.add(slab('ugarch3', (s) => { s.moveTo(-aw / 2 - 0.5, 0); s.lineTo(-aw / 2, 0); s.lineTo(-aw / 2, ah - aw / 2); s.absarc(0, ah - aw / 2, aw / 2, Math.PI, 0, true); s.lineTo(aw / 2, 0); s.lineTo(aw / 2 + 0.5, 0); s.lineTo(aw / 2 + 0.5, ah + 0.6); s.lineTo(-aw / 2 - 0.5, ah + 0.6); s.lineTo(-aw / 2 - 0.5, 0); }, 0.7, 0.05), oldM, 0, 0, -0.2);
      k.add(torus(aw / 2 + 0.16, 0.08, 6, 24, Math.PI), pale, 0, ah - aw / 2, 0.18);
      k.add(plane(aw, ah), passageView('rgba(120,180,255,0.5)', 'core'), 0, ah / 2, -0.5);
    });
    R.exits.push({ ...B.world(...polar(ENT, ringIn - 0.55)), r: 0.85, to: 'c3-sendell' });
    const [sx, sz] = polar(ENT, ringIn - 2.2); R.spawn = { ...B.world(sx, sz), a: ang(sx, sz, 0, 0) };
    B.light('#8ab0ff', 3, 6, ...[polar(ENT, ringIn - 1.5)].map(([a, b]) => [a, 2.2, b])[0]);
  }

  // --- three conversion pylons in armoured bays, receivers reached by banking off brass reflectors
  R.pylons = []; R.reflectors = [];
  const PYL = [{ ph: Math.PI * 1.64, d: 0.42 }, { ph: Math.PI * 1.42, d: -0.42 }, { ph: Math.PI * 0.99, d: -0.42 }];
  const pr = 9.3, side = 0.17;
  const ST = [
    { col: '#ff6a2a', em: '#ff4a10', k: 2.0 }, // drill mode
    { col: '#ffe0a0', em: '#ffb040', k: 2.4 }, // primed
    { col: '#bff4ff', em: '#40c8ff', k: 2.6 }, // converted
  ];
  PYL.forEach(({ ph, d }, i) => {
    const [px, pz] = polar(ph, pr), [tx, tz] = polar(ph, 10.75), TY = 1.3;
    // the bay: a curved blast shield in front, two tall side walls, a slot along the membrane's foot
    const shieldM = MAT.plates('#5a6670', 1);
    k.add(arcFace([8.0, 2.8], [8.0, 0], ph - side - 0.03, 2 * (side + 0.03), 2, 10), twoSided(shieldM), 0, 0, 0);
    k.add(arcFace([7.75, 2.8], [7.75, 0], ph - side - 0.03, 2 * (side + 0.03), 2, 10), twoSided(shieldM), 0, 0, 0);
    k.add(new THREE.LatheGeometry([new THREE.Vector2(7.75, 2.8), new THREE.Vector2(8.0, 2.8)], 10, ph - side - 0.03, 2 * (side + 0.03)), hazard(), 0, 0, 0);
    k.add(new THREE.LatheGeometry([new THREE.Vector2(7.73, 0.5), new THREE.Vector2(7.73, 0.0)], 10, ph - side - 0.03, 2 * (side + 0.03)), hazard(), 0, 0, 0);
    for (const s of [-1, 1]) {
      const a = ph + s * side, [cx, cz] = polar(a, 9.1);
      k.at(cx, 0, cz, a, () => { k.add(rbox(0.26, 2.8, 2.2, 0.04), shieldM, 0, 1.4, 0); k.add(rbox(0.3, 0.14, 2.24, 0.03), hazard(), 0, 2.85, 0); });
      B.col(cx, cz, 0.15, 1.1, 2.8, { rot: a });
      // the slot between the wall's end and the membrane's foot: a low cable duct keeps people out, not the ball
      const [dx2, dz2] = polar(a, 10.9);
      k.at(dx2, 0, dz2, a, () => { k.add(rbox(0.5, 0.55, 1.42, 0.06), MAT.paint('#2a3436', 0.5), 0, 0.275, 0); k.add(rbox(0.54, 0.08, 1.46, 0.02), hazard(), 0, 0.57, 0); });
      B.col(dx2, dz2, 0.25, 0.72, 0.6, { rot: a, noStand: true });
    }
    { const [cx, cz] = polar(ph, 7.88); B.col(cx, cz, 8.0 * side + 0.25, 0.15, 2.8, { rot: ph }); }
    // the pylon: octagonal plinth, lattice tower with brass coils, the emitter head turned to the bore
    k.at(px, 0, pz, ph, () => {
      k.add(lathe([[0.001, 0], [1.05, 0], [1.05, 0.35], [0.85, 0.5], [0.001, 0.5]], 8), teal(), 0, 0, 0);
      for (let c = 0; c < 4; c++) { const a = (c / 4) * Math.PI * 2 + Math.PI / 4; k.at(Math.sin(a) * 0.45, 0.5, Math.cos(a) * 0.45, a, () => column(k, 4.4, 0.18)); }
      for (let y = 1.3; y < 4.6; y += 0.32) k.add(torus(0.5, 0.06, 6, 20), MAT.copper(), 0, y, 0, 0, { rx: Math.PI / 2 });
      k.add(cyl(0.18, 0.18, 4.4, 10), iron(), 0, 2.7, 0);
      k.add(lathe([[0.001, 0], [0.7, 0], [0.75, 0.12], [0.5, 0.3], [0.001, 0.32]], 16), brass(), 0, 4.9, 0);
      // receiver arm toward the back (the bank-shot target)
      k.add(rbox(0.16, 0.16, 1.4, 0.03), iron(), 0, TY, -0.75);
    });
    B.ccol(px, pz, 1.0, 6.0);
    const em = stdM({ color: ST[0].col, emissive: ST[0].em, emissiveIntensity: ST[0].k, roughness: 0.25 }, 0, { noShadow: true });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), em); head.position.set(px, 5.55, pz); B.group.add(head);
    const rec = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), em); rec.position.set(tx, TY, tz); rec.scale.y = 1.5; B.group.add(rec);
    k.at(tx, TY, tz, ph, () => { for (let c = 0; c < 4; c++) k.add(cyl(0.02, 0.02, 1.0, 5), brass(), Math.sin(c * 1.57) * 0.4, 0, Math.cos(c * 1.57) * 0.4); k.add(torus(0.42, 0.03, 5, 16), brass(), 0, 0.5, 0, 0, { rx: Math.PI / 2 }); k.add(torus(0.42, 0.03, 5, 16), brass(), 0, -0.5, 0, 0, { rx: Math.PI / 2 }); });
    const hg = glowSprite(ST[0].col, 1.8, 0.6); hg.position.copy(head.position); B.group.add(hg);
    const rg = glowSprite(ST[0].col, 2.0, 0.6); rg.position.copy(rec.position); B.group.add(rg);
    const pl = B.light(ST[0].em, 4, 6, ...polar(ph, pr - 1.4).flatMap((v, j) => (j === 0 ? [v, 4.2] : [v])));
    // field link to the bore (state 2)
    const hp = head.position.clone(), bp = new THREE.Vector3(BH.x, tipY + 3.2, BH.z);
    const linkM = new THREE.MeshBasicMaterial({ color: '#7ae0ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const link = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, hp.distanceTo(bp), 10, 1, true), linkM); linkM.side = THREE.DoubleSide;
    link.position.copy(hp).add(bp).multiplyScalar(0.5); link.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bp.clone().sub(hp).normalize()); link.visible = false; link.renderOrder = 5; B.group.add(link);
    link.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, hp.distanceTo(bp), 6, 1, true), new THREE.MeshBasicMaterial({ color: '#f0ffff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
    // brass reflector on the perimeter beside the bay: the bank shot comes off it into the slot
    // the incoming line is one of the 8 directions a keyboard throw can take, so any spot along it works
    const [qx, qz] = polar(ph + d, 11.1), [ex, ez] = polar(ph + Math.sign(d) * side, 10.98);
    const uo = new THREE.Vector2(ex - qx, ez - qz).normalize();
    let best = null;
    for (let a8 = 0; a8 < 8; a8++) {
      const a = (a8 * Math.PI) / 4, ui = new THREE.Vector2(Math.sin(a), Math.cos(a));
      const S = new THREE.Vector2(qx - ui.x * 6.5, qz - ui.y * 6.5), rs = S.length();
      const inc = Math.acos(Math.max(-1, Math.min(1, -ui.dot(uo)))); // angle between the two rays at the panel
      if (rs > 7.3 || rs < 2.0 || inc < 0.5 || inc > 2.3) continue;
      const score = Math.abs(inc - 1.3);
      if (!best || score < best.score) best = { ui, S, score };
    }
    const sx = best.S.x, sz = best.S.y, n = uo.clone().sub(best.ui).normalize();
    const ry = Math.atan2(n.x, n.y);
    k.at(qx, 0, qz, ry, () => {
      k.add(rbox(0.2, 2.6, 0.2, 0.04), tealP(), 0, 1.3, -0.25);
      tilt(k, 0, 1.35, 0, 0, -0.22, 0, () => {
        k.add(rbox(1.7, 1.5, 0.08, 0.04), brass(), 0, 0, 0);
        k.add(rbox(1.84, 0.1, 0.14, 0.03), iron(), 0, 0.8, 0); k.add(rbox(1.84, 0.1, 0.14, 0.03), iron(), 0, -0.8, 0);
        for (let c = 0; c < 4; c++) k.add(sphere(0.04, 6, 4), iron(), (c % 2 ? 1 : -1) * 0.78, c < 2 ? 0.7 : -0.7, 0.05);
      });
      k.add(rbox(0.12, 0.12, 0.5, 0.02), iron(), 0, 1.35, -0.18);
      k.add(rbox(0.6, 0.06, 0.6, 0.02), iron(), 0, 0.03, -0.25);
    });
    const flashM = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.4), new THREE.MeshBasicMaterial({ color: '#ffe8a0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    flashM.position.set(qx + n.x * 0.06, 1.35, qz + n.y * 0.06); flashM.rotation.set(-0.22, ry, 0, 'YXZ'); B.group.add(flashM);
    const rc = B.col(qx, qz, 0.85, 0.12, 2.3, { rot: ry, noStand: true });
    R.reflectors.push({ ...B.world(qx, qz), y: 1.35, nx: n.x, nz: n.y, hw: 0.85, y0: 0.5, y1: 2.2, kick: 4.2, collider: rc, flash: 0, mesh: flashM });
    const P2 = {
      i, ...B.world(px, pz), y: 5.55, state: 0, target: { ...B.world(tx, tz), y: TY }, bankFrom: B.world(sx, sz), reflector: R.reflectors[i], t: 0,
      setState(s) {
        this.state = s; const c = ST[s] || ST[0];
        em.color.set(c.col); em.emissive.set(c.em); em.emissiveIntensity = c.k; hg.material.color.set(c.col); rg.material.color.set(c.col); pl.color.set(c.em); this.beacon?.color.set(c.col);
        link.visible = s === 2;
      },
    };
    P2.em = em; P2.link = link; P2.linkM = linkM; P2.hg = hg; P2.rg = rg; P2.light = pl;
    R.pylons.push(P2);
    // node.lit: main.js's aim assist skips these (bending toward a receiver would steer the ball into its blast walls)
    R.ballTargets.push({ ...B.world(tx, tz), y: TY, r: 1.1, pylon: i, node: NO_ASSIST });
    // a beacon of light over the receiver, so it can be found behind its walls
    const bm = new THREE.MeshBasicMaterial({ color: ST[0].col, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.4, 3.2, 12, 1, true), bm); beacon.position.set(tx, TY + 1.5, tz); B.group.add(beacon);
    P2.beacon = bm;
  });

  // --- Vesk's console on its raised platform (near right), steps toward the arena
  const CP = polar(Math.PI * 0.6, 8.0), cpA = ang(CP[0], CP[1], 0, 0);
  k.at(CP[0], 0, CP[1], cpA, () => {
    k.add(lathe([[0.001, 0], [2.0, 0], [2.0, 0.8], [1.9, 0.9], [0.001, 0.9]], 8), teal(), 0, 0, 0, Math.PI / 8);
    k.add(cyl(1.92, 1.92, 0.04, 8), deck(), 0, 0.91, 0, Math.PI / 8);
    k.add(torus(1.95, 0.05, 5, 8), hazard(), 0, 0.92, 0, Math.PI / 8, { rx: Math.PI / 2 });
    for (let s = 0; s < 2; s++) k.add(rbox(1.6, 0.45 * (s + 1), 0.5, 0.04), MAT.plates('#5a6670', 1), 0, 0.225 * (s + 1), 2.45 - s * 0.5);
    k.at(0, 0.92, -0.9, 0, () => P.console_(k, { w: 2.2, kinds: ['shaft', 'wave', 'radar'], levers: 3 }));
    k.at(0, 0.92, 0, 0, () => P.railing(k, [[-1.8, -0.2], [-1.8, 1.4]], { h: 1.0 }));
    k.at(0, 0.92, 0, 0, () => P.railing(k, [[1.8, -0.2], [1.8, 1.4]], { h: 1.0 }));
  });
  B.ccol(CP[0], CP[1], 2.0, 0.9, { seeThrough: true });
  for (let s = 0; s < 2; s++) { const [x, z] = [CP[0] + Math.sin(cpA) * (2.45 - s * 0.5), CP[1] + Math.cos(cpA) * (2.45 - s * 0.5)]; B.col(x, z, 0.8, 0.27, 0.45 * (s + 1), { rot: cpA }); }
  { const [x, z] = [CP[0] - Math.sin(cpA) * 0.9, CP[1] - Math.cos(cpA) * 0.9]; B.col(x, z, 1.12, 0.42, 2.6, { rot: cpA, noStand: true }); }
  R.console = B.world(CP[0] - Math.sin(cpA) * 0.9, CP[1] - Math.cos(cpA) * 0.9);
  R.npcSpots = { vesk: { ...B.world(CP[0] - Math.sin(cpA) * 0.05, CP[1] - Math.cos(cpA) * 0.05), a: cpA + Math.PI } };
  B.light('#9ff4ff', 3, 5, CP[0] - Math.sin(cpA) * 0.2, 2.2, CP[1] - Math.cos(cpA) * 0.2);

  // --- the arena for the guardian, the spot it rises from
  R.arena = { x0: B.cx - 7.2, z0: B.cz - 7.2, x1: B.cx + 7.2, z1: B.cz + 7.2 };
  R.bossSpot = { ...B.world(0.6, -1.4), y: 2.4 };

  // --- ball bank shots: mirror the flying magic ball off the brass panels (horizontal reflection)
  const reflectBall = (ball, dt) => {
    if (!ball || ball.state !== 'fly') return false;
    const v = ball.vel, p = ball.pos;
    for (const f of R.reflectors) {
      const vn = v.x * f.nx + v.z * f.nz;
      if (vn >= -0.5) continue;
      const dist = (p.x - f.x) * f.nx + (p.z - f.z) * f.nz;
      // reflect on the last frame before the ball would reach the panel's collider (front face + ball radius)
      if (dist < -0.05 || dist > -vn * dt + 0.34) continue;
      const lat = (p.x - f.x) * -f.nz + (p.z - f.z) * f.nx;
      if (Math.abs(lat) > f.hw + 0.2 || p.y < f.y0 - 0.3 || p.y > f.y1 + 0.4) continue;
      // move the ball to where it meets the panel, then send it off mirrored
      const s0 = Math.max(0, (dist - 0.3) / -vn);
      p.x += v.x * s0; p.z += v.z * s0; p.y += v.y * s0;
      v.x -= 2 * vn * f.nx; v.z -= 2 * vn * f.nz; v.x *= 0.95; v.z *= 0.95;
      v.y = Math.max(v.y, f.kick); // the panels lean back a little: the ball comes off them rising
      f.flash = 1;
      const g = globalThis.game; g?.audio?.play?.('bounce'); g?.particles?.burst?.(p.x, p.y, p.z, '#ffe9a0', 8, 2.5);
      return true;
    }
    return false;
  };
  R.reflectBall = reflectBall;

  // --- light: the bore's hot tip, her violet, cold fill
  B.light('#7a6ad8', 3, 30, 0, 9, 0);
  B.light('#b08aff', 4, 12, -6, 3, -6);

  flushNoShadow(kt);
  R.updaters.push((dt, tt) => {
    drill.rotation.y += spin * dt;
    const breath = 0.5 + 0.5 * Math.sin(tt * 0.45);
    her.material.opacity = 0.16 + 0.1 * breath; her2.material.opacity = 0.12 + 0.08 * breath;
    pit.material.opacity = 0.35 + 0.25 * breath;
    herLight.intensity = herLight.userData.base * (0.7 + 0.5 * breath);
    memMat.opacity = 0.38 + 0.04 * breath;
    const hot = mode === 'drill';
    bitMat.emissiveIntensity = hot ? 0.35 + Math.sin(tt * 9) * 0.1 : 0.6;
    tipGlow.material.opacity = hot ? 0.55 + Math.sin(tt * 13) * 0.15 : 0.6;
    tipLight.intensity = tipLight.userData.base * (hot ? 0.8 + Math.sin(tt * 11) * 0.2 : 0.7);
    fmat.opacity = 0.85 + Math.sin(tt * 2.3) * 0.15;
    if (hot) crackMat.emissiveIntensity = (2.2 * (1 - fieldLevel) + 0.08) * (0.85 + Math.sin(tt * 5) * 0.15);
    for (const p of R.pylons) {
      if (p.state === 1) { const b = 0.6 + 0.4 * Math.sin(tt * 8); p.em.emissiveIntensity = 2.4 * b; p.hg.material.opacity = 0.6 * b; }
      if (p.state === 2) p.linkM.opacity = 0.6 + Math.sin(tt * 6 + p.i) * 0.2;
    }
    for (const f of R.reflectors) { f.flash = Math.max(0, f.flash - dt * 3); f.mesh.material.opacity = 0.6 * f.flash; }
    reflectBall(globalThis.game?.ball, dt);
  });
  // the whole arena stands 0.3 m up: the magic ball treats ground below 0.2 as the sea and comes back,
  // so on a floor at 0 every bank shot would end at its first bounce
  const LIFT = 0.3;
  B.group.position.y = LIFT;
  for (const c of R.colliders) { c.top += LIFT; if (c.bottom > -50) c.bottom += LIFT; }
  for (const p of R.pylons) { p.y += LIFT; p.target.y += LIFT; }
  for (const t of R.ballTargets) t.y += LIFT;
  for (const f of R.reflectors) { f.y += LIFT; f.y0 += LIFT; f.y1 += LIFT; }
  R.bossSpot.y += LIFT; R.floorY = LIFT;
  const room = B.finish();
  room.center.set(B.cx - 1.0, 0, B.cz - 1.0);
  return room;
}

// ================================================================ registration
export function buildUnderground(scene, physics) {
  const rooms = {
    c3shaft: buildShaft(scene, physics),
    c3deep: buildDeep(scene, physics),
    c3gallery: buildGallery(scene, physics),
    c3sendell: buildSendell(scene, physics),
    c3core: buildCore(scene, physics),
  };
  return rooms;
}
