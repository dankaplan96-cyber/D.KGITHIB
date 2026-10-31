// Chapter 7 (The Observatory, Hamalayi): up to the observatory, the keeper, the three mirrors carry the light,
// the telescope, out, the heavy drone at the vent (ball), the vent opened, back to the monastery gate.
export const steps = [
  ['continue', () => { P.settle(); return { chapter: game.flags.chapterKey, room: game.room?.id }; }],
  ['into the observatory', () => { const d = game.rooms.hamalayi.observatory.door; const r = P.through(d.x, d.z, { run: true }); return { ...r, fail: game.room?.id === 'obsv' ? null : 'observatory' }; }],
  ['the keeper', () => ({ ...P.talk('keeper'), keeper: game.flags.c7_keeper, fail: game.flags.c7_keeper ? null : 'keeper' })],
  ['the mirrors', () => { const G = game, O = G.rooms.obsv; for (let pass = 0; pass < 3 && !G.flags.c7_lit; pass++) for (const m of O.mirrors) { if (G.flags.c7_lit) break; P.use(m.x, m.z, { near: 1.0 }); P.wait(0.5); P.settle(); } return { lit: G.flags.c7_lit, fail: G.flags.c7_lit ? null : 'mirrors' }; }],
  ['the telescope', () => { const O = game.rooms.obsv; const r = P.use(O.telescope.x, O.telescope.z); return { ...r, scope: game.flags.c7_scope, fail: game.flags.c7_scope ? null : 'scope' }; }],
  ['out', () => { const e = game.room.exits.find((x) => x.to === 'obs-out') || game.room.exits[0]; return P.through(e.x, e.z); }],
  ['the heavy drone at the vent', () => { const G = game, V = G.rooms.hamalayi.vent; P.go(V.x + 8, V.z + 8, { tol: 2, run: true, maxT: 120 }); P.settle(); const r = P.fight({ maxT: 180, range: 6 }); const d = G.story.cur.heavy?.(); return { ...r, drone: d ? d.alive : null, fail: d && d.alive ? 'drone' : null }; }],
  ['the vent', () => { const V = game.rooms.hamalayi.vent; const r = P.use(V.x + 2.8, V.z, { near: 1.2 }); P.wait(2); P.settle(); return { ...r, vent: game.flags.c7_vent, fail: game.flags.c7_vent ? null : 'vent' }; }],
  ['the monastery gate → chapter 8', () => { const g = game.rooms.hamalayi.monastery.gate; P.go(g.x, g.z + 1, { tol: 1, run: true, maxT: 200 }); P.settle(60); P.settle(30); return { chapter: game.flags.chapterKey, room: game.room?.id, fail: game.flags.chapterKey === 'evacuation' ? null : 'no chapter 8' }; }],
];
