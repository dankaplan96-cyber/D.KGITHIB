// EQUIP-1: the magic ball's and the sword's looks (the ball: actors.js MagicBall; the sword: actors.js buildSword, held in
// Twinsen's hand; both again in the interface: itemlook.js, the inventory; and their HUD icons: hud.js).
//
// The ball, as in LBA2 (the user's own SPRIRAW.HQR, looked at and described only; nothing copied): a small glossy
// marble in the level's colour (gold, green, red; the fire ball a bright orange flame), lit from the upper left with a
// white glint and a dark rim at the lower right, a half-transparent disc of its colour round it and a string of
// smaller balls behind it. Ours was a flat near-white disc (a standard material at emissive 2.2-4 burns out to white
// under the neutral tone mapping), so the level hardly showed (red read pink, the fire ball salmon).
// Now: the same sphere, its shading painted in vertex colours (base, light, dark rim, glint) and turned to face the
// camera every frame, so it reads as a marble from any side; a moderate glow in the level's colour keeps it bright in
// the dark; the halo gets a soft core (ballGlowTexture). Same program as the game's own vertex-coloured props
// (standard + vertex colours), one mesh, one draw call, as before.
//
// The sword (Yorna's, chapter 6; the game's own design: a short, slightly curved blade with a brass guard), at the
// Follow camera a 3-4 px grey line with nothing at the hilt: now a broader sabre blade (6.4 cm, was 4.6) with a flat
// and a bevelled edge (crisp facets: a light line along the edge), a curved cross-guard with ball ends, a pommel and a
// wrapped grip. Same length, grip and blade positions in the hand (slashtrail.js samples the blade at y -0.36 / -0.84),
// three meshes (steel, brass, leather) instead of four, their geometries and materials made once and shared.
import * as THREE from 'three';

const GEO = {}, MATS = {};
const once = (bag, k, make) => bag[k] || (bag[k] = make());
const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const col = (h) => new THREE.Color(h);   // (sRGB in, linear held: what vertex colours are)

// ------------------------------------------------------------------ the magic ball
export const BALL_RADIUS = 0.12;
// per level: base (the marble's colour), light (toward the glint), dark (the rim), glint
const BALL_PAINT = [null,
  { base: '#f2b23a', light: '#ffe08a', dark: '#6a4208', glint: '#ffffff' },   // 1 gold-yellow
  { base: '#3cc04e', light: '#a8f2a0', dark: '#0c4418', glint: '#ffffff' },   // 2 green
  { base: '#d8282a', light: '#ff8a7a', dark: '#520404', glint: '#ffffff' },   // 3 red
  { base: '#ff9a10', light: '#fff27a', dark: '#d8340a', glint: '#fffbe0' },   // 4 the fire ball (a bright rim: flame, not shade)
];
// where the light comes from in the ball's own frame (+z faces the camera, +y up): upper left, toward the viewer
const LIGHT = new THREE.Vector3(-0.42, 0.5, 0.76).normalize();
const UP = new THREE.Vector3(0, 1, 0);
// The ball's sphere with its shading painted on. facing = true: for the game (the mesh is turned to face the camera,
// MagicBall.fx): the glint upper left, the rim darkened all round. facing = false: for the inventory, which turns the
// model about y: the shading is symmetric about y (light on top), the stage's own lights give the glint.
export function ballGeo(level = 1, facing = true) {
  const L = Math.max(1, Math.min(4, level | 0));
  return once(GEO, `ball${L}${facing ? 'f' : 'u'}`, () => {
    const P = BALL_PAINT[L], base = col(P.base), light = col(P.light), dark = col(P.dark), glint = col(P.glint);
    // the pole on the light (the glint is then the first ring: a round spot, not a broken one)
    const g = new THREE.SphereGeometry(BALL_RADIUS, 18, 12);
    const axis = facing ? LIGHT : UP;
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, axis));
    const N = g.attributes.normal, c = new Float32Array(N.count * 3), n = new THREE.Vector3(), k = new THREE.Color();
    for (let i = 0; i < N.count; i++) {
      n.fromBufferAttribute(N, i);
      const d = n.dot(axis);
      k.copy(dark).lerp(base, ss(-0.75, 0.25, d)).lerp(light, ss(0.35, 0.92, d) * 0.85);
      if (facing) k.lerp(dark, (1 - ss(0.0, 0.55, n.z)) * 0.55);   // (the rim, as the sprite's outline)
      k.lerp(glint, ss(facing ? 0.93 : 0.97, facing ? 0.99 : 1.0, d));
      c[i * 3] = k.r; c[i * 3 + 1] = k.g; c[i * 3 + 2] = k.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  });
}
// The game's ball material (one ball: one material, its glow set per level and charge by MagicBall)
export function ballMaterial() {
  // (its colour a light grey: in full sun the lit marble stays below white, so a yellow ball stays yellow)
  return new THREE.MeshStandardMaterial({ color: '#d4d4d4', vertexColors: true, roughness: 0.35, metalness: 0, emissive: '#ffc400', emissiveIntensity: 0.4 });
}
// glow (the old emissive scale: 0.6 held, 2.2 thrown, 4 charged, up to 3.8 while charging) -> the body's emissive: kept
// low, so the painted shading and the level's hue survive the tone mapping (the halo carries the rest)
export const ballEmissive = (glow) => 0.18 + Math.min(glow, 6) * 0.1;
// The inventory's ball (itemlook.js): the same marble, a little glow (the slot's lights give the glint)
export function ballLookMesh(level = 1) {
  const L = Math.max(1, Math.min(4, level | 0));
  const m = once(MATS, 'ballLook' + L, () => new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.22, metalness: 0, emissive: ['#000', '#ffb000', '#30d020', '#ff2a10', '#ff6a00'][L], emissiveIntensity: L === 4 ? 0.4 : 0.15 }));
  return new THREE.Mesh(ballGeo(L, false), m);
}
// The halo's picture: a soft disc a little wider than the ball (LBA2's half-transparent disc; the ball covers the
// middle 37 % of it in flight) inside a wide, soft glow
let _glowTex = null;
export function ballGlowTexture() {
  if (_glowTex) return _glowTex;
  const S = 64, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), im = x.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const d = Math.hypot(i / (S - 1) - 0.5, j / (S - 1) - 0.5) * 2;
    const a = d >= 1 ? 0 : 0.45 * Math.pow(1 - d, 1.5) + 0.55 * (1 - ss(0.46, 0.7, d));
    const k = (j * S + i) * 4; im.data[k] = im.data[k + 1] = im.data[k + 2] = 255; im.data[k + 3] = Math.round(Math.min(1, a) * 255);
  }
  x.putImageData(im, 0, 0);
  _glowTex = new THREE.CanvasTexture(c); _glowTex.colorSpace = THREE.SRGBColorSpace;
  return _glowTex;
}

// ------------------------------------------------------------------ the sword
// In the sword's group (the hand's frame: -y continues the forearm): the grip from y -0.075 to 0.075 (where the hand
// closes), the pommel above it, the guard at -0.09, the blade from -0.1 to -0.82 (its width along x, its flat facing z).
const BLADE = { y0: -0.1, len: 0.72, half: 0.032, curve: 0.026, thick: 0.0075 };
// A strip of quads through rows of points (each row one station along the blade), its own vertices so its normals are
// smooth along the blade and crisp against the next facet
function strip(rows, a, b, pos, idx) {
  const base = pos.length / 3;
  for (const r of rows) pos.push(...r[a], ...r[b]);
  for (let i = 0; i < rows.length - 1; i++) { const q = base + i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
}
function bladeGeo() {
  const B = BLADE, n = 14, rows = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, y = B.y0 - t * B.len;
    const bend = B.curve * t * t;                                   // the slight curve (the spine convex, toward -x)
    const taper = t < 0.74 ? 1 + 0.06 * Math.sin((t / 0.74) * Math.PI * 0.9) : Math.sqrt(Math.max(0, 1 - ((t - 0.74) / 0.26) ** 2)) * 1.05;
    // spine (-x side) and edge (+x side); toward the point the edge sweeps up to the spine (the point nearer the spine:
    // a sabre's), the spine dipping a little
    const xs = -bend - B.half + (1 - Math.min(1, taper)) * B.half * 0.6, xe = xs + 2 * B.half * taper;
    const th = B.thick * (1 - 0.45 * t) * (t < 0.74 ? 1 : Math.min(1, taper + 0.15));
    const xr = xs + (xe - xs) * 0.55;                                 // the ridge: the flat from the spine, the bevel to the edge
    rows.push({ sf: [xs, y, th * 0.7], sb: [xs, y, -th * 0.7], rf: [xr, y, th], rb: [xr, y, -th], e: [xe, y, 0] });
  }
  const pos = [], idx = [];
  // front: spine -> ridge (the flat), ridge -> edge (the bevel); back the same, wound the other way; the spine's band
  strip(rows, 'rf', 'sf', pos, idx); strip(rows, 'e', 'rf', pos, idx);
  strip(rows, 'sb', 'rb', pos, idx); strip(rows, 'rb', 'e', pos, idx);
  strip(rows, 'sf', 'sb', pos, idx);
  // the base: one cap under the guard (hidden, but it closes the solid for the shadow)
  const r0 = rows[0], q = pos.length / 3; pos.push(...r0.sf, ...r0.rf, ...r0.e, ...r0.rb, ...r0.sb);
  idx.push(q, q + 1, q + 4, q + 1, q + 3, q + 4, q + 1, q + 2, q + 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  g.computeVertexNormals();   // (each facet its own vertices: smooth along the blade, crisp from facet to facet)
  return dropDegenerate(g);
}
// position + normal as one non-indexed geometry, leaving out triangles of no area (the blade's point, a lathe's poles)
function dropDegenerate(...list) {
  const pos = [], nrm = [], a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (const g0 of list) {
    const g = g0.index ? g0.toNonIndexed() : g0, P = g.attributes.position, N = g.attributes.normal;
    for (let i = 0; i < P.count; i += 3) {
      a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, i + 1); c.fromBufferAttribute(P, i + 2);
      if (c.clone().sub(b).cross(b.clone().sub(a)).lengthSq() < 1e-14) continue;
      for (let k = 0; k < 3; k++) { pos.push(P.getX(i + k), P.getY(i + k), P.getZ(i + k)); nrm.push(N.getX(i + k), N.getY(i + k), N.getZ(i + k)); }
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  out.computeBoundingSphere();
  return out;
}
const at = (g, x, y, z, sx = 1, sy = 1, sz = 1) => { g.scale(sx, sy, sz); g.translate(x, y, z); return g; };
function brassGeo() {
  // the cross-guard: a bar bent a little toward the blade at its ends, a ball on each end, a block at the middle
  const path = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.1, -0.103, 0), new THREE.Vector3(0, -0.076, 0), new THREE.Vector3(0.1, -0.103, 0));
  const bar = at(new THREE.TubeGeometry(path, 8, 0.0135, 6, false), 0, 0, 0, 1, 1, 1.25);
  const ends = [-1, 1].map((s) => at(new THREE.SphereGeometry(0.02, 6, 4), s * 0.102, -0.105, 0));
  const block = at(new THREE.BoxGeometry(0.052, 0.034, 0.036), 0, -0.092, 0);
  // the pommel (a flattened ball) and the ferrule under it
  const pommel = at(new THREE.SphereGeometry(0.034, 8, 5), 0, 0.104, 0, 1, 0.82, 1);
  const ferrule = at(new THREE.CylinderGeometry(0.025, 0.023, 0.016, 8, 1, true), 0, 0.078, 0);
  return dropDegenerate(bar, ...ends, block, pommel, ferrule);
}
function gripGeo() {
  // a wrapped grip: three swells of the binding between the guard and the ferrule
  const pts = [[0.0, -0.075], [0.02, -0.075], [0.0225, -0.05], [0.0195, -0.025], [0.0225, 0.0], [0.0195, 0.025], [0.0225, 0.05], [0.019, 0.07], [0.0, 0.07]];
  return dropDegenerate(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 8));
}
export const swordGeos = () => once(GEO, 'sword', () => ({ blade: bladeGeo(), brass: brassGeo(), grip: gripGeo() }));
// (TOWN-POLISH, I-28: a bright, mostly dielectric steel with a faint cool glow: at metalness 0.8 with no environment map
//  the blade drew dark grey against the grey paving. Kept; the bevel's facets now give it an edge line)
export const swordMats = () => once(MATS, 'sword', () => ({
  blade: new THREE.MeshStandardMaterial({ color: '#f4f8fc', metalness: 0.35, roughness: 0.28, emissive: '#8fb4d8', emissiveIntensity: 0.38 }),
  brass: new THREE.MeshStandardMaterial({ color: '#e8b450', metalness: 0.7, roughness: 0.32 }),
  grip: new THREE.MeshStandardMaterial({ color: '#4e2e1a', roughness: 0.8 }),
}));
// the sword's three meshes in a group (shared geometries and materials; the group's pose is buildSword's)
export function swordMeshes(g) {
  const G = swordGeos(), M = swordMats();
  for (const k of ['blade', 'brass', 'grip']) { const o = new THREE.Mesh(G[k], M[k]); o.name = 'sword-' + k; o.castShadow = true; g.add(o); }
  return g;
}

// ------------------------------------------------------------------ the HUD icons (the weapon pill, the selector ring)
// small inline SVGs in the item's own colours (they were the glyphs ✦ and ⚔: a star, and two crossed swords for one)
const BALL_ICON = [null, ['#ffe08a', '#f2b23a', '#6a4208'], ['#a8f2a0', '#3cc04e', '#0c4418'], ['#ff8a7a', '#d8282a', '#520404'], ['#fff27a', '#ff9a10', '#d8340a']];
export function ballIcon(level = 1) {
  const [l, b, d] = BALL_ICON[Math.max(1, Math.min(4, level | 0))];
  return `<svg viewBox="0 0 24 24" width="1.2em" height="1.2em" style="vertical-align:-0.25em" aria-hidden="true"><defs><radialGradient id="bi${level}" cx="0.38" cy="0.34" r="0.7"><stop offset="0" stop-color="${l}"/><stop offset="0.55" stop-color="${b}"/><stop offset="1" stop-color="${d}"/></radialGradient></defs><circle cx="12" cy="12" r="10.5" fill="${b}" opacity="0.28"/><circle cx="12" cy="12" r="8" fill="url(#bi${level})"/><ellipse cx="9" cy="8.6" rx="2.2" ry="1.6" fill="#fff" transform="rotate(-35 9 8.6)"/></svg>`;
}
export const SWORD_ICON = '<svg viewBox="0 0 24 24" width="1.35em" height="1.35em" style="vertical-align:-0.3em" aria-hidden="true"><path d="M19.6 2.6 C17.2 3.4 12.6 7.6 9.4 11.4 L12.6 14.6 C16.4 11.4 20.6 6.8 21.4 4.4 Z" fill="#eef4fa" stroke="#5a6a7a" stroke-width="0.7"/><path d="M19.6 2.6 C17.2 3.4 12.6 7.6 9.4 11.4 L11 13 C14.6 9.6 18.6 5.2 19.6 2.6 Z" fill="#b8c8d8"/><path d="M6.6 11.2 L12.8 17.4" stroke="#e8b450" stroke-width="2.6" stroke-linecap="round"/><path d="M9.6 14.4 L5.2 18.8" stroke="#4e2e1a" stroke-width="2.4" stroke-linecap="round"/><circle cx="4.4" cy="19.6" r="1.9" fill="#e8b450"/></svg>';
