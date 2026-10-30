// Static shadow cache (PERF-BATTERY). On the user's Vega 8 on battery, drawing the sun's shadow map is ~4.9 ms of the
// street's 37 ms at Medium (the benchmark's "shadow map kept" line), and almost all of it is the static casters (the
// area's merged shadow batches, shadowcull.js, and the trees' batches, kit.js LodBatch), redrawn every frame although
// they never move. Here they are drawn into a cache only when needed, and each frame the sun's map starts as a copy of
// the cache (one blit of colour and depth) and gets only the casters that may move (people, dogs, doors, boats, the
// pieces shadowcull has let go, everything else that casts) drawn over it with the depth test: the nearest depth wins
// in each texel, exactly as when everything was drawn together. Same map, same filter, same shader programs.
//
// The cache covers the shadow box plus MARGIN texels on each side, on the same texel lattice as the live box (the
// sun's camera follows the focus in whole texels: Environment.snapShadow), so the live box is a window into it as long
// as it has moved fewer than MARGIN texels; the live sun keeps the cache's depth along the light (moving it along its
// own beam changes no depth comparison, only their offset, which is then the cache's). Before the window reaches the
// edge, the next cache, centred on the focus, is drawn over the following frames in SLICES (a part of the casters a
// frame, no clear between) and swapped in once complete: no frame draws all the static casters at once except the
// first in an area (behind its black fade) or after a change the cache can't follow.
// The cache is dropped when anything it holds may differ: another area, a shadow batch rebuilt (a piece moved and
// left it), the casters' set, a tree batch shown or hidden, the sun's direction, the map's size or box, the filter type.
// PERF-BATTERY-2: instanced casters that stay still (the island's original props, the depot's crates: 6–7 of the ~21
// draws of the live pass on Citadel's street) are static casters too. Each is watched (its world matrix, instances,
// count, geometry, material, casting and showing): one that changes leaves the cache for good (one rebuild) and is
// drawn live from then on. The vegetation tiles that switch detail with distance (`quiet(o)` false: the game's LOD
// tiles) are never taken in: their switches would drop the cache again and again.
// Off with Variance shadow maps (not used), for maps over 2048 texels (High's 4096: twice its memory for a copy;
// left as it was), and while anything else renders the shadow map (warm-ups: the area is not on show then).
import * as THREE from 'three';
import { MW } from './drawcull.js';

const MARGIN = 64, SLICES = 3, LAYER = 31, MAX_MAP = 2048, MAX_DEPTH_SHIFT = 20;

// PERF-SUBMIT: what three's shadow pass walks. It visits every object under shown parents (~1 300 on Citadel's street:
// batched pieces, bones, groups) to find the few dozen that cast. drawcull.js's shown-world update lists, in the same
// walk order, the shown casters not under another one (and the subtrees it leaves to three), so the pass starts from
// a stand-in root holding only those subtrees: every object three would draw is in them, in the same order, and three
// still applies all of its own tests to each. A subtree whose parent chain was hidden after that update (the render's
// own culling hides non-casters only) is left out, as three's walk would; the area's shadow batches, shown only for the
// shadow pass (shadowcull.js), are added where the pass may draw them. Without this frame's list: the whole scene.
const _up = new Map();
const NO_LAYERS = { test: () => false };
function walkRoot(scene, extra) {
  if (!MW.walk || !MW.ok || MW.castersF !== MW.frame || scene.__visF !== MW.frame) return scene;
  const up = (p) => { if (p === null) return false; if (p === scene) return true; let v = _up.get(p); if (v === undefined) _up.set(p, (v = p.visible === true && up(p.parent))); return v; };
  _up.clear();
  const R = (MW._root ??= { visible: true, layers: NO_LAYERS, children: [] }), L = R.children; L.length = 0;
  for (const o of MW.casters) if (up(o.parent)) L.push(o);
  if (extra) for (const o of extra) if (up(o.parent)) L.push(o);
  _up.clear();
  return R;
}

export class ShadowCache {
  // R: three's WebGLRenderer; sun: the DirectionalLight; area(): shadowcull's current Area (its root and proxies);
  // extra(): other static casters (the trees' BatchedMeshes)
  constructor(R, sun, area, extra = () => []) {
    this.R = R; this.sun = sun; this.area = area; this.extra = extra; this.enabled = true;
    this.quiet = () => true; this._inst = new WeakMap();
    this.cache = null; this.next = null; this.key = ''; this.stats = { full: 0, sliced: 0, swaps: 0, live: 0, bypass: 0 };
    this.layerCam = new THREE.Camera(); this.layerCam.layers.set(LAYER);
    this._r = new THREE.Vector3(); this._u = new THREE.Vector3(); this._t = new THREE.Vector3();
    const sm = R.shadowMap, base = sm.render.bind(sm);
    this.base = base;
    sm.render = (lights, scene, camera) => this.render(lights, scene, camera);
  }
  drop() { this.cache = null; this.next = null; }
  dispose() { for (const c of [this.cache, this.next]) c?.target.dispose(); this.cache = this.next = null; }

  // the static casters on show now: the area's shadow batches and the extra (tree) batches under its root
  statics(A) {
    const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible && p !== o) return false; return true; };
    const out = [...A.proxies];
    for (const b of this.extra()) if (b && b.visible && b.castShadow !== false && shown(b) && isUnder(b, A.root)) out.push(b);
    for (const E of this.still(A.root, (o) => o.visible && shown(o))) out.push(E.o);
    return out;
  }
  // (PERF-BATTERY-2) the area's instanced casters that have not changed since the area was first drawn
  still(root, shown) {
    let L = this._inst.get(root);
    if (!L) {
      L = [];
      root.traverse((o) => { if (o.isInstancedMesh && o.castShadow && this.quiet(o)) L.push({ o, m: o.matrixWorld.clone(), v: o.instanceMatrix.version, n: o.count, g: o.geometry, mat: o.material, s: shown(o) }); });
      this._inst.set(root, L);
    }
    let gone = false;
    for (const E of L) {
      const o = E.o;
      if (o.castShadow && o.matrixWorld.equals(E.m) && o.instanceMatrix.version === E.v && o.count === E.n && o.geometry === E.g && o.material === E.mat && shown(o) === E.s) continue;
      E.gone = gone = true;
    }
    if (gone) this._inst.set(root, (L = L.filter((E) => !E.gone)));
    return L.filter((E) => E.s);
  }

  render(lights, scene, camera) {
    const R = this.R, sm = R.shadowMap, sun = this.sun, sh = sun.shadow;
    if (!sm.enabled || (!sm.autoUpdate && !sm.needsUpdate) || !lights.length) return this.base(lights, scene, camera);
    const A = this.area();
    const ok = this.enabled && A && sh.map && sun.castShadow && lights.includes(sun) && sm.type !== THREE.VSMShadowMap
      && sh.mapSize.x <= MAX_MAP && sh.mapSize.x === sh.mapSize.y && sh.map.width === sh.mapSize.x && onShow(A.root) && !sun.parent?.parent && !sun.target.parent?.parent;
    if (!ok) { this.stats.bypass++; this.drop(); return this.base(lights, walkRoot(scene, A?.proxies), camera); }
    const S = this.statics(A);
    if (!S.length) { this.stats.bypass++; this.drop(); return this.base(lights, walkRoot(scene, A.proxies), camera); }
    const d = this._t.copy(sun.position).sub(sun.target.position).normalize();
    const cam = sh.camera, size = sh.mapSize.x, texel = (cam.right - cam.left) / size;
    const key = [A.root.uuid, S.length, S.map((o) => o.id).join(','), d.x.toFixed(5), d.y.toFixed(5), d.z.toFixed(5), size, cam.left, cam.right, cam.top, cam.bottom, cam.near, cam.far, sm.type, sh.map.texture.uuid].join('|');
    if (key !== this.key) { this.key = key; this.drop(); }
    // the live box's place on the texel lattice: u, v across the light, w along it
    const right = this._r.set(0, 1, 0).cross(d).normalize(), up = this._u.copy(d).cross(right).normalize();
    const T = sun.target.position, u = Math.round(T.dot(right) / texel), v = Math.round(T.dot(up) / texel), w = T.dot(d);
    const fits = (c) => c && Math.abs(u - c.u) <= MARGIN && Math.abs(v - c.v) <= MARGIN && Math.abs(w - c.w) < MAX_DEPTH_SHIFT;
    // the next cache: started once the window is half way to the edge, a slice a frame, swapped in when complete
    if (this.cache && !this.next && (Math.abs(u - this.cache.u) > MARGIN / 2 || Math.abs(v - this.cache.v) > MARGIN / 2 || Math.abs(w - this.cache.w) > MAX_DEPTH_SHIFT / 2)) { this.next = this.make(u, v, w, size, texel, this.spare); this.spare = null; }
    if (this.next && !this.next.done) { this.draw(this.next, lights, scene, S, this.next.slice, d, right, up); this.stats.sliced++; }
    if (this.next?.done && fits(this.next)) { const old = this.cache; this.cache = this.next; this.next = null; this.stats.swaps++; this.spare = old?.target; }
    if (!fits(this.cache)) {
      // (first frame in an area, or moved past the cache before the next was ready: all of it now)
      this.next = null;
      const c = this.make(u, v, w, size, texel, this.spare);
      this.spare = null;
      while (!c.done) this.draw(c, lights, scene, S, c.slice, d, right, up);
      this.cache = c; this.stats.full++;
    }
    this.live(lights, scene, camera, S, d, u, v);
  }

  make(u, v, w, size, texel, reuse = null) {
    const n = size + 2 * MARGIN;
    let target = reuse && reuse.width === n ? reuse : null;
    if (!target) { reuse?.dispose(); target = new THREE.WebGLRenderTarget(n, n, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }); target.texture.name = 'sun.shadowCache'; }
    return { u, v, w, size, texel, n, target, slice: 0, done: false };
  }

  // one slice of the static casters into cache c (slice 0 clears it), drawn by three's own shadow pass with the box
  // grown by the margin and centred on the cache's lattice point; only the static casters (layer LAYER) are drawn
  draw(c, lights, scene, S, k, d, right, up) {
    const R = this.R, sun = this.sun, sh = sun.shadow, cam = sh.camera;
    const map0 = sh.map, size0 = sh.mapSize.clone(), box0 = [cam.left, cam.right, cam.top, cam.bottom];
    const p0 = sun.position.clone(), t0 = sun.target.position.clone(), dist = p0.distanceTo(t0);
    const half = (c.n / 2) * c.texel;
    const K = Math.min(SLICES, S.length), from = Math.floor((S.length * k) / K), to = Math.floor((S.length * (k + 1)) / K);
    const cast = S.map((o) => o.castShadow);
    const clear = R.clear;
    try {
      S.forEach((o, i) => { o.layers.enable(LAYER); o.castShadow = i >= from && i < to; });
      sh.map = c.target; sh.mapSize.set(c.n, c.n);
      cam.left = -half; cam.right = half; cam.top = half; cam.bottom = -half; cam.updateProjectionMatrix();
      sun.target.position.copy(right).multiplyScalar(c.u * c.texel).addScaledVector(up, c.v * c.texel).addScaledVector(d, c.w);
      sun.position.copy(sun.target.position).addScaledVector(d, dist);
      sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
      if (k > 0) R.clear = function () { if (this.getRenderTarget() === c.target) return; return clear.apply(this, arguments); };
      sh.needsUpdate = true; this.base([sun], scene, this.layerCam);
    } finally {
      R.clear = clear;
      S.forEach((o, i) => { o.castShadow = cast[i]; });
      sh.map = map0; sh.mapSize.copy(size0);
      [cam.left, cam.right, cam.top, cam.bottom] = box0; cam.updateProjectionMatrix();
      sun.position.copy(p0); sun.target.position.copy(t0); sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
    }
    c.slice = k + 1; if (c.slice >= K) c.done = true;
  }

  // the frame's map: the cache's window blitted in place of three's clear, then only the casters that may move
  live(lights, scene, camera, S, d, u, v) {
    const R = this.R, sun = this.sun, sh = sun.shadow, c = this.cache, gl = R.getContext();
    const p0 = sun.position.clone(), t0 = sun.target.position.clone();
    const cast = S.map((o) => o.castShadow), clear = R.clear, P = R.properties;
    const sx = MARGIN + (u - c.u), sy = MARGIN + (v - c.v), n = c.size;
    try {
      for (const o of S) o.castShadow = false;
      // (the cache's depth along the light: the same comparisons, offset as in the cache)
      const shift = c.w - sun.target.position.dot(d);
      sun.position.addScaledVector(d, shift); sun.target.position.addScaledVector(d, shift);
      sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
      R.clear = function () {
        if (this.getRenderTarget() !== sh.map) return clear.apply(this, arguments);
        const src = P.get(c.target).__webglFramebuffer, dst = P.get(sh.map).__webglFramebuffer;
        if (!src || !dst) return clear.apply(this, arguments);
        // (through three's state, as its own MSAA resolve does, so its record of the bindings stays true; the draw
        //  framebuffer is the map's already: setRenderTarget)
        R.state.bindFramebuffer(gl.READ_FRAMEBUFFER, src);
        gl.blitFramebuffer(sx, sy, sx + n, sy + n, 0, 0, n, n, (sh.map.isHwShadow ? 0 : gl.COLOR_BUFFER_BIT) | gl.DEPTH_BUFFER_BIT, gl.NEAREST);   // (GFX-LOOK: a hardware-compared map (renderer.js HwShadowTarget) is read from its depth only: its colour is not copied)
        R.state.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
      };
      this.base(lights, walkRoot(scene, null), camera);   // (the static casters are in the cache: not drawn here)
      this.stats.live++;
    } finally {
      R.clear = clear;
      S.forEach((o, i) => { o.castShadow = cast[i]; });
      sun.position.copy(p0); sun.target.position.copy(t0); sun.updateMatrixWorld(); sun.target.updateMatrixWorld();
    }
  }
}
function isUnder(o, root) { for (let p = o; p; p = p.parent) if (p === root) return true; return false; }
function onShow(o) { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }
