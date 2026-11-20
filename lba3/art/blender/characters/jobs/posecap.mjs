// node posecap.mjs <outdir> <look> [candidate.json] — the game's own character code (lookdev.html), whole body in frame:
// idle, walk, run, turnL, jump, fall, throwQuick, heavy, talk, pickup, use, hurt, doze, each side and 3/4 (SwiftShader).
import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'file:///C:/Users/dan/lba3/lba3/tools/testlab/node_modules/playwright/index.mjs';
const [OUT, LOOK, CAND] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://127.0.0.1:8257/';
const browser = await chromium.launch({ ...(process.env.SHELL_EXE ? { executablePath: process.env.SHELL_EXE } : {}), args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 640, height: 640 } });
if (CAND) await ctx.route(`**/assets/poly/${LOOK}.json`, (r) => r.fulfill({ path: CAND, contentType: 'application/json' }));
const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
const P = [['idle', 1.0], ['walk', 0.37], ['run', 0.21], ['turnL', 0.25], ['jump', 0.25], ['fall', 0.3], ['throwQuick', 0.22], ['heavy', 0.3], ['talk', 0.7], ['pickup', 0.45], ['use', 0.5], ['hurt', 0.08], ['doze', 1.5]];
for (const [a, t] of P) for (const [vn, cyaw] of [["side", 1.5708], ["34", 0.7]]) {
  await page.goto(`${BASE}lookdev.html?c=${LOOK}&views=${cyaw}&anim=${a}&t=${t}&light=outdoor&labels=0&grid=0&props=0&dist=5.6&cy=1.05`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.lookdev && window.lookdev.rigs?.length, null, { timeout: 300000 });
  await page.evaluate(() => { for (let i = 0; i < 3; i++) window.lookdev.render(1 / 60); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(OUT, `${a}-${vn}.png`) });
}
console.log(LOOK, 'poses', P.length * 2, 'errors', errs.length, errs.slice(0, 3));
await browser.close();
