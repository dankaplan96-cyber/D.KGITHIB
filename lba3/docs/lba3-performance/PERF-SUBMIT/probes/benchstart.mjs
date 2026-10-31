// PERF-SUBMIT: the benchmark's own start, as the user runs it (Benchmark: Auto as played, or the full benchmark), the
// game on its own clock: every frame's jobs (game counters: batches built, shadow cache rebuilt, programs compiled,
// uploads, Auto steps, a GC) from the click until SECONDS of the first route have run; black or in view.
//   GAME_URL=http://localhost:8351/ BATTERY=1 MODE=auto|full ROUTES=street SECONDS=8 [FROM=title|play] node benchstart.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const MODE = process.env.MODE || 'auto', ROUTES = (process.env.ROUTES || 'street').split(','), SEC = +(process.env.SECONDS || 8);
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
if (process.env.BATTERY) await ev(() => game.setBattery(true));
if ((process.env.FROM || 'play') === 'play') { await ev(() => { document.querySelector('[data-act="new"]').click(); }); }
await ev(() => {
  const G = game; G.testFreeze = false;
  const adv = G.advance.bind(G); window.__log = [];
  G.advance = (real) => {
    const a = G.jobCounters(), t0 = performance.now(); adv(real); const ms = performance.now() - t0, b = G.jobCounters(), j = G.jobsBetween(a, b);
    const gc = a.h && b.h && a.h - b.h > 8e6 ? `GC −${((a.h - b.h) / 1048576).toFixed(0)} MB` : '';
    const black = (!!G.trans && (G.trans.hold || G._fadeOp >= 0.999)) || !!G.gfxHold;
    window.__log.push({ t: performance.now(), ms, black, room: G.room?.id || 'citadel', j: [j, gc].filter(Boolean).join(', '), q: G.settings.qualityAuto ? 'Auto ' + (G.autoQ?.label?.() ?? '') : G.settings.quality, route: G.bench?.running ? 'bench' : '' });
  };
});
await page.waitForFunction(() => !game.trans && !game.gfxHold && !game.preparing, null, { timeout: 900000 });
await page.waitForTimeout(2000);
const t0 = await ev(({ MODE, ROUTES, SEC }) => {
  window.__log = []; const G = game, t0 = performance.now();
  window.__done = false;
  const p = MODE === 'auto' ? G.bench.runAuto({ routes: ROUTES, measure: SEC }) : G.bench.run(['medium'], { routes: ROUTES, breakdown: false, played: false });
  p.then(() => { window.__done = true; });
  return t0;
}, { MODE, ROUTES, SEC });
await page.waitForFunction(() => window.__done, null, { timeout: 3600000 });
const L = await ev(() => window.__log);
console.log(`PERF-SUBMIT benchmark start · ${MODE} · ${ROUTES.join(',')} · ${L.length} frames`);
for (const x of L) if (x.j || x.ms > 400) console.log(`  ${((x.t - t0) / 1000).toFixed(2).padStart(6)} s ${x.black ? 'BLACK' : 'view '} ${x.room.padEnd(9)} ${x.q.padEnd(16)} work ${x.ms.toFixed(0).padStart(5)} ms${x.j ? ' · ' + x.j : ''}`);
await browser.close();
