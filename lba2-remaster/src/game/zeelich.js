// Zeelich — the terminal island above the clouds (chapter 2). An outdoor region: a room flagged `outdoor`,
// shown with the LBA exterior camera and its own sky (Environment.setRegion), far from Citadel in the same
// scene. Walkable ground is physics bricks only: past the island's edge there is no floor (the terrain there
// is open sea, which actors may not enter), so nobody walks off into the clouds.
//
// CONTRACT used by src/game/story/chapter2.js (keep these names and meanings when rebuilding the art):
//   R.dock {x,z,a}            where the ferry ties up; R.ferry {group, x, z, setVisible(b)}
//   R.street {x,z}            Esmer street centre; R.npcSpots {esmer1, esmer2, esmer3, bee1, bee2, mole1, mole2, tri1, tri2, baldinoOut, doran, vesk, guard} {x,z,a}
//   R.workshopDoor {x,z}      door into Baldino's workshop (interior room 'workshop')
//   R.councilDoor {x,z}       the arcade house's door: the council house and its cloud lift (rooms 'upper', 'council', 'archive')
//   R.mills [{id, x, z, brake:{x,y,z}, spinning, setSpinning(b)}]  three wind-mills, a ball target (brake) each
//   R.millTop {x,y,z}         the cog on top of the old mill (reached by jumping up its stair-stones)
//   R.depot {x, z, patrol:[[x,z],...], locker:{x,z}}  the project depot (drones patrol it), locker holds the code cylinder
//   R.platform {x, z, gate:{x,z}, console:{x,z}, shield:{on, setOn(b)}, pad:{x,z}, lift:{lower(cb)}}
//   R.cloudY                  height of the cloud sea
//   R.life                    the street twelve years on (zeelife.js: the watch house bakery, heat posts, burrow, scaffold)
//
// Art pass: a floating island of Esmer architecture above a pink sea of clouds. West → east: the sky-ferry
// pier and a horseshoe gateway, the Esmer street (whitewashed and lilac houses with onion domes, an arcade,
// a fountain, a market stall, Baldino's cluttered workshop), three wind-mills with big sail wheels (the old
// north one can be climbed by its stair-stones), the fenced project depot, and the Joint Project's drill
// platform beyond a shielded gate. Everything is built in local coordinates inside R.group (which sits at
// ZEELICH); colliders and contract points are in world coordinates. Kit rules as in island.js: bevelled
// edges, real thickness, painted textures with world-scaled UVs, static parts merged per material.
//
// Heights the story may need: walking level Y0 = 6.0, platform deck DECK = 6.42 (both world y), cloud sea
// R.cloudY = -3. Mill brakes are 3.0 m above the ground; the old mill's balcony (R.millTop.y) is 8.75 m up.
import * as THREE from 'three';
import { esmerShuttle, shuttleTraffic } from './shuttle.js';
import { Dog, addDogs } from './dogs.js';
const MAT_PAD = () => new THREE.MeshStandardMaterial({ color: '#8a8f9a', roughness: 0.7, metalness: 0.2 });
import { textures } from '../engine/textures.js';
import { rng, lerp, smoothstep } from '../engine/math.js';
import { rockGeometry, grassClumpGeometry, flowerGeometry } from './vegetation.js';
import { rugTex } from './props.js';
import { buildZeelichLife, zlClear } from './zeelife.js';

export const ZEELICH = { x: 2400, z: 0 };
const Y0 = 6.0;              // walking level of the island
const DECK = Y0 + 0.42;      // drill platform deck (one step up from the neck)
const CLOUD_Y = Y0 - 9;      // the sea of clouds

// ================================================================== layout (local coordinates)
// island outline (clockwise from the dock), smoothed before use
const OUTLINE = [
  [-50, -2.6], [-50, -7], [-48, -14], [-42, -21.5], [-32, -26.5], [-20, -28.5], [-8, -29.5], [4, -28.5], [16, -29.5], [26, -27],
  [33, -21], [36.2, -12.5], [36, -6], [40.4, -6], [40.4, 6], [36, 6], [36.2, 12.5], [33, 21], [26, 27.5], [16, 30], [4, 29], [-8, 30],
  [-20, 29], [-32, 27], [-42, 22], [-48, 14], [-50, 7], [-50, 2.6],
];
const PLATFORM = [[40, -7.5], [44, -11.5], [56, -11.5], [60.5, -7], [60.5, 7], [56, 11.5], [44, 11.5], [40, 7.5]];
const PAD = { x: 50, z: 0, r: 1.7 };
const SHAFT_R = 1.85;
const GATE = { x: 37.2, half: 2.75, wall: 6.6 };
const PIER = { x0: -64, x1: -49.4, hw: 2.25 };
const FERRY = { x: -57.6, z: 5.05 };
const DEPOT = { x0: 4, x1: 24, z0: 9, z1: 25.2, gate: [10.0, 14.0] };
const PLAZA = { x: -24, z: 0, r: 8.2 };
const MILLS = [
  { id: 'north', x: -2, z: -20, old: true, face: -0.95, brake: 0.0 },
  { id: 'east', x: 22, z: -17.5, face: -0.55, brake: 0.25 },
  { id: 'south', x: -2.5, z: 21.5, face: 2.45, brake: Math.PI },
];
const HOUSES = [
  { x: -40.5, z: -10.2, ry: 0, w: 6.2, d: 5.2, h: 3.8, wall: '#fbf2ee', trim: '#3a86b8', dome: ['#7d5cc0', '#e0c0ff'], minaret: 1, seed: 1 },
  { x: -25.5, z: -13.3, ry: 0, w: 8.2, d: 5.6, h: 4.3, wall: '#e6d2f0', trim: '#c8508a', dome: ['#2a9a9c', '#a8f4e4'], arcade: 3, seed: 2 },
  { x: -11, z: -10.6, ry: 0, w: 6.0, d: 5.0, h: 3.6, wall: '#f8dcd8', trim: '#3a72c4', dome: ['#d8963a', '#ffe2a0'], seed: 3 },
  { x: -38.5, z: 10.6, ry: Math.PI, w: 6.6, d: 5.4, h: 3.9, wall: '#f4eee6', trim: '#2f7a84', dome: ['#d0607e', '#ffc4d4'], minaret: -1, seed: 4 },
  { x: -12, z: 12.2, ry: Math.PI, w: 7.6, d: 6.2, h: 4.0, wall: '#f0dfc4', trim: '#2f7a84', workshop: true, seed: 5, doorX: -1.5 },
];

// ================================================================== materials
const MC = new Map();
const TILE = { cliff: 4.5, stone: 1.8, plaster: 2.2, planks: 2.2, brass: 1.6, teal: 2.2, hazard: 0.9, deck: 2.0, cobble: 3.2, grass: 4.0, dirt: 3.0, rubble: 1.7, tiles: 1.0, concrete: 2.6, metal: 2.6, roof: 1.6 };
function tm(name, opts = {}) {
  const key = name + JSON.stringify(opts);
  if (MC.has(key)) return MC.get(key);
  const map = typeof name === 'string' ? textures()[name] : name;
  const m = new THREE.MeshStandardMaterial({ map, color: opts.color || '#ffffff', roughness: opts.rough ?? 0.88, metalness: opts.metal ?? 0, vertexColors: !!opts.vc, emissive: opts.emissive || '#000000', emissiveIntensity: opts.ei ?? 1, side: opts.side ?? THREE.FrontSide, transparent: !!opts.transparent, alphaTest: opts.alphaTest ?? 0 });
  MC.set(key, m);
  return m;
}
function pm(color, rough = 0.8, extra = {}) {
  const key = '_' + color + rough + JSON.stringify(extra);
  if (MC.has(key)) return MC.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });
  MC.set(key, m);
  return m;
}
const VC = () => pm('#ffffff', 0.85, { vertexColors: true });
const brassM = () => tm('brass', { rough: 0.36, metal: 0.75 });
const tealM = () => tm('teal', { rough: 0.55, metal: 0.3 });
const darkSteel = () => pm('#3a4048', 0.5, { metalness: 0.55 });
const glowCyan = () => pm('#9ff4ff', 0.3, { emissive: '#35d8ff', emissiveIntensity: 2.4 });

// ================================================================== painted textures (Zeelich only)
const TC = new Map();
function ctex(key, w, h, draw, repeat = true) {
  if (TC.has(key)) return TC.get(key);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  TC.set(key, t);
  return t;
}
const wrap9 = (S, fn) => { for (const a of [-S, 0, S]) for (const b of [-S, 0, S]) fn(a, b); };
// Esmer glazed tiles (4×4 per texture = 0.25 m tiles): an eight-point star per tile, quatrefoils at the corners
const tileTex = (a = '#2f8a9a', b = '#e8b84a', c = '#d8608a') => ctex('tiles' + a + b + c, 256, 256, (x, S) => {
  const r = rng(5);
  x.fillStyle = '#5a4a5a'; x.fillRect(0, 0, S, S);
  const t = S / 4;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const x0 = i * t, y0 = j * t, k = 0.92 + r() * 0.12;
    x.fillStyle = `rgb(${244 * k | 0},${236 * k | 0},${222 * k | 0})`; x.beginPath(); x.roundRect(x0 + 2, y0 + 2, t - 4, t - 4, 4); x.fill();
    const cx = x0 + t / 2, cy = y0 + t / 2;
    x.fillStyle = a; x.beginPath();
    for (let q = 0; q < 16; q++) { const an = (q / 16) * Math.PI * 2, rr = q % 2 ? 11 : 26; x.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); }
    x.closePath(); x.fill();
    x.fillStyle = b; x.beginPath(); x.arc(cx, cy, 7, 0, 7); x.fill();
    x.fillStyle = c; for (const [qx, qy] of [[x0, y0], [x0 + t, y0], [x0, y0 + t], [x0 + t, y0 + t]]) { x.beginPath(); x.arc(qx, qy, 9, 0, 7); x.fill(); }
    x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(x0 + 6, y0 + 5, t - 20, 3);
  }
});
// fish-scale dome tiles with gilded ribs
export const domeTex = (base, hi) => ctex('dome' + base + hi, 256, 256, (x, S) => {
  const r = rng(base.length * 7 + 3);
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  const cw = 32, ch = 22;
  for (let j = -1; j < S / ch + 1; j++) for (let i = -1; i < S / cw + 1; i++) {
    const cx = i * cw + (j % 2 ? cw / 2 : 0), cy = j * ch;
    const g = x.createRadialGradient(cx, cy + ch * 0.3, 2, cx, cy + ch * 0.6, cw * 0.62);
    g.addColorStop(0, hi); g.addColorStop(0.55, base); g.addColorStop(1, 'rgba(0,0,0,0.35)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, cw * 0.56, 0, Math.PI); x.fill();
    x.strokeStyle = 'rgba(40,20,50,0.45)'; x.lineWidth = 1.5; x.beginPath(); x.arc(cx, cy, cw * 0.56, 0.1, Math.PI - 0.1); x.stroke();
    if (r() < 0.1) { x.fillStyle = 'rgba(255,255,255,0.25)'; x.beginPath(); x.arc(cx - 4, cy + 8, 4, 0, 7); x.fill(); }
  }
  for (let i = 0; i < 4; i++) { x.fillStyle = '#e8c060'; x.fillRect(i * 64 - 2, 0, 4, S); x.fillStyle = 'rgba(120,80,20,0.5)'; x.fillRect(i * 64 + 2, 0, 1.5, S); }
});
// carved lattice screen over dark glass
const latticeTex = () => ctex('lattice', 128, 128, (x, S) => {
  x.fillStyle = '#2c2846'; x.fillRect(0, 0, S, S);
  const g = x.createLinearGradient(0, 0, S, S); g.addColorStop(0, 'rgba(255,200,240,0.18)'); g.addColorStop(1, 'rgba(80,160,255,0.1)'); x.fillStyle = g; x.fillRect(0, 0, S, S);
  x.strokeStyle = '#f2e6d4'; x.lineWidth = 5;
  for (let i = 0; i <= 2; i++) for (let j = 0; j <= 2; j++) {
    const cx = i * 64, cy = j * 64;
    x.beginPath(); for (let q = 0; q <= 8; q++) { const a = (q / 8) * Math.PI * 2 + Math.PI / 8; x.lineTo(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26); } x.stroke();
  }
  x.lineWidth = 4; x.beginPath(); for (const v of [32, 96]) { x.moveTo(v, 0); x.lineTo(v, S); x.moveTo(0, v); x.lineTo(S, v); } x.stroke();
});
// striped sail cloth (rose / cream) with seams
const sailTex = (a = '#f6eadc', b = '#e88aa4') => ctex('sail' + a + b, 128, 256, (x, W, H) => {
  const r = rng(11);
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect((i * W) / 8, 0, W / 8 + 1, H); }
  for (let i = 0; i < 400; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(90,60,40,0.06)'; x.fillRect(r() * W, r() * H, 2, 1 + r() * 6); }
  x.fillStyle = 'rgba(80,50,40,0.35)'; for (let i = 0; i <= 8; i++) x.fillRect((i * W) / 8 - 1, 0, 1.5, H);
  x.fillStyle = 'rgba(70,40,30,0.45)'; for (let j = 0; j < 4; j++) x.fillRect(0, (j * H) / 4, W, 2);
});
// soft cloud puffs, tileable, transparent (alpha) or on a solid ground
export const cloudTex = (solid) => ctex('cloud' + solid, 512, 512, (x, S) => {
  const r = rng(solid ? 77 : 78);
  if (solid) { x.fillStyle = '#d0a0cc'; x.fillRect(0, 0, S, S); } else x.clearRect(0, 0, S, S);
  // billows: a lavender shadow under each puff, then the sunlit puff with a soft rim
  for (let i = 0; i < (solid ? 46 : 26); i++) {
    const px = r() * S, py = r() * S, rr = 18 + r() * 36;
    const parts = [];
    for (let k = 0; k < 7; k++) parts.push([px + (r() - 0.5) * rr * 2.0, py + (r() - 0.5) * rr * 0.7, rr * (0.45 + r() * 0.45)]);
    for (const pass of [0, 1]) for (const [qx, qy, q] of parts) wrap9(S, (ox, oy) => {
      const cx = qx + ox, cy = qy + oy + (pass ? 0 : q * 0.28);
      const g = x.createRadialGradient(cx - q * 0.2, cy - q * 0.25, 0, cx, cy, q);
      if (!pass) { g.addColorStop(0, 'rgba(150,110,170,0.5)'); g.addColorStop(0.8, 'rgba(160,120,180,0.3)'); g.addColorStop(1, 'rgba(160,120,180,0)'); }
      else { g.addColorStop(0, 'rgba(255,253,250,1)'); g.addColorStop(0.55, 'rgba(255,242,248,0.95)'); g.addColorStop(0.85, 'rgba(244,214,236,0.55)'); g.addColorStop(1, 'rgba(240,210,236,0)'); }
      x.fillStyle = g; x.fillRect(cx - q, cy - q, q * 2, q * 2);
    });
  }
});
export const puffTex = () => ctex('puff', 128, 128, (x, S) => {
  x.clearRect(0, 0, S, S);
  const r = rng(3);
  for (let k = 0; k < 9; k++) {
    const cx = 64 + (r() - 0.5) * 56, cy = 70 + (r() - 0.5) * 30, q = 22 + r() * 22;
    const g = x.createRadialGradient(cx, cy - q * 0.3, 0, cx, cy, q);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.6, 'rgba(255,238,246,0.6)'); g.addColorStop(1, 'rgba(255,238,246,0)');
    x.fillStyle = g; x.fillRect(cx - q, cy - q, q * 2, q * 2);
  }
}, false);
// hexagonal energy field
const shieldTex = () => ctex('shield', 256, 256, (x, S) => {
  x.clearRect(0, 0, S, S);
  const g = x.createLinearGradient(0, 0, 0, S); g.addColorStop(0, 'rgba(120,240,255,0.18)'); g.addColorStop(1, 'rgba(120,240,255,0.32)'); x.fillStyle = g; x.fillRect(0, 0, S, S);
  const R = 16, w = Math.sqrt(3) * R;
  x.strokeStyle = 'rgba(190,255,255,0.95)'; x.lineWidth = 2.2;
  for (let j = -1; j < S / (1.5 * R) + 1; j++) for (let i = -1; i < S / w + 1; i++) {
    const cx = i * w + (j % 2 ? w / 2 : 0), cy = j * 1.5 * R;
    x.beginPath(); for (let q = 0; q <= 6; q++) { const a = (q / 6) * Math.PI * 2 + Math.PI / 6; x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); } x.stroke();
  }
});
const bullseyeTex = () => ctex('bull', 128, 128, (x, S) => {
  const cols = ['#c8302a', '#f4eee0', '#c8302a', '#f4eee0', '#e8b84a'];
  cols.forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - i * 12, 0, 7); x.fill(); });
  x.strokeStyle = 'rgba(60,20,10,0.6)'; x.lineWidth = 2; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(S / 2, S / 2, S / 2 - i * 12 - 1, 0, 7); x.stroke(); }
}, false);
// Baldino's sign: a cog, a spanner and a light bulb (language-free)
const workshopSignTex = () => ctex('wsign', 256, 160, (x, W, H) => {
  x.fillStyle = '#2f7a84'; x.beginPath(); x.roundRect(4, 4, W - 8, H - 8, 18); x.fill();
  x.strokeStyle = '#e8c060'; x.lineWidth = 8; x.beginPath(); x.roundRect(8, 8, W - 16, H - 16, 14); x.stroke();
  const cx = 92, cy = 80;
  x.fillStyle = '#f4e6c4'; x.beginPath();
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, rr = i % 2 ? 40 : 52; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
  x.closePath(); x.fill();
  x.fillStyle = '#2f7a84'; x.beginPath(); x.arc(cx, cy, 18, 0, 7); x.fill();
  x.save(); x.translate(176, 82); x.rotate(-0.7); x.fillStyle = '#e8c060'; x.fillRect(-6, -38, 12, 64); x.beginPath(); x.arc(0, -42, 16, 0, 7); x.fill();
  x.fillStyle = '#2f7a84'; x.fillRect(-6, -60, 12, 20); x.restore();
  x.fillStyle = '#fff2a8'; x.beginPath(); x.arc(212, 44, 14, 0, 7); x.fill(); x.fillStyle = '#c8a040'; x.fillRect(206, 56, 12, 8);
}, false);
// awning stripes
const stripeTex = (a, b) => ctex('stripe' + a + b, 64, 64, (x, S) => { for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect((i * S) / 4, 0, S / 4, S); } const r = rng(a.length + 9); x.fillStyle = 'rgba(0,0,0,0.08)'; for (let i = 0; i < 40; i++) x.fillRect(r() * S, r() * S, 1, 4); });

// ================================================================== geometry helpers (as island.js)
const GC = new Map();
const cached = (key, fn) => { if (!GC.has(key)) GC.set(key, fn()); return GC.get(key); };
function scaleUV(geo, s) { const uv = geo.attributes.uv; if (!uv) return geo; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / s, uv.getY(i) / s); uv.needsUpdate = true; return geo; }
function bbox(w, h, d, r = 0.03, tile = 1) {
  return cached(`bb${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)},${r},${tile}`, () => {
    r = Math.min(r, w / 2.2, h / 2.2, d / 2.2);
    const sw = w - 2 * r, sh = h - 2 * r, rc = Math.min(r * 0.6, sw / 2.2, sh / 2.2);
    const s = new THREE.Shape();
    s.moveTo(-sw / 2 + rc, -sh / 2); s.lineTo(sw / 2 - rc, -sh / 2); s.quadraticCurveTo(sw / 2, -sh / 2, sw / 2, -sh / 2 + rc);
    s.lineTo(sw / 2, sh / 2 - rc); s.quadraticCurveTo(sw / 2, sh / 2, sw / 2 - rc, sh / 2); s.lineTo(-sw / 2 + rc, sh / 2);
    s.quadraticCurveTo(-sw / 2, sh / 2, -sw / 2, sh / 2 - rc); s.lineTo(-sw / 2, -sh / 2 + rc); s.quadraticCurveTo(-sw / 2, -sh / 2, -sw / 2 + rc, -sh / 2);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, d - 2 * r), bevelEnabled: r > 0.001, bevelThickness: r, bevelSize: r, bevelSegments: 2, curveSegments: 2 });
    g.translate(0, 0, -(d - 2 * r) / 2);
    return boxUV(g, tile);
  });
}
function boxUV(geo, tile = 1) {
  if (!geo.attributes.normal) geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal;
  if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(p.count * 2), 2));
  const uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay > ax && ay > az) { u = p.getX(i); v = p.getZ(i); } else if (ax > az) { u = p.getZ(i) * Math.sign(n.getX(i) || 1); v = p.getY(i); } else { u = -p.getX(i) * Math.sign(n.getZ(i) || 1); v = p.getY(i); }
    uv.setXY(i, u / tile, v / tile);
  }
  uv.needsUpdate = true;
  return geo;
}
function lathe(pts, seg = 16, tile = 0, phiStart = 0, phiLen = Math.PI * 2) {
  const g = new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(Math.max(0.0001, a), b)), seg, phiStart, phiLen);
  if (tile) {
    const uv = g.attributes.uv, pos = g.attributes.position;
    let rmax = 0; for (const [a] of pts) rmax = Math.max(rmax, a);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * phiLen * rmax) / tile, pos.getY(i) / tile);
  }
  return g;
}
function cyl(rt, rb, h, seg = 12, tile = 0, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open);
  if (tile) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * Math.PI * 2 * Math.max(rt, rb)) / tile, (uv.getY(i) * h) / tile); }
  return g;
}
function tube(points, r, seg = 8, tile = 1, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', 0.1);
  const len = curve.getLength();
  const g = new THREE.TubeGeometry(curve, Math.max(2, Math.ceil(len * 3)), r, seg, closed);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * len) / tile, (uv.getY(i) * Math.PI * 2 * r) / tile);
  return g;
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
class Batch {
  constructor(parent, { cast = true, receive = true } = {}) { this.parent = parent; this.items = new Map(); this.cast = cast; this.receive = receive; }
  add(geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    _m4.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz, 'YXZ')), _s.set(sx, sy, sz));
    return this.addM(geo, mat, _m4.clone());
  }
  addM(geo, mat, m) { if (!this.items.has(mat)) this.items.set(mat, []); this.items.get(mat).push([geo, m]); return this; }
  build() {
    const out = [];
    for (const [mat, list] of this.items) {
      const mesh = new THREE.Mesh(mergeGeos(list, !!mat.vertexColors), mat);
      mesh.castShadow = this.cast && !mat.transparent; mesh.receiveShadow = this.receive;
      this.parent.add(mesh); out.push(mesh);
    }
    this.items.clear();
    return out;
  }
}
function mergeGeos(list, withColor) {
  let nv = 0, ni = 0;
  for (const [g] of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = withColor ? new Float32Array(nv * 3) : null;
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  const nm = new THREE.Matrix3(), p = new THREE.Vector3();
  let vo = 0, io = 0;
  for (const [g, m] of list) {
    nm.getNormalMatrix(m);
    const flip = m.determinant() < 0;
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, C = g.attributes.color;
    for (let i = 0; i < P.count; i++) {
      p.fromBufferAttribute(P, i).applyMatrix4(m); pos[(vo + i) * 3] = p.x; pos[(vo + i) * 3 + 1] = p.y; pos[(vo + i) * 3 + 2] = p.z;
      if (N) { p.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[(vo + i) * 3] = p.x; nor[(vo + i) * 3 + 1] = p.y; nor[(vo + i) * 3 + 2] = p.z; }
      if (U) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i); }
      if (col) { if (C) { col[(vo + i) * 3] = C.getX(i); col[(vo + i) * 3 + 1] = C.getY(i); col[(vo + i) * 3 + 2] = C.getZ(i); } else col.fill(1, (vo + i) * 3, (vo + i) * 3 + 3); }
    }
    if (g.index) { for (let i = 0; i < g.index.count; i += 3) { idx[io + i] = g.index.getX(i) + vo; idx[io + i + 1] = g.index.getX(flip ? i + 2 : i + 1) + vo; idx[io + i + 2] = g.index.getX(flip ? i + 1 : i + 2) + vo; } }
    else for (let i = 0; i < P.count; i += 3) { idx[io + i] = i + vo; idx[io + i + 1] = (flip ? i + 2 : i + 1) + vo; idx[io + i + 2] = (flip ? i + 1 : i + 2) + vo; }
    vo += P.count; io += g.index ? g.index.count : P.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}
function compose(parts, withColor = false) { return mergeGeos(parts.map(([g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx]) => [g, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz))]), withColor); }
function tint(geo, color) {
  const g = geo.clone(), c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}
function instances(parent, geo, mat, list, { cast = true, receive = true } = {}) {
  const im = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  const o = new THREE.Object3D();
  list.forEach((it, i) => {
    o.position.set(it.x, it.y, it.z); o.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0, 'YXZ');
    if (it.s != null) o.scale.setScalar(it.s); else o.scale.set(it.sx ?? 1, it.sy ?? 1, it.sz ?? 1);
    o.updateMatrix(); im.setMatrixAt(i, o.matrix);
    if (it.color) im.setColorAt(i, new THREE.Color(it.color));
  });
  im.count = list.length; im.castShadow = cast; im.receiveShadow = receive;
  parent.add(im);
  return im;
}
function mesh(parent, geo, mat, x = 0, y = 0, z = 0, ry = 0, { cast = true, rx = 0, rz = 0 } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz, 'YXZ');
  m.castShadow = cast; m.receiveShadow = true;
  parent.add(m);
  return m;
}
// local frame at (x,z) rotated ry → parent coordinates
const frame = (x, z, ry) => (lx, lz) => [x + Math.cos(ry) * lx + Math.sin(ry) * lz, z - Math.sin(ry) * lx + Math.cos(ry) * lz];
const _ux = new THREE.Vector3(1, 0, 0), _uy = new THREE.Vector3(0, 1, 0);
function member(B, a, b, w, mat, tile = 1, round = 0.02) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(_ux, d.normalize());
  B.addM(bbox(+len.toFixed(2), w, w, round, tile), mat, new THREE.Matrix4().compose(A.add(Bv).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
}
function rod(B, a, b, r, mat, seg = 8) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = Bv.clone().sub(A), len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(_uy, d.normalize());
  B.addM(cyl(r, r, +len.toFixed(2), seg, 1), mat, new THREE.Matrix4().compose(A.add(Bv).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
}
// the Joint Project emblem (same design as on Citadel)
function emblemMaterial() {
  return cached('emblemMat', () => {
    const t = ctex('emblem', 128, 128, (x) => {
      x.clearRect(0, 0, 128, 128);
      x.strokeStyle = '#bff8ff'; x.fillStyle = '#bff8ff'; x.lineWidth = 11;
      x.beginPath(); x.arc(64, 70, 34, 0, Math.PI * 2); x.stroke();
      for (const s of [-1, 1]) { x.beginPath(); x.moveTo(64 + s * 26, 46); x.quadraticCurveTo(64 + s * 46, 30, 64 + s * 44, 8); x.quadraticCurveTo(64 + s * 36, 30, 64 + s * 16, 40); x.fill(); }
      x.beginPath(); x.moveTo(64, 50); x.quadraticCurveTo(80, 74, 64, 86); x.quadraticCurveTo(48, 74, 64, 50); x.fill();
    }, false);
    return new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#3fe6ff', emissiveIntensity: 2.2, color: '#9ff0ff', transparent: true, alphaTest: 0.3, depthWrite: false, roughness: 0.4, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 });
  });
}
const emq = () => cached('emq', () => new THREE.PlaneGeometry(1, 1));

// Openings: polyline from bottom-left, up the left jamb, over the arch, down to bottom-right.
// o = {x, y, w, h, horse|arch|round}; g grows the outline (for frames).
function openingPts(o, g = 0, n = 14) {
  const hw = o.w / 2 + g, pts = [[o.x - hw, o.y]];
  if (o.horse) {
    const R0 = (o.w / 2) * 1.16, yc = o.y + o.h - R0, R = R0 + g;
    const b = Math.sqrt(Math.max(0, R * R - hw * hw)), beta = Math.atan2(b, hw);
    for (let i = 0; i <= n; i++) { const a = Math.PI + beta - (i / n) * (Math.PI + 2 * beta); pts.push([o.x + Math.cos(a) * R, yc + Math.sin(a) * R]); }
  } else if (o.arch) {
    const yc = o.y + o.h - o.w / 2;
    for (let i = 0; i <= n; i++) { const a = Math.PI - (i / n) * Math.PI; pts.push([o.x + Math.cos(a) * hw, yc + Math.sin(a) * hw]); }
  } else pts.push([o.x - hw, o.y + o.h + g], [o.x + hw, o.y + o.h + g]);
  pts.push([o.x + hw, o.y]);
  return pts;
}
const toPath = (p, pts) => { pts.forEach(([a, b], i) => (i ? p.lineTo(a, b) : p.moveTo(a, b))); p.closePath(); return p; };
// wall panel in XY (x along, y up) extruded toward +z by t, with openings
function panelGeo(len, h, t, holes = [], tile = TILE.plaster) {
  const s = new THREE.Shape();
  s.moveTo(-len / 2, 0); s.lineTo(len / 2, 0); s.lineTo(len / 2, h); s.lineTo(-len / 2, h); s.lineTo(-len / 2, 0);
  for (const o of holes) {
    const p = new THREE.Path();
    if (o.round) p.absarc(o.x, o.y + o.h / 2, o.w / 2, 0, Math.PI * 2, true);
    else toPath(p, openingPts(o));
    s.holes.push(p);
  }
  return boxUV(new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 16 }), tile);
}
// U-shaped frame around an opening (outline grown by `ring`), `depth` thick
function frameGeo(o, ring, depth, tile = 1) {
  return cached('fr' + JSON.stringify(o) + ring + depth + tile, () => {
    const outer = openingPts(o, ring), inner = openingPts(o, 0).reverse();
    const s = toPath(new THREE.Shape(), outer.concat(inner));
    return boxUV(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1 }), tile);
  });
}
// flat filled opening (door leaf, lattice), slightly larger than the hole
function fillGeo(o, grow, depth, tile = 0.5) {
  return cached('fi' + JSON.stringify(o) + grow + depth + tile, () => {
    const s = toPath(new THREE.Shape(), openingPts(o, grow));
    const g = depth > 0 ? new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }) : new THREE.ShapeGeometry(s);
    return boxUV(g, tile);
  });
}

// ================================================================== polygon helpers
function chaikin(P, it = 2) {
  let pts = P;
  for (let k = 0; k < it; k++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    pts = out;
  }
  return pts;
}
function insidePoly(P, x, z) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, zi] = P[i], [xj, zj] = P[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
function zIntervals(P, x) {
  const zs = [];
  for (let i = 0; i < P.length; i++) {
    const [ax, az] = P[i], [bx, bz] = P[(i + 1) % P.length];
    if ((ax <= x && bx > x) || (bx <= x && ax > x)) zs.push(az + ((x - ax) / (bx - ax)) * (bz - az));
  }
  zs.sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i + 1 < zs.length; i += 2) out.push([zs[i], zs[i + 1]]);
  return out;
}
// distance from a point to the polygon edge (positive)
function edgeDist(P, x, z) {
  let d = 1e9;
  for (let i = 0; i < P.length; i++) {
    const [ax, az] = P[i], [bx, bz] = P[(i + 1) % P.length];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return d;
}
// resample a closed polygon every ~step metres
function resample(P, step) {
  const out = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / step));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}
function shapeOf(P) { const s = new THREE.Shape(); P.forEach(([x, z], i) => (i ? s.lineTo(x, -z) : s.moveTo(x, -z))); s.closePath(); return s; }
// a flat horizontal slab from a polygon (top at y=0, `depth` thick), UVs in metres / tile
function slabGeo(P, depth, tile, holes = []) {
  const s = shapeOf(P);
  for (const h of holes) s.holes.push(h);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 24 });
  g.rotateX(-Math.PI / 2);
  return boxUV(g, tile);
}

// ================================================================== the region
export function buildZeelich(scene, physics) {
  const ox = ZEELICH.x, oz = ZEELICH.z;
  const group = new THREE.Group();
  group.name = 'zeelich';
  group.visible = false;
  group.position.set(ox, 0, oz);
  scene.add(group);
  const W = (x, z) => ({ x: ox + x, z: oz + z });
  const col = (c) => physics.add({ ...c, x: c.x + ox, z: c.z + oz });
  const updaters = [];
  const r = rng(2024);
  const ISL = chaikin(OUTLINE, 3);
  const onIsland = (x, z, pad = 0) => insidePoly(ISL, x, z) && edgeDist(ISL, x, z) > pad;
  // places kept clear of scattered grass/flowers/rocks/trees
  const clear = [];
  const keepClear = (x0, z0, x1, z1) => clear.push([x0, z0, x1, z1]);
  const isClear = (x, z, pad = 0) => !clear.some(([a, b, c, d]) => x > a - pad && x < c + pad && z > b - pad && z < d + pad);

  const B = new Batch(group);
  const R = {
    id: 'zeelich', outdoor: true, group, lights: [], exits: [], searches: [], ballTargets: [], updaters,
    music: 'zeelich', cloudY: CLOUD_Y,
    env: { fog: '#efcade', sun: '#fff0dc', hemiSky: '#f8e2ff', hemiGround: '#a07c9c', sunI: 2.5, hemiI: 1.3, fogRange: [85, 300] },
  };

  buildGround();
  buildPaths();
  buildPier();
  const ferry = buildFerry();
  buildGateway();
  const houses = HOUSES.map((h) => esmerHouse(h));
  buildPlaza();
  buildStreetFurniture();
  const mills = MILLS.map((m) => buildMill(m));
  const depot = buildDepot();
  const platform = buildPlatform();
  buildClouds();
  // ---------------------------------------------------------------- the Esmers' shuttles (src/game/shuttle.js)
  // (placed before the scatter, so no tree grows through the pad)
  // one landed on a pad by the dock (the first clear spot on the island), two more circling over the clouds
  {
    let pad = null;
    for (let k = 0; k < 40 && !pad; k++) {
      const a = k * 0.7, rr = 10 + k * 0.6, x = -48 + Math.cos(a) * rr, z = -6 + Math.sin(a) * rr;
      if (onIsland(x, z, 6.5) && isClear(x, z, 5)) pad = [x, z];
    }
    if (pad) {
      const [px, pz] = pad, gy = physics.groundAt(px + ox, pz + oz);
      const deckM = MAT_PAD();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, 0.25, 24), deckM); disc.position.set(px, gy + 0.12, pz); disc.receiveShadow = true; group.add(disc);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.1, 0.08, 6, 32), new THREE.MeshStandardMaterial({ color: '#e8c040', roughness: 0.5 })); ring.rotation.x = Math.PI / 2; ring.position.set(px, gy + 0.26, pz); group.add(ring);
      const sh = esmerShuttle({ landed: true }); sh.position.set(px, gy + 0.25, pz); sh.rotation.y = 0.6; group.add(sh);
      col({ type: 'cyl', x: px, z: pz, r: 3.5, top: gy + 4.4, noStand: true });
      keepClear(px - 5, pz - 5, px + 5, pz + 5);
      R.shuttlePad = W(px, pz);
    }
    shuttleTraffic(group, updaters, { cx: 0, cz: 0, y: 40, r: 110, n: 3, speed: 0.04 });
  }

  // ---------------------------------------------------------------- the dog-training yard (src/game/dogs.js)
  // After LBA2's yard: a palisade of planks round a bed of fallen leaves, a pale track looping round a stacked-block
  // tower on a red crate, a blue tunnel and two hurdles on the track, a hay bale and an A-frame. The project trains
  // its guard dogs here (LBA2's, bodies 51–53): two run the course, a third noses about; all three stop and bark
  // at Twinsen from behind the palisade. (The working ones guard the depots: src/game/guarddog.js.)
  const dogs = [];
  {
    // behind the north houses, toward the old mill (the shuttle pad has the south side)
    const yard = onIsland(-28, -21, 3) ? [-28, -21] : null;
    if (yard) {
      const [yx, yz] = yard, gy = physics.groundAt(yx + ox, yz + oz);
      const HW = 5.5, HD = 3.4;   // the palisade's half-size
      const flat = (w, d, hex, y, x = yx, z = yz, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, d), new THREE.MeshStandardMaterial({ color: hex, roughness: 0.95 })); m.position.set(x, y, z); m.rotation.y = ry; m.receiveShadow = true; group.add(m); return m; };
      flat(HW * 2, HD * 2, '#a8582a', gy + 0.02);
      // the track: a rounded loop of pale planks-and-sand, 1.1 m wide
      const path = [];
      const TW = HW - 1.6, TD = HD - 1.4;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
        const k = 0.35;   // squareness
        path.push([yx + Math.sign(c) * Math.pow(Math.abs(c), k) * TW, yz + Math.sign(sn) * Math.pow(Math.abs(sn), k) * TD]);
      }
      for (let i = 0; i < path.length; i++) {
        const [ax, az] = path[i], [bx, bz] = path[(i + 1) % path.length];
        flat(1.15, Math.hypot(bx - ax, bz - az) + 0.25, '#d4cec6', gy + 0.05, (ax + bx) / 2, (az + bz) / 2, Math.atan2(bx - ax, bz - az));
      }
      const wood = new THREE.MeshStandardMaterial({ color: '#7a5434', roughness: 0.9 }), woodD = new THREE.MeshStandardMaterial({ color: '#5a3c24', roughness: 0.9 });
      const box = (w, h, d, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; group.add(o); return o; };
      // hurdles on the two long straights (the dogs hop them), flagged on the path
      for (const i of [6, 18]) {
        const [hx, hz] = path[i], [nx, nz] = path[(i + 1) % path.length], ry = Math.atan2(nx - hx, nz - hz);
        for (const s of [-1, 1]) box(0.08, 0.55, 0.08, woodD, hx + Math.cos(ry) * s * 0.6, gy + 0.28, hz - Math.sin(ry) * s * 0.6);
        box(1.25, 0.07, 0.07, new THREE.MeshStandardMaterial({ color: '#e8e0d0', roughness: 0.6 }), hx, gy + 0.42, hz, ry);
        path[i] = [hx, hz, 1];
      }
      // the blue tunnel across the track at the west end
      {
        const [tx, tz] = path[12], [nx, nz] = path[13];
        const tun = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.7, 14, 1, true, 0, Math.PI * 1.3), new THREE.MeshStandardMaterial({ color: '#3a78c8', roughness: 0.5, side: THREE.DoubleSide }));
        tun.rotation.z = Math.PI / 2; tun.rotation.order = 'YXZ'; tun.rotation.y = Math.atan2(nx - tx, nz - tz) + Math.PI / 2; tun.rotation.x = -Math.PI * 0.15;
        tun.position.set(tx, gy + 0.36, tz); tun.castShadow = true; group.add(tun);
      }
      // the stacked-block tower on its red crate, the hay bale, an A-frame
      box(1.2, 0.8, 1.2, new THREE.MeshStandardMaterial({ color: '#8a3424', roughness: 0.8 }), yx + 0.6, gy + 0.4, yz);
      for (let i = 0; i < 6; i++) box(0.95, 0.36, 0.7, new THREE.MeshStandardMaterial({ color: i % 2 ? '#3a3c40' : '#2c2e32', roughness: 0.7 }), yx + 0.6, gy + 0.98 + i * 0.37, yz, i * 0.06);
      col({ type: 'box', x: yx + 0.6, z: yz, hw: 0.6, hd: 0.6, rot: 0, top: gy + 3.1 });
      box(1.4, 0.6, 0.8, new THREE.MeshStandardMaterial({ color: '#c8a050', roughness: 1 }), yx - 2.2, gy + 0.3, yz + 0.6, 0.3);
      col({ type: 'box', x: yx - 2.2, z: yz + 0.6, hw: 0.7, hd: 0.4, rot: 0.3, top: gy + 0.6 });
      for (const s of [-1, 1]) box(1.0, 0.06, 1.1, wood, yx - 2.4 + s * 0.42, gy + 0.36, yz - 1.2).rotation.z = -s * 0.75;
      // the palisade: planks of uneven height on all four sides, a gap for a gate on the near (south) side
      const plank = (x, z, ry, h) => { const o = box(0.34, h, 0.08, (Math.round(x * 7 + z * 3) % 2) ? wood : woodD, x, gy + h / 2, z, ry); o.rotation.z = ((x * 13 + z * 7) % 1) * 0.08 - 0.04; };
      for (let x = -HW; x <= HW + 0.01; x += 0.36) { plank(yx + x, yz - HD, 0, 1.15 + Math.abs(Math.sin(x * 3.1)) * 0.25); if (Math.abs(x) > 0.9) plank(yx + x, yz + HD, 0, 1.1 + Math.abs(Math.sin(x * 2.3)) * 0.25); }
      for (let z = -HD + 0.36; z < HD; z += 0.36) for (const s of [-1, 1]) plank(yx + s * HW, yz + z, Math.PI / 2, 1.15 + Math.abs(Math.sin(z * 2.7 + s)) * 0.25);
      col({ type: 'box', x: yx, z: yz - HD, hw: HW, hd: 0.1, rot: 0, top: gy + 1.2 });
      for (const s of [-1, 1]) {
        col({ type: 'box', x: yx + s * HW, z: yz, hw: 0.1, hd: HD, rot: 0, top: gy + 1.2 });
        col({ type: 'box', x: yx + s * (HW + 0.9) / 2, z: yz + HD, hw: (HW - 0.9) / 2, hd: 0.1, rot: 0, top: gy + 1.2 });
      }
      keepClear(yx - HW - 1, yz - HD - 1, yx + HW + 1, yz + HD + 1);
      const P = path.map(([x, z, hop]) => [x + ox, z + oz, hop]);
      dogs.push(new Dog({ parent: group, ox, oz, physics, coat: 'grey', x: P[0][0], z: P[0][1], path: P }));
      dogs.push(new Dog({ parent: group, ox, oz, physics, coat: 'brown', x: P[12][0], z: P[12][1], path: P }));
      dogs[1].s = dogs[1].len / 2;
      dogs.push(new Dog({ parent: group, ox, oz, physics, coat: 'greybrown', x: yx + ox - 2, z: yz + oz - 1.5, area: { x0: yx + ox - 3.5, z0: yz + oz - 1.6, x1: yx + ox + 3.5, z1: yz + oz + 1.6 } }));
      R.dogYard = { ...W(yx, yz), gate: W(yx, yz + HD) };
    }
    addDogs(dogs, updaters);
    R.dogs = dogs;
  }

  // ---------------------------------------------------------------- the street twelve years on (src/game/zeelife.js)
  const life = buildZeelichLife({ group, col, W, updaters, domeTex, pelleck: houses[0].dome });

  buildIslets();
  scatter();
  B.build();

  // ---------------------------------------------------------------- contract
  const ws = houses[4].door;
  Object.assign(R, {
    spawn: { ...W(-55.5, 0), a: Math.PI / 2 },
    dock: { ...W(-57.6, 1.3), a: 0 },
    street: W(-24, 0),
    workshopDoor: W(ws[0], ws[1]),
    councilDoor: W(houses[1].door[0], houses[1].door[1]),
    npcSpots: {
      esmer1: { ...W(-34.5, -3.2), a: Math.PI / 2 },
      esmer2: { ...W(-24, 7.0), a: Math.PI },
      esmer3: { ...W(-15.5, -2.6), a: -2.2 },
      // the street's other folk: Mosquibees and burrowers, as on LBA2's Zeelich
      // (twelve years on, zeelife.js: Bzizz by the watch house he lands on, Mother Snuff at her bread hatch, Old Grumm
      // by the burrow hatch, Mr Pelleck under his scaffold)
      bee1: life.watch.bzizz,
      bee2: { ...W(-29.0, 5.6), a: Math.PI },
      mole1: life.grumm,
      mole2: life.watch.snuff,
      tri1: life.pelleck || { ...W(-31.5, -4.4), a: 0.2 },
      tri2: { ...W(-12.0, 3.0), a: -2.6 },
      baldinoOut: { ...W(ws[0] + 1.4, ws[1] - 0.4), a: Math.PI },
      doran: { ...W(-60.5, 0.9), a: Math.PI / 2 },
      vesk: { ...W(46.5, -4.5), a: -Math.PI / 2 },
      guard: { ...W(35.2, 3.6), a: -Math.PI / 2 },
    },
    mills: mills.map((m) => m.api),
    millTop: mills[0].top,
    depot,
    platform,
    ferry,
    life,
  });

  // houses and big buildings between the camera and Twinsen fade out (the camera doesn't dodge them)
  const faders = houses.map((h) => h.fader).concat(mills.map((m) => m.fader)).filter(Boolean);
  { const b = life.fadeBox; faders.push(makeFader(life.group, b.x0, b.z0, b.x1, b.z1, b.top)); }
  const sample = new THREE.Vector3(), hp = new THREE.Vector3(), cp = new THREE.Vector3();
  updaters.push((dt) => {
    const G = globalThis.game;
    if (!G || G.room !== R || !G.camera) return;
    hp.set(G.hero.pos.x - ox, G.hero.pos.y, G.hero.pos.z - oz);
    cp.set(G.camera.position.x - ox, G.camera.position.y, G.camera.position.z - oz);
    for (const E of faders) {
      let hit = false;
      if (hp.x > E.x0 - 16 && hp.x < E.x1 + 16 && hp.z > E.z0 - 16 && hp.z < E.z1 + 16) {
        for (const hy of [0.3, 1.0, 1.8]) for (let k = 1; k < 18 && !hit; k++) {
          sample.set(hp.x, hp.y + hy, hp.z).lerp(cp, k / 18);
          if (sample.x > E.x0 && sample.x < E.x1 && sample.z > E.z0 && sample.z < E.z1 && sample.y < E.top) hit = true;
        }
      }
      const goal = hit ? 0.15 : 1;
      E.f += (goal - E.f) * (1 - Math.exp(-dt * 8));
      const see = E.f < 0.98;
      for (const m of E.mats) {
        if (m.userData.alwaysTransparent) { m.opacity = (m.userData.baseOpacity ?? 1) * (see ? E.f : 1); continue; }
        if (m.transparent !== see) { m.transparent = see; m.needsUpdate = true; }
        m.opacity = see ? E.f : 1; m.depthWrite = !see;
      }
    }
  });
  return R;

  // ================================================================ ground: island top, grassy lip, cliffs
  function buildGround() {
    const top = slabGeo(ISL, 0.6, TILE.grass);
    const ground = mesh(group, top, tm('grass', { color: '#fff2c4', rough: 0.95 }), 0, Y0 - 0.6, 0, 0, { cast: false });
    void ground;
    // cliff skirt: rings of the outline going down and in, a turf lip on top, strata of lilac-ochre rock
    const ring = resample(ISL, 1.6), n = ring.length;
    let cx = 0, cz = 0; for (const [x, z] of ISL) { cx += x; cz += z; } cx /= ISL.length; cz /= ISL.length;
    const nrm = ring.map((p, i) => {
      const a = ring[(i - 1 + n) % n], b = ring[(i + 1) % n];
      const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
      return [-tz / l, tx / l]; // outward for a clockwise (in x-z with z down) outline
    });
    // make sure normals point away from the centre
    if ((ring[0][0] - cx) * nrm[0][0] + (ring[0][1] - cz) * nrm[0][1] < 0) for (const q of nrm) { q[0] = -q[0]; q[1] = -q[1]; }
    const levels = [
      { y: 0, out: 0, s: 1, c: '#a8b85a' }, { y: -0.3, out: 0.32, s: 1, c: '#8aa048' }, { y: -0.9, out: 0.18, s: 1, c: '#9a7a5a' },
      { y: -2.6, out: -0.4, s: 0.99, c: '#c49a8a' }, { y: -5.5, out: -1.4, s: 0.95, c: '#b88aa0' }, { y: -9, out: -1.0, s: 0.86, c: '#a888b0' },
      { y: -13, out: -2.0, s: 0.72, c: '#9a80a8' }, { y: -19, out: -2.0, s: 0.5, c: '#8a7aa0' }, { y: -27, out: 0, s: 0.24, c: '#7a6a90' },
    ];
    const pos = [], cols = [], uvs = [], idx = [];
    const c = new THREE.Color();
    let arc = 0;
    const arcs = ring.map((p, i) => { if (i) arc += Math.hypot(p[0] - ring[i - 1][0], p[1] - ring[i - 1][1]); return arc; });
    levels.forEach((L, li) => {
      for (let i = 0; i <= n; i++) {
        const k = i % n, [px, pz] = ring[k], [nx, nz] = nrm[k];
        const wob = li > 2 ? Math.sin(px * 0.31 + li * 1.7) * 0.6 + Math.sin(pz * 0.47 - li) * 0.5 : 0;
        const x = cx + (px - cx) * L.s + nx * (L.out + wob), z = cz + (pz - cz) * L.s + nz * (L.out + wob);
        const y = Y0 + L.y + (li > 2 ? Math.sin(px * 0.7 + pz * 0.5) * 0.35 * li * 0.3 : 0);
        pos.push(x, y, z);
        c.set(L.c); const band = li > 2 ? 0.92 + 0.12 * Math.sin(y * 2.3 + px * 0.05) : 1; c.multiplyScalar(band);
        cols.push(c.r, c.g, c.b);
        uvs.push((i === n ? arc + Math.hypot(ring[0][0] - ring[n - 1][0], ring[0][1] - ring[n - 1][1]) : arcs[k]) / TILE.cliff, y / TILE.cliff);
      }
    });
    const rowN = n + 1;
    for (let li = 0; li < levels.length - 1; li++) for (let i = 0; i < n; i++) {
      const a = li * rowN + i, b = a + 1, d = a + rowN, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx); g.computeVertexNormals();
    // check winding: the first ring's normals must face outward
    const nA = g.attributes.normal; const tst = new THREE.Vector3(nA.getX(rowN * 3), 0, nA.getZ(rowN * 3));
    if (tst.x * nrm[0][0] + tst.z * nrm[0][1] < 0) { const I = g.index.array; for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; } g.computeVertexNormals(); }
    mesh(group, g, tm('cliff', { vc: true, rough: 0.95 }), 0, 0, 0, 0, { cast: false });
    // walkable bricks: 1 m strips across the island, 0.4 m inside the edge
    stripBricks(ISL, 0.4, Y0);
    // a few big boulders hanging off the rim
    for (let i = 0; i < 12; i++) {
      const k = Math.floor(r() * n), [px, pz] = ring[k], [nx, nz] = nrm[k];
      if (px < -46 && Math.abs(pz) < 5) continue;
      if (px > 34 && Math.abs(pz) < 8) continue;
      const s = 0.8 + r() * 1.6;
      rimRocks.push({ x: px + nx * (0.2 + r() * 0.6), y: Y0 - 0.6 - r() * 1.2, z: pz + nz * (0.2 + r() * 0.6), ry: r() * 6, s, color: new THREE.Color('#fff0ff').multiplyScalar(0.95 + r() * 0.15) });
    }
  }
  function stripBricks(P, inset, top) {
    let x0 = Infinity, x1 = -Infinity;
    for (const [x] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    for (let x = x0 + inset; x < x1 - inset; x += 1) {
      const xa = x + 0.005, xb = Math.min(x + 1, x1 - inset) - 0.005;
      if (xb - xa < 0.2) continue;
      const A = zIntervals(P, xa), Bz = zIntervals(P, xb), M = zIntervals(P, (xa + xb) / 2);
      for (const [m0, m1] of M) {
        let lo = m0, hi = m1;
        for (const S of [A, Bz]) { const o = S.find(([s0, s1]) => s1 > m0 && s0 < m1); if (!o) { hi = lo; break; } lo = Math.max(lo, o[0]); hi = Math.min(hi, o[1]); }
        lo += inset; hi -= inset;
        if (hi - lo < 0.4) continue;
        col({ type: 'box', x: (xa + xb) / 2, z: (lo + hi) / 2, hw: (xb - xa) / 2 + 0.08, hd: (hi - lo) / 2, rot: 0, top, seeThrough: true });
      }
    }
  }

  // ================================================================ paths: paved street + plaza, dirt tracks to the mills
  function buildPaths() {
    const cobble = tm('cobble', { color: '#f6dcd4', rough: 0.85 });
    const street = [[-49.6, -3.4], [-34, -3.6], [-16, -3.4], [0, -3.6], [16, -3.3], [30, -3.5], [36.2, -2.9], [36.2, 2.9], [30, 3.5], [16, 3.3], [0, 3.6], [-16, 3.4], [-34, 3.6], [-49.6, 3.4]];
    B.add(slabGeo(street, 0.05, TILE.cobble), cobble, 0, Y0, 0);
    const plaza = []; for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; plaza.push([PLAZA.x + Math.sin(a) * PLAZA.r, PLAZA.z + Math.cos(a) * PLAZA.r]); }
    B.add(slabGeo(plaza, 0.065, TILE.cobble), tm('cobble', { color: '#ecd6e4', rough: 0.85 }), 0, Y0, 0);
    // a mosaic star in the plaza
    const star = []; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? 3.2 : 5.6; star.push([PLAZA.x + Math.sin(a) * rr, PLAZA.z + Math.cos(a) * rr]); }
    B.add(slabGeo(star, 0.075, 1.0), tm(tileTex('#3a7ac8', '#e8b84a', '#c84a7a'), { rough: 0.5 }), 0, Y0, 0);
    // kerb ring of the plaza
    B.add(lathe([[PLAZA.r - 0.05, 0], [PLAZA.r + 0.18, 0], [PLAZA.r + 0.18, 0.1], [PLAZA.r - 0.05, 0.1]], 48, 1.2), tm('stone', { color: '#f0e0e8' }), PLAZA.x, Y0, PLAZA.z);
    // depot spur and the drill-platform approach
    B.add(slabGeo([[DEPOT.gate[0] - 0.4, 3], [DEPOT.gate[1] + 0.4, 3], [DEPOT.gate[1] + 0.2, DEPOT.z0 + 0.3], [DEPOT.gate[0] - 0.2, DEPOT.z0 + 0.3]], 0.05, TILE.cobble), cobble, 0, Y0, 0);
    // dirt tracks to the mills
    const dirt = tm('dirt', { color: '#f0d8c8', rough: 0.95 });
    const track = (pts, w) => {
      const L = [], Rr = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz);
        const ww = w * (0.9 + Math.sin(i * 2.1) * 0.12);
        L.push([pts[i][0] - (tz / l) * ww, pts[i][1] + (tx / l) * ww]); Rr.push([pts[i][0] + (tz / l) * ww, pts[i][1] - (tx / l) * ww]);
      }
      B.add(slabGeo(L.concat(Rr.reverse()), 0.035, TILE.dirt), dirt, 0, Y0, 0);
    };
    track([[-4, -3], [-3.6, -8], [-2.8, -12.5], [-2.2, -15.6]], 1.25);
    track([[19, -3], [20.2, -8], [21.4, -12.5], [21.9, -14.2]], 1.2);
    track([[-6.5, 3], [-5.6, 8], [-4.4, 13], [-3.4, 17.2]], 1.2);
    keepClear(-50, -4.2, 37, 4.2);
    keepClear(PLAZA.x - PLAZA.r, PLAZA.z - PLAZA.r, PLAZA.x + PLAZA.r, PLAZA.z + PLAZA.r);
    keepClear(-5.5, -17, -0.5, 3); keepClear(18, -16, 23.5, 3); keepClear(-8.5, 3, -2, 18.5);
  }

  // ================================================================ the sky-ferry pier
  function buildPier() {
    const { x0, x1, hw } = PIER, L = x1 - x0, cxp = (x0 + x1) / 2;
    const planks = tm('planks', { color: '#ecc8a8' });
    B.add(boxUV(bbox(L, 0.24, hw * 2, 0.04, 1), TILE.planks), planks, cxp, Y0 - 0.12, 0);
    // stringers, cross beams and diagonal brass struts down into the cliff
    for (const s of [-1, 1]) B.add(boxUV(bbox(L + 0.2, 0.36, 0.26, 0.04, 1), TILE.teal), tealM(), cxp, Y0 - 0.38, s * (hw - 0.15));
    for (let x = x0 + 0.6; x < x1; x += 2.4) {
      B.add(boxUV(bbox(0.24, 0.3, hw * 2 + 0.2, 0.04, 1), TILE.teal), tealM(), x, Y0 - 0.6, 0);
      for (const s of [-1, 1]) member(B, [x, Y0 - 0.6, s * (hw - 0.2)], [Math.min(x + 6, x1 + 2), Y0 - 6.5, s * (hw - 0.6)], 0.16, brassM(), 1, 0.03);
    }
    // railings with brass rails, a gap on the south side where the ferry ties up
    const rail = (xa, xb, z) => {
      for (let x = xa; x <= xb + 0.01; x += (xb - xa) / Math.max(1, Math.round((xb - xa) / 1.6))) B.add(cached('rpost', () => lathe([[0.07, 0], [0.07, 0.9], [0.1, 0.95], [0.06, 1.05], [0, 1.08]], 8)), tealM(), x, Y0, z);
      B.add(cyl(0.045, 0.045, xb - xa, 6, 1).rotateZ(Math.PI / 2), brassM(), (xa + xb) / 2, Y0 + 1.0, z);
      B.add(cyl(0.03, 0.03, xb - xa, 6, 1).rotateZ(Math.PI / 2), brassM(), (xa + xb) / 2, Y0 + 0.55, z);
      col({ type: 'box', x: (xa + xb) / 2, z, hw: (xb - xa) / 2, hd: 0.1, rot: 0, top: Y0 + 1.05, noStand: true, seeThrough: true });
    };
    rail(x0 + 0.1, x1 - 0.3, -hw + 0.08);
    rail(x0 + 0.1, -61.8, hw - 0.08);
    rail(-53.4, x1 - 0.3, hw - 0.08);
    // end of the pier: a railing across and a brass lamp
    B.add(cyl(0.045, 0.045, hw * 2, 6, 1).rotateX(Math.PI / 2), brassM(), x0 + 0.1, Y0 + 1.0, 0);
    for (let z = -hw + 0.1; z <= hw; z += 1.1) B.add(cached('rpost', () => lathe([[0.07, 0], [0.07, 0.9], [0.1, 0.95], [0.06, 1.05], [0, 1.08]], 8)), tealM(), x0 + 0.1, Y0, z);
    col({ type: 'box', x: x0 + 0.1, z: 0, hw: 0.1, hd: hw, rot: 0, top: Y0 + 1.05, noStand: true, seeThrough: true });
    // mooring bollards at the gap and a coiled rope
    for (const x of [-61.2, -54.0]) {
      B.add(lathe([[0.2, 0], [0.2, 0.32], [0.14, 0.38], [0.14, 0.5], [0.24, 0.56], [0.22, 0.64], [0, 0.66]], 14), darkSteel(), x, Y0, hw - 0.35);
      col({ type: 'cyl', x, z: hw - 0.35, r: 0.25, top: Y0 + 0.66, noStand: true, seeThrough: true });
    }
    B.add(cached('coil', () => compose([0, 1, 2, 3].map((k) => [new THREE.TorusGeometry(0.32 - k * 0.05, 0.045, 6, 18).rotateX(Math.PI / 2), 0, 0.05 + k * 0.07, 0]))), pm('#c8a878', 0.9), -55.4, Y0, -1.4);
    // cargo by the pier root
    techCrates([[-51.6, -1.5, 2, 0.9], [-52.6, -1.6, 1, 0.8]]);
    // walkable deck
    col({ type: 'box', x: cxp, z: 0, hw: L / 2, hd: hw - 0.15, rot: 0, top: Y0, seeThrough: true });
    lamps.push([-62.8, -hw + 0.35], [-56, -hw + 0.35], [-51, hw - 0.35]);
    keepClear(-64, -4, -46, 4);
  }

  // Zeelich-tech cargo crates: teal steel, brass corners and the glowing emblem
  function techCrates(list) {
    const C = cached('techcrate', () => {
      const s = 1.0, h = s / 2, corners = [];
      for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (const yy of [0.06, s - 0.06]) corners.push([bbox(0.2, 0.14, 0.2, 0.03, 0.5), a * (h - 0.08), yy, b * (h - 0.08)]);
      for (const yy of [0.33, 0.66]) corners.push([bbox(s + 0.03, 0.05, s + 0.03, 0.015, 1), 0, yy, 0]);
      return { body: bbox(s - 0.02, s - 0.02, s - 0.02, 0.05, 1.1).clone().translate(0, h, 0), brass: compose(corners) };
    });
    const items = [], em = [];
    for (const [x, z, n = 1, s = 1] of list) {
      const ry = (r() - 0.5) * 0.6;
      for (let k = 0; k < n; k++) items.push({ x, y: Y0 + k * s, z, ry: ry + (r() - 0.5) * 0.15, s });
      em.push({ x: x + Math.sin(ry) * (s / 2 + 0.012), y: Y0 + s * 0.55, z: z + Math.cos(ry) * (s / 2 + 0.012), ry, s: s * 0.62 });
      col({ type: 'box', x, z, hw: s / 2, hd: s / 2, rot: ry, top: Y0 + n * s, seeThrough: n * s < 1.6 });
    }
    instances(group, C.body, tealM(), items);
    instances(group, C.brass, brassM(), items);
    instances(group, emq(), emblemMaterial(), em, { cast: false });
  }

  // ================================================================ the Joint Project sky-ferry
  function buildFerry() {
    const grp = new THREE.Group(); grp.position.set(FERRY.x, Y0 - 1.05, FERRY.z); group.add(grp);
    const bob = new THREE.Group(); grp.add(bob);
    const L = 12.0, Bm = 4.0, H0 = 1.25;
    const hb = (u) => (u < 0.55 ? (Bm / 2) * lerp(0.78, 1, smoothstep(0, 0.45, u)) : (Bm / 2) * Math.pow(Math.max(0, Math.cos(((u - 0.55) / 0.45) * Math.PI / 2)), 0.75));
    const dep = (u) => 1.9 * (0.82 + 0.18 * Math.sin(Math.PI * Math.min(1, u * 1.1)));
    const topf = (u) => 0.45 * Math.pow(Math.abs(2 * u - 1), 2) * (u > 0.5 ? 1.6 : 0.5);
    const hull = cached('skyhull', () => {
      const P = [], C = [], UV = [], I = [], nu = 30, nv = 14, cc = new THREE.Color();
      for (let i = 0; i <= nu; i++) {
        const u = i / nu, w = Math.max(0.001, hb(u)), d = dep(u), y0 = topf(u);
        for (let j = 0; j <= nv; j++) {
          const v = -1 + (2 * j) / nv, a = (v * Math.PI) / 2;
          const x = L * (u - 0.5), y = y0 - d * Math.pow(Math.cos(a), 0.85), z = w * Math.sin(a);
          P.push(x, y, z); UV.push(x / 2.2, (v * (w + d)) / 2.2);
          cc.set(y > -0.3 ? (y > -0.12 ? '#e8c060' : '#c89a48') : y > -0.75 ? '#2f8c8a' : y > -0.9 ? '#f0e8d8' : '#8a86a8'); C.push(cc.r, cc.g, cc.b);
        }
      }
      for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
      const ci = P.length / 3; P.push(-L / 2, -0.4, 0); UV.push(0, 0); cc.set('#2f8c8a'); C.push(cc.r, cc.g, cc.b);
      for (let j = 0; j < nv; j++) I.push(ci, j + 1, j);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
      g.setIndex(I); g.computeVertexNormals();
      return g;
    });
    const FB = new Batch(bob);
    FB.add(hull, tm('teal', { vc: true, rough: 0.5, metal: 0.25 }), 0, H0, 0);
    const deckY = H0 - 0.05;
    { const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push([L * (u - 0.5), Math.max(0.02, hb(u) - 0.12)]); } for (let i = 20; i >= 0; i--) pts.push([pts[i][0], -pts[i][1]]); FB.add(slabGeo(pts.map(([a, b]) => [a, b]), 0.12, TILE.deck), tm('deck', { color: '#d4c8dc', rough: 0.7, metal: 0.2 }), 0, deckY, 0); }
    const white = tm('concrete', { color: '#f6f0ec', rough: 0.6 });
    // cabin with portholes and a brass roof, wheelhouse, keel fin
    FB.add(bbox(4.6, 1.8, 2.8, 0.14, 2), white, -1.4, deckY + 0.9, 0);
    FB.add(boxUV(bbox(4.9, 0.16, 3.1, 0.06, 1), 1.5), brassM(), -1.4, deckY + 1.86, 0);
    FB.add(bbox(4.65, 0.3, 2.85, 0.04, 1), tealM(), -1.4, deckY + 0.15, 0);
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      FB.add(cached('port', () => new THREE.TorusGeometry(0.2, 0.05, 8, 18)), brassM(), -2.8 + i * 1.3, deckY + 1.05, s * 1.42, 0, s > 0 ? 0 : Math.PI, 0);
      FB.add(cached('portg', () => new THREE.CircleGeometry(0.18, 16)), pm('#a8f0ff', 0.15, { emissive: '#3ad0ff', emissiveIntensity: 0.6 }), -2.8 + i * 1.3, deckY + 1.05, s * 1.415, 0, s > 0 ? 0 : Math.PI, 0);
    }
    FB.add(bbox(2.0, 1.3, 2.2, 0.1, 2), white, -0.6, deckY + 2.55, 0);
    FB.add(boxUV(bbox(2.3, 0.16, 2.5, 0.06, 1), 1.5), brassM(), -0.6, deckY + 3.25, 0);
    FB.add(bbox(0.05, 0.55, 1.8, 0.02, 1), pm('#2a5a70', 0.1, { metalness: 0.4, emissive: '#2a9ac0', emissiveIntensity: 0.3 }), 0.41, deckY + 2.7, 0);
    FB.add(boxUV(bbox(3.4, 1.0, 0.16, 0.06, 1), 1.5), tealM(), -1.0, -0.95, 0);
    // engine pods on outriggers with propellers
    const props = [];
    for (const s of [-1, 1]) {
      member(FB, [-2.4, deckY + 0.6, s * 1.7], [-2.4, deckY + 0.9, s * 3.1], 0.18, brassM(), 1, 0.04);
      member(FB, [0.4, deckY + 0.6, s * 1.6], [-1.9, deckY + 0.9, s * 3.1], 0.12, brassM(), 1, 0.03);
      FB.add(lathe([[0, 0], [0.35, 0.2], [0.48, 0.6], [0.5, 1.7], [0.42, 2.3], [0.2, 2.6], [0, 2.65]], 16, 1.2), tealM(), -1.2, deckY + 0.9, s * 3.25, 0, 0, Math.PI / 2);
      FB.add(cached('podband', () => new THREE.TorusGeometry(0.5, 0.06, 6, 20).rotateY(Math.PI / 2)), brassM(), -2.2, deckY + 0.9, s * 3.25);
      const pv = new THREE.Group(); pv.position.set(-3.95, deckY + 0.9, s * 3.25); bob.add(pv);
      const blades = cached('prop', () => compose([0, 1, 2, 3].map((k) => [bbox(0.08, 1.5, 0.22, 0.03, 1), 0, 0, 0, (k * Math.PI) / 4 * 0 + 0.3, 0, (k * Math.PI) / 2]).concat([[new THREE.SphereGeometry(0.16, 10, 8)]])));
      mesh(pv, blades, brassM());
      props.push(pv);
    }
    // gas envelope above, striped gores, rigging to the hull
    const env = cached('envelope', () => {
      const g = lathe([[0, -2.0], [0.9, -1.85], [1.6, -1.3], [1.95, -0.4], [2.0, 0.4], [1.8, 1.4], [1.3, 2.3], [0.7, 2.9], [0, 3.2]], 24);
      const c = [], p = g.attributes.position, cc = new THREE.Color();
      for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getX(i), p.getZ(i)); cc.set(Math.floor(((a + Math.PI) / (Math.PI * 2)) * 12) % 2 ? '#f4ece4' : '#3a9a9c'); c.push(cc.r, cc.g, cc.b); }
      g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
      g.rotateZ(-Math.PI / 2);
      return g;
    });
    FB.add(env, VC(), -0.8, deckY + 6.6, 0, 0, 0, 0, 1.6, 1, 1);
    FB.add(cached('envband', () => new THREE.TorusGeometry(2.03, 0.08, 6, 30).rotateY(Math.PI / 2)), brassM(), -0.8, deckY + 6.6, 0);
    FB.add(boxUV(bbox(1.4, 1.1, 0.12, 0.04, 1), 1), tealM(), -4.6, deckY + 6.6, 0);
    for (const [ax, az] of [[-3.6, -1.2], [-3.6, 1.2], [1.6, -1.2], [1.6, 1.2], [-1, -1.3], [-1, 1.3]]) rod(FB, [ax, deckY + 1.9, az], [ax * 0.95 - 0.2, deckY + 5.0, az * 1.3], 0.025, darkSteel(), 5);
    FB.add(emq(), emblemMaterial(), -0.8, deckY + 6.6, 2.05, 0, 0, 0, 1.4);
    FB.add(emq(), emblemMaterial(), -0.8, deckY + 6.6, -2.05, 0, Math.PI, 0, 1.4);
    // bow lamp and gangway
    rod(FB, [4.5, deckY + 0.4, 0], [4.7, deckY + 2.4, 0], 0.06, brassM());
    FB.add(cached('glb', () => new THREE.SphereGeometry(0.13, 12, 8)), glowCyan(), 4.72, deckY + 2.5, 0);
    FB.add(boxUV(bbox(1.0, 0.07, 1.6, 0.02, 1), TILE.planks), tm('planks', { color: '#d8c0a0' }), 2.0, deckY + 0.08, -2.3, 0.06);
    FB.build();
    // mooring ropes to the bollards
    const rope = pm('#c8a878', 0.9);
    for (const [bx, fx] of [[-61.2, -4.5], [-54.0, 3.2]]) mesh(group, tube([[bx, Y0 + 0.55, PIER.hw - 0.35], [(bx + FERRY.x + fx) / 2, Y0 + 0.1, (PIER.hw + FERRY.z - 1.7) / 2], [FERRY.x + fx, Y0 + 0.35, FERRY.z - 1.75]], 0.035, 5, 1), rope);
    updaters.push((dt, t) => {
      if (!grp.visible) return;
      bob.position.y = Math.sin(t * 0.8) * 0.12;
      bob.rotation.x = Math.sin(t * 0.6) * 0.02;
      for (const p of props) p.rotation.x += dt * 9;
    });
    return { group: grp, ...W(FERRY.x, FERRY.z), setVisible(b) { grp.visible = b; } };
  }

  // ================================================================ horseshoe gateway at the pier root
  function buildGateway() {
    const x = -47.2, half = 4.6, H = 5.6;
    const G = new THREE.Group(); G.position.set(x, Y0, 0); G.rotation.y = Math.PI / 2; group.add(G);
    const GB = new Batch(G);
    const o = { x: 0, y: 0.02, w: 5.0, h: 4.6, horse: true };
    GB.add(panelGeo(half * 2 + 1.0, H, 0.9, [o]), tm('plasterWall', { color: '#fbf0f0' }), 0, 0, -0.45);
    GB.add(frameGeo(o, 0.38, 1.0, 1), tm(tileTex(), { rough: 0.5 }), 0, 0, -0.5);
    // alfiz (rectangular frame around the arch), cornice, merlons, brass finials
    const trim = tm('stone', { color: '#d8a8c8' });
    for (const s of [-1, 1]) GB.add(bbox(0.22, 4.9, 0.14, 0.03, 1), trim, s * 3.05, 2.45, 0.5);
    GB.add(bbox(6.32, 0.22, 0.14, 0.03, 1), trim, 0, 4.95, 0.5);
    GB.add(bbox(6.32, 0.22, 0.14, 0.03, 1), trim, 0, 4.95, -0.5);
    for (const s of [-1, 1]) GB.add(bbox(0.22, 4.9, 0.14, 0.03, 1), trim, s * 3.05, 2.45, -0.5);
    GB.add(boxUV(bbox(half * 2 + 1.5, 0.3, 1.4, 0.06, 1), 1.6), tm('stone', { color: '#f4e8ee' }), 0, H + 0.12, 0);
    const merlon = cached('merlon', () => { const s = new THREE.Shape(); s.moveTo(-0.3, 0); s.lineTo(0.3, 0); s.lineTo(0.3, 0.3); s.quadraticCurveTo(0.3, 0.62, 0, 0.72); s.quadraticCurveTo(-0.3, 0.62, -0.3, 0.3); s.lineTo(-0.3, 0); return boxUV(new THREE.ExtrudeGeometry(s, { depth: 0.36, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1, curveSegments: 6 }), 1); });
    for (let i = -3; i <= 3; i++) GB.add(merlon, tm('plasterWall', { color: '#fbf0f0' }), i * 0.85, H + 0.27, -0.18);
    for (const s of [-1, 1]) {
      GB.add(lathe([[0.55, 0], [0.55, 0.3], [0.45, 0.4], [0.45, H + 0.6], [0.6, H + 0.75], [0.6, H + 0.95], [0, H + 0.95]], 16, 1.6), tm('plasterWall', { color: '#ead8f0' }), s * (half + 0.4), 0, 0);
      GB.add(lathe([[0, 0], [0.42, 0.05], [0.5, 0.35], [0.38, 0.7], [0.15, 1.0], [0.03, 1.35], [0, 1.4]], 16, 1.0), tm(domeTex('#3a9aa0', '#b0fff0'), { rough: 0.4 }), s * (half + 0.4), H + 0.95, 0);
      GB.add(lathe([[0, 0], [0.06, 0], [0.06, 0.25], [0.12, 0.32], [0.03, 0.45], [0.02, 0.8], [0, 0.82]], 8), brassM(), s * (half + 0.4), H + 2.3, 0);
    }
    GB.build();
    for (const s of [-1, 1]) col({ type: 'box', x, z: s * (2.5 + 1.6), hw: 0.5, hd: 1.6, rot: 0, top: Y0 + H + 0.4 });
    keepClear(x - 1.2, -6, x + 1.2, 6);
  }

  // ================================================================ an Esmer house
  function esmerHouse(o) {
    const rr = rng(o.seed * 131 + 7);
    const G = new THREE.Group(); G.position.set(o.x, Y0, o.z); G.rotation.y = o.ry; group.add(G);
    const HB = new Batch(G);
    const { w, d, h } = o, t = 0.32, base = 0.32;
    const wallM = tm('plasterWall', { color: o.wall });
    const stoneM = tm('stone', { color: '#e8d8ea' });
    const tiles = tm(tileTex(o.trim, '#e8b84a', o.workshop ? '#e07a3a' : '#d8608a'), { rough: 0.45 });
    const trimM = tm('plasterWall', { color: o.trim });
    const f = frame(o.x, o.z, o.ry);
    // plinth
    HB.add(bbox(w + 0.4, base + 0.12, d + 0.4, 0.05, TILE.stone), stoneM, 0, base / 2 - 0.06, 0);
    // openings
    const doorX = o.doorX ?? 0;
    const door = { x: doorX, y: 0.02, w: 1.25, h: 2.45, horse: true, door: true };
    const holes = { front: [door], back: [], left: [], right: [] };
    const winY = 1.15;
    const addWin = (side, x, ww = 0.82, hh = 1.25) => holes[side].push({ x, y: winY, w: ww, h: hh, horse: true });
    if (o.workshop) {
      holes.front.push({ x: doorX + 2.6, y: 0.95, w: 1.9, h: 1.9, round: true, big: true });
      addWin('left', 0); addWin('right', -0.8); addWin('back', 1.5);
    } else {
      for (const xx of [doorX - 1.9, doorX + 1.9]) if (Math.abs(xx) < w / 2 - 0.7) addWin('front', xx);
      if (w > 7) addWin('front', doorX + 3.1 * Math.sign(doorX + 0.1) * -1);
      addWin('left', 0); addWin('right', 0.3); addWin('back', -0.9); addWin('back', 1.2);
    }
    const sides = [
      { n: 'front', len: w, pos: [0, base, d / 2 - t], ry: 0 },
      { n: 'back', len: w, pos: [0, base, -d / 2 + t], ry: Math.PI },
      { n: 'left', len: d - 2 * t, pos: [-w / 2 + t, base, 0], ry: -Math.PI / 2 },
      { n: 'right', len: d - 2 * t, pos: [w / 2 - t, base, 0], ry: Math.PI / 2 },
    ];
    const lattice = tm(latticeTex(), { rough: 0.4, emissive: '#3a2a50', ei: 0.4 });
    const doorM = tm('planks', { color: o.workshop ? '#b8e0d8' : '#c8906a', rough: 0.8 });
    for (const sd of sides) {
      const m4 = new THREE.Matrix4().compose(new THREE.Vector3(...sd.pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, sd.ry, 0)), new THREE.Vector3(1, 1, 1));
      HB.addM(panelGeo(+sd.len.toFixed(3), h - base, t, holes[sd.n]), wallM, m4);
      const at = (lx, ly, lz, ry = 0) => new THREE.Matrix4().compose(new THREE.Vector3(lx, ly, lz).applyMatrix4(m4), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, sd.ry + ry, 0)), new THREE.Vector3(1, 1, 1));
      for (const op of holes[sd.n]) {
        if (op.round) {
          // Baldino's big round workshop window: brass ring, spokes, warm lit glass
          const cy = op.y + op.h / 2;
          HB.addM(cached('bigring', () => new THREE.TorusGeometry(op.w / 2 + 0.06, 0.12, 10, 36)), brassM(), at(op.x, cy, t + 0.04));
          for (let k = 0; k < 4; k++) HB.addM(cached('spoke', () => bbox(op.w, 0.07, 0.07, 0.02, 1)), brassM(), new THREE.Matrix4().multiplyMatrices(at(op.x, cy, t * 0.5), new THREE.Matrix4().makeRotationZ((k * Math.PI) / 4)));
          HB.addM(cached('bigglass', () => new THREE.CircleGeometry(op.w / 2 + 0.02, 28)), pm('#ffd890', 0.2, { emissive: '#ffb050', emissiveIntensity: 0.9 }), at(op.x, cy, t * 0.35));
          for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; HB.addM(cached('rivb', () => new THREE.SphereGeometry(0.045, 6, 4)), brassM(), at(op.x + Math.cos(a) * (op.w / 2 + 0.06), cy + Math.sin(a) * (op.w / 2 + 0.06), t + 0.14)); }
          continue;
        }
        HB.addM(frameGeo(op, op.door ? 0.2 : 0.13, 0.1), op.door ? tiles : trimM, at(0, 0, t - 0.02));
        if (op.door) {
          // recessed plank door with brass studs, alfiz frame, a lantern
          HB.addM(fillGeo(op, 0.05, 0.08, 0.6), doorM, at(0, 0, t * 0.3));
          for (let k = 0; k < 10; k++) HB.addM(cached('stud', () => new THREE.SphereGeometry(0.035, 6, 4)), brassM(), at(op.x + ((k % 2) - 0.5) * 0.7, 0.3 + Math.floor(k / 2) * 0.42, t * 0.3 + 0.1));
          HB.addM(cached('dring', () => new THREE.TorusGeometry(0.08, 0.018, 6, 14)), brassM(), at(op.x + 0.32, 1.1, t * 0.3 + 0.12));
          const aw = op.w + 0.9, ah = op.h + 0.55;
          for (const s of [-1, 1]) HB.addM(bbox(0.14, ah, 0.08, 0.02, 1), trimM, at(op.x + s * aw / 2, ah / 2, t + 0.03));
          HB.addM(bbox(aw + 0.14, 0.14, 0.08, 0.02, 1), trimM, at(op.x, ah, t + 0.03));
          HB.addM(boxUV(bbox(1.9, 0.14, 0.7, 0.03, 1), 1), stoneM, at(op.x, -base + 0.07, t + 0.35));
        } else {
          HB.addM(fillGeo(op, 0.05, 0, 0.5), lattice, at(0, 0, t * 0.45));
          HB.addM(bbox(op.w + 0.35, 0.09, 0.26, 0.02, 1), stoneM, at(op.x, op.y - 0.04, t + 0.06));
          // flower box under some windows
          if (rr() < 0.55) {
            HB.addM(boxUV(bbox(op.w + 0.1, 0.2, 0.22, 0.03, 1), 1), tiles, at(op.x, op.y - 0.2, t + 0.16));
            for (let k = 0; k < 5; k++) HB.addM(cached('fl' + (k % 3), () => tint(new THREE.IcosahedronGeometry(0.075, 0), ['#ff6fa3', '#ffd84a', '#b28cff'][k % 3])), VC(), at(op.x - op.w / 2 + 0.1 + (k / 4) * (op.w - 0.2), op.y - 0.04, t + 0.18 + (k % 2) * 0.05));
          }
        }
      }
    }
    // rounded corner piers with knobs
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      HB.add(lathe([[0.36, 0], [0.36, 0.4], [0.3, 0.5], [0.28, h + 0.5], [0.36, h + 0.6], [0.36, h + 0.78], [0.2, h + 0.85], [0, h + 0.85]], 14, TILE.plaster), wallM, sx * (w / 2 - 0.04), 0, sz * (d / 2 - 0.04));
      HB.add(cached('knob', () => lathe([[0, 0], [0.16, 0.05], [0.19, 0.18], [0.1, 0.32], [0.03, 0.42], [0.02, 0.6], [0, 0.62]], 10)), brassM(), sx * (w / 2 - 0.04), h + 0.85, sz * (d / 2 - 0.04));
    }
    // tiled frieze, cornice, scalloped parapet, roof
    for (const [len, x, z, ry] of [[w - 0.5, 0, d / 2 + 0.005, 0], [w - 0.5, 0, -d / 2 - 0.005, Math.PI], [d - 0.5, -w / 2 - 0.005, 0, -Math.PI / 2], [d - 0.5, w / 2 + 0.005, 0, Math.PI / 2]]) {
      HB.add(boxUV(bbox(len, 0.42, 0.06, 0.01, 1), TILE.tiles), tiles, x + Math.sin(ry) * 0.02, h - 0.45, z + Math.cos(ry) * 0.02, 0, ry, 0);
    }
    HB.add(boxUV(bbox(w + 0.5, 0.18, d + 0.5, 0.06, 1), TILE.stone), stoneM, 0, h - 0.12, 0);
    HB.add(boxUV(bbox(w + 0.1, 0.14, d + 0.1, 0.03, 1), 1.6), tm('concrete', { color: '#e6d8d0' }), 0, h - 0.1, 0);
    const merlon = cached('hmerlon', () => { const s = new THREE.Shape(); s.moveTo(-0.22, 0); s.lineTo(0.22, 0); s.lineTo(0.22, 0.18); s.quadraticCurveTo(0.22, 0.42, 0, 0.5); s.quadraticCurveTo(-0.22, 0.42, -0.22, 0.18); s.lineTo(-0.22, 0); return boxUV(new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1, curveSegments: 5 }), 1); });
    for (const [len, z, ry] of [[w, d / 2, 0], [w, -d / 2, Math.PI], [d, w / 2, Math.PI / 2], [d, -w / 2, -Math.PI / 2]]) {
      const nn = Math.floor((len - 0.9) / 0.62);
      for (let i = 0; i < nn; i++) {
        const lx = -((nn - 1) * 0.62) / 2 + i * 0.62;
        const [px, pz] = ry === 0 || ry === Math.PI ? [lx, z - Math.cos(ry) * 0.12] : [z - Math.sin(ry) * 0.12, lx];
        HB.add(merlon, wallM, px, h, pz, 0, ry, 0);
      }
    }
    // the dome (or Baldino's observatory) on a drum
    const dr = Math.min(w, d) * 0.3, dx = o.workshop ? -w * 0.18 : (rr() - 0.5) * 0.6, dz = o.workshop ? -0.4 : -0.2;
    HB.add(lathe([[dr + 0.08, 0], [dr + 0.08, 0.15], [dr, 0.2], [dr, 0.95], [dr + 0.12, 1.0], [dr + 0.12, 1.12], [0, 1.12]], 24, TILE.plaster), wallM, dx, h, dz);
    HB.add(cyl(dr + 0.01, dr + 0.01, 0.3, 24, 1, true), tiles, dx, h + 0.55, dz);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; HB.add(fillGeo({ x: 0, y: 0, w: 0.2, h: 0.36, horse: true }, 0, 0, 0.5), lattice, dx + Math.sin(a) * (dr + 0.012), h + 0.36, dz + Math.cos(a) * (dr + 0.012), 0, a, 0); }
    const R0 = dr * 1.02;
    let domeTop;
    if (o.workshop) {
      // brass observatory half-dome with ribs, a slot and a telescope
      HB.add(lathe([[R0, 0], [R0 * 0.98, R0 * 0.25], [R0 * 0.88, R0 * 0.5], [R0 * 0.68, R0 * 0.75], [R0 * 0.38, R0 * 0.93], [0, R0]], 24, 1.2), tm('brass', { rough: 0.42, metal: 0.65, color: '#e8d0a0' }), dx, h + 1.12, dz);
      for (let k = 0; k < 8; k++) HB.add(cached('obsrib' + R0, () => { const pts = []; for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI / 2; pts.push([0, Math.sin(a) * (R0 + 0.03), Math.cos(a) * (R0 + 0.03)]); } return tube(pts, 0.04, 5, 1); }), tealM(), dx, h + 1.12, dz, 0, (k * Math.PI) / 4, 0);
      HB.add(bbox(0.4, R0 * 0.9, 0.3, 0.05, 1), darkSteel(), dx, h + 1.12 + R0 * 0.55, dz + R0 * 0.75, -0.6, 0, 0);
      HB.add(cyl(0.12, 0.17, 1.9, 12, 1), brassM(), dx, h + 1.12 + R0 * 1.0, dz + R0 * 0.9, 0.95, 0, 0);
      domeTop = h + 1.12 + R0;
    } else {
      const [ca, cb] = o.dome;
      HB.add(lathe([[R0, 0], [R0 * 1.12, R0 * 0.25], [R0 * 1.16, R0 * 0.5], [R0 * 1.06, R0 * 0.82], [R0 * 0.78, R0 * 1.14], [R0 * 0.42, R0 * 1.42], [R0 * 0.16, R0 * 1.68], [0.04, R0 * 1.95]], 28, 1.1), tm(domeTex(ca, cb), { rough: 0.38, metal: 0.1 }), dx, h + 1.12, dz);
      domeTop = h + 1.12 + R0 * 1.95;
      HB.add(cached('finial', () => compose([[lathe([[0, 0], [0.07, 0], [0.07, 0.12], [0.16, 0.22], [0.16, 0.3], [0.06, 0.38], [0.04, 0.55], [0.11, 0.62], [0.11, 0.7], [0.03, 0.78], [0.015, 1.05], [0, 1.08]], 10)], [new THREE.TorusGeometry(0.16, 0.035, 6, 14, Math.PI * 1.4), 0, 1.12, 0, 0, 0, -Math.PI * 0.2]])), brassM(), dx, domeTop - 0.06, dz);
    }
    // minaret: slender tower with a balcony and a small onion cap
    if (o.minaret) {
      const mx = o.minaret * (w / 2 + 0.55), mz = -d / 2 + 0.6, mh = h + 4.6;
      HB.add(lathe([[0.75, 0], [0.75, 0.4], [0.62, 0.5], [0.55, mh - 1.4], [0.68, mh - 1.3], [0.68, mh - 1.18], [0.5, mh - 1.15], [0.5, mh], [0, mh]], 16, TILE.plaster), wallM, mx, 0, mz);
      HB.add(cyl(0.56, 0.56, 0.36, 16, 1, true), tiles, mx, h * 0.6, mz);
      HB.add(lathe([[0.5, 0], [1.0, 0.0], [1.0, 0.18], [0.5, 0.25]], 18, 1.2), stoneM, mx, mh - 1.95, mz);
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; HB.add(cached('bal', () => lathe([[0.04, 0], [0.06, 0.1], [0.035, 0.3], [0.05, 0.5], [0.03, 0.55]], 6)), stoneM, mx + Math.sin(a) * 0.92, mh - 1.77, mz + Math.cos(a) * 0.92); }
      HB.add(cached('balr', () => new THREE.TorusGeometry(0.92, 0.04, 6, 24).rotateX(Math.PI / 2)), brassM(), mx, mh - 1.2, mz);
      for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; HB.add(fillGeo({ x: 0, y: 0, w: 0.26, h: 0.62, horse: true }, 0, 0, 0.5), lattice, mx + Math.sin(a) * 0.505, mh - 0.95, mz + Math.cos(a) * 0.505, 0, a, 0); }
      const [ca, cb] = o.dome;
      HB.add(lathe([[0.55, 0], [0.66, 0.2], [0.62, 0.45], [0.42, 0.75], [0.18, 1.0], [0.03, 1.3]], 16, 0.9), tm(domeTex(ca, cb), { rough: 0.38 }), mx, mh, mz);
      HB.add(cached('mfin', () => lathe([[0, 0], [0.05, 0], [0.09, 0.12], [0.04, 0.22], [0.015, 0.6], [0, 0.62]], 8)), brassM(), mx, mh + 1.25, mz);
      col({ ...wpos(f, mx, mz), type: 'cyl', r: 0.78, top: Y0 + mh, fades: true });
    }
    // arcade porch in front
    let arcadeDepth = 0;
    if (o.arcade) {
      arcadeDepth = 2.1;
      const n = o.arcade, len = w - 0.3, ph = h - 0.9, pierW = 0.55, ow = (len - (n + 1) * pierW) / n;
      const arcs = []; for (let i = 0; i < n; i++) arcs.push({ x: -len / 2 + pierW + ow / 2 + i * (ow + pierW), y: 0.0, w: ow, h: ph - 0.75, horse: true });
      const az = d / 2 + arcadeDepth;
      HB.add(panelGeo(len, ph, 0.38, arcs), wallM, 0, -0.04, az - 0.38);
      for (const a of arcs) HB.add(frameGeo(a, 0.14, 0.06), tiles, 0, -0.04, az - 0.02);
      HB.add(boxUV(bbox(len + 0.3, 0.22, arcadeDepth + 0.3, 0.05, 1), 1.6), stoneM, 0, ph - 0.11, d / 2 + arcadeDepth / 2);
      HB.add(boxUV(bbox(len, 0.34, 0.05, 0.01, 1), TILE.tiles), tiles, 0, ph - 0.45, az + 0.02);
      for (let i = 0; i <= n; i++) {
        const px = -len / 2 + pierW / 2 + i * (ow + pierW);
        col({ ...wpos(f, px, az - 0.19), type: 'box', hw: pierW / 2 + 0.02, hd: 0.22, rot: o.ry, top: Y0 + ph, fades: true });
        HB.add(cached('pcap', () => bbox(0.7, 0.16, 0.5, 0.03, 1)), stoneM, px, ph - 0.85, az - 0.19);
      }
      HB.add(boxUV(bbox(len + 0.1, 0.12, arcadeDepth, 0.02, 1), TILE.cobble), tm('cobble', { color: '#f0d8e0' }), 0, 0.03, d / 2 + arcadeDepth / 2);
      // a rug drying over the arcade parapet
      HB.add(cached('rugq', () => new THREE.PlaneGeometry(1.5, 1.1)), pm('#ffffff', 0.95, { map: rugTex(['#a8304a', '#2a4a8a', '#e8b84a', '#f4e6c8', '#3a2030'], 4), side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }), len / 2 - 1.3, ph - 0.62, az + 0.06, 0, 0, Math.PI / 2);
    }
    // awning over a window and a wall lantern by the door
    {
      const ax = doorX + (o.workshop ? -2.1 : 1.9) * (doorX > 0.5 ? -1 : 1);
      if (!o.arcade && Math.abs(ax) < w / 2 - 0.6) {
        const aw = cached('awn', () => { const s = new THREE.Shape(); s.moveTo(-0.65, 0); s.lineTo(0.65, 0); s.lineTo(0.65, 0.05); s.lineTo(-0.65, 0.05); s.lineTo(-0.65, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 0.9, bevelEnabled: false }); g.rotateX(-0.55); return boxUV(g, 0.5); });
        const awc = [['#e8608a', '#f8eee4'], ['#3a9aa0', '#f8eee4'], ['#e8b84a', '#f8eee4']][o.seed % 3];
        HB.add(aw, tm(stripeTex(...awc), { rough: 0.9, side: THREE.DoubleSide }), ax, winY + 1.75, d / 2 + 0.02);
      }
      const lx = doorX + (doorX > 0.5 ? -1.05 : 1.05) * (o.workshop ? -1 : 1);
      HB.add(cached('wlamp', () => compose([[bbox(0.08, 0.08, 0.36, 0.02, 1), 0, 0, 0.18], [cyl(0.015, 0.015, 0.2, 5), 0, -0.1, 0.34]])), brassM(), lx, 2.55, d / 2 + arcadeDepth + 0.02);
      HB.add(cached('wlampg', () => lathe([[0, 0], [0.1, 0.03], [0.13, 0.15], [0.1, 0.27], [0.03, 0.31], [0, 0.31]], 10)), pm('#ffe0f0', 0.3, { emissive: '#ffb8d8', emissiveIntensity: 1.6 }), lx, 2.06, d / 2 + arcadeDepth + 0.36);
      HB.add(cached('wlampc', () => lathe([[0, 0], [0.13, 0], [0.09, 0.1], [0.03, 0.18], [0.01, 0.26], [0, 0.26]], 10)), brassM(), lx, 2.36, d / 2 + arcadeDepth + 0.36);
    }
    let out = {};
    if (o.workshop) out = workshopClutter(HB, G, o, f, tiles);
    HB.build();
    // collider (fades rather than pushing the camera) and the fader box
    col({ ...wpos(f, 0, 0), type: 'box', hw: w / 2 + 0.25, hd: d / 2 + 0.25, rot: o.ry, top: Y0 + h + 1.0, fades: true });
    for (const [sx, sz] of [[-1, 1], [1, 1]]) col({ ...wpos(f, sx * (w / 2 - 0.04), sz * (d / 2 - 0.04)), type: 'cyl', r: 0.4, top: Y0 + h + 0.8, fades: true });
    const ext = Math.max(w, d) / 2 + 0.6 + (o.minaret ? 1.4 : 0) + arcadeDepth;
    const fader = makeFader(G, o.x - ext, o.z - ext, o.x + ext, o.z + ext, Y0 + Math.max(domeTop, h + (o.minaret ? 6 : 1)) + 0.5);
    keepClear(o.x - ext - 0.6, o.z - ext - 0.6, o.x + ext + 0.6, o.z + ext + 0.6);
    const doorW = f(doorX, d / 2 + arcadeDepth + 0.75);
    // (where the dome sits, for the scaffold of the one being re-tiled: zeelife.js; houses facing south only)
    const dome = o.workshop || o.ry ? null : { x: o.x + dx, z: o.z + dz, y: Y0 + h + 1.12, R0, roof: Y0 + h, front: o.z + d / 2 };
    return { group: G, door: doorW, fader, dome, ...out };
  }
  function wpos(f, lx, lz) { const [x, z] = f(lx, lz); return { x, z }; }
  function makeFader(G, x0, z0, x1, z1, top) {
    const mats = new Map();
    G.traverse((m) => {
      if (!m.isMesh) return;
      const list = Array.isArray(m.material) ? m.material : [m.material];
      const out = list.map((mm) => { if (!mats.has(mm)) { const c = mm.clone(); if (c.transparent) { c.userData.alwaysTransparent = true; c.userData.baseOpacity = c.opacity; } mats.set(mm, c); } return mats.get(mm); });
      m.material = Array.isArray(m.material) ? out : out[0];
    });
    return { x0, z0, x1, z1, top, mats: [...mats.values()], f: 1 };
  }

  // Baldino's roof: antenna mast with a dish and wires, a propeller wind-vane, a brick chimney, a water tank, a cog
  function workshopClutter(HB, G, o, f, tiles) {
    const { w, d, h } = o;
    const rx = w * 0.25, rz = d * 0.15;
    // chimney
    HB.add(boxUV(bbox(0.7, 1.8, 0.7, 0.04, 1), 1.2), tm('brick', { color: '#e8c0b0' }), w / 2 - 0.7, h + 0.9, -d / 2 + 0.75);
    HB.add(boxUV(bbox(0.86, 0.14, 0.86, 0.03, 1), 1), tm('stone', { color: '#d8c8d0' }), w / 2 - 0.7, h + 1.85, -d / 2 + 0.75);
    HB.add(cyl(0.16, 0.16, 0.5, 10, 1), darkSteel(), w / 2 - 0.7, h + 2.1, -d / 2 + 0.75);
    HB.add(cached('chcap', () => lathe([[0, 0], [0.32, 0], [0.08, 0.22], [0, 0.24]], 10)), darkSteel(), w / 2 - 0.7, h + 2.38, -d / 2 + 0.75);
    // antenna mast with cross bars, a dish and a red light
    const ax = rx + 0.6, az = -d / 2 + 0.9;
    HB.add(cyl(0.05, 0.08, 4.4, 8, 1), darkSteel(), ax, h + 2.2, az);
    for (const [y, l] of [[h + 2.8, 1.2], [h + 3.6, 0.9], [h + 4.2, 0.6]]) HB.add(cyl(0.025, 0.025, l, 5, 1).rotateZ(Math.PI / 2), brassM(), ax, y, az);
    HB.add(cached('glr', () => new THREE.SphereGeometry(0.09, 10, 8)), pm('#ff8070', 0.3, { emissive: '#ff3020', emissiveIntensity: 2.2 }), ax, h + 4.45, az);
    HB.add(cached('dish', () => lathe([[0, 0], [0.3, 0.02], [0.55, 0.12], [0.66, 0.22], [0.64, 0.24], [0.52, 0.14], [0.28, 0.05], [0, 0.04]], 18)), tm('concrete', { color: '#f4f0ea', rough: 0.5 }), ax - 0.15, h + 3.0, az + 0.35, -1.0, 0.4, 0);
    for (const s of [-1, 1]) HB.add(tube([[ax, h + 4.1, az], [ax + s * 1.6, h + 2.5, az + 1.2], [ax + s * 2.5, h + 0.05, az + 1.8]], 0.012, 4, 1), darkSteel());
    // water tank on legs
    const tx = -w / 2 + 1.0, tz = -d / 2 + 1.0;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) HB.add(cyl(0.04, 0.04, 0.9, 6, 1), darkSteel(), tx + sx * 0.38, h + 0.45, tz + sz * 0.38);
    HB.add(lathe([[0, 0], [0.55, 0], [0.55, 0.9], [0.45, 1.05], [0, 1.1]], 16, 1), tm('planks', { color: '#c8a888' }), tx, h + 0.9, tz);
    HB.add(cached('tband', () => compose([0.15, 0.75].map((y) => [new THREE.TorusGeometry(0.56, 0.03, 5, 18).rotateX(Math.PI / 2), 0, y, 0]))), brassM(), tx, h + 0.9, tz);
    // pipes down the wall, a big cog decoration on the front, the sign on a bracket
    const fz = d / 2 + 0.1;
    HB.add(tube([[w / 2 - 0.35, h + 1.0, -d / 2 + 0.75], [w / 2 - 0.35, h + 0.2, d / 2 - 0.3], [w / 2 - 0.35, h - 0.6, fz + 0.05], [w / 2 - 0.35, 0.4, fz + 0.05]], 0.07, 8, 1), tm('copper' in textures() ? 'copper' : 'brass', { rough: 0.4, metal: 0.7, color: '#e0a070' }));
    const cog = cached('cogdeco', () => { const s = new THREE.Shape(); for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, rr = i % 2 ? 0.52 : 0.66; const a2 = a + Math.PI / 24; if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); s.lineTo(Math.cos(a2) * rr, Math.sin(a2) * rr); } s.closePath(); const hp = new THREE.Path(); hp.absarc(0, 0, 0.2, 0, Math.PI * 2, true); s.holes.push(hp); return boxUV(new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 1 }), 0.6); });
    HB.add(cog, brassM(), -w / 2 + 0.95, h - 0.95, fz);
    // hanging sign with a cog (two-sided), on a brass bracket by the door
    const sx = (o.doorX ?? 0) - 1.25;
    HB.add(cached('sbr', () => compose([[bbox(0.07, 0.07, 1.0, 0.02, 1), 0, 0, 0.5], [tube([[0, -0.02, 0.05], [0, -0.35, 0.18], [0, -0.04, 0.6]], 0.02, 5, 1)]])), brassM(), sx, 3.05, d / 2);
    const sign = new THREE.Group(); sign.position.set(sx, 2.62, d / 2 + 0.78); G.add(sign);
    mesh(sign, cached('sboard', () => bbox(0.08, 0.6, 0.92, 0.03, 1)), brassM());
    for (const s of [-1, 1]) mesh(sign, cached('sface', () => new THREE.PlaneGeometry(0.86, 0.54)), pm('#ffffff', 0.6, { map: workshopSignTex() }), s * 0.045, 0, 0, s * Math.PI / 2, { cast: false });
    for (const zz of [-0.3, 0.3]) mesh(sign, cyl(0.008, 0.008, 0.16, 4), darkSteel(), 0, 0.37, zz);
    // a propeller wind-vane on a pole over the roof (spins)
    const vx = -w / 2 + 2.2, vz = 0.6;
    HB.add(cyl(0.05, 0.06, 2.6, 8, 1), darkSteel(), vx, h + 1.3, vz);
    const vane = new THREE.Group(); vane.position.set(vx, h + 2.65, vz); G.add(vane);
    mesh(vane, cached('vbody', () => compose([[lathe([[0, 0], [0.12, 0.1], [0.15, 0.5], [0.1, 0.9], [0, 1.0]], 10).rotateX(Math.PI / 2), 0, 0, -0.5], [slabGeo([[0, 0], [0.5, -0.35], [0.5, 0.35]], 0.03, 1).rotateZ(Math.PI / 2), 0, 0, -1.0]])), tealM());
    const prop = new THREE.Group(); prop.position.set(0, 0, 0.55); vane.add(prop);
    mesh(prop, cached('vprop', () => compose([0, 1, 2].map((k) => [bbox(0.1, 0.8, 0.03, 0.02, 1), Math.sin((k * Math.PI * 2) / 3) * 0.38, Math.cos((k * Math.PI * 2) / 3) * 0.38, 0, 0, 0.3, -(k * Math.PI * 2) / 3]).concat([[new THREE.SphereGeometry(0.08, 8, 6)]]))), tm('brass', { color: '#f0c8c0', rough: 0.4, metal: 0.6 }));
    updaters.push((dt, t) => { prop.rotation.z += dt * 7; vane.rotation.y = Math.sin(t * 0.3) * 0.5 + 0.3; sign.rotation.x = Math.sin(t * 1.3) * 0.05; });
    // clutter by the wall: crates, a cart wheel, a gear rack, a barrel
    techCrates([wpos(f, w / 2 + 0.9, 0.8).x !== undefined ? [wpos(f, w / 2 + 0.9, 0.8).x, wpos(f, w / 2 + 0.9, 0.8).z, 1, 0.8] : [0, 0]]);
    HB.add(cached('cartwheel', () => compose([[new THREE.TorusGeometry(0.5, 0.06, 6, 22)], ...[0, 1, 2, 3].map((k) => [bbox(1.0, 0.05, 0.05, 0.01, 1), 0, 0, 0, 0, 0, (k * Math.PI) / 4]), [cyl(0.08, 0.08, 0.16, 8).rotateX(Math.PI / 2)]])), tm('wood', { color: '#a87850' }), -w / 2 - 0.25, 0.55, 1.2, 0, Math.PI / 2 - 0.2, 0.15);
    return {};
  }

  // ================================================================ plaza: fountain and the market stall
  function buildPlaza() {
    const { x, z } = PLAZA;
    // fountain: tiled octagonal basin, brass bowl, water
    const stone = tm('stone', { color: '#f2e2ea' });
    B.add(lathe([[1.9, 0], [1.95, 0.05], [1.95, 0.55], [2.05, 0.62], [2.05, 0.72], [1.7, 0.72], [1.7, 0.2], [0, 0.2]], 8, 1.2), stone, x, Y0, z, 0, Math.PI / 8, 0);
    B.add(cyl(1.97, 1.97, 0.3, 8, 1, true), tm(tileTex('#3a7ac8', '#e8b84a', '#d8608a'), { rough: 0.45 }), x, Y0 + 0.36, z, 0, Math.PI / 8, 0);
    B.add(lathe([[0.4, 0], [0.32, 0.6], [0.26, 1.2], [0.3, 1.3], [0.9, 1.45], [0.95, 1.6], [0.2, 1.62], [0.12, 1.9], [0.2, 2.1], [0.05, 2.5], [0, 2.55]], 16), brassM(), x, Y0 + 0.2, z);
    const water = mesh(group, cached('wdisc', () => new THREE.CircleGeometry(1.72, 8).rotateX(-Math.PI / 2)), tm('sea', { color: '#c8f0f8', rough: 0.15, metal: 0.1, emissive: '#204860', ei: 0.4 }), x, Y0 + 0.55, z, Math.PI / 8, { cast: false });
    water.material.map = water.material.map.clone(); water.material.map.needsUpdate = true; water.material.map.repeat.set(0.6, 0.6);
    const bowl = mesh(group, cached('bwater', () => new THREE.CircleGeometry(0.86, 16).rotateX(-Math.PI / 2)), water.material, x, Y0 + 1.75, z, 0, { cast: false });
    void bowl;
    // falling water: a thin translucent bell
    const bell = mesh(group, cached('wbell', () => lathe([[0.95, 0], [0.97, -0.3], [1.05, -0.8], [1.15, -1.18]], 16)), pm('#e0f8ff', 0.1, { transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false, emissive: '#80c0e0', emissiveIntensity: 0.3 }), x, Y0 + 1.73, z, 0, { cast: false });
    bell.castShadow = false;
    updaters.push((dt, t) => { water.material.map.offset.set(t * 0.03, t * 0.02); });
    col({ type: 'cyl', x, z, r: 2.05, top: Y0 + 0.72 });
    // market stall: timber frame, striped canopy, counter of fruit, jars and a rug
    const sx = x, sz = z + 9.2, G = new THREE.Group(); G.position.set(sx, Y0, sz); G.rotation.y = Math.PI; group.add(G);
    const SB = new Batch(G);
    const wood = tm('wood', { color: '#c89868' });
    for (const [px, pz] of [[-1.6, -0.9], [1.6, -0.9], [-1.6, 0.9], [1.6, 0.9]]) SB.add(boxUV(bbox(0.14, pz < 0 ? 2.5 : 2.2, 0.14, 0.03, 1), 1), wood, px, (pz < 0 ? 2.5 : 2.2) / 2, pz);
    SB.add(boxUV(bbox(3.5, 0.9, 0.7, 0.04, 1), 1), tm('planks', { color: '#d8b090' }), 0, 0.45, 0.7);
    SB.add(boxUV(bbox(3.6, 0.08, 0.85, 0.02, 1), 1), wood, 0, 0.93, 0.7);
    SB.add(boxUV(bbox(3.5, 0.24, 0.05, 0.01, 1), TILE.tiles), tm(tileTex(), { rough: 0.5 }), 0, 0.7, 1.06);
    const canopy = cached('canopy', () => { const s = new THREE.Shape(); s.moveTo(-1.95, 0); for (let i = 0; i <= 8; i++) { const xx = -1.95 + (i / 8) * 3.9; s.lineTo(xx, i % 2 ? -0.18 : 0); } s.lineTo(1.95, 0.06); s.lineTo(-1.95, 0.06); s.lineTo(-1.95, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 2.4, bevelEnabled: false }); g.translate(0, 0, -1.2); g.rotateX(0.24); return boxUV(g, 0.98); });
    SB.add(canopy, tm(stripeTex('#e8608a', '#f8eee4'), { rough: 0.9, side: THREE.DoubleSide }), 0, 2.42, 0.0);
    const fruit = [];
    for (let i = 0; i < 26; i++) fruit.push([cached('fruit' + (i % 4), () => tint(new THREE.SphereGeometry(0.09 + (i % 4) * 0.015, 8, 6), ['#ff7a3a', '#e8d040', '#b048c8', '#f05070'][i % 4])), -1.4 + (i % 13) * 0.22, 1.02 + Math.floor(i / 13) * 0.05, 0.55 + Math.floor(i / 13) * 0.25]);
    for (const [g, fx, fy, fz] of fruit) SB.add(g, VC(), fx, fy, fz);
    for (let i = 0; i < 4; i++) SB.add(cached('jar', () => lathe([[0, 0], [0.12, 0], [0.16, 0.12], [0.14, 0.26], [0.08, 0.32], [0.09, 0.38], [0, 0.38]], 10)), tm(tileTex('#2f8a9a', '#e8b84a', '#c84a7a'), { rough: 0.4 }), 1.1 + (i % 2) * 0.3, 0.97, 0.45 + Math.floor(i / 2) * 0.3);
    SB.add(cached('rugstall', () => new THREE.PlaneGeometry(1.1, 0.8)), pm('#ffffff', 0.95, { map: rugTex(['#2a6a8a', '#a8304a', '#e8b84a', '#f4e6c8', '#3a2030'], 7), side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }), -1.6, 1.4, 0.0, 0, Math.PI / 2, Math.PI / 2);
    SB.build();
    col({ type: 'box', x: sx, z: sz - 0.7, hw: 1.8, hd: 0.45, rot: 0, top: Y0 + 1.0, noStand: true, seeThrough: true });
    for (const [px, pz] of [[-1.6, 0.9], [1.6, 0.9]]) col({ type: 'cyl', x: sx + px, z: sz + pz, r: 0.12, top: Y0 + 2.5, seeThrough: true });
    keepClear(sx - 2.2, sz - 1.4, sx + 2.2, sz + 1.4);
  }

  // ================================================================ lamps, benches, planters with odd plants
  function buildStreetFurniture() {
    for (let x = -44; x <= 34; x += 10.5) { lamps.push([x, -4.1]); lamps.push([x + 5, 4.1]); }
    lamps.push([PLAZA.x - 5.8, PLAZA.z - 5.8], [PLAZA.x + 5.8, PLAZA.z + 5.8 - 0.4]);
    const lampGeo = cached('zlamp', () => ({
      metal: compose([
        [lathe([[0, 0], [0.3, 0], [0.3, 0.1], [0.2, 0.2], [0.13, 0.5], [0.1, 0.58], [0.12, 0.64], [0, 0.64]], 10)],
        [cyl(0.05, 0.07, 2.7, 8), 0, 1.95, 0], [new THREE.TorusGeometry(0.09, 0.025, 6, 12).rotateX(Math.PI / 2), 0, 1.1, 0], [new THREE.TorusGeometry(0.075, 0.025, 6, 12).rotateX(Math.PI / 2), 0, 3.1, 0],
        [tube([[0, 3.2, 0], [0.12, 3.55, 0], [0.42, 3.62, 0], [0.62, 3.5, 0], [0.64, 3.36, 0]], 0.03, 5, 1)],
        [tube([[0, 2.9, 0], [0.3, 3.1, 0], [0.5, 3.38, 0]], 0.02, 4, 1)],
        [lathe([[0, 0], [0.2, 0.02], [0.16, 0.12], [0.07, 0.26], [0.02, 0.4], [0, 0.42]], 10), 0.64, 3.2, 0],
        [lathe([[0, 0], [0.14, 0], [0.16, 0.04], [0.12, 0.06], [0, 0.06]], 10), 0.64, 2.66, 0],
        [lathe([[0, 0], [0.04, 0], [0.04, 0.3], [0.08, 0.36], [0, 0.48]], 8), 0, 3.2, 0],
      ]),
      glass: lathe([[0.05, 0], [0.15, 0.08], [0.19, 0.28], [0.15, 0.46], [0.06, 0.54]], 10).translate(0.64, 2.68, 0),
    }));
    const lm = tm('brass', { color: '#d8c0a0', rough: 0.4, metal: 0.6 }), lg = pm('#fff0f4', 0.3, { emissive: '#ffb0d0', emissiveIntensity: 1.5 });
    for (const [x, z] of lamps) {
      const ry = z > 0 ? -Math.PI / 2 : Math.PI / 2;
      B.add(lampGeo.metal, lm, x, Y0, z, 0, ry, 0);
      B.add(lampGeo.glass, lg, x, Y0, z, 0, ry, 0);
      col({ type: 'cyl', x, z, r: 0.22, top: Y0 + 3.4, seeThrough: true, noStand: true });
    }
    // benches: stone ends, plank seat, tiled back
    const benches = [[-31, -4.6, 0], [-17, 4.6, Math.PI], [3, -4.6, 0], [14, 4.6, Math.PI], [PLAZA.x - 7.0, PLAZA.z + 2.2, Math.PI / 2 + 0.25], [26, -4.6, 0]];
    for (const [x, z, ry] of benches) {
      const f = frame(x, z, ry), at = (lx, ly, lz) => { const [a, b] = f(lx, lz); return [a, Y0 + ly, b]; };
      for (const s of [-1, 1]) B.add(boxUV(bbox(0.24, 0.48, 0.55, 0.05, 1), 1), tm('stone', { color: '#ead8e4' }), ...at(s * 0.75, 0.24, 0), 0, ry, 0);
      for (let k = 0; k < 3; k++) B.add(boxUV(bbox(1.8, 0.06, 0.15, 0.02, 1), 1), tm('wood', { color: '#c89060' }), ...at(0, 0.5, -0.17 + k * 0.17), 0, ry, 0);
      B.add(boxUV(bbox(1.9, 0.5, 0.1, 0.03, 1), TILE.tiles), tm(tileTex(), { rough: 0.5 }), ...at(0, 0.82, -0.3), -0.1, ry, 0);
      col({ type: 'box', ...wpos(f, 0, 0), hw: 0.95, hd: 0.35, rot: ry, top: Y0 + 0.55, seeThrough: true });
    }
    // planters with odd Zeelich plants
    const planters = [[-44, -5.6], [-44, 5.6], [-30.5, -5.2], [-18.4, -5.2], [-6, 5.2], [8, -5.2], [17.5, 5.2], [33, -5.0], [33, 5.0], [PLAZA.x + 6.6, PLAZA.z - 4], [PLAZA.x + 7.3, PLAZA.z + 2.6]];
    const pot = cached('planter', () => lathe([[0, 0.05], [0.62, 0], [0.72, 0.08], [0.7, 0.5], [0.8, 0.56], [0.8, 0.68], [0.62, 0.68], [0.62, 0.6], [0, 0.6]], 8, 1.2));
    for (const [x, z] of planters) {
      B.add(pot, tm('stone', { color: '#ead4dc' }), x, Y0, z, 0, Math.PI / 8, 0);
      B.add(cyl(0.705, 0.705, 0.22, 8, 1, true), tm(tileTex('#3a9aa0', '#e8b84a', '#e8608a'), { rough: 0.45 }), x, Y0 + 0.3, z, 0, Math.PI / 8, 0);
      plantAt(x, Y0 + 0.6, z, Math.floor(r() * 3));
      col({ type: 'cyl', x, z, r: 0.78, top: Y0 + 0.68, seeThrough: true });
    }
  }
  function plantAt(x, y, z, kind, s = 1) {
    if (kind === 0) {
      // orb stalks: curved stems with glowing orbs
      const stem = cached('orbstem', () => compose([0, 1, 2, 3, 4].map((k) => { const a = (k / 5) * Math.PI * 2, hh = 0.9 + (k % 3) * 0.35; return [tint(tube([[0, 0, 0], [Math.sin(a) * 0.12, hh * 0.5, Math.cos(a) * 0.12], [Math.sin(a) * 0.32, hh, Math.cos(a) * 0.32]], 0.025, 4, 1), '#4a9a6a')]; }).concat([[tint(new THREE.SphereGeometry(0.3, 10, 6), '#3f7a4a'), 0, 0.05, 0, 0, 0, 0, 1, 0.45, 1]]), true));
      B.add(stem, VC(), x, y, z, 0, r() * 6, 0, s);
      const orb = cached('orbs', () => compose([0, 1, 2, 3, 4].map((k) => { const a = (k / 5) * Math.PI * 2, hh = 0.9 + (k % 3) * 0.35; return [new THREE.SphereGeometry(0.09 + (k % 2) * 0.03, 10, 8), Math.sin(a) * 0.32, hh + 0.05, Math.cos(a) * 0.32]; })));
      B.add(orb, pm(['#ffd0f0', '#c8f8ff', '#fff0b0'][Math.floor(r() * 3)], 0.3, { emissive: ['#ff60c0', '#40d8ff', '#ffc040'][Math.floor(r() * 3)], emissiveIntensity: 1.2 }), x, y, z, 0, r() * 6, 0, s);
    } else if (kind === 1) {
      // striped onion bulbs with drooping leaves
      const g = cached('bulbplant', () => {
        const bulb = lathe([[0, 0], [0.22, 0.05], [0.3, 0.2], [0.24, 0.42], [0.1, 0.6], [0.03, 0.8], [0, 0.82]], 12);
        const c = [], p = bulb.attributes.position, cc = new THREE.Color();
        for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getX(i), p.getZ(i)); cc.set(Math.floor(((a + Math.PI) / (Math.PI * 2)) * 10 + p.getY(i) * 3) % 2 ? '#c860d0' : '#f0a0d8'); c.push(cc.r, cc.g, cc.b); }
        bulb.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
        const parts = [[bulb, 0, 0, 0], [bulb, 0.3, 0, 0.15, 0, 1, 0.2, 0.7], [bulb, -0.25, 0, -0.2, 0, 2, -0.2, 0.6]];
        for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; parts.push([tint(new THREE.SphereGeometry(0.35, 8, 5), '#5aa86a'), Math.sin(a) * 0.32, 0.12, Math.cos(a) * 0.32, 0.3, a, 0, 0.35, 0.08, 1]); }
        return compose(parts, true);
      });
      B.add(g, VC(), x, y, z, 0, r() * 6, 0, s);
    } else {
      // curl ferns: spiral fronds
      const g = cached('curlfern', () => compose([0, 1, 2, 3, 4, 5].map((k) => {
        const a = (k / 6) * Math.PI * 2, pts = [];
        for (let i = 0; i <= 10; i++) { const t = i / 10, rr = 0.5 * (1 - t * 0.6), ang = t * 4; pts.push([Math.sin(a) * (0.1 + t * 0.6) + Math.sin(a + 1.6) * Math.sin(ang) * 0.12 * t, 0.2 + Math.sin(t * 2.6) * 0.9 * rr + t * 0.3, Math.cos(a) * (0.1 + t * 0.6) + Math.cos(a + 1.6) * Math.sin(ang) * 0.12 * t]); }
        return [tint(tube(pts, 0.035, 4, 1), k % 2 ? '#3a9a8a' : '#7ac860')];
      }), true));
      B.add(g, VC(), x, y, z, 0, r() * 6, 0, s);
    }
  }

  // ================================================================ wind-mills
  function buildMill(m) {
    const G = new THREE.Group(); G.position.set(m.x, Y0, m.z); group.add(G);
    const MB = new Batch(G);
    const old = !!m.old;
    const H = old ? 12.0 : 10.0, R0 = old ? 2.5 : 2.2, R1 = old ? 2.0 : 1.75;
    const Rat = (y) => R0 + (R1 - R0) * (y / H);
    const wallM = old ? tm('stone', { color: '#fff2fa' }) : tm('plasterWall', { color: m.id === 'east' ? '#f6eef0' : '#efe2f4' });
    const tiles = tm(tileTex(m.id === 'south' ? '#c84a7a' : '#2f8a9a', '#e8b84a', '#3a72c4'), { rough: 0.45 });
    const stoneM = tm('stone', { color: '#e0cce0' });
    // tower, plinth, bands, door, windows
    MB.add(lathe([[R0 + 0.35, 0], [R0 + 0.35, 0.45], [R0 + 0.1, 0.55], [R0, 0.6], [R1, H], [R1 + 0.2, H + 0.05], [R1 + 0.2, H + 0.35], [0, H + 0.35]], 28, old ? TILE.stone : TILE.plaster), wallM, 0, 0, 0);
    MB.add(lathe([[R0 + 0.36, 0], [R0 + 0.36, 0.46], [0, 0.46]], 28, 1.6), stoneM, 0, 0, 0);
    for (const y of old ? [H * 0.45] : [H * 0.33, H * 0.66]) MB.add(cyl(Rat(y) + 0.02, Rat(y) + 0.02, 0.4, 28, 1, true), tiles, 0, y, 0);
    MB.add(cyl(R1 + 0.05, R1 + 0.05, 0.42, 28, 1, true), tiles, 0, H - 0.25, 0);
    const doorPhi = m.brake + Math.PI * (old ? 0.5 : 0.35);
    {
      const op = { x: 0, y: 0.02, w: 1.1, h: 2.2, horse: true };
      const rr = Rat(1.1) + 0.02;
      MB.add(fillGeo(op, 0.0, 0.06, 0.6), tm('planks', { color: '#a87858' }), Math.sin(doorPhi) * (rr - 0.04), 0.55, Math.cos(doorPhi) * (rr - 0.04), 0, doorPhi, 0);
      MB.add(frameGeo(op, 0.16, 0.12), tiles, Math.sin(doorPhi) * (rr - 0.02), 0.55, Math.cos(doorPhi) * (rr - 0.02), 0, doorPhi, 0);
    }
    for (const [y, a] of [[H * 0.55, doorPhi + 0.6], [H * 0.8, doorPhi - 0.9], [H * 0.3, doorPhi + 2.6]]) {
      const op = { x: 0, y: 0, w: 0.5, h: 0.9, horse: true }, rr = Rat(y + 0.45) + 0.01;
      MB.add(fillGeo(op, 0.04, 0, 0.5), tm(latticeTex(), { rough: 0.4, emissive: '#3a2a50', ei: 0.4 }), Math.sin(a) * rr, y, Math.cos(a) * rr, 0, a, 0);
      MB.add(frameGeo(op, 0.1, 0.08), stoneM, Math.sin(a) * (rr - 0.02), y, Math.cos(a) * (rr - 0.02), 0, a, 0);
    }
    // cap: onion (new mills) or shingled cone (old mill), turned to the wind
    const capY = H + 0.35, face = m.face;
    if (old) MB.add(lathe([[R1 + 0.5, 0], [R1 + 0.45, 0.3], [R1 * 0.7, 1.6], [0.4, 2.7], [0.05, 3.2]], 20, 1.4), tm('roof', { color: '#c8a0b8' }), 0, capY, 0);
    else MB.add(lathe([[R1 + 0.25, 0], [R1 + 0.5, 0.5], [R1 + 0.45, 1.1], [R1 * 0.75, 1.9], [0.45, 2.6], [0.12, 3.1], [0.03, 3.6]], 24, 1.1), tm(domeTex(m.id === 'east' ? '#3a9aa0' : '#8a5ac0', m.id === 'east' ? '#b8fff0' : '#e8c8ff'), { rough: 0.38 }), 0, capY, 0);
    MB.add(cached('millfin', () => lathe([[0, 0], [0.08, 0], [0.14, 0.15], [0.05, 0.3], [0.02, 0.8], [0, 0.82]], 8)), brassM(), 0, capY + (old ? 3.1 : 3.5), 0);
    // nacelle and axle out to the hub
    const hubY = old ? H + 1.6 : H + 1.2, axL = old ? 5.3 : 3.9;
    const fx = Math.sin(face), fz = Math.cos(face);
    MB.add(boxUV(bbox(1.3, 1.1, axL - 0.6, 0.1, 1), TILE.teal), old ? tm('wood', { color: '#a88870' }) : tealM(), fx * (axL - 0.6) / 2, hubY, fz * (axL - 0.6) / 2, 0, face, 0);
    MB.add(boxUV(bbox(1.42, 0.14, axL - 0.4, 0.04, 1), 1.6), brassM(), fx * (axL - 0.6) / 2, hubY + 0.6, fz * (axL - 0.6) / 2, 0, face, 0);
    MB.add(cyl(0.16, 0.16, axL, 10, 1).rotateX(Math.PI / 2), brassM(), fx * axL / 2, hubY, fz * axL / 2, 0, face, 0);
    // the sail wheel (spins about the axle)
    const Rw = old ? 4.4 : 4.6;
    const pivot = new THREE.Group(); pivot.position.set(fx * axL, hubY, fz * axL); pivot.rotation.y = face; G.add(pivot);
    const spin = new THREE.Group(); spin.rotation.z = r() * 6; pivot.add(spin);
    const WB = new Batch(spin);
    const spokeM = old ? tm('wood', { color: '#b89070' }) : tm('wood', { color: '#d8b898' });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      WB.add(bbox(Rw - 0.3, 0.16, 0.16, 0.03, 1), spokeM, Math.cos(a) * (Rw / 2 + 0.15), Math.sin(a) * (Rw / 2 + 0.15), 0, 0, 0, a);
      WB.add(cached('sail' + Rw, () => {
        const nu = 4, nv = 3, P = [], UV = [], I = [], a0 = 0.06, a1 = 0.62, r0 = 0.9, r1 = Rw - 0.25;
        for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
          const u = i / nu, v = j / nv, rr = lerp(r0, r1, u), aa = lerp(a0, a1 * (0.75 + 0.25 * u), v);
          P.push(Math.cos(aa) * rr, Math.sin(aa) * rr, 0.06 + v * 0.32 + Math.sin(u * Math.PI) * v * 0.12); UV.push(v, u);
        }
        for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const q = i * (nv + 1) + j; I.push(q, q + nv + 1, q + 1, q + 1, q + nv + 1, q + nv + 2); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals();
        return g;
      }), tm(sailTex(old ? '#ece0d0' : '#f6eadc', old ? '#c8a0a0' : (m.id === 'east' ? '#5ab0b0' : '#e88aa4')), { rough: 0.9, side: THREE.DoubleSide }), 0, 0, 0, 0, 0, a);
    }
    WB.add(cached('rim' + Rw, () => new THREE.TorusGeometry(Rw, 0.08, 6, 48)), old ? spokeM : tealM());
    WB.add(cached('rim2' + Rw, () => new THREE.TorusGeometry(Rw * 0.45, 0.06, 6, 32)), brassM());
    WB.add(cached('hub', () => lathe([[0, -0.3], [0.45, -0.25], [0.5, 0.1], [0.4, 0.4], [0.16, 0.62], [0, 0.66]], 14).rotateX(Math.PI / 2)), brassM());
    WB.build();
    // brake: a round bullseye plate on a lever, linked up the tower to the cap
    const bp = m.brake, rb = Rat(3) + 0.75;
    const bx = Math.sin(bp) * rb, bz = Math.cos(bp) * rb, by = 3.0;
    MB.add(boxUV(bbox(0.16, 0.16, 0.8, 0.03, 1), 1), darkSteel(), Math.sin(bp) * (Rat(3) + 0.3), by - 0.55, Math.cos(bp) * (Rat(3) + 0.3), 0, bp, 0);
    { const rTop = old ? 8.4 : H - 0.5; rod(MB, [Math.sin(bp) * (Rat(3.2) + 0.1), 3.2, Math.cos(bp) * (Rat(3.2) + 0.1)], [Math.sin(bp) * (Rat(rTop) + 0.1), rTop, Math.cos(bp) * (Rat(rTop) + 0.1)], 0.03, brassM(), 6); }
    const lever = new THREE.Group(); lever.position.set(bx, by - 0.55, bz); lever.rotation.y = bp; G.add(lever);
    mesh(lever, cyl(0.05, 0.05, 0.75, 8, 1), brassM(), 0, 0.3, 0);
    mesh(lever, cached('bullring', () => new THREE.TorusGeometry(0.56, 0.07, 8, 28)), brassM(), 0, 0.7, 0.05);
    mesh(lever, cached('bulldisc', () => new THREE.CircleGeometry(0.55, 28)), pm('#ffffff', 0.5, { map: bullseyeTex(), emissive: '#401010', emissiveIntensity: 0.3 }), 0, 0.7, 0.09, 0, { cast: false });
    mesh(lever, cached('bullback', () => cyl(0.55, 0.55, 0.08, 20).rotateX(Math.PI / 2)), darkSteel(), 0, 0.7, 0.02);
    col({ type: 'cyl', x: m.x, z: m.z, r: R0 + 0.05, top: Y0 + H + 3 });
    // the old mill: stair-stones spiralling up to a wooden balcony gallery
    let top = null;
    if (old) {
      const phi0 = 0.9, dphi = (30 * Math.PI) / 180, rs = 3.475;
      const tops = [1.25, 2.5, 3.75, 5.0, 6.25, 7.5];
      const stone = tm('stone', { color: '#e8d2de' });
      tops.forEach((ty, k) => {
        const phi = phi0 + k * dphi, inner = Rat(ty) - 0.25, outer = rs + 0.66, mid = (inner + outer) / 2;
        MB.add(boxUV(bbox(1.5, 0.4, outer - inner, 0.07, 1), 1.2), stone, Math.sin(phi) * mid, ty - 0.2, Math.cos(phi) * mid, 0, phi, 0);
        if (k > 0) MB.add(cached('corbel', () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.9, 0); s.quadraticCurveTo(0.2, -0.1, 0, -0.8); s.lineTo(0, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: false }); g.translate(0, 0, -0.25); g.rotateY(-Math.PI / 2); return boxUV(g, 1); }), stone, Math.sin(phi) * (Rat(ty) - 0.05), ty - 0.4, Math.cos(phi) * (Rat(ty) - 0.05), 0, phi, 0);
        else MB.add(boxUV(bbox(1.5, ty - 0.4, 1.3, 0.06, 1), 1.2), stone, Math.sin(phi) * rs, (ty - 0.4) / 2, Math.cos(phi) * rs, 0, phi, 0);
        col({ type: 'box', x: m.x + Math.sin(phi) * rs, z: m.z + Math.cos(phi) * rs, hw: 0.75, hd: 0.64, rot: phi, top: Y0 + ty, bottom: k === 0 ? undefined : Y0 + ty - 0.4 });
      });
      // the gallery: a ring of planks with a gap where the last stones arrive
      const balY = 8.75, gap0 = phi0 + 4 * dphi - 0.29, gap1 = phi0 + 5 * dphi + 0.39;
      const span = Math.PI * 2 - (gap1 - gap0);
      MB.add(lathe([[Rat(balY) - 0.1, -0.3], [4.05, -0.3], [4.12, -0.18], [4.05, 0], [Rat(balY) - 0.1, 0]], 40, TILE.planks, gap1, span), tm('planks', { color: '#d8b898' }), 0, balY, 0);
      const nb = 14;
      for (let j = 0; j <= nb; j++) {
        const a = gap1 + (j / nb) * span;
        MB.add(cached('bpost', () => lathe([[0.05, 0], [0.05, 1.0], [0.08, 1.05], [0, 1.1]], 6)), tm('wood', { color: '#a88060' }), Math.sin(a) * 3.95, balY, Math.cos(a) * 3.95);
        if (j % 2 === 0) MB.add(cached('bcorbel', () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(1.6, 0); s.lineTo(1.6, -0.12); s.quadraticCurveTo(0.4, -0.2, 0, -1.1); s.lineTo(0, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: false }); g.translate(0, 0, -0.07); g.rotateY(-Math.PI / 2); return boxUV(g, 1); }), tm('wood', { color: '#8a6850' }), Math.sin(a) * (Rat(balY) - 0.1), balY - 0.3, Math.cos(a) * (Rat(balY) - 0.1), 0, a, 0);
      }
      for (const y of [0.55, 1.02]) MB.add(cached('brail' + y, () => new THREE.TorusGeometry(3.95, 0.04, 5, 40, span).rotateX(Math.PI / 2).rotateY(gap1 - Math.PI / 2 + span * 0 + 0)), tm('wood', { color: '#b89070' }), 0, balY + y, 0);
      const segs = 16;
      for (let j = 0; j < segs; j++) {
        const a = gap1 + ((j + 0.5) / segs) * span, half = (span / segs / 2) * 3.45 * 1.05;
        col({ type: 'box', x: m.x + Math.sin(a) * 3.45, z: m.z + Math.cos(a) * 3.45, hw: half, hd: 0.6, rot: a, top: Y0 + balY, bottom: Y0 + balY - 0.15 });
        // the railing keeps people on the gallery (except at the gap)
        col({ type: 'box', x: m.x + Math.sin(a) * 4.1, z: m.z + Math.cos(a) * 4.1, hw: half * 1.15, hd: 0.08, rot: a, top: Y0 + balY + 1.1, bottom: Y0 + balY - 0.1, noStand: true, seeThrough: true });
      }
      // the gearbox where the cog belongs, on the gallery facing the street
      const ta = 0.0;
      top = { x: m.x + ox + Math.sin(ta) * 3.3, y: Y0 + balY, z: m.z + oz + Math.cos(ta) * 3.3 };
      MB.add(boxUV(bbox(0.9, 0.8, 0.5, 0.06, 1), 1), tm('wood', { color: '#9a7058' }), Math.sin(ta) * (Rat(balY) + 0.15), balY + 0.4, Math.cos(ta) * (Rat(balY) + 0.15), 0, ta, 0);
      MB.add(cached('gbcog', () => { const s = new THREE.Shape(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? 0.26 : 0.34; if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } s.closePath(); return boxUV(new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: false }), 0.5); }), darkSteel(), Math.sin(ta) * (Rat(balY) + 0.42) + 0.25, balY + 0.55, Math.cos(ta) * (Rat(balY) + 0.42), 0, ta, 0);
      // stair-stones keep the vegetation off
      keepClear(m.x - 5, m.z - 5, m.x + 5, m.z + 5);
    } else keepClear(m.x - 3.5, m.z - 3.5, m.x + 3.5, m.z + 3.5);
    MB.build();
    // spinning, with a slow wind-down when the brake is pulled
    const api = {
      id: m.id, ...W(m.x, m.z), brake: { x: m.x + ox + bx, y: Y0 + by + 0.15, z: m.z + oz + bz }, spinning: true, speed: old ? 0.75 : 1.0,
      setSpinning(b) { this.spinning = !!b; },
    };
    const full = api.speed;
    let leverA = 0;
    updaters.push((dt) => {
      const goal = api.spinning ? full : 0;
      api.speed = api.spinning ? Math.min(goal, api.speed + dt * 0.4) : Math.max(0, api.speed - dt * 0.28);
      spin.rotation.z -= api.speed * dt;
      leverA += ((api.spinning ? 0 : 0.9) - leverA) * (1 - Math.exp(-dt * 5));
      lever.rotation.x = leverA;
    });
    const ext = old ? 5.2 : R0 + 0.6;
    const fader = old ? null : makeFader(G, m.x - ext, m.z - ext, m.x + ext, m.z + ext, Y0 + 4.5);
    if (fader) fader.mats = fader.mats.filter((mm) => mm !== tiles && mm.map !== bullseyeTex());
    return { api, top, fader };
  }

  // ================================================================ the project depot
  function buildDepot() {
    const D = DEPOT;
    const chain = cached('chainMat', () => { const map = textures().chain.clone(); map.needsUpdate = true; map.wrapS = map.wrapT = THREE.RepeatWrapping; return new THREE.MeshStandardMaterial({ map, color: '#c8d0d4', roughness: 0.5, metalness: 0.5, alphaTest: 0.35, side: THREE.DoubleSide }); });
    const chainGeo = (len, h) => cached(`chain${len.toFixed(2)},${h}`, () => { const g = new THREE.PlaneGeometry(len, h); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * len / 0.32, uv.getY(i) * h / 0.32); return g; });
    const fence = (a, b, h = 2.3) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / 2.6)), ry = Math.atan2(b[0] - a[0], b[1] - a[1]) - Math.PI / 2;
      const post = cached('fpost' + h, () => compose([[cyl(0.07, 0.07, h + 0.1, 8, 1), 0, (h + 0.1) / 2, 0], [lathe([[0, 0], [0.11, 0], [0.13, 0.08], [0.06, 0.18], [0, 0.2]], 8), 0, h + 0.1, 0], [cyl(0.16, 0.2, 0.25, 8), 0, 0.05, 0]]));
      for (let i = 0; i <= n; i++) B.add(post, tealM(), a[0] + (b[0] - a[0]) * (i / n), Y0 - 0.08, a[1] + (b[1] - a[1]) * (i / n));
      for (let i = 0; i < n; i++) {
        const xm = a[0] + (b[0] - a[0]) * ((i + 0.5) / n), zm = a[1] + (b[1] - a[1]) * ((i + 0.5) / n), sl = len / n;
        B.add(chainGeo(sl - 0.1, h - 0.15), chain, xm, Y0 + 0.08 + (h - 0.15) / 2, zm, 0, ry, 0);
        for (const yy of [0.08, h]) B.add(cyl(0.035, 0.035, sl, 6, 1).rotateZ(Math.PI / 2), brassM(), xm, Y0 + yy, zm, 0, ry, 0);
      }
      col({ type: 'box', x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, hw: len / 2, hd: 0.12, rot: ry, top: Y0 + h + 0.1, seeThrough: true, noStand: true });
    };
    fence([D.x0, D.z0], [D.gate[0], D.z0]);
    fence([D.gate[1], D.z0], [D.x1, D.z0]);
    fence([D.x0, D.z0], [D.x0, D.z1]);
    fence([D.x1, D.z0], [D.x1, D.z1]);
    fence([D.x0, D.z1], [D.x1, D.z1]);
    // gate pillars with project banners
    for (const gx of D.gate) {
      B.add(boxUV(bbox(0.55, 3.0, 0.55, 0.06, 1), TILE.teal), tealM(), gx, Y0 + 1.5, D.z0);
      B.add(cached('gcap', () => lathe([[0, 0], [0.4, 0], [0.4, 0.12], [0.22, 0.3], [0.08, 0.5], [0, 0.55]], 12)), brassM(), gx, Y0 + 3.0, D.z0);
      B.add(cached('gglobe', () => new THREE.SphereGeometry(0.14, 12, 8)), glowCyan(), gx, Y0 + 3.6, D.z0);
      B.add(emq(), emblemMaterial(), gx, Y0 + 2.1, D.z0 - 0.285, 0, Math.PI, 0, 0.42);
      col({ type: 'box', x: gx, z: D.z0, hw: 0.3, hd: 0.3, rot: 0, top: Y0 + 3.0 });
    }
    B.add(boxUV(bbox(D.gate[1] - D.gate[0] + 0.5, 0.3, 0.3, 0.05, 1), TILE.hazard), tm('hazard', { rough: 0.6 }), (D.gate[0] + D.gate[1]) / 2, Y0 + 3.2, D.z0);
    // concrete yard floor
    B.add(slabGeo([[D.x0 + 0.15, D.z0 + 0.15], [D.x1 - 0.15, D.z0 + 0.15], [D.x1 - 0.15, D.z1 - 0.15], [D.x0 + 0.15, D.z1 - 0.15]], 0.04, TILE.concrete), tm('concrete', { color: '#e8dcd8' }), 0, Y0, 0);
    // containers
    const container = (x, z, ry, color) => {
      const C = cached('container', () => {
        const L = 6.0, Wd = 2.44, Hh = 2.6, body = [], frameP = [];
        body.push([boxUV(bbox(L - 0.2, Hh - 0.24, Wd - 0.12, 0.02, 1), 2.6), 0, Hh / 2, 0]);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { frameP.push([bbox(0.16, Hh, 0.16, 0.02, 1), sx * (L / 2 - 0.08), Hh / 2, sz * (Wd / 2 - 0.08)]); frameP.push([bbox(0.2, 0.16, 0.2, 0.02, 1), sx * (L / 2 - 0.09), Hh - 0.08, sz * (Wd / 2 - 0.09)]); }
        for (const s of [-1, 1]) for (const y of [0.1, Hh - 0.1]) frameP.push([bbox(L - 0.3, 0.14, 0.1, 0.02, 1), 0, y, s * (Wd / 2 - 0.05)]);
        for (let xx = -L / 2 + 0.3; xx < L / 2 - 0.25; xx += 0.27) for (const s of [-1, 1]) body.push([boxUV(bbox(0.13, Hh - 0.38, 0.06, 0.015, 1), 2.6), xx, Hh / 2, s * (Wd / 2 - 0.04)]);
        for (const s of [-1, 1]) body.push([boxUV(bbox(0.06, Hh - 0.36, Wd / 2 - 0.16, 0.015, 1), 2.6), L / 2 - 0.02, Hh / 2, s * (Wd / 4 - 0.02)]);
        for (const zz of [-0.85, -0.35, 0.35, 0.85]) body.push([cyl(0.025, 0.025, Hh - 0.3, 6), L / 2 + 0.05, Hh / 2, zz]);
        return { body: compose(body), frame: compose(frameP) };
      });
      B.add(C.body, tm('metal', { color, rough: 0.6, metal: 0.25 }), x, Y0, z, 0, ry, 0);
      B.add(C.frame, tm('metal', { color: new THREE.Color(color).multiplyScalar(0.7).getStyle(), rough: 0.55, metal: 0.3 }), x, Y0, z, 0, ry, 0);
      const f = frame(x, z, ry);
      for (const s of [-1, 1]) { const [ex, ez] = f(0.4, s * 1.245); B.add(emq(), emblemMaterial(), ex, Y0 + 1.4, ez, 0, ry + (s > 0 ? 0 : Math.PI), 0, 1.1); }
      col({ type: 'box', x, z, hw: 3.05, hd: 1.25, rot: ry, top: Y0 + 2.6 });
    };
    container(8.2, 23.3, 0, '#3a8a86');
    container(22.3, 15.6, Math.PI / 2, '#d86a5a');
    // the teal shed (Zeelich-tech module) in the south-east corner
    {
      const x = 20.6, z = 22.6, w = 4.2, d = 3.6, h = 2.6, G = new THREE.Group(); G.position.set(x, Y0, z); G.rotation.y = Math.PI; group.add(G);
      const SB = new Batch(G);
      const wallM = tm('teal', { rough: 0.6, metal: 0.25, color: '#e8f4f2' });
      SB.add(boxUV(bbox(w + 0.3, 0.3, d + 0.3, 0.05, 1), TILE.concrete), tm('concrete', { color: '#d8d0cc' }), 0, 0.13, 0);
      const door = { x: -0.6, y: 0.02, w: 1.1, h: 2.1 }, win = { x: 1.1, y: 1.2, w: 0.7, h: 0.7, round: true };
      SB.add(panelGeo(w, h, 0.2, [door, win], TILE.teal), wallM, 0, 0.28, d / 2 - 0.2);
      SB.add(panelGeo(w, h, 0.2, [], TILE.teal), wallM, 0, 0.28, -d / 2);
      for (const s of [-1, 1]) SB.add(panelGeo(d - 0.4, h, 0.2, [], TILE.teal), wallM, s * (w / 2 - 0.1), 0.28, 0, 0, s * Math.PI / 2, 0);
      SB.add(bbox(1.06, 2.08, 0.06, 0.02, 1), tm('teal', { color: '#8ab4b4', rough: 0.5, metal: 0.35 }), -0.6, 1.33, d / 2 - 0.12);
      SB.add(cached('shport', () => new THREE.TorusGeometry(0.37, 0.06, 8, 22)), brassM(), 1.1, 1.83, d / 2 + 0.03);
      SB.add(cached('shportg', () => new THREE.CircleGeometry(0.36, 18)), pm('#7fd8e8', 0.12, { metalness: 0.3, emissive: '#3ab8d0', emissiveIntensity: 0.35 }), 1.1, 1.83, d / 2 - 0.1);
      for (const [fx, fy, fw, fh] of [[-1.17, 1.35, 0.14, 2.3], [-0.03, 1.35, 0.14, 2.3], [-0.6, 2.47, 1.3, 0.14]]) SB.add(boxUV(bbox(fw, fh, 0.08, 0.02, 1), TILE.hazard), tm('hazard', { rough: 0.6 }), fx, fy, d / 2 + 0.02);
      for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) SB.add(bbox(0.3, h + 0.1, 0.3, 0.05, 1), brassM(), cx * (w / 2 - 0.05), 0.28 + h / 2, cz * (d / 2 - 0.05));
      const rise = 0.6, a = w / 2 + 0.3;
      SB.add(cached('shroof', () => { const s = new THREE.Shape(); s.moveTo(-a, 0); s.quadraticCurveTo(0, 2 * rise, a, 0); s.lineTo(a, -0.14); s.quadraticCurveTo(0, 2 * rise - 0.14, -a, -0.14); s.lineTo(-a, 0); const g = new THREE.ExtrudeGeometry(s, { depth: d + 0.6, bevelEnabled: false, curveSegments: 14 }); g.translate(0, 0, -(d + 0.6) / 2); return boxUV(g, TILE.brass); }), tm('brass', { rough: 0.45, metal: 0.6, color: '#d8c8a8' }), 0, 0.28 + h + 0.08, 0);
      SB.add(cached('shend', () => { const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.quadraticCurveTo(0, 2 * (rise - 0.1), w / 2, 0); s.lineTo(-w / 2, 0); const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 14 }); g.translate(0, 0, -d / 2); return boxUV(g, TILE.teal); }), wallM, 0, 0.28 + h + 0.06, 0);
      SB.add(emq(), emblemMaterial(), 0, 0.28 + h + 0.32, d / 2 + 0.02, 0, 0, 0, 0.5);
      SB.build();
      col({ type: 'box', x, z, hw: w / 2 + 0.2, hd: d / 2 + 0.2, rot: 0, top: Y0 + h + 1 });
    }
    // the locker at the back (code cylinder inside): teal steel, brass trim, two doors, an emblem
    const LK = { x: 15.2, z: D.z1 - 0.65 };
    {
      const G = new THREE.Group(); G.position.set(LK.x, Y0, LK.z); G.rotation.y = Math.PI; group.add(G);
      const LB = new Batch(G);
      LB.add(boxUV(bbox(1.5, 2.1, 0.7, 0.05, 1), TILE.teal), tealM(), 0, 1.15, 0);
      LB.add(boxUV(bbox(1.62, 0.12, 0.8, 0.03, 1), 1), brassM(), 0, 2.24, 0);
      LB.add(boxUV(bbox(1.62, 0.12, 0.8, 0.03, 1), 1), brassM(), 0, 0.08, 0);
      for (const s of [-1, 1]) {
        LB.add(boxUV(bbox(0.68, 1.88, 0.05, 0.02, 1), TILE.teal), tm('teal', { color: '#a8d0cc', rough: 0.5, metal: 0.35 }), s * 0.36, 1.15, 0.36);
        for (let k = 0; k < 4; k++) LB.add(bbox(0.42, 0.03, 0.03, 0.01, 1), darkSteel(), s * 0.36, 1.8 + k * 0.07, 0.4);
        LB.add(bbox(0.05, 0.22, 0.05, 0.015, 1), brassM(), s * 0.08, 1.15, 0.42);
      }
      LB.add(cached('lock', () => cyl(0.09, 0.09, 0.06, 14).rotateX(Math.PI / 2)), brassM(), 0, 1.4, 0.4);
      LB.add(cached('lockled', () => new THREE.SphereGeometry(0.035, 8, 6)), pm('#ff8070', 0.3, { emissive: '#ff3020', emissiveIntensity: 2.4 }), 0, 1.55, 0.41);
      LB.add(emq(), emblemMaterial(), 0, 0.7, 0.4, 0, 0, 0, 0.4);
      LB.build();
      col({ type: 'box', x: LK.x, z: LK.z, hw: 0.8, hd: 0.4, rot: 0, top: Y0 + 2.3, noStand: true });
    }
    // crates, tech crates, barrels, floodlight masts
    techCrates([[5.4, 11.0, 2, 0.9], [6.5, 10.6, 1, 0.8], [17.6, 24.0, 1, 0.9], [12.4, 24.1, 2, 0.85]]);
    const barrel = cached('zbarrel', () => { const pts = []; for (let i = 0; i <= 8; i++) { const k = i / 8; pts.push([0.32 + Math.sin(k * Math.PI) * 0.06, k * 0.95]); } return compose([[lathe(pts, 14, 1)], [new THREE.CircleGeometry(0.33, 14).rotateX(-Math.PI / 2), 0, 0.95, 0]]); });
    for (const [x, z] of [[4.9, 13.0], [5.1, 13.8], [23.0, 10.4], [22.3, 10.2]]) { B.add(barrel, tm('metal', { color: '#e8b84a', rough: 0.6, metal: 0.3 }), x, Y0, z); col({ type: 'cyl', x, z, r: 0.4, top: Y0 + 0.95, noStand: true, seeThrough: true }); }
    for (const [x, z] of [[4.6, 24.6], [23.4, 9.6]]) {
      B.add(lathe([[0, 0], [0.4, 0], [0.4, 0.12], [0.15, 0.2], [0.1, 6.5], [0.15, 6.6], [0, 6.65]], 12, TILE.teal), tealM(), x, Y0, z);
      B.add(bbox(1.4, 0.12, 0.16, 0.03, 1), brassM(), x, Y0 + 6.5, z, 0, Math.atan2(14 - x, 17 - z) + Math.PI / 2, 0);
      for (const s of [-0.5, 0.5]) { const a = Math.atan2(14 - x, 17 - z); B.add(cached('flood', () => lathe([[0, 0], [0.12, 0], [0.18, 0.18], [0.18, 0.22], [0, 0.22]], 12).rotateX(Math.PI / 2 + 0.5)), brassM(), x + Math.cos(a) * s, Y0 + 6.72, z - Math.sin(a) * s, 0, a, 0); B.add(cached('floodL', () => new THREE.CircleGeometry(0.17, 14).translate(0, 0, 0.225).rotateX(0.5)), pm('#fffbe8', 0.3, { emissive: '#fff4c8', emissiveIntensity: 2.0 }), x + Math.cos(a) * s, Y0 + 6.72, z - Math.sin(a) * s, 0, a, 0); }
      col({ type: 'cyl', x, z, r: 0.4, top: Y0 + 6.5, seeThrough: true });
    }
    keepClear(D.x0 - 1, D.z0 - 1, D.x1 + 1, D.z1 + 1);
    const patrol = [[7.2, 13.8], [13.5, 12.2], [18.6, 12.8], [18.8, 19.2], [13.2, 20.6], [7.4, 19.0]];
    return { ...W((D.x0 + D.x1) / 2, (D.z0 + D.z1) / 2), patrol: patrol.map(([x, z]) => [x + ox, z + oz]), locker: W(LK.x, LK.z - 0.75) };
  }

  // ================================================================ the drill platform, its gate and shield
  function buildPlatform() {
    const PB = new Batch(group);
    // deck: octagon with the shaft hole; teal skirt, hazard edge, brass trim
    const hole = new THREE.Path(); hole.absarc(PAD.x, -PAD.z, SHAFT_R, 0, Math.PI * 2, true);
    PB.add(slabGeo(PLATFORM, 0.5, TILE.deck, [hole]), tm('deck', { color: '#e0d8e8', rough: 0.65, metal: 0.25 }), 0, DECK - 0.5, 0);
    const outlineRing = chaikin(PLATFORM, 0).map(([x, z]) => [x, z]);
    const skirt = (P, y0, y1, out, mat, tile) => {
      for (let i = 0; i < P.length; i++) {
        const a = P[i], b = P[(i + 1) % P.length];
        if (a[0] === 40 && b[0] === 40) continue;
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ry = Math.atan2(b[0] - a[0], b[1] - a[1]) - Math.PI / 2;
        const nx = -(b[1] - a[1]) / len, nz = (b[0] - a[0]) / len;
        PB.add(boxUV(bbox(len + 0.1, y1 - y0, 0.2, 0.04, 1), tile), mat, (a[0] + b[0]) / 2 - nx * out, (y0 + y1) / 2, (a[1] + b[1]) / 2 - nz * out, 0, ry, 0);
      }
    };
    skirt(outlineRing, DECK - 1.6, DECK - 0.45, 0.02, tealM(), TILE.teal);
    skirt(outlineRing, DECK - 0.45, DECK - 0.1, 0.04, tm('hazard', { rough: 0.6 }), TILE.hazard);
    // trusses under the deck, down into the clouds, and struts back to the cliff
    for (const [x, z] of [[44, -8], [44, 8], [52, -9], [52, 9], [58, -4], [58, 4], [48, 0]]) {
      PB.add(lathe([[0.55, 0], [0.55, 0.3], [0.4, 0.4], [0.4, 15], [0, 15]], 12, TILE.teal), tealM(), x, DECK - 16.5, z);
      for (const y of [-4, -9, -14]) PB.add(cached('trband', () => new THREE.TorusGeometry(0.45, 0.07, 6, 16).rotateX(Math.PI / 2)), brassM(), x, DECK + y, z);
    }
    for (const [a, b] of [[[44, -8], [52, -9]], [[44, 8], [52, 9]], [[52, -9], [58, -4]], [[52, 9], [58, 4]], [[44, -8], [44, 8]], [[58, -4], [58, 4]]]) {
      member(PB, [a[0], DECK - 1.7, a[1]], [b[0], DECK - 6.5, b[1]], 0.22, brassM(), 1, 0.04);
      member(PB, [b[0], DECK - 1.7, b[1]], [a[0], DECK - 6.5, a[1]], 0.22, brassM(), 1, 0.04);
    }
    for (const z of [-6, 6]) member(PB, [41, DECK - 1.5, z], [34.5, Y0 - 8, z * 1.3], 0.3, tealM(), 1, 0.05);
    // railing around the deck (open on the neck side)
    const rail = (a, b) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / 1.5)), ry = Math.atan2(b[0] - a[0], b[1] - a[1]) - Math.PI / 2;
      for (let i = 0; i <= n; i++) PB.add(cached('prpost', () => lathe([[0.06, 0], [0.06, 1.0], [0.09, 1.05], [0, 1.1]], 8)), tealM(), a[0] + (b[0] - a[0]) * (i / n), DECK, a[1] + (b[1] - a[1]) * (i / n));
      for (const y of [0.5, 1.02]) PB.add(cyl(y > 1 ? 0.05 : 0.03, y > 1 ? 0.05 : 0.03, len, 6, 1).rotateZ(Math.PI / 2), brassM(), (a[0] + b[0]) / 2, DECK + y, (a[1] + b[1]) / 2, 0, ry, 0);
      col({ type: 'box', x: (a[0] + b[0]) / 2, z: (a[1] + b[1]) / 2, hw: len / 2, hd: 0.1, rot: ry, top: DECK + 1.1, noStand: true, seeThrough: true });
    };
    const inset = PLATFORM.map(([x, z]) => [x + (x < 50 ? 0.25 : -0.25), z + (z < 0 ? 0.25 : -0.25)]);
    for (let i = 0; i < inset.length; i++) { const a = inset[i], b = inset[(i + 1) % inset.length]; if (PLATFORM[i][0] === 40 && PLATFORM[(i + 1) % inset.length][0] === 40) continue; rail(a, b); }
    for (const s of [-1, 1]) rail([40.25, s * 7.25], [40.25, s * 6.2]);
    // walkable deck around the shaft, and the neck step
    const P2 = PLATFORM;
    for (let x = 40.05; x < 60.2; x += 1) {
      const xa = x, xb = Math.min(x + 1, 60.2), xm = (xa + xb) / 2;
      const I = zIntervals(P2, xa + 0.01)[0], J = zIntervals(P2, xb - 0.01)[0];
      if (!I || !J) continue;
      const lo = Math.max(I[0], J[0]) + 0.35, hi = Math.min(I[1], J[1]) - 0.35;
      const dx = xa <= PAD.x && xb >= PAD.x ? 0 : Math.min(Math.abs(xa - PAD.x), Math.abs(xb - PAD.x));
      const ext = dx < SHAFT_R ? Math.sqrt(SHAFT_R * SHAFT_R - dx * dx) : 0;
      const ivs = ext > 0 ? [[lo, PAD.z - ext], [PAD.z + ext, hi]] : [[lo, hi]];
      for (const [l, h] of ivs) if (h - l > 0.3) col({ type: 'box', x: xm, z: (l + h) / 2, hw: (xb - xa) / 2 + 0.08, hd: (h - l) / 2, rot: 0, top: DECK, seeThrough: true });
    }
    // the shaft: glowing rings going down, a bore glow at the bottom
    mesh(group, cyl(SHAFT_R, SHAFT_R, 14, 24, 2, true), tm('teal', { color: '#5a8a90', rough: 0.5, metal: 0.4, side: THREE.BackSide }), PAD.x, DECK - 7, PAD.z, 0, { cast: false });
    for (let k = 1; k <= 5; k++) PB.add(cached('shring', () => new THREE.TorusGeometry(SHAFT_R - 0.05, 0.06, 6, 30).rotateX(Math.PI / 2)), glowCyan(), PAD.x, DECK - k * 2.3, PAD.z);
    PB.add(cached('bore', () => new THREE.CircleGeometry(SHAFT_R, 24).rotateX(-Math.PI / 2)), pm('#bff8ff', 0.3, { emissive: '#40e0ff', emissiveIntensity: 2.6 }), PAD.x, DECK - 13.5, PAD.z);
    PB.add(cached('shlip', () => lathe([[SHAFT_R - 0.02, -0.1], [SHAFT_R + 0.35, -0.1], [SHAFT_R + 0.35, 0.06], [SHAFT_R - 0.02, 0.06]], 32)), brassM(), PAD.x, DECK, PAD.z);
    // the lift pad
    const pad = new THREE.Group(); pad.position.set(PAD.x, DECK, PAD.z); group.add(pad);
    mesh(pad, cached('padtop', () => lathe([[0, -0.3], [PAD.r, -0.3], [PAD.r + 0.05, -0.05], [PAD.r - 0.05, 0.02], [0, 0.02]], 32)), tm('deck', { color: '#c8c0d8', rough: 0.6, metal: 0.3 }));
    mesh(pad, cached('padring', () => new THREE.RingGeometry(PAD.r - 0.35, PAD.r - 0.08, 32).rotateX(-Math.PI / 2)), tm('hazard', { rough: 0.6 }), 0, 0.03, 0, 0, { cast: false });
    mesh(pad, cached('padem', () => new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2)), emblemMaterial(), 0, 0.04, 0, 0, { cast: false });
    for (let k = 0; k < 4; k++) mesh(pad, cached('padrail', () => cyl(0.06, 0.06, 1.0, 8, 1)), brassM(), Math.sin(k * Math.PI / 2 + 0.6) * (PAD.r - 0.12), 0.5, Math.cos(k * Math.PI / 2 + 0.6) * (PAD.r - 0.12));
    const padCol = col({ type: 'cyl', x: PAD.x, z: PAD.z, r: SHAFT_R + 0.15, top: DECK, seeThrough: true }); // overlaps the deck: no gap to fall in
    // the derrick over the shaft: four lattice legs, girts, X braces, crown block, a hanging top drive
    const dH = 15, legB = 3.4, legT = 0.7;
    const leg = (sx, sz, y) => [PAD.x + sx * lerp(legB, legT, y / dH), DECK + y, PAD.z + sz * lerp(legB, legT, y / dH)];
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (const [sx, sz] of corners) { member(PB, leg(sx, sz, 0), leg(sx, sz, dH), 0.28, tealM(), 1, 0.04); PB.add(boxUV(bbox(0.8, 0.4, 0.8, 0.05, 1), TILE.concrete), tm('concrete', { color: '#d8d0d4' }), PAD.x + sx * legB, DECK + 0.2, PAD.z + sz * legB); col({ type: 'box', x: PAD.x + sx * legB, z: PAD.z + sz * legB, hw: 0.4, hd: 0.4, rot: 0, top: DECK + dH, seeThrough: true }); }
    for (let y = 3; y <= dH; y += 3) for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i], [bx, bz] = corners[(i + 1) % 4];
      member(PB, leg(ax, az, y), leg(bx, bz, y), 0.16, brassM(), 1, 0.03);
      if (y > 3 || i % 2 === 0) { member(PB, leg(ax, az, y - 3), leg(bx, bz, y), 0.1, darkSteel(), 1, 0.02); member(PB, leg(bx, bz, y - 3), leg(ax, az, y), 0.1, darkSteel(), 1, 0.02); }
    }
    PB.add(boxUV(bbox(2.2, 0.9, 2.2, 0.1, 1), TILE.brass), brassM(), PAD.x, DECK + dH + 0.45, PAD.z);
    PB.add(cached('sheave', () => new THREE.TorusGeometry(0.55, 0.12, 8, 20)), darkSteel(), PAD.x, DECK + dH + 1.2, PAD.z);
    PB.add(cached('beacon', () => new THREE.SphereGeometry(0.2, 12, 8)), pm('#ff9080', 0.3, { emissive: '#ff4030', emissiveIntensity: 2.4 }), PAD.x, DECK + dH + 1.9, PAD.z);
    PB.add(emq(), emblemMaterial(), PAD.x, DECK + dH + 0.45, PAD.z + 1.12, 0, 0, 0, 0.8);
    PB.add(emq(), emblemMaterial(), PAD.x - 1.12, DECK + dH + 0.45, PAD.z, 0, -Math.PI / 2, 0, 0.8);
    for (const s of [-0.25, 0.25]) rod(PB, [PAD.x + s, DECK + dH, PAD.z], [PAD.x + s, DECK + 7.3, PAD.z], 0.025, darkSteel(), 5);
    const drive = new THREE.Group(); drive.position.set(PAD.x, DECK + 6.4, PAD.z); group.add(drive);
    mesh(drive, boxUV(bbox(1.2, 1.4, 1.0, 0.1, 1), TILE.teal), tealM(), 0, 0.2, 0);
    mesh(drive, cached('drvcap', () => lathe([[0, 0], [0.5, 0], [0.3, 0.4], [0, 0.45]], 12)), brassM(), 0, 0.9, 0);
    mesh(drive, cyl(0.16, 0.16, 1.4, 12, 1), tm('pipe', { rough: 0.5, metal: 0.35 }), 0, -1.1, 0);
    mesh(drive, cached('drbit', () => lathe([[0.16, 0], [0.32, -0.1], [0.36, -0.4], [0.12, -0.75], [0, -0.85]], 12)), brassM(), 0, -1.8, 0);
    // pipe rack, drill motor housing, tanks, a control hut, floodlight masts, the big emblem
    for (let k = 0; k < 7; k++) PB.add(cyl(0.16, 0.16, 6.5, 10, 1).rotateZ(Math.PI / 2), tm('pipe', { rough: 0.5, metal: 0.35 }), 52.5, DECK + 0.62 + Math.floor(k / 4) * 0.3, 7.2 + (k % 4) * 0.34 + Math.floor(k / 4) * 0.17);
    for (const x of [49.6, 55.4]) PB.add(boxUV(bbox(0.3, 0.5, 1.8, 0.04, 1), 1), darkSteel(), x, DECK + 0.25, 7.7);
    col({ type: 'box', x: 52.5, z: 7.7, hw: 3.3, hd: 1.0, rot: 0, top: DECK + 1.2, noStand: false });
    PB.add(boxUV(bbox(3.0, 2.2, 2.2, 0.15, 1), TILE.teal), tealM(), 56.3, DECK + 1.1, -1.0);
    PB.add(lathe([[0, 0], [0.9, 0], [0.9, 1.6], [0.75, 1.8], [0, 1.85]], 18, TILE.brass), brassM(), 56.3, DECK + 2.2, -1.0, 0, 0, Math.PI / 2);
    PB.add(emq(), emblemMaterial(), 54.79, DECK + 1.2, -1.0, 0, -Math.PI / 2, 0, 1.1);
    col({ type: 'box', x: 56.3, z: -1.0, hw: 1.7, hd: 1.2, rot: 0, top: DECK + 3.2 });
    for (const [x, z] of [[57.4, 6.6], [57.4, 3.6]]) { PB.add(lathe([[0, 0], [1.0, 0], [1.0, 2.6], [0.8, 2.9], [0.3, 3.05], [0, 3.1]], 20, TILE.teal), tealM(), x, DECK, z); PB.add(cached('tkband', () => new THREE.TorusGeometry(1.02, 0.06, 6, 24).rotateX(Math.PI / 2)), brassM(), x, DECK + 1.2, z); col({ type: 'cyl', x, z, r: 1.05, top: DECK + 3.1 }); }
    {
      const hx = 52.8, hz = -8.3, w = 4.0, d = 2.8, h = 2.5, G = new THREE.Group(); G.position.set(hx, DECK, hz); group.add(G);
      const HB = new Batch(G);
      const wallM = tm('teal', { rough: 0.6, metal: 0.25, color: '#e8f4f2' });
      const door = { x: 1.0, y: 0.02, w: 1.0, h: 2.05 }, w1 = { x: -0.8, y: 1.0, w: 1.4, h: 0.8 };
      HB.add(panelGeo(w, h, 0.2, [door, w1], TILE.teal), wallM, 0, 0, d / 2 - 0.2);
      HB.add(panelGeo(w, h, 0.2, [], TILE.teal), wallM, 0, 0, -d / 2);
      for (const s of [-1, 1]) HB.add(panelGeo(d - 0.4, h, 0.2, [], TILE.teal), wallM, s * (w / 2 - 0.1), 0, 0, 0, s * Math.PI / 2, 0);
      HB.add(bbox(1.4, 0.8, 0.04, 0.01, 1), pm('#7fd8e8', 0.12, { metalness: 0.3, emissive: '#3ab8d0', emissiveIntensity: 0.5 }), -0.8, 1.4, d / 2 - 0.1);
      HB.add(bbox(0.96, 2.04, 0.06, 0.02, 1), tm('teal', { color: '#8ab4b4', rough: 0.5, metal: 0.35 }), 1.0, 1.04, d / 2 - 0.12);
      for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) HB.add(bbox(0.28, h + 0.1, 0.28, 0.05, 1), brassM(), cx * (w / 2 - 0.05), h / 2, cz * (d / 2 - 0.05));
      HB.add(boxUV(bbox(w + 0.5, 0.2, d + 0.5, 0.06, 1), TILE.brass), brassM(), 0, h + 0.1, 0);
      HB.add(cached('dish', () => lathe([[0, 0], [0.3, 0.02], [0.55, 0.12], [0.66, 0.22], [0.64, 0.24], [0.52, 0.14], [0.28, 0.05], [0, 0.04]], 18)), tm('concrete', { color: '#f4f0ea', rough: 0.5 }), 1.0, h + 0.75, 0, -0.8, 2.6, 0);
      HB.add(cyl(0.05, 0.07, 0.6, 8, 1), darkSteel(), 1.0, h + 0.4, 0);
      HB.build();
      col({ type: 'box', x: hx, z: hz, hw: w / 2 + 0.15, hd: d / 2 + 0.15, rot: 0, top: DECK + h + 0.3 });
    }
    PB.add(cached('bigem', () => new THREE.CircleGeometry(2.2, 32).rotateX(-Math.PI / 2)), pm('#2f7a84', 0.6, { metalness: 0.3 }), 44.3, DECK + 0.012, 0);
    PB.add(cached('bigemq', () => new THREE.PlaneGeometry(3.6, 3.6).rotateX(-Math.PI / 2)), emblemMaterial(), 44.3, DECK + 0.02, 0, 0, -Math.PI / 2, 0);
    // the gate across the neck: pylons, solid walls to the rim, a hazard lintel
    const gx = GATE.x;
    for (const s of [-1, 1]) {
      const pz = s * GATE.half;
      PB.add(lathe([[0.7, 0], [0.7, 0.4], [0.55, 0.5], [0.45, 4.2], [0.6, 4.35], [0.6, 4.6], [0.3, 4.9], [0, 5.0]], 16, TILE.teal), tealM(), gx, Y0, pz);
      for (const y of [1.0, 2.2, 3.4]) PB.add(cached('pyband', () => new THREE.TorusGeometry(0.5, 0.07, 6, 18).rotateX(Math.PI / 2)), brassM(), gx, Y0 + y, pz);
      PB.add(cached('emit', () => new THREE.SphereGeometry(0.32, 16, 12)), glowCyan(), gx, Y0 + 5.15, pz);
      PB.add(cached('emitr', () => new THREE.TorusGeometry(0.4, 0.05, 6, 20)), brassM(), gx, Y0 + 5.15, pz, Math.PI / 2, 0, 0);
      col({ type: 'cyl', x: gx, z: pz, r: 0.72, top: Y0 + 5.0 });
      // wall from the pylon to the rim
      const z0 = s * (GATE.half + 0.5), z1 = s * GATE.wall, len = Math.abs(z1 - z0);
      PB.add(panelGeo(len, 2.9, 0.4, [{ x: 0, y: 1.2, w: 0.7, h: 0.7, round: true }], TILE.teal), tm('teal', { rough: 0.6, metal: 0.25, color: '#d8ece8' }), gx - 0.2, Y0, (z0 + z1) / 2, 0, Math.PI / 2, 0);
      PB.add(cached('wport', () => new THREE.TorusGeometry(0.38, 0.06, 8, 20)), brassM(), gx - 0.24, Y0 + 1.55, (z0 + z1) / 2, 0, -Math.PI / 2, 0);
      PB.add(boxUV(bbox(0.6, 0.2, len + 0.2, 0.05, 1), TILE.brass), brassM(), gx, Y0 + 3.0, (z0 + z1) / 2);
      PB.add(boxUV(bbox(0.5, 0.3, len, 0.03, 1), TILE.hazard), tm('hazard', { rough: 0.6 }), gx, Y0 + 0.15, (z0 + z1) / 2);
      PB.add(boxUV(bbox(0.6, 3.2, 0.6, 0.06, 1), TILE.teal), tealM(), gx, Y0 + 1.6, z1);
      col({ type: 'box', x: gx, z: (z0 + z1) / 2, hw: 0.3, hd: len / 2 + 0.1, rot: 0, top: Y0 + 3.1 });
    }
    PB.add(boxUV(bbox(0.7, 0.45, GATE.half * 2 + 0.8, 0.06, 1), TILE.hazard), tm('hazard', { rough: 0.6 }), gx, Y0 + 4.55, 0);
    PB.add(boxUV(bbox(0.8, 0.14, GATE.half * 2 + 1.0, 0.04, 1), 1.6), brassM(), gx, Y0 + 4.85, 0);
    PB.add(emq(), emblemMaterial(), gx - 0.36, Y0 + 4.55, 0, 0, -Math.PI / 2, 0, 0.75);
    // the neck step up onto the deck
    PB.add(boxUV(bbox(1.2, DECK - Y0, 11.6, 0.03, 1), TILE.deck), tm('deck', { color: '#d4ccdc', rough: 0.65, metal: 0.25 }), 40.0, Y0 + (DECK - Y0) / 2, 0);
    col({ type: 'box', x: 39.9, z: 0, hw: 0.5, hd: 5.6, rot: 0, top: DECK, seeThrough: true });
    // console at the gate (outside, on the island side)
    const CX = 34.9, CZ = -4.3;
    {
      const G = new THREE.Group(); G.position.set(CX, Y0, CZ); G.rotation.y = -Math.PI / 2 + 0.35; group.add(G);
      const CB = new Batch(G);
      CB.add(boxUV(bbox(1.5, 1.0, 0.7, 0.08, 1), TILE.teal), tealM(), 0, 0.5, 0);
      CB.add(boxUV(bbox(1.6, 0.1, 0.9, 0.03, 1), 1), brassM(), 0, 1.02, 0.08, -0.35, 0, 0);
      CB.add(boxUV(bbox(1.2, 0.75, 0.12, 0.04, 1), 1), darkSteel(), 0, 1.55, -0.25, -0.15, 0, 0);
      CB.add(cached('cscreen', () => new THREE.PlaneGeometry(1.05, 0.6)), pm('#7ff8ff', 0.3, { emissive: '#30c8f0', emissiveIntensity: 1.4 }), 0, 1.56, -0.18, -0.15, 0, 0);
      for (let k = 0; k < 3; k++) { CB.add(cyl(0.025, 0.025, 0.3, 6, 1), darkSteel(), -0.45 + k * 0.3, 1.2, 0.2, 0.4, 0, 0); CB.add(cached('knobr', () => new THREE.SphereGeometry(0.06, 8, 6)), pm(['#e04030', '#e8b84a', '#40c060'][k], 0.4, { emissive: ['#802010', '#806010', '#106030'][k] }), -0.45 + k * 0.3, 1.33, 0.26); }
      CB.build();
      col({ type: 'box', x: CX, z: CZ, hw: 0.8, hd: 0.45, rot: -Math.PI / 2 + 0.35, top: Y0 + 1.1, noStand: true, seeThrough: true });
    }
    PB.build();
    // the shield: a curved translucent energy wall between the pylons
    const shieldMat = new THREE.MeshBasicMaterial({ map: shieldTex(), color: '#8ff4ff', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
    shieldMat.map = shieldMat.map.clone(); shieldMat.map.needsUpdate = true; shieldMat.map.repeat.set(3, 2);
    const sR = 3.6, sA = Math.asin(GATE.half / sR);
    const shGeo = new THREE.CylinderGeometry(sR, sR, 4.8, 24, 1, true, -Math.PI / 2 - sA, sA * 2);
    const shield = mesh(group, shGeo, shieldMat, gx + Math.cos(sA) * sR - 0.1, Y0 + 2.4, 0, 0, { cast: false });
    shield.renderOrder = 5;
    const capGeo = new THREE.SphereGeometry(sR, 24, 8, -Math.PI / 2 - sA + Math.PI / 2 * 0, sA * 2, 0, 0.5);
    void capGeo;
    const shieldCol = col({ type: 'box', x: gx, z: 0, hw: 0.45, hd: GATE.half + 0.2, rot: 0, top: Y0 + 6, seeThrough: true, noStand: true });
    const shieldApi = {
      on: true,
      setOn(b) { this.on = !!b; shieldCol.enabled = this.on; if (this.on) shield.visible = true; },
    };
    let fade = 1;
    updaters.push((dt, t) => {
      fade += ((shieldApi.on ? 1 : 0) - fade) * (1 - Math.exp(-dt * 6));
      shield.visible = fade > 0.02;
      shieldMat.opacity = fade * (0.55 + Math.sin(t * 3.1) * 0.08 + Math.sin(t * 17) * 0.04);
      shieldMat.map.offset.y = -t * 0.12;
      drive.rotation.y = t * 0.6;
    });
    // the lift: pad + whoever stands on it sinks 8 m into the shaft over ~3 s
    const lift = {
      busy: false, down: false,
      // lower(cb, actor?): the pad sinks with the hero (if standing on it) and `actor` (e.g. Vesk, or a list)
      lower(cb, riders) {
        if (this.busy) return;
        this.busy = true;
        const G = globalThis.game;
        const extra = riders ? (Array.isArray(riders) ? riders : [riders]) : [];
        const onPad = (a) => a && a.pos && Math.hypot(a.pos.x - (PAD.x + ox), a.pos.z - (PAD.z + oz)) < PAD.r + 0.3 && Math.abs(a.pos.y - padCol.top) < 0.8;
        const who = [...new Set(extra.filter((a) => a && a.pos).concat([G?.hero].filter(onPad)))];
        let tt = 0;
        const u = (dt) => {
          tt = Math.min(3, tt + dt);
          const k = tt / 3, e = k * k * (3 - 2 * k), y = DECK - 8 * e;
          pad.position.y = y; padCol.top = y;
          for (const a of who) { a.pos.y = y; a.vy = 0; a.onGround = true; a.sync?.(); }
          if (tt >= 3) {
            updaters.splice(updaters.indexOf(u), 1); this.down = true;
            cb?.();
            // the empty pad comes back up after a while so the shaft isn't left open
            let wait = 0;
            const back = (dt2) => {
              wait += dt2;
              if (wait < 2.5) return;
              const k2 = Math.min(1, (wait - 2.5) / 3), y2 = DECK - 8 * (1 - k2 * k2 * (3 - 2 * k2));
              pad.position.y = y2; padCol.top = y2;
              if (k2 >= 1) { updaters.splice(updaters.indexOf(back), 1); this.busy = false; this.down = false; }
            };
            updaters.push(back);
          }
        };
        updaters.push(u);
      },
      reset() { pad.position.y = DECK; padCol.top = DECK; this.down = false; this.busy = false; },
    };
    keepClear(34, -8, 62, 8);
    return { ...W(PAD.x, PAD.z), y: DECK, gate: W(GATE.x - 1.2, 0), console: W(CX, CZ), shield: shieldApi, pad: W(PAD.x, PAD.z), lift };
  }

  // ================================================================ the sea of clouds, puffs, distant islets
  function buildClouds() {
    const size = 1600;
    const mk = (tex, y, rep, color, opacity, speed, transparent) => {
      const map = tex.clone(); map.needsUpdate = true; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(rep, rep);
      const m = new THREE.MeshBasicMaterial({ map, color, transparent, opacity, depthWrite: !transparent, fog: true });
      const pl = mesh(group, cached('cloudpl', () => new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2)), m, 0, y, 0, 0, { cast: false });
      pl.receiveShadow = false; pl.renderOrder = transparent ? -1 : 0;
      updaters.push((dt, t) => { map.offset.set(t * speed, t * speed * 0.6); });
      return pl;
    };
    mk(cloudTex(true), CLOUD_Y - 2.5, 16, '#ffffff', 1, 0.0012, false);
    mk(cloudTex(false), CLOUD_Y, 11, '#ffffff', 0.9, 0.002, true);
    mk(cloudTex(false), CLOUD_Y + 1.8, 7, '#fff0f6', 0.6, -0.0015, true);
    // big puffs hugging the cliffs and drifting further out
    const ring = resample(ISL, 7);
    const puffs = [];
    const pm2 = new THREE.SpriteMaterial({ map: puffTex(), color: '#fff4f8', transparent: true, depthWrite: false, fog: true, opacity: 0.8 });
    const add = (x, y, z, s) => { const sp = new THREE.Sprite(pm2); sp.position.set(x, y, z); sp.scale.set(s * 1.6, s, 1); group.add(sp); puffs.push({ sp, y, ph: r() * 6 }); };
    let cx = 0, cz = 0; for (const [x, z] of ISL) { cx += x; cz += z; } cx /= ISL.length; cz /= ISL.length;
    ring.forEach(([x, z], i) => {
      const dx = x - cx, dz = z - cz, l = Math.hypot(dx, dz);
      if (i % 2 === 0) add(x + (dx / l) * (1 + r() * 4), CLOUD_Y + 0.5 + r() * 2, z + (dz / l) * (1 + r() * 4), 6 + r() * 5);
      if (r() < 0.25) add(x + (dx / l) * (20 + r() * 40), CLOUD_Y + 1 + r() * 3, z + (dz / l) * (20 + r() * 40), 10 + r() * 10);
    });
    for (const [x, z] of [[50, 0], [46, -9], [56, 8], [-58, 0], [-62, 6]]) add(x, CLOUD_Y + 2.5, z, 12 + r() * 6);
    updaters.push((dt, t) => { for (const p of puffs) p.sp.position.y = p.y + Math.sin(t * 0.25 + p.ph) * 0.4; });
  }
  function buildIslets() {
    const list = [[-110, -60, 9, 3], [-95, 70, 13, 6], [30, -95, 16, 5], [120, -50, 11, 2], [115, 60, 18, 7], [-40, 100, 10, 1], [70, 105, 8, 4], [-150, 10, 20, 8]];
    const IB = new Batch(group, { cast: false });
    for (const [x, z, s, seed] of list) {
      const rr = rng(seed * 17 + 1);
      const g = cached('islet' + seed, () => {
        const geo = lathe([[0, -1.6], [0.25, -1.25], [0.55, -0.7], [0.82, -0.3], [1.0, -0.06], [1.02, 0], [0.9, 0.06], [0, 0.1]], 18);
        const p = geo.attributes.position, c = [], cc = new THREE.Color();
        for (let i = 0; i < p.count; i++) {
          const px = p.getX(i), py = p.getY(i), pz = p.getZ(i), a = Math.atan2(px, pz);
          const k = 1 + Math.sin(a * 5 + seed) * 0.08 + Math.sin(a * 11 + py * 4) * 0.05;
          p.setXYZ(i, px * k, py * (1 + Math.sin(a * 3 + seed) * 0.15), pz * k);
          cc.set(py > -0.02 ? '#c8d880' : py > -0.15 ? '#8aa048' : '#b890b0').multiplyScalar(0.85 + 0.15 * Math.sin(py * 9 + a * 2));
          c.push(cc.r, cc.g, cc.b);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
        geo.computeVertexNormals();
        return geo;
      });
      const y = CLOUD_Y + 3 + rr() * 5;
      IB.add(g, VC(), x, y, z, 0, rr() * 6, 0, s, s * 1.2, s);
      // a tiny Esmer house with a dome on the bigger ones, a puff tree on others
      if (s > 10) {
        IB.add(bbox(3, 2.4, 3, 0.1, 2), tm('plasterWall', { color: '#fbf0f0' }), x, y + 0.1 * s * 1.2 + 1.2, z);
        IB.add(lathe([[1.0, 0], [1.15, 0.3], [1.1, 0.7], [0.7, 1.15], [0.3, 1.5], [0.03, 1.9]], 14, 1), tm(domeTex('#8a5ac0', '#e8c8ff'), { rough: 0.4 }), x, y + 0.1 * s * 1.2 + 2.4, z);
      } else {
        IB.add(puffTreeGeo(seed % 2), VC(), x + 1, y + 0.1 * s * 1.2, z, 0, 0, 0, 1.4);
      }
    }
    IB.build();
    const islets = group.children[group.children.length - 1];
    void islets;
  }

  // ================================================================ trees, rocks, grass and flowers
  function puffTreeGeo(v) {
    return cached('puff' + v, () => {
      const rr = rng(v * 13 + 5), parts = [];
      const trunk = tube([[0, -0.1, 0], [0.12, 1.0, 0.05], [0.05 + v * 0.2, 2.0, -0.1], [0.25, 2.8, 0.0]], 0.16, 7, 1);
      parts.push([tint(trunk, '#9a7a8a')]);
      const puffCols = v ? ['#f8c8dc', '#ffe8f2', '#f0b0d0'] : ['#e0c8f8', '#f4e8ff', '#c8a8f0'];
      const blobs = [[0.25, 3.3, 0, 1.15], [-0.6, 2.9, 0.3, 0.8], [0.9, 2.8, -0.2, 0.75], [0.1, 3.0, -0.7, 0.7], [0.3, 4.0, 0.2, 0.7]];
      for (const [bx, by, bz, br] of blobs) {
        const g = new THREE.IcosahedronGeometry(br, 2), p = g.attributes.position, c = [], cc = new THREE.Color(), nn = new THREE.Vector3();
        const base = new THREE.Color(puffCols[Math.floor(rr() * 3)]);
        for (let i = 0; i < p.count; i++) {
          nn.fromBufferAttribute(p, i).normalize();
          const k = 1 + Math.sin(nn.x * 7 + nn.y * 5 + bx) * 0.07 + Math.sin(nn.z * 9 - nn.y * 3) * 0.05;
          p.setXYZ(i, nn.x * br * k, nn.y * br * k * 0.85, nn.z * br * k);
          cc.copy(base).multiplyScalar(0.78 + 0.3 * (nn.y * 0.5 + 0.5));
          c.push(cc.r, cc.g, cc.b);
        }
        g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3)); g.deleteAttribute('uv');
        // smooth normals (the icosahedron is unindexed): bend them toward the blob's radial direction
        const N = g.attributes.normal; for (let i = 0; i < p.count; i++) { nn.fromBufferAttribute(p, i).normalize(); N.setXYZ(i, nn.x, nn.y, nn.z); }
        parts.push([g, bx, by, bz]);
      }
      const out = compose(parts.map(([g, x = 0, y = 0, z = 0]) => [g.attributes.uv ? g : (g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)), g), x, y, z]), true);
      return out;
    });
  }
  function scatter() {
    // puff trees
    const trees = [[-45, -15], [-33, -18.5], [-19.5, -16.5], [-30, 15.5], [-23, 17.5], [-46, 12], [6, -12], [12, -22], [29, -10], [30, 12], [-14, 22], [-28, 22.5], [28, 20], [8, -6.5], [-6, -24], [-38, -21]];
    const items = [[], []];
    for (const [x, z] of trees) {
      if (!onIsland(x, z, 2) || !isClear(x, z, 1)) continue;
      const v = items[0].length <= items[1].length ? 0 : 1;
      const s = 0.9 + r() * 0.35, it = { x, y: Y0 - 0.05, z, ry: r() * 6, s };
      if (zlClear(x, z, 1)) continue;   // (after the draws: the island's other trees keep their places)
      items[v].push(it);
      col({ type: 'cyl', x, z, r: 0.3, top: Y0 + 2.6 * s, seeThrough: true });
    }
    items.forEach((list, v) => instances(group, puffTreeGeo(v), VC(), list));
    // rocks along the rim and in the grass
    const rocks = [[], [], []];
    for (const it of rimRocks) rocks[Math.floor(r() * 3)].push(it);
    for (let i = 0; i < 14; i++) {
      const x = -48 + r() * 84, z = -28 + r() * 56;
      if (!onIsland(x, z, 1.2) || !isClear(x, z, 1.5)) continue;
      const s = 0.25 + r() * 0.5, it = { x, y: Y0 - 0.1, z, ry: r() * 6, s, color: new THREE.Color('#fff0ff').multiplyScalar(0.95 + r() * 0.15) };
      if (zlClear(x, z, 1)) continue;
      rocks[i % 3].push(it);
      if (s > 0.45) col({ type: 'cyl', x, z, r: 1.0 * s, top: Y0 + 0.9 * s, seeThrough: true });
    }
    const rockMat = pm('#ffffff', 0.9, { vertexColors: true, emissive: '#3a2030', emissiveIntensity: 0.4 });
    rocks.forEach((list, v) => { if (list.length) instances(group, rockGeometry(v + 1), rockMat, list); });
    // grass clumps and flowers
    const grass = [], flowers = [[], [], [], []];
    for (let i = 0; i < 900; i++) {
      const x = -50 + r() * 88, z = -30 + r() * 60;
      if (!onIsland(x, z, 0.3) || !isClear(x, z, 0.2)) continue;
      const patch = Math.sin(x * 0.21) + Math.sin(z * 0.27 + x * 0.05);
      if (patch < -0.6) continue;
      const gr = { x, y: Y0 - 0.02, z, ry: r() * 6, s: 0.8 + r() * 0.7, color: new THREE.Color().setHSL(0.16 + r() * 0.06, 0.45, 0.55 + r() * 0.15) };
      const fl = r() < 0.35 ? [Math.floor(r() * 4), { x: x + (r() - 0.5) * 0.6, y: Y0, z: z + (r() - 0.5) * 0.6, ry: r() * 6, s: 0.9 + r() * 0.6 }] : null;
      if (zlClear(x, z, 0.1)) continue;   // (the draws are made either way)
      grass.push(gr);
      if (fl) flowers[fl[0]].push(fl[1]);
    }
    instances(group, grassClumpGeometry(5, 9), pm('#ffffff', 0.9, { vertexColors: true, side: THREE.DoubleSide }), grass, { cast: false });
    ['#ff8ac0', '#ffffff', '#c89cff', '#ffd84a'].forEach((c, k) => instances(group, flowerGeometry(c), pm('#ffffff', 0.7, { vertexColors: true }), flowers[k], { cast: false }));
    // flower beds around the plaza and along the house fronts
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2, x = PLAZA.x + Math.sin(a) * (PLAZA.r + 0.8), z = PLAZA.z + Math.cos(a) * (PLAZA.r + 0.8);
      if (Math.abs(z) < 4.5 || !isClear(x, z, -0.5)) continue;
      plantAt(x, Y0, z, i % 3, 0.6);
    }
  }
}
const lamps = [];
const rimRocks = [];
