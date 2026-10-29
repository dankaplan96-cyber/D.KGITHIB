// PERF-CPU: the world's painted textures as layers of one texture array, so the draw batches (drawbatch.js) fold pieces
// of ANY of them — and plain-colour pieces, on a white layer — into one draw per cell, where each texture was a draw of
// its own (Citadel's street at Low, battery, Follow camera: 57 draw-batch calls in the heaviest frame, 43 of them one
// per texture per cell).
//
// The textures are the static canvases made once at startup (textures.js toTex: 256 × 256, sRGB, repeat-wrapped,
// mipmapped, anisotropy 4, flipped on upload like any canvas texture). A layer holds the same texels: the canvas read
// back (opaque, so no premultiplication round-trip), its rows flipped as the canvas upload flips them; the array has the
// same format (sRGB 8-bit), wrapping, filters, mipmaps (the driver's own, per layer) and anisotropy. The twin material
// samples `texture(mapArr, vec3(uv, layer))` where the 2D twin sampled `texture2D(map, uv)`: the same filtering, the
// same decoded colour. Its roughness and metalness come from the vertices, as the 2D twin's (merge.js perVertexRM).
import * as THREE from 'three';

export const TEXARRAY = { on: !(typeof location !== 'undefined' && /[?&]notexarray/.test(location.search)), init: null };
const SRC = new Map();   // texture source → its canvas (registered by textures.js)
const ARR = new Map();   // size → { tex, layer: Map(source → index) }
export const WHITE = 0;  // (layer 0: white, for plain-colour pieces: colour × 1)

export function registerStatic(t) { const c = t?.source?.data; if (c && c.getContext && c.width === c.height) SRC.set(t.source, c); }

// can this map be drawn from the array? (a registered canvas, sampled as the array samples)
export function arrayable(t) {
  if (!TEXARRAY.on || !t || !SRC.has(t.source)) return false;
  return t.wrapS === THREE.RepeatWrapping && t.wrapT === THREE.RepeatWrapping && t.colorSpace === THREE.SRGBColorSpace && t.flipY === true && t.premultiplyAlpha === false
    && t.generateMipmaps !== false && t.minFilter === THREE.LinearMipmapLinearFilter && t.magFilter === THREE.LinearFilter && t.anisotropy === 4 && t.channel === 0
    && t.format === THREE.RGBAFormat && t.type === THREE.UnsignedByteType && t.source.data.width === 256;
}
export function arrayOf(size = 256) {
  let A = ARR.get(size);
  if (A) return A;
  const list = [...SRC].filter(([, c]) => c.width === size && c.height === size);
  const n = list.length + 1, S4 = size * size * 4, data = new Uint8Array(S4 * n);
  data.fill(255, 0, S4);
  const layer = new Map();
  let i = 1;
  for (const [src, c] of list) {
    const img = c.getContext('2d').getImageData(0, 0, size, size).data;
    // (flipY, as the canvas texture's upload: the canvas's bottom row is the layer's first)
    for (let y = 0; y < size; y++) data.set(img.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), i * S4 + y * size * 4);
    layer.set(src, i++);
  }
  const tex = new THREE.DataArrayTexture(data, size, size, n);
  tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
  tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true; tex.flipY = false; tex.unpackAlignment = 4;
  tex.name = 'world.textureArray'; tex.needsUpdate = true;
  A = { tex, layer, size };
  ARR.set(size, A);
  TEXARRAY.init?.(tex);   // (sent to the GPU now — the game's warm-up — not on the first frame that draws it)
  return A;
}
export const layerOf = (t) => (t ? arrayOf(256).layer.get(t.source) ?? -1 : WHITE);

// the twin: vertex colours (× the layer), roughness / metalness per vertex; one per side / shading / fog / depth state
const TWINS = new Map();
export function arrayTwinOf(m) {
  const A = arrayOf(256);
  const k = [m.side, m.flatShading, m.fog, m.depthWrite, m.depthTest, m.polygonOffset, m.polygonOffsetFactor, m.polygonOffsetUnits, m.wireframe].join('|');
  let t = TWINS.get(k);
  if (!t) {
    t = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: m.roughness, metalness: m.metalness, side: m.side, flatShading: m.flatShading, fog: m.fog, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits });
    t.name = 'merged-arr'; t.userData.twin = true; t.userData.rm = true; t.userData.arr = true;
    t.onBeforeCompile = (sh) => {
      sh.uniforms.mapArr = { value: A.tex };
      sh.vertexShader = 'attribute vec2 rm;\nattribute vec2 auv;\nattribute float layer;\nvarying vec2 vRM;\nvarying vec3 vArr;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvRM = rm;\n\tvArr = vec3( auv, layer );');
      sh.fragmentShader = 'uniform highp sampler2DArray mapArr;\nvarying vec2 vRM;\nvarying vec3 vArr;\n' + sh.fragmentShader
        .replace('#include <map_fragment>', '#include <map_fragment>\n\tdiffuseColor *= texture( mapArr, vArr );')
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vRM.x;')
        .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vRM.y;');
    };
    t.customProgramCacheKey = () => 'merged-arr';
    TWINS.set(k, t);
  }
  return t;
}
