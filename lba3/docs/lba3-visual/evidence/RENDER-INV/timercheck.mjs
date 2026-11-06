// RENDER-INV: the benchmark's GPU timer in the real loop (perf.js GpuTimer): does it deliver per-pass samples?
// (SwiftShader's timer reads 0 ms: this checks the plumbing, not the values.)
import { launch, open } from '../../../../tests/lib/boot.mjs';
const { browser, page, errs } = await launch({ width: 640, height: 360 });
await open(page, '?nocine', { freeze: false });
await page.evaluate(() => { document.querySelector('[data-act="new"]').click(); });
await page.waitForTimeout(2000);
await page.evaluate(() => { game.renderer.timer = game.perf.gpuTimer; game.perf.gpuTimer?.reset(); });
await page.waitForTimeout(8000);
const r = await page.evaluate(() => ({ has: !!game.perf.gpuTimer, stats: game.perf.gpuTimer?.stats(), pending: game.perf.gpuTimer?.frames.length }));
console.log(JSON.stringify(r), errs.length ? errs.slice(0, 3) : 'no errors');
await browser.close();
