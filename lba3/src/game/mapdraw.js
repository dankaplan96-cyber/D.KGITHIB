// MAP-1: the maps, drawn from the world the game built — never from a picture or a hand-made outline, so the map
// follows the world when the world changes (WORLD-SHAPE, a region's builder).
//
// A region's base map is drawn once into an offscreen canvas (mapBuilder; spread over frames, a few ms each) from:
//   - the region's terrain (game.terrain on Citadel, R.terrain elsewhere): heights at each pixel (Terrain.heightAt,
//     the same triangles the physics uses), its painted look (the mesh's per-vertex colour × the splat weights ×
//     the mean colour of each splat texture, as the terrain shader mixes them), the dirt and cobble splats drawn
//     out as paths and streets; height bands with contour lines every 2.5 m, hill-shading and cast shadows lit from
//     the north-west, cliffs, the coast line and the shallows;
//   - the physics bricks in the region (game.physics.colliders): each one's footprint, classed by how far its top
//     stands above the ground just outside it — a floor (paving, deck, pier, quay) or a building (a roof with an
//     outline and a shadow); thin bricks are walls and fences (lines), small cylinders trees (canopies);
//     the invisible brink blocks (noStand + seeThrough) and disabled bricks are left out.
// Water is what the physics calls sea (ground below WATER_FLOOR with no brick): so wherever he can stand is land on
// the map and the open sea is water (tests/holomap.mjs samples both).
//
// CONTRACT
//   regionFrame(game, region) → { T, ox, oz, X0, Z0, s }        the region's square in world metres
//   mapBuilder(game, region | room) → B   B.step(ms) → done; B.finish(); when done: B.canvas (N×N), B.X0, B.Z0,
//        B.s (metres), B.N, B.cls (Uint8Array N×N: 0 water/void, 1 ground, 2 floor, 3 building), B.content
//        [x0, z0, x1, z1] (world bbox of land and bricks), B.ms (time spent building)
//   regionPlaces(game, region) → [{ x, z, label, prio }]           prio 1 always shown, 2 when zoomed in
//   roomName(id), titleCase(word)
import { t } from './i18n.js';
import './text/map.js';
import { WATER_FLOOR } from '../engine/physics.js';
import { textures } from '../engine/textures.js';

const PAL = {
  twinsun: { build: [204, 128, 94], edge: [74, 42, 30], floor: [218, 207, 186], tree: [46, 98, 48], wall: [58, 44, 38], fence: [120, 96, 74], path: [214, 186, 132], street: [200, 192, 176], shallow: [104, 182, 206], deep: [26, 72, 120], foam: [226, 246, 246], sea: 0 },
  desert: { build: [222, 168, 112], edge: [96, 56, 30], floor: [224, 206, 176], tree: [64, 112, 52], wall: [86, 60, 40], fence: [130, 100, 70], path: [186, 140, 96], street: [200, 190, 172], shallow: [104, 188, 206], deep: [28, 80, 126], foam: [236, 250, 246], sea: -0.2 },
  hamalayi: { build: [118, 126, 146], edge: [36, 40, 54], floor: [196, 196, 204], tree: [36, 80, 56], wall: [44, 46, 58], fence: [104, 96, 90], path: [156, 132, 108], street: [176, 172, 168], shallow: [110, 168, 196], deep: [34, 70, 112], foam: [236, 246, 250], sea: 0 },
  zeelich: { build: [196, 162, 226], edge: [70, 46, 100], floor: [238, 228, 236], tree: [104, 140, 82], wall: [86, 64, 110], fence: [150, 120, 150], path: [226, 200, 172], street: [216, 206, 214], shallow: [242, 218, 232], deep: [196, 156, 196], foam: [255, 255, 255], sea: null },
  room: { build: [150, 132, 112], edge: [40, 30, 24], floor: [196, 182, 160], tree: [70, 110, 60], wall: [48, 36, 30], fence: [110, 90, 70], path: [196, 170, 120], street: [190, 184, 172], shallow: [22, 30, 40], deep: [22, 30, 40], foam: [22, 30, 40], sea: null, dark: true },
};
export const palOf = (region) => (region === 'desert' ? PAL.desert : region === 'hamalayi' ? PAL.hamalayi : region === 'zeelich' || region.startsWith('isle_') ? PAL.zeelich : PAL.twinsun);

export const roomName = (id) => { const k = 'room_' + id, s = t(k); return s === k ? titleCase(id) : s; };
export const titleCase = (w) => { const s = String(w || '').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };

// the region's square (world metres) and its terrain
export function regionFrame(g, region) {
  if (region === 'citadel') { const T = g.terrain; return { T, ox: 0, oz: 0, X0: T.x0, Z0: T.z0, s: T.size }; }
  const R = g.rooms[region], o = R.group.position;
  if (R.terrain) { const T = R.terrain; return { T, ox: o.x, oz: o.z, X0: o.x + T.x0, Z0: o.z + T.z0, s: T.size }; }
  // no ground of its own (Zeelich's spaceport island: decks over the clouds): the extent of its bricks
  const b = brickBox(g, o.x, o.z, 160);
  return { T: null, ox: o.x, oz: o.z, ...square(b, 12) };
}
// an interior: its bricks, within half the distance to the next room (rooms stand 50–100 m apart)
function roomFrame(g, R) {
  const o = R.group.position;
  let near = 80;
  for (const Q of Object.values(g.rooms)) if (Q !== R) { const d = Math.max(Math.abs(Q.group.position.x - o.x), Math.abs(Q.group.position.z - o.z)); if (d > 1) near = Math.min(near, d); }
  const b = brickBox(g, o.x, o.z, near / 2 - 1);
  for (const e of R.exits || []) { b[0] = Math.min(b[0], e.x); b[1] = Math.min(b[1], e.z); b[2] = Math.max(b[2], e.x); b[3] = Math.max(b[3], e.z); }
  return { T: null, ox: o.x, oz: o.z, ...square(b, 2) };
}
function brickBox(g, cx, cz, r) {
  const b = [1e9, 1e9, -1e9, -1e9];
  for (const c of g.physics.colliders) {
    if (Math.abs(c.x - cx) > r || Math.abs(c.z - cz) > r || (c.noStand && c.seeThrough)) continue;
    const e = Math.min(c.bound, 30);
    b[0] = Math.min(b[0], c.x - e); b[1] = Math.min(b[1], c.z - e); b[2] = Math.max(b[2], c.x + e); b[3] = Math.max(b[3], c.z + e);
  }
  if (b[0] > b[2]) return [cx - 20, cz - 20, cx + 20, cz + 20];
  return b;
}
function square(b, pad) {
  const s = Math.max(b[2] - b[0], b[3] - b[1]) + pad * 2;
  return { X0: (b[0] + b[2]) / 2 - s / 2, Z0: (b[1] + b[3]) / 2 - s / 2, s };
}

// The mean colour of each splat texture. Reading a texture's canvas back (getImageData) stalls on the GPU process —
// 25 s once under SwiftShader while shaders compile — so the shared textures (src/engine/textures.js) are known by
// their painted base colours, and a region's own texture (the Hamalayi's snow) counts as a light neutral.
const TEX_MEAN = { grass: [0.37, 0.55, 0.23], sand: [0.9, 0.83, 0.61], rock: [0.6, 0.55, 0.47], cliff: [0.56, 0.53, 0.59], dirt: [0.62, 0.44, 0.29], cobble: [0.5, 0.48, 0.45], concrete: [0.66, 0.64, 0.6] };
let TXS = null;
function texMean(tex, fallback) {
  TXS ||= textures();
  for (const [k, m] of Object.entries(TEX_MEAN)) if (TXS[k] && TXS[k] === tex) return m;
  return tex ? [0.88, 0.89, 0.92] : fallback;
}

// the painted look of each terrain vertex: its colour × the splat mix of the textures' mean colours (0..1 RGB)
// (a generator: built in slices like the rest; kept on the terrain, so a second map of it is free)
function* terrainAlbedo(T, pal) {
  if (T._mapAlb) return T._mapAlb;
  const n = T.segs + 1, geo = T.mesh.userData.full, col = geo?.attributes.color?.array, spl = geo?.attributes.splat?.array, spl2 = geo?.attributes.splat2?.array;
  const tx = T.tex || {};
  const M = [texMean(tx.grass, [0.42, 0.55, 0.3]), texMean(tx.sand, [0.8, 0.72, 0.55]), texMean(tx.rock, [0.5, 0.48, 0.46]), texMean(tx.dirt, [0.55, 0.42, 0.3]), texMean(tx.cobble, [0.6, 0.58, 0.55])];
  const A = new Float32Array(n * n * 3), W = new Float32Array(n * n * 2);
  let lum = 0, cnt = 0;
  for (let k = 0; k < n * n; k++) {   // (no allocation per vertex: ~80 000 of them on Citadel)
    let r = 1, gg = 1, b = 1;
    if (spl) {
      const w0 = spl[k * 4], w1 = spl[k * 4 + 1], w2 = spl[k * 4 + 2], w3 = spl[k * 4 + 3], w4 = spl2 ? spl2[k] : 0;
      r = w0 * M[0][0] + w1 * M[1][0] + w2 * M[2][0] + w3 * M[3][0] + w4 * M[4][0];
      gg = w0 * M[0][1] + w1 * M[1][1] + w2 * M[2][1] + w3 * M[3][1] + w4 * M[4][1];
      b = w0 * M[0][2] + w1 * M[1][2] + w2 * M[2][2] + w3 * M[3][2] + w4 * M[4][2];
      W[k * 2] = w3; W[k * 2 + 1] = w4;
    }
    A[k * 3] = (col ? col[k * 3] : 0.6) * r; A[k * 3 + 1] = (col ? col[k * 3 + 1] : 0.6) * gg; A[k * 3 + 2] = (col ? col[k * 3 + 2] : 0.6) * b;
    if (T.heights[k] > 0.5) { lum += 0.3 * A[k * 3] + 0.59 * A[k * 3 + 1] + 0.11 * A[k * 3 + 2]; cnt++; }
    if (k % 2048 === 2047) yield;   // (RENDER-INV: slices of ~1 ms; 16 384 vertices made 20 ms slices)
  }
  // the scene is lit (a strong sun); the map shows the ground at about the brightness it is seen in play
  const gain = Math.max(1, Math.min(2.8, 0.6 / Math.max(0.05, cnt ? lum / cnt : 0.4)));
  for (let k = 0; k < A.length; k++) A[k] = Math.min(1, A[k] * gain);
  return (T._mapAlb = { A, W, n, pal });
}

const smooth = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

// mapBuilder(game, region) / mapBuilder(game, null, room): the base map, built in steps
export function mapBuilder(g, region, room = null) {
  const F = room ? roomFrame(g, room) : regionFrame(g, region);
  const pal = room ? PAL.room : palOf(region);
  const px0 = room ? 0.1 : 0.2;   // (metres per pixel, as fine as 768 px allows: small islands stay sharp when zoomed)
  const N = Math.round(Math.min(room ? 320 : 768, Math.max(room ? 160 : 384, F.s / px0)));
  const B = { done: false, X0: F.X0, Z0: F.Z0, s: F.s, N, region, room: room?.id || null, ms: 0, canvas: null, cls: null, content: [F.X0, F.Z0, F.X0 + F.s, F.Z0 + F.s] };
  const it = build(g, F, pal, B, room);
  B.step = (ms) => {
    if (B.done) return true;
    const t0 = performance.now();
    while (performance.now() - t0 < ms) if (it.next().done) { B.done = true; break; }
    B.ms += performance.now() - t0;
    return B.done;
  };
  B.finish = () => B.step(1e9);
  return B;
}

function* build(g, F, pal, B, room) {
  const N = B.N, s = F.s, px = s / N, X0 = F.X0, Z0 = F.Z0, P = g.physics, T = F.T;
  const NN = N * N;
  const Ht = new Float32Array(NN);      // the ground (terrain) height
  const Hd = new Float32Array(NN);      // the surface drawn: ground or the brick on it (clamped for buildings)
  const id = new Int32Array(NN).fill(-1);
  const cls = new Uint8Array(NN);
  const rgb = new Float32Array(NN * 3);
  const sea = pal.sea;
  let tS = performance.now(); B.stages = {};
  const lap = (name) => { const n = performance.now(); B.stages[name] = +((B.stages[name] || 0) + n - tS).toFixed(1); tS = n; };
  // ---- the terrain
  const alb = T ? yield* terrainAlbedo(T, pal) : null;
  lap('albedo');
  for (let j = 0; j < N; j++) {
    const z = Z0 + (j + 0.5) * px;
    for (let i = 0; i < N; i++) {
      const x = X0 + (i + 0.5) * px, p = j * N + i;
      const h = T ? T.heightAt(x - F.ox, z - F.oz) : -50;   // (no ground of its own: the bricks are all there is)
      Ht[p] = h; Hd[p] = h;
      if (h < WATER_FLOOR || !T) { cls[p] = 0; continue; }
      cls[p] = 1;
      // the painted look, bilinear between the grid's vertices
      const n = alb.n, gx = Math.min(n - 1.001, Math.max(0, (x - F.ox - T.x0) / T.step)), gz = Math.min(n - 1.001, Math.max(0, (z - F.oz - T.z0) / T.step));
      const i0 = Math.floor(gx), j0 = Math.floor(gz), fx = gx - i0, fz = gz - j0;
      const k00 = j0 * n + i0, k10 = k00 + 1, k01 = k00 + n, k11 = k01 + 1;
      const w00 = (1 - fx) * (1 - fz), w10 = fx * (1 - fz), w01 = (1 - fx) * fz, w11 = fx * fz;
      const A = alb.A, Wt = alb.W;
      let r = A[k00 * 3] * w00 + A[k10 * 3] * w10 + A[k01 * 3] * w01 + A[k11 * 3] * w11;
      let gg = A[k00 * 3 + 1] * w00 + A[k10 * 3 + 1] * w10 + A[k01 * 3 + 1] * w01 + A[k11 * 3 + 1] * w11;
      let b = A[k00 * 3 + 2] * w00 + A[k10 * 3 + 2] * w10 + A[k01 * 3 + 2] * w01 + A[k11 * 3 + 2] * w11;
      // paths (dirt) and streets (cobbles) drawn out a little, so a way reads at a glance
      const wd = Wt[k00 * 2] * w00 + Wt[k10 * 2] * w10 + Wt[k01 * 2] * w01 + Wt[k11 * 2] * w11;
      const wc = Wt[k00 * 2 + 1] * w00 + Wt[k10 * 2 + 1] * w10 + Wt[k01 * 2 + 1] * w01 + Wt[k11 * 2 + 1] * w11;
      const kp = smooth(0.3, 0.6, wd) * 0.55, kc = smooth(0.3, 0.6, wc) * 0.6;
      r = r * 255 * (1 - kp - kc) + pal.path[0] * kp + pal.street[0] * kc;
      gg = gg * 255 * (1 - kp - kc) + pal.path[1] * kp + pal.street[1] * kc;
      b = b * 255 * (1 - kp - kc) + pal.path[2] * kp + pal.street[2] * kc;
      rgb[p * 3] = r; rgb[p * 3 + 1] = gg; rgb[p * 3 + 2] = b;
    }
    lap('terrain'); yield; tS = performance.now();   // (RENDER-INV: every row; 8 rows ran past the 2.5 ms asked)
  }
  // ---- the bricks
  const k = 1 / px, bricks = [], trees = [], lines = [];
  const inside = (x, z) => x > X0 - 2 && z > Z0 - 2 && x < X0 + s + 2 && z < Z0 + s + 2;
  for (const c of P.colliders) {
    if (!c.enabled || (c.noStand && c.seeThrough) || !inside(c.x, c.z)) continue;
    if (c.bound > s) continue;
    const g0 = T ? T.heightAt(c.x - F.ox, c.z - F.oz) : P.terrain.heightAt(c.x, c.z);
    if (c.type === 'cyl' && c.r < 0.35) continue;                                       // posts, lamps
    if (c.type === 'cyl' && c.r <= 0.9 && c.top - g0 > 1.2) { trees.push(c); continue; }  // trunks
    if (c.type === 'box' && Math.min(c.hw, c.hd) < 0.22) { lines.push(c); continue; }   // walls, fences, rails
    bricks.push(c);
  }
  bricks.sort((a, b) => a.top - b.top);
  // every pixel of each brick's footprint (in slices, so a frame never waits on a big deck)
  let work = 0;
  for (let bi = 0; bi < bricks.length; bi++) {
    const c = bricks[bi];
    const i0 = Math.max(0, Math.floor((c.x - c.bound - X0) * k)), i1 = Math.min(N - 1, Math.ceil((c.x + c.bound - X0) * k));
    const j0 = Math.max(0, Math.floor((c.z - c.bound - Z0) * k)), j1 = Math.min(N - 1, Math.ceil((c.z + c.bound - Z0) * k));
    const m = Math.min(0.02, px * 0.25);
    for (let j = j0; j <= j1; j++) {
      const z = Z0 + (j + 0.5) * px;
      for (let i = i0; i <= i1; i++) {
        const p = j * N + i;
        if (P._inside(c, X0 + (i + 0.5) * px, z, m) && (id[p] < 0 || c.top >= Hd[p])) { id[p] = bi; Hd[p] = c.top; }
      }
      work += i1 - i0 + 1;
      if (work > 4000) { work = 0; lap('raster'); yield; tS = performance.now(); }
    }
  }
  lap('raster'); B.stages.bricks = bricks.length;
  yield; tS = performance.now();
  // floor or building: how far the brick's top stands above the ground just outside it (water left out)
  const kind = new Uint8Array(bricks.length), ref = new Float32Array(bricks.length);
  for (let bi = 0; bi < bricks.length; bi++) {
    const c = bricks[bi], hs = [];
    const d = c.type === 'box' ? 0.7 : c.r + 0.7;
    const pts = c.type === 'box'
      ? [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]].map(([u, v]) => { const lx = u * (c.hw + 0.7), lz = v * (c.hd + 0.7); return [c.x + lx * c.cos + lz * c.sin, c.z - lx * c.sin + lz * c.cos]; })
      : Array.from({ length: 8 }, (_, q) => [c.x + Math.cos(q * Math.PI / 4) * d, c.z + Math.sin(q * Math.PI / 4) * d]);
    for (const [x, z] of pts) {
      const i = Math.floor((x - X0) * k), j = Math.floor((z - Z0) * k);
      if (i < 0 || j < 0 || i >= N || j >= N) continue;
      const p = j * N + i;
      if (id[p] === bi) continue;
      if (id[p] < 0 && (Ht[p] < WATER_FLOOR || !T)) continue;
      hs.push(id[p] >= 0 ? Hd[p] : Ht[p]);
    }
    hs.sort((a, b) => a - b);
    const r = hs.length ? hs[Math.floor((hs.length - 1) * 0.25)] : c.top;
    ref[bi] = r;
    kind[bi] = c.top - r > 1.5 && !(c.bound > 14 && c.top - r < 4) ? 3 : 2;
    if (bi % 256 === 255) { lap('classify'); yield; tS = performance.now(); }
  }
  for (let p = 0; p < NN; p++) {
    if ((p & 65535) === 65535) { lap('classify'); yield; tS = performance.now(); }
    const bi = id[p]; if (bi < 0) continue;
    cls[p] = kind[bi];
    if (kind[bi] === 3) Hd[p] = Math.min(Hd[p], ref[bi] + 7);
    const c = kind[bi] === 3 ? pal.build : pal.floor;
    rgb[p * 3] = c[0]; rgb[p * 3 + 1] = c[1]; rgb[p * 3 + 2] = c[2];
  }
  lap('classify');
  yield; tS = performance.now();
  // ---- light, shadows, bands, edges
  const img = new ImageData(N, N), D = img.data;
  const lx = -0.55, ly = 0.75, lz = -0.55, sun = Math.tan(0.62), stepH = px * Math.SQRT2 * sun, K = Math.ceil(9 / stepH);
  let cx0 = 1e9, cz0 = 1e9, cx1 = -1e9, cz1 = -1e9;
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const p = j * N + i, c = cls[p];
      let r = rgb[p * 3], gg = rgb[p * 3 + 1], b = rgb[p * 3 + 2];
      const hL = Hd[i > 0 ? p - 1 : p], hR = Hd[i < N - 1 ? p + 1 : p], hU = Hd[j > 0 ? p - N : p], hB = Hd[j < N - 1 ? p + N : p];
      const cl = i > 0 ? cls[p - 1] : c, cr = i < N - 1 ? cls[p + 1] : c, cu = j > 0 ? cls[p - N] : c, cb = j < N - 1 ? cls[p + N] : c;
      const wet = cl === 0 || cr === 0 || cu === 0 || cb === 0;
      if (c === 0) {
        if (pal.dark) { r = pal.deep[0]; gg = pal.deep[1]; b = pal.deep[2]; }
        else {
          const dep = sea == null ? 1 : Math.min(1, Math.max(0, (sea - Ht[p]) / 5));
          const q = Math.sqrt(dep);
          r = pal.shallow[0] * (1 - q) + pal.deep[0] * q; gg = pal.shallow[1] * (1 - q) + pal.deep[1] * q; b = pal.shallow[2] * (1 - q) + pal.deep[2] * q;
          if (cl || cr || cu || cb) { r = r * 0.35 + pal.foam[0] * 0.65; gg = gg * 0.35 + pal.foam[1] * 0.65; b = b * 0.35 + pal.foam[2] * 0.65; }
        }
      } else {
        if (i < cx0) cx0 = i; if (i > cx1) cx1 = i; if (j < cz0) cz0 = j; if (j > cz1) cz1 = j;
        // hill-shading from the north-west
        const gx = (hR - hL) / (2 * px), gz = (hB - hU) / (2 * px);
        const nl = (-gx * lx + ly - gz * lz) / Math.sqrt(gx * gx + 1 + gz * gz) / ly;
        let sh = Math.min(1.18, Math.max(0.5, 0.35 + 0.65 * nl));
        if (c === 1) {
          const slope = Math.hypot(gx, gz);
          if (slope > 1.15) sh *= 0.78;                                                  // cliffs
          const band = Math.floor(Hd[p] / 2.5);                                          // height bands
          sh *= 1 + Math.min(6, Math.max(-2, band)) * 0.018;
          if (Math.floor(hR / 2.5) !== band || Math.floor(hB / 2.5) !== band) sh *= 0.84; // contours
        }
        if (c === 3) { const o = id[p]; if ((i > 0 && id[p - 1] !== o && hL < Hd[p] - 1) || (i < N - 1 && id[p + 1] !== o && hR < Hd[p] - 1) || (j > 0 && id[p - N] !== o && hU < Hd[p] - 1) || (j < N - 1 && id[p + N] !== o && hB < Hd[p] - 1)) { r = pal.edge[0]; gg = pal.edge[1]; b = pal.edge[2]; sh = 1; } }
        if (c === 2 && (Math.abs(hL - Hd[p]) > 0.6 || Math.abs(hR - Hd[p]) > 0.6 || Math.abs(hU - Hd[p]) > 0.6 || Math.abs(hB - Hd[p]) > 0.6)) sh *= 0.72;
        if (wet && !pal.dark) sh *= 0.55;                                                // the coast line
        r *= sh; gg *= sh; b *= sh;
      }
      // cast shadows (sun in the north-west)
      for (let q = 2, ii = i - 2, jj = j - 2; q <= K && ii >= 0 && jj >= 0; q += 2, ii -= 2, jj -= 2) if (Hd[jj * N + ii] - Hd[p] > q * stepH && Hd[jj * N + ii] - Hd[p] > 0.8) { r *= 0.74; gg *= 0.76; b *= 0.82; break; }
      const o = p * 4;
      D[o] = r; D[o + 1] = gg; D[o + 2] = b; D[o + 3] = 255;
    }
    lap('shade'); yield; tS = performance.now();
  }
  lap('shade');
  const cv = document.createElement('canvas'); cv.width = cv.height = N;
  const x = cv.getContext('2d');
  x.putImageData(img, 0, 0);
  lap('vectors'); yield; tS = performance.now();
  // ---- walls, fences, trees (vectors on top)
  x.setTransform(k, 0, 0, k, -X0 * k, -Z0 * k);
  x.lineCap = 'round';
  for (const c of lines) {
    const g0 = T ? T.heightAt(c.x - F.ox, c.z - F.oz) : c.top - 1;
    const tall = c.top - g0 > 1.6;
    const along = c.hw >= c.hd, L = along ? c.hw : c.hd;
    const ux = along ? c.cos : c.sin, uz = along ? -c.sin : c.cos;
    x.strokeStyle = `rgb(${(tall ? pal.wall : pal.fence).join(',')})`;
    x.lineWidth = Math.max(px * (tall ? 1.6 : 1.1), Math.min(c.hw, c.hd) * 2);
    x.beginPath(); x.moveTo(c.x - ux * L, c.z - uz * L); x.lineTo(c.x + ux * L, c.z + uz * L); x.stroke();
  }
  const tc = pal.tree, tr = Math.max(1.2, px * 2.2);
  for (const c of trees) {
    const r = Math.max(tr, c.r * 2.4);
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.beginPath(); x.arc(c.x + r * 0.35, c.z + r * 0.35, r, 0, Math.PI * 2); x.fill();
    x.fillStyle = `rgb(${tc.join(',')})`; x.beginPath(); x.arc(c.x, c.z, r, 0, Math.PI * 2); x.fill();
    x.fillStyle = `rgba(${tc.map((v) => Math.min(255, v + 60)).join(',')},0.8)`; x.beginPath(); x.arc(c.x - r * 0.3, c.z - r * 0.3, r * 0.45, 0, Math.PI * 2); x.fill();
  }
  x.setTransform(1, 0, 0, 1, 0, 0);
  lap('vectors');
  B.canvas = cv; B.cls = cls;
  if (cx1 >= cx0) B.content = [X0 + cx0 * px, Z0 + cz0 * px, X0 + (cx1 + 1) * px, Z0 + (cz1 + 1) * px];
}

// ------------------------------------------------------------------ place names, where the game built each place
export function regionPlaces(g, region) {
  const out = [];
  const add = (p, key, prio = 1, label = null) => { if (p && Number.isFinite(p.x) && Number.isFinite(p.z)) out.push({ x: p.x, z: p.z, label: label || t(key), prio }); };
  if (region === 'citadel') {
    const W = g.world, P = W.POI || {};
    add(W.well, 'mp_square');
    add(W.houses?.find((h) => h.id === 'twinsen'), 'mp_twinsen');
    add(P.harbour, 'mp_harbour');
    add(P.lighthouse, 'mp_lighthouse');
    add(W.station || P.fort, 'mp_station');
    add(P.plateau, 'mp_cliffs');
    add(W.spaceport?.pad, 'mp_spaceport');
    add(W.depot, 'mp_depot', 2);
    add(W.signs?.find((sg) => sg.key === 'w_sign_orchard'), 'mp_orchard', 2);
    add(W.life?.pump, 'mp_pump', 2);
    add(W.life?.customs, 'mp_customs', 2);
  } else if (region === 'desert') {
    const R = g.rooms.desert;
    add(R.plaza, 'mp_kesh'); add(R.oasis, 'mp_oasis'); add(R.dock, 'mp_pier'); add(R.camp, 'mp_camp');
    if (R.post) add({ x: (R.post.x0 + R.post.x1) / 2, z: (R.post.z0 + R.post.z1) / 2 }, 'mp_post');
    add(R.dig, 'mp_dig'); add(R.ruins, 'mp_condenser', 2);
    add(R.school, 'mp_school', 2);   // (WORLD-80 step 3: the School of Magic at the original's place)
  } else if (region === 'hamalayi') {
    const R = g.rooms.hamalayi;
    add(R.landing, 'mp_foothills'); add(R.lhar, 'mp_lhar'); add(R.monastery?.gate, 'mp_monastery'); add(R.observatory, 'mp_observatory');
    add(R.lift?.bottom, 'mp_lift', 2); add(R.basin, 'mp_basin', 2); add(R.hut, 'mp_hut', 2); add(R.gorge?.tree, 'mp_gorge', 2);
  } else if (region === 'zeelich') {
    const R = g.rooms.zeelich;
    add(R.street, 'mp_street'); add(R.dock, 'mp_zdock'); add(R.depot, 'mp_zdepot'); add(R.platform, 'mp_platform'); add(R.spaceport?.pad, 'mp_zport');
    if (R.mills?.length) add({ x: R.mills.reduce((a, m) => a + m.x, 0) / R.mills.length, z: R.mills.reduce((a, m) => a + m.z, 0) / R.mills.length }, 'mp_mills', 2);
    add(R.dogYard, 'mp_dogyard', 2); add(R.workshopDoor, 'room_workshop', 2); add(R.councilDoor, 'mp_council', 2);
  } else if (g.rooms[region]) {
    const R = g.rooms[region];
    if (R.landmark) add(R.landmark, null, 1, titleCase(R.landmark.word));
    for (const p of R.pois || []) if (p !== R.landmark && p.word && p.word !== R.landmark?.word) add(p, null, 2, titleCase(p.word));
  }
  return out;
}
