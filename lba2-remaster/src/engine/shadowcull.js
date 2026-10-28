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
//    PERF-BATTERY: a piece larger than half a cell goes into the cells its TRIANGLES are in (each triangle by its
//    centre), not whole into the cell of its own centre; cells are 16 m (were 24). Citadel's builders merge whole quarters into single meshes (up to 74 m across, 34k
//    triangles), so a cell holding one drew it all whenever any part of it reached the ±36 m shadow box: 352k
//    triangles a frame in the shadow pass on the street at Medium. Now each cell's batch is about one cell across and
//    the shadow camera's own culling and the view test leave out the parts it cannot see. The same triangles are drawn
//    wherever they can reach the map, so the shadows are the same.
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
const SMALL_R = 2, CELL = 16, KEEP_NEAR = 16, FRESH = 60;
// PERF-HIGH: High draws its 4096 map live every frame (shadowcache.js leaves maps over 2048 out), and on the user's
// Vega 8 plugged in that preset is bound by the processor on the street (laptop-build228-plugged.txt: submit 14.9 ms,
// 79 of 238 calls in the shadow pass). With 32 m cells its ±48 m box holds about half as many batches: on the street
// route 38 → 19 shadow-batch calls for +77k depth-only triangles (854k → 931k a frame). The same casters into the same
// map: the shadows look the same. Medium and Low (their static casters are cached: shadowcache.js) keep 16 m.
export const cellFor = (quality) => (quality === 'high' ? 32 : CELL);
const _f = new THREE.Frustum(), _m = new THREE.Matrix4(), _s = new THREE.Sphere(), _c = new THREE.Vector3(), _v = new THREE.Vector3();
const _b = new THREE.Box3(), _pts = Array.from({ length: 16 }, () => new THREE.Vector3()), _sf = new THREE.Frustum(), _sm = new THREE.Matrix4();
const SWEEP_DROP = 8;
// all of pts[0..n) outside one plane of the frustum: the hull of the points is outside it
function outside(F, pts, n) {
  for (const P of F.planes) { let i = 0; while (i < n && P.distanceToPoint(pts[i]) < -0.05) i++; if (i === n) return true; }
  return false;
}

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
  constructor(root, cell = CELL) {
    this.root = root; this.cell = cell; this.cells = new Map(); this.members = []; this.solo = []; this.proxies = []; this.tick = 0; this.quiet = []; this.ids = 0;
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
      const m = o.material;
      C.side = m.side; C.shadowSide = m.shadowSide; C.mat = o.matrixWorld.clone();
      this.assign(C);
      this.members.push(C);
      o.castShadow = false;
    });
    for (const cell of this.cells.values()) this.build(cell);
  }
  // PERF-BATTERY: the cells a piece's triangles go to. A piece up to half a cell across goes whole into the cell of its
  // centre (as before); a larger one triangle by triangle, each to the cell of its own centre. C.parts: cell id →
  // the piece's triangles there (null: all of them); C.cells: those cells.
  assign(C) {
    const o = C.o, g = o.geometry, I = g.index, P = g.attributes.position, nt = Math.floor((I ? I.count : P.count) / 3), side = C.side + '|' + C.shadowSide;
    const W = o.matrixWorld, cellAt = (x, z) => {
      const key = Math.floor(x / this.cell) + ',' + Math.floor(z / this.cell) + '|' + side;
      let cell = this.cells.get(key);
      if (!cell) { cell = { key, id: this.ids++, side: C.side, shadowSide: C.shadowSide, list: [], mesh: null, dirty: true }; this.cells.set(key, cell); }
      return cell;
    };
    C.cells = []; C.parts = new Map();
    _c.copy(C.c).applyMatrix4(W);
    if (C.r * W.getMaxScaleOnAxis() <= this.cell * 0.5 || !Number.isFinite(_c.x + _c.z)) {
      const cell = cellAt(Number.isFinite(_c.x) ? _c.x : 0, Number.isFinite(_c.z) ? _c.z : 0);
      C.parts.set(cell.id, null); C.cells.push(cell); cell.list.push(C);
      return;
    }
    const lists = new Map(), cx = _c.x, cz = _c.z;
    for (let t = 0; t < nt; t++) {
      let x = 0, z = 0;
      for (let j = 0; j < 3; j++) { _v.fromBufferAttribute(P, I ? I.getX(t * 3 + j) : t * 3 + j).applyMatrix4(W); x += _v.x; z += _v.z; }
      x /= 3; z /= 3;
      if (!Number.isFinite(x + z)) { x = cx; z = cz; }
      const cell = cellAt(x, z);
      let L = lists.get(cell); if (!L) { L = []; lists.set(cell, L); }
      L.push(t);
    }
    for (const [cell, L] of lists) { C.parts.set(cell.id, Int32Array.from(L)); C.cells.push(cell); cell.list.push(C); }
  }
  build(cell) {
    if (cell.mesh) { cell.mesh.geometry.dispose(); this.root.remove(cell.mesh); this.proxies.splice(this.proxies.indexOf(cell.mesh), 1); cell.mesh = null; }
    cell.dirty = false;
    if (!cell.list.length) return;
    // this cell's triangles of each piece, their vertices renumbered (a whole piece: as they are)
    const parts = [];
    let nv = 0, ni = 0;
    for (const C of cell.list) {
      const g = C.o.geometry, I = g.index, T = C.parts.get(cell.id), cnt = g.attributes.position.count;
      if (T === undefined) continue;
      if (T === null) { parts.push({ C, T, map: null, from: null, vo: nv }); nv += cnt; ni += I ? I.count - (I.count % 3) : cnt - (cnt % 3); continue; }
      const map = new Int32Array(cnt).fill(-1), from = [];
      for (let k = 0; k < T.length; k++) for (let j = 0; j < 3; j++) { const v = I ? I.getX(T[k] * 3 + j) : T[k] * 3 + j; if (map[v] < 0) { map[v] = from.length; from.push(v); } }
      parts.push({ C, T, map, from, vo: nv }); nv += from.length; ni += T.length * 3;
    }
    if (!ni) return;
    const pos = new Float32Array(nv * 3), idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let io = 0;
    // (a few builder vertices are NaN: degenerate there, harmless in the original, not in a merged bound: at the origin)
    const put = (P, i, k) => {
      _v.fromBufferAttribute(P, i);
      if (!(Number.isFinite(_v.x) && Number.isFinite(_v.y) && Number.isFinite(_v.z))) _v.set(0, 0, 0);
      _v.applyMatrix4(_m); if (!Number.isFinite(_v.x + _v.y + _v.z)) _v.set(0, 0, 0);
      pos[k * 3] = _v.x; pos[k * 3 + 1] = _v.y; pos[k * 3 + 2] = _v.z;
    };
    for (const { C, T, map, from, vo } of parts) {
      const g = C.o.geometry, I = g.index, P = g.attributes.position;
      _m.multiplyMatrices(this.inv, C.o.matrixWorld);
      const flip = _m.determinant() < 0;
      if (!T) {
        for (let i = 0; i < P.count; i++) put(P, i, vo + i);
        const n = I ? I.count - (I.count % 3) : P.count - (P.count % 3);
        for (let i = 0; i < n; i += 3) {
          const a = I ? I.getX(i) : i, b = I ? I.getX(i + 1) : i + 1, c = I ? I.getX(i + 2) : i + 2;
          idx[io] = a + vo; idx[io + 1] = (flip ? c : b) + vo; idx[io + 2] = (flip ? b : c) + vo; io += 3;
        }
        continue;
      }
      for (let k = 0; k < from.length; k++) put(P, from[k], vo + k);
      for (let k = 0; k < T.length; k++) {
        const t = T[k], a = I ? I.getX(t * 3) : t * 3, b = I ? I.getX(t * 3 + 1) : t * 3 + 1, c = I ? I.getX(t * 3 + 2) : t * 3 + 2;
        idx[io] = map[a] + vo; idx[io + 1] = map[flip ? c : b] + vo; idx[io + 2] = map[flip ? b : c] + vo; io += 3;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeBoundingSphere(); geo.computeBoundingBox();
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: cell.side, shadowSide: cell.shadowSide, colorWrite: false, depthWrite: false }));
    mesh.castShadow = true; mesh.receiveShadow = false; mesh.visible = false; mesh.name = 'shadowBatch';
    mesh.userData.shadowProxy = true; mesh.matrixAutoUpdate = false;
    this.root.add(mesh); mesh.updateMatrixWorld(true);
    cell.mesh = mesh; this.proxies.push(mesh);
    cell.c = geo.boundingSphere.center; cell.r = geo.boundingSphere.radius; cell.box = geo.boundingBox;
  }
  // a quarter of the batched pieces per frame: moved, hidden or shown → out of its batch, casting on its own
  // (PERF-BATTERY: all of them on each of an area's first FRESH updates: a piece that starts moving on arrival — a
  //  mill, a lift — leaves on the first frame, still behind the scene change's black, not a few frames into the fade)
  watch() {
    const n = this.members.length; if (!n) return;
    const all = this.tick < FRESH, q = all ? n : Math.ceil(n / 4), from = all ? 0 : (this.tick % 4) * q;
    this.tick++;
    for (let i = from; i < Math.min(n, from + q); i++) {
      const C = this.members[i]; if (!C || C.solo) continue;
      if (C.o.matrixWorld.equals(C.mat) && shownIn(C.o, this.root) && C.o.parent) continue;
      C.solo = true; C.o.castShadow = true;
      for (const cell of C.cells) { cell.dirty = true; cell.list.splice(cell.list.indexOf(C), 1); }
      this.solo.push(C);
    }
    for (const cell of this.cells.values()) if (cell.dirty) this.build(cell);
  }
  restore() {
    const on = (o) => { if (!o.userData.drawBatched) o.layers.enable(0); };   // (a draw batch's piece stays out of the main pass)
    for (const C of this.members) { if (!C.solo) C.o.castShadow = true; on(C.o); }
    for (const C of this.quiet) on(C.o);
    for (const C of this.solo) { C.o.castShadow = true; on(C.o); }
    for (const p of this.proxies) { p.geometry.dispose(); this.root.remove(p); }
  }
}

export class ShadowCull {
  constructor(sunDir, sun = null, scene = null) {
    this.sunDir = sunDir; this.areas = new Map(); this.area = null; this.quality = 'high'; this.enabled = true; this.batching = true; this.sun = sun; this.cell = CELL;
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
  // the sun's shadow box for this frame, worked out as three will (DirectionalLightShadow.updateMatrices: the camera at
  // the light, looking at its target), from the positions Environment.update has just set
  shadowBox(S) {
    const L = this.sun, cam = (this._sc ??= S.camera.clone());
    cam.left = S.camera.left; cam.right = S.camera.right; cam.top = S.camera.top; cam.bottom = S.camera.bottom; cam.near = S.camera.near; cam.far = S.camera.far;
    if (L.parent && L.parent.parent) return null;   // (placed under a group: left to three's own test)
    cam.position.copy(L.position); cam.lookAt(L.target.position); cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
    return _sf.setFromProjectionMatrix(_sm.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  }
  // (PERF-HIGH) the cell size; a change rebuilds every area's batches on its next update. The pieces cast on their own
  // only until then: the update that rebuilds the area on show comes before the frame's render, where the draw batches
  // check their pieces (drawbatch.js: one that casts leaves its batch), so they find them as they were.
  setCell(c) { if (c === this.cell) return false; this.cell = c; if (this.areas.size) this.reset(); return true; }
  // (PERF-HIGH) an area's batches built now rather than on its next visit (the benchmark, after a preset change: its
  // routes then measure the areas as a player who keeps one preset finds them)
  prepare(root) { if (this.enabled && root && !this.areas.has(root)) this.areas.set(root, this.build(root)); }
  // (I-11: an area's batches, timed and counted for the benchmark's hitch notes)
  build(root) { const t0 = performance.now(), A = new Area(root, this.cell); this.builds = (this.builds || 0) + 1; this.buildMs = (this.buildMs || 0) + performance.now() - t0; return A; }
  // (all pieces cast on their own again; batches removed: the benchmark's comparisons, or switching it off)
  reset() { for (const A of this.areas.values()) A.restore(); this.areas.clear(); this.area = null; }
  update(root, camera, focus) {
    if (!this.enabled || !root) { if (this.areas.size) this.reset(); return; }
    let A = this.areas.get(root);
    if (!A) { A = this.build(root); this.areas.set(root, A); }
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
    // the batches (PERF-BATTERY): a batch casts while its box is in the shadow camera's box and the volume its shadow
    // can fill (the box swept away from the sun and down by its own height + SWEEP_DROP m: a shadow falling down a
    // slope) touches the view. Exact convex tests (a hull outside one plane of a frustum is outside it); the sphere
    // test before them let in every batch within a cell's size of the view.
    const S = this.sun?.shadow, sb = S && this.shadowBox(S);
    for (const cell of A.cells.values()) {
      const p = cell.mesh; if (!p) continue;
      if (!cell.box) { _c.copy(cell.c).applyMatrix4(p.matrixWorld); p.castShadow = reaches(_c, cell.r); continue; }
      _b.copy(cell.box).applyMatrix4(p.matrixWorld);
      const H = _b.max.y - _b.min.y + SWEEP_DROP, ox = -(d.x / horiz) * H * slope, oz = -(d.z / horiz) * H * slope;
      for (let i = 0; i < 8; i++) {
        _pts[i].set(i & 1 ? _b.max.x : _b.min.x, i & 2 ? _b.max.y : _b.min.y, i & 4 ? _b.max.z : _b.min.z);
        _pts[i + 8].set(_pts[i].x + ox, _pts[i].y - H, _pts[i].z + oz);
      }
      p.castShadow = !(sb && outside(sb, _pts, 8)) && !outside(_f, _pts, 16);
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
        if (o.userData.drawBatched) { C.shown = true; continue; }   // (RENDER-INV: drawn by a draw batch: engine/drawbatch.js)
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
        if (o.userData.drawBatched) { C.shown = true; continue; }
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
