// Performance budgets (PERF-IGPU): draw calls, triangles and render-submission CPU time on the benchmark's four
// routes (street, interior, combat, transition) at Low / Medium / High, plus startup build and shader-preparation
// time and how many shader programs still compile after loading (each one is a stall on a real GPU).
// Runs on SwiftShader: the counts (calls, triangles, programs) are exact, the times are CPU/software-renderer
// proxies only, never GPU timings. The user's in-game Benchmark on the real laptop is the judge.
//   PERF_JSON=out.json  writes the numbers;  PERF_SHOTS=dir  saves a JPEG per route per preset
//   PERF_BUDGET=0       prints only (no budget checks; for a "before" run);  ROUTES=street,transition  only those
// FRAME-1 adds a pacing check on every run: no object's geometry rebuilt while a route plays (see `rebuilt`).
import { launch, open, checker } from './lib/boot.mjs';
import fs from 'node:fs';
const { check, done } = checker();
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
// one preset per run starts with that preset saved (as a player who picked it), so loading prepares its shaders
const QS = (process.env.QUALITIES || 'low,medium,high').split(',');
if (QS.length === 1) await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, QS[0]);
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
for (const q of QS) {
  await ev((q) => { game.settings.quality = q; game.applySettings(); }, q);
  for (const id of (process.env.ROUTES || 'street,interior,combat,transition').split(',')) {
    const r = await ev(async ({ id }) => {
      const G = game, R = G.renderer.renderer;
      const route = G.bench.routes().find((x) => x.id === id);
      G.state = 'play'; route.setup(); G.state = 'play';
      const p0 = R.info.programs.length;
      const rows = [];
      // (FRAME-1) geometries the GPU sees for the first time, per object: one is a first view (an upload), more than
      // two on one object means it is rebuilt while it plays (garbage and a new GPU buffer each time: Doran's mooring
      // line was rebuilt 30 times a second anywhere on Citadel)
      const seenGeo = new WeakSet(), newPer = new Map(), rbd = R.renderBufferDirect;
      R.renderBufferDirect = function (c, sc, geometry, material, object, ...a) {
        if (!seenGeo.has(geometry)) { seenGeo.add(geometry); if (rows.length) newPer.set(object, (newPer.get(object) || 0) + 1); }
        return rbd.call(this, c, sc, geometry, material, object, ...a);
      };
      // the in-game benchmark's window (PERF-2): 1.5 s of warm-up then 6 s, simulated at 30 fps and drawn every
      // 0.25 s (SwiftShader takes seconds per frame), so the turning camera covers the same headings as on the
      // player's machine; the first drawn frame (any new shader compiles) is reported apart
      let t = 0, first = true;
      for (let i = 0; i < 225; i++) {
        const dt = 1 / 30; t += dt;
        route.drive(t, dt);
        const draw = first || (t >= 1.5 && i % 8 === 0); first = false;
        // (drain the software GPU's queue first, so the timed render() is CPU submission, not waiting on it)
        if (draw) { const gl = R.getContext(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); }
        G.perf.beginFrame(); G._renderMs = 0;
        G.frame(dt, draw);
        if (!draw) continue;
        // the transition route swaps scenes behind a fade: count only frames that drew
        if (G._renderMs > 0) rows.push({ ms: G._renderMs, calls: R.info.render.calls, tris: R.info.render.triangles, draws: R.info.render.calls + G.perf.sub, shadow: G.perf.shadow });
      }
      R.renderBufferDirect = rbd;
      const pathOf = (o) => { const p = []; for (let x = o; x && x !== G.scene; x = x.parent) p.push(x.name || x.type); return p.slice(0, 4).join(' < '); };
      const rebuilt = [...newPer].filter(([, n]) => n > 2).map(([o, n]) => `${pathOf(o)} ×${n}`);
      const med = (k) => { const v = rows.slice(1).map((x) => x[k]).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : 0; };
      const max = (k) => Math.max(0, ...rows.slice(1).map((x) => x[k]));
      const p95 = (k) => { const v = rows.slice(1).map((x) => x[k]).sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.floor(v.length * 0.95))] : 0; };
      return { calls: med('calls'), callsMax: max('calls'), callsP95: p95('calls'), draws: med('draws'), shadow: med('shadow'), tris: med('tris'), trisMax: max('tris'), renderMs: +med('ms').toFixed(1), firstMs: +(rows[0]?.ms ?? 0).toFixed(0),
        rebuilt, newPrograms: R.info.programs.length - p0, newNames: R.info.programs.slice(p0).map((p) => p.name + ':' + String(p.cacheKey).slice(0, 90)), frames: rows.length, pr: +(G.renderer.renderer.getPixelRatio() * (G.renderer.effScale?.() ?? 1)).toFixed(2), lamps: G.lightPool.lights.length };
    }, { id });
    out.routes[`${q}/${id}`] = r; save();
    if (r.newPrograms) console.log('   new programs:', JSON.stringify(r.newNames).slice(0, 1500));
    console.log(`${q.padEnd(6)} ${id.padEnd(10)} calls ${String(r.calls).padStart(4)} (p95 ${r.callsP95}, max ${r.callsMax}, shadow ${r.shadow}) · GPU draws ${r.draws} · tris ${(r.tris / 1000).toFixed(0)}k (max ${(r.trisMax / 1000).toFixed(0)}k) · submit ${r.renderMs} ms · first frame ${r.firstMs} ms · new programs ${r.newPrograms} · pr ${r.pr} · lamps ${r.lamps}`);
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
// (FRAME-1, any preset run): nothing rebuilds its geometry while a route plays
if (budget) check('frame pacing: no object gets a new geometry more than twice while a route plays (no per-frame rebuilds: garbage + a GPU upload each time)', Object.values(out.routes).every((x) => !x.rebuilt?.length), Object.fromEntries(Object.entries(out.routes).filter(([, v]) => v.rebuilt?.length).map(([k, v]) => [k, v.rebuilt])));
const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
