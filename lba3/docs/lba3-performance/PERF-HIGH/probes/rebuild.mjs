// how long the shadow batches and the draw batches of Citadel take to rebuild (a cell size change)
import { launch, open } from '../../../../tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
const r = await ev(() => {
  const G = game, root = G.world.root, out = [];
  const route = G.bench.routes().find((x) => x.id === 'street'); route.setup(); G.state = 'play';
  G.frame(1 / 60, true); G.frame(1 / 60, true);
  for (const c of [16, 32, 16, 32]) {
    G.shadowCull.setCell(c); G.drawBatch.reset();
    let t0 = performance.now(); G.shadowCull.update(root, G.camera, G.hero.pos); const sc = performance.now() - t0;
    G.renderer.camera.updateMatrixWorld();
    t0 = performance.now(); G.drawBatch.update(root); const db = performance.now() - t0;
    out.push({ cell: c, shadowBatchesMs: +sc.toFixed(0), drawBatchesMs: +db.toFixed(0), proxies: G.shadowCull.area.proxies.length });
    G.frame(1 / 60, true);
  }
  return out;
});
console.log(JSON.stringify(r));
await browser.close();
