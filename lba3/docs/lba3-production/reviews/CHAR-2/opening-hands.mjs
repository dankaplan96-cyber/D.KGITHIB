// CHAR-OPEN: where Zoé's and Twinsen's hands are in the opening (world metres), on the game's own clock (1/30 s), to
// check that the new arm spread (Zoé 0.3 → 0.08, the scene's pose layer brought in by the same 0.22) keeps her hand on
// the tap's handle and in the stream (OPEN-3 #18/#19/#29) and his on the screwdriver's spot (#21).
//   GAME_URL=http://127.0.0.1:8173/ node opening-hands.mjs
import { launch, open } from '../../../../tests/lib/boot.mjs';
const T = [42.0, 43.5, 46.0, 50.0, 56.0, 59.0, 60.3, 61.0, 65.0, 67.15, 69.5];
const { browser, page, errs } = await launch({ width: 640, height: 360 });
const ev = (f, a) => page.evaluate(f, a);
await open(page, '');
await page.click('[data-act="new"]', { timeout: 180000 });
await page.waitForFunction(() => game.cine && game.cine.state === 'run', null, { timeout: 240000 });
await ev(() => { game.testFreeze = true; });
for (const t of T) {
  const r = await ev((t) => {
    for (let i = 0; i < 9000 && game.cine && game.cine.t < t; i++) game.frame(1 / 30, false);
    const V = game.hero.pos.constructor, w = (b) => { const p = new V(); b.getWorldPosition(p); return [p.x, p.y, p.z].map((x) => +x.toFixed(3)); };
    const z = game.npcs.find((n) => n.def.id === 'zoe'), h = game.hero;
    return { t: +game.cine.t.toFixed(2), zoeR: w(z.rig.j.armR.hand), zoeL: w(z.rig.j.armL.hand), twR: w(h.rig.j.armR.hand) };
  }, t);
  console.log('HANDS', JSON.stringify(r));
}
console.log(errs.join('\n') || 'no errors');
await browser.close();
