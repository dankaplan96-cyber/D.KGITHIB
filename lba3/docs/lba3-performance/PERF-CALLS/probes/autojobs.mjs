// PERF-CALLS: the Auto benchmark ("as played") on a fresh start, real-time loop (not fixed stepping): every frame in
// its routes whose previous frame ran a job (a batch build, a shadow-cache rebuild, a compile, an upload, Auto's step,
// a GC), with the job and whether the screen was black. On SwiftShader every frame is long; the jobs are what count.
//   GAME_URL=http://localhost:8321/ Q=medium BATTERY=1 ROUTES=street,arrival MEASURE=8 node autojobs.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ROUTES = (process.env.ROUTES || 'street').split(','), MEAS = +(process.env.MEASURE || 8);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
page.on('console', (m) => { if (/benchmark|every frame over|route /.test(m.text())) console.log('PAGE', m.text().slice(0, 4000)); });
await open(page, '?nocine' + (process.env.QS || ''), { freeze: false });
await ev(() => { document.querySelector('[data-act="new"]').click(); });
await page.waitForTimeout(3000);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
await ev(() => { const B = game.perf.buf; window.__rec = []; const rec = game.perf.record.bind(game.perf); game.perf.record = (f) => { if (f.why && /built|rebuilt|compiled|geometries|upload|Auto|GC/.test(f.why)) window.__rec.push({ t: performance.now(), ms: Math.round(f.ms), black: f.black, why: f.why, room: game.room?.id || 'citadel', st: game.state }); return rec(f); }; });
const text = await ev(({ routes, meas }) => game.bench.runAuto({ routes, force: true, measure: meas }), { routes: ROUTES, meas: MEAS });
const rec = await ev(() => window.__rec);
console.log(text);
console.log('--- frames after a job (ms · black · where · what) ---');
for (const r of rec) console.log(`${(r.t / 1000).toFixed(1)}s ${String(r.ms).padStart(5)} ms ${r.black ? 'BLACK' : 'view '} ${r.room} ${r.st} · ${r.why}`);
await browser.close();
