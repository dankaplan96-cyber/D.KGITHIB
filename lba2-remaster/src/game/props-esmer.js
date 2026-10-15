// Esmer street furniture and set pieces for Zeelich's islands (src/game/zislands.js): bins, planters with
// Zeelich plants, sign posts with arrow boards, benches, crates, jars, market stalls, pennant lines, banners,
// hives and honey, flower beds, garlands, a statue plinth, gas pipes and machinery, cranes, warning signs, a
// radio mast, a landing stage with moored cloud skiffs. Our own pieces in our style (no original graphics):
// pastel plaster, brass, glazed tiles in teal/gold/rose, striped canvas, vertex-painted parts.
//
// Every builder draws into a kit.js Batch through a Place (a local frame at x,y,z turned ry about +y), so the
// pieces merge with the island's own meshes per material (one draw call per material for the whole island),
// and records the colliders it needs in Place.cols (island-local; the caller adds them to physics) and its
// footprint radius in Place.r (for spacing and the walkability check). Materials are the island builder's own
// where they exist (same kit.js cache keys), so most pieces add no new material at all.
import * as THREE from 'three';
import { tm, pm, cached, bbox, cyl, lathe, tube, compose, tint, ctex, brassM, VC } from './kit.js';
import { rng } from '../engine/math.js';
import { tulipGeometry } from './vegetation.js';

// ================================================================== materials (shared with zislands.js)
export const EM = {
  wood: () => tm('planks', { color: '#d8b080' }),
  stone: () => tm('stone', { color: '#ecdce4' }),
  brass: () => brassM(),
  vc: () => VC(),
  glow: () => pm('#fff4d8', 0.3, { emissive: '#ffd890', emissiveIntensity: 1.2 }),
  tiles: () => cm(tileTex(), { rough: 0.45 }),
  canvas: (a, b) => cm(stripeTex(a, b), { rough: 0.9, side: THREE.DoubleSide }),
  metal: () => tm('metal', { color: '#a8b0b8', rough: 0.5, metal: 0.45 }),
  rust: () => tm('metal', { color: '#8a6a5a', rough: 0.7, metal: 0.3 }),
  teal: () => tm('teal', { rough: 0.55, metal: 0.3 }),
  hazard: () => tm('hazard', { rough: 0.7 }),
  pipe: () => tm('pipe', { rough: 0.5, metal: 0.35 }),
  honey: () => pm('#f2a428', 0.22, { emissive: '#a04a00', emissiveIntensity: 0.35 }),
  dark: () => pm('#2a2230', 0.7),
};

// a material for a painted canvas texture (kit.tm keys by name, which for a texture object isn't unique)
const CM = new Map();
export function cm(tex, opts = {}) {
  const key = tex.uuid + JSON.stringify(opts);
  if (!CM.has(key)) CM.set(key, new THREE.MeshStandardMaterial({ map: tex, color: opts.color || '#ffffff', roughness: opts.rough ?? 0.88, metalness: opts.metal ?? 0, side: opts.side ?? THREE.FrontSide }));
  return CM.get(key);
}
// glazed tiles: a band of diamonds (the Zeelich look), seamless
export const tileTex = (a = '#2f8a9a', b = '#e8b84a', c = '#d8608a') => ctex('etiles' + a + b + c, 128, 128, (x, S) => {
  x.fillStyle = '#f4ead8'; x.fillRect(0, 0, S, S);
  const q = S / 4;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const cx = i * q + q / 2, cy = j * q + q / 2;
    x.fillStyle = (i + j) % 2 ? a : c;
    x.beginPath(); x.moveTo(cx, cy - q * 0.42); x.lineTo(cx + q * 0.42, cy); x.lineTo(cx, cy + q * 0.42); x.lineTo(cx - q * 0.42, cy); x.closePath(); x.fill();
    x.fillStyle = b; x.beginPath(); x.arc(cx, cy, q * 0.1, 0, 7); x.fill();
  }
  x.strokeStyle = 'rgba(90,60,50,0.35)'; x.lineWidth = 2;
  for (let k = 0; k <= 4; k++) { x.beginPath(); x.moveTo(k * q, 0); x.lineTo(k * q, S); x.stroke(); x.beginPath(); x.moveTo(0, k * q); x.lineTo(S, k * q); x.stroke(); }
});
export const stripeTex = (a, b) => ctex('estripe' + a + b, 64, 64, (x, S) => {
  for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect((i * S) / 4, 0, S / 4, S); }
  const r = rng(a.length * 7 + b.length); x.fillStyle = 'rgba(0,0,0,0.07)';
  for (let i = 0; i < 40; i++) x.fillRect(r() * S, r() * S, 1, 4);
});

// the sign boards' words: one atlas for every island (a row per word), cream letters on plum
const SIGN_ROWS = 48;
let SIGN_WORDS = [];
export function setSignWords(words) { SIGN_WORDS = [...new Set(words)].slice(0, SIGN_ROWS); }
const signTex = () => ctex('esigns' + SIGN_WORDS.join('|'), 256, 3072, (x, W, H) => {
  const rh = H / SIGN_ROWS;
  SIGN_WORDS.forEach((w, i) => {
    const y = i * rh;
    x.fillStyle = '#5a2e52'; x.fillRect(0, y, W, rh);
    x.fillStyle = '#7a4a6a'; x.fillRect(0, y + rh - 4, W, 4);
    x.strokeStyle = '#e8c070'; x.lineWidth = 4; x.strokeRect(5, y + 5, W - 10, rh - 10);
    let size = 40; x.font = `bold ${size}px sans-serif`;
    while (x.measureText(w).width > W - 26 && size > 14) { size--; x.font = `bold ${size}px sans-serif`; }
    x.fillStyle = '#fbeede'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(w, W / 2, y + rh / 2 + 1);
  });
}, false);
export const signMat = () => cm(signTex(), { rough: 0.7 });
// a plane showing word i of the atlas
function wordPlane(word, w, h) {
  const i = Math.max(0, SIGN_WORDS.indexOf(word));
  return cached(`eword${word}|${w}|${h}|${SIGN_WORDS.length}`, () => {
    const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
    const v0 = 1 - (i + 1) / SIGN_ROWS, v1 = 1 - i / SIGN_ROWS;
    for (let k = 0; k < uv.count; k++) uv.setY(k, uv.getY(k) > 0.5 ? v1 - 0.002 : v0 + 0.002);
    return g;
  });
}

// ================================================================== a local frame
export class Place {
  constructor(B, x, y, z, ry = 0) { this.B = B; this.x = x; this.y = y; this.z = z; this.ry = ry; this.c = Math.cos(ry); this.s = Math.sin(ry); this.cols = []; this.r = 0.5; this.extra = []; }
  pt(lx, lz) { return [this.x + this.c * lx + this.s * lz, this.z - this.s * lx + this.c * lz]; }
  add(geo, mat, lx = 0, ly = 0, lz = 0, rx = 0, lry = 0, rz = 0, sx = 1, sy = sx, sz = sx) {
    const [wx, wz] = this.pt(lx, lz);
    this.B.add(geo, mat, wx, this.y + ly, wz, rx, this.ry + lry, rz, sx, sy, sz);
    return this;
  }
  cyl(lx, lz, r, top, o = {}) { const [x, z] = this.pt(lx, lz); this.cols.push({ type: 'cyl', x, z, r, top: this.y + top, noStand: true, seeThrough: true, ...o }); }
  box(lx, lz, hw, hd, top, o = {}) { const [x, z] = this.pt(lx, lz); this.cols.push({ type: 'box', x, z, hw, hd, rot: this.ry + (o.lry || 0), top: this.y + top, noStand: true, seeThrough: true, ...o }); }
}
const T = (geo, color, key) => cached('etint' + key + color, () => tint(geo, color));

// ================================================================== street furniture
// waste bin: an eight-sided painted body with brass bands and a domed lid
export function bin(P, { color = '#2f7f86' } = {}) {
  const body = cached('ebin', () => lathe([[0, 0], [0.24, 0], [0.27, 0.04], [0.3, 0.72], [0.31, 0.76], [0, 0.76]], 8));
  P.add(T(body, color, 'bin'), EM.vc(), 0, 0, 0, 0, Math.PI / 8);
  for (const y of [0.12, 0.62]) P.add(cached('ebinband' + y, () => new THREE.TorusGeometry(y < 0.3 ? 0.265 : 0.3, 0.022, 4, 8).rotateX(Math.PI / 2)), EM.brass(), 0, y, 0, 0, Math.PI / 8);
  P.add(cached('ebinlid', () => lathe([[0, 0], [0.33, 0], [0.32, 0.05], [0.24, 0.14], [0.08, 0.2], [0.05, 0.27], [0.07, 0.3], [0, 0.31]], 8)), EM.brass(), 0, 0.76, 0, 0, Math.PI / 8);
  P.add(cached('ebinslot', () => bbox(0.26, 0.07, 0.04, 0.01)), EM.dark(), 0, 0.68, 0.29);
  P.cyl(0, 0, 0.34, 1.05); P.r = 0.45;
  return P;
}

// Zeelich plants (orb stalks, striped bulbs, curl ferns), vertex-coloured, glowing orbs
export function zplant(P, kind, lx = 0, ly = 0, lz = 0, s = 1) {
  const r = rng(Math.round((P.x * 13 + P.z * 7 + kind) * 10));
  if (kind === 0) {
    const stem = cached('eorbstem', () => compose([0, 1, 2, 3, 4].map((k) => { const a = (k / 5) * Math.PI * 2, hh = 0.8 + (k % 3) * 0.3; return [tint(tube([[0, 0, 0], [Math.sin(a) * 0.12, hh * 0.5, Math.cos(a) * 0.12], [Math.sin(a) * 0.3, hh, Math.cos(a) * 0.3]], 0.025, 4, 1), '#4a9a6a')]; }).concat([[tint(new THREE.SphereGeometry(0.3, 8, 5), '#3f7a4a'), 0, 0.05, 0, 0, 0, 0, 1, 0.45, 1]]), true));
    P.add(stem, EM.vc(), lx, ly, lz, 0, r() * 6, 0, s);
    const orbs = cached('eorbs', () => compose([0, 1, 2, 3, 4].map((k) => { const a = (k / 5) * Math.PI * 2, hh = 0.8 + (k % 3) * 0.3; return [tint(new THREE.SphereGeometry(0.085 + (k % 2) * 0.03, 8, 6), ['#ffd0f0', '#c8f8ff', '#fff0b0'][k % 3]), Math.sin(a) * 0.3, hh + 0.05, Math.cos(a) * 0.3]; }), true));
    P.add(orbs, glowVC(), lx, ly, lz, 0, r() * 6, 0, s);
  } else if (kind === 1) {
    const g = cached('ebulbplant', () => {
      const bulb = lathe([[0, 0], [0.2, 0.05], [0.27, 0.2], [0.22, 0.4], [0.1, 0.56], [0.03, 0.74], [0, 0.76]], 10);
      const c = [], p = bulb.attributes.position, cc = new THREE.Color();
      for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getX(i), p.getZ(i)); cc.set(Math.floor(((a + Math.PI) / (Math.PI * 2)) * 10 + p.getY(i) * 3) % 2 ? '#c860d0' : '#f0a0d8'); c.push(cc.r, cc.g, cc.b); }
      bulb.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
      const parts = [[bulb, 0, 0, 0], [bulb, 0.28, 0, 0.14, 0, 1, 0.2, 0.7], [bulb, -0.24, 0, -0.18, 0, 2, -0.2, 0.6]];
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; parts.push([tint(new THREE.SphereGeometry(0.33, 7, 4), '#5aa86a'), Math.sin(a) * 0.3, 0.1, Math.cos(a) * 0.3, 0.3, a, 0, 0.35, 0.08, 1]); }
      return compose(parts, true);
    });
    P.add(g, EM.vc(), lx, ly, lz, 0, r() * 6, 0, s);
  } else {
    const g = cached('ecurlfern', () => compose([0, 1, 2, 3, 4, 5].map((k) => {
      const a = (k / 6) * Math.PI * 2, pts = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8, rr = 0.5 * (1 - t * 0.6), ang = t * 4; pts.push([Math.sin(a) * (0.1 + t * 0.55) + Math.sin(a + 1.6) * Math.sin(ang) * 0.12 * t, 0.15 + Math.sin(t * 2.6) * 0.8 * rr + t * 0.25, Math.cos(a) * (0.1 + t * 0.55) + Math.cos(a + 1.6) * Math.sin(ang) * 0.12 * t]); }
      return [tint(tube(pts, 0.045, 4, 1), k % 2 ? '#3f9a8a' : '#58b070')];
    }), true));
    P.add(g, EM.vc(), lx, ly, lz, 0, r() * 6, 0, s);
  }
}
// the orbs glow (their own vertex colours, a shared emissive)
const glowVC = () => pm('#ffffff', 0.35, { vertexColors: true, emissive: '#ffb0d8', emissiveIntensity: 0.6 });

// planter: a turned stone pot with a tiled band, a Zeelich plant in it
export function planter(P, { kind = 0, big = false } = {}) {
  const s = big ? 1.25 : 1;
  P.add(cached('epot', () => lathe([[0, 0.05], [0.5, 0], [0.58, 0.07], [0.56, 0.42], [0.64, 0.47], [0.64, 0.56], [0.5, 0.56], [0.5, 0.5], [0, 0.5]], 8, 1.2)), EM.stone(), 0, 0, 0, 0, Math.PI / 8, 0, s);
  P.add(cached('epotband', () => cyl(0.565, 0.565, 0.16, 8, 0.5, true)), EM.tiles(), 0, 0.24 * s, 0, 0, Math.PI / 8, 0, s);
  zplant(P, kind, 0, 0.5 * s, 0, 0.85 * s);
  P.cyl(0, 0, 0.66 * s, 0.9); P.r = 0.75 * s;
  return P;
}
// a long box planter (a curb of stone, a soil top, bushes and tulips)
export function boxPlanter(P, { len = 2.2, colors = ['#e8343a', '#f0c030', '#c050d0'] } = {}) {
  P.add(bbox(len, 0.5, 0.7, 0.04, 1.8), EM.stone(), 0, 0.25, 0);
  P.add(bbox(len - 0.02, 0.12, 0.72, 0.02, 0.5), EM.tiles(), 0, 0.42, 0);
  P.add(T(bbox(len - 0.16, 0.06, 0.56, 0.02), '#5a3a2a', 'soil' + len), EM.vc(), 0, 0.48, 0);
  const n = Math.round(len / 0.22);
  for (let i = 0; i < n; i++) for (const zz of [-0.14, 0.14]) {
    P.add(cached('etulip' + colors[(i + (zz > 0 ? 1 : 0)) % colors.length], () => tulipGeometry(colors[(i + (zz > 0 ? 1 : 0)) % colors.length])), EM.vc(), -len / 2 + 0.16 + (i + (zz > 0 ? 0.5 : 0)) * ((len - 0.32) / n), 0.5, zz, 0, i * 1.3, 0, 1.25);
  }
  P.box(0, 0, len / 2 + 0.02, 0.37, 0.75); P.r = len / 2 + 0.2;
  return P;
}

// bench: stone ends, a plank seat, a tiled back
export function bench(P) {
  for (const s of [-1, 1]) P.add(bbox(0.22, 0.46, 0.52, 0.05, 1), EM.stone(), s * 0.78, 0.23, 0);
  for (let k = 0; k < 3; k++) P.add(bbox(1.8, 0.06, 0.15, 0.02, 1), EM.wood(), 0, 0.49, -0.17 + k * 0.17);
  P.add(bbox(1.86, 0.44, 0.09, 0.03, 1), EM.tiles(), 0, 0.82, -0.27, -0.1);
  for (const s of [-1, 1]) P.add(cyl(0.035, 0.035, 0.5, 6), EM.brass(), s * 0.78, 0.75, -0.27);
  P.box(0, 0, 0.95, 0.34, 0.85); P.r = 1.0;
  return P;
}

// lamp: the Esmer street lamp (brass post, a curled arm, a lantern)
export function lamp(P) {
  const g = cached('elamp', () => compose([
    [lathe([[0, 0], [0.26, 0], [0.26, 0.1], [0.17, 0.2], [0.11, 0.5], [0.09, 0.58], [0.11, 0.64], [0, 0.64]], 8)],
    [cyl(0.05, 0.065, 2.7, 8), 0, 1.95, 0], [new THREE.TorusGeometry(0.085, 0.022, 4, 10).rotateX(Math.PI / 2), 0, 1.1, 0],
    [tube([[0, 3.2, 0], [0.12, 3.52, 0], [0.4, 3.6, 0], [0.6, 3.48, 0], [0.62, 3.34, 0]], 0.03, 5, 1)],
    [lathe([[0, 0], [0.19, 0.02], [0.15, 0.11], [0.06, 0.24], [0.02, 0.36], [0, 0.38]], 8), 0.62, 3.18, 0],
    [lathe([[0, 0], [0.13, 0], [0.15, 0.04], [0.11, 0.06], [0, 0.06]], 8), 0.62, 2.66, 0],
    [lathe([[0, 0], [0.04, 0], [0.04, 0.3], [0.08, 0.36], [0, 0.46]], 6), 0, 3.2, 0],
  ]));
  P.add(g, EM.brass());
  P.add(cached('elampglass', () => lathe([[0.05, 0], [0.14, 0.08], [0.18, 0.27], [0.14, 0.44], [0.06, 0.52]], 8).translate(0.62, 2.68, 0)), EM.glow());
  P.cyl(0, 0, 0.22, 3.4); P.r = 0.4;
  return P;
}

// sign post: a brass post, a finial, arrow boards at their own headings (world angles: 0 = +z) with words
export function signpost(P, boards) {
  P.add(cached('esignpost', () => compose([
    [lathe([[0, 0], [0.16, 0], [0.16, 0.08], [0.09, 0.16], [0, 0.16]], 8)],
    [cyl(0.045, 0.055, 2.75, 8), 0, 1.45, 0],
    [new THREE.SphereGeometry(0.09, 8, 6), 0, 2.88, 0],
    [lathe([[0, 0], [0.03, 0], [0.012, 0.18], [0, 0.2]], 6), 0, 2.95, 0],
  ])), EM.brass());
  const arrow = cached('earrow', () => { const s = new THREE.Shape(); s.moveTo(0, -0.13); s.lineTo(0.86, -0.13); s.lineTo(1.04, 0); s.lineTo(0.86, 0.13); s.lineTo(0, 0.13); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 0.045, bevelEnabled: false }); g.translate(0, 0, -0.0225); return tint(g, '#5a2e52'); });
  boards.forEach((b, i) => {
    const y = 2.45 - i * 0.34, ang = b.ang;   // the board's +x points along ang (world: x = sin, z = cos)
    const lry = Math.atan2(-Math.cos(ang), Math.sin(ang)) - P.ry;
    const at = (d) => [Math.cos(lry) * d, -Math.sin(lry) * d];
    const [ax, az] = at(0.06);
    P.add(arrow, EM.vc(), ax, y, az, 0, lry);
    const [tx, tz] = at(0.06 + 0.44);
    const nx = Math.sin(lry) * 0.026, nz = Math.cos(lry) * 0.026;   // the board's own +z (face normal)
    P.add(wordPlane(b.text, 0.8, 0.2), signMat(), tx + nx, y, tz + nz, 0, lry);
    P.add(wordPlane(b.text, 0.8, 0.2), signMat(), tx - nx, y, tz - nz, 0, lry + Math.PI);
  });
  P.cyl(0, 0, 0.18, 3.0); P.r = 0.5;
  return P;
}

// crates: planks in a frame of darker battens; 'nectar' has a painted band and a flower mark, 'cargo' is teal
export function crate(P, { s = 0.7, kind = 'wood', lx = 0, ly = 0, lz = 0, lry = 0 } = {}) {
  const sub = new Place(P.B, ...(() => { const [x, z] = P.pt(lx, lz); return [x, P.y + ly, z]; })(), P.ry + lry);
  if (kind === 'cargo') sub.add(cached('ecargo' + s, () => bbox(s * 1.3, s, s, 0.03, 1.2)), EM.teal(), 0, s / 2, 0);
  else sub.add(cached('ecrate' + s, () => bbox(s, s, s, 0.02, 0.7)), EM.wood(), 0, s / 2, 0);
  const w = kind === 'cargo' ? s * 1.3 : s;
  // edge battens
  const bat = cached('ecbat' + w + s, () => compose([[-1, -1], [1, -1], [-1, 1], [1, 1]].flatMap(([a, b]) => [
    [bbox(0.06, s + 0.02, 0.06, 0.01), a * (w / 2 - 0.02), s / 2, b * (s / 2 - 0.02)],
    [bbox(w + 0.02, 0.06, 0.06, 0.01), 0, (a > 0 ? s - 0.02 : 0.02), b * (s / 2 - 0.02)],
    [bbox(0.06, 0.06, s + 0.02, 0.01), a * (w / 2 - 0.02), (b > 0 ? s - 0.02 : 0.02), 0],
  ])));
  sub.add(kind === 'cargo' ? bat : T(bat, '#7a5232', 'bat' + w + s), kind === 'cargo' ? EM.brass() : EM.vc());
  if (kind === 'nectar') {
    sub.add(T(cached('ecband' + s, () => bbox(s + 0.025, s * 0.22, s + 0.025, 0.01)), '#f0b030', 'nb' + s), EM.vc(), 0, s * 0.55, 0);
    sub.add(T(cached('ecflower', () => compose([0, 1, 2, 3, 4].map((k) => [new THREE.CircleGeometry(0.07, 8), Math.sin(k * 1.257) * 0.08, Math.cos(k * 1.257) * 0.08, 0]))), '#c8406a', 'cf'), EM.vc(), 0, s * 0.55, s / 2 + 0.016);
  }
  P.cols.push(...sub.cols);
  return P;
}
// a stack of 2–4 crates (the bottom ones side by side), a collider round all of them
export function crateStack(P, { seed = 1, kind = 'wood', n = 3 } = {}) {
  const r = rng(seed * 97 + 3), s = 0.62 + r() * 0.12;
  const w = kind === 'cargo' ? s * 1.3 : s;
  crate(P, { s, kind, lx: -w * 0.52, lry: (r() - 0.5) * 0.15 });
  if (n > 1) crate(P, { s, kind, lx: w * 0.52, lry: (r() - 0.5) * 0.2 });
  if (n > 2) crate(P, { s: s * 0.86, kind, lx: (r() - 0.5) * 0.3, ly: s, lry: (r() - 0.5) * 0.5 });
  if (n > 3) crate(P, { s: s * 0.8, kind, lx: w * 0.3, lz: s * 0.95, lry: r() });
  P.box(0, n > 3 ? s * 0.45 : 0, w + 0.05, n > 3 ? s * 0.98 : s * 0.55, n > 2 ? s * 1.86 : s);
  P.r = w + 0.35;
  return P;
}
// barrel: staves and two brass hoops
export function barrel(P, { lx = 0, lz = 0, color = '#b07850' } = {}) {
  P.add(T(cached('ebarrel', () => lathe([[0, 0], [0.27, 0], [0.32, 0.2], [0.34, 0.42], [0.32, 0.64], [0.27, 0.84], [0, 0.84]], 10)), color, 'barrel'), EM.vc(), lx, 0, lz);
  for (const y of [0.16, 0.68]) P.add(cached('ebhoop' + y, () => new THREE.TorusGeometry(0.31, 0.018, 4, 12).rotateX(Math.PI / 2)), EM.brass(), lx, y, lz);
  P.cyl(lx, lz, 0.36, 0.9); P.r = Math.max(P.r, Math.hypot(lx, lz) + 0.45);
  return P;
}
// jars: glazed, tiled ones in a cluster
export function jars(P, { n = 3, seed = 1 } = {}) {
  const r = rng(seed * 31 + 5), jar = cached('ejar', () => lathe([[0, 0], [0.16, 0], [0.24, 0.16], [0.25, 0.34], [0.16, 0.52], [0.1, 0.56], [0.12, 0.64], [0, 0.64]], 10, 0.5));
  let rad = 0;
  for (let i = 0; i < n; i++) {
    const a = i * 2.4 + r(), d = i ? 0.38 + r() * 0.1 : 0, s = 0.8 + r() * 0.5, x = Math.sin(a) * d, z = Math.cos(a) * d;
    P.add(jar, EM.tiles(), x, 0, z, 0, r() * 6, 0, s);
    rad = Math.max(rad, d + 0.26 * s);
  }
  P.cyl(0, 0, rad, 0.9); P.r = rad + 0.25;
  return P;
}
// honey jars: amber, a cloth cap tied with string (on a crate, a stall or the ground)
export function honeyJars(P, { n = 4, lx = 0, ly = 0, lz = 0, seed = 2, collide = true } = {}) {
  const r = rng(seed * 13 + 1);
  const jar = cached('ehjar', () => lathe([[0, 0], [0.09, 0], [0.11, 0.03], [0.11, 0.16], [0.08, 0.2], [0.08, 0.22], [0, 0.22]], 10));
  const cap = cached('ehcap', () => tint(lathe([[0, 0.2], [0.1, 0.2], [0.115, 0.17], [0.11, 0.24], [0.04, 0.27], [0, 0.27]], 8), '#f4e6c8'));
  for (let i = 0; i < n; i++) {
    const x = lx + ((i % 3) - 1) * 0.24 + (r() - 0.5) * 0.04, z = lz + (Math.floor(i / 3) - 0.5) * 0.24, s = 0.9 + r() * 0.4;
    P.add(jar, EM.honey(), x, ly, z, 0, 0, 0, s);
    P.add(cap, EM.vc(), x, ly, z, 0, r() * 6, 0, s);
  }
  if (collide && ly < 0.3) P.cyl(lx, lz, 0.4, 0.7);
  return P;
}

// market stall: timber posts, a counter with a tiled front, a striped canopy, goods on it
export function stall(P, { a = '#e8608a', b = '#f8eee4', goods = 'fruit', seed = 1 } = {}) {
  const r = rng(seed * 7 + 11);
  for (const [px, pz] of [[-1.5, -0.8], [1.5, -0.8], [-1.5, 0.8], [1.5, 0.8]]) P.add(bbox(0.12, pz < 0 ? 2.5 : 2.2, 0.12, 0.03, 1), EM.wood(), px, (pz < 0 ? 2.5 : 2.2) / 2, pz);
  P.add(bbox(3.2, 0.86, 0.66, 0.04, 1), EM.wood(), 0, 0.43, 0.55);
  P.add(bbox(3.3, 0.07, 0.8, 0.02, 1), EM.wood(), 0, 0.9, 0.55);
  P.add(bbox(3.2, 0.24, 0.05, 0.01, 0.5), EM.tiles(), 0, 0.66, 0.9);
  const canopy = cached('ecanopy', () => { const s = new THREE.Shape(); s.moveTo(-1.8, 0); for (let i = 0; i <= 8; i++) s.lineTo(-1.8 + (i / 8) * 3.6, i % 2 ? -0.16 : 0); s.lineTo(1.8, 0.05); s.lineTo(-1.8, 0.05); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 2.2, bevelEnabled: false }); g.translate(0, 0, -1.1); g.rotateX(0.24); return g; });
  // (the canopy's UVs from the extrude: stripes run along x)
  P.add(cached('ecanopyuv', () => { const g = canopy.clone(), p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 0.9, p.getZ(i) / 0.9); return g; }), EM.canvas(a, b), 0, 2.36, 0);
  if (goods === 'fruit') {
    for (let i = 0; i < 22; i++) P.add(cached('efruit' + (i % 4), () => tint(new THREE.SphereGeometry(0.085 + (i % 4) * 0.014, 7, 5), ['#ff7a3a', '#e8d040', '#b048c8', '#f05070'][i % 4])), EM.vc(), -1.3 + (i % 11) * 0.24 + (r() - 0.5) * 0.05, 1.0 + Math.floor(i / 11) * 0.04, 0.42 + Math.floor(i / 11) * 0.26);
  } else if (goods === 'honey') honeyJars(P, { n: 6, lx: -0.6, ly: 0.94, lz: 0.55, seed, collide: false }), honeyJars(P, { n: 5, lx: 0.7, ly: 0.94, lz: 0.55, seed: seed + 1, collide: false });
  else if (goods === 'cloth') {
    for (let i = 0; i < 5; i++) P.add(T(cached('ebolt', () => cyl(0.09, 0.09, 0.62, 8).rotateZ(Math.PI / 2)), ['#3a7ac8', '#e8b84a', '#c84a7a', '#4aa88a', '#f4e6c8'][i], 'bolt' + i), EM.vc(), -1.1 + i * 0.5, 1.03, 0.5 + (i % 2) * 0.1, 0, (r() - 0.5) * 0.3);
  } else {
    jars(new Place(P.B, ...(() => { const [x, z] = P.pt(-0.8, 0.5); return [x, P.y + 0.94, z]; })(), P.ry), { n: 3, seed });
  }
  for (let i = 0; i < 2; i++) crate(P, { s: 0.5, lx: -1.1 + i * 2.1, lz: -0.45, lry: r() - 0.5 });
  P.cols.length = 0;   // (the crates' own colliders: the stall's covers them)
  P.box(0, 0.55, 1.65, 0.42, 1.0);
  for (const [px, pz] of [[-1.5, -0.8], [1.5, -0.8]]) P.cyl(px, pz, 0.12, 2.5);
  P.box(0, -0.45, 1.5, 0.3, 0.6);
  P.r = 1.9;
  return P;
}

// ================================================================== lines, banners, flags
// a rope sagging from a to b (island-local points), with pennants, flowers or lanterns hanging on it
export function hangingLine(B, a, b, { kind = 'pennants', colors = ['#e8608a', '#f0c040', '#3fa8b8', '#f4eee0', '#9a5ac8'], sag = 0.5, step = 0.45, seed = 1 } = {}) {
  const key = `eline${kind}${a.map((v) => v.toFixed(2))}${b.map((v) => v.toFixed(2))}${sag}${colors}`;
  const geo = cached(key, () => {
    const L = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(2, Math.round(L / step));
    const P = (t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
    const pts = []; for (let i = 0; i <= 12; i++) pts.push(P(i / 12));
    const parts = [[tint(tube(pts, 0.014, 4, 1), '#4a3a30')]];
    const ry = Math.atan2(b[0] - a[0], b[2] - a[2]) - Math.PI / 2;   // the line's direction is the local +x
    const r = rng(seed * 17 + 3);
    for (let i = 1; i < n; i++) {
      const p = P(i / n), c = colors[(i + seed) % colors.length];
      if (kind === 'pennants') {
        const g = cached('epennant' + c, () => { const s = new THREE.Shape(); s.moveTo(-0.15, 0); s.lineTo(0.15, 0); s.lineTo(0, -0.36); s.closePath(); return tint(new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: false }).translate(0, 0, -0.006), c); });
        parts.push([g, p[0], p[1] - 0.01, p[2], (r() - 0.5) * 0.25, ry, 0]);
      } else if (kind === 'garland') {
        parts.push([cached('egflower' + c, () => tint(new THREE.SphereGeometry(0.075, 6, 4), c)), p[0], p[1] - 0.04, p[2]]);
        parts.push([cached('egleaf', () => tint(new THREE.SphereGeometry(0.07, 5, 3).scale(1.6, 0.4, 0.8), '#4a9a5a')), p[0] + 0.08, p[1] - 0.02, p[2], 0, ry + 0.5, 0.3]);
      }
    }
    return compose(parts, true);
  });
  B.add(geo, VC());
  if (kind === 'lanterns') {
    const lg = cached(key + 'L', () => {
      const L = Math.hypot(b[0] - a[0], b[2] - a[2]), n = Math.max(2, Math.round(L / step)), parts = [];
      for (let i = 1; i < n; i++) { const t = i / n; parts.push([tint(lathe([[0, 0], [0.1, 0.04], [0.13, 0.14], [0.1, 0.25], [0, 0.29]], 8), colors[(i + seed) % colors.length]), a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t) - 0.32, a[2] + (b[2] - a[2]) * t]); }
      return compose(parts, true);
    });
    B.add(lg, glowVC());
  }
}
// pole: a brass mast with a ball finial (for lines) and an optional pennant flag at the top
export function pole(P, { h = 4.2, flag = null } = {}) {
  P.add(cached('epolebase', () => lathe([[0, 0], [0.2, 0], [0.2, 0.1], [0.11, 0.24], [0, 0.24]], 8)), EM.stone());
  P.add(cached('epole' + h, () => compose([[cyl(0.05, 0.065, h, 8), 0, h / 2, 0], [new THREE.SphereGeometry(0.1, 8, 6), 0, h + 0.05, 0]])), EM.brass());
  if (flag) P.add(cached('epflag' + flag + h, () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(1.1, -0.22); s.lineTo(0, -0.5); s.closePath(); return tint(new THREE.ExtrudeGeometry(s, { depth: 0.015, bevelEnabled: false }).translate(0.06, h - 0.1, 0), flag); }), EM.vc());
  P.cyl(0, 0, 0.2, h); P.r = 0.4;
  return P;
}
// banner on a pole: a crossbar and a long cloth in bands with a diamond, swallow-tailed
export function bannerPole(P, { h = 5.2, colors = ['#7a3a8a', '#f0c040', '#f4eee0'] } = {}) {
  pole(P, { h });
  const key = 'ebanner' + h + colors.join();
  P.add(cached(key, () => {
    const w = 0.7, top = h - 0.35, len = 2.3, parts = [[tint(cyl(0.025, 0.025, w + 0.25, 6).rotateZ(Math.PI / 2), '#c8a050'), 0.0, top + 0.02, 0.07]];
    const bands = [[0, 0.18, colors[1]], [0.18, 1.7, colors[0]], [1.7, 1.82, colors[1]], [1.82, len, colors[0]]];
    for (const [y0, y1, c] of bands) {
      const s = new THREE.Shape();
      if (y1 === len) { s.moveTo(-w / 2, -y0); s.lineTo(w / 2, -y0); s.lineTo(w / 2, -len); s.lineTo(0, -len + 0.3); s.lineTo(-w / 2, -len); s.closePath(); }
      else { s.moveTo(-w / 2, -y0); s.lineTo(w / 2, -y0); s.lineTo(w / 2, -y1); s.lineTo(-w / 2, -y1); s.closePath(); }
      parts.push([tint(new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false }), c), 0, top, 0.06]);
    }
    const d = new THREE.Shape(); d.moveTo(0, -0.42); d.lineTo(0.22, -0.82); d.lineTo(0, -1.22); d.lineTo(-0.22, -0.82); d.closePath();
    parts.push([tint(new THREE.ExtrudeGeometry(d, { depth: 0.03, bevelEnabled: false }), colors[2]), 0, top, 0.055]);
    return compose(parts, true);
  }), EM.vc());
  return P;
}

// ================================================================== Mosquibee: hives, flower beds, giant flowers
// a skep hive: a ridged straw dome on a plank stand, its entrance facing +z
export function hive(P, { s = 1 } = {}) {
  P.add(cached('ehivestand', () => compose([[bbox(0.95, 0.08, 0.95, 0.02, 0.7), 0, 0.52, 0], ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [bbox(0.08, 0.5, 0.08, 0.01, 0.5), a * 0.38, 0.25, b * 0.38])])), EM.wood(), 0, 0, 0, 0, 0, 0, s);
  P.add(cached('ehive', () => {
    const pts = []; for (let i = 0; i <= 9; i++) { const t = i / 9, r = 0.42 * Math.sqrt(Math.max(0, 1 - t * t * 0.92)) + (i % 2 ? 0.025 : 0); pts.push([r, t * 0.72]); } pts.push([0, 0.74]);
    return tint(lathe(pts, 12), '#e0b058');
  }), EM.vc(), 0, 0.56 * s, 0, 0, 0, 0, s);
  P.add(cached('ehivedoor', () => new THREE.CircleGeometry(0.08, 10, 0, Math.PI)), EM.dark(), 0, 0.58 * s, 0.415 * s, 0, 0, 0, s);
  P.cyl(0, 0, 0.55 * s, 1.35 * s); P.r = 0.7 * s;
  return P;
}
// a flower bed: a low stone curb, soil, tulips in rows
export function flowerBed(P, { w = 2.4, d = 1.2, colors = ['#f0c030', '#e8608a', '#f4eee0', '#c050d0'] } = {}) {
  for (const [x, z, a, b] of [[0, -d / 2, w, 0.16], [0, d / 2, w, 0.16], [-w / 2, 0, 0.16, d], [w / 2, 0, 0.16, d]]) P.add(bbox(a, 0.3, b, 0.03, 1.2), EM.stone(), x, 0.15, z);
  P.add(T(bbox(w - 0.14, 0.2, d - 0.14, 0.02), '#5a3a2a', 'bed' + w + d), EM.vc(), 0, 0.1, 0);
  const nx = Math.max(2, Math.round((w - 0.3) / 0.26)), nz = Math.max(2, Math.round((d - 0.3) / 0.26));
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    const c = colors[(i + j * 2) % colors.length];
    P.add(cached('etulip' + c, () => tulipGeometry(c)), EM.vc(), -w / 2 + 0.2 + i * ((w - 0.4) / (nx - 1)), 0.2, -d / 2 + 0.2 + j * ((d - 0.4) / (nz - 1)), 0, i * 1.7 + j, 0, 1.3);
  }
  P.box(0, 0, w / 2, d / 2, 0.7); P.r = Math.hypot(w, d) / 2 + 0.2;
  return P;
}
// giant flower: a curving stalk with a broad blossom (for the thin tall things round Mosquibee's hill)
export function giantFlower(P, { h = 4.4, color = '#f0c030', seed = 1 } = {}) {
  const r = rng(seed);
  P.add(cached('egstalk' + h, () => compose([
    [tint(tube([[0, 0, 0], [0.12, h * 0.4, 0.05], [0.3, h * 0.8, 0.0], [0.35, h, 0]], 0.07, 6, 1), '#4a9a4a')],
    [tint(new THREE.SphereGeometry(0.4, 7, 4).scale(1.6, 0.18, 0.6), '#5aa850'), 0.25, h * 0.35, 0, 0, 0.3, 0.35],
    [tint(new THREE.SphereGeometry(0.4, 7, 4).scale(1.4, 0.18, 0.6), '#5aa850'), -0.2, h * 0.55, 0, 0, 2.6, -0.3],
  ], true)), EM.vc());
  const head = cached('eghead' + color, () => {
    const parts = [];
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; parts.push([tint(new THREE.SphereGeometry(0.32, 7, 4).scale(1.0, 0.22, 0.5), color), Math.sin(a) * 0.34, 0, Math.cos(a) * 0.34, 0, a + Math.PI / 2, 0.3]); }
    parts.push([tint(new THREE.SphereGeometry(0.22, 8, 5).scale(1, 0.5, 1), '#7a4a20'), 0, 0.04, 0]);
    return compose(parts, true);
  });
  P.add(head, EM.vc(), 0.35, h + 0.05, 0, 0.5, r() * 6, 0);
  P.cyl(0, 0, 0.18, h); P.r = 0.5;
  return P;
}

// ================================================================== Celebration: a statue plinth, a festival stage
// stepped plinth with a brass sculpture (an orb held in turning rings over a twisted column)
export function statuePlinth(P) {
  P.add(bbox(3.2, 0.3, 3.2, 0.04, 1.8), EM.stone(), 0, 0.15, 0);
  P.add(bbox(2.4, 0.3, 2.4, 0.04, 1.8), EM.stone(), 0, 0.45, 0);
  P.add(bbox(1.3, 1.5, 1.3, 0.05, 1.8), EM.stone(), 0, 1.35, 0);
  P.add(bbox(1.34, 0.24, 1.34, 0.02, 0.5), EM.tiles(), 0, 1.92, 0);
  P.add(bbox(1.5, 0.12, 1.5, 0.03, 1.8), EM.stone(), 0, 2.16, 0);
  P.add(cached('estatcol', () => { const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push([Math.sin(t * 9) * 0.06, t * 1.6, Math.cos(t * 9) * 0.06]); } return compose([[tube(pts, 0.11, 6, 1)], [tube(pts.map(([x, y, z]) => [-x, y, -z]), 0.08, 6, 1)]]); }), EM.brass(), 0, 2.2, 0);
  P.add(cached('estatorb', () => new THREE.SphereGeometry(0.36, 14, 10)), pm('#9ff0ff', 0.25, { emissive: '#35c8ff', emissiveIntensity: 0.9, metalness: 0.2 }), 0, 4.15, 0);
  const rings = new THREE.Group(); rings.position.set(P.x, P.y + 4.15, P.z);
  const rm = brassM();
  for (const [r, a] of [[0.62, 0], [0.74, 1.1]]) { const m = new THREE.Mesh(cached('estatring' + r, () => new THREE.TorusGeometry(r, 0.03, 6, 32)), rm); m.rotation.set(Math.PI / 2 + a * 0.5, a, 0); m.castShadow = true; rings.add(m); }
  P.extra.push({ obj: rings, update: (dt, t) => { rings.children[0].rotation.y = t * 0.5; rings.children[1].rotation.x = t * 0.35; } });
  P.box(0, 0, 1.62, 1.62, 2.3, { seeThrough: false }); P.r = 2.4;
  return P;
}
// a low festival stage: a plank floor on stone feet, an arch of brass with a garland, two steps
export function stage(P, { w = 4.4, d = 2.6 } = {}) {
  P.add(bbox(w, 0.5, d, 0.04, 1.8), EM.stone(), 0, 0.25, 0);
  P.add(bbox(w + 0.08, 0.08, d + 0.08, 0.02, 1.2), EM.wood(), 0, 0.54, 0);
  P.add(bbox(1.4, 0.27, 0.5, 0.03, 1.2), EM.stone(), 0, 0.135, d / 2 + 0.25);
  P.add(cached('estagearch' + w, () => { const pts = []; for (let i = 0; i <= 16; i++) { const a = Math.PI * (i / 16); pts.push([Math.cos(a) * (w / 2 - 0.2), 0.58 + Math.sin(a) * 2.6, -d / 2 + 0.25]); } return tube(pts, 0.07, 6, 1); }), EM.brass());
  P.add(cached('estagecurtain' + w, () => { const g = new THREE.PlaneGeometry(w - 0.6, 2.2, 8, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 4) * 0.06); g.computeVertexNormals(); return tint(g, '#8a3a7a'); }), EM.vc(), 0, 1.7, -d / 2 + 0.18);
  // (a standable floor: one can climb on the stage by the steps)
  const [x, z] = P.pt(0, 0); P.cols.push({ type: 'box', x, z, hw: w / 2, hd: d / 2, rot: P.ry, top: P.y + 0.58 });
  const [sx, sz] = P.pt(0, d / 2 + 0.25); P.cols.push({ type: 'box', x: sx, z: sz, hw: 0.7, hd: 0.25, rot: P.ry, top: P.y + 0.29 });
  P.r = Math.hypot(w, d) / 2 + 0.3;
  return P;
}

// ================================================================== Under Celebration: gas works
// a run of gas pipe on posts (points island-local, at their heights), flanges at the joints
export function pipeRun(B, pts, { r = 0.16, cols = null, gy = null } = {}) {
  B.add(cached('epiperun' + JSON.stringify(pts), () => tube(pts, r, 8, 1.6)), EM.pipe());
  const fl = cached('eflange' + r, () => new THREE.CylinderGeometry(r * 1.45, r * 1.45, 0.08, 10));
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)];
    const d = new THREE.Vector3(q[0] - o[0], q[1] - o[1], q[2] - o[2]).normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    B.addM(fl, EM.brass(), new THREE.Matrix4().compose(new THREE.Vector3(...p), quat, new THREE.Vector3(1, 1, 1)));
    // a post under each joint that stands clear of the ground
    if (gy) {
      const g = gy(p[0], p[2]), hgt = p[1] - r - g;
      if (hgt > 0.3) { B.add(cyl(0.07, 0.09, hgt, 6), EM.rust(), p[0], g + hgt / 2, p[2]); if (cols) cols.push({ type: 'cyl', x: p[0], z: p[2], r: 0.14, top: p[1] + r, noStand: true, seeThrough: true }); }
    }
  }
}
// a gas holder: a tall drum in a ring of lattice columns with a walkway band, valve wheel, gauge
export function gasHolder(P, { r = 2.6, h = 5.2 } = {}) {
  P.add(cached('egasdrum' + r + h, () => compose([[cyl(r, r, h, 20, 1.6), 0, h / 2, 0], [lathe([[r, 0], [r * 0.8, h * 0.08], [r * 0.3, h * 0.12], [0, h * 0.13]], 20), 0, h, 0]])), EM.teal());
  for (let k = 0; k < 4; k++) P.add(cached('egasband' + r + k, () => new THREE.TorusGeometry(r + 0.02, 0.045, 4, 24).rotateX(Math.PI / 2)), EM.brass(), 0, 0.4 + k * (h - 0.6) / 3, 0);
  const n = 8;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2, x = Math.sin(a) * (r + 0.55), z = Math.cos(a) * (r + 0.55);
    P.add(cached('egascol' + h, () => compose([[bbox(0.16, h + 1.2, 0.16, 0.02, 1), 0, (h + 1.2) / 2, 0], [bbox(0.3, 0.12, 0.3, 0.02, 1), 0, 0.06, 0]])), EM.rust(), x, 0, z, 0, a);
  }
  P.add(cached('egasring' + r + h, () => new THREE.TorusGeometry(r + 0.55, 0.07, 4, 32).rotateX(Math.PI / 2)), EM.rust(), 0, h + 1.15, 0);
  P.add(cached('egasring2' + r, () => new THREE.TorusGeometry(r + 0.55, 0.05, 4, 32).rotateX(Math.PI / 2)), EM.rust(), 0, h * 0.5, 0);
  // a valve wheel and a gauge on the front
  P.add(cached('evalve', () => compose([[new THREE.TorusGeometry(0.28, 0.03, 6, 16)], [bbox(0.56, 0.04, 0.04, 0.01)], [bbox(0.04, 0.56, 0.04, 0.01)]])), pm('#b8302a', 0.5), 0, 1.3, r + 0.18);
  P.add(cached('egauge', () => compose([[cyl(0.16, 0.16, 0.07, 14).rotateX(Math.PI / 2)]])), EM.brass(), 0.7, 1.7, r + 0.05);
  P.add(cached('egaugeface', () => new THREE.CircleGeometry(0.13, 14)), pm('#f4ead8', 0.5), 0.7, 1.7, r + 0.09);
  P.cyl(0, 0, r + 0.75, h + 1.2, { seeThrough: false }); P.r = r + 1.1;
  return P;
}
// pump engine: a block on a plinth, two cylinders, a turning flywheel, a stack
export function pumpEngine(P) {
  P.add(bbox(3.4, 0.4, 2.0, 0.04, 1.8), EM.stone(), 0, 0.2, 0);
  P.add(bbox(1.6, 1.3, 1.3, 0.06, 1.2), EM.teal(), -0.6, 1.05, 0);
  for (const z of [-0.35, 0.35]) P.add(cached('ecylinder', () => compose([[cyl(0.26, 0.26, 1.0, 12, 1)], [cyl(0.3, 0.3, 0.08, 12), 0, 0.5, 0], [cyl(0.3, 0.3, 0.08, 12), 0, -0.5, 0]])), EM.brass(), -0.6, 2.2, z);
  P.add(cached('estack', () => compose([[cyl(0.2, 0.26, 2.6, 10, 1), 0, 1.3, 0], [cyl(0.3, 0.3, 0.16, 10), 0, 2.6, 0]])), EM.rust(), -1.2, 0.4, -0.6);
  P.add(bbox(0.3, 1.4, 0.3, 0.03, 1), EM.rust(), 0.9, 1.1, -0.45);
  P.add(bbox(0.3, 1.4, 0.3, 0.03, 1), EM.rust(), 0.9, 1.1, 0.45);
  const wheel = new THREE.Mesh(cached('eflywheel', () => compose([[new THREE.TorusGeometry(0.85, 0.09, 6, 24)], ...[0, 1, 2, 3, 4, 5].map((k) => [bbox(0.08, 1.7, 0.06, 0.01), 0, 0, 0, 0, 0, (k / 6) * Math.PI]), [cyl(0.14, 0.14, 0.2, 10).rotateX(Math.PI / 2)]])), pm('#b8302a', 0.45, { metalness: 0.3 }));
  const [wx, wz] = P.pt(0.9, 0.62); wheel.position.set(wx, P.y + 1.75, wz); wheel.rotation.set(0, P.ry, 0, 'YXZ'); wheel.castShadow = true;
  P.extra.push({ obj: wheel, update: (dt) => { wheel.rotation.z -= dt * 1.4; } });
  P.add(cached('epumparm', () => bbox(0.12, 0.12, 1.3, 0.02)), EM.brass(), 0.9, 1.75, 0.0);
  P.box(0, 0, 1.75, 1.05, 2.6, { seeThrough: false }); P.r = 2.1;
  return P;
}
// a caged work lamp on a short iron post
export function cageLamp(P, { h = 2.6 } = {}) {
  P.add(cached('ecagepost' + h, () => compose([[bbox(0.3, 0.12, 0.3, 0.02), 0, 0.06, 0], [cyl(0.05, 0.06, h, 6), 0, h / 2, 0], [bbox(0.5, 0.05, 0.05, 0.01), 0.2, h - 0.05, 0]])), EM.rust());
  P.add(cached('ecage', () => compose([[new THREE.TorusGeometry(0.13, 0.012, 4, 10).rotateX(Math.PI / 2), 0, -0.1, 0], [new THREE.TorusGeometry(0.13, 0.012, 4, 10).rotateX(Math.PI / 2), 0, -0.3, 0], [new THREE.TorusGeometry(0.13, 0.012, 4, 10), 0, -0.2, 0], [new THREE.TorusGeometry(0.13, 0.012, 4, 10).rotateY(Math.PI / 2), 0, -0.2, 0]])), EM.rust(), 0.42, h - 0.05, 0);
  P.add(cached('ecagebulb', () => new THREE.SphereGeometry(0.1, 8, 6)), EM.glow(), 0.42, h - 0.25, 0);
  P.cyl(0, 0, 0.18, h); P.r = 0.45;
  return P;
}
// gas bottles in a rack
export function gasBottles(P, { n = 4, color = '#c84a3a' } = {}) {
  const b = cached('ebottle', () => compose([[cyl(0.14, 0.14, 1.0, 10), 0, 0.5, 0], [new THREE.SphereGeometry(0.14, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), 0, 1.0, 0], [cyl(0.04, 0.04, 0.12, 6), 0, 1.18, 0]]));
  for (let i = 0; i < n; i++) P.add(T(b, i % 3 === 2 ? '#d8c040' : color, 'bottle'), EM.vc(), -((n - 1) / 2) * 0.32 + i * 0.32, 0, 0, 0, i);
  P.add(bbox(n * 0.32 + 0.1, 0.06, 0.06, 0.01), EM.rust(), 0, 0.7, 0.17);
  for (const s of [-1, 1]) P.add(bbox(0.06, 0.9, 0.36, 0.01), EM.rust(), s * (n * 0.16 + 0.05), 0.45, 0);
  P.box(0, 0, n * 0.16 + 0.1, 0.25, 1.2); P.r = n * 0.16 + 0.4;
  return P;
}

// ================================================================== the Platform: cranes, warning signs, barriers
// a slewing crane: lattice tower on a footing, a cab, a jib with a counterweight, a hook on a cable
export function crane(P, { h = 9, jib = 7.5 } = {}) {
  const tw = 1.0;
  P.add(bbox(2.2, 0.6, 2.2, 0.05, 1.8), EM.stone(), 0, 0.3, 0);
  P.add(cached('ecranetower' + h, () => {
    const parts = [];
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) parts.push([bbox(0.12, h, 0.12, 0.01, 1), a * tw / 2, h / 2, b * tw / 2]);
    const n = Math.round(h / 1.0);
    for (let i = 0; i < n; i++) for (const side of [0, 1, 2, 3]) {
      const y0 = 0.6 + i * ((h - 0.6) / n), y1 = y0 + (h - 0.6) / n, L = Math.hypot(tw, y1 - y0), ang = Math.atan2(y1 - y0, tw);
      const g = bbox(L, 0.06, 0.06, 0.01, 1);
      const rz = (i % 2 ? 1 : -1) * ang;
      if (side === 0) parts.push([g, 0, (y0 + y1) / 2, -tw / 2, 0, 0, rz]);
      if (side === 1) parts.push([g, 0, (y0 + y1) / 2, tw / 2, 0, 0, -rz]);
      if (side === 2) parts.push([g, -tw / 2, (y0 + y1) / 2, 0, 0, Math.PI / 2, rz]);
      if (side === 3) parts.push([g, tw / 2, (y0 + y1) / 2, 0, 0, Math.PI / 2, -rz]);
    }
    return compose(parts);
  }), tm('metal', { color: '#e8b040', rough: 0.55, metal: 0.3 }), 0, 0.6, 0);
  // the slewing top (its own group, turning slowly)
  const top = new THREE.Group(); top.position.set(P.x, P.y + 0.6 + h, P.z); top.rotation.y = P.ry;
  const yel = tm('metal', { color: '#e8b040', rough: 0.55, metal: 0.3 });
  const mk = (geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; top.add(m); return m; };
  mk(cached('ecranecab', () => bbox(1.4, 1.2, 1.3, 0.06, 1)), EM.teal(), -0.2, 0.7, 0);
  mk(cached('ecranewin', () => bbox(0.05, 0.6, 1.0, 0.01)), pm('#3a5060', 0.2, { metalness: 0.3 }), 0.52, 0.85, 0);
  mk(cached('ecranejib' + jib, () => {
    const parts = [[bbox(jib, 0.1, 0.1, 0.01, 1), jib / 2, 1.4, -0.3], [bbox(jib, 0.1, 0.1, 0.01, 1), jib / 2, 1.4, 0.3], [bbox(jib * 0.9, 0.1, 0.1, 0.01, 1), jib * 0.45, 2.1, 0]];
    for (let i = 0; i < Math.round(jib / 0.9); i++) { const x = i * 0.9 + 0.45; parts.push([bbox(0.06, 0.8, 0.06, 0.01), x, 1.75, 0, 0, 0, 0.6], [bbox(0.06, 0.06, 0.6, 0.01), x, 1.4, 0]); }
    parts.push([bbox(3, 0.1, 0.1, 0.01, 1), -1.5, 1.4, 0], [bbox(0.08, 0.08, 0.08, 0.01), 0, 2.4, 0]);
    return compose(parts);
  }), yel, 0, 0, 0);
  mk(cached('ecraneweight', () => bbox(1.0, 0.9, 1.0, 0.05, 1)), EM.stone(), -2.6, 1.1, 0);
  const hookX = jib * 0.78, cable = 4.2;
  mk(cached('ecranecable' + cable, () => cyl(0.015, 0.015, cable, 4)), EM.dark(), hookX, 1.4 - cable / 2, 0);
  mk(cached('ecranehook', () => compose([[bbox(0.35, 0.3, 0.25, 0.04), 0, 0, 0], [tube([[0, -0.15, 0], [0, -0.4, 0], [0.12, -0.52, 0], [0.18, -0.4, 0]], 0.035, 5, 1)]])), pm('#b8302a', 0.5), hookX, 1.4 - cable, 0);
  P.extra.push({ obj: top, update: (dt, t) => { top.rotation.y = P.ry + Math.sin(t * 0.08) * 0.9; } });
  P.box(0, 0, 1.1, 1.1, h, { seeThrough: false }); P.r = 1.6;
  return P;
}
// warning sign: a post with a yellow-black board and words, a red triangle mark above
export function warnSign(P, { text = 'KEEP CLEAR' } = {}) {
  P.add(cached('ewarnpost', () => compose([[bbox(0.32, 0.1, 0.32, 0.02), 0, 0.05, 0], [cyl(0.04, 0.05, 2.0, 6), 0, 1.0, 0]])), EM.rust());
  P.add(cached('ewarnboard', () => bbox(1.0, 0.5, 0.05, 0.01, 0.9)), EM.hazard(), 0, 1.55, 0.06);
  P.add(wordPlane(text, 0.82, 0.2), signMat(), 0, 1.55, 0.09);
  P.add(cached('ewarntri', () => { const s = new THREE.Shape(); s.moveTo(-0.22, 0); s.lineTo(0.22, 0); s.lineTo(0, 0.38); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false }); return tint(g, '#d8382a'); }), EM.vc(), 0, 1.83, 0.04);
  P.add(cached('ewarnmark', () => tint(compose([[bbox(0.04, 0.14, 0.01, 0.005), 0, 0.17, 0], [bbox(0.04, 0.04, 0.01, 0.005), 0, 0.06, 0]]), '#fff4e0')), EM.vc(), 0, 1.83, 0.085);
  P.cyl(0, 0, 0.16, 2.1); P.r = 0.6;
  return P;
}
// hazard barrier: two posts and a striped rail
export function barrier(P, { len = 2.4 } = {}) {
  for (const s of [-1, 1]) P.add(cached('ebarpost', () => compose([[bbox(0.3, 0.1, 0.3, 0.02), 0, 0.05, 0], [bbox(0.1, 1.0, 0.1, 0.02), 0, 0.5, 0]])), EM.rust(), s * len / 2, 0, 0);
  P.add(cached('ebarrail' + len, () => bbox(len + 0.2, 0.18, 0.08, 0.02, 0.6)), EM.hazard(), 0, 0.85, 0);
  P.box(0, 0, len / 2 + 0.1, 0.12, 1.0); P.r = len / 2 + 0.3;
  return P;
}

// ================================================================== the CX Islet: an outpost
// a radio mast: a lattice of three legs, a dish, a red lamp at the top
export function radioMast(P, { h = 8 } = {}) {
  P.add(bbox(1.4, 0.4, 1.4, 0.04, 1.8), EM.stone(), 0, 0.2, 0);
  P.add(cached('emast' + h, () => {
    const parts = [], R0 = 0.55, R1 = 0.12, n = Math.round(h / 0.8);
    const leg = (k, t) => { const a = (k / 3) * Math.PI * 2, r = R0 + (R1 - R0) * t; return [Math.sin(a) * r, 0.4 + t * h, Math.cos(a) * r]; };
    for (let k = 0; k < 3; k++) parts.push([tube([leg(k, 0), leg(k, 1)], 0.04, 5, 1)]);
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) parts.push([tube([leg(k, i / n), leg((k + 1) % 3, (i + 1) / n)], 0.018, 3, 1)]);
    return compose(parts);
  }), EM.metal());
  P.add(cached('edish', () => lathe([[0, 0], [0.3, 0.02], [0.55, 0.12], [0.62, 0.2], [0.6, 0.21], [0.29, 0.06], [0, 0.04]], 14).rotateX(Math.PI / 2 - 0.3)), pm('#f0eae0', 0.5), 0, h * 0.72, 0.3);
  P.add(cached('emastlamp', () => new THREE.SphereGeometry(0.09, 8, 6)), pm('#ff6050', 0.3, { emissive: '#ff2010', emissiveIntensity: 2.0 }), 0, h + 0.5, 0);
  P.cyl(0, 0, 0.8, h, { seeThrough: false }); P.r = 1.1;
  return P;
}
// a flag pole with a long flag in bands
export function flagPole(P, { h = 6, colors = ['#3a8a9a', '#f0c040'] } = {}) {
  pole(P, { h });
  P.add(cached('eflag' + h + colors, () => { const parts = []; for (let i = 0; i < 3; i++) { const s = new THREE.Shape(); s.moveTo(0, -i * 0.25); s.lineTo(1.5, -i * 0.25 - 0.04); s.lineTo(1.5, -(i + 1) * 0.25 - 0.04); s.lineTo(0, -(i + 1) * 0.25); s.closePath(); parts.push([tint(new THREE.ExtrudeGeometry(s, { depth: 0.015, bevelEnabled: false }), colors[i % colors.length]), 0.06, h - 0.1, 0]); } return compose(parts, true); }), EM.vc());
  return P;
}
// a supply hut: a small lean-to with a plank roof and crates under it, a water tank on legs beside it
export function waterTank(P) {
  for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) P.add(cached('etankleg', () => bbox(0.12, 2.2, 0.12, 0.02, 1)), EM.wood(), a * 0.55, 1.1, b * 0.55);
  P.add(cached('etank', () => compose([[cyl(0.85, 0.85, 1.4, 14, 1), 0, 0.7, 0], [lathe([[0.88, 0], [0.6, 0.3], [0, 0.45]], 14), 0, 1.4, 0]])), EM.wood(), 0, 2.2, 0);
  for (const y of [2.45, 3.3]) P.add(cached('etankhoop' + y, () => new THREE.TorusGeometry(0.86, 0.025, 4, 16).rotateX(Math.PI / 2)), EM.rust(), 0, y, 0);
  P.box(0, 0, 0.75, 0.75, 3.8); P.r = 1.2;
  return P;
}

// ================================================================== Knartas: harbour life
// a mooring post with a coil of rope
export function bollard(P) {
  P.add(cached('ebollard', () => lathe([[0, 0], [0.16, 0], [0.16, 0.5], [0.2, 0.56], [0.2, 0.64], [0.12, 0.7], [0, 0.72]], 10)), EM.brass());
  P.add(cached('erope', () => tint(new THREE.TorusGeometry(0.2, 0.04, 5, 14).rotateX(Math.PI / 2), '#c8a878')), EM.vc(), 0, 0.3, 0);
  P.cyl(0, 0, 0.24, 0.9); P.r = 0.4;
  return P;
}
// a drying rack of nets: two posts, a bar, a net hanging in folds
export function netRack(P, { w = 2.6 } = {}) {
  for (const s of [-1, 1]) P.add(cached('enetpost', () => cyl(0.06, 0.07, 2.1, 6)), EM.wood(), s * w / 2, 1.05, 0);
  P.add(cached('enetbar' + w, () => cyl(0.04, 0.04, w + 0.2, 6).rotateZ(Math.PI / 2)), EM.wood(), 0, 2.0, 0);
  P.add(cached('enet' + w, () => { const g = new THREE.PlaneGeometry(w - 0.2, 1.6, 10, 6); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin(x * 5) * 0.08 + (y < 0 ? Math.sin(x * 3) * 0.06 : 0)); p.setY(i, y - Math.cos(x * 2.4) * 0.12 * (y + 0.8)); } g.computeVertexNormals(); return tint(g, '#5a7a8a'); }), pm('#ffffff', 0.9, { vertexColors: true, side: THREE.DoubleSide }), 0, 1.2, 0);
  for (const s of [-1, 1]) P.cyl(s * w / 2, 0, 0.12, 2.1);
  P.box(0, 0, w / 2, 0.12, 1.9); P.r = w / 2 + 0.3;
  return P;
}
// laundry line between two posts with cloths
export function laundry(P, { w = 3.2, colors = ['#f4eee0', '#3a7ac8', '#e8608a', '#f0c040', '#9ad0b0'] } = {}) {
  for (const s of [-1, 1]) P.add(cached('elpost', () => cyl(0.05, 0.06, 2.2, 6)), EM.wood(), s * w / 2, 1.1, 0);
  const [ax, az] = P.pt(-w / 2, 0), [bx, bz] = P.pt(w / 2, 0);
  P.add(cached('elcloth' + w + colors, () => {
    const parts = [], n = Math.floor(w / 0.6);
    for (let i = 0; i < n; i++) { const x = -w / 2 + 0.4 + i * ((w - 0.8) / Math.max(1, n - 1)), sag = 0.25 * (1 - (2 * (x / w)) ** 2), hgt = 0.5 + (i % 2) * 0.25; const g = new THREE.PlaneGeometry(0.42, hgt, 2, 2); g.translate(0, -hgt / 2, 0); parts.push([tint(g, colors[i % colors.length]), x, 2.08 - sag, 0, 0, (i % 3 - 1) * 0.15]); }
    return compose(parts, true);
  }), pm('#ffffff', 0.9, { vertexColors: true, side: THREE.DoubleSide }));
  hangingLine(P.B, [ax, P.y + 2.1, az], [bx, P.y + 2.1, bz], { kind: 'plain', sag: 0.25 });
  for (const s of [-1, 1]) P.cyl(s * w / 2, 0, 0.12, 2.2);
  P.r = w / 2 + 0.3;
  return P;
}
// a cloud skiff: a small boat hull, a mast and a furled sail (its own group: it bobs on the clouds)
export function skiff(parent, x, y, z, ry, color = '#c84a3a') {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const add = (geo, mat, px, py, pz, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m); return m; };
  const hull = cached('eskiffhull', () => { const g2 = lathe([[0, 0], [0.5, 0.05], [0.75, 0.35], [0.8, 0.6], [0, 0.6]], 12); g2.scale(1, 1, 2.6); return g2; });
  add(hull, pm(color, 0.6), 0, 0, 0);
  add(cached('eskiffrail', () => new THREE.TorusGeometry(0.8, 0.04, 4, 20).scale(1, 2.6, 1).rotateX(Math.PI / 2)), brassM(), 0, 0.6, 0);
  add(cached('eskiffdeck', () => bbox(1.3, 0.05, 3.4, 0.01, 0.7)), tm('planks', { color: '#d8b080' }), 0, 0.5, 0);
  add(cached('eskiffmast', () => cyl(0.05, 0.06, 3.0, 6)), tm('planks', { color: '#d8b080' }), 0, 2.0, 0.3);
  add(cached('eskiffsail', () => tint(cyl(0.12, 0.12, 2.0, 8).rotateX(Math.PI / 2), '#f4eee0')), VC(), 0, 2.2, -0.6, 0.15);
  return g;
}

// ================================================================== landmarks
// the plaza fountain (Otringal): an octagonal tiled basin, a turned brass column with two bowls and a finial
export function fountain(P) {
  P.add(cached('efbasin', () => lathe([[2.1, 0], [2.18, 0.06], [2.18, 0.58], [2.3, 0.66], [2.3, 0.78], [1.9, 0.78], [1.9, 0.2], [0, 0.2]], 8, 1.2)), EM.stone(), 0, 0, 0, 0, Math.PI / 8);
  P.add(cached('efband', () => cyl(2.2, 2.2, 0.3, 8, 0.6, true)), EM.tiles(), 0, 0.3, 0, 0, Math.PI / 8);
  P.add(cached('efcol', () => lathe([[0.55, 0], [0.42, 0.3], [0.3, 0.5], [0.26, 1.3], [0.32, 1.4], [1.0, 1.55], [1.05, 1.7], [0.25, 1.72], [0.16, 2.0], [0.2, 2.55], [0.55, 2.65], [0.58, 2.75], [0.12, 2.78], [0.08, 3.1], [0.16, 3.25], [0.04, 3.6], [0, 3.62]], 16)), EM.brass(), 0, 0.2, 0);
  const water = pm('#bfeef6', 0.12, { metalness: 0.1, emissive: '#3a8aa8', emissiveIntensity: 0.35 });
  P.add(cached('efwater', () => new THREE.CircleGeometry(1.88, 8).rotateX(-Math.PI / 2)), water, 0, 0.62, 0, 0, Math.PI / 8);
  P.add(cached('efwater2', () => new THREE.CircleGeometry(0.98, 16).rotateX(-Math.PI / 2)), water, 0, 1.88, 0);
  P.add(cached('efwater3', () => new THREE.CircleGeometry(0.54, 12).rotateX(-Math.PI / 2)), water, 0, 2.93, 0);
  // falling water: thin pale bells under the bowls
  const bell = pm('#e8fbff', 0.1, { transparent: true, opacity: 0.4, emissive: '#80c8e0', emissiveIntensity: 0.3, side: THREE.DoubleSide, depthWrite: false });
  P.add(cached('efbell', () => lathe([[1.04, 0], [1.08, -0.4], [1.18, -0.9], [1.3, -1.2]], 16)), bell, 0, 1.9, 0);
  P.add(cached('efbell2', () => lathe([[0.58, 0], [0.62, -0.4], [0.7, -0.8], [0.8, -1.0]], 12)), bell, 0, 2.95, 0);
  P.cyl(0, 0, 2.3, 0.8); P.cyl(0, 0, 0.6, 3.6);
  P.r = 2.5;
  return P;
}
// the harbour light (Knartas): a round stone tower with a brass lantern room, its lamp glowing, a pointed roof
export function beacon(P) {
  P.add(cached('ebeacon', () => lathe([[1.15, 0], [1.1, 0.4], [0.9, 3.6], [1.05, 3.7], [1.05, 3.85], [0, 3.85]], 12, 1.5)), EM.stone(), 0, 0, 0);
  P.add(cached('ebeaconband', () => cyl(0.96, 1.02, 0.3, 12, 0.5, true)), EM.tiles(), 0, 2.9, 0);
  P.add(cached('ebeacondoor', () => bbox(0.7, 1.5, 0.12, 0.03)), EM.wood(), 0, 0.75, 1.08, -0.08);
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; P.add(cached('ebeaconbar', () => cyl(0.03, 0.03, 1.0, 5)), EM.brass(), Math.sin(a) * 0.6, 4.35, Math.cos(a) * 0.6); }
  P.add(cached('ebeaconlamp', () => new THREE.SphereGeometry(0.36, 12, 8)), pm('#fff6e0', 0.3, { emissive: '#ffd070', emissiveIntensity: 2.0 }), 0, 4.3, 0);
  P.add(cached('ebeaconroof', () => lathe([[0.85, 0], [0.7, 0.2], [0.2, 0.75], [0.05, 1.0], [0, 1.05]], 12)), cm(tileTex('#2f8a9a', '#e8b84a', '#2f8a9a'), { rough: 0.45 }), 0, 4.85, 0);
  P.add(cached('ebeaconrail', () => new THREE.TorusGeometry(1.0, 0.03, 4, 20).rotateX(Math.PI / 2)), EM.brass(), 0, 4.25, 0);
  P.cyl(0, 0, 1.15, 4.0, { seeThrough: false }); P.r = 1.4;
  return P;
}
// the great hive (Mosquibee): a tall ridged skep on a round stone base, hexagonal honey windows, a landing lip
export function greatHive(P) {
  P.add(cached('eghbase', () => lathe([[2.3, 0], [2.3, 0.5], [2.05, 0.6], [0, 0.6]], 16, 1.5)), EM.stone(), 0, 0, 0);
  P.add(cached('eghive', () => {
    const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16, r = 1.9 * Math.sqrt(Math.max(0, 1 - t * t * 0.94)) + (i % 2 ? 0.08 : 0); pts.push([r, t * 4.0]); } pts.push([0, 4.1]);
    return tint(lathe(pts, 18), '#e2b04a');
  }), EM.vc(), 0, 0.6, 0);
  P.add(cached('eghdoor', () => new THREE.CircleGeometry(0.55, 14, 0, Math.PI)), EM.dark(), 0, 0.62, 1.93);
  P.add(cached('eghlip', () => bbox(1.6, 0.1, 0.7, 0.02)), EM.wood(), 0, 0.62, 2.15);
  const hex = cached('eghhex', () => new THREE.CircleGeometry(0.22, 6));
  for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2 + 0.45, y = 2.0 + (k % 2) * 0.9, r = 1.9 * Math.sqrt(1 - ((y - 0.6) / 4.0) ** 2 * 0.94) + 0.07; P.add(hex, EM.honey(), Math.sin(a) * r, y, Math.cos(a) * r, 0, a); }
  P.add(cached('eghtop', () => compose([[cyl(0.05, 0.05, 1.0, 6), 0, 0.5, 0], [new THREE.SphereGeometry(0.16, 10, 8), 0, 1.05, 0]])), EM.brass(), 0, 4.6, 0);
  P.cyl(0, 0, 2.3, 4.6, { seeThrough: false }); P.r = 2.6;
  return P;
}
// a moored barge (a large object standing in the clouds by a quay): a long hull, a deck house, two masts
export function barge(P, { len = 12, beam = 7, h = 3 } = {}) {
  P.add(cached('ebargehull', () => lathe([[0, 0], [0.55, 0.12], [0.9, 0.5], [1.0, 0.9], [1.0, 1.0], [0, 1.0]], 16)), pm('#7a3a4a', 0.6), 0, 0, 0, 0, 0, 0, beam / 2, h * 0.6, len / 2);
  P.add(cached('ebargerail', () => new THREE.TorusGeometry(1, 0.03, 4, 24).rotateX(Math.PI / 2)), EM.brass(), 0, h * 0.6, 0, 0, 0, 0, beam / 2, 1, len / 2);
  P.add(bbox(beam * 0.8, 0.1, len * 0.85, 0.02, 1.8), EM.wood(), 0, h * 0.58, 0);
  P.add(bbox(beam * 0.45, h * 0.55, len * 0.25, 0.05, 2.2), tm('plasterWall', { color: '#f4e4d4', rough: 0.95 }), 0, h * 0.6 + h * 0.275, -len * 0.18);
  P.add(bbox(beam * 0.5, 0.12, len * 0.28, 0.03, 1.6), EM.stone(), 0, h * 0.6 + h * 0.56, -len * 0.18);
  for (const z of [len * 0.15, -len * 0.38]) P.add(cached('ebargemast', () => cyl(0.08, 0.1, 5.5, 8)), EM.wood(), 0, h * 0.6 + 2.75, z);
  P.add(cached('ebargesail', () => tint(cyl(0.16, 0.16, 3.2, 8).rotateZ(Math.PI / 2), '#f4eee0')), EM.vc(), 0, h * 0.6 + 4.2, len * 0.15);
  P.box(0, 0, beam / 2, len / 2, h * 1.2, { seeThrough: false });
  P.r = len / 2;
  return P;
}
// a brass bollard post (the thin uprights of the original's layouts)
export function post(P, { h = 1.2 } = {}) {
  P.add(cached('epost' + h.toFixed(1), () => lathe([[0, 0], [0.13, 0], [0.13, 0.08], [0.08, 0.16], [0.07, h - 0.2], [0.1, h - 0.14], [0.1, h - 0.06], [0.04, h], [0, h + 0.02]], 8)), EM.brass());
  P.cyl(0, 0, 0.14, h);
  return P;
}

// ================================================================== ZL-ALL: the new places' landmarks and travel boards
// Celebration Island later (the original's CELEBRA2): the great figure risen from its pit, here our own robed,
// hooded figure of stone with a glowing face, tiled hems and a crest; garlands are hung on it for the festival.
export function colossus(P, { h = 28, r = 5 } = {}) {
  const robe = cached('ecolrobe' + h + r, () => lathe([[r * 1.12, 0], [r * 1.12, 0.012 * h], [r, 0.03 * h], [r * 0.93, 0.12 * h], [r * 0.8, 0.32 * h], [r * 0.66, 0.52 * h], [r * 0.7, 0.63 * h], [r * 0.66, 0.69 * h], [r * 0.46, 0.74 * h], [r * 0.3, 0.76 * h], [0, 0.77 * h]], 20, 2.2));
  P.add(robe, EM.stone());
  P.add(cached('ecolhem' + h + r, () => cyl(r * 0.96, r * 1.01, 0.05 * h, 20, 1.0, true)), EM.tiles(), 0, 0.06 * h, 0);
  P.add(cached('ecolbelt' + h + r, () => cyl(r * 0.69, r * 0.72, 0.035 * h, 20, 1.0, true)), EM.tiles(), 0, 0.5 * h, 0);
  // folded arms: a roll of sleeve across the front, hands meeting
  P.add(cached('ecolarms' + h + r, () => compose([[cyl(r * 0.2, r * 0.2, r * 1.3, 12).rotateZ(Math.PI / 2), 0, 0.57 * h, r * 0.62], [new THREE.SphereGeometry(r * 0.17, 10, 8), 0, 0.57 * h, r * 0.82]])), EM.stone());
  // the hood and the head inside it, the face a soft blue light; a crest above
  P.add(cached('ecolhood' + h + r, () => lathe([[r * 0.5, 0], [r * 0.52, 0.06 * h], [r * 0.46, 0.12 * h], [r * 0.3, 0.17 * h], [0, 0.19 * h]], 16)), EM.stone(), 0, 0.75 * h, 0);
  P.add(cached('ecolface', () => new THREE.SphereGeometry(1, 14, 10).scale(1, 1.2, 0.5)), pm('#bff0ff', 0.25, { emissive: '#3ab8ff', emissiveIntensity: 1.1 }), 0, 0.83 * h, r * 0.38, 0, 0, 0, r * 0.24);
  P.add(cached('ecolcrest' + h + r, () => lathe([[r * 0.2, 0], [r * 0.16, 0.03 * h], [r * 0.08, 0.06 * h], [0, 0.08 * h]], 10)), EM.brass(), 0, 0.93 * h, 0);
  P.cyl(0, 0, r * 1.05, 0.8 * h, { seeThrough: false }); P.r = r * 1.2;
  return P;
}
// Tralu Rock: the weigh-beam, a great brass balance under which the traders weigh their goods (it rocks gently)
export function weighBeam(P, { L = 6.4, H = 4.6 } = {}) {
  P.add(bbox(2.8, 0.4, 2.8, 0.05, 1.8), EM.stone(), 0, 0.2, 0);
  P.add(bbox(2.2, 0.16, 2.2, 0.02, 0.5), EM.tiles(), 0, 0.46, 0);
  P.add(cached('eweighcol' + H, () => lathe([[0.42, 0], [0.32, 0.25], [0.22, 0.5], [0.2, H - 0.9], [0.3, H - 0.75], [0.12, H - 0.5], [0.1, H], [0, H]], 12)), EM.brass(), 0, 0.5, 0);
  const g = new THREE.Group(); g.position.set(P.x, P.y + 0.5 + H, P.z); g.rotation.y = P.ry;
  const br = brassM(), mk = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; return m; };
  const beam = new THREE.Group(); g.add(beam);
  beam.add(mk(cached('eweighbeam' + L, () => compose([[cyl(0.09, 0.09, L, 8).rotateZ(Math.PI / 2)], [new THREE.SphereGeometry(0.2, 10, 8), -L / 2, 0, 0], [new THREE.SphereGeometry(0.2, 10, 8), L / 2, 0, 0], [lathe([[0.32, 0], [0.12, 0.5], [0, 0.6]], 8), 0, 0.05, 0]])), br, 0, 0, 0));
  const pans = [];
  for (const s of [-1, 1]) {
    const pan = new THREE.Group(); g.add(pan);
    pan.add(mk(cached('eweighchain', () => compose([0, 1, 2].map((k) => { const a = (k / 3) * Math.PI * 2; return [cyl(0.015, 0.015, 2.3, 4).rotateX(Math.sin(a) * 0.27).rotateZ(Math.cos(a) * 0.27), Math.cos(a) * 0.3, -1.15, Math.sin(a) * 0.3]; }))), EM.dark(), 0, 0, 0));
    pan.add(mk(cached('eweighpan', () => lathe([[0, 0], [0.7, 0.04], [0.9, 0.22], [0.86, 0.24], [0.66, 0.08], [0, 0.06]], 16)), br, 0, -2.4, 0));
    if (s < 0) pan.add(mk(cached('eweighgoods', () => tint(compose([[bbox(0.5, 0.45, 0.5, 0.04), -0.15, 0.25, 0.05], [bbox(0.38, 0.35, 0.38, 0.04), 0.28, 0.2, -0.1, 0, 0.5]]), '#b88850')), VC(), 0, -2.36, 0));
    else pan.add(mk(cached('eweighweights', () => compose([[cyl(0.2, 0.24, 0.3, 10), -0.15, 0.17, 0], [cyl(0.15, 0.18, 0.22, 10), 0.22, 0.13, 0.1], [cyl(0.1, 0.12, 0.16, 8), 0.1, 0.4, -0.05]])), EM.dark(), 0, -2.36, 0));
    pans.push([pan, s]);
  }
  P.extra.push({ obj: g, update: (dt, t) => {
    const a = Math.sin(t * 0.45) * 0.07 + Math.sin(t * 1.3) * 0.01; beam.rotation.z = a;
    for (const [pan, s] of pans) pan.position.set(Math.cos(a) * s * L / 2, Math.sin(a) * s * L / 2, 0);
  } });
  P.cyl(0, 0, 1.45, H + 0.6, { seeThrough: false }); P.r = 3.6;
  return P;
}
// the Nectar Orchard: the cloud-catcher on the crown: a ring of poles holding fine nets that comb water out of
// the passing cloud, gutters running down to a round cistern in the middle
export function cloudCatcher(P, { r = 4.4, h = 6.8 } = {}) {
  const n = 6, wood = EM.wood();
  for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; P.add(cached('eccpole' + h, () => compose([[cyl(0.1, 0.14, h, 8), 0, h / 2, 0], [new THREE.SphereGeometry(0.16, 8, 6), 0, h + 0.05, 0]])), wood, Math.sin(a) * r, 0, Math.cos(a) * r); P.cyl(Math.sin(a) * r, Math.cos(a) * r, 0.2, h); }
  // (a fine net: a mesh of threads with beads of water, see-through between them)
  const netM = cm(ctex('eccnettex', 128, 128, (x, S) => {
    x.clearRect(0, 0, S, S); x.strokeStyle = 'rgba(244,240,250,0.95)'; x.lineWidth = 2;
    for (let k = 0; k <= S; k += 16) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k, S); x.stroke(); x.beginPath(); x.moveTo(0, k); x.lineTo(S, k); x.stroke(); }
    x.fillStyle = 'rgba(190,235,255,0.95)'; for (let i = 0; i < S; i += 16) for (let j = 0; j < S; j += 16) if ((i * 7 + j * 3) % 48 === 0) { x.beginPath(); x.arc(i, j, 3, 0, 7); x.fill(); }
  }), { rough: 0.6, side: THREE.DoubleSide });
  netM.alphaTest = 0.35; netM.transparent = false; netM.map.repeat?.set(3, 3);
  for (let k = 0; k < n; k += 2) {
    const a0 = (k / n) * Math.PI * 2, a1 = ((k + 1) / n) * Math.PI * 2, w = 2 * r * Math.sin(Math.PI / n), am = (a0 + a1) / 2, rm = r * Math.cos(Math.PI / n);
    P.add(cached('eccnet' + w.toFixed(2) + h, () => { const g = new THREE.PlaneGeometry(w - 0.25, h * 0.62, 12, 8), p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / w + 0.5) * Math.PI) * 0.35 + Math.sin(p.getY(i) * 3 + p.getX(i)) * 0.04); g.computeVertexNormals(); return tint(g, '#eef2fa'); }), netM, Math.sin(am) * rm, h * 0.6, Math.cos(am) * rm, 0, am);
    // a gutter under the net and a pipe down to the cistern
    const [gx, gz] = [Math.sin(am) * rm * 0.96, Math.cos(am) * rm * 0.96];
    P.add(cached('eccgutter' + w.toFixed(2), () => cyl(0.09, 0.09, w - 0.2, 8, 0, true).rotateZ(Math.PI / 2)), EM.brass(), gx, h * 0.27, gz, 0, am);
    P.add(cached('eccpipe' + r, () => tube([[0, 0, 0], [0, -0.4, -r * 0.35], [0, -1.2, -r * 0.62]], 0.06, 6, 1)), EM.brass(), gx, h * 0.27, gz, 0, am);
  }
  P.add(cached('ecctank', () => lathe([[1.7, 0], [1.75, 0.08], [1.75, 1.0], [1.85, 1.08], [1.85, 1.18], [1.55, 1.18], [1.55, 0.3], [0, 0.3]], 16, 1.5)), EM.stone());
  P.add(cached('ecctankband', () => cyl(1.77, 1.77, 0.26, 16, 0.6, true)), EM.tiles(), 0, 0.62, 0);
  P.add(cached('eccwater', () => new THREE.CircleGeometry(1.56, 18).rotateX(-Math.PI / 2)), pm('#bfeef6', 0.12, { metalness: 0.1, emissive: '#3a8aa8', emissiveIntensity: 0.35 }), 0, 1.0, 0);
  P.cyl(0, 0, 1.9, 1.2, { seeThrough: false }); P.r = r + 0.6;
  return P;
}
// a nectar press by the press house: a timber frame, a brass screw and its bar, a tub of amber nectar
export function nectarPress(P) {
  for (const s of [-1, 1]) P.add(cached('epresspost', () => bbox(0.22, 2.3, 0.22, 0.03, 1)), EM.wood(), s * 0.9, 1.15, 0);
  P.add(cached('epressbeam', () => bbox(2.2, 0.3, 0.3, 0.03, 1)), EM.wood(), 0, 2.2, 0);
  P.add(cached('epressscrew', () => cyl(0.08, 0.08, 1.1, 8)), EM.brass(), 0, 1.55, 0);
  P.add(cached('epressbar', () => cyl(0.04, 0.04, 1.6, 6).rotateZ(Math.PI / 2)), EM.brass(), 0, 1.75, 0, 0, 0.6);
  P.add(cached('epresstub', () => lathe([[0.75, 0], [0.8, 0.6], [0.72, 0.62], [0.68, 0.1], [0, 0.1]], 14)), EM.wood(), 0, 0, 0);
  P.add(cached('epressnectar', () => new THREE.CircleGeometry(0.7, 14).rotateX(-Math.PI / 2)), EM.honey(), 0, 0.5, 0);
  P.box(0, 0, 1.05, 0.8, 1.0); P.cyl(-0.9, 0, 0.16, 2.3); P.cyl(0.9, 0, 0.16, 2.3); P.r = 1.3;
  return P;
}
// the Old Watch: the ruined watchtower — a broken stone drum with a jagged top, a dark doorway, its fallen dome
// lying beside it, blocks scattered
export function ruinedTower(P, { r = 2.4, h = 7.5 } = {}) {
  P.add(cached('eruin' + r + h, () => {
    const g = lathe([[r, 0], [r * 0.97, h * 0.5], [r * 0.93, h], [r * 0.93 - 0.4, h], [r * 0.97 - 0.4, h * 0.5], [r - 0.4, 0]], 20, 1.8), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i); if (y < h * 0.45) continue;
      const a = Math.atan2(p.getZ(i), p.getX(i)), jag = 0.5 + 0.3 * Math.sin(a * 3 + 0.7) + 0.2 * Math.sin(a * 7 + 2.1);
      p.setY(i, Math.min(y, h - jag * h * 0.42));
    }
    g.computeVertexNormals(); return g;
  }), EM.stone());
  P.add(cached('eruinband' + r, () => cyl(r * 0.99, r * 1.0, 0.3, 20, 0.6, true)), EM.tiles(), 0, h * 0.3, 0);
  P.add(cached('eruindoor', () => bbox(1.0, 1.9, 0.5, 0.05)), EM.dark(), 0, 0.95, r - 0.15);
  P.add(cached('eruinlintel', () => bbox(1.5, 0.3, 0.6, 0.04, 1.8)), EM.stone(), 0, 2.05, r - 0.1);
  P.cyl(0, 0, r + 0.05, h * 0.6, { seeThrough: false });
  P.r = r + 0.3;
  return P;
}
// the watchtower's dome, fallen and lying on its side, half sunk in the turf, a few blocks of the drum by it
export function fallenDome(P) {
  P.add(cached('eruindome', () => lathe([[1.8, 0], [1.7, 0.6], [1.25, 1.2], [0.6, 1.6], [0, 1.75], [0, 1.6], [0.55, 1.45], [1.1, 1.05], [1.5, 0.5], [1.6, 0]], 16)), cm(tileTex('#5a8a8a', '#c8a860', '#a8708a'), { rough: 0.6 }), 0, 0.35, 0, 1.75, 0.6, 0.15);
  P.add(cached('eruinblocks', () => compose([[bbox(0.9, 0.55, 0.7, 0.06, 1.8), 0, 0.27, 0, 0, 0.4], [bbox(0.7, 0.45, 0.6, 0.06, 1.8), 0.9, 0.22, 0.6, 0, 1.2], [bbox(0.6, 0.5, 0.8, 0.06, 1.8), -0.7, 0.25, 0.9, 0.1, 2.2]])), EM.stone(), -1.4, 0, 1.6);
  P.cyl(0, 0, 1.6, 1.6); P.cyl(-1.4, 1.6, 1.1, 0.6);
  P.r = 2.6;
  return P;
}
// a nectar tree (the Nectar Orchard): a crooked trunk, a crown of soft blossom puffs in pink, rose and cream,
// one of four shapes (merged into the island's batch)
export function blossomTree(P, { h = 3.2, seed = 0 } = {}) {
  const v = seed % 4;
  P.add(cached('eblossom' + v, () => {
    const r = rng(101 + v * 17), parts = [];
    parts.push([tint(tube([[0, 0, 0], [0.12 * (r() - 0.5), 0.45, 0.1], [0.2 * (r() - 0.5), 0.8, -0.1 * r()], [0, 1.0, 0]], 0.11, 6, 1), '#7a4a32')]);
    const cols = ['#ffb8d8', '#ff9ac4', '#fff0f4', '#ffc8e0', '#f4a0d0'];
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + r(), rr = 0.32 + r() * 0.12, s = 0.36 + r() * 0.14; parts.push([tint(new THREE.SphereGeometry(1, 9, 7), cols[(k + v) % cols.length]), Math.sin(a) * rr, 1.05 + r() * 0.25, Math.cos(a) * rr, 0, 0, 0, s, s * 0.85, s]); }
    parts.push([tint(new THREE.SphereGeometry(1, 9, 7), cols[v]), 0, 1.3, 0, 0, 0, 0, 0.44, 0.36, 0.44]);
    return compose(parts, true);
  }), EM.vc(), 0, 0, 0, 0, seed * 1.3, 0, h / 1.6);
  P.cyl(0, 0, 0.25, h * 0.6); P.r = 0.9;
  return P;
}
// a broken column: a turned stone shaft snapped off at a slant (its height varies)
export function brokenCol(P, { h = 2.2 } = {}) {
  P.add(cached('ebrokecol', () => { const g = lathe([[0.42, 0], [0.42, 0.18], [0.3, 0.26], [0.28, 1.0], [0.27, 1.0]], 10, 1.2), p = g.attributes.position; for (let i = 0; i < p.count; i++) if (p.getY(i) > 0.5) p.setY(i, p.getY(i) - p.getX(i) * 0.35); g.computeVertexNormals(); return g; }), EM.stone(), 0, 0, 0, 0, 0, 0, 1, h, 1);
  P.cyl(0, 0, 0.36, h); P.r = 0.5;
  return P;
}
// an old brass telescope on a round stone step, pointing out over the clouds (local +z)
export function telescope(P) {
  P.add(cached('etelstep', () => lathe([[1.7, 0], [1.75, 0.05], [1.7, 0.32], [1.6, 0.36], [0, 0.36]], 18, 1.5)), EM.stone());
  P.add(cached('etelpillar', () => lathe([[0.36, 0], [0.24, 0.2], [0.18, 1.0], [0.26, 1.1], [0, 1.12]], 10)), EM.stone(), 0, 0.36, 0);
  P.add(cached('eteltube', () => compose([[cyl(0.13, 0.2, 2.5, 12).rotateX(Math.PI / 2)], [cyl(0.23, 0.23, 0.2, 12).rotateX(Math.PI / 2), 0, 0, 1.25], [cyl(0.07, 0.07, 0.3, 8).rotateX(Math.PI / 2), 0, 0, -1.4], [new THREE.TorusGeometry(0.2, 0.03, 4, 12), 0, 0, 0.3]])), EM.brass(), 0, 1.62, 0.1, -0.32);
  // (the step is a floor he can stand on; the pillar blocks)
  const [x, z] = P.pt(0, 0); P.cols.push({ type: 'cyl', x, z, r: 1.7, top: P.y + 0.36 });
  P.cyl(0, 0, 0.32, 2.4, { seeThrough: false }); P.r = 1.9;
  return P;
}
// the lift tower on the Lift Dock (the original's ASCENCE): a timber-and-brass frame, a winch house on top, the
// cage running up and down it (it carries cargo, not people)
export function liftTower(P, { h = 11, w = 2.8 } = {}) {
  const fr = cached('elifttower' + h + w, () => {
    const parts = [];
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) parts.push([bbox(0.2, h, 0.2, 0.02, 1), a * w / 2, h / 2, b * w / 2]);
    for (let y = 1.5; y < h - 0.5; y += 2.2) for (const [a, b, ry] of [[0, -1, 0], [0, 1, 0], [-1, 0, Math.PI / 2], [1, 0, Math.PI / 2]]) parts.push([bbox(w, 0.14, 0.12, 0.02, 1), a * w / 2, y, b * w / 2, 0, ry]);
    return compose(parts);
  });
  P.add(fr, EM.wood());
  P.add(bbox(w + 0.8, 1.8, w + 0.8, 0.06, 2.2), tm('plasterWall', { color: '#f4e4d4', rough: 0.95 }), 0, h + 0.9, 0);
  P.add(cached('eliftroof' + w, () => lathe([[(w + 0.8) * 0.72, 0], [(w + 0.8) * 0.6, 0.5], [(w + 0.8) * 0.3, 1.0], [0, 1.2]], 8)), cm(tileTex('#2f8a9a', '#e8b84a', '#2f8a9a'), { rough: 0.45 }), 0, h + 1.8, 0, 0, Math.PI / 8);
  P.add(cached('eliftwheel', () => new THREE.TorusGeometry(0.55, 0.08, 6, 16)), EM.brass(), 0, h + 0.9, (w + 0.8) / 2 + 0.06);
  const cage = new THREE.Group(); cage.position.set(P.x, P.y, P.z); cage.rotation.y = P.ry;
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; cage.add(m); return m; };
  const cw = w - 0.5;
  add(cached('eliftcagefloor' + cw, () => bbox(cw, 0.14, cw, 0.02, 1)), EM.wood(), 0, 0.07, 0);
  add(cached('eliftcagebars' + cw, () => compose([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => [cyl(0.04, 0.04, 2.0, 6), a * cw / 2, 1.0, b * cw / 2]))), brassM(), 0, 0, 0);
  add(cached('eliftcageroof' + cw, () => bbox(cw + 0.1, 0.1, cw + 0.1, 0.02, 1)), brassM(), 0, 2.05, 0);
  add(cached('eliftcrates', () => tint(compose([[bbox(0.8, 0.7, 0.8, 0.04), -0.35, 0.5, 0.2], [bbox(0.6, 0.55, 0.6, 0.04), 0.4, 0.42, -0.3, 0, 0.4]]), '#b88850')), VC(), 0, 0, 0);
  const cable = add(cached('eliftcable', () => cyl(0.02, 0.02, 1, 4)), EM.dark(), 0, 0, 0);
  P.extra.push({ obj: cage, update: (dt, t) => {
    const u = 0.5 - 0.5 * Math.cos(t * 0.26), y = 0.2 + u * (h - 2.6);
    cage.position.y = P.y + y; cable.scale.y = Math.max(0.1, h - y - 2.1); cable.position.y = 2.1 + (h - y - 2.1) / 2;
  } });
  P.box(0, 0, w / 2 + 0.1, w / 2 + 0.1, h + 3, { seeThrough: false }); P.r = w;
  return P;
}
// a deck rail between two island-local points at height y: posts and two brass rails
export function railRun(B, ax, az, bx, bz, y, { h = 1.0 } = {}) {
  const len = Math.hypot(bx - ax, bz - az); if (len < 0.3) return;
  const ry = Math.atan2(-(bz - az), bx - ax), n = Math.max(1, Math.round(len / 1.5));
  for (let i = 0; i <= n; i++) { const t = i / n; B.add(cached('erailpost' + h, () => cyl(0.045, 0.05, h, 6)), EM.brass(), ax + (bx - ax) * t, y + h / 2, az + (bz - az) * t); }
  for (const yy of [h * 0.5, h]) B.add(cached('erail' + len.toFixed(2), () => cyl(0.03, 0.03, len, 6).rotateZ(Math.PI / 2)), EM.brass(), (ax + bx) / 2, y + yy, (az + bz) / 2, 0, ry);
}
// a departures board on two posts under a little tiled roof, its text painted (one texture per list), faces +z
export function shuttleBoard(P, { title = 'ESMER SHUTTLE', lines = [] } = {}) {
  const key = title + '|' + lines.join('|');
  const tex = ctex('eboard' + key, 512, 384, (x, W, H) => {
    x.fillStyle = '#2a1e34'; x.fillRect(0, 0, W, H); x.strokeStyle = '#e8c070'; x.lineWidth = 8; x.strokeRect(6, 6, W - 12, H - 12);
    x.fillStyle = '#f0c040'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.fillText(title, W / 2, 50);
    x.fillStyle = 'rgba(232,192,112,0.5)'; x.fillRect(24, 66, W - 48, 3);
    const n = lines.length, fs = n > 10 ? 20 : n > 7 ? 24 : 30; x.font = `bold ${fs}px monospace`; x.textAlign = 'left';
    lines.forEach((l, i) => { x.fillStyle = i % 2 ? '#bfe9ff' : '#9fe0ff'; x.fillText(l, 30, 100 + i * Math.min(40, (H - 116) / Math.max(n, 1))); });
  }, false);
  for (const s of [-1, 1]) P.add(cached('eboardpost', () => cyl(0.06, 0.07, 2.7, 6)), EM.brass(), s * 0.85, 1.35, -0.04);
  P.add(cached('eboardframe', () => bbox(1.85, 1.4, 0.08, 0.02, 1)), EM.wood(), 0, 1.75, -0.04);
  P.add(cached('eboardface', () => new THREE.PlaneGeometry(1.72, 1.28)), cm(tex, { rough: 0.7 }), 0, 1.75, 0.005);
  P.add(cached('eboardroof', () => bbox(2.1, 0.08, 0.5, 0.02, 1)), EM.tiles(), 0, 2.55, 0.0, 0.25);
  P.box(0, -0.04, 0.95, 0.12, 2.6); P.r = 1.1;
  return P;
}
