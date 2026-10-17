// Performance budgets (PERF-IGPU): draw calls, triangles and render-submission CPU time on the benchmark's four
// routes (street, interior, combat, transition) at Low / Medium / High, plus startup build and shader-preparation
// time and how many shader programs still compile after loading (each one is a stall on a real GPU).
// Runs on SwiftShader: the counts (calls, triangles, programs) are exact, the times are CPU/software-renderer
// proxies only, never GPU timings. The user's in-game Benchmark on the real laptop is the judge.
//   PERF_JSON=out.json  writes the numbers;  PERF_SHOTS=dir  saves a JPEG per route per preset
//   PERF_BUDGET=0       prints only (no budget checks; for a "before" run)
import { launch, open, checker } from './lib/boot.mjs';
import fs from 'node:fs';
const { check, done } = checker();
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
const t0 = Date.now();
await open(page, '?nocine');
const bootS = (Date.now() - t0) / 1000;
const shots = process.env.PERF_SHOTS; if (shots) fs.mkdirSync(shots, { recursive: true });
const budget = process.env.PERF_BUDGET !== '0';

const start = await ev(() => ({ load: game.loadTimes, programs: game.renderer.renderer.info.programs?.length ?? 0, gpu: game.perf.gpu }));
console.log('startup', JSON.stringify(start), 'page boot', bootS, 's');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });

const out = { start, bootS, routes: {} };
// (runs split by quality add to the same file; written after every route, so a crashed browser loses little)
const save = () => {
  if (!process.env.PERF_JSON) return;
  let prev = {}; try { prev = JSON.parse(fs.readFileSync(process.env.PERF_JSON, 'utf8')); } catch {}
  fs.writeFileSync(process.env.PERF_JSON, JSON.stringify({ ...prev, ...out, routes: { ...(prev.routes || {}), ...out.routes } }, null, 1));
};
const QS = (process.env.QUALITIES || 'low,medium,high').split(',');
for (const q of QS) {
  await ev((q) => { game.settings.quality = q; game.applySettings(); }, q);
  for (const id of ['street', 'interior', 'combat', 'transition']) {
    const r = await ev(async ({ id }) => {
      const G = game, R = G.renderer.renderer;
      const route = G.bench.routes().find((x) => x.id === id);
      G.state = 'play'; route.setup(); G.state = 'play';
      const p0 = R.info.programs.length;
      const rows = [];
      // 4 s of the route (simulated at 30 fps), drawn every 0.3 s (SwiftShader takes seconds per frame);
      // the first drawn frame (any new shader compiles) is reported apart
      let t = 0;
      for (let i = 0; i < 120; i++) {
        const dt = 1 / 30; t += dt;
        route.drive(t, dt);
        const draw = i % 9 === 0;
        G.perf.beginFrame(); G._renderMs = 0;
        G.frame(dt, draw);
        if (!draw) continue;
        // the transition route swaps scenes behind a fade: count only frames that drew
        if (G._renderMs > 0) rows.push({ ms: G._renderMs, calls: R.info.render.calls, tris: R.info.render.triangles });
      }
      const med = (k) => { const v = rows.slice(1).map((x) => x[k]).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 0; };
      const max = (k) => Math.max(0, ...rows.slice(1).map((x) => x[k]));
      return { calls: med('calls'), callsMax: max('calls'), tris: med('tris'), trisMax: max('tris'), renderMs: +med('ms').toFixed(1), firstMs: +(rows[0]?.ms ?? 0).toFixed(0),
        newPrograms: R.info.programs.length - p0, frames: rows.length, pr: +(G.renderer.renderer.getPixelRatio() * (G.renderer.effScale?.() ?? 1)).toFixed(2), lamps: G.lightPool.lights.length };
    }, { id });
    out.routes[`${q}/${id}`] = r; save();
    console.log(`${q.padEnd(6)} ${id.padEnd(10)} calls ${String(r.calls).padStart(4)} (max ${r.callsMax}) · tris ${(r.tris / 1000).toFixed(0)}k (max ${(r.trisMax / 1000).toFixed(0)}k) · submit ${r.renderMs} ms · first frame ${r.firstMs} ms · new programs ${r.newPrograms} · pr ${r.pr} · lamps ${r.lamps}`);
    if (shots) { await ev(() => { game.renderer.render(); }); await page.screenshot({ path: `${shots}/${q}-${id}.jpg`, type: 'jpeg', quality: 70, timeout: 180000 }); }
  }
}
save();
if (budget && QS.length === 3) {
  const R = out.routes;
  check('street at Medium: ≤ 300 draw calls', R['medium/street'].calls <= 300, R['medium/street']);
  check('street at High: ≤ 450 draw calls', R['high/street'].calls <= 450, R['high/street']);
  check('street at Low: ≤ 260 draw calls', R['low/street'].calls <= 260, R['low/street']);
  for (const q of ['low', 'medium', 'high']) check(`interior at ${q}: ≤ 150 draw calls`, R[`${q}/interior`].calls <= 150, R[`${q}/interior`]);
  check('no shader compiles on the routes after loading (Low/Medium/High, transitions included)', Object.values(R).every((x) => x.newPrograms === 0), Object.fromEntries(Object.entries(R).map(([k, v]) => [k, v.newPrograms])));
}
const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
