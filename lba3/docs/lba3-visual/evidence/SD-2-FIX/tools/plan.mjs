// node plan.mjs <names>  — the planner's numbers per island (GAME_URL)
import { launch, open } from '../../../../../tests/lib/boot.mjs';
const { browser, page, errs } = await launch({ width: 640, height: 360 });
await open(page, '?nocine');
const names = (process.argv[2] || 'celebration').split(',');
const out = await page.evaluate(async (names) => {
  const Z = await import('./src/game/zislands.js');
  return names.map((n) => { const t = performance.now(); const p = Z.planOf(n); return { n, ms: Math.round(performance.now() - t), pad: p.P.pad, spawn: p.P.spawn, seen: p.P.seen, arrival: p.P.arrivalView, lm: p.P.pois[0] && { reach: p.P.pois[0].reach, look: p.P.pois[0].look, view: p.P.pois[0].view }, items: p.P.items.length, rej: p.P.rej }; });
}, names);
for (const o of out) console.log(JSON.stringify(o));
console.log(errs.slice(0, 5).join('\n') || 'no errors');
await browser.close();
