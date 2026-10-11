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
        const base = rgb(P[0]).map((v) => v * (0.82 + r() * 0.3));
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
      const col = rgb(base).map((v) => v * (0.88 + r() * 0.22));
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
        const col = rgb(P[r() < 0.5 ? 0 : 1]).map((v) => v * (0.88 + r() * 0.24));
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
      const col = rgb(P[r() < 0.5 ? 0 : 1]).map((v) => v * (0.85 + r() * 0.3));
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
    bounds: { min: [-w / 2 - 0.06, -drop - 0.06, -l / 2 - 0.08], max: [w / 2 + 0.06, 0.1, l / 2 + 0.06] }, cell: 0.03,
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
    geo = soft({ key: 'plant-spiky', prims, groups: { f: 0.015 }, colors: { l: '#3f8a4a' }, paint: (p, m, c) => { const t = (p.y - 0.33) / 0.9; c.setRGB(0.22 + t * 0.25, 0.48 + t * 0.2, 0.26 + Math.sin(p.y * 40) * 0.04); }, bounds: { min: [-0.5, 0.3, -0.5], max: [0.5, 1.4, 0.5] }, cell: 0.02 });
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
