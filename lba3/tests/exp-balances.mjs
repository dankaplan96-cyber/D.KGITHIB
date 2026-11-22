// EXP-3: chapters 12 "The House of Balances" and 13 "The Cradles" of the expanded campaign (story/balances.js), from
// chapter 11's last talk to the network, by input wherever it is a player's step (tests/lib/player.js), with a Save & quit
// and Continue at each handoff; then Tessa's B-8 at the network's valve-room station, the Cradle Hall before the end
// card, and a legacy base-campaign (exp_base) save that must reach its original ending with none of it.
// Team-only content (docs/lba-maturity/EXP-3.md). Automated runtime only: the bot knows every answer.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { browser, page } = await launch({ width: 960, height: 540 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
let played = 0;
const timed = async (f, a) => { const t0 = await ev(() => game.time); const r = await ev(f, a); played += (await ev(() => game.time)) - t0; return r; };

const BASE = { prologueDone: true, intro: true, c1_started: true, c1_water: true, c1_done: true, c1_plan: true, c2_shield: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true,
  c5_dallanOK: true, c5_relief: true, c5_vent: true, c6_up: true, c6_sword: true, c6_trip2: true, c6_thawed: true, c7_vent: true, c8_home: true, c8_gilbert: true, c8_mira: true, c8_fort: true, c8_depot: true, c8_pippa: true, c8_zoeDone: true, c8_done: true,
  c9_started: true, c9_form: true, c9_nara: true, c9_oku: true, c9_clerk: true, c9_heard: true, c9_plans: true, c9_vote: true, ml_2: true, ml_3: true,
  cn_v: 1, cn_closed: true, cn_kell: true, cn_log: true, cn_stop: true, cn_isoGot: true, cn_isoA: true, cn_isoB: true, cn_iso: true, cn_lane: true };
const TH = { og_started: true, og_home: true, og_arrived: true, og_room: true, og_bleed: 3, og_steady: true, og_thanks: true, th_zoeGo: true, th_met: true, th_reg: true, th_cA: true, th_cC: true, th_cB: 2, th_b7: true,
  th_zoeDone: true, th_fitted: true, th_band: 3, th_set: true, th_push: true, th_lever: true, th_vesk: true, th_done: true };
const BL = {}; for (const k of 'started arrived quHail quWeighed sign tessa1 crank hobb released n1 tessa2 seenArches maHail wenna1 gaugeU gaugeL gauges tapSeen tapShut bypassSeen bypass n2 n2seen float rafts2 plan compare chain chainSeen pawlSeen pawl spill dunn n3'.split(' ')) BL['bl_' + k] = true;
Object.assign(BL, { bl_cw: 1, bl_g1: 2, bl_g2: 1, bl_g3: 0, bl_silt: 3 });

const helpers = () => ev(() => {
  const G = game;
  window.__said = []; const say0 = G.say.bind(G);
  G.say = (name, text, cb, sp, col) => { window.__said.push((name ? name + ': ' : '') + (Array.isArray(text) ? text.join(' ') : text)); return say0(name, text, cb, sp, col); };
  window.__cards = []; const H = G.hud, cc = H.chapterCard.bind(H); H.chapterCard = (a, b) => { window.__cards.push((a ? a + ' · ' : '') + b); return cc(a, b); };
  const CH = (k) => G.story.chapters.find((c) => c.key === k);
  const run = (n = 30) => { for (let i = 0; i < n; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); } P.settle(); };
  window.T = {
    CH, run,
    view: () => { const f = G.flags; return { key: f.chapterKey, n: G.story.number(f.chapterKey) ?? null, room: G.room?.id ?? 'citadel', state: G.state, obj: document.querySelector('#pause-objective')?.textContent || G.story.objective().replace(/<[^>]+>/g, ' '), cards: [...window.__cards], journal: G.story.journal().map((c) => c.title) }; },
    use(p, kind, near = 0.8) { const n0 = window.__said.length; const r = P.use(p.x, p.z, { kind, near }); run(12); return { r: r.r, kind: r.target?.kind ?? null, said: window.__said.slice(n0) }; },
    talk(id) { const n0 = window.__said.length; const r = P.talk(id, { run: true }); run(8); return { r: r.r, said: window.__said.slice(n0) }; },
    through(e) { const from = G.room?.id ?? 'citadel'; let r = P.through(e.x, e.z); for (let k = 0; k < 2 && (G.room?.id ?? 'citadel') === from; k++) r = P.through(e.x, e.z); run(20); return { ...r, room: G.room?.id ?? 'citadel' }; },
    flags: (p) => Object.fromEntries(Object.entries(G.flags).filter(([k]) => k.startsWith(p))),
  };
});
const reload = async () => { await open(page, '?nocine'); await helpers(); await page.click('#btn-continue', { timeout: 180000 }); await ev(() => { game.step(0.05); P.settle(); for (let i = 0; i < 10; i++) game.step(0.1); P.settle(); }); };
const saveQuit = async () => {
  await ev(() => { P.tap('Escape'); game.step(0.1); });
  await page.click('#pause [data-act="quit"]', { timeout: 60000 }).catch(async () => { await ev(() => game.act('quit')); });
  await page.waitForEvent('load', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await reload();
};
const castIn = async (id = 'tessa') => { await page.waitForFunction((i) => game.npcs.some((n) => n.def.id === i), id, { timeout: 120000 }).catch(() => {}); await ev(() => { game.story.refreshCast(); game.step(0.1); }); };
const settleTo = (key) => ev((k) => { const G = game; for (let i = 0; i < 900 && G.flags.chapterKey !== k; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); } T.run(30); return T.view(); }, key);

// ---------------------------------------------------------------- chapter 11 finished up to the Speaking Steps
await open(page, '?nocine');
await menu(page, 'new');
await helpers();
await ev((F) => {
  const G = game; P.settle();
  Object.assign(G.flags, F, { exp: 1, chapter: 10, chapterKey: 'ballastra' }); delete G.flags.exp_base;
  G.hero.hasBall = true; G.hero.hasSword = true;
  G.story.applyFlags();
  const A = G.rooms.bl_arches.arches; G.enterRoom('bl_arches', A.spawns.steps, true); G.step(0.5); P.settle();
  G.save(false);
}, { ...BASE, ...TH, ...BL });
await reload();
await castIn('tessa');
const a0 = await timed(() => {
  const G = game; T.run(20); G.story.refreshCast(); P.settle();
  const te = T.talk('tessa');
  for (let i = 0; i < 300 && G.flags.chapterKey === 'ballastra'; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
  T.run(40);
  return { te: te.said, ...T.view(), said: window.__said.slice(-10), bh: T.flags('bh_') };
});
console.log('11 → 12:', JSON.stringify(a0).slice(0, 1500));
check("chapter 11's end points at the House: Baldino wants the regulators found, Tessa names the House of Balances and Fennick; no walk back to the freighter", a0.te.some((l) => /without regulators they only shout/.test(l)) && a0.te.some((l) => /Fennick runs its counter/.test(l)), a0.te);
check('chapter 12 "The House of Balances" follows at once, numbered 12; Tessa sends him over the causeway', a0.key === 'balances' && a0.n === 12 && a0.cards.some((c) => /Chapter 12 · The House of Balances/.test(c)) && a0.said.some((l) => /causeway/.test(l)) && a0.bh.bh_go, { key: a0.key, cards: a0.cards, bh: a0.bh });

// handoff 1: Save & quit, Continue
await saveQuit(); await castIn('tessa');
const a1 = await ev(() => ({ ...T.view(), bh: T.flags('bh_') }));
check('Continue at chapter 12\'s start: the same chapter, its objective (the House)', a1.key === 'balances' && /House of Balances/.test(a1.obj), a1);

// ---------------------------------------------------------------- the House: Fennick, the book, the bench, the turn
const h1 = await timed(() => {
  const G = game, A = G.rooms.bl_arches.arches;
  const g1 = T.through(A.exits.toGardens);
  const GD = G.rooms.bl_gardens.gardens;
  const h = T.through(GD.exits.toHouse);
  G.story.refreshCast(); P.settle();
  const f1 = T.talk('bl_fennick');
  const f2 = T.talk('bl_fennick');
  return { g1: g1.room, h: h.room, f1: f1.said, f2: f2.said, ...T.view() };
});
console.log('the House:', JSON.stringify(h1).slice(0, 900));
check('over the causeway into the House; Fennick: sold, the design and every copy; the order book "if you can read upside down"', h1.h === 'bl_house' && h1.f1.some((l) => /every copy/.test(l)) && h1.f1.some((l) => /upside down/.test(l)), h1);
const h2 = await timed(() => {
  const G = game, Hs = G.story.chapters.find((c) => c.key === 'balances').house();
  const b = T.use(Hs.book, 'bh_book', 0.8);
  const d = T.talk('bl_fennick');
  const k1 = T.use(Hs.bench, 'bh_bench', 0.8);
  const k2 = T.use(Hs.bench, 'bh_bench', 0.8);
  const turn = T.talk('bl_fennick');
  T.run(20);
  return { b: b.said, d: d.said, k1: k1.said, k2: k2.said, turn: turn.said, ...T.view(), bh: T.flags('bh_'), items: G.story.items().map((i) => i.id) };
});
console.log('the investigation:', JSON.stringify(h2).slice(0, 2000));
check('the order book: every coil, no regulators; the B-7 bought with every copy, "failed buyer\'s test"', h2.b.some((l) => /NO REGULATORS/.test(l)) && h2.b.some((l) => /FAILED BUYER'S TEST/.test(l)), h2.b);
check('Fennick defends the arrangement (forty kiln families; levers once used to shut the lower row out)', h2.d.some((l) => /forty kiln families/.test(l)) && h2.d.some((l) => /shut out/.test(l)), h2.d);
check('the bench, played: the needle settles as if held; the card: PASSED; Oren: "I am holding it"', h2.k1.some((l) => /PASSED/.test(l)) && h2.k2.some((l) => /I am holding it/.test(l)), { k1: h2.k1, k2: h2.k2 });
check("the House's records against each other: Fennick turns, gives the test copy and holds the shipment", h2.bh.bh_fig && h2.turn.some((l) => /He told us it failed/.test(l)) && h2.turn.some((l) => /crates stay where they are/.test(l)) && h2.items.includes('bh_figures'), { turn: h2.turn, items: h2.items });

// ---------------------------------------------------------------- the rig: run 1 (Oren holds it), the bands, run 2
const r1 = await timed(() => {
  const G = game, Hs = G.story.chapters.find((c) => c.key === 'balances').house();
  T.through(G.rooms.bl_house.exits[0]);
  G.story.refreshCast(); P.settle();
  const n0 = window.__said.length;
  T.talk('tessa'); T.run(60);
  const te = { said: window.__said.slice(n0) };
  const needs = ['bl_wenna', 'bl_corvin', 'bl_mags'].map((id) => T.talk(id).said.join(' '));
  return { te: te.said.concat(window.__said.slice(-4)), needs, ...T.view(), bh: T.flags('bh_') };
});
console.log('run 1:', JSON.stringify(r1).slice(0, 1600));
check('run 1, the figures as written: three green lamps while the rafts sit low; Oren "steady"; Tessa fits brass levers (B-8)', r1.bh.bh_rig1 && r1.te.some((l) => /I keep them steady/.test(l)) && r1.te.some((l) => /no glaze in the lever/.test(l)), r1.te);
check('each neighbour says what their water needs (A high, B middle, C low)', /high water/.test(r1.needs[0]) && /Middle/.test(r1.needs[1]) && /Keep it low/.test(r1.needs[2]), r1.needs);
const r2 = await timed(() => {
  const G = game, GD = G.rooms.bl_gardens.gardens;
  const dial = (i) => T.use(GD.spots['rigRange' + i], 'bh_dial', 0.6).said.join(' ');
  const d = [dial(0), dial(2)];   // (A to HIGH; C to HIGH: wrong on purpose)
  const t1 = T.talk('tessa'); T.run(110);
  const wrong = window.__said.slice(-4);
  d.push(dial(2));               // (C round to LOW)
  T.run(20);
  const t2 = T.talk('tessa');
  // (CAMPAIGN-CLARITY §7.3: in the pause after "Then let's ask together." Wenna looks off toward the gate to the Arches)
  const C = T.CH('survey'), ff = C.faceFor.bind(C); let face = null;
  C.faceFor = (id, p, s) => { ff(id, p, s); const n = C.npc(id); face = { id, at: !!p, s, turned: !!n?.listenTo?.face, a0: n ? n.angle : null, to: n && p ? Math.atan2(p.x - n.pos.x, p.z - n.pos.z) : null }; C.after(1.4, () => { face.a1 = n?.angle; }); };
  for (let i = 0; i < 400 && G.flags.chapterKey === 'balances'; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
  for (let i = 0; i < 40 && !G.flags.wk_started; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
  T.run(40);
  const wn = C.npc('bl_wenna'); if (face) face.after = wn?.listenTo?.face ?? null;
  const off = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
  if (face && face.to != null) { face.off0 = +off(face.a0, face.to).toFixed(2); face.off1 = face.a1 != null ? +off(face.a1, face.to).toFixed(2) : null; }
  return { d, t1: t1.said, wrong, t2: t2.said, ...T.view(), said: window.__said.slice(-30), bh: T.flags('bh_'), wk: T.flags('wk_'), face };
});
console.log('run 2 → 13:', JSON.stringify(r2).slice(0, 2200));
check('a wrong band shows itself and the rig resets (C set high: the row under)', r2.wrong.some((l) => /doorsteps under/.test(l)) && r2.wrong.some((l) => /Draining/.test(l)), r2.wrong);
check('the right bands hold twice ("It repeats"); Tessa will build five', r2.bh.bh_test && r2.said.some((l) => /It repeats/.test(l)) && r2.said.some((l) => /I'll start now/.test(l)), r2.said.slice(-14));
check('chapter 13 "The Cradles" follows on Ballastra, numbered 13; Wenna face to face: her brother is one of the 304', r2.key === 'survey' && r2.n === 13 && r2.cards.some((c) => /Chapter 13 · The Cradles/.test(c)) && r2.said.some((l) => /One of them is my brother/.test(l)) && r2.wk.wk_started, { key: r2.key, cards: r2.cards, wk: r2.wk });
check('in the pause before the hall\'s place, Wenna turns toward the gate to the Arches, and lets go of it after', r2.face?.id === 'bl_wenna' && r2.face.at && r2.face.turned && !r2.face.after && r2.face.off1 != null && r2.face.off1 < Math.max(0.35, r2.face.off0 * 0.5), r2.face);

// handoff 2
await saveQuit(); await castIn('bl_wenna');
const c0 = await ev(() => ({ ...T.view(), wk: T.flags('wk_') }));
check('Continue at chapter 13\'s start: the same chapter, its objective (the Cradle Hall)', c0.key === 'survey' && /Cradle Hall/.test(c0.obj), c0);

// ---------------------------------------------------------------- the Cradle Hall: the records, Oren, the ring, alone
const c1 = await timed(() => {
  const G = game, A = G.rooms.bl_arches.arches;
  if ((G.room?.id) !== 'bl_arches') T.through(G.rooms.bl_gardens.gardens.exits.toArches);
  const into = T.through(A.exits.toCradles);
  T.run(40);
  const H = G.rooms.bl_cradles && G.story.chapters.find((c) => c.key === 'survey').hall();
  const card = T.use(H.card, 'wk_card', 0.6), led = T.use(H.ledger, 'wk_ledger', 0.8), bay = T.use(H.plaque, 'wk_bay2', 0.8);
  const ask = T.use(H.rings, 'wk_rings', 1.2);
  const ring = T.use(H.ring, 'wk_ring', 0.6);
  const lev = T.use(H.lever, 'wk_lever', 0.6);
  for (let i = 0; i < 200 && !G.flags.wk_solo; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
  T.run(20);
  return { into: into.room, door: window.__said.filter((l) => /Every family says that|Visitors may look/.test(l)), card: card.said, led: led.said, bay: bay.said, ask: ask.said, ring: ring.said, solo: window.__said.slice(-9), ...T.view(), wk: T.flags('wk_') };
});
console.log('the hall:', JSON.stringify(c1).slice(0, 2500));
check("the keepers' door by the bell leads to the Cradle Hall; Garrow: no visitors; Oren: visitors may look", c1.into === 'bl_cradles' && c1.door.length >= 2 && c1.wk.wk_door, c1.door);
check("what waking needs: Jory's card (wake me … when my sister asks), the ledger (deferred), Bay 2 (the ring left open)", c1.card.some((l) => /when my sister asks/.test(l)) && c1.led.some((l) => /DEFERRED/.test(l)) && c1.bay.some((l) => /RING LEFT OPEN/.test(l)), { card: c1.card, led: c1.led, bay: c1.bay });
check('Wenna asks; Oren refuses and says what he fears; protection becomes keeping him from her', c1.ask.some((l) => /Not ready/.test(l)) && c1.ask.some((l) => /keeping him from me/.test(l)) && c1.ask.some((l) => /Your hands do/.test(l)), c1.ask);
check('the ring shut; alone at the lever his hand gives out, the cradle fails safe ("A hand gets tired. I do not.")', c1.wk.wk_ring && c1.wk.wk_solo && !c1.wk.wk_awake && c1.solo.some((l) => /A hand gets tired/.test(l)), c1.solo);

// ---------------------------------------------------------------- the bell, the hands
const c2 = await timed(() => {
  const G = game, H = G.story.chapters.find((c) => c.key === 'survey').hall();
  T.through(G.rooms.bl_cradles.exits[0]);
  const A = G.rooms.bl_arches.arches;
  const b1 = T.use(A.spots.bellPull, 'wk_bell', 0.8), b2 = T.use(A.spots.bellPull, 'wk_bell', 0.8), b3 = T.use(A.spots.bellPull, 'wk_bell', 0.8);
  T.run(30);
  return { b: [...b1.said, ...b2.said, ...b3.said], ...T.view(), wk: T.flags('wk_'), tied: A.bell.tied };
});
console.log('the bell:', JSON.stringify(c2).slice(0, 1200));
check('the flood bell: tied (KEEP SILENT), untied, rung toward the row; Mags: "We\'ve got hands"', c2.wk.wk_rung && !c2.tied && c2.b.some((l) => /KEEP SILENT/.test(l)) && c2.b.some((l) => /got hands/.test(l)), c2.b);
const c3 = await timed(() => {
  const G = game, ch = G.story.chapters.find((c) => c.key === 'survey'), H = ch.hall();
  T.through(G.rooms.bl_arches.arches.exits.toCradles); T.run(20); G.story.refreshCast(); P.settle();
  const row = ['bl_mags', 'bl_dunn', 'bl_brin'].map((id) => !!P.npc(id)?.present && P.npc(id).distTo(G.hero) < 15);
  T.use(H.lever, 'wk_lever', 0.6);
  let hands = 0, slips = 0;
  // hand to hand: wait for the holder to tire a little, then call the next between Oren's strokes
  for (let i = 0; i < 2000 && !G.flags.wk_awake; i++) {
    G.step(0.1);
    if (G.state === 'dialog') P.settle();
    const U = ch.rota; if (!U) continue;
    const ph = U.t % 3.6;
    if (U.grip < 3 && ph > 1.2 && ph < 3.2) { ch.handOver(); hands++; }
  }
  T.run(80);
  for (let i = 0; i < 400 && G.flags.chapterKey === 'survey'; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
  T.run(40);
  return { row, hands, slips, ...T.view(), wk: T.flags('wk_'), brief: window.__said.filter((l) => /Tessa's boxes went out/.test(l)), said: window.__said.filter((l) => /You got old|You got lazy|yours to answer for|The family asks|mine to say|Five B-8s/.test(l)) };
});
console.log('the waking → 14:', JSON.stringify(c3).slice(0, 2000));
check('the row came up to the hall; hand to hand at the lever, J-17 warms and Jory wakes ("You got old." "You got lazy.")', c3.row.every(Boolean) && c3.hands >= 3 && c3.wk.wk_awake && c3.said.some((l) => /You got old/.test(l)), { row: c3.row, hands: c3.hands, said: c3.said });
check('who decides, said by the people: the family asks, the keepers shut the ring, Oren warms; Nan Odra keeps her mother asleep, her choice', c3.said.some((l) => /The family asks/.test(l)) && c3.said.some((l) => /mine to say/.test(l)), c3.said);
check('Tessa brings five B-8s; the freighter home: chapter 14 "Baldino\'s Network" begins', c3.wk.wk_done && c3.key === 'network' && c3.n === 14 && c3.cards.some((c) => /Chapter 14 · Baldino's Network/.test(c)), { key: c3.key, cards: c3.cards });
const j = await ev(() => game.story.journal().map((c) => [c.title, c.lines.length]));
check('the journal has chapters 12 and 13 with their lines', j.some(([t, n]) => /^12\. The House of Balances/.test(t) && n >= 6) && j.some(([t, n]) => /^13\. The Cradles/.test(t) && n >= 6), j.filter(([t]) => /^1[1-4]\./.test(t)));

// handoff 3
await saveQuit();
const n0 = await ev(() => ({ ...T.view(), said: window.__said.slice(-20) }));
check('Continue in chapter 14: the network, its first chapter of play', n0.key === 'network', n0);
check("Baldino's briefing (chapter 14's start): Tessa's boxes are on the relays; the valve room's is his to fit", c3.brief.length > 0, c3.brief);

// ---------------------------------------------------------------- the valve room: Oren's trim, Tessa's B-8, Mira's band
const v = await timed(() => {
  const G = game, net = G.story.chapters.find((c) => c.key === 'network');
  for (let i = 0; i < 200 && !G.flags.c10_started; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
  T.run(20);
  Object.assign(G.flags, { c10_miraAsk: true, nw_gauge: true }); G.enterRoom('valves', null, true); T.run(20); G.story.refreshCast(); P.settle();
  const V = G.rooms.valves;
  // the valves set so the gauges read green but for one wheel (the bot knows the answer); that wheel by input
  const n = V.valves.length; let pick = null;
  for (let m = 1; m < 1 << n && pick == null; m++) { G.flags.c10_valveSet = Object.fromEntries(V.valves.map((x, i) => [x.i, !!(m & (1 << i))])); if (net.gaugeLevels().every((x) => x === 2)) pick = m; }
  const last = V.valves.find((x, i) => pick & (1 << i));
  G.flags.c10_valveSet[last.i] = false; for (const x of V.valves) x.setOpen(!!G.flags.c10_valveSet[x.i]);
  const u = T.use(last, 'c10valve', 0.9); T.run(30);
  const trim = { ...T.flags('nwb_'), said: window.__said.slice(-6) };
  const R = net.b8.relayAt();
  const fit = T.use(R, 'nwbFit', 0.9);
  const bands = []; for (let k = 0; k < 3 && !G.flags.nwb_set; k++) bands.push(T.use(R, 'nwbBand', 0.9).said.join(' '));
  for (let i = 0; i < 200 && !G.flags.c10_valves; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
  T.run(20);
  return { u: u.kind, trim, fit: fit.said, bands, nwb: T.flags('nwb_'), valves: !!G.flags.c10_valves, said: window.__said.slice(-8) };
});
console.log('the valve room:', JSON.stringify(v).slice(0, 2000));
check('the gauges green: Oren trims the relay\'s share on a stroke ("The shelters drink first")', v.trim.nwb_trim && v.trim.said.some((l) => /shelters drink first/.test(l)), v.trim);
check("Tessa's B-8 fitted, its band set from Mira's needles as on the rig; its brass lever doesn't move for Oren; the station done", v.nwb.nwb_fit && v.nwb.nwb_set && v.valves && v.said.concat(v.bands).some((l) => /no clay in it/.test(l)), { fit: v.fit, bands: v.bands, said: v.said });

// ---------------------------------------------------------------- the other four B-8s, seen on their relays (CAMPAIGN-CLARITY §7.1)
const b8 = await timed(() => {
  const G = game, net = G.story.chapters.find((c) => c.key === 'network');
  const vis = (o) => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return !!o?.parent; };
  const vr = net.relays?.valves, valves = { relay: !!vr?.visible, box: vis(vr?.userData.b8?.grp), knob: +(vr?.userData.b8?.knob.rotation.z ?? NaN).toFixed(2), band: G.flags.nwb_band };
  // (the areas the stations stand in, built as a flight to each would; their relays put on: network.js decorate)
  for (const id of ['zeelich', 'desert', 'hamalayi', 'obsv', 'lighttop']) G.regions.ensure(id, 'test');
  G.story.decorate(); net.showProps();
  const lines = {};
  for (const s of ['mill', 'light', 'bore', 'dome']) {
    const n0 = window.__said.length;
    if (s === 'bore') G.flags.c10_boreRelay = true;
    net.lightRelay(s); net.stationDone(s);
    for (let i = 0; i < 60 && (G.state === 'dialog' || !G.flags['c10_' + s]); i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
    T.run(10);
    lines[s] = window.__said.slice(n0);
  }
  const ST = ['valves', 'mill', 'light', 'bore', 'dome'];
  const after = Object.fromEntries(ST.map((s) => { const r = net.relays?.[s]; return [s, { relay: !!r?.visible, box: !!r?.userData.b8 && r.userData.b8.grp.parent === r && r.userData.b8.grp.visible }]; }));
  // (as a Continue has it: the flags as saved, the props put back from them)
  G.story.applyFlags(); net.showProps();
  const again = Object.fromEntries(ST.map((s) => [s, !!net.relays?.[s]?.userData.b8?.grp.visible]));
  const jl = JSON.stringify(G.story.journal());
  return { valves, lines, after, again, done: net.done(), journal: /nwb_j_five|B-8s are on all five/.test(jl) };
});
console.log('the four B-8s:', JSON.stringify(b8).slice(0, 2500));
check("the valve room's B-8 is a box on its relay once fitted, its pointer on the band set (MID)", b8.valves.relay && b8.valves.box && b8.valves.band === 1 && b8.valves.knob === 0, b8.valves);
check("each other station: as it is done, a line says Tessa's B-8 sits on the relay and whose hand set its band (Oku, Zoé, Dallan, Sefa)", /Oku sets its band/.test(b8.lines.mill.join(' ')) && /Zoé reads its band/.test(b8.lines.light.join(' ')) && /Dallan sets its band/.test(b8.lines.bore.join(' ')) && /Sefa sets its band/.test(b8.lines.dome.join(' ')), b8.lines);
check("…and the box is on every relay that stands lit, the valve room's too; again after the flags are put back", Object.values(b8.after).every((x) => x.relay && x.box) && Object.values(b8.again).every(Boolean) && b8.done === 5, { after: b8.after, again: b8.again, done: b8.done });
check('the journal says it once all five are held', b8.journal, b8.journal);

// ---------------------------------------------------------------- before the end card: the Cradle Hall, four days on
await ev(() => { const G = game; Object.assign(G.flags, { chapter: 16, chapterKey: 'home' }); G.story.applyFlags(); window.__said = []; G.story.cur.begin(); });
// (the scene waits on the Ballastra cast's models and a scene change: the page's own tasks must run between steps)
for (let k = 0; k < 120; k++) { const st = await ev(() => { const G = game; for (let i = 0; i < 10 && G.state !== 'ending'; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); } return G.state; }); if (st === 'ending') break; await page.waitForTimeout(50); }
const ep = await ev(() => ({ state: game.state, said: window.__said.slice(), room: game.room?.id, epbl: !!game.flags.ep_bl, heroShown: game.hero.rig.root.visible, card: document.querySelector('#ending p')?.textContent || '' }));
console.log('the epilogue:', JSON.stringify(ep).slice(0, 1500));
check('after the dinner and before the end card: the Cradle Hall four days on (who is awake, who waits by choice, who decides), then the end card at home', ep.state === 'ending' && ep.epbl && ep.said.some((l) => /Three of us awake/.test(l)) && ep.said.some((l) => /That was ours to say/.test(l)) && ep.room === 'house' && ep.heroShown, ep);
check("the end card names Ballastra too (its lower row home, a sleeper wakes when the family asks), with Kesh and Lhar and Vesk's line", /Ballastra the lower row is home/.test(ep.card) && /Kesh has its oasis/.test(ep.card) && /Vesk waits/.test(ep.card) && !/[{]/.test(ep.card), ep.card);

// ---------------------------------------------------------------- a legacy base-campaign save: the original ending
await open(page, '?nocine');
await menu(page, 'new');
await helpers();
const L = await ev((F) => {
  const G = game; P.settle();
  Object.assign(G.flags, F, { chapter: 13, chapterKey: 'network', exp_base: 1, c10_started: true, c10_pulse: true }); delete G.flags.exp;
  G.story.applyFlags(); G.save(false);
  const order = G.story.chapters.filter((c) => G.story.inCampaign(c.key)).map((c) => c.key);
  const b8 = G.story.chapters.find((c) => c.key === 'network').b8;
  const out = { order, n: G.story.number('network'), b8on: b8.on(), b8has: b8.has() };
  Object.assign(G.flags, { chapter: 16, chapterKey: 'home' }); G.story.applyFlags();
  window.__said = []; G.story.cur.begin();
  for (let i = 0; i < 900 && G.state !== 'ending'; i++) { G.step(0.1); if (G.state === 'dialog') P.settle(); }
  return { ...out, state: G.state, room: G.room?.id, said: window.__said.slice(), exp3: Object.keys(G.flags).filter((k) => /^(bh_|wk_|nwb_|ep_bl)/.test(k)), card: document.querySelector('#ending p')?.textContent || '',
    boxes: Object.values(G.story.chapters.find((c) => c.key === 'network').relays || {}).filter((r) => r.userData.b8?.grp.visible).length };
}, BASE);
console.log('legacy exp_base:', JSON.stringify(L).slice(0, 1200));
check('a legacy exp_base save: no expansion chapters in its campaign, the network numbered 10, no B-8', !L.order.includes('balances') && !L.order.includes('survey') && L.n === 10 && !L.b8on && !L.b8has, L);
check('…and its epilogue reaches the original end card with no Cradle Hall and no expansion flags', L.state === 'ending' && L.room === 'house' && !L.said.some((l) => /of us awake now/.test(l)) && L.exp3.length === 0, { state: L.state, said: L.said, exp3: L.exp3 });
check('…its end card is the original (Kesh and Lhar, no Ballastra), and no B-8 box on any relay', /Kesh has its oasis/.test(L.card) && !/Ballastra/.test(L.card) && L.boxes === 0, { card: L.card, boxes: L.boxes });

console.log(`bot game time, chapter 11's last talk to chapter 14's first station: ${played.toFixed(0)} s (${(played / 60).toFixed(1)} min; a floor, not a first-play estimate)`);

await browser.close();   // (FULL-TEST: without it node stayed alive after the verdict, twice, until killed)
done();
