// Chapter 9 (The Council, Zeelich): the street folk, Baldino's petition, Nara's stamp, Oku's stamp (free the three
// mills: ball), the council house, the clerk, the hearing, the archive in a borrowed coat (the archivist's keys, the BORE cabinet),
// back to the council → chapter 10.
// CAMPAIGN-7 (story/cnline.js, a game with the thread, cn_v: every chapter-9 save has it, the stop being ahead): after the
// hearing the archive's door is shut by Vesk's standing order (read on the door); Kell takes him up his lift to the service
// door; the back gallery, down its stair while the archivist is on the far side; the coat, the keys, the BORE drawer (the
// log of test 14 and the order that cut it); his carbon laid on it (a game with the carbon); the vote orders the stop; the
// platform's console: the stop thrown (the BORE needle falls, the GROUND needle does not; Mill Lane goes dry); Baldino's
// bench: the isolator on one relay, then the other; Mill Lane: the isolator on Kell's feed → chapter 10.
export const steps = [
  ['continue', () => { P.settle(); return { chapter: game.flags.chapterKey, room: game.room?.id, thread: !!game.flags.cn_v }; }],
  ['street folk', () => ['zbee1', 'zmole1', 'ztri1'].map((id) => P.talk(id, { run: true }).r)],
  ['Baldino: the petition', () => { const r = P.talk('baldino', { run: true }); P.enter('zeelich'); return { ...r, form: game.flags.c9_form, fail: game.flags.c9_form ? null : 'petition' }; }],
  ['Nara', () => ({ ...P.talk('nara', { run: true }), nara: game.flags.c9_nara, fail: game.flags.c9_nara ? null : 'nara' })],
  ['Oku', () => ({ ...P.talk('oku', { run: true }), ask: game.flags.c9_okuAsk })],
  ['free the mills (ball)', () => { const G = game, f = G.flags; for (const m of G.rooms.zeelich.mills) for (let k = 0; k < 6 && !f['c9_free_' + m.id]; k++) { const a = k * 1.05; P.go(m.brake.x + Math.sin(a) * 6, m.brake.z + Math.cos(a) * 6, { tol: 1, run: true, maxT: 90 }); P.settle(); P.tap('F1'); P.throwAt(m.brake.x, m.brake.z); P.settle(); } return { free: G.story.cur.millsFree(), fail: G.story.cur.millsFree() >= 3 ? null : 'mills' }; }],
  ['Oku: the stamp', () => ({ ...P.talk('oku', { run: true }), oku: game.flags.c9_oku, fail: game.flags.c9_oku ? null : 'oku' })],
  ['the council house', () => { const d = game.rooms.zeelich.councilDoor; return P.through(d.x, d.z, { run: true }); }],
  ['the clerk', () => ({ ...P.talk('clerk'), clerk: game.flags.c9_clerk, fail: game.flags.c9_clerk ? null : 'clerk' })],
  ['the hearing', () => { P.exitTo('up-council'); P.wait(0.5); P.settle(); return { heard: game.flags.c9_heard, fail: game.flags.c9_heard ? null : 'hearing' }; }],
  // ---- CAMPAIGN-7: the way in is Kell's
  ['the archive\'s door: Vesk\'s standing order', () => { const f = game.flags; if (!f.cn_v) return { skip: 'no thread' };
    P.exitTo('council-out'); const r = P.exitTo('up-archive'); P.settle();
    return { r: r.r, room: game.room?.id, closed: f.cn_closed, fail: f.cn_closed === true && game.room?.id === 'upper' ? null : 'order' }; }],
  ['Mill Lane: Kell', () => { const G = game, f = G.flags; if (!f.cn_v) return { skip: 'no thread' };
    P.exitTo('up-down'); const r = P.talk('zl_kell', { run: true });
    for (let i = 0; i < 60 && G.story._cn.kell.busy; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
    return { ...r, ask: f.cn_kellAsk, fail: f.cn_kellAsk ? null : 'kell' }; }],
  ['up with Kell to the service door', () => { const G = game, f = G.flags; if (!f.cn_v) return { skip: 'no thread' };
    const L = G.rooms.zeelich.lift; const r = P.use(L.deck.x, L.deck.z, { near: 1.9, kind: 'cn_ride' });
    for (let i = 0; i < 300 && !(f.cn_kell && G.state === 'play'); i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
    return { r: r.r, kell: f.cn_kell, up: +(G.hero.pos.y - L.top).toFixed(2), fail: f.cn_kell === true ? null : 'ride' }; }],
  ['the service door → the back gallery', () => { const G = game, f = G.flags; if (!f.cn_v) return { skip: 'no thread' };
    const L = G.rooms.zeelich.lift; const r = P.use(L.service.x, L.service.z, { near: 0.9, kind: 'cn_service' });
    for (let i = 0; i < 60 && G.room?.id !== 'archive'; i++) { G.step(0.1); P.settle(); } P.settle();
    return { r: r.r, room: G.room?.id, y: +G.hero.pos.y.toFixed(2), fail: G.room?.id === 'archive' ? null : 'service door' }; }],
  // (from up there his whole round is in sight: as a player times it, down the stair while he walks the far (east) side
  //  south, his back to the stair, and on to the old door's corner before he turns west along the front)
  ['down from the gallery', () => { const G = game, f = G.flags; if (!f.cn_v || G.hero.pos.y < 1) return { skip: 'on the floor' };
    const A = G.rooms.archive, w = G.story.cur.watcher; let waited = 0, r;
    if (G.hero.behaviour !== 'normal') P.tap('F1');
    for (let k = 0; k < 3 && G.hero.pos.y > 1; k++) {
      for (let t = 0; w?.active && t < 60 && w.wp !== 2; t += 0.1) { G.step(0.1); waited += 0.1; if (G.state !== 'play') P.settle(); }
      r = P.sneakTo(A.spawn.x + 0.8, A.spawn.z, w, { tol: 0.8, maxT: 60 }); P.settle(); }
    return { r: r?.r, waited: +waited.toFixed(1), y: +G.hero.pos.y.toFixed(2), fail: G.hero.pos.y < 0.5 ? null : 'down' }; }],
  ['the archive: the coat', () => { if (game.room?.id !== 'archive') { P.exitTo('council-out'); P.exitTo('up-archive'); } P.settle(); const L = game.rooms.archive.locker; const r = P.use(L.x, L.z); return { ...r, coat: game.flags.c9_coat, disguised: game.hero.disguised, fail: game.flags.c9_coat ? null : 'coat' }; }],
  // (the archivist walks a loop whose near side runs along the cabinets, so crouching in his way only gets him walked
  // into. As a player times it: wait by the door till he has turned down the far side, away from the cabinets
  // (patrol[3] → patrol[0]), then straight to the BORE cabinet. Caught, he is sent back to the door: up to 3 times)
  // (CHAPTER-BALANCE: the BORE cabinet is locked; the key ring is on the archivist's desk by his round's near side. As a
  // player times it: wait by the door till he turns north up the far side (patrol[3] → patrol[0]), his back to the desk)
  // (CAMPAIGN-7: caught, he is sent back up to the gallery he came in by: down its stair again first, as above)
  ['the archivist\'s keys', () => { const G = game, A = G.rooms.archive, K = A.keys; let r, misses = 0, waited = 0;
    const down = () => { const w = G.story.cur.watcher; for (let j = 0; j < 3 && G.hero.pos.y > 1; j++) { for (let t = 0; w?.active && t < 60 && w.wp !== 2; t += 0.1) { G.step(0.1); waited += 0.1; if (G.state !== 'play') P.settle(); } P.sneakTo(A.spawn.x + 0.8, A.spawn.z, w, { tol: 0.8, maxT: 60 }); P.settle(); } };
    if (G.hero.behaviour !== 'normal') P.tap('F1');
    for (let k = 0; k < 4 && !G.flags.c9_key; k++) {
      down();
      const w = G.story.cur.watcher;
      for (let t = 0; w?.active && t < 90 && !(w.wp === 0 && w.npc.pos.z < A.patrol[3][1] - 0.4 && w.npc.pos.z > A.patrol[0][1] + 1.5 && w.suspicion < 0.2); t += 0.1) { G.step(0.1); waited += 0.1; if (G.state !== 'play') P.settle(); }
      r = P.use(K.x, K.z, { kind: 'c9key', near: 0.8, run: true }); P.settle(); if (!G.flags.c9_key) misses++; }
    if (G.flags.c9_key && G.room?.id === 'archive') { down(); P.go(A.spawn.x + 0.8, A.spawn.z, { tol: 0.8, run: true, fight: false }); P.settle(); }   // (back by the door, out of his round)
    return { ...r, misses, waited: +waited.toFixed(1), key: G.flags.c9_key, fail: G.flags.c9_key ? null : 'key' }; }],
  ['the BORE cabinet', () => { const G = game, A = G.rooms.archive, c = A.cabinets.find((x) => x.label === 'BORE'), f = G.flags; let r, misses = 0, waited = 0;
    const down = () => { const w = G.story.cur.watcher; for (let j = 0; j < 3 && G.hero.pos.y > 1; j++) { for (let t = 0; w?.active && t < 60 && w.wp !== 2; t += 0.1) { G.step(0.1); waited += 0.1; if (G.state !== 'play') P.settle(); } P.sneakTo(A.spawn.x + 0.8, A.spawn.z, w, { tol: 0.8, maxT: 60 }); P.settle(); } };
    const got = () => !!(f.c9_plans || f.cn_drawer);
    if (G.hero.behaviour !== 'normal') P.tap('F1');
    for (let k = 0; k < 4 && !got(); k++) {
      down();
      const w = G.story.cur.watcher, p0 = A.patrol[0], p3 = A.patrol[3];
      for (let t = 0; w?.active && t < 90 && !(w.wp === 0 && w.npc.pos.z < p3[1] - 0.4 && w.npc.pos.z > p0[1] + 1.5 && w.suspicion < 0.2); t += 0.1) { G.step(0.1); waited += 0.1; if (G.state !== 'play') P.settle(); }
      r = P.use(c.x, c.z, { kind: 'c9cab', near: 0.8, run: true }); P.settle(); if (!got()) misses++; }
    return { ...r, misses, waited: +waited.toFixed(1), plans: f.c9_plans, drawer: f.cn_drawer, fail: got() ? null : 'plans' }; }],
  ['the carbon laid on the log', () => { const G = game, f = G.flags; if (!f.cn_v || f.c9_plans) return { skip: f.cn_v ? 'no carbon in this game: the log taken as it is' : 'no thread', log: f.cn_log };
    const D = G.rooms.archive.drawer; const r = P.use(D.x, D.z, { near: 0.6, kind: 'cn_compare' });
    for (let i = 0; i < 80 && !f.cn_log; i++) { G.step(0.1); P.settle(); }
    return { r: r.r, log: f.cn_log, plans: f.c9_plans, fail: f.c9_plans ? null : 'compare' }; }],
  ['back to the council: the vote', () => { const f = game.flags; P.exitTo('archive-out'); P.exitTo('up-council'); P.settle(60); P.settle(30);
    if (!f.cn_v) return { vote: f.c9_vote, chapter: f.chapterKey, fail: f.chapterKey === 'network' ? null : 'no chapter 10' };
    return { vote: f.c9_vote, chapter: f.chapterKey, fail: f.c9_vote && f.chapterKey === 'council' ? null : 'vote' }; }],
  ['the platform: the guard, the stop', () => { const G = game, f = G.flags; if (!f.cn_v) return { skip: 'no thread' };
    P.exitTo('council-out'); P.exitTo('up-down'); const g = P.talk('guard', { run: true });
    const S = G.rooms.zeelich.platform.stop; const r = P.use(S.x, S.z, { kind: 'cn_stop', near: 0.8, run: true });
    for (let i = 0; i < 200 && !(f.cn_stop && G.state === 'play' && !G.story._cn.busy); i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
    const L = G.rooms.zeelich.lift;
    return { guard: g.r, r: r.r, stop: f.cn_stop, thrown: S.thrown, lane: { deck: +(L.deckY - L.y0).toFixed(2), water: L.state.water }, fail: f.cn_stop ? null : 'stop' }; }],
  ['the bench: the isolator, one relay then the other', () => { const G = game, f = G.flags; if (!f.cn_v) return { skip: 'no thread' };
    const e = P.enter('workshop', { run: true }); P.settle(); const T = G.rooms.workshop.life.terminals; const out = { e: e.r, got: f.cn_isoGot };
    for (const k of ['A', 'B']) { const r = P.use(T[k].x, T[k].z, { kind: 'cn_iso', near: 0.6 }); for (let i = 0; i < 60 && !f['cn_iso' + k]; i++) { G.step(0.1); P.settle(); } out[k] = [r.r, !!f['cn_iso' + k], G.rooms.workshop.life.state.iso]; }
    return { ...out, iso: f.cn_iso, fail: f.cn_iso ? null : 'isolator' }; }],
  ['Mill Lane: the isolator on Kell\'s feed → chapter 10', () => { const G = game, f = G.flags; if (!f.cn_v) return { skip: 'no thread' };
    P.enter('zeelich'); const L = G.rooms.zeelich.lift; const r = P.use(L.isoAt.x, L.isoAt.z, { kind: 'cn_clip', near: 0.6, run: true });
    for (let i = 0; i < 300 && f.chapterKey === 'council'; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
    P.settle(60); P.settle(30);
    return { r: r.r, lane: f.cn_lane, chapter: f.chapterKey, room: G.room?.id, fail: f.chapterKey === 'network' ? null : 'no chapter 10' }; }],
];
