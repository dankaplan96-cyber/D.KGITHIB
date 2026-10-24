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
//   retex:   with recolor, also textured materials (PERF-2): MeshStandardMaterial with a colour map and nothing
//            else, of the same image and texture settings, merge into ONE mesh whose map has no repeat/offset (the
//            map's transform is baked into the UVs, the colour into the vertices). A house's plaster in three
//            tints and two tilings: one draw call. Same rule: only materials the game never changes at runtime.
//            With retex the roughness and metalness go into the vertices too (attribute `rm`, read by the twin's
//            shader in place of its uniforms), so plain colours of any roughness/metalness share one twin.
const TWINS = new Map(), WHITE = new THREE.Color(1, 1, 1);
// (withMap: a colour map is allowed, for retex)
// (withVC: vertex colours allowed too — the part's own colours are multiplied by the material's, for retex)
export const plain = (m, withMap = false, withVC = false) => m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial && (withVC || !m.vertexColors) && !m.transparent && m.opacity === 1 && !m.alphaTest
  && (withMap || !m.map) && !m.emissiveMap && !m.normalMap && !m.roughnessMap && !m.metalnessMap && !m.aoMap && !m.bumpMap && !m.alphaMap && !m.lightMap && !m.envMap && !m.displacementMap
  && m.emissive.r + m.emissive.g + m.emissive.b === 0
  && m.onBeforeCompile === THREE.Material.prototype.onBeforeCompile && m.customProgramCacheKey === THREE.Material.prototype.customProgramCacheKey;
// a colour map only, sampled from uv with repeat wrapping (so a baked repeat/offset samples the same texels)
export const texOnly = (m, withVC = false) => {
  const t = m.map;
  // (a canvas texture is fine: the twin's map is a clone sharing its source, so a redrawn canvas still reaches it)
  if (!t || !t.isTexture || t.isRenderTargetTexture || t.isVideoTexture || t.channel !== 0 || !t.source) return false;
  if (t.wrapS !== THREE.RepeatWrapping || t.wrapT !== THREE.RepeatWrapping) return false;
  return plain(m, true, withVC);
};
// (the twin's shader reads roughness/metalness from the vertices: exactly the values the parts' own uniforms had)
function perVertexRM(t) {
  t.userData.rm = true;
  t.onBeforeCompile = (sh) => {
    sh.vertexShader = 'attribute vec2 rm;\nvarying vec2 vRM;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvRM = rm;');
    sh.fragmentShader = 'varying vec2 vRM;\n' + sh.fragmentShader
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vRM.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vRM.y;');
  };
  t.customProgramCacheKey = () => 'merged-rm';
}
export function twinOf(m, rm = false) {
  const t0 = m.map || null;
  const tk = t0 ? [t0.source.uuid, t0.wrapS, t0.wrapT, t0.magFilter, t0.minFilter, t0.anisotropy, t0.colorSpace, t0.flipY, t0.generateMipmaps, t0.premultiplyAlpha, t0.unpackAlignment, t0.format, t0.type].join(',') : '';
  const k = [rm ? 'vcrm' : 'vc', rm ? '' : m.roughness, rm ? '' : m.metalness, m.side, m.flatShading, m.fog, m.depthWrite, m.depthTest, m.polygonOffset, m.polygonOffsetFactor, m.wireframe, tk].join('|');
  let t = TWINS.get(k);
  if (!t) {
    let map = null;
    if (t0) { map = t0.clone(); map.repeat.set(1, 1); map.offset.set(0, 0); map.rotation = 0; map.center.set(0, 0); map.matrixAutoUpdate = true; map.updateMatrix(); map.needsUpdate = true; }   // (shares the GPU copy of its source)
    t = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, map, roughness: m.roughness, metalness: m.metalness, side: m.side, flatShading: m.flatShading, fog: m.fog, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits });
    t.name = (map ? 'merged-vct' : 'merged-vc') + (rm ? 'rm' : ''); t.userData.twin = true;
    if (rm) perVertexRM(t);
    TWINS.set(k, t);
  }
  return t;
}

export function mergeStatic(group, { minParts = 2, recolor = false, cell = 0, retex = false } = {}) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map(), _wp = new THREE.Vector3();
  group.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isBatchedMesh || o.isSkinnedMesh || Array.isArray(o.material)) return;
    for (let p = o; p && p !== group; p = p.parent) if (p.userData.keep) return; // a part (or subtree) that moves or toggles
    const g = o.geometry, names = Object.keys(g.attributes).sort();
    if (g.morphAttributes && Object.keys(g.morphAttributes).length) return;
    if (o.matrixWorld.determinant() * group.matrixWorld.determinant() < 0) return; // mirrored: winding would flip
    // (retex: a vertex-coloured part (a Kit's merged colours) folds too, its colours times the material's)
    const vcIn = !!g.attributes.color, vcOK = retex && vcIn && o.material.vertexColors && g.attributes.color.itemSize === 3;
    const base = recolor && (!vcIn || vcOK);
    const tex = base && retex && !!g.attributes.uv && texOnly(o.material, vcOK);
    const re = tex || (base && plain(o.material, false, vcOK));
    const mat = re ? twinOf(o.material, retex) : o.material;
    if (re && !vcIn) names.push('color'), names.sort();
    if (re) { o.userData._mergeColor = o.material.color; o.userData._mergeRM = [o.material.roughness, o.material.metalness]; }
    if (tex) { const t = o.material.map; if (t.matrixAutoUpdate) t.updateMatrix(); o.userData._mergeUV = t.matrix; }
    const where = cell ? (_wp.setFromMatrixPosition(o.matrixWorld), Math.floor(_wp.x / cell) + ',' + Math.floor(_wp.z / cell)) : '';
    const key = [mat.uuid, names.join(','), !!g.index, o.castShadow, o.receiveShadow, o.renderOrder, where].join('|');
    if (!buckets.has(key)) buckets.set(key, { mat, list: [] });
    buckets.get(key).list.push(o);
  });
  let removed = 0;
  for (const { mat, list } of buckets.values()) {
    const recol = !!mat.userData.twin && list.some((o) => o.userData._mergeColor);
    if (list.length < minParts) { for (const o of list) { delete o.userData._mergeColor; delete o.userData._mergeUV; delete o.userData._mergeRM; } continue; }
    const names = Object.keys(list[0].geometry.attributes).filter((n) => !(recol && n === 'color'));
    const indexed = !!list[0].geometry.index;
    let vCount = 0, iCount = 0;
    for (const o of list) { vCount += o.geometry.attributes.position.count; if (indexed) iCount += o.geometry.index.count; }
    const out = {};
    for (const n of names) {
      const a = list[0].geometry.attributes[n];
      out[n] = { size: a.itemSize, norm: a.normalized, data: new Float32Array(vCount * a.itemSize) };
    }
    if (recol) out.color = { size: 3, norm: false, data: new Float32Array(vCount * 3) };
    // (parts merged before already carry their `rm`: copied with the other attributes)
    const rmOut = mat.userData.rm && !out.rm ? (out.rm = { size: 2, norm: false, data: new Float32Array(vCount * 2) }).data : null;
    const index = indexed ? new (vCount > 65535 ? Uint32Array : Uint16Array)(iCount) : null;
    const m = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new THREE.Vector3();
    let vo = 0, io = 0;
    for (const o of list) {
      const g = o.geometry, cnt = g.attributes.position.count, uvM = o.userData._mergeUV;
      m.multiplyMatrices(inv, o.matrixWorld);
      nm.getNormalMatrix(m);
      for (const n of names) {
        const a = g.attributes[n], dst = out[n].data, s = a.itemSize;
        for (let i = 0; i < cnt; i++) {
          if (n === 'position') { v.fromBufferAttribute(a, i).applyMatrix4(m); dst.set([v.x, v.y, v.z], (vo + i) * 3); }
          else if (n === 'normal') { v.fromBufferAttribute(a, i).applyMatrix3(nm).normalize(); dst.set([v.x, v.y, v.z], (vo + i) * 3); }
          else if (n === 'uv' && uvM) { v.set(a.getX(i), a.getY(i), 1).applyMatrix3(uvM); dst[(vo + i) * 2] = v.x; dst[(vo + i) * 2 + 1] = v.y; }
          else for (let k = 0; k < s; k++) dst[(vo + i) * s + k] = a.getComponent(i, k);
        }
      }
      delete o.userData._mergeUV;
      if (recol) {
        const c = o.userData._mergeColor || WHITE, C = g.attributes.color, dst = out.color.data;
        for (let i = 0; i < cnt; i++) {
          const r = C ? C.getX(i) : 1, gg = C ? C.getY(i) : 1, b = C ? C.getZ(i) : 1;
          dst[(vo + i) * 3] = r * c.r; dst[(vo + i) * 3 + 1] = gg * c.g; dst[(vo + i) * 3 + 2] = b * c.b;
        }
        delete o.userData._mergeColor;
      }
      if (rmOut) { const [r, mt] = o.userData._mergeRM || [o.material.roughness, o.material.metalness]; for (let i = 0; i < cnt; i++) { rmOut[(vo + i) * 2] = r; rmOut[(vo + i) * 2 + 1] = mt; } }
      delete o.userData._mergeRM;
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
