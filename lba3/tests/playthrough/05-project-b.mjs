// Chapter 2, second part: (CAMPAIGN-2, pumpline.js) the lane is still dry — his own tap, the pump room, the wrong
// pipe, the strip and the plate, the street after — then
// Chapter 2, second part: Vesk's tour of the station, Zoé's office segment (stealth past the guard, the
// evacuation plan), the confrontation at the beam pad, Arthur's radio at home, Doran at the harbour, the project's
// ship from Citadel Spaceport to Zeelich (PLANET-1: the planets are joined by spaceship only).
export const steps = [
  ['continue', () => P.settle()],
  // ---- CAMPAIGN-2: the wrong pipe (all by input; each step judged on its saved flag)
  ['home: Zoé — the square is full, our tap is not', () => { const r = P.talk('zoe', { run: true }); return { ...r, room: game.room?.id, fail: game.flags.ct_dry ? null : 'ct_dry' }; }],
  ['his own tap: dry, knocking', () => {
    const H = game.story.chapters[0].home.parts.house, h = game.hero; const r = P.use(H.spout.x, H.spout.z, { near: 1.2, kind: 'ct_tap' });
    for (let i = 0; i < 40 && (h.steer || h.actT > 0); i++) game.step(0.25); P.settle();
    return { ...r, stream: H.K.stream.visible, fail: r.target?.kind === 'ct_tap' && !H.K.stream.visible ? null : 'tap' };
  }],
  ['the lane: the worker has opened two pipes', () => { const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z); const r = P.talk('worker', { run: true }); return { ...r, fail: game.flags.ct_worker ? null : 'ct_worker' }; }],
  ['down into the pump room', () => { const K = game.world.pumpKiosk; const r = P.through(K.door.x, K.door.z); P.settle(); return { ...r, room: game.room?.id, fail: game.room?.id === 'pumproom' ? null : 'not in the pump room' }; }],
  ['the wall diagram: two pipes', () => { const U = game.room.pump; const r = P.use(U.diagram.x, U.diagram.z, { near: 1.2, kind: 'ct_diagram' }); return { ...r, fail: game.flags.ct_diagram ? null : 'ct_diagram' }; }],
  ['three pipes felt: the copper one shivers', () => {
    const U = game.room.pump, h = game.hero, out = {};
    for (const k of ['upper', 'lower', 'copper']) { out[k] = P.use(U.feel[k].x, U.feel[k].z, { near: 0.9, kind: 'ct_feel' }).target?.kind; for (let i = 0; i < 40 && (h.steer || h.actT > 0); i++) game.step(0.25); P.settle(); }
    return { ...out, fail: game.flags.ct_felt ? null : 'ct_felt' };
  }],
  ['behind the pier: the bypass', () => { const U = game.room.pump; P.go(U.cocks.upper.front.x, U.cocks.upper.front.z + 0.3, { tol: 0.5 }); game.step(0.6); P.settle(); return { seen: !!game.flags.ct_seen, fail: game.flags.ct_seen ? null : 'ct_seen' }; }],
  ['the wrong cock: the square again (one knock)', () => { const U = game.room.pump; const r = P.use(U.cocks.upper.x, U.cocks.upper.z, { near: 0.9, kind: 'ct_cock' }); game.step(3.4); P.settle(); return { ...r, wrong: game.flags.ct_wrong, open: U.cocks.upper.open, fail: game.flags.ct_wrong >= 1 && !game.flags.ct_bypass && !U.cocks.upper.open ? null : 'wrong cock' }; }],
  ["the right cock: the houses' line (two knocks)", () => { const U = game.room.pump; const r = P.use(U.cocks.lower.x, U.cocks.lower.z, { near: 0.9, kind: 'ct_cock' }); game.step(3.6); P.settle(); return { ...r, fail: game.flags.ct_bypass && U.cocks.lower.open ? null : 'bypass' }; }],
  ['the door waits for the strip and the plate', () => { const e = game.room.exits[0]; const r = P.through(e.x, e.z); P.settle(); return { ...r, room: game.room?.id, fail: game.room?.id === 'pumproom' ? null : 'left without the strip' }; }],
  ["the gauge's strip", () => { const U = game.room.pump; const r = P.use(U.gauge.x, U.gauge.z, { near: 0.9, kind: 'ct_strip' }); for (let i = 0; i < 40 && !game.flags.ct_strip; i++) { game.step(0.25); P.settle(); } game.step(2.6); P.settle(); return { ...r, fail: game.flags.ct_strip ? null : 'ct_strip' }; }],
  ["the pump's plate: Irsa's Pump Works, Zeelich", () => { const U = game.room.pump; const r = P.use(U.plate.x, U.plate.z, { near: 0.9, kind: 'ct_plate' }); return { ...r, done: game.story.cur.line.done, fail: game.flags.ct_plate && game.story.cur.line.done ? null : 'ct_plate' }; }],
  ['up: the garden tap runs', () => { const e = game.room.exits[0]; P.through(e.x, e.z); P.settle(); const Y = game.story.chapters[0].home.parts.yard; const r = P.use(Y.x, Y.z, { near: 1.1, kind: 'ct_yard' }); return { ...r, runs: Y.stream.visible, fail: !game.room && Y.stream.visible ? null : 'the garden tap' }; }],
  ['home: the tap Arthur left open, shut by hand', () => {
    const H = game.story.chapters[0].home.parts.house, h = game.hero; const r = P.talk('zoe', { run: true }); const ran = H.K.stream.visible;
    P.use(H.spout.x, H.spout.z, { near: 1.2, kind: 'ct_tap' }); for (let i = 0; i < 40 && !game.flags.ct_tapShut; i++) { game.step(0.25); P.settle(); }
    return { ...r, ran, shut: !!game.flags.ct_tapShut, stream: H.K.stream.visible, fail: game.flags.ct_home && ran && game.flags.ct_tapShut && !H.K.stream.visible ? null : 'home' };
  }],
  // ---- the station, as it was
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
  ['Doran at the harbour', () => { const r = P.talk('doran', { run: true }); return { ...r, ship: game.flags.c1_ship, fail: game.flags.c1_ship ? null : 'doran' }; }],
  // (on the way he may walk over a singing crystal and stop for its remark: he walks on, as a player would)
  ['the project\'s ship at the spaceport → Zeelich', () => { const p = game.world.spaceport.pad; let r; for (let k = 0; k < 3 && game.flags.chapterKey === 'project'; k++) { r = P.use(p.x - 4.2, p.z, { run: true, kind: 'c1ship' }); P.settle(60); } return { ...r, chapter: game.flags.chapterKey, room: game.room?.id, fail: game.flags.chapterKey === 'zeelich' ? null : 'no chapter 3' }; }],
];
