// Interior scenes. LBA2 shows interiors ("cubes intérieurs") with a fixed
// isometric camera, rotated 45°, where only the two far walls are drawn so
// you can see inside. Rooms live far from the island in the same world and
// the outdoor scenery is hidden while you are inside.
import * as THREE from 'three';
import { mat } from '../engine/rig.js';
import { textures } from '../engine/textures.js';
import { Kit, MAT, M, rbox, plane, cyl, sphere, torus, lathe, pipe, slab, soft, softMat, canvasTex } from './props.js';
import * as P from './props.js';
import { dressHomeLife } from './homelife.js';
import { dressWorkshop } from './workshoplife.js';

export const texMat = (tex, rx, ry, extra = {}) => {
  const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, ...extra });
};

export class RoomBuilder {
  constructor(scene, physics, id, cx, cz) {
    this.physics = physics;
    this.cx = cx; this.cz = cz;
    this.group = new THREE.Group();
    this.group.position.set(cx, 0, cz);
    this.group.visible = false;
    scene.add(this.group);
    this.k = new Kit(this.group);
    this.room = { id, center: new THREE.Vector3(cx, 0, cz), group: this.group, exits: [], zones: [], searches: [], givers: [], ballTargets: [], lights: [], updaters: [], colliders: [] };
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
  // a giver (LBA2's zone giver): hop next to it in Normal mode and a bonus pops out, once (Game.giverHop).
  // kinds: of 'money', 'life', 'magic', 'clover'; n kashes for money; top: where the bonus leaves from
  giver(id, x, z, kinds, n = 1, { r = 1.1, top = 1 } = {}) {
    this.room.givers.push({ id, ...this.world(x, z), y: 0, r, top, kinds, n });
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
  wallCols(w, d, h, t, ox = 0, oz = 0) {
    this.col(ox - w / 2 - t / 2, oz, t / 2, d / 2 + t, h);
    this.col(ox + w / 2 + t / 2, oz, t / 2, d / 2 + t, h);
    this.col(ox, oz - d / 2 - t / 2, w / 2 + t, t / 2, h);
    this.col(ox, oz + d / 2 + t / 2, w / 2 + t, t / 2, h);
  }
  // LBA2-style cut-away room: a floor slab with a visible section, two tall far
  // walls (-x, -z) with real thickness and a rounded cap, and low near rims.
  // o: {W, D, H, t, floor, slab, body, low, dado, rail, cap, rimH, rimMat, beam, posts, back:[openings], left:[openings], outside}
  // o.ox, o.oz: the room's centre in the builder's frame (a house laid out around an existing room)
  shell(o) {
    const ox = o.ox ?? 0, oz = o.oz ?? 0;
    if (ox || oz) { this.k.at(ox, 0, oz, 0, () => this.shell({ ...o, ox: 0, oz: 0, _off: [ox, oz] })); return; }
    const [cx0, cz0] = o._off || [0, 0];
    const k = this.k, { W, D, H } = o, t = o.t ?? 0.4;
    this.W = W; this.D = D; this.H = H; this.t = t;
    const sh = o.slabH ?? 0.7;
    // floor and slab, around a stairwell (o.hole: [x0, z0, x1, z1] in the builder's frame) if there is one
    const slabs = (x0, z0, x1, z1) => {
      if (!o.hole) return [[x0, z0, x1, z1]];
      const [a, b, c, d] = [o.hole[0] - cx0, o.hole[1] - cz0, o.hole[2] - cx0, o.hole[3] - cz0];
      return [[x0, z0, x1, b], [x0, d, x1, z1], [x0, b, a, d], [c, b, x1, d]].filter(([p, q, r, u]) => r - p > 1e-3 && u - q > 1e-3);
    };
    for (const [x0, z0, x1, z1] of slabs(-W / 2, -D / 2, W / 2, D / 2)) k.add(new THREE.BoxGeometry(x1 - x0, 0.1, z1 - z0), o.floor, (x0 + x1) / 2, -0.05, (z0 + z1) / 2);
    for (const [x0, z0, x1, z1] of slabs(-W / 2 - t, -D / 2 - t, W / 2 + t, D / 2 + t)) k.add(new THREE.BoxGeometry(x1 - x0, sh, z1 - z0), o.slab, (x0 + x1) / 2, -0.1 - sh / 2, (z0 + z1) / 2);
    k.add(rbox(W + 2 * t + 0.04, 0.08, 0.1, 0.03), o.cap, 0, -0.08, D / 2 + t + 0.0);
    k.add(rbox(0.1, 0.08, D + 2 * t + 0.04, 0.03), o.cap, W / 2 + t, -0.08, 0);
    // the floor to stand on (around a stairwell, whose steps the room adds)
    for (const [x0, z0, x1, z1] of slabs(-W / 2, -D / 2, W / 2, D / 2)) this.col(cx0 + (x0 + x1) / 2, cz0 + (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2, 0, { seeThrough: true, bottom: -1 });
    // far walls
    k.at(-W / 2 - t, 0, -D / 2, 0, () => this.wallRun(W + 2 * t, o, (o.back || []).map((p) => ({ ...p, at: p.at + W / 2 + t })), t, t));
    k.at(-W / 2, 0, D / 2 + t, Math.PI / 2, () => this.wallRun(D + t, o, (o.left || []).map((p) => ({ ...p, at: D / 2 + t - p.at })), t, 0));
    // near rims
    const rh = o.rimH ?? 0.45, rm = o.rimMat || o.slab;
    if (rh > 0) {
      // the south rim, open where a door goes through it (o.rimGaps: [{ x, w }], x in the builder's frame)
      const gaps = (o.rimGaps || []).map((g) => [g.x - cx0 - g.w / 2, g.x - cx0 + g.w / 2]).sort((p, q) => p[0] - q[0]);
      let x0 = -W / 2 - t;
      for (const [g0, g1] of [...gaps, [W / 2 + t, W / 2 + t]]) {
        if (g0 - x0 > 0.02) {
          k.add(new THREE.BoxGeometry(g0 - x0, rh, t), rm, (x0 + g0) / 2, rh / 2, D / 2 + t / 2);
          k.add(rbox(g0 - x0 + (gaps.length ? 0 : 0.06), 0.12, t + 0.1, 0.055), o.cap, (x0 + g0) / 2, rh + 0.04, D / 2 + t / 2);
        }
        x0 = g1;
      }
      k.add(new THREE.BoxGeometry(t, rh, D + t), rm, W / 2 + t / 2, rh / 2, -t / 2);
      k.add(rbox(t + 0.1, 0.12, D + t + 0.04, 0.055), o.cap, W / 2 + t / 2, rh + 0.04, -t / 2 + 0.02);
    }
    this.wallCols(W, D, H, t, cx0, cz0);
  }
  // an inside partition from (x0, z0) to (x1, z1) (axis-aligned), h high (LBA2's interiors: low dividers with a
  // wooden cap and rounded ends, or full walls), with doorways [{ at, w }] measured from (x0, z0)
  partition(x0, z0, x1, z1, { h = 1.15, t = 0.22, body, cap, rail, low, dado = 1.0, doors = [] } = {}) {
    const k = this.k, L = Math.hypot(x1 - x0, z1 - z0), alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const ux = (x1 - x0) / L, uz = (z1 - z0) / L;
    const ds = doors.slice().sort((a, b) => a.at - b.at);
    let a = 0;
    const piece = (s0, s1) => {
      const l = s1 - s0; if (l < 0.05) return;
      const cx = x0 + ux * (s0 + s1) / 2, cz = z0 + uz * (s0 + s1) / 2;
      const sx = alongX ? l : t, sz = alongX ? t : l;
      k.add(new THREE.BoxGeometry(sx, h, sz), body, cx, h / 2, cz);
      if (low && h > dado + 0.2) for (const s of [-1, 1]) k.add(new THREE.BoxGeometry(alongX ? l : 0.02, dado, alongX ? 0.02 : l), low, cx + (alongX ? 0 : s * (t / 2 + 0.01)), dado / 2, cz + (alongX ? s * (t / 2 + 0.01) : 0));
      if (rail) for (const s of [-1, 1]) k.add(rbox(alongX ? l : 0.05, 0.14, alongX ? 0.05 : l, 0.015), rail, cx + (alongX ? 0 : s * (t / 2 + 0.02)), 0.07, cz + (alongX ? s * (t / 2 + 0.02) : 0));
      k.add(rbox(sx + 0.1, 0.1, sz + 0.1, 0.045), cap, cx, h + 0.04, cz);
      // rounded ends where the wall stops (a doorway or a free end)
      for (const e of [s0, s1]) k.add(cyl(t / 2 + 0.05, t / 2 + 0.05, h + 0.09, 14), cap, x0 + ux * e, (h + 0.09) / 2, z0 + uz * e);
      this.col(cx, cz, sx / 2, sz / 2, h + 0.1);
    };
    for (const d of ds) { piece(a, d.at - d.w / 2); a = d.at + d.w / 2; }
    piece(a, L);
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
    } else if (p.kind === 'round') {
      this.roundWindow(p, o, t);
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
  // round (Esmer) window: a plaster plate with a circular hole fills the opening, brass ring, glazing bars
  roundWindow(p, o, t) {
    const k = this.k, fm = p.frame || MAT.brass(), a = p.at, w = p.w, h = p.h, rr = p.r, cy = p.y0 + h / 2;
    k.add(slab(`rwin${w}|${h}|${rr}|${t}`, (s) => { s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2); s.lineTo(-w / 2, h / 2); s.lineTo(-w / 2, -h / 2); const hp = new THREE.Path(); hp.absarc(0, 0, rr, 0, Math.PI * 2, true); s.holes.push(hp); }, t, 0), o.body, a, cy, -t / 2);
    k.add(cyl(rr, rr, t, 28, true), MAT.flat(p.reveal || '#d8cce4', 0.9, { side: THREE.DoubleSide }), a, cy, -t / 2, 0, { rx: Math.PI / 2 });
    k.add(torus(rr + 0.035, 0.045, 8, 32), fm, a, cy, 0.015);
    k.add(torus(rr + 0.1, 0.018, 5, 32), fm, a, cy, 0.01);
    for (let i = 0; i < 4; i++) { const b = (i / 4) * Math.PI * 2 + Math.PI / 4; k.add(sphere(0.022, 6, 4), fm, a + Math.cos(b) * (rr + 0.1), cy + Math.sin(b) * (rr + 0.1), 0.03); }
    const gz = -t * 0.5;
    k.add(P.disc(rr, 28), p.glass || MAT.glass('#f0e6ff', 0.28), a, cy, gz);
    k.add(torus(rr * 0.42, 0.016, 4, 20), fm, a, cy, gz + 0.02);
    for (let i = 0; i < 4; i++) k.add(rbox(0.03, rr * 2, 0.03, 0.008), fm, a, cy, gz + 0.02, 0, { rz: (i * Math.PI) / 4 });
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
    bounds: { min: [-w / 2 - 0.05, -0.05, -0.08], max: [w / 2 + 0.05, h + 0.05, 0.08] }, cell: 0.036, // (a dozen of them in the house: keep them light)
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
    } else if (kind === 'fort') {
      // a stone corridor of the old fortress, lit by a project lamp
      x.fillStyle = '#2a2e38'; x.fillRect(0, 0, W, H);
      for (let y = 0; y < H; y += 22) for (let xx = (y / 22) % 2 * 20; xx < W; xx += 40) { x.fillStyle = `rgba(${90 + (xx * 7 + y) % 30},${96 + (xx * 3) % 26},${110 + (y * 5) % 30},0.55)`; x.fillRect(xx + 2, y + 2, 36, 18); }
      const gl = x.createRadialGradient(128, 70, 4, 128, 70, 140); gl.addColorStop(0, 'rgba(120,240,255,0.55)'); gl.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gl; x.fillRect(0, 0, W, H);
      x.fillStyle = '#7a7890'; x.fillRect(0, 196, W, 60); x.fillStyle = 'rgba(0,0,0,0.35)'; for (let xx = 0; xx < W; xx += 32) x.fillRect(xx, 196, 2, 60);
      x.fillStyle = '#c8f8ff'; x.beginPath(); x.arc(128, 66, 9, 0, 7); x.fill();
    } else if (kind === 'zeelich') {
      // Zeelich: violet sky, pink cloud banks, Esmer domes
      g.addColorStop(0, '#b89ae0'); g.addColorStop(0.6, '#f0d8f0'); g.addColorStop(1, '#f8e8ec'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = 'rgba(255,240,250,0.85)'; for (const [cx, cy, rw] of [[60, 70, 60], [190, 50, 50], [130, 120, 70]]) { x.beginPath(); x.ellipse(cx, cy, rw, 13, 0, 0, 7); x.fill(); }
      x.fillStyle = '#8a6aa8'; for (const [cx, rw] of [[50, 46], [150, 60], [235, 40]]) { x.beginPath(); x.ellipse(cx, 200, rw, rw * 0.8, 0, Math.PI, 0); x.fill(); x.fillRect(cx - rw, 200, rw * 2, 60); }
      x.fillStyle = '#e8c8f0'; for (const cx of [50, 150, 235]) { x.beginPath(); x.arc(cx, 150, 5, 0, 7); x.fill(); }
      x.fillStyle = '#6a5088'; x.fillRect(0, 236, W, 20);
    } else if (kind === 'night') {
      g.addColorStop(0, '#1a2a4a'); g.addColorStop(1, '#3a5a8a'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    }
  });
  return M('view' + kind, () => { const m = new THREE.MeshBasicMaterial({ map: t }); m.userData.noShadow = true; return m; });
}

// ------------------------------------------------------------------ Twinsen's house
// the stairwell down to the cellar, in the hall against the west divider (house frame)
const HOUSE_STAIRS = { sx0: -4.15, sx1: -2.75, sz0: 7.6, sz1: 10.4 };
function buildHouse(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'house', 1000, 0);
  const R = B.room, k = B.k;
  // The plan follows the original's (LBA2 scene 0, measured): the family room in the north-east (this room,
  // 9 × 7 m, its own frame), Arthur's room (the original's nursery) and the reading room to the west, a hall with
  // the front door and the stairs down to the cellar to the south; low dividers with rounded wooden caps.
  const W = 9, D = 7, H = 3.0;
  const HX0 = -13.5, HX1 = 4.5, HZ0 = -3.5, HZ1 = 11.5; // the whole house
  R.view = 10.8;
  R.follow = 0.8; // (a big house: the camera keeps Twinsen in the middle)
  const doorX = 1.2; // the front door, in the hall's south wall
  const rail = MAT.wood('dark'), capM = MAT.wood('dark'), bodyM = MAT.plaster('#f0e4c8');
  const hcx = (HX0 + HX1) / 2, hcz = (HZ0 + HZ1) / 2;
  B.shell({
    W: HX1 - HX0, D: HZ1 - HZ0, H, t: 0.4, ox: hcx, oz: hcz,
    hole: [HOUSE_STAIRS.sx0, HOUSE_STAIRS.sz0, HOUSE_STAIRS.sx1, HOUSE_STAIRS.sz1],
    rimGaps: [{ x: 1.2, w: 1.3 }], // (the front door: doorX below)
    floor: MAT.planks('honey'), slab: MAT.rubble('grey'), rimMat: MAT.stone('sand', 1.4),
    body: bodyM, low: MAT.wainscot('honey'), dado: 1.05, rail, cap: capM, beam: MAT.wood('dark'),
    posts: MAT.wood('dark'), postsAt: (L) => [0.48, L - 0.48, L / 2],
    back: [
      { kind: 'window', at: 0.3 - hcx, w: 1.0, h: 1.15, y0: 1.1, curtain: '#c8452f', view: outsideView('sky') },
      { kind: 'window', at: 2.6 - hcx, w: 1.0, h: 1.15, y0: 1.1, curtain: '#c8452f', view: outsideView('citadel') },
      { kind: 'window', at: -9.5 - hcx, w: 1.1, h: 1.15, y0: 1.1, curtain: '#e9d8a6', view: outsideView('sky') },
    ],
    left: [
      { kind: 'window', at: 0.6 - hcz, w: 1.0, h: 1.15, y0: 1.1, curtain: '#e9d8a6', view: outsideView('sea') },
      { kind: 'window', at: 9.3 - hcz, w: 1.0, h: 1.15, y0: 1.1, curtain: '#c8452f', view: outsideView('sea') },
    ],
  });
  const BZ = -D / 2, LX = -W / 2;
  // inside walls: low dividers (the camera sees over them, as in LBA2's interiors)
  const divider = (x0, z0, x1, z1, doors = []) => B.partition(x0, z0, x1, z1, { h: 1.15, body: bodyM, cap: capM, rail, low: MAT.wainscot('honey'), dado: 0.9, doors });
  divider(LX, BZ, LX, HZ1, [{ at: 8.5, w: 1.3 }, { at: 13.1, w: 1.3 }]);   // family room and hall | Arthur's room, reading room
  divider(HX0, 7.0, LX, 7.0, [{ at: 4.4, w: 1.2 }]);                        // Arthur's room | reading room
  divider(LX, -BZ, 0.2, -BZ);                                               // family room | hall
  // the front door, cut away like the rest of the near wall (as LBA2 draws a door in a near wall): the low wall
  // opens, a jamb with a rounded cap on each side, a stone threshold and a step outside, daylight on the floor
  for (const sx of [-1, 1]) {
    k.add(rbox(0.2, 0.62, 0.48, 0.04), capM, doorX + sx * 0.75, 0.31, HZ1 + 0.2);
    k.add(rbox(0.26, 0.1, 0.54, 0.045), capM, doorX + sx * 0.75, 0.66, HZ1 + 0.2);
  }
  k.add(rbox(1.3, 0.06, 0.46, 0.02), MAT.stone('sand', 1.0), doorX, 0.02, HZ1 + 0.2);
  k.add(rbox(1.5, 0.1, 0.5, 0.03), MAT.stone('sand', 1.0), doorX, -0.06, HZ1 + 0.68);
  k.add(new THREE.PlaneGeometry(1.2, 1.6), new THREE.MeshBasicMaterial({ color: '#fff4d8', transparent: true, opacity: 0.18, depthWrite: false }), doorX, 0.015, HZ1 - 0.75, 0, { rx: -Math.PI / 2 });
  R.exits.push({ ...B.world(doorX, HZ1 - 0.15), r: 0.75, to: 'outdoor' });
  R.spawn = { ...B.world(doorX, HZ1 - 1.6), a: Math.PI };
  k.at(doorX, 0, HZ1 - 0.75, 0, () => P.rug(k, 1.3, 0.8, ['#8a3a2a', '#5a2418', '#d8a040', '#e8d0a0', '#2a140c'], 4));

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
  B.giver('firewood', -4.05, BZ + 0.55, ['life', 'magic'], 1, { r: 1.0, top: 0.6 });
  const stoveLight = B.light('#ff8a3a', 3.2, 4.5, stX, 0.6, BZ + 1.0);

  // --- dresser with plates
  const drX = -0.82;
  B.put(drX, BZ + 0.28, 0, P.dresser, { w: 1.1 });
  B.giver('dresser', drX, BZ + 0.28, ['money'], 5, { r: 1.3, top: 1.2 });

  // --- the sink: a stone basin on a cupboard, a brass tap from the wall (the opening: it coughs and runs warm),
  // Zoé's tray of seedlings and her watering can
  const skX = -2.06, skW = 1.18, skZ = BZ + 0.29, top = 0.88, bX = skX - 0.24;
  k.add(rbox(skW, 0.82, 0.52, 0.02), MAT.wood('honey'), skX, 0.41, skZ);
  for (const dx of [-0.29, 0.29]) k.add(rbox(0.5, 0.62, 0.02, 0.01), MAT.wood('dark'), skX + dx, 0.43, skZ + 0.26);
  for (const dx of [-0.08, 0.08]) k.add(sphere(0.018, 8, 6), MAT.brass(), skX + dx, 0.6, skZ + 0.28);
  const worktop = MAT.stone('sand', 1.4);
  k.add(rbox(skW + 0.04, 0.05, 0.56, 0.012), worktop, skX + 0.29, top - 0.025, skZ, 0, { sx: 0.5 });
  // the basin: four stone walls and a floor, set into the worktop
  const bw = 0.56, bd = 0.42, bh = 0.17, wt = 0.045;
  k.add(rbox(bw, 0.04, bd, 0.01), worktop, bX, top - 0.12, skZ);
  for (const s2 of [-1, 1]) {
    k.add(rbox(bw, bh, wt, 0.012), worktop, bX, top - 0.12 + bh / 2, skZ + s2 * (bd / 2 - wt / 2));
    k.add(rbox(wt, bh, bd, 0.012), worktop, bX + s2 * (bw / 2 - wt / 2), top - 0.12 + bh / 2, skZ);
  }
  k.add(rbox(0.08, 0.05, 0.56, 0.012), worktop, skX - 0.555, top - 0.025, skZ);
  for (const s2 of [-1, 1]) k.add(rbox(0.56, 0.05, 0.075, 0.012), worktop, bX, top - 0.025, skZ + s2 * 0.245);
  B.col(skX, skZ, skW / 2, 0.29, 0.9, { noStand: true });
  k.add(P.disc(0.03, 10), MAT.iron(), bX, top - 0.099, skZ, 0, { rx: -Math.PI / 2 }); // drain
  // the tap: a pipe out of the wall, a curved spout, a cross handle on a stem (animated)
  const brass = MAT.brass(), tapY = 1.3, spX = bX, spZ = skZ - 0.02;
  k.add(pipe([[spX, tapY, BZ + 0.01], [spX, tapY, BZ + 0.2], [spX, tapY - 0.1, BZ + 0.27]], 0.018, 0.04, 10), brass, 0, 0, 0);
  k.add(torus(0.03, 0.012, 6, 14), brass, spX, tapY, BZ + 0.03, 0, { rx: 0 });
  k.add(cyl(0.012, 0.012, 0.09, 8), brass, spX, tapY + 0.05, BZ + 0.15);
  const handle = k.pivot(spX, tapY + 0.1, BZ + 0.15, 0);
  for (const r of [0, Math.PI / 2]) { const bar = new THREE.Mesh(cyl(0.008, 0.008, 0.13, 6), brass); bar.rotation.set(0, r, Math.PI / 2); handle.add(bar); }
  for (let i = 0; i < 4; i++) { const knob = new THREE.Mesh(sphere(0.014, 8, 6), MAT.paint('#f2ecdc', 0.4)); knob.position.set(Math.cos(i * Math.PI / 2) * 0.065, 0, Math.sin(i * Math.PI / 2) * 0.065); handle.add(knob); }
  // water: a thin stream under the spout (scaled while it runs) and a little steam (shown when it runs warm)
  const spout = { x: spX, y: tapY - 0.13, z: BZ + 0.27 };
  const streamMat = new THREE.MeshStandardMaterial({ color: '#cfe8ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.75, emissive: '#5a8ab0', emissiveIntensity: 0.2 });
  const streamH = spout.y - (top - 0.1);
  const stream = new THREE.Mesh(cyl(0.012, 0.016, streamH, 8, true), streamMat);
  stream.geometry = stream.geometry.clone().translate(0, -streamH / 2, 0);
  stream.position.set(spout.x, spout.y, spout.z);
  stream.visible = false; stream.castShadow = false;
  B.group.add(stream);
  // the watering can stands in the basin under the spout
  k.at(bX + 0.06, top - 0.1, skZ + 0.05, -0.5, () => {
    const can = MAT.paint('#3f8a6a', 0.45);
    k.add(lathe([[0.001, 0], [0.08, 0], [0.085, 0.02], [0.085, 0.15], [0.07, 0.17], [0.001, 0.17]], 14), can, 0, 0, 0);
    k.add(pipe([[0.07, 0.04, 0], [0.16, 0.13, 0], [0.2, 0.19, 0]], 0.012, 0.03, 6), can, 0, 0, 0);
    k.add(torus(0.07, 0.01, 5, 12, Math.PI), can, -0.01, 0.17, 0, 0, { rx: 0 });
  });
  // seedlings in a wooden tray: eight small pots, two still empty, a trowel
  k.at(skX + 0.3, top, skZ + 0.02, 0.05, () => {
    k.add(rbox(0.44, 0.05, 0.3, 0.01), MAT.wood('pale'), 0, 0.025, 0);
    for (let i = 0; i < 8; i++) {
      const x = -0.15 + (i % 4) * 0.1, z = -0.07 + Math.floor(i / 4) * 0.14;
      k.add(lathe([[0.001, 0], [0.03, 0], [0.04, 0.06], [0.001, 0.06]], 8), MAT.flat('#b8623a', 0.8), x, 0.05, z);
      k.add(P.disc(0.034, 8), MAT.flat('#4a3220', 1), x, 0.105, z, 0, { rx: -Math.PI / 2 });
      if (i < 6) for (let j = 0; j < 2; j++) k.add(sphere(0.016, 6, 4), MAT.flat('#6aa83a', 0.7), x + (j - 0.5) * 0.02, 0.125 + j * 0.01, z, 0, { sy: 0.5 });
    }
    k.add(rbox(0.12, 0.012, 0.035, 0.004), MAT.steel(), 0.3, 0.007, 0.08, 0.6);
    k.add(cyl(0.012, 0.012, 0.08, 6), MAT.wood('dark'), 0.25, 0.012, 0.13, 0.6, { rz: Math.PI / 2 });
  });
  R.kitchen = { handle, stream, spout: { ...B.world(spout.x, spout.z), y: spout.y }, basin: { ...B.world(bX, skZ), y: top - 0.1 }, tray: { ...B.world(skX + 0.3, skZ), y: top + 0.1 }, tapY };
  // --- the cupboard (the magic ball is in here, like LBA2's opening)
  const cupZ = -1.6;
  B.put(LX + 0.34, cupZ, Math.PI / 2, P.wardrobe, { w: 1.4, d: 0.62, h: 2.15 });
  R.searches.push({ id: 'cupboard', ...B.world(LX + 1.3, cupZ), r: 1.4 });

  // --- bed, nightstand, Dino-Fly painting
  const bedZ = 2.2;
  B.put(LX + 1.1, bedZ, -Math.PI / 2, P.bed, { w: 1.45, l: 2.15 });
  k.at(-3.0, 1.85, BZ + 0.02, 0, () => P.frame(k, 1.0, 0.75, P.painting('dinofly')));
  B.put(LX + 0.3, 0.95 + 0.0, Math.PI / 2, P.nightstand, {});
  B.giver('nightstand', LX + 0.3, 0.95, ['life', 'magic'], 1, { r: 1.0, top: 0.7 });
  P.candle(k, LX + 0.3, 0.62, 0.9);
  P.bookStack(k, LX + 0.28, 0.62, 1.12, 2, 5);
  // under the side window: a low chest with a plant
  B.put(LX + 0.32, 0.1, Math.PI / 2, P.chest, { w: 0.8, d: 0.46, h: 0.44, pal: 'honey' });
  B.giver('chest', LX + 0.32, 0.1, ['money', 'life', 'magic'], 3, { r: 1.1, top: 0.6 });
  k.at(LX + 0.32, 0.6, -0.05, 0, () => P.pottedPlant(k, { s: 0.6 }));

  // --- table, chairs, rug, lamp
  const tX = -0.45, tZ = 0.55;
  k.at(tX, 0, tZ, 0, () => P.rug(k, 3.3, 2.4, ['#a8382a', '#2a4a7a', '#e0b050', '#f0e0b8', '#3a1a12'], 1));
  B.put(tX, tZ, 0, P.table, { w: 1.5, d: 0.9 }, { noStand: true, seeThrough: true });
  B.put(tX - 1.05, tZ, Math.PI / 2, P.chair, { cushion: '#c8452f' }, { noStand: true, seeThrough: true });
  B.put(tX + 1.05, tZ + 0.05, -Math.PI / 2 + 0.15, P.chair, { cushion: '#c8452f' }, { noStand: true, seeThrough: true });
  B.put(tX + 0.2, tZ + 0.82, Math.PI - 0.1, P.chair, { cushion: '#3b6fc4' }, { noStand: true, seeThrough: true });
  // table dressing: bread, bowl, jug, mugs — pushed to the front half: Twinsen is mending the reading lamp
  k.add(lathe([[0.001, 0], [0.14, 0], [0.16, 0.06], [0.17, 0.08], [0.001, 0.06]], 16), MAT.flat('#f2ead6', 0.3), tX - 0.5, 0.78, tZ + 0.2);
  for (let i = 0; i < 4; i++) k.add(sphere(0.045, 8, 6), MAT.flat(['#e03a3a', '#e8c040', '#e03a3a', '#7ab040'][i], 0.4), tX - 0.5 + Math.cos(i * 1.6) * 0.06, 0.86, tZ + 0.2 + Math.sin(i * 1.6) * 0.06);
  P.jar(k, tX + 0.15, 0.78, tZ + 0.28, 'vase', '#3a6fb0', 0.9);
  // the lamp under repair: its base, the shade set aside, a cloth with screws, a spare bulb
  k.at(tX - 0.05, 0.78, tZ - 0.16, 0.4, () => P.deskLamp(k, { shade: '#2f8a4a' }));
  k.add(rbox(0.3, 0.004, 0.22, 0.002), MAT.cloth('#e8dcc0', '#c8b890'), tX + 0.32, 0.782, tZ - 0.18, 0.2);
  for (let i = 0; i < 4; i++) k.add(cyl(0.006, 0.006, 0.025, 5), MAT.steel(), tX + 0.26 + i * 0.035, 0.79, tZ - 0.2 + (i % 2) * 0.03, 0, { rz: Math.PI / 2 });
  k.add(sphere(0.035, 10, 8), MAT.glass('#fff6d8', 0.6), tX + 0.42, 0.815, tZ - 0.1);
  // the screwdriver he works with (picked up / put down in the opening)
  const screwdriver = new THREE.Group();
  { const sk = new Kit(screwdriver); P.screwdriver(sk, 0, 0, 0, 0, '#c8452f'); sk.flush(); }
  const sdRest = { x: tX + 0.18, y: 0.775, z: tZ - 0.3, ry: 0.3 };
  screwdriver.position.set(sdRest.x, sdRest.y, sdRest.z); screwdriver.rotation.y = sdRest.ry;
  B.group.add(screwdriver);
  R.table = { screwdriver, sdRest, ...B.world(tX, tZ), top: 0.78 };
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
  B.giver('toychest', 3.85, 2.85, ['money'], 3, { r: 1.1, top: 0.6 });
  k.at(1.95, 0.0, 2.75, 0.3, () => P.toyBlocks(k));
  k.at(3.05, 0.0, 1.75, 0.6, () => P.toyBoat(k));
  // Arthur's model boat in progress: a carved hull, the mast and sail not fitted yet, a pot of paint, shavings
  const abX = 1.8, abZ = 1.82;
  k.at(abX, 0.0, abZ, 0.75, () => {
    const hull = MAT.paint('#3b78d8', 0.55), wood = MAT.wood('pale');
    k.add(slab('mhull', (s2) => { s2.moveTo(-0.2, 0.07); s2.quadraticCurveTo(-0.19, 0, -0.08, 0); s2.lineTo(0.12, 0); s2.quadraticCurveTo(0.21, 0.02, 0.24, 0.08); s2.lineTo(-0.2, 0.08); }, 0.11, 0.01), hull, 0, 0, 0);
    k.add(rbox(0.33, 0.015, 0.09, 0.005), wood, 0, 0.082, 0);
    k.add(lathe([[0.001, 0], [0.035, 0], [0.035, 0.05], [0.001, 0.05]], 10), MAT.paint('#f2ecdc', 0.5), 0.12, 0, 0.2);
    k.add(P.disc(0.03, 10), MAT.paint('#e0503a', 0.3), 0.12, 0.052, 0.2, 0, { rx: -Math.PI / 2 });
    for (let i = 0; i < 6; i++) k.add(rbox(0.03, 0.004, 0.012, 0.002), wood, -0.12 + i * 0.05, 0.002, -0.17 + (i % 3) * 0.03, i);
  });
  // the mast with its paper sail (in Arthur's hand during the opening, then fitted)
  const mast = new THREE.Group();
  { const m1 = new THREE.Mesh(cyl(0.006, 0.007, 0.3, 6), MAT.wood('pale')); m1.position.y = 0.15; mast.add(m1);
    const sail = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.005, 0.27, 0), new THREE.Vector3(0.005, 0.06, 0), new THREE.Vector3(0.15, 0.08, 0)]), MAT.flat('#f8f2e2', 0.8, { side: THREE.DoubleSide }));
    sail.geometry.computeVertexNormals(); mast.add(sail); }
  const mastRest = { ...{ x: abX + Math.sin(0.75) * 0.02, z: abZ + Math.cos(0.75) * 0.02 }, y: 0.08, ry: 0.75 };
  mast.position.set(mastRest.x, mastRest.y, mastRest.z); mast.rotation.y = mastRest.ry;
  B.group.add(mast);
  R.boat = { mast, mastRest, ...B.world(abX, abZ) };
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

  buildHouseWings(B, R, { HX0, HX1, HZ0, HZ1, LX, BZ, doorX });
  dressHomeLife(B, R);   // (twelve years of family life: src/game/homelife.js)

  R.updaters.push((dt, t) => { stoveLight.intensity = stoveLight.userData.base * (0.85 + Math.sin(t * 11) * 0.1 + Math.sin(t * 7) * 0.05); });
  R.npcSpots = { zoe: { ...B.world(-2.32, -2.62), a: 0.6 }, arthur: { ...B.world(2.15, 2.15), a: -2.4 }, twinsen: { ...B.world(-0.45, -0.25), a: 0 } };
  return B.finish();
}

// The rest of the house after the original's plan: Arthur's room (the nursery in LBA2, with its blue wallpaper of
// gold stars), the reading room with its bookcases and armchair, the hall with armchairs, the family portrait and
// the stairs down to the cellar. The original's six givers: Arthur's toy chest (15 kashes), the reading room's
// bookcase (magic) and armchair, the hall's armchair, the family room's dresser, the bed.
function buildHouseWings(B, R, { HX0, HX1, HZ0, HZ1, LX, BZ, doorX }) {
  const k = B.k, H = 3.0;
  // Arthur's room: x HX0..LX, z HZ0..7
  const paper = MAT.paper('#2e6f88', '#e8c86a', 'star');
  k.add(plane(LX - HX0 - 0.05, H - 1.12), paper, (HX0 + LX) / 2, 1.12 + (H - 1.12) / 2, HZ0 + 0.012);
  k.at(HX0 + 0.012, 0, (HZ0 + 7) / 2, Math.PI / 2, () => k.add(plane(7 - HZ0 - 0.05, H - 1.12), paper, 0, 1.12 + (H - 1.12) / 2, 0));
  B.put(HX0 + 1.0, 4.9, -Math.PI / 2, P.bed, { w: 1.05, l: 1.95, quilt: ['#3b78d8', '#e9c46a', '#e0503a', '#f2ead6', '#3a8a5a'], key: 'arthur' });
  B.put(HX0 + 0.3, 3.55, Math.PI / 2, P.nightstand, {});
  P.candle(k, HX0 + 0.3, 0.62, 3.5);
  B.put(-8.4, HZ0 + 0.42, 0, P.desk, { w: 1.4, d: 0.65, pal: 'honey', leather: '#3b6fc4' });
  B.put(-8.4, HZ0 + 1.2, Math.PI, P.chair, { cushion: '#3b78d8' }, { noStand: true, seeThrough: true });
  k.at(-8.9, 0.78, HZ0 + 0.35, 0.3, () => P.deskLamp(k, { shade: '#e0503a' }));
  k.at(-7.9, 0.78, HZ0 + 0.4, -0.4, () => P.toyBoat(k));
  k.at(-11.2, 1.75, HZ0 + 0.15, 0, () => P.wallShelf(k, { w: 1.4, d: 0.24 }));
  for (const [x, c] of [[-11.7, '#e0503a'], [-11.25, '#3b78d8'], [-10.75, '#e9c46a']]) k.at(x, 1.77, HZ0 + 0.17, 0.2, () => P.spinningTop(k, 0, 0, c));
  B.put(HX0 + 0.42, -1.6, Math.PI / 2, P.chest, { w: 0.85, d: 0.5, h: 0.46, pal: 'red', band: MAT.paint('#e9c46a', 0.5) });
  B.giver('arthurchest', HX0 + 0.42, -1.6, ['money'], 15, { r: 1.2, top: 0.6 });
  k.at(-10.0, 0, 1.0, 0.1, () => P.rug(k, 2.6, 1.9, ['#3b78d8', '#e9c46a', '#e0503a', '#f8f0d8', '#1a3a6a'], 9));
  k.at(-9.6, 0, 1.3, 0.4, () => P.toyBlocks(k));
  k.at(-6.0, 0, -2.6, 0, () => P.pottedPlant(k, { s: 0.9 }));
  B.giver('arthurbed', HX0 + 1.0, 4.9, ['life'], 1, { r: 1.4, top: 0.6 });
  B.light('#ffe0b0', 6, 9, -9.0, 2.3, 1.0);
  // the reading room: x HX0..LX, z 7..HZ1
  for (const [z, sd] of [[8.1, 2], [9.3, 5], [10.5, 7]]) B.put(HX0 + 0.22, z, Math.PI / 2, P.bookcase, { w: 1.1, h: 2.1, pal: 'dark', seed: sd });
  B.giver('bookcase', HX0 + 0.22, 9.3, ['magic'], 10, { r: 1.3, top: 1.8 });
  B.put(-10.6, 9.6, -Math.PI / 2 - 0.4, P.armchair, {});
  B.put(-10.7, 8.0, 0, P.floorLamp, {});
  B.light('#ffcf90', 3, 5, -10.7, 1.5, 8.0);
  B.put(-11.5, 10.8, 0, P.sideTable, {});
  P.bookStack(k, -11.5, 0.62, 10.8, 1, 4);
  B.giver('readchair', -10.6, 9.6, ['money', 'life', 'magic'], 5, { r: 1.2, top: 0.7 });
  k.at(-9.4, 0, 9.4, 0, () => P.rug(k, 2.4, 2.0, ['#a8382a', '#2a4a7a', '#e0b050', '#f0e0b8', '#3a1a12'], 3));
  B.light('#ffe0b0', 4, 7, -9.0, 2.3, 9.3);
  // the hall: x LX..HX1, z -BZ..HZ1 — armchairs round a rug, the family portrait, the stairs down
  k.at(-0.8, 0, 6.3, 0, () => P.rug(k, 3.2, 2.4, ['#2a4a7a', '#a8382a', '#e9c46a', '#f2ead6', '#1a2a3a'], 5));
  B.put(-1.9, 5.6, Math.PI / 2 + 0.35, P.armchair, {});
  B.put(0.4, 5.6, -Math.PI / 2 - 0.35, P.armchair, {});
  B.put(-0.75, 5.1, 0, P.sideTable, {});
  P.candle(k, -0.75, 0.62, 5.1);
  B.giver('hallchair', -1.9, 5.6, ['life', 'magic'], 7, { r: 1.2, top: 0.7 });
  B.put(HX1 - 0.32, 6.5, -Math.PI / 2, P.dresser, { w: 1.1 });
  k.at(HX1 - 0.02, 1.8, 6.5, -Math.PI / 2, () => P.frame(k, 0.75, 0.9, P.painting('portrait'), { mat: MAT.wood('dark') }));
  k.at(3.4, 0, HZ1 - 0.5, 0, () => P.pottedPlant(k, { kind: 'spiky', s: 1.1, potColor: '#3a6fb0' }));
  // the stairs down: a stairwell cut in the floor against the west divider (shell hole), a railing, and the
  // steps going down from its north edge into the dark
  const { sx0, sx1, sz0, sz1 } = HOUSE_STAIRS;
  for (let i = 0; i < 6; i++) {
    const top = -0.13 * (i + 1), z = sz0 + 0.235 + i * 0.45;
    k.add(rbox(sx1 - sx0 - 0.04, top + 0.82, 0.47, 0.012), MAT.wood('honey'), (sx0 + sx1) / 2, (top - 0.82) / 2, z);
    B.col((sx0 + sx1) / 2, z, (sx1 - sx0) / 2, 0.35, top, { stair: true, bottom: -3 }); // (overlapping: no gap between treads)
  }
  P.railing(k, [[sx1 + 0.06, sz0 - 0.06], [sx1 + 0.06, sz1], [sx0, sz1]], { h: 0.95, mat: MAT.wood('dark'), step: 0.7 });
  B.col(sx1 + 0.06, (sz0 + sz1) / 2, 0.06, (sz1 - sz0) / 2 + 0.06, 1.0, { seeThrough: true, noStand: true });
  B.col((sx0 + sx1) / 2, sz1 + 0.04, (sx1 - sx0) / 2 + 0.06, 0.06, 1.0, { seeThrough: true, noStand: true });
  R.exits.push({ ...B.world((sx0 + sx1) / 2, sz0 + 1.3), r: 0.7, room: 'cellar' });
  R.entries = { cellar: { ...B.world((sx0 + sx1) / 2 + 1.4, sz0 + 1.2), a: Math.PI / 2 } }; // coming up the stairs
  B.light('#ffe0b0', 5, 8, 0.5, 2.3, 7.5);
  B.light('#e8f4ff', 3, 5, doorX, 1.6, HZ1 - 1.0);
}

// The cellar under Twinsen's house (LBA2 scene 1): Twinsen's training room — a target on the wall, a straw
// dummy, bookshelves, the radio set on a sideboard, a barrel and crates, the Dino-Fly poster, a bench.
function buildCellar(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'cellar', 1700, 0);
  const R = B.room, k = B.k;
  const W = 11, D = 9, H = 2.8;
  R.view = 9.6; R.follow = 0.22;
  B.shell({
    W, D, H, t: 0.4,
    floor: MAT.tiles('#b8784a', '#a86a40', '#5a3a28', true, 6), slab: MAT.rubble('grey'), rimMat: MAT.stone('grey', 1.4),
    body: MAT.rubble('grey'), low: null, rail: MAT.wood('dark'), cap: MAT.wood('honey'),
  });
  const BZ = -D / 2, LX = -W / 2;
  // the stairs up: along the south end of the west wall, climbing west to the wall (where the hall's stairwell is
  // above); you walk up them and leave at the top
  const sz = D / 2 - 0.95, sw = 1.25, N = 6, run = 0.4;
  for (let i = 0; i < N; i++) {
    const hgt = 0.2 * (i + 1), x = LX + 0.4 + (N - 1 - i) * run + run / 2;
    k.add(rbox(run + 0.02, hgt, sw, 0.015), MAT.wood('honey'), x, hgt / 2, sz);
    B.col(x, sz, run / 2 + 0.06, sw / 2, hgt, { stair: true });
  }
  R.exits.push({ ...B.world(LX + 0.65, sz), r: 0.6, room: 'house', back: true });
  R.spawn = { ...B.world(LX + 0.4 + N * run + 0.9, sz), a: Math.PI / 2 };
  // the target on the north wall, the dummy before it
  k.at(-1.5, 1.55, BZ + 0.05, 0, () => {
    for (const [r, c] of [[0.5, '#f2ead6'], [0.4, '#2a2420'], [0.3, '#f2ead6'], [0.2, '#2a2420'], [0.1, '#e03a3a']]) k.add(P.disc(r, 28), MAT.paint(c, 0.7), 0, 0, 0.01 + (0.5 - r) * 0.01);
    k.add(torus(0.51, 0.04, 6, 28), MAT.wood('dark'), 0, 0, 0.02);
  });
  k.at(-1.5, 0, BZ + 2.4, 0, () => {
    const straw = MAT.flat('#d8b860', 0.95), sack = MAT.cloth('#c8b890', '#8a7a58');
    k.add(cyl(0.04, 0.05, 1.0, 8), MAT.wood('dark'), 0, 0.5, 0);
    k.add(rbox(0.6, 0.14, 0.6, 0.04), MAT.wood('dark'), 0, 0.07, 0);
    k.add(lathe([[0.001, 0], [0.22, 0.02], [0.26, 0.3], [0.24, 0.55], [0.12, 0.62], [0.001, 0.64]], 12), sack, 0, 0.75, 0);
    k.add(sphere(0.17, 12, 10), sack, 0, 1.55, 0);
    for (const s of [-1, 1]) k.add(cyl(0.06, 0.06, 0.5, 8), straw, s * 0.32, 1.15, 0, 0, { rz: s * 1.2 });
    k.add(P.disc(0.06, 12), MAT.paint('#e03a3a', 0.6), 0, 1.58, 0.17);
  });
  B.ccol(-1.5, BZ + 2.4, 0.32, 1.7);
  // bookshelves and a chair on the west wall, the radio set on a sideboard on the north wall
  for (const [z, sd] of [[-2.2, 4], [-1.0, 8]]) B.put(LX + 0.22, z, Math.PI / 2, P.bookcase, { w: 1.1, h: 1.9, pal: 'honey', seed: sd });
  B.put(LX + 0.9, 0.6, Math.PI / 2, P.chair, { cushion: '#2f6f78' }, { noStand: true, seeThrough: true });
  B.put(2.2, BZ + 0.36, 0, P.dresser, { w: 1.6 });
  k.at(2.2, 1.0, BZ + 0.3, 0, () => P.radio(k, { s: 1.1 }));
  B.put(4.6, BZ + 0.5, 0, P.barrel, { r: 0.34, h: 0.9, pal: 'honey' });
  B.giver('barrel', 4.6, BZ + 0.5, ['money', 'life', 'magic'], 3, { r: 1.1, top: 1.0 });
  for (const [x, z, s] of [[3.8, BZ + 0.45, 0.6], [4.0, BZ + 1.2, 0.5]]) B.put(x, z, 0.2, P.crate, s);
  B.giver('crates', 3.9, BZ + 0.8, ['life', 'magic'], 2, { r: 1.2, top: 0.7 });
  k.at(W / 2 - 0.02, 1.6, -1.0, -Math.PI / 2, () => P.frame(k, 0.8, 1.0, P.painting('dinofly')));
  B.put(W / 2 - 0.6, 0.6, -Math.PI / 2, P.bench, { w: 1.4 });
  B.put(-1.4, 1.3, 0.5, P.armchair, {});
  B.put(0.6, 1.8, -0.3, P.armchair, {});
  B.put(-0.4, 0.6, 0, P.floorLamp, {});
  B.light('#ffd8a0', 6, 10, 0, 2.2, -0.5);
  B.light('#ffcf90', 3, 5, -0.4, 1.5, 0.6);
  return B.finish();
}

// ------------------------------------------------------------------ the well
// LBA2's caves (#34–36): dressed slate blocks, rough slate outcrops, clusters of
// onion-shaped stalagmites, round blue rocks, iron railings between stone posts.
const stalTex = () => P.canvasTex(16, 256, (x, W, H) => {
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#d8c0a8'); g.addColorStop(0.45, '#b89880'); g.addColorStop(0.85, '#6a5048'); g.addColorStop(1, '#3a2a28');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let y = 10; y < H; y += 22) { x.fillStyle = 'rgba(60,40,30,0.35)'; x.fillRect(0, y, W, 4); x.fillStyle = 'rgba(255,240,220,0.3)'; x.fillRect(0, y + 4, W, 3); }
});
function stalagmites(k, n, s, seed, mat) {
  for (let i = 0; i < n; i++) {
    const a = i * 2.4 + seed, rr = i === 0 ? 0 : 0.18 + ((i * 37 + seed * 11) % 10) / 10 * 0.32 * s, h = s * (1.25 - (rr / s) * 1.1) * (0.75 + ((i * 53 + seed) % 7) / 14);
    const prof = [[0.001, 0], [0.13, 0], [0.15, 0.07], [0.1, 0.18], [0.12, 0.28], [0.075, 0.42], [0.09, 0.52], [0.05, 0.66], [0.06, 0.74], [0.025, 0.88], [0.001, 1.0]].map(([px, py]) => [px * Math.max(0.6, h) * 0.9, py * h]);
    k.add(lathe(prof, 10), mat, Math.cos(a) * rr, 0, Math.sin(a) * rr, a, { rx: (Math.cos(a * 3) * 0.08), rz: Math.sin(a * 2) * 0.08 });
  }
}
function slateRock(seed, colors = ['#5c626a', '#464b52']) {
  return soft({
    key: 'slaterock' + seed + colors[0],
    prims: [0, 1, 2, 3].map((i) => { const a = i * 1.9 + seed; return { type: 'ell', c: i ? [Math.cos(a) * 0.45, 0.2 + (i % 2) * 0.2, Math.sin(a) * 0.4] : [0, 0.3, 0], r: i ? [0.45, 0.4, 0.42] : [0.75, 0.55, 0.65], group: 'r', mat: 'r', wobble: (x, y, z) => (Math.abs(Math.sin(x * 6.1 + y * 2.3 + seed)) + Math.abs(Math.sin(z * 5.3 - x * 1.7)) + Math.abs(Math.sin(y * 7.1 + z * 2.9))) * 0.04 - 0.06 }; }),
    groups: { r: 0.15 }, colors: { r: colors[0] },
    paint: (p, m, c) => { c.lerp(new THREE.Color(colors[1]), 0.5 + Math.sin(p.x * 9 + p.z * 7) * Math.sin(p.y * 11) * 0.5); c.offsetHSL(0, 0, (p.y - 0.3) * 0.12); },
    bounds: { min: [-1.3, -0.4, -1.2], max: [1.3, 1.1, 1.2] }, cell: 0.07,
  });
}
function blueRocks() {
  return soft({
    key: 'bluerocks',
    prims: [[0, 0.2, 0, 0.24], [0.33, 0.15, 0.1, 0.18], [-0.28, 0.16, 0.16, 0.19], [0.1, 0.13, -0.3, 0.16], [-0.12, 0.42, 0.02, 0.15], [0.2, 0.1, 0.36, 0.12]].map(([x, y, z, r], i) => ({ type: 'ell', c: [x, y, z], r: [r, r * 0.9, r], group: 'b' + i, mat: 'b', wobble: (a, b, c) => Math.sin(a * 30 + c * 20) * 0.006 })),
    groups: { b0: 0.01, b1: 0.01, b2: 0.01, b3: 0.01, b4: 0.01, b5: 0.01 }, joinK: 0.015, colors: { b: '#2f5f96' },
    paint: (p, m, c) => { c.offsetHSL(0, 0, (p.y - 0.15) * 0.5 + Math.sin(p.x * 40) * 0.02); },
    bounds: { min: [-0.6, -0.1, -0.6], max: [0.6, 0.65, 0.6] }, cell: 0.025,
  });
}
function buildWell(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'well', 1100, 0);
  const R = B.room, k = B.k;
  const W = 21, D = 14, H = 4;
  R.view = 15;
  R.follow = 0.6;
  R.cave = true;
  const slate = MAT.stone('slate', 2), slate1 = MAT.stone('slate', 1.2), iron = MAT.iron();
  B.shell({
    W, D, H, t: 0.5, slabH: 0.9,
    floor: MAT.stone('slate', 3.6), slab: MAT.rubble('slate'), rimMat: MAT.rubble('slate'),
    body: slate, rail: MAT.stone('slate', 1), cap: MAT.stone('slate', 1.4), rimH: 0.55,
  });
  const rockMat = M('slaterockmat', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }));
  const stalMat = M('stalmat', () => new THREE.MeshStandardMaterial({ map: stalTex(), roughness: 0.6 }));
  // dressed slate blocks and rough outcrops along the far walls
  const block = (x, z, w, d, h, ry = 0) => {
    k.add(rbox(w, h, d, 0.07), slate1, x, h / 2, z, ry, { jit: true });
    k.add(rbox(w - 0.22, 0.05, d - 0.22, 0.02), MAT.rubble('slate'), x, h + 0.01, z, ry);
    B.col(x, z, w / 2, d / 2, h, { rot: ry });
  };
  [[-9.6, -6.35, 1.7, 1.3, 1.9], [-7.55, -6.5, 1.4, 1.0, 1.0], [-4.6, -6.5, 1.6, 1.0, 1.4], [-1.3, -6.5, 1.4, 1.0, 0.85],
    [-9.85, -2.2, 1.3, 1.6, 1.25], [-9.85, 0.4, 1.3, 1.4, 2.1], [-9.9, 6.2, 1.2, 1.2, 0.8]].forEach(([x, z, w, d, h]) => block(x, z, w, d, h));
  k.add(rbox(1.2, 0.8, 1.0, 0.06), slate1, -9.6, 1.9 + 0.4, -6.4, 0.1, { jit: true });
  for (const [x, z, s, ry, sd] of [[-10.2, -4.6, 1.2, 0.4, 1], [-10.1, 3.4, 1.3, 1.2, 2], [-6.0, -6.9, 1.1, 2.0, 3], [1.4, -6.85, 1.2, 0.7, 1], [9.8, -1.6, 1.0, 2.6, 2], [-10.2, 1.7, 0.9, 0.3, 3]]) {
    k.add(slateRock(sd), rockMat, x, 0, z, ry, { sx: s, sy: s * 1.3, sz: s });
    B.ccol(x, z, 0.75 * s, 1.1 * s * 1.3);
  }
  // dividing slate wall with a gap the crystals have grown shut
  const gx = 4.5;
  for (let i = 0; i < 4; i++) { const z = -6.4 + i * 1.3, h = H - (i % 2) * 0.35; k.add(rbox(1.2, h, 1.28, 0.08), slate1, gx, h / 2, z, (i % 2) * 0.03, { jit: true }); }
  for (let i = 0; i < 4; i++) { const z = 2.45 + i * 1.3, h = 1.1 - (i % 2) * 0.12; k.add(rbox(1.2, h, 1.28, 0.08), slate1, gx, h / 2, z, (i % 2) * 0.04, { jit: true }); }
  B.col(gx, -4.4, 0.6, 2.6, H);
  B.col(gx, 4.4, 0.6, 2.6, H);
  // pillars of stacked slate drums on a plinth
  for (const [px, pz, pr] of [[-3, 1.5, 0.7], [1.5, -2.5, 0.6], [-6.5, -2, 0.8]]) {
    k.add(rbox(pr * 2.3, 0.35, pr * 2.3, 0.06), slate1, px, 0.175, pz, 0.2);
    let y = 0.35;
    for (let i = 0; y < H - 0.1; i++) { const h = Math.min(0.9 + (i % 2) * 0.25, H - y); k.add(lathe([[pr * 0.82, 0], [pr * 0.86, 0.04], [pr * 0.86, h - 0.04], [pr * 0.82, h]], 12), slate1, px, y, pz, i * 0.7); y += h; }
    k.add(rbox(pr * 2.2, 0.3, pr * 2.2, 0.06), slate1, px, H - 0.15, pz, 0.2);
    B.ccol(px, pz, pr, H);
  }
  // stalagmite clusters and blue rocks
  for (const [x, z, n, s, sd] of [[-8.6, -5.4, 6, 1.0, 1], [-2.6, -5.95, 5, 0.9, 2], [3.25, -6.2, 7, 1.1, 3], [-4.0, 2.4, 4, 0.8, 4], [6.6, 5.0, 6, 1.0, 5], [9.7, 1.6, 5, 1.0, 6], [-6.9, 6.1, 5, 0.8, 7], [2.3, 6.2, 4, 0.75, 8], [-9.1, -3.6, 4, 0.8, 9]]) {
    k.at(x, 0, z, 0, () => stalagmites(k, n + 2, s * 1.45, sd, stalMat));
    B.ccol(x, z, 0.35 + s * 0.45, s * 1.6);
  }
  for (const [x, z, s, ry] of [[-0.3, -6.25, 1.2, 0], [9.6, -3.4, 1.4, 1], [-9.6, 4.9, 1.2, 2], [5.75, 2.6, 1.1, 0.5]]) { k.add(blueRocks(), softMat, x, 0, z, ry, { sx: s, sy: s, sz: s }); B.ccol(x, z, 0.45 * s, 0.6 * s); }
  // iron railing between stone posts along the near ledge
  const rz = D / 2 - 0.35;
  const posts = [-9.4, -6.6, -3.8, -1.0, 1.8];
  for (const x of posts) {
    k.add(rbox(0.36, 1.25, 0.36, 0.05), slate1, x, 0.625, rz);
    k.add(rbox(0.46, 0.12, 0.46, 0.04), slate1, x, 1.3, rz);
    k.add(torus(0.13, 0.02, 4, 12), iron, x, 1.4, rz, 0, { rx: Math.PI / 2 });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; k.add(cyl(0.008, 0.02, 0.14, 4), iron, x + Math.cos(a) * 0.13, 1.47, rz + Math.sin(a) * 0.13); }
  }
  for (let i = 1; i < posts.length; i++) {
    const a = posts[i - 1] + 0.2, b = posts[i] - 0.2;
    for (const y of [0.15, 0.95]) k.add(cyl(0.018, 0.018, b - a, 6), iron, (a + b) / 2, y, rz, 0, { rz: Math.PI / 2 });
    for (let x = a + 0.12; x < b; x += 0.16) { k.add(cyl(0.012, 0.012, 1.0, 5), iron, x, 0.55, rz); k.add(lathe([[0.001, 0], [0.022, 0.02], [0.001, 0.08]], 5), iron, x, 1.05, rz); }
  }
  B.col((posts[0] + posts[posts.length - 1]) / 2, rz, (posts[posts.length - 1] - posts[0]) / 2 + 0.2, 0.2, 1.3, { seeThrough: true });
  // blue-globe lantern posts
  const lantern = (x, z) => {
    k.add(lathe([[0.12, 0], [0.12, 0.12], [0.05, 0.2], [0.04, 1.6], [0.07, 1.65], [0.06, 1.7]], 10), iron, x, 0, z);
    k.add(sphere(0.14, 12, 10), MAT.glow('#bfe4ff', '#4a9aff', 1.6), x, 1.84, z);
    k.add(lathe([[0.001, 0.0], [0.1, 0.0], [0.04, 0.05], [0.001, 0.06]], 10), iron, x, 1.96, z);
    B.ccol(x, z, 0.14, 2.0);
    B.light('#8ac4ff', 3.5, 6, x, 1.9, z);
  };
  lantern(-1.2, 5.2); lantern(7.2, 2.4);

  // warm puddles ringed with stones, with steam
  const puddleMat = new THREE.MeshStandardMaterial({ color: '#4fb8c8', emissive: '#1a6a7a', emissiveIntensity: 0.6, roughness: 0.1, transparent: true, opacity: 0.85 });
  const puddles = [[-6, 3, 1.4], [-1.5, -4.5, 1.1], [2, 3.5, 1.3], [7.5, -3.5, 1.2]];
  for (const [px, pz, pr] of puddles) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(pr, 24), puddleMat);
    m.rotation.x = -Math.PI / 2; m.position.set(px, 0.025, pz); B.group.add(m);
    const n = Math.round(pr * 9);
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + px; k.add(sphere(0.13 + (i % 3) * 0.04, 7, 5), slate1, px + Math.cos(a) * (pr + 0.06), 0.02, pz + Math.sin(a) * (pr + 0.06), a, { sy: 0.45 }); }
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
  const crystalMat = (c, e, kk = 1.5) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: kk, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.92 });
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
  [[-9.8, 1.6, -4], [-9.85, 2.4, 3], [-3, 1.9, -6.7], [2.5, 1.4, -6.7], [-6, 0.4, -6.5]].forEach(([x, y, z], i) => cluster(x, y, z, 5, 0.35, i % 2 ? violet : cyan));

  // three crystal nodes on carved slate pedestals, to wake with the magic ball
  R.nodes = [];
  for (const [nx, nz] of [[-5, -4], [0.5, -5.2], [1, 4.8]]) {
    k.add(lathe([[0.001, 0], [0.66, 0], [0.68, 0.1], [0.56, 0.18], [0.44, 0.3], [0.4, 0.62], [0.5, 0.72], [0.58, 0.84], [0.56, 0.9], [0.001, 0.9]], 14), slate1, nx, 0, nz);
    k.add(torus(0.5, 0.03, 5, 20), iron, nx, 0.86, nz, 0, { rx: Math.PI / 2 });
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
  // the cracked slate around the vein
  for (const [x, s, sd] of [[5.9, 1.0, 1], [10.0, 1.1, 3]]) k.add(slateRock(sd), rockMat, x, 0, -D / 2 + 0.55, x, { sx: s, sy: s * 1.6, sz: s * 0.8 });
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
  k.add(cyl(0.045, 0.045, 6, 6), MAT.cloth('#c9a66b', '#7a5a30'), ropeX, 3, ropeZ);
  for (let i = 0; i < 3; i++) k.add(torus(0.18 - i * 0.03, 0.04, 5, 14), MAT.cloth('#c9a66b', '#7a5a30'), ropeX + 0.1, 0.05 + i * 0.07, ropeZ + 0.05, 0, { rx: Math.PI / 2 });
  // The daylight from the well mouth: an open cone drawn additively from its outside faces only, so there is no
  // inner wall to read as a cap. Its strength falls off toward the silhouette (view angle), into the floor and
  // above the walls, and slow streaks drift down it; dust motes sink through it and it lands as a soft pool on the
  // floor. Three small draw calls (the old double-sided tube took two), no extra pass.
  const SH = 7.2;
  const shaftMat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color('#ffe7b0') }, power: { value: 0.3 }, t: { value: 0 } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vN = mat3(modelMatrix) * normal;                                  // (world space; the cone is not scaled)
        vV = cameraPosition - wp.xyz;
        vUv = uv;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: `uniform vec3 color; uniform float power; uniform float t;
      varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      void main() {
        // across the beam, seen from any height: 1 at its middle, 0 at its silhouette (soft edges)
        float face = max(dot(normalize(vN.xz), normalize(vV.xz)), 0.0);
        float body = face * face;
        float y = vUv.y;                                                  // 0 at the floor, 1 at the top
        float fall = smoothstep(0.0, 0.07, y) * (1.0 - smoothstep(0.42, 0.8, y)) * mix(0.7, 1.0, y);
        float streak = 0.8 + 0.2 * sin(vUv.x * 43.98 + y * 3.0 + t * 0.35) * sin(vUv.x * 18.85 - t * 0.2);
        gl_FragColor = vec4(color * (power * body * fall * streak), 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.45, SH, 24, 1, true), shaftMat);
  shaft.position.set(ropeX, SH / 2, ropeZ); shaft.renderOrder = 2; B.group.add(shaft);
  // where it lands: a soft warm pool (unlit, so it stays when Low/Medium quality's smaller light pool drops the lamp)
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({ map: glowTex(), color: '#ffd89a', transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(ropeX, 0.035, ropeZ); pool.renderOrder = 1; B.group.add(pool);
  const NM = 36, mp = new Float32Array(NM * 3), md = [];
  for (let i = 0; i < NM; i++) { const h = (n) => { const s = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453; return s - Math.floor(s); }; md.push({ a: h(1) * 6.283, r: Math.sqrt(h(2)), y: h(3) * 4.2, v: 0.08 + h(4) * 0.12 }); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const motes = new THREE.Points(mg, new THREE.PointsMaterial({ map: glowTex(), color: '#ffe2a8', size: 0.3, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  motes.position.set(ropeX, 0, ropeZ); motes.frustumCulled = false; B.group.add(motes);
  R.updaters.push((dt, t) => {
    shaftMat.uniforms.t.value = t;
    for (let i = 0; i < NM; i++) {
      const m = md[i]; m.y -= m.v * dt; if (m.y < 0.2) m.y += 4.0;
      const rr = m.r * (1.4 - m.y * 0.12), a = m.a + t * 0.05;               // inside the cone at that height
      mp[i * 3] = Math.cos(a) * rr + Math.sin(t * 0.4 + i) * 0.05; mp[i * 3 + 1] = m.y; mp[i * 3 + 2] = Math.sin(a) * rr;
    }
    mg.attributes.position.needsUpdate = true;
  });
  B.light('#fff1d0', 8, 8, ropeX, 3.5, ropeZ);
  B.light('#9a6aff', 4, 10, 0, 2.5, 0);
  R.exits.push({ ...B.world(ropeX, ropeZ), r: 0.7, to: 'outdoor-well' });
  R.spawn = { ...B.world(ropeX + 1.4, ropeZ - 1.2), a: Math.PI * 0.75 };
  R.mites = [B.world(-2, -1.5), B.world(2.5, 1), B.world(-4.5, 4.5), B.world(3, -4)];
  return B.finish();
}

// ------------------------------------------------------------------ Citadel's Water Office (Gilbert & Mira)
function buildOffice(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'office', 1200, 0);
  const R = B.room, k = B.k;
  const W = 8, D = 7, H = 3.0;
  R.view = 10.2;
  R.follow = 0.22;
  const doorX = 2.7, rail = MAT.wood('dark');
  B.shell({
    W, D, H, t: 0.4,
    floor: MAT.tiles('#b8643c', '#e6d6ae', '#7a5a40', true, 4), slab: MAT.rubble('grey'), rimMat: MAT.stone('sand', 1.4),
    body: MAT.paper('#dde4cc', '#3f6f62', 'diamond'), low: MAT.wainscot('dark'), dado: 1.1, rail, cap: rail, beam: rail,
    posts: rail, postsAt: (L) => [0.48, L - 0.48],
    back: [{ kind: 'door', at: doorX, w: 1.15, h: 2.2, y0: 0, leaf: MAT.wood('honey'), leafAngle: 1.95, view: outsideView('citadel') }],
    left: [{ kind: 'window', at: 1.25, w: 0.95, h: 1.1, y0: 1.15, curtain: '#3f6f8a', view: outsideView('sky') }],
  });
  const BZ = -D / 2, LX = -W / 2;
  R.exits.push({ ...B.world(doorX, BZ + 0.45), r: 0.75, to: 'outdoor-office' });
  R.spawn = { ...B.world(doorX, BZ + 1.9), a: 0 };

  // --- public side: runner rug, bench, plants, water cooler, notice board
  k.at(2.45, 0, -0.5, Math.PI / 2, () => P.rug(k, 3.6, 1.3, ['#2a5a6a', '#8a3a2a', '#e0b050', '#f0e0b8', '#1a2a30'], 11));
  B.put(3.62, 0.95, -Math.PI / 2, P.bench, { w: 1.5, noCol: true });
  B.col(3.62, 0.95, 0.75, 0.2, 0.7, { rot: -Math.PI / 2, noStand: true, seeThrough: true });
  B.put(3.6, BZ + 0.42, 0, P.pottedPlant, { s: 1.05 });
  B.put(3.5, 3.0, 0, P.pottedPlant, { kind: 'spiky', s: 1.15, potColor: '#3a6fb0' });
  B.put(1.55, BZ + 0.3, 0, P.waterCooler, { empty: true });
  B.giver('cooler', 1.55, BZ + 0.3, ['life'], 1, { r: 1.0, top: 1.2 });
  k.at(1.0, 1.72, BZ, 0, () => P.noticeBoard(k, 0.72, 0.52, 3));
  k.at(1.05, 2.42, BZ, 0, () => P.wallClock(k, 0.17));
  // umbrella stand by the door
  k.at(3.55, 0, -2.35, 0, () => {
    k.add(lathe([[0.001, 0], [0.14, 0], [0.15, 0.04], [0.13, 0.5], [0.15, 0.52], [0.13, 0.53], [0.12, 0.06], [0.001, 0.06]], 14), MAT.brass(), 0, 0, 0);
    for (const [a, c] of [[0.2, '#2a2a3a'], [-0.25, '#8a2a22']]) { k.add(lathe([[0.001, 0], [0.06, 0.25], [0.035, 0.6], [0.001, 0.7]], 8), MAT.cloth(c, '#000'), Math.sin(a) * 0.05, 0.25, Math.cos(a) * 0.05, 0, { rz: a }); k.add(torus(0.04, 0.008, 4, 10, Math.PI), MAT.wood('dark'), Math.sin(a) * 0.3, 1.0, 0, 0, { rz: a }); }
  });
  B.ccol(3.55, -2.35, 0.17, 0.6, { noStand: true });

  // --- the service counter (public side faces +x), bell, register, sign
  const cX = 0.9, cZ = 0.65;
  B.put(cX, cZ, Math.PI / 2, P.counter, { w: 3.1, pal: 'honey', top: MAT.wood('dark') });
  const cy = 1.05;
  P.deskBell(k, cX + 0.12, cy, -0.1);
  P.ledger(k, cX - 0.02, cy, 1.25, Math.PI / 2 + 0.1, '#2a4a7a');
  P.papers(k, cX + 0.05, cy, 1.85, 3, 4);
  k.at(cX - 0.15, cy, -0.6, Math.PI / 2 + 0.4, () => P.telephone(k));
  k.add(lathe([[0.001, 0], [0.035, 0], [0.04, 0.03], [0.02, 0.05], [0.022, 0.06], [0.001, 0.06]], 10), MAT.glass('#1a2a5a', 0.85), cX - 0.15, cy, 0.5);
  k.add(cyl(0.004, 0.002, 0.24, 4), MAT.flat('#f4efe2', 0.7), cX - 0.13, cy + 0.12, 0.5, 0, { rz: -0.35 });
  k.at(cX + 0.05, cy, 0.55, Math.PI / 2, () => { k.add(rbox(0.26, 0.04, 0.08, 0.01), MAT.wood('dark'), 0, 0.02, 0); k.add(rbox(0.24, 0.07, 0.01, 0.003), MAT.brass(), 0, 0.07, 0.0, 0, { rx: -0.3 }); });
  k.at(cX, 2.3, cZ, Math.PI / 2, () => P.hangingSign(k, 1.1, 0.28, P.CANV.sign('WATER'), H - 2.3));
  // Gilbert's stool behind the counter
  k.at(0.05, 0, 1.55, 0, () => { k.add(lathe([[0.001, 0.66], [0.19, 0.66], [0.2, 0.7], [0.001, 0.72]], 16), MAT.wood('honey'), 0, 0, 0); for (let i = 0; i < 3; i++) k.add(cyl(0.02, 0.025, 0.68, 6), MAT.wood('dark'), Math.sin(i * 2.09) * 0.12, 0.33, Math.cos(i * 2.09) * 0.12, 0, { rx: Math.cos(i * 2.09) * 0.12, rz: -Math.sin(i * 2.09) * 0.12 }); k.add(torus(0.12, 0.01, 4, 14), MAT.brass(), 0, 0.25, 0, 0, { rx: Math.PI / 2 }); });
  B.ccol(0.05, 1.55, 0.2, 0.72, { noStand: true, seeThrough: true });

  // --- the filing wall: three cabinets, box files, rolled plans
  for (let i = 0; i < 3; i++) B.put(-3.62 + i * 0.5, BZ + 0.33, 0, P.filingCabinet, { color: ['#6f7f6a', '#6a7a70', '#6f7f6a'][i], open: i === 1 ? 1 : -1 });
  const ft = 1.335;
  for (let i = 0; i < 6; i++) k.add(rbox(0.07, 0.3, 0.26, 0.008), MAT.cloth(['#7a2a22', '#2a4a7a', '#2f5e3a', '#8a6a2a'][i % 4], '#000'), -3.25 + i * 0.08, ft + 0.15, BZ + 0.32, 0, { rz: i === 5 ? -0.25 : 0 });
  for (let i = 0; i < 4; i++) k.add(cyl(0.035, 0.035, 0.55, 10), MAT.flat(['#efe6cc', '#e2d4a8'][i % 2], 0.9), -2.6 + (i % 2) * 0.08, ft + 0.04 + Math.floor(i / 2) * 0.07, BZ + 0.3 + (i % 2) * 0.03, 0.2, { rz: Math.PI / 2 });
  k.at(-3.68, ft, BZ + 0.3, 0, () => P.pottedPlant(k, { kind: 'spiky', s: 0.42, potColor: '#c8a040' }));

  // --- the mains: pipe along the walls, drop with a valve wheel, gauge board
  const pz = BZ + 0.13;
  P.pipeline(k, [[LX + 0.13, 2.62, -2.35], [LX + 0.13, 2.62, pz], [0.2, 2.62, pz], [0.2, 0.0, pz]], 0.065, MAT.copper());
  k.add(lathe([[0.15, 0], [0.15, 0.04], [0.09, 0.07], [0.08, 0.09]], 14), MAT.brass(), 0.2, 0, pz);
  for (const x of [-3.4, -2.2, -1.0]) k.add(rbox(0.06, 0.16, 0.14, 0.01), MAT.iron(), x, 2.62, BZ + 0.06);
  k.at(0.2, 1.15, pz + 0.075, 0, () => P.valveWheel(k, { r: 0.17 }));
  B.col(0.2, pz, 0.1, 0.1, 2.7);
  k.add(rbox(1.45, 0.6, 0.04, 0.02), MAT.wood('dark'), -1.0, 1.62, BZ + 0.02);
  k.add(rbox(1.35, 0.5, 0.01, 0.01), MAT.wainscot('dark'), -1.0, 1.62, BZ + 0.042);
  [[-1.45, 0.12, '#c8452f'], [-1.0, 0.08, '#c8452f'], [-0.55, 0.15, '#3a6fb0']].forEach(([x, v, z], i) => {
    k.at(x, 1.66, BZ + 0.04, 0, () => P.gauge(k, { r: 0.13, v, zone: z, stem: false }));
    k.add(pipe([[x, 2.62, pz], [x, 2.2, pz], [x, 1.82, BZ + 0.1]], 0.022, 0.08, 6), MAT.copper(), 0, 0, 0);
    k.add(rbox(0.16, 0.05, 0.01, 0.004), MAT.brass(), x, 1.42, BZ + 0.05);
  });

  // --- the big painted map of the island's pipes, with its picture lamp
  const mapZ = -1.05;
  k.at(LX, 1.88, mapZ, Math.PI / 2, () => {
    P.frame(k, 2.5, 1.55, P.CANV.pipemap(), { mat: MAT.wood('dark'), prof: 0.08 });
    for (const [px, py] of [[-1.13, 0.66], [1.13, 0.66], [-1.13, -0.66], [1.13, -0.66]]) k.add(sphere(0.022, 8, 6), MAT.brass(), px, py, 0.06);
    k.add(rbox(0.5, 0.08, 0.015, 0.006), MAT.brass(), 0, -0.86, 0.02);
    k.add(pipe([[0, 0.92, 0.02], [0, 1.0, 0.18], [0, 0.98, 0.3]], 0.012, 0.05, 6), MAT.brass(), 0, 0, 0);
    k.add(rbox(0.62, 0.07, 0.12, 0.03), MAT.brass(), 0, 0.99, 0.32, 0, { rx: 0.4 });
    k.add(rbox(0.56, 0.02, 0.05, 0.006), MAT.glow('#fff4d8', '#ffd890', 2.2), 0, 0.95, 0.32);
  });
  R.searches.push({ id: 'pipemap', ...B.world(LX + 1.05, mapZ), r: 1.3 });

  // --- Mira's desk under the side window, chair, bookcase, waste basket
  const dX = -2.25, dZ = 1.75;
  B.put(dX, dZ, Math.PI / 2, P.desk, { w: 1.6, d: 0.75, pal: 'dark', leather: '#2f5a3a' });
  k.at(dX - 0.2, 0.78, 1.15, Math.PI / 2, () => P.deskLamp(k));
  P.ledger(k, dX + 0.05, 0.78, 1.85, Math.PI / 2 - 0.15, '#7a2a22');
  P.bookStack(k, dX - 0.22, 0.78, 2.35, 3, 8);
  P.papers(k, dX + 0.12, 0.78, 1.3, 4, 9);
  k.add(lathe([[0.001, 0], [0.03, 0], [0.035, 0.02], [0.025, 0.035], [0.001, 0.035]], 10), MAT.glass('#1a2a5a', 0.85), dX + 0.15, 0.78, 2.3);
  k.at(dX + 0.12, 0.78, 2.1, 0.4, () => { k.add(rbox(0.06, 0.03, 0.04, 0.008), MAT.wood('red'), 0, 0.015, 0); k.add(lathe([[0.001, 0], [0.012, 0], [0.01, 0.06], [0.02, 0.08], [0.001, 0.09]], 8), MAT.wood('dark'), 0, 0.03, 0); });
  B.put(-1.4, 2.05, -Math.PI / 2 + 0.5, P.officeChair, { color: '#7a2a22' }, { noStand: true, seeThrough: true });
  B.put(LX + 0.2, 2.75, Math.PI / 2, P.bookcase, { w: 1.0, h: 2.0, pal: 'dark', seed: 3 });
  B.giver('bookcase', LX + 0.2, 2.75, ['money', 'life', 'magic'], 3, { r: 1.2, top: 1.6 });
  k.at(-1.55, 0, 2.95, 0, () => {
    k.add(lathe([[0.001, 0], [0.13, 0], [0.17, 0.34], [0.18, 0.35], [0.16, 0.35], [0.12, 0.02], [0.001, 0.02]], 14), MAT.wood('pale'), 0, 0, 0);
    for (let i = 0; i < 3; i++) k.add(soft({ key: 'crumple' + i, prims: [{ type: 'ell', c: [0, 0, 0], r: [0.06, 0.05, 0.055], group: 'p', mat: 'p', wobble: (x, y, z) => Math.sin(x * 90 + i) * Math.sin(y * 80) * 0.012 }], groups: { p: 0.01 }, colors: { p: '#f2ead6' }, bounds: { min: [-0.09, -0.08, -0.08], max: [0.09, 0.08, 0.08] }, cell: 0.012 }), softMat, Math.cos(i * 2) * 0.06, 0.32 + i * 0.03, Math.sin(i * 2) * 0.06);
  });
  B.ccol(-1.55, 2.95, 0.18, 0.4, { noStand: true, seeThrough: true });

  // --- lamps and light
  k.at(cX, 0, -0.35, 0, () => P.hangingLamp(k, 2.2, H + 0.2, { shade: '#3f6f62' }));
  k.at(2.4, 0, 1.2, 0, () => P.hangingLamp(k, 2.2, H + 0.2, { shade: '#3f6f62' }));
  B.light('#ffd6a0', 7, 10, 1.6, 2.0, 0.4);
  B.light('#ffe2b0', 2.4, 3.5, dX + 0.2, 1.2, 1.2);
  B.light('#ffe8c0', 3.2, 4.2, LX + 0.8, 2.6, mapZ);
  B.light('#e8f4ff', 3, 5, doorX, 1.6, BZ + 1.0);
  B.light('#e8f4ff', 2.2, 4, LX + 1.0, 1.8, 1.25);

  R.npcSpots = { gilbert: { ...B.world(0.12, 0.35), a: Math.PI / 2 }, mira: { ...B.world(-1.2, 0.95), a: -Math.PI / 2 - 0.35 } };
  return B.finish();
}

// ------------------------------------------------------------------ the Joint Project's office (Zoe's stealth segment)
function buildProjOffice(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'projoffice', 1300, 0);
  const R = B.room, k = B.k;
  const W = 13, D = 10, H = 3.4, t = 0.5;
  R.view = 14.6;
  R.follow = 0.3;
  const doorX = 4.8;
  const brass = MAT.brass(), teal = '#3f8a86';
  const L = W + 2 * t, LL = D + t;
  B.shell({
    W, D, H, t, slabH: 0.8,
    floor: MAT.tiles('#8e8aa0', '#b4b0c2', '#4a4858', true, 4), slab: MAT.rubble('slate'), rimMat: MAT.stone('blue', 1.4),
    body: MAT.stone('blue', 2), low: MAT.plates(teal, 1), dado: 1.15, rail: brass, cap: MAT.stone('slate', 1.4), beam: MAT.iron(),
    posts: MAT.iron(), postsAt: (len) => (len === L ? [-4.75, -1.92, 0.58, 3.2, 6.42].map((x) => x + W / 2 + t) : [-4.92, -1.2, 0.55, 3.0].map((z) => D / 2 + t - z)),
    back: [{ kind: 'door', at: doorX, w: 1.3, h: 2.4, y0: 0, view: outsideView('fort'), sill: MAT.stone('slate', 1) }],
  });
  const BZ = -D / 2, LX = -W / 2;
  R.exits.push({ ...B.world(doorX, BZ + 0.45), r: 0.75, to: 'outdoor-projoffice' });
  R.spawn = { ...B.world(doorX, BZ + 1.3), a: 0 };
  R.cover = [];
  const cover = (x, z, r) => R.cover.push({ ...B.world(x, z), r });
  const glowC = MAT.glow('#9ff4ff', '#22d4ff', 1.8);

  // --- project fittings on the old stone: cyan strip on the brass dado rail, conduits, sconces
  k.add(rbox(doorX - 0.75 - LX, 0.025, 0.02, 0.006), glowC, (LX + doorX - 0.75) / 2, 1.2, BZ + 0.065);
  k.add(rbox(W / 2 - doorX - 0.75, 0.025, 0.02, 0.006), glowC, (W / 2 + doorX + 0.75) / 2, 1.2, BZ + 0.065);
  k.add(rbox(0.02, 0.025, D, 0.006), glowC, LX + 0.065, 1.2, 0);
  P.pipeline(k, [[LX + 0.12, 2.95, D / 2], [LX + 0.12, 2.95, BZ + 0.12], [W / 2, 2.95, BZ + 0.12]], 0.06, MAT.paint(teal, 0.45), brass);
  k.add(pipe([[LX + 0.1, 3.12, D / 2], [LX + 0.1, 3.12, BZ + 0.1], [W / 2, 3.12, BZ + 0.1]], 0.035, 0.15, 8), brass, 0, 0, 0);
  for (const x of [-1.92, 3.2]) k.at(x, 2.25, BZ, 0, () => P.wallSconce(k, { glow: '#5ff4ff' }));
  for (const z of [-1.2, 3.0]) k.at(LX, 2.25, z, Math.PI / 2, () => P.wallSconce(k, { glow: '#5ff4ff' }));
  // Funfrock's legacy: the pale patch where his portrait hung, its hooks still there
  k.at(LX + 0.005, 2.25, -3.3, Math.PI / 2, () => {
    k.add(plane(0.95, 1.15), MAT.flat('#b8c2cc', 0.95, { transparent: true, opacity: 0.35, depthWrite: false }), 0, 0, 0.004);
    for (const sx of [-0.3, 0.3]) k.add(torus(0.025, 0.007, 4, 8), MAT.iron(), sx, 0.6, 0.02);
  });
  // the project's banner over the first desk
  k.at(-3.6, 2.35, BZ, 0, () => {
    k.add(cyl(0.018, 0.018, 1.3, 8), brass, 0, 0.82, 0.1, 0, { rz: Math.PI / 2 });
    for (const s of [-1, 1]) k.add(sphere(0.035, 8, 6), brass, s * 0.67, 0.82, 0.1);
    k.add(plane(1.05, 1.58), MAT.map(P.CANV.banner(), 0.9, { side: THREE.DoubleSide, alphaTest: 0.5 }), 0, 0.02, 0.09);
  });

  // --- back wall: archive shelving, desk 1, locker 2 (with cover), crates, desk 2
  B.put(-5.65, BZ + 0.22, 0, P.bookcase, { w: 1.0, h: 2.1, pal: 'grey', seed: 6 });
  const deskAt = (x, z, ry, kinds, seed, chair = null) => {
    B.put(x, z, ry, P.desk, { w: 1.5, d: 0.75, metal: MAT.plates(teal, 0.7), leather: '#1e3a38' });
    k.at(x, 0.78, z, ry, () => {
      kinds.forEach((kd, i) => k.at((i - (kinds.length - 1) / 2) * 0.62, 0, -0.12, 0, () => P.monitor(k, { kind: kd, w: 0.44, h: 0.32 })));
      P.papers(k, 0.45, 0, 0.18, 3, seed, 'project');
      P.papers(k, -0.5, 0, 0.2, 2, seed + 1, 'form');
      k.add(lathe([[0.001, 0], [0.04, 0], [0.045, 0.1], [0.04, 0.1], [0.035, 0.01], [0.001, 0.01]], 10), MAT.flat('#e8d8b0', 0.4), -0.15, 0, 0.22);
    });
    if (chair) B.put(chair[0], chair[1], chair[2], P.officeChair, { color: '#2e4a48' }, { noStand: true });
    cover(x, z, 0.8);
  };
  deskAt(-3.6, BZ + 0.45, 0, ['text', 'wave'], 1, [-3.5, BZ + 1.28, Math.PI - 0.3]);
  B.put(-2.38, BZ + 0.4, 0, P.pottedPlant, { s: 1.15, potColor: '#4a5a6a' });
  const lk2 = -1.25;
  B.put(lk2, BZ + 0.28, 0, P.locker, { w: 0.9, d: 0.5, h: 1.95 });
  R.searches.push({ id: 'locker2', ...B.world(lk2, BZ + 1.15), r: 1.3 });
  B.put(-0.05, BZ + 0.45, 0.1, P.cargoCrate, { w: 0.8, h: 0.75, d: 0.8 });
  k.at(-0.05, 0.75, BZ + 0.45, -0.15, () => P.cargoCrate(k, { w: 0.62, h: 0.6, d: 0.62, color: '#5f8068' }));
  B.col(-0.05, BZ + 0.45, 0.42, 0.42, 1.35, { noStand: true });
  cover(-0.05, BZ + 0.45, 0.6);
  deskAt(1.65, BZ + 0.45, 0, ['bars', 'radar'], 3, [1.75, BZ + 1.28, Math.PI + 0.25]);

  // --- crate stack inside the door: hides the entrance from the room
  const c2x = 3.4, c2z = BZ + 1.65;
  B.put(c2x, c2z, 0.05, P.cargoCrate, { w: 0.95, h: 0.85, d: 0.85 });
  k.at(c2x + 0.05, 0.85, c2z, -0.1, () => P.cargoCrate(k, { w: 0.75, h: 0.7, d: 0.75, color: '#5f8068' }));
  B.col(c2x, c2z, 0.48, 0.44, 1.55, { noStand: true });
  B.put(c2x + 0.35, c2z + 0.85, 0, P.barrel, { r: 0.28, h: 0.8, pal: 'grey' });
  B.giver('barrel', c2x + 0.35, c2z + 0.85, ['life', 'magic'], 1, { r: 1.0, top: 0.9 });
  cover(c2x, c2z, 0.7);
  B.put(6.0, BZ + 0.45, 0, P.pottedPlant, { kind: 'spiky', s: 1.2, potColor: '#4a5a6a' });

  // --- left wall: filing cabinets, crates, locker 1, desk 3, plant
  for (let i = 0; i < 2; i++) B.put(LX + 0.33, -3.55 + i * 0.5, Math.PI / 2, P.filingCabinet, { color: '#5a7a76', h: 1.32 });
  cover(LX + 0.4, -3.3, 0.6);
  B.put(LX + 0.5, -1.95, 0.08, P.cargoCrate, { w: 0.85, h: 0.8, d: 0.85 });
  k.at(LX + 0.48, 0.8, -1.95, 0.25, () => P.cargoCrate(k, { w: 0.65, h: 0.62, d: 0.65, color: '#5f8068' }));
  B.col(LX + 0.5, -1.95, 0.45, 0.45, 1.42, { noStand: true });
  cover(LX + 0.5, -1.95, 0.6);
  const lk1 = -0.35;
  B.put(LX + 0.28, lk1, Math.PI / 2, P.locker, { w: 0.9, d: 0.5, h: 1.95 });
  R.searches.push({ id: 'locker1', ...B.world(LX + 1.15, lk1), r: 1.3 });
  deskAt(LX + 0.42, 1.75, Math.PI / 2, ['map'], 5, [LX + 1.25, 1.65, -Math.PI / 2 + 0.3]);
  B.put(LX + 0.45, 3.35, 0, P.pottedPlant, { s: 1.2, potColor: '#4a5a6a' });
  B.put(LX + 0.55, 4.4, 0.2, P.cargoCrate, { w: 0.8, h: 0.7, d: 0.8 });
  B.giver('crate', LX + 0.55, 4.4, ['money', 'life', 'magic'], 4, { r: 1.1, top: 0.8 });

  // --- centre: the blueprint table with the hologram of the planet's shell
  const tX = -1.0, tZ = 0.2;
  const fp = B.put(tX, tZ, 0, P.holoTable, { w: 2.2, d: 1.3 });
  for (let i = 0; i < 3; i++) k.add(cyl(0.035, 0.035, 0.7, 10), MAT.flat(['#d8e4f0', '#c8d8ec'][i % 2], 0.9), tX + 0.75, 0.95 + i * 0.07, tZ + 0.45 - i * 0.04, 0.3 + i * 0.2, { rz: Math.PI / 2 });
  cover(tX, tZ, 1.1);
  B.put(1.25, -1.45, 0, P.pottedPlant, { kind: 'spiky', s: 1.1, potColor: '#4a5a6a' });
  B.put(-2.8, 1.95, 0, P.pottedPlant, { s: 1.15, potColor: '#4a5a6a' });
  B.put(1.3, 1.95, 0.3, P.cargoCrate, { w: 0.65, h: 0.6, d: 0.65 });
  cover(1.25, -1.45, 0.45); cover(-2.8, 1.95, 0.45); cover(1.3, 1.95, 0.45);

  // --- east strip: a double desk island, locker 3 with crate cover
  B.put(3.82, 0, -Math.PI / 2, P.desk, { w: 1.3, d: 0.7, metal: MAT.plates(teal, 0.7), leather: '#1e3a38' });
  B.put(4.52, 0, Math.PI / 2, P.desk, { w: 1.3, d: 0.7, metal: MAT.plates(teal, 0.7), leather: '#1e3a38' });
  k.at(3.95, 0.78, 0.25, -Math.PI / 2, () => P.monitor(k, { kind: 'shaft', w: 0.44, h: 0.32 }));
  k.at(4.4, 0.78, -0.25, Math.PI / 2, () => P.monitor(k, { kind: 'text', w: 0.44, h: 0.32 }));
  P.papers(k, 3.85, 0.78, -0.35, 3, 11, 'project');
  P.ledger(k, 4.5, 0.78, 0.35, 0.3, '#1e3a38');
  B.put(3.05, -0.2, Math.PI / 2 + 0.3, P.officeChair, { color: '#2e4a48' }, { noStand: true });
  cover(4.17, 0, 0.9);
  const lk3x = 4.75, lk3z = 2.5;
  B.put(lk3x, lk3z, 0, P.locker, { w: 0.9, d: 0.5, h: 1.95 });
  R.searches.push({ id: 'locker3', ...B.world(lk3x, lk3z + 0.9), r: 1.3 });
  B.put(3.55, 2.3, 0.15, P.cargoCrate, { w: 0.75, h: 0.75, d: 0.75 });
  k.at(3.55, 0.75, 2.3, -0.2, () => P.cargoCrate(k, { w: 0.58, h: 0.55, d: 0.58, color: '#5f8068' }));
  B.col(3.55, 2.3, 0.4, 0.4, 1.3, { noStand: true });
  B.put(3.5, 3.5, -0.1, P.cargoCrate, { w: 0.8, h: 0.8, d: 0.8 });
  k.at(3.5, 0.8, 3.5, 0.2, () => P.cargoCrate(k, { w: 0.6, h: 0.6, d: 0.6, color: '#5f8068' }));
  B.col(3.5, 3.5, 0.42, 0.42, 1.4, { noStand: true });
  cover(3.55, 2.3, 0.55); cover(3.5, 3.5, 0.6);

  // --- the near side: low crates and a plant
  B.put(-2.2, 4.35, 0.1, P.cargoCrate, { w: 0.9, h: 0.75, d: 0.8 });
  B.put(0.7, 4.45, 0, P.pottedPlant, { s: 1.1, potColor: '#4a5a6a' });
  B.put(5.9, 4.4, 0, P.barrel, { r: 0.3, h: 0.85, pal: 'grey' });
  B.giver('barrel2', 5.9, 4.4, ['money'], 3, { r: 1.0, top: 0.95 });
  cover(-2.2, 4.35, 0.6);

  k.at(tX, 0, tZ, 0, () => P.rug(k, 4.4, 3.0, ['#2e5e5a', '#d9a94a', '#5fb8b0', '#e8f0e0', '#14302e'], 21));
  B.put(-4.5, 4.5, Math.PI, P.bench, { w: 1.4, pal: 'grey', noCol: true });
  B.col(-4.5, 4.5, 0.7, 0.2, 0.7, { noStand: true, seeThrough: true });
  // --- hanging industrial lamps and light
  B.light('#e8f0ff', 4, 8, -3.6, 2.4, 3.0);
  for (const [x, z] of [[-3.4, -2.2], [2.4, 1.2]]) k.at(x, 0, z, 0, () => P.hangingLamp(k, 2.55, H + 0.2, { shade: '#3f8a86' }));
  B.light('#e8f0ff', 7, 10, -3.2, 2.5, -1.8);
  B.light('#e8f0ff', 6, 10, 2.6, 2.5, 1.4);
  const holoLight = B.light('#5ff4ff', 5, 6, tX, 1.9, tZ);
  B.light('#9ff4ff', 2, 5, doorX, 2.0, BZ + 0.8);
  R.updaters.push((dt, tt) => {
    fp.holo.rotation.y = tt * 0.4;
    fp.shell.rotation.x = Math.sin(tt * 0.3) * 0.15;
    fp.core.scale.setScalar(1 + Math.sin(tt * 3) * 0.12);
    holoLight.intensity = holoLight.userData.base * (0.85 + Math.sin(tt * 3) * 0.15);
  });

  // the guard's loop around the blueprint table (world coords)
  R.patrol = [[-3.6, -2.5], [2.3, -2.5], [2.3, 2.9], [-0.6, 3.1], [-3.6, 2.9]].map(([x, z]) => [B.cx + x, B.cz + z]);
  return B.finish();
}

// ------------------------------------------------------------------ the station's control room
function buildControl(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'control', 1400, 0);
  const R = B.room, k = B.k;
  const W = 12, D = 9, H = 3.6, t = 0.5;
  R.view = 13.6;
  R.follow = 0.3;
  const doorX = 4.3, winX = -1.6, winW = 3.8, winY = 0.8, winH = 2.2;
  const brass = MAT.brass(), teal = '#3f8a86';
  B.shell({
    W, D, H, t, slabH: 0.8,
    floor: MAT.tiles('#7a7890', '#9c9aae', '#46445a', true, 4), slab: MAT.rubble('slate'), rimMat: MAT.stone('blue', 1.4),
    body: MAT.plates('#8d8a9c', 1), low: MAT.plates(teal, 1), dado: 1.1, rail: brass, cap: MAT.iron(), beam: brass,
    posts: MAT.iron(), postsAt: (len) => (len === W + 2 * t ? [-5.9, 1.15, 3.3, 5.92].map((x) => x + W / 2 + t) : [-4.42, -1.9, 1.2, 3.0].map((z) => D / 2 + t - z)),
    back: [
      { kind: 'hatch', at: winX, w: winW, h: winH, y0: winY },
      { kind: 'door', at: doorX, w: 1.3, h: 2.4, y0: 0, frame: MAT.iron(), view: outsideView('fort'), sill: MAT.stone('slate', 1) },
    ],
  });
  const BZ = -D / 2, LX = -W / 2;
  R.exits.push({ ...B.world(doorX, BZ + 0.45), r: 0.75, to: 'outdoor-control' });
  R.spawn = { ...B.world(doorX, BZ + 1.5), a: 0 };

  // --- the viewport onto the bore shaft: riveted brass frame, mullions, glass
  const fw = 0.2;
  k.at(winX, 0, BZ, 0, () => {
    const x0 = -winW / 2, x1 = winW / 2, y0 = winY, y1 = winY + winH;
    k.add(rbox(winW + 2 * fw, fw, 0.16, 0.05), brass, 0, y1 + fw / 2 - 0.02, 0.06);
    k.add(rbox(winW + 2 * fw + 0.1, fw + 0.04, 0.2, 0.05), brass, 0, y0 - fw / 2 + 0.02, 0.08);
    for (const x of [x0 - fw / 2 + 0.02, x1 + fw / 2 - 0.02]) k.add(rbox(fw, winH + 2 * fw, 0.16, 0.05), brass, x, (y0 + y1) / 2, 0.06);
    for (let i = 0; i <= 12; i++) { const x = x0 - 0.1 + i * ((winW + 0.2) / 12); for (const y of [y0 - 0.1, y1 + 0.1]) k.add(sphere(0.022, 6, 4), MAT.iron(), x, y, 0.15); }
    for (let i = 0; i <= 6; i++) for (const x of [x0 - 0.1, x1 + 0.1]) k.add(sphere(0.022, 6, 4), MAT.iron(), x, y0 + i * (winH / 6), 0.15);
    for (const x of [-winW / 6, winW / 6]) { k.add(rbox(0.08, winH, 0.1, 0.02), MAT.iron(), x * 1.5, (y0 + y1) / 2, -0.12); }
    k.add(rbox(winW, 0.07, 0.1, 0.02), MAT.iron(), 0, y0 + winH * 0.62, -0.12);
    for (const s of [-1, 1]) k.add(new THREE.BoxGeometry(0.04, winH, t), MAT.iron(), s * (winW / 2 - 0.02), (y0 + y1) / 2, -t / 2);
    k.add(new THREE.BoxGeometry(winW, 0.04, t), MAT.iron(), 0, y1 - 0.02, -t / 2);
    k.add(new THREE.BoxGeometry(winW, 0.04, t), MAT.iron(), 0, y0 + 0.02, -t / 2);
    k.add(plane(winW, winH), MAT.glass('#a8f4ff', 0.1), 0, (y0 + y1) / 2, -0.17);
  });
  // the shaft itself, built behind the wall and trimmed to what the iso camera
  // can see through the glass (the camera looks down ~0.93 m per metre of depth)
  const shaftTex = P.canvasTex(256, 512, (x, Wd, Hd) => {
    const g = x.createLinearGradient(0, 0, 0, Hd); g.addColorStop(0, '#0e2e36'); g.addColorStop(1, '#0a4a58'); x.fillStyle = g; x.fillRect(0, 0, Wd, Hd);
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${20 + (i * 37) % 40},${70 + (i * 13) % 60},${90 + (i * 7) % 60},0.5)`; x.fillRect((i * 97) % Wd, (i * 61) % Hd, 18 + (i % 5) * 6, 10 + (i % 3) * 5); }
    for (let y = 16; y < Hd; y += 64) { const gg = x.createLinearGradient(0, y - 8, 0, y + 8); gg.addColorStop(0, 'rgba(95,244,255,0)'); gg.addColorStop(0.5, 'rgba(180,255,255,0.95)'); gg.addColorStop(1, 'rgba(95,244,255,0)'); x.fillStyle = gg; x.fillRect(0, y - 8, Wd, 16); }
    for (let xx = 0; xx < Wd; xx += 64) { x.fillStyle = 'rgba(95,244,255,0.35)'; x.fillRect(xx, 0, 3, Hd); x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(xx + 3, 0, 4, Hd); }
  });
  shaftTex.wrapS = shaftTex.wrapT = THREE.RepeatWrapping; shaftTex.repeat.set(5, 4);
  const shaftMat = new THREE.MeshStandardMaterial({ map: shaftTex, emissive: '#ffffff', emissiveMap: shaftTex, emissiveIntensity: 1.0, roughness: 0.6, side: THREE.BackSide });
  const sx = winX - 3.0, sz = BZ - t - 3.1, sr = 3.1, outer = BZ - t;
  // keep every vertex inside the band seen through the glass: above it the wall
  // would not hide it, below it the camera would see it under the room's slab
  const clampTop = (geo, cap) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const d = outer - (p.getZ(i) + sz), hi = Math.min(cap, 3.05 - 0.93 * d), lo = -0.75 - 0.93 * d; p.setY(i, Math.max(lo, Math.min(hi, p.getY(i)))); } p.needsUpdate = true; geo.computeVertexNormals(); };
  const shaftGeo = new THREE.CylinderGeometry(sr, sr, 18, 40, 24, true); shaftGeo.translate(0, -7, 0); clampTop(shaftGeo, 2.6);
  const shaft = new THREE.Mesh(shaftGeo, shaftMat); shaft.position.set(sx, 0, sz); B.group.add(shaft);
  const beamMat = new THREE.MeshBasicMaterial({ color: '#7ff8ff', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const beamGeo = new THREE.CylinderGeometry(0.55, 0.9, 16, 20, 16, true); beamGeo.translate(0, -7, 0); clampTop(beamGeo, 2);
  const beam = new THREE.Mesh(beamGeo, beamMat); beam.position.set(sx, 0, sz); B.group.add(beam);
  const coreGeo = new THREE.CylinderGeometry(0.16, 0.16, 16, 10, 16, true); coreGeo.translate(0, -7, 0); clampTop(coreGeo, 2);
  const core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: '#e8ffff' })); core.position.set(sx, 0, sz); B.group.add(core);
  const shaftLight = B.light('#5ff4ff', 14, 11, winX, 1.9, BZ + 0.9);

  // --- brass railing and hazard strip before the viewport
  const rz = BZ + 0.75, rx0 = winX - winW / 2 - 0.1, rx1 = winX + winW / 2 + 0.1;
  P.railing(k, [[rx0, BZ + 0.05], [rx0, rz], [rx1, rz], [rx1, BZ + 0.05]], { h: 1.0 });
  B.col((rx0 + rx1) / 2, BZ + 0.4, (rx1 - rx0) / 2 + 0.05, 0.4, 1.0, { noStand: true, seeThrough: true });
  k.add(plane(rx1 - rx0 + 0.4, 0.28), MAT.hazard(), (rx0 + rx1) / 2, 0.006, rz + 0.25, 0, { rx: -Math.PI / 2 });
  k.add(plane(rx1 - rx0 - 0.1, 0.62), MAT.tread('#8d8a9c'), (rx0 + rx1) / 2, 0.005, BZ + 0.38, 0, { rx: -Math.PI / 2 });

  // --- Vesk's main console: a curved bank facing the viewport
  const cz = BZ + 1.85;
  B.put(winX, cz, 0, P.console_, { w: 2.0, kinds: ['shaft', 'wave'], levers: 3 });
  const wing = 1.2, wa = 0.45;
  B.put(winX - 1.0 - Math.cos(wa) * wing / 2, cz + Math.sin(wa) * wing / 2, wa, P.console_, { w: wing, kinds: ['bars'], levers: 2 });
  B.put(winX + 1.0 + Math.cos(wa) * wing / 2, cz + Math.sin(wa) * wing / 2, -wa, P.console_, { w: wing, kinds: ['radar'], levers: 1 });
  k.add(pipe([[winX - 0.6, 0.02, cz - 0.42], [winX - 0.6, 0.02, BZ + 0.85], [winX - 2.4, 0.02, BZ + 0.85]], 0.03, 0.15, 6), MAT.flat('#1a1a1a', 0.6), 0, 0, 0);

  // --- left wall: the worker's console, an instrument rack, a big valve
  B.put(LX + 0.45, -0.4, Math.PI / 2, P.console_, { w: 2.0, kinds: ['text', 'map'], levers: 2 });
  k.add(pipe([[LX + 0.12, 3.1, -0.9], [LX + 0.12, 1.7, -0.9], [LX + 0.2, 1.62, -0.9]], 0.035, 0.1, 6), MAT.flat('#1a1a1a', 0.6), 0, 0, 0);
  k.add(pipe([[LX + 0.12, 3.1, 0.1], [LX + 0.12, 1.7, 0.1], [LX + 0.2, 1.62, 0.1]], 0.03, 0.1, 6), MAT.flat('#a8302a', 0.6), 0, 0, 0);
  B.put(LX + 0.27, 2.2, Math.PI / 2, P.instrumentRack, { w: 1.3, kind: 'bars' });
  P.pipeline(k, [[LX + 0.25, 0, 3.75], [LX + 0.25, 2.3, 3.75], [LX, 2.3, 3.75]], 0.1, MAT.paint(teal, 0.45), brass);
  k.at(LX + 0.37, 1.25, 3.75, Math.PI / 2, () => P.valveWheel(k, { r: 0.24, color: '#c8302a' }));
  k.at(LX + 0.05, 1.8, 3.2, Math.PI / 2, () => P.gauge(k, { r: 0.14, v: 0.82 }));
  B.ccol(LX + 0.25, 3.75, 0.2, 2.4);

  // --- back wall right of the viewport: instrument rack and fuse cabinet
  B.put(1.35, BZ + 0.27, 0, P.instrumentRack, { w: 1.2, kind: 'shaft' });
  B.put(2.75, BZ + 0.25, 0, P.locker, { w: 0.85, d: 0.45, h: 2.0, color: '#5a5a6e', doors: 1 });

  // --- cable trays along the top of both walls
  k.at(0, 3.12, BZ, 0, () => P.cableTray(k, W - 0.2));
  k.at(LX, 3.12, 0.1, Math.PI / 2, () => P.cableTray(k, D - 0.4));

  // --- the map table and the rest of the floor
  B.put(1.9, 1.3, -0.15, P.mapTable, { w: 1.7, d: 1.05 });
  k.at(1.9, 0, 1.3, 0, () => P.hangingLamp(k, 2.4, H + 0.2, { shade: '#3f8a86' }));
  k.at(-3.0, 0, 2.3, 0, () => P.rug(k, 2.4, 1.6, ['#2e4a48', '#d9a94a', '#5ff4ff', '#e8f4ff', '#14201e'], 13));
  B.put(-3.0, 2.1, 0, P.desk, { w: 1.4, d: 0.72, metal: MAT.plates(teal, 0.7), leather: '#1e3a38' });
  k.at(-3.0, 0.78, 2.1, 0, () => { k.at(-0.3, 0, -0.1, 0, () => P.monitor(k, { kind: 'wave', w: 0.42, h: 0.3 })); P.papers(k, 0.35, 0, 0.1, 4, 21, 'project'); P.ledger(k, 0.3, 0.01, -0.12, 0.2, '#1e3a38'); });
  B.put(-2.85, 2.85, Math.PI - 0.4, P.officeChair, { color: '#2e4a48' }, { noStand: true });
  k.at(-1.75, 0, 0.1, 0, () => P.glowGrate(k, 4.3, 0.55));
  B.put(3.4, 3.5, 0, P.pressureTank, { l: 1.6, r: 0.42 });
  for (const [x, z, s] of [[5.45, 2.6, 0.85], [5.5, 3.65, 0.7]]) B.put(x, z, 0.2 + x, P.cargoCrate, { w: s, h: s * 0.9, d: s });
  B.put(4.85, 4.25, 0, P.barrel, { r: 0.3, h: 0.85, pal: 'grey' });
  B.giver('barrel', 4.85, 4.25, ['money', 'life', 'magic'], 2, { r: 1.0, top: 0.95 });
  k.at(winX, 0, cz + 0.4, 0, () => P.hangingLamp(k, 2.6, H + 0.2, { shade: '#3f8a86' }));
  // cable spool lying on its side, toolbox
  k.at(-4.6, 0, 3.6, 0.6, () => {
    for (const s of [-1, 1]) k.add(cyl(0.42, 0.42, 0.05, 20), MAT.wood('grey'), s * 0.22, 0.42, 0, 0, { rz: Math.PI / 2 });
    k.add(cyl(0.3, 0.3, 0.42, 16), MAT.flat('#1a1a1a', 0.6), 0, 0.42, 0, 0, { rz: Math.PI / 2 });
  });
  B.ccol(-4.6, 3.6, 0.45, 0.85, { noStand: true });
  k.at(-0.8, 0, 3.7, -0.3, () => { k.add(rbox(0.5, 0.22, 0.24, 0.02), MAT.paint('#c8302a', 0.45), 0, 0.11, 0); k.add(pipe([[-0.15, 0.22, 0], [-0.12, 0.3, 0], [0.12, 0.3, 0], [0.15, 0.22, 0]], 0.012, 0.03, 5), MAT.iron(), 0, 0, 0); });
  B.col(-0.8, 3.7, 0.28, 0.16, 0.3, { noStand: true, seeThrough: true, rot: -0.3 });

  B.light('#ffe8c8', 7, 10, 1.6, 2.6, 1.0);
  B.light('#9ff4ff', 2.5, 4.5, LX + 1.2, 1.6, -0.4);
  B.light('#9ff4ff', 2, 5, doorX, 2.0, BZ + 0.8);
  const screens = ['shaft', 'wave', 'bars', 'radar', 'text', 'map'].map((kd) => MAT.screen(P.CANV.screen(kd)));
  R.updaters.push((dt, tt) => {
    shaftTex.offset.y = (tt * 0.12) % 1;
    const p = 0.85 + Math.sin(tt * 2.2) * 0.12 + Math.sin(tt * 7.3) * 0.04;
    shaftMat.emissiveIntensity = p;
    beamMat.opacity = 0.28 + Math.sin(tt * 3.1) * 0.08;
    shaftLight.intensity = shaftLight.userData.base * p;
    screens.forEach((m, i) => { m.emissiveIntensity = 1.3 * (0.92 + Math.sin(tt * (5 + i) + i) * 0.06); });
  });

  R.npcSpots = { vesk: { ...B.world(winX, cz + 0.85), a: Math.PI }, worker: { ...B.world(LX + 1.35, -0.4), a: -Math.PI / 2 } };
  return B.finish();
}

// sagging cable between two points (a little catenary), as pipe points
export const sag = (a, b, s, n = 8) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - s * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]; });
// same material, drawn from both sides (thin shells seen from inside and out)
export const twoSided = (m) => M('ds' + m.uuid, () => { const c = m.clone(); c.side = THREE.DoubleSide; return c; });
// soft additive glow sprite
const glowTex = () => M('glowtex', () => canvasTex(128, 128, (x, W) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,240,200,0.6)'); g.addColorStop(1, 'rgba(255,220,160,0)'); x.fillStyle = g; x.fillRect(0, 0, W, W); }));
export function glowSprite(color, size, opacity = 0.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size);
  return s;
}

// ------------------------------------------------------------------ Baldino's workshop (Zeelich)
// Esmer house: lilac plaster under a vaulted ceiling springing from the walls, round windows, brass and
// wood; crammed with the old inventor's projects. The override key is assembled at the workbench. Years of
// his work (the relay table, the old hoist, the mended fan, the tea experiment, Ilo's perch): workshoplife.js.
function buildWorkshop(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'workshop', 1500, 0);
  const R = B.room, k = B.k;
  const W = 8, D = 7, H = 3.4, t = 0.4;
  R.view = 10.9;
  R.follow = 0.22;
  const doorX = 2.75, benchX = -0.9;
  const wood = MAT.wood('dark'), brass = MAT.brass(), lilac = MAT.plaster('#e4d8ee'), capM = MAT.plaster('#cbb6df');
  const zv = outsideView('zeelich');
  const round = (at, yc, r) => ({ kind: 'round', at, r, w: 2 * r + 0.12, h: 2 * r + 0.12, y0: yc - r - 0.06, view: zv });
  B.shell({
    W, D, H, t,
    floor: MAT.planks('dark'), slab: MAT.rubble('grey'), rimMat: MAT.stone('sand', 1.4),
    body: lilac, low: MAT.wainscot('lav'), dado: 0.95, rail: wood, cap: capM, beam: wood,
    posts: wood, postsAt: (L) => [0.48, L - 0.48],
    back: [
      { kind: 'door', at: doorX, w: 1.2, h: 2.3, y0: 0, leaf: MAT.wood('red'), leafAngle: 1.95, view: zv, frame: wood },
      round(benchX, 2.58, 0.38),
    ],
    left: [round(-1.25, 2.86, 0.28), round(2.45, 2.02, 0.46)],
  });
  const BZ = -D / 2, LX = -W / 2;
  R.exits.push({ ...B.world(doorX, BZ + 0.45), r: 0.75, to: 'zeelich-workshop' });
  R.spawn = { ...B.world(doorX, BZ + 1.55), a: 0 };

  // --- the vault springing from the two far walls: a curved cove, brass ribs, a plaster rim
  const c = 0.95, T = 0.9, th = 0.08, vault = twoSided(MAT.plaster('#efe7f6'));
  const cove = (sx) => (s) => {
    const N = 10;
    for (let i = 0; i <= N; i++) { const a = (T * i) / N, px = sx * (c - c * Math.cos(a)), py = c * Math.sin(a); if (i) s.lineTo(px, py); else s.moveTo(px, py); }
    for (let i = N; i >= 0; i--) { const a = (T * i) / N; s.lineTo(sx * (c - (c + th) * Math.cos(a)), (c + th) * Math.sin(a)); }
  };
  k.add(slab('wcoveL', cove(1), D, 0), vault, LX, H, 0);
  k.add(slab('wcoveB', cove(-1), W, 0), vault, 0, H, BZ, Math.PI / 2);
  const ci = c * (1 - Math.cos(T)), cyT = H + c * Math.sin(T);
  k.add(rbox(0.16, 0.09, D, 0.035), capM, LX + ci + 0.03, cyT + 0.02, 0);
  k.add(rbox(W, 0.09, 0.16, 0.035), capM, 0, cyT + 0.02, BZ + ci + 0.03);
  for (const x of [-2.6, 0.75, 2.0, 3.55]) k.add(torus(c - 0.02, 0.03, 5, 12, T), brass, x, H, BZ + c, -Math.PI / 2, { rz: Math.PI - T });
  for (const z of [-2.45, 0.0, 1.35, 3.3]) k.add(torus(c - 0.02, 0.03, 5, 12, T), brass, LX + c, H, z, 0, { rz: Math.PI - T });

  // --- the pot-bellied stove in the corner, tiled heat shield, stovepipe into the wall, coal scuttle
  const stX = -3.25, stZ = -2.75;
  B.put(stX, stZ, Math.PI / 4, P.potStove, {});
  const tiles = MAT.tiles('#7a5aa0', '#efe6d6', '#cfc4b4', true, 6);
  k.add(rbox(1.3, 1.6, 0.04, 0.01), tiles, -3.35, 0.9, BZ + 0.05);
  k.add(rbox(0.04, 1.6, 1.25, 0.01), tiles, LX + 0.05, 0.9, -2.88);
  k.add(rbox(1.36, 0.05, 0.08, 0.015), brass, -3.35, 1.72, BZ + 0.06);
  k.add(rbox(0.08, 0.05, 1.3, 0.015), brass, LX + 0.06, 1.72, -2.88);
  k.add(pipe([[stX, 1.2, stZ], [stX, 2.45, stZ], [stX, 2.75, BZ - 0.1]], 0.08, 0.25, 12), MAT.iron(), 0, 0, 0);
  k.add(torus(0.1, 0.015, 5, 16), brass, stX, 1.9, stZ, 0, { rx: Math.PI / 2 });
  k.add(torus(0.12, 0.02, 5, 16), MAT.iron(), stX, 2.74, BZ + 0.02);
  k.add(cyl(0.008, 0.008, 0.2, 4), brass, stX, 1.7, stZ, 0, { rz: Math.PI / 2 });
  k.at(-2.5, 0, BZ + 0.35, 0.4, () => {
    k.add(lathe([[0.001, 0], [0.15, 0], [0.17, 0.26], [0.2, 0.3], [0.14, 0.33], [0.001, 0.05]], 14), MAT.copper(), 0, 0, 0);
    for (let i = 0; i < 6; i++) k.add(sphere(0.05, 6, 4), MAT.flat('#1e1e22', 0.9), Math.cos(i * 1.1) * 0.08, 0.27 + (i % 2) * 0.03, Math.sin(i * 1.1) * 0.08);
  });
  B.ccol(-2.5, BZ + 0.35, 0.2, 0.35, { noStand: true });
  const stoveLight = B.light('#ff8a3a', 3.2, 4.5, stX + 0.6, 0.6, stZ + 0.6);

  // --- the workbench: pegboard of tools above, the round window over it, parts laid out on top
  const bZ = BZ + 0.45;
  B.put(benchX, bZ, 0, P.workbench, { w: 2.4, d: 0.78 });
  k.at(benchX, 1.58, BZ, 0, () => P.toolBoard(k, 2.1, 0.74));
  const by = 0.9;
  k.at(benchX - 0.95, by, bZ - 0.15, 0.5, () => P.deskLamp(k, { shade: '#7a5aa0' }));
  P.hammer(k, benchX - 0.5, by, bZ + 0.2, 0.3);
  P.wrench(k, benchX - 0.15, by, bZ + 0.25, -0.6);
  P.screwdriver(k, benchX + 0.25, by, bZ + 0.22, 1.2);
  P.oilCan(k, benchX + 0.95, by, bZ - 0.2, 0.4);
  for (const [x, z, r, n] of [[0.05, 0.05, 0.09, 14], [0.32, -0.08, 0.06, 10], [0.48, 0.12, 0.045, 8], [-0.35, -0.12, 0.07, 12]]) k.add(P.gearGeo(r, n, 0.016), brass, benchX + x, by + 0.01, bZ + z, 0, { rx: -Math.PI / 2 });
  k.add(plane(0.42, 0.56), MAT.map(P.CANV.plan('key'), 0.9), benchX - 0.15, by + 0.004, bZ - 0.12, 0.15, { rx: -Math.PI / 2 });
  P.bulb(k, benchX + 0.6, by, bZ + 0.18, 1.1);
  k.add(P.helixGeo(0.03, 0.12, 9, 0.005), MAT.copper(), benchX + 0.72, by + 0.03, bZ + 0.05, 0, { rz: Math.PI / 2 });
  k.add(lathe([[0.001, 0], [0.05, 0], [0.055, 0.08], [0.045, 0.1], [0.001, 0.1]], 12), MAT.flat('#f2ead6', 0.35), benchX + 0.5, by, bZ - 0.2);
  // Baldino's stool
  k.at(benchX - 1.35, 0, BZ + 1.05, 0, () => { k.add(lathe([[0.001, 0.6], [0.18, 0.6], [0.19, 0.64], [0.001, 0.66]], 16), MAT.wood('honey'), 0, 0, 0); for (let i = 0; i < 3; i++) k.add(cyl(0.02, 0.025, 0.62, 6), wood, Math.sin(i * 2.09) * 0.12, 0.31, Math.cos(i * 2.09) * 0.12, 0, { rx: Math.cos(i * 2.09) * 0.12, rz: -Math.sin(i * 2.09) * 0.12 }); });
  B.ccol(benchX - 1.35, BZ + 1.05, 0.2, 0.66, { noStand: true, seeThrough: true });

  // --- the radio he talks to Arthur on, its aerial lead up into the vault, plans pinned around it
  const rX = 1.38;
  B.put(rX, BZ + 0.32, 0, P.radioDesk, {});
  B.put(rX - 0.05, BZ + 1.0, Math.PI + 0.15, P.chair, { pal: 'dark', cushion: '#7a5aa0' }, { noStand: true, seeThrough: true });
  k.add(pipe([[rX + 0.2, 1.2, BZ + 0.05], [rX + 0.2, 2.75, BZ + 0.05], [rX + 0.4, H + 0.4, BZ + 0.45]], 0.012, 0.15, 5), MAT.flat('#1a1a1a', 0.6), 0, 0, 0);
  for (const y of [1.6, 2.2]) k.add(torus(0.02, 0.006, 4, 8), MAT.flat('#efe6d6', 0.4), rX + 0.2, y, BZ + 0.04, Math.PI / 2);
  k.at(rX, 1.9, BZ, 0, () => P.pinnedSheet(k, 0.48, 0.64, P.CANV.plan('radio'), 0.04));
  // a spare propeller hung by the door
  k.at(3.68, 1.95, BZ + 0.08, -Math.PI / 2, () => P.propeller(k, 0.55));

  // --- left wall: curio shelves, chalkboard, drafting table under the big round window
  B.put(LX + 0.22, -1.25, Math.PI / 2, P.curioShelf, { w: 1.4, h: 2.2, d: 0.4, seed: 4 });
  k.at(LX, 1.66, 0.62, Math.PI / 2, () => P.chalkboard(k, 1.7, 1.0));
  k.at(LX, 2.62, 0.62, Math.PI / 2, () => P.pinnedSheet(k, 0.42, 0.52, P.CANV.plan('mill'), 0.06));
  B.put(LX + 0.55, 2.45, Math.PI / 2, P.draftingTable, P.CANV.plan('flyer'));

  // --- the floor: the half-built flying machine, the planet model, a coil, crates
  const fX = 1.0, fZ = 1.0;
  const fm = B.put(fX, fZ, 0, P.flyingMachine, {});
  const pk = new Kit(fm.prop); P.propeller(pk, 0.62); pk.flush();
  P.oilCan(k, 2.78, 0, 1.0, 1.2);   // (by the hoist's foot)
  k.at(2.75, 0, 2.95, 0.3, () => { k.add(rbox(0.55, 0.24, 0.26, 0.02), MAT.paint('#3f6a8a', 0.45), 0, 0.12, 0); k.add(pipe([[-0.17, 0.24, 0], [-0.14, 0.33, 0], [0.14, 0.33, 0], [0.17, 0.24, 0]], 0.012, 0.03, 5), MAT.iron(), 0, 0, 0); });
  B.col(2.75, 2.95, 0.3, 0.16, 0.34, { noStand: true, seeThrough: true, rot: 0.3 });
  const gX = -2.35, gZ = 1.05;
  k.at(-1.75, 0, 0.75, 0, () => P.rug(k, 3.0, 2.1, ['#5a3a7a', '#c8a050', '#e0b8e8', '#f4ece0', '#2a1a3a'], 17));
  const globe = B.put(gX, gZ, 0.3, P.shellGlobe, { r: 0.34 });
  B.light('#c8a8ff', 1.6, 2.6, gX + 0.3, globe.cy, gZ + 0.3);
  // a spark coil in the near corner
  const coilX = -3.4, coilZ = 3.0;
  k.at(coilX, 0, coilZ, 0, () => {
    k.add(rbox(0.5, 0.3, 0.5, 0.03), wood, 0, 0.15, 0);
    k.add(rbox(0.54, 0.04, 0.54, 0.015), brass, 0, 0.31, 0);
    k.add(cyl(0.1, 0.1, 0.8, 16), MAT.flat('#e8dcc0', 0.6), 0, 0.73, 0);
    k.add(P.helixGeo(0.105, 0.72, 30, 0.006, 4), MAT.copper(), 0, 0.36, 0);
    k.add(torus(0.13, 0.05, 8, 20), MAT.steel(), 0, 1.18, 0, 0, { rx: Math.PI / 2 });
    k.add(sphere(0.06, 12, 8), MAT.glow('#e0d0ff', '#9a6aff', 1.6), 0, 1.25, 0);
  });
  B.ccol(coilX, coilZ, 0.32, 1.3, { noStand: true });
  const spark = glowSprite('#c8a0ff', 0.7, 0.6); spark.position.set(coilX, 1.26, coilZ); B.group.add(spark);
  B.put(3.55, 2.95, 0, P.barrel, { r: 0.28, h: 0.78, pal: 'red' });
  B.put(3.5, 2.0, 0.2, P.crate, 0.6);
  B.giver('barrel', 3.55, 2.95, ['money'], 4, { r: 1.0, top: 0.9 });
  B.giver('crate', 3.5, 2.0, ['life', 'magic'], 1, { r: 1.0, top: 0.7 });
  k.at(3.5, 0.6, 2.0, -0.3, () => { k.add(P.gearGeo(0.16, 18, 0.03), brass, 0, 0.02, 0, 0, { rx: -Math.PI / 2 }); k.add(P.gearGeo(0.09, 12, 0.025), MAT.copper(), 0.12, 0.05, 0.12, 0, { rx: -Math.PI / 2 }); });

  // --- festoon cables along the walls and the hanging lamps
  k.add(pipe(sag([-3.7, 3.02, BZ + 0.12], [0.2, 3.02, BZ + 0.12], 0.22, 12), 0.012, 0.1, 5), MAT.flat('#1a1a1a', 0.6), 0, 0, 0);
  k.add(pipe(sag([LX + 0.12, 3.0, -3.2], [LX + 0.12, 3.0, 1.0], 0.25, 12), 0.012, 0.1, 5), MAT.flat('#1a1a1a', 0.6), 0, 0, 0);
  for (const [x, z, y] of [[benchX, -2.4, 2.6], [fX, fZ - 0.2, 2.65], [-2.3, 0.4, 2.6]]) k.at(x, 0, z, 0, () => P.hangingLamp(k, y, H + 0.6, { shade: '#8a6a3a' }));
  B.light('#ffcf8a', 7.5, 10, fX, 2.3, fZ - 0.2);
  B.light('#ffd090', 5, 6.5, benchX, 2.1, -2.4);
  B.light('#ffd8a0', 4, 6, -2.3, 2.2, 0.5);
  B.light('#ffdca8', 2.2, 3, benchX - 0.95, 1.2, bZ + 0.1);
  B.light('#eadcff', 2.5, 4.5, LX + 0.9, 2.0, 2.45);
  B.light('#eadcff', 2.2, 4, doorX, 1.7, BZ + 0.9);

  R.updaters.push((dt, tt) => {
    stoveLight.intensity = stoveLight.userData.base * (0.85 + Math.sin(tt * 11) * 0.1 + Math.sin(tt * 7) * 0.05);
    globe.spin.rotation.y = tt * 0.25;
    fm.prop.rotation.x = tt * 0.35;
    spark.material.opacity = 0.35 + 0.3 * Math.max(0, Math.sin(tt * 13) * Math.sin(tt * 3.7));
  });
  const face = (x, z, tx, tz) => ({ ...B.world(x, z), a: Math.atan2(tx - x, tz - z) });
  const bal = [benchX - 0.5, BZ + 1.2];
  R.npcSpots = { baldino: { ...B.world(bal[0], bal[1]), a: 0.3 }, zoe: face(0.15, -1.25, bal[0], bal[1]), twinsen: face(-1.1, -0.45, bal[0], bal[1]) };
  R.searches.push({ id: 'bench', ...B.world(benchX + 0.55, BZ + 1.15), r: 1.0 });
  R.searches.push({ id: 'globe', ...B.world(gX + 0.7, gZ + 0.45), r: 1.1 });
  dressWorkshop(B, R, { glowSprite, H });
  return B.finish();
}

// ------------------------------------------------------------------ the Citadel lighthouse's lamp room
// Round room: the far half is glazed all the way round between an iron dado and a plaster band (sky and
// sea behind, the gallery railing outside), the near half is cut down to a low rim like every interior.
// The big Fresnel lens turns in the middle; the old transmitter Zoe uses stands against the glazing.
function buildLightTop(scene, physics) {
  const B = new RoomBuilder(scene, physics, 'lighttop', 1600, 0);
  const R = B.room, k = B.k;
  const Rr = 3.0, t = 0.3, H = 3.2, sill = 0.95, gTop = 2.62, rimH = 0.5;
  R.view = 9.8;
  R.follow = 0.15;
  const brass = MAT.brass(), ironP = MAT.paint('#2e3a40', 0.45), white = twoSided(MAT.plaster('#eef0ee'));
  const dado = twoSided(MAT.plates('#3f6670', 1)), stone = MAT.stone('sand', 1.4);
  const pol = (phi, r) => [Math.sin(phi) * r, Math.cos(phi) * r];
  const face2 = (a, b, p0, pl, segs = 64) => new THREE.LatheGeometry([new THREE.Vector2(a[0], a[1]), new THREE.Vector2(b[0], b[1])], segs, p0, pl);
  // horizontal ring arc (radius rad) from phi0 to phi1 at height y, around (cx, cz)
  const arc = (rad, tube, phi0, phi1, y, m, cx = 0, cz = 0, o = {}) => k.add(torus(rad, tube, o.rs || 5, o.ts || Math.max(8, Math.round((phi1 - phi0) * 12)), phi1 - phi0), m, cx, y, cz, 0, { rx: Math.PI / 2, rz: Math.PI / 2 - phi1, ...(o.sz ? { sz: o.sz } : {}) });
  const F0 = (3 * Math.PI) / 4, F1 = (7 * Math.PI) / 4; // far (tall, glazed) half
  const N0 = -Math.PI / 4, N1 = (3 * Math.PI) / 4; // near (cut-down) half

  // --- floor with the stair well cut out, the tower masonry under it, the gallery deck outside
  const hx = Math.sin(F0) * 2.0, hz = Math.cos(F0) * 2.0, hr = 0.62;
  const ringShape = (ro) => { const s = new THREE.Shape(); s.absarc(0, 0, ro, 0, Math.PI * 2, false); const h = new THREE.Path(); h.absarc(hx, -hz, hr, 0, Math.PI * 2, true); s.holes.push(h); return s; };
  const fg = new THREE.ExtrudeGeometry(ringShape(Rr + 0.02), { depth: 0.1, bevelEnabled: false, curveSegments: 24 });
  k.add(fg, MAT.tread('#7e8a90'), 0, -0.1, 0, 0, { rx: -Math.PI / 2 });
  const sg = new THREE.ExtrudeGeometry(ringShape(Rr + t), { depth: 1.3, bevelEnabled: false, curveSegments: 24 });
  k.add(sg, stone, 0, -1.42, 0, 0, { rx: -Math.PI / 2 });
  B.ccol(0, 0, Rr, 0, { seeThrough: true, bottom: -1 });
  const go = Rr + t + 0.72;
  const deck = new THREE.RingGeometry(Rr + t - 0.02, go, 72, 1); deck.userData.keepUV = true;
  k.add(deck, MAT.tread('#5a6468'), 0, -0.04, 0, 0, { rx: -Math.PI / 2 });
  k.add(face2([go, -0.04], [go, -0.16], 0, Math.PI * 2, 72), twoSided(ironP), 0, 0, 0);
  for (let i = 0; i < 24; i++) { const ph = (i / 24) * Math.PI * 2, [x, z] = pol(ph, Rr + t + 0.3); k.add(rbox(0.62, 0.34, 0.16, 0.03), stone, x, -0.33, z, ph - Math.PI / 2, { rz: 0 }); }
  // the gallery railing (only the near half can be seen past the rim)
  const gr = go - 0.08;
  for (let ph = N0 - 0.15; ph <= N1 + 0.16; ph += Math.PI / 14) { const [x, z] = pol(ph, gr); k.add(cyl(0.02, 0.025, 1.0, 6), ironP, x, 0.46, z); k.add(sphere(0.03, 6, 4), ironP, x, 0.98, z); }
  arc(gr, 0.025, N0 - 0.15, N1 + 0.16, 0.95, ironP); arc(gr, 0.014, N0 - 0.15, N1 + 0.16, 0.5, ironP); arc(gr, 0.014, N0 - 0.15, N1 + 0.16, 0.08, ironP);

  // --- far half: iron dado, sill, glazing with diagonal astragals, plaster band, the vault springing
  k.add(face2([Rr, sill], [Rr, 0], F0, Math.PI), dado, 0, 0, 0);
  k.add(face2([Rr - 0.09, sill], [Rr + t, sill], F0, Math.PI), white, 0, 0, 0);
  k.add(face2([Rr - 0.09, sill - 0.06], [Rr - 0.09, sill], F0, Math.PI), brass, 0, 0, 0);
  arc(Rr - 0.02, 0.03, F0, F1, 0.1, brass);
  arc(Rr - 0.02, 0.025, F0, F1, sill - 0.12, brass);
  const pano = M('lamppanoMat', () => { const m = new THREE.MeshBasicMaterial({ map: P.CANV.pano(), side: THREE.BackSide }); m.userData.noShadow = true; return m; });
  const glz = new THREE.CylinderGeometry(Rr + 0.12, Rr + 0.12, gTop - sill, 64, 1, true, F0, Math.PI);
  k.add(glz, pano, 0, (sill + gTop) / 2, 0);
  k.add(face2([Rr, gTop], [Rr + 0.12, gTop], F0, Math.PI), white, 0, 0, 0);
  k.add(face2([Rr, H], [Rr, gTop], F0, Math.PI), white, 0, 0, 0);
  arc(Rr - 0.015, 0.03, F0, F1, sill + 0.02, brass); arc(Rr - 0.015, 0.03, F0, F1, gTop - 0.02, brass); arc(Rr - 0.02, 0.04, F0, F1, H - 0.08, MAT.wood('dark'));
  const bays = 8, bw = Math.PI / bays, aR = Rr + 0.03;
  const helix = (p0, p1) => Array.from({ length: 7 }, (_, i) => { const u = i / 6, ph = p0 + (p1 - p0) * u; return [Math.sin(ph) * aR, sill + (gTop - sill) * u, Math.cos(ph) * aR]; });
  for (let i = 0; i <= bays; i++) {
    const ph = F0 + i * bw, [x, z] = pol(ph, Rr + 0.03);
    k.add(rbox(0.06, gTop - sill, 0.07, 0.015), ironP, x, (sill + gTop) / 2, z, ph);
    if (i < bays) { k.add(pipe(helix(ph, ph + bw), 0.016, 0.05, 5), ironP, 0, 0, 0); k.add(pipe(helix(ph + bw, ph), 0.016, 0.05, 5), ironP, 0, 0, 0); }
  }
  const cR = 0.9, cT = 0.85, coveProf = Array.from({ length: 9 }, (_, i) => { const a = (cT * i) / 8; return new THREE.Vector2(Rr - cR * (1 - Math.cos(a)), H + cR * Math.sin(a)); });
  k.add(new THREE.LatheGeometry(coveProf, 64, F0, Math.PI), white, 0, 0, 0);
  const cTopR = Rr - cR * (1 - Math.cos(cT)), cTopY = H + cR * Math.sin(cT);
  arc(cTopR, 0.06, F0, F1, cTopY + 0.02, MAT.plaster('#d8dcd8'), 0, 0, { sz: 0.6 });
  for (let i = 0; i <= 4; i++) { const ph = F0 + i * (Math.PI / 4); k.add(pipe(coveProf.map((v) => [Math.sin(ph) * (v.x - 0.02), v.y, Math.cos(ph) * (v.x - 0.02)]), 0.028, 0.1, 5), brass, 0, 0, 0); }
  // piers where the cut-away begins
  for (const ph of [F0, F1]) { const [x, z] = pol(ph, Rr + t / 2 - 0.05); k.add(rbox(t + 0.2, H + 0.1, 0.16, 0.04), white, x, (H + 0.1) / 2, z, ph - Math.PI / 2); k.add(rbox(t + 0.3, 0.1, 0.22, 0.03), MAT.wood('dark'), x, rimH + 0.02, z, ph - Math.PI / 2); }

  // --- near half: the low rim
  k.add(face2([Rr, rimH], [Rr, 0], N0, Math.PI), dado, 0, 0, 0);
  k.add(face2([Rr + t, -0.05], [Rr + t, rimH], N0, Math.PI), twoSided(stone), 0, 0, 0);
  arc(Rr + t / 2, t / 2 + 0.05, N0, N1, rimH + 0.02, MAT.wood('dark'), 0, 0, { rs: 6, sz: 0.4 });
  arc(Rr - 0.02, 0.03, N0, N1, 0.1, brass);
  // wall colliders all the way round
  const NC = 28;
  for (let i = 0; i < NC; i++) { const ph = ((i + 0.5) / NC) * Math.PI * 2, [x, z] = pol(ph, Rr + t / 2); B.col(x, z, (Rr + t / 2) * Math.tan(Math.PI / NC) + 0.03, t / 2, H, { rot: ph }); }

  // --- the spiral stair down the tower: well, newel, wedge steps, a railing round the opening
  k.add(face2([hr, 0], [hr, -1.42], 0, Math.PI * 2, 28), twoSided(MAT.stone('slate', 1)), hx, 0, hz);
  k.add(P.disc(hr, 28), MAT.flat('#0a0a0c', 1), hx, -1.4, hz, 0, { rx: -Math.PI / 2 });
  k.add(torus(hr, 0.035, 5, 32), brass, hx, 0.0, hz, 0, { rx: Math.PI / 2 });
  k.add(cyl(0.06, 0.06, 2.3, 10), ironP, hx, -0.4, hz);
  k.add(lathe([[0.001, 0], [0.08, 0], [0.09, 0.04], [0.05, 0.08], [0.06, 0.12], [0.001, 0.16]], 12), brass, hx, 0.75, hz);
  const stepGeo = slab('lhstep', (s) => { const a = 0.32, r0 = 0.06, r1 = hr - 0.03; s.moveTo(Math.cos(-a) * r0, Math.sin(-a) * r0); s.lineTo(Math.cos(-a) * r1, Math.sin(-a) * r1); s.absarc(0, 0, r1, -a, a, false); s.lineTo(Math.cos(a) * r0, Math.sin(a) * r0); s.lineTo(Math.cos(-a) * r0, Math.sin(-a) * r0); }, 0.05, 0.008);
  for (let i = 0; i < 8; i++) { const ph = -i * 0.6, y = -0.035 - i * 0.18; k.add(stepGeo, MAT.tread('#7e8a90'), hx, y, hz, ph - Math.PI / 2, { rx: -Math.PI / 2 }); }
  const gap = 0.75, rr0 = gap, rr1 = Math.PI * 2 - gap, rRad = hr + 0.08;
  for (let i = 0; i <= 6; i++) { const ph = rr0 + ((rr1 - rr0) * i) / 6, [x, z] = pol(ph, rRad); k.add(cyl(0.02, 0.026, 0.95, 6), brass, hx + x, 0.475, hz + z); }
  arc(rRad, 0.024, rr0, rr1, 0.95, brass, hx, hz); arc(rRad, 0.014, rr0, rr1, 0.5, brass, hx, hz);
  for (let i = 0; i < 7; i++) { const ph = rr0 + ((rr1 - rr0) * (i + 0.5)) / 7, [x, z] = pol(ph, rRad); B.col(hx + x, hz + z, rRad * Math.tan((rr1 - rr0) / 14) + 0.04, 0.07, 1.0, { rot: ph, noStand: true, seeThrough: true }); }
  R.exits.push({ ...B.world(hx, hz + 0.3), r: 0.6, to: 'outdoor-lighthouse' });
  R.spawn = { ...B.world(hx, hz + 1.25), a: -Math.PI / 2 };

  // --- the lens on its pedestal, turning; the lamp's glow
  B.put(0, 0, 0, P.lensPedestal, {}, { noStand: true });
  const lensPivot = new THREE.Group(); lensPivot.position.set(0, 0.78, 0); B.group.add(lensPivot);
  const lk = new Kit(lensPivot); const lens = P.fresnelLens(lk); lk.flush();
  B.ccol(0, 0, 0.7, 0.78 + lens.height, { noStand: true });
  const lampY = 0.78 + 0.83;
  const glow = glowSprite('#ffe2a0', 1.9, 0.75); glow.position.set(0, lampY, 0); B.group.add(glow);
  const lampLight = B.light('#ffe2a8', 7, 7.5, 0, lampY, 0);

  // --- the transmitter cabinet: three big dials, valves and a signal lamp on top
  const loc = (cx, cz, ry, lx, lz) => [cx + lx * Math.cos(ry) + lz * Math.sin(ry), cz - lx * Math.sin(ry) + lz * Math.cos(ry)];
  const phC = (200 * Math.PI) / 180, [cX, cZ] = pol(phC, 2.42), cRy = phC + Math.PI;
  const tc = B.put(cX, cZ, cRy, P.transmitterCabinet, {});
  { const [x, z] = loc(cX, cZ, cRy, 0, tc.shelfZ); B.col(x, z, tc.hw, 0.16, tc.shelfY, { rot: cRy, noStand: true, seeThrough: true }); }
  // logbook of frequencies and a pencil on the writing shelf
  k.at(cX, tc.shelfY, cZ, cRy, () => { P.ledger(k, 0.55, 0, tc.shelfZ, 0.1, '#2a4a3a'); P.papers(k, -0.55, 0, tc.shelfZ, 2, 31, 'ledger'); k.add(cyl(0.005, 0.005, 0.16, 5), MAT.paint('#d8a13b', 0.5), 0.1, 0.008, tc.shelfZ + 0.05, 0.5, { rz: Math.PI / 2 }); });
  const txLight = new THREE.PointLight('#ff9a50', 0, 4, 2);
  { const [x, z] = loc(cX, cZ, cRy, 0.75, 0.2); txLight.position.set(x, tc.top + 0.3, z); } B.group.add(txLight);
  // glows over the valves and the signal lamp, shown while transmitting
  const txGlows = [];
  for (let i = 0; i < 5; i++) { const [x, z] = loc(cX, cZ, cRy, -0.6 + i * 0.3, -0.04); const g = glowSprite('#ffb060', 0.32, 0.8); g.position.set(x, 1.7 + 0.21, z); g.visible = false; B.group.add(g); txGlows.push(g); }
  { const [x, z] = loc(cX, cZ, cRy, 1.9 / 2 - 0.2, 0.08); const g = glowSprite('#ff5030', 0.6, 0.9); g.position.set(x, 1.7 + 0.2, z); g.visible = false; B.group.add(g); txGlows.push(g); }
  const dialSet = tc.dials.map((pv, i) => {
    const d = { id: 'dial' + (i + 1), mesh: pv, value: 1, target: 0, set(v) { this.value = ((v % 3) + 3) % 3; this.target = -(this.value - 1) * (Math.PI / 3); } };
    d.set(1); pv.rotation.z = d.target;
    return d;
  });
  R.dials = dialSet;
  R.transmitter = {
    on: false,
    setOn(b) { this.on = !!b; tc.tubeMat.emissiveIntensity = b ? 3.2 : 0.05; tc.lampMat.emissiveIntensity = b ? 3 : 0; tc.faceMat.emissiveIntensity = b ? 1.6 : 0; txLight.intensity = b ? 3 : 0; txGlows.forEach((g) => { g.visible = !!b; }); },
  };
  tc.dx.forEach((dx, i) => { const [x, z] = loc(cX, cZ, cRy, dx, tc.shelfZ + 0.62); R.searches.push({ id: 'dial' + (i + 1), ...B.world(x, z), r: 0.45 }); });

  // --- the microphone on its little table, its cable to the cabinet
  const phM = (250 * Math.PI) / 180, [mX, mZ] = pol(phM, 2.35), mRy = phM + Math.PI;
  B.put(mX, mZ, mRy, P.sideTable, {});
  k.at(mX, 0.62, mZ, mRy, () => P.microphone(k));
  { const [ex, ez] = loc(cX, cZ, cRy, -tc.hw + 0.05, 0.0); k.add(pipe([[mX, 0.62, mZ], [mX, 0.02, mZ + 0.0], [(mX + ex) / 2, 0.02, (mZ + ez) / 2 + 0.1], [ex, 0.02, ez], [ex, 0.4, ez]], 0.012, 0.12, 5), MAT.flat('#1a1a1a', 0.6), 0, 0, 0); }
  { const [x, z] = pol(phM, 1.62); R.searches.push({ id: 'mic', ...B.world(x, z), r: 0.45 }); R.npcSpots = { zoe: { ...B.world(x, z), a: Math.atan2(mX - x, mZ - z) } }; }

  // --- the keeper's desk with the logbook, chair, oil lamp; paraffin drums; near-rim odds and ends
  const phD = (282 * Math.PI) / 180, [dX, dZ] = pol(phD, 2.45), dRy = phD + Math.PI;
  B.put(dX, dZ, dRy, P.desk, { w: 1.2, d: 0.6, pal: 'dark', leather: '#2a4a3a' });
  k.at(dX, 0.78, dZ, dRy, () => {
    P.ledger(k, 0.05, 0, 0.05, -0.1, '#5a2a1a');
    k.at(-0.42, 0, -0.1, 0, () => { k.add(lathe([[0.001, 0], [0.07, 0], [0.075, 0.02], [0.03, 0.04], [0.06, 0.1], [0.05, 0.14], [0.02, 0.16], [0.001, 0.16]], 12), brass, 0, 0, 0); k.add(lathe([[0.04, 0], [0.05, 0.06], [0.04, 0.14], [0.025, 0.2], [0.03, 0.22]], 12), MAT.glass('#fff4d8', 0.45), 0, 0.16, 0); k.add(cyl(0.008, 0.008, 0.03, 5), MAT.glow('#fff0b0', '#ffb030', 3), 0, 0.2, 0); });
    k.add(cyl(0.03, 0.035, 0.42, 10), brass, 0.42, 0.04, -0.12, 0.6, { rz: Math.PI / 2 });
    P.bookStack(k, -0.4, 0, 0.15, 2, 9);
  });
  { const [x, z] = pol(phD, 1.72); B.put(x, z, phD, P.chair, { pal: 'dark', cushion: '#3f6670' }, { noStand: true, seeThrough: true }); }
  { const [x, z] = pol(phD - 0.05, Rr - 0.02); k.at(x, 1.75, z, phD + Math.PI, () => P.wallClock(k, 0.16)); }
  for (const [deg, r] of [[318, 2.55], [329, 2.6]]) { const [x, z] = pol((deg * Math.PI) / 180, r); B.put(x, z, deg, P.barrel, { r: 0.21, h: 0.6, pal: 'grey' }); k.add(cyl(0.03, 0.03, 0.04, 8), brass, x + 0.06, 0.6, z); }
  { const [x, z] = pol((15 * Math.PI) / 180, 2.55); k.at(x, 0, z, 0.3, () => { k.add(lathe([[0.001, 0], [0.13, 0], [0.16, 0.3], [0.001, 0.3]], 14), MAT.paint('#c8302a', 0.45), 0, 0, 0); k.add(torus(0.15, 0.01, 4, 10, Math.PI), MAT.iron(), 0, 0.3, 0, 0); k.add(cyl(0.14, 0.14, 0.01, 12), MAT.flat('#d8c890', 0.9), 0, 0.27, 0); }); B.ccol(x, z, 0.18, 0.32, { noStand: true }); }
  { const [x, z] = pol((50 * Math.PI) / 180, 2.55); k.at(x, 0, z, 0, () => { for (let i = 0; i < 4; i++) k.add(torus(0.22 - i * 0.03, 0.035, 5, 16), MAT.cloth('#c9a66b', '#7a5a30'), 0, 0.035 + i * 0.06, 0, 0, { rx: Math.PI / 2 }); }); B.ccol(x, z, 0.26, 0.3, { noStand: true, seeThrough: true }); }
  { const [x, z] = pol((-20 * Math.PI) / 180, 2.5); B.put(x, z, 0.4, P.crate, 0.5); B.giver('crate', x, z, ['money', 'life', 'magic'], 3, { r: 1.0, top: 0.6 }); }

  // --- light: cool daylight from the glazing, the lamp's warm glow
  B.light('#dceeff', 5, 8, -1.6, 2.3, -1.6);
  B.light('#e4f2ff', 3.5, 7, 1.4, 2.4, 0.9);
  B.light('#d0e4ff', 2.5, 6, -2.0, 1.6, 1.2);
  R.updaters.push((dt, tt) => {
    lensPivot.rotation.y = tt * 0.3;
    const p = 0.9 + Math.sin(tt * 2.3) * 0.06;
    lampLight.intensity = lampLight.userData.base * p; lens.glowMat.emissiveIntensity = 3 * p; glow.material.opacity = 0.7 * p;
    for (const d of R.dials) { const e = d.target - d.mesh.rotation.z; d.mesh.rotation.z += Math.abs(e) < 0.002 ? e : e * Math.min(1, dt * 10); }
    if (R.transmitter.on) { const b = 0.75 + 0.25 * Math.sin(tt * 6); tc.lampMat.emissiveIntensity = 3 * b; txLight.intensity = 3 * b; txGlows[5].material.opacity = 0.9 * b; }
  });
  return B.finish();
}

export function buildInteriors(scene, physics) {
  const rooms = {
    house: buildHouse(scene, physics), well: buildWell(scene, physics),
    office: buildOffice(scene, physics), projoffice: buildProjOffice(scene, physics), control: buildControl(scene, physics),
    workshop: buildWorkshop(scene, physics), lighttop: buildLightTop(scene, physics),
    cellar: buildCellar(scene, physics),
  };
  // rooms' colliders are always active but far from the island, so they never interfere
  return rooms;
}
