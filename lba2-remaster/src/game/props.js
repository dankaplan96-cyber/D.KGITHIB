// Interior props for LBA3: furniture, machines and the painted canvas
// textures they wear. LBA2's interiors were pre-rendered-looking models with
// rounded edges, wood grain, brass fittings and patterned fabrics; here
// every prop is built from bevelled boxes, lathe-turned parts, tubes and a
// few SDF sculpts (pillows, quilts, foliage), painted with procedural
// textures, and merged per material so a dense room stays cheap to draw.
import * as THREE from 'three';
import { rng } from '../engine/math.js';
import { sculptRigid } from '../engine/sculpt.js';

// ================================================================ geometry
const GC = new Map();
const cached = (key, make) => { let g = GC.get(key); if (!g) { g = make(); GC.set(key, g); } return g; };
const r3 = (v) => Math.round(v * 1000) / 1000;

// box with rounded/bevelled edges (all 12), centred on the origin
export function rbox(w, h, d, r = 0.03) {
  r = Math.min(r, w / 2 - 0.002, h / 2 - 0.002, d / 2 - 0.002);
  const key = `rb${r3(w)},${r3(h)},${r3(d)},${r3(r)}`;
  return cached(key, () => {
    if (r < 0.004) return new THREE.BoxGeometry(w, h, d);
    const iw = w / 2 - r, ih = h / 2 - r, c = Math.min(r * 0.6, iw, ih);
    const s = new THREE.Shape();
    s.moveTo(-iw + c, -ih); s.lineTo(iw - c, -ih); s.quadraticCurveTo(iw, -ih, iw, -ih + c);
    s.lineTo(iw, ih - c); s.quadraticCurveTo(iw, ih, iw - c, ih);
    s.lineTo(-iw + c, ih); s.quadraticCurveTo(-iw, ih, -iw, ih - c);
    s.lineTo(-iw, -ih + c); s.quadraticCurveTo(-iw, -ih, -iw + c, -ih);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(d - 2 * r, 0.001), bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 2, curveSegments: 2 });
    g.translate(0, 0, -Math.max(d - 2 * r, 0.001) / 2);
    return g;
  });
}
// extruded outline (shape in XY, extruded +z by depth, bevelled), centred in z
export function slab(key, shapeFn, depth, bevel = 0.015) {
  return cached('sl' + key + depth + bevel, () => {
    const s = new THREE.Shape(); shapeFn(s);
    const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(0.001, depth - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 10 });
    g.translate(0, 0, -Math.max(0.001, depth - 2 * bevel) / 2);
    return g;
  });
}
// lathe-turned part: profile [[radius, y], ...] bottom to top
export function lathe(pts, segs = 14) {
  return cached('la' + segs + pts.join(';'), () => {
    const g = new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(Math.max(a, 0.0001), b)), segs);
    g.userData.keepUV = true;
    return g;
  });
}
export function cyl(rt, rb, h, segs = 12, open = false) {
  return cached(`cy${r3(rt)},${r3(rb)},${r3(h)},${segs},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, segs, 1, open));
}
export function sphere(r, w = 10, h = 8) { return cached(`sp${r3(r)},${w},${h}`, () => new THREE.SphereGeometry(r, w, h)); }
export function torus(R, r, rs = 8, ts = 20, arc = Math.PI * 2) { return cached(`to${r3(R)},${r3(r)},${rs},${ts},${r3(arc)}`, () => new THREE.TorusGeometry(R, r, rs, ts, arc)); }
export function plane(w, h) { return cached(`pl${r3(w)},${r3(h)}`, () => { const g = new THREE.PlaneGeometry(w, h); g.userData.keepUV = true; return g; }); }
// pipe through a polyline with rounded bends
export function pipe(pts, r, bend = 0.22, radial = 10) {
  return cached('pi' + JSON.stringify(pts) + r + bend + radial, () => {
    const P = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    const path = new THREE.CurvePath();
    let cur = P[0].clone(), bends = 0;
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i];
      if (i < P.length - 1) {
        const c = P[i + 1];
        const d1 = b.clone().sub(a), d2 = c.clone().sub(b);
        const bb = Math.min(bend, d1.length() / 2, d2.length() / 2);
        const p1 = b.clone().sub(d1.normalize().multiplyScalar(bb));
        const p2 = b.clone().add(d2.normalize().multiplyScalar(bb));
        if (cur.distanceTo(p1) > 1e-4) path.add(new THREE.LineCurve3(cur, p1));
        path.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2));
        cur = p2; bends++;
      } else path.add(new THREE.LineCurve3(cur, b.clone()));
    }
    const g = new THREE.TubeGeometry(path, Math.ceil(path.getLength() * 6) + bends * 8, r, radial, false);
    g.userData.keepUV = true;
    return g;
  });
}
// soft sculpted shape (pillows, quilts, cushions, foliage): vertex-coloured
export const softMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
export function soft(def) { return sculptRigid(def); }

// ================================================================ merging kit
// Collects static parts per material and merges them into one mesh each.
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
export class Kit {
  constructor(group) { this.group = group; this.buckets = new Map(); this.stack = [new THREE.Matrix4()]; this.r = rng(7); }
  get top() { return this.stack[this.stack.length - 1]; }
  push(x, y, z, ry = 0) { _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(0, ry, 0)), _s.set(1, 1, 1)); this.stack.push(this.top.clone().multiply(_m)); return this; }
  pop() { this.stack.pop(); return this; }
  at(x, y, z, ry, fn) { this.push(x, y, z, ry); try { return fn(); } finally { this.pop(); } }
  _local(x, y, z, ry, o) {
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(o.rx || 0, ry, o.rz || 0, 'YXZ')), _s.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1));
    return this.top.clone().multiply(_m);
  }
  // static part
  add(geo, mat, x = 0, y = 0, z = 0, ry = 0, o = {}) {
    let b = this.buckets.get(mat);
    if (!b) { b = []; this.buckets.set(mat, b); }
    const jit = o.jit ? [this.r(), this.r()] : [0, 0];
    b.push({ geo, m: this._local(x, y, z, ry, o), s: [o.sx ?? 1, o.sy ?? 1, o.sz ?? 1], o: jit, swap: !!o.swap });
    return this;
  }
  // separate (animated) mesh, transformed by the current stack
  mesh(geo, mat, x = 0, y = 0, z = 0, ry = 0, o = {}) {
    const m = new THREE.Mesh(geo, mat);
    this._local(x, y, z, ry, o).decompose(m.position, m.quaternion, m.scale);
    m.castShadow = o.cast ?? true; m.receiveShadow = true;
    this.group.add(m);
    return m;
  }
  // a pivot group for animated assemblies, transformed by the current stack
  pivot(x = 0, y = 0, z = 0, ry = 0) {
    const g = new THREE.Group();
    this._local(x, y, z, ry, {}).decompose(g.position, g.quaternion, g.scale);
    this.group.add(g);
    return g;
  }
  flush() {
    for (const [mat, list] of this.buckets) {
      const geo = mergeEntries(list, mat.userData.tile || 0, !!mat.vertexColors);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = !mat.userData.noShadow; mesh.receiveShadow = true;
      this.group.add(mesh);
    }
    this.buckets.clear();
  }
}

function mergeEntries(list, tile, withColor) {
  let nv = 0, ni = 0;
  for (const e of list) { const n = e.geo.attributes.position.count; nv += n; ni += e.geo.index ? e.geo.index.count : n; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const col = withColor ? new Float32Array(nv * 3) : null;
  const idx = new Uint32Array(ni);
  const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  let vo = 0, io = 0;
  for (const e of list) {
    const g = e.geo, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, C = g.attributes.color;
    nm.getNormalMatrix(e.m);
    const flip = e.m.determinant() < 0;
    const [sx, sy, sz] = e.s;
    const rep = g.userData.uvRep || 1;
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i);
      const lx = v.x * sx, ly = v.y * sy, lz = v.z * sz;
      v.applyMatrix4(e.m);
      const k = (vo + i) * 3;
      pos[k] = v.x; pos[k + 1] = v.y; pos[k + 2] = v.z;
      if (N) { n.fromBufferAttribute(N, i); } else n.set(0, 1, 0);
      const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
      n.applyMatrix3(nm).normalize();
      nor[k] = n.x; nor[k + 1] = n.y; nor[k + 2] = n.z;
      let u, w;
      if (tile && !g.userData.keepUV) {
        if (ay >= ax && ay >= az) { u = lx; w = -lz; } else if (ax >= az) { u = lz; w = ly; } else { u = lx; w = ly; }
        if (e.swap) [u, w] = [w, u];
        u = u / tile + e.o[0]; w = w / tile + e.o[1];
      } else if (U) { u = U.getX(i) * rep + e.o[0]; w = U.getY(i) * rep + e.o[1]; } else { u = 0; w = 0; }
      uv[(vo + i) * 2] = u; uv[(vo + i) * 2 + 1] = w;
      if (col) { if (C) { col[k] = C.getX(i); col[k + 1] = C.getY(i); col[k + 2] = C.getZ(i); } else { col[k] = col[k + 1] = col[k + 2] = 1; } }
    }
    if (g.index) {
      const I = g.index.array;
      for (let i = 0; i < I.length; i += 3) {
        idx[io++] = I[i] + vo;
        if (flip) { idx[io++] = I[i + 2] + vo; idx[io++] = I[i + 1] + vo; } else { idx[io++] = I[i + 1] + vo; idx[io++] = I[i + 2] + vo; }
      }
    } else {
      for (let i = 0; i < P.count; i += 3) {
        idx[io++] = vo + i;
        if (flip) { idx[io++] = vo + i + 2; idx[io++] = vo + i + 1; } else { idx[io++] = vo + i + 1; idx[io++] = vo + i + 2; }
      }
    }
    vo += P.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  geo.computeBoundingSphere();
  return geo;
}

// ================================================================ painted textures
function cnv(w, h = w) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function toTex(c, repeat = true) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
const wrap9 = (W, H, fn) => { for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) fn(ox, oy); };
function rgb(hex) { const n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function css([r, g, b], a = 1) { return `rgba(${Math.max(0, Math.min(255, r | 0))},${Math.max(0, Math.min(255, g | 0))},${Math.max(0, Math.min(255, b | 0))},${a})`; }
function tone(hex, k, r = null, amt = 0) { const c = rgb(hex); const j = r ? 1 + (r() - 0.5) * amt : 1; return css(c.map((v) => v * k * j)); }
function blotch(x, W, H, r, n, colors, rmin, rmax, alpha) {
  for (let i = 0; i < n; i++) {
    const px = r() * W, py = r() * H, rr = rmin + r() * (rmax - rmin), c = rgb(colors[Math.floor(r() * colors.length)]);
    wrap9(W, H, (ox, oy) => {
      const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, rr);
      g.addColorStop(0, css(c, alpha)); g.addColorStop(1, css(c, 0));
      x.fillStyle = g; x.fillRect(px + ox - rr, py + oy - rr, rr * 2, rr * 2);
    });
  }
}
function speck(x, W, H, r, n, colors, alpha, size = 1.2) {
  for (let i = 0; i < n; i++) {
    x.globalAlpha = alpha * (0.4 + r() * 0.6); x.fillStyle = colors[Math.floor(r() * colors.length)];
    x.beginPath(); x.arc(r() * W, r() * H, 0.4 + r() * size, 0, 7); x.fill();
  }
  x.globalAlpha = 1;
}
// wood grain running vertically (v); base palette [light, mid, dark]
function grain(x, x0, y0, w, h, r, pal, lines = 14) {
  const [, mid, dark] = pal;
  for (let i = 0; i < lines; i++) {
    const px = x0 + r() * w, amp = 1 + r() * 3, ph = r() * 6;
    x.strokeStyle = css(rgb(r() < 0.6 ? dark : mid).map((v) => v * (0.9 + r() * 0.2)), 0.18 + r() * 0.3);
    x.lineWidth = 0.6 + r() * 1.6;
    x.beginPath();
    for (let yy = 0; yy <= h; yy += 8) x.lineTo(px + Math.sin((yy / h) * 6 + ph) * amp, y0 + yy);
    x.stroke();
  }
  // a knot or two with the grain bending around it
  if (r() < 0.5) {
    const kx = x0 + w * (0.25 + r() * 0.5), ky = y0 + h * (0.2 + r() * 0.6);
    for (let k = 4; k >= 1; k--) {
      x.strokeStyle = css(rgb(dark), 0.25); x.lineWidth = 1;
      x.beginPath(); x.ellipse(kx, ky, k * 2.2, k * 6, 0, 0, 7); x.stroke();
    }
    x.fillStyle = css(rgb(dark), 0.6); x.beginPath(); x.ellipse(kx, ky, 2, 4, 0, 0, 7); x.fill();
  }
}

const TC = new Map();
const tex = (key, make) => { let t = TC.get(key); if (!t) { t = make(); TC.set(key, t); } return t; };

export const TEX = {
  // furniture wood, 1 tile = 1 m
  wood: (pal) => tex('wood' + pal, () => {
    const P = { honey: ['#d29a5c', '#b07a42', '#7a4a22'], dark: ['#8a5a36', '#6a4026', '#3e2414'], red: ['#b86a44', '#94502e', '#5e2e18'], pale: ['#e2c08e', '#c8a06a', '#94683c'], grey: ['#a89a88', '#8a7c6a', '#5e5244'] }[pal];
    const S = 256, [c, x] = cnv(S); const r = rng(pal.length * 7 + 3);
    x.fillStyle = P[0]; x.fillRect(0, 0, S, S);
    // soft long streaks
    for (let i = 0; i < 26; i++) { x.fillStyle = css(rgb(P[r() < 0.5 ? 1 : 0]), 0.35); const px = r() * S; x.fillRect(px, 0, 3 + r() * 14, S); }
    grain(x, 0, 0, S, S, r, P, 46);
    speck(x, S, S, r, 120, [P[2]], 0.25, 0.8);
    return toTex(c);
  }),
  // floor planks, 1 tile = 2 m, boards 0.25 m running along v
  planks: (pal = 'honey') => tex('planks' + pal, () => {
    const P = { honey: ['#c98f52', '#a8703a', '#6e4220'], dark: ['#94603a', '#76482a', '#40261a'], grey: ['#9a9284', '#7e7668', '#4e483e'] }[pal];
    const S = 512, [c, x] = cnv(S); const r = rng(41);
    const n = 8, bw = S / n;
    for (let i = 0; i < n; i++) {
      let y = -Math.floor(r() * 200);
      while (y < S) {
        const len = 140 + Math.floor(r() * 220);
        // one brightness per plank (each channel used to get its own random factor, which shifted the hue:
        // green, pink and orange planks side by side)
        const kb = 0.84 + r() * 0.24, base = rgb(P[0]).map((v) => v * kb);
        x.fillStyle = css(base); x.fillRect(i * bw, y, bw, len);
        x.save(); x.beginPath(); x.rect(i * bw, y, bw, len); x.clip();
        grain(x, i * bw, y, bw, len, r, [css(base), P[1], P[2]], 9);
        x.restore();
        // bevel highlight + joint shadows
        x.fillStyle = 'rgba(255,235,200,0.18)'; x.fillRect(i * bw + 2, y, 2, len);
        x.fillStyle = css(rgb(P[2]), 0.85); x.fillRect(i * bw, y, 2, len); x.fillRect(i * bw, y, bw, 2);
        // nails at both ends
        x.fillStyle = 'rgba(40,26,16,0.8)';
        for (const yy of [y + 9, y + len - 9]) for (const xx of [i * bw + 12, i * bw + bw - 12]) { x.beginPath(); x.arc(xx, yy, 1.8, 0, 7); x.fill(); }
        y += len;
      }
    }
    blotch(x, S, S, r, 18, [P[2], P[0]], 30, 90, 0.12);
    return toTex(c);
  }),
  // square floor tiles, 1 tile = 2 m (4×4 tiles of 0.5 m)
  tiles: (a, b, grout, checker = false, n = 4, key = '') => tex(`tiles${a}${b}${grout}${checker}${n}${key}`, () => {
    const S = 512, [c, x] = cnv(S); const r = rng(a.length + n * 13 + (checker ? 5 : 0));
    x.fillStyle = grout; x.fillRect(0, 0, S, S);
    const t = S / n, gap = 3;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const base = (checker && (i + j) % 2) ? b : (checker ? a : (r() < 0.5 ? a : b));
      const kb = 0.88 + r() * 0.22, col = rgb(base).map((v) => v * kb); // (one factor: no hue drift)
      const x0 = i * t + gap, y0 = j * t + gap, s = t - gap * 2;
      const g = x.createLinearGradient(x0, y0, x0 + s, y0 + s);
      g.addColorStop(0, css(col.map((v) => v * 1.08))); g.addColorStop(1, css(col.map((v) => v * 0.9)));
      x.fillStyle = g; x.beginPath(); x.roundRect(x0, y0, s, s, 5); x.fill();
      x.save(); x.beginPath(); x.roundRect(x0, y0, s, s, 5); x.clip();
      for (let k = 0; k < 5; k++) { const px = x0 + r() * s, py = y0 + r() * s, rr = 8 + r() * 30; const gg = x.createRadialGradient(px, py, 0, px, py, rr); const cc = col.map((v) => v * (r() < 0.5 ? 0.82 : 1.12)); gg.addColorStop(0, css(cc, 0.45)); gg.addColorStop(1, css(cc, 0)); x.fillStyle = gg; x.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
      speck(x, S, S, () => r(), 0, [], 0);
      for (let k = 0; k < 40; k++) { x.fillStyle = css(col.map((v) => v * (r() < 0.5 ? 0.7 : 1.25)), 0.4); x.fillRect(x0 + r() * s, y0 + r() * s, 1.5, 1.5); }
      x.restore();
      x.strokeStyle = css(col.map((v) => v * 1.25), 0.55); x.lineWidth = 2;
      x.beginPath(); x.moveTo(x0 + 3, y0 + s - 3); x.lineTo(x0 + 3, y0 + 3); x.lineTo(x0 + s - 3, y0 + 3); x.stroke();
      x.strokeStyle = css(col.map((v) => v * 0.65), 0.6);
      x.beginPath(); x.moveTo(x0 + s - 2, y0 + 4); x.lineTo(x0 + s - 2, y0 + s - 2); x.lineTo(x0 + 4, y0 + s - 2); x.stroke();
    }
    return toTex(c);
  }),
  // repeating wallpaper, 1 tile = 1 m
  paper: (base, ink, motif = 'leaf') => tex('paper' + base + ink + motif, () => {
    const S = 256, [c, x] = cnv(S); const r = rng(base.length + motif.length);
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    blotch(x, S, S, r, 26, [base, ink], 20, 60, 0.12);
    // fine vertical stripes
    for (let i = 0; i < 16; i++) { x.fillStyle = css(rgb(ink), i % 2 ? 0.05 : 0.1); x.fillRect(i * 16, 0, i % 4 === 0 ? 3 : 1, S); }
    x.fillStyle = css(rgb(ink), 0.55); x.strokeStyle = css(rgb(ink), 0.55); x.lineWidth = 2;
    const cell = 64;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
      const cx = i * cell + (j % 2) * cell / 2 + cell / 4, cy = j * cell + cell / 2;
      wrap9(S, S, (ox, oy) => {
        x.save(); x.translate(cx + ox, cy + oy);
        if (motif === 'leaf') {
          for (let k = 0; k < 4; k++) { x.rotate(Math.PI / 2); x.beginPath(); x.ellipse(0, -8, 4, 8, 0, 0, 7); x.fill(); }
          x.beginPath(); x.arc(0, 0, 3, 0, 7); x.fillStyle = css(rgb(base).map((v) => v * 1.1)); x.fill(); x.fillStyle = css(rgb(ink), 0.55);
        } else if (motif === 'diamond') {
          x.beginPath(); x.moveTo(0, -12); x.lineTo(8, 0); x.lineTo(0, 12); x.lineTo(-8, 0); x.closePath(); x.stroke();
          x.beginPath(); x.arc(0, 0, 2.5, 0, 7); x.fill();
        } else if (motif === 'star') {
          x.beginPath(); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, rr = k % 2 ? 4 : 11; x.lineTo(Math.sin(a) * rr, -Math.cos(a) * rr); } x.closePath(); x.fill();
        }
        x.restore();
      });
    }
    speck(x, S, S, r, 200, [css(rgb(ink), 1), '#ffffff'], 0.12);
    return toTex(c);
  }),
  // plain interior plaster, 1 tile = 2 m
  plaster: (base = '#efe2c6') => tex('plaster' + base, () => {
    const S = 256, [c, x] = cnv(S); const r = rng(base.length * 3);
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    const b = rgb(base);
    blotch(x, S, S, r, 40, [css(b.map((v) => v * 0.92)), css(b.map((v) => v * 1.05)), css(b.map((v) => v * 0.97))].map((s) => { const m = s.match(/\d+/g); return '#' + m.slice(0, 3).map((q) => (+q).toString(16).padStart(2, '0')).join(''); }), 15, 60, 0.5);
    x.strokeStyle = css(b.map((v) => v * 0.8), 0.12); x.lineWidth = 2;
    for (let i = 0; i < 24; i++) { const px = r() * S, py = r() * S; x.beginPath(); x.arc(px, py, 10 + r() * 20, r() * 6, r() * 6 + 1.2); x.stroke(); }
    speck(x, S, S, r, 300, [css(b.map((v) => v * 0.8)), css(b.map((v) => v * 1.1))], 0.4);
    return toTex(c);
  }),
  // raised-panel wainscot, 1 tile = 1 m (two panels side by side, full tile height)
  wainscot: (pal = 'honey') => tex('wains' + pal, () => {
    const P = { honey: ['#b57a44', '#93602f', '#5e3a1a'], dark: ['#7c4e2e', '#5e3820', '#2e1a0e'], teal: ['#3f7f7a', '#2e625e', '#173836'], lav: ['#8a7fa6', '#6d6388', '#403a56'] }[pal];
    const S = 256, [c, x] = cnv(S); const r = rng(pal.length * 11);
    x.fillStyle = P[0]; x.fillRect(0, 0, S, S);
    grain(x, 0, 0, S, S, r, P, 30);
    for (let i = 0; i < 2; i++) {
      const x0 = i * 128 + 22, y0 = 30, w = 84, h = 196;
      // sunk bevel
      x.fillStyle = css(rgb(P[2]), 0.5); x.fillRect(x0 - 6, y0 - 6, w + 12, h + 12);
      const g = x.createLinearGradient(x0 - 6, y0 - 6, x0 + w + 6, y0 + h + 6);
      g.addColorStop(0, css(rgb(P[0]).map((v) => v * 1.25), 0.9)); g.addColorStop(0.5, css(rgb(P[1]), 0.2)); g.addColorStop(1, css(rgb(P[2]), 0.9));
      x.fillStyle = g; x.fillRect(x0 - 6, y0 - 6, w + 12, h + 12);
      x.fillStyle = P[1]; x.fillRect(x0, y0, w, h);
      x.save(); x.beginPath(); x.rect(x0, y0, w, h); x.clip(); grain(x, x0, y0, w, h, r, [P[1], P[0], P[2]], 10); x.restore();
      x.strokeStyle = css(rgb(P[0]).map((v) => v * 1.3), 0.6); x.lineWidth = 2; x.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2);
    }
    x.fillStyle = css(rgb(P[2]), 0.7); for (const xx of [0, 128]) x.fillRect(xx, 0, 2, S);
    return toTex(c);
  }),
  // dressed stone blocks, 1 tile = 2 m
  stone: (pal = 'grey') => tex('stone' + pal, () => {
    const P = { grey: ['#8f8a80', '#6d685f', '#4a4640'], blue: ['#7d8a96', '#5f6b78', '#3a4450'], lav: ['#a49cb8', '#857c9c', '#575070'], sand: ['#c2ad8a', '#a08c6c', '#6e5e46'], slate: ['#6c6f74', '#55575d', '#34363a'] }[pal];
    const S = 512, [c, x] = cnv(S); const r = rng(pal.length * 17);
    x.fillStyle = P[2]; x.fillRect(0, 0, S, S);
    let y = 0;
    while (y < S) {
      const h = Math.min(S - y, 52 + Math.floor(r() * 30));
      let xx = -Math.floor(r() * 60);
      while (xx < S) {
        const w = 80 + Math.floor(r() * 80);
        const kb = 0.88 + r() * 0.24, col = rgb(P[r() < 0.5 ? 0 : 1]).map((v) => v * kb);
        wrap9(S, 0, (ox) => {
          const g = x.createLinearGradient(0, y, 0, y + h);
          g.addColorStop(0, css(col.map((v) => v * 1.14))); g.addColorStop(0.25, css(col)); g.addColorStop(1, css(col.map((v) => v * 0.8)));
          x.fillStyle = g; x.beginPath(); x.roundRect(xx + ox + 3, y + 3, w - 6, h - 6, 8); x.fill();
          x.save(); x.beginPath(); x.roundRect(xx + ox + 3, y + 3, w - 6, h - 6, 8); x.clip();
          for (let k = 0; k < 4; k++) { const px = xx + ox + r() * w, py = y + r() * h, rr = 8 + r() * 22; const gg = x.createRadialGradient(px, py, 0, px, py, rr); const cc = col.map((v) => v * (r() < 0.5 ? 0.85 : 1.1)); gg.addColorStop(0, css(cc, 0.5)); gg.addColorStop(1, css(cc, 0)); x.fillStyle = gg; x.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
          x.restore();
        });
        xx += w;
      }
      y += h;
    }
    speck(x, S, S, r, 900, [P[2], '#ffffff', P[0]], 0.3);
    return toTex(c);
  }),
  // painted steel plates with seams and rivets, 1 tile = 1 m
  plates: (base = '#3f8a86', key = '') => tex('plates' + base + key, () => {
    const S = 256, [c, x] = cnv(S); const r = rng(base.length * 5 + key.length);
    const b = rgb(base);
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const x0 = i * 128, y0 = j * 128;
      const g = x.createLinearGradient(x0, y0, x0 + 128, y0 + 128);
      const k = 0.92 + r() * 0.14;
      g.addColorStop(0, css(b.map((v) => v * k * 1.1))); g.addColorStop(1, css(b.map((v) => v * k * 0.88)));
      x.fillStyle = g; x.fillRect(x0 + 2, y0 + 2, 124, 124);
      x.strokeStyle = css(b.map((v) => v * 0.45), 0.9); x.lineWidth = 2; x.strokeRect(x0 + 1, y0 + 1, 126, 126);
      x.strokeStyle = css(b.map((v) => v * 1.4), 0.5); x.lineWidth = 1; x.beginPath(); x.moveTo(x0 + 3, y0 + 125); x.lineTo(x0 + 3, y0 + 3); x.lineTo(x0 + 125, y0 + 3); x.stroke();
      for (let t = 0; t < 7; t++) for (const [rx, ry] of [[x0 + 9 + t * 18.3, y0 + 9], [x0 + 9 + t * 18.3, y0 + 119], [x0 + 9, y0 + 9 + t * 18.3], [x0 + 119, y0 + 9 + t * 18.3]]) {
        x.fillStyle = css(b.map((v) => v * 0.4), 0.8); x.beginPath(); x.arc(rx + 1, ry + 1, 2.8, 0, 7); x.fill();
        x.fillStyle = css(b.map((v) => v * 1.45)); x.beginPath(); x.arc(rx, ry, 2.4, 0, 7); x.fill();
      }
    }
    blotch(x, S, S, r, 14, ['#3a3026', '#c8b89a'], 10, 40, 0.12);
    x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 0.8;
    for (let i = 0; i < 30; i++) { const px = r() * S, py = r() * S; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (r() - 0.5) * 30, py + (r() - 0.5) * 8); x.stroke(); }
    // grime runs at the bottom of each plate
    for (let i = 0; i < 16; i++) { const px = r() * S, py = (r() < 0.5 ? 0 : 128) + 70 + r() * 40; const g = x.createLinearGradient(0, py, 0, py + 40); g.addColorStop(0, 'rgba(40,30,20,0)'); g.addColorStop(1, 'rgba(40,30,20,0.2)'); x.fillStyle = g; x.fillRect(px, py, 3 + r() * 5, 40); }
    return toTex(c);
  }),
  // diamond tread deck plate, 1 tile = 1 m
  tread: (base = '#8d8a9c') => tex('tread' + base, () => {
    const S = 256, [c, x] = cnv(S); const r = rng(9);
    const b = rgb(base);
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    blotch(x, S, S, r, 20, ['#5a5866', '#b4b0c2'], 20, 60, 0.25);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      const cx = i * 16 + (j % 2) * 8, cy = j * 16, a = (i + j) % 2 ? 0.6 : -0.6;
      x.save(); x.translate(cx, cy); x.rotate(a);
      x.fillStyle = css(b.map((v) => v * 0.6), 0.8); x.fillRect(-5, -1, 11, 3);
      x.fillStyle = css(b.map((v) => v * 1.35), 0.8); x.fillRect(-5, -2, 10, 2);
      x.restore();
    }
    x.strokeStyle = css(b.map((v) => v * 0.4)); x.lineWidth = 3; x.strokeRect(0, 0, S, S);
    return toTex(c);
  }),
  // brushed metal (tinted by material colour), 1 tile = 0.5 m
  brushed: () => tex('brushed', () => {
    const S = 128, [c, x] = cnv(S); const r = rng(77);
    x.fillStyle = '#d8d8d8'; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 160; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(90,90,90,0.18)'; x.fillRect(0, r() * S, S, 0.6 + r()); }
    blotch(x, S, S, r, 10, ['#a0a0a0', '#ffffff'], 10, 40, 0.25);
    return toTex(c);
  }),
  // patchwork quilt (for sculpt colours we sample this procedurally instead)
  fabric: (base, alt) => tex('fab' + base + alt, () => {
    const S = 128, [c, x] = cnv(S); const r = rng(base.length + 4);
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    for (let i = 0; i < S; i += 4) { x.fillStyle = css(rgb(alt), 0.12); x.fillRect(i, 0, 1, S); x.fillRect(0, i, S, 1); }
    blotch(x, S, S, r, 8, [alt], 10, 30, 0.15);
    return toTex(c);
  }),
  // rough rock / masonry section under the floor, 1 tile = 2 m
  rubble: (pal = 'grey') => tex('rubble' + pal, () => {
    const P = { grey: ['#7a7468', '#5c574e', '#33302b'], lav: ['#8a829c', '#6a6380', '#3a3548'], slate: ['#5c626a', '#464b52', '#25282c'] }[pal];
    const S = 256, [c, x] = cnv(S); const r = rng(pal.length * 23);
    x.fillStyle = P[2]; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 70; i++) {
      const px = r() * S, py = r() * S, rw = 10 + r() * 22, rh = 7 + r() * 13;
      const kb = 0.85 + r() * 0.3, col = rgb(P[r() < 0.5 ? 0 : 1]).map((v) => v * kb);
      wrap9(S, S, (ox, oy) => {
        const g = x.createLinearGradient(0, py + oy - rh, 0, py + oy + rh);
        g.addColorStop(0, css(col.map((v) => v * 1.2))); g.addColorStop(1, css(col.map((v) => v * 0.7)));
        x.fillStyle = g; x.beginPath(); x.ellipse(px + ox, py + oy, rw, rh, r() - 0.5, 0, 7); x.fill();
      });
    }
    speck(x, S, S, r, 400, [P[2], '#d8d0c0'], 0.35);
    return toTex(c);
  }),
};

// one-off canvases (not tiling)
export function canvasTex(w, h, draw) {
  const [c, x] = cnv(w, h);
  draw(x, w, h);
  const t = toTex(c, false);
  return t;
}

// patterned carpet with border bands, medallion and fringe (transparent fringe ends)
export function rugTex(pal, seed = 1) {
  return tex('rug' + pal.join() + seed, () => canvasTex(512, 384, (x, W, H) => {
    const r = rng(seed * 31 + 5);
    const [field, border, accent, light, dark] = pal;
    const F = 22; // fringe length (left/right ends)
    x.clearRect(0, 0, W, H);
    // fringe threads
    x.strokeStyle = '#efe6cf'; x.lineWidth = 2;
    for (let y = 6; y < H - 6; y += 5) { x.beginPath(); x.moveTo(0 + r() * 4, y); x.lineTo(F + 2, y); x.moveTo(W - F - 2, y); x.lineTo(W - r() * 4, y); x.stroke(); }
    const X0 = F, X1 = W - F;
    x.fillStyle = border; x.fillRect(X0, 0, X1 - X0, H);
    // guard stripes
    const band = (inset, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.strokeRect(X0 + inset, inset, X1 - X0 - inset * 2, H - inset * 2); };
    band(8, 4, light); band(46, 4, light); band(52, 3, dark);
    // repeated motif in the border band
    x.fillStyle = accent;
    const motif = (cx, cy, s) => { x.beginPath(); x.moveTo(cx, cy - s); x.lineTo(cx + s, cy); x.lineTo(cx, cy + s); x.lineTo(cx - s, cy); x.closePath(); x.fill(); x.fillStyle = light; x.beginPath(); x.arc(cx, cy, s * 0.35, 0, 7); x.fill(); x.fillStyle = accent; };
    for (let px = X0 + 40; px < X1 - 30; px += 30) { motif(px, 27, 10); motif(px, H - 27, 10); }
    for (let py = 54; py < H - 40; py += 30) { motif(X0 + 27, py, 10); motif(X1 - 27, py, 10); }
    // field
    x.fillStyle = field; x.fillRect(X0 + 56, 56, X1 - X0 - 112, H - 112);
    const fx0 = X0 + 56, fy0 = 56, fw = X1 - X0 - 112, fh = H - 112;
    x.save(); x.beginPath(); x.rect(fx0, fy0, fw, fh); x.clip();
    // trellis of small flowers
    x.fillStyle = css(rgb(dark), 0.35);
    for (let j = 0; j < 12; j++) for (let i = 0; i < 16; i++) { const cx = fx0 + i * 24 + (j % 2) * 12, cy = fy0 + j * 24; x.beginPath(); x.arc(cx, cy, 3, 0, 7); x.fill(); }
    // corner quarter medallions
    for (const [cx, cy] of [[fx0, fy0], [fx0 + fw, fy0], [fx0, fy0 + fh], [fx0 + fw, fy0 + fh]]) {
      x.fillStyle = border; x.beginPath(); x.arc(cx, cy, 52, 0, 7); x.fill();
      x.fillStyle = accent; x.beginPath(); x.arc(cx, cy, 38, 0, 7); x.fill();
      x.fillStyle = light; x.beginPath(); x.arc(cx, cy, 14, 0, 7); x.fill();
    }
    // central medallion: nested lozenges + petals
    const mx = fx0 + fw / 2, my = fy0 + fh / 2;
    const loz = (sx, sy, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(mx - sx, my); x.quadraticCurveTo(mx - sx * 0.3, my - sy * 0.3, mx, my - sy); x.quadraticCurveTo(mx + sx * 0.3, my - sy * 0.3, mx + sx, my); x.quadraticCurveTo(mx + sx * 0.3, my + sy * 0.3, mx, my + sy); x.quadraticCurveTo(mx - sx * 0.3, my + sy * 0.3, mx - sx, my); x.fill(); };
    loz(150, 100, dark); loz(138, 90, border); loz(110, 70, accent); loz(80, 50, light); loz(55, 34, border);
    x.fillStyle = accent;
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; x.beginPath(); x.ellipse(mx + Math.cos(a) * 20, my + Math.sin(a) * 14, 9, 5, a, 0, 7); x.fill(); }
    x.fillStyle = light; x.beginPath(); x.arc(mx, my, 7, 0, 7); x.fill();
    x.restore();
    // pile texture + wear
    for (let i = 0; i < 5000; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'; x.fillRect(X0 + r() * (X1 - X0), r() * H, 1.5, 1.5); }
    const g = x.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.6);
    g.addColorStop(0, 'rgba(255,240,220,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
    x.fillStyle = g; x.fillRect(X0, 0, X1 - X0, H);
  }));
}

// ================================================================ materials
const MC = new Map();
export function M(key, make) { let m = MC.get(key); if (!m) { m = make(); MC.set(key, m); } return m; }
const std = (o, tile = 0, extra = {}) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o }); m.userData.tile = tile; Object.assign(m.userData, extra); return m; };

export const MAT = {
  wood: (pal = 'honey') => M('w' + pal, () => std({ map: TEX.wood(pal), roughness: 0.62 }, 1)),
  planks: (pal = 'honey') => M('pk' + pal, () => std({ map: TEX.planks(pal), roughness: 0.75 }, 2)),
  tiles: (a, b, grout, checker, n = 4) => M(`ti${a}${b}${grout}${checker}${n}`, () => std({ map: TEX.tiles(a, b, grout, checker, n), roughness: 0.55 }, 2)),
  paper: (base, ink, motif) => M('pp' + base + ink + motif, () => std({ map: TEX.paper(base, ink, motif), roughness: 0.9 }, 1)),
  plaster: (base) => M('pl' + base, () => std({ map: TEX.plaster(base), roughness: 0.95 }, 2)),
  wainscot: (pal) => M('wa' + pal, () => std({ map: TEX.wainscot(pal), roughness: 0.6 }, 1)),
  stone: (pal = 'grey', tile = 2) => M('st' + pal + tile, () => std({ map: TEX.stone(pal), roughness: 0.9 }, tile)),
  rubble: (pal = 'grey') => M('ru' + pal, () => std({ map: TEX.rubble(pal), roughness: 0.95 }, 2)),
  plates: (base, tile = 1) => M('pt' + base + tile, () => std({ map: TEX.plates(base), roughness: 0.55, metalness: 0.35 }, tile)),
  tread: (base) => M('tr' + base, () => std({ map: TEX.tread(base), roughness: 0.6, metalness: 0.4 }, 1)),
  brass: () => M('brass', () => std({ map: TEX.brushed(), color: '#e0b25a', roughness: 0.32, metalness: 0.75 }, 0.5)),
  copper: () => M('copper', () => std({ map: TEX.brushed(), color: '#d58a5a', roughness: 0.35, metalness: 0.7 }, 0.5)),
  steel: () => M('steel', () => std({ map: TEX.brushed(), color: '#b8bcc4', roughness: 0.38, metalness: 0.7 }, 0.5)),
  iron: () => M('iron', () => std({ map: TEX.brushed(), color: '#4a4c54', roughness: 0.55, metalness: 0.55 }, 0.5)),
  paint: (c, rough = 0.6) => M('pa' + c + rough, () => std({ color: c, roughness: rough, map: TEX.brushed() }, 0.5)),
  cloth: (base, alt = '#000000') => M('cl' + base + alt, () => std({ map: TEX.fabric(base, alt), roughness: 0.95 }, 0.5)),
  flat: (c, rough = 0.8, extra = {}) => M('fl' + c + rough + JSON.stringify(extra), () => std({ color: c, roughness: rough, ...extra })),
  glow: (c, e, k = 1.5) => M('gl' + c + e + k, () => std({ color: c, emissive: e, emissiveIntensity: k, roughness: 0.4 }, 0, { noShadow: true })),
  glass: (c = '#bfe6ff', op = 0.35) => M('gs' + c + op, () => std({ color: c, roughness: 0.08, metalness: 0.1, transparent: true, opacity: op, depthWrite: false }, 0, { noShadow: true })),
  map: (t, rough = 0.85, extra = {}) => M('mp' + t.uuid, () => std({ map: t, roughness: rough, ...extra })),
};
export const softM = softMat;

// ================================================================ furniture & props
// Every builder draws at the kit's current transform: origin on the floor at
// the centre of the footprint, front facing +z.
const darker = (pal) => ({ honey: 'dark', pale: 'honey', red: 'dark', dark: 'dark', grey: 'dark' }[pal] || 'dark');
const gilt = () => MAT.flat('#d9a94a', 0.35, { metalness: 0.7 });

export function turnedLeg(h, r = 0.032) {
  const s = h / 0.72;
  return lathe([[r * 0.8, 0], [r * 1.05, 0.02 * s], [r * 0.9, 0.05 * s], [r * 0.72, 0.24 * s], [r * 1.1, 0.36 * s], [r * 0.7, 0.42 * s], [r * 0.95, 0.47 * s], [r * 1.25, 0.56 * s], [r * 1.25, 0.72 * s]], 10);
}
const bunFoot = () => lathe([[0.001, 0], [0.045, 0.004], [0.06, 0.035], [0.05, 0.07], [0.04, 0.09], [0.05, 0.1]], 10);

export function wardrobe(k, { w = 1.4, d = 0.62, h = 2.15, pal = 'honey' } = {}) {
  const m = MAT.wood(pal), md = MAT.wood(darker(pal)), br = MAT.brass();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(bunFoot(), md, sx * (w / 2 - 0.08), 0, sz * (d / 2 - 0.08));
  k.add(rbox(w + 0.04, 0.12, d + 0.03, 0.03), md, 0, 0.16, 0);
  const ch = h - 0.42, cy = 0.22 + ch / 2;
  k.add(rbox(w, ch, d, 0.035), m, 0, cy, 0);
  k.add(rbox(w + 0.08, 0.06, d + 0.05, 0.02), md, 0, h - 0.17, 0);
  k.add(rbox(w + 0.18, 0.12, d + 0.12, 0.05), m, 0, h - 0.08, 0);
  const cw = w * 0.32;
  k.add(slab('crest' + w, (s) => { s.moveTo(-cw, 0); s.lineTo(cw, 0); s.bezierCurveTo(cw * 0.6, 0.02, cw * 0.4, 0.2, 0, 0.2); s.bezierCurveTo(-cw * 0.4, 0.2, -cw * 0.6, 0.02, -cw, 0); }, 0.06), m, 0, h - 0.02, d / 2 - 0.03);
  const dh = ch - 0.14, dw = w / 2 - 0.06;
  for (const sx of [-1, 1]) {
    k.at(sx * (w / 4 + 0.005), cy, d / 2 + 0.015, 0, () => {
      k.add(rbox(dw, dh, 0.05, 0.015), m, 0, 0, 0, 0, { jit: true });
      k.add(rbox(dw - 0.17, dh * 0.5, 0.035, 0.025), md, 0, dh * 0.19, 0.02);
      k.add(rbox(dw - 0.17, dh * 0.26, 0.035, 0.025), md, 0, -dh * 0.3, 0.02);
      k.add(sphere(0.028, 8, 6), br, -sx * (dw / 2 - 0.07), -0.04, 0.05);
      k.add(rbox(0.04, 0.07, 0.01, 0.004), br, -sx * (dw / 2 - 0.07), 0.04, 0.03);
    });
  }
  k.add(rbox(0.035, dh, 0.03, 0.012), md, 0, cy, d / 2 + 0.05);
  return { hw: w / 2 + 0.05, hd: d / 2 + 0.05, top: h };
}

// soft sculpts ---------------------------------------------------------
function pillowGeo(w = 0.6, h = 0.16, d = 0.38, col = '#f7f1e3', key = 'pillow') {
  return soft({
    key: key + w + h + d + col,
    prims: [{ type: 'box', c: [0, 0, 0], h: [w / 2, h / 2, d / 2], round: h * 0.48, group: 'p', mat: 'c', wobble: (x, y, z) => Math.sin(x * 22) * Math.sin(z * 19) * 0.006 - Math.abs(x) * 0.03 * (1 - Math.abs(y) / h) }],
    groups: { p: 0.02 }, colors: { c: col },
    paint: (p, m, c) => { const e = Math.max(Math.abs(p.x) / (w / 2), Math.abs(p.z) / (d / 2)); if (e > 0.9) c.multiplyScalar(0.9); },
    bounds: { min: [-w / 2 - 0.05, -h / 2 - 0.05, -d / 2 - 0.05], max: [w / 2 + 0.05, h / 2 + 0.05, d / 2 + 0.05] }, cell: 0.022,
  });
}
// patchwork quilt draped over a bed (w across, l along z), top at y=0
function quiltGeo(w, l, drop, pal, key) {
  return soft({
    key: 'quilt' + key,
    prims: [
      { type: 'box', c: [0, -drop / 2, 0], h: [w / 2, drop / 2, l / 2], round: 0.06, group: 'q', mat: 'q', wobble: (x, y, z) => Math.sin(x * 9 + z * 3) * Math.sin(z * 7) * 0.012 + (y < -drop * 0.5 ? Math.sin(z * 24) * 0.012 : 0) },
      { type: 'cone', a: [-w / 2 - 0.01, 0.0, -l / 2 + 0.06], b: [w / 2 + 0.01, 0.0, -l / 2 + 0.06], r1: 0.065, r2: 0.065, group: 'q', mat: 's' },
    ],
    groups: { q: 0.05 }, colors: { q: pal[0], s: '#f4efe2' },
    paint: (p, m, c) => {
      if (m !== 'q') return;
      const edge = Math.min(w / 2 - Math.abs(p.x), l / 2 - Math.abs(p.z));
      if (p.y < -0.05 || edge < 0.1) { c.set(pal[1]); if (p.y < -drop + 0.06) c.set(pal[3] || pal[1]); return; }
      const i = Math.floor((p.x + 5) / 0.24), j = Math.floor((p.z + 5) / 0.24);
      c.set(pal[(i * 3 + j * 5) % pal.length]);
      const fx = ((p.x + 5) / 0.24) % 1, fz = ((p.z + 5) / 0.24) % 1;
      if (fx < 0.07 || fx > 0.93 || fz < 0.07 || fz > 0.93) c.multiplyScalar(0.78);
    },
    bounds: { min: [-w / 2 - 0.06, -drop - 0.06, -l / 2 - 0.08], max: [w / 2 + 0.06, 0.1, l / 2 + 0.06] }, cell: 0.042,
  });
}

export function bed(k, { w = 1.45, l = 2.15, pal = 'honey', quilt = ['#3b6fc4', '#e9c46a', '#c8452f', '#f2ead6', '#5f9e5a'], key = 'b' } = {}) {
  const m = MAT.wood(pal), md = MAT.wood(darker(pal));
  const post = (h) => lathe([[0.045, 0], [0.05, 0.05], [0.04, 0.12], [0.036, h * 0.45], [0.05, h * 0.5], [0.036, h * 0.55], [0.036, h - 0.12], [0.05, h - 0.1], [0.03, h - 0.07], [0.055, h - 0.04], [0.04, h], [0.001, h + 0.01]], 10);
  const hb = 1.12, fb = 0.78;
  for (const sx of [-1, 1]) { k.add(post(hb), md, sx * (w / 2), 0, -l / 2); k.add(post(fb), md, sx * (w / 2), 0, l / 2); }
  const hw = w / 2 - 0.03;
  k.add(slab('hb' + w, (s) => { s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, 0.42); s.bezierCurveTo(hw * 0.5, 0.44, hw * 0.4, 0.62, 0, 0.62); s.bezierCurveTo(-hw * 0.4, 0.62, -hw * 0.5, 0.44, -hw, 0.42); s.lineTo(-hw, 0); }, 0.05), m, 0, 0.42, -l / 2);
  k.add(slab('hbi' + w, (s) => { const a = hw - 0.12; s.moveTo(-a, 0); s.lineTo(a, 0); s.lineTo(a, 0.26); s.bezierCurveTo(a * 0.5, 0.28, a * 0.4, 0.4, 0, 0.4); s.bezierCurveTo(-a * 0.4, 0.4, -a * 0.5, 0.28, -a, 0.26); s.lineTo(-a, 0); }, 0.02, 0.008), md, 0, 0.52, -l / 2 + 0.03);
  k.add(slab('fb' + w, (s) => { s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, 0.24); s.quadraticCurveTo(0, 0.34, -hw, 0.24); s.lineTo(-hw, 0); }, 0.05), m, 0, 0.36, l / 2);
  for (const sx of [-1, 1]) k.add(rbox(0.06, 0.18, l - 0.08, 0.02), m, sx * (w / 2 - 0.01), 0.3, 0, 0, { swap: true });
  k.add(rbox(w - 0.08, 0.2, l - 0.1, 0.07), MAT.cloth('#f2ece0', '#c8b8a0'), 0, 0.47, 0);
  k.add(quiltGeo(w + 0.06, l * 0.7, 0.3, quilt, key + w + l), softMat, 0, 0.64, l * 0.15 - 0.02);
  k.add(pillowGeo(0.58, 0.15, 0.36, '#fbf6ea'), softMat, -0.3, 0.64, -l / 2 + 0.3, 0.12);
  k.add(pillowGeo(0.58, 0.15, 0.36, '#f4e7c8', 'pillow2'), softMat, 0.3, 0.65, -l / 2 + 0.28, -0.1);
  return { hw: w / 2 + 0.06, hd: l / 2 + 0.06, top: 0.7 };
}

export function table(k, { w = 1.5, d = 0.9, h = 0.78, pal = 'honey', round = false } = {}) {
  const m = MAT.wood(pal), md = MAT.wood(darker(pal));
  if (round) {
    k.add(lathe([[0.001, 0], [w / 2 - 0.02, 0], [w / 2, 0.015], [w / 2, 0.035], [w / 2 - 0.02, 0.05], [0.001, 0.05]], 24), m, 0, h - 0.05, 0);
    k.add(lathe([[0.22, 0], [0.24, 0.03], [0.1, 0.08], [0.06, 0.2], [0.05, h * 0.5], [0.08, h * 0.6], [0.05, h * 0.7], [0.07, h - 0.05]], 12), md, 0, 0, 0);
    return { r: w / 2, top: h };
  }
  k.add(rbox(w, 0.06, d, 0.025), m, 0, h - 0.03, 0, 0, { jit: true });
  k.add(rbox(w - 0.18, 0.1, d - 0.18, 0.015), md, 0, h - 0.11, 0);
  const leg = turnedLeg(h - 0.06);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    k.add(leg, md, sx * (w / 2 - 0.12), 0, sz * (d / 2 - 0.12));
  }
  return { hw: w / 2, hd: d / 2, top: h };
}

export function chair(k, { pal = 'honey', cushion = '#c8452f' } = {}) {
  const m = MAT.wood(pal), md = MAT.wood(darker(pal));
  k.add(rbox(0.46, 0.045, 0.44, 0.015), m, 0, 0.45, 0);
  const leg = turnedLeg(0.43, 0.024);
  for (const sx of [-1, 1]) k.add(leg, md, sx * 0.19, 0, 0.18);
  const back = lathe([[0.024, 0], [0.028, 0.03], [0.022, 0.2], [0.026, 0.43], [0.022, 0.46], [0.02, 0.9], [0.028, 0.93], [0.016, 0.98], [0.001, 0.99]], 8);
  for (const sx of [-1, 1]) k.add(back, md, sx * 0.19, 0, -0.19, 0, { rx: -0.06 });
  k.add(slab('chairtop', (s) => { s.moveTo(-0.2, 0); s.quadraticCurveTo(0, 0.04, 0.2, 0); s.lineTo(0.2, 0.09); s.quadraticCurveTo(0, 0.16, -0.2, 0.09); s.lineTo(-0.2, 0); }, 0.035, 0.01), m, 0, 0.8, -0.215, 0, { rx: -0.06 });
  k.add(slab('splat', (s) => { s.moveTo(-0.05, 0); s.lineTo(0.05, 0); s.bezierCurveTo(0.03, 0.08, 0.1, 0.18, 0.06, 0.3); s.lineTo(-0.06, 0.3); s.bezierCurveTo(-0.1, 0.18, -0.03, 0.08, -0.05, 0); }, 0.022, 0.006), m, 0, 0.49, -0.2, 0, { rx: -0.06 });
  for (const z of [0.18, -0.19]) k.add(cyl(0.012, 0.012, 0.38, 6), md, 0, 0.15, z, 0, { rz: Math.PI / 2 });
  for (const sx of [-1, 1]) k.add(cyl(0.012, 0.012, 0.37, 6), md, sx * 0.19, 0.13, 0, 0, { rx: Math.PI / 2 });
  if (cushion) k.add(pillowGeo(0.42, 0.06, 0.4, cushion, 'cush'), softMat, 0, 0.5, 0.01);
  return { hw: 0.25, hd: 0.25, top: 0.5 };
}

// LBA2's armchair (Twinsen's house): deep teal upholstery, rolled arms capped with curved wood, a wooden base
export function armchair(k, { fabric = '#2f6f78', pal = 'honey' } = {}) {
  const m = MAT.wood(pal), md = MAT.wood(darker(pal)), f = MAT.cloth(fabric, new THREE.Color(fabric).multiplyScalar(0.7).getStyle());
  k.add(rbox(0.86, 0.12, 0.78, 0.03), md, 0, 0.1, 0);                                   // base
  k.add(rbox(0.62, 0.16, 0.62, 0.05), f, 0, 0.3, 0.04);                                  // seat cushion
  k.add(rbox(0.66, 0.62, 0.18, 0.07), f, 0, 0.62, -0.3, 0, { rx: -0.12 });               // back
  for (const sx of [-1, 1]) {
    k.add(rbox(0.13, 0.36, 0.7, 0.05), f, sx * 0.37, 0.36, 0.0);                         // arm
    k.add(slab('armcap', (s) => { s.moveTo(-0.35, 0); s.lineTo(0.3, 0); s.quadraticCurveTo(0.42, 0.02, 0.38, 0.14); s.lineTo(-0.35, 0.1); s.lineTo(-0.35, 0); }, 0.15, 0.02), m, sx * 0.37 - 0.075, 0.54, 0.02, -Math.PI / 2, { ry: 0 });
  }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) k.add(cyl(0.035, 0.025, 0.05, 8), md, sx * 0.36, 0.025, sz * 0.32);
  return { hw: 0.46, hd: 0.42, top: 0.62 };
}

export function bench(k, { w = 1.2, pal = 'honey' } = {}) {
  const m = MAT.wood(pal), md = MAT.wood(darker(pal));
  k.add(rbox(w, 0.06, 0.34, 0.02), m, 0, 0.44, 0);
  for (const sx of [-1, 1]) k.add(slab('benchleg', (s) => { s.moveTo(-0.15, 0); s.lineTo(-0.1, 0); s.quadraticCurveTo(0, 0.12, 0.1, 0); s.lineTo(0.15, 0); s.lineTo(0.13, 0.41); s.lineTo(-0.13, 0.41); s.lineTo(-0.15, 0); }, 0.05), md, sx * (w / 2 - 0.12), 0, 0, Math.PI / 2);
  k.add(rbox(w - 0.3, 0.06, 0.03, 0.01), md, 0, 0.3, 0);
  return { hw: w / 2, hd: 0.18, top: 0.47 };
}

// pots, jars, kitchenware -----------------------------------------------
export function pot(k, x, y, z, { r = 0.13, h = 0.16, mat = null, lid = true } = {}) {
  const m = mat || MAT.copper();
  k.add(lathe([[0.001, 0], [r * 0.85, 0], [r, 0.02], [r, h], [r * 1.06, h + 0.01], [r * 0.98, h + 0.012]], 16), m, x, y, z);
  for (const s of [-1, 1]) k.add(torus(0.035, 0.008, 5, 10, Math.PI), MAT.iron(), x + s * (r + 0.02), y + h * 0.8, z, s > 0 ? -Math.PI / 2 : Math.PI / 2, { rx: 0 });
  if (lid) { k.add(lathe([[0.001, 0.03], [r * 0.95, 0], [r * 0.98, 0.006], [r * 0.5, 0.035], [0.02, 0.04], [0.025, 0.06], [0.001, 0.065]], 14), m, x, y + h + 0.01, z); }
}
export function kettle(k, x, y, z, mat = null) {
  const m = mat || MAT.flat('#3a6fb0', 0.35, { metalness: 0.2 });
  k.add(lathe([[0.001, 0], [0.1, 0], [0.12, 0.05], [0.115, 0.12], [0.07, 0.17], [0.04, 0.18], [0.05, 0.19], [0.001, 0.2]], 14), m, x, y, z);
  k.add(pipe([[0.09, 0.06, 0], [0.18, 0.12, 0], [0.22, 0.2, 0]], 0.018, 0.05, 6), m, x, y, z);
  k.add(torus(0.08, 0.012, 5, 12, Math.PI), MAT.flat('#2a1a10', 0.6), x, y + 0.19, z);
}
const JARS = {
  crock: [[0.001, 0], [0.07, 0], [0.085, 0.03], [0.09, 0.12], [0.07, 0.17], [0.055, 0.18], [0.06, 0.2], [0.001, 0.2]],
  jar: [[0.001, 0], [0.06, 0], [0.065, 0.01], [0.065, 0.15], [0.05, 0.165], [0.05, 0.18], [0.054, 0.185], [0.001, 0.19]],
  bottle: [[0.001, 0], [0.045, 0], [0.05, 0.01], [0.05, 0.16], [0.02, 0.21], [0.016, 0.27], [0.02, 0.28], [0.001, 0.285]],
  vase: [[0.001, 0], [0.05, 0], [0.06, 0.02], [0.1, 0.1], [0.08, 0.18], [0.04, 0.24], [0.055, 0.28], [0.06, 0.29], [0.04, 0.29]],
  urn: [[0.001, 0], [0.08, 0], [0.07, 0.03], [0.13, 0.15], [0.14, 0.24], [0.1, 0.33], [0.07, 0.36], [0.085, 0.4], [0.07, 0.41]],
};
export function jar(k, x, y, z, kind = 'jar', color = '#c8452f', s = 1) {
  const glaze = kind === 'bottle' ? MAT.flat(color, 0.15, { metalness: 0.1, transparent: true, opacity: 0.85 }) : MAT.flat(color, 0.35);
  k.add(lathe(JARS[kind].map(([a, b]) => [a * s, b * s]), 12), glaze, x, y, z);
  if (kind === 'jar') k.add(lathe([[0.001, 0], [0.066 * s, 0], [0.07 * s, 0.015 * s], [0.04 * s, 0.03 * s], [0.001, 0.035 * s]], 10), MAT.cloth('#e8dcc0', '#a08060'), x, y + 0.18 * s, z);
  if (kind === 'bottle') k.add(cyl(0.017 * s, 0.015 * s, 0.03 * s, 6), MAT.wood('pale'), x, y + 0.29 * s, z);
  if (kind === 'crock') k.add(lathe([[0.001, 0], [0.065 * s, 0], [0.06 * s, 0.02 * s], [0.015 * s, 0.03 * s], [0.02 * s, 0.05 * s], [0.001, 0.055 * s]], 10), glaze, x, y + 0.2 * s, z);
}
export function plate(k, x, y, z, ry = 0, color = '#f2ead6', r = 0.11, upright = true) {
  const g = lathe([[0.001, 0], [r * 0.6, 0], [r, 0.02], [r * 1.02, 0.024], [r * 0.95, 0.024], [r * 0.55, 0.008], [0.001, 0.008]], 16);
  if (upright) k.add(g, MAT.flat(color, 0.3), x, y + r, z, ry, { rx: Math.PI / 2 - 0.25 });
  else k.add(g, MAT.flat(color, 0.3), x, y, z, ry);
}

// shelves, books -------------------------------------------------------
const BOOKS = ['#7a2a22', '#2a4a7a', '#2f5e3a', '#8a6a2a', '#5a2a5a', '#a0522d', '#1f3a4a', '#6b6b2a'];
export function books(k, x0, x1, y, z, depth, seed = 1, pal = BOOKS) {
  const r = rng(seed * 97 + 13);
  let x = x0;
  while (x < x1 - 0.03) {
    const t = 0.022 + r() * 0.035, h = 0.17 + r() * 0.1, dd = depth * (0.78 + r() * 0.2);
    if (x + t > x1) break;
    if (r() < 0.08) { x += 0.05 + r() * 0.08; continue; }
    const col = pal[Math.floor(r() * pal.length)];
    const lean = x1 - x < 0.2 && r() < 0.6 ? -0.28 : 0;
    k.add(rbox(t, h, dd, 0.005), MAT.cloth(col, '#000000'), x + t / 2 + (lean ? h * 0.13 : 0), y + h / 2 - (lean ? h * 0.02 : 0), z + dd / 2, 0, { rz: lean });
    if (!lean && r() < 0.55) for (const fy of [0.15, 0.82]) k.add(new THREE.BoxGeometry(t + 0.002, 0.01, 0.004), gilt(), x + t / 2, y + h * fy, z + dd + 0.001);
    x += t + 0.002;
    if (lean) break;
  }
}
export function bookStack(k, x, y, z, n = 3, seed = 2) {
  const r = rng(seed * 7 + 1);
  let yy = y;
  for (let i = 0; i < n; i++) { const t = 0.035 + r() * 0.03; k.add(rbox(0.2 + r() * 0.06, t, 0.15 + r() * 0.05, 0.006), MAT.cloth(BOOKS[Math.floor(r() * BOOKS.length)], '#000000'), x, yy + t / 2, z, (r() - 0.5) * 0.5); yy += t; }
  return yy;
}
export function wallShelf(k, { w = 1.6, d = 0.26, pal = 'honey' } = {}) {
  const m = MAT.wood(pal), md = MAT.wood(darker(pal));
  k.add(rbox(w, 0.045, d, 0.014), m, 0, 0, 0, 0, { jit: true });
  k.add(rbox(w - 0.04, 0.025, 0.02, 0.008), md, 0, -0.03, d / 2 - 0.01);
  for (const sx of [-1, 1]) {
    k.add(slab('bracket' + d, (s) => { s.moveTo(d / 2, 0); s.lineTo(-d / 2 + 0.03, 0); s.bezierCurveTo(-d / 2 + 0.03, -0.06, d / 2 - 0.06, -0.06, d / 2 - 0.04, -0.2); s.lineTo(d / 2, -0.22); s.lineTo(d / 2, 0); }, 0.03, 0.008), md, sx * (w / 2 - 0.16), -0.02, 0, Math.PI / 2);
  }
  return 0.022;
}
export function bookcase(k, { w = 1.1, h = 2.0, d = 0.36, pal = 'dark', seed = 1, shelves = 4, fill = true } = {}) {
  const m = MAT.wood(pal), md = MAT.wood(darker(pal));
  for (const sx of [-1, 1]) k.add(rbox(0.05, h - 0.1, d, 0.012), m, sx * (w / 2 - 0.025), (h - 0.1) / 2 + 0.06, 0);
  k.add(rbox(w + 0.04, 0.08, d + 0.03, 0.02), md, 0, 0.04, 0);
  k.add(rbox(w + 0.1, 0.07, d + 0.06, 0.025), md, 0, h - 0.03, 0);
  k.add(rbox(w + 0.04, 0.05, d + 0.03, 0.015), m, 0, h - 0.09, 0);
  k.add(rbox(w - 0.08, h - 0.15, 0.02, 0.005), md, 0, h / 2, -d / 2 + 0.012);
  const step = (h - 0.2) / shelves;
  for (let i = 0; i < shelves; i++) {
    const y = 0.1 + i * step;
    k.add(rbox(w - 0.08, 0.035, d - 0.03, 0.008), m, 0, y, 0);
    if (fill) books(k, -w / 2 + 0.06, w / 2 - 0.06, y + 0.018, -d / 2 + 0.03, d - 0.08, seed * 10 + i);
  }
  return { hw: w / 2 + 0.05, hd: d / 2 + 0.03, top: h };
}

// radio: cathedral-style tabletop set ------------------------------------
export function radio(k, { s = 1 } = {}) {
  const md = MAT.wood('dark'), br = MAT.brass();
  const arch = (hw, h, top) => (sh) => { sh.moveTo(-hw, 0); sh.lineTo(hw, 0); sh.lineTo(hw, h); sh.bezierCurveTo(hw, top, -hw, top, -hw, h); sh.lineTo(-hw, 0); };
  k.add(slab('radio' + s, arch(0.22 * s, 0.28 * s, 0.56 * s), 0.24 * s, 0.025), md, 0, 0.02 * s, 0);
  k.add(rbox(0.48 * s, 0.04 * s, 0.27 * s, 0.015), MAT.wood('red'), 0, 0.02 * s, 0);
  k.add(slab('radiog' + s, arch(0.15 * s, 0.2 * s, 0.4 * s), 0.02 * s, 0.006), MAT.cloth('#6a4a2a', '#e0b070'), 0, 0.15 * s, 0.115 * s);
  for (let i = -2; i <= 2; i++) k.add(rbox(0.012 * s, (0.26 - Math.abs(i) * 0.03) * s, 0.012 * s, 0.004), br, i * 0.05 * s, (0.28 - Math.abs(i) * 0.015) * s, 0.13 * s);
  k.add(rbox(0.18 * s, 0.05 * s, 0.02 * s, 0.008), MAT.glow('#ffd890', '#ff9a2a', 1.1), 0, 0.1 * s, 0.12 * s);
  for (const sx of [-1, 1]) k.add(cyl(0.025 * s, 0.028 * s, 0.03 * s, 12), br, sx * 0.15 * s, 0.1 * s, 0.13 * s, 0, { rx: Math.PI / 2 });
  k.add(cyl(0.004, 0.004, 0.55 * s, 4), MAT.steel(), 0.12 * s, 0.75 * s, -0.06 * s, 0, { rz: -0.35 });
  k.add(sphere(0.012, 6, 4), MAT.steel(), 0.21 * s, 1.01 * s, -0.06 * s);
}

// picture frames -------------------------------------------------------
export function frame(k, w, h, t, { mat = null, prof = 0.06 } = {}) {
  const fm = mat || gilt();
  k.add(rbox(w, prof, 0.05, 0.02), fm, 0, h / 2 - prof / 2, 0.025);
  k.add(rbox(w, prof, 0.05, 0.02), fm, 0, -h / 2 + prof / 2, 0.025);
  k.add(rbox(prof, h - prof * 2 + 0.01, 0.05, 0.02), fm, -w / 2 + prof / 2, 0, 0.025);
  k.add(rbox(prof, h - prof * 2 + 0.01, 0.05, 0.02), fm, w / 2 - prof / 2, 0, 0.025);
  k.add(plane(w - prof * 1.6, h - prof * 1.6), MAT.map(t, 0.7), 0, 0, 0.012);
}

// lamps ----------------------------------------------------------------
export function hangingLamp(k, y, top, { shade = '#3f7a5a' } = {}) {
  k.add(cyl(0.008, 0.008, top - y - 0.3, 4), MAT.iron(), 0, (top + y + 0.3) / 2, 0);
  k.add(lathe([[0.001, 0.3], [0.04, 0.29], [0.06, 0.25], [0.24, 0.06], [0.28, 0.0], [0.27, -0.01], [0.23, 0.04], [0.05, 0.24], [0.001, 0.26]], 18), MAT.flat(shade, 0.45, { metalness: 0.3, side: THREE.DoubleSide }), 0, y, 0);
  k.add(lathe([[0.001, 0.3], [0.03, 0.3], [0.03, 0.36], [0.001, 0.36]], 8), MAT.brass(), 0, y, 0);
  k.add(sphere(0.09, 12, 8), MAT.glow('#fff4d8', '#ffd890', 2.4), 0, y + 0.06, 0);
}
export function floorLamp(k, { shade = '#e8c88a' } = {}) {
  const br = MAT.brass();
  k.add(lathe([[0.001, 0], [0.18, 0], [0.19, 0.02], [0.12, 0.05], [0.04, 0.08], [0.03, 0.12], [0.001, 0.12]], 16), br, 0, 0, 0);
  k.add(cyl(0.016, 0.016, 1.3, 8), br, 0, 0.75, 0);
  k.add(lathe([[0.24, 0], [0.25, 0.01], [0.15, 0.32], [0.14, 0.33], [0.13, 0.32], [0.23, 0.01]], 16), MAT.glow(shade, '#ff9a40', 0.55), 0, 1.25, 0);
  k.add(sphere(0.05, 8, 6), MAT.glow('#fff4d8', '#ffd890', 2), 0, 1.38, 0);
  return { r: 0.2, top: 1.6 };
}
export function wallSconce(k, { glow = '#ffd890' } = {}) {
  const br = MAT.brass();
  k.add(rbox(0.1, 0.18, 0.03, 0.012), br, 0, 0, 0.015);
  k.add(pipe([[0, -0.04, 0.02], [0, -0.04, 0.12], [0, 0.04, 0.18]], 0.012, 0.05, 6), br, 0, 0, 0);
  k.add(lathe([[0.04, 0], [0.09, 0.14], [0.085, 0.15], [0.035, 0.01]], 12), MAT.glow('#f8e8c8', glow, 1.2), 0, 0.03, 0.18);
}
export function candle(k, x, y, z) {
  k.add(lathe([[0.001, 0], [0.06, 0], [0.065, 0.01], [0.02, 0.02], [0.018, 0.06], [0.04, 0.07], [0.04, 0.08], [0.001, 0.08]], 10), MAT.brass(), x, y, z);
  k.add(cyl(0.018, 0.018, 0.12, 8), MAT.flat('#f4ecd8', 0.6), x, y + 0.14, z);
  k.add(lathe([[0.001, 0], [0.01, 0.01], [0.001, 0.04]], 6), MAT.glow('#fff0b0', '#ffb030', 3), x, y + 0.2, z);
}

// rugs -----------------------------------------------------------------
export function rug(k, w, d, pal, seed = 1) {
  const t = rugTex(pal, seed);
  const m = M('rugm' + t.uuid, () => { const mm = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, alphaTest: 0.5, side: THREE.DoubleSide }); mm.userData.noShadow = true; return mm; });
  k.add(plane(w, d), m, 0, 0.012, 0, 0, { rx: -Math.PI / 2 });
}

// boxes, crates, barrels, chests -----------------------------------------
export function crate(k, s = 0.6, { pal = 'pale', h = null } = {}) {
  const hh = h ?? s;
  const m = MAT.wood(pal), md = MAT.wood(darker(pal));
  k.add(rbox(s - 0.04, hh - 0.04, s - 0.04, 0.01), m, 0, hh / 2, 0, 0, { jit: true });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(rbox(0.07, hh, 0.07, 0.012), md, sx * (s / 2 - 0.035), hh / 2, sz * (s / 2 - 0.035));
  for (const y of [0.035, hh - 0.035]) { k.add(rbox(s, 0.07, 0.07, 0.012), md, 0, y, s / 2 - 0.035); k.add(rbox(s, 0.07, 0.07, 0.012), md, 0, y, -s / 2 + 0.035); k.add(rbox(0.07, 0.07, s, 0.012), md, s / 2 - 0.035, y, 0); k.add(rbox(0.07, 0.07, s, 0.012), md, -s / 2 + 0.035, y, 0); }
  k.add(rbox(Math.hypot(s, hh) - 0.12, 0.06, 0.03, 0.01), md, 0, hh / 2, s / 2 - 0.01, 0, { rz: Math.atan2(hh, s) });
  return { hw: s / 2, hd: s / 2, top: hh };
}
export function barrel(k, { r = 0.32, h = 0.85, pal = 'honey' } = {}) {
  const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([r * (0.84 + Math.sin(t * Math.PI) * 0.16), t * h]); }
  pts.unshift([0.001, 0]); pts.push([0.001, h - 0.01]);
  const g = lathe(pts, 16);
  k.add(g, MAT.wood(pal), 0, 0, 0);
  for (const t of [0.12, 0.35, 0.65, 0.88]) k.add(torus(r * (0.86 + Math.sin(t * Math.PI) * 0.15), 0.012, 4, 20), MAT.iron(), 0, t * h, 0, 0, { rx: Math.PI / 2 });
  return { r, top: h };
}
export function chest(k, { w = 0.9, d = 0.52, h = 0.48, pal = 'red', band = null } = {}) {
  const m = MAT.wood(pal), b = band || MAT.brass();
  k.add(rbox(w, h, d, 0.03), m, 0, h / 2, 0, 0, { jit: true });
  k.add(slab('lid' + w + d, (s) => { s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.bezierCurveTo(d / 2, d * 0.45, -d / 2, d * 0.45, -d / 2, 0); }, w, 0.02), m, 0, h - 0.01, 0, Math.PI / 2);
  for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) {
    k.add(rbox(0.05, h + 0.01, d + 0.02, 0.01), b, x, h / 2, 0);
    k.add(slab('lidb' + d, (s) => { s.moveTo(-d / 2 - 0.012, 0); s.lineTo(d / 2 + 0.012, 0); s.bezierCurveTo(d / 2 + 0.012, d * 0.47, -d / 2 - 0.012, d * 0.47, -d / 2 - 0.012, 0); }, 0.05, 0.005), b, x, h - 0.01, 0, Math.PI / 2);
  }
  k.add(rbox(0.09, 0.11, 0.02, 0.01), b, 0, h - 0.03, d / 2 + 0.01);
  for (const sx of [-1, 1]) k.add(torus(0.04, 0.008, 4, 10, Math.PI), MAT.iron(), sx * (w / 2 + 0.01), h * 0.62, 0, Math.PI / 2, { rx: Math.PI });
  return { hw: w / 2, hd: d / 2, top: h + d * 0.36 };
}

// plants ---------------------------------------------------------------
export function pottedPlant(k, { kind = 'leafy', s = 1, potColor = '#b8623a' } = {}) {
  k.add(lathe([[0.001, 0], [0.14 * s, 0], [0.16 * s, 0.03 * s], [0.2 * s, 0.3 * s], [0.225 * s, 0.31 * s], [0.225 * s, 0.36 * s], [0.2 * s, 0.37 * s], [0.18 * s, 0.34 * s], [0.001, 0.34 * s]], 16), MAT.flat(potColor, 0.75), 0, 0, 0);
  k.add(cyl(0.19 * s, 0.19 * s, 0.01, 12), MAT.flat('#4a3220', 1), 0, 0.345 * s, 0);
  let geo;
  if (kind === 'leafy') {
    const prims = [];
    const r = rng(5);
    for (let i = 0; i < 9; i++) { const a = i * 2.4, rr = 0.12 + r() * 0.12, y = 0.5 + r() * 0.4; prims.push({ type: 'ell', c: [Math.cos(a) * rr, y, Math.sin(a) * rr], r: [0.14, 0.09, 0.14], group: 'l', mat: 'l', wobble: (x, yy, z) => Math.sin(x * 40) * Math.sin(z * 37) * 0.012 }); }
    prims.push({ type: 'cone', a: [0, 0.32, 0], b: [0, 0.6, 0], r1: 0.03, r2: 0.02, group: 's', mat: 's' });
    geo = soft({ key: 'plant-leafy', prims, groups: { l: 0.08, s: 0.02 }, joinK: 0.03, colors: { l: '#4f9a3c', s: '#5a4a2a' }, paint: (p, m, c) => { if (m === 'l') c.offsetHSL(0, 0, (p.y - 0.7) * 0.25 + Math.sin(p.x * 30 + p.z * 20) * 0.03); }, bounds: { min: [-0.45, 0.3, -0.45], max: [0.45, 1.1, 0.45] }, cell: 0.03 });
  } else {
    const prims = [];
    for (let i = 0; i < 11; i++) { const a = i * 2.39996, h = 0.75 + (i % 3) * 0.2, lean = 0.18 + (i % 4) * 0.08; prims.push({ type: 'cone', a: [Math.cos(a) * 0.04, 0.33, Math.sin(a) * 0.04], b: [Math.cos(a) * lean, 0.33 + h, Math.sin(a) * lean], r1: 0.045, r2: 0.008, group: 'f', mat: 'l' }); }
    geo = soft({ key: 'plant-spiky', prims, groups: { f: 0.015 }, colors: { l: '#3f8a4a' }, paint: (p, m, c) => { const t = (p.y - 0.33) / 0.9; c.setRGB(0.22 + t * 0.25, 0.48 + t * 0.2, 0.26 + Math.sin(p.y * 40) * 0.04); }, bounds: { min: [-0.5, 0.3, -0.5], max: [0.5, 1.4, 0.5] }, cell: 0.028 });
  }
  k.add(geo, softMat, 0, 0, 0, 0, { sx: s, sy: s, sz: s });
  return { r: 0.24 * s, top: 0.4 * s };
}

// paintings (small one-off canvases) -------------------------------------
export function painting(kind) {
  return tex('paint' + kind, () => canvasTex(256, 192, (x, W, H) => {
    const r = rng(kind.length * 13);
    const sky = x.createLinearGradient(0, 0, 0, H);
    if (kind === 'dinofly') {
      sky.addColorStop(0, '#7fb8e8'); sky.addColorStop(1, '#e8f0d8'); x.fillStyle = sky; x.fillRect(0, 0, W, H);
      x.fillStyle = '#4f9a50'; x.beginPath(); x.moveTo(0, H); x.quadraticCurveTo(70, 120, 140, 150); x.quadraticCurveTo(200, 120, W, 140); x.lineTo(W, H); x.fill();
      x.fillStyle = '#3a7a3c'; x.beginPath(); x.moveTo(0, H); x.quadraticCurveTo(120, 150, W, H); x.fill();
      // the Dino-Fly: green body, yellow belly, big wings
      x.save(); x.translate(128, 80); x.rotate(-0.15);
      x.fillStyle = '#d8c060'; x.beginPath(); x.ellipse(-30, -22, 46, 18, -0.5, 0, 7); x.fill(); x.beginPath(); x.ellipse(32, -24, 46, 18, 0.5, 0, 7); x.fill();
      x.fillStyle = '#3f8a3a'; x.beginPath(); x.ellipse(0, 0, 40, 16, 0, 0, 7); x.fill();
      x.beginPath(); x.ellipse(44, -10, 16, 11, 0.4, 0, 7); x.fill();
      x.fillStyle = '#e8d070'; x.beginPath(); x.ellipse(0, 6, 28, 7, 0, 0, 7); x.fill();
      x.fillStyle = '#ffffff'; x.beginPath(); x.arc(50, -14, 4, 0, 7); x.fill(); x.fillStyle = '#111'; x.beginPath(); x.arc(51, -14, 2, 0, 7); x.fill();
      x.strokeStyle = '#3f8a3a'; x.lineWidth = 7; x.beginPath(); x.moveTo(-38, 2); x.quadraticCurveTo(-60, 10, -70, -4); x.stroke();
      x.restore();
    } else if (kind === 'island') {
      sky.addColorStop(0, '#9fcff2'); sky.addColorStop(0.6, '#e6f2f8'); sky.addColorStop(0.61, '#3a8ec8'); sky.addColorStop(1, '#2a6aa8'); x.fillStyle = sky; x.fillRect(0, 0, W, H);
      x.fillStyle = '#ffffff'; for (let i = 0; i < 5; i++) { x.globalAlpha = 0.7; x.beginPath(); x.ellipse(r() * W, 20 + r() * 50, 30 + r() * 30, 8, 0, 0, 7); x.fill(); } x.globalAlpha = 1;
      x.fillStyle = '#8a7f8a'; x.beginPath(); x.moveTo(40, 118); x.lineTo(70, 82); x.lineTo(150, 78); x.lineTo(200, 96); x.lineTo(230, 118); x.fill();
      x.fillStyle = '#5f9e4a'; x.beginPath(); x.moveTo(62, 90); x.lineTo(150, 80); x.lineTo(196, 96); x.lineTo(70, 96); x.fill();
      for (let i = 0; i < 6; i++) { x.fillStyle = ['#f2e2c2', '#e8d0a8'][i % 2]; x.fillRect(84 + i * 16, 74 - (i % 3) * 3, 12, 12); x.fillStyle = '#b84a2a'; x.beginPath(); x.moveTo(82 + i * 16, 74 - (i % 3) * 3); x.lineTo(90 + i * 16, 66 - (i % 3) * 3); x.lineTo(98 + i * 16, 74 - (i % 3) * 3); x.fill(); }
      x.fillStyle = '#e8e0d0'; x.fillRect(206, 52, 8, 40); x.fillStyle = '#c84a3a'; x.fillRect(204, 46, 12, 8); x.fillStyle = '#ffe890'; x.beginPath(); x.arc(210, 44, 4, 0, 7); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.5)'; x.lineWidth = 1.5; for (let i = 0; i < 20; i++) { const yy = 125 + r() * 60, xx = r() * W; x.beginPath(); x.moveTo(xx, yy); x.lineTo(xx + 14, yy); x.stroke(); }
    } else if (kind === 'portrait') {
      sky.addColorStop(0, '#6a4a3a'); sky.addColorStop(1, '#3a2418'); x.fillStyle = sky; x.fillRect(0, 0, W, H);
      const head = (cx, hair, tunic, pony) => {
        x.fillStyle = tunic; x.beginPath(); x.ellipse(cx, 190, 48, 50, 0, Math.PI, 0); x.fill();
        x.fillStyle = '#f0c49b'; x.beginPath(); x.ellipse(cx, 96, 30, 36, 0, 0, 7); x.fill();
        x.fillStyle = hair; x.beginPath(); x.ellipse(cx, 72, 31, 18, 0, Math.PI, 0); x.fill();
        if (pony) { x.beginPath(); x.ellipse(cx + 26, 66, 9, 14, 0.6, 0, 7); x.fill(); }
        x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(cx - 10, 94, 7, 8, 0, 0, 7); x.ellipse(cx + 10, 94, 7, 8, 0, 0, 7); x.fill();
        x.fillStyle = '#2a2018'; x.beginPath(); x.arc(cx - 9, 95, 3, 0, 7); x.arc(cx + 11, 95, 3, 0, 7); x.fill();
        x.strokeStyle = '#8a3a2a'; x.lineWidth = 2; x.beginPath(); x.arc(cx, 110, 9, 0.3, Math.PI - 0.3); x.stroke();
      };
      head(90, '#3b2414', '#2d6fdc', true); head(170, '#8a3a1a', '#3f9a6a', false);
      x.fillStyle = '#e0b030'; x.beginPath(); x.arc(90, 160, 7, 0, 7); x.fill();
    } else if (kind === 'flowers') {
      x.fillStyle = '#2a3a4a'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#7a5a3a'; x.fillRect(0, 150, W, 42);
      x.fillStyle = '#3a78b8'; x.beginPath(); x.ellipse(128, 130, 34, 40, 0, 0, 7); x.fill();
      for (let i = 0; i < 12; i++) { x.fillStyle = ['#e85a3a', '#f0c040', '#f0f0e0', '#d04a8a'][i % 4]; x.beginPath(); x.arc(128 + (r() - 0.5) * 120, 40 + r() * 60, 10 + r() * 8, 0, 7); x.fill(); }
      x.fillStyle = '#4f8a3a'; for (let i = 0; i < 10; i++) { x.beginPath(); x.ellipse(128 + (r() - 0.5) * 100, 80 + r() * 30, 12, 5, r() * 3, 0, 7); x.fill(); }
    }
    // canvas texture + varnish
    for (let i = 0; i < 1800; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'; x.fillRect(r() * W, r() * H, 2, 2); }
    const v = x.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.7); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(40,20,0,0.35)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
  }));
}

// Arthur's toys ---------------------------------------------------------
export function toyBlocks(k, seed = 3) {
  const r = rng(seed);
  const cols = ['#e03a3a', '#3b78d8', '#e9c46a', '#5fb05f', '#f08a30'];
  const stack = [[0, 0, 0], [0.15, 0, 0.02], [0.07, 0.13, 0.01], [0.32, 0, -0.12], [-0.2, 0, 0.18], [0.45, 0, 0.15]];
  stack.forEach(([x, y, z], i) => k.add(rbox(0.13, 0.13, 0.13, 0.015), MAT.paint(cols[i % cols.length], 0.5), x, y + 0.065, z, (r() - 0.5) * 0.6));
}
export function toyBoat(k) {
  const m = MAT.paint('#e8e0cc', 0.5), red = MAT.paint('#c8452f', 0.5);
  k.add(slab('hull', (s) => { s.moveTo(-0.22, 0.06); s.quadraticCurveTo(-0.2, 0, -0.1, 0); s.lineTo(0.14, 0); s.quadraticCurveTo(0.24, 0.02, 0.27, 0.08); s.lineTo(-0.22, 0.08); }, 0.12, 0.012), red, 0, 0, 0);
  k.add(rbox(0.36, 0.02, 0.1, 0.006), MAT.wood('pale'), 0, 0.085, 0);
  k.add(cyl(0.008, 0.008, 0.36, 5), MAT.wood('dark'), 0, 0.26, 0);
  k.add(slab('sail', (s) => { s.moveTo(0, 0); s.lineTo(0.16, 0); s.quadraticCurveTo(0.12, 0.14, 0, 0.28); }, 0.006, 0), m, 0.01, 0.1, 0);
}
export function plushDino(k) {
  const g = soft({
    key: 'plushdino',
    prims: [
      { type: 'ell', c: [0, 0.13, 0], r: [0.11, 0.12, 0.13], group: 'b', mat: 'g' },
      { type: 'ell', c: [0, 0.28, 0.06], r: [0.09, 0.08, 0.09], group: 'b', mat: 'g' },
      { type: 'ell', c: [0, 0.27, 0.14], r: [0.05, 0.04, 0.05], group: 'b', mat: 'y' },
      { type: 'ell', c: [0, 0.1, 0.07], r: [0.08, 0.08, 0.08], group: 'b', mat: 'y' },
      { type: 'ell', c: [-0.15, 0.2, -0.03], r: [0.1, 0.03, 0.07], group: 'w', mat: 'w' },
      { type: 'ell', c: [0.15, 0.2, -0.03], r: [0.1, 0.03, 0.07], group: 'w', mat: 'w' },
      { type: 'cone', a: [0, 0.08, -0.1], b: [0, 0.04, -0.26], r1: 0.05, r2: 0.015, group: 'b', mat: 'g' },
      { type: 'ell', c: [-0.035, 0.31, 0.12], r: [0.022, 0.024, 0.02], group: 'e', mat: 'e' },
      { type: 'ell', c: [0.035, 0.31, 0.12], r: [0.022, 0.024, 0.02], group: 'e', mat: 'e' },
    ],
    groups: { b: 0.05, w: 0.03, e: 0.005 }, joinK: 0.02,
    colors: { g: '#4f9a3c', y: '#e8d070', w: '#d8b860', e: '#1a1a1a' },
    bounds: { min: [-0.3, 0, -0.32], max: [0.3, 0.4, 0.22] }, cell: 0.014,
  });
  k.add(g, softMat, 0, 0, 0);
}
export function spinningTop(k, x, z, color = '#d83a3a') {
  k.add(lathe([[0.001, 0], [0.04, 0.03], [0.07, 0.06], [0.06, 0.08], [0.015, 0.085], [0.012, 0.12], [0.001, 0.12]], 12), MAT.paint(color, 0.4), x, 0, z, 0, { rz: 0.3 });
}

// kitchen range (cast iron, brass rail, glowing firebox) -------------------
export function stove(k) {
  const ir = MAT.iron(), st = MAT.steel(), br = MAT.brass();
  const fire = MAT.glow('#ffb347', '#ff6a00', 2.6);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(lathe([[0.03, 0], [0.05, 0.02], [0.035, 0.06], [0.05, 0.12]], 8), ir, sx * 0.52, 0, sz * 0.24);
  k.add(rbox(1.2, 0.68, 0.62, 0.04), ir, 0, 0.46, 0);
  k.add(rbox(1.28, 0.05, 0.7, 0.02), st, 0, 0.82, 0);
  k.add(rbox(1.22, 0.04, 0.64, 0.015), ir, 0, 0.14, 0);
  for (const sx of [-1, 1]) k.add(torus(0.13, 0.016, 5, 18), st, sx * 0.28, 0.85, 0.02, 0, { rx: Math.PI / 2 });
  // oven door (right) and firebox (left)
  k.add(rbox(0.5, 0.4, 0.04, 0.02), MAT.paint('#2e3036', 0.45), 0.27, 0.46, 0.32);
  k.add(rbox(0.38, 0.28, 0.02, 0.02), ir, 0.27, 0.46, 0.345);
  k.add(cyl(0.014, 0.014, 0.4, 8), br, 0.27, 0.7, 0.38, 0, { rz: Math.PI / 2 });
  k.add(rbox(0.38, 0.3, 0.04, 0.02), MAT.paint('#2e3036', 0.45), -0.3, 0.5, 0.32);
  for (let i = 0; i < 4; i++) k.add(new THREE.BoxGeometry(0.05, 0.12, 0.02), fire, -0.42 + i * 0.08, 0.5, 0.335);
  k.add(rbox(0.36, 0.06, 0.03, 0.01), fire, -0.3, 0.24, 0.32);
  k.add(sphere(0.025, 8, 6), br, -0.15, 0.5, 0.36);
  // brass towel rail
  k.add(pipe([[-0.6, 0.74, 0.3], [-0.6, 0.74, 0.4], [0.6, 0.74, 0.4], [0.6, 0.74, 0.3]], 0.014, 0.04, 6), br, 0, 0, 0);
  k.add(soft({ key: 'towel', prims: [{ type: 'box', c: [0, -0.1, 0], h: [0.14, 0.12, 0.012], round: 0.01, group: 't', mat: 't', wobble: (x, y) => Math.sin(x * 40) * 0.006 }], groups: { t: 0.01 }, colors: { t: '#f2ead6' }, paint: (p, m, c) => { if (Math.abs(p.y + 0.15) < 0.02 || Math.abs(p.y + 0.05) < 0.015) c.set('#c8452f'); }, bounds: { min: [-0.18, -0.26, -0.05], max: [0.18, 0.05, 0.05] }, cell: 0.014 }), softMat, 0.32, 0.75, 0.41);
}

// Welsh dresser: cupboard base and plate rack ------------------------------
export function dresser(k, { w = 1.5, pal = 'honey' } = {}) {
  const m = MAT.wood(pal), md = MAT.wood(darker(pal)), br = MAT.brass();
  const d = 0.5;
  k.add(rbox(w, 0.1, d, 0.02), md, 0, 0.05, 0);
  k.add(rbox(w - 0.02, 0.78, d - 0.04, 0.025), m, 0, 0.48, -0.01);
  k.add(rbox(w + 0.06, 0.05, d + 0.04, 0.02), md, 0, 0.895, 0.01);
  // two drawers over two doors
  for (const sx of [-1, 1]) {
    k.add(rbox(w / 2 - 0.08, 0.16, 0.03, 0.012), md, sx * (w / 4), 0.76, d / 2);
    k.add(lathe([[0.001, 0], [0.02, 0], [0.012, 0.02], [0.022, 0.03], [0.001, 0.035]], 8), br, sx * (w / 4), 0.76, d / 2 + 0.01, 0, { rx: Math.PI / 2 });
    k.add(rbox(w / 2 - 0.08, 0.5, 0.03, 0.012), m, sx * (w / 4), 0.39, d / 2 - 0.005, 0, { jit: true });
    k.add(rbox(w / 2 - 0.24, 0.36, 0.025, 0.02), md, sx * (w / 4), 0.39, d / 2 + 0.01);
    k.add(sphere(0.022, 8, 6), br, sx * 0.08, 0.42, d / 2 + 0.03);
  }
  // plate rack
  const rd = 0.24, rh = 1.15, z0 = -d / 2 + rd / 2;
  for (const sx of [-1, 1]) k.add(slab('rackside', (s) => { s.moveTo(-rd / 2, 0); s.lineTo(rd / 2, 0); s.lineTo(rd / 2, 0.2); s.quadraticCurveTo(-rd / 2 + 0.04, 0.3, -rd / 2 + 0.06, rh); s.lineTo(-rd / 2, rh); s.lineTo(-rd / 2, 0); }, 0.04, 0.008), m, sx * (w / 2 - 0.04), 0.92, z0, -Math.PI / 2);
  k.add(rbox(w - 0.06, rh, 0.02, 0.005), MAT.wainscot(pal), 0, 0.92 + rh / 2, -d / 2 + 0.01);
  k.add(rbox(w + 0.06, 0.06, rd + 0.08, 0.02), md, 0, 0.92 + rh + 0.03, z0 + 0.02);
  k.add(slab('rackcrest' + w, (s) => { const a = w / 2 - 0.05; s.moveTo(-a, 0); s.lineTo(a, 0); s.lineTo(a, 0.06); s.bezierCurveTo(a * 0.4, 0.06, a * 0.3, 0.16, 0, 0.16); s.bezierCurveTo(-a * 0.3, 0.16, -a * 0.4, 0.06, -a, 0.06); s.lineTo(-a, 0); }, 0.04), m, 0, 0.92 + rh + 0.06, -d / 2 + 0.04);
  const cols = ['#f2ead6', '#3a6fb0', '#f2ead6', '#d8a040', '#f2ead6', '#3a6fb0'];
  for (let i = 0; i < 2; i++) {
    const y = 0.92 + 0.42 + i * 0.4;
    k.add(rbox(w - 0.08, 0.03, rd, 0.008), m, 0, y, z0);
    k.add(cyl(0.008, 0.008, w - 0.1, 5), br, 0, y + 0.06, z0 + rd / 2 - 0.02, 0, { rz: Math.PI / 2 });
    for (let j = 0; j < 5; j++) plate(k, -w / 2 + 0.2 + j * ((w - 0.4) / 4), y + 0.015, z0 - 0.03, 0, cols[(i * 2 + j) % cols.length], 0.11);
  }
  // mugs on hooks and jars on the counter
  for (let j = 0; j < 5; j++) {
    const x = -w / 2 + 0.22 + j * 0.27;
    k.add(lathe([[0.001, 0], [0.035, 0], [0.04, 0.08], [0.036, 0.08], [0.03, 0.01], [0.001, 0.01]], 10), MAT.flat(j % 2 ? '#c8452f' : '#f2ead6', 0.35), x, 1.08, z0 + 0.02);
  }
  jar(k, -w / 2 + 0.2, 0.92, 0.08, 'crock', '#7a8a5a', 1.1);
  jar(k, w / 2 - 0.22, 0.92, 0.06, 'urn', '#b85a3a', 0.7);
  return { hw: w / 2 + 0.03, hd: d / 2 + 0.02, top: 2.2 };
}

export function nightstand(k, { pal = 'honey' } = {}) {
  const m = MAT.wood(pal), md = MAT.wood(darker(pal));
  k.add(rbox(0.5, 0.04, 0.42, 0.015), m, 0, 0.6, 0);
  k.add(rbox(0.44, 0.3, 0.38, 0.015), m, 0, 0.43, 0);
  k.add(rbox(0.38, 0.12, 0.02, 0.01), md, 0, 0.5, 0.19);
  k.add(rbox(0.38, 0.12, 0.02, 0.01), md, 0, 0.35, 0.19);
  for (const y of [0.5, 0.35]) k.add(sphere(0.02, 8, 6), MAT.brass(), 0, y, 0.215);
  const leg = turnedLeg(0.3, 0.022);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(leg, md, sx * 0.19, 0, sz * 0.16);
  return { hw: 0.26, hd: 0.22, top: 0.62 };
}
export function sideTable(k, { pal = 'honey' } = {}) {
  const m = MAT.wood(pal), md = MAT.wood(darker(pal));
  k.add(lathe([[0.001, 0.0], [0.3, 0.0], [0.31, 0.015], [0.3, 0.035], [0.001, 0.035]], 20), m, 0, 0.585, 0);
  k.add(lathe([[0.03, 0], [0.04, 0.05], [0.025, 0.2], [0.04, 0.3], [0.025, 0.4], [0.03, 0.58]], 10), md, 0, 0, 0);
  for (let i = 0; i < 3; i++) k.add(slab('tfoot', (s) => { s.moveTo(0, 0); s.lineTo(0.26, 0); s.quadraticCurveTo(0.1, 0.04, 0.03, 0.16); s.lineTo(0, 0.16); }, 0.035, 0.008), md, 0, 0, 0, i * 2.094);
  return { r: 0.3, top: 0.62 };
}
export function coatStand(k) {
  const md = MAT.wood('dark'), br = MAT.brass();
  k.add(lathe([[0.04, 0], [0.04, 0.08], [0.028, 0.2], [0.024, 1.6], [0.035, 1.66], [0.02, 1.72], [0.03, 1.76], [0.001, 1.8]], 10), md, 0, 0, 0);
  for (let i = 0; i < 3; i++) k.add(slab('csfoot', (s) => { s.moveTo(0, 0); s.lineTo(0.28, 0); s.lineTo(0.28, 0.03); s.quadraticCurveTo(0.12, 0.05, 0.03, 0.22); s.lineTo(0, 0.22); }, 0.04, 0.01), md, 0, 0, 0, i * 2.094 + 0.5);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; k.add(pipe([[0, 1.6, 0], [Math.sin(a) * 0.14, 1.66, Math.cos(a) * 0.14], [Math.sin(a) * 0.17, 1.74, Math.cos(a) * 0.17]], 0.01, 0.04, 5), br, 0, 0, 0); }
  // a hat and a scarf
  k.add(lathe([[0.001, 0], [0.2, 0], [0.21, 0.015], [0.12, 0.025], [0.11, 0.13], [0.09, 0.15], [0.001, 0.15]], 16), MAT.cloth('#6a4a2a', '#2a1a0a'), 0.05, 1.73, 0.12, 0, { rx: 0.35 });
  k.add(soft({ key: 'scarf', prims: [{ type: 'cone', a: [0, 0, 0], b: [0.02, -0.7, 0.04], r1: 0.05, r2: 0.04, group: 's', mat: 's', wobble: (x, y) => Math.sin(y * 30) * 0.006 }, { type: 'cone', a: [0, 0, 0], b: [-0.08, -0.55, 0.06], r1: 0.05, r2: 0.04, group: 's', mat: 's' }], groups: { s: 0.03 }, colors: { s: '#3f9a6a' }, paint: (p, m, c) => { if (Math.sin(p.y * 40) > 0.6) c.set('#e8d070'); }, bounds: { min: [-0.2, -0.8, -0.1], max: [0.15, 0.08, 0.15] }, cell: 0.018 }), softMat, -0.14, 1.66, -0.05);
}

// ================================================================ office & station kit
// Painted one-off canvases for the Water Office and the Joint Project's rooms,
// and the furniture/machines that wear them (filing cabinets, counters,
// gauges, consoles, lockers, a blueprint table with a hologram...).
export function disc(r, segs = 24) { return cached(`dc${r3(r)},${segs}`, () => { const g = new THREE.CircleGeometry(r, segs); g.userData.keepUV = true; return g; }); }
const serif = (px, bold = true) => `${bold ? 'bold ' : ''}${px}px Georgia, 'Times New Roman', serif`;
const ageing = (x, W, H, r, n = 30) => {
  blotch(x, W, H, r, n, ['#b89a60', '#f4ecd0', '#a08050'], 20, 90, 0.18);
  const v = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(90,60,20,0.35)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
};
// smooth closed path through points
function blobPath(x, pts) {
  x.beginPath();
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let m = mid(pts[n - 1], pts[0]); x.moveTo(m[0], m[1]);
  for (let i = 0; i < n; i++) { const p = pts[i], q = mid(p, pts[(i + 1) % n]); x.quadraticCurveTo(p[0], p[1], q[0], q[1]); }
  x.closePath();
}
function islandPts(cx, cy, R, sx, k = 1, seed = 0) {
  const pts = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const rr = R * k * (1 + 0.12 * Math.sin(3 * a + 1 + seed) + 0.07 * Math.sin(5 * a + 2) + 0.04 * Math.sin(9 * a + 0.5 + seed));
    pts.push([cx + Math.cos(a) * rr * sx, cy + Math.sin(a) * rr]);
  }
  return pts;
}
function screenFX(x, W, H, r) {
  for (let y = 0; y < H; y += 3) { x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(0, y, W, 1); }
  const v = x.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.65);
  v.addColorStop(0, 'rgba(120,255,255,0.08)'); v.addColorStop(1, 'rgba(0,0,0,0.55)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
}
const fakeText = (x, x0, y0, w, lines, lh, col, r, size = 3) => {
  x.fillStyle = col;
  for (let i = 0; i < lines; i++) { let xx = x0; const end = x0 + w * (i === lines - 1 ? 0.5 : 0.75 + r() * 0.25); while (xx < end) { const ww = 6 + r() * 26; x.fillRect(xx, y0 + i * lh, Math.min(ww, end - xx), size); xx += ww + 5; } }
};

export const CANV = {
  // gauge dial face (green / amber / red zones)
  dial: (zone = '#c8452f', face = '#f2ead2') => tex('dial' + zone + face, () => canvasTex(128, 128, (x) => {
    x.fillStyle = face; x.fillRect(0, 0, 128, 128);
    const g = x.createRadialGradient(56, 50, 8, 64, 64, 66); g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(110,80,40,0.4)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    x.translate(64, 64);
    const A = (t) => Math.PI * 0.75 + t * Math.PI * 1.5;
    x.lineWidth = 7;
    for (const [a, b, c] of [[0, 0.55, '#4f9a50'], [0.55, 0.8, '#e0b030'], [0.8, 1, zone]]) { x.strokeStyle = c; x.beginPath(); x.arc(0, 0, 45, A(a), A(b)); x.stroke(); }
    x.strokeStyle = '#2a2018';
    for (let i = 0; i <= 30; i++) { const a = A(i / 30), r0 = i % 5 ? 50 : 42; x.lineWidth = i % 5 ? 1.2 : 2.6; x.beginPath(); x.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); x.lineTo(Math.cos(a) * 56, Math.sin(a) * 56); x.stroke(); }
    x.fillStyle = '#2a2018'; x.font = serif(12); x.textAlign = 'center'; x.textBaseline = 'middle';
    for (let i = 0; i <= 6; i++) { const a = A(i / 6); x.fillText(String(i * 2), Math.cos(a) * 32, Math.sin(a) * 32); }
    x.font = 'bold 9px sans-serif'; x.fillText('BAR', 0, 22);
    x.lineWidth = 6; x.strokeStyle = 'rgba(40,30,20,0.45)'; x.beginPath(); x.arc(0, 0, 61, 0, 7); x.stroke();
  })),
  clock: () => tex('clockface', () => canvasTex(128, 128, (x) => {
    x.fillStyle = '#f4eedc'; x.fillRect(0, 0, 128, 128); x.translate(64, 64);
    x.fillStyle = '#2a2018'; x.font = serif(14); x.textAlign = 'center'; x.textBaseline = 'middle';
    const R = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; x.save(); x.translate(Math.cos(a) * 44, Math.sin(a) * 44); x.font = serif(i % 3 ? 10 : 13); x.fillText(R[i], 0, 0); x.restore(); }
    for (let i = 0; i < 60; i++) { const a = (i / 60) * Math.PI * 2; x.fillRect(Math.cos(a) * 56 - 1, Math.sin(a) * 56 - 1, 2, 2); }
    x.lineWidth = 5; x.strokeStyle = 'rgba(40,30,20,0.4)'; x.beginPath(); x.arc(0, 0, 61, 0, 7); x.stroke();
  })),
  // the Water Office's painted map of the island's mains
  pipemap: () => tex('pipemap', () => canvasTex(1024, 640, (x, W, H) => {
    const r = rng(1234);
    x.fillStyle = '#e9dcb4'; x.fillRect(0, 0, W, H);
    blotch(x, W, H, r, 50, ['#d8c498', '#f4ead0', '#cdb684'], 30, 120, 0.3);
    // sea wash and wave hatching inside the border
    x.fillStyle = 'rgba(96,150,160,0.42)'; x.fillRect(40, 40, W - 80, H - 80);
    x.strokeStyle = 'rgba(40,90,110,0.35)'; x.lineWidth = 1.5;
    for (let i = 0; i < 90; i++) { const px = 60 + r() * (W - 140), py = 60 + r() * (H - 120); x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 7, py - 5, px + 14, py); x.quadraticCurveTo(px + 21, py + 5, px + 28, py); x.stroke(); }
    // island: coast ripples, sand, two terraces of green
    const cx = 520, cy = 330;
    for (const [k, a] of [[1.1, 0.12], [1.06, 0.2], [1.03, 0.3]]) { blobPath(x, islandPts(cx, cy, 240, 1.4, k)); x.strokeStyle = `rgba(40,90,110,${a})`; x.lineWidth = 3; x.stroke(); }
    blobPath(x, islandPts(cx, cy, 240, 1.4)); x.fillStyle = '#dcc68a'; x.fill(); x.strokeStyle = '#5a4a2a'; x.lineWidth = 3.5; x.stroke();
    blobPath(x, islandPts(cx - 10, cy - 6, 240, 1.4, 0.84, 0.4)); x.fillStyle = '#a9b878'; x.fill(); x.strokeStyle = 'rgba(70,80,40,0.6)'; x.lineWidth = 2; x.stroke();
    blobPath(x, islandPts(cx - 40, cy - 30, 240, 1.3, 0.5, 1.1)); x.fillStyle = '#93a666'; x.fill(); x.stroke();
    // cliff hachures along the terrace edge
    x.strokeStyle = 'rgba(70,60,30,0.45)'; x.lineWidth = 1.2;
    for (const [px, py] of islandPts(cx - 10, cy - 6, 240, 1.4, 0.84, 0.4)) { const dx = px - cx, dy = py - cy, l = Math.hypot(dx, dy); x.beginPath(); x.moveTo(px, py); x.lineTo(px + dx / l * 9, py + dy / l * 9); x.stroke(); }
    // fortress (upper left)
    const fx = 372, fy = 214;
    x.fillStyle = '#6a6a72'; x.fillRect(fx - 30, fy - 22, 60, 44);
    for (let i = 0; i < 6; i++) x.fillRect(fx - 30 + i * 11, fy - 30, 7, 9);
    x.fillStyle = '#4a4a52'; x.fillRect(fx - 8, fy, 16, 22);
    x.strokeStyle = '#2a2a30'; x.lineWidth = 2; x.strokeRect(fx - 30, fy - 22, 60, 44);
    x.fillStyle = '#2a2a30'; x.fillRect(fx + 20, fy - 58, 2, 30); x.fillStyle = '#c8452f'; x.beginPath(); x.moveTo(fx + 22, fy - 58); x.lineTo(fx + 40, fy - 52); x.lineTo(fx + 22, fy - 46); x.fill();
    // town (lower right): little red-roofed houses
    const tx = 694, ty = 404;
    for (let i = 0; i < 9; i++) {
      const hx = tx - 50 + (i % 3) * 36 + (r() - 0.5) * 8, hy = ty - 26 + Math.floor(i / 3) * 26;
      x.fillStyle = '#f2e6c8'; x.fillRect(hx, hy, 24, 15); x.strokeStyle = '#5a4a2a'; x.lineWidth = 1.2; x.strokeRect(hx, hy, 24, 15);
      x.fillStyle = '#b84a2a'; x.beginPath(); x.moveTo(hx - 3, hy); x.lineTo(hx + 12, hy - 10); x.lineTo(hx + 27, hy); x.fill();
    }
    // lighthouse at the east tip, harbour pier in the south
    x.fillStyle = '#f0ece0'; x.fillRect(888, 270, 10, 30); x.fillStyle = '#c8452f'; x.fillRect(886, 262, 14, 9);
    x.fillStyle = '#8a8070'; x.fillRect(600, 540, 14, 50);
    // the main: fortress -> town (dark casing, blue water core, dashed flow)
    const line = [[fx + 30, fy + 6], [446, 226], [500, 262], [532, 318], [590, 336], [640, 368], [tx - 54, ty - 18]];
    const stroke = (w, c, dash = []) => { x.setLineDash(dash); x.lineWidth = w; x.strokeStyle = c; x.lineJoin = x.lineCap = 'round'; x.beginPath(); line.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke(); x.setLineDash([]); };
    stroke(15, '#1e3550'); stroke(9, '#3f8ad0'); stroke(2, '#e8f4ff', [10, 8]);
    for (const [a, b] of line.slice(1, -1)) { x.fillStyle = '#1e3550'; x.beginPath(); x.arc(a, b, 7, 0, 7); x.fill(); x.fillStyle = '#e8f4ff'; x.beginPath(); x.arc(a, b, 3, 0, 7); x.fill(); }
    // branches to the well and the harbour
    x.lineWidth = 6; x.strokeStyle = '#1e3550'; x.beginPath(); x.moveTo(532, 318); x.lineTo(470, 380); x.lineTo(470, 430); x.moveTo(640, 368); x.lineTo(612, 470); x.lineTo(606, 540); x.stroke();
    x.lineWidth = 3; x.strokeStyle = '#6fb0e8'; x.stroke();
    x.fillStyle = '#1e3550'; x.beginPath(); x.arc(470, 438, 10, 0, 7); x.fill(); x.fillStyle = '#6fb0e8'; x.beginPath(); x.arc(470, 438, 6, 0, 7); x.fill();
    // three red valve marks
    [[466, 240, 'I'], [561, 327, 'II'], [656, 380, 'III']].forEach(([a, b, n]) => {
      x.fillStyle = '#fff6e0'; x.beginPath(); x.arc(a, b, 17, 0, 7); x.fill();
      x.lineWidth = 4; x.strokeStyle = '#c0281e'; x.beginPath(); x.arc(a, b, 15, 0, 7); x.stroke();
      x.fillStyle = '#c0281e'; x.beginPath(); x.moveTo(a - 9, b - 7); x.lineTo(a, b); x.lineTo(a - 9, b + 7); x.closePath(); x.moveTo(a + 9, b - 7); x.lineTo(a, b); x.lineTo(a + 9, b + 7); x.closePath(); x.fill();
      x.font = serif(22); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(n, a + 2, b - 34);
    });
    // labels
    x.fillStyle = '#3a2a14'; x.textAlign = 'center'; x.font = serif(18);
    x.fillText('FORTRESS', fx, fy + 48); x.fillText('CITADEL', tx - 10, ty + 40); x.font = serif(14, false); x.fillText('well', 470, 466); x.fillText('harbour', 606, 600);
    // compass rose
    x.save(); x.translate(900, 120);
    for (let i = 0; i < 8; i++) { x.rotate(Math.PI / 4); x.fillStyle = i % 2 ? '#3a2a14' : '#a8382a'; x.beginPath(); x.moveTo(0, -(i % 2 ? 30 : 46)); x.lineTo(7, 0); x.lineTo(-7, 0); x.fill(); }
    x.strokeStyle = '#3a2a14'; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 20, 0, 7); x.stroke(); x.font = serif(16); x.fillStyle = '#3a2a14'; x.fillText('N', 0, -54); x.restore();
    // title cartouche and legend
    x.fillStyle = 'rgba(244,234,204,0.92)'; x.fillRect(64, 500, 300, 96); x.strokeStyle = '#3a2a14'; x.lineWidth = 2; x.strokeRect(64, 500, 300, 96); x.strokeRect(69, 505, 290, 86);
    x.fillStyle = '#3a2a14'; x.textAlign = 'left'; x.font = serif(22); x.fillText('CITADEL WATER MAINS', 82, 534);
    x.font = serif(13, false); x.fillStyle = '#1e3550'; x.fillRect(84, 552, 30, 7); x.fillStyle = '#3a2a14'; x.fillText('main pipe', 124, 560);
    x.strokeStyle = '#c0281e'; x.lineWidth = 3; x.beginPath(); x.arc(234, 556, 7, 0, 7); x.stroke(); x.fillText('bypass valve', 248, 560);
    x.fillText('scale  0 ——— 100 m', 84, 582);
    // border
    x.strokeStyle = '#3a2a14'; x.lineWidth = 4; x.strokeRect(30, 30, W - 60, H - 60); x.lineWidth = 1.5; x.strokeRect(40, 40, W - 80, H - 80);
    for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? '#3a2a14' : '#e9dcb4'; x.fillRect(40 + i * ((W - 80) / 12), 30, (W - 80) / 12, 6); x.fillRect(40 + i * ((W - 80) / 12), H - 36, (W - 80) / 12, 6); }
    ageing(x, W, H, r, 24);
    // pencilled notes
    x.strokeStyle = 'rgba(60,50,40,0.6)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(561, 327); x.lineTo(760, 250); x.stroke();
    x.fillStyle = 'rgba(60,50,40,0.75)'; x.font = 'italic 16px Georgia, serif'; x.fillText('pressure low?', 766, 250);
  })),
  // blueprint of the planet's shell (project table)
  blueprint: () => tex('blueprint', () => canvasTex(512, 512, (x, W, H) => {
    const r = rng(77);
    x.fillStyle = '#1d3f78'; x.fillRect(0, 0, W, H);
    blotch(x, W, H, r, 14, ['#2a5294', '#163266'], 40, 120, 0.4);
    for (let i = 0; i <= W; i += 16) { x.fillStyle = i % 64 ? 'rgba(200,230,255,0.08)' : 'rgba(200,230,255,0.2)'; x.fillRect(i, 0, 1, H); x.fillRect(0, i, W, 1); }
    x.strokeStyle = '#e8f4ff'; x.lineWidth = 3; x.beginPath(); x.arc(256, 290, 200, Math.PI * 1.05, Math.PI * 1.95); x.stroke();
    x.setLineDash([8, 6]); x.lineWidth = 2; x.beginPath(); x.arc(256, 290, 150, 0, 7); x.stroke(); x.beginPath(); x.arc(256, 290, 138, 0, 7); x.stroke(); x.setLineDash([]);
    const g = x.createRadialGradient(256, 290, 4, 256, 290, 70); g.addColorStop(0, 'rgba(160,255,255,0.9)'); g.addColorStop(1, 'rgba(160,255,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(256, 290, 70, 0, 7); x.fill();
    x.strokeStyle = '#e8f4ff'; x.lineWidth = 2; x.beginPath(); x.arc(256, 290, 44, 0, 7); x.stroke();
    // the bore: from the surface down to the shell
    x.lineWidth = 2; x.beginPath(); x.moveTo(248, 90); x.lineTo(248, 140); x.lineTo(256, 152); x.lineTo(264, 140); x.lineTo(264, 90); x.stroke();
    x.fillStyle = '#ffd890'; x.beginPath(); x.moveTo(250, 140); x.lineTo(256, 151); x.lineTo(262, 140); x.fill();
    // leader lines + labels
    x.font = 'bold 14px monospace'; x.fillStyle = '#e8f4ff'; x.lineWidth = 1;
    for (const [ax, ay, bx, by, s] of [[264, 110, 360, 70, 'BORE 3'], [390, 230, 440, 190, 'SHELL'], [290, 300, 400, 380, 'ESSENCE ?'], [120, 150, 60, 110, 'CRUST']]) { x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke(); x.fillText(s, bx + (bx > 256 ? 4 : -50), by - 4); }
    // dimension arrows
    x.beginPath(); x.moveTo(470, 90); x.lineTo(470, 152); x.moveTo(464, 98); x.lineTo(470, 90); x.lineTo(476, 98); x.moveTo(464, 144); x.lineTo(470, 152); x.lineTo(476, 144); x.stroke();
    // title block
    x.strokeStyle = '#e8f4ff'; x.lineWidth = 2; x.strokeRect(330, 430, 170, 70); x.beginPath(); x.moveTo(330, 456); x.lineTo(500, 456); x.moveTo(420, 456); x.lineTo(420, 500); x.stroke();
    x.font = 'bold 13px monospace'; x.fillText('JOINT PROJECT', 340, 449);
    fakeText(x, 336, 466, 80, 3, 9, 'rgba(232,244,255,0.7)', r, 2); fakeText(x, 426, 466, 70, 3, 9, 'rgba(232,244,255,0.7)', r, 2);
    fakeText(x, 20, 440, 260, 5, 12, 'rgba(232,244,255,0.5)', r, 2);
    for (let i = 0; i < 3000; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'; x.fillRect(r() * W, r() * H, 2, 2); }
  })),
  // glowing terminal screens
  screen: (kind = 'wave', hue = '#5ff4ff') => tex('scr' + kind + hue, () => canvasTex(256, 192, (x, W, H) => {
    const r = rng(kind.length * 31 + hue.length);
    x.fillStyle = '#031418'; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(95,244,255,0.12)'; x.lineWidth = 1;
    for (let i = 0; i < W; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
    for (let i = 0; i < H; i += 16) { x.beginPath(); x.moveTo(0, i); x.lineTo(W, i); x.stroke(); }
    x.strokeStyle = hue; x.fillStyle = hue; x.shadowColor = hue; x.shadowBlur = 6;
    if (kind === 'wave') {
      x.lineWidth = 3; x.beginPath(); for (let i = 0; i <= W; i += 3) x.lineTo(i, 110 + Math.sin(i * 0.06) * 34 * Math.sin(i * 0.013 + 1) + Math.sin(i * 0.31) * 4); x.stroke();
      fakeText(x, 14, 14, 140, 3, 12, hue, r, 4);
    } else if (kind === 'bars') {
      for (let i = 0; i < 12; i++) { const h = 30 + r() * 110; x.fillStyle = i === 8 ? '#ffb040' : hue; x.fillRect(18 + i * 19, 170 - h, 12, h); }
      fakeText(x, 14, 12, 200, 1, 12, hue, r, 5);
    } else if (kind === 'shaft') {
      x.lineWidth = 2; x.strokeRect(96, 20, 64, 160);
      for (let i = 0; i < 8; i++) { x.globalAlpha = 0.3 + (i / 8) * 0.7; x.fillRect(100, 24 + i * 19, 56, 12); } x.globalAlpha = 1;
      x.fillStyle = '#ffb040'; x.beginPath(); x.moveTo(118, 150); x.lineTo(128, 172); x.lineTo(138, 150); x.fill();
      x.fillStyle = hue; fakeText(x, 172, 30, 70, 8, 16, hue, r, 4); fakeText(x, 12, 30, 70, 8, 16, hue, r, 4);
    } else if (kind === 'radar') {
      x.lineWidth = 2; for (const rr of [30, 55, 80]) { x.beginPath(); x.arc(128, 96, rr, 0, 7); x.stroke(); }
      x.beginPath(); x.moveTo(48, 96); x.lineTo(208, 96); x.moveTo(128, 16); x.lineTo(128, 176); x.stroke();
      const g = x.createRadialGradient(128, 96, 0, 128, 96, 80); g.addColorStop(0, 'rgba(95,244,255,0.5)'); g.addColorStop(1, 'rgba(95,244,255,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(128, 96); x.arc(128, 96, 80, -1.2, -0.4); x.fill();
      x.fillStyle = '#ffb040'; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(128 + (r() - 0.5) * 120, 96 + (r() - 0.5) * 120, 3, 0, 7); x.fill(); }
    } else if (kind === 'map') {
      blobPath(x, islandPts(128, 100, 62, 1.4)); x.lineWidth = 2; x.stroke(); x.globalAlpha = 0.2; x.fill(); x.globalAlpha = 1;
      x.fillStyle = '#ffb040'; x.beginPath(); x.arc(92, 76, 5, 0, 7); x.fill(); x.fillStyle = hue; x.beginPath(); x.arc(160, 118, 4, 0, 7); x.fill();
      fakeText(x, 12, 168, 230, 1, 12, hue, r, 4);
    } else {
      fakeText(x, 14, 14, 228, 12, 14, hue, r, 5);
      x.fillRect(14, 182, 10, 4);
    }
    x.shadowBlur = 0;
    screenFX(x, W, H, r);
  })),
  // typed office papers / ledgers
  doc: (kind = 'form') => tex('doc' + kind, () => canvasTex(128, 176, (x, W, H) => {
    const r = rng(kind.length * 5 + 3);
    x.fillStyle = kind === 'ledger' ? '#f2ead0' : '#f6f1e2'; x.fillRect(0, 0, W, H);
    if (kind === 'ledger') {
      x.strokeStyle = 'rgba(60,110,170,0.5)'; x.lineWidth = 1; for (let y = 22; y < H; y += 9) { x.beginPath(); x.moveTo(4, y); x.lineTo(W - 4, y); x.stroke(); }
      x.strokeStyle = 'rgba(190,50,40,0.6)'; for (const xx of [24, 92]) { x.beginPath(); x.moveTo(xx, 8); x.lineTo(xx, H - 4); x.stroke(); }
      x.strokeStyle = 'rgba(30,30,60,0.75)'; x.lineWidth = 1.2;
      for (let y = 20; y < H - 10; y += 9) { if (r() < 0.2) continue; x.beginPath(); let xx = 28; x.moveTo(xx, y); while (xx < 28 + 30 + r() * 30) { xx += 3; x.lineTo(xx, y - 1 - r() * 4); } x.stroke(); x.beginPath(); x.moveTo(98, y); x.lineTo(98 + r() * 22, y - 2); x.stroke(); }
    } else {
      x.fillStyle = kind === 'project' ? '#2e6e6a' : '#3a4a6a'; x.fillRect(10, 10, W - 20, 12);
      fakeText(x, 12, 32, W - 24, 12, 10, 'rgba(40,40,50,0.7)', r, 2);
      if (kind === 'form') { x.strokeStyle = 'rgba(190,40,30,0.7)'; x.lineWidth = 3; x.beginPath(); x.arc(92, 146, 16, 0, 7); x.stroke(); x.font = 'bold 10px sans-serif'; x.fillStyle = 'rgba(190,40,30,0.7)'; x.fillText('OK', 85, 150); }
    }
  })),
  // a hanging cloth banner with the Joint Project's emblem
  banner: () => tex('banner', () => canvasTex(256, 384, (x, W, H) => {
    const r = rng(9);
    x.fillStyle = '#245e5c'; x.fillRect(0, 0, W, H);
    blotch(x, W, H, r, 20, ['#1a4644', '#2e7270'], 20, 80, 0.4);
    x.strokeStyle = '#d9a94a'; x.lineWidth = 8; x.strokeRect(14, 14, W - 28, H - 70);
    x.lineWidth = 2; x.strokeRect(26, 26, W - 52, H - 94);
    x.fillStyle = '#d9a94a'; x.beginPath(); x.moveTo(0, H - 50); x.lineTo(W / 2, H); x.lineTo(W, H - 50); x.lineTo(W, H - 44); x.lineTo(W / 2, H - 4); x.lineTo(0, H - 44); x.fill();
    // emblem: planet in a horned ring, glowing core, the two worlds' stars
    x.translate(W / 2, 160);
    x.lineWidth = 10; x.strokeStyle = '#d9a94a'; x.beginPath(); x.arc(0, 0, 74, Math.PI * 0.15, Math.PI * 0.85, true); x.stroke();
    x.beginPath(); x.moveTo(-70, 26); x.quadraticCurveTo(-96, -10, -80, -60); x.moveTo(70, 26); x.quadraticCurveTo(96, -10, 80, -60); x.stroke();
    const g = x.createRadialGradient(0, 0, 4, 0, 0, 52); g.addColorStop(0, '#e8ffff'); g.addColorStop(0.5, '#5ff4ff'); g.addColorStop(1, '#1a6a78'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 50, 0, 7); x.fill();
    x.lineWidth = 3; x.strokeStyle = '#e8ffff'; x.beginPath(); x.ellipse(0, 0, 66, 16, -0.3, 0, 7); x.stroke();
    x.fillStyle = '#ffe890'; for (const sx of [-1, 1]) { x.beginPath(); x.arc(sx * 40, -104, 9, 0, 7); x.fill(); }
    x.font = serif(20); x.fillStyle = '#d9a94a'; x.textAlign = 'center'; x.fillText('TWINSUN · ZEELICH', 0, 110);
  })),
  // stencilled crate side
  stencil: (base = '#2e4a46') => tex('stencil' + base, () => canvasTex(128, 128, (x, W, H) => {
    const r = rng(base.length + 2);
    x.fillStyle = base; x.fillRect(0, 0, W, H);
    blotch(x, W, H, r, 10, ['#1a2a28', '#4a6a64'], 10, 40, 0.3);
    x.strokeStyle = 'rgba(232,220,180,0.75)'; x.lineWidth = 6; x.beginPath(); x.arc(64, 56, 24, 0, 7); x.stroke();
    x.beginPath(); x.ellipse(64, 56, 36, 9, -0.3, 0, 7); x.lineWidth = 3; x.stroke();
    x.fillStyle = 'rgba(232,220,180,0.75)'; for (const sx of [44, 84]) { x.beginPath(); x.moveTo(sx, 96); x.lineTo(sx + 8, 106); x.lineTo(sx + 3, 106); x.lineTo(sx + 3, 116); x.lineTo(sx - 3, 116); x.lineTo(sx - 3, 106); x.lineTo(sx - 8, 106); x.fill(); }
  })),
  // a little painted shop-sign board
  sign: (text, bg = '#2a4a7a', fg = '#f4e8c8') => tex('sign' + text + bg, () => canvasTex(512, 128, (x, W, H) => {
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.strokeStyle = fg; x.lineWidth = 5; x.strokeRect(10, 10, W - 20, H - 20);
    // water drop
    x.fillStyle = '#7fc8f0'; x.beginPath(); x.moveTo(60, 30); x.bezierCurveTo(84, 62, 84, 98, 60, 98); x.bezierCurveTo(36, 98, 36, 62, 60, 30); x.fill();
    x.fillStyle = fg; x.font = serif(54); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W / 2 + 30, H / 2 + 3);
  })),
};
TEX.hazard = () => tex('hazard', () => {
  const S = 128, [c, x] = cnv(S); const r = rng(5);
  x.fillStyle = '#1e1e22'; x.fillRect(0, 0, S, S);
  x.fillStyle = '#e8b830';
  for (let i = -2; i < 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64 + 32, 0); x.lineTo(i * 64 + 32 + S, S); x.lineTo(i * 64 + S, S); x.fill(); }
  blotch(x, S, S, r, 12, ['#3a3020', '#c8c0a0'], 6, 24, 0.25);
  return toTex(c);
});
MAT.hazard = () => M('hazard', () => std({ map: TEX.hazard(), roughness: 0.6, metalness: 0.2 }, 0.5));
MAT.screen = (t, k = 1.3) => M('scr' + t.uuid + k, () => std({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: k, roughness: 0.25 }, 0, { noShadow: true }));
MAT.leather = (c = '#7a2a22') => M('lea' + c, () => std({ map: TEX.fabric(c, '#000000'), roughness: 0.55 }, 0.5));

// ---- furniture ---------------------------------------------------------
// steel filing cabinet; front +z
export function filingCabinet(k, { w = 0.48, d = 0.62, h = 1.32, n = 4, color = '#6f7f6a', open = -1 } = {}) {
  const body = MAT.paint(color, 0.5), br = MAT.brass(), card = MAT.flat('#f4efe2', 0.9);
  k.add(rbox(w - 0.02, 0.07, d - 0.06, 0.01), MAT.iron(), 0, 0.035, -0.02);
  k.add(rbox(w, h - 0.07, d, 0.02), body, 0, 0.07 + (h - 0.07) / 2, 0);
  k.add(rbox(w + 0.02, 0.03, d + 0.02, 0.012), body, 0, h, 0);
  const dh = (h - 0.12) / n;
  const handle = pipe([[-0.075, 0, 0], [-0.065, 0, 0.03], [0.065, 0, 0.03], [0.075, 0, 0]], 0.007, 0.012, 5);
  for (let i = 0; i < n; i++) {
    const y = 0.1 + dh * (i + 0.5), oz = i === open ? 0.32 : 0;
    if (oz) {
      k.add(rbox(w - 0.08, dh - 0.06, oz, 0.006), MAT.paint(color, 0.6), 0, y - 0.01, d / 2 + oz / 2 - 0.02);
      for (let j = 0; j < 6; j++) k.add(rbox(w - 0.12, dh - 0.1 - (j % 2) * 0.03, 0.01, 0.003), MAT.flat(['#e8d8a0', '#f2ead6', '#c8b880'][j % 3], 0.9), 0, y, d / 2 + 0.04 + j * 0.045, 0, { rx: -0.15 });
    }
    k.add(rbox(w - 0.05, dh - 0.03, 0.03, 0.01), body, 0, y, d / 2 + 0.005 + oz, 0, { jit: true });
    k.add(handle, br, 0, y - dh * 0.18, d / 2 + 0.02 + oz);
    k.add(rbox(0.1, 0.055, 0.008, 0.003), br, 0, y + dh * 0.17, d / 2 + 0.022 + oz);
    k.add(plane(0.082, 0.04), card, 0, y + dh * 0.17, d / 2 + 0.027 + oz);
  }
  return { hw: w / 2 + 0.01, hd: d / 2 + 0.03, top: h + 0.015 };
}
// panelled service counter; public side +z
export function counter(k, { w = 3, d = 0.62, h = 1.05, pal = 'honey', top = null } = {}) {
  const m = MAT.wood(pal), md = MAT.wood(darker(pal));
  k.add(rbox(w - 0.06, 0.1, d - 0.1, 0.02), md, 0, 0.05, -0.02);
  k.add(rbox(w - 0.04, h - 0.16, d - 0.06, 0.02), m, 0, 0.1 + (h - 0.16) / 2, -0.01);
  const n = Math.max(1, Math.round(w / 0.8)), pw = (w - 0.1) / n;
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.05 + pw * (i + 0.5);
    k.add(rbox(pw - 0.14, h - 0.4, 0.03, 0.02), md, x, 0.12 + (h - 0.4) / 2 + 0.04, d / 2 - 0.035);
    k.add(rbox(pw - 0.26, h - 0.54, 0.03, 0.025), m, x, 0.12 + (h - 0.4) / 2 + 0.04, d / 2 - 0.02, 0, { jit: true });
  }
  for (let i = 0; i <= n; i++) k.add(rbox(0.08, h - 0.14, 0.06, 0.015), md, -w / 2 + 0.05 + pw * i, 0.1 + (h - 0.14) / 2, d / 2 - 0.03);
  k.add(rbox(w + 0.04, 0.035, d + 0.06, 0.012), md, 0, h - 0.075, 0.01);
  k.add(rbox(w + 0.1, 0.06, d + 0.12, 0.025), top || m, 0, h - 0.03, 0.03, 0, { jit: true });
  return { hw: w / 2 + 0.05, hd: d / 2 + 0.09, top: h };
}
export function deskBell(k, x, y, z) {
  k.add(lathe([[0.001, 0], [0.05, 0], [0.052, 0.012], [0.001, 0.012]], 12), MAT.wood('dark'), x, y, z);
  k.add(lathe([[0.001, 0.012], [0.045, 0.014], [0.044, 0.028], [0.034, 0.048], [0.016, 0.058], [0.001, 0.06]], 14), MAT.brass(), x, y, z);
  k.add(lathe([[0.001, 0], [0.006, 0], [0.006, 0.018], [0.011, 0.022], [0.001, 0.027]], 6), MAT.brass(), x, y + 0.058, z);
}
const knob = () => lathe([[0.001, 0], [0.016, 0], [0.01, 0.015], [0.018, 0.025], [0.001, 0.032]], 8);
// pedestal desk with leather inlay; the knee-hole/sitter side is +z
export function desk(k, { w = 1.5, d = 0.75, h = 0.78, pal = 'dark', leather = '#2f5a3a', metal = null } = {}) {
  const m = metal || MAT.wood(pal), md = metal ? MAT.iron() : MAT.wood(darker(pal)), br = MAT.brass();
  k.add(rbox(w, 0.05, d, 0.02), m, 0, h - 0.025, 0, 0, { jit: true });
  if (leather) k.add(rbox(w - 0.22, 0.012, d - 0.2, 0.004), MAT.leather(leather), 0, h + 0.002, 0.01);
  const pw = 0.42;
  for (const sx of [-1, 1]) {
    const px = sx * (w / 2 - pw / 2 - 0.03);
    k.add(rbox(pw, h - 0.13, d - 0.08, 0.015), m, px, 0.08 + (h - 0.13) / 2, -0.01);
    k.add(rbox(pw + 0.02, 0.08, d - 0.04, 0.015), md, px, 0.04, -0.01);
    for (let i = 0; i < 3; i++) {
      const y = 0.22 + i * 0.165;
      k.add(rbox(pw - 0.06, 0.14, 0.025, 0.01), md, px, y, d / 2 - 0.04);
      k.add(knob(), br, px, y, d / 2 - 0.03, 0, { rx: Math.PI / 2 });
    }
  }
  k.add(rbox(w - 2 * pw - 0.08, 0.1, 0.03, 0.01), md, 0, h - 0.11, d / 2 - 0.04);
  k.add(knob(), br, 0, h - 0.11, d / 2 - 0.03, 0, { rx: Math.PI / 2 });
  k.add(rbox(w - 2 * pw, h - 0.25, 0.03, 0.01), md, 0, (h - 0.25) / 2 + 0.1, -d / 2 + 0.06);
  return { hw: w / 2, hd: d / 2, top: h };
}
// swivel chair (five-star base); faces +z
export function officeChair(k, { color = '#7a2a22' } = {}) {
  const ir = MAT.iron(), br = MAT.brass(), le = MAT.leather(color);
  for (let i = 0; i < 5; i++) { const a = i * 1.2566; k.add(rbox(0.3, 0.035, 0.05, 0.012), ir, Math.sin(a) * 0.14, 0.07, Math.cos(a) * 0.14, a + Math.PI / 2); k.add(sphere(0.028, 8, 6), ir, Math.sin(a) * 0.28, 0.03, Math.cos(a) * 0.28); }
  k.add(cyl(0.025, 0.03, 0.36, 8), br, 0, 0.26, 0);
  k.add(pillowGeo(0.46, 0.09, 0.44, color, 'chairseat'), softMat, 0, 0.48, 0);
  k.add(rbox(0.44, 0.48, 0.07, 0.035), le, 0, 0.8, -0.22, 0, { rx: -0.12 });
  k.add(rbox(0.04, 0.3, 0.03, 0.01), ir, 0, 0.55, -0.24, 0, { rx: -0.1 });
  for (const sx of [-1, 1]) k.add(pipe([[sx * 0.24, 0.46, 0.14], [sx * 0.25, 0.64, 0.12], [sx * 0.25, 0.64, -0.14], [sx * 0.24, 0.56, -0.2]], 0.014, 0.04, 6), br, 0, 0, 0);
  return { r: 0.3, top: 0.62 };
}
// open ledger lying on a surface
export function ledger(k, x, y, z, ry = 0, color = '#7a2a22') {
  k.at(x, y, z, ry, () => {
    k.add(rbox(0.46, 0.012, 0.31, 0.004), MAT.cloth(color, '#000000'), 0, 0.006, 0);
    for (const s of [-1, 1]) {
      k.add(rbox(0.21, 0.018, 0.28, 0.006), MAT.flat('#efe6cc', 0.9), s * 0.11, 0.02, 0, 0, { rz: s * 0.05 });
      k.add(plane(0.2, 0.27), MAT.map(CANV.doc('ledger'), 0.9), s * 0.11, 0.031 + 0.004, 0, 0, { rx: -Math.PI / 2, rz: s * 0.05 });
    }
    k.add(cyl(0.012, 0.012, 0.29, 6), MAT.flat('#efe6cc', 0.9), 0, 0.022, 0, 0, { rx: Math.PI / 2 });
  });
}
// a few loose sheets
export function papers(k, x, y, z, n = 3, seed = 1, kind = 'form') {
  const r = rng(seed * 13 + 7);
  for (let i = 0; i < n; i++) k.add(plane(0.21, 0.29), MAT.map(CANV.doc(kind), 0.9), x + (r() - 0.5) * 0.12, y + 0.003 + i * 0.002, z + (r() - 0.5) * 0.1, (r() - 0.5) * 1.2, { rx: -Math.PI / 2 });
}
// banker's lamp: brass stand, green glass shade
export function deskLamp(k, { shade = '#2f8a4a' } = {}) {
  const br = MAT.brass();
  k.add(lathe([[0.001, 0], [0.09, 0], [0.095, 0.015], [0.06, 0.03], [0.02, 0.04], [0.001, 0.04]], 14), br, 0, 0, 0);
  k.add(cyl(0.011, 0.011, 0.3, 6), br, 0, 0.18, 0);
  k.add(cached('lampshade', () => new THREE.CylinderGeometry(0.075, 0.075, 0.3, 14, 1, true, 0, Math.PI)), MAT.glow(shade, shade, 0.7), 0, 0.34, 0.02, Math.PI / 2, { rz: Math.PI / 2 });
  k.add(rbox(0.3, 0.012, 0.012, 0.004), br, 0, 0.34, 0.095);
  k.add(cyl(0.02, 0.02, 0.24, 8), MAT.glow('#fff4d8', '#ffd890', 2.2), 0, 0.33, 0.02, 0, { rz: Math.PI / 2 });
  k.add(cyl(0.003, 0.003, 0.1, 3), br, 0.06, 0.26, 0.07);
  k.add(sphere(0.008, 6, 4), br, 0.06, 0.21, 0.07);
}
// candlestick telephone
export function telephone(k) {
  const ir = MAT.flat('#1e1c1a', 0.35, { metalness: 0.3 }), br = MAT.brass();
  k.add(lathe([[0.001, 0], [0.06, 0], [0.062, 0.012], [0.03, 0.03], [0.012, 0.05], [0.012, 0.22], [0.025, 0.23], [0.035, 0.26], [0.001, 0.27]], 12), ir, 0, 0, 0);
  k.add(rbox(0.012, 0.06, 0.012, 0.004), br, 0.02, 0.2, 0);
  k.add(lathe([[0.001, 0], [0.018, 0], [0.03, 0.06], [0.026, 0.065], [0.012, 0.01], [0.001, 0.01]], 10), ir, 0.03, 0.19, 0, 0, { rz: Math.PI });
  k.add(pipe([[0, 0.02, 0], [0.12, 0.02, 0.04], [0.16, 0.0, 0.1]], 0.005, 0.04, 4), ir, 0, 0, 0);
}
// office water cooler; the big bottle can be empty
export function waterCooler(k, { empty = true } = {}) {
  const body = MAT.paint('#e8e2d0', 0.45), blue = MAT.paint('#3a6fb0', 0.4), st = MAT.steel();
  k.add(rbox(0.36, 0.06, 0.36, 0.01), MAT.iron(), 0, 0.03, 0);
  k.add(rbox(0.34, 0.92, 0.34, 0.03), body, 0, 0.52, 0);
  k.add(rbox(0.28, 0.3, 0.02, 0.01), blue, 0, 0.75, 0.17);
  k.add(rbox(0.36, 0.04, 0.36, 0.015), body, 0, 0.995, 0);
  k.add(lathe([[0.001, 0], [0.09, 0], [0.11, 0.02], [0.11, 0.06], [0.06, 0.07], [0.001, 0.07]], 14), st, 0, 1.0, 0);
  // taps and drip tray
  for (const [sx, c] of [[-0.06, '#3a6fb0'], [0.06, '#c8452f']]) { k.add(rbox(0.04, 0.05, 0.05, 0.01), st, sx, 0.84, 0.19); k.add(sphere(0.016, 6, 4), MAT.flat(c, 0.4), sx, 0.88, 0.2); }
  k.add(rbox(0.2, 0.025, 0.08, 0.008), st, 0, 0.62, 0.2);
  // inverted 19-litre bottle (glass), with a last splash in the neck
  const gl = MAT.glass('#cfeaff', empty ? 0.22 : 0.45);
  k.add(lathe([[0.001, 0], [0.03, 0], [0.032, 0.06], [0.06, 0.1], [0.13, 0.16], [0.135, 0.22], [0.13, 0.25], [0.135, 0.3], [0.135, 0.42], [0.12, 0.47], [0.001, 0.48]], 18), gl, 0, 1.04, 0);
  for (const y of [0.22, 0.3]) k.add(torus(0.134, 0.006, 4, 18), gl, 0, 1.04 + y, 0, 0, { rx: Math.PI / 2 });
  if (empty) k.add(cyl(0.028, 0.028, 0.04, 8), MAT.glass('#4f9ad8', 0.6), 0, 1.07, 0);
  else k.add(lathe([[0.001, 0], [0.028, 0], [0.12, 0.15], [0.128, 0.36], [0.001, 0.36]], 14), MAT.glass('#4f9ad8', 0.5), 0, 1.05, 0);
  // paper-cup tube
  k.add(cyl(0.035, 0.035, 0.32, 10), st, 0.2, 0.68, 0.06);
  k.add(lathe([[0.001, 0], [0.022, 0], [0.034, 0.07], [0.001, 0.07]], 8), MAT.flat('#f4efe2', 0.8), 0.2, 0.47, 0.06);
  return { hw: 0.2, hd: 0.2, top: 1.5 };
}
// wall-mounted pressure gauge facing +z (origin at the wall)
export function gauge(k, { r = 0.11, zone = '#c8452f', v = 0.4, stem = true } = {}) {
  const br = MAT.brass();
  k.add(lathe([[0.001, 0], [r * 1.1, 0], [r * 1.14, 0.02], [r * 1.12, 0.05], [r * 0.96, 0.05]], 20), br, 0, 0, 0.04, 0, { rx: Math.PI / 2 });
  k.add(torus(r * 1.04, r * 0.08, 6, 24), br, 0, 0, 0.09);
  k.add(disc(r, 24), MAT.map(CANV.dial(zone), 0.5), 0, 0, 0.085);
  const a = Math.PI * 0.75 + v * Math.PI * 1.5;
  k.add(rbox(r * 0.85, 0.01, 0.006, 0.002), MAT.flat('#a8201a', 0.4), Math.cos(a) * r * 0.36, -Math.sin(a) * r * 0.36, 0.092, 0, { rz: -a });
  k.add(sphere(0.012, 6, 4), br, 0, 0, 0.094);
  if (stem) { k.add(cyl(0.018, 0.018, 0.12, 8), br, 0, -r * 1.1 - 0.05, 0.06); k.add(rbox(0.05, 0.03, 0.05, 0.008), br, 0, -r * 1.1 - 0.12, 0.06); }
  // glass
  k.add(disc(r * 1.02, 24), MAT.glass('#ffffff', 0.12), 0, 0, 0.1);
}
// hand wheel for a valve, in the XY plane facing +z
export function valveWheel(k, { r = 0.16, color = '#b8302a' } = {}) {
  const m = MAT.paint(color, 0.4);
  k.add(torus(r, r * 0.12, 6, 24), m, 0, 0, 0);
  for (let i = 0; i < 4; i++) k.add(rbox(r * 1.9, r * 0.12, r * 0.1, 0.004), m, 0, 0, 0, 0, { rz: (i * Math.PI) / 4 + 0.3 });
  k.add(cyl(r * 0.22, r * 0.22, r * 0.4, 10), MAT.brass(), 0, 0, 0, 0, { rx: Math.PI / 2 });
}
// pipe run with flanges at each bend and every ~1.2 m along axis-aligned segments
export function pipeline(k, pts, r = 0.06, mat = null, flMat = null) {
  const m = mat || MAT.copper(), fm = flMat || MAT.brass();
  k.add(pipe(pts, r, Math.max(0.12, r * 3), 10), m, 0, 0, 0);
  const ring = (p, d) => {
    const ax = Math.abs(d[0]) > 0.5 ? 'x' : Math.abs(d[1]) > 0.5 ? 'y' : 'z';
    const o = ax === 'x' ? { ry: Math.PI / 2 } : ax === 'y' ? { rx: Math.PI / 2 } : {};
    k.add(cyl(r * 1.45, r * 1.45, 0.05, 12), fm, p[0], p[1], p[2], o.ry || 0, ax === 'y' ? {} : { rx: Math.PI / 2 });
  };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L, (b[2] - a[2]) / L];
    const n = Math.floor(L / 1.2);
    for (let j = 1; j <= n; j++) { const t = j / (n + 1); ring([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], d); }
  }
}
// hanging sign on two chains (centre at the board), faces +z
export function hangingSign(k, w, h, t, top) {
  k.add(rbox(w + 0.06, h + 0.06, 0.05, 0.02), MAT.wood('dark'), 0, 0, 0);
  for (const s of [-1, 1]) k.add(plane(w, h), MAT.map(t, 0.6), 0, 0, s * 0.027, s > 0 ? 0 : Math.PI);
  for (const sx of [-1, 1]) { k.add(cyl(0.006, 0.006, top - h / 2, 4), MAT.iron(), sx * w * 0.38, h / 2 + (top - h / 2) / 2, 0); k.add(torus(0.02, 0.005, 4, 8), MAT.brass(), sx * w * 0.38, h / 2 + 0.02, 0); }
}
// cork notice board with pinned notes, faces +z
export function noticeBoard(k, w = 0.8, h = 0.55, seed = 1) {
  const r = rng(seed * 3 + 1);
  k.add(rbox(w + 0.06, h + 0.06, 0.03, 0.012), MAT.wood('dark'), 0, 0, 0.015);
  k.add(plane(w, h), MAT.cloth('#b8885a', '#6a4a2a'), 0, 0, 0.032);
  for (let i = 0; i < 5; i++) {
    const px = (r() - 0.5) * (w - 0.2), py = (r() - 0.5) * (h - 0.2);
    k.add(plane(0.15, 0.2), MAT.map(CANV.doc(i % 2 ? 'form' : 'ledger'), 0.9), px, py, 0.036 + i * 0.001, 0, { rz: (r() - 0.5) * 0.3 });
    k.add(sphere(0.012, 6, 4), MAT.flat(['#c8452f', '#3a6fb0', '#e9c46a'][i % 3], 0.4), px, py + 0.08, 0.045);
  }
}
export function wallClock(k, r = 0.2) {
  k.add(lathe([[0.001, 0], [r, 0], [r * 1.06, 0.03], [r, 0.06]], 24), MAT.wood('dark'), 0, 0, 0, 0, { rx: Math.PI / 2 });
  k.add(torus(r * 0.98, 0.02, 6, 24), MAT.brass(), 0, 0, 0.06);
  k.add(disc(r * 0.94, 24), MAT.map(CANV.clock(), 0.5), 0, 0, 0.055);
  k.add(rbox(0.012, r * 0.55, 0.005, 0.002), MAT.flat('#1a1a1a'), Math.sin(-0.6) * -r * 0.25, r * 0.22, 0.062, 0, { rz: 0.6 });
  k.add(rbox(0.012, r * 0.8, 0.005, 0.002), MAT.flat('#1a1a1a'), r * 0.33, -0.06, 0.064, 0, { rz: 2.0 });
}

// ---- Joint Project kit -------------------------------------------------
const TEAL = '#3f8a86';
// tall riveted locker with louvred doors and brass trim; front +z
export function locker(k, { w = 0.9, d = 0.5, h = 1.95, color = TEAL, doors = 2, ajar = false } = {}) {
  const body = MAT.plates(color, 0.7), door = MAT.paint(color, 0.45), dk = MAT.paint('#1e3a38', 0.6), br = MAT.brass();
  k.add(rbox(w + 0.02, 0.1, d, 0.015), MAT.iron(), 0, 0.05, 0);
  k.add(rbox(w, h - 0.18, d, 0.02), body, 0, 0.1 + (h - 0.18) / 2, 0);
  k.add(rbox(w + 0.06, 0.08, d + 0.06, 0.02), br, 0, h - 0.04, 0);
  const dw = (w - 0.06) / doors, dh = h - 0.3;
  for (let i = 0; i < doors; i++) {
    const x = -w / 2 + 0.03 + dw * (i + 0.5);
    const open = ajar && i === doors - 1;
    k.at(open ? x + dw / 2 - 0.01 : x, 0, d / 2 + 0.012, open ? 0.9 : 0, () => {
      const ox = open ? -dw / 2 + 0.01 : 0;
      k.add(rbox(dw - 0.03, dh, 0.025, 0.008), door, ox, 0.13 + dh / 2, 0);
      for (let j = 0; j < 5; j++) k.add(rbox(dw * 0.55, 0.018, 0.02, 0.004), dk, ox, 0.13 + dh - 0.16 - j * 0.045, 0.014, 0, { rx: -0.5 });
      for (let j = 0; j < 4; j++) k.add(rbox(dw * 0.55, 0.018, 0.02, 0.004), dk, ox, 0.32 + j * 0.045, 0.014, 0, { rx: -0.5 });
      k.add(rbox(0.03, 0.16, 0.025, 0.006), br, ox + (i % 2 ? -1 : 1) * (dw / 2 - 0.07), 0.13 + dh * 0.48, 0.022);
      k.add(rbox(0.09, 0.05, 0.008, 0.003), br, ox, 0.13 + dh * 0.62, 0.016);
      k.add(plane(0.07, 0.03), MAT.flat('#f4efe2', 0.9), ox, 0.13 + dh * 0.62, 0.021);
    });
    if (open) { k.add(rbox(dw - 0.04, dh - 0.04, 0.01, 0.004), MAT.flat('#14201e', 0.9), x, 0.13 + dh / 2, d / 2 - 0.01); for (let j = 0; j < 3; j++) k.add(rbox(0.2, 0.3, 0.04, 0.01), MAT.cloth(['#e8d8a0', '#7a2a22', '#2a4a7a'][j], '#000'), x - 0.08 + j * 0.06, 0.45 + j * 0.02, d / 2 - 0.08, 0, { rz: 0.06 * j }); }
  }
  // emblem plate with a cyan glow
  k.add(rbox(0.16, 0.16, 0.02, 0.06), br, 0, h - 0.24, d / 2 + 0.02);
  k.add(sphere(0.04, 10, 6), MAT.glow('#9ff4ff', '#22d4ff', 1.8), 0, h - 0.24, d / 2 + 0.03, 0, { sz: 0.4 });
  for (const sx of [-1, 1]) k.add(rbox(0.035, h - 0.12, 0.04, 0.012), br, sx * (w / 2 + 0.005), 0.06 + (h - 0.12) / 2, d / 2 - 0.01);
  return { hw: w / 2 + 0.03, hd: d / 2 + 0.04, top: h };
}
// metal-framed monitor/terminal on a stand; front +z
export function monitor(k, { w = 0.52, h = 0.38, kind = 'text', hue = '#5ff4ff', brass = true } = {}) {
  const fr = brass ? MAT.brass() : MAT.iron(), cs = MAT.paint('#2e4a48', 0.5);
  k.add(lathe([[0.001, 0], [0.12, 0], [0.12, 0.02], [0.04, 0.04], [0.001, 0.04]], 12), fr, 0, 0, 0);
  k.add(cyl(0.025, 0.03, 0.12, 8), fr, 0, 0.1, 0);
  k.add(rbox(w + 0.06, h + 0.06, 0.24, 0.04), cs, 0, 0.16 + h / 2, -0.06);
  k.add(rbox(w + 0.08, h + 0.08, 0.04, 0.02), fr, 0, 0.16 + h / 2, 0.06);
  k.add(plane(w, h), MAT.screen(CANV.screen(kind, hue)), 0, 0.16 + h / 2, 0.081);
}
// sloped control console with screens, dials, buttons and levers; operator on +z
export function console_(k, { w = 2, d = 0.8, kinds = ['wave', 'bars'], levers = 3, hue = '#5ff4ff', color = TEAL } = {}) {
  const body = MAT.plates(color, 0.6), br = MAT.brass(), ir = MAT.iron(), dk = MAT.paint('#26302e', 0.5);
  k.add(rbox(w, 0.1, d - 0.08, 0.015), ir, 0, 0.05, -0.03);
  k.add(rbox(w - 0.02, 0.72, d - 0.12, 0.03), body, 0, 0.46, -0.05);
  k.add(rbox(w + 0.04, 0.04, d - 0.06, 0.015), br, 0, 0.83, -0.03);
  // sloped desk panel
  const sl = 0.42;
  k.add(rbox(w, 0.06, 0.46, 0.02), dk, 0, 0.93, 0.08, 0, { rx: sl });
  k.add(rbox(w + 0.04, 0.035, 0.06, 0.015), br, 0, 0.86, 0.33);
  // riser with screens
  k.add(rbox(w, 0.62, 0.22, 0.03), body, 0, 1.3, -d / 2 + 0.12);
  k.add(rbox(w + 0.06, 0.06, 0.3, 0.025), br, 0, 1.63, -d / 2 + 0.13);
  const n = kinds.length, sw = (w - 0.2) / n;
  kinds.forEach((kd, i) => {
    const x = -w / 2 + 0.1 + sw * (i + 0.5);
    k.add(rbox(sw - 0.04, 0.42, 0.04, 0.02), br, x, 1.3, -d / 2 + 0.23);
    k.add(plane(sw - 0.12, 0.34), MAT.screen(CANV.screen(kd, hue)), x, 1.3, -d / 2 + 0.252);
  });
  // gauges along the top of the slope
  const gy = (t) => 0.93 + 0.03 + Math.cos(sl) * 0 - Math.sin(sl) * (t - 0.08);
  const gN = Math.max(2, Math.round(w / 0.5));
  for (let i = 0; i < gN; i++) {
    const x = -w / 2 + 0.2 + i * ((w - 0.4) / Math.max(1, gN - 1));
    k.at(x, gy(-0.05) + 0.01, -0.05, 0, () => k.add(disc(0.055, 18), MAT.map(CANV.dial(i % 2 ? '#c8452f' : '#3a6fb0'), 0.5), 0, 0, 0, 0, { rx: -Math.PI / 2 + sl }));
    k.at(x, gy(-0.05) + 0.012, -0.05, 0, () => k.add(torus(0.058, 0.008, 5, 18), br, 0, 0, 0, 0, { rx: -Math.PI / 2 + sl }));
  }
  // buttons
  const cols = ['#e03a3a', '#e9c46a', '#5fd05f', '#5ff4ff'];
  for (let i = 0; i < Math.round(w / 0.12); i++) {
    const x = -w / 2 + 0.12 + i * 0.11, t = 0.16;
    k.add(cyl(0.02, 0.022, 0.025, 8), cols[i % 4] === '#5ff4ff' ? MAT.glow('#9ff4ff', '#22d4ff', 1.5) : MAT.glow(cols[i % 4], cols[i % 4], 0.6), x, gy(t) + 0.03, t, 0, { rx: sl });
  }
  // levers on the right of the slope
  for (let i = 0; i < levers; i++) {
    const x = w / 2 - 0.14 - i * 0.12, t = 0.27;
    k.add(rbox(0.06, 0.03, 0.12, 0.01), ir, x, gy(t) + 0.03, t, 0, { rx: sl });
    k.add(cyl(0.01, 0.01, 0.2, 6), MAT.steel(), x, gy(t) + 0.12, t + 0.02, 0, { rx: sl - 0.4 + i * 0.35 });
    k.add(sphere(0.026, 8, 6), MAT.paint(i === 0 ? '#c8302a' : '#2a2a2e', 0.3), x, gy(t) + 0.21, t + 0.02 + Math.sin(sl - 0.4 + i * 0.35) * 0.1);
  }
  return { hw: w / 2 + 0.02, hd: d / 2 + 0.02, top: 1.66 };
}
// tall instrument cabinet: dials, a screen, big knife switch; front +z
export function instrumentRack(k, { w = 1.2, d = 0.5, h = 2.2, kind = 'shaft', color = TEAL } = {}) {
  const body = MAT.plates(color, 0.7), br = MAT.brass(), ir = MAT.iron();
  k.add(rbox(w + 0.04, 0.1, d + 0.02, 0.015), ir, 0, 0.05, 0);
  k.add(rbox(w, h - 0.2, d, 0.03), body, 0, 0.1 + (h - 0.2) / 2, 0);
  k.add(rbox(w + 0.08, 0.1, d + 0.08, 0.03), br, 0, h - 0.05, 0);
  k.at(0, 1.45, d / 2, 0, () => {
    k.add(rbox(w * 0.7, 0.5, 0.04, 0.02), br, 0, 0, 0.01);
    k.add(plane(w * 0.62, 0.42), MAT.screen(CANV.screen(kind)), 0, 0, 0.032);
  });
  for (let i = 0; i < 3; i++) k.at(-w / 2 + 0.2 + i * ((w - 0.4) / 2), 0.98, d / 2, 0, () => gauge(k, { r: 0.09, v: 0.3 + i * 0.22, stem: false }));
  // knife switch
  k.at(0, 0.55, d / 2, 0, () => {
    k.add(rbox(0.36, 0.26, 0.04, 0.01), MAT.paint('#2a2018', 0.7), 0, 0, 0.02);
    for (const sx of [-0.08, 0.08]) { k.add(rbox(0.03, 0.06, 0.05, 0.006), MAT.copper(), sx, -0.06, 0.06); k.add(rbox(0.025, 0.2, 0.012, 0.004), MAT.copper(), sx, 0.04, 0.12, 0, { rx: -0.6 }); }
    k.add(cyl(0.012, 0.012, 0.24, 6), MAT.paint('#1e1e1e', 0.4), 0, 0.12, 0.17, 0, { rz: Math.PI / 2 });
  });
  for (const sx of [-1, 1]) for (const y of [0.3, h - 0.35]) k.add(sphere(0.022, 6, 4), br, sx * (w / 2 - 0.06), y, d / 2 + 0.005);
  return { hw: w / 2 + 0.04, hd: d / 2 + 0.04, top: h };
}
// cargo crate with stencil and steel corners
export function cargoCrate(k, { w = 0.8, h = 0.7, d = 0.8, color = '#4a6e62' } = {}) {
  const m = MAT.paint(color, 0.7), st = MAT.steel(), sm = MAT.map(CANV.stencil(color), 0.75);
  k.add(rbox(w - 0.02, h - 0.02, d - 0.02, 0.02), m, 0, h / 2, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(rbox(0.08, h, 0.08, 0.015), st, sx * (w / 2 - 0.035), h / 2, sz * (d / 2 - 0.035));
  for (const y of [0.04, h - 0.04]) { k.add(rbox(w - 0.1, 0.06, 0.04, 0.01), m, 0, y, d / 2 - 0.005); k.add(rbox(0.04, 0.06, d - 0.1, 0.01), m, w / 2 - 0.005, y, 0); }
  k.add(plane(Math.min(w, h) * 0.75, Math.min(w, h) * 0.75), sm, 0, h / 2, d / 2 + 0.002);
  k.add(plane(Math.min(d, h) * 0.75, Math.min(d, h) * 0.75), sm, w / 2 + 0.002, h / 2, 0, Math.PI / 2);
  return { hw: w / 2, hd: d / 2, top: h };
}
// brass railing along a polyline [[x,z],...] (posts, top and mid rail)
export function railing(k, pts, { h = 1.0, mat = null, step = 0.9 } = {}) {
  const m = mat || MAT.brass();
  const post = lathe([[0.03, 0], [0.045, 0.02], [0.03, 0.05], [0.02, 0.1], [0.02, h - 0.06], [0.03, h - 0.03], [0.001, h]], 8);
  for (let i = 0; i < pts.length; i++) {
    k.add(post, m, pts[i][0], 0, pts[i][1]);
    if (i) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i], L = Math.hypot(bx - ax, bz - az), n = Math.floor(L / step);
      for (let j = 1; j < n + 1; j++) { const t = j / (n + 1); k.add(post, m, ax + (bx - ax) * t, 0, az + (bz - az) * t); }
    }
  }
  for (const y of [h - 0.02, h * 0.5]) k.add(pipe(pts.map(([x, z]) => [x, y, z]), y > h * 0.6 ? 0.025 : 0.014, 0.12, 8), m, 0, 0, 0);
}
// cable tray along local x (length L), with sagging cables; wall at -z
export function cableTray(k, L, { cables = ['#1a1a1a', '#a8302a', '#2a4a8a', '#1a1a1a'] } = {}) {
  const st = MAT.iron();
  k.add(rbox(L, 0.02, 0.28, 0.006), st, 0, 0, 0.16);
  k.add(rbox(L, 0.08, 0.02, 0.006), st, 0, 0.04, 0.3);
  for (let x = -L / 2 + 0.3; x < L / 2; x += 1.1) k.add(rbox(0.04, 0.12, 0.3, 0.008), st, x, -0.05, 0.15);
  cables.forEach((c, i) => {
    const z = 0.07 + i * 0.055, pts = [];
    for (let j = 0; j <= 8; j++) { const t = j / 8; pts.push([-L / 2 + t * L, 0.035 + Math.sin(t * 7 + i) * 0.006, z]); }
    k.add(pipe(pts, 0.022, 0.1, 6), MAT.flat(c, 0.6), 0, 0, 0);
  });
}
// blueprint table with a hologram projector; returns {holo: Group} for animation
export function holoTable(k, { w = 2.0, d = 1.3, h = 0.92 } = {}) {
  const br = MAT.brass(), ir = MAT.iron(), body = MAT.plates(TEAL, 0.6);
  k.add(rbox(w - 0.3, 0.1, d - 0.3, 0.02), ir, 0, 0.05, 0);
  k.add(rbox(w - 0.4, h - 0.2, d - 0.4, 0.04), body, 0, 0.1 + (h - 0.2) / 2, 0);
  k.add(rbox(w, 0.08, d, 0.03), br, 0, h - 0.04, 0);
  k.add(plane(w - 0.14, d - 0.14), MAT.screen(CANV.blueprint(), 0.55), 0, h + 0.012, 0, 0, { rx: -Math.PI / 2 });
  for (const sx of [-1, 1]) k.add(rbox(0.06, 0.05, d - 0.1, 0.012), br, sx * (w / 2 - 0.03), h + 0.02, 0);
  // cyan strip lights round the base
  k.add(rbox(w - 0.38, 0.025, 0.02, 0.006), MAT.glow('#9ff4ff', '#22d4ff', 2), 0, 0.2, (d - 0.4) / 2 + 0.01);
  k.add(rbox(0.02, 0.025, d - 0.38, 0.006), MAT.glow('#9ff4ff', '#22d4ff', 2), (w - 0.4) / 2 + 0.01, 0.2, 0);
  // projector puck
  k.add(lathe([[0.001, 0], [0.2, 0], [0.22, 0.03], [0.16, 0.06], [0.08, 0.07], [0.001, 0.07]], 18), br, 0, h, 0);
  k.add(disc(0.075, 18), MAT.glow('#e8ffff', '#5ff4ff', 2.5), 0, h + 0.072, 0, 0, { rx: -Math.PI / 2 });
  // the hologram (animated by the room): shell, core, bore, beam
  const holo = k.pivot(0, h + 0.75, 0, 0);
  const add = (geo, color, op, wire = false) => { const mm = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, wireframe: wire }); const me = new THREE.Mesh(geo, mm); holo.add(me); return me; };
  const shell = add(new THREE.IcosahedronGeometry(0.46, 2), '#5ff4ff', 0.55, true);
  add(new THREE.SphereGeometry(0.44, 20, 14), '#1a8aa8', 0.18);
  const core = add(new THREE.SphereGeometry(0.15, 14, 10), '#e0b8ff', 0.9);
  add(new THREE.TorusGeometry(0.6, 0.008, 4, 40), '#5ff4ff', 0.6).rotation.x = Math.PI / 2 - 0.3;
  const bore = add(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6), '#ffb040', 0.9); bore.position.y = 0.5;
  const beamGeo = new THREE.CylinderGeometry(0.42, 0.08, 0.75, 18, 1, true); beamGeo.translate(0, -0.375, 0);
  const beam = add(beamGeo, '#5ff4ff', 0.12); beam.material.side = THREE.DoubleSide;
  return { hw: w / 2, hd: d / 2, top: h, holo, shell, core };
}
// chart table with a glowing island map; front +z
export function mapTable(k, { w = 1.6, d = 1.0, h = 0.9 } = {}) {
  const br = MAT.brass(), ir = MAT.iron();
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(lathe([[0.05, 0], [0.06, 0.03], [0.035, 0.1], [0.03, h - 0.12], [0.045, h - 0.08]], 8), ir, sx * (w / 2 - 0.12), 0, sz * (d / 2 - 0.12));
  k.add(rbox(w - 0.2, 0.1, d - 0.2, 0.02), MAT.plates(TEAL, 0.6), 0, h - 0.13, 0);
  k.add(rbox(w, 0.07, d, 0.03), br, 0, h - 0.035, 0);
  k.add(plane(w - 0.12, d - 0.12), MAT.screen(CANV.screen('map'), 0.9), 0, h + 0.012, 0, 0, { rx: -Math.PI / 2 });
  for (const [px, pz, c] of [[-0.3, -0.15, '#ffb040'], [0.25, 0.12, '#5ff4ff'], [0.05, -0.05, '#ff5040']]) { k.add(cyl(0.006, 0.006, 0.12, 4), MAT.steel(), px * w / 1.6, h + 0.06, pz); k.add(sphere(0.022, 8, 6), MAT.glow(c, c, 1.4), px * w / 1.6, h + 0.13, pz); }
  k.add(cyl(0.012, 0.012, w * 0.5, 6), br, w * 0.15, h + 0.02, d / 2 - 0.15, 0.3, { rz: Math.PI / 2 });
  return { hw: w / 2, hd: d / 2, top: h };
}
// floor grating over a glowing conduit trench (w along x, d along z), flush with the floor
export function glowGrate(k, w, d, { hue = '#5ff4ff' } = {}) {
  const t = tex('grate' + hue, () => canvasTex(256, 128, (x, W, H) => {
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0a3a44'); g.addColorStop(0.5, hue); g.addColorStop(1, '#0a3a44');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.ellipse(20 + i * 44, 64, 14, 40, 0, 0, 7); x.fill(); }
    x.fillStyle = '#2a2a32'; for (let xx = 0; xx < W; xx += 16) x.fillRect(xx, 0, 6, H);
    x.fillStyle = '#3a3a44'; for (let y = 0; y < H; y += 32) x.fillRect(0, y, W, 5);
  }));
  t.wrapS = THREE.RepeatWrapping;
  k.add(plane(w, d), M('grate' + t.uuid, () => std({ map: t, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.8, roughness: 0.5, metalness: 0.4 }, 0, { noShadow: true })), 0, 0.012, 0, 0, { rx: -Math.PI / 2 });
  const br = MAT.brass();
  for (const s of [-1, 1]) { k.add(rbox(w + 0.12, 0.03, 0.06, 0.01), br, 0, 0.015, s * (d / 2 + 0.03)); k.add(rbox(0.06, 0.03, d, 0.01), br, s * (w / 2 + 0.03), 0.015, 0); }
}
// horizontal pressure tank on cradles, with gauges and pipes; long axis x
export function pressureTank(k, { l = 1.8, r = 0.45, color = '#3f8a86' } = {}) {
  const m = MAT.paint(color, 0.45), br = MAT.brass(), ir = MAT.iron();
  const prof = [[0.001, -l / 2 - r * 0.45], [r * 0.5, -l / 2 - r * 0.38], [r * 0.85, -l / 2 - r * 0.2], [r, -l / 2], [r, l / 2], [r * 0.85, l / 2 + r * 0.2], [r * 0.5, l / 2 + r * 0.38], [0.001, l / 2 + r * 0.45]];
  k.add(lathe(prof, 20), m, 0, r + 0.25, 0, 0, { rz: Math.PI / 2 });
  for (const x of [-l / 2 + 0.05, -l / 6, l / 6, l / 2 - 0.05]) k.add(torus(r + 0.01, 0.025, 5, 24), br, x, r + 0.25, 0, Math.PI / 2);
  for (const x of [-l / 3, l / 3]) { k.add(rbox(0.14, 0.4, r * 1.6, 0.03), ir, x, 0.2, 0); }
  k.add(rbox(l + 0.2, 0.08, r * 1.7, 0.02), ir, 0, 0.04, 0);
  k.at(0.2, r * 2 + 0.3, 0, 0, () => { k.add(cyl(0.03, 0.03, 0.12, 8), br, 0, -0.03, 0); k.at(0, 0.14, 0, 0, () => gauge(k, { r: 0.1, v: 0.86, stem: false })); });
  k.add(pipe([[-l / 2 - r * 0.3, r + 0.25, 0], [-l / 2 - r * 0.7, r + 0.25, 0], [-l / 2 - r * 0.7, 0, 0]], 0.06, 0.15, 10), MAT.copper(), 0, 0, 0);
  k.add(pipe([[-0.3, r * 2 + 0.2, 0], [-0.3, r * 2 + 0.55, 0], [-0.3, r * 2 + 0.55, -0.6]], 0.045, 0.12, 8), MAT.copper(), 0, 0, 0);
  k.at(-0.3, r * 2 + 0.44, 0.0, Math.PI / 2, () => valveWheel(k, { r: 0.12 }));
  k.add(rbox(0.36, 0.14, 0.01, 0.005), br, 0.4, r + 0.25, r + 0.005);
  return { hw: l / 2 + r * 0.8, hd: r + 0.05, top: r * 2 + 0.6 };
}

// ================================================================ Baldino's workshop & the lighthouse lamp room
// Painted sheets (blueprints, chalk diagrams, dial faces, the lamp room's panorama) and the inventor's
// clutter: workbench with vice, pegboard of tools, pot-bellied stove, curio shelves of jars, coils and
// bulbs, a half-built flying machine, the planet model in its cracked crystal shell, the radio sets.
const chalkStroke = (x, r, pts, w = 2.2, col = 'rgba(240,240,228,0.85)') => {
  x.strokeStyle = col; x.lineWidth = w; x.lineCap = x.lineJoin = 'round';
  x.beginPath(); pts.forEach(([a, b], i) => { const j = () => (r() - 0.5) * 1.6; if (i) x.lineTo(a + j(), b + j()); else x.moveTo(a, b); }); x.stroke();
};
const scrawl = (x, r, x0, y0, w, lines, lh, col, size = 1.6) => {
  x.strokeStyle = col; x.lineWidth = size; x.lineCap = 'round';
  for (let i = 0; i < lines; i++) {
    let xx = x0; const end = x0 + w * (0.55 + r() * 0.45);
    while (xx < end) { const ww = 8 + r() * 26; x.beginPath(); x.moveTo(xx, y0 + i * lh); for (let s = 0; s < ww; s += 3) x.lineTo(xx + s, y0 + i * lh - Math.abs(Math.sin(s * 0.9 + i)) * size * 2.4); x.stroke(); xx += ww + 6; }
  }
};
function gearPath(x, cx, cy, r, n, hole = 0.3) {
  const ri = r * (1 - Math.min(0.22, 2.4 / n));
  x.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, s = (Math.PI * 2) / n;
    for (const [rr, f] of [[ri, 0], [r, 0.2], [r, 0.45], [ri, 0.65]]) x.lineTo(cx + Math.cos(a + s * f) * rr, cy + Math.sin(a + s * f) * rr);
  }
  x.closePath(); x.moveTo(cx + r * hole, cy); x.arc(cx, cy, r * hole, 0, Math.PI * 2);
}
CANV.chalk = () => tex('chalkboard', () => canvasTex(640, 400, (x, W, H) => {
  const r = rng(404);
  x.fillStyle = '#2c3a33'; x.fillRect(0, 0, W, H);
  blotch(x, W, H, r, 40, ['#3a4a42', '#24302a', '#56645c'], 20, 90, 0.35);
  // old wiped-out smears
  x.strokeStyle = 'rgba(220,226,210,0.07)'; x.lineWidth = 26; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(r() * W, r() * H); x.quadraticCurveTo(r() * W, r() * H, r() * W, r() * H); x.stroke(); }
  const ch = 'rgba(240,240,228,0.88)', yel = 'rgba(250,228,140,0.9)', pink = 'rgba(250,170,200,0.85)', cy = 'rgba(160,230,250,0.85)';
  // the planet in its shell, with the crack and the bore
  const px = 140, py = 190;
  const circ = (rr, col, w = 2.4, dash = 0) => { const pts = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; pts.push([px + Math.cos(a) * rr, py + Math.sin(a) * rr]); } if (dash) x.setLineDash([9, 7]); chalkStroke(x, r, pts, w, col); x.setLineDash([]); };
  circ(56, ch, 3); circ(92, cy, 2.4, 1); circ(100, cy, 1.6, 1);
  chalkStroke(x, r, [[px + 60, py - 66], [px + 70, py - 58], [px + 64, py - 50], [px + 76, py - 44], [px + 70, py - 36]], 3, pink);
  chalkStroke(x, r, [[px - 4, py - 56], [px - 4, py - 100], [px - 12, py - 92], [px - 4, py - 100], [px + 4, py - 92]], 2.2, yel);
  for (let i = 0; i < 4; i++) { const a = -2.6 + i * 0.5; chalkStroke(x, r, [[px + Math.cos(a) * 30, py + Math.sin(a) * 26], [px + Math.cos(a + 0.3) * 18, py + Math.sin(a + 0.4) * 14]], 2, ch); }
  x.font = 'italic 22px Georgia, serif'; x.fillStyle = yel; x.fillText('Ø ≈ 2·10⁴', px - 60, py + 140); x.fillStyle = pink; x.fillText('!!', px + 82, py - 74);
  // gear train in the middle
  x.strokeStyle = ch; x.lineWidth = 2.2;
  gearPath(x, 330, 130, 46, 16); x.stroke(); gearPath(x, 398, 168, 30, 11); x.stroke(); gearPath(x, 440, 116, 22, 8); x.stroke();
  chalkStroke(x, r, [[330, 130], [398, 168]], 1.2, yel); chalkStroke(x, r, [[398, 168], [440, 116]], 1.2, yel);
  x.font = 'italic 20px Georgia, serif'; x.fillStyle = ch; x.fillText('16 : 11 : 8', 300, 224);
  // the key: three dials and a toothed cylinder
  for (const [i, n] of [[0, 'I'], [1, 'II'], [2, 'III']]) {
    const cx = 500 + i * 46, cyy = 278;
    chalkStroke(x, r, Array.from({ length: 25 }, (_, j) => [cx + Math.cos(j / 24 * Math.PI * 2) * 18, cyy + Math.sin(j / 24 * Math.PI * 2) * 18]), 2.2, ch);
    chalkStroke(x, r, [[cx, cyy], [cx + Math.cos(-1.2 + i * 0.9) * 15, cyy + Math.sin(-1.2 + i * 0.9) * 15]], 2.6, yel);
    x.font = '16px Georgia, serif'; x.fillStyle = ch; x.fillText(n, cx - 6, cyy + 38);
  }
  chalkStroke(x, r, [[470, 330], [610, 330], [610, 352], [470, 352], [470, 330]], 2.4, ch);
  for (let i = 0; i < 8; i++) chalkStroke(x, r, [[480 + i * 16, 352], [484 + i * 16, 362], [488 + i * 16, 352]], 2, ch);
  x.font = 'bold 30px Georgia, serif'; x.fillStyle = pink; x.fillText('?', 616, 300);
  // formulae, arrows and scribbles
  x.font = 'italic 24px Georgia, serif'; x.fillStyle = ch;
  x.fillText('∑ ω²·r = k', 268, 300); x.fillText('Δt ≈ 3/7', 268, 340); x.fillText('E·λ', 20, 46);
  chalkStroke(x, r, [[248, 190], [278, 172], [268, 168], [278, 172], [276, 182]], 2, ch);
  scrawl(x, r, 470, 40, 150, 4, 22, ch, 1.4); scrawl(x, r, 30, 360, 180, 1, 20, ch, 1.4);
  chalkStroke(x, r, [[466, 18], [466, 380]], 1.2, 'rgba(240,240,228,0.25)');
  for (let i = 0; i < 3000; i++) { x.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.05)'; x.fillRect(r() * W, r() * H, 2, 2); }
}));
// pinned plans: 'flyer' (blueprint), 'key', 'mill', 'radio' (ink on yellowed paper)
CANV.plan = (kind = 'flyer') => tex('plan' + kind, () => canvasTex(384, 512, (x, W, H) => {
  const r = rng(kind.length * 17 + 3);
  const blue = kind === 'flyer';
  x.fillStyle = blue ? '#24508e' : '#eadcb4'; x.fillRect(0, 0, W, H);
  blotch(x, W, H, r, 18, blue ? ['#2c5c9e', '#1c4078'] : ['#d8c490', '#f4ead0', '#c8b07a'], 30, 110, 0.35);
  const ink = blue ? 'rgba(232,244,255,0.92)' : 'rgba(46,36,26,0.88)', red = blue ? 'rgba(255,200,120,0.95)' : 'rgba(170,40,30,0.85)';
  if (blue) for (let i = 0; i <= W; i += 16) { x.fillStyle = i % 64 ? 'rgba(200,230,255,0.07)' : 'rgba(200,230,255,0.18)'; x.fillRect(i, 0, 1, H); x.fillRect(0, i, W, 1); }
  x.strokeStyle = ink; x.fillStyle = ink; x.lineWidth = 2.2; x.lineJoin = x.lineCap = 'round';
  x.strokeRect(14, 14, W - 28, H - 28);
  if (kind === 'flyer') {
    // side view: teardrop fuselage, propeller, wing, tail; and a plan view below
    x.beginPath(); x.moveTo(300, 150); x.bezierCurveTo(300, 110, 200, 104, 120, 132); x.lineTo(60, 146); x.lineTo(120, 160); x.bezierCurveTo(200, 190, 300, 190, 300, 150); x.stroke();
    x.beginPath(); x.ellipse(306, 150, 6, 58, 0, 0, 7); x.stroke(); x.beginPath(); x.arc(306, 150, 7, 0, 7); x.fill();
    x.beginPath(); x.moveTo(84, 140); x.lineTo(64, 96); x.lineTo(96, 100); x.lineTo(112, 134); x.stroke();
    x.beginPath(); x.moveTo(176, 118); x.quadraticCurveTo(196, 96, 224, 112); x.stroke();
    for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(140 + i * 26, 128 - i * 1.5); x.lineTo(140 + i * 26, 168 + i); x.stroke(); }
    x.beginPath(); x.moveTo(110, 300); x.lineTo(300, 300); x.lineTo(316, 320); x.lineTo(300, 340); x.lineTo(110, 340); x.lineTo(70, 320); x.closePath(); x.stroke();
    x.beginPath(); x.moveTo(170, 300); x.lineTo(150, 226); x.lineTo(230, 226); x.lineTo(240, 300); x.moveTo(170, 340); x.lineTo(150, 414); x.lineTo(230, 414); x.lineTo(240, 340); x.stroke();
    for (let i = 1; i < 5; i++) { x.beginPath(); x.moveTo(150 + i * 18, 228); x.lineTo(166 + i * 15, 300); x.stroke(); }
    x.setLineDash([6, 5]); x.beginPath(); x.moveTo(40, 200); x.lineTo(344, 200); x.stroke(); x.setLineDash([]);
    x.font = 'bold 13px monospace'; x.fillText('B-7  "LIBELLULE"', 30, 470); x.fillText('1:20', 300, 470);
    x.lineWidth = 1; x.beginPath(); x.moveTo(60, 196 - 12); x.lineTo(306, 196 - 12); x.stroke();
  } else if (kind === 'key') {
    // exploded view of a three-dial key
    x.beginPath(); x.ellipse(192, 120, 60, 18, 0, 0, 7); x.stroke(); x.beginPath(); x.moveTo(132, 120); x.lineTo(132, 190); x.moveTo(252, 120); x.lineTo(252, 190); x.stroke(); x.beginPath(); x.ellipse(192, 190, 60, 18, 0, 0, Math.PI); x.stroke();
    for (let i = 0; i < 3; i++) { const y = 250 + i * 46; x.beginPath(); x.ellipse(192, y, 52, 14, 0, 0, 7); x.stroke(); for (let t = 0; t < 12; t++) { const a = (t / 12) * Math.PI * 2; x.beginPath(); x.moveTo(192 + Math.cos(a) * 52, y + Math.sin(a) * 14); x.lineTo(192 + Math.cos(a) * 60, y + Math.sin(a) * 17); x.stroke(); } x.font = 'italic 18px Georgia, serif'; x.fillText(['I', 'II', 'III'][i], 268, y + 6); }
    x.setLineDash([5, 5]); x.beginPath(); x.moveTo(192, 60); x.lineTo(192, 400); x.stroke(); x.setLineDash([]);
    x.beginPath(); x.moveTo(176, 400); x.lineTo(176, 450); x.lineTo(186, 460); x.lineTo(198, 450); x.lineTo(208, 460); x.lineTo(208, 400); x.stroke();
    x.strokeStyle = red; x.fillStyle = red; x.lineWidth = 3; x.beginPath(); x.arc(192, 120, 22, 0, 7); x.stroke(); x.font = 'italic 16px Georgia, serif'; x.fillText('cristal', 222, 82);
    x.fillStyle = ink; scrawl(x, r, 30, 40, 120, 2, 16, ink, 1.2);
  } else if (kind === 'mill') {
    x.lineWidth = 2; gearPath(x, 140, 170, 70, 20); x.stroke(); gearPath(x, 250, 140, 42, 12); x.stroke(); gearPath(x, 250, 260, 30, 9); x.stroke();
    x.beginPath(); x.moveTo(60, 380); x.lineTo(320, 380); x.moveTo(190, 380); x.lineTo(190, 300); x.lineTo(150, 260); x.stroke();
    x.strokeStyle = red; x.lineWidth = 3; x.beginPath(); x.moveTo(250, 260); x.lineTo(320, 320); x.stroke(); x.beginPath(); x.arc(320, 320, 8, 0, 7); x.stroke();
    x.fillStyle = ink; scrawl(x, r, 40, 420, 280, 3, 18, ink, 1.2);
  } else {
    // circuit with three valves feeding an aerial
    for (let i = 0; i < 3; i++) { const cx = 90 + i * 100; x.beginPath(); x.arc(cx, 200, 30, 0, 7); x.stroke(); x.beginPath(); x.moveTo(cx - 14, 214); x.lineTo(cx + 14, 214); x.moveTo(cx - 14, 192); x.lineTo(cx + 14, 192); x.moveTo(cx, 182); x.lineTo(cx, 170); x.stroke(); x.beginPath(); x.moveTo(cx, 170); x.lineTo(cx, 120); x.lineTo(cx + 100 > 300 ? 330 : cx + 100, 120); x.stroke(); }
    x.beginPath(); x.moveTo(330, 120); x.lineTo(330, 50); x.moveTo(310, 50); x.lineTo(350, 50); x.moveTo(316, 60); x.lineTo(344, 60); x.moveTo(322, 70); x.lineTo(338, 70); x.stroke();
    for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(60 + i * 40, 300); x.lineTo(68 + i * 40, 290); x.lineTo(76 + i * 40, 310); x.lineTo(84 + i * 40, 300); x.stroke(); }
    x.beginPath(); x.moveTo(40, 300); x.lineTo(340, 300); x.stroke();
    x.fillStyle = ink; scrawl(x, r, 40, 360, 300, 5, 20, ink, 1.2);
    x.strokeStyle = red; x.lineWidth = 3; x.beginPath(); x.ellipse(190, 200, 140, 52, 0, 0, 7); x.stroke();
  }
  if (!blue) { x.fillStyle = ink; scrawl(x, r, 30, H - 60, 200, 2, 16, ink, 1.2); }
  ageing(x, W, H, r, blue ? 10 : 22);
  for (let i = 0; i < 2000; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'; x.fillRect(r() * W, r() * H, 2, 2); }
}));
// tuning dial face with three marked positions: sun, wave, star at -60°, 0°, +60° from the top
CANV.tuning = (ring = '#3a6fb0') => tex('tuning' + ring, () => canvasTex(256, 256, (x) => {
  x.fillStyle = '#efe6cc'; x.fillRect(0, 0, 256, 256);
  const g = x.createRadialGradient(110, 100, 10, 128, 128, 130); g.addColorStop(0, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(110,80,40,0.35)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.translate(128, 128);
  x.lineWidth = 16; x.strokeStyle = ring; x.beginPath(); x.arc(0, 0, 104, -Math.PI / 2 - 1.3, -Math.PI / 2 + 1.3); x.stroke();
  x.strokeStyle = '#2a2018';
  for (let i = 0; i <= 26; i++) { const a = -Math.PI / 2 - 1.3 + (i / 26) * 2.6, r0 = i % 2 ? 92 : 84; x.lineWidth = i % 2 ? 1.5 : 3; x.beginPath(); x.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); x.lineTo(Math.cos(a) * 112, Math.sin(a) * 112); x.stroke(); }
  // the three marked positions: sun (0), wave (1), star (2)
  const sym = [
    (cx, cy) => { x.fillStyle = '#d88a1a'; x.beginPath(); x.arc(cx, cy, 11, 0, 7); x.fill(); x.strokeStyle = '#d88a1a'; x.lineWidth = 3.5; for (let j = 0; j < 8; j++) { const b = (j / 8) * Math.PI * 2; x.beginPath(); x.moveTo(cx + Math.cos(b) * 15, cy + Math.sin(b) * 15); x.lineTo(cx + Math.cos(b) * 22, cy + Math.sin(b) * 22); x.stroke(); } },
    (cx, cy) => { x.strokeStyle = '#2a5a9a'; x.lineWidth = 4.5; x.lineCap = 'round'; for (const dy of [-7, 7]) { x.beginPath(); for (let j = 0; j <= 20; j++) x.lineTo(cx - 20 + j * 2, cy + dy + Math.sin(j * 0.63) * 5); x.stroke(); } },
    (cx, cy) => { x.fillStyle = '#5a3a9a'; x.beginPath(); for (let j = 0; j < 10; j++) { const b = -Math.PI / 2 + (j / 10) * Math.PI * 2, rr = j % 2 ? 9 : 21; x.lineTo(cx + Math.cos(b) * rr, cy + Math.sin(b) * rr); } x.fill(); },
  ];
  sym.forEach((f, i) => {
    const a = -Math.PI / 2 + (i - 1) * (Math.PI / 3);
    x.fillStyle = '#a8201a'; x.beginPath(); x.moveTo(Math.cos(a) * 118, Math.sin(a) * 118); x.lineTo(Math.cos(a - 0.09) * 96, Math.sin(a - 0.09) * 96); x.lineTo(Math.cos(a + 0.09) * 96, Math.sin(a + 0.09) * 96); x.fill();
    f(Math.cos(a) * 60, Math.sin(a) * 60);
  });
  x.lineWidth = 8; x.strokeStyle = 'rgba(40,30,20,0.45)'; x.beginPath(); x.arc(0, 0, 124, 0, 7); x.stroke();
}));
// the lamp room's glazing: sky, sea horizon and the gallery railing outside
CANV.pano = () => tex('lamppano', () => {
  const t = canvasTex(1024, 256, (x, W, H) => {
    const r = rng(88);
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#7fb6ea'); g.addColorStop(0.55, '#d8ecf8'); g.addColorStop(0.62, '#e8f2f8'); g.addColorStop(0.63, '#4a90c8'); g.addColorStop(1, '#2a6aa4');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 18; i++) { x.fillStyle = `rgba(255,255,255,${0.5 + r() * 0.35})`; const cx = r() * W, cy = 20 + r() * 110, rw = 40 + r() * 90; for (let j = 0; j < 4; j++) { x.beginPath(); x.ellipse(cx + (j - 1.5) * rw * 0.4, cy - Math.sin(j) * 6, rw * 0.45, 9 + r() * 8, 0, 0, 7); x.fill(); } }
    x.strokeStyle = 'rgba(255,255,255,0.45)'; x.lineWidth = 1.5; for (let i = 0; i < 70; i++) { const y = 166 + r() * 90, xx = r() * W; x.beginPath(); x.moveTo(xx, y); x.lineTo(xx + 8 + r() * 14, y); x.stroke(); }
    // a far island and a sail
    x.fillStyle = '#7a8a9a'; x.beginPath(); x.moveTo(600, 160); x.quadraticCurveTo(660, 140, 720, 160); x.fill();
    x.fillStyle = '#f4f0e4'; x.beginPath(); x.moveTo(240, 168); x.lineTo(252, 146); x.lineTo(254, 168); x.fill();
    // the gallery railing just outside
    x.fillStyle = '#26303a';
    x.fillRect(0, 190, W, 6); x.fillRect(0, 222, W, 4);
    for (let xx = 8; xx < W; xx += 32) { x.fillRect(xx, 190, 4, 66); x.beginPath(); x.arc(xx + 2, 189, 4, 0, 7); x.fill(); }
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, 248, W, 8);
  });
  t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1);
  return t;
});
// the planet's surface (equirectangular): sea, islands, the cloud band
CANV.planet = () => tex('planetmap', () => canvasTex(256, 128, (x, W, H) => {
  const r = rng(12);
  x.fillStyle = '#2f6fb0'; x.fillRect(0, 0, W, H);
  blotch(x, W, H, r, 30, ['#3a86c8', '#245a98'], 8, 30, 0.5);
  for (let i = 0; i < 16; i++) { const cx = r() * W, cy = 18 + r() * (H - 36), rr = 4 + r() * 12; x.fillStyle = '#d8c488'; x.beginPath(); x.ellipse(cx, cy, rr * 1.3, rr, r() * 3, 0, 7); x.fill(); x.fillStyle = '#5f9e4a'; x.beginPath(); x.ellipse(cx, cy, rr * 0.9, rr * 0.65, r() * 3, 0, 7); x.fill(); }
  x.fillStyle = 'rgba(240,240,250,0.55)'; x.fillRect(0, H / 2 - 4, W, 8);
  x.fillStyle = 'rgba(255,255,255,0.8)'; x.fillRect(0, 0, W, 8); x.fillRect(0, H - 8, W, 8);
}));
// hardboard pegboard
CANV.pegboard = () => tex('pegboard', () => {
  const t = canvasTex(128, 128, (x, W, H) => {
    x.fillStyle = '#a8784a'; x.fillRect(0, 0, W, H);
    const r = rng(3); blotch(x, W, H, r, 8, ['#b88858', '#946640'], 10, 30, 0.4);
    x.fillStyle = '#2a1a10'; for (let i = 8; i < W; i += 16) for (let j = 8; j < H; j += 16) { x.beginPath(); x.arc(i, j, 2.4, 0, 7); x.fill(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
});

// gear wheel in the XY plane, extruded along z (centred), with a bore and lightening holes
export function gearGeo(r, n = 12, th = 0.02, hole = 0.25) {
  return slab(`gear${r3(r)},${n},${r3(hole)}`, (s) => {
    const ri = r * (1 - Math.min(0.22, 2.4 / n));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, st = (Math.PI * 2) / n;
      [[ri, 0], [r, 0.2], [r, 0.45], [ri, 0.65]].forEach(([rr, f], j) => { const px = Math.cos(a + st * f) * rr, py = Math.sin(a + st * f) * rr; if (!i && !j) s.moveTo(px, py); else s.lineTo(px, py); });
    }
    s.closePath();
    const h = new THREE.Path(); h.absarc(0, 0, r * hole, 0, Math.PI * 2, true); s.holes.push(h);
    if (r > 0.08) for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4, hh = new THREE.Path(); hh.absarc(Math.cos(a) * ri * 0.6, Math.sin(a) * ri * 0.6, ri * 0.17, 0, Math.PI * 2, true); s.holes.push(hh); }
  }, th, Math.min(0.004, th / 4));
}
// helix of wire (coil) standing on y=0
export function helixGeo(r, h, turns, wr, radial = 5) {
  return cached(`hx${r3(r)},${r3(h)},${turns},${r3(wr)},${radial}`, () => {
    const c = new THREE.Curve();
    c.getPoint = (t, v = new THREE.Vector3()) => v.set(Math.cos(t * turns * Math.PI * 2) * r, t * h, Math.sin(t * turns * Math.PI * 2) * r);
    const g = new THREE.TubeGeometry(c, Math.ceil(turns * 16), wr, radial, false);
    g.userData.keepUV = true;
    return g;
  });
}
// light bulb standing on its cap at (x, y, z)
export function bulb(k, x, y, z, s = 1, lit = false) {
  k.add(lathe([[0.001, 0], [0.016 * s, 0], [0.019 * s, 0.008 * s], [0.017 * s, 0.016 * s], [0.019 * s, 0.024 * s], [0.017 * s, 0.032 * s], [0.02 * s, 0.036 * s], [0.001, 0.036 * s]], 8), MAT.brass(), x, y, z);
  k.add(lathe([[0.018 * s, 0], [0.03 * s, 0.03 * s], [0.048 * s, 0.075 * s], [0.045 * s, 0.11 * s], [0.025 * s, 0.13 * s], [0.001, 0.135 * s]], 12), lit ? MAT.glow('#fff4d0', '#ffd890', 2.2) : MAT.glass('#f4f0e0', 0.4), x, y + 0.034 * s, z);
  k.add(torus(0.014 * s, 0.003, 3, 8, Math.PI), MAT.glow('#ffc890', '#ff8a2a', lit ? 2.5 : 0.4), x, y + 0.09 * s, z);
}
// small hand tools lying flat (y = surface)
export function wrench(k, x, y, z, ry = 0, s = 1, mat = null) {
  const m = mat || MAT.steel();
  k.at(x, y, z, ry, () => {
    k.add(rbox(0.2 * s, 0.01, 0.025 * s, 0.004), m, 0, 0.006, 0);
    k.add(torus(0.022 * s, 0.009 * s, 4, 10, Math.PI * 1.5), m, 0.11 * s, 0.008, 0, 0, { rx: Math.PI / 2, rz: 0.8 });
    k.add(torus(0.018 * s, 0.008 * s, 4, 10), m, -0.11 * s, 0.008, 0, 0, { rx: Math.PI / 2 });
  });
}
export function hammer(k, x, y, z, ry = 0) {
  k.at(x, y, z, ry, () => {
    k.add(cyl(0.012, 0.014, 0.3, 6), MAT.wood('honey'), 0, 0.014, 0, 0, { rz: Math.PI / 2 });
    k.add(rbox(0.045, 0.04, 0.11, 0.01), MAT.iron(), 0.15, 0.022, 0);
  });
}
export function screwdriver(k, x, y, z, ry = 0, c = '#c8452f') {
  k.at(x, y, z, ry, () => {
    k.add(lathe([[0.001, 0], [0.014, 0], [0.017, 0.03], [0.016, 0.09], [0.008, 0.1], [0.001, 0.1]], 8), MAT.paint(c, 0.4), 0, 0.016, 0, 0, { rz: Math.PI / 2 });
    k.add(cyl(0.004, 0.004, 0.13, 5), MAT.steel(), -0.165, 0.016, 0, 0, { rz: Math.PI / 2 });
  });
}
export function oilCan(k, x, y, z, ry = 0) {
  k.at(x, y, z, ry, () => {
    k.add(lathe([[0.001, 0], [0.06, 0], [0.065, 0.01], [0.06, 0.07], [0.03, 0.09], [0.012, 0.1], [0.001, 0.1]], 12), MAT.copper(), 0, 0, 0);
    k.add(pipe([[0, 0.09, 0], [0.04, 0.16, 0], [0.12, 0.22, 0]], 0.006, 0.03, 5), MAT.brass(), 0, 0, 0);
    k.add(torus(0.03, 0.006, 4, 8, Math.PI), MAT.brass(), -0.07, 0.06, 0, 0, { rz: Math.PI / 2 });
  });
}
// heavy workbench: butcher-block top, vice at the front right, drawers, lower shelf; front +z
export function workbench(k, { w = 2.4, d = 0.78, h = 0.9 } = {}) {
  const m = MAT.wood('honey'), md = MAT.wood('dark'), br = MAT.brass();
  k.add(rbox(w, 0.08, d, 0.02), m, 0, h - 0.04, 0, 0, { jit: true });
  for (let i = 0; i < Math.floor(w / 0.12); i++) k.add(new THREE.BoxGeometry(0.004, 0.081, d - 0.02), md, -w / 2 + 0.12 * (i + 1), h - 0.04, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(rbox(0.1, h - 0.08, 0.1, 0.015), md, sx * (w / 2 - 0.1), (h - 0.08) / 2, sz * (d / 2 - 0.1));
  k.add(rbox(w - 0.14, 0.04, d - 0.14, 0.01), m, 0, 0.18, 0);
  for (const sz of [-1, 1]) k.add(rbox(w - 0.2, 0.1, 0.04, 0.01), md, 0, h - 0.14, sz * (d / 2 - 0.1));
  // a bank of drawers under the left end
  for (let i = 0; i < 2; i++) { k.add(rbox(0.5, 0.15, 0.03, 0.01), m, -w / 2 + 0.45, h - 0.17 - i * 0.17, d / 2 - 0.06); k.add(torus(0.025, 0.006, 4, 8, Math.PI), br, -w / 2 + 0.45, h - 0.19 - i * 0.17, d / 2 - 0.04, 0, { rz: Math.PI }); }
  k.add(rbox(0.54, 0.36, d - 0.2, 0.01), md, -w / 2 + 0.45, h - 0.26, 0);
  // tool rack along the back edge: chisels and files standing in holes
  k.add(rbox(w - 0.1, 0.06, 0.08, 0.01), md, 0, h + 0.03, -d / 2 + 0.05);
  for (let i = 0; i < 9; i++) { const x = -w / 2 + 0.25 + i * 0.09; k.add(cyl(0.012, 0.014, 0.14, 6), MAT.wood(i % 2 ? 'red' : 'honey'), x, h + 0.12, -d / 2 + 0.05); k.add(cyl(0.004, 0.004, 0.06, 4), MAT.steel(), x, h + 0.02, -d / 2 + 0.05); }
  // vice
  k.at(w / 2 - 0.32, h, d / 2 - 0.08, 0, () => {
    const ir = MAT.paint('#3a4a5a', 0.45), st = MAT.steel();
    k.add(rbox(0.18, 0.06, 0.2, 0.012), ir, 0, 0.03, -0.04);
    k.add(rbox(0.2, 0.11, 0.06, 0.012), ir, 0, 0.11, -0.06);
    k.add(rbox(0.2, 0.11, 0.06, 0.012), ir, 0, 0.11, 0.1);
    for (const z of [-0.025, 0.065]) k.add(rbox(0.19, 0.05, 0.012, 0.003), st, 0, 0.14, z);
    k.add(rbox(0.12, 0.05, 0.14, 0.01), ir, 0, 0.05, 0.07);
    k.add(cyl(0.014, 0.014, 0.24, 8), st, 0, 0.08, 0.18, 0, { rx: Math.PI / 2 });
    k.add(cyl(0.008, 0.008, 0.24, 6), st, 0, 0.08, 0.3, 0, { rz: Math.PI / 2 });
    for (const sx of [-1, 1]) k.add(sphere(0.016, 6, 4), st, sx * 0.12, 0.08, 0.3);
    // a brass part clamped in the jaws
    k.add(cyl(0.03, 0.03, 0.12, 12), br, 0, 0.2, 0.02, 0, { rz: Math.PI / 2 });
  });
  return { hw: w / 2, hd: d / 2 + 0.06, top: h };
}
// pegboard with hanging tools, faces +z (origin at the wall, board centre)
export function toolBoard(k, w = 2.0, h = 0.8) {
  const st = MAT.steel(), md = MAT.wood('dark');
  k.add(rbox(w + 0.06, h + 0.06, 0.03, 0.01), md, 0, 0, 0.015);
  const pm = MAT.map(CANV.pegboard(), 0.85); pm.map.repeat.set(w * 4, h * 4);
  k.add(plane(w, h), pm, 0, 0, 0.032);
  const z = 0.05;
  // spanners by size, a saw, a hammer, pliers, a coil of wire, a brace drill
  for (let i = 0; i < 5; i++) { const s = 0.6 + i * 0.12, x = -w / 2 + 0.15 + i * 0.09; k.add(rbox(0.02 * s, 0.2 * s, 0.008, 0.003), st, x, 0.1 - i * 0.012, z); k.add(torus(0.02 * s, 0.008 * s, 4, 10, Math.PI * 1.5), st, x, 0.1 - i * 0.012 + 0.11 * s, z, 0, { rz: -Math.PI / 4 }); k.add(torus(0.016 * s, 0.007 * s, 4, 10), st, x, 0.1 - i * 0.012 - 0.11 * s, z); }
  k.at(-w / 2 + 0.85, 0.05, z, 0, () => { k.add(slab('sawblade', (s) => { s.moveTo(-0.22, -0.05); for (let i = 0; i <= 14; i++) s.lineTo(-0.22 + i * 0.03, i % 2 ? -0.07 : -0.05); s.lineTo(0.2, 0.04); s.lineTo(-0.22, 0.05); }, 0.004, 0), st, 0, 0, 0); k.add(slab('sawgrip', (s) => { s.moveTo(0.18, -0.06); s.lineTo(0.32, -0.08); s.quadraticCurveTo(0.36, 0, 0.32, 0.08); s.lineTo(0.18, 0.06); }, 0.025, 0.006), MAT.wood('red'), 0, 0, 0.01); });
  k.add(cyl(0.012, 0.014, 0.3, 6), MAT.wood('honey'), -w / 2 + 1.38, -0.02, z + 0.01);
  k.add(rbox(0.11, 0.045, 0.04, 0.01), MAT.iron(), -w / 2 + 1.38, 0.14, z + 0.01);
  k.at(-w / 2 + 1.6, 0.04, z, 0, () => { for (const s of [-1, 1]) { k.add(rbox(0.018, 0.16, 0.012, 0.004), MAT.paint('#c8452f', 0.5), s * 0.025, -0.06, 0, 0, { rz: s * 0.18 }); k.add(rbox(0.014, 0.07, 0.012, 0.004), st, s * 0.006, 0.06, 0, 0, { rz: -s * 0.1 }); } });
  k.add(helixGeo(0.07, 0.04, 6, 0.004), MAT.copper(), w / 2 - 0.22, -0.18, z + 0.04, 0, { rx: Math.PI / 2 });
  k.add(torus(0.08, 0.012, 5, 16), MAT.cloth('#c9a66b', '#7a5a30'), w / 2 - 0.22, 0.14, z + 0.01);
  for (const [x, y] of [[-w / 2 + 0.6, 0.25], [w / 2 - 0.45, 0.2], [0.1, -0.25]]) k.add(gearGeo(0.06, 10, 0.012), MAT.brass(), x, y, z);
}
// pinned sheet (plan or chalk) on a wall, faces +z
export function pinnedSheet(k, w, h, t, tilt = 0) {
  k.add(plane(w, h), MAT.map(t, 0.9), 0, 0, 0.012, 0, { rz: tilt });
  for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const px = sx * (w / 2 - 0.03), py = sy * (h / 2 - 0.03); k.add(sphere(0.014, 6, 4), MAT.flat(sy > 0 ? '#c8452f' : '#e9c46a', 0.4), px * Math.cos(tilt) - py * Math.sin(tilt), px * Math.sin(tilt) + py * Math.cos(tilt), 0.02); }
}
// slate chalkboard with a wooden frame and a chalk ledge, faces +z
export function chalkboard(k, w = 1.6, h = 1.0) {
  const md = MAT.wood('honey');
  k.add(rbox(w + 0.12, h + 0.12, 0.04, 0.015), md, 0, 0, 0.02);
  k.add(plane(w, h), MAT.map(CANV.chalk(), 0.95), 0, 0, 0.042);
  k.add(rbox(w + 0.1, 0.03, 0.09, 0.01), md, 0, -h / 2 - 0.05, 0.06);
  for (let i = 0; i < 3; i++) k.add(cyl(0.008, 0.008, 0.07, 5), MAT.flat(['#f4f2e8', '#f4e08a', '#f4b0c8'][i], 0.9), -w / 2 + 0.2 + i * 0.1, -h / 2 - 0.025, 0.07, 0.3 * i, { rz: Math.PI / 2 });
  k.add(rbox(0.13, 0.035, 0.05, 0.01), MAT.wood('dark'), w / 2 - 0.25, -h / 2 - 0.018, 0.07);
}
// pot-bellied stove with a glowing grate; door faces +z
export function potStove(k) {
  const ir = MAT.iron(), br = MAT.brass(), fire = MAT.glow('#ffb347', '#ff6a00', 2.6), black = MAT.paint('#26272c', 0.5);
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; k.add(pipe([[Math.cos(a) * 0.22, 0.3, Math.sin(a) * 0.22], [Math.cos(a) * 0.3, 0.14, Math.sin(a) * 0.3], [Math.cos(a) * 0.34, 0.01, Math.sin(a) * 0.34]], 0.024, 0.08, 6), ir, 0, 0, 0); k.add(sphere(0.035, 8, 6), ir, Math.cos(a) * 0.34, 0.02, Math.sin(a) * 0.34, 0, { sy: 0.6 }); }
  k.add(lathe([[0.001, 0.26], [0.24, 0.26], [0.27, 0.3], [0.3, 0.34], [0.36, 0.48], [0.38, 0.62], [0.36, 0.78], [0.3, 0.9], [0.24, 0.98], [0.21, 1.03], [0.23, 1.06], [0.16, 1.1], [0.12, 1.12], [0.12, 1.16], [0.001, 1.16]], 20), black, 0, 0, 0);
  for (const [y, rr] of [[0.33, 0.3], [0.79, 0.36], [1.04, 0.225]]) k.add(torus(rr, 0.018, 5, 24), br, 0, y, 0, 0, { rx: Math.PI / 2 });
  // firebox door with a grille in front of the fire
  k.at(0, 0.6, 0.355, 0, () => {
    k.add(lathe([[0.001, 0], [0.16, 0], [0.17, 0.02], [0.15, 0.03], [0.001, 0.03]], 18), ir, 0, 0, 0, 0, { rx: Math.PI / 2 });
    k.add(disc(0.12, 18), fire, 0, 0, 0.032);
    for (let i = -3; i <= 3; i++) k.add(rbox(0.014, 0.24 - Math.abs(i) * 0.025, 0.014, 0.004), ir, i * 0.034, 0, 0.04);
    k.add(sphere(0.022, 8, 6), br, 0.13, 0, 0.05);
  });
  k.add(rbox(0.22, 0.06, 0.03, 0.01), fire, 0, 0.36, 0.3);
  k.add(rbox(0.26, 0.1, 0.03, 0.01), ir, 0, 0.36, 0.31);
  // the collar the stovepipe rises from
  k.add(cyl(0.085, 0.09, 0.08, 14), ir, 0, 1.2, 0);
  return { r: 0.4, top: 1.16 };
}
// open curio shelves crammed with jars, coils, bulbs, boxes and gears; front +z
export function curioShelf(k, { w = 1.4, h = 2.2, d = 0.4, seed = 1, shelves = 5 } = {}) {
  const m = MAT.wood('red'), md = MAT.wood('dark'), r = rng(seed * 41 + 3);
  for (const sx of [-1, 1]) k.add(rbox(0.05, h, d, 0.012), m, sx * (w / 2 - 0.025), h / 2, 0);
  k.add(rbox(w + 0.08, 0.06, d + 0.05, 0.02), md, 0, h, 0);
  k.add(rbox(w - 0.06, h - 0.1, 0.02, 0.005), md, 0, h / 2, -d / 2 + 0.01);
  const step = (h - 0.1) / shelves;
  const jarC = ['#3a6fb0', '#d8a13b', '#b8483b', '#3f8a5a', '#7a5ab0', '#e0d8c0'];
  for (let i = 0; i < shelves; i++) {
    const y = 0.06 + i * step;
    k.add(rbox(w - 0.08, 0.03, d - 0.02, 0.008), m, 0, y, 0);
    let x = -w / 2 + 0.1;
    while (x < w / 2 - 0.12) {
      const t = r(), z = -0.04 + r() * 0.08, top = y + 0.015;
      if (t < 0.3) { const kd = ['jar', 'bottle', 'crock', 'jar'][Math.floor(r() * 4)]; jar(k, x + 0.05, top, z, kd, jarC[Math.floor(r() * jarC.length)], 0.75 + r() * 0.3); x += 0.13; }
      else if (t < 0.45) { k.add(helixGeo(0.045, 0.1 + r() * 0.06, 8, 0.006), MAT.copper(), x + 0.05, top + 0.01, z); k.add(cyl(0.035, 0.035, 0.14, 8), MAT.wood('pale'), x + 0.05, top + 0.075, z); x += 0.13; }
      else if (t < 0.6) { bulb(k, x + 0.04, top, z - 0.04, 1); bulb(k, x + 0.1, top, z + 0.05, 0.8); x += 0.16; }
      else if (t < 0.72) { const bw = 0.14 + r() * 0.12, bh = 0.08 + r() * 0.12; k.add(rbox(bw, bh, 0.2, 0.01), MAT.cloth(['#8a6a3a', '#5a4a3a', '#a85a3a', '#3a5a6a'][Math.floor(r() * 4)], '#000'), x + bw / 2, top + bh / 2, 0, (r() - 0.5) * 0.2); x += bw + 0.03; }
      else if (t < 0.82) { const gr = 0.05 + r() * 0.05; k.add(gearGeo(gr, 10 + Math.floor(r() * 6), 0.015), MAT.brass(), x + gr, top + gr, -0.08, 0.2, { rx: -0.25 }); x += gr * 2 + 0.03; }
      else if (t < 0.9) { books(k, x, x + 0.22, top, -d / 2 + 0.03, d - 0.08, Math.floor(r() * 99)); x += 0.24; }
      else { k.add(lathe([[0.001, 0], [0.05, 0], [0.05, 0.08], [0.03, 0.1], [0.03, 0.14], [0.001, 0.14]], 10), MAT.glass('#bfe6ff', 0.5), x + 0.05, top, z); k.add(cyl(0.035, 0.035, 0.03, 10), MAT.glow('#9ff4c0', '#2ad08a', 1.2), x + 0.05, top + 0.02, z); x += 0.13; }
    }
  }
  return { hw: w / 2 + 0.04, hd: d / 2 + 0.03, top: h + 0.03 };
}
// sawhorse trestle, beam along z
function trestle(k, x, h, l) {
  const md = MAT.wood('grey');
  k.add(rbox(0.08, 0.08, l, 0.012), md, x, h - 0.04, 0);
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) k.add(rbox(0.05, h, 0.05, 0.01), md, x + sx * 0.12, h / 2 - 0.02, sz * (l / 2 - 0.08), 0, { rz: sx * 0.24 });
  for (const sz of [-1, 1]) k.add(rbox(0.3, 0.04, 0.03, 0.008), md, x, 0.25, sz * (l / 2 - 0.08));
}
// Baldino's half-built flying machine on trestles; nose (and propeller) toward +x.
// Returns the propeller pivot (spins about local x).
export function flyingMachine(k) {
  const wood = MAT.wood('honey'), red = MAT.paint('#b8483b', 0.45), br = MAT.brass(), cloth = MAT.cloth('#efe2c4', '#c8b490'), ir = MAT.iron();
  trestle(k, -0.75, 0.62, 0.7); trestle(k, 0.55, 0.62, 0.7);
  const cy = 0.92;
  // fuselage along x (s = distance back from the nose at x = 1.0): covered nose, bare ribs and stringers behind
  const F = [[0, 0.3], [0.3, 0.31], [0.7, 0.29], [1.1, 0.22], [1.5, 0.13], [1.85, 0.05], [2.0, 0.01]];
  const Fr = (sv) => { for (let i = 1; i < F.length; i++) if (sv <= F[i][0]) { const [s0, r0] = F[i - 1], [s1, r1] = F[i]; return r0 + (r1 - r0) * (sv - s0) / (s1 - s0); } return 0.01; };
  const cover = 0.78;
  k.add(lathe([[0.001, 0], ...[0, 0.15, 0.3, 0.45, 0.6, cover].map((sv) => [Fr(sv), sv]), [0.001, cover]], 20), red, 1.0, cy, 0, 0, { rz: Math.PI / 2 });
  k.add(torus(Fr(cover) + 0.005, 0.018, 5, 22), MAT.wood('dark'), 1.0 - cover, cy, 0, Math.PI / 2);
  for (let i = 0; i < 6; i++) { const sv = 0.95 + i * 0.18; k.add(torus(Fr(sv) + 0.005, 0.012, 4, 20), wood, 1.0 - sv, cy, 0, Math.PI / 2); }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; const pts = []; for (let j = 0; j <= 6; j++) { const sv = cover + j * ((1.96 - cover) / 6), rr = Fr(sv); pts.push([1.0 - sv, cy + Math.sin(a) * rr, Math.cos(a) * rr]); } k.add(pipe(pts, 0.009, 0.05, 4), wood, 0, 0, 0); }
  // a riveted brass band and an access panel left off the nose
  k.add(torus(0.305, 0.012, 4, 22), br, 1.0 - 0.3, cy, 0, Math.PI / 2);
  k.add(rbox(0.2, 0.012, 0.16, 0.004), MAT.flat('#1a1210', 0.8), 0.62, cy + 0.302, 0.0);
  // cockpit: seat, little windscreen, stick
  k.add(rbox(0.3, 0.05, 0.3, 0.02), MAT.leather('#5a3a22'), 0.05, cy - 0.12, 0);
  k.add(rbox(0.06, 0.3, 0.3, 0.02), MAT.leather('#5a3a22'), -0.12, cy + 0.02, 0, 0, { rz: 0.2 });
  k.add(cyl(0.012, 0.012, 0.3, 5), ir, 0.22, cy, 0, 0, { rz: -0.3 });
  k.add(plane(0.3, 0.16), MAT.glass('#cfeaff', 0.45), 0.36, cy + 0.33, 0, Math.PI / 2, { rx: -0.5 });
  k.add(torus(0.16, 0.01, 4, 12, Math.PI), br, 0.37, cy + 0.26, 0, Math.PI / 2, { rx: 0 });
  // engine cowling and hub
  k.add(lathe([[0.3, 0], [0.3, 0.08], [0.24, 0.16], [0.1, 0.2], [0.001, 0.21]], 18), br, 1.0, cy, 0, 0, { rz: -Math.PI / 2 });
  const prop = k.pivot(1.24, cy, 0, 0);
  // wings: right one canvassed, left one still a skeleton of ribs on its spar
  const span = 1.25, chord = 0.5, wx = 0.15;
  k.add(cyl(0.025, 0.025, span * 2 + 0.5, 8), wood, wx, cy + 0.12, 0, 0, { rx: Math.PI / 2 });
  k.add(rbox(chord, 0.035, span, 0.015), cloth, wx - 0.05, cy + 0.12, span / 2 + 0.25);
  for (let i = 0; i <= 5; i++) k.add(rbox(chord + 0.02, 0.04, 0.02, 0.006), wood, wx - 0.05, cy + 0.12, 0.25 + i * (span / 5));
  k.add(rbox(chord + 0.04, 0.05, 0.05, 0.015), red, wx - 0.05, cy + 0.12, span + 0.25);
  for (let i = 0; i <= 5; i++) k.add(slab('wingrib', (s) => { s.moveTo(-0.25, 0); s.quadraticCurveTo(-0.05, 0.08, 0.27, 0.0); s.quadraticCurveTo(0.0, -0.02, -0.25, 0); }, 0.015, 0.004), wood, wx - 0.05, cy + 0.11, -0.25 - i * (span / 5));
  k.add(cyl(0.012, 0.012, span, 6), wood, wx - 0.27, cy + 0.12, -0.25 - span / 2, 0, { rx: Math.PI / 2 });
  // wire bracing and struts
  for (const s of [-1, 1]) { k.add(cyl(0.012, 0.012, 0.5, 6), ir, wx, cy - 0.12, s * 0.55, 0, { rx: s * 0.9 }); }
  // tail: tailplane and fin frame
  k.add(rbox(0.3, 0.03, 0.7, 0.01), cloth, -0.85, cy + 0.02, 0);
  k.add(slab('finframe', (s) => { s.moveTo(0, 0); s.lineTo(0.3, 0); s.lineTo(0.1, 0.36); s.lineTo(-0.02, 0.36); s.lineTo(0, 0); const h = new THREE.Path(); h.moveTo(0.04, 0.04); h.lineTo(0.22, 0.04); h.lineTo(0.08, 0.3); h.lineTo(0.03, 0.3); h.lineTo(0.04, 0.04); s.holes.push(h); }, 0.02, 0.004), wood, -0.98, cy + 0.03, 0);
  return { hw: 1.3, hd: span + 0.3, top: 1.35, prop };
}
// propeller blades (two), in the YZ plane about local x; built into a pivot group via a kit
export function propeller(k, l = 0.62) {
  const wood = MAT.wood('red');
  const blade = slab('propblade' + l, (sh) => { sh.moveTo(-0.03, 0); sh.quadraticCurveTo(-0.075, l * 0.4, -0.035, l); sh.quadraticCurveTo(0, l + 0.025, 0.035, l); sh.quadraticCurveTo(0.065, l * 0.4, 0.03, 0); sh.lineTo(-0.03, 0); }, 0.03, 0.008);
  for (const rz of [0, Math.PI]) k.add(blade, wood, 0, 0, 0, Math.PI / 2 + 0.35, { rz });
  k.add(lathe([[0.001, 0], [0.07, 0], [0.06, 0.06], [0.03, 0.1], [0.001, 0.11]], 12), MAT.brass(), 0, 0, 0, 0, { rz: -Math.PI / 2 });
}
// the planet model in its cracked crystal shell, on a brass tripod. Returns {spin} (a group to rotate).
export function shellGlobe(k, { r = 0.34 } = {}) {
  const br = MAT.brass(), wood = MAT.wood('dark');
  for (let i = 0; i < 3; i++) { const a = i * 2.094; k.add(pipe([[Math.cos(a) * 0.4, 0.0, Math.sin(a) * 0.4], [Math.cos(a) * 0.26, 0.4, Math.sin(a) * 0.26], [Math.cos(a) * 0.08, 0.72, Math.sin(a) * 0.08]], 0.018, 0.12, 6), br, 0, 0, 0); k.add(sphere(0.03, 8, 6), br, Math.cos(a) * 0.4, 0.02, Math.sin(a) * 0.4); }
  k.add(torus(0.22, 0.012, 4, 20), br, 0, 0.38, 0, 0, { rx: Math.PI / 2 });
  k.add(lathe([[0.001, 0], [0.12, 0], [0.13, 0.03], [0.06, 0.06], [0.04, 0.12], [0.001, 0.12]], 16), wood, 0, 0.7, 0);
  const cy = 0.82 + r + 0.06;
  // meridian ring in the XY plane and the horizon ring
  k.add(torus(r + 0.06, 0.014, 5, 40, Math.PI * 1.6), br, 0, cy, 0, 0, { rz: -Math.PI * 1.3 });
  k.add(torus(r + 0.1, 0.018, 5, 40), br, 0, cy, 0, 0, { rx: Math.PI / 2 });
  for (const s of [-1, 1]) k.add(rbox(0.04, 0.12, 0.04, 0.01), br, s * (r + 0.1), cy - 0.06, 0);
  k.add(cyl(0.012, 0.012, 0.16, 6), br, 0, 0.82 + 0.02, 0);
  const spin = k.pivot(0, cy, 0, 0);
  const planet = new THREE.Mesh(new THREE.SphereGeometry(r * 0.62, 28, 18), new THREE.MeshStandardMaterial({ map: CANV.planet(), roughness: 0.6 }));
  planet.castShadow = true; spin.add(planet);
  // crystal shell: an icosphere with a chunk broken out, crack lines and shards drifting out
  const shellGeo = new THREE.IcosahedronGeometry(r, 2);
  const P = shellGeo.attributes.position, keep = [], hole = new THREE.Vector3(0.6, 0.55, 0.58).normalize(), c = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < P.count; i += 3) {
    c.set(0, 0, 0); for (let j = 0; j < 3; j++) c.add(v.fromBufferAttribute(P, i + j)); c.normalize();
    if (c.dot(hole) > 0.86) continue;
    for (let j = 0; j < 3; j++) keep.push(P.getX(i + j), P.getY(i + j), P.getZ(i + j));
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3)); sg.computeVertexNormals();
  const crystal = new THREE.MeshStandardMaterial({ color: '#cfe8ff', emissive: '#7a5aff', emissiveIntensity: 0.35, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.4, flatShading: true, side: THREE.DoubleSide, depthWrite: false });
  const shell = new THREE.Mesh(sg, crystal); spin.add(shell);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(sg, 1), new THREE.LineBasicMaterial({ color: '#e8f4ff', transparent: true, opacity: 0.55 }));
  spin.add(edges);
  const crackMat = new THREE.MeshBasicMaterial({ color: '#ff9ad8' });
  const crack = (a0, a1, b0, b1, n) => { const pts = []; for (let i = 0; i <= n; i++) { const t = i / n, th = a0 + (a1 - a0) * t + Math.sin(i * 2.7) * 0.06, ph = b0 + (b1 - b0) * t + Math.cos(i * 3.1) * 0.06; pts.push(new THREE.Vector3(Math.cos(ph) * Math.cos(th), Math.sin(ph), Math.cos(ph) * Math.sin(th)).multiplyScalar(r * 1.01)); } return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n * 3, 0.004, 3), crackMat); };
  spin.add(crack(0.3, -0.8, 0.6, 0.0, 8)); spin.add(crack(1.1, 1.9, 0.5, -0.3, 8)); spin.add(crack(0.9, 0.5, 0.2, -0.6, 6));
  for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.TetrahedronGeometry(0.035 + i * 0.008), crystal); s.position.copy(hole).multiplyScalar(r + 0.07 + i * 0.05).add(new THREE.Vector3(Math.sin(i * 2) * 0.05, Math.cos(i * 3) * 0.05, 0)); s.rotation.set(i, i * 2, 0); spin.add(s); }
  return { r: 0.45, top: cy + r, spin, cy };
}
// Baldino's radio: a valve set on a small table, morse key, headphones and microphone; front +z
export function radioDesk(k) {
  const m = MAT.wood('dark'), mh = MAT.wood('honey'), br = MAT.brass(), bk = MAT.paint('#1e1c1a', 0.35);
  const h = 0.76, w = 0.95, d = 0.6;
  k.add(rbox(w, 0.05, d, 0.015), mh, 0, h - 0.025, 0, 0, { jit: true });
  const leg = turnedLeg(h - 0.05);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(leg, m, sx * (w / 2 - 0.07), 0, sz * (d / 2 - 0.07));
  k.add(rbox(w - 0.1, 0.03, d - 0.1, 0.01), m, 0, 0.18, 0);
  k.add(rbox(0.4, 0.22, 0.3, 0.02), MAT.wood('red'), -0.15, 0.3, -0.02);
  // the set
  k.at(-0.05, h, -0.1, 0, () => {
    k.add(rbox(0.66, 0.4, 0.34, 0.02), m, 0, 0.2, 0);
    k.add(plane(0.6, 0.32), bk, 0, 0.2, 0.172);
    for (const [x, zc] of [[-0.18, '#3a6fb0'], [0.06, '#c8452f']]) { k.add(disc(0.075, 20), MAT.map(CANV.dial(zc), 0.5), x, 0.22, 0.175); k.add(torus(0.078, 0.008, 4, 18), br, x, 0.22, 0.176); k.add(cyl(0.025, 0.03, 0.04, 10), bk, x, 0.22, 0.19, 0, { rx: Math.PI / 2 }); }
    k.add(rbox(0.12, 0.08, 0.01, 0.004), MAT.glow('#ffe8b0', '#ff9a2a', 0.9), 0.22, 0.27, 0.175);
    for (let i = 0; i < 3; i++) k.add(cyl(0.014, 0.016, 0.02, 8), br, 0.17 + i * 0.05, 0.1, 0.18, 0, { rx: Math.PI / 2 });
    // valves on top behind a brass cage
    for (let i = 0; i < 3; i++) { k.add(lathe([[0.025, 0], [0.028, 0.05], [0.026, 0.12], [0.015, 0.15], [0.001, 0.16]], 10), MAT.glass('#f4e8c8', 0.45), -0.18 + i * 0.12, 0.4, -0.04); k.add(cyl(0.008, 0.008, 0.08, 5), MAT.glow('#ffc070', '#ff7a1a', 1.8), -0.18 + i * 0.12, 0.46, -0.04); }
    for (let i = 0; i < 6; i++) k.add(cyl(0.004, 0.004, 0.2, 4), br, -0.27 + i * 0.1, 0.5, 0.06);
    k.add(rbox(0.62, 0.015, 0.02, 0.004), br, 0, 0.6, 0.06);
    // aerial terminal
    k.add(rbox(0.06, 0.04, 0.06, 0.01), MAT.flat('#e8e0cc', 0.4), 0.25, 0.42, -0.1);
  });
  // morse key, headphones, microphone
  k.at(0.33, h, 0.14, -0.3, () => { k.add(rbox(0.1, 0.02, 0.16, 0.006), m, 0, 0.01, 0); k.add(rbox(0.016, 0.012, 0.14, 0.004), br, 0, 0.04, 0, 0, { rx: 0.06 }); k.add(cyl(0.018, 0.018, 0.012, 10), bk, 0, 0.05, 0.06); });
  k.at(-0.3, h, 0.18, 0.4, () => { for (const s of [-1, 1]) k.add(cyl(0.04, 0.04, 0.03, 12), bk, s * 0.09, 0.03, 0, 0, { rz: Math.PI / 2 }); k.add(torus(0.09, 0.008, 4, 14, Math.PI), MAT.leather('#3a2a1a'), 0, 0.03, 0, 0, { rx: -Math.PI / 2 + 0.2 }); });
  k.at(0.06, h, 0.18, 0, () => { k.add(lathe([[0.001, 0], [0.05, 0], [0.05, 0.015], [0.015, 0.025], [0.001, 0.025]], 12), bk, 0, 0, 0); k.add(cyl(0.007, 0.007, 0.16, 5), MAT.steel(), 0, 0.1, 0); k.add(torus(0.045, 0.008, 4, 16), MAT.steel(), 0, 0.22, 0); k.add(cyl(0.03, 0.03, 0.03, 12), bk, 0, 0.22, 0, 0, { rx: Math.PI / 2 }); });
  return { hw: w / 2, hd: d / 2, top: h };
}
// drafting table: slanted board on a cast stand, with a plan pinned to it; front +z
export function draftingTable(k, t = null) {
  const ir = MAT.iron(), m = MAT.wood('pale');
  for (const sx of [-1, 1]) { k.add(rbox(0.06, 0.04, 0.6, 0.01), ir, sx * 0.4, 0.02, 0); k.add(cyl(0.025, 0.03, 0.8, 8), ir, sx * 0.4, 0.42, 0); }
  k.add(cyl(0.015, 0.015, 0.8, 6), ir, 0, 0.25, 0, 0, { rz: Math.PI / 2 });
  k.at(0, 0.92, 0, 0, () => {
    k.add(rbox(1.0, 0.04, 0.7, 0.012), m, 0, 0, 0, 0, { rx: 0.35 });
    if (t) k.add(plane(0.62, 0.46), MAT.map(t, 0.9), -0.05, 0.022 * Math.cos(0.35) + 0.002, 0.0, 0, { rx: -Math.PI / 2 + 0.35 });
    k.add(rbox(1.0, 0.02, 0.04, 0.006), MAT.wood('dark'), 0, -0.1, 0.36, 0, { rx: 0.35 });
  });
  k.add(rbox(0.6, 0.012, 0.04, 0.004), MAT.wood('dark'), 0.05, 1.0, -0.05, 0.3, { rx: 0.35 });
  return { hw: 0.5, hd: 0.36, top: 1.1 };
}

// ---- lighthouse lamp room ------------------------------------------------
const lensGlass = () => M('lensglass', () => std({ color: '#d8f4ff', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.42, emissive: '#ffe6a8', emissiveIntensity: 0.4, depthWrite: false }, 0, { noShadow: true }));
// cast-iron pedestal with the clockwork drum the lens turns on (origin on the floor)
export function lensPedestal(k) {
  const ir = MAT.paint('#2e3a40', 0.45), br = MAT.brass();
  k.add(lathe([[0.001, 0], [0.62, 0], [0.62, 0.06], [0.52, 0.1], [0.4, 0.18], [0.3, 0.3], [0.26, 0.55], [0.32, 0.62], [0.42, 0.68], [0.5, 0.72], [0.5, 0.78], [0.001, 0.78]], 24), ir, 0, 0, 0);
  k.add(torus(0.5, 0.02, 5, 32), br, 0, 0.75, 0, 0, { rx: Math.PI / 2 });
  k.add(torus(0.6, 0.015, 5, 32), br, 0, 0.06, 0, 0, { rx: Math.PI / 2 });
  // clockwork box with a winding crank and weight chain
  k.at(0, 0.38, 0.27, 0, () => {
    k.add(rbox(0.3, 0.26, 0.12, 0.02), br, 0, 0, 0);
    k.add(disc(0.09, 20), MAT.map(CANV.clock(), 0.5), 0, 0.02, 0.062);
    k.add(pipe([[0.12, -0.06, 0.06], [0.12, -0.06, 0.14], [0.22, -0.06, 0.14], [0.22, -0.06, 0.2]], 0.01, 0.03, 5), MAT.steel(), 0, 0, 0);
    k.add(cyl(0.02, 0.02, 0.08, 8), MAT.wood('dark'), 0.22, -0.06, 0.24, 0, { rx: Math.PI / 2 });
  });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; k.add(sphere(0.022, 6, 4), br, Math.sin(a) * 0.56, 0.08, Math.cos(a) * 0.56); }
  return { r: 0.62, top: 0.78 };
}
// the first-order Fresnel lens: beehive of glass prism rings round eight bullseye panels, brass frame
// (origin at its base). Built on its own kit so the room can turn it. Returns {glowMat}.
export function fresnelLens(k) {
  const g = lensGlass(), br = MAT.brass();
  const R = 0.58, y0 = 0.1, band0 = 0.55, band1 = 1.1;
  k.add(lathe([[R - 0.08, 0], [R + 0.05, 0], [R + 0.06, 0.06], [R + 0.02, 0.1], [R - 0.08, 0.1]], 32), br, 0, 0, 0);
  // lower catadioptric rings
  for (let i = 0; i < 6; i++) { const y = y0 + i * ((band0 - y0) / 6), rr = R * (0.72 + i * 0.05); k.add(lathe([[rr, 0], [rr + 0.07, 0.03], [rr + 0.02, 0.07], [rr, 0.07]], 32), g, 0, y, 0); }
  // central drum: eight flat bullseye panels with concentric rings
  const side = 2 * R * Math.tan(Math.PI / 8), bh = band1 - band0;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.at(Math.sin(a) * R, band0 + bh / 2, Math.cos(a) * R, a, () => {
      k.add(plane(side, bh), g, 0, 0, 0);
      for (let j = 1; j <= 3; j++) k.add(torus(0.07 * j, 0.012, 4, 24), g, 0, 0, 0.01);
      k.add(sphere(0.06, 14, 10), g, 0, 0, 0.0, 0, { sz: 0.4 });
    });
    const ca = a + Math.PI / 8, cr = R / Math.cos(Math.PI / 8);
    k.add(cyl(0.018, 0.018, band1 - y0 + 0.5, 6), br, Math.sin(ca) * (cr + 0.01), (y0 + band1 + 0.5) / 2, Math.cos(ca) * (cr + 0.01));
  }
  k.add(torus(R + 0.06, 0.025, 5, 32), br, 0, band0 - 0.01, 0, 0, { rx: Math.PI / 2 });
  k.add(torus(R + 0.06, 0.025, 5, 32), br, 0, band1 + 0.01, 0, 0, { rx: Math.PI / 2 });
  // upper catadioptric rings closing into a dome
  for (let i = 0; i < 8; i++) { const t = i / 8, y = band1 + 0.04 + t * 0.52, rr = R * Math.cos(t * 1.15) * 0.98; k.add(lathe([[rr, 0], [rr + 0.07, 0.025], [rr + 0.015, 0.06], [rr, 0.06]], 32), g, 0, y, 0); }
  k.add(torus(R + 0.03, 0.02, 5, 32), br, 0, band1 + 0.6, 0, 0, { rx: Math.PI / 2 });
  // brass crown and ventilator
  k.add(lathe([[0.001, 0], [R * 0.45, 0], [R * 0.42, 0.05], [0.18, 0.12], [0.08, 0.16], [0.08, 0.26], [0.12, 0.28], [0.12, 0.32], [0.001, 0.36]], 20), br, 0, band1 + 0.58, 0);
  // the burner and its incandescent mantle inside
  k.add(cyl(0.03, 0.04, 0.6, 10), br, 0, y0 + 0.3, 0);
  const glowMat = new THREE.MeshStandardMaterial({ color: '#fff4d0', emissive: '#ffd890', emissiveIntensity: 3, roughness: 0.4 });
  glowMat.userData.noShadow = true;
  k.add(lathe([[0.001, 0], [0.07, 0.02], [0.09, 0.12], [0.07, 0.24], [0.001, 0.27]], 14), glowMat, 0, band0 + bh / 2 - 0.14, 0);
  return { glowMat, height: band1 + 0.95, R: R + 0.1 };
}
// radio transmitter cabinet with three big tuning dials (separate pivots for the room to turn),
// valve tubes and a signal lamp on top; operator on +z. Returns dial pivots (rotate about local z) and
// the two materials the room lights up.
export function transmitterCabinet(k, { w = 1.9, h = 1.7, d = 0.52 } = {}) {
  const m = MAT.wood('dark'), mh = MAT.wood('red'), br = MAT.brass(), bk = MAT.paint('#1c1b1a', 0.35), ir = MAT.iron();
  const tubeMat = new THREE.MeshStandardMaterial({ color: '#ffd8a0', emissive: '#ff8a2a', emissiveIntensity: 0.05, roughness: 0.3 });
  const lampMat = new THREE.MeshStandardMaterial({ color: '#7a2a22', emissive: '#ff3a1a', emissiveIntensity: 0.0, roughness: 0.25, transparent: true, opacity: 0.9 });
  const faceMat = new THREE.MeshStandardMaterial({ color: '#2a2a2a', emissive: '#ffcf80', emissiveIntensity: 0.0, roughness: 0.4 });
  tubeMat.userData.noShadow = lampMat.userData.noShadow = faceMat.userData.noShadow = true;
  k.add(rbox(w + 0.04, 0.1, d + 0.02, 0.02), ir, 0, 0.05, 0);
  k.add(rbox(w, h - 0.1, d, 0.03), m, 0, 0.1 + (h - 0.1) / 2, 0, 0, { jit: true });
  k.add(rbox(w + 0.08, 0.06, d + 0.06, 0.025), mh, 0, h + 0.03, 0);
  for (const sx of [-1, 1]) k.add(rbox(0.06, h - 0.1, 0.05, 0.015), mh, sx * (w / 2 - 0.02), 0.1 + (h - 0.1) / 2, d / 2);
  // lower doors with louvres
  for (const sx of [-1, 1]) {
    k.add(rbox(w / 2 - 0.1, 0.62, 0.03, 0.012), mh, sx * (w / 4 - 0.01), 0.45, d / 2 + 0.005);
    for (let j = 0; j < 6; j++) k.add(rbox(w / 2 - 0.26, 0.018, 0.02, 0.004), m, sx * (w / 4 - 0.01), 0.3 + j * 0.055, d / 2 + 0.022, 0, { rx: -0.5 });
    k.add(sphere(0.022, 8, 6), br, sx * 0.08, 0.5, d / 2 + 0.03);
  }
  // writing shelf
  const sy = 0.84, sd = 0.28;
  k.add(rbox(w + 0.02, 0.05, sd + 0.04, 0.015), mh, 0, sy, d / 2 + sd / 2 - 0.02);
  for (const sx of [-1, 1]) k.add(slab('shelfbr', (s) => { s.moveTo(0, 0); s.lineTo(sd - 0.04, 0); s.quadraticCurveTo(0.04, -0.04, 0, -0.2); s.lineTo(0, 0); }, 0.03, 0.006), br, sx * (w / 2 - 0.1), sy - 0.025, d / 2, -Math.PI / 2);
  // black front panel with the three dials and their scales
  const py = 1.22, ph = 0.6, pz = d / 2 + 0.006;
  k.add(rbox(w - 0.14, ph, 0.012, 0.004), bk, 0, py, pz);
  for (const sy2 of [py - ph / 2 + 0.03, py + ph / 2 - 0.03]) for (let i = 0; i < 6; i++) k.add(sphere(0.012, 6, 4), br, -w / 2 + 0.12 + i * ((w - 0.24) / 5), sy2, pz + 0.008);
  const dx = [-0.6, 0, 0.6], rings = ['#3f8a5a', '#d8a13b', '#c8452f'];
  const dials = dx.map((x, i) => {
    k.add(lathe([[0.001, 0], [0.19, 0], [0.2, 0.015], [0.185, 0.03], [0.001, 0.03]], 28), br, x, py - 0.02, pz, 0, { rx: Math.PI / 2 });
    k.add(disc(0.17, 28), MAT.map(CANV.tuning(rings[i]), 0.5), x, py - 0.02, pz + 0.031);
    k.add(rbox(0.16, 0.04, 0.01, 0.004), br, x, py - 0.24, pz + 0.01);
    k.add(rbox(0.12, 0.02, 0.004, 0.002), MAT.flat('#efe6cc', 0.6), x, py - 0.24, pz + 0.016);
    const outer = k.pivot(x, py - 0.02, pz + 0.035, 0);
    const inner = new THREE.Group(); outer.add(inner);
    const add = (geo, mm, px, pyy, pzz, rot = null) => { const me = new THREE.Mesh(geo, mm); me.position.set(px, pyy, pzz); if (rot) me.rotation.set(...rot); me.castShadow = true; inner.add(me); return me; };
    add(cyl(0.065, 0.075, 0.06, 18), bk, 0, 0, 0.03, [Math.PI / 2, 0, 0]);
    add(torus(0.07, 0.008, 4, 18), br, 0, 0, 0.04);
    add(rbox(0.026, 0.18, 0.018, 0.006), bk, 0, 0.09, 0.05);
    add(rbox(0.014, 0.05, 0.008, 0.003), MAT.flat('#e8402a', 0.4), 0, 0.15, 0.06);
    add(sphere(0.03, 10, 8), MAT.paint('#a8201a', 0.3), 0, 0.19, 0.06);
    return inner;
  });
  // meter and signal lamp between the dials, the ON AIR plate above
  k.at(-0.3, py + 0.18, pz, 0, () => gauge(k, { r: 0.07, v: 0.15, stem: false }));
  k.at(0.3, py + 0.18, pz, 0, () => gauge(k, { r: 0.07, v: 0.1, zone: '#3a6fb0', stem: false }));
  k.add(rbox(0.36, 0.08, 0.012, 0.004), br, 0, py + 0.22, pz + 0.006);
  k.add(plane(0.32, 0.06), faceMat, 0, py + 0.22, pz + 0.014);
  // valve tubes on top behind a brass rail, and the big signal lamp
  for (let i = 0; i < 5; i++) {
    const x = -0.6 + i * 0.3;
    k.add(cyl(0.05, 0.05, 0.04, 12), bk, x, h + 0.08, -0.04);
    k.add(lathe([[0.04, 0], [0.045, 0.08], [0.043, 0.2], [0.03, 0.25], [0.012, 0.27], [0.001, 0.28]], 12), MAT.glass('#f4e8d8', 0.35), x, h + 0.1, -0.04);
    k.add(cyl(0.016, 0.016, 0.14, 6), tubeMat, x, h + 0.2, -0.04);
    k.add(torus(0.028, 0.004, 3, 10), ir, x, h + 0.22, -0.04, 0, { rx: Math.PI / 2 });
  }
  for (const sx of [-1, 1]) k.add(cyl(0.012, 0.012, 0.3, 6), br, sx * (w / 2 - 0.08), h + 0.2, d / 2 - 0.06);
  k.add(cyl(0.012, 0.012, w - 0.16, 6), br, 0, h + 0.35, d / 2 - 0.06, 0, { rz: Math.PI / 2 });
  k.at(w / 2 - 0.2, h + 0.06, 0.08, 0, () => {
    k.add(lathe([[0.001, 0], [0.09, 0], [0.09, 0.05], [0.07, 0.07], [0.001, 0.07]], 14), br, 0, 0, 0);
    k.add(lathe([[0.07, 0], [0.075, 0.06], [0.06, 0.12], [0.03, 0.16], [0.001, 0.17]], 14), lampMat, 0, 0.07, 0);
    for (let i = 0; i < 4; i++) k.add(cyl(0.004, 0.004, 0.17, 4), br, Math.sin(i * 1.57) * 0.078, 0.15, Math.cos(i * 1.57) * 0.078, 0, { rz: Math.sin(i * 1.57) * 0.2, rx: -Math.cos(i * 1.57) * 0.2 });
  });
  // aerial lead-in
  k.add(pipe([[-w / 2 + 0.15, h + 0.06, -d / 2 + 0.08], [-w / 2 + 0.15, h + 0.5, -d / 2 + 0.08], [-w / 2 + 0.15, h + 0.8, -d / 2 - 0.2]], 0.01, 0.1, 4), MAT.flat('#1a1a1a', 0.6), 0, 0, 0);
  return { hw: w / 2 + 0.04, hd: d / 2 + 0.04, top: h + 0.06, dials, tubeMat, lampMat, faceMat, shelfY: sy + 0.025, shelfZ: d / 2 + sd / 2 - 0.02, dx };
}
// desk microphone: chrome ring on springs round a carbon puck, on a weighted stand; faces +z
export function microphone(k) {
  const st = MAT.steel(), bk = MAT.paint('#1c1b1a', 0.35);
  k.add(lathe([[0.001, 0], [0.08, 0], [0.085, 0.015], [0.05, 0.03], [0.015, 0.04], [0.001, 0.04]], 14), bk, 0, 0, 0);
  k.add(cyl(0.008, 0.008, 0.26, 6), st, 0, 0.17, 0);
  k.add(torus(0.025, 0.006, 4, 10, Math.PI), st, 0, 0.3, 0, Math.PI / 2, { rz: Math.PI });
  k.at(0, 0.38, 0, 0, () => {
    k.add(torus(0.075, 0.012, 6, 24), st, 0, 0, 0);
    k.add(cyl(0.04, 0.04, 0.03, 16), bk, 0, 0, 0, 0, { rx: Math.PI / 2 });
    k.add(disc(0.034, 16), MAT.cloth('#5a5a5a', '#2a2a2a'), 0, 0, 0.016);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; k.add(cyl(0.003, 0.003, 0.03, 3), st, Math.cos(a) * 0.057, Math.sin(a) * 0.057, 0, 0, { rz: a + Math.PI / 2 }); }
  });
}

// ================================================================ street furniture (outdoors, SD-1)
// Chunky, bright, rounded Twinsun street furniture for the towns and the spaceport: litter bins, planters and
// flower tubs, sign posts with arrow boards, notice boards and timetables, bollards, luggage trolleys, waiting
// benches, a kiosk, flag poles, an information stand, a drinking fountain, a hand cart and the blue-globe lamp.
// Same contract as the furniture above: each builder draws at the kit's current transform (origin on the ground
// at the centre of the footprint, front toward +z) into the caller's Kit, so a whole street merges into a few
// meshes, and returns its footprint for the caller's collider ({r} or {hw, hd}, and its top).
// Painted parts share ONE vertex-coloured material (colours baked into cached tinted copies of the geometry), and
// every arrow board's lettering comes from one label atlas: a dressed street costs a handful of draw calls.
import { tulipGeometry, flowerGeometry } from './vegetation.js';
const SF = new Map();
const sfc = (key, make) => { let g = SF.get(key); if (!g) { g = make(); SF.set(key, g); } return g; };
// painted metal/wood in any colour: one material for all of them
export const paintVC = () => M('sf-paint', () => std({ vertexColors: true, map: TEX.brushed(), roughness: 0.55, metalness: 0.12 }, 0.5));
// a cached copy of geo carrying a flat vertex colour (for paintVC / softMat)
export function tinted(geo, color) {
  return sfc('tn' + geo.uuid + color, () => {
    const g = geo.clone(), c = new THREE.Color(color), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    g.userData = { ...geo.userData };
    return g;
  });
}
const pv = (k, geo, color, x, y, z, ry = 0, o = {}) => k.add(tinted(geo, color), paintVC(), x, y, z, ry, o);
const SOIL = '#4a3420';
// flowers and leaves: vertex-coloured like softMat, but casting no shadow (a few texels each at the play camera)
const sfSoft = () => M('sf-soft', () => std({ vertexColors: true, roughness: 0.9 }, 0, { noShadow: true }));
const SFC = { blue: '#2f6a9a', teal: '#2a8a7a', yellow: '#e8c040', red: '#c8452f', cream: '#f4efe2', dark: '#2a2c30', terracotta: '#b8623a', purple: '#7a52b0', green: '#3f8a4a' };
export const STREET_COLORS = SFC;

// ---- lettering: one atlas of the words the street signs use (cream board, Citadel-blue capitals)
const LABELS = ['SQUARE', 'HARBOUR', 'SPACEPORT', 'LIGHTHOUSE', 'TOWN', 'PIER', 'TICKETS', 'INFO', 'SNACKS', 'TICKETS · INFO', 'CUSTOMS', 'FERRY', 'SHUTTLE', 'BRIDGE', 'FIELDS'];
const LCELL = { w: 512, h: 112 };
const drawLabel = (x, s, y0, W) => {
  x.fillStyle = '#f4efe2'; x.fillRect(0, y0, W, LCELL.h);
  x.strokeStyle = '#2f6a9a'; x.lineWidth = 8; x.strokeRect(8, y0 + 8, W - 16, LCELL.h - 16);
  let px = 66; do { x.font = `bold ${px}px Rubik, sans-serif`; px -= 2; } while (px > 20 && x.measureText(s).width > W - 56);
  x.fillStyle = '#244f78'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(s, W / 2, y0 + LCELL.h / 2 + 3);
};
const labelAtlas = () => M('sf-labels', () => {
  const t = canvasTex(LCELL.w, LCELL.h * LABELS.length, (x, W) => LABELS.forEach((s, i) => drawLabel(x, s, i * LCELL.h, W)));
  t.anisotropy = 8;
  return std({ map: t, roughness: 0.8 }, 0, { noShadow: true });
});
// a w × h plane showing one atlas word
function labelPlane(text, w, h) {
  const i = LABELS.indexOf(text);
  if (i < 0) return null;
  return sfc(`lp${text}${r3(w)},${r3(h)}`, () => {
    const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv, n = LABELS.length;
    for (let j = 0; j < uv.count; j++) uv.setY(j, (n - 1 - i + uv.getY(j)) / n);
    g.userData.keepUV = true;
    return g;
  });
}
// (a word not in the atlas gets its own little canvas: one more material)
function labelOn(k, text, w, h, x, y, z, ry = 0, o = {}) {
  const g = labelPlane(text, w, h);
  if (g) return k.add(g, labelAtlas(), x, y, z, ry, o);
  const m = M('sf-lbl' + text, () => std({ map: canvasTex(LCELL.w, LCELL.h, (c, W) => drawLabel(c, text, 0, W)), roughness: 0.8 }, 0, { noShadow: true }));
  return k.add(plane(w, h), m, x, y, z, ry, o);
}

// ---- litter bin: Twinsun painted metal drum with a domed lid and a front flap, a yellow band, on a foot ring
export function litterBin(k, { color = SFC.teal, lid = null, band = SFC.yellow } = {}) {
  const lidC = lid || color;
  pv(k, lathe([[0.17, 0], [0.22, 0], [0.22, 0.05], [0.19, 0.07]], 16), SFC.dark, 0, 0, 0);
  pv(k, lathe([[0.001, 0.06], [0.2, 0.06], [0.23, 0.1], [0.255, 0.66], [0.275, 0.68], [0.275, 0.73], [0.25, 0.74], [0.001, 0.74]], 18), color, 0, 0, 0);
  pv(k, torus(0.252, 0.024, 6, 22), band, 0, 0.42, 0, 0, { rx: Math.PI / 2 });
  pv(k, lathe([[0.001, 0], [0.285, 0], [0.285, 0.04], [0.25, 0.1], [0.16, 0.17], [0.06, 0.2], [0.001, 0.205]], 18), lidC, 0, 0.73, 0);
  pv(k, sphere(0.05, 10, 6), band, 0, 0.94, 0);
  // the flap: a dark mouth under a little hood on the lid's front
  pv(k, rbox(0.26, 0.09, 0.08, 0.025), '#141618', 0, 0.84, 0.2, 0, { rx: -0.55 });
  pv(k, rbox(0.3, 0.035, 0.12, 0.015), lidC, 0, 0.9, 0.23, 0, { rx: -0.55 });
  return { r: 0.29, top: 0.98 };
}

// ---- foliage for planters: a lumpy leaf mound (≈1.1 × 0.3 × 0.5 m; scale it) and cached tulips/flowers
const leafMound = () => soft({
  key: 'sf-leafmound',
  prims: Array.from({ length: 7 }, (_, i) => ({ type: 'ell', c: [-0.4 + i * 0.133, 0.08 + (i % 2) * 0.05, (i % 3 - 1) * 0.06], r: [0.16, 0.14, 0.17], group: 'l', mat: 'l', wobble: (x, y, z) => Math.sin(x * 38) * Math.sin(z * 33 + y * 20) * 0.014 })),
  groups: { l: 0.07 }, colors: { l: '#4f9a3c' },
  paint: (p, m, c) => c.offsetHSL(0, 0, (p.y - 0.12) * 0.5 + Math.sin(p.x * 26 + p.z * 19) * 0.03),
  bounds: { min: [-0.62, -0.08, -0.3], max: [0.62, 0.34, 0.3] }, cell: 0.055,
});
const tulip = (c) => sfc('tu' + c, () => tulipGeometry(c));
const flower = (c) => sfc('fw' + c, () => flowerGeometry(c));
function flowersIn(k, pts, colors, seed, kind = 'tulip') {
  const r = rng(seed);
  pts.forEach(([x, y, z], i) => {
    const c = colors[i % colors.length];
    k.add(kind === 'tulip' ? tulip(c) : flower(c), sfSoft(), x, y, z, r() * 6.28, { sx: 1.15, sy: 0.85 + r() * 0.35, sz: 1.15 });
  });
}

// ---- planter box: a trough on corner posts (wood, or painted), a leaf mound and a row of tulips
export function planterBox(k, { w = 1.4, d = 0.55, h = 0.45, pal = 'honey', flowers = [SFC.red, SFC.yellow, '#ffffff'], seed = 1, color = null } = {}) {
  const m = MAT.wood(pal), md = MAT.wood(darker(pal));
  const side = (geo, x, y, z) => (color ? pv(k, geo, color, x, y, z) : k.add(geo, m, x, y, z));
  const hy = 0.06 + (h - 0.06) / 2;
  side(rbox(w, h - 0.06, 0.06, 0.02), 0, hy, d / 2 - 0.03);
  side(rbox(w, h - 0.06, 0.06, 0.02), 0, hy, -d / 2 + 0.03);
  side(rbox(0.06, h - 0.06, d - 0.1, 0.02), w / 2 - 0.03, hy, 0);
  side(rbox(0.06, h - 0.06, d - 0.1, 0.02), -w / 2 + 0.03, hy, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(rbox(0.1, h + 0.02, 0.1, 0.02), md, sx * (w / 2 - 0.03), (h + 0.02) / 2, sz * (d / 2 - 0.03));
  k.add(rbox(w + 0.06, 0.05, 0.1, 0.02), md, 0, h, d / 2 - 0.02); k.add(rbox(w + 0.06, 0.05, 0.1, 0.02), md, 0, h, -d / 2 + 0.02);
  pv(k, rbox(w - 0.1, 0.04, d - 0.1, 0.01), SOIL, 0, h - 0.06, 0);
  k.add(leafMound(), sfSoft(), 0, h - 0.06, -0.03, 0, { sx: (w - 0.1) / 1.15, sy: 0.9, sz: (d - 0.1) / 0.5 });
  const n = Math.max(3, Math.round(w / 0.2)), pts = [];
  for (let i = 0; i < n; i++) pts.push([-w / 2 + 0.12 + (i / (n - 1)) * (w - 0.24), h - 0.08, (i % 2 ? 0.08 : -0.05) * (d / 0.55)]);
  flowersIn(k, pts, flowers, seed);
  return { hw: w / 2 + 0.03, hd: d / 2 + 0.03, top: h + 0.05 };
}

// ---- flower tub: a terracotta (or painted) tub with a rolled rim and a cream band, a leaf mound and flowers
export function flowerTub(k, { r = 0.34, h = 0.42, color = SFC.terracotta, flowers = ['#e8343a', '#f2c94c', '#ffffff', '#8f4fc1'], seed = 2, kind = 'tulip' } = {}) {
  const prof = [[0.001, 0], [r * 0.72, 0], [r * 0.78, 0.04], [r * 0.95, h - 0.06], [r * 1.06, h - 0.05], [r * 1.08, h], [r * 1.02, h + 0.03], [r * 0.92, h], [r * 0.9, h - 0.08], [0.001, h - 0.08]];
  pv(k, lathe(prof, 18), color, 0, 0, 0);
  pv(k, torus(r * 0.88, 0.018, 5, 22), SFC.cream, 0, h * 0.45, 0, 0, { rx: Math.PI / 2 });
  pv(k, cyl(r * 0.9, r * 0.9, 0.02, 14), SOIL, 0, h - 0.06, 0);
  k.add(leafMound(), sfSoft(), 0, h - 0.07, 0, 0.6, { sx: r * 1.7, sy: 0.9, sz: r * 3.2 });
  const pts = [], n = 6;
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.3; pts.push([Math.cos(a) * r * 0.55, h - 0.08, Math.sin(a) * r * 0.55]); }
  pts.push([0, h - 0.04, 0]);
  flowersIn(k, pts, flowers, seed, kind);
  return { r: r * 1.08, top: h + 0.05 };
}

// ---- sign post: a painted post on a stone foot with arrow boards, each pointing along its heading `a`
// (a heading like the hero's angle: the board points toward (sin a, cos a)); boards [{ text, a, color? }], top first
export function signPost(k, boards, { h = 2.5, post = '#7a5232', board = SFC.blue } = {}) {
  pv(k, rbox(0.36, 0.22, 0.36, 0.05), '#9a968c', 0, 0.11, 0);
  pv(k, cyl(0.065, 0.075, h - 0.2, 8), post, 0, 0.2 + (h - 0.2) / 2, 0);
  pv(k, lathe([[0.001, 0], [0.09, 0], [0.1, 0.04], [0.06, 0.1], [0.07, 0.14], [0.001, 0.2]], 10), SFC.yellow, 0, h, 0);
  const L = 1.05, H = 0.26, T = 0.05;
  const arrow = slab('sf-arrow', (s) => { s.moveTo(0, -H / 2); s.lineTo(L - 0.16, -H / 2); s.lineTo(L, 0); s.lineTo(L - 0.16, H / 2); s.lineTo(0, H / 2); s.lineTo(0, -H / 2); }, T, 0.012);
  boards.forEach((b, i) => {
    const y = h - 0.22 - i * 0.33, ry = b.a - Math.PI / 2;
    k.at(0, y, 0, ry, () => {
      pv(k, arrow, b.color || board, 0.07, 0, 0);
      labelOn(k, b.text, 0.8, 0.19, 0.07 + 0.43, 0, T / 2 + 0.004);
      labelOn(k, b.text, 0.8, 0.19, 0.07 + 0.47, 0, -T / 2 - 0.004, Math.PI);
    });
  });
  return { r: 0.2, top: h + 0.2 };
}

// ---- notice board / timetable / departures on two posts under a little clay roof; faces +z
const BOARD_FACES = {
  notices: () => canvasTex(512, 352, (x, W, H) => {
    const r = rng(11);
    x.fillStyle = '#b8885a'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { x.fillStyle = r() < 0.5 ? 'rgba(90,60,30,0.25)' : 'rgba(255,230,190,0.18)'; x.fillRect(r() * W, r() * H, 2, 2); }
    const sheet = (px, py, w, h, bg, title, tc, rot) => {
      x.save(); x.translate(px + w / 2, py + h / 2); x.rotate(rot);
      x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(-w / 2 + 4, -h / 2 + 5, w, h);
      x.fillStyle = bg; x.fillRect(-w / 2, -h / 2, w, h);
      x.fillStyle = tc; x.font = 'bold 26px Rubik, sans-serif'; x.textAlign = 'center'; x.fillText(title, 0, -h / 2 + 36);
      x.fillStyle = 'rgba(40,40,40,0.55)';
      for (let j = 0; j < 5; j++) x.fillRect(-w / 2 + 14, -h / 2 + 54 + j * 16, (w - 28) * (0.6 + r() * 0.4), 6);
      x.fillStyle = ['#c8452f', '#2f6a9a', '#e8c040'][Math.floor(r() * 3)]; x.beginPath(); x.arc(0, -h / 2 + 9, 7, 0, 7); x.fill();
      x.restore();
    };
    sheet(22, 22, 150, 150, '#f4efe2', 'LOST', '#c8452f', -0.05);
    sheet(186, 18, 150, 140, '#ffe9a8', 'CONCERT', '#2f6a9a', 0.04);
    sheet(350, 26, 140, 150, '#dff0ff', 'FERRY', '#244f78', -0.03);
    sheet(40, 186, 180, 140, '#e6f4d8', 'HONEY', '#3f7a2a', 0.03);
    sheet(244, 180, 120, 150, '#f8dcd2', 'LESSONS', '#8f4fc1', -0.06);
    sheet(380, 196, 112, 130, '#f4efe2', 'FOR SALE', '#2a2c30', 0.05);
  }),
  ferry: () => canvasTex(512, 352, (x, W, H) => {
    x.fillStyle = '#1e3550'; x.fillRect(0, 0, W, H); x.strokeStyle = '#e8c040'; x.lineWidth = 8; x.strokeRect(6, 6, W - 12, H - 12);
    x.fillStyle = '#e8c040'; x.font = 'bold 40px Rubik, sans-serif'; x.textAlign = 'center'; x.fillText('HARBOUR · FERRY', W / 2, 62);
    x.fillStyle = 'rgba(232,192,64,0.5)'; x.fillRect(30, 80, W - 60, 3);
    x.font = 'bold 30px monospace'; x.textAlign = 'left';
    [['ZEELICH', '08:30'], ['ZEELICH', '13:00'], ['ZEELICH', '17:30'], ['DESERT ISLAND', '10:15']].forEach(([a, b], i) => { x.fillStyle = '#f4efe2'; x.fillText(a, 34, 128 + i * 54); x.fillStyle = '#9fe0ff'; x.fillText(b, 370, 128 + i * 54); });
  }),
  departures: () => canvasTex(1024, 512, (x, W, H) => {
    x.fillStyle = '#18202c'; x.fillRect(0, 0, W, H); x.strokeStyle = '#e8c040'; x.lineWidth = 10; x.strokeRect(8, 8, W - 16, H - 16);
    x.fillStyle = '#e8c040'; x.font = 'bold 54px Rubik, sans-serif'; x.textAlign = 'center'; x.fillText('DEPARTURES · ESMER SHUTTLE', W / 2, 78);
    x.fillStyle = 'rgba(232,192,64,0.5)'; x.fillRect(40, 100, W - 80, 4);
    x.font = 'bold 40px monospace'; x.textAlign = 'left';
    ['ZEELICH', 'OTRINGAL', 'KNARTAS', 'MOSQUIBEE', 'CELEBRATION', 'UNDER CELEBRATION', 'CX ISLET', 'THE PLATFORM'].forEach((a, i) => {
      const y = 150 + i * 45; x.fillStyle = i % 2 ? '#bfe9ff' : '#9fe0ff'; x.fillText(a, 50, y); x.fillStyle = '#ffd860'; x.fillText('PAD 1', 760, y);
    });
  }),
  map: () => canvasTex(384, 288, (x, W, H) => {
    x.fillStyle = '#3f7fb8'; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(255,255,255,0.18)'; x.lineWidth = 1; for (let i = 0; i < W; i += 24) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
    x.fillStyle = '#e8d8a0'; x.beginPath(); x.ellipse(W * 0.48, H * 0.54, 142, 104, -0.2, 0, 7); x.fill();
    x.fillStyle = '#6fae4a'; x.beginPath(); x.ellipse(W * 0.48, H * 0.52, 128, 90, -0.2, 0, 7); x.fill();
    x.fillStyle = '#4f8f3a'; x.beginPath(); x.ellipse(W * 0.44, H * 0.32, 60, 30, 0.1, 0, 7); x.fill();
    x.strokeStyle = '#b06a2a'; x.lineWidth = 4; x.beginPath(); x.moveTo(W * 0.62, H * 0.34); x.lineTo(W * 0.6, H * 0.52); x.lineTo(W * 0.4, H * 0.58); x.lineTo(W * 0.2, H * 0.6); x.moveTo(W * 0.6, H * 0.52); x.lineTo(W * 0.6, H * 0.82); x.moveTo(W * 0.6, H * 0.6); x.lineTo(W * 0.86, H * 0.6); x.stroke();
    x.fillStyle = '#c8452f'; x.beginPath(); x.arc(W * 0.86, H * 0.6, 9, 0, 7); x.fill();
    x.fillStyle = '#f4efe2'; x.font = 'bold 22px Rubik, sans-serif'; x.textAlign = 'center'; x.fillText('CITADEL ISLAND', W / 2, 30);
    x.fillStyle = '#1e3550'; x.font = 'bold 15px Rubik, sans-serif'; x.fillText('YOU ARE HERE', W * 0.8, H * 0.6 + 26);
  }),
};
const faceMat = (kind) => M('sf-face-' + kind, () => { const t = BOARD_FACES[kind](); return std({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: kind === 'departures' ? 0.35 : 0.06, roughness: 0.75 }, 0, { noShadow: true }); });
export function streetNoticeBoard(k, { kind = 'notices', w = 1.3, h = 0.9, y = 0.95, frame = SFC.blue } = {}) {
  const top = y + h + 0.12;
  for (const sx of [-1, 1]) pv(k, rbox(0.1, top + 0.1, 0.1, 0.025), frame, sx * (w / 2 + 0.06), (top + 0.1) / 2, 0);
  pv(k, rbox(w + 0.1, h + 0.1, 0.06, 0.02), '#5a3a22', 0, y + h / 2, 0);
  k.add(plane(w, h), faceMat(kind), 0, y + h / 2, 0.035);
  // the roof: two clay slabs on a ridge, overhanging front and sides
  for (const s of [-1, 1]) pv(k, rbox(w + 0.5, 0.05, 0.36, 0.02), SFC.terracotta, 0, top + 0.13, s * 0.13, 0, { rx: s * 0.42 });
  pv(k, cyl(0.035, 0.035, w + 0.52, 8), '#8f3a22', 0, top + 0.21, 0, 0, { rz: Math.PI / 2 });
  return { hw: w / 2 + 0.12, hd: 0.2, top: top + 0.25 };
}
// (the face alone, for a board built some other way: a big departures board on its own frame)
export const boardFace = faceMat;

// ---- bollard: a chunky cast post with a mushroom cap and a coloured band
export function bollard(k, { color = SFC.dark, band = SFC.yellow, h = 0.82 } = {}) {
  pv(k, lathe([[0.001, 0], [0.17, 0], [0.17, 0.05], [0.13, 0.09], [0.12, h - 0.16], [0.14, h - 0.12], [0.15, h - 0.06], [0.11, h - 0.01], [0.001, h]], 14), color, 0, 0, 0);
  pv(k, cyl(0.126, 0.126, 0.09, 14), band, 0, h - 0.3, 0);
  return { r: 0.17, top: h };
}

// ---- luggage trolley: a low steel deck on four castors, a push bar (at −x), and cases strapped on
const CASES = ['#c8452f', '#2f6a9a', '#e8c040', '#3f8a4a', '#7a52b0', '#b8623a', '#f4efe2'];
export function luggageTrolley(k, { seed = 1, load = 3 } = {}) {
  const r = rng(seed * 7 + 3), st = MAT.steel();
  k.add(rbox(1.0, 0.05, 0.6, 0.02), MAT.tread('#8d8a9c'), 0, 0.24, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    pv(k, cyl(0.09, 0.09, 0.06, 12), SFC.dark, sx * 0.4, 0.09, sz * 0.24, 0, { rx: Math.PI / 2 });
    k.add(rbox(0.04, 0.12, 0.04, 0.01), st, sx * 0.4, 0.18, sz * 0.24);
  }
  k.add(pipe([[-0.48, 0.24, -0.28], [-0.52, 0.95, -0.28], [-0.52, 0.95, 0.28], [-0.48, 0.24, 0.28]], 0.025, 0.08, 8), st, 0, 0, 0);
  pv(k, cyl(0.035, 0.035, 0.5, 8), SFC.red, -0.52, 0.95, 0, 0, { rx: Math.PI / 2 });
  let y = 0.265;
  for (let i = 0; i < load; i++) {
    const w = 0.7 - i * 0.12 + r() * 0.05, h = 0.2 + r() * 0.08, d = 0.46 - i * 0.06, c = CASES[Math.floor(r() * CASES.length)], ry = (r() - 0.5) * 0.25;
    k.at(0.04 + (r() - 0.5) * 0.06, y, 0, ry, () => {
      pv(k, rbox(w, h, d, 0.045), c, 0, h / 2, 0);
      for (const sx of [-1, 1]) k.add(rbox(0.05, h + 0.012, d + 0.012, 0.01), MAT.flat('#5a3a22', 0.8), sx * w * 0.25, h / 2, 0);
      k.add(torus(0.05, 0.012, 4, 10, Math.PI), MAT.brass(), 0, h, 0);
    });
    y += h;
  }
  return { hw: 0.56, hd: 0.33, top: Math.max(0.98, y) };
}

// ---- waiting bench: painted cast ends with armrests, three seat slats, two back slats; the sitter faces +z
export function waitingBench(k, { w = 1.8, color = SFC.blue, pal = 'honey' } = {}) {
  const wood = MAT.wood(pal);
  const end = slab('sf-benchend', (s) => { s.moveTo(-0.26, 0); s.lineTo(-0.18, 0); s.quadraticCurveTo(-0.05, 0.16, 0.12, 0); s.lineTo(0.22, 0); s.lineTo(0.2, 0.42); s.lineTo(0.26, 0.62); s.lineTo(0.18, 0.64); s.lineTo(0.1, 0.44); s.lineTo(-0.2, 0.44); s.lineTo(-0.3, 0.92); s.lineTo(-0.36, 0.9); s.lineTo(-0.26, 0.42); s.lineTo(-0.26, 0); }, 0.07, 0.015);
  for (const sx of [-1, 1]) pv(k, end, color, sx * (w / 2 - 0.12), 0, 0, -Math.PI / 2);
  for (let i = 0; i < 3; i++) k.add(rbox(w, 0.05, 0.13, 0.02), wood, 0, 0.465, 0.17 - i * 0.15);
  for (let i = 0; i < 2; i++) k.add(rbox(w, 0.12, 0.04, 0.02), wood, 0, 0.62 + i * 0.17, -0.26 - i * 0.035, 0, { rx: -0.2 });
  for (const sx of [-1, 1]) pv(k, rbox(0.08, 0.05, 0.42, 0.02), color, sx * (w / 2 - 0.12), 0.64, 0.05);
  return { hw: w / 2, hd: 0.34, top: 0.95 };
}

// ---- kiosk: a little plastered booth with a counter, a striped awning and a lettered header; serves to +z
export function kiosk(k, { w = 2.0, d = 1.4, h = 2.5, label = 'TICKETS · INFO', color = SFC.blue, stripes = [SFC.red, SFC.cream], wall = '#f4efe2', goods = 'tickets' } = {}) {
  const plaster = MAT.plaster(wall);
  k.add(rbox(w + 0.12, 0.14, d + 0.12, 0.03), MAT.stone('grey', 1), 0, 0.07, 0);
  // back and sides, the counter front below the hatch, posts each side of the hatch
  k.add(rbox(w, h, 0.12, 0.03), plaster, 0, h / 2 + 0.14, -d / 2 + 0.06);
  for (const sx of [-1, 1]) k.add(rbox(0.12, h, d - 0.12, 0.03), plaster, sx * (w / 2 - 0.06), h / 2 + 0.14, 0.06);
  k.add(rbox(w, 0.95, 0.12, 0.03), plaster, 0, 0.14 + 0.475, d / 2 - 0.06);
  pv(k, rbox(w + 0.06, 0.07, 0.32, 0.02), color, 0, 1.12, d / 2);
  for (const sx of [-1, 1]) pv(k, rbox(0.14, h - 0.95, 0.14, 0.03), color, sx * (w / 2 - 0.05), 0.14 + 0.95 + (h - 0.95) / 2, d / 2 - 0.06);
  pv(k, rbox(w - 0.2, 0.3, 0.1, 0.03), color, 0, h - 0.02, d / 2 - 0.06);
  labelOn(k, label, w - 0.36, 0.22, 0, h - 0.02, d / 2 - 0.005);
  // flat roof with a lip, and the striped awning over the hatch with a scalloped edge
  pv(k, rbox(w + 0.4, 0.12, d + 0.4, 0.04), color, 0, h + 0.2, 0.05);
  const n = Math.max(4, Math.round(w / 0.3)), sw = (w + 0.3) / n;
  const scallop = slab('sf-scallop', (s) => { s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0.5, -0.4); s.quadraticCurveTo(0, -1.1, -0.5, -0.4); s.lineTo(-0.5, 0); }, 0.02, 0.004);
  for (let i = 0; i < n; i++) {
    const x = -(w + 0.3) / 2 + sw * (i + 0.5), c = stripes[i % stripes.length];
    pv(k, rbox(sw, 0.03, 0.62, 0.01), c, x, h - 0.24, d / 2 + 0.3, 0, { rx: 0.42 });
    pv(k, scallop, c, x, h - 0.37, d / 2 + 0.58, 0, { sx: sw, sy: 0.18 });
  }
  // inside: a back shelf with goods, a bell on the counter
  k.add(rbox(w - 0.3, 0.04, 0.3, 0.01), MAT.wood('honey'), 0, 1.55, -d / 2 + 0.28);
  const r = rng(w * 10 | 0);
  for (let i = 0; i < 6; i++) pv(k, goods === 'snacks' ? cyl(0.06, 0.06, 0.16, 8) : rbox(0.14, 0.2, 0.04, 0.01), CASES[i % CASES.length], -w / 2 + 0.35 + i * (w - 0.7) / 5, 1.57 + (goods === 'snacks' ? 0.08 : 0.1), -d / 2 + 0.28, (r() - 0.5) * 0.4);
  k.add(lathe([[0.001, 0], [0.06, 0], [0.055, 0.03], [0.02, 0.06], [0.001, 0.07]], 10), MAT.brass(), w * 0.28, 1.155, d / 2 + 0.04);
  return { hw: w / 2 + 0.06, hd: d / 2 + 0.06, top: h + 0.26 };
}

// ---- flag pole: stone foot, white pole with a brass ball, a two-colour swallow-tail pennant flying toward +x
export function flagPole(k, { h = 5.2, color = SFC.blue, color2 = SFC.yellow, len = 1.3 } = {}) {
  k.add(rbox(0.42, 0.26, 0.42, 0.05), MAT.stone('grey', 1), 0, 0.13, 0);
  pv(k, cyl(0.045, 0.065, h - 0.26, 8), '#e6e8ec', 0, 0.26 + (h - 0.26) / 2, 0);
  k.add(sphere(0.08, 10, 8), MAT.brass(), 0, h + 0.05, 0);
  // two halves of a swallow-tail pennant, notched at 78 % of its length
  k.at(0, h - 0.75, 0, 0, () => {
    pv(k, slab('sf-flagU' + len, (s) => { s.moveTo(0, 0.3); s.lineTo(0, 0.6); s.quadraticCurveTo(len * 0.5, 0.6, len, 0.66); s.lineTo(len * 0.78, 0.3); s.lineTo(0, 0.3); }, 0.02, 0.005), color, 0.05, 0, 0, 0, { rz: -0.06 });
    pv(k, slab('sf-flagL' + len, (s) => { s.moveTo(0, 0); s.lineTo(0, 0.3); s.lineTo(len * 0.78, 0.3); s.lineTo(len, -0.06); s.quadraticCurveTo(len * 0.5, 0.0, 0, 0); }, 0.02, 0.005), color2, 0.05, 0, 0, 0, { rz: -0.06 });
  });
  return { r: 0.22, top: h };
}

// ---- information stand: a slanted island map (YOU ARE HERE) on a painted pedestal; read from +z
export function infoStand(k, { color = SFC.blue } = {}) {
  pv(k, rbox(0.3, 0.9, 0.22, 0.05), color, 0, 0.45, -0.05);
  pv(k, rbox(0.44, 0.06, 0.34, 0.02), SFC.dark, 0, 0.03, -0.05);
  k.at(0, 1.02, 0, 0, () => {
    pv(k, rbox(0.9, 0.68, 0.06, 0.025), color, 0, 0, 0, 0, { rx: -0.85 });
    k.add(plane(0.8, 0.58), faceMat('map'), 0, 0.034 * Math.sin(0.85), 0.034 * Math.cos(0.85), 0, { rx: -0.85 });
  });
  return { hw: 0.45, hd: 0.34, top: 1.3 };
}

// ---- drinking fountain: a stone column with a brass spout over a bowl, a drain grate at its foot
export function drinkingFountain(k, { stone = 'sand' } = {}) {
  const s = MAT.stone(stone, 1);
  k.add(rbox(0.6, 0.1, 0.6, 0.03), s, 0, 0.05, 0);
  k.add(lathe([[0.001, 0], [0.2, 0], [0.2, 0.1], [0.16, 0.16], [0.15, 0.72], [0.18, 0.76], [0.001, 0.76]], 12), s, 0, 0.1, 0);
  k.add(lathe([[0.001, 0], [0.08, 0], [0.24, 0.1], [0.28, 0.16], [0.26, 0.17], [0.2, 0.12], [0.001, 0.12]], 18), MAT.stone('grey', 1), 0, 0.86, 0.08);
  k.add(pipe([[0, 0.86, -0.12], [0, 1.12, -0.12], [0, 1.12, 0.06], [0, 1.06, 0.1]], 0.025, 0.06, 8), MAT.brass(), 0, 0, 0);
  k.add(sphere(0.04, 8, 6), MAT.brass(), 0.07, 0.98, -0.12);
  k.add(cyl(0.16, 0.16, 0.012, 12), MAT.iron(), 0, 0.11, 0.38);
  return { r: 0.34, top: 1.15 };
}

// ---- hand cart: a two-wheeled wooden barrow resting on its legs, handles toward −x, sacks or crates on board
export function handCart(k, { load = 'sacks', pal = 'honey', seed = 3 } = {}) {
  const m = MAT.wood(pal), md = MAT.wood(darker(pal)), r = rng(seed);
  k.push(0.35, 0, 0, 0);   // (centred on its footprint: handles to −1.1, wheels to +1.1)
  k.add(rbox(1.3, 0.06, 0.8, 0.02), m, 0.05, 0.55, 0, 0, { rz: -0.04 });
  for (const sz of [-1, 1]) k.add(rbox(1.3, 0.24, 0.05, 0.02), m, 0.05, 0.68, sz * 0.4, 0, { rz: -0.04 });
  k.add(rbox(0.05, 0.24, 0.8, 0.02), m, 0.69, 0.66, 0); k.add(rbox(0.05, 0.24, 0.8, 0.02), m, -0.59, 0.71, 0);
  for (const sz of [-1, 1]) {
    k.add(rbox(1.0, 0.06, 0.06, 0.02), md, -0.95, 0.66, sz * 0.32, 0, { rz: 0.1 });
    k.add(rbox(0.06, 0.55, 0.06, 0.02), md, -0.5, 0.27, sz * 0.32);
    k.add(torus(0.36, 0.035, 6, 20), md, 0.35, 0.36, sz * 0.47);
    for (let i = 0; i < 4; i++) k.add(rbox(0.66, 0.04, 0.03, 0.01), md, 0.35, 0.36, sz * 0.47, 0, { rz: i * Math.PI / 4 });
    pv(k, cyl(0.06, 0.06, 0.08, 10), SFC.dark, 0.35, 0.36, sz * 0.47, 0, { rx: Math.PI / 2 });
  }
  pv(k, cyl(0.025, 0.025, 1.0, 6), SFC.dark, 0.35, 0.36, 0, 0, { rx: Math.PI / 2 });
  if (load === 'sacks') for (let i = 0; i < 3; i++) k.add(sphere(0.22, 10, 8), MAT.cloth('#d8c8a0', '#b8a070'), -0.3 + i * 0.36, 0.78, (r() - 0.5) * 0.3, r() * 3, { sx: 1.1, sy: 0.75, sz: 1.3 });
  else { k.at(-0.2, 0.58, 0, 0.1, () => crate(k, 0.45)); k.at(0.3, 0.58, 0.05, -0.15, () => crate(k, 0.4)); }
  k.pop();
  return { hw: 1.1, hd: 0.55, top: 1.0 };
}

// ---- Citadel street lamp (town.js's blue-globe lamp) for a Kit: stepped foot, post, lyre arms, globe
const lampGlobe = () => M('sf-globe', () => std({ color: '#2f7fd8', roughness: 0.22, metalness: 0.1, emissive: '#3a8cff', emissiveIntensity: 0.35 }, 0, { noShadow: true }));
export function globeLamp(k, { h = 3.3 } = {}) {
  const c = '#7d8088';
  pv(k, cyl(0.2, 0.36, 0.3, 4), c, 0, 0.15, 0, Math.PI / 4);
  pv(k, cyl(0.12, 0.2, 0.25, 4), c, 0, 0.42, 0, Math.PI / 4);
  pv(k, cyl(0.055, 0.085, h - 1.1, 6), c, 0, 0.55 + (h - 1.1) / 2, 0);
  pv(k, cyl(0.1, 0.07, 0.16, 8), c, 0, h - 0.48, 0);
  for (const sx of [-1, 1]) pv(k, pipe([[0.04, h - 0.95, 0], [0.22, h - 0.78, 0], [0.34, h - 0.52, 0], [0.33, h - 0.28, 0], [0.22, h - 0.2, 0], [0.16, h - 0.3, 0]].map(([a, b, z]) => [a * sx, b, z]), 0.032, 0.08, 6), c, 0, 0, 0);
  k.add(sphere(0.34, 18, 12), lampGlobe(), 0, h - 0.08, 0);
  pv(k, cyl(0.04, 0.06, 0.1, 8), c, 0, h + 0.3, 0);
  return { r: 0.3, top: h + 0.35 };
}
