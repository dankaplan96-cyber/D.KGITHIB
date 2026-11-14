// PERF-2: matched CPU timing of a frame (simulation G.frame without render, and render submission) on the street
// route's views, the GPU queue drained before each timed render. Prints medians over N frames per view.
//   GAME_URL=... QUALITY=low node cpu.mjs
import { launch, open } from '/home/user/geriatrics-course/.claude/worktrees/agent-aeb700a18e33d78c7/lba2-remaster/tests/lib/boot.mjs';
const quality = process.env.QUALITY || 'medium', N = +(process.env.N || 30);
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, quality);
await open(page, '?nocine');
const out = await page.evaluate(async (N) => {
  document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play');
  const G = game, R = G.renderer.renderer, gl = R.getContext(), px = new Uint8Array(4);
  const rt = G.bench.routes().find((x) => x.id === 'street'); G.state = 'play'; rt.setup(); G.state = 'play';
  let t = 0; for (let i = 0; i < 60; i++) { t += 1 / 30; rt.drive(t, 1 / 30); G.frame(1 / 30, i % 15 === 0); }
  const med = (a) => { const v = a.slice().sort((x, y) => x - y); return +v[v.length >> 1].toFixed(2); };
  const res = {};
  for (const yaw of [1.4, 2.2, 2.45]) {
    const sim = [], ren = [], calls = [];
    for (let i = 0; i < N; i++) {
      G.camRig.yaw = yaw; G.camRig.idleT = 0;
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      G.perf.beginFrame(); G._renderMs = 0;
      const t0 = performance.now(); G.frame(1 / 30, true); const t1 = performance.now();
      sim.push(t1 - t0 - G._renderMs); ren.push(G._renderMs); calls.push(R.info.render.calls);
    }
    res['yaw' + yaw] = { simMs: med(sim), renderMs: med(ren), calls: med(calls) };
  }
  return res;
}, N);
console.log(quality, JSON.stringify(out));
console.log(errs.length ? errs.slice(0, 5).join('\n') : 'no errors');
await browser.close();
