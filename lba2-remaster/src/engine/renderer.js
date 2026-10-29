// Renderer + post-processing. Two looks:
//   "2026": full resolution, 4× MSAA, soft shadows, neutral tone mapping, restrained bloom.
//   "1997": low internal resolution, nearest upscaling, flat shading,
//           posterised + dithered colour - a nod to the original.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { updateShownWorld, MW } from './drawcull.js';
import { warmPassPrograms } from './warmup.js';

// RENDER-INV: lamps cost nothing where they don't reach. three evaluates the whole lighting model (RE_Direct: the
// standard material's GGX specular + diffuse) for every point light on every lit pixel, also where the lamp's light
// is exactly zero: beyond its range (three's distance falloff is 0 there) and for the light pool's unused slots
// (intensity 0). three already computes `directLight.visible` (its colour is not zero); the model now runs only for
// a visible lamp. A zero colour added exactly nothing, so every pixel is the same; the GPU skips the work for most of
// the screen outdoors. (Toon materials, whose gradient map is sampled in RE_Direct, keep the plain loop; the game has
// none.) Must run before any shader is compiled: this module is imported before the scene is built.
{
  const C = THREE.ShaderChunk, src = C.lights_fragment_begin;
  const call = '\t\tRE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
  const gated = '\t\t#ifndef TOON\n\t\tif ( directLight.visible )\n\t\t#endif\n' + call;
  // PERF-BATTERY-2: the lamps (point lights) in the battery profile light the diffuse term only (Lambert: what three's
  // model adds as directDiffuse), without the GGX specular highlight, which is most of the model's work per lamp and
  // per pixel and, on the game's rough surfaces, a faint sheen at most. The battery profile is the only state with
  // three's Basic shadow type (SHADOWMAP_TYPE_BASIC, patched below to a 5-read filter), so its programs carry the
  // switch: no new program, nothing changes plugged in. The sun and the spot lights keep the full model.
  const lamp = '\t\t#if defined( SHADOWMAP_TYPE_BASIC ) && !defined( TOON )\n\t\tif ( directLight.visible ) reflectedLight.directDiffuse += saturate( dot( geometryNormal, directLight.direction ) ) * directLight.color * BRDF_Lambert( material.diffuseColor );\n\t\t#else\n' + gated + '\n\t\t#endif';
  const pt = src.indexOf('getPointLightInfo( pointLight'), sp = src.indexOf('getSpotLightInfo( spotLight'), dir = src.indexOf('getDirectionalLightInfo(');
  const a = src.indexOf(call, pt), b = src.indexOf(call, sp);
  if (pt > 0 && sp > pt && dir > sp && a > pt && a < sp && b > sp && b < dir) C.lights_fragment_begin = src.slice(0, a) + lamp + src.slice(a + call.length, b) + gated + src.slice(b + call.length);
  else console.warn('lamp skip: three.js lights chunk not as expected; left as it is');
}

// PERF-BATTERY: the battery profile's shadow filter. three's PCF (Medium) reads the shadow map 17 times a pixel over
// ±radius texels: on the user's Vega 8 on battery that filter is ~4.4 ms of the street's 37 (its "shadow filter basic"
// line). The battery profile switches the map to three's BasicShadowMap, which nothing else in the game uses, and its
// one-read branch is replaced here by 5 reads (the centre and four at half the radius on the diagonals): close to
// PCF's soft, light-edged shadows (one read alone draws them hard and dark) for under a third of its reads. Patched
// before any shader is compiled; the Basic programs exist only while the battery profile is on (renderer.setBattery).
{
  const C = THREE.ShaderChunk, src = C.shadowmap_pars_fragment;
  const one = '#else\n\t\t\tshadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );\n\t\t#endif';
  const five = '#else\n\t\t\tvec2 hs = 0.5 * shadowRadius / shadowMapSize;\n\t\t\tshadow = ( texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +\n'
    + '\t\t\t\ttexture2DCompare( shadowMap, shadowCoord.xy + vec2( -hs.x, -hs.y ), shadowCoord.z ) + texture2DCompare( shadowMap, shadowCoord.xy + vec2( hs.x, -hs.y ), shadowCoord.z ) +\n'
    + '\t\t\t\ttexture2DCompare( shadowMap, shadowCoord.xy + vec2( -hs.x, hs.y ), shadowCoord.z ) + texture2DCompare( shadowMap, shadowCoord.xy + vec2( hs.x, hs.y ), shadowCoord.z ) ) * 0.2;\n\t\t#endif';
  const i = src.indexOf(one);
  if (i > 0 && src.indexOf(one, i + 1) < 0 && src.lastIndexOf('float getShadow(', i) > 0 && src.indexOf('float getPointShadow', 0) > i) C.shadowmap_pars_fragment = src.slice(0, i) + five + src.slice(i + one.length);
  else console.warn('battery shadow filter: three.js shadow chunk not as expected; left as it is');
}

const RetroShader = {
  uniforms: { tDiffuse: { value: null }, levels: { value: 9.0 }, resolution: { value: new THREE.Vector2(1, 1) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float levels; uniform vec2 resolution; varying vec2 vUv;
    float bayer(vec2 p){ ivec2 i = ivec2(mod(p, 4.0));
      int idx = i.x + i.y*4;
      float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
      return m[idx]/16.0 - 0.5; }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float d = bayer(gl_FragCoord.xy) / levels;
      c.rgb = floor((c.rgb + d) * levels + 0.5) / levels;
      gl_FragColor = c;
    }`,
};

// A light FXAA (edge-directed blend on luma) for Low, which has no MSAA: one cheap full-screen pass after the
// output pass, on the display-encoded image.
const FxaaShader = {
  uniforms: { tDiffuse: { value: null }, texel: { value: new THREE.Vector2(1, 1) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 texel; varying vec2 vUv;
    float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
    void main(){
      vec3 rgbM = texture2D(tDiffuse, vUv).rgb;
      float lNW = lum(texture2D(tDiffuse, vUv + vec2(-1.0, -1.0) * texel).rgb), lNE = lum(texture2D(tDiffuse, vUv + vec2(1.0, -1.0) * texel).rgb);
      float lSW = lum(texture2D(tDiffuse, vUv + vec2(-1.0, 1.0) * texel).rgb), lSE = lum(texture2D(tDiffuse, vUv + vec2(1.0, 1.0) * texel).rgb);
      float lM = lum(rgbM), lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
      if (lMax - lMin < max(0.0312, lMax * 0.125)) { gl_FragColor = vec4(rgbM, 1.0); return; }
      vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
      float red = max((lNW + lNE + lSW + lSE) * 0.03125, 0.0078125);
      dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + red), -8.0, 8.0) * texel;
      vec3 a = 0.5 * (texture2D(tDiffuse, vUv - dir / 6.0).rgb + texture2D(tDiffuse, vUv + dir / 6.0).rgb);
      vec3 b = a * 0.5 + 0.25 * (texture2D(tDiffuse, vUv - dir * 0.5).rgb + texture2D(tDiffuse, vUv + dir * 0.5).rgb);
      float lB = lum(b);
      gl_FragColor = vec4((lB < lMin || lB > lMax) ? a : b, 1.0);
    }`,
};

// The scene pass, drawn into the lower-left part of the (fixed-size) target when the automatic resolution is
// below 1; the rest of the chain (bloom, output) keeps the full target and the output pass samples that part.
class ScaledRenderPass extends RenderPass {
  constructor(scene, camera) { super(scene, camera); this.scale = 1; }
  render(renderer, writeBuffer, readBuffer, dt, mask) {
    const s = this.scale, vp = readBuffer.viewport;
    if (s < 1) vp.set(0, 0, Math.max(1, Math.round(readBuffer.width * s)), Math.max(1, Math.round(readBuffer.height * s)));
    super.render(renderer, writeBuffer, readBuffer, dt, mask);
    if (s < 1) vp.set(0, 0, readBuffer.width, readBuffer.height);
  }
}

export class Renderer {
  constructor(container) {
    this.container = container;
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' }));
    r.setSize(innerWidth, innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.NeutralToneMapping; // keeps LBA2's saturated palette (ACES washes it out)
    r.toneMappingExposure = 1.0;
    container.appendChild(r.domElement);
    this.canvas = r.domElement;
    this.retro = false;
    // automatic resolution: the scene is drawn at a lower internal resolution (down to minDyn() of the preset's)
    // while frames run long, and back up once they keep the pace (see adapt). Only the part of the render target
    // the scene pass draws into changes: the canvas, its drawing buffer and the render targets keep their size,
    // so a change never clears the screen or reallocates anything (each change used to show a black frame).
    this.autoRes = true; this.dyn = 1; this._fb = [];
    this.quality = 'high';
    // edges (Settings → Edges): 'msaa' (multisampling, Medium 2× / High 4×) or 'fxaa' (one cheap full-screen pass, as
    // Low has). RENDER-INV: on the user's Vega 8 (Direct3D 11) MSAA 2× measured ~10 ms of GPU a frame on the street
    this.aa = 'msaa';
    // PERF-BATTERY: the battery profile (Game.setBattery, engine/power.js), within the player's preset: a 5-read shadow
    // filter instead of PCF's 17 (three's Basic type, patched above), no MSAA, and the automatic resolution may go down to
    // 0.5 (Medium/High; 0.6 otherwise). The user's Vega 8 on battery measured these on Medium's street: shadow filter
    // basic −4.4 ms, no MSAA −5.3 ms of 37 (laptop-build206-battery.txt). Low is unchanged (none of them is on there).
    this.battery = false;
    // AUTO-QUALITY (engine/autoquality.js): Quality Auto sets the picture knob by knob: { scale, bloom, filter: 'soft' |
    // 'pcf', msaa: 4 | 2 | 0, shadows: 1 | 0 } here (the shadow map's size, the lamps, the vegetation and the small
    // casters are set where they live). null: a preset chosen by hand, exactly as before. With knobs, the pixel ratio is
    // High's and the automatic resolution's factor is the governor's `scale` (adapt() stands aside).
    this.knobs = null;
  }
  setBattery(on) { on = !!on; if (on === this.battery) return false; this.battery = on; this.applyDerived(); this.resize(); return true; }
  // AUTO-QUALITY: the governor's knobs (null: back to the preset)
  setKnobs(K) {
    const k = K ? { scale: K.scale, bloom: K.bloom, filter: K.filter, msaa: K.msaa, shadows: K.shadows } : null;
    if (JSON.stringify(k) === JSON.stringify(this.knobs)) return false;
    this.knobs = k;
    if (k) this.dyn = k.scale;
    this.applyDerived(); this.resize();
    return true;
  }
  shadowsOn() { return !this.retro && (this.knobs ? !!this.knobs.shadows : this.quality !== 'low'); }
  // what the battery profile changes now (for the benchmark's report and Settings' note)
  batteryProfile() { return this.battery && this.shadowsOn() ? { shadowFilter: '5 reads', msaa: 0, minScale: this.minDyn() } : null; }

  setup(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    // the scene renders into a multisampled half-float target: the canvas's own antialias doesn't reach
    // the post-processing chain, so without this the "2026" look had no anti-aliasing at all
    const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4, stencilBuffer: true }); // (stencil: the hero's silhouette)
    const c = (this.composer = new EffectComposer(this.renderer, rt));
    // RENDER-INV: the multisampled targets resolve their colour only. three resolves depth and stencil too by default
    // (one blit of all three every frame); nothing reads them after the scene pass (the passes after it sample colour;
    // the hero's stencil silhouette is drawn inside the scene pass), and Direct3D 11 cannot resolve depth/stencil in
    // hardware, so ANGLE emulates it. Without them three just discards the multisampled depth/stencil. Same pixels.
    for (const T of [c.renderTarget1, c.renderTarget2]) { T.resolveDepthBuffer = false; T.resolveStencilBuffer = false; }
    this.scenePass = new ScaledRenderPass(scene, camera);
    c.addPass(this.scenePass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.22, 0.35, 0.92);
    c.addPass(this.bloom);
    // the output pass reads only the part of the target the scene pass drew (automatic resolution)
    this.output = new OutputPass();
    this.output.uniforms.uvScale = { value: new THREE.Vector2(1, 1) };
    this.output.uniforms.uvMax = { value: new THREE.Vector2(1, 1) };
    this.output.material.fragmentShader = this.output.material.fragmentShader
      .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse; uniform vec2 uvScale; uniform vec2 uvMax;')
      .replace('texture2D( tDiffuse, vUv )', 'texture2D( tDiffuse, min( vUv * uvScale, uvMax ) )');
    c.addPass(this.output);
    this.fxaa = new ShaderPass(FxaaShader);
    this.fxaa.enabled = false;
    c.addPass(this.fxaa);
    this.retroPass = new ShaderPass(RetroShader);
    this.retroPass.enabled = false;
    c.addPass(this.retroPass);
    addEventListener('resize', () => this.resize());
    this.resize();
    this.applyResize();
    // (RENDER-INV: the benchmark's GPU time per pass, perf.js GpuTimer: each pass and the shadow map mark their part;
    //  nothing happens while no timer is set)
    const sm = this.renderer.shadowMap, smr = sm.render.bind(sm);
    sm.render = (...a) => { const T = this.timer; T?.mark('shadow map'); try { return smr(...a); } finally { T?.mark('scene'); } };
    for (const [p, label] of [[this.scenePass, 'scene'], [this.bloom, 'bloom'], [this.output, 'output'], [this.fxaa, 'fxaa'], [this.retroPass, 'retro']]) {
      const r = p.render.bind(p);
      p.render = (...a) => { this.timer?.mark(label); return r(...a); };
    }
  }

  setQuality(q) {
    this.quality = q;
    this.applyDerived();
    this.resize(); // (cached: nothing is rebuilt when the size, pixel ratio and samples stay the same)
  }

  // what follows from quality + visual mode together, applied whenever either changes:
  // dynamic shadows off Low and outside the 1997 look; bloom (several full-screen blur passes) on High only;
  // FXAA on Low (no MSAA there)
  applyDerived() {
    const K = this.knobs, on = this.shadowsOn();
    this.renderer.shadowMap.enabled = on;
    // soft (PCFSoft) shadow edges on High; plain PCF elsewhere (fewer samples per pixel)
    const soft = K ? K.filter === 'soft' : this.quality === 'high';
    const type = this.battery && on ? THREE.BasicShadowMap : soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    if (this.renderer.shadowMap.type !== type) { this.renderer.shadowMap.type = type; this.renderer.shadowMap.needsUpdate = true; }
    // (bloom: High only — or the knob; off in the 1997 look; with knobs it does not depend on the shadows)
    if (this.bloom) this.bloom.enabled = (K ? !this.retro && !!K.bloom : on && this.quality === 'high') && this.bloomOn !== false;
    if (this.fxaa) this.fxaa.enabled = !this.retro && (K ? K.msaa === 0 : this.quality === 'low') || (!this.retro && this.aa === 'fxaa');
  }

  // (PERF-ARRIVAL: the FXAA pass's program is made now, not on the first frame drawn with it)
  setAA(a) { this.aa = a === 'fxaa' ? 'fxaa' : 'msaa'; this.applyDerived(); this.resize(); warmPassPrograms(this.renderer, this.composer); }

  setRetro(on) {
    this.retro = on;
    this.retroPass.enabled = on;
    this.applyDerived();
    this.canvas.classList.toggle('pixelated', on);
    this.scene.traverse((o) => {
      if (o.isMesh && o.material && 'flatShading' in o.material && !o.material.isShaderMaterial) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) if (m.flatShading !== on) { m.flatShading = on; m.needsUpdate = true; }
      }
    });
    this.resize();
  }

  // the preset's pixel ratio (before the automatic resolution): High the screen's (up to 2), Medium up to 1.25,
  // Low 0.85 (a 1366×768 laptop draws 1161×653; the automatic resolution may take it down to 0.7)
  // AUTO-FIT: with an integrated GPU (`integrated`, set from perf.js integratedGpu) on a high-density screen, High
  // stops at 1.25 and Medium at 1.0 (the user's Intel UHD window at 1.475 drew 2.2× the Vega laptop's pixels on High)
  basePixelRatio() {
    const dpr = Math.min(devicePixelRatio, 2), igpu = this.integrated && dpr > 1;
    if (this.retro) return Math.min(1, 560 / innerWidth); // ~640x480-era internal resolution
    return this.knobs || this.quality === 'high' ? Math.min(dpr, igpu ? 1.25 : 2) : this.quality === 'medium' ? Math.min(dpr, igpu ? 1 : 1.25) : Math.min(dpr, 0.85);
  }
  setIntegrated(on) { this.integrated = !!on; this.resize(); }
  // the lowest automatic-resolution factor per preset (Low never below a 0.7 pixel ratio: text and faces blur)
  // (AUTO-QUALITY: with knobs, the governor's factor; never under a 0.6 pixel ratio)
  minDyn() { return this.knobs ? Math.min(this.knobs.scale, Math.max(0.3, 0.6 / this.basePixelRatio())) : this.quality === 'low' ? Math.min(1, 0.7 / this.basePixelRatio()) : this.battery ? 0.5 : 0.6; }
  // the factor the scene is drawn at now, and the pixel ratio that makes
  effScale() { return this.retro ? 1 : this.knobs ? (this.autoRes ? this.knobs.scale : 1) : this.autoRes ? this.dyn : 1; }
  pixelRatio() { return +(this.renderer.getPixelRatio() * this.effScale()).toFixed(3); }

  // Works out the canvas size, pixel ratio and MSAA wanted. They are applied just before the next frame is drawn
  // (applyResize, from render), never between a drawn frame and its display, so the screen is never shown cleared.
  resize() {
    const w = innerWidth, h = innerHeight, pr = +this.basePixelRatio().toFixed(3);
    // MSAA: 4× on high (2× once the pixel ratio is high enough to smooth edges by itself), 2× on medium, none on
    // low (FXAA instead) / retro (the retro look wants hard pixels)
    // (Medium on a high-density screen: none, the pixel ratio smooths the edges and the GPU is spared the resolve)
    // (AUTO-FIT: High on an integrated GPU on a high-density screen: 2×, its pixel ratio smooths the rest)
    const hiMs = pr >= 1.5 || (this.integrated && devicePixelRatio > 1 && pr > 1.05) ? 2 : 4;
    const ms = this.retro || (!this.knobs && this.quality === 'low') || this.aa === 'fxaa' || this.battery ? 0 : this.knobs ? Math.min(this.knobs.msaa, hiMs) : this.quality === 'medium' ? (pr > 1.05 ? 0 : 2) : hiMs;
    // nothing to rebuild when the canvas, pixel ratio and sample count are what they were
    const key = `${w}x${h}@${pr}/${ms}/${this.retro}/${this.quality}/${this.aa}/${this.battery}/${!!this.composer}`;
    if (key !== this._size) { this._size = key; this._want = { w, h, pr, ms }; }
    if (this.knobs) this.dyn = this.knobs.scale; else if (this.dyn < this.minDyn()) this.dyn = this.minDyn();
    this.applyScale();
  }
  applyResize() {
    const W = this._want;
    if (!W) return;
    this._want = null;
    const { w, h, pr, ms } = W;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h);
    if (this.composer) {
      for (const t of [this.composer.renderTarget1, this.composer.renderTarget2]) if (t.samples !== ms) { t.samples = ms; t.dispose(); }
      this.composer.setPixelRatio(pr);
      this.composer.setSize(w, h);
      this.retroPass.uniforms.resolution.value.set(w * pr, h * pr);
    }
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
    this.applyScale();
  }
  // the automatic resolution: which part of the target the scene pass draws, and what the output pass reads
  applyScale() {
    if (!this.composer) return;
    const W = this._want, pr = W ? W.pr : this.renderer.getPixelRatio();
    const tw = W ? Math.floor(W.w * pr) : this.composer.renderTarget1.width, th = W ? Math.floor(W.h * pr) : this.composer.renderTarget1.height;
    const s = this.effScale();
    this.scenePass.scale = s;
    const sw = Math.max(1, Math.round(tw * s)), sh = Math.max(1, Math.round(th * s));
    this.output.uniforms.uvScale.value.set(sw / tw, sh / th);
    this.output.uniforms.uvMax.value.set((sw - 0.5) / tw, (sh - 0.5) / th);
    this.fxaa?.uniforms.texel.value.set(1 / tw, 1 / th);
  }

  // (PERF-2, engine/drawcull.js: `pre` runs first (actors of other areas left out), then the world matrices of the
  // shown objects only, `mid` (RENDER-INV: the draw batches), the passes, and `post` (what `pre` hid is shown again))
  render() {
    this.applyResize();
    this.pre?.();
    const S = this.scene, auto = S.matrixWorldAutoUpdate;
    MW.ok = false;   // (PERF-CPU: set again by the shown-world update when it runs)
    try {
      if (auto && this.shownOnly !== false) { updateShownWorld(S, this._mw ??= { hidden: [], prev: [], frame: 0 }); S.matrixWorldAutoUpdate = false; }
      else if (this.mid) S.updateMatrixWorld();
      this.mid?.();   // (RENDER-INV: the draw batches check their pieces with this frame's matrices: engine/drawbatch.js)
      this.timer?.begin();   // (RENDER-INV: the GPU's time for the frame, while the benchmark runs: perf.js GpuTimer)
      this.composer.render();
    } finally { this.timer?.end(); S.matrixWorldAutoUpdate = auto; this.post?.(); }
  }

  // Compiles every material in the scene for the way it is really drawn: into the composer's target (no tone
  // mapping or sRGB in the material: the output pass does those), with the current lights, fog and shadow
  // settings. Compiled for the canvas instead (as before), every program was built a second time on the first
  // frame that used it. Resolves when the driver has finished them (KHR_parallel_shader_compile: off the main
  // thread where the driver allows).
  precompile(scene = this.scene, camera = this.camera) {
    const R = this.renderer, prev = R.getRenderTarget();
    this.applyResize();
    R.setRenderTarget(this.composer.renderTarget1);
    let p;
    try { p = R.compileAsync(scene, camera); } finally { R.setRenderTarget(prev); }
    return p;
  }

  // Automatic resolution, fed the displayed frame time (ms). Every 90 frames: a 90th percentile over 1.2× the frame
  // budget (20 ms at 60 fps: the budget missed) lowers the internal resolution a step; one under 1.05× (17.5 ms:
  // holding it) three times in a row raises it a step. The budget is 60 fps's, or the frame-rate limit's (FRAME-1:
  // at a 30 fps limit every frame is ~33 ms by design, which must not read as missing 60). A step up that fails at once is not tried again for 30 s, then 60, 120… so it settles
  // at the highest level that holds instead of see-sawing. No allocation and no canvas resize: see applyScale.
  adapt(ms, now = performance.now()) {
    if (!this.autoRes || this.retro || this.knobs) return;   // (AUTO-QUALITY: the governor sets the factor)
    const b = this._fb; b.push(ms);
    if (b.length < 90) return;
    const p90 = b.slice().sort((x, y) => x - y)[Math.floor(b.length * 0.9)]; b.length = 0;
    const lo = this.minDyn(), B = this.budgetMs || 1000 / 60;
    this._good = p90 < B * 1.05 ? (this._good || 0) + 1 : 0;
    if (p90 > B * 1.2 && this.dyn > lo + 1e-3) {
      this.dyn = Math.max(lo, +(this.dyn - 0.1).toFixed(2));
      // a level just reached by stepping up that could not be held: back off before trying it again
      if (this._upAt && now - this._upAt < 6000) { this._back = Math.min(6, (this._back || 0) + 1); this._blockUntil = now + 15000 * 2 ** this._back; this._blockAbove = this.dyn; }
      this._upAt = 0; this._good = 0;
      this.applyScale();
      return;
    }
    if (this._good >= 3 && this.dyn < 1 && !(this._blockUntil > now && this.dyn >= this._blockAbove - 1e-3)) {
      this.dyn = Math.min(1, +(this.dyn + 0.1).toFixed(2));
      this._upAt = now; this._good = 0;
      this.applyScale();
    }
  }
  setAutoRes(on) { this.autoRes = on; this.dyn = this.knobs ? this.knobs.scale : 1; this._fb.length = 0; this._good = 0; this._back = 0; this._blockUntil = 0; this.applyScale(); }
  // a fixed factor (the benchmark's "res x0.6"; tests)
  setDyn(s) { this.dyn = s; if (this.knobs) this.knobs.scale = s; this.applyScale(); }
}
