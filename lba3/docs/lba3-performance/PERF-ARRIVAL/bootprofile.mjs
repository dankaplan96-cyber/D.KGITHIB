// PERF-ARRIVAL: where the startup's JavaScript time goes. A CPU profile (V8 sampling, CDP) of the page from navigation
// to the title screen; prints self time by function and total (inclusive) time of the area builders, and the
// game's own loadTimes. SwiftShader here: GPU-side waits show as idle / program time, not as the laptop's.
//   GAME_URL=http://localhost:8177/ QUALITY=medium node bootprofile.mjs > out.txt
import { launch, URL0 } from '../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const Q = process.env.QUALITY || 'medium';
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, Q);
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
await cdp.send('Profiler.start');
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 600000 });
const { profile } = await cdp.send('Profiler.stop');
const load = await page.evaluate(() => game.loadTimes);
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(profile));
// self time per node → per function (name + file:line)
const nodes = new Map(profile.nodes.map((n) => [n.id, n]));
const dt = new Map(); // node id → µs
for (let i = 0; i < profile.samples.length; i++) dt.set(profile.samples[i], (dt.get(profile.samples[i]) || 0) + (profile.timeDeltas[i] || 0));
const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
const key = (n) => `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.replace(/^.*\/(src|vendor)\//, '$1/')}:${n.callFrame.lineNumber + 1}`;
const self = new Map(), incl = new Map();
for (const [id, us] of dt) {
  const n = nodes.get(id); self.set(key(n), (self.get(key(n)) || 0) + us);
  const seen = new Set();
  for (let x = id; x != null; x = parent.get(x)) { const k = key(nodes.get(x)); if (seen.has(k)) continue; seen.add(k); incl.set(k, (incl.get(k) || 0) + us); }
}
const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, us]) => `${(us / 1000).toFixed(0).padStart(7)} ms  ${k}`).join('\n');
console.log('loadTimes', JSON.stringify(load));
console.log('\n--- self time ---\n' + top(self, 45));
console.log('\n--- inclusive time (src/ only) ---\n' + top(new Map([...incl].filter(([k]) => / src\//.test(k))), 70));
// CALLERS=getDataURL,getMaxAnisotropy: the src/ call paths (up to 6 frames) that spent time in those functions
for (const fn of (process.env.CALLERS || '').split(',').filter(Boolean)) {
  const paths = new Map();
  for (const [id, us] of dt) {
    let x = id, hit = false; const p = [];
    for (; x != null; x = parent.get(x)) { const n = nodes.get(x); if (n.callFrame.functionName === fn) hit = true; if (hit && / src\//.test(' ' + key(n).split(' ').slice(1).join(' '))) { p.push(key(n)); if (p.length >= 6) break; } }
    if (hit) { const k = p.join(' ← '); paths.set(k, (paths.get(k) || 0) + us); }
  }
  console.log(`\n--- who calls ${fn} ---\n` + top(paths, 15));
}
console.log('errors', JSON.stringify(errs.slice(0, 5)));
await browser.close();
