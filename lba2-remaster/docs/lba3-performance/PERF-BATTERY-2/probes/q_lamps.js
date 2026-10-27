(async () => {
  // Lamp work per frame on a route (window.ROUTE): which pool lights are lit, how far from the hero, and "lamp
  // pixels": over the visible surface of the frame (depth-tested, the nearest surface per pixel, scene pass size), the
  // number of (pixel, lamp) pairs where the lamp's light is not zero (inside its cutoff distance and lit): the pairs
  // for which the gated lighting model (renderer.js, RE_Direct only for a visible lamp) runs the full GGX model.
  // Sampled every 10th frame of NF frames at 30 fps; mean per sampled frame.
  const THREE = await import('three');
  const G = game, R = G.renderer.renderer;
  const route = G.bench.routes().find((x) => x.id === (window.ROUTE || 'street')); G.state = 'play'; route.setup(); G.state = 'play';
  const NL = 8;
  const mat = new THREE.ShaderMaterial({
    uniforms: { lp: { value: Array.from({ length: NL }, () => new THREE.Vector4()) } },
    vertexShader: `#include <common>
#include <batching_pars_vertex>
#include <skinning_pars_vertex>
varying vec3 vW;
void main(){
#include <batching_vertex>
#include <begin_vertex>
#include <skinbase_vertex>
#include <skinning_vertex>
#include <project_vertex>
  vec4 wp = vec4(transformed, 1.0);
  #ifdef USE_BATCHING
  wp = batchingMatrix * wp;
  #endif
  #ifdef USE_INSTANCING
  wp = instanceMatrix * wp;
  #endif
  vW = (modelMatrix * wp).xyz;
}`,
    fragmentShader: `uniform vec4 lp[${NL}]; varying vec3 vW;
void main(){ float n = 0.0; for (int i = 0; i < ${NL}; i++) { if (lp[i].w > 0.0 && distance(vW, lp[i].xyz) < lp[i].w) n += 1.0; } gl_FragColor = vec4(n / 255.0, 0.0, 0.0, 1.0); }`,
  });
  const Wt = 683, Ht = 384, T = new THREE.WebGLRenderTarget(Wt, Ht, { depthBuffer: true });
  const count = () => {
    const L = G.lightPool.lights;
    for (let i = 0; i < NL; i++) { const l = L[i]; mat.uniforms.lp.value[i].set(l?.position.x ?? 0, l?.position.y ?? 0, l?.position.z ?? 0, l && l.intensity > 0 ? (l.distance > 0 ? l.distance : 1e6) : 0); }
    const prev = R.getRenderTarget(), au = R.shadowMap.autoUpdate; R.shadowMap.autoUpdate = false;
    const bg = G.scene.background; G.scene.background = null; G.scene.overrideMaterial = mat;
    R.setRenderTarget(T); R.setClearColor(0, 0); R.clear();
    try { R.render(G.scene, G.camera); } finally { G.scene.overrideMaterial = null; G.scene.background = bg; R.shadowMap.autoUpdate = au; R.setRenderTarget(prev); }
    const px = new Uint8Array(Wt * Ht * 4); R.readRenderTargetPixels(T, 0, 0, Wt, Ht, px);
    let pairs = 0, lit = 0; for (let i = 0; i < px.length; i += 4) { pairs += px[i]; if (px[i]) lit++; }
    const k = (G.renderer.composer.renderTarget1.width * G.renderer.effScale() * G.renderer.composer.renderTarget1.height * G.renderer.effScale()) / (Wt * Ht);
    return { pairs: pairs * k, litPx: lit * k };
  };
  const NF = +(window.NF || 240), dt = 1 / 30; let t = 0;
  const S = { n: 0, lamps: 0, pairs: 0, litPx: 0 }, seen = [];
  for (let i = 0; i < NF; i++) {
    t += dt; route.drive(t, dt);
    const draw = i >= 45 && i % 10 === 0;
    G.perf.beginFrame(); G.frame(dt, draw);
    if (!draw) continue;
    const L = G.lightPool.lights.filter((l) => l.intensity > 0);
    const c = count();
    S.n++; S.lamps += L.length; S.pairs += c.pairs; S.litPx += c.litPx;
    if (S.n <= 3 || window.VERBOSE) seen.push(`t ${t.toFixed(1)}: ` + L.map((l) => `[d ${l.distance} i ${l.intensity.toFixed(2)} hero ${l.position.distanceTo(G.hero.pos).toFixed(1)} m]`).join(' ') + ` · pairs ${Math.round(c.pairs)} lit px ${Math.round(c.litPx)}`);
  }
  const px = G.renderer.composer.renderTarget1.width * G.renderer.composer.renderTarget1.height;
  return [`${window.ROUTE || 'street'} · ${G.settings.quality} · battery ${G.renderer.battery} · pool ${G.lightPool.lights.length} · sources ${G.lightPool.sources.length} · scene px ${px} · frames ${S.n}`,
    `lamps lit ${(S.lamps / S.n).toFixed(2)} · lamp pixel pairs ${Math.round(S.pairs / S.n)} (${(S.pairs / S.n / px).toFixed(3)} per pixel) · pixels lit by any lamp ${Math.round(S.litPx / S.n)} (${(100 * S.litPx / S.n / px).toFixed(1)} %)`, ...seen].join('\n');
})()
