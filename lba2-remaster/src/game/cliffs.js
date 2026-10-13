// Faceted rock faces along the terrace edges, as on LBA2's Citadel Island: the heightfield gives the cliffs
// their shape and collision, but at its 0.9 m resolution the faces are smooth stretched slopes. Here each
// stretch of cliff gets a row of angular blocks (flat-shaded, broken into two planes, with a bevelled lip),
// embedded in the slope and textured with the stratified cliff rock. Visual only: collision stays on the
// terrain, and the blocks sit inside the slope except for a few centimetres of relief.
import * as THREE from 'three';
import { rng } from '../engine/math.js';

export function buildCliffRocks(parent, terrain, tex, { skip = () => false, step = 1.9, minDrop = 1.75 } = {}) {
  const H = (x, z) => terrain.heightAt(x, z);
  const half = terrain.half - 2;
  const r = rng(77);
  const pos = [], uv = [], col = [];
  const c = new THREE.Color();
  const quad = (a, b, cc, d, shade) => {
    for (const p of [a, b, cc, a, cc, d]) {
      pos.push(p[0], p[1], p[2]);
      uv.push(p[3], p[4]);
      col.push(c.r * shade, c.g * shade, c.b * shade);
    }
  };
  let blocks = 0;
  for (let z = terrain.cz - half; z < terrain.cz + half; z += step) {
    for (let x = terrain.cx - half; x < terrain.cx + half; x += step) {
      const px = x + (r() - 0.5) * step * 0.7, pz = z + (r() - 0.5) * step * 0.7;
      if (terrain.slopeAt(px, pz) < 1.05 || skip(px, pz)) continue;
      // uphill direction
      const e = 0.5;
      let gx = H(px + e, pz) - H(px - e, pz), gz = H(px, pz + e) - H(px, pz - e);
      const gl = Math.hypot(gx, gz);
      if (gl < 1e-3) continue;
      gx /= gl; gz /= gl;
      // the drop: highest point a little uphill, lowest a little downhill
      let top = -1e9, bot = 1e9, tTop = 0, tBot = 0;
      for (let t = 0; t <= 2.6; t += 0.2) {
        const hu = H(px + gx * t, pz + gz * t), hd = H(px - gx * t, pz - gz * t);
        if (hu > top) { top = hu; tTop = t; }
        if (hd < bot) { bot = hd; tBot = t; }
      }
      if (top - bot < minDrop || bot < -1.6) continue;
      // centre of the face, where the height is half-way
      let tm = 0;
      for (let t = -tBot; t <= tTop; t += 0.1) if (H(px + gx * t, pz + gz * t) >= (top + bot) / 2) { tm = t; break; }
      const cx = px + gx * tm, cz = pz + gz * tm;
      const tx = -gz, tz = gx;                       // along the cliff
      const w = step * (0.95 + r() * 0.35);          // overlapping neighbours
      const depth = 1.0 + r() * 0.5;
      const out = 0.12 + r() * 0.22;                 // relief out of the slope at mid-height
      const y0 = bot - 0.35, y1 = top - 0.04 - r() * 0.12;
      const ym = y0 + (y1 - y0) * (0.4 + r() * 0.25);
      // corners: o = outer face (downhill), i = inner (in the hill)
      const P = (s, n, y) => {
        const X = cx + tx * s * w / 2 - gx * n, Z = cz + tz * s * w / 2 - gz * n;
        const U = (X * tx + Z * tz) * 0.32, V = y * 0.32;
        return [X, y, Z, U, V];
      };
      const skew = (r() - 0.5) * 0.3, lean = (r() - 0.5) * 0.2;
      const oB = [P(-1, out * 0.3 + skew * 0.3, y0), P(1, out * 0.3 - skew * 0.3, y0)];
      const oM = [P(-1.04, out + skew, ym), P(1.04, out - skew, ym)];
      const oT = [P(-0.94, out * 0.35 + lean, y1 - 0.18), P(0.94, out * 0.35 - lean, y1 - 0.12)];
      const lip = [P(-0.9, -0.2, y1), P(0.9, -0.2, y1)];
      const iT = [P(-0.9, -depth, y1), P(0.9, -depth, y1)];
      const iB = [P(-1, -depth, y0), P(1, -depth, y0)];
      const tone = 0.9 + r() * 0.1;
      c.setRGB(tone, tone * (0.98 + r() * 0.03), tone * (1.0 + r() * 0.04));
      quad(oB[0], oB[1], oM[1], oM[0], 0.82);        // lower face (in shade)
      quad(oM[0], oM[1], oT[1], oT[0], 1.0);         // upper face
      quad(oT[0], oT[1], lip[1], lip[0], 1.12);      // bevelled lip catching the light
      quad(lip[0], lip[1], iT[1], iT[0], 1.05);      // top (mostly under the grass edge)
      quad(iB[0], oB[0], oM[0], iT[0], 0.9);         // sides
      quad(oB[1], iB[1], iT[1], oM[1], 0.9);
      quad(oM[0], oT[0], lip[0], iT[0], 0.95);
      quad(oT[1], oM[1], iT[1], lip[1], 0.95);
      blocks++;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals(); // non-indexed: flat facets
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.95, flatShading: true, side: THREE.DoubleSide }));
  m.castShadow = true;
  m.receiveShadow = true;
  m.name = 'cliffRocks';
  parent.add(m);
  return { mesh: m, blocks };
}
