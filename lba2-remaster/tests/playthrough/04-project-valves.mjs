// Chapter 2: the three bypass valves — the depot (guards, drones, a dog), the caged orchard valve (the ball's lob
// from the east), the Whispering Cliffs (hit the target, the stones rise, hop up them).
export const steps = [
  ['continue', () => P.settle()],
  ['orchard (ball over the cage)', () => {
    const v = game.world.valves.find((q) => q.id === 'orchard');
    for (let k = 0; k < 5 && !v.open; k++) { P.go(v.x + 7.5, v.z + (k - 2) * 0.8, { tol: 0.8, run: true, maxT: 90 }); P.settle(); P.tap('F1'); P.throwAt(v.x, v.z); P.settle(); }
    return { open: v.open, fail: v.open ? null : 'orchard' };
  }],
  ['depot (fight the guards on the way)', () => { const v = game.world.valves.find((q) => q.id === 'depot'); const r = P.use(v.x, v.z, { near: 1.3, run: true }); P.wait(1); P.settle(); return { ...r, open: v.open, hp: game.hero.hp, clovers: game.hero.clovers, fail: v.open ? null : 'depot' }; }],
  ['cliffs: the target', () => {
    const T = game.world.target;
    for (let k = 0; k < 6 && !T.hit; k++) { const a = Math.PI + (k - 2.5) * 0.4; P.go(T.x + Math.sin(a) * 7, T.z + Math.cos(a) * 7, { tol: 1, run: true, maxT: 90 }); P.settle(); P.tap('F1'); P.throwAt(T.x, T.z); P.settle(); }
    P.wait(3); P.settle();
    return { hit: T.hit, fail: T.hit ? null : 'target' };
  }],
  ['cliffs: up the stones', () => {
    const G = game, W = G.world, h = G.hero; let i = 0, tries = 0;
    while (i < W.stones.length && tries < 30) {
      const s = W.stones[i]; tries++;
      const y = P.hopTo(s.c.x, s.c.z, s.c.top);
      if (Math.abs(y - s.c.top) < 0.3 && Math.hypot(h.pos.x - s.c.x, h.pos.z - s.c.z) < s.c.r) i++;
      else { const j = W.stones.findIndex((q) => Math.abs(h.pos.y - q.c.top) < 0.3 && Math.hypot(h.pos.x - q.c.x, h.pos.z - q.c.z) < q.c.r); i = j + 1; }
    }
    return { reached: i, of: W.stones.length, tries, y: +h.pos.y.toFixed(2), fail: i >= W.stones.length ? null : 'stones' };
  }],
  ['cliffs: the valve', () => { const v = game.world.valves.find((q) => q.id === 'cliff'); const r = P.use(v.x, v.z, { near: 1.3 }); P.wait(2.5); P.settle(); return { ...r, open: v.open, water: game.flags.c1_water, fail: game.flags.c1_water ? null : 'no water' }; }],
];
