// PERF-SUBMIT: shadowcull.js's update timed on its own on frozen states of a route, the batches' sphere pre-test off
// (A) and on (B) alternating in blocks: ms per update (no render in between; same camera, sun and focus).
//   GAME_URL=http://localhost:8351/ Q=medium BATTERY=1 ROUTE=street STATES=4 ROUNDS=30 BLOCK=20 node cullab.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'street', STATES = +(process.env.STATES || 4), ROUNDS = +(process.env.ROUNDS || 30), BLOCK = +(process.env.BLOCK || 20);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
const r = await ev(({ id, STATES, ROUNDS, BLOCK }) => {
  const G = game, SC = G.shadowCull, route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; G.benching = true; route.setup(); G.state = 'play';
  let t = 0; const res = { A: [], B: [] }, per = [];
  const mid = (a) => { const v = a.slice().sort((x, y) => x - y), q = v.length >> 2; const m = v.slice(q, v.length - q); return m.reduce((s, x) => s + x, 0) / m.length; };
  for (let s = 0; s < STATES; s++) {
    for (let i = 0; i < 120; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, i % 4 === 0); }
    const root = G.room?.group || G.world.root, focus = G.hero.pos, loc = { A: [], B: [] };
    for (let k = 0; k < ROUNDS; k++) for (const side of k & 1 ? ['B', 'A'] : ['A', 'B']) {
      SC.prefilter = side === 'B'; SC.update(root, G.camera, focus);
      const t0 = performance.now(); for (let j = 0; j < BLOCK; j++) SC.update(root, G.camera, focus); const ms = (performance.now() - t0) / BLOCK;
      res[side].push(ms); loc[side].push(ms);
    }
    per.push(`state ${s + 1}: A ${mid(loc.A).toFixed(4)} · B ${mid(loc.B).toFixed(4)} ms`);
  }
  SC.prefilter = true;
  return { per, A: mid(res.A), B: mid(res.B), cells: SC.area?.cells.size };
}, { id: ID, STATES, ROUNDS, BLOCK });
console.log(`PERF-SUBMIT shadowcull.update A (pre-test off) / B (on) · ${Q}${process.env.BATTERY ? ' battery' : ''} · ${ID} · cells ${r.cells}`);
for (const l of r.per) console.log('  ' + l);
console.log(`overall: A ${r.A.toFixed(4)} · B ${r.B.toFixed(4)} ms per update (middle-half means) · B − A ${(r.B - r.A).toFixed(4)}`);
await browser.close();
