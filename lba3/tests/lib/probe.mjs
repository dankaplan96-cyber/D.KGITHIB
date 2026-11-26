// a one-off probe: node tests/lib/probe.mjs <body.js>  (SERVE=1 or GAME_URL as the tests) — boots a new game on Citadel
// and prints what the file's function body returns (it runs in the page: `game` is the game; ROOMS=a,b builds those first)
import { launch, open, menu } from './boot.mjs';
import fs from 'node:fs';
const body = fs.readFileSync(process.argv[2], 'utf8');
const { browser, page } = await launch({ width: 960, height: 540 });
await open(page, '?nocine' + (process.env.Q ? '&' + process.env.Q : ''));
await menu(page, 'new');
if (process.env.ROOMS) await page.evaluate((ids) => { for (const id of ids) game.regions.ensure(id, 'probe'); }, process.env.ROOMS.split(','));
const r = await page.evaluate(new Function('return (async () => {' + body + '})()'));
console.log(JSON.stringify(r, null, 1));
await browser.close();
