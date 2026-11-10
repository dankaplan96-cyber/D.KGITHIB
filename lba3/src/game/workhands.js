// NO-AIR (the user, 10.11.2026: "in the whole game, don't do things in the air"). The people's work actions — a stop
// of a round with `tinker`, `potting`, `kneelWork`, `setDown`, `pickup`, `reach`, `touchWater`… (rig.js) — are poses:
// the hands go where the pose puts them, which is on the thing only where the thing happens to be that high and that
// far. Here a working hand is put ON what stands there: the top of the table, bench, crate, sill or rim in front of the
// worker (or the ground, for the actions that go down to it), or the face of the wall, post or door a reach goes to.
//
// What stands there is read from the physics' colliders (the grid the walkers already use: a handful of boxes and
// cylinders per cell, no triangles), once per stop; the arm is then solved for the palm each frame (engine/handik.js),
// on top of the action's own pose, so the action's small working movement goes on, along the surface. Nothing is done
// for a worker nobody sees (the rig's own far / out-of-view posing rate), and nothing where no surface is in reach: the
// pose plays as it was (tests/no-air.mjs lists those: a stop to move, or a thing to put there).
//
// And where nothing is in reach, the hands do not work at all: the action is stood down (Rig.standFor: the person
// stands there, as at a stop with nothing to do, until its round asks for something else). So a hand either works on
// a thing or does not work.
//
// It is a layer over the rig (Rig.contact, called at the end of Rig.update; what it turns is put back before the
// next update), set on every NPC (actors.js): the hero, the enemies and a story scene's own actors never have it.
import * as THREE from 'three';
import { solveHand, restoreJoints, PALM } from '../engine/handik.js';

// kind 'top': palms down on a top in front (lo..hi m over the feet, × the body's scale); face: else against the side of
// what stands there (a loom, a shelf, a machine: taller than a table); ground: else on the ground when the hands come
// within `ground` m of it. kind 'face': the palm against the side of what stands in front.
// hands: which; env: a one-off action's weight over its own time (the contact is its reach, not its way there and back)
const bell = (a, b, c, d) => (t) => (t < a ? 0 : t < b ? (t - a) / (b - a) : t < c ? 1 : t < d ? 1 - (t - c) / (d - c) : 0);
const ACTS = {
  tinker: { kind: 'top', hands: ['R', 'L'], lo: 0.4, hi: 1.35, face: true },
  potting: { kind: 'top', hands: ['R', 'L'], lo: 0.4, hi: 1.35 },
  search: { kind: 'top', hands: ['R', 'L'], lo: 0.3, hi: 1.4, face: true },
  kneelWork: { kind: 'top', hands: ['R', 'L'], lo: 0.04, hi: 0.75, ground: 0.6, face: true },
  setDown: { kind: 'top', hands: ['R'], lo: 0.25, hi: 1.25, env: bell(0.15, 0.45, 0.72, 1.0) },
  pickup: { kind: 'top', hands: ['R'], lo: 0.04, hi: 0.6, ground: 0.5, env: bell(0.1, 0.35, 0.57, 0.8) },
  touchWater: { kind: 'top', hands: ['R'], lo: 0.3, hi: 1.3, dip: 0.05 },
  reach: { kind: 'face', hands: ['R'] },
  tapTurn: { kind: 'face', hands: ['R'] },
  reachHigh: { kind: 'face', hands: ['R'], env: bell(0.2, 0.5, 0.78, 1.2) },
};
export const WORK_ACTS = Object.keys(ACTS);
const REACH = 0.42;      // m: a thing farther than this (level) from where the pose has the hand is not what it works at
const DROP = 0.75;       // m: nor a top this much lower or higher than the pose's hands
const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _f = new THREE.Vector3(), _t = new THREE.Vector3(), _mid = new THREE.Vector3(), _pR = new THREE.Vector3(), _pL = new THREE.Vector3();
const DOWN = new THREE.Vector3(0, -1, 0);

// the nearest point of a collider's outline to (x, z), from inside or outside: { x, z, nx, nz (outward), d (signed: < 0 inside) }
function edge(c, x, z, out) {
  if (c.type === 'cyl') {
    const dx = x - c.x, dz = z - c.z, r = Math.hypot(dx, dz) || 1e-6;
    out.nx = dx / r; out.nz = dz / r; out.x = c.x + out.nx * c.r; out.z = c.z + out.nz * c.r; out.d = r - c.r;
    return out;
  }
  const dx = x - c.x, dz = z - c.z, lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
  const ex = Math.abs(lx) - c.hw, ez = Math.abs(lz) - c.hd;
  let px, pz, nx, nz;
  if (ex > ez) { px = Math.sign(lx || 1) * c.hw; pz = Math.max(-c.hd, Math.min(c.hd, lz)); nx = Math.sign(lx || 1); nz = 0; }
  else { pz = Math.sign(lz || 1) * c.hd; px = Math.max(-c.hw, Math.min(c.hw, lx)); nx = 0; nz = Math.sign(lz || 1); }
  out.d = ex > 0 && ez > 0 ? Math.hypot(ex, ez) : Math.max(ex, ez);
  if (ex > 0 && ez > 0) { px = Math.sign(lx) * c.hw; pz = Math.sign(lz) * c.hd; }
  // (local → world: the inverse of the turn above)
  out.x = c.x + px * c.cos + pz * c.sin; out.z = c.z - px * c.sin + pz * c.cos;
  out.nx = nx * c.cos + nz * c.sin; out.nz = -nx * c.sin + nz * c.cos;
  return out;
}
const _e = { x: 0, z: 0, nx: 0, nz: 0, d: 0 };
// a point (x, z) brought inside a collider's outline by `inset`
function into(c, x, z, inset, out) {
  edge(c, x, z, _e);
  if (_e.d < -inset) { out.x = x; out.z = z; return out; }
  out.x = _e.x - _e.nx * inset; out.z = _e.z - _e.nz * inset;
  return out;
}

// what the action works at from here: null, or { top: y, c } / { face: c }
function find(g, rig, spec, mid, feetY, sc, fx, fz, far = 0.36) {
  const P = g.physics;
  if (spec.kind === 'top') {
    let best = null, bs = Infinity;
    for (let d = -0.15; d <= far; d += 0.05) {
      const x = mid.x + fx * d, z = mid.z + fz * d, L = P.near(x, z);
      for (let i = 0; i < L.length; i++) {
        const c = L[i]; if (!c.enabled || c.stair || c.type === 'ramp') continue;
        const h = c.top - feetY;
        if (h < spec.lo * sc || h > spec.hi * sc || Math.abs(c.top - mid.y) > DROP) continue;
        if (!P._inside(c, x, z, 0.02)) continue;
        const s = Math.abs(d) + Math.abs(c.top - mid.y) * 0.6;
        if (s < bs) { bs = s; best = c; }
      }
    }
    if (best) return { top: best.top - (spec.dip || 0), c: best };
    if (spec.face) { const f = face(P, mid, feetY, sc, fx, fz, false); if (f) return f; }
    if (spec.ground) { const gy = P.groundAt(mid.x, mid.z, feetY + 0.35); if (mid.y - gy < spec.ground && mid.y - gy > -0.1) return { top: gy, c: null }; }
    return null;
  }
  return face(P, mid, feetY, sc, fx, fz, true);
}
// a face: the first solid on the hand's way forward that stands at the hand's height (tops: one lower than the hand
// gives its top)
function face(P, mid, feetY, sc, fx, fz, tops) {
  for (let d = -0.1; d <= 0.5; d += 0.03) {
    const x = mid.x + fx * d, z = mid.z + fz * d, L = P.near(x, z);
    for (let i = 0; i < L.length; i++) {
      const c = L[i]; if (!c.enabled || c.type === 'ramp') continue;
      if (c.bottom > mid.y + 0.05 || !P._inside(c, x, z, 0)) continue;
      if (c.top < mid.y - 0.03) { if (tops && mid.y - c.top < REACH && c.top - feetY > 0.3 * sc) return { top: c.top, c }; continue; }
      return { face: c };
    }
  }
  return null;
}

const _o = { x: 0, z: 0 }, _tmp = [];
// one hand's place on the thing, from where the pose has its palm (nat); back: pulled that far toward the worker (a
// table's far side is out of an arm's reach: its near edge is not). false: nothing of it is near that hand
function place(T, nat, fx, fz, back) {
  if (T.face) {
    edge(T.face, nat.x - fx * back, nat.z - fz * back, _e);
    if (Math.abs(_e.d) > REACH + 0.1 + back) return false;
    _v.set(_e.x + _e.nx * 0.004, Math.max(T.face.bottom + 0.03, Math.min(T.face.top - 0.03, nat.y)), _e.z + _e.nz * 0.004);
    _n.set(-_e.nx, 0, -_e.nz); _f.set(-_e.nx * 0.2, 1, -_e.nz * 0.2);
    return true;
  }
  const x = nat.x - fx * back, z = nat.z - fz * back;
  if (T.c) into(T.c, x, z, 0.045, _o); else { _o.x = x; _o.z = z; }
  if (Math.hypot(_o.x - x, _o.z - z) > REACH) return false;
  _v.set(_o.x, T.top + 0.004, _o.z); _f.set(fx, -0.18, fz); _n.copy(DOWN);
  return true;
}
const palms = (j) => { j.armR.hand.localToWorld(_pR.copy(PALM)); j.armL.hand.localToWorld(_pL.set(-PALM.x, PALM.y, PALM.z)); };
// the hands onto the thing with the chest bent `lean` more and the hands `back` nearer; returns the worst a palm is left off
function reachFor(rig, spec, T, w, lean, back, store, fx, fz) {
  const j = rig.j;
  if (lean) { store.push([j.torso, j.torso.rotation.x, j.torso.rotation.y, j.torso.rotation.z]); j.torso.rotation.x += lean * w; j.torso.updateMatrixWorld(true); palms(j); }
  let worst = 0;
  for (const side of spec.hands) {
    if (!place(T, side === 'R' ? _pR : _pL, fx, fz, back)) { worst = 9; continue; }
    worst = Math.max(worst, solveHand(j['arm' + side], side, { palm: _v, fingers: _f, normal: _n }, w, store));
  }
  return worst;
}
const PLANS = [[0, 0], [0.12, 0.08], [0.24, 0.16], [0.36, 0.24], [0.5, 0.3], [0.64, 0.34]];   // (lean rad, back m): the least that reaches

function touch(g, a, rig, dt) {
  const spec = ACTS[rig.anim], S = a._wh || (a._wh = { key: '', T: null, w: 0, lean: 0, back: 0 });
  if (!spec || !rig.root.visible || (rig.lodN | 0) > 1) { S.w = 0; if (!spec) { S.key = ''; S.T = null; } return; }
  const root = rig.root, p = root.position, yaw = root.rotation.y, sc = root.scale.y || 1, j = rig.j;
  if (!j.armR?.hand || !j.armL?.hand || !j.torso) return;
  root.updateMatrixWorld(true);
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  palms(j);
  // the thing: found again when the worker has moved or turned, or the action changed (not on the hands' own small
  // motion). A one-off action looks from its own reach (its hand is at the worker's side when it starts)
  const key = rig.anim + '|' + Math.round(p.x * 10) + '|' + Math.round(p.z * 10) + '|' + Math.round(yaw * 8);
  const live = spec.env ? spec.env(rig.actionT) : 1;
  let fresh = false;
  if (!spec.env && rig.actionT < 0.5) { S.w = 0; S.key = ''; return; }   // (the pose first: its hands are still on their way)
  if (spec.env) {
    // (a one-off move: before it sets off, is there anything where it will reach? from the body: half a metre ahead)
    if (rig.actionT < 0.12 && S.pre !== key) {
      S.pre = key;
      _mid.set(p.x + fx * 0.5 * sc, p.y + (spec.ground ? 0.3 : 0.95) * sc, p.z + fz * 0.5 * sc);
      if (!find(g, rig, spec, _mid, p.y, sc, fx, fz, 0.12)) {   // (within 0.62 m of the body: what an arm and a bend reach) rig.standFor = rig.anim; S.T = null; S.w = 0; return; }
    }
    if (live <= 0) { S.T = null; S.key = ''; S.w = 0; return; }
    if (!S.T && S.key !== key) { if (live < 0.6) return; fresh = true; }
  } else if (S.key !== key) fresh = true;
  if (fresh) {
    S.key = key; S.w = 0;
    if (spec.hands.length === 1) _mid.copy(_pR); else _mid.copy(_pR).add(_pL).multiplyScalar(0.5);
    S.T = find(g, rig, spec, _mid, p.y, sc, fx, fz);
    if (S.T) {
      // how much of a bend it takes: tried once, on the pose as it is now
      let ok = false;
      for (const [lean, back] of PLANS) {
        _tmp.length = 0;
        const left = reachFor(rig, spec, S.T, 1, lean, back, _tmp, fx, fz);
        restoreJoints(_tmp); j.torso.updateMatrixWorld(true); palms(j);
        if (left < 0.02) { S.lean = lean; S.back = back; ok = true; break; }
      }
      if (!ok) S.T = null;
    }
    // nothing there, or out of reach: the hands do not work on the air — the person stands
    if (!S.T && !spec.env) { rig.standFor = rig.anim; S.key = ''; }
  }
  if (!S.T) { S.w = 0; return; }
  S.w = Math.min(1, S.w + dt * 4);
  const w = S.w * (spec.env ? Math.min(1, live * 1.4) : 1);
  if (w <= 0.001) return;
  reachFor(rig, spec, S.T, w, S.lean, S.back, rig._ov || (rig._ov = []), fx, fz);
}

// Where to stand to work at what a stop faces: the stop moved along its own facing until what stands there is an arm's
// length off (the rounds' stops were set a walking body's berth from their things, 0.8 to 1 m: the hands worked in the
// air in front of them). null: nothing of the action's kind stands on that line within reach of a step or two, or the
// place is taken; the stop stays. (walkers.js Resident.setRound, roomlife.js the cast's and the household's rounds)
const STAND = 0.5;       // m: the body's middle from the thing's near edge (a walker's own radius is 0.45)
export function workSpot(g, x, z, a, anim, { y = null, max = 0.9, r = 0.43 } = {}) {
  const spec = ACTS[anim]; if (!spec || !(a === a)) return null;
  const P = g.physics, fx = Math.sin(a), fz = Math.cos(a), feetY = y ?? P.groundAt(x, z);
  let hit = -1;
  scan: for (let d = 0.15; d <= STAND + max + 0.05; d += 0.03) {
    const px = x + fx * d, pz = z + fz * d, L = P.near(px, pz);
    for (let i = 0; i < L.length; i++) {
      const c = L[i]; if (!c.enabled || c.stair || c.bottom > feetY + 1.4 || c.top < feetY + 0.12) continue;
      if (!P._inside(c, px, pz, 0)) continue;
      const h = c.top - feetY, fits = spec.kind === 'face' ? h > 0.75 : (h >= Math.max(0.3, spec.lo) && h <= spec.hi) || (spec.face && h > spec.hi);
      if (fits) hit = d;
      break scan;   // (the first solid on the line: the thing, or what is in the way of it)
    }
  }
  if (hit < 0) return null;
  let move = Math.min(max, hit - STAND);
  if (move < 0.06) return null;
  for (; move >= 0.06; move -= 0.06) {
    const nx = x + fx * move, nz = z + fz * move;
    if (Math.abs(P.groundAt(nx, nz, feetY + 0.4) - feetY) > 0.2 || P.blockedAt(nx, nz, feetY, r)) continue;
    return { x: nx, z: nz, moved: +move.toFixed(2) };
  }
  return null;
}

// The stops whose thing is not where its collider is (tests/no-air.mjs measured the hands against the drawn triangles:
// a pump inside a wide round collider, a hive, a stall's awning box…): the hands were put on the collider's face, in
// the air beside the thing. Until the thing itself is given a hand's place, the person stands there: 'who@stop'.
// (docs/lba-maturity/no-air.md lists them: each is a stop to move or a prop to give a proper top.)
export const AIR_STOPS = new Set([
]);
export const standsAt = (who, stop) => AIR_STOPS.has(who + '@' + stop);

// set on a person's rig (NPC's constructor)
export function workHands(game, actor) {
  if (!actor.rig?.j?.armR?.hand) return;
  actor.rig._ov = actor.rig._ov || [];
  actor.rig.contact = (rig, dt) => touch(game, actor, rig, dt);
}
