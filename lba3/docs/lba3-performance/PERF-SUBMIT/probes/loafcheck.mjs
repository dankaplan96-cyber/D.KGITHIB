// STABILIZATION: the hitch list's main-thread note (perf.js LOAF / loafIn) in a real page — the browser reports long
// animation frames, the ring keeps them, a busy interval names its script, a free one says so.
//   GAME_URL=http://localhost:8353/ node loafcheck.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 1366, height: 768 });
await open(page, '?nocine');
for (const live of [false, true]) console.log(await page.evaluate(async (live) => {
  const P = await import('./src/engine/perf.js');
  game.testFreeze = !live;   // (live: the game's loop drawing frames meanwhile, as in play)
  // (a 300 ms busy main thread in an ordinary task, as a frame's callback would be)
  const end = await new Promise((r) => setTimeout(() => { const t0 = performance.now(); while (performance.now() - t0 < 300) { /* busy */ } r(performance.now()); }, 0));
  await new Promise((r) => setTimeout(r, 6000));   // (the observer's entries come after the frame)
  return `${live ? 'loop running' : 'loop frozen'}: LOAF.ok ${P.LOAF.ok} · kept ${P.LOAF.list.length} · the busy 300 ms: ${P.loafIn(end, 300)} · an interval long ago: ${P.loafIn(1, 1)} · busy ended at ${end.toFixed(0)}; last entries ${P.LOAF.list.slice(-4).map((e) => `${e.t.toFixed(0)}+${e.d.toFixed(0)}`).join(' ')}`;
}, live));
await browser.close();
