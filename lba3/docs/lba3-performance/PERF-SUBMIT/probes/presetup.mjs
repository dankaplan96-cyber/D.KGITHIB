// STABILIZATION (laptop 0.41.0: the full benchmark's first route — Low, right after the preset change from Auto — has
// a 2183 ms frame in view with "+3 geometries, +1 textures"): after a preset change, how much is left for the first
// frames that show it? The preset change's hold compiles the programs; the geometry and textures made by the change
// (vegetation, batches, …) were sent up only when first drawn. Here: the counts a fresh upload pass finds right after
// the hold — what the frames in view would otherwise upload. FROM=medium TO=low (battery as the runner on battery).
//   GAME_URL=http://localhost:8351/ BATTERY=1 FROM=medium TO=low node presetup.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const E = process.env;
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
if (E.BATTERY) await ev(() => game.setBattery(true));
await ev(() => { document.querySelector('[data-act="new"]').click(); });
await ev(() => { game.testFreeze = false; });
await page.waitForFunction(() => game.state === 'play' && !game.trans && !game.preparing && !game.gfxHold, null, { timeout: 900000 });
for (const q of [E.FROM || 'medium', E.TO || 'low', 'high', E.TO || 'low']) {
  await ev((q) => { const G = game; G.settings.quality = q; G.settings.qualityAuto = false; G.applySettings(); G.preparing = true; }, q);   // (no frame drawn until counted: the loop waits)
  await page.waitForFunction(() => !game.gfxHold, null, { timeout: 900000, polling: 500 });
  const r = await ev(() => {
    const G = game, R = G.renderer.renderer, M = R.info.memory, root = G.room?.group || G.world.root;
    const g0 = M.geometries, x0 = M.textures, t0 = performance.now();
    G._uploaded?.delete(root); const ng = G.uploadGeometry(root);
    const t1 = performance.now();
    G._texUp?.delete(root); G.uploadTextures(root);
    const t2 = performance.now();
    // (and what the whole scene would add: the sky, water, particles, people outside root)
    G._uploaded?.delete(G.scene); const ns = G.uploadGeometry(G.scene);
    G.preparing = false;
    return { q: G.settings.quality, geo: ng, tex: M.textures - x0, sceneGeo: ns, msGeo: +(t1 - t0).toFixed(0), msTex: +(t2 - t1).toFixed(0), geometries: M.geometries, textures: M.textures, programs: R.info.programs.length };
  });
  console.log(JSON.stringify(r));
}
await browser.close();
