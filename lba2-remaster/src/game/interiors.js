// Interior scenes. LBA2 shows interiors ("cubes intérieurs") with a fixed
// isometric camera, rotated 45°, where only the two far walls are drawn so
// you can see inside. Rooms live far from the island in the same world and
// the outdoor scenery is hidden while you are inside.
import * as THREE from 'three';
import { mat } from '../engine/rig.js';
import { textures } from '../engine/textures.js';
import { Kit, MAT, M, rbox, plane, cyl, sphere, torus, lathe, pipe, slab, soft, softMat, canvasTex } from './props.js';
import * as P from './props.js';

const texMat = (tex, rx, ry, extra = {}) => {
  const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, ...extra });
};

class RoomBuilder {
  constructor(scene, physics, id, cx, cz) {
    this.physics = physics;
    this.cx = cx; this.cz = cz;
    this.group = new THREE.Group();
    this.group.position.set(cx, 0, cz);
    this.group.visible = false;
    scene.add(this.group);
    this.k = new Kit(this.group);
    this.room = { id, center: new THREE.Vector3(cx, 0, cz), group: this.group, exits: [], zones: [], searches: [], ballTargets: [], lights: [], updaters: [], colliders: [] };
  }
  box(w, h, d, material, x, y, z, ry = 0, shadow = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z); m.rotation.y = ry;
    m.castShadow = shadow; m.receiveShadow = true;
    this.group.add(m);
    return m;
  }
  mesh(geo, material, x, y, z) {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    this.group.add(m);
    return m;
  }
  // solid brick (local coords)
  col(x, z, hw, hd, top, extra = {}) {
    const c = this.physics.add({ type: 'box', x: this.cx + x, z: this.cz + z, hw, hd, rot: extra.rot || 0, top, ...extra });
    this.room.colliders.push(c);
    return c;
  }
  ccol(x, z, r, top, extra = {}) {
    const c = this.physics.add({ type: 'cyl', x: this.cx + x, z: this.cz + z, r, top, ...extra });
    this.room.colliders.push(c);
    return c;
  }
  // place a prop builder at (x, z) turned by ry and give it a collider from its footprint
  put(x, z, ry, fn, opts = {}, colExtra = { noStand: true }) {
    const fp = this.k.at(x, opts.y || 0, z, ry, () => fn(this.k, opts));
    if (fp && !opts.noCol) {
      if (fp.r) this.ccol(x, z, fp.r, fp.top, colExtra);
      else if (fp.hw) this.col(x, z, fp.hw, fp.hd, fp.top, { rot: ry, ...colExtra });
    }
    return fp;
  }
  floor(w, d, material) {
    this.box(w, 0.2, d, material, 0, -0.1, 0, 0, false);
    this.col(0, 0, w / 2, d / 2, 0, { seeThrough: true, bottom: -1 });
  }
  // the two far walls are drawn; the two near ones are only a low skirting
  walls(w, d, h, material, skirtMat) {
    this.box(0.3, h, d + 0.3, material, -w / 2 - 0.15, h / 2, 0);
    this.box(w + 0.3, h, 0.3, material, 0, h / 2, -d / 2 - 0.15);
    this.box(0.3, 0.35, d + 0.3, skirtMat, w / 2 + 0.15, 0.175, 0);
    this.box(w + 0.3, 0.35, 0.3, skirtMat, 0, 0.175, d / 2 + 0.15);
    this.wallCols(w, d, h, 0.3);
  }
  wallCols(w, d, h, t) {
    this.col(-w / 2 - t / 2, 0, t / 2, d / 2 + t, h);
    this.col(w / 2 + t / 2, 0, t / 2, d / 2 + t, h);
    this.col(0, -d / 2 - t / 2, w / 2 + t, t / 2, h);
    this.col(0, d / 2 + t / 2, w / 2 + t, t / 2, h);
  }
  // LBA2-style cut-away room: a floor slab with a visible section, two tall far
  // walls (-x, -z) with real thickness and a rounded cap, and low near rims.
  // o: {W, D, H, t, floor, slab, body, low, dado, rail, cap, rimH, rimMat, beam, posts, back:[openings], left:[openings], outside}
  shell(o) {
    const k = this.k, { W, D, H } = o, t = o.t ?? 0.4;
    this.W = W; this.D = D; this.H = H; this.t = t;
    k.add(new THREE.BoxGeometry(W, 0.1, D), o.floor, 0, -0.05, 0);
    const sh = o.slabH ?? 0.7;
    k.add(new THREE.BoxGeometry(W + 2 * t, sh, D + 2 * t), o.slab, 0, -0.1 - sh / 2, 0);
    k.add(rbox(W + 2 * t + 0.04, 0.08, 0.1, 0.03), o.cap, 0, -0.08, D / 2 + t + 0.0);
    k.add(rbox(0.1, 0.08, D + 2 * t + 0.04, 0.03), o.cap, W / 2 + t, -0.08, 0);
    this.col(0, 0, W / 2, D / 2, 0, { seeThrough: true, bottom: -1 });
    // far walls
    k.at(-W / 2 - t, 0, -D / 2, 0, () => this.wallRun(W + 2 * t, o, (o.back || []).map((p) => ({ ...p, at: p.at + W / 2 + t })), t, t));
    k.at(-W / 2, 0, D / 2 + t, Math.PI / 2, () => this.wallRun(D + t, o, (o.left || []).map((p) => ({ ...p, at: D / 2 + t - p.at })), t, 0));
    // near rims
    const rh = o.rimH ?? 0.45, rm = o.rimMat || o.slab;
    if (rh > 0) {
      k.add(new THREE.BoxGeometry(W + 2 * t, rh, t), rm, 0, rh / 2, D / 2 + t / 2);
      k.add(new THREE.BoxGeometry(t, rh, D + t), rm, W / 2 + t / 2, rh / 2, -t / 2);
      k.add(rbox(W + 2 * t + 0.06, 0.12, t + 0.1, 0.055), o.cap, 0, rh + 0.04, D / 2 + t / 2);
      k.add(rbox(t + 0.1, 0.12, D + t + 0.04, 0.055), o.cap, W / 2 + t / 2, rh + 0.04, -t / 2 + 0.02);
    }
    this.wallCols(W, D, H, t);
  }
  // one far wall in its own frame: x along the run 0..L, inner face at z=0 facing +z
  wallRun(L, o, openings, cutStart, cutEnd) {
    const k = this.k, H = o.H, t = o.t ?? 0.4, dado = o.dado ?? 1.0;
    const ops = openings.slice().sort((a, b) => a.at - b.at);
    // wall body: full-height columns between openings, lintels and sills
    let x = 0;
    const body = (x0, x1, y0, y1) => { if (x1 - x0 > 0.001 && y1 - y0 > 0.001) k.add(new THREE.BoxGeometry(x1 - x0, y1 - y0, t), o.body, (x0 + x1) / 2, (y0 + y1) / 2, -t / 2); };
    for (const p of ops) {
      const a = p.at - p.w / 2, b = p.at + p.w / 2;
      body(x, a, 0, H);
      body(a, b, p.y0 + p.h, H);
      if (p.y0 > 0) body(a, b, 0, p.y0);
      x = b;
    }
    body(x, L, 0, H);
    // panelling, rails, skirting (broken by doors)
    const solid = [];
    x = cutStart;
    for (const p of ops) if (p.y0 < 0.05) { solid.push([x, p.at - p.w / 2 - 0.1]); x = p.at + p.w / 2 + 0.1; }
    solid.push([x, L - cutEnd]);
    for (const [a, b] of solid) {
      if (b - a < 0.05) continue;
      const c = (a + b) / 2, l = b - a;
      if (o.low) k.add(new THREE.BoxGeometry(l, dado, 0.03), o.low, c, dado / 2, 0.015);
      if (o.low) k.add(rbox(l, 0.07, 0.07, 0.025), o.rail, c, dado, 0.03);
      k.add(rbox(l, 0.16, 0.05, 0.015), o.rail, c, 0.08, 0.025);
    }
    // cornice / beam along the top, and the rounded cap
    if (o.beam) k.add(rbox(L - cutStart - cutEnd, 0.22, 0.16, 0.03), o.beam, (cutStart + L - cutEnd) / 2, H - 0.11, 0.08, 0, { swap: true });
    else k.add(rbox(L - cutStart - cutEnd, 0.1, 0.09, 0.03), o.rail, (cutStart + L - cutEnd) / 2, H - 0.06, 0.04);
    k.add(rbox(L + 0.04, 0.14, t + 0.12, 0.06), o.cap, L / 2, H + 0.05, -t / 2);
    // timber posts
    if (o.posts) for (const px of o.postsAt?.(L) || []) k.add(rbox(0.16, H - 0.05, 0.08, 0.02), o.posts, px, (H - 0.05) / 2, 0.04);
    // openings
    for (const p of ops) this.opening(p, o, t);
  }
  opening(p, o, t) {
    const k = this.k, fm = p.frame || o.rail;
    const a = p.at, w = p.w, h = p.h, y0 = p.y0;
    // outside view behind the opening
    if (p.view) k.add(plane(w + 0.3, h + 0.3), p.view, a, y0 + h / 2, -t - 0.05);
    if (p.kind === 'door') {
      for (const s of [-1, 1]) k.add(rbox(0.13, h + 0.07, 0.07, 0.02), fm, a + s * (w / 2 + 0.05), (h + 0.07) / 2, 0.025);
      k.add(rbox(w + 0.34, 0.16, 0.09, 0.03), fm, a, h + 0.12, 0.03);
      k.add(rbox(w + 0.44, 0.05, 0.13, 0.02), fm, a, h + 0.22, 0.04);
      k.add(rbox(w + 0.06, 0.05, t + 0.12, 0.02), p.sill || MAT.stone('sand', 1), a, 0.0, -t / 2);
      // reveal lining
      for (const s of [-1, 1]) k.add(new THREE.BoxGeometry(0.03, h, t), fm, a + s * (w / 2 - 0.015), h / 2, -t / 2);
      k.add(new THREE.BoxGeometry(w, 0.03, t), fm, a, h - 0.015, -t / 2);
      if (p.leaf) {
        // the door leaf stands open into the room, hinged on the +x side
        k.at(a + w / 2 - 0.04, 0, 0.02, p.leafAngle ?? 1.9, () => {
          const lw = w - 0.06, lm = p.leaf;
          k.add(rbox(lw, h - 0.04, 0.06, 0.015), lm, -lw / 2, (h - 0.04) / 2 + 0.01, 0);
          for (const [yy, hh] of [[h * 0.66, h * 0.42], [h * 0.22, h * 0.3]]) { k.add(rbox(lw - 0.2, hh, 0.03, 0.02), MAT.wood('dark'), -lw / 2, yy, 0.03); k.add(rbox(lw - 0.2, hh, 0.03, 0.02), MAT.wood('dark'), -lw / 2, yy, -0.03); }
          k.add(sphere(0.03, 8, 6), MAT.brass(), -lw + 0.08, h * 0.47, 0.05);
          k.add(sphere(0.03, 8, 6), MAT.brass(), -lw + 0.08, h * 0.47, -0.05);
          for (const yy of [0.25, h - 0.3]) k.add(rbox(0.04, 0.12, 0.08, 0.01), MAT.iron(), -0.01, yy, 0);
        });
      }
    } else if (p.kind === 'window') {
      const fw = 0.1;
      k.add(rbox(w + 0.24, 0.06, 0.24, 0.02), p.sill || fm, a, y0 - 0.01, 0.06);
      k.add(rbox(w + 0.12, 0.08, 0.06, 0.02), fm, a, y0 - 0.08, 0.03);
      for (const s of [-1, 1]) k.add(rbox(fw, h + 0.1, 0.06, 0.02), fm, a + s * (w / 2 + fw / 2 - 0.02), y0 + h / 2, 0.03);
      k.add(rbox(w + 0.2, fw, 0.06, 0.02), fm, a, y0 + h + fw / 2 - 0.02, 0.03);
      // casement: frame, mullions, glass
      const gz = -t * 0.45, gm = p.glass || MAT.glow('#d8eeff', '#a8d4ff', 0.9);
      k.add(plane(w, h), gm, a, y0 + h / 2, gz - 0.01);
      const mm = p.mullion || MAT.paint('#f4efe2', 0.5);
      k.add(rbox(w, 0.05, 0.05, 0.012), mm, a, y0 + h * 0.62, gz);
      k.add(rbox(0.05, h, 0.05, 0.012), mm, a, y0 + h / 2, gz);
      for (const s of [-1, 1]) k.add(new THREE.BoxGeometry(0.05, h, t * 0.5), fm, a + s * (w / 2 - 0.025), y0 + h / 2, -t * 0.25);
      k.add(new THREE.BoxGeometry(w, 0.05, t * 0.5), fm, a, y0 + h - 0.025, -t * 0.25);
      if (p.curtain) {
        k.add(cyl(0.015, 0.015, w + 0.7, 8), MAT.brass(), a, y0 + h + 0.18, 0.12, 0, { rz: Math.PI / 2 });
        for (const s of [-1, 1]) k.add(sphere(0.035, 8, 6), MAT.brass(), a + s * (w / 2 + 0.36), y0 + h + 0.18, 0.12);
        const cg = curtainGeo(0.42, h + 0.42, p.curtain);
        for (const s of [-1, 1]) k.add(cg, softMat, a + s * (w / 2 + 0.12), y0 - 0.2, 0.12, 0, { sx: s });
      }
    }
  }
  light(color, intensity, dist, x, y, z) {
    const l = new THREE.PointLight(color, 0, dist, 2);
    l.position.set(x, y, z);
    l.userData.base = intensity;
    this.group.add(l);
    this.room.lights.push(l);
    return l;
  }
  world(x, z) { return { x: this.cx + x, z: this.cz + z }; }
  finish() { this.k.flush(); return this.room; }
}

// gathered curtain hanging from y=h down to 0 (local), folds along x
function curtainGeo(w, h, col) {
  return soft({
    key: 'curtain' + w + h + col,
    prims: [{ type: 'box', c: [0, h / 2, 0], h: [w / 2, h / 2, 0.035], round: 0.03, group: 'c', mat: 'c', wobble: (x, y, z) => Math.sin(x * 48 + Math.sin(y * 3) * 0.6) * 0.022 * (0.6 + 0.4 * Math.abs(Math.sin(y * 1.4))) }],
    groups: { c: 0.02 }, colors: { c: col },
    paint: (p, m, c) => { c.multiplyScalar(0.82 + 0.22 * Math.sin(p.x * 48)); if (p.y > h - 0.12) c.multiplyScalar(0.85); },
    bounds: { min: [-w / 2 - 0.05, -0.05, -0.08], max: [w / 2 + 0.05, h + 0.05, 0.08] }, cell: 0.022,
  });
}

// painted views through doors and windows (unlit so they read as daylight)
function outsideView(kind) {
  const t = canvasTex(256, 256, (x, W, H) => {
    const g = x.createLinearGradient(0, 0, 0, H);
    if (kind === 'citadel') {
      g.addColorStop(0, '#9fd0f6'); g.addColorStop(0.5, '#e8f4fb'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = 'rgba(255,255,255,0.85)'; for (const [cx, cy, rw] of [[60, 40, 50], [190, 70, 60], [120, 100, 40]]) { x.beginPath(); x.ellipse(cx, cy, rw, 10, 0, 0, 7); x.fill(); }
      x.fillStyle = '#4f9a50'; x.fillRect(0, 150, W, 40);
      x.fillStyle = '#6fb048'; x.beginPath(); x.ellipse(60, 150, 60, 30, 0, Math.PI, 0); x.fill(); x.beginPath(); x.ellipse(210, 155, 50, 26, 0, Math.PI, 0); x.fill();
      x.fillStyle = '#9a9aa4'; x.fillRect(0, 180, W, 76);
      x.strokeStyle = 'rgba(70,70,80,0.5)'; for (let y = 184; y < H; y += 12) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); for (let xx = (y / 12) % 2 * 16; xx < W; xx += 32) { x.beginPath(); x.moveTo(xx, y); x.lineTo(xx, y + 12); x.stroke(); } }
    } else if (kind === 'sky') {
      g.addColorStop(0, '#8cc4f0'); g.addColorStop(1, '#e4f2fb'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = 'rgba(255,255,255,0.8)'; for (const [cx, cy, rw] of [[70, 60, 60], [180, 130, 70], [90, 200, 40]]) { x.beginPath(); x.ellipse(cx, cy, rw, 12, 0, 0, 7); x.fill(); }
    } else if (kind === 'sea') {
      g.addColorStop(0, '#8cc4f0'); g.addColorStop(0.55, '#dff0fa'); g.addColorStop(0.56, '#3a9ad0'); g.addColorStop(1, '#2468a8'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 40; i++) { const y = 150 + Math.random() * 100, xx = Math.random() * W; x.beginPath(); x.moveTo(xx, y); x.lineTo(xx + 12, y); x.stroke(); }
    } else if (kind === 'mist') {
      g.addColorStop(0, '#c8c4d8'); g.addColorStop(1, '#eeeaf4'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 8; i++) { x.beginPath(); x.ellipse(Math.random() * W, Math.random() * H, 60, 14, 0, 0, 7); x.fill(); }
    } else if (kind === 'night') {
      g.addColorStop(0, '#1a2a4a'); g.addColorStop(1, '#3a5a8a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    }
  });
  return M('view' + kind, () => { const m = new THREE.MeshBasicMaterial({ map: t }); m.userData.noShadow = true; return m; });
}

// ------------------------------------------------------------------ Twinsen's house
function buildHouse(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'house', 1000, 0);
  const R = B.room, k = B.k;
  const W = 9, D = 7, H = 3.0;
  R.view = 10.8;
  R.follow = 0.22;
  const doorX = 2.6;
  const rail = MAT.wood('dark');
  B.shell({
    W, D, H, t: 0.4,
    floor: MAT.planks('honey'), slab: MAT.rubble('grey'), rimMat: MAT.stone('sand', 1.4),
    body: MAT.plaster('#f0e4c8'), low: MAT.wainscot('honey'), dado: 1.05, rail, cap: MAT.wood('dark'), beam: MAT.wood('dark'),
    posts: MAT.wood('dark'), postsAt: (L) => [0.48, L - 0.48],
    back: [
      { kind: 'door', at: doorX, w: 1.15, h: 2.2, y0: 0, leaf: MAT.wood('honey'), leafAngle: 1.95, view: outsideView('citadel') },
      { kind: 'window', at: 0.3, w: 1.0, h: 1.15, y0: 1.1, curtain: '#c8452f', view: outsideView('sky') },
    ],
    left: [{ kind: 'window', at: 0.1, w: 1.0, h: 1.15, y0: 1.1, curtain: '#c8452f', view: outsideView('sea') }],
  });
  const BZ = -D / 2, LX = -W / 2;
  R.exits.push({ ...B.world(doorX, BZ + 0.45), r: 0.75, to: 'outdoor' });
  R.spawn = { ...B.world(doorX, BZ + 1.9), a: 0 };
  k.at(doorX, 0, BZ + 0.8, 0, () => P.rug(k, 1.3, 0.8, ['#8a3a2a', '#5a2418', '#d8a040', '#e8d0a0', '#2a140c'], 4));

  // --- kitchen corner: range with tiled splashback and stovepipe
  const stX = -3.35;
  k.at(stX, 0, BZ + 0.36, 0, () => P.stove(k));
  B.col(stX, BZ + 0.36, 0.66, 0.38, 0.9, { noStand: true });
  k.add(rbox(1.5, 0.75, 0.03, 0.01), MAT.tiles('#3a78b8', '#f2ecdc', '#d8d0c0', true, 8), stX, 1.27, BZ + 0.015);
  k.add(rbox(1.56, 0.05, 0.06, 0.015), rail, stX, 1.66, BZ + 0.03);
  k.add(pipe([[stX - 0.4, 0.9, BZ + 0.18], [stX - 0.4, 2.35, BZ + 0.18], [stX - 0.4, 2.55, BZ - 0.1]], 0.075, 0.2, 12), MAT.iron(), 0, 0, 0);
  k.add(torus(0.085, 0.015, 5, 14), MAT.iron(), stX - 0.4, 1.6, BZ + 0.18, 0, { rx: Math.PI / 2 });
  P.pot(k, stX + 0.28, 0.87, BZ + 0.36, { r: 0.13, h: 0.16 });
  P.kettle(k, stX - 0.25, 0.87, BZ + 0.38);
  k.at(stX + 0.2, 1.9, BZ + 0.15, 0, () => { P.wallShelf(k, { w: 0.9, d: 0.26 }); });
  P.jar(k, stX - 0.05, 1.92, BZ + 0.14, 'crock', '#3a6fb0');
  P.jar(k, stX + 0.15, 1.92, BZ + 0.14, 'jar', '#d8a13b');
  P.jar(k, stX + 0.35, 1.92, BZ + 0.14, 'jar', '#b8483b', 0.8);
  P.jar(k, stX + 0.52, 1.92, BZ + 0.14, 'bottle', '#3f8a5a');
  // hanging ladles / pans under the shelf
  for (const [i, c] of [[0, '#d58a5a'], [1, '#8a8a92'], [2, '#d58a5a']]) {
    const x = stX - 0.05 + i * 0.25;
    k.add(lathe([[0.001, 0], [0.07, 0], [0.08, 0.03], [0.075, 0.035], [0.001, 0.012]], 12), MAT.flat(c, 0.35, { metalness: 0.6 }), x, 1.45, BZ + 0.07, 0, { rx: Math.PI / 2 });
    k.add(cyl(0.01, 0.01, 0.25, 5), MAT.flat(c, 0.35, { metalness: 0.6 }), x, 1.62, BZ + 0.07);
  }
  // firewood basket in the corner
  k.at(-4.05, 0, BZ + 0.55, 0, () => {
    k.add(lathe([[0.001, 0], [0.24, 0], [0.28, 0.32], [0.3, 0.34], [0.27, 0.34], [0.25, 0.04], [0.001, 0.04]], 14), MAT.wood('pale'), 0, 0, 0);
    for (let i = 0; i < 6; i++) k.add(cyl(0.05, 0.05, 0.55, 7), MAT.wood(i % 2 ? 'honey' : 'grey'), Math.cos(i * 1.2) * 0.1, 0.42 + (i % 2) * 0.05, Math.sin(i * 1.2) * 0.1, i, { rz: Math.PI / 2 - 0.2 });
  });
  B.ccol(-4.05, BZ + 0.55, 0.3, 0.6, { noStand: true });
  const stoveLight = B.light('#ff8a3a', 3.2, 4.5, stX, 0.6, BZ + 1.0);

  // --- dresser with plates
  const drX = -1.55;
  B.put(drX, BZ + 0.28, 0, P.dresser, {});
  // --- the cupboard (the magic ball is in here, like LBA2's opening)
  const cupZ = -1.6;
  B.put(LX + 0.34, cupZ, Math.PI / 2, P.wardrobe, { w: 1.4, d: 0.62, h: 2.15 });
  R.searches.push({ id: 'cupboard', ...B.world(LX + 1.3, cupZ), r: 1.4 });

  // --- bed, nightstand, Dino-Fly painting
  const bedZ = 2.2;
  B.put(LX + 1.1, bedZ, -Math.PI / 2, P.bed, { w: 1.45, l: 2.15 });
  k.at(LX + 0.02, 1.85, bedZ, Math.PI / 2, () => P.frame(k, 1.0, 0.75, P.painting('dinofly')));
  B.put(LX + 0.3, 0.95 + 0.0, Math.PI / 2, P.nightstand, {});
  P.candle(k, LX + 0.3, 0.62, 0.9);
  P.bookStack(k, LX + 0.28, 0.62, 1.12, 2, 5);
  // under the side window: a low chest with a plant
  B.put(LX + 0.32, 0.1, Math.PI / 2, P.chest, { w: 0.8, d: 0.46, h: 0.44, pal: 'honey' });
  k.at(LX + 0.32, 0.6, -0.05, 0, () => P.pottedPlant(k, { s: 0.6 }));

  // --- table, chairs, rug, lamp
  const tX = -0.45, tZ = 0.55;
  k.at(tX, 0, tZ, 0, () => P.rug(k, 3.3, 2.4, ['#a8382a', '#2a4a7a', '#e0b050', '#f0e0b8', '#3a1a12'], 1));
  B.put(tX, tZ, 0, P.table, { w: 1.5, d: 0.9 }, { noStand: true, seeThrough: true });
  B.put(tX - 1.05, tZ, Math.PI / 2, P.chair, { cushion: '#c8452f' }, { noStand: true, seeThrough: true });
  B.put(tX + 1.05, tZ + 0.05, -Math.PI / 2 + 0.15, P.chair, { cushion: '#c8452f' }, { noStand: true, seeThrough: true });
  B.put(tX + 0.2, tZ + 0.82, Math.PI - 0.1, P.chair, { cushion: '#3b6fc4' }, { noStand: true, seeThrough: true });
  B.put(tX - 0.1, tZ - 0.68, 0, P.bench, { w: 1.2 }, { noStand: true, seeThrough: true });
  // table dressing: bread, bowl, jug, mugs
  k.add(lathe([[0.001, 0], [0.14, 0], [0.16, 0.06], [0.17, 0.08], [0.001, 0.06]], 16), MAT.flat('#f2ead6', 0.3), tX - 0.3, 0.78, tZ - 0.1);
  for (let i = 0; i < 4; i++) k.add(sphere(0.045, 8, 6), MAT.flat(['#e03a3a', '#e8c040', '#e03a3a', '#7ab040'][i], 0.4), tX - 0.3 + Math.cos(i * 1.6) * 0.06, 0.86, tZ - 0.1 + Math.sin(i * 1.6) * 0.06);
  P.jar(k, tX + 0.15, 0.78, tZ + 0.1, 'vase', '#3a6fb0', 0.9);
  k.add(soft({ key: 'bread', prims: [{ type: 'ell', c: [0, 0.05, 0], r: [0.16, 0.07, 0.09], group: 'b', mat: 'b', wobble: (x, y, z) => (y > 0.08 ? Math.abs(Math.sin(x * 40)) * -0.008 : 0) }], groups: { b: 0.02 }, colors: { b: '#c88a40' }, paint: (p, m, c) => { if (p.y < 0.03) c.multiplyScalar(0.8); }, bounds: { min: [-0.2, -0.02, -0.12], max: [0.2, 0.14, 0.12] }, cell: 0.015 }), softMat, tX + 0.45, 0.78, tZ - 0.15, 0.4);
  for (const [mx, mz] of [[0.0, 0.25], [0.55, 0.2]]) k.add(lathe([[0.001, 0], [0.04, 0], [0.045, 0.09], [0.04, 0.09], [0.035, 0.01], [0.001, 0.01]], 10), MAT.flat('#e8d8b0', 0.4), tX + mx, 0.78, tZ + mz);
  k.at(tX, 0, tZ, 0, () => P.hangingLamp(k, 2.15, H + 0.2, { shade: '#3f7a5a' }));
  B.light('#ffd6a0', 9, 11, tX, 2.0, tZ);

  // --- coat stand and family portrait by the door
  k.at(3.95, 0, BZ + 0.45, 0, () => P.coatStand(k));
  B.ccol(3.95, BZ + 0.45, 0.25, 1.8, { noStand: true });
  k.at(3.95, 1.75, BZ + 0.0, 0, () => P.frame(k, 0.7, 0.85, P.painting('portrait'), { mat: MAT.wood('dark') }));
  k.at(1.2, 2.0, BZ + 0.0, 0, () => P.frame(k, 0.5, 0.4, P.painting('island')));

  // --- Arthur's toy corner: rug, toy chest, blocks, boat, plush Dino-Fly, and the radio
  k.at(2.55, 0, 2.25, 0.08, () => P.rug(k, 2.4, 1.7, ['#3b78d8', '#e9c46a', '#e0503a', '#f8f0d8', '#1a3a6a'], 7));
  B.put(3.85, 2.85, -Math.PI / 2, P.chest, { w: 0.85, d: 0.5, h: 0.46, pal: 'red', band: MAT.paint('#e9c46a', 0.5) });
  k.at(1.95, 0.0, 2.75, 0.3, () => P.toyBlocks(k));
  k.at(3.05, 0.0, 1.75, 0.6, () => P.toyBoat(k));
  k.at(3.45, 0.47, 2.85, -0.9, () => P.plushDino(k));
  P.spinningTop(k, 2.6, 2.95);
  k.add(sphere(0.1, 12, 8), MAT.paint('#e03a3a', 0.4), 1.75, 0.1, 1.75);
  B.put(3.9, 1.35, 0, P.sideTable, {});
  k.at(3.9, 0.62, 1.35, -0.7, () => P.radio(k, { s: 0.8 }));
  // floor lamp at the bed's foot
  B.put(LX + 2.55, 3.05, 0, P.floorLamp, {});
  B.light('#ffcf90', 2.5, 4, LX + 2.55, 1.4, 3.05);
  // daylight through door and windows
  B.light('#e8f4ff', 3, 5, doorX, 1.6, BZ + 1.0);
  B.light('#e8f4ff', 2.5, 4.5, LX + 1.0, 1.8, 0.1);

  R.updaters.push((dt, t) => { stoveLight.intensity = stoveLight.userData.base * (0.85 + Math.sin(t * 11) * 0.1 + Math.sin(t * 7) * 0.05); });
  R.npcSpots = { zoe: { ...B.world(-1.6, -2.1), a: 0.6 }, arthur: { ...B.world(2.15, 2.15), a: -2.4 } };
  return B.finish();
}

// ------------------------------------------------------------------ the well
function buildWell(scene, physics) {
  const TX = textures();
  const B = new RoomBuilder(scene, physics, 'well', 1100, 0);
  const R = B.room;
  const W = 21, D = 14, H = 4;
  R.view = 15;
  R.follow = 0.6;
  R.cave = true;
  const rock = texMat(TX.rock, 4, 1.5);
  B.floor(W, D, texMat(TX.rock, 6, 4, { color: '#9a8e80' }));
  B.walls(W, D, H, rock, rock);
  // rough wall bumps
  for (let i = 0; i < 14; i++) {
    const along = -W / 2 + 1 + i * (W / 14);
    const s = 1 + (i % 3) * 0.4;
    B.box(s, H * (0.7 + (i % 2) * 0.3), 1.2, rock, along, H * 0.35, -D / 2 + 0.4);
  }
  for (let i = 0; i < 9; i++) {
    const along = -D / 2 + 1 + i * (D / 9);
    B.box(1.2, H * (0.65 + (i % 2) * 0.35), 1 + (i % 3) * 0.4, rock, -W / 2 + 0.4, H * 0.35, along);
  }
  // dividing rock wall with a gap that crystals have grown shut
  const gx = 4.5;
  B.box(1.2, H, 5.2, rock, gx, H / 2, -4.4);
  B.box(1.2, 1.1, 5.2, rock, gx, 0.55, 4.4); // near half drawn low so the iso camera can see past it
  B.col(gx, -4.4, 0.6, 2.6, H);
  B.col(gx, 4.4, 0.6, 2.6, H);
  // pillars
  for (const [px, pz, pr] of [[-3, 1.5, 0.7], [1.5, -2.5, 0.6], [-6.5, -2, 0.8]]) {
    B.mesh(new THREE.CylinderGeometry(pr * 0.8, pr, H, 7), rock, px, H / 2, pz);
    physics.add({ type: 'cyl', x: B.cx + px, z: B.cz + pz, r: pr, top: H });
  }

  // warm puddles with steam
  const puddleMat = new THREE.MeshStandardMaterial({ color: '#4fb8c8', emissive: '#1a6a7a', emissiveIntensity: 0.6, roughness: 0.1, transparent: true, opacity: 0.85 });
  const puddles = [[-6, 3, 1.4], [-1.5, -4.5, 1.1], [2, 3.5, 1.3], [7.5, -3.5, 1.2]];
  for (const [px, pz, pr] of puddles) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(pr, 20), puddleMat);
    m.rotation.x = -Math.PI / 2; m.position.set(px, 0.02, pz); B.group.add(m);
  }
  const NS = 90;
  const sp = new Float32Array(NS * 3), sd = [];
  for (let i = 0; i < NS; i++) {
    const p = puddles[i % puddles.length];
    sd.push({ x: p[0] + (Math.random() - 0.5) * p[2], z: p[1] + (Math.random() - 0.5) * p[2], y: Math.random() * 3, v: 0.4 + Math.random() * 0.5 });
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const steam = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#e8f4ff', size: 0.35, transparent: true, opacity: 0.35, depthWrite: false }));
  B.group.add(steam);
  R.updaters.push((dt) => {
    for (let i = 0; i < NS; i++) {
      const s = sd[i]; s.y += s.v * dt; if (s.y > 3.2) s.y = 0;
      sp[i * 3] = s.x + Math.sin(s.y * 2 + i) * 0.15; sp[i * 3 + 1] = s.y; sp[i * 3 + 2] = s.z;
    }
    sg.attributes.position.needsUpdate = true;
  });

  // crystals that "weren't there before"
  const crystalMat = (c, e, k = 1.5) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: k, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92 });
  const cyan = crystalMat('#aef6ff', '#2ad0ff', 1.6), violet = crystalMat('#e0c0ff', '#9a4aff', 1.4);
  const cluster = (x, y, z, n, s, m) => {
    for (let i = 0; i < n; i++) {
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(s * (0.5 + Math.random() * 0.6), 0), m);
      c.scale.y = 2 + Math.random();
      c.position.set(x + (Math.random() - 0.5) * s * 1.6, y + (Math.random() - 0.3) * s, z + (Math.random() - 0.5) * s * 1.6);
      c.rotation.set((Math.random() - 0.5) * 0.9, Math.random() * 3, (Math.random() - 0.5) * 0.9);
      B.group.add(c);
    }
  };
  [[-9.6, 1.5, -4], [-9.6, 2.2, 3], [-3, 2.5, -6.6], [2.5, 1.5, -6.6], [-6, 0.3, -6.4]].forEach(([x, y, z], i) => cluster(x, y, z, 5, 0.35, i % 2 ? violet : cyan));

  // three crystal nodes to wake with the magic ball
  R.nodes = [];
  for (const [nx, nz] of [[-5, -4], [0.5, -5.2], [1, 4.8]]) {
    B.mesh(new THREE.CylinderGeometry(0.5, 0.65, 0.9, 7), rock, nx, 0.45, nz);
    physics.add({ type: 'cyl', x: B.cx + nx, z: B.cz + nz, r: 0.6, top: 0.9 });
    const m = crystalMat('#8a9aa8', '#000000', 0);
    const c = B.mesh(new THREE.OctahedronGeometry(0.4, 0), m, nx, 1.55, nz);
    c.scale.y = 1.6;
    const node = { mesh: c, mat: m, lit: false, ...B.world(nx, nz), y: 1.55 };
    R.nodes.push(node);
    R.ballTargets.push({ x: node.x, y: node.y, z: node.z, r: 1.0, node });
  }
  R.updaters.push((dt, t) => { R.nodes.forEach((n, i) => { n.mesh.rotation.y = t * (n.lit ? 2 : 0.3) + i; }); });

  // crystal barrier in the gap
  const barrier = new THREE.Group();
  for (let i = 0; i < 14; i++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.5 + Math.random() * 0.4, 0), i % 2 ? cyan : violet);
    c.scale.y = 2.5 + Math.random() * 1.5;
    c.position.set(gx + (Math.random() - 0.5) * 0.8, 0.8 + Math.random() * 1.5, -1.6 + (i / 13) * 3.2);
    c.rotation.set((Math.random() - 0.5) * 0.6, Math.random() * 3, (Math.random() - 0.5) * 0.6);
    barrier.add(c);
  }
  B.group.add(barrier);
  R.barrier = { group: barrier, c: B.col(gx, 0, 0.6, 1.9, H) };

  // the vein: something under the island is calling the magic ball
  const veinMat = crystalMat('#d8fbff', '#40e0ff', 1.3);
  const vein = new THREE.Group();
  for (let i = 0; i < 22; i++) {
    const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.4 + Math.random() * 0.7, 0), i % 4 === 0 ? violet : veinMat);
    c.scale.y = 1.8 + Math.random() * 2;
    c.position.set(6 + Math.random() * 4, 0.4 + Math.random() * 3.2, -D / 2 + 0.5 + Math.random() * 0.9);
    c.rotation.set((Math.random() - 0.5) * 1.2, Math.random() * 3, (Math.random() - 0.5) * 1.2);
    vein.add(c);
  }
  B.group.add(vein);
  // on the far (north) wall of the last chamber, where the iso camera can see it
  B.col(8, -D / 2 + 0.9, 2.3, 0.9, H);
  const veinLight = B.light('#40d8ff', 22, 16, 8, 2.2, -D / 2 + 3);
  R.vein = { ...B.world(8, -D / 2 + 1.9), y: 1.7, mat: veinMat, light: veinLight, power: 0 };
  R.updaters.push((dt, t) => {
    const p = 0.75 + Math.sin(t * 2.2) * 0.25 + R.vein.power;
    veinMat.emissiveIntensity = 1.3 * Math.min(p, 1.8);
    veinLight.intensity = veinLight.userData.base * p;
  });
  R.chamberX = B.cx + gx + 1.2; // stepping past the barrier into the last chamber
  R.zones.push({ id: 'vein', ...B.world(gx + 2.5, 0), r: 2.4 });

  // the rope Twinsen came down on, under a shaft of daylight
  const ropeX = -8, ropeZ = 4.5;
  B.mesh(new THREE.CylinderGeometry(0.05, 0.05, 6, 6), mat('#c9a66b'), ropeX, 3, ropeZ);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 8, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#fff4d0', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  shaft.position.set(ropeX, 3.5, ropeZ); B.group.add(shaft);
  B.light('#fff1d0', 8, 8, ropeX, 3.5, ropeZ);
  B.light('#9a6aff', 6, 10, 0, 2.5, 0);
  R.exits.push({ ...B.world(ropeX, ropeZ), r: 0.7, to: 'outdoor-well' });
  R.spawn = { ...B.world(ropeX + 1.4, ropeZ - 1.2), a: Math.PI * 0.75 };
  R.mites = [B.world(-2, -1.5), B.world(2.5, 1), B.world(-4.5, 4.5), B.world(3, -4)];
  return R;
}

export function buildInteriors(scene, physics) {
  const rooms = { house: buildHouse(scene, physics), well: buildWell(scene, physics) };
  // rooms' colliders are always active but far from the island, so they never interfere
  return rooms;
}
