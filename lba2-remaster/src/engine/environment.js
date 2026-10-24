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

const C = (c) => new THREE.Color(c);
const PAL = {
  clear: { fog: C('#a8d2f2'), clouds: C('#ffffff'), sun: C('#fff1d6'), hemiSky: C('#d8ecff'), hemiGround: C('#6a7a4a'), deep: C('#1f6fae'), shallow: C('#3fc6c8'), sky: C('#bfe0ff') },
  storm: { fog: C('#6f8094'), clouds: C('#59667a'), sun: C('#b3c2dc'), hemiSky: C('#a9b8d0'), hemiGround: C('#4c5a46'), deep: C('#1a3f5c'), shallow: C('#2f7c86'), sky: C('#7d8ea2') },
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
    this.sunDir = new THREE.Vector3(-0.5, 0.8, -0.35).normalize();
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

    // Cloud ceiling
    const ct = TX.clouds.clone(); ct.needsUpdate = true; ct.repeat.set(5, 5);
    this.cloudTex = ct;
    this.clouds = new THREE.Mesh(new THREE.PlaneGeometry(3200, 3200), new THREE.MeshBasicMaterial({ map: ct, fog: true, side: THREE.DoubleSide, depthWrite: false }));
    this.clouds.rotation.x = Math.PI / 2;
    this.clouds.position.y = 70;
    this.clouds.renderOrder = -1;
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
    const wgeo = new THREE.PlaneGeometry(1400, 1400, 220, 220);
    wgeo.rotateX(-Math.PI / 2);
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
  }

  setStorm(s) { this.storm = s; }
  // High: a 4096 map over ±48 m (2.3 cm texels); Medium/Low: 2048 over ±40 m
  setShadowQuality(q) {
    const sh = this.sun.shadow, big = q === 'high', size = big ? 4096 : 1024, half = big ? 48 : 36; // (Medium: a quarter of the texels to fill and filter)
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
  setInterior(on) {
    this.interior = on;
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
    const mix = (k) => PAL.clear[k].clone().lerp(PAL.storm[k], s);

    this.waterU.uTime.value = this.time;
    this.waterU.uStorm.value = s;
    this.waterU.uFlash.value = f;
    this.waterU.uSky.value.copy(mix('sky'));
    this.waterU.uDeep.value.copy(mix('deep'));
    this.waterU.uShallow.value.copy(mix('shallow'));

    this.fog.color.copy(mix('fog')).lerp(C('#e8eeff'), f * 0.6);
    const k = lerp(1, 0.75, s);
    this.fog.near = this.interior ? 400 : this.fogRange[0] * k;
    this.fog.far = this.interior ? 900 : this.fogRange[1] * k;
    this.clouds.material.color.copy(mix('clouds')).lerp(C('#ffffff'), f * 0.5);
    this.cloudTex.offset.x = this.time * (0.004 + s * 0.01);
    this.cloudTex.offset.y = this.time * 0.002;

    this.sun.intensity = lerp(2.6, 0.7, s) + f * 3;
    this.sun.color.copy(mix('sun'));
    this.hemi.intensity = lerp(1.25, 1.05, s) + f * 2;
    this.hemi.color.copy(mix('hemiSky'));
    this.hemi.groundColor.copy(mix('hemiGround'));

    // the shadow camera follows the focus in whole shadow-map texels, so shadow edges don't crawl as he walks
    const sf = this.snapShadow(focus);
    this.sun.position.copy(sf).addScaledVector(this.sunDir, 80);
    this.sun.target.position.copy(sf);

    if (this.region) {
      // the region's fixed palette (no storm there)
      const R = this.region, P = this._rp;
      this.fog.color.copy(R.fogColor || P.fog); // (a region may drive its fog colour live, e.g. a sandstorm)
      this.fog.near = (R.fogRange || this.fogRange)[0]; this.fog.far = (R.fogRange || this.fogRange)[1];
      this.sun.color.copy(P.sun); this.sun.intensity = R.sunI ?? 2.4;
      this.hemi.color.copy(P.hemiSky); this.hemi.groundColor.copy(P.hemiGround); this.hemi.intensity = R.hemiI ?? 1.2;
      this.scene.background = this.fog.color;
      this.rain.visible = false;
      return;
    }
    const op = s * 0.5;
    this.rain.visible = op > 0.02 && !this.interior;
    if (this.rain.visible) {
      this.rain.material.opacity = op;
      const pos = this.rain.geometry.attributes.position.array;
      const d = this.rainData;
      const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
      for (let i = 0; i < this.rainN; i++) {
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
