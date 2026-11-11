// Prologue, in the cave: the mites, the three crystals woken with the ball, the barrier, Sendell → chapter 2.
export const steps = [
  ['continue in the cave', () => { P.settle(); return { room: game.room?.id, fail: game.room?.id === 'well' ? null : 'not in the well' }; }],
  // CAMPAIGN-1 (hometap.js): the pool at the shaft's foot is warm to his hand; the pump starts above and the growth on
  // the old pillar leans toward it
  ['the pool: warm', () => {
    const C = game.story.chapters[0].home.parts.cave; const r = P.use(C.pool.x, C.pool.z, { near: 1.5, kind: 'h_pool' });
    for (let i = 0; i < 40 && !game.flags.pr_pool; i++) { game.step(0.25); P.settle(); }
    return { ...r, pool: !!game.flags.pr_pool, fail: game.flags.pr_pool ? null : 'pool not felt' };
  }],
  ['the pump starts: the growth moves', () => {
    const C = game.story.chapters[0].home.parts.cave;
    for (let i = 0; i < 60 && !game.flags.pr_growth; i++) { game.step(0.25); P.settle(); }
    game.step(2.5); P.settle();
    return { growth: !!game.flags.pr_growth, lean: +C.lean.toFixed(2), fail: game.flags.pr_growth && C.lean > 0.9 ? null : 'growth did not move' };
  }],
  ['wake the crystals', () => {
    const G = game, h = G.hero, R = G.room, out = [];
    for (const tg of R.ballTargets) for (let k = 0; k < 6 && !tg.node.lit; k++) {
      const a = k * 1.05; P.go(tg.x - Math.cos(a) * 4, tg.z - Math.sin(a) * 4, { tol: 0.8, maxT: 40 }); P.settle();
      P.throwAt(tg.x, tg.z); P.settle(); out.push(tg.node.lit);
    }
    P.wait(1.5); P.settle();
    return { nodes: G.flags.nodes, barrier: R.barrier.c.enabled, fail: G.flags.nodes >= 3 && !R.barrier.c.enabled ? null : 'crystals' };
  }],
  ['to the vein: Sendell', () => { const R = game.room; const r = P.go(R.chamberX + 1.5, R.vein.z, { tol: 0.8, maxT: 60 }); P.settle(200); P.settle(60); return { r: r.r, done: game.flags.prologueDone, chapter: game.flags.chapterKey, fail: game.flags.chapterKey === 'project' ? null : 'no chapter 2' }; }],
];
