// Pictures from the play camera at given spots: node spots.mjs <out-prefix> '<json list of {x,z,a,room?,y?,name}>'
// (a new game; CW.place puts him there as a load does; 2.5 s of standing, then the picture). GAME_URL as the tests.
import { launch, open, menu, done } from '/dev/shm/t983/tests/lib/boot.mjs';
import { fileURLToPath } from 'node:url';
const out = process.argv[2], spots = JSON.parse(process.argv[3]);
const { browser, page } = await launch({ width: 960, height: 540, storageState: process.env.LOAD });
await open(page, '?nocine');
await menu(page, process.env.LOAD ? 'continue' : 'new');
await page.addScriptTag({ path: '/dev/shm/t983/tests/lib/camwalk.js' });
await page.evaluate(() => CW.setup());
for (const s of spots) {
  const r = await page.evaluate((s) => { CW.place(s); game.step(s.t ?? 2.5); game.renderer.render(); const c = game.camera.position, h = game.hero.pos; return { cam: [c.x, c.y, c.z].map((v) => +v.toFixed(2)), hero: [h.x, h.y, h.z].map((v) => +v.toFixed(2)), sees: game.camRig._sees(c, h) }; }, s);
  await page.screenshot({ path: `${out}-${s.name}.png`, timeout: 180000 });
  console.log(s.name, JSON.stringify(r));
}
done();
await browser.close();
