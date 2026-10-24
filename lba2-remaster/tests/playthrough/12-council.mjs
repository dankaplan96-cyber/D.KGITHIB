// Chapter 9 (The Council, Zeelich): the street folk, Baldino's petition, Nara's stamp, Oku's stamp (free the three
// mills: ball), the council house, the clerk, the hearing, the archive in a borrowed coat (the BORE cabinet),
// back to the council → chapter 10.
export const steps = [
  ['continue', () => { P.settle(); return { chapter: game.flags.chapterKey, room: game.room?.id }; }],
  ['street folk', () => ['zbee1', 'zmole1', 'ztri1'].map((id) => P.talk(id, { run: true }).r)],
  ['Baldino: the petition', () => { const r = P.talk('baldino', { run: true }); P.enter('zeelich'); return { ...r, form: game.flags.c9_form, fail: game.flags.c9_form ? null : 'petition' }; }],
  ['Nara', () => ({ ...P.talk('nara', { run: true }), nara: game.flags.c9_nara, fail: game.flags.c9_nara ? null : 'nara' })],
  ['Oku', () => ({ ...P.talk('oku', { run: true }), ask: game.flags.c9_okuAsk })],
  ['free the mills (ball)', () => { const G = game, f = G.flags; for (const m of G.rooms.zeelich.mills) for (let k = 0; k < 6 && !f['c9_free_' + m.id]; k++) { const a = k * 1.05; P.go(m.brake.x + Math.sin(a) * 6, m.brake.z + Math.cos(a) * 6, { tol: 1, run: true, maxT: 90 }); P.settle(); P.tap('F1'); P.throwAt(m.brake.x, m.brake.z); P.settle(); } return { free: G.story.cur.millsFree(), fail: G.story.cur.millsFree() >= 3 ? null : 'mills' }; }],
  ['Oku: the stamp', () => ({ ...P.talk('oku', { run: true }), oku: game.flags.c9_oku, fail: game.flags.c9_oku ? null : 'oku' })],
  ['the council house', () => { const d = game.rooms.zeelich.councilDoor; return P.through(d.x, d.z, { run: true }); }],
  ['the clerk', () => ({ ...P.talk('clerk'), clerk: game.flags.c9_clerk, fail: game.flags.c9_clerk ? null : 'clerk' })],
  ['the hearing', () => { P.exitTo('up-council'); P.wait(0.5); P.settle(); return { heard: game.flags.c9_heard, fail: game.flags.c9_heard ? null : 'hearing' }; }],
  ['the archive: the coat', () => { P.exitTo('council-out'); P.exitTo('up-archive'); P.settle(); const L = game.rooms.archive.locker; const r = P.use(L.x, L.z); return { ...r, coat: game.flags.c9_coat, disguised: game.hero.disguised, fail: game.flags.c9_coat ? null : 'coat' }; }],
  ['the BORE cabinet', () => { const G = game, c = G.rooms.archive.cabinets.find((x) => x.label === 'BORE'); const w = G.story.cur.watcher; if (w?.active) P.sneakTo(c.x, c.z, w, { tol: 1.0 }); const r = P.use(c.x, c.z, { kind: 'c9cab' }); return { ...r, plans: G.flags.c9_plans, fail: G.flags.c9_plans ? null : 'plans' }; }],
  ['back to the council → chapter 10', () => { P.exitTo('archive-out'); P.exitTo('up-council'); P.settle(60); P.settle(30); return { vote: game.flags.c9_vote, chapter: game.flags.chapterKey, fail: game.flags.chapterKey === 'network' ? null : 'no chapter 10' }; }],
];
