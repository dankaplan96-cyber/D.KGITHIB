(async () => {
  // Exact per-frame counts on the benchmark's routes (window.ROUTES, comma list; plus 'hamalayi': the Hamalayi from its
  // arrival point, walking a loop with the camera turning as on the street): draw calls (main / shadow), triangles,
  // lamps lit, lamp-pixel pairs (pixels × lamps whose light reaches the visible surface there: the lighting model's
  // work, see q_lamps.js) and the scene pass's pixels. Every 12th frame of 225 at 30 fps after 45 frames, as attrib.mjs.
  const THREE = await import('three');
  const G = game, R = G.renderer.renderer;
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
  const lampPairs = () => {
    const L = G.lightPool.lights;
    for (let i = 0; i < NL; i++) { const l = L[i]; mat.uniforms.lp.value[i].set(l?.position.x ?? 0, l?.position.y ?? 0, l?.position.z ?? 0, l && l.intensity > 0 ? (l.distance > 0 ? l.distance : 1e6) : 0); }
    const prev = R.getRenderTarget(), au = R.shadowMap.autoUpdate; R.shadowMap.autoUpdate = false;
    const bg = G.scene.background; G.scene.background = null; G.scene.overrideMaterial = mat;
    R.setRenderTarget(T); R.setClearColor(0, 0); R.clear();
    try { R.render(G.scene, G.camera); } finally { G.scene.overrideMaterial = null; G.scene.background = bg; R.shadowMap.autoUpdate = au; R.setRenderTarget(prev); }
    const px = new Uint8Array(Wt * Ht * 4); R.readRenderTargetPixels(T, 0, 0, Wt, Ht, px);
    let pairs = 0; for (let i = 0; i < px.length; i += 4) pairs += px[i];
    const T1 = G.renderer.composer.renderTarget1, s = G.renderer.effScale();
    return pairs * (Math.round(T1.width * s) * Math.round(T1.height * s)) / (Wt * Ht);
  };
  // shaded fragments passing the depth test in three's draw order (an overdraw count, as PERF-BATTERY's attrib.mjs):
  // every fragment adds 1 to an 8-bit target at half resolution, ×4 and scaled to the scene pass's pixels
  const over = new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(1 / 255, 1 / 255, 1 / 255, THREE.LinearSRGBColorSpace), blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, toneMapped: false, fog: false });
  const frags = () => {
    const prev = R.getRenderTarget(), au = R.shadowMap.autoUpdate; R.shadowMap.autoUpdate = false;
    const bg = G.scene.background; G.scene.background = null; G.scene.overrideMaterial = over;
    R.setRenderTarget(T); R.setClearColor(0, 0); R.clear();
    try { R.render(G.scene, G.camera); } finally { G.scene.overrideMaterial = null; G.scene.background = bg; R.shadowMap.autoUpdate = au; R.setRenderTarget(prev); }
    const px = new Uint8Array(Wt * Ht * 4); R.readRenderTargetPixels(T, 0, 0, Wt, Ht, px);
    let n = 0; for (let i = 0; i < px.length; i += 4) n += px[i];
    const T1 = G.renderer.composer.renderTarget1, s = G.renderer.effScale();
    return n * (Math.round(T1.width * s) * Math.round(T1.height * s)) / (Wt * Ht);
  };
  if (window.DCELL) { G.drawBatch.cell = +window.DCELL; G.drawBatch.reset(); }
  const routes = G.bench.routes();
  const hama = (() => {
    let c = null;
    return { id: 'hamalayi', setup: () => { G.enterRoom('hamalayi', null, true, true); G.bench.camera(); c = { x: G.hero.pos.x, z: G.hero.pos.z }; G.camRig.yaw = Math.PI / 4; },
      drive: (t, dt) => { const a = t * 0.35; const r = 3; G.hero.pos.set(c.x + Math.sin(a) * r, 0, c.z + Math.cos(a) * r); G.hero.pos.y = G.physics.groundAt(G.hero.pos.x, G.hero.pos.z, G.hero.pos.y + 50); G.hero.angle = a + Math.PI / 2; G.camRig.yaw += dt * 0.35; } };
  })();
  const out = [];
  for (const id of (window.ROUTES || 'street,interior,combat,transition,arrival,hamalayi').split(',')) {
    const route = id === 'hamalayi' ? hama : routes.find((x) => x.id === id);
    G.state = 'play'; route.setup(); G.state = 'play';
    const S = { n: 0, calls: 0, shadow: 0, tris: 0, lamps: 0, pairs: 0, px: 0, frags: 0 };
    let t = 0;
    for (let i = 0; i < 225; i++) {
      const dt = 1 / 30; t += dt; route.drive(t, dt);
      const draw = i >= 45 && i % 12 === 0;
      G.perf.beginFrame(); G._renderMs = 0;
      G.frame(dt, draw);
      if (!draw || !(G._renderMs > 0)) continue;
      S.n++; S.calls += R.info.render.calls; S.shadow += G.perf.shadow; S.tris += R.info.render.triangles;
      S.lamps += G.lightPool.lights.filter((l) => l.intensity > 0).length;
      const T1 = G.renderer.composer.renderTarget1, s = G.renderer.effScale(); S.px += Math.round(T1.width * s) * Math.round(T1.height * s);
      if (window.LAMPS !== '0') S.pairs += lampPairs();
      if (window.FRAGS === '1') S.frags += frags();
    }
    const f = (k) => S[k] / Math.max(1, S.n);
    out.push({ route: id, q: G.settings.quality, battery: G.renderer.battery, frames: S.n, calls: Math.round(f('calls')), shadow: Math.round(f('shadow')), tris: Math.round(f('tris')), lamps: +f('lamps').toFixed(2), lampPairs: Math.round(f('pairs')), frags: Math.round(f('frags')), px: Math.round(f('px')), pool: G.lightPool.lights.length });
  }
  return out.map((r) => `COUNT ${r.q.padEnd(6)} bat ${r.battery ? 1 : 0} ${r.route.padEnd(10)} calls ${String(r.calls).padStart(4)} (shadow ${String(r.shadow).padStart(3)}) · tris ${(r.tris / 1000).toFixed(0).padStart(5)}k · lamps lit ${r.lamps} of ${r.pool} · lamp-pixel pairs ${(r.lampPairs / 1e6).toFixed(3)}M${r.frags ? ` · shaded fragments ${(r.frags / 1e6).toFixed(2)}M` : ''} · scene px ${(r.px / 1e6).toFixed(3)}M · frames ${r.frames}`).join('\n');
})()
