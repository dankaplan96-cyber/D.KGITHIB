import { chromium } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/node_modules/playwright/index.mjs';
import { serve } from 'file:///C:/Users/danka/dev/D.KGITHIB/lba3/tools/testlab/engine/server.mjs';
import fs from 'node:fs';
const [OUT, ROOT] = process.argv.slice(2);
const server = await serve(ROOT);
const browser = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-angle=d3d11'] });
const page = await (await browser.newContext({ viewport: { width: 800, height: 600 } })).newPage();
await page.goto(server.url + '?wallnormals=1&nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden'), null, { timeout: 300000 });
const r = await page.evaluate(async () => { const T = await import('./src/engine/textures.js'), t = T.textures(), out = {};
  for (const n of ['fortStone', 'rubbleHouse']) { const nc = T.wallNormalCanvas(n), cc = t[n].source.data; out[n] = [cc.toDataURL(), nc.toDataURL()]; } return out; });
for (const [n, [c, nm]] of Object.entries(r)) { fs.writeFileSync(`${OUT}/${n}-colour.png`, Buffer.from(c.split(',')[1], 'base64')); fs.writeFileSync(`${OUT}/${n}-normal.png`, Buffer.from(nm.split(',')[1], 'base64')); }
console.log('written', Object.keys(r).join(','));
await browser.close(); server.close?.(); process.exit(0);
