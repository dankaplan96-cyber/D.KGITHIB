// Dressing for Ilka's camp and the Joint Project's research post on Desert Island (POLISH-AUDIT #15), plus the shared
// vertex-coloured materials the gate and the sand-yacht use too (desert.js).
//
// The camp was a flat beige lean-to, four crates, a table and a telescope; the post a bare concrete pad with three
// cabins and a derrick. Both now read as places somebody lives and works in: tents with volume (a ridge tent with an
// open door and a lived-in inside, a round bell tent), a woven rug, a fire pit with a flickering flame and a thread of
// smoke, lanterns, water barrels, a tarp over the work table, and the equipment of the job (sample trays, a sieve,
// a survey board, tools; at the post: an awning over each cabin door, a pipe rack, drums and a cable spool, a
// workbench, a covered equipment pile, safety markings round the bore).
//
// DRAW CALLS: the parts are tinted by vertex colour and merged, so the whole of an area is a handful of meshes, one
// per material: PAINT (flat colours), CLOTH (woven cloth, any colour), WOOD (planks, any tint), STONE, the lanterns,
// the striped tarps, the ember bed, the rug, the survey board and two flames. No light is added (the lanterns are
// emissive), no material is made after the region is, so nothing compiles after loading. Collisions are by role:
// tents, barrels, drums, the table, the bench and the pipe rack block (things you walk round); the rug, tarps,
// lanterns and tools do not.
import * as THREE from 'three';
import { Plume } from '../engine/softfx.js';
import { ctex, cached, bbox, cyl, lathe, Batch, rod, frame, tint } from './kit.js';

// ---------------------------------------------------------------- shared vertex-coloured materials
export const PAINT = () => cached('dpPaint', () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, vertexColors: true }));
export const CLOTH = () => cached('dpCloth', () => new THREE.MeshStandardMaterial({ map: clothTex(), color: '#ffffff', side: THREE.DoubleSide, roughness: 0.95, vertexColors: true }));
export const WOOD = () => cached('dpWood', () => new THREE.MeshStandardMaterial({ map: plankTex(), color: '#ffffff', roughness: 0.88, vertexColors: true }));
export const STONE = () => cached('dpStone', () => new THREE.MeshStandardMaterial({ map: stoneTex(), color: '#ffffff', roughness: 0.92, vertexColors: true }));
// a geometry's copy in one flat colour (cached per geometry and colour)
const TINTS = new WeakMap();
export const tinted = (geo, c) => {
  let m = TINTS.get(geo); if (!m) { m = new Map(); TINTS.set(geo, m); }
  if (!m.has(c)) m.set(c, tint(geo, c));
  return m.get(c);
};
// a Batch that takes colour strings and {w|cl|st: colour} tokens as the "material": PAINT, WOOD, CLOTH, STONE tinted
export const Wd = (c) => ({ w: c }), Cl = (c) => ({ cl: c }), St = (c) => ({ st: c });
const resolve = (geo, m) => {
  if (typeof m === 'string') return [tinted(geo, m), PAINT()];
  if (m && m.w) return [tinted(geo, m.w), WOOD()];
  if (m && m.cl) return [tinted(geo, m.cl), CLOTH()];
  if (m && m.st) return [tinted(geo, m.st), STONE()];
  return [geo, m];
};
export const tintedBatch = (parent, opts) => {
  const B = new Batch(parent, opts);
  return {
    add(geo, m, ...a) { const [g, mm] = resolve(geo, m); B.add(g, mm, ...a); return this; },
    addM(geo, m, mat4) { const [g, mm] = resolve(geo, m); B.addM(g, mm, mat4); return this; },
    build() { return B.build(); },
  };
};

// ---------------------------------------------------------------- textures (made once)
function clothTex() {
  return ctex('campCloth', 128, 128, (x, S) => {
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < S; i += 4) { x.fillStyle = 'rgba(90,70,40,0.07)'; x.fillRect(i, 0, 1, S); x.fillRect(0, i, S, 1); }
    x.fillStyle = 'rgba(90,70,40,0.2)'; x.fillRect(0, 0, 2, S); x.fillRect(S / 2 - 1, 0, 2, S);
    for (let i = 0; i < 14; i++) { x.fillStyle = `rgba(120,90,50,${0.05 + (i % 3) * 0.03})`; x.beginPath(); x.arc((i * 37) % S, (i * 53) % S, 5 + (i % 4) * 3, 0, Math.PI * 2); x.fill(); }
  });
}
function plankTex() {   // light planks (white-ish, grain and joints): tinted to any wood
  return ctex('campPlank', 128, 128, (x, S) => {
    x.fillStyle = '#f4ece0'; x.fillRect(0, 0, S, S);
    for (let j = 0; j < 4; j++) {
      x.fillStyle = j % 2 ? 'rgba(120,80,40,0.08)' : 'rgba(255,255,255,0.1)'; x.fillRect(0, j * S / 4, S, S / 4);
      x.fillStyle = 'rgba(70,45,20,0.45)'; x.fillRect(0, j * S / 4, S, 2);
      for (let k = 0; k < 9; k++) { x.fillStyle = `rgba(90,60,30,${0.08 + (k % 3) * 0.04})`; x.fillRect((k * 29 + j * 17) % S, j * S / 4 + 4 + (k * 7) % 22, 18 + (k % 4) * 10, 1); }
      x.fillStyle = 'rgba(70,45,20,0.4)'; x.fillRect((j * 53 + 20) % S, j * S / 4, 2, S / 4);
    }
  });
}
function stoneTex() {   // light blocks, tinted
  return ctex('campStone', 128, 128, (x, S) => {
    x.fillStyle = '#e8e0d4'; x.fillRect(0, 0, S, S);
    for (let j = 0; j < 3; j++) { x.fillStyle = 'rgba(80,60,40,0.35)'; x.fillRect(0, j * S / 3, S, 2); for (let i = 0; i < 3; i++) x.fillRect(((i + j * 0.5) * S / 2.5) % S, j * S / 3, 2, S / 3); }
  });
}
const stripeTex = (a, b) => ctex('campStripe' + a + b, 64, 64, (x, S) => {
  for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect(i * S / 4, 0, S / 4, S); }
  for (let i = 0; i < S; i += 4) { x.fillStyle = 'rgba(70,50,30,0.07)'; x.fillRect(0, i, S, 1); }
});
const rugTex = () => ctex('campRug', 128, 96, (x, W, H) => {
  x.fillStyle = '#9a3a28'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#f0dcb0'; x.fillRect(6, 6, W - 12, H - 12);
  x.fillStyle = '#2f7a8a'; x.fillRect(12, 12, W - 24, H - 24);
  x.fillStyle = '#d9a23a';
  for (let i = 0; i < 3; i++) { const cx = W * (0.25 + i * 0.25), cy = H / 2; x.beginPath(); x.moveTo(cx, cy - 22); x.lineTo(cx + 14, cy); x.lineTo(cx, cy + 22); x.lineTo(cx - 14, cy); x.closePath(); x.fill(); }
  x.fillStyle = '#9a3a28';
  for (let i = 0; i < 3; i++) { const cx = W * (0.25 + i * 0.25), cy = H / 2; x.beginPath(); x.moveTo(cx, cy - 10); x.lineTo(cx + 6, cy); x.lineTo(cx, cy + 10); x.lineTo(cx - 6, cy); x.closePath(); x.fill(); }
  x.fillStyle = '#f0dcb0'; for (let i = 0; i < W; i += 8) { x.fillRect(i, 0, 4, 4); x.fillRect(i, H - 4, 4, 4); }
}, false);
const surveyTex = () => ctex('campSurvey', 128, 96, (x, W, H) => {
  x.fillStyle = '#efe2c0'; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(120,80,40,0.75)'; x.lineWidth = 1.5;
  for (let k = 0; k < 5; k++) { x.beginPath(); x.ellipse(W * 0.45, H * 0.55, 14 + k * 11, 9 + k * 7, 0.3, 0, Math.PI * 2); x.stroke(); }
  x.strokeStyle = '#2f7a9a'; x.lineWidth = 2; x.beginPath(); x.moveTo(8, H * 0.8); x.bezierCurveTo(W * 0.3, H * 0.5, W * 0.6, H * 0.9, W - 8, H * 0.3); x.stroke();
  x.fillStyle = '#c84a3a'; x.beginPath(); x.arc(W * 0.42, H * 0.5, 4, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#c84a3a'; x.fillRect(W * 0.42 - 1, H * 0.5 + 4, 2, 10);
}, false);
const striped = (a, b) => cached('st' + a + b, () => new THREE.MeshStandardMaterial({ map: stripeTex(a, b), side: THREE.DoubleSide, roughness: 0.95 }));

// ---------------------------------------------------------------- geometry (cached)
// a ridge tent: x across (W), z along (L), the ridge on x = 0, the door in the +z gable (full wall height, 1.2 m
// wide), eaves that overhang, a closed back gable. Local origin on the ground at the middle.
const tentGeo = (L, W, Hw, Hr) => cached(`tent${L},${W},${Hw},${Hr}`, () => {
  const pos = [], uv = [], hl = L / 2, hw = W / 2, M = 1.6;
  const tri = (a, b, c, ua, ub, uc) => { pos.push(...a, ...b, ...c); uv.push(...ua, ...ub, ...uc); };
  const quad = (a, b, c, d, w, h) => { tri(a, b, c, [0, 0], [w / M, 0], [w / M, h / M]); tri(a, c, d, [0, 0], [w / M, h / M], [0, h / M]); };
  const sl = Math.hypot(hw, Hr - Hw), e = 0.22, ex = hw + hw / sl * e, ey = Hw - (Hr - Hw) / sl * e, z0 = hl + 0.18;
  quad([-ex, ey, -z0], [0, Hr, -z0], [0, Hr, z0], [-ex, ey, z0], 2 * z0, sl + e);
  quad([ex, ey, -z0], [0, Hr, -z0], [0, Hr, z0], [ex, ey, z0], 2 * z0, sl + e);
  quad([-hw, 0, -hl], [-hw, Hw, -hl], [-hw, Hw, hl], [-hw, 0, hl], L, Hw);
  quad([hw, 0, -hl], [hw, Hw, -hl], [hw, Hw, hl], [hw, 0, hl], L, Hw);
  tri([-hw, 0, -hl], [-hw, Hw, -hl], [0, Hr, -hl], [0, 0], [0, Hw / M], [hw / M, Hr / M]);
  tri([-hw, 0, -hl], [0, Hr, -hl], [hw, Hw, -hl], [0, 0], [hw / M, Hr / M], [W / M, Hw / M]);
  tri([-hw, 0, -hl], [hw, Hw, -hl], [hw, 0, -hl], [0, 0], [W / M, Hw / M], [W / M, 0]);
  tri([-hw, Hw, hl], [hw, Hw, hl], [0, Hr, hl], [0, Hw / M], [W / M, Hw / M], [hw / M, Hr / M]);
  quad([-hw, 0, hl], [-0.6, 0, hl], [-0.6, Hw, hl], [-hw, Hw, hl], hw - 0.6, Hw);
  quad([0.6, 0, hl], [hw, 0, hl], [hw, Hw, hl], [0.6, Hw, hl], hw - 0.6, Hw);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  return g;
});
const bellGeo = cached('bell', () => lathe([[1.65, 0], [1.65, 0.85], [1.52, 1.25], [1.1, 1.85], [0.6, 2.4], [0.25, 2.72], [0.0, 2.9]], 22, 1.6));
const barrelGeo = cached('bar', () => lathe([[0.0, 0], [0.29, 0], [0.34, 0.16], [0.365, 0.44], [0.34, 0.74], [0.29, 0.9], [0.27, 0.9], [0.0, 0.88]], 14, 0.9));
const potGeo = cached('pot', () => lathe([[0.0, 0], [0.16, 0.02], [0.22, 0.14], [0.22, 0.3], [0.2, 0.31], [0.0, 0.28]], 12, 0));
const flameGeo = cached('flame', () => new THREE.ConeGeometry(0.2, 0.62, 6).translate(0, 0.31, 0));
const rockG = cached('hearthStone', () => bbox(0.26, 0.17, 0.2, 0.04, 1));
const octG = cached('sample', () => new THREE.OctahedronGeometry(1, 0).scale(0.45, 1, 0.45));
const tarpGeo = (w, d, hb, hf) => cached(`tarp${w},${d},${hb},${hf}`, () => {   // sagging, high at the back (z -), low at the front
  const NU = 6, NV = 5, pos = [], uv = [], idx = [];
  for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
    const u = i / NU, v = j / NV, sag = Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * 0.14;
    pos.push((u - 0.5) * w, hb + (hf - hb) * v - sag, (v - 0.5) * d); uv.push(u, v);
  }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, dd = c + 1; idx.push(a, c, b, b, c, dd); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
});
const awningGeo = (w, d, hTop, hEdge) => cached(`awn${w},${d},${hTop},${hEdge}`, () => {   // a sheet sloping down away from the wall (local: x across, z outward)
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-w / 2, hTop, 0, w / 2, hTop, 0, w / 2, hEdge, d, -w / 2, hEdge, d], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2)); g.setIndex([0, 2, 1, 0, 3, 2]); g.computeVertexNormals();
  return g;
});
const heapGeo = (w, d, h, hr) => cached(`heap${w},${d},${h},${hr}`, () => {   // a heap under a tarp: a box with a pitched, draped top
  const pos = [], hw = w / 2, hd = d / 2, p = (a, b, c) => pos.push(...a, ...b, ...c);
  const A = [-hw, 0, -hd], Bq = [hw, 0, -hd], C = [hw, h, -hd * 0.8], D = [-hw, h, -hd * 0.8], E = [-hw, 0, hd], F = [hw, 0, hd], G = [hw, hr, hd * 0.7], Hh = [-hw, hr, hd * 0.7];
  p(D, C, G); p(D, G, Hh); p(A, D, Hh); p(A, Hh, E); p(Bq, F, G); p(Bq, G, C); p(A, C, Bq); p(A, D, C); p(E, Hh, G); p(E, G, F);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
});

// ---------------------------------------------------------------- the dressing kit for one area
function kit({ group, H, col, ox, oz, updaters, y0 }) {
  const K = tintedBatch(group);
  const gy = (x, z) => (y0 != null ? y0 : H(x, z));
  const wood = Wd('#c8a070'), darkWood = Wd('#6a4528'), iron = '#4a4440', ropeM = '#d8c49a', stone = St('#d8c4a0');
  const lampM = new THREE.MeshStandardMaterial({ color: '#ffd9a0', roughness: 0.5, emissive: '#ff9a30', emissiveIntensity: 1.15 });
  const flames = [];
  const api = {
    K, gy, wood, darkWood, iron, ropeM, lampM, stone, flames,
    // a ridge tent whose door faces local +z, turned by ry
    tent(x, z, ry, L, Wd2, Hw, Hr, color, lining = '#4a3a2c') {
      const y = gy(x, z), f = frame(x, z, ry), geo = tentGeo(L, Wd2, Hw, Hr);
      K.add(geo, Cl(color), x, y, z, 0, ry, 0);
      K.add(geo, Cl(lining), x, y, z, 0, ry, 0, 0.955, 0.965, 0.97);   // the lining: seen from inside the door only
      K.add(bbox(Wd2 - 0.15, 0.05, L - 0.15, 0.01, 1), '#6a5a44', x, y + 0.03, z, 0, ry, 0);   // the groundsheet
      for (const s of [-1, 1]) { const [px, pz] = f(s * 0.62, L / 2 + 0.12); rod(K, [px, y, pz], [px, y + Hw + 0.1, pz], 0.028, darkWood, 6); }
      const peg = (a, b) => { const [qx, qz] = f(a, b); K.add(cyl(0.02, 0.02, 0.3, 5, 0), darkWood, qx, y + 0.1, qz, 0.5, 0, 0); return [qx, qz]; };
      for (const s of [-1, 1]) {
        const [rx, rz] = f(0, s * (L / 2 + 0.18)), [qx, qz] = peg(0, s * (L / 2 + 1.5));
        rod(K, [rx, y + Hr, rz], [qx, y + 0.18, qz], 0.011, ropeM, 4);
        for (const t of [-1, 1]) { const [ex, ez] = f(t * (Wd2 / 2 + 0.22), s * (L / 2 + 0.1)), [wx, wz] = peg(t * (Wd2 / 2 + 1.1), s * (L / 2 + 0.9)); rod(K, [ex, y + Hw - 0.12, ez], [wx, y + 0.18, wz], 0.011, ropeM, 4); }
      }
      // the inside, glimpsed through the door: a bedroll, a pillow, a small lantern on a box
      const [bx, bz] = f(-0.65, -0.2), [px2, pz2] = f(-0.65, -L / 2 + 0.45), [cx2, cz2] = f(0.7, -0.9);
      K.add(cyl(0.2, 0.2, 1.7, 10, 0), Cl('#b9573a'), bx, y + 0.2, bz, Math.PI / 2, ry, 0);
      K.add(bbox(0.45, 0.14, 0.32, 0.05, 1), Cl('#efe0bc'), px2, y + 0.16, pz2, 0, ry, 0);
      K.add(bbox(0.4, 0.3, 0.4, 0.03, 1), wood, cx2, y + 0.2, cz2, 0, ry, 0);
      K.add(bbox(0.16, 0.2, 0.16, 0.03, 1), lampM, cx2, y + 0.45, cz2, 0, ry, 0);
      return { y, f };
    },
    bell(x, z, color = '#3a8a94') {
      const y = gy(x, z);
      K.add(bellGeo, Cl(color), x, y, z, 0, 0, 0);
      K.add(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), darkWood, x, y + 3.05, z);
      K.add(new THREE.ConeGeometry(0.16, 0.22, 8), '#c84a3a', x, y + 3.3, z);
      K.add(bbox(0.85, 1.4, 0.06, 0.02, 1), '#241a14', x, y + 0.72, z + 1.66, -0.06, 0, 0);   // the doorway, a flap tied back each side
      K.add(bbox(0.1, 1.5, 0.05, 0.01, 1), Cl('#e8d6a8'), x - 0.52, y + 0.74, z + 1.64, -0.06, 0, 0.12);
      K.add(bbox(0.1, 1.5, 0.05, 0.01, 1), Cl('#e8d6a8'), x + 0.52, y + 0.74, z + 1.64, -0.06, 0, -0.12);
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3, px = x + Math.cos(a) * 2.7, pz = z + Math.sin(a) * 2.7; rod(K, [x + Math.cos(a) * 1.3, y + 2.1, z + Math.sin(a) * 1.3], [px, y + 0.1, pz], 0.01, ropeM, 4); K.add(cyl(0.02, 0.02, 0.28, 5, 0), darkWood, px, y + 0.1, pz, 0.5, 0, 0); }
      col({ type: 'cyl', x, z, r: 1.65, top: y + 2.4, noStand: true });
    },
    barrel(x, z, water = true) {
      const y = gy(x, z);
      K.add(barrelGeo, wood, x, y, z);
      for (const [h, r] of [[0.18, 0.345], [0.46, 0.375], [0.72, 0.345]]) K.add(cyl(r, r, 0.035, 14, 0), iron, x, y + h, z);
      if (water) K.add(cyl(0.26, 0.26, 0.02, 14, 0), '#4a95b4', x, y + 0.893, z);
      col({ type: 'cyl', x, z, r: 0.38, top: y + 0.92 });
    },
    crates(x, z, n, ry = 0) {
      const y = gy(x, z), f = frame(x, z, ry);
      for (let k = 0; k < n; k++) {
        const [qx, qz] = f((k % 2) * 0.66 - 0.33, 0), h = Math.floor(k / 2);
        K.add(bbox(0.62, 0.46, 0.48, 0.03, 1), wood, qx, y + 0.24 + h * 0.47, qz, 0, ry + (k * 0.13 % 0.2), 0);
      }
      col({ type: 'box', x, z, hw: 0.7, hd: 0.3, rot: ry, top: y + 0.48 * Math.ceil(n / 2) });
    },
    pole(x, z, h, mat = darkWood) { const y = gy(x, z); rod(K, [x, y, z], [x, y + h, z], 0.035, mat, 6); return y; },
    // a lantern on a pole (emissive: no light) or hanging from (x, y, z)
    lanternPost(x, z, h = 2.0) {
      const y = this.pole(x, z, h);
      rod(K, [x, y + h - 0.08, z], [x + 0.22, y + h - 0.08, z], 0.02, iron, 5);
      this.lantern(x + 0.22, y + h - 0.12, z);
    },
    lantern(x, y, z) {
      K.add(bbox(0.2, 0.26, 0.2, 0.03, 1), lampM, x, y - 0.17, z);
      K.add(new THREE.ConeGeometry(0.17, 0.12, 4), iron, x, y - 0.02, z, 0, Math.PI / 4, 0);
      K.add(bbox(0.24, 0.04, 0.24, 0.01, 1), iron, x, y - 0.32, z);
      rod(K, [x, y, z], [x, y + 0.12, z], 0.008, iron, 4);
    },
    stool(x, z, ry = 0) {
      const y = gy(x, z);
      K.add(cyl(0.2, 0.2, 0.05, 10, 0), wood, x, y + 0.42, z);
      for (let k = 0; k < 3; k++) { const a = k * 2.094 + ry; rod(K, [x + Math.cos(a) * 0.15, y + 0.4, z + Math.sin(a) * 0.15], [x + Math.cos(a) * 0.26, y, z + Math.sin(a) * 0.26], 0.022, darkWood, 5); }
    },
    // a fire pit: a ring of stones, ash, crossed logs, an ember bed, two flames that flicker, a tripod and pot, smoke
    firePit(x, z, { pot = true, smoke = true, r = 0.55 } = {}) {
      const y = gy(x, z);
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; K.add(rockG, stone, x + Math.cos(a) * r, y + 0.08, z + Math.sin(a) * r, 0, -a + 0.3 * Math.sin(k * 2.1), 0); }
      K.add(cyl(r - 0.05, r - 0.05, 0.05, 14, 0), '#2a2420', x, y + 0.03, z);
      for (let k = 0; k < 3; k++) K.add(cyl(0.06, 0.06, 0.72, 6, 0), darkWood, x, y + 0.13, z, 0, k * 1.05, Math.PI / 2 - 0.12);
      const emberM = cached('ember', () => new THREE.MeshStandardMaterial({ color: '#c8481c', roughness: 0.7, emissive: '#ff4a08', emissiveIntensity: 0.9 }));
      K.add(cyl(0.3, 0.3, 0.03, 12, 0), emberM, x, y + 0.075, z);
      const flameM = cached('flameM', () => new THREE.MeshStandardMaterial({ color: '#ff8a20', roughness: 0.6, emissive: '#ff6a10', emissiveIntensity: 1.1, transparent: true, opacity: 0.85, depthWrite: false }));
      for (let k = 0; k < 2; k++) {
        const m = new THREE.Mesh(flameGeo, flameM); m.position.set(x + (k ? 0.1 : -0.06), y + 0.1, z + (k ? -0.05 : 0.06)); m.scale.set(k ? 0.7 : 1, 1, k ? 0.7 : 1); m.userData.k = k; group.add(m); flames.push(m);
      }
      if (pot) {
        for (let k = 0; k < 3; k++) { const a = k * 2.094 + 0.5; rod(K, [x + Math.cos(a) * 0.75, y, z + Math.sin(a) * 0.75], [x, y + 1.25, z], 0.022, iron, 5); }
        rod(K, [x, y + 1.25, z], [x, y + 0.95, z], 0.01, iron, 4);
        K.add(potGeo, '#26221f', x, y + 0.66, z);
      }
      col({ type: 'cyl', x, z, r: r + 0.12, top: y + 0.2, noStand: true });
      if (smoke) {
        const sm = new Plume({ rate: 3.2, rise: 1.1, h: 4.2, w0: 0.3, w1: 1.5, a: 0.2, add: 0, color: '#d8d0c4', drift: 1.0, spread: 0.2 });
        updaters.push((dt, t, fx) => { sm.tick(fx, dt, ox + x, y + 0.5, oz + z, 1); });
      }
    },
    rug(x, z, ry, w, d) {
      const y = gy(x, z);
      const m = new THREE.Mesh(cached('rugG', () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)), cached('rugM', () => new THREE.MeshStandardMaterial({ map: rugTex(), roughness: 1 })));
      m.scale.set(w, 1, d); m.position.set(x, y + 0.035, z); m.rotation.y = ry; m.receiveShadow = true; group.add(m);
      K.add(bbox(w + 0.04, 0.03, d + 0.04, 0.01, 1), '#9a3a28', x, y + 0.015, z, 0, ry, 0);
    },
    // a tarp on four poles; (x, z) its middle, hb / hf the high (back, -z) and low (front, +z) edge
    tarp(x, z, w, d, hb, hf, mat) {
      const y = gy(x, z);
      K.add(tarpGeo(w, d, hb, hf), mat, x, y, z);
      for (const [sx, sz, h] of [[-1, -1, hb], [1, -1, hb], [-1, 1, hf], [1, 1, hf]]) {
        const px = x + sx * (w / 2 - 0.08), pz = z + sz * (d / 2 - 0.08), py = gy(px, pz);
        rod(K, [px, py, pz], [px, y + h + 0.05, pz], 0.035, darkWood, 6);
        const qx = px + sx * 0.9, qz = pz + sz * 0.9;
        rod(K, [px, y + h, pz], [qx, gy(qx, qz) + 0.05, qz], 0.01, ropeM, 4);
        K.add(cyl(0.02, 0.02, 0.28, 5, 0), darkWood, qx, gy(qx, qz) + 0.1, qz, 0.5, 0, 0);
      }
    },
    spool(x, z) {
      const y = gy(x, z);
      for (const s of [-1, 1]) K.add(cyl(0.62, 0.62, 0.06, 14, 0), wood, x, y + 0.45 + s * 0.28, z);
      K.add(cyl(0.3, 0.3, 0.5, 12, 0), '#222222', x, y + 0.45, z);
      K.add(new THREE.TorusGeometry(0.4, 0.05, 5, 16), '#2a2a2a', x, y + 0.55, z, Math.PI / 2, 0, 0);
      col({ type: 'cyl', x, z, r: 0.64, top: y + 0.9, noStand: true });
    },
    drum(x, z, color) {   // a fuel or water drum with rolled rims
      const y = gy(x, z);
      K.add(cyl(0.3, 0.3, 0.88, 14, 0), color, x, y + 0.44, z);
      for (const h of [0.18, 0.44, 0.7]) K.add(cyl(0.315, 0.315, 0.035, 14, 0), color, x, y + h, z);
      col({ type: 'cyl', x, z, r: 0.33, top: y + 0.9 });
    },
    pickaxe(x, z, y, ry, lean = 0.28) {
      const f = frame(x, z, ry), [ax, az] = f(0, 0), [bx, bz] = f(0, -lean * 1.1);
      rod(K, [ax, y, az], [bx, y + 1.05, bz], 0.025, darkWood, 5);
      K.add(bbox(0.55, 0.05, 0.05, 0.01, 1), iron, bx, y + 1.06, bz, 0, ry, 0.0);
    },
    shovel(x, z, y, ry, lean = 0.3) {
      const f = frame(x, z, ry), [ax, az] = f(0, 0), [bx, bz] = f(0, -lean * 1.1);
      rod(K, [ax, y + 0.28, az], [bx, y + 1.1, bz], 0.022, darkWood, 5);
      K.add(bbox(0.2, 0.3, 0.02, 0.01, 1), iron, ax, y + 0.16, az, 0.12, ry, 0);
    },
    sampleTray(x, y, z, ry = 0) {
      K.add(bbox(0.5, 0.04, 0.3, 0.01, 1), wood, x, y + 0.02, z, 0, ry, 0);
      const cm = cached('sampleM', () => new THREE.MeshStandardMaterial({ color: '#bfe8ff', roughness: 0.2, emissive: '#3aa8d8', emissiveIntensity: 0.8, flatShading: true }));
      const f = frame(x, z, ry);
      for (const [lx, lz, s] of [[-0.14, 0, 0.09], [0.0, 0.05, 0.12], [0.14, -0.04, 0.08]]) { const [qx, qz] = f(lx, lz); K.add(octG, cm, qx, y + 0.04 + s, qz, 0, lx * 8, 0.2, s, s, s); }
    },
    tick(dt, t) { for (const m of flames) { const k = m.userData.k, f = 1 + 0.18 * Math.sin(t * (9 + k * 4) + k * 2) + 0.1 * Math.sin(t * 17 + k); m.scale.y = f * (k ? 0.75 : 1); m.rotation.y = t * 1.5; } },
  };
  updaters.push((dt, t) => api.tick(dt, t));
  return api;
}

// ================================================================== Ilka's camp
export function dressCamp(ctx, CAMP) {
  const { group, H, col } = ctx;
  const D = kit(ctx), { K } = D, cx = CAMP.x, cz = CAMP.z;
  const Hc = (x, z) => H(x, z);
  // the ridge tent: cream canvas, the door to the south (toward the way in), a terracotta hem band over the door
  const tx = cx - 0.3, tz = cz - 1.6;
  D.tent(tx, tz, 0, 3.6, 3.0, 1.45, 2.45, '#ecdcb4');
  const ty = Hc(tx, tz);
  K.add(bbox(3.06, 0.14, 0.04, 0.01, 1), Cl('#c0553a'), tx, ty + 1.42, tz + 1.86, 0, 0, 0);
  K.add(bbox(0.1, 0.1, 3.7, 0.02, 1), D.darkWood, tx, ty + 2.43, tz);                                // the ridge pole's ends
  D.lantern(tx, ty + 1.75, tz + 2.05);
  col({ type: 'box', x: tx, z: tz, hw: 1.6, hd: 1.85, top: ty + 2.3, noStand: true });
  // the round tent, west: teal
  D.bell(cx - 5.4, cz + 0.2, '#3a8a94');
  // a rug in front of the door, the fire pit beside it, stools round both
  D.rug(cx + 0.1, cz + 1.8, 0.14, 2.9, 1.95);
  D.firePit(cx - 2.6, cz + 2.8);
  D.stool(cx - 2.6, cz + 1.4, 0.4); D.stool(cx - 1.1, cz + 3.4, 1.4);
  // the work table (the old one, kept where it was) under a tarp; papers, a sample tray, a book and a mug on it
  const tbx = cx + 2.6, tbz = cz + 0.6, tby = Hc(tbx, tbz);
  K.add(bbox(1.6, 0.08, 0.9, 0.02, 1), D.wood, tbx, tby + 0.78, tbz);
  for (const [dx, dz] of [[-0.7, -0.35], [0.7, -0.35], [-0.7, 0.35], [0.7, 0.35]]) K.add(cyl(0.03, 0.03, 0.76, 5, 0), D.iron, tbx + dx, tby + 0.38, tbz + dz);
  K.add(bbox(0.3, 0.02, 0.4, 0.004, 0.3), '#f4ecd8', tbx - 0.3, tby + 0.83, tbz + 0.05, 0, 0.3, 0);
  K.add(bbox(0.22, 0.05, 0.3, 0.01, 1), '#2f7a9a', tbx + 0.1, tby + 0.85, tbz - 0.15, 0, -0.2, 0);
  K.add(cyl(0.05, 0.045, 0.1, 8, 0), '#c8c0b4', tbx + 0.55, tby + 0.87, tbz + 0.2);
  D.sampleTray(tbx - 0.55, tby + 0.82, tbz - 0.1, 0.1);
  col({ type: 'box', x: tbx, z: tbz, hw: 0.8, hd: 0.45, top: tby + 0.8, noStand: true, seeThrough: true });
  D.tarp(tbx + 0.45, tbz - 0.1, 3.0, 2.8, 2.55, 1.95, striped('#d9663a', '#f2e4c4'));
  D.lantern(tbx + 1.0, tby + 1.83, tbz + 1.15);
  // the telescope, a step east of where it was, clear of the tarp's poles (the old tripod and brass tube)
  const tsx = cx + 6.4, tsz = cz - 1.0, tsy = Hc(tsx, tsz);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; rod(K, [tsx, tsy + 1.3, tsz], [tsx + Math.cos(a) * 0.5, tsy, tsz + Math.sin(a) * 0.5], 0.025, D.iron); }
  K.add(cyl(0.07, 0.1, 1.2, 10, 0), '#b88a3a', tsx, tsy + 1.5, tsz, 0, 0, -0.9);
  // a survey board on an easel, east of Ilka
  const ex = cx + 6.5, ez = cz + 3.0, ey = Hc(ex, ez);
  for (const dx of [-0.5, 0.5]) rod(K, [ex + dx, ey, ez + 0.3], [ex + dx * 0.85, ey + 1.5, ez - 0.05], 0.025, D.darkWood, 5);
  rod(K, [ex, ey, ez - 0.45], [ex, ey + 1.3, ez - 0.1], 0.025, D.darkWood, 5);
  K.add(bbox(1.25, 0.08, 0.08, 0.01, 1), D.darkWood, ex, ey + 0.8, ez + 0.1, -0.12, 0, 0);
  const board = new THREE.Mesh(cached('boardG', () => new THREE.PlaneGeometry(1.15, 0.86)), cached('boardM', () => new THREE.MeshStandardMaterial({ map: surveyTex(), roughness: 0.9, side: THREE.DoubleSide })));
  board.position.set(ex, ey + 1.28, ez); board.rotation.x = -0.14; group.add(board);
  col({ type: 'cyl', x: ex, z: ez, r: 0.55, top: ey + 1.6, noStand: true, seeThrough: true });
  // water barrels and a jerrycan behind the table; the supply crates by the bell tent
  D.barrel(cx + 4.6, cz - 3.2); D.barrel(cx + 5.3, cz - 3.9); D.barrel(cx + 5.5, cz - 2.6, false);
  const jx = cx + 4.0, jz = cz - 2.6, jy = Hc(jx, jz);
  K.add(bbox(0.34, 0.46, 0.14, 0.03, 1), '#5a7a3a', jx, jy + 0.24, jz, 0, 0.5, 0);
  K.add(bbox(0.12, 0.07, 0.08, 0.02, 1), '#3a4a28', jx, jy + 0.5, jz, 0, 0.5, 0);
  D.crates(cx - 6.8, cz - 2.2, 4, 0.2);
  // tools leaning on the tent, a sieve and the sand it sifted
  D.pickaxe(tx - 1.7, tz + 0.2, ty, -Math.PI / 2, 0.3); D.shovel(tx - 1.85, tz + 0.8, ty, -Math.PI / 2, 0.3);
  const sx = cx - 7.4, sz = cz + 3.6, sy = Hc(sx, sz);
  for (const dx of [-0.55, 0.55]) { rod(K, [sx + dx, sy, sz + 0.5], [sx + dx * 0.9, sy + 1.0, sz], 0.025, D.darkWood, 5); rod(K, [sx + dx, sy, sz - 0.5], [sx + dx * 0.9, sy + 1.0, sz], 0.025, D.darkWood, 5); }
  K.add(bbox(1.3, 0.05, 0.9, 0.01, 1), D.darkWood, sx, sy + 0.7, sz, -0.25, 0, 0);
  for (let k = 0; k < 6; k++) K.add(cyl(0.01, 0.01, 0.9, 4, 0), D.iron, sx - 0.5 + k * 0.2, sy + 0.73, sz, Math.PI / 2 - 0.25, 0, 0);
  K.add(new THREE.SphereGeometry(0.7, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 0.8), '#f0d6a0', sx + 0.4, sy - 0.05, sz + 1.1);
  K.build();
}

// ================================================================== the research post
export function dressPost(ctx, POST) {
  const { group, col } = ctx;
  const y = POST.y, D = kit({ ...ctx, y0: y }), { K } = D;
  // awnings over the three cabin doors (striped, on two posts), so the doors read from the camera
  const awn = (x, z, ry, mat) => {
    const f = frame(x, z, ry);
    K.add(awningGeo(2.5, 1.45, 2.55, 2.1), mat, x, y, z, 0, ry, 0);
    for (const s of [-1, 1]) { const [px, pz] = f(s * 1.15, 1.35); rod(K, [px, y, pz], [px, y + 2.1, pz], 0.04, D.iron, 6); }
  };
  const red = striped('#c84a3a', '#f0eadc'), blue = striped('#2f7a9a', '#f0eadc');
  awn(36.6, -28.3, 0, red); awn(52.1, -28.4, 0, blue); awn(50.4, -14.6, Math.PI, red);
  // the break corner, north of the generator: a field tent with a rug, a fire pit, stools, a lantern and barrels
  D.tent(41.5, -31.3, 0, 3.2, 2.6, 1.35, 2.2, '#cfe3dc');
  col({ type: 'box', x: 41.5, z: -31.3, hw: 1.4, hd: 1.7, top: y + 2.1, noStand: true });
  D.rug(41.4, -28.4, -0.1, 2.5, 1.7);
  D.firePit(44.2, -27.2, { r: 0.5 });
  D.stool(43.2, -29.0, 0.7); D.stool(42.5, -26.6, 1.9);
  D.lanternPost(39.2, -28.3, 2.0);
  D.barrel(38.6, -33.0); D.barrel(39.4, -33.2); D.barrel(38.9, -32.1, false);
  // the east cabin's water: barrels in a row against the fence
  D.barrel(56.3, -14.5); D.barrel(56.9, -13.6); D.barrel(56.1, -12.9, false);
  // a workbench against the middle cabin's wall: vise, tool chest, lamp
  K.add(bbox(2.0, 0.1, 0.7, 0.02, 1), D.wood, 48.8, y + 0.9, -27.6);
  for (const [dx, dz] of [[-0.9, -0.28], [0.9, -0.28], [-0.9, 0.28], [0.9, 0.28]]) K.add(cyl(0.04, 0.04, 0.88, 5, 0), D.iron, 48.8 + dx, y + 0.44, -27.6 + dz);
  K.add(bbox(0.8, 0.28, 0.4, 0.03, 1), '#c84a3a', 48.4, y + 1.09, -27.6);
  K.add(bbox(0.16, 0.2, 0.12, 0.02, 1), D.iron, 49.5, y + 1.05, -27.55);
  D.lantern(49.1, y + 1.5, -27.9);
  col({ type: 'box', x: 48.8, z: -27.6, hw: 1.05, hd: 0.4, top: y + 1.0, noStand: true, seeThrough: true });
  // the pipe rack: drill pipe stacked on three cradles, west of the middle cabin
  const px = 28.6, pz = -29.5;
  for (const dz of [-1.0, 0, 1.0]) K.add(bbox(0.2, 0.5, 0.2, 0.02, 1), D.darkWood, px, y + 0.25, pz + dz);
  for (let k = 0; k < 6; k++) { const row = k < 3 ? 0 : 1, i = k % 3 - (row ? 0.5 : 0); K.add(cyl(0.11, 0.11, 3.0, 10, 0), k % 2 ? '#8a9096' : '#7a8086', px + i * 0.24, y + 0.62 + row * 0.2, pz, Math.PI / 2, 0, 0); }
  col({ type: 'box', x: px, z: pz, hw: 0.45, hd: 1.6, top: y + 0.95, noStand: true, seeThrough: true });
  // an equipment pile under a tarp, and drums (fuel and water) by it
  K.add(heapGeo(1.9, 1.3, 1.1, 0.6), Cl('#4a7a8a'), 28.4, y, -32.4);
  for (const [dx, dz] of [[-0.9, 0.5], [0.8, 0.4]]) K.add(bbox(0.1, 0.1, 0.1, 0.01, 1), D.ropeM, 28.4 + dx, y + 0.1, -32.4 + dz);
  col({ type: 'box', x: 28.4, z: -32.4, hw: 0.95, hd: 0.65, top: y + 1.1, noStand: true });
  D.drum(30.2, -33.0, '#c84a3a'); D.drum(30.9, -32.6, '#c84a3a'); D.drum(31.0, -33.4, '#2f6a9a');
  // a cable spool in the south-west corner, and lamp posts by the gate
  D.spool(28.0, -10.4);
  D.lanternPost(28.2, -26.0, 2.2); D.lanternPost(28.2, -15.6, 2.2);
  // safety markings: a yellow ring round the bore's derrick, a dashed lane from the gate (flat, painted on the pad):
  // one mesh, vertex-coloured
  const off = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
  const ringM = cached('boreRingM', () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, vertexColors: true, ...off }));
  const ringG = cached('boreRingG', () => {
    const a = new THREE.RingGeometry(3.1, 3.4, 40).rotateX(-Math.PI / 2), b = new THREE.RingGeometry(2.7, 2.8, 40).rotateX(-Math.PI / 2);
    const lane = new THREE.PlaneGeometry(1.0, 0.16).rotateX(-Math.PI / 2);
    const parts = [[tint(a, '#f2c230'), 42, -18], [tint(b, '#2a2a2a'), 42, -18]];
    for (let k = 0; k < 9; k++) parts.push([tint(lane, '#f4f0e4'), 28.6 + k * 1.5, -21]);
    const pos = [], nor = [], colr = [], uv = [], idx = []; let vo = 0;
    for (const [g, gx, gz] of parts) {
      const P = g.attributes.position, N = g.attributes.normal, C = g.attributes.color, U = g.attributes.uv;
      for (let i = 0; i < P.count; i++) { pos.push(P.getX(i) + gx, P.getY(i), P.getZ(i) + gz); nor.push(N.getX(i), N.getY(i), N.getZ(i)); colr.push(C.getX(i), C.getY(i), C.getZ(i)); uv.push(U.getX(i), U.getY(i)); }
      for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + vo);
      vo += P.count;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); out.setIndex(idx);
    return out;
  });
  const marks = new THREE.Mesh(ringG, ringM); marks.position.y = y + 0.02; marks.receiveShadow = true; group.add(marks);
  K.build();
}
