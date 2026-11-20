// STABILIZATION experiment: who reads the world matrices of people left out of the view between two renders? FarCull's
// restore() brings every out-of-view person's parts up to date after each render (drawcull.js: 0.7 ms a frame on the
// street with the Follow camera, this machine) because "the game reads their parts' world matrices before the next
// frame's render". Here, after each render, every part of those people gets a counting getter on its matrixWorld until
// the next render starts; reads outside the render are counted with where they came from (a stack line). None: the
// update could wait until a part is shown or asked for.
//   GAME_URL=http://localhost:8351/ Q=medium BATTERY=1 ROUTES=street,combat,arrival CAM=follow FRAMES=300 node farread.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ROUTES = (process.env.ROUTES || 'street,combat,arrival').split(','), FR = +(process.env.FRAMES || 300);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
for (const id of ROUTES) {
  const r = await ev(({ id, cam, FR }) => {
    const G = game, FC = G.farCull, R = G.renderer, route = G.bench.routes().find((x) => x.id === id);
    G.bench.setCamera(cam); G.state = 'play'; route.setup(); G.state = 'play';
    let t = 0; for (let i = 0; i < 120; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, i % 3 === 0); }
    const armed = [], where = new Map(); let reads = 0, inRender = false, parts = 0, rigs = 0;
    const disarm = () => { for (const o of armed) { const m = o.__mwSave; delete o.matrixWorld; o.matrixWorld = m; delete o.__mwSave; } armed.length = 0; };
    const rr = R.render.bind(R); R.render = () => { disarm(); inRender = true; try { return rr(); } finally { inRender = false; } };
    const restore = FC.restore.bind(FC);
    FC.restore = function () {
      const off = (this.offView || []).slice();
      restore();
      rigs += off.length;
      for (const r of off) r.traverse((o) => { if (o === r) return; parts++; const m = o.matrixWorld; o.__mwSave = m; armed.push(o);
        Object.defineProperty(o, 'matrixWorld', { configurable: true, enumerable: true, get() { if (!inRender) { reads++; const s = (new Error().stack || '').split('\n').slice(2, 5).map((l) => l.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '')).join(' < '); where.set(s, (where.get(s) || 0) + 1); } return m; }, set(v) { o.__mwSave = v; } }); });
    };
    for (let i = 0; i < FR; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, true); }
    disarm(); R.render = rr; FC.restore = restore; G.bench.setCamera('orbit');
    return { rigs: rigs / FR, parts: parts / FR, reads, where: [...where].sort((a, b) => b[1] - a[1]).slice(0, 12) };
  }, { id, cam: process.env.CAM || 'follow', FR });
  console.log(`${id}: out-of-view people a frame ${r.rigs.toFixed(1)} (${r.parts.toFixed(0)} parts) · reads of their parts' world matrices outside the render: ${r.reads} in ${FR} frames`);
  for (const [s, n] of r.where) console.log(`   ${String(n).padStart(6)}  ${s}`);
}
await browser.close();
