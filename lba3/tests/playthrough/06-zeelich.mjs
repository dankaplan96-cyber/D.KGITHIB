// Chapter 3 (Zeelich): the plan confiscated at the dock, (CAMPAIGN-3, zeelift.js) Brel's directions, the cistern lift
// (the stair, the chain, the bell, the feed, the ride, the cart), Irsa's bench, Baldino's workshop, the depot locker (the code cylinder,
// the plan back), Oku agrees, the cog at the top of the old mill, the three mills braked with the ball, the
// key built, Zoé at the lighthouse (the dials: sun, wave, star), the platform shield, Vesk flies home, the console (the shaft at Citadel sealed).
export const steps = [
  ['continue (arrival)', () => { P.settle(); return { started: game.flags.c2_started, taken: game.flags.c2_planTaken }; }],
  // ---- CAMPAIGN-3: Mill Lane (all by input; each step judged on its saved flag). No marker leads to the works.
  ['Brel at the bridge: the way to the brass wheel', () => { const r = P.talk('zl_brel', { run: true }); return { ...r, markers: game.story.cur.markers().length, fail: game.flags.zt_brel && game.story.cur.markers().length === 0 ? null : 'brel' }; }],
  ['the lane: the lift stopped half way, Kell at the brake', () => {
    const L = game.story.cur.lift.L; P.go(L.lane.x + 1.5, L.lane.z + 1.5, { tol: 1.0 }); game.step(0.5); P.settle(); const r = P.talk('zl_kell');
    return { ...r, seen: !!game.flags.zt_seen, fail: game.flags.zt_kell ? null : 'kell' };
  }],
  ['up the stair: the chain let down onto the cart', () => {
    const L = game.story.cur.lift.L, f = game.flags, h = game.hero;
    P.go(L.spots.stairFoot.x, L.spots.stairFoot.z, { tol: 0.6, maxT: 60 }); const up = P.go(L.spots.stairTop.x, L.spots.stairTop.z, { tol: 0.7, maxT: 60 });
    const r = P.use(L.hook.x, L.hook.z, { near: 1.0, kind: 'zt_hook' }); for (let i = 0; i < 60 && !f.zt_hook; i++) { game.step(0.25); P.settle(); }
    return { up: up.r, y: +(h.pos.y - L.top).toFixed(2), ...r, fail: f.zt_hook ? null : 'hook' };
  }],
  ['the landing bell: Kell clears the lane, Vesk gives the mill line', () => {
    const LT = game.story.cur.lift, L = LT.L, f = game.flags; const r = P.use(L.bell.x, L.bell.z, { near: 1.0, kind: 'zt_bell' });
    for (let i = 0; i < 60 && !f.zt_bell; i++) { game.step(0.25); P.settle(); } P.settle();
    return { ...r, fail: f.zt_bell ? null : 'bell' };
  }],
  ['down: the feed switch, the deck comes down', () => {
    const LT = game.story.cur.lift, L = LT.L, f = game.flags;
    P.go(L.feed.front.x, L.feed.front.z - 0.5, { tol: 0.8, maxT: 90 }); const r = P.use(L.feed.x, L.feed.z, { near: 1.0, kind: 'zt_feed' });
    for (let i = 0; i < 80 && !(f.zt_feed && !LT.busy); i++) { game.step(0.25); P.settle(); }
    return { ...r, low: +(L.deckY - L.low).toFixed(2), fail: f.zt_feed && Math.abs(L.deckY - L.low) < 0.01 ? null : 'feed' };
  }],
  ['the ride up with the cart', () => {
    const LT = game.story.cur.lift, L = LT.L, f = game.flags, h = game.hero; const r = P.use(L.deck.x, L.deck.z, { near: 1.9, kind: 'zt_ride' });
    for (let i = 0; i < 80 && !f.zt_ride; i++) { game.step(0.25); P.settle(); } P.settle();
    return { ...r, y: +(h.pos.y - L.top).toFixed(2), fail: f.zt_ride && Math.abs(h.pos.y - L.top) < 0.05 ? null : 'ride' };
  }],
  ['the cart shoved to the filler, its cock opened: the cistern fills', () => {
    const LT = game.story.cur.lift, L = LT.L, f = game.flags;
    const r = P.use(L.cart.x, L.cart.z, { near: 1.3, kind: 'zt_cart' }); for (let i = 0; i < 60 && !(f.zt_shove && !LT.busy); i++) { game.step(0.25); P.settle(); }
    P.use(L.cock.x, L.cock.z, { near: 1.3, kind: 'zt_cock' }); for (let i = 0; i < 80 && !f.zt_water; i++) { game.step(0.25); P.settle(); } P.settle();
    return { ...r, k: L.cartK, water: L.state.water, fail: f.zt_water ? null : 'water' };
  }],
  ["Irsa's bench: the dial set to the strip, the crank", () => {
    const LT = game.story.cur.lift, L = LT.L, f = game.flags, h = game.hero;
    const idle = () => { for (let i = 0; i < 60 && (h.steer || h.actT > 0); i++) game.step(0.25); P.settle(); };
    const r = P.talk('zl_irsa', { run: true });
    for (let k = 0; k < 2; k++) { P.use(L.dial.x, L.dial.z, { near: 0.9, kind: 'zt_dial' }); idle(); }
    P.use(L.crank.x, L.crank.z, { near: 0.9, kind: 'zt_crank' }); idle(); for (let i = 0; i < 60 && !f.zt_bench; i++) { game.step(0.25); P.settle(); }
    return { ...r, dial: LT.dial, fail: f.zt_bench ? null : 'bench' };
  }],
  // ---- the chapter as it was
  ['Baldino\'s workshop', () => {
    const Z = game.rooms.zeelich, d = Z.workshopDoor;
    const r = P.through(d.x, d.z, { run: true });
    const t = P.talk('baldino');
    const e = game.room.exits.find((x) => !x.room); P.through(e.x, e.z);
    return { r: r.to, t: t.r, plan: game.flags.c2_plan, fail: game.flags.c2_plan ? null : 'baldino' };
  }],
  // the depot's drones, Grobo guard and dog: the bot fights by input at the gate; if it gets down to 2 HP it stops and
  // the rest is an ISO assist (QA.md: this fight is a human-playtest item, not input evidence)
  ['depot fight (input; ISO assist below 3 HP)', () => {
    const G = game, D = G.rooms.zeelich.depot;
    if (G.room?.id === 'workshop') { const e = G.room.exits.find((x) => !x.room); P.through(e.x, e.z); }
    P.go(D.x - 4, D.z - 11, { tol: 1.5, run: true, fight: false });
    const f = P.fight({ maxT: 120, minHp: 2 });
    const assisted = G.enemies.some((e) => e.alive && e.present && e.pos.distanceTo(G.hero.pos) < 30) ? P.assistFight({}) : 0;
    return { ...f, assisted, hp: G.hero.hp };
  }],
  ['depot locker (drones, a guard, a dog)', () => {
    const L = game.rooms.zeelich.depot.locker; const r = P.use(L.x, L.z, { near: 1.2, run: true }); P.wait(1.2); P.settle();
    return { ...r, cyl: game.flags.c2_cyl, back: game.flags.c2_planBack, hp: game.hero.hp, fail: game.flags.c2_cyl ? null : 'locker' };
  }],
  ['Oku sees the plan', () => ({ ...P.talk('oku', { run: true }), ok: game.flags.c2_okuOK, fail: game.flags.c2_okuOK ? null : 'oku' })],
  // the old mill's stair-stones spiral up 1.09 m apart (CONTROL-FEEL): jumps (Athletic), stepping to the middle of each stone first
  // and letting go of Up in the air so he doesn't overshoot; then the last hop onto the gallery
  ['climb the old mill (jumps)', () => { const r = P.climbOldMill(); return { ...r, fail: r.top ? null : 'climb' }; }],
  ['the cog, top of the old mill', () => {
    // (a singing crystal up here interrupts the first walk with its own line: then the cog again)
    const mt = game.rooms.zeelich.millTop; let r; for (let k = 0; k < 3 && !game.flags.c2_cog; k++) { r = P.use(mt.x, mt.z, { near: 1.2 }); P.wait(1); P.settle(); }
    return { ...r, y: +game.hero.pos.y.toFixed(1), top: mt.y, cog: game.flags.c2_cog, fail: game.flags.c2_cog ? null : 'cog' };
  }],
  ['brake the three mills (ball)', () => {
    const G = game, Z = G.rooms.zeelich, out = [];
    for (const m of Z.mills) {
      for (let k = 0; k < 6 && !G.flags['c2_mill_' + m.id]; k++) {
        const a = k * 1.05; P.go(m.brake.x + Math.sin(a) * 6, m.brake.z + Math.cos(a) * 6, { tol: 1, run: true, maxT: 90 }); P.settle();
        P.tap('F1'); P.throwAt(m.brake.x, m.brake.z); P.settle();
      }
      out.push([m.id, !!G.flags['c2_mill_' + m.id]]);
    }
    return { mills: out, fail: out.every((x) => x[1]) ? null : 'mills' };
  }],
  ['Baldino builds the key → Zoé', () => {
    const d = game.rooms.zeelich.workshopDoor; P.through(d.x, d.z, { run: true });
    const r = P.talk('baldino'); P.wait(1); P.settle();
    return { ...r, key: game.flags.c2_key, room: game.room?.id, body: game.hero.body, fail: game.room?.id === 'lighttop' ? null : 'no lighthouse' };
  }],
  ['Zoé: the dials (sun, wave, star) and the microphone', () => {
    const G = game, R = G.room, out = [];
    for (let i = 0; i < 3; i++) {
      const s = R.searches.find((x) => x.id === 'dial' + (i + 1));
      for (let k = 0; k < 3 && (G.story.cur.dials || [1, 2, 0])[i] !== i; k++) P.use(s.x, s.z, { near: 0.8 });
      out.push((G.story.cur.dials || [])[i]);
    }
    const mic = R.searches.find((x) => x.id === 'mic'); P.use(mic.x, mic.z, { near: 0.8 }); P.wait(1); P.settle();
    return { dials: out, broadcast: G.flags.c2_broadcast, body: G.hero.body, room: G.room?.id, fail: G.flags.c2_broadcast ? null : 'broadcast' };
  }],
  ['the platform shield', () => {
    const G = game; if (G.room?.id === 'workshop') { const e = G.room.exits.find((x) => !x.room); P.through(e.x, e.z); }
    const c = G.rooms.zeelich.platform.console; const r = P.use(c.x, c.z, { near: 1.3, run: true }); P.wait(1.5); P.settle();
    return { ...r, shield: G.flags.c2_shield, fail: G.flags.c2_shield ? null : 'shield' };
  }],
  ['Vesk goes down', () => { const r = P.talk('vesk', { run: true }); P.settle(60); return { ...r, down: game.flags.c2_veskDown, fail: game.flags.c2_veskDown ? null : 'vesk' }; }],
  // (SHAFT-CITADEL: Vesk flies home; the platform console reads the shaft at Citadel's station sealed from below)
  ['the console: the shaft sealed → chapter 4', () => { const c = game.rooms.zeelich.platform.console; const r = P.use(c.x, c.z, { near: 1.3, run: true }); P.settle(90); P.settle(30); return { ...r, chapter: game.flags.chapterKey, room: game.room?.id, fail: game.flags.chapterKey === 'dig' ? null : 'no chapter 4' }; }],
];
