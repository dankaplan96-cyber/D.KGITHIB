// Chapter 5 (Steam and Sand, Desert Island): Brosk's jar, water from the oasis, the shovel, digging out FunFrock's
// condenser hall, the diagram, the old trooper, the valves (1, 3, 4), the hangar's glider and hatch (ball),
// Dallan at the post, the relief valve, out before the vent blows, Tarra, Hesk, the glider north.
export const steps = [
  ['continue', () => { P.settle(); return { chapter: game.flags.chapterKey, room: game.room?.id }; }],
  ['Brosk: the jar', () => ({ ...P.talk('dtrader', { run: true }), jar: game.flags.c5_jar, fail: game.flags.c5_jar ? null : 'jar' })],
  ['water from the oasis', () => { const e = game.rooms.desert.oasisEdge; const r = P.use(e.x, e.z, { run: true }); return { ...r, water: game.flags.c5_water, fail: game.flags.c5_water ? null : 'water' }; }],
  ['Brosk: the shovel', () => ({ ...P.talk('dtrader', { run: true }), shovel: game.flags.c5_shovel, fail: game.flags.c5_shovel ? null : 'shovel' })],
  ['dig out the door', () => { const d = game.rooms.desert.ruins.door; const r = P.use(d.x, d.z + 1.2, { run: true, near: 1.4 }); P.wait(1.5); P.settle(); return { ...r, dug: game.flags.c5_dug, fail: game.flags.c5_dug ? null : 'dig' }; }],
  ['into the hall', () => { const d = game.rooms.desert.ruins.door; const r = P.through(d.x, d.z); return { ...r, fail: game.room?.id === 'condA' ? null : 'hall' }; }],
  ['the diagram', () => { const A = game.rooms.condA; const r = P.use(A.diagram.x, A.diagram.z); return { ...r, diagram: game.flags.c5_diagram, fail: game.flags.c5_diagram ? null : 'diagram' }; }],
  ['the old trooper', () => { const r = P.fight({ group: null, maxT: 120 }); return { ...r, trooper: game.enemies.find((e) => e.id === 'ffclone1')?.alive }; }],
  ['the valves 1, 3, 4', () => { const A = game.rooms.condA; for (const id of [1, 3, 4]) { const v = A.valves.find((x) => x.id === id); P.use(v.x, v.z, { near: 1.0 }); P.wait(1); P.settle(); } return { valves: game.flags.c5_valves, routed: game.flags.c5_routed, fail: game.flags.c5_routed ? null : 'valves' }; }],
  ['the hangar', () => P.exitTo('cond-b')],
  ['the glider', () => { const g = game.rooms.condB.glider; return { ...P.use(g.x, g.z), seen: game.flags.c5_gliderSeen }; }],
  ['the hatch (ball)', () => { const tg = game.room.ballTargets.find((t) => t.hatch); for (let k = 0; k < 6 && !tg.done; k++) { const a = k * 1.05; P.go(tg.x - Math.sin(a) * 3.5, tg.z - Math.cos(a) * 3.5, { tol: 0.8, maxT: 40 }); P.settle(); P.tap('F1'); P.throwAt(tg.x, tg.z); P.settle(); } return { hatch: game.flags.c5_hatch, fail: game.flags.c5_hatch ? null : 'hatch' }; }],
  ['back out', () => { P.exitTo('cond-a'); return P.exitTo('cond-out'); }],
  ['Dallan', () => ({ ...P.talk('dallan', { run: true }), ok: game.flags.c5_dallanOK, fail: game.flags.c5_dallanOK ? null : 'dallan' })],
  ['the relief valve', () => { const v = game.rooms.desert.bore.valve; const r = P.use(v.x, v.z, { run: true }); P.settle(); return { ...r, relief: game.flags.c5_relief, fail: game.flags.c5_relief ? null : 'relief' }; }],
  ['out before the vent', () => { const G = game, Post = G.rooms.desert.post; P.go(Post.x0 - 8, (Post.z0 + Post.z1) / 2, { tol: 1.5, run: true, maxT: 60 }); let t = 0; while (!G.flags.c5_vent && t < 30) { G.step(0.1); t += 0.1; if (G.state !== 'play') P.settle(); } P.settle(); return { vent: G.flags.c5_vent, hp: G.hero.hp, fail: G.flags.c5_vent ? null : 'vent' }; }],
  ['Tarra', () => ({ ...P.talk('tarra', { run: true }), radio: game.flags.c5_radio })],
  ['Hesk: the glider', () => ({ ...P.talk('hesk', { run: true }), glider: game.flags.c5_glider, fail: game.flags.c5_glider ? null : 'hesk' })],
  ['to the hangar', () => { const d = game.rooms.desert.ruins.door; P.through(d.x, d.z, { run: true }); return P.exitTo('cond-b'); }],
  // (from the west side Hesk, standing by it, gets the E prompt: walk round to where it says Board, as a player does)
  ['board → chapter 6', () => { const g = game.rooms.condB.glider; let r = null;
    for (let k = 0; k < 12 && !r; k++) { const a = k * Math.PI / 6, x = g.x + Math.sin(a) * 1.4, z = g.z + Math.cos(a) * 1.4; P.go(x, z, { tol: 0.35, maxT: 15 }); P.face(g.x, g.z); if (P.target()?.kind === 'c5board') { P.tap('KeyE', 0.1); r = { r: 'boarded from ' + k, target: P.target() }; } }
    P.settle(60); P.settle(30); return { ...r, chapter: game.flags.chapterKey, room: game.room?.id, fail: game.flags.chapterKey === 'pass' ? null : 'no chapter 6' }; }],
];
