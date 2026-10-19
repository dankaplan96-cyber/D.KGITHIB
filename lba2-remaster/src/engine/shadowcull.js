// Shadow pass and small-prop culling (PERF-IGPU). On the user's laptop the frame is bound by draw-call
// submission, and the sun's shadow pass drew every caster within ±36–48 m of Twinsen, one call each.
//
// 1. Static shadow batches. The static casters under the current area's root (not skinned, instanced, batched or
//    alpha-tested) are merged, per 24 m cell, into one depth-only geometry each. These batches are drawn in the
//    shadow pass only: they are invisible while the frame's main render list is built, made visible by the sun's
//    shadow setup (DirectionalLightShadow.updateMatrices, called right before the shadow pass draws), and hidden
//    again when the frame is done (scene.onAfterRender). The originals stop casting. A cell is a handful of calls
//    where its pieces were dozens; the shadows are the same geometry, so they look the same.
//    Pieces are watched (a quarter of them each frame): one that moves, or is hidden or shown, leaves its batch
//    (the cell is rebuilt) and casts on its own again from then on (doors, boats, rising stones, story toggles).
// 2. View test. A caster (a batch, or a piece casting on its own) casts only while the shadow it can throw (its
//    bounding sphere grown by its size / tan(sun elevation), moved half that down-sun) touches the view frustum.
// 3. Small props (under 2 m) casting on their own: no shadow beyond SMALL_FAR[preset] from the focus.
// 4. Distance detail (Medium, Low): a static piece drawn smaller than MIN_PX pixels on screen is left out of both
//    passes (through its layers; the game's own `visible` flags are untouched). Never within KEEP_NEAR of the focus
//    (PERF-2): a door's handle, a hinge or a frame by Twinsen stays drawn whatever its size on screen.
//    PERF-2: the same rule for the pieces that cast no shadow, or cast one on their own (pots, flowers, small signs,
//    window panes, bolts: the stragglers a merge leaves alone), half of them tested per frame (its size on screen
//    only changes with distance, so a turning camera never sees one late).
import * as THREE from 'three';

export const SMALL_FAR = { high: 24, medium: 18, low: 18 };
export const MIN_PX = { high: 0, medium: 4, low: 7 };
const SMALL_R = 2, CELL = 24, KEEP_NEAR = 16;
const _f = new THREE.Frustum(), _m = new THREE.Matrix4(), _s = new THREE.Sphere(), _c = new THREE.Vector3(), _v = new THREE.Vector3();

// may this mesh's shadow be drawn by a merged, material-less batch?
const batchable = (o) => {
  if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || o.isBatchedMesh || Array.isArray(o.material) || o.customDepthMaterial) return false;
  const m = o.material, g = o.geometry;
  if (!m || m.alphaTest > 0 || m.alphaHash || m.displacementMap || (g.morphAttributes && Object.keys(g.morphAttributes).length)) return false;
  return !!g.attributes.position;
};
// shown (this and every parent up to the root), and on layer 0
const shownIn = (o, root) => { for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return false; return true; };

class Area {
  constructor(root) {
    this.root = root; this.cells = new Map(); this.members = []; this.solo = []; this.proxies = []; this.tick = 0; this.quiet = [];
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    this.inv = inv;
    // (distance detail for a piece that is not a member: a plain mesh, culled by its own bounds as three does)
    const quiet = (o, C) => { if (!o.isSkinnedMesh && !o.isInstancedMesh && !o.isBatchedMesh && o.frustumCulled !== false && Number.isFinite(C.r)) this.quiet.push(C); };
    root.traverse((o) => {
      if (!o.isMesh || o.userData.shadowProxy) return;
      const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
      if (!g.boundingSphere || !Number.isFinite(g.boundingSphere.radius)) return;
      const C = { o, c: g.boundingSphere.center, r: g.boundingSphere.radius, on: true, shown: true };
      if (!o.castShadow) { quiet(o, C); return; }
      if (!batchable(o) || !shownIn(o, root) || !o.matrixWorld.elements.every(Number.isFinite)) { if (!o.isSkinnedMesh && !o.isInstancedMesh && !o.isBatchedMesh) { this.solo.push(C); quiet(o, C); } return; }
      _c.copy(C.c).applyMatrix4(o.matrixWorld);
      const m = o.material, side = m.side + '|' + m.shadowSide;
      const key = Math.floor(_c.x / CELL) + ',' + Math.floor(_c.z / CELL) + '|' + side;
      let cell = this.cells.get(key);
      if (!cell) { cell = { key, side: m.side, shadowSide: m.shadowSide, list: [], mesh: null, dirty: true }; this.cells.set(key, cell); }
      C.cell = cell; C.mat = o.matrixWorld.clone();
      cell.list.push(C); this.members.push(C);
      o.castShadow = false;
    });
    for (const cell of this.cells.values()) this.build(cell);
  }
  build(cell) {
    if (cell.mesh) { cell.mesh.geometry.dispose(); this.root.remove(cell.mesh); this.proxies.splice(this.proxies.indexOf(cell.mesh), 1); cell.mesh = null; }
    cell.dirty = false;
    if (!cell.list.length) return;
    let nv = 0, ni = 0;
    for (const C of cell.list) { const g = C.o.geometry; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const pos = new Float32Array(nv * 3), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    for (const C of cell.list) {
      const g = C.o.geometry, P = g.attributes.position;
      _m.multiplyMatrices(this.inv, C.o.matrixWorld);
      const flip = _m.determinant() < 0;
      for (let i = 0; i < P.count; i++) {
        _v.fromBufferAttribute(P, i);
        if (!(Number.isFinite(_v.x) && Number.isFinite(_v.y) && Number.isFinite(_v.z))) _v.set(0, 0, 0); // (a few builder vertices are NaN: degenerate there, harmless in the original, not in a merged bound)
        _v.applyMatrix4(_m); if (!Number.isFinite(_v.x + _v.y + _v.z)) _v.set(0, 0, 0);
        pos[(vo + i) * 3] = _v.x; pos[(vo + i) * 3 + 1] = _v.y; pos[(vo + i) * 3 + 2] = _v.z;
      }
      if (g.index) { const I = g.index; for (let i = 0; i < I.count; i += 3) { idx[io + i] = I.getX(i) + vo; idx[io + i + 1] = I.getX(flip ? i + 2 : i + 1) + vo; idx[io + i + 2] = I.getX(flip ? i + 1 : i + 2) + vo; } io += I.count; }
      else { for (let i = 0; i < P.count; i += 3) { idx[io + i] = vo + i; idx[io + i + 1] = vo + (flip ? i + 2 : i + 1); idx[io + i + 2] = vo + (flip ? i + 1 : i + 2); } io += P.count; }
      vo += P.count;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: cell.side, shadowSide: cell.shadowSide, colorWrite: false, depthWrite: false }));
    mesh.castShadow = true; mesh.receiveShadow = false; mesh.visible = false; mesh.name = 'shadowBatch';
    mesh.userData.shadowProxy = true; mesh.matrixAutoUpdate = false;
    this.root.add(mesh); mesh.updateMatrixWorld(true);
    cell.mesh = mesh; this.proxies.push(mesh);
    cell.c = geo.boundingSphere.center; cell.r = geo.boundingSphere.radius;
  }
  // a quarter of the batched pieces per frame: moved, hidden or shown → out of its batch, casting on its own
  watch() {
    const n = this.members.length; if (!n) return;
    const q = Math.ceil(n / 4), from = (this.tick++ % 4) * q;
    for (let i = from; i < Math.min(n, from + q); i++) {
      const C = this.members[i]; if (!C || C.solo) continue;
      if (C.o.matrixWorld.equals(C.mat) && shownIn(C.o, this.root) && C.o.parent) continue;
      C.solo = true; C.o.castShadow = true; C.cell.dirty = true;
      C.cell.list.splice(C.cell.list.indexOf(C), 1);
      this.solo.push(C);
    }
    for (const cell of this.cells.values()) if (cell.dirty) this.build(cell);
  }
  restore() {
    for (const C of this.members) { if (!C.solo) C.o.castShadow = true; C.o.layers.enable(0); }
    for (const C of this.quiet) C.o.layers.enable(0);
    for (const C of this.solo) { C.o.castShadow = true; C.o.layers.enable(0); }
    for (const p of this.proxies) { p.geometry.dispose(); this.root.remove(p); }
  }
}

export class ShadowCull {
  constructor(sunDir, sun = null, scene = null) {
    this.sunDir = sunDir; this.areas = new Map(); this.area = null; this.quality = 'high'; this.enabled = true; this.batching = true;
    // the batches show for the shadow pass only (see the header)
    if (sun) {
      const sh = sun.shadow, base = sh.updateMatrices.bind(sh);
      sh.updateMatrices = (...a) => { if (this.area && this.batching) for (const p of this.area.proxies) p.visible = true; return base(...a); };
    }
    if (scene) {
      const after = scene.onAfterRender;
      scene.onAfterRender = (...a) => { this.hide(); return after.apply(scene, a); };
    }
  }
  hide() { if (this.area) for (const p of this.area.proxies) p.visible = false; }
  // (all pieces cast on their own again; batches removed: the benchmark's comparisons, or switching it off)
  reset() { for (const A of this.areas.values()) A.restore(); this.areas.clear(); this.area = null; }
  update(root, camera, focus) {
    if (!this.enabled || !root) { if (this.areas.size) this.reset(); return; }
    let A = this.areas.get(root);
    if (!A) { A = new Area(root); this.areas.set(root, A); }
    this.area = A;
    this.hide();
    A.watch();
    camera.updateMatrixWorld();
    _f.setFromProjectionMatrix(_m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse.copy(camera.matrixWorld).invert()));
    const d = this.sunDir, horiz = Math.hypot(d.x, d.z) || 1, slope = d.y > 0.05 ? horiz / d.y : 4;
    const far = SMALL_FAR[this.quality] ?? 24, minPx = MIN_PX[this.quality] ?? 0;
    const pxK = (typeof innerHeight === 'number' ? innerHeight : 720) / (2 * Math.tan(((camera.fov || 55) * Math.PI) / 360)), cam = camera.position;
    // does the shadow of a sphere (centre c, radius r, world) reach the view?
    const reaches = (c, r) => {
      const len = 2 * r * slope;
      _s.center.set(c.x - (d.x / horiz) * len * 0.5, c.y, c.z - (d.z / horiz) * len * 0.5);
      _s.radius = r + len * 0.5 + 0.5;
      return _f.intersectsSphere(_s);
    };
    // the batches
    for (const cell of A.cells.values()) {
      const p = cell.mesh; if (!p) continue;
      _c.copy(cell.c).applyMatrix4(p.matrixWorld);
      p.castShadow = reaches(_c, cell.r);
    }
    // pieces casting on their own
    for (const C of A.solo) {
      const o = C.o;
      _c.copy(C.c).applyMatrix4(o.matrixWorld);
      const r = C.r * o.matrixWorld.getMaxScaleOnAxis();
      let on = reaches(_c, r);
      if (on && r < SMALL_R && focus) { const dist = Math.hypot(focus.x - _c.x, focus.z - _c.z); on = C.on ? dist < far + 2 : dist < far - 2; }
      C.on = on; o.castShadow = on;
    }
    // distance detail (both passes) for the static pieces
    if (minPx || A.pxOn) {
      A.pxOn = !!minPx;
      for (const C of A.members) {
        const o = C.o;
        let shown = true;
        if (minPx) {
          _c.copy(C.c).applyMatrix4(o.matrixWorld);
          const px = (C.r * o.matrixWorld.getMaxScaleOnAxis() * pxK) / Math.max(0.1, _c.distanceTo(cam));
          shown = !(px >= 0) || (focus && Math.hypot(focus.x - _c.x, focus.z - _c.z) < KEEP_NEAR) || (C.shown ? px > minPx * 0.85 : px > minPx);
        }
        if (shown !== C.shown) { C.shown = shown; if (shown) o.layers.enable(0); else o.layers.disable(0); }
      }
      const Q = A.quiet, step = minPx ? 2 : 1;   // (all at once when the detail is switched off: everything shows again)
      for (let i = minPx ? A.tick & 1 : 0; i < Q.length; i += step) {
        const C = Q[i], o = C.o;
        let shown = true;
        if (minPx) {
          _c.copy(C.c).applyMatrix4(o.matrixWorld);
          const px = (C.r * o.matrixWorld.getMaxScaleOnAxis() * pxK) / Math.max(0.1, _c.distanceTo(cam));
          // (bounds that aren't finite — a builder's stray NaN vertex — can't be judged: drawn as before)
          shown = !(px >= 0) || (focus && Math.hypot(focus.x - _c.x, focus.z - _c.z) < KEEP_NEAR) || (C.shown ? px > minPx * 0.85 : px > minPx);
        }
        if (shown !== C.shown) { C.shown = shown; if (shown) o.layers.enable(0); else o.layers.disable(0); }
      }
    }
  }
}
