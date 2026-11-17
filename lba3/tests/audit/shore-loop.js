// RELEASE-AUDIT-v96 (for tests/lib/try.mjs, LOAD=<chain save-04>): the east shore below the beam pad where the chain's
// Twinsen lost 2 life every ~5 s and his three clovers (05-damage-log). ISO placement (a bug isolation, not progression
// evidence): placed where the bot stood (3.4, -65.8), then Up held toward the east (as the bot walked) for 25 s, his
// height, speed and every damage call logged; then the same with a clover revive under way.
(() => {
  const g = game, h = g.hero, log = [];
  const d0 = h.damage.bind(h);
  h.damage = (n, from, ...a) => { const c0 = h.clovers, hp0 = h.hp; const r = d0(n, from, ...a); log.push({ t: +T.toFixed(2), n, hp: [hp0, h.hp], clovers: [c0, h.clovers], at: [h.pos.x, h.pos.y, h.pos.z].map((v) => +v.toFixed(2)), act: h.action || h.act?.name || null }); return r; };
  let T = 0;
  const ground = g.physics.groundAt(3.4, -65.8, 20);
  h.pos.set(3.4, ground, -65.8); h.resetMotion?.(); h.angle = Math.PI / 2; g.step(0.3);
  const path = [];
  g.input.keys.add('ArrowUp');
  for (let i = 0; i < 250; i++) { g.step(0.1); T += 0.1; if (i % 5 === 0) path.push([+T.toFixed(1), +h.pos.x.toFixed(2), +h.pos.y.toFixed(2), +h.pos.z.toFixed(2), h.hp, h.clovers, h.sliding ? 'slide' : h.onGround ? 'ground' : 'air']); }
  P.release();
  // the terrain round the spot: ground heights on a 1 m grid east-west
  const prof = []; for (let x = -4; x <= 12; x += 1) prof.push([x, +g.physics.groundAt(x, -65.8, 30).toFixed(2)]);
  return { ground: +ground.toFixed(2), dmg: log, path: path.slice(0, 60), prof };
})();
