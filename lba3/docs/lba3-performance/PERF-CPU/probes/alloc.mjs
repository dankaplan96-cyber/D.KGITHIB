// PERF-CPU: what the game allocates per drawn frame on a route (garbage the collector must clear: minor GCs every few
// frames, each 1–3 ms on a battery-clocked processor). CDP's sampling heap profiler over FRAMES frames; bytes per frame
// by allocating function (self). GAME_URL=http://localhost:8214/ ROUTE=combat Q=low FRAMES=120 node alloc.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'low', ID = process.env.ROUTE || 'street', FR = +(process.env.FRAMES || 120);
const { browser, context, page } = await launch({ width: 960, height: 540 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => { game.setBattery(true); });
if (process.env.OPT) await ev((code) => (0, eval)(`(async () => { ${code}; })()`), process.env.OPT);
await page.waitForFunction(() => !game.gfxHold && !game.preparing, null, { timeout: 600000 }).catch(() => {});
await ev((id) => {
  const G = game, route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; route.setup(); G.state = 'play';
  window.__route = route; window.__t = 0;
  for (let i = 0; i < 180; i++) { window.__t += 1 / 60; route.drive(window.__t, 1 / 60); G.frame(1 / 60, i % 3 === 0); }
}, ID);
const cdp = await context.newCDPSession(page);
await cdp.send('HeapProfiler.enable');
await cdp.send('HeapProfiler.startSampling', { samplingInterval: 1024, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
await ev((n) => { const G = game; for (let i = 0; i < n; i++) { window.__t += 1 / 60; window.__route.drive(window.__t, 1 / 60); G.frame(1 / 60, true); } }, FR);
const { profile } = await cdp.send('HeapProfiler.stopSampling');
const self = new Map(); let total = 0;
// (a builtin's allocation — an iterator's next(), Math.hypot's arguments, a spread — is put on the game's function
//  that called it: "next ← update camera.js:420")
const walk = (n, parent) => {
  const f = n.callFrame, me = `${f.functionName || '(anon)'} ${f.url.split('/').slice(-1)[0]}:${f.lineNumber + 1}`;
  const k = f.url ? me : `${f.functionName || '(builtin)'} ← ${parent}`;
  if (n.selfSize) { self.set(k, (self.get(k) || 0) + n.selfSize); total += n.selfSize; }
  for (const c of n.children || []) walk(c, f.url ? me : parent);
};
walk(profile.head, '(root)');
console.log(`PERF-CPU alloc · ${Q} · ${ID} · ${FR} drawn frames: ${(total / FR / 1024).toFixed(1)} KB a frame (sampled)`);
for (const [k, b] of [...self].sort((a, b) => b[1] - a[1]).slice(0, +(process.env.TOP || 40))) console.log((b / FR / 1024).toFixed(2).padStart(8), 'KB', k);
await browser.close();
