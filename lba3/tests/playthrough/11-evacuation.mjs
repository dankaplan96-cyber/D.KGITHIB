// Chapter 8 (Evacuation, Citadel): home to Zoé, Gilbert's tunnels, the fortress shelter's lever, the depot bunker's
// wheel (ball), Mira's water, Pippa's supplies, Zoé's run to the hill farms, the relay at the lighthouse, the
// control room, a project ship from Citadel Spaceport to Zeelich (PLANET-1).
// CAMPAIGN-6 (story/laneline.js; a game with the thread, ev_v): the list cart seen at the lane's shut water gate on
// arriving; as Zoé, after the relay, the schedule and the route read on the lighthouse path's board, Bram and Hedda (with
// Tobin) brought to the landing by the pump house; as Twinsen, the culvert's cock in the pump room opened in a rest
// between the copper pipe's kicks (turned in a kick it is kicked back: read, then the rest); up in the lane the cart comes
// through the open gate and the lane boards it. A save without the thread plays the old run.
export const steps = [
  // (a save from before the lane, at the chapter's start: the arrival's cut-away plays once he is in play; watched, as a
  //  player who has just pressed Continue would, before he walks: cut short by a walk, the bot replanned its way home)
  ['continue', () => { P.settle(); const G = game; let t = 0; while (G.flags.ev_v && !G.flags.ev_cart && !G.flags.c8_home && t < 3) { G.step(0.1); t += 0.1; if (G.state !== 'play') P.settle(); } return { chapter: G.flags.chapterKey, room: G.room?.id, lane: !!G.flags.ev_v, cart: !!G.flags.ev_cart }; }],
  ['home: Zoé', () => { const d = game.world.houses[0].door; P.enter('house', { run: true }); const r = P.talk('zoe'); return { ...r, home: game.flags.c8_home, fail: game.flags.c8_home ? null : 'home' }; }],
  ['Gilbert', () => ({ ...P.talk('gilbert', { run: true }), g: game.flags.c8_gilbert, fail: game.flags.c8_gilbert ? null : 'gilbert' })],
  ['the fortress lever', () => { const r = P.use(-33, -70, { run: true }); P.wait(1); P.settle(); return { ...r, fort: game.flags.c8_fort, fail: game.flags.c8_fort ? null : 'lever' }; }],
  ['the depot wheel (ball)', () => { const G = game, w = G.story.cur.wheelSpot; for (let k = 0; k < 8 && !G.flags.c8_depot; k++) { const a = k * 0.8; P.go(w.x - Math.sin(a) * 4, w.z - Math.cos(a) * 4, { tol: 0.8, run: true, maxT: 90 }); P.settle(); P.tap('F1'); P.throwAt(w.x, w.z); P.settle(); } return { depot: G.flags.c8_depot, fail: G.flags.c8_depot ? null : 'depot' }; }],
  // (she is at her desk in the Water Office: the game places her there when he walks in, not before — in, then talk)
  ['Mira (Water Office)', () => ({ ...(P.npc('mira')?.present ? {} : { door: P.enter('office', { run: true }).r }), ...P.talk('mira', { run: true }), mira: game.flags.c8_mira, fail: game.flags.c8_mira ? null : 'mira' })],
  ['Pippa', () => { if (P.here() !== 'citadel') P.enter('citadel'); const r = P.talk('pippa', { run: true }); P.settle(); if (game.state === 'shop') P.tap('Escape', 0.2); P.settle(); return { ...r, pippa: game.flags.c8_pippa, fail: game.flags.c8_pippa ? null : 'pippa' }; }],
  ['Zoé starts her run', () => { const r = P.talk('zoe', { run: true }); P.wait(1); P.settle(); return { ...r, start: game.flags.c8_zoeStart, body: game.hero.body, fail: game.flags.c8_zoeStart ? null : 'zoe' }; }],
  ['the three farms', () => { for (const id of ['farmer1', 'farmer2', 'farmer3']) { P.talk(id, { run: true }); P.wait(1); P.settle(); } return { done: game.story.cur.farmsDone(), fail: game.story.cur.farmsDone() >= 3 ? null : 'farms' }; }],
  ['the lighthouse gathering', () => { const G = game; const Gp = G.story.chapters.find((c) => c.key === 'evacuation').gather; P.go(Gp.x, Gp.z + 1, { tol: 2, run: true, maxT: 200 }); let t = 0; while (!G.flags.c8_relay && t < 20) { G.step(0.1); t += 0.1; if (G.state !== 'play') P.settle(); } P.settle(); return { relay: G.flags.c8_relay, body: G.hero.body, fail: G.flags.c8_relay ? null : 'relay' }; }],
  // ---- CAMPAIGN-6, as Zoé: the board, then the lane's people
  ['Zoé: the schedule and the route (the board)', () => {
    const G = game, f = G.flags, B = G.world.laneGate?.board;
    if (!f.ev_v) return { skip: 'no thread' };
    const a = P.use(B.sched.front.x, B.sched.front.z, { run: true, near: 0.3, kind: 'ev_sched' }); P.settle();
    const b = P.use(B.route.front.x, B.route.front.z, { near: 0.3, kind: 'ev_route' }); P.settle();
    return { a: a.r, b: b.r, s: !!f.ev_s, r: !!f.ev_r, sched: !!f.ev_sched, body: G.hero.body, fail: f.ev_sched ? null : 'board' };
  }],
  ['Zoé: Bram', () => { const f = game.flags; if (!f.ev_v) return { skip: 'no thread' }; const r = P.talk('bram', { run: true }); return { ...r, bram: !!f.ev_bram, fail: f.ev_bram ? null : 'bram' }; }],
  ['Zoé: Hedda and Tobin', () => { const f = game.flags; if (!f.ev_v) return { skip: 'no thread' }; const r = P.talk('ev_hedda', { run: true }); return { ...r, hedda: !!f.ev_hedda, fail: f.ev_hedda ? null : 'hedda' }; }],
  ['Zoé: to the landing → Twinsen', () => {
    const G = game, f = G.flags, L = G.world.laneGate;
    if (!f.ev_v) return { skip: 'no thread' };
    P.go(L.landing.x + 1.6, L.landing.z + 0.4, { tol: 1.2, run: true, maxT: 120 });
    let t = 0; while (!(f.c8_zoeDone && G.hero.body === 'twinsen' && G.state === 'play' && !G.trans) && t < 60) { G.step(0.1); t += 0.1; if (G.state !== 'play') P.settle(); }
    P.settle();
    return { done: !!f.c8_zoeDone, body: G.hero.body, waited: +t.toFixed(1), fail: f.c8_zoeDone && G.hero.body === 'twinsen' ? null : 'handover' };
  }],
  // ---- as Twinsen: the pump room
  ['the pump room: the culvert pipe', () => {
    const G = game, f = G.flags; if (!f.ev_v) return { skip: 'no thread' };
    const K = G.world.pumpKiosk; P.through(K.door.x, K.door.z); P.settle();
    const U = G.room?.pump; if (!U) return { fail: 'not in the pump room', room: G.room?.id };
    const r = P.use(U.culvert.x, U.culvert.z, { near: 0.9, kind: 'ev_culvert' }); P.settle();
    return { r: r.r, room: G.room?.id, seen: !!f.ev_seen, fail: f.ev_seen ? null : 'culvert' };
  }],
  // (a player's first try is taken at once, whatever the pipe is doing; kicked back, the rest is waited for, as the line says)
  ['the culvert\'s cock (in a rest)', () => {
    const G = game, f = G.flags, h = G.hero; if (!f.ev_v) return { skip: 'no thread' };
    const U = G.room.pump, c = U.culvert, out = { tries: 0 };
    for (let k = 0; k < 6 && !f.ev_gate; k++) {
      if (k > 0) { let t = 0; while (!(U.phase() > 0.95 && U.phase() < 1.2) && t < 4) { G.step(1 / 30); t += 1 / 30; } }
      P.use(c.x, c.z, { near: 0.9, kind: 'ev_cock' }); out.tries++;
      for (let i = 0; i < 80 && (h.actT > 0 || h.steer || G.state !== 'play' || G.story._ev?.busy); i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
    }
    P.settle();
    return { ...out, kicks: f.ev_kick || 0, gate: !!f.ev_gate, open: c.open, outside: G.world.laneGate.gate.open, fail: f.ev_gate ? null : 'cock' };
  }],
  ['up to the landing: the cart, the lane boards', () => {
    const G = game, f = G.flags; if (!f.ev_v) return { skip: 'no thread' };
    P.exitTo('pump-out');
    let t = 0; while (!(f.ev_board && G.state === 'play') && t < 90) { if (G.state === 'dialog') P.settle(); else { G.step(0.1); t += 0.1; } }
    P.settle();
    return { board: !!f.ev_board, t: +t.toFixed(1), bram: P.npc('bram')?.pos && +Math.hypot(P.npc('bram').pos.x - G.world.spaceport.bridge.x1, P.npc('bram').pos.z - G.world.spaceport.bridge.z).toFixed(1), fail: f.ev_board ? null : 'board' };
  }],
  ['the control room', () => { P.enter('control', { run: true }); P.wait(0.5); P.settle(); return { vesk: game.flags.c8_vesk, fail: game.flags.c8_vesk ? null : 'control' }; }],
  ['a project ship at the spaceport → chapter 9', () => { if (P.here() !== 'citadel') P.enter('citadel'); const p = game.world.spaceport.pad; let r; for (let k = 0; k < 3 && game.flags.chapterKey === 'evacuation'; k++) { r = P.use(p.x - 4.2, p.z, { run: true, kind: 'c8ship' }); P.settle(60); P.settle(30); } return { ...r, chapter: game.flags.chapterKey, room: game.room?.id, fail: game.flags.chapterKey === 'council' ? null : 'no chapter 9' }; }],
];
