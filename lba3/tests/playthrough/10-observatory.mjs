// Chapter 7 (The Observatory, Hamalayi): up to the observatory, the keeper, the frozen second window (ball), the four mirrors carry both beams,
// (CAMPAIGN-5: the telescope's fourth setting follows the snow fields' shaking; its ring read), the telescope, out, the heavy drone at the vent (ball), the seal's two iced discs (ball), the vent opened, back to the monastery gate.
export const steps = [
  ['continue', () => { P.settle(); return { chapter: game.flags.chapterKey, room: game.room?.id }; }],
  // (THE SECOND SHIFT, part 2: on the peak Sefa is out at his signalling shutter; the old roof, Pim, the goats; the shutter
  //  taken and swung (left, then nearer, then right) until Tashi answers from the lift's top landing; Sefa goes in)
  ['the shutter', () => {
    const G = game, f = G.flags, S = G.rooms.hamalayi?.shutter, T = G.story.cur.roof, h = G.hero;
    if (!S || !f.rf_v || f.rf_roof) return { skip: true };
    for (let k = 0; k < 5 && Math.hypot(h.pos.x - S.x, h.pos.z - S.z) > 9 && !T.busy; k++) { P.go(S.x + 3, S.z - 7, { tol: 1.0, maxT: 200, stopWhen: () => G.state === 'dialog' }); P.settle(); }
    for (let i = 0; i < 900 && !f.rf_shut; i++) { if (G.state === 'dialog') P.settle(); else G.step(0.1); }
    P.settle(); P.use(S.sefa.x, S.sefa.z, { near: 0.5, kind: 'rf_shutter' }); for (let i = 0; i < 40 && !T.hold; i++) G.step(0.1);
    const keys = G.input.keys;
    for (const key of ['ArrowLeft', 'ArrowDown', 'ArrowRight']) { keys.add(key); for (let i = 0; i < 300 && !f.rf_roof; i++) G.step(1 / 30); keys.delete(key); if (f.rf_roof) break; }
    for (let i = 0; i < 300 && (G.state === 'dialog' || T.walk || T.later.length); i++) { if (G.state === 'dialog') P.settle(); else G.step(0.1); }
    return { roof: !!f.rf_roof, fail: f.rf_roof ? null : 'shutter' };
  }],
  // (CAMPAIGN-5: out of the yard the snow shakes beside him and he says so: read it, as a player would, and walk on)
  ['into the observatory', () => { const d = game.rooms.hamalayi.observatory.door; let r = P.through(d.x, d.z, { run: true }); for (let k = 0; k < 2 && game.room?.id !== 'obsv'; k++) { P.settle(); r = P.through(d.x, d.z, { run: true }); } return { ...r, snow: !!game.flags.ob_snow, fail: game.room?.id === 'obsv' ? null : 'observatory' }; }],
  ['the keeper', () => ({ ...P.talk('keeper'), keeper: game.flags.c7_keeper, fail: game.flags.c7_keeper ? null : 'keeper' })],
  ['the frozen window (ball)', () => {
    // (CHAPTER-BALANCE: the second sun's slit in the back wall is iced over; the ball breaks it, thrown from the floor before it)
    const G = game, I = G.rooms.obsv.ice;
    for (let k = 0; k < 6 && !G.flags.c7_ice; k++) { const a = -0.35 - k * 0.15; P.go(I.x + Math.sin(a) * 3.0, I.z + Math.cos(a) * 3.0, { tol: 0.4, maxT: 30 }); P.settle(); P.throwAt(I.x, I.z); P.settle(); }
    return { ice: !!G.flags.c7_ice, fail: G.flags.c7_ice ? null : 'ice' };
  }],
  ['the mirrors', () => { const G = game, O = G.rooms.obsv; for (let pass = 0; pass < 3 && !G.flags.c7_lit; pass++) for (const m of O.mirrors) { if (G.flags.c7_lit) break; P.use(m.x, m.z, { near: 1.0 }); P.wait(0.5); P.settle(); } return { lit: G.flags.c7_lit, fail: G.flags.c7_lit ? null : 'mirrors' }; }],
  // CAMPAIGN-5 (a game with the thread, ob_v): the telescope's fourth setting (the lever, by hand), its follow, the ring read
  ['the telescope: the fourth setting', () => {
    const G = game, f = G.flags, T = G.story._ps, O = G.rooms.obsv;
    if (!f.ob_v) return { skip: 'no thread' };
    const p = O.telescope.lever.touch(); P.use(p.front.x, p.front.z, { kind: 'ob_set', near: 0.6 });
    for (let i = 0; i < 200 && (T.follow || T.busy || G.state !== 'play'); i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
    P.settle();
    return { set: O.telescope.n, followed: T.followed, fail: T.followed ? null : 'follow' };
  }],
  ['the telescope: read the ring', () => {
    const G = game, f = G.flags, O = G.rooms.obsv;
    if (!f.ob_v) return { skip: 'no thread' };
    P.use(O.telescope.ring.x, O.telescope.ring.z, { kind: 'ob_read', near: 0.8 }); P.settle();
    return { dir: !!f.ob_dir, fail: f.ob_dir ? null : 'ring' };
  }],
  ['the telescope', () => { const O = game.rooms.obsv; const r = P.use(O.telescope.x, O.telescope.z); return { ...r, scope: game.flags.c7_scope, fail: game.flags.c7_scope ? null : 'scope' }; }],
  ['out', () => { const e = game.room.exits.find((x) => x.to === 'obs-out') || game.room.exits[0]; return P.through(e.x, e.z); }],
  ['the heavy drone at the vent', () => { const G = game, V = G.rooms.hamalayi.vent; P.go(V.x + 8, V.z + 8, { tol: 2, run: true, maxT: 120 }); P.settle(); const r = P.fight({ maxT: 180, range: 6 }); const d = G.story.cur.heavy?.(); return { ...r, drone: d ? d.alive : null, fail: d && d.alive ? 'drone' : null }; }],
  // (PUZZLES P-B, 20.11, changed on purpose: the seal turns only with all five discs breathing; three steam already, the
  // two under ice are freed with the ball, each thrown at from the ice outside the rim)
  ['the seal\'s iced discs (ball)', () => {
    const G = game, M = G.rooms.hamalayi, V = M.vent, out = [];
    for (const D of M.ventDiscs.filter((d) => !d.warm)) for (let k = 0; k < 5 && !D.free; k++) {
      const a = Math.atan2(D.x - V.x, D.z - V.z) + (k - 2) * 0.35, x = D.x + Math.sin(a) * 3.5, z = D.z + Math.cos(a) * 3.5;
      P.go(x, z, { tol: 0.6, maxT: 20, run: true }); P.settle(); P.throwAt(D.x, D.z); P.settle(); out.push(D.free);
    }
    const n = M.ventDiscs.filter((d) => d.breathing).length;
    return { n, tries: out.length, fail: n >= 5 ? null : 'discs' };
  }],
  ['the vent', () => { const V = game.rooms.hamalayi.vent; const r = P.use(V.x + 2.8, V.z, { near: 1.2 }); P.wait(2); P.settle(); return { ...r, vent: game.flags.c7_vent, fail: game.flags.c7_vent ? null : 'vent' }; }],
  ['the monastery gate → chapter 8', () => { const g = game.rooms.hamalayi.monastery.gate; P.go(g.x, g.z + 1, { tol: 1, run: true, maxT: 200 }); P.settle(60); P.settle(30); return { chapter: game.flags.chapterKey, room: game.room?.id, fail: game.flags.chapterKey === 'evacuation' ? null : 'no chapter 8' }; }],
];
