// ITEMS-1: the bonuses' shapes (actors.js PICK; the same models in the interface: itemlook.js). The user (8.11): the
// clover, the heart, the magic and the coins "don't look really good" (they were three balls, two balls and a cone, a
// ball with a stick, a disc in a ring).
//
// As in LBA1/LBA2 (the user's own SPRIRAW.HQR, looked at and described only; nothing copied): each bonus is a small,
// bright, flat-coloured picture read by its outline — a plump red heart with a glossy spot, a round blue flask with a
// neck and a flared lip, a four-leaf clover, a gold coin with a raised rim and a stamped mark. Here, twelve years on, the
// same things as small solid bodies:
//   heart   one smooth cushion in the shape of a heart (no seams between parts)
//   clover  four heart-shaped leaflets, notch outward, round a centre, on a curved stem
//   flask   a round-bellied flask: neck, flared lip and a stopper, one lathe
//   coin    a Kash on its edge: a raised rim round a sunk field, a K stamped on both faces
//
// Cost: each bonus is ONE mesh with ONE material, both made once and shared by every bonus of its kind (a coin rain is
// one draw call per coin and nothing new for the GPU to hold); they were 2–3 meshes each, with new geometries and a
// new material per spawn, never freed. The materials keep the old pickups' program (standard, no maps, no vertex
// colours, opaque), so nothing new compiles. Glow: lower than before (they were lamps), still bright enough to find.
import * as THREE from 'three';

// ------------------------------------------------------------------ helpers
// position + normal of several geometries (their normals as they are), as one non-indexed geometry; triangles of no
// area (a lathe's poles) are left out, and so are those `drop` says (by the face's normal: faces nobody can see)
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _n = new THREE.Vector3();
function merge(list, drop = null) {
  const pos = [], nrm = [];
  for (const g0 of list) {
    const g = g0.index ? g0.toNonIndexed() : g0, P = g.attributes.position, N = g.attributes.normal;
    for (let i = 0; i < P.count; i += 3) {
      _a.fromBufferAttribute(P, i); _b.fromBufferAttribute(P, i + 1); _c.fromBufferAttribute(P, i + 2);
      _n.subVectors(_c, _b).cross(_b.clone().sub(_a));
      if (_n.lengthSq() < 1e-14) continue;
      if (drop?.(_n.normalize().negate())) continue;
      for (let k = 0; k < 3; k++) { pos.push(P.getX(i + k), P.getY(i + k), P.getZ(i + k)); nrm.push(N.getX(i + k), N.getY(i + k), N.getZ(i + k)); }
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  out.computeBoundingSphere();
  return out;
}
const area = (P) => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
// An outline (x, y; closed, no repeated point; star-shaped about c) blown up into a smooth cushion `d` thick each side:
// ring k of `rings` is the outline shrunk toward c by cos θ and raised by d·sin θ (θ from 0 at the rim to 90° at the
// pole), with a superellipse exponent `e` (> 1: flatter faces, rounder edges). Front faces +z.
function cushion(outline, c, d, rings = 3, e = 1.4) {
  const P = area(outline) < 0 ? [...outline].reverse() : outline, N = P.length;
  const pos = [], idx = [];
  const sgn = (v) => Math.sign(v) * Math.abs(v) ** (1 / e);
  const ringAt = (k, side) => {
    const th = (k / rings) * Math.PI / 2, s = sgn(Math.cos(th)), z = side * d * sgn(Math.sin(th)), start = pos.length / 3;
    for (const [x, y] of P) pos.push(c[0] + (x - c[0]) * s, c[1] + (y - c[1]) * s, z);
    return start;
  };
  const rim = ringAt(0, 0);
  for (const side of [1, -1]) {
    let prev = rim;
    for (let k = 1; k < rings; k++) {
      const cur = ringAt(k, side);
      for (let i = 0; i < N; i++) {
        const j = (i + 1) % N, a = prev + i, b = prev + j, cc = cur + i, dd = cur + j;
        if (side > 0) idx.push(a, b, cc, b, dd, cc); else idx.push(a, cc, b, b, cc, dd);
      }
      prev = cur;
    }
    const pole = pos.length / 3; pos.push(c[0], c[1], side * d);
    for (let i = 0; i < N; i++) { const j = (i + 1) % N; if (side > 0) idx.push(prev + i, prev + j, pole); else idx.push(prev + i, pole, prev + j); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// the classic heart curve, plumped (`plump` of the side bulge from sin t), `n` points, fitted to `w` wide; its cleft at
// the top, its point at the bottom; returns [outline, centre]
function heartOutline(n, w, plump = 0.22) {
  // the curve finely, then `n` points evenly along it (from the cleft; n even keeps the point at the bottom)
  const F = [], M = 720;
  for (let i = 0; i < M; i++) {
    const t = (i / M) * Math.PI * 2, s = Math.sin(t);
    F.push([16 * ((1 - plump) * s * s * s + plump * s), 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]);
  }
  const L = [0]; for (let i = 1; i <= M; i++) { const p = F[i - 1], q = F[i % M]; L.push(L[i - 1] + Math.hypot(q[0] - p[0], q[1] - p[1])); }
  const P = []; let j = 0;
  for (let i = 0; i < n; i++) { const want = (i / n) * L[M]; while (L[j + 1] < want) j++; const f = (want - L[j]) / (L[j + 1] - L[j] || 1), p = F[j], q = F[(j + 1) % M]; P.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]); }
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const [x, y] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const k = w / (x1 - x0), cy = (y0 + y1) / 2;
  return [P.map(([x, y]) => [x * k, (y - cy) * k]), [0, (-1.5 - cy) * k]];
}

// ------------------------------------------------------------------ the shapes (made once)
const GEO = {};
const once = (k, make) => GEO[k] || (GEO[k] = make());

// the heart: 0.33 m wide, 0.12 m thick, centred
export const heartGeo = () => once('heart', () => {
  const [P, c] = heartOutline(30, 0.33);
  return merge([cushion(P, c, 0.06, 3, 1.5)]);
});

// the clover: four leaflets 0.16 m long in an X (as the original's picture), each cupped a little toward the front,
// round a small knot, and a stem curving down to the lower right; 0.33 m across the leaves.
export const cloverGeo = () => once('clover', () => {
  const parts = [];
  const [P0] = heartOutline(26, 0.17, 0.3);
  // the leaflet: the heart turned so its point (the bottom, y min) is at the origin and its cleft outward (+y)
  let ymin = 1e9; for (const [, y] of P0) ymin = Math.min(ymin, y);
  const P = P0.map(([x, y]) => [x, y - ymin - 0.008]);
  for (let i = 0; i < 4; i++) {
    const g = cushion(P, [0, 0.075], 0.022, 2, 1.25);
    g.rotateX(0.25);                                    // (cupped: its outer half toward the front)
    g.rotateZ(Math.PI / 4 + i * Math.PI / 2);
    parts.push(g);
  }
  const knot = new THREE.SphereGeometry(0.022, 6, 4); knot.scale(1, 1, 0.8); parts.push(knot);
  const stem = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, -0.004), new THREE.Vector3(0.01, -0.13, -0.012), new THREE.Vector3(0.075, -0.2, -0.004)), 5, 0.012, 4, false);
  parts.push(stem);
  const g = merge(parts);
  g.translate(0, 0.025, 0); g.scale(1.15, 1.15, 1.15);
  return g;
});

// the magic flask: a lathe, 0.24 m wide, 0.33 m tall, centred on its belly's middle
export const flaskGeo = () => once('flask', () => {
  const pr = [[0, -0.15], [0.055, -0.15], [0.092, -0.138], [0.115, -0.108], [0.122, -0.068], [0.114, -0.028], [0.092, 0.006], [0.058, 0.03], [0.038, 0.05], [0.034, 0.088],
    [0.05, 0.1], [0.052, 0.114], [0.04, 0.12], [0.03, 0.122], [0.033, 0.15], [0.026, 0.172], [0, 0.178]];
  const g = merge([new THREE.LatheGeometry(pr.map(([r, y]) => new THREE.Vector2(r, y)), 14)]);
  g.translate(0, -0.005, 0);
  return g;
});

// the Kash: 0.26 m across, 0.036 m thick at its rim, faces ±z (it stands on its edge and turns about y)
export const coinGeo = () => once('coin', () => {
  // the profile from the back face's centre out, over the edge and in to the front's centre; one lathe band per step,
  // so the rim's and the edge's corners stay crisp (smooth only round the coin)
  const pr = [[0, -0.007], [0.086, -0.007], [0.099, -0.018], [0.117, -0.018], [0.13, -0.009], [0.13, 0.009], [0.117, 0.018], [0.099, 0.018], [0.086, 0.007], [0, 0.007]];
  const bands = [];
  for (let i = 0; i + 1 < pr.length; i++) bands.push(new THREE.LatheGeometry([pr[i], pr[i + 1]].map(([r, y]) => new THREE.Vector2(r, y)), 16));
  const body = merge(bands);
  body.rotateX(Math.PI / 2);   // (lathe's y axis → z: the faces look along z)
  // the stamped K, raised 8 mm out of the field on both faces (under the rim's top, as on a real coin)
  const K = new THREE.Shape([[-0.037, -0.046], [-0.019, -0.046], [-0.019, -0.01], [0.017, -0.046], [0.041, -0.046], [0.002, 0.0], [0.039, 0.046], [0.016, 0.046], [-0.019, 0.01], [-0.019, 0.046], [-0.037, 0.046]].map(([x, y]) => new THREE.Vector2(x, y)));
  const kf = new THREE.ExtrudeGeometry(K, { depth: 0.009, bevelEnabled: false }); kf.translate(0, 0, 0.006);
  const k1 = merge([kf], (n) => n.z < -0.5);   // (its back is buried in the field)
  const k2 = k1.clone(); k2.rotateY(Math.PI);
  return merge([body, k1, k2]);
});

// the singing crystal (as before: three blue spikes from one root), its three parts now one mesh
export const crystalGeo = () => once('crystal', () => {
  const parts = [];
  for (const [rx, rz, s] of [[0, 0, 1], [0.5, 0.2, 0.62], [-0.45, -0.3, 0.55]]) {
    const g = new THREE.OctahedronGeometry(0.2, 0);
    g.scale(0.8 * s, 2.2 * s, 0.8 * s); g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, 0, rz))); g.translate(rz * -0.35, 0.2 * s, rx * 0.35);
    parts.push(g);
  }
  return merge(parts);
});

// ------------------------------------------------------------------ the materials (made once, shared)
const MATS = {};
export const bonusMat = (k) => MATS[k] || (MATS[k] = ({
  // a glossy cherry red, the original's white spot from the key light
  heart: () => new THREE.MeshStandardMaterial({ color: '#ff3448', emissive: '#b00a1e', emissiveIntensity: 0.65, roughness: 0.28 }),
  clover: () => new THREE.MeshStandardMaterial({ color: '#5ae25e', emissive: '#18982c', emissiveIntensity: 0.7, roughness: 0.45 }),
  // blue glass with the magic in it: smooth and bright, opaque (no sorting, no overdraw)
  flask: () => new THREE.MeshStandardMaterial({ color: '#4cb0ff', emissive: '#1450e0', emissiveIntensity: 0.7, roughness: 0.12 }),
  // gold: a third metal, so it still reads bright gold without a reflected sky (the game has none)
  coin: () => new THREE.MeshStandardMaterial({ color: '#ffd84a', emissive: '#b88000', emissiveIntensity: 0.6, metalness: 0.35, roughness: 0.32 }),
  crystal: () => new THREE.MeshStandardMaterial({ color: '#9fe8ff', emissive: '#2a9aff', emissiveIntensity: 1.8, roughness: 0.15, flatShading: true }),
})[k]());
