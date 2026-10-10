// House kit for Lupin-Burg. Walls are extruded panels with real thickness
// and holes, so doors and windows sit recessed in their openings. Every
// house gets a stone plinth, corner quoins, thick overhanging roof slabs
// with a ridge cap, gutters and a downpipe, a chimney, framed windows with
// sills/shutters/flower boxes and an arched stone door surround. Small
// random offsets keep the houses from looking cloned.
import * as THREE from 'three';
import { textures } from '../engine/textures.js';
import { rng } from '../engine/math.js';

const cache = new Map();
function texMat(name, opts = {}) {
  const key = name + JSON.stringify(opts);
  if (cache.has(key)) return cache.get(key);
  const T = textures();
  const map = T[name] ? T[name].clone() : null;
  if (map) { map.needsUpdate = true; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(opts.rx || 1, opts.ry || 1); }
  const m = new THREE.MeshStandardMaterial({ map, color: opts.color || '#ffffff', roughness: opts.rough ?? 0.92, metalness: 0 });
  cache.set(key, m);
  return m;
}
const plain = (color, rough = 0.85, extra = {}) => texMat('_' + color, { color, rough, ...extra });

// world-scaled UVs for extruded panels: 1 texture tile per `tile` metres
function scaleUV(geo, sx, sy = sx) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / sx, uv.getY(i) / sy);
  uv.needsUpdate = true;
  return geo;
}

function mesh(geo, mat, parent, x = 0, y = 0, z = 0, ry = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

// Wall panel in its own XY plane (x along the wall, y up), extruded toward +z by `t`.
// `gable` adds a triangle on top. `holes`: [{x, y, w, h, arch}]
function wallPanel(len, h, t, gable, holes) {
  const s = new THREE.Shape();
  s.moveTo(-len / 2, 0);
  s.lineTo(len / 2, 0);
  s.lineTo(len / 2, h);
  if (gable) s.lineTo(0, h + gable);
  s.lineTo(-len / 2, h);
  s.lineTo(-len / 2, 0);
  for (const o of holes) {
    const p = new THREE.Path();
    const x0 = o.x - o.w / 2, x1 = o.x + o.w / 2, y0 = o.y, y1 = o.y + o.h;
    p.moveTo(x0, y0);
    p.lineTo(x1, y0);
    if (o.arch) {
      p.lineTo(x1, y1 - o.w / 2);
      p.absarc(o.x, y1 - o.w / 2, o.w / 2, 0, Math.PI, false);
    } else p.lineTo(x1, y1), p.lineTo(x0, y1);
    p.lineTo(x0, y0);
    s.holes.push(p);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false, curveSegments: 10 });
  return scaleUV(g, 2.2, 2.2);
}

// arched or square stone surround around an opening (front face only)
function surround(o, depth, ring = 0.14) {
  const s = new THREE.Shape();
  const x0 = o.x - o.w / 2 - ring, x1 = o.x + o.w / 2 + ring, y0 = o.y, y1 = o.y + o.h;
  s.moveTo(x0, y0);
  s.lineTo(x1, y0);
  if (o.arch) { s.lineTo(x1, y1 - o.w / 2); s.absarc(o.x, y1 - o.w / 2, o.w / 2 + ring, 0, Math.PI, false); }
  else { s.lineTo(x1, y1 + ring); s.lineTo(x0, y1 + ring); }
  s.lineTo(x0, y0);
  const p = new THREE.Path();
  p.moveTo(o.x - o.w / 2, y0);
  p.lineTo(o.x + o.w / 2, y0);
  if (o.arch) { p.lineTo(o.x + o.w / 2, y1 - o.w / 2); p.absarc(o.x, y1 - o.w / 2, o.w / 2, 0, Math.PI, false); }
  else { p.lineTo(o.x + o.w / 2, y1); p.lineTo(o.x - o.w / 2, y1); }
  p.lineTo(o.x - o.w / 2, y0);
  s.holes.push(p);
  return scaleUV(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 1, curveSegments: 10 }), 1, 1);
}

function flowerBox(parent, x, y, z, w, r) {
  mesh(new THREE.BoxGeometry(w, 0.16, 0.22), texMat('wood', { rx: 1, ry: 0.3 }), parent, x, y, z);
  const cols = ['#ff5a7a', '#ffd84a', '#ff8a3d', '#d06aff', '#ffffff'];
  for (let i = 0; i < 7; i++) {
    const leaf = mesh(new THREE.IcosahedronGeometry(0.07, 0), plain('#4f8f3a'), parent, x - w / 2 + 0.08 + (i / 6) * (w - 0.16), y + 0.12, z + (r() - 0.5) * 0.08);
    leaf.castShadow = false;
    const fl = mesh(new THREE.IcosahedronGeometry(0.045, 0), plain(cols[Math.floor(r() * cols.length)], 0.6), parent, leaf.position.x + 0.02, y + 0.19 + r() * 0.04, leaf.position.z + 0.02);
    fl.castShadow = false;
  }
}

/**
 * opts: { w, d, h, pitch, overhang, wall:'plaster'|'stone', tint, roof:'roof'|'roofBlue', door:{x, arch}, windows:[{side:'front'|'back'|'left'|'right', x, y, w, h}],
 *         shutters:'#hex', chimney:true, awning:'#hex', seed, beams:true }
 * Returns { group, colliders:[{x,z,hw,hd,rot,top}], door:{x,z} (local), front normal +z }
 */
export function buildHouse(opts) {
  const o = { w: 6, d: 5, h: 3.1, pitch: 0.62, overhang: 0.38, wall: 'plaster', roof: 'roof', seed: 1, shutters: '#3b78d8', chimney: true, ...opts };
  const r = rng(o.seed * 977 + 13);
  const g = new THREE.Group();
  const T = 0.26; // wall thickness
  const wallMat = texMat(o.wall === 'plaster' ? 'plasterWall' : o.wall, { color: o.tint || '#ffffff' });
  const stone = texMat('stone', { rx: 1, ry: 1 });
  const wood = texMat('wood', { rx: 1, ry: 1 });
  const roofTop = texMat(o.roof, { rx: 1, ry: 1 });
  const fascia = plain('#6b4423', 0.9);
  const ridgeMat = texMat(o.roof, { color: '#d8c0b0', rx: 1, ry: 0.4 });
  const gableH = (o.w / 2) * o.pitch;

  // ---- openings per side (local x along the side, y up)
  const holes = { front: [], back: [], left: [], right: [] };
  const door = { x: o.door?.x ?? 0, y: 0.18, w: 1.05, h: 2.15, arch: o.door?.arch ?? true };
  holes.front.push(door);
  for (const wdw of o.windows || []) holes[wdw.side].push({ x: wdw.x, y: wdw.y ?? 1.25, w: wdw.w ?? 0.8, h: wdw.h ?? 1.0, arch: wdw.arch, win: true });

  // ---- walls: front/back carry the gables, left/right are plain rectangles
  const sides = [
    { name: 'front', len: o.w, pos: [0, 0, o.d / 2 - T], ry: 0, gable: gableH },
    { name: 'back', len: o.w, pos: [0, 0, -o.d / 2 + T], ry: Math.PI, gable: gableH },
    { name: 'left', len: o.d - 2 * T + 0.002, pos: [-o.w / 2 + T, 0, 0], ry: -Math.PI / 2, gable: 0 },
    { name: 'right', len: o.d - 2 * T + 0.002, pos: [o.w / 2 - T, 0, 0], ry: Math.PI / 2, gable: 0 },
  ];
  for (const sd of sides) {
    const panel = new THREE.Group();
    panel.position.set(...sd.pos);
    panel.rotation.y = sd.ry;
    g.add(panel);
    mesh(wallPanel(sd.len, o.h, T, sd.gable, holes[sd.name]), wallMat, panel);
    // openings: reveals (inner faces come from the extrusion), frames, glass, sills, shutters
    for (const op of holes[sd.name]) {
      if (op.win) {
        const glass = mesh(new THREE.PlaneGeometry(op.w, op.h), new THREE.MeshStandardMaterial({ color: '#2f4f6a', roughness: 0.15, metalness: 0.1, emissive: '#ffcf80', emissiveIntensity: o.lit ? 0.35 : 0.0 }), panel, op.x, op.y + op.h / 2, 0.08);
        glass.castShadow = false;
        const fw = 0.06;
        for (const [fx, fy, w2, h2] of [[op.x, op.y + fw / 2, op.w, fw], [op.x, op.y + op.h - fw / 2, op.w, fw], [op.x - op.w / 2 + fw / 2, op.y + op.h / 2, fw, op.h], [op.x + op.w / 2 - fw / 2, op.y + op.h / 2, fw, op.h], [op.x, op.y + op.h / 2, 0.04, op.h], [op.x, op.y + op.h * 0.55, op.w, 0.04]]) {
          mesh(new THREE.BoxGeometry(w2, h2, 0.07), plain('#f4efe2', 0.7), panel, fx, fy, 0.1);
        }
        // stone sill
        mesh(new THREE.BoxGeometry(op.w + 0.24, 0.08, 0.2), stone, panel, op.x, op.y - 0.04, T + 0.06);
        // lintel stones
        mesh(new THREE.BoxGeometry(op.w + 0.3, 0.16, 0.06), stone, panel, op.x, op.y + op.h + 0.08, T + 0.02);
        if (o.shutters && !op.noShutters) for (const sx of [-1, 1]) {
          const hinge = new THREE.Group();
          hinge.position.set(op.x + sx * (op.w / 2 + 0.03), op.y + op.h / 2, T + 0.03);
          hinge.rotation.y = sx * (0.35 + r() * 0.5);
          panel.add(hinge);
          const sh = mesh(new THREE.BoxGeometry(op.w / 2, op.h + 0.04, 0.05), plain(o.shutters, 0.8), hinge, sx * op.w / 4, 0, 0.02);
          for (let k = -2; k <= 2; k++) mesh(new THREE.BoxGeometry(op.w / 2 - 0.06, 0.03, 0.02), plain(shade(o.shutters, 0.8), 0.8), sh, 0, k * op.h * 0.18, 0.035);
        }
        if (op.y > 0.9 && r() < 0.75 && sd.name !== 'back') flowerBox(panel, op.x, op.y - 0.14, T + 0.2, op.w + 0.1, r);
      } else {
        // the door: wood planks recessed in the opening, stone arch surround, step
        const dg = new THREE.Group();
        dg.position.set(op.x, op.y, 0.07);
        panel.add(dg);
        const ds = new THREE.Shape();
        ds.moveTo(-op.w / 2, 0); ds.lineTo(op.w / 2, 0);
        if (op.arch) { ds.lineTo(op.w / 2, op.h - op.w / 2); ds.absarc(0, op.h - op.w / 2, op.w / 2, 0, Math.PI, false); }
        else { ds.lineTo(op.w / 2, op.h); ds.lineTo(-op.w / 2, op.h); }
        ds.lineTo(-op.w / 2, 0);
        mesh(scaleUV(new THREE.ExtrudeGeometry(ds, { depth: 0.07, bevelEnabled: false, curveSegments: 10 }), 1.1, 2.2), texMat('wood', { color: o.doorColor || '#c8905a' }), dg);
        mesh(new THREE.SphereGeometry(0.04, 8, 6), plain('#d8b04a', 0.4, { metalness: 0.6 }), dg, op.w * 0.32, 1.0, 0.1);
        for (const hy of [0.4, 1.6]) mesh(new THREE.BoxGeometry(op.w * 0.7, 0.05, 0.02), plain('#3a3a3a', 0.5), dg, -op.w * 0.1, hy, 0.08);
        mesh(surround(op, 0.08), stone, panel, 0, 0, T - 0.02);
        mesh(new THREE.BoxGeometry(op.w + 0.6, 0.18, 0.55), stone, panel, op.x, 0.09, T + 0.26);
      }
    }
  }

  // ---- plinth of rough stones, corner quoins
  const plinthH = 0.42;
  mesh(scaleUV(new THREE.BoxGeometry(o.w + 0.1, plinthH, o.d + 0.1), 1.2, 1.2), stone, g, 0, plinthH / 2 - 0.05, 0);
  for (const [cx, cz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    for (let k = 0; k < Math.floor(o.h / 0.42); k++) {
      const big = k % 2 === 0;
      const q = mesh(new THREE.BoxGeometry(big ? 0.46 : 0.3, 0.36, big ? 0.3 : 0.46), stone, g,
        cx * (o.w / 2 - (big ? 0.2 : 0.12)) + cx * 0.025, plinthH + 0.2 + k * 0.42, cz * (o.d / 2 - (big ? 0.12 : 0.2)) + cz * 0.025);
      q.rotation.y = (r() - 0.5) * 0.04;
    }
  }
  // eave beams
  for (const sz of [-1, 1]) mesh(new THREE.BoxGeometry(o.w + 0.08, 0.18, 0.2), fascia, g, 0, o.h - 0.05, sz * (o.d / 2 - 0.06));
  if (o.beams) {
    // timber on the gables
    for (const sz of [-1, 1]) {
      const z = sz * (o.d / 2 + 0.01);
      // collar beam spans the gable at 30% of its height, so it stops at the roof line
      mesh(new THREE.BoxGeometry(o.w * 0.7 - 0.25, 0.12, 0.06), fascia, g, 0, o.h + gableH * 0.3, z);
      mesh(new THREE.BoxGeometry(0.12, gableH * 0.62, 0.06), fascia, g, 0, o.h + gableH * 0.31, z);
      for (const bx of [-1, 1]) { const b = mesh(new THREE.BoxGeometry(0.1, gableH * 0.36, 0.06), fascia, g, bx * o.w * 0.2, o.h + gableH * 0.16, z); b.rotation.z = -bx * 0.55; }
    }
  }

  // ---- roof: two thick slabs with overhang; tiles on top; ridge cap; gutters
  const half = o.w / 2 + o.overhang;
  const slope = Math.hypot(half, half * o.pitch);
  const ang = Math.atan(o.pitch);
  const len = o.d + o.overhang * 2 + 0.2;
  for (const sx of [-1, 1]) {
    const slab = new THREE.Group();
    slab.position.set(0, o.h + gableH, 0);
    slab.rotation.z = sx * -ang;
    g.add(slab);
    // body (fascia coloured edge) and tiled top
    mesh(new THREE.BoxGeometry(slope, 0.2, len), fascia, slab, sx * slope / 2, -0.12, 0);
    const top = new THREE.PlaneGeometry(slope, len);
    scaleUV(top, 1 / (slope / 1.4), 1 / (len / 1.4));
    const t = mesh(top, roofTop, slab, sx * slope / 2, -0.015, 0);
    t.rotation.x = -Math.PI / 2;
    t.castShadow = false;
  }
  // gutters hang level under the low edge of each slab (in house space, not slab space)
  for (const sx of [-1, 1]) {
    const ex = sx * (half - 0.02), ey = o.h + gableH - half * o.pitch - 0.3;
    const gut = new THREE.LatheGeometry([new THREE.Vector2(0.075, -len / 2), new THREE.Vector2(0.075, len / 2)], 10, -Math.PI / 2, Math.PI);
    const gm = mesh(gut, plain('#8a8f96', 0.45, { metalness: 0.4, side: THREE.DoubleSide }), g, ex, ey, 0);
    gm.rotation.x = Math.PI / 2;
    gm.rotation.y = 0;
    gm.castShadow = false;
  }
  const ridge = mesh(new THREE.CylinderGeometry(0.13, 0.13, len + 0.06, 10), ridgeMat, g, 0, o.h + gableH + 0.02, 0);
  ridge.rotation.x = Math.PI / 2;
  // downpipe at the front corner
  // downpipe: from the right gutter, a swan-neck back to the wall, then down the corner
  const pipe = plain('#8a8f96', 0.45, { metalness: 0.4 });
  const dpz = o.d / 2 - 0.35, gy = o.h + gableH - half * o.pitch - 0.33;
  const neck = mesh(new THREE.CylinderGeometry(0.045, 0.045, o.overhang + 0.12, 8), pipe, g, o.w / 2 + o.overhang / 2 + 0.02, gy - 0.12, dpz);
  neck.rotation.z = Math.PI / 2 - 0.5;
  mesh(new THREE.CylinderGeometry(0.05, 0.05, gy - 0.25, 8), pipe, g, o.w / 2 + 0.09, (gy - 0.25) / 2, dpz);
  mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 8), pipe, g, o.w / 2 + 0.09, 0.08, dpz + 0.05);

  // ---- chimney with cap and pots
  if (o.chimney) {
    const cx = (o.chimneyX ?? 0.28) * o.w, cz = -o.d * 0.18;
    const ch = 1.4 + gableH * 0.5;
    const yb = o.h + gableH * (1 - Math.abs(cx) / (o.w / 2)) - 0.3;
    mesh(scaleUV(new THREE.BoxGeometry(0.62, ch, 0.62), 1.2, 1.2), texMat('brick', { rx: 1, ry: 1 }), g, cx, yb + ch / 2, cz);
    mesh(new THREE.BoxGeometry(0.78, 0.1, 0.78), stone, g, cx, yb + ch + 0.05, cz);
    for (const px of [-0.12, 0.14]) mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.26, 10), plain('#b5583a', 0.8), g, cx + px, yb + ch + 0.22, cz);
  }

  // ---- striped shop awning
  if (o.awning) {
    const aw = new THREE.Group();
    aw.position.set(o.awningX ?? 0, o.awningY ?? 2.55, o.d / 2 + 0.02);
    g.add(aw);
    const w = o.awningW ?? 2.6;
    const geo = new THREE.CylinderGeometry(0.9, 0.9, w, 16, 1, true, Math.PI * 0.08, Math.PI * 0.42); // quarter dome from the wall out and down
    geo.rotateZ(Math.PI / 2);
    const stripes = stripeTexture(o.awning);
    const m = mesh(geo, new THREE.MeshStandardMaterial({ map: stripes, side: THREE.DoubleSide, roughness: 0.9 }), aw, 0, -0.9, 0.0);
    m.scale.set(1, 1, 1);
    // scalloped valance
    for (let i = 0; i < Math.round(w / 0.3); i++) {
      const v = mesh(new THREE.CircleGeometry(0.15, 10, Math.PI, Math.PI), new THREE.MeshStandardMaterial({ color: i % 2 ? '#ffffff' : o.awning, side: THREE.DoubleSide }), aw, -w / 2 + 0.15 + i * 0.3, -0.62, 0.87);
      v.castShadow = false;
    }
    for (const sx of [-1, 1]) mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6), plain('#3a3a3a', 0.5), aw, sx * (w / 2 - 0.05), -0.35, 0.45).rotation.x = 1.1;
  }

  const colliders = [{ x: 0, z: 0, hw: o.w / 2 + 0.05, hd: o.d / 2 + 0.05, top: 6 }];
  return { group: g, colliders, door: { x: door.x, z: o.d / 2 + 0.75 }, gableH };
}

function shade(hex, k) { return '#' + new THREE.Color(hex).multiplyScalar(k).getHexString(); }

const stripeCache = new Map();
function stripeTexture(color) {
  if (stripeCache.has(color)) return stripeCache.get(color);
  const c = document.createElement('canvas');
  c.width = 128; c.height = 16;
  const x = c.getContext('2d');
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#fbf6ec' : color; x.fillRect(i * 16, 0, 16, 16); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 1);
  t.rotation = Math.PI / 2;
  stripeCache.set(color, t);
  return t;
}
