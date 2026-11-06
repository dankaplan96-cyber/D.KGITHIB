// PACE-SIM: the hurt vignette's look at fixed points of its 0.6 s animation (the animation paused there), for a
// before/after comparison. The game is frozen on the same frame each time.
//   GAME_URL=... OUT=/dev/shm/vs-base node vigshot.mjs   → OUT-<ms>.png for ms in 0 100 200 350 500
import { launch, open } from '../../../../tests/lib/boot.mjs';
const OUT = process.env.OUT || '/dev/shm/vs';
const { browser, page } = await launch({ width: 1366, height: 768 });
await page.addInitScript(() => { try { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: 'low', qPicked: true, qv: 1, v: 2 })); } catch {} });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine');
await ev(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); game.step(0.1); game.renderer.render(); });
await page.waitForTimeout(1500);
for (const ms of [0, 100, 200, 350, 500]) {
  const n = await ev((ms) => { game.hud.hurt(); const A = document.querySelector('#vignette').getAnimations(); for (const a of A) { a.pause(); a.currentTime = ms; } return A.length; }, ms);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}-${ms}.png` });
  console.log(ms, 'animations', n);
}
await browser.close();
