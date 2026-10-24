// FRAME-1: what the per-frame program switching costs on the street (materials shared by an InstancedMesh and a plain
// Mesh: sharedmat.mjs). A/B in one page, interleaved in rounds so machine load drifts alike: render() CPU time per
// frame (software GPU drained first) and program re-evaluations, as built vs with each such InstancedMesh given its
// own copy of the material (same program: nothing new compiles).
//   GAME_URL=http://localhost:8171/ Q=low node sharedab.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const URL0 = process.env.GAME_URL || 'http://localhost:8123/', Q = process.env.Q || 'low';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
await page.addInitScript((q) => { try { if (!localStorage.getItem('fl_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('fl_q', q); } } catch {} }, Q);
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !game.preparing, null, { timeout: 600000 });
await page.evaluate(() => { game.testFreeze = true; document.querySelector('[data-act="new"]').click(); game.step(0.3); game.setState('play'); });
const r = await page.evaluate(async () => {
  const G = game, R = G.renderer.renderer, gl = R.getContext();
  const route = G.bench.routes().find((x) => x.id === 'street'); G.state = 'play'; route.setup(); G.state = 'play';
  for (let i = 0; i < 200; i++) { route.drive(i / 60, 1 / 60); G.frame(1 / 60, i % 20 === 0); }   // (minimap built, everything uploaded)
  const by = new Map(); G.scene.traverse((o) => { if (o.isMesh && !Array.isArray(o.material)) { if (!by.has(o.material)) by.set(o.material, []); by.get(o.material).push(o); } });
  const swaps = [];
  for (const [m, list] of by) if (list.some((o) => o.isInstancedMesh) && list.some((o) => !o.isInstancedMesh && !o.isBatchedMesh && !o.isSkinnedMesh)) {
    const c = m.clone(); c.onBeforeCompile = m.onBeforeCompile; c.customProgramCacheKey = m.customProgramCacheKey;
    for (const o of list) if (o.isInstancedMesh) swaps.push([o, m, c]);
  }
  let M = Object.getPrototypeOf(G.hero.rig.root.getObjectByProperty('isMesh', true).material); while (!Object.prototype.hasOwnProperty.call(M, 'customProgramCacheKey')) M = Object.getPrototypeOf(M);
  const orig = M.customProgramCacheKey; let n = 0; M.customProgramCacheKey = function () { n++; return orig.call(this); };
  const heads = [0.6, 1.4, 2.0, 2.6];
  const measure = () => { const ms = [], ev = []; for (const yaw of heads) for (let k = 0; k < 8; k++) { G.camRig.yaw = yaw + k * 0.01; G.frame(1 / 60, false); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); const n0 = n, t0 = performance.now(); G.renderer.render(); ms.push(performance.now() - t0); ev.push(n - n0); } ms.sort((a, b) => a - b); return { ms: ms[ms.length >> 1], ev: ev.reduce((a, b) => a + b, 0) / ev.length }; };
  const A = [], B = [];
  for (let round = 0; round < 4; round++) {
    for (const [o, m] of swaps) o.material = m; measure(); A.push(measure());
    for (const [o, , c] of swaps) o.material = c; measure(); B.push(measure());
  }
  for (const [o, m] of swaps) o.material = m;
  M.customProgramCacheKey = orig;
  const med = (L, k) => { const v = L.map((x) => x[k]).sort((a, b) => a - b); return +((v[1] + v[2]) / 2).toFixed(2); };
  return { instancedMeshesSwapped: swaps.length, asBuilt: { renderMs: med(A, 'ms'), reevalPerFrame: med(A, 'ev') }, ownMaterial: { renderMs: med(B, 'ms'), reevalPerFrame: med(B, 'ev') }, rounds: { A, B } };
});
console.log(JSON.stringify(r));
await browser.close();
