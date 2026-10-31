// PACE-SIM: a benchmark route run by the game's own bench (real frame loop), with a Chrome trace of the renderer's main
// thread around it. Writes the trace (JSON), the frame records and the bench report; analyse with tracefold.mjs.
//   GAME_URL=... ROUTE=combat Q=medium OUT=/dev/shm/x node trace.mjs
//   PRE='<js>' is evaluated in the page before the run (an A/B switch); NOTRACE=1 runs without the trace.
import { launch, open } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'combat', OUT = process.env.OUT || '/dev/shm/pacesim';
const W = +(process.env.W || 960), H = +(process.env.H || 540);
const { browser, context, page } = await launch({ width: W, height: H });
await page.addInitScript((q) => { try { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.applySettings(); game.testFreeze = false; }, Q);
await page.waitForFunction(() => !game.gfxHold && !game.preparing, null, { timeout: 600000 }).catch(() => {});
if (process.env.PRE) await ev(process.env.PRE);
// (a first run, untraced: the route's area batches and shader programs are built in it, not in the traced one)
await ev((id) => game.bench.run({ qualities: [game.settings.quality], routes: [id], breakdown: false, played: false }), ID);
const cdp = await context.newCDPSession(page);
const cats = ['toplevel', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'v8.gc', 'blink.user_timing', ...(process.env.CATS ? process.env.CATS.split(',') : [])];
const events = [];
cdp.on('Tracing.dataCollected', (d) => { for (const e of d.value) events.push(e); });
const doneP = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
if (!process.env.NOTRACE) await cdp.send('Tracing.start', { traceConfig: { includedCategories: cats, recordMode: 'recordContinuously' }, transferMode: 'ReportEvents' });
const text = await ev((id) => game.bench.run({ qualities: [game.settings.quality], routes: [id], breakdown: false, played: false }), ID);
const frames = await ev(() => game.perf.buf.map((f) => ({ end: f.end, ms: f.ms, sim: f.sim, render: f.render, lag: f.lag, why: f.why, steps: f.steps, calls: f.calls, sec: f.sec })));
if (!process.env.NOTRACE) { await cdp.send('Tracing.end'); await doneP; fs.writeFileSync(OUT + '-trace.json', JSON.stringify(events)); }
fs.writeFileSync(OUT + '-frames.json', JSON.stringify(frames));
fs.writeFileSync(OUT + '-report.txt', text || '');
console.log(text);
console.log('events', events.length);
await browser.close();
