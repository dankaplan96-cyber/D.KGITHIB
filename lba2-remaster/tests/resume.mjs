// Regression (QA.md D16, D17): Continue from a save made at a story moment that starts as a room is entered.
// The load puts him back in the room while the title is still up; a dialogue begun then used to be cut by the
// switch to play, its ending never run (Sendell's scene: the core never unlocked; the core fight: not restarted,
// no coil, the objective back at "Reach the core"). ISO: the story is set to chapter 11 by its flags; the rest is a
// real page reload and the Continue button.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { check, done } = checker();
const { browser, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
await open(page, '?nocine'); await menu(page, 'new');
const toShell = () => {
  const G = game, f = G.flags; P.settle();
  Object.assign(f, { prologueDone: true, intro: true, chapterKey: 'shell', c3_diagram: true, c3_ladder: true, c3_cooled: true, c3_pillar0: true, c3_pillar1: true, c3_pillar2: true });
  f.chapter = G.story.chapters.findIndex((c) => c.key === 'shell'); G.hero.hasBall = true; G.story.refreshCast();
};
const reloadContinue = async () => { await page.reload(); await open(page, '?nocine'); await menu(page, 'continue'); };

// D17: Sendell's scene, interrupted (the save is written as the room is entered)
await ev(toShell);
await ev(() => { game.enterRoom('c3sendell', null, true); game.step(0.1); });
await reloadContinue();
const d17 = await ev(() => { const G = game, f = G.flags, s0 = G.state; let lines = 0;
  for (let i = 0; i < 400 && !f.c3_sendell; i++) { if (G.state === 'dialog') { lines++; P.tap('KeyE', 0.05); } else G.step(1 / 30); }
  return { s0, lines, sendell: !!f.c3_sendell, state: G.state };
});
check('D17: Continue in the middle of Sendell\'s scene plays it on to its end (the way to the core opens)', d17.s0 === 'dialog' && d17.sendell, d17);

// D16: the core fight, saved in its second phase (all three pylons), resumes after Continue
await ev(() => { const G = game, f = G.flags, ch = G.story.cur; P.settle(); f.c3_sendell = true;
  G.enterRoom('c3core', null, true); for (let i = 0; i < 60; i++) { G.step(1 / 30); if (G.state !== 'play') P.settle(); }
  for (const i of [0, 1, 2]) if (!f['c3_pylon' + i]) ch.convertPylon(i);
  for (let i = 0; i < 300; i++) { G.step(1 / 30); if (G.state !== 'play') P.settle(); }
});
const d16a = await ev(() => ({ fight: game.flags.c3_fight, over: game.flags.c3_overload, coil: !!game.room.ballTargets.find((x) => x.coil) }));
await reloadContinue();
const d16 = await ev(() => { const G = game, f = G.flags; for (let i = 0; i < 300; i++) { G.step(1 / 30); if (G.state !== 'play') P.settle(); }
  return { room: G.room?.id, fight: !!f.c3_fight, over: !!f.c3_overload, coil: !!G.room?.ballTargets?.find((x) => x.coil), obj: document.querySelector('#objective')?.textContent };
});
check('D16: Continue during the core fight\'s coil phase: the fight and the coil are back', d16a.coil && d16.room === 'c3core' && d16.fight && d16.over && d16.coil, { d16a, d16 });

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
