// startup probe: page load -> title; game.loadTimes; heap; programs. GAME_URL, QUALITY
import { launch, URL0 } from '../../../tests/lib/boot.mjs';
import os from 'node:os';
const Q = process.env.QUALITY || 'medium';
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, Q);
if (process.env.THROTTLE) { const c0 = await page.context().newCDPSession(page); await c0.send('Emulation.setCPUThrottlingRate', { rate: +process.env.THROTTLE }); }
const l0 = os.loadavg()[0], t0 = Date.now();
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
const tl = Date.now();
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 900000 });
const s = (Date.now() - t0) / 1000;
const cdp = await page.context().newCDPSession(page); await cdp.send('HeapProfiler.collectGarbage'); const hu = await cdp.send('Runtime.getHeapUsage');
const r = await page.evaluate(() => ({ L: game.loadTimes, programs: game.renderer.renderer.info.programs.length, mem: game.renderer.renderer.info.memory, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, built: game.regions?.summary?.() }));
console.log(JSON.stringify({ url: URL0, quality: Q, bootS: s, pageLoadS: (tl - t0) / 1000, ...r, heapGC: Math.round(hu.usedSize / 1048576), load: [+l0.toFixed(1), +os.loadavg()[0].toFixed(1)], errors: errs }));
await browser.close();
