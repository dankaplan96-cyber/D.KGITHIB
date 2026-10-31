// PERF-CALLS: what runs in the first seconds of a route after the benchmark prepared its areas (the user's Auto run:
// the street opened with 1.7 s and 1.3 s stalls in view), in fixed 60 Hz steps, every step drawn: per frame the jobs
// the game's own counters see (Game.jobCounters / jobsBetween: batches built, shadow cache rebuilt, programs compiled,
// geometry/texture uploads, Auto steps, a heap that shrank = a GC), the frame's main-thread ms and whether the
// screen was black. On SwiftShader the ms are this machine's; the jobs are what count.
//   GAME_URL=http://localhost:8321/ Q=medium BATTERY=1 ROUTES=street,arrival SECONDS=6 [AUTO=1] node firstjobs.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ROUTES = (process.env.ROUTES || 'street').split(','), SEC = +(process.env.SECONDS || 6);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
if (process.env.AUTO) await ev(() => { game.settings.qualityAuto = true; game.applySettings(); });
else await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
await ev(() => game.bench.prepareAreas());
for (const id of ROUTES) {
  const rows = await ev(({ id, sec }) => {
    const G = game, route = G.bench.routes().find((x) => x.id === id), out = [];
    G.state = 'play'; G.benching = true; route.setup(); G.state = 'play';
    let t = 0;
    for (let i = 0; i < sec * 60; i++) {
      t += 1 / 60; route.drive(t, 1 / 60);
      const a = G.jobCounters(), t0 = performance.now();
      G.frame(1 / 60, true);
      const ms = performance.now() - t0, b = G.jobCounters(), j = G.jobsBetween(a, b);
      const gc = a.h && b.h && a.h - b.h > 8e6 ? `GC −${((a.h - b.h) / 1048576).toFixed(0)} MB` : '';
      const black = !!G.trans && (G.trans.hold || G._fadeOp >= 0.999);
      if (j || gc) out.push(`${t.toFixed(2)} s ${G.room?.id || 'citadel'} ${black ? 'BLACK' : 'view '} ${ms.toFixed(0)} ms · ${[j, gc].filter(Boolean).join(', ')}`);
    }
    G.benching = false;
    return out;
  }, { id, sec: SEC });
  console.log(`=== ${id}: frames with a job in the first ${SEC} s`);
  for (const r of rows) console.log('  ' + r);
}
await browser.close();
