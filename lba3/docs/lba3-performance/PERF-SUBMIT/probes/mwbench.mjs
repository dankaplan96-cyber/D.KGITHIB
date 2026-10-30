// PERF-SUBMIT: the shown-world update (measured: steady path 0.32 ms/call; a variant without the hidden nodes'
// children swap 0.28 — not kept: in a frame the update is mostly the changed people's matrices, 1.1 ms)
// PERF-SUBMIT: the shown-world update (drawcull.js updateShownWorld) on its own, repeated on the street's scene as it
// stands after a drawn frame (nothing moves between repeats: the steady path that most objects take every frame), the
// game's version against variants defined here, alternated in blocks. ms per call, median of the blocks.
//   GAME_URL=http://localhost:8351/ Q=medium BATTERY=1 ROUTE=street REPS=40 BLOCK=25 node mwbench.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'medium', ID = process.env.ROUTE || 'street';
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev(() => game.bench.prepareAreas());
await ev((q) => { game.settings.quality = q; game.settings.qualityAuto = false; game.applySettings(); }, Q);
if (process.env.BATTERY) await ev(() => game.setBattery(true));
await page.waitForFunction(() => !game.gfxHold && !game.preparing, null, { timeout: 600000 }).catch(() => {});
const out = await ev(async ({ id, REPS, BLOCK }) => {
  const G = game, route = G.bench.routes().find((x) => x.id === id);
  G.state = 'play'; G.benching = true; route.setup(); G.state = 'play';
  let t = 0;
  for (let i = 0; i < 240; i++) { t += 1 / 60; route.drive(t, 1 / 60); G.frame(1 / 60, i % 4 === 0); }
  const DC = await import('/src/engine/drawcull.js');
  const S = G.scene, st = G.renderer._mw;
  // the frame's state just before the render's update: the far actors hidden (pre), as in a frame
  G.renderer.pre?.();
  const variants = { game: () => DC.updateShownWorld(S, st) };
  if (DC.updateShownWorldAlt) variants.alt = () => DC.updateShownWorldAlt(S, st);
  const res = {}; for (const k in variants) res[k] = [];
  const keys = Object.keys(variants);
  for (let r = 0; r < REPS; r++) for (const k of (r & 1 ? keys.slice().reverse() : keys)) {
    const f = variants[k]; const t0 = performance.now(); for (let i = 0; i < BLOCK; i++) f(); res[k].push((performance.now() - t0) / BLOCK);
  }
  G.renderer.post?.();
  const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
  return { med: Object.fromEntries(keys.map((k) => [k, +med(res[k]).toFixed(4)])), stats: st.stats };
}, { id: ID, REPS: +(process.env.REPS || 40), BLOCK: +(process.env.BLOCK || 25) });
console.log('shown-world update, ms per call (median of blocks):', JSON.stringify(out.med), 'stats', JSON.stringify(out.stats));
await browser.close();
