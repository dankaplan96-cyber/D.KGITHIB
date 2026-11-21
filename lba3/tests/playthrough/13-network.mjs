// Chapter 10 (Baldino's Network): five relays. Zeelich: the old mill (Oku; brake it with the ball, the relay at
// the top). The spaceship to Citadel (PLANET-1: the planets are joined by spaceship only): the valve room (Mira;
// three valves), the lighthouse (Zoé; the dials). Hesk's glider to Desert Island: the bore (Ilka; the drones). To
// the Hamalayi: the dome (Pim, the keeper, the telescope). The glider to Citadel, on foot into the station's yard:
// Baldino's code box at the bore (SHAFT-CITADEL) → chapter 11. (Hesk's glider menu: Citadel 0, Desert Island 1, the Hamalayi 2.)
// CAMPAIGN-8 (wave 6, story/netline.js), in a game with the thread (a save from before the wave at the chapter's start
// has it too): on Mill Lane, on the way from the mill to the port, the isolator off Kell's feed box (Irsa takes the
// switch); on Citadel Arthur's count on the radio, Mira's reading of her gauge; each friend takes the handle as he lets
// go (Mira a wheel, Zoé the dial bank, Ilka the relief wheel, Yorna the lever, Pim a mirror); at the station the joint,
// the isolator clipped on in the rest after the fourth knock (the first try taken at once, whatever the joint is doing).
export const steps = [
  ['continue', () => { P.settle();
    // (the takeovers are scenes in play: wait them out, reading what is said, as a player would)
    window.NWAIT = (max = 400) => { const G = game; let i = 0; for (; i < max && (G.story._nw?.busy || G.state === 'dialog' || G.hero.actT > 0 || G.hero.steer || G.trans); i++) { if (G.state === 'dialog') P.settle(); else G.step(0.1); } P.settle(); return i; };
    return { chapter: game.flags.chapterKey, room: game.room?.id, nw: game.flags.nw_v ?? null }; }],
  ['Oku', () => { if (P.here() !== 'zeelich') P.enter('zeelich'); return { ...P.talk('oku', { run: true }), ask: game.flags.c10_okuAsk }; }],
  ['brake the old mill (ball)', () => { const G = game, m = G.rooms.zeelich.mills[0]; for (let k = 0; k < 6 && !G.flags.c10_millBraked; k++) { const a = k * 1.05; P.go(m.brake.x + Math.sin(a) * 6, m.brake.z + Math.cos(a) * 6, { tol: 1, run: true, maxT: 90 }); P.settle(); P.tap('F1'); P.throwAt(m.brake.x, m.brake.z); P.settle(); } return { braked: G.flags.c10_millBraked, fail: G.flags.c10_millBraked ? null : 'brake' }; }],
  ['climb the old mill (jumps)', () => { const r = P.climbOldMill(); return { ...r, fail: r.top ? null : 'climb' }; }],
  ['the mill relay', () => { const mt = game.rooms.zeelich.millTop; let r; for (let k = 0; k < 3 && !game.flags.c10_mill; k++) { r = P.use(mt.x, mt.z, { near: 1.2 }); P.settle(); } return { ...r, mill: game.flags.c10_mill, fail: game.flags.c10_mill ? null : 'mill relay' }; }],
  // (off the gallery first, the way he came up: through the railing's gap and down the stair-stones one by one, then
  // across the island. A plan from the gallery straight to the spaceport, 57 m off, found no way down and walked him
  // into the railing)
  ['down from the mill', () => { const G = game, h = G.hero, mt = G.rooms.zeelich.millTop, S = mt.stones, cx = mt.x, cz = mt.z - 3.3, a0 = Math.atan2(S[0].x - cx, S[0].z - cz) - 0.6;
    // (the stones spiral down under the gallery's planks, so a walk 'to' a stone's spot stays up on the planks: hop
    // down onto each in turn from the landing by the gap, as the climb hopped up)
    P.go(mt.landing.x, mt.landing.z, { tol: 0.4, maxT: 8, fight: false });
    const hops = [];
    for (let k = S.length - 1; k >= 0 && h.pos.y > S[0].y - 0.5; k--) if (h.pos.y > S[k].y + 0.3) hops.push(P.hopTo(S[k].x, S[k].z, S[k].y, { walk: false, brake: 1.2, pre: 0.05 }));
    const r = P.go(cx + Math.sin(a0) * 6, cz + Math.cos(a0) * 6, { tol: 0.8, run: true }); P.settle(); return { ...r, hops, y: +h.pos.y.toFixed(2), fail: h.pos.y < mt.y - 3 ? null : 'still on the mill' }; }],
  // (CAMPAIGN-8: Mill Lane is on the way to the port; the feed box's prompt, Irsa's line, the takeover)
  ['Mill Lane: the isolator off, Irsa on the switch', () => { const G = game, f = G.flags; if (!f.nw_v) return { skip: 'no thread' };
    const L = G.rooms.zeelich.lift; const r = P.use(L.isoAt.x, L.isoAt.z, { near: 0.6, run: true, kind: 'nw_unclip' }); const w = NWAIT();
    const n = P.npc('zl_irsa'); return { r: r.r, target: r.target?.kind, waited: w, irsa: f.nw_irsa, at: n && [+n.pos.x.toFixed(2), +n.pos.z.toFixed(2), n.rig.anim], iso: G.story.items().some((i) => i.id === 'iso'), fail: f.nw_irsa === true ? null : 'irsa' }; }],
  ['the spaceship to Citadel', () => { const r = P.shipTo('zeelich_port'); const w = window.NWAIT ? NWAIT() : 0; return { ...r, waited: w, arthur: game.flags.nw_arthur ?? null, fail: r.room === 'citadel' ? null : 'ship' }; }],
  // (Mira at her desk in the Water Office: placed when he walks in)
  ['Mira: the valve room', () => { if (!P.npc('mira')?.present) P.enter('office', { run: true }); const r = P.talk('mira', { run: true }); P.wait(1.5); P.settle(); NWAIT(); return { ...r, room: game.room?.id, ask: game.flags.c10_miraAsk, gauge: game.flags.nw_gauge ?? null }; }],
  ['the three valves', () => { const V = game.rooms.valves; for (let pass = 0; pass < 3 && !game.flags.c10_valves; pass++) for (const v of V.valves) { if (game.flags.c10_valves || game.story._nw?.busy) break; P.use(v.x, v.z, { near: 0.9 }); P.settle(); } NWAIT(); const m = P.npc('mira'); return { valves: game.flags.c10_valves, levels: game.story.cur.gaugeLevels(), mira: game.flags.nw_mira ?? null, at: m && [+m.pos.x.toFixed(2), +m.pos.z.toFixed(2), m.rig.anim], fail: game.flags.c10_valves ? null : 'valves' }; }],
  ['out', () => { P.exitTo('valves-out'); if (game.room) { const e = game.room.exits.find((x) => !x.room); if (e) P.through(e.x, e.z); } return { room: P.here() }; }],
  ['the lighthouse: Zoé', () => { const r = P.talk('zoe', { run: true }); return { ...r, ask: game.flags.c10_zoeAsk, room: game.room?.id }; }],
  ['the dials', () => { const L = game.rooms.lighttop; for (let pass = 0; pass < 3 && !game.flags.c10_light; pass++) for (const i of [1, 2, 3]) { if (game.flags.c10_light || game.story._nw?.busy) break; const s = L.searches.find((x) => x.id === 'dial' + i); P.use(s.x, s.z, { near: 0.8 }); P.settle(); } NWAIT(); const z = P.npc('zoe'); return { dials: game.flags.c10_dials, light: game.flags.c10_light, zoe: game.flags.nw_zoe ?? null, at: z && [+z.pos.x.toFixed(2), +z.pos.z.toFixed(2), z.rig.anim], fail: game.flags.c10_light ? null : 'light' }; }],
  ['fly to Desert Island', () => { P.exitTo('outdoor-lighthouse'); const r = P.flyTo(1); return { ...r, fail: r.room === 'desert' ? null : 'glider' }; }],
  ['Ilka: the bore relay', () => { P.talk('ilka', { run: true }); const b = game.rooms.desert.bore; const r = P.use(b.x, b.z, { run: true }); NWAIT(); return { ...r, relay: game.flags.c10_boreRelay, ilka: game.flags.nw_ilka ?? null }; }],
  // (the bore's two waves — the drones one after another, then Vesk's guards and the sentry — fought by input, a heart picked
  // up between them; below 3 HP the bot stops and an ISO assist beats the rest — QA.md: a human-playtest item, like the
  // Zeelich depot. The step reports the lowest HP of the fight and the HP at the break between the waves)
  ['the drones', () => {
    const G = game, h = G.hero, os = G.step.bind(G); let minHp = h.hp, breakHp = null; G.step = (dt) => { os(dt); minHp = Math.min(minHp, h.hp); if (breakHp == null && G.flags.c10_boreW2) breakHp = h.hp; };
    const out = { left: 0, dead: false, t: 0, assisted: 0, waves: [] };
    try {
      for (let k = 0; k < 12 && !G.flags.c10_bore && !h.dead; k++) {
        P.ignore?.clear?.();   // (a drone out on its patrol, a player goes after it again)
        const wave = G.flags.c10_boreW2 ? 2 : 1, r = P.fight({ maxT: 180, minHp: 2 }); out.t += r.t; out.left = r.left; out.dead = r.dead;
        out.waves.push({ wave, hp: h.hp });
        if (G.enemies.some((e) => e.alive && e.present && e.pos.distanceTo(h.pos) < 30) && h.hp <= 2 && !h.dead) out.assisted += P.assistFight({});
        P.wait(0.6); P.settle(); P.grab(9);
        if (!G.flags.c10_bore && !G.enemies.some((e) => e.alive && e.present && e.pos.distanceTo(h.pos) < 30)) { P.wait(3); P.settle(); }   // (nothing in reach yet: the next of them is on its way)
      }
    } finally { G.step = os; }
    P.wait(1); P.settle();
    return { ...out, hp: h.hp, minHp, breakHp, w2: !!G.flags.c10_boreW2, bore: G.flags.c10_bore, fail: G.flags.c10_bore ? null : 'bore' }; }],
  ['fly to the Hamalayi', () => { const r = P.flyTo(2); return { ...r, fail: r.room === 'hamalayi' ? null : 'glider' }; }],
  ['Pim (Yorna)', () => ({ ...P.talk('yorna', { run: true }), pim: game.flags.c10_pim })],
  ['the dome', () => { const G = game, f = G.flags, d = G.rooms.hamalayi.observatory.door;
    for (let k = 0; k < 3 && G.room?.id !== 'obsv'; k++) { P.through(d.x, d.z, { run: true }); P.settle(); }
    let kt = null; for (let k = 0; k < 2 && !f.c10_keeper; k++) kt = P.talk('keeper');
    const t = G.rooms.obsv.telescope; const r1 = P.use(t.x, t.z, { kind: 'c10domeRelay' }); P.wait(1); P.settle(); NWAIT();
    const r2 = P.use(t.x, t.z, { kind: 'c10scope' }); NWAIT();
    const y = P.npc('yorna'), p = P.npc('pim');
    return { room: G.room?.id, pim: f.c10_pim, keeper: f.c10_keeper, kt: kt?.r, relay: f.c10_domeRelay, r1: r1.r, r2: r2.r, dome: f.c10_dome, yorna: f.nw_yorna ?? null, at: [y?.present && y.rig.anim, p?.present && p.rig.anim], fail: f.c10_dome ? null : 'dome' }; }],
  // (SHAFT-CITADEL: the shaft's top is the bore in Citadel's station; Baldino waits there with his code box)
  ['fly to Citadel', () => { if (game.room?.id === 'obsv') { const e = game.room.exits[0]; P.through(e.x, e.z); } const r1 = P.flyTo(0); return { glider: r1.room, fail: !game.room ? null : 'to Citadel' }; }],
  ['the code box at the station\'s bore → chapter 11', () => { const G = game, f = G.flags, b = G.world.station.bore;
    if (!f.nw_v) { const r = P.use(b.x, b.z + 3.6, { run: true, kind: 'c10console' }); P.settle(60); P.settle(30); return { ...r, chapter: f.chapterKey, room: G.room?.id, fail: f.chapterKey === 'shell' ? null : 'no chapter 11' }; }
    // (CAMPAIGN-8: Baldino says what the joint wants; the first try at once, then in the rest after the fourth knock)
    const T = G.story._nw, J = T.joint(), out = { tries: [], told: null };
    const r0 = P.go(J.touch.front.x, J.touch.front.z, { tol: 0.4, run: true }); P.use(J.x, J.z, { run: true, kind: 'nw_joint', near: 0.6 }); NWAIT(); out.told = !!f.nw_jointTold; out.r0 = r0.r;
    for (let k = 0; k < 6 && !f.nw_joint; k++) {
      // (after a miss he waits at the joint for the fourth knock, and presses as it passes, as Arthur and Mira said)
      if (k > 0) { P.go(J.touch.front.x, J.touch.front.z, { tol: 0.25, maxT: 8 }); P.face(J.x, J.z); let t = 0; while (!(T.phase() > 1.48 && T.phase() < 1.62) && t < 4) { G.step(1 / 30); t += 1 / 30; } P.tap('KeyE', 0.1); } else P.use(J.x, J.z, { near: 0.6, kind: 'nw_joint' });
      NWAIT(60); out.tries.push(T.lastTry);
    }
    P.settle(60); P.settle(30); for (let i = 0; i < 30 && f.chapterKey !== 'shell'; i++) { G.step(0.2); P.settle(); }
    return { ...out, joint: !!f.nw_joint, chapter: f.chapterKey, room: G.room?.id, fail: f.chapterKey === 'shell' ? null : 'no chapter 11' }; }],
];
