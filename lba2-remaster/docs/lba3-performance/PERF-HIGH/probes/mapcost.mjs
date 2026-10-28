// how long each region's base map takes to build in 2.5 ms slices (one slice per frame of play)
import { launch, open } from '../../../../tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
const r = await ev(async () => {
  const G = game, H = G.hud, out = {};
  await G.bench.prepareAreas();
  for (const id of ['citadel', 'zeelich', 'desert', 'hamalayi']) {
    H._bases?.delete(id);
    const B = H._base(id); let n = 0; const t0 = performance.now();
    while (!B.step(2.5)) n++;
    out[id] = { ms: +B.ms.toFixed(0), slices: n + 1, wall: +(performance.now() - t0).toFixed(0), N: B.N, stages: B.stages };
  }
  return out;
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
