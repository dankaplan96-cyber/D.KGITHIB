// Segment runner for the player-input playthrough: node tests/lib/seg.mjs <segment.mjs>
// A segment module exports `steps`: [[label, pageFn(arg) → result, arg?], ...]. Each step runs as its own
// page.evaluate so progress is printed as it goes and a stuck step shows where. A step returning { fail } stops.
// env: LOAD=<storage.json> (Continue from it), KEEP=<storage.json> (Esc → Save & quit afterwards, keep the save)
import { launch, open, menu, quitAndKeep, checker } from './boot.mjs';
const { check, done } = checker();
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const seg = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const { browser, context, page, errs } = await launch({ storageState: process.env.LOAD });
await open(page, process.env.Q ?? '?nocine');
await menu(page, process.env.MENU || (process.env.LOAD ? 'continue' : 'new'));
// ASSIST=1: fights the bot is losing (2 HP left) are finished by an ISO assist, logged as 'ISO assist' (never INPUT evidence)
if (process.env.ASSIST) await page.evaluate(() => { P.assist = true; });
// the bot plays its fights as a player would (P.smart: dodges a close wind-up, takes a dropped heart or flask when it needs
// one, kicks armour its ball can't hurt, walks round a fence its ball can't pass); OLDBOT=1: the bot of before (COMBAT-2)
const SMART = !process.env.OLDBOT;
await page.evaluate((s) => { P.smart = s; }, SMART);
// STATS=<file.json>: game time per state, dialogue words, walked metres, health lost, per step (tests/lib/stats.js; watches only)
const STATS_JS = fileURLToPath(new URL('./stats.js', import.meta.url));
const statSteps = [], statBase = [];   // (statBase: the totals of pages a Retry reloaded away)
const statAdd = (a, b) => { const o = { ...a }; for (const k in b) if (typeof b[k] === 'number' && k !== 'rooms' && !k.endsWith('Now')) o[k] = +((o[k] || 0) + b[k]).toFixed(1); return o; };
const statNow = async () => { const s = await page.evaluate(() => window.STATS?.snap()); return statBase.reduce(statAdd, s || {}); };
if (process.env.STATS) await page.addScriptTag({ path: STATS_JS });
// FIGHTLOG=1: health lost by source, attacks and openings per minute, time to beat each enemy, per step (tests/lib/fightlog.js; watches only)
const FIGHT_JS = fileURLToPath(new URL('./fightlog.js', import.meta.url));
if (process.env.FIGHTLOG) await page.addScriptTag({ path: FIGHT_JS });
const t0 = Date.now();
let failed = false, stop = null;
const HARNESS = fileURLToPath(new URL('./player.js', import.meta.url));
// game over: Retry (continue from the last save) as a player would, then the step again
const retry = async () => {
  if (process.env.STATS) statBase.push(await page.evaluate(() => window.STATS?.snap()) || {});
  // (Retry reloads the page half a second later: the click must not wait on that navigation — a slow reload of a
  // big save ran past the click's own timeout — the wait below covers the loading)
  await Promise.all([page.waitForNavigation({ waitUntil: 'load', timeout: 300000 }), page.click('#gameover [data-act="retry"]', { timeout: 60000, noWaitAfter: true })]);
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing && window.game.state !== 'gameover', null, { timeout: 300000 });
  await page.addScriptTag({ path: HARNESS });
  if (process.env.STATS) await page.addScriptTag({ path: STATS_JS });
  if (process.env.FIGHTLOG) await page.addScriptTag({ path: FIGHT_JS });
  await page.evaluate((a) => { game.testFreeze = true; P.assist = !!a.assist; P.smart = a.smart; P.settle(); }, { assist: !!process.env.ASSIST, smart: SMART });
};
let deaths = 0, shotN = 0;
if (process.env.SHOTS) { (await import('node:fs')).mkdirSync(process.env.SHOTS, { recursive: true });
  // (OVERFLOW: P.settle measures each dialogue line and the objective as it is shown, tests/lib/player.js P.fits)
 }
const labels = seg.steps.map((x) => x[0]);
for (const [label, fn, arg, opt] of seg.steps) {
  const s0 = Date.now();
  const st0 = process.env.STATS ? await statNow() : null;
  const fl0 = process.env.FIGHTLOG ? await page.evaluate(() => window.FIGHTLOG?.snap()) : null;
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
    if (fl0) { const fl = await page.evaluate((s) => window.FIGHTLOG && window.FIGHTLOG.since(s), fl0).catch(() => null); if (fl && (fl.fightS > 0 || fl.lost > 0)) { const { hits, ...sum } = fl; console.log('  fight: ' + JSON.stringify(sum)); if (hits.length) console.log('  hits: ' + hits.map((x) => `${x.t}s ${x.src} -${x.lost} →${x.hp}${x.clover ? ' CLOVER' : ''} busy${x.busy} near${x.near}`).join(' | ')); } }
    if (st0) { const st1 = await statNow(); const d = {}; for (const k in st1) if (typeof st1[k] === 'number') d[k] = k.endsWith('Now') ? st1[k] : +((st1[k] - (st0[k] || 0))).toFixed(1); statSteps.push({ label, ...d }); console.log('  stats: ' + JSON.stringify(d)); }
    // SHOTS=<dir>: a picture after each step from the play camera (the player's view: the HUD, objective, prompt), for a
    // person to look at; and a census of text boxes that overflow (dialogue lines, the objective, the prompt: OVERFLOW)
    if (process.env.SHOTS) {
      const nm = `${String(++shotN).padStart(2, '0')}-${label.replace(/[^a-z0-9]+/gi, '-').slice(0, 48)}${r && r.fail ? '-FAIL' : ''}.png`;
      await page.evaluate(() => { game.renderer.render(); }).catch(() => {});
      await page.screenshot({ path: path.join(process.env.SHOTS, nm), timeout: 180000 }).catch((e) => console.log('  shot failed: ' + e.message.split('\n')[0]));
      const ov = await page.evaluate(() => (window.__overflow || []).splice(0)).catch(() => []);
      for (const o of ov) console.log('  OVERFLOW ' + o);
    }
    if (r && r.fail) { failed = true; stop = `${label}: ${r.fail}`; console.log('  STOP: ' + r.fail); break; }
  } catch (e) { failed = true; stop = `${label}: ERROR ${e.message.split('\n')[0]}`; console.log(stop); break; }
}
check('the segment ran every step to its end', !failed, stop);
console.log('deaths (Retry):', deaths);
console.log('ISO assists:', await page.evaluate(() => P.trace.filter((l) => l.includes('ISO assist')).length), '(this page; see the trace)');
console.log((await page.evaluate(() => P.trace.slice(-12))).join('\n'));
// TRACE=<file>: the whole trace of this page, written there (for finding why a step stopped)
if (process.env.TRACE) (await import('node:fs')).writeFileSync(process.env.TRACE, (await page.evaluate(() => P.trace)).join('\n'));
if (process.env.STATS) { const tot = await statNow(); console.log('stats total: ' + JSON.stringify(tot)); (await import('node:fs')).writeFileSync(process.env.STATS, JSON.stringify({ segment: process.argv[2], deaths, total: tot, steps: statSteps }, null, 1)); }
if (process.env.SHOT) { await page.evaluate(() => game.renderer.render()); await page.screenshot({ path: process.env.SHOT }); }
if (process.env.KEEP && !failed) { await quitAndKeep(page, context, process.env.KEEP); console.log('kept', process.env.KEEP); }
const fails = done();
await browser.close();
process.exit(fails ? 1 : 0);
