// Mountain set dressing for the Hamalayi (SD-3): Lhar's stone houses, the monastery, the observatory, the lift
// station and the small things of mountain life around them (woodpiles, sledges, frozen troughs, pens, drying
// racks, lanterns, pots over a fire, wooden sign posts). Every builder draws into a props.js Kit at the kit's
// current transform (origin on the ground at the centre of the footprint, front facing +z) and returns its
// footprint for a collider; the region merges each area's Kit per material (a dressed area is a handful of draw
// calls). Toy-like LBA2 forms: rubble walls on a plinth, thick slate roofs with snow on them, painted shutters.
import * as THREE from 'three';
import { rng } from '../engine/math.js';
import { textures } from '../engine/textures.js';
import { MAT, M, TEX, rbox, cyl, lathe, sphere, torus, plane, pipe, slab, tinted, paintVC, canvasTex } from './props.js';
import { panelGeo, frameGeo, cyl as kitCyl } from './kit.js';

const GC = new Map();
const cached = (key, make) => { let g = GC.get(key); if (!g) { g = make(); GC.set(key, g); } return g; };
const r2 = (v) => Math.round(v * 100) / 100;
const std = (o, tile = 0, extra = {}) => { const m = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0, ...o }); m.userData.tile = tile; Object.assign(m.userData, extra); return m; };

// ================================================================ materials (one each, shared by every area)
const goldTiles = () => cached('goldTex', () => {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'), r = rng(61);
  x.fillStyle = '#8a5a18'; x.fillRect(0, 0, S, S);
  const rows = 8, cols = 8, w = S / cols, h = S / rows;
  for (let j = 0; j < rows; j++) for (let i = -1; i <= cols; i++) {
    const px = i * w + (j % 2) * w / 2, py = j * h, g = x.createLinearGradient(px, py, px + w, py + h * 1.1), k = r();
    g.addColorStop(0, k > 0.5 ? '#ffe9a0' : '#f6dc84'); g.addColorStop(0.5, '#e0b048'); g.addColorStop(1, '#a87420');
    x.fillStyle = g; x.beginPath(); x.moveTo(px + 1, py); x.lineTo(px + w - 1, py); x.lineTo(px + w - 1, py + h * 0.75); x.quadraticCurveTo(px + w / 2, py + h * 1.15, px + 1, py + h * 0.75); x.closePath(); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
});
export const MM = {
  rubble: (c = '#e8dcc8') => M('mm-rub' + c, () => std({ map: textures().rubble, color: c, roughness: 0.95 }, 1.7)),
  slate: (c = '#c8d0e0') => M('mm-sl' + c, () => std({ map: textures().slate, color: c, roughness: 0.78 }, 1.3)),
  gold: () => M('mm-gold', () => std({ map: goldTiles(), color: '#ffffff', roughness: 0.4, metalness: 0.35 }, 1.4)),
  stoneUV: (c = '#ffffff') => M('mm-stuv' + c, () => std({ map: textures().stone, color: c, roughness: 0.9 }, 0)),
  rubbleUV: (c = '#ffffff') => M('mm-rbuv' + c, () => std({ map: textures().rubble, color: c, roughness: 0.95 }, 0)),
  plaster: () => M('mm-plaster', () => std({ map: TEX.plaster('#f2ebdc'), roughness: 0.95 }, 2)),
  stone: (c = '#ffffff') => M('mm-st' + c, () => std({ map: textures().stone, color: c, roughness: 0.9 }, 1.6)),
  snow: () => M('mm-snow', () => std({ color: '#f6f9ff', roughness: 0.9 })),
  ice: () => M('mm-ice', () => std({ color: '#d4eeff', roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.82 }, 0, { noShadow: true })),
  glow: () => M('mm-glow', () => std({ color: '#ffe2a8', emissive: '#ffa040', emissiveIntensity: 1.25, roughness: 0.4 }, 0, { noShadow: true })),
  ember: () => M('mm-ember', () => std({ color: '#ff9a40', emissive: '#ff5a10', emissiveIntensity: 1.8, roughness: 0.6 }, 0, { noShadow: true })),
  logs: () => M('mm-logs', () => std({ vertexColors: true, map: TEX.wood('pale'), roughness: 0.9 }, 0.7)),
  cloth: () => M('mm-cloth', () => std({ vertexColors: true, map: TEX.fabric('#f4f0e8', '#c8c0b0'), roughness: 0.95 }, 0.5, { noShadow: true })),
  hay: () => M('mm-hay', () => std({ color: '#dcb860', roughness: 1, flatShading: true })),
  dark: () => M('mm-dark', () => std({ color: '#1e2230', roughness: 0.7 }, 0, { noShadow: true })),
};
const pv = (k, geo, color, x, y, z, ry = 0, o = {}) => k.add(tinted(geo, color), paintVC(), x, y, z, ry, o);
const cl = (k, geo, color, x, y, z, ry = 0, o = {}) => k.add(tinted(geo, color), MM.cloth(), x, y, z, ry, o);
const box = (w, h, d) => rbox(r2(w), r2(h), r2(d), 0);   // a plain box (12 triangles) for small parts
// a lathe whose UVs the kit projects in metres (props.js lathe keeps its 0..1 UVs: fine for small turned parts only)
const kcyl = (rt, rb, h, seg, tile) => cached(`kc${r2(rt)},${r2(rb)},${r2(h)},${seg},${tile}`, () => kitCyl(rt, rb, h, seg, tile));
const lath = (pts, seg = 32) => cached('lt' + seg + pts.join(';'), () => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(Math.max(a, 0.0001), b)), seg));
export const TRIM = { blue: '#2f6a9a', red: '#a8402c', green: '#2f7a4a', ochre: '#c8902a', teal: '#2a8a7a', plum: '#7a3a5a' };

// ================================================================ shared geometry
// a low lumpy half-dome of snow (scale it to a drift), 4 variants
export function driftGeo(seed = 0) {
  return cached('drift' + (seed % 4), () => {
    const g = new THREE.SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2), p = g.attributes.position, r = rng(seed % 4 + 5);
    const a = [r() * 6, r() * 6, r() * 6];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 1 + Math.sin(x * 2.3 + a[0]) * 0.12 + Math.sin(z * 2.9 + a[1]) * 0.1 + Math.sin((x + z) * 4.1 + a[2]) * 0.05;
      p.setXYZ(i, x * k, Math.pow(Math.max(0, y), 0.8) * (0.85 + 0.15 * k), z * k);
    }
    g.computeVertexNormals();
    return g;
  });
}
export const drift = (k, x, y, z, len, ht, dep, ry = 0, seed = 0) => k.add(driftGeo(seed), MM.snow(), x, y, z, ry, { sx: len / 2, sy: ht, sz: dep / 2 });
// a log lying along z: bark on the side, pale end grain on the caps
export function logGeo(r = 0.09, len = 0.5) {
  return cached(`log${r2(r)},${r2(len)}`, () => {
    const g = new THREE.CylinderGeometry(r, r * 1.04, len, 6, 1).rotateX(Math.PI / 2), n = g.attributes.normal, c = new Float32Array(n.count * 3);
    const bark = new THREE.Color('#6a4a30'), end = new THREE.Color('#e2c490');
    for (let i = 0; i < n.count; i++) { const e = Math.abs(n.getZ(i)) > 0.9 ? end : bark; c[i * 3] = e.r; c[i * 3 + 1] = e.g; c[i * 3 + 2] = e.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  });
}
const icicle = (len) => cached('ic' + r2(len), () => new THREE.ConeGeometry(0.035 + len * 0.05, len, 5).rotateX(Math.PI));
const lump = (s) => cached('lump' + s, () => { const g = new THREE.DodecahedronGeometry(1, 0), p = g.attributes.position, r = rng(s + 3); for (let i = 0; i < p.count; i++) { const k = 0.85 + ((Math.sin(p.getX(i) * 7 + s) + Math.cos(p.getZ(i) * 5 + s * 2)) * 0.5 + 0.5) * 0.25 + r() * 0.0; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k); } g.computeVertexNormals(); return g; });
// a wall's cross-section (bottom bw, top tw, height h) extruded along x, centred
export function trapGeo(len, h, bw, tw) {
  return cached(`trap${r2(len)},${r2(h)},${r2(bw)},${r2(tw)}`, () => {
    const s = new THREE.Shape([new THREE.Vector2(-bw / 2, 0), new THREE.Vector2(bw / 2, 0), new THREE.Vector2(tw / 2, h), new THREE.Vector2(-tw / 2, h)]);
    return new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }).translate(0, 0, -len / 2).rotateY(Math.PI / 2);
  });
}
// a hipped roof with flared eaves: lathe on 4 sides, faceted; 1 × 1 × 1 at the eave (scale to half-widths / height)
export const curvedRoofGeo = () => cached('croof', () => {
  const prof = [[0.001, -0.1], [1.0, -0.1], [1.035, 0.0], [0.93, 0.06], [0.78, 0.15], [0.6, 0.3], [0.42, 0.5], [0.25, 0.71], [0.1, 0.9], [0.001, 0.96]];
  const g = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a / 0.7071, b)), 4).rotateY(Math.PI / 4).toNonIndexed();
  g.computeVertexNormals();
  return g;
});
export function curvedRoof(k, A, B, H, mat, x = 0, y = 0, z = 0) { k.add(curvedRoofGeo(), mat, x, y, z, 0, { sx: A, sy: H, sz: B }); }

// ================================================================ lettering (one atlas, carved-wood boards)
const WORDS = ['LHAR', 'MONASTERY', 'OBSERVATORY', 'LIFT', 'FOOTHILLS'];
const CELL = { w: 512, h: 112 };
const woodBoard = (x, y0, W, Hh, r) => {
  x.fillStyle = '#9a6a3c'; x.fillRect(0, y0, W, Hh);
  for (let i = 0; i < 26; i++) { x.strokeStyle = `rgba(${60 + r() * 30},${36 + r() * 20},18,${0.25 + r() * 0.25})`; x.lineWidth = 1 + r() * 2; const py = y0 + r() * Hh; x.beginPath(); x.moveTo(0, py); x.bezierCurveTo(W / 3, py + (r() - 0.5) * 8, W * 0.66, py + (r() - 0.5) * 8, W, py); x.stroke(); }
};
const labelMat = () => M('mm-labels', () => {
  const r = rng(41);
  const t = canvasTex(CELL.w, CELL.h * WORDS.length, (x, W) => WORDS.forEach((s, i) => {
    const y0 = i * CELL.h; woodBoard(x, y0, W, CELL.h, r);
    let px = 70; do { x.font = `bold ${px}px Rubik, sans-serif`; px -= 2; } while (px > 20 && x.measureText(s).width > W - 60);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = 'rgba(40,22,10,0.75)'; x.fillText(s, W / 2 + 3, y0 + CELL.h / 2 + 6);
    x.fillStyle = '#f6ead0'; x.fillText(s, W / 2, y0 + CELL.h / 2 + 3);
  }));
  t.anisotropy = 8;
  return std({ map: t, roughness: 0.85 }, 0, { noShadow: true });
});
function word(text, w, h) {
  const i = WORDS.indexOf(text);
  return cached(`wd${text}${r2(w)},${r2(h)}`, () => {
    const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv, n = WORDS.length;
    for (let j = 0; j < uv.count; j++) uv.setY(j, (n - 1 - i + uv.getY(j)) / n);
    g.userData.keepUV = true;
    return g;
  });
}

// ================================================================ sign post: a log post on a heap of stones, carved arrow boards
// boards [{ text, a }] top first; a board points along heading a (toward (sin a, cos a)), as props.signPost
export function mountainSign(k, boards, { h = 2.3 } = {}) {
  const wood = MAT.wood('dark');
  k.add(lump(1), MAT.rubble('grey'), 0, 0.12, 0, 0.3, { sx: 0.42, sy: 0.4, sz: 0.38 });
  k.add(lump(2), MAT.rubble('grey'), 0.22, 0.1, -0.16, 1.1, { sx: 0.26, sy: 0.26, sz: 0.24 });
  k.add(cyl(0.07, 0.085, h, 7), wood, 0, h / 2, 0);
  k.add(sphere(0.1, 8, 4), MM.snow(), 0, h + 0.01, 0, 0, { sy: 0.45 });
  const L = 1.15, H = 0.27, T = 0.06;
  const arrow = slab('mm-arrow', (s) => { s.moveTo(0, -H / 2); s.lineTo(L - 0.2, -H / 2); s.lineTo(L, 0); s.lineTo(L - 0.2, H / 2); s.lineTo(0, H / 2); s.lineTo(0, -H / 2); }, T, 0.014);
  boards.forEach((b, i) => {
    const y = h - 0.25 - i * 0.34;
    k.at(0, y, 0, b.a - Math.PI / 2, () => {
      k.add(arrow, MAT.wood('honey'), 0.06, 0, 0);
      k.add(word(b.text, 0.86, 0.2), labelMat(), 0.06 + 0.46, 0, T / 2 + 0.004);
      k.add(word(b.text, 0.86, 0.2), labelMat(), 0.06 + 0.5, 0, -T / 2 - 0.004, Math.PI);
      k.add(box(L - 0.25, 0.04, T + 0.02), MM.snow(), 0.06 + (L - 0.25) / 2 + 0.02, H / 2 + 0.02, 0);
    });
  });
  return { r: 0.22, top: h };
}

// ================================================================ notice board under a little slate roof (faces +z)
const noticeFace = () => M('mm-notice', () => {
  const t = canvasTex(512, 352, (x, W, Hh) => {
    const r = rng(17);
    woodBoard(x, 0, W, Hh, r);
    const sheet = (px, py, w, h, bg, title, tc, rot) => {
      x.save(); x.translate(px + w / 2, py + h / 2); x.rotate(rot);
      x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(-w / 2 + 4, -h / 2 + 5, w, h);
      x.fillStyle = bg; x.fillRect(-w / 2, -h / 2, w, h);
      x.fillStyle = tc; x.font = 'bold 26px Rubik, sans-serif'; x.textAlign = 'center'; x.fillText(title, 0, -h / 2 + 36);
      x.fillStyle = 'rgba(40,40,40,0.5)'; for (let j = 0; j < 5; j++) x.fillRect(-w / 2 + 14, -h / 2 + 54 + j * 16, (w - 28) * (0.55 + r() * 0.45), 6);
      x.fillStyle = ['#c8452f', '#2f6a9a', '#e8c040'][Math.floor(r() * 3)]; x.beginPath(); x.arc(0, -h / 2 + 9, 7, 0, 7); x.fill();
      x.restore();
    };
    sheet(22, 24, 150, 146, '#f4efe2', 'LOST GOAT', '#c8452f', -0.05);
    sheet(190, 18, 140, 150, '#ffe9a8', 'FIREWOOD', '#7a4a1a', 0.04);
    sheet(350, 30, 138, 140, '#dff0ff', 'MEETING', '#244f78', -0.03);
    sheet(60, 190, 170, 140, '#e6f4d8', 'GOAT MILK', '#3f7a2a', 0.03);
    sheet(270, 186, 190, 144, '#f8dcd2', 'THIN ICE!', '#b0302a', -0.05);
  });
  return std({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 0.06, roughness: 0.8 }, 0, { noShadow: true });
});
export function noticeBoard(k, { w = 1.3, h = 0.9, y = 0.9 } = {}) {
  const wood = MAT.wood('dark'), top = y + h + 0.12;
  for (const sx of [-1, 1]) k.add(cyl(0.07, 0.08, top + 0.15, 7), wood, sx * (w / 2 + 0.08), (top + 0.15) / 2, 0);
  k.add(rbox(w + 0.12, h + 0.12, 0.07, 0.02), wood, 0, y + h / 2, 0);
  k.add(plane(w, h), noticeFace(), 0, y + h / 2, 0.04);
  for (const s of [-1, 1]) {
    k.add(rbox(w + 0.55, 0.06, 0.4, 0.02), MM.slate(), 0, top + 0.14, s * 0.14, 0, { rx: s * 0.5 });
    k.add(rbox(w + 0.4, 0.06, 0.3, 0.03), MM.snow(), 0, top + 0.2, s * 0.12, 0, { rx: s * 0.5 });
  }
  return { hw: w / 2 + 0.14, hd: 0.22, top: top + 0.3 };
}

// ================================================================ a stone house with a slate roof (Lhar, the shepherd's hut)
// w × d footprint, h to the eaves (≥ 4.6: two storeys), the door on the front (+z) at door·w − w/2 + 0.5 (as before,
// so the door spots don't move). lean: a woodshed on the +x (1) or −x (−1) gable. balcony: over the door (two storeys).
export function mountainHouse(k, o = {}) {
  const { w = 5, d = 4.2, h = 2.6, door = 0.4, seed = 1, wall = '#e6d8c2', trim = TRIM.blue, doorC = TRIM.red, lean = 0, balcony = false, chimney = true, pitch = 0.6, ovE = 0.55, ovG = 0.38, pots = false } = o;
  const r = rng(seed * 31 + 7), t = 0.42, f = 0.3;
  const wallM = MM.rubble(wall), stoneM = MM.stone('#d8d0c4'), woodD = MAT.wood('dark'), slateM = MM.slate();
  const dx = w * door - w / 2 + 0.5, two = h >= 4.6;
  // plinth and its capping course
  k.add(rbox(w + 0.36, 1.15, d + 0.36, 0.06), MM.rubble('#a89e90'), 0, f - 0.6, 0);
  k.add(rbox(w + 0.44, 0.1, d + 0.44, 0.03), stoneM, 0, f - 0.03, 0);
  // openings per face (face frame: x along the wall, y up from the floor, z out of the wall)
  const winY = 0.95, win = (x, y = winY, ww = 0.66, hh = 0.76) => ({ x, y, w: ww, h: hh });
  const F = [{ x: dx, y: 0, w: 1.0, h: 2.05, door: true }];
  for (const wx of [-w / 2 + 0.95, w / 2 - 0.95]) if (Math.abs(wx - dx) > 1.25) F.push(win(wx));
  if (two) { for (const wx of [-w / 4 - 0.2, w / 4 + 0.2]) if (!balcony || Math.abs(wx - dx) > 1.3) F.push(win(wx, 2.95)); if (balcony) F.push({ x: dx, y: 2.65, w: 0.9, h: 1.85, door: true, upper: true }); }
  const Bk = [win((r() - 0.5) * (w - 2.4), winY, 0.56, 0.62)];
  if (two) Bk.push(win(-Bk[0].x * 0.6, 2.95, 0.56, 0.62));
  const Sd = (s) => (lean === s ? [] : [win((r() - 0.5) * (d - 2.4), winY, 0.56, 0.66)]);
  const faces = [
    { holes: F, x: 0, z: d / 2, ry: 0, len: w, shutters: true },
    { holes: Bk, x: 0, z: -d / 2, ry: Math.PI, len: w, shutters: false },
    { holes: Sd(1), x: w / 2, z: 0, ry: Math.PI / 2, len: d - 2 * t, shutters: true },
    { holes: Sd(-1), x: -w / 2, z: 0, ry: -Math.PI / 2, len: d - 2 * t, shutters: true },
  ];
  for (const fc of faces) {
    const s = fc.ry, inX = -Math.sin(s) * t, inZ = -Math.cos(s) * t;
    k.add(panelGeo(fc.len, h, t, fc.holes.map((q) => ({ x: q.x, y: q.y, w: q.w, h: q.h })), 1.7), wallM, fc.x + inX, f, fc.z + inZ, s);
    k.at(fc.x, f, fc.z, s, () => {
      for (const q of fc.holes) {
        const ring = q.door ? 0.12 : 0.09;
        pv(k, frameGeo({ x: q.x, y: q.y, w: q.w, h: q.h }, ring, 0.09), trim, 0, 0, 0);
        k.add(box(q.w + 0.5, 0.16, 0.24), woodD, q.x, q.y + q.h + ring + 0.07, 0.04);
        if (q.door) {
          pv(k, rbox(q.w + 0.02, q.h + 0.01, 0.07, 0.015), doorC, q.x, q.y + q.h / 2, -t * 0.62);
          for (const yy of [0.45, q.h - 0.45]) k.add(box(q.w - 0.1, 0.06, 0.03), MAT.iron(), q.x, q.y + yy, -t * 0.62 + 0.05);
          k.add(sphere(0.045, 8, 6), MAT.brass(), q.x + q.w * 0.32, q.y + 1.0, -t * 0.62 + 0.06);
          if (!q.upper) k.add(rbox(q.w + 0.45, 0.32, 0.42, 0.04), stoneM, q.x, -0.17, 0.2);
        } else {
          k.add(box(q.w, q.h, 0.04), MM.glow(), q.x, q.y + q.h / 2, -t * 0.58);
          k.add(box(0.05, q.h, 0.05), woodD, q.x, q.y + q.h / 2, -t * 0.5);
          k.add(box(q.w, 0.05, 0.05), woodD, q.x, q.y + q.h * 0.55, -t * 0.5);
          k.add(box(q.w + 0.32, 0.08, 0.24), stoneM, q.x, q.y - 0.05, 0.08);
          k.add(box(q.w + 0.18, 0.06, 0.18), MM.snow(), q.x, q.y + 0.02, 0.1);
          if (fc.shutters) for (const sx of [-1, 1]) pv(k, box(q.w / 2 + 0.04, q.h + 0.06, 0.05), trim, q.x + sx * (q.w * 0.75 + 0.15), q.y + q.h / 2, 0.035, sx * -0.12);
        }
      }
    });
  }
  // corner quoins (big dressed stones, alternating), the timber band under the eaves
  const nq = Math.floor(h / 0.46);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (let i = 0; i < nq; i++) {
    const lx = i % 2 ? 0.62 : 0.36, lz = i % 2 ? 0.36 : 0.62;
    k.add(box(lx, 0.4, lz), stoneM, sx * (w / 2 - lx / 2 + 0.03), f + 0.22 + i * 0.46, sz * (d / 2 - lz / 2 + 0.03), 0, { jit: true });
  }
  for (const sz of [-1, 1]) k.add(rbox(w + 0.08, 0.2, 0.26, 0.02), woodD, 0, f + h - 0.1, sz * (d / 2 - 0.08));
  for (const sx of [-1, 1]) k.add(rbox(0.26, 0.2, d + 0.08, 0.02), woodD, sx * (w / 2 - 0.08), f + h - 0.1, 0);
  // the roof: two thick slate slabs on a ridge along x, snow on them, bargeboards, rafter tails, icicles
  const tp = Math.tan(pitch), cp = Math.cos(pitch), sp = Math.sin(pitch), th = 0.22;
  const run = d / 2 + ovE, yE = f + h + 0.06 - ovE * tp, yR = yE + run * tp, L = run / cp + 0.1, RW = w + 2 * ovG;
  for (const s of [-1, 1]) {
    const mz = s * run / 2, my = yE + run * tp / 2;
    k.add(rbox(RW, th, L, 0.05), slateM, 0, my + cp * th / 2, mz + s * sp * th / 2, 0, { rx: s * pitch });
    k.add(rbox(RW - 0.22, 0.17, L - 0.3, 0.07), MM.snow(), 0, my + cp * (th + 0.075) + sp * 0.1, mz + s * sp * (th + 0.075) - s * cp * 0.1, 0, { rx: s * pitch });
    for (const gx of [-1, 1]) k.add(box(0.08, 0.3, L), woodD, gx * (RW / 2 - 0.02), my + cp * 0.06, mz + s * sp * 0.06, 0, { rx: s * pitch });
    const c = (d / 2 - 0.3 + run) / 2, len = (ovE + 0.3) / cp;
    for (let x = -w / 2 + 0.2; x <= w / 2 - 0.15; x += 0.6) k.add(box(0.1, 0.12, len), woodD, x, yR - c * tp - cp * 0.07, s * c - s * sp * 0.07, 0, { rx: s * pitch });
    k.add(cyl(0.09, 0.09, RW - 0.4, 8), MM.snow(), 0, yE + th * cp + 0.06, s * (run - 0.12), 0, { rz: Math.PI / 2 });
    for (let x = -RW / 2 + 0.25; x < RW / 2 - 0.2; x += 0.28 + r() * 0.25) { const ln = 0.16 + r() * r() * 0.5; k.add(icicle(r2(ln)), MM.ice(), x, yE - ln / 2 + 0.02, s * (run + 0.01)); }
  }
  k.add(cyl(0.17, 0.17, RW - 0.15, 10), MM.snow(), 0, yR + th / cp + 0.03, 0, 0, { rz: Math.PI / 2 });
  // gables: plank cladding above the stone, on a sill beam
  const gab = cached(`gab${r2(d)},${r2(yR - f - h)}`, () => { const sh = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, yR - f - h)]); return new THREE.ExtrudeGeometry(sh, { depth: 0.3, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-0.15, 0, 0); });
  for (const s of [-1, 1]) k.add(gab, MAT.planks('honey'), s * (w / 2 - 0.17), f + h, 0);
  // chimney on the back slope, near one gable
  let smoke = null;
  if (chimney) {
    const side = r() < 0.5 ? -1 : 1, cx = side * (w / 2 - 0.95), cz = -d / 4, top = yR + 0.9, base = f + h - 0.3;
    k.add(rbox(0.62, top - base, 0.62, 0.04), MM.rubble('#b8ae9e'), cx, (top + base) / 2, cz);
    k.add(rbox(0.82, 0.08, 0.82, 0.02), slateM, cx, top + 0.04, cz);
    for (const [ax, az] of [[-0.24, -0.24], [0.24, 0.24]]) k.add(box(0.12, 0.16, 0.12), MM.rubble('#8a8276'), cx + ax, top + 0.16, cz + az);
    k.add(rbox(0.86, 0.08, 0.86, 0.03), slateM, cx, top + 0.28, cz);
    k.add(rbox(0.74, 0.08, 0.74, 0.04), MM.snow(), cx, top + 0.35, cz);
    smoke = [cx, top + 0.5, cz];
  }
  // the woodshed lean-to on a gable: posts, a plank back and side, a single-pitch roof, logs stacked to the front
  let leanBox = null;
  if (lean) {
    const s = lean, lw = 2.0, ld = d - 0.4, hb = f + h - 0.15, hf = f + h * 0.62, x0 = s * (w / 2), x1 = s * (w / 2 + lw), zc = -0.2;
    for (const zz of [zc - ld / 2 + 0.06, zc + ld / 2 - 0.06]) k.add(rbox(0.14, hf, 0.14, 0.02), woodD, x1 - s * 0.07, hf / 2, zz);
    k.add(rbox(lw, hb, 0.08, 0.02), MAT.planks('dark'), (x0 + x1) / 2, hb / 2, zc - ld / 2 + 0.04);
    k.add(rbox(0.08, hf, ld - 0.2, 0.02), MAT.planks('dark'), x1 - s * 0.04, hf / 2, zc);
    const q = Math.atan2(hb - hf, lw), rl = Math.hypot(lw + 0.35, (hb - hf) * (lw + 0.35) / lw);
    k.add(rbox(rl, 0.12, ld + 0.5, 0.03), MAT.planks('honey'), (x0 + x1) / 2 + s * 0.17, (hb + hf) / 2 + 0.04, zc, 0, { rz: -s * q });
    k.add(rbox(rl - 0.2, 0.12, ld + 0.3, 0.05), MM.snow(), (x0 + x1) / 2 + s * 0.17, (hb + hf) / 2 + 0.15, zc, 0, { rz: -s * q });
    for (let y = 0.1, row = 0; y < hf - 0.35; y += 0.2, row++) for (let x = 0.15 + (row % 2) * 0.1; x < lw - 0.15; x += 0.22) k.add(logGeo(0.1, 0.7), MM.logs(), s * (w / 2 + x), y, zc + ld / 2 - 0.45 - (row % 3) * 0.03);
    leanBox = { lx: s * (w / 2 + lw / 2), lz: zc, hw: lw / 2 + 0.05, hd: ld / 2 + 0.05, top: hb };
  }
  // the balcony over the door: plank deck on brackets, railing, a cloth over the rail
  if (balcony && two) {
    const bw = Math.min(2.8, w - 1.0), bx = Math.max(-w / 2 + bw / 2 + 0.3, Math.min(w / 2 - bw / 2 - 0.3, dx)), dy = f + 2.55, bd = 1.0, z0 = d / 2;
    k.add(rbox(bw, 0.1, bd, 0.02), MAT.planks('honey'), bx, dy, z0 + bd / 2);
    for (const x of [bx - bw / 2 + 0.15, bx, bx + bw / 2 - 0.15]) {
      k.add(box(0.12, 0.14, bd), woodD, x, dy - 0.12, z0 + bd / 2);
      const ln = Math.hypot(0.85, 0.65); k.add(box(0.1, 0.1, ln), woodD, x, dy - 0.5, z0 + 0.43, 0, { rx: -Math.atan2(0.65, 0.85) });
    }
    const ry = dy + 0.05;
    for (let x = bx - bw / 2 + 0.05; x <= bx + bw / 2 - 0.04; x += 0.17) k.add(box(0.045, 0.85, 0.045), MAT.wood('honey'), x, ry + 0.43, z0 + bd - 0.05);
    for (const sx of [-1, 1]) for (let z = z0 + 0.15; z < z0 + bd - 0.1; z += 0.17) k.add(box(0.045, 0.85, 0.045), MAT.wood('honey'), bx + sx * (bw / 2 - 0.05), ry + 0.43, z);
    pv(k, rbox(bw + 0.06, 0.07, 0.1, 0.02), trim, bx, ry + 0.88, z0 + bd - 0.05);
    for (const sx of [-1, 1]) pv(k, rbox(0.1, 0.07, bd, 0.02), trim, bx + sx * (bw / 2 - 0.05), ry + 0.88, z0 + bd / 2);
    k.add(rbox(bw - 0.1, 0.06, bd - 0.1, 0.03), MM.snow(), bx, dy + 0.08, z0 + bd / 2 + 0.02);
    cl(k, rbox(0.62, 0.5, 0.03, 0.01), ['#d84a3a', '#3a7ac8', '#e8c040'][seed % 3], bx - bw / 4, ry + 0.66, z0 + bd + 0.01, 0, { rx: 0.08 });
    cl(k, rbox(0.42, 0.36, 0.03, 0.01), '#f4efe2', bx + bw / 4, ry + 0.73, z0 + bd + 0.01, 0, { rx: 0.06 });
  }
  // a wall lantern beside the door, pots on a rail by it
  {
    const lx = dx + (dx > 0 ? -0.95 : 0.95), y = f + 2.25, z = d / 2;
    k.add(box(0.05, 0.05, 0.36), MAT.iron(), lx, y + 0.22, z + 0.18);
    k.add(rbox(0.17, 0.22, 0.17, 0.02), MM.glow(), lx, y, z + 0.34);
    k.add(cyl(0.02, 0.15, 0.12, 4), MAT.iron(), lx, y + 0.17, z + 0.34, Math.PI / 4);
    k.add(box(0.2, 0.03, 0.2), MAT.iron(), lx, y - 0.12, z + 0.34);
    if (pots) {
      const px = dx + (dx > 0 ? -1.9 : 1.9);
      k.add(cyl(0.025, 0.025, 1.0, 6), MAT.iron(), px, f + 1.75, z + 0.12, 0, { rz: Math.PI / 2 });
      [[-0.32, 0.13, MAT.copper()], [0.0, 0.1, MAT.iron()], [0.3, 0.12, MAT.copper()]].forEach(([ox, pr, m]) => {
        k.add(box(0.012, 0.18, 0.012), MAT.iron(), px + ox, f + 1.66, z + 0.12);
        k.add(lathe([[0.001, 0], [pr * 0.8, 0], [pr, pr * 0.5], [pr * 0.95, pr * 1.1], [pr * 1.02, pr * 1.18], [0.001, pr * 1.18]], 12), m, px + ox, f + 1.3, z + 0.14);
      });
    }
  }
  // snow banked against the back wall and a gable
  drift(k, (r() - 0.5) * w * 0.3, -0.05, -d / 2 - 0.35, w * 0.8, 0.55 + r() * 0.2, 1.3, 0, seed);
  drift(k, (lean === 1 ? -1 : 1) * (w / 2 + 0.3), -0.05, -d / 4, 1.1, 0.4, d * 0.7, 0, seed + 1);
  return { hw: w / 2 + 0.2, hd: d / 2 + 0.2, top: yR + 0.6, door: { lx: dx, lz: d / 2 + 0.9 }, smoke, lean: leanBox, ridge: { hx: RW / 2, y: yR + th / cp } };
}

// ================================================================ dry-stone wall along a polyline of [x, y, z] (y = ground there)
// stepped segments of rubble with a batter, lumpy coping stones and snow on top. → colliders [{x,z,hw,hd,rot,top}]
export function dryWall(k, pts, { h = 1.0, bw = 0.7, tw = 0.48, seed = 1, coping = 'stones', step = 1.7, mat = null } = {}) {
  const r = rng(seed * 13 + 1), out = [], wm = mat || MM.rubble('#d8ccb8');
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay, az] = pts[i], [bx, by, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / step));
    for (let j = 0; j < n; j++) {
      const t0 = j / n, t1 = (j + 1) / n, x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
      const sl = L / n + 0.12, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, gy = Math.min(ay + (by - ay) * t0, ay + (by - ay) * t1) - 0.3;
      const hh = h + 0.3 + (r() - 0.5) * 0.22, ry = Math.atan2(-(bz - az), bx - ax);
      k.add(trapGeo(sl, r2(hh), bw, tw), wm, cx, gy, cz, ry);
      k.at(cx, gy + hh, cz, ry, () => {
        if (coping === 'slate') { k.add(rbox(sl + 0.04, 0.1, tw + 0.2, 0.02), MM.slate(), 0, 0.04, 0); k.add(rbox(sl, 0.1, tw + 0.1, 0.05), MM.snow(), 0, 0.12, 0); }
        else {
          for (let u = -sl / 2 + 0.22; u < sl / 2 - 0.1; u += 0.38 + r() * 0.12) k.add(lump(Math.floor(r() * 5)), MAT.rubble('grey'), u, 0.06, (r() - 0.5) * 0.08, r() * 6, { sx: 0.2 + r() * 0.06, sy: 0.16, sz: tw * 0.5 });
          k.add(rbox(sl - 0.1, 0.1, tw + 0.04, 0.05), MM.snow(), 0, 0.15 + r() * 0.03, 0);
        }
      });
      out.push({ x: cx, z: cz, hw: sl / 2, hd: bw / 2, rot: ry, top: gy + hh + 0.1 });
    }
  }
  return out;
}

// ================================================================ fence of posts and two rails along [x, y, z] points (a pen)
export function fence(k, pts, { h = 1.1, gap = -1 } = {}) {
  const wood = MAT.wood('dark'), out = [];
  for (let i = 0; i < pts.length; i++) {
    const [x, y, z] = pts[i];
    k.add(box(0.12, h + 0.25, 0.12), wood, x, y + (h - 0.25) / 2, z, (i * 0.7) % 1);
    k.add(sphere(0.08, 6, 3), MM.snow(), x, y + h + 0.0, z, 0, { sy: 0.5 });
    if (i === pts.length - 1 || i === gap) continue;
    const [bx, by, bz] = pts[i + 1], L = Math.hypot(bx - x, bz - z), ry = Math.atan2(-(bz - z), bx - x), dy = by - y;
    for (const fy of [0.45, 0.9]) k.add(box(L, 0.08, 0.05), MAT.wood('honey'), (x + bx) / 2, (y + by) / 2 + fy * h, (z + bz) / 2, ry, { rz: Math.atan2(dy, L) });
    k.add(box(L - 0.1, 0.04, 0.08), MM.snow(), (x + bx) / 2, (y + by) / 2 + 0.9 * h + 0.06, (z + bz) / 2, ry, { rz: Math.atan2(dy, L) });
    out.push({ x: (x + bx) / 2, z: (z + bz) / 2, hw: L / 2, hd: 0.08, rot: ry, top: Math.max(y, by) + h, seeThrough: true });
  }
  return out;
}

// ================================================================ small things of mountain life
// a log stack between two stakes, a plank lid with snow on it; log ends to +z
export function woodpile(k, { w = 1.6, h = 1.0, d = 0.6, lid = true } = {}) {
  const wood = MAT.wood('dark');
  for (let y = 0.09, row = 0; y < h - 0.05; y += 0.17, row++) for (let x = -w / 2 + 0.1 + (row % 2) * 0.08; x < w / 2 - 0.08; x += 0.19) k.add(logGeo(0.085, r2(d)), MM.logs(), x, y, (row % 3) * 0.03 - 0.03);
  for (const sx of [-1, 1]) k.add(box(0.1, h + 0.25, 0.1), wood, sx * (w / 2 + 0.03), (h + 0.25) / 2, 0);
  if (lid) { k.add(rbox(w + 0.35, 0.06, d + 0.3, 0.02), MAT.planks('dark'), 0, h + 0.25, -0.03, 0, { rx: -0.12 }); k.add(rbox(w + 0.2, 0.1, d + 0.15, 0.05), MM.snow(), 0, h + 0.33, -0.03, 0, { rx: -0.12 }); }
  else k.add(rbox(w - 0.1, 0.08, d - 0.1, 0.04), MM.snow(), 0, h + 0.02, 0);
  return { hw: w / 2 + 0.1, hd: d / 2 + 0.08, top: h + 0.35 };
}
// a wooden sledge with curled runners and a bundle lashed on (front to +z)
export function sledge(k, { load = true, seed = 1 } = {}) {
  const wood = MAT.wood('honey'), dark = MAT.wood('dark');
  for (const sx of [-1, 1]) {
    k.add(pipe([[sx * 0.3, 0.04, -0.75], [sx * 0.3, 0.04, 0.55], [sx * 0.3, 0.12, 0.82], [sx * 0.3, 0.32, 0.86]], 0.03, 0.12, 6), dark, 0, 0, 0);
    for (const z of [-0.55, 0.0, 0.45]) k.add(box(0.05, 0.22, 0.05), dark, sx * 0.3, 0.15, z);
  }
  for (let i = 0; i < 6; i++) k.add(box(0.72, 0.035, 0.17), wood, 0, 0.27, -0.6 + i * 0.22);
  k.add(box(0.72, 0.05, 0.05), dark, 0, 0.36, 0.76);
  if (load) {
    const c = ['#c8452f', '#2f6a9a', '#3f8a4a'][seed % 3];
    cl(k, sphere(0.3, 10, 7), '#d8c8a0', 0, 0.48, -0.2, 0, { sx: 1.0, sy: 0.6, sz: 1.3 });
    cl(k, rbox(0.62, 0.22, 0.5, 0.08), c, 0, 0.42, 0.32);
    k.add(torus(0.36, 0.015, 4, 16), MAT.cloth('#c8b890'), 0, 0.48, -0.2, 0, { rx: Math.PI / 2, sz: 1.4 });
  }
  return { hw: 0.4, hd: 0.9, top: 0.7 };
}
// a stone trough frozen over, fed by a wooden spout on a post (an icicle runs from spout to ice)
export function trough(k, { len = 1.8, spout = true } = {}) {
  const st = MM.stone('#d0c8bc'), hh = 0.62;
  k.add(rbox(len, 0.12, 0.7, 0.03), st, 0, 0.06, 0);
  for (const sz of [-1, 1]) k.add(rbox(len, hh, 0.14, 0.03), st, 0, hh / 2, sz * 0.28);
  for (const sx of [-1, 1]) k.add(rbox(0.14, hh, 0.44, 0.03), st, sx * (len / 2 - 0.07), hh / 2, 0);
  k.add(box(len - 0.26, 0.05, 0.44), MM.ice(), 0, hh - 0.12, 0);
  k.add(rbox(len * 0.5, 0.1, 0.3, 0.05), MM.snow(), -len * 0.18, hh + 0.02, 0.22);
  for (let i = 0; i < 6; i++) k.add(icicle(r2(0.12 + (i % 3) * 0.07)), MM.ice(), -len / 2 + 0.2 + i * (len - 0.4) / 5, hh - 0.04, 0.37);
  if (spout) {
    const x = len / 2 + 0.25;
    k.add(cyl(0.09, 0.11, 1.5, 7), MAT.wood('dark'), x, 0.75, -0.1);
    k.add(box(0.7, 0.1, 0.12), MAT.wood('honey'), x - 0.35, 1.15, -0.1, 0, { rz: -0.15 });
    k.add(cyl(0.05, 0.03, 0.55, 6), MM.ice(), len / 2 - 0.2, 0.88, -0.1);
    k.add(sphere(0.1, 8, 4), MM.snow(), x, 1.5, -0.1, 0, { sy: 0.5 });
  }
  return { hw: len / 2 + (spout ? 0.4 : 0.05), hd: 0.38, top: hh + 0.1 };
}
// a hay rack: a V of slats on four legs, hay heaped in it
export function hayRack(k, { w = 1.6 } = {}) {
  const wood = MAT.wood('dark');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(box(0.08, 1.05, 0.08), wood, sx * (w / 2 - 0.05), 0.52, sz * 0.3);
  for (const sz of [-1, 1]) { k.add(box(w, 0.07, 0.07), wood, 0, 1.02, sz * 0.42); k.add(box(w, 0.07, 0.07), wood, 0, 0.5, sz * 0.1); }
  for (let x = -w / 2 + 0.12; x < w / 2 - 0.05; x += 0.16) for (const sz of [-1, 1]) k.add(box(0.035, 0.6, 0.035), MAT.wood('honey'), x, 0.76, sz * 0.26, 0, { rx: sz * 0.55 });
  k.add(lump(3), MM.hay(), 0, 0.92, 0, 0.4, { sx: w * 0.45, sy: 0.34, sz: 0.36 });
  k.add(lump(4), MM.hay(), w * 0.3, 0.06, 0.55, 1.3, { sx: 0.4, sy: 0.18, sz: 0.3 });
  return { hw: w / 2 + 0.05, hd: 0.48, top: 1.2 };
}
// a drying rack: two A-frames and a pole, cloths and fleeces hung over it
export function dryingRack(k, { w = 2.6, seed = 1 } = {}) {
  const wood = MAT.wood('dark'), r = rng(seed + 9), hh = 1.9;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const ln = Math.hypot(hh, 0.5); k.add(box(0.08, ln, 0.08), wood, sx * w / 2, hh / 2, sz * 0.25, 0, { rx: -sz * Math.atan2(0.5, hh) }); }
  k.add(cyl(0.045, 0.045, w + 0.4, 7), MAT.wood('honey'), 0, hh - 0.04, 0, 0, { rz: Math.PI / 2 });
  const cols = ['#d84a3a', '#e8c040', '#3a7ac8', '#f4efe2', '#3f8a4a', '#8a5a9a'];
  for (let x = -w / 2 + 0.4, i = 0; x < w / 2 - 0.3; x += 0.55 + r() * 0.2, i++) {
    const ww = 0.38 + r() * 0.2, hl = 0.55 + r() * 0.35;
    if (i % 3 === 2) { cl(k, rbox(ww + 0.1, hl * 0.8, 0.06, 0.04), '#e8dcc4', x, hh - hl * 0.4, 0.03, (r() - 0.5) * 0.3); continue; }   // a fleece
    for (const sz of [-1, 1]) cl(k, rbox(ww, hl, 0.02, 0.01), cols[(i + seed) % cols.length], x, hh - hl / 2 - 0.02, sz * 0.04, 0, { rx: sz * 0.08 });
  }
  k.add(box(w + 0.3, 0.05, 0.12), MM.snow(), 0, hh + 0.03, 0);
  return { hw: w / 2 + 0.15, hd: 0.4, top: hh };
}
// a lantern on a post: stone foot, post, an arm to +x, a hanging lantern
export function lanternPost(k, { h = 2.5 } = {}) {
  const wood = MAT.wood('dark');
  k.add(rbox(0.38, 0.22, 0.38, 0.05), MM.stone('#c8c0b4'), 0, 0.11, 0);
  k.add(box(0.13, h, 0.13), wood, 0, h / 2 + 0.1, 0);
  k.add(box(0.6, 0.09, 0.09), wood, 0.25, h - 0.05, 0);
  k.add(box(0.06, 0.4, 0.06), wood, 0.12, h - 0.25, 0, 0, { rz: 0.8 });
  k.add(box(0.015, 0.2, 0.015), MAT.iron(), 0.48, h - 0.2, 0);
  k.add(rbox(0.2, 0.26, 0.2, 0.02), MM.glow(), 0.48, h - 0.44, 0);
  k.add(cyl(0.02, 0.17, 0.13, 4), MAT.iron(), 0.48, h - 0.26, 0, Math.PI / 4);
  k.add(box(0.22, 0.03, 0.22), MAT.iron(), 0.48, h - 0.58, 0);
  k.add(sphere(0.09, 6, 3), MM.snow(), 0.48, h - 0.2, 0, 0, { sy: 0.45 });
  k.add(box(0.5, 0.05, 0.12), MM.snow(), 0.25, h + 0.01, 0);
  return { r: 0.2, top: h };
}
// a fire pit: a ring of stones, embers, half-burnt logs, a tripod with a pot hanging from it
export function firePit(k, { seed = 1 } = {}) {
  const r = rng(seed + 21);
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; k.add(lump(i % 5), MAT.rubble('grey'), Math.cos(a) * 0.62, 0.08, Math.sin(a) * 0.62, r() * 6, { sx: 0.2, sy: 0.17, sz: 0.17 }); }
  k.add(cyl(0.5, 0.52, 0.05, 12), MM.ember(), 0, 0.03, 0);
  for (let i = 0; i < 4; i++) k.add(logGeo(0.07, 0.75), MM.logs(), 0, 0.1, 0, i * 0.8 + 0.3, { rx: 0.12 });
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.4, ln = 1.75; k.add(box(0.06, ln, 0.06), MAT.wood('dark'), Math.cos(a) * 0.38, ln / 2 - 0.05, Math.sin(a) * 0.38, 0, { rx: Math.sin(a) * 0.24, rz: -Math.cos(a) * 0.24 }); }
  k.add(box(0.012, 0.6, 0.012), MAT.iron(), 0, 1.25, 0);
  k.add(lathe([[0.001, 0], [0.13, 0], [0.2, 0.08], [0.2, 0.24], [0.17, 0.29], [0.001, 0.29]], 12), MAT.iron(), 0, 0.68, 0);
  k.add(torus(0.17, 0.012, 4, 14, Math.PI), MAT.iron(), 0, 0.95, 0);
  return { r: 0.75, top: 1.6 };
}
// a marker flag on a thin striped stake; the pennant flies toward +x
export function markerFlag(k, { color = '#e8642a', h = 1.7 } = {}) {
  pv(k, cyl(0.03, 0.035, h, 6), '#f4efe2', 0, h / 2, 0);
  for (const y of [0.25, 0.75]) pv(k, cyl(0.036, 0.036, 0.2, 6), color, 0, y, 0);
  pv(k, slab('mm-pennant', (s) => { s.moveTo(0, 0); s.lineTo(0.62, -0.17); s.lineTo(0, -0.36); s.lineTo(0, 0); }, 0.015, 0.004), color, 0.02, h - 0.02, 0, 0, { rz: -0.1 });
  return { r: 0.1, top: h };
}
// a windsock: a white mast on a stone foot, a striped sock on a ring, blowing toward +x and drooping a little
export function windsock(k, { h = 4.4 } = {}) {
  k.add(rbox(0.5, 0.3, 0.5, 0.05), MM.stone('#c8c0b4'), 0, 0.15, 0);
  pv(k, cyl(0.05, 0.07, h, 8), '#eceef2', 0, h / 2 + 0.25, 0);
  pv(k, sphere(0.07, 8, 6), '#e8642a', 0, h + 0.3, 0);
  k.at(0.05, h + 0.05, 0, 0, () => {
    k.add(torus(0.3, 0.02, 5, 16), MAT.iron(), 0.02, 0, 0, Math.PI / 2);
    for (let i = 0; i < 5; i++) { const r0 = 0.3 - i * 0.04, r1 = r0 - 0.04, len = 0.36, x = 0.02 + i * len * 0.97 + len / 2; pv(k, cyl(r1, r0, len, 12), i % 2 ? '#f4efe2' : '#e8642a', x, -i * i * 0.012 - i * 0.02, 0, 0, { rz: -Math.PI / 2 - 0.08 - i * 0.03 }); }
  });
  return { r: 0.3, top: h + 0.3 };
}
// a bell on a post (to call the lift up and down): post, a little roof, a bronze bell, a pull rope
export function bellPost(k, { h = 2.6 } = {}) {
  const wood = MAT.wood('dark');
  k.add(rbox(0.4, 0.2, 0.4, 0.05), MM.stone('#c8c0b4'), 0, 0.1, 0);
  k.add(box(0.14, h, 0.14), wood, 0, h / 2, 0);
  k.add(box(0.8, 0.12, 0.12), wood, 0.3, h - 0.1, 0);
  k.add(lathe([[0.001, 0.0], [0.17, 0.0], [0.16, 0.04], [0.12, 0.14], [0.1, 0.24], [0.06, 0.29], [0.001, 0.3]], 14), MAT.copper(), 0.55, h - 0.5, 0);
  k.add(box(0.015, 1.3, 0.015), MAT.cloth('#c8b890'), 0.55, h - 1.25, 0.02);
  for (const s of [-1, 1]) k.add(rbox(0.9, 0.05, 0.3, 0.02), MM.slate(), 0.3, h + 0.08, s * 0.1, 0, { rx: s * 0.45 });
  k.add(box(0.85, 0.06, 0.4), MM.snow(), 0.3, h + 0.16, 0);
  return { r: 0.2, top: h };
}
// a spoked wheel (pulleys, the winch's gear), axis along x
export function wheel(k, rad, mat, x, y, z, { spokes = 6, rim = 0.06, w = 0.12 } = {}) {
  k.add(torus(rad, rim, 6, 24), mat, x, y, z, Math.PI / 2, { sz: w / rim / 2 });
  k.add(cyl(rad * 0.18, rad * 0.18, w + 0.06, 10), mat, x, y, z, 0, { rz: Math.PI / 2 });
  for (let i = 0; i < spokes; i++) k.add(box(0.05, rad * 2 - 0.04, 0.05), mat, x, y, z, 0, { rx: (i / spokes) * Math.PI });
}
// the rope lift's winch: a drum wound with rope between two trestles, a gear wheel and a crank, a brake lever
export function liftWinch(k) {
  const wood = MAT.wood('dark'), honey = MAT.wood('honey');
  k.add(rbox(2.1, 0.18, 1.3, 0.03), MAT.planks('dark'), 0, 0.09, 0);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) k.add(box(0.14, 1.25, 0.14), wood, sx * 0.8, 0.72, sz * 0.38, 0, { rx: -sz * 0.28 });
    k.add(box(0.16, 0.16, 0.95), wood, sx * 0.8, 0.3, 0);
    k.add(box(0.2, 0.2, 0.2), wood, sx * 0.8, 1.28, 0);
  }
  k.add(cyl(0.42, 0.42, 1.4, 16), honey, 0, 1.15, 0, 0, { rz: Math.PI / 2 });
  for (const sx of [-1, 1]) k.add(cyl(0.52, 0.52, 0.06, 16), wood, sx * 0.68, 1.15, 0, 0, { rz: Math.PI / 2 });
  for (let i = 0; i < 6; i++) k.add(torus(0.44, 0.03, 4, 18), MAT.cloth('#c8b08a'), -0.5 + i * 0.2, 1.15, 0, Math.PI / 2);
  wheel(k, 0.55, MAT.iron(), 1.0, 1.15, 0, { spokes: 5, rim: 0.05 });
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; k.add(box(0.1, 0.09, 0.09), MAT.iron(), 1.0, 1.15 + Math.sin(a) * 0.6, Math.cos(a) * 0.6, 0, { rx: -a }); }
  k.add(box(0.05, 0.45, 0.05), MAT.iron(), -1.0, 1.15 - 0.2, 0.0);
  k.add(cyl(0.035, 0.035, 0.35, 6), honey, -1.12, 0.95, 0, 0, { rz: Math.PI / 2 });
  k.add(box(0.08, 1.1, 0.08), MAT.iron(), 0.95, 0.65, -0.55, 0, { rx: 0.35 });
  k.add(sphere(0.07, 8, 6), MAT.flat('#c8302a', 0.5), 0.95, 1.18, -0.36);
  return { hw: 1.15, hd: 0.7, top: 1.7 };
}
// prayer wheels in a row under a slate lean-to (against a wall at −z): plinth, wheels on axles, posts
export function prayerWheels(k, { n = 5, sp = 0.62, roofH = 2.6 } = {}) {
  const w = n * sp + 0.4, wood = MAT.paint('#8a2a22', 0.6), d = 0.85;
  k.add(rbox(w, 0.5, d, 0.04), MM.stone('#d8d0c4'), 0, 0.25, 0);
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + 0.2 + sp * (i + 0.5);
    k.add(cyl(0.025, 0.025, 1.5, 6), MAT.iron(), x, 1.25, 0.05);
    k.add(lathe([[0.001, 0], [0.2, 0], [0.24, 0.05], [0.24, 0.62], [0.2, 0.67], [0.001, 0.67]], 16), MAT.brass(), x, 0.75, 0.05);
    pv(k, cyl(0.245, 0.245, 0.1, 16), i % 2 ? '#c8302a' : '#2f6a9a', x, 1.08, 0.05);
    k.add(lathe([[0.001, 0], [0.19, 0], [0.12, 0.08], [0.03, 0.14], [0.001, 0.2]], 12), MAT.brass(), x, 1.42, 0.05);
  }
  for (const y of [0.62, 1.95]) k.add(box(w, 0.1, 0.12), wood, 0, y, -0.25);
  for (const sx of [-1, 1]) k.add(cyl(0.09, 0.1, roofH, 8), wood, sx * (w / 2 - 0.08), roofH / 2, d / 2 - 0.1);
  k.add(box(w + 0.2, 0.16, 0.16), wood, 0, roofH - 0.05, d / 2 - 0.1);
  const q = 0.32, rl = d + 0.6;
  k.add(rbox(w + 0.5, 0.12, rl, 0.03), MM.slate(), 0, roofH + 0.18, d / 2 - 0.3, 0, { rx: q });
  k.add(rbox(w + 0.3, 0.12, rl - 0.2, 0.05), MM.snow(), 0, roofH + 0.29, d / 2 - 0.3, 0, { rx: q });
  for (let x = -w / 2; x < w / 2; x += 0.3) k.add(icicle(r2(0.14 + ((x * 7) % 0.2 + 0.2) * 0.4)), MM.ice(), x + 0.1, roofH + 0.0, d / 2 + 0.2);
  return { hw: w / 2 + 0.1, hd: d / 2 + 0.05, top: roofH + 0.5 };
}

// ================================================================ the monastery hall (front +z): plinth, whitewashed walls with a
// red timber band, a pillared porch with steps, two tiers of flared golden roofs, a chimney
export function monasteryHall(k, { w = 14, d = 9, h = 6 } = {}) {
  const plinthH = 1.0, f = 0.4, t = 0.5, red = MAT.paint('#8a2a22', 0.6), dark = '#3a2622';
  const wallM = MM.plaster(), stoneM = MM.stone('#d8d0c4');
  k.add(rbox(w + 0.6, plinthH + 0.6, d + 0.6, 0.06), MM.rubble('#c8bca8'), 0, f - (plinthH + 0.6) / 2, 0);
  k.add(rbox(w + 0.7, 0.12, d + 0.7, 0.03), stoneM, 0, f - 0.04, 0);
  const wy = (y, ww = 0.8, hh = 1.5) => ({ y, w: ww, h: hh });
  const front = [{ x: 0, y: 0, w: 2.2, h: 3.3, arch: true, door: true }];
  for (const x of [-4.8, -3.0, 3.0, 4.8]) front.push({ x, ...wy(3.6, 0.8, 1.3) });
  const back = [-4, 0, 4].map((x) => ({ x, ...wy(3.4) }));
  const side = [-2.2, 0.0, 2.2].map((x) => ({ x, ...wy(3.0) }));
  const faces = [{ holes: front, x: 0, z: d / 2, ry: 0, len: w }, { holes: back, x: 0, z: -d / 2, ry: Math.PI, len: w }, { holes: side, x: w / 2, z: 0, ry: Math.PI / 2, len: d - 2 * t }, { holes: side, x: -w / 2, z: 0, ry: -Math.PI / 2, len: d - 2 * t }];
  for (const fc of faces) {
    k.add(panelGeo(fc.len, h, t, fc.holes.map((q) => ({ x: q.x, y: q.y, w: q.w, h: q.h, arch: q.arch })), 2), wallM, fc.x - Math.sin(fc.ry) * t, f, fc.z - Math.cos(fc.ry) * t, fc.ry);
    k.at(fc.x, f, fc.z, fc.ry, () => {
      for (const q of fc.holes) {
        const o = { x: q.x, y: q.y, w: q.w, h: q.h, arch: q.arch };
        if (q.door) {
          k.add(frameGeo(o, 0.3, 0.16), stoneM, 0, 0, 0);
          for (const sx of [-1, 1]) {
            pv(k, rbox(q.w / 2, q.h - 0.5, 0.08, 0.015), '#a8302a', q.x + sx * q.w / 4, (q.h - 0.5) / 2, -t * 0.6);
            for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) k.add(sphere(0.035, 6, 4), MAT.brass(), q.x + sx * (0.2 + i * 0.3), 0.35 + j * 0.65, -t * 0.6 + 0.05);
            k.add(torus(0.09, 0.015, 4, 12), MAT.brass(), q.x + sx * 0.18, 1.3, -t * 0.6 + 0.07);
          }
          k.add(fillGeoArch(o), MM.dark(), 0, 0, -t * 0.6 - 0.03);
        } else {
          pv(k, frameGeo(o, 0.14, 0.1), dark, 0, 0, 0);
          pv(k, slab('mm-winhood' + q.w, (s) => { s.moveTo(-q.w / 2 - 0.3, 0); s.lineTo(q.w / 2 + 0.3, 0); s.lineTo(q.w / 2 + 0.18, 0.18); s.lineTo(-q.w / 2 - 0.18, 0.18); s.lineTo(-q.w / 2 - 0.3, 0); }, 0.3, 0.01), '#8a2a22', q.x, q.y + q.h + 0.12, 0.08);
          k.add(rbox(q.w, q.h, 0.04, 0.005), MM.glow(), q.x, q.y + q.h / 2, -t * 0.6);
          k.add(box(0.05, q.h, 0.05), MAT.wood('dark'), q.x, q.y + q.h / 2, -t * 0.5);
          k.add(rbox(q.w + 0.3, 0.08, 0.24, 0.02), stoneM, q.x, q.y - 0.04, 0.08);
        }
      }
    });
  }
  // the red timber band under the eaves with gilded beam ends
  const by = f + h + 0.3;
  for (const s of [-1, 1]) {
    k.add(rbox(w + 0.5, 0.6, 0.3, 0.03), red, 0, by, s * (d / 2 + 0.1));
    k.add(rbox(0.3, 0.6, d + 0.5, 0.03), red, s * (w / 2 + 0.1), by, 0);
    for (let x = -w / 2 + 0.4; x < w / 2; x += 0.7) k.add(cyl(0.09, 0.09, 0.08, 10), MAT.brass(), x, by, s * (d / 2 + 0.29), 0, { rx: Math.PI / 2 });
  }
  // two tiers of golden roofs; an upper hall between them
  const r1 = by + 0.3;
  k.add(rbox(w + 1.0, 0.25, d + 1.0, 0.04), red, 0, r1 - 0.05, 0);
  curvedRoof(k, w / 2 + 1.1, d / 2 + 1.1, 2.7, MM.gold(), 0, r1 + 0.1, 0);
  const uw = 6.0, ud = 4.0, uy = r1 + 1.2, uh = 2.2;
  k.add(rbox(uw, uh, ud, 0.04), wallM, 0, uy + uh / 2, 0);
  for (const x of [-1.6, 0, 1.6]) { k.add(rbox(0.6, 0.8, 0.06, 0.01), MM.glow(), x, uy + 1.1, ud / 2 + 0.01); pv(k, frameGeo({ x, y: uy + 0.7, w: 0.6, h: 0.8 }, 0.1, 0.06), dark, 0, 0, ud / 2); }
  k.add(rbox(uw + 0.3, 0.4, ud + 0.3, 0.03), red, 0, uy + uh + 0.15, 0);
  curvedRoof(k, uw / 2 + 0.9, ud / 2 + 0.9, 1.9, MM.gold(), 0, uy + uh + 0.4, 0);
  const fy = uy + uh + 0.4 + 1.85;
  k.add(lathe([[0.001, 0], [0.28, 0], [0.3, 0.1], [0.18, 0.25], [0.24, 0.45], [0.12, 0.7], [0.08, 0.95], [0.12, 1.05], [0.04, 1.2], [0.001, 1.45]], 14), MAT.brass(), 0, fy, 0);
  // the flared roof corners turned up a little more: gilded tips
  for (const [A, B, y] of [[w / 2 + 1.1, d / 2 + 1.1, r1 + 0.05], [uw / 2 + 0.9, ud / 2 + 0.9, uy + uh + 0.35]]) for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.add(cyl(0.02, 0.1, 0.5, 5), MAT.brass(), sx * A * 1.02, y + 0.12, sz * B * 1.02, 0, { rx: sz * 0.7, rz: -sx * 0.7 });
  // the porch: a stone deck with steps, two red pillars with painted capitals, a beam, a small golden roof
  const pz = d / 2 + 1.0;
  k.add(rbox(6.0, f + 0.3, 2.0, 0.04), stoneM, 0, (f - 0.3) / 2, pz);
  k.add(rbox(4.0, 0.22, 0.42, 0.03), stoneM, 0, 0.11 - 0.05, pz + 1.2);
  for (const sx of [-1, 1]) {
    const x = sx * 2.2;
    k.add(rbox(0.6, 0.3, 0.6, 0.04), stoneM, x, f + 0.15, pz + 0.55);
    pv(k, cyl(0.2, 0.22, 3.2, 12), '#a8302a', x, f + 0.3 + 1.6, pz + 0.55);
    pv(k, rbox(0.7, 0.18, 0.55, 0.03), '#2f6a9a', x, f + 3.55, pz + 0.55);
    pv(k, rbox(0.95, 0.18, 0.55, 0.03), '#2f8a5a', x, f + 3.73, pz + 0.55);
  }
  k.add(rbox(6.0, 0.4, 0.45, 0.03), red, 0, f + 4.0, pz + 0.55);
  curvedRoof(k, 3.5, 1.6, 1.0, MM.gold(), 0, f + 4.25, pz + 0.1);
  // a chimney through the back of the lower roof
  const cx = 4.2, cz = -2.2, ctop = r1 + 2.4;
  k.add(rbox(0.8, ctop - by, 0.8, 0.04), MM.rubble('#c8bca8'), cx, (ctop + by) / 2, cz);
  k.add(rbox(1.0, 0.1, 1.0, 0.02), MM.slate(), cx, ctop + 0.05, cz);
  return { hw: w / 2 + 0.3, hd: d / 2 + 0.3, porch: { lz: pz, hw: 3.0, hd: 1.0, top: f }, pillars: [[-2.2, pz + 0.55], [2.2, pz + 0.55]], smoke: [cx, ctop + 0.3, cz], top: fy + 1.4 };
}
// an arched opening filled flat (dark behind a door, glass in a window), facing +z
const fillGeoArch = (o) => cached('mm-archfill' + JSON.stringify(o), () => {
  const s = new THREE.Shape(), hw = o.w / 2, yc = o.y + o.h - hw;
  s.moveTo(o.x - hw, o.y); s.lineTo(o.x - hw, yc); s.absarc(o.x, yc, hw, Math.PI, 0, true); s.lineTo(o.x + hw, o.y); s.lineTo(o.x - hw, o.y);
  return new THREE.ShapeGeometry(s, 12);
});
// the monastery's gate in a gap of `gap` metres: two pillars, a red beam, a small golden roof, two leaves open inward (−z)
export function monasteryGate(k, { gap = 4 } = {}) {
  const st = MM.rubble('#d8ccb8'), red = MAT.paint('#8a2a22', 0.6), ph = 3.0, px = gap / 2 + 0.35;
  for (const sx of [-1, 1]) {
    k.add(rbox(0.9, ph, 0.9, 0.05), st, sx * px, ph / 2 - 0.2, 0);
    k.add(rbox(1.1, 0.16, 1.1, 0.03), MM.stone('#d8d0c4'), sx * px, ph - 0.12, 0);
    // the leaf, opened right back into the yard
    k.at(sx * (gap / 2 - 0.12), 0, -0.48, 0, () => {
      pv(k, rbox(0.1, 2.6, gap / 2 - 0.3, 0.02), '#a8302a', 0, 1.35, -(gap / 2 - 0.3) / 2);
      for (const y of [0.5, 1.4, 2.3]) k.add(box(0.13, 0.08, gap / 2 - 0.4), MAT.iron(), 0, y, -(gap / 2 - 0.3) / 2);
      k.add(torus(0.1, 0.015, 4, 12), MAT.brass(), -sx * 0.07, 1.3, -(gap / 2 - 0.5), Math.PI / 2);
    });
  }
  k.add(rbox(gap + 2.2, 0.4, 0.55, 0.03), red, 0, ph + 0.15, 0);
  for (let x = -gap / 2 - 0.6; x <= gap / 2 + 0.6; x += 0.6) k.add(cyl(0.08, 0.08, 0.06, 10), MAT.brass(), x, ph + 0.15, 0.29, 0, { rx: Math.PI / 2 });
  for (const sx of [-1, 1]) { curvedRoof(k, 0.75, 0.75, 0.75, MM.gold(), sx * px, ph + 0.4, 0); k.add(sphere(0.1, 8, 6), MAT.brass(), sx * px, ph + 1.2, 0); }
  k.add(rbox(gap + 0.4, 0.1, 1.0, 0.03), MM.stone('#d8d0c4'), 0, 0.02, 0);
  return { pillars: [[-px, 0], [px, 0]], leaves: [[-(gap / 2 - 0.12), -(gap / 2 - 0.3) / 2 - 0.48, gap / 2 - 0.3], [gap / 2 - 0.12, -(gap / 2 - 0.3) / 2 - 0.48, gap / 2 - 0.3]] };
}

// ================================================================ the observatory: a stone drum with buttresses, a balcony round
// the dome's foot, a ribbed verdigris dome with an open slit and the telescope in it, a framed door with a canopy (+z)
export function observatory(k, { R = 5.2, H = 5.5, skip: away = [] } = {}) {
  const st = MM.stone('#e4dccc'), rub = MM.rubble('#c8bca8'), cop = M('mm-verd', () => std({ map: textures().brass, color: '#62b8a6', roughness: 0.45, metalness: 0.5 }, 1.6)), bronze = MAT.copper();
  k.add(kcyl(R + 0.4, R + 0.48, 1.2, 40, 1.7), MM.rubbleUV('#c8bca8'), 0, -0.2, 0);
  k.add(kcyl(R - 0.05, R + 0.18, H, 40, 1.6), MM.stoneUV('#e4dccc'), 0, 0.4 + H / 2, 0);
  for (const [y, rr] of [[2.6, R + 0.05], [H + 0.2, R - 0.02]]) k.add(lath([[rr - 0.3, 0], [rr + 0.12, 0], [rr + 0.18, 0.12], [rr + 0.1, 0.26], [rr - 0.3, 0.26]], 40), MM.stone('#cfc6b6'), 0, y, 0);
  // buttresses (not in front of the door), windows between them
  const ang = (a) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))), butt = [], skip = (a) => ang(a) < 0.5 || away.some((b) => ang(a - b) < 0.4);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    if (skip(a)) continue;
    const x = Math.sin(a) * (R + 0.15), z = Math.cos(a) * (R + 0.15);
    k.add(trapGeo(0.7, 4.2, 1.3, 0.35), rub, x, -0.2, z, a, { });
    k.add(rbox(0.8, 0.12, 0.6, 0.03), MM.stone('#cfc6b6'), Math.sin(a) * (R + 0.3), 4.0, Math.cos(a) * (R + 0.3), a);
    butt.push([Math.sin(a) * (R + 0.55), Math.cos(a) * (R + 0.55), a]);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    if (skip(a)) continue;
    k.at(Math.sin(a) * (R - 0.02), 0.4, Math.cos(a) * (R - 0.02), a, () => {
      const o = { x: 0, y: 3.0, w: 0.6, h: 1.1, arch: true };
      k.add(frameGeo(o, 0.14, 0.16), MM.stone('#cfc6b6'), 0, 0, -0.04);
      k.add(fillGeoArch(o), MM.glow(), 0, 0, 0.0);
      k.add(rbox(0.9, 0.08, 0.26, 0.02), MM.stone('#cfc6b6'), 0, 2.98, 0.12);
      k.add(rbox(0.75, 0.06, 0.18, 0.03), MM.snow(), 0, 3.05, 0.14);
    });
  }
  // the door: a stone arch, a dark plank door, a canopy on iron brackets, a lantern, a stone step
  k.at(0, 0.4, R + 0.3, 0, () => {
    const o = { x: 0, y: 0, w: 1.5, h: 2.5, arch: true };
    k.add(frameGeo(o, 0.3, 0.32), MM.stone('#cfc6b6'), 0, 0, -0.12);
    pv(k, rbox(1.5, 2.0, 0.08, 0.015), '#2f5a7a', 0, 1.0, -0.1);
    k.add(fillGeoArch(o), MAT.wood('dark'), 0, 0, -0.13);
    for (const y of [0.5, 1.7]) k.add(box(1.4, 0.07, 0.04), MAT.iron(), 0, y, -0.03);
    k.add(torus(0.09, 0.015, 4, 12), MAT.brass(), 0.45, 1.1, 0.0);
    for (const sx of [-1, 1]) k.add(box(0.06, 0.06, 0.9), MAT.iron(), sx * 0.95, 2.95, 0.35, 0, { rx: 0.5 });
    k.add(rbox(2.4, 0.1, 1.2, 0.03), cop, 0, 3.2, 0.45, 0, { rx: 0.25 });
    k.add(rbox(2.2, 0.1, 1.0, 0.05), MM.snow(), 0, 3.3, 0.42, 0, { rx: 0.25 });
    k.add(box(0.05, 0.05, 0.35), MAT.iron(), -1.25, 2.3, 0.2);
    k.add(rbox(0.18, 0.24, 0.18, 0.02), MM.glow(), -1.25, 2.1, 0.38);
    k.add(cyl(0.02, 0.16, 0.13, 4), MAT.iron(), -1.25, 2.28, 0.38, Math.PI / 4);
    k.add(rbox(2.2, 0.12, 0.8, 0.03), MM.stone('#cfc6b6'), 0, -0.36, 0.45);
  });
  // the balcony round the dome's foot: a deck on brackets, posts and two rails
  const by = H + 0.4 + 0.3, br = R + 1.05;
  k.add(lath([[R - 0.2, 0], [br, 0], [br, 0.14], [R - 0.2, 0.14]], 40), MAT.planks('honey'), 0, by, 0);
  k.add(lath([[R - 0.1, 0.14], [br - 0.1, 0.14], [br - 0.15, 0.24], [R - 0.1, 0.24]], 40), MM.snow(), 0, by, 0);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; k.at(0, by, 0, a, () => { k.add(box(0.12, 0.12, 1.4), MAT.wood('dark'), 0, -0.45, R + 0.2, 0, { rx: -0.6 }); }); }
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; k.add(box(0.06, 1.0, 0.06), MAT.iron(), Math.sin(a) * (br - 0.06), by + 0.6, Math.cos(a) * (br - 0.06)); }
  for (const y of [0.55, 1.08]) k.add(torus(br - 0.06, 0.035, 5, 48), MAT.iron(), 0, by + y, 0, 0, { rx: Math.PI / 2 });
  // the dome: verdigris, twelve bronze ribs, the slit to +z (opened) with the telescope's barrel in it
  const dy = H + 0.4, prof = [[R + 0.1, 0], [R - 0.1, 1.2], [R - 0.9, 2.6], [R - 2.5, 3.8], [0.01, 4.45]];
  k.add(lath([[0.001, 0], ...prof], 40), cop, 0, dy, 0);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.2) continue;
    k.add(pipe(prof.slice(0, 4).map(([rr, y]) => [Math.sin(a) * (rr + 0.06), dy + y, Math.cos(a) * (rr + 0.06)]).concat([[Math.sin(a) * 0.35, dy + 4.42, Math.cos(a) * 0.35]]), 0.07, 0.6, 5), bronze, 0, 0, 0);
  }
  k.add(new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a + 0.03, b)), 3, -0.11, 0.22), MM.dark(), 0, dy, 0);
  for (const s of [-1, 1]) { const a = s * 0.13; k.add(pipe(prof.slice(0, 4).map(([rr, y]) => [Math.sin(a) * (rr + 0.08), dy + y, Math.cos(a) * (rr + 0.08)]), 0.09, 0.6, 5), bronze, 0, 0, 0); }
  k.at(0, dy + 1.6, R - 0.8, 0, () => {
    k.add(cyl(0.3, 0.38, 3.0, 14), MAT.brass(), 0, 0, 0.6, 0, { rx: 0.9 });
    k.add(torus(0.32, 0.05, 5, 16), MAT.iron(), 0, 0.98, 1.85, 0, { rx: 0.9 - Math.PI / 2 });
  });
  // a lantern on top with a weather vane
  const ty = dy + 4.4;
  k.add(cyl(0.45, 0.55, 0.5, 10), cop, 0, ty + 0.2, 0);
  k.add(cyl(0.04, 0.04, 1.6, 6), MAT.iron(), 0, ty + 1.2, 0);
  k.add(box(0.9, 0.05, 0.05), MAT.iron(), 0.15, ty + 1.75, 0);
  pv(k, slab('mm-vane', (s) => { s.moveTo(0, 0); s.lineTo(0.35, 0.18); s.lineTo(0.35, -0.18); s.lineTo(0, 0); }, 0.02, 0.004), '#e8c040', 0.5, ty + 1.75, 0, 0, { ry: 0 });
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; k.add(box(0.5, 0.03, 0.03), MAT.iron(), Math.cos(a) * 0.25, ty + 1.45, Math.sin(a) * 0.25, -a); k.add(sphere(0.08, 8, 4, ), MAT.brass(), Math.cos(a) * 0.5, ty + 1.45, Math.sin(a) * 0.5); }
  // snow banked round the foot (not at the door)
  for (let i = 0; i < 5; i++) { const a = Math.PI * 0.45 + i * 0.55; drift(k, Math.sin(a) * (R + 0.7), -0.1, Math.cos(a) * (R + 0.7), 2.4, 0.55, 1.2, a + Math.PI / 2, i); }
  return { buttresses: butt };
}
// the Joint Project's heating station: the teal cabinet gets a roof lip, louvres, flanged pipes, a gauge (front +z)
export function heatCabinetDress(k, { w = 2.4, h = 2.2, d = 1.8 } = {}) {
  const teal = MAT.plates('#2f8a86', 1), dark = '#1f4a4a';
  k.add(rbox(w + 0.3, 0.14, d + 0.3, 0.04), teal, 0, h + 0.07, 0);
  k.add(rbox(w + 0.1, 0.12, d + 0.1, 0.05), MM.snow(), 0, h + 0.18, 0);
  for (let i = 0; i < 6; i++) pv(k, box(1.0, 0.05, 0.08), dark, -0.4, 0.9 + i * 0.13, d / 2 + 0.03, 0, { rx: 0.5 });
  pv(k, rbox(1.2, 0.95, 0.04, 0.02), '#2a6a68', -0.4, 1.22, d / 2 + 0.01);
  k.add(cyl(0.2, 0.2, 0.05, 18), MAT.brass(), 0.75, 1.5, d / 2 + 0.03, 0, { rx: Math.PI / 2 });
  k.add(cyl(0.16, 0.16, 0.02, 18), MAT.flat('#f4efe2', 0.6), 0.75, 1.5, d / 2 + 0.06, 0, { rx: Math.PI / 2 });
  k.add(box(0.02, 0.13, 0.01), MAT.flat('#c8302a', 0.5), 0.75, 1.53, d / 2 + 0.075, 0, { rz: 0.8 });
  k.add(rbox(w + 0.1, 0.18, d + 0.1, 0.03), MAT.tread('#5a5e66'), 0, 0.09, 0);
  for (let i = 0; i < 9; i++) pv(k, box(0.22, 0.12, 0.02), i % 2 ? '#2a2c30' : '#e8c040', -w / 2 + 0.15 + i * 0.26, 0.28, d / 2 + 0.02, 0, { rz: 0.6 });
  return { hw: w / 2 + 0.15, hd: d / 2 + 0.15, top: h + 0.3 };
}
