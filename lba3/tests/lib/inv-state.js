// INVENTORY-CALM: a chapter-1 inventory as the user saw it (the ball, the holomap, the pipe map, a few Kashes,
// clovers and crystals; the journal's first steps). Installed into the page by tests/inventory-calm.mjs; works on a
// game booted with "New Game". Returns nothing; leaves the game in play, chapter 1.
window.INV_CH1 = function () {
  const G = window.game;
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  G.flags.prologueDone = true; G.flags.intro = true; G.hero.hasBall = true;
  if ((G.flags.chapter | 0) < 1) G.story.nextChapter();
  G.step(0.5);
  for (let i = 0; i < 80 && G.state !== 'play'; i++) { G.input.taps.add('KeyE'); G.step(0.05); }
  Object.assign(G.flags, { c1_home: true, c1_arrived: true, c1_task: true, c1_map: true });
  G.hero.coins = 23; G.hero.clovers = 2;
  for (const id of ['sc-pier', 'sc-orchard']) if (!G.collected.includes(id)) G.collected.push(id);
  G.updateObjective?.();
  G.step(0.2);
};
