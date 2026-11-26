// ROTATE-STALL (A): what runs in a long setTimeout task around the benchmark's first street frames. A fresh game (New
// Game, the house's opening, then play), Medium on battery as the laptop ran it (desktop.onBattery), then the given
// benchmark call exactly as the pause menu makes it (default: game.bench.runAuto({ routes: ['street'] })), the game's own
// loop running (no fixed stepping). Every setTimeout callback (and every rAF callback) is timed; one over LONG ms is
// listed with where it was scheduled (its stack at setTimeout) and the CPU profile's samples inside it (inclusive time
// per function, top TOP). Also printed: the benchmark's report (its hitch list with the long-animation-frame notes).
//   GAME_URL=http://localhost:8641/ TMPDIR=/dev/shm CALL="game.bench.runAuto({routes:['street']})" node timers.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const LONG = +(process.env.LONG || 150), TOP = +(process.env.TOP || 25);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qualityAuto: false, qualityChosenByHand: true, qv: 4, v: 2, res: 'auto', aa: 'msaa', fps: 'auto' })); } catch {} }, process.env.Q || 'medium');
await page.addInitScript((b) => { window.desktop = { onBattery: b === '1', onPower() {} }; }, process.env.BATTERY ?? '1');
await page.addInitScript((LONG) => {
  // every timer / frame callback timed; a long one kept with the stack that scheduled it
  const W = window, st = W.setTimeout.bind(W), raf = W.requestAnimationFrame.bind(W);
  W.__long = [];
  const wrapCb = (kind, fn, stack) => function (...a) {
    const t0 = performance.now();
    try { return fn.apply(this, a); } finally { const d = performance.now() - t0; if (d > LONG) W.__long.push({ kind, t0, d, stack }); }
  };
  W.setTimeout = (fn, ms, ...a) => (typeof fn === 'function' ? st(wrapCb('setTimeout', fn, (new Error().stack || '').split('\n').slice(2, 9).map((l) => l.trim()).join(' < ')), ms, ...a) : st(fn, ms, ...a));
  W.requestAnimationFrame = (fn) => raf(wrapCb('rAF', fn, ''));
}, LONG);
page.on('crash', () => console.log('PAGE CRASHED')); browser.on?.('disconnected', () => console.log('BROWSER DISCONNECTED'));
page.on('console', (m) => { if (/^(DBG|PROBE)/.test(m.text())) console.log(m.text()); });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); });
// (the opening plays in the house; give it a few seconds of real frames, as a player who opens the menu soon after)
await page.waitForTimeout(+(process.env.PLAY_MS || 6000));
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
const pT0 = await ev(() => performance.now());
const call = process.env.CALL || "game.bench.runAuto({ routes: ['street'] })";
const report = await ev((c) => { window.__long.length = 0; return (0, eval)(c); }, call);
const { profile } = await cdp.send('Profiler.stop');
const long = await ev(() => window.__long);
// map the profile's samples to page time: profile.startTime is µs on the same clock as the page's timeOrigin-based now
const origin = await ev(() => performance.timeOrigin);
const byId = new Map(profile.nodes.map((n) => [n.id, n])), parent = new Map();
for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
const name = (cf) => `${cf.functionName || '(anon)'} ${cf.url.replace(/^.*\/(src|vendor)\//, '$1/')}:${cf.lineNumber + 1}`;
let ts = profile.startTime; const samples = [];
for (let i = 0; i < profile.samples.length; i++) { ts += profile.timeDeltas[i]; samples.push([ts / 1000, profile.samples[i], (profile.timeDeltas[i + 1] || 0) / 1000]); }
// (the profile's clock: CDP's monotonic µs; the page's performance.now() + timeOrigin is wall-clock ms. Align by the
//  first sample ≈ pT0, the profiler having started just before the call)
const off = samples.length ? samples[0][0] - pT0 : 0;
console.log(`CALL ${call}\nlong callbacks (> ${LONG} ms): ${long.length}`);
for (const L of long.sort((a, b) => a.t0 - b.t0)) {
  console.log(`\n== ${L.kind} at ${(L.t0 / 1000).toFixed(2)} s, ${L.d.toFixed(0)} ms; scheduled from: ${L.stack || '(rAF)'}`);
  const incl = new Map(), self = new Map(); let tot = 0;
  for (const [t, id, dt] of samples) {
    const pt = t - off; if (pt < L.t0 || pt > L.t0 + L.d) continue;
    tot += dt; const seen = new Set();
    self.set(name(byId.get(id).callFrame), (self.get(name(byId.get(id).callFrame)) || 0) + dt);
    for (let k = id; k != null; k = parent.get(k)) { const nm = name(byId.get(k).callFrame); if (!seen.has(nm)) { seen.add(nm); incl.set(nm, (incl.get(nm) || 0) + dt); } }
  }
  console.log(`  sampled ${tot.toFixed(0)} ms. inclusive:`);
  for (const [k, v] of [...incl].sort((a, b) => b[1] - a[1]).slice(0, TOP)) console.log(`  ${v.toFixed(0).padStart(6)} ms  ${k}`);
  console.log('  self:');
  for (const [k, v] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`  ${v.toFixed(0).padStart(6)} ms  ${k}`);
}
console.log('\n' + (typeof report === 'string' ? report : JSON.stringify(report)).split('\n').filter((l) => /street|hitch|frame|>|over|stall|ms/i.test(l)).slice(0, 40).join('\n'));
void origin;
await browser.close();
