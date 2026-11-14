// House kit for Lupin-Burg. Walls are extruded panels with real thickness
// and holes, so doors and windows sit recessed in their openings. Every
// house gets a stone plinth, corner quoins, thick overhanging roof slabs
// with a ridge cap, gutters and a downpipe, a chimney, framed windows with
// sills/shutters/flower boxes and an arched stone door surround. Small
// random offsets keep the houses from looking cloned.
import * as THREE from 'three';
import { textures, keyJSON } from '../engine/textures.js';
import { rng } from '../engine/math.js';

const cache = new Map();
function texMat(name, opts = {}) {
  const key = name + keyJSON(opts);
  if (cache.has(key)) return cache.get(key);
  const T = textures();
  const map = T[name] ? T[name].clone() : null;
  if (map) { map.needsUpdate = true; map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(opts.rx || 1, opts.ry || 1); }
  const m = new THREE.MeshStandardMaterial({ map, color: opts.color || '#ffffff', roughness: opts.rough ?? 0.92, metalness: 0 });
  cache.set(key, m);
  return m;
}
const plain = (color, rough = 0.85, extra = {}) => texMat('_' + color, { color, rough, ...extra });
// (PERF-2: one material per kind instead of one per window pane / valance scallop, so a house merges them into a
// single draw; the panes' glow and the scallops' colours are fixed at build time, nothing changes them later)
const SHARED = new Map();
const shared = (key, make) => { if (!SHARED.has(key)) SHARED.set(key, make()); return SHARED.get(key); };

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
// `gable` adds a triangle on top; `arc` ({ r, cy }: a circle round (0, cy)) an arched top instead (a barrel roof's end
// wall, CITADEL-85). `holes`: [{x, y, w, h, arch}]
function wallPanel(len, h, t, gable, holes, arc = null) {
  const s = new THREE.Shape();
  s.moveTo(-len / 2, 0);
  s.lineTo(len / 2, 0);
  if (arc) {
    const N = 12;
    for (let i = 0; i <= N; i++) { const u = len / 2 - (i / N) * len; s.lineTo(u, arc.cy + Math.sqrt(Math.max(0, arc.r * arc.r - u * u))); }
  } else {
    s.lineTo(len / 2, h);
    if (gable) s.lineTo(0, h + gable);
    s.lineTo(-len / 2, h);
  }
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
 *         shutters:'#hex', chimney:true, awning:'#hex', seed, beams:true,
 *         barrel: { axis: 'z'|'x', rise, ribs } (CITADEL-85: a barrel roof in place of the gable, LBA2's harbour pair:
 *           its axis along local z (where the gable's ridge runs: arched front and back walls) or x (arched side walls,
 *           the eaves over the front); rise: the crown over the walls as a share of the span; ribs: arched battens),
 *         hip: { pitch, tile, coping } (CITADEL-85: a hip roof, LBA2's Bug Street pair (low, pale) and school: four
 *           slopes of one pitch, the ridge along the longer side; the eaves' boards and the ridge's and hips' caps in
 *           the coping's colour; tile: the roof texture's tint) }
 * Returns { group, colliders, door, gableH, fit, roofOcc }: roofOcc, a barrel's numbers for the occluder (else null)
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
  // (CITADEL-85: a barrel roof, LBA2's long hall and its neighbour: a segment of a cylinder over the walls. Its arc meets
  //  the eaves' wall line 5 cm over the wall top and runs on down to the eaves; the arched end walls rise into the
  //  shell's thickness. gableH is the crown's height over the walls, as the gable's ridge)
  const B = o.barrel ? { axis: o.barrel.axis || 'z', ribs: !!o.barrel.ribs } : null;
  if (B) {
    o.overhang = opts.overhang ?? 0.3;
    B.span = B.axis === 'x' ? o.d : o.w; B.len = (B.axis === 'x' ? o.w : o.d) + o.overhang * 2 + 0.2;
    B.rise = B.span * (o.barrel.rise ?? 0.25);
    const hs = B.span / 2, up = 0.05;
    B.R = (hs * hs + (B.rise - up) ** 2) / (2 * (B.rise - up)); B.cy = o.h + B.rise - B.R;
    B.c = hs + o.overhang; B.a = Math.asin(Math.min(0.98, B.c / B.R));
    B.eaveY = B.cy + B.R * Math.cos(B.a);
    B.yAt = (u) => B.cy + Math.sqrt(Math.max(0, B.R * B.R - u * u));   // the roof's top across the span
  }
  // (CITADEL-85: a hip roof: walls without gables, four slopes of one pitch over the walls and the overhang)
  const HP = !B && o.hip ? { p: o.hip.pitch ?? 0.4 } : null;
  if (HP) { HP.A = o.w / 2 + o.overhang; HP.Bd = o.d / 2 + o.overhang; HP.eaveY = o.h - o.overhang * HP.p + 0.06; HP.rise = HP.p * Math.min(HP.A, HP.Bd); }
  const gableH = B ? B.rise : HP ? HP.rise - o.overhang * HP.p + 0.06 : (o.w / 2) * o.pitch;

  // ---- openings per side (local x along the side, y up)
  const holes = { front: [], back: [], left: [], right: [] };
  // (WORLD-ART-4: door { w, h, carved }: LBA2's cottages have wide carved double doors with gold scrollwork)
  const door = { x: o.door?.x ?? 0, y: 0.18, w: o.door?.w ?? 1.05, h: o.door?.h ?? 2.15, arch: o.door?.arch ?? true, carved: !!o.door?.carved };
  holes.front.push(door);
  for (const wdw of o.windows || []) holes[wdw.side].push({ x: wdw.x, y: wdw.y ?? 1.25, w: wdw.w ?? 0.8, h: wdw.h ?? 1.0, arch: wdw.arch, win: true });

  // ---- walls: front/back carry the gables, left/right are plain rectangles
  const endArc = B ? { r: B.R - 0.12, cy: B.cy } : null;   // (the end walls' top, inside the shell's thickness)
  const sides = [
    { name: 'front', len: o.w, pos: [0, 0, o.d / 2 - T], ry: 0, gable: B || HP ? 0 : gableH, arc: B?.axis === 'z' ? endArc : null },
    { name: 'back', len: o.w, pos: [0, 0, -o.d / 2 + T], ry: Math.PI, gable: B || HP ? 0 : gableH, arc: B?.axis === 'z' ? endArc : null },
    { name: 'left', len: o.d - 2 * T + 0.002, pos: [-o.w / 2 + T, 0, 0], ry: -Math.PI / 2, gable: 0, arc: B?.axis === 'x' ? endArc : null },
    { name: 'right', len: o.d - 2 * T + 0.002, pos: [o.w / 2 - T, 0, 0], ry: Math.PI / 2, gable: 0, arc: B?.axis === 'x' ? endArc : null },
  ];
  // (WORLD-FIX: what stands round each opening, in wall coordinates seen from outside, for tests/worldfit.mjs)
  const fitOps = [];
  const ext = (side, kind, x0, x1, y0, y1) => { const e = { side, kind, x0, x1, y0, y1 }; fitOps.push(e); return e; };
  for (const sd of sides) {
    const panel = new THREE.Group();
    panel.position.set(...sd.pos);
    panel.rotation.y = sd.ry;
    g.add(panel);
    mesh(wallPanel(sd.len, o.h, T, sd.gable, holes[sd.name], sd.arc), wallMat, panel);
    // openings: reveals (inner faces come from the extrusion), frames, glass, sills, shutters
    for (const op of holes[sd.name]) {
      if (op.win) {
        const e = ext(sd.name, 'window', op.x - op.w / 2 - 0.15, op.x + op.w / 2 + 0.15, op.y - 0.08, op.y + op.h + 0.16);
        const glass = mesh(new THREE.PlaneGeometry(op.w, op.h), shared('glass' + !!o.lit, () => new THREE.MeshStandardMaterial({ color: '#2f4f6a', roughness: 0.15, metalness: 0.1, emissive: '#ffcf80', emissiveIntensity: o.lit ? 0.35 : 0.0 })), panel, op.x, op.y + op.h / 2, 0.08);
        glass.castShadow = false;
        const fw = 0.06;
        for (const [fx, fy, w2, h2] of [[op.x, op.y + fw / 2, op.w, fw], [op.x, op.y + op.h - fw / 2, op.w, fw], [op.x - op.w / 2 + fw / 2, op.y + op.h / 2, fw, op.h], [op.x + op.w / 2 - fw / 2, op.y + op.h / 2, fw, op.h], [op.x, op.y + op.h / 2, 0.04, op.h], [op.x, op.y + op.h * 0.55, op.w, 0.04]]) {
          mesh(new THREE.BoxGeometry(w2, h2, 0.07), plain('#f4efe2', 0.7), panel, fx, fy, 0.1);
        }
        // stone sill
        mesh(new THREE.BoxGeometry(op.w + 0.24, 0.08, 0.2), stone, panel, op.x, op.y - 0.03, T + 0.06);   // (WORLD-FIX: 1 cm proud of the opening's foot, whose face it shared)
        // lintel stones
        mesh(new THREE.BoxGeometry(op.w + 0.3, 0.16, 0.06), stone, panel, op.x, op.y + op.h + 0.08, T + 0.02);
        if (o.shutters && !op.noShutters) for (const sx of [-1, 1]) {
          const hinge = new THREE.Group();
          hinge.position.set(op.x + sx * (op.w / 2 + 0.03), op.y + op.h / 2, T + 0.03);
          hinge.rotation.y = sx * (0.35 + r() * 0.5);
          panel.add(hinge);
          const reach = op.w / 2 + 0.03 + (op.w / 2) * Math.cos(hinge.rotation.y);
          if (sx < 0) e.x0 = Math.min(e.x0, op.x - reach); else e.x1 = Math.max(e.x1, op.x + reach);
          const sh = mesh(new THREE.BoxGeometry(op.w / 2, op.h + 0.04, 0.05), plain(o.shutters, 0.8), hinge, sx * op.w / 4, 0, 0.02);
          for (let k = -2; k <= 2; k++) mesh(new THREE.BoxGeometry(op.w / 2 - 0.06, 0.03, 0.02), plain(shade(o.shutters, 0.8), 0.8), sh, 0, k * op.h * 0.18, 0.035);
        }
        if (op.y > 0.9 && r() < 0.75 && sd.name !== 'back') { flowerBox(panel, op.x, op.y - 0.14, T + 0.2, op.w + 0.1, r); e.y0 = op.y - 0.22; }
      } else {
        // the door: wood planks recessed in the opening, stone arch surround, step
        ext(sd.name, 'door', op.x - op.w / 2 - 0.16, op.x + op.w / 2 + 0.16, op.y, op.y + op.h + 0.16);
        ext(sd.name, 'step', op.x - op.w / 2 - 0.3, op.x + op.w / 2 + 0.3, 0, 0.18);
        const dg = new THREE.Group();
        dg.position.set(op.x, op.y, 0.07);
        panel.add(dg);
        const ds = new THREE.Shape();
        ds.moveTo(-op.w / 2, 0); ds.lineTo(op.w / 2, 0);
        if (op.arch) { ds.lineTo(op.w / 2, op.h - op.w / 2); ds.absarc(0, op.h - op.w / 2, op.w / 2, 0, Math.PI, false); }
        else { ds.lineTo(op.w / 2, op.h); ds.lineTo(-op.w / 2, op.h); }
        ds.lineTo(-op.w / 2, 0);
        mesh(scaleUV(new THREE.ExtrudeGeometry(ds, { depth: 0.07, bevelEnabled: false, curveSegments: 10 }), 1.1, 2.2), texMat('wood', { color: o.doorColor || '#c8905a' }), dg);
        if (op.carved) {
          // two leaves: the seam between them, a raised frame on each, a gold medallion and a gold scroll band on each
          const gold = plain('#d8b04a', 0.4, { metalness: 0.6 });
          mesh(new THREE.BoxGeometry(0.03, op.h - 0.04, 0.02), plain('#3a2614', 0.8), dg, 0, op.h / 2, 0.08);
          for (const lx of [-1, 1]) {
            const cx = lx * op.w / 4;
            for (const [fy, fh] of [[op.h * 0.62, op.h * 0.5], [op.h * 0.2, op.h * 0.28]]) {
              const fr = new THREE.Group(); fr.position.set(cx, fy, 0.085); dg.add(fr);
              const fw = op.w / 2 - 0.16;
              for (const s of [-1, 1]) { mesh(new THREE.BoxGeometry(fw, 0.04, 0.03), plain('#5a3a1e', 0.8), fr, 0, s * fh / 2, 0); mesh(new THREE.BoxGeometry(0.04, fh, 0.03), plain('#5a3a1e', 0.8), fr, s * fw / 2, 0, 0); }
            }
            const md = mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 16), gold, dg, cx, op.h * 0.66, 0.11);
            md.scale.set(1, 1.3, 1);
            for (const s of [-1, 1]) { const sc = mesh(new THREE.TorusGeometry(0.07, 0.018, 5, 10, Math.PI), gold, dg, cx + s * 0.08, op.h * 0.2, 0.11); sc.rotation.z = s > 0 ? 0 : Math.PI; }
            mesh(new THREE.SphereGeometry(0.035, 8, 6), gold, dg, -lx * 0.07, 1.05, 0.1);
          }
        } else mesh(new THREE.SphereGeometry(0.04, 8, 6), plain('#d8b04a', 0.4, { metalness: 0.6 }), dg, op.w * 0.32, 1.0, 0.1);
        if (!op.carved) for (const hy of [0.4, 1.6]) mesh(new THREE.BoxGeometry(op.w * 0.7, 0.05, 0.02), plain('#3a3a3a', 0.5), dg, -op.w * 0.1, hy, 0.08);
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
  if (o.beams && !B && !HP) {
    // timber on the gables
    for (const sz of [-1, 1]) {
      const z = sz * (o.d / 2 + 0.01);
      // collar beam spans the gable at 30% of its height, so it stops at the roof line
      mesh(new THREE.BoxGeometry(o.w * 0.7 - 0.25, 0.12, 0.06), fascia, g, 0, o.h + gableH * 0.3, z);
      mesh(new THREE.BoxGeometry(0.12, gableH * 0.62, 0.06), fascia, g, 0, o.h + gableH * 0.31, z);
      for (const bx of [-1, 1]) { const b = mesh(new THREE.BoxGeometry(0.1, gableH * 0.36, 0.06), fascia, g, bx * o.w * 0.2, o.h + gableH * 0.16, z); b.rotation.z = -bx * 0.55; }
    }
  }

  let roofOcc = null;
  if (B) roofOcc = barrelRoof(g, o, B, roofTop, fascia, ridgeMat);
  else if (HP) roofOcc = hipRoof(g, o, HP, o.hip.tile ? texMat(o.roof, { color: o.hip.tile, rx: 1, ry: 1 }) : roofTop, plain(o.hip.coping || '#3f9a94', 0.7));
  else {
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
  }

  // ---- chimney with cap and pots
  if (o.chimney) {
    const cx = (o.chimneyX ?? 0.28) * o.w, cz = -o.d * 0.18;
    const ch = 1.4 + gableH * 0.5;
    const yb = B ? (B.axis === 'z' ? B.yAt(cx) : B.yAt(cz)) - 0.3 : HP ? HP.eaveY + HP.p * Math.min(HP.A - Math.abs(cx), HP.Bd - Math.abs(cz)) - 0.3 : o.h + gableH * (1 - Math.abs(cx) / (o.w / 2)) - 0.3;
    if (roofOcc) roofOcc.chim = { cx, cz, y0: yb, y1: yb + ch + 0.35 };
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
      const v = mesh(new THREE.CircleGeometry(0.15, 10, Math.PI, Math.PI), shared('valance' + (i % 2 ? '#ffffff' : o.awning), () => new THREE.MeshStandardMaterial({ color: i % 2 ? '#ffffff' : o.awning, side: THREE.DoubleSide })), aw, -w / 2 + 0.15 + i * 0.3, -0.62, 0.87);
      v.castShadow = false;
    }
    for (const sx of [-1, 1]) mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6), plain('#3a3a3a', 0.5), aw, sx * (w / 2 - 0.05), -0.35, 0.45).rotation.x = 1.1;
  }

  const colliders = [{ x: 0, z: 0, hw: o.w / 2 + 0.05, hd: o.d / 2 + 0.05, top: 6 }];
  // WORLD-FIX (src/game/worldfit.js): the house in its own coordinates (y up from the group's origin): the plinth
  // from −0.05 to 0.37, the door sill at the door's foot, the walls' corners kept by the quoins (0.46 m on the front
  // and back, 0.41 m on the sides), the downpipe on the right wall by the front corner; openings below the eave beam
  if (!HP && (!B || B.axis === 'z')) ext('right', 'pipe', -(o.d / 2 - 0.35) - 0.09, -(o.d / 2 - 0.35) + 0.09, 0, o.h);   // (right wall u = −local z)
  const fit = {
    w: o.w, d: o.d, base: -0.05, plinth: plinthH - 0.05, floor: door.y, steps: 0.18 + 0.3,
    sides: { front: o.w / 2 - 0.46, back: o.w / 2 - 0.46, left: o.d / 2 - 0.41, right: o.d / 2 - 0.41 },
    top: { front: o.h - 0.14, back: o.h - 0.14, left: o.h, right: o.h },
    openings: fitOps,
  };
  return { group: g, colliders, door: { x: door.x, z: o.d / 2 + 0.75 }, gableH, fit, roofOcc };
}

// CITADEL-85: the hip roof. Four planes over the eaves' rectangle (half sizes A along x, Bd along z), one pitch, so the
// height at (x, z) is the eaves' plus pitch × the distance to the nearest edge; the ridge runs along the longer side.
// Tiled with the gable's tiling (1.4 m: u along the eaves, v up the slope), no slab under them (the camera looks
// down on them; the eaves' boards close the edge). The boards, the ridge cap and the hip caps in the coping's colour.
function hipRoof(g, o, HP, tileMat, coping) {
  const { A, Bd, p, eaveY } = HP, r = Math.min(A, Bd), top = eaveY + p * r;
  const ra = A - r, rb = Bd - r;   // the ridge's half length along x (ra) or z (rb); one of them is 0
  const pos = [], nor = [], uv = [];
  const face = (pts, n, ux, uz) => {   // pts: [x, y, z] (a triangle fan from pts[0]); u along (ux, uz), v up the slope
    const slope = Math.hypot(1, p);
    const P0 = pts[0];
    const uvOf = (q) => { const du = (q[0] - P0[0]) * ux + (q[2] - P0[2]) * uz, dv = (q[1] - eaveY) / p * slope; return [du / 1.4, dv / 1.4]; };
    for (let i = 1; i < pts.length - 1; i++) {
      let tri = [pts[0], pts[i], pts[i + 1]];
      const e1 = tri[1].map((c, k) => c - tri[0][k]), e2 = tri[2].map((c, k) => c - tri[0][k]);
      const cx = e1[1] * e2[2] - e1[2] * e2[1], cy = e1[2] * e2[0] - e1[0] * e2[2], cz = e1[0] * e2[1] - e1[1] * e2[0];
      if (cx * n[0] + cy * n[1] + cz * n[2] < 0) tri = [tri[0], tri[2], tri[1]];
      for (const q of tri) { pos.push(...q); nor.push(...n); uv.push(...uvOf(q)); }
    }
  };
  const ny = 1 / Math.hypot(1, p), nh = p / Math.hypot(1, p);
  const E = (sx, sz) => [sx * A, eaveY, sz * Bd], Rg = (s) => [s * ra, top, s * rb];
  // the two slopes falling to ±z and the two to ±x (trapezoids on the long sides, triangles on the short ones)
  for (const sz of [-1, 1]) face(ra > 0 ? [E(-1, sz), E(1, sz), [ra, top, 0], [-ra, top, 0]] : [E(-1, sz), E(1, sz), [0, top, sz * rb]], [0, ny, sz * nh], 1, 0);
  for (const sx of [-1, 1]) face(rb > 0 ? [E(sx, -1), E(sx, 1), [0, top, rb], [0, top, -rb]] : [E(sx, -1), E(sx, 1), [sx * ra, top, 0]], [sx * nh, ny, 0], 0, 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  mesh(geo, tileMat, g);
  // the eaves' boards round the edge, the ridge cap and the hips' caps
  for (const sz of [-1, 1]) mesh(new THREE.BoxGeometry(A * 2 + 0.06, 0.2, 0.07), coping, g, 0, eaveY - 0.06, sz * (Bd + 0.005)).castShadow = false;
  for (const sx of [-1, 1]) mesh(new THREE.BoxGeometry(0.07, 0.2, Bd * 2 + 0.06), coping, g, sx * (A + 0.005), eaveY - 0.06, 0).castShadow = false;
  const cap = (a, b) => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), L = va.distanceTo(vb);
    if (L < 0.05) return;
    const m = mesh(new THREE.CylinderGeometry(0.075, 0.075, L, 6), coping, g, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.03, (a[2] + b[2]) / 2);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.sub(va).normalize()); m.castShadow = false;
  };
  cap(Rg(-1), Rg(1));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cap(E(sx, sz), Rg(ra > 0 ? sx : sz));
  // the occluder: a slab sloping across the shorter span, from the ridge to the eaves
  return { axis: A >= Bd ? 'x' : 'z', c: r, len: 2 * Math.max(A, Bd), eaveY, crownY: top };
}

// CITADEL-85: the barrel roof (LBA2's long hall: grey and ribbed; its neighbour: brown boards). Built along local z in
// a group turned for an axis along x. The tiles are a cylinder segment with the gable's tiling (1.4 m, u down the
// slope, v along the axis), over a fascia-coloured shell 0.2 m thick (its edge is the eaves' and the ends' board);
// a verge rib at each end, battens across it if ribbed. Along z: gutters on the eaves and the gable house's downpipe;
// along x: no gutter (the arched ends face the sides). Returns the occluder's numbers in house space.
function barrelRoof(g, o, B, roofTop, fascia, ridgeMat) {
  const rg = new THREE.Group(); if (B.axis === 'x') rg.rotation.y = Math.PI / 2; g.add(rg);
  const { R, cy, a, len } = B, N = 16;
  const top = new THREE.CylinderGeometry(R, R, len, N, 1, true, Math.PI - a, 2 * a).rotateX(Math.PI / 2);
  scaleUV(top, 1.4 / (2 * a * R), 1.4 / len);
  mesh(top, roofTop, rg, 0, cy, 0);
  // the shell under the tiles: an arc band extruded along the axis
  const s = new THREE.Shape(), ri = R - 0.2, ro = R - 0.012;
  for (let i = 0; i <= N; i++) { const t = -a + (2 * a * i) / N; if (i) s.lineTo(ro * Math.sin(t), ro * Math.cos(t)); else s.moveTo(ro * Math.sin(t), ro * Math.cos(t)); }
  for (let i = N; i >= 0; i--) { const t = -a + (2 * a * i) / N; s.lineTo(ri * Math.sin(t), ri * Math.cos(t)); }
  const shell = new THREE.ExtrudeGeometry(s, { depth: len - 0.02, bevelEnabled: false, curveSegments: 1 }).translate(0, 0, -(len - 0.02) / 2);
  mesh(shell, fascia, rg, 0, cy, 0);
  // verge ribs at the ends and, ribbed, battens across every ~1.6 m
  const rib = (r, t) => new THREE.TorusGeometry(r, t, 4, N, 2 * a).rotateZ(Math.PI / 2 - a);
  for (const sz of [-1, 1]) mesh(rib(R - 0.06, 0.1), fascia, rg, 0, cy, sz * (len / 2 - 0.06)).castShadow = false;
  if (B.ribs) {
    const n = Math.max(2, Math.round((len - 0.6) / 1.6));
    for (let i = 1; i < n; i++) mesh(rib(R + 0.015, 0.045), ridgeMat, rg, 0, cy, -len / 2 + (i * len) / n).castShadow = false;
  }
  if (B.axis === 'z') {
    const gm = plain('#8a8f96', 0.45, { metalness: 0.4, side: THREE.DoubleSide }), pipe = plain('#8a8f96', 0.45, { metalness: 0.4 });
    for (const sx of [-1, 1]) {
      const gut = new THREE.LatheGeometry([new THREE.Vector2(0.075, -len / 2), new THREE.Vector2(0.075, len / 2)], 10, -Math.PI / 2, Math.PI);
      const m = mesh(gut, gm, g, sx * (B.c - 0.02), B.eaveY - 0.12, 0); m.rotation.x = Math.PI / 2; m.castShadow = false;
    }
    const dpz = o.d / 2 - 0.35, gy = B.eaveY - 0.15;
    const neck = mesh(new THREE.CylinderGeometry(0.045, 0.045, o.overhang + 0.12, 8), pipe, g, o.w / 2 + o.overhang / 2 + 0.02, gy - 0.12, dpz);
    neck.rotation.z = Math.PI / 2 - 0.5;
    mesh(new THREE.CylinderGeometry(0.05, 0.05, gy - 0.25, 8), pipe, g, o.w / 2 + 0.09, (gy - 0.25) / 2, dpz);
    mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 8), pipe, g, o.w / 2 + 0.09, 0.08, dpz + 0.05);
  }
  // the occluder: a slab sloping from the crown to the eaves, raised by the arc's largest rise over that line
  let dev = 0;
  for (let i = 1; i < 20; i++) { const u = (B.c * i) / 20, line = B.yAt(0) - ((B.yAt(0) - B.eaveY) * u) / B.c; dev = Math.max(dev, B.yAt(u) - line); }
  return { axis: B.axis, c: B.c, len, eaveY: B.eaveY, crownY: B.yAt(0) + dev };
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
