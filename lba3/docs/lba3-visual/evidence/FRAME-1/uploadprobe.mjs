// FRAME-1: the geometry upload pass (Game.uploadGeometry): what it did at load (Citadel) and at first entries
// (house, cellar, back out, Zeelich by an instant change + warm-up), its main-thread time, and that it compiled
// nothing (programs before/after). Then a short real-time door to see it inside the black hold.
//   GAME_URL=http://localhost:8171/ Q=low node uploadprobe.mjs
import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const URL0 = process.env.GAME_URL || 'http://localhost:8123/', Q = process.env.Q || 'low';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'warning' || m.type() === 'error') errs.push(m.text()); });
await page.addInitScript((q) => { try { if (!localStorage.getItem('fl_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('fl_q', q); } } catch {} }, Q);
await page.goto(URL0 + '?nocine', { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !game.preparing, null, { timeout: 900000 });
const atLoad = await page.evaluate(() => ({ log: game.uploadLog, programs: game.renderer.renderer.info.programs.length, shaders: game.loadTimes.shaders, geometries: game.renderer.renderer.info.memory.geometries }));
console.log('at load:', JSON.stringify(atLoad));
// the bytes the pass sent, and the pass again with everything already on the GPU (its own overhead: list, programs,
// bindings, zero-count draws)
console.log('repeat:', JSON.stringify(await page.evaluate(() => {
  const G = game, seen = new Set(); let bytes = 0, n = 0;
  G.world.root.traverse((o) => { const g = o.geometry; if (!g || seen.has(g) || o.isBatchedMesh) return; seen.add(g); n++; for (const k in g.attributes) bytes += g.attributes[k].array?.byteLength || 0; if (g.index) bytes += g.index.array.byteLength; });
  G._uploaded = new WeakSet(); const t0 = performance.now(); G.uploadGeometry(G.world.root); const again = performance.now() - t0;
  const gl = G.renderer.renderer.getContext(); const t1 = performance.now(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); const drain = performance.now() - t1;
  const t2 = performance.now(); G.renderer.render(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); const frame = performance.now() - t2;
  return { geometriesUnderCitadel: n, MB: +(bytes / 1048576).toFixed(1), repeatPassMs: Math.round(again), drainAfterMs: Math.round(drain), oneTitleFrameMs: Math.round(frame) };
})));
await page.evaluate(() => { game.testFreeze = true; document.querySelector('[data-act="new"]').click(); game.step(0.3); game.setState('play'); });
// real-time doors: house → cellar → house → out
for (const to of ['cellar', 'house', 'out']) {
  const r = await page.evaluate(async (to) => {
    const G = game, h = G.hero, R = G.room;
    G.testFreeze = true;
    const e = to === 'out' ? R.exits.find((x) => !x.room || x.to) || R.exits.find((x) => x.room !== 'cellar') : R.exits.find((x) => x.room === to);
    if (!e) return { to, skipped: true, exits: R.exits.map((x) => x.room) };
    h.pos.set(e.x, G.physics.groundAt(e.x, e.z, h.pos.y + 3), e.z); G.doorCool = 0;
    const p0 = G.renderer.renderer.info.programs.length, n0 = (G.uploadLog || []).length;
    G.testFreeze = false;
    const t0 = performance.now();
    await new Promise((res) => { const tick = () => { if (performance.now() - t0 < 60000 && (G.trans || performance.now() - t0 < 500)) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
    G.testFreeze = true; G.step(0.3);
    return { to, room: G.room?.id || 'citadel', uploads: (G.uploadLog || []).slice(n0), programsDuring: G.renderer.renderer.info.programs.length - p0 };
  }, to);
  console.log('door:', JSON.stringify(r));
}
console.log(errs.length ? errs.join('\n') : 'no errors');
await browser.close();
