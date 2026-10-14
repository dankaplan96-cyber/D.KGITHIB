// Segment runner for the player-input playthrough: node tests/lib/seg.mjs <segment.mjs>
// A segment module exports `steps`: [[label, pageFn(arg) → result, arg?], ...]. Each step runs as its own
// page.evaluate so progress is printed as it goes and a stuck step shows where. A step returning { fail } stops.
// env: LOAD=<storage.json> (Continue from it), KEEP=<storage.json> (Esc → Save & quit afterwards, keep the save)
import { launch, open, menu, quitAndKeep } from './boot.mjs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const seg = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const { browser, context, page, errs } = await launch({ storageState: process.env.LOAD });
await open(page, process.env.Q ?? '?nocine');
await menu(page, process.env.MENU || (process.env.LOAD ? 'continue' : 'new'));
// ASSIST=1: fights the bot is losing (2 HP left) are finished by an ISO assist, logged as 'ISO assist' (never INPUT evidence)
if (process.env.ASSIST) await page.evaluate(() => { P.assist = true; });
const t0 = Date.now();
let failed = false;
import { fileURLToPath } from 'node:url';
const HARNESS = fileURLToPath(new URL('./player.js', import.meta.url));
// game over: Retry (continue from the last save) as a player would, then the step again
const retry = async () => {
  await page.click('#gameover [data-act="retry"]', { timeout: 60000 });
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing && window.game.state !== 'gameover', null, { timeout: 300000 });
  await page.addScriptTag({ path: HARNESS });
  await page.evaluate((a) => { game.testFreeze = true; P.assist = !!a; P.settle(); }, !!process.env.ASSIST);
};
let deaths = 0;
const labels = seg.steps.map((x) => x[0]);
for (const [label, fn, arg, opt] of seg.steps) {
  const s0 = Date.now();
  try {
    let r = await page.evaluate(fn, arg);
    // a death at the end of a step: let the fall play out (game time) so the game-over screen comes up
    await page.evaluate(() => { for (let i = 0; i < 120 && game.hero.dead && game.state !== 'gameover'; i++) game.step(1 / 30); });
    for (let k = 0; k < (process.env.NORETRY ? 0 : 2) && (await page.evaluate(() => game.state)) === 'gameover'; k++) {
      deaths++; console.log(`  (died during "${label}": Retry from the last save)`); await retry();
      // the last save may be from before earlier steps of this stretch (a room's entry): play them again first
      if (opt?.retryFrom) for (const [l2, f2, a2] of seg.steps.slice(labels.indexOf(opt.retryFrom), labels.indexOf(label))) { const r2 = await page.evaluate(f2, a2); console.log(`  (again: ${l2}: ${JSON.stringify(r2)?.slice(0, 160)})`); }
      r = await page.evaluate(fn, arg);
      await page.evaluate(() => { for (let i = 0; i < 120 && game.hero.dead && game.state !== 'gameover'; i++) game.step(1 / 30); });
    }
    // every ISO assist in this step, printed (they are ISO evidence, never INPUT)
    for (const l of await page.evaluate(() => { const out = P.trace.filter((x, i) => x.includes('ISO assist') && i >= (P._assistSeen || 0)); P._assistSeen = P.trace.length; return out; })) console.log('  ' + l);
    const st = await page.evaluate(() => P.state());
    console.log(`[${((Date.now() - t0) / 1000).toFixed(0)}s +${((Date.now() - s0) / 1000).toFixed(0)}s] ${label}: ${JSON.stringify(r)?.slice(0, 400)} | ${st.room} ${JSON.stringify(st.pos)} hp ${st.hp} | ${st.obj.slice(0, 120)}`);
    if (r && r.fail) { failed = true; console.log('  STOP: ' + r.fail); break; }
  } catch (e) { failed = true; console.log(`${label}: ERROR ${e.message.split('\n')[0]}`); break; }
}
console.log('deaths (Retry):', deaths);
console.log('ISO assists:', await page.evaluate(() => P.trace.filter((l) => l.includes('ISO assist')).length), '(this page; see the trace)');
console.log((await page.evaluate(() => P.trace.slice(-12))).join('\n'));
if (process.env.SHOT) { await page.evaluate(() => game.renderer.render()); await page.screenshot({ path: process.env.SHOT }); }
if (process.env.KEEP && !failed) { await quitAndKeep(page, context, process.env.KEEP); console.log('kept', process.env.KEEP); }
console.log(errs.join('\n') || 'no errors');
await browser.close();
process.exit(failed ? 1 : 0);
