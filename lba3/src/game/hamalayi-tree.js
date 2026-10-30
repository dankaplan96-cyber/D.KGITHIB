// HAMALAYI-POLISH: the dead tree across the meltwater gorge (hamalayi.js, chapter 6: the ball knocks it down and it is
// the bridge). A trunk with bark, a root plate, three broken stubs and a snow blob; the fall is an inverted pendulum
// about the foot (a creak, then the whip), the tip lands on the far bank with a thud, a snow puff and two small
// bounces, and the blob lets go of its stub and drops. The final pose and the story's contract are what they were:
// tree.rotation.x = PI/2, tree.position.y = L0 - 0.55; R.gorge.tree.fell(instant) is called by the story.
import * as THREE from 'three';
import { rng } from '../engine/math.js';
import { pm, ctex, Batch } from './kit.js';

const lerp = (a, b, t) => a + (b - a) * t;
const barkTex = () => ctex('hbark', 128, 256, (x, W, Hh) => {
  const r = rng(61);
  x.fillStyle = '#4a3e34'; x.fillRect(0, 0, W, Hh);
  for (let i = 0; i < 70; i++) { x.fillStyle = r() < 0.5 ? 'rgba(112,94,76,0.55)' : 'rgba(26,20,16,0.5)'; const px = r() * W, wd = 2 + r() * 7, y0 = r() * Hh, ln = 30 + r() * 120; x.fillRect(px, y0, wd, ln); x.fillRect(px - W, y0, wd, ln); }
  for (let i = 0; i < 26; i++) { x.fillStyle = 'rgba(20,14,10,0.55)'; x.fillRect(r() * W, r() * Hh, 10 + r() * 22, 1.5); }          // cross cracks
  for (let i = 0; i < 9; i++) { x.fillStyle = 'rgba(188,172,146,0.5)'; const px = r() * W, py = r() * Hh; x.beginPath(); x.ellipse(px, py, 5 + r() * 9, 14 + r() * 22, 0, 0, 7); x.fill(); }   // bark gone: grey wood
  for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(150,158,140,0.4)'; x.fillRect(r() * W, r() * Hh, 3 + r() * 5, 2 + r() * 3); }      // lichen
});
// the trunk: a flared foot, a taper, a slight bend, lumps; UV 2 × (y / 1.7 m) for the bark
const trunkGeo = (Ht) => {
  const seg = 11, rows = 30, P = [], U = [], I = [];
  for (let r = 0; r <= rows; r++) {
    const t = r / rows, y = t * Ht, rad = lerp(0.46, 0.27, t) + 0.34 * Math.exp(-y * 1.5), bend = 0.12 * Math.sin(y * 0.42 + 0.5) * t;
    for (let s = 0; s <= seg; s++) {
      const a = s / seg * Math.PI * 2, k = 1 + 0.07 * Math.sin(a * 3 + y * 1.7) + 0.05 * Math.sin(a * 5 - y * 2.9);
      P.push(bend + Math.cos(a) * rad * k, y, Math.sin(a) * rad * k); U.push(s / seg * 2, y / 1.7);
      if (r && s) { const o = (r - 1) * (seg + 1) + s - 1, q = r * (seg + 1) + s - 1; I.push(o, q, o + 1, o + 1, q, q + 1); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals();
  return g;
};
const _q = new THREE.Quaternion(), _y = new THREE.Vector3(0, 1, 0);
// matrix of a Y-axis cylinder of `len` that starts at point `a` and runs along `dir`
const along = (a, dir, len) => { const d = new THREE.Vector3(...dir).normalize(); _q.setFromUnitVectors(_y, d); return new THREE.Matrix4().compose(new THREE.Vector3(a[0] + d.x * len / 2, a[1] + d.y * len / 2, a[2] + d.z * len / 2), _q, new THREE.Vector3(1, 1, 1)); };

// env: group, ox, oz (the region's origin in the world), TREE {x, z} (local), H (ground), L0 (the bank's level), updaters, snowM
export function makeTree(env) {
  const { group, ox, oz, TREE, H, L0, updaters, snowM } = env;
  const tree = new THREE.Group(); tree.position.set(TREE.x, H(TREE.x, TREE.z), TREE.z); group.add(tree);
  const bark = new THREE.MeshStandardMaterial({ map: barkTex(), color: '#ffffff', roughness: 0.95 });
  const pale = pm('#d6c29a', 0.85), soil = pm('#4b3a2a', 0.95), rootM = pm('#5a4838', 0.95);
  const TB = new Batch(tree), Ht = 11;
  TB.add(trunkGeo(Ht), bark, 0, 0, 0);
  // the broken crown: a pale, splintered break at the top
  for (const [dx, dz, h, rs, tilt] of [[0, 0, 0.5, 0.22, 0.1], [0.12, 0.05, 0.95, 0.12, -0.22], [-0.1, -0.06, 0.32, 0.14, 0.3]]) TB.add(new THREE.ConeGeometry(rs, h, 6), pale, 0.03 + dx, Ht + h / 2 - 0.05, dz, 0, 0, tilt);
  // three broken branch stubs: thick and short, a clean pale cut at each end (one cut on the slant)
  const stubs = [[3.3, 2.6, 0.62, 0.11, 0.75], [5.9, 0.5, 0.78, 0.1, 0.8], [8.2, -0.4, 0.55, 0.085, 0.7]];
  stubs.forEach(([y, ang, len, rr, up], i) => {
    const dir = [Math.cos(ang) * (1 - up), up, Math.sin(ang) * (1 - up)], start = [Math.cos(ang) * 0.27, y, Math.sin(ang) * 0.27], d = new THREE.Vector3(...dir).normalize();
    TB.addM(new THREE.CylinderGeometry(rr * 0.8, rr * 1.4, len, 8, 1), bark, along(start, dir, len));
    const m = along([start[0] + d.x * len, start[1] + d.y * len, start[2] + d.z * len], dir, 0.035); if (i === 1) m.multiply(new THREE.Matrix4().makeRotationX(0.45));
    TB.addM(new THREE.CylinderGeometry(rr * 0.8, rr * 0.8, 0.035, 8), pale, m);
  });
  // the root plate: a lumpy disc of earth under the foot (buried while it stands; it faces north once the tree is down),
  // roots splayed out of it, clods of frozen soil
  const plateG = new THREE.IcosahedronGeometry(1, 2), pp = plateG.attributes.position;
  for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), y = pp.getY(i), z = pp.getZ(i), k = 1 + 0.12 * Math.sin(x * 5 + z * 3) + 0.09 * Math.sin(z * 7 - x * 2); pp.setXYZ(i, x * k, y, z * k); }
  plateG.computeVertexNormals();
  TB.add(plateG, soil, 0.05, -0.12, 0.0, 0, 0, 0, 1.05, 0.3, 1.0);
  const rr = rng(8);
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + rr() * 0.4, len = 1.0 + rr() * 0.7, dir = [Math.cos(a), -0.28 - rr() * 0.2, Math.sin(a)], o = [Math.cos(a) * 0.3, 0.12, Math.sin(a) * 0.3];
    TB.addM(new THREE.CylinderGeometry(0.035, 0.15 + rr() * 0.05, len, 6, 1), rootM, along(o, dir, len));
    TB.addM(new THREE.CylinderGeometry(0.02, 0.06, 0.55, 5, 1), rootM, along([o[0] + dir[0] * len * 0.55, o[1] + dir[1] * len * 0.55, o[2] + dir[2] * len * 0.55], [Math.cos(a + 0.5), -0.5, Math.sin(a + 0.5)], 0.55));
  }
  for (let i = 0; i < 6; i++) { const a = rr() * 6.283, d = 0.45 + rr() * 0.5, s = 0.1 + rr() * 0.12; TB.add(new THREE.DodecahedronGeometry(1, 0), soil, Math.cos(a) * d, -0.05 + rr() * 0.12, Math.sin(a) * d, rr(), rr() * 6, rr(), s, s * 0.8, s); }
  // snow lying along the trunk's far side (it is the top once the tree is down), and a cap on every stub
  for (let y = 1.2; y < 10.4; y += 0.55 + rr() * 0.5) { const s = 0.2 + rr() * 0.14; TB.add(new THREE.SphereGeometry(1, 8, 5), snowM, 0.1 * Math.sin(y * 0.42 + 0.5), y, -0.3, 0, 0, 0, s * 1.2, s * 0.42, s * 1.7); }
  for (const [y, ang, len, , up] of stubs) TB.add(new THREE.SphereGeometry(1, 8, 5), snowM, Math.cos(ang) * (0.27 + len * (1 - up) * 0.5), y + len * up * 0.55 + 0.05, Math.sin(ang) * (0.27 + len * (1 - up) * 0.5), 0, 0, 0, 0.13, 0.06, 0.13);
  TB.build();
  // the snow blob on the upper stub: its own mesh, so it can fall off
  const blob = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 7), snowM); blob.scale.set(0.95, 0.42, 0.82); blob.position.set(0.55, 8.62, 0.0); blob.castShadow = false; blob.name = 'hsnowblob'; tree.add(blob);

  // ---- the fall
  const yF = L0 - 0.55, y0 = tree.position.y, tmp = new THREE.Vector3();
  const worldOf = (lx, ly, lz) => { tree.updateMatrixWorld(true); return tmp.set(lx, ly, lz).applyMatrix4(tree.matrixWorld); };
  // a puff of snow (the game's particle system: burst for the grains, a few big soft puffs on top); x, y, z in the world
  const puff = (fx, x, y, z, n, up = 1.3, sz = 0.6) => {
    if (!fx) return;
    fx.burst(x, y, z, '#f4f8ff', n, 1.2);
    for (let i = 0; i < Math.ceil(n * 0.4); i++) { const a = Math.random() * 6.283, s = 0.9 + Math.random() * 1.6; fx.spawn({ x: x + Math.cos(a) * 0.3, y: y + Math.random() * 0.3, z: z + Math.sin(a) * 0.3, vx: Math.cos(a) * s, vy: up * (0.4 + Math.random() * 0.7), vz: Math.sin(a) * s, color: '#f6faff', a: 0.55, s0: sz * 0.5, s1: sz * 1.8, life: 1.1 + Math.random() * 0.8, grav: 0.3, drag: 1.6, add: 0, cell: 1, fi: 0.1, fo: 0.5 }); }
  };
  let falling = false;
  const fell = (instant = false) => {
    if (instant) { tree.rotation.x = Math.PI / 2; tree.position.y = yF; blob.visible = false; return; }
    if (falling) return; falling = true;
    let th = 0.012, w = 0.12, t = 0, phase = 0, hop = 0, hv = 0, hops = 0, shed = 0;
    const bl = { on: false, v: new THREE.Vector3(), spin: new THREE.Vector3() };
    const step = (h, fx) => {
      t += h;
      if (phase === 0) {
        // an inverted pendulum about the foot: a slow creak, then the whip; a little sway at the start
        w += 6.8 * Math.sin(th + 0.1) * h; th += w * h;
        const k = Math.min(1, th / (Math.PI / 2));
        tree.rotation.z = 0.018 * Math.sin(t * 17) * Math.min(1, t * 2) * (1 - k);
        tree.rotation.x = Math.min(th, Math.PI / 2); tree.position.y = y0 + (yF - y0) * k * k;
        // snow shaken from the crown on the way
        shed += h; if (shed > 0.07 && th > 0.1) { shed = 0; const c = worldOf(0.1, Ht * (0.7 + Math.random() * 0.3), 0); puff(fx, c.x + ox, c.y, c.z + oz, 2, 0.4, 0.35); }
        // the blob lets go of its stub once the lean passes about 18 degrees
        if (!bl.on && th > 0.22) {
          bl.on = true; const p = worldOf(0.55, 8.62, 0.0).clone(); group.attach(blob); blob.position.copy(p).sub(group.position);
          const r = p.y - y0; bl.v.set(0.3, -0.25 - w * r * 0.03, 0.4 + w * r * 0.1); bl.spin.set(2.1, 1.1, 0.7);
        }
        if (th >= Math.PI / 2) {
          // the tip lands on the far bank: a thud, a snow puff, a small bounce
          phase = 1; tree.rotation.x = Math.PI / 2; tree.rotation.z = 0; tree.position.y = yF; hv = Math.min(2.6, 0.35 + w * 0.42); hop = 0.0001;
          const e = worldOf(0.1, Ht - 0.4, 0); puff(fx, e.x + ox, e.y + 0.5, e.z + oz, 26, 1.6, 0.9);
          const b0 = worldOf(0, 0.3, 0); puff(fx, b0.x + ox, b0.y + 0.4, b0.z + oz, 9, 0.9, 0.55);
        }
      } else if (phase === 1) {
        hv -= 13 * h; hop += hv * h;
        if (hop <= 0) {
          hop = 0; hops++;
          if (hops < 3 && Math.abs(hv) > 0.3) { hv = -hv * 0.36; const e = worldOf(0.1, Ht - 0.4, 0); puff(fx, e.x + ox, e.y + 0.4, e.z + oz, 6, 0.8, 0.5); } else { phase = 2; hv = 0; }
        }
        tree.position.y = yF + hop * 0.55; tree.rotation.x = Math.PI / 2 - hop * 0.09;
      }
      if (bl.on && blob.visible) {
        bl.v.y -= 9.8 * h; blob.position.addScaledVector(bl.v, h); blob.rotation.x += bl.spin.x * h; blob.rotation.y += bl.spin.y * h; blob.rotation.z += bl.spin.z * h;
        const g0 = H(blob.position.x, blob.position.z) + 0.15;
        if (blob.position.y < g0 && bl.v.y < 0) { puff(fx, blob.position.x + ox, g0 + 0.1, blob.position.z + oz, 14, 1.0, 0.7); blob.visible = false; }
      }
      return (phase === 2 && !(bl.on && blob.visible)) || t > 8;
    };
    updaters.push(function fall(dt, tt, fx) {
      let rem = Math.min(dt, 0.12), end = false;
      while (rem > 1e-6 && !end) { const h = Math.min(rem, 1 / 120); rem -= h; end = step(h, fx); }
      if (end) { tree.rotation.x = Math.PI / 2; tree.rotation.z = 0; tree.position.y = yF; blob.visible = false; updaters.splice(updaters.indexOf(fall), 1); }
    });
  };
  return { tree, fell, blob };
}
