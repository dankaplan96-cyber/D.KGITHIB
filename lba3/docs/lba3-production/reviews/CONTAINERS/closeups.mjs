// CONTAINERS evidence: the glint over an unsearched bin, the "Search" prompt, the hop and the bonus in the air, a heart
// left on the ground with life full, from the play camera.
//   GAME_URL=http://localhost:8182/ node docs/lba3-production/reviews/CONTAINERS/closeups.mjs <out dir>
import { launch, open, menu } from '../../../../tests/lib/boot.mjs';
import fs from 'node:fs';
const out = process.argv[2] || '.';
fs.mkdirSync(out, { recursive: true });
const { browser, page, errs } = await launch({ width: 960, height: 540 });
await open(page, '?nocine');
await menu(page, 'new');
const shot = async (name) => { await page.evaluate(() => game.renderer.render()); await page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 72 }); console.log('shot', name); };
await page.evaluate(() => {
  const G = game; for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  G.exitRoom({ x: -60, z: 36 }, true); P.settle();
  window.by = (id, d, turn = 0) => {
    const gv = G.givers().find((g) => g.id === id), h = G.hero;
    for (let k = 0; k < 16; k++) {
      const a = (k * Math.PI) / 8 + 0.2, x = gv.x + Math.sin(a) * d, z = gv.z + Math.cos(a) * d, y = G.physics.groundAt(x, z, h.pos.y + 0.6);
      if (G.physics.blockedAt(x, z, y, 0.35)) continue;
      h.pos.set(x, y, z); h.angle = a + Math.PI + turn; h.vel.set(0, 0); h.onGround = true; G.lastSafe = { x, z }; G.camRig.snap(); return gv;
    }
  };
});
// 1. the glint: a frame where it shows
await page.evaluate(() => { by('c-path-bin', 2.6, 0.5); for (let i = 0; i < 60; i++) game.step(1 / 30); for (let i = 0; i < 200; i++) { game.step(1 / 30); if (game.cues.sprites.some((s) => s.visible && s.scale.x > 0.36)) break; } });
await shot('01-glint-unsearched-bin');
// 2. in reach: the verb prompt
await page.evaluate(() => { by('c-path-bin', 0.95, 0.4); for (let i = 0; i < 30; i++) game.step(1 / 30); });
await shot('02-search-prompt');
// 3. the hop by the life-only barrel west of the square, the heart in the air
await page.evaluate(() => { game.exitRoom({ x: -60, z: -5 }, true); P.settle(); by('c-west-barrel', 0.95, 0.5); for (let i = 0; i < 20; i++) game.step(1 / 30); const h = game.hero; h.hp = h.maxHp; P.tap('Space', 0.25); });
await shot('03-hop-bonus-in-air');
// 4. landed; life full: the heart stays (he stands on it)
await page.evaluate(() => { game.step(2); const p = game.pickups.list.find((q) => q.loot); if (p) { P.go(p.pos.x, p.pos.z, { tol: 0.3 }); } for (let i = 0; i < 45; i++) game.step(1 / 30); const h = game.hero; h.pos.x -= 1.4; h.angle = Math.PI / 2; game.camRig.snap(); for (let i = 0; i < 30; i++) game.step(1 / 30); });
const st = await page.evaluate(() => ({ loot: game.pickups.list.filter((p) => p.loot).map((p) => [p.type, +p.pos.x.toFixed(1), +p.pos.z.toFixed(1)]), hp: game.hero.hp, max: game.hero.maxHp }));
console.log(JSON.stringify(st));
await shot('04-heart-stays-life-full');
console.log(errs.join('\n') || 'no errors');
await browser.close();
