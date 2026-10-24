// RENDER-INV: where the GPU's time goes (the laptop's frame is GPU-bound: build 120's benchmark). SwiftShader's
// timer query measures its own (CPU) rasterisation: a PROXY for relative fragment/vertex work, not Vega 8 timings.
// Per view, median GPU ms over N drawn frames (camera fixed), for each variant (one cost changed at a time):
//   as is · shadow map not redrawn (sampling kept) · no shadows · 0 / 2 lamps · no MSAA · 8-bit target ·
//   pixel ratio 0.85 · and the passes split (scene pass incl. shadow map, output pass).
//   GAME_URL=http://localhost:8176/ QUALITY=medium VIEWS=house,street N=8 VARIANTS=... node gpulab.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const quality = process.env.QUALITY || 'medium', N = +(process.env.N || 8), VIEWS = (process.env.VIEWS || 'house,street').split(',');
const VARIANTS = (process.env.VARIANTS || 'asis,passes,frozenShadow,noShadows,lamps0,lamps2,msaa0,rt8,pr085').split(',');
const SHOT = process.env.SHOT || '';
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2, res: 'full' })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
await open(page, '?nocine');
const res = {};
for (const view of VIEWS) {
  res[view] = await page.evaluate(async ({ view, N, VARIANTS }) => {
    const G = game;
    if (!window.__started) { window.__started = 1; document.querySelector('[data-act="new"]').click(); G.testFreeze = true; G.step(0.3); G.setState('play'); }
    const R = G.renderer, W = R.renderer, gl = W.getContext(), ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    
    R.setAutoRes(false);
    G.state = 'play';
    if (view === 'house') { G.enterRoom('house', null, true, true); const c = G.room.center; G.hero.pos.set(c.x + 1, 0, c.z + 3); G.hero.pos.y = G.physics.groundAt(G.hero.pos.x, G.hero.pos.z); }
    else if (view === 'street') { const r = G.bench.routes().find((x) => x.id === 'street'); r.setup(); r.drive(2.5, 1 / 30); }
    else if (view === 'harbour') { G.exitRoom({ x: -100, z: 40, a: -1.6 }, true, true); G.bench.camera(); G.camRig.yaw = -Math.PI / 2; G.camRig.pitch = 0.3; }
    else if (view === 'zeelich' || view === 'desert' || view === 'hamalayi') G.enterRoom(view, null, true, true);
    G.state = 'play';
    for (let i = 0; i < 10; i++) G.frame(1 / 30, i % 3 === 2);
    // the camera and the world held still from here: every variant draws the same frame
    const t = G.time, freeze = () => { G.time = t; };
    const q = gl.createQuery();
    // (SwiftShader's timer query reads 0: the frame is timed by the wall clock instead, the queue drained before and
    //  after (readPixels waits for every draw); `sub` = the JS submission part, the rest is SwiftShader's raster)
    const px = new Uint8Array(4), SUB = []; const timeIt = (fn) => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const t0 = performance.now(); fn(); const t1 = performance.now(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); SUB.push(t1 - t0); return performance.now() - t0; };
    const med = (a) => { const v = a.slice().sort((x, y) => x - y); return +v[v.length >> 1].toFixed(2); };
    const render = () => { freeze(); R.render(); };
    const measure = () => { for (let i = 0; i < 2; i++) render(); const a = []; SUB.length = 0; for (let i = 0; i < N; i++) a.push(timeIt(render)); const m = med(a), sb = med(SUB); return { ms: m, raster: +(m - sb).toFixed(1) }; };
    const out = {};
    const C = R.composer, LP = G.lightPool, n0 = LP.lights.length;
    for (const v of VARIANTS) {
      if (v === 'asis') out.asis = measure();
      else if (v === 'passes') {
        // the scene pass (with the shadow map) and the output pass, each timed alone
        const sp = R.scenePass, op = R.output, sr = sp.render.bind(sp), or = op.render.bind(op), A = [], B = [];
        for (let i = 0; i < N; i++) {
          let a = 0, b = 0;
          sp.render = (...x) => { a = timeIt(() => sr(...x)); }; op.render = (...x) => { b = timeIt(() => or(...x)); };
          render(); A.push(a); B.push(b);
        }
        sp.render = sr; op.render = or;
        out.scenePass = med(A); out.outputPass = med(B);
      } else if (v === 'frozenShadow') { measure(); W.shadowMap.autoUpdate = false; out.frozenShadow = measure(); W.shadowMap.autoUpdate = true; }
      else if (v === 'noShadows') { W.shadowMap.enabled = false; await R.precompile(); out.noShadows = measure(); R.applyDerived(); await R.precompile(); }
      else if (v === 'lamps0' || v === 'lamps2') { LP.setSize(v === 'lamps0' ? 0 : 2); LP.update(G.hero.pos); await R.precompile(); out[v] = measure(); LP.setSize(n0); LP.update(G.hero.pos); await R.precompile(); }
      else if (v === 'msaa0') { const s = [C.renderTarget1.samples, C.renderTarget2.samples]; for (const T of [C.renderTarget1, C.renderTarget2]) { T.samples = 0; T.dispose(); } out.msaa0 = measure(); [C.renderTarget1.samples, C.renderTarget2.samples] = s; C.renderTarget1.dispose(); C.renderTarget2.dispose(); }
      else if (v === 'rt8') { const ty = C.renderTarget1.texture.type; for (const T of [C.renderTarget1, C.renderTarget2]) { T.texture.type = 1009; T.dispose(); } out.rt8 = measure(); for (const T of [C.renderTarget1, C.renderTarget2]) { T.texture.type = ty; T.dispose(); } }
      else if (v === 'depthResolve' || v === 'noDepthResolve') { const on = v === 'depthResolve'; const was = C.renderTarget1.resolveDepthBuffer; for (const T of [C.renderTarget1, C.renderTarget2]) { T.resolveDepthBuffer = on; T.resolveStencilBuffer = on; } out[v] = measure(); for (const T of [C.renderTarget1, C.renderTarget2]) { T.resolveDepthBuffer = was; T.resolveStencilBuffer = was; } }
      else if (v === 'pr085') { R.autoRes = true; R.setDyn(0.85); out.pr085 = measure(); R.setDyn(1); R.autoRes = false; }
    }
    out.calls = W.info.render.calls; out.lights = { pool: LP.lights.filter((l) => l.intensity > 0).length, of: LP.lights.length };
    out.config = G.graphicsConfig();
    return out;
  }, { view, N, VARIANTS });
  if (SHOT) await page.screenshot({ path: `${SHOT}-${view}.png` });
}
console.log(JSON.stringify({ quality, N, res, errors: errs.slice(0, 5) }, null, 1));
await browser.close();
