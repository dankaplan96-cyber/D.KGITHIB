// Chapter 14 of the expanded campaign (Baldino's Network): five relays, each with its band (OG-6 at the mill, NW-1 at the
// other four; tests/oren-coils.mjs and tests/oren-bands.mjs are their full tests). Segment 12c ends with the ship to
// Zeelich and Baldino's briefing (the coil, vm_3, the floats). Zeelich: out of the workshop; the old mill (Oku; brake it
// with the ball; Baldino at her foot: three clamp bolts between the coil's ticks; the dead coupling and the float; the
// climb and the relay at the top; down again, the band for the wind as Oku reads the sails). The spaceship to Citadel
// (PLANET-1): the valve room (Mira; three valves; the band as she reads the needles, and again after Oren's trim), the
// lighthouse (Zoé; the dials; the band as Arthur reads the needle, and again after Zoé's fog call). Hesk's glider to
// Desert Island: the bore (Ilka; the drones; the band as she reads the steam, and again after the vent surges). To the
// Hamalayi: the dome (Pim, the keeper, the telescope; the band as Pim reads the light, and again after a cloud). The
// glider to Citadel, on foot into the station's yard: Baldino's code box at the bore (SHAFT-CITADEL) → chapter 15.
// A band is set as a player sets it: a notch at a time, by what the friend says (the step reads the same state the
// friend's line is made from); a right band waits for the change of conditions. (Hesk's glider menu: Citadel 0, Desert
// Island 1, the Hamalayi 2.)
// the band at one of NW-1's stations (story/bands.js), by input: walk to the relay's float, E, the friend's reading
const band = (s) => {
  const G = game, f = G.flags, B = G.story.cur.nw1, log = [];
  for (let k = 0; k < 14 && !f['c10_' + s]; k++) {
    if (B.state(s) === 'right') { for (let t = 0; t < 120 && B.state(s) === 'right' && !f['c10_' + s]; t++) G.step(0.1); P.settle(); continue; }   // (right: wait; the conditions change)
    const p = B.spot(s); const r = P.use(p.x, p.z, { near: 0.8, kind: 'nw1band' });
    for (let i = 0; i < 25; i++) G.step(0.1); P.settle();
    log.push([r.target?.kind ?? r.r, f['c10_bandAt_' + s], f['c10_band_' + s] | 0]);
  }
  for (let i = 0; i < 20; i++) G.step(0.1); P.settle();
  return { log, band: f['c10_band_' + s] | 0, done: !!f['c10_' + s], fail: f['c10_' + s] ? null : 'band ' + s };
};
export const steps = [
  ['continue', () => { P.settle(); return { chapter: game.flags.chapterKey, room: game.room?.id, vm3: !!game.flags.vm_3, fail: game.flags.chapterKey === 'network' ? null : 'not the network' }; }],
  ['out of the workshop', () => { const G = game; if (G.room?.id === 'workshop') { P.exitTo(G.room.exits[0].to); P.settle(); } for (let i = 0; i < 10; i++) G.step(0.1); return { room: P.here(), out: !!G.flags.og6_out }; }],
  ['Oku', () => { if (P.here() !== 'zeelich') P.enter('zeelich'); return { ...P.talk('oku', { run: true }), ask: game.flags.c10_okuAsk }; }],
  ['brake the old mill (ball)', () => { const G = game, m = G.rooms.zeelich.mills[0]; for (let k = 0; k < 6 && !G.flags.c10_millBraked; k++) { const a = k * 1.05; P.go(m.brake.x + Math.sin(a) * 6, m.brake.z + Math.cos(a) * 6, { tol: 1, run: true, maxT: 90 }); P.settle(); P.tap('F1'); P.throwAt(m.brake.x, m.brake.z); P.settle(); } return { braked: G.flags.c10_millBraked, fail: G.flags.c10_millBraked ? null : 'brake' }; }],
  ["Baldino at the mill's foot: the coil's tick", () => { const r = P.talk('baldino', { run: true }); return { ...r, plan: !!game.flags.og6_plan, fail: game.flags.og6_plan ? null : 'plan' }; }],
  // (a player hears the tick and turns a bolt just after it: the step waits by the game's own clock)
  ['three clamp bolts between ticks', () => {
    const G = game, f = G.flags, C = G.story.cur.og6, F = C.frame(), out = [];
    for (let k = 0; k < 8 && !f.og6_coilOut; k++) {
      P.go(F.stand.x, F.stand.z, { tol: 0.25 }); P.face(F.face.x, F.face.z);
      for (let j = 0; j < 400; j++) { const p = C.phase(); if (p >= 0.38 && p <= 0.45) break; G.step(1 / 60); }
      P.tap('KeyE', 0.05); for (let i = 0; i < 12; i++) G.step(1 / 15);
      out.push(f.og6_bolt | 0); if ((f.og6_bolt | 0) < 3) P.settle();
    }
    P.settle(); for (let i = 0; i < 30; i++) G.step(0.1); P.settle();
    return { out, coilOut: !!f.og6_coilOut, fail: f.og6_coilOut ? null : 'bolts' };
  }],
  ['fit the dead coupling and the float', () => { const F = game.story.cur.og6.frame(); const r = P.use(F.face.x, F.face.z, { near: 0.9, kind: 'og6fit' }); P.settle(); return { r: r.r, fitted: !!game.flags.og6_fitted, fail: game.flags.og6_fitted ? null : 'fit' }; }],
  ['climb the old mill (jumps)', () => { const r = P.climbOldMill(); return { ...r, fail: r.top ? null : 'climb' }; }],
  ['the mill relay', () => { const mt = game.rooms.zeelich.millTop; let r; for (let k = 0; k < 3 && !game.flags.og6_relay; k++) { r = P.use(mt.x, mt.z, { near: 1.2 }); P.settle(); } return { ...r, relay: !!game.flags.og6_relay, fail: game.flags.og6_relay ? null : 'mill relay' }; }],
  // (off the gallery the way he came up: through the railing's gap and down the stair-stones one by one)
  ['down from the mill', () => { const G = game, h = G.hero, mt = G.rooms.zeelich.millTop, S = mt.stones;
    P.go(mt.landing.x, mt.landing.z, { tol: 0.4, maxT: 8, fight: false });
    const hops = [];
    for (let k = S.length - 1; k >= 0 && h.pos.y > S[0].y - 0.5; k--) if (h.pos.y > S[k].y + 0.3) { P.go(S[k].x, S[k].z, { tol: 0.35, maxT: 6, fight: false }); if (h.pos.y > S[k].y + 0.3) hops.push(P.hopTo(S[k].x, S[k].z, S[k].y, { walk: false, brake: 1.2, pre: 0.05 })); }
    P.settle(); return { hops: hops.length, y: +h.pos.y.toFixed(2), fail: h.pos.y < mt.y - 3 ? null : 'still on the mill' }; }],
  ["the mill's band (Oku reads the sails)", () => {
    const G = game, f = G.flags, C = G.story.cur.og6, F = C.frame(), log = [];
    for (let k = 0; k < 14 && !f.c10_mill; k++) {
      if (C.state() === 'right') { for (let t = 0; t < 120 && C.state() === 'right' && !f.c10_mill; t++) G.step(0.1); P.settle(); continue; }
      const r = P.use(F.float.x, F.float.z, { near: 0.8, kind: 'og6band' }); for (let i = 0; i < 25; i++) G.step(0.1); P.settle();
      log.push([r.target?.kind ?? r.r, f.og6_dial, f.og6_band | 0]);
    }
    for (let i = 0; i < 20; i++) G.step(0.1); P.settle();
    return { log, mill: !!f.c10_mill, fail: f.c10_mill ? null : 'mill band' };
  }],
  ['the spaceship to Citadel', () => { const r = P.shipTo('zeelich_port'); return { ...r, fail: r.room === 'citadel' ? null : 'ship' }; }],
  // (Mira at her desk in the Water Office: placed when he walks in)
  ['Mira: the valve room', () => { if (!P.npc('mira')?.present) P.enter('office', { run: true }); const r = P.talk('mira', { run: true }); P.wait(1.5); P.settle(); return { ...r, room: game.room?.id, ask: game.flags.c10_miraAsk }; }],
  ['the three valves', () => { const G = game, f = G.flags, V = G.rooms.valves; for (let pass = 0; pass < 3 && !f.c10_lit_valves && !f.c10_valves; pass++) for (const v of V.valves) { if (f.c10_lit_valves) break; P.use(v.x, v.z, { near: 0.9 }); P.settle(); } return { lit: !!f.c10_lit_valves, levels: G.story.cur.gaugeLevels(), fail: f.c10_lit_valves ? null : 'valves' }; }],
  ['the valve room band (Mira reads the needles; Oren trims)', band, 'valves'],
  ['out', () => { P.exitTo('valves-out'); if (game.room) { const e = game.room.exits.find((x) => !x.room); if (e) P.through(e.x, e.z); } return { room: P.here() }; }],
  // (a remark of his on the way can open first: read it, talk to her again)
  ['the lighthouse: Zoé', () => { let r; for (let k = 0; k < 3 && !game.flags.c10_zoeAsk; k++) { r = P.talk('zoe', { run: true }); P.settle(); } return { ...r, ask: game.flags.c10_zoeAsk, room: game.room?.id, fail: game.flags.c10_zoeAsk ? null : 'zoe' }; }],
  ['the dials', () => { const G = game, f = G.flags, L = G.rooms.lighttop; for (let pass = 0; pass < 3 && !f.c10_lit_light; pass++) for (const i of [1, 2, 3]) { if (f.c10_lit_light) break; const s = L.searches.find((x) => x.id === 'dial' + i); P.use(s.x, s.z, { near: 0.8 }); P.settle(); } return { dials: f.c10_dials, lit: !!f.c10_lit_light, fail: f.c10_lit_light ? null : 'light' }; }],
  ['the lighthouse band (Arthur reads the needle; the fog call)', band, 'light'],
  ['fly to Desert Island', () => { P.exitTo('outdoor-lighthouse'); const r = P.flyTo(1); return { ...r, fail: r.room === 'desert' ? null : 'glider' }; }],
  ['Ilka: the bore relay', () => { P.talk('ilka', { run: true }); const b = game.rooms.desert.bore; const r = P.use(b.x, b.z, { run: true }); return { ...r, relay: game.flags.c10_boreRelay }; }],
  // (the bore's two waves — the drones one after another, then Vesk's guards and the sentry — fought by input, a heart picked
  // up between them; below 3 HP the bot stops and an ISO assist beats the rest — QA.md: a human-playtest item, like the
  // Zeelich depot. The step reports the lowest HP of the fight and the HP at the break between the waves. The fight is
  // over when the relay's band is to set: c10_lit_bore)
  ['the drones', () => {
    const G = game, h = G.hero, os = G.step.bind(G); let minHp = h.hp, breakHp = null; G.step = (dt) => { os(dt); minHp = Math.min(minHp, h.hp); if (breakHp == null && G.flags.c10_boreW2) breakHp = h.hp; };
    const over = () => !!(G.flags.c10_bore || G.flags.c10_lit_bore);
    const out = { left: 0, dead: false, t: 0, assisted: 0, waves: [] };
    try {
      for (let k = 0; k < 12 && !over() && !h.dead; k++) {
        P.ignore?.clear?.();   // (a drone out on its patrol, a player goes after it again)
        const wave = G.flags.c10_boreW2 ? 2 : 1, r = P.fight({ maxT: 180, minHp: 2 }); out.t += r.t; out.left = r.left; out.dead = r.dead;
        out.waves.push({ wave, hp: h.hp });
        if (G.enemies.some((e) => e.alive && e.present && e.pos.distanceTo(h.pos) < 30) && h.hp <= 2 && !h.dead) out.assisted += P.assistFight({});
        P.wait(0.6); P.settle(); P.grab(9);
        if (!over() && !G.enemies.some((e) => e.alive && e.present && e.pos.distanceTo(h.pos) < 30)) { P.wait(3); P.settle(); }   // (nothing in reach yet: the next of them is on its way)
      }
    } finally { G.step = os; }
    P.wait(1); P.settle();
    return { ...out, hp: h.hp, minHp, breakHp, w2: !!G.flags.c10_boreW2, lit: !!G.flags.c10_lit_bore, fail: over() ? null : 'bore' }; }],
  ['the bore band (Ilka reads the steam; the vent surges)', band, 'bore'],
  ['fly to the Hamalayi', () => { const r = P.flyTo(2); return { ...r, fail: r.room === 'hamalayi' ? null : 'glider' }; }],
  ['Pim (Yorna)', () => ({ ...P.talk('yorna', { run: true }), pim: game.flags.c10_pim })],
  ['the dome', () => { const G = game, f = G.flags, d = G.rooms.hamalayi.observatory.door;
    for (let k = 0; k < 3 && G.room?.id !== 'obsv'; k++) { P.through(d.x, d.z, { run: true }); P.settle(); }
    let kt = null; for (let k = 0; k < 2 && !f.c10_keeper; k++) kt = P.talk('keeper');
    const t = G.rooms.obsv.telescope; const r1 = P.use(t.x, t.z, { kind: 'c10domeRelay' }); P.wait(1); P.settle(); const r2 = P.use(t.x, t.z, { kind: 'c10scope' }); P.settle();
    return { room: G.room?.id, pim: f.c10_pim, keeper: f.c10_keeper, kt: kt?.r, relay: f.c10_domeRelay, r1: r1.r, r2: r2.r, lit: !!f.c10_lit_dome, fail: f.c10_lit_dome ? null : 'dome' }; }],
  ['the dome band (Pim reads the light; a cloud)', band, 'dome'],
  // (SHAFT-CITADEL: the shaft's top is the bore in Citadel's station; Baldino waits there with his code box)
  ['fly to Citadel', () => { if (game.room?.id === 'obsv') { const e = game.room.exits[0]; P.through(e.x, e.z); } const r1 = P.flyTo(0); return { glider: r1.room, stations: game.story.cur.done(), fail: !game.room ? null : 'to Citadel' }; }],
  ['the code box at the station\'s bore → chapter 15', () => { const b = game.world.station.bore; const r = P.use(b.x, b.z + 3.6, { run: true, kind: 'c10console' }); P.settle(60); P.settle(30); return { ...r, chapter: game.flags.chapterKey, room: game.room?.id, fail: game.flags.chapterKey === 'shell' ? null : 'no chapter 15' }; }],
];
