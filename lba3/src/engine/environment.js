// Sky, sea, weather and lighting, following LBA2's exterior renderer:
//   * the sky is a flat, scrolling cloud ceiling (DrawSky in 3DEXT/DRAWSKY.CPP)
//   * linear fog fades everything into one flat colour (SetFog(StartZFog, ClipZFar))
//   * the sea is a flat textured plane
// One "storm" value (1 = tempest, 0 = clear) drives all of it.
import * as THREE from 'three';
import { lerp } from './math.js';
import { textures } from './textures.js';

const WATER_VS = `
uniform float uTime, uStorm, uWaveAmp;
varying vec3 vWorld; varying vec3 vNormal;
#include <fog_pars_vertex>
vec3 wave(vec2 p, vec2 dir, float amp, float len, float spd, inout vec3 nrm){
  float k = 6.2831/len; float f = k*(dot(dir,p) - spd*uTime);
  nrm.x -= dir.x * k * amp * cos(f); nrm.z -= dir.y * k * amp * cos(f);
  return vec3(0.0, amp*sin(f), 0.0);
}
void main(){
  vec4 wp = modelMatrix * vec4(position,1.0);
  float a = mix(0.08, 0.38, uStorm) * uWaveAmp;
  vec3 n = vec3(0.0,1.0,0.0);
  vec3 off = wave(wp.xz, normalize(vec2(1.0,0.3)), a, 18.0, 3.0, n)
           + wave(wp.xz, normalize(vec2(-0.4,1.0)), a*0.6, 9.0, 2.2, n)
           + wave(wp.xz, normalize(vec2(0.7,-0.8)), a*0.35, 5.0, 1.6, n);
  wp.xyz += off;
  vWorld = wp.xyz; vNormal = normalize(n);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const WATER_FS = `
uniform float uTime, uStorm, uFlash, uSize, uSegs; uniform vec2 uOrigin; uniform vec3 uSunDir, uDeep, uShallow, uSky; uniform sampler2D uHeight, uSea;
varying vec3 vWorld; varying vec3 vNormal;
#include <fog_pars_fragment>
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void main(){
  vec2 uv = (vWorld.xz - uOrigin) / uSize;
  vec2 tuv = (uv * uSegs + 0.5) / (uSegs + 1.0);
  float ground = texture2D(uHeight, tuv).r * 30.0 - 10.0;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) ground = -10.0;
  float depth = max(vWorld.y - ground, 0.0);
  // painted sea texture, two layers drifting against each other
  vec2 suv = vWorld.xz * 0.05;
  vec3 s1 = texture2D(uSea, suv + vec2(uTime * 0.012, uTime * 0.007)).rgb;
  vec3 s2 = texture2D(uSea, suv * 1.6 + vec2(-uTime * 0.009, uTime * 0.013)).rgb;
  vec3 seaTex = (s1 + s2) * 0.5;
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 nrm = normalize(vNormal);
  float fres = pow(1.0 - max(dot(nrm, V), 0.0), 4.0);
  vec3 col = mix(uShallow, uDeep, smoothstep(0.0, 6.0, depth)) * seaTex * 2.2;
  col = mix(col, uSky, clamp(fres * 0.5, 0.0, 0.6));
  vec3 L = normalize(uSunDir);
  float spec = pow(max(dot(reflect(-L, nrm), V), 0.0), 120.0) * (1.0 - uStorm) * 2.5;
  float foamN = n(vWorld.xz * 1.3 + uTime * 0.6);
  float foam = smoothstep(1.1, 0.0, depth) * smoothstep(0.35, 0.75, foamN + 0.35 * sin(uTime * 1.5 - depth * 6.0));
  col += vec3(0.95) * foam * 0.8 + vec3(1.0, 0.95, 0.8) * spec;
  col += uFlash * 0.4;
  float alpha = mix(0.6, 0.97, smoothstep(0.0, 2.0, depth));
  gl_FragColor = vec4(col, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

// PERF-BATTERY: the sea. It was a fixed 1400 m plane of 220 × 220 squares (6.36 m: 96 800 triangles drawn every frame
// outdoors on Citadel, the largest single mesh on the street), of which only the part within ~300 m of the camera can
// be anything but fog. Now the same 6.36 m squares, on the same lattice (x and z multiples of SEA_STEP: the waves are
// computed at the very same points), cover ±SEA_NEAR steps around the camera, and one ring of long quads carries the
// sea on to ±SEA_FAR m, where everything is fog anyway (Environment.update moves the grid in whole steps). A point the
// view can show unfogged is at most fog end (190 m) / cos(the screen corner's angle) ≈ 300 m away. 21.6k triangles.
const SEA_STEP = 1400 / 220, SEA_NEAR = 51, SEA_FAR = 1000;
function seaGeometry() {
  const L = [-SEA_FAR];
  for (let i = -SEA_NEAR; i <= SEA_NEAR; i++) L.push(i * SEA_STEP);
  L.push(SEA_FAR);
  const n = L.length, pos = new Float32Array(n * n * 3), idx = new Uint32Array((n - 1) * (n - 1) * 6);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = (j * n + i) * 3; pos[k] = L[i]; pos[k + 1] = 0; pos[k + 2] = L[j]; }
  let o = 0;
  for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;   // (counter-clockwise seen from above, as the rotated plane was)
    idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = c; idx[o++] = d; idx[o++] = b;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

const C = (c) => new THREE.Color(c);
// GFX-LOOK-2: the sun over Citadel. It shone from the north-west (−x, −z), and the chapters' walks go north (the house
// to the square) and west (the square to the harbour), the play camera behind Twinsen: into the sun nearly all the way,
// so every wall and prop turned its shaded side to the camera and the shadows ran at it — the flat, muddy look of the
// street. Now from the south-west (−x, +z, the same height): from the left and behind on the way to the square, from the
// left across the harbour, and the same side as the people's own fixed ramp light (characters.js LBA_LIGHT, from −x, +z),
// so a person and the house beside him are lit from one side. Interiors and the other regions keep the old direction
// (their rooms and views were composed under it); a region may give its own (env.sunDir). `?oldsun`: as before (A/B).
const OLD_SUN = typeof location !== 'undefined' && /[?&]oldsun\b/.test(location.search);
const SUN_BASE = new THREE.Vector3(-0.5, 0.8, -0.35).normalize(), SUN_CITADEL = OLD_SUN ? SUN_BASE : new THREE.Vector3(-0.5, 0.8, 0.35).normalize();
// SKY-1: the sky dome (see Environment's constructor)
const SKY_VS = /* glsl */`
varying vec3 vDir;
void main() {
  vDir = position;   // (the dome is centred on the camera: its own position is the view direction)
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position.z = gl_Position.w * 0.99999;   // (at the far end of the depth range: behind everything drawn)
}`;
const SKY_FS = /* glsl */`
uniform vec3 uHorizon, uZenith, uCloud; uniform sampler2D uTex; uniform vec2 uOff; uniform float uCover;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = max(d.y, 0.0);
  vec3 col = mix(uHorizon, uZenith, smoothstep(0.03, 0.55, h));
  // the cloud ceiling, a flat plane overhead seen in perspective, thinning into the haze near the horizon
  vec2 uv = d.xz / (h + 0.12) * 0.32 + uOff;
  // (WEATHER-1: uCover thickens the ceiling for rain and overcast spells; 0 = the thresholds as they were)
  float c = smoothstep(0.58 - uCover * 0.42, 0.95 - uCover * 0.3, texture2D(uTex, uv).r) * smoothstep(0.04, 0.3, h);
  col = mix(col, uCloud, c * 0.85);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;   // (no tone mapping: as the fog colour and the old flat background, so the horizon meets the fogged world exactly)

const PAL = {
  // GFX-LOOK-2: the fill a cooler sky blue (#d8ecff → #c8dcff, 1.25 → 1.42: about as bright in red and green, +14 % blue) and its bounce warmer, less olive (#6a7a4a → #77745a):
  // what lies in the sun's shadow is lit by these alone, and read warm grey-brown (the soil in a house's shadow was a
  // dark orange); LBA2's shadows are cool. The sun a shade warmer so the sunlit side keeps its colour. The sea a little
  // more cyan (LBA2's saturated cyan-blue rather than royal blue).
  clear: { fog: C('#a8d2f2'), zenith: C('#4f8fd6'), clouds: C('#ffffff'), sun: C('#fff0d2'), hemiSky: C('#c8dcff'), hemiGround: C('#77745a'), deep: C('#1a76b0'), shallow: C('#3fc8c6'), sky: C('#bfe0ff') },
  storm: { fog: C('#6f8094'), zenith: C('#4a586c'), clouds: C('#59667a'), sun: C('#b3c2dc'), hemiSky: C('#a9b8d0'), hemiGround: C('#4c5a46'), deep: C('#1a3f5c'), shallow: C('#2f7c86'), sky: C('#7d8ea2') },
};

// WEATHER-1: the frame's light measure (the luma of each light's colour times its intensity, summed): what the light
// cycle and the weather may never take below the storm palette's (Environment.lightFloor)
const LUM = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
const FLOOR_CITADEL = 0.7 * LUM(PAL.storm.sun) + 1.05 * LUM(PAL.storm.hemiSky);   // (the storm palette: update()'s s = 1)
const CLEAR_CITADEL = 2.6 * LUM(PAL.clear.sun) + 1.42 * LUM(PAL.clear.hemiSky);
const FLOOR_RATIO = FLOOR_CITADEL / CLEAR_CITADEL;   // (a region's floor: its own clear light × the same ratio)
const FLASH_FOG = C('#e8eeff'), WHITE = C('#ffffff');
// WEATHER-1: the modifiers src/game/weather.js writes each frame and update() lays over the palette (Citadel's storm mix
// or a region's own env). `on` false (the default, weather off, the tests' boot): nothing is applied, the picture is
// exactly as before. Never applied indoors.
export function weatherMods() {
  const one = () => new THREE.Color(1, 1, 1), c = () => new THREE.Color(0, 0, 0);
  return {
    on: false,
    sunK: 1, hemiK: 1, fogK: 1, sunTint: one(), hemiTint: one(), grey: 0,   // light: intensity, colour multipliers, toward grey
    lFog: c(), lFogK: 0, wFog: c(), wFogK: 0,                              // fog colour: the light cycle's tint, then the weather's
    skyTint: one(), skyFlat: 0, cover: 0, cloudTo: c(), cloudK: 0, cloudTint: one(), wind: 0, seaTint: one(),   // Citadel's sky and sea
    rain: 0, rainN: 0,                                                     // rain lines: opacity amount, share of the lines drawn
    motes: 0, moteCol: c(), moteSize: 0.4, moteFall: 0, moteDrift: 0, moteFlutter: 0, moteAlpha: 0.9,   // leaves, dust, snow, petals, mist
  };
}
const MOTES = 320;   // (High; Medium draws half, Low none: weather.js sets moteCap)
const moteTex = () => {
  const S = 32, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x = cv.getContext('2d'), g = x.createRadialGradient(S / 2, S / 2, 1, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
};

export class Environment {
  constructor(scene, terrain) {
    this.scene = scene;
    this.storm = 1;
    this.time = 0;
    this.flash = 0;
    this.nextLightning = 6;
    this.onThunder = null;
    this.fogRange = [45, 190];
    this.sunDir = new THREE.Vector3(-0.5, 0.8, -0.35).normalize();   // (one vector, shared: the sea's glint, shadowcull)
    const TX = textures();

    // Lights: a strong directional "island light" (LBA2 stores AlphaLight/BetaLight per island) + sky fill
    this.hemi = new THREE.HemisphereLight('#d8ecff', '#6a7a4a', 1.2);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff3e0', 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 180;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.radius = 3;
    scene.add(this.sun, this.sun.target);

    this.fog = new THREE.Fog(PAL.storm.fog.clone(), 45, 190);
    scene.fog = this.fog;
    scene.background = this.fog.color;

    // Sky (SKY-1, the user 31.10: the sky read as one flat grey-white): a dome around the camera, the fog's colour at
    // the horizon (so the land and sea still fade into it seamlessly) deepening to blue overhead, with LBA2's cloud
    // ceiling (DRAWSKY: a flat, scrolling cloud texture) projected on it and thinning towards the horizon. Drawn after
    // the opaque world with the depth test on, so only the pixels the world leaves empty are shaded: one draw, one
    // texture read a sky pixel, no new texture (the cloud ceiling's own)
    const ct = TX.clouds.clone(); ct.needsUpdate = true; ct.wrapS = ct.wrapT = THREE.RepeatWrapping;
    this.cloudTex = ct;
    this.skyU = { uHorizon: { value: new THREE.Color() }, uZenith: { value: new THREE.Color() }, uCloud: { value: new THREE.Color() }, uTex: { value: ct }, uOff: { value: new THREE.Vector2() }, uCover: { value: 0 } };
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 12), new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
      vertexShader: SKY_VS, fragmentShader: SKY_FS,
    }));
    this.clouds.renderOrder = 1e6;      // (after every opaque: the world's depth leaves only the sky's pixels)
    this.clouds.frustumCulled = false;
    this.clouds.matrixAutoUpdate = false;
    scene.add(this.clouds);

    // Sea
    this.waterU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uStorm: { value: 1 }, uFlash: { value: 0 }, uWaveAmp: { value: 1 },
      uSunDir: { value: this.sunDir },
      uDeep: { value: PAL.storm.deep.clone() }, uShallow: { value: PAL.storm.shallow.clone() }, uSky: { value: PAL.storm.sky.clone() },
      uHeight: { value: terrain.heightTexture }, uSize: { value: terrain.size }, uSegs: { value: terrain.segs }, uOrigin: { value: new THREE.Vector2(terrain.x0, terrain.z0) },
      uSea: { value: null },
    }]);
    this.waterU.uSea.value = TX.sea;
    const wgeo = seaGeometry();
    this.water = new THREE.Mesh(wgeo, new THREE.ShaderMaterial({
      uniforms: this.waterU, vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, fog: true, depthWrite: false,
    }));
    this.water.renderOrder = 2;
    this.water.frustumCulled = false;
    scene.add(this.water);

    // Rain streaks around the camera (LBA2 also draws rain as lines: 3DEXT/LINERAIN.ASM)
    const N = 2400;
    this.rainN = N;
    const rpos = new Float32Array(N * 6);
    this.rainData = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      this.rainData[i * 4] = (Math.random() - 0.5) * 70;
      this.rainData[i * 4 + 1] = Math.random() * 40;
      this.rainData[i * 4 + 2] = (Math.random() - 0.5) * 70;
      this.rainData[i * 4 + 3] = 28 + Math.random() * 10;
    }
    const rgeo = new THREE.BufferGeometry();
    rgeo.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
    this.rain = new THREE.LineSegments(rgeo, new THREE.LineBasicMaterial({ color: '#c4d6ea', transparent: true, opacity: 0.45, depthWrite: false }));
    this.rain.frustumCulled = false;
    scene.add(this.rain);
    this.rainCap = 1;   // (WEATHER-1: the share of the lines a quality preset allows: weather.js)

    // WEATHER-1: the weather's modifiers (weatherMods) and its motes — leaves, dust, snow or petals drifting round the
    // hero: one draw of up to MOTES points, world-anchored and wrapped round him, shown only while a state has them
    this.wx = weatherMods();
    this.moteCap = 1;
    this.moteData = new Float32Array(MOTES * 4);
    for (let i = 0; i < MOTES; i++) { this.moteData[i * 4] = (Math.random() - 0.5) * 44; this.moteData[i * 4 + 1] = Math.random() * 14; this.moteData[i * 4 + 2] = (Math.random() - 0.5) * 44; this.moteData[i * 4 + 3] = Math.random() * 6.283; }
    const mgeo = new THREE.BufferGeometry();
    mgeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
    this.motes = new THREE.Points(mgeo, new THREE.PointsMaterial({ size: 0.2, map: moteTex(), transparent: true, opacity: 0, depthWrite: false, color: '#ffffff' }));
    this.motes.frustumCulled = false;
    this.motes.visible = false;
    this._moteInit = false;
    scene.add(this.motes);
    this._cloud = new THREE.Vector2();   // (the cloud ceiling's drift, accumulated: a change of speed never jumps it)
    this._pc = new THREE.Color(); this._gc = new THREE.Color();
    this.lightLevel = 0; this.lightFloor = 0; this.floorCitadel = FLOOR_CITADEL;   // (tests: the storm palette's light)
  }

  // (the palette between clear and storm, into a scratch colour: no allocation a frame)
  _pal(k, s) { return this._pc.copy(PAL.clear[k]).lerp(PAL.storm[k], s); }
  // WEATHER-1: the light's measure now; below `floor`, both lights are raised together to meet it
  _light(floor) {
    const sun = this.sun, hemi = this.hemi;
    const lv = sun.intensity * LUM(sun.color) + hemi.intensity * LUM(hemi.color);
    if (lv < floor && lv > 0) { const k = floor / lv; sun.intensity *= k; hemi.intensity *= k; }
    this.lightLevel = Math.max(lv, floor); this.lightFloor = floor;
  }
  // WEATHER-1: the weather's light modifiers on the sun and the sky fill
  _wxLight(W) {
    const sun = this.sun, hemi = this.hemi;
    sun.color.multiply(W.sunTint); hemi.color.multiply(W.hemiTint); hemi.groundColor.multiply(W.hemiTint);
    if (W.grey > 0) {
      sun.color.lerp(this._gc.setScalar(LUM(sun.color)), W.grey);
      hemi.color.lerp(this._gc.setScalar(LUM(hemi.color)), W.grey * 0.5);
    }
    sun.intensity *= W.sunK; hemi.intensity *= W.hemiK;
  }
  // WEATHER-1: the motes, world-anchored round the focus (wrapped in a 44 × 14 × 44 m box), drifting with the wind
  _motes(dt, focus, on) {
    const W = this.wx, M = this.motes, n = on ? Math.round(MOTES * Math.min(1, W.motes) * this.moteCap) : 0;
    M.visible = n > 0 && W.motes > 0.01;
    if (!M.visible) return;
    const d = this.moteData, pos = M.geometry.attributes.position.array, t = this.time;
    const fx = focus.x, fy = focus.y - 2, fz = focus.z;
    if (!this._moteInit) { this._moteInit = true; for (let i = 0; i < MOTES; i++) { d[i * 4] += fx; d[i * 4 + 1] += fy; d[i * 4 + 2] += fz; } }
    const fall = W.moteFall, drift = W.moteDrift, fl = W.moteFlutter;
    for (let i = 0; i < n; i++) {
      const k = i * 4, ph = d[k + 3];
      let x = d[k] + (drift + fl * Math.sin(t * 1.7 + ph)) * dt, y = d[k + 1] - (fall + fl * 0.4 * Math.sin(t * 2.3 + ph * 1.3)) * dt, z = d[k + 2] + fl * 0.6 * Math.cos(t * 1.3 + ph) * dt;
      if (x - fx > 22) x -= 44; else if (x - fx < -22) x += 44;
      if (z - fz > 22) z -= 44; else if (z - fz < -22) z += 44;
      if (y - fy > 14) y -= 14; else if (y - fy < 0) y += 14;
      d[k] = x; d[k + 1] = y; d[k + 2] = z;
      pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    }
    M.geometry.setDrawRange(0, n);
    M.geometry.attributes.position.needsUpdate = true;
    M.material.color.copy(W.moteCol);
    M.material.size = W.moteSize;
    M.material.opacity = Math.min(1, W.motes * 1.6) * W.moteAlpha;
  }

  setStorm(s) { this.storm = s; }
  // High: a 4096 map over ±48 m (2.3 cm texels); Medium/Low: 2048 over ±40 m
  setShadowQuality(q) {
    const big = q === 'high';
    this.setShadowMap(big ? 4096 : 1024, big ? 48 : 36); // (Medium: a quarter of the texels to fill and filter)
  }
  // AUTO-QUALITY: the map's size on its own (4096 and 2048 over High's ±48 m box, 1024 over Medium's ±36 m)
  setShadowMap(size, half = size > 1024 ? 48 : 36) {
    const sh = this.sun.shadow;
    if (sh.mapSize.x !== size) { sh.mapSize.set(size, size); sh.map?.dispose(); sh.map = null; }
    const c = sh.camera; c.left = -half; c.right = half; c.top = half; c.bottom = -half; c.updateProjectionMatrix();
  }
  snapShadow(focus) {
    const d = this.sunDir, sh = this.sun.shadow;
    this._sx ??= new THREE.Vector3(); this._sy ??= new THREE.Vector3(); this._sf ??= new THREE.Vector3();
    const right = this._sx.set(0, 1, 0).cross(d).normalize(), up = this._sy.copy(d).cross(right).normalize();
    const texel = (sh.camera.right - sh.camera.left) / sh.mapSize.x;
    const u = Math.round(focus.dot(right) / texel) * texel, v = Math.round(focus.dot(up) / texel) * texel, w = focus.dot(d);
    return this._sf.copy(right).multiplyScalar(u).addScaledVector(up, v).addScaledVector(d, w);
  }
  // indoors: no sky, sea, rain or fog; black around the room like LBA2's interiors
  // (ROOM-LIGHT, the user 5.11: "the room is too bright, it doesn't make sense with a lamp": every room was lit by the
  //  island's full sun and sky fill, so its lamps added nothing you could see. light: the room's own { sun, hemi }
  //  multipliers (interiors.js R.indoor), for a room whose lamps are meant to be its light; none: as before)
  setInterior(on, light = null) {
    this.interior = on;
    this.indoor = on ? light : null;
    this.water.visible = this.clouds.visible = !on && !this.region;
    this.scene.background = on ? (this._black ??= new THREE.Color('#000000')) : this.fog.color;
  }
  // outdoor region with its own sky (Zeelich: a pink-violet sky above a sea of clouds). The Citadel sea,
  // cloud ceiling and rain are hidden; the region brings its own cloud sea. null = back to Citadel.
  setRegion(r) {
    this.region = r || null;
    this.water.visible = this.clouds.visible = !r && !this.interior;
    if (r) { this._rp = Object.fromEntries(Object.entries(r).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, C(v)])); }
  }
  // [near, far] fog distances; the classic look uses the original's short range
  setFogRange(near, far) { this.fogRange = [near, far]; }

  update(dt, camera, focus) {
    this.time += dt;
    const s = this.storm;
    if (s > 0.5) {
      this.nextLightning -= dt;
      if (this.nextLightning <= 0) {
        this.flash = 1;
        this.nextLightning = 7 + Math.random() * 10;
        this._double = 0.18;
        setTimeout(() => this.onThunder?.(), 400 + Math.random() * 1200);
      }
    }
    if (this._double > 0) { this._double -= dt; if (this._double <= 0) this.flash = 0.8; }
    this.flash = Math.max(0, this.flash - dt * 5);
    const f = this.flash * s;
    // WEATHER-1: the weather's modifiers (src/game/weather.js), outdoors only; off, every value below is as before
    const W = this.wx, on = W.on && !this.interior;

    this.waterU.uTime.value = this.time;
    this.waterU.uStorm.value = s;
    this.waterU.uFlash.value = f;
    this.waterU.uSky.value.copy(this._pal('sky', s));
    this.waterU.uDeep.value.copy(this._pal('deep', s));
    this.waterU.uShallow.value.copy(this._pal('shallow', s));
    if (on) { this.waterU.uSky.value.multiply(W.skyTint); this.waterU.uDeep.value.multiply(W.seaTint); this.waterU.uShallow.value.multiply(W.seaTint); }

    this.fog.color.copy(this._pal('fog', s));
    if (on) this.fog.color.lerp(W.lFog, W.lFogK).lerp(W.wFog, W.wFogK);
    this.fog.color.lerp(FLASH_FOG, f * 0.6);
    const k = lerp(1, 0.75, s) * (on ? W.fogK : 1);
    this.fog.near = this.interior ? 400 : this.fogRange[0] * k;
    this.fog.far = this.interior ? 900 : this.fogRange[1] * k;
    this.skyU.uCloud.value.copy(this._pal('clouds', s));
    if (on) this.skyU.uCloud.value.lerp(W.cloudTo, W.cloudK).multiply(W.cloudTint);
    this.skyU.uCloud.value.lerp(WHITE, f * 0.5);
    this.skyU.uHorizon.value.copy(this.fog.color);
    this.skyU.uZenith.value.copy(this._pal('zenith', s));
    if (on) this.skyU.uZenith.value.multiply(W.skyTint).lerp(this.fog.color, W.skyFlat);
    this.skyU.uZenith.value.lerp(this.fog.color, f * 0.6);
    this.skyU.uCover.value = on ? W.cover : 0;
    // (the ceiling's drift, accumulated: its speed may change — a storm, a gust — without the clouds jumping)
    this._cloud.x += dt * (0.004 + s * 0.01 + (on ? W.wind * 0.012 : 0)); this._cloud.y += dt * 0.002;
    this.skyU.uOff.value.copy(this._cloud);
    // (the dome stays centred on the camera: its own matrix, set here, never walked)
    this.clouds.position.copy(camera.position); this.clouds.updateMatrix(); this.clouds.updateMatrixWorld(true);

    this.sun.intensity = lerp(2.6, 0.7, s) + f * 3;
    this.sun.color.copy(this._pal('sun', s));
    this.hemi.intensity = lerp(1.42, 1.05, s) + f * 2;   // (GFX-LOOK-2: 1.25 → 1.42 with the bluer fill, see PAL)
    this.hemi.color.copy(this._pal('hemiSky', s));
    this.hemi.groundColor.copy(this._pal('hemiGround', s));
    if (on) { this._wxLight(W); this._light(FLOOR_CITADEL); }
    if (this.interior && this.indoor) { this.sun.intensity *= this.indoor.sun ?? 1; this.hemi.intensity *= this.indoor.hemi ?? 1; }   // (ROOM-LIGHT)

    // PERF-BATTERY: the sea's grid follows the camera in whole grid steps (see seaGeometry)
    this.water.position.set(Math.round(camera.position.x / SEA_STEP) * SEA_STEP, 0, Math.round(camera.position.z / SEA_STEP) * SEA_STEP);
    // the shadow camera follows the focus in whole shadow-map texels, so shadow edges don't crawl as he walks
    // GFX-LOOK-2: Citadel's own sun direction (see SUN_CITADEL). WEATHER-1: the light cycle never moves it: ShadowCache
    // keys its cached static casters on this direction, so a moving sun would redraw all of them every frame
    const sd = this.region || this.interior ? (this.region?.sunDir ? (this._rsd ??= new THREE.Vector3()).fromArray(this.region.sunDir).normalize() : SUN_BASE) : SUN_CITADEL;
    if (!this.sunDir.equals(sd)) this.sunDir.copy(sd);
    const sf = this.snapShadow(focus);
    this.sun.position.copy(sf).addScaledVector(this.sunDir, 80);
    this.sun.target.position.copy(sf);
    this._motes(dt, focus, on);

    if (this.region) {
      // the region's fixed palette (no storm there)
      const R = this.region, P = this._rp;
      this.fog.color.copy(R.fogColor || P.fog); // (a region may drive its fog colour live, e.g. a sandstorm)
      this.fog.near = (R.fogRange || this.fogRange)[0]; this.fog.far = (R.fogRange || this.fogRange)[1];
      this.sun.color.copy(P.sun); this.sun.intensity = R.sunI ?? 2.4;
      this.hemi.color.copy(P.hemiSky); this.hemi.groundColor.copy(P.hemiGround); this.hemi.intensity = R.hemiI ?? 1.2;
      // WEATHER-1: the weather and the light cycle laid over the region's own env (whose fog may be driven live)
      if (on) {
        this.fog.color.lerp(W.lFog, W.lFogK).lerp(W.wFog, W.wFogK);
        this.fog.near *= W.fogK; this.fog.far *= W.fogK;
        const base = this.sun.intensity * LUM(this.sun.color) + this.hemi.intensity * LUM(this.hemi.color);
        this._wxLight(W); this._light(base * FLOOR_RATIO);
      }
      this.scene.background = this.fog.color;
      this.rain.visible = false;
      return;
    }
    // WEATHER-1: the rain's opacity from the storm or the weather's rain, whichever is more; a light rain draws a share
    // of the lines (a storm all of them, as before), never more than the preset allows
    const op = Math.max(s, on ? W.rain : 0) * 0.5;
    this.rain.visible = op > 0.02 && !this.interior;
    if (this.rain.visible) {
      const n = Math.round(this.rainN * Math.min(this.rainCap, Math.max(s > 0.04 ? 1 : 0, on ? W.rainN : 0)));
      this.rain.material.opacity = op;
      this.rain.geometry.setDrawRange(0, n * 2);
      const pos = this.rain.geometry.attributes.position.array;
      const d = this.rainData;
      const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
      for (let i = 0; i < n; i++) {
        d[i * 4 + 1] -= d[i * 4 + 3] * dt;
        if (d[i * 4 + 1] < -12) { d[i * 4 + 1] += 40; d[i * 4] = (Math.random() - 0.5) * 70; d[i * 4 + 2] = (Math.random() - 0.5) * 70; }
        const x = cx + d[i * 4], y = cy + d[i * 4 + 1] - 10, z = cz + d[i * 4 + 2];
        pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z;
        pos[i * 6 + 3] = x - 0.18; pos[i * 6 + 4] = y + 0.9; pos[i * 6 + 5] = z;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
  }
}
