// CH-DF: screenshots of dinofly-lookdev.html.  GAME_URL=http://localhost:8176/ node lookdev-shot.mjs <out.png> ['t=2&hero=3,4'] ...
// (several out/query pairs may follow; one browser for all)
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const URL0 = process.env.GAME_URL || 'http://localhost:8123/';
const args = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
for (let i = 0; i < args.length; i += 2) {
  const out = args[i], query = args[i + 1] || '';
  const pm = /panel=(\d+)x(\d+)/.exec(query) || [0, 480, 400];
  const page = await browser.newPage({ viewport: { width: 5 * +pm[1], height: +pm[2] } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await page.goto(URL0 + 'docs/lba3-visual/evidence/CH-DF/dinofly-lookdev.html?' + query, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.dfDone, null, { timeout: 300000 }).catch(() => {});
  const st = await page.evaluate(() => window.dfStats);
  await page.screenshot({ path: out });
  console.log(out, query, JSON.stringify(st), errs.slice(0, 5).join(' | ') || 'no errors');
  await page.close();
}
await browser.close();
