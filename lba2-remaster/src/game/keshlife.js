// Desert Island twelve years on: what Kesh changed to live with sand, heat and the new traffic (this sequel's
// proposed developments, docs/TWELVE_YEARS.md; src/game/story/kesh.js gives them their people and story).
//
//   - The cool room: one of FunFrock's concrete blockhouses at the village's west edge, half under a dune. Kesh dug
//     its door out (spoil heaps, a shovel, planks), plastered a parapet on it and built a wind-catcher on the roof (a
//     tower with a turning timber cowl) that sends the breeze down through it. The coolest room on the island: the
//     village's water jars (on the shelf by the door, under the porch awning), Lumi's dyed wool, and Brosk's dates
//     once it draws. An outside stair climbs to the roof; a windsock on its north-west corner and a rag on the porch
//     show the wind. Since the last storm the cowl faces away from the wind and its sand screen is torn (The
//     Wind-Catcher). Its states read from the roof whichever way the camera looks: Lumi's screen shows as a striped
//     hem over the lid and two tails down the cowl's back; sand streams into a bare mouth facing the wind and blows
//     out of the door past the awning; pale motes drift out of the door while it draws.
//   - Lumi's loom in the shade of a striped sail (her work: the sails, the screens, the curtain in the cool room's door).
//   - Reed sand screens on the village's windward (west) side, with the sand banked against them.
//   - Hesk's flag poles along the sand-yacht's routes to the camp and the dig (the dunes cover the track after every
//     storm; the rags stream downwind), clear of all four lines the yacht rides (YACHT_ROUTES, used by desert.js),
//     and his yacht stop by the berth: CAMP · DIG · KESH, and the ferry at the pier (once the project takes the
//     ferry its line is chalked out and a slate hangs under the board: NO FERRY, ask Hesk).
//
// The wind blows from the west (the dunes' crests, the wind-pump's wheel, the storm's dust).
//
// CONTRACT (world coordinates): buildKesh(ctx) → {
//   cool { door {x,z}, crank {x,z}, use {x,z,a}, roofY, stairFoot {x,z}, sani {x,z,a}, dir,
//          setDir(d, snap)  (0 west · 1 north · 2 east · 3 south: where the cowl's mouth faces),
//          setScreen('torn'|'fitted'), setDrawing(b), setJars(n), setSand(b), setDates(b), gust(), sock {x,y,z} },
//   lumi {x,z,a,anim}, loom {x,z}, board {x,z, setFerry(b)}, poles [{x,z}], drift {x,z} }
// keshFlat(x,z) / keshBank(x,z) / keshDrift(x,z) shape the ground (desert.js heightFn, local coordinates);
// keshClear(x,z) keeps the island's scatter (rocks, shrubs, cacti) out of these places.
import * as THREE from 'three';
import { smoothstep, distToSegment } from '../engine/math.js';
import { tm, pm, ctex, bbox, cyl, lathe, Batch, mesh, rod } from './kit.js';

// ---- layout (desert-local coordinates)
export const COOL = { x: -70, z: -6, w: 6.0, d: 4.6, h: 3.0 };
const X0 = COOL.x - COOL.w / 2, X1 = COOL.x + COOL.w / 2, Z0 = COOL.z - COOL.d / 2, Z1 = COOL.z + COOL.d / 2;
const DOOR = { x: COOL.x + 0.35, w: 1.3 };
const TOWER = { x: COOL.x - 1.4, z: COOL.z, s: 1.6, h: 1.9 };
const STAIR = { x: X1 + 0.55, n: 7, deep: 0.56, z0: Z1 - 0.2 };   // along the east wall, rising southward (treads deeper than his reach)
const BANK = { x: X0 - 0.8, z: COOL.z - 1.0, rx: 3.2, rz: 4.2, h: 1.9 };   // the dune against its west side
export const LUMI = { x: -58.6, z: -0.6, a: 1.2 };
const SAIL = [[-60.6, -2.6, 2.9], [-56.2, -2.0, 2.6], [-57.7, 1.2, 2.7]];
export const SCREENS = [[[-73.5, -12.5], [-65.5, -21.5]], [[-71.5, 9.0], [-71.5, 20.0]]];
const BOARD = { x: -21.6, z: 15.2 };
const DRIFT = { x: 9.5, z: 14.5, r: 3.2, h: 0.55 };   // a drift over the yacht's track to the dig
// the sand-yacht's routes, out and back (desert.js rides them; Hesk's poles mark them)
export const YACHT_ROUTES = {
  toCamp: [[-24, 11], [-20, -6], [-17, -24], [-13, -36], [-8, -40]],
  toDig: [[-24, 11], [-4, 10], [16, 16], [36, 22], [44, 25]],
  toVillage: [[44, 25], [24, 18], [0, 10], [-20, 9], [-24, 11]],
  campToVillage: [[-8, -40], [-14, -30], [-19, -12], [-22, 4], [-24, 11]],
};
// the poles follow the way out, on the side away from the way back (west of the camp route, north of the dig route),
// and keep clear of every line the yacht rides (its crossbeam and wheels reach 1.6 m either side of the line)
const MARKED = [[YACHT_ROUTES.toCamp, 1], [YACHT_ROUTES.toDig, -1]];
export const POLE_CLEAR = 2.4;
export function routeDist(x, z) {
  let m = Infinity;
  for (const P of Object.values(YACHT_ROUTES)) for (let i = 0; i < P.length - 1; i++) m = Math.min(m, distToSegment(x, z, P[i][0], P[i][1], P[i + 1][0], P[i + 1][1]));
  return m;
}

const ebump = (x, z, b) => Math.exp(-(((x - b.x) / b.rx) ** 2 + ((z - b.z) / b.rz) ** 2));
const screenNormal = ([a, b]) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); let nx = dz / l, nz = -dx / l; if (nx > 0) { nx = -nx; nz = -nz; } return [nx, nz]; };
// level ground round the cool room (its porch, the stair, the roof's view)
export const keshFlat = (x, z) => smoothstep(11, 7, Math.hypot(x - COOL.x, z - COOL.z));
// sand: banked against the blockhouse's west wall, and along the windward side of the screens
export function keshBank(x, z) {
  let h = BANK.h * ebump(x, z, BANK);
  for (const s of SCREENS) {
    const [nx, nz] = screenNormal(s), o = 0.9;
    const d = distToSegment(x, z, s[0][0] + nx * o, s[0][1] + nz * o, s[1][0] + nx * o, s[1][1] + nz * o);
    h += 0.55 * smoothstep(1.5, 0.1, d);
  }
  return h;
}
// the drift across the yacht's track (0 … 1): the track's dirt fades under it
export const keshDrift = (x, z) => Math.exp(-((x - DRIFT.x) ** 2 + (z - DRIFT.z) ** 2) / (DRIFT.r * DRIFT.r));
export const DRIFT_H = DRIFT.h;
// the island's scattered rocks, shrubs and cacti keep out of these
export function keshClear(x, z, r = 0.5) {
  if (x > X0 - 5 - r && x < X1 + 3 + r && z > Z0 - 4 - r && z < Z1 + 4 + r) return true;   // the cool room, its bank, porch, stair
  if (Math.hypot(x - LUMI.x, z - LUMI.z) < 4 + r) return true;
  for (const s of SCREENS) if (distToSegment(x, z, s[0][0], s[0][1], s[1][0], s[1][1]) < 2.5 + r) return true;
  if (Math.hypot(x - BOARD.x, z - BOARD.z) < 2 + r) return true;
  for (const p of polePoints()) if (Math.hypot(x - p[0], z - p[1]) < 1.2 + r) return true;
  return false;
}
let _poles = null;
function polePoints() {
  if (_poles) return _poles;
  const out = [];
  for (const [P, side] of MARKED) {
    let d = 6;   // (none right by the berth)
    for (let i = 0; i < P.length - 1; i++) {
      const [ax, az] = P[i], [bx, bz] = P[i + 1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
      // 2.6 m off the track, on the right of the way out (side 1) or its left (−1)
      const rx = uz * side, rz = -ux * side;
      for (; d < L; d += 13) {
        const x = ax + ux * d + rx * 2.6, z = az + uz * d + rz * 2.6;
        if (Math.hypot(x - P[P.length - 1][0], z - P[P.length - 1][1]) > 7 && routeDist(x, z) >= POLE_CLEAR) out.push([x, z]);
      }
      d -= L;
    }
  }
  return (_poles = out);
}

// ---- painted textures
const stripes = (key, cols, n = 6, vertical = true) => ctex(key, 64, 64, (x, S) => { for (let i = 0; i < n; i++) { x.fillStyle = cols[i % cols.length]; if (vertical) x.fillRect(i * S / n, 0, S / n + 1, S); else x.fillRect(0, i * S / n, S, S / n + 1); } });
const reedTex = () => ctex('kreed', 128, 64, (x, W, H) => {
  x.clearRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { const px = i * 3.2 + (i % 3) * 0.4; x.fillStyle = ['#c8a868', '#b89458', '#d8bc80'][i % 3]; x.fillRect(px, 0, 2.4, H); }
  x.fillStyle = '#7a5a30'; for (const y of [12, 44]) x.fillRect(0, y, W, 3);   // the cords that bind them
});
const stencilTex = () => ctex('kstencil', 128, 64, (x, W, H) => {
  x.clearRect(0, 0, W, H); x.globalAlpha = 0.55; x.fillStyle = '#3a3a36'; x.font = 'bold 34px monospace'; x.textAlign = 'center'; x.fillText('F-17', W / 2, 42);
  x.globalAlpha = 0.35; for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? '#e8c040' : '#2a2a2a'; x.fillRect(8 + i * 28, 50, 28, 8); }
}, false);
const signTex = (lines, bg, fg, w = 256, h = 96) => ctex('ksign' + lines.join('|'), w, h, (x, W, H) => {
  x.fillStyle = bg; x.fillRect(0, 0, W, H); x.strokeStyle = fg; x.lineWidth = 5; x.strokeRect(5, 5, W - 10, H - 10);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  const n = lines.length; lines.forEach((l, i) => { x.font = `${i ? '' : 'bold '}${i ? 26 : 36}px sans-serif`; x.fillText(l, W / 2, H * (i + 0.5 + (n === 1 ? 0 : 0.05)) / n); });
}, false);
// (the board's lines sit at 23 · 66 · 109 px of 128: the chalk only crosses out the third, the ferry)
const chalkTex = () => ctex('kchalk', 256, 128, (x, W, H) => {
  x.clearRect(0, 0, W, H); x.strokeStyle = 'rgba(250,250,245,0.92)'; x.lineWidth = 6; x.lineCap = 'round';
  x.beginPath(); x.moveTo(18, 113); x.lineTo(238, 104); x.stroke();
  x.beginPath(); x.moveTo(26, 120); x.lineTo(230, 98); x.stroke();
}, false);
// the slate Hesk hung under it: big chalk, readable from where people wait
const slateTex = () => ctex('kslate', 256, 120, (x, W, H) => {
  x.fillStyle = '#2e3432'; x.fillRect(0, 0, W, H); x.strokeStyle = '#7a5a38'; x.lineWidth = 8; x.strokeRect(4, 4, W - 8, H - 8);
  x.fillStyle = 'rgba(250,250,245,0.95)'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = 'bold 42px "Comic Sans MS", cursive, sans-serif'; x.fillText('NO FERRY', W / 2, 36); x.fillText('ask Hesk', W / 2, 86);
}, false);
const loomTex = () => ctex('kloom', 64, 128, (x, W, H) => {
  x.clearRect(0, 0, W, H);
  // warp threads above, the woven band below (Kesh's stripes, a red Lumi is proud of)
  x.fillStyle = '#e8dcc0'; for (let i = 0; i < W; i += 4) x.fillRect(i, 0, 1.5, H * 0.55);
  const band = ['#c8452f', '#f2e2c0', '#2f7a9a', '#f2e2c0', '#c8452f', '#e8b84a'];
  for (let i = 0; i < 12; i++) { x.fillStyle = band[i % band.length]; x.fillRect(0, H * 0.55 + i * (H * 0.45 / 12), W, H * 0.45 / 12 + 1); }
}, false);

// soft puffs of dust (one draw for all): each grows, fades in and out, slows, and drifts downwind (east)
const PUFF_VS = `
attribute float aSize; attribute float aAlpha; attribute vec3 aColor; uniform float uScale;
varying float vA; varying vec3 vC;
#include <fog_pars_vertex>
void main() {
  vA = aAlpha; vC = aColor;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(-mvPosition.z, 0.1);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const PUFF_FS = `
uniform sampler2D uMap; varying float vA; varying vec3 vC;
#include <fog_pars_fragment>
void main() {
  float a = texture2D(uMap, gl_PointCoord).a * vA;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vC, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;
function makePuffs(group, n) {
  const pos = new Float32Array(n * 3).fill(-9999), size = new Float32Array(n), alpha = new Float32Array(n), color = new Float32Array(n * 3);
  const vel = new Float32Array(n * 3), life = new Float32Array(n), max = new Float32Array(n), s0 = new Float32Array(n), a0 = new Float32Array(n);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1)); geo.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
  const map = ctex('kpuff', 64, 64, (x, S) => { const g = x.createRadialGradient(S / 2, S / 2, 1, S / 2, S / 2, S / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.clearRect(0, 0, S, S); x.fillStyle = g; x.fillRect(0, 0, S, S); }, false);
  const U = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uMap: { value: null }, uScale: { value: 360 } }]); U.uMap.value = map;
  const pts = new THREE.Points(geo, new THREE.ShaderMaterial({ uniforms: U, vertexShader: PUFF_VS, fragmentShader: PUFF_FS, transparent: true, depthWrite: false, fog: true }));
  pts.frustumCulled = false; pts.visible = false; pts.renderOrder = 3; group.add(pts);
  const v2 = new THREE.Vector2();
  pts.onBeforeRender = (r, s, cam) => { r.getDrawingBufferSize(v2); U.uScale.value = v2.y / (2 * Math.tan((cam.fov || 45) * Math.PI / 360)); };
  const c = new THREE.Color();
  let next = 0, live = 0;
  return {
    emit(x, y, z, vx, vy, vz, sz, lf, col, a = 0.8) {
      const i = next; next = (next + 1) % n;
      pos.set([x, y, z], i * 3); vel.set([vx, vy, vz], i * 3); c.set(col); color.set([c.r, c.g, c.b], i * 3);
      life[i] = max[i] = lf * (0.8 + Math.random() * 0.4); s0[i] = sz; a0[i] = a; live = n;
    },
    update(dt) {
      if (!live) return;
      let any = 0;
      for (let i = 0; i < n; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        if (life[i] <= 0) { alpha[i] = 0; pos[i * 3 + 1] = -9999; continue; }
        any++;
        const f = 1 - life[i] / max[i], k = Math.exp(-dt * 1.6);
        vel[i * 3] = 1.4 + (vel[i * 3] - 1.4) * k; vel[i * 3 + 1] *= k; vel[i * 3 + 2] *= k;   // (the wind takes it east)
        pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        size[i] = s0[i] * (0.6 + 1.1 * f); alpha[i] = a0[i] * Math.min(1, f * 6) * (1 - f);
      }
      live = any; pts.visible = any > 0;
      for (const a of ['position', 'aSize', 'aAlpha', 'aColor']) geo.attributes[a].needsUpdate = true;
    },
  };
}

export function buildKesh({ group, col, H, W, updaters, ox, oz }) {
  const B = new Batch(group);
  const concrete = tm('concrete', { color: '#cfc6b4' });
  const adobe = tm('plasterWall', { color: '#e6b484', rough: 0.95 });
  const plaster = tm('plaster', { color: '#d8a878' });
  const wood = tm('wood', { color: '#9a6a40' }), darkWood = tm('wood', { color: '#6a4528' }), plank = tm('planks', { color: '#d8b080' });
  const blue = pm('#2f6a9a', 0.6), rust = pm('#8a5038', 0.8, { metalness: 0.3 }), iron = pm('#4a4440', 0.55, { metalness: 0.5 });
  const sandM = tm('sand', { color: '#f6deb0' }), rope = pm('#c8b08a', 0.9);
  const cloth = (key, cols, n, vertical, extra = {}) => new THREE.MeshStandardMaterial({ map: stripes(key, cols, n, vertical), side: THREE.DoubleSide, roughness: 0.9, ...extra });
  const out = {}, ragAt = [];   // (rags other than the poles' own: [x, y, z])

  // ================================================================ the cool room (FunFrock's blockhouse)
  // (its floor level is the porch's and the stair foot's ground: the dune banked against its west side rises above it)
  const gy = Math.min(H(DOOR.x, Z1 + 0.8), H(STAIR.x, STAIR.z0 + 0.5)), roofY = gy + COOL.h, base = gy - 0.6;
  {
    // the concrete box, its cornice, a slit window with a rusted shutter (now a woven grille), the old stencil
    B.add(bbox(COOL.w, roofY - base, COOL.d, 0.06, 2.6), concrete, COOL.x, (roofY + base) / 2, COOL.z);
    B.add(bbox(COOL.w + 0.24, 0.16, COOL.d + 0.24, 0.03, 2.6), concrete, COOL.x, roofY - 0.24, COOL.z);
    B.add(bbox(1.0, 0.26, 0.1, 0.01, 1), pm('#1a1612', 0.95), X0 + 1.0, gy + 2.0, Z1 + 0.01);
    B.add(bbox(1.1, 0.06, 0.4, 0.01, 1), rust, X0 + 1.0, gy + 2.2, Z1 + 0.16, -0.5, 0, 0);
    const grille = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.24), new THREE.MeshStandardMaterial({ map: reedTex(), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide }));
    grille.position.set(X0 + 1.0, gy + 2.0, Z1 + 0.07); group.add(grille);
    const sten = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.45), new THREE.MeshStandardMaterial({ map: stencilTex(), transparent: true, roughness: 0.9 }));
    sten.position.set(X0 + 1.0, gy + 1.15, Z1 + 0.02); group.add(sten);
    // Kesh's parapet (adobe on the concrete), open at the east side's south end for the stair
    const ph = 0.5, pt = 0.24, gapZ = [Z0 + 0.24, Z0 + 1.7];
    const par = [[COOL.x, Z1 - pt / 2, COOL.w, pt], [COOL.x, Z0 + pt / 2, COOL.w, pt], [X0 + pt / 2, COOL.z, pt, COOL.d],
      [X1 - pt / 2, (gapZ[1] + Z1) / 2, pt, Z1 - gapZ[1]]];
    for (const [px, pz, pw, pd] of par) {
      B.add(bbox(pw, ph, pd, 0.08, 2.2), adobe, px, roofY + ph / 2, pz);
      col({ type: 'box', x: px, z: pz, hw: pw / 2, hd: pd / 2, top: roofY + 0.9, noStand: true });
    }
    B.add(bbox(COOL.w - 0.5, 0.04, COOL.d - 0.5, 0.01, 2), plaster, COOL.x, roofY + 0.01, COOL.z);
    col({ type: 'box', x: COOL.x, z: COOL.z, hw: COOL.w / 2, hd: COOL.d / 2, top: roofY });
    // the door: dark, framed in Kesh blue, a hand-painted board over it
    B.add(bbox(DOOR.w, 2.1, 0.14, 0.01, 1), pm('#140f0c', 1), DOOR.x, gy + 1.05, Z1 + 0.0);
    for (const s of [-1, 1]) B.add(bbox(0.14, 2.25, 0.2, 0.02, 1), blue, DOOR.x + s * (DOOR.w / 2 + 0.07), gy + 1.12, Z1 + 0.06);
    B.add(bbox(DOOR.w + 0.42, 0.16, 0.24, 0.02, 1), blue, DOOR.x, gy + 2.22, Z1 + 0.06);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.36), new THREE.MeshStandardMaterial({ map: signTex(['COOL ROOM'], '#f2e6c8', '#2f6a9a', 256, 72), roughness: 0.8 }));
    sign.position.set(DOOR.x, gy + 2.52, Z1 + 0.04); group.add(sign);
  }
  // the curtain in the door (Lumi's): hangs still, or lifts outward when the room draws
  const curtain = new THREE.Group(); curtain.position.set(DOOR.x, gy + 2.08, Z1 + 0.12); group.add(curtain);
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(DOOR.w - 0.1, 1.95), cloth('kcurt', ['#c8452f', '#f2e2c0', '#e8b84a'], 6, true)); m.position.y = -0.975; curtain.add(m); }
  // the porch: an awning on two poles, the jar shelf, Sani's place, the sand Kesh dug out of the door
  const ay = gy + 2.45;
  {
    const aw = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.5), cloth('kawn', ['#2f7a9a', '#f4e8d0'], 4, true));
    aw.position.set(COOL.x + 0.3, ay + 0.05, Z1 + 0.72); aw.rotation.x = -Math.PI / 2 + 0.28; aw.castShadow = true; group.add(aw);
    for (const px of [COOL.x - 1.85, COOL.x + 2.45]) {
      rod(B, [px, gy, Z1 + 1.38], [px, ay - 0.15, Z1 + 1.38], 0.045, wood);
      col({ type: 'cyl', x: px, z: Z1 + 1.38, r: 0.07, top: ay, noStand: true, seeThrough: true, camR: -0.3 });
    }
    ragAt.push([COOL.x + 2.45, ay - 0.42, Z1 + 1.38]);   // (a rag tied to the east pole: the wind, read from the door)
    // the shelf east of the door
    const sx = DOOR.x + 1.5, sz = Z1 + 0.32;
    B.add(bbox(1.4, 0.08, 0.45, 0.02, 1), plank, sx, gy + 0.55, sz);
    for (const dx of [-0.62, 0.62]) B.add(bbox(0.08, 0.55, 0.4, 0.01, 1), darkWood, sx + dx, gy + 0.27, sz);
    col({ type: 'box', x: sx, z: sz, hw: 0.72, hd: 0.25, top: gy + 0.95, noStand: true, seeThrough: true });
    out.shelf = { x: sx, z: sz };
    // spoil heaps either side (Kesh dug the door out), a shovel, planks of shoring
    for (const [hx, hz, r, hh] of [[X0 - 0.9, Z1 + 1.6, 1.3, 0.8], [X1 + 2.1, Z1 + 1.3, 1.0, 0.65]]) {
      B.add(new THREE.SphereGeometry(r, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, hh / r, 0.8), sandM, hx, H(hx, hz) - 0.08, hz, 0, 0.4, 0);
      col({ type: 'cyl', x: hx, z: hz, r: r * 0.85, top: H(hx, hz) + hh, noStand: true });
    }
    B.add(cyl(0.025, 0.025, 1.1, 6, 0), wood, X0 - 0.7, H(X0 - 0.9, Z1 + 1.6) + 1.0, Z1 + 1.5, 0.2, 0, 0.35);
    B.add(bbox(0.22, 0.03, 0.3, 0.01, 1), iron, X0 - 0.95, H(X0 - 0.9, Z1 + 1.6) + 0.5, Z1 + 1.45, 0.2, 0, 0.35);
    for (let k = 0; k < 3; k++) B.add(bbox(0.2, 1.6, 0.04, 0.01, 1), plank, X0 - 0.15 + k * 0.25, gy + 0.75, Z1 + 0.15, -0.2, 0, 0.05 * k);
  }
  // the water jars (two before the pump runs, five after) and Brosk's dates (once it draws)
  const jars = [];
  {
    const jarG = lathe([[0.01, 0], [0.13, 0.03], [0.17, 0.2], [0.11, 0.38], [0.08, 0.42], [0.1, 0.45]], 12, 0);
    const lidG = cyl(0.11, 0.11, 0.03, 12, 0);
    const jm = pm('#c86a3a', 0.8), lm = pm('#d8b080', 0.85);
    // (two merged sets: the two that are always there, and the three that come with the pump)
    for (const [k0, k1] of [[0, 2], [2, 5]]) {
      const g = new THREE.Group(); group.add(g); const JB = new Batch(g);
      for (let k = k0; k < k1; k++) { const jx = out.shelf.x - 0.54 + k * 0.27; JB.add(jarG, jm, jx, gy + 0.59, out.shelf.z); JB.add(lidG, lm, jx, gy + 1.06, out.shelf.z); }
      JB.build(); jars.push([g, k1]);
    }
  }
  const dates = new THREE.Group(); group.add(dates);
  {
    const DB = new Batch(dates);
    for (const dx of [1.15, 1.8]) {   // (under the jar shelf)
      const bx = DOOR.x + dx, bz = Z1 + 0.3;
      DB.add(lathe([[0.01, 0], [0.2, 0.01], [0.24, 0.2], [0.25, 0.22]], 12, 0), pm('#b8904a', 0.95), bx, gy, bz);
      for (let i = 0; i < 9; i++) { const a = i * 2.4; DB.add(new THREE.SphereGeometry(0.05, 6, 4).scale(1, 0.7, 1.4), pm('#6a3018', 0.6), bx + Math.cos(a) * 0.12 * (i % 3) / 2, gy + 0.21, bz + Math.sin(a) * 0.12 * (i % 3) / 2); }
    }
    DB.build();
    dates.visible = false;
  }
  // sand blown in through the door (the cowl turned into the wind with no screen on it)
  // (a heap in the door and a tongue of it out past the awning, downwind)
  const sandPile = new THREE.Group(); group.add(sandPile);
  mesh(sandPile, new THREE.SphereGeometry(0.75, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.32, 0.75), sandM, DOOR.x, gy - 0.02, Z1 + 0.45, 0, { cast: false });
  mesh(sandPile, new THREE.SphereGeometry(1.0, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.25, 0.16, 0.7), sandM, DOOR.x + 0.7, gy - 0.02, Z1 + 1.6, 0.5, { cast: false });
  sandPile.visible = false;

  // the stair up the east wall (Kesh's adobe; seven steps)
  {
    const rise = COOL.h / STAIR.n;
    for (let k = 0; k < STAIR.n; k++) {
      const top = gy + (k + 1) * rise, zc = STAIR.z0 - k * STAIR.deep - STAIR.deep / 2;
      B.add(bbox(1.1, top - base, STAIR.deep + 0.01, 0.03, 2.2), adobe, STAIR.x, (top + base) / 2, zc);
      col({ type: 'box', x: STAIR.x, z: zc, hw: 0.55, hd: STAIR.deep / 2 + 0.06, top });   // (overlapping treads: no seam to drop through; solid from the side)
    }
  }

  // the wind-catcher: an adobe tower on the roof, a timber cowl on a turning ring, a crank at its foot
  B.add(bbox(TOWER.s, TOWER.h, TOWER.s, 0.08, 2.2), adobe, TOWER.x, roofY + TOWER.h / 2, TOWER.z);
  for (const s of [-1, 1]) B.add(bbox(0.12, 0.9, 0.06, 0.01, 1), pm('#3a2418', 1), TOWER.x + s * 0.4, roofY + 1.3, TOWER.z + TOWER.s / 2 + 0.01);
  col({ type: 'box', x: TOWER.x, z: TOWER.z, hw: TOWER.s / 2, hd: TOWER.s / 2, top: roofY + TOWER.h + 1.1, noStand: true });
  const cowl = new THREE.Group(); cowl.position.set(TOWER.x, roofY + TOWER.h, TOWER.z); group.add(cowl);
  const torn = new THREE.Group(), fitted = new THREE.Group(), streamer = new THREE.Group(), tails = [];
  {
    const CB = new Batch(cowl);
    CB.add(new THREE.TorusGeometry(0.78, 0.05, 6, 24).rotateX(Math.PI / 2), iron, 0, 0.03, 0);
    CB.add(bbox(1.9, 0.1, 1.9, 0.02, 1), plank, 0, 1.06, 0);                               // its lid
    CB.add(bbox(1.76, 0.04, 1.76, 0.01, 1), pm('#1e1610', 1), 0, 0.02, 0);                 // the dark shaft below
    CB.add(bbox(0.08, 1.0, 1.84, 0.01, 1), plank, 0.91, 0.52, 0);                           // the back (downwind when right)
    for (const s of [-1, 1]) CB.add(bbox(1.84, 1.0, 0.08, 0.01, 1), plank, 0, 0.52, s * 0.91);
    // the mouth's blue frame (local −x)
    for (const s of [-1, 1]) CB.add(bbox(0.1, 1.06, 0.1, 0.01, 1), blue, -0.93, 0.52, s * 0.9);
    for (const y of [0.04, 1.0]) CB.add(bbox(0.1, 0.08, 1.9, 0.01, 1), blue, -0.93, y, 0);
    CB.add(bbox(0.55, 0.06, 2.0, 0.01, 1), plank, -1.15, 1.0, 0, 0, 0, 0.38);               // the hood over the mouth
    CB.build();
    cowl.add(torn, fitted, streamer);
    // the old screen, torn by the storm: a flap hanging from the top corner
    const tm1 = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.7), cloth('kscr', ['#c8452f', '#f2e2c0', '#2f7a9a', '#f2e2c0'], 8, false)); tm1.position.set(-0.98, 0.62, 0.55); tm1.rotation.y = Math.PI / 2; torn.add(tm1);
    // Lumi's new screen across the mouth
    const fm = new THREE.Mesh(new THREE.PlaneGeometry(1.76, 0.92), cloth('kscr2', ['#c8452f', '#f2e2c0', '#2f7a9a', '#f2e2c0'], 8, false, { transparent: true, opacity: 0.88 })); fm.position.set(-0.96, 0.52, 0); fm.rotation.y = Math.PI / 2; fitted.add(fm);
    // its lashings, seen from behind and above: the hem folded over the lid, two cords across it, the tails down the back
    const lash = cloth('kscr3', ['#c8452f', '#f2e2c0', '#2f7a9a', '#f2e2c0'], 4, false);
    const hem = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.9), lash); hem.position.set(-0.74, 1.12, 0); hem.rotation.x = -Math.PI / 2; fitted.add(hem);
    const FB = new Batch(fitted); for (const s of [-1, 1]) FB.add(bbox(1.5, 0.03, 0.035, 0.005, 1), rope, 0.2, 1.125, s * 0.62); FB.build();
    for (const s of [-1, 1]) { const tl = new THREE.Group(); tl.position.set(0.975, 1.1, s * 0.62); fitted.add(tl); tails.push(tl);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.75), lash); m.position.y = -0.375; m.rotation.y = Math.PI / 2; tl.add(m); }
    fitted.visible = false;
    // a red streamer at the mouth's top: hangs limp, or streams in when the wind comes down the tower
    const st = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.95), new THREE.MeshStandardMaterial({ color: '#d83a2a', side: THREE.DoubleSide, roughness: 0.8 })); st.position.y = -0.475; streamer.add(st);
    streamer.position.set(-0.95, 0.98, 0);
  }
  // the crank on the tower's east face (turns the ring through a worm gear)
  const crank = new THREE.Group(); crank.position.set(TOWER.x + TOWER.s / 2 + 0.12, roofY + 0.95, TOWER.z); group.add(crank);
  {
    const KB = new Batch(crank);
    KB.add(cyl(0.05, 0.05, 0.3, 8, 0), iron, -0.05, 0, 0, 0, 0, Math.PI / 2);
    KB.add(new THREE.TorusGeometry(0.24, 0.035, 6, 18).rotateY(Math.PI / 2), iron, 0.1, 0, 0);
    for (let k = 0; k < 3; k++) KB.add(cyl(0.02, 0.02, 0.46, 5, 0), iron, 0.1, 0, 0, k * Math.PI / 3, 0, 0);
    KB.add(cyl(0.035, 0.035, 0.22, 6, 0), darkWood, 0.2, 0.2, 0, 0, 0, Math.PI / 2);
    KB.build();
    rod(B, [TOWER.x + TOWER.s / 2, roofY + 1.05, TOWER.z], [TOWER.x + TOWER.s / 2, roofY + TOWER.h, TOWER.z], 0.03, iron);   // the shaft up to the ring
  }

  // Kesh's windsock on the roof's north-west corner: the wide mouth looks into the wind, the tail streams away
  const sockP = { x: X0 + 0.14, y: roofY + 0.5 + 1.9, z: Z1 - 0.14 };
  rod(B, [sockP.x, roofY + 0.5, sockP.z], [sockP.x, sockP.y + 0.18, sockP.z], 0.035, darkWood);
  const sock = new THREE.Group(); sock.position.set(sockP.x, sockP.y, sockP.z); group.add(sock);
  {
    const sg = new THREE.CylinderGeometry(0.1, 0.26, 1.3, 12, 1, true).rotateZ(-Math.PI / 2).translate(0.75, 0, 0);
    sock.add(new THREE.Mesh(sg, cloth('ksock', ['#d84a2a', '#f4e8d0'], 5, false)));
    const SK = new Batch(sock); SK.add(new THREE.TorusGeometry(0.26, 0.022, 6, 16).rotateY(Math.PI / 2), iron, 0.1, 0, 0); SK.add(bbox(0.12, 0.03, 0.03, 0.005, 1), iron, 0.04, 0, 0); SK.build();
  }
  // dust and sand blown about by the cool room (sand into the mouth and out of the door; motes out of the door
  // once it draws), so it shows from the roof as well as the porch
  const puffs = makePuffs(group, 96);
  const MOUTH = { x: TOWER.x - 1.5, y: roofY + TOWER.h + 1.25, z: TOWER.z };   // (just upwind of the mouth, above its hood)
  let puffT = 0, inT = 0, motesT = 0;

  // state, and its animation
  let ang = 2 * Math.PI / 2, goal = ang, drawing = false, t = 0;
  out.cool = {
    door: W(DOOR.x, Z1 + 0.9), crank: W(crank.position.x, crank.position.z), use: { ...W(crank.position.x + 0.75, TOWER.z), a: -Math.PI / 2 },
    roofY, stairFoot: W(STAIR.x, STAIR.z0 + 0.8), stairMid: W(STAIR.x, STAIR.z0 - STAIR.n * STAIR.deep * 0.6), roof: W(COOL.x + 1.2, COOL.z), sani: { ...W(DOOR.x - 1.4, Z1 + 0.7), a: 0.2, anim: 'kneelWork' }, mouth: null, dir: 2,
    setDir(d, snap = false) {
      const prev = this.dir; this.dir = ((d % 4) + 4) % 4;
      if (snap) { ang = goal = this.dir * Math.PI / 2; cowl.rotation.y = ang; }
      else goal += (((this.dir - prev) % 4) + 4) % 4 * Math.PI / 2;
    },
    turning() { return Math.abs(goal - ang) > 0.01; },
    setScreen(s) { torn.visible = s !== 'fitted'; fitted.visible = s === 'fitted'; },
    setDrawing(b) { drawing = !!b; },
    setJars(n) { for (const [g, k1] of jars) g.visible = k1 <= n; },
    setSand(b) { sandPile.visible = !!b; },
    setDates(b) { dates.visible = !!b; },
    // the moment the cowl takes the wind with no screen: sand down the tower and out of the door at once
    gust() { sandIn(12); sandOut(12); puffT = 0.8; },
    sock: { ...W(sockP.x, sockP.z), y: sockP.y },
  };
  out.cool.setDir(2, true);
  // sand: whipped off the dune into the mouth (from above its lid, so it shows from behind the cowl too) …
  const sandIn = (n) => { for (let i = 0; i < n; i++) puffs.emit(MOUTH.x - Math.random() * 1.4, MOUTH.y + Math.random() * 0.6, MOUTH.z + (Math.random() - 0.5) * 1.5, 2.4 + Math.random() * 0.8, -1.4 - Math.random() * 0.6, 0, 0.42, 0.6, '#c08a4c', 1); };
  // … and blown out of the door, rising past the awning and drifting downwind
  const sandOut = (n) => { for (let i = 0; i < n; i++) puffs.emit(DOOR.x + (Math.random() - 0.5) * 1.0, gy + 0.3 + Math.random() * 1.2, Z1 + 0.5, (Math.random() - 0.2) * 0.8, 1.1 + Math.random() * 0.9, 1.6 + Math.random() * 1.2, 0.8, 2.4, '#b88850', 0.95); };
  // once it draws: a few pale motes out of the door, low
  const motes = () => { for (let i = 0; i < 3; i++) puffs.emit(DOOR.x + (Math.random() - 0.5) * 0.9, gy + 0.4 + Math.random() * 1.2, Z1 + 0.4, (Math.random() - 0.3) * 0.5, 0.25, 1.4 + Math.random() * 0.6, 0.45, 1.8, '#fff6e0', 0.55); };
  updaters.push((dt) => {
    t += dt;
    if (Math.abs(goal - ang) > 1e-3) { const step = Math.min(Math.abs(goal - ang), dt * 1.4); ang += Math.sign(goal - ang) * step; cowl.rotation.y = ang; crank.rotation.x -= step * 6; }
    // the wind down the tower: the streamer streams in, the curtain lifts out, the screen's tails lift in the lee
    if (drawing) { streamer.rotation.z = 1.35 + Math.sin(t * 9) * 0.12; curtain.rotation.x = -0.5 - Math.abs(Math.sin(t * 2.3)) * 0.14; }
    else { streamer.rotation.z = Math.sin(t * 1.3) * 0.08; curtain.rotation.x = Math.sin(t * 0.7) * 0.015; }
    for (const [i, tl] of tails.entries()) tl.rotation.z = (drawing ? 0.55 : 0.12) + Math.sin(t * 6.1 + i * 1.9) * (drawing ? 0.12 : 0.05);
    torn.children[0].rotation.x = Math.sin(t * 5.2) * 0.25;
    // the windsock: steady from the west, a little restless
    sock.rotation.y = Math.sin(t * 1.7) * 0.07; sock.rotation.z = -0.06 + Math.sin(t * 2.9) * 0.04;
    // sand while the bare mouth faces the wind; motes while it draws
    const intoWind = out.cool.dir === 0 && !out.cool.turning();
    if (sandPile.visible && intoWind) {
      inT -= dt; if (inT <= 0) { inT = 0.12; sandIn(3); }
      puffT -= dt; if (puffT <= 0) { puffT = 0.5; sandOut(4); }
    }
    else if (drawing) { motesT -= dt; if (motesT <= 0) { motesT = 0.6; motes(); } }
    puffs.update(dt);
  });

  // ================================================================ Lumi's loom under her sail
  {
    const lx = LUMI.x + Math.sin(LUMI.a) * 0.85, lz = LUMI.z + Math.cos(LUMI.a) * 0.85, ly = H(lx, lz);
    const g = new THREE.Group(); g.position.set(lx, ly, lz); g.rotation.y = LUMI.a; group.add(g);
    const LB = new Batch(g);
    for (const s of [-1, 1]) { LB.add(bbox(0.08, 1.75, 0.08, 0.015, 1), darkWood, s * 0.72, 0.875, 0); LB.add(bbox(0.08, 0.06, 0.6, 0.01, 1), darkWood, s * 0.72, 0.03, 0); }
    for (const y of [0.2, 0.86, 1.68]) LB.add(cyl(0.035, 0.035, 1.5, 8, 0), wood, 0, y, 0, 0, 0, Math.PI / 2);
    LB.add(bbox(0.36, 0.04, 0.06, 0.01, 1), wood, 0.2, 0.9, 0.05);   // the shuttle
    LB.build();
    const web = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 1.46), new THREE.MeshStandardMaterial({ map: loomTex(), transparent: true, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.9 }));
    web.position.set(0, 0.95, 0); g.add(web);
    col({ type: 'box', x: lx, z: lz, hw: 0.78, hd: 0.2, rot: LUMI.a, top: ly + 1.75, noStand: true, seeThrough: true });
    out.loom = W(lx, lz);
    // a basket of dyed wool beside it
    B.add(lathe([[0.01, 0], [0.22, 0.01], [0.26, 0.24], [0.27, 0.26]], 12, 0), pm('#b8904a', 0.95), lx + 0.9, ly, lz - 0.7);
    for (const [c, dx] of [['#c8452f', -0.08], ['#2f7a9a', 0.08], ['#e8b84a', 0]]) B.add(new THREE.SphereGeometry(0.1, 8, 6), pm(c, 0.95), lx + 0.9 + dx, ly + 0.27, lz - 0.7 + (dx ? 0 : 0.1));
    // the sail: three poles, a striped triangle sagging in the middle
    const P = SAIL.map(([x, z, h]) => [x, H(x, z) + h, z]);
    for (const [x, y, z] of P) {
      rod(B, [x, H(x, z), z], [x, y + 0.1, z], 0.045, wood);
      col({ type: 'cyl', x, z, r: 0.07, top: y, noStand: true, seeThrough: true, camR: -0.3 });
    }
    const c = P.reduce((a, p) => [a[0] + p[0] / 3, a[1] + p[1] / 3 - 0.08, a[2] + p[2] / 3], [0, 0, 0]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([...P[0], ...P[1], ...P[2], ...c], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 3, 0, 1.5, 3, 1.5, 1], 2));
    geo.setIndex([0, 1, 3, 1, 2, 3, 2, 0, 3]); geo.computeVertexNormals();
    const tex = stripes('ksail', ['#e86a3a', '#f4e8d0'], 2, true);
    const sail = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9, transparent: true, opacity: 0.82 }));
    sail.castShadow = true; group.add(sail);
    for (const [x, y, z] of P) B.add(cyl(0.012, 0.012, 0.6, 4, 0), rope, x, y - 0.2, z, 0.3, 0, 0);
  }
  out.lumi = { ...W(LUMI.x, LUMI.z), a: LUMI.a, anim: 'tinker' };

  // ================================================================ the sand screens on the windward side
  {
    const mat = new THREE.MeshStandardMaterial({ map: reedTex(), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.95 });
    const SB = new Batch(group);   // (all the panels in one draw)
    for (const s of SCREENS) {
      const [a, b] = s, L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 2.0), ry = -Math.atan2(b[1] - a[1], b[0] - a[0]);
      for (let i = 0; i <= n; i++) { const x = a[0] + (b[0] - a[0]) * i / n, z = a[1] + (b[1] - a[1]) * i / n; B.add(cyl(0.05, 0.06, 1.75, 6, 0), darkWood, x, H(x, z) + 0.75, z); }
      for (let i = 0; i < n; i++) {
        const t0 = (i + 0.5) / n, x = a[0] + (b[0] - a[0]) * t0, z = a[1] + (b[1] - a[1]) * t0, y = H(x, z);
        SB.add(new THREE.PlaneGeometry(L / n, 1.5), mat, x, y + 0.7, z, 0, ry, 0);
        col({ type: 'box', x, z, hw: L / n / 2, hd: 0.08, rot: ry, top: y + 1.5, noStand: true, seeThrough: true });
      }
    }
    SB.build();
  }

  // ================================================================ Hesk's flag poles and yacht stop
  {
    // the rags: one mesh for all of them (a strip of 4 segments each, its free end waving), coloured per rag
    const PTS = polePoints(), SEG = 4, cols = ['#d84a2a', '#e8a030', '#2f7a9a'].map((c) => new THREE.Color(c));
    const NR = PTS.length + ragAt.length;
    const pos = new Float32Array(NR * (SEG + 1) * 2 * 3), colr = new Float32Array(pos.length), idx = [], roots = [];
    [...PTS.map(([x, z]) => [x, null, z]), ...ragAt].forEach(([x, ry0, z], i) => {
      if (ry0 == null) {
        const y = H(x, z);
        B.add(cyl(0.04, 0.05, 2.7, 6, 0), darkWood, x, y + 1.35, z);
        col({ type: 'cyl', x, z, r: 0.08, top: y + 2.7, noStand: true, seeThrough: true, camR: -0.3 });
        roots.push([x, y + 2.5, z, i * 1.7]);
      } else roots.push([x, ry0, z, i * 1.7]);
      const v0 = i * (SEG + 1) * 2;
      for (let k = 0; k <= SEG; k++) for (let e = 0; e < 2; e++) cols[i % 3].toArray(colr, (v0 + k * 2 + e) * 3);
      for (let k = 0; k < SEG; k++) { const a = v0 + k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    });
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); fg.setAttribute('color', new THREE.BufferAttribute(colr, 3)); fg.setIndex(idx);
    const rags = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85 }));
    rags.frustumCulled = false; group.add(rags);
    out.poles = PTS.map(([x, z]) => W(x, z));
    // the rags stream downwind (east: +x), the free end waving most
    const wave = (time) => {
      for (const [i, [x, y, z, ph]] of roots.entries()) for (let k = 0; k <= SEG; k++) {
        const t = k / SEG, w = Math.sin(time * 5.2 + ph - t * 2.6) * 0.16 * t, v = (i * (SEG + 1) + k) * 2;
        for (let e = 0; e < 2; e++) { const o = (v + e) * 3; pos[o] = x + t * 0.8; pos[o + 1] = y + (e ? 0.19 : -0.19) - t * 0.06; pos[o + 2] = z + w; }
      }
      fg.attributes.position.needsUpdate = true; fg.computeVertexNormals();
    };
    wave(0);
    updaters.push((dt, time) => wave(time));
    // the yacht stop
    const { x, z } = BOARD, y = H(x, z), ry = Math.atan2(-0.91, -0.41);
    const fr = (lx) => [x + Math.cos(ry) * lx, z - Math.sin(ry) * lx];
    for (const s of [-0.95, 0.95]) { const [px, pz] = fr(s); B.add(cyl(0.05, 0.05, 2.3, 6, 0), darkWood, px, y + 1.15, pz); col({ type: 'cyl', x: px, z: pz, r: 0.08, top: y + 2.1, noStand: true, seeThrough: true, camR: -0.3 }); }
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.05), new THREE.MeshStandardMaterial({ map: signTex(['YACHT STOP', 'CAMP · DIG · KESH', 'FERRY: AT THE PIER'], '#2f6a7a', '#f2e6c8', 256, 128), roughness: 0.8 }));
    bm.position.set(x, y + 1.7, z); bm.rotation.y = ry; group.add(bm);
    B.add(bbox(2.16, 1.11, 0.04, 0.01, 1), plank, x - Math.sin(ry) * 0.03, y + 1.7, z - Math.cos(ry) * 0.03, 0, ry, 0);   // (its plank back)
    const chalk = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.05), new THREE.MeshBasicMaterial({ map: chalkTex(), transparent: true, depthWrite: false }));
    chalk.position.set(x + Math.sin(ry) * 0.02, y + 1.7, z + Math.cos(ry) * 0.02); chalk.rotation.y = ry; chalk.visible = false; group.add(chalk);
    // the slate, hung on two cords from the board's bottom edge
    const slate = new THREE.Group(); slate.position.set(x + Math.sin(ry) * 0.04, y + 0.78, z + Math.cos(ry) * 0.04); slate.rotation.y = ry; slate.visible = false; group.add(slate);
    { const s = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.75), new THREE.MeshStandardMaterial({ map: slateTex(), roughness: 0.9 })); slate.add(s);
      const SB2 = new Batch(slate); SB2.add(bbox(1.62, 0.77, 0.03, 0.005, 1), darkWood, 0, 0, -0.02);
      for (const sx of [-0.6, 0.6]) SB2.add(cyl(0.012, 0.012, 0.06, 4, 0), rope, sx, 0.4, -0.01); SB2.build(); }
    out.board = { ...W(x, z), setFerry(on) { chalk.visible = slate.visible = !on; } };
    out.drift = W(DRIFT.x, DRIFT.z);
  }

  B.build();
  void ox; void oz;
  return out;
}
