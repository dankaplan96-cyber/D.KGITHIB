// PERF-CPU: the world's painted textures as layers of texture arrays, so the draw batches (drawbatch.js) fold pieces of
// ANY of them — and plain-colour pieces, on a white layer — into one draw per cell and array, where each texture was a
// draw of its own (Citadel's street: 112 batches, 67 of them one texture's pieces in one cell).
//
// A texture qualifies when it is a canvas texture, repeat-wrapped, sRGB 8-bit, mipmapped with the default filters, flipped on upload like any canvas texture. Its layer
// holds the same texels: the canvas read back (opaque painted canvases: no premultiplication round-trip), rows flipped as
// the canvas upload flips them. One array per canvas size and anisotropy, with the same format (sRGB 8-bit), wrapping,
// filters, mipmaps (the driver's own, per layer) and anisotropy. The twin samples `texture(mapArr, vec3(uv, layer))`
// where the 2D twin sampled `texture2D(map, uv)`: the same filtering, the same decoded colour; its roughness and
// metalness come from the vertices as the 2D twin's (merge.js perVertexRM). The layer is read when the batch is built;
// a canvas updated later (the texture's or its source's version moves) makes its pieces leave their batches
// (drawbatch.js watch: part of a folded piece's look), and they are drawn on their own with the updated texture.
// An array grows when an area brings a new texture (built in that area's batch build, behind the scene change's black):
// its data are copied into a new array and the twins are pointed at it.
import * as THREE from 'three';

export const TEXARRAY = { on: !(typeof location !== 'undefined' && /[?&]notexarray/.test(location.search)), init: null };
export const WHITE = 0;  // (layer 0 of every array: white, for plain-colour pieces: colour × 1)
const ARR = new Map();   // key (w×h|anisotropy) → { w, h, aniso, data, n, layer: Map(source → index), tex, users: Set(uniform), dirty }

export function registerStatic() { /* (kept for textures.js: every qualifying canvas texture is taken as it is met) */ }

const canvasOf = (t) => { const c = t?.source?.data; return c && typeof c.getContext === 'function' && c.width > 0 && c.height > 0 ? c : null; };
// can this map be drawn from an array? (a canvas painted once, sampled as the array samples)
export function arrayable(t) {
  if (!TEXARRAY.on || !t || !t.isCanvasTexture || !canvasOf(t)) return false;
  return t.wrapS === THREE.RepeatWrapping && t.wrapT === THREE.RepeatWrapping && t.colorSpace === THREE.SRGBColorSpace && t.flipY === true && t.premultiplyAlpha === false
    && t.generateMipmaps !== false && t.minFilter === THREE.LinearMipmapLinearFilter && t.magFilter === THREE.LinearFilter && t.channel === 0
    && t.format === THREE.RGBAFormat && t.type === THREE.UnsignedByteType && t.unpackAlignment === 4;
}
export const keyOf = (t) => { if (!t) return '256x256|4'; const c = canvasOf(t); return `${c.width}x${c.height}|${t.anisotropy}`; };
function arrayFor(key) {
  let A = ARR.get(key);
  if (A) return A;
  const [wh, an] = key.split('|'), [w, h] = wh.split('x').map(Number);
  A = { key, w, h, aniso: +an, data: new Uint8Array(w * h * 4 * 4), n: 1, layer: new Map(), tex: null, users: new Set(), dirty: true };
  A.data.fill(255, 0, w * h * 4);
  ARR.set(key, A);
  return A;
}
// the layer of a texture in its array (added now if new), or WHITE for no texture; -1: it could not be read
export function layerOf(t) {
  const A = arrayFor(keyOf(t));
  if (!t) return WHITE;
  let i = A.layer.get(t.source);
  if (i !== undefined) return i;
  const c = canvasOf(t), S4 = A.w * A.h * 4;
  let img;
  try { img = c.getContext('2d').getImageData(0, 0, A.w, A.h).data; } catch { return -1; }
  if (A.data.length < (A.n + 1) * S4) { const d = new Uint8Array(A.data.length * 2); d.set(A.data); A.data = d; }
  const row = A.w * 4;
  for (let y = 0; y < A.h; y++) A.data.set(img.subarray((A.h - 1 - y) * row, (A.h - y) * row), A.n * S4 + y * row);   // (flipY, as the canvas upload)
  i = A.n++; A.layer.set(t.source, i); A.dirty = true;
  return i;
}
// the arrays that grew: a new texture each (sent to the GPU by TEXARRAY.init), every twin pointed at it
export function flushArrays() {
  for (const A of ARR.values()) {
    if (!A.dirty) continue;
    A.dirty = false;
    const tex = new THREE.DataArrayTexture(A.data.slice(0, A.n * A.w * A.h * 4), A.w, A.h, A.n);
    tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = A.aniso;
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true; tex.flipY = false; tex.unpackAlignment = 4;
    tex.name = `world.textureArray ${A.key} ×${A.n}`; tex.needsUpdate = true;
    const old = A.tex; A.tex = tex;
    for (const u of A.users) u.value = tex;
    old?.dispose();
    TEXARRAY.init?.(tex);   // (sent to the GPU now — behind the black or the loading screen — not on the first frame drawn)
  }
}
export const arrays = () => [...ARR.values()].map((A) => ({ key: A.key, layers: A.n }));

// the twin: vertex colours (× the layer), roughness / metalness per vertex; one per array and side / shading / fog / depth state
const TWINS = new Map();
export function arrayTwinOf(m, key = '256x256|4') {
  const A = arrayFor(key);
  const k = [key, m.side, m.flatShading, m.fog, m.depthWrite, m.depthTest, m.polygonOffset, m.polygonOffsetFactor, m.polygonOffsetUnits, m.wireframe].join('|');
  let t = TWINS.get(k);
  if (!t) {
    t = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: m.roughness, metalness: m.metalness, side: m.side, flatShading: m.flatShading, fog: m.fog, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits });
    t.name = 'merged-arr ' + key; t.userData.twin = true; t.userData.rm = true; t.userData.arr = key;
    t.onBeforeCompile = (sh) => {
      const u = { value: A.tex }; A.users.add(u); sh.uniforms.mapArr = u;
      sh.vertexShader = 'attribute vec2 rm;\nattribute vec2 auv;\nattribute float layer;\nattribute vec3 em;\nvarying vec2 vRM;\nvarying vec3 vArr;\nvarying vec3 vEm;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvRM = rm;\n\tvArr = vec3( auv, layer );\n\tvEm = em;');
      sh.fragmentShader = 'uniform highp sampler2DArray mapArr;\nvarying vec2 vRM;\nvarying vec3 vArr;\nvarying vec3 vEm;\n' + sh.fragmentShader
        .replace('vec3 totalEmissiveRadiance = emissive;', 'vec3 totalEmissiveRadiance = vEm;')
        .replace('#include <map_fragment>', '#include <map_fragment>\n\tdiffuseColor *= texture( mapArr, vArr );')
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vRM.x;')
        .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vRM.y;');
    };
    t.customProgramCacheKey = () => 'merged-arr';
    TWINS.set(k, t);
  }
  return t;
}
