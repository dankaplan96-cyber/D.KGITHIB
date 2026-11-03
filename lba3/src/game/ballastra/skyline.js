// Ballastra's skyline as seen from Float Harbor (W-1): the great stone arch (D3's anchor) and the district on stilts
// beyond the harbour (scenery here: W-2 builds the Arch District itself), and a second, fainter arch further out.
//
// The arch is one natural stone span swept along a curve: thick legs standing in the water, thinning to the crest,
// its rock in warm bands (pale limestone, ochre, grey) with a wet foot and green on its top, where a row of small
// houses sits along the crest and terraces cling to its legs. The district round its feet is houses on stilts over
// the water: timber and limewash in the residents' paint, fired or glazed roofs, plank walks between them, ladders down
// to moored boats, washing, two counterweight lift towers. All vertex-coloured and merged: a few draw calls.
//
// The play camera looks down: its frame ends a little over the horizon, so from the harbour the arch's legs and the
// district's roofs show at the top of the picture and the span itself shows in the water (sea.js mirrors
// archPicture(), painted from the same curve).
//
// CONTRACT
//   buildSkyline(group, rng) → { arch: { x0, x1, z, crest } }   (local; draws into group)
//   archPicture() → { tex, box: [x0, width, z, height] }        the arch and the district painted from the front
//   ARCH {xc, z, rx, ry}                                         where the great arch stands (local)
import * as THREE from 'three';
import { compose, tint, cyl, pm, cached } from '../kit.js';
// (far scenery: plain boxes, no bevels — a bevelled box is an extrusion, a hundred times dearer to build, and its
//  bevel is under a pixel from the harbour)
const bbox = (w, h, d) => new THREE.BoxGeometry(w, h, d);
import { fbm, rng } from '../../engine/math.js';

export const ARCH = { xc: -6, z: -104, rx: 34, ry: 44, foot: -4 };
const ARCH2 = { xc: 150, z: -190, rx: 22, ry: 30, foot: -4, s: 1 };
const VCM = () => pm('#ffffff', 0.9, { vertexColors: true });

// the centre line of an arch: s 0 … 1 from its west foot over the crest to its east foot
function archLine(A, s) {
  const th = Math.PI * (1 - s), sn = Math.sin(th);
  const x = A.xc + A.rx * Math.cos(th) * (1 + 0.06 * (1 - sn)), y = A.foot + (A.ry - A.foot) * Math.pow(sn, 0.82);
  return [x, y];
}
// its thickness across the line (in the arch's plane) and along z
const archW = (s) => { const sn = Math.sin(Math.PI * s); return 6.5 + 7.5 * Math.pow(1 - sn, 1.6); };
const archD = (s) => { const sn = Math.sin(Math.PI * s); return 9 + 7 * Math.pow(1 - sn, 1.4); };

function archGeo(A, { seg = 72, ring = 14, scale = 1 } = {}) {
  const pos = [], col = [], idx = [];
  const c = new THREE.Color(), bands = ['#dccaa6', '#e8d9b8', '#cdb48c', '#c4b89e', '#e2cfa8'].map((h) => new THREE.Color(h));
  const wet = new THREE.Color('#8e9878'), moss = new THREE.Color('#7f9c5e'), shade = new THREE.Color('#b8a684');
  for (let i = 0; i <= seg; i++) {
    const s = i / seg, [x, y] = archLine(A, s), [x2, y2] = archLine(A, Math.min(1, s + 0.002)), [x1, y1] = archLine(A, Math.max(0, s - 0.002));
    let tx = x2 - x1, ty = y2 - y1; const tl = Math.hypot(tx, ty); tx /= tl; ty /= tl;
    const nx = -ty, ny = tx;   // (the line's normal in the arch's plane: outward over the crest)
    const w = archW(s) * scale, d = archD(s) * scale;
    for (let k = 0; k < ring; k++) {
      const a = (k / ring) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      // a rounded box section (superellipse), roughened by noise
      const e = 0.55, u = Math.sign(ca) * Math.pow(Math.abs(ca), e) * w / 2, v = Math.sign(sa) * Math.pow(Math.abs(sa), e) * d / 2;
      let px = x + nx * u, py = y + ny * u, pz = A.z + v;
      const nz = fbm(px * 0.09 + 11, py * 0.09 + pz * 0.07, 3) - 0.5;
      const k2 = 1 + nz * 0.32;
      px = x + nx * u * k2; py = y + ny * u * k2; pz = A.z + v * k2;
      pos.push(px, py, pz);
      // colour: strata by height, wet at the waterline, green where the rock faces up, shade underneath
      c.copy(bands[Math.floor((py + 40) / 3.1 + Math.sin(px * 0.05) * 1.4) % bands.length]);
      c.lerp(shade, Math.max(0, -ny * Math.sign(u)) * 0.25);
      const up = ny * Math.sign(u) * (Math.abs(ca) > 0.5 ? 1 : 0);
      if (up > 0.45 && py > 4) c.lerp(moss, Math.min(1, (up - 0.45) * 2.2) * 0.85);
      if (py < 1.2) c.lerp(wet, Math.min(1, (1.2 - py) / 2));
      c.multiplyScalar(0.94 + nz * 0.25);
      col.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < seg; i++) for (let k = 0; k < ring; k++) {
    const a = i * ring + k, b = i * ring + ((k + 1) % ring), cc = a + ring, dd = b + ring;
    idx.push(a, cc, b, b, cc, dd);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  return g;
}

// ------------------------------------------------------------------ houses (vertex-coloured parts)
const WALLS = ['#f2e6cc', '#f2e6cc', '#86b8ae', '#e8bc6c', '#cc7458', '#ead8b4', '#9cc8b4'];
const ROOFS = ['#d4835a', '#d4835a', '#c46a48', '#8fc2ae', '#5f9a86'];
// a gable roof prism w (across the ridge) × d, `over` eaves, thickness t; ridge along z
function roofGeo(w, d, rise, over, t) {
  const s = new THREE.Shape(), hw = w / 2 + over;
  s.moveTo(-hw, -t * 0.6); s.lineTo(-hw, 0); s.lineTo(0, rise + 0.08); s.lineTo(hw, 0); s.lineTo(hw, -t * 0.6); s.lineTo(0, rise - t); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d + over * 2, bevelEnabled: false });
  g.translate(0, 0, -(d + over * 2) / 2);
  return g;
}
function house(parts, r, x, y, z, ry, { w = 3.6, d = 3.2, h = 2.6, stilts = true, water = 0, wall, roof, two = false } = {}) {
  const P = (g, color, lx, ly, lz, rx = 0, lry = 0, rz = 0) => {
    const c = Math.cos(ry), s = Math.sin(ry);
    parts.push([tint(g, color), x + c * lx + s * lz, y + ly, z - s * lx + c * lz, rx, ry + lry, rz]);
  };
  wall ??= WALLS[Math.floor(r() * WALLS.length)]; roof ??= ROOFS[Math.floor(r() * ROOFS.length)];
  if (stilts) {
    const sh = y - water + 1.2;
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 1], [0, -1]]) P(cyl(0.13, 0.16, sh, 6), '#7a5c40', a * (w / 2 - 0.15), -sh / 2, b * (d / 2 - 0.15));
    P(bbox(w + 0.4, 0.22, d + 0.4, 0.03), '#a08060', 0, -0.11, 0);
    P(bbox(w + 0.4, 0.06, 1.0, 0.01), '#b89474', 0, 0.02, d / 2 + 0.7);   // (a landing before the door)
  } else P(bbox(w + 0.2, 0.5, d + 0.2, 0.04), '#cdbd9c', 0, -0.2, 0);
  P(bbox(w, h, d, 0.05), wall, 0, h / 2, 0);
  // corner posts and a floor beam (the timber frame)
  for (const a of [-1, 1]) for (const b of [-1, 1]) P(bbox(0.16, h, 0.16, 0.02), '#7a5c40', a * w / 2, h / 2, b * d / 2);
  P(bbox(w + 0.1, 0.14, d + 0.1, 0.02), '#7a5c40', 0, h - 0.07, 0);
  // door and windows: dark recesses in a lighter frame
  P(bbox(0.86, 1.7, 0.04, 0.01), '#f0e4c8', -w * 0.18, 0.86, d / 2 + 0.01);
  P(bbox(0.7, 1.58, 0.04, 0.01), r() < 0.5 ? '#3f6c9c' : '#6a4a32', -w * 0.18, 0.8, d / 2 + 0.03);
  for (const [lx, lz, face] of [[w * 0.22, d / 2, 0], [w / 2, 0, 1], [-w / 2, 0, -1]]) {
    if (face && r() < 0.35) continue;
    const ox = face ? lx + face * 0.01 : lx, oz = face ? 0 : lz + 0.01, rot = face ? Math.PI / 2 : 0;
    P(bbox(0.74, 0.74, 0.04, 0.01), '#f0e4c8', ox, h * 0.6, oz, 0, rot);
    P(bbox(0.56, 0.56, 0.05, 0.01), '#2c3a40', ox + (face ? face * 0.01 : 0), h * 0.6, oz + (face ? 0 : 0.01), 0, rot);
    if (!face) P(bbox(0.9, 0.08, 0.2, 0.01), '#7a5c40', ox, h * 0.6 - 0.42, oz + 0.08);   // (a sill)
  }
  const rise = w * 0.32;
  P(roofGeo(w + 0.1, d, rise, 0.4, 0.22), roof, 0, h, 0);
  if (r() < 0.5) P(cyl(0.18, 0.2, 1.0, 8), '#c8764e', w * 0.25, h + rise * 0.6 + 0.3, -d * 0.2);   // (a ceramic chimney pot)
  if (two) house(parts, r, x + Math.sin(ry) * 0.4, y + h + rise * 0.55, z + Math.cos(ry) * 0.4, ry + 0.25, { w: w * 0.7, d: d * 0.75, h: 2.2, stilts: false, wall: WALLS[(WALLS.indexOf(wall) + 2) % WALLS.length], roof });
}
// a counterweight lift tower (the district's: two timber posts, a beam with a wheel, a weight, a cage)
function liftTower(parts, x, y, z, ry, h = 9) {
  const c = Math.cos(ry), s = Math.sin(ry), P = (g, color, lx, ly, lz) => parts.push([tint(g, color), x + c * lx + s * lz, y + ly, z - s * lx + c * lz, 0, ry, 0]);
  for (const a of [-1, 1]) P(bbox(0.3, h, 0.3, 0.03), '#7a5c40', a * 1.1, h / 2, 0);
  P(bbox(2.8, 0.36, 0.4, 0.03), '#7a5c40', 0, h, 0);
  P(cyl(0.7, 0.7, 0.16, 14).rotateX(Math.PI / 2), '#b07a3a', 0.6, h + 0.2, 0);
  P(bbox(0.9, 1.1, 0.9, 0.05), '#5f9a86', 1.1 + 0.5, h * 0.55, 0);
  P(bbox(1.6, 1.8, 1.6, 0.03), '#a08060', -0.2, h * 0.28, 0);
}

// ------------------------------------------------------------------ the scene
export function buildSkyline(group, seed = 5) {
  const r = rng(seed);
  // the great arch and the far one
  const arch = new THREE.Mesh(archGeo(ARCH), VCM()); arch.castShadow = true; arch.receiveShadow = true; arch.name = 'bl_arch'; group.add(arch);
  const arch2 = new THREE.Mesh(archGeo(ARCH2, { seg: 40, ring: 10 }), VCM()); arch2.castShadow = false; arch2.receiveShadow = false; arch2.name = 'bl_arch2'; group.add(arch2);
  const parts = [];
  // houses along the crest and on terraces on the legs
  for (let i = 0; i < 9; i++) {
    const s = 0.3 + i * 0.05 + (r() - 0.5) * 0.01, [x, y] = archLine(ARCH, s), w = archW(s);
    const top = y + w / 2 * 0.86;
    house(parts, r, x, top, ARCH.z + (r() - 0.5) * 3, (r() - 0.5) * 0.3, { w: 3 + r() * 1.2, d: 3 + r() * 0.8, stilts: false });
  }
  for (const [s, side] of [[0.1, 1], [0.15, 1], [0.86, -1], [0.92, -1], [0.2, 1]]) {
    const [x, y] = archLine(ARCH, s);
    house(parts, r, x + side * (archW(s) / 2 + 1.6), Math.max(3, y * 0.55), ARCH.z + archD(s) / 2 - 1.5, side * 0.1, { w: 3.2, d: 3, stilts: false, two: r() < 0.4 });
    parts.push([tint(bbox(4.6, 0.5, 4.2, 0.05), '#cdbd9c'), x + side * (archW(s) / 2 + 1.6), Math.max(3, y * 0.55) - 0.3, ARCH.z + archD(s) / 2 - 1.5]);
  }
  // the district on stilts round the arch's feet and the near water: rows bending round the harbour's north side
  const spots = [];
  for (let k = 0; k < 34; k++) {
    const row = k % 3, a = -0.95 + (k / 34) * 1.9 + (r() - 0.5) * 0.05;
    const rr = 58 + row * 13 + (r() - 0.5) * 6;
    const x = -6 + Math.sin(a) * rr * 1.25, z = -36 - Math.cos(a) * rr * 0.92 + 20;
    if (z > -40 || (x > -36 && x < 26 && z > -48)) continue;   // (clear of the harbour and the district's edge)
    if (spots.some(([px, pz]) => Math.hypot(px - x, pz - z) < 6.5)) continue;
    spots.push([x, z]);
    const y = 2.2 + r() * 1.6, ry = Math.atan2(-x - 6, -z - 20) + Math.PI + (r() - 0.5) * 0.4;
    house(parts, r, x, y, z, ry, { w: 3.2 + r() * 1.6, d: 3 + r() * 1.2, h: 2.4 + r() * 0.5, two: r() < 0.3 });
  }
  // the district's first houses, just past its edge and its gate: terraces of stone, two storeys, close enough to
  // read at the top of the play camera's picture from the harbour
  for (const [x, z, ry, two] of [[-33, -44, 0.15, true], [-27.5, -45.5, 0.05, false], [-10.5, -45, -0.05, true], [-5, -43.5, -0.2, false], [1.5, -46, -0.25, true], [-37.5, -51, 0.3, false], [6.5, -52, -0.35, false]]) {
    parts.push([tint(bbox(5.4, 3.4, 5.0, 0.08), '#cdbd9c'), x, 1.0, z, 0, ry, 0]);
    house(parts, r, x, 2.8, z, ry, { w: 4.2, d: 3.8, h: 2.8, stilts: false, two });
    spots.push([x, z]);
  }
  // plank walks between neighbours on stilts
  for (let i = 1; i < spots.length; i++) {
    const [ax, az] = spots[i - 1], [bx, bz] = spots[i], L = Math.hypot(bx - ax, bz - az);
    if (L > 14) continue;
    parts.push([tint(bbox(1.2, 0.14, L, 0.02), '#b08e6a'), (ax + bx) / 2, 2.1, (az + bz) / 2, 0, Math.atan2(bx - ax, bz - az), 0]);
    for (let t = 0.25; t < 1; t += 0.5) parts.push([tint(cyl(0.1, 0.12, 3.4, 5), '#7a5c40'), ax + (bx - ax) * t, 0.4, az + (bz - az) * t]);
  }
  liftTower(parts, -30, 0, -62, 0.3, 11); liftTower(parts, 22, 0, -70, -0.5, 9);
  // green on the crest: round shrubs and two small trees
  for (let i = 0; i < 14; i++) {
    const s = 0.25 + r() * 0.5, [x, y] = archLine(ARCH, s), w = archW(s);
    parts.push([tint(new THREE.SphereGeometry(0.8 + r() * 0.9, 7, 5).scale(1, 0.75, 1), r() < 0.5 ? '#6e9a52' : '#86a85e'), x + (r() - 0.5) * 3, y + w / 2 * 0.8 + 0.4, ARCH.z + (r() - 0.5) * 6]);
  }
  const dist = new THREE.Mesh(compose(parts, true), VCM()); dist.castShadow = true; dist.receiveShadow = true; dist.name = 'bl_district'; group.add(dist);
  return { arch: { x0: ARCH.xc - ARCH.rx, x1: ARCH.xc + ARCH.rx, z: ARCH.z, crest: ARCH.ry }, spots };
}

// the arch and the district painted from the front (for the water's mirror): x over [box0, box0 + width], y over
// [0, height] at the arch's z; clear where the sky is
export function archPicture() {
  return cached('blArchPic', () => {
    const W = 512, H = 256, box = [ARCH.xc - ARCH.rx - 26, (ARCH.rx + 26) * 2, ARCH.z, ARCH.ry + 12];
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const X = (wx) => ((wx - box[0]) / box[1]) * W, Y = (wy) => H - (wy / box[3]) * H;
    // the span: the outer and the inner edge of the swept section
    const outer = [], inner = [];
    for (let i = 0; i <= 60; i++) {
      const s = i / 60, [cx, cy] = archLine(ARCH, s), [x2, y2] = archLine(ARCH, Math.min(1, s + 0.002)), [x1, y1] = archLine(ARCH, Math.max(0, s - 0.002));
      let tx = x2 - x1, ty = y2 - y1; const tl = Math.hypot(tx, ty); tx /= tl; ty /= tl;
      const w = archW(s) / 2; outer.push([cx - ty * w, cy + tx * w]); inner.push([cx + ty * w, cy - tx * w]);
    }
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#d8c8a8'); g.addColorStop(0.6, '#cbb894'); g.addColorStop(1, '#9a9a80');
    x.fillStyle = g; x.beginPath();
    outer.forEach(([a, b], i) => (i ? x.lineTo(X(a), Y(b)) : x.moveTo(X(a), Y(b))));
    for (let i = inner.length - 1; i >= 0; i--) x.lineTo(X(inner[i][0]), Y(inner[i][1]));
    x.closePath(); x.fill();
    // the green on the crest, and the strata
    x.strokeStyle = 'rgba(120,150,90,0.8)'; x.lineWidth = 6; x.beginPath(); outer.slice(14, 47).forEach(([a, b], i) => (i ? x.lineTo(X(a), Y(b) + 3) : x.moveTo(X(a), Y(b) + 3))); x.stroke();
    x.strokeStyle = 'rgba(150,120,80,0.25)'; x.lineWidth = 2;
    for (let k = 1; k < 10; k++) { x.beginPath(); x.moveTo(0, Y(k * 4.4)); x.lineTo(W, Y(k * 4.4 + 1)); x.stroke(); }
    x.globalCompositeOperation = 'destination-in'; x.fillStyle = '#000'; x.beginPath();
    outer.forEach(([a, b], i) => (i ? x.lineTo(X(a), Y(b)) : x.moveTo(X(a), Y(b))));
    for (let i = inner.length - 1; i >= 0; i--) x.lineTo(X(inner[i][0]), Y(inner[i][1]));
    x.closePath(); x.fill(); x.globalCompositeOperation = 'source-over';
    // the houses on the crest and at the feet: small blocks with roofs
    const r = rng(17);
    const hut = (cx, by, w, h, wall, roof) => { x.fillStyle = wall; x.fillRect(X(cx - w / 2), Y(by + h), (w / box[1]) * W, (h / box[3]) * H); x.fillStyle = roof; x.beginPath(); x.moveTo(X(cx - w / 2 - 0.4), Y(by + h)); x.lineTo(X(cx), Y(by + h + w * 0.34)); x.lineTo(X(cx + w / 2 + 0.4), Y(by + h)); x.fill(); };
    for (let i = 0; i < 9; i++) { const s = 0.3 + i * 0.05, [cx, cy] = archLine(ARCH, s); hut(cx, cy + archW(s) / 2 * 0.86, 3.4, 2.6, WALLS[i % WALLS.length], ROOFS[i % ROOFS.length]); }
    for (let i = 0; i < 26; i++) { const cx = box[0] + 6 + r() * (box[1] - 12); hut(cx, 2 + r() * 2, 3 + r() * 1.5, 2.6, WALLS[(i + 2) % WALLS.length], ROOFS[i % ROOFS.length]); x.fillStyle = '#6a5038'; x.fillRect(X(cx - 1.4), Y(2.2), 3, Y(0) - Y(2.2)); x.fillRect(X(cx + 1.2), Y(2.2), 3, Y(0) - Y(2.2)); }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    return { tex: t, box: [box[0], box[1], box[2], box[3]] };
  });
}
