// LAZY-REGIONS probe: first entry into each area in real time (the game's own loop: fade, card, build, warm-up),
// then a second entry; build ms, wall time of the scene change, programs made, heap after. GAME_URL, AREAS
import { launch, URL0 } from '../../../tests/lib/boot.mjs';
const AREAS = (process.env.AREAS || 'zeelich,desert,hamalayi,isle_otringal,workshop,upper,underground:c3shaft,office').split(',');
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript(() => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: 'medium', qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', 1); } } catch {} });
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 900000 });
await page.evaluate(() => { document.querySelector('[data-act="new"]').click(); });
await page.waitForFunction(() => game.state === 'play' && !game.trans, null, { timeout: 120000 });
const cdp = await page.context().newCDPSession(page);
const gc = async () => { try { await cdp.send('HeapProfiler.collectGarbage'); } catch {} };
const heap = async () => { const h = await cdp.send('Runtime.getHeapUsage'); return Math.round(h.usedSize / 1048576); };
await gc();
const out = { start: { heap: await heap(), geos: await page.evaluate(() => game.renderer.renderer.info.memory.geometries) }, areas: [] };
for (const a of AREAS) {
  const id = a.includes(':') ? a.split(':')[1] : a;
  for (const pass of [1, 2]) {
    const r = await page.evaluate(async (id) => {
      const G = game, R = G.renderer.renderer, p0 = R.info.programs.length, l0 = G.regions.log.length, t0 = performance.now();
      let card = false, maxGap = 0, last = performance.now();
      const obs = setInterval(() => { if (document.querySelector('#loading.arrive')) card = true; }, 20);
      const tick = () => { const n = performance.now(); maxGap = Math.max(maxGap, n - last); last = n; if (G.trans || performance.now() - t0 < 200) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      G.enterRoom(id);
      await new Promise((res) => { const w = () => (!G.trans ? res() : setTimeout(w, 30)); setTimeout(w, 50); });
      clearInterval(obs);
      const builds = G.regions.log.slice(l0);
      return { id, room: G.room?.id, wallMs: Math.round(performance.now() - t0), builds, newPrograms: R.info.programs.length - p0, card, maxFrameGapMs: Math.round(maxGap) };
    }, id);
    await gc();
    r.heap = await heap(); r.geos = await page.evaluate(() => game.renderer.renderer.info.memory.geometries); r.pass = pass;
    // a few seconds of play there (the frame loop), then back to Citadel
    await page.waitForTimeout(1500);
    await page.evaluate(async () => { game.exitRoom({ x: -42, z: 2, a: 0 }); await new Promise((res) => { const w = () => (!game.trans ? res() : setTimeout(w, 30)); setTimeout(w, 50); }); });
    out.areas.push(r);
    console.log(JSON.stringify(r));
  }
}
out.summary = await page.evaluate(() => game.regions.summary());
out.errors = errs;
console.log(JSON.stringify({ start: out.start, summary: out.summary, errors: errs }));
if (process.env.OUT) (await import('node:fs')).writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
await browser.close();
