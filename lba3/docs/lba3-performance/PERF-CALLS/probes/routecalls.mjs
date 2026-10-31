// PERF-CALLS: a benchmark route as the benchmark drives it (60 Hz steps, every step drawn), draw calls per drawn frame
// (all passes, as the benchmark counts them: renderer.info with autoReset off, reset per frame), the shadow pass's
// share, triangles and the frame's main-thread work, per area and overall. Relative CPU only (SwiftShader).
//   GAME_URL=http://localhost:8321/ Q=medium BATTERY=1 ROUTE=arrival FRAMES=760 [OPT='js'] [CAM=follow] node routecalls.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'arrival', FR = +(process.env.FRAMES || 760), WARM = +(process.env.WARM ?? 60);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine' + (process.env.QS || ''));
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => { game.setBattery(true); });
if (process.env.OPT) await ev((code) => (0, eval)(`(async () => { ${code}; })()`), process.env.OPT);
await page.waitForFunction(() => !game.gfxHold && !game.preparing, null, { timeout: 600000 }).catch(() => {});
await ev(({ id, cam, warm }) => {
  const G = game; const route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; G.benching = true; route.setup(); G.state = 'play';
  if (cam) { G.settings.camera = cam; G.camRig.setMode(cam); G.settings.camDist = 'far'; G.applySettings(); G.camRig.cut = false; }
  window.__route = route; window.__t = 0;
  for (let i = 0; i < warm; i++) { window.__t += 1 / 60; route.drive(window.__t, 1 / 60); G.frame(1 / 60, true); }
}, { id: ID, cam: process.env.CAM || '', warm: WARM });
const rows = [];
const CH = 20;
for (let k = 0; k < FR; k += CH) {
  const part = await ev((n) => {
    const G = game, R = G.renderer.renderer, out = [];
    for (let j = 0; j < n; j++) {
      window.__t += 1 / 60; window.__route.drive(window.__t, 1 / 60);
      G.perf.beginFrame(); const r0 = R.info.render.calls;
      const t0 = performance.now(); G.frame(1 / 60, true); const all = performance.now() - t0;
      out.push({ all, calls: R.info.render.calls, sh: G.perf.shadow, tris: R.info.render.triangles, room: G.room?.id || 'citadel', trans: !!G.trans, drawn: R.info.render.calls > 0 });
    }
    return out;
  }, Math.min(CH, FR - k));
  rows.push(...part);
}
const pct = (a, p) => { const v = a.slice().sort((x, y) => x - y); return v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : NaN; };
const line = (tag, R) => console.log(`${tag.padEnd(10)} frames ${String(R.length).padStart(4)} · calls p50 ${pct(R.map((r) => r.calls), 0.5)} p95 ${pct(R.map((r) => r.calls), 0.95)} max ${pct(R.map((r) => r.calls), 1)} · shadow p50 ${pct(R.map((r) => r.sh), 0.5)} p95 ${pct(R.map((r) => r.sh), 0.95)} · tris p50 ${(pct(R.map((r) => r.tris), 0.5) / 1000).toFixed(0)}k · work p50 ${pct(R.map((r) => r.all), 0.5).toFixed(1)} p95 ${pct(R.map((r) => r.all), 0.95).toFixed(1)} ms`);
const drawn = rows.filter((r) => r.drawn);
console.log(`PERF-CALLS route · ${Q}${process.env.BATTERY ? ' battery' : ''} · ${ID} · ${FR} steps${process.env.OPT ? ' · opt ' + process.env.OPT : ''}${process.env.QS ? ' · qs ' + process.env.QS : ''}`);
line('all drawn', drawn);
for (const room of [...new Set(drawn.map((r) => r.room))]) line(room, drawn.filter((r) => r.room === room));
if (process.env.SERIES) console.log('series', drawn.map((r) => `${r.room[0]}${r.calls}/${r.sh}`).join(' '));
await browser.close();
