// Prologue, on the surface: the ball from the cupboard, the well, Gilbert's key, Xil's rope (Doran's stamp),
// overhearing the kids in Discreet mode, Tim's confession, down the well. New game (?nocine).
export const steps = [
  ['intro', () => P.settle()],
  ['cupboard', () => { const s = game.room.searches[0]; const r = P.use(s.x, s.z); return { ...r, ball: game.hero.hasBall, fail: game.hero.hasBall ? null : 'no ball' }; }],
  ['out of the house', () => { const e = game.room.exits.find((x) => !x.room); const r = P.through(e.x, e.z); return { ...r, fail: r.to === 'citadel' ? null : 'still inside' }; }],
  ['look at the well', () => { const w = game.world.well; const r = P.use(w.x, w.z, { near: 2.0, run: true }); return { ...r, fail: game.flags.wellSeen ? null : 'well not seen' }; }],
  ['Gilbert: the key', () => ({ ...P.talk('gilbert', { run: true }), fail: game.flags.key ? null : 'no key' })],
  ['Xil', () => ({ ...P.talk('xil', { run: true }), fail: game.flags.metXil ? null : 'xil' })],
  ['Doran: the stamp', () => ({ ...P.talk('doran', { run: true }), fail: game.flags.stamp ? null : 'no stamp' })],
  ['Xil: the rope', () => ({ ...P.talk('xil', { run: true }), fail: game.flags.rope ? null : 'no rope' })],
  ['Tim and Lulu', () => P.talk('tim', { run: true })],
  ['overhear (Discreet)', () => { P.tap('F4'); const t = P.npc('tim'); P.go(t.pos.x + 6, t.pos.z, { tol: 1 }); P.settle(); P.go(t.pos.x, t.pos.z, { tol: 3 }); P.settle(); P.tap('F1'); return { overheard: game.flags.overheard, fail: game.flags.overheard ? null : 'not overheard' }; }],
  ['Tim confesses', () => ({ ...P.talk('tim'), fail: game.flags.timConfessed ? null : 'no confession' })],
  ['the clover Tim gives back', () => { const c = game.pickups.list.find((p) => p.type === 'clover' && !p.id); const n0 = game.hero.clovers; if (c) { P.go(c.pos.x, c.pos.z, { tol: 0.3 }); game.step(0.6); } return { found: !!c, clovers: [n0, game.hero.clovers] }; }],
  ['down the well', () => { const w = game.world.well; const r = P.use(w.x, w.z, { near: 2.0, run: true }); return { ...r, fail: game.room?.id === 'well' ? null : 'not in the well' }; }],
];
