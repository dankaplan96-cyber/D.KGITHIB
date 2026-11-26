// #18 / #28 (?ch7stage=new, src/game/ch7stage.js; docs/lba-maturity/CH7-STAGE.md): the vent's seal as "the mountain's
// pulse". The old stone seal sits in a turning ring with an arrow cut in it, and five grooves run out from it across the
// glacier like a sun's rays, each with a little cairn at its end. They are the monks' steam channels. Only one still
// carries the steam: on each kick of the mountain (the rope lift's line, winchline.js: three kicks and a rest) the snow
// jumps along that groove, and its ice is darker and wet. The arrow rests on the groove toward the descent, which is
// dead; the live one is two notches round. The story (story/ventring.js) turns the ring a notch at a time and opens the
// vent when a kick comes with the arrow still on the live groove.
//
// Contract (R.ventRing, world coordinates):
//   n (5), live (the live groove's index), notch (where the arrow points), moving (turning now), still (s since it stopped)
//   grooves [{k, a, x0, z0, x1, z1}]  a groove's angle (sin a, cos a from the vent) and its two ends
//   at(k, t) {x, y, z}  a point t of the way along groove k (0 its mouth by the seal, 1 its cairn)
//   turn(done)  one notch sunwise (0.7 s); set(n) at once; jolt() the kick shaking it in place; aligned()
// Nothing here is solid but the cairns (low, see-through for the camera); the ring is inside the vent's own collider.
import * as THREE from 'three';
import { pm, tm, cyl, mesh, Batch } from './kit.js';
import { rng } from '../engine/math.js';

const N = 5, LIVE = 2, R0 = 3.9, R1 = 11.4, STEP = (Math.PI * 2) / N, TURN_S = 0.7;

export function ventSeal(env) {
  const { group, H, col, VENT, descent, updaters, W } = env;
  const r = rng(5150);
  const aD = Math.atan2(descent[0] - VENT.x, descent[1] - VENT.z);   // groove 0 points at the descent, where he comes from
  const gy0 = H(VENT.x, VENT.z), O = W(0, 0);

  // ---- the ring and its arrow (one group, turned round the vent's axis)
  const ring = new THREE.Group();
  ring.position.set(VENT.x, gy0, VENT.z);
  group.add(ring);
  // (a thick stone hoop round the seal's edge, standing clear of the ground round it; the arrow lies on it, pointing out)
  const stoneM = tm('stone', { color: '#7f746a' });
  mesh(ring, new THREE.TorusGeometry(1.98, 0.36, 8, 40).rotateX(Math.PI / 2).scale(1, 0.6, 1), stoneM, 0, 0.26, 0, 0);
  const paint = pm('#c8682c', 0.6, { emissive: '#5a2408', emissiveIntensity: 0.35 });
  mesh(ring, new THREE.BoxGeometry(0.32, 0.12, 1.0), paint, 0, 0.46, 2.2, 0);
  mesh(ring, new THREE.ConeGeometry(0.42, 0.7, 4).rotateY(Math.PI / 4).rotateX(Math.PI / 2).scale(1, 0.3, 1), paint, 0, 0.44, 2.98, 0);

  // ---- the five grooves: a channel strip lined with stones, a cairn at the end
  const B = new Batch(group, { cast: false });
  const deadM = pm('#8ea4b6', 0.72), liveM = pm('#6f879b', 0.28, { metalness: 0.06 });
  const kerbM = pm('#8b8178', 0.85), kerbLiveM = pm('#6a625b', 0.5);
  const kerbGeo = new THREE.IcosahedronGeometry(0.16, 0), segGeo = new THREE.BoxGeometry(0.78, 0.07, 0.9);
  const grooves = [];
  // (the live groove's stones in three lengths of their own, each its own mesh: a kick makes one hop, outward kick by kick.
  //  White powder on white ice reads poorly; dark stones jumping read from the play camera)
  const hops = [0, 1, 2].map(() => { const gr = new THREE.Group(); group.add(gr); return { gr, B: new Batch(gr, { cast: false }), t: 0 }; });
  for (let k = 0; k < N; k++) {
    const a = aD + k * STEP, s = Math.sin(a), c = Math.cos(a), live = k === LIVE;
    for (let d = R0 + 0.45; d < R1; d += 0.85) {
      const x = VENT.x + s * d, z = VENT.z + c * d;
      // (FEET-66: the strip laid on the ice, tilted with it, its top 1.2 cm over it; it lay flat 1.5 cm over the ice at its
      //  middle, and on the vent's slope its top stood 5-8 cm over his feet)
      const hc = (u, v) => H(x + u * c + v * s, z - u * s + v * c), su = (hc(0.39, 0) - hc(-0.39, 0)) / 0.78, sv = (hc(0, 0.45) - hc(0, -0.45)) / 0.9;
      B.add(segGeo, live ? liveM : deadM, x, H(x, z) + 0.012 - 0.035, z, -Math.atan(sv), a, Math.atan(su));
    }
    for (let d = R0 + 0.2; d < R1 + 0.1; d += 0.75) for (const side of [-1, 1]) {
      const j = (r() - 0.5) * 0.12, x = VENT.x + s * d + c * side * (0.55 + j), z = VENT.z + c * d - s * side * (0.55 + j);
      (live ? hops[Math.min(2, Math.floor(((d - R0) / (R1 - R0)) * 3))].B : B).add(kerbGeo, live ? kerbLiveM : kerbM, x, H(x, z) + 0.04, z, r() * 3, r() * 6.28, 0, 0.9 + r() * 0.5, 0.55 + r() * 0.3, 0.9 + r() * 0.5);
    }
    // the cairn: three stones stacked at the groove's end
    const cx = VENT.x + s * (R1 + 0.6), cz = VENT.z + c * (R1 + 0.6), cy = H(cx, cz);
    let y = cy;
    for (const [rad, ht] of [[0.4, 0.3], [0.31, 0.26], [0.22, 0.22]]) {
      B.add(kerbGeo, kerbM, cx + (r() - 0.5) * 0.06, y + ht * 0.5, cz + (r() - 0.5) * 0.06, 0, r() * 6.28, 0, rad / 0.16, ht / 0.16 / 1.6, rad / 0.16);
      y += ht * 0.92;
    }
    col({ type: 'cyl', x: cx, z: cz, r: 0.42, top: cy + 0.8, noStand: true, seeThrough: true });
    const p0 = W(VENT.x + s * R0, VENT.z + c * R0), p1 = W(VENT.x + s * R1, VENT.z + c * R1);
    grooves.push({ k, a, live, x0: p0.x, z0: p0.z, x1: p1.x, z1: p1.z });
  }
  B.build();
  for (const h of hops) h.B.build();
  // the throat, dark under the seal once it has dropped (the vent open)
  const throat = mesh(group, new THREE.CircleGeometry(1.62, 28).rotateX(-Math.PI / 2), pm('#1c2a36', 0.9), VENT.x, gy0 + 0.04, VENT.z, 0, { cast: false });
  throat.visible = false;

  // ---- turning: one notch at a time, eased; a jolt when a kick shakes it where it stands
  const st = { notch: 0, from: 0, to: 0, t: 1, done: null, jolt: 0, still: 99 };
  const angleOf = (n) => aD + n * STEP;
  ring.rotation.y = angleOf(0);
  updaters.push((dt) => {
    if (st.t < 1) {
      st.t = Math.min(1, st.t + dt / TURN_S);
      const e = st.t < 0.5 ? 2 * st.t * st.t : 1 - Math.pow(-2 * st.t + 2, 2) / 2;
      ring.rotation.y = angleOf(st.from + (st.to - st.from) * e);
      if (st.t >= 1) { st.notch = ((st.to % N) + N) % N; ring.rotation.y = angleOf(st.notch); st.still = 0; const d = st.done; st.done = null; d?.(); }
    } else st.still += dt;
    if (st.jolt > 0) {
      st.jolt = Math.max(0, st.jolt - dt);
      const k = st.jolt / 0.45;
      ring.rotation.y = angleOf(st.notch) + Math.sin(st.jolt * 60) * 0.05 * k;
      ring.position.y = gy0 + Math.abs(Math.sin(st.jolt * 40)) * 0.06 * k;
    } else ring.position.y = gy0;
    for (const h of hops) if (h.t > 0) { h.t = Math.max(0, h.t - dt); h.gr.position.y = Math.sin(Math.PI * (1 - h.t / 0.38)) * 0.42 * (h.t > 0 ? 1 : 0); }
  });
  return {
    n: N, live: LIVE, grooves,
    get notch() { return st.notch; },
    get moving() { return st.t < 1; },
    get still() { return st.still; },
    aligned() { return st.t >= 1 && st.notch === LIVE; },
    at(k, t) { const g = grooves[k], x = g.x0 + (g.x1 - g.x0) * t, z = g.z0 + (g.z1 - g.z0) * t; return { x, y: H(x - O.x, z - O.z), z }; },
    turn(done) { if (st.t < 1) return false; st.from = st.notch; st.to = st.notch + 1; st.t = 0; st.done = done; return true; },
    set(n) { st.notch = ((n % N) + N) % N; st.t = 1; st.done = null; st.still = 99; ring.rotation.y = angleOf(st.notch); },
    jolt() { if (st.t >= 1) st.jolt = 0.45; },
    hop(i) { const h = hops[Math.max(0, Math.min(2, i))]; h.t = 0.38; },
    setOpen(b) { throat.visible = !!b; },
  };
}
