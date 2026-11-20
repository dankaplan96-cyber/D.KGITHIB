// EQUIP-2b in the world: where LBA3's next three own tools come from, their lessons and their later uses (the tools
// themselves: src/game/tools.js; the concepts: docs/future/EQUIP2_CONCEPTS.md items 3–5). Not a chapter: the director
// (index.js) asks it after the chapter in progress, as kit2.js. Its story state is flags prefixed e2b_; what Twinsen
// owns is game.hero.arms.fork / line / heatflask / heat (saved with the hero).
//
//   Ilka's singing fork (chapter 4, The Dig): once Twinsen has her notebook back she trusts him: on the next talk she
//     gives it (then says what the chapter has her say). An older save past that point: on any later talk with her.
//     Lesson: her old sample niche at the bottom of the dig, beside the warm crack: a crust of warm crystal over a
//     hollow (a strike cracks it), a sleeping crystal on its ledge (a second strike, once the fork is quiet again,
//     wakes it as a lamp), her old tin in its light (a clover, or 10 kashes with nine; once). Fights: the dig's mites.
//     Later: the crystal galleries (chapter 11): a slab with a stuck crystal wheel; struck, it turns and the slab sinks
//     (20 kashes Vesk's crew left; once).
//   The Esmer line (chapter 3 on, Nara's case on Zeelich's street, 25 kashes; chapter 9 on, her gift after her stamp if
//     it was never bought). Lesson: the old cloud canal at the island's edge nearest her case: a mooring rock across a
//     gap of cloud (no walk, no jump, no hop-pack crosses the cloud sea), a cord ring on an arch at each side; from the
//     rock a cargo crate on a further rock is in the line's reach (it comes to his feet and cracks open: a clover and
//     12 kashes; once). Later: a ring hung on a davit at the old mill's gallery: up in one pull (the stair-stones stay).
//     Safety: standing on the mooring rock without the line (an odd save) puts him back on the shore.
//   The heat flask (chapter 6, The Pass: Tashi, Lhar's smith, built it from Baldino's radioed drawing round a project
//     heat cell; once Yorna has told of the frozen winch; also in chapter 7). Heat sources: the steam crack by Lhar's
//     falls, the project heat post once it runs, the monks' brazier in the monastery yard, the glacier vent once open.
//     Lesson: the frozen winch: heat let out at its ice thaws it (the chapter's own thaw follows: pass.js thawT) — the
//     other way to the fuse and the kite. Later: a chest frozen into the ice by the monastery yard wall (the brazier
//     beside it): heat frees it (a clover and 10 kashes; once). Fights: the ice mites at the lift (double damage).
// Nothing on the main path needs any of them; each is optional where the old arsenal is.
import * as THREE from 'three';
import { ChapterBase } from './base.js';
import { MAT, rbox, cyl, sphere, torus, crate, canvasTex, Kit } from '../props.js';
import { rockGeometry } from '../vegetation.js';
import { FLASK } from '../tools.js';
import { WATER_FLOOR } from '../../engine/physics.js';
import '../text/kit2b.js';

export const LINE_PRICE = 25;
const DRAW_R = 1.7;   // m: near enough to a heat source to draw its heat

export class Kit2b extends ChapterBase {
  get A() { return this.game.hero.arms; }
  roomId() { return this.game.room?.id ?? 'citadel'; }
  canUse() { const b = this.game.hero.body; return b !== 'zoe' && b !== 'worker'; }
  idx(key) { return this.story.chapters.findIndex((c) => c.key === key); }
  at(key) { const i = this.idx(key); return i >= 0 && this.story.index >= i; }
  // a group in an area at world coordinates (its group may sit anywhere)
  holder(room, x, y, z, ry = 0) {
    const grp = new THREE.Group(), gp = room.group.position;
    grp.position.set(x - gp.x, y - gp.y, z - gp.z); grp.rotation.y = ry; room.group.add(grp); return grp;
  }
  // walkable from a to b in a straight line (level enough, nothing in the way) — for spots found, not fixed
  walkable(a, b, y) {
    const P = this.game.physics, d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(d / 0.5));
    let gy = y;
    for (let i = 1; i <= n; i++) {
      const x = a.x + (b.x - a.x) * (i / n), z = a.z + (b.z - a.z) * (i / n), g = P.groundAt(x, z, gy + 0.55);
      if (Math.abs(g - gy) > 0.5 || P.blockedAt(x, z, g, 0.35)) return false;
      gy = g;
    }
    return true;
  }
  // a level, free spot of radius r near (x, z) at height y (ground within dh all round), or null
  level(x, z, y, r, dh = 0.3) {
    const P = this.game.physics, g0 = P.groundAt(x, z, y + 1.5);
    if (Math.abs(g0 - y) > 1.2 || P.blockedAt(x, z, g0, r)) return null;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, g = P.groundAt(x + Math.sin(a) * r, z + Math.cos(a) * r, g0 + 1); if (Math.abs(g - g0) > dh) return null; }
    return g0;
  }

  // ---------------------------------------------------------------- the props
  decorate() {
    const R = this.game.rooms;
    if (R.desert?.dig?.crack && this.once('niche')) this.buildNiche(R.desert);
    if (R.c3gallery && this.once('wheel')) this.buildWheel(R.c3gallery);
    if (R.zeelich?.npcSpots?.esmer1 && this.once('canal')) this.buildCanal(R.zeelich);
    if (R.zeelich?.millTop && this.once('millring')) this.buildMillRing(R.zeelich);
    if (R.hamalayi?.lhar && this.once('hamalayi')) this.buildHamalayi(R.hamalayi);
    this.applyFlags();
  }
  // ---- the dig: Ilka's old sample niche beside the warm crack (found, not fixed: level, free, away from the ramp)
  buildNiche(D) {
    const P = this.game.physics, dg = D.dig, cr = dg.crack, y0 = dg.bottomY;
    const a0 = Math.atan2(cr.z - dg.z, cr.x - dg.x), r0 = Math.hypot(cr.x - dg.x, cr.z - dg.z);
    let sp = null;
    for (const da of [-0.42, -0.55, -0.32, -0.7, 0.42, 0.55]) for (const dr of [0.95, 1.2, 0.75]) {
      if (sp) continue;
      const a = a0 + da, r = r0 - dr, x = dg.x + Math.cos(a) * r, z = dg.z + Math.sin(a) * r;
      if (Math.abs(P.groundAt(x, z, y0 + 1) - y0) > 0.25 || P.blockedAt(x, z, y0, 0.75)) continue;
      const fx = dg.x + Math.cos(a) * (r - 1.6), fz = dg.z + Math.sin(a) * (r - 1.6);   // (room to stand in front)
      if (Math.abs(P.groundAt(fx, fz, y0 + 1) - y0) > 0.25 || P.blockedAt(fx, fz, y0, 0.4)) continue;
      sp = { x, z };
    }
    sp ??= { x: dg.x + Math.cos(a0 - 0.42) * (r0 - 0.95), z: dg.z + Math.sin(a0 - 0.42) * (r0 - 0.95) };
    const face = Math.atan2(dg.x - sp.x, dg.z - sp.z);   // (its open side toward the dig's middle: local +z)
    const grp = this.holder(D, sp.x, y0, sp.z, face), k = new Kit(grp);
    k.add(rockGeometry(17), MAT.flat('#c8a07a', 0.92, { vertexColors: true }), 0, 0.42, -0.2, 0, { sx: 0.95, sy: 1.35, sz: 0.8 });
    k.add(rbox(0.62, 0.56, 0.5, 0.16), MAT.flat('#0a0806', 1), 0, 0.66, 0.3);   // the hollow
    k.add(rbox(0.66, 0.07, 0.36, 0.02), MAT.stone('sand', 1), 0, 0.4, 0.4);     // its ledge
    k.flush();
    // the crust: warm crystal grown over the hollow's mouth
    const crust = new THREE.Group(); crust.position.set(0, 0.66, 0.6); grp.add(crust);
    const cm = MAT.glow('#bff8ff', '#30c8f0', 0.9), cg = new THREE.OctahedronGeometry(0.11, 0);
    [[-0.2, 0.12, 0.3, 1.6], [0.05, 0.18, -0.2, 2.0], [0.22, 0.05, 0.4, 1.4], [-0.1, -0.12, 0.9, 1.8], [0.15, -0.16, -0.6, 1.5], [-0.25, -0.1, 1.2, 1.3], [0.0, 0.0, 0.1, 2.2]].forEach(([x, y, rz, sy]) => {
      const m = new THREE.Mesh(cg, cm); m.position.set(x, y, 0); m.rotation.set(0.3, 0, rz); m.scale.set(1, sy, 0.8); crust.add(m);
    });
    // the sleeping crystal on the ledge (dull until a strike wakes it: then a lamp; no light, its own glow)
    const sleeper = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), new THREE.MeshStandardMaterial({ color: '#6a7a88', emissive: '#40d8ff', emissiveIntensity: 0, roughness: 0.25 }));
    sleeper.position.set(0.17, 0.55, 0.38); sleeper.scale.set(1, 1.9, 1); grp.add(sleeper);
    const tin = new THREE.Group(); tin.position.set(-0.12, 0.44, 0.4); grp.add(tin);
    const tb = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.14), MAT.flat('#7a8a8a', 0.45, { metalness: 0.5 })); tb.position.y = 0.04; tin.add(tb);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.02, 0.15), MAT.flat('#c8a050', 0.5, { metalness: 0.3 })); tl.position.y = 0.09; tin.add(tl);
    P.add({ type: 'cyl', x: sp.x, z: sp.z, r: 0.7, top: y0 + 1.4, noStand: true });
    this.niche = { room: 'desert', grp, crust, sleeper, tin, x: sp.x, y: y0, z: sp.z, face };
  }
  // ---- the crystal galleries: a slab with a crystal wheel, against the back wall of the start-side shelf
  buildWheel(GL) {
    const g = this.game, y = GL.deckY ?? 3, grp = new THREE.Group(); grp.position.set(-11.4, y, -8.5); GL.group.add(grp);
    const k = new Kit(grp), stone = MAT.stone('grey', 1);
    for (const sx of [-0.66, 0.66]) k.add(rbox(0.22, 1.75, 0.32, 0.04), stone, sx, 0.875, 0);
    k.add(rbox(1.56, 0.24, 0.36, 0.05), stone, 0, 1.86, 0);
    k.add(rbox(1.1, 1.5, 0.12, 0.02), MAT.flat('#06070a', 1), 0, 0.76, -0.1);   // the recess behind the slab
    k.flush();
    const slab = new THREE.Group(); grp.add(slab);
    const sm = new THREE.Mesh(rbox(1.08, 1.48, 0.16, 0.03), MAT.stone('slate', 1)); sm.position.y = 0.75; sm.castShadow = true; slab.add(sm);
    const rosette = new THREE.Group(); rosette.position.set(0, 0.88, 0.1); slab.add(rosette);
    const pm = MAT.glow('#d8c8ff', '#8a5aff', 0.8), pg = new THREE.OctahedronGeometry(0.06, 0);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, m = new THREE.Mesh(pg, pm); m.position.set(Math.sin(a) * 0.2, Math.cos(a) * 0.2, 0.02); m.rotation.z = -a; m.scale.set(1, 2.2, 0.8); rosette.add(m); }
    const hub = new THREE.Mesh(cyl(0.07, 0.07, 0.06, 10), MAT.brass()); hub.rotation.x = Math.PI / 2; rosette.add(hub);
    const cache = new THREE.Group(); cache.position.set(0.1, 0.02, -0.1); grp.add(cache);
    const cb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.2), MAT.flat('#5a6a5a', 0.5, { metalness: 0.4 })); cb.position.y = 0.07; cache.add(cb);
    const v = new THREE.Vector3(); grp.getWorldPosition(v);
    GL.colliders?.push?.(g.physics.add({ type: 'box', x: v.x, z: v.z, hw: 0.8, hd: 0.22, rot: 0, top: y + 2.0, noStand: true }));
    this.wheel = { room: 'c3gallery', grp, slab, rosette, cache, x: v.x, y, z: v.z + 0.4, turnT: 0 };
  }
  // ---- Zeelich: the old cloud canal at the island's edge nearest Nara's case. Found, not fixed: from her case outward
  // in 48 directions to the cloud sea; the shore must be level and free, out of the street and away from the pier, the
  // mills, the depot, the platform and the test step, with nothing at all out over the clouds for 14 m, and the line's
  // two routes across clear. The nearest such edge to her case.
  buildCanal(Z) {
    const g = this.game, P = g.physics, s1 = Z.npcSpots.esmer1, o = Z.group.position;
    const y0 = P.groundAt(s1.x, s1.z, 30);
    const sea = (x, z) => { const gi = P.groundInfo(x, z, y0 + 3); return !gi.brick && gi.h < WATER_FLOOR; };
    const away = [...(Z.mills || []).map((m) => [m.x, m.z, 7]), ...(Z.depot ? [[Z.depot.x, Z.depot.z, 13]] : []), ...(Z.workshopDoor ? [[Z.workshopDoor.x, Z.workshopDoor.z, 5]] : []), ...(Z.councilDoor ? [[Z.councilDoor.x, Z.councilDoor.z, 5]] : []), ...(g.story.arsenal?.step ? [[g.story.arsenal.step.x, g.story.arsenal.step.z, 7]] : [])];
    const tryDir = (a) => {
      const dx = Math.sin(a), dz = Math.cos(a);
      let re = null;
      for (let r = 3; r < 75; r += 0.5) if (sea(s1.x + dx * r, s1.z + dz * r)) { re = r; break; }
      if (re == null) return null;
      const at = (r, lat = 0) => ({ x: s1.x + dx * r + dz * lat, z: s1.z + dz * r - dx * lat });
      const S = at(re - 2.6), lx = S.x - o.x, lz = S.z - o.z;
      if (lx < -46 || lx > 33 || Math.abs(lz) < 6) return null;   // (the pier, the platform's neck, the street)
      if (away.some(([x, z, r]) => Math.hypot(S.x - x, S.z - z) < r)) return null;
      const sy = this.level(S.x, S.z, y0, 0.8, 0.25);
      if (sy == null || Math.abs(sy - y0) > 0.35) return null;
      for (const lat of [-0.85, 0.85]) { const p = at(re - 1.2, lat); if (P.blockedAt(p.x, p.z, sy, 0.15)) return null; }
      // (an open bit of shore: no tree, rock or wall within a couple of metres of where he stands and of the arch)
      { const a2 = at(re - 1.2); if (P.blockedAt(S.x, S.z, sy, 2.2) || P.blockedAt(a2.x, a2.z, sy, 1.8)) return null; }
      // (out over the clouds: nothing to stand on and nothing standing up, along the line and, past the rim's curve, either side)
      for (let r = re; r < re + 14; r += 0.5) for (const lat of r < re + 2 ? [0] : [-2.5, 0, 2.5]) { const p = at(r, lat); if (!sea(p.x, p.z) || P.blockedAt(p.x, p.z, sy, 0.3)) return null; }
      if (!this.walkable(s1, S, sy)) return null;
      return { a, dx, dz, re, S: { ...S, y: sy }, at, d: Math.hypot(S.x - s1.x, S.z - s1.z) };
    };
    let best = null;
    for (let i = 0; i < 48; i++) { const c = tryDir((i / 48) * Math.PI * 2); if (c && (!best || c.d < best.d)) best = c; }
    if (!best) { this.canalMissing = true; return; }
    const { dx, dz, re, at } = best, y = best.S.y, face = Math.atan2(dx, dz);
    const L = { ...at(re + 4.6), y }, K = { ...at(re + 12.4, 1.2), y: y - 0.35 };
    const shoreArch = at(re - 1.2), landArch = at(re + 3.5);
    const root = new THREE.Group(); root.name = 'cloudCanal';
    const gp = Z.group.position; root.position.set(-gp.x, -gp.y, -gp.z); Z.group.add(root);
    const k = new Kit(root), white = MAT.flat('#f2ece6', 0.8), lilac = MAT.flat('#9a7ab8', 0.55), brass = MAT.brass();
    const rockM = MAT.flat('#d8c0d8', 0.92, { vertexColors: true });
    // an Esmer mooring arch: two slim lilac posts, a white lintel, a brass cord ring hanging over the middle (high
    // enough that he passes under it on the way across)
    const rings = [];
    const arch = (p) => {
      for (const s of [-0.85, 0.85]) {
        const x = p.x + dz * s, z = p.z - dx * s;
        k.add(cyl(0.07, 0.09, 2.8, 8), lilac, x, y + 1.4, z);
        k.add(sphere(0.1, 10, 8), brass, x, y + 2.88, z);
        P.add({ type: 'cyl', x, z, r: 0.1, top: y + 2.9, noStand: true, seeThrough: true });
      }
      k.add(rbox(2.0, 0.16, 0.2, 0.04), white, p.x, y + 2.75, p.z, face);
      k.add(cyl(0.012, 0.012, 0.2, 5), brass, p.x, y + 2.58, p.z);
      k.add(torus(0.17, 0.028, 6, 18), brass, p.x, y + 2.32, p.z, face);
      rings.push({ x: p.x, y: y + 2.32, z: p.z });
    };
    arch(shoreArch); arch(landArch);
    // the mooring rock: a flat-topped floating stone with a paved deck and a bollard; the crate's rock further out
    k.add(rockGeometry(23), rockM, L.x, y - 0.75, L.z, face, { sx: 1.9, sy: 1.5, sz: 1.9 });
    k.add(cyl(1.55, 1.6, 0.18, 18), MAT.stone('grey', 1), L.x, y - 0.09, L.z);
    k.add(cyl(0.12, 0.15, 0.6, 8), MAT.wood('dark'), L.x + dz * 1.05, y + 0.3, L.z - dx * 1.05);
    k.add(rockGeometry(29), rockM, K.x, K.y - 0.6, K.z, face + 1, { sx: 1.1, sy: 1.0, sz: 1.1 });
    // the sign at the shore
    const tex = canvasTex(256, 128, (x, W, H) => { x.fillStyle = '#f2ece6'; x.fillRect(0, 0, W, H); x.strokeStyle = '#9a7ab8'; x.lineWidth = 8; x.strokeRect(4, 4, W - 8, H - 8); x.fillStyle = '#3a2a4a'; x.textAlign = 'center'; x.font = 'bold 36px sans-serif'; x.fillText('CLOUD CANAL', W / 2, 56); x.font = 'bold 22px sans-serif'; x.fillText('RINGS STILL HOLD', W / 2, 96); });
    const sg = at(re - 2.2, 1.9);
    k.add(cyl(0.035, 0.035, 1.3, 6), MAT.wood('dark'), sg.x, y + 0.65, sg.z);
    k.add(rbox(0.72, 0.36, 0.03, 0.01), MAT.map(tex, 0.9), sg.x, y + 1.2, sg.z, face + Math.PI);
    k.flush();
    P.add({ type: 'cyl', x: sg.x, z: sg.z, r: 0.08, top: y + 1.4, noStand: true, seeThrough: true });
    P.add({ type: 'cyl', x: L.x, z: L.z, r: 1.55, top: y });   // (the deck: firm ground, the cloud all round it)
    P.add({ type: 'cyl', x: L.x + dz * 1.05, z: L.z - dx * 1.05, r: 0.15, top: y + 0.6, noStand: true });
    const crateG = new THREE.Group(); crateG.position.set(K.x - gp.x, K.y - gp.y, K.z - gp.z); crateG.rotation.y = face + 0.4; Z.group.add(crateG);
    const ck = new Kit(crateG); crate(ck, 0.55, { pal: 'dark' }); ck.flush();
    const C = this.canal = { root, crateG, L, K, S: best.S, dx, dz, y, sign: sg, home: { x: crateG.position.x, y: crateG.position.y, z: crateG.position.z } };
    // the ring over the landing: reel from the shore to the mooring rock; the ring at the shore: back again (each route
    // stays low under the arches' rings and high over the gap)
    C.toLanding = { kind: 'ring', id: 'canalL', ...rings[1],
      route: () => [{ ...at(re - 0.4), y: y + 0.5 }, { ...at(re + 1.6), y: y + 1.0 }, { x: L.x - dx * 0.4, y, z: L.z - dz * 0.4 }],
      arrived: () => this.arrived('canal') };
    C.toShore = { kind: 'ring', id: 'canalS', ...rings[0],
      route: () => [{ ...at(re + 2.9), y: y + 0.6 }, { ...at(re + 1.0), y: y + 1.0 }, { ...at(re - 0.6), y: y + 0.45 }, { ...best.S }] };
    C.crateT = { kind: 'thing', id: 'crate', x: K.x, y: K.y + 0.35, z: K.z, pull: (hand) => this.pullCrate(hand) };
  }
  onLanding() { const C = this.canal, h = this.game.hero; return !!C && this.roomId() === 'zeelich' && Math.hypot(h.pos.x - C.L.x, h.pos.z - C.L.z) < 1.75 && Math.abs(h.pos.y - C.y) < 0.8; }
  // ---- Zeelich's old mill: a ring on a davit off the gallery, on the side the stair-stones don't climb
  buildMillRing(Z) {
    const g = this.game, P = g.physics, mt = Z.millTop, cx = mt.x, cz = mt.z - 3.3, ty = mt.y;
    const phi = 4.9, dir = (a, r) => ({ x: cx + Math.sin(a) * r, z: cz + Math.cos(a) * r });
    // (the davit is bolted to the gallery's outside, past its railing: the walkway stays clear)
    const pole = dir(phi + 0.22, 4.32), ring = dir(phi, 4.9);
    const root = new THREE.Group(), gp = Z.group.position; root.position.set(-gp.x, -gp.y, -gp.z); Z.group.add(root);
    const k = new Kit(root), wood = MAT.wood('dark'), brass = MAT.brass();
    k.add(cyl(0.06, 0.07, 3.9, 8), wood, pole.x, ty + 1.65, pole.z);
    const al = Math.hypot(ring.x - pole.x, ring.z - pole.z), aa = Math.atan2(ring.x - pole.x, ring.z - pole.z);
    k.add(cyl(0.045, 0.045, al, 6), wood, (pole.x + ring.x) / 2, ty + 3.55, (pole.z + ring.z) / 2, aa, { rx: Math.PI / 2 });
    k.add(cyl(0.012, 0.012, 0.12, 5), brass, ring.x, ty + 3.5, ring.z);
    k.add(torus(0.17, 0.028, 6, 18), brass, ring.x, ty + 3.3, ring.z, phi);   // (above his head as he passes under it)
    k.flush();
    P.add({ type: 'cyl', x: pole.x, z: pole.z, r: 0.08, top: ty + 3.6, bottom: ty - 0.3, noStand: true, seeThrough: true });
    const via = dir(phi, 5.6), over = dir(phi, 3.75), land = dir(phi, 3.4);
    this.mill = { ty, ringT: { kind: 'ring', id: 'mill', x: ring.x, y: ty + 3.3, z: ring.z,
      route: () => [{ ...via, y: ty + 1.3 }, { ...over, y: ty + 1.3 }, { ...land, y: ty }],
      arrived: () => this.arrived('mill') } };
  }
  // ---- the Hamalayi: the steam crack in Lhar, the monks' brazier and the frozen chest by the monastery yard
  buildHamalayi(M) {
    const g = this.game, P = g.physics, S = M.npcSpots || {};
    const busy = [M.lhar, S.v1, S.v2, S.v3, S.yorna, S.pim, S.keeper, S.hesk, M.monastery?.yard, M.monastery?.gate].filter(Boolean);
    // round c, on its level, free, away from the people's places, and walkable from `from` (a spot people stand on)
    const find = (c, from, rings, r, minD, test = () => true) => {
      const y = P.groundAt(from.x, from.z, 80);
      for (const d of rings) for (let i = 0; i < 16; i++) {
        const a = i * Math.PI / 8 + d * 0.37, x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d;
        const gy = this.level(x, z, P.groundAt(x, z, 80), r, 0.3);
        if (gy == null || Math.abs(gy - y) > 1.0) continue;
        if (busy.some((b) => Math.hypot(b.x - x, b.z - z) < minD)) continue;
        if (!this.walkable(from, { x, z }, y) || !test(x, z, gy)) continue;
        return { x, z, y: gy };
      }
      return null;
    };
    const root = new THREE.Group(), gp = M.group.position; root.position.set(-gp.x, -gp.y, -gp.z); M.group.add(root);
    const k = new Kit(root), rockM = MAT.flat('#9a9aa8', 0.92, { vertexColors: true });
    // the steam crack: a split slab of dark wet rock near the square, its breath rising
    const cr = find(M.lhar, S.yorna || M.lhar, [9, 11, 13, 7, 15], 1.2, 3.2);
    if (cr) {
      k.add(rockGeometry(41), rockM, cr.x, cr.y - 0.1, cr.z, 0.6, { sx: 1.2, sy: 0.55, sz: 0.9 });
      k.add(rbox(0.9, 0.3, 0.12, 0.04), MAT.flat('#141414', 1), cr.x, cr.y + 0.32, cr.z, 0.6);
      P.add({ type: 'cyl', x: cr.x, z: cr.z, r: 0.95, top: cr.y + 0.45, noStand: true });
      this.crack = { room: 'hamalayi', ...cr, wispT: 0 };
    }
    // the monastery yard: the monks' brazier, and an old chest frozen into the ice by the wall a few steps off
    const yard = M.monastery?.yard;
    const ch = yard && find(yard, yard, [7, 8.5, 6, 10], 1.0, 2.6);
    const br = ch && find(ch, yard, [2.6, 3.2, 2.2], 0.6, 2.0, (x, z) => Math.hypot(x - ch.x, z - ch.z) > 1.8);
    if (ch && br) {
      const iron = MAT.iron();
      for (let i = 0; i < 3; i++) { const a = i * 2.094; k.add(cyl(0.025, 0.03, 0.7, 5), iron, br.x + Math.sin(a) * 0.22, br.y + 0.33, br.z + Math.cos(a) * 0.22, 0, { rx: Math.cos(a) * 0.18, rz: -Math.sin(a) * 0.18 }); }
      k.add(cyl(0.36, 0.2, 0.22, 12), iron, br.x, br.y + 0.75, br.z);
      for (let i = 0; i < 6; i++) { const a = i * 1.05; k.add(sphere(0.08, 7, 5), MAT.glow('#ffa050', '#ff5a10', 1.8), br.x + Math.sin(a) * 0.16, br.y + 0.86, br.z + Math.cos(a) * 0.16); }
      P.add({ type: 'cyl', x: br.x, z: br.z, r: 0.4, top: br.y + 0.9, noStand: true });
      this.brazier = { room: 'hamalayi', ...br, emberT: 0 };
      const face = Math.atan2(yard.x - ch.x, yard.z - ch.z);
      const grp = this.holder(M, ch.x, ch.y, ch.z, face), ck = new Kit(grp);
      ck.add(rbox(0.9, 0.5, 0.56, 0.04), MAT.wood('dark'), 0, 0.25, 0);
      for (const sx of [-0.3, 0.3]) ck.add(rbox(0.06, 0.52, 0.58, 0.01), iron, sx, 0.26, 0);
      ck.flush();
      const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.28); grp.add(lid);
      const lm = new THREE.Mesh(rbox(0.92, 0.1, 0.58, 0.03), MAT.wood('dark')); lm.position.set(0, 0.05, 0.28); lid.add(lm);
      const ice = new THREE.Mesh(new THREE.IcosahedronGeometry(0.72, 1).scale(1.05, 0.85, 0.85), MAT.glass('#dff4ff', 0.6)); ice.position.y = 0.4; grp.add(ice);
      P.add({ type: 'cyl', x: ch.x, z: ch.z, r: 0.62, top: ch.y + 1.0, noStand: true });
      this.chest = { room: 'hamalayi', grp, lid, ice, ...ch, meltT: 0 };
    }
    k.flush();
  }

  // ---------------------------------------------------------------- state → world
  regionBuilt() { this.applyFlags(); }
  applyFlags() {
    const f = this.f, N = this.niche, W = this.wheel, C = this.canal, H = this.chest;
    if (N) {
      N.crust.visible = !f.e2b_crust;
      N.sleeper.material.emissiveIntensity = f.e2b_lamp ? 1.8 : 0;
      N.sleeper.material.color.set(f.e2b_lamp ? '#bff8ff' : '#6a7a88');
      N.tin.visible = !f.e2b_dtin && (!!f.e2b_lamp || this.litNiche());
    }
    if (W && !(W.turnT > 0)) { W.slab.position.y = f.e2b_wheel ? -1.45 : 0; W.cache.visible = !!f.e2b_wheel && !f.e2b_galCache; }
    if (C) { C.crateG.visible = !f.e2b_crate; }
    if (H && !(H.meltT > 0)) { H.ice.visible = !f.e2b_chestFree; H.lid.rotation.x = f.e2b_chest ? -1.2 : 0; }
  }
  // the lantern lit near the niche shows the tin too (the other light in the dark)
  litNiche() { const N = this.niche, h = this.game.hero; return !!N && this.roomId() === 'desert' && !!this.game.gadgets?.lanternLit?.() && Math.hypot(h.pos.x - N.x, h.pos.z - N.z) < 4; }
  journal() {
    const f = this.f, A = this.A;
    return [
      { key: 'e2b_j_niche', done: !!f.e2b_dtin, show: !!A.fork && !!this.niche && (this.at('dig')) },
      { key: 'e2b_j_wheel', done: !!f.e2b_galCache, show: !!f.e2b_wheelSeen },
      { key: 'e2b_j_crate', done: !!f.e2b_crate, show: !!A.line },
      { key: 'e2b_j_winch', done: !!f.c6_thawed, show: !!A.heatflask && this.story.cur?.key === 'pass' && !f.c6_heat },
      { key: 'e2b_j_chest', done: !!f.e2b_chest, show: !!f.e2b_chestSeen },
    ].filter((l) => l.show).map(({ key, done }) => ({ key, done }));
  }

  // ---------------------------------------------------------------- the tools meeting the world (tools.js)
  // the singing fork struck where Twinsen stands: o { x, y, z, fx, fz, reach }. True when something here rang.
  forkHit(o) {
    const g = this.game, f = this.f, here = this.roomId();
    const near = (p) => !!p && here === p.room && Math.hypot(p.x - o.x, p.z - o.z) < o.reach + 0.7 && Math.abs(p.y - o.y) < 2.5;
    const N = this.niche;
    if (near(N)) {
      const fx = N.x + Math.sin(N.face) * 0.6, fz = N.z + Math.cos(N.face) * 0.6;
      if (!f.e2b_crust) {
        f.e2b_crust = true; this.applyFlags();
        g.audio.play('shard'); g.particles.burst(fx, N.y + 0.7, fz, '#bff8ff', 26, 2.6);
        this.chain([['hero', 'e2b_crust_crack']], () => g.save(false));
        return true;
      }
      if (!f.e2b_lamp) {
        f.e2b_lamp = true; this.applyFlags();
        g.particles.burst(fx, N.y + 0.6, fz, '#e8fcff', 14, 1.0);
        this.chain([['hero', 'e2b_lamp']], () => g.save(false));
        return true;
      }
    }
    const W = this.wheel;
    if (near(W) && !f.e2b_wheel) {
      f.e2b_wheel = true; f.e2b_wheelSeen = true; W.turnT = 1.6;
      g.audio.play('rumble');
      this.chain([['hero', 'e2b_wheel_turn']], () => g.save(false));
      return true;
    }
    return false;
  }
  // the heat flask let out: o { x, y, z, fx, fz, r }. True when something here took the heat.
  heatHit(o) {
    const g = this.game, f = this.f;
    if (this.roomId() !== 'hamalayi') return false;
    const M = g.regions?.built('hamalayi');
    if (!M) return false;
    const cx = o.x + o.fx * 1.2, cz = o.z + o.fz * 1.2, hit = (x, z, r) => Math.hypot(x - cx, z - cz) < r;
    const W = M.lift?.winch, pass = this.story.cur;
    // the frozen winch (its ice sits a metre in from the winch's handle): the chapter's own thaw follows
    if (W && M.lift.frozen && !f.c6_thawed && pass?.key === 'pass' && !(pass.thawT > 0) && hit(W.x, W.z - 1.0, 2.6)) {
      pass.thawT = 1.0; f.e2b_flaskWinch = true;
      g.particles.burst(W.x, g.hero.pos.y + 1.0, W.z - 1.0, '#f4f4f4', 22, 1.2);
      g.gadgets.tools.sound('steam'); g.hud.toast('e2b_toast_thaw');
      return true;
    }
    const H = this.chest;
    if (H && !f.e2b_chestFree && hit(H.x, H.z, 2.2) && Math.abs(H.y - o.y) < 2) {
      f.e2b_chestFree = true; f.e2b_chestSeen = true; H.meltT = 1.6;
      g.particles.burst(H.x, H.y + 0.6, H.z, '#f4f4f4', 22, 1.1);
      g.gadgets.tools.sound('steam');
      this.chain([['hero', 'e2b_chest_free']], () => g.save(false));
      return true;
    }
    return false;
  }
  // what the line can catch here: cord rings (with the route they reel along) and loose things
  lineTargets() {
    if (!this.A.line || !this.canUse()) return [];
    const out = [], C = this.canal;
    if (this.roomId() === 'zeelich') {
      if (C) { if (this.onLanding()) out.push(C.toShore); else out.push(C.toLanding); if (!this.f.e2b_crate) out.push(C.crateT); }
      if (this.mill && this.game.hero.pos.y < this.mill.ty - 1) out.push(this.mill.ringT);   // (from below the gallery)
    }
    return out;
  }
  arrived(where) {
    const g = this.game, f = this.f;
    if (where === 'canal' && !f.e2b_canal) { f.e2b_canal = true; this.chain([['hero', 'e2b_canal_first']], () => g.save(false)); }
    if (where === 'mill' && !f.e2b_millUp) { f.e2b_millUp = true; this.chain([['hero', 'e2b_mill_up']]); }
  }
  // the crate hauled off its rock: it flies along the cord to his feet and cracks open (once)
  pullCrate() {
    const C = this.canal, f = this.f;
    if (!C || f.e2b_crate) return false;
    f.e2b_crate = true;
    const h = this.game.hero, gp = this.game.rooms.zeelich.group.position;
    const to = { x: h.pos.x + Math.sin(h.angle) * 0.9 - gp.x, y: h.pos.y - gp.y, z: h.pos.z + Math.cos(h.angle) * 0.9 - gp.z };
    C.fly = { t: 0, T: 0.55, from: { ...C.home }, to };
    return true;
  }
  crateOpened() {
    const g = this.game, h = g.hero, C = this.canal, p = C.crateG.getWorldPosition(new THREE.Vector3());
    C.crateG.visible = false;
    g.audio.play('break'); g.particles.burst(p.x, p.y + 0.3, p.z, '#8a6430', 22, 3.2);
    const n = this.luck(12);
    this.chain([['hero', 'e2b_crate']], () => { if (n === 12) g.hud.toast('toast_clover_found'); g.hud.toast('a_toast_kashes', { n }); g.hud.stats?.(h); g.save(false); });
  }
  // a clover and some kashes (with nine clovers already: 10 kashes more instead of the clover); the kashes given
  luck(kashes) {
    const h = this.game.hero;
    if (h.clovers >= 9) { h.coins += kashes + 10; return kashes + 10; }
    h.clovers += 1; h.coins += kashes;
    return kashes;
  }
  // heat to draw within reach (null: none): { x, y, z, what }
  heatNear() {
    const g = this.game, h = g.hero, M = g.regions?.built('hamalayi');
    if (this.roomId() !== 'hamalayi' || !M) return null;
    const near = (p, r = DRAW_R) => p && Math.hypot(p.x - h.pos.x, p.z - h.pos.z) < r && Math.abs((p.y ?? h.pos.y) - h.pos.y) < 1.6;
    if (near(this.crack, DRAW_R + 0.6)) return { ...this.crack, what: 'crack' };
    if (near(this.brazier, DRAW_R)) return { ...this.brazier, what: 'brazier' };
    if (M.heatPost?.on && near(M.heatPost, DRAW_R + 0.4)) return { x: M.heatPost.x, z: M.heatPost.z, what: 'post' };
    if (M.vent?.open && near(M.vent, 4.5)) return { x: M.vent.x, z: M.vent.z, what: 'vent' };
    return null;
  }

  // ---------------------------------------------------------------- interaction
  interactables(consider, dist) {
    const g = this.game, f = this.f, A = this.A, here = this.roomId(), h = g.hero;
    if (!this.canUse()) return;
    const N = this.niche;
    if (here === 'desert' && N && !f.e2b_dtin && Math.abs(h.pos.y - N.y) < 1.2) consider(dist(N.x, N.z), 1.9, { kind: 'e2b_niche', label: f.e2b_crust && (f.e2b_lamp || this.litNiche()) ? 'p_take' : 'p_look' });
    const W = this.wheel;
    if (here === 'c3gallery' && W && !f.e2b_galCache && !(W.turnT > 0)) consider(dist(W.x, W.z), 1.6, { kind: 'e2b_wheel', label: f.e2b_wheel ? 'p_take' : 'p_look' });
    const C = this.canal;
    if (here === 'zeelich' && C && Math.abs(h.pos.y - C.y) < 1) consider(dist(C.sign.x, C.sign.z), 1.3, { kind: 'e2b_sign', label: 'p_read' });
    if (here === 'hamalayi') {
      const w = A.heatflask ? this.heatNear() : null;
      if (w && A.heat < FLASK.keep - 1) consider(Math.max(0.05, dist(w.x, w.z) - 0.9), 1.6, { kind: 'e2b_draw', heat: w, label: 'p_draw' });
      else if (this.crack && !A.heatflask) consider(dist(this.crack.x, this.crack.z), 1.9, { kind: 'e2b_crack', label: 'p_look' });
      if (this.brazier && !A.heatflask) consider(dist(this.brazier.x, this.brazier.z), 1.3, { kind: 'e2b_brazier', label: 'p_look' });
      const H = this.chest;
      if (H && !f.e2b_chest && !(H.meltT > 0) && Math.abs(h.pos.y - H.y) < 1.2) consider(dist(H.x, H.z), 1.5, { kind: 'e2b_chest', label: f.e2b_chestFree ? 'p_take' : 'p_look' });
    }
  }
  interact(it) {
    const g = this.game, f = this.f, h = g.hero;
    const hero = (keys, done) => { this.chain(keys.map((k) => ['hero', k]), done); return true; };
    switch (it.kind) {
      case 'e2b_niche': {
        const N = this.niche;
        if (!f.e2b_crust) return hero([this.A.fork ? 'e2b_crust_look2' : 'e2b_crust_look']);
        if (!f.e2b_lamp && !this.litNiche()) return hero(['e2b_niche_dark']);
        h.actAt(N.x, N.z, 'use', 0.7, () => {
          if (f.e2b_dtin) return;
          f.e2b_dtin = true; this.applyFlags();
          g.audio.play('chest');
          const full = h.clovers >= 9;
          if (full) h.coins += 10; else h.clovers = Math.min(9, h.clovers + 1);
          hero([full ? 'e2b_dtin_kashes' : 'e2b_dtin_clover'], () => { if (full) g.hud.toast('a_toast_kashes', { n: 10 }); else g.hud.toast('toast_clover_found'); g.hud.stats?.(h); g.save(false); });
        }, 0.3);
        return true;
      }
      case 'e2b_wheel': {
        const W = this.wheel;
        f.e2b_wheelSeen = true;
        if (!f.e2b_wheel) return hero(['e2b_wheel_look']);
        h.actAt(W.x, W.z, 'use', 0.7, () => {
          if (f.e2b_galCache) return;
          f.e2b_galCache = true; this.applyFlags();
          g.audio.play('chest'); h.coins += 20;
          hero(['e2b_gal_cache'], () => { g.hud.toast('a_toast_kashes', { n: 20 }); g.hud.stats?.(h); g.save(false); });
        }, 0.3);
        return true;
      }
      case 'e2b_sign': return hero(['e2b_canal_sign']);
      case 'e2b_crack': return hero(['e2b_crack_look']);
      case 'e2b_brazier': return hero(['e2b_brazier_look']);
      case 'e2b_draw': {
        const w = it.heat;
        h.actAt(w.x, w.z, 'use', 0.6, () => {
          if (!g.gadgets.tools.warm()) return;
          g.particles.burst(w.x, (w.y ?? h.pos.y) + 0.6, w.z, '#ffb070', 10, 1.0);
          g.hud.toast('e2b_toast_drawn', { n: FLASK.keep });
          g.hud.weapon?.(h);
        }, 0.25);
        return true;
      }
      case 'e2b_chest': {
        const H = this.chest;
        f.e2b_chestSeen = true;
        if (!f.e2b_chestFree) return hero(this.A.heatflask ? ['e2b_chest_look', 'e2b_chest_look2'] : ['e2b_chest_look']);
        h.actAt(H.x, H.z, 'use', 0.8, () => {
          if (f.e2b_chest) return;
          f.e2b_chest = true; this.applyFlags();
          g.audio.play('chest'); const n = this.luck(10);
          hero(['e2b_chest_open'], () => { if (n === 10) g.hud.toast('toast_clover_found'); g.hud.toast('a_toast_kashes', { n }); g.hud.stats?.(h); g.save(false); });
        }, 0.3);
        return true;
      }
    }
    return false;
  }

  // ---------------------------------------------------------------- the givers
  // something new for good: owned, the found-object box, then how to use it
  gain(key, nameKey, toastKey, then = null) {
    const g = this.game, A = this.A;
    if (A[key]) return false;
    A[key] = true;
    g.found(key, nameKey, () => { g.hud.toast(toastKey, { w: g.hud.key('weapons'), k: g.hud.key('attack') }); then?.(); });
    g.hud.stats?.(g.hero);
    g.save(false);
    return true;
  }
  gainLine() { return this.gain('line', 'it_line', 'e2b_toast_linehow'); }   // (arsenal.js: Nara's case)
  talkFirst(npc) {
    const g = this.game, f = this.f, A = this.A, id = npc.def.id;
    if (!this.canUse()) return false;
    const c = (lines, done) => { this.chain(lines, done); return true; };
    // Ilka, her notebook back: her fork; then what the chapter has her say
    if (id === 'ilka' && f.c4_notebook && !A.fork && this.at('dig')) {
      return c([['ilka', 'e2b_ilka_f1'], ['ilka', 'e2b_ilka_f2'], ['ilka', 'e2b_ilka_f3'], ['hero', 'e2b_tw_f1'], ['ilka', 'e2b_ilka_f4'], ['ilka', 'e2b_ilka_f5']],
        () => this.gain('fork', 'it_fork', 'e2b_toast_forkhow', () => { if (g.state === 'play' && npc.present) this.story.talk(npc); }));
    }
    // Tashi, Lhar's smith, once Yorna has told of the frozen winch: the heat flask
    if (id === 'lhar1' && f.c6_yorna && !A.heatflask && this.at('pass')) {
      return c([['lhar1', 'e2b_tashi_1'], ['lhar1', 'e2b_tashi_2'], ['lhar1', 'e2b_tashi_3'], ['hero', 'e2b_tw_tashi'], ['lhar1', 'e2b_tashi_4']],
        () => this.gain('heatflask', 'it_heatflask', 'e2b_toast_flaskhow'));
    }
    // Nara after her stamp (chapter 9 on), the line never bought: her gift
    if (id === 'nara' && f.c9_nara && !A.line && this.at('council')) {
      return c([['nara', 'e2b_nara_g1'], ['nara', 'e2b_nara_g2']], () => { f.e2b_tip = true; this.gainLine(); });
    }
    return false;
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    const g = this.game, f = this.f, h = g.hero, here = this.roomId(), P = g.particles;
    const N = this.niche;
    if (N && here === 'desert' && f.e2b_crust && !f.e2b_dtin) N.tin.visible = !!f.e2b_lamp || this.litNiche();
    // the galleries' wheel: it spins, then the slab sinks into the floor
    const W = this.wheel;
    if (W && W.turnT > 0) {
      W.turnT = Math.max(0, W.turnT - dt);
      W.rosette.rotation.z -= dt * 5;
      W.slab.position.y = -1.45 * Math.min(1, Math.max(0, (1.2 - W.turnT) / 1.0));
      if (W.turnT === 0) this.applyFlags();
    }
    // the crate along the cord to his feet, then open
    const C = this.canal;
    if (C?.fly) {
      const F = C.fly; F.t += dt;
      const k = Math.min(1, F.t / F.T), s = k * k * (3 - 2 * k);
      C.crateG.position.set(F.from.x + (F.to.x - F.from.x) * s, F.from.y + (F.to.y - F.from.y) * s + Math.sin(Math.PI * k) * 1.2, F.from.z + (F.to.z - F.from.z) * s);
      C.crateG.rotation.y += dt * 4;
      if (k >= 1) { C.fly = null; this.crateOpened(); }
    }
    // (an odd save on the mooring rock without the line, or as someone else: back on the shore)
    if (C && g.state === 'play' && !g.trans && !g.gadgets?.tools?.zip && h.onGround && this.onLanding() && !(this.A.line && this.canUse())) {
      h.pos.set(C.S.x, C.S.y, C.S.z); h.vel.set(0, 0); h.sync?.(); g.lastSafe = { x: C.S.x, z: C.S.z };
    }
    // the chest's ice slumps and runs off
    const H = this.chest;
    if (H && H.meltT > 0) {
      H.meltT = Math.max(0, H.meltT - dt);
      const k = H.meltT / 1.6; H.ice.scale.set(k, k * 0.8, k); H.ice.position.y = 0.4 * k;
      if (Math.random() < dt * 10) P.burst(H.x, H.y + 0.3, H.z, '#e8f4ff', 1, 0.6);
      if (H.meltT === 0) { H.ice.scale.set(1, 1, 1); H.ice.position.y = 0.4; this.applyFlags(); }
    }
    // the steam crack breathes and the brazier gives off an ember now and then (only near: the soft pool, no light)
    if (here === 'hamalayi' && g.state === 'play') {
      const cr = this.crack;
      if (cr && Math.hypot(cr.x - h.pos.x, cr.z - h.pos.z) < 30 && (cr.wispT -= dt) <= 0) { cr.wispT = 0.35; P.spawn({ x: cr.x + (Math.random() - 0.5) * 0.5, y: cr.y + 0.45, z: cr.z + (Math.random() - 0.5) * 0.3, vx: (Math.random() - 0.5) * 0.3, vy: 1.1, vz: (Math.random() - 0.5) * 0.3, color: '#eef6ff', a: 0.32, s0: 0.3, s1: 1.2, life: 1.8, drag: 0.4, add: 0.1, cell: 0, fi: 0.2, fo: 0.6 }); }
      const br = this.brazier;
      if (br && Math.hypot(br.x - h.pos.x, br.z - h.pos.z) < 20 && (br.emberT -= dt) <= 0) { br.emberT = 0.6; P.burst(br.x, br.y + 0.95, br.z, '#ffa050', 1, 1.6); }
    }
  }
}
