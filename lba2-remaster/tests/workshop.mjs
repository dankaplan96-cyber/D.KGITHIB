// Baldino's workshop, years on (src/game/workshoplife.js, story/workshop.js): the things in the room, the test pair
// played by input (walking, E, talking) through both failures (no line of sight, overheating) to success, save &
// Continue in each state, the main path of chapter 3 unchanged, and chapter 10 remembering it.
// ISO (logged): chapters are set by their flags, as tests/chapter2.mjs and tests/chapter10.mjs do; the key's parts
// are given by flags for the main-path check. Screenshots (W-*.png) go to the working directory.
import { launch, open, menu, checker, quitAndKeep } from './lib/boot.mjs';
import os from 'node:os';
import path from 'node:path';
const { check, done } = checker();
const { browser, context, page, errs } = await launch();
const ev = (f, a) => page.evaluate(f, a);
const shot = async (n) => { await ev(() => { game.step(0.05); game.renderer.render(); }); await page.screenshot({ path: n }); };
const iso = (s) => console.log('ISO  ' + s);

const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...lines); return sv.call(this, n, lines, ...a); }; const tv = game.hud.toast; game.hud.toast = function (k, ...a) { window._said.push('[toast] ' + k); return tv.call(this, k, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const state = () => ev(() => { const L = game.rooms.workshop.life, f = game.flags, W = game.story.workshop; return { on: W.on, heat: +W.heat.toFixed(2), sync: +W.sync.toFixed(2), lift: +L.lift.toFixed(2), up: !!f.w_up, tap: !!f.w_tap, pair: !!f.w_pair, ask: !!f.w_ask, trips: f.w_trips || 0, room: game.room?.id }; });
const use = (what, kind) => ev(([what, kind]) => { const s = game.rooms.workshop.life.spots[what]; const r = P.use(s.x, s.z, { near: 0.5, kind }); return { r: r.r, tgt: r.target?.kind, lines: r.lines }; }, [what, kind]);

await open(page, '?nocine'); await menu(page, 'new');
await said();
// ---- chapter 3 begins (ISO: chapter 2 finished by flags, then the real chapter start: the ferry, the dock)
iso('chapter 2 marked done by flags (c1_done, c1_plan, …); story.nextChapter() starts chapter 3 as tests/chapter2.mjs does');
await ev(() => { P.settle(); Object.assign(game.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true }); game.hero.hasBall = true; game.story.nextChapter(); P.settle(); });
const ent = await ev(() => { const r = P.enter('workshop'); P.settle(); return { r: r.r, room: game.room?.id }; });
check('Twinsen walks from the dock into Baldino\'s workshop (INPUT)', ent.room === 'workshop', ent);
await said();
await shot('W-00-room.png');

// ---- the room: what's in it, and it can all be reached
const room = await ev(() => { const L = game.rooms.workshop.life; return { spots: Object.keys(L.spots), hoist: !!L.hoist, coupler: !!L.coupler }; });
check('the workshop has its relay table, hoist, fan, thunder box, tea experiment and Ilo\'s crate', ['lever', 'tap', 'crank', 'fan', 'pulse', 'kettle', 'crate'].every((k) => room.spots.includes(k)) && room.hoist && room.coupler, room);
const walk = await ev(() => { const R = game.rooms.workshop, L = R.life, out = [];
  const bal = P.npc('baldino').pos, crate = R.givers.find((g) => g.id === 'crate'), barrel = R.givers.find((g) => g.id === 'barrel');
  for (const [n, p, tol] of [['lever', L.spots.lever, 0.6], ['tap', L.spots.tap, 0.6], ['crank', L.spots.crank, 0.6], ['under the hoist', { x: L.hoist.x, z: L.hoist.z - 0.6 }, 0.5], ['barrel (within its giver reach)', { x: barrel.x, z: barrel.z }, barrel.r - 0.05], ['crate', { x: crate.x - 0.9, z: crate.z }, 0.6], ['fan', L.spots.fan, 0.6], ['pulse', L.spots.pulse, 0.6], ['kettle', L.spots.kettle, 0.6], ['Baldino', { x: bal.x + 0.9, z: bal.z + 0.6 }, 0.7], ['door', R.spawn, 0.6]]) { const r = P.go(p.x, p.z, { tol, maxT: 60 }); out.push([n, r.r]); }
  return out; });
check('collision: from the door he walks to every new thing, under the hoist to the crates, to Baldino and back (INPUT)', walk.every(([, r]) => r === 'arrived'), walk);
const cr = await ev(() => { const R = game.rooms.workshop, L = R.life; const r = P.go(L.hoist.x, L.hoist.z, { tol: 0.15, maxT: 8 }); const d = Math.hypot(game.hero.pos.x - L.hoist.x, game.hero.pos.z - L.hoist.z); P.go(R.spawn.x, R.spawn.z, { tol: 0.6 }); return { r: r.r, d: +d.toFixed(2), lift: L.lift }; });
check('the lowered relay\'s cradle and the hoist\'s low bars are solid: he can\'t stand inside the cradle (REV-TY-2 D5)', cr.lift === 0 && cr.d > 0.6, cr);
// ---- before Baldino's hello the pair is his: only looked at
const pre = await use('lever', 'wlook'); const prel = await said();
const preOn = await ev(() => game.story.workshop.on);
check('before Baldino\'s "At last!" the pair can\'t be started: the lever only gets a look (REV-TY-2 D7)', pre.tgt === 'wlook' && prel.some((l) => /ask before I touch/.test(l)) && !preOn, { pre, prel, preOn });

// ---- the looks (INPUT): each a short line; Baldino adds one when he's here
const looks = {};
for (const w of ['fan', 'pulse', 'kettle', 'crate']) { const r = await use(w, 'wlook'); looks[w] = { ...r, said: await said() }; }
check('the fan, the thunder box, the tea experiment and Ilo\'s crate each have a short look, with a word from Baldino (INPUT)', Object.values(looks).every((l) => l.tgt === 'wlook' && l.said.length >= 2 && l.said.length <= 4), looks);
check('the failed experiment reads as one: lid in the ceiling, "TEA: BY HAND", boiled dry', looks.kettle.said.some((l) => /lid/.test(l)) && looks.kettle.said.some((l) => /BY HAND/.test(l)) && looks.kettle.said.some((l) => /boiled dry/.test(l)), looks.kettle.said);
check('the thunder box shows its limit (three seconds, then ten to recover)', looks.pulse.said.join(' ').match(/three seconds/) && looks.pulse.said.join(' ').match(/ten/), looks.pulse.said);
check('collaboration: Ilo of the shuttle yard (crate, Baldino)', looks.crate.said.some((l) => /Ilo/.test(l)), looks.crate.said);
// Ilo's crate is a giver too: from the side its look is read from, E now hops and shakes the bonus out
const gv = await ev(() => { const R = game.rooms.workshop, s = R.life.spots.crate, cg = R.givers.find((g) => g.id === 'crate'); P.go(s.x, s.z, { tol: 0.3 }); P.face(cg.x, cg.z); const tg = P.target()?.kind ?? null; P.tap('KeyE', 0.1); P.wait(1.5); P.settle(); const got = game.searched.includes('giver:workshop:crate'); P.go(s.x, s.z, { tol: 0.3 }); P.face(cg.x, cg.z); return { tg, got, after: P.target()?.kind ?? null }; });
await said();
check('Ilo\'s crate: once read, E beside it (the side it is read from) hops and gives its bonus; then it can be read again (REV-TY-2 D6)', gv.tg !== 'wlook' && gv.got && gv.after === 'wlook', gv);

// ---- Baldino: the main intro first (unchanged), then the test pair, then his years
const t1 = await ev(() => { const r = P.talk('baldino'); return { r: r.r, plan: !!game.flags.c2_plan, ask: !!game.flags.w_ask }; });
const t1l = await said();
check('first talk: Baldino\'s chapter-3 explanation as before (the plan), no side task yet', t1.plan && !t1.ask && t1l.some((l) => /Never mind, I have another one/.test(l)), { t1, n: t1l.length });
const t2 = await ev(() => { P.talk('baldino'); return !!game.flags.w_ask; });
const t2l = await said();
check('next talk: Baldino brings up his test pair (two relays that won\'t hear each other)', t2 && t2l.some((l) => /test pair/.test(l)) && t2l.length === 2, t2l);
const years = [];
for (let i = 0; i < 3; i++) { await ev(() => P.talk('baldino')); years.push(await said()); }
check('then: the reminder of the key\'s parts and one line of his years, a different one each time', years.every((l) => l.length === 2 && /cog from the old mill/.test(l[0])) && new Set(years.map((l) => l[1])).size === 3, years);

// ---- failure 1: no line of sight (INPUT: the lever with the hoist down)
const l1 = await use('lever', 'wlever');
await ev(() => { P.wait(0.5); });
const s1a = await state();
await shot('W-01-no-sight.png');
await ev(() => { P.wait(1.5); P.settle(); });
const s1 = await state(), l1s = await said();
check('lever: the pair starts; the hanging relay can\'t see the other (hoist down) and blinks; no sync (INPUT)', l1.tgt === 'wlever' && s1a.on && s1a.lift === 0 && s1.sync === 0 && l1s.some((l) => /can't see/.test(l)) && l1s.some((l) => /by sight/.test(l)), { l1, s1a, s1, l1s });
// ---- failure 2: it overheats (tap shut) and trips; the coupler glows first
await ev(() => { P.wait(7); P.settle(); });
const s2 = await state(), l2s = await said();
check('left running with the drip shut the coupler glows (warning), then trips and switches off (recoverable)', !s2.on && s2.trips === 1 && l2s.includes('[toast] w_toast_hot') && l2s.includes('[toast] w_toast_trip') && l2s.some((l) => /thirsty/.test(l)), { s2, l2s });

// ---- the hoist (INPUT): the relay goes up clear of the flying machine
const c1 = await use('crank', 'wcrank');
await ev(() => { P.wait(2); });
const s3 = await state(), c1s = await said();
check('crank: the old hoist raises the relay above the flying machine (INPUT)', c1.tgt === 'wcrank' && s3.up && s3.lift === 1 && c1s.some((l) => /Older than Arthur/.test(l)), { c1, s3, c1s });

// ---- save & Continue: hoist up, pair off
const file = path.join(os.tmpdir(), 'workshop-' + process.pid + '.json');
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue'); await said();
const r1 = await ev(() => { P.settle(); game.step(0.2); return null; }).then(state);
check('save & Continue: back in the workshop, the hoist still up, the tap still shut, the pair off', r1.room === 'workshop' && r1.up && r1.lift === 1 && !r1.tap && !r1.on && !r1.pair && r1.ask, r1);

// ---- in sight now, but still no drip: it trips before the pair holds long enough
await use('lever', 'wlever');
await ev(() => { P.wait(4); });
const s4a = await state();
await shot('W-02-linked-hot.png');
await ev(() => { P.wait(5); P.settle(); });
const s4 = await state(), l4s = await said();
check('raised and switched on with the drip shut: the relays see each other, but running hot they can\'t hold together (the SYNC lamps stay dark) and the coupler trips (INPUT; REV-TY-2 D2)', s4a.on && s4a.lift === 1 && s4a.sync === 0 && s4a.heat > 0.45 && !s4.on && !s4.pair && s4.trips === 2 && l4s.some((l) => /The tap/.test(l)), { s4a, s4, l4s });

// ---- save & Continue while it's running: it comes back switched off and cold
await use('lever', 'wlever');
await ev(() => { P.wait(2); });
const s5a = await state();
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue'); await said();
const r2 = await ev(() => { P.settle(); game.step(0.2); return null; }).then(state);
check('a save made with the pair running comes back with it off and cold (hoist kept)', s5a.on && !r2.on && r2.heat === 0 && r2.sync === 0 && r2.up && !r2.pair, { s5a, r2 });

// ---- the drip open, switched on: they sync while it runs cool; shut again mid-sync, they lose step and it trips
const tp = await use('tap', 'wtap');
const tps = await said();
await use('lever', 'wlever');
await ev(() => { P.wait(5); });
const s6a = await state();
await use('tap', 'wtap');   // (shut it again, late)
const s6b = await state();
await ev(() => { P.wait(7); P.settle(); });
const s6c = await state(); await said();
check('the drip tap opens (Baldino\'s sandwich note) and keeps the coupler cool while they sync (INPUT)', tp.tgt === 'wtap' && s6a.tap && s6a.heat < 0.45 && s6a.sync > 0.3 && tps.some((l) => /sandwich/.test(l)), { tp, s6a, tps });
check('the drip shut again mid-sync: the sync starts over, the coupler heats and trips; no success with the tap shut (REV-TY-2 D2)', !s6b.tap && s6b.sync === 0 && !s6c.pair && !s6c.on && s6c.trips === 3, { s6b, s6c });

// ---- success: the drip open again, switched on, ten seconds together; he presses the crank in the last moment
await use('tap', 'wtap'); await said();
const coins0 = await ev(() => game.hero.coins);
await use('lever', 'wlever');
const race = await ev(() => { const L = game.rooms.workshop.life, W = game.story.workshop, s = L.spots.crank; P.go(s.x, s.z, { tol: 0.5 }); P.face(L.hoist.x, L.hoist.z);
  for (let i = 0; i < 600 && W.sync < 0.985 && !game.flags.w_pair; i++) game.step(1 / 30);
  const at = +W.sync.toFixed(3), tg = P.target()?.kind; P.tap('KeyE', 0); P.wait(1.5); P.settle(); P.wait(1.5);
  return { at, tg, owe: game.flags.w_owe || 0, lying: game.pickups.list.filter((p) => p.type === 'coin' && p.owe === 'w_owe').length }; });
const s6 = await state(), l6s = await said();
check('held together for ten seconds: the pair talks; Baldino is delighted and pays half the shuttle yard\'s fee', s6.pair && l6s.some((l) => /Ilo owes me/.test(l)) && l6s.some((l) => /Half is yours/.test(l)) && l6s.includes('[toast] w_toast_pair'), { s6, l6s });
check('the crank pressed in the pair\'s last moment does nothing after success: the hoist stays up (REV-TY-2 D1)', race.tg === 'wcrank' && race.at >= 0.98 && s6.up && s6.lift === 1, { race, s6 });
check('the reward: a coin worth five kashes tossed his way, owed until he picks it up', race.owe === 1 && race.lying === 1, race);
// save & Continue with the coin still on the floor: it is given on loading (REV-TY-2 D4)
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue'); await said();
const pay = await ev(() => { const toasts = (game.hud.toastLog || []).slice(); P.settle(); game.step(0.2); return { coins: game.hero.coins, owe: game.flags.w_owe || 0, paid: !!game.flags.w_paid, toasts }; });
check('saved before he picked the coin up: on Continue the five kashes are his (a toast says so) and nothing is owed (REV-TY-2 D4)', pay.coins - coins0 === 5 && pay.owe === 0 && pay.paid && pay.toasts.some((t) => /Baldino's coin: 5 kashes/.test(t)), { coins0, pay });
await shot('W-03-talking.png');
const vis = await ev(() => { const L = game.rooms.workshop.life; return { st: { ...L.state }, labels: ['lever', 'tap', 'crank'].map((w) => { const s = L.spots[w]; P.go(s.x, s.z, { tol: 0.4 }); return P.target()?.label; }) }; });
check('afterwards the workshop shows it: both relays lit, the SYNC panel full, the hoist up, the drip running; the parts are only looked at now', vis.st.done && vis.st.sync === 1 && vis.st.up && vis.st.tap && vis.labels.every((l) => l === 'p_look'), vis);
const j = await ev(() => game.story.journal().find((x) => x.title === "Baldino's workshop")?.lines);
check('the journal keeps the rules it taught (relays by sight; couplers need cooling)', j?.length === 2 && j.every((l) => l.done), j);

// ---- save & Continue after: still talking
await quitAndKeep(page, context, file);
await open(page, '?nocine'); await menu(page, 'continue'); await said();
const r3 = await ev(() => { P.settle(); game.step(0.2); const L = game.rooms.workshop.life; return { ...L.state, lift: L.lift, room: game.room?.id }; });
check('save & Continue after success: the pair still talks (lamps, panel, hoist, drip)', r3.done && r3.sync === 1 && r3.lift === 1 && r3.tap && r3.room === 'workshop', r3);

// ---- the main path is untouched: with the key's parts, Baldino builds the key and the story goes to Zoé
iso('the cog and the code cylinder given by flags (c2_cog, c2_cyl) for the main-path check');
await ev(() => { Object.assign(game.flags, { c2_cog: true, c2_cyl: true }); game.updateObjective(); });
const key = await ev(() => { P.talk('baldino'); for (let i = 0; i < 200 && (game.trans || game.state !== 'play'); i++) { game.step(1 / 30); P.settle(); } return { key: !!game.flags.c2_key, zoe: !!game.flags.c2_zoeStart, room: game.room?.id }; });
await said();
check('chapter 3\'s main path is unchanged: Baldino builds the override key and the story cuts to Zoé at the lighthouse', key.key && key.zoe && key.room === 'lighttop', key);

// ---- chapter 10 remembers it; the thunder box's place is empty once Twinsen carries the pulse tool
iso('chapter 9 marked done by flags (as tests/chapter10.mjs does); story.nextChapter() starts chapter 10 in the workshop');
await ev(() => { P.settle(); Object.assign(game.flags, { chapter: 8, chapterKey: 'council', c2_shield: true, c2_broadcast: true, c2_mill_north: true, c2_mill_east: true, c2_mill_south: true, c9_started: true, c9_vote: true }); game.hero.swapBody?.('twinsen'); game.hero.hasBall = true; game.story.nextChapter(); P.settle(); });
const c10 = await said();
const c10s = await ev(() => ({ room: game.room?.id, key: game.flags.chapterKey, started: !!game.flags.c10_started, done: game.rooms.workshop.life.state.done, pulse: game.rooms.workshop.life.state.pulse }));
check('chapter 10 opens in the workshop; Baldino recalls the test pair\'s rules; the pair is still talking', c10s.key === 'network' && c10s.room === 'workshop' && c10s.started && c10s.done && c10.some((l) => /test pair/.test(l)), { c10s, c10: c10.filter((l) => !l.startsWith('[')) });
// (REV-TY-3 N1) the opening agrees with the stations as built (the Citadel relay on the manifold underground, the
// dome's indoors by the telescope) and with "a friend standing by": no masts, no "up high", no "nobody to keep them cool"
check('chapter 10\'s opening lines agree with the stations as built and with a friend at each station (REV-TY-3 N1)', c10.some((l) => /friend standing by/.test(l)) && c10.some((l) => /old machines carry the signal/.test(l)) && !c10.some((l) => /masts|up high|clear line|nobody to keep/i.test(l)), c10.filter((l) => !l.startsWith('[')));
const pg = await use('pulse', 'wlook'); const pgl = await said();
check('chapter 10: the thunder box is gone from the shelf (it\'s the pulse tool now)', !c10s.pulse && pgl.some((l) => /pocket/.test(l)), { pg, pgl });
await shot('W-04-chapter10.png');

const fails = done(errs);
await browser.close();
process.exit(fails ? 1 : 0);
