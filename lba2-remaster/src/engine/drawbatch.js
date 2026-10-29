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
import { MW } from './drawcull.js';
import { TEXARRAY, arrayable, layerOf, arrayTwinOf, keyOf, flushArrays } from './texarray.js';

export const CELL = 48;
// PERF-CPU, tried: lone pieces gathered per LOOSE.n × CELL
//  (off: lone pieces were drawn on their own, each at its material's point of three's order; in a batch they move — the
//   same coincident-face change as above, 0.36 % of the Medium interior's pixels. `?loose` turns it on for probes)
export const LOOSE = { n: typeof location !== 'undefined' && /[?&]loose/.test(location.search) ? 3 : 1 };
const SPLIT = 0.5, SPLIT_TRIS = 3000;   // (PERF-BATTERY: a piece of 3000 triangles or more whose bounding radius is over half a cell is cut by triangle)
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
// (PERF-CPU probes: why a mesh is not in a batch — the first failing test of eligible(), or how it would be drawn)
export function explain(o, root) {
  if (!o.isMesh) return 'not a mesh';
  if (o.userData.drawBatched) return 'batched';
  if (!eligible(o, root)) {
    const m = o.material, g = o.geometry;
    if (o.castShadow) return 'casts its own shadow';
    if (Array.isArray(m)) return 'material array';
    if (m?.transparent || m?.depthWrite === false) return 'see-through';
    if (m?.isShaderMaterial) return 'shader material';
    if (m && (m.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile || m.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey) && !m.userData?.twin) return 'own shader code (' + (m.name || m.type) + ')';
    if (g?.attributes?.tangent) return 'tangents';
    if (g?.drawRange && (g.drawRange.start !== 0 || g.drawRange.count !== Infinity)) return 'draw range';
    if (g && Object.values(g.attributes).some((a) => a.isInterleavedBufferAttribute)) return 'interleaved';
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.keep) return 'keep';
    if (!shownIn(o, root)) return 'hidden';
    return 'other (skinned, instanced, not culled, onBeforeRender, NaN matrix)';
  }
  const F = recipe(o, true);
  if (!F) { const m = o.material, A = o.geometry.attributes; return `not foldable (${m.type}${m.map ? ' map' : ''}${m.vertexColors ? ' vc' : ''}${A.color ? ' colorAttr' : ''}${m.emissive && m.emissive.r + m.emissive.g + m.emissive.b ? ' emissive' : ''}${m.normalMap ? ' normalMap' : ''}${m.map && m.map.wrapS !== THREE.RepeatWrapping ? ' clamp' : ''}): alone in its cell`; }
  return 'foldable but alone in its cell';
}
// merge.js plain() without its no-emissive rule (an emissive colour folds into the arrays' vertices; an emissive map does not)
const plainE = (m, withMap, vc) => m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial && (vc || !m.vertexColors) && !m.transparent && m.opacity === 1 && !m.alphaTest
  && (withMap || !m.map) && !m.emissiveMap && !m.normalMap && !m.roughnessMap && !m.metalnessMap && !m.aoMap && !m.bumpMap && !m.alphaMap && !m.lightMap && !m.envMap && !m.displacementMap
  && m.onBeforeCompile === THREE.Material.prototype.onBeforeCompile && m.customProgramCacheKey === THREE.Material.prototype.customProgramCacheKey;
// how a piece is drawn in a batch: folded into a twin (colour, rm and the map's transform into the vertices), or as is
// (PERF-CPU, arrays: a piece whose map is one of the world's painted textures, or a plain-colour piece, folds into the
//  texture-array twin (texarray.js) — pieces of every such texture in a cell share one batch; other maps as before)
function recipe(o, arrays = false) {
  const m = o.material, g = o.geometry, A = g.attributes;
  if (!A.normal || A.normal.itemSize !== 3) return null;
  const vc = !!A.color && A.color.itemSize === 3 && m.vertexColors;
  if (A.color && !vc) return null;                                   // (colours the material doesn't use: as is)
  // (PERF-CPU: a builder's own merged piece — merge.js's twin, its roughness / metalness already in its vertices — joins
  //  the arrays too, its `rm` copied)
  if (arrays && TEXARRAY.on && m.userData?.twin && m.userData.rm && !m.userData.arr && vc && A.rm?.itemSize === 2 && !m.transparent && (!m.map || (A.uv && arrayable(m.map)))) {
    const t = m.map; if (t?.matrixAutoUpdate) t.updateMatrix();
    const layer = layerOf(t || null); if (layer >= 0) return { twin: arrayTwinOf(m, keyOf(t || null)), tex: !!t, vc: true, arr: true, layer, preRM: true, ord: m.id };
  }
  // (PERF-CPU, arrays: a glowing piece — a lit window, a lamp's glass — folds too, its emissive colour × intensity in
  //  its vertices: the twin adds it where three adds the uniform)
  if (arrays && TEXARRAY.on && m.emissive && m.emissive.r + m.emissive.g + m.emissive.b > 0 && plainE(m, !!A.uv && !!m.map, vc) && (!m.map || (A.uv && arrayable(m.map)))) {
    const t = m.map; if (t?.matrixAutoUpdate) t.updateMatrix();
    const layer = layerOf(t || null); if (layer >= 0) return { twin: arrayTwinOf(m, keyOf(t || null)), tex: !!t, vc, arr: true, layer, ord: m.id };
  }
  const tex = !!A.uv && texOnly(m, vc), flat = !tex && plain(m, false, vc);
  if (!tex && !flat) return null;
  const t = m.map; if (tex && t.matrixAutoUpdate) t.updateMatrix();
  if (arrays && TEXARRAY.on && (flat || arrayable(t))) { const layer = layerOf(flat ? null : t); if (layer >= 0) return { twin: arrayTwinOf(m, keyOf(flat ? null : t)), tex, vc, arr: true, layer, ord: twinOf(m, true).id }; }
  return { twin: twinOf(m, true), tex, vc };
}
// what a folded piece's look depends on, to notice a change (the material object stays the same)
const lookOf = (m) => { const t = m.map; return [m.color.r, m.color.g, m.color.b, m.roughness, m.metalness, m.visible, m.opacity, m.emissive.r + m.emissive.g + m.emissive.b, m.transparent, t ? t.offset.x + ',' + t.offset.y + ',' + t.repeat.x + ',' + t.repeat.y + ',' + t.rotation : ''].join('|'); };
// PERF-CPU: the same look as numbers, kept on the material with a version that moves when any of them changes (worked out
// once a frame per material; no string built each frame). NaN equals NaN here, as the strings did.
const LOOK_N = 21;
const _srcId = new WeakMap(); let _srcN = 0;
const srcId = (src) => { let i = _srcId.get(src); if (i === undefined) _srcId.set(src, (i = ++_srcN)); return i; };
function lookVals(m, out) {
  const t = m.map;
  out[0] = m.color.r; out[1] = m.color.g; out[2] = m.color.b; out[3] = m.roughness; out[4] = m.metalness; out[5] = m.visible ? 1 : 0; out[6] = m.opacity;
  out[7] = m.emissive.r; out[18] = m.emissive.g; out[19] = m.emissive.b; out[20] = m.emissiveIntensity; out[8] = m.transparent ? 1 : 0;
  if (t) { out[9] = 1; out[10] = t.offset.x; out[11] = t.offset.y; out[12] = t.repeat.x; out[13] = t.repeat.y; out[14] = t.rotation; out[15] = srcId(t.source); out[16] = t.version; out[17] = t.source.version; } else { out[9] = 0; out[10] = out[11] = out[12] = out[13] = out[14] = 0; out[15] = out[16] = out[17] = 0; }
  return out;
}
const _lv = new Float64Array(LOOK_N);
function lookVer(m, F) {
  if (m.__lookF === F && F !== -1) return m.__lookV;
  m.__lookF = F;
  const a = (m.__look ??= new Float64Array(LOOK_N).fill(NaN)), b = lookVals(m, _lv);
  let same = m.__lookV !== undefined;
  for (let i = 0; i < LOOK_N && same; i++) if (a[i] !== b[i] && !(a[i] !== a[i] && b[i] !== b[i])) same = false;
  if (!same) { a.set(b); m.__lookV = (m.__lookV ?? 0) + 1; }
  return m.__lookV;
}
// (a piece under an object with its own updateMatrixWorld (a camera, a skinned mesh): its matrices are three's, not
//  drawcull.js's, so it is always compared in full)
const ownUpdate = (o, root) => { for (let p = o.parent; p && p !== root; p = p.parent) if (p.updateMatrixWorld !== THREE.Object3D.prototype.updateMatrixWorld) return true; return false; };

class Area {
  constructor(root, cell, fold = true, arrays = false, loose = LOOSE.n, exactArr = true) {
    this.root = root; this.cells = new Map(); this.members = []; this.ms = 0; this.cell = cell; this.ids = 0; this.loose = loose;
    const t0 = performance.now();
    root.updateMatrixWorld(true);
    this.inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const rootFlip = root.matrixWorld.determinant() < 0;
    const pieces = [], found = [];
    const kindKey = (o, F, flip) => [(F ? F.twin : o.material).uuid, F ? (F.arr ? 'fold:arr' : F.tex ? 'fold:uv' : 'fold') : attrSig(o.geometry) + (o.geometry.index ? '|i' : ''), o.receiveShadow, o.renderOrder, flip].join('|');
    root.traverse((o) => {
      if (!eligible(o, root)) return;
      const g = o.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
      _c.copy(g.boundingSphere.center).applyMatrix4(o.matrixWorld);
      if (!Number.isFinite(_c.x + _c.z)) return;
      const flip = (o.matrixWorld.determinant() < 0) !== rootFlip, F0 = fold ? recipe(o, false) : null;
      found.push({ o, flip, F0, cx: _c.x, cz: _c.z });
    });
    // PERF-CPU, arrays: where two pieces' faces coincide, the one drawn later shows, and three orders opaque draws by
    // material: a piece moved into a batch drawn at another point of that order changes which face shows (Medium
    // interior, every foldable piece in its cell's array batch: the stove's tiles and a wicker panel, a wall's tiles and
    // stone, 0.5 % of the pixels; `?arrall` for that version). So each piece keeps its place: `ord`, the id of the
    // material it was drawn with before (its texture's twin when it was in a folded batch — at least one more such
    // piece in its cell, or cut over several cells — its own when it was drawn alone or in a batch of its own material).
    const exact = this.exact = exactArr;
    if (arrays && TEXARRAY.on && exact) {
      const n = new Map(), keyOf0 = (e) => kindKey(e.o, e.F0, e.flip) + '|' + Math.floor(e.cx / this.cell) + ',' + Math.floor(e.cz / this.cell);
      for (const e of found) { const k = keyOf0(e); n.set(k, (n.get(k) || 0) + 1); }
      for (const e of found) {
        const g = e.o.geometry, nt = Math.floor((g.index ? g.index.count : g.attributes.position.count) / 3);
        const cut = nt >= SPLIT_TRIS && g.boundingSphere.radius * e.o.matrixWorld.getMaxScaleOnAxis() > this.cell * SPLIT;
        const F = recipe(e.o, true);
        if (F?.arr) { F.ord = e.F0 && (cut || n.get(keyOf0(e)) > 1) ? e.F0.twin.id : e.o.material.id; e.F = F; }
      }
      // The ids of every material this area still draws with (its other pieces' own materials and twins) cut the order
      // into gaps; pieces whose `ord` falls in one gap share a batch, drawn at that place (`__sortId`, renderer.js's
      // opaque sort); pieces of different gaps do not. In a batch, its pieces in `ord` order (build()).
      const other = new Set(), arr = new Set();
      for (const e of found) if (e.F?.arr) arr.add(e.o);
      root.traverse((o) => {
        if (arr.has(o) || !(o.isMesh || o.isLine || o.isPoints || o.isSprite) || !o.material) return;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) other.add(m.id);
      });
      for (const e of found) if (!e.F?.arr && e.F0) other.add(e.F0.twin.id);
      // Arrays of different sizes are different batches: within a gap, pieces in `ord` order go into one batch only
      // while their array stays the same (a run); a piece of another size between them starts a new run.
      const ids = Float64Array.from(other).sort(), A = found.filter((e) => e.F?.arr).sort((x, y) => x.F.ord - y.F.ord);
      let run = 0, gap0 = -1, twin0 = null, ord0 = -1;
      for (const e of A) {
        let lo = 0, hi = ids.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (ids[mid] < e.F.ord) lo = mid + 1; else hi = mid; }
        if (lo !== gap0 || (e.F.twin !== twin0 && e.F.ord !== ord0)) run++;
        gap0 = lo; twin0 = e.F.twin; ord0 = e.F.ord; e.F.gap = run;
      }
    }
    for (const { o, flip, F0, F: F1 } of found) {
      const g = o.geometry, F = arrays && TEXARRAY.on && fold ? (exact ? F1 || F0 : recipe(o, true)) : F0;
      const mat = F ? F.twin : o.material, sig = F ? (F.arr ? 'fold:arr' + (F.gap !== undefined ? ':' + F.gap : '') : F.tex ? 'fold:uv' : 'fold') : attrSig(g) + (g.index ? '|i' : '');
      const M = { o, fold: F, mat: o.matrixWorld.clone(), material: o.material, look: F ? lookOf(o.material) : null, lv: F ? lookVer(o.material, -1) : 0, okF: -1, own: ownUpdate(o, root), geo: g, ver: g.attributes.position.version, iver: g.index ? g.index.version : -1, rs: o.receiveShadow,
        kind: { key: [mat.uuid, sig, o.receiveShadow, o.renderOrder, flip].join('|'), material: mat, fold: F ? { tex: F.tex, arr: !!F.arr } : null, flip, receiveShadow: o.receiveShadow, renderOrder: o.renderOrder } };
      this.assign(M);
      pieces.push(M);
    }
    // PERF-CPU: a whole piece alone in its cell (of its kind: on the arrivals, 81 of Zeelich's pieces — a crate, a sign, a
    // lamp post with its own texture size) joins the other lone pieces of its kind in a coarser cell (LOOSE × the cell)
    // instead of drawing on its own. Only what was alone moves; a cell with two or more pieces keeps its size.
    if (this.loose > 1) {
      const lone = [];
      for (const [k, C] of this.cells) if (C.list.length === 1 && C.list[0].cells.length === 1 && C.list[0].parts.get(C.id) === null) { lone.push(C.list[0]); this.cells.delete(k); }
      const L = this.cell * this.loose;
      for (const M of lone) {
        _c.copy(M.geo.boundingSphere.center).applyMatrix4(M.o.matrixWorld);
        const key = M.kind.key + '|loose|' + Math.floor(_c.x / L) + ',' + Math.floor(_c.z / L);
        let C = this.cells.get(key);
        if (!C) { C = { key, id: this.ids++, ...M.kind, list: [], mesh: null, dirty: true }; this.cells.set(key, C); }
        M.cells = [C]; M.parts = new Map([[C.id, null]]); C.list.push(M);
      }
    }
    // a cell with one piece that lies wholly in it stays as it was (nothing to save); a piece cut over several cells
    // is batched in all of them (PERF-BATTERY: so the parts out of view are culled)
    for (const [k, C] of this.cells) if (C.list.length < 2 && !(C.list.length === 1 && C.list[0].cells.length > 1)) { for (const M of C.list) M.cells = []; this.cells.delete(k); }
    for (const M of pieces) if (M.cells.length) { this.members.push(M); M.o.layers.disable(0); M.o.userData.drawBatched = true; }
    flushArrays();   // (PERF-CPU: an array that took this area's new textures, before its batches are drawn)
    for (const C of this.cells.values()) this.build(C);
    this.ms = performance.now() - t0;
  }
  // PERF-BATTERY: a large, detailed piece is cut: each of its triangles goes to the cell of its own centre (M.parts:
  // cell id → its triangles there, null for a whole piece; M.cells: its cells). Citadel's builders merge whole
  // quarters into single meshes (the city dressing: 34k triangles, 74 m across), and a batch was as big as the pieces
  // in it: on the street at Medium three drew 487k triangles of plain meshes a frame, 84k of them in view. Cut into
  // cells, the parts out of the view are culled by three's own frustum test. Other pieces are batched as before.
  assign(M) {
    const g = M.geo, I = g.index, P = g.attributes.position, nt = Math.floor((I ? I.count : P.count) / 3);
    const W = M.o.matrixWorld, kind = M.kind.key;
    const cellAt = (x, z) => {
      const key = kind + '|' + Math.floor(x / this.cell) + ',' + Math.floor(z / this.cell);
      let C = this.cells.get(key);
      if (!C) { C = { key, id: this.ids++, ...M.kind, list: [], mesh: null, dirty: true }; this.cells.set(key, C); }
      return C;
    };
    M.cells = []; M.parts = new Map();
    // (only a large and detailed piece is cut: a small one across a cell line, or a plain slab, would only cost a
    //  draw on each side)
    _c.copy(g.boundingSphere.center).applyMatrix4(W);
    const cx = _c.x, cz = _c.z;
    if (!(nt >= SPLIT_TRIS && g.boundingSphere.radius * W.getMaxScaleOnAxis() > this.cell * SPLIT)) {
      const C = cellAt(cx, cz); M.parts.set(C.id, null); M.cells.push(C); C.list.push(M);
      return;
    }
    const lists = new Map();
    for (let t = 0; t < nt; t++) {
      let x = 0, z = 0;
      for (let j = 0; j < 3; j++) { _v.fromBufferAttribute(P, I ? I.getX(t * 3 + j) : t * 3 + j).applyMatrix4(W); x += _v.x; z += _v.z; }
      x /= 3; z /= 3;
      if (!Number.isFinite(x + z)) { x = cx; z = cz; }
      const C = cellAt(x, z);
      let L = lists.get(C); if (!L) { L = []; lists.set(C, L); }
      L.push(t);
    }
    for (const [C, L] of lists) { M.parts.set(C.id, Int32Array.from(L)); M.cells.push(C); C.list.push(M); }
  }
  build(C) {
    if (C.mesh) { C.mesh.geometry.dispose(); this.root.remove(C.mesh); C.mesh = null; }
    C.dirty = false; this._meshes = null;
    if (!C.list.length || (C.list.length === 1 && C.list[0].cells.length < 2)) { for (const M of [...C.list]) this.release(M); C.list.length = 0; C.dirty = false; return; }
    const fold = C.fold, g0 = C.list[0].geo;
    const names = fold ? ['position', 'normal', ...(fold.arr ? ['auv', 'layer'] : fold.tex ? ['uv'] : []), 'color', 'rm', ...(fold.arr ? ['em'] : [])] : Object.keys(g0.attributes);
    const spec = (n) => (fold ? { size: n === 'rm' || n === 'uv' || n === 'auv' ? 2 : n === 'layer' ? 1 : 3, norm: false, Arr: Float32Array } : { size: g0.attributes[n].itemSize, norm: g0.attributes[n].normalized, Arr: g0.attributes[n].array.constructor });
    // this cell's triangles of each piece, their vertices renumbered (a whole piece: all of them, as they are)
    const parts = [];
    let nv = 0, ni = 0;
    // (PERF-CPU, arrays: the pieces in the order they were drawn before — three draws opaque materials by material id, and
    //  where two pieces' faces coincide exactly the later one shows: a batch's triangles keep that order. `ord`: the
    //  id of the material the piece was drawn with before: its 2D twin, or its own)
    const LIST = fold?.arr ? [...C.list].sort((a, b) => a.fold.ord - b.fold.ord) : C.list;
    for (const M of LIST) {
      const g = M.geo, I = g.index, T = M.parts.get(C.id), cnt = g.attributes.position.count;
      if (T === undefined) continue;
      if (T === null) { parts.push({ M, T, map: null, from: null, vo: nv }); nv += cnt; ni += I ? I.count - (I.count % 3) : cnt - (cnt % 3); continue; }
      const map = new Int32Array(cnt).fill(-1), from = [];
      for (let k = 0; k < T.length; k++) for (let j = 0; j < 3; j++) { const v = I ? I.getX(T[k] * 3 + j) : T[k] * 3 + j; if (map[v] < 0) { map[v] = from.length; from.push(v); } }
      parts.push({ M, T, map, from, vo: nv }); nv += from.length; ni += T.length * 3;
    }
    const out = {}; for (const n of names) { const s = spec(n); out[n] = { ...s, data: new s.Arr(nv * s.size) }; }
    const index = new (nv > 65535 ? Uint32Array : Uint16Array)(ni);
    let io = 0;
    for (const { M, T, map, from, vo } of parts) {
      const g = M.geo, I = g.index, m = M.o.material, nf = from ? from.length : g.attributes.position.count, src = from ? (k) => from[k] : (k) => k;
      _m.multiplyMatrices(this.inv, M.o.matrixWorld); _nm.getNormalMatrix(_m);
      for (const n of names) {
        const d = out[n].data, a = g.attributes[n === 'auv' ? 'uv' : n];
        if (n === 'position') for (let k = 0; k < nf; k++) { _v.fromBufferAttribute(a, src(k)).applyMatrix4(_m); d[(vo + k) * 3] = _v.x; d[(vo + k) * 3 + 1] = _v.y; d[(vo + k) * 3 + 2] = _v.z; }
        else if (n === 'normal') for (let k = 0; k < nf; k++) { _v.fromBufferAttribute(a, src(k)).applyMatrix3(_nm).normalize(); d[(vo + k) * 3] = _v.x; d[(vo + k) * 3 + 1] = _v.y; d[(vo + k) * 3 + 2] = _v.z; }
        else if (fold && n === 'auv' && !M.fold.tex) d.fill(0, vo * 2, (vo + nf) * 2);   // (a plain piece: the white layer, anywhere)
        else if (fold && n === 'layer') d.fill(M.fold.layer, vo, vo + nf);
        else if (fold && n === 'em') { const e = m.emissive, k = m.emissiveIntensity ?? 1, r = e ? e.r * k : 0, gg = e ? e.g * k : 0, b = e ? e.b * k : 0; for (let q = 0; q < nf; q++) { d[(vo + q) * 3] = r; d[(vo + q) * 3 + 1] = gg; d[(vo + q) * 3 + 2] = b; } }
        else if (fold && (n === 'uv' || n === 'auv')) { const U = m.map.matrix; for (let k = 0; k < nf; k++) { _v.set(a.getX(src(k)), a.getY(src(k)), 1).applyMatrix3(U); d[(vo + k) * 2] = _v.x; d[(vo + k) * 2 + 1] = _v.y; } }
        else if (fold && n === 'color') { const c = m.color, C3 = M.fold.vc ? a : null; for (let k = 0; k < nf; k++) { const i = src(k); d[(vo + k) * 3] = (C3 ? C3.getX(i) : 1) * c.r; d[(vo + k) * 3 + 1] = (C3 ? C3.getY(i) : 1) * c.g; d[(vo + k) * 3 + 2] = (C3 ? C3.getZ(i) : 1) * c.b; } }
        else if (fold && n === 'rm' && M.fold.preRM) for (let k = 0; k < nf; k++) { const i = src(k); d[(vo + k) * 2] = a.getX(i); d[(vo + k) * 2 + 1] = a.getY(i); }
        else if (fold && n === 'rm') for (let k = 0; k < nf; k++) { d[(vo + k) * 2] = m.roughness; d[(vo + k) * 2 + 1] = m.metalness; }
        else if (!from) d.set(a.array.subarray(0, nf * a.itemSize), vo * a.itemSize);   // (same array type: the cell's key has the layout)
        else { const sz = a.itemSize, A = a.array; for (let k = 0; k < nf; k++) for (let q = 0; q < sz; q++) d[(vo + k) * sz + q] = A[from[k] * sz + q]; }
      }
      if (!T) {
        if (I) { const X = I.array, n = I.count - (I.count % 3); for (let i = 0; i < n; i += 3) { index[io + i] = X[i] + vo; index[io + i + 1] = X[C.flip ? i + 2 : i + 1] + vo; index[io + i + 2] = X[C.flip ? i + 1 : i + 2] + vo; } io += n; }
        else { const n = nf - (nf % 3); for (let i = 0; i < n; i += 3) { index[io + i] = vo + i; index[io + i + 1] = vo + (C.flip ? i + 2 : i + 1); index[io + i + 2] = vo + (C.flip ? i + 1 : i + 2); } io += n; }
        continue;
      }
      for (let k = 0; k < T.length; k++) {
        const t = T[k], a = I ? I.getX(t * 3) : t * 3, b = I ? I.getX(t * 3 + 1) : t * 3 + 1, c = I ? I.getX(t * 3 + 2) : t * 3 + 2;
        index[io] = map[a] + vo; index[io + 1] = map[C.flip ? c : b] + vo; index[io + 2] = map[C.flip ? b : c] + vo; io += 3;
      }
    }
    const geo = new THREE.BufferGeometry();
    for (const n of names) geo.setAttribute(n, new THREE.BufferAttribute(out[n].data, out[n].size, out[n].norm));
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, C.material);
    mesh.castShadow = false; mesh.receiveShadow = C.receiveShadow; mesh.renderOrder = C.renderOrder;
    mesh.matrixAutoUpdate = false; mesh.name = 'drawBatch'; mesh.userData.drawBatch = true;
    if (fold?.arr && LIST.length && LIST[0].fold.gap !== undefined) mesh.__sortId = LIST[0].fold.ord;   // (its pieces' place in the order, above)
    this.root.add(mesh); mesh.updateMatrixWorld(true);
    C.mesh = mesh; this._meshes = null;
  }
  // (PERF-BATTERY-2: the batch meshes, for drawcull.js BoxCull)
  meshes() { if (!this._meshes) { this._meshes = []; for (const C of this.cells.values()) if (C.mesh) this._meshes.push(C.mesh); } return this._meshes; }
  // (a piece leaves every cell it is in; the caller rebuilds the cells made dirty)
  release(M) {
    if (M.out) return;
    M.out = true; M.o.layers.enable(0); delete M.o.userData.drawBatched;
    for (const C of M.cells) { const i = C.list.indexOf(M); if (i >= 0) { C.list.splice(i, 1); C.dirty = true; } }
  }
  // every batched piece, every frame (after the world matrices): anything changed leaves, its cell is rebuilt now
  watch() {
    let left = 0;
    // (PERF-BATTERY-2: a folded material's look and a parent's visibility are worked out once a frame, not once per piece:
    //  ~1 500 pieces share a few dozen materials and parents; the same checks, the same result)
    const looks = this._looks ??= new Map(), shown = this._shown ??= new Map(); looks.clear(); shown.clear();
    const lookNow = (m) => { let k = looks.get(m); if (k === undefined) looks.set(m, (k = lookOf(m))); return k; };
    const root = this.root, up = (p) => { if (!p || p === root) return true; let v = shown.get(p); if (v === undefined) shown.set(p, (v = p.visible && up(p.parent))); return v; };
    // PERF-CPU (the same checks, cheaper when this frame's matrices came from drawcull.js's update, MW.ok): a parent
    // chain is shown when that update reached the parent through shown objects in this frame (`__visF`); a world matrix
    // is compared in full only when that update recomputed it since it was last found equal (`__mwF`); a folded
    // material's look by its version (lookVer). Otherwise (A/B, or the area's root not reached) as before.
    const F = MW.frame, fast = this.fast !== false && MW.ok && root.__visF === F;
    for (const M of this.members) {
      if (M.out) continue;
      const o = M.o, g = o.geometry;
      if (fast) {
        const p = o.parent;
        if (p && o.visible && o.material === M.material && g === M.geo && !o.castShadow && o.receiveShadow === M.rs && g.attributes.position.version === M.ver && (g.index ? g.index.version : -1) === M.iver
          && (p === root || p.__visF === F) && ((o.__mwF <= M.okF && !M.own) || (o.matrixWorld.equals(M.mat) && (M.okF = F) >= 0)) && (!M.look || lookVer(o.material, F) === M.lv)) continue;
      } else if (o.parent && o.material === M.material && g === M.geo && !o.castShadow && o.receiveShadow === M.rs && g.attributes.position.version === M.ver && (g.index ? g.index.version : -1) === M.iver
        && o.matrixWorld.equals(M.mat) && o.visible && up(o.parent) && (!M.look || lookNow(o.material) === M.look)) { M.okF = -1; continue; }
      this.release(M); left++;
    }
    // (a rebuild may release a piece left alone in a cell, which makes its other cells dirty: until none is)
    if (left) { for (let k = 0; k < 8; k++) { let any = false; for (const C of this.cells.values()) if (C.dirty) { this.build(C); any = true; } if (!any) break; } this.members = this.members.filter((M) => !M.out); }
    return left;
  }
  restore() {
    for (const M of this.members) if (!M.out) this.release(M);
    for (const C of this.cells.values()) if (C.mesh) { C.mesh.geometry.dispose(); this.root.remove(C.mesh); C.mesh = null; }
    this.members = []; this.cells.clear(); this._meshes = null;
  }
  stats() { let batches = 0, pieces = 0, verts = 0, folded = 0; for (const C of this.cells.values()) if (C.mesh) { batches++; pieces += C.list.length; verts += C.mesh.geometry.attributes.position.count; if (C.fold) folded += C.list.length; } return { batches, pieces, folded, verts, buildMs: +this.ms.toFixed(1) }; }
}

export class DrawBatch {
  // fold: on since PERF-BATTERY (off before). Folded batches change a few pixels (0.003–0.3 % of a frame: where two
  // surfaces of different materials coincide, the draw order decides which shows). On the user's Vega 8 on battery the
  // CPU's render submission (~12 ms on the street at Medium) is the next limit after the GPU, and folding is what
  // merges the regions' one-colour pieces: the arrival route 321 → 252 draw calls, the street 250 → 227 (Medium,
  // SwiftShader counts, docs/lba3-performance/PERF_BATTERY.md). `fold = false` + reset() brings back the exact batches.
  // arrays (PERF-CPU): the world's painted textures from one texture array (texarray.js): one batch per cell for all of them
  constructor() { this.areas = new Map(); this.enabled = true; this.cell = CELL; this.fold = true; this.arrays = true; this.loose = LOOSE.n; this.exact = !(typeof location !== 'undefined' && /[?&]arrall/.test(location.search)); this.left = 0; }
  // build the area's batches (once) and check its pieces; call after the world matrices are up to date
  update(root) {
    if (!this.enabled || !root) { if (this.areas.size) this.reset(); return null; }
    let A = this.areas.get(root);
    if (!A) { A = new Area(root, this.cell, this.fold, this.arrays, this.loose, this.exact); this.areas.set(root, A); this.builds = (this.builds || 0) + 1; this.buildMs = (this.buildMs || 0) + A.ms; }   // (I-11: counted for the benchmark's hitch notes)
    this.left += A.watch();
    return A;
  }
  has(root) { return this.areas.has(root); }
  meshes(root) { return this.areas.get(root)?.meshes() ?? []; }
  // every piece drawn on its own again, batches removed (A/B comparisons, or switching it off)
  reset() { for (const A of this.areas.values()) A.restore(); this.areas.clear(); }
  stats() { const s = {}; for (const [r, A] of this.areas) s[r.name || r.uuid.slice(0, 6)] = A.stats(); return s; }
}
