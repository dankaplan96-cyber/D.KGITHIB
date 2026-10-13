// Chapter 4 (The Dig, Desert Island): Mother Tarra and the wind-pump's three gears (ball), Hesk and the rope,
// the sand-yacht to Ilka's camp, the notebook from the research post in a sandstorm, the dig's gate, down the
// terraces, the three seals (ball), into the Temple of Bù, the great carving.
export const steps = [
  ['continue (Desert Island)', () => { P.settle(); return { room: game.room?.id, chapter: game.flags.chapterKey }; }],
  ['Mother Tarra', () => ({ ...P.talk('tarra', { run: true }), task: game.flags.c4_pumpTask, fail: game.flags.c4_pumpTask ? null : 'tarra' })],
  ['the pump\'s three gears (ball)', () => {
    const G = game, out = [];
    for (const tg of G.room.ballTargets.filter((t) => t.gear != null)) {
      for (let k = 0; k < 6 && !tg.done; k++) { const a = k * 1.05; P.go(tg.x - Math.sin(a) * 4, tg.z - Math.cos(a) * 4, { tol: 0.8, run: true, maxT: 60 }); P.settle(); P.tap('F1'); P.throwAt(tg.x, tg.z); P.settle(); }
      out.push(tg.done);
    }
    P.wait(1.5); P.settle();
    return { gears: out, pump: G.flags.c4_pump, fail: G.flags.c4_pump ? null : 'pump' };
  }],
  ['Tarra trusts him', () => ({ ...P.talk('tarra', { run: true }), trust: game.flags.c4_trust, fail: game.flags.c4_trust ? null : 'trust' })],
  ['Hesk', () => ({ ...P.talk('hesk', { run: true }), ask: game.flags.c4_heskAsk })],
  ['the rope from the pier', () => { const R = game.rooms.desert.rope; const r = P.use(R.x, R.z, { run: true }); return { ...r, rope: game.flags.c4_rope, fail: game.flags.c4_rope ? null : 'rope' }; }],
  ['the sand-yacht to the camp', () => { const r = P.talk('hesk', { run: true }); P.settle(60); return { ...r, yacht: game.flags.c4_yacht, fail: game.flags.c4_yacht ? null : 'ride' }; }],
  ['Ilka', () => ({ ...P.talk('ilka', { run: true }), ilka: game.flags.c4_ilka, fail: game.flags.c4_ilka ? null : 'ilka' })],
  ['the notebook (in a sandstorm)', () => {
    const G = game, Post = G.rooms.desert.post;
    P.go(Post.gate.x + 6, Post.gate.z, { tol: 1.5, run: true });
    let t = 0; while (!G.story.cur.stormy && t < 120) { G.step(0.25); t += 0.25; if (G.state !== 'play') P.settle(); }
    const r = P.use(Post.desk.x, Post.desk.z, { near: 1.2 }); P.wait(1); P.settle();
    return { waited: t, stormy: G.story.cur.stormy, ...r, notebook: G.flags.c4_notebook, fail: G.flags.c4_notebook ? null : 'notebook' };
  }],
  ['the dig\'s gate', () => { const g = game.rooms.desert.dig.gate; const r = P.use(g.x, g.z, { run: true }); P.wait(1); P.settle(); return { ...r, open: game.flags.c4_digOpen, fail: game.flags.c4_digOpen ? null : 'gate' }; }],
  ['down to the bottom', () => { const D = game.rooms.desert.dig; let r; for (let k = 0; k < 4 && Math.abs(game.hero.pos.y - D.bottomY) >= 0.8; k++) { r = P.go(D.x + 1.5, D.z - 1.0, { tol: 1.0, maxT: 120 }); P.settle(); }   /* (a line on the way down: settle it, walk on) */ return { r: r.r, y: +game.hero.pos.y.toFixed(2), bottom: D.bottomY, fail: Math.abs(game.hero.pos.y - D.bottomY) < 0.8 ? null : 'not at the bottom' }; }],
  ['the three seals (ball)', () => {
    const G = game, out = [];
    for (const tg of G.room.ballTargets.filter((t) => t.seal != null)) {
      for (let k = 0; k < 6 && !tg.done; k++) { const a = k * 1.05; P.go(tg.x - Math.sin(a) * 3.5, tg.z - Math.cos(a) * 3.5, { tol: 0.8, maxT: 40 }); P.settle(); P.tap('F1'); P.throwAt(tg.x, tg.z); P.settle(); }
      out.push(tg.done);
    }
    P.wait(1); P.settle();
    return { seals: out, fail: out.every(Boolean) ? null : 'seals' };
  }],
  ['into the temple', () => { const d = game.rooms.desert.dig.door; const r = P.through(d.x, d.z); return { ...r, seen: game.flags.c4_templeSeen, fail: game.room?.id === 'butemple' ? null : 'temple' }; }],
  ['the great carving → chapter 5', () => { const c = game.rooms.butemple.carving; const r = P.use(c.x, c.z); P.settle(60); P.settle(30); return { ...r, carving: game.flags.c4_carving, chapter: game.flags.chapterKey, fail: game.flags.chapterKey === 'steam' ? null : 'no chapter 5' }; }],
];
