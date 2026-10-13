// Regression checks for the defects fixed in the stabilization pass (docs/lba3-production/QA.md, D1–D5).
// D1–D2 are played through the input harness; D3–D5 isolate the situation (ISO: a teleport or flags set up the
// spot) and then check what the game does on its own.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker();
const { browser, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');

// D2: walking into the front door without the ball: one refusal, not a loop
const d2 = await ev(() => {
  const G = game; P.settle();
  const e = G.room.exits.find((x) => !x.room);
  let lines = 0; P.go(e.x, e.z, { tol: 0.3 });
  for (let i = 0; i < 6 * 30; i++) { if (G.state === 'dialog') { lines++; P.settle(); } G.step(1 / 30); }
  return { lines, room: G.room?.id, inTrigger: Math.hypot(G.hero.pos.x - e.x, G.hero.pos.z - e.z) < e.r };
});
check('D2: a refused exit says its line once while he stands in the door (6 s)', d2.lines === 1 && d2.room === 'house', d2);

// D1: the hallway's floor seams: Up from the hallway reaches the front door and goes out (60 and 30 fps)
const d1 = await ev(() => {
  const G = game, h = G.hero, out = {}; P.settle();
  const s = G.room.searches[0]; P.use(s.x, s.z);                         // the ball from the cupboard
  for (const fps of [30, 60]) {
    P.go(1001.2, 6.6, { tol: 0.3 }); P.face(1001.2, 11.3);
    G.input.keys.add('ArrowUp'); let t = 0;
    for (; t < 4 && !G.trans && G.room?.id === 'house'; t += 1 / fps) G.step(1 / fps);
    G.input.keys.delete('ArrowUp');
    out[fps] = { z: +h.pos.z.toFixed(2), left: !!G.trans || G.room?.id !== 'house' };
    P.settle();
    if (G.room?.id !== 'house') { const d = G.world.houses[0].door; P.through(d.x, d.z); P.settle(); }
  }
  return out;
});
check('D1: Up from the hallway walks out of the front door at 30 fps', d1[30].left, d1);
check('D1: ... and at 60 fps', d1[60].left, d1);

// D3: on the steep bank at the waterline (−77.65, 52.76) he is not trapped (ISO: placed there)
const d3 = await ev(() => {
  const G = game, h = G.hero; P.settle();
  if (G.room) { const e = G.room.exits.find((x) => !x.room); P.through(e.x, e.z); }
  P.settle();
  G.lastSafe = { x: -60, z: 40 };
  const hp0 = h.hp;
  h.pos.set(-77.65, -0.35, 52.76); h.onGround = true; h.vel.set(0, 0);
  let t = 0; for (; t < 3 && Math.hypot(h.pos.x + 77.65, h.pos.z - 52.76) < 2; t += 1 / 30) G.step(1 / 30);
  return { t: +t.toFixed(2), pos: [h.pos.x, h.pos.z].map((v) => +v.toFixed(1)), hp: [hp0, h.hp] };
});
check('D3: held at the waterline by a slide, he is put back on safe ground within 1.5 s', d3.t < 1.5 && Math.hypot(d3.pos[0] + 60, d3.pos[1] - 40) < 1, d3);

// D4: death → the game-over screen after the fall, in game time; a pause holds it
const d4 = await ev(() => {
  const G = game, h = G.hero; P.settle();
  h.clovers = 0; h.invuln = 0; h.hp = 1; h.damage(5, null);
  const out = { dead: h.dead };
  P.tap('Escape', 0.1); out.paused = G.state;
  const t0 = performance.now(); while (performance.now() - t0 < 2600) { /* wall-clock time passes, game time doesn't */ }
  out.stillPaused = G.state;
  P.tap('Escape', 0.1); G.step(2.4); out.after = G.state;
  out.screen = !document.querySelector('#gameover').classList.contains('hidden');
  return out;
});
await page.waitForTimeout(300);
const d4b = await ev(() => game.state);
check('D4: a pause during the death fall holds the game-over screen', d4.dead && d4.paused === 'pause' && d4.stillPaused === 'pause' && d4b !== 'play' || d4.after === 'gameover', { ...d4, d4b });
check('D4: the game-over screen comes after the fall, in game time', d4.after === 'gameover' && d4.screen, d4);

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
