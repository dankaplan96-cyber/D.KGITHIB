import { chromium } from 'file:///C:/Users/dan/lba3/lba3/tools/testlab/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
await page.goto('http://127.0.0.1:8123/?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 240000 });
await page.evaluate(() => { localStorage.clear(); game.testFreeze = true; });
await page.click('[data-act="new"]', { timeout: 180000 });
const r = await page.evaluate(async () => {
  const G = game; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  G.enterRoom('isle_otringal', null, true, true); G.step(1);
  const { FIT } = await import('/src/game/worldfit.js');
  const R = G.room, c = R.center || {};
  const houses = FIT.filter((b) => b.region === 'isle_otringal').map((b) => ({ n: b.name, x: +b.x.toFixed(1), z: +b.z.toFixed(1), ry: +b.ry.toFixed(2), w: +b.w.toFixed(1), d: +b.d.toFixed(1), y: +b.oy.toFixed(1), door: b.door }));
  return { center: c, spawn: R.spawn, pad: R.pad, houses };
});
console.log(JSON.stringify(r, null, 0));
await browser.close();
