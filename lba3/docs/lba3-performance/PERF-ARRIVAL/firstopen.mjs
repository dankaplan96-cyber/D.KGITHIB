// PERF-ARRIVAL: shader programs made the first time a popup or effect is shown in play, after loading: the behaviour
// menu (Ctrl held), the inventory, the holomap, a picked-up bonus, a searched container, the magic ball, and a
// quality switch Medium → High → Low → Medium (each followed by a frame). Counts only.
//   GAME_URL=http://localhost:8177/ QUALITY=medium node firstopen.mjs
import { launch, open } from '../../../tests/lib/boot.mjs';
const Q = process.env.QUALITY || 'medium';
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript((q) => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: q, qPicked: true, qv: 1, v: 2 })); sessionStorage.setItem('pq', q); } } catch {} }, Q);
await open(page, '?nocine');
const out = await page.evaluate(() => {
  document.querySelector('[data-act="new"]').click(); const G = game; G.testFreeze = true; G.step(0.3); G.setState('play');
  const R = G.renderer.renderer, res = {};
  G.exitRoom({ x: -42, z: 2, a: 0 }, true, true); G.state = 'play';
  for (let i = 0; i < 3; i++) G.frame(1 / 30, true);
  // (programs made by the action itself, e.g. a preset change's own warm-up, and then by the frames drawn after it)
  const step = (name, fn, frames = 3) => { const p0 = R.info.programs.length; try { fn(); } catch (e) { res[name + ' (error)'] = String(e); } const p1 = R.info.programs.length; for (let i = 0; i < frames; i++) G.frame(1 / 30, true); res[name] = { byAction: p1 - p0, inFramesAfter: R.info.programs.length - p1 }; };
  step('behaviour menu', () => { G.behMenu.show(true); }, 0);
  { const p0 = R.info.programs.length; G.behMenu.render(R, 1 / 30); G.behMenu.render(R, 1 / 30); res['behaviour menu'].inFramesAfter += R.info.programs.length - p0; G.behMenu.show(false); }
  step('inventory', () => { G.inventory.show(true); G.setState('inventory'); });
  step('inventory closed', () => { G.inventory.show(false); G.setState('play'); });
  step('bonus spawned', () => { const h = G.hero.pos; for (const t of ['coin', 'heart', 'flask', 'clover']) G.pickups.spawn(t, h.x + 1.5, h.y + 0.5, h.z, { life: 30 }); });
  step('magic ball', () => { G.ball.ready && G.ball.launch(G.hero, 'normal', G.hero.magicLevel, { aim: { x: 1, z: 0 } }); }, 10);
  for (const q of ['high', 'low', 'medium']) step('switch to ' + q + ' (then frames)', () => { G.settings.quality = q; G.applySettings(); });
  return res;
});
console.log(JSON.stringify({ quality: Q, newProgramsOnFirstUse: out, errors: errs.slice(0, 5) }, null, 1));
await browser.close();
