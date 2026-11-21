// Game side of the LBA3 Blender bridge: loaded INTO the running game page (same origin, the game's own `three` and
// `props.js` modules, so materials are the game's cached ones and nothing here is a copy of the engine).
//
//   extractProp({ builder, opts, recipes })  a code-built prop (props.js) -> an lba3-polyprop object + its textures
//   buildPolyProp(data)                       an lba3-polyprop object -> a THREE.Group drawn with the game's materials
//
// lba3-polyprop (version 1): game axes (+y up, front +z, metres; origin on the floor at the footprint's centre),
// one part per material (= one draw call), indexed triangles with normals, uvs and (for vertex-coloured materials)
// linear vertex colours; `material.recipe` names the game material (props.js MAT.<fn>(...args)) so a round trip
// keeps the shared, cached material instead of making a new one. Schema: ../polyprop.schema.json.
import * as THREE from 'three';
import * as P from '../../../src/game/props.js';

const round = (a, k) => Array.from(a, (x) => Math.round(x * k) / k);

export function extractProp({ builder, opts = {}, recipes = [], name = builder }) {
  const fn = P[builder];
  if (typeof fn !== 'function') throw new Error(`props.js has no builder "${builder}"`);
  const group = new THREE.Group();
  const k = new P.Kit(group);
  const footprint = fn(k, opts) || null;
  k.flush();
  // which game material is which: the recipes given, by identity (MAT caches every material by its key)
  const known = new Map(recipes.map((r) => [P.MAT[r[0]](...r.slice(1)), r]));
  const textures = {};
  const parts = [];
  group.updateMatrixWorld(true);
  for (const m of group.children) {
    if (!m.isMesh) continue;
    const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
    const mat = m.material, rec = known.get(mat) || null;
    const key = rec ? rec.join(':') : (mat.vertexColors ? 'vc:' + mat.uuid.slice(0, 8) : 'mat:' + mat.uuid.slice(0, 8));
    let map = null;
    const img = mat.map?.image;
    if (img && (img instanceof HTMLCanvasElement || img instanceof ImageBitmap || img instanceof HTMLImageElement)) {
      map = key.replace(/[^a-z0-9_-]+/gi, '_') + '.png';
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      textures[map] = { dataURL: c.toDataURL('image/png'), size: [img.width, img.height] };
    }
    const A = g.attributes;
    parts.push({
      material: { key, recipe: rec, color: '#' + mat.color.getHexString(THREE.SRGBColorSpace), roughness: mat.roughness, metalness: mat.metalness, map, vertexColors: !!mat.vertexColors, tile: mat.userData.tile ?? 0 },
      pos: round(A.position.array, 1e5), nrm: round(A.normal.array, 1e4), uv: A.uv ? round(A.uv.array, 1e5) : null,
      col: mat.vertexColors && A.color ? round(A.color.array, 1e4) : null,
      idx: g.index ? Array.from(g.index.array) : [...Array(A.position.count).keys()],
    });
  }
  const data = { format: 'lba3-polyprop', version: 1, name, units: 'metres; +y up; front +z; origin on the floor at the footprint centre',
    source: { kind: 'code-built prop', builder: `src/game/props.js ${builder}`, opts }, footprint, textureDir: 'textures', parts };
  data.bbox = bboxOf(data.parts); data.triangles = data.parts.reduce((s, p) => s + p.idx.length / 3, 0);
  return { data, textures };
}

export function bboxOf(parts) {
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const p of parts) for (let i = 0; i < p.pos.length; i += 3) for (let a = 0; a < 3; a++) { lo[a] = Math.min(lo[a], p.pos[i + a]); hi[a] = Math.max(hi[a], p.pos[i + a]); }
  return { min: lo.map((x) => +x.toFixed(4)), max: hi.map((x) => +x.toFixed(4)), size: lo.map((l, a) => +(hi[a] - l).toFixed(4)) };
}

// a polyprop drawn in the game: the recipe's own cached material when there is one, else a plain standard material
export function buildPolyProp(data) {
  if (data.format !== 'lba3-polyprop') throw new Error('not an lba3-polyprop');
  const group = new THREE.Group(); group.name = 'polyprop:' + data.name;
  for (const p of data.parts) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(p.nrm, 3));
    if (p.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(p.uv, 2));
    if (p.col) g.setAttribute('color', new THREE.Float32BufferAttribute(p.col, 3));
    g.setIndex(p.idx);
    g.computeBoundingSphere();
    const m = p.material;
    const mat = m.recipe ? P.MAT[m.recipe[0]](...m.recipe.slice(1))
      : new THREE.MeshStandardMaterial({ color: m.color, roughness: m.roughness ?? 0.8, metalness: m.metalness ?? 0, vertexColors: !!p.col });
    const mesh = new THREE.Mesh(g, mat); mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = m.key;
    group.add(mesh);
  }
  return group;
}
