import { chromium } from 'file:///C:/Users/dan/lba3/lba3/tools/testlab/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 320, height: 200 } });
await page.goto('http://127.0.0.1:8123/?nocine', { waitUntil: 'domcontentloaded', timeout: 180000 });
const r = await page.evaluate(async () => {
  const M = await import('/src/game/zislands.js'); globalThis.__NEARDBG = [];
  const o = M.planOf('platform');
  return { dbg: globalThis.__NEARDBG, items: o.P.items.filter((i) => /mine|lift|board|bell/.test(i.kind)).map((i) => [i.kind, i.x, i.z, i.ry]) };
});
console.log(JSON.stringify(r));
await browser.close();
