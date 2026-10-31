// PERF-CPU: how many pieces the per-frame checks walk on a route (shadow-batch members, pieces casting on their own,
// quiet pieces, cells; draw-batch members, cells) and the shown-world update's counts.
//   GAME_URL=http://localhost:8214/ ROUTE=street Q=low node sizes.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'high', ID = process.env.ROUTE || 'street';
const { browser, page } = await launch({ width: 960, height: 540 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
const r = await ev((id) => {
  const G = game; const route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; route.setup(); G.state = 'play';
  for (let i = 0; i < 120; i++) { route.drive(i / 60, 1 / 60); G.frame(1 / 60, i % 6 === 0); }
  const A = G.shadowCull.area, root = G.room?.group || G.world.root, D = G.drawBatch.areas.get(root);
  return { members: A?.members.length, solo: A?.solo.length, quiet: A?.quiet.length, cells: A?.cells.size, proxies: A?.proxies.length, dbMembers: D?.members.length, dbCells: D?.cells.size,
    mw: G.renderer._mw.stats, npcs: G.npcs.length, present: G.npcs.filter((n) => n.present).length, enemies: G.enemies.length, enemiesPresent: G.enemies.filter((e) => e.present).length };
}, ID);
console.log(ID, Q, JSON.stringify(r));
await browser.close();
