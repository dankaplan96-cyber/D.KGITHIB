// HEADING-LOAD: static instanced decoration that casts no shadow, drawn only where the view can show it.
//
// A builder's InstancedMesh of many small things spread over a quarter or the whole island (the tulip rows, the
// lanterns' glass) is one draw, culled by three only as a whole: its sphere covers the island, so every instance went
// to the GPU whatever the camera faced (Citadel's street, Follow camera at Far: 52–78k of the original props' 80–82k
// instanced triangles out of the view). viewCull(im) groups the mesh's instances in CELL × CELL m squares (each with
// a sphere round its instances) and, before each render of the scene with a perspective camera (three calls the
// scene's onBeforeRender with that render's camera, before it builds the render list and uploads the instances),
// keeps in the mesh only the instances of the squares that touch the frustum, in their old order: the same instances,
// matrices and colours where they can be seen, the same pixels. The mesh is refilled only when its set of squares
// changes; with none in view it is hidden (its `visible` flag, which the builders of these meshes never touch).
// Casters are not taken: one out of the view may throw its shadow into it, and the static shadow cache
// (shadowcache.js) watches casters' instance counts. VIEW_INST.on = false: every instance, as before (benchgpu.js).
//
// The mesh's own frustum test (three's sphere, drawcull.js's BoxCull) is turned off: both run before the refill, with
// the last render's content, and either could hide the mesh for a frame just as a square came into view.
import * as THREE from 'three';

export const VIEW_INST = { on: true, refills: 0 };
const LIST = [];
const CELL = 8;
const _f = new THREE.Frustum(), _pm = new THREE.Matrix4(), _m = new THREE.Matrix4(), _s = new THREE.Sphere(), _c = new THREE.Vector3();
const hooked = new WeakSet();

// im: an InstancedMesh whose instances never change after this call; returns it
export function viewCull(im, { cell = CELL, margin = 0.05 } = {}) {
  if (!im?.isInstancedMesh || im.castShadow || im.count < 2) return im;
  const g = im.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
  const n = im.count, gs = g.boundingSphere;
  const M = im.instanceMatrix.array.slice(0, n * 16), C = im.instanceColor ? im.instanceColor.array.slice(0, n * 3) : null;
  const sq = new Uint16Array(n), keys = new Map(), boxes = [];
  for (let i = 0; i < n; i++) {
    _m.fromArray(M, i * 16);
    _c.copy(gs.center).applyMatrix4(_m);
    const r = gs.radius * _m.getMaxScaleOnAxis() + margin;
    const k = Math.floor(_c.x / cell) + ',' + Math.floor(_c.z / cell);
    let q = keys.get(k);
    if (q === undefined) { q = boxes.length; keys.set(k, q); boxes.push(new THREE.Box3()); }
    sq[i] = q;
    boxes[q].expandByPoint(_s.center.set(_c.x - r, _c.y - r, _c.z - r)).expandByPoint(_s.center.set(_c.x + r, _c.y + r, _c.z + r));
  }
  if (boxes.length < 2) return im;   // (all in one square: three's own test does as well)
  const spheres = boxes.map((b) => b.getBoundingSphere(new THREE.Sphere()));
  const E = { im, n, M, C, sq, spheres, show: new Uint8Array(spheres.length).fill(1), all: true, w: new THREE.Sphere() };
  im.frustumCulled = false;
  im.userData.viewCull = E;
  LIST.push(E);
  // (the scene's hook is put in place at the mesh's first render, when its scene is known)
  const base = im.onBeforeRender;
  im.onBeforeRender = function (r, scene, ...a) { if (scene?.isScene && !hooked.has(scene)) hook(scene); return base.call(this, r, scene, ...a); };
  return im;
}

function hook(scene) {
  hooked.add(scene);
  const before = scene.onBeforeRender;
  scene.onBeforeRender = function (r, sc, camera, ...a) { before.call(this, r, sc, camera, ...a); update(camera); };
}

const shown = (o) => { for (let p = o.parent; p; p = p.parent) if (!p.visible) return false; return true; };

function update(camera) {
  if (!camera?.isPerspectiveCamera) return;
  _f.setFromProjectionMatrix(_pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
  for (const E of LIST) {
    const im = E.im;
    if (!VIEW_INST.on) { if (!E.all) fill(E, true); continue; }
    if (!im.parent || !shown(im)) continue;
    const W = im.matrixWorld, sc = W.getMaxScaleOnAxis();
    let changed = false;
    for (let q = 0; q < E.spheres.length; q++) {
      const S = E.spheres[q];
      E.w.center.copy(S.center).applyMatrix4(W); E.w.radius = S.radius * sc;
      const v = _f.intersectsSphere(E.w) ? 1 : 0;
      if (v !== E.show[q]) { E.show[q] = v; changed = true; }
    }
    if (changed) fill(E, false);
  }
}

function fill(E, all) {
  const im = E.im, A = im.instanceMatrix.array, Cc = im.instanceColor?.array;
  let k = 0;
  if (all) { A.set(E.M); if (Cc && E.C) Cc.set(E.C); k = E.n; E.show.fill(1); }
  else for (let i = 0; i < E.n; i++) {
    if (!E.show[E.sq[i]]) continue;
    A.set(E.M.subarray(i * 16, i * 16 + 16), k * 16); if (Cc && E.C) Cc.set(E.C.subarray(i * 3, i * 3 + 3), k * 3);
    k++;
  }
  E.all = all || k === E.n;
  im.count = k; im.visible = k > 0;
  im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.instanceMatrix.clearUpdateRanges?.(); im.instanceColor?.clearUpdateRanges?.();
  if (k) { im.computeBoundingSphere(); im.computeBoundingBox(); }
  VIEW_INST.refills++;
}

// Shader programs: three's compile / compileAsync (the warm-ups behind the black and the precompile) walk only what is
// visible, so a mesh hidden because none of its squares was in view at that moment would compile its program on the
// first frame that shows it. Renderer (renderer.js) runs every compile through withCulledShown: the meshes this module
// (and world.js's grass pools, registered with culledToo) hid are shown for the compile and hidden again at once.
const EXTRA = new Set();
export const culledToo = (o) => { EXTRA.add(o); return o; };
export function withCulledShown(fn) {
  const shown = [];
  for (const E of LIST) if (!E.im.visible) { E.im.visible = true; shown.push(E.im); }
  for (const o of EXTRA) if (!o.visible) { o.visible = true; shown.push(o); }
  try { return fn(); } finally { for (const o of shown) o.visible = false; }
}
// every registered mesh with all its instances (VIEW_INST.on false) or back to the view's (true)
export function setViewInst(on) { VIEW_INST.on = !!on; for (const E of LIST) { E.im.frustumCulled = !VIEW_INST.on; fill(E, true); } }
export const viewInstStats = () => ({ meshes: LIST.length, culled: LIST.filter((E) => !E.all).length, refills: VIEW_INST.refills });
