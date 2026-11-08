// Per-frame work the renderer can skip without changing what is drawn (PERF-2, measured on the street route with
// the free camera; the user's laptop spends ~48 µs of CPU per draw call and the frame is bound by submission).
//
// 1. World matrices of shown objects only. three.js recomputes every object's world matrix every frame, shown or
//    not: of the ~9 500 objects in the scene ~7 000 sit under hidden groups (the rooms and regions not being played,
//    absent actors), and that update was the largest single CPU cost of a frame. updateShownWorld() runs the same
//    update with each hidden subtree's children set aside, so they are not visited; a subtree shown again is
//    recomputed in full on its first frame (it is flagged), before it is drawn. Anything that reads a hidden
//    object's position goes through getWorldPosition / updateWorldMatrix (which update it themselves).
// 2. Actors of other areas. The actors live under the scene, not under their room or region, so the people and
//    mites of rooms 1 km away and of regions 5–7 km away were drawn from Citadel whenever the camera faced them
//    (their skinned bodies are never frustum-culled): up to 60 calls on the street. An actor further from the
//    camera than the fog's end (where it is drawn in the fog's colour only) and 250 m is left out of that frame's
//    render, its own `visible` flag restored right after. Its simulation is untouched.
//    (FarCull)
//    PERF-HIGH: also an actor wholly outside the view. The characters' skinned bodies are never frustum-culled by three
//    (assemble() in sculpt.js: a skinned body's bind-pose bounds don't follow its animation), so everyone within 250 m
//    was drawn wherever the camera looked: behind it, off to the side. An actor whose bounds (its rig's box at first
//    sight, grown by a quarter and 0.5 m: arms out, a carried basket) are outside the camera's frustum is left out of
//    that frame's render like a far one. Actors whose rig casts a sun shadow (a dog, the hero is not in these lists) are
//    left to three: their shadow may fall into the view. The same pixels; one draw fewer per body (and its face parts'
//    tests) for each person out of view.
// 3. Blob shadows. Every actor, the magic ball and a few enemies lay a soft round shadow on the ground: one
//    transparent draw each, all with the same geometry and material. BlobBatch draws the shown ones in a single
//    instanced call for the frame (same matrices, same material, same render order: blobs are black, so their
//    overlaps blend the same in any order), the originals hidden for the frame and shown again right after.
import * as THREE from 'three';
import { PLANT_VIEW } from './rig.js';
const NONE = Object.freeze([]);

// PERF-CPU: the same update without recomputing what has not changed. three recomposes every shown object's local matrix
// from its position, rotation and scale and multiplies it into its parent's world matrix every frame (scene's own
// matrixAutoUpdate forces the whole tree), ~2 200 objects on Citadel's street of which a few hundred move (people,
// their limbs, the ball, a mill). The game moves objects only through position / rotation (quaternion) / scale (no
// code of ours writes .matrix or .matrixWorld: PERF_CPU.md §2), so an object whose ten numbers, parent and parent's
// world matrix are what they were at its last update has the world matrix it had: it is left as it is. One that
// changed is recomposed and multiplied exactly as three does, and its subtree is forced, as three forces it. Objects
// with their own updateMatrixWorld (cameras, skinned meshes, audio) go through it, as before. The hidden subtrees are
// skipped as before; one shown again is recomputed in full on its first frame. `o.__mwF` is the frame number of the
// object's last recompute here (drawbatch.js uses it to know which pieces may have moved). Same matrices, same pixels.
const BASE_UMW = THREE.Object3D.prototype.updateMatrixWorld, SKIN_UMW = THREE.SkinnedMesh.prototype.updateMatrixWorld;
// (a skinned body's own step after its world matrix — three's SkinnedMesh.updateMatrixWorld — is done here too, so its
//  bones, its children, take the cached path: the bind matrix's inverse follows the world matrix when attached)
const ownUMW = (o) => o.updateMatrixWorld !== BASE_UMW && o.updateMatrixWorld !== SKIN_UMW;
// (MW.cached false: three's own update of the shown objects, as before — the A/B switch; MW.ok: this frame's matrices
//  came from the update below, so `__mwF` and `__visF` are this frame's)
// (PERF-SUBMIT: `casters`, the frame's shown casters' subtrees (above), valid while `castersF` is this frame's; `walk`:
//  off gives three's whole-scene walk in the live shadow pass, the A/B switch)
// (CPU-WALK: `frozen` off gives PERF-CPU's walk of every shown object, the A/B switch (`?nofreeze`); `epoch` moves when
//  an update ran without the frozen subtrees' checks, which then are dropped; `check`: `?walkcheck`'s counts, below)
const QS = typeof location !== 'undefined' ? location.search : '';
export const MW = { cached: true, frame: 0, ok: false, casters: [], castersF: -1, walk: true, frozen: !(/[?&]nofreeze/.test(QS) || globalThis.__nofreeze), epoch: 0,
  check: /[?&]walkcheck/.test(QS) || globalThis.__walkcheck ? { frames: 0, compared: 0, bad: 0, casters: 0, castersBad: 0, pieces: 0, piecesBad: 0, samples: [] } : null };
const _mwT = new THREE.Matrix4();
// PERF-SUBMIT: `col` (the shown-world update only): the frame's shadow casters are listed on the way — each shown object
// that may cast (a mesh, line or points with castShadow) and is not under one already listed, in three's own walk order;
// and every object with its own matrix update (whose subtree this walk leaves to three). shadowcache.js's live shadow
// pass walks these subtrees instead of the whole scene (~1 300 objects on the street, ~60 of them casters): the same
// objects, the same tests, the same draws in the same order.
const mayCast = (k) => k.castShadow === true && (k.isMesh === true || k.isLine === true || k.isPoints === true);
function shownTree(o, force, F, S, all = false, col = null) {
  if (ownUMW(o)) { o.updateMatrixWorld(force); o.__mwF = F; S.own++; return; }
  // changed: recompute and force the subtree (as three); check: recompute, force only if the value differs (a matrix
  // recomposed meanwhile by three's updateWorldMatrix — getWorldPosition and the like flag every parent up to the scene)
  let changed = force, check = false;
  const changedIn = force;
  if (o.matrixAutoUpdate) {
    const p = o.position, q = o.quaternion, s = o.scale;
    let c = o.__trs;
    if (c === undefined || c[0] !== p.x || c[1] !== p.y || c[2] !== p.z || c[3] !== q._x || c[4] !== q._y || c[5] !== q._z || c[6] !== q._w || c[7] !== s.x || c[8] !== s.y || c[9] !== s.z) {
      if (c === undefined) c = o.__trs = new Float64Array(10);
      c[0] = p.x; c[1] = p.y; c[2] = p.z; c[3] = q._x; c[4] = q._y; c[5] = q._z; c[6] = q._w; c[7] = s.x; c[8] = s.y; c[9] = s.z;
      o.matrix.compose(p, q, s); changed = true; S.composed++;
    } else if (o.matrixWorldNeedsUpdate) { o.matrix.compose(p, q, s); check = true; }
  } else if (o.matrixWorldNeedsUpdate) changed = true;
  const par = o.parent;
  if (o.__mwP !== par) { o.__mwP = par; changed = true; }
  if (changed || check) {
    if (o.matrixWorldAutoUpdate === true) {
      const W = changed ? o.matrixWorld : _mwT;
      if (par === null) W.copy(o.matrix); else W.multiplyMatrices(par.matrixWorld, o.matrix);
      if (changed || !W.equals(o.matrixWorld)) { if (!changed) o.matrixWorld.copy(W); force = true; o.__mwF = F; S.world++; if (S.why && !changedIn) S.why.push(o); }
    } else force = true;
    o.matrixWorldNeedsUpdate = false;
  }
  if (o.isSkinnedMesh) {
    if (o.bindMode === 'attached') { if (o.__mwF === F || o.__bm !== o.matrixWorld) { o.__bm = o.matrixWorld; o.bindMatrixInverse.copy(o.matrixWorld).invert(); } }
    else { o.__bm = null; if (o.bindMode === 'detached') o.bindMatrixInverse.copy(o.bindMatrix).invert(); else console.warn('THREE.SkinnedMesh: Unrecognized bindMode: ' + o.bindMode); }
  }
  S.visited++;
  const c = o.children;
  for (let i = 0, n = c.length; i < n; i++) {
    const k = c[i];
    if (k.visible || all) {
      if (k.visible) k.__visF = F;   // (reached through shown parents in this frame's update: drawbatch.js)
      // (shown again since its last frame here: everything under it is recomputed, as before)
      let kc = col;
      if (col !== null && (mayCast(k) || ownUMW(k))) { col.push(k); kc = null; }
      if (k.__hid === true) { k.__hid = false; shownTree(k, true, F, S, all, kc); } else shownTree(k, force, F, S, all, kc);
    } else {
      // (hidden: itself kept up to date, its subtree left until it is shown again)
      if (k.children.length) k.__hid = true;
      const kids = k.children; k.children = NONE;
      try { if (ownUMW(k)) k.updateMatrixWorld(force); else shownTree(k, force, F, S); } finally { k.children = kids; }
    }
  }
}

// CPU-WALK: frozen subtrees. The update above still visits every shown object every frame to find the few that changed:
// on Citadel's street ~1 800 (Follow camera, Medium), ~1 300 of them scenery that never moves (the laptop's profile:
// ~2 ms a frame in shownTree, diagnose-2026-10-31). A subtree in which nothing has changed for FREEZE_N updates — no
// position, rotation or scale, no parent, no visibility, no recomputed world matrix, no object with its own matrix
// update (a camera, audio) or a skinned body — is FROZEN: its parent keeps a record of it (`Frozen`, one per parent, a
// "range" per frozen child: the child and everything under it through shown objects, in walk order), and from then on
// the walk does not go into it. Instead the record is checked each update in one flat loop: each object's visibility
// and its ten numbers against a copy (the vectors held directly: no recursion, no stores), and three's own
// `matrixWorldNeedsUpdate` flag (getWorldPosition and the like recompose the matrices of every parent up to the scene:
// such a world matrix is recomputed and compared, exactly as the walk's check does; one that differs ends the range).
// Anything that differs ends that child's range at once and the walk goes into it in the same update, as before;
// adding or removing a child anywhere in a range ends it too (Object3D.add / remove / attach, wrapped below: the only
// ways the game changes the tree — no code of ours writes `children` or `parent` itself). So nothing relies on the
// writers marking what they move: the same tests as the walk's, without the walk. The ranges also give what the walk
// gave on the way: the shown casters in walk order (PERF-SUBMIT's list: each range keeps its shown drawables with where
// their subtrees end, and lists those casting now) and, for drawbatch.js, `__frzBy`: the range an object is in, whose
// `okF` is this update's frame when it was checked unchanged (the piece's world matrix and its parents' visibility as
// they were when it was last checked in full). Same matrices, same lists, same pixels: `?walkcheck` compares every
// update's world matrices, caster list and draw-batch pieces with a from-scratch reference. `?nofreeze` (MW.frozen =
// false) is PERF-CPU's walk, the A/B switch.
const FREEZE_N = 30;
const P3 = THREE.Object3D.prototype;
P3.__frz = undefined; P3.__frzIn = undefined; P3.__frzBy = undefined;   // (absent until set: the same lookups everywhere)
const _cand = [];
class Frozen {
  constructor(owner) {
    this.owner = owner; this.epoch = MW.epoch; this.ranges = []; this.alive = 0; this.dead = 0;
    this.O = []; this.P = []; this.Q = []; this.S = []; this.V = []; this.C = new Float64Array(160); this.D = []; this.DE = [];
  }
  // k (a child of the owner, quiet for FREEZE_N updates) and everything under it through shown objects, as one range
  add(k, F) {
    const R = { Z: this, k, i0: this.O.length, i1: 0, d0: this.D.length, d1: 0, okF: F, alive: true, vis: k.visible === true, n: 0 };
    const O = this.O, P = this.P, Q = this.Q, S = this.S, V = this.V, D = this.D, DE = this.DE;
    const put = (x) => {
      const Zx = x.__frz; if (Zx !== undefined) Zx.killAll();   // (a record under it: taken into this range)
      x.__frzBy = R; if (MW.check) x.__frzF = MW.frame;
      const i = O.length; O.push(x); P.push(x.position); Q.push(x.quaternion); S.push(x.scale); V.push(x.visible === true);
      if (this.C.length < (i + 1) * 10) { const C = new Float64Array(this.C.length * 2); C.set(this.C); this.C = C; }
      const C = this.C, j = i * 10, p = x.position, q = x.quaternion, s = x.scale;
      C[j] = p.x; C[j + 1] = p.y; C[j + 2] = p.z; C[j + 3] = q._x; C[j + 4] = q._y; C[j + 5] = q._z; C[j + 6] = q._w; C[j + 7] = s.x; C[j + 8] = s.y; C[j + 9] = s.z;
      if (x.visible !== true) return;   // (hidden: itself only, as the walk keeps it)
      let di = -1;
      if (x.isMesh === true || x.isLine === true || x.isPoints === true) { di = D.length; D.push(x); DE.push(0); }
      const c = x.children; for (let m = 0; m < c.length; m++) put(c[m]);
      if (di >= 0) DE[di] = D.length;
    };
    put(k);
    k.__frzIn = R; R.i1 = O.length; R.d1 = D.length; R.n = R.i1 - R.i0;
    this.ranges.push(R); this.alive++;
    return R;
  }
  kill(R) {
    if (!R.alive) return;
    R.alive = false; this.alive--; this.dead += R.n;
    if (R.k.__frzIn === R) R.k.__frzIn = undefined;
    const O = this.O; for (let i = R.i0; i < R.i1; i++) if (O[i].__frzBy === R) { O[i].__frzBy = undefined; if (MW.check) O[i].__thawF = MW.frame; }
    // (a hidden child shown again: its subtree recomputed in full, as the walk does — its hidden frames set this)
    if (!R.vis && R.k.children.length) R.k.__hid = true;
    _stats.thaw++;
    // (the last range ended: the record is dropped, and lets go of what it held — a removed object is not kept alive)
    if (this.alive === 0) { if (this.owner.__frz === this) this.owner.__frz = undefined; this.ranges.length = 0; this.O.length = this.P.length = this.Q.length = this.S.length = this.V.length = this.D.length = this.DE.length = 0; this.dead = 0; }
  }
  killAll() { for (const R of this.ranges) this.kill(R); if (this.owner.__frz === this) this.owner.__frz = undefined; }
  // every live range checked against its copy; one that differs ends (its child is walked in this update)
  poll(F, S) {
    if (this.epoch !== MW.epoch) { this.killAll(); return; }
    const O = this.O, P = this.P, Q = this.Q, Sc = this.S, V = this.V, C = this.C, L = this.ranges;
    for (let r = 0; r < L.length; r++) {
      const R = L[r];
      if (!R.alive) continue;
      let ok = true;
      for (let i = R.i0, j = R.i0 * 10; i < R.i1; i++, j += 10) {
        const o = O[i];
        if (o.visible !== V[i]) { ok = false; break; }
        const p = P[i], q = Q[i], s = Sc[i];
        if (p.x !== C[j] || p.y !== C[j + 1] || p.z !== C[j + 2] || q._x !== C[j + 3] || q._y !== C[j + 4] || q._z !== C[j + 5] || q._w !== C[j + 6] || s.x !== C[j + 7] || s.y !== C[j + 8] || s.z !== C[j + 9]) { ok = false; break; }
        if (o.matrixWorldNeedsUpdate === true) {
          // (the walk's check: recomposed by three meanwhile — recomputed, kept only if it is the same)
          if (o.matrixAutoUpdate !== true || o.parent === null) { ok = false; break; }
          o.matrix.compose(p, q, s); _mwT.multiplyMatrices(o.parent.matrixWorld, o.matrix);
          if (!_mwT.equals(o.matrixWorld)) { ok = false; break; }
          o.matrixWorldNeedsUpdate = false;
        }
      }
      S.polled += R.n;
      if (ok) R.okF = F; else this.kill(R);
    }
    if (this.dead > 512 && this.dead > 2 * (O.length - this.dead)) this.compact();
  }
  // a range's shown casters, in walk order: as the walk lists them (a caster's own subtree is three's to walk)
  casters(R, col) {
    const D = this.D, DE = this.DE;
    for (let i = R.d0; i < R.d1;) { const x = D[i]; if (x.castShadow === true) { col.push(x); i = DE[i]; } else i++; }
  }
  // the live ranges' entries packed again (after many ended)
  compact() {
    const O = [], P = [], Q = [], S = [], V = [], D = [], DE = [], C = new Float64Array(Math.max(160, (this.O.length - this.dead) * 10));
    const live = [];
    for (const R of this.ranges) {
      if (!R.alive) continue;
      const i0 = O.length, d0 = D.length;
      for (let i = R.i0; i < R.i1; i++) { O.push(this.O[i]); P.push(this.P[i]); Q.push(this.Q[i]); S.push(this.S[i]); V.push(this.V[i]); C.set(this.C.subarray(i * 10, i * 10 + 10), (O.length - 1) * 10); }
      for (let d = R.d0; d < R.d1; d++) { D.push(this.D[d]); DE.push(this.DE[d] - R.d0 + d0); }
      R.i0 = i0; R.i1 = O.length; R.d0 = d0; R.d1 = D.length;
      live.push(R);
    }
    Object.assign(this, { O, P, Q, S, V, C, D, DE, ranges: live, dead: 0 });
  }
}
// (the tree changed in or under a range — a child added or removed there, or the range's own child taken away: it ends)
function frzTouch(x) {
  for (let y = x; y !== null && y !== undefined; y = y.parent) { const R = y.__frzBy; if (R !== undefined) { R.Z.kill(R); return; } }
}
{
  const ADD = P3.add, REM = P3.remove;
  P3.add = function (object) {
    if (arguments.length > 1) return ADD.apply(this, arguments);
    const r = ADD.call(this, object);
    frzTouch(this); if (object && object.__frzBy !== undefined) frzTouch(object);
    return r;
  };
  P3.remove = function (object) {
    if (arguments.length > 1) return REM.apply(this, arguments);
    if (object && object.__frzBy !== undefined) frzTouch(object);
    const r = REM.call(this, object);
    frzTouch(this);
    return r;
  };
  // (three's attach() puts the child in `children` itself, without add(); it leaves its old parent through remove())
  const ATT = P3.attach;
  P3.attach = function (object) { const r = ATT.call(this, object); frzTouch(this); return r; };
}
const _stats = { thaw: 0, freeze: 0 };
// the update with frozen subtrees (MW.frozen): shownTree's work for each object it visits, in the same order, and it
// returns whether nothing about the object or under it changed in this update (its parent counts the quiet updates)
function shownTreeF(o, force, F, S, all = false, col = null) {
  if (ownUMW(o)) { o.updateMatrixWorld(force); o.__mwF = F; S.own++; return false; }
  let changed = force, check = false, still = !force;
  const changedIn = force;
  if (o.matrixAutoUpdate) {
    const p = o.position, q = o.quaternion, s = o.scale;
    let c = o.__trs;
    if (c === undefined || c[0] !== p.x || c[1] !== p.y || c[2] !== p.z || c[3] !== q._x || c[4] !== q._y || c[5] !== q._z || c[6] !== q._w || c[7] !== s.x || c[8] !== s.y || c[9] !== s.z) {
      if (c === undefined) c = o.__trs = new Float64Array(10);
      c[0] = p.x; c[1] = p.y; c[2] = p.z; c[3] = q._x; c[4] = q._y; c[5] = q._z; c[6] = q._w; c[7] = s.x; c[8] = s.y; c[9] = s.z;
      o.matrix.compose(p, q, s); changed = true; still = false; S.composed++;
    } else if (o.matrixWorldNeedsUpdate) { o.matrix.compose(p, q, s); check = true; }
  } else if (o.matrixWorldNeedsUpdate) { changed = true; still = false; }
  const par = o.parent;
  if (o.__mwP !== par) { o.__mwP = par; changed = true; still = false; }
  if (changed || check) {
    if (o.matrixWorldAutoUpdate === true) {
      const W = changed ? o.matrixWorld : _mwT;
      if (par === null) W.copy(o.matrix); else W.multiplyMatrices(par.matrixWorld, o.matrix);
      if (changed || !W.equals(o.matrixWorld)) { if (!changed) o.matrixWorld.copy(W); force = true; still = false; o.__mwF = F; S.world++; if (S.why && !changedIn) S.why.push(o); }
    } else force = true;
    o.matrixWorldNeedsUpdate = false;
  }
  if (o.matrixWorldAutoUpdate !== true) still = false;
  if (o.isSkinnedMesh) {
    still = false;
    if (o.bindMode === 'attached') { if (o.__mwF === F || o.__bm !== o.matrixWorld) { o.__bm = o.matrixWorld; o.bindMatrixInverse.copy(o.matrixWorld).invert(); } }
    else { o.__bm = null; if (o.bindMode === 'detached') o.bindMatrixInverse.copy(o.bindMatrix).invert(); else console.warn('THREE.SkinnedMesh: Unrecognized bindMode: ' + o.bindMode); }
  }
  S.visited++;
  const c = o.children;
  if (c === NONE) return still;   // (hidden: its subtree set aside, as in shownTree; a record under it is not checked)
  let Z = o.__frz;
  if (Z !== undefined) {
    // (its own world matrix changed, or everything is asked for: what is frozen under it is walked again, forced)
    if (force || all || !MW.frozen) { Z.killAll(); Z = undefined; }
    else { Z.poll(F, S); if (o.__frz !== Z) Z = undefined; }
  }
  let quiet = true;
  const c0 = _cand.length;
  for (let i = 0, n = c.length; i < n; i++) {
    const k = c[i];
    if (Z !== undefined) {
      const R = k.__frzIn;
      if (R !== undefined && R.Z === Z && R.okF === F) { if (R.vis && col !== null) Z.casters(R, col); S.frozen += R.n; continue; }
    }
    let kq;
    if (k.visible || all) {
      const was = k.__visF === F - 1;
      if (k.visible) k.__visF = F;   // (reached through shown parents in this frame's update: drawbatch.js)
      let kc = col;
      if (col !== null && (mayCast(k) || ownUMW(k))) { col.push(k); kc = null; }
      if (k.__hid === true) { k.__hid = false; shownTreeF(k, true, F, S, all, kc); kq = false; } else kq = shownTreeF(k, force, F, S, all, kc) && was && k.visible;
    } else {
      // (hidden: itself kept up to date, its subtree left until it is shown again)
      if (k.children.length) k.__hid = true;
      const kids = k.children; k.children = NONE;
      try { if (ownUMW(k)) { k.updateMatrixWorld(force); kq = false; } else kq = shownTreeF(k, force, F, S) && k.__visF !== F - 1; } finally { k.children = kids; }
    }
    if (kq) { const q = (k.__q = (k.__q || 0) + 1); if (q >= FREEZE_N && MW.frozen && !all) _cand.push(k); }
    else { if (k.__q !== 0) k.__q = 0; quiet = false; }
  }
  quiet = quiet && still;
  if (_cand.length > c0) {
    // (frozen here unless this object is about to be frozen whole by its own parent)
    if (!(quiet && o.parent !== null && (o.__q || 0) + 1 >= FREEZE_N)) {
      if (Z === undefined) Z = o.__frz = new Frozen(o);
      for (let j = c0; j < _cand.length; j++) { Z.add(_cand[j], F); _stats.freeze++; }
    }
    _cand.length = c0;
  }
  return quiet;
}

// (an actor's rig brought up to date after a frame that left it out of the render: FarCull.restore; every part, shown
//  or not, as updateMatrixWorld(true) did, but only what changed is recomputed)
// (force: its parts may be stale — it was hidden before, or its own matrix changed this frame — so all are recomputed)
const _S0 = { visited: 0, composed: 0, world: 0, own: 0, frozen: 0, polled: 0 };
export function updateTree(o, force = true) {
  if (!MW.cached) { o.updateMatrixWorld(true); return; }
  o.__hid = false;
  if (MW.frozen) shownTreeF(o, force, MW.frame, _S0, true); else shownTree(o, force, MW.frame, _S0, true);
}

export function updateShownWorld(scene, state) {
  if (MW.cached) {
    const F = (MW.frame = ++state.frame), S = (state.stats ??= { visited: 0, composed: 0, world: 0, own: 0, frozen: 0, polled: 0, ranges: 0, freeze: 0, thaw: 0 });
    S.visited = S.composed = S.world = S.own = S.frozen = S.polled = 0;
    // (switched from the old path: its hidden list's subtrees are recomputed when shown, as there)
    for (const o of state.prev) o.__hid = true;
    state.prev.length = 0;
    scene.__visF = F;
    const col = MW.casters; col.length = 0;
    // (CPU-WALK: an update without the frozen subtrees' checks ends them all)
    if (!MW.frozen || state.fz !== F - 1) MW.epoch++;
    if (MW.frozen) {
      state.fz = F; _stats.thaw = _stats.freeze = 0;
      shownTreeF(scene, false, F, S, false, MW.walk ? col : null);
      S.thaw = _stats.thaw; S.freeze = _stats.freeze;
    } else shownTree(scene, false, F, S, false, MW.walk ? col : null);
    MW.castersF = MW.walk ? F : -1;
    MW.ok = true;
    if (MW.check) walkCheck(scene, MW.check, F);
    return;
  }
  MW.epoch++;
  updateShownWorldOld(scene, state);
}

// CPU-WALK `?walkcheck` (or MW.check = { … } set by a probe): after each update, every object reached through shown
// parents against three's formula from scratch (the parent's expected world × compose(position, quaternion, scale), or
// × .matrix where matrixAutoUpdate is off; an attached skinned body's bind-matrix inverse too), and the caster list
// against the walk's rule applied to the whole tree from scratch. Mismatches are counted and the first few printed
// (console.error, "WALKCHECK": a regression suite run with WALKCHECK=1 fails on one). drawbatch.js adds its pieces
// (DrawBatch.update). A debugging aid: it costs a whole walk a frame. `?walkcheck`, or window.__walkcheck before load.
const _wc = [], _wcM = new THREE.Matrix4();
function walkCheck(scene, K, F) {
  K.frames++;
  let pi = 0; const tmp = () => (_wc[pi] ??= new THREE.Matrix4(), _wc[pi++]);
  const path = (o) => { const p = []; for (let x = o; x; x = x.parent) p.push(x.name || x.type); return p.slice(0, 5).join('<'); };
  const bad = (what) => { if (K.samples.length < 20) { K.samples.push(what + ' @' + F); console.error('WALKCHECK ' + what + ' @' + F); } };
  const ref = [];
  const walk = (o, W, cast) => {
    const c = o.children;
    for (let i = 0; i < c.length; i++) {
      const k = c[i];
      if (!k.visible) continue;
      let kc = cast;
      if (cast && (mayCast(k) || ownUMW(k))) { ref.push(k); kc = false; }
      const mark = pi;
      const L = k.matrixAutoUpdate ? tmp().compose(k.position, k.quaternion, k.scale) : k.matrix;
      const E = tmp().multiplyMatrices(W, L);
      if (k.matrixWorldAutoUpdate) {
        K.compared++;
        const e = E.elements, f = k.matrixWorld.elements;
        let d = 0; for (let j = 0; j < 16; j++) if (e[j] !== f[j] && !(e[j] !== e[j] && f[j] !== f[j])) { d = Math.max(d, Math.abs(e[j] - f[j]) || 1); }
        if (d) {
        K.bad++;
        const c = k.__trs, p = k.position, q = k.quaternion, sc = k.scale, same = !!c && c[0] === p.x && c[1] === p.y && c[2] === p.z && c[3] === q._x && c[4] === q._y && c[5] === q._z && c[6] === q._w && c[7] === sc.x && c[8] === sc.y && c[9] === sc.z;
        bad(`matrix ${path(k)} \u0394${d.toExponential(2)}${k.__frzBy ? ' (frozen)' : ''} [walked ${k.__visF === F} mwF ${k.__mwF} parent mwF ${k.parent?.__mwF} trs cached ${same} q ${k.__q} hid ${k.__hid} parent rec ${!!k.parent?.__frz} matrix=compose ${_wcM.compose(k.position, k.quaternion, k.scale).equals(k.matrix)} frozen ${k.__frzF}-${k.__thawF} parent frozen ${k.parent?.__frzF}-${k.parent?.__thawF} mwnu ${k.matrixWorldNeedsUpdate}]`);
      }
        if (k.isSkinnedMesh && k.bindMode === 'attached') {
          const I = tmp().copy(E).invert(), a = I.elements, b = k.bindMatrixInverse.elements;
          let di = 0; for (let j = 0; j < 16; j++) if (a[j] !== b[j] && !(a[j] !== a[j] && b[j] !== b[j])) di = Math.max(di, Math.abs(a[j] - b[j]) || 1);
          if (di) { K.bad++; bad(`bindMatrixInverse ${path(k)} Δ${di.toExponential(2)}`); }
        }
        walk(k, E, kc);
      } else walk(k, k.matrixWorld, kc);
      pi = mark;
    }
  };
  const S = scene.matrixAutoUpdate ? tmp().compose(scene.position, scene.quaternion, scene.scale) : scene.matrix;
  walk(scene, S, MW.walk);
  if (MW.walk) {
    const L = MW.casters; K.casters += ref.length;
    let same = L.length === ref.length; for (let i = 0; same && i < L.length; i++) if (L[i] !== ref[i]) same = false;
    if (!same) {
      K.castersBad++;
      let i = 0; while (i < L.length && i < ref.length && L[i] === ref[i]) i++;
      bad(`casters ${L.length} listed, ${ref.length} by the rule; first difference at ${i}: ${L[i] ? path(L[i]) : '-'} / ${ref[i] ? path(ref[i]) : '-'}`);
    }
  }
}
export function walkCheckNote(what) { const K = MW.check; if (K && K.samples.length < 20) { K.samples.push(what + ' @' + MW.frame); console.error('WALKCHECK ' + what + ' @' + MW.frame); } }

function updateShownWorldOld(scene, state) {
  MW.ok = false;
  const hidden = state.hidden, prev = state.prev, stamp = ++state.frame;
  hidden.length = 0;
  const walk = (o) => {
    const c = o.children;
    for (let i = 0; i < c.length; i++) {
      const k = c[i];
      if (k.visible) { if (k.children.length) walk(k); }
      else if (k.children.length) { hidden.push(k); k.__hidAt = stamp; }
    }
  };
  walk(scene);
  // shown again since the last frame: recompute it and everything under it
  for (const o of prev) if (o.__hidAt !== stamp) o.matrixWorldNeedsUpdate = true;
  for (const o of hidden) { o.__kids = o.children; o.children = NONE; }
  try { scene.updateMatrixWorld(); } finally { for (const o of hidden) { o.children = o.__kids; o.__kids = null; } }
  state.prev = hidden; state.hidden = prev;
}

// An actor's small rigid parts (eyes, buttons, a brooch: one draw each) are also left out of a frame while they are
// under SUB_PX pixels in radius on screen (an eye 3 cm across beyond ~30 m): the same specks either way.
const SUB_PX = 0.75, PART_R = 0.2;
const _pv = new THREE.Vector3(), _fb = new THREE.Box3(), _fs = new THREE.Sphere(), _ff = new THREE.Frustum(), _fm = new THREE.Matrix4(), _fw = new THREE.Vector3();
export class FarCull {
  // actors(): lists of the actors that may be drawn; fog: the scene's THREE.Fog
  // anim (PERF-CPU): the people's animation rate — every `off`-th frame out of the view, every `far`-th beyond the fog,
  // and with `eco` (Auto's lowest profiles) every `inView`-th frame in the view beyond `near` m
  constructor(actors, camera, fog) { PLANT_VIEW.cam = camera.position; this.partPx = SUB_PX; this.partNear = 30; this.anim = { on: true, off: 4, far: 8, eco: false, inView: 2, near: 25, hold: null }; this.actors = actors; this.camera = camera; this.fog = fog; this.off = []; this.enabled = true; this.view = true; this.n = 0; this.nView = 0; this.parts = new WeakMap(); this.bounds = new WeakMap(); this.tick = 0; }
  // (PERF-HIGH) a rig's bounds about its root's position (where the game or a story scene has put it this frame): the
  // height of their centre and a radius, from its box at first sight (with a margin); and whether any of it casts a
  // sun shadow (looked at again every 120 frames: a part may be added or start casting)
  boundsOf(r) {
    let B = this.bounds.get(r);
    if (!B || (B.casts !== null && this.tick - B.t > 120)) {
      if (!B) {
        r.updateMatrixWorld(true); _fb.setFromObject(r);
        // (s: the root's scale then; a rig scaled later (grown, shrunk) scales its bounds with it)
        const s = Math.max(r.scale.x, r.scale.y, r.scale.z) || 1;
        if (_fb.isEmpty()) B = { dy: 1, rad: 3, s };
        else { const o = r.getWorldPosition(_pv); _fb.getBoundingSphere(_fs); B = { dy: _fs.center.y - o.y, rad: (Math.hypot(_fs.center.x - o.x, _fs.center.z - o.z) + _fs.radius) * 1.25 + 0.5, s }; }
      }
      let casts = false; r.traverse((o) => { if (o.isMesh && o.castShadow) casts = true; });
      // (PERF-SUBMIT, smoothness: the next look at it phased by the rig, so the people first seen together on an arrival
      //  are not all walked again in the same frame every 120 frames)
      B.casts = casts; B.t = B.t === undefined ? this.tick - (r.id % 120) : this.tick; this.bounds.set(r, B);
    }
    return B;
  }
  partsOf(root) {
    let L = this.parts.get(root);
    if (!L) {
      L = [];
      root.traverse((o) => {
        if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || !o.geometry) return;
        const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
        if (g.boundingSphere && g.boundingSphere.radius < PART_R) L.push(o);
      });
      this.parts.set(root, L);
    }
    return L;
  }
  hide() {
    this.n = 0;
    if (!this.enabled) return;
    const far = Math.max(this.fog?.far ?? 0, 250) + 10, cam = this.camera, p = cam.position;
    const pxK = (typeof innerHeight === 'number' ? innerHeight : 720) / (2 * Math.tan(((cam.fov || 55) * Math.PI) / 360));
    const view = this.view && cam.isPerspectiveCamera;
    if (view) { cam.updateMatrixWorld(); _ff.setFromProjectionMatrix(_fm.multiplyMatrices(cam.projectionMatrix, _fm.copy(cam.matrixWorld).invert())); }
    // (TITLE-LOAD: the frame's fog limit, set for this camera before this runs: setFogCull)
    const fogLim = view && FOGCULL.cam === cam ? FOGCULL.far : Infinity;
    if (fogLim < Infinity) _fw.set(0, 0, -1).transformDirection(cam.matrixWorld);
    this.tick++; this.nView = 0; this.nFog = 0;
    // (PERF-CPU: the animation rate of the first list's actors — the people, never the enemies — from what this frame
    //  shows: Rig.update's lodN. Full rate while anim.hold() (dialogue, story scenes, a door's fade) or anim.on is off)
    const AN = this.anim, animOn = AN.on && !(AN.hold && AN.hold());
    let li = -1;
    for (const list of this.actors()) { li++; const lod = animOn && li === 0; for (const a of list || NONE) {
      const rig = a?.rig, r = rig?.root; if (!r || !a.pos) continue;
      // (ANIM-POLISH-3: a plantLite character's feet are planted only while it is in view (and near the camera: Rig.update, PLANT_VIEW);
      //  marked out of view first, in view below once it has passed the view tests)
      if (rig.plantLite) { rig.inView = false; rig.viewTick = PLANT_VIEW.tick; }
      if (!r.visible) { rig.lodN = 0; continue; }
      const dx = a.pos.x - p.x, dy = a.pos.y - p.y, dz = a.pos.z - p.z, d2 = dx * dx + dy * dy + dz * dz;
      rig.lodN = lod && AN.eco && d2 > AN.near * AN.near ? AN.inView : 0;
      if (d2 >= far * far) {
        if (lod) rig.lodN = AN.far;
        r.visible = false; this.off.push(r);
        if (a.shadow?.visible) { a.shadow.visible = false; this.off.push(a.shadow); }
        continue;
      }
      if (view && (!r.parent || r.parent.isScene)) {   // (a rig placed in the scene itself: its position is its world position)
        const B = this.boundsOf(r);
        const k = Math.max(r.scale.x, r.scale.y, r.scale.z) / B.s;
        _fs.center.set(r.position.x, r.position.y + B.dy * k, r.position.z); _fs.radius = B.rad * Math.max(1, k);
        if (!B.casts && !_ff.intersectsSphere(_fs)) { if (lod) rig.lodN = AN.off; r.__hidBefore = r.__hid === true; r.visible = false; this.off.push(r); (this.offView ??= []).push(r); this.nView++; continue; }
        // (TITLE-LOAD: wholly beyond the fog's end in view depth: drawn in the background's colour only; posed as one
        //  beyond the fog)
        if (!B.casts && fogLim < Infinity && (_fs.center.x - p.x) * _fw.x + (_fs.center.y - p.y) * _fw.y + (_fs.center.z - p.z) * _fw.z - _fs.radius > fogLim) { if (lod) rig.lodN = AN.far; r.__hidBefore = r.__hid === true; r.visible = false; this.off.push(r); (this.offView ??= []).push(r); this.nView++; this.nFog++; continue; }
      }
      if (rig.plantLite) rig.inView = !(rig.lodN > 1);
      // (within 30 m of the camera every part stays: an eye there is still about a pixel; PERF-CPU, Auto's Low-lite:
      //  partPx 2.5 within partNear 12 m)
      if (d2 < this.partNear * this.partNear) continue;
      for (const o of this.partsOf(r)) {
        if (!o.visible) continue;
        _pv.copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld);
        const px = (o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() * pxK) / Math.max(0.1, _pv.distanceTo(p));
        if (px < this.partPx) { o.visible = false; this.off.push(o); }
      }
    } }
    this.n = this.off.length;
  }
  // TITLE-LOAD: bodies never placed — on the title screen the hero and most enemies have not been posed yet (the game
  // places them from play on), so their rigs stand at the world's origin: the middle of the title's view, on the sea
  // behind the menu (Twinsen a speck there, 80 px; four drones and the mites under him; 32 calls, 99k triangles and
  // 93k in the shadow pass). Left out of the frame like a far actor; nothing else changes. `one`, `list`: actors
  hideUnplaced(one, list = NONE) {
    if (!this.enabled || this.unplaced === false) return;
    for (let i = -1; i < list.length; i++) {
      const a = i < 0 ? one : list[i];
      const r = a?.rig?.root || a?.group;
      if (!r || !r.visible || !a.pos || (!r.parent?.isScene) || r.position.x !== 0 || r.position.y !== 0 || r.position.z !== 0) continue;
      if (a.pos.x === 0 && a.pos.y === 0 && a.pos.z === 0) continue;   // (one that really stands there)
      r.visible = false; this.off.push(r);
      if (a.shadow?.visible) { a.shadow.visible = false; this.off.push(a.shadow); }
    }
    this.n = this.off.length;
  }
  // (PERF-HIGH: an actor left out for being outside the view is near, and the game reads its parts' world matrices (a
  //  hand, the head, what it carries) before the next frame's render: they are brought up to date as the render would
  //  have done — the matrix work stays, only the draws go. A far one's are left as before.)
  restore() {
    for (const o of this.off) o.visible = true;
    this.off.length = 0;
    // (PERF-CPU: only what changed; all of it when its parts may be stale: hidden before this frame, or its own matrix
    //  recomputed in this frame's update, where its parts were set aside)
    if (this.offView?.length) { for (const r of this.offView) updateTree(r, r.__hidBefore || r.__mwF === MW.frame || !r.parent?.isScene); this.offView.length = 0; }
  }
}

export class BlobBatch {
  constructor(scene, blobs) { this.scene = scene; this.blobs = blobs; this.im = null; this.off = []; this.enabled = true; this.n = 0; }
  _make(proto, cap) {
    if (this.im) { this.scene.remove(this.im); this.im.dispose(); }
    const im = (this.im = new THREE.InstancedMesh(proto.geometry, proto.material, cap));
    im.renderOrder = proto.renderOrder; im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false;
    im.name = 'blobBatch'; im.count = 0; im.matrixAutoUpdate = false;
    this.scene.add(im);
  }
  hide() {
    this.n = 0;
    const B = this.blobs;
    if (!this.enabled || !B.length) { if (this.im) this.im.count = 0; return; }
    let n = 0;
    for (const m of B) {
      if (!m.visible || !m.parent) continue;
      let shown = true; for (let p = m.parent; p; p = p.parent) if (!p.visible) { shown = false; break; }
      if (!shown) continue;
      if (!this.im || n >= this.im.instanceMatrix.count) this._make(m, Math.max(64, (this.im?.instanceMatrix.count || 0) * 2));
      m.updateWorldMatrix(true, false);
      this.im.setMatrixAt(n++, m.matrixWorld);
      m.visible = false; this.off.push(m);
    }
    if (this.im) { this.im.count = n; this.im.instanceMatrix.needsUpdate = n > 0; this.im.visible = n > 0; }
    this.n = n;
  }
  restore() { for (const m of this.off) m.visible = true; this.off.length = 0; }
}

// 4. Box culling (PERF-BATTERY-2). three tests each object against the view with its bounding SPHERE. The area's big,
//    flat or long static draws — the draw batches (drawbatch.js: one per 48 m cell and material, their pieces' parts
//    reaching beyond the cell), the terrain tiles (65 m) and the instanced tiles (grass, flowers, rocks: 36 m squares
//    a metre or two high) — have spheres far larger than what they cover: on Citadel's street at Medium three drew
//    54 of the 136 draw batches, 305k triangles, of which 45k were in the view; with their boxes 31 batches, 156k.
//    Each frame (Renderer.mid, after the world matrices) these are tested with their world-space box, grown by
//    MARGIN m (a swaying tuft, a rounding error), and those wholly outside the view are left out of that frame's render;
//    their `visible` flag is restored right after it (Renderer.post), so nothing else (warm-ups, shader preparation,
//    uploads) sees a difference. Casters are left alone (three's shadow pass skips a hidden object, and one out of the
//    view may throw its shadow into it). Nothing in view is left out: the same pixels, fewer draws and triangles.
//    TITLE-LOAD: also what lies wholly beyond the fog's end. three's linear fog is a blend by view depth (the distance
//    along the view's axis) that reaches the fog's colour exactly at fog.far, and outdoors the background is that same
//    colour (environment.js: scene.background = fog.color): a draw whose box lies wholly beyond fog.far in view depth
//    paints only pixels of the background's colour (its edges included). The title's camera, 42 m up, sees across the
//    island and the sea: at its heaviest angles a fifth of its triangles were there. Such a draw is left out of the frame
//    like one outside the view; only for a perspective camera, a linear fog that is the background's colour, and
//    materials that take the fog (fogFar below). A caster is left out of the main pass only (CASTER_ONLY, below): its
//    shadow is drawn as before. Also the actors (FarCull) and the batched meshes' instances (BatchedMesh's own culling,
//    given a far plane at fog.far for the main pass: fogBatched below).
//    PERF (TITLE-LOAD): plain meshes of over BIG_TRIS triangles that the draw batches did not take are tested too.
const MARGIN = 0.5, BIG_TRIS = 400;
// TITLE-LOAD: a caster out of the main pass only — its layers moved from 0 (the scene camera's) to CASTER_ONLY, which
// the sun's shadow camera also sees (main.js enables it there), for the frame; ShadowCache's own layer (31) is kept
export const CASTER_ONLY = 30;
const MAIN_BIT = 1, CO_BIT = 1 << CASTER_ONLY;
// (FOGCULL.on false: as before, the A/B switch; .far: this frame's limit, Infinity when the rule does not apply; .cam:
//  the camera it was worked out for; .pm: that camera's projection with its far plane at the limit)
export const FOGCULL = { on: true, far: Infinity, cam: null, pm: new THREE.Matrix4(), n: 0, nb: 0 };
const FOG_MARGIN = 1;
const _pc = new THREE.PerspectiveCamera();
// the view depth beyond which everything the scene draws with fog is the background's colour, or Infinity
export function fogFar(scene, camera) {
  if (!FOGCULL.on || !camera?.isPerspectiveCamera || !scene) return Infinity;
  const f = scene.fog, bg = scene.background;
  if (!f?.isFog || !bg?.isColor || !(bg === f.color || bg.equals(f.color)) || !(f.far > f.near) || f.far + FOG_MARGIN >= camera.far) return Infinity;
  return f.far + FOG_MARGIN;
}
// the frame's limit for this camera (and the projection BatchedMesh's per-instance test uses: its far plane there)
export function setFogCull(scene, camera) {
  const far = fogFar(scene, camera);
  FOGCULL.far = far; FOGCULL.cam = far < Infinity ? camera : null; FOGCULL.n = 0; FOGCULL.nb = 0;
  if (far === Infinity) return far;
  _pc.copy(camera, false); _pc.far = far; _pc.updateProjectionMatrix(); FOGCULL.pm.copy(_pc.projectionMatrix);
  return far;
}
const takesFog = (m) => { if (Array.isArray(m)) { for (const x of m) if (!x || x.fog === false || (x.isShaderMaterial && !x.fog)) return false; return m.length > 0; } return !!m && m.fog !== false && !(m.isShaderMaterial && !m.fog); };
// BatchedMesh tests each instance against the camera's frustum in its onBeforeRender (main pass only; the shadow pass
// has its own): for the scene camera under the fog rule, the frustum's far plane is the fog's end there
{
  const OBR = THREE.BatchedMesh.prototype.onBeforeRender;
  THREE.BatchedMesh.prototype.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
    if (camera !== FOGCULL.cam || !this.perObjectFrustumCulled || !takesFog(material)) return OBR.call(this, renderer, scene, camera, geometry, material, group);
    const pm = camera.projectionMatrix;
    camera.projectionMatrix = FOGCULL.pm; FOGCULL.nb++;
    try { return OBR.call(this, renderer, scene, camera, geometry, material, group); } finally { camera.projectionMatrix = pm; }
  };
}
const _cv = new THREE.Vector3();
// the nearest view depth of a world box (its 8 corners; v: the camera's matrixWorldInverse)
function boxDepth(b, v) {
  let d = Infinity;
  for (let c = 0; c < 8; c++) { _cv.set(c & 1 ? b.max.x : b.min.x, c & 2 ? b.max.y : b.min.y, c & 4 ? b.max.z : b.min.z).applyMatrix4(v); if (-_cv.z < d) d = -_cv.z; }
  return d;
}
const _box = new THREE.Box3(), _fr = new THREE.Frustum(), _pm = new THREE.Matrix4(), _iv = new THREE.Matrix4(), _fbox = new THREE.Box3();
// (ZPERF-1, BoxCull.hideFar: the scene's own subtrees outside the area — the shadow reach in m, the box margin in m, the
//  frames between box refreshes and between candidate-list refreshes)
const FAR_REACH = 400, FAR_MARGIN = 2, FAR_REFRESH = 30, FAR_LIST_REFRESH = 120;
const BASE_OBR = THREE.Object3D.prototype.onBeforeRender;
export class BoxCull {
  constructor() { this.lists = new WeakMap(); this.off = []; this.layered = []; this.enabled = true; this.n = 0; this.tested = 0; this.nFog = 0; this.nCast = 0; this.nFar = 0; this.far = !(typeof location !== 'undefined' && /[?&]nofar/.test(location.search)); }
  // the area's terrain tiles and instanced tiles (found once per area root; a tile's box is recomputed when its
  // instances or count change); TITLE-LOAD: and its big plain meshes
  listFor(root) {
    let L = this.lists.get(root);
    if (!L) {
      L = [];
      root.traverse((o) => {
        if (!o.frustumCulled || o.isSkinnedMesh || o.isBatchedMesh || o.userData.drawBatch) return;
        const g = o.geometry, big = o.isMesh && !o.isInstancedMesh && g && (g.index ? g.index.count : g.attributes.position?.count ?? 0) > BIG_TRIS * 3;
        if (o.isInstancedMesh || (o.isMesh && o.name === 'terrain') || big) L.push({ o, v: -1, n: -1, g: null, box: null, changes: 0 });
      });
      this.lists.set(root, L);
    }
    return L;
  }
  boxOf(E) {
    const o = E.o;
    if (o.isInstancedMesh) {
      // (instances that keep moving — a flock, rain — are left to three's own test: their box would be redone each frame)
      if (E.v !== o.instanceMatrix.version || E.n !== o.count || E.g !== o.geometry) { if (++E.changes > 4) return null; o.computeBoundingBox(); E.box = o.boundingBox.clone(); E.v = o.instanceMatrix.version; E.n = o.count; E.g = o.geometry; }
      return E.box;
    }
    const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
    return g.boundingBox;
  }
  // root: the area on show; camera: the scene pass's; batches: the draw batch meshes drawn now (DrawBatch.meshes)
  // (shadows: whether the sun's shadow pass runs: without it, casters are culled like the rest)
  // (TITLE-LOAD — far: the view depth beyond which a fogged draw shows nothing, drawcull.js fogFar; Infinity: no such
  //  test. A caster wholly outside the view or beyond it leaves the main pass only, through its layers: its shadow stays)
  hide(root, camera, batches = NONE, shadows = true, far = Infinity) {
    this.n = 0; this.tested = 0; this.nFog = 0; this.nCast = 0;
    if (!this.enabled || !root || !camera) return;
    camera.updateMatrixWorld();
    _iv.copy(camera.matrixWorld).invert();
    _fr.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, _iv));
    const test = (o, box) => {
      if (!o.visible || !box || box.isEmpty()) return;
      const cast = o.castShadow && shadows;
      // (a caster out of view may still throw a shadow into it: only one the scene camera alone would draw is moved)
      if (cast && (this.casters === false || (o.layers.mask & (MAIN_BIT | CO_BIT)) !== MAIN_BIT)) return;
      this.tested++;
      _box.copy(box).applyMatrix4(o.matrixWorld).expandByScalar(MARGIN);
      let out = !_fr.intersectsBox(_box);
      if (!out && far < Infinity && takesFog(o.material) && boxDepth(_box, _iv) > far) { out = true; this.nFog++; }
      if (!out) return;
      if (cast) { o.layers.mask = (o.layers.mask & ~MAIN_BIT) | CO_BIT; this.layered.push(o); this.nCast++; }
      else { o.visible = false; this.off.push(o); }
    };
    for (const m of batches) { const g = m.geometry; if (!g.boundingBox) g.computeBoundingBox(); test(m, g.boundingBox); }
    for (const E of this.listFor(root)) if (E.o.visible) test(E.o, this.boxOf(E));
    this.n = this.off.length + this.layered.length;
  }
  // ZPERF-1: what stands in the scene itself, outside the area on show. Citadel's wizard's tent, the LBA1 asylum's
  // front, block-house and climb, Kit's lane and a few story props are built into the scene, not Citadel's root, so they
  // stay shown in every region: from the middle of Zeelich's street, looking west across the 2 400 m to Citadel (the
  // camera's far plane is 2 500 m), they were 78 of the frame's 235 draw calls, every one of them beyond the fog's end
  // (290 m there), painted in the background's colour. Each such subtree is tested whole, by the world box of its meshes,
  // with the same rule as the draws above: wholly outside the view, or wholly beyond the fog's end in view depth, and
  // only with materials that take the fog in normal blending, and only one wholly farther than the fog's end from the
  // camera. Then it is left out of the frame (`visible`, restored by restore() with the rest). One that casts a shadow
  // is left in unless it lies farther than `reach` m from the camera (the sun's shadow box spans at most ~120 m around
  // the focus: environment.js), so no shadow changes either. Off with `?nofar` or BoxCull.far = false (A/B).
  // Subtrees with lights (their count is in the shader programs), skinned, instanced, batched meshes, points, lines,
  // sprites, meshes not frustum-culled or with their own onBeforeRender are never taken; the actors are FarCull's.
  // Boxes: worked out again when the subtree's root moves, and every FAR_REFRESH frames (a part that moves within it).
  hideFar(scene, root, camera, far = Infinity, shadows = true, reach = FAR_REACH) {
    this.nFar = 0;
    if (!this.enabled || this.far === false || !scene || !root || !camera || !(far < Infinity)) return;
    const F = (this.farTick = (this.farTick || 0) + 1);
    if (!this.farList || this._farN !== scene.children.length || F - this._farT >= FAR_LIST_REFRESH || this._farRoot !== root) this.farCandidates(scene, root, F);
    camera.updateMatrixWorld();
    _iv.copy(camera.matrixWorld).invert();
    _fr.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, _iv));
    const cp = camera.position;
    for (const E of this.farList) {
      const c = E.o;
      if (!c.visible || c.parent !== scene) continue;
      if (!E.box || F - E.t >= FAR_REFRESH || !c.matrixWorld.equals(E.m)) { if (!this.farBox(E, F)) continue; }
      if (!E.draws) continue;
      _box.copy(E.box).expandByScalar(FAR_MARGIN);
      const d = _box.distanceToPoint(cp);
      if (!(d > far)) continue;   // (only what lies beyond the fog's end in every direction: near things are three's to cull)
      if (_fr.intersectsBox(_box) && !(boxDepth(_box, _iv) > far)) continue;
      if (E.casts && shadows && d < reach) continue;
      c.visible = false; this.off.push(c); this.nFar++;
    }
    this.n += this.nFar;
  }
  farCandidates(scene, root, F) {
    const L = (this.farList = []);
    this._farN = scene.children.length; this._farT = F; this._farRoot = root;
    for (const c of scene.children) {
      if (c === root || c.isLight || c.isCamera || c.isScene) continue;
      let ok = true, meshes = 0;
      c.traverse((o) => {
        if (!ok) return;
        if (o.isLight || o.isCamera || o.isSkinnedMesh || o.isInstancedMesh || o.isBatchedMesh || o.isPoints || o.isLine || o.isSprite || o.isBone) { ok = false; return; }
        if (!o.isMesh) return;
        meshes++;
        const M = o.material;
        if (!o.frustumCulled || o.onBeforeRender !== BASE_OBR || !o.geometry?.attributes?.position || !takesFog(M)) { ok = false; return; }
        for (const m of Array.isArray(M) ? M : [M]) if (m.blending !== THREE.NormalBlending) { ok = false; return; }
      });
      if (ok && meshes) L.push({ o: c, box: null, m: new THREE.Matrix4(), t: -Infinity, casts: false, draws: 0 });
    }
  }
  // the world box of a subtree's shown meshes and whether any of them casts (false: nothing to test)
  farBox(E, F) {
    const c = E.o, B = (E.box ??= new THREE.Box3()).makeEmpty();
    let casts = false, draws = 0, ok = true;
    c.traverseVisible((o) => {
      if (!ok || !o.isMesh) return;
      if (o.isSkinnedMesh || o.isInstancedMesh || o.isBatchedMesh || !o.frustumCulled) { ok = false; return; }   // (one added since the list was made)
      const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox();
      if (!g.boundingBox || g.boundingBox.isEmpty()) return;
      _fbox.copy(g.boundingBox).applyMatrix4(o.matrixWorld); B.union(_fbox);
      draws++; if (o.castShadow) casts = true;
    });
    if (!ok || !Number.isFinite(B.min.x + B.min.y + B.min.z + B.max.x + B.max.y + B.max.z)) { E.draws = 0; E.box = null; E.t = F; E.m.copy(c.matrixWorld); return false; }
    E.casts = casts; E.draws = draws; E.t = F; E.m.copy(c.matrixWorld);
    return true;
  }
  restore() {
    for (const o of this.off) o.visible = true; this.off.length = 0;
    for (const o of this.layered) o.layers.mask = (o.layers.mask & ~CO_BIT) | MAIN_BIT; this.layered.length = 0;
  }
}

