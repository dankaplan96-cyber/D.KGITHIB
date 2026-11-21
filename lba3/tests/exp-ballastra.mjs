// EXP-2: chapter 11 of the expanded campaign, "Ballastra" (key 'ballastra', story/ballastra.js), from chapter 10's last
// step to the next chapter's start, by input wherever it is a player's step (tests/lib/player.js: keys, the game's own
// time step, A* over its collision). Team-only content (docs/lba-maturity/EXP-PLAN-2.md §3.2).
//   a chapter-10 save at the fortress shelter, Oren pushing the B-7's lever → a hand holds it (chapter 10's last step):
//   Baldino's call asks where the B-7 came from, Zoé's return label (TESSA'S FLOAT REPAIRS) → the card "Chapter 11 ·
//   Ballastra" at Citadel Spaceport by the freighter → Doran flies him to Float Harbor (?nocine: no film) → Quill weighs
//   him → the shed's door: AT THE LIFT → Tessa, Ferro's boat halfway up the lift → the crank (high weight, low deck) →
//   Hobb: crane B's load → the wrong attempt (the weight high, the latch struck: the load on the walkway, the deck
//   halfway) → the crank to the middle: balanced, the boat sails, the bridge and the gate open → Tessa: the label, the
//   B-7, the box, a float and Halden's numbers → the Arch District (flooded) → the Water Gardens: Wenna, the gauges →
//   the tunnel: the copper tap, shut with the bypass seized (the wrong attempt: nothing anywhere but the sea, Corvin
//   comes running) → the bypass kicked free, the gardens' gate opened → Save & quit → Continue mid-puzzle (the water as
//   it was) → the kiln's and the sea's latches by the ball: shared → Wenna, Corvin's float → Halden's plan → the pump
//   room: the wheel (chained), the chain by the sword, the wheel (the pawl), the pawl by the ball, the gate: the canal
//   falls; Oren → Dunn's door: three blows, a kick → the Speaking Steps: Tessa, Baldino on Doran's set (every coil, no
//   regulators) → the next chapter (EXP-3: chapter 12, the House of Balances, on Ballastra; tests/exp-balances.mjs).
// Also: the cast's models load on demand; the travel menu offers Ballastra once he has landed; the cost at the harbour.
// Times are the bot's game time: a floor, not a first-time estimate.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { browser, page } = await launch({ width: 960, height: 540 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
let played = 0;
const timed = async (f, a) => { const t0 = await ev(() => game.time); const r = await ev(f, a); played += (await ev(() => game.time)) - t0; return r; };

// chapter 10 played up to its last step: the B-7 fitted and set, Oren pushing its lever shut (EXP-1)
const UP_TO_LEVER = { prologueDone: true, intro: true, c1_started: true, c1_water: true, c1_done: true, c1_plan: true, c2_shield: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true,
  c5_dallanOK: true, c5_relief: true, c5_vent: true, c6_up: true, c6_sword: true, c6_trip2: true, c6_thawed: true, c7_vent: true, c8_home: true, c8_gilbert: true, c8_mira: true, c8_fort: true, c8_depot: true, c8_pippa: true, c8_zoeDone: true, c8_done: true,
  c9_started: true, c9_form: true, c9_nara: true, c9_oku: true, c9_clerk: true, c9_heard: true, c9_plans: true, c9_vote: true, ml_2: true, ml_3: true,
  cn_v: 1, cn_closed: true, cn_kell: true, cn_log: true, cn_stop: true, cn_isoGot: true, cn_isoA: true, cn_isoB: true, cn_iso: true, cn_lane: true, exp: 1,
  og_started: true, og_home: true, og_arrived: true, og_room: true, og_bleed: 3, og_steady: true, og_thanks: true,
  th_zoeGo: true, th_met: true, th_reg: true, th_cA: true, th_cC: true, th_cB: 2, th_b7: true, th_zoeDone: true, th_fitted: true, th_band: 3, th_set: true, th_push: true };
const helpers = () => ev(() => {
  const G = game;
  window.__said = []; const say0 = G.say.bind(G);
  G.say = (name, text, cb, sp, col) => { window.__said.push((name ? name + ': ' : '') + (Array.isArray(text) ? text.join(' ') : text)); return say0(name, text, cb, sp, col); };
  window.__cards = []; const H = G.hud, cc = H.chapterCard.bind(H); H.chapterCard = (a, b) => { window.__cards.push((a ? a + ' · ' : '') + b); return cc(a, b); };
  const CH = (k) => G.story.chapters.find((c) => c.key === k);
  window.T = {
    ch: () => CH('ballastra'), th: () => CH('throttle'),
    obj: () => document.querySelector('#pause-objective')?.textContent || '',
    said: (n) => window.__said.slice(-n),
    view: () => {
      const f = G.flags, bl = {};
      for (const k of Object.keys(f)) if (k.startsWith('bl_')) bl[k.slice(3)] = f[k];
      return { key: f.chapterKey, n: G.story.number(f.chapterKey) ?? null, room: G.room?.id ?? 'citadel', state: G.state, bl, vm2: f.vm_2 ?? null,
        obj: T.obj(), journal: G.story.journal().map((c) => c.title), cards: [...window.__cards], items: G.story.items().map((i) => i.id), coins: G.hero.coins, clovers: G.hero.clovers };
    },
    // walk to a spot and press E on the expected thing; the lines it brought
    use(p, kind, near = 0.8) { const n0 = window.__said.length; const r = P.use(p.x, p.z, { kind, near }); for (let i = 0; i < 12; i++) G.step(0.1); P.settle(); return { r: r.r, kind: r.target?.kind ?? null, said: window.__said.slice(n0) }; },
    talk(id) { const n0 = window.__said.length; const r = P.talk(id, { run: true }); for (let i = 0; i < 6; i++) G.step(0.1); P.settle(); return { r: r.r, said: window.__said.slice(n0) }; },
    // the ball at a story target {x, y, z}: from a few metres off, aimed by the throw's own assist; up to six tries
    ball(tg, flag, r = 4.5, a0 = 0.3) {
      const n0 = window.__said.length, f0 = JSON.stringify(G.flags[flag]);
      for (let k = 0; k < 6 && JSON.stringify(G.flags[flag]) === f0; k++) {
        const a = k * 1.05 + a0; P.go(tg.x - Math.sin(a) * r, tg.z - Math.cos(a) * r, { tol: 0.9, maxT: 40 }); P.settle();
        if (G.hero.behaviour !== 'normal') P.tap('F1');
        P.throwAt(tg.x, tg.z); P.settle();
      }
      for (let i = 0; i < 20; i++) G.step(0.1); P.settle();
      return { hit: JSON.stringify(G.flags[flag]) !== f0, v: G.flags[flag], said: window.__said.slice(n0) };
    },
    // a melee blow (the attack key) at a point, with the weapon asked for
    strike(p, weapon) {
      const h = G.hero; if (h.combat?.weapon !== weapon) { h.combat.equip(weapon); G.step(0.4); }   // (the weapon picked in the weapons menu: R only swaps with the last one)
      P.face(p.x, p.z); const n0 = window.__said.length; P.tap('KeyK', 0.35); G.step(0.6); P.settle(); for (let i = 0; i < 6; i++) G.step(0.1); P.settle();
      return { weapon: h.combat?.weapon, said: window.__said.slice(n0) };
    },
    // (a remark on the way — Mags's hail — stops the walk: read, a player walks on to the door; twice at most)
    through(e) { const from = G.room?.id ?? 'citadel'; let r = P.through(e.x, e.z); for (let k = 0; k < 2 && (G.room?.id ?? 'citadel') === from; k++) r = P.through(e.x, e.z); for (let i = 0; i < 20; i++) G.step(0.1); P.settle(); return { ...r, room: G.room?.id ?? 'citadel' }; },
    draws() { const R = G.renderer.renderer; let main = 0, shadow = 0; const o = R.renderBufferDirect.bind(R); R.renderBufferDirect = (cam, scene, ...a) => { if (scene) main++; else shadow++; return o(cam, scene, ...a); }; G.perf.beginFrame(); G.frame(1 / 30, true); R.renderBufferDirect = o; return { main, shadow }; },
  };
});
const reload = async () => { await open(page, '?nocine'); await helpers(); await page.click('#btn-continue'); await ev(() => { game.step(0.05); P.settle(); for (let i = 0; i < 10; i++) game.step(0.1); P.settle(); }); };
const saveQuit = async () => {
  await ev(() => { P.tap('Escape'); game.step(0.1); });
  await page.click('#pause [data-act="quit"]', { timeout: 60000 }).catch(async () => { await ev(() => game.act('quit')); });
  await page.waitForEvent('load', { timeout: 20000 }).catch(() => {});   // (Quit's own reload lands first: a slow machine took longer than 1.5 s)
  await page.waitForTimeout(1500);
  await reload();
};
// (the cast's models arrive by fetch: let the page's own tasks run until the people stand there)
const castIn = async (id = 'tessa') => { await page.waitForFunction((i) => game.npcs.some((n) => n.def.id === i), id, { timeout: 120000 }).catch(() => {}); await ev(() => { game.story.refreshCast(); game.step(0.1); }); };

// ---------------------------------------------------------------- a chapter-10 save at the shelter, its last step
await open(page, '?nocine');
await menu(page, 'new');
await helpers();
await ev((F) => {
  const G = game; P.settle();
  Object.assign(G.flags, F, { chapter: 9, chapterKey: 'throttle' }); delete G.flags.exp_base;
  G.hero.hasBall = true; G.hero.hasSword = true;
  G.story.applyFlags(); const ch = T.th(), p = ch.front(1.0, 0.2);
  G.exitRoom({ x: p.x, z: p.z, a: 0 }, true); G.step(0.5); P.settle();
  G.save(false);
}, UP_TO_LEVER);
await reload();
const s0 = await timed(() => {
  const G = game, ch = T.th(), a = T.view();
  const r = T.use(ch.front(), 'thhold', 0.7);
  for (let i = 0; i < 600 && G.flags.chapterKey === 'throttle'; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
  P.settle(); for (let i = 0; i < 30; i++) G.step(0.1); P.settle();
  const d = P.npc('doran');
  return { before: a.key, r: r.r, ...T.view(), said: window.__said.slice(-30), doran: d ? { present: d.present, d: +d.distTo(G.hero).toFixed(1) } : null, items: G.story.items().map((i) => i.id) };
});
console.log('chapter 10 → 11:', JSON.stringify(s0).slice(0, 1600));
check("chapter 10's end in the expanded campaign: Baldino asks where the B-7 came from; Zoé's return label names Tessa's Float Repairs on Ballastra", s0.before === 'throttle' && s0.said.some((l) => /That B-7 let one station say no/.test(l)) && s0.said.some((l) => /TESSA'S FLOAT REPAIRS · FLOAT HARBOR · BALLASTRA/.test(l)), s0.said.slice(-14));
check('chapter 11 "Ballastra" follows (its card), numbered 11, at Citadel Spaceport by Doran and the freighter', s0.key === 'ballastra' && s0.n === 11 && s0.cards.some((c) => /Chapter 11 · Ballastra/.test(c)) && s0.room === 'citadel' && s0.doran?.present && s0.doran.d < 5, { key: s0.key, n: s0.n, cards: s0.cards, doran: s0.doran });
check('the objective: board the freighter; the label in his pockets; the journal has "11. Ballastra"', /Board Doran's freighter/.test(s0.obj) && s0.items.includes('bl_label') && s0.journal.includes('11. Ballastra'), { obj: s0.obj, items: s0.items, j: s0.journal });

// ---------------------------------------------------------------- the freighter to Float Harbor
await ev(() => { T.talk('doran'); });
await page.waitForFunction(() => game.flags.bl_arrived || game.trans, null, { timeout: 120000 }).catch(() => {});
const s1 = await timed(() => { const G = game; for (let i = 0; i < 60 && !G.flags.bl_arrived; i++) G.step(0.1); P.settle(); for (let i = 0; i < 20; i++) G.step(0.1); P.settle(); return { ...T.view(), said: window.__said.slice(-4) }; });
await castIn();
const cast = await ev(() => ({ tessa: !!P.npc('tessa')?.present, hobb: !!P.npc('bl_hobb')?.present, quill: !!P.npc('bl_quill')?.present, ferro: !!P.npc('bl_ferro')?.present, doran: !!P.npc('doran')?.present, polys: ['tessa', 'docker1', 'docker2', 'docker3'].every((n) => game.npcs.some((x) => x.def.char === n)) }));
check('Doran flies him to Ballastra: Float Harbor, landed on the pad; "Everything here floats"', s1.room === 'ballastra' && s1.bl.arrived && s1.said.some((l) => /Everything here floats/.test(l)), s1);
check("the cast's models load on demand and the harbour's people stand there (Tessa, Hobb, Quill, Ferro; Doran by the freighter)", Object.values(cast).every(Boolean), cast);

// ---------------------------------------------------------------- N1: Quill, the shed's sign, Tessa, the lift
const n1a = await timed(() => {
  const G = game, H = G.rooms.ballastra.harbor;
  const q = T.talk('bl_quill'); if (!G.flags.bl_quWeighed) q.said.push(...T.talk('bl_quill').said);   // (his hail on the way up: a player talks to him then)
  const sign = T.use(H.spawns.shedDoorOut, 'bl_sign', 1.0);
  const te = T.talk('tessa');
  return { q, sign, te, ...T.view() };
});
// (P81 scene 3, 20.11: Quill's weighing now ends on the jammed lift and the wrong sums, not "opinions about ballast")
check("Quill weighs visitors (the lift jammed, somebody's sums wrong); the shed's door: AT THE LIFT", n1a.q.said.some((l) => /Visitors are weighed/.test(l)) && n1a.q.said.some((l) => /lift has been jammed/.test(l)) && n1a.sign.said.some((l) => /AT THE LIFT/.test(l)), { q: n1a.q.said, sign: n1a.sign });
check("Tessa at the lift: one job, free Ferro's boat; the objective's three steps", n1a.bl.tessa1 && n1a.te.said.some((l) => /One job/.test(l)) && /Free Ferro's boat/.test(n1a.obj), { te: n1a.te.said, obj: n1a.obj });
const n1b = await timed(() => {
  const G = game, H = G.rooms.ballastra.harbor;
  const c1 = T.use(H.spots.crank, 'bl_crank', 0.9); const lv1 = H.lift.level;
  const c2 = T.use(H.spots.crank, 'bl_crank', 0.9); const lv2 = H.lift.level;
  const ho = T.talk('bl_hobb');
  return { c1, lv1, c2, lv2, ho, cw: G.flags.bl_cw, ...T.view() };
});
check('the crank: the weight up a notch at a time, the deck down (high weight, low deck: Tessa says so); no notch alone lifts it', n1b.c1.said.some((l) => /The weight: in the middle\. The deck: down at the sea/.test(l)) && n1b.c1.said.some((l) => /High weight, low deck/.test(l)) && n1b.lv1 === 0 && n1b.lv2 === 0 && n1b.cw === 0, n1b);
check("Hobb: crane B's load on the counterweight; its latch is up the jib, for the ball", n1b.bl.hobb && n1b.ho.said.some((l) => /crane B's load on that counterweight/.test(l)), n1b.ho);
const n1c = await timed(() => { const G = game, H = G.rooms.ballastra.harbor; const b = T.ball(H.craneLatch, 'bl_released', 4.5, 1.35); return { b, lv: H.lift.level, blocked: H.walkway.blocked, balanced: H.balanced, ...T.view() }; });
check('the wrong attempt: the latch struck with the weight high: the load lies on the walkway (shut) and the deck stops halfway again', n1c.b.hit && n1c.bl.released && !n1c.bl.n1 && n1c.lv === 1 && n1c.blocked && n1c.b.said.some((l) => /stops halfway again/.test(l)), n1c);
const n1d = await timed(() => {
  const G = game, H = G.rooms.ballastra.harbor, c0 = G.hero.coins;
  const c = T.use(H.spots.crank, 'bl_crank', 0.9);
  for (let i = 0; i < 120; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
  P.grab?.(12); P.settle(); for (let i = 0; i < 40; i++) G.step(0.1);
  return { c, lv: H.lift.level, balanced: H.balanced, blocked: H.walkway.blocked, boatOut: H.boat.out, bridge: H.shortcut.open, gate: G.rooms.ballastra.exits.includes(H.exits.toArches), coins: G.hero.coins - c0, ...T.view() };
});
check('the crank to the middle: the load seats on the weight, the deck level with the basin, the boat sails out', n1d.bl.n1 && n1d.balanced && n1d.lv === 2 && !n1d.blocked && n1d.boatOut && n1d.c.said.some((l) => /floats free/.test(l)), n1d);
check('the harbour opens: the pier bridge swung back, the district gate open; Ferro tosses his kashes', n1d.bridge && n1d.gate && n1d.coins >= 10, { bridge: n1d.bridge, gate: n1d.gate, coins: n1d.coins });
const n1e = await timed(() => { const te = T.talk('tessa'); return { te, ...T.view() }; });
check("Tessa and the label: she mended the B-7, was told it was rejected; a bounded job (the box) needing Corvin's float and Halden's numbers", n1e.bl.tessa2 && n1e.te.said.some((l) => /Rejected/.test(l)) && n1e.te.said.some((l) => /A bounded job/.test(l)) && n1e.te.said.some((l) => /Corvin's kiln/.test(l)) && /Water Gardens are dry/.test(n1e.obj) && !n1e.items.includes('bl_label'), { said: n1e.te.said, obj: n1e.obj, items: n1e.items });

// ---------------------------------------------------------------- through the Arch District to the Water Gardens
const n2a = await timed(() => {
  const G = game, H = G.rooms.ballastra.harbor;
  const t1 = T.through(H.exits.toArches); const A = G.rooms.bl_arches.arches;
  const flooded = A.canal.level;
  for (let i = 0; i < 10; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
  const t2 = T.through(A.exits.toGardens);
  return { t1, flooded, t2, ...T.view(), said: window.__said.slice(-6) };
});
check('the district gate leads into the Arch District (the lower row flooded) and on to the Water Gardens', n2a.t1.room === 'bl_arches' && n2a.flooded === 0 && n2a.t2.room === 'bl_gardens', n2a);
const n2b = await timed(() => {
  const G = game, GD = G.rooms.bl_gardens.gardens;
  const w = T.talk('bl_wenna');
  const u = T.use(GD.spots.gaugeUpper, 'bl_gauge', 0.8), l = T.use(GD.spots.gaugeLower, 'bl_gauge', 0.8);
  return { w, u, l, ...T.view() };
});
check('Wenna: no water; the two gauges compared: full above, dry below', n2b.bl.wenna1 && n2b.bl.gauges && n2b.l.said.some((l) => /Full above, dry below/.test(l)), { w: n2b.w.said, u: n2b.u.said, l: n2b.l.said });
const n2c = await timed(() => {
  const G = game, GD = G.rooms.bl_gardens.gardens;
  const hatch = T.through(GD.doors.tunnelOut);
  const look = T.use(GD.spots.tap, 'bl_tap', 0.8);
  const shut = T.use(GD.spots.tap, 'bl_tap', 0.8);
  for (let i = 0; i < 20; i++) G.step(0.1); P.settle();
  const corvin = P.npc('bl_corvin');
  return { hatch: hatch.room, look, shut, kiln: GD.kiln.running, flows: GD.channels.flows, corvin: corvin ? { present: corvin.present, d: +corvin.distTo(G.hero).toFixed(1) } : null, ...T.view() };
});
check('the tunnel: a copper tap takes the water before the board', n2c.hatch === 'bl_tunnel' && n2c.look.said.some((l) => /before it reaches the board/.test(l)), n2c.look);
check('the wrong attempt: the tap shut with the bypass seized: nothing for the gardens or the kiln, all to the sea; Corvin comes running', n2c.bl.tapShut && !n2c.kiln && n2c.flows.overflow > 0.9 && n2c.flows.gardens < 0.05 && n2c.shut.said.some((l) => /Who stopped my wheel/.test(l)) && n2c.corvin?.present && n2c.corvin.d < 12, { flows: n2c.flows, kiln: n2c.kiln, corvin: n2c.corvin, said: n2c.shut.said });
const n2d = await timed(() => {
  const G = game, GD = G.rooms.bl_gardens.gardens;
  const look = T.use(GD.spots.bypassValve, 'bl_bypass', 0.8);
  P.tap('F3', 0.1);
  const k1 = T.use(GD.spots.bypassValve, 'bl_bypass', 0.8), k2 = T.use(GD.spots.bypassValve, 'bl_bypass', 0.8);
  P.tap('F1', 0.1);
  const g1 = T.use(GD.spots.gate1, 'bl_gate1', 0.8), g2 = T.use(GD.spots.gate1, 'bl_gate1', 0.8);
  return { look, k1, k2, g1, g2, free: GD.bypass.free, gates: [1, 2, 3].map((i) => GD.gate.get(i)), flows: GD.channels.flows, ...T.view() };
});
check('the bypass is rusted solid (a hand will not move it); two kicks free it and the water reaches the board; the gardens\' gate opened', n2d.look.said.some((l) => /rusted solid/.test(l)) && n2d.free && n2d.bl.bypass && n2d.gates[0] === 2 && n2d.flows.gardens > 0.3 && n2d.flows.gardens < 0.6 && !n2d.bl.n2, n2d);
await saveQuit();
await castIn('bl_wenna');
const r1 = await ev(() => { const G = game, GD = G.rooms.bl_gardens.gardens; return { ...T.view(), gates: [1, 2, 3].map((i) => GD.gate.get(i)), tap: GD.tap.open, free: GD.bypass.free, flows: GD.channels.flows, corvin: P.npc('bl_corvin')?.present }; });
check('Save & quit → Continue mid-puzzle: the tunnel, chapter 11, the tap shut, the bypass free, the gates as he left them', r1.key === 'ballastra' && r1.room === 'bl_tunnel' && !r1.tap && r1.free && r1.gates.join() === '2,2,2' && Math.abs(r1.flows.gardens - 1 / 3) < 0.02, r1);
const n2e = await timed(() => {
  const G = game; const out = T.through(G.rooms.bl_tunnel.exits[0]); const GD = G.rooms.bl_gardens.gardens, B = GD.ballTargets;
  const s1 = T.ball({ ...B.gate3Latch }, 'bl_g3'), s2 = T.ball({ ...B.gate3Latch }, 'bl_g3'), k1 = T.ball({ ...B.gate2Latch }, 'bl_g2');
  for (let i = 0; i < 30; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); } P.settle();
  P.grab?.(12); P.settle();
  return { out: out.room, s1, s2, k1, gates: [1, 2, 3].map((i) => GD.gate.get(i)), flows: GD.channels.flows, rafts: GD.rafts.state, walk: GD.walkways.level, kiln: GD.kiln.running, ...T.view(), said: window.__said.slice(-10) };
});
console.log('N2 latches:', JSON.stringify(n2e).slice(0, 1500));
check("the latches by the ball across the channel: the sea's gate down to shut, the kiln's to half", n2e.s1.hit && n2e.s2.hit && n2e.k1.hit && n2e.gates.join() === '2,1,0', { gates: n2e.gates, s1: n2e.s1.said, k1: n2e.k1.said });
check("shared: the gardens' channel full and the kiln's wheel steady; the basins rise, the rafts recover; Wenna's thanks and a clover", n2e.bl.n2 && n2e.flows.gardens > 0.6 && n2e.flows.kiln > 0.25 && n2e.flows.kiln < 0.45 && n2e.kiln && n2e.rafts === 1 && n2e.walk === 1 && n2e.said.some((l) => /this week's water/.test(l)), { flows: n2e.flows, rafts: n2e.rafts, walk: n2e.walk });
const n2f = await timed(() => { const co = T.talk('bl_corvin'); return { co, ...T.view() }; });
check("Corvin by his wheel: slower, steady; he'll glaze Tessa's float off a recorded gate; the objective: Halden", n2f.bl.float && n2f.co.said.some((l) => /recorded gate/.test(l)) && /Halden/.test(n2f.obj), { said: n2f.co.said, obj: n2f.obj });

// ---------------------------------------------------------------- N3: Halden, the pump room, Oren, Dunn
const n3a = await timed(() => {
  const G = game, GD = G.rooms.bl_gardens.gardens;
  const back = T.through(GD.exits.toArches); const A = G.rooms.bl_arches.arches;
  const inn = T.through(A.doors.orenOut);
  const ha = T.talk('bl_halden');
  const out = T.through(G.rooms.bl_oren.exits[0]);
  return { back: back.room, inn: inn.room, ha, out: out.room, ...T.view() };
});
check("Halden's house on the upper terrace: the old plan (a spill gate for the lower row); he drew the safeguards, others chose", n3a.back === 'bl_arches' && n3a.inn === 'bl_oren' && n3a.bl.plan && n3a.ha.said.some((l) => /LOWER ROW · SPILL/.test(l)) && n3a.ha.said.some((l) => /Other people decided which ones to keep/.test(l)) && n3a.items.includes('bl_plan'), { ha: n3a.ha.said, items: n3a.items });
const n3b = await timed(() => {
  const G = game, A = G.rooms.bl_arches.arches;
  const inn = T.through(A.doors.pumpOut);
  const plates = T.use(A.spots.pumpPlates, 'bl_plates', 0.8), cmp = T.use(A.spots.pumpMachine, 'bl_machine', 0.9);
  const w1 = T.use(A.spots.spillWheel, 'bl_wheel', 0.8);
  P.go(A.swordTargets.spillChain.x + 0.9, A.swordTargets.spillChain.z + 0.6, { tol: 0.35 });
  const cut = T.strike(A.swordTargets.spillChain, 'sword');
  const w2 = T.use(A.spots.spillWheel, 'bl_wheel', 0.8);
  return { inn: inn.room, plates, cmp, w1, cut, w2, chain: A.chain.severed, ...T.view() };
});
check('the pump room: UPPER TERRACE · PRIORITY; the plan against the machine: the gate chained under the council\'s seal', n3b.inn === 'bl_pump' && n3b.plates.said.some((l) => /PRIORITY/.test(l)) && n3b.cmp.said.some((l) => /under the council's seal/.test(l)), { plates: n3b.plates.said, cmp: n3b.cmp.said });
check('the wheel held by the chain (wants an edge); the sword cuts it; the wheel then stops dead: a pawl up on the pier wall', n3b.w1.said.some((l) => /wants an edge/.test(l)) && n3b.chain && n3b.bl.chain && n3b.w2.said.some((l) => /pawl's holding the gate/.test(l)), { w1: n3b.w1.said, cut: n3b.cut, w2: n3b.w2.said });
const n3c = await timed(() => {
  const G = game, A = G.rooms.bl_arches.arches;
  const pawl = T.ball({ ...A.ballTargets.spillPawl }, 'bl_pawl', 3, 1.35);
  const open = T.use(A.spots.spillWheel, 'bl_wheel', 0.8);
  for (let i = 0; i < 60; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); } P.settle();
  return { pawl, open, gate: A.spillGate.open, level: A.canal.level, ...T.view(), said: window.__said.slice(-10) };
});
check('the pawl struck by the ball; the wheel turns: the spill gate rises and the canal falls to balanced', n3c.pawl.hit && n3c.bl.spill && n3c.gate && n3c.level === 1, { pawl: n3c.pawl, gate: n3c.gate, level: n3c.level });
check('Oren from the pumps: the row\'s young ones went to sleep in his keeping when the council would not open it; "Safe."', n3c.said.some((l) => /gave the lower row's young ones to me/.test(l)) && n3c.said.some((l) => /They are still safe/.test(l)), n3c.said);
const n3d = await timed(() => {
  const G = game, A = G.rooms.bl_arches.arches;
  const out = T.through(G.rooms.bl_pump.exits[0]);
  const du = T.talk('bl_dunn');
  const S = A.swordTargets.dunnSilt, door = A.spots.dunnDoor;
  P.go(door.x, door.z + 0.4, { tol: 0.35 });
  const hits = []; for (let k = 0; k < 6 && (G.flags.bl_silt | 0) < 3; k++) hits.push(T.strike(S, 'sword'));
  P.tap('F3', 0.1);
  const kick = T.use(door, 'bl_dunndoor', 0.9);
  P.tap('F1', 0.1);
  for (let i = 0; i < 30; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); } P.settle();
  return { out: out.room, du, hits: hits.length, silt: G.flags.bl_silt, kick, open: A.dunnDoor.open, home: A.row.home, ...T.view() };
});
check("Dunn on dry steps, his door silted: three blows clear it, a kick opens it; the lower row comes home", n3d.out === 'bl_arches' && n3d.silt === 3 && n3d.open && n3d.home && n3d.bl.n3 && /Speaking Steps/.test(n3d.obj), { du: n3d.du, hits: n3d.hits, kick: n3d.kick, open: n3d.open, home: n3d.home, obj: n3d.obj });

// ---------------------------------------------------------------- the Speaking Steps and the way home
const e1 = await timed(() => {
  const G = game;
  for (let i = 0; i < 30; i++) G.step(0.1); G.story.refreshCast(); P.settle();
  const te = T.talk('tessa');
  return { te, ...T.view(), steps: ['bl_mags', 'bl_halden', 'bl_quill'].map((id) => { const n = P.npc(id); return [id, !!n?.present, n ? +Math.hypot(n.pos.x - G.hero.pos.x, n.pos.z - G.hero.pos.z).toFixed(1) : null]; }) };
});
check("the Speaking Steps: Tessa will draw the box; Baldino on Doran's set: every Balance Works coil bought for the project, no regulators (vm_2)", e1.bl.endTalk && e1.vm2 === 1 && e1.te.said.some((l) => /Every coil, and not one regulator/.test(l)), { said: e1.te.said, obj: e1.obj, steps: e1.steps });
const travel = await ev(() => { const G = game, T2 = G.travel, p = T2.points.ballastra_port; return { routes: T2.routes.filter((r) => r.b === 'ballastra_port' && r.gate(G.story)).map((r) => r.a) }; });
check('the travel menu offers Ballastra by spaceship from Citadel and Zeelich once he has landed there', travel.routes.includes('citadel_port') && travel.routes.includes('zeelich_port'), travel);
// (EXP-3: chapter 12 follows on Ballastra at once: no walk back to the freighter; tests/exp-balances.mjs plays on from here)
const e2 = await timed(() => {
  const G = game;
  for (let i = 0; i < 400 && G.flags.chapterKey === 'ballastra'; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
  P.settle(); for (let i = 0; i < 30; i++) G.step(0.1); P.settle();
  return { ...T.view(), said: window.__said.slice(-8) };
});
console.log('the end:', JSON.stringify(e2).slice(0, 1200));
check('the next chapter begins on Ballastra: chapter 12 "The House of Balances"', e2.key === 'balances' && e2.n === 12 && e2.cards.some((c) => /Chapter 12 · The House of Balances/.test(c)), { key: e2.key, n: e2.n, room: e2.room, cards: e2.cards });
const j = await ev(() => game.story.journal().find((c) => /^11\. Ballastra/.test(c.title))?.lines.map((l) => l.key));
check("the journal keeps chapter 11's eight lines, headed by its \"What we know\" (P83 S-2)", Array.isArray(j) && j.length === 9 && j[0] === 'know_ballastra', j);
console.log(`chapter 11 bot game time, chapter 10's last step to chapter 14's start: ${played.toFixed(0)} s (${(played / 60).toFixed(1)} min; a floor: the bot walks A* routes and reads every line at once)`);

// ---------------------------------------------------------------- the cost at the harbour (SwiftShader: counts only)
const cost = await ev(() => {
  const G = game, H = G.rooms.ballastra.harbor;
  G.enterRoom('ballastra', H.spawns.pad, true); for (let i = 0; i < 10; i++) G.step(0.1);
  const pad = T.draws();
  G.enterRoom('ballastra', { ...H.stands.tessa_lift, a: Math.PI }, true); for (let i = 0; i < 10; i++) G.step(0.1);
  return { pad, lift: T.draws() };
});
console.log('at the harbour (pad / lift):', JSON.stringify(cost));
check('the cost at the harbour with its people: under the Citadel street\'s 215 main draw calls (SwiftShader counts)', cost.pad.main < 215 && cost.lift.main < 215, cost);

done();
await browser.close();
