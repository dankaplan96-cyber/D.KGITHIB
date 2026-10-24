// Chapter 6 (The Pass, Hamalayi): the frozen tree felled over the gorge (ball) and walked across, Lhar,
// Yorna, the heating station needs a fuse, Pim's kite (ball) → the fuse, the heat on, the lift: the frozen
// mooring rope (the sword), two winch trips (the ice mites between), ride up, on to the monastery.
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
  ['winch: trip 1', () => { const G = game, w = G.rooms.hamalayi.lift.winch; P.use(w.x, w.z); let t = 0; while (!G.flags.c6_trip1 && t < 40) { G.step(0.1); t += 0.1; if (G.state !== 'play') P.settle(); } return { trip1: G.flags.c6_trip1, fail: G.flags.c6_trip1 ? null : 'trip1' }; }],
  ['the ice mites', () => P.fight({ maxT: 120 })],
  ['winch: trip 2', () => { const G = game, w = G.rooms.hamalayi.lift.winch; P.use(w.x, w.z); let t = 0; while (!G.flags.c6_trip2 && t < 40) { G.step(0.1); t += 0.1; if (G.state !== 'play') P.settle(); } return { trip2: G.flags.c6_trip2, fail: G.flags.c6_trip2 ? null : 'trip2' }; }],
  ['ride up', () => { const G = game, p = G.rooms.hamalayi.lift.pad; P.go(p.x, p.z, { tol: 0.6 }); let t = 0; while (!G.flags.c6_up && t < 30) { G.step(0.1); t += 0.1; } P.settle(); return { up: G.flags.c6_up, y: +G.hero.pos.y.toFixed(1), fail: G.flags.c6_up ? null : 'ride' }; }],
  ['to the monastery → chapter 7', () => { const M = game.rooms.hamalayi.monastery.yard; P.go(M.x, M.z, { tol: 2, maxT: 200 }); P.settle(60); P.settle(30); return { chapter: game.flags.chapterKey, fail: game.flags.chapterKey === 'observatory' ? null : 'no chapter 7' }; }],
];
