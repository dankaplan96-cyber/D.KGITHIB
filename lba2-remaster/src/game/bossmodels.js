// The two bosses' own bodies (POLISH-AUDIT #3). Both used to be the small gold warden drone scaled up; from the
// play camera each read as "a small gold ball". They keep the drone's rig contract (root, play(anim), hitFlash(),
// update(dt), mood, ko — death.js drives the knock-out pose through it), so enemies.js changes nothing of the
// fights' timing: only what is drawn changes.
//
//  - Guardian (chapter 12, the core's last defence): a heavy armoured sentinel. A dark steel keel and a dome shell
//    of three armour petals hinged at the belt, a lens at the front, a chin cannon between two emitter arms, three
//    gyro rings turning about it, three crown ribs with a lamp each. The tells are all on the body:
//      wind-up   the petals fold open, showing the glowing core; the lens and core heat to white; the rings spin up
//                and the arms swing in on the cannon, whose glow grows (the fan's floor markers are in enemies.js)
//      stunned   the lens dims to a dull teal, the petals hang open unevenly, the rings stop and sag, it flickers
//      phases    one ring comes off for each converted pylon (3 → 0), and a lamp on the crown turns from dull red
//                to cyan for each (the HUD's n/3); the glow runs hotter (amber → red) as it gets quicker; the
//                overload (level 4) brings the rings back, the glow turns violet like Vesk's coil
//  - Hauler (chapter 7's heavy drone): a blocky armoured freight drone: slate body, teal deck plates, an orange
//    prow bumper with hazard bars, twin rotors on side pods, a winch and hook, two prods at the bumper; a ringed
//    amber power cell on the deck is the weak spot (it brightens and sparks as the hull takes damage).
// Geometry: merged per part (kit.js compose), existing material types only (vertex-coloured / plain standard and
// basic), so nothing here compiles a shader the game does not already have. Built once and shared.
import * as THREE from 'three';
import { mergeGeos, bbox, tint, lathe, cyl } from './kit.js';
import { clamp, damp } from '../engine/math.js';

const _Y = new THREE.Vector3(0, 1, 0);
const m4 = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(sx, sy, sz));
const put = (list, geo, color, x, y, z, rx, ry, rz, sx, sy, sz) => list.push([tint(geo, color), m4(x, y, z, rx, ry, rz, sx, sy, sz)]);
const rod = (list, a, b, r1, r2, color, seg = 8) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
  const g = new THREE.CylinderGeometry(r2, r1, L, seg, 1);
  list.push([tint(g, color), new THREE.Matrix4().compose(A.clone().add(B).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(_Y, d.normalize()), new THREE.Vector3(1, 1, 1))]);
};
const paint = (geo, fn) => {
  const p = geo.attributes.position, c = geo.attributes.color, col = new THREE.Color();
  for (let i = 0; i < p.count; i++) { col.setRGB(c.getX(i), c.getY(i), c.getZ(i)); fn(p.getX(i), p.getY(i), p.getZ(i), col); c.setXYZ(i, col.r, col.g, col.b); }
  return geo;
};
const flat = (g) => { const n = g.index ? g.toNonIndexed() : g; n.computeVertexNormals(); return n; };   // hard-surface facets without a flat-shading material (a new shader program)
const vmat = (rough, metal) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: metal });
const mesh = (geo, mat, parent, cast = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; parent.add(m); return m; };
const _c = new THREE.Color(), _d = new THREE.Color();

// ================================================================== the guardian
const PETALS = [0, Math.PI * 2 / 3, Math.PI * 4 / 3];      // azimuths (from +z toward +x); the ribs stand between them (the front is a petal: the lens sits below it)
const RIBS = [Math.PI / 3, Math.PI, Math.PI * 5 / 3];
const HINGE_R = 0.94;
const SIZE = 1.3;     // (the model is drawn at 1.3: the dome's radius then matches its hit radius of 1.4, the ribs' lamps its 4.2 m hit height)
const RINGS = [{ r: 1.2, tube: 0.07, col: '#b08a3c', tilt: [0, 0], w: 0.9 }, { r: 1.38, tube: 0.06, col: '#6a98a6', tilt: [0.7, 0], w: -1.35 }, { r: 1.56, tube: 0.05, col: '#9a7a38', tilt: [0, -0.7], w: 1.7 }];
// the glow's colours: by level (0..3 pylons converted: it runs hotter as it gets quicker; 4: Vesk's overload)
const HEAT = ['#ffa83a', '#ff7e2e', '#ff4f2a', '#ff3030', '#b878ff'];
const ringsFor = (lv) => (lv >= 4 ? 3 : 3 - clamp(lv, 0, 3));

let GG = null;
function guardianGeos() {
  if (GG) return GG;
  const hull = [];
  // keel: a faceted bowl, a brass belt with hazard lugs, ribbed rear fins
  put(hull, flat(lathe([[0.001, -1.0], [0.2, -0.93], [0.52, -0.72], [0.82, -0.4], [0.94, -0.1]], 8)), '#3a4a58', 0, 0, 0);
  put(hull, new THREE.TorusGeometry(HINGE_R, 0.1, 8, 24).rotateX(Math.PI / 2), '#b8903f', 0, -0.03, 0);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; put(hull, bbox(0.26, 0.15, 0.17, 0.03), i % 2 ? '#e0a530' : '#242c33', Math.sin(a) * 1.0, -0.03, Math.cos(a) * 1.0, 0, a, 0); }
  for (let i = 0; i < 3; i++) { const a = Math.PI + (i - 1) * 0.55; put(hull, bbox(0.1, 0.5, 0.42, 0.03), '#222a31', Math.sin(a) * 0.62, -0.5, Math.cos(a) * 0.62, -0.5, a, 0); }
  // the lens housing, its brow and the chin cannon
  put(hull, new THREE.TorusGeometry(0.36, 0.075, 8, 20), '#c29a45', 0, -0.1, 0.99);
  put(hull, new THREE.SphereGeometry(0.1, 8, 6), '#101417', 0, -0.1, 1.1, 0, 0, 0, 1, 1, 0.45);   // the pupil: stays dark while the lens heats
  put(hull, cyl(0.13, 0.17, 0.55, 10).rotateX(Math.PI / 2), '#1d252c', 0, -0.74, 0.9);
  put(hull, new THREE.TorusGeometry(0.15, 0.035, 6, 12), '#d4ad55', 0, -0.74, 1.18);
  for (const s of [-1, 1]) put(hull, new THREE.SphereGeometry(0.15, 8, 6), '#b8903f', s * 0.6, -0.55, 0.16);
  // the three crown ribs, one lamp stalk at the top of each
  for (const a of RIBS) {
    rod(hull, [Math.sin(a) * 0.98, -0.05, Math.cos(a) * 0.98], [Math.sin(a) * 1.12, 1.16, Math.cos(a) * 1.12], 0.09, 0.05, '#34444f', 6);
    put(hull, new THREE.SphereGeometry(0.1, 8, 6), '#c29a45', Math.sin(a) * 1.13, 1.06, Math.cos(a) * 1.13);
    put(hull, new THREE.TorusGeometry(0.1, 0.025, 6, 10).rotateX(Math.PI / 2), '#c29a45', Math.sin(a) * 1.06, 0.45, Math.cos(a) * 1.06);
  }
  const hullGeo = mergeGeos(hull, true);
  // one armour petal of the dome (100° wide, a 20° gap to the next), hinged at the belt: the outer skin and a burnt-orange inner skin
  const dome = [[HINGE_R, 0.0], [1.04, 0.3], [0.88, 0.66], [0.5, 0.92], [0.001, 1.04]];
  const inner = dome.map(([r, y]) => [Math.max(0.001, r - 0.08), y - 0.02]).reverse();
  const half = (50 * Math.PI) / 180;
  const skin = (pts, color) => tint(flat(lathe(pts, 5, 0, -half, half * 2)), color).translate(0, 0, -HINGE_R);
  const petal = mergeGeos([[paint(skin(dome, '#58798a'), (x, y, z, c) => { c.offsetHSL(0, 0, y * 0.07); if (Math.abs(Math.atan2(x, z + HINGE_R)) > half * 0.84) c.multiplyScalar(0.7); }), new THREE.Matrix4()], [skin(inner, '#c0501c'), new THREE.Matrix4()]], true);
  // a gyro ring (horizontal, its own axis up) with four dark lugs
  const ring = (R) => {
    const l = [];
    l.push([tint(new THREE.TorusGeometry(R.r, R.tube, 6, 36).rotateX(Math.PI / 2), R.col), new THREE.Matrix4()]);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; put(l, bbox(0.18, 0.2, 0.2, 0.03), '#232b32', Math.sin(a) * R.r, 0, Math.cos(a) * R.r, 0, a, 0); }
    return mergeGeos(l, true);
  };
  const rings = RINGS.map(ring);
  // the emitter arms (+x and -x): shoulder, forearm, a three-prong tip; they hang forward beside the cannon
  const arm = (s) => {
    const l = [];
    rod(l, [0, 0, 0], [s * 0.18, -0.1, 0.42], 0.1, 0.075, '#2b343c');
    rod(l, [s * 0.18, -0.1, 0.42], [s * 0.1, -0.2, 0.86], 0.075, 0.055, '#323d46');
    put(l, new THREE.SphereGeometry(0.09, 8, 6), '#c29a45', s * 0.18, -0.1, 0.42);
    for (const dx of [-0.07, 0, 0.07]) rod(l, [s * 0.1 + dx, -0.2, 0.86], [s * 0.1 + dx * 0.4, -0.22, 1.12], 0.035, 0.008, '#e0bc60', 5);
    return mergeGeos(l, true);
  };
  // the glow (core + lens, one emissive mesh)
  const gl = [];
  put(gl, new THREE.SphereGeometry(0.62, 14, 10), '#ffffff', 0, 0.32, 0);
  put(gl, new THREE.SphereGeometry(0.27, 12, 8), '#ffffff', 0, -0.1, 0.99, 0, 0, 0, 1, 1, 0.5);
  GG = { hull: hullGeo, petal, rings, armL: arm(1), armR: arm(-1), glow: mergeGeos(gl, true), pip: new THREE.SphereGeometry(0.15, 10, 8), spark: new THREE.SphereGeometry(0.2, 10, 8), tint: undefined };
  return GG;
}

export function createGuardianRig() {
  const G = guardianGeos();
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  root.scale.setScalar(SIZE);
  const hullM = vmat(0.42, 0.35);
  const glowM = new THREE.MeshStandardMaterial({ color: '#2a2020', emissive: HEAT[0], emissiveIntensity: 2.4, roughness: 0.2 });
  const pipOn = new THREE.MeshStandardMaterial({ color: '#2a3a44', emissive: '#5fe8ff', emissiveIntensity: 3, roughness: 0.2 });
  const pipOff = new THREE.MeshStandardMaterial({ color: '#2a1c1c', emissive: '#7a1c10', emissiveIntensity: 0.9, roughness: 0.4 });
  const sparkM = new THREE.MeshBasicMaterial({ color: '#ffd8a0', transparent: true, opacity: 0, depthWrite: false });
  mesh(G.hull, hullM, body);
  const glow = mesh(G.glow, glowM, body, false);
  // the dome: three petals, each on a hinge at the belt rim
  const petals = PETALS.map((a) => {
    const h = new THREE.Group(); h.rotation.y = a; body.add(h);
    const hinge = new THREE.Group(); hinge.position.set(0, 0, HINGE_R); h.add(hinge);
    mesh(G.petal, hullM, hinge);
    return hinge;
  });
  // the rings: a tilt group each (fixed axis), the ring spinning in it
  const ringTilt = RINGS.map((R) => { const t = new THREE.Group(); t.rotation.set(R.tilt[0], 0, R.tilt[1]); body.add(t); return t; });
  const ringSpin = G.rings.map((g, i) => { const s = new THREE.Group(); ringTilt[i].add(s); mesh(g, hullM, s); return s; });
  const pips = RIBS.map((a) => { const p = new THREE.Mesh(G.pip, pipOff); p.position.set(Math.sin(a) * 1.13, 1.22, Math.cos(a) * 1.13); p.scale.setScalar(0.8); body.add(p); return p; });
  const arms = [[1, G.armL], [-1, G.armR]].map(([s, g]) => { const a = new THREE.Group(); a.position.set(s * 0.6, -0.55, 0.16); body.add(a); mesh(g, hullM, a); a.userData.s = s; return a; });
  const spark = new THREE.Mesh(G.spark, sparkM); spark.position.set(0, -0.74, 1.28); body.add(spark);

  const heat = new THREE.Color(HEAT[0]);
  const rig = {
    root, anim: 'idle', t: 0, flash: 0, actionT: 0, mood: 'alert', level: 0, k: 0,
    open: 0, rel: 0, stunA: 0, ringS: [1, 1, 1], ringW: [0, 0, 0], pipLit: -1,
    play(a) {
      if (a === this.anim) return;
      if (this.anim === 'windup') this.rel = 1;            // the release: plates snap shut, the cannon flashes
      if (a === 'hurt') this.rel = 0;
      this.anim = a; this.actionT = 0;
    },
    hitFlash() { this.flash = 1; },
    setLevel(n) { this.level = n; },
    update(dt) {
      this.t += dt; this.actionT += dt;
      const t = this.t, lv = this.level;
      // ---- knocked out (death.js): the rings run down, the dome hangs open, the glow goes out
      if (this.anim === 'dead' && this.ko) {
        const K = this.ko;
        body.rotation.x = K.rx; body.rotation.z = K.rz;
        body.position.y = damp(body.position.y, 0, 10, dt); body.position.z = 0;
        petals.forEach((p, i) => { p.rotation.x = damp(p.rotation.x, 1.0 + i * 0.12, 5, dt); });
        ringSpin.forEach((s, i) => { s.rotation.y += dt * RINGS[i].w * 5 * K.rotor; });
        arms.forEach((a) => { a.rotation.x = damp(a.rotation.x, 0.7, 5, dt); });
        sparkM.opacity = 0;
        this.flash = Math.max(0, this.flash - dt * 4);
        glowM.emissiveIntensity = 2.4 * (1 - K.dim) + 0.05 + this.flash * 3;
        hullM.emissive.setRGB(this.flash * 0.8, this.flash * 0.8, this.flash * 0.8);
        return;
      }
      const wind = this.anim === 'windup', stun = this.anim === 'hurt';
      const k = wind ? clamp(this.k || this.actionT / 1.3, 0, 1) : 0;
      this.rel = Math.max(0, this.rel - dt * 3.2);
      this.stunA = damp(this.stunA, stun ? 1 : 0, stun ? 9 : 4, dt);
      const sa = this.stunA;
      // ---- the dome: closed at rest, folding open through the wind-up, snapping shut at the release, hanging loose when stunned
      const openT = wind ? 0.18 + 0.95 * k : 0;
      this.open = damp(this.open, openT, this.rel > 0.5 ? 18 : wind ? 10 : 7, dt);
      petals.forEach((p, i) => {
        const hang = 0.95 + [0.0, 0.28, -0.22][i] + Math.sin(t * 2.3 + i * 2) * 0.05;
        p.rotation.x = this.open * (1 - sa) + hang * sa * 0.85 + (wind ? Math.sin(t * 46 + i) * 0.025 * k : 0);
      });
      // ---- the rings: one comes off per converted pylon (0 → 3 rings … 3 pylons → none; the overload brings them back)
      const want = ringsFor(lv), spin = wind ? 1 + 3.2 * k : 1 - sa, lvMul = 1 + (lv >= 4 ? 0.5 : lv * 0.12);
      RINGS.forEach((R, i) => {
        this.ringW[i] = damp(this.ringW[i], R.w * spin * lvMul, stun ? 2.2 : 5, dt);
        ringSpin[i].rotation.y += this.ringW[i] * dt;
        this.ringS[i] = damp(this.ringS[i], i < want ? 1 : 0, 6, dt);
        const sc = this.ringS[i]; ringTilt[i].scale.setScalar(Math.max(0.001, sc)); ringTilt[i].visible = sc > 0.03;
        // stunned: the rings sag to one side and wobble as they lose their drive
        ringTilt[i].rotation.set(R.tilt[0] * (1 - 0.8 * sa) + sa * 0.12 * Math.sin(t * 3 + i), 0, R.tilt[1] * (1 - 0.8 * sa) + sa * 0.1 * Math.sin(t * 2.1 + i * 2) + Math.sin(t * 1.3 + i) * 0.03);
      });
      // ---- the arms: splayed at rest, swinging in on the cannon (and its barrels up) in the wind-up, limp when stunned
      arms.forEach((a, i) => {
        const s = a.userData.s;
        a.rotation.y = s * (0.2 - 0.62 * (wind ? k : 0)) * (1 - sa) + s * 0.55 * sa;
        a.rotation.x = (0.08 + Math.sin(t * 1.4 + i) * 0.05 - 0.42 * (wind ? k : 0)) * (1 - sa) + 0.62 * sa;
      });
      // ---- the body: a slow bob, a shiver in the charge, a kick back at the release, a slump and a roll when stunned
      body.position.y = Math.sin(t * 1.8) * 0.07 * (1 - sa) - sa * 0.12;
      body.position.z = -0.22 * this.rel + (wind ? -0.05 * k : 0);
      body.rotation.z = Math.sin(t * 1.1) * 0.035 * (1 - sa) + sa * (0.1 + Math.sin(t * 17) * 0.05) + (wind ? Math.sin(t * 52) * 0.012 * k : 0);
      body.rotation.x = sa * 0.12 - 0.05 * this.rel;
      // ---- the glow: the phase colour; white-hot and swelling through the charge; a dull teal stub when stunned
      this.flash = Math.max(0, this.flash - dt * 4);
      heat.set(HEAT[clamp(lv, 0, 4)]);
      _d.copy(heat);
      if (wind) _d.lerp(_c.set('#ffe0a0'), Math.pow(k, 1.4) * 0.6);
      _d.lerp(_c.set('#4d6a78'), sa);
      glowM.emissive.lerp(_d, 1 - Math.exp(-dt * 12));
      const flick = stun ? (Math.sin(t * 37) > 0.78 || Math.sin(t * 23 + 1) > 0.92 ? 1.6 : 0) : 0;
      glowM.emissiveIntensity = (1.7 + (lv >= 4 ? 0.3 : 0)) * (1 - sa) + sa * (0.3 + flick) + (wind ? (0.8 + 1.7 * k + Math.sin(t * 34) * 0.3 * k) : 0) + this.rel * 2.5 + this.flash * 3;
      glow.scale.setScalar(1 + (wind ? 0.06 * k : 0) + this.rel * 0.05);
      hullM.emissive.setRGB(this.flash * 0.8, this.flash * 0.8, this.flash * 0.8);
      // ---- the muzzle glow: grows through the charge, one white flash at the release
      sparkM.opacity = wind ? 0.25 + 0.6 * k + Math.sin(t * 50) * 0.12 * k : this.rel * 0.85;
      sparkM.color.set(wind ? '#ffd8a0' : '#fff4e0');
      spark.scale.setScalar(wind ? 0.5 + 1.5 * k : 2.1 - 0.9 * this.rel);
      // ---- the crown lamps: cyan for each converted pylon (violet in the overload), dull red for the rest
      const lit = lv >= 4 ? 3 : clamp(lv, 0, 3);
      if (lit !== this.pipLit) { this.pipLit = lit; pips.forEach((p, i) => { p.material = i < lit ? pipOn : pipOff; }); pipOn.emissive.set(lv >= 4 ? '#b070ff' : '#5fe8ff'); }
      pipOn.emissiveIntensity = 3 + Math.sin(t * 6) * 0.6; pipOff.emissiveIntensity = 0.9 + (wind ? Math.sin(t * 20) * 0.35 * k : 0);
    },
  };
  rig.j = {};
  rig.parts = { petals, ringSpin, arms, glowM, pips };
  return rig;
}

// ================================================================== the hauler (chapter 7's heavy drone)
let HG = null;
function haulerGeos() {
  if (HG) return HG;
  const h = [];
  put(h, bbox(0.64, 0.3, 1.0, 0.08), '#46515b', 0, 0, 0);
  put(h, bbox(0.74, 0.12, 0.78, 0.05), '#3d6a6f', 0, 0.2, -0.02);
  for (const z of [-0.3, 0.26]) put(h, bbox(0.78, 0.03, 0.07, 0.01), '#d09a30', 0, 0.265, z);
  put(h, bbox(0.84, 0.25, 0.14, 0.05), '#c4742a', 0, -0.03, 0.57);
  for (const x of [-0.3, -0.1, 0.1, 0.3]) put(h, bbox(0.06, 0.2, 0.02, 0.005), '#1e2328', x, -0.03, 0.645, 0, 0, 0.5);
  for (const s of [-1, 1]) {
    put(h, bbox(0.2, 0.3, 0.72, 0.06), '#56606a', s * 0.42, 0, 0);
    put(h, bbox(0.04, 0.32, 0.6, 0.02), '#3d6a6f', s * 0.54, 0.0, 0.02);
    rod(h, [s * 0.55, 0.12, 0.0], [s * 0.55, 0.36, 0.0], 0.07, 0.05, '#2a3036');
    put(h, new THREE.SphereGeometry(0.06, 8, 6), '#c8a050', s * 0.55, 0.37, 0);
    put(h, bbox(0.14, 0.1, 0.2, 0.03), '#2a3036', s * 0.3, -0.17, 0.3);   // prod mounts
  }
  put(h, bbox(0.36, 0.2, 0.24, 0.05), '#2c343b', 0, 0.03, -0.58);
  put(h, cyl(0.07, 0.09, 0.14, 8).rotateX(Math.PI / 2), '#1c2227', 0, 0.03, -0.74);
  // winch drum, cable and hook under the belly
  put(h, cyl(0.09, 0.09, 0.42, 10).rotateZ(Math.PI / 2), '#c8a050', 0, -0.2, 0.0);
  rod(h, [0, -0.2, 0], [0, -0.5, 0], 0.012, 0.012, '#20262b', 4);
  put(h, new THREE.TorusGeometry(0.05, 0.014, 6, 10, Math.PI * 1.5), '#c8a050', 0, -0.55, 0, 0, 0, 0.8);
  // the weak spot's cage: a ring and four posts round the amber cell
  put(h, new THREE.TorusGeometry(0.19, 0.03, 6, 18).rotateX(Math.PI / 2), '#ff8a1a', 0, 0.285, -0.1);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; put(h, bbox(0.04, 0.07, 0.04, 0.01), '#2a3036', Math.sin(a) * 0.19, 0.27, -0.1 + Math.cos(a) * 0.19); }
  const hull = mergeGeos(h, true);
  const blades = [];
  for (let i = 0; i < 3; i++) put(blades, new THREE.BoxGeometry(0.86, 0.014, 0.09), i % 2 ? '#2a3036' : '#3a4249', 0, 0, 0, 0, (i / 3) * Math.PI, 0);
  put(blades, new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8), '#c8a050', 0, 0.02, 0);
  const rotor = mergeGeos(blades, true);
  const pr = [];
  rod(pr, [0, 0, 0], [0, -0.04, 0.32], 0.035, 0.02, '#2a3036', 6);
  rod(pr, [0, -0.04, 0.32], [0, -0.06, 0.46], 0.02, 0.006, '#e0bc60', 5);
  HG = { hull, rotor, prod: mergeGeos(pr, true), cell: new THREE.CylinderGeometry(0.15, 0.15, 0.035, 14), visor: new THREE.BoxGeometry(0.5, 0.06, 0.03), disc: new THREE.CircleGeometry(0.43, 20).rotateX(-Math.PI / 2), spark: new THREE.SphereGeometry(0.07, 8, 6) };
  return HG;
}

export function createHaulerRig() {
  const G = haulerGeos();
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const hullM = vmat(0.4, 0.4);
  const visorM = new THREE.MeshStandardMaterial({ color: '#9ff4ff', emissive: '#30d0ff', emissiveIntensity: 2.5, roughness: 0.1 });
  const cellM = new THREE.MeshStandardMaterial({ color: '#40200a', emissive: '#ff9a20', emissiveIntensity: 2.2, roughness: 0.25 });
  const blurM = new THREE.MeshBasicMaterial({ color: '#cfd8de', transparent: true, opacity: 0.09, depthWrite: false });
  mesh(G.hull, hullM, body);
  const visor = mesh(G.visor, visorM, body, false); visor.position.set(0, 0.1, 0.5);
  const cell = mesh(G.cell, cellM, body, false); cell.position.set(0, 0.28, -0.1);
  const rotors = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * 0.55, 0.4, 0); g.rotation.z = -s * 0.1; body.add(g);
    const sp = new THREE.Group(); g.add(sp); mesh(G.rotor, hullM, sp); sp.userData.s = s;
    const d = new THREE.Mesh(G.disc, blurM); d.position.y = 0.02; g.add(d);
    return sp;
  });
  const arms = [-1, 1].map((s) => { const a = mesh(G.prod, hullM, body); a.position.set(s * 0.3, -0.14, 0.34); return a; });
  const spark = new THREE.Mesh(G.spark, new THREE.MeshBasicMaterial({ color: '#d8f8ff', transparent: true, opacity: 0 })); spark.position.set(0, -0.2, 0.8); body.add(spark);
  const rig = {
    root, anim: 'idle', t: 0, flash: 0, actionT: 0, mood: 'calm', hp: 1,
    play(a) { if (a !== this.anim) { this.anim = a; this.actionT = 0; } }, hitFlash() { this.flash = 1; },
    setHp(f) { this.hp = f; },
    update(dt) {
      this.t += dt; this.actionT += dt;
      if (this.anim === 'dead' && this.ko) {
        const K = this.ko;
        rotors.forEach((r) => { r.rotation.y += dt * 30 * K.rotor * r.userData.s; });
        body.rotation.x = K.rx; body.rotation.z = K.rz;
        body.position.y = damp(body.position.y, 0, 10, dt);
        arms.forEach((a) => { a.rotation.x = damp(a.rotation.x, 0.65, 6, dt); });
        spark.material.opacity = 0;
        this.flash = Math.max(0, this.flash - dt * 4);
        visorM.emissiveIntensity = 2.2 * (1 - K.dim) + 0.05 + this.flash * 3; cellM.emissiveIntensity = 2.2 * (1 - K.dim) + 0.05;
        hullM.emissive.setRGB(this.flash * 0.8, this.flash * 0.8, this.flash * 0.8);
        return;
      }
      const t = this.t, charging = this.anim === 'windup';
      rotors.forEach((r) => { r.rotation.y += dt * 24 * r.userData.s; });
      body.position.y = Math.sin(t * 1.6) * 0.05;
      arms.forEach((a, i) => { a.rotation.x = charging ? -0.9 : this.anim === 'fire' ? -1.2 : Math.sin(t * 1.5 + i) * 0.1; });
      spark.material.opacity = charging ? 0.5 + Math.sin(this.actionT * 50) * 0.4 : 0;
      spark.scale.setScalar(charging ? 0.8 + this.actionT * 1.6 : 1);
      body.rotation.z = Math.sin(t * 1.2) * 0.04 + (this.anim === 'hurt' ? Math.sin(this.actionT * 30) * 0.25 : 0);
      body.rotation.x = charging ? 0.08 : 0;
      this.flash = Math.max(0, this.flash - dt * 4);
      const c = this.mood === 'alert' ? [1.0, 0.25, 0.15] : this.mood === 'search' ? [1.0, 0.75, 0.2] : [0.25, 0.85, 1.0];
      visorM.color.setRGB(...c); visorM.emissive.setRGB(c[0] * 0.8, c[1] * 0.8, c[2] * 0.8);
      visorM.emissiveIntensity = 2.2 + (charging ? 2 + Math.sin(this.actionT * 30) : 0) + this.flash * 3;
      // the weak spot: steady amber; hurt, it flickers faster, reddens and flares (the hull's health shown on the hull)
      const dmg = 1 - this.hp, fl = Math.sin(t * (5 + dmg * 22)) * (0.25 + dmg * 0.6);
      cellM.emissive.setRGB(1, 0.6 - dmg * 0.5, 0.12 - dmg * 0.1);
      cellM.emissiveIntensity = 2.2 + fl + (charging ? 1.2 : 0) + this.flash * 3;
      hullM.emissive.setRGB(this.flash * 0.8, this.flash * 0.8, this.flash * 0.8);
    },
  };
  rig.j = {};
  return rig;
}

// ================================================================== the guardian's bolt-fan floor markers
// Three lanes on the floor from the cannon along the three bolts' lines (the same rotation of the aim as the shot,
// enemies.js), widening a little with distance, brightening through the wind-up: the fan is readable before it fires.
// One dynamic mesh (12 vertices, rewritten in place: no allocation per frame), a basic transparent material.
export function createFan(scene) {
  const pos = new Float32Array(12 * 3), idx = [];
  for (let i = 0; i < 3; i++) { const o = i * 4; idx.push(o, o + 1, o + 2, o, o + 2, o + 3); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
  const mat = new THREE.MeshBasicMaterial({ color: '#ff4a2a', transparent: true, opacity: 0, depthWrite: false });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false; mesh.visible = false; mesh.renderOrder = 2;
  scene.add(mesh);
  return {
    mesh,
    // x, z: the cannon's mouth on the floor; y: the floor height; a: the aim (atan2 x, z); offs: the three bolts' turns; len: how far; k: wind-up 0..1
    set(x, z, y, a, offs, len, k, t) {
      for (let i = 0; i < 3; i++) {
        const ang = a + offs[i], dx = Math.sin(ang), dz = Math.cos(ang), px = dz, pz = -dx, w0 = 0.25, w1 = 0.35 + len * 0.02, o = i * 12;
        const q = [[x + px * w0, z + pz * w0], [x - px * w0, z - pz * w0], [x + dx * len - px * w1, z + dz * len - pz * w1], [x + dx * len + px * w1, z + dz * len + pz * w1]];
        for (let v = 0; v < 4; v++) { pos[o + v * 3] = q[v][0]; pos[o + v * 3 + 1] = y; pos[o + v * 3 + 2] = q[v][1]; }
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = 0.1 + 0.5 * k + Math.sin(t * 30) * 0.06 * k;
      mesh.visible = true;
    },
    hide() { mesh.visible = false; },
    remove() { scene.remove(mesh); },
  };
}
