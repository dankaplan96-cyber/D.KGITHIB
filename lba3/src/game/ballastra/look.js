// Ballastra's look (EXPANSION_ART_DECISIONS.md D1, D3): the materials and the small hand-made pieces the harbour and
// the places after it are built from. Our own pieces, nothing from the original games.
//
// The palette: pale warm harbour stone with a green wet course at the waterline; sun-bleached deck boards on darker
// posts; boards painted a faded teal, ochre and brick red, patched where they wore through; Ballastra ware (celadon
// glaze, terracotta, a cobalt accent) for floats, lanterns, roof tiles and the ballast pots; bronze for mechanisms, dark
// iron for chains; cream canvas, hemp rope. Restrained: the colour is in the paint, the glaze and the cloth, never in
// the stone.
//
// Every builder draws into a kit.js Batch through a props-esmer.js Place (a local frame at x, y, z turned ry), so the
// pieces merge per material with the region's own meshes, and records its colliders in Place.cols (the caller adds
// them to physics). Materials are cached (kit.js tm / pm): a piece adds no material of its own.
//
// CONTRACT
//   BM.<name>()                   the shared materials (see below)
//   bobbed(mat) / BOB.t           a twin of mat whose vertices heave and roll on the swell about their own piece's
//                                 centre (the `aPiv` attribute: bobGeo); BOB.t is the clock (the region's updater)
//   bobGeo(parts)                 merges [geo, matrix] parts of several floating pieces, each with its own pivot
//   the pieces: deckSlab, pileRow, railRun, ropeRail, lantern, bollard, crate, crateStack, jarCrate, sack, netPile,
//               netRack, washingLine, herbPot, ballastPot, barrow, buoyGeo, chainGeo, stepsGeo
import * as THREE from 'three';
import { tm, pm, cached, bbox, cyl, lathe, tube, compose, tint, ctex, VC, mergeGeos } from '../kit.js';
import { rng } from '../../engine/math.js';
import { TEX } from '../props.js';

// ------------------------------------------------------------------ materials
export const BM = {
  stone: () => tm('stone', { color: '#e4d8be', rough: 0.92 }),          // the quay's ashlar: pale warm limestone
  cap: () => tm('stone', { color: '#f1e8d4', rough: 0.86 }),            // copings and steps, a shade lighter
  wet: () => tm('rubble', { color: '#97a184', rough: 0.95 }),           // the wet courses at the waterline (algae)
  rubble: () => tm('rubble', { color: '#cfc1a4', rough: 0.95 }),        // rough piers and the arch's rock
  deck: () => tm('planks', { color: '#d6b690', rough: 0.84 }),          // sun-bleached deck boards
  deckOld: () => tm('planks', { color: '#ae9474', rough: 0.88 }),       // older, greyer boards (patches, gangways)
  post: () => tm('wood', { color: '#8a6848', rough: 0.86 }),            // posts, piles, beams
  timber: () => tm('wood', { color: '#bc946a', rough: 0.8 }),
  // painted boards (on grey boards, so the paint keeps its own hue): faded teal, ochre, brick red
  teal: () => pm('#b4ece0', 0.72, { map: TEX.planks('grey') }),
  ochre: () => pm('#fff0a8', 0.72, { map: TEX.planks('grey') }),
  brick: () => pm('#ff9a7a', 0.72, { map: TEX.planks('grey') }),
  glazeTiles: () => pm('#ffffff', 0.32, { map: TEX.tiles('#9cc8b4', '#8abcaa', '#4f6e64', false, 4, 'bl') }),   // the celadon wall tiles
  cobaltTiles: () => pm('#ffffff', 0.32, { map: TEX.tiles('#4f7cae', '#3f6c9c', '#e8e0cc', true, 4, 'blc') }),
  cream: () => tm('plaster', { color: '#f4ead6', rough: 0.95 }),        // limewashed panels
  celadon: () => pm('#9cc8b4', 0.3, { metalness: 0.05 }),               // Ballastra ware (orenpresence.js's glaze)
  celadonDeep: () => pm('#5f9a86', 0.32, { metalness: 0.05 }),
  terracotta: () => pm('#c8764e', 0.72),
  cobalt: () => pm('#3f6c9c', 0.3, { metalness: 0.05 }),
  roof: () => tm('roof', { color: '#e09a6e', rough: 0.8 }),             // fired roof tiles
  roofGlaze: () => tm('roof', { color: '#a6d2c0', rough: 0.4 }),         // glazed celadon roof tiles
  bronze: () => pm('#b07a3a', 0.42, { metalness: 0.6 }),
  iron: () => pm('#4c4e56', 0.55, { metalness: 0.5 }),
  rope: () => pm('#c8a878', 0.95),
  canvas: () => pm('#f0e8d6', 0.95, { side: THREE.DoubleSide }),
  glow: () => pm('#fff2cc', 0.4, { emissive: '#ffc070', emissiveIntensity: 0.85 }),
  dark: () => pm('#2e2a28', 0.8),
  vc: () => VC(),
  vcCloth: () => pm('#ffffff', 0.92, { vertexColors: true, side: THREE.DoubleSide }),
};

// ------------------------------------------------------------------ the swell
// (the harbour's small floating things heave and roll a little, each about its own centre, all in one draw per
//  material: the pivot rides in the vertices, so the pieces can be merged; nothing is updated per piece)
export const BOB = { t: { value: 0 } };
export function bobbed(mat) {
  return cached('blbob' + mat.uuid, () => {
    const m = mat.clone();
    m.onBeforeCompile = (s) => {
      s.uniforms.uBobT = BOB.t;
      s.vertexShader = 'uniform float uBobT;\nattribute vec3 aPiv;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        { float ph = aPiv.x * 0.73 + aPiv.z * 0.41;
          float heave = sin(uBobT * 1.15 + ph) * 0.035 + sin(uBobT * 0.57 + ph * 1.9) * 0.018;
          float ra = sin(uBobT * 0.9 + ph * 1.3) * 0.022, rb = sin(uBobT * 0.71 + ph * 0.7) * 0.018;
          transformed.y += heave + (transformed.x - aPiv.x) * ra + (transformed.z - aPiv.z) * rb; }`);
    };
    m.customProgramCacheKey = () => 'blbob';
    m.userData.noBatch = true;
    return m;
  });
}
// parts: [[geo, Matrix4, pivot Vector3]] → one geometry (position, normal, uv, color, aPiv)
export function bobGeo(parts) {
  let nv = 0, ni = 0;
  for (const [g] of parts) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3), piv = new Float32Array(nv * 3), idx = new Uint32Array(ni);
  const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  let vo = 0, io = 0;
  for (const [g, m, p] of parts) {
    nm.getNormalMatrix(m);
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, C = g.attributes.color;
    for (let i = 0; i < P.count; i++) {
      const k = (vo + i) * 3;
      v.fromBufferAttribute(P, i).applyMatrix4(m); pos[k] = v.x; pos[k + 1] = v.y; pos[k + 2] = v.z;
      if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[k] = v.x; nor[k + 1] = v.y; nor[k + 2] = v.z; }
      if (U) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i); }
      if (C) { col[k] = C.getX(i); col[k + 1] = C.getY(i); col[k + 2] = C.getZ(i); } else col[k] = col[k + 1] = col[k + 2] = 1;
      piv[k] = p.x; piv[k + 1] = p.y; piv[k + 2] = p.z;
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo;
    else for (let i = 0; i < P.count; i++) idx[io + i] = i + vo;
    vo += P.count; io += g.index ? g.index.count : P.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setAttribute('aPiv', new THREE.BufferAttribute(piv, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}
const M4 = (x, y, z, ry = 0, s = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(s, s, s));
export { M4 };

// ------------------------------------------------------------------ geometry
const T = (geo, color, key) => cached('bltint' + key + color, () => tint(geo, color));
// a chain hanging from a to b (links as small flattened rings, every other one turned)
export function chainGeo(a, b, { link = 0.11, r = 0.035 } = {}) {
  const key = `blchain${a.map((v) => v.toFixed(2))}${b.map((v) => v.toFixed(2))}${link}`;
  return cached(key, () => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]), n = Math.max(2, Math.floor(L / link));
    const dir = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize();
    const q0 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const ring = new THREE.TorusGeometry(link * 0.42, r * 0.45, 3, 6).scale(0.7, 1.25, 1);
    const parts = [];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, q = q0.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (i % 2) * Math.PI / 2));
      const m = new THREE.Matrix4().compose(new THREE.Vector3(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t), q, new THREE.Vector3(1, 1, 1));
      parts.push([ring, m]);
    }
    return mergeGeos(parts, false);
  });
}
// a buoy: a round glazed float with a bronze ring and a short mast
export const buoyGeo = (color = '#c8764e') => cached('blbuoy' + color, () => compose([
  [tint(lathe([[0, -0.3], [0.32, -0.22], [0.42, 0], [0.34, 0.2], [0.12, 0.3], [0, 0.3]], 12), color)],
  [tint(new THREE.TorusGeometry(0.42, 0.03, 4, 16).rotateX(Math.PI / 2), '#b07a3a')],
  [tint(cyl(0.025, 0.03, 0.7, 5), '#4c4e56'), 0, 0.62, 0],
  [tint(new THREE.SphereGeometry(0.06, 6, 4), '#f0e8d6'), 0, 0.98, 0],
], true));

// ------------------------------------------------------------------ decks, piles, rails, steps
// a plank deck w × d (top at P.y + top), boards along local z, a fascia board round its edge; `under`: 'piles' (fixed,
// timber piles down into the water), 'floats' (a floating platform: glazed ceramic floats and timber pontoon boxes at
// the waterline), or null. Its collider is the caller's.
export function deckSlab(P, w, d, { top = 0, thick = 0.22, mat = BM.deck(), fascia = BM.post(), under = 'piles', water = 0, seed = 1, rot = false } = {}) {
  P.add(bbox(w, thick, d, 0.03, 2.2), mat, 0, top - thick / 2, 0, 0, rot ? Math.PI / 2 : 0);
  for (const s of [-1, 1]) {
    P.add(bbox(w + 0.06, 0.16, 0.08, 0.02, 1), fascia, 0, top - thick - 0.04, s * (d / 2 + 0.02));
    P.add(bbox(0.08, 0.16, d + 0.06, 0.02, 1), fascia, s * (w / 2 + 0.02), top - thick - 0.04, 0);
  }
  const r = rng(seed * 31 + 7), wy = P.y;
  if (under === 'piles') {
    const h = top - thick + wy - water + 0.8;   // (down past the waterline)
    const nx = Math.max(2, Math.round(w / 2.6) + 1), nz = Math.max(2, Math.round(d / 2.6) + 1);
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      if (i > 0 && i < nx - 1 && j > 0 && j < nz - 1) continue;   // (the rim only: the middle is unseen)
      const x = -w / 2 + 0.2 + (i * (w - 0.4)) / (nx - 1), z = -d / 2 + 0.2 + (j * (d - 0.4)) / (nz - 1);
      P.add(cached('blpile' + h.toFixed(2), () => cyl(0.16, 0.19, h, 8, 1)), BM.post(), x, top - thick - h / 2, z, 0, r() * 3);
      P.add(cached('blpileband', () => cyl(0.205, 0.205, 0.08, 8, 1)), BM.iron(), x, water - wy + 0.12, z);
      P.add(cached('blpilewet' + 0.4, () => cyl(0.2, 0.2, 0.4, 8, 1)), BM.wet(), x, water - wy - 0.05, z);
    }
  } else if (under === 'floats') {
    // pontoon boxes along both long sides at the waterline, ceramic floats between them
    const fy = water - wy + 0.12;
    for (const s of [-1, 1]) P.add(bbox(w - 0.3, 0.5, 0.7, 0.08, 1.4), BM.deckOld(), 0, fy, s * (d / 2 - 0.45));
    const n = Math.max(1, Math.round(w / 1.6));
    for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
      const x = -w / 2 + 0.8 + (i * (w - 1.6)) / Math.max(1, n - 1);
      P.add(cached('blfloatpot', () => lathe([[0, -0.32], [0.3, -0.26], [0.4, 0], [0.34, 0.24], [0.16, 0.32], [0, 0.32]], 10)), i % 3 === 1 ? BM.terracotta() : BM.celadon(), x, fy + 0.05, s * (d / 2 - 0.05));
    }
  }
  return P;
}
// a straight run of rail from (ax, az) to (bx, bz) at height y (world-ish: P is the batch's frame at 0)
// kind: 'timber' (posts and two rails), 'rope' (posts and a sagging rope), 'iron'
export function railRun(B, cols, ax, az, bx, bz, y, { kind = 'timber', h = 1.0, every = 1.6, collide = true, ends = true } = {}) {
  const L = Math.hypot(bx - ax, bz - az); if (L < 0.2) return;
  const ry = Math.atan2(bx - ax, bz - az), n = Math.max(1, Math.round(L / every));
  const postM = kind === 'iron' ? BM.iron() : BM.post(), postG = kind === 'iron' ? cached('blrpi' + h, () => cyl(0.03, 0.035, h, 6)) : cached('blrpt' + h, () => bbox(0.1, h, 0.1, 0.02, 1));
  for (let i = ends ? 0 : 1; i <= (ends ? n : n - 1); i++) {
    const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
    B.add(postG, postM, x, y + h / 2, z, 0, ry);
    if (kind !== 'iron') B.add(cached('blrcap', () => bbox(0.14, 0.05, 0.14, 0.015, 1)), BM.timber(), x, y + h + 0.02, z, 0, ry);
  }
  const mx = (ax + bx) / 2, mz = (az + bz) / 2;
  if (kind === 'rope') {
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n, p = (t) => [ax + (bx - ax) * t, az + (bz - az) * t];
      const [x0, z0] = p(t0), [x1, z1] = p(t1), pts = [];
      for (let k = 0; k <= 6; k++) { const s = k / 6; pts.push([x0 + (x1 - x0) * s, y + h - 0.08 - 0.16 * 4 * s * (1 - s), z0 + (z1 - z0) * s]); }
      B.add(tube(pts, 0.025, 5, 1), BM.rope());
    }
  } else {
    const rail = cached('blrrail' + L.toFixed(2) + kind, () => (kind === 'iron' ? cyl(0.025, 0.025, L, 6).rotateX(Math.PI / 2) : bbox(0.07, 0.09, L, 0.02, 1.2)));
    B.add(rail, kind === 'iron' ? BM.iron() : BM.timber(), mx, y + h - 0.04, mz, 0, ry);
    B.add(rail, kind === 'iron' ? BM.iron() : BM.timber(), mx, y + h * 0.5, mz, 0, ry);
  }
  if (collide) cols.push({ type: 'box', x: mx, z: mz, hw: 0.09, hd: L / 2 + 0.05, rot: ry, top: y + 1.3, seeThrough: true, noStand: true });
}
// steps: n treads from hi down to lo across a w-wide stair, going down along +z from z0 to z1 (local); colliders
export function stepsGeo(P, w, z0, z1, hi, lo, n, { mat = BM.cap(), riser = BM.stone(), wood = false } = {}) {
  const run = (z1 - z0) / n, out = [];
  for (let i = 0; i < n; i++) {
    const top = hi - ((hi - lo) * (i + 1)) / (n + 1), z = z0 + run * (i + 0.5);
    const h = top - lo + 0.3;
    if (wood) { P.add(bbox(w, 0.08, run + 0.02, 0.015, 2.2), BM.deck(), 0, top - 0.04, z); for (const s of [-1, 1]) P.add(bbox(0.1, h, run + 0.04, 0.02, 1), BM.post(), s * (w / 2 - 0.05), top - h / 2, z); }
    else { P.add(bbox(w, 0.1, run + 0.04, 0.02, 1.2), mat, 0, top - 0.05, z); P.add(bbox(w - 0.04, h - 0.1, run, 0.01, 1.8), riser, 0, top - 0.1 - (h - 0.1) / 2, z); }
    const [x, zz] = P.pt(0, z);
    out.push({ type: 'box', x, z: zz, hw: w / 2, hd: run / 2 + 0.07, rot: P.ry, top: P.y + top, stair: true });   // (treads overlap: a seam under 0.1 m reads as no floor, physics.js groundInfo)
  }
  P.cols.push(...out);
  return out;
}

// ------------------------------------------------------------------ street furniture
// a harbour lantern: a timber post on a stone foot, an iron arm, a celadon ceramic lantern with a warm glow
export function lantern(P, { h = 2.7, arm = true } = {}) {
  P.add(cached('bllfoot', () => bbox(0.42, 0.3, 0.42, 0.04, 1)), BM.cap(), 0, 0.15, 0);
  P.add(cached('bllpost' + h, () => bbox(0.16, h, 0.16, 0.03, 1)), BM.post(), 0, 0.3 + h / 2, 0);
  const lx = arm ? 0.5 : 0, ly = arm ? h + 0.05 : h + 0.45;
  if (arm) P.add(cached('bllarm', () => compose([[bbox(0.62, 0.05, 0.05, 0.01), 0.27, 0, 0], [tube([[0, -0.35, 0], [0.18, -0.12, 0], [0.42, 0, 0]], 0.02, 4, 1)]])), BM.iron(), 0, h + 0.2, 0);
  P.add(cached('bllcap', () => lathe([[0, 0.34], [0.2, 0.26], [0.17, 0.2], [0.001, 0.2]], 8)), BM.celadonDeep(), lx, ly - 0.32, 0);
  P.add(cached('bllbody', () => lathe([[0.001, -0.12], [0.1, -0.12], [0.15, 0.0], [0.15, 0.16], [0.11, 0.2], [0.001, 0.2]], 8)), BM.glow(), lx, ly - 0.32, 0);
  P.add(cached('bllribs', () => compose([0, 1, 2, 3].map((k) => [bbox(0.03, 0.34, 0.03, 0.005), Math.sin(k * Math.PI / 2 + 0.78) * 0.155, 0.04, Math.cos(k * Math.PI / 2 + 0.78) * 0.155]))), BM.celadon(), lx, ly - 0.32, 0);
  P.add(cached('bllbase', () => lathe([[0.001, -0.2], [0.12, -0.16], [0.13, -0.12], [0.001, -0.12]], 8)), BM.celadonDeep(), lx, ly - 0.32, 0);
  P.cyl(0, 0, 0.25, h + 0.4, { seeThrough: false, noStand: true }); P.r = 0.5;
  return P;
}
// a stone mooring bollard with a coil of rope
export function bollard(P) {
  P.add(cached('blboll', () => lathe([[0, 0], [0.2, 0], [0.18, 0.42], [0.25, 0.5], [0.25, 0.58], [0.15, 0.66], [0, 0.68]], 10)), BM.cap());
  P.add(cached('blbollrope', () => new THREE.TorusGeometry(0.22, 0.045, 5, 14).rotateX(Math.PI / 2)), BM.rope(), 0, 0.3, 0);
  P.cyl(0, 0, 0.26, 0.75, { block: true }); P.r = 0.45;
  return P;
}
// a crate: boards with darker battens and a rope round it (s: size); kind 'paint' gives it a painted mark
export function crate(P, { s = 0.7, lx = 0, ly = 0, lz = 0, lry = 0, mark = null } = {}) {
  const [x, z] = P.pt(lx, lz);
  const sub = { add: (g, m, a = 0, b = 0, c = 0, rx = 0, r2 = 0) => { const cs = Math.cos(P.ry + lry), sn = Math.sin(P.ry + lry); P.B.add(g, m, x + cs * a + sn * c, P.y + ly + b, z - sn * a + cs * c, rx, P.ry + lry + r2); } };
  sub.add(cached('blcrate' + s, () => bbox(s, s * 0.9, s, 0.02, 0.9)), BM.timber(), 0, s * 0.45, 0);
  sub.add(cached('blcbat' + s, () => compose([-1, 1].flatMap((a) => [[bbox(0.06, s * 0.9 + 0.02, 0.06, 0.01), a * (s / 2 - 0.01), s * 0.45, s / 2 - 0.01], [bbox(0.06, s * 0.9 + 0.02, 0.06, 0.01), a * (s / 2 - 0.01), s * 0.45, -s / 2 + 0.01], [bbox(s + 0.02, 0.07, 0.06, 0.01), 0, a > 0 ? s * 0.88 : 0.03, s / 2 - 0.01], [bbox(s + 0.02, 0.07, 0.06, 0.01), 0, a > 0 ? s * 0.88 : 0.03, -s / 2 + 0.01]]))), BM.post());
  sub.add(cached('blcrope' + s, () => compose([[new THREE.TorusGeometry(s * 0.72, 0.022, 4, 4).scale(1, 0.62, 1).rotateY(Math.PI / 4)]])), BM.rope(), 0, s * 0.45, 0, 0, 0);
  if (mark) sub.add(cached('blcmark' + s + mark, () => tint(bbox(s * 0.4, s * 0.3, 0.01, 0.004), mark)), BM.vc(), 0, s * 0.5, s / 2 + 0.012);
  return P;
}
// 2–4 crates, the bottom ones side by side; one collider round them
export function crateStack(P, { seed = 1, n = 3, marks = ['#3f6c9c', '#c6684c', null] } = {}) {
  const r = rng(seed * 97 + 3), s = 0.66 + r() * 0.12;
  crate(P, { s, lx: -s * 0.53, lry: (r() - 0.5) * 0.15, mark: marks[0] });
  if (n > 1) crate(P, { s, lx: s * 0.53, lry: (r() - 0.5) * 0.2, mark: marks[1] });
  if (n > 2) crate(P, { s: s * 0.86, lx: (r() - 0.5) * 0.3, ly: s * 0.9, lry: (r() - 0.5) * 0.5, mark: marks[2] });
  if (n > 3) crate(P, { s: s * 0.8, lx: s * 0.3, lz: s * 0.98, lry: r() });
  P.box(0, n > 3 ? s * 0.45 : 0, s + 0.05, n > 3 ? s * 1.0 : s * 0.55, n > 2 ? s * 1.7 : s * 0.9, { seeThrough: false });
  P.r = s + 0.4;
  return P;
}
// an open crate of ceramic jars packed in straw
export function jarCrate(P, { seed = 2 } = {}) {
  const r = rng(seed * 13 + 1);
  P.add(cached('bljc', () => compose([[bbox(1.0, 0.1, 0.7, 0.02), 0, 0.05, 0], ...[-1, 1].map((s) => [bbox(1.0, 0.42, 0.06, 0.02), 0, 0.26, s * 0.32]), ...[-1, 1].map((s) => [bbox(0.06, 0.42, 0.7, 0.02), s * 0.47, 0.26, 0])])), BM.timber());
  P.add(cached('bljcstraw', () => tint(bbox(0.9, 0.05, 0.6, 0.02), '#e2c27a')), BM.vc(), 0, 0.4, 0);
  const jar = cached('bljar', () => lathe([[0, 0], [0.09, 0], [0.13, 0.08], [0.13, 0.2], [0.07, 0.29], [0.08, 0.34], [0, 0.34]], 10));
  for (let i = 0; i < 6; i++) P.add(jar, [BM.celadon(), BM.terracotta(), BM.cobalt()][(i + seed) % 3], -0.32 + (i % 3) * 0.32 + (r() - 0.5) * 0.04, 0.3, (i < 3 ? -0.14 : 0.14));
  P.box(0, 0, 0.52, 0.37, 0.75, { seeThrough: false }); P.r = 0.8;
  return P;
}
// a filled sack, leaning
export function sack(P, { lx = 0, lz = 0, lry = 0, color = '#d8c49a' } = {}) {
  P.add(cached('blsack' + color, () => tint(lathe([[0, 0], [0.22, 0.02], [0.27, 0.16], [0.24, 0.4], [0.13, 0.52], [0.06, 0.58], [0.1, 0.63], [0, 0.64]], 9).scale(1, 1, 0.75), color)), BM.vc(), lx, 0, lz, 0.08, lry);
  return P;
}
// a heap of net with floats knotted in it
export function netPile(P, { color = '#5f7f86' } = {}) {
  P.add(cached('blnetpile' + color, () => {
    const g = new THREE.SphereGeometry(0.7, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); p.setXYZ(i, x * 1.3, y * 0.55 + Math.sin(x * 9) * Math.cos(z * 7) * 0.05, z + Math.sin(x * 5) * 0.06); }
    g.computeVertexNormals(); return tint(g, color);
  }), BM.vcCloth());
  for (let i = 0; i < 4; i++) P.add(cached('blnetfloat', () => new THREE.SphereGeometry(0.08, 6, 4)), i % 2 ? BM.terracotta() : BM.celadon(), Math.sin(i * 1.7) * 0.6, 0.18 + (i % 2) * 0.1, Math.cos(i * 1.7) * 0.45);
  P.cyl(0, 0, 0.75, 0.4, { block: true }); P.r = 0.95;
  return P;
}
// nets hung to dry on a rack: two posts, a pole, a net in folds with floats along its head rope
export function netRack(P, { w = 2.8, color = '#5f7f86' } = {}) {
  for (const s of [-1, 1]) P.add(cached('blnrpost', () => cyl(0.06, 0.08, 2.3, 6, 1)), BM.post(), s * w / 2, 1.15, 0);
  P.add(cached('blnrbar' + w, () => cyl(0.045, 0.045, w + 0.3, 6, 1).rotateZ(Math.PI / 2)), BM.timber(), 0, 2.18, 0);
  P.add(cached('blnet' + w + color, () => {
    const g = new THREE.PlaneGeometry(w - 0.2, 1.7, 14, 6); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, Math.sin(x * 4.6) * 0.09 + (y < 0 ? Math.sin(x * 2.7) * 0.07 : 0)); p.setY(i, y - Math.cos(x * 2.2) * 0.14 * (y + 0.85)); }
    g.computeVertexNormals(); return tint(g, color);
  }), BM.vcCloth(), 0, 1.3, 0);
  for (let i = 0; i < Math.round(w / 0.45); i++) P.add(cached('blnetfloat', () => new THREE.SphereGeometry(0.08, 6, 4)), i % 2 ? BM.terracotta() : BM.celadon(), -w / 2 + 0.3 + i * 0.45, 2.1, 0.05);
  for (const s of [-1, 1]) P.cyl(s * w / 2, 0, 0.12, 2.3);
  P.box(0, 0, w / 2, 0.14, 1.9); P.r = w / 2 + 0.3;
  return P;
}
// a washing line between two posts (or two given points: the caller's frame), cloths in the residents' colours
export function washingLine(P, { w = 3.4, h = 2.2, colors = ['#f0e8d6', '#78b0a6', '#c6684c', '#e6b866', '#3f6c9c', '#f0e8d6'], posts = true, seed = 3 } = {}) {
  if (posts) for (const s of [-1, 1]) P.add(cached('blwlpost' + h, () => cyl(0.05, 0.06, h + 0.1, 6, 1)), BM.post(), s * w / 2, (h + 0.1) / 2, 0);
  P.add(cached('blwl' + w + h + seed + colors.join(), () => {
    const r = rng(seed), parts = [], n = Math.max(2, Math.floor(w / 0.55)), line = [];
    for (let k = 0; k <= 10; k++) { const t = k / 10, x = -w / 2 + w * t; line.push([x, h - 0.22 * 4 * t * (1 - t), 0]); }
    parts.push([tint(tube(line, 0.012, 3, 1), '#6a5a4a')]);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.7) / (n + 0.4), x = -w / 2 + w * t, sag = 0.22 * 4 * t * (1 - t), ch = 0.45 + r() * 0.35, cw = 0.32 + r() * 0.16;
      const g = new THREE.PlaneGeometry(cw, ch, 2, 3); g.translate(0, -ch / 2, 0);
      const p = g.attributes.position; for (let k = 0; k < p.count; k++) p.setZ(k, Math.sin(p.getY(k) * 6 + i) * 0.03);
      g.computeVertexNormals();
      parts.push([tint(g, colors[(i + seed) % colors.length]), x, h - sag - 0.01, 0, 0, (r() - 0.5) * 0.3, 0]);
    }
    return compose(parts, true);
  }), BM.vcCloth());
  if (posts) for (const s of [-1, 1]) P.cyl(s * w / 2, 0, 0.1, h);
  P.r = w / 2 + 0.3;
  return P;
}
// a terracotta pot of herbs (rosemary-like spires or a round leafy herb), on the ground or a deck
export function herbPot(P, { lx = 0, lz = 0, kind = 0, s = 1, ly = 0 } = {}) {
  P.add(cached('blhpot', () => lathe([[0, 0], [0.16, 0], [0.2, 0.05], [0.22, 0.3], [0.25, 0.33], [0.25, 0.36], [0, 0.36]], 10)), (kind & 2) ? BM.celadon() : BM.terracotta(), lx, ly, lz, 0, 0, 0, s);
  const leaf = cached('blherb' + (kind & 1), () => {
    const r = rng(11 + (kind & 1)), parts = [];
    if (kind & 1) for (let i = 0; i < 9; i++) { const a = i * 2.4, rr = 0.05 + r() * 0.09; parts.push([tint(new THREE.SphereGeometry(0.08 + r() * 0.04, 6, 4), r() < 0.5 ? '#6a9a4a' : '#7eae56'), Math.sin(a) * rr, 0.42 + r() * 0.12, Math.cos(a) * rr]); }
    else for (let i = 0; i < 11; i++) { const a = i * 2.1, rr = r() * 0.1; parts.push([tint(cyl(0.004, 0.03, 0.3 + r() * 0.2, 4), r() < 0.5 ? '#5a7e52' : '#6e8e5a'), Math.sin(a) * rr, 0.5, Math.cos(a) * rr, (r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4]); }
    return compose(parts, true);
  });
  P.add(leaf, BM.vc(), lx, ly, lz, 0, 0, 0, s);
  return P;
}
// a big glazed ballast pot (Ballastra ware: the harbour's weights and floats), bronze-banded, with a lug for a chain
export function ballastPot(P, { lx = 0, lz = 0, s = 1, mat = BM.celadon() } = {}) {
  P.add(cached('blbpot', () => lathe([[0, 0], [0.32, 0], [0.42, 0.12], [0.46, 0.38], [0.4, 0.62], [0.24, 0.74], [0.26, 0.82], [0, 0.82]], 12)), mat, lx, 0, lz, 0, 0, 0, s);
  P.add(cached('blbpotband', () => new THREE.TorusGeometry(0.455, 0.025, 4, 16).rotateX(Math.PI / 2)), BM.bronze(), lx, 0.4 * s, lz, 0, 0, 0, s);
  P.add(cached('blbpotlug', () => new THREE.TorusGeometry(0.08, 0.022, 4, 10)), BM.bronze(), lx, 0.88 * s, lz, 0, 0, 0, s);
  P.cyl(lx, lz, 0.46 * s, 0.85 * s, { seeThrough: false }); P.r = Math.max(P.r, 0.6 * s);
  return P;
}
// a two-wheeled hand barrow with a load of sacks
export function barrow(P) {
  P.add(cached('blbarrow', () => compose([[bbox(0.9, 0.08, 0.7, 0.02), 0, 0.42, 0], ...[-1, 1].map((s) => [bbox(0.9, 0.2, 0.05, 0.01), 0, 0.52, s * 0.34]), [bbox(0.05, 0.25, 0.7, 0.01), 0.45, 0.55, 0],
    ...[-1, 1].map((s) => [bbox(1.1, 0.05, 0.05, 0.01), -0.85, 0.5, s * 0.3, 0, 0, 0.18])])), BM.teal());
  for (const s of [-1, 1]) P.add(cached('blbwheel', () => compose([[cyl(0.26, 0.26, 0.06, 12).rotateX(Math.PI / 2)], [cyl(0.05, 0.05, 0.08, 6).rotateX(Math.PI / 2)]])), BM.post(), 0.1, 0.26, s * 0.42);
  sack(P, { lx: 0.1, lz: -0.15, lry: 0.4 }); sack(P, { lx: -0.15, lz: 0.15, lry: -0.3, color: '#cbb488' });
  P.box(-0.2, 0, 0.75, 0.45, 0.9, { block: true }); P.r = 1.0;
  return P;
}

// a painted placeholder board (no story text: a pictogram, the spec's placeholder words only)
export const signTex = (key, draw) => ctex('blsign' + key, 256, 128, draw, false);
