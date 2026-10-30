// PERF-SUBMIT: a render-only switch, pixel by pixel, on the very same game state: on each route, every STEP-th drawn
// frame the state is rendered again with A's code, read back, then with B's, read back (A first, then B, then A again:
// the A/A pair shows what re-rendering alone changes). Differing pixels (> 0 and > 8 levels in any channel) per route.
//   GAME_URL=http://localhost:8351/ Q=medium BATTERY=1 ROUTES=street,combat A='game.matShare.enabled=false' B='game.matShare.enabled=true' node samepix.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ROUTES = (process.env.ROUTES || 'street,interior,combat,transition,arrival,hamalayi').split(','), FR = +(process.env.FRAMES || 60), STEP = +(process.env.STEP || 10);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
await ev(async () => { window.__MW = (await import('/src/engine/drawcull.js')).MW; });
let bad = 0;
for (const id of ROUTES) {
  const r = await ev(({ id, FR, STEP, A, B, cam }) => {
    const G = game, R = G.renderer.renderer, gl = R.getContext(), route = G.bench.routes().find((x) => x.id === id);
    const fa = new Function(A), fb = new Function(B);
    G.state = 'play'; G.benching = true; route.setup(); G.state = 'play';
    if (cam) { G.settings.camera = cam; G.camRig.setMode(cam); G.settings.camDist = 'far'; G.applySettings(); G.camRig.cut = false; }
    let t = 0;
    for (let i = 0; i < 120; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, i % 4 === 0); }
    const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
    const grab = () => { G.renderer.render(); const b = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, b); return b; };
    const cmp = (x, y) => { let n = 0, big = 0; for (let i = 0; i < x.length; i += 4) { const d = Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2])); if (d > 0) { n++; if (d > 8) big++; } } return [n, big]; };
    let shots = 0, ab = [0, 0], aa = [0, 0], worst = 0, extra = '';
    for (let i = 0; i < FR; i++) {
      t += 1 / 60; route.drive(t, 1 / 60); fb(); G.frame(1 / 60, true);
      if (i % STEP || G.trans?.hold) continue;
      fa(); const a1 = grab(); fb(); const b1 = grab(); fa(); const a2 = grab(); fb();
      const d = cmp(a1, b1), d0 = cmp(a1, a2); shots++;
      ab[0] += d[0]; ab[1] += d[1]; aa[0] += d0[0]; aa[1] += d0[1]; worst = Math.max(worst, d[0] - d0[0]);
    }
    if (G.matShare) extra = ` · bodies sharing a material in the last frame ${G.matShare.n}`;
    G.benching = false;
    return { shots, ab, aa, worst, extra };
  }, { id, FR, STEP, A: process.env.A || '', B: process.env.B || '', cam: process.env.CAM || '' });
  if (r.ab[0] > r.aa[0]) bad++;
  console.log(`${id.padEnd(11)} frames ${r.shots} · A vs B: ${r.ab[0]} pixels differ (${r.ab[1]} by > 8) · A vs A again: ${r.aa[0]} (${r.aa[1]})${r.extra}`);
}
console.log(bad ? 'VERDICT: FAIL (B draws differently from A)' : 'VERDICT: PASS (B draws the same pixels as A)');
await browser.close();
