// OREN-GUARDIAN OG-6 "Coils and Consent" (docs/future/EXPANSION_PLAN.md Revision R1.11): chapter 14 of the expanded
// campaign ('network'), the mill station on Zeelich (story/coils.js). End to end, by input wherever it is a player's step
// (tests/lib/player.js: keys, the game's own time step, A* over its collision):
//   chapter 13's end → chapter 14's card → Baldino's briefing gains the coil (his relay runs on the mill's wind) → out of
//   the workshop (Baldino goes ahead to the mill) → Councillor Brum by the fountain: nobody pulls a coil without the
//   street → the depot pumps' coil: its LOCAL SHUT-OFF wheel turns itself back on the next tick → Oku (the coil, then
//   brake her) → the ball on the brake → Baldino at her foot: the tick is the drill's beat, Twinsen teaches him the rule
//   → a bolt turned on the tick kicks back (no progress) → three between ticks: the coil off, quiet; the dead coupling
//   (found; its limits said) → Save → Continue (carrying it) → fitted, with the float → the relay waits until then
//   (checked on the gallery) → climbed, the relay set: she races on Baldino's band → the band: one notch to GALE (Oku:
//   right), the wind drops, CALM is wrong (Oku: racing), BREEZE right: the station done (1/5) → Save → Continue →
//   Snuff, Pelleck, Tavo heard → the meeting by the fountain: "pull every coil" refused, then "one station at a time,
//   a person at each lever" agreed; the board → Save → Continue; the street's lines after the vote.
// Also: the street's people before Brum sends him (their own lines), Brum asked before the mill turns (no access gate),
// re-entry (the workshop and back; a later chapter's save on Zeelich), an older save that set the relay the old way, the
// base campaign (exp_base) never showing any of it, and the draw cost at the mill. Times are the bot's game time (a
// floor, not a first-time estimate). SwiftShader: draw counts only, never fps.
import { launch, open, menu, checker } from './lib/boot.mjs';
const { browser, page } = await launch({ width: 960, height: 540 });
const { check, done } = checker({ info: 'always' });
const ev = (f, a) => page.evaluate(f, a);
let played = 0;
const timed = async (f, a) => { const t0 = await ev(() => game.time); const r = await ev(f, a); played += (await ev(() => game.time)) - t0; return r; };

const UP_TO_NETWORK = { prologueDone: true, intro: true, c1_started: true, c1_water: true, c1_done: true, c1_plan: true, c2_shield: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true,
  c5_dallanOK: true, c5_relief: true, c5_vent: true, c6_up: true, c6_trip2: true, c6_thawed: true, c7_vent: true, c8_home: true, c8_gilbert: true, c8_mira: true, c8_fort: true, c8_depot: true, c8_pippa: true, c8_zoeDone: true, c8_done: true,
  c9_started: true, c9_heard: true, c9_vote: true, ml_2: true, ml_3: true,
  og_started: true, og_home: true, og_arrived: true, og_room: true, og_bleed: 3, og_steady: true, og_thanks: true, og_done: true,
  og2_started: true, og2_met: true, og2_bramAsk: true, og2_bram: true, og2_umeAsk: true, og2_ume: true, og2_picoAsk: true, og2_bell: true, og2_pico: true, og2_open: true, og2_asked: true, og2_done: true };

const helpers = () => ev(() => {
  const G = game;
  window.__said = []; const say0 = G.say.bind(G);
  G.say = (name, text, cb, sp, col) => { window.__said.push((name ? name + ': ' : '') + (Array.isArray(text) ? text.join(' ') : text)); return say0(name, text, cb, sp, col); };
  window.__cards = []; const H = G.hud, cc = H.chapterCard.bind(H); H.chapterCard = (a, b) => { window.__cards.push((a ? a + ' · ' : '') + b); return cc(a, b); };
  const net = () => G.story.chapters.find((c) => c.key === 'network');
  window.T = {
    net, co: () => net().og6,
    obj: () => document.querySelector('#pause-objective')?.textContent || '',
    npcAt: (id) => { const n = G.npcs.find((x) => x.def.id === id); return n?.present ? { x: +n.pos.x.toFixed(2), z: +n.pos.z.toFixed(2) } : null; },
    dist: (id, p) => { const n = G.npcs.find((x) => x.def.id === id); return n?.present ? +Math.hypot(n.pos.x - p.x, n.pos.z - p.z).toFixed(2) : null; },
    view: () => {
      const f = G.flags, C = net().og6, F = C.frame?.(), m = G.regions.built('zeelich')?.mills?.[0];
      const pick = {}; for (const k of Object.keys(f)) if (/^og6_/.test(k)) pick[k] = f[k];
      return { key: f.chapterKey, room: G.room?.id ?? 'citadel', state: G.state, ...pick, c10_okuAsk: !!f.c10_okuAsk, c10_millBraked: !!f.c10_millBraked, c10_mill: !!f.c10_mill, stations: net().done(),
        root: C.root?.visible ?? null, coilOut: C.coilG ? Math.hypot(C.coilG.position.x - C.coilOn.x, C.coilG.position.z - C.coilOn.z) > 0.3 : null,
        coupling: C.couplingG?.visible ?? null, float: C.floatG?.visible ?? null, board: C.board?.visible ?? null, boardCol: C.boardCol?.enabled ?? null,
        spinning: m ? m.spinning : null, speed: m ? +m.speed.toFixed(2) : null, goal: m?.goal ?? null, relay: net().relays?.mill?.visible ?? null,
        baldinoAtMill: F ? T.dist('baldino', F.baldino) : null, okuAtBand: F ? T.dist('oku', F.oku) : null, brum: T.npcAt('councilC'),
        obj: T.obj(), items: (G.story.items?.() || []).map((i) => i.id), journal: G.story.journal().find((c) => /Network/.test(c.title))?.lines?.map((l) => l.key) || [] };
    },
    // step until the coils' beat is at phase p0..p1 (0 = the tick)
    toPhase(p0, p1) { const C = net().og6; for (let k = 0; k < 400; k++) { const p = C.phase(); if (p >= p0 && p <= p1) return p; G.step(1 / 60); } return -1; },
    // through dialogue until a menu opens or play resumes
    untilMenu() { for (let k = 0; k < 600; k++) { if (G.state === 'shop') return 'shop'; if (G.state === 'dialog') { P.tap('KeyE', 0.12); continue; } if (G.state === 'play' && !G.trans && k > 20) return 'play'; G.step(0.1); } return G.state; },
    draws() { const R = G.renderer.renderer; let main = 0, shadow = 0; const o = R.renderBufferDirect.bind(R); R.renderBufferDirect = (cam, scene, ...a) => { if (scene) main++; else shadow++; return o(cam, scene, ...a); }; G.perf.beginFrame(); G.frame(1 / 30, true); R.renderBufferDirect = o; return { main, shadow }; },
  };
});
const reload = async () => { await open(page, '?nocine'); await helpers(); await page.click('#btn-continue'); await ev(() => { game.step(0.05); P.settle(); for (let i = 0; i < 20; i++) game.step(0.1); P.settle(); }); };
const said = (r, re) => r.said.some((l) => re.test(l));

// ---------------------------------------------------------------- chapter 14 begins: Baldino's briefing
await open(page, '?nocine');
await menu(page, 'new');
await helpers();
const s0 = await ev((F) => {
  const G = game; P.settle();
  Object.assign(G.flags, F, { chapter: 12, chapterKey: 'balances' }); G.hero.hasBall = true;
  G.story.applyFlags();
  G.story.nextChapter(); G.step(0.5); P.settle();
  return { ...T.view(), cards: [...window.__cards], said: window.__said.slice() };
}, UP_TO_NETWORK);
console.log('chapter 14 start:', JSON.stringify({ ...s0, said: s0.said.slice(-8) }));
check("chapter 14's card (the network) in the expanded campaign; Baldino's briefing gains the coil: his relay runs on the mill's wind, so the coil comes off first", s0.key === 'network' && s0.cards.some((c) => /Chapter 14/.test(c)) && s0.og6_brief === true && said(s0, /answer to a voice called Oren/) && said(s0, /holds her drive, it holds my signal/) && said(s0, /Brass, oak and leather/), { cards: s0.cards, brief: s0.og6_brief });
check('the coils show on Zeelich (the mill, the depot pumps, the shuttle pad); Baldino still at his bench while Twinsen is in the workshop', s0.root === true && s0.room === 'workshop' && s0.coilOut === false && !(s0.baldinoAtMill < 1), s0);

// out of the workshop: Baldino goes ahead to the mill; the street before Brum sends him
const s1 = await timed(() => {
  const G = game; P.exitTo(G.room.exits[0].to); P.settle(); for (let i = 0; i < 10; i++) G.step(0.1);
  const n0 = window.__said.length; P.talk('zmole2', { run: true }); const snuffEarly = { flag: !!G.flags.og6_snuff, said: window.__said.slice(n0) };
  return { ...T.view(), snuffEarly };
});
check('out of the workshop: Baldino has gone ahead to the old mill; Brum stands by the fountain', s1.room === 'zeelich' && s1.og6_out === true && s1.baldinoAtMill < 0.5 && !!s1.brum, { out: s1.og6_out, bal: s1.baldinoAtMill, brum: s1.brum });
check("before Brum sends him, Snuff talks of her own things (Zeelich's street life), not the coils", !s1.snuffEarly.flag && !s1.snuffEarly.said.some((l) => /stones turn like a clock/.test(l)) && s1.snuffEarly.said.length > 0, s1.snuffEarly);

// Councillor Brum, and the pumps' shut-off
const b0 = await timed(() => { const r = P.talk('councilC', { run: true }); return { r: r.r, ...T.view(), said: window.__said.slice(-5) }; });
check('Councillor Brum: nobody pulls a coil without the street; show me one machine without the tick, and hear Snuff, Pelleck and Tavo', b0.og6_brumAsk && said(b0, /Nobody pulls a coil on this street/) && said(b0, /Show me one machine that runs without that tick/), b0);
const pump = await timed(() => {
  const C = T.co(), L = C.pumpLook, G = game;
  const r = P.use(L.x, L.z, { near: 0.7, kind: 'og6pump' });
  const turned = +C.wheelA?.toFixed(2);
  for (let i = 0; i < 50; i++) G.step(0.1);
  return { r: r.r, turned, back: +(C.wheelA ?? 0).toFixed(2), ...T.view(), said: window.__said.slice(-4) };
});
check("the depot pumps' coil: LOCAL SHUT-OFF · CENTRAL CONSENT; its wheel turns, then turns itself back on the next tick; Twinsen hears the drill's beat", pump.og6_pump && said(pump, /CENTRAL CONSENT REQUIRED/) && said(pump, /turns itself back on the next tick/) && said(pump, /drill's beat/) && Math.abs(pump.back) < 0.1, { turned: pump.turned, back: pump.back, said: pump.said });

// ---------------------------------------------------------------- the mill: Oku, the brake, Baldino
const o0 = await timed(() => { const r = P.talk('oku', { run: true }); return { r: r.r, ...T.view(), said: window.__said.slice(-3) }; });
check("Oku: Baldino has gone to his mill to take the project's coil off; brake her first", o0.c10_okuAsk && said(o0, /coil off her drive/) && said(o0, /Brake her first/) && /brake the old mill with the ball/.test(o0.obj), o0);
const br = await timed(() => {
  const G = game, m = G.rooms.zeelich.mills[0];
  for (let k = 0; k < 6 && !G.flags.c10_millBraked; k++) { const a = k * 1.05; P.go(m.brake.x + Math.sin(a) * 6, m.brake.z + Math.cos(a) * 6, { tol: 1, run: true, maxT: 90 }); P.settle(); P.tap('F1'); P.throwAt(m.brake.x, m.brake.z); P.settle(); }
  for (let i = 0; i < 20; i++) G.step(0.1);
  return { ...T.view(), said: window.__said.slice(-2) };
});
check("the ball on the brake: she stops; Oku sends him to Baldino at her foot", br.c10_millBraked && br.spinning === false && said(br, /Baldino's waiting at her foot/) && /Baldino, at the old mill's foot/.test(br.obj), br);
const pl = await timed(() => { const r = P.talk('baldino', { run: true }); return { r: r.r, ...T.view(), said: window.__said.slice(-8) }; });
console.log('the plan:', JSON.stringify(pl.said));
check("Baldino: every coil on the island ticks together, in step with the bore; Twinsen: in step with Oren, who can't hear them here; between ticks it lets go", pl.og6_plan && said(pl, /ticks together/) && said(pl, /in step with Oren/) && said(pl, /Nothing joins Zeelich to Twinsun but ships/) && said(pl, /Between ticks it lets go/) && /loosen the coil's bolts between ticks \(0\/3\)/.test(pl.obj), pl);

// a bolt on the tick: kicked back; then three between ticks
const kick = await timed(() => {
  const G = game, C = T.co(), F = C.frame();
  P.go(F.stand.x, F.stand.z, { tol: 0.25 }); P.face(F.face.x, F.face.z);
  const tg = P.target();
  T.toPhase(0.0, 0.03);
  const p0 = { x: G.hero.pos.x, z: G.hero.pos.z };
  P.tap('KeyE', 0.05); for (let i = 0; i < 12; i++) G.step(1 / 15);
  const moved = +Math.hypot(G.hero.pos.x - p0.x, G.hero.pos.z - p0.z).toFixed(2);
  P.settle();
  return { tg, moved, ...T.view(), said: window.__said.slice(-1) };
});
check("a bolt turned on the tick: the coil grips and the wrench kicks back (pushed off, no damage, no bolt); 'It grips on the tick'", kick.tg?.kind === 'og6coil' && kick.tg?.label === 'p_loosen' && (kick.og6_bolt | 0) === 0 && kick.moved > 0.3 && said(kick, /It grips on the tick/), kick);
const bolts = await timed(() => {
  const G = game, C = T.co(), F = C.frame(), out = [];
  for (let k = 0; k < 6 && !G.flags.og6_coilOut; k++) {
    P.go(F.stand.x, F.stand.z, { tol: 0.25 }); P.face(F.face.x, F.face.z);
    T.toPhase(0.38, 0.45); P.tap('KeyE', 0.05); for (let i = 0; i < 12; i++) G.step(1 / 15);
    out.push(G.flags.og6_bolt | 0);
    if (G.flags.og6_bolt < 3) P.settle();
  }
  // the coil comes off: Baldino's lines, the found box (the dead coupling), his three lines on its limits
  const n0 = window.__said.length; P.settle(); for (let i = 0; i < 30; i++) G.step(0.1); P.settle();
  return { out, ...T.view(), shown: [...(G.foundObj?.shown || [])], said: window.__said.slice(Math.max(0, n0 - 6)) };
});
console.log('bolts:', JSON.stringify(bolts));
check('three bolts between ticks: the coil comes off and lies beside her, quiet ("It\'s stopped ticking")', bolts.og6_bolt === 3 && bolts.og6_coilOut && bolts.coilOut === true && said(bolts, /It's stopped ticking/), { out: bolts.out, coilOut: bolts.coilOut });
check("Baldino's dead coupling is found and carried; its limits said (turns the stones, carries nothing else; in a pipe, not a signal, not even warmth)", bolts.shown.includes('coupling') && bolts.items.includes('coupling') && said(bolts, /carries nothing else/) && said(bolts, /Not a signal\. Not even warmth/) && /fit the dead coupling/.test(bolts.obj), { shown: bolts.shown, items: bolts.items, obj: bolts.obj });

// Save → Continue mid-quest (carrying the coupling)
await ev(() => game.save(false));
await reload();
const r1 = await ev(() => T.view());
console.log('reload mid-quest:', JSON.stringify(r1));
check('Save → Continue mid-quest: on Zeelich, the coil lying off the drive, the coupling still carried, the mill braked, Baldino at her foot, the objective on the fit', r1.key === 'network' && r1.room === 'zeelich' && r1.coilOut === true && r1.items.includes('coupling') && r1.spinning === false && r1.baldinoAtMill < 0.5 && /fit the dead coupling/.test(r1.obj) && r1.state === 'play', r1);

// the relay waits for the fit (ISO: the gallery's prompt, read without climbing)
const wait = await ev(() => { const G = game, mt = G.rooms.zeelich.millTop, h = G.hero, p0 = h.pos.clone(); const it = []; h.pos.set(mt.x + 0.6, mt.y, mt.z + 0.4); G.story.interactables((d, m, o) => { if (d < m) it.push(o.kind); }, (x, z) => Math.hypot(x - h.pos.x, z - h.pos.z)); h.pos.copy(p0); return it; });
check('(ISO) on the gallery before the fit the relay is not offered, only the reason (the coil first)', wait.includes('og6relayWait') && !wait.includes('c10mill'), wait);
const fit = await timed(() => { const F = T.co().frame(); const r = P.use(F.face.x, F.face.z, { near: 0.9, kind: 'og6fit' }); return { r: r.r, ...T.view(), said: window.__said.slice(-4) }; });
check("fitted: the coupling where the coil was, Baldino's float on the brake (it can't guess the wind: somebody sets its band); the relay next", fit.og6_fitted && fit.coupling && fit.float && !fit.items.includes('coupling') && said(fit, /Leather creaks against oak/) && said(fit, /can't guess the wind/) && /set the relay on the mill's balcony/.test(fit.obj), fit);

// the climb and the relay (as chapter 14 has it): she races on Baldino's band
const rel = await timed(() => {
  const G = game, mt = G.rooms.zeelich.millTop;
  const c = P.climbOldMill();
  let r; for (let k = 0; k < 3 && !G.flags.og6_relay; k++) { r = P.use(mt.x, mt.z, { near: 1.2 }); P.settle(); }
  for (let i = 0; i < 40; i++) G.step(0.1);
  return { climb: c.top, r: r?.r, ...T.view(), said: window.__said.slice(-3) };
});
console.log('relay:', JSON.stringify(rel));
check('the relay set on the balcony: the relay lit, the mill turns and races (the band is BREEZE in a gale); Oku calls him to the band; the station not yet done', rel.climb && rel.og6_relay && rel.relay === true && rel.spinning && rel.speed > 1.2 && !rel.c10_mill && rel.stations === 0 && said(rel, /She's racing!/) && /set the float's band for the wind/.test(rel.obj) && rel.okuAtBand < 0.5, rel);

// down the stones, then the band
const band = await timed(() => {
  const G = game, h = G.hero, mt = G.rooms.zeelich.millTop, S = mt.stones, C = T.co(), F = C.frame();
  P.go(mt.landing.x, mt.landing.z, { tol: 0.4, maxT: 8, fight: false });
  // (down the stones: a step off each onto the next, a hop where a step won't do; a slip lands him on the green)
  for (let k = S.length - 1; k >= 0 && h.pos.y > S[0].y - 0.5; k--) if (h.pos.y > S[k].y + 0.3) { P.go(S[k].x, S[k].z, { tol: 0.35, maxT: 6, fight: false }); if (h.pos.y > S[k].y + 0.3) P.hopTo(S[k].x, S[k].z, S[k].y, { walk: false, brake: 1.2, pre: 0.05 }); }
  P.settle(); const down = { y: +h.pos.y.toFixed(2), hp: h.hp };
  const steps = [];
  const turn = () => { const r = P.use(F.float.x, F.float.z, { near: 0.8, kind: 'og6band' }); for (let i = 0; i < 25; i++) G.step(0.1); P.settle(); steps.push({ dial: G.flags.og6_dial, band: G.flags.og6_band | 0, lull: !!G.flags.og6_lull, said: window.__said.slice(-1)[0], speed: +G.rooms.zeelich.mills[0].speed.toFixed(2) }); return r; };
  turn();                                                    // BREEZE → GALE: right for the gale
  for (let i = 0; i < 80 && !G.flags.og6_lull; i++) G.step(0.1);   // the wind drops
  P.settle(); for (let i = 0; i < 30; i++) G.step(0.1);
  const lull = { said: window.__said.slice(-1)[0], speed: +G.rooms.zeelich.mills[0].speed.toFixed(2) };
  turn();                                                    // GALE → CALM: wrong (she races)
  turn();                                                    // CALM → BREEZE: right
  for (let i = 0; i < 30; i++) G.step(0.1); P.settle();
  return { steps, lull, down, ...T.view(), said: window.__said.slice(-6) };
});
console.log('the band:', JSON.stringify({ down: band.down, steps: band.steps, lull: band.lull, said: band.said }));
check('the band, one notch a press: GALE suits the gale (Oku: "That\'s her"); the wind drops and she crawls', band.steps[0]?.dial === 2 && band.steps[0]?.band === 1 && /That's her/.test(band.steps[0]?.said) && /dragging her feet/.test(band.lull.said) && band.lull.speed < 0.5, { steps: band.steps, lull: band.lull });
check('a wrong band (CALM in a breeze) is only a retry: Oku says she races; BREEZE is right and the station is done (1/5), Oku at her foot', /Still racing/.test(band.steps[1]?.said) && band.steps[1]?.band === 1 && band.steps[2]?.dial === 1 && band.og6_band === 2 && band.c10_mill && band.stations === 1 && said(band, /So that's my job now/) && said(band, /without asking anybody/), { steps: band.steps, said: band.said, stations: band.stations });
check('after the band: the mill at her own speed (no goal held), the journal records the swap and the band, the optional meeting on the objective', band.goal === null && Math.abs(band.speed - 0.75) < 0.12 && band.journal.includes('og6_j_swap') && band.journal.includes('og6_j_band') && /Councillor Brum's street meeting/.test(band.obj), { speed: band.speed, journal: band.journal, obj: band.obj });
console.log(`OG-6 mill (bot game time, the workshop's door to the station done): ${played.toFixed(0)} s (${(played / 60).toFixed(1)} min; a floor: A* walking, every line read at once)`);
const millTime = played;

// Save → Continue after the change
await ev(() => game.save(false));
await reload();
const r2 = await ev(() => { for (let i = 0; i < 30; i++) game.step(0.1); return T.view(); });
check('Save → Continue after the station: the mill turns at her own speed, the coil lies quiet, coupling and float on her drive, the relay lit, Oku at her foot', r2.c10_mill && r2.spinning && Math.abs(r2.speed - 0.75) < 0.12 && r2.coilOut && r2.coupling && r2.float && r2.relay && r2.okuAtBand < 0.5 && r2.stations === 1 && r2.state === 'play', r2);

// ---------------------------------------------------------------- the street: three heard, the meeting
const st = await timed(() => {
  const G = game, out = {};
  for (const id of ['zmole2', 'ztri1', 'ztri2']) { const n0 = window.__said.length; out[id] = P.talk(id, { run: true }).r; out[id + '_said'] = window.__said.slice(n0); }
  return { out, ...T.view() };
});
check("Snuff (fine flour), Pelleck (no heat cut-outs since the pumps' coil: fourteen last winter) and Tavo (the shuttles on time) each heard", st.og6_snuff && st.og6_pel && st.og6_tavo && st.out.zmole2_said.some((l) => /flour's never been so fine/.test(l)) && st.out.ztri1_said.some((l) => /Fourteen last winter/.test(l)) && st.out.ztri2_said.some((l) => /Forty days on time/.test(l)) && st.journal.includes('og6_j_street'), { out: st.out });
const meet = await timed(() => {
  const G = game, n = P.npc('councilC'), n0 = window.__said.length;
  P.go(n.pos.x, n.pos.z, { tol: 1.4, run: true }); P.face(n.pos.x, n.pos.z); P.tap('KeyE', 0.1);
  const m1 = T.untilMenu();
  if (m1 !== 'shop') { P.settle(); return { m1, ...T.view(), said: window.__said.slice(n0) }; }
  const gathered = { snuff: T.dist('zmole2', T.co().meetSpot('zmole2')), pel: T.dist('ztri1', T.co().meetSpot('ztri1')), tavo: T.dist('ztri2', T.co().meetSpot('ztri2')), oku: T.dist('oku', T.co().meetSpot('oku')) };
  const items = [...document.querySelectorAll('#shop .item')].map((b) => b.textContent);
  document.querySelector('#shop .item[data-i="0"]').click(); G.step(0.2);
  const m2 = T.untilMenu(); const afterAll = { vote: !!G.flags.og6_vote, said: window.__said.slice(-2) };
  document.querySelector('#shop .item[data-i="2"]').click(); G.step(0.2);
  T.untilMenu(); P.settle(); for (let i = 0; i < 20; i++) G.step(0.1);
  return { m1, m2, items, gathered, afterAll, ...T.view(), said: window.__said.slice(n0) };
});
console.log('the meeting:', JSON.stringify({ m1: meet.m1, m2: meet.m2, items: meet.items, gathered: meet.gathered, afterAll: meet.afterAll, said: meet.said }));
check('the street meets by the fountain (Snuff, Pelleck, Tavo and Oku gathered); each says their piece; three proposals', meet.m1 === 'shop' && Object.values(meet.gathered || {}).every((d) => d != null && d < 0.6) && said(meet, /eats bread, heats a house or catches a shuttle/) && said(meet, /Rough flour I can bake with/) && meet.items?.length === 3, { gathered: meet.gathered, items: meet.items });
check('"Pull every coil today" is refused (Pelleck files against him; Brum: think again) and the choice comes back', meet.m2 === 'shop' && !meet.afterAll?.vote && meet.afterAll?.said?.some((l) => /file against you personally/.test(l)) && meet.afterAll?.said?.some((l) => /Think again/.test(l)), meet.afterAll);
check('"One station at a time, with a person at each lever" is agreed: names written, the board up by the fountain, the street goes back to its business', meet.og6_vote && meet.board && meet.boardCol && said(meet, /I can stand at a clamp/) && said(meet, /Already did\. Two copies/) && meet.journal.includes('og6_j_vote') && !/street meeting/.test(meet.obj) && meet.state === 'play', { board: meet.board, obj: meet.obj });
const after = await timed(() => { const out = {}; for (const id of ['councilC', 'ztri1']) { const n0 = window.__said.length; P.talk(id, { run: true }); out[id] = window.__said.slice(n0); } const G = game, C = T.co(); const B = C.boardP; const u = P.use(B.x, B.z - 0.5, { near: 0.6, kind: 'og6board' }); out.board = window.__said.slice(-1); return { out, snuffAt: T.dist('zmole2', C.meetSpot('zmole2')) }; });
check("after the vote: Brum (the pumps next, with Pelleck on the lever), Pelleck's line from the vote (filed, two copies), the board reads the names", after.out.councilC.some((l) => /The pumps next, with Pelleck on the lever/.test(l)) && after.out.ztri1.some((l) => /filed, two copies|Half a dome/.test(l)) && after.out.board.some((l) => /Mill: Oku\. Pumps: Pelleck\. Shuttle clamp: Tavo/.test(l)) && after.snuffAt > 1, after);

// Save → Continue after the vote
await ev(() => game.save(false));
await reload();
const r3 = await ev(() => T.view());
check('Save → Continue after the vote: the board and its collider up, the mill on brass, the coil quiet', r3.og6_vote && r3.board && r3.boardCol && r3.coilOut && r3.coupling && r3.c10_mill && r3.state === 'play', r3);

// re-entry: into the workshop and out again
const re = await ev(() => { const G = game; P.enter('workshop', { run: true }); const inW = G.room?.id; const bal = P.talk('baldino').r; P.exitTo(G.room.exits[0].to); P.settle(); for (let i = 0; i < 10; i++) G.step(0.1); return { inW, bal, ...T.view() }; });
check('re-entry: the workshop and back to the street — the mill, the coupling, the float, the board as they were; Baldino back at his bench', re.inW === 'workshop' && re.room === 'zeelich' && re.coilOut && re.coupling && re.float && re.board && !(re.baldinoAtMill < 1), re);

// ---------------------------------------------------------------- other ways in
// another order: Brum asked before the mill turns (no gate on the station), and the street's lines without the vote
await ev((F) => { localStorage.setItem('lba3_save_v1', JSON.stringify({ v: 6, at: Date.now(), room: 'zeelich', hero: { x: 2378, z: 1, hp: 10, mp: 5, magicLevel: 3, clovers: 2, coins: 20, hasBall: true, behaviour: 'normal' }, flags: { exp: 1, ...F, chapter: 13, chapterKey: 'network', c10_started: true, c10_pulse: true, og6_brief: true, og6_out: true, og6_brumAsk: true, og6_snuff: true, og6_pel: true, og6_tavo: true }, killed: [], collected: [], searched: [], crates: [], loot: [] })); }, UP_TO_NETWORK);
await reload();
const alt = await ev(() => { const out = {}; const n0 = window.__said.length; P.talk('councilC', { run: true }); out.brum = window.__said.slice(n0); return { out, ...T.view() }; });
check('another order: the three heard and Brum asked before the mill turns — he waits for one machine without the tick (no meeting yet, nothing locked)', alt.out.brum.some((l) => /One machine without the tick/.test(l)) && !alt.og6_vote && alt.state === 'play', alt.out);
const alt2 = await ev(() => { const G = game; Object.assign(G.flags, { c10_okuAsk: true, c10_millBraked: true, og6_plan: true, og6_bolt: 3, og6_coilOut: true, og6_fitted: true, og6_relay: true, og6_dial: 1, og6_band: 2, og6_lull: true, c10_mill: true }); G.story.applyFlags(); G.updateObjective(); for (let i = 0; i < 10; i++) G.step(0.1); const n0 = window.__said.length; P.talk('ztri1', { run: true }); return { said: window.__said.slice(n0), ...T.view() }; });
check('the mill done without the vote: the station counts all the same (1/5), and Pelleck has opened a file (nobody asked the street)', alt2.c10_mill && alt2.stations === 1 && alt2.said.some((l) => /nobody asked the street|Half a dome/.test(l)), alt2.said);

// a later chapter's save on Zeelich: the world change stays (the expanded campaign)
await ev((F) => { localStorage.setItem('lba3_save_v1', JSON.stringify({ v: 6, at: Date.now(), room: 'zeelich', hero: { x: 2378, z: 1, hp: 10, mp: 5, magicLevel: 4, clovers: 2, coins: 20, hasBall: true, behaviour: 'normal' }, flags: { exp: 1, ...F, chapter: 16, chapterKey: 'home', c10_started: true, c10_pulse: true, c10_done: true, c10_mill: true, c10_valves: true, c10_light: true, c10_bore: true, c10_dome: true, c3_started: true, c3_done: true, og6_brief: true, og6_out: true, og6_plan: true, og6_bolt: 3, og6_coilOut: true, og6_fitted: true, og6_relay: true, og6_band: 2, og6_lull: true, og6_dial: 1, og6_vote: true }, killed: [], collected: [], searched: [], crates: [], loot: [] })); }, UP_TO_NETWORK);
await reload();
const late = await ev(() => { for (let i = 0; i < 20; i++) game.step(0.1); return T.view(); });
check('a later chapter on Zeelich (the expanded campaign): the coil quiet beside the mill, coupling and float on her drive, the board by the fountain; she turns at her own speed', late.root && late.coilOut && late.coupling && late.float && late.board && late.goal === null && late.state === 'play', late);

// an older save: the mill's relay set the old way (c10_mill, no og6 flags) keeps it; the coil stays on, no Baldino at the mill
await ev((F) => { localStorage.setItem('lba3_save_v1', JSON.stringify({ v: 6, at: Date.now(), room: 'zeelich', hero: { x: 2378, z: 1, hp: 10, mp: 5, magicLevel: 3, clovers: 2, coins: 20, hasBall: true, behaviour: 'normal' }, flags: { exp: 1, ...F, chapter: 13, chapterKey: 'network', c10_started: true, c10_pulse: true, c10_okuAsk: true, c10_millBraked: true, c10_mill: true }, killed: [], collected: [], searched: [], crates: [], loot: [] })); }, UP_TO_NETWORK);
await reload();
const old = await ev(() => { for (let i = 0; i < 20; i++) game.step(0.1); const n0 = window.__said.length; P.talk('oku', { run: true }); return { said: window.__said.slice(n0), ...T.view() }; });
check("an older save whose mill relay was set the old way: the station stays done, the coil stays on her, Baldino isn't at the mill, Oku's own line", old.c10_mill && old.stations === 1 && old.coilOut === false && !(old.baldinoAtMill < 1) && old.said.some((l) => /grandmother/.test(l)) && old.state === 'play', old);

// the cost at the mill: OG-6's props shown / hidden
const cost = await ev(() => { const G = game, C = T.co(), F = C.frame(); G.hero.pos.set(F.stand.x, G.physics.groundAt(F.stand.x, F.stand.z, 7), F.stand.z); G.hero.angle = Math.atan2(F.face.x - F.stand.x, F.face.z - F.stand.z); for (let i = 0; i < 10; i++) G.step(0.1); const on = T.draws(); C.shown = () => false; C.show(); const off = T.draws(); delete C.shown; C.show(); let meshes = 0, lights = 0, transp = 0; C.root.traverse((o) => { if (o.isMesh) { meshes++; if (o.material.transparent) transp++; } if (o.isLight) lights++; }); return { on, off, meshes, lights, transp }; });
console.log('mill draws (OG-6 props shown / hidden):', JSON.stringify(cost));
check('the cost at the mill: no lights, no transparency; at most 30 more draw calls (main + shadow) with every OG-6 prop', cost.lights === 0 && cost.transp === 0 && (cost.on.main + cost.on.shadow) - (cost.off.main + cost.off.shadow) <= 30, cost);

// the base campaign never shows any of it (Baldino's briefing, the coils, Brum, Oku's errand as before)
const base = await ev((F) => {
  const G = game; window.__said = [];
  for (const k of Object.keys(G.flags)) if (/^og6_|^c10_/.test(k)) delete G.flags[k];
  Object.assign(G.flags, F, { exp_base: 1, chapter: 12, chapterKey: 'balances' }); delete G.flags.exp;
  G.story.applyFlags(); G.story.nextChapter(); G.step(0.5); P.settle();
  const briefSaid = window.__said.some((l) => /voice called Oren|Brass, oak and leather/.test(l));
  P.exitTo(G.room.exits[0].to); P.settle(); for (let i = 0; i < 10; i++) G.step(0.1);
  const n0 = window.__said.length; P.talk('oku', { run: true }); const oku = window.__said.slice(n0);
  return { briefSaid, oku, num: G.story.number('network'), ...T.view() };
}, UP_TO_NETWORK);
check('the base campaign (exp_base): no coil in the briefing, no coils on Zeelich, no Brum on the street, Oku asks for the brake and the climb as before', base.key === 'network' && base.num === 10 && !base.briefSaid && base.root === false && !base.brum && base.oku.some((l) => /hold her steady while you climb/.test(l)) && !base.og6_brief, { briefSaid: base.briefSaid, root: base.root, brum: base.brum, oku: base.oku, num: base.num });

console.log(`OG-6 bot game time: the mill ${millTime.toFixed(0)} s, all played steps ${played.toFixed(0)} s (${(played / 60).toFixed(1)} min; a floor, not a first-time estimate)`);
done();
await browser.close();
