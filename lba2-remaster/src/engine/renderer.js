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
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }));
    r.setSize(innerWidth, innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.NeutralToneMapping; // keeps LBA2's saturated palette (ACES washes it out)
    r.toneMappingExposure = 1.0;
    container.appendChild(r.domElement);
    this.canvas = r.domElement;
    this.retro = false;
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
    if (q === this.quality && this._size) return;
    this.quality = q;
    this.resize();
  }

  setRetro(on) {
    this.retro = on;
    this.retroPass.enabled = on;
    this.bloom.enabled = !on && this.quality !== 'low';
    this.renderer.shadowMap.enabled = !on && this.quality !== 'low';
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
    let pr = this.quality === 'high' ? dpr : this.quality === 'medium' ? Math.min(dpr, 1.25) : 0.85;
    if (this.retro) pr = Math.min(1, 560 / w); // ~640x480-era internal resolution
    // MSAA: 4× on high, 2× on medium, none on low / retro (the retro look wants hard pixels)
    const ms = this.retro || this.quality === 'low' ? 0 : this.quality === 'medium' ? 2 : 4;
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
      this.bloom.enabled = !this.retro && this.quality !== 'low';
      this.retroPass.uniforms.resolution.value.set(w * pr, h * pr);
    }
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  render() { this.composer.render(); }
}
