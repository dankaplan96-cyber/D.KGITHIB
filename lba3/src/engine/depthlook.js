// DEPTH-LOOK (P132, the user 25.11: "I don't see the work on the walls and the depth of the look; everything looks very
// flat"). Candidates for the user's pick, each behind a URL switch, all OFF by default — with every switch off this module
// changes nothing (no shader text, no uniform, no render): the picture is exactly as before.
//
//   ?depth=relief    (a) relief on every painted world texture: a bump read from the colour texture's own light and dark
//                    (three's screen-space bump, perturbNormalArb, on the texture's luminance), plus a cavity term (the
//                    texel darker than its neighbourhood → less sky light), on the texture-array batches and on the
//                    single pieces with a painted map. No new texture: 3 more reads of the map a pixel (2 for the bump,
//                    1 at a coarser mip for the cavity). Per texture its own weight (walls full, the ground light, the
//                    grass and the sea none). The three textures with their own normal map (WALL-NORMALS) keep it.
//   ?depth=light     (b) a stronger key against the fill: the sun ×1.15, the sky fill ×0.88, its ground bounce ×0.6 (so a
//                    face turned up and a face turned down differ more: the relief reads in the shade too). Uniform
//                    values only: no new light, no new shader.
//   ?depth=contact   (c) contact darkening: the ground beside a wall, the foot of a wall, under eaves, canopies and props.
//                    A top-down height map of the world round Twinsen (one orthographic render of the static world into
//                    a 512² RGBA8 target, 1 MB, re-made when he has moved 20 m or the area changes) read by every lit
//                    surface: 5 reads a pixel. It darkens the sky's light (and a quarter of the sun's).
//   ?depth=rim       (d) corner shading: a wall seen at a grazing angle is drawn a little darker (the side of a
//                    building turning away from the eye), so corners and silhouettes separate. A few instructions a
//                    pixel, no read.
//   ?depth=paint     (e) the relief painted into the wall textures' colour at load (textures.js paintDepth): lit from
//                    the upper left, it reads in the shade as in the sun. No new texture, draw or shader.
//   ?depth=all       all five; `?depth=preset` the combined preset (the five at their chosen weights).
// Weights: `?dlrel=` (relief, 1 = chosen), `?dlao=` (contact, 1 = chosen), `?dlrim=`, `?dlkey=` (light, 1 = chosen).
import * as THREE from 'three';

const Q = typeof location !== 'undefined' ? location.search : '';
const ARG = /[?&]depth=([\w,]+)/.exec(Q);
const num = (k, d) => { const m = new RegExp(`[?&]${k}=([\\d.]+)`).exec(Q); return m ? +m[1] : d; };
const SET = new Set(ARG ? ARG[1].split(',') : []);
const ALL = SET.has('all') || SET.has('preset') || SET.has('1');
export const DL = {
  relief: ALL || SET.has('relief'),
  light: ALL || SET.has('light'),
  contact: ALL || SET.has('contact'),
  rim: ALL || SET.has('rim'),
  paint: ALL || SET.has('paint'),
  // (the preset: the relief lighter where the paint already carries it, the light a little softer than alone)
  reliefK: num('dlrel', SET.has('preset') ? 0.7 : 1), aoK: num('dlao', 1), rimK: num('dlrim', 1), keyK: num('dlkey', SET.has('preset') ? 0.8 : 1), paintK: num('dlpaint', 1),
  focus: new THREE.Vector3(), area: null, bakes: 0, lastBake: null,
};
DL.on = DL.relief || DL.contact || DL.rim;   // (a shader change; `light` alone is uniforms only)
if (typeof window !== 'undefined') window.__depthlook = DL;

// ------------------------------------------------------------------------------------------------ (b) the light
// called at the end of Environment.update (Citadel, regions and rooms alike)
DL.applyLight = (env) => {
  if (!DL.light) return;
  const k = DL.keyK;
  env.sun.intensity *= 1 + 0.15 * k;
  env.hemi.intensity *= 1 - 0.12 * k;
  env.hemi.groundColor.multiplyScalar(1 - 0.4 * k);
};

// ------------------------------------------------------------------------------------------------ (a) relief weights
// by the texture's name in textures() (set by textures.js nameWorldTextures); an unnamed painted world texture: 0.7
const W = { grass: 0.15, sand: 0.35, dirt: 0.45, cobble: 0.8, plaster: 1, plasterWall: 1, stone: 1, brick: 1, roof: 1, roofBlue: 1,
  wood: 0.8, planks: 0.85, sea: 0, clouds: 0, blob: 0, cliff: 1, rubble: 1, rubbleHouse: 1, thatch: 0.9, brass: 0.5, teal: 0.6,
  hazard: 0.3, deck: 0.6, slate: 1, fortStone: 1, chain: 0, pipe: 0.5, concrete: 0.7, metal: 0.5, rock: 1 };
const NAMES = new Map();   // source → name
export function nameWorldTextures(T) { for (const [k, t] of Object.entries(T)) if (t?.source) NAMES.set(t.source, k); }
export function nameWorldTexture(t, k) { if (t?.source) NAMES.set(t.source, k); }
const weightOf = (src) => { const n = NAMES.get(src); return n == null ? 0.7 : (W[n] ?? (/^wall/.test(n) ? 1 : 0.7)); };

// per array: a vec4[32] of layer weights (128 layers), refreshed when the array grows
const ARRW = new Map();   // A → { u, n }
function arrWeights(A) {
  let e = ARRW.get(A);
  if (!e) { e = { u: { value: Array.from({ length: 32 }, () => new THREE.Vector4()) }, n: -1 }; ARRW.set(A, e); }
  if (e.n !== A.n) {
    e.n = A.n;
    for (const [src, i] of A.layer) if (i < 128) e.u.value[i >> 2].setComponent(i & 3, weightOf(src) * DL.reliefK);
  }
  return e.u;
}

// ------------------------------------------------------------------------------------------------ shader text
const PARS = /* glsl */`
float dlCav = 1.0;
vec3 dlPerturb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir ) {
  vec3 sx = normalize( dFdx( surf_pos ) ), sy = normalize( dFdy( surf_pos ) );
  vec3 r1 = cross( sy, surf_norm ), r2 = cross( surf_norm, sx );
  float det = dot( sx, r1 ) * faceDir;
  vec3 g = sign( det ) * ( dHdxy.x * r1 + dHdxy.y * r2 );
  return normalize( abs( det ) * surf_norm - g );
}
float dlH( vec4 c ) { return sqrt( dot( c.rgb, vec3( 0.2126, 0.7152, 0.0722 ) ) ); }
`;
const CONTACT_PARS = /* glsl */`
uniform sampler2D dlTop; uniform vec4 dlBox; uniform vec3 dlTopY;
float dlTopAt( vec2 xz ) {
  vec2 uv = vec2( ( xz.x - dlBox.x ) * dlBox.z, ( dlBox.y - xz.y ) * dlBox.z );
  if ( any( lessThan( uv, vec2( 0.002 ) ) ) || any( greaterThan( uv, vec2( 0.998 ) ) ) ) return -1e4;
  vec4 c = texture2D( dlTop, uv );
  return dlTopY.x - ( c.r * 255.0 * 256.0 + c.g * 255.0 ) / 65535.0 * dlTopY.y;
}
`;
// the relief, after the normal is set (normal_fragment_maps); `S(uv)` reads the colour
const relief = (S, uv, w) => /* glsl */`
  {
    vec2 dlUv = ${uv};
    float dlW = ${w};
    // (branchless: the derivatives and the reads stay in uniform control flow; a weight of 0 changes nothing)
    vec2 dx = dFdx( dlUv ), dy = dFdy( dlUv );
    float h0 = dlH( ${S('dlUv')} );
    float hx = dlH( ${S('dlUv + dx')} ), hy = dlH( ${S('dlUv + dy')} );
    vec3 dlNb = dlPerturb( - vViewPosition, normal, vec2( hx - h0, hy - h0 ) * 1.6 * dlW, faceDirection );
    normal = dlW > 0.0 ? dlNb : normal;
    float hm = dlH( ${S('dlUv', true)} );
    dlCav = clamp( 1.0 - 1.6 * dlW * max( hm - h0, 0.0 ) / max( hm, 0.08 ), 0.55, 1.0 );
  }
`;
const AFTER_AO = (contact, rim) => /* glsl */`
  {
    vec3 dlP = cameraPosition + ( vec4( - vViewPosition, 0.0 ) * viewMatrix ).xyz;
    vec3 dlN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
    float dlAo = dlCav;
${contact ? `    {
      vec2 n2 = dlN.xz; float side = 1.0 - abs( dlN.y );
      vec2 fr = dlP.xz + n2 * 0.45;
      float floorY = dlTopAt( fr );
      // (a wall's foot: the band within 1.2 m of the floor in front of it, by how tall the thing it belongs to stands
      //  over that floor — a step's riser hardly, a wall fully)
      float tall = smoothstep( 0.35, 1.6, dlTopAt( dlP.xz - n2 * 0.3 ) - floorY );
      float foot = side * tall * ( 1.0 - smoothstep( 0.0, 1.2, dlP.y - floorY ) );
      float ring = 0.0, rmax = 0.0, ws = 0.0;
      for ( int i = 0; i < 4; i ++ ) {
        vec2 d = vec2( i == 0 ? 1.0 : i == 1 ? - 1.0 : 0.0, i == 2 ? 1.0 : i == 3 ? - 1.0 : 0.0 );
        float w = max( dot( d, n2 ) + 0.35, 0.0 );
        float t = dlTopAt( fr + d * 0.9 ) - dlP.y;
        float o = w * clamp( ( t - 0.1 ) / 1.0, 0.0, 1.0 ) * ( 1.0 - 0.5 * smoothstep( 3.0, 7.0, t ) );
        ring += o; rmax = max( rmax, o / max( w, 1e-3 ) ); ws += w;
      }
      ring = mix( ring / max( ws, 1e-3 ), rmax, 0.55 );   // (the ground beside one wall: most of the nearest occluder)
      dlAo *= 1.0 - dlTopY.z * max( ring, foot * 0.9 );
    }
` : ''}${rim ? `    {
      float nv = abs( dot( normalize( normal ), normalize( vViewPosition ) ) );
      float g = ( 1.0 - abs( dlN.y ) ) * ( 1.0 - smoothstep( 0.05, 0.55, nv ) );
      reflectedLight.directDiffuse *= 1.0 - ${(0.22 * DL.rimK).toFixed(3)} * g;
      reflectedLight.indirectDiffuse *= 1.0 - ${(0.3 * DL.rimK).toFixed(3)} * g;
    }
` : ''}    reflectedLight.indirectDiffuse *= dlAo;
    reflectedLight.directDiffuse *= mix( 1.0, dlAo, 0.25 );
  }
`;

// the shared uniforms of (c)
const TOP = { tex: { value: null }, box: { value: new THREE.Vector4(0, 0, 0, 0) }, y: { value: new THREE.Vector3(-1e4, 1, 0.5) } };

// onBeforeCompile for every lit material (the prototype's, and called by the twins' and the terrain's own); `A` the
// texture array of a twin. Only a shader with three's lighting chunks is touched.
const relief2D = (mat) => !!(DL.relief && mat?.map && !mat.normalMap && mat.map.source && (mat.map.isCanvasTexture || NAMES.has(mat.map.source)) && mat.map.wrapS === THREE.RepeatWrapping);
export function dlHook(sh, mat, A = null) {
  if (!DL.on) return;
  const fs = sh.fragmentShader;
  if (!fs.includes('#include <aomap_fragment>') || !fs.includes('#include <normal_fragment_maps>') || !fs.includes('vViewPosition')) return;
  let pre = PARS, out = fs;
  // (a) the relief: the twins from their array, a single piece from its map (a painted world texture with no normal map)
  if (DL.relief) {
    let rel = '';
    if (A && fs.includes('mapArr')) {
      sh.uniforms.dlRelArr = arrWeights(A);
      pre += 'uniform vec4 dlRelArr[ 32 ];\n';
      const S = (uv, coarse) => `texture( mapArr, vec3( ${uv}, vArr.z )${coarse ? ', 2.5' : ''} )`;
      rel = relief(S, 'vArr.xy', 'dlRelArr[ int( vArr.z + 0.5 ) >> 2 ][ int( vArr.z + 0.5 ) & 3 ]');
    } else if (relief2D(mat)) {
      sh.uniforms.dlRel1 = { value: weightOf(mat.map.source) * DL.reliefK };
      pre += 'uniform float dlRel1;\n';
      const S = (uv, coarse) => `texture2D( map, ${uv}${coarse ? ', 2.5' : ''} )`;
      rel = '#ifdef USE_MAP\n' + relief(S, 'vMapUv', 'dlRel1') + '#endif\n';
    }
    if (rel) out = out.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + rel);
  }
  if (DL.contact) { pre += CONTACT_PARS; sh.uniforms.dlTop = TOP.tex; sh.uniforms.dlBox = TOP.box; sh.uniforms.dlTopY = TOP.y; }
  out = out.replace('#include <aomap_fragment>', '#include <aomap_fragment>\n' + AFTER_AO(DL.contact, DL.rim));
  sh.fragmentShader = pre + out;
}
if (DL.on) {
  const P = THREE.Material.prototype, base = P.onBeforeCompile;
  P.onBeforeCompile = function (sh, r) { base.call(this, sh, r); dlHook(sh, this); };
  const key = P.customProgramCacheKey;
  P.customProgramCacheKey = function () { return key.call(this) + (relief2D(this) ? '|dlr' : '|dl'); };   // (a painted piece's relief: its own program)
}

// ------------------------------------------------------------------------------------------------ (c) the height map
const N = 512, SIZE = 112, MOVE = 20, UP = 60, RANGE = 140;
let RT = null, CAM = null, MAT = null;
function bakeMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uRange: { value: RANGE } },
    vertexShader: /* glsl */`
      #include <common>
      #include <batching_pars_vertex>
      varying float vD;
      void main() {
        #include <batching_vertex>
        #include <begin_vertex>
        #include <project_vertex>
        vD = - mvPosition.z;
      }`,
    fragmentShader: /* glsl */`
      uniform float uRange; varying float vD;
      void main() {
        float d = clamp( vD / uRange, 0.0, 1.0 ) * 65535.0, hi = floor( d / 256.0 );
        gl_FragColor = vec4( hi / 255.0, ( d - hi * 256.0 ) / 255.0, 0.0, 1.0 );
      }`,
    side: THREE.DoubleSide,
  });
}
// what the height map leaves out: people, the sky, the sea, rain and motes, see-through and unlit sprites, grass
const skip = (o) => o.userData?.rig || o.isPoints || o.isLine || o.isSprite || o.isSkinnedMesh
  || (o.material && !Array.isArray(o.material) && (o.material.transparent || o.material.depthWrite === false || o.material.isShaderMaterial && !o.material.lights && o.name !== 'terrain'))
  || /grass|tuft|flower|weed|reed/i.test(o.name || '');
// before the frame's render (Renderer.render): a new map when the focus moved MOVE m from the last one or the area changed
export function dlBake(renderer, scene, area) {
  if (!DL.contact) return;
  const f = DL.focus, L = DL.lastBake;
  if (L && L.area === area && Math.abs(f.x - L.x) < MOVE && Math.abs(f.z - L.z) < MOVE && Math.abs(f.y - L.y) < 8) return;
  RT ??= new THREE.WebGLRenderTarget(N, N, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false, depthBuffer: true });
  CAM ??= new THREE.OrthographicCamera(-SIZE / 2, SIZE / 2, SIZE / 2, -SIZE / 2, 0, RANGE);
  MAT ??= bakeMaterial();
  const cx = Math.round(f.x), cz = Math.round(f.z), top = f.y + UP;
  CAM.position.set(cx, top, cz); CAM.up.set(0, 0, -1); CAM.lookAt(cx, top - 1, cz); CAM.updateMatrixWorld(); CAM.updateProjectionMatrix();
  const hid = [];
  scene.traverseVisible((o) => { if (o !== scene && skip(o)) hid.push(o); });
  for (const o of hid) o.visible = false;
  const sm = renderer.shadowMap.enabled, rt0 = renderer.getRenderTarget(), cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
  const ov = scene.overrideMaterial, bg = scene.background, fog = scene.fog;
  const t0 = performance.now();
  try {
    renderer.shadowMap.enabled = false; scene.overrideMaterial = MAT; scene.background = null; scene.fog = null;
    renderer.setRenderTarget(RT); renderer.setClearColor(0xffff00, 1); renderer.clear(true, true, false);
    renderer.render(scene, CAM);
  } finally {
    renderer.setRenderTarget(rt0); renderer.setClearColor(cc, ca); renderer.shadowMap.enabled = sm;
    scene.overrideMaterial = ov; scene.background = bg; scene.fog = fog;
    for (const o of hid) o.visible = true;
  }
  DL.bakeMs = performance.now() - t0; DL.bakes++; DL.bakeHidden = hid.length;
  TOP.tex.value = RT.texture; TOP.box.value.set(cx - SIZE / 2, cz + SIZE / 2, 1 / SIZE, 0); TOP.y.value.set(top, RANGE, 0.45 * DL.aoK);
  DL.lastBake = { area, x: f.x, z: f.z, y: f.y };
}
// (tests: the map read back as heights over the box, a Float32Array N×N, row 0 = the box's north edge)
export function dlReadTop(renderer) {
  if (!RT) return null;
  const px = new Uint8Array(N * N * 4); renderer.readRenderTargetPixels(RT, 0, 0, N, N, px);
  const out = new Float32Array(N * N), [top, range] = [TOP.y.value.x, TOP.y.value.y];
  for (let i = 0; i < N * N; i++) out[i] = top - (px[i * 4] * 256 + px[i * 4 + 1]) / 65535 * range;
  return { n: N, size: SIZE, box: TOP.box.value.toArray(), h: out };
}
