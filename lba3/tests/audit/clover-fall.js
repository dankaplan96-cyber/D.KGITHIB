// RELEASE-AUDIT-v96 (for tests/lib/try.mjs, LOAD=<chain save-04>): a clover's revive after a hard landing.
// ISO placement for isolation (not progression evidence): Twinsen on the cliff top east of the beam pad (3.4, -65.8,
// ground ~11 m), life set to HP (default 2), three clovers; Up held east for 1.5 s: he walks off the edge, falls ~11 m,
// the landing costs 2 life (actors.js: a landing faster than 13 m/s). With HP 2 that is 0: a clover should revive him
// to full life (actors.js damage: knockdown, then the get-up restores hp). Read 6 s later. Run twice: HP=2 and HP=6.
(() => {
  const g = game, h = g.hero, out = {};
  for (const hp0 of [2, 6]) {
    const ground = g.physics.groundAt(3.4, -65.8, 20);
    h.pos.set(3.4, ground, -65.8); h.resetMotion?.(); h.angle = Math.PI / 2; h.hp = hp0; h.clovers = 3; h.dead = false; g.step(0.3);
    g.input.keys.add('ArrowUp'); g.step(1.5); P.release();
    const atLand = { hp: h.hp, clovers: h.clovers, y: +h.pos.y.toFixed(2) };
    g.step(6);
    out['hp' + hp0] = { atLand, after6s: { hp: h.hp, maxHp: h.maxHp, clovers: h.clovers, dead: !!h.dead, state: g.state } };
    if (g.state === 'gameover') break;
  }
  return out;
})();
