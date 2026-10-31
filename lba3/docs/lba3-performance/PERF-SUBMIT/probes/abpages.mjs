// PERF-SUBMIT: two builds in ONE browser (two pages, A and B: e.g. the base snapshot and the candidate), the same route
// driven in both, alternating blocks of BLOCK drawn frames (A then B, then B then A, …) so both see the same machine load.
// Per frame: the main thread's whole frame() (sim + render submit), the render part (renderer.render) and draw calls;
// SwiftShader's GL work drained (readPixels) before each timed frame. Reported: medians per side, and the paired
// per-round difference of block medians (median and how many rounds B was faster). Relative only (this machine).
//   A=http://localhost:8352/ B=http://localhost:8353/ Q=medium BATTERY=1 ROUTE=street ROUNDS=30 BLOCK=20 [CAM=follow]
//   [OPT_A='js'] [OPT_B='js'] node abpages.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'street', ROUNDS = +(process.env.ROUNDS || 30), BLOCK = +(process.env.BLOCK || 20);
const URLS = { A: process.env.A || 'http://localhost:8352/', B: process.env.B || 'http://localhost:8353/' };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pages = {};
for (const side of ['A', 'B']) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`[${side}] page error: ${e.message}`));
  await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
  await page.goto(URLS[side] + '?nocine' + (process.env.QS || ''), { waitUntil: 'load', timeout: 300000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 900000 });
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { game.testFreeze = true; document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
  await ev(() => game.bench.prepareAreas());
  await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
  if (process.env.BATTERY) await ev(() => game.setBattery(true));
  const opt = process.env['OPT_' + side]; if (opt) await ev((code) => (0, eval)(`(async () => { ${code}; })()`), opt);
  await page.waitForFunction(() => !game.gfxHold && !game.preparing, null, { timeout: 600000 }).catch(() => {});
  await ev(({ id, cam }) => {
    const G = game; const route = G.bench.routes().find((x) => x.id === id);
    G.state = 'play'; G.benching = true; route.setup(); G.state = 'play';
    if (cam) { G.settings.camera = cam; G.camRig.setMode(cam); G.settings.camDist = 'far'; G.applySettings(); G.camRig.cut = false; }
    window.__route = route; window.__t = 0;
    for (let i = 0; i < 300; i++) { window.__t += 1 / 60; route.drive(window.__t, 1 / 60); G.frame(1 / 60, i % 4 === 0); }
  }, { id: ID, cam: process.env.CAM || '' });
  pages[side] = page;
}
const run = (side, n) => pages[side].evaluate((n) => {
  const G = game, R = G.renderer.renderer, gl = R.getContext(), out = [];
  for (let j = 0; j < n; j++) {
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    window.__t += 1 / 60; window.__route.drive(window.__t, 1 / 60);
    G.perf.beginFrame(); G._renderMs = 0;
    const t0 = performance.now(); G.frame(1 / 60, true); out.push([performance.now() - t0, G._renderMs, R.info.render.calls]);
  }
  return out;
}, n);
const med = (a) => { const v = a.slice().sort((x, y) => x - y); return v[v.length >> 1]; };
const rows = { A: [], B: [] }, diffs = [], rdiffs = [];
for (let r = 0; r < ROUNDS; r++) {
  const order = r & 1 ? ['B', 'A'] : ['A', 'B'], got = {};
  for (const s of order) { const x = await run(s, BLOCK); const keep = x.slice(2); rows[s].push(...keep); got[s] = keep; }
  diffs.push(med(got.B.map((x) => x[0])) - med(got.A.map((x) => x[0])));
  rdiffs.push(med(got.B.map((x) => x[1])) - med(got.A.map((x) => x[1])));
}
const pc = (a, p) => { const v = a.slice().sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(p * v.length))]; };
const spread = (s) => { const f = rows[s].map((x) => x[0]), m = med(f); return `frame p95 ${pc(f, 0.95).toFixed(2)} p99 ${pc(f, 0.99).toFixed(2)} max ${Math.max(...f).toFixed(1)} · frames over 1.5× the median ${(100 * f.filter((x) => x > 1.5 * m).length / f.length).toFixed(1)} % · over 2× ${(100 * f.filter((x) => x > 2 * m).length / f.length).toFixed(1)} %`; };
const line = (s) => `${s} ${URLS[s]}${process.env['OPT_' + s] ? ' opt ' + process.env['OPT_' + s] : ''}: frame p50 ${med(rows[s].map((x) => x[0])).toFixed(2)} · render p50 ${med(rows[s].map((x) => x[1])).toFixed(2)} · sim (frame − render) p50 ${med(rows[s].map((x) => x[0] - x[1])).toFixed(2)} ms · calls p50 ${med(rows[s].map((x) => x[2]))}`;
console.log(`PERF-SUBMIT A/B pages · ${Q}${process.env.BATTERY ? ' battery' : ''}${process.env.CAM ? ' cam ' + process.env.CAM : ''} · ${ID} · ${ROUNDS} rounds × ${BLOCK} frames`);
console.log(line('A')); console.log('   ' + spread('A')); console.log(line('B')); console.log('   ' + spread('B'));
console.log(`paired B − A per round: frame median ${med(diffs).toFixed(3)} ms (B faster in ${diffs.filter((d) => d < 0).length}/${diffs.length}) · render median ${med(rdiffs).toFixed(3)} ms (B faster in ${rdiffs.filter((d) => d < 0).length}/${rdiffs.length})`);
await browser.close();
