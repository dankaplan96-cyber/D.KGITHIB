// Chapter 10 (Baldino's Network): five relays. Zeelich: the old mill (Oku; brake it with the ball, the relay at
// the top). Hesk's glider to Citadel: the valve room (Mira; three valves), the lighthouse (Zoé; the dials). To
// Desert Island: the bore (Ilka; the drones). To the Hamalayi: the dome (Pim, the keeper, the telescope). Back
// to Zeelich: the platform console → chapter 11.
export const steps = [
  ['continue', () => { P.settle(); return { chapter: game.flags.chapterKey, room: game.room?.id }; }],
  ['Oku', () => { if (P.here() !== 'zeelich') P.enter('zeelich'); return { ...P.talk('oku', { run: true }), ask: game.flags.c10_okuAsk }; }],
  ['brake the old mill (ball)', () => { const G = game, m = G.rooms.zeelich.mills[0]; for (let k = 0; k < 6 && !G.flags.c10_millBraked; k++) { const a = k * 1.05; P.go(m.brake.x + Math.sin(a) * 6, m.brake.z + Math.cos(a) * 6, { tol: 1, run: true, maxT: 90 }); P.settle(); P.tap('F1'); P.throwAt(m.brake.x, m.brake.z); P.settle(); } return { braked: G.flags.c10_millBraked, fail: G.flags.c10_millBraked ? null : 'brake' }; }],
  ['climb the old mill (jumps)', () => { const r = P.climbOldMill(); return { ...r, fail: r.top ? null : 'climb' }; }],
  ['the mill relay', () => { const mt = game.rooms.zeelich.millTop; let r; for (let k = 0; k < 3 && !game.flags.c10_mill; k++) { r = P.use(mt.x, mt.z, { near: 1.2 }); P.settle(); } return { ...r, mill: game.flags.c10_mill, fail: game.flags.c10_mill ? null : 'mill relay' }; }],
  ['fly to Citadel', () => P.flyTo(1)],
  ['Mira: the valve room', () => { const r = P.talk('mira', { run: true }); P.wait(1.5); P.settle(); return { ...r, room: game.room?.id, ask: game.flags.c10_miraAsk }; }],
  ['the three valves', () => { const V = game.rooms.valves; for (let pass = 0; pass < 3 && !game.flags.c10_valves; pass++) for (const v of V.valves) { P.use(v.x, v.z, { near: 0.9 }); P.settle(); } return { valves: game.flags.c10_valves, levels: game.story.cur.gaugeLevels(), fail: game.flags.c10_valves ? null : 'valves' }; }],
  ['out', () => { P.exitTo('valves-out'); if (game.room) { const e = game.room.exits.find((x) => !x.room); if (e) P.through(e.x, e.z); } return { room: P.here() }; }],
  ['the lighthouse: Zoé', () => { const r = P.talk('zoe', { run: true }); return { ...r, ask: game.flags.c10_zoeAsk, room: game.room?.id }; }],
  ['the dials', () => { const L = game.rooms.lighttop; for (let pass = 0; pass < 3 && !game.flags.c10_light; pass++) for (const i of [1, 2, 3]) { if (game.flags.c10_light) break; const s = L.searches.find((x) => x.id === 'dial' + i); P.use(s.x, s.z, { near: 0.8 }); P.settle(); } return { dials: game.flags.c10_dials, light: game.flags.c10_light, fail: game.flags.c10_light ? null : 'light' }; }],
  ['fly to Desert Island', () => { P.exitTo('outdoor-lighthouse'); return P.flyTo(2); }],
  ['Ilka: the bore relay', () => { P.talk('ilka', { run: true }); const b = game.rooms.desert.bore; const r = P.use(b.x, b.z, { run: true }); return { ...r, relay: game.flags.c10_boreRelay }; }],
  // (the bore's drones: fought by input; below 3 HP the bot stops and an ISO assist beats the rest — QA.md: a
  // human-playtest item, like the Zeelich depot)
  ['the drones', () => { const r = P.fight({ maxT: 180, minHp: 2 }); r.assisted = game.enemies.some((e) => e.alive && e.present && e.pos.distanceTo(game.hero.pos) < 30) ? P.assistFight({}) : 0; P.wait(1); P.settle(); return { ...r, bore: game.flags.c10_bore, fail: game.flags.c10_bore ? null : 'bore' }; }],
  ['fly to the Hamalayi', () => P.flyTo(3)],
  ['Pim (Yorna)', () => ({ ...P.talk('yorna', { run: true }), pim: game.flags.c10_pim })],
  ['the dome', () => { const G = game, f = G.flags, d = G.rooms.hamalayi.observatory.door;
    for (let k = 0; k < 3 && G.room?.id !== 'obsv'; k++) { P.through(d.x, d.z, { run: true }); P.settle(); }
    let kt = null; for (let k = 0; k < 2 && !f.c10_keeper; k++) kt = P.talk('keeper');
    const t = G.rooms.obsv.telescope; const r1 = P.use(t.x, t.z, { kind: 'c10domeRelay' }); P.wait(1); P.settle(); const r2 = P.use(t.x, t.z, { kind: 'c10scope' }); P.settle();
    return { room: G.room?.id, pim: f.c10_pim, keeper: f.c10_keeper, kt: kt?.r, relay: f.c10_domeRelay, r1: r1.r, r2: r2.r, dome: f.c10_dome, fail: f.c10_dome ? null : 'dome' }; }],
  ['fly to Zeelich', () => { if (game.room?.id === 'obsv') { const e = game.room.exits[0]; P.through(e.x, e.z); } return P.flyTo(0); }],
  ['the platform console → chapter 11', () => { const c = game.rooms.zeelich.platform.console; const r = P.use(c.x, c.z, { run: true }); P.settle(60); P.settle(30); return { ...r, chapter: game.flags.chapterKey, room: game.room?.id, fail: game.flags.chapterKey === 'shell' ? null : 'no chapter 11' }; }],
];
