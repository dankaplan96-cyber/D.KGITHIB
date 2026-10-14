// Chapter 2, second part: Vesk's tour of the station, Zoé's office segment (stealth past the guard, the
// evacuation plan), the confrontation at the beam pad, Arthur's radio at home, Doran's ferry to Zeelich.
export const steps = [
  ['continue', () => P.settle()],
  ['Vesk: the tour', () => ({ ...P.talk('vesk', { run: true }), fail: game.flags.c1_tour ? null : 'tour' })],
  ['Zoé at the gate', () => { const r = P.talk('zoe', { run: true }); P.wait(1); P.settle(); return { ...r, room: game.room?.id, body: game.hero.body, fail: game.room?.id === 'projoffice' ? null : 'not in the office' }; }],
  ['Zoé: the lockers (stealth)', () => {
    const G = game, w = G.story.cur.watcher, out = [];
    for (const id of ['locker2', 'locker1', 'locker3']) {
      if (G.flags.c1_plan) break;
      const L = G.room.searches.find((s) => s.id === id);
      for (let k = 0; k < 4 && !G.searched.includes(id); k++) { out.push(P.sneakTo(L.x, L.z, w, { tol: 0.9 }).r); P.use(L.x, L.z, { near: 0.9 }); P.wait(1.4); P.settle(); }
    }
    return { plan: G.flags.c1_plan, tries: out, fail: G.flags.c1_plan ? null : 'no plan' };
  }, null, { retryFrom: 'Zoé at the gate' }],
  ['Zoé: out', () => { const G = game, e = G.room.exits[0]; for (let k = 0; k < 4 && G.room?.id === 'projoffice'; k++) { P.sneakTo(e.x, e.z, G.story.cur.watcher, { tol: 0.6 }); P.through(e.x, e.z); P.settle(); } return { zoeDone: G.flags.c1_zoeDone, body: G.hero.body, fail: G.flags.c1_zoeDone ? null : 'zoe' }; }, null, { retryFrom: 'Zoé at the gate' }],
  ['Vesk: the confrontation', () => { const r = P.talk('vesk'); P.settle(60); return { ...r, gone: game.flags.c1_veskGone, fail: game.flags.c1_veskGone ? null : 'vesk' }; }],
  ['home: Arthur\'s radio', () => { const d = game.world.houses[0].door; P.through(d.x, d.z, { run: true }); const r = P.talk('arthur'); const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); return { ...r, radio: game.flags.c1_radio, fail: game.flags.c1_radio ? null : 'radio' }; }],
  ['Doran: the ferry to Zeelich', () => { const r = P.talk('doran', { run: true }); P.settle(60); return { ...r, chapter: game.flags.chapterKey, room: game.room?.id, fail: game.flags.chapterKey === 'zeelich' ? null : 'no chapter 3' }; }],
];
