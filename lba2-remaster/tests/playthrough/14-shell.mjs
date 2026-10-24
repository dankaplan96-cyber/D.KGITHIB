// Chapter 11 (The Shell) to the end: the bore's machinery (the cooling diagram, valves A and C, the ball switch for
// the ladder), the crystal galleries (three pillars: ball), Sendell, the core (the guardian, three pylons from
// their plates, Vesk's overload coil), the epilogue: dinner, the end screen, Keep Exploring.
export const steps = [
  ['continue', () => { P.settle(); return { chapter: game.flags.chapterKey, room: game.room?.id }; }],
  ['down to the machinery', () => P.exitTo('c3-deep')],
  ['the cooling diagram', () => { const D = game.room; const r = P.use(D.diagram.x, D.diagram.z); return { ...r, diagram: game.flags.c3_diagram, fail: game.flags.c3_diagram ? null : 'diagram' }; }],
  ['valve A', () => { const v = game.room.valves.find((x) => x.id === 'A'); P.use(v.x, v.z); P.settle(); return { open: v.open }; }],
  ['the ball switch (ladder)', () => { const tg = game.room.ballTargets.find((x) => x.ballSwitch); return { done: P.hitTarget(tg, 3.5, { run: false, maxT: 40 }), ladder: game.flags.c3_ladder, fail: game.flags.c3_ladder ? null : 'ladder' }; }],
  // (valve C is up on the catwalk, right above the floor: up the lowered stair first, then along the catwalk)
  ['valve C on the catwalk', () => { const v = game.room.valves.find((x) => x.id === 'C'), L = game.room.ladder; P.go(L.x, L.z - 0.2, { tol: 0.4 }); P.go(L.x, L.z - 5.4, { tol: 0.4 }); P.use(v.x, v.z, { near: 1.0 }); P.wait(1); P.settle(); return { open: v.open, y: +game.hero.pos.y.toFixed(2), cooled: game.flags.c3_cooled, fail: game.flags.c3_cooled ? null : 'cooling' }; }],
  ['the galleries', () => P.exitTo('c3-gallery')],
  ['three pillars (ball)', () => { const out = game.room.ballTargets.filter((x) => x.pillar != null).map((tg) => P.hitTarget(tg, 3.5, { run: false, maxT: 40 })); return { out, fail: out.every(Boolean) ? null : 'pillars' }; }],
  // across the chasm on the raised stepping stones (flush with the shelves, 0.9 m gaps: Athletic hops, letting go of
  // Up early); fallen in, he first walks back up the rough ledges against the start cliff
  ['across the stepping stones', () => {
    const G = game, h = G.hero, R = G.room, st = R.stones.sets.flat(), c0 = st[2].c, top = st[0].top, tries = [];
    for (let attempt = 0; attempt < 3 && !(h.pos.x > c0.x + 5 && Math.abs(h.pos.y - top) < 0.3); attempt++) {
      const out = [];
      if (h.pos.y < top - 1) { for (let i = 1; i <= 7; i++) P.go(c0.x - 5 + 0.65, c0.z + 9.3 - (i - 1) * 0.72, { tol: 0.35, maxT: 20 }); P.go(c0.x - 6.2, c0.z + 4.6, { tol: 0.5 }); }   // up the ledges, one by one
      P.go(st[0].c.x - 1.9, st[0].c.z + 1.0, { tol: 0.4 });                                                      // the start shelf's edge
      if (Math.abs(h.pos.y - top) > 0.3) { tries.push({ shelf: false, y: +h.pos.y.toFixed(2) }); continue; }
      for (const s of st) { let y = 0; for (let k = 0; k < 2; k++) { y = P.hopTo(s.c.x, s.c.z, top, { walk: false, brake: 1.0, from: 1.6 }); if (Math.abs(y - top) < 0.3 || h.pos.y < top - 1) break; } out.push(+y.toFixed(2)); if (h.pos.y < top - 1) break; P.go(s.c.x, s.c.z, { tol: 0.2, maxT: 3, fight: false }); }
      if (h.pos.y > top - 1) out.push(P.hopTo(c0.x + 5 + 1.2, c0.z - 1.9, top, { walk: false, brake: 1.0 }));
      tries.push(out);
    }
    // (the bot's hops are unreliable; the crossing was made by input in an earlier run — QA.md. Under ASSIST, after three
    // failed attempts it is placed on the far shelf: logged as ISO, never counted as input)
    let iso = false; if (P.assist && !(h.pos.x > c0.x + 5 && Math.abs(h.pos.y - top) < 0.3)) { h.pos.set(c0.x + 6.2, top, c0.z - 1.9); h.vel.set(0, 0); h.vy = 0; h.onGround = true; G.step(0.3); iso = true; P.note('ISO assist: placed on the far shelf of the stepping stones'); }
    return { tries, iso, x: +h.pos.x.toFixed(1), fail: h.pos.x > c0.x + 5 && Math.abs(h.pos.y - top) < 0.3 ? null : 'stones' };
  }],
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
  // the coil: three ball hits while the overloaded guardian fights (input; the bot aims at the coil, not the guardian)
  ['Vesk\'s overload coil', () => { const G = game; P.settle(); const tg = G.room.ballTargets.find((x) => x.coil); for (let k = 0; tg && k < 4 && !tg.done && !G.hero.dead && !(P.assist && G.hero.hp <= 3); k++) P.hitTarget(tg, 3.5, { run: false, maxT: 40, fight: false, tries: P.assist ? 2 : 6 });
    // (under ASSIST, after the bot's own tries: the remaining coil hits through the story's own hit — logged ISO)
    if (P.assist && tg && !tg.done && !G.hero.dead) { for (let n = 0; n < 3 && !tg.done; n++) { G.story.cur.hitCoil(tg); P.settle(); } P.note('ISO assist: the overload coil broken'); }
    P.settle(60); return { coil: G.flags.c3_coil, turned: G.flags.c3_turned, fail: G.flags.c3_turned ? null : 'coil' }; }, null, { retryFrom: 'the core' }],
  ['the epilogue', () => { const G = game; let t = 0; while (G.state !== 'ending' && t < 120) { G.step(0.25); t += 0.25; if (G.state === 'dialog' || G.state === 'cutscene') P.settle(); } return { state: G.state, title: document.querySelector('#ending h1')?.textContent, fail: G.state === 'ending' ? null : 'no ending' }; }],
  ['Keep Exploring', () => { const b = [...document.querySelectorAll('#ending button')].find((x) => x.offsetParent && /explor/i.test(x.textContent)); b?.click(); game.step(0.5); P.settle(); return { state: game.state, free: game.flags.ep_free, obj: P.state().obj }; }],
];
