// CONTAINERS-2 evidence: a searched bin stays empty within the visit (no prompt, no glint); after a trip to Zeelich and
// back it is full again (the "Search" prompt, the glint) and gives a second bonus beside the first, still lying there.
//   GAME_URL=http://localhost:8173/ node docs/lba3-production/reviews/CONTAINERS-2/refill.mjs <out dir>
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
  window.glint = (id) => { const gv = G.givers().find((g) => g.id === id); for (let i = 0; i < 200; i++) { G.step(1 / 30); if (G.cues.sprites.some((s) => s.visible && s.scale.x > 0.36 && Math.hypot(s.position.x - gv.x, s.position.z - gv.z) < 0.5)) return true; } return false; };
});
// 1. searched in this visit: a heart lies beside it (life full), no prompt, no glint (90 s later)
const s1 = await page.evaluate(() => {
  const G = game, h = G.hero; h.hp = h.maxHp; h.mp = h.mpMax; h.coins = 99;
  by('c-path-bin', 0.95, 0.4); for (let i = 0; i < 20; i++) G.step(1 / 30);
  const rnd = Math.random; Math.random = () => 0.4; P.tap('Space', 0.25); Math.random = rnd; G.step(2);
  for (let i = 0; i < 90; i++) G.step(1);
  by('c-path-bin', 1.6, 0.6); for (let i = 0; i < 30; i++) G.step(1 / 30);
  return { prompt: G.hud._prompt || '', glint: glint('c-path-bin'), loot: G.pickups.list.filter((p) => p.loot).map((p) => p.loot) };
});
console.log(JSON.stringify(s1));
await shot('01-searched-same-visit-empty');
// 2. to Zeelich and back: the prompt and the glint are back
const s2 = await page.evaluate(() => {
  const G = game; G.enterRoom('zeelich', null, true); P.settle(); G.step(0.5); G.exitRoom({ x: -60, z: 36 }, true); P.settle();
  by('c-path-bin', 0.95, 0.4); for (let i = 0; i < 20; i++) G.step(1 / 30);
  const g = glint('c-path-bin');
  return { prompt: (G.hud._prompt || '').replace(/<[^>]+>/g, ''), glint: g };
});
console.log(JSON.stringify(s2));
await shot('02-after-zeelich-full-again');
// 3. searched again: a second bonus beside the first
const s3 = await page.evaluate(() => {
  const G = game, h = G.hero; h.hp = h.maxHp; h.mp = h.mpMax;
  const rnd = Math.random; Math.random = () => 0.4; P.tap('Space', 0.25); Math.random = rnd; G.step(2);
  by('c-path-bin', 1.8, 0.7); for (let i = 0; i < 30; i++) G.step(1 / 30);
  return { loot: G.pickups.list.filter((p) => p.loot).map((p) => [p.loot, p.type]) };
});
console.log(JSON.stringify(s3));
await shot('03-second-bonus-beside-first');
console.log(errs.join('\n') || 'no errors');
await browser.close();
