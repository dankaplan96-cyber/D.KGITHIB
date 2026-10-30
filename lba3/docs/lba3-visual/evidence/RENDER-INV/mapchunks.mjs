// RENDER-INV: the map builder's work between two yields ("chunks"), the unit a background slice can't split. One
// chunk per step call (step(1e-6) runs exactly one), for each region's map built afresh: the number of chunks
// (deterministic) and the chunk times' percentiles (CPU proxy; noisy on a loaded machine, so p50/p95 matter more
// than the max). A slice asked for 2.5 ms overshoots by up to one chunk.
//   GAME_URL=http://localhost:8176/ node mapchunks.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
import os from 'node:os';
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await open(page, '?nocine');
const load = os.loadavg()[0];
const out = await page.evaluate(async () => {
  document.querySelector('[data-act="new"]').click(); const G = game; G.testFreeze = true; G.step(0.3); G.setState('play');
  const { mapBuilder } = await import(new URL('src/game/mapdraw.js', location.href).href);
  const res = {};
  for (const region of ['citadel', 'desert', 'zeelich', 'hamalayi', 'isle_otringal', 'isle_knartas']) {
    // (a terrain's colours are cached on it after a first map: dropped so every run does the same work)
    const T = region === 'citadel' ? G.terrain : G.rooms[region]?.terrain; if (T) delete T._mapAlb;
    const B = mapBuilder(G, region), t = [];
    for (let i = 0; i < 1e6 && !B.done; i++) { const t0 = performance.now(); B.step(1e-6); t.push(performance.now() - t0); }
    t.sort((a, b) => a - b); const p = (q) => +t[Math.min(t.length - 1, Math.floor(q * t.length))].toFixed(2);
    res[region] = { chunks: t.length, totalMs: +t.reduce((a, b) => a + b, 0).toFixed(0), p50: p(0.5), p95: p(0.95), p99: p(0.99), max: p(1), over2_5: t.filter((x) => x > 2.5).length, over10: t.filter((x) => x > 10).length };
  }
  return res;
});
console.log(JSON.stringify({ load, loadAfter: os.loadavg()[0], out, errors: errs.slice(0, 5) }));
await browser.close();
