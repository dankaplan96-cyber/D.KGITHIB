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
export const MW = { cached: true, frame: 0, ok: false };
const _mwT = new THREE.Matrix4();
function shownTree(o, force, F, S, all = false) {
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
      if (k.__hid === true) { k.__hid = false; shownTree(k, true, F, S, all); } else shownTree(k, force, F, S, all);
    } else {
      // (hidden: itself kept up to date, its subtree left until it is shown again)
      if (k.children.length) k.__hid = true;
      const kids = k.children; k.children = NONE;
      try { if (ownUMW(k)) k.updateMatrixWorld(force); else shownTree(k, force, F, S); } finally { k.children = kids; }
    }
  }
}

// (an actor's rig brought up to date after a frame that left it out of the render: FarCull.restore; every part, shown
//  or not, as updateMatrixWorld(true) did, but only what changed is recomputed)
// (force: its parts may be stale — it was hidden before, or its own matrix changed this frame — so all are recomputed)
const _S0 = { visited: 0, composed: 0, world: 0, own: 0 };
export function updateTree(o, force = true) {
  if (!MW.cached) { o.updateMatrixWorld(true); return; }
  o.__hid = false;
  shownTree(o, force, MW.frame, _S0, true);
}

export function updateShownWorld(scene, state) {
  if (MW.cached) {
    const F = (MW.frame = ++state.frame), S = (state.stats ??= { visited: 0, composed: 0, world: 0, own: 0 });
    S.visited = S.composed = S.world = S.own = 0;
    // (switched from the old path: its hidden list's subtrees are recomputed when shown, as there)
    for (const o of state.prev) o.__hid = true;
    state.prev.length = 0;
    scene.__visF = F;
    shownTree(scene, false, F, S);
    MW.ok = true;
    return;
  }
  updateShownWorldOld(scene, state);
}
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
const _pv = new THREE.Vector3(), _fb = new THREE.Box3(), _fs = new THREE.Sphere(), _ff = new THREE.Frustum(), _fm = new THREE.Matrix4();
export class FarCull {
  // actors(): lists of the actors that may be drawn; fog: the scene's THREE.Fog
  constructor(actors, camera, fog) { this.actors = actors; this.camera = camera; this.fog = fog; this.off = []; this.enabled = true; this.view = true; this.n = 0; this.nView = 0; this.parts = new WeakMap(); this.bounds = new WeakMap(); this.tick = 0; }
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
      B.casts = casts; B.t = this.tick; this.bounds.set(r, B);
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
    this.tick++; this.nView = 0;
    for (const list of this.actors()) for (const a of list || NONE) {
      const r = a?.rig?.root; if (!r || !r.visible || !a.pos) continue;
      const dx = a.pos.x - p.x, dy = a.pos.y - p.y, dz = a.pos.z - p.z, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 >= far * far) {
        r.visible = false; this.off.push(r);
        if (a.shadow?.visible) { a.shadow.visible = false; this.off.push(a.shadow); }
        continue;
      }
      if (view && (!r.parent || r.parent.isScene)) {   // (a rig placed in the scene itself: its position is its world position)
        const B = this.boundsOf(r);
        const k = Math.max(r.scale.x, r.scale.y, r.scale.z) / B.s;
        _fs.center.set(r.position.x, r.position.y + B.dy * k, r.position.z); _fs.radius = B.rad * Math.max(1, k);
        if (!B.casts && !_ff.intersectsSphere(_fs)) { r.__hidBefore = r.__hid === true; r.visible = false; this.off.push(r); (this.offView ??= []).push(r); this.nView++; continue; }
      }
      // (within 30 m of the camera every part stays: an eye there is still about a pixel)
      if (d2 < 900) continue;
      for (const o of this.partsOf(r)) {
        if (!o.visible) continue;
        _pv.copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld);
        const px = (o.geometry.boundingSphere.radius * o.matrixWorld.getMaxScaleOnAxis() * pxK) / Math.max(0.1, _pv.distanceTo(p));
        if (px < SUB_PX) { o.visible = false; this.off.push(o); }
      }
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
const MARGIN = 0.5;
const _box = new THREE.Box3(), _fr = new THREE.Frustum(), _pm = new THREE.Matrix4(), _iv = new THREE.Matrix4();
export class BoxCull {
  constructor() { this.lists = new WeakMap(); this.off = []; this.enabled = true; this.n = 0; this.tested = 0; }
  // the area's terrain tiles and instanced tiles (found once per area root; a tile's box is recomputed when its
  // instances or count change)
  listFor(root) {
    let L = this.lists.get(root);
    if (!L) {
      L = [];
      root.traverse((o) => {
        if (!o.frustumCulled || o.isSkinnedMesh || o.isBatchedMesh || o.userData.drawBatch) return;
        if (o.isInstancedMesh || (o.isMesh && o.name === 'terrain')) L.push({ o, v: -1, n: -1, g: null, box: null, changes: 0 });
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
  hide(root, camera, batches = NONE, shadows = true) {
    this.n = 0; this.tested = 0;
    if (!this.enabled || !root || !camera) return;
    camera.updateMatrixWorld();
    _fr.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, _iv.copy(camera.matrixWorld).invert()));
    const test = (o, box) => {
      if (!o.visible || (o.castShadow && shadows) || !box || box.isEmpty()) return;   // (a caster out of view may still throw a shadow into it)
      this.tested++;
      _box.copy(box).applyMatrix4(o.matrixWorld).expandByScalar(MARGIN);
      if (!_fr.intersectsBox(_box)) { o.visible = false; this.off.push(o); }
    };
    for (const m of batches) { const g = m.geometry; if (!g.boundingBox) g.computeBoundingBox(); test(m, g.boundingBox); }
    for (const E of this.listFor(root)) if (E.o.visible) test(E.o, this.boxOf(E));
    this.n = this.off.length;
  }
  restore() { for (const o of this.off) o.visible = true; this.off.length = 0; }
}
