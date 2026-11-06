// FRAME-1: per-frame program re-evaluation in three.js. WebGLRenderer.setProgram re-derives a material's program
// parameters (getParameters + getProgramCacheKey: a big object and a long string) whenever it thinks the program may
// have changed; in a steady scene that should be ~never. Counts, per drawn frame of a route, how often that happens
// (Material.customProgramCacheKey is called once per getProgramCacheKey) and for which object / material, and how
// long the minimap's base build keeps running after a new game.
//   GAME_URL=http://localhost:8171/ Q=low ROUTE=street node progkey.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const URL0 = process.env.GAME_URL || 'http://localhost:8123/', Q = process.env.Q || 'low', ROUTE = process.env.ROUTE || 'street';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
await page.addInitScript((q) => { try { if (!localStorage.getItem('fl_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('fl_q', q); } } catch {} }, Q);
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !game.preparing, null, { timeout: 600000 });
await page.evaluate(() => { game.testFreeze = true; document.querySelector('[data-act="new"]').click(); game.step(0.3); game.setState('play'); });
const r = await page.evaluate((id) => {
  const G = game, R = G.renderer.renderer;
  // the minimap's base map for Citadel: frames (60 Hz play) until built
  const B = G.hud._base?.('citadel');
  const map = B ? { doneAtStart: B.done, msSoFar: +B.ms.toFixed(0) } : null;
  let cur = null;
  const proto = Object.getPrototypeOf(G.hero.rig.root.children.find?.((c) => c.material)?.material || new (G.scene.fog.constructor)());
  let M = proto; while (M && !Object.prototype.hasOwnProperty.call(M, 'customProgramCacheKey')) M = Object.getPrototypeOf(M);
  const orig = M.customProgramCacheKey, counts = new Map(); let n = 0;
  M.customProgramCacheKey = function () { n++; const o = cur; const k = `${o?.type}${o?.isBatchedMesh ? '(batched)' : ''}${o?.isInstancedMesh ? '(instanced)' : ''}${o?.isSkinnedMesh ? '(skinned)' : ''} '${o?.name || o?.parent?.name || ''}' mat ${this.type}#${this.id} '${this.name || ''}' ${cur?.__shadow ? 'shadow' : 'main'}`; counts.set(k, (counts.get(k) || 0) + 1); return orig.call(this); };
  const rbd = R.renderBufferDirect;
  R.renderBufferDirect = function (camera, scene, geometry, material, object, group) { cur = object; if (object) object.__shadow = scene === null; return rbd.call(this, camera, scene, geometry, material, object, group); };
  const route = G.bench.routes().find((x) => x.id === id); G.state = 'play'; route.setup(); G.state = 'play';
  let t = 0; const per = [];
  for (let i = 0; i < 40; i++) { const dt = 1 / 60; t += dt; route.drive(t, dt); const n0 = n; G.perf.beginFrame(); G.frame(dt, true); per.push(n - n0); }
  M.customProgramCacheKey = orig; R.renderBufferDirect = rbd;
  let frames = 0; if (B) { while (!B.done && frames < 20000) { B.step(2.5); frames++; } }
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${(v / 40).toFixed(1)}/frame ${k}`);
  return { perFrame: per, top, map: map && { ...map, framesLeftAt2_5ms: frames, totalMs: +B.ms.toFixed(0) } };
}, ROUTE);
console.log('program re-evaluations per frame:', r.perFrame.join(' '));
for (const x of r.top) console.log('  ' + x);
console.log('minimap base (citadel):', JSON.stringify(r.map));
await browser.close();
