// run the in-game benchmark (a short plan) and print its report
import { launch, open } from '../../../../tests/lib/boot.mjs';
const { browser, page } = await launch({ width: 1366, height: 768 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine', { freeze: false });
await ev(() => { document.querySelector('[data-act="new"]').click(); });
await page.waitForTimeout(2000);
import fs from 'node:fs';
const opts = JSON.parse(process.env.OPTSFILE ? fs.readFileSync(process.env.OPTSFILE, 'utf8') : '{"routes":["interior"],"breakdown":false,"played":false}');
const Q = (process.env.QS || 'low').split(',');
const text = await ev(async ({ Q, opts }) => { game.testFreeze = false; return await game.bench.run(Q, opts); }, { Q, opts });
console.log(text);
await browser.close();
