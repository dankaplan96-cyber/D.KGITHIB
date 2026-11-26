// play a segment's steps up to (not including) <stopLabel>, then evaluate <probe.js> (an expression) in the page
// node probe-seg.mjs <snapdir> <segment.mjs> <stopLabel> <probe.js> [scanMode]   env: LOAD, SHOT
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
const [snap, segf, stop, probef, mode] = process.argv.slice(2);
const { launch, open, menu } = await import(snap + '/lba3/tests/lib/boot.mjs');
const seg = await import(pathToFileURL(segf).href);
const { browser, page } = await launch({ storageState: process.env.LOAD });
await open(page, '?nocine');
await menu(page, process.env.LOAD ? 'continue' : 'new');
for (const [label, fn, arg] of seg.steps) {
  if (label === stop) break;
  const r = await page.evaluate(fn, arg);
  console.log('step', label, JSON.stringify(r)?.slice(0, 300));
}
await page.evaluate((m) => { window.__scanMode = m; }, mode || 'here');
const r = await page.evaluate(fs.readFileSync(probef, 'utf8'));
console.log('PROBE', JSON.stringify(r, null, 1));
if (process.env.SHOT) { await page.evaluate(() => game.renderer.render()); await page.screenshot({ path: process.env.SHOT }); }
await browser.close();
process.exit(0);
