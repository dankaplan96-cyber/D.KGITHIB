import { chromium } from 'file:///C:/Users/dan/lba3/lba3/tools/testlab/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 320, height: 200 } });
await page.goto('http://127.0.0.1:8123/?nocine', { waitUntil: 'load', timeout: 180000 });
const r = await page.evaluate(async () => {
  const M = await import('/src/game/zislands.js');
  await M.preloadIslands(['platform']); const o = M.planOf('platform');
  const L = o.L, A = o.A, { nx, cell } = L, w = (nx - 1) * cell;
  const cellOf = (x, z) => { const i = Math.round((x + w / 2) / cell), j = Math.round((z + w / 2) / cell), k = j * nx + i; return (A.comp[k] === A.main ? 'M' : 'x') + (A.H[k]?.toFixed(1)); };
  const dec = L.decor.filter(([x, z]) => x > 22 && z > 18).map(([x, z, y, sx, sy, sz, b, kind]) => [kind, +x.toFixed(1), +z.toFixed(1), +sx.toFixed(1), +sz.toFixed(1), +(b ?? 0).toFixed(2)]);
  const grid = []; for (let z = 22; z <= 34; z += 1.5) { let s = z + ': '; for (let x = 26; x <= 44; x += 1.5) s += cellOf(x, z) + ' '; grid.push(s); }
  return { dec, grid };
});
console.log(JSON.stringify(r.dec)); console.log(r.grid.join('\n'));
await browser.close();
