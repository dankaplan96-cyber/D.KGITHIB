// The journey films (TRAVEL-1, the user 2.11.2026: "every passage from planet to planet is only by spaceship; it needs
// an animation of the ship flying, seen from outside, and the ship from inside with the people who are there; every
// kind of vehicle must work"). Every travel (src/game/travel.js travelTo) shows its craft:
//   ship (Citadel Spaceport ⇄ Zeelich Spaceport): the ship rises off the pad and climbs away (2.8 s), the cabin with
//     Twinsen at a window and the other passengers (4 s, src/game/shipcabin.js), the planet falling away and the other
//     one ahead (2.4 s); then the scene change; then the ship comes down onto the other pad (3 s) and he steps off.
//   ferry, glider, Esmer shuttle: the craft leaving (2.6 s), the scene change, the craft arriving (2.4 s), he steps off.
// The films are the engine's cinematic timeline (src/engine/cinematic.js: shots, events, tracks, the hold-to-skip,
// pause), played around the existing scene change (Game.startTransition): the departure film ends in black, the
// transition swaps the area under that black exactly as before (the region built behind its loading card, the
// landing spot, the save, the story's refresh), and its `then` starts the arrival film on the new area's first
// frame instead of the fade-in. A skip (hold the skip key) ends the whole journey's film: what follows is the plain
// transition. Gameplay is unchanged: the same routes, gates, costs, landing spots and saves.
// Scenery for the films is built when a film starts and freed when it ends: the craft flying is a twin of the parked
// one (its geometry and materials shared; the parked one is hidden meanwhile), the cabin and the space backdrop are
// built for the ship's film only.
//   FILMS.on: false with ?nocine (developers, tests); the tests set it to film the journeys anyway.
//   FILMS.log: [{ n, part: 'depart' | 'arrive', mode, from, to, length, t, skipped, … }] the last 60 films played
//   (tests; n counts every film since the page loaded: FILMS.n)
//   playJourney(game, { from, to, mode }, start)  start(then) begins the scene change (Game.startTransition with then)
import * as THREE from 'three';
import { Cinematic } from '../engine/cinematic.js';
import { mergeStatic } from '../engine/merge.js';
import { esmerShuttle } from './shuttle.js';
import { buildShipCabin } from './shipcabin.js';
import { createCharacter } from './characters.js';

export const FILMS = {
  on: !(typeof location !== 'undefined' && new URLSearchParams(location.search).has('nocine')),
  log: [],
};
const $ = (s) => document.querySelector(s);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const outCubic = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const planetOf = (region) => (region === 'zeelich' || region.startsWith('isle_') ? 'zeelich' : 'twinsun');

// how long each part runs (seconds)
export const LEN = {
  ship: { depart: 2.8, cabin: 4.0, space: 2.4, arrive: 3.0 },
  shuttle: { depart: 2.6, arrive: 2.4 }, ferry: { depart: 2.6, arrive: 2.6 }, glider: { depart: 2.6, arrive: 2.6 },
  step: 0.9, blend: 0.9,
};

// ---------------------------------------------------------------- the parked craft and its flying twin
// the craft standing at a travel point (null: none found — the film then flies a fresh one from the point)
function vehicleOf(g, p) {
  const T = g.travel, R = p.region === 'citadel' ? null : g.regions?.built?.(p.region);
  if (T?.vehicles?.[p.id]) return T.vehicles[p.id];
  if (p.id === 'citadel_port') return g.world.spaceport?.ship || null;
  if (p.id === 'citadel_ferry') return g.world.ferry?.group || null;
  if (p.id === 'desert_ferry') return R?.ferry?.group || null;
  if (p.id === 'hamalayi_glider') return R?.gliderObj || null;
  if ((p.mode === 'ship' || p.mode === 'shuttle') && R?.group) {
    let best = null, bd = 9;
    R.group.traverse((o) => { if (o.name !== 'esmerShuttle') return; const w = o.getWorldPosition(V()); const d = Math.hypot(w.x - p.x, w.z - p.z); if (d < bd) { bd = d; best = o; } });
    return best;
  }
  return null;
}
// a copy drawn on its own: the same geometry and materials, in world space, casting its shadow, on the main layer
// (the parked craft's pieces may sit in the area's draw and shadow batches: their own flags say so, not copied)
function twin(o) {
  let c;
  if (o.isInstancedMesh) { c = new THREE.InstancedMesh(o.geometry, o.material, o.count); c.instanceMatrix.copy(o.instanceMatrix); c.userData.ownInst = true; }
  else if (o.isMesh) c = new THREE.Mesh(o.geometry, o.material);
  else c = new THREE.Group();
  if (o.isMesh) { const m = o.material; c.castShadow = !(m?.transparent || m?.userData?.noShadow); c.receiveShadow = o.receiveShadow; c.renderOrder = o.renderOrder; c.frustumCulled = o.frustumCulled; }
  c.position.copy(o.position); c.quaternion.copy(o.quaternion); c.scale.copy(o.scale); c.visible = o.visible;
  for (const ch of o.children) if (ch.isMesh || ch.isGroup || ch.type === 'Object3D') c.add(twin(ch));
  return c;
}
let GLOW = null;   // (one engine glow for every film: kept for the session)
function glowDisc(r) {
  GLOW ??= { geo: new THREE.CircleGeometry(1, 20).rotateX(Math.PI / 2), mat: new THREE.MeshBasicMaterial({ color: '#9fd8ff', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }) };
  const m = new THREE.Mesh(GLOW.geo, GLOW.mat.clone()); m.scale.setScalar(r); m.position.y = 0.3; m.renderOrder = 3; m.material.opacity = 0;
  return m;
}
function freeTwin(t) { t.parent?.remove(t); t.traverse((o) => { if (o.userData.ownInst) o.dispose(); if (o.userData.glow) o.material.dispose(); }); }

// the craft at a point, set up for a film: its twin in the scene at the parked one's place, the parked one hidden
function stageCraft(g, p, mode) {
  const parked = vehicleOf(g, p);
  let src = parked;
  if (!src) {   // (nothing parked here: a fresh craft stands at the point)
    if (mode !== 'ship' && mode !== 'shuttle') return null;
    src = esmerShuttle({ landed: true, scale: mode === 'ship' ? 1.4 : 1 }); src.position.set(p.x, g.physics.groundAt(p.x, p.z), p.z); src.updateMatrixWorld(true);
  } else src.updateWorldMatrix(true, false);   // (its area's matrices too: a region shown for the first time this frame)
  const pos = V(), quat = new THREE.Quaternion(), scale = V();
  src.matrixWorld.decompose(pos, quat, scale);
  const t = twin(src); t.visible = true; t.position.copy(pos); t.quaternion.copy(quat); t.scale.copy(scale);
  t.matrixAutoUpdate = true; t.matrixWorldAutoUpdate = true; t.name = 'filmCraft';
  if (mode === 'ship' || mode === 'shuttle') { const gl = glowDisc(2.1); gl.userData.glow = true; t.add(gl); t.userData.glowM = gl; }
  const e = new THREE.Euler().setFromQuaternion(quat, 'YXZ');
  // the craft's forward: a glider's nose is +z, the ferry's bow +x (its hull runs along x); the saucers have none
  const fwdLocal = mode === 'ferry' ? V(1, 0, 0) : V(0, 0, 1);
  const fwd = fwdLocal.clone().applyQuaternion(quat).setY(0).normalize();
  return { parked, wasVisible: parked?.visible ?? false, twin: t, pos, quat, yaw: e.y, fwd, fwdLocal, scale: scale.x };
}
function showCraft(g, C) { g.scene.add(C.twin); if (C.parked) C.parked.visible = false; }
function endCraft(C) { if (!C) return; freeTwin(C.twin); if (C.parked) C.parked.visible = C.wasVisible || C.parked.visible; }

// the point's landing spot (where he steps off) and the direction from the craft toward it
function landingOf(g, p) { const l = p.landing || { x: p.x, z: p.z, a: 0 }; return { x: l.x, z: l.z, a: l.a ?? 0 }; }

// ---------------------------------------------------------------- the craft's motion
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
function setLevel(C, pos, yaw, pitch = 0, roll = 0, toParked = 0) {
  const t = C.twin; t.position.copy(pos);
  _e.set(pitch, yaw, roll, 'YXZ'); _q.setFromEuler(_e);
  if (C.fwdLocal.x) _q.multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), -Math.PI / 2));   // (the ferry: its +x is the bow)
  if (toParked > 0) _q.slerp(C.quat, toParked);
  t.quaternion.copy(_q);
}
// yaw of the bow direction (an actor's angle: atan2(x, z))
const yawOf = (d) => Math.atan2(d.x, d.z);
// where the open side is: the one of ±dir whose ground 25 m out is lower (the sea, the field's run, the sky)
// (sampled near and far, so a pier alongside counts against its side)
function openSide(g, C, dir) {
  const P = g.physics, at = (s) => { let h = 0; for (const d of [5, 9, 14, 20, 26]) { const x = C.pos.x + dir.x * d * s, z = C.pos.z + dir.z * d * s; let top = P.groundAt(x, z); for (const c of P.near(x, z)) if (c.enabled !== false && c.top > top && P._inside(c, x, z, 0.5)) top = c.top; h += top; } return h; };
  return at(1) <= at(-1) ? 1 : -1;
}
// a glider's run: of 16 headings, the one with the least in its way (ground or something standing higher than the
// glider is by then, across its wingspan), nearest its nose. height(s): its height over the field s metres out
function gliderRun(g, C, height) {
  const P = g.physics, B = C.pos, yaw0 = yawOf(C.fwd);
  let best = C.fwd, bc = Infinity;
  for (let i = 0; i < 16; i++) {
    const dy = (((i + 8) % 16) - 8) * Math.PI / 8, yaw = yaw0 + dy, d = V(Math.sin(yaw), 0, Math.cos(yaw));
    let cost = Math.abs(dy) * 2;
    for (const s of [8, 16, 25, 35, 48, 60]) {
      const h = B.y + height(s) - 0.4;
      for (const w of [-4.5, 0, 4.5]) {
        const x = B.x + d.x * s + d.z * w, z = B.z + d.z * s - d.x * w;
        if (P.groundAt(x, z) > h) { cost += 10; continue; }
        for (const c of P.near(x, z)) if (c.enabled !== false && c.top > h && P._inside(c, x, z, 0.5)) { cost += 10; break; }
      }
    }
    if (cost < bc) { bc = cost; best = d; }
  }
  return best;
}
const GLIDE_K = 4.5;   // (its climb: lift = (t − 0.7)² · GLIDE_K metres, rolling 2t + 7t² metres)
const glideT = (s) => (-2 + Math.sqrt(4 + 28 * s)) / 14;
// departure: the craft at time t (0 … len)
function departMotion(g, C, mode, len, out) {
  const B = C.pos;
  if (mode === 'ship' || mode === 'shuttle') {
    // (it lifts, hangs a moment, then climbs away from the watcher: up and out over the far side of the pad)
    const H = mode === 'ship' ? 26 : 18, D = mode === 'ship' ? 34 : 22;
    return (t) => {
      const k = clamp01((t - 0.5) / (len - 0.5)), hover = 0.4 * smooth(t / 0.5), r = Math.pow(k, 1.6);
      setLevel(C, V(B.x - out.x * D * k * k, B.y + hover + H * r, B.z - out.z * D * k * k), C.yaw + 0.7 * k * k, -0.12 * smooth(k * 2), 0, 1 - smooth(t / 0.4));
      const gm = C.twin.userData.glowM; if (gm) gm.material.opacity = 0.65 * smooth(t / 0.4);
    };
  }
  if (mode === 'glider') {
    // (it swings round onto its run as it starts rolling, then lifts)
    const f = gliderRun(g, C, (s) => Math.max(0, glideT(s) - 0.7) ** 2 * GLIDE_K), y0 = yawOf(C.fwd), y1 = yawOf(f);
    const dyaw = Math.atan2(Math.sin(y1 - y0), Math.cos(y1 - y0));
    return (t) => {
      const d = 2 * t + 7 * t * t, lift = Math.max(0, t - 0.7) ** 2 * GLIDE_K;
      setLevel(C, V(B.x + f.x * d, B.y + lift, B.z + f.z * d), y0 + dyaw * smooth(t / 0.7), -0.2 * smooth((t - 0.5) / 0.9), 0.04 * Math.sin(t * 2.3), 1 - smooth(t / 0.6));
    };
  }
  // the ferry backs off the quay and turns away
  const s = openSide(g, C, C.fwd), f = C.fwd.clone().multiplyScalar(s);
  return (t) => {
    const k = t / len, d = 10 * k * k;
    setLevel(C, V(B.x + f.x * d, B.y + Math.sin(t * 1.3) * 0.05, B.z + f.z * d), yawOf(C.fwd) + 0.3 * k * k * s, 0, Math.sin(t * 1.1) * 0.02, 1 - smooth(k * 4));
  };
}
// arrival: the craft at time t (0 … len), on its parked spot at len
function arriveMotion(g, C, mode, len, out) {
  const B = C.pos;
  if (mode === 'ship' || mode === 'shuttle') {
    // (it comes down from over the far side of the pad, slowing, and settles)
    const H = mode === 'ship' ? 24 : 18, D = mode === 'ship' ? 30 : 20;
    return (t) => {
      const k = clamp01(t / len), e = outCubic(k), u = 1 - e;
      setLevel(C, V(B.x - out.x * D * u * u, B.y + H * u, B.z - out.z * D * u * u), C.yaw - 0.8 * u, 0.1 * u, 0, smooth((k - 0.7) / 0.3));
      const gm = C.twin.userData.glowM; if (gm) gm.material.opacity = 0.65 * (1 - smooth((k - 0.8) / 0.2));
    };
  }
  if (mode === 'glider') {
    // (it comes in nose first along the clearest approach, and swings onto its spot as it rolls out)
    const f = gliderRun(g, C, (s) => 11 * (Math.min(s, 48) / 48) ** 2).multiplyScalar(-1), yf = yawOf(f);
    return (t) => {
      const k = clamp01(t / len), e = outCubic(k), u = 1 - e;
      setLevel(C, V(B.x - f.x * 48 * u, B.y + 11 * u * u, B.z - f.z * 48 * u), yf,-0.12 * u + 0.06 * smooth((k - 0.75) / 0.2) * (1 - smooth((k - 0.95) / 0.05)), 0.05 * Math.sin(t * 2.1) * u, smooth((k - 0.7) / 0.3));
    };
  }
  const s = openSide(g, C, C.fwd);   // (the ferry comes in from the sea side, slowing)
  return (t) => {
    const k = clamp01(t / len), e = outCubic(k), u = 1 - e;
    setLevel(C, V(B.x + C.fwd.x * s * 26 * u, B.y + Math.sin(t * 1.3) * 0.05 * u, B.z + C.fwd.z * s * 26 * u), yawOf(C.fwd) + 0.22 * u, 0, Math.sin(t * 1.1) * 0.02 * u, smooth((k - 0.75) / 0.25));
  };
}
// a camera watching the craft from beyond his landing spot, raised, a little to the side; it turns to follow it. Of a
// few such places the first where the lens has room (nothing within 1.4 m of it) and sees the craft (nothing between
// them): the area's colliders and a few rays through its drawn pieces (once, when the film starts)
const _ray = new THREE.Raycaster(), _hits = [];
function rayHit(g, root, a, b, far) {
  if (!root) return false;
  _ray.set(a, V().subVectors(b, a).normalize()); _ray.far = far; _ray.camera = g.camera; _hits.length = 0;
  return castAll(root);
}
// every shown mesh under root, whatever its layers (the draw batches take the pieces they draw off the main layer, so
// the raycaster's own layer test would see none of them); true at the first hit
// (the ground and the big merged pieces — tens of thousands of triangles each, tested one by one — are left to the
//  colliders and the ground height: the rays are for what stands in the frame, a pole, a tree, a lamp, a sign)
const BIG_TRIS = 12000, _sph = new THREE.Sphere();
let _near = null;   // (the craft: only pieces within 70 m of it are tried)
function castAll(root) {
  let found = false;
  const list = (root.userData._filmCast ??= []);
  if (!list.length) root.traverseVisible((o) => {
    if (!o.isMesh || o.isSprite || o.userData.drawBatch || o.userData.shadowProxy) return;
    const geo = o.geometry, n = geo?.index ? geo.index.count / 3 : (geo?.attributes.position?.count ?? 0) / 3;
    if (n * (o.isInstancedMesh ? o.count : 1) > BIG_TRIS) return;
    if (_near && !o.isInstancedMesh) { if (!geo.boundingSphere) geo.computeBoundingSphere(); _sph.copy(geo.boundingSphere).applyMatrix4(o.matrixWorld); if (_sph.center.distanceTo(_near) > _sph.radius + 70) return; }
    list.push(o);
  });
  for (const o of list) {
    try { o.raycast(_ray, _hits); } catch { /* (a piece that cannot be ray-tested: the colliders decide) */ }
    if (_hits.length) { found = true; break; }
  }
  return found;
}
// (aims: where the craft is at the shot's start and end: each must be seen, with nothing just in front of the
//  lens around it either — a flag pole beside the camera crossed the climbing ship's frame; baseY: the craft's ground)
function clearView(g, root, cam, aims, baseY) {
  const P = g.physics, hit = (x, z, y, r) => { for (const c of P.near(x, z)) if (c.enabled !== false && c.top > y - 0.3 && (c.bottom == null || c.bottom < y + 0.3) && P._inside(c, x, z, r)) return true; return false; };
  if (hit(cam.x, cam.z, cam.y, 1.4)) return false;
  // (not on a slope or a roof over the field: it would look down past the things at its feet)
  const gy = P.groundAt(cam.x, cam.z, cam.y);
  if (gy > baseY + 2.5) return false;
  // (anything tall within 4 m of the lens — a tree's crown spreads over its trunk's collider, a board stands in the
  //  frame's foot — and anything standing near the first part of the line of sight)
  for (const c of P.near(cam.x, cam.z)) if (c.enabled !== false && c.top > gy + 2.2 && c.top > cam.y - 6 && P._inside(c, cam.x, cam.z, 4.0)) return false;
  for (const A of aims) {
    for (let i = 1; i < 8; i++) {
      const u = i / 8, x = cam.x + (A.x - cam.x) * u, z = cam.z + (A.z - cam.z) * u, y = cam.y + (A.y - cam.y) * u;
      if (Math.hypot(x - A.x, z - A.z) < 5) continue;   // (the craft's own collider, round its pad)
      if (hit(x, z, y - (u < 0.6 ? 1.5 : 0), u < 0.6 ? 0.8 : 0.2)) return false;
    }
    const d = cam.distanceTo(A), dir = V().subVectors(A, cam).normalize(), side = V(dir.z, 0, -dir.x).normalize(), up = V().crossVectors(side, dir);
    if (rayHit(g, root, cam, A, Math.max(0, d - 5))) return false;
    // (the frame round it: rays through a ring 4.5 m out)
    for (const r of [4.5]) for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const q = V().copy(cam).addScaledVector(dir, r).addScaledVector(side, a * r * 0.42).addScaledVector(up, b * r * 0.26);
      if (rayHit(g, root, cam, q, cam.distanceTo(q))) return false;
    }
  }
  return true;
}
function watchShot(g, C, land, mode, region, makeMotion, len) {
  const B = C.pos, out = V(land.x - B.x, 0, land.z - B.z);
  const dist = out.length() || 1; out.divideScalar(dist);
  const side = V(out.z, 0, -out.x);
  const back = { ship: 11, shuttle: 8, ferry: 7, glider: 9 }[mode], up = { ship: 3.4, shuttle: 3.0, ferry: 4.2, glider: 3.6 }[mode];
  const top = mode === 'ferry' ? 2.5 : 1.8;
  _near = B;
  const move = makeMotion(out), aims = [0, 1].map((u) => { move(len * u); return V().copy(C.twin.position).add(V(0, top, 0)); });
  const root = region === 'citadel' ? g.world.root : g.regions?.built?.(region)?.group;
  root?.updateMatrixWorld(true);   // (the rays read the pieces' world matrices: an area not drawn since it was built has none yet)
  const was = C.parked?.visible;
  if (C.parked) C.parked.visible = false;   // (not in its own way)
  // the places to try: beyond his landing spot (the craft beyond him); a boat from across the water, side on
  const spots = [];
  if (mode === 'ferry') {
    const perp = V(C.fwd.z, 0, -C.fwd.x), o = openSide(g, C, perp);
    for (const s of [o, -o]) for (const d of [18, 24, 13]) spots.push(V(B.x, 0, B.z).addScaledVector(perp, s * d).addScaledVector(C.fwd, 3));
  }
  for (const [kb, ks] of [[1, 0.35], [1, -0.35], [0.6, 0.35], [0.6, -0.35], [1.4, 0.2], [1.4, -0.2], [0.3, 0.6], [0.3, -0.6], [0.3, 0], [1, 0]]) {
    const r = dist + back * kb; spots.push(V(B.x, 0, B.z).addScaledVector(out, r).addScaledVector(side, r * ks));
  }
  // (last: higher, over whatever stands round the field — the view from a rooftop)
  const high = [];
  for (const ks of [0.3, -0.3, 0]) for (const h of [9, 14]) { const r = dist + 6; const c = V(B.x, 0, B.z).addScaledVector(out, r).addScaledVector(side, r * ks); c.hi = h; high.push(c); }
  let cam = null, tried = 0;
  const t0 = performance.now();
  try {
    for (const c of [...spots, ...high]) {
      if (performance.now() - t0 > 250) break;   // (a slow machine: the view from above, untried, rather than a longer wait)
      c.y =c.hi ? Math.max(B.y + c.hi, g.physics.groundAt(c.x, c.z) + 3) : Math.max(B.y + up, g.physics.groundAt(c.x, c.z) + 1.6);
      tried++;
      if (clearView(g, root, c, aims, c.hi ? Infinity : B.y)) { cam = c; break; }
    }
  } finally { if (C.parked) C.parked.visible = was; if (root) delete root.userData._filmCast; }
  cam ??= high[1];
  const lookH = mode === 'ferry' ? 2.2 : 1.6;
  return { out, cam, move, tried, ms: Math.round(performance.now() - t0), shot: () => ({ pos: cam, look: V().copy(C.twin.position).add(V(0, lookH, 0)), fov: mode === 'glider' ? 46 : 50 }) };
}

// ---------------------------------------------------------------- the space backdrop (the ship's film)
function planetTexture(kind) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  let s = kind === 'zeelich' ? 11 : 5; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  if (kind === 'zeelich') {
    // a sea of clouds in violets and pinks, banded, with dark island specks
    x.fillStyle = '#6a4a9e'; x.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 46; i++) { const y = r() * 256; x.fillStyle = r() < 0.5 ? 'rgba(240,176,216,0.35)' : 'rgba(176,140,230,0.35)'; x.fillRect(0, y, 512, 4 + r() * 14); }
    for (let i = 0; i < 70; i++) { x.fillStyle = 'rgba(255,220,240,0.25)'; x.beginPath(); x.ellipse(r() * 512, r() * 256, 10 + r() * 40, 3 + r() * 6, 0, 0, Math.PI * 2); x.fill(); }
    for (let i = 0; i < 18; i++) { x.fillStyle = 'rgba(60,40,70,0.7)'; x.beginPath(); x.arc(r() * 512, 60 + r() * 136, 1.5 + r() * 3, 0, Math.PI * 2); x.fill(); }
  } else {
    // Twinsun: blue seas, green and sand islands, the cloud belt round the middle, white caps
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#e8f4ff'); g.addColorStop(0.12, '#2f78c8'); g.addColorStop(0.5, '#1f64b0'); g.addColorStop(0.88, '#2f78c8'); g.addColorStop(1, '#e8f4ff');
    x.fillStyle = g; x.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 40; i++) { const cx = r() * 512, cy = 40 + r() * 176; x.fillStyle = r() < 0.6 ? '#5a9a4a' : '#d8c08a'; x.beginPath(); x.ellipse(cx, cy, 6 + r() * 22, 4 + r() * 12, r() * 3, 0, Math.PI * 2); x.fill(); }
    for (let i = 0; i < 140; i++) { x.fillStyle = 'rgba(255,255,255,0.4)'; x.beginPath(); x.ellipse(r() * 512, 118 + (r() - 0.5) * 34, 12 + r() * 30, 3 + r() * 5, 0, 0, Math.PI * 2); x.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  return t;
}
function starTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const x = c.getContext('2d'); x.fillStyle = '#03040c'; x.fillRect(0, 0, 1024, 512);
  let s = 3; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) { const b = 120 + r() * 135 | 0; x.fillStyle = `rgb(${b},${b},${Math.min(255, b + 25)})`; const z = r() < 0.06 ? 2 : 1; x.fillRect(r() * 1024, r() * 512, z, z); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
let FLYER = null;   // (the ship in space: legs tucked, its glow on; shared geometry, kept for the session)
function buildSpace(fromK, toK) {
  const group = new THREE.Group(); group.name = 'filmSpace';
  const own = [];
  const mk = (geo, mat) => { own.push(geo, mat); if (mat.map) own.push(mat.map); const m = new THREE.Mesh(geo, mat); m.castShadow = m.receiveShadow = false; group.add(m); return m; };
  mk(new THREE.SphereGeometry(450, 24, 12), new THREE.MeshBasicMaterial({ map: starTexture(), side: THREE.BackSide, fog: false, toneMapped: false })).frustumCulled = false;
  const planet = (kind, r) => {
    const tex = planetTexture(kind);
    const p = mk(new THREE.SphereGeometry(r, 48, 24), new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.35, roughness: 1, metalness: 0, fog: false }));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(r * 1.035, 32, 16), new THREE.MeshBasicMaterial({ color: kind === 'zeelich' ? '#f0b8ff' : '#a8d8ff', transparent: true, opacity: 0.22, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    own.push(halo.geometry, halo.material); p.add(halo);
    return p;
  };
  const from = planet(fromK, 220), to = planet(toK, 110);
  if (!FLYER) { FLYER = esmerShuttle({ landed: false, scale: 1.4 }); mergeStatic(FLYER); FLYER.traverse((o) => { o.castShadow = false; }); }   // (a mesh per material)
  group.add(FLYER);
  return { group, from, to, ship: FLYER, dispose() { group.remove(FLYER); group.parent?.remove(group); for (const o of own) o.dispose?.(); own.length = 0; } };
}

// ---------------------------------------------------------------- the film runner
// Cinematic with a synchronous start (the films' scenery is built at once; the tests step the game in one go)
class Film extends Cinematic {
  start() {
    const g = this.game;
    this.state = 'prep';
    g.cine = this; g.camRig.cine = true; g.camRig.override = null;
    if (g.hero.rig.silhouette) g.hero.rig.silhouette.visible = false;
    g.setState('cinematicEnd');
    g.hud.show(false);
    document.body.classList.add('cine-on');
    $('#touch')?.classList.add('hidden');
    $('#fade').classList.remove('quick');
    $('#fade').classList.add('on', 'instant');
    this.ui(true);
    try { this.def.prepare?.(this); } catch (e) { console.error('journey film prepare failed', e); }
    this.state = 'run';
    g.setState('cinematic');
    // (the scenery that comes later in the film — the cabin, space — has its shaders started now, under the black;
    //  three compiles what is visible, so each is shown for the call and hidden again)
    const r = g.renderer?.renderer;
    if (this.warm && r?.compileAsync && !g.testFreeze) for (const o of this.warm) { const v = o.visible; o.visible = true; r.compileAsync(o, g.camera, g.scene).catch(() => {}); o.visible = v; }
    this.apply(0);
    const reveal = () => $('#fade').classList.remove('instant', 'on');
    requestAnimationFrame(reveal); setTimeout(reveal, 250);
  }
}
// the screen to black at the end of a departure film (the scene change takes over from there)
const fadeOut = () => { const f = $('#fade'); f.classList.remove('instant'); f.classList.add('quick', 'on'); };
function heroShow(g, on) { const h = g.hero; h.rig.root.visible = on; h.shadow.visible = on; if (on) { h.rig.lookAt = null; h.sync(); } }
const logPart = (ride, part, len) => { const e = { n: (FILMS.n = (FILMS.n || 0) + 1), part,mode: ride.mode, from: ride.from?.id ?? null, to: ride.to.id, length: +len.toFixed(2), t: 0, skipped: false }; FILMS.log.push(e); if (FILMS.log.length > 60) FILMS.log.shift(); return e; };

// ---------------------------------------------------------------- the departure film
function departFilm(g, ride, next) {
  const mode = ride.mode, C = stageCraft(g, ride.from, mode);
  if (!C) return null;
  const L = LEN[mode], land0 = landingOf(g, ride.from);
  const W = watchShot(g, C, land0, mode, ride.from.region, (out) => departMotion(g, C, mode, L.depart, out), L.depart), move = W.move;
  const ship = mode === 'ship', tCab = L.depart, tSpace = ship ? tCab + L.cabin : 0, length = ship ? tSpace + L.space : L.depart;
  const log = logPart(ride, 'depart', length); Object.assign(log, { craft: C.pos.toArray().map((v) => +v.toFixed(1)), cam: W.cam.toArray().map((v) => +v.toFixed(1)), parked: !!C.parked, camTried: W.tried, camMs: W.ms });
  const events = [], tracks = [], shots = [];
  let cab = null, space = null, cast = [], stage = null, buildStage = null;
  const h = g.hero;
  shots.push({ t0: 0, t1: L.depart, from: W.shot });
  tracks.push({ t0: 0, t1: L.depart, fn: (k, t) => move(t) });
  events.push({ t: 0, fn: (c) => { c.focus = C.pos; g.audio.play(mode === 'ferry' ? 'horn' : mode === 'glider' ? 'whoosh' : 'rumble'); } });
  if (ship) {
    const S = V(C.pos.x, C.pos.y + 600, C.pos.z);   // (the cabin and space float high above the area, out of its sight)
    const toW = (q, y = 0) => V(S.x + q.x, S.y + (q.y ?? y), S.z + q.z);
    events.push({ t: tCab, fn: (c) => {
      c.focus = S; cab.group.visible = true; C.twin.visible = false;
      const H = cab.hero; h.rig.root.position.copy(toW(H)); h.rig.root.rotation.y = H.a; h.rig.root.visible = true; h.shadow.visible = false;
      h.rig.play('idle'); h.rig.lookAt = toW(H.lookAt, H.lookAt.y);
      g.audio.play('hum');
    } });
    const camAt = (s, k = 0) => { const a = cab.shots[s]; const p = V(...a.pos), l = V(...a.look); if (s === 0) p.lerp(l, 0.12 * k); return { pos: toW({ x: p.x, y: p.y, z: p.z }), look: toW({ x: l.x, y: l.y, z: l.z }), fov: a.fov }; };
    shots.push({ t0: tCab, t1: tCab + 2.3, from: () => camAt(0, 0), to: () => camAt(0, 1), ease: (x) => x });
    shots.push({ t0: tCab + 2.3, t1: tSpace, from: () => camAt(1) });
    tracks.push({ t0: tCab, t1: tSpace, fn: (k, t, dt) => {
      cab.update(dt); h.rig.update(dt, 0);
      for (const a of cast) { if (a.lookHero) a.rig.lookAt = h.rig.j.head.getWorldPosition(V()); a.rig.update(dt, 0); }
    } });
    events.push({ t: tSpace, fn: (c) => {
      cab.group.visible = false; h.rig.root.visible = false; h.rig.lookAt = null; h.rig.root.position.copy(h.pos);
      space.group.visible = true; c.focus = space.group.position; g.audio.play('whoosh');
    } });
    // the planet falling away under the climbing ship, then the other one ahead
    const sp = () => space.group.position;
    tracks.push({ t0: tSpace, t1: length, fn: (k, t) => {
      // (the backdrop's pieces in its own frame; the camera below in the world's)
      const u = t - tSpace, a = clamp01(u / 1.2), b = clamp01((u - 1.2) / 1.2), sh = space.ship;
      if (u < 1.2) {
        space.from.visible = true; space.to.visible = false;
        space.from.position.set(0, -250 - 110 * a, 90); space.from.rotation.y = 0.2 + a * 0.05;
        sh.position.set(0, 9 * a, 12 + 24 * a); sh.rotation.set(-0.15, 0, 0);
      } else {
        space.from.visible = false; space.to.visible = true;
        const sc = 0.72 + 0.28 * b; space.to.scale.setScalar(sc); space.to.position.set(-30, 18, 250); space.to.rotation.y = 1 + b * 0.04;
        sh.position.set(12 - 18 * b, 1 + 3 * b, 26 + 48 * b); sh.rotation.set(0, -0.35, 0.12);
      }
    } });
    shots.push({ t0: tSpace, t1: tSpace + 1.2, from: () => { const O = sp(); return { pos: V(2.5, 6, -9).add(O), look: V().copy(space.ship.position).add(V(0, -3, 6)).add(O), fov: 55 }; } });
    shots.push({ t0: tSpace + 1.2, t1: length, from: () => { const O = sp(); return { pos: V(13, 3, 8).add(O), look: V().copy(space.ship.position).add(V(-2, 0, 6)).add(O), fov: 50 }; } });
    buildStage = () => {
      cab = buildShipCabin({ view: { planet: planetOf(ride.to.region) === 'zeelich' ? '#b07ad8' : '#4f8fd6' } });
      cab.group.position.copy(S); g.scene.add(cab.group); cab.group.visible = false;
      for (const ps of cab.passengers) {
        const rig = createCharacter(ps.look), at = ps.seat != null ? cab.seats[ps.seat] : ps.stand;
        rig.root.position.set(at.x, 0, at.z + (ps.seat != null ? 0.06 : 0)); rig.root.rotation.y = at.a; cab.group.add(rig.root);
        rig.play(ps.anim || 'idle'); rig.noFidget = true;
        const a = { rig, lookHero: ps.lookAt === 'hero' };
        if (ps.lookAt && ps.lookAt !== 'hero') rig.lookAt = toW(ps.lookAt, ps.lookAt.y);
        rig.update(1 / 30, 0); cast.push(a);
      }
      space = buildSpace(planetOf(ride.from.region), planetOf(ride.to.region));
      space.group.position.set(S.x, S.y + 300, S.z); g.scene.add(space.group); space.group.visible = false;
      stage = [cab.group, space.group];
    };
  }
  events.push({ t: length - 0.35, fn: fadeOut });
  const cine = new Film(g, {
    length, events, tracks, shots,
    prepare(c) {
      showCraft(g, C); heroShow(g, false);
      if (ship) {
        // (the cabin, its people and the space backdrop: built now, freed when the film ends)
        buildStage();
        c.warm = stage;
      }
      move(0);
    },
    finish(skipped) {
      log.t = +cine.t.toFixed(2); log.skipped = skipped; ride.skipped = skipped;
      endCraft(C);
      // (the passengers: their body's own material and skeleton go; the body geometry is the look's, shared)
      for (const a of cast) { a.rig.lookAt = null; a.rig.root.parent?.remove(a.rig.root); a.rig.mesh?.material?.dispose?.(); a.rig.mesh?.skeleton?.dispose?.(); }
      cab?.dispose(); space?.dispose();
      h.rig.lookAt = null; heroShow(g, true);
      g.hud.show(true); $('#touch')?.classList.toggle('hidden', !g.touch);
      cine.focus = null;
      g.setState('play');
      next();
    },
  });
  return cine;
}

// ---------------------------------------------------------------- the arrival film
function arriveFilm(g, ride) {
  const mode = ride.mode, p = ride.to, C = stageCraft(g, p, mode);
  if (!C) return null;
  const L = LEN[mode], land = landingOf(g, p), h = g.hero;
  const W = watchShot(g, C, land, mode, p.region, (out) => arriveMotion(g, C, mode, L.arrive, out), L.arrive), move = W.move;
  const tStep = L.arrive, tBlend = tStep + LEN.step, length = tBlend + LEN.blend;
  const log = logPart(ride, 'arrive', length); Object.assign(log, { craft: C.pos.toArray().map((v) => +v.toFixed(1)), cam: W.cam.toArray().map((v) => +v.toFixed(1)), parked: !!C.parked, camTried: W.tried, camMs: W.ms });
  // he steps off: from a little behind his landing spot, walking forward onto it
  const back = V(-Math.sin(land.a), 0, -Math.cos(land.a)), from = V(land.x, 0, land.z).addScaledVector(back, 1.5);
  const gy = (x, z) => g.physics.groundAt(x, z, h.pos.y + 1.0);
  const shots = [{ t0: 0, t1: tBlend, from: W.shot }, { t0: tBlend, t1: length, to: 'game' }];
  const events = [
    { t: 0, fn: (c) => { c.focus = C.pos; g.audio.play(mode === 'ferry' ? 'horn' : mode === 'glider' ? 'whoosh' : 'rumble'); } },
    { t: tStep, fn: (c) => { g.audio.play(mode === 'ferry' ? 'clunk' : 'thump'); if (mode !== 'ferry') g.camRig.shake(0.12); h.rig.root.visible = true; h.shadow.visible = true; h.rig.play('walk'); c.focus = h.pos; } },
    { t: tBlend, fn: () => { h.rig.play('idle'); h.rig.root.position.copy(h.pos); h.rig.root.rotation.y = h.angle; h.sync(); g.camRig.snap(); } },
  ];
  const tracks = [
    { t0: 0, t1: tStep, fn: (k, t) => move(t) },
    { t0: tStep, t1: tBlend, fn: (k, t, dt) => {
      const x = from.x + (land.x - from.x) * k, z = from.z + (land.z - from.z) * k;
      h.rig.root.position.set(x, gy(x, z), z); h.rig.root.rotation.y = land.a; h.rig.update(dt, k < 1 ? 1.65 : 0);
      h.shadow.position.set(x, h.rig.root.position.y + 0.05, z);
    } },
    { t0: tBlend, t1: length, fn: (k, t, dt) => { h.rig.update(dt, 0); } },
  ];
  // (the camera keeps watching the craft; when he steps off it turns to him)
  shots[0].from = (t) => { const s = W.shot(t); if (t >= tStep) s.look.lerp(V(h.rig.root.position.x, h.rig.root.position.y + 1.1, h.rig.root.position.z), smooth((t - tStep) / 0.6)); return s; };
  const cine = new Film(g, {
    length, events, tracks, shots,
    prepare() { showCraft(g, C); heroShow(g, false); move(0); },
    finish(skipped) {
      log.t = +cine.t.toFixed(2); log.skipped = skipped;
      endCraft(C);
      heroShow(g, true); h.rig.play('idle');
      g.camRig.cine = false; g.camRig.snap();
      g.hud.show(true); $('#touch')?.classList.toggle('hidden', !g.touch);
      cine.focus = null;
      g.setState('play');
    },
  });
  return cine;
}

// ---------------------------------------------------------------- a journey
// ride = { from (travel point or null), to (travel point), mode }; start(then) begins the scene change: the area swap
// under the black exactly as without films; `then` (when given) starts the arrival film on the new area's first frame
export function playJourney(game, ride, start) {
  const g = game;
  if (!FILMS.on || !ride.to) { start(null); return; }
  ride = { ...ride, skipped: false };
  const arrive = () => { let f = null; try { f = arriveFilm(g, ride); } catch (e) { console.error('journey film (arrival) failed', e); } if (f) f.start(); else afterNoFilm(g); };
  let dep = null;
  try {
    dep = ride.from ? departFilm(g, ride, () => {
      start(ride.skipped ? null : arrive);
      // (the departure film ended in black: the scene change starts there, at its swap, not with its own fade-out)
      const T = g.trans, f = $('#fade');
      if (T) { T.t = 0.35; f.style.transition = 'none'; f.style.opacity = 1; g._fadeOp = 1; }
      f.classList.remove('quick', 'on', 'instant');
    }) : null;
  } catch (e) { console.error('journey film (departure) failed', e); dep = null; }
  if (dep) dep.start(); else start(arrive);
}
// The story's own crossings between the planets (PLANET-1: chapter 2's project ship with Doran, chapter 8's): the
// ship's departure film from the spaceport he is at — the take-off, the cabin, space — then the story's own scene
// change, start() (it calls Game.startTransition; the chapter's arrival is the story's, so no arrival film).
// aboard: the people of the story who board with him (their bodies are hidden while the ship leaves without them).
export function crossByShip(game, start, { aboard = [] } = {}) {
  const g = game, T = g.travel, onZ = (g.room?.id ?? 'citadel') === 'zeelich';
  const from = T?.points[onZ ? 'zeelich_port' : 'citadel_port'], to = T?.points[onZ ? 'citadel_port' : 'zeelich_port'];
  if (!FILMS.on || !from || !to) { start(); return; }
  const hidden = aboard.filter((n) => n?.present && n.rig.root.visible);
  for (const n of hidden) { n.rig.root.visible = false; if (n.shadow) n.shadow.visible = false; }
  playJourney(g, { from, to, mode: 'ship' }, () => { for (const n of hidden) { n.rig.root.visible = true; if (n.shadow) n.shadow.visible = true; } start(); });
}
// (an arrival with no film to play: control back as after a plain transition)
function afterNoFilm(g) { g.hud.show(true); if (g.state !== 'play') g.setState('play'); }
