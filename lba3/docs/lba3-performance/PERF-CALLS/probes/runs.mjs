// PERF-CALLS: an area's draw batches built with PERF-CPU's gaps (OVERLAP off) and with the overlap rule (on), in the
// same page: batches, pieces in them, single-piece batches, the overlap rule's decisions, and one frame's main-pass draws.
//   GAME_URL=http://localhost:8321/ Q=medium BATTERY=1 AREAS=zeelich,desert node runs.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', AREAS = (process.env.AREAS || 'zeelich').split(',');
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
await ev(async () => { window.__DB = await import('/src/engine/drawbatch.js'); });
for (const area of AREAS) {
  const r = await ev((area) => {
    const G = game, R = G.renderer.renderer, out = {};
    G.state = 'play';
    if (area === 'citadel') G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); else G.enterRoom(area, null, true, true);
    G.bench.camera(); G.state = 'play';
    for (let i = 0; i < 30; i++) G.frame(1 / 30, i % 5 === 0);
    const root = G.room?.group || G.world.root;
    for (const on of [false, true]) {
      window.__DB.OVERLAP.on = on;
      G.drawBatch.reset(); const t0 = performance.now(); G.drawBatch.update(root); const ms = performance.now() - t0;
      const A = G.drawBatch.areas.get(root);
      let cells = 0, pieces = 0, single = 0, arr = 0; const sizes = {};
      for (const C of A.cells.values()) if (C.mesh) { cells++; pieces += C.list.length; if (C.list.length === 1) single++; if (C.fold?.arr) arr++; }
      G.frame(1 / 60, true); G.perf.beginFrame(); G.frame(0, true);
      let main = 0; const rbd = R.renderBufferDirect; R.renderBufferDirect = function (c, sc, ...a) { if (sc !== null) main++; return rbd.call(this, c, sc, ...a); };
      G.frame(0, true); R.renderBufferDirect = rbd;
      out[on ? 'overlap' : 'gaps'] = { ms: Math.round(ms), batches: cells, arrBatches: arr, pieces, single, main, runs: A.runs ?? null, dbg: A.dbg ?? null, prof: A.prof };
    }
    window.__DB.OVERLAP.on = true;
    return out;
  }, area);
  console.log(area, JSON.stringify(r));
}
await browser.close();
