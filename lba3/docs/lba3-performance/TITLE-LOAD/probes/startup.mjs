// TITLE-LOAD: the start as the laptop has it (desktop app on battery before the first shader, Quality Auto's first start
// on battery: Medium; `?autoq` lets Auto run under webdriver), from the page's first byte to the title menu, here: the
// startup steps (game.loadTimes), every main-thread long task (the browser's 'longtask' entries, ≥ 50 ms) with the
// loading step it ran in, the display-frame intervals of the loading screen (perf.js STARTUP: rAF intervals, the main
// thread's view), the shader programs made by the title (by kind) and whether the driver compiles in parallel.
// SwiftShader: relative CPU ms and exact counts only.
//   GAME_URL=http://localhost:8637/ TMPDIR=/dev/shm node startup.mjs [out.json]
//   SYNC=1: ?syncsteps (each prepare step ends with a GPU drain: its queued GPU work counted in it; diagnostic only)
//   QUERY='&nowarm' etc.: more URL switches. PLUGGED=1: plugged in.
import { launch } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const E = process.env, URL0 = E.GAME_URL || 'http://localhost:8637/';
const { browser, page } = await launch({ width: +(E.WIDTH || 1366), height: +(E.HEIGHT || 768) });
await page.addInitScript((b) => {
  window.desktop = { onBattery: b, onPower() {} };
  window.__lt = [];
  try { new PerformanceObserver((L) => { for (const e of L.getEntries()) window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]); }).observe({ type: 'longtask', buffered: true }); } catch { /* */ }
}, !E.PLUGGED);
// PROFILE=1: a CPU profile of the main thread from the first byte to the title (Chrome DevTools protocol): self and
// inclusive time per function, the TOP (40) of each
let cdp = null;
if (E.PROFILE) { cdp = await page.context().newCDPSession(page); await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start'); }
const t0 = Date.now();
await page.goto(URL0 + '?autoq' + (E.SYNC ? '&syncsteps' : '') + (E.QUERY || ''), { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing && window.game.screen === 'title', null, { timeout: 1200000, polling: 250 });
const wall = (Date.now() - t0) / 1000;
let prof = '';
if (cdp) {
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n])), parent = new Map(), incl = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const key = (cf) => `${cf.functionName || '(anon)'} ${cf.url.replace(/^.*\/(src|vendor)\//, '$1/')}:${cf.lineNumber + 1}`;
  let tot = 0;
  for (let i = 0; i < profile.samples.length; i++) {
    const dt = (profile.timeDeltas[i] || 0) / 1000, n = byId.get(profile.samples[i]); tot += dt;
    self.set(key(n.callFrame), (self.get(key(n.callFrame)) || 0) + dt);
    const seen = new Set(); for (let id = profile.samples[i]; id != null; id = parent.get(id)) { const k = key(byId.get(id).callFrame); if (!seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) || 0) + dt); } }
  }
  const top = +(E.TOP || 40), P = ['', `PROFILE ${tot.toFixed(0)} ms sampled`, '-- self --'];
  for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, top)) P.push(`${v.toFixed(0).padStart(8)} ms  ${k}`);
  P.push('-- inclusive --');
  for (const [k, v] of [...incl].sort((a, b) => b[1] - a[1]).slice(0, top)) P.push(`${v.toFixed(0).padStart(8)} ms  ${k}`);
  prof = P.join('\n');
}
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const G = game, R = G.renderer.renderer, L = G.loadTimes, T = L.timeline || [];
  const stepAt = (t) => { let s = 'before the game'; for (const [a, l] of T) if (a <= t) s = l; return s; };
  const lt = window.__lt.slice().sort((a, b) => b[1] - a[1]);
  const gl = R.getContext();
  const progs = R.info.programs.map((p) => p.name || p.type || '?');
  const kinds = {}; for (const n of progs) kinds[n] = (kinds[n] || 0) + 1;
  return {
    gpu: G.perf?.gpu, parallel: !!gl.getExtension('KHR_parallel_shader_compile'), quality: G.autoQ?.on() ? 'Auto ' + G.autoQ.label() : G.settings.quality, battery: G.renderer.battery,
    loadTimes: { total: L.total, citadel: L.citadel, shaders: L.shaders, programs: L.programs, longestStep: L.longestStep, worldSteps: L.worldSteps, world: L.world, spaceport: L.spaceport, townlife: L.townlife, containers: L.containers, citydress: L.citydress, actors: L.actors, story: L.story, house: L.house, well: L.well, prep: L.prep, slices: L.slices },
    titleAt: T.length ? T[T.length - 1][0] : null,
    longTasks: lt.slice(0, 40).map(([t, d]) => ({ t, d, step: stepAt(t) })), longTaskCount: lt.length, longTaskSum: lt.reduce((a, x) => a + x[1], 0), over200: lt.filter((x) => x[1] > 200).length, over100: lt.filter((x) => x[1] > 100).length,
    programs: progs.length, programKinds: kinds,
    report: G.startupReport().split('\n').slice(0, 40).join('\n'),
  };
});
r.wallToTitle = wall;
const lines = [];
lines.push(`start to title here: ${wall.toFixed(1)} s wall · title at ${(r.titleAt / 1000).toFixed(1)} s page time · ${r.gpu} · KHR_parallel_shader_compile ${r.parallel} · ${r.quality} · battery ${r.battery}`);
lines.push(`build ${r.loadTimes.total} ms (Citadel ${r.loadTimes.citadel}) · prepare ("shaders") ${r.loadTimes.shaders} ms · programs ${r.programs} · longest step ${r.loadTimes.longestStep} ms`);
lines.push(`world steps: ${JSON.stringify(r.loadTimes.worldSteps)}`);
lines.push(`town ${r.loadTimes.spaceport}+${r.loadTimes.townlife}+${r.loadTimes.containers}+${r.loadTimes.citydress} · house ${r.loadTimes.house} · well ${r.loadTimes.well} · actors ${r.loadTimes.actors} · story ${r.loadTimes.story}`);
lines.push(`prepare steps: ${JSON.stringify(r.loadTimes.prep)}`);
if (r.loadTimes.slices) lines.push(`slices: ${JSON.stringify(r.loadTimes.slices)}`);
lines.push(`long tasks: ${r.longTaskCount} (sum ${r.longTaskSum} ms; > 100 ms ${r.over100}; > 200 ms ${r.over200}); the longest:`);
for (const x of r.longTasks.slice(0, 25)) lines.push(`  ${String(x.d).padStart(6)} ms at ${(x.t / 1000).toFixed(2)} s · ${x.step}`);
lines.push(`programs by kind: ${JSON.stringify(r.programKinds)}`);
lines.push('', r.report);
lines.push(prof);
console.log(lines.join('\n'));
if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(r, null, 1));
await browser.close();
