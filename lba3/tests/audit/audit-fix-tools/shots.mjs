// Continue from a save and take pictures from the play camera after t seconds of standing: node shots.mjs <out-prefix>
// env LOAD=<storage.json>; TIMES=0.5,1.5,3,6
import { launch, open, menu, done } from '/dev/shm/t983/tests/lib/boot.mjs';
const out = process.argv[2];
const { browser, page } = await launch({ storageState: process.env.LOAD });
await open(page, '?nocine');
await menu(page, 'continue');
let t0 = 0;
for (const t of (process.env.TIMES || '0.5,1.5,3,6').split(',').map(Number)) {
  const r = await page.evaluate((dt) => { game.step(dt); game.renderer.render(); const c = game.camera.position, h = game.hero.pos; return { cam: [c.x, c.y, c.z].map((v) => +v.toFixed(2)), hero: [h.x, h.y, h.z].map((v) => +v.toFixed(2)), sees: game.camRig._sees(c, h), soft: game.camRig._softOn, sil: !!game.hero.rig.silhouette && game.hero.rig.silhouette.visible !== false }; }, t - t0);
  t0 = t;
  await page.screenshot({ path: `${out}-${t}s.png`, timeout: 180000 });
  console.log(t, JSON.stringify(r));
}
done();
await browser.close();
