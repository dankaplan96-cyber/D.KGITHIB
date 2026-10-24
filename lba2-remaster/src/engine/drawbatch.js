// Draw batches (RENDER-INV): the main pass's twin of shadowcull.js's shadow batches, one mechanism for every area.
//
// Measured on Citadel's street at Medium (1366×768): ~300 draw calls a frame, most of them static pieces from
// different builders (the town, the harbour, the props, the city dressing: each merged only within its own group,
// often one draw per colour). Each draw costs ~30–50 µs of the game's CPU in three.js before the GPU sees it, and on
// the user's laptop that submission is most of the frame.
//
// When an area (Citadel's root, a room or a region group) is first drawn, its static pieces are merged per CELL (m)
// into one mesh per material + attribute layout + flags. Plain-colour and colour-map-only standard materials are
// FOLDED first, with merge.js's own rules (the same as PERF-2's town): the piece's colour goes into the vertices, its
// roughness/metalness into an `rm` attribute and its map's repeat/offset into the UVs, so pieces of any colour drawn
// with the same texture (or none) share one vertex-coloured "twin" material and one draw. Other materials are drawn
// with the very same material object (a change to it still reaches the batch).
// The originals stay where they are, out of the main pass through layer 0 (the camera's layer; nothing else in the
// game uses layers but shadowcull.js, which leaves batched pieces alone). Batches replace main-pass draws only: a
// piece qualifies only if it does not cast its own shadow (shadowcull's members cast through its shadow batches).
//
// Every frame, after the world matrices are updated (Renderer.mid), every batched piece is checked: moved, hidden
// (itself or a parent), removed, another material or geometry, its geometry edited, casting a shadow, receiving
// differently, and for a folded piece its material's colour, roughness, metalness, visibility and map transform.
// Such a piece leaves its batch at once (layer 0 back on, drawn on its own from then on) and the cell is rebuilt in
// the same frame, so a door that opens, a lamp that changes colour or a prop that appears is never drawn stale.
//
// Left out: skinned / instanced / batched meshes, see-through or non-depth-writing materials (their draw order is per
// object), custom onBeforeRender, objects not frustum-culled, drawRange-limited or morphed geometry, tangents,
// interleaved attributes, anything under userData.keep (builders' marker for parts that move or toggle) and shadow
// proxies. Mirrored pieces get their own batches (winding flipped).
import * as THREE from 'three';
import { plain, texOnly, twinOf } from './merge.js';

export const CELL = 48;
const _m = new THREE.Matrix4(), _nm = new THREE.Matrix3(), _v = new THREE.Vector3(), _c = new THREE.Vector3();
const BASE_OBR = THREE.Object3D.prototype.onBeforeRender;

const shownIn = (o, root) => { for (let p = o; p && p !== root; p = p.parent) if (!p.visible) return false; return true; };
const attrSig = (g) => Object.keys(g.attributes).sort().map((n) => { const a = g.attributes[n]; return `${n}:${a.itemSize}:${a.normalized ? 1 : 0}:${a.array.constructor.name}`; }).join(',');

function eligible(o, root) {
  if (!o.isMesh || o.isSkinnedMesh || o.isInstancedMesh || o.isBatchedMesh || o.userData.shadowProxy || o.userData.drawBatch) return false;
  if (o.castShadow || !o.frustumCulled || o.onBeforeRender !== BASE_OBR || Array.isArray(o.material)) return false;
  const m = o.material, g = o.geometry;
  if (!m || !g?.attributes?.position || m.transparent || m.depthWrite === false || m.userData?.noBatch) return false;
  // (a shader of the game's own may read the object-space position — the foliage sway does: a batch's vertices are in
  //  the area's space; merge.js's twins only move roughness/metalness into the vertices, so they may)
  if (m.isShaderMaterial || ((m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile || m.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey) && !m.userData?.twin)) return false;
  if (g.attributes.tangent || (g.morphAttributes && Object.keys(g.morphAttributes).length) || g.drawRange.start !== 0 || g.drawRange.count !== Infinity) return false;
  for (const a of Object.values(g.attributes)) if (a.isInterleavedBufferAttribute) return false;
  for (let p = o; p && p !== root; p = p.parent) if (p.userData.keep) return false;
  if (!shownIn(o, root) || !o.matrixWorld.elements.every(Number.isFinite)) return false;
  return true;
}
// how a piece is drawn in a batch: folded into a twin (colour, rm and the map's transform into the vertices), or as is
function recipe(o) {
  const m = o.material, g = o.geometry, A = g.attributes;
  if (!A.normal || A.normal.itemSize !== 3) return null;
  const vc = !!A.color && A.color.itemSize === 3 && m.vertexColors;
  if (A.color && !vc) return null;                                   // (colours the material doesn't use: as is)
  const tex = !!A.uv && texOnly(m, vc), flat = !tex && plain(m, false, vc);
  if (!tex && !flat) return null;
  const t = m.map; if (tex && t.matrixAutoUpdate) t.updateMatrix();
  return { twin: twinOf(m, true), tex, vc };
}
// what a folded piece's look depends on, to notice a change (the material object stays the same)
const lookOf = (m) => { const t = m.map; return [m.color.r, m.color.g, m.color.b, m.roughness, m.metalness, m.visible, m.opacity, m.emissive.r + m.emissive.g + m.emissive.b, m.transparent, t ? t.offset.x + ',' + t.offset.y + ',' + t.repeat.x + ',' + t.repeat.y + ',' + t.rotation : ''].join('|'); };

class Area {
  constructor(root, cell) {
    this.root = root; this.cells = new Map(); this.members = []; this.ms = 0;
    const t0 = performance.now();
    root.updateMatrixWorld(true);
    this.inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const rootFlip = root.matrixWorld.determinant() < 0;
    root.traverse((o) => {
      if (!eligible(o, root)) return;
      const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
      _c.copy(g.boundingSphere.center).applyMatrix4(o.matrixWorld);
      if (!Number.isFinite(_c.x + _c.z)) return;
      const flip = (o.matrixWorld.determinant() < 0) !== rootFlip, F = recipe(o);
      const mat = F ? F.twin : o.material, sig = F ? (F.tex ? 'fold:uv' : 'fold') : attrSig(g) + (g.index ? '|i' : '');
      const key = [mat.uuid, sig, o.receiveShadow, o.renderOrder, flip, Math.floor(_c.x / cell) + ',' + Math.floor(_c.z / cell)].join('|');
      let C = this.cells.get(key);
      if (!C) { C = { key, material: mat, fold: F ? { tex: F.tex } : null, list: [], mesh: null, dirty: true, flip, receiveShadow: o.receiveShadow, renderOrder: o.renderOrder }; this.cells.set(key, C); }
      C.list.push({ o, cell: C, fold: F, mat: o.matrixWorld.clone(), material: o.material, look: F ? lookOf(o.material) : null, geo: g, ver: g.attributes.position.version, iver: g.index ? g.index.version : -1, rs: o.receiveShadow });
    });
    // a cell with one piece stays as it was (nothing to save)
    for (const [k, C] of this.cells) if (C.list.length < 2) this.cells.delete(k);
    for (const C of this.cells.values()) { for (const M of C.list) { this.members.push(M); M.o.layers.disable(0); M.o.userData.drawBatched = true; } this.build(C); }
    this.ms = performance.now() - t0;
  }
  build(C) {
    if (C.mesh) { C.mesh.geometry.dispose(); this.root.remove(C.mesh); C.mesh = null; }
    C.dirty = false;
    if (C.list.length < 2) { for (const M of C.list) this.release(M); C.list.length = 0; return; }
    const fold = C.fold, g0 = C.list[0].geo;
    const names = fold ? ['position', 'normal', ...(fold.tex ? ['uv'] : []), 'color', 'rm'] : Object.keys(g0.attributes);
    const spec = (n) => (fold ? { size: n === 'rm' || n === 'uv' ? 2 : 3, norm: false, Arr: Float32Array } : { size: g0.attributes[n].itemSize, norm: g0.attributes[n].normalized, Arr: g0.attributes[n].array.constructor });
    let nv = 0, ni = 0;
    for (const M of C.list) { const g = M.geo; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
    const out = {}; for (const n of names) { const s = spec(n); out[n] = { ...s, data: new s.Arr(nv * s.size) }; }
    const index = new (nv > 65535 ? Uint32Array : Uint16Array)(ni);
    let vo = 0, io = 0;
    for (const M of C.list) {
      const g = M.geo, cnt = g.attributes.position.count, m = M.o.material;
      _m.multiplyMatrices(this.inv, M.o.matrixWorld); _nm.getNormalMatrix(_m);
      for (const n of names) {
        const d = out[n].data, a = g.attributes[n];
        if (n === 'position') for (let i = 0; i < cnt; i++) { _v.fromBufferAttribute(a, i).applyMatrix4(_m); d[(vo + i) * 3] = _v.x; d[(vo + i) * 3 + 1] = _v.y; d[(vo + i) * 3 + 2] = _v.z; }
        else if (n === 'normal') for (let i = 0; i < cnt; i++) { _v.fromBufferAttribute(a, i).applyMatrix3(_nm).normalize(); d[(vo + i) * 3] = _v.x; d[(vo + i) * 3 + 1] = _v.y; d[(vo + i) * 3 + 2] = _v.z; }
        else if (fold && n === 'uv') { const U = m.map.matrix; for (let i = 0; i < cnt; i++) { _v.set(a.getX(i), a.getY(i), 1).applyMatrix3(U); d[(vo + i) * 2] = _v.x; d[(vo + i) * 2 + 1] = _v.y; } }
        else if (fold && n === 'color') { const c = m.color, C3 = M.fold.vc ? a : null; for (let i = 0; i < cnt; i++) { d[(vo + i) * 3] = (C3 ? C3.getX(i) : 1) * c.r; d[(vo + i) * 3 + 1] = (C3 ? C3.getY(i) : 1) * c.g; d[(vo + i) * 3 + 2] = (C3 ? C3.getZ(i) : 1) * c.b; } }
        else if (fold && n === 'rm') for (let i = 0; i < cnt; i++) { d[(vo + i) * 2] = m.roughness; d[(vo + i) * 2 + 1] = m.metalness; }
        else d.set(a.array.subarray(0, cnt * a.itemSize), vo * a.itemSize);   // (same array type: the cell's key has the layout)
      }
      if (g.index) { const I = g.index.array, n = g.index.count; for (let i = 0; i < n; i += 3) { index[io + i] = I[i] + vo; index[io + i + 1] = I[C.flip ? i + 2 : i + 1] + vo; index[io + i + 2] = I[C.flip ? i + 1 : i + 2] + vo; } io += n; }
      else { for (let i = 0; i + 2 < cnt; i += 3) { index[io + i] = vo + i; index[io + i + 1] = vo + (C.flip ? i + 2 : i + 1); index[io + i + 2] = vo + (C.flip ? i + 1 : i + 2); } io += cnt - (cnt % 3); }
      vo += cnt;
    }
    const geo = new THREE.BufferGeometry();
    for (const n of names) geo.setAttribute(n, new THREE.BufferAttribute(out[n].data, out[n].size, out[n].norm));
    geo.setIndex(new THREE.BufferAttribute(io < ni ? index.subarray(0, io) : index, 1));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, C.material);
    mesh.castShadow = false; mesh.receiveShadow = C.receiveShadow; mesh.renderOrder = C.renderOrder;
    mesh.matrixAutoUpdate = false; mesh.name = 'drawBatch'; mesh.userData.drawBatch = true;
    this.root.add(mesh); mesh.updateMatrixWorld(true);
    C.mesh = mesh;
  }
  release(M) { M.out = true; M.o.layers.enable(0); delete M.o.userData.drawBatched; }
  // every batched piece, every frame (after the world matrices): anything changed leaves, its cell is rebuilt now
  watch() {
    let left = 0;
    for (const M of this.members) {
      if (M.out) continue;
      const o = M.o, g = o.geometry;
      if (o.parent && o.material === M.material && g === M.geo && !o.castShadow && o.receiveShadow === M.rs && g.attributes.position.version === M.ver && (g.index ? g.index.version : -1) === M.iver
        && o.matrixWorld.equals(M.mat) && shownIn(o, this.root) && (!M.look || lookOf(o.material) === M.look)) continue;
      this.release(M); left++;
      const L = M.cell.list; L.splice(L.indexOf(M), 1); M.cell.dirty = true;
    }
    if (left) { for (const C of this.cells.values()) if (C.dirty) this.build(C); this.members = this.members.filter((M) => !M.out); }
    return left;
  }
  restore() {
    for (const M of this.members) if (!M.out) this.release(M);
    for (const C of this.cells.values()) if (C.mesh) { C.mesh.geometry.dispose(); this.root.remove(C.mesh); C.mesh = null; }
    this.members = []; this.cells.clear();
  }
  stats() { let batches = 0, pieces = 0, verts = 0, folded = 0; for (const C of this.cells.values()) if (C.mesh) { batches++; pieces += C.list.length; verts += C.mesh.geometry.attributes.position.count; if (C.fold) folded += C.list.length; } return { batches, pieces, folded, verts, buildMs: +this.ms.toFixed(1) }; }
}

export class DrawBatch {
  constructor() { this.areas = new Map(); this.enabled = true; this.cell = CELL; this.left = 0; }
  // build the area's batches (once) and check its pieces; call after the world matrices are up to date
  update(root) {
    if (!this.enabled || !root) { if (this.areas.size) this.reset(); return null; }
    let A = this.areas.get(root);
    if (!A) { A = new Area(root, this.cell); this.areas.set(root, A); }
    this.left += A.watch();
    return A;
  }
  has(root) { return this.areas.has(root); }
  // every piece drawn on its own again, batches removed (A/B comparisons, or switching it off)
  reset() { for (const A of this.areas.values()) A.restore(); this.areas.clear(); }
  stats() { const s = {}; for (const [r, A] of this.areas) s[r.name || r.uuid.slice(0, 6)] = A.stats(); return s; }
}
