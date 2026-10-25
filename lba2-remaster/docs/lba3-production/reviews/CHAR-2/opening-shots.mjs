// CHAR-OPEN: the opening's house shots on the game's own clock (1/30 s steps, as OPEN-3's capture.mjs), the same
// frames before and after each model change. 1280x720, SwiftShader.
//   GAME_URL=http://127.0.0.1:8173/ node opening-shots.mjs <outdir> [prefix] [t1,t2,...]
// Default times (scene seconds; OPEN-3's shot list):
//   32.0 shot 5 (Arthur's close-up, Twinsen behind)   41.0 shot 6 Zoé in profile at the tap (#11)
//   46.0 she calls him                                 49.4 shot 7 the exchange (#13/#28: his arms, her arms)
//   52.1 over his shoulder (#15/#28)                   53.45 the shrug at its peak, from behind (#15/#28)
//   56.0 Arthur's close-up, parents turning            58.6 shot 9 Zoé in profile at the tap again (#11)
//   61.0 her hand in the stream                        77.5 shot 12 outside, Zoé from behind (#11, #26)
// Each frame is saved whole, plus a crop round each of Zoé and Twinsen when they are in view (…-zoe.png, …-tw.png).
import { launch, open } from '../../../../tests/lib/boot.mjs';
import path from 'node:path';
import fs from 'node:fs';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const PRE = process.argv[3] || 'after';
const TIMES = (process.argv[4] || '32.0,41.0,46.0,49.4,52.1,53.45,56.0,58.6,61.0,77.5').split(',').map(Number);
const { browser, page, errs } = await launch({ width: 1280, height: 720 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '');
await page.click('[data-act="new"]', { timeout: 180000 });
await page.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 240000 });
await ev(() => { game.testFreeze = true; });
const runTo = (t) => ev((t) => { for (let i = 0; i < 9000 && game.cine && game.cine.t < t; i++) game.frame(1 / 30, false); return game.cine?.t; }, t);
const crop = (who) => ev((who) => {
  const a = who === 'twinsen' ? game.hero : game.npcs.find((n) => n.def.id === who);
  const rig = a?.rig; if (!rig || !rig.root.visible || (who !== 'twinsen' && !a.present)) return null;
  const V = game.hero.pos.constructor, top = new V(), feet = new V();
  rig.j.head.getWorldPosition(top); top.y += 0.5; rig.root.getWorldPosition(feet);
  const mid = top.clone().lerp(feet, 0.5);
  [top, feet, mid].forEach((q) => q.project(game.camera));
  if (Math.abs(mid.x) > 1.1 || Math.abs(mid.y) > 1.3 || mid.z > 1) return null;
  const h = Math.max(200, Math.min(700, Math.abs(top.y - feet.y) * 360 * 1.3));
  return { x: Math.round((mid.x + 1) / 2 * 1280 - h / 2), y: Math.round((1 - mid.y) / 2 * 720 - h / 2), w: Math.round(h) };
}, who);
await page.addScriptTag({ path: new URL('../../../../tests/lib/player.js', import.meta.url).pathname });
for (const t of TIMES) {
  const at = await runTo(t);
  await ev(() => game.renderer.render());
  const name = `opening-${t.toFixed(2)}`;
  await page.screenshot({ path: path.join(OUT, `${PRE}-${name}.png`), timeout: 180000 });
  for (const [who, tag] of [['zoe', 'zoe'], ['twinsen', 'tw']]) {
    const c = await crop(who);
    if (!c) continue;
    c.x = Math.max(0, Math.min(1280 - c.w, c.x)); c.y = Math.max(0, Math.min(720 - c.w, c.y)); c.w = Math.min(c.w, 720); c.h = c.w;
    await page.screenshot({ path: path.join(OUT, `${PRE}-${name}-${tag}.png`), clip: { x: c.x, y: c.y, width: c.w, height: c.h }, timeout: 180000 });
  }
  console.log('shot', name, at?.toFixed(2));
}
console.log(errs.join('\n') || 'no errors');
await browser.close();
