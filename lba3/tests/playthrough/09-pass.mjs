// Chapter 6 (The Pass, Hamalayi): the frozen tree felled over the gorge (ball) and walked across, Lhar,
// Yorna, the heating station needs a fuse, Pim's kite (ball) → the fuse, the heat on, the lift: the frozen
// mooring rope (the sword), two winch trips (the ice mites between), ride up, on to the monastery.
// CAMPAIGN-5 (story/passline.js; a game with the thread, ps_v): the line kicks three and a rest; each trip's riders board
// (the first time a kick comes as they stand there: he reads it), then he cranks when the line's gauge drops into the green;
// up top he locks the upper brake and the last of Lhar come up. A save without the thread plays the old trips.
export const steps = [
  ['continue (Hamalayi)', () => { P.settle(); return { chapter: game.flags.chapterKey, room: game.room?.id }; }],
  ['fell the tree over the gorge (ball)', () => {
    const tg = game.room.ballTargets.find((t) => t.tree);
    for (let k = 0; k < 6 && !tg.done; k++) { const a = k * 1.05; P.go(tg.x - Math.sin(a) * 4, tg.z - Math.cos(a) * 4, { tol: 0.8, run: true, maxT: 60 }); P.settle(); P.tap('F1'); P.throwAt(tg.x, tg.z); P.settle(); }
    P.wait(2); P.settle(); return { bridge: game.flags.c6_bridge, fail: game.flags.c6_bridge ? null : 'tree' };
  }],
  // up the switchback trail a player follows (its cairns and rope rail: hamalayi.js TRAIL, region at x+4300), then Lhar
  ['across to Lhar', () => { const L = game.rooms.hamalayi.lhar; for (const [x, z] of [[16, 34], [30, 25], [24, 15], [12, 9]]) P.go(4300 + x, z, { tol: 1.5, maxT: 60 }); const r = P.go(L.x, L.z + 8, { tol: 2, maxT: 180 }); P.settle(); return { r: r.r, lhar: game.flags.c6_lhar, fail: game.flags.c6_lhar ? null : 'lhar' }; }],
  ['Yorna', () => ({ ...P.talk('yorna', { run: true }), yorna: game.flags.c6_yorna, fail: game.flags.c6_yorna ? null : 'yorna' })],
  ['the heating station', () => { const p = game.rooms.hamalayi.heatPost; const r = P.use(p.x, p.z, { run: true }); return { ...r, needFuse: game.flags.c6_needFuse, fail: game.flags.c6_needFuse ? null : 'station' }; }],
  ['Pim', () => ({ ...P.talk('pim', { run: true }), kiteAsk: game.flags.c6_kiteAsk })],
  ['the kite (ball)', () => { const tg = game.room.ballTargets.find((t) => t.kite); for (let k = 0; k < 6 && !game.flags.c6_kite; k++) { const a = k * 1.05; P.go(tg.x - Math.sin(a) * 4, tg.z - Math.cos(a) * 4, { tol: 0.8, run: true, maxT: 60 }); P.settle(); P.tap('F1'); P.throwAt(tg.x, tg.z); P.settle(); } return { kite: game.flags.c6_kite, fail: game.flags.c6_kite ? null : 'kite' }; }],
  ['Pim: the fuse', () => ({ ...P.talk('pim', { run: true }), fuse: game.flags.c6_fuse, fail: game.flags.c6_fuse ? null : 'fuse' })],
  ['the heat on', () => { const p = game.rooms.hamalayi.heatPost; const r = P.use(p.x, p.z, { run: true }); P.wait(5); P.settle(); return { ...r, heat: game.flags.c6_heat, fail: game.flags.c6_heat ? null : 'heat' }; }],
  ['Yorna: the lift', () => ({ ...P.talk('yorna', { run: true }), ready: game.flags.c6_liftReady, fail: game.flags.c6_liftReady ? null : 'lift' })],
  ['the frozen rope (sword)', () => {
    const G = game, h = G.hero, R = G.story.cur.rope;
    P.go(R.x - 1.2, R.z, { tol: 0.5 }); P.face(R.x, R.z);
    if (h.combat.weapon !== 'sword') P.tap('KeyR', 0.1);
    for (let k = 0; k < 4 && !G.flags.c6_rope; k++) { P.tap('KeyK', 0.8); P.settle(); }
    return { sword: h.hasSword, weapon: h.combat.weapon, rope: G.flags.c6_rope, fail: G.flags.c6_rope ? null : 'rope' };
  }],
  // (the trip: board the riders at the winch (E), then the crank (E) once the gauge's needle has dropped into the green)
  ['winch: trip 1', () => {
    const G = game, f = G.flags, M = G.rooms.hamalayi, L = M.line, T = G.story._ps;
    if (!f.ps_v) { const w = M.lift.winch; P.use(w.x, w.z); let t = 0; while (!f.c6_trip1 && t < 40) { G.step(0.1); t += 0.1; if (G.state !== 'play') P.settle(); } return { trip1: f.c6_trip1, fail: f.c6_trip1 ? null : 'trip1' }; }
    const out = { tries: 0, boards: 0 };
    for (let k = 0; k < 6 && !f.c6_trip1; k++) {
      const p = L.crank.touch();
      if (T.boarded !== 1) { P.use(p.front.x, p.front.z, { kind: 'ps_winch', near: 0.6 }); P.settle(); out.boards++; continue; }
      let t = 0; while (!(L.green() && L.phase() < L.surge + 0.8) && t < 15) { G.step(0.1); t += 0.1; }   // (the needle in the green)
      P.face(p.x, p.z); P.tap('KeyE', 0.1); out.tries++;
      for (let i = 0; i < 400 && !f.c6_trip1 && (T.run || T.busy || G.state !== 'play'); i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
    }
    P.settle();
    return { ...out, read: !!f.ps_read, miss: f.ps_miss || 0, trip1: f.c6_trip1, fail: f.c6_trip1 ? null : 'trip1' };
  }],
  ['the ice mites', () => P.fight({ maxT: 120 })],
  ['winch: trip 2', () => {
    const G = game, f = G.flags, M = G.rooms.hamalayi, L = M.line, T = G.story._ps;
    if (!f.ps_v) { const w = M.lift.winch; P.use(w.x, w.z); let t = 0; while (!f.c6_trip2 && t < 40) { G.step(0.1); t += 0.1; if (G.state !== 'play') P.settle(); } return { trip2: f.c6_trip2, fail: f.c6_trip2 ? null : 'trip2' }; }
    const out = { tries: 0, boards: 0 };
    for (let k = 0; k < 6 && !f.c6_trip2; k++) {
      const p = L.crank.touch();
      if (T.boarded !== 2) { P.use(p.front.x, p.front.z, { kind: 'ps_winch', near: 0.6 }); P.settle(); out.boards++; continue; }
      let t = 0; while (!(L.green() && L.phase() < L.surge + 0.8) && t < 15) { G.step(0.1); t += 0.1; }
      P.face(p.x, p.z); P.tap('KeyE', 0.1); out.tries++;
      for (let i = 0; i < 400 && !f.c6_trip2 && (T.run || T.busy || G.state !== 'play'); i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
    }
    P.settle();
    return { ...out, miss: f.ps_miss || 0, trip2: f.c6_trip2, fail: f.c6_trip2 ? null : 'trip2' };
  }],
  // (Yorna cranks him up in a quiet: he stands on the platform until she does)
  ['ride up', () => { const G = game, p = G.rooms.hamalayi.lift.pad; P.go(p.x, p.z, { tol: 0.6 }); let t = 0; while (!G.flags.c6_up && t < 40) { G.step(0.1); t += 0.1; } P.settle(); return { up: G.flags.c6_up, y: +G.hero.pos.y.toFixed(1), fail: G.flags.c6_up ? null : 'ride' }; }],
  ['the upper brake (the last of Lhar)', () => {
    const G = game, f = G.flags, L = G.rooms.hamalayi.line, T = G.story._ps;
    if (!f.ps_v) return { skip: 'no thread' };
    const b = L.brake.touch(); P.use(b.front.x, b.front.z, { kind: 'ps_brake', near: 0.6 });
    for (let i = 0; i < 400 && (T.busy || T.run || G.state !== 'play'); i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
    P.settle();
    return { safe: !!f.ps_safe, brake: L.brake.on, fail: f.ps_safe ? null : 'brake' };
  }],
  ['to the monastery → chapter 7', () => { const M = game.rooms.hamalayi.monastery.yard; P.go(M.x, M.z, { tol: 2, maxT: 200 }); P.settle(60); P.settle(30); return { chapter: game.flags.chapterKey, fail: game.flags.chapterKey === 'observatory' ? null : 'no chapter 7' }; }],
];
