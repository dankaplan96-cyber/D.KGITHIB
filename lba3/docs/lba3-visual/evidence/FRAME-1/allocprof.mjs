// FRAME-1: who allocates per frame. V8's sampling heap profiler (CDP HeapProfiler) over N frames of a route
// (simulated at 60 Hz, drawn every frame as the game's loop would), then the functions by bytes allocated, as KB per
// frame, with their file:line. Steady state: the route warms up first (60 frames) before sampling starts.
//   GAME_URL=http://localhost:8171/ Q=low ROUTE=street FRAMES=120 [DRAW=1] node allocprof.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const URL0 = process.env.GAME_URL || 'http://localhost:8123/', Q = process.env.Q || 'low', FR = +(process.env.FRAMES || 120), ROUTE = process.env.ROUTE || 'street';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
await page.addInitScript((q) => { try { if (!localStorage.getItem('fl_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('fl_q', q); } } catch {} }, Q);
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !game.preparing, null, { timeout: 600000 });
await page.evaluate(() => { game.testFreeze = true; document.querySelector('[data-act="new"]').click(); game.step(0.3); game.setState('play'); });
const run = (n, draw) => page.evaluate(({ id, n, draw }) => {
  const G = game; window.__t ??= 0;
  if (!window.__route) { window.__route = G.bench.routes().find((x) => x.id === id); G.state = 'play'; window.__route.setup(); G.state = 'play'; }
  for (let i = 0; i < n; i++) { const dt = 1 / 60; window.__t += dt; window.__route.drive(window.__t, dt); G.perf.beginFrame(); G._renderMs = 0; G.frame(dt, draw); G.perf.record({ real: dt, ms: 16.7, steps: 1, lost: 0, sim: 0, render: G._renderMs }); }
}, { id: ROUTE, n, draw });
const draw = process.env.DRAW !== '0';
await run(+(process.env.WARM || 60), draw);
// shadow batches rebuilt while sampling (engine/shadowcull.js Area.build)
await page.evaluate(() => { const A = game.shadowCull.area; if (!A) return; const P = Object.getPrototypeOf(A), b = P.build; window.__builds = 0; P.build = function (c) { window.__builds++; return b.call(this, c); }; });
const cdp = await page.context().newCDPSession(page);
await cdp.send('HeapProfiler.enable');
await cdp.send('HeapProfiler.startSampling', { samplingInterval: 2048, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
await run(FR, draw);
const { profile } = await cdp.send('HeapProfiler.stopSampling');
console.log('shadow batch rebuilds while sampling:', await page.evaluate(() => window.__builds));
const by = new Map(); let total = 0;
const nm = (f) => `${f.functionName || '(anon)'} ${f.url.replace(/^.*\/lba2-remaster\//, '').replace(/^http:\/\/localhost:\d+\//, '')}:${f.lineNumber + 1}`;
// STACK=n: attribute to the function plus its n nearest callers (builtins and three.js internals say little alone)
const depth = +(process.env.STACK || 0);
const walk = (n, stack) => {
  const st = [nm(n.callFrame), ...stack];
  const name = st.slice(0, depth + 1).join('  <-  ');
  if (n.selfSize) { by.set(name, (by.get(name) || 0) + n.selfSize); total += n.selfSize; }
  for (const c of n.children) walk(c, st);
};
walk(profile.head, []);
const rows = [...by].sort((a, b) => b[1] - a[1]).slice(0, +(process.env.TOP || 30));
console.log(`${Q} ${ROUTE} draw=${draw}: ${(total / FR / 1024).toFixed(1)} KB allocated per frame (sampled), top functions:`);
for (const [n, b] of rows) console.log(`  ${(b / FR / 1024).toFixed(1).padStart(7)} KB/frame  ${n}`);
await browser.close();
