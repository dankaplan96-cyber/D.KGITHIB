// one equivalent view of a route at a preset, for before/after comparisons: OUT=file.png
import { launch, open } from '../../../../tests/lib/boot.mjs';
const Q = process.env.Q || 'high', ID = process.env.ROUTE || 'street', T = +(process.env.T || 2);
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { Math.random = (() => { let s = 12345; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })(); if (!localStorage.getItem('perf_q')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); localStorage.setItem('perf_q', q); } } catch {} }, Q);
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); });
await ev((q) => { game.settings.quality = q; game.applySettings(); }, Q);
if (process.env.NOVIEW) await ev(() => { window.__noview = true; });
await page.waitForFunction(() => !game.gfxHold, null, { timeout: 600000 }).catch(() => {});
const info = await ev(({ id, T, cam }) => {
  const G = game, route = G.bench.routes().find((x) => x.id === id); if (window.__noview) G.farCull.view = false;
  G.state = 'play'; route.setup(); G.state = 'play';
  if (cam) { G.settings.camera = cam; G.camRig.setMode(cam); G.settings.camDist = 'far'; G.applySettings(); G.camRig.cut = false; }
  for (let t = 0; t < T; t += 1 / 30) { route.drive(t, 1 / 30); G.frame(1 / 30, false); }
  G.frame(1 / 60, true); G.frame(0, true);
  return { culledView: G.farCull.nView, cell: G.shadowCull.cell, calls: G.renderer.renderer.info.render.calls, hero: [G.hero.pos.x.toFixed(2), G.hero.pos.z.toFixed(2)] };
}, { id: ID, T, cam: process.env.CAM || '' });
console.log(JSON.stringify(info));
await page.screenshot({ path: process.env.OUT || 'shot.png', timeout: 300000 });
await browser.close();
