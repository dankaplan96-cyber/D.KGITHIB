// Ballastra's shallow sea (W-1): the sea bed under the harbour, the water over it, and what the physics knows of both.
//
// The water is the game's own kind (environment.js: a flat plane with slow travelling waves, the painted sea texture
// drifting in two layers, shallow and deep colours by the depth over the bed, foam where it is shallow, a sun glint),
// in Ballastra's own green-blue, calmer, and with one thing of its own: the great arch shows in it. The play camera
// looks down at the water and never sees the arch's span (its frame ends a few degrees over the horizon), so the
// water reflects a painted picture of the arch and the district (skyline.js archPicture) where a ray bounced off the
// rippled surface would meet the arch's plane: one texture read a pixel, no second render.
//
// The bed is drawn (sand in the shallows, weed, the harbour's rubble at the piers) and sets the water's depth through
// a small height texture. The physics never sees the drawn bed: its height is always under WATER_FLOOR (deep water,
// physics.js), so wherever no brick stands is sea, which nobody can walk into (the soft edge is the harbour's:
// harbor.js pushes back anyone who ends up over water).
//
// CONTRACT
//   seaSetup(group, ox, oz, physics, { picture, archPlane }) → { water, inner(x0, z0, x1, z1, y), caissonWater(w, d), update(dt, t) }
//     water          the outer sea mesh (y = 0), its material shared by every water surface here
//     inner(...)     a water surface at another level (the inner basin, y 1.7): a mesh in the group
//     caissonWater   a water surface of w × d for a moving part to carry (a mesh, not added)
//   bedDrawn(x, z)   the drawn bed's height (local)
//   SEA_WY           the outer water's level (0)
import * as THREE from 'three';
import { textures } from '../../engine/textures.js';
import { fbm, smoothstep } from '../../engine/math.js';
import { tm } from '../kit.js';

export const SEA_WY = 0;
const BED = { half: 128, n: 256 };        // the height texture: 1 m a texel over ±128 m
const DRAW = { x0: -64, x1: 56, z0: -48, z1: 40, step: 1.6 };   // the drawn bed's grid (local)

// the drawn bed (local metres): deep outside, shallow sand round the harbour, the inner basin's floor high under
// its own water, the lift's pit
let SHAPE = null;   // { basin: [x0, z0, x1, z1], pit: [x0, z0, x1, z1], banks: [[x, z, r]] } (harbor.js)
// (W-2, arches.js: a place of its own may give SHAPE.bed(x, z, h) → h, its own bed over the harbour's, and
//  SHAPE.color(x, z, y, c), its own colour for the drawn bed: the district's canal floor of mud)
export function setBedShape(s) { SHAPE = s; }
export function bedDrawn(x, z) {
  const S = SHAPE || {};
  const r = Math.hypot((x + 6) / 52, (z + 2) / 44);
  let h = -4.4 + smoothstep(1.25, 0.7, r) * 3.1 + (fbm(x * 0.05 + 3.1, z * 0.05 - 1.7, 3) - 0.5) * 0.7;
  for (const [bx, bz, br] of S.banks || []) h = Math.max(h, -0.75 - Math.hypot(x - bx, z - bz) / br * 1.4);
  const inR = (b, m = 0) => x > b[0] - m && x < b[2] + m && z > b[1] - m && z < b[3] + m;
  if (S.basin && inR(S.basin)) h = 0.35 + (fbm(x * 0.2, z * 0.2, 2) - 0.5) * 0.25;
  if (S.pit && inR(S.pit)) h = -1.2;
  if (S.bed) return S.bed(x, z, h);
  return Math.min(h, S.basin && inR(S.basin) ? 1.0 : -0.6);
}

const WATER_VS = /* glsl */`
uniform float uTime, uAmp;
varying vec3 vWorld; varying vec3 vNormal;
#include <fog_pars_vertex>
vec3 wave(vec2 p, vec2 dir, float amp, float len, float spd, inout vec3 nrm){
  float k = 6.2831 / len; float f = k * (dot(dir, p) - spd * uTime);
  nrm.x -= dir.x * k * amp * cos(f); nrm.z -= dir.y * k * amp * cos(f);
  return vec3(0.0, amp * sin(f), 0.0);
}
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec3 n = vec3(0.0, 1.0, 0.0);
  vec3 off = wave(wp.xz, normalize(vec2(1.0, 0.35)), uAmp, 15.0, 1.9, n)
           + wave(wp.xz, normalize(vec2(-0.45, 1.0)), uAmp * 0.6, 8.0, 1.4, n)
           + wave(wp.xz, normalize(vec2(0.7, -0.8)), uAmp * 0.3, 4.6, 1.1, n);
  wp.xyz += off;
  vWorld = wp.xyz; vNormal = normalize(n);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const WATER_FS = /* glsl */`
uniform float uTime; uniform vec2 uOrigin; uniform float uSize;
uniform vec3 uSunDir, uDeep, uShallow, uSky; uniform sampler2D uBed, uSea, uPic; uniform vec4 uPicBox;
varying vec3 vWorld; varying vec3 vNormal;
#include <fog_pars_fragment>
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
void main(){
  vec2 uv = (vWorld.xz - uOrigin) / uSize + 0.5;
  float ground = (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) ? -6.0 : texture2D(uBed, uv).r * 8.0 - 6.0;
  float depth = max(vWorld.y - ground, 0.0);
  vec2 suv = vWorld.xz * 0.05;
  vec3 s1 = texture2D(uSea, suv + vec2(uTime * 0.010, uTime * 0.006)).rgb;
  vec3 s2 = texture2D(uSea, suv * 1.7 + vec2(-uTime * 0.007, uTime * 0.011)).rgb;
  float seaL = dot((s1 + s2) * 0.5, vec3(0.3, 0.55, 0.15));   // (the painted texture's light and dark only: the colour is Ballastra's)
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 nrm = normalize(vNormal);
  float fres = pow(1.0 - max(dot(nrm, V), 0.0), 4.0);
  vec3 col = mix(uShallow, uDeep, smoothstep(0.3, 3.6, depth)) * (0.62 + seaL * 0.85);
  // what the water mirrors: the haze, and the arch's picture where the bounced ray meets its plane
  vec3 sky = uSky; vec3 R = reflect(-V, nrm); float pic = 0.0;
  if (R.z < -0.01) {
    float t = (uPicBox.z - vWorld.z) / R.z;
    vec3 P = vWorld + R * t;
    vec2 pu = vec2((P.x - uPicBox.x) / uPicBox.y, P.y / uPicBox.w);
    if (t > 0.0 && pu.x > 0.0 && pu.x < 1.0 && pu.y > 0.0 && pu.y < 1.0) { vec4 a = texture2D(uPic, pu); sky = mix(sky, a.rgb, a.a * 0.9); pic = a.a; }
  }
  // (the arch shows in the still water a little more than the physics of it would: the harbour's landmark in the
  //  picture the play camera can't raise its eyes to)
  col = mix(col, sky, clamp(max(fres * 0.7, pic * 0.42), 0.0, 0.75));
  vec3 L = normalize(uSunDir);
  float spec = pow(max(dot(reflect(-L, nrm), V), 0.0), 140.0) * 1.8;
  float foamN = n(vWorld.xz * 1.4 + uTime * 0.5);
  float foam = smoothstep(0.9, 0.0, depth) * smoothstep(0.4, 0.8, foamN + 0.3 * sin(uTime * 1.3 - depth * 7.0));
  col += vec3(0.95) * foam * 0.55 + vec3(1.0, 0.96, 0.84) * spec;
  float alpha = mix(0.42, 0.95, smoothstep(0.0, 2.6, depth));
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

// the bed's height texture (8 bits: -6 … +2 m) and the drawn bed's mesh
function bedTexture() {
  const N = BED.n, a = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = -BED.half + (i + 0.5) * (2 * BED.half / N), z = -BED.half + (j + 0.5) * (2 * BED.half / N);
    a[j * N + i] = Math.max(0, Math.min(255, Math.round(((bedDrawn(x, z) + 6) / 8) * 255)));
  }
  const t = new THREE.DataTexture(a, N, N, THREE.RedFormat, THREE.UnsignedByteType);
  t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
}
function bedMesh() {
  const { x0, x1, z0, z1, step } = DRAW, nx = Math.round((x1 - x0) / step), nz = Math.round((z1 - z0) / step);
  const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const p = g.attributes.position, col = new Float32Array(p.count * 3), c = new THREE.Color();
  const sand = new THREE.Color('#d8c89c'), weed = new THREE.Color('#6f8a58'), deep = new THREE.Color('#5a7a72'), rub = new THREE.Color('#b8ac92');
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = bedDrawn(x, z);
    p.setY(i, y);
    c.copy(sand).lerp(deep, smoothstep(-1.2, -3.6, y));
    const w = fbm(x * 0.11 + 7.3, z * 0.11 - 2.2, 3);
    if (w > 0.56) c.lerp(weed, smoothstep(0.56, 0.7, w) * 0.8);
    if (y > 0.2) c.copy(rub);
    if (SHAPE?.color) SHAPE.color(x, z, y, c);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, tm('sand', { vc: true, rough: 0.95 }));
  m.receiveShadow = true; m.castShadow = false; m.name = 'bl_bed';
  return m;
}

export function seaSetup(group, ox, oz, physics, { picture = null, picBox = [-60, 120, -100, 60], sunDir = [-0.5, 0.8, 0.35], env = {} } = {}) {
  // physics: deep water everywhere in the region's square (no ground of its own: what stands is bricks)
  physics.terrain.addPatch({ half: 420, heightAt: () => -3 }, ox, oz);
  group.add(bedMesh());
  const TX = textures(), sea = TX.sea.clone(); sea.needsUpdate = true; sea.wrapS = sea.wrapT = THREE.RepeatWrapping;
  const U = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uAmp: { value: 0.055 }, uSunDir: { value: new THREE.Vector3(...sunDir).normalize() },
    uDeep: { value: new THREE.Color(env.deep || '#2a7a86') }, uShallow: { value: new THREE.Color(env.shallow || '#62c2b0') }, uSky: { value: new THREE.Color(env.sky || '#d4e8ea') },
    uOrigin: { value: new THREE.Vector2(ox, oz) }, uSize: { value: BED.half * 2 }, uBed: { value: null }, uSea: { value: null }, uPic: { value: null },
    uPicBox: { value: new THREE.Vector4(ox + picBox[0], picBox[1], oz + picBox[2], picBox[3]) },
  }]);
  U.uBed.value = bedTexture(); U.uSea.value = sea; U.uPic.value = picture;
  // (no picture: a fully clear one, so the shader has nothing to mirror)
  if (!picture) { const t = new THREE.DataTexture(new Uint8Array(4), 1, 1); t.needsUpdate = true; U.uPic.value = t; }
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, fog: true, depthWrite: false });
  mat.userData.noShadow = true;
  const plane = (w, d, seg) => { const g = new THREE.PlaneGeometry(w, d, seg[0], seg[1]); g.rotateX(-Math.PI / 2); return g; };
  const water = new THREE.Mesh(plane(640, 640, [100, 100]), mat);
  water.position.y = SEA_WY; water.renderOrder = 2; water.name = 'bl_sea'; water.castShadow = false; water.receiveShadow = false;
  group.add(water);
  const inner = (x0, z0, x1, z1, y) => {
    const m = new THREE.Mesh(plane(x1 - x0, z1 - z0, [Math.max(1, Math.round((x1 - x0) / 2)), Math.max(1, Math.round((z1 - z0) / 2))]), mat);
    m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.renderOrder = 2; m.name = 'bl_innerWater'; group.add(m); return m;
  };
  const caissonWater = (w, d) => { const m = new THREE.Mesh(plane(w, d, [3, 6]), mat); m.renderOrder = 2; m.name = 'bl_caissonWater'; return m; };
  return { water, inner, caissonWater, mat, update(dt, t) { U.uTime.value = t; } };
}
