// CAMPAIGN-5 (the user's treatment of 11.11.2026, section 5 "Hamalayi — the road under the ice"): the rope lift's line
// carries the pulse. Ours (the lift is the sequel's own: no original layout to match); the lift's dark wood, iron and rope.
//
// What stands there (the Hamalayi's local metres; hamalayi.js builds it with the lift):
//   - three lamps hung on iron brackets off the lift's two guide rails (the line's pylons): on a kick they swing and
//     flicker; the hauling cable, from the winch's drum round a sheave at the rails' foot and up to the top wheel, jumps
//   - a crank on the winch's drum (the hand that starts a trip holds it; a surge kicks it back out of the hand)
//   - the line's gauge on a post beside the winch, facing the man at the crank: a needle and three sectors (RED: the
//     surge, GREEN: a trip started now is up before the next one, AMBER: too late, the next surge would catch it)
//   - the upper brake at the top beside the frame: a ratchet stand with a red lever (OFF up, LOCKED down) and a rod up to
//     the top wheel; locked, its pawl holds the drum through a surge
//
// The pulse: three kicks and a rest, PERIOD s round. It runs only while the story sets `active` (story/passline.js).
//
// CONTRACT (story/passline.js; world points)
//   buildWinchLine({ group, col, W, H, kit, updaters, lift: {x, z, y0, y1}, winch: {x, z, y}, top: {x, z, y}, rope, iron })
//   → R.line: period, surge (s of the surge from a kick), greenEnd (the latest start that is up before the next surge),
//     speed (the platform's m/s on a trip), ride (s of a trip up)
//     active, hold() (true: the clock waits, e.g. a menu), onKick(i), onRest() (the story's sounds)
//     phase() the time into the cycle; surging(); green() (a start now is safe); sync(t) puts the cycle at t
//     gauge {x, z, y} (where it is read from), crank: { touch(), kick() }, brake: { on, set(b), touch(), x, z }
import * as THREE from 'three';
import { mergeStatic } from '../engine/merge.js';
import { MAT } from './props.js';
import { touch } from './story/reach.js';

export const PULSE = { period: 11.0, kicks: [0, 0.42, 0.84], surge: 1.5, speed: 2.0 };

const canvasTex = (w, h, draw) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
};
// the dial's needle angle for a value 0..1 (from lower left, over the top, to lower right)
const ang = (v) => -(Math.PI * 0.75) + Math.PI * 1.5 * Math.min(1.05, Math.max(0, v));

export function buildWinchLine({ group, col, W, H, kit, updaters, lift, winch, top, rope, iron }) {
  const P = PULSE, ride = (lift.y1 - lift.y0) / P.speed + 0.15, greenEnd = P.period - ride - 0.4;
  const vOf = (ph) => 0.1 + 0.8 * (ph - P.surge) / (P.period - P.surge);   // the needle in the rest: the strain building
  const vG = vOf(greenEnd);
  const dark = MAT.wood('dark'), ironM = MAT.iron();
  const D = new THREE.Group(); group.add(D);   // what moves

  // ---- the lamps on the rails: a bracket (static) and the lamp swinging from its end (two instanced meshes, all three)
  const RZ = lift.z - 1.55;   // (the rails' line)
  const LAMPS = [[lift.x - 1.75, lift.y0 + 3.4], [lift.x + 1.75, lift.y0 + 6.4], [lift.x - 1.75, lift.y0 + 9.2]];
  for (const [x, y] of LAMPS) {
    kit.add(new THREE.BoxGeometry(0.06, 0.06, 0.6), ironM, x, y + 0.02, RZ + 0.33);
    kit.add(new THREE.BoxGeometry(0.05, 0.22, 0.05), ironM, x, y - 0.08, RZ + 0.1, 0, { rx: 0.7 });
  }
  const cageG = (() => {
    const parts = [new THREE.BoxGeometry(0.015, 0.2, 0.015).translate(0, -0.1, 0), new THREE.ConeGeometry(0.16, 0.12, 4).rotateY(Math.PI / 4).translate(0, -0.24, 0),
      new THREE.BoxGeometry(0.22, 0.03, 0.22).translate(0, -0.6, 0)];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) parts.push(new THREE.BoxGeometry(0.02, 0.3, 0.02).translate(sx * 0.1, -0.44, sz * 0.1));
    const g = mergeGeos(parts); return g;
  })();
  const glassM = new THREE.MeshStandardMaterial({ color: '#ffe2a8', emissive: '#ffa040', emissiveIntensity: 1.25, roughness: 0.4 });
  const cageM = new THREE.MeshStandardMaterial({ color: '#3e4048', roughness: 0.55, metalness: 0.55 });
  const cage = new THREE.InstancedMesh(cageG, cageM, LAMPS.length), glass = new THREE.InstancedMesh(new THREE.BoxGeometry(0.17, 0.26, 0.17).translate(0, -0.44, 0), glassM, LAMPS.length);
  cage.castShadow = false; glass.castShadow = false; cage.frustumCulled = glass.frustumCulled = false;
  D.add(cage, glass);
  const lamps = LAMPS.map(([x, y]) => ({ x, y: y + 0.02, z: RZ + 0.6, a: 0, w: 0, b: 0, wb: 0 }));
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1.4, 1.4, 1.4);   // (the lamps a size larger than the lift's lantern: read from the winch)
  const placeLamps = () => {
    lamps.forEach((L, i) => { _m.compose(_p.set(L.x, L.y, L.z), _q.setFromEuler(_e.set(L.a, 0, L.b)), _s); cage.setMatrixAt(i, _m); glass.setMatrixAt(i, _m); });
    cage.instanceMatrix.needsUpdate = true; glass.instanceMatrix.needsUpdate = true;
  };
  placeLamps();

  // ---- the hauling cable: off the drum's top, round a sheave at the rails' foot, up the right rail, over to the top wheel
  const wx = winch.x, wz = winch.z, wy = winch.y;
  const cableG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    [wx - 0.3, wy + 1.57, wz], [lift.x + 1.95, wy + 0.75, RZ + 0.35], [lift.x + 1.95, lift.y1 - 1.0, RZ + 0.3], [lift.x + 1.95, lift.y1 + 2.8, RZ - 0.6], [top.x + 0.5, lift.y1 + 3.7, top.z + 1.2],
  ].map((p) => new THREE.Vector3(...p)), false, 'centripetal', 0), 40, 0.028, 5, false);
  const cable = new THREE.Mesh(cableG, rope); cable.castShadow = false; D.add(cable);
  kit.add(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12), ironM, lift.x + 1.95, wy + 0.75, RZ + 0.35, 0, { rz: Math.PI / 2 });   // (the sheave)

  // ---- the crank on the drum's end (past the gear), its arm toward the man at the winch (+z), the grip along x
  const CX = wx + 1.14, CY = wy + 1.15;
  kit.add(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 8), ironM, wx + 1.07, CY, wz, 0, { rz: Math.PI / 2 });
  const crankP = new THREE.Group(); crankP.position.set(CX, CY, wz); D.add(crankP);
  { const a = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.58), ironM); a.position.set(0, 0, 0.27); crankP.add(a);
    const g = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 8), dark); g.rotation.z = Math.PI / 2; g.position.set(0.1, 0, 0.55); crankP.add(g);
    mergeStatic(crankP, { recolor: true, retex: true }); }
  // (its rest: the grip at the hand's height of a man standing at it, on the ground there — a little below the winch's
  //  boards: the arm tips down to meet him; 'tinker' holds the hand 1.17–1.26 m up)
  const crank = { t: null, rest: 0 };
  for (let k = 0; k < 3; k++) { const gz = wz + Math.cos(crank.rest) * 0.55, dy = H(CX + 0.12 - 0.38, gz + 0.55) + 1.2 - CY; crank.rest = -Math.asin(Math.max(-0.9, Math.min(0.9, dy / 0.55))); }
  crankP.rotation.x = crank.rest;
  // the grip where it rests: in the hand of a man facing the drum's end from in front (−z), a 'tinker' reach
  const grip = () => { const y = Math.sin(-crank.rest) * 0.55, z = Math.cos(crank.rest) * 0.55; void y; return W(CX + 0.12, wz + z); };

  // ---- the gauge on its post, right of the crank, its face toward the man at the crank
  const G0 = { x: wx + 1.95, z: wz + 0.62 }, gy = H(G0.x, G0.z), GY = gy + 1.45;
  kit.add(new THREE.CylinderGeometry(0.05, 0.06, 1.3, 8), dark, G0.x, gy + 0.65, G0.z - 0.1);
  // (GPU-V85: the gauge 30 % larger: at its read spot his head covered the old face; now its arc shows round him)
  kit.add(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 24), ironM, G0.x, GY, G0.z - 0.08, 0, { rx: Math.PI / 2 });
  kit.add(new THREE.BoxGeometry(0.8, 0.05, 0.32), ironM, G0.x, GY + 0.4, G0.z - 0.03);   // (its little snow roof)
  col({ type: 'cyl', x: G0.x, z: G0.z - 0.1, r: 0.2, top: GY + 0.35, noStand: true });
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.31, 32), new THREE.MeshStandardMaterial({ roughness: 0.6, map: canvasTex(192, 192, (x) => {
    const c = 96, arc = (v0, v1, color, w = 26) => { x.strokeStyle = color; x.lineWidth = w; x.beginPath(); x.arc(c, c, 66, ang(v0) - Math.PI / 2, ang(v1) - Math.PI / 2); x.stroke(); };
    x.fillStyle = '#f2ecdc'; x.beginPath(); x.arc(c, c, 94, 0, 7); x.fill();
    arc(0.0, 0.1, '#9aa6b0'); arc(0.1, vG, '#3aa64a'); arc(vG, 0.9, '#e0a020'); arc(0.9, 1.05, '#c8302a');
    x.strokeStyle = '#2a2a2a'; x.lineWidth = 3; x.beginPath(); x.arc(c, c, 92, 0, 7); x.stroke();
    x.fillStyle = '#2a2a2a'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.fillText('LINE', c, 140);
  }) }));
  face.position.set(G0.x, GY, G0.z - 0.015); face.castShadow = false; D.add(face);
  const needle = new THREE.Group(); needle.position.set(G0.x, GY, G0.z - 0.005); D.add(needle);
  { const n = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.26, 0.008), new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.6 })); n.position.y = 0.1; n.castShadow = false; needle.add(n); }

  // ---- the upper brake at the top, west of the frame: a stand, a ratchet wheel, a red lever, a rod up to the top wheel
  const B0 = { x: top.x - 2.0, z: top.z - 1.0 }, by = H(top.x - 2.0, top.z - 1.0);
  kit.add(new THREE.BoxGeometry(0.3, 0.9, 0.3), dark, B0.x, by + 0.45, B0.z);
  kit.add(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 14), ironM, B0.x + 0.2, by + 0.86, B0.z, 0, { rz: Math.PI / 2 });
  { const d = new THREE.Vector3(lift.x - 0.4 - B0.x, lift.y1 + 3.6 - by - 0.9, top.z + 1.2 - B0.z), len = d.length();
    kit.add(new THREE.CylinderGeometry(0.02, 0.02, len, 5).translate(0, len / 2, 0).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())), ironM, B0.x, by + 0.9, B0.z); }
  col({ type: 'box', x: B0.x, z: B0.z, hw: 0.2, hd: 0.2, top: by + 1.0, noStand: true });
  // (the lever on the stand's side toward the ramp (+z): he comes up from the platform and stands at it facing −z)
  const brakeP = new THREE.Group(); brakeP.position.set(B0.x, by + 0.8, B0.z + 0.18); D.add(brakeP);
  { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.42, 0.05), ironM); l.position.y = 0.21; brakeP.add(l);
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), new THREE.MeshStandardMaterial({ color: '#c8302a', roughness: 0.45 })); k.position.y = 0.42; brakeP.add(k);
    mergeStatic(brakeP, { recolor: true, retex: true }); }
  const OFF = 0.0, ON = 1.05;   // (about x: up = off; pulled toward him (+z), down = locked)
  const knob = () => ({ x: brakeP.position.x, y: brakeP.position.y + Math.cos(brakeP.rotation.x) * 0.42, z: brakeP.position.z + Math.sin(brakeP.rotation.x) * 0.42 });

  // ---- the clock and what a kick does
  const st = { t: P.period - 0.6, k: 0, rested: true, active: false, cableT: null, needleKick: 0 };
  const L = {
    period: P.period, surge: P.surge, greenEnd, speed: P.speed, ride, active: false, hold: null, onKick: null, onRest: null,
    phase() { return st.t % P.period; },
    surging() { return this.phase() < P.surge; },
    green() { const p = this.phase(); return p >= P.surge && p <= greenEnd; },
    sync(t) { st.t = t; st.k = P.kicks.findIndex((k) => k > t); if (st.k < 0) st.k = P.kicks.length; st.rested = t >= P.surge; },
    gauge: { ...W(G0.x, G0.z + 0.95), y: GY, look: W(G0.x, G0.z) },
    crank: { mesh: crankP, touch() { const p = grip(); return touch(p.x, p.z, Math.PI, 'tinker'); }, kick() { crank.t = 0; } },
    brake: {
      on: false, ...W(B0.x, B0.z), mesh: brakeP,
      set(b) { this.on = !!b; brakeP.rotation.x = b ? ON : OFF; },
      touch() { const k = knob(), p = W(k.x, k.z); return touch(p.x, p.z, Math.PI, 'tinker'); },
    },
    // (for the tests: how far the lamps swing now, where the gauge's needle stands 0..1)
    swing() { return lamps.reduce((m, l) => Math.max(m, Math.abs(l.a) + Math.abs(l.b)), 0); },
    needle() { return st.v ?? 0; },
    vGreen: vG,
    // what a kick looks like (the story's sound is its own: onKick)
    kick() {
      for (const l of lamps) { l.w += 2.2 + Math.random() * 0.8; l.wb += (Math.random() - 0.5) * 1.6; }
      st.cableT = 0; st.needleKick = 1;
    },
  };
  L.brake.set(false);
  updaters.push((dt) => {
    // the clock: only while the story has the pulse on (and not while a menu holds the game)
    if (L.active && !L.hold?.()) {
      const before = st.t % P.period;
      st.t += dt;
      const ph = st.t % P.period;
      if (ph < before) { st.k = 0; st.rested = false; }
      while (st.k < P.kicks.length && ph >= P.kicks[st.k]) { const i = st.k++; L.kick(); L.onKick?.(i); }
      if (!st.rested && ph >= P.surge) { st.rested = true; L.onRest?.(); }
    }
    // the lamps: damped swings, the glass flickering while they swing
    let swing = 0;
    for (const l of lamps) {
      l.w += (-l.a * 18 - l.w * 2.6) * dt; l.a += l.w * dt * 0.12;
      l.wb += (-l.b * 18 - l.wb * 2.6) * dt; l.b += l.wb * dt * 0.12;
      swing = Math.max(swing, Math.abs(l.a) + Math.abs(l.b));
    }
    placeLamps();
    glassM.emissiveIntensity = 1.25 - Math.min(0.9, swing * 6) * (0.5 + 0.5 * Math.sin(performance.now() * 0.05));
    // the cable jumps
    if (st.cableT != null) { st.cableT += dt; const k = Math.exp(-st.cableT * 7) * Math.sin(st.cableT * 55) * 0.05; cable.position.set(k, k * 0.4, 0); if (st.cableT > 0.8) { st.cableT = null; cable.position.set(0, 0, 0); } }
    // the gauge: in the surge the needle jumps into the red with each kick; in the rest it drops to the green and climbs
    st.needleKick = Math.max(0, st.needleKick - dt * 4);
    const ph = st.t % P.period;
    const v = !L.active ? 0.05 : ph < P.surge ? 0.84 + 0.18 * st.needleKick : vOf(ph);
    needle.rotation.z = -ang(v); st.v = v;
    // the crank: kicked back out of the hand, swinging round its axle and settling
    if (crank.t != null) { crank.t += dt; crankP.rotation.x = crank.rest + Math.exp(-crank.t * 4) * Math.sin(crank.t * 22) * 0.9; if (crank.t > 1.5) { crank.t = null; crankP.rotation.x = crank.rest; } }
  });
  return L;
}

// (a few small geometries into one: the lamp's cage)
function mergeGeos(list) {
  const out = []; let n = 0;
  for (const g of list) { const ng = g.index ? g.toNonIndexed() : g; out.push(ng); n += ng.attributes.position.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  let o = 0;
  for (const g of out) { g.computeVertexNormals(); pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  return g;
}
