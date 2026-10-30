// PERF-SUBMIT: the real play path into the street, the game running on its own clock (not the tests' fixed stepping:
// the scene change's black-screen preparation runs as for a player): a new game, then the scenario's scene changes
// through the normal fade; after each, every frame until FRAMES frames past the fade: its work (ms on this machine),
// whether the screen was black, and the jobs the game's counters saw in it (batches built, shadow cache rebuilt,
// programs compiled, uploads, a GC). The jobs are what count; SwiftShader's ms are this machine's.
//   GAME_URL=http://localhost:8351/ Q=medium BATTERY=1 SCEN=door,door,island FRAMES=60 node arrive.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', SCEN = (process.env.SCEN || 'door,door,island').split(','), FR = +(process.env.FRAMES || 60);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = !!q.auto; game.applySettings(); }, Q);
if (process.env.AUTO) await ev(() => { game.settings.qualityAuto = true; game.applySettings(); });
if (process.env.BATTERY) await ev(() => game.setBattery(true));
await ev(() => { document.querySelector('[data-act="new"]').click(); });
// the game on its own clock from here
await ev(() => {
  const G = game; G.testFreeze = false;
  // every frame's jobs: the game's own counters, read around advance()
  const adv = G.advance.bind(G); window.__log = null;
  G.advance = (real) => {
    const a = G.jobCounters(), t0 = performance.now(); adv(real); const ms = performance.now() - t0, b = G.jobCounters(), j = G.jobsBetween(a, b);
    const gc = a.h && b.h && a.h - b.h > 8e6 ? `GC −${((a.h - b.h) / 1048576).toFixed(0)} MB` : '';
    const black = !!G.trans && (G.trans.hold || G._fadeOp >= 0.999) || !!G.gfxHold;
    window.__log?.push({ ms, real: real * 1000, black, trans: !!G.trans, room: G.room?.id || 'citadel', j: [j, gc].filter(Boolean).join(', '), calls: G.renderer.renderer.info.render.calls });
  };
});
const settle = async () => { await page.waitForFunction(() => game.state === 'play' && !game.trans && !game.gfxHold && !game.preparing, null, { timeout: 900000 }); };
await settle();
console.log(`PERF-SUBMIT arrive · ${Q}${process.env.BATTERY ? ' battery' : ''}${process.env.AUTO ? ' Auto' : ''} · new game in ${await ev(() => game.room?.id || 'citadel')}`);
let k = 0;
for (const sc of SCEN) {
  k++;
  // get to the scenario's starting place first (through a fade too), then the change measured
  if (sc === 'door') {
    if (await ev(() => game.room?.id !== 'house')) { await ev(() => game.enterRoom('house')); await settle(); }
  } else if (sc === 'island') {
    if (await ev(() => game.room?.id !== 'desert')) { await ev(() => game.enterRoom('desert')); await settle(); }
  }
  await page.waitForTimeout(1500);
  await ev(() => { window.__log = []; });
  await ev((sc) => { if (sc === 'door') game.exitRoom({ x: -45, z: 76, a: 0 }); else game.exitRoom({ x: -42, z: 2, a: Math.PI }); }, sc);
  await page.waitForFunction((FR) => { const L = window.__log; let i = L.length - 1; while (i >= 0 && !L[i].trans) i--; return i >= 0 && L.length - 1 - i >= FR; }, FR, { timeout: 1800000 });
  const L = await ev(() => { const L = window.__log; window.__log = null; return L; });
  const last = L.map((x) => x.trans).lastIndexOf(true);
  console.log(`=== ${k}. ${sc === 'door' ? 'house door → street' : 'Desert Island → Citadel'}: ${L.length} frames (${last + 1} in the change, ${L.filter((x) => x.black).length} black)`);
  L.forEach((x, i) => { if (x.j || i <= last + 3) console.log(`  ${String(i).padStart(3)} ${x.black ? 'BLACK' : x.trans ? 'fade ' : 'view '} work ${x.ms.toFixed(0).padStart(5)} ms · calls ${x.calls}${x.j ? ' · ' + x.j : ''}`); });
  const inView = L.slice(last + 1).filter((x) => x.j && !x.black);
  console.log(`  in view after the fade: ${inView.length} frames with jobs${inView.length ? ': ' + inView.map((x) => x.j).join(' | ') : ''}`);
}
await browser.close();
