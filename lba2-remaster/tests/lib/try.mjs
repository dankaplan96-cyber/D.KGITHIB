// scratch runner: node tests/lib/try.mjs <script.js>  (a page-side script using P; prints its JSON result)
// env: LOAD=<storage.json> starts from that browser storage (MENU=continue), KEEP=<storage.json> quits to title
// through the pause menu afterwards (saving) and keeps the storage; Q= query string; SHOT= screenshot path
import { launch, open, menu, quitAndKeep } from './boot.mjs';
import fs from 'node:fs';
const { browser, context, page, errs } = await launch({ storageState: process.env.LOAD });
await open(page, process.env.Q ?? '?nocine');
await menu(page, process.env.MENU || (process.env.LOAD ? 'continue' : 'new'));
const code = fs.readFileSync(process.argv[2], 'utf8');
const r = await page.evaluate(code);
console.log(JSON.stringify(r, null, 1));
console.log((await page.evaluate(() => P.trace.slice(-30))).join('\n'));
if (process.env.SHOT) { await page.evaluate(() => game.renderer.render()); await page.screenshot({ path: process.env.SHOT }); }
if (process.env.KEEP) { await quitAndKeep(page, context, process.env.KEEP); console.log('kept', process.env.KEEP); }
console.log(errs.join('\n') || 'no errors');
await browser.close();
