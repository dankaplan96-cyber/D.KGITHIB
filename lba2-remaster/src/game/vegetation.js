// Sculpted trees and bushes (SDF → mesh, see engine/sculpt.js).
// LBA2's Citadel trees are puffy rounded canopies on short sturdy trunks;
// these keep that silhouette with lumpy leaf masses, a tapered trunk with
// a root flare and branches that disappear into the foliage.
import * as THREE from 'three';
import { sculptRigid } from '../engine/sculpt.js';
import { rng } from '../engine/math.js';

const leafy = (amp, f) => (x, y, z) => (Math.sin(x * f) * Math.sin(y * f * 1.1 + 1.3) * Math.sin(z * f * 0.9 + 2.1)) * amp;

function trunk(P, h, r0, r1, seed) {
  const r = rng(seed);
  P.push({ type: 'cone', a: [0, -0.2, 0], b: [0, h, 0], r1: r0, r2: r1, mat: 'bark', group: 'wood', bone: 'x', wobble: (x, y, z) => Math.sin(Math.atan2(x, z) * 7 + y * 3) * 0.015 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + r();
    P.push({ type: 'cone', a: [0, 0.35, 0], b: [Math.cos(a) * r0 * 1.8, -0.05, Math.sin(a) * r0 * 1.8], r1: r0 * 0.55, r2: r0 * 0.3, mat: 'bark', group: 'wood', bone: 'x' });
  }
  const branches = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + r() * 1.5;
    const b = [Math.cos(a) * (0.5 + r() * 0.4), h + 0.5 + r() * 0.5, Math.sin(a) * (0.5 + r() * 0.4)];
    P.push({ type: 'cone', a: [0, h * 0.8, 0], b, r1: r1 * 0.8, r2: r1 * 0.35, mat: 'bark', group: 'wood', bone: 'x' });
    branches.push(b);
  }
  return branches;
}

const VARIANTS = {
  round: (seed) => {
    const r = rng(seed), P = [];
    trunk(P, 1.5, 0.28, 0.17, seed);
    const c = [0, 2.85, 0];
    P.push({ type: 'ell', c, r: [1.25, 1.0, 1.2], mat: 'leaf', group: 'leaf', bone: 'x', wobble: leafy(0.07, 7) });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + r(), up = r() * 0.9 - 0.2;
      P.push({ type: 'ell', c: [c[0] + Math.cos(a) * 1.0, c[1] + up, c[2] + Math.sin(a) * 1.0], r: [0.65 + r() * 0.25, 0.55 + r() * 0.2, 0.65 + r() * 0.25], mat: 'leaf', group: 'leaf', bone: 'x', wobble: leafy(0.06, 8) });
    }
    P.push({ type: 'ell', c: [0.1, 3.75, 0], r: [0.7, 0.5, 0.7], mat: 'leaf', group: 'leaf', bone: 'x', wobble: leafy(0.06, 8) });
    return { P, h: 4.6, w: 2.4 };
  },
  fruit: (seed) => {
    const t = VARIANTS.round(seed);
    const r = rng(seed + 5);
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2, y = 2.2 + r() * 1.6;
      const rad = 1.2 * Math.sqrt(Math.max(0.15, 1 - ((y - 2.85) / 1.2) ** 2));
      t.P.push({ type: 'ell', c: [Math.cos(a) * rad, y, Math.sin(a) * rad], r: [0.09, 0.09, 0.09], mat: 'fruit', group: 'fruit', bone: 'x' });
    }
    return t;
  },
  tall: (seed) => {
    const r = rng(seed), P = [];
    trunk(P, 1.0, 0.22, 0.14, seed);
    for (let i = 0; i < 6; i++) {
      const y = 1.6 + i * 0.75;
      const rad = 0.75 - Math.abs(i - 2) * 0.1;
      P.push({ type: 'ell', c: [(r() - 0.5) * 0.2, y, (r() - 0.5) * 0.2], r: [rad, 0.65, rad], mat: 'leafDark', group: 'leaf', bone: 'x', wobble: leafy(0.05, 9) });
    }
    return { P, h: 6.2, w: 1.6 };
  },
  pine: (seed) => {
    const P = [];
    P.push({ type: 'cone', a: [0, -0.2, 0], b: [0, 1.4, 0], r1: 0.24, r2: 0.15, mat: 'bark', group: 'wood', bone: 'x' });
    for (let i = 0; i < 4; i++) {
      const y = 1.2 + i * 1.0, rad = 1.5 - i * 0.32;
      P.push({ type: 'ccone', c: [0, y + 0.45, 0], h: 0.55, rt: rad * 0.25, rb: rad, round: 0.12, mat: 'needle', group: 'leaf', bone: 'x', wobble: (x, yy, z) => Math.sin(Math.atan2(x, z) * 11) * 0.05 * (1 - (yy - y) / 1.1) });
    }
    return { P, h: 5.6, w: 3.0 };
  },
  bush: (seed) => {
    const r = rng(seed), P = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + r();
      P.push({ type: 'ell', c: [Math.cos(a) * 0.35, 0.35 + r() * 0.15, Math.sin(a) * 0.35], r: [0.45, 0.4, 0.45], mat: 'leaf', group: 'leaf', bone: 'x', wobble: leafy(0.04, 12) });
    }
    if (r() < 0.6) for (let i = 0; i < 8; i++) {
      const a = r() * Math.PI * 2;
      P.push({ type: 'ell', c: [Math.cos(a) * 0.62, 0.3 + r() * 0.45, Math.sin(a) * 0.62], r: [0.05, 0.05, 0.05], mat: 'blossom', group: 'fruit', bone: 'x' });
    }
    return { P, h: 1.0, w: 1.1 };
  },
};

const COLORS = { bark: '#6a4a30', leaf: '#4f9a38', leafDark: '#3a7a3a', needle: '#2f6b3a', fruit: '#e0402a', blossom: '#ff8ac0' };

const geos = new Map();
// lod 1: the same tree sculpted on a 2.6× coarser grid (≈1/6 of the triangles), for distant tiles
export function treeGeometry(kind, seed = 1, lod = 0) {
  const key = kind + seed + (lod ? '-lo' : '');
  if (geos.has(key)) return geos.get(key);
  const t = VARIANTS[kind](seed);
  const half = t.w + 0.3;
  const geo = sculptRigid({
    key: 'tree-' + key, prims: t.P, groups: { wood: 0.08, leaf: 0.28, fruit: 0 }, joinK: 0.06,
    colors: COLORS,
    paint: (p, m, col) => {
      if (m.startsWith('leaf') || m === 'needle') {
        // sunlit top, cooler shaded underside, a little hue variation
        const k = Math.max(0, Math.min(1, (p.y - 1.4) / (t.h - 1.4)));
        col.offsetHSL((Math.sin(p.x * 3 + p.z * 2) * 0.012), 0.02, -0.07 + k * 0.12);
      }
      if (m === 'bark' && p.y < 0.2) col.multiplyScalar(0.8);
    },
    bounds: { min: [-half, -0.25, -half], max: [half, t.h + 0.3, half] }, cell: (kind === 'bush' ? 0.075 : 0.12) * (lod ? 2.6 : 1),
  });
  geos.set(key, geo);
  return geo;
}

// Boulders: a few overlapping lumps with chipped facets, mossy on top
export function rockGeometry(seed = 1, lod = 0) {
  const key = 'rock' + seed + (lod ? '-lo' : '');
  if (geos.has(key)) return geos.get(key);
  const r = rng(seed * 31 + 7), P = [];
  const facet = (x, y, z) => (Math.abs(Math.sin(x * 5.1 + y * 2.3)) + Math.abs(Math.sin(z * 4.7 - x * 1.9)) + Math.abs(Math.sin(y * 6.3 + z * 2.9))) * 0.035 - 0.05;
  P.push({ type: 'ell', c: [0, 0.25, 0], r: [1.0, 0.62, 0.85], mat: 'rock', group: 'r', bone: 'x', wobble: facet });
  for (let i = 0; i < 3; i++) {
    const a = r() * Math.PI * 2;
    P.push({ type: 'ell', c: [Math.cos(a) * 0.55, 0.15 + r() * 0.3, Math.sin(a) * 0.5], r: [0.5 + r() * 0.25, 0.4 + r() * 0.2, 0.5 + r() * 0.2], mat: 'rock', group: 'r', bone: 'x', wobble: facet });
  }
  const geo = sculptRigid({
    key: 'rock-' + seed + (lod ? '-lo' : ''), prims: P, groups: { r: 0.18 }, joinK: 0.1,
    colors: { rock: '#9a9182' },
    paint: (p, m, col) => {
      const n = Math.sin(p.x * 7 + p.z * 5) * Math.sin(p.y * 9 - p.x * 4);
      col.offsetHSL(0, 0, n * 0.04);
      if (p.y > 0.55) col.lerp(new THREE.Color('#6f8f45'), Math.min(0.55, (p.y - 0.55) * 1.6)); // moss
    },
    bounds: { min: [-1.7, -0.5, -1.6], max: [1.7, 1.2, 1.6] }, cell: 0.07 * (lod ? 2.6 : 1),
  });
  geos.set(key, geo);
  return geo;
}

// A clump of curved, tapered grass blades (root dark, tips light) for instancing
export function grassClumpGeometry(seed = 1, blades = 9) {
  const r = rng(seed);
  const pos = [], col = [], idx = [];
  const root = new THREE.Color('#4a742c'), tip = new THREE.Color('#b0cc62'); // (warm, toward the lawns' olive)
  const c = new THREE.Color();
  for (let b = 0; b < blades; b++) {
    const a = r() * Math.PI * 2, lean = 0.15 + r() * 0.35, h = 0.28 + r() * 0.32, w = 0.03 + r() * 0.02;
    const ox = Math.cos(a) * r() * 0.12, oz = Math.sin(a) * r() * 0.12;
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx; // lean direction and blade width axis
    const base = pos.length / 3;
    const SEG = 3;
    for (let k = 0; k <= SEG; k++) {
      const t = k / SEG, y = h * t, bend = lean * h * t * t, ww = w * (1 - t * 0.92);
      for (const s of [-1, 1]) {
        pos.push(ox + dx * bend + px * ww * s, y, oz + dz * bend + pz * ww * s);
        c.copy(root).lerp(tip, t * (0.7 + r() * 0.3));
        col.push(c.r, c.g, c.b);
      }
      if (k < SEG) { const i0 = base + k * 2; idx.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2); }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // grass lit like the ground beneath it rather than like thin cards
  const n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, n.getX(i) * 0.25, 1, n.getZ(i) * 0.25);
  n.needsUpdate = true;
  g.normalizeNormals();
  return g;
}

// Small wild flower: a thin stem with a five-petal head
// A tulip for the flower beds (LBA2's Citadel has dense beds of red, yellow and blue tulips): a taller
// stem, two blade leaves and a cup of three petals, big enough to read at the game camera's distance.
export function tulipGeometry(petal = '#e8343a') {
  const parts = [], cols = [];
  const stem = new THREE.CylinderGeometry(0.011, 0.014, 0.44, 4); stem.translate(0, 0.22, 0);
  parts.push([stem, '#3f7d2e']);
  for (const s of [1, -1]) {
    const leaf = new THREE.ConeGeometry(0.035, 0.3, 3); leaf.scale(1, 1, 0.3);
    leaf.rotateZ(s * 0.35); leaf.translate(s * 0.045, 0.14, 0);
    parts.push([leaf, '#4c8f34']);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const pet = new THREE.SphereGeometry(0.05, 5, 3, 0, Math.PI * 2, 0, Math.PI * 0.75); pet.scale(0.75, 1.25, 0.55); // (thousands of them: few triangles)
    pet.rotateY(a); pet.translate(Math.cos(a) * 0.022, 0.48, Math.sin(a) * 0.022);
    parts.push([pet, petal]);
  }
  const geos = parts.map(([g, col]) => {
    const c = new THREE.Color(col);
    for (let k = 0; k < g.attributes.position.count; k++) cols.push(c.r, c.g, c.b);
    g.deleteAttribute('uv');
    if (g.index) { const ng = g.toNonIndexed(); return ng; }
    return g;
  });
  // (colours were pushed per indexed vertex; rebuild them for the non-indexed copies)
  const cols2 = [];
  geos.forEach((g, i) => { const c = new THREE.Color(parts[i][1]); for (let k = 0; k < g.attributes.position.count; k++) cols2.push(c.r, c.g, c.b); });
  const merged = mergeGeos(geos);
  merged.setAttribute('color', new THREE.Float32BufferAttribute(cols2, 3));
  return merged;
}

export function flowerGeometry(petal = '#ffffff') {
  const stem = new THREE.CylinderGeometry(0.008, 0.01, 0.36, 4); stem.translate(0, 0.18, 0);
  const parts = [stem];
  for (let i = 0; i < 5; i++) {
    const p = new THREE.SphereGeometry(0.035, 6, 4); p.scale(1, 0.35, 0.6);
    const a = (i / 5) * Math.PI * 2;
    p.translate(Math.cos(a) * 0.035, 0.37, Math.sin(a) * 0.035);
    parts.push(p);
  }
  const heart = new THREE.SphereGeometry(0.022, 6, 4); heart.translate(0, 0.38, 0);
  parts.push(heart);
  // colours: stem green, petals white (tinted per instance), heart yellow
  const cols = [];
  parts.forEach((g, i) => {
    const c = new THREE.Color(i === 0 ? '#4f8f3a' : i === parts.length - 1 ? '#ffd84a' : petal);
    for (let k = 0; k < g.attributes.position.count; k++) cols.push(c.r, c.g, c.b);
    g.deleteAttribute('uv');
  });
  const merged = mergeGeos(parts);
  merged.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  return merged;
}

function mergeGeos(list) {
  const pos = [], nor = [], idx = [];
  let off = 0;
  for (const g of list) {
    const gi = g.index ? g.index.array : [...Array(g.attributes.position.count).keys()];
    pos.push(...g.attributes.position.array); nor.push(...g.attributes.normal.array);
    for (const i of gi) idx.push(i + off);
    off += g.attributes.position.count;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  m.setIndex(idx);
  return m;
}

// Palm (the original's Citadel has small palms by the shore and in gardens): a ringed trunk leaning into a
// curve, sculpted, and a crown of drooping fronds built as folded strips (too thin to sculpt), both sides,
// with a few coconuts. One vertex-coloured geometry like the trees, so it shares their material and LOD.
const palms = new Map();
export function palmGeometry(seed = 1, lod = 0) {
  const key = seed + (lod ? '-lo' : '');
  if (palms.has(key)) return palms.get(key);
  const r = rng(seed * 31 + 7), H = 4.2 + r() * 0.5, lean = 0.5 + r() * 0.4, P = [];
  const at = (t) => [lean * t * t, H * t, 0];
  const SEG = 7;
  for (let i = 0; i < SEG; i++) {
    const a = at(i / SEG), b = at((i + 1) / SEG);
    P.push({ type: 'cone', a, b, r1: 0.21 - i * 0.012, r2: 0.15 - i * 0.008, mat: 'bark', group: 'wood' });
  }
  P.push({ type: 'cone', a: [0, -0.2, 0], b: [0, 0.35, 0], r1: 0.32, r2: 0.2, mat: 'bark', group: 'wood' });
  const top = at(1);
  for (let k = 0; k < 3; k++) { const a = k * 2.1 + r(); P.push({ type: 'ell', c: [top[0] + Math.cos(a) * 0.17, top[1] - 0.2, Math.sin(a) * 0.17], r: [0.13, 0.14, 0.13], mat: 'nut', group: 'nut' }); }
  P.push({ type: 'ell', c: [top[0], top[1] + 0.02, 0], r: [0.2, 0.16, 0.2], mat: 'frond', group: 'nut' });
  const trunk = sculptRigid({
    key: 'palm-' + key, prims: P, groups: { wood: 0.05, nut: 0.04 }, joinK: 0.04,
    colors: { bark: '#8a6a44', nut: '#6a4a2a', frond: '#4a8a34' },
    paint: (p, m, col) => { if (m === 'bark') col.offsetHSL(0, 0, Math.sin(p.y * 11) * 0.06 - (p.y < 0.3 ? 0.08 : 0)); },
    bounds: { min: [-0.6, -0.25, -0.6], max: [lean + 0.6, H + 0.4, 0.6] }, cell: 0.07 * (lod ? 2.2 : 1),
  });
  // fronds: a spine that arcs up and droops, leaflets folded down from it in a shallow V
  const pos = [], col = [], idx = [];
  const base = new THREE.Color('#3f7a2c'), tip = new THREE.Color('#8cc04a'), c = new THREE.Color();
  const N = 8 + Math.floor(r() * 2), S = lod ? 4 : 8;
  for (let f = 0; f < N; f++) {
    const a = (f / N) * Math.PI * 2 + r() * 0.4, L = 1.9 + r() * 0.5, up = 0.5 + r() * 0.4, droop = 1.5 + r() * 0.5, W = 0.36 + r() * 0.08;
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx;
    const v0 = pos.length / 3;
    for (let k = 0; k <= S; k++) {
      const t = k / S, d = L * t, y = top[1] + up * t - droop * t * t, w = W * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08 + 0.04)), 0.7);
      for (const s of [-1, 0, 1]) {
        pos.push(top[0] + dx * d + px * w * s, y - Math.abs(s) * w * 0.35, dz * d + pz * w * s);
        c.copy(base).lerp(tip, t * 0.8 + (s ? 0.1 : 0)); col.push(c.r, c.g, c.b);
      }
      if (k < S) for (const o of [0, 1]) { const i0 = v0 + k * 3 + o; idx.push(i0, i0 + 3, i0 + 1, i0 + 1, i0 + 3, i0 + 4); }
    }
  }
  const fr = new THREE.BufferGeometry();
  fr.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  fr.setIndex(idx);
  fr.computeVertexNormals();
  // the back faces: the same strips wound the other way with flipped normals
  const n = fr.attributes.normal.array, nv = pos.length / 3;
  const pos2 = [...pos, ...pos], col2 = [...col, ...col], nor2 = [...n, ...Array.from(n, (v) => -v)], idx2 = [...idx];
  for (let i = 0; i < idx.length; i += 3) idx2.push(idx[i] + nv, idx[i + 2] + nv, idx[i + 1] + nv);
  const fronds = new THREE.BufferGeometry();
  fronds.setAttribute('position', new THREE.Float32BufferAttribute(pos2, 3));
  fronds.setAttribute('normal', new THREE.Float32BufferAttribute(nor2, 3));
  fronds.setIndex(idx2);
  const g = mergeGeos([trunk, fronds]);
  g.setAttribute('color', new THREE.Float32BufferAttribute([...trunk.attributes.color.array, ...col2], 3));
  g.computeBoundingSphere();
  palms.set(key, g);
  return g;
}
