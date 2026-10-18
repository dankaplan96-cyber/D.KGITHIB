// Merge the static meshes under a group into one mesh per material (and per attribute layout and
// shadow flags), baking each mesh's transform relative to the group. A house built from ~150 small
// pieces becomes ~25 draw calls; materials are kept, so fading or tinting a material still works.
// Only for groups whose pieces never move or change on their own.
import * as THREE from 'three';

//
// Options (PERF-IGPU):
//   recolor: plain colour materials (MeshStandardMaterial with no texture, not see-through, not emissive) of the
//            same kind (roughness, metalness, side, shading) merge into ONE mesh with the colour in the vertices
//            (a market stall's four fruit colours: one draw call). Only for materials the game never changes at
//            runtime: a later material.color.set() would no longer reach the merged copy.
//   cell:    merge per cell of this many metres (by each part's position), so a large group still culls.
const TWINS = new Map();
const plain = (m) => m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial && !m.vertexColors && !m.transparent && m.opacity === 1 && !m.alphaTest
  && !m.map && !m.emissiveMap && !m.normalMap && !m.roughnessMap && !m.metalnessMap && !m.aoMap && !m.bumpMap && !m.alphaMap && !m.lightMap && !m.envMap
  && m.emissive.r + m.emissive.g + m.emissive.b === 0
  && m.onBeforeCompile === THREE.Material.prototype.onBeforeCompile && m.customProgramCacheKey === THREE.Material.prototype.customProgramCacheKey;
function twinOf(m) {
  const k = ['vc', m.roughness, m.metalness, m.side, m.flatShading, m.fog, m.depthWrite, m.depthTest, m.polygonOffset, m.polygonOffsetFactor, m.wireframe].join('|');
  let t = TWINS.get(k);
  if (!t) { t = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: m.roughness, metalness: m.metalness, side: m.side, flatShading: m.flatShading, fog: m.fog, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits }); t.name = 'merged-vc'; TWINS.set(k, t); }
  return t;
}

export function mergeStatic(group, { minParts = 2, recolor = false, cell = 0 } = {}) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map(), _wp = new THREE.Vector3();
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isBatchedMesh || o.isSkinnedMesh || Array.isArray(o.material)) return;
    for (let p = o; p && p !== group; p = p.parent) if (p.userData.keep) return; // a part (or subtree) that moves or toggles
    const g = o.geometry, names = Object.keys(g.attributes).sort();
    if (g.morphAttributes && Object.keys(g.morphAttributes).length) return;
    if (o.matrixWorld.determinant() * group.matrixWorld.determinant() < 0) return; // mirrored: winding would flip
    const re = recolor && plain(o.material) && !g.attributes.color;
    const mat = re ? twinOf(o.material) : o.material;
    if (re) o.userData._mergeColor = o.material.color;
    const where = cell ? (_wp.setFromMatrixPosition(o.matrixWorld), Math.floor(_wp.x / cell) + ',' + Math.floor(_wp.z / cell)) : '';
    const key = [mat.uuid, names.join(','), !!g.index, o.castShadow, o.receiveShadow, o.renderOrder, where].join('|');
    if (!buckets.has(key)) buckets.set(key, { mat, list: [] });
    buckets.get(key).list.push(o);
  });
  let removed = 0;
  for (const { mat, list } of buckets.values()) {
    const recol = mat.vertexColors && !list[0].material.vertexColors;
    if (list.length < minParts) { for (const o of list) delete o.userData._mergeColor; continue; }
    const names = Object.keys(list[0].geometry.attributes);
    const indexed = !!list[0].geometry.index;
    let vCount = 0, iCount = 0;
    for (const o of list) { vCount += o.geometry.attributes.position.count; if (indexed) iCount += o.geometry.index.count; }
    const out = {};
    for (const n of names) {
      const a = list[0].geometry.attributes[n];
      out[n] = { size: a.itemSize, norm: a.normalized, data: new Float32Array(vCount * a.itemSize) };
    }
    if (recol) out.color = { size: 3, norm: false, data: new Float32Array(vCount * 3) };
    const index = indexed ? new (vCount > 65535 ? Uint32Array : Uint16Array)(iCount) : null;
    const m = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new THREE.Vector3();
    let vo = 0, io = 0;
    for (const o of list) {
      const g = o.geometry, cnt = g.attributes.position.count;
      m.multiplyMatrices(inv, o.matrixWorld);
      nm.getNormalMatrix(m);
      for (const n of names) {
        const a = g.attributes[n], dst = out[n].data, s = a.itemSize;
        for (let i = 0; i < cnt; i++) {
          if (n === 'position') { v.fromBufferAttribute(a, i).applyMatrix4(m); dst.set([v.x, v.y, v.z], (vo + i) * 3); }
          else if (n === 'normal') { v.fromBufferAttribute(a, i).applyMatrix3(nm).normalize(); dst.set([v.x, v.y, v.z], (vo + i) * 3); }
          else for (let k = 0; k < s; k++) dst[(vo + i) * s + k] = a.getComponent(i, k);
        }
      }
      if (recol) { const c = o.userData._mergeColor, dst = out.color.data; for (let i = 0; i < cnt; i++) { dst[(vo + i) * 3] = c.r; dst[(vo + i) * 3 + 1] = c.g; dst[(vo + i) * 3 + 2] = c.b; } delete o.userData._mergeColor; }
      if (indexed) { const ix = g.index; for (let i = 0; i < ix.count; i++) index[io + i] = ix.getX(i) + vo; io += ix.count; }
      vo += cnt;
    }
    const geo = new THREE.BufferGeometry();
    for (const n of Object.keys(out)) geo.setAttribute(n, new THREE.BufferAttribute(out[n].data, out[n].size, out[n].norm));
    if (index) geo.setIndex(new THREE.BufferAttribute(index, 1));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = list[0].castShadow; mesh.receiveShadow = list[0].receiveShadow; mesh.renderOrder = list[0].renderOrder;
    mesh.name = 'merged';
    group.add(mesh);
    for (const o of list) { o.parent.remove(o); removed++; }
  }
  // drop groups left empty
  const empty = [];
  group.traverse((o) => { if (o !== group && !o.isMesh && o.children.length === 0 && o.type === 'Group') empty.push(o); });
  for (const o of empty) o.parent?.remove(o);
  return removed;
}
