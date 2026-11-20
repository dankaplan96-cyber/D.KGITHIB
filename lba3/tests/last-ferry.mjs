// U-1 "The Last Ferry" (the user's side quest; src/game/story/ferry.js, src/game/skyferry.js; docs/lba-maturity/U1-LAST-FERRY.md).
// Played by input where it says INPUT (the harness's arrow keys, E, F and the pause menu: tests/lib/player.js):
//   - chapter 3 on Zeelich: the walk from the spaceport to the West Pier; the sailings board read; the captain turns up for
//     his sailing (the bell at the rail gap, rung on his round); his story;
//   - the winch house: the plate read; a wrong attempt (the ball into the counterweight while the bridge is up: its line,
//     nothing lost); the wheel turned (the bridge down, the weight up); Save & quit → Continue keeps it; the ball through
//     the port onto the catch's trip paddle: the catch drops, the cable goes slack; the captain's lines;
//   - over the loading bridge, the telegraph's handle (his hand on it): the first sailing's film round the cliffs to Mill
//     Lane Steps; Oshra and Wick come aboard; Oshra's tea (magic refilled, two kashes); the return sailing (its own lines);
//     a sailing skipped by holding the skip key ends at the far berth;
//   - the walk from the West Pier to Mill Lane on foot (both stops are on the island's paths); Mill Lane's bell calls her
//     over (seen sailing from the shore); Save & quit while she sails → Continue: she and her people at Mill Lane;
//   - three chapters later and more (chapter 6, 9, the epilogue by their flags): the line still runs, the board says so,
//     Oshra is off the spaceport's rail, the sailing's lines are the stage's own;
//   - an old save (tests/fixtures/campaign/new-05.save.json, chapter 3 on Zeelich, before this change) loads: the ferry
//     tied up, the captain on his round, no dx_lf_ state made up; a chapter-9 one (base-12) too.
// ISO (logged): chapters are set by their flags (as tests/depth-1.mjs). SHOTS=dir writes jpg pictures from the play
// camera (deviceScaleFactor 1). SwiftShader, headless: Automated runtime only.
import { launch, open, menu, checker } from './lib/boot.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { check, done } = checker({ info: 'always' });
const HARNESS = fileURLToPath(new URL('./lib/player.js', import.meta.url));
const FIX = (n) => fileURLToPath(new URL(`./fixtures/campaign/${n}.save.json`, import.meta.url));
let { browser, page } = await launch({ scale: 1 });
const ev = (f, a) => page.evaluate(f, a);
const iso = (s) => console.log('ISO  ' + s);
const SHOTS = process.env.SHOTS || null;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
// a picture from the game's own camera where he stands now
const shot = async (n) => { if (!SHOTS) return; await ev(() => { game.step(0.3); game.renderer.render(); }); await page.screenshot({ path: path.join(SHOTS, n + '.jpg'), type: 'jpeg', quality: 72, timeout: 240000 }); };
const said = () => ev(() => { if (!window._said) { window._said = []; const sv = game.say; game.say = function (n, lines, ...a) { window._said.push(...[].concat(lines)); return sv.call(this, n, lines, ...a); }; } const s = window._said.slice(); window._said.length = 0; return s; });
const has = (lines, re) => lines.some((l) => re.test(l));
const helpers = () => ev(() => {
  window.BASE ??= JSON.parse(JSON.stringify(game.flags));
  window.F = () => game.story.ferry;
  window.SF = () => game.rooms.zeelich.skyferry;
  window.lf = () => Object.fromEntries(Object.entries(game.flags).filter(([k]) => k.startsWith('dx_lf_')));
  window.Zl = (x, z) => ({ x: 2400 + x, z });
  window.ferryAt = () => { const g = game.rooms.zeelich.ferry.group; const o = game.rooms.zeelich.group.position; return [+(g.position.x + o.x).toFixed(2), +(g.position.z + o.z).toFixed(2), +g.rotation.y.toFixed(2)]; };
  window.setChapter = (key, extra = {}) => {
    const G = game, f = G.flags; P.settle();
    const keep = Object.fromEntries(Object.entries(f).filter(([k]) => k.startsWith('dx_')));
    for (const k of Object.keys(f)) delete f[k];
    Object.assign(f, JSON.parse(JSON.stringify(BASE)), { prologueDone: true, intro: true, chapterKey: key, c1_water: true, c1_done: true, c2_shield: true }, keep, extra);
    f.chapter = G.story.chapters.findIndex((c) => c.key === key); G.hero.hasBall = true;
    G.story.applyFlags(); G.story.refreshCast(); G.step(0.5); P.settle();
  };
  // the film's subtitles, as they show (recorded every step while a film runs)
  window.subsSeen = []; window.filmsRun = 0;
  { const Fm = game.story.ferry; if (!Fm._wrapped) { Fm._wrapped = true; const sw = Fm.sailWith.bind(Fm); Fm.sailWith = () => { sw(); if (game.cine) { filmsRun++; subsSeen.push(...game.cine.def.subs.map((x) => x.text)); } }; } }
  window.film = (maxT = 60) => { const out = { t: 0 }; while (game.cine && out.t < maxT) { game.step(0.1); out.t += 0.1; const el = document.querySelector('#cine-sub'); if (el?.classList.contains('show')) { const s = el.textContent; if (subsSeen[subsSeen.length - 1] !== s) subsSeen.push(s); } } return out; };
  window.npcAt = (id) => { const n = P.npc(id); return n ? { present: n.present, x: +(n.pos.x - 2400).toFixed(2), z: +n.pos.z.toFixed(2), y: +n.pos.y.toFixed(2) } : null; };
});
const saveQuit = async () => {
  await ev(() => { P.release(); P.settle(); P.tap('Escape', 0.1); });
  const reloaded = page.waitForEvent('load', { timeout: 900000 });
  await page.click('#pause [data-act="quit"]', { timeout: 60000, noWaitAfter: true });
  await reloaded;
};
const reboot = async () => {
  await page.waitForFunction(() => window.game && document.querySelector('#loading').classList.contains('hidden') && !window.game.preparing, null, { timeout: 900000 });
  await ev(() => { game.testFreeze = true; });
  await page.addScriptTag({ path: HARNESS });
  await menu(page, 'continue');
  await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
  await helpers(); await said();
};

await open(page, '?nocine'); await menu(page, 'new');
await helpers();
iso('chapter 2 finished by its flags (as tests/zeelich-life.mjs): story.nextChapter() starts chapter 3 at Zeelich Spaceport');
await ev(() => { P.settle(); Object.assign(game.flags, { prologueDone: true, intro: true, chapter: 1, chapterKey: 'project', c1_started: true, c1_done: true, c1_radio: true, c1_veskGone: true, c1_plan: true }); game.hero.hasBall = true; game.story.nextChapter(); P.settle(); });
await said();
const a0 = await ev(() => ({ room: game.room?.id, ch: game.flags.chapterKey, built: !!SF(), ferry: game.rooms.zeelich.ferry.group.visible, at: ferryAt(), cap: npcAt('lf_ossel'), wick: npcAt('lf_wick'), osh: npcAt('lf_oshra'), oshra: npcAt('oshra'), lf: lf() }));
check('chapter 3 on Zeelich: the ferry tied up at the West Pier, the captain there, Wick and the ferry\'s Oshra not yet, Oshra at the spaceport; no dx_lf_ state yet', a0.room === 'zeelich' && a0.built && a0.ferry && a0.at[0] === 2342.4 && a0.cap?.present && !a0.wick?.present && !a0.osh?.present && a0.oshra?.present && Object.keys(a0.lf).length === 0, a0);

// ---------------------------------------------------------------- the walk to the pier; the board; the captain on time
const w0 = await ev(() => { const t0 = game.time; const r = P.go(2400 - 50.5, 0.0, { tol: 0.8, maxT: 240 }); return { r: r.r, secs: +(game.time - t0).toFixed(1), at: [+(game.hero.pos.x - 2400).toFixed(1), +game.hero.pos.z.toFixed(1)] }; });
check('INPUT: Twinsen walks from the spaceport to the West Pier\'s root (the route\'s game seconds logged)', w0.r === 'arrived', w0);
const b0 = await ev(() => { const B = SF().board; return P.use(B.read.x, B.read.z, { kind: 'dx_lf_board', near: 1.0 }).r; });
const b0l = await said();
check('INPUT: the sailings board (E): SAILINGS ON THE BELL under a pasted LINE CLOSED; chalked NEXT SAILING ON TIME', b0 === 'used' && has(b0l, /LINE CLOSED/) && has(b0l, /NEXT SAILING ON TIME/), { b0, b0l });
await ev(() => { const B = SF().board.read; P.go(B.x - 1.3, B.z + 1.3, { tol: 0.3, maxT: 20 }); P.face(B.x, B.z - 0.9); });
await shot('01-board');
// the captain's round: he comes to the rail gap and rings the bell (game time passes; Twinsen stands back)
const r0 = await ev(() => { const G = game, out = { rang: 0, atGap: false };
  P.go(2400 - 49.0, -1.0, { tol: 0.5, maxT: 30 });
  const sv = G.audio.play.bind(G.audio); G.audio.play = (n, ...a) => { if (n === 'clang') out.rang++; return sv(n, ...a); };
  const cord = SF().cord.west.front;
  for (let i = 0; i < 600 && out.rang < 3; i++) { G.step(0.1); const n = P.npc('lf_ossel'); if (Math.hypot(n.pos.x - cord.x, n.pos.z - cord.z) < 0.4) out.atGap = true; }
  G.audio.play = sv; return out; });
check('the captain turns up on time: on his round he goes to the rail gap and rings the bell (three strokes)', r0.atGap && r0.rang >= 3, r0);
const c0 = await ev(() => ({ r: P.talk('lf_ossel').r, ask: !!game.flags.dx_lf_ask }));
const c0l = await said();
check('INPUT: the captain (TALK): on time as always; the line closed but not the captain; the project grounded what flies; the catch only lets go from its far side; bridge down first', c0.r === 'talked' && c0.ask && has(c0l, /Nobody closed the captain/) && has(c0l, /far side/) && has(c0l, /Bridge down first/) && has(c0l, /grounded everything that flies/), { c0, c0l });

// ---------------------------------------------------------------- the winch house
const h0 = await ev(() => { const S = SF(), d = S.hut.door; const r = P.go(d.x, d.z, { tol: 0.4, maxT: 60 }); const r2 = P.go(S.throwSpot.x, S.throwSpot.z, { tol: 0.25, maxT: 30 }); return { r: r.r, r2: r2.r, inHut: S.inHut(game.hero.pos.x, game.hero.pos.z) }; });
check('INPUT: in through the winch house\'s door', h0.r2 === 'arrived' && h0.inHut, h0);
const p0 = await ev(() => { const S = SF(); return P.use(S.plate.x, S.plate.z, { kind: 'dx_lf_plate', near: 0.9 }).r; });
const p0l = await said();
check('INPUT: the brass plate by the door: 1. BRIDGE DOWN. 2. TRIP THE CATCH. 3. RING OFF.', p0 === 'used' && has(p0l, /1\. BRIDGE DOWN\. 2\. TRIP THE CATCH/), { p0, p0l });
const q0 = await ev(() => { const S = SF(); return P.use(S.port.x, S.port.z - 0.3, { kind: 'dx_lf_port', near: 1.0 }).r; });
const q0l = await said();
check('INPUT: the hole in the partition looked at: the counterweight hangs in front of it while the bridge is up', q0 === 'used' && has(q0l, /counterweight hangs right in front/), { q0, q0l });
// the wrong attempt: the ball thrown at the hole with the weight down
const x0 = await ev(() => { const S = SF(), G = game; P.go(S.throwSpot.x, S.throwSpot.z, { tol: 0.15, maxT: 20 }); P.face(S.trip.x, S.trip.z); P.tap('F1'); P.throwAt(S.trip.x, S.trip.z); G.step(1.0); P.settle(); return { blocked: G.flags.dx_lf_blocked || 0, free: !!G.flags.dx_lf_free, ball: G.ball.state }; });
const x0l = await said();
check('INPUT, a wrong attempt: the ball thrown at the hole with the bridge up strikes the counterweight; its line; the catch still on; nothing lost', x0.blocked >= 1 && !x0.free && has(x0l, /hit the counterweight/), { x0, x0l });
const t0 = await ev(() => { const S = SF(); const pre = { busy: F().busy, tg: P.target(), pos: [+(game.hero.pos.x - 2400).toFixed(2), +game.hero.pos.z.toFixed(2)], state: game.state, cine: !!game.cine }; const u = P.use(S.wheel.x, S.wheel.z, { kind: 'dx_lf_wheel', near: 0.9 }); const r = u.r; const mid = { tg: u.target, busy: F().busy, steer: !!game.hero.steer, anim: F().anim?.kind }; for (let i = 0; i < 200 && !game.flags.dx_lf_bridge; i++) game.step(0.1); P.settle(); const hand = new game.hero.pos.constructor(); game.hero.rig.j.armR.hand.getWorldPosition(hand); return { r, pre, mid, bridge: !!game.flags.dx_lf_bridge, k: S.bridgeK, w: S.weightK, ramp: game.physics.groundAt(S.bridgeTop.x, S.bridgeTop.z + 1.2, 7) }; });
const t0l = await said();
check('INPUT: the wheel (E, both hands on its grips): the loading bridge comes down outside, the counterweight goes up; the bridge can be walked on', t0.r === 'used' && t0.bridge && t0.k === 1 && t0.w === 1 && t0.ramp > 6.0 && has(t0l, /bridge goes down outside/), { t0, t0l });
await ev(() => { const S = SF(); P.go(S.port.x - 0.75, S.port.z - 1.25, { tol: 0.2, maxT: 20 }); P.face(S.port.x, S.port.z); });
await shot('02-winch-house');
iso('Save & quit through the pause menu, then Continue (as a player)');
await saveQuit(); await reboot();
const s0 = await ev(() => ({ room: game.room?.id, lf: lf(), k: SF().bridgeK, w: SF().weightK, free: SF().free, inHut: SF().inHut(game.hero.pos.x, game.hero.pos.z) }));
check('after Continue: in the winch house, the bridge down, the weight up, the catch still on', s0.room === 'zeelich' && s0.lf.dx_lf_bridge && s0.k === 1 && s0.w === 1 && !s0.free && s0.inHut, s0);
const x1 = await ev(() => { const S = SF(), G = game, h = G.hero; const g0 = P.go(S.throwSpot.x, S.throwSpot.z, { tol: 0.15, maxT: 20 }).r; P.face(S.trip.x, S.trip.z); const diag = { g0, pos: [+(h.pos.x - 2400).toFixed(2), +h.pos.z.toFixed(2)], weapon: h.weapon, ball: G.ball.state, hasBall: h.hasBall, tt: G.targeting?.throwTarget({ x: Math.sin(h.angle), z: Math.cos(h.angle) })?.lf ?? null, wk: S.weightK, state: G.state }; P.tap('F1'); P.throwAt(S.trip.x, S.trip.z); for (let i = 0; i < 40 && !G.flags.dx_lf_free; i++) G.step(0.1); for (let i = 0; i < 30; i++) G.step(0.1); P.settle(); return { diag, free: !!G.flags.dx_lf_free, catchFree: S.free }; });
const x1l = await said();
check('INPUT: the ball through the hole onto the catch\'s trip paddle (F): the catch drops, the cable goes slack; the captain: twelve years; "you ring her off"', x1.free && x1.catchFree && has(x1l, /The catch drops/) && has(x1l, /Twelve years/) && has(x1l, /You ring her off/), { x1, x1l });

// ---------------------------------------------------------------- the first sailing
const f0 = await ev(() => { const S = SF(), G = game; const T = S.telegraph('west'); P.go(S.bridgeTop.x, S.bridgeTop.z - 0.6, { tol: 0.4, maxT: 60 }); const r = P.go(T.front.x, T.front.z, { tol: 0.25, maxT: 40 }); return { r: r.r, y: +G.hero.pos.y.toFixed(2), cap: npcAt('lf_ossel') }; });
check('INPUT: out of the winch house and over the loading bridge onto her deck; the captain aboard', f0.r === 'arrived' && Math.abs(f0.y - 6.21) < 0.05 && Math.abs(f0.cap.y - 6.21) < 0.05, f0);
await shot('03-aboard-west');
const f1 = await ev(() => { const S = SF(), T = S.telegraph('west'); const n0 = filmsRun; P.go(T.front.x, T.front.z, { tol: 0.2, maxT: 20 }); P.face(T.x, T.z); const tg = P.target()?.kind; P.tap('KeyE', 0.1); for (let i = 0; i < 60 && !game.cine; i++) game.step(0.1); return { tg, cine: !!game.cine, films: filmsRun - n0, at: game.flags.dx_lf_at }; });
check('INPUT: the telegraph\'s handle pushed down (E, his hand on it): the first sailing\'s film starts', f1.tg === 'dx_lf_tel' && f1.cine && f1.films === 1 && f1.at === 'mill', f1);
await ev(() => { for (let i = 0; i < 120; i++) game.step(0.1); });
await shot('04-under-way-film');
const f2 = await ev(() => { const r = film(); P.settle(); for (let i = 0; i < 120; i++) game.step(0.1); P.settle(); return { ...r, state: game.state, at: ferryAt(), y: +game.hero.pos.y.toFixed(2), hx: +(game.hero.pos.x - 2400).toFixed(2), hz: +game.hero.pos.z.toFixed(2), lf: lf(), wick: npcAt('lf_wick'), osh: npcAt('lf_oshra'), oshra: npcAt('oshra'), subs: subsSeen.slice() }; });
const f2l = await said();
check('the first sailing (film, ~30 s) round the cliffs to Mill Lane Steps: the captain\'s lines; there, on her deck; the line runs', f2.state === 'play' && f2.at[0] === 2377.6 && f2.at[1] === 33 && Math.abs(f2.y - 6.21) < 0.05 && f2.lf.dx_lf_first && f2.lf.dx_lf_at === 'mill' && f2.subs.some((s) => /still knows the way/.test(s)), { f2 });
check('at Mill Lane: Oshra (a kettle) and Wick (hates shuttles) come aboard; Oshra is off the spaceport\'s rail', has(f2l, /I have a kettle/) && has(f2l, /hate shuttles/) && f2.wick.present && f2.osh.present && Math.abs(f2.wick.y - 6.21) < 0.06 && !f2.oshra.present, { f2, f2l });
await shot('05-aboard-mill');
const tea = await ev(() => { const h = game.hero; h.mp = 0; const c0 = h.coins = Math.max(h.coins, 5); const r = P.talk('lf_oshra').r; return { r, mp: h.mp, max: h.mpMax, paid: c0 - h.coins, n: game.flags.dx_lf_tea }; });
const teal = await said();
check('INPUT: Oshra\'s tea on deck (TALK): two kashes, magic refilled', tea.r === 'talked' && tea.mp === tea.max && tea.paid === 2 && tea.n === 1 && has(teal, /Two kashes/), { tea, teal });
// the return sailing: its own lines
await ev(() => { subsSeen.length = 0; });
const r1 = await ev(() => { const S = SF(), T = S.telegraph('mill'); const r = P.use(T.x, T.z, { kind: 'dx_lf_tel', near: 0.8 }); for (let i = 0; i < 30 && !game.cine; i++) game.step(0.1); const f = film(); P.settle(); return { r: r.r, f, at: ferryAt(), state: game.state, lf: lf(), subs: subsSeen.slice() }; });
check('INPUT: the return sailing (the handle again): the passengers\' chapter-3 lines (the grounded ships, the kettle, the platform\'s hum); back at the West Pier', r1.r === 'used' && r1.at[0] === 2342.4 && r1.state === 'play' && r1.subs.length >= 3 && r1.subs.some((s) => /kettle|platform hums|everyone on the street/i.test(s)) && r1.lf.dx_lf_heard === 'pre', { r1 });
// a sailing skipped: hold the skip key
const k0 = await ev(() => { const S = SF(), T = S.telegraph('west'); P.go(T.front.x, T.front.z, { tol: 0.2, maxT: 20 }); P.face(T.x, T.z); P.tap('KeyE', 0.1); for (let i = 0; i < 60 && !game.cine; i++) game.step(0.1); const c0 = !!game.cine; game.step(3); P.holdFor(['KeyE'], 1.2); return { c0, cine: !!game.cine, st: game.state }; });
await page.waitForTimeout(1500);
const k1 = await ev(() => { for (let i = 0; i < 20; i++) game.step(0.05); P.settle(); return { cine: !!game.cine, state: game.state, at: ferryAt(), y: +game.hero.pos.y.toFixed(2), lf: lf() }; });
check('INPUT: a sailing skipped by holding the skip key ends at the far berth (Mill Lane), him on her deck', k0.c0 && k1.state === 'play' && !k1.cine && k1.at[0] === 2377.6 && Math.abs(k1.y - 6.21) < 0.05 && k1.lf.dx_lf_at === 'mill', { k0, k1 });

// ---------------------------------------------------------------- on foot and by the bell
const m0 = await ev(() => { const S = SF(), L = S.landing.mill; P.go(L.x, L.z - 1.0, { tol: 0.5, maxT: 60 }); const B = S.millBoard; const r = P.use(B.x, B.z, { kind: 'dx_lf_mboard', near: 1.0 }).r; const t0 = game.time; const w = P.go(2400 - 50.5, 0.5, { tol: 0.8, maxT: 300 }); return { r, w: w.r, secs: +(game.time - t0).toFixed(1) }; });
const m0l = await said();
check('INPUT: off at Mill Lane (its sign: RING FOR THE FERRY), then on foot to the West Pier: both stops are on the island\'s paths', m0.r === 'used' && has(m0l, /RING FOR THE FERRY/) && m0.w === 'arrived', { m0, m0l });
// back to Mill Lane on foot, the ferry is there; ride her to West, walk... instead: at West, ring for her (she is at Mill)
const bell = await ev(() => { const S = SF(), c = S.cord.west; const r = P.use(c.front.x, c.front.z, { kind: 'dx_lf_bell', near: 0.5 }).r; P.settle(); return { r, sail: !!F().sail, at: game.flags.dx_lf_at }; });
const belll = await said();
check('INPUT: the West Pier\'s bell (E, the cord): she is on her way from Mill Lane', bell.r === 'used' && bell.sail && bell.at === 'west' && has(belll, /on its way/), { bell, belll });
await ev(() => { game.step(12); });
await shot('06-ferry-under-way-from-the-pier');
const m1 = await ev(() => { for (let i = 0; i < 300 && F().sail; i++) game.step(0.1); P.settle(); return { at: ferryAt(), sail: !!F().sail, cap: npcAt('lf_ossel'), osh: npcAt('lf_oshra') }; });
check('she comes in to the West Pier by herself, her people aboard', !m1.sail && m1.at[0] === 2342.4 && Math.abs(m1.cap.y - 6.21) < 0.06 && m1.osh.present, m1);
// Save & quit while a called sailing is under way: walk to Mill Lane? (long) — ring from Mill instead: ride over first
const sq = await ev(() => { const S = SF(), T = S.telegraph('west'); P.go(S.bridgeTop.x, S.bridgeTop.z - 0.6, { tol: 0.4, maxT: 60 }); P.use(T.x, T.z, { kind: 'dx_lf_tel', near: 0.8 }); for (let i = 0; i < 30 && !game.cine; i++) game.step(0.1); film(); P.settle(); const L = S.landing.mill; P.go(L.x, L.z - 1.2, { tol: 0.5, maxT: 60 }); return { at: game.flags.dx_lf_at }; });
await ev(() => { const S = SF(); P.go(2400 - 50.5, 0.5, { tol: 0.8, maxT: 300 }); P.use(S.cord.west.front.x, S.cord.west.front.z, { kind: 'dx_lf_bell', near: 0.5 }); P.settle(); game.step(8); });
iso('Save & quit while she sails over by herself, then Continue');
await saveQuit(); await reboot();
const sq1 = await ev(() => ({ at: ferryAt(), lf: lf(), sail: !!F().sail, cap: npcAt('lf_ossel'), osh: npcAt('lf_oshra'), wick: npcAt('lf_wick'), hero: [+(game.hero.pos.x - 2400).toFixed(1), +game.hero.pos.z.toFixed(1), +game.hero.pos.y.toFixed(2)] }));
check('after Continue: she is moored at the West Pier (where she was going), her three people aboard; he is on the pier', sq1.at[0] === 2342.4 && !sq1.sail && sq1.lf.dx_lf_at === 'west' && Math.abs(sq1.cap.y - 6.21) < 0.06 && Math.abs(sq1.osh.y - 6.21) < 0.06 && Math.abs(sq1.wick.y - 6.21) < 0.06 && Math.abs(sq1.hero[2] - 6.0) < 0.1, { sq, sq1 });

// ---------------------------------------------------------------- three chapters later, and more
for (const [key, ph, re] of [['pass', 'mid', /shuttles fly again|glaze goes to Citadel|set your watch/i], ['council', 'council', /council|clerks|bore/i], ['home', 'late', /still|shield crew|map/i]]) {
  iso(`chapter ${key} by its flags (the ferry put at the West Pier: dx_lf_at); on Zeelich at the West Pier`);
  const cx = await ev(({ key }) => { setChapter(key, { dx_lf_at: 'west' }); const G = game; G.regions.ensure('zeelich', 'test'); G.enterRoom('zeelich', { x: 2400 - 50.5, z: 0.5, a: -Math.PI / 2 }, true); P.settle(); G.story.refreshCast(); G.step(0.5); P.settle();
    subsSeen.length = 0; const S = SF(), out = { visible: G.rooms.zeelich.ferry.group.visible, board: S.boardState, oshra: npcAt('oshra'), osh: npcAt('lf_oshra'), at: ferryAt() };
    const B = S.board; out.read = P.use(B.read.x, B.read.z, { kind: 'dx_lf_board', near: 1.0 }).r;
    const T = S.telegraph(F().at); P.go(S.bridgeTop.x, S.bridgeTop.z - 0.6, { tol: 0.4, maxT: 60 }); const n0 = filmsRun; out.tel = P.use(T.x, T.z, { kind: 'dx_lf_tel', near: 0.8 }).r; for (let i = 0; i < 30 && !G.cine; i++) G.step(0.1); film(); P.settle(); out.film = filmsRun - n0; out.heard = G.flags.dx_lf_heard; out.subs = subsSeen.slice(); out.phase = F().phase();
    const t = P.talk('lf_ossel'); out.cap = t.r; return out; }, { key });
  const cxl = await said();
  check(`${key} (${ph}): the line still runs (the board: RUNNING, TEA ON DECK; Oshra aboard, not at the spaceport); a sailing\'s lines are this stage's; the captain has his own word`, cx.visible && cx.board === 'tea' && cx.osh.present && !cx.oshra.present && cx.read === 'used' && cx.tel === 'used' && cx.film === 1 && cx.phase === ph && cx.subs.some((s) => re.test(s)) && (cx.heard || '').includes(ph) && cx.cap === 'talked' && has(cxl, /TEA ON DECK/), { cx, cxl });
  if (key === 'pass') { await ev(() => { P.settle(); game.step(3); }); await shot('07-chapter6-aboard'); }
}
// text: English, short, no night words in any new line
const tx = await ev(async () => { const { STR } = await import('/src/game/i18n.js'); const keys = Object.keys(STR.en).filter((k) => /^(lf_|n_lf_)/.test(k)); const all = keys.flatMap((k) => [].concat(STR.en[k])); const said = keys.filter((k) => !/board|plate/.test(k)).flatMap((k) => [].concat(STR.en[k])); return { n: keys.length, bad: all.filter((s) => /\b(night|evening|tonight|sunset|dawn|dusk)\b/i.test(s)), long: said.filter((s) => s.split(/(?<=[.!?])\s+/).length > 3) }; });
check('the quest\'s text: no night, evening, tonight, sunset, dawn or dusk; no spoken line of more than three sentences (signs aside)', tx.n > 40 && tx.bad.length === 0 && tx.long.length === 0, tx);
await browser.close();

// ---------------------------------------------------------------- old saves (from before this change)
for (const [fx, key] of [['new-05', 'zeelich'], ['base-12', 'council']]) {
  ({ browser, page } = await launch({ scale: 1 }));
  const st = JSON.parse(fs.readFileSync(FIX(fx), 'utf8'));
  const raw = st.origins.flatMap((o) => o.localStorage).find((i) => i.name === 'lba3_save_v1').value;
  await page.addInitScript((s) => { if (!localStorage.getItem('lba3_save_v1')) localStorage.setItem('lba3_save_v1', s); }, raw);
  await open(page, '?nocine'); await menu(page, 'continue'); await ev(() => { for (let i = 0; i < 40; i++) game.step(0.05); P.settle(); });
  await helpers();
  const o = await ev(() => { const G = game; G.regions.ensure('zeelich', 'test'); if (G.room?.id !== 'zeelich') { G.enterRoom('zeelich', { x: 2400 - 50.5, z: 0.5, a: -Math.PI / 2 }, true); P.settle(); }
    G.story.refreshCast(); G.step(1); P.settle();
    return { state: G.state, ch: G.flags.chapterKey, at: ferryAt(), visible: G.rooms.zeelich.ferry.group.visible, lf: lf(), cap: npcAt('lf_ossel'), osh: npcAt('lf_oshra'), oshra: npcAt('oshra'), board: SF().boardState, bridge: SF().bridgeK }; });
  check(`an old save (${fx}, chapter ${key}, before this change) loads: in play; the ferry tied up at the West Pier, its bridge up; the captain on his round; no dx_lf_ state made up`, o.state === 'play' && o.ch === key && o.visible && o.at[0] === 2342.4 && o.cap?.present && !o.osh?.present && o.board === 'closed' && o.bridge === 0 && Object.keys(o.lf).length === 0, o);
  await browser.close();
}
done();
