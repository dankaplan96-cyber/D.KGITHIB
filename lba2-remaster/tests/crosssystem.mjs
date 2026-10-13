// Cases at the boundaries between systems (docs/lba3-production/QA.md §Cross-system), through the input harness
// and real keyboard events. Setup that isn't the point of a check (owning the sword, an enemy in front) is ISO.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker();
const { browser, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const step = (s) => ev((s) => game.step(s), s);
await open(page, '?nocine'); await menu(page, 'new');
// the ball from the cupboard, then outside on the street (played)
await ev(() => { const G = game; P.settle(); const s = G.room.searches[0]; P.use(s.x, s.z); const e = G.room.exits.find((x) => !x.room); P.through(e.x, e.z); P.settle(); });

// 1. pause while charging a throw; release while paused; resume
const c1 = await ev(() => {
  const G = game, h = G.hero, out = {};
  G.input.keys.add('KeyF'); G.input.taps.add('KeyF'); G.step(0.5);
  out.charging = h.rig.anim; out.ball0 = G.ball.state;
  P.tap('Escape', 0.05); out.paused = G.state;
  G.input.keys.delete('KeyF'); G.step(0.5); out.ballPaused = G.ball.state;
  P.tap('Escape', 0.05); G.step(0.4); out.resumed = G.state; out.ball1 = G.ball.state;
  G.step(2.5); out.ball2 = G.ball.state;
  const p0 = h.pos.clone(); P.holdFor(['ArrowUp'], 0.6); out.walks = +h.pos.distanceTo(p0).toFixed(2); out.anim = h.rig.anim;
  return out;
});
check('pause while charging: nothing is thrown while paused', c1.paused === 'pause' && c1.ballPaused === c1.ball0, c1);
check('...after resuming the ball is in hand again (thrown once or not at all) and he walks', c1.resumed === 'play' && ['inhand', 'idle'].includes(c1.ball2) && c1.walks > 0.5, c1);

// 2. focus lost while charging the ball
const c2 = await ev(() => {
  const G = game, h = G.hero, out = {};
  G.input.keys.add('KeyF'); G.input.taps.add('KeyF'); G.step(0.4);
  window.dispatchEvent(new Event('blur')); G.step(0.2); out.after = G.ball.state; G.step(2.5); out.later = G.ball.state;
  const p0 = h.pos.clone(); P.holdFor(['ArrowUp'], 0.6); out.walks = +h.pos.distanceTo(p0).toFixed(2); out.keys = G.input.keys.size;
  return out;
});
check('focus lost while charging: no key stays held, the ball comes home, he walks', c2.keys === 0 && ['inhand', 'idle'].includes(c2.later) && c2.walks > 0.5, c2);

// 3. weapon change while the ball is on its way back (ISO: he owns the sword)
const c3 = await ev(() => {
  const G = game, h = G.hero, out = {};
  h.hasSword = true;
  P.tap('KeyF', 0.05); G.step(0.5); out.flying = G.ball.state;
  P.tap('KeyR', 0.1); out.weapon = h.combat.weapon;
  G.step(3); out.ball = G.ball.state; out.balls = G.scene.children.filter((o) => o === G.ball.mesh).length;
  P.tap('KeyR', 0.1); out.back = h.combat.weapon;
  P.tap('KeyF', 0.05); G.step(0.3); out.throwsAgain = G.ball.state; G.step(3);
  return out;
});
check('weapon swap (R: to the previous weapon) while the ball flies: the swap happens, the ball still comes home, one ball', c3.weapon !== 'ball' && ['inhand', 'idle'].includes(c3.ball) && c3.balls <= 1, c3);
check('...swap back: the ball throws again', c3.back === 'ball' && ['fly', 'impact', 'return'].includes(c3.throwsAgain), c3);

// 4. into a room with the ball in flight, and straight back out
const c4 = await ev(() => {
  const G = game, h = G.hero, out = {};
  const d = G.world.houses[0].door;
  P.go(d.x, d.z + 2.2, { tol: 0.5 }); P.face(d.x, d.z);
  P.tap('KeyF', 0.05); out.fly = G.ball.state;
  P.through(d.x, d.z); out.room = G.room?.id; out.ball = G.ball.state;
  const e = G.room.exits.find((x) => !x.room); P.through(e.x, e.z); out.back = G.room?.id ?? 'citadel'; out.ball2 = G.ball.state;
  return out;
});
check('a door with the ball in the air: in the room the ball is in hand; back out too', c4.room === 'house' && ['inhand', 'idle'].includes(c4.ball) && c4.back === 'citadel' && ['inhand', 'idle'].includes(c4.ball2), c4);

// 5. rapid presses at something that gives an item: one reward (the house cupboard, already emptied, and a giver)
const c5 = await ev(() => {
  const G = game, h = G.hero, out = {};
  const d = G.world.houses[0].door; P.through(d.x, d.z); P.settle();
  const giv = G.room.givers?.[0];
  if (!giv) return { none: true };
  const before = G.pickups.list.length, coins = h.coins;
  P.go(giv.x, giv.z, { tol: giv.r * 0.6 });
  for (let i = 0; i < 12; i++) { G.input.taps.add('KeyE'); G.input.taps.add('Space'); G.step(0.1); if (G.state !== 'play') P.settle(); }
  G.step(1.5);
  out.spawned = G.pickups.list.length - before; out.searched = G.searched.filter((x) => x === giv.id).length;
  return out;
});
check('mashing E/Space at a giver: one bonus, recorded once', c5.none || (c5.spawned <= 1 && c5.searched <= 1), c5);

// 6. quality changed ten times through the settings, then back to play
for (let i = 0; i < 10; i++) {
  await page.keyboard.press('Escape'); await step(0.05);
  await page.click('#pause [data-act="settings"]');
  await page.click(`#settings .seg[data-setting="quality"] button >> nth=${i % 3}`);
  await page.click('#settings [data-act="back"]');
  await page.click('#pause [data-act="resume"]'); await step(0.1);
}
const c6 = await ev(() => { const G = game; G.renderer.render(); const p0 = G.hero.pos.clone(); P.holdFor(['ArrowUp'], 0.5); return { state: G.state, q: G.settings.quality, moved: +G.hero.pos.distanceTo(p0).toFixed(2), calls: G.renderer.renderer.info.render.calls }; });
check('quality changed ×10 through the menus: back in play, it renders and he moves', c6.state === 'play' && c6.moved > 0.3 && c6.calls > 0, c6);

// 7. death with the ball in flight → game over → Retry (continue from the save)
const c7 = await ev(() => {
  const G = game, h = G.hero; P.settle();
  const e = G.room?.exits?.find((x) => !x.room); if (e) P.through(e.x, e.z);
  P.tap('KeyF', 0.05); h.clovers = 0; h.invuln = 0; h.damage(99, null);
  G.step(3); return { state: G.state, ball: G.ball.state };
});
check('death with the ball out: game over after the fall', c7.state === 'gameover', c7);
await page.click('#gameover [data-act="retry"]');
await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 300000 });
await page.waitForFunction(() => game.state === 'play', null, { timeout: 120000 }).catch(() => {});
await page.addScriptTag({ path: new URL('./lib/player.js', import.meta.url).pathname });
const c7b = await ev(() => { game.testFreeze = true; P.settle(); return { state: game.state, hp: game.hero.hp, ball: game.ball.state, hasBall: game.hero.hasBall }; });
check('Retry: back in play from the save, alive, the ball in hand', c7b.state === 'play' && c7b.hp > 0 && c7b.hasBall, c7b);

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
