// PACE-SIM: the benchmark's own CPU sections (perf.js Sections, as "CPU by section" in the report) on a route at a fixed
// 60 Hz step, not drawn (the far cull runs each step as a drawn frame runs it): mean ms and calls a frame per section,
// and the animation updates (Rig.update) a frame. Comparable to the laptop's "people 0.5 ms (67 calls) · enemies 0.26 (39)
// · physics 0.61 (183)" on the interior route; the ms are this machine's.
//   GAME_URL=... ROUTE=interior STEPS=900 node sections.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const ID = process.env.ROUTE || 'interior', STEPS = +(process.env.STEPS || 900);
const { browser, page } = await launch({ width: 640, height: 360 });
await page.addInitScript(() => { try { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: 'medium', qPicked: true, qv: 1, v: 2 })); } catch {} });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
const out = await ev(async ({ id, n }) => {
  const G = game, { Sections } = await import('./src/engine/perf.js'), { Rig } = await import('./src/engine/rig.js').catch(() => ({}));
  const r = G.bench.routes().find((x) => x.id === id);
  G.benching = true; G.state = 'play'; r.setup();
  let t = 0; const step = () => { t += 1 / 60; G.state = 'play'; r.drive(t, 1 / 60); G.frame(1 / 60, false); G.farCull.hide(); G.farCull.restore(); };
  for (let i = 0; i < 600; i++) step();
  // animation updates a frame: every rig the people and enemies have
  let rigN = 0; const seen = new Set();
  for (const a of [...G.npcs, ...G.enemies]) { const R = a.rig; if (!R || seen.has(R)) continue; seen.add(R); const f = R.update; R.update = function (...x) { rigN++; return f.apply(this, x); }; }
  const S = new Sections(); S.install(G);
  const acc = {}, calls = {}; let sim = 0;
  for (let i = 0; i < n; i++) {
    S.begin(); const t0 = performance.now(); step(); const f = { sim: performance.now() - t0 }; const o = S.take(f); sim += f.sim;
    for (const [k, v] of Object.entries(o.ms)) acc[k] = (acc[k] || 0) + v;
    for (const [k, v] of Object.entries(o.n)) calls[k] = (calls[k] || 0) + v;
  }
  S.off(); G.benching = false;
  const res = {}; for (const k of Object.keys(acc)) res[k] = `${(acc[k] / n).toFixed(3)} ms (${((calls[k] || 0) / n).toFixed(1)})`;
  return { route: id, room: G.room?.id || 'citadel', steps: n, simMs: +(sim / n).toFixed(3), rigUpdatesPerFrame: +(rigN / n).toFixed(1), sections: res };
}, { id: ID, n: STEPS });
console.log(JSON.stringify(out, null, 1));
await browser.close();
