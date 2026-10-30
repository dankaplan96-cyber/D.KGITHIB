// JS CPU profile of drawn frames on a route: self time by function (renderer process only; the GL work of
// SwiftShader runs in the GPU process and is excluded by draining it with readPixels before each timed frame).
// GAME_URL=... Q=medium BATTERY=1 CAM=follow ROUTE=street FRAMES=40 node profile.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'street', FR = +(process.env.FRAMES || 40);
const { browser, context, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => { game.setBattery(true); });
await page.waitForFunction(() => !game.gfxHold && !game.preparing, null, { timeout: 600000 }).catch(() => {});
await ev(({ id, cam }) => {
  const G = game; const route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; route.setup(); G.state = 'play';
  if (cam) { G.settings.camera = cam; G.camRig.setMode(cam); G.settings.camDist = 'far'; G.applySettings(); G.camRig.cut = false; }
  window.__route = route; window.__t = 0;
  for (let i = 0; i < 45; i++) { window.__t += 1 / 30; route.drive(window.__t, 1 / 30); G.frame(1 / 30, i % 8 === 0); }
}, { id: ID, cam: process.env.CAM || '' });
const cdp = await context.newCDPSession(page);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
const times = [];
await cdp.send('Profiler.start');
for (let k = 0; k < FR; k++) {
  const r = await ev(() => {
    const G = game, R = G.renderer.renderer, gl = R.getContext();
    // 3 undrawn sim steps then one drawn, as 30 fps sim drawn at ~7.5 Hz
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    window.__t += 1 / 15; window.__route.drive(window.__t, 1 / 15);
    G.perf.beginFrame(); G._renderMs = 0;
    const t0 = performance.now(); G.frame(1 / 60, true); const all = performance.now() - t0;
    return { all, render: G._renderMs, calls: R.info.render.calls };
  });
  times.push(r);
}
const { profile } = await cdp.send('Profiler.stop');
const self = new Map(), byId = new Map(profile.nodes.map((n) => [n.id, n]));
const dt = profile.timeDeltas; const counts = new Map();
for (let i = 0; i < profile.samples.length; i++) counts.set(profile.samples[i], (counts.get(profile.samples[i]) || 0) + (dt[i] || 0));
for (const [id, us] of counts) { const n = byId.get(id); const f = n.callFrame; const k = `${f.functionName || '(anon)'} ${f.url.split('/').slice(-1)[0]}:${f.lineNumber}`; self.set(k, (self.get(k) || 0) + us); }
// inclusive time per function: walk parents
const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
const incl = new Map();
for (const [id, us] of counts) { const seen = new Set(); for (let x = id; x != null; x = parent.get(x)) { const f = byId.get(x).callFrame; const k = `${f.functionName || '(anon)'} ${f.url.split('/').slice(-1)[0]}:${f.lineNumber}`; if (seen.has(k)) continue; seen.add(k); incl.set(k, (incl.get(k) || 0) + us); } }
const total = [...counts.values()].reduce((a, b) => a + b, 0);
const med = (k) => { const v = times.map((x) => x[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
console.log(`frames ${FR} · drawn frame median: all ${med('all').toFixed(1)} ms, render ${med('render').toFixed(1)} ms, calls ${med('calls')} · profile total ${(total / 1000).toFixed(0)} ms`);
console.log('--- self (ms per drawn frame)');
for (const [k, us] of [...self].sort((a, b) => b[1] - a[1]).slice(0, 45)) console.log((us / 1000 / FR).toFixed(2).padStart(7), k);
console.log('--- inclusive');
for (const [k, us] of [...incl].sort((a, b) => b[1] - a[1]).slice(0, 70)) console.log((us / 1000 / FR).toFixed(2).padStart(7), k);
await browser.close();
