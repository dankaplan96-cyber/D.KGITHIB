// preset / power switches: the frame after each (the shadow batches' rebuild), counts before and after, and that a
// round trip comes back to the same counts (no draw batch lost)
import { launch, open } from '../../../../tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
const steps = (process.env.STEPS || 'medium,high,bat,unbat,medium,high').split(',');
const out = await ev(async (steps) => {
  const G = game, R = G.renderer.renderer, gl = R.getContext();
  const route = G.bench.routes().find((x) => x.id === 'street'); route.setup(); G.state = 'play';
  const draw = () => { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); G.perf.beginFrame(); G._renderMs = 0; const t0 = performance.now(); G.frame(1 / 60, true); const ms = performance.now() - t0; return { ms: +ms.toFixed(0), calls: R.info.render.calls, shadow: G.perf.shadow, cell: G.shadowCull.cell, batches: Object.values(G.drawBatch.stats()).reduce((a, x) => a + x.batches, 0) }; };
  const rows = []; window.__extra = +(new URLSearchParams(location.search).get('x') || 70);
  for (let i = 0; i < 3; i++) draw();
  rows.push(['start ' + G.settings.quality, draw(), draw()]);
  for (const s of steps) {
    if (s === 'bat') G.setBattery(true); else if (s === 'unbat') G.setBattery(false); else { G.settings.quality = s; G.applySettings(); }
    for (let k = 0; k < 400 && G.gfxHold; k++) await new Promise((r) => setTimeout(r, 50));
    const a = draw(), b = draw(); for (let k = 0; k < +(window.__extra || 0); k++) draw(); const c = draw();
    rows.push([s + ' (' + G.settings.quality + (G.renderer.battery ? ', battery' : '') + ')', a, b, c]);
  }
  return rows;
}, steps);
for (const r of out) console.log(r[0].padEnd(22), r.slice(1).map((x) => `${x.ms} ms · calls ${x.calls} (shadow ${x.shadow}) · cell ${x.cell} · draw batches ${x.batches}`).join('  |  '));
await browser.close();
