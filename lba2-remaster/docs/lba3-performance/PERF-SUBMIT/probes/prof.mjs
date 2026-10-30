// PERF-SUBMIT: where a drawn frame's main-thread time goes, function by function (V8's sampling profiler over FRAMES
// drawn frames of a benchmark route), only the samples inside Game.frame counted. With READABLE=1 three.js is served
// unminified (the same r180 release, npm's three.module.js / three.core.js, through page.route) so its functions have
// names. SwiftShader's GL work is drained (readPixels) before each frame, outside the counted part. Relative only.
//   GAME_URL=http://localhost:8351/ Q=medium BATTERY=1 ROUTE=street FRAMES=240 [CAM=follow] [READABLE=1] [TOP=60] node prof.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
import { readFileSync } from 'node:fs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'street', FR = +(process.env.FRAMES || 240), TOP = +(process.env.TOP || 60);
const { browser, page } = await launch({ width: 1366, height: 768 });
if (process.env.READABLE) {
  const D = process.env.THREE_SRC || '/dev/shm/pc3/three/package/build/';
  await page.route('**/vendor/three/build/three.module.min.js', (r) => r.fulfill({ contentType: 'text/javascript', body: readFileSync(D + 'three.module.js', 'utf8') }));
  await page.route('**/vendor/three/build/three.core.js', (r) => r.fulfill({ contentType: 'text/javascript', body: readFileSync(D + 'three.core.js', 'utf8') }));
}
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
if (process.env.OPT) await ev((code) => (0, eval)(`(async () => { ${code}; })()`), process.env.OPT);
await page.waitForFunction(() => !game.gfxHold && !game.preparing, null, { timeout: 600000 }).catch(() => {});
await ev(({ id, cam }) => {
  const G = game; const route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; G.benching = true; route.setup(); G.state = 'play';
  if (cam) { G.settings.camera = cam; G.camRig.setMode(cam); G.settings.camDist = 'far'; G.applySettings(); G.camRig.cut = false; }
  window.__route = route; window.__t = 0;
  for (let i = 0; i < 240; i++) { window.__t += 1 / 60; route.drive(window.__t, 1 / 60); G.frame(1 / 60, i % 4 === 0); }
}, { id: ID, cam: process.env.CAM || '' });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: +(process.env.INTERVAL || 100) });
await cdp.send('Profiler.start');
const ms = [];
const CH = 10;
for (let k = 0; k < FR; k += CH) {
  ms.push(...await ev((n) => {
    const G = game, R = G.renderer.renderer, gl = R.getContext(), out = [];
    for (let j = 0; j < n; j++) {
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
      window.__t += 1 / 60; window.__route.drive(window.__t, 1 / 60);
      G.perf.beginFrame();
      const t0 = performance.now(); G.frame(1 / 60, true); out.push([performance.now() - t0, R.info.render.calls]);
    }
    return out;
  }, Math.min(CH, FR - k)));
}
const { profile } = await cdp.send('Profiler.stop');
if (process.env.OUT) (await import('node:fs')).writeFileSync(process.env.OUT, JSON.stringify({ profile, frames: FR }));
// samples → stacks
const byId = new Map(); for (const n of profile.nodes) byId.set(n.id, n);
const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
const name = (n) => { const f = n.callFrame; const u = (f.url || '').replace(/^.*\/(src|vendor)\//, '$1/').replace(/^https?:\/\/[^/]+\//, ''); return `${f.functionName || '(anon)'} ${u}:${f.lineNumber + 1}`; };
const dts = profile.timeDeltas; let tot = 0; const self = new Map(), incl = new Map();
for (let i = 0; i < profile.samples.length; i++) {
  const dt = (dts[i + 1] ?? 0) / 1000; // ms (the time until the next sample)
  const stack = []; for (let id = profile.samples[i]; id != null; id = parent.get(id)) stack.push(byId.get(id));
  const fi = stack.findIndex((n) => n.callFrame.functionName === 'frame' && /main\.js/.test(n.callFrame.url));
  if (fi < 0) continue;
  tot += dt;
  const s = stack.slice(0, fi + 1);
  const k0 = name(s[0]); self.set(k0, (self.get(k0) || 0) + dt);
  const seen = new Set(); for (const n of s) { const k = name(n); if (seen.has(k)) continue; seen.add(k); incl.set(k, (incl.get(k) || 0) + dt); }
}
const pct = (a, p) => { const v = a.slice().sort((x, y) => x - y); return v[Math.min(v.length - 1, Math.floor(p * v.length))]; };
console.log(`PERF-SUBMIT profile · ${Q}${process.env.BATTERY ? ' battery' : ''}${process.env.CAM ? ' cam ' + process.env.CAM : ''} · ${ID} · ${FR} frames · frame() p50 ${pct(ms.map((x) => x[0]), 0.5).toFixed(2)} ms, mean ${(ms.reduce((s, x) => s + x[0], 0) / ms.length).toFixed(2)} · calls p50 ${pct(ms.map((x) => x[1]), 0.5)} · sampled in frame ${(tot / FR).toFixed(2)} ms/frame${process.env.READABLE ? ' · readable three' : ''}${process.env.OPT ? ' · opt ' + process.env.OPT : ''}`);
const show = (M, tag) => { console.log(`-- ${tag} (ms per frame, % of frame)`); for (const [k, v] of [...M].sort((a, b) => b[1] - a[1]).slice(0, TOP)) console.log(`  ${(v / FR).toFixed(3).padStart(7)}  ${((100 * v) / tot).toFixed(1).padStart(5)} %  ${k}`); };
show(incl, 'inclusive'); show(self, 'self');
await browser.close();
