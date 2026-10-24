// RENDER-INV: Settings → Edges, same frame: Smooth (MSAA 2× at Medium) vs Fast (FXAA), at Medium, one page, nothing
// simulated between the captures. PNGs + a 2× crop strip per view (MSAA · FXAA · difference ×4) to OUT.
//   GAME_URL=http://localhost:8176/ OUT=dir node aalook.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const OUT = process.env.OUT; fs.mkdirSync(OUT, { recursive: true });
const { browser, page, errs } = await launch({ width: 1366, height: 768 });
await page.addInitScript(() => { try { if (!sessionStorage.getItem('pq')) { localStorage.setItem('sunshard_settings_v1', JSON.stringify({ quality: 'medium', qPicked: true, qv: 1, v: 2, camera: 'free', res: 'full' })); sessionStorage.setItem('pq', '1'); } } catch {} });
await open(page, '?nocine');
await page.evaluate(() => { document.querySelector('[data-act="new"]').click(); game.testFreeze = true; game.step(0.3); game.setState('play'); game.renderer.setAutoRes(false); });
const views = [{ id: 'square', x: -42, z: 2, yaw: 2.2 }, { id: 'harbour', x: -70, z: -4, yaw: 1.6 }, { id: 'house', room: 'house', yaw: 0.8 }, { id: 'zeelich', room: 'zeelich', yaw: 2.0 }];
for (const v of views) {
  await page.evaluate((v) => {
    const G = game;
    if (v.room) G.enterRoom(v.room, null, true, true); else G.exitRoom({ x: v.x, z: v.z, a: 0 }, true, true);
    G.state = 'play'; G.camRig.setMode('free'); G.camRig.view = 0; G.camRig.pitch = 0.42; G.camRig.idleT = 0; G.camRig.snap();
    for (let i = 0; i < 40; i++) { G.camRig.yaw = v.yaw; G.hero.vel.set(0, 0); G.frame(1 / 30, i % 10 === 9); }
    G.camRig.yaw = v.yaw; G.frame(0, true);
  }, v);
  for (const aa of ['msaa', 'fxaa']) {
    await page.evaluate((aa) => { const R = game.renderer; R.setAA(aa); R.render(); R.render(); }, aa);
    await page.screenshot({ path: `${OUT}/${v.id}-${aa}.png`, timeout: 300000 });
  }
  await page.evaluate(() => game.renderer.setAA('msaa'));
}
console.log(errs.length ? errs.slice(0, 5).join('\n') : 'no errors');
await browser.close();
