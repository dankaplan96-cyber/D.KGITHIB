// GATE-1 probe runner: plays a segment's steps up to (not including) <stopLabel>, then evaluates <probe.js> in the page
// and prints its JSON. node probe-seg.mjs <segment.mjs> <stopLabel> <probe.js>   env: LOAD=<storage.json>, SHOT=<png>
import { launch, open, menu } from '/dev/shm/gate1/lba3/tests/lib/boot.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const seg = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const { browser, page } = await launch({ storageState: process.env.LOAD });
await open(page, process.env.Q ?? '?nocine');
await menu(page, process.env.LOAD ? 'continue' : 'new');
for (const [label, fn, arg] of seg.steps) {
  if (label === process.argv[3]) break;
  const r = await page.evaluate(fn, arg);
  console.log('step', label, JSON.stringify(r)?.slice(0, 200));
}
const r = await page.evaluate(fs.readFileSync(process.argv[4], 'utf8'));
console.log('PROBE', JSON.stringify(r, null, 1));
if (process.env.SHOT) { await page.evaluate(() => game.renderer.render()); await page.screenshot({ path: process.env.SHOT }); }
await browser.close();
process.exit(0);
