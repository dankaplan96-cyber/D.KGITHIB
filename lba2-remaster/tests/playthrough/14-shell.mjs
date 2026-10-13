// Chapter 11 (The Shell) to the end: the bore's machinery (the cooling diagram, valves A and C, the ball switch for
// the ladder), the crystal galleries (three pillars: ball), Sendell, the core (the guardian, three pylons from
// their plates, Vesk's overload coil), the epilogue: dinner, the end screen, Keep Exploring.
export const steps = [
  ['continue', () => { P.settle(); return { chapter: game.flags.chapterKey, room: game.room?.id }; }],
  ['down to the machinery', () => P.exitTo('c3-deep')],
  ['the cooling diagram', () => { const D = game.room; const r = P.use(D.diagram.x, D.diagram.z); return { ...r, diagram: game.flags.c3_diagram, fail: game.flags.c3_diagram ? null : 'diagram' }; }],
  ['valve A', () => { const v = game.room.valves.find((x) => x.id === 'A'); P.use(v.x, v.z); P.settle(); return { open: v.open }; }],
  ['the ball switch (ladder)', () => { const tg = game.room.ballTargets.find((x) => x.ballSwitch); return { done: P.hitTarget(tg, 3.5, { run: false, maxT: 40 }), ladder: game.flags.c3_ladder, fail: game.flags.c3_ladder ? null : 'ladder' }; }],
  ['valve C on the catwalk', () => { const v = game.room.valves.find((x) => x.id === 'C'); P.use(v.x, v.z, { near: 1.0 }); P.wait(1); P.settle(); return { open: v.open, y: +game.hero.pos.y.toFixed(2), cooled: game.flags.c3_cooled, fail: game.flags.c3_cooled ? null : 'cooling' }; }],
  ['the galleries', () => P.exitTo('c3-gallery')],
  ['three pillars (ball)', () => { const out = game.room.ballTargets.filter((x) => x.pillar != null).map((tg) => P.hitTarget(tg, 3.5, { run: false, maxT: 40 })); return { out, fail: out.every(Boolean) ? null : 'pillars' }; }],
  ['Sendell', () => { P.exitTo('c3-sendell'); P.settle(); return { sendell: game.flags.c3_sendell, fail: game.flags.c3_sendell ? null : 'sendell' }; }],
  ['the core', () => { P.exitTo('c3-core'); P.settle(); return { fight: game.flags.c3_fight, room: game.room?.id }; }],
  ['the pylons from their plates', () => {
    const G = game, out = [];
    for (const p of G.story.cur.plates()) {
      const tg = G.room.ballTargets.find((x) => x.pylon === p.i);
      for (let k = 0; k < 4 && !tg.done; k++) { P.go(p.x, p.z, { tol: 0.4, maxT: 40 }); P.wait(0.6); P.tap('F1'); P.tap('KeyF', 0.05); G.step(1.6); P.settle(); }
      out.push(tg.done);
    }
    P.settle(); return { pylons: out, fail: out.every(Boolean) ? null : 'pylons' };
  }],
  ['Vesk\'s overload coil', () => { const G = game; P.settle(); const tg = G.room.ballTargets.find((x) => x.coil); for (let k = 0; tg && k < 4 && !tg.done; k++) P.hitTarget(tg, 3.5, { run: false, maxT: 40 }); P.settle(60); return { coil: G.flags.c3_coil, turned: G.flags.c3_turned, fail: G.flags.c3_turned ? null : 'coil' }; }],
  ['the epilogue', () => { const G = game; let t = 0; while (G.state !== 'ending' && t < 120) { G.step(0.25); t += 0.25; if (G.state === 'dialog' || G.state === 'cutscene') P.settle(); } return { state: G.state, title: document.querySelector('#ending h1')?.textContent, fail: G.state === 'ending' ? null : 'no ending' }; }],
  ['Keep Exploring', () => { const b = [...document.querySelectorAll('#ending button')].find((x) => x.offsetParent && /explor/i.test(x.textContent)); b?.click(); game.step(0.5); P.settle(); return { state: game.state, free: game.flags.ep_free, obj: P.state().obj }; }],
];
