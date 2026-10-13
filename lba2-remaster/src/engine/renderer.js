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
    // automatic resolution: the render pixel ratio is scaled down (to 0.6) while frames run long, and back up
    // once they keep the pace (see adapt). The canvas keeps its size; only the internal resolution changes.
    this.autoRes = true; this.dyn = 1; this._fb = [];
    this.quality = 'high';
  }

  setup(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    // the scene renders into a multisampled half-float target: the canvas's own antialias doesn't reach
    // the post-processing chain, so without this the "2026" look had no anti-aliasing at all
    const rt = new THREE.WebGLRenderTarget(innerWidth, innerHeight, { type: THREE.HalfFloatType, samples: 4, stencilBuffer: true }); // (stencil: the hero's silhouette)
    const c = (this.composer = new EffectComposer(this.renderer, rt));
    c.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.22, 0.35, 0.92);
    c.addPass(this.bloom);
    c.addPass(new OutputPass());
    this.retroPass = new ShaderPass(RetroShader);
    this.retroPass.enabled = false;
    c.addPass(this.retroPass);
    addEventListener('resize', () => this.resize());
    this.resize();
  }

  setQuality(q) {
    this.quality = q;
    this.applyDerived();
    this.resize(); // (cached: nothing is rebuilt when the size, pixel ratio and samples stay the same)
  }

  // what follows from quality + visual mode together, applied whenever either changes:
  // dynamic shadows off Low and outside the 1997 look; bloom (several full-screen blur passes) on High only
  applyDerived() {
    const on = !this.retro && this.quality !== 'low';
    this.renderer.shadowMap.enabled = on;
    // soft (PCFSoft) shadow edges on High; plain PCF elsewhere (fewer samples per pixel)
    const type = this.quality === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    if (this.renderer.shadowMap.type !== type) { this.renderer.shadowMap.type = type; this.renderer.shadowMap.needsUpdate = true; }
    if (this.bloom) this.bloom.enabled = on && this.quality === 'high' && this.bloomOn !== false;
  }

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

  resize() {
    const w = innerWidth, h = innerHeight;
    const dpr = Math.min(devicePixelRatio, 2);
    let pr = this.quality === 'high' ? dpr : this.quality === 'medium' ? Math.min(dpr, 1.25) : 0.75;
    if (this.retro) pr = Math.min(1, 560 / w); // ~640x480-era internal resolution
    else pr = Math.max(0.5, +(pr * (this.autoRes ? this.dyn : 1)).toFixed(3));
    // MSAA: 4× on high (2× once the pixel ratio is high enough to smooth edges by itself), 2× on medium, none on
    // low / retro (the retro look wants hard pixels)
    // (Medium on a high-density screen: none, the pixel ratio smooths the edges and the GPU is spared the resolve)
    const ms = this.retro || this.quality === 'low' ? 0 : this.quality === 'medium' ? (pr > 1.05 ? 0 : 2) : pr >= 1.5 ? 2 : 4;
    // nothing to rebuild when the canvas, pixel ratio and sample count are what they were
    const key = `${w}x${h}@${pr}/${ms}/${this.retro}/${this.quality}/${!!this.composer}`;
    if (key === this._size) return;
    this._size = key;
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
  }

  render() { this.composer.render(); }

  // automatic resolution, fed the displayed frame time (ms): every ~90 frames, a 90th percentile over ~21 ms
  // (under ~48 fps) lowers the internal resolution a step; one under ~17.8 ms (holding 56+ fps) for a while
  // raises it again, but not within 8 s of a drop (so it settles instead of see-sawing)
  adapt(ms) {
    if (!this.autoRes || this.retro) return;
    const b = this._fb; b.push(ms);
    if (b.length < 90) return;
    const p90 = b.slice().sort((x, y) => x - y)[Math.floor(b.length * 0.9)]; b.length = 0;
    const now = performance.now();
    if (p90 > 21 && this.dyn > 0.6) { this.dyn = Math.max(0.6, +(this.dyn - 0.1).toFixed(2)); this._downAt = now; this.resize(); }
    else if (p90 < 17.8 && this.dyn < 1 && now - (this._downAt || 0) > 8000) { this.dyn = Math.min(1, +(this.dyn + 0.05).toFixed(2)); this.resize(); }
  }
  setAutoRes(on) { this.autoRes = on; if (!on) this.dyn = 1; this._fb.length = 0; this.resize(); }
}
