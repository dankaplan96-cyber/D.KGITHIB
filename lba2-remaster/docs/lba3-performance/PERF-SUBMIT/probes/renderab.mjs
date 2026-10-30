// PERF-SUBMIT: a render-only switch timed on one frozen game state: the route is driven to a frame, then that same
// state is rendered again and again (renderer.render(), GL drained before each), alternating A's code and B's code
// in blocks. No simulation in between: the render path's own difference, with far less noise than a moving route.
// Repeated at STATES points along the route. Mean of the middle half and median per side, per state and overall.
//   GAME_URL=http://localhost:8351/ Q=medium BATTERY=1 ROUTE=street STATES=4 ROUNDS=20 BLOCK=8 A='…' B='…' node renderab.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'street', STATES = +(process.env.STATES || 4), ROUNDS = +(process.env.ROUNDS || 20), BLOCK = +(process.env.BLOCK || 8);
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
const all = { A: [], B: [] }, per = [];
const mid = (a) => { const v = a.slice().sort((x, y) => x - y), q = v.length >> 2; const m = v.slice(q, v.length - q); return m.reduce((s, x) => s + x, 0) / m.length; };
const med = (a) => { const v = a.slice().sort((x, y) => x - y); return v[v.length >> 1]; };
for (let s = 0; s < STATES; s++) {
  await ev(() => { const G = game; for (let i = 0; i < 90; i++) { window.__t += 1 / 60; window.__route.drive(window.__t, 1 / 60); G.frame(1 / 60, i % 3 === 0); } G.frame(1 / 60, true); });
  const res = { A: [], B: [] };
  for (let r = 0; r < ROUNDS; r++) for (const side of r & 1 ? ['B', 'A'] : ['A', 'B']) {
    const x = await ev(({ side, n }) => {
      const G = game, R = G.renderer.renderer, gl = R.getContext(), out = [];
      window.__ab[side](); G.renderer.render();   // (one untimed: the switch's first frame)
      for (let j = 0; j < n; j++) { gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); const t0 = performance.now(); G.renderer.render(); out.push(performance.now() - t0); }
      return out;
    }, { side, n: BLOCK });
    res[side].push(...x); all[side].push(...x);
  }
  per.push(`state ${s + 1}: A ${mid(res.A).toFixed(3)} · B ${mid(res.B).toFixed(3)} ms (middle-half means) · B − A ${(mid(res.B) - mid(res.A)).toFixed(3)}`);
}
console.log(`PERF-SUBMIT render A/B · ${Q}${process.env.BATTERY ? ' battery' : ''} · ${ID} · ${STATES} states × ${ROUNDS} rounds × ${BLOCK} renders\nA: ${process.env.A}\nB: ${process.env.B}`);
for (const l of per) console.log('  ' + l);
console.log(`overall: A mean(mid) ${mid(all.A).toFixed(3)} median ${med(all.A).toFixed(2)} · B mean(mid) ${mid(all.B).toFixed(3)} median ${med(all.B).toFixed(2)} · B − A ${(mid(all.B) - mid(all.A)).toFixed(3)} ms`);
await browser.close();
