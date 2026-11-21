// PERF-SUBMIT: a runtime switch A/B in ONE page: the route driven on, blocks of BLOCK drawn frames alternating A's code
// and B's code (A B, B A, …; the first 2 frames of a block not counted). Per frame the main thread's frame() (sim +
// render) and render (renderer.render), GL drained before each. Medians per side, paired per-round differences.
//   GAME_URL=http://localhost:8351/ Q=medium BATTERY=1 ROUTE=street ROUNDS=30 BLOCK=16 A='…' B='…' [CAM=follow] node abswitch.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'street', ROUNDS = +(process.env.ROUNDS || 30), BLOCK = +(process.env.BLOCK || 16);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
await ev(async () => { window.__MW = (await import('/src/engine/drawcull.js')).MW; });
await page.waitForFunction(() => !game.gfxHold && !game.preparing, null, { timeout: 600000 }).catch(() => {});
await ev(({ id, cam, A, B }) => {
  const G = game; const route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; G.benching = true; route.setup(); G.state = 'play';
  if (cam) { G.settings.camera = cam; G.camRig.setMode(cam); G.settings.camDist = 'far'; G.applySettings(); G.camRig.cut = false; }
  window.__route = route; window.__t = 0; window.__ab = { A: new Function(A), B: new Function(B) };
  for (let i = 0; i < 300; i++) { window.__t += 1 / 60; route.drive(window.__t, 1 / 60); G.frame(1 / 60, i % 4 === 0); }
}, { id: ID, cam: process.env.CAM || '', A: process.env.A || '', B: process.env.B || '' });
const run = (side, n) => ev(({ side, n }) => {
  const G = game, R = G.renderer.renderer, gl = R.getContext(), out = [];
  window.__ab[side]();
  for (let j = 0; j < n; j++) {
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    window.__t += 1 / 60; window.__route.drive(window.__t, 1 / 60);
    G.perf.beginFrame(); G._renderMs = 0;
    const t0 = performance.now(); G.frame(1 / 60, true); out.push([performance.now() - t0, G._renderMs, R.info.render.calls]);
  }
  return out;
}, { side, n });
const med = (a) => { const v = a.slice().sort((x, y) => x - y); return v[v.length >> 1]; };
const rows = { A: [], B: [] }, diffs = [], rdiffs = [];
for (let r = 0; r < ROUNDS; r++) {
  const got = {};
  for (const s of r & 1 ? ['B', 'A'] : ['A', 'B']) { const x = (await run(s, BLOCK)).slice(2); rows[s].push(...x); got[s] = x; }
  diffs.push(med(got.B.map((x) => x[0])) - med(got.A.map((x) => x[0])));
  rdiffs.push(med(got.B.map((x) => x[1])) - med(got.A.map((x) => x[1])));
}
const line = (s) => `${s} ${process.env[s] || '(nothing)'}: frame p50 ${med(rows[s].map((x) => x[0])).toFixed(2)} · render p50 ${med(rows[s].map((x) => x[1])).toFixed(2)} · sim p50 ${med(rows[s].map((x) => x[0] - x[1])).toFixed(2)} ms · calls p50 ${med(rows[s].map((x) => x[2]))}`;
console.log(`PERF-SUBMIT A/B switch · ${Q}${process.env.BATTERY ? ' battery' : ''}${process.env.CAM ? ' cam ' + process.env.CAM : ''} · ${ID} · ${ROUNDS} rounds × ${BLOCK} frames`);
console.log(line('A')); console.log(line('B'));
console.log(`paired B − A per round: frame median ${med(diffs).toFixed(3)} ms (B faster in ${diffs.filter((d) => d < 0).length}/${diffs.length}) · render median ${med(rdiffs).toFixed(3)} ms (B faster in ${rdiffs.filter((d) => d < 0).length}/${rdiffs.length})`);
await browser.close();
