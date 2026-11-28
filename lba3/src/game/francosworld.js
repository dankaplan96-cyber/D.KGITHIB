// H-15 · The Francos' dig, twelve years on (docs/lba-maturity/FRANCOS.md; CONTENT-15H.md §3 wave 6): the pieces in the
// world on Knartas (the story is src/game/story/francos.js, the text text/francos.js). Our own, nothing from LBA2: the
// diggers' holes (open ones with their spoil, old filled ones as low mounds of turned earth), two spades stuck in the
// ground, the Founder's Seat (a worn stone seat), the Great Waker (the relic: a tin alarm clock with two bells, its
// hands at six, the shift change) and, once it is found, the little shrine it is set up on where it lay.
//
// CONTRACT
//   FW: { field (the static group), shrine { g, setOn(on) }, box { g, setOn(on) }, holes [{ g, x, z }] (Twinsen's own,
//         not saved), seat { x, z, y, ry } }
//   buildField(game, R, L) — once, with the island built (R: the region, L: story/francos.js's layout in world metres)
//   digHole(game, x, z) — one of Twinsen's own holes (at most HOLES_MAX; the oldest is filled in again)
//   clockModel(scale) — the Great Waker (itemlook.js's 'clock' and the shrine's)
// Every piece stands on the ground as measured where it stands (tilted to the slope: the gully under the gold dome
// slopes), with a low collider where it should be walked round (an open hole, the seat, the shrine).
import * as THREE from 'three';
import { Kit, MAT, rbox, cyl, sphere, torus, canvasTex } from './props.js';

export const FW = { field: null, shrine: null, box: null, holes: [], seat: null };
export const HOLES_MAX = 5;
const EARTH = '#6b4a2e', TURNED = '#5a3d26', PIT = '#1d140d';

// the slope under (x, z): the tilt a small flat thing takes to lie on it ({ rx, rz }, 'YXZ' as Kit.add's)
function tilt(P, x, z, y, r = 0.45) {
  const g = (dx, dz) => P.groundAt(x + dx, z + dz, y + 1.5);
  const gx = (g(r, 0) - g(-r, 0)) / (2 * r), gz = (g(0, r) - g(0, -r)) / (2 * r);
  const cl = (v) => Math.max(-0.5, Math.min(0.5, v));
  return { rx: cl(-Math.atan(gz)), rz: cl(Math.atan(gx)) };
}
// a group in world metres under the island's group (which may be offset)
function worldGroup(parent, name) {
  const g = new THREE.Group(); g.name = name;
  parent.updateMatrixWorld?.(true);
  new THREE.Matrix4().copy(parent.matrixWorld).invert().decompose(g.position, g.quaternion, g.scale);
  parent.add(g);
  return g;
}

// ---------------------------------------------------------------- holes
// an open hole (local: centre on the ground, y up): the dark pit, a rim of loose earth, the spoil heaped beside it
function openHole(k, x, y, z, ry, t) {
  k.at(x, y, z, ry, () => {
    k.add(cyl(0.36, 0.36, 0.04, 16), MAT.flat(PIT, 1), 0, 0.03, 0, 0, t);
    k.add(torus(0.42, 0.09, 6, 18), MAT.flat(EARTH, 0.95), 0, 0.04, 0, 0, { rx: (t.rx || 0) + Math.PI / 2, rz: t.rz, sz: 0.55 });
    k.add(sphere(1, 12, 6), MAT.flat('#7a5636', 0.95), 0.7, -0.02, 0.12, 0, { ...t, sx: 0.36, sy: 0.24, sz: 0.3 });
    k.add(sphere(1, 10, 5), MAT.flat('#7a5636', 0.95), 0.62, -0.02, -0.26, 0, { ...t, sx: 0.22, sy: 0.15, sz: 0.2 });
  });
}
// an old hole filled in again: a low mound of darker turned earth
function filledHole(k, x, y, z, ry, t) {
  k.at(x, y, z, ry, () => { k.add(sphere(1, 12, 6), MAT.flat(TURNED, 0.97), 0, -0.04, 0, 0, { ...t, sx: 0.5, sy: 0.13, sz: 0.42 }); });
}
// a spade stuck in the ground, leaning a little (its blade half in the earth)
function spade(k, x, y, z, ry) {
  k.at(x, y, z, ry, () => {
    const lean = { rx: 0.22 };
    k.add(cyl(0.02, 0.024, 1.0, 8), MAT.wood('honey'), 0, 0.62, 0.12, 0, lean);
    k.add(rbox(0.16, 0.035, 0.035, 0.01), MAT.wood('dark'), 0, 1.1, 0.23, 0, lean);
    k.add(rbox(0.19, 0.26, 0.018, 0.006), MAT.steel(), 0, 0.06, 0.0, 0, lean);
  });
}

// ---------------------------------------------------------------- the Founder's Seat
// two stone blocks, a slab (its top 0.46 m up: a seat's height, the sitting pose's), a low back. Front: local +z.
function seat(k, x, y, z, ry, yLow) {
  const st = MAT.flat('#b0a48e', 0.92), down = Math.max(0.12, y - yLow + 0.1);
  k.at(x, y, z, ry, () => {
    for (const sx of [-0.5, 0.5]) k.add(rbox(0.3, 0.37 + down, 0.42, 0.04), st, sx, (0.37 - down) / 2, 0);
    k.add(rbox(1.35, 0.09, 0.5, 0.035), st, 0, 0.415, 0.02);
    k.add(rbox(1.35, 0.5 + down, 0.12, 0.035), st, 0, (0.96 - down) / 2, -0.25);
    // a worn hollow in the middle of the slab (darker, polished by twelve years of diggers sitting for luck)
    k.add(rbox(0.5, 0.012, 0.3, 0.005), MAT.flat('#c8bca4', 0.45), 0, 0.462, 0.04);
  });
}

// ---------------------------------------------------------------- the Great Waker
let FACE = null;
function faceTex() {
  return (FACE ||= canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = '#f2ead2'; x.beginPath(); x.arc(64, 64, 62, 0, Math.PI * 2); x.fill();
    x.strokeStyle = '#2a2420'; x.lineCap = 'round';
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, r0 = i % 3 ? 50 : 44; x.lineWidth = i % 3 ? 3 : 6; x.beginPath(); x.moveTo(64 + Math.sin(a) * r0, 64 - Math.cos(a) * r0); x.lineTo(64 + Math.sin(a) * 57, 64 - Math.cos(a) * 57); x.stroke(); }
    // the hands at six: the shift change
    x.lineWidth = 6; x.beginPath(); x.moveTo(64, 64); x.lineTo(64, 106); x.stroke();
    x.lineWidth = 7; x.beginPath(); x.moveTo(64, 64); x.lineTo(64, 30); x.stroke();
    x.fillStyle = '#b8402e'; x.beginPath(); x.arc(64, 64, 6, 0, Math.PI * 2); x.fill();
  }));
}
const CM = {};
const cmat = (k, f) => (CM[k] ||= f());
export function clockModel(scale = 1) {
  const g = new THREE.Group(), s = scale;
  const tin = cmat('tin', () => new THREE.MeshStandardMaterial({ color: '#c8402e', roughness: 0.42, metalness: 0.35 }));
  const brass = cmat('brass', () => new THREE.MeshStandardMaterial({ color: '#e0b25a', roughness: 0.3, metalness: 0.75 }));
  const face = cmat('face', () => new THREE.MeshStandardMaterial({ map: faceTex(), roughness: 0.6 }));
  const glass = cmat('glass', () => new THREE.MeshStandardMaterial({ color: '#dff2ff', roughness: 0.05, transparent: true, opacity: 0.25, depthWrite: false }));
  const put = (geo, m, x, y, z, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x * s, y * s, z * s); o.rotation.set(rx, 0, rz); o.scale.setScalar(s); g.add(o); return o; };
  put(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 28), tin, 0, 0, 0, Math.PI / 2);
  put(new THREE.TorusGeometry(0.095, 0.008, 6, 28), brass, 0, 0, 0.031);
  put(new THREE.CircleGeometry(0.088, 28), face, 0, 0, 0.0305);
  put(new THREE.CircleGeometry(0.088, 28), glass, 0, 0, 0.036);
  for (const sx of [-1, 1]) {
    put(new THREE.SphereGeometry(0.048, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), brass, sx * 0.062, 0.128, 0, 0, -sx * 0.45);
    put(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 6), brass, sx * 0.048, 0.1, 0, 0, -sx * 0.45);
    put(new THREE.SphereGeometry(0.018, 8, 6), tin, sx * 0.07, -0.098, 0.0);   // (the feet)
  }
  put(new THREE.CylinderGeometry(0.005, 0.005, 0.07, 6), brass, 0, 0.13, 0, 0, Math.PI / 2);   // (the hammer's arm)
  put(new THREE.SphereGeometry(0.012, 8, 6), brass, 0, 0.13, 0);
  put(new THREE.BoxGeometry(0.06, 0.03, 0.008), brass, 0, 0.0, -0.045);   // (the winding key at the back)
  put(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 6), brass, 0, 0.0, -0.036, Math.PI / 2);
  return g;
}

// ---------------------------------------------------------------- the shrine
// a short stone pillar where it was found, a little shingled roof on four posts over the clock, two pennants
function shrine(k, x, y, z, ry, yLow) {
  const st = MAT.stone('sand', 1), down = Math.max(0.12, y - yLow + 0.1), wd = MAT.wood('dark');
  k.at(x, y, z, ry, () => {
    k.add(rbox(0.62, 0.16 + down, 0.62, 0.03), st, 0, (0.16 - down) / 2, 0);
    k.add(rbox(0.44, 0.86, 0.44, 0.03), st, 0, 0.16 + 0.43, 0);
    k.add(rbox(0.56, 0.08, 0.56, 0.02), st, 0, 1.06, 0);
    for (const [px, pz] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]]) k.add(cyl(0.018, 0.018, 0.62, 6), wd, px, 1.41, pz);
    for (const sz of [-1, 1]) k.add(rbox(0.72, 0.03, 0.42, 0.01), MAT.planks('dark'), 0, 1.8, sz * 0.17, 0, { rx: sz * 0.55 });
    k.add(rbox(0.74, 0.05, 0.05, 0.01), wd, 0, 1.91, 0);
    for (const [px, c] of [[-0.3, '#d8443a'], [0.3, '#3a8ad8']]) { k.add(cyl(0.008, 0.008, 0.36, 5), wd, px, 2.08, 0); k.add(rbox(0.012, 0.11, 0.17, 0.003), MAT.flat(c, 0.9), px, 2.19, 0.09); }
  });
}

// ---------------------------------------------------------------- build (once)
// L (world metres): { relic {x, z}, seat {x, z, ry}, open [[x, z, ry]], filled [[x, z, ry]], spades [[x, z, ry]] }
export function buildField(game, R, L) {
  if (FW.field || !R?.group) return FW;
  const P = game.physics, gy = (x, z) => P.groundAt(x, z, 40);
  const g = worldGroup(R.group, 'francos dig'), k = new Kit(g);
  // (the holes and heaps of earth in their own group: tests/overlap-sweep.mjs knows them by name, set into the ground)
  const eg = new THREE.Group(); eg.name = 'francos dig earth'; g.add(eg); const ke = new Kit(eg);
  // (SMALLFIX-27-11: the spoil heaped beside an open hole, 22 cm high, is an obstacle as the hole is: he walked into it; the
  //  heap's middle as openHole puts it, at local (0.7, 0.12) turned by ry)
  for (const [x, z, ry] of L.open) { const y = gy(x, z); openHole(ke, x, y, z, ry, tilt(P, x, z, y)); P.add({ type: 'cyl', x, z, r: 0.42, top: y + 0.32, block: true, noStand: true });
    P.add({ type: 'cyl', x: x + Math.cos(ry) * 0.7 + Math.sin(ry) * 0.12, z: z - Math.sin(ry) * 0.7 + Math.cos(ry) * 0.12, r: 0.3, top: y + 0.22, block: true, noStand: true }); }
  // (SMALLFIX-27-11: a filled hole's mound, up to 23 cm over the ground on a slope, is an obstacle too: he walked into it)
  for (const [x, z, ry] of L.filled) { const y = gy(x, z); filledHole(ke, x, y, z, ry, tilt(P, x, z, y, 0.5)); P.add({ type: 'cyl', x, z, r: 0.42, top: y + 0.25, block: true, noStand: true }); }
  ke.flush();
  for (const [x, z, ry] of L.spades) spade(k, x, gy(x, z), z, ry);
  // the seat: on the ground at its middle, its blocks down to the lowest corner
  const S = L.seat, sy = gy(S.x, S.z);
  const low = Math.min(...[[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]].map(([a, b]) => gy(S.x + Math.cos(S.ry) * a + Math.sin(S.ry) * b, S.z - Math.sin(S.ry) * a + Math.cos(S.ry) * b)));
  seat(k, S.x, sy, S.z, S.ry, low);
  P.add({ type: 'box', x: S.x - Math.sin(S.ry) * 0.04, z: S.z - Math.cos(S.ry) * 0.04, hw: 0.68, hd: 0.3, rot: S.ry, top: sy + 0.5, noStand: true, block: true });   // (SMALLFIX-27-11: block: at 0.5 m it was walked through)
  k.flush();
  FW.field = g; FW.seat = { x: S.x, z: S.z, y: sy, ry: S.ry };
  // the relic's box (shown in its hole the moment it is dug up) and the shrine (once the Francos have it back)
  const X = L.relic, xy = gy(X.x, X.z), t = tilt(P, X.x, X.z, xy);
  const bg = new THREE.Group(); bg.name = 'francos relic box'; g.add(bg);
  const bk = new Kit(bg);
  openHole(bk, X.x, xy, X.z, 0.3, t);
  bk.at(X.x, xy, X.z, 0.3, () => {
    bk.add(rbox(0.36, 0.17, 0.26, 0.02), MAT.flat('#5a6e78', 0.5, { metalness: 0.4 }), 0, 0.1, 0, 0, t);
    bk.add(rbox(0.38, 0.03, 0.28, 0.01), MAT.flat('#6c828c', 0.45, { metalness: 0.45 }), -0.02, 0.2, 0.02, 0, { rx: (t.rx || 0) - 0.12, rz: (t.rz || 0) + 0.08 });
    bk.add(rbox(0.16, 0.003, 0.1, 0.002), MAT.flat('#e8dcc0', 0.9), 0, 0.218, 0.04, 0, { rx: (t.rx || 0) - 0.12, rz: (t.rz || 0) + 0.08 });
  });
  bk.flush(); bg.visible = false;
  const boxCol = P.add({ type: 'cyl', x: X.x, z: X.z, r: 0.42, top: xy + 0.32, block: true, noStand: true }); boxCol.enabled = false;
  FW.box = { g: bg, setOn(on) { bg.visible = !!on; boxCol.enabled = !!on; P.update?.(boxCol); } };
  const sg = new THREE.Group(); sg.name = 'francos shrine'; g.add(sg);
  const sk = new Kit(sg);
  const sLow = Math.min(...[[-0.31, -0.31], [0.31, -0.31], [-0.31, 0.31], [0.31, 0.31]].map(([a, b]) => gy(X.x + a, X.z + b)));
  shrine(sk, X.x, xy, X.z, L.shrineRy ?? 0, sLow);
  sk.flush();
  const gp = sg.parent.matrixWorld.clone().invert(), c = clockModel(2.3);
  const at = new THREE.Vector3(X.x, xy + 1.1 + 0.105 * 2.3 + 0.0, X.z).applyMatrix4(gp);
  c.position.copy(at); c.rotation.y = L.shrineRy ?? 0; c.name = 'francos clock'; sg.add(c);
  sg.visible = false;
  const shCol = P.add({ type: 'box', x: X.x, z: X.z, hw: 0.31, hd: 0.31, rot: L.shrineRy ?? 0, top: xy + 1.1, block: true, noStand: true }); shCol.enabled = false;
  FW.shrine = { g: sg, clock: c, y: xy, setOn(on) { sg.visible = !!on; shCol.enabled = !!on; P.update?.(shCol); } };
  return FW;
}

// one of Twinsen's own holes where he dug and found nothing (not saved: a load fills them in)
export function digHole(game, x, z) {
  const g0 = FW.field; if (!g0) return null;
  const P = game.physics, y = P.groundAt(x, z, 40);
  if (FW.holes.length >= HOLES_MAX) { const o = FW.holes.shift(); o.g.parent?.remove(o.g); }
  const g = new THREE.Group(); g.name = 'francos dig earth (his)'; g0.add(g);
  const k = new Kit(g); openHole(k, x, y, z, Math.random() * 6.28, tilt(P, x, z, y)); k.flush();
  const h = { g, x, z, y }; FW.holes.push(h);
  return h;
}
export function clearHoles() { for (const o of FW.holes) o.g.parent?.remove(o.g); FW.holes = []; }
