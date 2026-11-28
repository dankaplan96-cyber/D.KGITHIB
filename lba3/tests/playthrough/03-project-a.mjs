// Chapter 2 (The Joint Project), first part: Zoé at home, the ferry and Vesk at the harbour, the Water Office's
// pipe map.
export const steps = [
  ['continue', () => P.settle()],
  ['home: Zoé', () => { const d = game.world.houses[0].door; P.through(d.x, d.z, { run: true }); const r = P.talk('zoe'); return { ...r, fail: game.flags.c1_home ? null : 'zoe' }; }],
  ['out', () => { const e = game.room.exits.find((x) => !x.room); return P.through(e.x, e.z); }],
  ['harbour: the ferry docks', () => { const ps = game.world.pierStart; P.go(ps.x + 6, ps.z + 2, { tol: 1.5, run: true }); P.settle(60); return { arrived: game.flags.c1_arrived, fail: game.flags.c1_arrived ? null : 'no arrival' }; }],
  ['Vesk: the task', () => ({ ...P.talk('vesk'), fail: game.flags.c1_task ? null : 'no task' })],
  ['Water Office: pipe map', () => { const o = game.world.houses.find((x) => x.id === 'water'); P.through(o.door.x, o.door.z, { run: true }); const pm = game.room?.searches?.find((x) => x.id === 'pipemap'); if (!pm) return { fail: 'no office' }; P.use(pm.x, pm.z); const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); return { map: game.flags.c1_map, fail: game.flags.c1_map ? null : 'map' }; }],
];
