// CRYSTALS-ONE-LOOK (the user, 24.11: "make sure the crystals in the whole game look like the ones in the chapter 1 cave").
// The well cave's crystals (WELL-POLISH, built in interiors.js buildWell) as one shared look for every crystal drawn
// in the world: a faceted six-sided prism with a pointed cap (four shapes), flat-shaded, a translucent lit shell over
// an opaque glowing core. No new shader: the shell is the standard lit material, the core an unlit basic one.
// docs/lba-maturity/CRYSTALS-ONE-LOOK.md lists every place that uses it.
//
//   crystalGeo(v)                      the prism, unit radius and height (base ring at y 0, apex at y 1), shape v 0–3
//   crystalShell(c, e, k, op) / crystalCore(c)   a shell / core material of its own (the well's pulsed ones)
//   growCrystal(k, shell, core, x, y, z, yaw, tilt, h, r, v, tips)   one crystal (shell + core) into a Kit
//   crystalCluster(k, shell, core, x, y, z, {n, s, heading, spread, lean, seed, tips})   the well's cluster
//   CRYSTAL_TINTS / crystalMats(tint, {rockSet})  the shared palette: one shell per tint and ONE vertex-coloured core
//                                       for every tint (so a Kit draws a place's crystals in tints + 1 calls)
//   addCrystal(k, mats, x, y, z, ry, {rx, rz, sx, sy, sz}, v)   one crystal with a Kit's full transform
//   crystalPiece(mats, {h, r, v, tilt, yaw})   a crystal of its own (a Group: shell + core), for one that moves
//   bakeCrystals(parts, tint)          one shell geometry + one core geometry from a list of crystals (pickups, icons)
//   linkedCore(shellMat)               a core that follows an animated shell (its colour from the shell's, per draw)
import * as THREE from 'three';

// ---- faceted crystal (WELL-POLISH): a six-sided prism with a pointed cap, flat-shaded (every facet its own normal),
// unit radius and height (the base ring at y 0, the cap's apex at y 1). Four shapes (a straight point, two cut at an
// angle, a stubby one); scaled per crystal. Non-indexed, so Kit merges them into one draw call per material.
const _crystalGeos = [];
export function crystalGeo(v = 0) {
  v = ((v % 4) + 4) % 4;
  if (_crystalGeos[v]) return _crystalGeos[v];
  const h = (n) => { const s = Math.sin((v + 1) * 12.9898 + n * 78.233) * 43758.5453; return s - Math.floor(s); };
  const N = 6, shoulder = [0.66, 0.74, 0.7, 0.82][v], apexX = [0, 0.32, -0.25, 0.08][v], apexZ = [0, 0.1, 0.22, -0.12][v];
  const bot = [], top = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + (h(i) - 0.5) * 0.26, r = 0.86 + h(i + 9) * 0.14;
    bot.push([Math.cos(a) * r, 0, Math.sin(a) * r]);
    top.push([Math.cos(a) * r * 0.9, shoulder + (h(i + 3) - 0.5) * 0.06, Math.sin(a) * r * 0.9]);
  }
  const apex = [apexX, 1, apexZ], pos = [];
  const tri = (a, b, c) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3 - 0.45, cz = (a[2] + b[2] + c[2]) / 3;
    if (nx * cx + ny * cy + nz * cz < 0) [b, c] = [c, b]; // (outward)
    pos.push(...a, ...b, ...c);
  };
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    tri(bot[i], bot[j], top[j]); tri(bot[i], top[j], top[i]); // the side
    tri(top[i], top[j], apex);                                // the cap
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals(); // (non-indexed: one normal per facet)
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  return (_crystalGeos[v] = g);
}
// the prism with its colour in the vertices (for the shared core: one material for every tint)
const _tinted = new Map();
export function crystalGeoTinted(v, color) {
  const c = color instanceof THREE.Color ? color : new THREE.Color(color), key = (((v % 4) + 4) % 4) + c.getHexString();
  let g = _tinted.get(key);
  if (!g) {
    g = crystalGeo(v).clone();
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    _tinted.set(key, g);
  }
  return g;
}

// the two materials of a crystal: a translucent faceted shell (the existing lit, transparent standard material, so no
// new shader) and an opaque emissive core inside it, which is the "inner glow" (unlit basic, brightened and pulsed per frame)
// (userData.crystal: the draw-call count of tests/lib/crystal-shots.mjs finds them by it)
export const crystalShell = (c, e, kk = 0.4, op = 0.72) => { const m = new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: kk, roughness: 0.1, metalness: 0.2, transparent: true, opacity: op, depthWrite: false }); m.userData.noShadow = true; m.userData.crystal = true; return m; };
export const crystalCore = (c) => { const m = new THREE.MeshBasicMaterial({ color: c }); m.userData.noShadow = true; m.userData.crystal = true; m.userData.base = new THREE.Color(c); return m; };
// one crystal: its shell and the core inside it, rooted at (x, y, z), leaning `tilt` towards the heading `yaw`
export function growCrystal(k, shell, core, x, y, z, yaw, tilt, h, r, v, tips) {
  k.add(crystalGeo(v), shell, x, y, z, yaw, { rx: tilt, sx: r, sy: h, sz: r });
  k.add(coreGeoFor(core, shell, v + 1), core, x, y, z, yaw, { rx: tilt, sx: r * 0.5, sy: h * 0.84, sz: r * 0.5 });
  if (tips && h > 0.7) tips.push([x + Math.sin(tilt) * Math.sin(yaw) * h, y + Math.cos(tilt) * h, z + Math.sin(tilt) * Math.cos(yaw) * h]);
}
// a cluster: a tall one in the middle, shorter ones fanned round it. `heading` is where it leans (towards the room),
// `spread` how far the others fan round that heading (π: all round, for a floor cluster).
export function crystalCluster(k, shell, core, x, y, z, { n = 6, s = 1, heading = 0, spread = Math.PI, lean = 0.22, seed = 0, tips } = {}) {
  const h = (i) => { const q = Math.sin((seed + 1) * 4.37 + i * 91.7) * 43758.5453; return q - Math.floor(q); };
  growCrystal(k, shell, core, x, y, z, heading, lean * 0.6, s * (1.25 + h(0) * 0.35), s * 0.27, seed, tips);
  for (let i = 1; i < n; i++) {
    const a = heading + (h(i) * 2 - 1) * spread, d = s * (0.18 + h(i + 20) * 0.3), len = s * (0.45 + h(i + 40) * 0.7);
    growCrystal(k, shell, core, x + Math.sin(a) * d, y - 0.05, z + Math.cos(a) * d, a, lean + 0.12 + h(i + 60) * 0.42, len, s * (0.13 + h(i + 80) * 0.1), seed + i, tips);
  }
}
const coreGeoFor = (core, shell, v) => (core.vertexColors ? crystalGeoTinted(v, shell.userData.coreTint || '#ffffff') : crystalGeo(v));

// ---- the shared palette: the well's colours. A place keeps a tint of its own only where its story needs it
// (warm: the Joint Project's heat crystals; gold: Sendell's shard; pale: the old crystal lamps' cold light).
export const CRYSTAL_TINTS = {
  cyan: { shell: '#7fe0ff', em: '#1096d0', k: 0.4, op: 0.72, core: '#7ff0ff' },
  violet: { shell: '#c8a0ff', em: '#6a2ad8', k: 0.4, op: 0.72, core: '#b78aff' },
  vein: { shell: '#b8f0ff', em: '#28c8f8', k: 0.45, op: 0.74, core: '#a8f4ff' },
  dim: { shell: '#6f8696', em: '#0e3c52', k: 0.5, op: 0.82, core: '#2f7f98' },   // (the well's nodes asleep)
  pale: { shell: '#cfe8ff', em: '#4a90ff', k: 0.7, op: 0.74, core: '#dff2ff' },   // (lamps: a brighter cold white)
  warm: { shell: '#ffe2b8', em: '#ff9a3c', k: 0.6, op: 0.78, core: '#ffd08a' },   // (the project's heat crystals)
  gold: { shell: '#fff0a0', em: '#ffb000', k: 1.2, op: 0.8, core: '#fff4c0' },    // (Sendell's shard)
};
const _mats = new Map(), _cores = new Map();
// the shared core: unlit, its colour in the vertices (each tint's core colour), one material for every tint
function sharedCore(rockSet) {
  let m = _cores.get(rockSet);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: '#ffffff', vertexColors: true });
    m.userData.noShadow = true; m.userData.crystal = true; m.userData.base = new THREE.Color('#ffffff');
    if (rockSet) m.userData.rockSet = true;   // (crystals growing out of rock: rocksettle.js rocksOutOfBuilt)
    _cores.set(rockSet, m);
  }
  return m;
}
// { shell, core } for a tint, made once and shared by every place (rockSet: the crystals grow out of rock)
export function crystalMats(tint = 'cyan', { rockSet = false } = {}) {
  const key = tint + (rockSet ? '|rock' : '');
  let p = _mats.get(key);
  if (!p) {
    const T = CRYSTAL_TINTS[tint] || CRYSTAL_TINTS.cyan;
    const shell = crystalShell(T.shell, T.em, T.k, T.op);
    shell.userData.coreTint = new THREE.Color(T.core);
    if (rockSet) shell.userData.rockSet = true;
    p = { shell, core: sharedCore(rockSet), tint };
    _mats.set(key, p);
  }
  return p;
}
// one crystal into a Kit with its full transform (Kit's add: ry, then rx/rz, scale sx/sy/sz: radius, height, radius);
// the core is the same crystal at half the radius and 0.84 of the height, inside the shell
export function addCrystal(k, mats, x, y, z, ry, o, v = 0) {
  k.add(crystalGeo(v), mats.shell, x, y, z, ry, o);
  const sx = o.sx ?? 1, sy = o.sy ?? 1, sz = o.sz ?? 1;
  k.add(coreGeoFor(mats.core, mats.shell, v + 1), mats.core, x, y, z, ry, { rx: o.rx, rz: o.rz, sx: sx * 0.5, sy: sy * 0.84, sz: sz * 0.5 });
}
// a crystal of its own: a Group holding its shell and core meshes (base at the group's origin, apex at y h)
export function crystalPiece(mats, { h = 1, r = 0.3, v = 0, tilt = 0, yaw = 0 } = {}) {
  const g = new THREE.Group();
  const s = new THREE.Mesh(crystalGeo(v), mats.shell); s.scale.set(r, h, r);
  const c = new THREE.Mesh(coreGeoFor(mats.core, mats.shell, v + 1), mats.core); c.scale.set(r * 0.5, h * 0.84, r * 0.5);
  for (const m of [s, c]) { m.rotation.set(tilt, yaw, 0, 'YXZ'); m.castShadow = false; m.receiveShadow = false; g.add(m); }
  g.userData.shell = s; g.userData.core = c;
  return g;
}
// one shell geometry and one core geometry from crystals [x, y, z, yaw, tilt, h, r, v] (with rz: [..., v, rz]):
// for a small object drawn as one mesh per material (a pickup, an item's icon). The core geometry carries the tint's
// core colour in its vertices (for the shared core).
export function bakeCrystals(parts, tint = 'cyan') {
  const coreC = new THREE.Color(CRYSTAL_TINTS[tint]?.core || tint);
  const bake = (core) => {
    const pos = [], nor = [], col = [];
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3(), nm = new THREE.Matrix3(), v3 = new THREE.Vector3();
    for (const [x, y, z, yaw, tilt, h, r, v, rz = 0] of parts) {
      const g = crystalGeo(core ? v + 1 : v), P = g.attributes.position, N = g.attributes.normal;
      m.compose(p.set(x, y, z), q.setFromEuler(e.set(tilt, yaw, rz, 'YXZ')), core ? sc.set(r * 0.5, h * 0.84, r * 0.5) : sc.set(r, h, r));
      nm.getNormalMatrix(m);
      for (let i = 0; i < P.count; i++) {
        v3.fromBufferAttribute(P, i).applyMatrix4(m); pos.push(v3.x, v3.y, v3.z);
        v3.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.push(v3.x, v3.y, v3.z);
        if (core) col.push(coreC.r, coreC.g, coreC.b);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
    if (core) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
  };
  return { shell: bake(false), core: bake(true) };
}
// a core for a shell whose colour and glow the game animates (a crystal that wakes, a heat post that warms): its colour
// follows the shell's, read just before it is drawn (no updater of its own): dull while the shell is dull, bright as it
// glows. `lo`/`hi` bound its brightness.
const _lc = new THREE.Color();
export function linkedCore(shell, { lo = 0.35, hi = 1.25 } = {}) {
  const m = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  m.userData.noShadow = true; m.userData.crystal = true;
  const sync = () => {
    const k = Math.min(hi, Math.max(lo, 0.35 + 0.38 * shell.emissiveIntensity));
    _lc.copy(shell.color).lerp(shell.emissive, 0.4).multiplyScalar(k);
    m.color.copy(_lc);
  };
  sync();
  m.onBeforeRender = sync;
  return m;
}
// a crystal centred on its origin, where an octahedron "gem" stood (its half-height hs, its radius rr: the same place
// and height as the octahedron of size hs it replaces); `core`: the core inside it (the same base, half the radius,
// 0.84 of the height), tinted with `tint` for the shared vertex-coloured core
const _gems = new Map();
export function gemGeo(v, hs, rr = hs * 0.6, core = false, tint = null) {
  v = ((v % 4) + 4) % 4;
  const c = tint ? (tint instanceof THREE.Color ? tint : new THREE.Color(tint)) : null;
  const key = [v, hs, rr, core ? 1 : 0, c ? c.getHexString() : ''].join('|');
  let g = _gems.get(key);
  if (!g) {
    g = (c ? crystalGeoTinted(core ? v + 1 : v, c) : crystalGeo(core ? v + 1 : v)).clone();
    g.scale(core ? rr * 0.5 : rr, 2 * hs * (core ? 0.84 : 1), core ? rr * 0.5 : rr);
    g.translate(0, -hs, 0);
    _gems.set(key, g);
  }
  return g;
}
// that crystal as a mesh: the shell mesh (its material the given one, so code that animates `mesh.material` still
// does), the core a child mesh of it
export function crystalGem(shell, core, { v = 0, hs = 0.1, rr = hs * 0.6 } = {}) {
  const m = new THREE.Mesh(gemGeo(v, hs, rr), shell);
  m.add(coreOfGem(shell, core, { v, hs, rr }));
  return m;
}
export function coreOfGem(shell, core, { v = 0, hs = 0.1, rr = hs * 0.6 } = {}) {
  const c = new THREE.Mesh(gemGeo(v, hs, rr, true, core.vertexColors ? shell.userData.coreTint || '#ffffff' : null), core);
  c.castShadow = false;
  return c;
}
// a shell look given to an existing (animated) material: the well's translucent glassy shell, its colours kept
export function asShell(mat, op = 0.78) {
  mat.roughness = 0.1; mat.metalness = 0.2; mat.transparent = true; mat.opacity = op; mat.depthWrite = false; mat.flatShading = false;
  mat.userData.noShadow = true; mat.userData.crystal = true; mat.needsUpdate = true;
  return mat;
}
