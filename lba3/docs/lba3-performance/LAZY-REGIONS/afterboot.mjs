// After startup: simulation CPU per step on the benchmark's street route, in 5 s windows from the moment play starts
// (is there background work right after loading?). Real frame loop, QUALITY (default low). GAME_URL
import { launch, URL0 } from '../../../tests/lib/boot.mjs';
const Q = process.env.QUALITY || 'low', W = +(process.env.WIN || 5), N = +(process.env.N || 10);
const { browser, page, errs } = await launch({ width: 960, height: 540 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', 1); } } catch {} }, Q);
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 900000 });
const cdp = await page.context().newCDPSession(page);
await page.evaluate(() => { document.querySelector('[data-act="new"]').click(); });
await page.waitForFunction(() => game.state === 'play' && !game.trans, null, { timeout: 120000 });
// the street route as the benchmark sets it up, driven by the page's own loop
await page.evaluate(() => {
  const G = game, r = G.bench.routes().find((x) => x.id === 'street');
  G.state = 'play'; r.setup(); let t = 0; G.benchTick = (real) => { t += real; r.drive(t, real); };
  window._lt = []; try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window._lt.push(Math.round(e.duration)); }).observe({ entryTypes: ['longtask'] }); } catch {}
});
for (let i = 0; i < N; i++) {
  await page.evaluate(() => game.perf.reset());
  const h0 = (await cdp.send('Runtime.getHeapUsage')).usedSize;
  await page.waitForTimeout(W * 1000);
  const s = await page.evaluate(() => { const s = game.perf.stats(); const lt = window._lt.splice(0); return { frames: s.frames, sim: s.simMs, steps: s.steps, perStep: +(s.simMs.p50 / Math.max(1, s.steps.mean)).toFixed(2), render: s.renderMs.p50, longtasks: lt.length, ltMax: Math.max(0, ...lt) }; });
  const h1 = (await cdp.send('Runtime.getHeapUsage')).usedSize;
  console.log(JSON.stringify({ win: i, ...s, heapMB: Math.round(h1 / 1048576), heapDeltaMB: Math.round((h1 - h0) / 1048576) }));
}
console.log('errors', JSON.stringify(errs));
await browser.close();
