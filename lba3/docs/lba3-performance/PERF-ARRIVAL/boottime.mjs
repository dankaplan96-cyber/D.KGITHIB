// PERF-ARRIVAL: startup time to the title screen (page load → title), the game's own loadTimes (build per area,
// shader preparation and, where the build has it, its parts) and the programs ready at the title. One boot per run;
// interleave base and candidate runs (SwiftShader: CPU-drawn and CPU-compiled, the machine's load is printed).
//   GAME_URL=http://localhost:8177/ QUALITY=medium node boottime.mjs
import { launch, URL0 } from '../../../tests/lib/boot.mjs';
import os from 'node:os';
const Q = process.env.QUALITY || 'medium';
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, Q);
const l0 = os.loadavg()[0], t0 = Date.now();
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 900000 });
const s = (Date.now() - t0) / 1000;
const r = await page.evaluate(() => ({ L: game.loadTimes, programs: game.renderer.renderer.info.programs.length }));
console.log(JSON.stringify({ url: URL0, quality: Q, bootS: s, buildMs: r.L.total, shadersMs: r.L.shaders, prep: r.L.prep ?? null, programs: r.programs, zeelich: r.L.zeelich, world: r.L.world, islands: r.L.islands, load: [+l0.toFixed(1), +os.loadavg()[0].toFixed(1)], errors: errs.length }));
await browser.close();
