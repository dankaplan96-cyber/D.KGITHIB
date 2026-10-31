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

const MARGIN = 64, SLICES = 3, SLICES_MAX = 8, LAYER = 31, MAX_MAP = 2048, MAX_DEPTH_SHIFT = 20;

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
    try { this.primeCopy(); } catch (e) { console.warn('shadow cache: depth copy by draw unavailable', e); this.depthCopy = 'blit'; }
  }
  // (PERF-SUBMIT: a dropped cache's render target is kept for the next build — or freed — instead of left behind: each
  //  drop used to leave its (map + 2 × 64)² colour and depth target on the GPU, never disposed, and the next full build
  //  made a new one: a texture more and ~20–40 MB of GPU memory at each scene change, uploaded in that frame)
  // ROTATE-STALL: and kept, not freed, when a spare is already there (a second spare, `spare2`): the cache never needs more
  // than two targets (the cache and the next one), and at every scene change the dropped cache's target was freed while
  // the full build took the spare and made a new spare — a (map + 128)² colour and depth target freed and made again
  // at each door (the arrival route: "2 × 1152² render target" textures on the new area's first frame)
  drop() {
    for (const c of [this.cache, this.next]) { const t = c?.target; if (!t || t === this.spare || t === this.spare2) continue; this.keep(t); }
    this.cache = null; this.next = null;
  }
  keep(t) { if (!this.spare) this.spare = t; else if (!this.spare2 && this.pool2 !== false) this.spare2 = t; else t.dispose(); }   // (pool2 false: one spare, as before)
  dispose() { for (const c of [this.cache, this.next]) c?.target.dispose(); this.spare?.dispose(); this.spare2?.dispose(); this.cache = this.next = this.spare = this.spare2 = null; }

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
    // (PERF-SUBMIT: the casters' ids compared one by one with the last frame's, not joined into a string every frame)
    const ids = (this._ids ??= []); let same = ids.length === S.length;
    for (let i = 0; same && i < S.length; i++) if (ids[i] !== S[i].id) same = false;
    if (!same) { ids.length = S.length; for (let i = 0; i < S.length; i++) ids[i] = S[i].id; }
    const key = [A.root.uuid, d.x.toFixed(5), d.y.toFixed(5), d.z.toFixed(5), size, cam.left, cam.right, cam.top, cam.bottom, cam.near, cam.far, sm.type, sh.map.texture.uuid].join('|');
    // (ROTATE-STALL: a drop of a built cache counted with its cause — the static casters' list, or the key: area, sun,
    //  box, map — for the benchmark's hitch notes)
    if (!same || key !== this.key) { if (this.cache || this.next) { this.stats.drops = (this.stats.drops || 0) + 1; this.dropWhy = !same ? 'casters changed' : key.split('|')[0] !== this.key.split('|')[0] ? 'area' : 'sun / box / map'; } this.key = key; this.drop(); }
    // the live box's place on the texel lattice: u, v across the light, w along it
    const right = this._r.set(0, 1, 0).cross(d).normalize(), up = this._u.copy(d).cross(right).normalize();
    const T = sun.target.position, u = Math.round(T.dot(right) / texel), v = Math.round(T.dot(up) / texel), w = T.dot(d);
    const fits = (c) => c && Math.abs(u - c.u) <= MARGIN && Math.abs(v - c.v) <= MARGIN && Math.abs(w - c.w) < MAX_DEPTH_SHIFT;
    // the next cache: started once the window is half way to the edge, a slice a frame, swapped in when complete
    // (PERF-SUBMIT, smoothness: the next cache in as many slices as the window's speed allows — up to SLICES_MAX, each
    //  frame's share of the static casters smaller: at walking pace a slice frame drew a third of them, a regular bump
    //  in the frame time; a fast mover (glider, jetpack) still gets it done in time with fewer, as before)
    const du = this._lu === undefined ? 0 : Math.max(Math.abs(u - this._lu), Math.abs(v - this._lv)); this._lu = u; this._lv = v;
    this._rate = du > MARGIN ? this._rate || 0 : 0.8 * (this._rate || 0) + 0.2 * du;
    if (this.cache && !this.next && (Math.abs(u - this.cache.u) > MARGIN / 2 || Math.abs(v - this.cache.v) > MARGIN / 2 || Math.abs(w - this.cache.w) > MAX_DEPTH_SHIFT / 2)) {
      this.next = this.make(u, v, w, size, texel, this.spare); this.spare = null;
      this.next.K = Math.max(SLICES, Math.min(this.maxSlices ?? SLICES_MAX, Math.floor(MARGIN / 4 / Math.max(this._rate, 0.5))));
    }
    if (this.next && !this.next.done) { this.draw(this.next, lights, scene, S, this.next.slice, d, right, up); this.stats.sliced++; }
    if (this.next?.done && fits(this.next)) { const old = this.cache; this.cache = this.next; this.next = null; this.stats.swaps++; this.spare = old?.target; }
    if (!fits(this.cache)) {
      // (first frame in an area, or moved past the cache before the next was ready: all of it now)
      // (PERF-SUBMIT: the unfinished next cache's and the old cache's targets are reused or freed, not left behind)
      const old = [this.next?.target, this.cache?.target].filter((t) => t && t !== this.spare);
      this.next = null;
      const c = this.make(u, v, w, size, texel, this.spare ?? old.shift() ?? null);
      this.spare = null; c.K = 1;   // (PERF-SUBMIT: all in one pass — it was drawn in SLICES passes within this frame)
      while (!c.done) this.draw(c, lights, scene, S, c.slice, d, right, up);
      this.cache = c; this.stats.full++;
      for (const t of old) if (t !== c.target) this.keep(t);
      if (!this.spare && this.spare2) { this.spare = this.spare2; this.spare2 = null; }
      // PERF-GPU: the target the next cache will be drawn into is made now, with this one (a full build: normally a
      // scene change, behind its black), not later on a frame in view when the window reaches half way (laptop 0.40.x:
      // the first street route's ~1.35 s hitch was a frame with "shadow cache rebuilt, +1 textures on the GPU")
      // ROTATE-STALL: and its GPU storage made now too. A render target's textures are allocated when it is first bound,
      // so the spare made here got its (map + 2 × 64)² colour and depth on the first slice of the next cache: a frame in
      // view, as soon as Twinsen had walked half the margin (the street's circle walk: "+2 textures, 1 render target" on
      // that frame, the first time only)
      if (!this.spare) { this.spare = this.make(0, 0, 0, size, texel).target; if (this.initSpare !== false) this.initTarget(this.spare); }   // (initSpare false: as before, the A/B switch)
    }
    this.live(lights, scene, camera, S, d, u, v);
  }

  make(u, v, w, size, texel, reuse = null) {
    const n = size + 2 * MARGIN, hw = this.copyByDraw();
    let target = reuse && reuse.width === n && !!reuse.depthTexture === hw ? reuse : null;
    if (!target) {
      reuse?.dispose();
      // (PERF-GPU: with a depth texture when its depth is copied into the live map by a draw: copyDepth)
      target = new THREE.WebGLRenderTarget(n, n, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthTexture: hw ? new THREE.DepthTexture(n, n, THREE.UnsignedIntType) : null });
      target.texture.name = 'sun.shadowCache';
    }
    return { u, v, w, size, texel, n, target, slice: 0, done: false, K: SLICES };
  }
  // (ROTATE-STALL) a target's GPU storage made now (three's initRenderTarget: its framebuffer and textures, nothing drawn)
  initTarget(t) { try { this.R.initRenderTarget?.(t); } catch (e) { console.warn('shadow cache: target init', e); } }
  // (PERF-GPU) the live map gets the cache's depth by a draw (copyDepth) when the map is the renderer's hardware-compared
  // one (renderer.js HwShadowTarget: its depth is a texture, its colour unused); `depthCopy = 'blit'`: the blit, as before
  copyByDraw() { const m = this.sun.shadow.map; return this.depthCopy !== 'blit' && !!this._copy && (!m || !!m.isHwShadow); }

  // one slice of the static casters into cache c (slice 0 clears it), drawn by three's own shadow pass with the box
  // grown by the margin and centred on the cache's lattice point; only the static casters (layer LAYER) are drawn
  draw(c, lights, scene, S, k, d, right, up) {
    const R = this.R, sun = this.sun, sh = sun.shadow, cam = sh.camera;
    const map0 = sh.map, size0 = sh.mapSize.clone(), box0 = [cam.left, cam.right, cam.top, cam.bottom];
    const p0 = sun.position.clone(), t0 = sun.target.position.clone(), dist = p0.distanceTo(t0);
    const half = (c.n / 2) * c.texel;
    const K = Math.max(1, Math.min(c.K, S.length)), from = Math.floor((S.length * k) / K), to = Math.floor((S.length * (k + 1)) / K);
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
      // (PERF-SUBMIT, tried and left off — `sliceWalk = true`: the pass walking the static casters themselves instead of
      //  the whole scene changed the arrival's pixels (samepix.mjs: the scene walk also draws other objects on the
      //  cache's layer; under investigation, cachedraws.mjs): the scene walk, as before)
      const root = this.sliceWalk !== true ? scene : (this._sroot ??= { visible: true, layers: NO_LAYERS, children: null });
      if (root !== scene) root.children = S;
      sh.needsUpdate = true; this.base([sun], root, this.layerCam);
      if (root !== scene) root.children = null;
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
      const byDraw = !!(sh.map.isHwShadow && c.target.depthTexture && this.copyByDraw()), self = this;
      R.clear = function () {
        if (this.getRenderTarget() !== sh.map) return clear.apply(this, arguments);
        if (byDraw) return self.copyDepth(c, sx, sy, n);
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
// PERF-GPU: the cache's window copied into the live map's depth by one draw over the map that writes the depth it
// reads (colour off, depth test always), instead of a framebuffer blit of a depth sub-rectangle: Direct3D 11 copies a
// depth resource whole or not at all, so ANGLE emulates that blit (the laptop's "shadow map kept" −1.6 ms and the
// first build's ~1.3 s stall point at it; neither is proven yet: benchgpu.js 'shadow cache copy by blit (as before)').
// Same depth (a 24-bit depth read as a float and written back); the moving casters are then drawn over it with the depth
// test, as before. It runs inside three's shadow pass (its clear of the live map: the map bound, its viewport set,
// colour masked), drawn with three's own renderBufferDirect as the pass draws its casters, so three's state stays true.
const COPY_VS = `varying vec2 vUv; void main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4( position.xy, 0.0, 1.0 ); }`;
const COPY_FS = `uniform sampler2D tDepth; uniform vec2 uOff; uniform vec2 uScale; varying vec2 vUv; void main() { gl_FragDepth = texture2D( tDepth, uOff + vUv * uScale ).r; }`;
// the copy's material and triangle, and one ordinary render of it into a 1×1 target at startup: three uploads a
// geometry's buffers in its render walk, which renderBufferDirect alone skips (without this the copy drew nothing)
ShadowCache.prototype.primeCopy = function () {
  const mat = new THREE.ShaderMaterial({ uniforms: { tDepth: { value: null }, uOff: { value: new THREE.Vector2() }, uScale: { value: new THREE.Vector2(1, 1) } }, vertexShader: COPY_VS, fragmentShader: COPY_FS,
    depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth, colorWrite: false, blending: THREE.NoBlending, side: THREE.DoubleSide, fog: false, lights: false });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));   // (one triangle over the map)
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
  const R = this.R, rt = new THREE.WebGLRenderTarget(1, 1, { depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType) }), sc = new THREE.Scene(), prev = R.getRenderTarget();
  sc.add(mesh);
  try { R.setRenderTarget(rt); R.render(sc, new THREE.Camera()); } finally { R.setRenderTarget(prev); sc.remove(mesh); rt.depthTexture.dispose(); rt.dispose(); }
  this._copy = { mat, geo, mesh };
};
ShadowCache.prototype.copyDepth = function (c, sx, sy, n) {
  const { mat, geo, mesh } = this._copy, U = mat.uniforms;
  U.tDepth.value = c.target.depthTexture; U.uOff.value.set(sx / c.n, sy / c.n); U.uScale.value.set(n / c.n, n / c.n);
  this.R.renderBufferDirect(this.sun.shadow.camera, null, geo, mat, mesh, null);
  this.stats.copies = (this.stats.copies || 0) + 1;
};
function isUnder(o, root) { for (let p = o; p; p = p.parent) if (p === root) return true; return false; }
function onShow(o) { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }
