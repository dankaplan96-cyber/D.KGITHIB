// RENDER-INV: the in-game benchmark (Pause → Benchmark) run in real time, as on the user's laptop, and its report
// printed. SwiftShader here: its fps are CPU-drawn, never the laptop's.
//   GAME_URL=http://localhost:8176/ QUALITIES=medium node benchrun.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
import os from 'node:os';
const Q = (process.env.QUALITIES || 'medium').split(',');
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript(() => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: 'medium', qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', '1'); } } catch {} });
await open(page, '?nocine', { freeze: false });
const l0 = os.loadavg().map((x) => +x.toFixed(2));
await page.evaluate(() => { document.querySelector('[data-act="new"]').click(); });
await page.waitForTimeout(3000);
const text = await page.evaluate((Q) => game.bench.run(Q), Q);
console.log(text);
console.log(`\n(load average before ${l0.join(' ')} · after ${os.loadavg().map((x) => x.toFixed(2)).join(' ')})`);
console.log(errs.length ? errs.slice(0, 5).join('\n') : 'no page errors');
await browser.close();
