// NO-AIR (the user, 10.11.2026: "in the whole game, don't do things in the air"). The people's work actions — a stop
// of a round with `tinker`, `potting`, `kneelWork`, `setDown`, `pickup`, `reach`, `touchWater`… (rig.js) — are poses:
// the hands go where the pose puts them, which is on the thing only where the thing happens to be that high and that
// far. Here a working hand is put ON what stands there: the top of the table, bench, crate, sill or rim in front of the
// worker (or the ground, for the actions that go down to it), or the face of the wall, post or door a reach goes to.
//
// What stands there is what is DRAWN there: once per stop the triangles of the rigid meshes within arm's reach are
// gathered (nobody's body), and the place of each palm is found on them by a few short rays from where the pose has
// the hands — down for a top, forward for a face — with as little more bend of the chest as reaches it. (Colliders
// were tried first: a collider is a box or a cylinder ROUND the thing — a door set back in its wall, a pump inside a
// wide round collider, a stall under its awning's box — and a palm on a collider's face was in the air beside the
// thing.) The arm is then solved for the palm each frame (engine/handik.js), on top of the action's own pose, so the
// action's small working movement goes on, along the surface. Nothing is done for a worker nobody sees (the rig's own
// far / out-of-view posing rate).
//
// And where nothing is in reach, the hands do not work at all: the action is stood down (Rig.standFor: the person
// stands there, as at a stop with nothing to do, until its round asks for something else). So a hand either works on
// a thing or does not work.
//
// It is a layer over the rig (Rig.contact, called at the end of Rig.update; what it turns is put back before the
// next update), set on every NPC (actors.js): the hero, the enemies and a story scene's own actors never have it.
import * as THREE from 'three';
import { solveHand, restoreJoints, PALM } from '../engine/handik.js';

// kind 'top': palms down on a top under the hands or just before them (lo..hi m over the feet, × the body's scale);
// face: else against the side of what stands there (a loom, a shelf, a machine: taller than a table); ground: the
// ground will do (the actions that go down to it). kind 'face': the palm against the side of what stands in front.
// hands: which; env: a one-off action's weight over its own time (the contact is its reach, not its way there and back)
const bell = (a, b, c, d) => (t) => (t < a ? 0 : t < b ? (t - a) / (b - a) : t < c ? 1 : t < d ? 1 - (t - c) / (d - c) : 0);
const ACTS = {
  tinker: { kind: 'top', hands: ['R', 'L'], lo: 0.4, hi: 1.35, face: true },
  potting: { kind: 'top', hands: ['R', 'L'], lo: 0.4, hi: 1.35 },
  search: { kind: 'top', hands: ['R', 'L'], lo: 0.3, hi: 1.4, face: true },
  kneelWork: { kind: 'top', hands: ['R', 'L'], lo: 0.04, hi: 0.75, ground: true, face: true },
  setDown: { kind: 'top', hands: ['R'], lo: 0.25, hi: 1.25, env: bell(0.15, 0.45, 0.72, 1.0) },
  pickup: { kind: 'top', hands: ['R'], lo: 0.04, hi: 0.6, ground: true, env: bell(0.1, 0.35, 0.57, 0.8) },
  touchWater: { kind: 'top', hands: ['R'], lo: 0.3, hi: 1.3, dip: 0.05 },
  reach: { kind: 'face', hands: ['R'] },
  tapTurn: { kind: 'face', hands: ['R'] },
  use: { kind: 'face', hands: ['R', 'L'] },
  reachHigh: { kind: 'face', hands: ['R'], env: bell(0.2, 0.5, 0.78, 1.2) },
};
export const WORK_ACTS = Object.keys(ACTS);
const DROP = 0.75, RISE = 0.45;   // m: a top this much lower / higher than the pose's hands is not what they work at
const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _f = new THREE.Vector3(), _pR = new THREE.Vector3(), _pL = new THREE.Vector3(), _nR = new THREE.Vector3(), _nL = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0), _T = { palm: _v, fingers: _f, normal: _n };

// ── What is drawn round a stop: the triangles (world space) of the rigid meshes on screen within NEAR of the worker's
// hands, gathered once per stop (one walk over what is visible, one pass over the triangles of the meshes that come
// near); the rays that place the hands then cross a few hundred triangles each.
let NEAR = 1.3;
let TRI = new Float32Array(9 * 4096), NT = 0;
const _got = { a: null, key: '' };
export const probeStats = { n: 0, ms: 0, worstMs: 0, tris: 0, seen: 0, read: 0, readTris: 0 };
const _im = new THREE.Matrix4(), _wm = new THREE.Matrix4(), _inv = new THREE.Matrix4(), _A = new THREE.Vector3(), _c = new THREE.Vector3(), _sph = new THREE.Sphere();
const drawn = (o) => {
  if (!o.isMesh || o.isSkinnedMesh || !o.geometry?.attributes?.position) return false;
  if (o.userData.drawBatch || o.userData.shadowProxy) return false;   // (a batch drawn in its pieces' place: engine/drawbatch.js, shadowcull.js — the pieces themselves are read)
  const m = Array.isArray(o.material) ? o.material[0] : o.material;
  if (!m || m.visible === false) return false;
  if (m.transparent && m.depthWrite === false && (m.opacity ?? 1) < 0.9) return false;   // (a glow, a shadow blob, a light shaft)
  if (m.blending && m.blending !== 1) return false;
  return true;
};
const scaleOf = (e, k) => Math.max(Math.hypot(e[k], e[k + 1], e[k + 2]), Math.hypot(e[k + 4], e[k + 5], e[k + 6]), Math.hypot(e[k + 8], e[k + 9], e[k + 10]));
const CH = 96, _runs = new WeakMap();
// the boxes (the mesh's own space) of a geometry's runs of CH triangles; made again when its vertices change
function runsOf(g, pos, ix, st, off, src, i0, i1) {
  const v = ((pos.isInterleavedBufferAttribute ? pos.data.version : pos.version) | 0) + (g.index ? g.index.version | 0 : 0);
  let C = _runs.get(g);
  if (C && C.v === v && C.i0 === i0 && C.i1 === i1) return C;
  const n = Math.ceil((i1 - i0) / (CH * 3)), box = new Float32Array(n * 6);
  for (let c = 0; c < n; c++) {
    let ax = Infinity, ay = Infinity, az = Infinity, bx = -Infinity, by = -Infinity, bz = -Infinity;
    for (let i = i0 + c * CH * 3, e = Math.min(i1, i + CH * 3); i < e; i++) {
      const k = (ix ? ix[i] : i) * st + off, x = src[k], y = src[k + 1], z = src[k + 2];
      if (x < ax) ax = x; if (x > bx) bx = x; if (y < ay) ay = y; if (y > by) by = y; if (z < az) az = z; if (z > bz) bz = z;
    }
    const q = c * 6; box[q] = ax; box[q + 1] = ay; box[q + 2] = az; box[q + 3] = bx; box[q + 4] = by; box[q + 5] = bz;
  }
  C = { v, i0, i1, box }; _runs.set(g, C);
  return C;
}
// one mesh's triangles within NEAR of _c, under the world matrix M
function addMesh(o, M) {
  const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
  probeStats.read++;
  const e = M.elements;
  const smin = Math.max(1e-6, Math.min(Math.hypot(e[0], e[1], e[2]), Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10])));
  _inv.copy(M).invert(); _A.copy(_c).applyMatrix4(_inv);
  const r = NEAR / smin, bb = g.boundingBox;
  const x0 = _A.x - r, x1 = _A.x + r, y0 = _A.y - r, y1 = _A.y + r, z0 = _A.z - r, z1 = _A.z + r;
  if (bb.min.x > x1 || bb.max.x < x0 || bb.min.y > y1 || bb.max.y < y0 || bb.min.z > z1 || bb.max.z < z0) return;
  const pos = g.attributes.position, ix = g.index ? g.index.array : null;
  const il = pos.isInterleavedBufferAttribute, st = il ? pos.data.stride : 3, off = il ? pos.offset : 0, src = il ? pos.data.array : pos.array;
  const dr = g.drawRange || { start: 0, count: Infinity };
  const n = ix ? g.index.count : pos.count, i0 = Math.max(0, dr.start || 0), i1 = Math.min(n, i0 + (dr.count ?? Infinity));
  // (a big mesh — the ground, a street's merged houses — is read by runs of CH triangles, each with its own box, made once)
  const big = i1 - i0 > CH * 3 * 8, C = big ? runsOf(g, pos, ix, st, off, src, i0, i1) : null, B = C ? C.box : null;
  for (let r0 = i0, c = 0; r0 < i1; r0 += CH * 3, c++) {
    const r1 = Math.min(i1, r0 + CH * 3);
    if (B) { const q = c * 6; if (B[q] > x1 || B[q + 3] < x0 || B[q + 1] > y1 || B[q + 4] < y0 || B[q + 2] > z1 || B[q + 5] < z0) continue; }
    probeStats.readTris += (r1 - r0) / 3;
  for (let i = r0; i + 2 < r1; i += 3) {
    const ia = (ix ? ix[i] : i) * st + off, ib = (ix ? ix[i + 1] : i + 1) * st + off, ic = (ix ? ix[i + 2] : i + 2) * st + off;
    const ax = src[ia], bx = src[ib], cx = src[ic];
    if ((ax > x1 && bx > x1 && cx > x1) || (ax < x0 && bx < x0 && cx < x0)) continue;
    const ay = src[ia + 1], by = src[ib + 1], cy = src[ic + 1];
    if ((ay > y1 && by > y1 && cy > y1) || (ay < y0 && by < y0 && cy < y0)) continue;
    const az = src[ia + 2], bz = src[ib + 2], cz = src[ic + 2];
    if ((az > z1 && bz > z1 && cz > z1) || (az < z0 && bz < z0 && cz < z0)) continue;
    if (NT * 9 + 9 > TRI.length) { if (NT >= 60000) return; const t = new Float32Array(TRI.length * 2); t.set(TRI); TRI = t; }
    const k = NT++ * 9;
    TRI[k] = e[0] * ax + e[4] * ay + e[8] * az + e[12]; TRI[k + 1] = e[1] * ax + e[5] * ay + e[9] * az + e[13]; TRI[k + 2] = e[2] * ax + e[6] * ay + e[10] * az + e[14];
    TRI[k + 3] = e[0] * bx + e[4] * by + e[8] * bz + e[12]; TRI[k + 4] = e[1] * bx + e[5] * by + e[9] * bz + e[13]; TRI[k + 5] = e[2] * bx + e[6] * by + e[10] * bz + e[14];
    TRI[k + 6] = e[0] * cx + e[4] * cy + e[8] * cz + e[12]; TRI[k + 7] = e[1] * cx + e[5] * cy + e[9] * cz + e[13]; TRI[k + 8] = e[2] * cx + e[6] * cy + e[10] * cz + e[14];
  }
  }
}
function walk(o) {
  if (!o.visible || o.userData.rig) return;   // (a body is not a thing a working hand rests on: rig.js marks its root)
  probeStats.seen++;
  if (drawn(o)) {
    const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
    const bs = g.boundingSphere;
    if (o.isInstancedMesh) {
      // (an instance far off is passed by its own place: no matrix turned over for it)
      const ia = o.instanceMatrix.array, reach = (bs.radius + bs.center.length()) * scaleOf(o.matrixWorld.elements, 0);
      for (let i = 0; i < o.count; i++) {
        const k = i * 16;
        _A.set(ia[k + 12], ia[k + 13], ia[k + 14]).applyMatrix4(o.matrixWorld);
        if (_A.distanceTo(_c) > reach * scaleOf(ia, k) + NEAR) continue;
        o.getMatrixAt(i, _im); _wm.multiplyMatrices(o.matrixWorld, _im); addMesh(o, _wm);
      }
    } else {
      _sph.copy(bs).applyMatrix4(o.matrixWorld);
      if (_sph.center.distanceTo(_c) <= _sph.radius + NEAR) addMesh(o, o.matrixWorld);
    }
  }
  const ch = o.children; for (let i = 0; i < ch.length; i++) walk(ch[i]);
}
function gather(g, a, key, x, y, z) {
  if (_got.a === a && _got.key === key) return;
  _got.a = a; _got.key = key; NT = 0;
  const t0 = performance.now();
  _c.set(x, y, z); walk(g.scene);
  const ms = performance.now() - t0; probeStats.n++; probeStats.ms += ms; probeStats.tris += NT; if (ms > probeStats.worstMs) probeStats.worstMs = ms;
}
// the first crossing of the way a→b with what was gathered, as a fraction of the way (2: none). Möller–Trumbore, either
// side of a triangle
function ray(ox, oy, oz, bx, by, bz) {
  const dx = bx - ox, dy = by - oy, dz = bz - oz;
  const x0 = Math.min(ox, bx) - 1e-4, x1 = Math.max(ox, bx) + 1e-4, y0 = Math.min(oy, by) - 1e-4, y1 = Math.max(oy, by) + 1e-4, z0 = Math.min(oz, bz) - 1e-4, z1 = Math.max(oz, bz) + 1e-4;
  let best = 2;
  for (let k = 0, K = NT * 9; k < K; k += 9) {
    const ax = TRI[k], qx = TRI[k + 3], cx = TRI[k + 6];
    if ((ax > x1 && qx > x1 && cx > x1) || (ax < x0 && qx < x0 && cx < x0)) continue;
    const ay = TRI[k + 1], qy = TRI[k + 4], cy = TRI[k + 7];
    if ((ay > y1 && qy > y1 && cy > y1) || (ay < y0 && qy < y0 && cy < y0)) continue;
    const az = TRI[k + 2], qz = TRI[k + 5], cz = TRI[k + 8];
    if ((az > z1 && qz > z1 && cz > z1) || (az < z0 && qz < z0 && cz < z0)) continue;
    const e1x = qx - ax, e1y = qy - ay, e1z = qz - az, e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
    const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
    const det = e1x * px + e1y * py + e1z * pz; if (det > -1e-12 && det < 1e-12) continue;
    const id = 1 / det, tx = ox - ax, ty = oy - ay, tz = oz - az;
    const u = (tx * px + ty * py + tz * pz) * id; if (u < -1e-5 || u > 1.00001) continue;
    const rx = ty * e1z - tz * e1y, ry = tz * e1x - tx * e1z, rz = tx * e1y - ty * e1x;
    const v = (dx * rx + dy * ry + dz * rz) * id; if (v < -1e-5 || u + v > 1.00001) continue;
    const t = (e2x * rx + e2y * ry + e2z * rz) * id;
    if (t >= 0 && t < best) best = t;
  }
  return best;
}

// (tests/no-air.mjs, for a stop where the person stands: what is drawn before it — how far ahead the first face is at
// three heights, and the first top of a table's or a crate's height on the line)
export function lookAhead(g, x, y, z, a, sc = 1) {
  const fx = Math.sin(a), fz = Math.cos(a), was = NEAR; NEAR = 2.4; _got.a = null;
  gather(g, null, '?', x + fx * 0.9, y + 0.9 * sc, z + fz * 0.9); NEAR = was; _got.a = null; _got.key = '';
  const out = { face: [], top: null };
  for (const h of [0.5, 0.85, 1.2]) { const t = ray(x + fx * 0.1, y + h * sc, z + fz * 0.1, x + fx * 2.1, y + h * sc, z + fz * 2.1); out.face.push(t > 1 ? null : +(0.1 + 2 * t).toFixed(2)); }
  for (let d = 0.2; d <= 2.01 && !out.top; d += 0.05) { const t = ray(x + fx * d, y + 1.5 * sc, z + fz * d, x + fx * d, y + 0.25 * sc, z + fz * d); if (t <= 1) out.top = [+d.toFixed(2), +((1.5 - 1.25 * t) * sc).toFixed(2)]; }
  return out;
}

// the top under (x, z) that the action can work at, from where the pose has the palm (natY): its height, or null
function topAt(spec, x, z, natY, feetY, sc) {
  const y0 = natY + RISE, y1 = natY - DROP, t = ray(x, y0, z, x, y1, z);
  if (t > 1) return null;
  const y = y0 + (y1 - y0) * t, h = y - feetY;
  if (h > spec.hi * sc || (h < spec.lo * sc && !spec.ground)) return null;
  return y;
}
const palms = (j) => { j.armR.hand.localToWorld(_pR.copy(PALM)); j.armL.hand.localToWorld(_pL.set(-PALM.x, PALM.y, PALM.z)); };
// one palm's place for this frame, from where the pose has it now (the action's own movement goes on, along the surface)
function aim(P, h, nat, fx, fz, dip) {
  if (P.kind === 'top') { _v.set(nat.x + h.dx, h.y + 0.004 - dip, nat.z + h.dz); _f.set(fx, -0.18, fz); _n.copy(DOWN); return; }
  const x = nat.x + h.dx, z = nat.z + h.dz, k = (h.px - x) * fx + (h.pz - z) * fz - 0.004;
  _v.set(x + fx * k, nat.y + h.dy, z + fz * k); _n.set(fx, 0, fz); _f.set(fx * 0.2, 1, fz * 0.2);
}
const LEANS = [0, 0.2, 0.4, 0.64, 0.85];        // rad more bend of the chest: the least that reaches (the last: bent right over a low crate)
const FWD = [0, 0.1, -0.1, 0.2, -0.2, 0.3, 0.4];   // m along the facing from where the pose has the palms
const UP = [0, 0.12, -0.12, 0.24, -0.24];       // m up and down a face
const _tmp = [], _try = [];
// The hands' places on what is drawn here, tried once on the pose as it is now: { kind, lean, R: {…}, L: {…} } or null
// (S.why says what was missing)
function plan(rig, spec, S, feetY, sc, fx, fz) {
  const j = rig.j, px = rig.root.position.x, pz = rig.root.position.z, two = spec.hands.length > 1, MID = two ? [0, 0.5] : [0];
  const kinds = spec.kind === 'top' ? (spec.face ? ['top', 'face'] : ['top']) : ['face'];
  S.why = 'nothing at the hands';
  let got = null;
  for (let ki = 0; ki < kinds.length && !got; ki++) for (let li = 0; li < LEANS.length && !got; li++) {
    const kind = kinds[ki], lean = LEANS[li];
    _tmp.length = 0;
    if (lean) { _tmp.push([j.torso, j.torso.rotation.x, j.torso.rotation.y, j.torso.rotation.z]); j.torso.rotation.x += lean; j.torso.updateMatrixWorld(true); }
    palms(j); _nR.copy(_pR); _nL.copy(_pL);
    const mx = two ? (_nR.x + _nL.x) / 2 : _nR.x, mz = two ? (_nR.z + _nL.z) / 2 : _nR.z;
    const A = kind === 'top' ? FWD : UP, P = { kind, lean, R: null, L: null };
    for (let ai = 0; ai < A.length && !got; ai++) for (let mi = 0; mi < MID.length && !got; mi++) {
      const e = A[ai], m = MID[mi];
      let ok = true;
      for (const side of spec.hands) {
        const nat = side === 'R' ? _nR : _nL;
        if (kind === 'top') {
          const x = nat.x + fx * e + (mx - nat.x) * m, z = nat.z + fz * e + (mz - nat.z) * m, y = topAt(spec, x, z, nat.y, feetY, sc);
          if (y == null) { ok = false; break; }
          P[side] = { dx: x - nat.x, dz: z - nat.z, y };
        } else {
          const x = nat.x + (mx - nat.x) * m, z = nat.z + (mz - nat.z) * m, y = nat.y + e;
          // (from just before the body: a face nearer than the pose's hand is met too, the arm folds back to it)
          const b = Math.max(0.2, (x - px) * fx + (z - pz) * fz - 0.14 * sc), t = ray(x - fx * b, y, z - fz * b, x + fx * 0.55, y, z + fz * 0.55);
          if (t > 1) { ok = false; break; }
          const d = -b + (b + 0.55) * t;
          P[side] = { dx: x - nat.x, dy: e, dz: z - nat.z, px: x + fx * d, pz: z + fz * d };
        }
      }
      if (!ok) continue;
      S.why = 'out of reach';
      let worst = 0; _try.length = 0;
      for (const side of spec.hands) { aim(P, P[side], side === 'R' ? _nR : _nL, fx, fz, spec.dip || 0); worst = Math.max(worst, solveHand(j['arm' + side], side, _T, 1, _try)); }
      restoreJoints(_try);
      if (worst < 0.02) got = { kind, lean, R: P.R, L: P.L };
    }
    restoreJoints(_tmp); j.torso.updateMatrixWorld(true);
  }
  palms(j);
  return got;
}
// a one-off move, before it sets off: is anything drawn where it will reach?
function ahead(spec, p, sc, fx, fz) {
  if (spec.kind === 'top') {
    if (spec.ground) return true;
    for (let d = 0.3; d <= 0.61; d += 0.1) { const x = p.x + fx * d * sc, z = p.z + fz * d * sc; if (ray(x, p.y + (spec.hi + 0.25) * sc, z, x, p.y + spec.lo * sc, z) <= 1) return true; }
    return false;
  }
  for (let h = 1.2; h <= 1.81; h += 0.3) if (ray(p.x + fx * 0.15, p.y + h * sc, p.z + fz * 0.15, p.x + fx * 0.8 * sc, p.y + h * sc, p.z + fz * 0.8 * sc) <= 1) return true;
  return false;
}
// what the story has changed since a stop was last looked at (a thing put there, or taken away)
const sig = (g) => { const f = g.flags || {}; let n = 0; for (const k in f) if (f[k]) n++; return (f.chapter | 0) * 4096 + n; };

function touch(g, a, rig, dt) {
  const spec = ACTS[rig.anim], S = a._wh || (a._wh = { key: '', P: null, w: 0, pre: '', why: '', sig: -1, plans: new Map() });
  if (!spec || rig.handsFree || !rig.root.visible || (rig.lodN | 0) > 1) { S.w = 0; if (!spec) { S.key = ''; S.pre = ''; S.P = null; } return; }
  const root = rig.root, p = root.position, yaw = root.rotation.y, sc = root.scale.y || 1, j = rig.j;
  if (!j.armR?.hand || !j.armL?.hand || !j.torso) return;
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  // the thing: found again when the worker has moved or turned, or the action changed (not on the hands' own small
  // motion). What was found at a stop (or not found) is kept for the worker's next time there, until the story moves on
  const key = rig.anim + '|' + Math.round(p.x * 10) + '|' + Math.round(p.z * 10) + '|' + Math.round(yaw * 8);
  const live = spec.env ? spec.env(rig.actionT) : 1;
  const known = () => { const s = sig(g); if (s !== S.sig) { S.sig = s; S.plans.clear(); } return S.plans.get(key); };
  const look = () => gather(g, a, key, p.x + fx * 0.45 * sc, p.y + 0.9 * sc, p.z + fz * 0.45 * sc);
  let fresh = false;
  if (!spec.env && rig.actionT < 0.5) { S.w = 0; S.key = ''; return; }   // (the pose first: its hands are still on their way)
  if (spec.env) {
    // (a one-off move: before it sets off, is there anything where it will reach?)
    if (rig.actionT < 0.12 && S.pre !== key) {
      S.pre = key;
      const k = known();
      if (k === null) { rig.standFor = rig.anim; S.P = null; S.w = 0; return; }
      if (k === undefined) { root.updateMatrixWorld(true); look(); if (!ahead(spec, p, sc, fx, fz)) { S.plans.set(key, null); S.why = 'nothing ahead'; rig.standFor = rig.anim; S.P = null; S.w = 0; return; } }
    }
    if (live <= 0) { S.P = null; S.key = ''; S.w = 0; return; }
    if (!S.P && S.key !== key) { if (live < 0.6) return; fresh = true; }
  } else if (S.key !== key) fresh = true;
  root.updateMatrixWorld(true);
  if (fresh) {
    S.key = key; S.w = 0;
    let P = known();
    if (P === undefined) { look(); P = plan(rig, spec, S, p.y, sc, fx, fz); S.plans.set(key, P); }
    S.P = P;
    // nothing there, or out of reach: the hands do not work on the air — the person stands
    if (!P) { rig.standFor = rig.anim; S.key = ''; }
  }
  const P = S.P;
  if (!P) { S.w = 0; return; }
  S.w = Math.min(1, S.w + dt * 4);
  const w = S.w * (spec.env ? Math.min(1, live * 1.4) : 1);
  if (w <= 0.001) return;
  const store = rig._ov || (rig._ov = []);
  if (P.lean) { store.push([j.torso, j.torso.rotation.x, j.torso.rotation.y, j.torso.rotation.z]); j.torso.rotation.x += P.lean * w; j.torso.updateMatrixWorld(true); }
  palms(j);
  for (const side of spec.hands) { aim(P, P[side], side === 'R' ? _pR : _pL, fx, fz, spec.dip || 0); solveHand(j['arm' + side], side, _T, w, store); }
}

// Where to stand to work at what a stop faces: the stop moved along its own facing until what stands there is an arm's
// length off (the rounds' stops were set a walking body's berth from their things, 0.8 to 1 m: the hands worked in the
// air in front of them). null: nothing of the action's kind stands on that line within reach of a step or two, or the
// place is taken; the stop stays. (walkers.js Resident.setRound, roomlife.js the cast's and the household's rounds)
const STAND = 0.5;       // m: the body's middle from the thing's near edge (a walker's own radius is 0.45)
export function workSpot(g, x, z, a, anim, { y = null, max = 0.9, r = 0.43, ok = null } = {}) {
  const spec = ACTS[anim]; if (!spec || !(a === a)) return null;
  const P = g.physics, fx = Math.sin(a), fz = Math.cos(a), feetY = y ?? P.groundAt(x, z), far = STAND + max + 0.05;
  // the first solid on the line (the physics' colliders: what a body cannot stand in): the thing, or what is in the way of it
  let hit = -1, solid = false;
  scan: for (let d = 0.15; d <= far; d += 0.03) {
    const px = x + fx * d, pz = z + fz * d, L = P.near(px, pz);
    for (let i = 0; i < L.length; i++) {
      const c = L[i]; if (!c.enabled || c.stair || c.bottom > feetY + 1.4 || c.top < feetY + 0.12) continue;
      if (!P._inside(c, px, pz, 0)) continue;
      const h = c.top - feetY, fits = spec.kind === 'face' ? h > 0.75 : (h >= Math.max(0.3, spec.lo) && h <= spec.hi) || (spec.face && h > spec.hi);
      if (fits) hit = d;
      solid = true;
      break scan;
    }
  }
  // nothing solid there: what is DRAWN on the line (a thing with no collider of its own) — the first top of the action's
  // height, or (a reach; a loom, a shelf) the first face
  if (!solid) {
    const was = NEAR; NEAR = far / 2 + 0.8; _got.a = _got;
    gather(g, null, '', x + fx * far / 2, feetY + 0.9, z + fz * far / 2); NEAR = was; _got.a = _got;
    if (spec.kind === 'top') {
      const lo = Math.max(0.3, spec.lo);
      for (let d = 0.15; d <= far && hit < 0; d += 0.04) if (ray(x + fx * d, feetY + spec.hi + 0.05, z + fz * d, x + fx * d, feetY + lo, z + fz * d) <= 1) hit = d;
    }
    if (hit < 0 && (spec.kind === 'face' || spec.face)) {
      for (const h of [0.95, 1.25]) { const t = ray(x + fx * 0.12, feetY + h, z + fz * 0.12, x + fx * far, feetY + h, z + fz * far); if (t <= 1) { const d = 0.12 + (far - 0.12) * t; if (hit < 0 || d < hit) hit = d; } }
    }
  }
  if (hit < 0) return null;
  let move = Math.min(max, hit - STAND);
  if (move < 0.06) return null;
  for (; move >= 0.06; move -= 0.06) {
    const nx = x + fx * move, nz = z + fz * move;
    if (Math.abs(P.groundAt(nx, nz, feetY + 0.4) - feetY) > 0.2 || P.blockedAt(nx, nz, feetY, r) || (ok && !ok(nx, nz))) continue;   // (ok: the caller's own test of the place — a walker's: its routes reach it)
    return { x: nx, z: nz, moved: +move.toFixed(2) };
  }
  return null;
}

// Stops named here are stood at whatever is there ('who@stop'): for a stop whose thing a hand should not be put on.
// (Empty: where nothing is in reach the layer above stands the person by itself; tests/no-air.mjs lists those stops.)
export const AIR_STOPS = new Set([
]);
export const standsAt = (who, stop) => AIR_STOPS.has(who + '@' + stop);

// set on a person's rig (NPC's constructor)
export function workHands(game, actor) {
  if (!actor.rig?.j?.armR?.hand) return;
  actor.rig._ov = actor.rig._ov || [];
  actor.rig.contact = (rig, dt) => touch(game, actor, rig, dt);
}
