// Soft particles (FX-SOFT): one instanced draw call for every hit spark, pickup burst, steam column and warning ring.
//
// The old Particles were THREE.Points: hard 0.22 squares, one size, additive only, so every hit and pickup read as
// confetti. Here each particle is a camera-facing quad (like three's sprites and engine/spritebatch.js, which draws the
// cloud puffs the same way) cut from a small soft texture, with its own size over life, fade in / fade out, colour,
// drift and blend:
//
//   * ONE mesh, ONE draw call (none while no particle lives: instanceCount 0), the draw count of the Points it
//     replaces. SpriteBatch cannot carry a colour or fade per instance (one material opacity), which a spark fading out
//     and a steam puff need, so the instance data is per-particle attributes (offset, colour + alpha, size / blend /
//     cell / angle) read by a small ShaderMaterial. It is made when the Particles are made, with the scene's first
//     precompile, so a route after loading compiles nothing: the program replaces PointsMaterial's.
//   * premultiplied blending: the shader writes (rgb·a, a·(1 − add)); `add` 1 is additive light (sparks, glints),
//     0 is ordinary "over" (steam, smoke, dust: it shows on bright sand and snow where additive white vanishes), between
//     is both. No sorting: puffs of one colour blend the same in any order.
//   * the texture is one 2 × 2 atlas drawn on a canvas (no files): 0 round glow, 1 lumpy puff (a rotated blob reads as
//     a billow), 2 a ring and 3 a soft disc, both laid FLAT on the ground (the warning of a geyser), not camera-facing.
import * as THREE from 'three';

const CELL = 128;
let ATLAS = null;
function atlas() {
  if (ATLAS) return ATLAS;
  const cv = document.createElement('canvas'); cv.width = cv.height = CELL * 2;
  const g = cv.getContext('2d');
  const img = g.createImageData(CELL, CELL);
  const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // lobes of the puff (fixed: one billow shape, the angle of each particle makes them differ)
  const lobes = [[0, 0, 0.5, 0.42], [0.36, 0.08, 0.3, 0.3], [-0.3, 0.22, 0.3, 0.3], [0.08, -0.38, 0.3, 0.3], [-0.2, -0.28, 0.24, 0.24], [0.26, 0.34, 0.22, 0.22], [-0.42, -0.04, 0.2, 0.22]];
  const cells = [
    (x, y, r) => Math.max(0, Math.exp(-r * r * 4.6) - 0.01) * sm(1, 0.85, r),                                   // 0 glow
    (x, y) => { let s = 0; for (const [lx, ly, h, w] of lobes) s += h * Math.exp(-((x - lx) ** 2 + (y - ly) ** 2) / (w * w)); return Math.min(1, s * 1.15) * sm(0.98, 0.62, Math.hypot(x, y)); },   // 1 puff
    (x, y, r) => Math.min(1, Math.exp(-(((r - 0.86) / 0.07) ** 2)) + 0.07 * sm(0.0, 0.84, r) + 0.12 * sm(0.5, 0.86, r) * sm(0.98, 0.9, r)) * sm(1, 0.94, r),   // 2 ring
    (x, y, r) => 0.85 * sm(0.98, 0.35, r),                                                                  // 3 disc
  ];
  cells.forEach((f, c) => {
    for (let j = 0; j < CELL; j++) for (let i = 0; i < CELL; i++) {
      const x = (i + 0.5) / CELL * 2 - 1, y = (j + 0.5) / CELL * 2 - 1, r = Math.hypot(x, y);
      const a = r >= 1 ? 0 : Math.min(1, f(x, y, r)), k = (j * CELL + i) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = Math.round(a * 255);
    }
    g.putImageData(img, (c % 2) * CELL, (1 - (c >> 1)) * CELL);   // (cell row 0 is the bottom half: v runs up)
  });
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4;
  return (ATLAS = t);
}

const VS = /* glsl */`
attribute vec3 pOff;    // centre
attribute vec4 pCol;    // rgb, alpha
attribute vec4 pM;      // size (world units, 0 = dead), add 0..1, cell 0..3 (2 and 3 lie flat), angle
varying vec2 vUv; varying vec4 vCol; varying float vAdd;
void main() {
  vec4 mv = modelViewMatrix * vec4(pOff, 1.0);
  float cs = cos(pM.w), sn = sin(pM.w);
  vec2 p = position.xy * pM.x;
  p = vec2(cs * p.x - sn * p.y, sn * p.x + cs * p.y);
  if (pM.z > 1.5) mv.xyz += mat3(modelViewMatrix) * vec3(p.x, 0.0, -p.y); else mv.xy += p;
  gl_Position = projectionMatrix * mv;
  vec2 cell = vec2(mod(pM.z, 2.0), floor(pM.z * 0.5));
  vUv = (cell + position.xy + 0.5) * 0.5;
  vCol = pCol; vAdd = pM.y;
}`;
const FS = /* glsl */`
uniform sampler2D map;
varying vec2 vUv; varying vec4 vCol; varying float vAdd;
void main() {
  float a = texture2D(map, vUv).a * vCol.a;
  gl_FragColor = vec4(vCol.rgb * a, a * (1.0 - vAdd));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const rnd = Math.random;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

export class SoftParticles {
  constructor(scene, n = 900) {
    this.n = n; this.t = 0; this.live = false;
    // the arrays the GPU reads: pos (xyz), col (rgb + alpha), m (size, add, cell, angle)
    this.pos = new Float32Array(n * 3).fill(0);
    this.col = new Float32Array(n * 4);
    this.m = new Float32Array(n * 4);
    // the simulation
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n); this.max = new Float32Array(n).fill(1);
    this.p = new Float32Array(n * 10);   // per particle: a0, s0, s1, grav, drag, drift, spin, fi, fo, phase
    this.i = 0;
    const quad = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = quad.index; geo.setAttribute('position', quad.attributes.position);
    const dyn = (a) => a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('pOff', dyn(new THREE.InstancedBufferAttribute(this.pos, 3)));
    geo.setAttribute('pCol', dyn(new THREE.InstancedBufferAttribute(this.col, 4)));
    geo.setAttribute('pM', dyn(new THREE.InstancedBufferAttribute(this.m, 4)));
    geo.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: atlas() } }, vertexShader: VS, fragmentShader: FS,
      transparent: true, depthWrite: false, depthTest: true, fog: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.mesh.receiveShadow = false;
    this.mesh.name = 'softParticles'; this.mesh.userData.noMerge = true; this.mesh.renderOrder = 5;
    scene.add(this.mesh);
    this.c = new THREE.Color();
  }
  // one particle. o: x y z (centre) · vx vy vz · color (anything THREE.Color takes, or [r, g, b] linear) · a (peak alpha) · s0 s1 (size in
  // world units at birth and death) · life (s) · grav (m/s², negative rises) · drag (1/s) · drift (sideways wander)
  // · add (0 over … 1 additive) · cell (0 glow, 1 puff, 2 flat ring, 3 flat disc) · fi, fo (fraction of life the fade-in
  // ends and the fade-out starts) · spin (rad/s)
  spawn(o) {
    const i = this.i; this.i = (this.i + 1) % this.n;
    const c = Array.isArray(o.color) ? this.c.setRGB(o.color[0], o.color[1], o.color[2]) : this.c.set(o.color ?? '#ffffff'), k3 = i * 3, k4 = i * 4, k10 = i * 10;
    this.pos[k3] = o.x; this.pos[k3 + 1] = o.y; this.pos[k3 + 2] = o.z;
    this.vel[k3] = o.vx || 0; this.vel[k3 + 1] = o.vy || 0; this.vel[k3 + 2] = o.vz || 0;
    this.col[k4] = c.r; this.col[k4 + 1] = c.g; this.col[k4 + 2] = c.b; this.col[k4 + 3] = 0;
    const s0 = o.s0 ?? 0.3, cell = o.cell ?? 0;
    this.m[k4] = s0; this.m[k4 + 1] = o.add ?? 1; this.m[k4 + 2] = cell; this.m[k4 + 3] = o.rot ?? (cell >= 2 ? 0 : rnd() * 6.283);
    this.life[i] = this.max[i] = Math.max(0.05, o.life ?? 0.7);
    const P = this.p;
    P[k10] = o.a ?? 0.8; P[k10 + 1] = s0; P[k10 + 2] = o.s1 ?? s0; P[k10 + 3] = o.grav ?? 0; P[k10 + 4] = o.drag ?? 0; P[k10 + 5] = o.drift ?? 0;
    P[k10 + 6] = o.spin ?? (cell >= 2 ? 0 : (rnd() - 0.5) * 0.8); P[k10 + 7] = o.fi ?? 0.1; P[k10 + 8] = o.fo ?? 0.4; P[k10 + 9] = rnd() * 6.283;
    this.live = true; this.mesh.geometry.instanceCount = this.n;
    return i;
  }
  // a burst of `count` sparks (or, slow and soft, wisps) from a point: the call every hit, pickup and pylon makes
  burst(x, y, z, color, count = 10, speed = 3) {
    const c = this.c.set(color), lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    const glow = clamp((lum - 0.12) / 0.4, 0, 1);   // bright colours are light (additive), dark ones smoke
    const r = c.r, g = c.g, b = c.b;
    if (speed <= 1.3) {   // slow: smoke, steam, dust. They hang, rise a little, swell and thin out
      for (let k = 0; k < count; k++) {
        this.spawn({ x: x + (rnd() - 0.5) * 0.2, y: y + rnd() * 0.1, z: z + (rnd() - 0.5) * 0.2, vx: (rnd() - 0.5) * speed * 0.7, vy: 0.2 + rnd() * speed * 0.8, vz: (rnd() - 0.5) * speed * 0.7,
          color: [r, g, b], a: 0.4, s0: 0.14 + rnd() * 0.1, s1: 0.5 + rnd() * 0.35, life: 0.9 + rnd() * 0.9, grav: -0.1, drag: 0.9, drift: 0.5, add: Math.min(glow, 0.15), cell: 1, fi: 0.15, fo: 0.3 });
      }
      return;
    }
    for (let k = 0; k < count; k++) {
      const a = rnd() * Math.PI * 2, u = rnd() * 2 - 1, s = speed * (0.4 + rnd() * 0.6), rr = Math.sqrt(1 - u * u);
      this.spawn({ x, y, z, vx: Math.cos(a) * rr * s, vy: Math.abs(u) * s + 1, vz: Math.sin(a) * rr * s,
        color: [r, g, b], a: 0.95, s0: 0.17 + rnd() * 0.15, s1: 0.03, life: 0.5 + rnd() * 0.5, grav: 9, drag: 0.7, add: glow, cell: 0, fi: 0.04, fo: 0.25, spin: 0 });
    }
    if (count >= 5 && lum > 0.3) {   // a short flash at the centre: the hit reads as a spot of light first, then sparks
      this.spawn({ x, y, z, color: [r, g, b], a: 0.55, s0: 0.3 + speed * 0.07, s1: 0.8 + speed * 0.16, life: 0.2, add: glow, cell: 0, fi: 0.1, fo: 0.15, spin: 0 });
    }
  }
  update(dt) {
    if (!this.live) return;
    this.t += dt;
    const { pos, vel, life, max, col, m, p, n, t } = this;
    let alive = 0;
    for (let i = 0; i < n; i++) {
      let L = life[i];
      if (L <= 0) continue;
      L -= dt;
      const k3 = i * 3, k4 = i * 4, k10 = i * 10;
      if (L <= 0) { life[i] = 0; m[k4] = 0; col[k4 + 3] = 0; continue; }
      life[i] = L; alive++;
      const u = 1 - L / max[i], cell = m[k4 + 2];
      if (cell < 2) {
        vel[k3 + 1] -= p[k10 + 3] * dt;
        const dr = p[k10 + 4];
        if (dr > 0) { const f = Math.max(0, 1 - dr * dt); vel[k3] *= f; vel[k3 + 1] *= f; vel[k3 + 2] *= f; }
        const dd = p[k10 + 5];
        if (dd > 0) { const ph = p[k10 + 9]; vel[k3] += Math.sin(t * 1.7 + ph) * dd * dt; vel[k3 + 2] += Math.cos(t * 1.3 + ph * 1.7) * dd * dt; }
        pos[k3] += vel[k3] * dt; pos[k3 + 1] += vel[k3 + 1] * dt; pos[k3 + 2] += vel[k3 + 2] * dt;
        m[k4 + 3] += p[k10 + 6] * dt;
      }
      const e = 1 - (1 - u) * (1 - u);   // ease-out growth: a puff swells fast, then slowly
      m[k4] = p[k10 + 1] + (p[k10 + 2] - p[k10 + 1]) * e;
      const fi = p[k10 + 7], fo = p[k10 + 8];
      const ain = u < fi ? u / fi : 1, aout = u > fo ? (1 - u) / (1 - fo) : 1;
      col[k4 + 3] = p[k10] * ain * ain * (3 - 2 * ain) * aout * aout;
    }
    this.live = alive > 0;
    const g = this.mesh.geometry;
    if (!this.live) g.instanceCount = 0;
    g.attributes.pOff.needsUpdate = true; g.attributes.pCol.needsUpdate = true; g.attributes.pM.needsUpdate = true;
  }
}

// A steady column of puffs from a point (a vent, a flue): tick() it each frame while it runs. The puffs are born
// narrow, rise, swell and wander sideways, and thin out at the top, so the column billows instead of being a tube.
export class Plume {
  // rate puffs/s at level 1 · rise m/s · h height m · w0, w1 diameter at the base / at the top · a peak alpha
  constructor(o = {}) {
    Object.assign(this, { rate: 10, rise: 2.4, h: 8, w0: 0.6, w1: 3, color: '#f4f8ff', a: 0.5, add: 0.1, spread: 0.25, drift: 0.9, grav: -0.3 }, o);
    this.acc = 0;
  }
  tick(fx, dt, x, y, z, level = 1) {
    if (!fx || level <= 0) return;
    this.acc = Math.min(8, this.acc + this.rate * level * Math.min(dt, 0.1));
    while (this.acc >= 1) {
      this.acc -= 1;
      const rise = this.rise * (0.85 + rnd() * 0.3), life = this.h / rise * (0.9 + rnd() * 0.2);
      fx.spawn({ x: x + (rnd() - 0.5) * this.w0 * 0.5, y: y + rnd() * rise * dt, z: z + (rnd() - 0.5) * this.w0 * 0.5,
        vx: (rnd() - 0.5) * this.spread, vy: rise, vz: (rnd() - 0.5) * this.spread,
        color: this.color, a: this.a * (0.8 + rnd() * 0.4), s0: this.w0 * (0.7 + rnd() * 0.6), s1: this.w1 * (0.75 + rnd() * 0.5), life, grav: this.grav, drag: 0, drift: this.drift, add: this.add, cell: 1, fi: 0.1, fo: 0.4 });
    }
  }
}
